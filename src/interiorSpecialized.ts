import { Building } from './types';
import { InteriorFurniture, InteriorRoom, InteriorWall, InteriorZone } from './buildingInteriors';

export interface SpecializedContext {
  bld: Building;
  floor: number;
  W: number;
  H: number;
  rooms: InteriorRoom[];
  walls: InteriorWall[];
  furniture: InteriorFurniture[];
  elevators: InteriorZone[];
  stairs: InteriorZone[];
  exits: InteriorZone[];
  elevatorZone: InteriorZone;
  stairsZone: InteriorZone;
  exitZone: InteriorZone;
}

// -------------------------------------------------------------
// OFFICE & BUSINESS CENTER VARIETY (4 FLOORS OF REALISTIC SPACES)
// -------------------------------------------------------------
export function buildOfficeInterior(ctx: SpecializedContext) {
  const { W, H, floor, rooms, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone } = ctx;
  elevators.push(elevatorZone);
  stairs.push(stairsZone);
  exits.push(exitZone);

  if (floor === 0) {
    // Ground Floor: Corporate Reception Lobby & Waiting Lounge
    rooms.push({ name: 'Главный Вестибюль & Ресепшн', x: 6, y: 6, width: W - 12, height: H - 12, color: '#1e293b', floorStyle: 'tile' });
    
    // Front Reception Desk with dual computers & logo wall
    furniture.push({ type: 'desk_reception', x: W / 2 - 24, y: H / 2 - 6, width: 48, height: 12, angle: 0, color: '#d97706' });
    furniture.push({ type: 'computer', x: W / 2 - 12, y: H / 2 - 3, width: 6, height: 4, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'computer', x: W / 2 + 6, y: H / 2 - 3, width: 6, height: 4, angle: 0, color: '#0f172a' });
    
    // Security & Services
    furniture.push({ type: 'atm', x: 12, y: 12, width: 8, height: 8, angle: 0, color: '#0284c7' });
    furniture.push({ type: 'vending_machine', x: 22, y: 12, width: 10, height: 8, angle: 0, color: '#475569' });
    furniture.push({ type: 'cooler', x: 34, y: 12, width: 8, height: 8, angle: 0, color: '#38bdf8' });

    // Waiting Sofas & Greenery
    furniture.push({ type: 'sofa', x: 12, y: H - 24, width: 32, height: 10, angle: 0, color: '#475569' });
    furniture.push({ type: 'sofa', x: W - 44, y: H - 24, width: 32, height: 10, angle: 0, color: '#475569' });
    furniture.push({ type: 'plant', x: 10, y: H - 36, width: 10, height: 10, angle: 0, color: '#16a34a' });
    furniture.push({ type: 'plant', x: W - 20, y: H - 36, width: 10, height: 10, angle: 0, color: '#16a34a' });
  } else if (floor === 1) {
    // Floor 1: IT Open Space & Server Room
    const hallwayY = H / 2 - 10;
    rooms.push({ name: 'Коридор Офиса', x: 6, y: hallwayY, width: W - 12, height: 20, color: '#334155', floorStyle: 'carpet' });
    
    // Left Open-Space Workspace
    rooms.push({ name: 'IT Open-Space', x: 6, y: 6, width: W / 2 - 32, height: hallwayY - 6, color: '#0f172a', floorStyle: 'carpet' });
    furniture.push({ type: 'desk', x: 12, y: 12, width: 16, height: 10, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'computer', x: 17, y: 13, width: 6, height: 4, angle: 0, color: '#38bdf8' });
    furniture.push({ type: 'chair', x: 18, y: 8, width: 4, height: 4, angle: 0, color: '#64748b' });

    furniture.push({ type: 'desk', x: 32, y: 12, width: 16, height: 10, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'computer', x: 37, y: 13, width: 6, height: 4, angle: 0, color: '#38bdf8' });
    furniture.push({ type: 'whiteboard', x: 12, y: hallwayY - 9, width: 16, height: 3, angle: 0, color: '#f8fafc' });

    // Right Server Room & Data Center
    rooms.push({ name: 'Серверная комната', x: W / 2 + 26, y: 6, width: W / 2 - 32, height: hallwayY - 6, color: '#020617', floorStyle: 'tile' });
    furniture.push({ type: 'server_rack', x: W - 28, y: 12, width: 12, height: 14, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'server_rack', x: W - 44, y: 12, width: 12, height: 14, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'file_cabinet', x: W / 2 + 30, y: 12, width: 10, height: 8, angle: 0, color: '#475569' });

    // Bottom Breakroom & Coffee Point
    rooms.push({ name: 'Зона отдыха & Кофе-поинт', x: 6, y: hallwayY + 20, width: W / 2 - 21, height: H - hallwayY - 26, color: '#1e293b', floorStyle: 'wood' });
    furniture.push({ type: 'kitchen_counter', x: 12, y: H - 18, width: 18, height: 8, angle: 0, color: '#475569' });
    furniture.push({ type: 'fridge', x: 32, y: H - 18, width: 8, height: 8, angle: 0, color: '#cbd5e1' });
    furniture.push({ type: 'cooler', x: 12, y: hallwayY + 24, width: 8, height: 8, angle: 0, color: '#38bdf8' });
    furniture.push({ type: 'sofa', x: 26, y: hallwayY + 24, width: 22, height: 10, angle: 0, color: '#6366f1' });

    // Bottom Conference Room
    rooms.push({ name: 'Переговорная "Альфа"', x: W / 2 + 15, y: hallwayY + 20, width: W / 2 - 21, height: H - hallwayY - 26, color: '#0f172a', floorStyle: 'carpet' });
    furniture.push({ type: 'table', x: W / 2 + 25, y: H - 24, width: 24, height: 12, angle: 0, color: '#78350f' });
    furniture.push({ type: 'whiteboard', x: W - 28, y: hallwayY + 24, width: 18, height: 3, angle: 0, color: '#f8fafc' });
  } else {
    // Floor 2+: Executive Director Suite & Legal Department
    const hallwayY = H / 2 - 10;
    rooms.push({ name: 'Коридор Руководства', x: 6, y: hallwayY, width: W - 12, height: 20, color: '#334155', floorStyle: 'parquet' });

    rooms.push({ name: 'Кабинет Директора', x: 6, y: 6, width: W / 2 - 32, height: hallwayY - 6, color: '#1c1917', floorStyle: 'parquet' });
    furniture.push({ type: 'desk', x: 14, y: 12, width: 22, height: 12, angle: 0, color: '#451a03' });
    furniture.push({ type: 'computer', x: 22, y: 14, width: 6, height: 4, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'chair', x: 23, y: 8, width: 5, height: 5, angle: 0, color: '#78350f' });
    furniture.push({ type: 'bookshelf', x: 12, y: hallwayY - 12, width: 18, height: 6, angle: 0, color: '#78350f' });
    furniture.push({ type: 'plant', x: W / 2 - 42, y: 12, width: 8, height: 8, angle: 0, color: '#15803d' });

    rooms.push({ name: 'Юридический Департамент', x: W / 2 + 26, y: 6, width: W / 2 - 32, height: hallwayY - 6, color: '#0f172a', floorStyle: 'wood' });
    furniture.push({ type: 'desk', x: W - 32, y: 12, width: 18, height: 10, angle: 0, color: '#78350f' });
    furniture.push({ type: 'computer', x: W - 26, y: 13, width: 6, height: 4, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'file_cabinet', x: W / 2 + 30, y: 12, width: 12, height: 8, angle: 0, color: '#475569' });
    furniture.push({ type: 'bookshelf', x: W - 22, y: hallwayY - 12, width: 14, height: 6, angle: 0, color: '#78350f' });

    rooms.push({ name: 'Бухгалтерия & Финансы', x: 6, y: hallwayY + 20, width: W / 2 - 21, height: H - hallwayY - 26, color: '#0f172a', floorStyle: 'carpet' });
    furniture.push({ type: 'desk', x: 12, y: H - 22, width: 16, height: 10, angle: 0, color: '#78350f' });
    furniture.push({ type: 'file_cabinet', x: 32, y: H - 22, width: 10, height: 8, angle: 0, color: '#475569' });

    rooms.push({ name: 'Большой Конференц-Зал', x: W / 2 + 15, y: hallwayY + 20, width: W / 2 - 21, height: H - hallwayY - 26, color: '#1e293b', floorStyle: 'carpet' });
    furniture.push({ type: 'table', x: W / 2 + 25, y: H - 26, width: 28, height: 14, angle: 0, color: '#451a03' });
    furniture.push({ type: 'whiteboard', x: W - 30, y: hallwayY + 24, width: 20, height: 3, angle: 0, color: '#f8fafc' });
  }
}

