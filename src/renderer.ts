import { 
  ActivePlacement,
  Bird,
  Building, 
  Camera, 
  GameWorld, 
  GroundItem,
  Pedestrian, 
  Player, 
  Puddle,
  SidewalkBlock,
  StreetProp, 
  TimeOfDay, 
  Tree,
  Vehicle,
  VehicleDamage
} from './types';
import { trafficDiagnostics } from './aiTraffic';
import {
  renderSpecializedVehicleAttachments,
  getVehicleBasePolygon,
  getVehicleCabinDimensions,
  renderVehicleGreenhouseAndBodyPanels
} from './vehicleVisuals';
import { performanceConfig } from './performanceConfig';
import { generateBuildingLayout, renderBuildingInterior } from './buildingInteriors';
import { drawItemModel2D } from './itemGraphic';
import { screenEffectsSystem } from './screenEffects';

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
};

// --- SAFE CANVAS PRIMITIVES TO PREVENT IndexSizeError DOMExceptions ---
function safeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number = 0
) {
  if (!isFinite(x) || !isFinite(y) || !isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return;
  const r = Math.min(Math.max(0, isFinite(radius) ? radius : 0), w / 2, h / 2);
  if (typeof ctx.roundRect === 'function') {
    try {
      ctx.roundRect(x, y, w, h, r);
      return;
    } catch {
      // Fall through to path fallback if roundRect throws IndexSizeError
    }
  }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
}

function safeEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  rotation: number,
  startAngle: number,
  endAngle: number,
  counterclockwise?: boolean
) {
  if (!isFinite(x) || !isFinite(y)) return;
  const rx = Math.max(0.001, isFinite(radiusX) ? Math.abs(radiusX) : 0.001);
  const ry = Math.max(0.001, isFinite(radiusY) ? Math.abs(radiusY) : 0.001);
  const rot = isFinite(rotation) ? rotation : 0;
  try {
    ctx.ellipse(x, y, rx, ry, rot, startAngle, endAngle, counterclockwise);
  } catch {
    // Ignore invalid parameters safely
  }
}

function safeArc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  counterclockwise?: boolean
) {
  if (!isFinite(x) || !isFinite(y)) return;
  const r = Math.max(0, isFinite(radius) ? radius : 0);
  try {
    ctx.arc(x, y, r, startAngle, endAngle, counterclockwise);
  } catch {
    // Ignore invalid parameters safely
  }
}

