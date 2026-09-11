import { Vehicle } from './types';

export interface VehicleRenderContext {
  ctx: CanvasRenderingContext2D;
  car: Vehicle;
  halfL: number;
  halfW: number;
  fc: number;
  rc: number;
  cabinX: number;
  cabinL: number;
  cabinW: number;
  deform: (x: number, y: number) => [number, number];
  drawDeformedRect: (x: number, y: number, w: number, h: number, fill: string | CanvasGradient) => void;
  drawDeformedLine: (x1: number, y1: number, x2: number, y2: number, stroke: string, width?: number, isDotted?: boolean) => void;
  drawDeformedCircle: (cx: number, cy: number, r: number, fill: string, stroke?: string, lineWidth?: number) => void;
  nightAlpha: number;
}

/**
 * Computes an authentic 16-point perimeter base polygon matching the true archetype
 * of each vehicle (Sedan with stepped trunk, Wagon with full estate rear, Pickup with cargo bed,
 * Supercar with wedge nose & wide hips, Muscle car with broad front & flared rear quarters,
 * Boxy 4x4, Van, Microcar, etc.)
 */
function getVehicleBasePolygonRaw(
  car: Vehicle,
  halfL: number,
  halfW: number,
  fc: number,
  rc: number,
  ld: number,
  rd: number,
  fld: number,
  frd: number,
  rld: number,
  rrd: number
): { x: number; y: number }[] {
  const type = car.type;

  // 1. SEDANS (3-Box Notchback: Defined front hood/fenders, slight door waist, distinct rectangular stepped trunk)
  const isSedan = type === 'sedan' || type === 'sedan_classic' || type === 'sedan_luxury' || 
                  type === 'sedan_compact' || type === 'classic_compact' || type === 'taxi' || 
                  type === 'police';

  if (isSedan) {
    return [
      { x: halfL - fc, y: 0 },
      { x: halfL - fc - 0.8, y: halfW * 0.72 },
      { x: halfL - frd - 2.8, y: halfW - frd * 0.35 - 0.4 },
      { x: halfL * 0.45, y: halfW - rd * 0.35 },
      { x: 0, y: halfW - rd - 0.8 },
      { x: -halfL * 0.40, y: halfW - rd * 0.35 },
      { x: -halfL + rrd + 1.2, y: halfW * 0.90 - rrd * 0.35 },
      { x: -halfL + rc + 0.4, y: halfW * 0.52 },
      { x: -halfL + rc, y: 0 },
      { x: -halfL + rc + 0.4, y: -halfW * 0.52 },
      { x: -halfL + rld + 1.2, y: -halfW * 0.90 + rld * 0.35 },
      { x: -halfL * 0.40, y: -halfW + ld * 0.35 },
      { x: 0, y: -halfW + ld + 0.8 },
      { x: halfL * 0.45, y: -halfW + ld * 0.35 },
      { x: halfL - fld - 2.8, y: -halfW + fld * 0.35 + 0.4 },
      { x: halfL - fc - 0.8, y: -halfW * 0.72 }
    ];
  }

  // 2. STATION WAGONS / ESTATES (2-Box Full Estate: Parallel straight body flanks extending to square rear tailgate)
  const isWagon = type === 'wagon_classic' || type === 'wagon_modern' || type === 'wagon_allroad';
  if (isWagon) {
    return [
      { x: halfL - fc, y: 0 },
      { x: halfL - fc - 0.9, y: halfW * 0.75 },
      { x: halfL - frd - 2.5, y: halfW - frd * 0.35 },
      { x: halfL * 0.40, y: halfW - rd * 0.35 },
      { x: 0, y: halfW - rd },
      { x: -halfL * 0.50, y: halfW - rd * 0.35 },
      { x: -halfL + rrd + 0.8, y: halfW * 0.96 - rrd * 0.35 },
      { x: -halfL + rc + 0.2, y: halfW * 0.60 },
      { x: -halfL + rc, y: 0 },
      { x: -halfL + rc + 0.2, y: -halfW * 0.60 },
      { x: -halfL + rld + 0.8, y: -halfW * 0.96 + rld * 0.35 },
      { x: -halfL * 0.50, y: -halfW + ld * 0.35 },
      { x: 0, y: -halfW + ld },
      { x: halfL * 0.40, y: -halfW + ld * 0.35 },
      { x: halfL - fld - 2.5, y: -halfW + fld * 0.35 },
      { x: halfL - fc - 0.9, y: -halfW * 0.75 }
    ];
  }

  // 3. PICKUP TRUCKS (Hood + Cab + Rectangular Open Cargo Bed, Dually wide hips for Heavy)
  const isPickup = type === 'pickup' || type === 'pickup_heavy';
  if (isPickup) {
    const isHeavy = type === 'pickup_heavy';
    const bedFlareW = isHeavy ? (halfW + 2.4) : halfW;
    return [
      { x: halfL - fc, y: 0 },
      { x: halfL - fc - 0.4, y: halfW * 0.88 },
      { x: halfL - frd - 2.0, y: halfW - frd * 0.35 },
      { x: halfL * 0.30, y: halfW - rd * 0.35 },
      { x: 0, y: halfW - rd },
      { x: -halfL * 0.55, y: bedFlareW - rd * 0.35 },
      { x: -halfL + rrd + 0.6, y: bedFlareW * 0.95 - rrd * 0.35 },
      { x: -halfL + rc + 0.1, y: halfW * 0.65 },
      { x: -halfL + rc, y: 0 },
      { x: -halfL + rc + 0.1, y: -halfW * 0.65 },
      { x: -halfL + rld + 0.6, y: -bedFlareW * 0.95 + rld * 0.35 },
      { x: -halfL * 0.55, y: -bedFlareW + ld * 0.35 },
      { x: 0, y: -halfW + ld },
      { x: halfL * 0.30, y: -halfW + ld * 0.35 },
      { x: halfL - fld - 2.0, y: -halfW + fld * 0.35 },
      { x: halfL - fc - 0.4, y: -halfW * 0.88 }
    ];
  }

  // 4. SUPERCAR (Low wedge nose, pinched coke-bottle waist, wide muscular rear hips)
  if (type === 'supercar') {
    return [
      { x: halfL - fc + 0.5, y: 0 },
      { x: halfL - fc - 1.8, y: halfW * 0.72 },
      { x: halfL - frd - 3.8, y: halfW * 0.90 - frd * 0.35 },
      { x: halfL * 0.30, y: halfW * 0.92 - rd * 0.35 },
      { x: 0, y: halfW * 0.84 - rd },
      { x: -halfL * 0.45, y: halfW * 1.05 - rd * 0.35 },
      { x: -halfL + rrd + 1.0, y: halfW * 0.98 - rrd * 0.35 },
      { x: -halfL + rc + 0.3, y: halfW * 0.55 },
      { x: -halfL + rc, y: 0 },
      { x: -halfL + rc + 0.3, y: -halfW * 0.55 },
      { x: -halfL + rld + 1.0, y: -halfW * 0.98 + rld * 0.35 },
      { x: -halfL * 0.45, y: -halfW * 1.05 + ld * 0.35 },
      { x: 0, y: -halfW * 0.84 + ld },
      { x: halfL * 0.30, y: -halfW * 0.92 + ld * 0.35 },
      { x: halfL - fld - 3.8, y: -halfW * 0.90 + fld * 0.35 },
      { x: halfL - fc - 1.8, y: -halfW * 0.72 }
    ];
  }

  // 5. CLASSIC & MODERN MUSCLE (Broad rectangular front, long hood, flared rear coke-bottle quarters)
  if (type === 'muscle_classic' || type === 'muscle') {
    return [
      { x: halfL - fc, y: 0 },
      { x: halfL - fc - 0.2, y: halfW * 0.90 },
      { x: halfL - frd - 2.2, y: halfW - frd * 0.35 },
      { x: halfL * 0.40, y: halfW * 0.96 - rd * 0.35 },
      { x: 0, y: halfW * 0.90 - rd },
      { x: -halfL * 0.45, y: halfW * 1.02 - rd * 0.35 },
      { x: -halfL + rrd + 0.8, y: halfW * 0.94 - rrd * 0.35 },
      { x: -halfL + rc + 0.2, y: halfW * 0.50 },
      { x: -halfL + rc, y: 0 },
      { x: -halfL + rc + 0.2, y: -halfW * 0.50 },
      { x: -halfL + rld + 0.8, y: -halfW * 0.94 + rld * 0.35 },
      { x: -halfL * 0.45, y: -halfW * 1.02 + ld * 0.35 },
      { x: 0, y: -halfW * 0.90 + ld },
      { x: halfL * 0.40, y: -halfW * 0.96 + ld * 0.35 },
      { x: halfL - fld - 2.2, y: -halfW * 0.90 + fld * 0.35 },
      { x: halfL - fc - 0.2, y: -halfW * 0.90 }
    ];
  }

  // 6. BOXY 4X4 & HARDCORE RIGS (Strictly sharp rectangular perimeter, flat square front & flat square rear)
  if (type === 'suv_classic_box' || type === 'offroad_hardcore') {
    return [
      { x: halfL - fc, y: 0 },
      { x: halfL - fc - 0.1, y: halfW * 0.95 },
      { x: halfL - frd - 1.5, y: halfW - frd * 0.35 },
      { x: halfL * 0.50, y: halfW - rd * 0.35 },
      { x: 0, y: halfW - rd },
      { x: -halfL * 0.50, y: halfW - rd * 0.35 },
      { x: -halfL + rrd + 0.4, y: halfW * 0.98 - rrd * 0.35 },
      { x: -halfL + rc + 0.1, y: halfW * 0.55 },
      { x: -halfL + rc, y: 0 },
      { x: -halfL + rc + 0.1, y: -halfW * 0.55 },
      { x: -halfL + rld + 0.4, y: -halfW * 0.98 + rld * 0.35 },
      { x: -halfL * 0.50, y: -halfW + ld * 0.35 },
      { x: 0, y: -halfW + ld },
      { x: halfL * 0.50, y: -halfW + ld * 0.35 },
      { x: halfL - fld - 1.5, y: -halfW + fld * 0.35 },
      { x: halfL - fc - 0.1, y: -halfW * 0.95 }
    ];
  }

  // CAMPERVAN / MOTORHOME (RV) (Aerodynamic front cab, wide residential living box body, flat insulated rear)
  if (type === 'van_camper') {
    const cabW = halfW * 0.90;
    const bodyW = halfW * 1.04;
    return [
      { x: halfL - fc, y: 0 },
      { x: halfL - fc - 0.5, y: cabW * 0.88 },
      { x: halfL - frd - 2.0, y: cabW - frd * 0.35 },
      { x: halfL * 0.32, y: cabW - rd * 0.35 },
      { x: halfL * 0.26, y: bodyW - rd * 0.35 },
      { x: 0, y: bodyW - rd },
      { x: -halfL * 0.60, y: bodyW - rd * 0.35 },
      { x: -halfL + rrd + 1.2, y: bodyW * 0.95 - rrd * 0.35 },
      { x: -halfL + rc + 0.3, y: bodyW * 0.80 },
      { x: -halfL + rc, y: 0 },
      { x: -halfL + rc + 0.3, y: -bodyW * 0.80 },
      { x: -halfL + rld + 1.2, y: -bodyW * 0.95 + rld * 0.35 },
      { x: -halfL * 0.60, y: -bodyW + ld * 0.35 },
      { x: 0, y: -bodyW + ld },
      { x: halfL * 0.26, y: -bodyW + ld * 0.35 },
      { x: halfL * 0.32, y: -cabW + ld * 0.35 },
      { x: halfL - fld - 2.0, y: -cabW + fld * 0.35 },
      { x: halfL - fc - 0.5, y: -cabW * 0.88 }
    ];
  }

  // 7. VANS, MINIBUSES, DELIVERY & ARMORED (Flat cab-over/blunt nose, slab vertical sides, flat rear with rounded corners)
  const isVan = type === 'van' || type === 'bus_minibus' || 
                type === 'van_cargo_old' || type === 'ambulance_van' || type === 'ambulance' || 
                type === 'delivery_truck' || type === 'truck_armored';
  if (isVan) {
    return [
      { x: halfL - fc, y: 0 },
      { x: halfL - fc - 0.5, y: halfW * 0.90 },
      { x: halfL - frd - 1.8, y: halfW - frd * 0.35 },
      { x: halfL * 0.50, y: halfW - rd * 0.35 },
      { x: 0, y: halfW - rd },
      { x: -halfL * 0.60, y: halfW - rd * 0.35 },
      { x: -halfL + rrd + 1.2, y: halfW * 0.95 - rrd * 0.35 },
      { x: -halfL + rc + 0.3, y: halfW * 0.80 },
      { x: -halfL + rc, y: 0 },
      { x: -halfL + rc + 0.3, y: -halfW * 0.80 },
      { x: -halfL + rld + 1.2, y: -halfW * 0.95 + rld * 0.35 },
      { x: -halfL * 0.60, y: -halfW + ld * 0.35 },
      { x: 0, y: -halfW + ld },
      { x: halfL * 0.50, y: -halfW + ld * 0.35 },
      { x: halfL - fld - 1.8, y: -halfW + fld * 0.35 },
      { x: halfL - fc - 0.5, y: -halfW * 0.90 }
    ];
  }

  // 8. HATCHBACKS & HOT HATCHES (Compact 2-box, short hood, tapered rear hatch)
  const isHatch = type === 'hatchback' || type === 'hatch_hot' || type === 'micro_car' || type === 'retro_bubble';
  if (isHatch) {
    return [
      { x: halfL - fc, y: 0 },
      { x: halfL - fc - 0.8, y: halfW * 0.65 },
      { x: halfL - frd - 2.5, y: halfW - frd * 0.35 - 0.5 },
      { x: halfL * 0.40, y: halfW - rd * 0.35 },
      { x: 0, y: halfW - rd },
      { x: -halfL * 0.45, y: halfW - rd * 0.35 },
      { x: -halfL + rrd + 1.8, y: halfW * 0.82 - rrd * 0.35 },
      { x: -halfL + rc + 0.6, y: halfW * 0.45 },
      { x: -halfL + rc, y: 0 },
      { x: -halfL + rc + 0.6, y: -halfW * 0.45 },
      { x: -halfL + rld + 1.8, y: -halfW * 0.82 + rld * 0.35 },
      { x: -halfL * 0.45, y: -halfW + ld * 0.35 },
      { x: 0, y: -halfW + ld },
      { x: halfL * 0.40, y: -halfW + ld * 0.35 },
      { x: halfL - fld - 2.5, y: -halfW + fld * 0.35 + 0.5 },
      { x: halfL - fc - 0.8, y: -halfW * 0.65 }
    ];
  }

  // 9. TRACTORS (Narrow long engine hood, wide rear cabin & massive rear fenders, open rear hitch area)
  const isTractor = type === 'tractor_mtz82' || type === 'tractor_mtz80' || type === 'tractor_mtz80_old';
  if (isTractor) {
    const cabBackX = -halfL * 0.74; // Rear wall of cabin / transmission casing
    return [
      { x: halfL - fc, y: 0 },
      { x: halfL - fc - 0.5, y: halfW * 0.34 },
      { x: halfL * 0.70, y: halfW * 0.35 - frd * 0.3 },
      { x: halfL * 0.10, y: halfW * 0.36 - rd * 0.3 },
      { x: 0, y: halfW * 0.74 - rd * 0.3 },
      { x: -halfL * 0.30, y: halfW * 0.98 - rd * 0.3 },
      { x: -halfL * 0.76, y: halfW * 0.98 - rrd * 0.3 },
      { x: -halfL * 0.76, y: halfW * 0.50 },
      { x: cabBackX, y: halfW * 0.44 },
      { x: cabBackX, y: 0 },
      { x: cabBackX, y: -halfW * 0.44 },
      { x: -halfL * 0.76, y: -halfW * 0.50 },
      { x: -halfL * 0.76, y: -halfW * 0.98 + rld * 0.3 },
      { x: -halfL * 0.30, y: -halfW * 0.98 + ld * 0.3 },
      { x: 0, y: -halfW * 0.74 + ld * 0.3 },
      { x: halfL * 0.10, y: -halfW * 0.36 + ld * 0.3 },
      { x: halfL * 0.70, y: -halfW * 0.35 + fld * 0.3 },
      { x: halfL - fc - 0.5, y: -halfW * 0.34 }
    ];
  }

  // 9b. TRACTOR BARREL TRAILER (Тракторная бочка-цистерна: A-frame drawbar, cylindrical tank on frame)
  if (type === 'trailer_barrel') {
    const tankFront = halfL * 0.55;
    const tankRear = -halfL * 0.80;
    return [
      { x: tankFront - fc, y: 0 },
      { x: tankFront - fc, y: halfW * 0.70 },
      { x: tankFront - frd - 0.8, y: halfW * 0.76 - frd * 0.25 },
      { x: 0, y: halfW * 0.76 - rd * 0.3 },
      { x: tankRear + rrd + 0.8, y: halfW * 0.76 - rrd * 0.3 },
      { x: tankRear + rc, y: halfW * 0.70 },
      { x: tankRear + rc, y: 0 },
      { x: tankRear + rc, y: -halfW * 0.70 },
      { x: tankRear + rld + 0.8, y: -halfW * 0.76 + rld * 0.3 },
      { x: 0, y: -halfW * 0.76 + ld * 0.3 },
      { x: tankFront - fld - 0.8, y: -halfW * 0.76 + fld * 0.25 },
      { x: tankFront - fc, y: -halfW * 0.70 },
      { x: tankFront - fc, y: 0 }
    ];
  }

  // 9c. 2-AXLE FLATBED FARM TRAILER 2-PTS-4 (Бортовой 2-осный тракторный прицеп 2-ПТС-4)
  if (type === 'trailer_flatbed_2axle') {
    const boxFront = halfL * 0.72;
    const boxRear = -halfL * 0.88;
    const sideW = halfW * 0.96;
    return [
      { x: boxFront - fc, y: 0 },
      { x: boxFront - fc, y: sideW },
      { x: boxFront - frd - 1.0, y: sideW - frd * 0.3 },
      { x: halfL * 0.20, y: sideW - rd * 0.3 },
      { x: 0, y: sideW - rd * 0.3 },
      { x: -halfL * 0.40, y: sideW - rd * 0.3 },
      { x: boxRear + rrd + 0.8, y: sideW - rrd * 0.3 },
      { x: boxRear + rc, y: sideW },
      { x: boxRear + rc, y: 0 },
      { x: boxRear + rc, y: -sideW },
      { x: boxRear + rld + 0.8, y: -sideW + rld * 0.3 },
      { x: -halfL * 0.40, y: -sideW + ld * 0.3 },
      { x: 0, y: -sideW + ld * 0.3 },
      { x: halfL * 0.20, y: -sideW + ld * 0.3 },
      { x: boxFront - fld - 1.0, y: -sideW + fld * 0.3 },
      { x: boxFront - fc, y: -sideW }
    ];
  }

  // 10. MOTORCYCLE WITH SIDECAR (Ural M-67)
  if (type === 'moto_ural_sidecar') {
    return [
      { x: halfL - fc, y: -halfW * 0.45 },
      { x: halfL * 0.40, y: -halfW * 0.85 },
      { x: halfL * 0.35, y: halfW * 0.85 },
      { x: 0, y: halfW * 0.98 },
      { x: -halfL * 0.35, y: halfW * 0.98 },
      { x: -halfL * 0.65, y: halfW * 0.75 },
      { x: -halfL * 0.80, y: halfW * 0.40 },
      { x: -halfL + rc + 0.2, y: -halfW * 0.25 },
      { x: -halfL + rc, y: -halfW * 0.45 },
      { x: -halfL + rc + 0.2, y: -halfW * 0.65 },
      { x: -halfL * 0.40, y: -halfW * 0.65 },
      { x: -halfL * 0.10, y: -halfW * 0.60 },
      { x: 0, y: -halfW * 0.65 },
      { x: halfL * 0.15, y: -halfW * 0.65 },
      { x: halfL * 0.45, y: -halfW * 0.70 },
      { x: halfL * 0.70, y: -halfW * 0.55 }
    ];
  }

  // 11. MOTORCYCLES & MOPEDS (Slender single-track chassis, handlebars, teardrop fuel tank, saddle)
  const isSoloMoto = type === 'moto_izh_jupiter' || type === 'moto_jawa350' || type === 'moto_sport' || type === 'moto_chopper' || type === 'moped_soviet';
  if (isSoloMoto) {
    return [
      { x: halfL - fc, y: 0 },
      { x: halfL * 0.75, y: halfW * 0.22 },
      { x: halfL * 0.45, y: halfW * 0.95 },
      { x: halfL * 0.20, y: halfW * 0.52 },
      { x: 0, y: halfW * 0.38 },
      { x: -halfL * 0.25, y: halfW * 0.34 },
      { x: -halfL * 0.60, y: halfW * 0.28 },
      { x: -halfL + rc + 0.5, y: halfW * 0.18 },
      { x: -halfL + rc, y: 0 },
      { x: -halfL + rc + 0.5, y: -halfW * 0.18 },
      { x: -halfL * 0.60, y: -halfW * 0.28 },
      { x: -halfL * 0.25, y: -halfW * 0.34 },
      { x: 0, y: -halfW * 0.38 },
      { x: halfL * 0.20, y: -halfW * 0.52 },
      { x: halfL * 0.45, y: -halfW * 0.95 },
      { x: halfL * 0.75, y: -halfW * 0.22 }
    ];
  }

  // Default / Modern SUV / Crossover / Sports Coupe (Muscular profile)
  return [
    { x: halfL - fc, y: 0 },
    { x: halfL - fc - 0.6, y: halfW * 0.70 },
    { x: halfL - frd - 2.5, y: halfW - frd * 0.35 },
    { x: halfL * 0.45, y: halfW - rd * 0.35 },
    { x: 0, y: halfW - rd },
    { x: -halfL * 0.45, y: halfW - rd * 0.35 },
    { x: -halfL + rrd + 1.5, y: halfW * 0.90 - rrd * 0.35 },
    { x: -halfL + rc + 0.4, y: halfW * 0.50 },
    { x: -halfL + rc, y: 0 },
    { x: -halfL + rc + 0.4, y: -halfW * 0.50 },
    { x: -halfL + rld + 1.5, y: -halfW * 0.90 + rld * 0.35 },
    { x: -halfL * 0.45, y: -halfW + ld * 0.35 },
    { x: 0, y: -halfW + ld },
    { x: halfL * 0.45, y: -halfW + ld * 0.35 },
    { x: halfL - fld - 2.5, y: -halfW + fld * 0.35 },
    { x: halfL - fc - 0.6, y: -halfW * 0.70 }
  ];
}

