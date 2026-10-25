/**
 * ============================================================================
 * ENERGY-BASED VEHICLE DAMAGE MODEL (чистая математика, без зависимостей)
 * ============================================================================
 *
 * Единицы системы:
 *   - длина: px. Калибровка масштаба: седан 42 px ≈ 4.4 м реального автомобиля,
 *     поэтому 1 px ≈ 0.105 м (см. PX_TO_METERS).
 *   - скорость: px/s (50 км/ч = 222.2 px/s, см. SPEED_KMH_TO_PX_S).
 *   - масса: условные кг (седан 1400).
 *   - энергия: mass · px²/s².
 *
 * Идея модели (без «если скорость маленькая то не мнём»):
 *
 *   1. Приведённая масса   mu = m1·m2 / (m1 + m2)
 *      Для стены/столба m2 → ∞, поэтому mu → mass автомобиля.
 *   2. Поглощённая энергия E = ½ · mu · v_n², где v_n — нормальная
 *      (к контакту) составляющая скорости. Касательная составляющая —
 *      это царапины/скольжение, а не деформация.
 *   3. Тяжесть удара       severity = 1 − exp(−E / E_REF)
 *      E_REF подобран так, чтобы совпасть со старой скоростной кривой
 *      в диапазоне 20–80 км/ч (50 км/ч в жёсткий столб → severity ≈ 0.39),
 *      поэтому все пороги компонентов (радиатор, капот, двигатель)
 *      сохраняют смысл.
 *   4. Глубина деформации  d = E / F_zone  (жёстко-пластичная конструкция:
 *      силовая структура деформируется на постоянной средней силе F_zone,
 *      работа = F · d).
 *      Зона деформации переда/зада ограничена её реальной длиной
 *      (L = 0.17 · длина кузова спереди ≈ 0.75 м), бока — толщиной двери.
 *      Когда энергии не хватает на зону — остаётся в пределах зоны;
 *      когда зона исчерпана — остаток энергии идёт во вмятину кабины
 *      с силой в CABIN_FORCE_MULT раз выше (перегородка/дверные балки).
 *
 * Результат (см. scripts/damageCalibration.ts): на 50 км/ч в столб спереди
 * уходит ≈ 6.3 px (66 см), в стену ≈ 4.6 px (49 см) — узкое препятствие
 * продавливает глубже за счёт конуса вовлечения (CONE_SPREAD); бок в столб
 * ≈ 7.8 px, бок в стену ≈ 6.0 px. Прежние 16 px (1.7 м, «съедало половину
 * машины») остались в прошлом.
 */

/** Направление зоны деформации. */
export type ImpactZone = 'front' | 'rear' | 'side';

/** Метров на пиксель (калибровка: 42 px седан = 4.4 м). */
export const PX_TO_METERS = 0.105;
/** Пикселей на метр. */
export const METERS_TO_PX = 1.0 / PX_TO_METERS;

/**
 * опорная энергия тяжёлого удара (масса · px²/s²).
 * 50 км/ч в жёсткий столб: E = strikeEnergy(1400, 14000, 222) ≈ 28.5e6 →
 * severity = 1 − exp(−28.5/64) ≈ 0.36 — совпадает со старой кривой (0.39).
 */
const SEVERITY_ENERGY_REF = 64_000_000;

/** Жёсткость кабины (перегородка, пороги, дверные балки) относительно зоны. */
const CABIN_FORCE_MULT = 2.5;

/** Доля зоны деформации, доступная для вмятины кабины после исчерпания зоны. */
const DEFAULT_INTRUSION_ZONE_FRACTION = 0.70;
/** То же для экстремальных ударителей (поезд): кабина продавливается глубже. */
const EXTREME_INTRUSION_ZONE_FRACTION = 1.0;

/** Средние силы деформации структуры, игровые единицы.
 *  Вывод (калибровка на реальные данные):
 *    перед: 50 км/ч (E ≈ 28.5e6) в широкую стену → ≈ 0.49 м (4.6 px),
 *           в узкий столб (w=6.4) → ≈ 0.66 м (6.3 px) → F ≈ 6.0e6
 *           (реальная сила развала лонжеронов ≈ 200–250 кН);
 *    side:  F = 4.6e6: бок в стену на 50 км/ч ≈ 6.0 px (0.63 м),
 *           бок в столб ≈ 7.8 px (вмятина в кабину — столб входит
 *           в салон глубже широкого препятствия);
 *    зад:   багажник короче и чуть жёстче бампера. */
const MEAN_FORCE: Record<ImpactZone, number> = {
  front: 6_000_000,
  rear: 5_400_000,
  side: 4_600_000
};

