import { Building, Player } from './types';
import { sound } from './audio';
import { renderInteriorFurniture } from './interiorFurnitureRenderer';

export interface InteriorWall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isJailBars?: boolean;
}

export interface InteriorFurniture {
  type: 
    | 'bed' 
    | 'sofa' 
    | 'tv_cabinet' 
    | 'tv' 
    | 'table' 
    | 'chair' 
    | 'counter' 
    | 'shelf' 
    | 'desk' 
    | 'computer' 
    | 'plant' 
    | 'carpet' 
    | 'cooler' 
    | 'toilet' 
    | 'bath' 
    | 'bed_hospital' 
    | 'desk_reception' 
    | 'sink' 
    | 'vending_machine'
    | 'fire_rack'
    | 'jail_cot'
    | 'kitchen_counter'
    | 'fridge'
    | 'wardrobe'
    | 'nightstand'
    | 'bookshelf'
    | 'blackboard'
    | 'whiteboard'
    | 'kids_table'
    | 'kids_bed'
    | 'toy_chest'
    | 'bench'
    | 'trash_can'
    | 'mailbox_bank'
    | 'radiator'
    | 'atm'
    | 'cash_register'
    | 'freezer_display'
    | 'pallet_stack'
    | 'file_cabinet'
    | 'server_rack'
    | 'exam_table'
    | 'car_podium'
    | 'lockers';
  x: number; // relative X
  y: number; // relative Y
  width: number;
  height: number;
  angle: number;
  color: string;
}

export interface InteriorZone {
  x: number;
  y: number;
  width: number;
  height: number;
  entranceIndex?: number;
  sectionIndex?: number;
}

export interface InteriorRoom {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  floorColor?: string;
  floorStyle?: 'parquet' | 'tile' | 'wood' | 'linoleum' | 'carpet' | 'playmat' | 'concrete';
}

export interface BuildingLayout {
  buildingId: string;
  floor: number;
  width: number;
  height: number;
  rooms: InteriorRoom[];
  walls: InteriorWall[];
  furniture: InteriorFurniture[];
  elevatorZone: InteriorZone;
  stairsZone: InteriorZone;
  exitZone: InteriorZone;
  elevators: InteriorZone[];
  stairs: InteriorZone[];
  exits: InteriorZone[];
}

export function getBuildingFloorsCount(bld: Building): number {
  if (typeof bld.floorsCount === 'number' && bld.floorsCount > 0) {
    return bld.floorsCount;
  }
  if (bld.interiors && Object.keys(bld.interiors).length > 0) {
    return Object.keys(bld.interiors).length;
  }
  switch (bld.type) {
    case 'business_center':
      return 16;
    case 'modern_residential':
      return 12;
    case 'panel_apartment':
      return 9;
    case 'office':
    case 'brick_residential':
      return 5;
    case 'hospital':
    case 'police_station':
      return 3;
    case 'shopping_mall':
    case 'commercial':
    case 'school_kindergarten':
    case 'suburban':
    case 'fire_station':
    case 'transit_hub':
    case 'cultural_center':
      return 2;
    case 'shop':
    case 'car_dealership':
    default:
      return 1;
  }
}

export function createDefaultBuildingLayout(bld: Building, floor: number): BuildingLayout {
  const W = bld.width;
  const H = bld.height;
  const exitZone: InteriorZone = { x: Math.max(0, W / 2 - 12), y: H - 16, width: 24, height: 16 };
  const stairsZone: InteriorZone = { x: 10, y: 10, width: 20, height: 20 };
  const elevatorZone: InteriorZone = { x: W - 30, y: 10, width: 20, height: 20 };

  return {
    buildingId: bld.id,
    floor,
    width: W,
    height: H,
    rooms: [
      {
        name: floor === 0 ? 'Основной Зал' : 'Этаж ' + (floor + 1),
        x: 6,
        y: 6,
        width: W - 12,
        height: H - 12,
        color: '#1e293b',
        floorStyle: bld.type.includes('residential') ? 'parquet' : 'tile'
      }
    ],
    walls: [
      { x1: 6, y1: 6, x2: W - 6, y2: 6 },
      { x1: W - 6, y1: 6, x2: W - 6, y2: H - 6 },
      { x1: W - 6, y1: H - 6, x2: 6, y2: H - 6 },
      { x1: 6, y1: H - 6, x2: 6, y2: 6 }
    ],
    furniture: [],
    exitZone,
    stairsZone,
    elevatorZone,
    exits: floor === 0 ? [exitZone] : [],
    stairs: [stairsZone],
    elevators: [elevatorZone]
  };
}