// -------------------------------------------------------------
// SUPERMARKET & RETAIL STORES
// -------------------------------------------------------------
export function buildSupermarketInterior(ctx: SpecializedContext) {
  const { W, H, rooms, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone } = ctx;
  elevators.push(elevatorZone);
  stairs.push(stairsZone);
  exits.push(exitZone);

  rooms.push({ name: 'Супермаркет "Пятёрочка 24/7"', x: 6, y: 6, width: W - 12, height: H - 12, color: '#1e293b', floorStyle: 'tile' });

  // Multiple Checkout Lanes with Cash Registers
  furniture.push({ type: 'counter', x: 12, y: H - 22, width: 20, height: 8, angle: 0, color: '#16a34a' });
  furniture.push({ type: 'cash_register', x: 16, y: H - 20, width: 6, height: 4, angle: 0, color: '#0f172a' });

  if (W > 120) {
    furniture.push({ type: 'counter', x: 36, y: H - 22, width: 20, height: 8, angle: 0, color: '#16a34a' });
    furniture.push({ type: 'cash_register', x: 40, y: H - 20, width: 6, height: 4, angle: 0, color: '#0f172a' });
  }

  // Entrance Services: ATM & Drink Vending
  furniture.push({ type: 'atm', x: W - 18, y: H - 20, width: 8, height: 8, angle: 0, color: '#0284c7' });
  furniture.push({ type: 'cooler', x: W - 30, y: H - 20, width: 8, height: 8, angle: 0, color: '#38bdf8' });

  // Shelving Rows (Product Aisles)
  const shelfRows = W > 120 ? 3 : 2;
  const shelfSpacing = (W - 40) / (shelfRows + 1);
  for (let r = 1; r <= shelfRows; r++) {
    const sx = 14 + r * shelfSpacing;
    furniture.push({ type: 'shelf', x: sx, y: 22, width: 10, height: H - 52, angle: 0, color: '#059669' });
  }

  // Refrigerated Displays & Freezers against top/side walls
  furniture.push({ type: 'freezer_display', x: 14, y: 10, width: 24, height: 8, angle: 0, color: '#38bdf8' });
  if (W > 100) {
    furniture.push({ type: 'freezer_display', x: 44, y: 10, width: 24, height: 8, angle: 0, color: '#38bdf8' });
  }
}

// -------------------------------------------------------------
// HOSPITAL & MEDICAL CLINIC
// -------------------------------------------------------------
export function buildHospitalInterior(ctx: SpecializedContext) {
  const { W, H, floor, rooms, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone } = ctx;
  elevators.push(elevatorZone);
  stairs.push(stairsZone);
  exits.push(exitZone);

  if (floor === 0) {
    // Ground Floor: Emergency Triage, Reception & Waiting Area
    rooms.push({ name: 'Приемное отделение & Регистратура', x: 6, y: 6, width: W - 12, height: H - 12, color: '#0f172a', floorStyle: 'tile' });
    furniture.push({ type: 'desk_reception', x: W / 2 - 20, y: H / 2 - 6, width: 40, height: 12, angle: 0, color: '#10b981' });
    furniture.push({ type: 'computer', x: W / 2 - 8, y: H / 2 - 3, width: 6, height: 4, angle: 0, color: '#0f172a' });

    // Waiting Chairs Rows
    for (let i = 0; i < 4; i++) {
      furniture.push({ type: 'chair', x: 14 + i * 8, y: H - 20, width: 6, height: 6, angle: 0, color: '#3b82f6' });
      furniture.push({ type: 'chair', x: W - 44 + i * 8, y: H - 20, width: 6, height: 6, angle: 0, color: '#3b82f6' });
    }

    furniture.push({ type: 'cooler', x: 14, y: 12, width: 8, height: 8, angle: 0, color: '#38bdf8' });
    furniture.push({ type: 'atm', x: 26, y: 12, width: 8, height: 8, angle: 0, color: '#0284c7' });
    furniture.push({ type: 'sink', x: W - 18, y: 12, width: 8, height: 6, angle: 0, color: '#cbd5e1' });
  } else if (floor === 1) {
    // Floor 1: Patient Hospital Wards
    const hallwayY = H / 2 - 8;
    rooms.push({ name: 'Больничный коридор', x: 6, y: hallwayY, width: W - 12, height: 16, color: '#1e293b', floorStyle: 'tile' });
    const wWidth = W / 2 - 32;
    const wHeight = H / 2 - 14;

    rooms.push({ name: `Палата ${floor * 100 + 1}`, x: 6, y: 6, width: wWidth, height: wHeight, color: '#042f2e', floorStyle: 'tile' });
    furniture.push({ type: 'bed_hospital', x: 12, y: 12, width: 14, height: 22, angle: 0, color: '#f8fafc' });
    furniture.push({ type: 'nightstand', x: 28, y: 12, width: 6, height: 6, angle: 0, color: '#64748b' });

    rooms.push({ name: `Палата ${floor * 100 + 2}`, x: W / 2 + 26, y: 6, width: wWidth, height: wHeight, color: '#042f2e', floorStyle: 'tile' });
    furniture.push({ type: 'bed_hospital', x: W - 26, y: 12, width: 14, height: 22, angle: 0, color: '#f8fafc' });
    furniture.push({ type: 'nightstand', x: W - 34, y: 12, width: 6, height: 6, angle: 0, color: '#64748b' });

    rooms.push({ name: `Палата ${floor * 100 + 3}`, x: 6, y: H / 2 + 8, width: wWidth, height: wHeight, color: '#042f2e', floorStyle: 'tile' });
    furniture.push({ type: 'bed_hospital', x: 12, y: H / 2 + 12, width: 14, height: 22, angle: 0, color: '#f8fafc' });
    furniture.push({ type: 'nightstand', x: 28, y: H / 2 + 12, width: 6, height: 6, angle: 0, color: '#64748b' });

    rooms.push({ name: `Кабинет Дежурного Врача`, x: W / 2 + 26, y: H / 2 + 8, width: wWidth, height: wHeight, color: '#064e3b', floorStyle: 'tile' });
    furniture.push({ type: 'desk', x: W - 30, y: H / 2 + 14, width: 16, height: 10, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'computer', x: W - 25, y: H / 2 + 15, width: 6, height: 4, angle: 0, color: '#38bdf8' });
    furniture.push({ type: 'file_cabinet', x: W / 2 + 30, y: H / 2 + 14, width: 10, height: 8, angle: 0, color: '#64748b' });
  } else {
    // Floor 2+: Surgery & Intensive Care Unit / Diagnostic Lab
    const hallwayY = H / 2 - 8;
    rooms.push({ name: 'Стерильный блок', x: 6, y: hallwayY, width: W - 12, height: 16, color: '#0f172a', floorStyle: 'tile' });

    rooms.push({ name: 'Операционная №1', x: 6, y: 6, width: W / 2 - 32, height: hallwayY - 6, color: '#022c22', floorStyle: 'tile' });
    furniture.push({ type: 'exam_table', x: 16, y: 14, width: 22, height: 12, angle: 0, color: '#f8fafc' });
    furniture.push({ type: 'sink', x: 12, y: hallwayY - 12, width: 8, height: 6, angle: 0, color: '#cbd5e1' });

    rooms.push({ name: 'Диагностическая Лаборатория', x: W / 2 + 26, y: 6, width: W / 2 - 32, height: hallwayY - 6, color: '#042f2e', floorStyle: 'tile' });
    furniture.push({ type: 'desk', x: W - 28, y: 12, width: 16, height: 10, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'computer', x: W - 23, y: 13, width: 6, height: 4, angle: 0, color: '#38bdf8' });
    furniture.push({ type: 'file_cabinet', x: W / 2 + 30, y: 12, width: 10, height: 8, angle: 0, color: '#64748b' });

    rooms.push({ name: 'Палата Интенсивной Терапии (ОРИТ)', x: 6, y: hallwayY + 8, width: W - 12, height: H - hallwayY - 14, color: '#064e3b', floorStyle: 'tile' });
    furniture.push({ type: 'bed_hospital', x: 16, y: H - 28, width: 14, height: 22, angle: 0, color: '#f8fafc' });
    furniture.push({ type: 'bed_hospital', x: 38, y: H - 28, width: 14, height: 22, angle: 0, color: '#f8fafc' });
    if (W > 120) {
      furniture.push({ type: 'bed_hospital', x: 60, y: H - 28, width: 14, height: 22, angle: 0, color: '#f8fafc' });
    }
  }
}

