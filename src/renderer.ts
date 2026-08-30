import { 
  Bird,
  Building, 
  Camera, 
  GameWorld, 
  Pedestrian, 
  Player, 
  Puddle,
  StreetProp, 
  TimeOfDay, 
  Vehicle 
} from './types';
import { trafficDiagnostics } from './aiTraffic';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = window.innerWidth;
  private height: number = window.innerHeight;

  // Offscreen buffer for the Lightmap (prevents punching holes in the world)
  private lightmapCanvas: HTMLCanvasElement;
  private lightmapCtx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.lightmapCanvas = document.createElement('canvas');
    this.lightmapCtx = this.lightmapCanvas.getContext('2d')!;
    this.resize(this.width, this.height);
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.lightmapCanvas.width = width;
    this.lightmapCanvas.height = height;
  }

  public render(
    world: GameWorld,
    player: Player,
    camera: Camera,
    timeHour: number,
    weatherTransition: number,
    visibleBuildings: Building[],
    visibleVehicles: Vehicle[],
    visiblePedestrians: Pedestrian[]
  ) {
    const ctx = this.ctx;

    // 1. Clear Screen
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();

    // 2. Camera Transformations (Center on camera target with smooth zoom & heading rotation)
    ctx.translate(this.width / 2, this.height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.rotate(-camera.angle - Math.PI / 2);
    ctx.translate(-camera.x, -camera.y);

    // Apply Camera Shake if any
    if (camera.shakeTimer > 0) {
      const shakeX = (Math.random() * 2 - 1) * camera.shakeIntensity;
      const shakeY = (Math.random() * 2 - 1) * camera.shakeIntensity;
      ctx.translate(shakeX, shakeY);
    }

    // Viewport bounds in world coords (using diagonal distance to cover full screen when rotated)
    const viewDiag = (Math.hypot(this.width, this.height) / (2 * camera.zoom)) + 150;
    const minX = camera.x - viewDiag;
    const maxX = camera.x + viewDiag;
    const minY = camera.y - viewDiag;
    const maxY = camera.y + viewDiag;

    // Calculate continuous nightAlpha from timeHour
    let nightAlpha = 0;
    if (timeHour >= 8 && timeHour < 17) {
      nightAlpha = 0;
    } else if (timeHour >= 17 && timeHour < 20) {
      const p = (timeHour - 17) / 3;
      nightAlpha = p * 0.45;
    } else if (timeHour >= 20 || timeHour < 5) {
      nightAlpha = 0.82;
    } else if (timeHour >= 5 && timeHour < 8) {
      const p = (timeHour - 5) / 3;
      nightAlpha = (1 - p) * 0.45;
    }

    // 3. Ground / Grass / Terrain Base
    this.renderGround(world, minX, minY, maxX, maxY);

    // 4. Roads, Intersections, Crosswalks & Markings
    this.renderRoadsAndMarkings(world, minX, minY, maxX, maxY);

    // 5. Puddles (Road wet spots)
    this.renderPuddles(world.puddles, minX, minY, maxX, maxY);

    // 6. Skid Marks
    this.renderSkidMarks(world.skidMarks, minX, minY, maxX, maxY);

    // 7. Parking lots
    this.renderParkings(world.parkings, minX, minY, maxX, maxY);

    // 8. Buildings Base Structure & Entrances
    this.renderBuildingBases(visibleBuildings);

    // 8b. Street Litter & Flying Paper / Wind Debris
    this.renderLitter(world.litter, minX, minY, maxX, maxY);

    // 9. Ground-level Props (Benches, Hydrants, Kiosks, Cones, Trash Cans, Mailboxes, and BROKEN lampposts!)
    this.renderGroundProps(world.props, minX, minY, maxX, maxY);

    // 9b. Broken Traffic Lights (lying flat on the ground!)
    this.renderTrafficLights(world.intersections, world.props.filter((p) => p.isBroken), minX, minY, maxX, maxY);

    // 10. Birds on the ground
    this.renderBirds(world.birds.filter((b) => b.state === 'ground'), minX, minY, maxX, maxY);

    // 12. Pedestrians (with Umbrellas during Rain)
    this.renderPedestrians(visiblePedestrians);

    // 13. Player on Foot (if not inside vehicle and not inside building)
    if (!player.isInVehicle && !player.isInsideBuilding) {
      this.renderPlayerPedestrian(player);
    }

    // 14. Vehicles (Cars with dynamic wheels, lights & wipers)
    this.renderVehicles(visibleVehicles, nightAlpha);

    // 15. Professional Two-Pass 2D Lightmap System
    // Moved up to be BELOW roofs/trees so lights don't "draw" on top of foliage/buildings
    this.renderLightmap(
      world,
      timeHour, 
      weatherTransition,
      visibleVehicles, 
      world.props, 
      minX, minY, maxX, maxY
    );

    // 16. Building Roofs, Canopies, Balconies & Fire Escapes
    this.renderBuildingRoofsAndCanopies(visibleBuildings, nightAlpha);

    // 16b. Tall Intact Props (Intact trees, and intact lampposts!)
    this.renderTreesAndTallProps(world.trees, world.props, minX, minY, maxX, maxY, nightAlpha);

    // 16c. Intact Traffic Light Posts
    this.renderTrafficLights(world.intersections, world.props.filter((p) => !p.isBroken), minX, minY, maxX, maxY, nightAlpha);

    // 16d. Flying Birds
    this.renderBirds(world.birds.filter((b) => b.state === 'flying'), minX, minY, maxX, maxY, nightAlpha);

    // 17. Particles (Smoke, Sparks, Water Fountains)
    this.renderParticles(world.particles);

    // 18. Optional AI Telemetry & Debug Visualizer
    if (trafficDiagnostics.debugOverlayEnabled) {
      this.renderAIDebugOverlay(world, visibleVehicles);
    }

    ctx.restore();
  }

  // --- GROUND & BASE TERRAIN ---
  private renderGround(world: GameWorld, minX: number, minY: number, maxX: number, maxY: number) {
    const ctx = this.ctx;
    
    // Default urban concrete floor color
    ctx.fillStyle = '#334155';
    ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

    // --- FOREST ZONE (Grass floor) ---
    // North-West area (0 to 3800, 0 to 3800)
    ctx.fillStyle = '#14532d'; // Deep forest dark green
    const forestX1 = Math.max(minX, 0);
    const forestY1 = Math.max(minY, 0);
    const forestX2 = Math.min(maxX, 3800);
    const forestY2 = Math.min(maxY, 3800);
    if (forestX2 > forestX1 && forestY2 > forestY1) {
      ctx.fillRect(forestX1, forestY1, forestX2 - forestX1, forestY2 - forestY1);
    }

    // --- COZY VILLAGE / MEADOWS ZONE (Meadows grass floor) ---
    // South-East area (3800 to 8000, 3800 to 8000)
    ctx.fillStyle = '#16a34a'; // Vibrant meadow green
    const villageX1 = Math.max(minX, 3800);
    const villageY1 = Math.max(minY, 3800);
    const villageX2 = Math.min(maxX, 8000);
    const villageY2 = Math.min(maxY, 8000);
    if (villageX2 > villageX1 && villageY2 > villageY1) {
      ctx.fillRect(villageX1, villageY1, villageX2 - villageX1, villageY2 - villageY1);
    }

    // --- WEST SCENIC GREEN BUFFER ---
    // Southwest area (0 to 2000, 3800 to 8000)
    ctx.fillStyle = '#15803d'; // Green buffer
    const countryX1 = Math.max(minX, 0);
    const countryY1 = Math.max(minY, 3800);
    const countryX2 = Math.min(maxX, 2000);
    const countryY2 = Math.min(maxY, 8000);
    if (countryX2 > countryX1 && countryY2 > countryY1) {
      ctx.fillRect(countryX1, countryY1, countryX2 - countryX1, countryY2 - countryY1);
    }

    // --- MODERN DOWNTOWN PARKS ---
    // Central Park (around x: 4200..5000, y: 1800..2600)
    ctx.fillStyle = '#15803d';
    const parkX1 = Math.max(minX, 4200);
    const parkY1 = Math.max(minY, 1800);
    const parkX2 = Math.min(maxX, 5000);
    const parkY2 = Math.min(maxY, 2600);
    if (parkX2 > parkX1 && parkY2 > parkY1) {
      ctx.fillRect(parkX1, parkY1, parkX2 - parkX1, parkY2 - parkY1);
    }
  }

  // --- ROADS, MARKINGS & CROSSWALKS ---
  private renderRoadsAndMarkings(
    world: GameWorld,
    minX: number, minY: number, maxX: number, maxY: number
  ) {
    const ctx = this.ctx;
    const { roads, intersections } = world;

    // Asphalt, Dirt or Gravel Surfaces
    for (const road of roads) {
      const isHoriz = road.direction === 'horizontal';
      
      if (road.isDirt) {
        ctx.fillStyle = '#7c2d12'; // Rich muddy dirt brown for forest paths
      } else if (road.isGravel) {
        ctx.fillStyle = '#475569'; // Soft dusty gravel grey for village roads
      } else {
        ctx.fillStyle = '#1e293b'; // Standard deep asphalt slate grey for urban roads
      }

      if (isHoriz) {
        const top = road.y1 - road.width / 2;
        if (road.x2 < minX || road.x1 > maxX || top + road.width < minY || top > maxY) continue;
        ctx.fillRect(road.x1, top, road.x2 - road.x1, road.width);
      } else {
        const left = road.x1 - road.width / 2;
        if (left + road.width < minX || left > maxX || road.y2 < minY || road.y1 > maxY) continue;
        ctx.fillRect(left, road.y1, road.width, road.y2 - road.y1);
      }
    }

    // Intersections Surfaces (Colored matching connecting roads or default asphalt)
    for (const inter of intersections) {
      if (inter.x + inter.width / 2 < minX || inter.x - inter.width / 2 > maxX ||
          inter.y + inter.height / 2 < minY || inter.y - inter.height / 2 > maxY) continue;
      
      // Let's check if it's in the forest or village to color match!
      if (inter.x < 3800 && inter.y < 3800) {
        ctx.fillStyle = '#7c2d12'; // Dirt intersection
      } else if (inter.x > 3800 && inter.y > 3800) {
        ctx.fillStyle = '#475569'; // Gravel intersection
      } else {
        ctx.fillStyle = '#1e293b'; // Standard asphalt
      }
      ctx.fillRect(inter.x - inter.width / 2, inter.y - inter.height / 2, inter.width, inter.height);
    }

    // Road Markings
    for (const road of roads) {
      // Dirt roads have absolutely no paint markings
      if (road.isDirt) continue;

      const isHoriz = road.direction === 'horizontal';
      const halfW = road.width / 2;

      ctx.save();
      if (isHoriz) {
        // Double Yellow Center Line (for standard roads only, gravel gets single grey line)
        if (road.lanes >= 2) {
          if (road.isGravel) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(road.x1, road.y1);
            ctx.lineTo(road.x2, road.y1);
            ctx.stroke();
          } else {
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(road.x1, road.y1 - 2);
            ctx.lineTo(road.x2, road.y1 - 2);
            ctx.moveTo(road.x1, road.y1 + 2);
            ctx.lineTo(road.x2, road.y1 + 2);
            ctx.stroke();
          }
        }

        // White Dashed Lane Dividers (Not drawn on gravel)
        if (road.lanes === 4 && !road.isGravel) {
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([12, 16]);

          const laneW = road.width / 4;
          ctx.beginPath();
          ctx.moveTo(road.x1, road.y1 - laneW);
          ctx.lineTo(road.x2, road.y1 - laneW);
          ctx.moveTo(road.x1, road.y1 + laneW);
          ctx.lineTo(road.x2, road.y1 + laneW);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // White Outer Edge Lines
        ctx.strokeStyle = road.isGravel ? 'rgba(255, 255, 255, 0.15)' : '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(road.x1, road.y1 - halfW + 1);
        ctx.lineTo(road.x2, road.y1 - halfW + 1);
        ctx.moveTo(road.x1, road.y1 + halfW - 1);
        ctx.lineTo(road.x2, road.y1 + halfW - 1);
        ctx.stroke();

      } else {
        // Vertical Road Markings
        if (road.lanes >= 2) {
          if (road.isGravel) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(road.x1, road.y1);
            ctx.lineTo(road.x1, road.y2);
            ctx.stroke();
          } else {
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(road.x1 - 2, road.y1);
            ctx.lineTo(road.x1 - 2, road.y2);
            ctx.moveTo(road.x1 + 2, road.y1);
            ctx.lineTo(road.x1 + 2, road.y2);
            ctx.stroke();
          }
        }

        if (road.lanes === 4 && !road.isGravel) {
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([12, 16]);

          const laneW = road.width / 4;
          ctx.beginPath();
          ctx.moveTo(road.x1 - laneW, road.y1);
          ctx.lineTo(road.x1 - laneW, road.y2);
          ctx.moveTo(road.x1 + laneW, road.y1);
          ctx.lineTo(road.x1 + laneW, road.y2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.strokeStyle = road.isGravel ? 'rgba(255, 255, 255, 0.15)' : '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(road.x1 - halfW + 1, road.y1);
        ctx.lineTo(road.x1 - halfW + 1, road.y2);
        ctx.moveTo(road.x1 + halfW - 1, road.y1);
        ctx.lineTo(road.x1 + halfW - 1, road.y2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Stop Lines & Zebra Crosswalks
    for (const inter of intersections) {
      if (inter.x + inter.width / 2 < minX || inter.x - inter.width / 2 > maxX ||
          inter.y + inter.height / 2 < minY || inter.y - inter.height / 2 > maxY) continue;

      // Crosswalks (Zebras)
      for (const cw of inter.crosswalks) {
        ctx.fillStyle = '#f8fafc';
        const isHoriz = cw.width > cw.height;
        if (isHoriz) {
          const numStripes = Math.floor(cw.width / 14);
          for (let s = 0; s < numStripes; s++) {
            ctx.fillRect(cw.x + s * 14 + 3, cw.y + 2, 8, cw.height - 4);
          }
        } else {
          const numStripes = Math.floor(cw.height / 14);
          for (let s = 0; s < numStripes; s++) {
            ctx.fillRect(cw.x + 2, cw.y + s * 14 + 3, cw.width - 4, 8);
          }
        }
      }

      // Stop Lines (Solid White)
      for (const sl of inter.stopLines) {
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sl.x1, sl.y1);
        ctx.lineTo(sl.x2, sl.y2);
        ctx.stroke();
      }
    }
  }

  // --- SKID MARKS ---
  private renderSkidMarks(skidMarks: GameWorld['skidMarks'], minX: number, minY: number, maxX: number, maxY: number) {
    const ctx = this.ctx;
    ctx.save();
    for (const sm of skidMarks) {
      if (Math.max(sm.x1, sm.x2) < minX || Math.min(sm.x1, sm.x2) > maxX ||
          Math.max(sm.y1, sm.y2) < minY || Math.min(sm.y1, sm.y2) > maxY) continue;

      ctx.strokeStyle = sm.color;
      ctx.globalAlpha = sm.alpha;
      ctx.lineWidth = sm.width;
      ctx.beginPath();
      ctx.moveTo(sm.x1, sm.y1);
      ctx.lineTo(sm.x2, sm.y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- PARKING LOTS ---
  private renderParkings(parkings: GameWorld['parkings'], minX: number, minY: number, maxX: number, maxY: number) {
    const ctx = this.ctx;
    for (const pk of parkings) {
      if (pk.x + pk.width < minX || pk.x > maxX || pk.y + pk.height < minY || pk.y > maxY) continue;

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(pk.x, pk.y, pk.width, pk.height);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(pk.x, pk.y, pk.width, pk.height);

      // Parking bays
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1.5;
      for (const spot of pk.spots) {
        ctx.strokeRect(spot.x - 14, spot.y - 18, 28, 36);
      }
    }
  }

  // --- BUILDINGS: BASE & ROOF SPLIT ENGINE ---
  private renderBuildingBases(buildings: Building[]) {
    const ctx = this.ctx;

    for (const bld of buildings) {
      if (bld.type === 'park_monument') {
        // Render Park / Fountain Base
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(bld.x + 6, bld.y + 6, bld.width, bld.height);
        ctx.fillStyle = bld.color;
        ctx.fillRect(bld.x, bld.y, bld.width, bld.height);
        ctx.strokeStyle = bld.accentColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(bld.x, bld.y, bld.width, bld.height);
        
        // Water pool detail
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(bld.x + 8, bld.y + 8, bld.width - 16, bld.height - 16);
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 2;
        ctx.strokeRect(bld.x + 8, bld.y + 8, bld.width - 16, bld.height - 16);
        continue;
      }

      // 1. DROP SHADOW FOR BUILDING BLOCK
      ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
      ctx.fillRect(bld.x + 9, bld.y + 9, bld.width, bld.height);

      // 2. BASE WALL STRUCTURE
      ctx.fillStyle = bld.color;
      ctx.fillRect(bld.x, bld.y, bld.width, bld.height);

      // 3. BUILDING GROUND-LEVEL ENTRANCES & PORCH (Drawn before player so player steps on them)
      if (bld.entranceSide) {
        let ex = 0, ey = 0, ew = 0, eh = 0, doorX = 0, doorY = 0, doorW = 0, doorH = 0;
        let lightCX = 0, lightCY = 0;
        
        const canopyDepth = 15; // Increased depth for player scale
        const canopyWidth = 32; // Increased width for player scale

        if (bld.entranceSide === 'north') {
          ex = bld.x + bld.width / 2 - canopyWidth / 2;
          ey = bld.y - canopyDepth;
          ew = canopyWidth;
          eh = canopyDepth;
          doorX = ex + 6; doorY = bld.y; doorW = canopyWidth - 12; doorH = 2.5;
          lightCX = bld.x + bld.width / 2; lightCY = bld.y - 6;
        } else if (bld.entranceSide === 'south') {
          ex = bld.x + bld.width / 2 - canopyWidth / 2;
          ey = bld.y + bld.height;
          ew = canopyWidth;
          eh = canopyDepth;
          doorX = ex + 6; doorY = bld.y + bld.height - 2.5; doorW = canopyWidth - 12; doorH = 2.5;
          lightCX = bld.x + bld.width / 2; lightCY = bld.y + bld.height + 6;
        } else if (bld.entranceSide === 'west') {
          ex = bld.x - canopyDepth;
          ey = bld.y + bld.height / 2 - canopyWidth / 2;
          ew = canopyDepth;
          eh = canopyWidth;
          doorX = bld.x; doorY = ey + 6; doorW = 2.5; doorH = canopyWidth - 12;
          lightCX = bld.x - 6; lightCY = bld.y + bld.height / 2;
        } else if (bld.entranceSide === 'east') {
          ex = bld.x + bld.width;
          ey = bld.y + bld.height / 2 - canopyWidth / 2;
          ew = canopyDepth;
          eh = canopyWidth;
          doorX = bld.x + bld.width - 2.5; doorY = ey + 6; doorW = 2.5; doorH = canopyWidth - 12;
          lightCX = bld.x + bld.width + 6; lightCY = bld.y + bld.height / 2;
        }

        // Entrance light radial cast on sidewalk ground (Highly atmospheric, softened!)
        try {
          const entranceGlow = ctx.createRadialGradient(lightCX, lightCY, 1, lightCX, lightCY, 24);
          entranceGlow.addColorStop(0, 'rgba(254, 240, 138, 0.40)');
          entranceGlow.addColorStop(0.4, 'rgba(254, 240, 138, 0.15)');
          entranceGlow.addColorStop(1, 'rgba(254, 240, 138, 0)');
          ctx.fillStyle = entranceGlow;
          ctx.beginPath();
          ctx.arc(lightCX, lightCY, 24, 0, Math.PI * 2);
          ctx.fill();
        } catch {}

        // Entrance Concrete porch step
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(ex - 2, ey - (bld.entranceSide === 'north' || bld.entranceSide === 'south' ? 0 : 2), ew + 4, eh + (bld.entranceSide === 'north' || bld.entranceSide === 'south' ? 0 : 4));

        // Glass Double Doors
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(doorX, doorY, doorW, doorH);
        ctx.fillStyle = '#38bdf8'; // Glowing entry window glass
        ctx.fillRect(doorX + 1, doorY + (bld.entranceSide === 'north' || bld.entranceSide === 'south' ? 0.5 : 1), doorW - 2, doorH - (bld.entranceSide === 'north' || bld.entranceSide === 'south' ? 1 : 2));
      }
    }
  }

  private renderBuildingRoofsAndCanopies(buildings: Building[], nightAlpha: number = 0) {
    const ctx = this.ctx;
    const now = Date.now();

    for (const bld of buildings) {
      if (bld.type === 'park_monument') {
        continue;
      }

      // 1. FACADE DETAILS (BALCONIES & FIRE ESCAPES) DRAWN ON TOP of ground level/player
      // A. BALCONIES (Only for Residential/Apartment buildings, sticking out of walls)
      if (bld.balconies) {
        for (const bal of bld.balconies) {
          let bx = 0, by = 0, bw = 0, bh = 0;
          if (bal.side === 'north') {
            bx = bld.x + bld.width * bal.offset - bal.length / 2;
            by = bld.y - bal.depth;
            bw = bal.length;
            bh = bal.depth;
          } else if (bal.side === 'south') {
            bx = bld.x + bld.width * bal.offset - bal.length / 2;
            by = bld.y + bld.height;
            bw = bal.length;
            bh = bal.depth;
          } else if (bal.side === 'west') {
            bx = bld.x - bal.depth;
            by = bld.y + bld.height * bal.offset - bal.length / 2;
            bw = bal.depth;
            bh = bal.length;
          } else if (bal.side === 'east') {
            bx = bld.x + bld.width;
            by = bld.y + bld.height * bal.offset - bal.length / 2;
            bw = bal.depth;
            bh = bal.length;
          }

          // Balcony Shadow
          ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
          ctx.fillRect(bx + 4, by + 4, bw, bh);

          // Balcony Concrete Slab Base
          ctx.fillStyle = bld.accentColor;
          ctx.fillRect(bx, by, bw, bh);

          // Black Railing Border
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(bx, by, bw, bh);

          // Railing vertical grilles
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
          ctx.lineWidth = 0.8;
          if (bal.side === 'north' || bal.side === 'south') {
            for (let gx = bx + 3; gx < bx + bw; gx += 4) {
              ctx.moveTo(gx, by);
              ctx.lineTo(gx, by + bh);
            }
          } else {
            for (let gy = by + 3; gy < by + bh; gy += 4) {
              ctx.moveTo(bx, gy);
              ctx.lineTo(bx + bw, gy);
            }
          }
          ctx.stroke();

          // Sliding glass balcony door on main wall
          ctx.fillStyle = '#06b6d4';
          if (bal.side === 'north') {
            ctx.fillRect(bx + 3, bld.y, bw - 6, 2.5);
          } else if (bal.side === 'south') {
            ctx.fillRect(bx + 3, bld.y + bld.height - 2.5, bw - 6, 2.5);
          } else if (bal.side === 'west') {
            ctx.fillRect(bld.x, by + 3, 2.5, bh - 6);
          } else if (bal.side === 'east') {
            ctx.fillRect(bld.x + bld.width - 2.5, by + 3, 2.5, bh - 6);
          }
        }
      }

      // B. METALLIC FIRE ESCAPES (Alleyway iron framework steps)
      if (bld.fireEscapes) {
        for (const fe of bld.fireEscapes) {
          let fex = 0, fey = 0, few = 0, feh = 0;
          if (fe.side === 'north') {
            fex = bld.x + bld.width * fe.offset - fe.length / 2;
            fey = bld.y - fe.depth;
            few = fe.length;
            feh = fe.depth;
          } else if (fe.side === 'south') {
            fex = bld.x + bld.width * fe.offset - fe.length / 2;
            fey = bld.y + bld.height;
            few = fe.length;
            feh = fe.depth;
          } else if (fe.side === 'west') {
            fex = bld.x - fe.depth;
            fey = bld.y + bld.height * fe.offset - fe.length / 2;
            few = fe.depth;
            feh = fe.length;
          } else if (fe.side === 'east') {
            fex = bld.x + bld.width;
            fey = bld.y + bld.height * fe.offset - fe.length / 2;
            few = fe.depth;
            feh = fe.length;
          }

          // Fire Escape Shadow
          ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
          ctx.fillRect(fex + 3, fey + 3, few, feh);

          // Iron Framework Grating
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(fex, fey, few, feh);

          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.strokeRect(fex, fey, few, feh);

          // Draw grating gridlines & diagonal steps ladder
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
          if (fe.side === 'north' || fe.side === 'south') {
            for (let step = fex + 1; step < fex + few; step += 3) {
              ctx.moveTo(step, fey);
              ctx.lineTo(step, fey + feh);
            }
            // Diagonal Stair support line
            ctx.moveTo(fex, fey);
            ctx.lineTo(fex + few, fey + feh);
          } else {
            for (let step = fey + 1; step < fey + feh; step += 3) {
              ctx.moveTo(fex, step);
              ctx.lineTo(fex + few, step);
            }
            // Diagonal Stair support line
            ctx.moveTo(fex, fey);
            ctx.lineTo(fex + few, fey + feh);
          }
          ctx.stroke();
        }
      }

      // C. BUILDING CANOPY AWNING (Rendered on top of player!)
      if (bld.entranceSide) {
        let ex = 0, ey = 0, ew = 0, eh = 0;
        
        const canopyDepth = 15; // Increased depth for player scale
        const canopyWidth = 32; // Increased width for player scale

        if (bld.entranceSide === 'north') {
          ex = bld.x + bld.width / 2 - canopyWidth / 2;
          ey = bld.y - canopyDepth;
          ew = canopyWidth;
          eh = canopyDepth;
        } else if (bld.entranceSide === 'south') {
          ex = bld.x + bld.width / 2 - canopyWidth / 2;
          ey = bld.y + bld.height;
          ew = canopyWidth;
          eh = canopyDepth;
        } else if (bld.entranceSide === 'west') {
          ex = bld.x - canopyDepth;
          ey = bld.y + bld.height / 2 - canopyWidth / 2;
          ew = canopyDepth;
          eh = canopyWidth;
        } else if (bld.entranceSide === 'east') {
          ex = bld.x + bld.width;
          ey = bld.y + bld.height / 2 - canopyWidth / 2;
          ew = canopyDepth;
          eh = canopyWidth;
        }

        // Canopy Awning protruding
        ctx.fillStyle = bld.accentColor;
        ctx.fillRect(ex, ey, ew, eh);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(ex, ey, ew, eh);

        // Canopy stripes/details
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (bld.entranceSide === 'north' || bld.entranceSide === 'south') {
          for (let sx = ex + 4; sx < ex + ew; sx += 6) {
            ctx.moveTo(sx, ey);
            ctx.lineTo(sx, ey + eh);
          }
        } else {
          for (let sy = ey + 4; sy < ey + eh; sy += 6) {
            ctx.moveTo(ex, sy);
            ctx.lineTo(ex + ew, sy);
          }
        }
        ctx.stroke();
      }

      // 2. PARAPET / ROOF RIDGE BORDER
      ctx.fillStyle = bld.roofColor;
      ctx.fillRect(bld.x + 4, bld.y + 4, bld.width - 8, bld.height - 8);

      // Accent Coping Line on Parapet Edge
      ctx.strokeStyle = bld.accentColor;
      ctx.lineWidth = 2.2;
      ctx.strokeRect(bld.x + 4, bld.y + 4, bld.width - 8, bld.height - 8);

      // 3. INNER ROOF BED (Gravel / Asphalt texture)
      const rx = bld.x + 6;
      const ry = bld.y + 6;
      const rw = bld.width - 12;
      const rh = bld.height - 12;
      ctx.fillStyle = '#1e293b'; // Tarmac / dark gravel composite
      ctx.fillRect(rx, ry, rw, rh);

      // 4. MULTI-TIER MECHANICAL ROOM PENTHOUSE (Raise roof height profile)
      const penW = Math.max(18, rw * 0.28);
      const penH = Math.max(18, rh * 0.28);
      const penX = rx + (rw - penW) / 2;
      const penY = ry + (rh - penH) / 2;

      // Penthouse structure drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(penX + 4, penY + 4, penW, penH);

      // Penthouse base wall
      ctx.fillStyle = bld.color;
      ctx.fillRect(penX, penY, penW, penH);

      // Penthouse flat roof deck
      ctx.fillStyle = bld.roofColor;
      ctx.fillRect(penX + 2, penY + 2, penW - 4, penH - 4);
      ctx.strokeStyle = bld.accentColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(penX + 2, penY + 2, penW - 4, penH - 4);

      // 5. ROOF DETAILS (AC Units with spinning fans, Helipads with flashing beacons, solar panels, water towers)
      for (const d of bld.roofDetails) {
        const dx = bld.x + bld.width * d.rx;
        const dy = bld.y + bld.height * d.ry;

        if (d.type === 'ac') {
          // HVAC compressor block
          ctx.fillStyle = '#475569';
          ctx.fillRect(dx, dy, d.rw, d.rh);
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1;
          ctx.strokeRect(dx, dy, d.rw, d.rh);

          // Circular fan exhaust ducts inside compressor plant
          const numFans = d.rw > d.rh ? 2 : 1;
          for (let f = 0; f < numFans; f++) {
            const fx = dx + d.rw / (numFans * 2) + f * (d.rw / numFans);
            const fy = dy + d.rh / 2;
            const fr = Math.min(d.rw, d.rh) * 0.35;

            // Exhaust circular well
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(fx, fy, fr, 0, Math.PI * 2);
            ctx.fill();

            // Guard rails
            ctx.strokeStyle = 'rgba(71, 85, 105, 0.8)';
            ctx.lineWidth = 0.5;
            ctx.stroke();

            // Rotating fan blades!
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            const angleOffset = (now * 0.007) + (f * Math.PI / 4);
            for (let b = 0; b < 4; b++) {
              const bAngle = angleOffset + b * (Math.PI / 2);
              ctx.moveTo(fx - Math.cos(bAngle) * fr, fy - Math.sin(bAngle) * fr);
              ctx.lineTo(fx + Math.cos(bAngle) * fr, fy + Math.sin(bAngle) * fr);
            }
            ctx.stroke();
          }
        } else if (d.type === 'helipad') {
          // Standard Helipad Tarmac circle
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.arc(dx + d.rw / 2, dy + d.rh / 2, d.rw / 2, 0, Math.PI * 2);
          ctx.fill();

          // Yellow outer warning boundary circle
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(dx + d.rw / 2, dy + d.rh / 2, d.rw / 2 - 1, 0, Math.PI * 2);
          ctx.stroke();

          // Target grid markings
          ctx.strokeStyle = 'rgba(248, 250, 252, 0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(dx, dy + d.rh / 2);
          ctx.lineTo(dx + d.rw, dy + d.rh / 2);
          ctx.moveTo(dx + d.rw / 2, dy);
          ctx.lineTo(dx + d.rw / 2, dy + d.rh);
          ctx.stroke();

          // Standard high-visibility helipad 'H' label
          ctx.fillStyle = '#eab308';
          ctx.font = 'bold 24px "Courier New", Courier, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('H', dx + d.rw / 2, dy + d.rh / 2);

          // Helipad flashing red tower corner lights (4 corner warning beacons)
          const beaconLit = (now % 1000) > 500;
          if (beaconLit) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(dx + 4, dy + 4, 3, 0, Math.PI * 2);
            ctx.arc(dx + d.rw - 4, dy + 4, 3, 0, Math.PI * 2);
            ctx.arc(dx + 4, dy + d.rh - 4, 3, 0, Math.PI * 2);
            ctx.arc(dx + d.rw - 4, dy + d.rh - 4, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (d.type === 'pool') {
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(dx, dy, d.rw, d.rh);
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 2;
          ctx.strokeRect(dx, dy, d.rw, d.rh);
        } else if (d.type === 'solar') {
          // Crystalline Blue Solar Silicon grid
          ctx.fillStyle = '#1e3a8a';
          ctx.fillRect(dx, dy, d.rw, d.rh);
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1;
          ctx.strokeRect(dx, dy, d.rw, d.rh);

          // Grid cell lines
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          for (let sx = dx + 4; sx < dx + d.rw; sx += 4) {
            ctx.moveTo(sx, dy);
            ctx.lineTo(sx, dy + d.rh);
          }
          for (let sy = dy + 4; sy < dy + d.rh; sy += 4) {
            ctx.moveTo(dx, sy);
            ctx.lineTo(dx + d.rw, sy);
          }
          ctx.stroke();
        } else if (d.type === 'skylight') {
          // Curved Glass panels with diagonal glare reflection sheen
          ctx.fillStyle = 'rgba(14, 116, 144, 0.85)'; // Glazed cyan blue tint
          ctx.fillRect(dx, dy, d.rw, d.rh);
          ctx.strokeStyle = '#0891b2';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(dx, dy, d.rw, d.rh);

          // White gloss reflection streak
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(dx, dy + d.rh);
          ctx.lineTo(dx + d.rw, dy);
          ctx.stroke();
        } else if (d.type === 'antenna') {
          // If Residential or Industrial, render a beautiful round Water Storage Tower Tower!
          if (bld.type === 'residential' || bld.type === 'industrial') {
            const rad = d.rw / 2;
            const cx = dx + rad;
            const cy = dy + rad;

            // Wooden Water Tower structure shadows
            ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
            ctx.beginPath();
            ctx.arc(cx + 4, cy + 4, rad, 0, Math.PI * 2);
            ctx.fill();

            // Structural support struts
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx - rad, cy - rad);
            ctx.lineTo(cx + rad, cy + rad);
            ctx.moveTo(cx + rad, cy - rad);
            ctx.lineTo(cx - rad, cy + rad);
            ctx.stroke();

            // Cylinder tank body (Wood grain brown vs metal sheet paneling)
            ctx.fillStyle = bld.type === 'residential' ? '#b45309' : '#64748b';
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Conical Roof lid
            ctx.fillStyle = bld.type === 'residential' ? '#d97706' : '#94a3b8';
            ctx.beginPath();
            ctx.arc(cx, cy, rad * 0.75, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } else {
            // High metal transmission antenna mast with projection shadow
            ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(dx + 2, dy + 2);
            ctx.lineTo(dx + 16, dy - 12);
            ctx.stroke();

            // Antenna steel stem
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(dx, dy);
            ctx.lineTo(dx + 12, dy - 12);
            ctx.stroke();

            // Cross-beams
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(dx + 3, dy - 3);
            ctx.lineTo(dx + 7, dy - 7);
            ctx.moveTo(dx + 6, dy - 6);
            ctx.lineTo(dx + 10, dy - 10);
            ctx.stroke();

            // Flashing obstruction warning red dot
            const beaconLit = (now % 800) > 400;
            if (beaconLit) {
              ctx.fillStyle = '#ef4444';
              ctx.beginPath();
              ctx.arc(dx + 12, dy - 12, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
    }

    // Night Tint for the buildings (since drawn above lightmap)
    if (nightAlpha > 0.05) {
      ctx.fillStyle = `rgba(0, 0, 15, ${nightAlpha * 0.72})`;
      for (const bldToTint of buildings) {
        ctx.fillRect(bldToTint.x, bldToTint.y, bldToTint.width, bldToTint.height);
      }
    }
  }

  // --- STREET LITTER & FLYING DEBRIS ---
  private renderLitter(litter: GameWorld['litter'], minX: number, minY: number, maxX: number, maxY: number) {
    if (!litter) return;
    const ctx = this.ctx;

    for (const lit of litter) {
      if (lit.x < minX || lit.x > maxX || lit.y < minY || lit.y > maxY) continue;

      const alt = lit.altitude || 0;
      const renderY = lit.y - alt;

      ctx.save();
      ctx.translate(lit.x, renderY);
      ctx.rotate(lit.angle);

      // Ground Shadow if airborne
      if (alt > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.1, 0.35 - alt * 0.008)})`;
        ctx.beginPath();
        ctx.ellipse(0, alt, lit.size, lit.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      if (lit.type === 'paper') {
        ctx.fillStyle = lit.color;
        ctx.fillRect(-lit.size / 2, -lit.size / 3, lit.size, lit.size * 0.7);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-lit.size / 2, -lit.size / 3, lit.size, lit.size * 0.7);
      } else if (lit.type === 'newspaper') {
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(-lit.size / 2, -lit.size * 0.4, lit.size, lit.size * 0.8);
        ctx.fillStyle = '#64748b'; // Printed text lines
        ctx.fillRect(-lit.size / 2 + 1, -lit.size * 0.3, lit.size - 2, 1);
        ctx.fillRect(-lit.size / 2 + 1, -lit.size * 0.1, lit.size - 2, 1);
        ctx.fillRect(-lit.size / 2 + 1, lit.size * 0.1, lit.size - 2, 1);
      } else if (lit.type === 'cup') {
        // Coffee cup body
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-lit.size / 2, -lit.size / 2, lit.size, lit.size);
        // Sleeve
        ctx.fillStyle = '#b45309';
        ctx.fillRect(-lit.size / 2, -lit.size / 6, lit.size, lit.size / 3);
        // Lid
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-lit.size / 2 - 0.5, -lit.size / 2 - 1, lit.size + 1, 1.5);
      } else if (lit.type === 'can') {
        ctx.fillStyle = lit.color;
        ctx.fillRect(-lit.size / 2, -lit.size / 2, lit.size, lit.size);
        ctx.fillStyle = '#cbd5e1'; // Top pull tab
        ctx.beginPath();
        ctx.arc(0, -lit.size / 2, lit.size / 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (lit.type === 'leaf') {
        ctx.fillStyle = lit.color;
        ctx.beginPath();
        ctx.arc(0, 0, lit.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // --- TREES & STREET PROPS ---
  private renderGroundProps(
    props: StreetProp[],
    minX: number, minY: number, maxX: number, maxY: number
  ) {
    const ctx = this.ctx;

    // Street Props (High-Detail Vector Rendering)
    for (const prop of props) {
      if (prop.type === 'lamp' && !prop.isBroken) continue;
      if (prop.type === 'traffic_light') continue;

      if (prop.x < minX || prop.x > maxX || prop.y < minY || prop.y > maxY) continue;

      ctx.save();
      ctx.translate(prop.x, prop.y);

      if (prop.isBroken) {
        // Drop shadow for broken prop body on ground
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(6, 6, 8, 5, prop.angle || 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.rotate(prop.angle || 0.8);
      }

      if (prop.type === 'lamp') {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.arc(3, 3, 5, 0, Math.PI * 2);
        ctx.fill();

        // Pole Base
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Inner collar
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        // Glowing luminaire lens
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (prop.type === 'bench') {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(-9, -4, 18, 8);

        // Cast Iron frame ends & armrests
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-9, -5, 3, 10);
        ctx.fillRect(6, -5, 3, 10);

        // Wood slats with rich polished grain color
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-7, -4, 14, 2);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(-7, -1, 14, 2);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(-7, 2, 14, 2);
      } else if (prop.type === 'hydrant') {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.arc(2, 3, 6, 0, Math.PI * 2);
        ctx.fill();

        // Flange ring base
        ctx.fillStyle = prop.isBroken ? '#7f1d1d' : '#991b1b';
        ctx.beginPath();
        ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Octagonal main red body
        ctx.fillStyle = prop.isBroken ? '#991b1b' : '#dc2626';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Brass side outlet caps
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-6.5, -1.5, 2, 3);
        ctx.fillRect(4.5, -1.5, 2, 3);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-7, -0.8, 1, 1.6);
        ctx.fillRect(6, -0.8, 1, 1.6);

        // White safety collar
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        // Top silver pentagon bolt
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (prop.type === 'kiosk') {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(-12, -9, 24, 18);

        // Main kiosk body
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(-11, -8, 22, 16);

        // Striped awning canopy roof (Red & White)
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-11, -8, 22, 5);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-7, -8, 4, 5);
        ctx.fillRect(3, -8, 4, 5);

        // Display glass window showing magazine rack
        ctx.fillStyle = '#93c5fd';
        ctx.fillRect(-9, -2, 18, 8);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-7, 0, 4, 4);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(-1, 0, 4, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(4, 0, 4, 4);
      } else if (prop.type === 'cone') {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(2, 2, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Square rubber base
        ctx.fillStyle = '#c2410c';
        ctx.fillRect(-4, -4, 8, 8);

        // Cone body
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
        ctx.fill();

        // Reflective white stripe
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();

        // Top cap
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
      } else if (prop.type === 'trash_can') {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.arc(2, 3, 6, 0, Math.PI * 2);
        ctx.fill();

        // Outer metal cylinder
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Silver rim
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Dark opening lid
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Recycling green icon dot
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (prop.type === 'mailbox') {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(-6, -5, 12, 10);

        // Mailbox body
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(-5, -5, 10, 10);

        // White drop slot
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-3, -3, 6, 1.5);

        // Red flag on side
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(4, -2, 2, 4);
      }

      ctx.restore();
    }
  }

  private renderTreesAndTallProps(
    trees: GameWorld['trees'],
    props: StreetProp[],
    minX: number, minY: number, maxX: number, maxY: number,
    nightAlpha: number = 0
  ) {
    const ctx = this.ctx;

    // Trees
    for (const tree of trees) {
      if (tree.x + tree.radius < minX || tree.x - tree.radius > maxX ||
          tree.y + tree.radius < minY || tree.y - tree.radius > maxY) continue;

      // Tree Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(tree.x + tree.shadowOffset, tree.y + tree.shadowOffset, tree.radius, 0, Math.PI * 2);
      ctx.fill();

      // Tree Foliage
      ctx.fillStyle = tree.color;
      ctx.beginPath();
      ctx.arc(tree.x, tree.y, tree.radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.arc(tree.x - tree.radius * 0.3, tree.y - tree.radius * 0.3, tree.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Night Tint for the tree (since it's drawn ABOVE the lightmap)
      if (nightAlpha > 0.05) {
        ctx.fillStyle = `rgba(0, 5, 20, ${nightAlpha * 0.75})`;
        ctx.beginPath();
        ctx.arc(tree.x, tree.y, tree.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Tall Intact Lampposts
    for (const prop of props) {
      if (prop.type !== 'lamp' || prop.isBroken) continue;
      if (prop.x < minX || prop.x > maxX || prop.y < minY || prop.y > maxY) continue;

      ctx.save();
      ctx.translate(prop.x, prop.y);

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.arc(3, 3, 5, 0, Math.PI * 2);
      ctx.fill();

      // Pole Base
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Inner collar
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      // Glowing luminaire lens
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // --- TRAFFIC LIGHTS ---
  private renderTrafficLights(
    intersections: GameWorld['intersections'],
    props: StreetProp[],
    minX: number, minY: number, maxX: number, maxY: number,
    nightAlpha: number = 0
  ) {
    const ctx = this.ctx;

    for (const prop of props) {
      if (prop.type !== 'traffic_light') continue;
      if (prop.x < minX - 60 || prop.x > maxX + 60 ||
          prop.y < minY - 60 || prop.y > maxY + 60) continue;

      const inter = intersections.find((i) => i.id === prop.intersectionId);
      const phase = inter ? inter.phases[inter.currentPhaseIndex] : null;

      const isBroken = prop.isBroken;

      // Determine signal state from intersection
      let lightState: 'red' | 'yellow' | 'green' | 'red_yellow' = 'red';
      let pedSignal: 'walk' | 'wait' = 'wait';

      if (inter && phase && prop.direction) {
        if (prop.direction === 'north' || prop.direction === 'south') {
          lightState = phase.nsState;
        } else {
          lightState = phase.ewState;
        }
        const cw = inter.crosswalks.find((c) => c.direction === prop.direction);
        pedSignal = cw?.pedestrianSignal || 'wait';
      }

      const isRed = lightState === 'red' || lightState === 'red_yellow';
      const isYellow = lightState === 'yellow' || lightState === 'red_yellow';
      const isGreen = lightState === 'green';

      const facingAngle = prop.angle;

      let pedFacingAngle = 0;
      if (prop.direction === 'north') pedFacingAngle = 0;
      else if (prop.direction === 'south') pedFacingAngle = Math.PI;
      else if (prop.direction === 'east') pedFacingAngle = Math.PI / 2;
      else if (prop.direction === 'west') pedFacingAngle = -Math.PI / 2;

      const bracketLength = 6;
      const pedBracketLen = 5.5;

      ctx.save();
      ctx.translate(prop.x, prop.y);

      if (isBroken) {
        // Render broken traffic light lying on ground
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(3, 3, 14, 5, prop.angle || 0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.rotate(prop.angle || 0.8);

        // Broken Pole / Column lying flat
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(18, 0);
        ctx.stroke();

        // Base stub
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        // Non-working vehicle head at the end
        ctx.save();
        ctx.translate(18, 0);
        ctx.rotate(-Math.PI / 2);

        // Backboard
        ctx.fillStyle = '#0a0f1d';
        ctx.beginPath();
        ctx.roundRect(-4.5, -7.5, 2.5, 15, 1);
        ctx.fill();

        // Housing
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(-3.5, -4.5, 7, 9, 1.5);
        ctx.fill();

        // Broken, dark lens
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.arc(3.2, 0, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Non-working side pedestrian head
        ctx.save();
        ctx.translate(10, 3);
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(-2.5, -2.5, 5, 5, 1);
        ctx.fill();
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.arc(1.5, 0, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

      } else {
        // Intact assembly
        const headX = Math.cos(facingAngle) * bracketLength;
        const headY = Math.sin(facingAngle) * bracketLength;

        const pedHeadX = Math.cos(pedFacingAngle) * pedBracketLen;
        const pedHeadY = Math.sin(pedFacingAngle) * pedBracketLen;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.arc(3, 3, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.roundRect(headX - 4 + 3, headY - 4 + 3, 8, 8, 2);
        ctx.fill();

        ctx.beginPath();
        ctx.roundRect(pedHeadX - 2.5 + 2, pedHeadY - 2.5 + 2, 5, 5, 1);
        ctx.fill();

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(headX, headY);
        ctx.stroke();

        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(pedHeadX, pedHeadY);
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(-0.8, -0.8, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(headX, headY);
        ctx.rotate(facingAngle);

        ctx.fillStyle = '#0a0f1d';
        ctx.beginPath();
        ctx.roundRect(-4.5, -7.5, 2.5, 15, 1);
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 0.75;
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(-3.5, -4.5, 7, 9, 1.5);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 0.75;
        ctx.stroke();

        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#020617';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(2.5, 0, 4.2, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();

        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(3.5, -3.2);
        ctx.quadraticCurveTo(6.8, 0, 3.5, 3.2);
        ctx.stroke();

        let activeColor = '';
        let auraColorInner = '';
        let auraColorOuter = '';

        if (isRed) {
          activeColor = '#ef4444';
          auraColorInner = 'rgba(239, 68, 68, 0.45)';
          auraColorOuter = 'rgba(239, 68, 68, 0)';
        } else if (isYellow) {
          activeColor = '#eab308';
          auraColorInner = 'rgba(234, 179, 8, 0.45)';
          auraColorOuter = 'rgba(234, 179, 8, 0)';
        } else if (isGreen) {
          activeColor = '#22c55e';
          auraColorInner = 'rgba(34, 197, 94, 0.45)';
          auraColorOuter = 'rgba(34, 197, 94, 0)';
        }

        if (activeColor) {
          const auraGrad = ctx.createRadialGradient(3.5, 0, 1, 6, 0, 16);
          auraGrad.addColorStop(0, auraColorInner);
          auraGrad.addColorStop(0.5, auraColorInner.replace('0.45', '0.2'));
          auraGrad.addColorStop(1, auraColorOuter);

          ctx.fillStyle = auraGrad;
          ctx.beginPath();
          ctx.moveTo(3.5, 0);
          ctx.arc(3.5, 0, 16, -Math.PI * 0.42, Math.PI * 0.42);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = activeColor;
          ctx.beginPath();
          ctx.arc(3.2, 0, 1.6, -Math.PI * 0.35, Math.PI * 0.35);
          ctx.fill();
        }
        ctx.restore();

        ctx.save();
        ctx.translate(pedHeadX, pedHeadY);
        ctx.rotate(pedFacingAngle);

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(-2.5, -2.5, 5, 5, 1);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.6;
        ctx.stroke();

        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(1.5, 0, 2.5, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();

        const isPedWalk = pedSignal === 'walk';
        const pedColor = isPedWalk ? '#22c55e' : '#ef4444';
        const pedAuraInner = isPedWalk ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)';
        const pedAuraOuter = isPedWalk ? 'rgba(34, 197, 94, 0)' : 'rgba(239, 68, 68, 0)';

        const pedAuraGrad = ctx.createRadialGradient(2, 0, 0.5, 4, 0, 10);
        pedAuraGrad.addColorStop(0, pedAuraInner);
        pedAuraGrad.addColorStop(1, pedAuraOuter);

        ctx.fillStyle = pedAuraGrad;
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.arc(2, 0, 10, -Math.PI * 0.38, Math.PI * 0.38);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = pedColor;
        ctx.beginPath();
        ctx.arc(1.8, 0, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    }
  }

  // --- PUDDLES ---
  private renderPuddles(puddles: Puddle[], minX: number, minY: number, maxX: number, maxY: number) {
    const ctx = this.ctx;
    for (const p of puddles) {
      if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      // Water body
      ctx.fillStyle = 'rgba(59, 130, 246, 0.28)';
      ctx.beginPath();
      const rX = Math.max(0.1, p.radiusX);
      const rY = Math.max(0.1, p.radiusY);
      ctx.ellipse(0, 0, rX, rY, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sky reflection highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.ellipse(-rX * 0.3, -rY * 0.2, rX * 0.4, rY * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Animated water ripples
      const rippleR = Math.abs((p.rippleTimer * 12) % rX);
      const rippleRY = Math.abs(rippleR * (rY / rX));
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, rippleR, rippleRY, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  // --- BIRDS FAUNA ---
  private renderBirds(birds: Bird[], minX: number, minY: number, maxX: number, maxY: number, nightAlpha: number = 0) {
    const ctx = this.ctx;
    for (const b of birds) {
      if (b.x < minX || b.x > maxX || b.y < minY || b.y > maxY) continue;
      ctx.save();

      // If flying, render ground shadow offset
      if (b.state === 'flying') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(b.x, b.y + b.altitude * 0.5, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Position bird in sky
        ctx.translate(b.x, b.y - b.altitude * 0.6);
      } else {
        ctx.translate(b.x, b.y);
      }
      ctx.rotate(b.angle);

      // Bird body with night tint
      const baseBirdColor = b.type === 'pigeon' ? '#64748b' : '#b45309';
      if (nightAlpha > 0.1) {
        ctx.fillStyle = '#0f172a';
      } else {
        ctx.fillStyle = baseBirdColor;
      }
      ctx.beginPath();
      ctx.ellipse(0, 0, 4, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = b.type === 'pigeon' ? '#475569' : '#78350f';
      ctx.beginPath();
      ctx.arc(3, 0, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(4.5, -0.5);
      ctx.lineTo(6, 0);
      ctx.lineTo(4.5, 0.5);
      ctx.fill();

      // Wings (Flapping if flying)
      if (b.state === 'flying') {
        const wingSpan = 6 + Math.sin(b.wingCycle) * 4;
        ctx.strokeStyle = b.type === 'pigeon' ? '#334155' : '#451a03';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -wingSpan);
        ctx.lineTo(0, wingSpan);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // --- PEDESTRIANS ---
  private renderPedestrians(pedestrians: Pedestrian[]) {
    const ctx = this.ctx;

    for (const ped of pedestrians) {
      if (ped.isInsideBuilding) continue;

      ctx.save();
      ctx.translate(ped.x, ped.y);
      
      // Scale down if child
      if (ped.isChild) {
        ctx.scale(0.7, 0.7);
      }

      ctx.save();
      ctx.rotate(ped.angle);

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(1.5, 2, 4.8, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cyclist / Scooter base
      if (ped.isCyclist) {
        // Bicycle frame
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
        ctx.moveTo(2, 0); ctx.lineTo(4, -3);
        ctx.moveTo(2, 0); ctx.lineTo(4, 3);
        ctx.stroke();
        // Wheels
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-8, -0.8, 4, 1.6);
        ctx.fillRect(4, -0.8, 4, 1.6);
      } else if (ped.isScooter) {
        // Electric scooter base
        ctx.fillStyle = '#334155';
        ctx.fillRect(-7, -1.5, 14, 3);
        // Handlebar stem
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(4, -0.5, 1, 1);
        ctx.fillRect(4.5, -3, 0.8, 6);
      }

      const legSwing = ped.state === 'walking' || ped.state === 'crossing' || ped.state === 'panicking' ? Math.sin(ped.walkCycle) * 2.8 : 0;
      const armSwing = ped.state === 'walking' || ped.state === 'crossing' || ped.state === 'panicking' ? Math.cos(ped.walkCycle) * 2.2 : 0;

      // Legs / Pants
      ctx.fillStyle = ped.pantsColor;
      if (!ped.isCyclist && !ped.isScooter) {
        ctx.fillRect(-1.5, -legSwing - 3.5, 3, 3);
        ctx.fillRect(-1.5, legSwing + 0.5, 3, 3);
      } else {
        // Pedaling or standing on scooter
        ctx.fillRect(-1.5, -2.5, 3, 2);
        ctx.fillRect(-1.5, 0.5, 3, 2);
      }

      // Torso / Shirt
      ctx.fillStyle = ped.shirtColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, 4, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Backpack
      if (ped.hasBackpack) {
        ctx.fillStyle = ped.backpackColor || '#1e293b';
        ctx.fillRect(-5, -3.5, 3.5, 7);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-5, -3.5, 3.5, 7);
      }

      // Arms
      ctx.fillStyle = ped.skinColor;
      if (ped.state === 'idle_phone') {
        // Holding phone
        ctx.fillRect(1, -2, 2.5, 2); // Left arm towards center
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(3, -1.5, 2, 3); // Phone
        ctx.fillStyle = '#38bdf8'; // Screen glow
        ctx.fillRect(3.2, -1.2, 1.6, 2.4);
      } else if (ped.isCyclist || ped.isScooter) {
        // Holding handlebars
        ctx.fillRect(2, -4.5, 3, 2);
        ctx.fillRect(2, 2.5, 3, 2);
      } else {
        ctx.fillRect(armSwing - 1.5, -4.8, 3, 2.2);
        ctx.fillRect(-armSwing - 1.5, 2.6, 3, 2.2);
      }

      // Head & Hair
      ctx.fillStyle = ped.skinColor;
      ctx.beginPath();
      ctx.arc(1.5, 0, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = ped.hairColor;
      ctx.beginPath();
      ctx.arc(0.4, 0, 3.0, Math.PI * 0.5, Math.PI * 1.5);
      ctx.fill();

      // Rain Umbrella
      if (ped.hasUmbrella) {
        ctx.fillStyle = ped.umbrellaColor || '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();

        // Umbrella ribs / highlights
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-9, 0); ctx.lineTo(9, 0);
        ctx.moveTo(0, -9); ctx.lineTo(0, 9);
        ctx.stroke();
      }

      // Dog walking
      if (ped.hasDog) {
        ctx.save();
        ctx.rotate(-Math.PI / 6); // Dog slightly to the side
        ctx.translate(14, 6);
        
        // Leash line
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-14, -6);
        ctx.lineTo(0, 0);
        ctx.stroke();

        // Dog body
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.5, 2.8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Dog head
        ctx.beginPath();
        ctx.arc(3.5, 0, 2.2, 0, Math.PI * 2);
        ctx.fill();
        // Dog ears
        ctx.fillStyle = '#451a03';
        ctx.fillRect(2, -2.5, 1.5, 1.5);
        ctx.fillRect(2, 1, 1.5, 1.5);
        ctx.restore();
      }

      ctx.restore(); // end of rotated part

      // Alert Bubble (drawn in screen-aligned coordinates relative to ped)
      if (ped.alertBubbleText && ped.alertBubbleTimer > 0) {
        const text = ped.alertBubbleText;
        ctx.font = 'bold 10px sans-serif';
        const tw = ctx.measureText(text).width;
        const bw = tw + 10;
        const bh = 16;
        
        ctx.save();
        ctx.translate(0, -18);
        
        // Bubble tail
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.lineTo(-3, 0);
        ctx.lineTo(3, 0);
        ctx.fill();
        
        // Bubble body
        ctx.beginPath();
        ctx.roundRect(-bw / 2, -bh, bw, bh, 6);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, -bh / 2);
        ctx.restore();
      }

      ctx.restore();
    }
  }

  // --- PLAYER ON FOOT ---
  private renderPlayerPedestrian(player: Player) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(2, 2.5, 6, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    const legSwing = Math.sin(player.walkCycle) * 3.2;

    // Pants
    ctx.fillStyle = player.pantsColor;
    ctx.fillRect(-2, -legSwing - 4, 3.8, 3.8);
    ctx.fillRect(-2, legSwing + 0.5, 3.8, 3.8);

    // Jacket / Shirt
    ctx.fillStyle = player.shirtColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.8, 6.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = player.skinColor;
    ctx.beginPath();
    ctx.arc(2, 0, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = player.hairColor;
    ctx.beginPath();
    ctx.arc(0.8, 0, 3.6, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();

    ctx.restore();
  }

  // --- VEHICLES ---
  private renderVehicles(vehicles: Vehicle[], nightAlpha: number) {
    const ctx = this.ctx;

    for (const car of vehicles) {
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);

      const halfL = car.length / 2;
      const halfW = car.width / 2;

      // 1. Drop Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.fillRect(-halfL + 3, -halfW + 4, car.length, car.width);

      // 2. Wheels - Tucked realistically inside wheel wells
      const wheelL = 10;
      const wheelW = car.type === 'sports' ? 5.5 : 4.2;
      const frontAxleX = halfL * 0.65;
      const rearAxleX = -halfL * 0.65;
      const trackY = halfW - 0.8; // Tucked slightly inside halfW

      // Rear wheels (fixed)
      ctx.fillStyle = '#0f172a'; // Tire
      ctx.fillRect(rearAxleX - wheelL / 2, -trackY, wheelL, wheelW);
      ctx.fillRect(rearAxleX - wheelL / 2, trackY - wheelW, wheelL, wheelW);
      ctx.fillStyle = '#64748b'; // Rims
      ctx.fillRect(rearAxleX - wheelL / 2 + 2, -trackY + 0.8, wheelL - 4, wheelW - 1.6);
      ctx.fillRect(rearAxleX - wheelL / 2 + 2, trackY - wheelW + 0.8, wheelL - 4, wheelW - 1.6);

      // Front wheels (steered)
      const renderSteeredWheel = (wx: number, wy: number) => {
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(car.steerAngle);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-wheelL / 2, -wheelW / 2, wheelL, wheelW);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(-wheelL / 2 + 2, -wheelW / 2 + 0.8, wheelL - 4, wheelW - 1.6);
        ctx.restore();
      };
      renderSteeredWheel(frontAxleX, -trackY + wheelW / 2);
      renderSteeredWheel(frontAxleX, trackY - wheelW / 2);

      // 3. Body Shell Contours (with Crumple/Dent deform calculations)
      const dmg = car.damage || {
        health: 100, frontCrumple: 0, rearCrumple: 0, leftDent: 0, rightDent: 0,
        frontLeftDent: 0, frontRightDent: 0, rearLeftDent: 0, rearRightDent: 0,
        hoodBuckled: false, windshieldCracked: false, rearGlassCracked: false,
        leftHeadlightBroken: false, rightHeadlightBroken: false,
        leftTaillightBroken: false, rightTaillightBroken: false,
        engineSmoking: false, engineFire: false, scratches: []
      };

      const fc = Math.min(14, dmg.frontCrumple || 0);
      const rc = Math.min(12, dmg.rearCrumple || 0);
      const ld = Math.min(7, dmg.leftDent || 0);
      const rd = Math.min(7, dmg.rightDent || 0);
      const fld = Math.min(9, dmg.frontLeftDent || 0);
      const frd = Math.min(9, dmg.frontRightDent || 0);
      const rld = Math.min(8, dmg.rearLeftDent || 0);
      const rrd = Math.min(8, dmg.rearRightDent || 0);

      let bodyPoly = [];
      if (dmg.deformedVertices && dmg.deformedVertices.length === 16) {
        bodyPoly = dmg.deformedVertices.map(v => ({ x: v.localX + v.offsetX, y: v.localY + v.offsetY }));
      } else {
        bodyPoly = [
          { x: halfL - fc, y: 0 },
          { x: halfL - fc - 0.5, y: halfW * 0.5 },
          { x: halfL - frd - 2.5, y: halfW - frd * 0.35 - 1.5 },
          { x: halfL * 0.5, y: halfW - rd * 0.35 },
          { x: 0, y: halfW - rd },
          { x: -halfL * 0.5, y: halfW - rd * 0.35 },
          { x: -halfL + rrd + 2.5, y: halfW - rrd * 0.35 - 1.5 },
          { x: -halfL + rc + 0.5, y: halfW * 0.5 },
          { x: -halfL + rc, y: 0 },
          { x: -halfL + rc + 0.5, y: -halfW * 0.5 },
          { x: -halfL + rld + 2.5, y: -halfW + rld * 0.35 + 1.5 },
          { x: -halfL * 0.5, y: -halfW + ld * 0.35 },
          { x: 0, y: -halfW + ld },
          { x: halfL * 0.5, y: -halfW + ld * 0.35 },
          { x: halfL - fld - 2.5, y: -halfW + fld * 0.35 + 1.5 },
          { x: halfL - fc - 0.5, y: -halfW * 0.5 }
        ];
      }

      ctx.fillStyle = car.color;
      ctx.beginPath();
      ctx.moveTo(bodyPoly[0].x, bodyPoly[0].y);
      for (let i = 1; i < bodyPoly.length; i++) {
        ctx.lineTo(bodyPoly[i].x, bodyPoly[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.42)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Police Car Dual-Tone Paint Layout
      if (car.type === 'police') {
        ctx.fillStyle = '#0f172a'; // Black hood and trunk
        ctx.beginPath();
        ctx.moveTo(halfL * 0.3, -halfW + 0.8);
        ctx.lineTo(bodyPoly[0].x, bodyPoly[0].y);
        ctx.lineTo(halfL * 0.3, halfW - 0.8);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-halfL * 0.38, -halfW + 0.8);
        ctx.lineTo(bodyPoly[8].x, bodyPoly[8].y);
        ctx.lineTo(-halfL * 0.38, halfW - 0.8);
        ctx.closePath();
        ctx.fill();

        // Push bumper (bullbar)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(halfL - fc - 0.5, -5, 2, 10);
        ctx.fillRect(halfL - fc - 2, -4, 2.2, 1.5);
        ctx.fillRect(halfL - fc - 2, 2.5, 2.2, 1.5);
      }

      // 4. Crease Lines & Scratches
      if (fc > 2 || fld > 2 || frd > 2 || dmg.hoodBuckled) {
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(halfL - fc - 2, -halfW * 0.35);
        ctx.lineTo(halfL * 0.3, 0);
        ctx.lineTo(halfL - fc - 2, halfW * 0.35);
        ctx.stroke();
      }
      if (rc > 2 || rld > 2 || rrd > 2) {
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-halfL + rc + 2, -halfW * 0.35);
        ctx.lineTo(-halfL * 0.4, 0);
        ctx.lineTo(-halfL + rc + 2, halfW * 0.35);
        ctx.stroke();
      }
      if (dmg.scratches && dmg.scratches.length > 0) {
        ctx.save();
        // Create clipping path matching the car body polygon to prevent scratches from sticking out
        ctx.beginPath();
        ctx.moveTo(bodyPoly[0].x, bodyPoly[0].y);
        for (let i = 1; i < bodyPoly.length; i++) {
          ctx.lineTo(bodyPoly[i].x, bodyPoly[i].y);
        }
        ctx.closePath();
        ctx.clip();

        for (const sc of dmg.scratches) {
          ctx.save();
          ctx.translate(sc.x, sc.y);
          ctx.rotate(sc.angle);
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-sc.length / 2, 0);
          ctx.lineTo(sc.length / 2, 0);
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }

      // 5. Procedural Cabin/Windows - Geometry alters dynamically per vehicle class
      let cabinL = car.length * 0.52;
      let cabinW = Math.max(8, car.width * 0.8 - (ld + rd) * 0.3);
      let cabinX = -car.length * 0.05;

      if (car.type === 'sports') {
        cabinL = car.length * 0.45;
        cabinW = car.width * 0.74;
        cabinX = -car.length * 0.08;
      } else if (car.type === 'hatchback') {
        cabinL = car.length * 0.56;
        cabinW = car.width * 0.78;
        cabinX = -car.length * 0.12;
      } else if (car.type === 'suv') {
        cabinL = car.length * 0.58;
        cabinW = car.width * 0.82;
        cabinX = -car.length * 0.05;
      } else if (car.type === 'pickup') {
        cabinL = car.length * 0.38;
        cabinW = car.width * 0.82;
        cabinX = car.length * 0.1;
      }

      // Glass base
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cabinX - cabinL / 2, -cabinW / 2, cabinL, cabinW);

      // Roof paint
      const roofL = cabinL * 0.66;
      const roofW = cabinW * 0.80;
      ctx.fillStyle = car.roofColor || car.color;
      ctx.fillRect(cabinX - roofL / 2, -roofW / 2, roofL, roofW);

      // Windshield glossy sky blue glaze & gloss streak
      const fWsX1 = cabinX + roofL / 2;
      const fWsX2 = cabinX + cabinL / 2;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.fillRect(fWsX1, -cabinW / 2 + 1, fWsX2 - fWsX1, cabinW - 2);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(fWsX1 + 1, -cabinW / 2 + 2);
      ctx.lineTo(fWsX2 - 1, cabinW / 2 - 2);
      ctx.stroke();

      // Rear Glass reflection
      const rWsX1 = cabinX - cabinL / 2;
      const rWsX2 = cabinX - roofL / 2;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.fillRect(rWsX1, -cabinW / 2 + 1, rWsX2 - rWsX1, cabinW - 2);
      ctx.beginPath();
      ctx.moveTo(rWsX1 + 1, -cabinW / 4);
      ctx.lineTo(rWsX2 - 1, cabinW / 4);
      ctx.stroke();

      // Side Windows reflections
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.fillRect(cabinX - roofL / 2, -cabinW / 2 + 0.5, roofL, (cabinW - roofW) / 2 - 0.5);
      ctx.fillRect(cabinX - roofL / 2, roofW / 2, roofL, (cabinW - roofW) / 2 - 0.5);

      if (dmg.windshieldCracked) {
        const wsMinX = fWsX1 + 1;
        const wsMaxX = fWsX2 - 1;
        const wsCenterX = wsMinX + (wsMaxX - wsMinX) * 0.5;
        const wsCenterY = 0;
        const wsHalfW = (wsMaxX - wsMinX) * 0.45;
        const wsHalfH = (cabinW - 4) * 0.45;

        // Clip to windshield bounds
        ctx.save();
        ctx.beginPath();
        ctx.rect(wsMinX, -cabinW / 2 + 2, wsMaxX - wsMinX, cabinW - 4);
        ctx.clip();

        // Dark shattered core indentation at center of windshield
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.arc(wsCenterX, wsCenterY, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Radiating spiderweb cracks & concentric fracture rings
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.95)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();

        const arms = 6;
        for (let i = 0; i < arms; i++) {
          const angle = (i / arms) * Math.PI * 2 + (i * 0.3);
          const len = Math.min(wsHalfW, wsHalfH) * (0.5 + (i % 2) * 0.25);
          const endX = wsCenterX + Math.cos(angle) * len;
          const endY = wsCenterY + Math.sin(angle) * len;
          ctx.moveTo(wsCenterX, wsCenterY);
          ctx.lineTo(endX, endY);

          // Sub-fracture branching
          const branchAngle = angle + 0.6;
          ctx.moveTo(endX * 0.7, endY * 0.7);
          ctx.lineTo(endX + Math.cos(branchAngle) * 2, endY + Math.sin(branchAngle) * 2);
        }

        // Concentric spiderweb rings
        for (let r = 1.2; r < Math.min(wsHalfW, wsHalfH); r += 1.8) {
          ctx.moveTo(wsCenterX + r, wsCenterY);
          ctx.arc(wsCenterX, wsCenterY, r, 0, Math.PI * 2);
        }
        ctx.stroke();

        // Crystalline sparkle glints
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(wsCenterX + 0.8, wsCenterY - 0.8, 0.6, 0, Math.PI * 2);
        ctx.arc(wsCenterX - 1.2, wsCenterY + 1.0, 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Interactive Windshield Wipers
      if (car.wiperAngle !== undefined) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 0.8;
        ctx.save();
        ctx.translate(fWsX1, 0);
        ctx.rotate(car.wiperAngle);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(cabinL * 0.12, 0); ctx.stroke();
        ctx.restore();
      }

      // 6. Distinct Car Type Additions
      if (car.type === 'sports') {
        // Large Carbon Fiber Rear Wing Spoiler
        ctx.fillStyle = '#0a0f1d';
        ctx.fillRect(-halfL + rc + 1, -halfW * 0.45, 1.8, 1);
        ctx.fillRect(-halfL + rc + 1, halfW * 0.35, 1.8, 1);
        ctx.fillRect(-halfL + rc - 1.5, -halfW * 0.82, 3.2, halfW * 1.64);
        ctx.fillStyle = car.color;
        ctx.fillRect(-halfL + rc - 1.8, -halfW * 0.82 - 0.5, 3.8, 1);
        ctx.fillRect(-halfL + rc - 1.8, halfW * 0.82 - 0.5, 3.8, 1);

        // Hood Intakes & Double racing stripes
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(halfL * 0.38, -halfW * 0.32, 5, 2.2);
        ctx.fillRect(halfL * 0.38, halfW * 0.18, 5, 2.2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(-halfL + rc, -2.5, car.length - fc - rc, 1.2);
        ctx.fillRect(-halfL + rc, 1.3, car.length - fc - rc, 1.2);

      } else if (car.type === 'pickup') {
        // Open Truck Bed with Tailgate
        const bedX1 = -halfL + rc + 3;
        const bedX2 = cabinX - cabinL / 2;
        const bedW = halfW * 2 - 3.2;
        ctx.fillStyle = '#111827'; // bed liner
        ctx.fillRect(bedX1, -bedW / 2, bedX2 - bedX1, bedW);
        ctx.strokeStyle = '#1e293b'; // ribs
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let ry = -bedW / 2 + 2.5; ry < bedW / 2; ry += 2.5) {
          ctx.moveTo(bedX1 + 1, ry); ctx.lineTo(bedX2 - 1, ry);
        }
        ctx.stroke();

        // Bed Cargo (Wooden box & spare wheel)
        ctx.fillStyle = '#92400e';
        ctx.fillRect(bedX1 + 2.5, -bedW / 2 + 2, 7.5, 6);
        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); ctx.arc(bedX2 - 5, bedW / 2 - 4.2, 3.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#64748b';
        ctx.beginPath(); ctx.arc(bedX2 - 5, bedW / 2 - 4.2, 1.8, 0, Math.PI * 2); ctx.fill();

      } else if (car.type === 'suv') {
        // Roof cross rails & spare tire mounted on back tailgate
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cabinX - cabinL * 0.35, -cabinW * 0.43); ctx.lineTo(cabinX + cabinL * 0.35, -cabinW * 0.43);
        ctx.moveTo(cabinX - cabinL * 0.35, cabinW * 0.43); ctx.lineTo(cabinX + cabinL * 0.35, cabinW * 0.43);
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); ctx.arc(-halfL, 0, 4.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = car.color;
        ctx.beginPath(); ctx.arc(-halfL, 0, 2.5, 0, Math.PI * 2); ctx.fill();

      } else if (car.type === 'taxi') {
        // Taxi sign with amber glow
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(cabinX - 1.5, -5.5, 3, 11);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(cabinX - 1, -4.5, 2, 9);

        if (nightAlpha > 0.05) {
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          const signGlow = ctx.createRadialGradient(cabinX, 0, 1, cabinX, 0, 11);
          signGlow.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
          signGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
          ctx.fillStyle = signGlow;
          ctx.beginPath(); ctx.arc(cabinX, 0, 11, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }

        // Side checkerboard decals
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.5;
        ctx.save();
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(-halfL + rc, -halfW + 1.2); ctx.lineTo(halfL - fc, -halfW + 1.2);
        ctx.moveTo(-halfL + rc, halfW - 1.2); ctx.lineTo(halfL - fc, halfW - 1.2);
        ctx.stroke();
        ctx.restore();
      }

      // 7. Headlights (Symmetrical & inset to guarantee they are 100% inside body)
      const isPlayer = car.isPlayerControlled;
      const hasHeadlightsOn = isPlayer 
        ? car.headlightsOn 
        : (car.headlightsOn || (nightAlpha > 0.05 && !car.isParked));
      const isHighBeam = car.headlightMode === 'high';
      const isLowBeam = car.headlightMode === 'low' || (hasHeadlightsOn && !isHighBeam);

      const leftLampX = halfL - Math.max(fld, fc) - 3.2;
      const leftLampY = -halfW + 3.2 + ld * 0.15;
      const rightLampX = halfL - Math.max(frd, fc) - 3.2;
      const rightLampY = halfW - 3.2 - rd * 0.15;

      // Front bumper grille
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(halfL - fc - 2, -halfW + 4.5, 1.5, halfW * 2 - 9);

      const drawHeadlight = (lx: number, ly: number, broken: boolean) => {
        if (broken) {
          ctx.fillStyle = '#1e293b';
          ctx.beginPath(); ctx.arc(lx, ly, 1.8, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = hasHeadlightsOn ? '#fef08a' : '#cbd5e1';
          ctx.beginPath(); ctx.arc(lx, ly, 1.8, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      };
      drawHeadlight(leftLampX, leftLampY, dmg.leftHeadlightBroken);
      drawHeadlight(rightLampX, rightLampY, dmg.rightHeadlightBroken);

      // 8. Taillights, Brake Lights & Reverse Lights
      const isReversing = car.isReversing || (car.speed < -1 && !car.isParked);
      const isBraking = car.brakeLightsOn && !isReversing;
      const isNightRunning = (nightAlpha > 0.05 || hasHeadlightsOn) && !car.isParked;

      const rearLeftX = -halfL + rc * 0.85 + rld * 0.4 + 2.5;
      const rearLeftY = -halfW + 3.2 + ld * 0.15;
      const rearRightX = -halfL + rc * 0.85 + rrd * 0.4 + 2.5;
      const rearRightY = halfW - 3.2 - rd * 0.15;

      const drawTaillight = (rx: number, ry: number, broken: boolean) => {
        if (broken) return;
        if (isReversing) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(rx - 1, ry - 1, 2, 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.beginPath(); ctx.arc(rx, ry, 5, 0, Math.PI * 2); ctx.fill();
        } else if (isBraking) {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(rx - 1, ry - 1, 2, 2);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
          ctx.beginPath(); ctx.arc(rx, ry, 7, 0, Math.PI * 2); ctx.fill();
        } else if (isNightRunning) {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(rx - 1, ry - 1, 2, 2);
          ctx.fillStyle = 'rgba(185, 28, 28, 0.22)';
          ctx.beginPath(); ctx.arc(rx, ry, 3.8, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(rx - 1, ry - 1, 2, 2);
        }
      };
      drawTaillight(rearLeftX, rearLeftY, dmg.leftTaillightBroken);
      drawTaillight(rearRightX, rearRightY, dmg.rightTaillightBroken);

      // 9. Turn Indicators (Amber blinking corners)
      if (car.turnSignal !== 'none') {
        const isBlinkOn = Math.floor(car.turnSignalTimer * 4) % 2 === 0;
        if (isBlinkOn) {
          ctx.fillStyle = '#f59e0b';
          const isLeft = car.turnSignal === 'left' || car.turnSignal === 'hazard';
          const isRight = car.turnSignal === 'right' || car.turnSignal === 'hazard';

          if (isLeft) {
            ctx.fillRect(leftLampX - 1, leftLampY - 2.5, 1.8, 1.8);
            ctx.fillRect(rearLeftX - 1, rearLeftY - 2.5, 1.8, 1.8);
            ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
            ctx.beginPath();
            ctx.arc(leftLampX, leftLampY - 1.5, 6, 0, Math.PI * 2);
            ctx.arc(rearLeftX, rearLeftY - 1.5, 6, 0, Math.PI * 2);
            ctx.fill();
          }
          if (isRight) {
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(rightLampX - 1, rightLampY + 0.8, 1.8, 1.8);
            ctx.fillRect(rearRightX - 1, rearRightY + 0.8, 1.8, 1.8);
            ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
            ctx.beginPath();
            ctx.arc(rightLampX, rightLampY + 1.5, 6, 0, Math.PI * 2);
            ctx.arc(rearRightX, rearRightY + 1.5, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 10. Flashing roof sirens for police cars
      if (car.type === 'police') {
        const strobe = Math.floor(Date.now() / 90) % 4;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(cabinX - 1.5, -cabinW * 0.45, 3, cabinW * 0.9);
        
        ctx.fillStyle = (strobe === 0 || strobe === 1) ? '#3b82f6' : '#1e3a8a';
        ctx.fillRect(cabinX - 1, -cabinW * 0.4, 2, cabinW * 0.35);
        ctx.fillStyle = (strobe === 2 || strobe === 3) ? '#ef4444' : '#7f1d1d';
        ctx.fillRect(cabinX - 1, cabinW * 0.05, 2, cabinW * 0.35);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cabinX - 1.2, -1, 2.4, 2);

        if (nightAlpha > 0.05) {
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          const leftGlow = ctx.createRadialGradient(cabinX, -cabinW * 0.3, 1, cabinX, -cabinW * 0.3, 22);
          leftGlow.addColorStop(0, (strobe === 0 || strobe === 1) ? 'rgba(59, 130, 246, 0.45)' : 'rgba(59, 130, 246, 0.15)');
          leftGlow.addColorStop(1, 'rgba(59, 130, 246, 0)');
          ctx.fillStyle = leftGlow;
          ctx.beginPath(); ctx.arc(cabinX, -cabinW * 0.3, 22, 0, Math.PI * 2); ctx.fill();

          const rightGlow = ctx.createRadialGradient(cabinX, cabinW * 0.3, 1, cabinX, cabinW * 0.3, 22);
          rightGlow.addColorStop(0, (strobe === 2 || strobe === 3) ? 'rgba(239, 68, 68, 0.45)' : 'rgba(239, 68, 68, 0.15)');
          rightGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.fillStyle = rightGlow;
          ctx.beginPath(); ctx.arc(cabinX, cabinW * 0.3, 22, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }

      ctx.restore();
    }
  }

  // --- PARTICLES ---
  private renderParticles(particles: GameWorld['particles']) {
    const ctx = this.ctx;
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1.0, p.alpha));

      if (p.type === 'glass_shard') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.x + p.y) * 0.1);

        ctx.fillStyle = 'rgba(186, 230, 253, 0.75)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.7;

        ctx.beginPath();
        const r = p.radius;
        ctx.moveTo(-r, -r * 0.5);
        ctx.lineTo(r * 0.8, -r);
        ctx.lineTo(r, r * 0.6);
        ctx.lineTo(-r * 0.5, r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-r * 0.2, -r * 0.2, r * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else if (p.type === 'debris') {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.radius * 0.5, p.y - p.radius * 0.5, p.radius, p.radius);
      } else if (p.type === 'spark') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        // Inner hot core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'flame') {
        const rad = p.radius;
        const grad = ctx.createRadialGradient(p.x, p.y, rad * 0.2, p.x, p.y, rad);
        grad.addColorStop(0, '#fef08a');
        grad.addColorStop(0.4, '#f97316');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Smoke / Exhaust / Dust
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // --- PROFESSIONAL TWO-PASS LIGHTMAP SYSTEM ---
  private renderLightmap(
    world: GameWorld,
    timeHour: number,
    weatherTransition: number,
    nearbyVehicles: Vehicle[],
    props: StreetProp[],
    minX: number, minY: number, maxX: number, maxY: number
  ) {
    let nightAlpha = 0;
    let baseColor = 'rgba(5, 10, 24, ';
    if (timeHour >= 8 && timeHour < 17) {
      nightAlpha = 0;
    } else if (timeHour >= 17 && timeHour < 20) {
      const p = (timeHour - 17) / 3;
      nightAlpha = p * 0.45;
      baseColor = 'rgba(70, 25, 10, ';
    } else if (timeHour >= 20 || timeHour < 5) {
      nightAlpha = 0.85; // Slightly reduced from 0.92 for better visibility
      baseColor = 'rgba(5, 10, 25, ';
    } else if (timeHour >= 5 && timeHour < 8) {
      const p = (timeHour - 5) / 3;
      nightAlpha = (1 - p) * 0.45;
      baseColor = 'rgba(30, 40, 70, ';
    }

    const isRaining = (world.weather === 'rain' || world.weather === 'storm');
    const isFog = world.weather === 'fog';
    const effectiveAlpha = Math.max(nightAlpha, isRaining ? 0.35 * weatherTransition : 0, isFog ? 0.45 * weatherTransition : 0);

    if (effectiveAlpha <= 0.02 && !isRaining && !isFog && (world.lightningFlashTimer ?? 0) <= 0) {
      return;
    }

    const ctx = this.ctx;
    const lCtx = this.lightmapCtx;

    // --- PASS 1: Generate Cutout Darkness Layer Offscreen ---
    lCtx.clearRect(0, 0, this.width, this.height);
    // Slightly reduced opacity for better nighttime texture visibility
    lCtx.fillStyle = `${baseColor}${effectiveAlpha * 0.95})`;
    lCtx.fillRect(0, 0, this.width, this.height);

    lCtx.save();
    // Synchronize offscreen transform with main camera
    lCtx.setTransform(ctx.getTransform());
    lCtx.globalCompositeOperation = 'destination-out';

    // A. Headlight Cone Cutouts
    for (const car of nearbyVehicles) {
      const isPlayer = car.isPlayerControlled;
      const hasHeadlightsOn = isPlayer 
        ? car.headlightsOn 
        : (car.headlightsOn || (nightAlpha > 0.05 && !car.isParked) || isRaining);
      
      if (!hasHeadlightsOn) continue;

      const cosA = Math.cos(car.angle);
      const sinA = Math.sin(car.angle);
      const halfL = car.length / 2;
      const halfW = car.width / 2;

      const isHighBeam = car.headlightMode === 'high';
      const beamLen = isHighBeam ? 350 : 220;
      const beamSpread = isHighBeam ? 75 : 52;
      const dmg = car.damage || { leftHeadlightBroken: false, rightHeadlightBroken: false, frontCrumple: 0, rearCrumple: 0, leftDent: 0, rightDent: 0, frontLeftDent: 0, frontRightDent: 0, rearLeftDent: 0, rearRightDent: 0 };
      
      const fc = Math.min(14, dmg.frontCrumple || 0);
      const ld = Math.min(7, dmg.leftDent || 0);
      const rd = Math.min(7, dmg.rightDent || 0);
      const fld = Math.min(9, dmg.frontLeftDent || 0);
      const frd = Math.min(9, dmg.frontRightDent || 0);

      const leftLampLX = halfL - Math.max(fld, fc) - 3.2;
      const leftLampLY = -halfW + 3.2 + ld * 0.15;
      const rightLampLX = halfL - Math.max(frd, fc) - 3.2;
      const rightLampLY = halfW - 3.2 - rd * 0.15;

      const cutHeadlightBeam = (lxOffset: number, lyOffset: number, broken: boolean) => {
        if (broken) return;
        const lx = car.x + cosA * lxOffset - sinA * lyOffset;
        const ly = car.y + sinA * lxOffset + cosA * lyOffset;

        // Pass 1: Cut a hole in the darkness. 
        // Softened stops to prevent "daylight" sharp holes
        const beamGrad = lCtx.createRadialGradient(lx, ly, 0, lx + cosA * (beamLen * 0.5), ly + sinA * (beamLen * 0.45), beamLen);
        beamGrad.addColorStop(0, 'rgba(0, 0, 0, 0.82)'); 
        beamGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.62)');
        beamGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.22)');
        beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        lCtx.fillStyle = beamGrad;
        lCtx.beginPath();
        lCtx.moveTo(lx, ly);
        // Draw a trapezoid-like shape with an arc at the end for realistic light propagation
        const endLX = lx + cosA * beamLen;
        const endLY = ly + sinA * beamLen;
        lCtx.lineTo(endLX - sinA * beamSpread, endLY + cosA * beamSpread);
        lCtx.arc(lx, ly, beamLen, Math.atan2(sinA * beamLen + cosA * beamSpread, cosA * beamLen - sinA * beamSpread), Math.atan2(sinA * beamLen - cosA * beamSpread, cosA * beamLen + sinA * beamSpread), true);
        lCtx.lineTo(lx, ly);
        lCtx.closePath();
        lCtx.fill();
        
        // Very small source cutout to ensure the bulb itself is visible
        const sourceGrad = lCtx.createRadialGradient(lx, ly, 0, lx, ly, 3);
        sourceGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
        sourceGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        lCtx.fillStyle = sourceGrad;
        lCtx.beginPath(); lCtx.arc(lx, ly, 3, 0, Math.PI * 2); lCtx.fill();
      };

      cutHeadlightBeam(leftLampLX, leftLampLY, dmg.leftHeadlightBroken);
      cutHeadlightBeam(rightLampLX, rightLampLY, dmg.rightHeadlightBroken);

      // Rear Cutouts
      const rc = Math.min(12, dmg.rearCrumple || 0);
      const rld = Math.min(8, dmg.rearLeftDent || 0);
      const rrd = Math.min(8, dmg.rearRightDent || 0);

      const rearLeftLX = -halfL + rc * 0.85 + rld * 0.4 + 2.5;
      const rearLeftLY = -halfW + 3.2 + ld * 0.15;
      const rearRightLX = -halfL + rc * 0.85 + rrd * 0.4 + 2.5;
      const rearRightLY = halfW - 3.2 - rd * 0.15;

      const isReversing = (car.speed < -0.5 && !car.isParked);
      const isBraking = car.brakeLightsOn && !isReversing;

      const cutRadialLight = (rxOffset: number, ryOffset: number, radius: number) => {
        const rx = car.x + cosA * rxOffset - sinA * ryOffset;
        const ry = car.y + sinA * rxOffset + cosA * ryOffset;
        const radGrad = lCtx.createRadialGradient(rx, ry, 0.5, rx, ry, radius);
        radGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
        radGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)');
        radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        lCtx.fillStyle = radGrad;
        lCtx.beginPath();
        lCtx.arc(rx, ry, radius, 0, Math.PI * 2);
        lCtx.fill();
      };

      if (isReversing) {
        cutRadialLight(rearLeftLX, rearLeftLY, 30);
        cutRadialLight(rearRightLX, rearRightLY, 30);
      } else if (isBraking) {
        cutRadialLight(rearLeftLX, rearLeftLY, 35);
        cutRadialLight(rearRightLX, rearRightLY, 35);
      } else {
        cutRadialLight(rearLeftLX, rearLeftLY, 12);
        cutRadialLight(rearRightLX, rearRightLY, 12);
      }

      // Small ambient cutout for the car body to make it visible
      const carGrad = lCtx.createRadialGradient(car.x, car.y, 2, car.x, car.y, 45);
      carGrad.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
      carGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lCtx.fillStyle = carGrad;
      lCtx.beginPath();
      lCtx.arc(car.x, car.y, 45, 0, Math.PI * 2);
      lCtx.fill();

      // Turn signal cutouts
      if (car.turnSignal !== 'none') {
        const isBlinkOn = Math.floor(car.turnSignalTimer * 4) % 2 === 0;
        if (isBlinkOn) {
          const isLeft = car.turnSignal === 'left' || car.turnSignal === 'hazard';
          const isRight = car.turnSignal === 'right' || car.turnSignal === 'hazard';
          
          if (isLeft) {
            cutRadialLight(leftLampLX, leftLampLY - 1.5, 20);
            cutRadialLight(rearLeftLX, rearLeftLY - 1.5, 20);
          }
          if (isRight) {
            cutRadialLight(rightLampLX, rightLampLY + 1.5, 20);
            cutRadialLight(rearRightLX, rearRightLY + 1.5, 20);
          }
        }
      }
    }

    // C. Street Lamp Cutouts
    for (const prop of props) {
      if (prop.type === 'lamp' && !prop.isBroken && prop.x >= minX && prop.x <= maxX && prop.y >= minY && prop.y <= maxY) {
        const lampGrad = lCtx.createRadialGradient(prop.x, prop.y, 5, prop.x, prop.y, 110);
        lampGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
        lampGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)');
        lampGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        lCtx.fillStyle = lampGrad;
        lCtx.beginPath();
        lCtx.arc(prop.x, prop.y, 110, 0, Math.PI * 2);
        lCtx.fill();
      }
    }

    // D. Traffic Light Cutouts
    for (const prop of props) {
      if (prop.type === 'traffic_light' && !prop.isBroken && prop.x >= minX - 60 && prop.x <= maxX + 60 && prop.y >= minY - 60 && prop.y <= maxY + 60) {
        const tfGrad = lCtx.createRadialGradient(prop.x, prop.y, 2, prop.x, prop.y, 50);
        tfGrad.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
        tfGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        lCtx.fillStyle = tfGrad;
        lCtx.beginPath();
        lCtx.arc(prop.x, prop.y, 50, 0, Math.PI * 2);
        lCtx.fill();
      }
    }
    lCtx.restore();

    // --- Apply Lightmap to Main Canvas ---
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset to screen space to draw the lightmap
    ctx.drawImage(this.lightmapCanvas, 0, 0);
    ctx.restore();

    // --- PASS 2: Additive Glow / Optics (lighter) ---
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // A. Street Lamp Additive Pools & Bulb Halos
    for (const prop of props) {
      if (prop.type === 'lamp' && !prop.isBroken && prop.x >= minX && prop.x <= maxX && prop.y >= minY && prop.y <= maxY) {
        const poolGrad = ctx.createRadialGradient(prop.x, prop.y, 4, prop.x, prop.y, 80);
        poolGrad.addColorStop(0, 'rgba(255, 230, 150, 0.45)');
        poolGrad.addColorStop(0.5, 'rgba(255, 200, 50, 0.15)');
        poolGrad.addColorStop(1, 'rgba(255, 200, 50, 0)');
        ctx.fillStyle = poolGrad;
        ctx.beginPath();
        ctx.arc(prop.x, prop.y, 80, 0, Math.PI * 2);
        ctx.fill();

        const bulbGlow = ctx.createRadialGradient(prop.x, prop.y, 1, prop.x, prop.y, 20);
        bulbGlow.addColorStop(0, 'rgba(255, 255, 220, 0.9)');
        bulbGlow.addColorStop(0.5, 'rgba(255, 220, 100, 0.5)');
        bulbGlow.addColorStop(1, 'rgba(255, 200, 50, 0)');
        ctx.fillStyle = bulbGlow;
        ctx.beginPath();
        ctx.arc(prop.x, prop.y, 20, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // B. Vehicle Headlight Beams (Additive)
    for (const car of nearbyVehicles) {
      const isPlayer = car.isPlayerControlled;
      const hasHeadlightsOn = isPlayer 
        ? car.headlightsOn 
        : (car.headlightsOn || (nightAlpha > 0.05 && !car.isParked) || isRaining);

      if (!hasHeadlightsOn) continue;

      const cosA = Math.cos(car.angle);
      const sinA = Math.sin(car.angle);
      const halfL = car.length / 2;
      const halfW = car.width / 2;

      const isHighBeam = car.headlightMode === 'high';
      const beamLen = isHighBeam ? 400 : 220;
      const beamSpread = isHighBeam ? 85 : 55;
      const dmg = car.damage || { leftHeadlightBroken: false, rightHeadlightBroken: false, frontCrumple: 0, rearCrumple: 0, leftDent: 0, rightDent: 0, frontLeftDent: 0, frontRightDent: 0, rearLeftDent: 0, rearRightDent: 0 };
      
      const fc = Math.min(14, dmg.frontCrumple || 0);
      const ld = Math.min(7, dmg.leftDent || 0);
      const rd = Math.min(7, dmg.rightDent || 0);
      const fld = Math.min(9, dmg.frontLeftDent || 0);
      const frd = Math.min(9, dmg.frontRightDent || 0);

      const leftLampLX = halfL - Math.max(fld, fc) - 3.2;
      const leftLampLY = -halfW + 3.2 + ld * 0.15;
      const rightLampLX = halfL - Math.max(frd, fc) - 3.2;
      const rightLampLY = halfW - 3.2 - rd * 0.15;

      const drawHeadlightAdd = (lxOffset: number, lyOffset: number, broken: boolean) => {
        if (broken) return;
        const lx = car.x + cosA * lxOffset - sinA * lyOffset;
        const ly = car.y + sinA * lxOffset + cosA * lyOffset;

        // More balanced volumetric beam effect
        const hGlow = ctx.createRadialGradient(lx, ly, 2, lx + cosA * (beamLen * 0.45), ly + sinA * (beamLen * 0.45), beamLen);
        const intensity = isHighBeam ? 0.65 : 0.42;
        hGlow.addColorStop(0, `rgba(255, 255, ${isHighBeam ? '255' : '210'}, ${intensity})`);
        hGlow.addColorStop(0.4, `rgba(255, 255, 180, ${intensity * 0.4})`);
        hGlow.addColorStop(0.75, `rgba(255, 255, 140, ${intensity * 0.08})`);
        hGlow.addColorStop(1, 'rgba(255, 255, 140, 0)');

        ctx.fillStyle = hGlow;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        const endLX = lx + cosA * beamLen;
        const endLY = ly + sinA * beamLen;
        ctx.lineTo(endLX - sinA * beamSpread, endLY + cosA * beamSpread);
        ctx.arc(lx, ly, beamLen, Math.atan2(sinA * beamLen + cosA * beamSpread, cosA * beamLen - sinA * beamSpread), Math.atan2(sinA * beamLen - cosA * beamSpread, cosA * beamLen + sinA * beamSpread), true);
        ctx.lineTo(lx, ly);
        ctx.closePath();
        ctx.fill();
        
        // Lens Flare / Source Glow (Very compact source)
        const flareSize = isHighBeam ? 6 : 4;
        const flare = ctx.createRadialGradient(lx, ly, 0, lx, ly, flareSize);
        flare.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        flare.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = flare;
        ctx.beginPath(); ctx.arc(lx, ly, flareSize, 0, Math.PI * 2); ctx.fill();
      };

      drawHeadlightAdd(leftLampLX, leftLampLY, dmg.leftHeadlightBroken);
      drawHeadlightAdd(rightLampLX, rightLampLY, dmg.rightHeadlightBroken);

      const rc = Math.min(12, dmg.rearCrumple || 0);
      const rld = Math.min(8, dmg.rearLeftDent || 0);
      const rrd = Math.min(8, dmg.rearRightDent || 0);

      const rearLeftLX = -halfL + rc * 0.85 + rld * 0.4 + 2.5;
      const rearLeftLY = -halfW + 3.2 + ld * 0.15;
      const rearRightLX = -halfL + rc * 0.85 + rrd * 0.4 + 2.5;
      const rearRightLY = halfW - 3.2 - rd * 0.15;

      const isReversing = (car.speed < -0.5 && !car.isParked);
      const isBraking = car.brakeLightsOn && !isReversing;

      const drawRadialAdditive = (rxOffset: number, ryOffset: number, radius: number, color: string) => {
        const rx = car.x + cosA * rxOffset - sinA * ryOffset;
        const ry = car.y + sinA * rxOffset + cosA * ryOffset;
        const grad = ctx.createRadialGradient(0, 0, 0.5, 0, 0, radius);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.save(); ctx.translate(rx, ry); ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      };

      if (isReversing) {
        drawRadialAdditive(rearLeftLX, rearLeftLY, 12, 'rgba(255, 255, 255, 0.6)');
        drawRadialAdditive(rearRightLX, rearRightLY, 12, 'rgba(255, 255, 255, 0.6)');
      } else if (isBraking) {
        drawRadialAdditive(rearLeftLX, rearLeftLY, 22, 'rgba(255, 30, 30, 0.75)');
        drawRadialAdditive(rearRightLX, rearRightLY, 22, 'rgba(255, 30, 30, 0.75)');
      } else if (nightAlpha > 0.05) {
        // Dim taillights
        drawRadialAdditive(rearLeftLX, rearLeftLY, 8, 'rgba(200, 0, 0, 0.4)');
        drawRadialAdditive(rearRightLX, rearRightLY, 8, 'rgba(200, 0, 0, 0.4)');
      }

      if (car.turnSignal !== 'none') {
        const isBlinkOn = Math.floor(car.turnSignalTimer * 4) % 2 === 0;
        if (isBlinkOn) {
          const isLeft = car.turnSignal === 'left' || car.turnSignal === 'hazard';
          const isRight = car.turnSignal === 'right' || car.turnSignal === 'hazard';
          const amberColor = 'rgba(255, 160, 0, 0.7)';

          if (isLeft) {
            drawRadialAdditive(leftLampLX, leftLampLY - 1.5, 10, amberColor);
            drawRadialAdditive(rearLeftLX, rearLeftLY - 1.5, 10, amberColor);
          }
          if (isRight) {
            drawRadialAdditive(rightLampLX, rightLampLY + 1.5, 10, amberColor);
            drawRadialAdditive(rearRightLX, rearRightLY + 1.5, 10, amberColor);
          }
        }
      }
    }

    // C. Traffic Lights Glowing Lenses (Additive)
    for (const prop of props) {
      if (prop.type !== 'traffic_light' || prop.isBroken) continue;
      if (prop.x < minX - 100 || prop.x > maxX + 100 || prop.y < minY - 100 || prop.y > maxY + 100) continue;

      const inter = world.intersections.find((i) => i.id === prop.intersectionId);
      if (!inter) continue;

      const phase = inter.phases[inter.currentPhaseIndex];
      let lightColor = '';
      if (prop.direction === 'north' || prop.direction === 'south') {
        lightColor = phase.nsState === 'green' ? 'rgba(34, 197, 94, 0.95)' : phase.nsState === 'yellow' ? 'rgba(234, 179, 8, 0.95)' : 'rgba(239, 68, 68, 0.95)';
      } else {
        lightColor = phase.ewState === 'green' ? 'rgba(34, 197, 94, 0.95)' : phase.ewState === 'yellow' ? 'rgba(234, 179, 8, 0.95)' : 'rgba(239, 68, 68, 0.95)';
      }

      const cosFA = Math.cos(prop.angle);
      const sinFA = Math.sin(prop.angle);
      const signalX = prop.x + cosFA * 8.5;
      const signalY = prop.y + sinFA * 8.5;

      const sigGlow = ctx.createRadialGradient(signalX, signalY, 1, signalX, signalY, 35);
      sigGlow.addColorStop(0, lightColor);
      sigGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = sigGlow;
      ctx.beginPath();
      ctx.arc(signalX, signalY, 35, 0, Math.PI * 2);
      ctx.fill();
    }

    // D. Police Siren Beams
    for (const car of nearbyVehicles) {
      if (car.sirenOn) {
        const strobe = (car.sirenStrobe || 0);
        const redAngle = car.angle + Math.sin(strobe) * 1.2;
        const blueAngle = car.angle - Math.sin(strobe) * 1.2;

        const rGlow = ctx.createRadialGradient(car.x, car.y, 4, car.x + Math.cos(redAngle) * 140, car.y + Math.sin(redAngle) * 140, 140);
        rGlow.addColorStop(0, 'rgba(255, 50, 50, 0.9)');
        rGlow.addColorStop(1, 'rgba(255, 50, 50, 0)');
        ctx.fillStyle = rGlow;
        ctx.beginPath();
        ctx.arc(car.x, car.y, 140, redAngle - 0.6, redAngle + 0.6);
        ctx.lineTo(car.x, car.y);
        ctx.fill();

        const bGlow = ctx.createRadialGradient(car.x, car.y, 4, car.x + Math.cos(blueAngle) * 140, car.y + Math.sin(blueAngle) * 140, 140);
        bGlow.addColorStop(0, 'rgba(50, 100, 255, 0.9)');
        bGlow.addColorStop(1, 'rgba(50, 100, 255, 0)');
        ctx.fillStyle = bGlow;
        ctx.beginPath();
        ctx.arc(car.x, car.y, 140, blueAngle - 0.6, blueAngle + 0.6);
        ctx.lineTo(car.x, car.y);
        ctx.fill();
      }
    }

    // 3. Weather Rain Streaks & Lightning
    ctx.globalCompositeOperation = 'source-over';
    if (isRaining && weatherTransition > 0.05) {
      ctx.strokeStyle = `rgba(191, 219, 254, ${0.45 * weatherTransition})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const numDrops = world.weather === 'storm' ? Math.round(140 * weatherTransition) : Math.round(80 * weatherTransition);
      for (let r = 0; r < numDrops; r++) {
        const rx = minX + Math.random() * (maxX - minX);
        const ry = minY + Math.random() * (maxY - minY);
        const len = 14 + Math.random() * 10;
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - len * 0.3, ry + len);
      }
      ctx.stroke();
    }

    if ((world.lightningFlashTimer ?? 0) > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
    }

    ctx.restore();
  }

  // --- AI TELEMETRY & DEBUG VISUALIZER ---
  private renderAIDebugOverlay(world: GameWorld, visibleVehicles: Vehicle[]) {
    const ctx = this.ctx;

    // 1. Draw all road lanes & waypoint connection curves
    ctx.lineWidth = 1.5;
    for (const road of world.roads) {
      for (const lane of road.lanePaths) {
        if (lane.waypoints.length >= 2) {
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
          ctx.beginPath();
          ctx.moveTo(lane.waypoints[0].x, lane.waypoints[0].y);
          for (let i = 1; i < lane.waypoints.length; i++) {
            ctx.lineTo(lane.waypoints[i].x, lane.waypoints[i].y);
          }
          ctx.stroke();
        }

        // Connections
        if (lane.connections) {
          for (const conn of lane.connections) {
            ctx.strokeStyle = conn.turnType === 'turnaround' ? 'rgba(236, 72, 153, 0.5)' : 'rgba(34, 197, 94, 0.4)';
            ctx.beginPath();
            ctx.moveTo(conn.pathWaypoints[0].x, conn.pathWaypoints[0].y);
            for (let i = 1; i < conn.pathWaypoints.length; i++) {
              ctx.lineTo(conn.pathWaypoints[i].x, conn.pathWaypoints[i].y);
            }
            ctx.stroke();
          }
        }
      }
    }

    // 2. Draw vehicle AI states, target vectors, and collision bubbles
    for (const v of visibleVehicles) {
      if (v.isPlayerControlled) continue;

      // Draw route waypoints
      if (v.routeWaypoints && v.routeWaypoints.length > 0) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        for (let wi = v.targetWaypointIndex; wi < v.routeWaypoints.length; wi++) {
          ctx.lineTo(v.routeWaypoints[wi].x, v.routeWaypoints[wi].y);
        }
        ctx.stroke();

        // Target waypoint point
        const twp = v.routeWaypoints[v.targetWaypointIndex];
        if (twp) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(twp.x, twp.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Safety bubble
      ctx.strokeStyle = v.aiState === 'stopping_obstacle' ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(v.x, v.y, (v.length + 20) * 0.5, 0, Math.PI * 2);
      ctx.stroke();

      // State label pill
      ctx.save();
      ctx.translate(v.x, v.y - v.length * 0.6 - 12);
      const stateColors: Record<string, string> = {
        driving: '#10b981',
        stopping_light: '#ef4444',
        yielding: '#f59e0b',
        in_intersection: '#8b5cf6',
        stopping_obstacle: '#f97316',
        reversing: '#ec4899',
        waiting: '#64748b'
      };
      const pillColor = stateColors[v.aiState] || '#64748b';
      const labelText = `#${v.id.slice(-3)} ${v.aiState.toUpperCase()} (${Math.round(v.speed * 0.36)}km/h)`;
      ctx.font = 'bold 9px monospace';
      const textW = ctx.measureText(labelText).width;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(-textW / 2 - 4, -7, textW + 8, 14);
      ctx.strokeStyle = pillColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(-textW / 2 - 4, -7, textW + 8, 14);

      ctx.fillStyle = pillColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, 0, 0);
      ctx.restore();
    }
  }
}
