import { 
  Bird,
  Building, 
  Camera, 
  GameWorld, 
  Pedestrian, 
  Player, 
  Puddle,
  SidewalkBlock,
  StreetProp, 
  TimeOfDay, 
  Tree,
  Vehicle 
} from './types';
import { trafficDiagnostics } from './aiTraffic';

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
};

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = window.innerWidth;
  private height: number = window.innerHeight;
  private cloudShadows: {x: number, y: number, size: number}[] = [];

  // Offscreen buffer for the Lightmap (prevents punching holes in the world)
  private lightmapCanvas: HTMLCanvasElement;
  private lightmapCtx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.lightmapCanvas = document.createElement('canvas');
    this.lightmapCtx = this.lightmapCanvas.getContext('2d')!;
    this.resize(this.width, this.height);
    
    for(let i=0; i<15; i++) {
      this.cloudShadows.push({x: Math.random() * 8000, y: Math.random() * 8000, size: 100 + Math.random() * 200});
    }
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
    visiblePedestrians: Pedestrian[],
    visibleTrees?: Tree[],
    visibleProps?: StreetProp[],
    visibleSidewalks?: SidewalkBlock[]
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

    // Calculate continuous nightAlpha from timeHour with smooth transitions
    let nightAlpha = 0;
    if (timeHour >= 8 && timeHour < 17) {
      nightAlpha = 0;
    } else if (timeHour >= 17 && timeHour < 21) {
      // Smooth sunset transition (17:00-21:00)
      nightAlpha = ((timeHour - 17) / 4) * 0.82;
    } else if (timeHour >= 21 || timeHour < 4) {
      // Night (21:00-04:00)
      nightAlpha = 0.82;
    } else if (timeHour >= 4 && timeHour < 8) {
      // Smooth sunrise transition (04:00-08:00)
      nightAlpha = (1 - ((timeHour - 4) / 4)) * 0.82;
    }
    
    const vpProps = visibleProps || world.props.filter(p => p.x >= minX - 120 && p.x <= maxX + 120 && p.y >= minY - 120 && p.y <= maxY + 120);
    const vpTrees = visibleTrees || world.trees.filter(t => t.x >= minX - 120 && t.x <= maxX + 120 && t.y >= minY - 120 && t.y <= maxY + 120);
    const vpSidewalks = visibleSidewalks || world.sidewalks || [];

    // 3. Ground / Grass / Terrain Base
    this.renderGround(world, minX, minY, maxX, maxY);

    // 3a. Cloud Shadows (Atmosphere)
    this.renderCloudShadows(minX, minY, maxX, maxY);

    // 3b. Paved Sidewalk Walkways, Curbs & Block Courtyards
    this.renderSidewalks(vpSidewalks, minX, minY, maxX, maxY);

    // 4. Roads, Intersections, Crosswalks & Markings
    this.renderRoadsAndMarkings(world, minX, minY, maxX, maxY);

    // 4b. Post-Soviet Atmosphere & Cyrillic Signage
    this.renderPostSovietAtmosphereAndSignage(world, minX, minY, maxX, maxY);

    // 5. Puddles (Road wet spots)
    this.renderPuddles(world.puddles, minX, minY, maxX, maxY);

    // 6. Skid Marks
    this.renderSkidMarks(world.skidMarks, minX, minY, maxX, maxY);

    // 7. Parking lots
    this.renderParkings(world, minX, minY, maxX, maxY);

    // 8. Buildings Base Structure & Entrances
    this.renderBuildingBases(visibleBuildings);

    // 8b. Street Litter & Flying Paper / Wind Debris
    this.renderLitter(world.litter, minX, minY, maxX, maxY, nightAlpha);

    // 9. Ground-level Props (Benches, Hydrants, Kiosks, Cones, Trash Cans, Mailboxes, and BROKEN lampposts!)
    this.renderGroundProps(vpProps, minX, minY, maxX, maxY);

    // 9b. Broken Traffic Lights (lying flat on the ground!)
    this.renderTrafficLights(world.intersections, vpProps.filter((p) => p.isBroken), minX, minY, maxX, maxY);

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
      vpProps, 
      minX, minY, maxX, maxY
    );

    const isRaining = world.weather === 'rain' || world.weather === 'storm';
    const isFog = world.weather === 'fog';
    const effectiveAlpha = Math.max(nightAlpha, isRaining ? 0.35 * weatherTransition : 0, isFog ? 0.45 * weatherTransition : 0);

    // 15b. Render Vehicle Cabins, Roofs, and Roof attachments (drawn ON TOP of lightmap to avoid headlight bleed)
    this.renderVehicleCabins(visibleVehicles, effectiveAlpha);

    // 16. Building Roofs, Canopies, Balconies & Fire Escapes
    this.renderBuildingRoofsAndCanopies(visibleBuildings, nightAlpha);

    // 16b. Tall Intact Props (Intact trees, and intact lampposts!)
    this.renderTreesAndTallProps(vpTrees, vpProps, minX, minY, maxX, maxY, nightAlpha);

    // 16c. Intact Traffic Light Posts
    this.renderTrafficLights(world.intersections, vpProps.filter((p) => !p.isBroken), minX, minY, maxX, maxY, nightAlpha);

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

        // Detailed realistic dirt road texturing (center packed track & tire ruts)
        if (road.isDirt) {
          ctx.fillStyle = '#854d0e';
          ctx.fillRect(road.x1, road.y1 - 6, road.x2 - road.x1, 12);
          ctx.strokeStyle = 'rgba(45, 15, 5, 0.45)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(road.x1, road.y1 - road.width / 4);
          ctx.lineTo(road.x2, road.y1 - road.width / 4);
          ctx.moveTo(road.x1, road.y1 + road.width / 4);
          ctx.lineTo(road.x2, road.y1 + road.width / 4);
          ctx.stroke();
        }
      } else {
        const left = road.x1 - road.width / 2;
        if (left + road.width < minX || left > maxX || road.y2 < minY || road.y1 > maxY) continue;
        ctx.fillRect(left, road.y1, road.width, road.y2 - road.y1);

        // Detailed realistic dirt road texturing (vertical)
        if (road.isDirt) {
          ctx.fillStyle = '#854d0e';
          ctx.fillRect(road.x1 - 6, road.y1, 12, road.y2 - road.y1);
          ctx.strokeStyle = 'rgba(45, 15, 5, 0.45)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(road.x1 - road.width / 4, road.y1);
          ctx.lineTo(road.x1 - road.width / 4, road.y2);
          ctx.moveTo(road.x1 + road.width / 4, road.y1);
          ctx.lineTo(road.x1 + road.width / 4, road.y2);
          ctx.stroke();
        }
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

    // Road Markings (Clean standard road paint: double yellow lines, dashed lane dividers, edge lines)
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

      if (!inter.isDirt) {
        // Crosswalks (Zebras) on paved roads
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

        // Stop Lines (Solid White) on paved roads
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
  }

  // --- POST-SOVIET ATMOSPHERE & CYRILLIC SIGNAGE ---
  private renderPostSovietAtmosphereAndSignage(world: GameWorld, minX: number, minY: number, maxX: number, maxY: number) {
    const ctx = this.ctx;
    ctx.save();

    // 1. Upright 3D Standing Street Signposts at Intersections (Visible from Top-Down View)
    for (const inter of world.intersections) {
      if (inter.x < minX - 250 || inter.x > maxX + 250 || inter.y < minY - 250 || inter.y > maxY + 250) continue;

      let hName = 'ул. Советская';
      let vName = 'пр. Ленина';
      for (const road of world.roads) {
        if (road.direction === 'horizontal' && Math.abs(inter.y - road.y1) < 100) {
          hName = road.name === 'Grand Boulevard' ? 'пр. Ленина' : (road.name === 'Central Avenue' ? 'ул. Гагарина' : road.name);
        }
        if (road.direction === 'vertical' && Math.abs(inter.x - road.x1) < 100) {
          vName = road.name === 'Silicon Highway' ? 'шоссе Энтузиастов' : (road.name === 'Metro Avenue' ? 'ул. Строителей' : road.name);
        }
      }

      const signX = inter.x + inter.width / 2 + 16;
      const signY = inter.y - inter.height / 2 - 16;

      // Base shadow on sidewalk
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(signX, signY + 6, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Vertical metal pole (3D upright pillar)
      ctx.fillStyle = '#334155';
      ctx.fillRect(signX - 2, signY - 24, 4, 30);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(signX - 1, signY - 24, 2, 30);

      // Blue enamel sign board box (Elevated 3D sign)
      ctx.fillStyle = '#1d4ed8'; // Post-Soviet blue enamel
      ctx.fillRect(signX - 32, signY - 38, 64, 20);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(signX - 32, signY - 38, 64, 20);

      // Inner white text line 1 (Horizontal street)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hName.slice(0, 14), signX, signY - 31);

      // Inner light blue text line 2 (Vertical street)
      ctx.fillStyle = '#bfdbfe';
      ctx.font = '8px sans-serif';
      ctx.fillText(vName.slice(0, 14), signX, signY - 21);
    }

    // 2. Highly Distinctive Shop Storefronts & Banners (ПРОДУКТЫ 24, УНИВЕРМАГ, АПТЕКА)
    for (const bld of world.buildings) {
      if (bld.x < minX - 120 || bld.x > maxX + 120 || bld.y < minY - 120 || bld.y > maxY + 120) continue;

      const cx = bld.x + bld.width / 2;
      const cy = bld.y + bld.height / 2;

      if (bld.type === 'shop') {
        // Red backlit storefront awning & bright banner
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(cx - 32, bld.y - 12, 64, 18);

        ctx.fillStyle = '#dc2626'; // Vibrant red retail sign
        ctx.fillRect(cx - 30, bld.y - 10, 60, 16);
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 30, bld.y - 10, 60, 16);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ПРОДУКТЫ 24', cx, bld.y - 2);
      } else if (bld.type === 'commercial' || bld.type === 'office') {
        // Universal store / Pharmacy banner
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(cx - 36, bld.y - 10, 72, 16);
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(cx - 36, bld.y - 10, 72, 16);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('УНИВЕРМАГ • АПТЕКА', cx, bld.y - 2);
      } else if (bld.type === 'industrial') {
        // Industrial warehouse / garage cooperative sign
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(cx - 40, bld.y + 6, 80, 16);
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(cx - 40, bld.y + 6, 80, 16);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ГСК «МОТОР» / СКЛАД', cx, bld.y + 14);
      }
    }

    ctx.restore();
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

  // --- PAVED SIDEWALKS, CURB STONES & BLOCK COURTYARDS ---
  private renderSidewalks(
    sidewalks: SidewalkBlock[],
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) {
    const ctx = this.ctx;

    for (const sw of sidewalks) {
      if (sw.x + sw.width < minX || sw.x > maxX || sw.y + sw.height < minY || sw.y > maxY) {
        continue;
      }

      // 1. Concrete Paving Slab Base
      let paveColor = '#64748b'; // standard urban concrete
      let curbHighlight = '#94a3b8';
      let curbDark = '#334155';

      if (sw.style === 'commercial') {
        paveColor = '#94a3b8';
        curbHighlight = '#cbd5e1';
        curbDark = '#475569';
      } else if (sw.style === 'village') {
        paveColor = '#78716c'; // warm stone pavement
        curbHighlight = '#a8a29e';
        curbDark = '#44403c';
      } else if (sw.style === 'park') {
        paveColor = '#6b7280';
        curbHighlight = '#9ca3af';
        curbDark = '#374151';
      }

      // Outer sidewalk footprint
      ctx.fillStyle = paveColor;
      ctx.fillRect(sw.x, sw.y, sw.width, sw.height);

      // 2. Concrete slab expansion joint lines (tile grid texture on walkway)
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.20)';
      ctx.lineWidth = 1;
      const tileStep = 32;

      ctx.beginPath();
      // Top & bottom horizontal sidewalk corridors
      for (let tx = sw.x; tx <= sw.x + sw.width; tx += tileStep) {
        ctx.moveTo(tx, sw.y);
        ctx.lineTo(tx, sw.y + sw.sidewalkWidth);
        ctx.moveTo(tx, sw.y + sw.height - sw.sidewalkWidth);
        ctx.lineTo(tx, sw.y + sw.height);
      }
      // Left & right vertical sidewalk corridors
      for (let ty = sw.y; ty <= sw.y + sw.height; ty += tileStep) {
        ctx.moveTo(sw.x, ty);
        ctx.lineTo(sw.x + sw.sidewalkWidth, ty);
        ctx.moveTo(sw.x + sw.width - sw.sidewalkWidth, ty);
        ctx.lineTo(sw.x + sw.width, ty);
      }
      ctx.stroke();

      // 3. Raised Curb Outer Bevel
      ctx.strokeStyle = curbHighlight;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(sw.x + 1, sw.y + 1, sw.width - 2, sw.height - 2);

      ctx.strokeStyle = curbDark;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sw.x, sw.y, sw.width, sw.height);

      // 4. Inner Lawn / Courtyard Garden (inside the sidewalk corridor)
      const innerX = sw.x + sw.sidewalkWidth;
      const innerY = sw.y + sw.sidewalkWidth;
      const innerW = sw.width - sw.sidewalkWidth * 2;
      const innerH = sw.height - sw.sidewalkWidth * 2;

      if (innerW > 0 && innerH > 0) {
        // Inner grass lawn
        ctx.fillStyle = sw.innerLawnColor || '#15803d';
        ctx.fillRect(innerX, innerY, innerW, innerH);

        // Lawn edging curb stone
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(innerX, innerY, innerW, innerH);
      }

      // 4b. Draw Driveway Courtyard Entrances / Exits
      if (sw.driveways) {
        for (const dw of sw.driveways) {
          ctx.save();
          ctx.fillStyle = '#475569'; // dark slate asphalt/concrete for driveway ramp
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1.5;

          let rx = 0;
          let ry = 0;
          let rw = 0;
          let rh = 0;

          if (dw.side === 'north') {
            rx = sw.x + dw.offset;
            ry = sw.y;
            rw = dw.width;
            rh = sw.sidewalkWidth + 10;
          } else if (dw.side === 'south') {
            rx = sw.x + dw.offset;
            ry = sw.y + sw.height - sw.sidewalkWidth - 10;
            rw = dw.width;
            rh = sw.sidewalkWidth + 10;
          } else if (dw.side === 'west') {
            rx = sw.x;
            ry = sw.y + dw.offset;
            rw = sw.sidewalkWidth + 10;
            rh = dw.width;
          } else if (dw.side === 'east') {
            rx = sw.x + sw.width - sw.sidewalkWidth - 10;
            ry = sw.y + dw.offset;
            rw = sw.sidewalkWidth + 10;
            rh = dw.width;
          }

          // Draw driveway asphalt ramp
          ctx.fillRect(rx, ry, rw, rh);

          // Draw subtle tire tread skidmarks on the driveway for added realism
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          if (dw.side === 'north' || dw.side === 'south') {
            // Draw 2 vertical tire track lines
            ctx.moveTo(rx + 8, ry);
            ctx.lineTo(rx + 8, ry + rh);
            ctx.moveTo(rx + rw - 8, ry);
            ctx.lineTo(rx + rw - 8, ry + rh);
          } else {
            // Draw 2 horizontal tire track lines
            ctx.moveTo(rx, ry + 8);
            ctx.lineTo(rx + rw, ry + 8);
            ctx.moveTo(rx, ry + rh - 8);
            ctx.lineTo(rx + rw, ry + rh - 8);
          }
          ctx.stroke();

          // Draw yellow dashed warning lines at the entry curb
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          if (dw.side === 'north') {
            ctx.moveTo(rx, ry);
            ctx.lineTo(rx + rw, ry);
          } else if (dw.side === 'south') {
            ctx.moveTo(rx, ry + rh);
            ctx.lineTo(rx + rw, ry + rh);
          } else if (dw.side === 'west') {
            ctx.moveTo(rx, ry);
            ctx.lineTo(rx, ry + rh);
          } else if (dw.side === 'east') {
            ctx.moveTo(rx + rw, ry);
            ctx.lineTo(rx + rw, ry + rh);
          }
          ctx.stroke();
          ctx.restore();
        }
      }

      // 5. Tactile Safety Paving (Yellow ribbed pads at sidewalk corners facing crosswalks)
      ctx.fillStyle = '#f59e0b';
      const padSize = 14;
      // Top-Left corner pads
      ctx.fillRect(sw.x + 4, sw.y + 4, padSize, padSize);
      // Top-Right corner pads
      ctx.fillRect(sw.x + sw.width - padSize - 4, sw.y + 4, padSize, padSize);
      // Bottom-Left corner pads
      ctx.fillRect(sw.x + 4, sw.y + sw.height - padSize - 4, padSize, padSize);
      // Bottom-Right corner pads
      ctx.fillRect(sw.x + sw.width - padSize - 4, sw.y + sw.height - padSize - 4, padSize, padSize);
    }
  }

  // --- PARKING LOTS ---
  private renderParkings(world: GameWorld, minX: number, minY: number, maxX: number, maxY: number) {
    const ctx = this.ctx;
    for (const pk of world.parkings) {
      if (pk.x + pk.width < minX || pk.x > maxX || pk.y + pk.height < minY || pk.y > maxY) continue;

      // 1. Asphalt Surface with Curb Trim
      ctx.fillStyle = '#1e293b'; // deep clean dark asphalt
      ctx.fillRect(pk.x, pk.y, pk.width, pk.height);

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.strokeRect(pk.x, pk.y, pk.width, pk.height);

      // Draw driveway connecting asphalt paths for courtyard parking lots
      if (pk.id.startsWith('court_parking_')) {
        const parts = pk.id.split('_');
        const bx = parseInt(parts[2]);
        const by = parseInt(parts[3]);
        const sw = world.sidewalks.find(s => s.id === `sidewalk_${bx}_${by}`);
        if (sw && sw.driveways) {
          ctx.fillStyle = '#1e293b'; // match the parking lot asphalt color perfectly
          for (const dw of sw.driveways) {
            if (dw.side === 'south') {
              const rx = sw.x + dw.offset;
              const ry = sw.y + sw.height - sw.sidewalkWidth - 10;
              const rw = dw.width;
              // Draw a connecting asphalt road from the south driveway to the bottom of the parking lot
              const roadY = pk.y + pk.height;
              const roadH = ry - roadY + 2;
              if (roadH > 0) {
                ctx.fillRect(rx, roadY, rw, roadH);
                // Subtle road edges/curbs
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(rx, roadY);
                ctx.lineTo(rx, ry);
                ctx.moveTo(rx + rw, roadY);
                ctx.lineTo(rx + rw, ry);
                ctx.stroke();
              }
            } else if (dw.side === 'east') {
              const rx = sw.x + sw.width - sw.sidewalkWidth - 10;
              const ry = sw.y + dw.offset;
              const rh = dw.width;
              // Draw a connecting asphalt road from the east driveway to the right edge of the parking lot
              const roadX = pk.x + pk.width;
              const roadW = rx - roadX + 2;
              if (roadW > 0) {
                ctx.fillRect(roadX, ry, roadW, rh);
                // Subtle road edges/curbs
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(roadX, ry);
                ctx.lineTo(rx, ry);
                ctx.moveTo(roadX, ry + rh);
                ctx.lineTo(rx, ry + rh);
                ctx.stroke();
              }
            }
          }
        }
      }

      // 2. Central Driving Lane Direction Arrows
      ctx.fillStyle = '#64748b';
      const arrowCenterX = pk.x + pk.width / 2;
      for (let ay = pk.y + 40; ay < pk.y + pk.height - 40; ay += 90) {
        ctx.beginPath();
        ctx.moveTo(arrowCenterX, ay - 12);
        ctx.lineTo(arrowCenterX - 7, ay + 6);
        ctx.lineTo(arrowCenterX - 3, ay + 6);
        ctx.lineTo(arrowCenterX - 3, ay + 14);
        ctx.lineTo(arrowCenterX + 3, ay + 14);
        ctx.lineTo(arrowCenterX + 3, ay + 6);
        ctx.lineTo(arrowCenterX + 7, ay + 6);
        ctx.closePath();
        ctx.fill();
      }

      // 3. Parking Bays with Crisp White Stall Lines and Wheel Stops
      for (let idx = 0; idx < pk.spots.length; idx++) {
        const spot = pk.spots[idx];
        const isHandicap = idx === 0 || idx === 1;

        // Stall line box
        ctx.strokeStyle = isHandicap ? '#38bdf8' : '#f8fafc';
        ctx.lineWidth = 2;
        ctx.strokeRect(spot.x - 16, spot.y - 20, 32, 40);

        // Concrete Wheel Stop (Parking curb bumper)
        ctx.fillStyle = '#94a3b8';
        const bumperX = spot.angle === 0 ? spot.x - 12 : spot.x + 6;
        ctx.fillRect(bumperX, spot.y - 12, 6, 24);

        // Handicap Accessible Icon
        if (isHandicap) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.fillRect(spot.x - 14, spot.y - 18, 28, 36);

          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(spot.x, spot.y - 5, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(spot.x - 1.5, spot.y - 1, 3, 8);
          ctx.fillRect(spot.x - 1.5, spot.y + 4, 6, 3);
        }
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
  private renderLitter(litter: GameWorld['litter'], minX: number, minY: number, maxX: number, maxY: number, nightAlpha: number = 0) {
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
      } else if (lit.type === 'box') {
        ctx.fillStyle = lit.color || '#d97706';
        ctx.fillRect(-lit.size / 2, -lit.size / 2, lit.size, lit.size);
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1;
        ctx.strokeRect(-lit.size / 2, -lit.size / 2, lit.size, lit.size);
      } else if (lit.type === 'bag') {
        ctx.fillStyle = lit.color || '#e11d48';
        ctx.fillRect(-lit.size / 2, -lit.size * 0.6, lit.size, lit.size * 1.2);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-lit.size / 2, -lit.size * 0.6, lit.size, lit.size * 1.2);
      } else if (lit.type === 'coffee') {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(0, 0, lit.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#78350f'; // Coffee lid
        ctx.beginPath();
        ctx.arc(0, 0, lit.size / 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (lit.type === 'phone') {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-lit.size / 2, -lit.size * 0.8, lit.size, lit.size * 1.6);
        // Screen
        ctx.fillStyle = lit.isGlowing ? '#38bdf8' : '#0f172a';
        ctx.fillRect(-lit.size / 2 + 0.5, -lit.size * 0.8 + 0.5, lit.size - 1, lit.size * 1.6 - 1);
        
        // Add a glow effect for the phone screen
        if (lit.isGlowing && nightAlpha > 0.3) {
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 15;
          ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.fillRect(-lit.size / 2, -lit.size * 0.8, lit.size, lit.size * 1.6);
          ctx.shadowBlur = 0; // Reset
        }
      } else if (lit.type === 'bottle') {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-lit.size / 3, -lit.size / 2, lit.size / 1.5, lit.size);
        ctx.fillStyle = '#64748b'; // Cap
        ctx.fillRect(-lit.size / 4, -lit.size / 2 - 1, lit.size / 2, 2);
      } else if (lit.type === 'wrapper') {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(-lit.size / 2, -lit.size / 2);
        ctx.lineTo(lit.size / 2, -lit.size / 4);
        ctx.lineTo(lit.size / 4, lit.size / 2);
        ctx.lineTo(-lit.size / 4, lit.size / 2);
        ctx.fill();
      } else if (lit.type === 'mask') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(-lit.size / 2, -lit.size / 4, lit.size, lit.size / 2);
        ctx.strokeStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(-lit.size / 2, 0, lit.size / 3, Math.PI / 2, -Math.PI / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(lit.size / 2, 0, lit.size / 3, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      } else if (lit.type === 'butt') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(-lit.size / 2, -lit.size / 8, lit.size, lit.size / 4);
        ctx.fillStyle = '#d6d3d1'; // Filter
        ctx.fillRect(-lit.size / 2, -lit.size / 8, lit.size / 4, lit.size / 4);
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
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(-10, -4, 20, 9);

        // Cast Iron frame ends & ornate armrests
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-10, -6, 3, 12);
        ctx.fillRect(7, -6, 3, 12);

        // Wood slats with rich polished teak/mahogany grain color
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-8, -5, 16, 2.2);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(-8, -2, 16, 2.2);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(-8, 1, 16, 2.2);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(-8, 4, 16, 1.8);

        // Iron connecting bolts
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-8.5, -4.5, 1, 1);
        ctx.fillRect(7.5, -4.5, 1, 1);
        ctx.fillRect(-8.5, 3.5, 1, 1);
        ctx.fillRect(7.5, 3.5, 1, 1);

      } else if (prop.type === 'dumpster') {
        // Large Municipal Waste Container (Контейнер ТБО / Мусорный бак)
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(-15, -11, 30, 22);

        // 4 Caster Wheels
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-14, -10, 3, 3);
        ctx.fillRect(11, -10, 3, 3);
        ctx.fillRect(-14, 7, 3, 3);
        ctx.fillRect(11, 7, 3, 3);

        // Main Container Body (Galvanized / Dark Green Metal)
        ctx.fillStyle = '#15803d'; // Municipal emerald green
        ctx.fillRect(-13, -9, 26, 18);
        ctx.strokeStyle = '#166534';
        ctx.lineWidth = 1;
        ctx.strokeRect(-13, -9, 26, 18);

        // Side Lifting Pocket Bars (for garbage truck forks)
        ctx.fillStyle = '#334155';
        ctx.fillRect(-14, -3, 2, 6);
        ctx.fillRect(12, -3, 2, 6);

        // Split Plastic Lids (Top and Bottom hinged)
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-12, -8, 24, 7.5);
        ctx.fillRect(-12, 0.5, 24, 7.5);

        // Lid Handles
        ctx.fillStyle = '#64748b';
        ctx.fillRect(-4, -6.5, 8, 1.5);
        ctx.fillRect(-4, 2, 8, 1.5);

        // Yellow Warning Hazard Triangle
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.lineTo(-2.5, 2);
        ctx.lineTo(2.5, 2);
        ctx.closePath();
        ctx.fill();

      } else if (prop.type === 'flowerbed') {
        // Decorative Urban Flowerbed (Клумба с цветами)
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(-13, -9, 26, 18);

        // Stone / Concrete Curb Border
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-12, -8, 24, 16);
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeRect(-12, -8, 24, 16);

        // Fertile Dark Soil
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(-10, -6, 20, 12);

        // Lush Green Foliage Bush
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(-5, -2, 4.5, 0, Math.PI * 2);
        ctx.arc(5, -2, 4.5, 0, Math.PI * 2);
        ctx.arc(0, 2, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(-2, -1, 3.5, 0, Math.PI * 2);
        ctx.arc(3, 1, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Colorful Blossom Dots (Tulips / Marigolds / Petunias)
        const flowerColors = ['#ef4444', '#f59e0b', '#ec4899', '#a855f7', '#ffffff', '#e11d48'];
        for (let fi = 0; fi < 8; fi++) {
          const fx = -7 + (fi % 4) * 4.5;
          const fy = -4 + Math.floor(fi / 4) * 6;
          ctx.fillStyle = flowerColors[fi % flowerColors.length];
          ctx.beginPath();
          ctx.arc(fx, fy, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }

      } else if (prop.type === 'bollard') {
        // Cast-Iron Sidewalk Safety Bollard (Столбик ограждения)
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.beginPath();
        ctx.arc(2, 2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Flanged base
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Cylindrical main post
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Reflective white top band
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Domed top cap
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, 0.9, 0, Math.PI * 2);
        ctx.fill();

      } else if (prop.type === 'manhole') {
        // Standalone Manhole Cover
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.moveTo(-4, 0); ctx.lineTo(4, 0);
        ctx.moveTo(0, -4); ctx.lineTo(0, 4);
        ctx.stroke();

      } else if (prop.type === 'drain_grate') {
        // Storm drain grate
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-6, -4, 12, 8);
        ctx.fillStyle = '#475569';
        for (let b = -4.5; b <= 4.5; b += 2.2) {
          ctx.fillRect(b, -4, 1.2, 8);
        }
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
      } else if (prop.type === 'tire_flowerbed') {
        // Post-Soviet Tire Flowerbed (Автомобильная клумба из покрышки)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(2, 2, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#64748b'; // Painted tire
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3e2723'; // Soil
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444'; // Red flowers
        ctx.beginPath();
        ctx.arc(-2, -2, 2, 0, Math.PI * 2);
        ctx.arc(2, 2, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (prop.type === 'playground_swing') {
        // Soviet Metal Playground Swings
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(-12, -4, 24, 8);

        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, -6); ctx.lineTo(-4, 10);
        ctx.moveTo(10, -6); ctx.lineTo(4, 10);
        ctx.moveTo(-12, -4); ctx.lineTo(12, -4);
        ctx.stroke();
      } else if (prop.type === 'garage_door') {
        // Garage Cooperative Metal Door
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(-12, -8, 24, 16);

        ctx.fillStyle = '#64748b';
        ctx.fillRect(-11, -7, 22, 14);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(-11, -7, 22, 14);

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-2, -1, 4, 3);
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
      let lightState: 'red' | 'yellow' | 'green' | 'red_yellow' | 'green_flashing' | 'off' = 'red';
      let pedSignal: 'walk' | 'wait' = 'wait';

      if (inter && phase && prop.direction) {
        if (inter.isSignalLost) {
          const isFlashOn = Math.floor(performance.now() / 500) % 2 === 0;
          lightState = isFlashOn ? 'yellow' : 'off';
          pedSignal = 'wait';
        } else {
          if (prop.direction === 'north' || prop.direction === 'south') {
            lightState = phase.nsState;
          } else {
            lightState = phase.ewState;
          }
          const cw = inter.crosswalks.find((c) => c.direction === prop.direction);
          pedSignal = cw?.pedestrianSignal || 'wait';
        }
      }

      const isRed = lightState === 'red' || lightState === 'red_yellow';
      const isYellow = lightState === 'yellow' || lightState === 'red_yellow';
      const isGreen = lightState === 'green' || (lightState === 'green_flashing' && Math.floor(Date.now() / 250) % 2 === 0);

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

        // Master Control Box (Broken)
        if (prop.isMasterLight) {
          ctx.save();
          // Positioned along the broken pole
          ctx.translate(8, 0);
          ctx.fillStyle = '#64748b';
          ctx.fillRect(-3, -4, 6, 8);
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1;
          ctx.strokeRect(-3, -4, 6, 8);
          
          // Dead LED
          ctx.fillStyle = '#1c1917';
          ctx.beginPath();
          ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

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

        // Master Control Box
        if (prop.isMasterLight) {
          ctx.save();
          ctx.rotate(facingAngle);
          
          // Draw a prominent silver/grey box attached to the back of the pole
          ctx.fillStyle = '#94a3b8'; 
          ctx.fillRect(-4.5, -6, 9, 6);
          
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-4.5, -6, 9, 6);
          
          // Draw a bright glowing LED indicator on it
          ctx.fillStyle = inter?.isSignalLost ? '#1c1917' : '#22c55e'; // Green if OK, dark if broken
          ctx.beginPath();
          ctx.arc(0, -3, 1.8, 0, Math.PI * 2);
          ctx.fill();
          
          // Glow effect for the green LED
          if (!inter?.isSignalLost) {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
            ctx.beginPath();
            ctx.arc(0, -3, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
          
          ctx.restore();
        }

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
        ctx.ellipse(b.x, b.y + b.altitude * 0.4, 1.4, 0.8, 0, 0, Math.PI * 2);
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
      ctx.ellipse(0, 0, 2.8, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = b.type === 'pigeon' ? '#475569' : '#78350f';
      ctx.beginPath();
      ctx.arc(2.2, 0, 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(3.4, -0.6);
      ctx.lineTo(4.6, 0);
      ctx.lineTo(3.4, 0.6);
      ctx.fill();

      // Wings
      const isWalking = b.state === 'ground' && (Math.abs(b.flyVX) > 0.5 || Math.abs(b.flyVY) > 0.5);
      if (b.state === 'flying' || isWalking) {
        const wingSpan = b.state === 'flying' ? 4.4 + Math.sin(b.wingCycle) * 2.6 : 3.0 + Math.sin(b.wingCycle) * 1.0;
        ctx.strokeStyle = b.type === 'pigeon' ? '#334155' : '#451a03';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, -wingSpan);
        ctx.lineTo(0, wingSpan);
        ctx.stroke();
      } else {
        // Folded wings
        ctx.strokeStyle = b.type === 'pigeon' ? '#334155' : '#451a03';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-1, -1.2);
        ctx.lineTo(1.5, -0.5);
        ctx.moveTo(-1, 1.2);
        ctx.lineTo(1.5, 0.5);
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

      // Head
      ctx.fillStyle = ped.skinColor;
      ctx.beginPath();
      ctx.arc(1.5, 0, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Hair
      if (ped.hairStyle !== 'bald' && !ped.hasHat) {
        ctx.fillStyle = ped.hairColor;
        ctx.beginPath();
        if (ped.hairStyle === 'short') {
          ctx.arc(0.4, 0, 3.0, Math.PI * 0.5, Math.PI * 1.5);
        } else if (ped.hairStyle === 'long') {
          ctx.arc(0, 0, 3.4, Math.PI * 0.4, Math.PI * 1.6);
          ctx.ellipse(-1.5, -2, 2.5, 1.5, -Math.PI / 6, 0, Math.PI * 2);
          ctx.ellipse(-1.5, 2, 2.5, 1.5, Math.PI / 6, 0, Math.PI * 2);
        } else if (ped.hairStyle === 'bun') {
          ctx.arc(0.4, 0, 3.0, Math.PI * 0.5, Math.PI * 1.5);
          ctx.arc(-2.5, 0, 1.8, 0, Math.PI * 2);
        } else if (ped.hairStyle === 'ponytail') {
          ctx.arc(0.4, 0, 3.0, Math.PI * 0.5, Math.PI * 1.5);
          ctx.ellipse(-3.5, 0, 3, 1, 0, 0, Math.PI * 2);
        } else if (ped.hairStyle === 'spiky') {
          ctx.moveTo(0.4, -3);
          ctx.lineTo(2, -4); ctx.lineTo(1, -2);
          ctx.lineTo(3, -1); ctx.lineTo(1.5, 0);
          ctx.lineTo(3, 1); ctx.lineTo(1, 2);
          ctx.lineTo(2, 4); ctx.lineTo(0.4, 3);
          ctx.arc(0.4, 0, 3.0, Math.PI * 0.5, Math.PI * 1.5);
        }
        ctx.fill();
      }

      // Hat
      if (ped.hasHat) {
        ctx.fillStyle = ped.hatColor || '#1e293b';
        ctx.beginPath();
        if (ped.hatType === 'cap') {
          ctx.arc(1, 0, 3.1, 0, Math.PI * 2);
          ctx.fillRect(3, -1.8, 2.5, 3.6); // Bill
        } else if (ped.hatType === 'beanie') {
          ctx.arc(0.8, 0, 3.3, 0, Math.PI * 2);
        } else if (ped.hatType === 'sunhat') {
          ctx.arc(1, 0, 5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.1)'; // Hat shadow/band
          ctx.arc(1, 0, 3, 0, Math.PI * 2);
        }
        ctx.fill();
      }

      // Handheld Prop (if not panicking or dropped)
      if (ped.handheldProp && !ped.hasDroppedProp && ped.state !== 'panicking') {
        const hSwing = ped.state === 'walking' || ped.state === 'crossing' ? Math.cos(ped.walkCycle) * 2.2 : 0;
        ctx.save();
        // Position on right arm with slight elevation and drop shadow
        ctx.translate(hSwing + 1.2, 3.8);
        
        // Prop Drop Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(-2, 1, 6, 4);

        if (ped.handheldProp === 'phone') {
          // 3D Phone Body
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-1.8, -2.5, 3.2, 4.6);
          ctx.fillStyle = '#334155';
          ctx.fillRect(-1.5, -2.2, 2.6, 4.0);
          // Glowing screen
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(-1.2, -1.9, 2.0, 3.4);
          // Screen UI lines
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-0.8, -1.5, 1.2, 0.6);
          ctx.fillRect(-0.8, -0.6, 1.2, 1.8);
        } else if (ped.handheldProp === 'coffee') {
          // 3D Coffee Cup
          ctx.fillStyle = '#475569'; // Cup shadow
          ctx.beginPath();
          ctx.arc(0.5, 0.5, 1.8, 0, Math.PI * 2);
          ctx.fill();
          // Cup base
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
          ctx.fill();
          // Kraft paper sleeve
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
          ctx.fill();
          // Plastic lid
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (ped.handheldProp === 'box') {
          // 3D Cardboard Box
          ctx.fillStyle = '#b45309';
          ctx.fillRect(-3, -3, 6, 6);
          // Top flap / tape
          ctx.fillStyle = '#d97706';
          ctx.fillRect(-2.5, -2.5, 5, 5);
          ctx.fillStyle = '#fef3c7'; // Packing tape strip down middle
          ctx.fillRect(-0.8, -2.5, 1.6, 5);
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(-3, -3, 6, 6);
        } else if (ped.handheldProp === 'bag') {
          // 3D Shopping Bag
          ctx.fillStyle = ped.propColor || '#e11d48';
          ctx.fillRect(-2.5, -2, 5, 6);
          // Bag gusset shading
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(-2.5, -2, 1.2, 6);
          // Looped handles
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(-1.8, -2);
          ctx.lineTo(-1.8, -4);
          ctx.lineTo(1.8, -4);
          ctx.lineTo(1.8, -2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Janitor Broom
      if (ped.hasBroom) {
        const hSwing = ped.state === 'walking' || ped.state === 'crossing' ? Math.cos(ped.walkCycle) * 2.2 : 0;
        ctx.save();
        ctx.translate(hSwing + 1, 3.5);
        ctx.rotate(-Math.PI / 4); // Hold diagonally
        
        // Handle
        ctx.fillStyle = '#78350f'; // Wood handle
        ctx.fillRect(-0.5, -8, 1, 12);
        
        // Broom head
        ctx.fillStyle = '#fde047'; // Yellowish bristles
        ctx.beginPath();
        ctx.moveTo(-2, 4);
        ctx.lineTo(2, 4);
        ctx.lineTo(3, 8);
        ctx.lineTo(-3, 8);
        ctx.fill();
        
        ctx.restore();
      }

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

    // Ground Directional Indicator Ring
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.rotate(player.angle);

    // Directional facing dot on ground
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(12, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Dodge Roll Motion Trail
    if (player.isDashing) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath();
      ctx.arc(-8, 0, 7, 0, Math.PI * 2);
      ctx.arc(-16, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(1.5, 2, 5.2, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();

    const legSwing = Math.sin(player.walkCycle) * 3.2;

    // Shoes
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-2, -legSwing - 4.2, 2.2, 1.6);
    ctx.fillRect(-2, legSwing + 2.6, 2.2, 1.6);

    // Pants
    ctx.fillStyle = player.pantsColor;
    ctx.fillRect(-1.5, -legSwing - 3.8, 3, 3.2);
    ctx.fillRect(-1.5, legSwing + 0.5, 3, 3.2);

    // Torso / Jacket
    ctx.fillStyle = player.shirtColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.5, 6.0, 0, 0, Math.PI * 2);
    ctx.fill();

    // Backpack
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-4.5, -3, 2.5, 6);

    // Arms swinging with walk cycle
    const armSwing = Math.sin(player.walkCycle) * 2.8;
    ctx.fillStyle = player.shirtColor;
    ctx.beginPath();
    ctx.arc(armSwing, -5.2, 1.8, 0, Math.PI * 2);
    ctx.arc(-armSwing, 5.2, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Hands
    ctx.fillStyle = player.skinColor;
    ctx.beginPath();
    ctx.arc(armSwing + 1, -5.2, 1.2, 0, Math.PI * 2);
    ctx.arc(-armSwing + 1, 5.2, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = player.skinColor;
    ctx.beginPath();
    ctx.arc(1.8, 0, 3.4, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = player.hairColor;
    ctx.beginPath();
    ctx.arc(0.6, 0, 3.2, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();

    ctx.restore(); // end rotated part
    ctx.restore(); // end translate
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

      // 3. Body Shell Contours (with Crumple/Dent deform calculations)
      const dmg = car.damage || {
        health: 100, frontCrumple: 0, rearCrumple: 0, leftDent: 0, rightDent: 0,
        frontLeftDent: 0, frontRightDent: 0, rearLeftDent: 0, rearRightDent: 0,
        hoodBuckled: false, windshieldCracked: false, rearGlassCracked: false,
        leftHeadlightBroken: false, rightHeadlightBroken: false,
        leftTaillightBroken: false, rightTaillightBroken: false,
        engineSmoking: false, engineFire: false, scratches: []
      };

      const fc = Math.min(halfL * 0.55, dmg.frontCrumple || 0);
      const rc = Math.min(halfL * 0.45, dmg.rearCrumple || 0);
      const ld = Math.min(halfW * 0.75, dmg.leftDent || 0);
      const rd = Math.min(halfW * 0.75, dmg.rightDent || 0);
      const fld = Math.min(halfL * 0.4, dmg.frontLeftDent || 0);
      const frd = Math.min(halfL * 0.4, dmg.frontRightDent || 0);
      const rld = Math.min(halfL * 0.35, dmg.rearLeftDent || 0);
      const rrd = Math.min(halfL * 0.35, dmg.rearRightDent || 0);

      const basePoly = [
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

      let bodyPoly = basePoly;
      if (dmg.deformedVertices && dmg.deformedVertices.length === 16) {
        bodyPoly = basePoly.map((bv, idx) => {
          const dv = dmg.deformedVertices![idx];
          return {
            x: bv.x + (dv.offsetX || 0),
            y: bv.y + (dv.offsetY || 0)
          };
        });
      }

      // 3b. Inverse Distance Weighting deformation function for car attachments
      const deform = (px: number, py: number): [number, number] => {
        let totalWeight = 0;
        let dx = 0;
        let dy = 0;
        for (let i = 0; i < 16; i++) {
          const bp = basePoly[i];
          const bvp = bodyPoly[i];
          const vx = bp.x;
          const vy = bp.y;
          const distSq = (px - vx) * (px - vx) + (py - vy) * (py - vy);
          const weight = 1 / (distSq + 16);
          totalWeight += weight;
          dx += (bvp.x - bp.x) * weight;
          dy += (bvp.y - bp.y) * weight;
        }
        if (totalWeight > 0) {
          return [px + dx / totalWeight, py + dy / totalWeight];
        }
        return [px, py];
      };

      const drawDeformedRect = (rx: number, ry: number, rw: number, rh: number, fillStyle: string | CanvasGradient) => {
        const p1 = deform(rx, ry);
        const p2 = deform(rx + rw, ry);
        const p3 = deform(rx + rw, ry + rh);
        const p4 = deform(rx, ry + rh);
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.lineTo(p3[0], p3[1]);
        ctx.lineTo(p4[0], p4[1]);
        ctx.closePath();
        ctx.fill();
      };

      const drawDeformedLine = (x1: number, y1: number, x2: number, y2: number, strokeStyle: string, lineWidth: number, isDashed = false) => {
        const p1 = deform(x1, y1);
        const p2 = deform(x2, y2);
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.save();
        if (isDashed) ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.stroke();
        ctx.restore();
      };

      // 2. Wheels - Tucked realistically inside wheel wells & deformed organically
      const isThreeAxle = car.type === 'truck_box' || car.type === 'truck_tanker' || 
                          car.type === 'truck_flatbed' || car.type === 'cement_mixer' ||
                          car.type === 'fire_engine' || car.type === 'truck_dump' || 
                          car.type === 'garbage_truck';
      const isHeavyTruck = isThreeAxle;

      const wheelL = isHeavyTruck ? 11.5 : (car.type === 'sports' ? 10 : 9.5);
      const wheelW = isHeavyTruck ? 5.2 : (car.type === 'sports' ? 5.5 : 4.2);
      const frontAxleX = isHeavyTruck ? halfL * 0.72 : halfL * 0.65;
      const trackY = halfW - 0.8; // Tucked slightly inside halfW

      const renderFixedWheel = (wx: number, wy: number) => {
        const cy = wy + wheelW / 2;
        const [dwx, dwy] = deform(wx, cy);
        ctx.fillStyle = '#0f172a'; // Tire
        ctx.fillRect(dwx - wheelL / 2, dwy - wheelW / 2, wheelL, wheelW);
        ctx.fillStyle = '#64748b'; // Rims
        ctx.fillRect(dwx - wheelL / 2 + 2, dwy - wheelW / 2 + 0.8, wheelL - 4, wheelW - 1.6);
      };

      if (isThreeAxle) {
        // Dual tandem rear axles (6x4 / 6x6)
        const rearAxle1X = -halfL * 0.36;
        const rearAxle2X = -halfL * 0.74;
        renderFixedWheel(rearAxle1X, -trackY);
        renderFixedWheel(rearAxle1X, trackY - wheelW);
        renderFixedWheel(rearAxle2X, -trackY);
        renderFixedWheel(rearAxle2X, trackY - wheelW);
      } else {
        const rearAxleX = -halfL * 0.65;
        renderFixedWheel(rearAxleX, -trackY);
        renderFixedWheel(rearAxleX, trackY - wheelW);
      }

      // Front wheels (steered)
      const renderSteeredWheel = (wx: number, wy: number) => {
        const [dwx, dwy] = deform(wx, wy);
        ctx.save();
        ctx.translate(dwx, dwy);
        ctx.rotate(car.steerAngle);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-wheelL / 2, -wheelW / 2, wheelL, wheelW);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(-wheelL / 2 + 2, -wheelW / 2 + 0.8, wheelL - 4, wheelW - 1.6);
        ctx.restore();
      };
      renderSteeredWheel(frontAxleX, -trackY + wheelW / 2);
      renderSteeredWheel(frontAxleX, trackY - wheelW / 2);

      // Now draw body shell
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

      // (Cabin, roof attachments and heavy utility compartments relocated to renderVehicleCabins)

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

      // (Roof sirens relocated to renderVehicleCabins)

      ctx.restore();
    }
  }

  // --- VEHICLE CABINS, ROOFS & ROOF ATTACHMENTS (Drawn on top of lightmap) ---
  private renderVehicleCabins(vehicles: Vehicle[], nightAlpha: number) {
    const ctx = this.ctx;

    for (const car of vehicles) {
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);

      const halfL = car.length / 2;
      const halfW = car.width / 2;

      const dmg = car.damage || {
        health: 100, frontCrumple: 0, rearCrumple: 0, leftDent: 0, rightDent: 0,
        frontLeftDent: 0, frontRightDent: 0, rearLeftDent: 0, rearRightDent: 0,
        hoodBuckled: false, windshieldCracked: false, rearGlassCracked: false,
        leftHeadlightBroken: false, rightHeadlightBroken: false,
        leftTaillightBroken: false, rightTaillightBroken: false,
        engineSmoking: false, engineFire: false, scratches: []
      };

      const fc = Math.min(halfL * 0.55, dmg.frontCrumple || 0);
      const rc = Math.min(halfL * 0.45, dmg.rearCrumple || 0);
      const ld = Math.min(halfW * 0.75, dmg.leftDent || 0);
      const rd = Math.min(halfW * 0.75, dmg.rightDent || 0);
      const fld = Math.min(halfL * 0.4, dmg.frontLeftDent || 0);
      const frd = Math.min(halfL * 0.4, dmg.frontRightDent || 0);
      const rld = Math.min(halfL * 0.35, dmg.rearLeftDent || 0);
      const rrd = Math.min(halfL * 0.35, dmg.rearRightDent || 0);

      const basePoly = [
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

      let bodyPoly = basePoly;
      if (dmg.deformedVertices && dmg.deformedVertices.length === 16) {
        bodyPoly = basePoly.map((bv, idx) => {
          const dv = dmg.deformedVertices![idx];
          return {
            x: bv.x + (dv.offsetX || 0),
            y: bv.y + (dv.offsetY || 0)
          };
        });
      }

      const deform = (px: number, py: number): [number, number] => {
        let totalWeight = 0;
        let dx = 0;
        let dy = 0;
        for (let i = 0; i < 16; i++) {
          const bp = basePoly[i];
          const bvp = bodyPoly[i];
          const vx = bp.x;
          const vy = bp.y;
          const distSq = (px - vx) * (px - vx) + (py - vy) * (py - vy);
          const weight = 1 / (distSq + 16);
          totalWeight += weight;
          dx += (bvp.x - bp.x) * weight;
          dy += (bvp.y - bp.y) * weight;
        }
        if (totalWeight > 0) {
          return [px + dx / totalWeight, py + dy / totalWeight];
        }
        return [px, py];
      };

      const drawDeformedRect = (rx: number, ry: number, rw: number, rh: number, fillStyle: string | CanvasGradient) => {
        const p1 = deform(rx, ry);
        const p2 = deform(rx + rw, ry);
        const p3 = deform(rx + rw, ry + rh);
        const p4 = deform(rx, ry + rh);
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.lineTo(p3[0], p3[1]);
        ctx.lineTo(p4[0], p4[1]);
        ctx.closePath();
        ctx.fill();
      };

      const drawDeformedLine = (x1: number, y1: number, x2: number, y2: number, strokeStyle: string, lineWidth: number, isDashed = false) => {
        const p1 = deform(x1, y1);
        const p2 = deform(x2, y2);
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.save();
        if (isDashed) ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.stroke();
        ctx.restore();
      };

      const drawDeformedCircle = (cx: number, cy: number, r: number, color: string) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        const steps = 12;
        for (let i = 0; i <= steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          const px = cx + Math.cos(angle) * r;
          const py = cy + Math.sin(angle) * r;
          const [dpx, dpy] = deform(px, py);
          if (i === 0) ctx.moveTo(dpx, dpy);
          else ctx.lineTo(dpx, dpy);
        }
        ctx.fill();
      };

      // Cabin dimensions setup
      let cabinL = car.length * 0.52;
      let cabinW = Math.max(8, car.width * 0.8 - (ld + rd) * 0.3);
      let cabinX = -car.length * 0.05;

      const isCabOverTruck = car.type === 'truck_box' || car.type === 'truck_dump' || 
                             car.type === 'cement_mixer' || car.type === 'garbage_truck';

      if (isCabOverTruck) {
        cabinL = car.length * 0.18;
        cabinW = car.width * 0.88;
        cabinX = halfL - cabinL / 2 - 2;
      } else if (car.type === 'fire_engine') {
        cabinL = car.length * 0.28;
        cabinW = car.width * 0.90;
        cabinX = halfL - cabinL / 2 - 2;
      } else if (car.type === 'truck_flatbed') {
        cabinL = car.length * 0.18;
        cabinW = car.width * 0.86;
        cabinX = halfL - cabinL * 1.35;
      } else if (car.type === 'truck_tanker') {
        cabinL = car.length * 0.18;
        cabinW = car.width * 0.86;
        cabinX = halfL - cabinL * 1.35;
      } else if (car.type === 'van') {
        cabinL = car.length * 0.58;
        cabinW = car.width * 0.84;
        cabinX = -car.length * 0.02;
      } else if (car.type === 'muscle') {
        cabinL = car.length * 0.48;
        cabinW = car.width * 0.78;
        cabinX = -car.length * 0.04;
      } else if (car.type === 'sports') {
        cabinL = car.length * 0.45;
        cabinW = car.width * 0.74;
        cabinX = -car.length * 0.08;
      } else if (car.type === 'hatchback') {
        cabinL = car.length * 0.56;
        cabinW = car.width * 0.78;
        cabinX = -car.length * 0.12;
      } else if (car.type === 'suv') {
        cabinL = car.length * 0.56;
        cabinW = car.width * 0.82;
        cabinX = -car.length * 0.05;
      } else if (car.type === 'pickup') {
        cabinL = car.length * 0.38;
        cabinW = car.width * 0.82;
        cabinX = car.length * 0.1;
      }

      // Draw glass base and roofs
      if (car.type !== 'bus' && car.type !== 'ambulance') {
        drawDeformedRect(cabinX - cabinL / 2, -cabinW / 2, cabinL, cabinW, '#0f172a');

        const roofL = cabinL * 0.66;
        const roofW = cabinW * 0.80;
        drawDeformedRect(cabinX - roofL / 2, -roofW / 2, roofL, roofW, car.roofColor || car.color);

        const fWsX1 = cabinX + roofL / 2;
        const fWsX2 = cabinX + cabinL / 2;
        drawDeformedRect(fWsX1, -cabinW / 2 + 1, fWsX2 - fWsX1, cabinW - 2, 'rgba(56, 189, 248, 0.15)');
        drawDeformedLine(fWsX1 + 1, -cabinW / 2 + 2, fWsX2 - 1, cabinW / 2 - 2, 'rgba(255, 255, 255, 0.25)', 1.2);

        const rWsX1 = cabinX - cabinL / 2;
        const rWsX2 = cabinX - roofL / 2;
        drawDeformedRect(rWsX1, -cabinW / 2 + 1, rWsX2 - rWsX1, cabinW - 2, 'rgba(56, 189, 248, 0.12)');
        drawDeformedLine(rWsX1 + 1, -cabinW / 4, rWsX2 - 1, cabinW / 4, 'rgba(255, 255, 255, 0.15)', 1.2);

        drawDeformedRect(cabinX - roofL / 2, -cabinW / 2 + 0.5, roofL, (cabinW - roofW) / 2 - 0.5, 'rgba(56, 189, 248, 0.08)');
        drawDeformedRect(cabinX - roofL / 2, roofW / 2, roofL, (cabinW - roofW) / 2 - 0.5, 'rgba(56, 189, 248, 0.08)');

        if (dmg.windshieldCracked) {
          const wsMinX = fWsX1 + 1;
          const wsMaxX = fWsX2 - 1;
          const wsCenterX = wsMinX + (wsMaxX - wsMinX) * 0.5;
          const wsCenterY = 0;
          const wsHalfW = (wsMaxX - wsMinX) * 0.45;
          const wsHalfH = (cabinW - 4) * 0.45;

          ctx.save();
          const clipP1 = deform(wsMinX, -cabinW / 2 + 2);
          const clipP2 = deform(wsMaxX, -cabinW / 2 + 2);
          const clipP3 = deform(wsMaxX, cabinW / 2 - 2);
          const clipP4 = deform(wsMinX, cabinW / 2 - 2);
          ctx.beginPath();
          ctx.moveTo(clipP1[0], clipP1[1]);
          ctx.lineTo(clipP2[0], clipP2[1]);
          ctx.lineTo(clipP3[0], clipP3[1]);
          ctx.lineTo(clipP4[0], clipP4[1]);
          ctx.closePath();
          ctx.clip();

          const [dcx, dcy] = deform(wsCenterX, wsCenterY);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.beginPath();
          ctx.arc(dcx, dcy, 1.8, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = 'rgba(224, 242, 254, 0.95)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();

          const arms = 6;
          for (let i = 0; i < arms; i++) {
            const angle = (i / arms) * Math.PI * 2 + (i * 0.3);
            const len = Math.min(wsHalfW, wsHalfH) * (0.5 + (i % 2) * 0.25);
            const endX = wsCenterX + Math.cos(angle) * len;
            const endY = wsCenterY + Math.sin(angle) * len;
            const pStart = deform(wsCenterX, wsCenterY);
            const pEnd = deform(endX, endY);
            ctx.moveTo(pStart[0], pStart[1]);
            ctx.lineTo(pEnd[0], pEnd[1]);
          }
          ctx.stroke();
          ctx.restore();
        }

        if (car.wiperAngle !== undefined) {
          const wx2 = fWsX1 + cabinL * 0.12 * Math.cos(car.wiperAngle);
          const wy2 = cabinL * 0.12 * Math.sin(car.wiperAngle);
          drawDeformedLine(fWsX1, 0, wx2, wy2, '#0f172a', 0.8);
        }
      }

      // Distinct types accessories
      if (car.type === 'sports') {
        drawDeformedRect(-halfL + rc + 1, -halfW * 0.45, 1.8, 1, '#0a0f1d');
        drawDeformedRect(-halfL + rc + 1, halfW * 0.35, 1.8, 1, '#0a0f1d');
        drawDeformedRect(-halfL + rc - 1.5, -halfW * 0.82, 3.2, halfW * 1.64, '#0a0f1d');
        drawDeformedRect(-halfL + rc - 1.8, -halfW * 0.82 - 0.5, 3.8, 1, car.color);
        drawDeformedRect(-halfL + rc - 1.8, halfW * 0.82 - 0.5, 3.8, 1, car.color);
        drawDeformedRect(halfL * 0.38, -halfW * 0.32, 5, 2.2, '#0f172a');
        drawDeformedRect(halfL * 0.38, halfW * 0.18, 5, 2.2, '#0f172a');

      } else if (car.type === 'pickup') {
        const bedX1 = -halfL + rc + 3;
        const bedX2 = cabinX - cabinL / 2;
        const bedW = halfW * 2 - 3.2;
        drawDeformedRect(bedX1, -bedW / 2, bedX2 - bedX1, bedW, '#1e293b');
        for (let ry = -bedW / 2 + 2.5; ry < bedW / 2; ry += 2.5) {
          drawDeformedLine(bedX1 + 1, ry, bedX2 - 1, ry, '#475569', 0.8);
        }
        drawDeformedRect(bedX1 + 2.5, -bedW / 2 + 2, 8, 7, '#92400e');

      } else if (car.type === 'suv') {
        drawDeformedRect(halfL * 0.2, -4, 4, 8, '#0f172a');
        drawDeformedCircle(-halfL, 0, 4.2, '#334155');
        drawDeformedCircle(-halfL, 0, 2.4, car.color);

      } else if (car.type === 'taxi') {
        drawDeformedRect(cabinX - 1.5, -5.5, 3, 11, '#0f172a');
        drawDeformedRect(cabinX - 1, -4.5, 2, 9, '#f59e0b');
        if (nightAlpha > 0.05) {
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          const [dcabinX, dcabinY] = deform(cabinX, 0);
          const signGlow = ctx.createRadialGradient(dcabinX, dcabinY, 1, dcabinX, dcabinY, 11);
          signGlow.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
          signGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
          ctx.fillStyle = signGlow;
          ctx.beginPath(); ctx.arc(dcabinX, dcabinY, 11, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        drawDeformedLine(-halfL + rc, -halfW + 1.2, halfL - fc, -halfW + 1.2, '#000000', 0.5, true);
        drawDeformedLine(-halfL + rc, halfW - 1.2, halfL - fc, halfW - 1.2, '#000000', 0.5, true);

      } else if (car.type === 'fire_engine') {
        const bumpX = halfL - fc;
        drawDeformedRect(bumpX - 1, -halfW - 0.5, 3.5, halfW * 2 + 1, '#cbd5e1');
        drawDeformedRect(bumpX - 0.5, -halfW * 0.6, 2, 3, '#0f172a');
        drawDeformedRect(bumpX - 0.5, halfW * 0.6 - 3, 2, 3, '#0f172a');

        const cabBackX = cabinX - cabinL / 2;
        drawDeformedRect(cabBackX, -halfW + 0.5, cabinL, halfW * 2 - 1, '#b91c1c');
        drawDeformedRect(cabinX - cabinL * 0.25, -halfW + 1, 4, 1.8, '#0f172a');
        drawDeformedRect(cabinX - cabinL * 0.25, halfW - 2.8, 4, 1.8, '#0f172a');
        drawDeformedRect(cabinX + cabinL * 0.3, -halfW - 3, 2, 3.5, '#334155');
        drawDeformedRect(cabinX + cabinL * 0.3, halfW - 0.5, 2, 3.5, '#334155');

        const bodyX1 = -halfL + rc + 2;
        const bodyX2 = cabBackX - 1;
        const bodyW = halfW * 2 - 1.5;
        drawDeformedRect(bodyX1, -bodyW / 2, bodyX2 - bodyX1, bodyW, '#dc2626');
        drawDeformedLine(bodyX1, -bodyW / 2, bodyX2, -bodyW / 2, '#991b1b', 1);
        drawDeformedLine(bodyX2, -bodyW / 2, bodyX2, bodyW / 2, '#991b1b', 1);
        drawDeformedLine(bodyX2, bodyW / 2, bodyX1, bodyW / 2, '#991b1b', 1);
        drawDeformedLine(bodyX1, bodyW / 2, bodyX1, -bodyW / 2, '#991b1b', 1);

        const shutterCount = 3;
        const shutterSpan = (bodyX2 - bodyX1 - 4) / shutterCount;
        for (let s = 0; s < shutterCount; s++) {
          const sx = bodyX1 + 2 + s * shutterSpan;
          const sw = shutterSpan - 2;
          drawDeformedRect(sx, -bodyW / 2 + 0.5, sw, 3.5, '#e2e8f0');
          drawDeformedRect(sx, bodyW / 2 - 4, sw, 3.5, '#e2e8f0');
          drawDeformedLine(sx + 1, -bodyW / 2 + 2, sx + sw - 1, -bodyW / 2 + 2, '#64748b', 0.6);
          drawDeformedLine(sx + 1, bodyW / 2 - 2, sx + sw - 1, bodyW / 2 - 2, '#64748b', 0.6);
        }

        drawDeformedRect(bodyX1 + (bodyX2 - bodyX1) * 0.45, -2, 7, 4, '#0f172a');
        drawDeformedRect(bodyX1 + (bodyX2 - bodyX1) * 0.45 + 1.5, -1.2, 1.8, 1.2, '#38bdf8');
        drawDeformedRect(bodyX1 + (bodyX2 - bodyX1) * 0.45 + 3.8, -1.2, 1.8, 1.2, '#38bdf8');

        drawDeformedRect(bodyX1, -bodyW / 2 + 4.5, bodyX2 - bodyX1, 1.8, '#ffffff');
        drawDeformedRect(bodyX1, bodyW / 2 - 6.3, bodyX2 - bodyX1, 1.8, '#ffffff');
        drawDeformedRect(cabBackX, -halfW + 2, cabinL, 1.5, '#ffffff');
        drawDeformedRect(cabBackX, halfW - 3.5, cabinL, 1.5, '#ffffff');

        for (let cy = -bodyW / 2 + 1; cy <= bodyW / 2 - 4; cy += 6) {
          const p1 = deform(bodyX1 - 1, cy);
          const p2 = deform(bodyX1 + 2, cy + 5);
          const p3 = deform(bodyX1 + 2, cy + 8);
          const p4 = deform(bodyX1 - 1, cy + 3);
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]); ctx.lineTo(p4[0], p4[1]);
          ctx.closePath(); ctx.fill();
        }

        const ladderX1 = bodyX1 + 2;
        const ladderW = 6.5;
        const ladderL = car.length * 0.52;
        drawDeformedRect(ladderX1, -ladderW / 2, ladderL, 1.2, '#cbd5e1');
        drawDeformedRect(ladderX1, ladderW / 2 - 1.2, ladderL, 1.2, '#cbd5e1');
        for (let lx = ladderX1 + 3; lx < ladderX1 + ladderL - 2; lx += 4) {
          drawDeformedLine(lx, -ladderW / 2, lx, ladderW / 2, '#475569', 0.8);
        }

        const cannonX = cabinX - 2;
        drawDeformedCircle(cannonX, 0, 3.5, '#334155');
        drawDeformedRect(cannonX, -1, 7, 2, '#94a3b8');
        drawDeformedCircle(cannonX - 1, 0, 1.5, '#ef4444');

        drawDeformedRect(bodyX1 + 4, -halfW - 0.8, bodyX2 - bodyX1 - 8, 1.4, '#1e293b');
        drawDeformedRect(bodyX1 + 4, halfW - 0.6, bodyX2 - bodyX1 - 8, 1.4, '#1e293b');

      } else if (car.type === 'bus') {
        const glassX1 = -halfL + 8;
        const glassX2 = halfL - 10;
        const glassW = halfW * 2 - 1.2;
        drawDeformedRect(glassX1, -glassW / 2, glassX2 - glassX1, glassW, '#0f172a');

        const busRoofW = halfW * 2 - 4.5;
        drawDeformedRect(glassX1 + 1, -busRoofW / 2, glassX2 - glassX1 - 2, busRoofW, car.roofColor || car.color);

        const winCount = 6;
        const winSpan = (glassX2 - glassX1 - 8) / winCount;
        for (let i = 0; i < winCount; i++) {
          const wx = glassX1 + 4 + i * winSpan;
          const ww = winSpan - 2;
          drawDeformedRect(wx, -halfW + 0.5, ww, 2.2, 'rgba(56, 189, 248, 0.16)');
          drawDeformedRect(wx, halfW - 2.7, ww, 2.2, 'rgba(56, 189, 248, 0.16)');
        }

        const fWindshieldX = halfL - 10;
        const fWindshieldW = halfW * 2 - 2.5;
        drawDeformedRect(fWindshieldX, -fWindshieldW / 2, 6, fWindshieldW, '#0f172a');
        drawDeformedRect(fWindshieldX + 1.5, -fWindshieldW / 2 + 0.8, 3.8, fWindshieldW - 1.6, 'rgba(56, 189, 248, 0.22)');
        drawDeformedLine(fWindshieldX + 2, -fWindshieldW / 3, fWindshieldX + 4.5, fWindshieldW / 3, 'rgba(255, 255, 255, 0.28)', 1);

        drawDeformedRect(fWindshieldX - 2.5, -8, 2, 16, '#1e293b');
        drawDeformedRect(fWindshieldX - 2, -6.5, 1.2, 13, '#f59e0b');

        const rWindshieldX = -halfL + 3.5;
        const rWindshieldW = halfW * 2 - 6;
        drawDeformedRect(rWindshieldX, -rWindshieldW / 2, 3, rWindshieldW, '#0f172a');
        drawDeformedRect(rWindshieldX + 0.5, -rWindshieldW / 2 + 0.5, 2, rWindshieldW - 1, 'rgba(56, 189, 248, 0.16)');

        const doorW = 8.5;
        const doorPositions = [glassX1 + (glassX2 - glassX1) * 0.18, glassX1 + (glassX2 - glassX1) * 0.72];
        doorPositions.forEach(dx => {
          drawDeformedRect(dx - doorW / 2, halfW - 2.2, doorW, 2.5, '#1e293b');
          drawDeformedRect(dx - 0.4, halfW - 2.2, 0.8, 2.5, '#cbd5e1');
          drawDeformedRect(dx - doorW / 2 + 1, halfW - 1.6, doorW / 2 - 1.8, 1.4, 'rgba(56, 189, 248, 0.22)');
          drawDeformedRect(dx + 0.8, halfW - 1.6, doorW / 2 - 1.8, 1.4, 'rgba(56, 189, 248, 0.22)');
        });

        drawDeformedRect(halfL - 5, -halfW - 3.2, 1.8, 3.6, '#1e293b');
        drawDeformedRect(halfL - 5, halfW - 0.4, 1.8, 3.6, '#1e293b');

        const acX = 0;
        const acL = 20;
        const acW = 12;
        drawDeformedRect(acX - acL / 2, -acW / 2, acL, acW, '#f8fafc');
        drawDeformedLine(acX - acL / 2, -acW / 2, acX + acL / 2, -acW / 2, '#cbd5e1', 0.8);
        drawDeformedLine(acX + acL / 2, -acW / 2, acX + acL / 2, acW / 2, '#cbd5e1', 0.8);
        drawDeformedLine(acX + acL / 2, acW / 2, acX - acL / 2, acW / 2, '#cbd5e1', 0.8);
        drawDeformedLine(acX - acL / 2, acW / 2, acX - acL / 2, -acW / 2, '#cbd5e1', 0.8);
        drawDeformedCircle(acX - 4.5, 0, 2.6, '#475569');
        drawDeformedCircle(acX + 4.5, 0, 2.6, '#475569');

        drawDeformedRect(-halfL * 0.42 - 4.5, -4.5, 9, 9, '#f1f5f9');
        drawDeformedRect(halfL * 0.42 - 4.5, -4.5, 9, 9, '#f1f5f9');
        drawDeformedLine(-halfL * 0.42 - 4.5, -4.5, -halfL * 0.42 + 4.5, -4.5, '#cbd5e1', 0.6);
        drawDeformedLine(-halfL * 0.42 + 4.5, -4.5, -halfL * 0.42 + 4.5, 4.5, '#cbd5e1', 0.6);
        drawDeformedLine(-halfL * 0.42 + 4.5, 4.5, -halfL * 0.42 - 4.5, 4.5, '#cbd5e1', 0.6);
        drawDeformedLine(-halfL * 0.42 - 4.5, 4.5, -halfL * 0.42 - 4.5, -4.5, '#cbd5e1', 0.6);
        drawDeformedLine(halfL * 0.42 - 4.5, -4.5, halfL * 0.42 + 4.5, -4.5, '#cbd5e1', 0.6);
        drawDeformedLine(halfL * 0.42 + 4.5, -4.5, halfL * 0.42 + 4.5, 4.5, '#cbd5e1', 0.6);
        drawDeformedLine(halfL * 0.42 + 4.5, 4.5, halfL * 0.42 - 4.5, 4.5, '#cbd5e1', 0.6);
        drawDeformedLine(halfL * 0.42 - 4.5, 4.5, halfL * 0.42 - 4.5, -4.5, '#cbd5e1', 0.6);

      } else if (car.type === 'van') {
        drawDeformedLine(-halfL + rc + 4, -4, halfL - fc - 4, -4, 'rgba(15, 23, 42, 0.35)', 0.8);
        drawDeformedLine(-halfL + rc + 4, 0, halfL - fc - 4, 0, 'rgba(15, 23, 42, 0.35)', 0.8);
        drawDeformedLine(-halfL + rc + 4, 4, halfL - fc - 4, 4, 'rgba(15, 23, 42, 0.35)', 0.8);
        drawDeformedRect(halfL - fc - 3, -4, 1.8, 8, '#1e293b');

      } else if (car.type === 'muscle') {
        drawDeformedRect(halfL - fc - 1.8, -halfW + 2, 2.2, halfW * 2 - 4, '#cbd5e1');
        drawDeformedRect(-halfL + rc - 0.4, -halfW + 2, 2.2, halfW * 2 - 4, '#cbd5e1');
        drawDeformedRect(halfL - fc - 1.5, -halfW * 0.45, 1.5, halfW * 0.9, '#1e293b');
        for (let gy = -halfW * 0.4; gy < halfW * 0.4; gy += 2) {
          drawDeformedLine(halfL - fc - 1.5, gy, halfL - fc, gy, '#e2e8f0', 0.6);
        }
        drawDeformedLine(halfL - fc - 2, -halfW * 0.3, cabinX + cabinL / 2, -halfW * 0.25, 'rgba(15, 23, 42, 0.25)', 0.8);
        drawDeformedLine(halfL - fc - 2, halfW * 0.3, cabinX + cabinL / 2, halfW * 0.25, 'rgba(15, 23, 42, 0.25)', 0.8);

      } else if (car.type === 'ambulance') {
        const cabL_amb = car.length * 0.28;
        const cabX_amb = halfL - cabL_amb * 0.8;
        const cabW_amb = halfW * 2 - 2;
        drawDeformedRect(cabX_amb - cabL_amb / 2, -cabW_amb / 2, cabL_amb, cabW_amb, '#0f172a');
        drawDeformedRect(cabX_amb - cabL_amb * 0.1, -cabW_amb * 0.38, cabL_amb * 0.55, cabW_amb * 0.76, '#ffffff');
        drawDeformedRect(cabX_amb + cabL_amb * 0.22, -cabW_amb / 2 + 1, 3.2, cabW_amb - 2, 'rgba(56, 189, 248, 0.18)');
        drawDeformedRect(cabX_amb - cabL_amb * 0.1, -cabW_amb / 2 + 0.5, cabL_amb * 0.28, 1.2, 'rgba(56, 189, 248, 0.18)');
        drawDeformedRect(cabX_amb - cabL_amb * 0.1, cabW_amb / 2 - 1.7, cabL_amb * 0.28, 1.2, 'rgba(56, 189, 248, 0.18)');

        const boxX1_amb = -halfL + rc + 3;
        const boxX2_amb = cabX_amb - cabL_amb / 2 - 1;
        const boxW_amb = halfW * 2 - 0.8;
        drawDeformedRect(boxX1_amb, -boxW_amb / 2, boxX2_amb - boxX1_amb, boxW_amb, '#ffffff');
        drawDeformedLine(boxX1_amb, -boxW_amb / 2, boxX2_amb, -boxW_amb / 2, '#cbd5e1', 1);
        drawDeformedLine(boxX2_amb, -boxW_amb / 2, boxX2_amb, boxW_amb / 2, '#cbd5e1', 1);
        drawDeformedLine(boxX2_amb, boxW_amb / 2, boxX1_amb, boxW_amb / 2, '#cbd5e1', 1);
        drawDeformedLine(boxX1_amb, boxW_amb / 2, boxX1_amb, -boxW_amb / 2, '#cbd5e1', 1);

        drawDeformedRect(boxX1_amb, -boxW_amb / 2 + 1, boxX2_amb - boxX1_amb, 2.5, '#ef4444');
        drawDeformedRect(boxX1_amb, boxW_amb / 2 - 3.5, boxX2_amb - boxX1_amb, 2.5, '#ef4444');

        const sideCircleX = boxX1_amb + (boxX2_amb - boxX1_amb) * 0.45;
        drawDeformedCircle(sideCircleX, -boxW_amb / 2 + 3.8, 2.8, '#ffffff');
        drawDeformedCircle(sideCircleX, boxW_amb / 2 - 3.8, 2.8, '#ffffff');
        drawDeformedRect(sideCircleX - 1.5, -boxW_amb / 2 + 3.2, 3.0, 1.2, '#ef4444');
        drawDeformedRect(sideCircleX - 0.5, -boxW_amb / 2 + 2.4, 1.0, 2.8, '#ef4444');
        drawDeformedRect(sideCircleX - 1.5, boxW_amb / 2 - 4.4, 3.0, 1.2, '#ef4444');
        drawDeformedRect(sideCircleX - 0.5, boxW_amb / 2 - 5.2, 1.0, 2.8, '#ef4444');

        drawDeformedRect(boxX1_amb, -boxW_amb * 0.38, 1.8, boxW_amb * 0.76, '#cbd5e1');
        drawDeformedRect(boxX1_amb + 0.4, -boxW_amb * 0.28, 1, boxW_amb * 0.20, '#1e293b');
        drawDeformedRect(boxX1_amb + 0.4, boxW_amb * 0.08, 1, boxW_amb * 0.20, '#1e293b');

        drawDeformedRect(boxX1_amb - 0.8, -boxW_amb / 2 + 1, 0.8, boxW_amb - 2, '#f59e0b');
        drawDeformedRect(boxX1_amb - 0.8, -boxW_amb / 2 + 2, 0.8, 1.5, '#ef4444');
        drawDeformedRect(boxX1_amb - 0.8, -boxW_amb / 4, 0.8, 1.5, '#ef4444');
        drawDeformedRect(boxX1_amb - 0.8, boxW_amb / 4, 0.8, 1.5, '#ef4444');

        const roofCircleX = boxX1_amb + (boxX2_amb - boxX1_amb) * 0.55;
        drawDeformedCircle(roofCircleX, 0, 5.8, '#ffffff');
        drawDeformedRect(roofCircleX - 4.2, -1.2, 8.4, 2.4, '#ef4444');
        drawDeformedRect(roofCircleX - 1.2, -4.2, 2.4, 8.4, '#ef4444');

        const ventX = boxX1_amb + (boxX2_amb - boxX1_amb) * 0.18;
        drawDeformedCircle(ventX, 0, 3.2, '#e2e8f0');
        drawDeformedRect(boxX2_amb - 4, -boxW_amb * 0.44, 2.5, boxW_amb * 0.88, '#cbd5e1');
        drawDeformedRect(boxX2_amb - 4, -boxW_amb * 0.44 + 0.5, 2.5, 3.5, '#3b82f6');
        drawDeformedRect(boxX2_amb - 4, boxW_amb * 0.44 - 4, 2.5, 3.5, '#ef4444');

      } else if (car.type === 'truck_box') {
        drawDeformedRect(halfL - fc - 2, -halfW + 3, 2, halfW * 2 - 6, '#0f172a');
        drawDeformedRect(cabinX + cabinL * 0.35, -4, 1.5, 2, '#f59e0b');
        drawDeformedRect(cabinX + cabinL * 0.35, -1, 1.5, 2, '#f59e0b');
        drawDeformedRect(cabinX + cabinL * 0.35, 2, 1.5, 2, '#f59e0b');

        const boxX1 = -halfL + rc + 3;
        const boxX2 = cabinX - cabinL / 2 - 1;
        const boxW = halfW * 2 - 1.2;
        drawDeformedRect(boxX1, -boxW / 2, boxX2 - boxX1, boxW, '#f8fafc');
        drawDeformedLine(boxX1, -boxW / 2, boxX2, -boxW / 2, '#94a3b8', 1.2);
        drawDeformedLine(boxX2, -boxW / 2, boxX2, boxW / 2, '#94a3b8', 1.2);
        drawDeformedLine(boxX2, boxW / 2, boxX1, boxW / 2, '#94a3b8', 1.2);
        drawDeformedLine(boxX1, boxW / 2, boxX1, -boxW / 2, '#94a3b8', 1.2);

        for (let bx = boxX1 + 6; bx < boxX2 - 4; bx += 6) {
          drawDeformedLine(bx, -boxW / 2 + 1, bx, boxW / 2 - 1, '#cbd5e1', 0.8);
        }

        drawDeformedRect(boxX1, -boxW / 2 + 2, 2, boxW - 4, '#64748b');
        drawDeformedRect(boxX1 - 0.5, -boxW / 4, 1.2, 1, '#cbd5e1');
        drawDeformedRect(boxX1 - 0.5, boxW / 4, 1.2, 1, '#cbd5e1');
        drawDeformedRect(boxX1 + 8, -halfW - 1.2, 14, 2, '#334155');
        drawDeformedRect(boxX1 + 8, halfW - 0.8, 14, 2, '#334155');

      } else if (car.type === 'truck_dump') {
        const dumpX1 = -halfL + rc + 3;
        const dumpX2 = cabinX - cabinL / 2 - 1;
        const dumpW = halfW * 2 - 1;
        drawDeformedRect(dumpX1, -dumpW / 2, dumpX2 - dumpX1 + cabinL * 0.6, dumpW, '#d97706');
        drawDeformedLine(dumpX1, -dumpW / 2, dumpX2 + cabinL * 0.6, -dumpW / 2, '#78350f', 1.2);
        drawDeformedLine(dumpX2 + cabinL * 0.6, -dumpW / 2, dumpX2 + cabinL * 0.6, dumpW / 2, '#78350f', 1.2);
        drawDeformedLine(dumpX2 + cabinL * 0.6, dumpW / 2, dumpX1, dumpW / 2, '#78350f', 1.2);
        drawDeformedLine(dumpX1, dumpW / 2, dumpX1, -dumpW / 2, '#78350f', 1.2);

        for (let rx = dumpX1 + 6; rx < dumpX2 + cabinL * 0.4; rx += 7) {
          drawDeformedLine(rx, -dumpW / 2, rx, dumpW / 2, '#b45309', 1.2);
        }

        drawDeformedRect(dumpX1 + 3, -dumpW / 2 + 2.5, dumpX2 - dumpX1 - 3, dumpW - 5, '#64748b');
        for (let gi = 0; gi < 16; gi++) {
          const gx = dumpX1 + 5 + (gi % 5) * 6;
          const gy = -dumpW / 2 + 4 + Math.floor(gi / 5) * 5;
          drawDeformedCircle(gx, gy, 1.8, '#94a3b8');
        }
        drawDeformedRect(halfL - fc - 2, -halfW + 3, 2, halfW * 2 - 6, '#0f172a');

      } else if (car.type === 'truck_tanker') {
        const hoodX1 = cabinX + cabinL / 2;
        const hoodX2 = halfL - fc;
        drawDeformedRect(hoodX1, -halfW + 3, hoodX2 - hoodX1, halfW * 2 - 6, car.color);
        drawDeformedRect(hoodX2 - 2, -halfW + 1, 2.5, halfW * 2 - 2, '#1e293b');

        const tankX1 = -halfL + rc + 3;
        const tankX2 = cabinX - cabinL / 2 - 1;
        const tankW = halfW * 2 - 2;
        const tankGrad = ctx.createLinearGradient(0, -tankW / 2, 0, tankW / 2);
        tankGrad.addColorStop(0, '#94a3b8');
        tankGrad.addColorStop(0.2, '#f8fafc');
        tankGrad.addColorStop(0.5, '#cbd5e1');
        tankGrad.addColorStop(0.8, '#64748b');
        tankGrad.addColorStop(1, '#334155');
        drawDeformedRect(tankX1, -tankW / 2, tankX2 - tankX1, tankW, tankGrad);
        drawDeformedLine(tankX1, -tankW / 2, tankX2, -tankW / 2, '#475569', 1);
        drawDeformedLine(tankX2, -tankW / 2, tankX2, tankW / 2, '#475569', 1);
        drawDeformedLine(tankX2, tankW / 2, tankX1, tankW / 2, '#475569', 1);
        drawDeformedLine(tankX1, tankW / 2, tankX1, -tankW / 2, '#475569', 1);

        drawDeformedRect(tankX1 + 4, -3, tankX2 - tankX1 - 8, 6, '#334155');
        const hatch1X = tankX1 + (tankX2 - tankX1) * 0.3;
        const hatch2X = tankX1 + (tankX2 - tankX1) * 0.7;
        drawDeformedCircle(hatch1X, 0, 3, '#0f172a');
        drawDeformedCircle(hatch2X, 0, 3, '#0f172a');

        const dX = tankX1 - 1;
        const dY = 0;
        const dp1 = deform(dX, dY - 2.5);
        const dp2 = deform(dX + 2.5, dY);
        const dp3 = deform(dX, dY + 2.5);
        const dp4 = deform(dX - 2.5, dY);
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(dp1[0], dp1[1]); ctx.lineTo(dp2[0], dp2[1]); ctx.lineTo(dp3[0], dp3[1]); ctx.lineTo(dp4[0], dp4[1]);
        ctx.closePath(); ctx.fill();

      } else if (car.type === 'truck_flatbed') {
        const hoodX1 = cabinX + cabinL / 2;
        const hoodX2 = halfL - fc;
        drawDeformedRect(hoodX1, -halfW + 2, hoodX2 - hoodX1, halfW * 2 - 4, car.color || '#0284c7');
        drawDeformedRect(hoodX2 - 3.5, -halfW + 3, 3.5, halfW * 2 - 6, '#f8fafc');

        const craneX = cabinX - cabinL / 2 - 3;
        drawDeformedRect(craneX - 3, -halfW + 2, 5, halfW * 2 - 4, '#0284c7');
        drawDeformedRect(craneX - 2, -3, 3, 6, '#0f172a');
        drawDeformedRect(craneX - 1, -1.5, 7, 3, '#f59e0b');

        const flatX1 = -halfL + rc + 3;
        const flatX2 = craneX - 4;
        const flatW = halfW * 2 - 2;
        drawDeformedRect(flatX1, -flatW / 2, flatX2 - flatX1, flatW, '#78350f');
        drawDeformedLine(flatX1, -flatW / 2, flatX2, -flatW / 2, '#451a03', 1.4);
        drawDeformedLine(flatX2, -flatW / 2, flatX2, flatW / 2, '#451a03', 1.4);
        drawDeformedLine(flatX2, flatW / 2, flatX1, flatW / 2, '#451a03', 1.4);
        drawDeformedLine(flatX1, flatW / 2, flatX1, -flatW / 2, '#451a03', 1.4);

        drawDeformedRect(flatX1 + 4, -flatW / 2 + 3, 16, 10, '#d97706');
        drawDeformedRect(flatX1 + 24, -flatW / 2 + 3, flatX2 - flatX1 - 28, 4, '#475569');
        drawDeformedRect(flatX1 + 24, -flatW / 2 + 8, flatX2 - flatX1 - 28, 4, '#475569');

        drawDeformedLine(flatX1 + 12, -flatW / 2, flatX1 + 12, flatW / 2, '#ea580c', 1.4);
        drawDeformedLine(flatX1 + 32, -flatW / 2, flatX1 + 32, flatW / 2, '#ea580c', 1.4);

      } else if (car.type === 'cement_mixer') {
        drawDeformedRect(halfL - fc - 2, -halfW + 3, 2, halfW * 2 - 6, '#0f172a');
        drawDeformedRect(cabinX + cabinL * 0.35, -4, 1.5, 2, '#f59e0b');
        drawDeformedRect(cabinX + cabinL * 0.35, -1, 1.5, 2, '#f59e0b');
        drawDeformedRect(cabinX + cabinL * 0.35, 2, 1.5, 2, '#f59e0b');
        drawDeformedRect(cabinX - cabinL / 2 - 3, -halfW + 2, 3, halfW * 2 - 4, '#38bdf8');

        const drumX1 = -halfL + rc + 8;
        const drumX2 = cabinX - cabinL / 2 - 4;
        const drumW = halfW * 2 - 2;

        const dp1 = deform(drumX2, -drumW * 0.28);
        const dp2 = deform(drumX1 + (drumX2 - drumX1) * 0.5, -drumW * 0.5);
        const dp3 = deform(drumX1, -drumW * 0.32);
        const dp4 = deform(drumX1, drumW * 0.32);
        const dp5 = deform(drumX1 + (drumX2 - drumX1) * 0.5, drumW * 0.5);
        const dp6 = deform(drumX2, drumW * 0.28);
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(dp1[0], dp1[1]); ctx.lineTo(dp2[0], dp2[1]); ctx.lineTo(dp3[0], dp3[1]);
        ctx.lineTo(dp4[0], dp4[1]); ctx.lineTo(dp5[0], dp5[1]); ctx.lineTo(dp6[0], dp6[1]);
        ctx.closePath(); ctx.fill();
        drawDeformedLine(drumX1, -drumW * 0.32, drumX1 + (drumX2 - drumX1) * 0.5, -drumW * 0.5, '#64748b', 1.2);
        drawDeformedLine(drumX1 + (drumX2 - drumX1) * 0.5, -drumW * 0.5, drumX2, -drumW * 0.28, '#64748b', 1.2);
        drawDeformedLine(drumX2, -drumW * 0.28, drumX2, drumW * 0.28, '#64748b', 1.2);
        drawDeformedLine(drumX2, drumW * 0.28, drumX1 + (drumX2 - drumX1) * 0.5, drumW * 0.5, '#64748b', 1.2);
        drawDeformedLine(drumX1 + (drumX2 - drumX1) * 0.5, drumW * 0.5, drumX1, drumW * 0.32, '#64748b', 1.2);
        drawDeformedLine(drumX1, drumW * 0.32, drumX1, -drumW * 0.32, '#64748b', 1.2);

        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        const steps = 10;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const cx = drumX2 - 2 + (drumX1 + 8 - (drumX2 - 2)) * t;
          const cy = -drumW * 0.22 * (1 - t) + drumW * 0.26 * t + 6 * t * (1 - t);
          const [dcx, dcy] = deform(cx, cy);
          if (i === 0) ctx.moveTo(dcx, dcy);
          else ctx.lineTo(dcx, dcy);
        }
        ctx.stroke();

        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const cx = drumX2 - 8 + (drumX1 + 3 - (drumX2 - 8)) * t;
          const cy = -drumW * 0.28 * (1 - t) + drumW * 0.24 * t + 8 * t * (1 - t);
          const [dcx, dcy] = deform(cx, cy);
          if (i === 0) ctx.moveTo(dcx, dcy);
          else ctx.lineTo(dcx, dcy);
        }
        ctx.stroke();

        drawDeformedRect(drumX1 - 5, -2, 6, 4, '#475569');

      } else if (car.type === 'garbage_truck') {
        drawDeformedCircle(cabinX, -cabinW * 0.35, 2.2, '#f59e0b');
        drawDeformedCircle(cabinX, cabinW * 0.35, 2.2, '#f59e0b');

        const compX1 = -halfL + rc + 7;
        const compX2 = cabinX - cabinL / 2 - 1.5;
        const compW = halfW * 2 - 1.5;
        drawDeformedRect(compX1, -compW / 2, compX2 - compX1, compW, '#16a34a');
        drawDeformedLine(compX1, -compW / 2, compX2, -compW / 2, '#14532d', 1.2);
        drawDeformedLine(compX2, -compW / 2, compX2, compW / 2, '#14532d', 1.2);
        drawDeformedLine(compX2, compW / 2, compX1, compW / 2, '#14532d', 1.2);
        drawDeformedLine(compX1, compW / 2, compX1, -compW / 2, '#14532d', 1.2);

        for (let rx = compX1 + 6; rx < compX2 - 4; rx += 7) {
          drawDeformedLine(rx, -compW / 2, rx, compW / 2, '#15803d', 1.2);
        }

        drawDeformedRect(compX1 - 4, -compW / 2 - 0.5, 4, compW + 1, '#0f172a');
        drawDeformedRect(compX1 - 5, -compW / 2 + 2, 2, 3, '#f59e0b');
        drawDeformedRect(compX1 - 5, compW / 2 - 5, 2, 3, '#f59e0b');

        const compMidX = compX1 + (compX2 - compX1) * 0.5;
        drawDeformedCircle(compMidX, 0, 4, '#ffffff');
        drawDeformedCircle(compMidX, 0, 2.5, '#16a34a');
      }

      // Emergency roof sirens (strobe) with strict sirenOn check
      if (car.type === 'police' || car.type === 'fire_engine' || car.type === 'ambulance') {
        const isSirenActive = car.sirenOn === true;
        const strobe = isSirenActive ? (Math.floor(Date.now() / 90) % 4) : -1;

        drawDeformedRect(cabinX - 1.5, -cabinW * 0.45, 3, cabinW * 0.9, '#0f172a');

        const primaryColor = car.type === 'fire_engine' ? '#ef4444' : '#3b82f6';
        const secondaryColor = car.type === 'fire_engine' ? '#3b82f6' : '#ef4444';

        if (strobe === 0 || strobe === 1) {
          drawDeformedRect(cabinX - 1, -cabinW * 0.4, 2, cabinW * 0.35, primaryColor);
        } else {
          drawDeformedRect(cabinX - 1, -cabinW * 0.4, 2, cabinW * 0.35, isSirenActive ? '#1e3a8a' : '#1e293b');
        }

        if (strobe === 2 || strobe === 3) {
          drawDeformedRect(cabinX - 1, cabinW * 0.05, 2, cabinW * 0.35, secondaryColor);
        } else {
          drawDeformedRect(cabinX - 1, cabinW * 0.05, 2, cabinW * 0.35, isSirenActive ? '#7f1d1d' : '#311010');
        }

        drawDeformedRect(cabinX - 1.2, -1, 2.4, 2, '#ffffff');

        if (isSirenActive && nightAlpha > 0.05) {
          ctx.save();
          ctx.globalCompositeOperation = 'screen';

          const [dcabinX, dcabinY1] = deform(cabinX, -cabinW * 0.3);
          const [dcabinX2, dcabinY2] = deform(cabinX, cabinW * 0.3);

          const leftGlow = ctx.createRadialGradient(dcabinX, dcabinY1, 1, dcabinX, dcabinY1, 22);
          leftGlow.addColorStop(0, (strobe === 0 || strobe === 1) ? 'rgba(59, 130, 246, 0.45)' : 'rgba(59, 130, 246, 0.15)');
          leftGlow.addColorStop(1, 'rgba(59, 130, 246, 0)');
          ctx.fillStyle = leftGlow;
          ctx.beginPath(); ctx.arc(dcabinX, dcabinY1, 22, 0, Math.PI * 2); ctx.fill();

          const rightGlow = ctx.createRadialGradient(dcabinX2, dcabinY2, 1, dcabinX2, dcabinY2, 22);
          rightGlow.addColorStop(0, (strobe === 2 || strobe === 3) ? 'rgba(239, 68, 68, 0.45)' : 'rgba(239, 68, 68, 0.15)');
          rightGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.fillStyle = rightGlow;
          ctx.beginPath(); ctx.arc(dcabinX2, dcabinY2, 22, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }

      // Night/Weather Tint for the cabins (since drawn above lightmap)
      if (nightAlpha > 0.05) {
        ctx.fillStyle = `rgba(0, 0, 15, ${nightAlpha * 0.72})`;
        ctx.beginPath();
        ctx.moveTo(bodyPoly[0].x, bodyPoly[0].y);
        for (let i = 1; i < bodyPoly.length; i++) {
          ctx.lineTo(bodyPoly[i].x, bodyPoly[i].y);
        }
        ctx.closePath();
        ctx.fill();
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

    const fogFactor = isFog ? (1.0 - 0.55 * weatherTransition) : 1.0;

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

    const getStreetLampOn = (prop: StreetProp) => {
      if (prop.type !== 'lamp' || prop.isBroken) return false;
      const lampHash = Math.sin(prop.x * 12.9898 + prop.y * 78.233) * 43758.5453;
      const randVal = lampHash - Math.floor(lampHash);
      
      const sunsetHour = 17.2 + randVal * 1.8; // Turn on between 17:12 and 19:00
      const sunriseHour = 5.0 + randVal * 1.8; // Turn off between 05:00 and 06:48
      
      let on = false;
      if (timeHour >= sunsetHour || timeHour < sunriseHour) {
        on = true;
      }
      
      const isTransitioning = Math.abs(timeHour - sunsetHour) < 0.04 || Math.abs(timeHour - sunriseHour) < 0.04;
      if (isTransitioning && on) {
        if (Math.sin(Date.now() * 0.04 + randVal * 20) > 0.25) {
          on = false; // Flickering effect
        }
      }
      return on;
    };

    const getVehicleHeadlightOn = (car: Vehicle) => {
      if (car.isPlayerControlled) return car.headlightsOn;
      if (car.headlightsOn) return true;
      if (car.isParked) return false;
      if (isRaining || isFog) return true;

      // Dynamic sunset/sunrise headlights
      const stringId = car.id || 'car';
      let sum = 0;
      for (let i = 0; i < stringId.length; i++) sum += stringId.charCodeAt(i);
      const carHash = Math.sin(sum * 12.9898) * 43758.5453;
      const randVal = carHash - Math.floor(carHash);

      const sunsetHour = 17.0 + randVal * 1.6; // Turn on between 17:00 and 18:36
      const sunriseHour = 5.2 + randVal * 1.6; // Turn off between 05:12 and 06:48

      return (timeHour >= sunsetHour || timeHour < sunriseHour);
    };

    // A. Headlight Cone Cutouts
    for (const car of nearbyVehicles) {
      const cosA = Math.cos(car.angle);
      const sinA = Math.sin(car.angle);
      const halfL = car.length / 2;
      const halfW = car.width / 2;

      const isHighBeam = car.headlightMode === 'high';
      const beamLen = (isHighBeam ? 350 : 220) * fogFactor;
      const beamSpread = (isHighBeam ? 75 : 52) * fogFactor;
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

      const hasHeadlightsOn = getVehicleHeadlightOn(car);

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

      if (hasHeadlightsOn) {
        cutHeadlightBeam(leftLampLX, leftLampLY, dmg.leftHeadlightBroken);
        cutHeadlightBeam(rightLampLX, rightLampLY, dmg.rightHeadlightBroken);
      }

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
        const targetRadius = radius * fogFactor;
        const radGrad = lCtx.createRadialGradient(rx, ry, 0.5, rx, ry, targetRadius);
        radGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
        radGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)');
        radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        lCtx.fillStyle = radGrad;
        lCtx.beginPath();
        lCtx.arc(rx, ry, targetRadius, 0, Math.PI * 2);
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
      const carGradRadius = 45 * fogFactor;
      const carGrad = lCtx.createRadialGradient(car.x, car.y, 2, car.x, car.y, carGradRadius);
      carGrad.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
      carGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lCtx.fillStyle = carGrad;
      lCtx.beginPath();
      lCtx.arc(car.x, car.y, carGradRadius, 0, Math.PI * 2);
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
      if (getStreetLampOn(prop) && prop.x >= minX && prop.x <= maxX && prop.y >= minY && prop.y <= maxY) {
        const lampRadius = 110 * fogFactor;
        const lampGrad = lCtx.createRadialGradient(prop.x, prop.y, 5, prop.x, prop.y, lampRadius);
        lampGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
        lampGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)');
        lampGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        lCtx.fillStyle = lampGrad;
        lCtx.beginPath();
        lCtx.arc(prop.x, prop.y, lampRadius, 0, Math.PI * 2);
        lCtx.fill();
      }
    }

    // D. Traffic Light Cutouts
    for (const prop of props) {
      if (prop.type === 'traffic_light' && !prop.isBroken && prop.x >= minX - 60 && prop.x <= maxX + 60 && prop.y >= minY - 60 && prop.y <= maxY + 60) {
        const tfRadius = 50 * fogFactor;
        const tfGrad = lCtx.createRadialGradient(prop.x, prop.y, 2, prop.x, prop.y, tfRadius);
        tfGrad.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
        tfGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        lCtx.fillStyle = tfGrad;
        lCtx.beginPath();
        lCtx.arc(prop.x, prop.y, tfRadius, 0, Math.PI * 2);
        lCtx.fill();
      }
    }

    // E. Building Entrance, Balcony, and Fire Escape Light Cutouts
    for (const bld of world.buildings) {
      if (bld.x + bld.width < minX || bld.x > maxX || bld.y + bld.height < minY || bld.y > maxY) continue;

      // 1. Entrance Light Cutout
      if (bld.entranceSide) {
        let lightCX = 0, lightCY = 0;
        if (bld.entranceSide === 'north') {
          lightCX = bld.x + bld.width / 2;
          lightCY = bld.y - 6;
        } else if (bld.entranceSide === 'south') {
          lightCX = bld.x + bld.width / 2;
          lightCY = bld.y + bld.height + 6;
        } else if (bld.entranceSide === 'west') {
          lightCX = bld.x - 6;
          lightCY = bld.y + bld.height / 2;
        } else if (bld.entranceSide === 'east') {
          lightCX = bld.x + bld.width + 6;
          lightCY = bld.y + bld.height / 2;
        }

        const entRadius = 45 * fogFactor;
        const entGrad = lCtx.createRadialGradient(lightCX, lightCY, 1, lightCX, lightCY, entRadius);
        entGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
        entGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.45)');
        entGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        lCtx.fillStyle = entGrad;
        lCtx.beginPath();
        lCtx.arc(lightCX, lightCY, entRadius, 0, Math.PI * 2);
        lCtx.fill();
      }

      // 2. Balcony Light Cutout
      if (bld.balconies) {
        for (const bal of bld.balconies) {
          let cx = 0, cy = 0;
          if (bal.side === 'north') {
            cx = bld.x + bld.width * bal.offset;
            cy = bld.y - bal.depth / 2;
          } else if (bal.side === 'south') {
            cx = bld.x + bld.width * bal.offset;
            cy = bld.y + bld.height + bal.depth / 2;
          } else if (bal.side === 'west') {
            cx = bld.x - bal.depth / 2;
            cy = bld.y + bld.height * bal.offset;
          } else if (bal.side === 'east') {
            cx = bld.x + bld.width + bal.depth / 2;
            cy = bld.y + bld.height * bal.offset;
          }

          const balRadius = 35 * fogFactor;
          const balGrad = lCtx.createRadialGradient(cx, cy, 1, cx, cy, balRadius);
          balGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
          balGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
          balGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          lCtx.fillStyle = balGrad;
          lCtx.beginPath();
          lCtx.arc(cx, cy, balRadius, 0, Math.PI * 2);
          lCtx.fill();
        }
      }

      // 3. Fire Escape Light Cutout
      if (bld.fireEscapes) {
        for (const fe of bld.fireEscapes) {
          let cx = 0, cy = 0;
          if (fe.side === 'north') {
            cx = bld.x + bld.width * fe.offset;
            cy = bld.y - fe.depth / 2;
          } else if (fe.side === 'south') {
            cx = bld.x + bld.width * fe.offset;
            cy = bld.y + bld.height + fe.depth / 2;
          } else if (fe.side === 'west') {
            cx = bld.x - fe.depth / 2;
            cy = bld.y + bld.height * fe.offset;
          } else if (fe.side === 'east') {
            cx = bld.x + bld.width + fe.depth / 2;
            cy = bld.y + bld.height * fe.offset;
          }

          const feRadius = 30 * fogFactor;
          const feGrad = lCtx.createRadialGradient(cx, cy, 1, cx, cy, feRadius);
          feGrad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
          feGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
          feGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          lCtx.fillStyle = feGrad;
          lCtx.beginPath();
          lCtx.arc(cx, cy, feRadius, 0, Math.PI * 2);
          lCtx.fill();
        }
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
      if (getStreetLampOn(prop) && prop.x >= minX && prop.x <= maxX && prop.y >= minY && prop.y <= maxY) {
        const poolRadius = 80 * fogFactor;
        const poolGrad = ctx.createRadialGradient(prop.x, prop.y, 4, prop.x, prop.y, poolRadius);
        poolGrad.addColorStop(0, `rgba(255, 230, 150, ${0.45 * fogFactor})`);
        poolGrad.addColorStop(0.5, `rgba(255, 200, 50, ${0.15 * fogFactor})`);
        poolGrad.addColorStop(1, 'rgba(255, 200, 50, 0)');
        ctx.fillStyle = poolGrad;
        ctx.beginPath();
        ctx.arc(prop.x, prop.y, poolRadius, 0, Math.PI * 2);
        ctx.fill();

        const bulbRadius = 20 * fogFactor;
        const bulbGlow = ctx.createRadialGradient(prop.x, prop.y, 1, prop.x, prop.y, bulbRadius);
        bulbGlow.addColorStop(0, `rgba(255, 255, 220, ${0.9 * fogFactor})`);
        bulbGlow.addColorStop(0.5, `rgba(255, 220, 100, ${0.5 * fogFactor})`);
        bulbGlow.addColorStop(1, 'rgba(255, 200, 50, 0)');
        ctx.fillStyle = bulbGlow;
        ctx.beginPath();
        ctx.arc(prop.x, prop.y, bulbRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // B. Vehicle Headlight Beams (Additive)
    for (const car of nearbyVehicles) {
      const cosA = Math.cos(car.angle);
      const sinA = Math.sin(car.angle);
      const halfL = car.length / 2;
      const halfW = car.width / 2;

      const isHighBeam = car.headlightMode === 'high';
      const beamLen = (isHighBeam ? 400 : 220) * fogFactor;
      const beamSpread = (isHighBeam ? 85 : 55) * fogFactor;
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

      const hasHeadlightsOn = getVehicleHeadlightOn(car);

      const drawHeadlightAdd = (lxOffset: number, lyOffset: number, broken: boolean) => {
        if (broken) return;
        const lx = car.x + cosA * lxOffset - sinA * lyOffset;
        const ly = car.y + sinA * lxOffset + cosA * lyOffset;

        // More balanced volumetric beam effect
        const hGlow = ctx.createRadialGradient(lx, ly, 2, lx + cosA * (beamLen * 0.45), ly + sinA * (beamLen * 0.45), beamLen);
        const intensity = (isHighBeam ? 0.65 : 0.42) * fogFactor;
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
        const flareSize = (isHighBeam ? 6 : 4) * fogFactor;
        const flare = ctx.createRadialGradient(lx, ly, 0, lx, ly, flareSize);
        flare.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        flare.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = flare;
        ctx.beginPath(); ctx.arc(lx, ly, flareSize, 0, Math.PI * 2); ctx.fill();
      };

      if (hasHeadlightsOn) {
        drawHeadlightAdd(leftLampLX, leftLampLY, dmg.leftHeadlightBroken);
        drawHeadlightAdd(rightLampLX, rightLampLY, dmg.rightHeadlightBroken);
      }

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
        const targetRadius = radius * fogFactor;
        const grad = ctx.createRadialGradient(0, 0, 0.5, 0, 0, targetRadius);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.save(); ctx.translate(rx, ry); ctx.beginPath(); ctx.arc(0, 0, targetRadius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
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
        const state = phase.nsState;
        if (state === 'green') {
          lightColor = 'rgba(34, 197, 94, 0.95)';
        } else if (state === 'green_flashing') {
          lightColor = Math.floor(Date.now() / 250) % 2 === 0 ? 'rgba(34, 197, 94, 0.95)' : 'rgba(0, 0, 0, 0)';
        } else if (state === 'yellow') {
          lightColor = 'rgba(234, 179, 8, 0.95)';
        } else {
          lightColor = 'rgba(239, 68, 68, 0.95)';
        }
      } else {
        const state = phase.ewState;
        if (state === 'green') {
          lightColor = 'rgba(34, 197, 94, 0.95)';
        } else if (state === 'green_flashing') {
          lightColor = Math.floor(Date.now() / 250) % 2 === 0 ? 'rgba(34, 197, 94, 0.95)' : 'rgba(0, 0, 0, 0)';
        } else if (state === 'yellow') {
          lightColor = 'rgba(234, 179, 8, 0.95)';
        } else {
          lightColor = 'rgba(239, 68, 68, 0.95)';
        }
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

    // E. Building Entrance, Balcony, and Fire Escape Additive Glow Pools
    for (const bld of world.buildings) {
      if (bld.x + bld.width < minX || bld.x > maxX || bld.y + bld.height < minY || bld.y > maxY) continue;

      // 1. Entrance warm additive pool and glow bulb
      if (bld.entranceSide) {
        let lightCX = 0, lightCY = 0;
        if (bld.entranceSide === 'north') {
          lightCX = bld.x + bld.width / 2;
          lightCY = bld.y - 6;
        } else if (bld.entranceSide === 'south') {
          lightCX = bld.x + bld.width / 2;
          lightCY = bld.y + bld.height + 6;
        } else if (bld.entranceSide === 'west') {
          lightCX = bld.x - 6;
          lightCY = bld.y + bld.height / 2;
        } else if (bld.entranceSide === 'east') {
          lightCX = bld.x + bld.width + 6;
          lightCY = bld.y + bld.height / 2;
        }

        const poolRadius = 35 * fogFactor;
        const poolGrad = ctx.createRadialGradient(lightCX, lightCY, 2, lightCX, lightCY, poolRadius);
        // Beautiful warm yellow-orange porch light glow!
        poolGrad.addColorStop(0, `rgba(254, 240, 138, ${0.40 * fogFactor})`);
        poolGrad.addColorStop(0.4, `rgba(251, 191, 36, ${0.15 * fogFactor})`);
        poolGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = poolGrad;
        ctx.beginPath();
        ctx.arc(lightCX, lightCY, poolRadius, 0, Math.PI * 2);
        ctx.fill();

        // Little glowing bulb core
        const bulbRadius = 6 * fogFactor;
        const bulbGrad = ctx.createRadialGradient(lightCX, lightCY, 0.5, lightCX, lightCY, bulbRadius);
        bulbGrad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * fogFactor})`);
        bulbGrad.addColorStop(0.5, `rgba(254, 240, 138, ${0.6 * fogFactor})`);
        bulbGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = bulbGrad;
        ctx.beginPath();
        ctx.arc(lightCX, lightCY, bulbRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Balcony warm additive pool
      if (bld.balconies) {
        for (const bal of bld.balconies) {
          let cx = 0, cy = 0;
          if (bal.side === 'north') {
            cx = bld.x + bld.width * bal.offset;
            cy = bld.y - bal.depth / 2;
          } else if (bal.side === 'south') {
            cx = bld.x + bld.width * bal.offset;
            cy = bld.y + bld.height + bal.depth / 2;
          } else if (bal.side === 'west') {
            cx = bld.x - bal.depth / 2;
            cy = bld.y + bld.height * bal.offset;
          } else if (bal.side === 'east') {
            cx = bld.x + bld.width + bal.depth / 2;
            cy = bld.y + bld.height * bal.offset;
          }

          const poolRadius = 25 * fogFactor;
          const poolGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, poolRadius);
          // Soft cyan sliding door light bleed
          poolGrad.addColorStop(0, `rgba(165, 243, 252, ${0.30 * fogFactor})`);
          poolGrad.addColorStop(0.5, `rgba(56, 189, 248, ${0.10 * fogFactor})`);
          poolGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = poolGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, poolRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. Fire Escape soft orange security light pool
      if (bld.fireEscapes) {
        for (const fe of bld.fireEscapes) {
          let cx = 0, cy = 0;
          if (fe.side === 'north') {
            cx = bld.x + bld.width * fe.offset;
            cy = bld.y - fe.depth / 2;
          } else if (fe.side === 'south') {
            cx = bld.x + bld.width * fe.offset;
            cy = bld.y + bld.height + fe.depth / 2;
          } else if (fe.side === 'west') {
            cx = bld.x - fe.depth / 2;
            cy = bld.y + bld.height * fe.offset;
          } else if (fe.side === 'east') {
            cx = bld.x + bld.width + fe.depth / 2;
            cy = bld.y + bld.height * fe.offset;
          }

          const poolRadius = 20 * fogFactor;
          const poolGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, poolRadius);
          // Soft orange security light
          poolGrad.addColorStop(0, `rgba(253, 186, 116, ${0.25 * fogFactor})`);
          poolGrad.addColorStop(0.6, `rgba(249, 115, 22, ${0.08 * fogFactor})`);
          poolGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
          ctx.fillStyle = poolGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, poolRadius, 0, Math.PI * 2);
          ctx.fill();
        }
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

    if (isFog && weatherTransition > 0.05) {
      // Draw a soft, drifting smoke/fog pattern or a beautiful multi-layered misty fog overlay!
      ctx.fillStyle = `rgba(226, 232, 240, ${0.35 * weatherTransition})`; // Soft slate-gray/white fog haze
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

      // Add dynamic drifting fog bands
      ctx.fillStyle = `rgba(241, 245, 249, ${0.12 * weatherTransition})`;
      const time = Date.now() * 0.0003;
      for (let i = 0; i < 5; i++) {
        const driftX = Math.sin(time + i * 1.5) * 50;
        const driftY = Math.cos(time * 0.7 + i * 2.1) * 30;
        const fy = minY + ((i + 0.5) / 5) * (maxY - minY) + driftY;
        
        ctx.beginPath();
        ctx.ellipse(minX + (maxX - minX) * 0.5 + driftX, fy, (maxX - minX) * 0.7, (maxY - minY) * 0.25, Math.sin(time * 0.2 + i) * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
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

  private renderGpsRoute(world: GameWorld, player: Player) {
    if (!world.gpsPath || world.gpsPath.length < 2 || !world.gpsDestination) return;
    const ctx = this.ctx;
    const path = world.gpsPath;

    ctx.save();

    // 1. Draw glowing neon cyan route path on road surface
    ctx.strokeStyle = '#06b6d4'; // Cyan
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 15;
    ctx.globalAlpha = 0.65;

    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();

    // Inner animated white dashed centerline
    const dashOffset = (Date.now() / 20) % 30;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.setLineDash([16, 14]);
    ctx.lineDashOffset = -dashOffset;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;

    // 2. Render Destination Flag Pin at target
    const dest = world.gpsDestination;
    const pulse = (Date.now() % 1200) / 1200;

    ctx.save();
    ctx.translate(dest.x, dest.y);

    // Target ground ring
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 25 + pulse * 20, 0, Math.PI * 2);
    ctx.stroke();

    // Floating pin
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚩', 0, -1);

    ctx.restore();
    ctx.restore();
  }

  private renderCloudShadows(minX: number, minY: number, maxX: number, maxY: number) {
    const ctx = this.ctx;
    const time = Date.now() * 0.00005;
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    
    for (const shadow of this.cloudShadows) {
      // Move shadow
      shadow.x = (shadow.x + time * 50) % 8000;
      shadow.y = (shadow.y + time * 20) % 8000;
      
      // Draw if in view
      if (shadow.x + shadow.size > minX && shadow.x - shadow.size < maxX &&
          shadow.y + shadow.size > minY && shadow.y - shadow.size < maxY) {
        
        ctx.beginPath();
        ctx.ellipse(shadow.x, shadow.y, shadow.size, shadow.size * 0.6, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