// -------------------------------------------------------------
// POLICE STATION & CELLS
// -------------------------------------------------------------
export function buildPoliceStationInterior(ctx: SpecializedContext) {
  const { W, H, floor, rooms, walls, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone } = ctx;
  elevators.push(elevatorZone);
  stairs.push(stairsZone);
  exits.push(exitZone);

  if (floor === 0) {
    rooms.push({ name: 'Дежурная часть МВД & Холл', x: 6, y: 6, width: W - 12, height: H - 12, color: '#1e293b', floorStyle: 'tile' });
    
    // Holding Cell (КПЗ) with Jail Bars
    const cellW = 35;
    const cellH = H - 40;
    rooms.push({ name: 'Камера Временного Содержания (КПЗ)', x: W - cellW - 6, y: 6, width: cellW, height: cellH, color: '#0f172a', floorStyle: 'concrete' });
    walls.push({ x1: W - cellW - 6, y1: 18, x2: W - 6, y2: 18, isJailBars: true });
    walls.push({ x1: W - cellW - 6, y1: 6, x2: W - cellW - 6, y2: cellH + 6 });
    furniture.push({ type: 'jail_cot', x: W - cellW + 2, y: 8, width: 10, height: 20, angle: 0, color: '#78350f' });
    furniture.push({ type: 'toilet', x: W - 14, y: cellH - 4, width: 6, height: 6, angle: 0, color: '#ffffff' });

    // Duty officer desk & holding bench
    furniture.push({ type: 'desk_reception', x: 14, y: H / 2 - 5, width: 32, height: 10, angle: 0, color: '#1d4ed8' });
    furniture.push({ type: 'computer', x: 22, y: H / 2 - 3, width: 6, height: 4, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'bench', x: 14, y: H - 20, width: 22, height: 6, angle: 0, color: '#475569' });
  } else {
    // Floor 1: Detective Bullpen & Interrogation Room
    const hallwayY = H / 2 - 10;
    rooms.push({ name: 'Коридор ОУР', x: 6, y: hallwayY, width: W - 12, height: 20, color: '#334155', floorStyle: 'wood' });

    rooms.push({ name: 'Кабинет Следователей / ОУР', x: 6, y: 6, width: W / 2 - 32, height: hallwayY - 6, color: '#1e293b', floorStyle: 'wood' });
    furniture.push({ type: 'desk', x: 12, y: 12, width: 16, height: 10, angle: 0, color: '#78350f' });
    furniture.push({ type: 'computer', x: 17, y: 13, width: 6, height: 4, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'file_cabinet', x: 32, y: 12, width: 10, height: 8, angle: 0, color: '#475569' });
    furniture.push({ type: 'whiteboard', x: 12, y: hallwayY - 9, width: 16, height: 3, angle: 0, color: '#b91c1c' }); // Investigation corkboard

    rooms.push({ name: 'Комната Допроса', x: W / 2 + 26, y: 6, width: W / 2 - 32, height: hallwayY - 6, color: '#0f172a', floorStyle: 'concrete' });
    furniture.push({ type: 'table', x: W - 32, y: 14, width: 14, height: 10, angle: 0, color: '#475569' });
    furniture.push({ type: 'chair', x: W - 28, y: 8, width: 5, height: 5, angle: 0, color: '#1e293b' });
    furniture.push({ type: 'chair', x: W - 28, y: 26, width: 5, height: 5, angle: 0, color: '#1e293b' });
  }
}

// -------------------------------------------------------------
// SCHOOL & KINDERGARTEN
// -------------------------------------------------------------
export function buildSchoolInterior(ctx: SpecializedContext) {
  const { W, H, floor, rooms, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone } = ctx;
  elevators.push(elevatorZone);
  stairs.push(stairsZone);
  exits.push(exitZone);

  if (floor === 0) {
    // Floor 0: Cloakroom / Lockers & Cafeteria Dining Hall
    rooms.push({ name: 'Школьный вестибюль & Гардероб', x: 6, y: 6, width: W - 12, height: H - 12, color: '#334155', floorStyle: 'tile' });
    furniture.push({ type: 'lockers', x: 14, y: 14, width: 28, height: 8, angle: 0, color: '#0284c7' });
    furniture.push({ type: 'lockers', x: 46, y: 14, width: 28, height: 8, angle: 0, color: '#0284c7' });
    furniture.push({ type: 'bench', x: 14, y: 26, width: 24, height: 6, angle: 0, color: '#78350f' });

    // Cafeteria Tables
    furniture.push({ type: 'table', x: 14, y: H - 24, width: 24, height: 10, angle: 0, color: '#b45309' });
    furniture.push({ type: 'table', x: 44, y: H - 24, width: 24, height: 10, angle: 0, color: '#b45309' });
  } else {
    // Floor 1+: Classrooms with Blackboards and Desks
    const hallwayY = H / 2 - 12;
    rooms.push({ name: 'Школьный коридор', x: 6, y: hallwayY, width: W - 12, height: 24, color: '#334155', floorStyle: 'linoleum' });
    const cW = W / 2 - 32;
    const cH = H / 2 - 18;

    rooms.push({ name: 'Кабинет Информатики', x: 6, y: 6, width: cW, height: cH, color: '#1e293b', floorStyle: 'linoleum' });
    furniture.push({ type: 'blackboard', x: 12, y: 8, width: 20, height: 3, angle: 0, color: '#14532d' });
    for (let dx = 0; dx < 2; dx++) {
      for (let dy = 0; dy < 2; dy++) {
        furniture.push({ type: 'desk', x: 12 + dx * 16, y: 16 + dy * 14, width: 10, height: 7, angle: 0, color: '#a16207' });
        furniture.push({ type: 'computer', x: 14 + dx * 16, y: 17 + dy * 14, width: 5, height: 3, angle: 0, color: '#0f172a' });
      }
    }

    rooms.push({ name: 'Кабинет Математики & Физики', x: W / 2 + 26, y: 6, width: cW, height: cH, color: '#1e293b', floorStyle: 'parquet' });
    furniture.push({ type: 'blackboard', x: W / 2 + 32, y: 8, width: 20, height: 3, angle: 0, color: '#14532d' });
    for (let dx = 0; dx < 2; dx++) {
      for (let dy = 0; dy < 2; dy++) {
        furniture.push({ type: 'desk', x: W / 2 + 32 + dx * 16, y: 16 + dy * 14, width: 10, height: 7, angle: 0, color: '#a16207' });
      }
    }
  }
}

