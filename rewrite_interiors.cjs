const fs = require('fs');

const lines = fs.readFileSync('src/buildingInteriors.ts', 'utf8').split('\n');

const head = lines.slice(0, 105).join('\n');
const tail = lines.slice(635).join('\n');

const newFunc = `
export function generateBuildingLayout(bld: Building, floor: number): BuildingLayout {
  const rand = createSeededRandom(\`\${bld.id}_floor_\${floor}\`);
  const W = bld.width;
  const H = bld.height;

  const rooms: InteriorRoom[] = [];
  const walls: InteriorWall[] = [];
  const furniture: InteriorFurniture[] = [];

  // Elevator & Stairs positions
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

  const isResidential = ['residential', 'panel_apartment', 'brick_residential', 'modern_residential', 'suburban'].includes(bld.type);
  const isOffice = ['office', 'business_center'].includes(bld.type);
  const isShop = ['shop', 'shopping_mall', 'commercial'].includes(bld.type);

  if (isResidential) {
    // Generate an improved, spacious residential layout
    const hallwayY = H / 2 - 12;
    const hallwayHeight = 24;

    rooms.push({ name: 'Коридор', x: 6, y: hallwayY, width: W - 12, height: hallwayHeight, color: '#475569' });
    rooms.push({ name: 'Лифтовой Холл', x: W / 2 - 26, y: 6, width: 52, height: hallwayY - 6, color: '#475569' });
    rooms.push({ name: 'Вестибюль', x: W / 2 - 15, y: hallwayY + hallwayHeight, width: 30, height: H - (hallwayY + hallwayHeight) - 6, color: '#475569' });

    // Inner hallway walls
    walls.push({ x1: 6, y1: hallwayY, x2: W / 2 - 26, y2: hallwayY });
    walls.push({ x1: W / 2 + 26, y1: hallwayY, x2: W - 6, y2: hallwayY });
    walls.push({ x1: 6, y1: hallwayY + hallwayHeight, x2: W / 2 - 15, y2: hallwayY + hallwayHeight });
    walls.push({ x1: W / 2 + 15, y1: hallwayY + hallwayHeight, x2: W - 6, y2: hallwayY + hallwayHeight });
    walls.push({ x1: W / 2 - 26, y1: 6, x2: W / 2 - 26, y2: hallwayY });
    walls.push({ x1: W / 2 + 26, y1: 6, x2: W / 2 + 26, y2: hallwayY });
    walls.push({ x1: W / 2 - 15, y1: hallwayY + hallwayHeight, x2: W / 2 - 15, y2: H - 6 });
    walls.push({ x1: W / 2 + 15, y1: hallwayY + hallwayHeight, x2: W / 2 + 15, y2: H - 6 });

    const createApartment = (apX, apY, apW, apH, nameStr) => {
      rooms.push({ name: nameStr, x: apX, y: apY, width: apW, height: apH, color: '#1e293b' });
      
      // Large living area stuff
      furniture.push({ type: 'carpet', x: apX + 4, y: apY + 4, width: apW - 8, height: apH - 8, angle: 0, color: '#334155' });
      
      if (apW > 40 && apH > 40) {
        // Divide into bedroom and living
        const bedW = apW / 2;
        const bedH = apH / 2;
        rooms.push({ name: 'Спальня', x: apX, y: apY, width: bedW, height: bedH, color: '#0f172a' });
        walls.push({ x1: apX + bedW, y1: apY, x2: apX + bedW, y2: apY + bedH });
        walls.push({ x1: apX, y1: apY + bedH, x2: apX + bedW, y2: apY + bedH });

        furniture.push({ type: 'bed', x: apX + 6, y: apY + 6, width: 22, height: 26, angle: 0, color: '#f43f5e' });
        furniture.push({ type: 'table', x: apX + bedW + 10, y: apY + 10, width: 16, height: 12, angle: 0, color: '#b45309' });
        furniture.push({ type: 'chair', x: apX + bedW + 12, y: apY + 6, width: 5, height: 5, angle: 0, color: '#64748b' });

        // TV area
        furniture.push({ type: 'sofa', x: apX + 6, y: apY + apH - 14, width: 26, height: 10, angle: 0, color: '#38bdf8' });
        furniture.push({ type: 'tv_cabinet', x: apX + 10, y: apY + apH - 24, width: 18, height: 4, angle: 0, color: '#78350f' });
        furniture.push({ type: 'tv', x: apX + 12, y: apY + apH - 23, width: 14, height: 2, angle: 0, color: '#000000' });
      } else {
        // Studio
        furniture.push({ type: 'bed', x: apX + 6, y: apY + 6, width: 22, height: 26, angle: 0, color: '#f43f5e' });
        furniture.push({ type: 'sofa', x: apX + apW - 30, y: apY + apH - 14, width: 26, height: 10, angle: 0, color: '#38bdf8' });
        furniture.push({ type: 'tv_cabinet', x: apX + apW - 26, y: apY + apH - 24, width: 18, height: 4, angle: 0, color: '#78350f' });
        furniture.push({ type: 'tv', x: apX + apW - 24, y: apY + apH - 23, width: 14, height: 2, angle: 0, color: '#000000' });
      }
    };

    // Ap 1
    createApartment(6, 6, W / 2 - 32, hallwayY - 6, \`Кв. \${floor * 4 + 1}\`);
    // Ap 2
    createApartment(W / 2 + 26, 6, W / 2 - 32, hallwayY - 6, \`Кв. \${floor * 4 + 2}\`);
    // Ap 3
    createApartment(6, hallwayY + hallwayHeight, W / 2 - 21, H - (hallwayY + hallwayHeight) - 6, \`Кв. \${floor * 4 + 3}\`);
    // Ap 4
    createApartment(W / 2 + 15, hallwayY + hallwayHeight, W / 2 - 21, H - (hallwayY + hallwayHeight) - 6, \`Кв. \${floor * 4 + 4}\`);

  } else if (isOffice) {
    // Standard office fallback (unchanged mostly but slightly refactored)
    if (floor === 0) {
      rooms.push({ name: 'Главный Вестибюль', x: 6, y: 6, width: W - 12, height: H - 12, color: '#334155' });
      furniture.push({ type: 'desk_reception', x: W / 2 - 24, y: H / 2 - 6, width: 48, height: 10, angle: 0, color: '#f59e0b' });
      furniture.push({ type: 'computer', x: W / 2 - 12, y: H / 2 - 4, width: 6, height: 4, angle: 0, color: '#1e293b' });
      furniture.push({ type: 'computer', x: W / 2 + 6, y: H / 2 - 4, width: 6, height: 4, angle: 0, color: '#1e293b' });
      furniture.push({ type: 'sofa', x: 12, y: H - 24, width: 32, height: 10, angle: 0, color: '#64748b' });
      furniture.push({ type: 'sofa', x: W - 44, y: H - 24, width: 32, height: 10, angle: 0, color: '#64748b' });
      furniture.push({ type: 'plant', x: 10, y: H - 36, width: 10, height: 10, angle: 0, color: '#15803d' });
    } else {
      const hallwayY = H / 2 - 10;
      rooms.push({ name: 'Коридор', x: 6, y: hallwayY, width: W - 12, height: 20, color: '#475569' });
      // Off 1
      rooms.push({ name: \`Офис \${floor * 10 + 1}\`, x: 6, y: 6, width: W/2 - 32, height: hallwayY - 6, color: '#1e293b' });
      furniture.push({ type: 'desk', x: 12, y: 12, width: 16, height: 10, angle: 0, color: '#a16207' });
      furniture.push({ type: 'computer', x: 17, y: 13, width: 6, height: 4, angle: 0, color: '#000000' });
      furniture.push({ type: 'chair', x: 18, y: 8, width: 4, height: 4, angle: 0, color: '#1e293b' });
      
      // Off 2
      rooms.push({ name: \`Офис \${floor * 10 + 2}\`, x: W/2 + 26, y: 6, width: W/2 - 32, height: hallwayY - 6, color: '#1e293b' });
      furniture.push({ type: 'desk', x: W - 28, y: 12, width: 16, height: 10, angle: 0, color: '#a16207' });
      furniture.push({ type: 'computer', x: W - 23, y: 13, width: 6, height: 4, angle: 0, color: '#000000' });
      furniture.push({ type: 'chair', x: W - 22, y: 8, width: 4, height: 4, angle: 0, color: '#1e293b' });
      
      // Off 3 & 4
      rooms.push({ name: \`Офис \${floor * 10 + 3}\`, x: 6, y: hallwayY + 20, width: W/2 - 21, height: H - hallwayY - 26, color: '#1e293b' });
      rooms.push({ name: \`Офис \${floor * 10 + 4}\`, x: W/2 + 15, y: hallwayY + 20, width: W/2 - 21, height: H - hallwayY - 26, color: '#1e293b' });
    }
  } else if (isShop) {
    rooms.push({ name: floor === 0 ? 'Торговый Зал' : 'Выставочный Зал / Склад', x: 6, y: 6, width: W - 12, height: H - 12, color: '#1e293b' });
    const shelfRows = W > H ? 3 : 2;
    const shelfSpacing = (W - 32) / shelfRows;
    for (let r = 0; r < shelfRows; r++) {
      const sx = 16 + r * shelfSpacing;
      furniture.push({ type: 'shelf', x: sx, y: 24, width: 10, height: H - 48, angle: 0, color: '#3f3f46' });
    }
    furniture.push({ type: 'counter', x: 12, y: H - 24, width: 24, height: 10, angle: 0, color: '#4b5563' });
    furniture.push({ type: 'computer', x: 18, y: H - 22, width: 6, height: 4, angle: 0, color: '#000000' });
  } else if (bld.type === 'hospital') {
    if (floor === 0) {
      rooms.push({ name: 'Регистратура и Лобби', x: 6, y: 6, width: W - 12, height: H - 12, color: '#0f172a' });
      furniture.push({ type: 'desk_reception', x: W / 2 - 20, y: H / 2 - 6, width: 40, height: 10, angle: 0, color: '#10b981' });
      for (let i = 0; i < 4; i++) {
        furniture.push({ type: 'chair', x: 12 + i * 8, y: H - 20, width: 6, height: 6, angle: 0, color: '#3b82f6' });
        furniture.push({ type: 'chair', x: W - 40 + i * 8, y: H - 20, width: 6, height: 6, angle: 0, color: '#3b82f6' });
      }
    } else {
      rooms.push({ name: 'Коридор', x: 6, y: H / 2 - 8, width: W - 12, height: 16, color: '#1e293b' });
      const wWidth = W / 2 - 32;
      const wHeight = H / 2 - 14;
      rooms.push({ name: \`Палата \${floor * 100 + 1}\`, x: 6, y: 6, width: wWidth, height: wHeight, color: '#042f2e' });
      furniture.push({ type: 'bed_hospital', x: 12, y: 12, width: 14, height: 22, angle: 0, color: '#f8fafc' });
      rooms.push({ name: \`Палата \${floor * 100 + 2}\`, x: W / 2 + 26, y: 6, width: wWidth, height: wHeight, color: '#042f2e' });
      furniture.push({ type: 'bed_hospital', x: W - 26, y: 12, width: 14, height: 22, angle: 0, color: '#f8fafc' });
      rooms.push({ name: \`Палата \${floor * 100 + 3}\`, x: 6, y: H / 2 + 8, width: wWidth, height: wHeight, color: '#042f2e' });
      furniture.push({ type: 'bed_hospital', x: 12, y: H / 2 + 12, width: 14, height: 22, angle: 0, color: '#f8fafc' });
      rooms.push({ name: \`Палата \${floor * 100 + 4}\`, x: W / 2 + 26, y: H / 2 + 8, width: wWidth, height: wHeight, color: '#042f2e' });
      furniture.push({ type: 'bed_hospital', x: W - 26, y: H / 2 + 12, width: 14, height: 22, angle: 0, color: '#f8fafc' });
    }
  } else if (bld.type === 'police_station') {
    rooms.push({ name: 'Дежурная часть / Офисы', x: 6, y: 6, width: W - 12, height: H - 12, color: '#1e293b' });
    const cellW = 35;
    const cellH = H - 40;
    rooms.push({ name: 'Камера Временного Содержания', x: W - cellW - 6, y: 6, width: cellW, height: cellH, color: '#0f172a' });
    walls.push({ x1: W - cellW - 6, y1: 18, x2: W - 6, y2: 18, isJailBars: true });
    walls.push({ x1: W - cellW - 6, y1: 6, x2: W - cellW - 6, y2: cellH + 6 });
    furniture.push({ type: 'jail_cot', x: W - cellW + 2, y: 8, width: 10, height: 20, angle: 0, color: '#78350f' });
    furniture.push({ type: 'toilet', x: W - 14, y: cellH - 4, width: 6, height: 6, angle: 0, color: '#ffffff' });
    furniture.push({ type: 'desk_reception', x: 12, y: H / 2 - 5, width: 32, height: 10, angle: 0, color: '#1d4ed8' });
  } else if (bld.type === 'fire_station') {
    rooms.push({ name: 'Пожарное Депо', x: 6, y: 6, width: W - 12, height: H - 12, color: '#18181b' });
    furniture.push({ type: 'fire_rack', x: 12, y: 16, width: 14, height: 8, angle: 0, color: '#ef4444' });
    furniture.push({ type: 'fire_rack', x: W - 26, y: 16, width: 14, height: 8, angle: 0, color: '#ef4444' });
  } else if (bld.type === 'school_kindergarten') {
    rooms.push({ name: 'Школа / Коридор', x: 6, y: H/2 - 12, width: W - 12, height: 24, color: '#334155' });
    // Classrooms
    const cW = W/2 - 32;
    const cH = H/2 - 18;
    rooms.push({ name: 'Класс 1', x: 6, y: 6, width: cW, height: cH, color: '#1e293b' });
    rooms.push({ name: 'Класс 2', x: W/2 + 26, y: 6, width: cW, height: cH, color: '#1e293b' });
    for(let dx=0; dx<3; dx++){
      for(let dy=0; dy<3; dy++){
        furniture.push({ type: 'desk', x: 10 + dx*12, y: 10 + dy*12, width: 8, height: 6, angle: 0, color: '#a16207' });
        furniture.push({ type: 'desk', x: W/2 + 30 + dx*12, y: 10 + dy*12, width: 8, height: 6, angle: 0, color: '#a16207' });
      }
    }
  } else if (bld.type === 'transit_hub') {
    rooms.push({ name: 'Зал Ожидания', x: 6, y: 6, width: W - 12, height: H - 12, color: '#1e293b' });
    furniture.push({ type: 'desk_reception', x: W/2 - 30, y: 12, width: 60, height: 10, angle: 0, color: '#0369a1' });
    for(let i=0; i<6; i++){
      furniture.push({ type: 'chair', x: W/2 - 24 + i*8, y: H/2, width: 6, height: 6, angle: Math.PI, color: '#e2e8f0' });
      furniture.push({ type: 'chair', x: W/2 - 24 + i*8, y: H/2 + 8, width: 6, height: 6, angle: 0, color: '#e2e8f0' });
    }
  } else if (bld.type === 'cultural_center') {
    rooms.push({ name: 'Выставочный Зал', x: 6, y: 6, width: W - 12, height: H - 12, color: '#0f172a' });
    furniture.push({ type: 'carpet', x: W/2 - 20, y: H/2 - 20, width: 40, height: 40, angle: 0, color: '#7f1d1d' });
    furniture.push({ type: 'table', x: W/2 - 5, y: H/2 - 5, width: 10, height: 10, angle: 0, color: '#fcd34d' }); // pedestal
  } else if (bld.type === 'industrial') {
    rooms.push({ name: 'Производственный Цех', x: 6, y: 6, width: W - 12, height: H - 12, color: '#27272a' });
    furniture.push({ type: 'shelf', x: 20, y: 20, width: 10, height: H - 40, angle: 0, color: '#52525b' });
    furniture.push({ type: 'shelf', x: 40, y: 20, width: 10, height: H - 40, angle: 0, color: '#52525b' });
    furniture.push({ type: 'cooler', x: W - 20, y: 20, width: 12, height: 12, angle: 0, color: '#38bdf8' });
    furniture.push({ type: 'cooler', x: W - 20, y: 40, width: 12, height: 12, angle: 0, color: '#38bdf8' });
  } else if (bld.type === 'car_dealership') {
    rooms.push({ name: 'Автосалон', x: 6, y: 6, width: W - 12, height: H - 12, color: '#e2e8f0' });
    furniture.push({ type: 'carpet', x: 12, y: 12, width: 40, height: 30, angle: 0, color: '#1e293b' }); // display pad
    furniture.push({ type: 'desk_reception', x: W - 40, y: 20, width: 30, height: 10, angle: 0, color: '#0284c7' });
  } else if (bld.type === 'sports_stadium') {
    rooms.push({ name: 'Спортивный Зал', x: 6, y: 6, width: W - 12, height: H - 12, color: '#d97706' }); // wood floor
    furniture.push({ type: 'carpet', x: W/2 - 30, y: H/2 - 20, width: 60, height: 40, angle: 0, color: '#15803d' }); // field/mat
  } else {
    // Default fallback interior layout
    rooms.push({ name: 'Помещение', x: 6, y: 6, width: W - 12, height: H - 12, color: '#1e293b' });
    furniture.push({ type: 'table', x: W / 2 - 10, y: H / 2 - 8, width: 20, height: 16, angle: 0, color: '#a16207' });
    furniture.push({ type: 'chair', x: W / 2 - 8, y: H / 2 - 14, width: 4, height: 4, angle: 0, color: '#451a03' });
  }

  // 3. ADD COARSE WALL COLLISION OUTLINES (BUILDING EDGES AND MAIN INNER DIVIDERS)
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
    elevatorZone,
    stairsZone,
    exitZone
  };
}
`

fs.writeFileSync('src/buildingInteriors.ts', head + '\n' + newFunc + '\n' + tail);