/**
 * Computes exact authentic cabin dimensions (position, length, width) for every vehicle archetype
 */
export function getVehicleCabinDimensions(
  car: Vehicle,
  halfL: number,
  halfW: number,
  ld: number,
  rd: number
): { cabinL: number; cabinW: number; cabinX: number } {
  const type = car.type;
  let cabinL = car.length * 0.52;
  let cabinW = Math.max(8, car.width * 0.80 - (ld + rd) * 0.3);
  let cabinX = -car.length * 0.05;

  const isCabOverTruck = type === 'truck_box' || type === 'truck_dump' || 
                         type === 'cement_mixer' || type === 'garbage_truck' ||
                         type === 'fire_ladder';

  if (isCabOverTruck) {
    cabinL = car.length * 0.18;
    cabinW = car.width * 0.88;
    cabinX = halfL - cabinL / 2 - 2;
  } else if (type === 'fire_engine' || type === 'fire_rescue') {
    cabinL = car.length * 0.28;
    cabinW = car.width * 0.90;
    cabinX = halfL - cabinL / 2 - 2;
  } else if (type === 'truck_flatbed' || type === 'truck_tanker' || type === 'truck_water') {
    cabinL = car.length * 0.20;
    cabinW = car.width * 0.86;
    cabinX = halfL - cabinL * 1.35;
  } else if (type === 'van' || type === 'bus_minibus' || type === 'ambulance_van') {
    cabinL = car.length * 0.82;
    cabinW = car.width * 0.86;
    cabinX = -car.length * 0.04;
  } else if (type === 'ambulance_suv') {
    cabinL = car.length * 0.56;
    cabinW = car.width * 0.82;
    cabinX = -car.length * 0.04;
  } else if (type === 'muscle') {
    cabinL = car.length * 0.46;
    cabinW = car.width * 0.78;
    cabinX = -car.length * 0.04;
  } else if (type === 'sports') {
    cabinL = car.length * 0.44;
    cabinW = car.width * 0.74;
    cabinX = -car.length * 0.08;
  } else if (type === 'hatchback') {
    cabinL = car.length * 0.54;
    cabinW = car.width * 0.78;
    cabinX = -car.length * 0.10;
  } else if (type === 'suv') {
    cabinL = car.length * 0.58;
    cabinW = car.width * 0.82;
    cabinX = -car.length * 0.04;
  } else if (type === 'pickup') {
    cabinL = car.length * 0.36;
    cabinW = car.width * 0.82;
    cabinX = car.length * 0.10;
  } else if (type === 'pickup_heavy') {
    cabinL = car.length * 0.35;
    cabinW = car.width * 0.82;
    cabinX = car.length * 0.12;
  } else if (type === 'wagon_classic' || type === 'wagon_modern' || type === 'wagon_allroad') {
    cabinL = car.length * 0.66;
    cabinW = car.width * 0.80;
    cabinX = -car.length * 0.08;
  } else if (type === 'sedan_classic' || type === 'classic_compact') {
    cabinL = car.length * 0.48;
    cabinW = car.width * 0.78;
    cabinX = -car.length * 0.04;
  } else if (type === 'sedan_luxury') {
    cabinL = car.length * 0.52;
    cabinW = car.width * 0.82;
    cabinX = -car.length * 0.06;
  } else if (type === 'sedan_compact' || type === 'sedan' || type === 'taxi' || type === 'police') {
    cabinL = car.length * 0.50;
    cabinW = car.width * 0.78;
    cabinX = -car.length * 0.05;
  } else if (type === 'hatch_hot') {
    cabinL = car.length * 0.52;
    cabinW = car.width * 0.80;
    cabinX = -car.length * 0.10;
  } else if (type === 'micro_car') {
    cabinL = car.length * 0.56;
    cabinW = car.width * 0.86;
    cabinX = -car.length * 0.02;
  } else if (type === 'retro_bubble') {
    cabinL = car.length * 0.48;
    cabinW = car.width * 0.78;
    cabinX = car.length * 0.02;
  } else if (type === 'suv_luxury') {
    cabinL = car.length * 0.60;
    cabinW = car.width * 0.84;
    cabinX = -car.length * 0.04;
  } else if (type === 'offroad_hardcore' || type === 'suv_classic_box') {
    cabinL = car.length * 0.58;
    cabinW = car.width * 0.82;
    cabinX = -car.length * 0.04;
  } else if (type === 'crossover_compact') {
    cabinL = car.length * 0.54;
    cabinW = car.width * 0.80;
    cabinX = -car.length * 0.06;
  } else if (type === 'supercar') {
    cabinL = car.length * 0.42;
    cabinW = car.width * 0.74;
    cabinX = car.length * 0.06;
  } else if (type === 'muscle_classic') {
    cabinL = car.length * 0.45;
    cabinW = car.width * 0.78;
    cabinX = -car.length * 0.05;
  } else if (type === 'coupe_gt') {
    cabinL = car.length * 0.46;
    cabinW = car.width * 0.76;
    cabinX = -car.length * 0.06;
  } else if (type === 'van_camper') {
    cabinL = car.length * 0.84;
    cabinW = car.width * 0.90;
    cabinX = -car.length * 0.03;
  } else if (type === 'van_cargo_old') {
    cabinL = car.length * 0.74;
    cabinW = car.width * 0.84;
    cabinX = 0;
  } else if (type === 'truck_tow') {
    cabinL = car.length * 0.28;
    cabinW = car.width * 0.86;
    cabinX = car.length * 0.20;
  } else if (type === 'truck_armored') {
    cabinL = car.length * 0.58;
    cabinW = car.width * 0.86;
    cabinX = -car.length * 0.02;
  } else if (type === 'delivery_truck') {
    cabinL = car.length * 0.28;
    cabinW = car.width * 0.86;
    cabinX = car.length * 0.18;
  } else if (type === 'tractor_mtz80_old') {
    cabinL = car.length * 0.36;
    cabinW = car.width * 0.70;
    cabinX = -car.length * 0.18;
  } else if (type === 'tractor_mtz82' || type === 'tractor_mtz80') {
    cabinL = car.length * 0.42;
    cabinW = car.width * 0.76;
    cabinX = -car.length * 0.16;
  } else if (type === 'moto_ural_sidecar') {
    cabinL = car.length * 0.48;
    cabinW = car.width * 0.75;
    cabinX = -car.length * 0.05;
  } else if (type === 'moto_izh_jupiter' || type === 'moto_jawa350' || type === 'moto_sport' || type === 'moto_chopper' || type === 'moped_soviet') {
    cabinL = car.length * 0.45;
    cabinW = car.width * 0.40;
    cabinX = 0;
  }

  return { cabinL, cabinW, cabinX };
}