/**
 * Скорость вовлечения соседней структуры при продавливании (конус ≈ ±56°).
 *
 * Узкое препятствие (столб, мачта) сразу нагружает только узкую полосу
 * кузова, поэтому на ту же энергию продавливается глубже; по мере глубины
 * в работу включается и соседний металл, и сопротивление растёт до
 * полной ширины зоны (для стены/широкого препятствия конуса нет — вся
 * конструкция включена с первого пикселя).
 *
 *   w(x) = min(carWidth, contactWidth + 2·CONE_SPREAD·x)
 *   E(D) = F/carWidth · ∫₀ᴰ w(x) dx
 */
const CONE_SPREAD = 1.5;

/** Длина зоны деформации, px (доля от габаритов кузова). */
const ZONE_LENGTH: Record<ImpactZone, (c: { length: number; width: number }) => number> = {
  // Передняя зона (бампер + лонжероны + моторный отсек до перегородки салона):
  // реальный вылет передней части седана/универсала ≈ 1.3–1.6 м → 0.28–0.32 · длина кузова.
  front: (c) => c.length * 0.28,
  // Задняя зона (бампер + лонжероны багажника): реальный вылет багажника ≈ 0.8–1.0 м → 0.18 · длина кузова.
  rear: (c) => c.length * 0.18,
  // Боковая зона — ход деформации двери до центрального тоннеля: ≈ 0.65 · половины ширины.
  side: (c) => (c.width / 2) * 0.65
};

export interface CrushInput {
  /** Поглощённая энергия удара (crashEnergy). */
  energy: number;
  zone: ImpactZone;
  length: number;
  width: number;
  /**
   * Ширина пятна контакта препятствия, px (по нормали удара).
   * Узкий столб → глубже на ту же энергию; стена/широкий объект → не
   * передаётся (равно ширине кузова — конус не работает, как раньше).
   */
  contactWidthPx?: number;
  /** Множитель жёсткости структуры (>1 — тяжёлые рамы: грузовики, техника). */
  structureStiffness?: number;
  /** Доля зоны под вмятину кабины (по умолчанию 0.45, для поезда 1.0). */
  intrusionZoneFraction?: number;
  /** Жёсткий потолок длины зоны (для дорожной техники и прицепов ≈ 3.5 px). */
  maxZoneLengthPx?: number;
  /** Глубина, уже накопленная в этой зоне прежними ударами, px. */
  existingDepthPx?: number;
}

/**
 * Множитель силы после исчерпания зоны: перегородка/пороги/двигатель вступают в работу,
 * сила растёт от CABIN_FORCE_MULT до CABIN_FORCE_MULT·CABIN_HARDENING к концу хода кабины.
 */
const CABIN_HARDENING = 2.0;
/** Множитель силы при полностью сжатой конструкции (блок двигателя, кабина): достигается на длине ещё одной зоны за потолком. */
const RIGID_FORCE_MULT = 40.0;
/** Шаг табличного интегрирования работы деформации, px. */
const PROFILE_STEP_PX = 0.05;

/**
 * Профиль «сила — смятие» конкретного препятствия и кузова.
 *
 * Раньше глубина считалась как E/F_const и упиралась в потолок: 80, 110 и 150 км/ч мялись
 * одинаково, а остаток энергии просто пропадал. Здесь сила растёт с ходом (зона → кабина →
 * упор), поэтому глубина монотонно растёт с энергией до предела конструкции, а торможение
 * машины по ходу удара определяется той же кривой (a = F(d)/m) — энергия сохраняется.
 */
export interface CrushProfile {
  zoneLengthPx: number;
  totalCapPx: number;
  /** Мгновенная сила сопротивления на глубине d, mass·px/s². */
  force(depth: number): number;
  /** Работа деформации от 0 до d, mass·px²/s². */
  work(depth: number): number;
  /** Глубина, на которой накопленная работа достигает energy. */
  depthForEnergy(energy: number): number;
}