// -------------------------------------------------------------
// INDUSTRIAL WORKSHOPS & LOGISTICS DEPOTS
// -------------------------------------------------------------
export function buildIndustrialInterior(ctx: SpecializedContext) {
  const { W, H, rooms, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone } = ctx;
  elevators.push(elevatorZone);
  stairs.push(stairsZone);
  exits.push(exitZone);

  rooms.push({ name: 'Производственно-складской цех', x: 6, y: 6, width: W - 12, height: H - 12, color: '#27272a', floorStyle: 'concrete' });

  // Heavy Industrial Shelves & Pallet Stacks
  furniture.push({ type: 'pallet_stack', x: 16, y: 16, width: 14, height: 14, angle: 0, color: '#b45309' });
  furniture.push({ type: 'pallet_stack', x: 34, y: 16, width: 14, height: 14, angle: 0, color: '#b45309' });
  furniture.push({ type: 'shelf', x: 16, y: 36, width: 10, height: H - 56, angle: 0, color: '#52525b' });

  if (W > 100) {
    furniture.push({ type: 'pallet_stack', x: W - 32, y: 16, width: 14, height: 14, angle: 0, color: '#b45309' });
    furniture.push({ type: 'shelf', x: W - 20, y: 36, width: 10, height: H - 56, angle: 0, color: '#52525b' });
  }

  // Foreman / Supervisor Office Booth
  furniture.push({ type: 'desk', x: W / 2 - 10, y: H - 24, width: 18, height: 10, angle: 0, color: '#78350f' });
  furniture.push({ type: 'computer', x: W / 2 - 4, y: H - 22, width: 6, height: 4, angle: 0, color: '#0f172a' });
  furniture.push({ type: 'cooler', x: W / 2 + 14, y: H - 22, width: 8, height: 8, angle: 0, color: '#38bdf8' });
  furniture.push({ type: 'lockers', x: W / 2 - 34, y: H - 22, width: 20, height: 8, angle: 0, color: '#0284c7' });
}

// -------------------------------------------------------------
// PHARMACY "36.6" SPECIALIZED INTERIOR
// -------------------------------------------------------------
export function buildPharmacyInterior(ctx: SpecializedContext) {
  const { W, H, rooms, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone } = ctx;
  elevators.push(elevatorZone);
  stairs.push(stairsZone);
  exits.push(exitZone);

  // Main Sales Hall & Medicine Showcase Zone
  rooms.push({ name: 'Аптека "36.6" • Торговый зал', x: 6, y: 6, width: W - 12, height: H - 12, color: '#064e3b', floorStyle: 'tile' });

  // Main Pharmacist Glass Counter & Cash Register
  const counterW = Math.min(48, W - 40);
  furniture.push({ type: 'counter', x: 14, y: H - 24, width: counterW, height: 10, angle: 0, color: '#10b981' });
  furniture.push({ type: 'cash_register', x: 18, y: H - 22, width: 6, height: 4, angle: 0, color: '#0f172a' });
  furniture.push({ type: 'computer', x: 28, y: H - 22, width: 6, height: 4, angle: 0, color: '#0f172a' });

  // Medicine Display Shelves with Glass Doors
  const numShelves = Math.max(2, Math.floor((W - 30) / 36));
  for (let s = 0; s < numShelves; s++) {
    const sx = 14 + s * 34;
    furniture.push({ type: 'shelf', x: sx, y: 12, width: 24, height: 10, angle: 0, color: '#059669' });
  }

  // Side Wall Medicine Storage Cabinets
  furniture.push({ type: 'shelf', x: W - 20, y: 12, width: 8, height: H - 42, angle: 0, color: '#047857' });

  // Customer Services: Water Cooler & First Aid Consultation Desk
  furniture.push({ type: 'cooler', x: W - 20, y: H - 22, width: 8, height: 8, angle: 0, color: '#38bdf8' });
  furniture.push({ type: 'chair', x: 14 + counterW + 10, y: H - 20, width: 6, height: 6, angle: 0, color: '#10b981' });
}

// -------------------------------------------------------------
// CAFE & BAKERY SPECIALIZED INTERIOR (Cofix & Bean Bistro)
// -------------------------------------------------------------
export function buildCafeInterior(ctx: SpecializedContext, cafeName: string = 'Кафе & Кофейня') {
  const { W, H, rooms, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone } = ctx;
  elevators.push(elevatorZone);
  stairs.push(stairsZone);
  exits.push(exitZone);

  rooms.push({ name: cafeName, x: 6, y: 6, width: W - 12, height: H - 12, color: '#451a03', floorStyle: 'wood' });

  // Barista Espresso Bar & Pastry Display Counter
  const barW = Math.min(50, W - 36);
  furniture.push({ type: 'counter', x: 14, y: 14, width: barW, height: 12, angle: 0, color: '#ea580c' });
  furniture.push({ type: 'cash_register', x: 18, y: 16, width: 6, height: 4, angle: 0, color: '#0f172a' });
  furniture.push({ type: 'kitchen_counter', x: 30, y: 16, width: 14, height: 8, angle: 0, color: '#78350f' });
  furniture.push({ type: 'cooler', x: 46, y: 16, width: 8, height: 8, angle: 0, color: '#38bdf8' });

  // Cozy Dining Tables & Sofas for Customers
  const tableRows = Math.max(1, Math.floor((H - 50) / 28));
  for (let r = 0; r < tableRows; r++) {
    const ty = 38 + r * 28;
    furniture.push({ type: 'table', x: 14, y: ty, width: 14, height: 12, angle: 0, color: '#b45309' });
    furniture.push({ type: 'chair', x: 14, y: ty - 4, width: 5, height: 4, angle: 0, color: '#ea580c' });
    furniture.push({ type: 'chair', x: 14, y: ty + 12, width: 5, height: 4, angle: 0, color: '#ea580c' });

    if (W > 90) {
      furniture.push({ type: 'table', x: 36, y: ty, width: 14, height: 12, angle: 0, color: '#b45309' });
      furniture.push({ type: 'chair', x: 36, y: ty - 4, width: 5, height: 4, angle: 0, color: '#ea580c' });
      furniture.push({ type: 'chair', x: 36, y: ty + 12, width: 5, height: 4, angle: 0, color: '#ea580c' });
    }
  }

  // Lounge Sofas & Ambient Greenery
  furniture.push({ type: 'sofa', x: W - 32, y: H - 24, width: 22, height: 10, angle: 0, color: '#d97706' });
  furniture.push({ type: 'plant', x: W - 18, y: 14, width: 8, height: 8, angle: 0, color: '#22c55e' });
}