function safeRadialGradient(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  r0: number,
  x1: number,
  y1: number,
  r1: number
): CanvasGradient {
  const safeX0 = isFinite(x0) ? x0 : 0;
  const safeY0 = isFinite(y0) ? y0 : 0;
  const safeX1 = isFinite(x1) ? x1 : 0;
  const safeY1 = isFinite(y1) ? y1 : 0;
  const safeR0 = Math.max(0, isFinite(r0) ? r0 : 0);
  const safeR1 = Math.max(0, isFinite(r1) ? r1 : 0);
  try {
    return ctx.createRadialGradient(safeX0, safeY0, safeR0, safeX1, safeY1, safeR1);
  } catch {
    // Return dummy transparent gradient on failure
    const dummy = ctx.createLinearGradient(0, 0, 1, 1);
    dummy.addColorStop(0, 'rgba(0,0,0,0)');
    return dummy;
  }
}

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = window.innerWidth;
  private height: number = window.innerHeight;
  private cloudShadows: {x: number, y: number, size: number}[] = [];

  // Offscreen buffer for the Lightmap (prevents punching holes in the world)
  private lightmapCanvas: HTMLCanvasElement;
  private lightmapCtx: CanvasRenderingContext2D;

  // Offscreen Chunk Cache for static world geometry (Ground, Sidewalks, Roads, Parkings)
  private chunkCache = new Map<string, HTMLCanvasElement>();
  private chunkSize: number = 1000;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.lightmapCanvas = document.createElement('canvas');
    this.lightmapCtx = this.lightmapCanvas.getContext('2d')!;
    this.resize(this.width, this.height);
    
    for(let i=0; i<15; i++) {
      this.cloudShadows.push({x: Math.random() * 8000, y: Math.random() * 8000, size: 100 + Math.random() * 200});
    }
  }

  private renderChunkStatic(
    chunkCtx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    world: GameWorld
  ) {
    const chunkX = cx * this.chunkSize;
    const chunkY = cy * this.chunkSize;
    const minX = chunkX;
    const minY = chunkY;
    const maxX = chunkX + this.chunkSize;
    const maxY = chunkY + this.chunkSize;

    chunkCtx.save();
    // Translate standard world coordinates so standard draw functions draw directly into chunk canvas
    chunkCtx.translate(-chunkX, -chunkY);

    // 1. Terrain Base
    this.renderGround(chunkCtx, world, minX, minY, maxX, maxY);

    // 2. Sidewalks intersecting this chunk
    const chunkSidewalks = world.sidewalks.filter(sw => 
      sw.x + sw.width >= minX && sw.x <= maxX && sw.y + sw.height >= minY && sw.y <= maxY
    );
    this.renderSidewalks(chunkCtx, chunkSidewalks, minX, minY, maxX, maxY);

    // 3. Roads & Markings
    this.renderRoadsAndMarkings(chunkCtx, world, minX, minY, maxX, maxY);

    // 4. Parking lots
    this.renderParkings(chunkCtx, world, minX, minY, maxX, maxY);

    chunkCtx.restore();
  }

  private getChunkCanvas(cx: number, cy: number, world: GameWorld): HTMLCanvasElement {
    const key = `${cx},${cy}`;
    let canvas = this.chunkCache.get(key);
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = this.chunkSize;
      canvas.height = this.chunkSize;
      const chunkCtx = canvas.getContext('2d', { alpha: false })!;
      this.renderChunkStatic(chunkCtx, cx, cy, world);
      this.chunkCache.set(key, canvas);
    }
    return canvas;
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
    visibleSidewalks?: SidewalkBlock[],
    activePlacement?: ActivePlacement | null,
    mouseWorldPos?: { x: number; y: number } | null
  ) {
    const ctx = this.ctx;

    // Apply pre-render physiological camera micro-jitter (cold shivering, shock tremors)
    screenEffectsSystem.applyPreRenderCameraModifiers(camera, player, 0.016);

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

    // Early-out if inside a building (make the surrounding world pitch black except for window sight cones)
    if (player && player.isInsideBuilding && player.insideBuildingId) {
      // 1. Clear Screen to Pitch Black
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.save();

      // 2. Camera Transformations
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

      // Find the specific building and render its interior + outside world through windows
      const bld = world.buildings.find(b => b.id === player.insideBuildingId);
      if (bld) {
        const windows: { x: number; y: number; side: 'top' | 'bottom' | 'left' | 'right' }[] = [];
        for (let x = 30; x < bld.width - 30; x += 40) {
          windows.push({ x, y: 0, side: 'top' });
          windows.push({ x, y: bld.height, side: 'bottom' });
        }
        for (let y = 30; y < bld.height - 30; y += 40) {
          windows.push({ x: 0, y, side: 'left' });
          windows.push({ x: bld.width, y, side: 'right' });
        }

        // Filter windows: only show outside view when player approaches them and looks towards them
        const activeWindows = windows.filter(win => {
          const wx = bld.x + win.x;
          const wy = bld.y + win.y;
          const dist = Math.hypot(player.x - wx, player.y - wy);
          if (dist > 180) return false;

          // Check if player is facing towards the window
          const dirX = wx - player.x;
          const dirY = wy - player.y;
          const len = Math.hypot(dirX, dirY) || 1;
          const ndx = dirX / len;
          const ndy = dirY / len;

          const playerDirX = Math.cos(player.angle);
          const playerDirY = Math.sin(player.angle);
          const dot = playerDirX * ndx + playerDirY * ndy;
          // dot > -0.3 means player is generally facing towards or near the window direction
          return dot > -0.3;
        });

        ctx.save();
        ctx.beginPath();
        const viewDist = 450;
        for (const win of activeWindows) {
          const wx = bld.x + win.x;
          const wy = bld.y + win.y;
          let w1x = wx, w1y = wy, w2x = wx, w2y = wy;
          if (win.side === 'top' || win.side === 'bottom') {
            w1x = wx - 7;
            w2x = wx + 7;
          } else {
            w1y = wy - 7;
            w2y = wy + 7;
          }

          // Directional vectors from player's eyes to window outer corners
          const dx1 = w1x - player.x;
          const dy1 = w1y - player.y;
          const dx2 = w2x - player.x;
          const dy2 = w2y - player.y;

          const len1 = Math.hypot(dx1, dy1) || 1;
          const len2 = Math.hypot(dx2, dy2) || 1;

          // Extend rays out into the world to construct the visibility cone
          const o1x = w1x + (dx1 / len1) * viewDist;
          const o1y = w1y + (dy1 / len1) * viewDist;
          const o2x = w2x + (dx2 / len2) * viewDist;
          const o2y = w2y + (dy2 / len2) * viewDist;

          ctx.moveTo(w1x, w1y);
          ctx.lineTo(o1x, o1y);
          ctx.lineTo(o2x, o2y);
          ctx.lineTo(w2x, w2y);
          ctx.closePath();
        }

        if (activeWindows.length > 0) {
          ctx.clip();

          // Apply floor elevation height perspective (higher floors scale down the world to create height perspective / getting smaller, and render roofs instead of bases)
          const floor = player.currentFloor ?? 0;
          ctx.save();
          const heightScale = Math.max(0.45, 1.0 - floor * 0.05);
          const invScale = 1 / heightScale;
          const sMinX = camera.x - (camera.x - minX) * invScale;
          const sMaxX = camera.x + (maxX - camera.x) * invScale;
          const sMinY = camera.y - (camera.y - minY) * invScale;
          const sMaxY = camera.y + (maxY - camera.y) * invScale;

          // Scale around player / camera position so world shrinks towards viewer and covers full view
          ctx.translate(camera.x, camera.y);
          ctx.scale(heightScale, heightScale);
          ctx.translate(-camera.x, -camera.y);

          // Render Ground, Sidewalks, Roads, and Parkings via cached chunks for window outside view
          const sStartChunkX = Math.floor(Math.max(0, sMinX) / this.chunkSize);
          const sEndChunkX = Math.floor(Math.min(8000, sMaxX) / this.chunkSize);
          const sStartChunkY = Math.floor(Math.max(0, sMinY) / this.chunkSize);
          const sEndChunkY = Math.floor(Math.min(8000, sMaxY) / this.chunkSize);

          for (let cx = sStartChunkX; cx <= sEndChunkX; cx++) {
            for (let cy = sStartChunkY; cy <= sEndChunkY; cy++) {
              const chunkCanvas = this.getChunkCanvas(cx, cy, world);
              ctx.drawImage(chunkCanvas, cx * this.chunkSize, cy * this.chunkSize);
            }
          }

          this.renderPostSovietAtmosphereAndSignage(world, sMinX, sMinY, sMaxX, sMaxY);
          this.renderPuddles(world.puddles, sMinX, sMinY, sMaxX, sMaxY);
          this.renderSkidMarks(world.skidMarks, sMinX, sMinY, sMaxX, sMaxY);
          this.renderStains(world.stains, sMinX, sMinY, sMaxX, sMaxY);
          // Render building roofs/tops instead of ground bases when viewed from height
          this.renderBuildingRoofsAndCanopies(visibleBuildings, nightAlpha, player);
          this.renderLitter(world.litter, sMinX, sMinY, sMaxX, sMaxY, nightAlpha);
          this.renderGroundItems(world.groundItems, player, sMinX, sMinY, sMaxX, sMaxY);
          this.renderGroundProps(vpProps, sMinX, sMinY, sMaxX, sMaxY);
          this.renderPedestrians(visiblePedestrians);
          this.renderVehicles(visibleVehicles, nightAlpha);

          // Render lightmap (street lights, car headlights, etc.) outside windows
          this.renderLightmap(world, timeHour, weatherTransition, visibleVehicles, vpProps, sMinX, sMinY, sMaxX, sMaxY);

          const isRaining = world.weather === 'rain' || world.weather === 'storm';
          const isFog = world.weather === 'fog';
          const effectiveAlpha = Math.max(nightAlpha, isRaining ? 0.35 * weatherTransition : 0, isFog ? 0.45 * weatherTransition : 0);
          this.renderVehicleCabins(visibleVehicles, effectiveAlpha);
          this.renderBuildingRoofsAndCanopies(visibleBuildings, nightAlpha, player);
          this.renderTreesAndTallProps(vpTrees, vpProps, sMinX, sMinY, sMaxX, sMaxY, nightAlpha);
          this.renderParticles(world.particles);

          // Apply outdoor time darkness filter over the clipped window view so night/sunset is accurate
          if (nightAlpha > 0) {
            ctx.fillStyle = `rgba(15, 23, 42, ${nightAlpha})`;
            ctx.fillRect(sMinX, sMinY, sMaxX - sMinX, sMaxY - sMinY);
          }
          ctx.restore();
        }
        ctx.restore();

        // 2. Render building interior itself on top
        const floor = player.currentFloor ?? 0;
        const layout = generateBuildingLayout(bld, floor);
        renderBuildingInterior(ctx, bld, layout, player, timeHour);
      }

      // Render player pedestrian inside
      if (!player.isInVehicle) {
        this.renderPlayerPedestrian(player);
      }

      ctx.restore();

      // Render full physiological screen effects pass (Pain vignette, Shock desaturation, Frost cyan, Amber wave)
      screenEffectsSystem.render(ctx, this.width, this.height, player, world);
      return;
    }

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

    // 3. Render Ground, Sidewalks, Roads, and Parkings via cached chunks
    const startChunkX = Math.floor(Math.max(0, minX) / this.chunkSize);
    const endChunkX = Math.floor(Math.min(8000, maxX) / this.chunkSize);
    const startChunkY = Math.floor(Math.max(0, minY) / this.chunkSize);
    const endChunkY = Math.floor(Math.min(8000, maxY) / this.chunkSize);

    for (let cx = startChunkX; cx <= endChunkX; cx++) {
      for (let cy = startChunkY; cy <= endChunkY; cy++) {
        const chunkCanvas = this.getChunkCanvas(cx, cy, world);
        ctx.drawImage(chunkCanvas, cx * this.chunkSize, cy * this.chunkSize);
      }
    }

    // 3a. Cloud Shadows (Atmosphere)
    this.renderCloudShadows(minX, minY, maxX, maxY);

    // 4b. Post-Soviet Atmosphere & Cyrillic Signage
    this.renderPostSovietAtmosphereAndSignage(world, minX, minY, maxX, maxY);

    // 5. Puddles (Road wet spots)
    this.renderPuddles(world.puddles, minX, minY, maxX, maxY);

    // 6. Skid Marks
    this.renderSkidMarks(world.skidMarks, minX, minY, maxX, maxY);

    // 6b. Fluid Stains (Oil, Coolant, Fuel on road surface - Layer 0)
    this.renderStains(world.stains, minX, minY, maxX, maxY);

    // 8. Buildings Base Structure & Entrances
    this.renderBuildingBases(visibleBuildings, nightAlpha, player, timeHour);

    // 8b. Street Litter & Flying Paper / Wind Debris
    this.renderLitter(world.litter, minX, minY, maxX, maxY, nightAlpha);

    // 8c. Dropped / Collectible Ground Items
    this.renderGroundItems(world.groundItems, player, minX, minY, maxX, maxY);

    // 9. Ground-level Props (Benches, Hydrants, Kiosks, Cones, Trash Cans, Mailboxes, and BROKEN lampposts!)
    this.renderGroundProps(vpProps, minX, minY, maxX, maxY);

    // 9b. Broken Traffic Lights (lying flat on the ground!)
    this.renderTrafficLights(world.intersections, vpProps.filter((p) => p.isBroken), minX, minY, maxX, maxY);

    // 10. Birds on the ground
    this.renderBirds(world.birds.filter((b) => b.state === 'ground'), minX, minY, maxX, maxY);

    // 12. Pedestrians (with Umbrellas during Rain)
    this.renderPedestrians(visiblePedestrians);

    // 13. Player on Foot (if not inside vehicle)
    if (!player.isInVehicle) {
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
    this.renderBuildingRoofsAndCanopies(visibleBuildings, nightAlpha, player);

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

    // 19. Creative Mode Active Placement Preview
    if (activePlacement && mouseWorldPos) {
      this.renderPlacementPreview(activePlacement, mouseWorldPos);
    }

    ctx.restore();

    // Render full physiological screen effects pass (Pain vignette, Shock desaturation, Frost cyan, Amber wave)
    screenEffectsSystem.render(ctx, this.width, this.height, player, world);
  }

  // --- GROUND & BASE TERRAIN ---
  private renderGround(ctx: CanvasRenderingContext2D, world: GameWorld, minX: number, minY: number, maxX: number, maxY: number) {
    
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
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number, minY: number, maxX: number, maxY: number
  ) {
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

    // 2. Highly Distinctive Shop Storefronts & Banners (Removed per user request)
    // No banners or text labels on building facades.

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

  // --- ORGANIC BLOB PATH HELPER ---
  private drawOrganicBlob(ctx: CanvasRenderingContext2D, rx: number, ry: number, seed: number) {
    ctx.beginPath();
    const numPoints = 16;
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const wave1 = Math.sin(angle * 3 + seed * 10) * 0.15;
      const wave2 = Math.cos(angle * 5 + seed * 17) * 0.08;
      const rScale = 1 + wave1 + wave2;
      const x = Math.cos(angle) * rx * rScale;
      const y = Math.sin(angle) * ry * rScale;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
  }

  // --- FLUID STAINS (OIL, COOLANT, FUEL ON ROAD SURFACE) ---
  private renderStains(stains: GameWorld['stains'], minX: number, minY: number, maxX: number, maxY: number) {
    if (!stains || stains.length === 0) return;
    const ctx = this.ctx;

    for (const stain of stains) {
      if (stain.x < minX - 30 || stain.x > maxX + 30 || stain.y < minY - 30 || stain.y > maxY + 30) continue;
      if (stain.alpha <= 0.01) continue;

      ctx.save();
      ctx.translate(stain.x, stain.y);

      const rx = Math.max(0.1, stain.radius);
      const ry = rx * 0.85;
      const seed = hashString(stain.id);

      if (stain.type === 'oil') {
        // Realistic dark oil stain with metallic gloss & amber rim
        const grad = safeRadialGradient(ctx, -rx * 0.15, -ry * 0.15, 0, 0, 0, rx);
        grad.addColorStop(0, `rgba(2, 6, 23, ${stain.alpha * 0.98})`); // Heavy black core
        grad.addColorStop(0.4, `rgba(15, 23, 42, ${stain.alpha * 0.92})`); // Dark viscous body
        grad.addColorStop(0.75, `rgba(120, 53, 4, ${stain.alpha * 0.75})`); // Golden/amber outer ring
        grad.addColorStop(0.9, `rgba(56, 189, 248, ${stain.alpha * 0.4})`); // Iridescent metallic sky sheen at edge
        grad.addColorStop(1, `rgba(56, 189, 248, 0)`);

        ctx.fillStyle = grad;
        this.drawOrganicBlob(ctx, rx, ry, seed);
        ctx.fill();

        // High gloss wet specular highlight
        ctx.fillStyle = `rgba(255, 255, 255, ${stain.alpha * 0.45})`;
        ctx.beginPath();
        safeEllipse(ctx, -rx * 0.22, -ry * 0.22, rx * 0.25, ry * 0.12, -0.12, 0, Math.PI * 2);
        ctx.fill();

      } else if (stain.type === 'coolant') {
        // Bright fluorescent neon antifreeze puddle
        const grad = safeRadialGradient(ctx, -rx * 0.1, -ry * 0.1, 0, 0, 0, rx);
        grad.addColorStop(0, `rgba(34, 197, 94, ${stain.alpha * 0.95})`); // Bright fluorescent green core
        grad.addColorStop(0.55, `rgba(132, 204, 22, ${stain.alpha * 0.75})`); // Lime neon green
        grad.addColorStop(0.85, `rgba(234, 179, 8, ${stain.alpha * 0.4})`); // Subtle yellowish tint at the boundary
        grad.addColorStop(1, `rgba(234, 179, 8, 0)`);

        ctx.fillStyle = grad;
        this.drawOrganicBlob(ctx, rx, ry, seed);
        ctx.fill();

        // Wet specular shine
        ctx.fillStyle = `rgba(255, 255, 255, ${stain.alpha * 0.4})`;
        ctx.beginPath();
        safeEllipse(ctx, -rx * 0.25, -ry * 0.2, rx * 0.2, ry * 0.1, -0.15, 0, Math.PI * 2);
        ctx.fill();

      } else if (stain.type === 'fuel') {
        // Highly realistic gasoline spill: amber iridescent thin-film interference rainbow pattern
        const grad = safeRadialGradient(ctx, -rx * 0.15, -ry * 0.15, 0, 0, 0, rx);
        grad.addColorStop(0, `rgba(15, 23, 42, ${stain.alpha * 0.3})`); // center thin wet film
        grad.addColorStop(0.18, `rgba(239, 68, 68, ${stain.alpha * 0.65})`); // Red ring
        grad.addColorStop(0.32, `rgba(234, 179, 8, ${stain.alpha * 0.6})`);  // Yellow ring
        grad.addColorStop(0.48, `rgba(34, 197, 94, ${stain.alpha * 0.65})`); // Green ring
        grad.addColorStop(0.65, `rgba(6, 182, 212, ${stain.alpha * 0.7})`);  // Cyan/blue ring
        grad.addColorStop(0.82, `rgba(168, 85, 247, ${stain.alpha * 0.65})`); // Purple/magenta outer ring
        grad.addColorStop(0.95, `rgba(236, 72, 153, ${stain.alpha * 0.35})`); // Pink edge
        grad.addColorStop(1, `rgba(236, 72, 153, 0)`);

        ctx.fillStyle = grad;
        this.drawOrganicBlob(ctx, rx, ry, seed);
        ctx.fill();

        // Soft sky sheen reflection on gasoline surface
        ctx.fillStyle = `rgba(255, 255, 255, ${stain.alpha * 0.35})`;
        ctx.beginPath();
        safeEllipse(ctx, -rx * 0.25, -ry * 0.22, rx * 0.3, ry * 0.15, -0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      if ((stain as any).onFire) {
        // Draw an intense flickering ground ember layer on top of the fluid surface
        const fireInt = (stain as any).fireIntensity || 0.1;
        const flicker = 1.0 + Math.sin(Date.now() * 0.022 + rx) * 0.12;
        const glowRad = rx * 1.1 * flicker;
        const glowGrad = safeRadialGradient(ctx, 0, 0, 0, 0, 0, glowRad);
        glowGrad.addColorStop(0, `rgba(254, 240, 138, ${stain.alpha * 0.95 * fireInt})`); // Bright yellow core
        glowGrad.addColorStop(0.25, `rgba(249, 115, 22, ${stain.alpha * 0.8 * fireInt})`); // Bright orange
        glowGrad.addColorStop(0.65, `rgba(220, 38, 38, ${stain.alpha * 0.45 * fireInt})`); // Deep red rim
        glowGrad.addColorStop(1.0, `rgba(220, 38, 38, 0)`);

        ctx.fillStyle = glowGrad;
        this.drawOrganicBlob(ctx, glowRad, glowRad * 0.85, seed + 1);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // --- PAVED SIDEWALKS, CURB STONES & BLOCK COURTYARDS ---
  private renderSidewalks(
    ctx: CanvasRenderingContext2D,
    sidewalks: SidewalkBlock[],
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) {

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

        // 4a. Inner Paved Plazas & Gathering Squares (Paved gathering squares, Fountain plazas)
        if (sw.plazas) {
          for (const pl of sw.plazas) {
            ctx.save();
            const plX = pl.x;
            const plY = pl.y;
            const plW = pl.width;
            const plH = pl.height;

            let plazaPave = '#94a3b8';
            let plazaBorder = '#cbd5e1';
            let plazaJoint = 'rgba(15, 23, 42, 0.18)';

            if (pl.style === 'cobblestone') {
              plazaPave = '#64748b';
              plazaBorder = '#94a3b8';
              plazaJoint = 'rgba(15, 23, 42, 0.28)';
            } else if (pl.style === 'tile') {
              plazaPave = '#cbd5e1';
              plazaBorder = '#f1f5f9';
              plazaJoint = 'rgba(30, 41, 59, 0.22)';
            } else if (pl.style === 'stone') {
              plazaPave = '#78716c';
              plazaBorder = '#a8a29e';
              plazaJoint = 'rgba(28, 25, 23, 0.25)';
            }

            if (pl.shape === 'circle') {
              const radius = plW / 2;
              const cx = plX + radius;
              const cy = plY + radius;

              // Shadow / curb
              ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
              ctx.beginPath();
              ctx.arc(cx + 2, cy + 2, radius + 2, 0, Math.PI * 2);
              ctx.fill();

              // Main circle fill
              ctx.fillStyle = plazaPave;
              ctx.beginPath();
              ctx.arc(cx, cy, radius, 0, Math.PI * 2);
              ctx.fill();

              // Outer curb
              ctx.strokeStyle = plazaBorder;
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.arc(cx, cy, radius, 0, Math.PI * 2);
              ctx.stroke();

              // Decorative concentric rings
              ctx.strokeStyle = plazaJoint;
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.arc(cx, cy, radius * 0.65, 0, Math.PI * 2);
              ctx.arc(cx, cy, radius * 0.35, 0, Math.PI * 2);
              ctx.stroke();

              // Radiating spoke joints
              ctx.beginPath();
              for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                ctx.moveTo(cx + Math.cos(a) * (radius * 0.35), cy + Math.sin(a) * (radius * 0.35));
                ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
              }
              ctx.stroke();
            } else {
              // Rectangular plaza
              ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
              ctx.fillRect(plX + 2, plY + 2, plW, plH);

              ctx.fillStyle = plazaPave;
              ctx.fillRect(plX, plY, plW, plH);

              // Grid joint lines
              ctx.strokeStyle = plazaJoint;
              ctx.lineWidth = 1;
              ctx.beginPath();
              const pTile = 24;
              for (let px = plX; px <= plX + plW; px += pTile) {
                ctx.moveTo(px, plY);
                ctx.lineTo(px, plY + plH);
              }
              for (let py = plY; py <= plY + plH; py += pTile) {
                ctx.moveTo(plX, py);
                ctx.lineTo(plX + plW, py);
              }
              ctx.stroke();

              // Outer curb border
              ctx.strokeStyle = plazaBorder;
              ctx.lineWidth = 2;
              ctx.strokeRect(plX, plY, plW, plH);
            }
            ctx.restore();
          }
        }

        // 4b. Inner Paved Walkways / Paths (Тротуары во дворах и парках)
        if (sw.walkways) {
          for (const wk of sw.walkways) {
            ctx.save();
            let pathColor = '#64748b'; // standard urban path
            let pathBorder = '#94a3b8';
            let pathJoint = 'rgba(15, 23, 42, 0.20)';

            if (wk.style === 'stone') {
              pathColor = '#78716c';
              pathBorder = '#a8a29e';
              pathJoint = 'rgba(28, 25, 23, 0.25)';
            } else if (wk.style === 'cobblestone') {
              pathColor = '#475569';
              pathBorder = '#64748b';
              pathJoint = 'rgba(15, 23, 42, 0.30)';
            } else if (wk.style === 'asphalt') {
              pathColor = '#334155';
              pathBorder = '#475569';
              pathJoint = 'transparent';
            }

            // Pavement base
            ctx.fillStyle = pathColor;
            ctx.fillRect(wk.x, wk.y, wk.width, wk.height);

            // Sidewalk tile joint lines
            if (pathJoint !== 'transparent') {
              ctx.strokeStyle = pathJoint;
              ctx.lineWidth = 1;
              ctx.beginPath();
              const wStep = Math.min(wk.width, wk.height) > 30 ? 24 : 18;
              if (wk.width > wk.height) {
                // Horizontal path: draw transverse joint lines
                for (let px = wk.x; px <= wk.x + wk.width; px += wStep) {
                  ctx.moveTo(px, wk.y);
                  ctx.lineTo(px, wk.y + wk.height);
                }
              } else {
                // Vertical path: draw transverse joint lines
                for (let py = wk.y; py <= wk.y + wk.height; py += wStep) {
                  ctx.moveTo(wk.x, py);
                  ctx.lineTo(wk.x + wk.width, py);
                }
              }
              ctx.stroke();
            }

            // Curb border edges
            ctx.strokeStyle = pathBorder;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(wk.x, wk.y, wk.width, wk.height);
            ctx.restore();
          }
        }
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
  private renderParkings(ctx: CanvasRenderingContext2D, world: GameWorld, minX: number, minY: number, maxX: number, maxY: number) {
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
  private renderBuildingBases(buildings: Building[], nightAlpha: number = 0, player?: Player, timeHour: number = 12) {
    const ctx = this.ctx;

    for (const bld of buildings) {
      if (bld.type === 'park_monument') {
        this.renderParkFountainBase(bld, nightAlpha);
        continue;
      }

      // Render building interior if player is inside this specific building
      if (player && player.isInsideBuilding && player.insideBuildingId === bld.id) {
        const floor = player.currentFloor ?? 0;
        const layout = generateBuildingLayout(bld, floor);
        renderBuildingInterior(ctx, bld, layout, player, timeHour);
        continue;
      }

      // 1. DROP SHADOW FOR BUILDING BLOCK
      if (performanceConfig.enableShadows) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
        ctx.fillRect(bld.x + 9, bld.y + 9, bld.width, bld.height);
      }

      // 2. BASE WALL STRUCTURE & FACADE TEXTURE
      ctx.fillStyle = bld.color;
      ctx.fillRect(bld.x, bld.y, bld.width, bld.height);

      // Distinctive architectural facade textures
      if (bld.type === 'panel_apartment') {
        // Concrete panel seam grid lines (швы между панелями)
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let px = bld.x + 20; px < bld.x + bld.width; px += 20) {
          ctx.moveTo(px, bld.y);
          ctx.lineTo(px, bld.y + bld.height);
        }
        for (let py = bld.y + 16; py < bld.y + bld.height; py += 16) {
          ctx.moveTo(bld.x, py);
          ctx.lineTo(bld.x + bld.width, py);
        }
        ctx.stroke();

        // Base plinth step
        ctx.fillStyle = '#475569';
        ctx.fillRect(bld.x, bld.y + bld.height - 3, bld.width, 3);
      } else if (bld.type === 'brick_residential') {
        // Red/Yellow brick mortar texture
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let py = bld.y + 6; py < bld.y + bld.height; py += 6) {
          ctx.moveTo(bld.x, py);
          ctx.lineTo(bld.x + bld.width, py);
        }
        ctx.stroke();
      } else if (bld.type === 'modern_residential') {
        // Ventilated facade panels with vibrant accent bands
        ctx.fillStyle = bld.accentColor;
        if (bld.width > bld.height) {
          ctx.fillRect(bld.x + 8, bld.y, 6, bld.height);
          ctx.fillRect(bld.x + bld.width - 14, bld.y, 6, bld.height);
        } else {
          ctx.fillRect(bld.x, bld.y + 8, bld.width, 6);
          ctx.fillRect(bld.x, bld.y + bld.height - 14, bld.width, 6);
        }
      } else if (bld.type === 'business_center') {
        // Glass curtain wall vertical mullions
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(bld.x, bld.y, bld.width, bld.height);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let gx = bld.x + 10; gx < bld.x + bld.width; gx += 10) {
          ctx.moveTo(gx, bld.y);
          ctx.lineTo(gx, bld.y + bld.height);
        }
        ctx.stroke();
      } else if (bld.type === 'shopping_mall' || bld.type === 'commercial' || bld.type === 'shop' || bld.type === 'tactical_store' || bld.type === 'auto_service_center' || bld.type === 'car_wash_station' || bld.type === 'pharmacy_store' || bld.type === 'supermarket_store' || bld.type === 'bakery_cafe' || bld.type === 'coffee_bistro' || bld.type === 'electronics_store' || bld.type === 'sports_store' || bld.type === 'fast_food_restaurant' || bld.type === 'pizzeria_restaurant' || bld.type === 'commercial_gallery' || bld.shopBrand !== undefined) {
        if (bld.shopBrand === 'pharmacy_36_6' || bld.type === 'pharmacy_store') {
          // --- АПТЕКА 36.6: MODERN PHARMACEUTICAL CLINICAL FACADE ---
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(bld.x, bld.y, bld.width, bld.height);

          // Top emerald green brand band
          ctx.fillStyle = '#065f46';
          ctx.fillRect(bld.x, bld.y, bld.width, 18);

          // Glass showcase windows at bottom with medicine displays
          ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
          ctx.fillRect(bld.x + 12, bld.y + bld.height - 18, bld.width - 24, 15);
          ctx.strokeStyle = '#059669';
          ctx.lineWidth = 1;
          ctx.strokeRect(bld.x + 12, bld.y + bld.height - 18, bld.width - 24, 15);

          // Animated pulsing green medical cross on the left & right
          const crossPulse = 0.7 + 0.3 * Math.sin(Date.now() / 300);
          const crossSize = 10;
          [bld.x + 22, bld.x + bld.width - 22].forEach(cx => {
            ctx.fillStyle = `rgba(16, 185, 129, ${0.4 * crossPulse})`;
            ctx.beginPath();
            ctx.arc(cx, bld.y + 9, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#10b981';
            ctx.fillRect(cx - 2.5, bld.y + 9 - crossSize / 2, 5, crossSize);
            ctx.fillRect(cx - crossSize / 2, bld.y + 9 - 2.5, crossSize, 5);

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 1, bld.y + 9 - crossSize / 2 + 1.5, 2, crossSize - 3);
            ctx.fillRect(cx - crossSize / 2 + 1.5, bld.y + 9 - 1, crossSize - 3, 2);
          });

          // Central Signboard
          const signW = Math.min(220, bld.width - 64);
          const signX = bld.x + (bld.width - signW) / 2;
          ctx.fillStyle = '#022c22';
          ctx.fillRect(signX, bld.y + 2, signW, 14);
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(signX, bld.y + 2, signW, 14);

          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('АПТЕКА 36.6 • МЕДИКАМЕНТЫ 24/7', signX + signW / 2, bld.y + 9);
        } else if (bld.shopBrand === 'pyaterochka') {
          // --- СУПЕРМАРКЕТ "ПЯТЁРОЧКА 24/7": SIGNATURE RED & GREEN GROCERY ---
          ctx.fillStyle = '#15803d';
          ctx.fillRect(bld.x, bld.y, bld.width, bld.height);

          // Vibrant Red brand header
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(bld.x, bld.y, bld.width, 22);

          // Glass showcase lower wall
          ctx.fillStyle = 'rgba(254, 240, 138, 0.28)';
          ctx.fillRect(bld.x + 15, bld.y + bld.height - 20, bld.width - 30, 17);
          ctx.strokeStyle = '#166534';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(bld.x + 15, bld.y + bld.height - 20, bld.width - 30, 17);

          // Red Round Emblem with Green Leaf & "5"
          const emblemX = bld.x + 24;
          const emblemY = bld.y + 11;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(emblemX, emblemY, 9, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(emblemX, emblemY, 7.5, 0, Math.PI * 2);
          ctx.fill();

          // Green leaf on top of emblem
          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.ellipse(emblemX + 3, emblemY - 6, 3, 1.8, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();

          // White "5" inside emblem
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('5', emblemX, emblemY + 1);

          // Signboard Text
          const pSignW = Math.min(240, bld.width - 65);
          const pSignX = bld.x + (bld.width - pSignW) / 2;
          ctx.fillStyle = '#991b1b';
          ctx.fillRect(pSignX, bld.y + 3, pSignW, 16);
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(pSignX, bld.y + 3, pSignW, 16);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('ПЯТЁРОЧКА 24/7 • ПРОДУКТЫ У ДОМА', pSignX + pSignW / 2, bld.y + 11);
        } else if (bld.shopBrand === 'cofix_bakery') {
          // --- КАФЕ & ПЕКАРНЯ "COFIX": MATTE BLACK & ORANGE URBAN AESTHETIC ---
          ctx.fillStyle = '#18181b';
          ctx.fillRect(bld.x, bld.y, bld.width, bld.height);

          // Vertical natural wood slats texture
          ctx.strokeStyle = 'rgba(180, 83, 9, 0.45)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let wx = bld.x + 8; wx < bld.x + bld.width - 8; wx += 8) {
            ctx.moveTo(wx, bld.y);
            ctx.lineTo(wx, bld.y + bld.height);
          }
          ctx.stroke();

          // Bakery Warm Amber Glass Storefront
          ctx.fillStyle = 'rgba(251, 146, 60, 0.3)';
          ctx.fillRect(bld.x + 12, bld.y + bld.height - 20, bld.width - 24, 16);
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 1;
          ctx.strokeRect(bld.x + 12, bld.y + bld.height - 20, bld.width - 24, 16);

          // Orange Neon Sign
          const cSignW = Math.min(230, bld.width - 50);
          const cSignX = bld.x + (bld.width - cSignW) / 2;
          ctx.fillStyle = '#09090b';
          ctx.fillRect(cSignX, bld.y + 3, cSignW, 16);
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cSignX, bld.y + 3, cSignW, 16);

          ctx.fillStyle = '#ea580c';
          ctx.font = 'bold 8.5px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('COFIX & BAKERY • СВЕЖИЙ КОФЕ И ВЫПЕЧКА', cSignX + cSignW / 2, bld.y + 11);
        } else if (bld.shopBrand === 'bean_bistro') {
          // --- КАФЕ & КОФЕЙНЯ "BEAN & BISTRO": COZY ROAST MAHOGANY & TERRACOTTA ---
          ctx.fillStyle = '#451a03';
          ctx.fillRect(bld.x, bld.y, bld.width, bld.height);

          // Terrace Awning over storefront
          ctx.fillStyle = '#78350f';
          ctx.fillRect(bld.x + 10, bld.y + bld.height - 18, bld.width - 20, 15);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1;
          ctx.strokeRect(bld.x + 10, bld.y + bld.height - 18, bld.width - 20, 15);

          // Golden Neon Sign
          const bSignW = Math.min(230, bld.width - 50);
          const bSignX = bld.x + (bld.width - bSignW) / 2;
          ctx.fillStyle = '#1c1917';
          ctx.fillRect(bSignX, bld.y + 3, bSignW, 16);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bSignX, bld.y + 3, bSignW, 16);

          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 8.5px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('BEAN & BISTRO • SPECIALTY COFFEE & BRUNCH', bSignX + bSignW / 2, bld.y + 11);
        } else if (bld.shopBrand === 'pitstop_service') {
          // --- АВТОМАСТЕРСКАЯ "PIT-STOP": INDUSTRIAL STEEL & RACING GARAGE BAYS ---
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(bld.x, bld.y, bld.width, bld.height);

          // Racing Blue & Yellow hazard warning band
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(bld.x, bld.y, bld.width, 18);

          // Yellow caution hazard chevron lines
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let hx = bld.x + 10; hx < bld.x + bld.width; hx += 16) {
            ctx.moveTo(hx, bld.y);
            ctx.lineTo(hx + 8, bld.y + 18);
          }
          ctx.stroke();

          // Overhead roll-up garage sectional doors
          const numBays = Math.max(1, Math.floor((bld.width - 30) / 50));
          const baySpacing = (bld.width - 20) / numBays;
          for (let b = 0; b < numBays; b++) {
            const gbx = bld.x + 10 + b * baySpacing + 4;
            const gbw = baySpacing - 8;
            const gby = bld.y + bld.height - 24;
            const gbh = 22;

            ctx.fillStyle = '#334155';
            ctx.fillRect(gbx, gby, gbw, gbh);
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1;
            ctx.strokeRect(gbx, gby, gbw, gbh);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            for (let sy = gby + 4; sy < gby + gbh; sy += 4) {
              ctx.moveTo(gbx, sy);
              ctx.lineTo(gbx + gbw, sy);
            }
            ctx.stroke();

            // Vision panel
            ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.fillRect(gbx + 4, gby + 4, gbw - 8, 4);
          }

          // Center Signboard
          const pitSignW = Math.min(230, bld.width - 40);
          const pitSignX = bld.x + (bld.width - pitSignW) / 2;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(pitSignX, bld.y + 2, pitSignW, 14);
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(pitSignX, bld.y + 2, pitSignW, 14);

          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 8.5px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('PIT-STOP • АВТОСЕРВИС & ЗАПЧАСТИ', pitSignX + pitSignW / 2, bld.y + 9);
        } else if (bld.shopBrand === 'splav_gear' || bld.type === 'tactical_store') {
          // --- СПЛАВ: TACTICAL MILITARY OLIVE & OUTDOOR EXPEDITION STORE ---
          ctx.fillStyle = '#365314';
          ctx.fillRect(bld.x, bld.y, bld.width, bld.height);

          // Tactical graphite header
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(bld.x + 8, bld.y + 4, bld.width - 16, 16);
          ctx.strokeStyle = '#84cc16';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(bld.x + 8, bld.y + 4, bld.width - 16, 16);

          // Storefront gear displays
          ctx.fillStyle = 'rgba(132, 204, 22, 0.25)';
          ctx.fillRect(bld.x + 12, bld.y + bld.height - 18, bld.width - 24, 15);
          ctx.strokeStyle = '#4d7c0f';
          ctx.lineWidth = 1;
          ctx.strokeRect(bld.x + 12, bld.y + bld.height - 18, bld.width - 24, 15);

          // Signboard Text
          ctx.fillStyle = '#84cc16';
          ctx.font = 'bold 8.5px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('СПЛАВ • ТУРИЗМ, ОХОТА & ЭКИПИРОВКА', bld.x + bld.width / 2, bld.y + 12);
        } else if (bld.shopBrand === 'perekrestok') {
          // --- СУПЕРМАРКЕТ "ПЕРЕКРЁСТОК 24/7": MODERN DEEP GREEN & FRESH PRODUCE ---
          ctx.fillStyle = '#14532d';
          ctx.fillRect(bld.x, bld.y, bld.width, bld.height);

          // Emerald brand header band
          ctx.fillStyle = '#166534';
          ctx.fillRect(bld.x, bld.y, bld.width, 22);

          // Lower panoramic glass storefront
          ctx.fillStyle = 'rgba(34, 197, 94, 0.22)';
          ctx.fillRect(bld.x + 12, bld.y + bld.height - 20, bld.width - 24, 17);
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(bld.x + 12, bld.y + bld.height - 20, bld.width - 24, 17);

          // Clover 4-leaf brand emblem
          const emblemX = bld.x + 22;
          const emblemY = bld.y + 11;
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(emblemX - 3, emblemY - 3, 3.5, 0, Math.PI * 2);
          ctx.arc(emblemX + 3, emblemY - 3, 3.5, 0, Math.PI * 2);
          ctx.arc(emblemX - 3, emblemY + 3, 3.5, 0, Math.PI * 2);
          ctx.arc(emblemX + 3, emblemY + 3, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Signboard Text
          const pSignW = Math.min(260, bld.width - 60);
          const pSignX = bld.x + (bld.width - pSignW) / 2;
          ctx.fillStyle = '#052e16';
          ctx.fillRect(pSignX, bld.y + 3, pSignW, 16);
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(pSignX, bld.y + 3, pSignW, 16);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('ПЕРЕКРЁСТОК 24/7 • СУПЕРМАРКЕТ', pSignX + pSignW / 2, bld.y + 11);
        } else if (bld.shopBrand === 'dodo_pizza') {
          // --- ПИЦЦЕРИЯ "ДОДО ПИЦЦА": VIBRANT ORANGE & TERRACOTTA BRICK ---
          ctx.fillStyle = '#7c2d12';
          ctx.fillRect(bld.x, bld.y, bld.width, bld.height);

          // Bright orange brand band
          ctx.fillStyle = '#ea580c';
          ctx.fillRect(bld.x, bld.y, bld.width, 22);

          // Warm illuminated pizzeria glass front
          ctx.fillStyle = 'rgba(249, 115, 22, 0.28)';
          ctx.fillRect(bld.x + 12, bld.y + bld.height - 20, bld.width - 24, 17);
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(bld.x + 12, bld.y + bld.height - 20, bld.width - 24, 17);

          // Round Dodo bird emblem
          const emblemX = bld.x + 22;
          const emblemY = bld.y + 11;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(emblemX, emblemY, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.arc(emblemX, emblemY, 6.5, 0, Math.PI * 2);
          ctx.fill();

          // Signboard Text
          const dSignW = Math.min(250, bld.width - 60);
          const dSignX = bld.x + (bld.width - dSignW) / 2;
          ctx.fillStyle = '#431407';
          ctx.fillRect(dSignX, bld.y + 3, dSignW, 16);
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(dSignX, bld.y + 3, dSignW, 16);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('ДОДО ПИЦЦА • ПИЦЦЕРИЯ & ДОСТАВКА', dSignX + dSignW / 2, bld.y + 11);
        } else if (bld.shopBrand === 'vkusno_tochka') {
          // --- РЕСТОРАН "ВКУСНО — И ТОЧКА": BURGUNDY & WARM MUSTARD ---
          ctx.fillStyle = '#7f1d1d';
          ctx.fillRect(bld.x, bld.y, bld.width, bld.height);

          // Deep red brand header
          ctx.fillStyle = '#991b1b';
          ctx.fillRect(bld.x, bld.y, bld.width, 22);

          // Glass front
          ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
          ctx.fillRect(bld.x + 12, bld.y + bld.height - 20, bld.width - 24, 17);
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(bld.x + 12, bld.y + bld.height - 20, bld.width - 24, 17);

          // Emblem: Two orange fries & green circle
          const emblemX = bld.x + 22;
          const emblemY = bld.y + 11;
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.rect(emblemX - 5, emblemY - 5, 3, 10);
          ctx.rect(emblemX, emblemY - 5, 3, 10);
          ctx.fill();
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(emblemX + 7, emblemY + 1, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Signboard Text
          const vSignW = Math.min(260, bld.width - 60);
          const vSignX = bld.x + (bld.width - vSignW) / 2;
          ctx.fillStyle = '#450a0a';
          ctx.fillRect(vSignX, bld.y + 3, vSignW, 16);
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(vSignX, bld.y + 3, vSignW, 16);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('ВКУСНО — И ТОЧКА • РЕСТОРАН', vSignX + vSignW / 2, bld.y + 11);
        } else if (bld.shopBrand === 'mvideo') {
          // --- ЭЛЕКТРОНИКА "М.ВИДЕО": ROYAL BLUE & CRIMSON LOGO ---
          ctx.fillStyle = '#1e3a8a';
          ctx.fillRect(bld.x, bld.y, bld.width, bld.height);

          // Red brand ribbon
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(bld.x, bld.y, bld.width, 22);

          // Showcase glass with tech glow
          ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.fillRect(bld.x + 12, bld.y + bld.height - 20, bld.width - 24, 17);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(bld.x + 12, bld.y + bld.height - 20, bld.width - 24, 17);

          // Red badge with cursive 'М'
          const emblemX = bld.x + 22;
          const emblemY = bld.y + 11;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(emblemX, emblemY, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#dc2626';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('М', emblemX, emblemY + 1);

          // Signboard Text
          const mSignW = Math.min(260, bld.width - 60);
          const mSignX = bld.x + (bld.width - mSignW) / 2;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(mSignX, bld.y + 3, mSignW, 16);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(mSignX, bld.y + 3, mSignW, 16);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('М.ВИДЕО • ГИПЕРМАРКЕТ ЭЛЕКТРОНИКИ', mSignX + mSignW / 2, bld.y + 11);
        } else if (bld.shopBrand === 'sportmaster') {
          // --- СПОРТТОВАРЫ "СПОРТМАСТЕР": BLUE & TRI-COLOR CHEVRONS ---
          ctx.fillStyle = '#0369a1';
          ctx.fillRect(bld.x, bld.y, bld.width, bld.height);

          // Blue brand header
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(bld.x, bld.y, bld.width, 22);

          // Storefront glass
          ctx.fillStyle = 'rgba(14, 165, 233, 0.25)';
          ctx.fillRect(bld.x + 12, bld.y + bld.height - 20, bld.width - 24, 17);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(bld.x + 12, bld.y + bld.height - 20, bld.width - 24, 17);

          // Signboard Text
          const sSignW = Math.min(260, bld.width - 60);
          const sSignX = bld.x + (bld.width - sSignW) / 2;
          ctx.fillStyle = '#082f49';
          ctx.fillRect(sSignX, bld.y + 3, sSignW, 16);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(sSignX, bld.y + 3, sSignW, 16);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('СПОРТМАСТЕР • СПОРТИВНЫЙ МАГАЗИН', sSignX + sSignW / 2, bld.y + 11);
        } else {
          // --- STANDALONE LOCAL RETAIL STORE / CAFE ---
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(bld.x, bld.y, bld.width, bld.height);

          // Clean modern glass storefront
          ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
          ctx.fillRect(bld.x + 12, bld.y + bld.height - 18, bld.width - 24, 15);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1;
          ctx.strokeRect(bld.x + 12, bld.y + bld.height - 18, bld.width - 24, 15);

          // Signboard with real building name
          const signW = Math.min(220, bld.width - 40);
          const signX = bld.x + (bld.width - signW) / 2;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(signX, bld.y + 3, signW, 16);
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1;
          ctx.strokeRect(signX, bld.y + 3, signW, 16);

          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 8.5px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText((bld.nameRu || 'МАГАЗИН').toUpperCase(), signX + signW / 2, bld.y + 11);
        }
      }

      // 3. BUILDING GROUND-LEVEL ENTRANCES & PORCH (ПОДЪЕЗДЫ)
      // Collect all entrances (either bld.entrances array or fallback entranceSide)
      const entranceList: { side: 'north' | 'south' | 'east' | 'west'; offsetRatio: number; number?: number }[] = [];
      if (bld.entrances && bld.entrances.length > 0) {
        entranceList.push(...bld.entrances);
      } else if (bld.entranceSide) {
        entranceList.push({ side: bld.entranceSide, offsetRatio: 0.5, number: 1 });
      }

      for (const ent of entranceList) {
        let ex = 0, ey = 0, ew = 0, eh = 0;
        let doorX = 0, doorY = 0, doorW = 0, doorH = 0;
        let lightCX = 0, lightCY = 0;
        let rampX = 0, rampY = 0, rampW = 0, rampH = 0;

        const canopyDepth = 14;
        const canopyWidth = 28;

        if (ent.side === 'north') {
          ex = bld.x + bld.width * ent.offsetRatio - canopyWidth / 2;
          ey = bld.y - canopyDepth;
          ew = canopyWidth;
          eh = canopyDepth;
          doorX = ex + 5; doorY = bld.y; doorW = canopyWidth - 10; doorH = 2.5;
          lightCX = ex + canopyWidth / 2; lightCY = bld.y - 6;
          rampX = ex - 6; rampY = ey; rampW = 5; rampH = eh;
        } else if (ent.side === 'south') {
          ex = bld.x + bld.width * ent.offsetRatio - canopyWidth / 2;
          ey = bld.y + bld.height;
          ew = canopyWidth;
          eh = canopyDepth;
          doorX = ex + 5; doorY = bld.y + bld.height - 2.5; doorW = canopyWidth - 10; doorH = 2.5;
          lightCX = ex + canopyWidth / 2; lightCY = bld.y + bld.height + 6;
          rampX = ex + ew + 1; rampY = ey; rampW = 5; rampH = eh;
        } else if (ent.side === 'west') {
          ex = bld.x - canopyDepth;
          ey = bld.y + bld.height * ent.offsetRatio - canopyWidth / 2;
          ew = canopyDepth;
          eh = canopyWidth;
          doorX = bld.x; doorY = ey + 5; doorW = 2.5; doorH = canopyWidth - 10;
          lightCX = bld.x - 6; lightCY = ey + canopyWidth / 2;
          rampX = ex; rampY = ey - 6; rampW = ew; rampH = 5;
        } else if (ent.side === 'east') {
          ex = bld.x + bld.width;
          ey = bld.y + bld.height * ent.offsetRatio - canopyWidth / 2;
          ew = canopyDepth;
          eh = canopyWidth;
          doorX = bld.x + bld.width - 2.5; doorY = ey + 5; doorW = 2.5; doorH = canopyWidth - 10;
          lightCX = bld.x + bld.width + 6; lightCY = ey + canopyWidth / 2;
          rampX = ex; rampY = ey + eh + 1; rampW = ew; rampH = 5;
        }

        // A. Paved entrance path connecting entrance directly to ground/walkway
        ctx.fillStyle = '#cbd5e1'; // Paved concrete walkway
        if (ent.side === 'north') {
          ctx.fillRect(ex, ey - 8, ew, 8);
        } else if (ent.side === 'south') {
          ctx.fillRect(ex, ey + eh, ew, 8);
        } else if (ent.side === 'west') {
          ctx.fillRect(ex - 8, ey, 8, eh);
        } else if (ent.side === 'east') {
          ctx.fillRect(ex + ew, ey, 8, eh);
        }

        // B. Entrance light radial cast on sidewalk ground
        try {
          const entranceGlow = ctx.createRadialGradient(lightCX, lightCY, 1, lightCX, lightCY, 22);
          entranceGlow.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
          entranceGlow.addColorStop(0.5, 'rgba(254, 240, 138, 0.15)');
          entranceGlow.addColorStop(1, 'rgba(254, 240, 138, 0)');
          ctx.fillStyle = entranceGlow;
          ctx.beginPath();
          ctx.arc(lightCX, lightCY, 22, 0, Math.PI * 2);
          ctx.fill();
        } catch {}

        // C. Concrete Porch Step Slab (Крыльцо подъезда)
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(ex - 1, ey - (ent.side === 'north' || ent.side === 'south' ? 0 : 1), ew + 2, eh + (ent.side === 'north' || ent.side === 'south' ? 0 : 2));
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.strokeRect(ex - 1, ey - (ent.side === 'north' || ent.side === 'south' ? 0 : 1), ew + 2, eh + (ent.side === 'north' || ent.side === 'south' ? 0 : 2));

        // D. Stroller / Wheelchair Ramp (Пандус)
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(rampX, rampY, rampW, rampH);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(rampX, rampY, rampW, rampH);

        // E. Entrance Door Frame & Glass Intercom Door (Металлическая дверь с домофоном)
        ctx.fillStyle = '#1e293b'; // Dark metal entrance door
        ctx.fillRect(doorX, doorY, doorW, doorH);

        // Door Glass Panel / Intercom
        ctx.fillStyle = '#38bdf8'; // Glowing entry glass window
        ctx.fillRect(doorX + 1, doorY + (ent.side === 'north' || ent.side === 'south' ? 0.5 : 1), doorW - 2, doorH - (ent.side === 'north' || ent.side === 'south' ? 1 : 2));

        // Red glowing intercom LED dot (Домофон)
        ctx.fillStyle = '#ef4444';
        if (ent.side === 'north' || ent.side === 'south') {
          ctx.fillRect(doorX - 2, doorY, 1.5, 1.5);
        } else {
          ctx.fillRect(doorX, doorY - 2, 1.5, 1.5);
        }

        // F. Small Porch Bench (Скамейка) & Trash Urn (Урна) next to porch
        if (ent.side === 'north' || ent.side === 'south') {
          const benchX = ex + ew + 3;
          const benchY = ey + 2;
          ctx.fillStyle = '#b45309'; // Wood bench
          ctx.fillRect(benchX, benchY, 10, 3);
          ctx.fillStyle = '#1e293b'; // Bench legs
          ctx.fillRect(benchX, benchY, 2, 3);
          ctx.fillRect(benchX + 8, benchY, 2, 3);

          // Trash urn
          ctx.fillStyle = '#475569';
          ctx.fillRect(ex - 6, ey + 4, 3.5, 3.5);
        } else {
          const benchX = ex + 2;
          const benchY = ey + eh + 3;
          ctx.fillStyle = '#b45309';
          ctx.fillRect(benchX, benchY, 3, 10);
          ctx.fillStyle = '#475569';
          ctx.fillRect(ex + 4, ey - 6, 3.5, 3.5);
        }
      }
    }
  }

  // --- DETAILED GRAND CENTRAL FOUNTAIN BASE RENDERER ---
  private renderParkFountainBase(bld: Building, nightAlpha: number = 0) {
    const ctx = this.ctx;
    const now = Date.now();
    const cx = bld.x + bld.width / 2;
    const cy = bld.y + bld.height / 2;
    const outerR = bld.width / 2; // ~38px

    // 1. Drop shadow of the grand stone basin onto park tiles
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.beginPath();
    ctx.arc(cx + 4, cy + 4, outerR + 2, 0, Math.PI * 2);
    ctx.fill();

    // 2. Base Tier: Outer Stepped Granite Plinth (Dark slate foundation)
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(cx, cy, outerR + 2, 0, Math.PI * 2);
    ctx.fill();

    // 3. Classical Carved Granite/Marble Basin Rim
    const stoneGradient = ctx.createLinearGradient(cx - outerR, cy - outerR, cx + outerR, cy + outerR);
    stoneGradient.addColorStop(0, '#f1f5f9');
    stoneGradient.addColorStop(0.4, '#cbd5e1');
    stoneGradient.addColorStop(1, '#94a3b8');
    ctx.fillStyle = stoneGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.fill();

    // Outer and Inner Stone Bevel Mouldings
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR - 4, 0, Math.PI * 2);
    ctx.stroke();

    // 4. 8 Carved Stone Rosettes & Bronze Nozzle Mounts around perimeter
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      const px = cx + Math.cos(ang) * (outerR - 2.5);
      const py = cy + Math.sin(ang) * (outerR - 2.5);

      // Stone Rosette block
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Bronze/Gold Nozzle
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(px, py, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Deep Basin Water Pool (Floor & Submerged Mosaic Pattern)
    const poolR = outerR - 5;
    const poolGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, poolR);
    poolGrad.addColorStop(0, '#0284c7');  // Bright clear center
    poolGrad.addColorStop(0.6, '#0369a1'); // Deep azure mid
    poolGrad.addColorStop(1, '#082f49');  // Deep sapphire edge shadow
    ctx.fillStyle = poolGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, poolR, 0, Math.PI * 2);
    ctx.fill();

    // Submerged Mosaic Star Medallion Inlay
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.22)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * (poolR - 4), cy + Math.sin(ang) * (poolR - 4));
    }
    ctx.stroke();

    // 6. Translucent Caustic Water Shimmer & Concentric Ripples
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, poolR - 0.5, 0, Math.PI * 2);
    ctx.clip();

    // Animated water caustics wave ribbons
    const waveOffset = now * 0.003;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    for (let w = 0; w < 3; w++) {
      const wAng = waveOffset + (w * Math.PI * 2) / 3;
      const wx = cx + Math.cos(wAng) * 12;
      const wy = cy + Math.sin(wAng) * 12;
      ctx.beginPath();
      ctx.arc(wx, wy, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    // Expanding Concentric Ripple Waves
    for (let r = 0; r < 3; r++) {
      const ripProgress = ((now * 0.015 + r * 10) % 28);
      const ripR = ripProgress;
      const ripAlpha = Math.max(0, 0.45 * (1 - ripR / 28));
      ctx.strokeStyle = `rgba(224, 242, 254, ${ripAlpha.toFixed(2)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, ripR, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 7. Middle Elevated Stone Tier (Carved Chalice Bowl)
    const midR = 17;
    // Shadow of middle tier into pool
    ctx.fillStyle = 'rgba(8, 47, 73, 0.55)';
    ctx.beginPath();
    ctx.arc(cx + 2, cy + 2, midR + 1, 0, Math.PI * 2);
    ctx.fill();

    // Chalice Outer Stone Pedestal
    const midStoneGrad = ctx.createLinearGradient(cx - midR, cy - midR, cx + midR, cy + midR);
    midStoneGrad.addColorStop(0, '#f8fafc');
    midStoneGrad.addColorStop(0.5, '#cbd5e1');
    midStoneGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = midStoneGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, midR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Middle Chalice Water Bowl
    const midPoolR = midR - 3.5;
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(cx, cy, midPoolR, 0, Math.PI * 2);
    ctx.fill();

    // Overflowing Cascading Water Sheets (spilling over middle chalice into lower pool)
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2;
      const sx = cx + Math.cos(ang) * (midR - 2);
      const sy = cy + Math.sin(ang) * (midR - 2);
      const ex = cx + Math.cos(ang) * (midR + 5);
      const ey = cy + Math.sin(ang) * (midR + 5);

      const spillGrad = ctx.createLinearGradient(sx, sy, ex, ey);
      spillGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      spillGrad.addColorStop(1, 'rgba(186, 230, 253, 0.3)');
      ctx.strokeStyle = spillGrad;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }

    // 8. Upper Pinnacle Tier & Bronze Finial Spire
    const topR = 6.5;
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(cx, cy, topR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Golden Bronze Central Nozzle Finial
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(cx, cy, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a16207';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 9. Atmospheric Underwater LED Illumination at Night
    if (nightAlpha > 0.05) {
      try {
        const glowR = outerR + 25;
        const ledGlow = ctx.createRadialGradient(cx, cy, 2, cx, cy, glowR);
        ledGlow.addColorStop(0, `rgba(56, 189, 248, ${(0.42 * nightAlpha).toFixed(2)})`);
        ledGlow.addColorStop(0.5, `rgba(14, 165, 233, ${(0.22 * nightAlpha).toFixed(2)})`);
        ledGlow.addColorStop(1, 'rgba(2, 132, 199, 0)');
        ctx.fillStyle = ledGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
        ctx.fill();
      } catch {}
    }
  }

  // --- DETAILED GRAND CENTRAL FOUNTAIN SPRAY RENDERER (TOP PASS) ---
  private renderParkFountainSpray(bld: Building, nightAlpha: number = 0) {
    const ctx = this.ctx;
    const now = Date.now();
    const cx = bld.x + bld.width / 2;
    const cy = bld.y + bld.height / 2;
    const outerR = bld.width / 2;

    // 1. Center Vertical Froth Geyser & Mist Plume
    const plumePulse = Math.sin(now * 0.008) * 1.5 + 4.5;
    
    // Core white water bubbling froth
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(cx, cy, plumePulse, 0, Math.PI * 2);
    ctx.fill();

    // Sparkling mist halo
    ctx.fillStyle = 'rgba(186, 230, 253, 0.55)';
    ctx.beginPath();
    ctx.arc(cx, cy, plumePulse + 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Leaping center spray droplets
    for (let d = 0; d < 6; d++) {
      const dropAng = (now * 0.004 + (d * Math.PI * 2) / 6);
      const dropDist = 2 + ((now * 0.01 + d * 4) % 9);
      const dx = cx + Math.cos(dropAng) * dropDist;
      const dy = cy + Math.sin(dropAng) * dropDist;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dx, dy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. 8 Graceful Arched Water Jets (Shooting from outer perimeter inward towards middle chalice)
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      const startR = outerR - 4;
      const endR = 14;

      const sx = cx + Math.cos(ang) * startR;
      const sy = cy + Math.sin(ang) * startR;
      const ex = cx + Math.cos(ang) * endR;
      const ey = cy + Math.sin(ang) * endR;

      // Arched mid-point (raised apex)
      const midDist = (startR + endR) / 2;
      const mx = cx + Math.cos(ang) * midDist;
      const my = cy + Math.sin(ang) * midDist - 7;

      // Smooth parabolic water arc
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.stroke();

      // Shimmering inner core arc
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.7)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.stroke();

      // Animated traveling water bead along the arc
      const t = ((now * 0.0028 + i * 0.125) % 1);
      const oneMinusT = 1 - t;
      const bx = oneMinusT * oneMinusT * sx + 2 * oneMinusT * t * mx + t * t * ex;
      const by = oneMinusT * oneMinusT * sy + 2 * oneMinusT * t * my + t * t * ey;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bx, by, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Impact splash & foam bubble at landing point in the pool
      const splashProgress = ((now * 0.012 + i * 2) % 6);
      ctx.strokeStyle = `rgba(255, 255, 255, ${(0.85 * (1 - splashProgress / 6)).toFixed(2)})`;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(ex, ey, 1.5 + splashProgress, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private renderBuildingRoofsAndCanopies(buildings: Building[], nightAlpha: number = 0, player?: Player) {
    const ctx = this.ctx;
    const now = Date.now();

    for (const bld of buildings) {
      if (bld.type === 'park_monument') {
        this.renderParkFountainSpray(bld, nightAlpha);
        continue;
      }

      // Skip rendering the roof if the player is inside this specific building, so they can see the interior
      if (player && player.isInsideBuilding && player.insideBuildingId === bld.id) {
        continue;
      }

      // 1. FACADE DETAILS (BALCONIES & FIRE ESCAPES)
      // A. BALCONIES (Only for Residential/Apartment buildings)
      if (bld.balconies && performanceConfig.enableBalconyDetails) {
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
          ctx.fillRect(bx + 3, by + 3, bw, bh);

          // Balcony Concrete Base Slab
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(bx, by, bw, bh);

          if (bal.isGlazed) {
            // GLAZED BALCONY (Застекленный балкон с пластиковой рамой и отражением)
            ctx.fillStyle = '#334155'; // Dark PVC frame
            ctx.fillRect(bx, by, bw, bh);

            // Tinted Glass Panes
            ctx.fillStyle = 'rgba(56, 189, 248, 0.55)'; // Light cyan/blue glass
            ctx.fillRect(bx + 1, by + 1, bw - 2, bh - 2);

            // White PVC mullion grid
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            if (bal.side === 'north' || bal.side === 'south') {
              const numPanes = Math.max(2, Math.floor(bw / 8));
              for (let i = 1; i < numPanes; i++) {
                const px = bx + (bw / numPanes) * i;
                ctx.moveTo(px, by);
                ctx.lineTo(px, by + bh);
              }
            } else {
              const numPanes = Math.max(2, Math.floor(bh / 8));
              for (let i = 1; i < numPanes; i++) {
                const py = by + (bh / numPanes) * i;
                ctx.moveTo(bx, py);
                ctx.lineTo(bx + bw, py);
              }
            }
            ctx.stroke();

            // Diagonal Gloss Reflection Sheen
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(bx + 2, by + bh - 2);
            ctx.lineTo(bx + bw - 2, by + 2);
            ctx.stroke();
          } else {
            // OPEN BALCONY WITH METAL RAILINGS (Открытый балкон с металической решеткой)
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(bx, by, bw, bh);

            // Railing vertical bars
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
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

            // Flower box / Laundry rack detail
            ctx.fillStyle = '#b45309';
            if (bal.side === 'north' || bal.side === 'south') {
              ctx.fillRect(bx + 2, by + (bal.side === 'north' ? 0 : bh - 1.5), bw - 4, 1.5);
            } else {
              ctx.fillRect(bx + (bal.side === 'west' ? 0 : bw - 1.5), by + 2, 1.5, bh - 4);
            }
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
            ctx.moveTo(fex, fey);
            ctx.lineTo(fex + few, fey + feh);
          } else {
            for (let step = fey + 1; step < fey + feh; step += 3) {
              ctx.moveTo(fex, step);
              ctx.lineTo(fex + few, step);
            }
            ctx.moveTo(fex, fey);
            ctx.lineTo(fex + few, fey + feh);
          }
          ctx.stroke();
        }
      }

      // C. ENTRANCE CANOPIES & COMMERCIAL MARQUEES
      const isCommercial = bld.shopBrand !== undefined || bld.type === 'commercial' || bld.type === 'shop' || bld.type === 'shopping_mall';
      const entranceList: { side: 'north' | 'south' | 'east' | 'west'; offsetRatio: number; number?: number }[] = [];
      if (bld.entrances && bld.entrances.length > 0) {
        entranceList.push(...bld.entrances);
      } else if (bld.entranceSide) {
        entranceList.push({ side: bld.entranceSide, offsetRatio: 0.5, number: 1 });
      }

      for (let idx = 0; idx < entranceList.length; idx++) {
        const ent = entranceList[idx];
        let ex = 0, ey = 0, ew = 0, eh = 0;
        
        const canopyDepth = isCommercial ? 18 : 14;
        const canopyWidth = isCommercial ? 44 : 28;

        if (ent.side === 'north') {
          ex = bld.x + bld.width * ent.offsetRatio - canopyWidth / 2;
          ey = bld.y - canopyDepth;
          ew = canopyWidth;
          eh = canopyDepth;
        } else if (ent.side === 'south') {
          ex = bld.x + bld.width * ent.offsetRatio - canopyWidth / 2;
          ey = bld.y + bld.height;
          ew = canopyWidth;
          eh = canopyDepth;
        } else if (ent.side === 'west') {
          ex = bld.x - canopyDepth;
          ey = bld.y + bld.height * ent.offsetRatio - canopyWidth / 2;
          ew = canopyDepth;
          eh = canopyWidth;
        } else if (ent.side === 'east') {
          ex = bld.x + bld.width;
          ey = bld.y + bld.height * ent.offsetRatio - canopyWidth / 2;
          ew = canopyDepth;
          eh = canopyWidth;
        }

        if (isCommercial) {
          // --- REALISTIC COMMERCIAL ENTRANCE & GROUND-LEVEL FACADE DETAILS ---
          let marqueeColor = bld.accentColor || '#f97316';
          let marqueeBorder = '#ffffff';

          if (bld.shopBrand === 'cofix_bakery') {
            marqueeColor = '#ea580c';
            marqueeBorder = '#fed7aa';
          } else if (bld.shopBrand === 'bean_bistro') {
            marqueeColor = '#d97706';
            marqueeBorder = '#fef3c7';
          } else if (bld.shopBrand === 'pharmacy_36_6') {
            marqueeColor = '#059669';
            marqueeBorder = '#a7f3d0';
          } else if (bld.shopBrand === 'pyaterochka') {
            marqueeColor = '#dc2626';
            marqueeBorder = '#fef08a';
          } else if (bld.shopBrand === 'perekrestok') {
            marqueeColor = '#16a34a';
            marqueeBorder = '#bbf7d0';
          } else if (bld.shopBrand === 'dodo_pizza') {
            marqueeColor = '#f97316';
            marqueeBorder = '#ffedd5';
          } else if (bld.shopBrand === 'vkusno_tochka') {
            marqueeColor = '#991b1b';
            marqueeBorder = '#fef08a';
          } else if (bld.shopBrand === 'mvideo') {
            marqueeColor = '#2563eb';
            marqueeBorder = '#fca5a5';
          } else if (bld.shopBrand === 'sportmaster') {
            marqueeColor = '#0284c7';
            marqueeBorder = '#bae6fd';
          } else if (bld.shopBrand === 'pitstop_service') {
            marqueeColor = '#0369a1';
            marqueeBorder = '#38bdf8';
          } else if (bld.shopBrand === 'splav_gear') {
            marqueeColor = '#4d7c0f';
            marqueeBorder = '#bef264';
          }

          // Illuminated Canopy Glow onto sidewalk
          ctx.fillStyle = marqueeColor;
          ctx.globalAlpha = 0.25;
          ctx.fillRect(ex - 4, ey - 4, ew + 8, eh + 8);
          ctx.globalAlpha = 1.0;

          // Awning canopy body
          ctx.fillStyle = marqueeColor;
          ctx.fillRect(ex, ey, ew, eh);

          // Illuminated trim border
          ctx.strokeStyle = marqueeBorder;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(ex, ey, ew, eh);

          // Corrugated awning ribs
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (ent.side === 'north' || ent.side === 'south') {
            for (let sx = ex + 4; sx < ex + ew; sx += 6) {
              ctx.moveTo(sx, ey); ctx.lineTo(sx, ey + eh);
            }
          } else {
            for (let sy = ey + 4; sy < ey + eh; sy += 6) {
              ctx.moveTo(ex, sy); ctx.lineTo(ex + ew, sy);
            }
          }
          ctx.stroke();

          // --- PROCEDURAL ARCHITECTURAL & TERRAIN FEATURES PER SHOP TYPE ---
          if (bld.shopBrand === 'pharmacy_36_6') {
            // A. PHARMACY: MOUNTED GREEN LED CROSS SIGN (ЗЕЛЁНЫЙ АПТЕЧНЫЙ КРЕСТ)
            const cx = ex + (ent.side === 'east' ? ew + 6 : (ent.side === 'west' ? -12 : ew + 4));
            const cy = ey + (ent.side === 'north' ? -4 : (ent.side === 'south' ? eh + 4 : eh / 2 - 6));
            
            // Iron Bracket Mount
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ex + ew / 2, ey + eh / 2);
            ctx.lineTo(cx + 6, cy + 6);
            ctx.stroke();

            // Green Neon Pulse Glow
            ctx.fillStyle = '#10b981';
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(cx + 6, cy + 6, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;

            // Green Medical Cross Shape
            ctx.fillStyle = '#059669';
            ctx.fillRect(cx + 4, cy + 1, 4, 10);
            ctx.fillRect(cx + 1, cy + 4, 10, 4);
            ctx.fillStyle = '#34d399';
            ctx.fillRect(cx + 5, cy + 2, 2, 8);
            ctx.fillRect(cx + 2, cy + 5, 8, 2);

            // Clean white marble entrance path
            ctx.fillStyle = 'rgba(241, 245, 249, 0.6)';
            ctx.fillRect(ex - 2, ey + eh, ew + 4, 6);
          } else if (bld.shopBrand === 'cofix_bakery' || bld.shopBrand === 'bean_bistro') {
            // B. CAFE: OUTDOOR SUMMER TERRACE DECK (ЛЕТНЯЯ ВЕРАНДА С ЗОНТИКАМИ И СТОЛИКАМИ)
            const deckW = 42;
            const deckH = 26;
            const deckX = ex - (deckW - ew) / 2;
            const deckY = ent.side === 'south' ? ey + eh + 2 : ey - deckH - 2;

            // Teak Wood Patio Deck Floor
            ctx.fillStyle = '#78350f';
            ctx.fillRect(deckX, deckY, deckW, deckH);
            ctx.strokeStyle = '#451a03';
            ctx.lineWidth = 1;
            ctx.strokeRect(deckX, deckY, deckW, deckH);

            // Wood Planks Texture
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            for (let py = deckY + 4; py < deckY + deckH; py += 5) {
              ctx.beginPath(); ctx.moveTo(deckX, py); ctx.lineTo(deckX + deckW, py); ctx.stroke();
            }

            // Patio Cafe Tables (2 Round Tables)
            for (let t = 0; t < 2; t++) {
              const tx = deckX + 11 + t * 20;
              const ty = deckY + deckH / 2;

              // Woven Chairs around table
              ctx.fillStyle = '#1e293b';
              ctx.fillRect(tx - 6, ty - 2, 3, 4);
              ctx.fillRect(tx + 3, ty - 2, 3, 4);

              // White Tabletop
              ctx.fillStyle = '#f8fafc';
              ctx.beginPath(); ctx.arc(tx, ty, 5, 0, Math.PI * 2); ctx.fill();
              ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1; ctx.stroke();

              // Coffee Cup on table
              ctx.fillStyle = '#451a03';
              ctx.beginPath(); ctx.arc(tx + 1, ty - 1, 1.5, 0, Math.PI * 2); ctx.fill();
            }

            // Big Colorful Cafe Umbrella / Parasol
            const umbColor = bld.shopBrand === 'cofix_bakery' ? '#ea580c' : '#f59e0b';
            const ux = deckX + deckW / 2;
            const uy = deckY + deckH / 2;
            ctx.fillStyle = umbColor;
            ctx.beginPath(); ctx.arc(ux, uy, 10, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke();

            // Chalkboard Menu Sign on Sidewalk (Меловой штендер)
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(deckX - 8, deckY + 4, 5, 8);
            ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1; ctx.strokeRect(deckX - 8, deckY + 4, 5, 8);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(deckX - 7, deckY + 6, 3, 1);
            ctx.fillRect(deckX - 7, deckY + 8, 2, 1);
          } else if (bld.shopBrand === 'pitstop_service' || bld.type === 'car_dealership') {
            // C. AUTO REPAIR "PIT-STOP": GARAGE ROLLER DOORS, CAR LIFT & TIRE STACKS
            const garageW = bld.width * 0.7;
            const garageX = bld.x + (bld.width - garageW) / 2;
            const garageY = bld.y + bld.height;

            // Pavement Oil Stains & Skid Marks
            ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
            ctx.beginPath();
            ctx.ellipse(garageX + 20, garageY + 12, 12, 6, 0, 0, Math.PI * 2);
            ctx.ellipse(garageX + garageW - 20, garageY + 16, 16, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Yellow/Black Hazard Warning Safety Stripes (Зебра безопасности)
            ctx.fillStyle = '#eab308';
            ctx.fillRect(garageX, garageY - 2, garageW, 4);
            ctx.fillStyle = '#0f172a';
            for (let sz = garageX; sz < garageX + garageW; sz += 8) {
              ctx.beginPath();
              ctx.moveTo(sz, garageY - 2);
              ctx.lineTo(sz + 4, garageY + 2);
              ctx.lineTo(sz + 2, garageY + 2);
              ctx.lineTo(sz - 2, garageY - 2);
              ctx.fill();
            }

            // Outdoor Hydraulic Two-Post Car Lift (Автоподъёмник)
            const liftX = garageX + 15;
            const liftY = garageY + 18;
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(liftX - 12, liftY - 2, 4, 16); // Left post
            ctx.fillRect(liftX + 8, liftY - 2, 4, 16);  // Right post
            ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(liftX - 8, liftY + 6); ctx.lineTo(liftX + 8, liftY + 6); // Support arms
            ctx.stroke();

            // Stacks of Rubber Car Tires (Покрышки)
            for (let tr = 0; tr < 3; tr++) {
              ctx.fillStyle = '#0f172a';
              ctx.beginPath(); ctx.arc(garageX + garageW - 12 + (tr % 2) * 5, garageY + 10 + Math.floor(tr / 2) * 6, 4, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = '#475569';
              ctx.beginPath(); ctx.arc(garageX + garageW - 12 + (tr % 2) * 5, garageY + 10 + Math.floor(tr / 2) * 6, 1.8, 0, Math.PI * 2); ctx.fill();
            }

            // Red Mechanic Tool Cart & Blue Oil Barrel
            ctx.fillStyle = '#dc2626'; ctx.fillRect(garageX + garageW - 28, garageY + 18, 7, 5); // Tool cart
            ctx.fillStyle = '#0369a1'; ctx.beginPath(); ctx.arc(garageX + garageW - 36, garageY + 20, 3.5, 0, Math.PI * 2); ctx.fill(); // Barrel
          } else if (bld.shopBrand === 'dodo_pizza') {
            // D. DODO PIZZA: PATIO & DELIVERY SCOOTERS
            const px = ex - 10;
            const py = ey + eh + 4;
            // Delivery Moped / Scooter
            ctx.fillStyle = '#dc2626'; ctx.fillRect(px, py, 10, 4); // Scooter body
            ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(px + 2, py + 2, 2, 0, Math.PI * 2); ctx.arc(px + 8, py + 2, 2, 0, Math.PI * 2); ctx.fill(); // Wheels
            ctx.fillStyle = '#ea580c'; ctx.fillRect(px - 3, py - 1, 4, 4); // Dodo Delivery Trunk Box
          } else if (bld.shopBrand === 'pyaterochka' || bld.shopBrand === 'perekrestok') {
            // E. SUPERMARKET: SHOPPING CART CORRAL (ЗАГОН ДЛЯ ТЕЛЕЖЕК)
            const cx = ex + ew + 6;
            const cy = ey + 2;
            ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
            ctx.strokeRect(cx, cy, 18, 10);
            for (let cart = 0; cart < 3; cart++) {
              ctx.fillStyle = '#cbd5e1';
              ctx.fillRect(cx + 2 + cart * 5, cy + 2, 4, 6);
              ctx.fillStyle = bld.shopBrand === 'pyaterochka' ? '#dc2626' : '#16a34a';
              ctx.fillRect(cx + 2 + cart * 5, cy + 1, 4, 1.5); // Handlebar
            }
          } else if (bld.shopBrand === 'splav_gear') {
            // F. SPLAV GEAR: OUTSIDE CAMO TENT & WOODEN CRATES
            const tx = ex - 22;
            const ty = ey + 2;
            ctx.fillStyle = '#365314'; // Camo Tent
            ctx.beginPath(); ctx.moveTo(tx, ty + 10); ctx.lineTo(tx + 8, ty); ctx.lineTo(tx + 16, ty + 10); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#78350f'; ctx.fillRect(tx + 18, ty + 4, 6, 6); // Supply crate
          }
        } else {
          // Standard Residential Canopy
          ctx.fillStyle = '#475569';
          ctx.fillRect(ex, ey, ew, eh);

          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(ex, ey, ew, eh);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (ent.side === 'north' || ent.side === 'south') {
            for (let sx = ex + 4; sx < ex + ew; sx += 5) {
              ctx.moveTo(sx, ey);
              ctx.lineTo(sx, ey + eh);
            }
          } else {
            for (let sy = ey + 4; sy < ey + eh; sy += 5) {
              ctx.moveTo(ex, sy);
              ctx.lineTo(ex + ew, sy);
            }
          }
          ctx.stroke();

          // Steel Support Brackets
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          if (ent.side === 'north') {
            ctx.moveTo(ex + 2, ey + eh); ctx.lineTo(ex + 2, ey + 3);
            ctx.moveTo(ex + ew - 2, ey + eh); ctx.lineTo(ex + ew - 2, ey + 3);
          } else if (ent.side === 'south') {
            ctx.moveTo(ex + 2, ey); ctx.lineTo(ex + 2, ey + eh - 3);
            ctx.moveTo(ex + ew - 2, ey); ctx.lineTo(ex + ew - 2, ey + eh - 3);
          } else if (ent.side === 'west') {
            ctx.moveTo(ex + ew, ey + 2); ctx.lineTo(ex + 3, ey + 2);
            ctx.moveTo(ex + ew, ey + eh - 2); ctx.lineTo(ex + 3, ey + eh - 2);
          } else if (ent.side === 'east') {
            ctx.moveTo(ex, ey + 2); ctx.lineTo(ex + ew - 3, ey + 2);
            ctx.moveTo(ex, ey + eh - 2); ctx.lineTo(ex + ew - 3, ey + eh - 2);
          }
          ctx.stroke();

          // Small Entrance Plaque next to wall
          ctx.fillStyle = '#0f172a';
          if (ent.side === 'north' || ent.side === 'south') {
            ctx.fillRect(ex + ew / 2 - 4, ent.side === 'north' ? bld.y - 1.5 : bld.y + bld.height, 8, 1.5);
          }
        }
      }

      // 2. PARAPET / ROOF RIDGE BORDER
      ctx.fillStyle = bld.roofColor;
      ctx.fillRect(bld.x + 4, bld.y + 4, bld.width - 8, bld.height - 8);

      // Accent Coping Line on Parapet Edge
      ctx.strokeStyle = bld.accentColor;
      ctx.lineWidth = isCommercial ? 3.0 : 2.2;
      ctx.strokeRect(bld.x + 4, bld.y + 4, bld.width - 8, bld.height - 8);

      // 3. INNER ROOF BED (Gravel / Asphalt / Commercial Membrane)
      const rx = bld.x + 6;
      const ry = bld.y + 6;
      const rw = bld.width - 12;
      const rh = bld.height - 12;
      ctx.fillStyle = isCommercial ? '#1e293b' : '#1e293b';
      ctx.fillRect(rx, ry, rw, rh);

      if (isCommercial) {
        // --- REALISTIC INDUSTRIAL ROOF EQUIPMENT (NO ROOFTOP TEXT BANNERS) ---
        // Industrial HVAC Chiller Unit
        const hvacW = Math.min(32, rw * 0.35);
        const hvacH = Math.min(20, rh * 0.35);
        const hvacX = rx + (rw - hvacW) / 2;
        const hvacY = ry + (rh - hvacH) / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(hvacX + 2, hvacY + 2, hvacW, hvacH); // Drop shadow

        ctx.fillStyle = '#334155';
        ctx.fillRect(hvacX, hvacY, hvacW, hvacH); // Body
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.strokeRect(hvacX, hvacY, hvacW, hvacH);

        // Chiller Fan Grills
        ctx.fillStyle = '#1e293b';
        ctx.beginPath(); ctx.arc(hvacX + hvacW * 0.3, hvacY + hvacH / 2, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hvacX + hvacW * 0.7, hvacY + hvacH / 2, 4, 0, Math.PI * 2); ctx.fill();

        // Roof Skylight Panels
        const skylightW = Math.min(30, (rw - hvacW) / 2 - 8);
        if (skylightW > 12) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
          ctx.fillRect(rx + 6, ry + 6, skylightW, rh - 12);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1;
          ctx.strokeRect(rx + 6, ry + 6, skylightW, rh - 12);

          ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
          ctx.fillRect(rx + rw - skylightW - 6, ry + 6, skylightW, rh - 12);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1;
          ctx.strokeRect(rx + rw - skylightW - 6, ry + 6, skylightW, rh - 12);
        }
      } else {
        // 4. MULTI-TIER MECHANICAL ROOM PENTHOUSE (Only for Residential/Office buildings)
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
      }

      // 5. ROOF DETAILS (AC Units with spinning fans, Helipads with flashing beacons, solar panels, water towers)
      if (!performanceConfig.lowQualityRendering) {
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

      // 6. SPECIALIZED ROOFTOP BRAND LOGOS & SIGNAGE (Top-down visual identification)
      if (bld.shopBrand) {
        const signCx = bld.x + bld.width / 2;
        const signCy = bld.y + Math.min(30, bld.height * 0.35);

        if (bld.shopBrand === 'pharmacy_36_6') {
          const rsw = Math.min(140, bld.width - 20);
          ctx.fillStyle = '#065f46';
          ctx.fillRect(signCx - rsw / 2, signCy - 8, rsw, 16);
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(signCx - rsw / 2, signCy - 8, rsw, 16);

          // Pulsing green cross
          const cp = (now % 600) > 300;
          ctx.fillStyle = cp ? '#34d399' : '#10b981';
          ctx.fillRect(signCx - rsw / 2 + 6, signCy - 5, 3, 10);
          ctx.fillRect(signCx - rsw / 2 + 2.5, signCy - 1.5, 10, 3);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('АПТЕКА 36.6', signCx + 4, signCy);
        } else if (bld.shopBrand === 'pyaterochka') {
          const rsw = Math.min(150, bld.width - 20);
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(signCx - rsw / 2, signCy - 8, rsw, 16);
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(signCx - rsw / 2, signCy - 8, rsw, 16);

          // "5" emblem
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(signCx - rsw / 2 + 10, signCy, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#dc2626';
          ctx.font = 'bold 7px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('5', signCx - rsw / 2 + 10, signCy + 0.5);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText('ПЯТЁРОЧКА', signCx + 6, signCy);
        } else if (bld.shopBrand === 'cofix_bakery') {
          const rsw = Math.min(140, bld.width - 20);
          ctx.fillStyle = '#18181b';
          ctx.fillRect(signCx - rsw / 2, signCy - 8, rsw, 16);
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(signCx - rsw / 2, signCy - 8, rsw, 16);

          ctx.fillStyle = '#ea580c';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('COFIX & BAKERY', signCx, signCy);
        } else if (bld.shopBrand === 'bean_bistro') {
          const rsw = Math.min(140, bld.width - 20);
          ctx.fillStyle = '#291104';
          ctx.fillRect(signCx - rsw / 2, signCy - 8, rsw, 16);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(signCx - rsw / 2, signCy - 8, rsw, 16);

          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('BEAN & BISTRO', signCx, signCy);
        } else if (bld.shopBrand === 'pitstop_service') {
          const rsw = Math.min(150, bld.width - 20);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(signCx - rsw / 2, signCy - 8, rsw, 16);
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(signCx - rsw / 2, signCy - 8, rsw, 16);

          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('PIT-STOP SERVICE', signCx, signCy);
        } else if (bld.shopBrand === 'splav_gear') {
          const rsw = Math.min(140, bld.width - 20);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(signCx - rsw / 2, signCy - 8, rsw, 16);
          ctx.strokeStyle = '#84cc16';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(signCx - rsw / 2, signCy - 8, rsw, 16);

          ctx.fillStyle = '#84cc16';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('СПЛАВ ТУРИЗМ', signCx, signCy);
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

  // --- DROPPED / COLLECTIBLE GROUND ITEMS ---
  private renderGroundItems(
    groundItems: GroundItem[] | undefined,
    player: Player,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) {
    if (!groundItems || groundItems.length === 0) return;
    const ctx = this.ctx;
    const now = Date.now();

    for (const gi of groundItems) {
      if (gi.x < minX - 30 || gi.x > maxX + 30 || gi.y < minY - 30 || gi.y > maxY + 30) continue;

      const distToPlayer = Math.hypot(player.x - gi.x, player.y - gi.y);
      const isNearby = distToPlayer < 40;

      ctx.save();
      ctx.translate(gi.x, gi.y);

      // 1. Subtle, realistic flat shadow under the item
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 2, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      if (!gi.item) {
        ctx.restore();
        continue;
      }

      // 2. Item 2D Procedural Model (Size 12 is realistic, sits flat on the ground)
      if (gi.item.itemId) {
        drawItemModel2D(ctx, gi.item.itemId, 0, 0, 12);
      }

      // 3. Tooltip pill above item removed per user request

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
        // Paved Concrete Foundation Pad (guarantees bench always rests on paved slab, never raw grass)
        ctx.fillStyle = '#64748b';
        ctx.fillRect(-13, -8, 26, 16);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-13, -8, 26, 16);

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
        // Concrete Waste Pad (площадка ТБО)
        ctx.fillStyle = '#475569';
        ctx.fillRect(-18, -13, 36, 26);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-18, -13, 36, 26);

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
      if (performanceConfig.enableShadows) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(tree.x + tree.shadowOffset, tree.y + tree.shadowOffset, tree.radius, 0, Math.PI * 2);
        ctx.fill();
      }

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
        safeRoundRect(ctx, -4.5, -7.5, 2.5, 15, 1);
        ctx.fill();

        // Housing
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        safeRoundRect(ctx, -3.5, -4.5, 7, 9, 1.5);
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
        safeRoundRect(ctx, -2.5, -2.5, 5, 5, 1);
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
        safeRoundRect(ctx, headX - 4 + 3, headY - 4 + 3, 8, 8, 2);
        ctx.fill();

        ctx.beginPath();
        safeRoundRect(ctx, pedHeadX - 2.5 + 2, pedHeadY - 2.5 + 2, 5, 5, 1);
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
        safeRoundRect(ctx, -4.5, -7.5, 2.5, 15, 1);
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 0.75;
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        safeRoundRect(ctx, -3.5, -4.5, 7, 9, 1.5);
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
        safeRoundRect(ctx, -2.5, -2.5, 5, 5, 1);
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

      const rX = Math.max(0.1, p.radiusX);
      const rY = Math.max(0.1, p.radiusY);
      const seed = hashString(p.id);

      // Deep sky reflection body with wet border transition
      const grad = safeRadialGradient(ctx, -rX * 0.1, -rY * 0.1, 0, 0, 0, rX);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.25)'); // Sky-blue reflection core
      grad.addColorStop(0.55, 'rgba(30, 41, 59, 0.38)'); // Dark asphalt wet surface visible through water
      grad.addColorStop(0.92, 'rgba(15, 23, 42, 0.52)'); // Edge refraction ring
      grad.addColorStop(1, 'rgba(15, 23, 42, 0)');

      ctx.fillStyle = grad;
      this.drawOrganicBlob(ctx, rX, rY, seed);
      ctx.fill();

      // Sky reflection of dynamic cloud outline
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.save();
      ctx.translate(-rX * 0.25, -rY * 0.2);
      this.drawOrganicBlob(ctx, rX * 0.45, rY * 0.32, seed + 1);
      ctx.fill();
      ctx.restore();

      // Animated realistic organic water ripples
      if (performanceConfig.enableRainDroplets) {
        const rippleR = Math.abs((p.rippleTimer * 12) % rX);
        const rippleRY = Math.abs(rippleR * (rY / rX));
        const alpha = Math.max(0, 0.35 * (1 - rippleR / rX));
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        this.drawOrganicBlob(ctx, rippleR, rippleRY, seed + p.rippleTimer);
        ctx.stroke();
      }

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

      // 1. Legs / Pants / Shoes
      ctx.fillStyle = ped.pantsColor;
      if (!ped.isCyclist && !ped.isScooter) {
        ctx.fillRect(-1.5, -legSwing - 3.5, 3, 3);
        ctx.fillRect(-1.5, legSwing + 0.5, 3, 3);
        // Shoes / Sneakers visible on feet during movement
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(1.5, -legSwing - 3.5, 1.2, 3);
        ctx.fillRect(1.5, legSwing + 0.5, 1.2, 3);
      } else {
        // Pedaling or standing on scooter
        ctx.fillRect(-1.5, -2.5, 3, 2);
        ctx.fillRect(-1.5, 0.5, 3, 2);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(1.5, -2.5, 1.2, 2);
        ctx.fillRect(1.5, 0.5, 1.2, 2);
      }

      // 2. Torso & Detailed Clothing (Top-Down Silhouette with Shoulders, Collars, Jackets & Dresses)
      const clothType = ped.clothingType || 'tshirt';
      const mainShirtColor = ped.shirtColor || '#3b82f6';
      const jacketCol = ped.jacketColor || '#1e293b';
      const innerCol = ped.innerShirtColor || '#ffffff';

      // Base shoulder width & torso shape
      if (clothType === 'open_jacket' || clothType === 'suit') {
        // Open unbuttoned jacket or formal suit jacket
        ctx.fillStyle = clothType === 'suit' ? '#0f172a' : jacketCol;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.2, 5.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner shirt V-opening down the chest center
        ctx.fillStyle = innerCol;
        ctx.beginPath();
        ctx.moveTo(3.5, 0);
        ctx.lineTo(-2.0, -1.8);
        ctx.lineTo(-2.0, 1.8);
        ctx.closePath();
        ctx.fill();

        if (clothType === 'suit') {
          // Dark formal tie
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(2.5, 0);
          ctx.lineTo(0.5, -0.6);
          ctx.lineTo(-1.5, 0);
          ctx.lineTo(0.5, 0.6);
          ctx.closePath();
          ctx.fill();
        } else {
          // Open Jacket lapel collar edges
          ctx.strokeStyle = 'rgba(255,255,255,0.25)';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(2.5, -2.2); ctx.lineTo(-1.0, -1.8);
          ctx.moveTo(2.5, 2.2); ctx.lineTo(-1.0, 1.8);
          ctx.stroke();
        }
      } else if (clothType === 'hoodie') {
        // Hoodie sweatshirt
        ctx.fillStyle = mainShirtColor;
        ctx.beginPath();
        ctx.ellipse(0.2, 0, 4.5, 5.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bunched fabric hood behind the neck
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.arc(-2.6, 0, 2.6, 0, Math.PI * 2);
        ctx.fill();

        // Drawstrings
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(1.2, -0.8); ctx.lineTo(2.8, -0.6);
        ctx.moveTo(1.2, 0.8); ctx.lineTo(2.8, 0.6);
        ctx.stroke();
      } else if (clothType === 'dress') {
        // Flowing dress / skirt top
        ctx.fillStyle = mainShirtColor;
        ctx.beginPath();
        ctx.moveTo(-3.5, -5.8);
        ctx.quadraticCurveTo(1.5, -5.0, 4.0, -2.2);
        ctx.lineTo(4.0, 2.2);
        ctx.quadraticCurveTo(1.5, 5.0, -3.5, 5.8);
        ctx.closePath();
        ctx.fill();

        // Waist belt / accent ribbon
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(-0.8, -4.8, 1.2, 9.6);
      } else if (clothType === 'button_shirt') {
        // Button-up collared shirt
        ctx.fillStyle = mainShirtColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.0, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Collar flaps at neck line
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(1.8, -1.8); ctx.lineTo(3.2, -0.8); ctx.lineTo(1.8, 0);
        ctx.moveTo(1.8, 1.8); ctx.lineTo(3.2, 0.8); ctx.lineTo(1.8, 0);
        ctx.fill();

        // Button placket line
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-2.5, 0); ctx.lineTo(2.0, 0);
        ctx.stroke();
      } else {
        // Standard T-shirt / Janitor / Vest
        ctx.fillStyle = ped.isJanitor ? '#ca8a04' : mainShirtColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.0, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // High-vis silver reflective stripes for janitors
        if (ped.isJanitor) {
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(-1.0, -4.5); ctx.lineTo(-1.0, 4.5);
          ctx.moveTo(1.2, -4.5); ctx.lineTo(1.2, 4.5);
          ctx.stroke();
        } else {
          // Curved t-shirt neck collar line revealing skin
          ctx.fillStyle = ped.skinColor;
          ctx.beginPath();
          ctx.arc(1.8, 0, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Backpack
      if (ped.hasBackpack) {
        ctx.fillStyle = ped.backpackColor || '#1e293b';
        ctx.beginPath();
        safeRoundRect(ctx, -5.2, -3.6, 3.8, 7.2, 0.8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-5.2, -3.6, 3.8, 7.2);

        // Shoulder straps over front shoulders
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-1.5, -3.2); ctx.lineTo(1.5, -2.8);
        ctx.moveTo(-1.5, 3.2); ctx.lineTo(1.5, 2.8);
        ctx.stroke();
      }

      // Arms & Hand Posing
      const sleeveColor = (clothType === 'open_jacket' ? jacketCol : mainShirtColor);
      if (ped.state === 'idle_phone' || ped.handheldProp === 'phone') {
        // Both arms extended forward holding phone in front of chest
        ctx.fillStyle = sleeveColor;
        ctx.fillRect(1.0, -4.2, 3.2, 2.0);  // Left sleeve
        ctx.fillRect(1.0, 2.2, 3.2, 2.0);   // Right sleeve
        ctx.fillStyle = ped.skinColor;
        ctx.fillRect(3.8, -2.6, 2.0, 1.8);  // Left hand
        ctx.fillRect(3.8, 0.8, 2.0, 1.8);   // Right hand
      } else if (ped.handheldProp === 'box') {
        // Holding box in front with both hands
        ctx.fillStyle = sleeveColor;
        ctx.fillRect(1.0, -4.8, 4.0, 2.0);  // Left sleeve
        ctx.fillRect(1.0, 2.8, 4.0, 2.0);   // Right sleeve
        ctx.fillStyle = ped.skinColor;
        ctx.fillRect(4.8, -3.8, 1.8, 1.6);  // Left hand
        ctx.fillRect(4.8, 2.2, 1.8, 1.6);   // Right hand
      } else if (ped.hasBroom) {
        // Janitor holding broom handle
        ctx.fillStyle = ped.isJanitor ? '#ca8a04' : sleeveColor;
        ctx.fillRect(1.0, -3.8, 3.5, 2.0);  // Left sleeve
        ctx.fillRect(1.0, 2.0, 4.5, 2.0);   // Right sleeve
        ctx.fillStyle = ped.skinColor;
        ctx.fillRect(4.2, -2.2, 1.6, 1.6);  // Left hand
        ctx.fillRect(5.2, 0.2, 1.8, 1.6);   // Right hand
      } else if (ped.handheldProp === 'coffee') {
        // Right arm extended forward holding coffee cup
        ctx.fillStyle = sleeveColor;
        ctx.fillRect(armSwing - 1.5, -4.8, 3, 2.2); // Left arm swinging
        ctx.fillRect(1.0, 2.8, 3.5, 2.0);            // Right sleeve forward
        ctx.fillStyle = ped.skinColor;
        ctx.fillRect(4.2, 3.8, 1.6, 1.8);            // Right hand holding cup
      } else if (ped.handheldProp === 'bag') {
        // Right arm carrying shopping bag beside body
        const bagArmSwing = Math.cos(ped.walkCycle) * 0.8;
        ctx.fillStyle = sleeveColor;
        ctx.fillRect(armSwing - 1.5, -4.8, 3, 2.2);      // Left arm swinging
        ctx.fillRect(bagArmSwing - 0.5, 3.6, 2.8, 2.0);  // Right sleeve
        ctx.fillStyle = ped.skinColor;
        ctx.fillRect(bagArmSwing + 0.5, 5.8, 2.0, 2.0);  // Right hand holding bag handle
      } else if (ped.isCyclist || ped.isScooter) {
        // Holding handlebars
        ctx.fillStyle = sleeveColor;
        ctx.fillRect(2, -4.5, 3, 2);
        ctx.fillRect(2, 2.5, 3, 2);
      } else {
        ctx.fillStyle = sleeveColor;
        ctx.fillRect(armSwing - 1.5, -4.8, 3, 2.2);
        ctx.fillRect(-armSwing - 1.5, 2.6, 3, 2.2);
        ctx.fillStyle = ped.skinColor;
        ctx.fillRect(armSwing + 1.2, -4.8, 1.5, 2.2);
        ctx.fillRect(-armSwing + 1.2, 2.6, 1.5, 2.2);
      }

      // 3. Head & Facial Anatomy (Ears, Nose, Glasses)
      // Ears on left and right side of head
      ctx.fillStyle = ped.skinColor;
      ctx.beginPath();
      ctx.arc(1.5, -3.4, 0.9, 0, Math.PI * 2); // Left ear
      ctx.arc(1.5, 3.4, 0.9, 0, Math.PI * 2);  // Right ear
      ctx.fill();

      // Head Base
      ctx.beginPath();
      ctx.arc(1.5, 0, 3.3, 0, Math.PI * 2);
      ctx.fill();

      // Subtle nose bump at front of face (+X)
      ctx.beginPath();
      ctx.arc(4.6, 0, 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Glasses / Sunglasses
      if (ped.hasGlasses) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(3.2, -2.4, 1.0, 1.8); // Left lens
        ctx.fillRect(3.2, 0.6, 1.0, 1.8);  // Right lens
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(3.7, -0.6); ctx.lineTo(3.7, 0.6); // Bridge
        ctx.moveTo(3.7, -2.4); ctx.lineTo(1.8, -3.4); // Ear stem L
        ctx.moveTo(3.7, 2.4); ctx.lineTo(1.8, 3.4);   // Ear stem R
        ctx.stroke();
      }

      // 4. Hairstyles (Deep Top-Down Detailing)
      if (ped.hairStyle === 'bald') {
        // Bald head shine highlight
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(2.2, -0.8, 0.9, 0, Math.PI * 2);
        ctx.fill();
      } else if (!ped.hasHat) {
        ctx.fillStyle = ped.hairColor;
        ctx.beginPath();
        if (ped.hairStyle === 'short') {
          // Neat short hair with crown texture & sideburns
          ctx.arc(0.4, 0, 3.2, Math.PI * 0.45, Math.PI * 1.55);
          ctx.fill();
          // Hair parted crown highlight line
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(0.8, -1.5); ctx.lineTo(2.2, -0.2);
          ctx.stroke();
        } else if (ped.hairStyle === 'long') {
          // Flowing long hair over shoulders
          ctx.arc(0, 0, 3.5, Math.PI * 0.35, Math.PI * 1.65);
          ctx.ellipse(-1.8, -2.8, 3.2, 1.8, -Math.PI / 5, 0, Math.PI * 2);
          ctx.ellipse(-1.8, 2.8, 3.2, 1.8, Math.PI / 5, 0, Math.PI * 2);
          ctx.fill();
          // Hair strand highlights
          ctx.strokeStyle = 'rgba(255,255,255,0.22)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(-1.0, -3.5); ctx.lineTo(-3.2, -2.5);
          ctx.moveTo(-1.0, 3.5); ctx.lineTo(-3.2, 2.5);
          ctx.stroke();
        } else if (ped.hairStyle === 'bun') {
          // Smooth hair pulled into a voluminous bun
          ctx.arc(0.4, 0, 3.1, Math.PI * 0.5, Math.PI * 1.5);
          ctx.arc(-2.6, 0, 2.2, 0, Math.PI * 2);
          ctx.fill();
          // Bun hair tie ring
          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        } else if (ped.hairStyle === 'ponytail') {
          // Hair pulled back into a trailing ponytail
          ctx.arc(0.4, 0, 3.1, Math.PI * 0.5, Math.PI * 1.5);
          ctx.ellipse(-3.8, 0, 3.4, 1.3, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (ped.hairStyle === 'spiky') {
          // Spiky hair locks
          ctx.moveTo(0.4, -3.2);
          ctx.lineTo(2.2, -4.2); ctx.lineTo(1.2, -2.2);
          ctx.lineTo(3.2, -1.2); ctx.lineTo(1.8, 0);
          ctx.lineTo(3.2, 1.2); ctx.lineTo(1.2, 2.2);
          ctx.lineTo(2.2, 4.2); ctx.lineTo(0.4, 3.2);
          ctx.arc(0.4, 0, 3.1, Math.PI * 0.5, Math.PI * 1.5);
          ctx.fill();
        } else if (ped.hairStyle === 'curly') {
          // Curly hair ringlets around head
          for (let angle = 0.5; angle < Math.PI * 1.8; angle += 0.45) {
            const hx = 1.0 + Math.cos(angle) * 3.2;
            const hy = Math.sin(angle) * 3.2;
            ctx.arc(hx, hy, 1.3, 0, Math.PI * 2);
          }
          ctx.fill();
        } else if (ped.hairStyle === 'afro') {
          // Volumetric rounded afro
          ctx.arc(0.2, 0, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // 5. Headphones (Over-Ear)
      if (ped.hasHeadphones && !ped.hasHat) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(1.5, 0, 3.6, -Math.PI * 0.4, Math.PI * 0.4); // Headband
        ctx.stroke();
        ctx.fillStyle = '#38bdf8'; // Earcups
        ctx.fillRect(1.0, -4.2, 1.6, 1.2);
        ctx.fillRect(1.0, 3.0, 1.6, 1.2);
      }

      // 6. Hats / Caps / Sunhats / Fedoras
      if (ped.hasHat) {
        ctx.fillStyle = ped.hatColor || '#1e293b';
        ctx.beginPath();
        if (ped.hatType === 'cap') {
          ctx.arc(0.8, 0, 3.2, 0, Math.PI * 2);
          ctx.fillRect(3.0, -2.0, 3.2, 4.0); // Baseball cap visor bill
        } else if (ped.hatType === 'beanie') {
          ctx.arc(0.6, 0, 3.5, 0, Math.PI * 2);
          ctx.fill();
          // Knit texture lines on beanie
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(-2.5, -2.0); ctx.lineTo(2.5, -2.0);
          ctx.moveTo(-2.5, 0); ctx.lineTo(2.5, 0);
          ctx.moveTo(-2.5, 2.0); ctx.lineTo(2.5, 2.0);
          ctx.stroke();
        } else if (ped.hatType === 'sunhat') {
          ctx.arc(1.0, 0, 5.8, 0, Math.PI * 2); // Wide brim
          ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.2)'; // Sunhat band
          ctx.beginPath();
          ctx.arc(1.0, 0, 3.2, 0, Math.PI * 2);
        } else if (ped.hatType === 'fedora') {
          ctx.arc(1.0, 0, 4.8, 0, Math.PI * 2); // Fedora brim
          ctx.fill();
          ctx.fillStyle = '#0f172a'; // Hat band
          ctx.beginPath();
          ctx.arc(1.0, 0, 3.2, 0, Math.PI * 2);
        }
        ctx.fill();
      }

      // Handheld Prop (Top-down view, held in hands in front/side of character)
      if ((ped.handheldProp || ped.state === 'idle_phone') && !ped.hasDroppedProp && ped.state !== 'panicking') {
        const propType = ped.handheldProp || (ped.state === 'idle_phone' ? 'phone' : null);
        ctx.save();

        if (propType === 'phone') {
          // Top-down Smartphone held in hands in front of chest at X = 6.0, Y = 0
          ctx.translate(6.0, 0);

          // Soft glowing screen cone projected on ground in front
          const screenGlow = ctx.createRadialGradient(2, 0, 0.5, 2, 0, 7);
          screenGlow.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
          screenGlow.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
          ctx.fillStyle = screenGlow;
          ctx.beginPath();
          ctx.arc(2, 0, 7, -Math.PI * 0.4, Math.PI * 0.4);
          ctx.fill();

          // Ground drop shadow under phone
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.fillRect(-1.4, -1.2, 3.4, 2.8);

          // Phone outer casing (sleek dark rounded rectangle)
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          safeRoundRect(ctx, -1.6, -1.4, 3.6, 2.8, 0.6);
          ctx.fill();

          // Phone metal bezel
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          safeRoundRect(ctx, -1.4, -1.2, 3.2, 2.4, 0.4);
          ctx.fill();

          // Top-down illuminated glass screen
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(-1.2, -1.0, 2.8, 2.0);

          // Screen UI layout lines (top bar, content blocks viewed from top)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-0.8, -0.7, 1.4, 0.4);
          ctx.fillRect(-0.8, -0.1, 2.0, 0.4);
          ctx.fillRect(-0.8, 0.4, 1.0, 0.4);

          // Top-down skin thumbs/fingers gripping phone sides
          ctx.fillStyle = ped.skinColor;
          ctx.beginPath();
          ctx.arc(-0.4, -1.4, 0.7, 0, Math.PI * 2);
          ctx.arc(-0.4, 1.4, 0.7, 0, Math.PI * 2);
          ctx.fill();
        } else if (propType === 'coffee') {
          // Top-down Coffee Cup held in right hand at X = 5.4, Y = 4.8
          ctx.translate(5.4, 4.8);

          // Ground shadow
          ctx.fillStyle = 'rgba(0,0,0,0.22)';
          ctx.beginPath();
          ctx.arc(0.5, 0.5, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // White takeaway cup outer rim (top-down circle)
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
          ctx.fill();

          // Kraft brown heat sleeve ring
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.arc(0, 0, 2.0, 0, Math.PI * 2);
          ctx.fill();

          // Dark plastic dome lid circle
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Sip hole spout dot on lid
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(0.9, 0, 0.4, 0, Math.PI * 2);
          ctx.fill();

          // Skin fingers gripping cup edge
          ctx.fillStyle = ped.skinColor;
          ctx.beginPath();
          ctx.arc(0, 2.2, 0.8, 0, Math.PI * 2);
          ctx.fill();
        } else if (propType === 'box') {
          // Top-down Cardboard Box held in front of chest at X = 7.0, Y = 0
          ctx.translate(7.0, 0);

          // Ground shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
          ctx.fillRect(-2.2, -3.2, 5.2, 7.2);

          // Cardboard top surface
          ctx.fillStyle = '#b45309';
          ctx.fillRect(-2.6, -3.6, 5.2, 7.2);

          // Box perimeter outline
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(-2.6, -3.6, 5.2, 7.2);

          // Center seam of top box flaps
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(0, -3.6);
          ctx.lineTo(0, 3.6);
          ctx.stroke();

          // Beige packing tape strip across top flaps
          ctx.fillStyle = '#fef3c7';
          ctx.fillRect(-0.7, -3.6, 1.4, 7.2);

          // Shipping label rectangle on box top
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-2.0, -2.6, 1.4, 2.0);

          // Skin hands gripping left and right edges from top view
          ctx.fillStyle = ped.skinColor;
          ctx.beginPath();
          ctx.arc(0, -3.6, 1.0, 0, Math.PI * 2);
          ctx.arc(0, 3.6, 1.0, 0, Math.PI * 2);
          ctx.fill();
        } else if (propType === 'bag') {
          // Top-down Shopping Bag held in right hand beside body at X = bagArmSwing + 1.2, Y = 7.2
          const bagArmSwing = Math.cos(ped.walkCycle) * 0.8;
          ctx.translate(bagArmSwing + 1.2, 7.2);

          const bagColor = ped.propColor || '#e11d48';

          // Ground shadow under bag
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.beginPath();
          safeEllipse(ctx, 0.5, 0.5, 3.8, 2.2, 0, 0, Math.PI * 2);
          ctx.fill();

          // Top-down bag body (open-top rectangular/elliptical tote bag)
          ctx.fillStyle = bagColor;
          ctx.beginPath();
          safeRoundRect(ctx, -3.2, -1.8, 6.4, 3.6, 1.0);
          ctx.fill();

          // Bag top rim highlight/border
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 0.6;
          ctx.strokeRect(-3.2, -1.8, 6.4, 3.6);

          // Dark interior opening visible from top view
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.beginPath();
          ctx.ellipse(0, 0, 2.4, 1.0, 0, 0, Math.PI * 2);
          ctx.fill();

          // Bag handles going from inside bag rim to hand grip point
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(-1.8, -0.6);
          ctx.lineTo(-0.6, -2.2);
          ctx.moveTo(1.8, -0.6);
          ctx.lineTo(0.6, -2.2);
          ctx.stroke();

          // Skin hand fingers gripping handles
          ctx.fillStyle = ped.skinColor;
          ctx.beginPath();
          ctx.arc(0, -2.2, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Janitor Broom (Pure Top-Down View: shaft extends forward from hands, broom head at front)
      if (ped.hasBroom) {
        ctx.save();

        // Ground drop shadow under broom shaft and head
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.beginPath();
        ctx.fillRect(4.5, -0.5, 12.0, 1.2); // Shaft shadow
        ctx.fillRect(16.0, -5.5, 2.8, 12.0); // Head shadow
        ctx.fill();

        // Broom Shaft: wooden pole extending forward from hands (X = 4.5 to 16.5)
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(4.5, -1.0);
        ctx.lineTo(16.5, 0.5);
        ctx.stroke();

        // Metallic collar where shaft joins broom head
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(15.2, -0.2, 1.4, 1.4);

        // Broom Head (Transverse bar & dense sweeping bristles at X = 16.5)
        ctx.save();
        ctx.translate(16.5, 0.5);

        // Transverse wooden head bar (top view perpendicular to handle)
        ctx.fillStyle = '#571c05';
        ctx.fillRect(-0.8, -5.0, 2.2, 10.0);

        // Dense broom bristles spreading forward along +X axis from head bar
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(1.4, -5.0);
        ctx.lineTo(6.0, -6.0);
        ctx.lineTo(6.0, 6.0);
        ctx.lineTo(1.4, 5.0);
        ctx.fill();

        // Bristle fiber texture lines
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        for (let y = -4.5; y <= 4.5; y += 1.5) {
          ctx.moveTo(1.4, y);
          ctx.lineTo(6.0, y * 1.15);
        }
        ctx.stroke();

        ctx.restore(); // restore broom head translate

        // Hands gripping handle in front of chest at X = 5.2 and X = 6.8
        ctx.fillStyle = ped.skinColor;
        ctx.beginPath();
        ctx.arc(5.2, -0.9, 1.0, 0, Math.PI * 2);
        ctx.arc(6.8, 0.5, 1.0, 0, Math.PI * 2);
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
        safeRoundRect(ctx, -bw / 2, -bh, bw, bh, 6);
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

    // Flying levitation aura & indicator
    if (player.isFlying) {
      const flyPulse = Math.sin(Date.now() * 0.008) * 3;
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 16 + flyPulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(165, 243, 252, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 22 + flyPulse, 0, Math.PI * 2);
      ctx.stroke();

      // Badge above head
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a';
      safeRoundRect(ctx, -28, -28, 56, 18, 9);
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1;
      safeRoundRect(ctx, -28, -28, 56, 18, 9);
      ctx.stroke();

      ctx.fillStyle = '#22d3ee';
      ctx.fillText('✈️ ФЛАЙ', 0, -15);
    }

    ctx.restore(); // end translate
  }

  /**
   * Renders the ghost/placement preview for Creative Mode object spawning.
   */
  private renderPlacementPreview(placement: ActivePlacement, pos: { x: number; y: number }) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(pos.x, pos.y);

    const now = Date.now();
    const pulse = Math.sin(now * 0.008) * 0.15 + 0.85;

    // 1. Placement ring on ground
    ctx.strokeStyle = '#22c55e'; // Vibrant Green
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Crosshair lines
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-16, 0); ctx.lineTo(16, 0);
    ctx.moveTo(0, -16); ctx.lineTo(0, 16);
    ctx.stroke();

    // 2. Rotated Entity Shape Preview
    ctx.save();
    ctx.rotate(placement.angle);

    ctx.fillStyle = 'rgba(34, 197, 94, 0.28)';
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2.5;

    if (placement.type === 'vehicle') {
      const w = 48;
      const h = 24;
      ctx.beginPath();
      safeRoundRect(ctx, -w / 2, -h / 2, w, h, 6);
      ctx.fill();
      ctx.stroke();

      // Front windshield & headlight direction marker
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.fillRect(w / 4, -h / 2 + 3, 6, h - 6);

      // Direction arrow pointing forward (+X)
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(w / 2 + 12, 0);
      ctx.lineTo(w / 2 + 2, -8);
      ctx.lineTo(w / 2 + 2, 8);
      ctx.closePath();
      ctx.fill();
    } else if (placement.type === 'prop') {
      const size = 22;
      ctx.beginPath();
      safeRoundRect(ctx, -size / 2, -size / 2, size, size, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(size / 2 + 10, 0);
      ctx.lineTo(size / 2, -6);
      ctx.lineTo(size / 2, 6);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore(); // end rotated entity preview

    // 3. Name & Angle Badge
    const deg = Math.round((((placement.angle * 180) / Math.PI) % 360 + 360) % 360);
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = `${placement.nameRu} (${deg}°)`;
    const tw = ctx.measureText(text).width;
    const padW = tw + 20;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    safeRoundRect(ctx, -padW / 2, -48, padW, 22, 11);
    ctx.fill();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.2;
    safeRoundRect(ctx, -padW / 2, -48, padW, 22, 11);
    ctx.stroke();

    ctx.fillStyle = '#4ade80';
    ctx.fillText(text, 0, -37);

    // Tip line
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('R — повернуть | Клик — спавн | Esc — отмена', 0, 42);

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

      // 3. Body Shell Contours (with Crumple/Dent deform calculations)
      const dmg: VehicleDamage = car.damage || ({
        health: 100, frontCrumple: 0, rearCrumple: 0, leftDent: 0, rightDent: 0,
        frontLeftDent: 0, frontRightDent: 0, rearLeftDent: 0, rearRightDent: 0,
        hoodBuckled: false, windshieldCracked: false, rearGlassCracked: false,
        leftHeadlightBroken: false, rightHeadlightBroken: false,
        leftTaillightBroken: false, rightTaillightBroken: false,
        engineSmoking: false, underHoodSmolder: false, engineFire: false, cabinFire: false,
        fireProgress: 0, fireIntensity: 0, isFullyBurnt: false, scratches: [], deformedVertices: []
      } as unknown as VehicleDamage);

      const fc = Math.min(halfL * 0.55, dmg.frontCrumple || 0);
      const rc = Math.min(halfL * 0.45, dmg.rearCrumple || 0);
      const ld = Math.min(halfW * 0.75, dmg.leftDent || 0);
      const rd = Math.min(halfW * 0.75, dmg.rightDent || 0);
      const fld = Math.min(halfL * 0.4, dmg.frontLeftDent || 0);
      const frd = Math.min(halfL * 0.4, dmg.frontRightDent || 0);
      const rld = Math.min(halfL * 0.35, dmg.rearLeftDent || 0);
      const rrd = Math.min(halfL * 0.35, dmg.rearRightDent || 0);

      const basePoly = getVehicleBasePolygon(car, halfL, halfW, fc, rc, ld, rd, fld, frd, rld, rrd);

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
                          car.type === 'truck_dump' || car.type === 'garbage_truck' ||
                          car.type === 'fire_ladder' || car.type === 'truck_water';
      const isHeavyTruck = isThreeAxle || car.type === 'truck_water' || car.type === 'fire_engine' || 
                           car.type === 'fire_rescue' || car.type === 'bus' || car.type === 'truck_tow' || 
                           car.type === 'truck_armored' || car.type === 'delivery_truck' || car.type === 'pickup_heavy';

      const isDually = car.type === 'pickup_heavy';
      const isSport = car.type === 'sports' || car.type === 'supercar' || car.type === 'coupe_gt' || car.type === 'hatch_hot';
      const isMicro = car.type === 'micro_car' || car.type === 'retro_bubble';
      const isOffroadHeavy = car.type === 'offroad_hardcore' || car.type === 'suv_classic_box';

      const wheelL = isHeavyTruck ? 11.5 : (isSport ? 10.5 : (isMicro ? 7.6 : 9.5));
      const wheelW = isHeavyTruck ? 5.2 : (isSport ? 5.8 : (isMicro ? 3.4 : (isOffroadHeavy ? 4.8 : 4.2)));
      const frontAxleX = (isThreeAxle || isHeavyTruck) ? halfL * 0.72 : (car.type === 'supercar' ? halfL * 0.68 : halfL * 0.65);
      const trackY = halfW - 0.8; // Tucked slightly inside halfW

      const renderFixedWheel = (wx: number, wy: number) => {
        const cy = wy + wheelW / 2;
        const [dwx, dwy] = deform(wx, cy);
        ctx.fillStyle = '#0f172a'; // Tire
        ctx.fillRect(dwx - wheelL / 2, dwy - wheelW / 2, wheelL, wheelW);
        ctx.fillStyle = isSport ? '#cbd5e1' : '#64748b'; // Rims
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
      } else if (isDually) {
        // Dually pickup truck (dual rear tires)
        const rearAxleX = -halfL * 0.62;
        renderFixedWheel(rearAxleX, -trackY);
        renderFixedWheel(rearAxleX, -trackY + wheelW + 0.6);
        renderFixedWheel(rearAxleX, trackY - wheelW);
        renderFixedWheel(rearAxleX, trackY - wheelW * 2 - 0.6);
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
        ctx.fillStyle = isSport ? '#cbd5e1' : '#64748b';
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

      // Soot charring & fire heat glow overlays
      const fireProg = dmg.fireProgress || (dmg.isFullyBurnt ? 1.0 : (dmg.cabinFire ? 0.65 : ((dmg.engineFire || dmg.fuelTankFire) ? 0.28 : (dmg.underHoodSmolder ? 0.08 : 0))));
      if (fireProg > 0 || dmg.isFullyBurnt) {
        const charAlpha = Math.min(0.92, fireProg * 0.85 + (dmg.isFullyBurnt ? 0.90 : 0));
        ctx.fillStyle = `rgba(15, 23, 42, ${charAlpha})`;
        ctx.beginPath();
        ctx.moveTo(bodyPoly[0].x, bodyPoly[0].y);
        for (let i = 1; i < bodyPoly.length; i++) {
          ctx.lineTo(bodyPoly[i].x, bodyPoly[i].y);
        }
        ctx.closePath();
        ctx.fill();

        // Fire heat glow flicker on vehicle
        if ((dmg.engineFire || dmg.fuelTankFire || dmg.cabinFire) && !dmg.isFullyBurnt) {
          const glowPulse = 0.6 + Math.sin(Date.now() * 0.012) * 0.4;
          const isRearOnly = dmg.fuelTankFire && !dmg.cabinFire && !dmg.engineFire;
          const glowCenter = dmg.cabinFire ? 0 : (isRearOnly ? -halfL * 0.35 : halfL * 0.22);
          const glowRadius = dmg.cabinFire ? halfL * 0.95 : halfL * 0.75;
          const fireGlowGrad = ctx.createRadialGradient(glowCenter, 0, 2, glowCenter, 0, glowRadius);
          fireGlowGrad.addColorStop(0, `rgba(254, 240, 138, ${0.9 * glowPulse})`);
          fireGlowGrad.addColorStop(0.4, `rgba(249, 115, 22, ${0.75 * glowPulse})`);
          fireGlowGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.fillStyle = fireGlowGrad;
          ctx.beginPath();
          ctx.moveTo(bodyPoly[0].x, bodyPoly[0].y);
          for (let i = 1; i < bodyPoly.length; i++) {
            ctx.lineTo(bodyPoly[i].x, bodyPoly[i].y);
          }
          ctx.closePath();
          ctx.fill();
        }
      }

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

      const dmg: VehicleDamage = car.damage || ({
        health: 100, frontCrumple: 0, rearCrumple: 0, leftDent: 0, rightDent: 0,
        frontLeftDent: 0, frontRightDent: 0, rearLeftDent: 0, rearRightDent: 0,
        hoodBuckled: false, windshieldCracked: false, rearGlassCracked: false,
        leftHeadlightBroken: false, rightHeadlightBroken: false,
        leftTaillightBroken: false, rightTaillightBroken: false,
        engineSmoking: false, underHoodSmolder: false, engineFire: false, cabinFire: false,
        fireProgress: 0, fireIntensity: 0, isFullyBurnt: false, scratches: [], deformedVertices: []
      } as unknown as VehicleDamage);

      const fc = Math.min(halfL * 0.55, dmg.frontCrumple || 0);
      const rc = Math.min(halfL * 0.45, dmg.rearCrumple || 0);
      const ld = Math.min(halfW * 0.75, dmg.leftDent || 0);
      const rd = Math.min(halfW * 0.75, dmg.rightDent || 0);
      const fld = Math.min(halfL * 0.4, dmg.frontLeftDent || 0);
      const frd = Math.min(halfL * 0.4, dmg.frontRightDent || 0);
      const rld = Math.min(halfL * 0.35, dmg.rearLeftDent || 0);
      const rrd = Math.min(halfL * 0.35, dmg.rearRightDent || 0);

      const basePoly = getVehicleBasePolygon(car, halfL, halfW, fc, rc, ld, rd, fld, frd, rld, rrd);

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

      const drawDeformedCircle = (cx: number, cy: number, r: number, color: string, strokeColor?: string, lineWidth?: number) => {
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
        if (strokeColor) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = lineWidth || 1.0;
          ctx.stroke();
        }
      };

      // Cabin dimensions setup
      const { cabinL, cabinW, cabinX } = getVehicleCabinDimensions(car, halfL, halfW, ld, rd);

      const vCtx = {
        ctx,
        car,
        halfL,
        halfW,
        fc,
        rc,
        cabinX,
        cabinL,
        cabinW,
        deform,
        drawDeformedRect,
        drawDeformedLine,
        drawDeformedCircle,
        nightAlpha,
      };

      // Accurate greenhouse (windshield, roof, side glass, pillars, sedan trunk deck, wagon roof, pickup bed, supercar mid-engine, etc.)
      renderVehicleGreenhouseAndBodyPanels(vCtx);

      // Glass crack damage effect if windshield is broken
      if (car.type !== 'bus' && car.type !== 'ambulance' && car.type !== 'ambulance_van') {
        const roofL = cabinL * 0.66;
        const fWsX1 = cabinX + roofL / 2;
        const fWsX2 = cabinX + cabinL / 2;

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

        // Spiderweb crack damage effect if rear glass is broken
        if (dmg.rearGlassCracked) {
          const rWsX1 = cabinX - roofL / 2;
          const rWsX2 = cabinX - cabinL / 2;
          const wsMinX = rWsX2 + 1;
          const wsMaxX = rWsX1 - 1;
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

      // Specialized vehicle attachments, emergency sirens, cabins & equipment
      renderSpecializedVehicleAttachments(vCtx);

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
    const len = particles.length;
    if (len === 0) return;

    const smoke: typeof particles = [];
    const neutral: typeof particles = [];
    const flames: typeof particles = [];
    const sparks: typeof particles = [];

    // O(N) single-pass categorization to avoid multiple array scans
    for (let i = 0; i < len; i++) {
      const p = particles[i];
      const t = p.type;
      if (t === 'engine_smoke' || t === 'tire_smoke' || t === 'exhaust') {
        smoke.push(p);
      } else if (t === 'flame') {
        flames.push(p);
      } else if (t === 'spark') {
        sparks.push(p);
      } else {
        neutral.push(p);
      }
    }

    const ctx = this.ctx;

    // Pass 1: Render thick background smoke (engine smoke, tire smoke, exhaust)
    // Completely bypass ctx.save() / ctx.restore() to avoid expensive matrix allocations!
    for (let i = 0; i < smoke.length; i++) {
      const p = smoke[i];
      ctx.globalAlpha = Math.max(0, Math.min(1.0, p.alpha));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pass 2: Render neutral physics elements (glass shards, debris, water, etc.)
    for (let i = 0; i < neutral.length; i++) {
      const p = neutral[i];
      ctx.globalAlpha = Math.max(0, Math.min(1.0, p.alpha));
      if (p.type === 'glass_shard') {
        // Shards require translate and rotate, so they still need save/restore
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
      } else {
        // Other neutral (water splash, rain droplets, water fountains, etc.)
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Pass 3: Render glowing flames on top of smoke and debris
    const isLowQuality = performanceConfig.lowQualityRendering;
    for (let i = 0; i < flames.length; i++) {
      const p = flames[i];
      ctx.globalAlpha = Math.max(0, Math.min(1.0, p.alpha));
      const rad = p.radius;

      if (isLowQuality) {
        // High-performance double-circle approach bypasses CPU-heavy radial gradients completely
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Standard high-quality radial gradient
        const grad = ctx.createRadialGradient(p.x, p.y, rad * 0.2, p.x, p.y, rad);
        grad.addColorStop(0, '#fef08a');
        grad.addColorStop(0.4, '#f97316');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Pass 4: Render bright flying sparks/embers on the absolute top layer
    for (let i = 0; i < sparks.length; i++) {
      const p = sparks[i];
      ctx.globalAlpha = Math.max(0, Math.min(1.0, p.alpha));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner hot core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Safely restore global alpha
    ctx.globalAlpha = 1.0;
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
      if (bld.balconies && performanceConfig.enableBalconyDetails) {
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
      if (bld.balconies && performanceConfig.enableBalconyDetails) {
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

    ctx.restore();

    // Call dynamic weather overlay (Rain drops, ground ripples, volumetric fog, lightning bolts)
    this.renderWeatherOverlay(world, minX, minY, maxX, maxY);
  }

  private renderWeatherOverlay(world: GameWorld, minX: number, minY: number, maxX: number, maxY: number) {
    const ctx = this.ctx;
    const isRaining = world.weather === 'rain' || world.weather === 'storm';
    const isStorm = world.weather === 'storm';
    const isFog = world.weather === 'fog';
    const hasLightning = (world.lightningFlashTimer ?? 0) > 0;

    if (!isRaining && !isFog && !hasLightning) return;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    const now = performance.now();
    const timeSec = now * 0.001;
    const viewW = Math.max(100, maxX - minX);
    const viewH = Math.max(100, maxY - minY);

    // =========================================================================
    // 1. RAIN & STORM (TOP-DOWN REALISTIC PRECIPITATION & GROUND RIPPLES)
    // =========================================================================
    if (isRaining && performanceConfig.enableRainDroplets) {
      // Atmospheric overcast ambient tint
      ctx.fillStyle = isStorm ? 'rgba(10, 15, 30, 0.28)' : 'rgba(15, 23, 42, 0.14)';
      ctx.fillRect(minX, minY, viewW, viewH);

      // Wind gust calculation
      const windAngle = isStorm ? (0.24 + Math.sin(timeSec * 2.8) * 0.09) : 0.12;

      // --- A. Ground Impact Splashes & Puddle Ripples ---
      // In a top-down game, impact ripples on the asphalt and ground define the rain!
      const numRipples = isStorm ? 55 : 28;
      ctx.lineWidth = 1.0;

      for (let s = 0; s < numRipples; s++) {
        // Deterministic pseudo-random seed per ripple
        const seedX = ((s * 47.382) % 1);
        const seedY = ((s * 91.137) % 1);
        const speed = 1.2 + ((s * 13.7) % 1) * 0.8; // cycle frequency
        const phase = (timeSec * speed + (s * 0.23)) % 1.0;

        const rx = minX + seedX * viewW;
        const ry = minY + seedY * viewH;
        const maxR = isStorm ? 14 : 10;
        const r = 1.5 + phase * maxR;
        const alpha = Math.max(0, (1.0 - phase) * (isStorm ? 0.42 : 0.28));

        ctx.strokeStyle = `rgba(224, 242, 254, ${alpha})`;
        ctx.beginPath();
        // Top-down perspective aspect ratio 1.5 : 0.85
        safeEllipse(ctx, rx, ry, r * 1.3, r * 0.72, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Fresh impact micro-splash droplets (during initial 25% of ripple cycle)
        if (phase < 0.25) {
          const splashAlpha = (1.0 - phase / 0.25) * 0.55;
          ctx.fillStyle = `rgba(240, 249, 255, ${splashAlpha})`;
          const sparkDist = phase * 6.0;
          ctx.fillRect(rx - sparkDist, ry - sparkDist * 0.6, 1.2, 1.2);
          ctx.fillRect(rx + sparkDist, ry - sparkDist * 0.4, 1.2, 1.2);
        }
      }

      // --- B. Fast Aerodynamic Falling Micro-Drops (No platformer sticks!) ---
      // Top-down droplets fall rapidly through the camera frame: short streaks 4-8px
      const numDrops = isStorm ? 280 : 160;
      ctx.strokeStyle = isStorm ? 'rgba(219, 234, 254, 0.48)' : 'rgba(224, 242, 254, 0.32)';
      ctx.lineWidth = isStorm ? 1.3 : 1.0;
      ctx.beginPath();

      const fallSpeed = isStorm ? 1300 : 950;
      for (let r = 0; r < numDrops; r++) {
        const seedX = ((r * 157.61) % 1);
        const seedY = ((r * 283.47) % 1);
        const rx = minX + seedX * viewW;
        const ry = minY + ((seedY * viewH + timeSec * fallSpeed) % viewH);
        
        // Fast, short aerodynamic streak (4 to 9px)
        const len = isStorm ? (6 + (r % 5) * 0.9) : (4 + (r % 4) * 0.8);
        const dx = len * windAngle;
        const dy = len * 0.95;

        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - dx, ry + dy);
      }
      ctx.stroke();

      // --- C. Wind-Blown Rain Mist Sheets ---
      // Fine vapor drifting across the streets during rain
      ctx.fillStyle = isStorm ? 'rgba(224, 242, 254, 0.055)' : 'rgba(224, 242, 254, 0.03)';
      for (let m = 0; m < 3; m++) {
        const mistOffset = (timeSec * (isStorm ? 120 : 60) + m * 400) % (viewW + 600) - 300;
        const mistY = minY + ((m + 0.5) / 3) * viewH + Math.sin(timeSec * 0.8 + m) * 40;
        ctx.beginPath();
        safeEllipse(ctx, minX + mistOffset, mistY, viewW * 0.6, 60, windAngle * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // =========================================================================
    // 2. VOLUMETRIC LAYERED FOG (ORGANIC DRIFTING VAPOR CLOUDS & LIGHT HALOS)
    // =========================================================================
    if (isFog) {
      // Atmospheric cool-slate desaturating base
      ctx.fillStyle = 'rgba(203, 213, 225, 0.22)';
      ctx.fillRect(minX, minY, viewW, viewH);

      // Layer 1: Soft rolling ground mist banks
      const fogClusters = 8;
      for (let f = 0; f < fogClusters; f++) {
        const seedX = ((f * 37.19) % 1);
        const seedY = ((f * 73.82) % 1);
        const driftSpeed = 18 + (f % 3) * 8;
        
        const fcx = minX + ((seedX * viewW + timeSec * driftSpeed) % (viewW + 400)) - 200;
        const fcy = minY + ((seedY * viewH + Math.sin(timeSec * 0.4 + f) * 60) % viewH);
        const radius = 160 + (f % 4) * 40;

        const fogGrad = ctx.createRadialGradient(fcx, fcy, 0, fcx, fcy, radius);
        fogGrad.addColorStop(0, 'rgba(241, 245, 249, 0.20)');
        fogGrad.addColorStop(0.5, 'rgba(226, 232, 240, 0.10)');
        fogGrad.addColorStop(1, 'rgba(226, 232, 240, 0)');

        ctx.fillStyle = fogGrad;
        ctx.beginPath();
        ctx.arc(fcx, fcy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Layer 2: Fast swirling wisps
      for (let w = 0; w < 4; w++) {
        const wcx = minX + ((timeSec * 35 + w * 320) % (viewW + 300)) - 150;
        const wcy = minY + ((w + 0.5) / 4) * viewH + Math.cos(timeSec * 0.5 + w) * 35;
        const wRad = 90 + w * 20;

        const wispGrad = ctx.createRadialGradient(wcx, wcy, 0, wcx, wcy, wRad);
        wispGrad.addColorStop(0, 'rgba(248, 250, 252, 0.12)');
        wispGrad.addColorStop(1, 'rgba(248, 250, 252, 0)');
        ctx.fillStyle = wispGrad;
        ctx.beginPath();
        safeEllipse(ctx, wcx, wcy, wRad * 1.5, wRad * 0.7, 0.15, 0, Math.PI * 2);
        ctx.fill();
      }

      // Layer 3: Headlight volumetric halos through fog
      for (const veh of world.vehicles) {
        if (!veh.headlightsOn) continue;
        const vx = veh.x;
        const vy = veh.y;
        if (vx < minX - 100 || vx > maxX + 100 || vy < minY - 100 || vy > maxY + 100) continue;

        // Soft luminous diffusion halo in front of vehicle
        const forwardX = vx + Math.cos(veh.angle) * 35;
        const forwardY = vy + Math.sin(veh.angle) * 35;
        const haloGrad = ctx.createRadialGradient(forwardX, forwardY, 5, forwardX, forwardY, 65);
        haloGrad.addColorStop(0, 'rgba(254, 243, 199, 0.22)');
        haloGrad.addColorStop(0.6, 'rgba(253, 230, 138, 0.08)');
        haloGrad.addColorStop(1, 'rgba(253, 230, 138, 0)');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(forwardX, forwardY, 65, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // =========================================================================
    // 3. STORM LIGHTNING (PROCEDURAL BRANCHING BOLTS & REALISTIC STROBE FLASH)
    // =========================================================================
    if (hasLightning) {
      const strikeTimer = world.lightningFlashTimer ?? 0;
      const progress = Math.max(0, Math.min(1.0, 1.0 - (strikeTimer / 0.38)));

      // Realistic double-pulse strobe curve (pre-flash -> return stroke peak -> exponential afterglow)
      let flashAlpha = 0;
      if (progress < 0.12) {
        flashAlpha = progress / 0.12 * 0.85; // Initial spike
      } else if (progress < 0.24) {
        flashAlpha = 0.25; // Brief return stroke lull
      } else if (progress < 0.45) {
        flashAlpha = 0.95 - (progress - 0.24) * 1.2; // Main return stroke blast
      } else {
        flashAlpha = Math.max(0, 0.45 * (1.0 - (progress - 0.45) / 0.55)); // Decaying sky glow
      }

      // Sky illumination flash
      if (flashAlpha > 0.02) {
        ctx.fillStyle = `rgba(224, 242, 254, ${flashAlpha * 0.65})`;
        ctx.fillRect(minX, minY, viewW, viewH);
      }

      // Draw procedural branching lightning bolt if strike data exists
      if (world.lightningStrike && flashAlpha > 0.1) {
        this.renderLightningBolt(
          ctx,
          world.lightningStrike.startX,
          world.lightningStrike.startY,
          world.lightningStrike.endX,
          world.lightningStrike.endY,
          world.lightningStrike.seed,
          flashAlpha
        );
      }
    }

    ctx.restore();
  }

  // --- PROCEDURAL BRANCHING LIGHTNING BOLT ---
  private renderLightningBolt(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    seed: number,
    alpha: number
  ) {
    const safeAlpha = Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 0;
    const segments = 12;
    const points: { x: number; y: number }[] = [{ x: startX, y: startY }];

    let s = (seed * 1000 + 123) % 233280;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };

    const branches: { start: { x: number; y: number }; pts: { x: number; y: number }[] }[] = [];

    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const baseX = startX + (endX - startX) * t;
      const baseY = startY + (endY - startY) * t;
      const jitterAmount = (1 - Math.abs(t - 0.5) * 0.7) * 55;
      const jx = (rnd() - 0.5) * jitterAmount * 2;
      const jy = (rnd() - 0.5) * 20;
      const pt = { x: baseX + jx, y: baseY + jy };
      points.push(pt);

      // Branching fork chances
      if (i === 4 || i === 7) {
        const bPts: { x: number; y: number }[] = [pt];
        const bAngle = (rnd() - 0.5) * 1.3 + (endX > startX ? 0.35 : -0.35);
        let curBx = pt.x;
        let curBy = pt.y;
        for (let b = 0; b < 4; b++) {
          curBx += Math.sin(bAngle) * (26 + rnd() * 22) + (rnd() - 0.5) * 16;
          curBy += Math.cos(bAngle) * (22 + rnd() * 18);
          bPts.push({ x: curBx, y: curBy });
        }
        branches.push({ start: pt, pts: bPts });
      }
    }

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Broad outer electric cyan halo
    ctx.strokeStyle = `rgba(147, 197, 253, ${safeAlpha * 0.35})`;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();

    // 2. Mid ionized cyan glow
    ctx.strokeStyle = `rgba(186, 230, 253, ${safeAlpha * 0.75})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();

    // 3. Core hot white lightning arc
    ctx.strokeStyle = `rgba(255, 255, 255, ${safeAlpha * 0.98})`;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();

    // Render branch forks
    for (const br of branches) {
      ctx.strokeStyle = `rgba(186, 230, 253, ${safeAlpha * 0.5})`;
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(br.start.x, br.start.y);
      for (const p of br.pts) ctx.lineTo(p.x, p.y);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${safeAlpha * 0.85})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(br.start.x, br.start.y);
      for (const p of br.pts) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    // Ground strike impact flash
    const endPt = points[points.length - 1];
    const burstGrad = ctx.createRadialGradient(endPt.x, endPt.y, 2, endPt.x, endPt.y, 50);
    burstGrad.addColorStop(0, `rgba(255, 255, 255, ${safeAlpha * 0.95})`);
    burstGrad.addColorStop(0.3, `rgba(186, 230, 253, ${safeAlpha * 0.6})`);
    burstGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
    ctx.fillStyle = burstGrad;
    ctx.beginPath();
    ctx.arc(endPt.x, endPt.y, 50, 0, Math.PI * 2);
    ctx.fill();

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
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

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
        safeEllipse(ctx, shadow.x, shadow.y, shadow.size, shadow.size * 0.6, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