export function createCrushProfile(input: Omit<CrushInput, 'energy'>): CrushProfile {
  const zoneLength = ZONE_LENGTH[input.zone]({ length: input.length, width: input.width });
  const zoneLen = input.maxZoneLengthPx !== undefined
    ? Math.min(zoneLength, input.maxZoneLengthPx)
    : zoneLength;
  const intrusionFraction = input.intrusionZoneFraction ?? DEFAULT_INTRUSION_ZONE_FRACTION;
  let cap = zoneLen * (1.0 + intrusionFraction);
  // Бок: вмятина не уходит дальше оси кузова (иначе узлы двух бортов «проходят» друг сквозь друга)
  if (input.zone === 'side') cap = Math.min(cap, input.width * 0.48);
  const meanForce = MEAN_FORCE[input.zone] * (input.structureStiffness ?? 1.0);
  const carWidth = input.width;
  const contact = Math.min(carWidth, Math.max(1, input.contactWidthPx ?? carWidth));

  const force = (d: number): number => {
    // Конус вовлечения: узкое препятствие нагружает всё более широкую полосу кузова.
    const wFrac = Math.min(1, (contact + 2 * CONE_SPREAD * Math.max(0, d)) / carWidth);
    let stage = 1.0;
    if (d > cap) {
      // Кабина и блок двигателя сжаты до предела: сила продолжает расти по мере «досжатия»
      // (резкий скачок до «абсолютного» упора давал физически невозможные перегрузки).
      const t = Math.min(1, (d - cap) / Math.max(0.001, zoneLen));
      stage = CABIN_FORCE_MULT * CABIN_HARDENING * (1.0 + (RIGID_FORCE_MULT / (CABIN_FORCE_MULT * CABIN_HARDENING) - 1.0) * t);
    } else if (d > zoneLen) {
      const t = (d - zoneLen) / Math.max(0.001, cap - zoneLen);
      stage = CABIN_FORCE_MULT * (1.0 + (CABIN_HARDENING - 1.0) * t);
    }
    return meanForce * wFrac * stage;
  };

  // Таблица накопленной работы до 1.5·cap (дальше упор настолько жёсткий, что ход ничтожен).
  const maxDepth = cap * 1.5 + 1.0;
  const n = Math.ceil(maxDepth / PROFILE_STEP_PX);
  const table = new Float64Array(n + 1);
  for (let i = 1; i <= n; i++) {
    const mid = (i - 0.5) * PROFILE_STEP_PX;
    table[i] = table[i - 1] + force(mid) * PROFILE_STEP_PX;
  }

  const work = (d: number): number => {
    if (d <= 0) return 0;
    const f = d / PROFILE_STEP_PX;
    const i = Math.floor(f);
    if (i >= n) return table[n] + force(maxDepth) * (d - n * PROFILE_STEP_PX);
    return table[i] + (table[i + 1] - table[i]) * (f - i);
  };

  const depthForEnergy = (e: number): number => {
    if (!(e > 0)) return 0;
    if (e >= table[n]) return n * PROFILE_STEP_PX + (e - table[n]) / force(maxDepth);
    let lo = 0;
    let hi = n;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (table[mid] <= e) lo = mid; else hi = mid;
    }
    const span = table[lo + 1] - table[lo];
    const frac = span > 0 ? (e - table[lo]) / span : 0;
    return (lo + frac) * PROFILE_STEP_PX;
  };

  return { zoneLengthPx: zoneLen, totalCapPx: cap, force, work, depthForEnergy };
}

/**
 * Один кадр хода смятия: тормозит машину силой F(d) по пройденной глубине.
 * Скорость и глубина интегрируются подшагами ≤ 0.25 px, чтобы на 150 км/ч (8 px за кадр)
 * не проскакивать зоны разной жёсткости. Закон: v² = v₀² − 2·∫F dd / m.
 */
export function advanceCrushStroke(
  profile: CrushProfile,
  mass: number,
  depth: number,
  speed: number,
  dt: number
): { depth: number; speed: number; stopped: boolean } {
  let d = depth;
  let v = speed;
  let remaining = dt;
  let guard = 0;
  while (remaining > 1e-9 && v > 1e-6 && guard++ < 400) {
    const stepT = Math.min(remaining, 0.25 / v);
    const dd = v * stepT;
    const f = profile.force(d + dd * 0.5);
    const v2 = v * v - (2 * f * dd) / mass;
    if (v2 <= 0) {
      // Остановка внутри подшага: остаток пути v²·m/(2F)
      d += (v * v * mass) / (2 * f);
      return { depth: d, speed: 0, stopped: true };
    }
    d += dd;
    v = Math.sqrt(v2);
    remaining -= stepT;
  }
  return { depth: d, speed: v, stopped: v <= 1e-6 };
}

export interface CrushResult {
  /** Длина зоны деформации направления, px. */
  zoneLengthPx: number;
  /** Полный потолок (зона + вмятина кабины), px — предел накопления. */
  totalCapPx: number;
  /** Глубина деформации от данного удара, px (уже ограничена потолком). */
  depthPx: number;
  /** Заполнение зоны деформации (глубина / длина зоны), может быть > 1. */
  fill: number;
}

/** Приведённая масса двух тел: mu = m1·m2/(m1+m2). Для стены mu → m1. */
export function reducedMass(m1: number, m2: number): number {
  if (m1 <= 0 || m2 <= 0) return 0;
  return (m1 * m2) / (m1 + m2);
}

/** Кинетическая энергия, поглощаемая при нормальном ударе v_n. */
export function crashEnergy(mu: number, normalSpeedPxS: number): number {
  return 0.5 * mu * normalSpeedPxS * normalSpeedPxS;
}