// -------------------------------------------------------------
// AUTO SERVICE "PIT-STOP" SPECIALIZED INTERIOR
// -------------------------------------------------------------
export function buildAutoServiceInterior(ctx: SpecializedContext) {
  const { W, H, rooms, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone } = ctx;
  elevators.push(elevatorZone);
  stairs.push(stairsZone);
  exits.push(exitZone);

  rooms.push({ name: 'Автомастерская & Сервис "PIT-STOP"', x: 6, y: 6, width: W - 12, height: H - 12, color: '#1e293b', floorStyle: 'concrete' });

  // Reception Desk & Spare Parts Counter
  furniture.push({ type: 'counter', x: 14, y: H - 24, width: 34, height: 10, angle: 0, color: '#0284c7' });
  furniture.push({ type: 'cash_register', x: 18, y: H - 22, width: 6, height: 4, angle: 0, color: '#0f172a' });
  furniture.push({ type: 'computer', x: 28, y: H - 22, width: 6, height: 4, angle: 0, color: '#38bdf8' });

  // Parts Shelves & Tire Stacks
  furniture.push({ type: 'shelf', x: W - 22, y: 12, width: 12, height: H - 42, angle: 0, color: '#0369a1' });
  furniture.push({ type: 'pallet_stack', x: W - 40, y: 14, width: 14, height: 14, angle: 0, color: '#f59e0b' });
  furniture.push({ type: 'pallet_stack', x: W - 40, y: 32, width: 14, height: 14, angle: 0, color: '#f59e0b' });

  // Heavy Workbenches & Toolboxes
  furniture.push({ type: 'kitchen_counter', x: 14, y: 12, width: 36, height: 12, angle: 0, color: '#475569' });
  furniture.push({ type: 'lockers', x: 54, y: 12, width: 22, height: 8, angle: 0, color: '#64748b' });
}

// -------------------------------------------------------------
// TACTICAL & OUTDOOR GEAR SHOP "SPLAV" INTERIOR
// -------------------------------------------------------------
export function buildGearShopInterior(ctx: SpecializedContext) {
  const { W, H, rooms, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone } = ctx;
  elevators.push(elevatorZone);
  stairs.push(stairsZone);
  exits.push(exitZone);

  rooms.push({ name: 'Магазин "Охота & Туризм Сплав"', x: 6, y: 6, width: W - 12, height: H - 12, color: '#1a2e05', floorStyle: 'wood' });

  // Tactical Checkout & Consultation Counter
  const counterW = Math.min(42, W - 40);
  furniture.push({ type: 'counter', x: 14, y: H - 24, width: counterW, height: 10, angle: 0, color: '#65a30d' });
  furniture.push({ type: 'cash_register', x: 18, y: H - 22, width: 6, height: 4, angle: 0, color: '#0f172a' });
  furniture.push({ type: 'computer', x: 28, y: H - 22, width: 6, height: 4, angle: 0, color: '#0f172a' });

  // Weapon & Knife Display Cases (top wall)
  furniture.push({ type: 'shelf', x: 14, y: 14, width: 36, height: 8, angle: 0, color: '#4d7c0f' });
  if (W > 110) {
    furniture.push({ type: 'shelf', x: 54, y: 14, width: 36, height: 8, angle: 0, color: '#4d7c0f' });
  }

  // Tactical Gear Racks (side wall)
  furniture.push({ type: 'shelf', x: W - 20, y: 14, width: 8, height: H - 42, angle: 0, color: '#365314' });

  // Center Camp Tent & Backpack Display Table
  if (W > 110 && H > 90) {
    furniture.push({ type: 'table', x: W / 2 - 15, y: H / 2 - 8, width: 30, height: 16, angle: 0, color: '#84cc16' });
  }

  // Fitting Sofas & Water Cooler
  furniture.push({ type: 'cooler', x: W - 20, y: H - 22, width: 8, height: 8, angle: 0, color: '#38bdf8' });
  furniture.push({ type: 'sofa', x: counterW + 22, y: H - 24, width: 22, height: 10, angle: 0, color: '#4d7c0f' });
}

// -------------------------------------------------------------
// CAR WASH & DETAILING STATION INTERIOR
// -------------------------------------------------------------
export function buildCarWashInterior(ctx: SpecializedContext) {
  const { W, H, rooms, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone } = ctx;
  elevators.push(elevatorZone);
  stairs.push(stairsZone);
  exits.push(exitZone);

  rooms.push({ name: 'Автомойка & Детейлинг 24/7', x: 6, y: 6, width: W - 12, height: H - 12, color: '#0369a1', floorStyle: 'tile' });

  // Payment Kiosk & Reception Desk
  furniture.push({ type: 'counter', x: 14, y: H - 24, width: 28, height: 10, angle: 0, color: '#0284c7' });
  furniture.push({ type: 'cash_register', x: 18, y: H - 22, width: 6, height: 4, angle: 0, color: '#0f172a' });
  furniture.push({ type: 'computer', x: 28, y: H - 22, width: 6, height: 4, angle: 0, color: '#38bdf8' });

  // Customer Lounge & Vending
  furniture.push({ type: 'sofa', x: W - 36, y: H - 24, width: 22, height: 10, angle: 0, color: '#38bdf8' });
  furniture.push({ type: 'vending_machine', x: W - 18, y: 14, width: 10, height: 8, angle: 0, color: '#475569' });
  furniture.push({ type: 'cooler', x: W - 30, y: 14, width: 8, height: 8, angle: 0, color: '#0284c7' });

  // Pressure Washer Units & Detailing Equipment Shelves along top wall
  furniture.push({ type: 'kitchen_counter', x: 14, y: 14, width: 32, height: 10, angle: 0, color: '#0284c7' });
  furniture.push({ type: 'shelf', x: 50, y: 14, width: 24, height: 8, angle: 0, color: '#0369a1' });
}

