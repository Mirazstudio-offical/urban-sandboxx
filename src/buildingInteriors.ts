import { Building, Player } from './types';
import { sound } from './audio';
import {
  generateHorizontalApartmentInterior,
  generateVerticalApartmentInterior
} from './interiorGenerators';
import {
  buildOfficeInterior,
  buildSupermarketInterior,
  buildHospitalInterior,
  buildPoliceStationInterior,
  buildSchoolInterior,
  buildIndustrialInterior,
  buildPharmacyInterior,
  buildCafeInterior,
  buildAutoServiceInterior,
  buildGearShopInterior,
  buildPizzeriaInterior,
  buildFastFoodInterior,
  buildElectronicsInterior,
  buildSportsStoreInterior,
  buildCarWashInterior,
  buildGalleryInterior
} from './interiorSpecialized';

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
  const W = bld.width;
  const H = bld.height;

  const rooms: InteriorRoom[] = [];
  const walls: InteriorWall[] = [];
  const furniture: InteriorFurniture[] = [];
  const elevators: InteriorZone[] = [];
  const stairs: InteriorZone[] = [];
  const exits: InteriorZone[] = [];

  // Default fallback Elevator & Stairs & Exit positions
  const entSide = bld.entranceSide || 'south';
  let elX = W / 2 - 14;
  let elY = 6;
  let stX = W / 2 + 14;
  let stY = 6;

  if (entSide === 'north') {
    elY = H - 22; stY = H - 22;
  } else if (entSide === 'west') {
    elX = W - 22; elY = H / 2 - 14;
    stX = W - 22; stY = H / 2 + 14;
  } else if (entSide === 'east') {
    elX = 6; elY = H / 2 - 14;
    stX = 6; stY = H / 2 + 14;
  }

  const elevatorZone = { x: elX, y: elY, width: 20, height: 16 };
  const stairsZone = { x: stX, y: stY, width: 20, height: 16 };

  let exX = W / 2 - 12;
  let exY = H - 8;
  const primaryEnt = (bld.entrances && bld.entrances.length > 0) ? bld.entrances[0] : { side: entSide, offsetRatio: 0.5 };
  if (primaryEnt.side === 'north') {
    exX = W * primaryEnt.offsetRatio - 12; exY = 0;
  } else if (primaryEnt.side === 'south') {
    exX = W * primaryEnt.offsetRatio - 12; exY = H - 8;
  } else if (primaryEnt.side === 'west') {
    exX = 0; exY = H * primaryEnt.offsetRatio - 12;
  } else if (primaryEnt.side === 'east') {
    exX = W - 8; exY = H * primaryEnt.offsetRatio - 12;
  }
  const exitZone = { x: exX, y: exY, width: 24, height: 8 };

  const isResidential = ['residential', 'panel_apartment', 'brick_residential', 'modern_residential'].includes(bld.type);
  const isSuburban = bld.type === 'suburban';
  const isOffice = ['office', 'business_center'].includes(bld.type);
  const isShop = ['shop', 'shopping_mall', 'commercial'].includes(bld.type);

  if (isResidential) {
    const rawEntrances = (bld.entrances && bld.entrances.length > 0)
      ? bld.entrances
      : [{ side: bld.entranceSide || 'south', offsetRatio: 0.5, number: 1 }];
    const numSections = rawEntrances.length;
    const DOOR_WIDTH = 33; // Strict 33px apartment entrance requirement

    // Check primary orientation of building entrances (Horizontal vs Vertical)
    const isVerticalLayout = (rawEntrances[0].side === 'west' || rawEntrances[0].side === 'east') && H > W;

    if (!isVerticalLayout) {
      // --- HORIZONTAL RESIDENTIAL LAYOUT (South / North entrances) ---
      const totalWidth = W - 12;
      const sectionW = totalWidth / numSections;

      for (let s = 0; s < numSections; s++) {
        const ent = rawEntrances[s];
        const isNorthEnt = ent.side === 'north';
        const secX0 = 6 + s * sectionW;
        const secX1 = 6 + (s + 1) * sectionW;
        const secW = secX1 - secX0;
        const secY0 = 6;
        const secY1 = H - 6;
        const secH = secY1 - secY0;

        // Solid Inter-Section Dividing Wall (Completely isolate this entrance section from others)
        if (s < numSections - 1) {
          walls.push({ x1: secX1, y1: secY0, x2: secX1, y2: secY1 });
        }

        // Central Hallway / Lobby / Elevator Core (Подъездный холл)
        const hallW = Math.max(46, Math.min(secW * 0.28, 54));
        const hallX = secX0 + (secW - hallW) / 2;
        const hallY = secY0;
        const hallH = secH;
        const hallCenterX = hallX + hallW / 2;

        rooms.push({
          name: `Подъезд ${ent.number || (s + 1)}`,
          x: hallX,
          y: hallY,
          width: hallW,
          height: hallH,
          color: '#334155',
          floorStyle: 'tile'
        });

        // Dedicated Elevator & Stairs & Exit for this entrance section
        let secElevator: InteriorZone;
        let secStairs: InteriorZone;
        let secExit: InteriorZone;

        if (isNorthEnt) {
          // Entrance at North (top), elevator and stairs at South (bottom)
          secExit = { x: hallCenterX - 13, y: secY0, width: 26, height: 10, entranceIndex: s, sectionIndex: s };
          secElevator = { x: hallX + 3, y: secY1 - 20, width: 20, height: 18, entranceIndex: s, sectionIndex: s };
          secStairs = { x: hallX + hallW - 23, y: secY1 - 20, width: 20, height: 18, entranceIndex: s, sectionIndex: s };
        } else {
          // Entrance at South (bottom), elevator and stairs at North (top)
          secExit = { x: hallCenterX - 13, y: secY1 - 10, width: 26, height: 10, entranceIndex: s, sectionIndex: s };
          secElevator = { x: hallX + 3, y: secY0 + 2, width: 20, height: 18, entranceIndex: s, sectionIndex: s };
          secStairs = { x: hallX + hallW - 23, y: secY0 + 2, width: 20, height: 18, entranceIndex: s, sectionIndex: s };
        }

        elevators.push(secElevator);
        stairs.push(secStairs);
        exits.push(secExit);

        // Hallway decor: Mailbox bank & Cast-iron radiator along hallway wall
        if (isNorthEnt) {
          furniture.push({
            type: 'mailbox_bank',
            x: hallX + 3,
            y: secY1 - 38,
            width: 8,
            height: 14,
            angle: 0,
            color: '#64748b'
          });
          furniture.push({
            type: 'radiator',
            x: hallX + hallW - 7,
            y: secY1 - 38,
            width: 4,
            height: 12,
            angle: 0,
            color: '#cbd5e1'
          });
        } else {
          furniture.push({
            type: 'mailbox_bank',
            x: hallX + 3,
            y: secY0 + 24,
            width: 8,
            height: 14,
            angle: 0,
            color: '#64748b'
          });
          furniture.push({
            type: 'radiator',
            x: hallX + hallW - 7,
            y: secY0 + 24,
            width: 4,
            height: 12,
            angle: 0,
            color: '#cbd5e1'
          });
        }

        // Doorway vertical positioning in hallway walls (safely centered away from elevator & exit)
        const doorY = Math.round(secY0 + 24 + (secH - 48 - DOOR_WIDTH) / 2);

        // Left dividing wall with exactly 33px doorway into Left Apartment
        walls.push({ x1: hallX, y1: secY0, x2: hallX, y2: doorY });
        walls.push({ x1: hallX, y1: doorY + DOOR_WIDTH, x2: hallX, y2: secY1 });

        // Right dividing wall with exactly 33px doorway into Right Apartment
        walls.push({ x1: hallX + hallW, y1: secY0, x2: hallX + hallW, y2: doorY });
        walls.push({ x1: hallX + hallW, y1: doorY + DOOR_WIDTH, x2: hallX + hallW, y2: secY1 });

        // --- APARTMENT 1: LEFT (Квартира слева) ---
        const aptLeftW = hallX - secX0;
        const aptLeftH = secH;
        const aptLeftNum = floor * (numSections * 2) + s * 2 + 1;
        const leftThemeIndex = (aptLeftNum + floor * 3 + s * 2) % 6;

        rooms.push({
          name: `Кв. ${aptLeftNum}`,
          x: secX0,
          y: secY0,
          width: aptLeftW,
          height: aptLeftH,
          color: '#1e293b',
          floorStyle: leftThemeIndex === 4 ? 'wood' : (leftThemeIndex === 5 ? 'parquet' : 'parquet')
        });

        generateHorizontalApartmentInterior(
          furniture,
          aptLeftNum,
          leftThemeIndex,
          secX0,
          secX1,
          secY0,
          secY1,
          hallX,
          hallW,
          true,
          doorY,
          DOOR_WIDTH
        );

        // --- APARTMENT 2: RIGHT (Квартира справа) ---
        const aptRightX = hallX + hallW;
        const aptRightW = secX1 - aptRightX;
        const aptRightH = secH;
        const aptRightNum = floor * (numSections * 2) + s * 2 + 2;
        const rightThemeIndex = (aptRightNum + floor * 3 + s * 2) % 6;

        rooms.push({
          name: `Кв. ${aptRightNum}`,
          x: aptRightX,
          y: secY0,
          width: aptRightW,
          height: aptRightH,
          color: '#1e293b',
          floorStyle: rightThemeIndex === 4 ? 'wood' : (rightThemeIndex === 5 ? 'parquet' : 'parquet')
        });

        generateHorizontalApartmentInterior(
          furniture,
          aptRightNum,
          rightThemeIndex,
          secX0,
          secX1,
          secY0,
          secY1,
          hallX,
          hallW,
          false,
          doorY,
          DOOR_WIDTH
        );
      }
    } else {
      // --- VERTICAL RESIDENTIAL LAYOUT (West / East entrances) ---
      const totalHeight = H - 12;
      const sectionH = totalHeight / numSections;

      for (let s = 0; s < numSections; s++) {
        const ent = rawEntrances[s];
        const isEastEnt = ent.side === 'east';
        const secY0 = 6 + s * sectionH;
        const secY1 = 6 + (s + 1) * sectionH;
        const secH = secY1 - secY0;
        const secX0 = 6;
        const secX1 = W - 6;
        const secW = secX1 - secX0;

        // Solid Inter-Section Dividing Wall
        if (s < numSections - 1) {
          walls.push({ x1: secX0, y1: secY1, x2: secX1, y2: secY1 });
        }

        // Central Hallway / Lobby / Elevator Core
        const hallH = Math.max(46, Math.min(secH * 0.28, 54));
        const hallY = secY0 + (secH - hallH) / 2;
        const hallX = secX0;
        const hallW = secW;
        const hallCenterY = hallY + hallH / 2;

        rooms.push({
          name: `Подъезд ${ent.number || (s + 1)}`,
          x: hallX,
          y: hallY,
          width: hallW,
          height: hallH,
          color: '#334155',
          floorStyle: 'tile'
        });

        let secElevator: InteriorZone;
        let secStairs: InteriorZone;
        let secExit: InteriorZone;

        if (isEastEnt) {
          secExit = { x: secX1 - 10, y: hallCenterY - 13, width: 10, height: 26, entranceIndex: s, sectionIndex: s };
          secElevator = { x: secX0 + 2, y: hallY + 3, width: 18, height: 20, entranceIndex: s, sectionIndex: s };
          secStairs = { x: secX0 + 2, y: hallY + hallH - 23, width: 18, height: 20, entranceIndex: s, sectionIndex: s };
        } else {
          secExit = { x: secX0, y: hallCenterY - 13, width: 10, height: 26, entranceIndex: s, sectionIndex: s };
          secElevator = { x: secX1 - 20, y: hallY + 3, width: 18, height: 20, entranceIndex: s, sectionIndex: s };
          secStairs = { x: secX1 - 20, y: hallY + hallH - 23, width: 18, height: 20, entranceIndex: s, sectionIndex: s };
        }

        elevators.push(secElevator);
        stairs.push(secStairs);
        exits.push(secExit);

        // Hallway decor
        furniture.push({
          type: 'mailbox_bank',
          x: isEastEnt ? secX0 + 22 : secX1 - 30,
          y: hallY + 3,
          width: 8,
          height: 14,
          angle: 0,
          color: '#64748b'
        });

        const doorX = Math.round(secX0 + 24 + (secW - 48 - DOOR_WIDTH) / 2);

        // Top dividing wall with 33px doorway
        walls.push({ x1: secX0, y1: hallY, x2: doorX, y2: hallY });
        walls.push({ x1: doorX + DOOR_WIDTH, y1: hallY, x2: secX1, y2: hallY });

        // Bottom dividing wall with 33px doorway
        walls.push({ x1: secX0, y1: hallY + hallH, x2: doorX, y2: hallY + hallH });
        walls.push({ x1: doorX + DOOR_WIDTH, y1: hallY + hallH, x2: secX1, y2: hallY + hallH });

        // --- APARTMENT 1: TOP (Квартира сверху) ---
        const aptTopH = hallY - secY0;
        const aptTopNum = floor * (numSections * 2) + s * 2 + 1;
        const topThemeIndex = (aptTopNum + floor * 3 + s * 2) % 4;

        rooms.push({
          name: `Кв. ${aptTopNum}`,
          x: secX0,
          y: secY0,
          width: secW,
          height: aptTopH,
          color: '#1e293b',
          floorStyle: 'parquet'
        });

        generateVerticalApartmentInterior(
          furniture,
          aptTopNum,
          topThemeIndex,
          secX0,
          secX1,
          secY0,
          secY1,
          hallY,
          hallH,
          true,
          doorX,
          DOOR_WIDTH
        );

        // --- APARTMENT 2: BOTTOM (Квартира снизу) ---
        const aptBottomY = hallY + hallH;
        const aptBottomH = secY1 - aptBottomY;
        const aptBottomNum = floor * (numSections * 2) + s * 2 + 2;
        const botThemeIndex = (aptBottomNum + floor * 3 + s * 2) % 4;

        rooms.push({
          name: `Кв. ${aptBottomNum}`,
          x: secX0,
          y: aptBottomY,
          width: secW,
          height: aptBottomH,
          color: '#1e293b',
          floorStyle: 'parquet'
        });

        generateVerticalApartmentInterior(
          furniture,
          aptBottomNum,
          botThemeIndex,
          secX0,
          secX1,
          secY0,
          secY1,
          hallY,
          hallH,
          false,
          doorX,
          DOOR_WIDTH
        );
      }
    }
  } else if (isSuburban) {
    // --- COZY 2-STORY SUBURBAN COTTAGE (Загородный коттедж) ---
    const DOOR_WIDTH = 33;
    const subExit = { x: W / 2 - 13, y: H - 10, width: 26, height: 10, entranceIndex: 0, sectionIndex: 0 };
    const subStairs = { x: W - 26, y: 8, width: 20, height: 20, entranceIndex: 0, sectionIndex: 0 };
    exits.push(subExit);
    stairs.push(subStairs);

    if (floor === 0) {
      // Ground Floor: Hallway, Spacious Living Room with Fireplace / TV, and Kitchen
      const hallH = 34;
      const hallY = H - hallH - 6;
      rooms.push({ name: 'Прихожая коттеджа', x: 6, y: hallY, width: W - 12, height: hallH, color: '#334155', floorStyle: 'tile' });
      
      const mainW = (W - 12) * 0.58;
      const kitW = W - 12 - mainW;
      rooms.push({ name: 'Гостиная с камином', x: 6, y: 6, width: mainW, height: hallY - 6, color: '#1e293b', floorStyle: 'parquet' });
      rooms.push({ name: 'Кухня-Столовая', x: 6 + mainW, y: 6, width: kitW, height: hallY - 6, color: '#0f172a', floorStyle: 'tile' });

      // Dividing wall between living room and kitchen with 33px door
      const kitDoorY = Math.round(6 + (hallY - 12 - DOOR_WIDTH) / 2);
      walls.push({ x1: 6 + mainW, y1: 6, x2: 6 + mainW, y2: kitDoorY });
      walls.push({ x1: 6 + mainW, y1: kitDoorY + DOOR_WIDTH, x2: 6 + mainW, y2: hallY });

      // Dividing wall between hallway and living room with 33px door
      const hallDoorX = Math.round(6 + (mainW - DOOR_WIDTH) / 2);
      walls.push({ x1: 6, y1: hallY, x2: hallDoorX, y2: hallY });
      walls.push({ x1: hallDoorX + DOOR_WIDTH, y1: hallY, x2: W - 6, y2: hallY });

      // Furniture
      furniture.push({ type: 'carpet', x: 12, y: 12, width: mainW - 12, height: hallY - 24, angle: 0, color: '#7c2d12' });
      furniture.push({ type: 'sofa', x: 12, y: 12, width: 28, height: 12, angle: 0, color: '#38bdf8' });
      furniture.push({ type: 'tv_cabinet', x: 12, y: hallY - 12, width: 22, height: 5, angle: 0, color: '#78350f' });
      furniture.push({ type: 'tv', x: 14, y: hallY - 11, width: 18, height: 2, angle: 0, color: '#000000' });
      furniture.push({ type: 'kitchen_counter', x: W - 28, y: hallY - 14, width: 22, height: 8, angle: 0, color: '#0284c7' });
      furniture.push({ type: 'fridge', x: W - 14, y: 12, width: 8, height: 8, angle: 0, color: '#cbd5e1' });
    } else {
      // 1st Floor: Master Bedroom, Children's Room, and Bathroom
      const halfW = (W - 12) / 2;
      rooms.push({ name: 'Холл 2 этажа', x: 6, y: H / 2 - 16, width: W - 12, height: 32, color: '#334155', floorStyle: 'parquet' });
      rooms.push({ name: 'Спальня хозяев', x: 6, y: 6, width: halfW, height: H / 2 - 22, color: '#0f172a', floorStyle: 'wood' });
      rooms.push({ name: 'Детская комната', x: 6, y: H / 2 + 16, width: halfW, height: H / 2 - 22, color: '#1e293b', floorStyle: 'wood' });
      rooms.push({ name: 'Ванная комната', x: 6 + halfW, y: H / 2 + 16, width: halfW, height: H / 2 - 22, color: '#0369a1', floorStyle: 'tile' });

      // Walls & 33px Doors
      walls.push({ x1: 6, y1: H / 2 - 16, x2: 18, y2: H / 2 - 16 });
      walls.push({ x1: 18 + DOOR_WIDTH, y1: H / 2 - 16, x2: 6 + halfW, y2: H / 2 - 16 });

      walls.push({ x1: 6, y1: H / 2 + 16, x2: 18, y2: H / 2 + 16 });
      walls.push({ x1: 18 + DOOR_WIDTH, y1: H / 2 + 16, x2: 6 + halfW, y2: H / 2 + 16 });

      // Furniture
      furniture.push({ type: 'bed', x: 10, y: 10, width: 22, height: 24, angle: 0, color: '#f43f5e' });
      furniture.push({ type: 'wardrobe', x: halfW - 14, y: 10, width: 14, height: 8, angle: 0, color: '#451a03' });
      furniture.push({ type: 'kids_bed', x: 10, y: H - 28, width: 18, height: 20, angle: 0, color: '#38bdf8' });
      furniture.push({ type: 'bath', x: W - 26, y: H - 24, width: 20, height: 14, angle: 0, color: '#cbd5e1' });
      furniture.push({ type: 'toilet', x: W - 14, y: H / 2 + 20, width: 8, height: 8, angle: 0, color: '#f1f5f9' });
    }
  } else if (isOffice) {
    buildOfficeInterior({ bld, floor, W, H, rooms, walls, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone });
  } else if (bld.type === 'tactical_store' || bld.shopBrand === 'splav_gear') {
    buildGearShopInterior({ bld, floor, W, H, rooms, walls, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone });
  } else if (bld.type === 'auto_service_center' || bld.shopBrand === 'pitstop_service') {
    buildAutoServiceInterior({ bld, floor, W, H, rooms, walls, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone });
  } else if (bld.type === 'car_wash_station') {
    buildCarWashInterior({ bld, floor, W, H, rooms, walls, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone });
  } else if (bld.type === 'pharmacy_store' || bld.shopBrand === 'pharmacy_36_6') {
    buildPharmacyInterior({ bld, floor, W, H, rooms, walls, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone });
  } else if (bld.type === 'supermarket_store' || bld.shopBrand === 'pyaterochka' || bld.shopBrand === 'perekrestok') {
    buildSupermarketInterior({ bld, floor, W, H, rooms, walls, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone });
  } else if (bld.type === 'pizzeria_restaurant' || bld.shopBrand === 'dodo_pizza') {
    buildPizzeriaInterior({ bld, floor, W, H, rooms, walls, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone });
  } else if (bld.type === 'fast_food_restaurant' || bld.shopBrand === 'vkusno_tochka') {
    buildFastFoodInterior({ bld, floor, W, H, rooms, walls, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone });
  } else if (bld.type === 'electronics_store' || bld.shopBrand === 'mvideo') {
    buildElectronicsInterior({ bld, floor, W, H, rooms, walls, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone });
  } else if (bld.type === 'sports_store' || bld.shopBrand === 'sportmaster') {
    buildSportsStoreInterior({ bld, floor, W, H, rooms, walls, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone });
  } else if (bld.type === 'bakery_cafe' || bld.shopBrand === 'cofix_bakery') {
    buildCafeInterior({ bld, floor, W, H, rooms, walls, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone }, 'Кафе & Пекарня "Cofix"');
  } else if (bld.type === 'coffee_bistro' || bld.shopBrand === 'bean_bistro') {
    buildCafeInterior({ bld, floor, W, H, rooms, walls, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone }, 'Кафе & Кофейня "Bean & Bistro"');
  } else if (bld.type === 'commercial_gallery') {
    buildGalleryInterior({ bld, floor, W, H, rooms, walls, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone });
  } else if (bld.type === 'commercial' || bld.type === 'shop' || isShop) {
    buildSupermarketInterior({ bld, floor, W, H, rooms, walls, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone });
  } else if (bld.type === 'hospital') {
    buildHospitalInterior({ bld, floor, W, H, rooms, walls, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone });
  } else if (bld.type === 'police_station') {
    buildPoliceStationInterior({ bld, floor, W, H, rooms, walls, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone });
  } else if (bld.type === 'fire_station') {
    elevators.push(elevatorZone);
    stairs.push(stairsZone);
    exits.push(exitZone);

    if (floor === 0) {
      rooms.push({ name: 'Пожарное Депо & Гаражный бокс', x: 6, y: 6, width: W - 12, height: H - 12, color: '#18181b', floorStyle: 'concrete' });
      furniture.push({ type: 'fire_rack', x: 14, y: 16, width: 16, height: 8, angle: 0, color: '#ef4444' });
      furniture.push({ type: 'fire_rack', x: W - 30, y: 16, width: 16, height: 8, angle: 0, color: '#ef4444' });
      furniture.push({ type: 'desk_reception', x: 14, y: H - 24, width: 28, height: 10, angle: 0, color: '#dc2626' });
    } else {
      rooms.push({ name: 'Комната отдыха пожарной бригады', x: 6, y: 6, width: W - 12, height: H - 12, color: '#27272a', floorStyle: 'wood' });
      furniture.push({ type: 'bed', x: 12, y: 12, width: 20, height: 22, angle: 0, color: '#ef4444' });
      furniture.push({ type: 'bed', x: 36, y: 12, width: 20, height: 22, angle: 0, color: '#ef4444' });
      furniture.push({ type: 'sofa', x: 12, y: H - 22, width: 26, height: 10, angle: 0, color: '#3b82f6' });
      furniture.push({ type: 'tv_cabinet', x: 42, y: H - 16, width: 16, height: 4, angle: 0, color: '#1e293b' });
      furniture.push({ type: 'tv', x: 43, y: H - 15, width: 14, height: 2, angle: 0, color: '#000000' });
    }
  } else if (bld.type === 'school_kindergarten') {
    buildSchoolInterior({ bld, floor, W, H, rooms, walls, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone });
  } else if (bld.type === 'transit_hub') {
    elevators.push(elevatorZone);
    stairs.push(stairsZone);
    exits.push(exitZone);

    rooms.push({ name: 'Центральный Зал Ожидания Вокзала', x: 6, y: 6, width: W - 12, height: H - 12, color: '#1e293b', floorStyle: 'tile' });
    furniture.push({ type: 'desk_reception', x: W / 2 - 30, y: 12, width: 60, height: 10, angle: 0, color: '#0369a1' });
    
    // Ticket Machines & ATM
    furniture.push({ type: 'atm', x: 14, y: 12, width: 8, height: 8, angle: 0, color: '#0284c7' });
    furniture.push({ type: 'vending_machine', x: 26, y: 12, width: 10, height: 8, angle: 0, color: '#475569' });
    furniture.push({ type: 'lockers', x: W - 32, y: 12, width: 18, height: 8, angle: 0, color: '#64748b' });

    // Passenger Seating Benches
    for (let i = 0; i < 6; i++) {
      furniture.push({ type: 'chair', x: W / 2 - 24 + i * 8, y: H / 2 - 2, width: 6, height: 6, angle: Math.PI, color: '#e2e8f0' });
      furniture.push({ type: 'chair', x: W / 2 - 24 + i * 8, y: H / 2 + 6, width: 6, height: 6, angle: 0, color: '#e2e8f0' });
    }
  } else if (bld.type === 'cultural_center') {
    elevators.push(elevatorZone);
    stairs.push(stairsZone);
    exits.push(exitZone);

    rooms.push({ name: 'Музей & Художественная Галерея', x: 6, y: 6, width: W - 12, height: H - 12, color: '#0f172a', floorStyle: 'parquet' });
    furniture.push({ type: 'carpet', x: W / 2 - 20, y: H / 2 - 20, width: 40, height: 40, angle: 0, color: '#7f1d1d' });
    furniture.push({ type: 'table', x: W / 2 - 6, y: H / 2 - 6, width: 12, height: 12, angle: 0, color: '#fcd34d' });
    furniture.push({ type: 'bookshelf', x: 14, y: 14, width: 24, height: 6, angle: 0, color: '#78350f' });
    furniture.push({ type: 'bookshelf', x: W - 38, y: 14, width: 24, height: 6, angle: 0, color: '#78350f' });
  } else if (bld.type === 'industrial') {
    buildIndustrialInterior({ bld, floor, W, H, rooms, walls, furniture, elevators, stairs, exits, elevatorZone, stairsZone, exitZone });
  } else if (bld.type === 'car_dealership') {
    elevators.push(elevatorZone);
    stairs.push(stairsZone);
    exits.push(exitZone);

    rooms.push({ name: 'Автосалон "Премиум Авто"', x: 6, y: 6, width: W - 12, height: H - 12, color: '#e2e8f0', floorStyle: 'tile' });
    furniture.push({ type: 'carpet', x: 16, y: 16, width: 44, height: 32, angle: 0, color: '#1e293b' });
    if (W > 110) {
      furniture.push({ type: 'carpet', x: W - 60, y: 16, width: 44, height: 32, angle: 0, color: '#1e293b' });
    }
    furniture.push({ type: 'desk_reception', x: W / 2 - 18, y: H - 22, width: 36, height: 10, angle: 0, color: '#0284c7' });
    furniture.push({ type: 'sofa', x: 16, y: H - 22, width: 24, height: 10, angle: 0, color: '#64748b' });
  } else if (bld.type === 'sports_stadium') {
    elevators.push(elevatorZone);
    stairs.push(stairsZone);
    exits.push(exitZone);

    rooms.push({ name: 'Спортивный Комплекс', x: 6, y: 6, width: W - 12, height: H - 12, color: '#d97706', floorStyle: 'wood' });
    furniture.push({ type: 'carpet', x: W / 2 - 36, y: H / 2 - 24, width: 72, height: 48, angle: 0, color: '#15803d' });
    furniture.push({ type: 'lockers', x: 14, y: 14, width: 24, height: 8, angle: 0, color: '#0284c7' });
    furniture.push({ type: 'bench', x: 14, y: 26, width: 20, height: 6, angle: 0, color: '#78350f' });
  } else {
    elevators.push(elevatorZone);
    stairs.push(stairsZone);
    exits.push(exitZone);

    rooms.push({ name: 'Помещение', x: 6, y: 6, width: W - 12, height: H - 12, color: '#1e293b' });
    furniture.push({ type: 'table', x: W / 2 - 10, y: H / 2 - 8, width: 20, height: 16, angle: 0, color: '#a16207' });
    furniture.push({ type: 'chair', x: W / 2 - 8, y: H / 2 - 14, width: 4, height: 4, angle: 0, color: '#451a03' });
  }

  // Outer Building Boundary Walls
  walls.push({ x1: 6, y1: 6, x2: W - 6, y2: 6 });
  walls.push({ x1: W - 6, y1: 6, x2: W - 6, y2: H - 6 });
  walls.push({ x1: W - 6, y1: H - 6, x2: 6, y2: H - 6 });
  walls.push({ x1: 6, y1: H - 6, x2: 6, y2: 6 });

  return {
    buildingId: bld.id,
    floor,
    width: W,
    height: H,
    rooms,
    walls,
    furniture,
    elevatorZone: elevators[0] || elevatorZone,
    stairsZone: stairs[0] || stairsZone,
    exitZone: exits[0] || exitZone,
    elevators: elevators.length > 0 ? elevators : [elevatorZone],
    stairs: stairs.length > 0 ? stairs : [stairsZone],
    exits: exits.length > 0 ? exits : [exitZone]
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

      case 'server_rack':
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-halfW, -halfH, f.width, f.height);
        // Server status LEDs
        for (let y = -halfH + 2; y < halfH - 2; y += 3) {
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(-halfW + 2, y, 1.5, 1.5);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(-halfW + 4.5, y, 1.5, 1.5);
          ctx.fillStyle = '#64748b';
          ctx.fillRect(-halfW + 7, y, f.width - 9, 1);
        }
        break;

      case 'whiteboard':
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-halfW, -halfH, f.width, f.height);
        // Marker tray
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-halfW + 2, halfH - 1, 4, 1);
        break;

      case 'file_cabinet':
        ctx.fillStyle = f.color || '#475569';
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-halfW, -halfH, f.width, f.height);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-2, -halfH + 2, 4, 1.5);
        ctx.fillRect(-2, 0, 4, 1.5);
        break;

      case 'lockers':
        ctx.fillStyle = f.color || '#0284c7';
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-halfW, -halfH, f.width, f.height);
        // Locker dividers
        for (let x = -halfW + 6; x < halfW; x += 6) {
          ctx.beginPath();
          ctx.moveTo(x, -halfH);
          ctx.lineTo(x, halfH);
          ctx.stroke();
        }
        break;

      case 'atm':
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.fillStyle = '#38bdf8'; // Glowing screen
        ctx.fillRect(-halfW + 1.5, -halfH + 1.5, f.width - 3, 2.5);
        ctx.fillStyle = '#0f172a'; // Card slot / keypad
        ctx.fillRect(-halfW + 2, 0, f.width - 4, 2);
        break;

      case 'cash_register':
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.fillStyle = '#22c55e'; // Screen display
        ctx.fillRect(-halfW + 1, -halfH + 1, f.width - 2, 1.2);
        break;

      case 'freezer_display':
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; // Glass top
        ctx.fillRect(-halfW + 1.5, -halfH + 1.5, f.width - 3, f.height - 3);
        break;

      case 'pallet_stack':
        ctx.fillStyle = '#b45309';
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-halfW, -halfH, f.width, f.height);
        // Cross slats
        ctx.beginPath();
        ctx.moveTo(-halfW, -halfH);
        ctx.lineTo(halfW, halfH);
        ctx.moveTo(halfW, -halfH);
        ctx.lineTo(-halfW, halfH);
        ctx.stroke();
        break;

      case 'sink':
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.fillStyle = '#94a3b8'; // Basin
        ctx.fillRect(-halfW + 1, -halfH + 1, f.width - 2, f.height - 2);
        ctx.fillStyle = '#64748b'; // Faucet
        ctx.fillRect(-1, -halfH, 2, 2);
        break;

      case 'exam_table':
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-halfW, -halfH, f.width, f.height);
        ctx.fillStyle = '#38bdf8'; // Pillow headrest
        ctx.fillRect(-halfW + 1, -halfH + 1, 4, f.height - 2);
        break;

      case 'jail_cot':
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.fillStyle = '#a1a1aa'; // Coarse blanket
        ctx.fillRect(-halfW + 1, -halfH + 4, f.width - 2, f.height - 5);
        break;

      case 'fire_rack':
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-halfW, -halfH, f.width, f.height);
        ctx.fillStyle = '#fef08a'; // Yellow reflective stripes
        ctx.fillRect(-halfW + 2, -1, f.width - 4, 2);
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