/**
 * Энергия, идущая в деформацию ИМЕННО ЭТОГО автомобиля.
 *
 * В центре масс обе тела теряют скорость до общей, поэтому собственная
 * кинетическая энергия кузова, которую нужно поглотить его конструкции:
 *
 *   E_car = ½ · m_car · (v_n · m_s / (m_car + m_s))²
 *
 * - неподвижное препятствие (m_s → ∞): доля → 1, E = ½ · m_car · v_n²;
 *   всё поглощает кузов;
 * - две одинаковые машины лоб в лоб: доля → ½, каждая поглощает четверть
 *   энергии удара на свою долю (эквивалент удара о стену со скоростью
 *   v/2) — иначе обе машины считали бы себя поглотителями всей системы
 *   и мнутся вдвое сильнее, чем в реальности.
 */
export function strikeEnergy(carMass: number, strikerMass: number, normalSpeedPxS: number): number {
  if (!(carMass > 0)) return 0;
  const share = strikerMass > 0 ? strikerMass / (carMass + strikerMass) : 1;
  const effectiveSpeed = normalSpeedPxS * share;
  return 0.5 * carMass * effectiveSpeed * effectiveSpeed;
}

/** Тяжесть удара [0..1] из поглощённой энергии. */
export function severityFromEnergy(energy: number): number {
  if (!(energy > 0)) return 0;
  return Math.max(0, Math.min(1, 1.0 - Math.exp(-energy / SEVERITY_ENERGY_REF)));
}

/** Длина зоны деформации направления, px. */
export function zoneLengthPx(
  car: { length: number; width: number },
  zone: ImpactZone
): number {
  return ZONE_LENGTH[zone](car);
}

/** Полный потолок (зона + кабина) для направления, px. */
export function totalCapPx(
  car: { length: number; width: number },
  zone: ImpactZone,
  intrusionZoneFraction: number = DEFAULT_INTRUSION_ZONE_FRACTION
): number {
  const cap = zoneLengthPx(car, zone) * (1.0 + intrusionZoneFraction);
  return zone === 'side' ? Math.min(cap, car.width * 0.48) : cap;
}

/**
 * Глубина деформации от удара с энергией `energy` в зону `zone`.
 *
 * Работа = F · d → d = E / F для широкого препятствия (стена: вся зона
 * включена сразу). Для узкого (столб, мачта) ширина вовлечённой
 * конструкции растёт конусом от contactWidthPx до полной ширины кузова,
 * поэтому на ту же энергию глубина больше (см. CONE_SPREAD).
 *
 * Замкнутое решение:
 *   до насыщения:  s·D² + w·D − E·carWidth/F = 0
 *   после:         D = D_sat + (E − E_sat)/F
 * где D_sat = (carWidth − w)/(2s) — глубина, на которой конус догоняет
 * всю ширину кузова.
 */
export function crushFromEnergy(input: CrushInput): CrushResult {
  const profile = createCrushProfile(input);
  const existing = Math.max(0, Math.min(profile.totalCapPx, input.existingDepthPx ?? 0));

  // Повторный удар в ту же зону: уже смятый металл «не работает», новая энергия
  // продвигает ход дальше по кривой силы (работа от existing до нового d).
  const target = profile.depthForEnergy(input.energy + profile.work(existing));
  const depth = Math.max(0, Math.min(profile.totalCapPx, target) - existing);

  return {
    zoneLengthPx: profile.zoneLengthPx,
    totalCapPx: profile.totalCapPx,
    depthPx: depth,
    fill: profile.zoneLengthPx > 0 ? depth / profile.zoneLengthPx : 0
  };
}

/**
 * Зона деформации для узла softbody-сетки: капот/багажник/бамперы — по типу
 * структуры, остальное — по положению узла вдоль кузова.
 */
export function nodeZone(
  localX: number,
  structuralType: string | undefined,
  halfL: number
): ImpactZone {
  if (structuralType === 'hood') return 'front';
  if (structuralType === 'trunk') return 'rear';
  if (structuralType === 'bumper') return localX >= 0 ? 'front' : 'rear';
  return Math.abs(localX) >= halfL * 0.55 ? (localX > 0 ? 'front' : 'rear') : 'side';
}

/**
 * Разложение скорости на нормальную (к контакту, сжатие металла) и
 * касательную (скольжение). normalApproach ≥ 0 — скорость сближения.
 */
export function normalAndTangential(
  vx: number,
  vy: number,
  normalX: number,
  normalY: number
): { normalApproach: number; tangential: number } {
  const intoNormal = vx * normalX + vy * normalY;
  return {
    normalApproach: Math.max(0, -intoNormal),
    tangential: vx * -normalY + vy * normalX
  };
}