// -------------------------------------------------------------
// COMMERCIAL SHOPPING GALLERY INTERIOR
// -------------------------------------------------------------
export function buildGalleryInterior(ctx: SpecializedContext) {
  const { W, H, floor, rooms, walls, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone } = ctx;
  elevators.push(elevatorZone);
  stairs.push(stairsZone);
  exits.push(exitZone);

  // Central Atrium / Corridor connecting everything horizontally
  rooms.push({
    name: 'Центральный Атриум Галереи',
    x: 6,
    y: 80,
    width: W - 12,
    height: 90,
    color: '#1e293b',
    floorStyle: 'tile'
  });

  // Elevator & Stairs lobby at the top-center
  rooms.push({
    name: 'Лифтовой Холл & Зона Ожидания',
    x: W / 2 - 45,
    y: 6,
    width: 90,
    height: 74,
    color: '#1e293b',
    floorStyle: 'tile'
  });

  // Separate elevator/stairs lobby from boutiques with vertical walls
  walls.push({ x1: W / 2 - 45, y1: 6, x2: W / 2 - 45, y2: 80 });
  walls.push({ x1: W / 2 + 45, y1: 6, x2: W / 2 + 45, y2: 80 });

  if (floor === 0) {
    // =========================================================
    // FLOOR 0 BOUTIQUES (Zara, Bookstore, Sport, FastFood, Pizza)
    // =========================================================

    // 1. Top-Left: Zara Fashion
    rooms.push({
      name: 'Магазин одежды "Zara Fashion"',
      x: 6,
      y: 6,
      width: W / 2 - 51,
      height: 74,
      color: '#0f172a',
      floorStyle: 'wood'
    });
    // Partition wall with doorway opening at 100 to 140
    walls.push({ x1: 6, y1: 80, x2: 100, y2: 80 });
    walls.push({ x1: 140, y1: 80, x2: W / 2 - 51, y2: 80 });

    // Zara interior
    furniture.push({ type: 'counter', x: 20, y: 16, width: 24, height: 8, angle: 0, color: '#475569' });
    furniture.push({ type: 'cash_register', x: 24, y: 18, width: 6, height: 4, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'shelf', x: 60, y: 14, width: 30, height: 8, angle: 0, color: '#64748b' });
    furniture.push({ type: 'shelf', x: 100, y: 14, width: 30, height: 8, angle: 0, color: '#64748b' });
    furniture.push({ type: 'shelf', x: 140, y: 14, width: 30, height: 8, angle: 0, color: '#64748b' });
    furniture.push({ type: 'table', x: 60, y: 44, width: 24, height: 12, angle: 0, color: '#334155' });
    furniture.push({ type: 'table', x: 120, y: 44, width: 24, height: 12, angle: 0, color: '#334155' });
    furniture.push({ type: 'sofa', x: 14, y: 44, width: 16, height: 8, angle: 0, color: '#0284c7' });

    // 2. Top-Right: Книжный магазин "Читай-Город"
    rooms.push({
      name: 'Книжный магазин "Читай-Город"',
      x: W / 2 + 45,
      y: 6,
      width: W / 2 - 51,
      height: 74,
      color: '#111827',
      floorStyle: 'parquet'
    });
    // Partition wall with doorway opening at 400 to 440
    walls.push({ x1: W / 2 + 45, y1: 80, x2: 400, y2: 80 });
    walls.push({ x1: 440, y1: 80, x2: W - 6, y2: 80 });

    // Bookstore interior
    furniture.push({ type: 'counter', x: W / 2 + 65, y: 16, width: 24, height: 8, angle: 0, color: '#0d9488' });
    furniture.push({ type: 'cash_register', x: W / 2 + 69, y: 18, width: 6, height: 4, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'shelf', x: W / 2 + 100, y: 14, width: 32, height: 8, angle: 0, color: '#0f766e' });
    furniture.push({ type: 'shelf', x: W / 2 + 140, y: 14, width: 32, height: 8, angle: 0, color: '#0f766e' });
    furniture.push({ type: 'table', x: W / 2 + 100, y: 44, width: 24, height: 12, angle: 0, color: '#0d9488' });
    furniture.push({ type: 'table', x: W / 2 + 140, y: 44, width: 24, height: 12, angle: 0, color: '#0d9488' });

    // 3. Bottom-Left: Спортивный гипермаркет "Спортмастер"
    rooms.push({
      name: 'Спортивный гипермаркет "Спортмастер"',
      x: 6,
      y: 170,
      width: 134,
      height: 84,
      color: '#172554',
      floorStyle: 'wood'
    });
    // Top wall of Sports Store with gap at 60 to 100
    walls.push({ x1: 6, y1: 170, x2: 60, y2: 170 });
    walls.push({ x1: 100, y1: 170, x2: 140, y2: 170 });
    walls.push({ x1: 140, y1: 170, x2: 140, y2: H - 6 });

    // Sports interior
    furniture.push({ type: 'counter', x: 14, y: H - 24, width: 24, height: 8, angle: 0, color: '#1d4ed8' });
    furniture.push({ type: 'cash_register', x: 18, y: H - 22, width: 6, height: 4, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'shelf', x: 14, y: 180, width: 24, height: 8, angle: 0, color: '#1d4ed8' });
    furniture.push({ type: 'shelf', x: 44, y: 180, width: 24, height: 8, angle: 0, color: '#1d4ed8' });
    furniture.push({ type: 'table', x: 80, y: 200, width: 20, height: 12, angle: 0, color: '#2563eb' });

    // 4. Bottom-Middle: Ресторан "Вкусно — и точка"
    rooms.push({
      name: 'Ресторан "Вкусно — и точка"',
      x: 210,
      y: 170,
      width: 140,
      height: 84,
      color: '#450a0a',
      floorStyle: 'tile'
    });
    // Partition walls with gap at 260 to 300
    walls.push({ x1: 210, y1: 170, x2: 260, y2: 170 });
    walls.push({ x1: 300, y1: 170, x2: 350, y2: 170 });
    walls.push({ x1: 210, y1: 170, x2: 210, y2: H - 6 });
    walls.push({ x1: 350, y1: 170, x2: 350, y2: H - 6 });

    // Fastfood interior
    furniture.push({ type: 'counter', x: 220, y: 180, width: 34, height: 10, angle: 0, color: '#dc2626' });
    furniture.push({ type: 'cash_register', x: 224, y: 182, width: 6, height: 4, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'table', x: 220, y: 215, width: 14, height: 10, angle: 0, color: '#eab308' });
    furniture.push({ type: 'chair', x: 220, y: 210, width: 4, height: 4, angle: 0, color: '#450a0a' });
    furniture.push({ type: 'table', x: 250, y: 215, width: 14, height: 10, angle: 0, color: '#eab308' });
    furniture.push({ type: 'chair', x: 250, y: 210, width: 4, height: 4, angle: 0, color: '#450a0a' });
    furniture.push({ type: 'atm', x: 320, y: 180, width: 8, height: 8, angle: 0, color: '#dc2626' });

    // 5. Bottom-Right: Пиццерия "Додо Пицца"
    rooms.push({
      name: 'Пиццерия "Додо Пицца"',
      x: 420,
      y: 170,
      width: W - 426,
      height: 84,
      color: '#431407',
      floorStyle: 'tile'
    });
    // Partition walls with gap at 460 to 500
    walls.push({ x1: 420, y1: 170, x2: 460, y2: 170 });
    walls.push({ x1: 500, y1: 170, x2: W - 6, y2: 170 });
    walls.push({ x1: 420, y1: 170, x2: 420, y2: H - 6 });

    // Pizza interior
    furniture.push({ type: 'counter', x: 430, y: 180, width: 32, height: 10, angle: 0, color: '#ea580c' });
    furniture.push({ type: 'cash_register', x: 434, y: 182, width: 6, height: 4, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'table', x: 440, y: 215, width: 14, height: 10, angle: 0, color: '#ea580c' });
    furniture.push({ type: 'table', x: 470, y: 215, width: 14, height: 10, angle: 0, color: '#ea580c' });

  } else {
    // =========================================================
    // FLOOR 1 BOUTIQUES (M.Video, Sushi, Cinema Bar, Cofix, Bean)
    // =========================================================

    // 1. Top-Left: Гипермаркет электроники "М.Видео"
    rooms.push({
      name: 'Гипермаркет электроники "М.Видео"',
      x: 6,
      y: 6,
      width: W / 2 - 51,
      height: 74,
      color: '#0f172a',
      floorStyle: 'tile'
    });
    walls.push({ x1: 6, y1: 80, x2: 100, y2: 80 });
    walls.push({ x1: 140, y1: 80, x2: W / 2 - 51, y2: 80 });

    // Electronics interior
    furniture.push({ type: 'counter', x: 20, y: 16, width: 24, height: 8, angle: 0, color: '#ef4444' });
    furniture.push({ type: 'cash_register', x: 24, y: 18, width: 6, height: 4, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'table', x: 60, y: 44, width: 24, height: 12, angle: 0, color: '#38bdf8' });
    furniture.push({ type: 'computer', x: 62, y: 46, width: 6, height: 4, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'table', x: 120, y: 44, width: 24, height: 12, angle: 0, color: '#38bdf8' });
    furniture.push({ type: 'computer', x: 122, y: 46, width: 6, height: 4, angle: 0, color: '#0f172a' });

    // 2. Top-Right: Суши & WOK "Якитория"
    rooms.push({
      name: 'Суши & WOK "Якитория"',
      x: W / 2 + 45,
      y: 6,
      width: W / 2 - 51,
      height: 74,
      color: '#1e1b4b',
      floorStyle: 'wood'
    });
    walls.push({ x1: W / 2 + 45, y1: 80, x2: 400, y2: 80 });
    walls.push({ x1: 440, y1: 80, x2: W - 6, y2: 80 });

    // Sushi interior
    furniture.push({ type: 'counter', x: W / 2 + 65, y: 16, width: 24, height: 8, angle: 0, color: '#ec4899' });
    furniture.push({ type: 'cash_register', x: W / 2 + 69, y: 18, width: 6, height: 4, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'table', x: W / 2 + 110, y: 44, width: 16, height: 12, angle: 0, color: '#db2777' });
    furniture.push({ type: 'table', x: W / 2 + 150, y: 44, width: 16, height: 12, angle: 0, color: '#db2777' });

    // 3. Bottom-Left: Кинобар "Синема Парк"
    rooms.push({
      name: 'Кинобар "Синема Парк"',
      x: 6,
      y: 170,
      width: 134,
      height: 84,
      color: '#18181b',
      floorStyle: 'tile'
    });
    walls.push({ x1: 6, y1: 170, x2: 60, y2: 170 });
    walls.push({ x1: 100, y1: 170, x2: 140, y2: 170 });
    walls.push({ x1: 140, y1: 170, x2: 140, y2: H - 6 });

    // Cinema interior
    furniture.push({ type: 'counter', x: 14, y: 180, width: 44, height: 10, angle: 0, color: '#a855f7' });
    furniture.push({ type: 'cash_register', x: 20, y: 182, width: 6, height: 4, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'vending_machine', x: 70, y: 180, width: 12, height: 8, angle: 0, color: '#a855f7' });
    furniture.push({ type: 'sofa', x: 14, y: H - 24, width: 34, height: 10, angle: 0, color: '#a855f7' });

    // 4. Bottom-Middle: Кафе & Пекарня "Cofix"
    rooms.push({
      name: 'Кафе & Пекарня "Cofix"',
      x: 210,
      y: 170,
      width: 140,
      height: 84,
      color: '#451a03',
      floorStyle: 'wood'
    });
    walls.push({ x1: 210, y1: 170, x2: 260, y2: 170 });
    walls.push({ x1: 300, y1: 170, x2: 350, y2: 170 });
    walls.push({ x1: 210, y1: 170, x2: 210, y2: H - 6 });
    walls.push({ x1: 350, y1: 170, x2: 350, y2: H - 6 });

    // Cofix interior
    furniture.push({ type: 'counter', x: 220, y: 180, width: 34, height: 10, angle: 0, color: '#ea580c' });
    furniture.push({ type: 'cash_register', x: 226, y: 182, width: 6, height: 4, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'table', x: 220, y: 215, width: 14, height: 10, angle: 0, color: '#ea580c' });
    furniture.push({ type: 'table', x: 250, y: 215, width: 14, height: 10, angle: 0, color: '#ea580c' });

    // 5. Bottom-Right: Кафе & Кофейня "Bean & Bistro"
    rooms.push({
      name: 'Кафе & Кофейня "Bean & Bistro"',
      x: 420,
      y: 170,
      width: W - 426,
      height: 84,
      color: '#451a03',
      floorStyle: 'wood'
    });
    walls.push({ x1: 420, y1: 170, x2: 460, y2: 170 });
    walls.push({ x1: 500, y1: 170, x2: W - 6, y2: 170 });
    walls.push({ x1: 420, y1: 170, x2: 420, y2: H - 6 });

    // Bean & Bistro interior
    furniture.push({ type: 'counter', x: 430, y: 180, width: 36, height: 10, angle: 0, color: '#d97706' });
    furniture.push({ type: 'cash_register', x: 436, y: 182, width: 6, height: 4, angle: 0, color: '#0f172a' });
    furniture.push({ type: 'table', x: 440, y: 215, width: 14, height: 10, angle: 0, color: '#d97706' });
    furniture.push({ type: 'table', x: 470, y: 215, width: 14, height: 10, angle: 0, color: '#d97706' });
  }

  // ==========================================
  // SHARED DECORATIVE ATRIUM ELEMENTS
  // ==========================================
  // Left Lounge Area with green plant
  furniture.push({ type: 'carpet', x: 40, y: 115, width: 34, height: 18, angle: 0, color: '#334155' });
  furniture.push({ type: 'sofa', x: 42, y: 118, width: 14, height: 8, angle: 0, color: '#0284c7' });
  furniture.push({ type: 'sofa', x: 58, y: 118, width: 14, height: 8, angle: 0, color: '#0284c7' });
  furniture.push({ type: 'plant', x: 34, y: 115, width: 6, height: 6, angle: 0, color: '#22c55e' });

  // Right Lounge Area
  furniture.push({ type: 'carpet', x: W - 140, y: 115, width: 34, height: 18, angle: 0, color: '#334155' });
  furniture.push({ type: 'sofa', x: W - 138, y: 118, width: 14, height: 8, angle: 0, color: '#0284c7' });
  furniture.push({ type: 'sofa', x: W - 122, y: 118, width: 14, height: 8, angle: 0, color: '#0284c7' });
  furniture.push({ type: 'plant', x: W - 146, y: 115, width: 6, height: 6, angle: 0, color: '#22c55e' });

  // Bank ATMs, Vending Machines & Cooler near the left entrance walkway
  furniture.push({ type: 'atm', x: 10, y: 94, width: 8, height: 8, angle: 0, color: '#0284c7' });
  furniture.push({ type: 'atm', x: 20, y: 94, width: 8, height: 8, angle: 0, color: '#0284c7' });
  furniture.push({ type: 'vending_machine', x: 30, y: 94, width: 10, height: 8, angle: 0, color: '#475569' });
  furniture.push({ type: 'cooler', x: 42, y: 94, width: 8, height: 8, angle: 0, color: '#38bdf8' });

  // Central Information / Reception Desk in the middle of Atrium
  furniture.push({ type: 'counter', x: W / 2 - 20, y: 125, width: 40, height: 10, angle: 0, color: '#38bdf8' });
  furniture.push({ type: 'computer', x: W / 2 - 12, y: 127, width: 6, height: 4, angle: 0, color: '#0f172a' });
  furniture.push({ type: 'computer', x: W / 2 + 6, y: 127, width: 6, height: 4, angle: 0, color: '#0f172a' });
  furniture.push({ type: 'plant', x: W / 2 - 28, y: 125, width: 6, height: 6, angle: 0, color: '#22c55e' });
  furniture.push({ type: 'plant', x: W / 2 + 22, y: 125, width: 6, height: 6, angle: 0, color: '#22c55e' });
}

