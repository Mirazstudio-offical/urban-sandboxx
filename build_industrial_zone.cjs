const fs = require('fs');
const map = JSON.parse(fs.readFileSync('public/map.json', 'utf8'));

// 1. Provincial & Municipal building names and realistic colors
const bldNames = {
  'ind_term_main_7_0': { name: 'Районный Элеватор и Зерноток «Степной»', color: '#78350f', roofColor: '#451a03' },
  'ind_hub_main_8_0': { name: 'Склады Материально-Технического снабжения', color: '#334155', roofColor: '#1e293b' },
  'ind_hub_annex_8_0': { name: 'Контрольно-пропускной пункт и весовая', color: '#475569', roofColor: '#334155' },
  'ind_mfg_n_9_0': { name: 'Деревообрабатывающий цех и Сельская лесопилка', color: '#92400e', roofColor: '#78350f' },
  'ind_mfg_s_9_0': { name: 'Склад пиломатериалов и готовых изделий', color: '#b45309', roofColor: '#92400e' },
  'ind_atp_main_7_1': { name: 'База ЖКХ и МУП «Благоустройство» (Спецавтобаза)', color: '#0369a1', roofColor: '#075985' },
  'ind_term_main_8_1': { name: 'Районная Машинно-Тракторная Станция (МТС)', color: '#1e3a8a', roofColor: '#172554' },
  'ind_hub_main_9_1': { name: 'Районная Заготовительная База и Склады Райпо', color: '#475569', roofColor: '#334155' },
  'ind_hub_annex_9_1': { name: 'Диспетчерская служба ЖКХ и учет техники', color: '#334155', roofColor: '#1e293b' },
  'ind_mfg_n_7_2': { name: 'Ремонтно-механический цех сельхозтехники', color: '#334155', roofColor: '#1e293b' },
  'ind_mfg_s_7_2': { name: 'Кузнечно-сварочный участок и склад запчастей', color: '#475569', roofColor: '#334155' },
  'ind_atp_main_8_2': { name: 'Дорожно-эксплуатационное управление (ДЭУ №4)', color: '#0f766e', roofColor: '#115e59' },
  'ind_term_main_9_2': { name: 'Склад удобрений и Сельхозхимия', color: '#57534e', roofColor: '#44403c' },
  'ind_hub_main_7_3': { name: 'Авторемонтные Мастерские (СТО Спецтехники)', color: '#334155', roofColor: '#1e293b' },
  'ind_hub_annex_7_3': { name: 'Администрация МУП и Служба быта', color: '#475569', roofColor: '#334155' },
  'ind_mfg_n_8_3': { name: 'Завод железобетонных изделий и стройматериалов', color: '#57534e', roofColor: '#44403c' },
  'ind_mfg_s_8_3': { name: 'Формовочный цех и склад ЖБИ-плит', color: '#78716c', roofColor: '#57534e' },
  'ind_atp_main_9_3': { name: 'Сельская автобаза грузового транспорта', color: '#334155', roofColor: '#1e293b' },
};

map.buildings.forEach(bld => {
  if (bldNames[bld.id]) {
    bld.name = bldNames[bld.id].name;
    bld.color = bldNames[bld.id].color;
    bld.roofColor = bldNames[bld.id].roofColor;
    bld.type = 'industrial';
  }
});

// 2. Filter existing props: preserve lamps and clean up props
const preservedProps = map.props.filter(p => {
  if (p.id === 'v_flower_6_6_1') {
    p.y = 4898;
    return true;
  }
  const inIndZone = p.x >= 5600 && p.x <= 8000 && p.y >= 0 && p.y <= 3300;
  if (!inIndZone) return true;
  return ['lamp', 'lamp_concrete', 'lamp_highway'].includes(p.type) && !p.id.startsWith('prop_ind_');
});

const newProps = [];
let nextPropId = 90000;

function addProp(type, x, y, angle = 0) {
  newProps.push({
    id: `prop_ind_${nextPropId++}`,
    type,
    x: Math.round(x),
    y: Math.round(y),
    angle: Number(angle.toFixed(3))
  });
}

// Helper: PO-2 concrete fence panels (step = 38px matching visual width)
function addFenceLine(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 10) return;
  const angle = Math.atan2(dy, dx);
  const step = 38;
  const count = Math.max(1, Math.round((dist - step) / step));
  
  const startOffset = (dist - count * step) / 2 + step / 2;
  const ux = dx / dist;
  const uy = dy / dist;
  
  for (let i = 0; i <= count; i++) {
    const d = startOffset + i * step;
    if (d > dist - step / 4) continue;
    const px = x1 + ux * d;
    const py = y1 + uy * d;
    addProp('concrete_fence_po2', px, py, angle);
  }
}

// Helper: Entrance Gate
function addEntranceGate(x, y, angle = 0) {
  addProp('industrial_gate', x, y, angle);
  const perpX = Math.cos(angle + Math.PI / 2);
  const perpY = Math.sin(angle + Math.PI / 2);
  addProp('security_barrier', x + perpX * 38, y + perpY * 38, angle);
  addProp('industrial_sign', x - perpX * 38, y - perpY * 38, angle);
}

// =============================================================
// SECTOR 1: MUNICIPAL UTILITY DEPOT (МУП «Благоустройство»)
// =============================================================
addFenceLine(5854, 904, 6300, 904);
addFenceLine(5854, 1500, 6300, 1500);
addFenceLine(6300, 1500, 6300, 1080);
addEntranceGate(6300, 1000, Math.PI / 2);

