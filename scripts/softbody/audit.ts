/**
 * Проверка softbody-сеток по всем семействам: пересечения балок, балки вне контура,
 * связи через кузов, изолированные узлы, отказные (не добавленные) связи.
 * Запуск: npx tsx scripts/softbody/audit.ts
 */
import { BODY_FAMILIES } from '../../src/meshes/bodyFamilies';
import { generateBodyMesh } from '../../src/meshes/bodyMeshGenerator';

let bad = 0;
for (const spec of BODY_FAMILIES) {
  const { report: r } = generateBodyMesh(spec);
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
console.log(bad === 0 ? '\nALL FAMILIES CLEAN' : `\n${bad} FAMILIES WITH ISSUES`);
process.exitCode = bad === 0 ? 0 : 1;