// -------------------------------------------------------------
// PIZZERIA "DODO PIZZA" STANDALONE RESTAURANT INTERIOR
// -------------------------------------------------------------
export function buildPizzeriaInterior(ctx: SpecializedContext) {
  const { W, H, rooms, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone } = ctx;
  elevators.push(elevatorZone);
  stairs.push(stairsZone);
  exits.push(exitZone);

  rooms.push({ name: 'Пиццерия "Додо Пицца"', x: 6, y: 6, width: W - 12, height: H - 12, color: '#431407', floorStyle: 'tile' });

  // Pizza Preparation Counter & Ovens (Back Kitchen)
  const barW = Math.min(54, W - 36);
  furniture.push({ type: 'counter', x: 14, y: 14, width: barW, height: 12, angle: 0, color: '#ea580c' });
  furniture.push({ type: 'cash_register', x: 18, y: 16, width: 6, height: 4, angle: 0, color: '#0f172a' });
  furniture.push({ type: 'kitchen_counter', x: 30, y: 16, width: 22, height: 8, angle: 0, color: '#c2410c' });
  furniture.push({ type: 'fridge', x: 58, y: 14, width: 10, height: 10, angle: 0, color: '#cbd5e1' });

  // Pizza Dining Tables & Orange Booths
  const numRows = Math.max(1, Math.floor((H - 56) / 28));
  for (let r = 0; r < numRows; r++) {
    const ty = 40 + r * 28;
    furniture.push({ type: 'table', x: 16, y: ty, width: 16, height: 12, angle: 0, color: '#f97316' });
    furniture.push({ type: 'chair', x: 16, y: ty - 4, width: 6, height: 4, angle: 0, color: '#c2410c' });
    furniture.push({ type: 'chair', x: 16, y: ty + 12, width: 6, height: 4, angle: 0, color: '#c2410c' });

    if (W > 90) {
      furniture.push({ type: 'table', x: 42, y: ty, width: 16, height: 12, angle: 0, color: '#f97316' });
      furniture.push({ type: 'chair', x: 42, y: ty - 4, width: 6, height: 4, angle: 0, color: '#c2410c' });
      furniture.push({ type: 'chair', x: 42, y: ty + 12, width: 6, height: 4, angle: 0, color: '#c2410c' });
    }
  }

  // Delivery Bag Rack & Drinks Cooler
  furniture.push({ type: 'cooler', x: W - 22, y: 14, width: 8, height: 8, angle: 0, color: '#38bdf8' });
  furniture.push({ type: 'shelf', x: W - 22, y: 30, width: 8, height: 24, angle: 0, color: '#f97316' });
}