export function getBuildingLayout(bld: Building, floor: number): BuildingLayout {
  let raw: any = null;
  if (bld.interiors) {
    if (bld.interiors[floor]) raw = bld.interiors[floor];
    else if (bld.interiors[String(floor)]) raw = bld.interiors[String(floor)];
  }
  if (!raw) {
    return createDefaultBuildingLayout(bld, floor);
  }

  const rawExits = (Array.isArray(raw.exits) && raw.exits.length > 0)
    ? raw.exits
    : ((Array.isArray(raw.exitZones) && raw.exitZones.length > 0)
      ? raw.exitZones
      : (raw.exitZone ? [raw.exitZone] : []));

  const exits = rawExits.filter(Boolean);
  if (exits.length === 0) {
    exits.push({
      x: Math.max(6, Math.round(bld.width / 2 - 17)),
      y: Math.max(6, Math.round(bld.height - 14)),
      width: 34,
      height: 8
    });
  }
  const exitZone = raw.exitZone || exits[0];

  const rawElevators = Array.isArray(raw.elevators)
    ? raw.elevators
    : (raw.elevatorZone ? [raw.elevatorZone] : []);
  const elevators = rawElevators.filter(Boolean);
  const elevatorZone = raw.elevatorZone || elevators[0] || { x: 8, y: 8, width: 18, height: 18 };

  const rawStairs = Array.isArray(raw.stairs)
    ? raw.stairs
    : (raw.stairsZone ? [raw.stairsZone] : []);
  const stairs = rawStairs.filter(Boolean);
  const stairsZone = raw.stairsZone || stairs[0] || { x: 30, y: 8, width: 18, height: 18 };

  return {
    buildingId: raw.buildingId || bld.id,
    floor: raw.floor ?? floor,
    width: raw.width || bld.width,
    height: raw.height || bld.height,
    rooms: Array.isArray(raw.rooms)
      ? raw.rooms.filter(Boolean).map((rm: any) => ({
          ...rm,
          color: (typeof rm.color === 'string' && rm.color) ? rm.color : ((typeof rm.floorColor === 'string' && rm.floorColor) ? rm.floorColor : '#1e293b')
        }))
      : [],
    walls: Array.isArray(raw.walls) ? raw.walls.filter(Boolean) : [],
    furniture: Array.isArray(raw.furniture) ? raw.furniture.filter(Boolean) : [],
    elevatorZone,
    stairsZone,
    exitZone,
    elevators,
    stairs,
    exits
  };
}

// Backwards compatibility alias
export const generateBuildingLayout = getBuildingLayout;

export function constrainPlayerToInterior(
  player: Player,
  bld: Building,
  layout: BuildingLayout,
  dt: number
) {
  let px = player.x - bld.x;
  let py = player.y - bld.y;

  const radius = 6.5;

  // A. Constrain inside outer walls
  px = Math.max(radius + 7, Math.min(bld.width - radius - 7, px));
  py = Math.max(radius + 7, Math.min(bld.height - radius - 7, py));

  // B. Collide with internal walls (slide-collision physics)
  for (const wall of layout.walls) {
    const x1 = wall.x1;
    const y1 = wall.y1;
    const x2 = wall.x2;
    const y2 = wall.y2;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0) {
      t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    const distDx = px - closestX;
    const distDy = py - closestY;
    const distSq = distDx * distDx + distDy * distDy;
    const minDist = radius + 1.5;

    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq);
      const overlap = minDist - dist;
      if (dist > 0.001) {
        px += (distDx / dist) * overlap;
        py += (distDy / dist) * overlap;
      } else {
        px += minDist;
      }
    }
  }

  // C. Collide with blocking furniture items
  for (const furn of layout.furniture) {
    if (
      furn.type === 'carpet' || 
      furn.type === 'plant' || 
      furn.type === 'chair' || 
      furn.type === 'computer' || 
      furn.type === 'tv' ||
      furn.type === 'blackboard'
    ) continue;

    const fx1 = furn.x;
    const fy1 = furn.y;
    const fx2 = furn.x + furn.width;
    const fy2 = furn.y + furn.height;

    if (px + radius > fx1 && px - radius < fx2 && py + radius > fy1 && py - radius < fy2) {
      const overlapLeft = (px + radius) - fx1;
      const overlapRight = fx2 - (px - radius);
      const overlapTop = (py + radius) - fy1;
      const overlapBottom = fy2 - (py - radius);

      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
      if (minOverlap === overlapLeft) px -= overlapLeft;
      else if (minOverlap === overlapRight) px += overlapRight;
      else if (minOverlap === overlapTop) py -= overlapTop;
      else if (minOverlap === overlapBottom) py += overlapBottom;
    }
  }

  // Map back to absolute world coordinates
  player.x = bld.x + px;
  player.y = bld.y + py;
}