addProp('industrial_floodlight', 5875, 925);
addProp('industrial_floodlight', 6285, 925);
addProp('industrial_floodlight', 5875, 1480);
addProp('industrial_floodlight', 6285, 1480);

addProp('industrial_tires', 5885, 980);
addProp('pallet_stack', 5940, 925);
addProp('cable_spool', 5900, 1420, 0.4);

// =============================================================
// SECTOR 2: AGRICULTURAL TRACTOR BASE (МТС «Степная»)
// =============================================================
addFenceLine(7100, 984, 7100, 1510);
addFenceLine(6500, 1510, 7100, 1510);
addFenceLine(6500, 1510, 6500, 1120);
addEntranceGate(6500, 1050, -Math.PI / 2);

addProp('industrial_floodlight', 6515, 1135);
addProp('industrial_floodlight', 7085, 1000);
addProp('industrial_floodlight', 6515, 1495);
addProp('industrial_floodlight', 7085, 1495);

addProp('pallet_stack', 6540, 1010);
addProp('woodpile', 6900, 1460, 0);

// =============================================================
// SECTOR 3: ROAD MAINTENANCE DEPOT (ДЭУ №4)
// =============================================================
addFenceLine(6624, 1704, 7100, 1704);
addFenceLine(6624, 2266, 7100, 2266);
addFenceLine(7100, 2266, 7100, 1860);
addEntranceGate(7100, 1780, Math.PI / 2);

addProp('industrial_floodlight', 6645, 1725);
addProp('industrial_floodlight', 7085, 1725);
addProp('industrial_floodlight', 6645, 2245);
addProp('industrial_floodlight', 7085, 2245);

addProp('concrete_barrier', 6660, 1800, 0);
addProp('scrap_pile', 6660, 2150, 0.5);

// =============================================================
// SECTOR 4: SAWMILL (Лесопилка)
// =============================================================
addFenceLine(7920, 192, 7920, 586);
addFenceLine(7300, 320, 7300, 586);
addEntranceGate(7300, 250, -Math.PI / 2);

addProp('industrial_floodlight', 7315, 335);
addProp('industrial_floodlight', 7905, 210);

addProp('woodpile', 7420, 380, 0);
addProp('woodpile', 7500, 380, 0);

// =============================================================
// SECTOR 5: GRAIN ELEVATOR
// =============================================================
addFenceLine(7920, 1784, 7920, 2280);
addFenceLine(7300, 2280, 7920, 2280);
addFenceLine(7300, 2280, 7300, 1920);
addEntranceGate(7300, 1850, -Math.PI / 2);

addProp('silo_tank', 7720, 1960);
addProp('silo_tank', 7720, 2040);
addProp('pallet_stack', 7380, 1960);

// =============================================================
// SECTOR 6: CONCRETE & BUILDING MATERIALS (ЖБИ)
// =============================================================
addFenceLine(7100, 2644, 7100, 2986);
addFenceLine(6500, 2780, 6500, 2986);
addEntranceGate(6500, 2710, -Math.PI / 2);

addProp('silo_tank', 6600, 2750);
addProp('pallet_stack', 6780, 2720);


// Merge all props
map.props = [...preservedProps, ...newProps];


// 3. MINIMAL & NON-LAGGY VEHICLE SPANS (ONLY 6 VEHICLES TOTAL IN ENTIRE INDUSTRIAL ZONE)
const preservedVehicles = (map.vehicles || []).filter(v => {
  const inIndZone = v.x >= 5600 && v.x <= 8000 && v.y >= 0 && v.y <= 3300;
  return !inIndZone;
});

const newVehicles = [];
let nextVehId = 100;

function addVehicle(type, x, y, angle = 0, isParked = true) {
  let color = '#334155';
  if (type.startsWith('tractor_')) color = '#1e40af';
  else if (type === 'truck_water' || type === 'trailer_barrel') color = '#0284c7';
  else if (type === 'garbage_truck') color = '#15803d';
  else if (type === 'truck_dump') color = '#ea580c';
  else if (type === 'trailer_flatbed_2axle') color = '#475569';
  else if (type === 'truck_flatbed') color = '#1e293b';

  newVehicles.push({
    id: `mup_${type}_${nextVehId++}`,
    type,
    x: Math.round(x),
    y: Math.round(y),
    angle: Number(angle.toFixed(2)),
    isParked,
    color
  });
}

// Spawning ONLY 6 vehicles total across the whole industrial area:
// 1. Tractor MTZ-82 at MUP
addVehicle('tractor_mtz82', 5960, 1020, 0);
// 2. Municipal Water Truck
addVehicle('truck_water', 6080, 1020, 0);
// 3. Water Barrel Trailer
addVehicle('trailer_barrel', 6180, 1020, 0);
// 4. Garbage Truck
addVehicle('garbage_truck', 6020, 1260, 0);
// 5. Utility Dump Truck at DEU
addVehicle('truck_dump', 6720, 1820, Math.PI);
// 6. Timber Flatbed Truck at Sawmill
addVehicle('truck_flatbed', 7450, 280, 0);

map.vehicles = [...preservedVehicles, ...newVehicles];

fs.writeFileSync('public/map.json', JSON.stringify(map, null, 2), 'utf8');
console.log('Successfully updated public/map.json! Industrial vehicles count:', newVehicles.length, '| Total map vehicles:', map.vehicles.length);
