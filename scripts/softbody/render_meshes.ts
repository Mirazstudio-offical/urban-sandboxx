/**
 * Рисует сетки автомобилей в один SVG (контур, кожа, каркас, шасси, замки) для визуальной проверки.
 * Запуск: npx tsx scripts/softbody/render_meshes.ts <out.svg>
 */
import * as fs from 'fs';
import { MASTER_VEHICLE_CONFIGS } from '../../src/vehicleMasterRegistry';
import { generateBodyMesh } from '../../src/meshes/bodyMeshGenerator';
import { getVehicleBasePolygon } from '../../src/vehicleArchetypes';
import { CarType } from '../../src/types';

const OUT = process.argv[2] ?? 'meshes.svg';
const CELL = 300, COLS = 4, PAD = 24;

const bodyVehicles = (Object.keys(MASTER_VEHICLE_CONFIGS) as CarType[]).filter(
  t => !MASTER_VEHICLE_CONFIGS[t].chassisAnatomy.specialPreset
);

const rows = Math.ceil(bodyVehicles.length / COLS);
const W = COLS * CELL, H = rows * CELL;
const COLOR = { ring: '#0ea5e9', frame: '#6366f1', chassis: '#f97316', latch: '#dc2626', rail: '#16a34a', frameChassis: '#a855f7', chassisLink: '#ea580c', rib: '#94a3b8' } as const;

const parts: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="sans-serif">`,
  `<rect width="${W}" height="${H}" fill="#f8fafc"/>`];

bodyVehicles.forEach((carType, idx) => {
  const cfg = MASTER_VEHICLE_CONFIGS[carType];
  const a = cfg.chassisAnatomy;
  const { def } = generateBodyMesh({
    presetId: carType,
    name: cfg.nameRu || cfg.name,
    repType: carType,
    length: cfg.length,
    width: cfg.width,
    xNose: a.xNose ?? 0.50,
    xCowl: a.xCowl ?? 0.15,
    xA: a.xA ?? 0.07,
    xB: a.xB ?? -0.03,
    xC: a.xC ?? -0.12,
    xRearHeader: a.xRearHeader ?? -0.21,
    xTail: a.xTail ?? -0.50,
    xFrontAxle: a.xFrontAxle ?? 0.29,
    xRearAxle: a.xRearAxle ?? -0.28,
    xEngine: a.xEngine ?? 0.21,
    xCore: a.xCore ?? -0.02,
    frameRatio: a.frameRatio,
    railRatio: a.railRatio,
    frameMaxHalfWidth: a.frameMaxHalfWidth
  });
  const poly = getVehicleBasePolygon({ type: carType } as any, cfg.length / 2, cfg.width / 2, 0, 0, 0, 0, 0, 0, 0, 0);
  const cx = (idx % COLS) * CELL + CELL / 2, cy = Math.floor(idx / COLS) * CELL + CELL / 2 + 8;
  const scale = (CELL - 2 * PAD) / Math.max(cfg.length, cfg.width * 2.2);
  const T = (x: number, y: number) => [cx + x * scale, cy - y * scale] as const;
  parts.push(`<text x="${cx - CELL / 2 + 8}" y="${cy - CELL / 2 + 16}" font-size="12" fill="#0f172a">${cfg.nameRu || cfg.name}</text>`);
  parts.push(`<text x="${cx - CELL / 2 + 8}" y="${cy - CELL / 2 + 30}" font-size="10" fill="#64748b">скин ${def.perimeterCount}, всего узлов ${def.nodes.length}, балок ${def.beams.length}</text>`);
  // контур модели
  parts.push(`<polygon points="${poly.map(p => T(p.x, p.y).join(',')).join(' ')}" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>`);
  // балки
  for (const b of def.beams) {
    const A = def.nodes[b.nodeA], B = def.nodes[b.nodeB];
    const pa = T(A.xFrac * cfg.length, A.yFrac * cfg.width), pb = T(B.xFrac * cfg.length, B.yFrac * cfg.width);
    let color: string = COLOR.rib, dash = '', w = 0.9;
    if (b.type === 'latch') { color = COLOR.latch; dash = ' stroke-dasharray="2,1.5"'; w = 1.2; }
    else if (b.type === 'chassis_rail') { color = COLOR.chassis; w = 1.2; }
    else if (b.type === 'support') { color = COLOR.frameChassis; w = 1; }
    else if (b.nodeA < def.perimeterCount && b.nodeB < def.perimeterCount) { color = COLOR.ring; w = 1.4; }
    else if (A.group === 'subframe' || A.group === 'engine' || A.group === 'chassis_core' || B.group === 'subframe' || B.group === 'engine' || B.group === 'chassis_core') { color = COLOR.chassis; }
    else if (A.name?.startsWith('Frame') || B.name?.startsWith('Frame')) { color = COLOR.frame; w = 1.1; }
    parts.push(`<line x1="${pa[0].toFixed(1)}" y1="${pa[1].toFixed(1)}" x2="${pb[0].toFixed(1)}" y2="${pb[1].toFixed(1)}" stroke="${color}" stroke-width="${w}"${dash}/>`);
  }
  // узлы
  for (let i = 0; i < def.nodes.length; i++) {
    const n = def.nodes[i];
    const p = T(n.xFrac * cfg.length, n.yFrac * cfg.width);
    const r = i < def.perimeterCount ? 1.4 : n.isFixed ? 2.4 : 1.8;
    const col = n.isFixed ? '#dc2626' : i < def.perimeterCount ? '#0ea5e9' : n.group === 'engine' ? '#f59e0b' : '#334155';
    parts.push(`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r}" fill="${col}"/>`);
  }
});
parts.push('</svg>');
fs.writeFileSync(OUT, parts.join('\n'));
console.log(`Rendered ${bodyVehicles.length} vehicle meshes to ${OUT}`);