// --- OFFSCREEN CANVAS CACHE FOR INTERIOR FLOORS & FURNITURE ---
const interiorCanvasCache = new Map<string, HTMLCanvasElement>();

function renderStaticInteriorLayout(
  ctx: CanvasRenderingContext2D,
  bld: Building,
  layout: BuildingLayout,
  windows: { x: number; y: number; side: 'top' | 'bottom' | 'left' | 'right' }[],
  isHospital: boolean
) {
  // Base background floor of the building
  if (isHospital) {
    ctx.fillStyle = '#eef2f6';
    ctx.fillRect(0, 0, bld.width, bld.height);

    // Sterile institutional floor tiles (single batched stroke for high FPS)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let tx = 0; tx < bld.width; tx += 12) {
      ctx.moveTo(tx, 0); ctx.lineTo(tx, bld.height);
    }
    for (let ty = 0; ty < bld.height; ty += 12) {
      ctx.moveTo(0, ty); ctx.lineTo(bld.width, ty);
    }
    ctx.stroke();

    // Classic Hospital Floor Navigation Guide Lines
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.42)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(25, 116);
    ctx.lineTo(bld.width - 25, 116);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(2, 132, 199, 0.42)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(25, 124);
    ctx.lineTo(bld.width - 25, 124);
    ctx.stroke();

    // Red Cross emblem in main lobby floor
    const crossX = 221;
    const crossY = 172;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.fillRect(crossX - 9, crossY - 3, 18, 6);
    ctx.fillRect(crossX - 3, crossY - 9, 6, 18);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(crossX - 9, crossY - 3, 18, 6);
    ctx.strokeRect(crossX - 3, crossY - 9, 6, 18);
  } else {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, bld.width, bld.height);
  }

  // Render rooms with optimized floor textures
  for (const rm of (layout.rooms || [])) {
    if (!rm) continue;
    const roomColor = (typeof rm.color === 'string' && rm.color)
      ? rm.color
      : ((typeof (rm as any).floorColor === 'string' && (rm as any).floorColor) ? (rm as any).floorColor : '#1e293b');

    ctx.fillStyle = roomColor;
    ctx.fillRect(rm.x, rm.y, rm.width, rm.height);

    ctx.save();
    ctx.beginPath();
    ctx.rect(rm.x, rm.y, rm.width, rm.height);
    ctx.clip();
    
    if (rm.floorStyle === 'tile' || roomColor === '#1e293b' || roomColor === '#042f2e' || roomColor === '#0f172a' || isHospital) {
      // Ceramic tile grid (single batched stroke)
      ctx.strokeStyle = isHospital || roomColor.startsWith('#f') || roomColor.startsWith('#e') || roomColor.startsWith('#d') 
        ? 'rgba(100, 116, 139, 0.18)' 
        : 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (let tx = rm.x; tx < rm.x + rm.width; tx += 10) {
        ctx.moveTo(tx, rm.y); ctx.lineTo(tx, rm.y + rm.height);
      }
      for (let ty = rm.y; ty < rm.y + rm.height; ty += 10) {
        ctx.moveTo(rm.x, ty); ctx.lineTo(rm.x + rm.width, ty);
      }
      ctx.stroke();
    } else if (rm.floorStyle === 'parquet' || rm.floorStyle === 'wood') {
      // Parquet wood planks (batched stroke)
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let ty = rm.y; ty < rm.y + rm.height; ty += 4) {
        ctx.moveTo(rm.x, ty); ctx.lineTo(rm.x + rm.width, ty);
      }
      ctx.stroke();
    } else if (rm.floorStyle === 'playmat') {
      // Kids playmat pattern (batched stroke)
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let tx = rm.x; tx < rm.x + rm.width; tx += 14) {
        ctx.moveTo(tx, rm.y); ctx.lineTo(tx, rm.y + rm.height);
      }
      ctx.stroke();
    }
    
    // Crisp room boundary (zero shadowBlur for high performance)
    ctx.strokeStyle = isHospital ? 'rgba(148, 163, 184, 0.3)' : 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rm.x + 0.5, rm.y + 0.5, rm.width - 1, rm.height - 1);
    ctx.restore();

    // Cyrillic room label
    const isLightFloor = isHospital || roomColor.startsWith('#f') || roomColor.startsWith('#e') || roomColor.startsWith('#d') || roomColor.startsWith('#c');
    ctx.fillStyle = isLightFloor ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.28)';
    ctx.font = 'bold 5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rm.name, rm.x + rm.width / 2, rm.y + rm.height / 2);
  }

  // Draw all elevator zones (Лифты)
  for (const el of (layout.elevators || [])) {
    if (!el) continue;
    ctx.fillStyle = '#334155';
    ctx.fillRect(el.x, el.y, el.width, el.height);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(el.x, el.y, el.width, el.height);
    
    // Elevator door center split
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(el.x + el.width / 2, el.y);
    ctx.lineTo(el.x + el.width / 2, el.y + el.height);
    ctx.stroke();

    // Elevator LED floor indicator light
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(el.x + 3, el.y + el.height / 2, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ЛИФТ', el.x + el.width / 2, el.y + el.height / 2);
  }

  // Draw all stairs zones (Лестницы)
  for (const st of (layout.stairs || [])) {
    if (!st) continue;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(st.x, st.y, st.width, st.height);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(st.x, st.y, st.width, st.height);

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const stepCount = 4;
    for (let s = 1; s <= stepCount; s++) {
      const sy = st.y + (st.height / (stepCount + 1)) * s;
      ctx.moveTo(st.x + 1, sy);
      ctx.lineTo(st.x + st.width - 1, sy);
    }
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 4px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ЛЕСТН.', st.x + st.width / 2, st.y + st.height / 2);
  }

  // Draw all exit zones (Выходы на улицу)
  const exitsList = (layout.exits && layout.exits.length > 0) ? layout.exits : (layout.exitZone ? [layout.exitZone] : []);
  for (const ex of exitsList) {
    if (!ex) continue;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.22)';
    ctx.fillRect(ex.x, ex.y, ex.width, ex.height);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1;
    ctx.strokeRect(ex.x, ex.y, ex.width, ex.height);

    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 4.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ВЫХОД', ex.x + ex.width / 2, ex.y + ex.height / 2);
  }

  // Draw Furniture with high-fidelity vector textures
  // 1. Base floor textiles (carpets, rugs) drawn first
  for (const f of layout.furniture) {
    if (f.type === 'carpet') {
      ctx.save();
      ctx.translate(f.x + f.width / 2, f.y + f.height / 2);
      ctx.rotate(f.angle);
      renderInteriorFurniture(ctx, f, 12);
      ctx.restore();
    }
  }

  // 2. Physical furniture items with realistic depth & lightweight contact shadows
  for (const f of layout.furniture) {
    if (f.type !== 'carpet') {
      ctx.save();
      ctx.translate(f.x + f.width / 2, f.y + f.height / 2);
      ctx.rotate(f.angle);

      // Lightweight crisp ambient contact shadow (Zero GPU Gaussian blur overhead)
      if (f.type !== 'blackboard' && f.type !== 'whiteboard') {
        const halfW = f.width / 2;
        const halfH = f.height / 2;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
        ctx.fillRect(-halfW + 0.8, -halfH + 0.8, f.width, f.height);
      }

      renderInteriorFurniture(ctx, f, 12);
      ctx.restore();
    }
  }

  // Draw interior walls
  // Wall shadow
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const wall of layout.walls) {
    if (!wall.isJailBars) {
      ctx.moveTo(wall.x1 + 0.8, wall.y1 + 0.8);
      ctx.lineTo(wall.x2 + 0.8, wall.y2 + 0.8);
    }
  }
  ctx.stroke();

  // Wall base
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (const wall of layout.walls) {
    if (!wall.isJailBars) {
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
    }
  }
  ctx.stroke();

  // Wall top highlight
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  for (const wall of layout.walls) {
    if (wall.isJailBars) {
      ctx.save();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
    }
  }
  ctx.stroke();

  // Outer Building Walls & Windows
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 5;
  ctx.strokeRect(1, 1, bld.width, bld.height);

  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, bld.width, bld.height);

  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, bld.width, bld.height);

  // Window cyan glass sills
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.2;
  for (const win of windows) {
    ctx.beginPath();
    if (win.side === 'top' || win.side === 'bottom') {
      ctx.moveTo(win.x - 6, win.y);
      ctx.lineTo(win.x + 6, win.y);
    } else {
      ctx.moveTo(win.x, win.y - 6);
      ctx.lineTo(win.x, win.y + 6);
    }
    ctx.stroke();
  }
}

