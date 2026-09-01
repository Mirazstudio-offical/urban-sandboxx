import { Building, Player } from './types';
import { sound } from './audio';

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
    | 'kids_table'
    | 'kids_bed'
    | 'toy_chest'
    | 'bench'
    | 'trash_can';
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
  floorStyle?: 'parquet' | 'tile' | 'wood' | 'linoleum' | 'carpet' | 'playmat';
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

// Deterministic seed-based random generator to ensure layouts are consistent per building/floor
function createSeededRandom(seedString: string) {
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
  }
  return () => {
    hash = (hash * 1664525 + 1013904223) % 4294967296;
    return Math.abs(hash) / 4294967296;
  };
}

export function getBuildingFloorsCount(bld: Building): number {
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

export function generateBuildingLayout(bld: Building, floor: number): BuildingLayout {
  const rand = createSeededRandom(`${bld.id}_floor_${floor}`);
  const W = Math.max(40, bld.width);
  const H = Math.max(30, bld.height);

  const rooms: InteriorRoom[] = [];
  const walls: InteriorWall[] = [];
  const furniture: InteriorFurniture[] = [];
  const elevators: InteriorZone[] = [];
  const stairs: InteriorZone[] = [];
  const exits: InteriorZone[] = [];

  const isResidential = ['residential', 'panel_apartment', 'brick_residential', 'modern_residential', 'suburban'].includes(bld.type);
  const isOffice = ['office', 'business_center'].includes(bld.type);
  const isShop = ['shop', 'shopping_mall', 'commercial'].includes(bld.type);

  const rawEntrances = (bld.entrances && bld.entrances.length > 0)
    ? bld.entrances
    : [{ side: bld.entranceSide || 'south', offsetRatio: 0.5, number: 1 }];

  if (isResidential) {
    // =========================================================================
    // --- RESIDENTIAL BUILDINGS: DISTINCT ПОДЪЕЗДЫ WITH 2 APARTMENTS EACH ---
    // =========================================================================
    const numSections = Math.max(1, rawEntrances.length);
    const totalFloors = getBuildingFloorsCount(bld);
    const isHorizontalLayout = W >= H;

    for (let k = 0; k < numSections; k++) {
      const ent = rawEntrances[k] || { side: 'south', offsetRatio: 0.5, number: k + 1 };
      
      let secX = 6;
      let secY = 6;
      let secW = W - 12;
      let secH = H - 12;

      if (isHorizontalLayout) {
        // Divide building horizontally into independent vertical section columns (подъезды)
        const sliceW = (W - 12) / numSections;
        secX = 6 + k * sliceW;
        secW = sliceW;
        secY = 6;
        secH = H - 12;

        // Solid dividing partition wall between adjacent подъезды (no passage between them!)
        if (k > 0) {
          walls.push({ x1: secX, y1: 6, x2: secX, y2: H - 6 });
        }
      } else {
        // Divide building vertically into independent horizontal section rows
        const sliceH = (H - 12) / numSections;
        secX = 6;
        secW = W - 12;
        secY = 6 + k * sliceH;
        secH = sliceH;

        if (k > 0) {
          walls.push({ x1: 6, y1: secY, x2: W - 6, y2: secY });
        }
      }

      // Inside section k: Create central entrance vestibule & elevator hall (Лифтовой холл / лестничная площадка)
      const entSide = ent.side || 'south';
      const hallW = Math.min(48, Math.max(34, secW * 0.32));
      const hallX = secX + (secW - hallW) / 2;
      const hallY = secY;
      const hallH = secH;

      rooms.push({
        name: `Подъезд №${ent.number ?? (k + 1)}`,
        x: hallX,
        y: hallY,
        width: hallW,
        height: hallH,
        color: '#334155',
        floorStyle: 'tile'
      });

      // Position Elevator & Stairs inside this specific section's hall
      let elX = hallX + 3;
      let elY = hallY + 3;
      let stX = hallX + hallW - 21;
      let stY = hallY + 3;
      let exX = hallX + (hallW - 22) / 2;
      let exY = hallY + hallH - 10;

      if (entSide === 'north') {
        elY = hallY + hallH - 18;
        stY = hallY + hallH - 18;
        exY = hallY + 2;
      } else if (entSide === 'west') {
        elX = hallX + hallW - 21;
        stX = hallX + hallW - 21;
        elY = hallY + 3;
        stY = hallY + 21;
        exX = hallX + 2;
        exY = hallY + (hallH - 10) / 2;
      } else if (entSide === 'east') {
        elX = hallX + 3;
        stX = hallX + 3;
        elY = hallY + 3;
        stY = hallY + 21;
        exX = hallX + hallW - 24;
        exY = hallY + (hallH - 10) / 2;
      }

      const secElevator: InteriorZone = { x: elX, y: elY, width: 18, height: 15, entranceIndex: k, sectionIndex: k };
      const secStairs: InteriorZone = { x: stX, y: stY, width: 18, height: 15, entranceIndex: k, sectionIndex: k };
      const secExit: InteriorZone = { x: exX, y: exY, width: 22, height: 8, entranceIndex: k, sectionIndex: k };

      elevators.push(secElevator);
      stairs.push(secStairs);
      exits.push(secExit);

      // Section hall decorative furniture (Mailboxes, Notice board, plant)
      furniture.push({
        type: 'shelf',
        x: hallX + 3,
        y: (entSide === 'north' ? hallY + hallH - 32 : hallY + 20),
        width: 14,
        height: 6,
        angle: 0,
        color: '#475569' // Mailbox bank (почтовые ящики)
      });

      // Vestibule partition walls with 2 open doorways into Left & Right apartments
      const doorW = 20;
      const doorY = hallY + hallH / 2 - doorW / 2;

      // Left Hall Wall (with doorway)
      walls.push({ x1: hallX, y1: hallY, x2: hallX, y2: doorY });
      walls.push({ x1: hallX, y1: doorY + doorW, x2: hallX, y2: hallY + hallH });

      // Right Hall Wall (with doorway)
      walls.push({ x1: hallX + hallW, y1: hallY, x2: hallX + hallW, y2: doorY });
      walls.push({ x1: hallX + hallW, y1: doorY + doorW, x2: hallX + hallW, y2: hallY + hallH });

      // -----------------------------------------------------------------------
      // APARTMENT 1 (LEFT APARTMENT)
      // -----------------------------------------------------------------------
      const ap1W = hallX - secX;
      const ap1H = secH;
      const ap1Num = k * totalFloors * 2 + floor * 2 + 1;

      if (ap1W > 25) {
        // Living room / main area
        const ap1LivW = ap1W;
        const ap1LivH = ap1H > 65 ? ap1H * 0.55 : ap1H;
        rooms.push({
          name: `Кв. ${ap1Num}`,
          x: secX,
          y: secY,
          width: ap1LivW,
          height: ap1LivH,
          color: '#1e293b',
          floorStyle: 'parquet'
        });

        // Carpet in living area
        furniture.push({
          type: 'carpet',
          x: secX + 6,
          y: secY + 6,
          width: ap1LivW - 12,
          height: ap1LivH - 12,
          angle: 0,
          color: '#334155'
        });

        // Sofa along left wall
        furniture.push({
          type: 'sofa',
          x: secX + 4,
          y: secY + 8,
          width: Math.min(26, ap1LivW - 8),
          height: 10,
          angle: 0,
          color: '#0284c7'
        });

        // TV Stand + TV opposite sofa
        if (ap1LivH > 35) {
          furniture.push({
            type: 'tv_cabinet',
            x: secX + 4,
            y: secY + ap1LivH - 12,
            width: Math.min(22, ap1LivW - 8),
            height: 5,
            angle: 0,
            color: '#78350f'
          });
          furniture.push({
            type: 'tv',
            x: secX + 6,
            y: secY + ap1LivH - 11,
            width: Math.min(16, ap1LivW - 12),
            height: 2,
            angle: 0,
            color: '#000000'
          });
        }

        // House plant
        furniture.push({
          type: 'plant',
          x: secX + ap1LivW - 9,
          y: secY + 8,
          width: 6,
          height: 6,
          angle: 0,
          color: '#16a34a'
        });

        // Bookshelf
        furniture.push({
          type: 'bookshelf',
          x: secX + ap1LivW - 10,
          y: secY + ap1LivH - 12,
          width: 8,
          height: 5,
          angle: 0,
          color: '#a16207'
        });

        // Subdivided Bedroom & Kitchen/Bathroom if height permits
        if (ap1H > 65) {
          const ap1BedH = ap1H - ap1LivH;
          const ap1BedY = secY + ap1LivH;
          const ap1BedW = ap1W * 0.55;
          const ap1KitW = ap1W - ap1BedW;

          // Wall separating living from lower rooms (with doorway)
          walls.push({ x1: secX, y1: ap1BedY, x2: secX + ap1W * 0.4, y2: ap1BedY });
          walls.push({ x1: secX + ap1W * 0.7, y1: ap1BedY, x2: secX + ap1W, y2: ap1BedY });

          // Bedroom
          rooms.push({
            name: 'Спальня',
            x: secX,
            y: ap1BedY,
            width: ap1BedW,
            height: ap1BedH,
            color: '#0f172a',
            floorStyle: 'wood'
          });

          // Bed
          furniture.push({
            type: 'bed',
            x: secX + 4,
            y: ap1BedY + 4,
            width: Math.min(22, ap1BedW - 8),
            height: Math.min(24, ap1BedH - 8),
            angle: 0,
            color: '#e11d48'
          });

          // Wardrobe
          furniture.push({
            type: 'wardrobe',
            x: secX + 4,
            y: ap1BedY + ap1BedH - 8,
            width: Math.min(18, ap1BedW - 8),
            height: 5,
            angle: 0,
            color: '#b45309'
          });

          // Kitchen & Bathroom
          rooms.push({
            name: 'Кухня',
            x: secX + ap1BedW,
            y: ap1BedY,
            width: ap1KitW,
            height: ap1BedH,
            color: '#1e293b',
            floorStyle: 'tile'
          });

          // Dividing wall between bed and kitchen
          walls.push({ x1: secX + ap1BedW, y1: ap1BedY, x2: secX + ap1BedW, y2: secY + ap1H });

          // Kitchen countertop
          furniture.push({
            type: 'kitchen_counter',
            x: secX + ap1BedW + 2,
            y: ap1BedY + 3,
            width: ap1KitW - 4,
            height: 8,
            angle: 0,
            color: '#475569'
          });

          // Fridge
          furniture.push({
            type: 'fridge',
            x: secX + ap1W - 8,
            y: ap1BedY + ap1BedH - 9,
            width: 6,
            height: 6,
            angle: 0,
            color: '#e2e8f0'
          });

          // Dining Table + Chairs
          furniture.push({
            type: 'table',
            x: secX + ap1BedW + 4,
            y: ap1BedY + ap1BedH - 12,
            width: 12,
            height: 8,
            angle: 0,
            color: '#b45309'
          });
          furniture.push({
            type: 'chair',
            x: secX + ap1BedW + 8,
            y: ap1BedY + ap1BedH - 15,
            width: 4,
            height: 3,
            angle: 0,
            color: '#64748b'
          });
        }
      }

      // -----------------------------------------------------------------------
      // APARTMENT 2 (RIGHT APARTMENT)
      // -----------------------------------------------------------------------
      const ap2X = hallX + hallW;
      const ap2W = secX + secW - ap2X;
      const ap2H = secH;
      const ap2Num = k * totalFloors * 2 + floor * 2 + 2;

      if (ap2W > 25) {
        const ap2LivW = ap2W;
        const ap2LivH = ap2H > 65 ? ap2H * 0.55 : ap2H;

        rooms.push({
          name: `Кв. ${ap2Num}`,
          x: ap2X,
          y: secY,
          width: ap2LivW,
          height: ap2LivH,
          color: '#1e293b',
          floorStyle: 'parquet'
        });

        furniture.push({
          type: 'carpet',
          x: ap2X + 6,
          y: secY + 6,
          width: ap2LivW - 12,
          height: ap2LivH - 12,
          angle: 0,
          color: '#1e1b4b'
        });

        // Sofa along right wall
        furniture.push({
          type: 'sofa',
          x: ap2X + ap2LivW - Math.min(26, ap2LivW - 8) - 4,
          y: secY + 8,
          width: Math.min(26, ap2LivW - 8),
          height: 10,
          angle: 0,
          color: '#8b5cf6'
        });

        // TV Stand + TV opposite sofa
        if (ap2LivH > 35) {
          furniture.push({
            type: 'tv_cabinet',
            x: ap2X + ap2LivW - Math.min(22, ap2LivW - 8) - 4,
            y: secY + ap2LivH - 12,
            width: Math.min(22, ap2LivW - 8),
            height: 5,
            angle: 0,
            color: '#78350f'
          });
          furniture.push({
            type: 'tv',
            x: ap2X + ap2LivW - Math.min(16, ap2LivW - 12) - 6,
            y: secY + ap2LivH - 11,
            width: Math.min(16, ap2LivW - 12),
            height: 2,
            angle: 0,
            color: '#000000'
          });
        }

        furniture.push({
          type: 'plant',
          x: ap2X + 4,
          y: secY + 8,
          width: 6,
          height: 6,
          angle: 0,
          color: '#16a34a'
        });

        furniture.push({
          type: 'bookshelf',
          x: ap2X + 4,
          y: secY + ap2LivH - 12,
          width: 8,
          height: 5,
          angle: 0,
          color: '#a16207'
        });

        if (ap2H > 65) {
          const ap2BedH = ap2H - ap2LivH;
          const ap2BedY = secY + ap2LivH;
          const ap2BedW = ap2W * 0.55;
          const ap2KitW = ap2W - ap2BedW;

          walls.push({ x1: ap2X, y1: ap2BedY, x2: ap2X + ap2W * 0.3, y2: ap2BedY });
          walls.push({ x1: ap2X + ap2W * 0.6, y1: ap2BedY, x2: ap2X + ap2W, y2: ap2BedY });

          // Kitchen & Bathroom
          rooms.push({
            name: 'Кухня',
            x: ap2X,
            y: ap2BedY,
            width: ap2KitW,
            height: ap2BedH,
            color: '#1e293b',
            floorStyle: 'tile'
          });

          // Dividing wall between kitchen and bedroom
          walls.push({ x1: ap2X + ap2KitW, y1: ap2BedY, x2: ap2X + ap2KitW, y2: secY + ap2H });

          furniture.push({
            type: 'kitchen_counter',
            x: ap2X + 2,
            y: ap2BedY + 3,
            width: ap2KitW - 4,
            height: 8,
            angle: 0,
            color: '#475569'
          });

          furniture.push({
            type: 'fridge',
            x: ap2X + 2,
            y: ap2BedY + ap2BedH - 9,
            width: 6,
            height: 6,
            angle: 0,
            color: '#e2e8f0'
          });

          furniture.push({
            type: 'table',
            x: ap2X + 10,
            y: ap2BedY + ap2BedH - 12,
            width: 12,
            height: 8,
            angle: 0,
            color: '#b45309'
          });
          furniture.push({
            type: 'chair',
            x: ap2X + 14,
            y: ap2BedY + ap2BedH - 15,
            width: 4,
            height: 3,
            angle: 0,
            color: '#64748b'
          });

          // Bedroom
          rooms.push({
            name: 'Спальня',
            x: ap2X + ap2KitW,
            y: ap2BedY,
            width: ap2BedW,
            height: ap2BedH,
            color: '#0f172a',
            floorStyle: 'wood'
          });

          furniture.push({
            type: 'bed',
            x: ap2X + ap2KitW + ap2BedW - Math.min(22, ap2BedW - 8) - 4,
            y: ap2BedY + 4,
            width: Math.min(22, ap2BedW - 8),
            height: Math.min(24, ap2BedH - 8),
            angle: 0,
            color: '#3b82f6'
          });

          furniture.push({
            type: 'wardrobe',
            x: ap2X + ap2KitW + 4,
            y: ap2BedY + ap2BedH - 8,
            width: Math.min(18, ap2BedW - 8),
            height: 5,
            angle: 0,
            color: '#b45309'
          });
        }
      }
    }

  } else if (bld.type === 'school_kindergarten') {
    // =========================================================================
    // --- SCHOOL & KINDERGARTEN (MATHEMATICALLY CLAMPED TO BUILDING BOUNDS) ---
    // =========================================================================
    const entSide = rawEntrances[0]?.side || 'south';
    const isSmallKindergarten = W < 110 || H < 75;

    // Outer zones
    const exX = W / 2 - 12;
    const exY = entSide === 'north' ? 6 : H - 14;
    const elX = W / 2 - 20;
    const elY = entSide === 'north' ? H - 22 : 6;
    const stX = W / 2 + 4;
    const stY = entSide === 'north' ? H - 22 : 6;

    elevators.push({ x: elX, y: elY, width: 16, height: 14 });
    stairs.push({ x: stX, y: stY, width: 16, height: 14 });
    exits.push({ x: exX, y: exY, width: 24, height: 8 });

    if (isSmallKindergarten) {
      // Small cozy Kindergarten layout (Раздевалка, Игровая комната, Спальня, Буфет)
      const corrW = Math.min(28, W * 0.28);
      const corrX = (W - corrW) / 2;

      // Central Corridor / Cloakroom (Раздевалка с детскими шкафчиками)
      rooms.push({
        name: 'Раздевалка / Холл',
        x: corrX,
        y: 6,
        width: corrW,
        height: H - 12,
        color: '#334155',
        floorStyle: 'linoleum'
      });

      // Child lockers in hallway
      furniture.push({
        type: 'shelf',
        x: corrX + 2,
        y: 22,
        width: corrW - 4,
        height: 5,
        angle: 0,
        color: '#f59e0b'
      });

      const roomW = corrX - 6;
      const roomH = H - 12;

      // Left: Group Playroom (Игровая комната)
      rooms.push({
        name: 'Игровая комната',
        x: 6,
        y: 6,
        width: roomW,
        height: roomH,
        color: '#1e293b',
        floorStyle: 'playmat'
      });

      // Colorful play mat
      furniture.push({
        type: 'carpet',
        x: 10,
        y: 10,
        width: roomW - 8,
        height: roomH - 20,
        angle: 0,
        color: '#0284c7'
      });

      // Kids tables & chairs
      const tableSpacingX = Math.min(18, (roomW - 14) / 2);
      furniture.push({
        type: 'kids_table',
        x: 12,
        y: 14,
        width: 12,
        height: 10,
        angle: 0,
        color: '#eab308'
      });
      furniture.push({
        type: 'kids_table',
        x: 12 + tableSpacingX,
        y: 14,
        width: 12,
        height: 10,
        angle: 0,
        color: '#22c55e'
      });

      // Toy chest & shelves
      furniture.push({
        type: 'toy_chest',
        x: 10,
        y: roomH - 10,
        width: 14,
        height: 6,
        angle: 0,
        color: '#ef4444'
      });
      furniture.push({
        type: 'blackboard',
        x: 8,
        y: 7,
        width: Math.min(20, roomW - 10),
        height: 3,
        angle: 0,
        color: '#15803d'
      });

      // Right: Nap Bedroom (Спальная комната)
      const rightX = corrX + corrW;
      const rightW = W - 6 - rightX;
      rooms.push({
        name: 'Детская спальня',
        x: rightX,
        y: 6,
        width: rightW,
        height: roomH,
        color: '#0f172a',
        floorStyle: 'wood'
      });

      // Rows of cute small children cots strictly bounded inside the room
      const cotCols = Math.max(1, Math.floor((rightW - 10) / 16));
      const cotRows = Math.max(1, Math.floor((roomH - 20) / 18));
      const cotColors = ['#38bdf8', '#f472b6', '#4ade80', '#fbbf24'];

      for (let c = 0; c < cotCols; c++) {
        for (let r = 0; r < cotRows; r++) {
          furniture.push({
            type: 'kids_bed',
            x: rightX + 6 + c * 16,
            y: 12 + r * 18,
            width: 11,
            height: 14,
            angle: 0,
            color: cotColors[(c + r) % cotColors.length]
          });
        }
      }

      // Walls with doorways into corridor
      walls.push({ x1: corrX, y1: 6, x2: corrX, y2: H / 2 - 8 });
      walls.push({ x1: corrX, y1: H / 2 + 8, x2: corrX, y2: H - 6 });

      walls.push({ x1: rightX, y1: 6, x2: rightX, y2: H / 2 - 8 });
      walls.push({ x1: rightX, y1: H / 2 + 8, x2: rightX, y2: H - 6 });

    } else {
      // Larger School Building
      const corrH = 20;
      const corrY = H / 2 - corrH / 2;

      rooms.push({
        name: 'Школьный коридор',
        x: 6,
        y: corrY,
        width: W - 12,
        height: corrH,
        color: '#334155',
        floorStyle: 'tile'
      });

      const classW = (W - 24) / 2;
      const topH = corrY - 6;
      const botH = H - 6 - (corrY + corrH);

      // Classroom 1 (Top Left)
      rooms.push({
        name: 'Класс математики',
        x: 6,
        y: 6,
        width: classW,
        height: topH,
        color: '#1e293b',
        floorStyle: 'parquet'
      });
      // Classroom 2 (Top Right)
      rooms.push({
        name: 'Класс физики',
        x: 18 + classW,
        y: 6,
        width: classW,
        height: topH,
        color: '#1e293b',
        floorStyle: 'parquet'
      });

      // Classroom 3 (Bottom Left)
      rooms.push({
        name: 'Класс литературы',
        x: 6,
        y: corrY + corrH,
        width: classW,
        height: botH,
        color: '#1e293b',
        floorStyle: 'parquet'
      });
      // Teachers room / Library (Bottom Right)
      rooms.push({
        name: 'Учительская / Библиотека',
        x: 18 + classW,
        y: corrY + corrH,
        width: classW,
        height: botH,
        color: '#0f172a',
        floorStyle: 'wood'
      });

      // Chalkboards
      furniture.push({ type: 'blackboard', x: 12, y: 7, width: 28, height: 3, angle: 0, color: '#15803d' });
      furniture.push({ type: 'blackboard', x: 24 + classW, y: 7, width: 28, height: 3, angle: 0, color: '#15803d' });

      // Student Desks properly spaced
      const deskCols = Math.min(3, Math.floor((classW - 16) / 16));
      const deskRows = Math.min(3, Math.floor((topH - 18) / 14));

      for (let dc = 0; dc < deskCols; dc++) {
        for (let dr = 0; dr < deskRows; dr++) {
          furniture.push({
            type: 'desk',
            x: 12 + dc * 16,
            y: 14 + dr * 14,
            width: 10,
            height: 6,
            angle: 0,
            color: '#a16207'
          });
          furniture.push({
            type: 'desk',
            x: 24 + classW + dc * 16,
            y: 14 + dr * 14,
            width: 10,
            height: 6,
            angle: 0,
            color: '#a16207'
          });
        }
      }

      // Corridor walls with doorways
      walls.push({ x1: 6, y1: corrY, x2: classW * 0.4, y2: corrY });
      walls.push({ x1: classW * 0.6, y1: corrY, x2: 18 + classW * 1.4, y2: corrY });
      walls.push({ x1: 18 + classW * 1.6, y1: corrY, x2: W - 6, y2: corrY });

      walls.push({ x1: 6, y1: corrY + corrH, x2: classW * 0.4, y2: corrY + corrH });
      walls.push({ x1: classW * 0.6, y1: corrY + corrH, x2: 18 + classW * 1.4, y2: corrY + corrH });
      walls.push({ x1: 18 + classW * 1.6, y1: corrY + corrH, x2: W - 6, y2: corrY + corrH });
    }

  } else if (isOffice) {
    // =========================================================================
    // --- OFFICE & BUSINESS CENTER ---
    // =========================================================================
    const exX = W / 2 - 12;
    const exY = H - 12;
    const elX = W / 2 - 18;
    const elY = 6;
    const stX = W / 2 + 4;
    const stY = 6;

    elevators.push({ x: elX, y: elY, width: 16, height: 14 });
    stairs.push({ x: stX, y: stY, width: 16, height: 14 });
    exits.push({ x: exX, y: exY, width: 24, height: 8 });

    if (floor === 0) {
      rooms.push({ name: 'Главный Вестибюль', x: 6, y: 6, width: W - 12, height: H - 12, color: '#334155', floorStyle: 'tile' });
      furniture.push({ type: 'desk_reception', x: W / 2 - 24, y: H / 2 - 6, width: 48, height: 10, angle: 0, color: '#f59e0b' });
      furniture.push({ type: 'computer', x: W / 2 - 12, y: H / 2 - 4, width: 6, height: 4, angle: 0, color: '#1e293b' });
      furniture.push({ type: 'computer', x: W / 2 + 6, y: H / 2 - 4, width: 6, height: 4, angle: 0, color: '#1e293b' });
      furniture.push({ type: 'sofa', x: 12, y: H - 24, width: 32, height: 10, angle: 0, color: '#64748b' });
      furniture.push({ type: 'sofa', x: W - 44, y: H - 24, width: 32, height: 10, angle: 0, color: '#64748b' });
      furniture.push({ type: 'cooler', x: W - 20, y: 14, width: 8, height: 8, angle: 0, color: '#0284c7' });
      furniture.push({ type: 'plant', x: 10, y: H - 36, width: 10, height: 10, angle: 0, color: '#15803d' });
    } else {
      const hallwayY = H / 2 - 10;
      rooms.push({ name: 'Коридор', x: 6, y: hallwayY, width: W - 12, height: 20, color: '#475569', floorStyle: 'tile' });
      
      const offW = W / 2 - 26;
      const offH = hallwayY - 6;
      rooms.push({ name: `Офис ${floor * 10 + 1}`, x: 6, y: 6, width: offW, height: offH, color: '#1e293b', floorStyle: 'wood' });
      rooms.push({ name: `Офис ${floor * 10 + 2}`, x: W / 2 + 20, y: 6, width: offW, height: offH, color: '#1e293b', floorStyle: 'wood' });

      furniture.push({ type: 'desk', x: 12, y: 12, width: 16, height: 10, angle: 0, color: '#a16207' });
      furniture.push({ type: 'computer', x: 17, y: 13, width: 6, height: 4, angle: 0, color: '#000000' });
      furniture.push({ type: 'chair', x: 18, y: 8, width: 4, height: 4, angle: 0, color: '#1e293b' });

      furniture.push({ type: 'desk', x: W - 28, y: 12, width: 16, height: 10, angle: 0, color: '#a16207' });
      furniture.push({ type: 'computer', x: W - 23, y: 13, width: 6, height: 4, angle: 0, color: '#000000' });
      furniture.push({ type: 'chair', x: W - 22, y: 8, width: 4, height: 4, angle: 0, color: '#1e293b' });
    }

  } else if (isShop) {
    // =========================================================================
    // --- SHOPS, COMMERCIAL STRIPS & GRAND SHOPPING MALLS ---
    // =========================================================================
    if (bld.type === 'shopping_mall' || (bld.type === 'commercial' && W >= 280)) {
      // --- GRAND SHOPPING MALL (ТРЦ) MULTI-ZONE LAYOUT ---
      const atriumY = Math.floor(H / 2 - 12);
      const atriumH = 24;

      // Exits matching the actual building entrances
      for (const ent of rawEntrances) {
        const entSide = ent.side || 'south';
        const offsetRatio = ent.offsetRatio || 0.5;
        const entX = Math.floor(W * offsetRatio - 12);
        if (entSide === 'south') {
          exits.push({ x: entX, y: H - 12, width: 24, height: 8 });
        } else if (entSide === 'north') {
          exits.push({ x: entX, y: 4, width: 24, height: 8 });
        } else if (entSide === 'west') {
          exits.push({ x: 4, y: Math.floor(H * offsetRatio - 12), width: 8, height: 24 });
        } else if (entSide === 'east') {
          exits.push({ x: W - 12, y: Math.floor(H * offsetRatio - 12), width: 8, height: 24 });
        }
      }

      // Add elevator and stairs in the central atrium
      elevators.push({ x: Math.floor(W * 0.45), y: atriumY + 5, width: 14, height: 10 });
      stairs.push({ x: Math.floor(W * 0.55), y: atriumY + 5, width: 14, height: 10 });

      // Central Atrium (Main Corridor)
      rooms.push({
        name: floor === 0 ? 'Главный Атриум ТРЦ' : 'Галерея 2-го этажа',
        x: 6,
        y: atriumY,
        width: W - 12,
        height: atriumH,
        color: '#1e293b',
        floorStyle: 'tile'
      });

      // Atrium Benches, Trash cans & Plants
      const numAtriumProps = Math.floor(W / 120);
      for (let i = 0; i < numAtriumProps; i++) {
        const px = 40 + i * 110;
        if (Math.abs(px - W * 0.5) > 40) { // Keep elevator/stairs area clear
          furniture.push({ type: 'bench', x: px, y: atriumY + 14, width: 14, height: 6, angle: 0, color: '#475569' });
          furniture.push({ type: 'plant', x: px + 22, y: atriumY + 14, width: 6, height: 6, angle: 0, color: '#10b981' });
          furniture.push({ type: 'trash_can', x: px - 10, y: atriumY + 14, width: 4, height: 4, angle: 0, color: '#334155' });
        }
      }

      // Food court dining area in the right side of the Atrium
      const foodCourtX = Math.floor(W * 0.72);
      rooms.push({
        name: 'Фуд-корт',
        x: foodCourtX,
        y: atriumY,
        width: W - 6 - foodCourtX,
        height: atriumH,
        color: '#0f172a',
        floorStyle: 'tile'
      });
      // Food court furniture
      for (let f = 0; f < 3; f++) {
        const fx = foodCourtX + 12 + f * 24;
        furniture.push({ type: 'table', x: fx, y: atriumY + 10, width: 8, height: 8, angle: 0, color: '#d97706' });
        furniture.push({ type: 'chair', x: fx - 6, y: atriumY + 12, width: 4, height: 4, angle: 0, color: '#334155' });
        furniture.push({ type: 'chair', x: fx + 10, y: atriumY + 12, width: 4, height: 4, angle: 0, color: '#334155' });
      }

      // NORTH SIDE SHOPS (divided horizontally)
      const shopW = Math.floor((W - 12) / 4);
      
      // Shop 1: Supermarket "Пятёрочка" (North-West)
      rooms.push({
        name: 'Супермаркет "Пятёрочка"',
        x: 6,
        y: 6,
        width: shopW - 4,
        height: atriumY - 6,
        color: '#14532d',
        floorStyle: 'tile'
      });
      // Entrance from atrium to Supermarket
      const ctr1 = Math.floor(6 + shopW / 2);
      walls.push(
        { x1: 6, y1: atriumY, x2: ctr1 - 12, y2: atriumY },
        { x1: ctr1 + 12, y1: atriumY, x2: shopW - 2, y2: atriumY }
      );
      // Partition wall between Shop 1 and Shop 2
      walls.push({ x1: shopW - 2, y1: 6, x2: shopW - 2, y2: atriumY });
      // Supermarket items
      for (let r = 0; r < 2; r++) {
        furniture.push({ type: 'shelf', x: 18 + r * 20, y: 12, width: 6, height: atriumY - 24, angle: 0, color: '#22c55e' });
      }
      furniture.push({ type: 'counter', x: shopW - 22, y: atriumY - 14, width: 14, height: 6, angle: 0, color: '#ef4444' });
      furniture.push({ type: 'computer', x: shopW - 18, y: atriumY - 13, width: 4, height: 3, angle: 0, color: '#000000' });
      furniture.push({ type: 'vending_machine', x: 12, y: atriumY - 14, width: 8, height: 6, angle: 0, color: '#eab308' });

      // Shop 2: Pharmacy "36.6" (North-Center-West)
      rooms.push({
        name: 'Аптека "36.6"',
        x: shopW + 2,
        y: 6,
        width: shopW - 4,
        height: atriumY - 6,
        color: '#064e3b',
        floorStyle: 'tile'
      });
      // Entrance to Pharmacy
      const ctr2 = Math.floor((shopW + 2 + shopW * 2 - 2) / 2);
      walls.push(
        { x1: shopW + 2, y1: atriumY, x2: ctr2 - 12, y2: atriumY },
        { x1: ctr2 + 12, y1: atriumY, x2: shopW * 2 - 2, y2: atriumY }
      );
      // Partition wall between Shop 2 and Shop 3
      walls.push({ x1: shopW * 2 - 2, y1: 6, x2: shopW * 2 - 2, y2: atriumY });
      // Pharmacy items
      furniture.push({ type: 'shelf', x: shopW + 12, y: 12, width: shopW - 24, height: 6, angle: 0, color: '#10b981' });
      furniture.push({ type: 'counter', x: shopW + 12, y: atriumY - 14, width: 20, height: 6, angle: 0, color: '#34d399' });
      furniture.push({ type: 'computer', x: shopW + 20, y: atriumY - 13, width: 4, height: 3, angle: 0, color: '#000000' });
      furniture.push({ type: 'chair', x: shopW * 2 - 14, y: atriumY - 12, width: 5, height: 5, angle: 0, color: '#047857' });

      // Shop 3: Clothes & Boutique (North-Center-East)
      rooms.push({
        name: 'Салон Электроники & Одежды',
        x: shopW * 2 + 2,
        y: 6,
        width: shopW - 4,
        height: atriumY - 6,
        color: '#1e1b4b',
        floorStyle: 'carpet'
      });
      // Entrance to Boutique
      const ctr3 = Math.floor((shopW * 2 + 2 + shopW * 3 - 2) / 2);
      walls.push(
        { x1: shopW * 2 + 2, y1: atriumY, x2: ctr3 - 12, y2: atriumY },
        { x1: ctr3 + 12, y1: atriumY, x2: shopW * 3 - 2, y2: atriumY }
      );
      // Partition wall between Shop 3 and Shop 4 (Food court prep)
      walls.push({ x1: shopW * 3 - 2, y1: 6, x2: shopW * 3 - 2, y2: atriumY });
      // Boutique items
      furniture.push({ type: 'sofa', x: shopW * 2 + 10, y: 14, width: 14, height: 6, angle: 0, color: '#a78bfa' });
      furniture.push({ type: 'table', x: shopW * 2 + Math.floor(shopW / 2) - 10, y: atriumY - 16, width: 16, height: 6, angle: 0, color: '#f59e0b' });
      furniture.push({ type: 'plant', x: shopW * 3 - 12, y: 12, width: 6, height: 6, angle: 0, color: '#10b981' });

      // Shop 4: Fast Food / Burger Kitchen (North-East)
      rooms.push({
        name: 'Бургерная & Кофе',
        x: shopW * 3 + 2,
        y: 6,
        width: W - 6 - (shopW * 3 + 2),
        height: atriumY - 6,
        color: '#451a03',
        floorStyle: 'tile'
      });
      // Entrance to Fast Food
      const ctr4 = Math.floor((shopW * 3 + 2 + W - 6) / 2);
      walls.push(
        { x1: shopW * 3 + 2, y1: atriumY, x2: ctr4 - 12, y2: atriumY },
        { x1: ctr4 + 12, y1: atriumY, x2: W - 6, y2: atriumY }
      );
      // Kitchen counters and equipment
      furniture.push({ type: 'kitchen_counter', x: shopW * 3 + 12, y: 12, width: 40, height: 6, angle: 0, color: '#78350f' });
      furniture.push({ type: 'fridge', x: W - 18, y: 12, width: 8, height: 8, angle: 0, color: '#94a3b8' });
      furniture.push({ type: 'counter', x: shopW * 3 + 12, y: atriumY - 14, width: 24, height: 6, angle: 0, color: '#ea580c' });
      furniture.push({ type: 'computer', x: shopW * 3 + 18, y: atriumY - 13, width: 4, height: 3, angle: 0, color: '#000000' });


      // SOUTH SIDE SHOPS (divided horizontally)
      const southShopY = atriumY + atriumH;
      const southShopH = H - 6 - southShopY;

      // Shop 5: Cafe & Bistro (South-West)
      rooms.push({
        name: 'Кофейня "Bean & Bistro"',
        x: 6,
        y: southShopY,
        width: shopW - 4,
        height: southShopH,
        color: '#2d1a12',
        floorStyle: 'wood'
      });
      // Entrance to Cafe
      const ctr5 = Math.floor(6 + shopW / 2);
      walls.push(
        { x1: 6, y1: southShopY, x2: ctr5 - 12, y2: southShopY },
        { x1: ctr5 + 12, y1: southShopY, x2: shopW - 2, y2: southShopY }
      );
      // Partition wall between Shop 5 and Shop 6
      walls.push({ x1: shopW - 2, y1: southShopY, x2: shopW - 2, y2: H - 6 });
      // Cafe items
      furniture.push({ type: 'kitchen_counter', x: 12, y: H - 14, width: 24, height: 6, angle: 0, color: '#1e1b4b' });
      furniture.push({ type: 'table', x: shopW - 24, y: southShopY + 10, width: 8, height: 8, angle: 0, color: '#b45309' });
      furniture.push({ type: 'chair', x: shopW - 30, y: southShopY + 12, width: 4, height: 4, angle: 0, color: '#d97706' });
      furniture.push({ type: 'chair', x: shopW - 14, y: southShopY + 12, width: 4, height: 4, angle: 0, color: '#d97706' });

      // Shop 6: Weapons & Hunt Gear "Охотник" (South-Center-West)
      rooms.push({
        name: 'Магазин "Охотник"',
        x: shopW + 2,
        y: southShopY,
        width: shopW - 4,
        height: southShopH,
        color: '#14532d',
        floorStyle: 'wood'
      });
      // Entrance to Hunters Shop
      const ctr6 = Math.floor((shopW + 2 + shopW * 2 - 2) / 2);
      walls.push(
        { x1: shopW + 2, y1: southShopY, x2: ctr6 - 12, y2: southShopY },
        { x1: ctr6 + 12, y1: southShopY, x2: shopW * 2 - 2, y2: southShopY }
      );
      // Partition wall between Shop 6 and Shop 7
      walls.push({ x1: shopW * 2 - 2, y1: southShopY, x2: shopW * 2 - 2, y2: H - 6 });
      // Hunters items
      furniture.push({ type: 'shelf', x: shopW + 12, y: H - 14, width: shopW - 24, height: 6, angle: 0, color: '#065f46' });
      furniture.push({ type: 'counter', x: shopW + 12, y: southShopY + 10, width: 20, height: 6, angle: 0, color: '#047857' });
      furniture.push({ type: 'computer', x: shopW + 18, y: southShopY + 11, width: 4, height: 3, angle: 0, color: '#000000' });
      furniture.push({ type: 'plant', x: shopW * 2 - 12, y: H - 14, width: 6, height: 6, angle: 0, color: '#10b981' });

      // Shop 7: Electronics / Appliances (South-Center-East)
      rooms.push({
        name: 'Техника & Электроника',
        x: shopW * 2 + 2,
        y: southShopY,
        width: shopW - 4,
        height: southShopH,
        color: '#0f172a',
        floorStyle: 'tile'
      });
      // Entrance to Electronics
      const ctr7 = Math.floor((shopW * 2 + 2 + shopW * 3 - 2) / 2);
      walls.push(
        { x1: shopW * 2 + 2, y1: southShopY, x2: ctr7 - 12, y2: southShopY },
        { x1: ctr7 + 12, y1: southShopY, x2: shopW * 3 - 2, y2: southShopY }
      );
      // Partition wall between Shop 7 and South Atrium Area
      walls.push({ x1: shopW * 3 - 2, y1: southShopY, x2: shopW * 3 - 2, y2: H - 6 });
      // Electronics items
      for (let r = 0; r < 2; r++) {
        furniture.push({ type: 'shelf', x: shopW * 2 + 14 + r * 18, y: southShopY + 10, width: 6, height: southShopH - 20, angle: 0, color: '#334155' });
      }
      furniture.push({ type: 'counter', x: shopW * 3 - 22, y: H - 14, width: 14, height: 6, angle: 0, color: '#38bdf8' });

      // Area 8: Administrative Offices / Storage (South-East)
      rooms.push({
        name: 'Администрация / Склад',
        x: shopW * 3 + 2,
        y: southShopY,
        width: W - 6 - (shopW * 3 + 2),
        height: southShopH,
        color: '#1e293b',
        floorStyle: 'linoleum'
      });
      // Entrance to Administration
      const ctr8 = Math.floor((shopW * 3 + 2 + W - 6) / 2);
      walls.push(
        { x1: shopW * 3 + 2, y1: southShopY, x2: ctr8 - 12, y2: southShopY },
        { x1: ctr8 + 12, y1: southShopY, x2: W - 6, y2: southShopY }
      );
      furniture.push({ type: 'desk', x: shopW * 3 + 12, y: H - 14, width: 14, height: 6, angle: 0, color: '#64748b' });
      furniture.push({ type: 'computer', x: shopW * 3 + 16, y: H - 13, width: 4, height: 3, angle: 0, color: '#000000' });
      furniture.push({ type: 'chair', x: shopW * 3 + 17, y: H - 8, width: 4, height: 4, angle: 0, color: '#0284c7' });
      furniture.push({ type: 'wardrobe', x: W - 18, y: southShopY + 10, width: 10, height: 6, angle: 0, color: '#475569' });

      // Main Outer boundary walls for Mall (except openings)
      walls.push(
        { x1: 6, y1: 6, x2: W - 6, y2: 6 }, // North boundary
        { x1: 6, y1: 6, x2: 6, y2: H - 6 }, // West boundary
        { x1: W - 6, y1: 6, x2: W - 6, y2: H - 6 } // East boundary
      );
      // South boundary wall with entrance doors
      const entS1X = Math.floor(W * 0.3);
      const entS2X = Math.floor(W * 0.7);
      walls.push(
        { x1: 6, y1: H - 6, x2: entS1X - 12, y2: H - 6 },
        { x1: entS1X + 12, y1: H - 6, x2: entS2X - 12, y2: H - 6 },
        { x1: entS2X + 12, y1: H - 6, x2: W - 6, y2: H - 6 }
      );

    } else {
      // --- PARTITIONED SHOP / BOUTIQUE LAYOUT (For standalone shops & small commercial buildings) ---
      const exX = W / 2 - 12;
      const exY = H - 12;
      elevators.push({ x: W / 2 - 16, y: 6, width: 16, height: 14 });
      stairs.push({ x: W / 2 + 4, y: 6, width: 16, height: 14 });
      exits.push({ x: exX, y: exY, width: 24, height: 8 });

      const splitX = Math.floor(W * 0.68);

      // 1. MAIN SHOPPING FLOOR (Торговый Зал)
      rooms.push({
        name: floor === 0 ? 'Торговый Зал' : 'Выставочный Зал',
        x: 6,
        y: 6,
        width: splitX - 8,
        height: H - 12,
        color: '#1e293b',
        floorStyle: 'tile'
      });

      // 2. BACKROOM / STOCKROOM (Склад / Подсобка)
      rooms.push({
        name: 'Склад / Подсобка',
        x: splitX + 2,
        y: 6,
        width: W - 6 - (splitX + 2),
        height: H - 12,
        color: '#0f172a',
        floorStyle: 'linoleum'
      });

      // Separation Wall with a doorway/archway in the center
      walls.push(
        { x1: splitX, y1: 6, x2: splitX, y2: Math.floor(H / 2 - 10) },
        { x1: splitX, y1: Math.floor(H / 2 + 10), x2: splitX, y2: H - 6 }
      );

      // Furniture in the main Shopping Hall
      const numShelfRows = W > H ? 3 : 2;
      const shelfSpacing = (splitX - 32) / numShelfRows;
      for (let r = 0; r < numShelfRows; r++) {
        const sx = 16 + r * shelfSpacing;
        furniture.push({ type: 'shelf', x: sx, y: 16, width: 8, height: H - 40, angle: 0, color: '#3f3f46' });
      }

      // Checkout counter
      furniture.push({ type: 'counter', x: 12, y: H - 22, width: 24, height: 10, angle: 0, color: '#4b5563' });
      furniture.push({ type: 'computer', x: 18, y: H - 20, width: 6, height: 4, angle: 0, color: '#000000' });
      furniture.push({ type: 'vending_machine', x: splitX - 22, y: H - 24, width: 12, height: 10, angle: 0, color: '#0284c7' });
      furniture.push({ type: 'plant', x: 12, y: 12, width: 6, height: 6, angle: 0, color: '#10b981' });

      // Furniture in the back stockroom
      furniture.push({ type: 'shelf', x: splitX + 10, y: 12, width: W - splitX - 22, height: 8, angle: 0, color: '#1e293b' });
      furniture.push({ type: 'wardrobe', x: W - 20, y: H - 24, width: 12, height: 10, angle: 0, color: '#57534e' });
      furniture.push({ type: 'cooler', x: splitX + 10, y: H - 24, width: 8, height: 8, angle: 0, color: '#06b6d4' });
    }

  } else if (bld.type === 'hospital') {
    // =========================================================================
    // --- HOSPITAL ---
    // =========================================================================
    const exX = W / 2 - 12;
    const exY = H - 12;
    elevators.push({ x: W / 2 - 18, y: 6, width: 16, height: 14 });
    stairs.push({ x: W / 2 + 4, y: 6, width: 16, height: 14 });
    exits.push({ x: exX, y: exY, width: 24, height: 8 });

    if (floor === 0) {
      rooms.push({ name: 'Регистратура и Лобби', x: 6, y: 6, width: W - 12, height: H - 12, color: '#0f172a', floorStyle: 'tile' });
      furniture.push({ type: 'desk_reception', x: W / 2 - 20, y: H / 2 - 6, width: 40, height: 10, angle: 0, color: '#10b981' });
      for (let i = 0; i < 4; i++) {
        furniture.push({ type: 'chair', x: 12 + i * 8, y: H - 20, width: 6, height: 6, angle: 0, color: '#3b82f6' });
        furniture.push({ type: 'chair', x: W - 40 + i * 8, y: H - 20, width: 6, height: 6, angle: 0, color: '#3b82f6' });
      }
    } else {
      rooms.push({ name: 'Коридор', x: 6, y: H / 2 - 8, width: W - 12, height: 16, color: '#1e293b', floorStyle: 'tile' });
      const wWidth = W / 2 - 26;
      const wHeight = H / 2 - 14;
      rooms.push({ name: `Палата ${floor * 100 + 1}`, x: 6, y: 6, width: wWidth, height: wHeight, color: '#042f2e', floorStyle: 'tile' });
      furniture.push({ type: 'bed_hospital', x: 12, y: 12, width: 14, height: 22, angle: 0, color: '#f8fafc' });
      rooms.push({ name: `Палата ${floor * 100 + 2}`, x: W / 2 + 20, y: 6, width: wWidth, height: wHeight, color: '#042f2e', floorStyle: 'tile' });
      furniture.push({ type: 'bed_hospital', x: W - 26, y: 12, width: 14, height: 22, angle: 0, color: '#f8fafc' });
    }

  } else if (bld.type === 'police_station') {
    // =========================================================================
    // --- POLICE STATION ---
    // =========================================================================
    const exX = W / 2 - 12;
    const exY = H - 12;
    elevators.push({ x: W / 2 - 16, y: 6, width: 16, height: 14 });
    stairs.push({ x: W / 2 + 4, y: 6, width: 16, height: 14 });
    exits.push({ x: exX, y: exY, width: 24, height: 8 });

    rooms.push({ name: 'Дежурная часть / Офисы', x: 6, y: 6, width: W - 12, height: H - 12, color: '#1e293b', floorStyle: 'tile' });
    const cellW = 35;
    const cellH = H - 40;
    rooms.push({ name: 'Камера Временного Содержания', x: W - cellW - 6, y: 6, width: cellW, height: cellH, color: '#0f172a', floorStyle: 'tile' });
    walls.push({ x1: W - cellW - 6, y1: 18, x2: W - 6, y2: 18, isJailBars: true });
    walls.push({ x1: W - cellW - 6, y1: 6, x2: W - cellW - 6, y2: cellH + 6 });
    furniture.push({ type: 'jail_cot', x: W - cellW + 2, y: 8, width: 10, height: 20, angle: 0, color: '#78350f' });
    furniture.push({ type: 'toilet', x: W - 14, y: cellH - 4, width: 6, height: 6, angle: 0, color: '#ffffff' });
    furniture.push({ type: 'desk_reception', x: 12, y: H / 2 - 5, width: 32, height: 10, angle: 0, color: '#1d4ed8' });

  } else if (bld.type === 'fire_station') {
    const exX = W / 2 - 12;
    const exY = H - 12;
    elevators.push({ x: W / 2 - 16, y: 6, width: 16, height: 14 });
    stairs.push({ x: W / 2 + 4, y: 6, width: 16, height: 14 });
    exits.push({ x: exX, y: exY, width: 24, height: 8 });

    rooms.push({ name: 'Пожарное Депо', x: 6, y: 6, width: W - 12, height: H - 12, color: '#18181b', floorStyle: 'tile' });
    furniture.push({ type: 'fire_rack', x: 12, y: 16, width: 14, height: 8, angle: 0, color: '#ef4444' });
    furniture.push({ type: 'fire_rack', x: W - 26, y: 16, width: 14, height: 8, angle: 0, color: '#ef4444' });

  } else if (bld.type === 'transit_hub') {
    const exX = W / 2 - 12;
    const exY = H - 12;
    elevators.push({ x: W / 2 - 16, y: 6, width: 16, height: 14 });
    stairs.push({ x: W / 2 + 4, y: 6, width: 16, height: 14 });
    exits.push({ x: exX, y: exY, width: 24, height: 8 });

    rooms.push({ name: 'Зал Ожидания', x: 6, y: 6, width: W - 12, height: H - 12, color: '#1e293b', floorStyle: 'tile' });
    furniture.push({ type: 'desk_reception', x: W / 2 - 30, y: 12, width: 60, height: 10, angle: 0, color: '#0369a1' });
    for (let i = 0; i < 6; i++) {
      furniture.push({ type: 'chair', x: W / 2 - 24 + i * 8, y: H / 2, width: 6, height: 6, angle: Math.PI, color: '#e2e8f0' });
      furniture.push({ type: 'chair', x: W / 2 - 24 + i * 8, y: H / 2 + 8, width: 6, height: 6, angle: 0, color: '#e2e8f0' });
    }

  } else {
    // Default fallback interior layout
    const exX = W / 2 - 12;
    const exY = H - 12;
    elevators.push({ x: W / 2 - 16, y: 6, width: 16, height: 14 });
    stairs.push({ x: W / 2 + 4, y: 6, width: 16, height: 14 });
    exits.push({ x: exX, y: exY, width: 24, height: 8 });

    rooms.push({ name: 'Помещение', x: 6, y: 6, width: W - 12, height: H - 12, color: '#1e293b', floorStyle: 'wood' });
    furniture.push({ type: 'table', x: W / 2 - 10, y: H / 2 - 8, width: 20, height: 16, angle: 0, color: '#a16207' });
    furniture.push({ type: 'chair', x: W / 2 - 8, y: H / 2 - 14, width: 4, height: 4, angle: 0, color: '#451a03' });
  }

  // Outer perimeter structural walls
  walls.push({ x1: 6, y1: 6, x2: W - 6, y2: 6 });
  walls.push({ x1: W - 6, y1: 6, x2: W - 6, y2: H - 6 });
  walls.push({ x1: W - 6, y1: H - 6, x2: 6, y2: H - 6 });
  walls.push({ x1: 6, y1: H - 6, x2: 6, y2: 6 });

  const primaryElevator = elevators[0] || { x: W / 2 - 14, y: 6, width: 20, height: 16 };
  const primaryStairs = stairs[0] || { x: W / 2 + 14, y: 6, width: 20, height: 16 };
  const primaryExit = exits[0] || { x: W / 2 - 12, y: H - 8, width: 24, height: 8 };

  return {
    buildingId: bld.id,
    floor,
    width: W,
    height: H,
    rooms,
    walls,
    furniture,
    elevatorZone: primaryElevator,
    stairsZone: primaryStairs,
    exitZone: primaryExit,
    elevators,
    stairs,
    exits
  };
}

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

  // Draw Furniture with detailed top-down vector visuals
  for (const f of layout.furniture) {
    ctx.save();
    ctx.translate(f.x + f.width / 2, f.y + f.height / 2);
    ctx.rotate(f.angle);
    const halfW = f.width / 2;
    const halfH = f.height / 2;

    if (f.type !== 'carpet' && f.type !== 'blackboard') {
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
    }

    switch (f.type) {
      case 'bed':
        ctx.fillStyle = '#451a03';
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW + 1, -halfH + 1, f.width - 2, f.height - 2);
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#f1f5f9'; // Dual pillows
        ctx.fillRect(-halfW + 2, -halfH + 2, Math.max(4, f.width * 0.35), 4.5);
        ctx.fillRect(halfW - Math.max(4, f.width * 0.35) - 2, -halfH + 2, Math.max(4, f.width * 0.35), 4.5);
        // Folded Duvet cover
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-halfW + 1, halfH - Math.max(6, f.height * 0.45), f.width - 2, Math.max(5, f.height * 0.45 - 1));
        break;

      case 'kids_bed':
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW + 1, -halfH + 1, f.width - 2, f.height - 2);
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-halfW + 2, -halfH + 1.5, f.width - 4, 3);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-halfW + 1, halfH - 6, f.width - 2, 5.5);
        break;

      case 'sofa':
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-halfW + 2, -halfH + 2, f.width / 2 - 2, f.height - 2);
        ctx.strokeRect(0, -halfH + 2, f.width / 2 - 2, f.height - 2);
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(-halfW, -halfH, 3, f.height);
        ctx.fillRect(halfW - 3, -halfH, 3, f.height);
        ctx.fillRect(-halfW, -halfH, f.width, 3);
        break;

      case 'bench':
        // Modern slatted wood/metal public bench
        ctx.fillStyle = '#1e293b'; // Metal supports
        ctx.fillRect(-halfW, -halfH, 2, f.height);
        ctx.fillRect(halfW - 2, -halfH, 2, f.height);
        ctx.fillStyle = f.color || '#d97706'; // Wooden slats
        for (let i = -halfH + 1; i < halfH; i += 2) {
          ctx.fillRect(-halfW + 1, i, f.width - 2, 1);
        }
        break;

      case 'trash_can':
        // Circular metallic/plastic waste bin
        ctx.fillStyle = f.color || '#475569';
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(halfW, halfH), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a'; // Inner dark opening
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(halfW, halfH) * 0.7, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'tv_cabinet':
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-halfW, -halfH, f.width, f.height);
        break;

      case 'tv':
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.shadowColor = 'transparent';
        if (timeHour >= 18 || timeHour < 6) {
          ctx.fillStyle = '#06b6d4'; // Night screen glow
          ctx.fillRect(-halfW + 1, halfH - 1, f.width - 2, 1);
        }
        break;

      case 'kitchen_counter':
        ctx.fillStyle = '#334155';
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#475569';
        ctx.strokeRect(-halfW, -halfH, f.width, f.height);
        // Sink basin
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-halfW + 2, -halfH + 1.5, Math.min(8, f.width * 0.3), f.height - 3);
        // Stove burner rings
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(halfW - 4, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'fridge':
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-halfW, -halfH, f.width, f.height);
        ctx.fillStyle = '#64748b'; // Door handle
        ctx.fillRect(halfW - 1.5, -halfH + 1, 1, f.height - 2);
        break;

      case 'wardrobe':
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-halfW, -halfH, f.width, f.height);
        ctx.beginPath();
        ctx.moveTo(0, -halfH);
        ctx.lineTo(0, halfH);
        ctx.stroke();
        break;

      case 'table':
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-halfW, -halfH, f.width, f.height);
        break;

      case 'kids_table':
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, halfW, halfH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        break;

      case 'chair':
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        break;

      case 'plant':
        ctx.fillStyle = '#7c2d12';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = f.color;
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI * 2) / 4;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * 2, Math.sin(a) * 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'carpet':
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 0.6;
        for (let i = -halfW + 3; i < halfW; i += 3.5) {
          ctx.beginPath(); ctx.moveTo(i, -halfH); ctx.lineTo(i, halfH); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-halfW + 0.8, -halfH + 0.8, f.width - 1.6, f.height - 1.6);
        break;

      case 'desk':
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-halfW, -halfH, f.width, f.height);
        break;

      case 'computer':
        ctx.fillStyle = '#475569';
        ctx.fillRect(-3, 1, 6, 2);
        ctx.fillStyle = '#090d16';
        ctx.fillRect(-halfW, -halfH, f.width, 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-halfW + 0.8, -halfH + 0.4, f.width - 1.6, 1.2);
        break;

      case 'cooler':
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(0, -1, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(-halfW, 0, f.width, halfH);
        break;

      case 'toilet':
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(-halfW, -halfH, f.width, 2.5);
        ctx.beginPath();
        ctx.ellipse(0, 1, 2.5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'bath':
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-halfW + 1.5, -halfH + 1.5, f.width - 3, f.height - 3);
        break;

      case 'bed_hospital':
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-halfW + 1, -halfH + 1, f.width - 2, f.height - 2);
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(-halfW + 1, halfH - 10, f.width - 2, 9);
        break;

      case 'desk_reception':
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.strokeStyle = '#451a03';
        ctx.strokeRect(-halfW, -halfH, f.width, f.height);
        break;

      case 'bookshelf':
      case 'shelf':
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-halfW, -halfH, f.width, f.height);
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(-halfW + 1, -halfH + 1.5, f.width - 2, 1.5);
        ctx.fillStyle = '#f87171';
        ctx.fillRect(-halfW + 1, halfH - 3, f.width - 2, 1.5);
        break;

      case 'toy_chest':
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1;
        ctx.strokeRect(-halfW + 1, -halfH + 1, f.width - 2, f.height - 2);
        break;

      case 'blackboard':
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-halfW, -halfH, f.width, f.height);
        break;

      default:
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        break;
    }

    ctx.restore();
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
