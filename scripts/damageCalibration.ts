/**
 * Стенд калибровки модели урона: «было» (старые формулы из physics.ts)
 * против «стало» (src/damageModel.ts).
 *
 * Запуск:  npx tsx scripts/damageCalibration.ts
 *
 * Седан: 42 x 20 px, масса 1400. 1 px ≈ 0.105 м.
 * Столб = неразрушимый проп (strikerMass 14000), стена = здание (12000),
 * встречка = автомобиль той же массы (1400).
 */
import {
  CrushResult,
  crushFromEnergy,
  severityFromEnergy,
  strikeEnergy,
  zoneLengthPx,
  totalCapPx
} from '../src/damageModel';

const PX_S_TO_SPEED_KMH = 0.225;
const SPEED_KMH_TO_PX_S = 1 / PX_S_TO_SPEED_KMH;

const CAR = { length: 42, width: 20, mass: 1400 };
const halfL = CAR.length / 2;
const halfW = CAR.width / 2;

// ---------------------------------------------------------------------------
// LEGACY (старая логика physics.ts — воспроизведена для сравнения)
// ---------------------------------------------------------------------------
function legacySeverity(vKmh: number, strikerMass: number) {
  const rmr = Math.max(0.25, Math.min(4.0, (2.0 * strikerMass) / (CAR.mass + strikerMass)));
  const speedNorm = Math.max(0, vKmh - 5.0) / 85.0;
  return Math.max(0, Math.min(1, 1.0 - Math.exp(-Math.pow(speedNorm, 1.6) * Math.sqrt(rmr))));
}

function legacyPush(vKmh: number, strikerMass: number) {
  const rmr = Math.max(0.25, Math.min(4.0, (2.0 * strikerMass) / (CAR.mass + strikerMass)));
  return Math.min(35.0, Math.pow(Math.max(0, vKmh - 5.0) / 75.0, 1.5) * 16.0 * Math.sqrt(rmr));
}

function legacySoftbodyTargets(vKmh: number, strikerMass: number) {
  const push = legacyPush(vKmh, strikerMass);
  const frontCap = Math.min(halfL * 0.78, Math.max(7.0, halfL * 0.78)); // узел спереди
  const doorCap = Math.min(halfW * 0.72, Math.max(6.0, halfW * 0.68));   // узел двери
  return {
    front: Math.min(frontCap, push / 0.55), // structStiffness бампера 0.55
    side: Math.min(doorCap, push / 0.65)    // structStiffness двери 0.65
  };
}

function legacyScalarCaps() {
  return {
    front: halfL * 0.65,
    rear: halfL * 0.52,
    side: halfW * 0.58
  };
}

// ---------------------------------------------------------------------------
// NEW (энергомодель + форма препятствия: contactWidthPx → конус вовлечения)
// ---------------------------------------------------------------------------
function newCrush(
  vKmh: number,
  strikerMass: number,
  zone: 'front' | 'rear' | 'side',
  contactWidthPx?: number
): CrushResult {
  const E = strikeEnergy(CAR.mass, strikerMass, vKmh / PX_S_TO_SPEED_KMH);
  return crushFromEnergy({
    energy: E,
    zone,
    length: CAR.length,
    width: CAR.width,
    contactWidthPx
  });
}

function newSeverity(vKmh: number, strikerMass: number) {
  return severityFromEnergy(strikeEnergy(CAR.mass, strikerMass, vKmh / PX_S_TO_SPEED_KMH));
}

// ---------------------------------------------------------------------------
// contactWidth: столб ЛЭП r=3.2 → 6.4 px; стена/широкий объект → ширина кузова
const SCENARIOS: { name: string; striker: number; contactWidth?: number }[] = [
  { name: 'столб (w=6.4)', striker: 14000, contactWidth: 6.4 },
  { name: 'стена  (w=20)', striker: 12000 },
  { name: 'встречка(1400)', striker: 1400 }
];
const SPEEDS = [15, 25, 35, 50, 80, 110];
const caps = legacyScalarCaps();

const cm = (px: number) => `${(px * 10.5).toFixed(0)} см`;
const f2 = (n: number) => n.toFixed(2);

console.log('='.repeat(116));
console.log('КАЛИБРОВКА УРОНА — седан 42x20 px (1 px ≈ 10.5 см), масса 1400');
console.log('Лоб в жёсткое препятствие (зона переда: ' + f2(zoneLengthPx(CAR, 'front')) + ' px, потолок ' + f2(totalCapPx(CAR, 'front')) + ' px)');
console.log('='.repeat(116));
console.log(
  'км/ч | сценарий       | sev было/стало | ПЕРЕД было → стало (px, см)        | ПОТОЛОК зоны | БОК было → стало (px, см)'
);
console.log('-'.repeat(116));

for (const s of SCENARIOS) {
  for (const v of SPEEDS) {
    const sevOld = legacySeverity(v, s.striker);
    const sevNew = newSeverity(v, s.striker);
    const leg = legacySoftbodyTargets(v, s.striker);
    const nf = newCrush(v, s.striker, 'front', s.contactWidth);
    const ns = newCrush(v, s.striker, 'side', s.contactWidth);

    console.log(
      `${String(v).padStart(4)} | ${s.name.padEnd(14)} | ${f2(sevOld)} → ${f2(sevNew)}     | ` +
      `${f2(leg.front).padStart(5)} px ${cm(leg.front).padStart(8)} → ${f2(nf.depthPx).padStart(5)} px ${cm(nf.depthPx).padStart(8)} | ` +
      `${f2(nf.totalCapPx).padStart(5)} px       | ` +
      `${f2(leg.side).padStart(4)} px ${cm(leg.side).padStart(8)} → ${f2(ns.depthPx).padStart(4)} px ${cm(ns.depthPx).padStart(8)}`
    );
  }
  console.log('-'.repeat(116));
}

console.log('');
console.log('Старые скалярные капы (frontCrumple/leftDent): ' +
  `front ${f2(caps.front)} px (${cm(caps.front)}), rear ${f2(caps.rear)} px (${cm(caps.rear)}), side ${f2(caps.side)} px (${cm(caps.side)})`);
console.log('Новые капы зон + кабина:                        ' +
  `front ${f2(totalCapPx(CAR, 'front'))} px (${cm(totalCapPx(CAR, 'front'))}), ` +
  `rear ${f2(totalCapPx(CAR, 'rear'))} px (${cm(totalCapPx(CAR, 'rear'))}), ` +
  `side ${f2(totalCapPx(CAR, 'side'))} px (${cm(totalCapPx(CAR, 'side'))})`);
console.log('');
console.log('Контрольные точки (лоб в столб ЛЭП, w=6.4):');
for (const v of [20, 35, 50, 80, 110]) {
  const nf = newCrush(v, 14000, 'front', 6.4);
  const sev = newSeverity(v, 14000);
  const parts: string[] = [];
  if (sev > 0.25 || nf.depthPx > 2.0) parts.push('радиатор');
  if (sev > 0.45 || nf.depthPx > 5.0) parts.push('капот гнётся');
  if (nf.depthPx > 6.0) parts.push('лобовое трескается');
  if (nf.depthPx > 7.5) parts.push('капот срывает');
  if (nf.depthPx > nf.zoneLengthPx) parts.push('ЗОНА ИСЧЕРПАНА → кабина');
  console.log(`  ${v} км/ч: depth ${f2(nf.depthPx)} px (${cm(nf.depthPx)}), severity ${f2(sev)}, зона ${f2(nf.zoneLengthPx)} px` +
    (parts.length ? ` — ${parts.join(', ')}` : ' — только бампер/царапины'));
}