export function renderBuildingInterior(
  ctx: CanvasRenderingContext2D,
  bld: Building,
  layout: BuildingLayout,
  player: Player,
  timeHour: number
) {
  ctx.save();
  ctx.translate(bld.x, bld.y);

  // Generate windows along outer walls
  const windows: { x: number; y: number; side: 'top' | 'bottom' | 'left' | 'right' }[] = [];
  for (let x = 30; x < bld.width - 30; x += 40) {
    windows.push({ x, y: 0, side: 'top' });
    windows.push({ x, y: bld.height, side: 'bottom' });
  }
  for (let y = 30; y < bld.height - 30; y += 40) {
    windows.push({ x: 0, y, side: 'left' });
    windows.push({ x: bld.width, y, side: 'right' });
  }

  // Calculate daylight & electric lighting intensity
  let dayIntensity = 0;
  if (timeHour >= 5 && timeHour < 19) {
    if (timeHour < 12) {
      dayIntensity = (timeHour - 5) / 7;
    } else {
      dayIntensity = (19 - timeHour) / 7;
    }
  }

  let electricIntensity = 0;
  if (timeHour >= 17 || timeHour < 7) {
    if (timeHour >= 17 && timeHour < 20) {
      electricIntensity = (timeHour - 17) / 3;
    } else if (timeHour >= 4 && timeHour < 7) {
      electricIntensity = (7 - timeHour) / 3;
    } else {
      electricIntensity = 1;
    }
  }

  const isHospital = bld.type === 'hospital';

  // Render static floor & furniture from cached bitmap
  const cacheKey = `${bld.id}_${(bld as any).currentFloor ?? 0}_${bld.width}_${bld.height}_${layout.rooms?.length || 0}_${layout.furniture?.length || 0}`;
  let cachedCanvas = interiorCanvasCache.get(cacheKey);
  if (!cachedCanvas && typeof document !== 'undefined') {
    cachedCanvas = document.createElement('canvas');
    cachedCanvas.width = bld.width;
    cachedCanvas.height = bld.height;
    const cCtx = cachedCanvas.getContext('2d');
    if (cCtx) {
      renderStaticInteriorLayout(cCtx, bld, layout, windows, isHospital);
      interiorCanvasCache.set(cacheKey, cachedCanvas);
    }
  }

  if (cachedCanvas) {
    ctx.drawImage(cachedCanvas, 0, 0);
  } else {
    renderStaticInteriorLayout(ctx, bld, layout, windows, isHospital);
  }

  // Dynamic Layer 1: Volumetric daylight beams from windows
  if (dayIntensity > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    for (const win of windows) {
      let x1 = win.x;
      let y1 = win.y;
      let x2 = win.x;
      let y2 = win.y;
      
      const beamLength = 48;
      const beamSpread = 14;
      
      let p1x = 0, p1y = 0, p2x = 0, p2y = 0, p3x = 0, p3y = 0, p4x = 0, p4y = 0;
      
      if (win.side === 'top') {
        y2 = win.y + beamLength;
        x2 = win.x + 12;
        p1x = win.x - 5; p1y = win.y;
        p2x = win.x + 5; p2y = win.y;
        p3x = x2 + beamSpread; p3y = y2;
        p4x = x2 - beamSpread; p4y = y2;
      } else if (win.side === 'bottom') {
        y2 = win.y - beamLength;
        x2 = win.x - 12;
        p1x = win.x - 5; p1y = win.y;
        p2x = win.x + 5; p2y = win.y;
        p3x = x2 + beamSpread; p3y = y2;
        p4x = x2 - beamSpread; p4y = y2;
      } else if (win.side === 'left') {
        x2 = win.x + beamLength;
        y2 = win.y + 12;
        p1x = win.x; p1y = win.y - 5;
        p2x = win.x + 5; p2y = win.y;
        p3x = x2 + beamSpread; p3y = y2;
        p4x = x2 - beamSpread; p4y = y2;
      } else if (win.side === 'right') {
        x2 = win.x - beamLength;
        y2 = win.y - 12;
        p1x = win.x - 5; p1y = win.y;
        p2x = win.x + 5; p2y = win.y;
        p3x = x2 + beamSpread; p3y = y2;
        p4x = x2 - beamSpread; p4y = y2;
      }
      
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, `rgba(254, 240, 138, ${0.32 * dayIntensity})`);
      grad.addColorStop(0.3, `rgba(254, 240, 138, ${0.14 * dayIntensity})`);
      grad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.lineTo(p3x, p3y);
      ctx.lineTo(p4x, p4y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Dynamic Layer 2: Electric Ceiling Lights (Fluorescent in hospital, warm incandescent in residential)
  const isNight = electricIntensity > 0;
  if (isNight || isHospital) {
    const intensity = isHospital ? Math.max(0.7, electricIntensity) : electricIntensity;
    const lights: { x: number; y: number; radius: number }[] = [];
    
    for (const rm of layout.rooms) {
      const rx = rm.x;
      const ry = rm.y;
      const rw = rm.width;
      const rh = rm.height;
      
      if (rw > 60) {
        lights.push({ x: rx + rw * 0.3, y: ry + rh / 2, radius: Math.min(rw * 0.45, 40) });
        lights.push({ x: rx + rw * 0.7, y: ry + rh / 2, radius: Math.min(rw * 0.45, 40) });
      } else {
        lights.push({ x: rx + rw / 2, y: ry + rh / 2, radius: Math.min(rw * 0.75, 35) });
      }
    }

    for (const el of (layout.elevators || [])) {
      if (!el) continue;
      lights.push({ x: el.x + el.width / 2, y: el.y + el.height / 2, radius: 22 });
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const lt of lights) {
      const grad = ctx.createRadialGradient(lt.x, lt.y, 1.5, lt.x, lt.y, lt.radius);
      if (isHospital) {
        // Cold white-cyan 5500K clinical fluorescent light
        grad.addColorStop(0, `rgba(224, 242, 254, ${0.48 * intensity})`);
        grad.addColorStop(0.35, `rgba(186, 230, 253, ${0.18 * intensity})`);
        grad.addColorStop(1, 'rgba(186, 230, 253, 0)');
      } else {
        // Warm home incandescent light
        grad.addColorStop(0, `rgba(253, 224, 71, ${0.44 * intensity})`);
        grad.addColorStop(0.35, `rgba(253, 224, 71, ${0.16 * intensity})`);
        grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
      }
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lt.x, lt.y, lt.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    for (const lt of lights) {
      if (isHospital) {
        // Fluorescent rectangular ceiling diffuser troffer (ЛВО 600x600)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(lt.x - 3, lt.y - 1.5, 6, 3);
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(lt.x - 3, lt.y - 1.5, 6, 3);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(lt.x, lt.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}
