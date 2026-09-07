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
  if (bld.interiors) {
    if (bld.interiors[floor]) return bld.interiors[floor];
    if (bld.interiors[String(floor)]) return bld.interiors[String(floor)];
  }
  return createDefaultBuildingLayout(bld, floor);
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

  // Base background floor of the building
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, bld.width, bld.height);

  // Render rooms with realistic floor textures
  for (const rm of layout.rooms) {
    ctx.fillStyle = rm.color;
    ctx.fillRect(rm.x, rm.y, rm.width, rm.height);

    ctx.save();
    ctx.beginPath();
    ctx.rect(rm.x, rm.y, rm.width, rm.height);
    ctx.clip();
    
    if (rm.floorStyle === 'tile' || rm.color === '#1e293b' || rm.color === '#042f2e' || rm.color === '#0f172a') {
      // Ceramic tile grid
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 0.6;
      for (let tx = rm.x; tx < rm.x + rm.width; tx += 8) {
        ctx.beginPath(); ctx.moveTo(tx, rm.y); ctx.lineTo(tx, rm.y + rm.height); ctx.stroke();
      }
      for (let ty = rm.y; ty < rm.y + rm.height; ty += 8) {
        ctx.beginPath(); ctx.moveTo(rm.x, ty); ctx.lineTo(rm.x + rm.width, ty); ctx.stroke();
      }
    } else if (rm.floorStyle === 'parquet' || rm.floorStyle === 'wood') {
      // Parquet wood planks
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 0.5;
      for (let ty = rm.y; ty < rm.y + rm.height; ty += 3.5) {
        ctx.beginPath(); ctx.moveTo(rm.x, ty); ctx.lineTo(rm.x + rm.width, ty); ctx.stroke();
      }
    } else if (rm.floorStyle === 'playmat') {
      // Kids playmat pattern
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 0.8;
      for (let tx = rm.x; tx < rm.x + rm.width; tx += 12) {
        ctx.beginPath(); ctx.moveTo(tx, rm.y); ctx.lineTo(tx, rm.y + rm.height); ctx.stroke();
      }
    }
    
    // Ambient Occlusion / subtle inner shadow for rooms
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = rm.color;
    ctx.lineWidth = 4;
    ctx.strokeRect(rm.x - 2, rm.y - 2, rm.width + 4, rm.height + 4);
    ctx.restore();

    // Cyrillic room label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.font = 'bold 5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rm.name, rm.x + rm.width / 2, rm.y + rm.height / 2);
  }

  // Draw all elevator zones (Лифты)
  for (const el of layout.elevators) {
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
  for (const st of layout.stairs) {
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
  for (const ex of layout.exits) {
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

  // Volumetric daylight beams from windows
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
        p2x = win.x; p2y = win.y + 5;
        p3x = x2; p3y = y2 + beamSpread;
        p4x = x2; p4y = y2 - beamSpread;
      } else if (win.side === 'right') {
        x2 = win.x - beamLength;
        y2 = win.y - 12;
        p1x = win.x; p1y = win.y - 5;
        p2x = win.x; p2y = win.y + 5;
        p3x = x2; p3y = y2 + beamSpread;
        p4x = x2; p4y = y2 - beamSpread;
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

  // Draw Furniture with high-fidelity vector textures
  // 1. Base floor textiles (carpets, rugs) drawn first
  for (const f of layout.furniture) {
    if (f.type === 'carpet') {
      ctx.save();
      ctx.translate(f.x + f.width / 2, f.y + f.height / 2);
      ctx.rotate(f.angle);
      renderInteriorFurniture(ctx, f, timeHour);
      ctx.restore();
    }
  }

  // 2. Physical furniture items with realistic depth & contact shadows
  for (const f of layout.furniture) {
    if (f.type !== 'carpet') {
      ctx.save();
      ctx.translate(f.x + f.width / 2, f.y + f.height / 2);
      ctx.rotate(f.angle);

      if (f.type !== 'blackboard' && f.type !== 'whiteboard') {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.38)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1.2;
        ctx.shadowOffsetY = 1.2;
      }

      renderInteriorFurniture(ctx, f, timeHour);
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

  // Electric Ceiling Lights at night
  if (electricIntensity > 0) {
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

    for (const el of layout.elevators) {
      lights.push({ x: el.x + el.width / 2, y: el.y + el.height / 2, radius: 22 });
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const lt of lights) {
      const grad = ctx.createRadialGradient(lt.x, lt.y, 1.5, lt.x, lt.y, lt.radius);
      grad.addColorStop(0, `rgba(253, 224, 71, ${0.44 * electricIntensity})`);
      grad.addColorStop(0.35, `rgba(253, 224, 71, ${0.16 * electricIntensity})`);
      grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lt.x, lt.y, lt.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    for (const lt of lights) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(lt.x, lt.y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