// -------------------------------------------------------------
// BURGER RESTAURANT "VKUSNO I TOCHKA" INTERIOR
// -------------------------------------------------------------
export function buildFastFoodInterior(ctx: SpecializedContext) {
  const { W, H, rooms, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone } = ctx;
  elevators.push(elevatorZone);
  stairs.push(stairsZone);
  exits.push(exitZone);

  rooms.push({ name: 'Ресторан "Вкусно — и точка"', x: 6, y: 6, width: W - 12, height: H - 12, color: '#450a0a', floorStyle: 'tile' });

  // Main Pickup Counter & Cash Registers
  const counterW = Math.min(54, W - 36);
  furniture.push({ type: 'counter', x: 14, y: 14, width: counterW, height: 12, angle: 0, color: '#dc2626' });
  furniture.push({ type: 'cash_register', x: 18, y: 16, width: 6, height: 4, angle: 0, color: '#0f172a' });
  furniture.push({ type: 'cash_register', x: 30, y: 16, width: 6, height: 4, angle: 0, color: '#0f172a' });
  furniture.push({ type: 'kitchen_counter', x: 44, y: 16, width: 18, height: 8, angle: 0, color: '#b91c1c' });

  // Self-service Order Terminals (Kiosks)
  furniture.push({ type: 'atm', x: W - 22, y: 14, width: 8, height: 8, angle: 0, color: '#eab308' });
  furniture.push({ type: 'atm', x: W - 34, y: 14, width: 8, height: 8, angle: 0, color: '#eab308' });

  // Dining Tables & Chairs
  const numRows = Math.max(1, Math.floor((H - 56) / 28));
  for (let r = 0; r < numRows; r++) {
    const ty = 42 + r * 28;
    furniture.push({ type: 'table', x: 16, y: ty, width: 16, height: 12, angle: 0, color: '#b91c1c' });
    furniture.push({ type: 'chair', x: 16, y: ty - 4, width: 6, height: 4, angle: 0, color: '#eab308' });
    furniture.push({ type: 'chair', x: 16, y: ty + 12, width: 6, height: 4, angle: 0, color: '#eab308' });

    if (W > 90) {
      furniture.push({ type: 'table', x: 42, y: ty, width: 16, height: 12, angle: 0, color: '#b91c1c' });
      furniture.push({ type: 'chair', x: 42, y: ty - 4, width: 6, height: 4, angle: 0, color: '#eab308' });
      furniture.push({ type: 'chair', x: 42, y: ty + 12, width: 6, height: 4, angle: 0, color: '#eab308' });
    }
  }

  // Soft Seating & Drinks Dispenser
  furniture.push({ type: 'cooler', x: W - 22, y: H - 24, width: 8, height: 8, angle: 0, color: '#38bdf8' });
  furniture.push({ type: 'sofa', x: W - 48, y: H - 24, width: 22, height: 10, angle: 0, color: '#dc2626' });
}

// -------------------------------------------------------------
// ELECTRONICS STORE "M.VIDEO" INTERIOR
// -------------------------------------------------------------
export function buildElectronicsInterior(ctx: SpecializedContext) {
  const { W, H, rooms, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone } = ctx;
  elevators.push(elevatorZone);
  stairs.push(stairsZone);
  exits.push(exitZone);

  rooms.push({ name: 'Гипермаркет электроники "М.Видео"', x: 6, y: 6, width: W - 12, height: H - 12, color: '#0f172a', floorStyle: 'tile' });

  // Main Checkout & Warranty Service Counter
  furniture.push({ type: 'counter', x: 14, y: H - 24, width: 38, height: 10, angle: 0, color: '#ef4444' });
  furniture.push({ type: 'cash_register', x: 18, y: H - 22, width: 6, height: 4, angle: 0, color: '#0f172a' });
  furniture.push({ type: 'computer', x: 28, y: H - 22, width: 6, height: 4, angle: 0, color: '#38bdf8' });
  furniture.push({ type: 'computer', x: 38, y: H - 22, width: 6, height: 4, angle: 0, color: '#38bdf8' });

  // Smartphone & Laptop Display Podiums
  furniture.push({ type: 'table', x: 16, y: 16, width: 26, height: 12, angle: 0, color: '#38bdf8' });
  furniture.push({ type: 'computer', x: 18, y: 18, width: 6, height: 4, angle: 0, color: '#0f172a' });
  furniture.push({ type: 'computer', x: 28, y: 18, width: 6, height: 4, angle: 0, color: '#0f172a' });

  furniture.push({ type: 'table', x: 50, y: 16, width: 26, height: 12, angle: 0, color: '#38bdf8' });
  furniture.push({ type: 'computer', x: 52, y: 18, width: 6, height: 4, angle: 0, color: '#0f172a' });
  furniture.push({ type: 'computer', x: 62, y: 18, width: 6, height: 4, angle: 0, color: '#0f172a' });

  // TV Wall & Appliance Shelving
  furniture.push({ type: 'shelf', x: W - 20, y: 14, width: 8, height: H - 42, angle: 0, color: '#2563eb' });
  furniture.push({ type: 'shelf', x: 14, y: 36, width: 8, height: H - 68, angle: 0, color: '#2563eb' });
  furniture.push({ type: 'shelf', x: 32, y: 36, width: 8, height: H - 68, angle: 0, color: '#2563eb' });
}

// -------------------------------------------------------------
// SPORTS STORE "SPORTMASTER" INTERIOR
// -------------------------------------------------------------
export function buildSportsStoreInterior(ctx: SpecializedContext) {
  const { W, H, rooms, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone } = ctx;
  elevators.push(elevatorZone);
  stairs.push(stairsZone);
  exits.push(exitZone);

  rooms.push({ name: 'Спортивный гипермаркет "Спортмастер"', x: 6, y: 6, width: W - 12, height: H - 12, color: '#172554', floorStyle: 'wood' });

  // Checkout Counter
  furniture.push({ type: 'counter', x: 14, y: H - 24, width: 34, height: 10, angle: 0, color: '#2563eb' });
  furniture.push({ type: 'cash_register', x: 18, y: H - 22, width: 6, height: 4, angle: 0, color: '#0f172a' });
  furniture.push({ type: 'computer', x: 28, y: H - 22, width: 6, height: 4, angle: 0, color: '#38bdf8' });

  // Sportswear Racks & Equipment Shelves
  furniture.push({ type: 'shelf', x: 14, y: 14, width: 10, height: H - 48, angle: 0, color: '#1d4ed8' });
  furniture.push({ type: 'shelf', x: 32, y: 14, width: 10, height: H - 48, angle: 0, color: '#1d4ed8' });

  if (W > 90) {
    furniture.push({ type: 'table', x: 50, y: 16, width: 22, height: 14, angle: 0, color: '#3b82f6' });
    furniture.push({ type: 'shelf', x: W - 22, y: 14, width: 10, height: H - 48, angle: 0, color: '#1e40af' });
  }
}

