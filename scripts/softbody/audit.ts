/**
 * Проверка softbody-сеток по всем автомобилям: пересечения балок, балки вне контура,
 * связи через кузов, изолированные узлы, отказные (не добавленные) связи.
 * Запуск: npx tsx scripts/softbody/audit.ts
 */
import { MASTER_VEHICLE_CONFIGS } from '../../src/vehicleMasterRegistry';
import { generateBodyMesh } from '../../src/meshes/bodyMeshGenerator';
import { CarType } from '../../src/types';

let bad = 0;
for (const carType of Object.keys(MASTER_VEHICLE_CONFIGS) as CarType[]) {
  const cfg = MASTER_VEHICLE_CONFIGS[carType];
  const a = cfg.chassisAnatomy;
  if (a.specialPreset) continue;
  const { report: r } = generateBodyMesh({
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
  const ok = r.crossings === 0 && r.nodesNearBeams === 0 && r.beamsOutsideBody === 0 &&
             r.skinChords === 0 && r.isolatedNodes === 0 && !r.disconnected && r.rejectedForced.length === 0;
  if (!ok) bad++;
  console.log(
    `${ok ? 'OK ' : 'BAD'} ${r.presetId.padEnd(26)} skin=${r.skinNodes} frame=${r.frameNodes} chassis=${r.chassisNodes} ` +
    `beams=${String(r.beams).padStart(3)} cross=${r.crossings} nearNode=${r.nodesNearBeams} outside=${r.beamsOutsideBody} ` +
    `chords=${r.skinChords} isolated=${r.isolatedNodes} disconnected=${r.disconnected} ` +
    `rejForced=${r.rejectedForced.length} rejOpt=${r.rejectedOptional} maxLen=${r.maxBeamLength.toFixed(1)}`
  );
  for (const s of r.rejectedForced) console.log(`     forced rejected: ${s}`);
}
console.log(bad === 0 ? '\nALL VEHICLES CLEAN' : `\n${bad} VEHICLES WITH ISSUES`);
process.exitCode = bad === 0 ? 0 : 1;