/**
 * Renders the high-fidelity greenhouse (windshield, roof, side glass, pillars),
 * hood shutlines, trunk deck for sedans, full estate roof for wagons, open bed for pickups,
 * glass engine cover for supercars, muscle blower, etc.
 */
export function renderVehicleGreenhouseAndBodyPanels(vCtx: VehicleRenderContext): void {
  const {
    ctx, car, halfL, halfW, fc, rc,
    cabinX, cabinL, cabinW, deform,
    drawDeformedRect, drawDeformedLine, drawDeformedCircle
  } = vCtx;

  const type = car.type;
  const dmg = car.damage;

  // If bus, ambulance box, or trailer, handled separately (trailers have no cabin/greenhouse)
  if (type === 'bus' || type === 'ambulance' || type === 'ambulance_van' || type.startsWith('trailer_') || type === 'trailer_barrel' || type === 'trailer_flatbed_2axle' || car.isTrailer) {
    return;
  }

  // =========================================================================
  // 1. SEDAN ARCHETYPE (Notchback: Front hood, A/B/C pillars, distinct SEPARATE REAR TRUNK DECK!)
  // =========================================================================
  const isSedan = type === 'sedan' || type === 'sedan_classic' || type === 'sedan_luxury' || 
                  type === 'sedan_compact' || type === 'classic_compact' || type === 'taxi' || 
                  type === 'police';

  if (isSedan) {
    const hoodX1 = cabinX + cabinL / 2;
    const hoodX2 = halfL - fc;
    const trunkX1 = -halfL + rc;
    const trunkX2 = cabinX - cabinL / 2;

    // --- FRONT HOOD SHUTLINES & CREASES ---
    // Cowl seam at base of windshield
    drawDeformedLine(hoodX1, -cabinW * 0.48, hoodX1, cabinW * 0.48, 'rgba(0,0,0,0.4)', 1.0);
    // Twin character creases down the hood
    drawDeformedLine(hoodX1 - 1, -halfW * 0.35, hoodX2 - 2, -halfW * 0.28, 'rgba(255,255,255,0.25)', 0.8);
    drawDeformedLine(hoodX1 - 1, halfW * 0.35, hoodX2 - 2, halfW * 0.28, 'rgba(255,255,255,0.25)', 0.8);
    // Windshield washer nozzles
    drawDeformedCircle(hoodX1 - 1.2, -halfW * 0.25, 0.7, '#0f172a');
    drawDeformedCircle(hoodX1 - 1.2, halfW * 0.25, 0.7, '#0f172a');

    // --- CABIN GREENHOUSE (Glass Base & Pillars) ---
    drawDeformedRect(cabinX - cabinL / 2, -cabinW / 2, cabinL, cabinW, '#0f172a');

    // Roof panel (sized from A-pillar to C-pillar)
    const roofL = cabinL * 0.58;
    const roofW = cabinW * 0.82;
    const roofX = cabinX + cabinL * 0.04;
    drawDeformedRect(roofX - roofL / 2, -roofW / 2, roofL, roofW, car.roofColor || car.color);

    // Roof ditch molding / gutter channels
    drawDeformedLine(roofX - roofL / 2, -roofW / 2 + 0.5, roofX + roofL / 2, -roofW / 2 + 0.5, 'rgba(0,0,0,0.3)', 0.8);
    drawDeformedLine(roofX - roofL / 2, roofW / 2 - 0.5, roofX + roofL / 2, roofW / 2 - 0.5, 'rgba(0,0,0,0.3)', 0.8);

    // Sunroof on luxury/modern sedans
    if (type === 'sedan_luxury') {
      drawDeformedRect(roofX - 2.5, -roofW * 0.32, 5.0, roofW * 0.64, '#0f172a');
      drawDeformedLine(roofX - 2.5, 0, roofX + 2.5, 0, '#475569', 0.8);
    }

    // Front Windshield (Raked glass)
    const fWsX1 = roofX + roofL / 2;
    const fWsX2 = cabinX + cabinL / 2;
    drawDeformedRect(fWsX1, -cabinW / 2 + 1, fWsX2 - fWsX1, cabinW - 2, 'rgba(56, 189, 248, 0.16)');
    drawDeformedLine(fWsX1 + 1, -cabinW / 2 + 2, fWsX2 - 1, cabinW / 2 - 2, 'rgba(255, 255, 255, 0.25)', 1.2);

    // Rear Windshield (Sloped rear glass)
    const rWsX1 = cabinX - cabinL / 2;
    const rWsX2 = roofX - roofL / 2;
    drawDeformedRect(rWsX1, -cabinW / 2 + 1.2, rWsX2 - rWsX1, cabinW - 2.4, 'rgba(56, 189, 248, 0.14)');
    // Defroster heater grid lines
    drawDeformedLine(rWsX1 + 1, -cabinW * 0.32, rWsX2 - 1, -cabinW * 0.32, 'rgba(245, 158, 11, 0.25)', 0.6);
    drawDeformedLine(rWsX1 + 1, 0, rWsX2 - 1, 0, 'rgba(245, 158, 11, 0.25)', 0.6);
    drawDeformedLine(rWsX1 + 1, cabinW * 0.32, rWsX2 - 1, cabinW * 0.32, 'rgba(245, 158, 11, 0.25)', 0.6);

    // Side Windows with B-Pillar & C-Pillar
    const sideWinH = (cabinW - roofW) / 2 - 0.5;
    drawDeformedRect(roofX - roofL / 2, -cabinW / 2 + 0.5, roofL, sideWinH, 'rgba(56, 189, 248, 0.10)');
    drawDeformedRect(roofX - roofL / 2, roofW / 2, roofL, sideWinH, 'rgba(56, 189, 248, 0.10)');
    // Black vertical B-Pillar dividing front & rear door glass
    const bPillarX = roofX + 1.5;
    drawDeformedRect(bPillarX - 0.8, -cabinW / 2 + 0.2, 1.6, sideWinH + 0.4, '#0f172a');
    drawDeformedRect(bPillarX - 0.8, roofW / 2 - 0.2, 1.6, sideWinH + 0.4, '#0f172a');

    // --- PROMINENT DISTINCT SEDAN REAR TRUNK DECK (БАГАЖНИК) ---
    // Render the metal trunk deck lid
    const trunkDeckL = trunkX2 - trunkX1 - 1.5;
    const trunkDeckW = halfW * 1.60;
    drawDeformedRect(trunkX1 + 1.5, -trunkDeckW / 2, trunkDeckL, trunkDeckW, car.color);
    // Trunk lid shutline border
    drawDeformedLine(trunkX2, -trunkDeckW / 2, trunkX1 + 2, -trunkDeckW / 2, 'rgba(0,0,0,0.35)', 1.0);
    drawDeformedLine(trunkX2, trunkDeckW / 2, trunkX1 + 2, trunkDeckW / 2, 'rgba(0,0,0,0.35)', 1.0);
    drawDeformedLine(trunkX1 + 2, -trunkDeckW / 2, trunkX1 + 2, trunkDeckW / 2, 'rgba(0,0,0,0.35)', 1.0);
    // Chrome badge / key lock in center of trunk lid
    drawDeformedCircle(trunkX1 + 3.5, 0, 0.8, '#cbd5e1');
    // High-mount third brake light at base of rear glass
    drawDeformedRect(trunkX2 - 0.6, -1.8, 0.8, 3.6, '#ef4444');

    return;
  }

  // =========================================================================
  // 2. STATION WAGON ARCHETYPE (Универсал: Full-Length Extended Roof & 3 Side Windows)
  // =========================================================================
  const isWagon = type === 'wagon_classic' || type === 'wagon_modern' || type === 'wagon_allroad';
  if (isWagon) {
    const hoodX1 = cabinX + cabinL / 2;
    const hoodX2 = halfL - fc;
    drawDeformedLine(hoodX1, -cabinW * 0.48, hoodX1, cabinW * 0.48, 'rgba(0,0,0,0.4)', 1.0);

    // Full greenhouse glass base
    drawDeformedRect(cabinX - cabinL / 2, -cabinW / 2, cabinL, cabinW, '#0f172a');

    // Extended long estate roof panel running all the way to rear D-pillar
    const roofL = cabinL * 0.82;
    const roofW = cabinW * 0.82;
    const roofX = cabinX - cabinL * 0.04;
    drawDeformedRect(roofX - roofL / 2, -roofW / 2, roofL, roofW, car.roofColor || car.color);

    // Longitudinal Roof Rails (Satin silver / black)
    const railColor = type === 'wagon_modern' ? '#cbd5e1' : '#1e293b';
    drawDeformedLine(roofX - roofL / 2 + 1, -roofW / 2 + 0.8, roofX + roofL / 2 - 1, -roofW / 2 + 0.8, railColor, 1.4);
    drawDeformedLine(roofX - roofL / 2 + 1, roofW / 2 - 0.8, roofX + roofL / 2 - 1, roofW / 2 - 0.8, railColor, 1.4);

    // Front Windshield
    const fWsX1 = roofX + roofL / 2;
    const fWsX2 = cabinX + cabinL / 2;
    drawDeformedRect(fWsX1, -cabinW / 2 + 1, fWsX2 - fWsX1, cabinW - 2, 'rgba(56, 189, 248, 0.16)');
    drawDeformedLine(fWsX1 + 1, -cabinW / 2 + 2, fWsX2 - 1, cabinW / 2 - 2, 'rgba(255, 255, 255, 0.25)', 1.2);

    // Near-vertical rear tailgate window right at rear edge
    const rWsX1 = cabinX - cabinL / 2;
    const rWsX2 = roofX - roofL / 2;
    drawDeformedRect(rWsX1, -cabinW / 2 + 1, rWsX2 - rWsX1, cabinW - 2, 'rgba(56, 189, 248, 0.14)');
    // Rear wiper
    drawDeformedLine(rWsX1 + 0.5, 0, rWsX2 - 0.5, 2.5, '#0f172a', 0.8);

    // 3 Side Windows with B-Pillar, C-Pillar & D-Pillar
    const sideWinH = (cabinW - roofW) / 2 - 0.5;
    drawDeformedRect(roofX - roofL / 2, -cabinW / 2 + 0.5, roofL, sideWinH, 'rgba(56, 189, 248, 0.10)');
    drawDeformedRect(roofX - roofL / 2, roofW / 2, roofL, sideWinH, 'rgba(56, 189, 248, 0.10)');
    // B-Pillar
    const bPillarX = roofX + roofL * 0.22;
    drawDeformedRect(bPillarX - 0.8, -cabinW / 2 + 0.2, 1.6, sideWinH + 0.4, '#0f172a');
    drawDeformedRect(bPillarX - 0.8, roofW / 2 - 0.2, 1.6, sideWinH + 0.4, '#0f172a');
    // C-Pillar
    const cPillarX = roofX - roofL * 0.15;
    drawDeformedRect(cPillarX - 0.8, -cabinW / 2 + 0.2, 1.6, sideWinH + 0.4, '#0f172a');
    drawDeformedRect(cPillarX - 0.8, roofW / 2 - 0.2, 1.6, sideWinH + 0.4, '#0f172a');

    return;
  }

  // =========================================================================
  // 3. PICKUP TRUCK ARCHETYPE (Enclosed Cab + RECESSED OPEN CARGO BED / КУЗОВ)
  // =========================================================================
  const isPickup = type === 'pickup' || type === 'pickup_heavy';
  if (isPickup) {
    const isHeavy = type === 'pickup_heavy';
    const bedX1 = -halfL + rc + 2;
    const bedX2 = cabinX - cabinL / 2 - 1.2;
    const bedW = isHeavy ? (halfW * 2 - 2.5) : (halfW * 2 - 3.2);

    // --- ENCLOSED CAB GREENHOUSE ---
    drawDeformedRect(cabinX - cabinL / 2, -cabinW / 2, cabinL, cabinW, '#0f172a');

    const roofL = cabinL * 0.65;
    const roofW = cabinW * 0.84;
    const roofX = cabinX + cabinL * 0.05;
    drawDeformedRect(roofX - roofL / 2, -roofW / 2, roofL, roofW, car.roofColor || car.color);

    // Front Windshield
    const fWsX1 = roofX + roofL / 2;
    const fWsX2 = cabinX + cabinL / 2;
    drawDeformedRect(fWsX1, -cabinW / 2 + 1, fWsX2 - fWsX1, cabinW - 2, 'rgba(56, 189, 248, 0.16)');
    drawDeformedLine(fWsX1 + 1, -cabinW / 2 + 2, fWsX2 - 1, cabinW / 2 - 2, 'rgba(255, 255, 255, 0.25)', 1.2);

    // Flat Vertical Rear Cab Window
    const rWsX1 = cabinX - cabinL / 2;
    const rWsX2 = roofX - roofL / 2;
    drawDeformedRect(rWsX1, -cabinW * 0.40, rWsX2 - rWsX1, cabinW * 0.80, 'rgba(56, 189, 248, 0.14)');
    drawDeformedLine((rWsX1 + rWsX2) / 2, -cabinW * 0.15, (rWsX1 + rWsX2) / 2, cabinW * 0.15, '#0f172a', 1.0); // Center sliding pane

    // Side Door Windows
    const sideWinH = (cabinW - roofW) / 2 - 0.5;
    drawDeformedRect(roofX - roofL / 2, -cabinW / 2 + 0.5, roofL, sideWinH, 'rgba(56, 189, 248, 0.10)');
    drawDeformedRect(roofX - roofL / 2, roofW / 2, roofL, sideWinH, 'rgba(56, 189, 248, 0.10)');

    // --- RECESSED OPEN TRUCK BED (ОТКРЫТЫЙ КУЗОВ) ---
    // Dark textured bed liner floor
    drawDeformedRect(bedX1, -bedW / 2, bedX2 - bedX1, bedW, '#1e293b');
    // Longitudinal floor ribs
    for (let by = -bedW / 2 + 2.4; by < bedW / 2; by += 2.6) {
      drawDeformedLine(bedX1 + 1, by, bedX2 - 1, by, '#334155', 0.9);
    }
    // Inner wheel arches / tubs
    drawDeformedRect(bedX1 + 3, -bedW / 2, 8, 2.2, '#0f172a');
    drawDeformedRect(bedX1 + 3, bedW / 2 - 2.2, 8, 2.2, '#0f172a');
    // Diamond plate tool chest or cargo crate
    if (!isHeavy) {
      drawDeformedRect(bedX2 - 6.5, -bedW / 2 + 1.5, 5.5, bedW - 3.0, '#475569');
      drawDeformedLine(bedX2 - 6.5, 0, bedX2 - 1.0, 0, '#cbd5e1', 1.0);
    }
    // Rear Tailgate shutlines and handle
    drawDeformedLine(bedX1, -bedW / 2, bedX1, bedW / 2, 'rgba(0,0,0,0.5)', 1.2);
    drawDeformedRect(bedX1 - 1.0, -1.8, 1.2, 3.6, '#0f172a'); // Tailgate latch

    return;
  }

  // =========================================================================
  // 4. SUPERCAR ARCHETYPE (Glass Teardrop Canopy & TRANSPARENT REAR ENGINE BAY)
  // =========================================================================
  if (type === 'supercar') {
    // Jet-fighter glass canopy cockpit
    drawDeformedRect(cabinX - cabinL / 2, -cabinW / 2, cabinL, cabinW, '#020617');

    const roofL = cabinL * 0.45;
    const roofW = cabinW * 0.78;
    const roofX = cabinX + cabinL * 0.08;
    drawDeformedRect(roofX - roofL / 2, -roofW / 2, roofL, roofW, car.roofColor || car.color);
    drawDeformedLine(roofX - roofL / 2, 0, roofX + roofL / 2, 0, 'rgba(0,0,0,0.4)', 1.2); // Central aerodynamic roof channel

    // Wraparound Panoramic Windshield
    const fWsX1 = roofX + roofL / 2;
    const fWsX2 = cabinX + cabinL / 2;
    drawDeformedRect(fWsX1, -cabinW / 2 + 0.8, fWsX2 - fWsX1, cabinW - 1.6, 'rgba(56, 189, 248, 0.20)');
    drawDeformedLine(fWsX1 + 1, -cabinW / 2 + 1.5, fWsX2 - 1, cabinW / 2 - 1.5, 'rgba(255, 255, 255, 0.35)', 1.4);

    // --- REAR TRANSPARENT GLASS MID-ENGINE COVER ---
    const engX = cabinX - cabinL * 0.65;
    const engL = halfL * 0.52;
    const engW = halfW * 1.35;
    drawDeformedRect(engX - engL / 2, -engW / 2, engL, engW, '#020617');

    // Engine block with red cylinder heads and silver intake runners
    drawDeformedRect(engX - engL * 0.35, -engW * 0.25, engL * 0.70, engW * 0.50, '#1e293b');
    drawDeformedRect(engX - engL * 0.30, -engW * 0.22, engL * 0.60, 2.4, '#dc2626');
    drawDeformedRect(engX - engL * 0.30, engW * 0.22 - 2.4, engL * 0.60, 2.4, '#dc2626');
    // Carbon X-brace
    drawDeformedLine(engX - engL * 0.35, -engW * 0.25, engX + engL * 0.35, engW * 0.25, '#94a3b8', 1.4);
    drawDeformedLine(engX - engL * 0.35, engW * 0.25, engX + engL * 0.35, -engW * 0.25, '#94a3b8', 1.4);

    return;
  }

  // =========================================================================
  // 5. MUSCLE CAR ARCHETYPE (Wide Hood, Recessed Fastback Glass, Blower & Stripes)
  // =========================================================================
  if (type === 'muscle_classic' || type === 'muscle') {
    const hoodX1 = cabinX + cabinL / 2;
    const hoodX2 = halfL - fc;

    // Cockpit
    drawDeformedRect(cabinX - cabinL / 2, -cabinW / 2, cabinL, cabinW, '#0f172a');

    const roofL = cabinL * 0.60;
    const roofW = cabinW * 0.82;
    const roofX = cabinX + cabinL * 0.05;
    drawDeformedRect(roofX - roofL / 2, -roofW / 2, roofL, roofW, car.roofColor || car.color);

    // Chrome Windshield Frame
    const fWsX1 = roofX + roofL / 2;
    const fWsX2 = cabinX + cabinL / 2;
    drawDeformedRect(fWsX1, -cabinW / 2 + 1, fWsX2 - fWsX1, cabinW - 2, 'rgba(56, 189, 248, 0.16)');
    drawDeformedLine(fWsX2, -cabinW / 2 + 1, fWsX2, cabinW / 2 - 1, '#cbd5e1', 1.2); // Chrome cowl trim

    // Recessed Sloped Rear Window with Flying Buttress C-Pillars
    const rWsX1 = cabinX - cabinL / 2;
    const rWsX2 = roofX - roofL / 2;
    drawDeformedRect(rWsX1, -cabinW * 0.40, rWsX2 - rWsX1, cabinW * 0.80, 'rgba(56, 189, 248, 0.14)');
    drawDeformedRect(rWsX1, -cabinW / 2, rWsX2 - rWsX1, cabinW * 0.10, car.color); // Left flying buttress
    drawDeformedRect(rWsX1, cabinW * 0.40, rWsX2 - rWsX1, cabinW * 0.10, car.color); // Right flying buttress

    // Wide Rear Trunk Deck
    const trunkX1 = -halfL + rc;
    const trunkX2 = cabinX - cabinL / 2;
    drawDeformedRect(trunkX1 + 1, -halfW * 0.85, trunkX2 - trunkX1 - 1, halfW * 1.70, car.color);

    // Dual Racing Stripes
    const stripeW = 2.4;
    const stripeDist = 2.6;
    drawDeformedLine(-halfL + rc + 1, -stripeDist, halfL - fc - 1, -stripeDist, '#ffffff', stripeW);
    drawDeformedLine(-halfL + rc + 1, stripeDist, halfL - fc - 1, stripeDist, '#ffffff', stripeW);

    return;
  }

  // =========================================================================
  // 5B. TRACTOR ARCHETYPE (MTZ-82.1, MTZ-80 Belarus & MTZ-80 Old Veteran)
  // =========================================================================
  const isTractor = type === 'tractor_mtz82' || type === 'tractor_mtz80' || type === 'tractor_mtz80_old';
  if (isTractor) {
    const isOld = type === 'tractor_mtz80_old';
    const is82 = type === 'tractor_mtz82';
    const hoodX1 = cabinX + cabinL / 2;
    const hoodX2 = halfL - fc - 0.5;
    const hoodW = halfW * 0.70;

    // --- 1. ENGINE HOOD TOP SHEET METAL (STRICT TOP-DOWN VIEW) ---
    drawDeformedRect(hoodX1, -hoodW / 2, hoodX2 - hoodX1, hoodW, car.color);
    // Center longitudinal hood crease
    drawDeformedLine(hoodX1, 0, hoodX2 - 1.5, 0, 'rgba(0,0,0,0.3)', 1.0);

    // Radiator filler neck / cap
    drawDeformedCircle(hoodX2 - 2.8, 0, 1.1, '#1e293b');
    drawDeformedCircle(hoodX2 - 2.8, 0, 0.5, '#cbd5e1');

    // Engine cowl rubber seal strip at windshield base
    drawDeformedLine(hoodX1, -hoodW / 2, hoodX1, hoodW / 2, '#0f172a', 1.2);

    // --- 2. CABIN GREENHOUSE (Glass Base & Frame) ---
    drawDeformedRect(cabinX - cabinL / 2, -cabinW / 2, cabinL, cabinW, '#0f172a');

    // --- 3. CABIN INTERIOR ---
    // Operator Seat
    const seatX = cabinX - cabinL * 0.08;
    const seatW = cabinW * 0.40;
    const seatL = cabinL * 0.38;
    drawDeformedRect(seatX - seatL / 2, -seatW / 2, seatL, seatW, isOld ? '#451a03' : '#1e293b');

    // Steering Console & Wheel
    const dashX = cabinX + cabinL * 0.32;
    drawDeformedRect(dashX - 1.2, -cabinW * 0.25, 2.0, cabinW * 0.50, '#1e293b');
    const wheelX = cabinX + cabinL * 0.18;
    const wheelRadius = isOld ? 2.6 : 3.0;
    drawDeformedCircle(wheelX, 0, wheelRadius, '#0f172a');
    drawDeformedCircle(wheelX, 0, wheelRadius - 0.8, '#1e293b');
    drawDeformedCircle(wheelX, 0, 0.8, '#64748b');

    // --- 4. CABIN ROOF PANEL ---
    let roofL: number;
    let roofW: number;
    let roofX: number;
    let roofColor: string;

    if (isOld) {
      // MTZ-80 Old: Compact vintage roof
      roofL = cabinL * 0.62;
      roofW = cabinW * 0.82;
      roofX = cabinX - cabinL * 0.02;
      roofColor = car.roofColor || '#94a3b8';

      drawDeformedRect(roofX - roofL / 2, -roofW / 2, roofL, roofW, roofColor);
      drawDeformedLine(roofX - roofL / 2, -roofW / 2, roofX + roofL / 2, -roofW / 2, 'rgba(0,0,0,0.25)', 0.8);
      drawDeformedLine(roofX - roofL / 2, roofW / 2, roofX + roofL / 2, roofW / 2, 'rgba(0,0,0,0.25)', 0.8);
      // Round mushroom dome roof vent
      drawDeformedCircle(roofX, 0, 2.2, '#475569');
      drawDeformedCircle(roofX, 0, 1.2, '#94a3b8');
    } else {
      // MTZ-82.1 / MTZ-80: Unified Cabin White/Cream Roof
      roofL = cabinL * 0.68;
      roofW = cabinW * 0.84;
      roofX = cabinX - cabinL * 0.02;
      roofColor = car.roofColor || '#f8fafc';

      drawDeformedRect(roofX - roofL / 2, -roofW / 2, roofL, roofW, roofColor);

      // Clean roof perimeter & central hatch
      drawDeformedLine(roofX - roofL / 2, -roofW / 2 + 0.6, roofX + roofL / 2, -roofW / 2 + 0.6, 'rgba(0,0,0,0.18)', 0.8);
      drawDeformedLine(roofX - roofL / 2, roofW / 2 - 0.6, roofX + roofL / 2, roofW / 2 - 0.6, 'rgba(0,0,0,0.18)', 0.8);

      // Central Emergency Ventilation Roof Hatch
      const hatchL = roofL * 0.44;
      const hatchW = roofW * 0.48;
      drawDeformedRect(roofX - hatchL / 2, -hatchW / 2, hatchL, hatchW, '#0f172a');
      drawDeformedRect(roofX - hatchL / 2 + 0.5, -hatchW / 2 + 0.5, hatchL - 1.0, hatchW - 1.0, '#f1f5f9');
    }

    // --- 5. PANORAMIC CABIN GLASS & PILLARS ---
    // Front Windshield
    const fWsX1 = roofX + roofL / 2;
    const fWsX2 = cabinX + cabinL / 2;
    drawDeformedRect(fWsX1, -cabinW / 2 + 0.8, fWsX2 - fWsX1, cabinW - 1.6, 'rgba(56, 189, 248, 0.22)');
    drawDeformedLine(fWsX1 + 0.8, -cabinW * 0.35, fWsX2 - 0.8, cabinW * 0.25, 'rgba(255, 255, 255, 0.35)', 1.2);
    // Windshield Wiper
    drawDeformedLine(fWsX2 - 0.5, -cabinW * 0.30, fWsX1 + 1.2, 0, '#0f172a', 1.0);

    // Rear Implement Window
    const rWsX1 = cabinX - cabinL / 2;
    const rWsX2 = roofX - roofL / 2;
    drawDeformedRect(rWsX1, -cabinW / 2 + 0.8, rWsX2 - rWsX1, cabinW - 1.6, 'rgba(56, 189, 248, 0.18)');

    // Side Door Windows
    const sideWinH = (cabinW - roofW) / 2 - 0.4;
    drawDeformedRect(roofX - roofL / 2, -cabinW / 2 + 0.5, roofL, sideWinH, 'rgba(56, 189, 248, 0.14)');
    drawDeformedRect(roofX - roofL / 2, roofW / 2 - 0.1, roofL, sideWinH, 'rgba(56, 189, 248, 0.14)');
    // Black door frame pillar divider
    const bPillarX = roofX + roofL * 0.05;
    drawDeformedRect(bPillarX - 0.6, -cabinW / 2 + 0.2, 1.2, sideWinH + 0.4, '#0f172a');
    drawDeformedRect(bPillarX - 0.6, roofW / 2 - 0.2, 1.2, sideWinH + 0.4, '#0f172a');

    return;
  }

  // =========================================================================
  // 5C. MOTORCYCLES & MOPEDS
  // =========================================================================
  const isBike = type === 'moto_izh_jupiter' || type === 'moto_ural_sidecar' || type === 'moto_jawa350' || 
                 type === 'moto_sport' || type === 'moto_chopper' || type === 'moped_soviet';
  if (isBike) {
    if (type === 'moto_ural_sidecar') {
      const bikeY = -halfW * 0.45;
      const sidecarY = halfW * 0.55;

      // Sidecar tub body
      drawDeformedRect(-halfL * 0.55, halfW * 0.15, halfL * 0.90, halfW * 0.70, car.color);
      // Sidecar passenger opening
      drawDeformedRect(-halfL * 0.25, halfW * 0.25, halfL * 0.40, halfW * 0.50, '#1e293b');
      // Sidecar seat cushion
      drawDeformedRect(-halfL * 0.20, halfW * 0.30, halfL * 0.25, halfW * 0.40, '#0f172a');
      // Sidecar windshield deflector
      drawDeformedLine(halfL * 0.18, halfW * 0.22, halfL * 0.18, halfW * 0.75, 'rgba(56, 189, 248, 0.4)', 1.5);
      
      // Connecting tubular cross-members to motorcycle frame
      drawDeformedLine(-halfL * 0.35, bikeY, -halfL * 0.35, halfW * 0.20, '#334155', 2.0);
      drawDeformedLine(halfL * 0.10, bikeY, halfL * 0.10, halfW * 0.20, '#334155', 2.0);

      // Motorcycle backbone frame & Fuel Tank
      drawDeformedRect(-halfL * 0.40, bikeY - 2, halfL * 0.75, 4, '#1e293b');
      drawDeformedRect(halfL * 0.05, bikeY - 3.5, halfL * 0.30, 7, car.color);
      // Tank chrome cap
      drawDeformedCircle(halfL * 0.18, bikeY, 1.2, '#f8fafc');
      // Two-up leather seat
      drawDeformedRect(-halfL * 0.35, bikeY - 3.0, halfL * 0.35, 6, '#0f172a');
      // Chrome Handlebars
      drawDeformedLine(halfL * 0.35, bikeY - 7, halfL * 0.35, bikeY + 7, '#e2e8f0', 1.8);
      drawDeformedCircle(halfL * 0.35, bikeY - 7, 1.0, '#0f172a');
      drawDeformedCircle(halfL * 0.35, bikeY + 7, 1.0, '#0f172a');
    } else {
      // Solo Motorcycles
      const tankL = halfL * 0.55;
      const tankW = halfW * 0.85;
      const seatL = halfL * 0.65;
      const seatW = halfW * 0.75;

      // Frame & Engine Block
      drawDeformedRect(-halfL * 0.35, -halfW * 0.40, halfL * 0.75, halfW * 0.80, '#334155');

      // Fuel Tank
      const tankX = halfL * 0.05;
      drawDeformedRect(tankX - tankL / 2, -tankW / 2, tankL, tankW, car.color);
      drawDeformedCircle(tankX + tankL * 0.15, 0, 1.2, '#f8fafc'); // Gas cap

      // Tank knee grip rubber pads on classic bikes
      if (type === 'moto_izh_jupiter' || type === 'moto_jawa350') {
        drawDeformedRect(tankX - tankL * 0.2, -tankW / 2 - 0.4, tankL * 0.4, 0.8, '#0f172a');
        drawDeformedRect(tankX - tankL * 0.2, tankW / 2 - 0.4, tankL * 0.4, 0.8, '#0f172a');
      }

      // Rider & Passenger Saddle
      const seatX = -halfL * 0.30;
      const seatColor = type === 'moto_chopper' ? '#3e2723' : '#0f172a';
      drawDeformedRect(seatX - seatL / 2, -seatW / 2, seatL, seatW, seatColor);
      drawDeformedLine(seatX - seatL / 2 + 1, 0, seatX + seatL / 2 - 1, 0, 'rgba(255,255,255,0.15)', 0.8);

      // Handlebars
      const barX = halfL * 0.42;
      const barW = halfW * 1.85;
      drawDeformedLine(barX, -barW / 2, barX, barW / 2, '#cbd5e1', 1.8);
      // Grips
      drawDeformedRect(barX - 1.2, -barW / 2, 2.4, 1.5, '#0f172a');
      drawDeformedRect(barX - 1.2, barW / 2 - 1.5, 2.4, 1.5, '#0f172a');

      // Instrument Gauge / Speedometer Cluster
      drawDeformedCircle(barX + 1.5, 0, 1.2, '#1e293b');
      drawDeformedCircle(barX + 1.5, 0, 0.8, '#38bdf8');
    }

    return;
  }

  // =========================================================================
  // 5D. VANS, DELIVERY & COMMERCIAL TRANSPORTERS (VAN, DELIVERY TRUCK, VAN CARGO OLD)
  // =========================================================================
  const isVanType = type === 'van' || type === 'bus_minibus' || type === 'delivery_truck' || type === 'van_cargo_old';
  if (isVanType) {
    const isRetro = type === 'van_cargo_old';
    const isDelivery = type === 'delivery_truck';

    // 1. Base greenhouse glass & cabin pillars
    drawDeformedRect(cabinX - cabinL / 2, -cabinW / 2, cabinL, cabinW, '#0f172a');

    // 2. Full-length solid metal van roof (extends all the way back to the cargo doors)
    const roofL = cabinL * (isDelivery ? 0.88 : 0.84);
    const roofW = cabinW * 0.84;
    const roofX = cabinX - cabinL * 0.04;
    drawDeformedRect(roofX - roofL / 2, -roofW / 2, roofL, roofW, car.roofColor || car.color);

    // Aerodynamic roof stamping ribs (longitudinal stiffeners)
    for (let ry = -roofW * 0.32; ry <= roofW * 0.32; ry += roofW * 0.16) {
      drawDeformedLine(roofX - roofL / 2 + 2, ry, roofX + roofL / 2 - 2, ry, 'rgba(0,0,0,0.15)', 1.0);
      drawDeformedLine(roofX - roofL / 2 + 2, ry - 0.5, roofX + roofL / 2 - 2, ry - 0.5, 'rgba(255,255,255,0.15)', 0.6);
    }

    // 3. Front Cab Windshield
    const fWsX1 = roofX + roofL / 2;
    const fWsX2 = cabinX + cabinL / 2;
    drawDeformedRect(fWsX1, -cabinW / 2 + 1, fWsX2 - fWsX1, cabinW - 2, 'rgba(56, 189, 248, 0.18)');
    drawDeformedLine(fWsX1 + 1, -cabinW / 2 + 2, fWsX2 - 1, cabinW / 2 - 2, 'rgba(255, 255, 255, 0.25)', 1.2);

    if (isRetro) {
      // Retro split windshield center bar («Буханка»)
      drawDeformedLine(fWsX1, 0, fWsX2, 0, car.color, 2.0);
    } else {
      // Dual windshield wipers
      drawDeformedLine(fWsX1 + 1, -cabinW * 0.25, fWsX2 - 1, -cabinW * 0.05, '#0f172a', 1.0);
      drawDeformedLine(fWsX1 + 1, cabinW * 0.05, fWsX2 - 1, cabinW * 0.25, '#0f172a', 1.0);
    }

    // 4. Front Driver & Passenger Door Windows
    const cabWindowL = cabinL * 0.26;
    const cabWinStartX = roofX + roofL / 2 - cabWindowL;
    const sideWinH = (cabinW - roofW) / 2 - 0.4;
    drawDeformedRect(cabWinStartX, -cabinW / 2 + 0.4, cabWindowL, sideWinH, 'rgba(56, 189, 248, 0.12)');
    drawDeformedRect(cabWinStartX, roofW / 2, cabWindowL, sideWinH, 'rgba(56, 189, 248, 0.12)');

    // Vertical A-pillar & B-pillar dividers
    drawDeformedRect(cabWinStartX - 0.8, -cabinW / 2 + 0.2, 1.6, sideWinH + 0.4, '#0f172a');
    drawDeformedRect(cabWinStartX - 0.8, roofW / 2 - 0.2, 1.6, sideWinH + 0.4, '#0f172a');

    // 5. Side sliding cargo door seam & guide rail track (right side)
    const slideDoorX1 = roofX - roofL * 0.35;
    const slideDoorX2 = cabWinStartX - 1.0;
    drawDeformedLine(slideDoorX1, roofW / 2 + 0.5, slideDoorX2, roofW / 2 + 0.5, 'rgba(0,0,0,0.4)', 1.2);
    // Dark guide rail indentation along right quarter panel
    drawDeformedLine(slideDoorX1 - 8, roofW / 2 + 0.8, slideDoorX1, roofW / 2 + 0.8, '#0f172a', 1.4);
    // Sliding door handle
    drawDeformedRect(slideDoorX2 - 3, roofW / 2 - 0.5, 2.5, 1.0, '#0f172a');

    // 6. Rear Double Cargo Doors (50/50 Split)
    const rWsX1 = cabinX - cabinL / 2;
    const rWsX2 = roofX - roofL / 2;
    // Rear door vertical dividing shutline seam down the center
    drawDeformedLine(-halfL + rc + 0.2, 0, roofX - roofL / 2 + 4, 0, 'rgba(0,0,0,0.55)', 1.4);
    // Rear door handle / license plate pocket
    drawDeformedRect(rWsX1 - 0.5, 1.5, 1.6, 2.8, '#0f172a');

    if (!isDelivery) {
      // Twin rear door tinted window panes with black rubber seals
      const rearGlassW = cabinW * 0.32;
      drawDeformedRect(rWsX1, -cabinW * 0.40, rWsX2 - rWsX1, rearGlassW, '#0f172a');
      drawDeformedRect(rWsX1 + 0.4, -cabinW * 0.38, rWsX2 - rWsX1 - 0.8, rearGlassW - 0.8, 'rgba(56, 189, 248, 0.16)');
      drawDeformedRect(rWsX1, cabinW * 0.40 - rearGlassW, rWsX2 - rWsX1, rearGlassW, '#0f172a');
      drawDeformedRect(rWsX1 + 0.4, cabinW * 0.40 - rearGlassW + 0.4, rWsX2 - rWsX1 - 0.8, rearGlassW - 0.8, 'rgba(56, 189, 248, 0.16)');
      // Defroster lines
      drawDeformedLine(rWsX1 + 1, -cabinW * 0.24, rWsX2 - 1, -cabinW * 0.24, 'rgba(245, 158, 11, 0.2)', 0.6);
      drawDeformedLine(rWsX1 + 1, cabinW * 0.24, rWsX2 - 1, cabinW * 0.24, 'rgba(245, 158, 11, 0.2)', 0.6);
    }

    // High-mount third brake light at top of rear doors
    drawDeformedRect(roofX - roofL / 2 - 0.4, -1.8, 1.0, 3.6, '#ef4444');

    return;
  }

  // =========================================================================
  // 5E. CAMPERVAN / MOTORHOME (RV LIVING MODULE & EXPEDITION CAMPER)
  // =========================================================================
  if (type === 'van_camper') {
    // 1. Cabin & Residential Module Shell
    drawDeformedRect(cabinX - cabinL / 2, -cabinW / 2, cabinL, cabinW, '#0f172a');

    // Extended High-Top Camper Roof (clean white gelcoat insulated shell)
    const roofL = cabinL * 0.86;
    const roofW = cabinW * 0.86;
    const roofX = cabinX - cabinL * 0.04;
    drawDeformedRect(roofX - roofL / 2, -roofW / 2, roofL, roofW, '#f8fafc');

    // 2. Aerodynamic Over-Cab Alcove Sleeper Pod (over front cab)
    const alcoveX1 = roofX + roofL / 2 - 2;
    const alcoveX2 = cabinX + cabinL / 2 + 1;
    drawDeformedRect(alcoveX1, -roofW * 0.46, alcoveX2 - alcoveX1, roofW * 0.92, '#f1f5f9');
    drawDeformedLine(alcoveX1, -roofW * 0.46, alcoveX2, -roofW * 0.42, 'rgba(0,0,0,0.15)', 1.0);
    drawDeformedLine(alcoveX1, roofW * 0.46, alcoveX2, roofW * 0.42, 'rgba(0,0,0,0.15)', 1.0);

    // Front Windshield
    const fWsX1 = roofX + roofL / 2;
    const fWsX2 = cabinX + cabinL / 2;
    drawDeformedRect(fWsX1, -cabinW / 2 + 1.2, fWsX2 - fWsX1, cabinW - 2.4, 'rgba(56, 189, 248, 0.18)');
    drawDeformedLine(fWsX1 + 1, -cabinW / 2 + 2, fWsX2 - 1, cabinW / 2 - 2, 'rgba(255, 255, 255, 0.25)', 1.2);

    // Front Cab Side Windows
    const cabWinL = cabinL * 0.24;
    const cabWinStartX = roofX + roofL / 2 - cabWinL;
    const sideWinH = (cabinW - roofW) / 2 - 0.4;
    drawDeformedRect(cabWinStartX, -cabinW / 2 + 0.4, cabWinL, sideWinH, 'rgba(56, 189, 248, 0.14)');
    drawDeformedRect(cabWinStartX, roofW / 2, cabWinL, sideWinH, 'rgba(56, 189, 248, 0.14)');

    // 3. Side Acrylic Camper Windows (living room & rear bedroom windows)
    const midWinX = roofX - roofL * 0.05;
    drawDeformedRect(midWinX - 3.5, -cabinW / 2 + 0.4, 7.0, sideWinH, '#1e293b');
    drawDeformedRect(midWinX - 3.0, -cabinW / 2 + 0.6, 6.0, sideWinH - 0.4, 'rgba(56, 189, 248, 0.18)');
    // Rear bedroom side windows
    const rearWinX = roofX - roofL * 0.36;
    drawDeformedRect(rearWinX - 3.0, -cabinW / 2 + 0.4, 6.0, sideWinH, '#1e293b');
    drawDeformedRect(rearWinX - 2.5, -cabinW / 2 + 0.6, 5.0, sideWinH - 0.4, 'rgba(56, 189, 248, 0.18)');
    drawDeformedRect(rearWinX - 3.0, roofW / 2, 6.0, sideWinH, '#1e293b');
    drawDeformedRect(rearWinX - 2.5, roofW / 2 + 0.2, 5.0, sideWinH - 0.4, 'rgba(56, 189, 248, 0.18)');

    // 4. Large Living Room Panoramic Roof Skylight (Dometic Heki dome)
    const skyX = roofX + roofL * 0.18;
    drawDeformedRect(skyX - 3.5, -3.5, 7.0, 7.0, '#334155'); // Outer frame
    drawDeformedRect(skyX - 2.8, -2.8, 5.6, 5.6, '#38bdf8'); // Tinted acrylic dome
    drawDeformedLine(skyX - 2.8, 0, skyX + 2.8, 0, 'rgba(255,255,255,0.4)', 0.8);

    // 5. Aerodynamic RV Roof Air Conditioner Unit
    const acX = roofX - roofL * 0.08;
    drawDeformedRect(acX - 4.5, -3.2, 9.0, 6.4, '#e2e8f0');
    drawDeformedRect(acX - 4.0, -2.8, 8.0, 5.6, '#ffffff');
    drawDeformedLine(acX - 2.5, -2.0, acX - 2.5, 2.0, '#94a3b8', 1.0); // Side intake vents
    drawDeformedLine(acX + 2.5, -2.0, acX + 2.5, 2.0, '#94a3b8', 1.0);

    // 6. Monocrystalline Photovoltaic Solar Panel Array
    const solX = roofX - roofL * 0.32;
    drawDeformedRect(solX - 5.0, -roofW * 0.38, 10.0, roofW * 0.76, '#0f172a');
    drawDeformedRect(solX - 4.5, -roofW * 0.35, 9.0, roofW * 0.70, '#1e3a8a');
    for (let sy = -roofW * 0.30; sy <= roofW * 0.30; sy += 2.8) {
      drawDeformedLine(solX - 4.5, sy, solX + 4.5, sy, '#60a5fa', 0.8);
    }

    // 7. Full-Length Side Roll-Out Awning Cassette (Right roof edge)
    drawDeformedRect(roofX - roofL * 0.44, roofW / 2 - 0.8, roofL * 0.88, 2.2, '#94a3b8');
    drawDeformedLine(roofX - roofL * 0.44, roofW / 2 + 0.3, roofX + roofL * 0.44, roofW / 2 + 0.3, '#475569', 0.8);

    // 8. Utility Service Hatches (water inlet & shore power)
    drawDeformedCircle(roofX - roofL * 0.15, -halfW + 0.6, 1.2, '#0284c7'); // Fresh water cap
    drawDeformedRect(roofX - roofL * 0.28, -halfW + 0.2, 2.2, 1.0, '#cbd5e1'); // 230V flap

    // 9. Rear Camper Wall & Double Door / Equipment Mountings
    const rWsX1 = cabinX - cabinL / 2;
    drawDeformedLine(rWsX1, -cabinW * 0.45, rWsX1, cabinW * 0.45, 'rgba(0,0,0,0.5)', 1.2);
    // Rear high-mount third brake light
    drawDeformedRect(rWsX1 + 0.5, -1.8, 1.0, 3.6, '#ef4444');

    return;
  }

  // =========================================================================
  // 6. DEFAULT / SUVS / HATCHBACKS / CROSSOVERS / SPORTS
  // =========================================================================
  drawDeformedRect(cabinX - cabinL / 2, -cabinW / 2, cabinL, cabinW, '#0f172a');

  const isHatch = type === 'hatchback' || type === 'hatch_hot';
  const isSUV = type === 'suv' || type === 'suv_luxury' || type === 'suv_classic_box' || type === 'crossover_compact' || type === 'offroad_hardcore';

  const roofL = isSUV ? cabinL * 0.74 : (isHatch ? cabinL * 0.62 : cabinL * 0.66);
  const roofW = cabinW * 0.82;
  const roofX = isSUV ? (cabinX - cabinL * 0.02) : (cabinX + cabinL * 0.02);

  drawDeformedRect(roofX - roofL / 2, -roofW / 2, roofL, roofW, car.roofColor || car.color);

  // Front Windshield
  const fWsX1 = roofX + roofL / 2;
  const fWsX2 = cabinX + cabinL / 2;
  drawDeformedRect(fWsX1, -cabinW / 2 + 1, fWsX2 - fWsX1, cabinW - 2, 'rgba(56, 189, 248, 0.16)');
  drawDeformedLine(fWsX1 + 1, -cabinW / 2 + 2, fWsX2 - 1, cabinW / 2 - 2, 'rgba(255, 255, 255, 0.25)', 1.2);

  // Rear Windshield
  const rWsX1 = cabinX - cabinL / 2;
  const rWsX2 = roofX - roofL / 2;
  drawDeformedRect(rWsX1, -cabinW / 2 + 1, rWsX2 - rWsX1, cabinW - 2, 'rgba(56, 189, 248, 0.14)');
  drawDeformedLine(rWsX1 + 1, -cabinW / 4, rWsX2 - 1, cabinW / 4, 'rgba(255, 255, 255, 0.15)', 1.2);

  // Side Windows
  const sideWinH = (cabinW - roofW) / 2 - 0.5;
  drawDeformedRect(roofX - roofL / 2, -cabinW / 2 + 0.5, roofL, sideWinH, 'rgba(56, 189, 248, 0.08)');
  drawDeformedRect(roofX - roofL / 2, roofW / 2, roofL, sideWinH, 'rgba(56, 189, 248, 0.08)');
}

export function getVehicleBasePolygon(car: Vehicle, halfL: number, halfW: number, fc: number, rc: number, ld: number, rd: number, fld: number, frd: number, rld: number, rrd: number): { x: number; y: number }[] {
  const poly = getVehicleBasePolygonRaw(car, halfL, halfW, fc, rc, ld, rd, fld, frd, rld, rrd);
  const newPoly: {x: number, y: number}[] = [];
  for (let i = 0; i < poly.length; i++) {
    newPoly.push(poly[i]);
    if (i === 15 || i === 0 || i === 7 || i === 8) {
      const nextIdx = (i + 1) % poly.length;
      newPoly.push({
        x: (poly[i].x + poly[nextIdx].x) / 2,
        y: (poly[i].y + poly[nextIdx].y) / 2
      });
    }
  }
  return newPoly;
}
