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
const DEFAULT_INTRUSION_ZONE_FRACTION = 0.45;
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
  // Передняя зона (бампер + лонжероны + моторный отсек до перегородки):
  // реальный вылет передней части ≈ 0.7–0.9 м → 0.17 · длина кузова.
  front: (c) => c.length * 0.17,
  // Задняя зона (бампер + лонжероны багажника): реальный вылет ≈ 0.55–0.7 м.
  rear: (c) => c.length * 0.13,
  // Боковая зона — ход деформации двери до кабины: ≈ 0.7 · половины ширины.
  side: (c) => (c.width / 2) * 0.70
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
  return zoneLengthPx(car, zone) * (1.0 + intrusionZoneFraction);
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
  const zoneLength = ZONE_LENGTH[input.zone]({ length: input.length, width: input.width });
  const zoneLengthPxClamped = input.maxZoneLengthPx !== undefined
    ? Math.min(zoneLength, input.maxZoneLengthPx)
    : zoneLength;
  const intrusionFraction = input.intrusionZoneFraction ?? DEFAULT_INTRUSION_ZONE_FRACTION;
  const totalCap = zoneLengthPxClamped * (1.0 + intrusionFraction);

  const meanForce = MEAN_FORCE[input.zone] * (input.structureStiffness ?? 1.0);
  let depth = totalCap;
  if (meanForce > 0) {
    const carWidth = input.width;
    // Пятно контакта зажато в (0; ширина кузова].
    const contact = Math.min(carWidth, Math.max(1, input.contactWidthPx ?? carWidth));

    if (contact >= carWidth) {
      // Широкое препятствие: вся конструкция работает с первого пикселя.
      depth = input.energy / meanForce;
    } else {
      // Глубина насыщения конуса и энергия, затраченная на неё.
      const depthSat = (carWidth - contact) / (2 * CONE_SPREAD);
      const energySat = (meanForce / carWidth) *
        (contact * depthSat + CONE_SPREAD * depthSat * depthSat);
      if (input.energy <= energySat) {
        // s·D² + w·D − E·carWidth/F = 0
        const c = (input.energy * carWidth) / meanForce;
        depth = (-contact + Math.sqrt(contact * contact + 4 * CONE_SPREAD * c)) /
          (2 * CONE_SPREAD);
      } else {
        depth = depthSat + (input.energy - energySat) / meanForce;
      }
    }
    depth = Math.min(totalCap, depth);
  }

  return {
    zoneLengthPx: zoneLengthPxClamped,
    totalCapPx: totalCap,
    depthPx: depth,
    fill: zoneLengthPxClamped > 0 ? depth / zoneLengthPxClamped : 0
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
