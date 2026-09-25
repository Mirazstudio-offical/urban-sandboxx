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

  // 1. SEDANS (3-Box Notchback: Defined front hood/fenders, straight door flanks, distinct rectangular stepped trunk)
  const isSedan = type === 'sedan' || type === 'sedan_classic' || type === 'sedan_luxury' || 
                  type === 'sedan_compact' || type === 'classic_compact' || type === 'taxi' || 
                  type === 'police' || type === 'sedan_logan' || type === 'sedan_nexia' || 
                  type === 'sedan_accent' || type === 'sedan_polo' || type === 'sedan_samara';

  if (isSedan) {
    const sideW = halfW;
    return [
      { x: halfL - fc, y: 0 },
      { x: halfL - fc - 0.8, y: sideW * 0.78 },
      { x: halfL - frd - 2.0, y: sideW - frd * 0.35 },
      { x: halfL * 0.45, y: sideW - rd * 0.35 },
      { x: 0, y: sideW - rd * 0.35 },
      { x: -halfL * 0.45, y: sideW - rd * 0.35 },
      { x: -halfL + rrd + 1.2, y: sideW * 0.95 - rrd * 0.35 },
      { x: -halfL + rc + 0.4, y: sideW * 0.62 },
      { x: -halfL + rc, y: 0 },
      { x: -halfL + rc + 0.4, y: -sideW * 0.62 },
      { x: -halfL + rld + 1.2, y: -sideW * 0.95 + rld * 0.35 },
      { x: -halfL * 0.45, y: -sideW + ld * 0.35 },
      { x: 0, y: -sideW + ld * 0.35 },
      { x: halfL * 0.45, y: -sideW + ld * 0.35 },
      { x: halfL - fld - 2.0, y: -sideW + fld * 0.35 },
      { x: halfL - fc - 0.8, y: -sideW * 0.78 }
    ];
  }

  // 2. STATION WAGONS / ESTATES (2-Box Full Estate: Parallel straight body flanks extending to square rear tailgate)
  const isWagon = type === 'wagon_classic' || type === 'wagon_modern' || type === 'wagon_allroad';
  if (isWagon) {
    const sideW = halfW;
    return [
      { x: halfL - fc, y: 0 },
      { x: halfL - fc - 0.8, y: sideW * 0.78 },
      { x: halfL - frd - 2.0, y: sideW - frd * 0.35 },
      { x: halfL * 0.45, y: sideW - rd * 0.35 },
      { x: 0, y: sideW - rd * 0.35 },
      { x: -halfL * 0.50, y: sideW - rd * 0.35 },
      { x: -halfL + rrd + 0.8, y: sideW * 0.98 - rrd * 0.35 },
      { x: -halfL + rc + 0.2, y: sideW * 0.68 },
      { x: -halfL + rc, y: 0 },
      { x: -halfL + rc + 0.2, y: -sideW * 0.68 },
      { x: -halfL + rld + 0.8, y: -sideW * 0.98 + rld * 0.35 },
      { x: -halfL * 0.50, y: -sideW + ld * 0.35 },
      { x: 0, y: -sideW + ld * 0.35 },
      { x: halfL * 0.45, y: -sideW + ld * 0.35 },
      { x: halfL - fld - 2.0, y: -sideW + fld * 0.35 },
      { x: halfL - fc - 0.8, y: -sideW * 0.78 }
    ];
  }

  // 3. PICKUP TRUCKS (Hood + Cab + Rectangular Open Cargo Bed, Dually wide hips for Heavy)
  const isPickup = type === 'pickup' || type === 'pickup_heavy';
  if (isPickup) {
    const isHeavy = type === 'pickup_heavy';
    const bedFlareW = isHeavy ? (halfW + 2.0) : halfW;
    return [
      { x: halfL - fc, y: 0 },
      { x: halfL - fc - 0.5, y: halfW * 0.88 },
      { x: halfL - frd - 2.0, y: halfW - frd * 0.35 },
      { x: halfL * 0.35, y: halfW - rd * 0.35 },
      { x: 0, y: halfW - rd * 0.35 },
      { x: -halfL * 0.55, y: bedFlareW - rd * 0.35 },
      { x: -halfL + rrd + 0.6, y: bedFlareW * 0.96 - rrd * 0.35 },
      { x: -halfL + rc + 0.1, y: halfW * 0.70 },
      { x: -halfL + rc, y: 0 },
      { x: -halfL + rc + 0.1, y: -halfW * 0.70 },
      { x: -halfL + rld + 0.6, y: -bedFlareW * 0.96 + rld * 0.35 },
      { x: -halfL * 0.55, y: -bedFlareW + ld * 0.35 },
      { x: 0, y: -halfW + ld * 0.35 },
      { x: halfL * 0.35, y: -halfW + ld * 0.35 },
      { x: halfL - fld - 2.0, y: -halfW + fld * 0.35 },
      { x: halfL - fc - 0.5, y: -halfW * 0.88 }
    ];
  }

  // 4. SUPERCAR (Low wedge nose, wide muscular rear hips)
  if (type === 'supercar') {
    return [
      { x: halfL - fc + 0.5, y: 0 },
      { x: halfL - fc - 1.8, y: halfW * 0.76 },
      { x: halfL - frd - 3.2, y: halfW * 0.94 - frd * 0.35 },
      { x: halfL * 0.30, y: halfW * 0.96 - rd * 0.35 },
      { x: 0, y: halfW * 0.96 - rd * 0.35 },
      { x: -halfL * 0.45, y: halfW * 1.04 - rd * 0.35 },
      { x: -halfL + rrd + 1.0, y: halfW * 0.98 - rrd * 0.35 },
      { x: -halfL + rc + 0.3, y: halfW * 0.60 },
      { x: -halfL + rc, y: 0 },
      { x: -halfL + rc + 0.3, y: -halfW * 0.60 },
      { x: -halfL + rld + 1.0, y: -halfW * 0.98 + rld * 0.35 },
      { x: -halfL * 0.45, y: -halfW * 1.04 + ld * 0.35 },
      { x: 0, y: -halfW * 0.96 + ld * 0.35 },
      { x: halfL * 0.30, y: -halfW * 0.96 + ld * 0.35 },
      { x: halfL - fld - 3.2, y: -halfW * 0.94 + fld * 0.35 },
      { x: halfL - fc - 1.8, y: -halfW * 0.76 }
    ];
  }

  // 5. CLASSIC & MODERN MUSCLE (Broad rectangular front, long hood, muscular proportions)
  if (type === 'muscle_classic' || type === 'muscle') {
    return [
      { x: halfL - fc, y: 0 },
      { x: halfL - fc - 0.2, y: halfW * 0.90 },
      { x: halfL - frd - 2.0, y: halfW - frd * 0.35 },
      { x: halfL * 0.40, y: halfW - rd * 0.35 },
      { x: 0, y: halfW - rd * 0.35 },
      { x: -halfL * 0.45, y: halfW * 1.02 - rd * 0.35 },
      { x: -halfL + rrd + 0.8, y: halfW * 0.96 - rrd * 0.35 },
      { x: -halfL + rc + 0.2, y: halfW * 0.58 },
      { x: -halfL + rc, y: 0 },
      { x: -halfL + rc + 0.2, y: -halfW * 0.58 },
      { x: -halfL + rld + 0.8, y: -halfW * 0.96 + rld * 0.35 },
      { x: -halfL * 0.45, y: -halfW * 1.02 + ld * 0.35 },
      { x: 0, y: -halfW + ld * 0.35 },
      { x: halfL * 0.40, y: -halfW + ld * 0.35 },
      { x: halfL - fld - 2.0, y: -halfW + fld * 0.35 },
      { x: halfL - fc - 0.2, y: -halfW * 0.90 }
    ];
  }

  // 5h. SEMI-TRUCK TRACTOR (Седельный тягач КАМАЗ-5410: бескапотная кабина со спальником и открытая рама шасси сзади)
  if (type === 'truck_semi') {
    const cabFrontX = halfL - fc;
    const cabinL = halfL * 0.56; // 0.28 * length = 0.56 * halfL
    const cabRearX = halfL - cabinL - 2; // Real cabin rear wall (~12.0)
    const cabW = halfW * 0.94;
    const frameRearX = -halfL + rc + 0.5;
    const frameW = halfW * 0.38; // Narrow heavy ladder chassis rails

    return [
      { x: cabFrontX, y: 0 },
      { x: cabFrontX - 0.1, y: cabW },
      { x: halfL * 0.65, y: cabW - frd * 0.35 },
      { x: cabRearX, y: cabW - rd * 0.35 },
      { x: cabRearX, y: frameW },
      { x: 0, y: frameW },
      { x: -halfL * 0.45, y: frameW },
      { x: frameRearX, y: frameW },
      { x: frameRearX, y: 0 },
      { x: frameRearX, y: -frameW },
      { x: -halfL * 0.45, y: -frameW },
      { x: 0, y: -frameW },
      { x: cabRearX, y: -frameW },
      { x: cabRearX, y: -cabW + ld * 0.35 },
      { x: halfL * 0.65, y: -cabW + fld * 0.35 },
      { x: cabFrontX - 0.1, y: -cabW }
    ];
  }

  // 5i. GAZ-53 HOODED FLATBED & COVERED TRUCK (ГАЗ-53: скругленный капот, выраженные крылья и грузовая платформа)
  if (type === 'truck_flatbed' || type === 'truck_covered') {
    const hoodFrontX = halfL - fc;
    const hoodW = halfW * 0.72; // Tapered rounded front nose
    const fenderW = halfW * 0.88; // Rounded front fender wings
    const cabW = halfW * 0.86;
    const bedW = halfW * 0.98; // Wide wooden flatbed
    const bedFrontX = halfL * 0.18;
    const bedRearX = -halfL + rc + 0.2;

    return [
      { x: hoodFrontX, y: 0 },
      { x: hoodFrontX - 0.5, y: hoodW * 0.85 },
      { x: halfL * 0.65, y: fenderW - frd * 0.35 },
      { x: halfL * 0.32, y: cabW - rd * 0.35 },
      { x: bedFrontX, y: bedW },
      { x: 0, y: bedW - rd },
      { x: -halfL * 0.45, y: bedW - rd * 0.35 },
      { x: bedRearX, y: bedW - rrd * 0.35 },
      { x: bedRearX, y: 0 },
      { x: bedRearX, y: -bedW + rld * 0.35 },
      { x: -halfL * 0.45, y: -bedW + ld * 0.35 },
      { x: 0, y: -bedW + ld },
      { x: bedFrontX, y: -bedW },
      { x: halfL * 0.32, y: -cabW + ld * 0.35 },
      { x: halfL * 0.65, y: -fenderW + fld * 0.35 },
      { x: hoodFrontX - 0.5, y: -hoodW * 0.85 }
    ];
  }

  // 6. BOXY 4X4 & HEAVY COMMERCIAL RIGS (Strictly sharp rectangular perimeter, flat square front & flat square rear)
  const isBoxyRig = type === 'suv_classic_box' || type === 'offroad_hardcore' || 
                    type === 'truck_dump' || type === 'truck_box' || type === 'truck_water' || 
                    type === 'truck_tanker' || type === 'cement_mixer' || 
                    type === 'garbage_truck' || type === 'fire_ladder' || type === 'fire_engine' || 
                    type === 'truck_tow';
  if (isBoxyRig) {
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
    const sideW = halfW;
    return [
      { x: halfL - fc, y: 0 },
      { x: halfL - fc - 0.4, y: sideW * 0.92 },
      { x: halfL - frd - 1.5, y: sideW - frd * 0.35 },
      { x: halfL * 0.50, y: sideW - rd * 0.35 },
      { x: 0, y: sideW - rd * 0.35 },
      { x: -halfL * 0.60, y: sideW - rd * 0.35 },
      { x: -halfL + rrd + 1.0, y: sideW * 0.98 - rrd * 0.35 },
      { x: -halfL + rc + 0.2, y: sideW * 0.85 },
      { x: -halfL + rc, y: 0 },
      { x: -halfL + rc + 0.2, y: -sideW * 0.85 },
      { x: -halfL + rld + 1.0, y: -sideW * 0.98 + rld * 0.35 },
      { x: -halfL * 0.60, y: -sideW + ld * 0.35 },
      { x: 0, y: -sideW + ld * 0.35 },
      { x: halfL * 0.50, y: -sideW + ld * 0.35 },
      { x: halfL - fld - 1.5, y: -sideW + fld * 0.35 },
      { x: halfL - fc - 0.4, y: -sideW * 0.92 }
    ];
  }

  // 8. HATCHBACKS & HOT HATCHES (Compact 2-box, short hood, straight clean flanks, tapered rear hatch)
  const isHatch = type === 'hatchback' || type === 'hatch_hot' || type === 'micro_car' || 
                  type === 'retro_bubble' || type === 'compact_matiz' || type === 'liftback_tavria' || 
                  type === 'hatch_samara';
  if (isHatch) {
    const sideW = halfW;
    return [
      { x: halfL - fc, y: 0 },
      { x: halfL - fc - 0.8, y: sideW * 0.76 },
      { x: halfL - frd - 2.0, y: sideW - frd * 0.35 },
      { x: halfL * 0.45, y: sideW - rd * 0.35 },
      { x: 0, y: sideW - rd * 0.35 },
      { x: -halfL * 0.45, y: sideW - rd * 0.35 },
      { x: -halfL + rrd + 1.2, y: sideW * 0.92 - rrd * 0.35 },
      { x: -halfL + rc + 0.4, y: sideW * 0.58 },
      { x: -halfL + rc, y: 0 },
      { x: -halfL + rc + 0.4, y: -sideW * 0.58 },
      { x: -halfL + rld + 1.2, y: -sideW * 0.92 + rld * 0.35 },
      { x: -halfL * 0.45, y: -sideW + ld * 0.35 },
      { x: 0, y: -sideW + ld * 0.35 },
      { x: halfL * 0.45, y: -sideW + ld * 0.35 },
      { x: halfL - fld - 2.0, y: -sideW + fld * 0.35 },
      { x: halfL - fc - 0.8, y: -sideW * 0.76 }
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
  if (type === 'trailer_barrel' || type === 'trailer_vacuum') {
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
  if (type === 'trailer_flatbed_2axle' || type.startsWith('trailer_semi')) {
    const boxFront = type.startsWith('trailer_semi') ? halfL * 0.95 : halfL * 0.72;
    const boxRear = -halfL * 0.95;
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

  // 9d. ROAD MACHINERY (ROAD ROLLERS & ASPHALT PAVERS)
  if (type === 'paver_asphalt_wheeled') {
    // Wheeled asphalt paver has a 100% RIGID monocoque frame (hopper, chassis, cabin and screed are fixed)
    return [
      { x: halfL - fc, y: 0 },
      { x: halfL - fc, y: halfW * 0.45 },   // Push roller right bumper
      { x: halfL * 0.90, y: halfW * 0.96 }, // Hopper right front corner
      { x: halfL * 0.08, y: halfW * 0.96 }, // Hopper right rear corner
      { x: 0, y: halfW * 0.82 },            // Tractor waist
      { x: -halfL * 0.58, y: halfW * 1.00 }, // Operator deck outer step
      { x: -halfL * 0.72, y: halfW * 0.90 }, // Screed tow arm pivot
      { x: -halfL * 0.78, y: halfW * 1.10 }, // Screed end plate front
      { x: -halfL + rc, y: halfW * 1.10 },   // Screed end plate rear
      { x: -halfL + rc, y: 0 },             // Screed rear center
      { x: -halfL + rc, y: -halfW * 1.10 },  // Screed left end plate rear
      { x: -halfL * 0.78, y: -halfW * 1.10 }, // Screed left end plate front
      { x: -halfL * 0.72, y: -halfW * 0.90 }, // Screed left tow arm pivot
      { x: -halfL * 0.58, y: -halfW * 1.00 }, // Operator deck left step
      { x: 0, y: -halfW * 0.82 },            // Tractor left waist
      { x: halfL * 0.08, y: -halfW * 0.96 }, // Hopper left rear corner
      { x: halfL * 0.90, y: -halfW * 0.96 }, // Hopper left front corner
      { x: halfL - fc, y: -halfW * 0.45 },   // Push roller left bumper
    ];
  }

  const isArticulatedRoller = type === 'roller_heavy_tandem' || type === 'roller_compact_sidewalk' || type === 'roller_pneumatic';
  if (isArticulatedRoller) {
    const gamma = car.steerAngle || 0;
    const cosF = Math.cos(gamma);
    const sinF = Math.sin(gamma);

    const drumW = type === 'roller_compact_sidewalk' ? halfW * 0.94 : halfW * 0.97;
    const waistW = halfW * 0.42;

    // Front frame raw points (pivots by steer angle gamma around central hinge at 0, 0)
    const rawFront = [
      { x: halfL - fc, y: 0 },
      { x: halfL - fc, y: drumW },
      { x: halfL * 0.35, y: drumW },
      { x: halfL * 0.12, y: waistW * 1.3 },
      { x: 0, y: waistW }
    ];

    // Rear frame (fixed baseline reference frame containing engine, ROPS cabin & rear drum)
    const rawRear = [
      { x: -halfL * 0.12, y: waistW * 1.3 },
      { x: -halfL * 0.35, y: drumW },
      { x: -halfL + rc, y: drumW },
      { x: -halfL + rc, y: 0 },
      { x: -halfL + rc, y: -drumW },
      { x: -halfL * 0.35, y: -drumW },
      { x: -halfL * 0.12, y: -waistW * 1.3 },
      { x: 0, y: -waistW }
    ];

    const rawFrontLeft = [
      { x: halfL * 0.12, y: -waistW * 1.3 },
      { x: halfL * 0.35, y: -drumW },
      { x: halfL - fc, y: -drumW }
    ];

    const rotatedFront = rawFront.map(p => ({
      x: p.x * cosF - p.y * sinF,
      y: p.x * sinF + p.y * cosF
    }));

    const rotatedFrontLeft = rawFrontLeft.map(p => ({
      x: p.x * cosF - p.y * sinF,
      y: p.x * sinF + p.y * cosF
    }));

    return [...rotatedFront, ...rawRear, ...rotatedFrontLeft];
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

  // Default / Modern SUV / Crossover / Sports Coupe (Clean modern profile)
  const sideW = halfW;
  return [
    { x: halfL - fc, y: 0 },
    { x: halfL - fc - 0.6, y: sideW * 0.78 },
    { x: halfL - frd - 2.0, y: sideW - frd * 0.35 },
    { x: halfL * 0.45, y: sideW - rd * 0.35 },
    { x: 0, y: sideW - rd * 0.35 },
    { x: -halfL * 0.45, y: sideW - rd * 0.35 },
    { x: -halfL + rrd + 1.2, y: sideW * 0.95 - rrd * 0.35 },
    { x: -halfL + rc + 0.3, y: sideW * 0.62 },
    { x: -halfL + rc, y: 0 },
    { x: -halfL + rc + 0.3, y: -sideW * 0.62 },
    { x: -halfL + rld + 1.2, y: -sideW * 0.95 + rld * 0.35 },
    { x: -halfL * 0.45, y: -sideW + ld * 0.35 },
    { x: 0, y: -sideW + ld * 0.35 },
    { x: halfL * 0.45, y: -sideW + ld * 0.35 },
    { x: halfL - fld - 2.0, y: -sideW + fld * 0.35 },
    { x: halfL - fc - 0.6, y: -sideW * 0.78 }
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

  const isCabOverTruck = type === 'truck_box' || type === 'truck_dump' || type === 'truck_semi' || 
                         type === 'cement_mixer' || type === 'garbage_truck' ||
                         type === 'fire_ladder';

  if (type === 'truck_semi') {
    // Sleeper cab with rear bunk compartment
    cabinL = car.length * 0.28;
    cabinW = car.width * 0.92;
    cabinX = halfL - cabinL / 2 - 2;
  } else if (isCabOverTruck) {
    cabinL = car.length * 0.18;
    cabinW = car.width * 0.88;
    cabinX = halfL - cabinL / 2 - 2;
  } else if (type === 'fire_engine' || type === 'fire_rescue') {
    cabinL = car.length * 0.28;
    cabinW = car.width * 0.90;
    cabinX = halfL - cabinL / 2 - 2;
  } else if (type === 'truck_flatbed' || type === 'truck_covered' || type === 'truck_tanker' || type === 'truck_water') {
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
  } else if (type === 'sedan_classic' || type === 'classic_compact' || type === 'sedan_nexia') {
    cabinL = car.length * 0.48;
    cabinW = car.width * 0.78;
    cabinX = -car.length * 0.04;
  } else if (type === 'sedan_luxury') {
    cabinL = car.length * 0.52;
    cabinW = car.width * 0.82;
    cabinX = -car.length * 0.06;
  } else if (type === 'sedan_logan') {
    cabinL = car.length * 0.53;
    cabinW = car.width * 0.82;
    cabinX = -car.length * 0.03;
  } else if (type === 'sedan_polo' || type === 'sedan_accent') {
    cabinL = car.length * 0.51;
    cabinW = car.width * 0.80;
    cabinX = -car.length * 0.05;
  } else if (type === 'sedan_samara') {
    cabinL = car.length * 0.49;
    cabinW = car.width * 0.78;
    cabinX = -car.length * 0.04;
  } else if (type === 'compact_matiz') {
    cabinL = car.length * 0.62;
    cabinW = car.width * 0.84;
    cabinX = -car.length * 0.02;
  } else if (type === 'liftback_tavria') {
    cabinL = car.length * 0.55;
    cabinW = car.width * 0.80;
    cabinX = -car.length * 0.06;
  } else if (type === 'hatch_samara') {
    cabinL = car.length * 0.53;
    cabinW = car.width * 0.80;
    cabinX = -car.length * 0.08;
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
  } else if (type === 'roller_heavy_tandem' || type === 'roller_pneumatic') {
    cabinL = car.length * 0.38;
    cabinW = car.width * 0.85;
    cabinX = 0;
  } else if (type === 'roller_compact_sidewalk') {
    cabinL = car.length * 0.35;
    cabinW = car.width * 0.80;
    cabinX = -car.length * 0.12;
  } else if (type === 'paver_asphalt_wheeled') {
    cabinL = car.length * 0.32;
    cabinW = car.width * 0.92;
    cabinX = -car.length * 0.18;
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
  if (type === 'bus' || type === 'ambulance' || type === 'ambulance_van' || type.startsWith('trailer_') || type === 'trailer_barrel' || type === 'trailer_flatbed_2axle' || type === 'trailer_semi' || car.isTrailer) {
    return;
  }

  // =========================================================================
  // 1. SEDAN ARCHETYPE (Notchback: Front hood, A/B/C pillars, distinct SEPARATE REAR TRUNK DECK!)
  // =========================================================================
  const isSedan = type === 'sedan' || type === 'sedan_classic' || type === 'sedan_luxury' || 
                  type === 'sedan_compact' || type === 'classic_compact' || type === 'taxi' || 
                  type === 'police' || type === 'sedan_logan' || type === 'sedan_nexia' || 
                  type === 'sedan_accent' || type === 'sedan_polo' || type === 'sedan_samara';

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

    // Logan front roof whip antenna
    if (type === 'sedan_logan') {
      drawDeformedCircle(roofX + roofL / 2 - 1.5, 0, 1.0, '#0f172a');
      drawDeformedLine(roofX + roofL / 2 - 1.5, 0, roofX + roofL / 2 + 2.5, 0, '#0f172a', 1.0);
    }

    // Polo shark-fin antenna
    if (type === 'sedan_polo') {
      drawDeformedRect(roofX - roofL / 2 + 1.2, -0.6, 1.8, 1.2, '#0f172a');
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

    // Specific trunk details per model
    if (type === 'sedan_samara') {
      // VAZ-21099 / 2115 factory pedestal rear trunk spoiler wing
      const spX = trunkX1 + 2.0;
      drawDeformedRect(spX, -trunkDeckW * 0.44, 1.8, trunkDeckW * 0.88, '#1e293b');
      drawDeformedRect(spX + 0.3, -2.0, 0.8, 4.0, '#ef4444'); // spoiler 3rd brake light
    } else if (type === 'sedan_nexia') {
      // Daewoo Nexia full-width dark red taillight panel along rear edge
      drawDeformedRect(trunkX1 + 1.0, -trunkDeckW * 0.42, 1.2, trunkDeckW * 0.84, '#7f1d1d');
      drawDeformedRect(trunkX1 + 1.0, -1.5, 1.2, 3.0, '#1e293b'); // license plate recess
    } else {
      // Chrome badge / key lock in center of trunk lid
      drawDeformedCircle(trunkX1 + 3.5, 0, 0.8, '#cbd5e1');
      // High-mount third brake light at base of rear glass
      drawDeformedRect(trunkX2 - 0.6, -1.8, 0.8, 3.6, '#ef4444');
    }

    // Side rub-strips for budget models (Logan, Samara, Nexia)
    if (type === 'sedan_logan' || type === 'sedan_samara' || type === 'sedan_nexia') {
      drawDeformedLine(cabinX - cabinL * 0.35, -halfW + 0.4, cabinX + cabinL * 0.35, -halfW + 0.4, '#0f172a', 1.0);
      drawDeformedLine(cabinX - cabinL * 0.35, halfW - 0.4, cabinX + cabinL * 0.35, halfW - 0.4, '#0f172a', 1.0);
    }

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

    // Road Train Marker Lights (3 оранжевых фонарика «автопоезд») on tractor roof front
    const markerX = roofX + roofL / 2 - 1.0;
    const isTrainOn = car.roadTrainLightsOn !== false;
    const mBody = '#1c1917';
    const mLens = isTrainOn ? '#f59e0b' : '#78350f';
    const mCore = isTrainOn ? '#fef08a' : '#451a03';
    [-2.5, 0, 2.5].forEach(my => {
      drawDeformedRect(markerX - 0.6, my - 0.5, 1.2, 1.0, mBody);
      drawDeformedRect(markerX - 0.4, my - 0.35, 0.8, 0.7, mLens);
      if (isTrainOn) {
        drawDeformedCircle(markerX, my, 0.25, mCore);
      }
    });

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
  // 5D. VANS, DELIVERY, ARMORED & COMMERCIAL TRANSPORTERS
  // =========================================================================
  const isVanType = type === 'van' || type === 'bus_minibus' || type === 'delivery_truck' || type === 'van_cargo_old' || type === 'truck_armored';
  if (isVanType) {
    const isRetro = type === 'van_cargo_old';
    const isDelivery = type === 'delivery_truck';
    const isArmored = type === 'truck_armored';

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

    if (isDelivery || type === 'bus_minibus') {
      const markerX = roofX + roofL / 2 - 1.2;
      const isTrainOn = car.roadTrainLightsOn !== false;
      const mBody = '#1c1917';
      const mLens = isTrainOn ? '#f59e0b' : '#78350f';
      const mCore = isTrainOn ? '#fef08a' : '#451a03';
      [-2.8, 0, 2.8].forEach(my => {
        drawDeformedRect(markerX - 0.6, my - 0.5, 1.2, 1.0, mBody);
        drawDeformedRect(markerX - 0.4, my - 0.35, 0.8, 0.7, mLens);
        if (isTrainOn) {
          drawDeformedCircle(markerX, my, 0.25, mCore);
        }
      });
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
  // 5F-1. GAZ-53 HOODED TRUCK CABIN (ГАЗ-53 «Газон» Бортовой / Крытый с шифером)
  // =========================================================================
  if (type === 'truck_flatbed' || type === 'truck_covered') {
    // 1. GAZ-53 Tapered Rounded Hood & Front Fender Wings (Вид строго сверху)
    const hoodX1 = cabinX + cabinL / 2;
    const hoodX2 = halfL - fc - 0.5;
    const hoodW = halfW * 1.32; // Tapered central hood width
    const fenderW = halfW * 2 - 1.0; // Outer width across front fender wings
    const cabColor = car.color || '#0284c7';

    // Front Fender Wings (Скругленные крылья над передними колесами)
    drawDeformedRect(hoodX1 - 1, -fenderW / 2, hoodX2 - hoodX1 + 1, fenderW, cabColor);
    // Dark wheel arch inner gap
    drawDeformedLine(hoodX1 + 2, -fenderW / 2 + 0.5, hoodX2 - 4, -fenderW / 2 + 0.5, 'rgba(0,0,0,0.4)', 1.0);
    drawDeformedLine(hoodX1 + 2, fenderW / 2 - 0.5, hoodX2 - 4, fenderW / 2 - 0.5, 'rgba(0,0,0,0.4)', 1.0);

    // Central Raised Hood Stamping (Капот ГАЗ-53 со скруглением к передней кромке)
    drawDeformedRect(hoodX1, -hoodW / 2, hoodX2 - hoodX1, hoodW, cabColor);
    // Central hood longitudinal crease ridge (Центральное ребро выштамповки капота)
    drawDeformedLine(hoodX1, 0, hoodX2 - 0.5, 0, 'rgba(255,255,255,0.3)', 1.2);
    drawDeformedLine(hoodX1, 0.6, hoodX2 - 0.5, 0.6, 'rgba(0,0,0,0.25)', 0.8);

    // Side Hood Air Vents / Louvers (Боковые продольные жалюзи капота ГАЗ-53, видны сверху)
    const louverX1 = hoodX1 + 2.5;
    const louverX2 = hoodX2 - 3.5;
    [-hoodW / 2 + 1.2, hoodW / 2 - 1.2].forEach(ly => {
      drawDeformedLine(louverX1, ly, louverX2, ly, 'rgba(0,0,0,0.35)', 0.9);
      drawDeformedLine(louverX1, ly + 0.8, louverX2, ly + 0.8, 'rgba(0,0,0,0.35)', 0.9);
    });

    // 2. Strict 2D Top-Down Hood Nose Leading Edge & Steel Bumper (Вид строго сверху: без 2.5D решетки и плоских фар в небо)
    drawDeformedLine(hoodX2 - 0.4, -hoodW / 2 + 0.6, hoodX2 - 0.4, hoodW / 2 - 0.6, 'rgba(255,255,255,0.25)', 0.8);
    drawDeformedLine(hoodX2, -fenderW / 2 + 0.6, hoodX2, fenderW / 2 - 0.6, 'rgba(0,0,0,0.35)', 0.8);

    // Front Metal Bumper with Tow Hooks (Массивный стальной швеллерный бампер ГАЗ-53, вид сверху)
    const bumperX = hoodX2 - 0.2;
    drawDeformedRect(bumperX, -halfW + 0.4, 1.6, halfW * 2 - 0.8, '#1e293b');
    drawDeformedLine(bumperX + 0.2, -halfW + 0.8, bumperX + 0.2, halfW - 0.8, '#475569', 0.6); // Top edge steel bevel
    // Dual front towing hooks (Буксирные крючья ГАЗ-53)
    drawDeformedRect(bumperX + 1.2, -halfW * 0.38, 1.2, 1.4, '#cbd5e1');
    drawDeformedRect(bumperX + 1.2, halfW * 0.38 - 1.4, 1.2, 1.4, '#cbd5e1');

    // 3. Rounded Cabin Shell & Curved Roof (Кабина ГАЗ-53)
    drawDeformedRect(cabinX - cabinL / 2, -cabinW / 2, cabinL, cabinW, '#0f172a');

    const roofL = cabinL * 0.64;
    const roofW = cabinW * 0.88;
    const roofX = cabinX + cabinL * 0.03;
    drawDeformedRect(roofX - roofL / 2, -roofW / 2, roofL, roofW, car.roofColor || cabColor);

    // Roof stamping ribs & circular ventilation dome hatch (Лючок вентиляции крыши)
    drawDeformedLine(roofX - roofL / 2 + 1.5, -roofW * 0.26, roofX + roofL / 2 - 1.5, -roofW * 0.26, 'rgba(0,0,0,0.22)', 0.8);
    drawDeformedLine(roofX - roofL / 2 + 1.5, roofW * 0.26, roofX + roofL / 2 - 1.5, roofW * 0.26, 'rgba(0,0,0,0.22)', 0.8);
    drawDeformedCircle(roofX - 1.0, 0, 1.4, 'rgba(0,0,0,0.18)', 'rgba(255,255,255,0.25)', 0.6);

    // 3 Amber "Road Train" Marker Lights (3 фонаря автопоезда)
    const markerX = roofX + roofL / 2 - 1.0;
    const isTrainOn = car.roadTrainLightsOn !== false;
    const mLens = isTrainOn ? '#f59e0b' : '#78350f';
    const mCore = isTrainOn ? '#fef08a' : '#451a03';
    [-2.6, 0, 2.6].forEach(my => {
      drawDeformedRect(markerX - 0.6, my - 0.45, 1.2, 0.9, '#0f172a');
      drawDeformedRect(markerX - 0.4, my - 0.3, 0.8, 0.6, mLens);
      if (isTrainOn) {
        drawDeformedCircle(markerX, my, 0.3, mCore);
      }
    });

    // 4. Curved Panoramic Front Windshield with Wipers (Панорамное лобовое стекло)
    const fWsX1 = roofX + roofL / 2;
    const fWsX2 = cabinX + cabinL / 2;
    drawDeformedRect(fWsX1, -cabinW / 2 + 0.8, fWsX2 - fWsX1, cabinW - 1.6, 'rgba(56, 189, 248, 0.22)');
    drawDeformedLine(fWsX1 + 1, -cabinW / 2 + 1.4, fWsX2 - 1, cabinW / 2 - 1.4, 'rgba(255, 255, 255, 0.3)', 1.2);
    // Vintage dual wipers
    drawDeformedLine(fWsX1 + 0.8, -cabinW * 0.25, fWsX2 - 0.8, -cabinW * 0.06, '#0f172a', 1.0);
    drawDeformedLine(fWsX1 + 0.8, cabinW * 0.06, fWsX2 - 0.8, cabinW * 0.25, '#0f172a', 1.0);

    // 5. Side Windows with Triangular Vent Quarter-Lights & Tubular Bracket Mirrors
    const sideWinH = (cabinW - roofW) / 2 - 0.4;
    drawDeformedRect(roofX - roofL / 2, -cabinW / 2 + 0.4, roofL, sideWinH, 'rgba(56, 189, 248, 0.12)');
    drawDeformedRect(roofX - roofL / 2, roofW / 2, roofL, sideWinH, 'rgba(56, 189, 248, 0.12)');
    // Quarter-light dividing pillars (Стойки форточек)
    drawDeformedLine(roofX + roofL * 0.18, -cabinW / 2 + 0.4, roofX + roofL * 0.18, -cabinW / 2 + 0.4 + sideWinH, '#0f172a', 0.8);
    drawDeformedLine(roofX + roofL * 0.18, roofW / 2, roofX + roofL * 0.18, roofW / 2 + sideWinH, '#0f172a', 0.8);

    // Tubular bracket side mirrors (Зеркала заднего вида на изогнутых металлических кронштейнах)
    const mirrorX = roofX + roofL * 0.25;
    // Left mirror
    drawDeformedLine(mirrorX, -cabinW / 2, mirrorX - 1.2, -halfW - 2.8, '#1e293b', 1.0);
    drawDeformedRect(mirrorX - 2.4, -halfW - 3.4, 2.4, 1.4, '#0f172a');
    // Right mirror
    drawDeformedLine(mirrorX, cabinW / 2, mirrorX - 1.2, halfW + 2.8, '#1e293b', 1.0);
    drawDeformedRect(mirrorX - 2.4, halfW + 2.0, 2.4, 1.4, '#0f172a');

    // Cab Entry Side Footsteps (Подножки кабины)
    drawDeformedRect(cabinX - cabinL * 0.25, -halfW + 0.2, cabinL * 0.5, 1.4, '#334155');
    drawDeformedRect(cabinX - cabinL * 0.25, halfW - 1.6, cabinL * 0.5, 1.4, '#334155');

    // Rear cab wall with small rectangular back window
    const rWsX1 = cabinX - cabinL / 2;
    drawDeformedLine(rWsX1, -cabinW / 2 + 1, rWsX1, cabinW / 2 - 1, '#0f172a', 1.4);
    drawDeformedRect(rWsX1 + 0.4, -cabinW * 0.22, 0.8, cabinW * 0.44, 'rgba(56, 189, 248, 0.16)');

    return;
  }

  // =========================================================================
  // 5F-2. HEAVY TRUCK CABIN (ЗИЛ-4331 - Водовоз КО-829А, Бензовоз)
  // =========================================================================
  const isZilHoodedTruckCab = type === 'truck_water' || type === 'truck_tanker';
  if (isZilHoodedTruckCab) {
    // 1. ZIL-4331 Angular Hood & Iconic White Front Grille Mask («Намордник» ЗИЛ-4331)
    const hoodX1 = cabinX + cabinL / 2;
    const hoodX2 = halfL - fc - 0.5;
    const hoodW = halfW * 2 - 4.5;

    // Metal Hood Body
    drawDeformedRect(hoodX1, -hoodW / 2, hoodX2 - hoodX1, hoodW, car.color || '#0284c7');
    // Central cowl shutline
    drawDeformedLine(hoodX1, 0, hoodX2 - 2, 0, 'rgba(0,0,0,0.35)', 1.0);

    // Strict 2D Top-Down Hood Nose Leading Edge (Вид строго сверху без плоской 2.5D маски)
    drawDeformedLine(hoodX2 - 0.4, -hoodW / 2 + 0.6, hoodX2 - 0.4, hoodW / 2 - 0.6, 'rgba(255,255,255,0.25)', 0.8);
    drawDeformedLine(hoodX2, -hoodW / 2 + 0.4, hoodX2, hoodW / 2 - 0.4, 'rgba(0,0,0,0.35)', 0.8);

    // Heavy Front Bumper with integrated steps and tow hooks
    drawDeformedRect(hoodX2 - 0.5, -halfW + 0.2, 2.2, halfW * 2 - 0.4, '#0f172a');
    // Bumper rubber pads / step plates
    drawDeformedRect(hoodX2, -halfW * 0.70, 1.4, halfW * 0.35, '#334155');
    drawDeformedRect(hoodX2, halfW * 0.35, 1.4, halfW * 0.35, '#334155');
    // Dual front tow hooks / eyes (буксирные проушины)
    drawDeformedRect(hoodX2 + 1.2, -halfW * 0.40, 1.2, 1.8, '#cbd5e1');
    drawDeformedRect(hoodX2 + 1.2, halfW * 0.40 - 1.8, 1.2, 1.8, '#cbd5e1');

    // 2. Enclosed Cab Base & Roof
    drawDeformedRect(cabinX - cabinL / 2, -cabinW / 2, cabinL, cabinW, '#0f172a');

    const roofL = cabinL * 0.65;
    const roofW = cabinW * 0.86;
    const roofX = cabinX + cabinL * 0.04;
    drawDeformedRect(roofX - roofL / 2, -roofW / 2, roofL, roofW, car.roofColor || car.color || '#0284c7');

    // Roof stiffener channels
    drawDeformedLine(roofX - roofL / 2 + 1, -roofW * 0.28, roofX + roofL / 2 - 1, -roofW * 0.28, 'rgba(0,0,0,0.22)', 0.8);
    drawDeformedLine(roofX - roofL / 2 + 1, roofW * 0.28, roofX + roofL / 2 - 1, roofW * 0.28, 'rgba(0,0,0,0.22)', 0.8);

    // 3. Road Train Marker Lights (3 оранжевых фонарика «автопоезд») on cab roof front
    const markerX = roofX + roofL / 2 - 1.2;
    const isTrainOn = car.roadTrainLightsOn !== false;
    const mBody = '#1c1917';
    const mLens = isTrainOn ? '#f59e0b' : '#78350f';
    const mCore = isTrainOn ? '#fef08a' : '#451a03';
    [-2.8, 0, 2.8].forEach(my => {
      drawDeformedRect(markerX - 0.7, my - 0.5, 1.4, 1.0, mBody);
      drawDeformedRect(markerX - 0.5, my - 0.35, 1.0, 0.7, mLens);
      if (isTrainOn) {
        drawDeformedCircle(markerX, my, 0.3, mCore);
      }
    });

    // 4. Municipal Orange Flashing Beacon (Оранжевый проблесковый маячок) on roof for truck_water!
    if (type === 'truck_water') {
      const beaconX = roofX - 1.0;
      drawDeformedCircle(beaconX, 0, 2.2, '#0f172a'); // Black rubber base
      drawDeformedCircle(beaconX, 0, 1.6, '#f97316'); // Glowing orange lens
      drawDeformedCircle(beaconX, 0, 0.8, '#fef08a'); // Bright incandescent bulb center
    }

    // 5. Wide Panoramic Front Windshield with dual wipers
    const fWsX1 = roofX + roofL / 2;
    const fWsX2 = cabinX + cabinL / 2;
    drawDeformedRect(fWsX1, -cabinW / 2 + 0.8, fWsX2 - fWsX1, cabinW - 1.6, 'rgba(56, 189, 248, 0.22)');
    drawDeformedLine(fWsX1 + 1, -cabinW / 2 + 1.5, fWsX2 - 1, cabinW / 2 - 1.5, 'rgba(255, 255, 255, 0.3)', 1.2);
    // Heavy dual wipers
    drawDeformedLine(fWsX1 + 1, -cabinW * 0.25, fWsX2 - 1, -cabinW * 0.05, '#0f172a', 1.0);
    drawDeformedLine(fWsX1 + 1, cabinW * 0.05, fWsX2 - 1, cabinW * 0.25, '#0f172a', 1.0);

    // 6. Side Door Windows & Extended Bracket Side Mirrors
    const sideWinH = (cabinW - roofW) / 2 - 0.4;
    drawDeformedRect(roofX - roofL / 2, -cabinW / 2 + 0.4, roofL, sideWinH, 'rgba(56, 189, 248, 0.12)');
    drawDeformedRect(roofX - roofL / 2, roofW / 2, roofL, sideWinH, 'rgba(56, 189, 248, 0.12)');

    // Extended tubular bracket side mirrors (зеркала заднего вида на кронштейнах)
    const mirrorX = roofX + roofL * 0.25;
    // Left mirror
    drawDeformedLine(mirrorX, -cabinW / 2, mirrorX - 1.0, -halfW - 2.5, '#0f172a', 1.0);
    drawDeformedRect(mirrorX - 2.2, -halfW - 3.2, 2.4, 1.4, '#1e293b');
    // Right mirror
    drawDeformedLine(mirrorX, cabinW / 2, mirrorX - 1.0, halfW + 2.5, '#0f172a', 1.0);
    drawDeformedRect(mirrorX - 2.2, halfW + 1.8, 2.4, 1.4, '#1e293b');

    // Rear cab wall
    const rWsX1 = cabinX - cabinL / 2;
    drawDeformedLine(rWsX1, -cabinW / 2 + 1, rWsX1, cabinW / 2 - 1, '#0f172a', 1.2);

    return;
  }

  // =========================================================================
  // 5G. KAMAZ CAB-OVER TRUCK CABIN (КАМАЗ-5511 / КАМАЗ-5320 / Мусоровоз / Бетономешалка)
  // =========================================================================
  const isKamazCabOver = type === 'truck_dump' || type === 'truck_box' || type === 'truck_semi' || type === 'cement_mixer' || type === 'garbage_truck' || type === 'fire_ladder';
  if (isKamazCabOver) {
    // Authentic Soviet & Russian Kamaz factory cab color: iconic terracotta orange (#d94e16) if unassigned or dull slate
    const isDullSlate = !car.color || car.color === '#334155' || car.color === '#0f172a';
    const cabColor = isDullSlate ? '#d94e16' : car.color;
    
    // 1. Cab Base (Rectangular, cab-over-engine)
    drawDeformedRect(cabinX - cabinL / 2, -cabinW / 2, cabinL, cabinW, '#0f172a');
    
    // 2. Roof Panel (Classic Kamaz ribbed roof)
    const roofL = cabinL * 0.70;
    const roofW = cabinW * 0.90;
    const roofX = cabinX + cabinL * 0.10;
    drawDeformedRect(roofX - roofL / 2, -roofW / 2, roofL, roofW, car.roofColor || cabColor);
    
    // 3. Kamaz distinctive triple ribbed roof stamps
    drawDeformedLine(roofX - roofL / 2 + 1, -roofW * 0.35, roofX + roofL / 2 - 1, -roofW * 0.35, 'rgba(0,0,0,0.25)', 1.2);
    drawDeformedLine(roofX - roofL / 2 + 1, 0, roofX + roofL / 2 - 1, 0, 'rgba(0,0,0,0.25)', 1.2);
    drawDeformedLine(roofX - roofL / 2 + 1, roofW * 0.35, roofX + roofL / 2 - 1, roofW * 0.35, 'rgba(0,0,0,0.25)', 1.2);
    
    // 4. Roof air intake/vent hatch
    drawDeformedRect(roofX + 0.5, -3, 3, 6, 'rgba(0,0,0,0.15)');

    // 5. Flat steep windshield
    const fWsX1 = roofX + roofL / 2;
    const fWsX2 = cabinX + cabinL / 2;
    drawDeformedRect(fWsX1, -cabinW / 2 + 0.8, fWsX2 - fWsX1, cabinW - 1.6, 'rgba(56, 189, 248, 0.22)');
    // Classic split two-piece windshield center rubber gasket (вертикальная перемычка)
    drawDeformedLine(fWsX1, 0, fWsX2, 0, '#0f172a', 1.2);
    // Wipers
    drawDeformedLine(fWsX1 + 1.2, -cabinW * 0.30, fWsX2 - 0.5, -cabinW * 0.05, '#0f172a', 1.2);
    drawDeformedLine(fWsX1 + 1.2, cabinW * 0.30, fWsX2 - 0.5, cabinW * 0.05, '#0f172a', 1.2);
    
    // 6. External Front Sun Visor (Солнцезащитный козырек - often black or cab color)
    drawDeformedRect(fWsX1 - 1, -cabinW / 2, 1.2, cabinW, '#1e293b');

    // 7. Side Windows
    const sideWinH = (cabinW - roofW) / 2 - 0.4;
    drawDeformedRect(roofX - roofL / 2, -cabinW / 2 + 0.4, roofL, sideWinH, 'rgba(56, 189, 248, 0.12)');
    drawDeformedRect(roofX - roofL / 2, roofW / 2, roofL, sideWinH, 'rgba(56, 189, 248, 0.12)');
    
    // 8. Extended Kamaz Bracket Mirrors (Very prominent, spanning far out)
    const mirrorX = fWsX1 - 1.5;
    // Left mirror
    drawDeformedLine(mirrorX, -cabinW / 2, mirrorX, -halfW - 3.5, '#0f172a', 1.2);
    drawDeformedRect(mirrorX - 1.5, -halfW - 4.5, 3, 2.0, '#1e293b');
    // Right mirror
    drawDeformedLine(mirrorX, cabinW / 2, mirrorX, halfW + 3.5, '#0f172a', 1.2);
    drawDeformedRect(mirrorX - 1.5, halfW + 2.5, 3, 2.0, '#1e293b');

    // 9. Authentic Kamaz Front Nose & Radiator Grille
    // White stamped central grille panel («морда КАМАЗ» белого цвета)
    const grilleX = fWsX2 - 0.2;
    const grilleW = cabinW * 0.65;
    drawDeformedRect(grilleX - 1.2, -grilleW / 2, 1.4, grilleW, '#f8fafc');
    // Horizontal matte black ventilation slats
    drawDeformedLine(grilleX - 0.7, -grilleW * 0.42, grilleX - 0.7, grilleW * 0.42, '#0f172a', 0.8);
    drawDeformedLine(grilleX - 0.2, -grilleW * 0.38, grilleX - 0.2, grilleW * 0.38, '#0f172a', 0.8);
    // Dark Kamaz badge emblem in the center
    drawDeformedRect(grilleX - 0.8, -1.8, 0.9, 3.6, '#0f172a');

    // Aerodynamic corner wind deflectors (боковые щитки-дефлекторы КАМАЗ)
    drawDeformedRect(grilleX - 1.6, -cabinW / 2 + 0.4, 1.6, 2.0, cabColor);
    drawDeformedLine(grilleX - 1.6, -cabinW / 2 + 0.4, grilleX, -cabinW / 2 + 0.4, '#0f172a', 0.8);
    drawDeformedRect(grilleX - 1.6, cabinW / 2 - 2.4, 1.6, 2.0, cabColor);
    drawDeformedLine(grilleX - 1.6, cabinW / 2 - 0.4, grilleX, cabinW / 2 - 0.4, '#0f172a', 0.8);

    // 10. Heavy stamped steel front bumper with headlights & fog lights
    const bumperX = fWsX2 + 1.0;
    drawDeformedRect(bumperX - 0.8, -halfW * 0.92, 2.0, halfW * 1.84, '#1e293b');
    // Main rectangular halogen headlights
    drawDeformedRect(bumperX + 0.4, -halfW * 0.78, 0.8, 3.2, '#fef08a');
    drawDeformedRect(bumperX + 0.4, halfW * 0.78 - 3.2, 0.8, 3.2, '#fef08a');
    // Amber corner turn signals
    drawDeformedRect(bumperX + 0.4, -halfW * 0.90, 0.8, 1.8, '#f59e0b');
    drawDeformedRect(bumperX + 0.4, halfW * 0.90 - 1.8, 0.8, 1.8, '#f59e0b');
    // Towing shackles / hooks
    drawDeformedRect(bumperX + 0.4, -4.0, 0.9, 1.6, '#475569');
    drawDeformedRect(bumperX + 0.4, 2.4, 0.9, 1.6, '#475569');
    
    // 11. Road Train Marker Lights (3 оранжевых фонарика «автопоезд» на крыше)
    const markerX = roofX + roofL / 2 - 1.2;
    const isTrainOn = car.roadTrainLightsOn !== false;
    const mBody = '#1c1917';
    const mLens = isTrainOn ? '#f59e0b' : '#78350f';
    const mCore = isTrainOn ? '#fef08a' : '#451a03';
    [-3.0, 0, 3.0].forEach(my => {
      drawDeformedRect(markerX - 0.7, my - 0.5, 1.4, 1.0, mBody);
      drawDeformedRect(markerX - 0.5, my - 0.35, 1.0, 0.7, mLens);
      if (isTrainOn) {
        drawDeformedCircle(markerX, my, 0.3, mCore);
      }
    });

    // 12. Equipment behind the cab (dump truck spare tire / semi-truck air intake snorkel)
    if (type === 'truck_dump') {
      const spareX = cabinX - cabinL / 2 - 3.5;
      drawDeformedRect(spareX, -halfW + 4, 3, 7, '#0f172a'); // The black rubber tire
      drawDeformedLine(spareX + 1.5, -halfW + 4.5, spareX + 1.5, -halfW + 10.5, '#475569', 1.2); // Steel wheel rim edge
      
      // Air intake stack on the right side behind the cab
      drawDeformedCircle(spareX + 1.5, halfW - 4, 1.8, '#1e293b');
      drawDeformedCircle(spareX + 1.5, halfW - 4, 1.0, '#0f172a');
    } else if (type === 'truck_semi') {
      // Tall air cleaner snorkel pipe with mushroom cap behind right side of cab
      const snorkelX = cabinX - cabinL / 2 - 1.8;
      const snorkelY = halfW - 3.8;
      drawDeformedCircle(snorkelX, snorkelY, 1.8, '#1e293b');
      drawDeformedCircle(snorkelX, snorkelY, 1.2, '#0f172a');
      drawDeformedCircle(snorkelX, snorkelY, 0.6, '#475569');
      // Snorkel vertical bracket clamp
      drawDeformedLine(snorkelX, snorkelY - 1.8, snorkelX, halfW - 1.0, '#334155', 1.0);
    }

    return;
  }

  // =========================================================================
  // 6. DEFAULT / SUVS / HATCHBACKS / CROSSOVERS / SPORTS
  // =========================================================================
  drawDeformedRect(cabinX - cabinL / 2, -cabinW / 2, cabinL, cabinW, '#0f172a');

  const isHatch = type === 'hatchback' || type === 'hatch_hot' || type === 'compact_matiz' || 
                  type === 'liftback_tavria' || type === 'hatch_samara' || type === 'micro_car' || type === 'retro_bubble';
  const isSUV = type === 'suv' || type === 'suv_luxury' || type === 'suv_classic_box' || type === 'crossover_compact' || type === 'offroad_hardcore';

  const roofL = isSUV ? cabinL * 0.74 : (type === 'compact_matiz' ? cabinL * 0.68 : (isHatch ? cabinL * 0.62 : cabinL * 0.66));
  const roofW = cabinW * 0.82;
  const roofX = isSUV ? (cabinX - cabinL * 0.02) : (cabinX + cabinL * 0.02);

  drawDeformedRect(roofX - roofL / 2, -roofW / 2, roofL, roofW, car.roofColor || car.color);

  // Matiz black roof rails
  if (type === 'compact_matiz') {
    drawDeformedLine(roofX - roofL / 2 + 1, -roofW / 2 + 0.6, roofX + roofL / 2 - 1, -roofW / 2 + 0.6, '#0f172a', 1.2);
    drawDeformedLine(roofX - roofL / 2 + 1, roofW / 2 - 0.6, roofX + roofL / 2 - 1, roofW / 2 - 0.6, '#0f172a', 1.2);
  }

  // Front Windshield
  const fWsX1 = roofX + roofL / 2;
  const fWsX2 = cabinX + cabinL / 2;
  drawDeformedRect(fWsX1, -cabinW / 2 + 1, fWsX2 - fWsX1, cabinW - 2, 'rgba(56, 189, 248, 0.16)');
  drawDeformedLine(fWsX1 + 1, -cabinW / 2 + 2, fWsX2 - 1, cabinW / 2 - 2, 'rgba(255, 255, 255, 0.25)', 1.2);

  // Single center wiper for Tavria (iconic design detail)
  if (type === 'liftback_tavria') {
    drawDeformedLine(fWsX1 + 0.5, 0, fWsX2 - 0.5, 2.0, '#0f172a', 1.2);
  }

  // Rear Windshield
  const rWsX1 = cabinX - cabinL / 2;
  const rWsX2 = roofX - roofL / 2;
  drawDeformedRect(rWsX1, -cabinW / 2 + 1, rWsX2 - rWsX1, cabinW - 2, 'rgba(56, 189, 248, 0.14)');
  drawDeformedLine(rWsX1 + 1, -cabinW / 4, rWsX2 - 1, cabinW / 4, 'rgba(255, 255, 255, 0.15)', 1.2);

  // Rear spoiler & wiper for Samara and Tavria
  if (type === 'hatch_samara') {
    // Aerodynamic black roof spoiler on rear tailgate
    drawDeformedRect(roofX - roofL / 2 - 1.2, -roofW / 2, 1.4, roofW, '#1e293b');
    // Rear wiper
    drawDeformedLine(rWsX1 + 0.5, 0, rWsX2 - 0.5, -2.5, '#0f172a', 0.8);
    // Side body protection rub-strips
    drawDeformedLine(cabinX - cabinL * 0.4, -halfW + 0.4, cabinX + cabinL * 0.4, -halfW + 0.4, '#0f172a', 1.0);
    drawDeformedLine(cabinX - cabinL * 0.4, halfW - 0.4, cabinX + cabinL * 0.4, halfW - 0.4, '#0f172a', 1.0);
  } else if (type === 'liftback_tavria') {
    // Small black rubber lip spoiler on liftback edge
    drawDeformedRect(rWsX1 - 1.0, -roofW * 0.44, 1.0, roofW * 0.88, '#1e293b');
  } else if (type === 'compact_matiz') {
    // Rear wiper and high brake light
    drawDeformedLine(rWsX1 + 0.5, 0, rWsX2 - 0.5, 1.8, '#0f172a', 0.8);
    drawDeformedRect(roofX - roofL / 2 - 0.4, -1.2, 0.8, 2.4, '#ef4444');
  }

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
