import { Vehicle } from './types';
import { getVehicleOpticsMounts } from './vehicleHelpers';
import {
  resolveVehicleTruckFrameAndBody,
  getTruckFrameAxlePositions,
  type TruckPlatformId,
  type TruckFrameVariant,
  type TruckBodyVariant
} from './truckChassisVariants';
export { getTruckFrameAxlePositions } from './truckChassisVariants';
export {
  getVehicleBasePolygon,
  getVehicleCabinDimensions,
  renderVehicleGreenhouseAndBodyPanels
} from './vehicleArchetypes';
export type { VehicleRenderContext } from './vehicleArchetypes';
import type { VehicleRenderContext } from './vehicleArchetypes';
import {
  renderWheeledAsphaltPaver,
  renderHeavyTandemRoller,
  renderCompactSidewalkRoller,
  renderPneumaticRoller
} from './roadMachineryVisuals';
import {
  renderMotoIzhJupiter,
  renderMotoUralSidecar,
  renderMotoJawa350,
  renderMotoSport,
  renderMotoChopper,
  renderMopedSoviet
} from './motorcycleVisuals';
export {
  renderWheeledAsphaltPaver,
  renderHeavyTandemRoller,
  renderCompactSidewalkRoller,
  renderPneumaticRoller,
  renderMotoIzhJupiter,
  renderMotoUralSidecar,
  renderMotoJawa350,
  renderMotoSport,
  renderMotoChopper,
  renderMopedSoviet
};

/**
 * Renders anatomically accurate, high-detail truck wheels and tires for all 18 chassis frames:
 * - Front steered single tires (or offroad wide chevron tires on 4x4/6x6, or twin steered axles on 8x4)
 * - Rear dual twin tires (двускатная ошиновка с зазором между скатами), offroad single chevron tires
 *   (односкатные вездеходные шины КИ-113 / ОИ-25 / ИП-184 с подкачкой), or wide super-single tires
 * - Authentic platform wheel hubs (GAZ-53 6-slot stamped steel, ZIL-130 8-stud ventilated disc,
 *   ZIL-4331 / KAMAZ heavy cast spider trilex / planetary reduction hubs)
 */
export function renderConfigurableTruckWheels(
  vCtx: VehicleRenderContext,
  resolved?: { platform: TruckPlatformId; frame: TruckFrameVariant; body: TruckBodyVariant } | null
): void {
  const {
    ctx, car, halfL, halfW,
    deform, drawDeformedRect, drawDeformedLine, drawDeformedCircle
  } = vCtx;

  const info = resolved ?? resolveVehicleTruckFrameAndBody(car);
  if (!info) return;

  const { platform, frame } = info;
  const { frontAxlesX, rearAxlesX } = getTruckFrameAxlePositions(frame, halfL, platform);
  const isOffroad = frame.rearTireType === 'offroad_single' || frame.wheelFormula === '4x4' || frame.wheelFormula === '6x6';
  const wheelRadius = isOffroad ? 5.2 : 4.8; // Diameter 9.6 - 10.4px
  const steerAngle = (car.steerAngle || 0) * 0.65;

  const drawSingleTire = (cx: number, cy: number, width: number, angle: number, isSteered: boolean, isLeft: boolean) => {
    const [wx, wy] = deform(cx, cy);
    ctx.save();
    ctx.translate(wx, wy);
    if (isSteered && Math.abs(angle) > 0.001) {
      ctx.rotate(angle);
    }

    const rL = wheelRadius;
    const rW = width * 0.5;

    // 1. Base vulcanized rubber carcass
    ctx.fillStyle = '#0b0f17';
    ctx.beginPath();
    ctx.roundRect(-rL, -rW, rL * 2, rW * 2, 1.1);
    ctx.fill();

    // 2. Crown tread rubber band
    ctx.fillStyle = '#18202c';
    ctx.fillRect(-rL + 0.5, -rW + 0.4, rL * 2 - 1.0, rW * 2 - 0.8);

    // 3. Tread pattern (Aggressive herring-bone chevron lugs for 4x4/6x6 vs highway rib lugs)
    if (isOffroad) {
      ctx.strokeStyle = '#070a0f';
      ctx.lineWidth = 0.9;
      for (let tx = -rL + 1.4; tx <= rL - 1.4; tx += 2.1) {
        ctx.beginPath();
        ctx.moveTo(tx - 0.6, -rW + 0.2);
        ctx.lineTo(tx + 0.5, 0);
        ctx.lineTo(tx - 0.6, rW - 0.2);
        ctx.stroke();
      }
      // Sidewall mud-biting shoulder lugs
      ctx.fillStyle = '#263244';
      for (let tx = -rL + 1.2; tx <= rL - 1.2; tx += 2.2) {
        ctx.fillRect(tx - 0.4, -rW, 0.9, 0.55);
        ctx.fillRect(tx - 0.4, rW - 0.55, 0.9, 0.55);
      }
    } else {
      // Highway 3-rib longitudinal grooves + cross sipes
      ctx.strokeStyle = '#090d14';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(-rL + 0.8, -rW * 0.32);
      ctx.lineTo(rL - 0.8, -rW * 0.32);
      ctx.moveTo(-rL + 0.8, rW * 0.32);
      ctx.lineTo(rL - 0.8, rW * 0.32);
      ctx.stroke();
      for (let tx = -rL + 1.5; tx <= rL - 1.5; tx += 2.0) {
        ctx.beginPath();
        ctx.moveTo(tx, -rW + 0.3);
        ctx.lineTo(tx, rW - 0.3);
        ctx.stroke();
      }
    }

    // 4. Outer wheel hubcap / planetary reducer / CTIS inflation pipe protruding slightly on outer face
    const outY = isLeft ? -rW : rW;
    const dir = isLeft ? -1 : 1;
    const hubColor = platform === 'kamaz' ? '#334155' : (platform === 'zil130' ? '#cbd5e1' : '#475569');
    ctx.fillStyle = hubColor;
    ctx.fillRect(-1.5, outY + (dir < 0 ? -0.45 : -0.15), 3.0, 0.6);
    if (isOffroad) {
      // Central tire inflation system (Система централизованной подкачки шин) rotary union cap
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-0.7, outY + (dir < 0 ? -0.75 : 0.15), 1.4, 0.6);
    }

    ctx.restore();
  };

  // Render Front Steered Axles (1 axle on 4x2/4x4/6x4/6x6, 2 steered axles on 8x4)
  frontAxlesX.forEach((fx, idx) => {
    const tireW = isOffroad ? 3.5 : 2.9;
    const frontTrackIn =
      platform === 'gaz53' ? 1.4 :
      (platform === 'zil130' || platform === 'zil4331') ? 1.2 : 0.8;
    const yCenter = halfW - tireW * 0.5 - frontTrackIn;
    const angle = idx === 0 ? steerAngle : steerAngle * 0.72;
    drawSingleTire(fx, -yCenter, tireW, angle, true, true);
    drawSingleTire(fx, yCenter, tireW, angle, true, false);
  });

  // Render Rear Drive Axles (1 axle on 4x2/4x4, 2 tandem bogie axles on 6x4/6x6/8x4)
  rearAxlesX.forEach((rx) => {
    if (frame.rearTireType === 'dual') {
      // Authentic twin dual tires (двускатная ошиновка) with distinct dark gap between inner & outer tires
      const singleW = 2.35;
      const dualGap = 0.55;
      const outerY = halfW - singleW * 0.5 - 0.25;
      const innerY = outerY - singleW - dualGap;
      // Left dual pair
      drawSingleTire(rx, -outerY, singleW, 0, false, true);
      drawSingleTire(rx, -innerY, singleW, 0, false, false);
      // Right dual pair
      drawSingleTire(rx, innerY, singleW, 0, false, true);
      drawSingleTire(rx, outerY, singleW, 0, false, false);
      // Deep hub dish ring between dual wheels
      drawDeformedRect(rx - 1.6, -outerY - singleW * 0.5 - 0.2, 3.2, 0.4, '#334155');
      drawDeformedRect(rx - 1.6, outerY + singleW * 0.5 - 0.2, 3.2, 0.4, '#334155');
    } else if (frame.rearTireType === 'super_single') {
      const superW = 4.2;
      const yCenter = halfW - superW * 0.5 - 0.25;
      drawSingleTire(rx, -yCenter, superW, 0, false, true);
      drawSingleTire(rx, yCenter, superW, 0, false, false);
    } else {
      // offroad_single or single
      const tireW = isOffroad ? 3.7 : 3.0;
      const yCenter = halfW - tireW * 0.5 - (isOffroad ? 0.35 : 0.65);
      drawSingleTire(rx, -yCenter, tireW, 0, false, true);
      drawSingleTire(rx, yCenter, tireW, 0, false, false);
    }
  });
}

/**
 * Renders the Fifth-Wheel Tractor Coupling Assembly (`body_fifth_wheel` / `Седельно-сцепное устройство ССУ JOST / КАМАЗ`)
 * directly over the bare chassis frame for semi-tractor configurations.
 */
export function renderTruckFifthWheelCoupling(
  vCtx: VehicleRenderContext,
  resolved?: { platform: TruckPlatformId; frame: TruckFrameVariant; body: TruckBodyVariant } | null
): void {
  const {
    car, halfL,
    drawDeformedRect, drawDeformedLine, drawDeformedCircle
  } = vCtx;
  const rc = vCtx.rc ?? 0;
  const cabinX = vCtx.cabinX ?? 0;
  const cabinL = vCtx.cabinL ?? (halfL * 0.4);

  const info = resolved ?? resolveVehicleTruckFrameAndBody(car);
  const platform = info?.platform ?? 'kamaz';
  const frame = info?.frame;
  const { rearAxlesX } = frame
    ? getTruckFrameAxlePositions(frame, halfL, platform)
    : { rearAxlesX: [-halfL * 0.45, -halfL * 0.74] };

  const bogieCenterX = rearAxlesX.length >= 2
    ? (rearAxlesX[0] + rearAxlesX[1]) * 0.5
    : (rearAxlesX[0] ?? (-halfL * 0.5));
  const fifthWheelX = bogieCenterX + 1.0;
  const frameX1 = -halfL + rc + 0.6;
  const frameX2 = cabinX - cabinL / 2 + 0.4;
  const railOuterY = platform === 'gaz53' ? 4.4 : 4.8;

  // 1. Rear Tapered Frame Ski-Ramps (Задние направляющие скосы рамы седельного тягача для подката под п/прицеп)
  drawDeformedRect(frameX1 - 0.4, -railOuterY, 3.8, 1.85, '#1e293b');
  drawDeformedLine(frameX1 - 0.4, -railOuterY + 0.9, frameX1 + 3.4, -railOuterY + 0.9, '#64748b', 0.9);
  drawDeformedRect(frameX1 - 0.4, railOuterY - 1.85, 3.8, 1.85, '#1e293b');
  drawDeformedLine(frameX1 - 0.4, railOuterY - 0.9, frameX1 + 3.4, railOuterY - 0.9, '#64748b', 0.9);

  // 2. Behind-Cab Aluminum Diamond-Plate Catwalk & Pneumatic Tender Tower (Переходной мостик и стойка перекидки)
  const catwalkX1 = Math.max(fifthWheelX + 5.4, frameX2 - 8.5);
  const catwalkX2 = frameX2 - 0.6;
  if (catwalkX2 > catwalkX1 + 1.8) {
    drawDeformedRect(catwalkX1, -railOuterY - 1.2, catwalkX2 - catwalkX1, (railOuterY + 1.2) * 2, '#334155');
    drawDeformedRect(catwalkX1 + 0.4, -railOuterY - 0.8, catwalkX2 - catwalkX1 - 0.8, (railOuterY + 0.8) * 2, '#475569');
    // Checkerplate anti-slip cross-hatching
    for (let cx = catwalkX1 + 1.0; cx < catwalkX2 - 0.6; cx += 1.5) {
      drawDeformedLine(cx, -railOuterY - 0.5, cx + 0.6, railOuterY + 0.5, '#1e293b', 0.6);
    }
    // Side access step grates with yellow safety edge
    drawDeformedLine(catwalkX1, -railOuterY - 1.2, catwalkX2, -railOuterY - 1.2, '#facc15', 0.7);
    drawDeformedLine(catwalkX1, railOuterY + 1.2, catwalkX2, railOuterY + 1.2, '#facc15', 0.7);
  }

  // Pneumatic & electrical tender stand ("гусак" / стойка пневмо- и электровыводов за кабиной)
  const standX = catwalkX2 - 1.2;
  drawDeformedRect(standX - 0.8, -2.4, 1.6, 4.8, '#0f172a');
  drawDeformedCircle(standX, -1.5, 0.55, '#ef4444'); // Red emergency air line coupling
  drawDeformedCircle(standX, 0, 0.55, '#f8fafc');    // 24V ISO electrical socket
  drawDeformedCircle(standX, 1.5, 0.55, '#eab308');  // Yellow service brake air line
  // Rear swivel work spotlight (фара освещения сцепки) on cab rear / stand
  drawDeformedRect(standX - 1.2, -4.2, 1.4, 1.6, '#0f172a');
  drawDeformedCircle(standX - 1.2, -3.4, 0.55, '#fef08a');

  // Coiled pneumatic suzie hoses & black ABS cable running from tender stand toward fifth wheel
  drawDeformedLine(standX - 0.6, -1.5, fifthWheelX + 4.4, -1.2, '#ef4444', 1.0);
  drawDeformedLine(standX - 0.6, 0, fifthWheelX + 4.2, 0, '#0f172a', 0.9);
  drawDeformedLine(standX - 0.6, 1.5, fifthWheelX + 4.4, 1.2, '#eab308', 1.0);

  // 3. Corrugated Mounting Subframe Plate (Монтажная плита ССУ, приклепанная к полкам лонжеронов)
  const plateL = 10.6;
  const plateW = (railOuterY + 0.7) * 2;
  drawDeformedRect(fifthWheelX - plateL * 0.5, -plateW * 0.5, plateL, plateW, '#1e293b');
  for (let px = fifthWheelX - plateL * 0.42; px <= fifthWheelX + plateL * 0.42; px += 2.1) {
    drawDeformedLine(px, -plateW * 0.46, px, plateW * 0.46, '#0f172a', 0.8);
    drawDeformedCircle(px, -plateW * 0.44, 0.38, '#cbd5e1');
    drawDeformedCircle(px, plateW * 0.44, 0.38, '#cbd5e1');
  }

  // Heavy cast pivot trunnion pedestals (опоры качания седла)
  drawDeformedRect(fifthWheelX - 3.6, -4.9, 7.2, 1.7, '#334155');
  drawDeformedRect(fifthWheelX - 3.6, 3.2, 7.2, 1.7, '#334155');
  drawDeformedLine(fifthWheelX, -5.2, fifthWheelX, 5.2, '#64748b', 1.2); // Transverse pivot pin

  // 4. Cast-Steel Horseshoe Fifth-Wheel Saddle (Литая подковообразная плита седла ССУ с канавками для смазки)
  const fwR = 4.6;
  // Front rounded horseshoe arch
  drawDeformedCircle(fifthWheelX + 0.9, 0, fwR, '#1e293b', '#475569', 0.9);
  drawDeformedCircle(fifthWheelX + 0.9, 0, fwR - 0.6, '#0b0f17'); // Graphite grease coat

  // Rear splayed guide horns (задние рога седла с V-образным ловителем)
  drawDeformedRect(fifthWheelX - 4.4, -fwR, 5.2, fwR * 0.66, '#1e293b');
  drawDeformedRect(fifthWheelX - 4.4, fwR * 0.34, 5.2, fwR * 0.66, '#1e293b');
  drawDeformedRect(fifthWheelX - 3.9, -fwR + 0.5, 4.4, fwR * 0.52, '#0b0f17');
  drawDeformedRect(fifthWheelX - 3.9, fwR * 0.48 - 0.5, 4.4, fwR * 0.52, '#0b0f17');

  // Grease retention grooves on the bearing surface
  drawDeformedLine(fifthWheelX - 2.6, -2.5, fifthWheelX + 2.6, -2.5, '#334155', 0.75);
  drawDeformedLine(fifthWheelX - 2.6, 2.5, fifthWheelX + 2.6, 2.5, '#334155', 0.75);
  drawDeformedLine(fifthWheelX + 2.4, -2.2, fifthWheelX + 2.4, 2.2, '#334155', 0.75);

  // V-shaped kingpin entry throat & bevelled guide horn edges
  drawDeformedLine(fifthWheelX - 4.4, -3.1, fifthWheelX - 0.4, -1.05, '#64748b', 1.2);
  drawDeformedLine(fifthWheelX - 4.4, 3.1, fifthWheelX - 0.4, 1.05, '#64748b', 1.2);

  // Forged Kingpin Locking Jaws (Запорный кулак шкворня в центре зева)
  drawDeformedCircle(fifthWheelX + 0.2, 0, 1.45, '#475569', '#0f172a', 0.7);
  drawDeformedCircle(fifthWheelX + 0.2, 0, 0.7, '#090d14');

  // Manual Release Pull Rod & Red Safety Latch on Left Flank (Рычаг расцепки седла)
  drawDeformedLine(fifthWheelX + 0.2, -fwR, fifthWheelX + 0.2, -fwR - 3.4, '#cbd5e1', 1.1);
  drawDeformedLine(fifthWheelX + 0.2, -fwR - 3.4, fifthWheelX - 1.4, -fwR - 3.4, '#cbd5e1', 1.2);
  drawDeformedCircle(fifthWheelX + 0.2, -fwR - 0.4, 0.65, '#ef4444');
}

/**
 * Renders a premium, realistic, and anatomically detailed bare truck chassis frame
 * (лонжероны швеллерного профиля с полками и заклёпками, штампованные поперечины с косынками,
 * задняя часть двигателя и КПП с КОМ, раздаточная коробка для 4x4/6x6, карданные валы с крестовинами
 * и подвесным подшипником, чулки ведущих мостов с редукторами и тормозными энергоаккумуляторами,
 * листовые рессоры со стремянками и балансирной тележкой с 6 реактивными штангами, надрамники под
 * конкретный тип кузова, 1 или 2 топливных бака, ресиверы пневмосистемы, ящик АКБ, выхлопная система,
 * держатель запаски, крылья с брызговиками, задний буксирный крюк-фаркоп, пневмовыводы «Палм» и фонари ФП-130).
 */
export function renderTruckBareFrame(
  vCtx: VehicleRenderContext,
  resolved?: { platform: TruckPlatformId; frame: TruckFrameVariant; body: TruckBodyVariant } | null
): void {
  const {
    car, halfL, halfW,
    drawDeformedRect, drawDeformedLine, drawDeformedCircle
  } = vCtx;
  const fc = vCtx.fc ?? 0;
  const rc = vCtx.rc ?? 0;
  const cabinX = vCtx.cabinX ?? 0;
  const cabinL = vCtx.cabinL ?? (halfL * 0.4);

  const info = resolved ?? resolveVehicleTruckFrameAndBody(car);
  if (!info) return;

  const { platform, frame, body } = info;
  const frameX1 = -halfL + rc + 0.6; // Rear closing crossmember
  const frameX2 = cabinX - cabinL / 2 + 1.8; // Extends slightly under cab rear wall so there is never an empty gap
  const frameLen = Math.max(12, frameX2 - frameX1);

  const railOuterY = platform === 'gaz53' ? 4.4 : 4.8;
  const railFlangeW = platform === 'gaz53' ? 1.7 : 1.9;
  const railInnerY = railOuterY - railFlangeW;

  const { frontAxlesX, rearAxlesX } = getTruckFrameAxlePositions(frame, halfL, platform);
  const isAllWheelDrive = frame.wheelFormula === '4x4' || frame.wheelFormula === '6x6';
  const isTandemRear = rearAxlesX.length >= 2;
  const isBareOrTractor = body.id === 'body_none' || body.id === 'body_fifth_wheel';
  const hasTipperSubframe = frame.mountTypes.includes('short_tipper');
  const hasHeavySubframe = frame.payloadCapacityKg >= 10000 || frame.mountTypes.includes('heavy_tandem');
  const hasPtoUnit = frame.mountTypes.includes('municipal_pto') || frame.mountTypes.includes('fire_special') || hasTipperSubframe;

  // =========================================================================
  // 1. UNDER-CAB FRONT AXLE & STEERING LINKAGE (VISIBLE ON 4x4 / 6x6 / 8x4)
  // =========================================================================
  frontAxlesX.forEach((fAxX, fIdx) => {
    if (isAllWheelDrive || fIdx > 0) {
      drawDeformedRect(fAxX - 1.0, -halfW + 1.8, 2.0, halfW * 2 - 3.6, '#0f172a');
      if (isAllWheelDrive && fIdx === 0) {
        drawDeformedRect(fAxX - 1.8, -2.8, 3.6, 5.2, '#1e293b');
        drawDeformedCircle(fAxX, -0.5, 1.35, '#334155');
      }
    }
  });

  // =========================================================================
  // 2. LEAF SPRING SUSPENSION, SHACKLES, U-BOLTS & TANDEM BALANCING BOGIE
  // =========================================================================
  const springYOut = railOuterY + 1.65;
  const springW = 1.3;

  if (isTandemRear) {
    const midX = rearAxlesX[0];
    const rearX = rearAxlesX[1];
    const bogieCenterX = (midX + rearX) * 0.5;
    const springSpan = (midX - rearX) + 3.4;

    // Massive bogie trunnion cross-shaft (ось балансирной подвески КАМАЗ / ЗИЛ-133)
    drawDeformedRect(bogieCenterX - 1.2, -springYOut - 0.7, 2.4, (springYOut + 0.7) * 2, '#0b0f17');
    drawDeformedLine(bogieCenterX, -springYOut - 0.5, bogieCenterX, springYOut + 0.5, '#475569', 1.0);

    // Left & right inverted semi-elliptic multi-leaf spring packs
    [-1, 1].forEach(side => {
      const sy = side < 0 ? -springYOut : (springYOut - springW);
      // Leaf spring steel pack with individual stepped leaf lines
      drawDeformedRect(rearX - 1.7, sy, springSpan, springW, '#263244');
      drawDeformedLine(rearX - 1.2, sy + springW * 0.35, rearX - 1.2 + springSpan - 1.0, sy + springW * 0.35, '#64748b', 0.6);
      drawDeformedLine(rearX - 0.6, sy + springW * 0.7, rearX - 0.6 + springSpan - 2.2, sy + springW * 0.7, '#475569', 0.5);
      // Cast trunnion pivot hub & oil filler cap (ступица балансира)
      drawDeformedRect(bogieCenterX - 1.7, sy - 0.4, 3.4, springW + 0.8, '#0f172a');
      drawDeformedCircle(bogieCenterX, sy + springW * 0.5, 0.8, '#94a3b8', '#1e293b', 0.4);
      // Chrome U-bolts & clamping saddle (стремянки рессор балансира)
      drawDeformedRect(bogieCenterX - 2.2, sy - 0.45, 0.7, springW + 0.9, '#cbd5e1');
      drawDeformedRect(bogieCenterX + 1.5, sy - 0.45, 0.7, springW + 0.9, '#cbd5e1');
    });
  } else {
    // Single rear axle semi-elliptic leaf springs with helper springs (подрессорники) & shackles
    const rAxX = rearAxlesX[0];
    const springLen = 12.0;
    [-1, 1].forEach(side => {
      const sy = side < 0 ? -springYOut : (springYOut - springW);
      // Front & rear spring hanger brackets riveted to frame rail
      drawDeformedRect(rAxX + springLen * 0.45, sy - 0.25, 1.6, springW + 0.5, '#0f172a');
      drawDeformedRect(rAxX - springLen * 0.55, sy - 0.25, 1.6, springW + 0.5, '#0f172a');
      // Main leaf spring pack
      drawDeformedRect(rAxX - springLen * 0.5, sy, springLen, springW, '#263244');
      drawDeformedLine(rAxX - springLen * 0.45, sy + springW * 0.5, rAxX + springLen * 0.45, sy + springW * 0.5, '#64748b', 0.65);
      // Twin U-bolt clamps over axle seat
      drawDeformedRect(rAxX - 1.5, sy - 0.35, 0.75, springW + 0.7, '#cbd5e1');
      drawDeformedRect(rAxX + 0.75, sy - 0.35, 0.75, springW + 0.7, '#cbd5e1');
      // Telescopic hydraulic shock absorber (амортизатор задней подвески)
      drawDeformedLine(rAxX - 2.1, sy + springW * 0.5, rAxX - 0.4, side < 0 ? -railOuterY : railOuterY, '#0f172a', 1.1);
    });
  }

  // =========================================================================
  // 3. LIVE DRIVE AXLES, DIFFERENTIAL PUMPKINS, TORQUE RODS & BRAKE CHAMBERS
  // =========================================================================
  rearAxlesX.forEach((axX, idx) => {
    const isPassThrough = isTandemRear && idx === 0;
    // Heavy cast steel axle housing beam ("чулок ведущего моста") spanning between wheel hubs
    drawDeformedRect(axX - 1.3, -halfW + 1.2, 2.6, halfW * 2 - 2.4, '#0b0f17');
    drawDeformedLine(axX - 0.35, -halfW + 1.8, axX - 0.35, halfW - 1.8, '#334155', 0.9); // Cylindrical top highlight
    drawDeformedLine(axX + 0.55, -halfW + 1.8, axX + 0.55, halfW - 1.8, '#020617', 0.7); // Bottom shadow

    // Central cast-iron differential carrier housing ("редуктор / картер главной передачи")
    const diffL = isPassThrough ? 4.8 : 4.4;
    const diffW = isPassThrough ? 5.8 : 5.4;
    drawDeformedRect(axX - diffL * 0.5, -diffW * 0.5, diffL, diffW, '#1e293b');
    drawDeformedCircle(axX, 0, diffW * 0.40, '#263244', '#0b0f17', 0.7);
    // Cast stiffening ribs across differential carrier
    drawDeformedLine(axX - diffL * 0.42, -0.9, axX + diffL * 0.42, -0.9, '#0f172a', 0.7);
    drawDeformedLine(axX - diffL * 0.42, 0.9, axX + diffL * 0.42, 0.9, '#0f172a', 0.7);
    // Ring of 8 differential housing bolts & oil filler plug
    drawDeformedCircle(axX, 0, 0.75, '#cbd5e1');
    for (let a = 0; a < 8; a++) {
      const ang = (a * Math.PI) / 4;
      drawDeformedCircle(axX + Math.cos(ang) * 1.75, Math.sin(ang) * 1.75, 0.28, '#94a3b8');
    }

    // Pneumatic spring-brake chambers (тормозные камеры и энергоаккумуляторы) + slack adjusters
    [-railOuterY - 2.3, railOuterY + 1.0].forEach(chamY => {
      drawDeformedRect(axX + 0.9, chamY, 1.9, 1.35, '#1e293b');
      drawDeformedCircle(axX + 2.15, chamY + 0.67, 0.6, '#475569', '#0f172a', 0.4);
      // Brake S-cam shaft rod (разжимной кулак)
      drawDeformedLine(axX + 0.9, chamY + 0.67, axX - 0.2, chamY + 0.67, '#64748b', 0.75);
    });

    // Upper & lower reactive torque rods (реактивные штанги балансирной тележки)
    if (isTandemRear) {
      const bogieCenterX = (rearAxlesX[0] + rearAxlesX[1]) * 0.5;
      // Upper V-arrangement or parallel rods from central crossmember to differential top
      drawDeformedLine(bogieCenterX, -2.4, axX, -1.1, '#334155', 1.15);
      drawDeformedLine(bogieCenterX, 2.4, axX, 1.1, '#334155', 1.15);
      // Lower outer torque rods along frame rails
      drawDeformedLine(bogieCenterX, -railOuterY - 0.5, axX, -railOuterY - 0.5, '#1e293b', 0.95);
      drawDeformedLine(bogieCenterX, railOuterY + 0.5, axX, railOuterY + 0.5, '#1e293b', 0.95);
    }
  });

  // =========================================================================
  // 4. GEARBOX, PTO, TRANSFER CASE & TUBULAR CARDAN DRIVESHAFTS WITH U-JOINTS
  // =========================================================================
  // Gearbox rear housing & PTO (Коробка отбора мощности КОМ) emerging behind cab
  const gbX = frameX2 - 3.6;
  drawDeformedRect(gbX, -2.2, 4.0, 4.4, '#1e293b');
  drawDeformedRect(gbX + 0.4, -1.6, 3.0, 3.2, '#334155'); // Ribbed cast aluminum gearbox top cover
  for (let gx = gbX + 0.9; gx <= gbX + 2.9; gx += 0.7) {
    drawDeformedLine(gx, -1.5, gx, 1.5, '#1e293b', 0.55);
  }
  // Side-mounted Power Take-Off (КОМ + гидронасос НШ-32/НШ-50) for dump, municipal, and fire frames
  if (hasPtoUnit) {
    drawDeformedRect(gbX + 0.4, 2.1, 2.6, 1.9, '#0f172a');
    drawDeformedCircle(gbX + 1.7, 3.0, 0.7, '#d97706'); // Hydraulic pump flange
    drawDeformedLine(gbX + 0.4, 3.0, gbX - 3.5, 2.6, '#0b0f17', 0.9); // High-pressure hydraulic line
  }
  // Gearbox output companion flange
  drawDeformedRect(gbX - 0.9, -1.25, 0.9, 2.5, '#475569');

  const firstRearAxleX = rearAxlesX[0] ?? (-halfL * 0.5);
  let mainShaftStartX = gbX - 0.9;

  // If 4x4 or 6x6: Transfer Case (Раздаточная коробка РК КАМАЗ-4310 / ЗИЛ-131 / ГАЗ-66) mounted mid-chassis
  if (isAllWheelDrive) {
    const tcX = gbX - 7.4;
    // Intermediate cardan shaft from gearbox to transfer case
    drawDeformedLine(mainShaftStartX, 0, tcX + 2.2, 0, '#475569', 1.95);
    drawDeformedLine(mainShaftStartX, 0, tcX + 2.2, 0, '#94a3b8', 0.75);
    // Transfer case heavy cast housing with cooling ribs
    drawDeformedRect(tcX - 2.3, -2.9, 4.6, 5.4, '#1e293b');
    drawDeformedRect(tcX - 1.7, -2.3, 3.4, 4.2, '#334155');
    drawDeformedCircle(tcX, -0.5, 0.95, '#cbd5e1');
    // Front cardan shaft running forward to front drive axle differential
    const frontDiffX = frontAxlesX[0] ?? (frameX2 + 4.0);
    drawDeformedLine(tcX + 2.1, -1.45, frontDiffX, -1.2, '#475569', 1.55);
    mainShaftStartX = tcX - 2.3;
  }

  // Check if wheelbase requires a 2-piece cardan shaft with intermediate carrier bearing (подвесной подшипник)
  const shaftSpan = mainShaftStartX - (firstRearAxleX + 1.8);
  if (shaftSpan > 16.5 && !isAllWheelDrive) {
    const carrierX = mainShaftStartX - shaftSpan * 0.46;
    // Front cardan section
    drawDeformedRect(mainShaftStartX - 1.1, -1.35, 1.1, 2.7, '#0f172a'); // Front U-joint yoke
    drawDeformedLine(mainShaftStartX - 1.1, 0, carrierX + 0.8, 0, '#475569', 1.95);
    drawDeformedLine(mainShaftStartX - 1.1, 0, carrierX + 0.8, 0, '#94a3b8', 0.75);
    // Carrier bearing bracket (кронштейн подвесного подшипника на поперечине)
    drawDeformedRect(carrierX - 1.1, -2.3, 2.2, 4.6, '#0f172a');
    drawDeformedCircle(carrierX, 0, 1.25, '#334155', '#cbd5e1', 0.55);
    // Rear cardan section to first drive axle
    drawDeformedLine(carrierX - 0.8, 0, firstRearAxleX + 2.0, 0, '#475569', 2.05);
    drawDeformedLine(carrierX - 0.8, 0, firstRearAxleX + 2.0, 0, '#94a3b8', 0.8);
  } else {
    // Single-piece heavy tubular cardan shaft
    drawDeformedRect(mainShaftStartX - 1.1, -1.35, 1.1, 2.7, '#0f172a');
    drawDeformedLine(mainShaftStartX - 1.1, 0, firstRearAxleX + 2.0, 0, '#475569', 2.05);
    drawDeformedLine(mainShaftStartX - 1.1, 0, firstRearAxleX + 2.0, 0, '#94a3b8', 0.8);
  }
  // Rear U-joint at first drive axle pinion input
  drawDeformedRect(firstRearAxleX + 1.6, -1.4, 1.2, 2.8, '#0f172a');
  drawDeformedLine(firstRearAxleX + 1.6, 0, firstRearAxleX + 2.8, 0, '#cbd5e1', 0.85);

  // Inter-axle cardan shaft (межосевой карданный вал) for 6x4 / 6x6 / 8x4 tandem bogies
  if (isTandemRear) {
    const midX = rearAxlesX[0];
    const rearX = rearAxlesX[1];
    drawDeformedLine(midX - 2.0, 0, rearX + 1.8, 0, '#475569', 1.9);
    drawDeformedLine(midX - 2.0, 0, rearX + 1.8, 0, '#94a3b8', 0.7);
    drawDeformedRect(midX - 2.8, -1.25, 1.0, 2.5, '#0f172a'); // Output U-joint
    drawDeformedRect(rearX + 1.4, -1.25, 1.0, 2.5, '#0f172a'); // Input U-joint
  }

  // =========================================================================
  // 5. SIDE FRAME EQUIPMENT: FUEL TANKS (1 OR 2), AIR RESERVOIRS, BATTERY BOX, MUFFLER & SPARE WHEEL
  // =========================================================================
  const drawFuelTank = (tx: number, ty: number, tLen: number, tWid: number, isRightSide: boolean) => {
    drawDeformedRect(tx, ty, tLen, tWid, '#334155');
    drawDeformedRect(tx + 0.35, ty + 0.45, tLen - 0.7, tWid - 0.9, '#475569');
    // Top longitudinal cylindrical highlight
    const hlY = isRightSide ? (ty + 0.9) : (ty + tWid - 1.3);
    drawDeformedRect(tx + 0.4, hlY, tLen - 0.8, 0.85, '#64748b');
    // Stamped end cap seams
    drawDeformedLine(tx + 0.9, ty, tx + 0.9, ty + tWid, '#1e293b', 0.7);
    drawDeformedLine(tx + tLen - 0.9, ty, tx + tLen - 0.9, ty + tWid, '#1e293b', 0.7);
    // Steel tension straps with silver T-bolts
    const strapFracs = tLen > 12 ? [0.2, 0.5, 0.8] : [0.25, 0.75];
    strapFracs.forEach(frac => {
      const sx = tx + tLen * frac;
      drawDeformedRect(sx - 0.4, ty - 0.2, 0.8, tWid + 0.4, '#0f172a');
      drawDeformedCircle(sx, isRightSide ? (ty + 0.45) : (ty + tWid - 0.45), 0.45, '#cbd5e1');
    });
    // Brass/chrome fuel filler neck & cap + fuel level sender unit
    const neckX = tx + tLen * 0.76;
    const neckY = isRightSide ? (ty + tWid * 0.55) : (ty + tWid * 0.45);
    drawDeformedCircle(neckX, neckY, 1.05, '#cbd5e1', '#0f172a', 0.5);
    drawDeformedCircle(neckX, neckY, 0.55, '#d97706');
    drawDeformedCircle(tx + tLen * 0.36, neckY, 0.65, '#1e293b'); // Fuel sender flange
  };

  if (platform === 'kamaz') {
    // Right side: Primary 250L/350L Fuel Tank
    const clearSpan = Math.max(9.5, (frameX2 - 2.0) - (rearAxlesX[0] + 5.2));
    const tankL = Math.min(16.5, Math.max(9.5, clearSpan * 0.78));
    const tankX = frameX2 - tankL - 2.2;
    const tankW = 4.6;
    drawFuelTank(tankX, railOuterY + 0.2, tankL, tankW, true);

    // If frame has 2 fuel tanks (e.g. long-haul 53212, 5410 semi, 4310 6x6), mount second tank on left side or tandem right
    if (frame.fuelTankCount >= 2 && clearSpan > 11.5) {
      const tank2L = Math.min(12.5, clearSpan * 0.55);
      const tank2X = Math.max(rearAxlesX[0] + 5.5, frameX2 - 9.2 - tank2L - 1.0);
      drawFuelTank(tank2X, -railOuterY - 4.4, tank2L, 4.2, false);
    }

    // Left side behind cab: Heavy Battery Box (2x 6СТ-190), Air Dryer & Compressed Air Reservoirs
    const batX = frameX2 - 8.6;
    const batY = -railOuterY - 4.1;
    drawDeformedRect(batX, batY, 6.8, 3.9, '#1e293b');
    drawDeformedRect(batX + 0.4, batY + 0.4, 6.0, 3.1, '#334155');
    drawDeformedLine(batX + 0.4, batY + 1.95, batX + 6.4, batY + 1.95, '#0f172a', 0.7);
    drawDeformedCircle(batX + 1.3, batY + 1.0, 0.45, '#cbd5e1');
    drawDeformedCircle(batX + 5.5, batY + 1.0, 0.45, '#cbd5e1');

    // Dual compressed air brake reservoirs (ресиверы пневмотормозов)
    if (frame.fuelTankCount < 2) {
      const resX = batX - 8.8;
      if (resX > rearAxlesX[0] + 5.0) {
        drawDeformedRect(resX, -railOuterY - 3.9, 7.8, 1.75, '#334155');
        drawDeformedRect(resX + 0.5, -railOuterY - 3.6, 6.8, 0.5, '#64748b');
        drawDeformedCircle(resX + 0.5, -railOuterY - 3.0, 0.45, '#d97706');
        drawDeformedRect(resX, -railOuterY - 1.9, 7.8, 1.75, '#334155');
        drawDeformedRect(resX + 0.5, -railOuterY - 1.6, 6.8, 0.5, '#64748b');
        drawDeformedCircle(resX + 0.5, -railOuterY - 1.0, 0.45, '#d97706');
      }
    }

    // Cylindrical steel muffler & side exhaust outlet behind cab left side
    const muffX = frameX2 - 3.8;
    const muffY = -railOuterY - 3.4;
    drawDeformedRect(muffX - 3.2, muffY, 3.0, 3.0, '#1e293b');
    drawDeformedLine(muffX - 1.8, muffY, muffX - 2.8, -halfW - 0.2, '#64748b', 1.9);
    drawDeformedCircle(muffX - 2.8, -halfW - 0.2, 0.85, '#0f172a');
  } else {
    // GAZ-53, ZIL-130, ZIL-4331 Hooded Trucks:
    const clearSpan = Math.max(8.5, (frameX2 - 2.0) - (rearAxlesX[0] + 5.2));
    const tankL = Math.min(platform === 'gaz53' ? 11.2 : 12.6, Math.max(8.2, clearSpan * 0.76));
    const tankW = platform === 'gaz53' ? 3.8 : 4.2;
    const tankX = Math.max(rearAxlesX[0] + 5.2, frameX2 - tankL - 2.6);
    drawFuelTank(tankX, -railOuterY - tankW - 0.1, tankL, tankW, false);

    // If frame has 2 fuel tanks (ЗИЛ-131 6x6 / ЗИЛ-133ГЯ / ЗИЛ-4331 Седельный), mount 2nd tank on right side
    if (frame.fuelTankCount >= 2) {
      drawFuelTank(tankX, railOuterY + 0.1, tankL * 0.9, tankW, true);
    } else {
      // Right side: Battery Box + Twin Pneumatic Brake Air Receivers + Exhaust Muffler
      const batX = frameX2 - 5.0;
      const batY = railOuterY + 0.2;
      drawDeformedRect(batX, batY, 4.2, 3.5, '#0f172a');
      drawDeformedRect(batX + 0.4, batY + 0.4, 3.4, 2.7, '#1e293b');
      drawDeformedCircle(batX + 1.1, batY + 1.75, 0.4, '#cbd5e1');
      drawDeformedCircle(batX + 3.1, batY + 1.75, 0.4, '#cbd5e1');

      const recL = Math.min(8.6, Math.max(5.5, clearSpan - 5.0));
      const recX = Math.max(rearAxlesX[0] + 5.2, batX - recL - 0.9);
      drawDeformedRect(recX, railOuterY + 0.3, recL, 1.6, '#334155');
      drawDeformedLine(recX + 0.5, railOuterY + 0.8, recX + recL - 0.5, railOuterY + 0.8, '#64748b', 0.6);
      drawDeformedCircle(recX + 0.6, railOuterY + 1.1, 0.4, '#d97706');
      drawDeformedRect(recX, railOuterY + 2.1, recL, 1.6, '#334155');
      drawDeformedLine(recX + 0.5, railOuterY + 2.6, recX + recL - 0.5, railOuterY + 2.6, '#64748b', 0.6);
      drawDeformedCircle(recX + 0.6, railOuterY + 2.9, 0.4, '#d97706');
    }

    // Cylindrical exhaust muffler & tailpipe along inner right rail
    const mufX = Math.max(rearAxlesX[0] + 4.0, frameX2 - 12.5);
    drawDeformedRect(mufX, 1.3, 6.8, 2.1, '#334155');
    drawDeformedLine(frameX2, 2.3, mufX + 6.8, 2.3, '#475569', 1.1);
    drawDeformedLine(mufX, 2.4, mufX - 3.2, railOuterY + 4.0, '#475569', 1.3);
  }

  // Spare Wheel Carrier (Держатель запасного колеса) according to `frame.spareWheelMount`:
  if (frame.spareWheelMount !== 'none' && (isBareOrTractor || frame.spareWheelMount === 'behind_cab' || frame.spareWheelMount === 'under_rear')) {
    if (frame.spareWheelMount === 'behind_cab') {
      const spX = frameX2 - 3.5;
      const spY = platform === 'kamaz' ? (railOuterY + 0.3) : (-railOuterY - 3.8);
      drawDeformedRect(spX, spY, 3.0, 6.8, '#0b0f17');
      drawDeformedRect(spX + 0.5, spY + 0.6, 2.0, 5.6, '#475569');
      drawDeformedCircle(spX + 1.5, spY + 3.4, 0.65, '#cbd5e1');
    } else if (isBareOrTractor) {
      const spX = frame.spareWheelMount === 'under_rear' ? (frameX1 + 5.8) : ((frameX2 + rearAxlesX[0]) * 0.5);
      const spY = frame.spareWheelMount === 'under_rear' ? -0.8 : (railOuterY + 0.5);
      drawDeformedCircle(spX, spY, 4.3, '#0b0f17');
      drawDeformedCircle(spX, spY, 2.5, '#334155', '#1e293b', 0.7);
      drawDeformedCircle(spX, spY, 0.7, '#cbd5e1');
    }
  }

  // =========================================================================
  // 6. C-CHANNEL LONGITUDINAL FRAME RAILS, SUBFRAME & FUNCTIONAL CROSSMEMBERS
  // =========================================================================
  const frameFrontX = halfL - fc - 0.5;
  const cabBackX = cabinX - cabinL / 2;
  const railFrontOuterY = platform === 'gaz53' ? 3.4 : (platform === 'kamaz' ? railOuterY : 3.7);
  const railFrontInnerY = railFrontOuterY - railFlangeW;

  // Rear & Middle C-channel longitudinal steel rails (from rear crossmember to cab front/cowl)
  const rearRailsLen = (cabBackX + 2.0) - frameX1;
  // Left rear rail
  drawDeformedRect(frameX1, -railOuterY, rearRailsLen, railFlangeW, '#141923');
  drawDeformedLine(frameX1, -railOuterY, cabBackX + 2.0, -railOuterY, '#64748b', 0.95);
  drawDeformedLine(frameX1, -railInnerY, cabBackX + 2.0, -railInnerY, '#070a0f', 0.85);
  // Right rear rail
  drawDeformedRect(frameX1, railInnerY, rearRailsLen, railFlangeW, '#141923');
  drawDeformedLine(frameX1, railOuterY, cabBackX + 2.0, railOuterY, '#64748b', 0.95);
  drawDeformedLine(frameX1, railInnerY, cabBackX + 2.0, railInnerY, '#070a0f', 0.85);

  // Front frame rails (under cab, engine bay & radiator up to front bumper)
  const frontRailsLen = frameFrontX - (cabBackX + 2.0);
  if (frontRailsLen > 1.0) {
    // Left front rail (tapered inward for steering wheel clearance on hooded GAZ/ZIL)
    drawDeformedRect(cabBackX + 2.0, -railFrontOuterY, frontRailsLen, railFlangeW, '#141923');
    drawDeformedLine(cabBackX + 2.0, -railFrontOuterY, frameFrontX, -railFrontOuterY, '#64748b', 0.9);
    drawDeformedLine(cabBackX + 2.0, -railFrontInnerY, frameFrontX, -railFrontInnerY, '#070a0f', 0.8);
    // Right front rail
    drawDeformedRect(cabBackX + 2.0, railFrontInnerY, frontRailsLen, railFlangeW, '#141923');
    drawDeformedLine(cabBackX + 2.0, railFrontOuterY, frameFrontX, railFrontOuterY, '#64748b', 0.9);
    drawDeformedLine(cabBackX + 2.0, railFrontInnerY, frameFrontX, railFrontInnerY, '#070a0f', 0.8);

    // Front closing bumper crossmember with towing eyes / hooks
    drawDeformedRect(frameFrontX - 1.2, -railFrontOuterY - 0.4, 1.8, (railFrontOuterY + 0.4) * 2, '#0f172a');
    drawDeformedCircle(frameFrontX + 0.5, -railFrontOuterY + 0.4, 0.7, '#334155', '#cbd5e1', 0.35);
    drawDeformedCircle(frameFrontX + 0.5, railFrontOuterY - 0.4, 0.7, '#334155', '#cbd5e1', 0.35);

    // Engine support crossmember under front axle
    const engCrossX = frontAxlesX[0];
    drawDeformedRect(engCrossX - 1.0, -railFrontInnerY, 2.0, railFrontInnerY * 2, '#1e293b');
  }

  // Reinforced Subframe (Надрамник с крепежными стремянками и упорами) for tipper & heavy tandem frames
  if (hasHeavySubframe || hasTipperSubframe) {
    drawDeformedLine(frameX1 + 1.5, -railOuterY + 0.55, frameX2 - 1.2, -railOuterY + 0.55, '#475569', 0.9);
    drawDeformedLine(frameX1 + 1.5, railOuterY - 0.55, frameX2 - 1.2, railOuterY - 0.55, '#475569', 0.9);
  }

  // If short_tipper frame is bare (`body_none`), show the telescopic hoist trunnion cradle & rear dump pivot hinges on the subframe!
  if (hasTipperSubframe && body.id === 'body_none') {
    const hoistX = frameX2 - 5.2;
    drawDeformedRect(hoistX - 1.8, -railOuterY, 3.6, railOuterY * 2, '#1e293b');
    drawDeformedCircle(hoistX, 0, 2.1, '#0f172a', '#475569', 0.7);
    drawDeformedCircle(hoistX, 0, 1.1, '#cbd5e1'); // Retracted chrome hoist piston stages
    // Rear dump bed spherical pivot ears (шарниры опрокидывания кузова на конце надрамника)
    drawDeformedRect(frameX1 + 0.2, -railOuterY - 0.6, 2.2, 2.0, '#334155');
    drawDeformedRect(frameX1 + 0.2, railOuterY - 1.4, 2.2, 2.0, '#334155');
  }

  // Pneumatic copper/nylon brake lines & electrical loom routed inside frame channel webs
  drawDeformedLine(frameX1 + 2.0, -railInnerY + 0.35, frameX2 - 1.0, -railInnerY + 0.35, '#d97706', 0.6);
  drawDeformedLine(frameX1 + 2.0, railInnerY - 0.35, frameX2 - 1.0, railInnerY - 0.35, '#090d14', 0.7);

  // Stamped Transverse Crossmembers with Corner Gussets & Cold Rivets (Поперечины рамы с косынками и заклёпками)
  const cmCount = Math.max(5, frame.crossmemberCount || 6);
  for (let i = 0; i < cmCount; i++) {
    const t = i / (cmCount - 1);
    const cmX = frameX1 + 1.1 + t * (frameLen - 2.6);
    const isEndCm = i === 0 || i === cmCount - 1;
    const cmThick = isEndCm ? 2.1 : 1.75;

    // Crossmember web spanning between rails
    drawDeformedRect(cmX - cmThick * 0.5, -railOuterY, cmThick, railOuterY * 2, '#0f172a');
    drawDeformedLine(cmX - cmThick * 0.5, -railInnerY, cmX - cmThick * 0.5, railInnerY, '#334155', 0.65);

    // Wide corner gusset plates (угловые косынки жесткости)
    drawDeformedRect(cmX - cmThick * 0.85, -railOuterY, cmThick * 1.7, railFlangeW + 0.55, '#1e293b');
    drawDeformedRect(cmX - cmThick * 0.85, railInnerY - 0.55, cmThick * 1.7, railFlangeW + 0.55, '#1e293b');

    // Stamped lightening holes in central crossmember web
    if (!isEndCm) {
      drawDeformedCircle(cmX, -1.2, 0.55, '#1e293b', '#475569', 0.4);
      drawDeformedCircle(cmX, 1.2, 0.55, '#1e293b', '#475569', 0.4);
    }

    // 4 Cold-riveted fastener heads per crossmember (заклёпки крепления поперечины к полкам лонжеронов)
    const rY = railOuterY - railFlangeW * 0.5;
    drawDeformedCircle(cmX - 0.48, -rY, 0.38, '#cbd5e1');
    drawDeformedCircle(cmX + 0.48, -rY, 0.38, '#cbd5e1');
    drawDeformedCircle(cmX - 0.48, rY, 0.38, '#cbd5e1');
    drawDeformedCircle(cmX + 0.48, rY, 0.38, '#cbd5e1');
  }

  // Body mounting outrigger brackets along the outer faces of the frame rails (кронштейны крепления кузова)
  const bracketCount = Math.max(3, Math.floor(frameLen / 10.5));
  for (let b = 0; b < bracketCount; b++) {
    const bx = frameX1 + 4.2 + b * ((frameLen - 8.4) / Math.max(1, bracketCount - 1));
    drawDeformedRect(bx - 0.7, -railOuterY - 1.15, 1.4, 1.15, '#1e293b');
    drawDeformedCircle(bx, -railOuterY - 0.58, 0.36, '#94a3b8');
    drawDeformedRect(bx - 0.7, railOuterY, 1.4, 1.15, '#1e293b');
    drawDeformedCircle(bx, railOuterY + 0.58, 0.36, '#94a3b8');
  }

  // =========================================================================
  // 7. REAR WHEEL ARCH MUDGUARDS (FENDERS), REAR PINTLE HITCH & TAIL LIGHTS
  // =========================================================================
  // On bare frame or fifth-wheel tractor, draw factory chassis mudguards over rear wheels
  if (isBareOrTractor) {
    const fenderFrontX = rearAxlesX[0] + 5.2;
    const fenderRearX = rearAxlesX[rearAxlesX.length - 1] - 5.2;
    const fenderL = fenderFrontX - fenderRearX;
    const fenderW = frame.rearTireType === 'dual' ? 5.2 : 4.0;

    // Tubular fender mounting stays bolted to frame rails
    [fenderRearX + 1.5, (fenderFrontX + fenderRearX) * 0.5, fenderFrontX - 1.5].forEach(stayX => {
      drawDeformedLine(stayX, -railOuterY, stayX, -halfW + 0.5, '#334155', 1.15);
      drawDeformedLine(stayX, railOuterY, stayX, halfW - 0.5, '#334155', 1.15);
    });

    // Left & Right ribbed steel/polymer wheel arch fenders covering the top of the tires
    drawDeformedRect(fenderRearX, -halfW + 0.15, fenderL, fenderW, '#1e293b');
    drawDeformedLine(fenderRearX, -halfW + 0.2, fenderFrontX, -halfW + 0.2, '#64748b', 0.9);
    drawDeformedLine(fenderRearX + 0.6, -halfW + fenderW * 0.5, fenderFrontX - 0.6, -halfW + fenderW * 0.5, '#0f172a', 0.7);

    drawDeformedRect(fenderRearX, halfW - fenderW - 0.15, fenderL, fenderW, '#1e293b');
    drawDeformedLine(fenderRearX, halfW - 0.2, fenderFrontX, halfW - 0.2, '#64748b', 0.9);
    drawDeformedLine(fenderRearX + 0.6, halfW - fenderW * 0.5, fenderFrontX - 0.6, halfW - fenderW * 0.5, '#0f172a', 0.7);

    // Rear rubber mudflaps with white reflector strips
    drawDeformedRect(fenderRearX - 1.2, -halfW + 0.25, 1.4, fenderW, '#090d14');
    drawDeformedLine(fenderRearX - 0.6, -halfW + 0.8, fenderRearX - 0.6, -halfW + fenderW - 0.4, '#f8fafc', 0.75);
    drawDeformedRect(fenderRearX - 1.2, halfW - fenderW - 0.25, 1.4, fenderW, '#090d14');
    drawDeformedLine(fenderRearX - 0.6, halfW - fenderW + 0.4, fenderRearX - 0.6, halfW - 0.8, '#f8fafc', 0.75);
  }

  // Rear Closing Crossmember Towing Assembly: Forged Pintle Hook (Фаркоп), Air Gladhands & Tail Lights
  drawDeformedLine(frameX1 + 4.2, -railInnerY, frameX1 + 0.4, -1.6, '#1e293b', 1.45);
  drawDeformedLine(frameX1 + 4.2, railInnerY, frameX1 + 0.4, 1.6, '#1e293b', 1.45);

  // Heavy forged pintle hook (буксирный прибор / крюк-фаркоп с амортизатором)
  drawDeformedRect(frameX1 - 1.8, -1.5, 2.0, 3.0, '#334155');
  drawDeformedCircle(frameX1 - 1.1, 0, 0.95, '#0f172a', '#94a3b8', 0.65);

  // Pneumatic trailer brake gladhand couplers (красная и синяя соединительные головки «Палм»)
  drawDeformedCircle(frameX1 - 0.4, -2.4, 0.55, '#ef4444');
  drawDeformedCircle(frameX1 - 0.4, 2.4, 0.55, '#3b82f6');

  // Realistic Platform-Specific Rear Tail Lights & Underrun Bars:
  const isTailOn = car.headlightsOn || car.positionLightsOn;
  const isBraking = car.brakeLightsOn;
  const isReversing = (car as any).isReversing || (car.speed < -0.1 && (car.engineState?.currentGear ?? 1) === -1);
  const redLight = isBraking ? '#ef4444' : isTailOn ? '#dc2626' : '#7f1d1d';
  const amberLight = '#f59e0b';
  const reverseLight = isReversing ? '#f8fafc' : '#475569';
  const lightOutY = railOuterY + 2.5;

  if (platform === 'kamaz') {
    // KAMAZ: Authentic steel underrun protection bar (задний противоподкатный брус) across rear frame
    const barW = (lightOutY + 2.4) * 2;
    drawDeformedRect(frameX1 - 0.8, -barW * 0.5, 1.5, barW, '#1e293b');
    drawDeformedLine(frameX1 - 0.8, -barW * 0.5, frameX1 - 0.8, barW * 0.5, '#475569', 0.8);
    // Yellow/black diagonal safety reflector stripes on outer ends of underrun bar
    drawDeformedRect(frameX1 - 0.7, -barW * 0.5 + 0.2, 1.3, 1.8, '#eab308');
    drawDeformedRect(frameX1 - 0.7, barW * 0.5 - 2.0, 1.3, 1.8, '#eab308');

    // Horizontal multi-chamber combination lamps (ФП-209 / 13.3716)
    // Left cluster (Turn / Tail-Stop / Reverse & Retroreflector)
    drawDeformedRect(frameX1 - 1.1, -lightOutY - 1.8, 1.2, 3.6, '#0b0f17');
    drawDeformedRect(frameX1 - 1.0, -lightOutY - 1.7, 1.0, 1.1, amberLight); // Outer: turn
    drawDeformedRect(frameX1 - 1.0, -lightOutY - 0.5, 1.0, 1.1, redLight);   // Center: stop/tail
    drawDeformedRect(frameX1 - 1.0, -lightOutY + 0.7, 1.0, 1.0, reverseLight); // Inner: reverse/reflector

    // Right cluster
    drawDeformedRect(frameX1 - 1.1, lightOutY - 1.8, 1.2, 3.6, '#0b0f17');
    drawDeformedRect(frameX1 - 1.0, lightOutY + 0.6, 1.0, 1.1, amberLight);  // Outer: turn
    drawDeformedRect(frameX1 - 1.0, lightOutY - 0.6, 1.0, 1.1, redLight);    // Center: stop/tail
    drawDeformedRect(frameX1 - 1.0, lightOutY - 1.7, 1.0, 1.0, reverseLight); // Inner: reverse/reflector

    // License plate with upper illumination lamp
    drawDeformedRect(frameX1 - 0.8, -railOuterY - 0.2, 0.8, 3.8, '#f8fafc');
    drawDeformedCircle(frameX1 - 0.2, -railOuterY + 1.7, 0.45, '#334155');
  } else if (platform === 'zil4331') {
    // ZIL-4331: Rectangular multi-chamber lamps on stamped steel protective wings
    drawDeformedLine(frameX1 + 0.2, -lightOutY - 1.9, frameX1 + 0.2, lightOutY + 1.9, '#1e293b', 1.3);
    // Left lamp
    drawDeformedRect(frameX1 - 0.7, -lightOutY - 1.8, 1.1, 3.4, '#090d14');
    drawDeformedRect(frameX1 - 0.6, -lightOutY - 1.7, 0.9, 1.0, amberLight);
    drawDeformedRect(frameX1 - 0.6, -lightOutY - 0.6, 0.9, 1.1, redLight);
    drawDeformedRect(frameX1 - 0.6, -lightOutY + 0.6, 0.9, 0.9, reverseLight);
    // Right lamp
    drawDeformedRect(frameX1 - 0.7, lightOutY - 1.6, 1.1, 3.4, '#090d14');
    drawDeformedRect(frameX1 - 0.6, lightOutY + 0.7, 0.9, 1.0, amberLight);
    drawDeformedRect(frameX1 - 0.6, lightOutY - 0.5, 0.9, 1.1, redLight);
    drawDeformedRect(frameX1 - 0.6, lightOutY - 1.5, 0.9, 0.9, reverseLight);
    // License plate
    drawDeformedRect(frameX1 - 0.6, -railOuterY - 0.2, 0.7, 3.6, '#f8fafc');
  } else {
    // GAZ-53 / ZIL-130: Classic Soviet ФП-130 vertical two-chamber lamps with separate round reverse spotlight
    drawDeformedLine(frameX1 + 0.3, -lightOutY - 1.8, frameX1 + 0.3, lightOutY + 1.8, '#1e293b', 1.2);
    // Left ФП-130 unit
    drawDeformedRect(frameX1 - 0.6, -lightOutY - 1.7, 1.1, 3.0, '#0f172a');
    drawDeformedCircle(frameX1 - 0.1, -lightOutY - 0.9, 0.75, redLight);
    drawDeformedCircle(frameX1 - 0.1, -lightOutY + 0.6, 0.7, amberLight);
    // Right ФП-130 unit
    drawDeformedRect(frameX1 - 0.6, lightOutY - 1.3, 1.1, 3.0, '#0f172a');
    drawDeformedCircle(frameX1 - 0.1, lightOutY + 0.9, 0.75, redLight);
    drawDeformedCircle(frameX1 - 0.1, lightOutY - 0.6, 0.7, amberLight);

    // Left auxiliary round reverse spotlight (фонарь заднего хода ФП-135)
    drawDeformedCircle(frameX1 - 0.5, -railOuterY - 1.6, 0.85, reverseLight, '#1e293b', 0.5);
    // License plate with FP-131 plate illuminator
    drawDeformedRect(frameX1 - 0.5, -railOuterY + 0.3, 0.7, 3.6, '#f8fafc');
    drawDeformedCircle(frameX1 - 0.2, -railOuterY + 2.1, 0.45, '#334155');
  }
}

/**
 * High-fidelity rendering for specialized vehicle accessories, cabins, and equipment
 */
export function renderSpecializedVehicleAttachments(vCtx: VehicleRenderContext): void {
  const {
    ctx, car, halfL, halfW, fc, rc,
    cabinX, cabinL, cabinW, deform,
    drawDeformedRect, drawDeformedLine, drawDeformedCircle, nightAlpha
  } = vCtx;

  const resolvedTruckBase = resolveVehicleTruckFrameAndBody(car);
  const resolvedTruck = resolvedTruckBase
    ? {
        ...resolvedTruckBase,
        cabRearX: cabinX - cabinL * 0.5 - 0.4,
        rearBodyX: -halfL + rc + 1.5,
        cabinX,
      }
    : null;
  if (resolvedTruck) {
    // Draw the bare chassis frame if the caller hasn't already drawn it on the lower chassis layer
    if (!(vCtx as any).bareFrameAlreadyDrawn) {
      renderTruckBareFrame(vCtx, resolvedTruck);
    }
    if (resolvedTruck.body.id === 'body_none' || !resolvedTruck.body.attachmentCarType) {
      return;
    }
    if (resolvedTruck.body.id === 'body_fifth_wheel') {
      if (!(vCtx as any).fifthWheelAlreadyDrawn) {
        renderTruckFifthWheelCoupling(vCtx, resolvedTruck);
      }
      return;
    }
  }
  const effectiveType: string = resolvedTruck
    ? (resolvedTruck.body.attachmentCarType || car.type)
    : car.type;

  // --- FIRE ENGINE (ПОЖАРНАЯ АВТОЦИСТЕРНА АЦ-40 (130) 63Б / АЦ-5.0 КАМАЗ) ---
  if (effectiveType === 'fire_engine') {
    const cabBackX = cabinX - cabinL / 2;
    if (!resolvedTruck) {
      const bumpX = halfL - fc;
      drawDeformedRect(bumpX - 1, -halfW - 0.5, 3.5, halfW * 2 + 1, '#cbd5e1');
      drawDeformedRect(cabBackX, -halfW + 0.5, cabinL, halfW * 2 - 1, '#b91c1c');
    }

    // 1. Auxiliary Crew Cab Module ("Боевой расчёт" — 4-door extended crew compartment right behind front cab)
    const crewL = 7.4;
    const crewX1 = cabBackX - crewL - 0.5;
    const crewX2 = cabBackX - 0.5;
    const bodyW = halfW * 2 - 1.2;

    drawDeformedRect(crewX1, -bodyW / 2, crewL, bodyW, '#dc2626');
    drawDeformedRect(crewX1 + 0.5, -bodyW / 2 + 0.8, crewL - 1.0, bodyW - 1.6, '#b91c1c');
    // Crew cab roof white GOST stripe & central roof stiffeners
    drawDeformedRect(crewX1 + 0.4, -bodyW / 2 + 0.2, crewL - 0.8, 1.3, '#f8fafc');
    drawDeformedRect(crewX1 + 0.4, bodyW / 2 - 1.5, crewL - 0.8, 1.3, '#f8fafc');
    drawDeformedLine(crewX1 + 1.0, -bodyW * 0.2, crewX2 - 1.0, -bodyW * 0.2, 'rgba(0,0,0,0.28)', 0.8);
    drawDeformedLine(crewX1 + 1.0, bodyW * 0.2, crewX2 - 1.0, bodyW * 0.2, 'rgba(0,0,0,0.28)', 0.8);
    // Crew side windows & chrome grab handles
    drawDeformedRect(crewX1 + 1.2, -bodyW / 2 + 0.2, crewL - 2.4, 0.9, 'rgba(56, 189, 248, 0.28)');
    drawDeformedRect(crewX1 + 1.2, bodyW / 2 - 1.1, crewL - 2.4, 0.9, 'rgba(56, 189, 248, 0.28)');
    drawDeformedRect(crewX1 + 0.4, -bodyW / 2 - 0.4, 1.6, 0.5, '#cbd5e1');
    drawDeformedRect(crewX1 + 0.4, bodyW / 2 - 0.1, 1.6, 0.5, '#cbd5e1');

    // 2. Main Fire Tanker & Equipment Superstructure Body (Кузов-цистерна АЦ-40)
    const bodyX1 = -halfL + rc + 1.4;
    const bodyX2 = crewX1 - 0.6;
    const bodyLen = bodyX2 - bodyX1;

    drawDeformedRect(bodyX1, -bodyW / 2, bodyLen, bodyW, '#dc2626');
    drawDeformedLine(bodyX1, -bodyW / 2, bodyX2, -bodyW / 2, '#7f1d1d', 1.2);
    drawDeformedLine(bodyX2, -bodyW / 2, bodyX2, bodyW / 2, '#7f1d1d', 1.2);
    drawDeformedLine(bodyX2, bodyW / 2, bodyX1, bodyW / 2, '#7f1d1d', 1.2);
    drawDeformedLine(bodyX1, bodyW / 2, bodyX1, -bodyW / 2, '#7f1d1d', 1.2);

    // GOST R 50574 White Contrast Livery Bands along flanks
    drawDeformedRect(bodyX1 + 0.6, -bodyW / 2 + 0.25, bodyLen - 1.2, 1.4, '#f8fafc');
    drawDeformedRect(bodyX1 + 0.6, bodyW / 2 - 1.65, bodyLen - 1.2, 1.4, '#f8fafc');

    // 3 Corrugated Anodized Aluminum Equipment Roller Shutters per side (Шторные двери отсеков ПТВ)
    const shutterCount = 3;
    const shutterSpan = (bodyLen - 3.0) / shutterCount;
    for (let s = 0; s < shutterCount; s++) {
      const sx = bodyX1 + 1.5 + s * shutterSpan;
      const sw = shutterSpan - 1.4;
      // Left & right recessed aluminum shutters
      drawDeformedRect(sx, -bodyW / 2 + 1.65, sw, 2.2, '#cbd5e1');
      drawDeformedRect(sx, bodyW / 2 - 3.85, sw, 2.2, '#cbd5e1');
      // Fine slat corrugation lines
      for (let lx = sx + 1.2; lx < sx + sw - 0.8; lx += 1.6) {
        drawDeformedLine(lx, -bodyW / 2 + 1.8, lx, -bodyW / 2 + 3.7, '#64748b', 0.55);
        drawDeformedLine(lx, bodyW / 2 - 3.7, lx, bodyW / 2 - 1.8, '#64748b', 0.55);
      }
      // Yellow bar lock handles
      drawDeformedRect(sx + sw * 0.3, -bodyW / 2 + 1.5, sw * 0.4, 0.45, '#facc15');
      drawDeformedRect(sx + sw * 0.3, bodyW / 2 - 1.95, sw * 0.4, 0.45, '#facc15');
    }

    // 3. Aluminum Checkerplate Roof Deck (Рифлёная алюминиевая палуба крыши)
    const deckX1 = bodyX1 + 1.6;
    const deckX2 = bodyX2 - 1.2;
    const deckW = bodyW - 7.8;
    drawDeformedRect(deckX1, -deckW / 2, deckX2 - deckX1, deckW, '#94a3b8');
    drawDeformedRect(deckX1 + 0.5, -deckW / 2 + 0.5, deckX2 - deckX1 - 1.0, deckW - 1.0, '#cbd5e1');
    for (let rx = deckX1 + 2.5; rx < deckX2 - 1.5; rx += 3.0) {
      drawDeformedLine(rx, -deckW / 2 + 0.6, rx, deckW / 2 - 0.6, '#94a3b8', 0.6);
    }

    // Left Side Roof: Dual Cylindrical Suction Hose Canisters (Пеналы напорно-всасывающих рукавов)
    drawDeformedRect(deckX1 + 0.6, -deckW / 2 + 0.4, deckX2 - deckX1 - 1.2, 1.5, '#475569');
    drawDeformedRect(deckX1 + 0.6, -deckW / 2 + 2.1, deckX2 - deckX1 - 1.2, 1.5, '#475569');
    drawDeformedCircle(deckX1 + 0.6, -deckW / 2 + 1.15, 0.75, '#dc2626');
    drawDeformedCircle(deckX1 + 0.6, -deckW / 2 + 2.85, 0.75, '#dc2626');

    // Center Roof: Water & Foam Cistern Manhole Hatches (Люки водяной цистерны и пенобака)
    const mh1X = deckX1 + (deckX2 - deckX1) * 0.32;
    const mh2X = deckX1 + (deckX2 - deckX1) * 0.64;
    drawDeformedCircle(mh1X, -0.4, 2.1, '#1e293b');
    drawDeformedCircle(mh1X, -0.4, 1.4, '#dc2626', '#f8fafc', 0.5);
    drawDeformedCircle(mh2X, -0.4, 1.8, '#1e293b');
    drawDeformedCircle(mh2X, -0.4, 1.15, '#eab308'); // Foam tank yellow hatch

    // Right Side Roof: 3-Section Extension Fire Ladder ("Трёхколенная выдвижная лестница" + штурмовка)
    const ladX1 = deckX1 + 0.8;
    const ladL = (deckX2 - deckX1) + crewL * 0.65;
    const ladY1 = deckW * 0.08;
    const ladY2 = deckW / 2 - 0.6;
    drawDeformedRect(ladX1, ladY1, ladL, 0.9, '#e2e8f0');
    drawDeformedRect(ladX1, ladY2 - 0.9, ladL, 0.9, '#e2e8f0');
    for (let lx = ladX1 + 1.8; lx < ladX1 + ladL - 1.2; lx += 2.6) {
      drawDeformedLine(lx, ladY1 + 0.4, lx, ladY2 - 0.4, '#475569', 0.8);
    }

    // 4. High-Pressure Roof Water/Foam Monitor Cannon (Лафетный ствол ЛС-С40У над отсеком боевого расчёта)
    const cannonX = (crewX1 + crewX2) * 0.5;
    drawDeformedCircle(cannonX, 0, 2.6, '#1e293b', '#94a3b8', 0.6);
    drawDeformedCircle(cannonX, 0, 1.5, '#dc2626');
    drawDeformedRect(cannonX + 0.4, -0.75, 5.2, 1.5, '#cbd5e1'); // Monitor barrel pointing forward
    drawDeformedRect(cannonX + 5.0, -1.05, 1.2, 2.1, '#ef4444'); // Foam/water diffuser nozzle head

    // 5. Rear Pump Compartment (Задний насосный отсек ПН-40УВ), Folding Ladder & Blue Strobe Beacons
    drawDeformedRect(bodyX1 - 0.8, -bodyW * 0.26, 0.9, bodyW * 0.52, '#1e293b');
    drawDeformedCircle(bodyX1 - 0.5, 0, 1.1, '#d97706'); // Brass 77mm suction inlet coupling
    drawDeformedCircle(bodyX1 + 0.8, -bodyW / 2 + 1.6, 0.95, '#2563eb'); // Rear left blue beacon
    drawDeformedCircle(bodyX1 + 0.8, bodyW / 2 - 1.6, 0.95, '#2563eb');  // Rear right blue beacon
  }

  // --- FIRE LADDER (ПОЖАРНАЯ АВТОЛЕСТНИЦА АЛ-30 (131 / 4310 / 53212) ПМ-506) ---
  else if (effectiveType === 'fire_ladder') {
    const cabBackX = cabinX - cabinL / 2;
    if (!resolvedTruck) {
      const bumpX = halfL - fc;
      drawDeformedRect(bumpX - 1, -halfW - 0.5, 3.5, halfW * 2 + 1, '#cbd5e1');
      drawDeformedRect(cabBackX, -halfW + 0.5, cabinL, halfW * 2 - 1, '#b91c1c');
    }

    const bodyX1 = -halfL + rc + 1.4;
    const bodyX2 = cabBackX - 0.8;
    const bodyLen = bodyX2 - bodyX1;
    const bodyW = halfW * 2 - 1.4;

    // 1. Low-Profile Podium Deck with Red Side Skirts & Corrugated Aluminum Top Plate (Платформа-подиум АЛ-30)
    drawDeformedRect(bodyX1, -bodyW / 2, bodyLen, bodyW, '#dc2626');
    drawDeformedRect(bodyX1 + 1.2, -bodyW / 2 + 2.2, bodyLen - 2.4, bodyW - 4.4, '#94a3b8');
    drawDeformedRect(bodyX1 + 1.8, -bodyW / 2 + 2.6, bodyLen - 3.6, bodyW - 5.2, '#cbd5e1');
    for (let px = bodyX1 + 3.0; px < bodyX2 - 2.0; px += 3.2) {
      drawDeformedLine(px, -bodyW / 2 + 2.6, px, bodyW / 2 - 2.6, '#94a3b8', 0.65);
    }
    // White GOST side stripes along podium edge
    drawDeformedLine(bodyX1 + 1.0, -bodyW / 2 + 0.5, bodyX2 - 1.0, -bodyW / 2 + 0.5, '#f8fafc', 0.9);
    drawDeformedLine(bodyX1 + 1.0, bodyW / 2 - 0.5, bodyX2 - 1.0, bodyW / 2 - 0.5, '#f8fafc', 0.9);

    // 2. Four Heavy Hydraulic Outrigger Beams (4 гидравлические выносные опоры-аутригеры с черно-желтой разметкой)
    const outriggerPositions = [bodyX1 + 4.8, bodyX2 - 6.2];
    outriggerPositions.forEach(ox => {
      // Left & right outrigger housing boxes protruding slightly from podium sides
      drawDeformedRect(ox - 2.4, -bodyW / 2 - 1.6, 4.8, 2.2, '#facc15');
      drawDeformedLine(ox - 1.6, -bodyW / 2 - 1.6, ox, -bodyW / 2 + 0.4, '#0f172a', 1.1);
      drawDeformedLine(ox + 0.2, -bodyW / 2 - 1.6, ox + 1.8, -bodyW / 2 + 0.4, '#0f172a', 1.1);
      drawDeformedCircle(ox, -bodyW / 2 - 0.8, 0.65, '#334155'); // Hydraulic jack cylinder head

      drawDeformedRect(ox - 2.4, bodyW / 2 - 0.6, 4.8, 2.2, '#facc15');
      drawDeformedLine(ox - 1.6, bodyW / 2 - 0.4, ox, bodyW / 2 + 1.6, '#0f172a', 1.1);
      drawDeformedLine(ox + 0.2, bodyW / 2 - 0.4, ox + 1.8, bodyW / 2 + 1.6, '#0f172a', 1.1);
      drawDeformedCircle(ox, bodyW / 2 + 0.8, 0.65, '#334155');
    });

    // Side Podium Equipment Lockers between outriggers
    const lockX1 = bodyX1 + 8.0;
    const lockX2 = bodyX2 - 9.4;
    if (lockX2 > lockX1 + 4.0) {
      const span = (lockX2 - lockX1) / 3;
      for (let s = 0; s < 3; s++) {
        const sx = lockX1 + s * span + 0.4;
        drawDeformedRect(sx, -bodyW / 2 + 0.7, span - 0.8, 1.5, '#e2e8f0');
        drawDeformedRect(sx, bodyW / 2 - 2.2, span - 0.8, 1.5, '#e2e8f0');
      }
    }

    // 3. Front Boom Support Trestle A-Frame behind Cab ("Козлы" — передняя стойка опоры стрелы за кабиной)
    const trestleX = bodyX2 - 3.2;
    drawDeformedRect(trestleX - 1.4, -bodyW * 0.34, 2.8, bodyW * 0.68, '#1e293b');
    drawDeformedRect(trestleX - 0.9, -4.8, 1.8, 9.6, '#dc2626');

    // 4. Rear 360° Revolving Turntable Pedestal (Поворотное основание башни АЛ-30 с гидроцилиндрами подъёма и креслом оператора)
    const turntableX = bodyX1 + Math.max(9.0, bodyLen * 0.26);
    drawDeformedCircle(turntableX, 0, 7.6, '#1e293b', '#475569', 0.9);
    drawDeformedCircle(turntableX, 0, 5.8, '#334155');
    drawDeformedCircle(turntableX, 0, 3.2, '#dc2626');
    // Operator control seat & console on left of turntable
    drawDeformedRect(turntableX - 2.6, -7.2, 4.4, 2.8, '#0f172a');
    drawDeformedRect(turntableX + 1.2, -6.8, 1.2, 2.0, '#38bdf8'); // Control instrument panel
    // Twin hydraulic elevation cylinders (гидроцилиндры подъёма пакета колен)
    drawDeformedRect(turntableX - 1.0, -4.2, 6.5, 1.2, '#cbd5e1');
    drawDeformedRect(turntableX - 1.0, 3.0, 6.5, 1.2, '#cbd5e1');

    // 5. 4-Section Telescopic Steel Lattice Aerial Ladder Boom (Пакет из 4 стальных ферменных колен стрелы 30 м)
    const ladderX1 = turntableX - 4.8;
    const ladderX2 = Math.min(halfL - fc + 0.6, cabinX + cabinL * 0.48);
    const ladderL = ladderX2 - ladderX1;
    const outerW = 7.8;
    const innerW = 4.8;

    // Subtle dark backing under lattice truss for depth over cab roof
    drawDeformedRect(ladderX1, -outerW / 2, ladderL, outerW, 'rgba(15, 23, 42, 0.55)');

    // Outer base boom rails (1st & 2nd sections)
    drawDeformedRect(ladderX1, -outerW / 2, ladderL, 1.05, '#f1f5f9');
    drawDeformedRect(ladderX1, outerW / 2 - 1.05, ladderL, 1.05, '#f1f5f9');
    // Inner nested telescopic sections (3rd & 4th sections)
    drawDeformedRect(ladderX1 + 3.0, -innerW / 2, ladderL - 4.0, 0.75, '#cbd5e1');
    drawDeformedRect(ladderX1 + 3.0, innerW / 2 - 0.75, ladderL - 4.0, 0.75, '#cbd5e1');

    // Transverse climbing rungs & diagonal Warren truss side bracing
    for (let lx = ladderX1 + 2.2; lx < ladderX2 - 1.8; lx += 3.0) {
      drawDeformedLine(lx, -outerW / 2 + 0.5, lx, outerW / 2 - 0.5, '#e2e8f0', 0.9);
      drawDeformedLine(lx, -outerW / 2 + 0.5, lx + 2.8, -innerW / 2 + 0.4, '#94a3b8', 0.65);
      drawDeformedLine(lx, outerW / 2 - 0.5, lx + 2.8, innerW / 2 - 0.4, '#94a3b8', 0.65);
    }
    // Red safety tip markers on boom head pulleys
    drawDeformedRect(ladderX2 - 2.2, -outerW / 2 - 0.2, 2.2, 1.3, '#ef4444');
    drawDeformedRect(ladderX2 - 2.2, outerW / 2 - 1.1, 2.2, 1.3, '#ef4444');

    // Folded Rescue Cage / Cradle at Ladder Tip (Спасательная люлька на вершине стрелы)
    const basketX = ladderX2 - 0.4;
    const basketW = 8.4;
    drawDeformedRect(basketX - 2.8, -basketW / 2, 3.6, basketW, '#1e293b');
    drawDeformedLine(basketX - 2.8, -basketW / 2, basketX + 0.8, -basketW / 2, '#f8fafc', 1.0);
    drawDeformedLine(basketX + 0.8, -basketW / 2, basketX + 0.8, basketW / 2, '#f8fafc', 1.0);
    drawDeformedLine(basketX + 0.8, basketW / 2, basketX - 2.8, basketW / 2, '#f8fafc', 1.0);
    drawDeformedCircle(basketX + 0.4, -basketW * 0.32, 0.85, '#fef08a'); // Floodlights
    drawDeformedCircle(basketX + 0.4, basketW * 0.32, 0.85, '#fef08a');
  }

  // --- FIRE RESCUE (АВАРИЙНО-СПАСАТЕЛЬНЫЙ АВТОМОБИЛЬ АСА-20 МЧС С ТЕЛЕСКОПИЧЕСКОЙ СВЕТОвой БАШНЕЙ) ---
  else if (effectiveType === 'fire_rescue') {
    const cabBackX = cabinX - cabinL / 2;
    if (!resolvedTruck) {
      const bumpX = halfL - fc;
      drawDeformedRect(bumpX - 1, -halfW - 0.5, 3.5, halfW * 2 + 1, '#cbd5e1');
      drawDeformedRect(cabBackX, -halfW + 0.5, cabinL, halfW * 2 - 1, '#b91c1c');
    }

    // Front Bumper Heavy Electric Winch (Передняя силовая лебёдка самовытаскивания АСА)
    const bumpFrontX = halfL - fc + 0.3;
    drawDeformedRect(bumpFrontX - 0.6, -2.8, 1.8, 5.6, '#0f172a');
    drawDeformedRect(bumpFrontX - 0.2, -1.8, 1.0, 3.6, '#64748b'); // Steel wire rope drum
    drawDeformedCircle(bumpFrontX + 1.1, 0, 0.65, '#facc15'); // Tow hook clevis

    // 1. High-Cube Technical Rescue Box Body (Высокий кузов-фургон АСА-20 строго позади кабины)
    const bodyX1 = -halfL + rc + 1.4;
    const bodyX2 = cabBackX - 0.8;
    const bodyLen = bodyX2 - bodyX1;
    const bodyW = halfW * 2 - 1.2;

    drawDeformedRect(bodyX1, -bodyW / 2, bodyLen, bodyW, '#dc2626');
    drawDeformedLine(bodyX1, -bodyW / 2, bodyX2, -bodyW / 2, '#7f1d1d', 1.2);
    drawDeformedLine(bodyX2, -bodyW / 2, bodyX2, bodyW / 2, '#7f1d1d', 1.2);
    drawDeformedLine(bodyX2, bodyW / 2, bodyX1, bodyW / 2, '#7f1d1d', 1.2);
    drawDeformedLine(bodyX1, bodyW / 2, bodyX1, -bodyW / 2, '#7f1d1d', 1.2);

    // МЧС России Tri-Color Livery: White & Bright Orange-Yellow Reflective Stripes along flanks
    drawDeformedRect(bodyX1 + 0.5, -bodyW / 2 + 0.25, bodyLen - 1.0, 1.2, '#f8fafc');
    drawDeformedRect(bodyX1 + 0.5, -bodyW / 2 + 1.45, bodyLen - 1.0, 0.85, '#f97316');
    drawDeformedRect(bodyX1 + 0.5, bodyW / 2 - 1.45, bodyLen - 1.0, 1.2, '#f8fafc');
    drawDeformedRect(bodyX1 + 0.5, bodyW / 2 - 2.30, bodyLen - 1.0, 0.85, '#f97316');

    // 4 Wide Anodized Aluminum Roller Shutters per side (8 просторных отсеков гидравлического аварийно-спасательного инструмента ГАСИ)
    const shutterCount = 4;
    const shutterSpan = (bodyLen - 2.8) / shutterCount;
    for (let s = 0; s < shutterCount; s++) {
      const sx = bodyX1 + 1.4 + s * shutterSpan;
      const sw = shutterSpan - 1.1;
      drawDeformedRect(sx, -bodyW / 2 + 2.3, sw, 2.1, '#cbd5e1');
      drawDeformedRect(sx, bodyW / 2 - 4.4, sw, 2.1, '#cbd5e1');
      for (let lx = sx + 1.0; lx < sx + sw - 0.6; lx += 1.5) {
        drawDeformedLine(lx, -bodyW / 2 + 2.45, lx, -bodyW / 2 + 4.25, '#64748b', 0.55);
        drawDeformedLine(lx, bodyW / 2 - 4.25, lx, bodyW / 2 - 2.45, '#64748b', 0.55);
      }
      // Upper LED scene floodlights above each compartment
      drawDeformedRect(sx + sw * 0.25, -bodyW / 2 + 0.05, sw * 0.5, 0.4, '#e0f2fe');
      drawDeformedRect(sx + sw * 0.25, bodyW / 2 - 0.45, sw * 0.5, 0.4, '#e0f2fe');
    }

    // 2. Non-Slip Aluminum Checkerplate Roof Deck & Equipment Storage Boxes
    const roofX1 = bodyX1 + 1.8;
    const roofX2 = bodyX2 - 1.6;
    const roofLen = roofX2 - roofX1;
    const roofW = bodyW - 8.8;
    drawDeformedRect(roofX1, -roofW / 2, roofLen, roofW, '#94a3b8');
    drawDeformedRect(roofX1 + 0.4, -roofW / 2 + 0.4, roofLen - 0.8, roofW - 0.8, '#cbd5e1');
    for (let rx = roofX1 + 2.5; rx < roofX2 - 1.5; rx += 3.2) {
      drawDeformedLine(rx, -roofW / 2 + 0.5, rx, roofW / 2 - 0.5, '#94a3b8', 0.6);
    }

    // Diesel 380V Power Generator Module (Дизель-генераторная установка с выхлопным патрубком)
    const genL = Math.min(9.5, roofLen * 0.34);
    drawDeformedRect(roofX1 + 1.2, -roofW / 2 + 0.7, genL, roofW * 0.44, '#f59e0b');
    drawDeformedRect(roofX1 + 2.0, -roofW / 2 + 1.2, genL - 1.6, roofW * 0.22, '#1e293b'); // Cooling louver grille
    drawDeformedCircle(roofX1 + genL - 0.4, -roofW * 0.16, 0.65, '#0f172a');

    // Heavy Rescue Equipment Coffins, Folding Tripod & Orange Spineboard Stretcher
    drawDeformedRect(roofX1 + 1.2, 0.6, genL, roofW * 0.42, '#334155');
    drawDeformedRect(roofX1 + genL + 2.0, -roofW / 2 + 0.8, Math.max(5.0, roofLen * 0.28), 2.4, '#ea580c'); // Orange spineboard

    // 3. Telescopic Pneumatic Floodlight Mast with Quad 1000W LED Projector Array (Световая башня АСА)
    const mastX = roofX2 - Math.min(6.0, roofLen * 0.24);
    drawDeformedCircle(mastX, 0, 3.6, '#0f172a', '#475569', 0.7);
    drawDeformedCircle(mastX, 0, 2.1, '#cbd5e1');
    // 4 directional halogen/LED floodlight projector heads
    drawDeformedRect(mastX - 1.8, -4.0, 3.6, 1.5, '#f8fafc');
    drawDeformedRect(mastX - 1.8, 2.5, 3.6, 1.5, '#f8fafc');
    drawDeformedRect(mastX - 4.0, -1.8, 1.5, 3.6, '#f8fafc');
    drawDeformedRect(mastX + 2.5, -1.8, 1.5, 3.6, '#f8fafc');
    drawDeformedCircle(mastX, 0, 0.85, '#eab308');

    // Rear Roof Access Ladder & Twin Blue Strobe Beacons
    drawDeformedRect(bodyX1 - 0.8, -2.0, 0.9, 4.0, '#cbd5e1');
    drawDeformedCircle(bodyX1 + 0.9, -bodyW / 2 + 1.4, 0.95, '#2563eb');
    drawDeformedCircle(bodyX1 + 0.9, bodyW / 2 - 1.4, 0.95, '#2563eb');
  }

  // --- STANDARD CITY BUS ---
  else if (car.type === 'bus') {
    if (car.isPlayerInsideSaloon) {
      // =======================================================================
      // --- REALISTIC BUS INTERIOR CUTAWAY (АНАТОМИЧЕСКИЙ СРЕЗ АВТОБУСА) ---
      // =======================================================================
      const glassX1 = -halfL + 8;
      const glassX2 = halfL - 10;

      // 1. Base Flooring (Dark non-slip transport linoleum / ribbed rubber)
      drawDeformedRect(-halfL + 2, -halfW + 2, car.length - 4, halfW * 2 - 4, '#1e293b');
      drawDeformedRect(-halfL + 4, -halfW + 3, car.length - 8, halfW * 2 - 6, '#334155');

      // Subtle floor ribbing
      for (let rx = -halfL + 8; rx < halfL - 10; rx += 4) {
        drawDeformedLine(rx, -halfW + 3.5, rx, halfW - 3.5, '#1e293b', 0.5);
      }

      // Central walking aisle (lighter highlight)
      drawDeformedRect(-halfL + 6, -3, car.length - 14, 6.5, '#475569');

      // 2. Boarding Door Steps with Yellow Safety High-Grip Edges
      const doorPositions = [glassX1 + (glassX2 - glassX1) * 0.18, glassX1 + (glassX2 - glassX1) * 0.72];
      doorPositions.forEach(dx => {
        // Recessed entry step
        drawDeformedRect(dx - 4.5, halfW - 3.5, 9, 3.2, '#0f172a');
        // Yellow safety hazard stripe
        drawDeformedRect(dx - 4.5, halfW - 3.2, 9, 0.8, '#eab308');
        // Electronic validator terminal (Валидатор оплаты проезда)
        drawDeformedRect(dx - 4, halfW - 4.8, 1.8, 1.4, '#0284c7');
        drawDeformedCircle(dx - 3.1, halfW - 4.1, 0.4, '#4ade80'); // Green validator LED
      });

      // 3. Driver Cabin Enclosure (Front-Left)
      drawDeformedRect(22, -halfW + 2, halfL - 28, 9.5, '#0f172a'); // Cabin base
      drawDeformedLine(22, -halfW + 2, 22, -1.0, '#64748b', 1.2); // Rear cabin bulkhead
      drawDeformedLine(22, -1.0, halfL - 6, -1.0, '#64748b', 1.2); // Side cabin glass partition
      // Ticket transaction window hatch
      drawDeformedRect(27, -1.2, 4, 0.6, '#38bdf8');
      // Driver seat & dashboard
      drawDeformedRect(30, -7.5, 5, 4.5, '#0284c7'); // Blue driver cushion
      drawDeformedRect(28.5, -7.5, 1.5, 4.5, '#0f172a'); // Driver headrest/back
      drawDeformedCircle(34, -5.5, 1.8, '#0f172a'); // Steering wheel

      // 4. Passenger Seats (2+2 / 2+1 Seating Layout)
      const renderSeat = (sx: number, sy: number, w: number, h: number, isDouble: boolean = true) => {
        // Seat frame / base
        drawDeformedRect(sx - w / 2, sy - h / 2, w, h, '#0f172a');
        // Soft velour cushion (modern urban blue pattern)
        drawDeformedRect(sx - w / 2 + 0.5, sy - h / 2 + 0.5, w - 1, h - 1, '#0284c7');
        // Seatback / headrest
        drawDeformedRect(sx - w / 2, sy - h / 2, 1.2, h, '#0f172a');
        // Yellow grab handle on seat back
        drawDeformedLine(sx - w / 2 + 0.2, sy - h / 2 + 0.6, sx - w / 2 + 0.2, sy + h / 2 - 0.6, '#eab308', 0.8);
      };

      // Left double seats (6 rows)
      const leftRows = [18, 9, 0, -9, -18, -27];
      leftRows.forEach(rx => {
        renderSeat(rx, -6.8, 5.2, 5.8, true);
      });

      // Right seats (single & double)
      renderSeat(6, 7.2, 5.2, 3.2, false);
      renderSeat(-4, 7.2, 5.2, 3.2, false);
      renderSeat(-27, 7.2, 5.2, 5.8, true);

      // Rear engine raised bench (4 seats across)
      drawDeformedRect(-halfL + 3, -halfW + 3, 6, halfW * 2 - 6, '#0f172a');
      const rearYs = [-7.5, -2.5, 2.5, 7.5];
      rearYs.forEach(ry => {
        drawDeformedRect(-halfL + 4.5, ry - 1.8, 3.8, 3.6, '#0284c7');
      });

      // 5. Bright Yellow Vertical Stanchions & Overhead Handrails (Поручни)
      const polePositions = [
        { x: 23, y: 1 }, { x: 14, y: -2.5 }, { x: 5, y: -2.5 }, { x: -5, y: -2.5 },
        { x: -14, y: -2.5 }, { x: -23, y: -2.5 }, { x: 20, y: 4.5 }, { x: -14, y: 4.5 }
      ];
      polePositions.forEach(p => {
        drawDeformedCircle(p.x, p.y, 0.9, '#eab308', '#ca8a04', 0.5);
      });

      // Longitudinal overhead grab rails
      drawDeformedLine(-halfL + 8, -2.5, halfL - 16, -2.5, '#eab308', 0.9);
      drawDeformedLine(-halfL + 8, 3.5, halfL - 16, 3.5, '#eab308', 0.9);

      // 6. Side Outer Walls with Glass Windows
      drawDeformedRect(-halfL + 2, -halfW + 0.5, car.length - 4, 1.8, '#0f172a');
      drawDeformedRect(-halfL + 2, halfW - 2.3, car.length - 4, 1.8, '#0f172a');

      // Side glass panes
      const winCount = 6;
      const winSpan = (glassX2 - glassX1 - 8) / winCount;
      for (let i = 0; i < winCount; i++) {
        const wx = glassX1 + 4 + i * winSpan;
        const ww = winSpan - 2;
        drawDeformedRect(wx, -halfW + 0.6, ww, 1.4, 'rgba(56, 189, 248, 0.45)');
        drawDeformedRect(wx, halfW - 2.0, ww, 1.4, 'rgba(56, 189, 248, 0.45)');
      }

      // Front & Rear Windshields
      const fWindshieldX = halfL - 10;
      const fWindshieldW = halfW * 2 - 2.5;
      drawDeformedRect(fWindshieldX, -fWindshieldW / 2, 5, fWindshieldW, '#0f172a');
      drawDeformedRect(fWindshieldX + 1.2, -fWindshieldW / 2 + 0.8, 3.2, fWindshieldW - 1.6, 'rgba(56, 189, 248, 0.35)');

      // Mirrors
      drawDeformedRect(halfL - 5, -halfW - 3.2, 1.8, 3.6, '#1e293b');
      drawDeformedRect(halfL - 5, halfW - 0.4, 1.8, 3.6, '#1e293b');
    } else {
      // Standard Exterior View
      const glassX1 = -halfL + 8;
      const glassX2 = halfL - 10;
      const glassW = halfW * 2 - 1.2;
      drawDeformedRect(glassX1, -glassW / 2, glassX2 - glassX1, glassW, '#0f172a');

      const busRoofW = halfW * 2 - 4.5;
      drawDeformedRect(glassX1 + 1, -busRoofW / 2, glassX2 - glassX1 - 2, busRoofW, car.roofColor || car.color);

      const winCount = 6;
      const winSpan = (glassX2 - glassX1 - 8) / winCount;
      for (let i = 0; i < winCount; i++) {
        const wx = glassX1 + 4 + i * winSpan;
        const ww = winSpan - 2;
        drawDeformedRect(wx, -halfW + 0.5, ww, 2.2, 'rgba(56, 189, 248, 0.16)');
        drawDeformedRect(wx, halfW - 2.7, ww, 2.2, 'rgba(56, 189, 248, 0.16)');
      }

      const fWindshieldX = halfL - 10;
      const fWindshieldW = halfW * 2 - 2.5;
      drawDeformedRect(fWindshieldX, -fWindshieldW / 2, 6, fWindshieldW, '#0f172a');
      drawDeformedRect(fWindshieldX + 1.5, -fWindshieldW / 2 + 0.8, 3.8, fWindshieldW - 1.6, 'rgba(56, 189, 248, 0.22)');
      drawDeformedLine(fWindshieldX + 2, -fWindshieldW / 3, fWindshieldX + 4.5, fWindshieldW / 3, 'rgba(255, 255, 255, 0.28)', 1);

      drawDeformedRect(fWindshieldX - 2.5, -8, 2, 16, '#1e293b');
      drawDeformedRect(fWindshieldX - 2, -6.5, 1.2, 13, '#f59e0b');

      const rWindshieldX = -halfL + 3.5;
      const rWindshieldW = halfW * 2 - 6;
      drawDeformedRect(rWindshieldX, -rWindshieldW / 2, 3, rWindshieldW, '#0f172a');
      drawDeformedRect(rWindshieldX + 0.5, -rWindshieldW / 2 + 0.5, 2, rWindshieldW - 1, 'rgba(56, 189, 248, 0.16)');

      const doorW = 8.5;
      const doorPositions = [glassX1 + (glassX2 - glassX1) * 0.18, glassX1 + (glassX2 - glassX1) * 0.72];
      doorPositions.forEach(dx => {
        drawDeformedRect(dx - doorW / 2, halfW - 2.2, doorW, 2.5, '#1e293b');
        drawDeformedRect(dx - 0.4, halfW - 2.2, 0.8, 2.5, '#cbd5e1');
        drawDeformedRect(dx - doorW / 2 + 1, halfW - 1.6, doorW / 2 - 1.8, 1.4, 'rgba(56, 189, 248, 0.22)');
        drawDeformedRect(dx + 0.8, halfW - 1.6, doorW / 2 - 1.8, 1.4, 'rgba(56, 189, 248, 0.22)');
      });

      drawDeformedRect(halfL - 5, -halfW - 3.2, 1.8, 3.6, '#1e293b');
      drawDeformedRect(halfL - 5, halfW - 0.4, 1.8, 3.6, '#1e293b');

      const acX = 0;
      const acL = 20;
      const acW = 12;
      drawDeformedRect(acX - acL / 2, -acW / 2, acL, acW, '#f8fafc');
      drawDeformedLine(acX - acL / 2, -acW / 2, acX + acL / 2, -acW / 2, '#cbd5e1', 0.8);
      drawDeformedLine(acX + acL / 2, -acW / 2, acX + acL / 2, acW / 2, '#cbd5e1', 0.8);
      drawDeformedLine(acX + acL / 2, acW / 2, acX - acL / 2, acW / 2, '#cbd5e1', 0.8);
      drawDeformedLine(acX - acL / 2, acW / 2, acX - acL / 2, -acW / 2, '#cbd5e1', 0.8);
      drawDeformedCircle(acX - 4.5, 0, 2.6, '#475569');
      drawDeformedCircle(acX + 4.5, 0, 2.6, '#475569');
    }
  }

  // --- WHEELED ASPHALT PAVER (КОЛЕСНЫЙ АСФАЛЬТОУКЛАДЧИК) ---
  else if (car.type === 'paver_asphalt_wheeled') {
    renderWheeledAsphaltPaver(vCtx);
  }

  // --- HEAVY ARTICULATED TANDEM ROAD ROLLER (ТЯЖЕЛЫЙ КАТОК С ЛОМАНАЙ РАМОЙ) ---
  else if (car.type === 'roller_heavy_tandem') {
    renderHeavyTandemRoller(vCtx);
  }

  // --- COMPACT SIDEWALK ROAD ROLLER (ТРОТУАРНЫЙ КАТОК С ЛОМАНАЙ РАМОЙ) ---
  else if (car.type === 'roller_compact_sidewalk') {
    renderCompactSidewalkRoller(vCtx);
  }

  // --- PNEUMATIC TIRE ROAD ROLLER (ПНЕВМОКОЛЕСНЫЙ КАТОК С ЛОМАНАЙ РАМОЙ) ---
  else if (car.type === 'roller_pneumatic') {
    renderPneumaticRoller(vCtx);
  }

  // --- MINIBUS (МАРШРУТНОЕ ТАКСИ) ---
  else if (car.type === 'bus_minibus') {
    if (car.isPlayerInsideSaloon) {
      // Minibus Saloon Interior Cutaway
      const glassX1 = -halfL + 4;
      const glassX2 = halfL - 5;

      // Ribbed dark rubber flooring
      drawDeformedRect(-halfL + 2, -halfW + 2, car.length - 4, halfW * 2 - 4, '#1e293b');
      drawDeformedRect(-halfL + 3, -halfW + 2.5, car.length - 6, halfW * 2 - 5, '#334155');

      // Central aisle walkway
      drawDeformedRect(-halfL + 4, -2, car.length - 10, 4.5, '#475569');

      // Side sliding passenger door step
      const slideDoorX = glassX1 + (glassX2 - glassX1) * 0.65;
      drawDeformedRect(slideDoorX - 4, halfW - 3, 8, 2.8, '#0f172a');
      drawDeformedRect(slideDoorX - 4, halfW - 2.8, 8, 0.8, '#eab308'); // Yellow step line

      // Driver seat & dashboard
      drawDeformedRect(16, -8, 5, 4.5, '#0284c7');
      drawDeformedRect(14.5, -8, 1.5, 4.5, '#0f172a');
      drawDeformedCircle(20, -5.5, 1.6, '#0f172a'); // Steering wheel
      // Front passenger seat
      drawDeformedRect(16, 3.5, 5, 4.5, '#0284c7');

      // Passenger seats helper
      const renderMiniSeat = (sx: number, sy: number) => {
        drawDeformedRect(sx - 2.2, sy - 2.2, 4.4, 4.4, '#0f172a');
        drawDeformedRect(sx - 1.8, sy - 1.8, 3.6, 3.6, '#0284c7');
        drawDeformedLine(sx - 2.2, sy - 2.0, sx - 2.2, sy + 2.0, '#eab308', 0.8);
      };

      // Left row (4 seats)
      [7, -2, -11, -20].forEach(sx => renderMiniSeat(sx, -5.8));
      // Right row (2 seats)
      [-2, -11].forEach(sx => renderMiniSeat(sx, 5.8));
      // Rear bench (4 seats)
      [-5.8, -1.8, 2.2, 6.2].forEach(sy => {
        drawDeformedRect(-25, sy - 1.6, 3.5, 3.2, '#0284c7');
      });

      // Handrails
      drawDeformedCircle(slideDoorX - 3.5, 1.5, 0.8, '#eab308', '#ca8a04', 0.4);
      drawDeformedLine(-halfL + 6, 0, halfL - 10, 0, '#eab308', 0.8);

      // Windows
      const winCount = 4;
      const winSpan = (glassX2 - glassX1 - 6) / winCount;
      for (let i = 0; i < winCount; i++) {
        const wx = glassX1 + 3 + i * winSpan;
        const ww = winSpan - 1.8;
        drawDeformedRect(wx, -halfW + 0.6, ww, 1.4, 'rgba(56, 189, 248, 0.45)');
        drawDeformedRect(wx, halfW - 2.0, ww, 1.4, 'rgba(56, 189, 248, 0.45)');
      }
    } else {
      // Commercial minibus livery (amber/yellow)
      const glassX1 = -halfL + 4;
      const glassX2 = halfL - 5;
      const glassW = halfW * 2 - 1.2;

      // Tinted passenger side windows
      const winCount = 4;
      const winSpan = (glassX2 - glassX1 - 6) / winCount;
      for (let i = 0; i < winCount; i++) {
        const wx = glassX1 + 3 + i * winSpan;
        const ww = winSpan - 1.8;
        drawDeformedRect(wx, -halfW + 0.5, ww, 2, 'rgba(56, 189, 248, 0.16)');
        drawDeformedRect(wx, halfW - 2.5, ww, 2, 'rgba(56, 189, 248, 0.16)');
      }

      // Side sliding passenger entrance door with step
      const slideDoorX = glassX1 + (glassX2 - glassX1) * 0.65;
      drawDeformedRect(slideDoorX - 4, halfW - 2.5, 8, 2.5, '#1e293b');
      drawDeformedRect(slideDoorX + 2, halfW - 2.2, 1.2, 2.0, '#cbd5e1'); // Door handle

      // Front windshield route plate («24к»)
      const fWsX = cabinX + cabinL * 0.35;
      drawDeformedRect(fWsX, -4, 2.5, 8, '#ffffff');
      drawDeformedRect(fWsX + 0.5, -3, 1.5, 6, '#f59e0b');

      // Roof escape ventilation hatch
      drawDeformedRect(-halfL * 0.1 - 3, -3, 6, 6, '#f1f5f9');
      drawDeformedLine(-halfL * 0.1 - 3, -3, -halfL * 0.1 + 3, -3, '#cbd5e1', 0.6);
      drawDeformedLine(-halfL * 0.1 + 3, -3, -halfL * 0.1 + 3, 3, '#cbd5e1', 0.6);
      drawDeformedLine(-halfL * 0.1 + 3, 3, -halfL * 0.1 - 3, 3, '#cbd5e1', 0.6);
      drawDeformedLine(-halfL * 0.1 - 3, 3, -halfL * 0.1 - 3, -3, '#cbd5e1', 0.6);

      // Rear cargo/exit doors
      drawDeformedLine(-halfL + rc + 1, -halfW + 3, -halfL + rc + 1, halfW - 3, '#1e293b', 1);
      drawDeformedLine(-halfL + rc + 1, 0, -halfL + rc + 3, 0, '#1e293b', 1);
    }
  }

  // --- AMBULANCE (STANDARD BOX AMBULANCE) ---
  else if (car.type === 'ambulance') {
    const cabL_amb = car.length * 0.28;
    const cabX_amb = halfL - cabL_amb * 0.8;
    const cabW_amb = halfW * 2 - 2;
    drawDeformedRect(cabX_amb - cabL_amb / 2, -cabW_amb / 2, cabL_amb, cabW_amb, '#0f172a');
    drawDeformedRect(cabX_amb - cabL_amb * 0.1, -cabW_amb * 0.38, cabL_amb * 0.55, cabW_amb * 0.76, '#ffffff');
    drawDeformedRect(cabX_amb + cabL_amb * 0.22, -cabW_amb / 2 + 1, 3.2, cabW_amb - 2, 'rgba(56, 189, 248, 0.18)');

    const boxX1_amb = -halfL + rc + 3;
    const boxX2_amb = cabX_amb - cabL_amb / 2 - 1;
    const boxW_amb = halfW * 2 - 0.8;
    drawDeformedRect(boxX1_amb, -boxW_amb / 2, boxX2_amb - boxX1_amb, boxW_amb, '#ffffff');
    drawDeformedLine(boxX1_amb, -boxW_amb / 2, boxX2_amb, -boxW_amb / 2, '#cbd5e1', 1);
    drawDeformedLine(boxX2_amb, -boxW_amb / 2, boxX2_amb, boxW_amb / 2, '#cbd5e1', 1);
    drawDeformedLine(boxX2_amb, boxW_amb / 2, boxX1_amb, boxW_amb / 2, '#cbd5e1', 1);
    drawDeformedLine(boxX1_amb, boxW_amb / 2, boxX1_amb, -boxW_amb / 2, '#cbd5e1', 1);

    drawDeformedRect(boxX1_amb, -boxW_amb / 2 + 1, boxX2_amb - boxX1_amb, 2.5, '#ef4444');
    drawDeformedRect(boxX1_amb, boxW_amb / 2 - 3.5, boxX2_amb - boxX1_amb, 2.5, '#ef4444');

    const roofCircleX = boxX1_amb + (boxX2_amb - boxX1_amb) * 0.55;
    drawDeformedCircle(roofCircleX, 0, 5.8, '#ffffff');
    drawDeformedRect(roofCircleX - 4.2, -1.2, 8.4, 2.4, '#ef4444');
    drawDeformedRect(roofCircleX - 1.2, -4.2, 2.4, 8.4, '#ef4444');
  }

  // --- AMBULANCE VAN (HIGH-ROOF INTENSIVE CARE / СКОРАЯ ПОМОЩЬ РЕАНИМАЦИЯ) ---
  else if (car.type === 'ambulance_van') {
    const cabL_amb = car.length * 0.32;
    const cabX_amb = halfL - cabL_amb * 0.75;
    const cabW_amb = halfW * 2 - 1.5;
    drawDeformedRect(cabX_amb - cabL_amb / 2, -cabW_amb / 2, cabL_amb, cabW_amb, '#0f172a');
    drawDeformedRect(cabX_amb - cabL_amb * 0.05, -cabW_amb * 0.4, cabL_amb * 0.6, cabW_amb * 0.8, '#ffffff');
    drawDeformedRect(cabX_amb + cabL_amb * 0.22, -cabW_amb / 2 + 1, 3.2, cabW_amb - 2, 'rgba(56, 189, 248, 0.2)');

    const boxX1_amb = -halfL + rc + 2;
    const boxX2_amb = cabX_amb - cabL_amb / 2;
    const boxW_amb = halfW * 2 - 1;
    drawDeformedRect(boxX1_amb, -boxW_amb / 2, boxX2_amb - boxX1_amb, boxW_amb, '#ffffff');
    drawDeformedLine(boxX1_amb, -boxW_amb / 2, boxX2_amb, -boxW_amb / 2, '#cbd5e1', 1.2);
    drawDeformedLine(boxX2_amb, -boxW_amb / 2, boxX2_amb, boxW_amb / 2, '#cbd5e1', 1.2);
    drawDeformedLine(boxX2_amb, boxW_amb / 2, boxX1_amb, boxW_amb / 2, '#cbd5e1', 1.2);
    drawDeformedLine(boxX1_amb, boxW_amb / 2, boxX1_amb, -boxW_amb / 2, '#cbd5e1', 1.2);

    // Fluorescent yellow & emerald green/red Battenburg reflective pattern on flanks
    const battenburgCount = 6;
    const bSpan = (boxX2_amb - boxX1_amb) / battenburgCount;
    for (let b = 0; b < battenburgCount; b++) {
      const bx = boxX1_amb + b * bSpan;
      const isAlt = b % 2 === 0;
      drawDeformedRect(bx, -boxW_amb / 2 + 1, bSpan, 1.8, isAlt ? '#ef4444' : '#facc15');
      drawDeformedRect(bx, boxW_amb / 2 - 2.8, bSpan, 1.8, isAlt ? '#facc15' : '#ef4444');
    }

    // Frosted privacy windows on patient compartment
    drawDeformedRect(boxX1_amb + 4, -boxW_amb / 2 + 0.5, (boxX2_amb - boxX1_amb) * 0.45, 1.8, 'rgba(56, 189, 248, 0.25)');
    drawDeformedRect(boxX1_amb + 4, boxW_amb / 2 - 2.3, (boxX2_amb - boxX1_amb) * 0.45, 1.8, 'rgba(56, 189, 248, 0.25)');

    // Big Red Cross / Star of Life on roof
    const roofMidX = boxX1_amb + (boxX2_amb - boxX1_amb) * 0.5;
    drawDeformedCircle(roofMidX, 0, 6, '#ffffff');
    drawDeformedRect(roofMidX - 4.5, -1.3, 9, 2.6, '#ef4444');
    drawDeformedRect(roofMidX - 1.3, -4.5, 2.6, 9, '#ef4444');

    // Roof ventilation dome & GPS module
    drawDeformedCircle(boxX1_amb + 4, 0, 2.5, '#cbd5e1');
  }

  // --- AMBULANCE SUV (PARAMEDIC RAPID EMERGENCY SUV) ---
  else if (car.type === 'ambulance_suv') {
    // Paramedic red stripes along beltline
    drawDeformedRect(-halfL + rc + 2, -halfW + 1, car.length * 0.75, 1.8, '#ef4444');
    drawDeformedRect(-halfL + rc + 2, halfW - 2.8, car.length * 0.75, 1.8, '#ef4444');

    // Hood medical cross
    const hoodCrossX = halfL - fc - 5;
    drawDeformedRect(hoodCrossX - 2.5, -0.8, 5, 1.6, '#ef4444');
    drawDeformedRect(hoodCrossX - 0.8, -2.5, 1.6, 5, '#ef4444');

    // Roof rack rails
    drawDeformedLine(cabinX - cabinL * 0.35, -cabinW * 0.42, cabinX + cabinL * 0.35, -cabinW * 0.42, '#334155', 1.2);
    drawDeformedLine(cabinX - cabinL * 0.35, cabinW * 0.42, cabinX + cabinL * 0.35, cabinW * 0.42, '#334155', 1.2);

    // Rear cargo medical kit (visible through rear window)
    drawDeformedRect(cabinX - cabinL * 0.4, -2.5, 4, 5, '#ef4444');
    drawDeformedRect(cabinX - cabinL * 0.4 + 1.2, -1, 1.6, 2, '#ffffff');
  }

  // --- TRUCK BOX (ИЗОТЕРМИЧЕСКИЙ ПРОМТОВАРНЫЙ ФУРГОН / РЕФРИЖЕРАТОР) ---
  else if (effectiveType === 'truck_box') {
    const boxX1 = resolvedTruck ? resolvedTruck.rearBodyX + 0.5 : (-halfL + rc + 1.5);
    const boxX2 = resolvedTruck ? resolvedTruck.cabRearX - 1.4 : (cabinX - cabinL / 2 - 1.2);
    const boxL = Math.max(12, boxX2 - boxX1);
    const boxW = halfW * 2 - 0.8;
    const halfBoxW = boxW / 2;

    // 1. Subframe Mounting Sill & Drop Shadow over Frame
    drawDeformedRect(boxX1 - 0.5, -halfBoxW - 0.5, boxL + 1.0, boxW + 1.0, 'rgba(2, 6, 23, 0.45)');

    // 2. Thermo-King / Carrier Nose-Mounted Refrigeration Unit on Front Bulkhead
    const reeferX1 = boxX2;
    const reeferL = 1.6;
    const reeferW = boxW * 0.54;
    drawDeformedRect(reeferX1 - 0.2, -reeferW / 2, reeferL, reeferW, '#1e293b');
    drawDeformedRect(reeferX1 + 0.1, -reeferW / 2 + 0.4, reeferL - 0.5, reeferW - 0.8, '#e2e8f0');
    // Twin condenser fans on reefer unit
    drawDeformedCircle(reeferX1 + 0.6, -reeferW * 0.24, 1.1, '#0f172a', '#64748b', 0.4);
    drawDeformedCircle(reeferX1 + 0.6, reeferW * 0.24, 1.1, '#0f172a', '#64748b', 0.4);

    // 3. Insulated Sandwich-Panel Van Body Roof with Extruded Anodized Aluminum Corner Profiles
    const roofGrad = ctx.createLinearGradient(0, -halfBoxW, 0, halfBoxW);
    roofGrad.addColorStop(0, '#cbd5e1');
    roofGrad.addColorStop(0.14, '#f8fafc');
    roofGrad.addColorStop(0.5, '#ffffff');
    roofGrad.addColorStop(0.86, '#f1f5f9');
    roofGrad.addColorStop(1, '#94a3b8');
    drawDeformedRect(boxX1, -halfBoxW, boxL, boxW, roofGrad);

    // Extruded aluminum perimeter rails with corner castings
    drawDeformedRect(boxX1, -halfBoxW, boxL, 1.1, '#94a3b8');
    drawDeformedRect(boxX1, halfBoxW - 1.1, boxL, 1.1, '#94a3b8');
    drawDeformedRect(boxX2 - 1.0, -halfBoxW, 1.0, boxW, '#94a3b8');
    drawDeformedRect(boxX1, -halfBoxW, 1.2, boxW, '#64748b');
    // Corner cast aluminum caps
    [
      [boxX1, -halfBoxW],
      [boxX1, halfBoxW - 1.4],
      [boxX2 - 1.4, -halfBoxW],
      [boxX2 - 1.4, halfBoxW - 1.4]
    ].forEach(([cx, cy]) => {
      drawDeformedRect(cx, cy, 1.4, 1.4, '#475569');
      drawDeformedCircle(cx + 0.7, cy + 0.7, 0.3, '#e2e8f0');
    });

    // Transverse riveted roof sheet seams & side vertical stiffener studs
    const panelStep = Math.max(4.5, boxL / 6);
    for (let bx = boxX1 + panelStep; bx < boxX2 - 2.0; bx += panelStep) {
      drawDeformedLine(bx, -halfBoxW + 0.8, bx, halfBoxW - 0.8, '#cbd5e1', 0.8);
      drawDeformedLine(bx + 0.4, -halfBoxW + 0.8, bx + 0.4, halfBoxW - 0.8, 'rgba(255,255,255,0.8)', 0.5);
      // Rivet line
      for (let ry = -halfBoxW + 1.4; ry <= halfBoxW - 1.4; ry += 2.6) {
        drawDeformedCircle(bx - 0.2, ry, 0.22, '#64748b');
      }
      // Side wall vertical stiffener ribs
      drawDeformedRect(bx - 0.3, -halfBoxW - 0.2, 0.6, 0.5, '#64748b');
      drawDeformedRect(bx - 0.3, halfBoxW - 0.3, 0.6, 0.5, '#64748b');
    }

    // Translucent central skylight strip / thermal expansion rib
    drawDeformedRect(boxX1 + 2.5, -1.6, boxL - 5.0, 3.2, 'rgba(226, 232, 240, 0.55)');

    // 4. Rear Double Swing Doors, Espagnolette Locking Bars & Rubber Dock Bumpers
    // Black EPDM rubber door gasket seal
    drawDeformedLine(boxX1 + 0.3, -halfBoxW + 0.8, boxX1 + 0.3, halfBoxW - 0.8, '#0f172a', 0.9);
    drawDeformedLine(boxX1, 0, boxX1 + 1.2, 0, '#0f172a', 0.9);
    // 4 heavy stainless steel door hinges on outer edges
    [-halfBoxW + 0.6, -halfBoxW + 2.2, halfBoxW - 2.8, halfBoxW - 1.2].forEach(hy => {
      drawDeformedRect(boxX1 - 0.4, hy, 1.0, 0.7, '#64748b');
    });
    // Twin vertical espagnolette locking rods (штанговые запоры фургона)
    [-2.4, -1.2, 1.2, 2.4].forEach(ly => {
      drawDeformedRect(boxX1 - 0.5, ly - 0.35, 0.7, 0.7, '#cbd5e1');
    });
    // Heavy rubber loading dock bumpers at rear corners
    drawDeformedRect(boxX1 - 0.9, -halfBoxW + 0.5, 0.9, 2.2, '#0f172a');
    drawDeformedRect(boxX1 - 0.9, halfBoxW - 2.7, 0.9, 2.2, '#0f172a');

    // Upper corner clearance marker lights (amber front, red rear)
    drawDeformedRect(boxX2 - 0.8, -halfBoxW - 0.2, 0.8, 0.6, '#f59e0b');
    drawDeformedRect(boxX2 - 0.8, halfBoxW - 0.4, 0.8, 0.6, '#f59e0b');
    drawDeformedRect(boxX1 + 0.1, -halfBoxW - 0.2, 0.8, 0.6, '#ef4444');
    drawDeformedRect(boxX1 + 0.1, halfBoxW - 0.4, 0.8, 0.6, '#ef4444');
  }

  // --- TRUCK SEMI (СЕДЕЛЬНО-СЦЕПНОЕ УСТРОЙСТВО ССУ И ПЕРЕХОДНОЙ МОСТИК ПОВЕРХ РАМЫ) ---
  else if (effectiveType === 'truck_semi') {
    if (resolvedTruck) {
      if (!(vCtx as any).fifthWheelAlreadyDrawn) {
        renderTruckFifthWheelCoupling(vCtx, resolvedTruck);
      }
    } else {
      const fifthWheelX = car.hitchOffset !== undefined ? car.hitchOffset : -12;
      const frameX2 = cabinX - cabinL / 2 + 1.0;
      const catwalkX1 = frameX2 - 6.5;
      const catwalkX2 = frameX2;
      drawDeformedRect(catwalkX1, -5.5, catwalkX2 - catwalkX1, 11.0, '#334155');
      drawDeformedRect(fifthWheelX - 4.8, -5.2, 9.6, 10.4, '#0f172a');
      drawDeformedRect(fifthWheelX - 4.0, -4.5, 8.0, 9.0, '#1e293b');
      drawDeformedCircle(fifthWheelX - 0.2, 0, 1.4, '#475569');
    }
  }

  // --- SEMI-TRAILERS (НЕФАЗ БОРТОВОЙ, СОВТРАНСАВТО РЕФРИЖЕРАТОР, ЦИСТЕРНА ГСМ, 40FT КОНТЕЙНЕРОВОЗ, ТРАЛ-ТЯЖЕЛОВОЗ) ---
  else if (car.type.startsWith('trailer_semi')) {
    const defaultColor = 
      car.type === 'trailer_semi_box' ? '#f8fafc' :
      car.type === 'trailer_semi_tanker' ? '#ea580c' :
      car.type === 'trailer_semi_container' ? '#991b1b' :
      car.type === 'trailer_semi_lowboy' ? '#d97706' : '#1e3a8a';
    const trailerColor = car.color || defaultColor;
    const boxX1 = -halfL + rc + 0.8; // ~ -57.0 rear
    const boxX2 = halfL - fc - 0.8;  // ~ 57.0 front
    const boxL = boxX2 - boxX1;
    const boxW = halfW * 2 - 1.2;
    const isCoupled = !!car.towedById;

    // ==========================================
    // 1. UNDERBODY CHASSIS, LANDING GEAR, FENDERS & SIDE UNDERRUN RAILS («ВЕЛООТБОЙНИКИ»)
    // ==========================================

    // Heavy I-Beam Longitudinal Chassis Beams (Лонжероны рамы полуприцепа)
    drawDeformedRect(boxX1, -5.0, boxL, 1.8, '#0f172a'); // Left longitudinal beam
    drawDeformedLine(boxX1, -5.0, boxX2, -5.0, '#334155', 0.8);
    drawDeformedRect(boxX1, 3.2, boxL, 1.8, '#0f172a'); // Right longitudinal beam
    drawDeformedLine(boxX1, 5.0, boxX2, 5.0, '#334155', 0.8);

    // Transverse steel crossmembers (поперечины платформы каждые 9px)
    for (let cx = boxX1 + 6; cx < boxX2 - 4; cx += 9) {
      drawDeformedLine(cx, -halfW + 1.2, cx, halfW - 1.2, '#1e293b', 1.0);
    }

    // Landing Gear Support Legs (Выдвижные опорные стойки / лапы) at x ~ 24
    const legX = halfL * 0.40;
    // Crossbeam between legs
    drawDeformedRect(legX - 1.0, -halfW + 1.2, 2.0, halfW * 2 - 2.4, '#0f172a');
    // Left landing gear leg & footpad
    drawDeformedRect(legX - 1.4, -halfW + 1.2, 2.8, 3.2, '#1e293b');
    // Right landing gear leg & footpad
    drawDeformedRect(legX - 1.4, halfW - 4.4, 2.8, 3.2, '#1e293b');

    if (!isCoupled) {
      // Parked / unhitched: Landing gear is EXTENDED DOWN on the ground!
      drawDeformedRect(legX - 2.2, -halfW + 0.8, 4.4, 3.8, '#0f172a'); // Wide steel footpad left
      drawDeformedRect(legX - 2.2, halfW - 4.6, 4.4, 3.8, '#0f172a'); // Wide steel footpad right
      drawDeformedCircle(legX, -halfW + 2.7, 0.8, '#64748b'); // Pad pivot pin
      drawDeformedCircle(legX, halfW - 2.7, 0.8, '#64748b');
      // Two-speed manual crank handle folded down
      drawDeformedLine(legX, -halfW + 1.0, legX, -halfW - 1.5, '#cbd5e1', 1.2);
      drawDeformedLine(legX, -halfW - 1.5, legX - 2.5, -halfW - 1.5, '#cbd5e1', 1.2);
    } else {
      // Coupled to tractor: Landing gear is RETRACTED UP (tucked flush under frame)!
      drawDeformedRect(legX - 1.0, -halfW + 1.6, 2.0, 2.2, '#334155');
      drawDeformedRect(legX - 1.0, halfW - 3.8, 2.0, 2.2, '#334155');
      // Crank handle hooked safely into storage bracket
      drawDeformedLine(legX, -halfW + 1.5, legX - 3.0, -halfW + 1.5, '#cbd5e1', 1.0);
    }

    // Side Underrun Protection Rails (Боковые отбойники / «велоотбойники»)
    const railX1 = -24.0;
    const railX2 = 18.0;
    // Left side double aluminum rail
    drawDeformedLine(railX1, -halfW + 0.5, railX2, -halfW + 0.5, '#cbd5e1', 1.2);
    drawDeformedLine(railX1, -halfW + 1.8, railX2, -halfW + 1.8, '#cbd5e1', 1.2);
    for (let rx = railX1 + 6; rx <= railX2 - 4; rx += 14) {
      drawDeformedRect(rx - 0.6, -halfW + 0.4, 1.2, 2.4, '#1e293b');
      drawDeformedCircle(rx, -halfW + 0.4, 0.6, '#f59e0b'); // Side amber reflectors
    }
    // Right side double aluminum rail
    drawDeformedLine(railX1, halfW - 0.5, railX2, halfW - 0.5, '#cbd5e1', 1.2);
    drawDeformedLine(railX1, halfW - 1.8, railX2, halfW - 1.8, '#cbd5e1', 1.2);
    for (let rx = railX1 + 6; rx <= railX2 - 4; rx += 14) {
      drawDeformedRect(rx - 0.6, halfW - 2.8, 1.2, 2.4, '#1e293b');
      drawDeformedCircle(rx, halfW - 0.4, 0.6, '#f59e0b');
    }

    // Tandem Axle Fenders & Mudguards (Крылья тележки полуприцепа)
    drawDeformedRect(-47.0, -halfW + 0.2, 24.0, 3.8, '#1e293b');
    drawDeformedLine(-47.0, -halfW + 0.2, -23.0, -halfW + 0.2, '#334155', 1.0);
    drawDeformedRect(-47.0, halfW - 4.0, 24.0, 3.8, '#1e293b');
    drawDeformedLine(-47.0, halfW - 0.2, -23.0, halfW - 0.2, '#334155', 1.0);

    // Heavy Steel Rear Underrun Bumper Bar & Reflective Chevrons (Задний брус безопасности)
    const bumpX = boxX1 - 1.2;
    drawDeformedRect(bumpX, -halfW + 0.5, 2.0, halfW * 2 - 1.0, '#1e293b');
    const chevSpan = 3.6;
    for (let cy = -halfW + 1.2; cy < halfW - 2.0; cy += chevSpan) {
      drawDeformedLine(bumpX + 0.5, cy, bumpX + 1.5, cy + 2.0, '#facc15', 1.4);
      drawDeformedLine(bumpX + 0.5, cy + 2.0, bumpX + 1.5, cy + 3.6, '#ef4444', 1.4);
    }

    // Modern Multi-Chamber Rear Light Clusters (Задние фонари)
    drawDeformedRect(boxX1 - 0.5, -halfW + 1.2, 1.4, 5.2, '#0f172a');
    drawDeformedRect(boxX1 - 0.5, -halfW + 1.4, 1.4, 1.6, '#ef4444'); // Tail / brake light
    drawDeformedRect(boxX1 - 0.5, -halfW + 3.1, 1.4, 1.5, '#f59e0b'); // Turn indicator
    drawDeformedRect(boxX1 - 0.5, -halfW + 4.7, 1.4, 1.4, '#f8fafc'); // Reversing light
    drawDeformedRect(boxX1 - 0.5, halfW - 6.4, 1.4, 5.2, '#0f172a');
    drawDeformedRect(boxX1 - 0.5, halfW - 3.0, 1.4, 1.6, '#ef4444');
    drawDeformedRect(boxX1 - 0.5, halfW - 4.6, 1.4, 1.5, '#f59e0b');
    drawDeformedRect(boxX1 - 0.5, halfW - 6.1, 1.4, 1.4, '#f8fafc');

    // Central white license plate & illumination housing
    drawDeformedRect(boxX1 - 0.6, -2.4, 1.4, 4.8, '#f8fafc');
    drawDeformedRect(boxX1 - 0.8, -1.8, 0.4, 3.6, '#0f172a');

    // ==========================================
    // 2. SUPERSTRUCTURES ACCORDING TO TRAILER TYPE
    // ==========================================

    if (car.type === 'trailer_semi_box') {
      // --- REFRIGERATED / ISOTHERMAL BOX TRAILER («СОВТРАНСАВТО» / ALKA / SCHMITZ) ---
      // Clean white composite panels
      drawDeformedRect(boxX1, -boxW / 2, boxL, boxW, '#f8fafc');
      // Silver perimeter extrusions & corner moldings
      drawDeformedLine(boxX1, -boxW / 2, boxX2, -boxW / 2, '#cbd5e1', 1.4);
      drawDeformedLine(boxX1, boxW / 2, boxX2, boxW / 2, '#cbd5e1', 1.4);
      drawDeformedLine(boxX1, -boxW / 2, boxX1, boxW / 2, '#94a3b8', 1.6);
      drawDeformedLine(boxX2, -boxW / 2, boxX2, boxW / 2, '#94a3b8', 1.6);

      // Aerodynamic roof reinforcement ribs
      for (let rx = boxX1 + 10; rx < boxX2 - 14; rx += 14) {
        drawDeformedLine(rx, -boxW * 0.38, rx, boxW * 0.38, '#e2e8f0', 1.0);
      }

      // Iconic Sovtransavto / Kamaz-Trans Dual Livery Stripes (Синяя и красная полосы)
      drawDeformedLine(boxX1 + 8, -boxW / 2 + 1.5, boxX2 - 6, -boxW / 2 + 1.5, '#1e40af', 1.4);
      drawDeformedLine(boxX1 + 8, -boxW / 2 + 3.0, boxX2 - 6, -boxW / 2 + 3.0, '#dc2626', 1.0);
      drawDeformedLine(boxX1 + 8, boxW / 2 - 1.5, boxX2 - 6, boxW / 2 - 1.5, '#1e40af', 1.4);
      drawDeformedLine(boxX1 + 8, boxW / 2 - 3.0, boxX2 - 6, boxW / 2 - 3.0, '#dc2626', 1.0);

      // Front-Mounted Thermo King Refrigeration Unit (Холодильная установка)
      const reeferL = 4.5;
      const reeferW = boxW * 0.65;
      const reeferX = boxX2 - reeferL;
      drawDeformedRect(reeferX, -reeferW / 2, reeferL, reeferW, '#1e293b');
      // Condenser airflow intake louvers
      for (let ly = -reeferW * 0.35; ly <= reeferW * 0.35; ly += 1.8) {
        drawDeformedLine(reeferX + 0.8, ly, reeferX + 3.4, ly, '#0f172a', 0.8);
      }
      // Chrome exhaust stack
      drawDeformedCircle(reeferX + 1.2, -reeferW * 0.35, 0.9, '#cbd5e1');
      drawDeformedCircle(reeferX + 1.2, -reeferW * 0.35, 0.5, '#0f172a');
      // Status green running LED & digital temperature display
      drawDeformedCircle(reeferX + 2.8, reeferW * 0.35, 0.6, '#22c55e');
      drawDeformedRect(reeferX + 1.8, reeferW * 0.15, 1.2, 2.4, '#10b981');

      // Rear Heavy Double Swing Doors (Двойные распашные ворота фургона)
      const doorX = boxX1;
      // 4 Galvanized Vertical Cam-Action Locking Rods (4 запорные штанги)
      drawDeformedLine(doorX + 0.8, -boxW * 0.36, doorX + 0.8, -boxW * 0.08, '#94a3b8', 1.4);
      drawDeformedLine(doorX + 0.8, -boxW * 0.08, doorX + 0.8, -boxW * 0.36, '#94a3b8', 1.4);
      drawDeformedLine(doorX + 0.8, boxW * 0.08, doorX + 0.8, boxW * 0.36, '#94a3b8', 1.4);
      // Center rubber door seal gasket
      drawDeformedLine(doorX, 0, doorX + 1.5, 0, '#0f172a', 1.2);
      // Heavy hinges on outer door edges
      drawDeformedRect(doorX, -boxW / 2, 1.2, 1.6, '#475569');
      drawDeformedRect(doorX, boxW / 2 - 1.6, 1.2, 1.6, '#475569');

    } else if (car.type === 'trailer_semi_tanker') {
      // --- HEAVY FUEL & OIL TANKER SEMI-TRAILER (НЕФАЗ-96742 ЦИСТЕРНА ГСМ) ---
      const tankX1 = boxX1 + 1.5;
      const tankX2 = boxX2 - 1.5;
      const tankL = tankX2 - tankX1;
      const tankW = boxW - 0.8;

      // Elliptical Tank Body Shell
      drawDeformedRect(tankX1, -tankW / 2, tankL, tankW, trailerColor);
      // Front and rear elliptical domed end caps (днища цистерны)
      drawDeformedLine(tankX1, -tankW / 2, tankX1, tankW / 2, '#7c2d12', 1.6);
      drawDeformedLine(tankX2, -tankW / 2, tankX2, tankW / 2, '#7c2d12', 1.6);
      // Cylindrical light reflection highlights (блики по цилиндру)
      drawDeformedLine(tankX1 + 2, -tankW * 0.28, tankX2 - 2, -tankW * 0.28, 'rgba(255,255,255,0.30)', 1.4);
      drawDeformedLine(tankX1 + 2, tankW * 0.28, tankX2 - 2, tankW * 0.28, 'rgba(0,0,0,0.22)', 1.2);

      // Internal compartment dividing reinforcement rings (пояса отсеков)
      const compStep = tankL / 3;
      for (let s = 1; s <= 2; s++) {
        const ringX = tankX1 + s * compStep;
        drawDeformedLine(ringX, -tankW / 2, ringX, tankW / 2, 'rgba(0,0,0,0.35)', 1.4);
      }

      // Top Catwalk (Трап с антискользящей решеткой)
      const catW = 4.4;
      drawDeformedRect(tankX1 + 6, -catW / 2, tankL - 12, catW, '#94a3b8');
      // Anti-slip safety grating pattern
      for (let gx = tankX1 + 8; gx < tankX2 - 8; gx += 4) {
        drawDeformedLine(gx, -catW / 2, gx, catW / 2, '#64748b', 0.8);
      }
      // Catwalk fold-down safety handrail
      drawDeformedLine(tankX1 + 6, -catW / 2, tankX2 - 6, -catW / 2, '#e2e8f0', 0.9);

      // 3 Domed Manhole Inspection Hatches (Люки заливных горловин)
      for (let m = 0; m < 3; m++) {
        const mhX = tankX1 + compStep * (m + 0.5);
        drawDeformedCircle(mhX, 0, 2.2, '#1e293b'); // Hatch rim
        drawDeformedCircle(mhX, 0, 1.5, '#475569'); // Manhole cover
        drawDeformedCircle(mhX - 0.7, 0, 0.5, '#cbd5e1'); // Pressure relief vent valve
      }

      // Lateral Hose Storage Tubes (Пеналы для рукавов слива) along sides
      drawDeformedRect(tankX1 + 4, -halfW + 0.3, tankL - 10, 2.0, '#1e293b');
      drawDeformedRect(tankX1 + 4, halfW - 2.3, tankL - 10, 2.0, '#1e293b');
      // Rubber corrugated fuel hoses inside
      drawDeformedLine(tankX1 + 6, -halfW + 1.3, tankX2 - 8, -halfW + 1.3, '#020617', 1.3);
      drawDeformedLine(tankX1 + 6, halfW - 1.3, tankX2 - 8, halfW - 1.3, '#020617', 1.3);

      // Class 3 Flammable Liquid Diamond Placards (Ромбы опасности «ОГНЕОПАСНО 1203»)
      const placardX = (tankX1 + tankX2) / 2;
      drawDeformedRect(placardX - 2.0, -tankW / 2 + 1.0, 4.0, 3.2, '#dc2626');
      drawDeformedRect(placardX - 1.2, -tankW / 2 + 1.6, 2.4, 1.8, '#f8fafc');
      drawDeformedRect(placardX - 2.0, tankW / 2 - 4.2, 4.0, 3.2, '#dc2626');
      drawDeformedRect(placardX - 1.2, tankW / 2 - 3.4, 2.4, 1.8, '#f8fafc');

      // Rear Catwalk Access Ladder & Fire Extinguisher Box
      drawDeformedLine(tankX1 - 0.5, -catW / 2, tankX1 - 0.5, catW / 2, '#cbd5e1', 1.2);
      drawDeformedRect(boxX1 + 4, -halfW + 1.0, 3.6, 2.4, '#dc2626'); // Red fire extinguisher case

    } else if (car.type === 'trailer_semi_container') {
      // --- SKELETAL CONTAINER CHASSIS WITH 40FT ISO SHIPPING CONTAINER ---
      // Heavy Gooseneck Chassis Center Spine Beam & Bolsters
      drawDeformedRect(boxX1, -3.5, boxL, 7.0, '#0f172a');
      drawDeformedRect(boxX1, -halfW + 1.0, 3.0, halfW * 2 - 2.0, '#1e293b'); // Rear bolster
      drawDeformedRect(boxX2 - 3.0, -halfW + 1.0, 3.0, halfW * 2 - 2.0, '#1e293b'); // Front bolster

      // 4 Heavy Corner Twistlock Castings (Фитинги крепления ISO-контейнера)
      drawDeformedRect(boxX1, -boxW / 2, 3.4, 3.4, '#94a3b8');
      drawDeformedRect(boxX1, boxW / 2 - 3.4, 3.4, 3.4, '#94a3b8');
      drawDeformedRect(boxX2 - 3.4, -boxW / 2, 3.4, 3.4, '#94a3b8');
      drawDeformedRect(boxX2 - 3.4, boxW / 2 - 3.4, 3.4, 3.4, '#94a3b8');

      // 40-foot Corrugated Shipping Container (Контейнер 40ft)
      const contX1 = boxX1 + 1.0;
      const contX2 = boxX2 - 1.0;
      const contL = contX2 - contX1;
      const contW = boxW - 0.6;
      drawDeformedRect(contX1, -contW / 2, contL, contW, trailerColor);

      // Deep sheet-metal corrugations (гофра стенок и крыши контейнера каждые 3.2px)
      for (let cx = contX1 + 4; cx < contX2 - 4; cx += 3.2) {
        drawDeformedLine(cx, -contW / 2 + 0.5, cx, contW / 2 - 0.5, 'rgba(0,0,0,0.28)', 1.0);
        drawDeformedLine(cx + 1.2, -contW / 2 + 0.5, cx + 1.2, contW / 2 - 0.5, 'rgba(255,255,255,0.18)', 0.7);
      }

      // Container Front Wall Indented Stamping
      drawDeformedRect(contX2 - 2.0, -contW / 2 + 2, 1.2, contW - 4, 'rgba(0,0,0,0.30)');

      // Rear Cargo Double Doors with 4 Vertical Locking Rods
      const cDoorX = contX1;
      drawDeformedLine(cDoorX, 0, cDoorX + 1.4, 0, '#0f172a', 1.4); // Center vertical split
      drawDeformedLine(cDoorX + 0.6, -contW * 0.35, cDoorX + 0.6, -contW * 0.08, '#cbd5e1', 1.2);
      drawDeformedLine(cDoorX + 0.6, contW * 0.08, cDoorX + 0.6, contW * 0.35, '#cbd5e1', 1.2);
      // Container Tare/Gross Weight Stencil Badge
      drawDeformedRect(cDoorX + 0.8, -contW * 0.30, 0.8, 2.8, '#f8fafc');

    } else if (car.type === 'trailer_semi_lowboy') {
      // --- HEAVY LOWBOY STEP-FRAME FLATBED TRAILER (ЧМЗАП ТРАЛ-ТЯЖЕЛОВОЗ) ---
      const neckX = boxX2 - 16;
      // Front elevated gooseneck deck
      drawDeformedRect(neckX, -boxW / 2, 16, boxW, '#1e293b');
      // Step-down transition bevel
      drawDeformedLine(neckX, -boxW / 2, neckX, boxW / 2, '#d97706', 1.6);

      // Low Loading Main Deck with Heavy Steel Diamond-Plate
      drawDeformedRect(boxX1, -boxW / 2, neckX - boxX1, boxW, '#334155');
      // Diamond plate checker grid crosshatching
      for (let px = boxX1 + 4; px < neckX - 4; px += 8) {
        drawDeformedLine(px, -boxW / 2 + 1, px, boxW / 2 - 1, '#1e293b', 0.8);
      }
      // Heavy Steel Cargo Lashing Tie-Down Chains & D-Ring Binders
      for (let cx = boxX1 + 10; cx < neckX - 10; cx += 16) {
        drawDeformedCircle(cx, -boxW / 2 + 1.6, 1.0, '#cbd5e1');
        drawDeformedCircle(cx, boxW / 2 - 1.6, 1.0, '#cbd5e1');
        drawDeformedLine(cx, -boxW / 2 + 1.6, cx + 4, -boxW / 2 + 4, '#94a3b8', 1.0);
        drawDeformedLine(cx, boxW / 2 - 1.6, cx + 4, boxW / 2 - 4, '#94a3b8', 1.0);
      }

      // Side outrigger extension brackets (уширители трала)
      for (let ox = boxX1 + 6; ox < neckX - 6; ox += 12) {
        drawDeformedRect(ox, -halfW + 0.2, 2.0, 1.2, '#f59e0b');
        drawDeformedRect(ox, halfW - 1.4, 2.0, 1.2, '#f59e0b');
      }

      // Heavy Rear Spring-Assisted Fold-Down Ramps (Аппарели / сходни)
      const rampX = boxX1 - 2.5;
      const rampW = boxW * 0.36;
      // Left heavy ramp
      drawDeformedRect(rampX, -boxW / 2 + 1.0, 3.2, rampW, '#1e293b');
      // Right heavy ramp
      drawDeformedRect(rampX, boxW / 2 - rampW - 1.0, 3.2, rampW, '#1e293b');
      // Diagonal safety yellow/black hazard chevron stripes across ramps
      for (let sy = -boxW / 2 + 2; sy < -boxW / 2 + rampW; sy += 3.2) {
        drawDeformedLine(rampX + 0.4, sy, rampX + 2.8, sy + 2.0, '#facc15', 1.2);
      }
      for (let sy = boxW / 2 - rampW; sy < boxW / 2 - 2; sy += 3.2) {
        drawDeformedLine(rampX + 0.4, sy, rampX + 2.8, sy + 2.0, '#facc15', 1.2);
      }
      // Ramp heavy torsion springs
      drawDeformedCircle(boxX1, -boxW / 2 + rampW * 0.5, 1.1, '#64748b');
      drawDeformedCircle(boxX1, boxW / 2 - rampW * 0.5, 1.1, '#64748b');

    } else {
      // --- STANDARD NEFAZ/ODAZ DROP-SIDE SEMI-TRAILER (БОРТОВОЙ) ---
      // Weathered Hardwood / Anti-Slip Plywood Floor
      drawDeformedRect(boxX1, -boxW / 2, boxL, boxW, '#78716c');
      // Longitudinal plank joint seams
      for (let py = -boxW / 2 + 2.6; py < boxW / 2; py += 2.6) {
        drawDeformedLine(boxX1 + 1, py, boxX2 - 1, py, '#57534e', 0.7);
      }
      // Recessed heavy cargo lashing rings (петли крепления груза)
      for (let rx = boxX1 + 8; rx < boxX2 - 6; rx += 14) {
        drawDeformedCircle(rx, -boxW / 2 + 1.8, 0.7, '#cbd5e1');
        drawDeformedCircle(rx, boxW / 2 - 1.8, 0.7, '#cbd5e1');
      }

      // Heavy Front Steel Bulkhead / Headboard (Передний защитный щит)
      const headX1 = boxX2 - 3.2;
      const headX2 = boxX2;
      drawDeformedRect(headX1, -boxW / 2, headX2 - headX1, boxW, trailerColor);
      drawDeformedLine(headX1, -boxW / 2, headX1, boxW / 2, '#0f172a', 1.5);
      drawDeformedLine(headX2, -boxW / 2, headX2, boxW / 2, '#0f172a', 1.5);
      drawDeformedLine(headX1, -boxW * 0.25, headX2, -boxW * 0.25, '#1e293b', 1.2);
      drawDeformedLine(headX1, boxW * 0.25, headX2, boxW * 0.25, '#1e293b', 1.2);

      // Drop-Side Panels with Hinged Latches (Откидные металлические борта и замки)
      drawDeformedLine(boxX1, -boxW / 2, boxX2, -boxW / 2, trailerColor, 1.8);
      drawDeformedLine(boxX1, boxW / 2, boxX2, boxW / 2, trailerColor, 1.8);
      drawDeformedLine(boxX1, -boxW / 2, boxX1, boxW / 2, trailerColor, 1.8);

      // Removable vertical stanchions / stakes (стойки бортов) dividing sides into 4 sections
      const sectionSpan = (boxL - 4) / 4;
      for (let s = 0; s <= 4; s++) {
        const sx = boxX1 + 2 + s * sectionSpan;
        drawDeformedRect(sx - 0.8, -boxW / 2 - 0.4, 1.6, 1.4, '#0f172a');
        drawDeformedRect(sx - 0.8, boxW / 2 - 1.0, 1.6, 1.4, '#0f172a');
        if (s < 4) {
          // Drop-side locking handles
          drawDeformedRect(sx + 2.0, -boxW / 2 + 0.2, 1.4, 0.8, '#cbd5e1');
          drawDeformedRect(sx + sectionSpan - 3.4, -boxW / 2 + 0.2, 1.4, 0.8, '#cbd5e1');
          drawDeformedRect(sx + 2.0, boxW / 2 - 1.0, 1.4, 0.8, '#cbd5e1');
          drawDeformedRect(sx + sectionSpan - 3.4, boxW / 2 - 1.0, 1.4, 0.8, '#cbd5e1');
        }
      }
    }

    // Front Connection Manifold Plate (Панель подключений на переднем щите)
    drawDeformedRect(boxX2 - 1.5, -3.2, 1.6, 6.4, '#0f172a');
    drawDeformedCircle(boxX2 - 0.6, -2.2, 0.7, '#ef4444'); // Red emergency gladhand
    drawDeformedCircle(boxX2 - 0.6, 2.2, 0.7, '#2563eb');  // Blue service gladhand
    drawDeformedCircle(boxX2 - 0.6, 0, 0.7, '#020617');    // 7-pin electrical socket
  }
  // --- TRUCK DUMP (КАМАЗ-5511 / 55111 САМОСВАЛ С КОВШОМ-ЛОДОЧКОЙ - PREMIUM TOP-DOWN TEXTURE) ---
  else if (effectiveType === 'truck_dump') {
    const dumpColor = car.dumpColor || (resolvedTruck ? '#ea580c' : (car.color || '#d97706'));
    const cabBackX = resolvedTruck ? resolvedTruck.cabRearX : (cabinX - cabinL / 2);
    const dumpX1 = resolvedTruck ? resolvedTruck.rearBodyX - 0.5 : (-halfL + rc + 1.2);
    const dumpX2 = cabBackX - 3.2;
    const dumpL = Math.max(14, dumpX2 - dumpX1);
    const dumpW = halfW * 2 - 0.8;
    const halfDumpW = dumpW / 2;

    // 1. Front Telescopic Hydraulic Hoist Cylinder & Trunnion Cradle behind Cab
    const cylX = cabBackX - 1.6;
    drawDeformedRect(cylX - 1.6, -3.2, 3.0, 6.4, '#0f172a'); // Subframe hoist cradle
    drawDeformedCircle(cylX - 0.2, 0, 2.1, '#1e293b', '#475569', 0.6); // Outer cylinder barrel
    drawDeformedCircle(cylX - 0.2, 0, 1.3, '#94a3b8'); // Stage 2 chrome sleeve
    drawDeformedCircle(cylX - 0.2, 0, 0.7, '#f8fafc'); // Stage 3 polished piston rod
    drawDeformedLine(cylX - 0.2, -2.0, cylX - 1.2, -4.5, '#020617', 0.9); // High-pressure hydraulic hose

    // 2. Subframe Shadow & Heavy Protective Canopy Visor Overhang (Козырёк кузова над гидроцилиндром)
    drawDeformedRect(dumpX1 - 0.4, -halfDumpW - 0.4, dumpL + 0.8, dumpW + 0.8, 'rgba(2, 6, 23, 0.45)');
    const canopyX2 = cabBackX + 2.4;
    const canopyW = dumpW * 0.92;
    drawDeformedRect(dumpX2 - 0.4, -canopyW / 2, canopyX2 - dumpX2 + 0.4, canopyW, dumpColor);
    drawDeformedLine(canopyX2, -canopyW / 2, canopyX2, canopyW / 2, '#0f172a', 1.2);
    drawDeformedLine(dumpX2, -canopyW / 2, canopyX2, -canopyW / 2, '#0f172a', 1.0);
    drawDeformedLine(dumpX2, canopyW / 2, canopyX2, canopyW / 2, '#0f172a', 1.0);
    // Stamped longitudinal ribs on protective canopy
    [-canopyW * 0.30, -canopyW * 0.10, canopyW * 0.10, canopyW * 0.30].forEach(cy => {
      drawDeformedLine(dumpX2 + 0.4, cy, canopyX2 - 0.6, cy, 'rgba(0,0,0,0.28)', 0.9);
      drawDeformedLine(dumpX2 + 0.4, cy + 0.35, canopyX2 - 0.6, cy + 0.35, 'rgba(255,255,255,0.24)', 0.5);
    });

    // 3. Outer Tipper Body Shell & Inclined Side Box Ribs (Скошенный ковш КАМАЗ-5511 без заднего борта)
    drawDeformedRect(dumpX1, -halfDumpW, dumpL, dumpW, dumpColor);
    // Box-section top rail along left, front, and right sides
    drawDeformedRect(dumpX1, -halfDumpW, dumpL, 1.8, dumpColor);
    drawDeformedRect(dumpX1, halfDumpW - 1.8, dumpL, 1.8, dumpColor);
    drawDeformedLine(dumpX1, -halfDumpW, dumpX2, -halfDumpW, '#0f172a', 1.3);
    drawDeformedLine(dumpX1, halfDumpW, dumpX2, halfDumpW, '#0f172a', 1.3);
    drawDeformedLine(dumpX2, -halfDumpW, dumpX2, halfDumpW, '#0f172a', 1.4);
    drawDeformedLine(dumpX1 + 0.5, -halfDumpW + 0.6, dumpX2 - 0.5, -halfDumpW + 0.6, 'rgba(255,255,255,0.28)', 0.7);
    drawDeformedLine(dumpX1 + 0.5, halfDumpW - 0.6, dumpX2 - 0.5, halfDumpW - 0.6, 'rgba(255,255,255,0.28)', 0.7);

    // Heavy external box-section diagonal/vertical stiffening ribs along side walls
    const ribStep = Math.max(4.5, (dumpL - 5.0) / 5);
    for (let rx = dumpX1 + 3.5; rx <= dumpX2 - 2.5; rx += ribStep) {
      drawDeformedRect(rx - 0.9, -halfDumpW - 0.2, 1.8, 2.2, dumpColor);
      drawDeformedRect(rx - 0.9, -halfDumpW - 0.2, 1.8, 2.2, 'rgba(0,0,0,0.28)');
      drawDeformedLine(rx - 0.4, -halfDumpW, rx - 0.4, -halfDumpW + 2.0, 'rgba(255,255,255,0.25)', 0.6);

      drawDeformedRect(rx - 0.9, halfDumpW - 2.0, 1.8, 2.2, dumpColor);
      drawDeformedRect(rx - 0.9, halfDumpW - 2.0, 1.8, 2.2, 'rgba(0,0,0,0.28)');
      drawDeformedLine(rx - 0.4, halfDumpW - 2.0, rx - 0.4, halfDumpW, 'rgba(255,255,255,0.25)', 0.6);
    }

    // 4. Recessed Heavy Steel Bucket Interior with Exhaust-Heated Double Floor Channels
    const bedX1 = dumpX1 + 3.2;
    const bedX2 = dumpX2 - 1.8;
    const bedL = Math.max(8, bedX2 - bedX1);
    const bedW = dumpW - 4.4;
    const halfBedW = bedW / 2;

    drawDeformedRect(bedX1, -halfBedW, bedL, bedW, '#334155');
    drawDeformedRect(bedX1 + 1.2, -halfBedW + 1.2, bedL - 2.4, bedW - 2.4, '#1e293b');
    // Chute side slope shadows
    drawDeformedRect(bedX1, -halfBedW, bedL, 1.8, 'rgba(15, 23, 42, 0.55)');
    drawDeformedRect(bedX1, halfBedW - 1.8, bedL, 1.8, 'rgba(2, 6, 23, 0.65)');

    // Longitudinal wear bars & gravel scrape grooves
    [-halfBedW * 0.55, -halfBedW * 0.20, halfBedW * 0.20, halfBedW * 0.55].forEach(sy => {
      drawDeformedLine(bedX1 + 1.0, sy, bedX2 - 1.0, sy, '#0f172a', 1.2);
      drawDeformedLine(bedX1 + 1.5, sy + 0.35, bedX2 - 1.5, sy + 0.35, 'rgba(148, 163, 184, 0.35)', 0.6);
    });
    // Residual sand/gravel dust in front bulkhead corners
    drawDeformedRect(bedX2 - 2.2, -halfBedW + 0.6, 2.0, bedW - 1.2, 'rgba(180, 83, 9, 0.28)');

    // 5. Slanted Rear Scoop Discharge Apron (Вздернутый задний лоток без борта)
    drawDeformedRect(dumpX1, -halfDumpW + 0.8, 3.2, dumpW - 1.6, 'rgba(0, 0, 0, 0.25)');
    drawDeformedLine(dumpX1 + 3.2, -halfDumpW + 0.8, dumpX1 + 3.2, halfDumpW - 0.8, '#0f172a', 1.2);
    drawDeformedLine(dumpX1, -halfDumpW, dumpX1, halfDumpW, '#0f172a', 1.4);
  }

  // --- TRUCK ZIL-130 DUMP (ЗИЛ-ММЗ-555 / ММЗ-4502 САМОСВАЛ - PREMIUM TOP-DOWN TEXTURE) ---
  else if (effectiveType === 'truck_zil_dump') {
    const dumpColor = car.dumpColor || (resolvedTruck ? '#d97706' : (car.color || '#d97706'));
    const cabBackX = resolvedTruck ? resolvedTruck.cabRearX : (cabinX - cabinL / 2);
    const dumpX1 = resolvedTruck ? resolvedTruck.rearBodyX + 0.2 : (-halfL + rc + 1.0);
    const dumpX2 = cabBackX - 2.8;
    const dumpL = Math.max(12, dumpX2 - dumpX1);
    const dumpW = halfW * 2 - 1.0;
    const halfDumpW = dumpW / 2;

    // 1. Telescopic Hydraulic Hoist Ram in Chassis Gap behind Cab
    const cylX = cabBackX - 1.4;
    drawDeformedRect(cylX - 1.4, -2.5, 2.6, 5.0, '#1e293b');
    drawDeformedCircle(cylX - 0.1, 0, 1.6, '#cbd5e1', '#0f172a', 0.5);
    drawDeformedCircle(cylX - 0.1, 0, 0.8, '#f8fafc');
    drawDeformedLine(cylX - 0.1, -1.6, cylX - 1.0, -3.8, '#020617', 0.9);

    // 2. Iconic ZIL-MMZ-555 Semicircular Rounded "Boat/Trough" Dump Body (Кузов «лодочка» / «корыто»)
    drawDeformedRect(dumpX1 - 0.4, -halfDumpW - 0.4, dumpL + 0.8, dumpW + 0.8, 'rgba(2, 6, 23, 0.42)');

    // Front Protective Canopy Visor (Козырёк над гидроцилиндром)
    const visorFrontX = cabBackX + 1.2;
    const visorW = dumpW * 0.88;
    drawDeformedRect(dumpX2 - 0.3, -visorW / 2, visorFrontX - dumpX2 + 0.3, visorW, dumpColor);
    drawDeformedLine(visorFrontX, -visorW / 2, visorFrontX, visorW / 2, '#0f172a', 1.3);
    drawDeformedLine(dumpX2, -visorW / 2, visorFrontX, -visorW / 2, '#0f172a', 1.0);
    drawDeformedLine(dumpX2, visorW / 2, visorFrontX, visorW / 2, '#0f172a', 1.0);
    [-visorW * 0.22, 0, visorW * 0.22].forEach(vy => {
      drawDeformedLine(dumpX2 + 0.5, vy, visorFrontX - 0.6, vy, 'rgba(0,0,0,0.25)', 0.9);
      drawDeformedLine(dumpX2 + 0.5, vy + 0.35, visorFrontX - 0.6, vy + 0.35, 'rgba(255,255,255,0.25)', 0.5);
    });

    // Main Semicircular Dump Body Shell
    drawDeformedRect(dumpX1, -halfDumpW, dumpL, dumpW, dumpColor);

    // Thick Tubular Perimeter Box-Beam Top Rim
    drawDeformedLine(dumpX1, -halfDumpW, dumpX2, -halfDumpW, '#0f172a', 1.6);
    drawDeformedLine(dumpX1, -halfDumpW + 0.6, dumpX2, -halfDumpW + 0.6, 'rgba(255,255,255,0.28)', 0.7);
    drawDeformedLine(dumpX2, -halfDumpW, dumpX2, halfDumpW, '#0f172a', 1.6);
    drawDeformedLine(dumpX1, halfDumpW, dumpX2, halfDumpW, '#0f172a', 1.6);
    drawDeformedLine(dumpX1, halfDumpW - 0.6, dumpX2, halfDumpW - 0.6, 'rgba(255,255,255,0.28)', 0.7);
    drawDeformedLine(dumpX1, -halfDumpW, dumpX1, halfDumpW, '#0f172a', 1.6);

    // Curved External Stiffening Ribs on Flanks
    const ribStep = Math.max(4.2, (dumpL - 4.0) / 4);
    for (let rx = dumpX1 + 3.2; rx <= dumpX2 - 2.5; rx += ribStep) {
      drawDeformedRect(rx - 0.7, -halfDumpW, 1.4, 2.0, 'rgba(0,0,0,0.35)');
      drawDeformedLine(rx, -halfDumpW, rx, -halfDumpW + 2.0, 'rgba(255,255,255,0.25)', 0.6);
      drawDeformedRect(rx - 0.7, halfDumpW - 2.0, 1.4, 2.0, 'rgba(0,0,0,0.35)');
      drawDeformedLine(rx, halfDumpW - 2.0, rx, halfDumpW, 'rgba(255,255,255,0.25)', 0.6);
    }

    // 3. Scuffed Semicircular Steel Trough Interior
    const bedX1 = dumpX1 + 2.4;
    const bedX2 = dumpX2 - 1.6;
    const bedL = Math.max(7, bedX2 - bedX1);
    const bedW = dumpW - 4.4;
    const halfBedW = bedW / 2;

    drawDeformedRect(bedX1, -halfBedW, bedL, bedW, '#334155');
    drawDeformedRect(bedX1 + 1.0, -halfBedW + 1.2, bedL - 2.0, bedW - 2.4, '#475569');
    [-halfBedW * 0.32, 0, halfBedW * 0.32].forEach(gy => {
      drawDeformedLine(bedX1 + 1.2, gy, bedX2 - 1.2, gy, '#1e293b', 1.3);
      drawDeformedLine(bedX1 + 1.2, gy + 0.35, bedX2 - 1.2, gy + 0.35, 'rgba(255,255,255,0.22)', 0.6);
    });
    drawDeformedRect(bedX2 - 2.0, -halfBedW + 0.6, 1.8, bedW - 1.2, 'rgba(120, 53, 15, 0.32)');

    // 4. Top-Hinged Rear Tailgate & Discharge Lip (Задний откидной борт на верхних петлях)
    drawDeformedRect(dumpX1, -halfDumpW + 0.8, 2.4, dumpW - 1.6, 'rgba(0,0,0,0.28)');
    drawDeformedLine(dumpX1 + 2.4, -halfDumpW + 0.8, dumpX1 + 2.4, halfDumpW - 0.8, 'rgba(0,0,0,0.45)', 1.1);
    drawDeformedCircle(dumpX1 + 1.0, -halfDumpW + 1.3, 1.0, '#0f172a', '#cbd5e1', 0.4);
    drawDeformedCircle(dumpX1 + 1.0, halfDumpW - 1.3, 1.0, '#0f172a', '#cbd5e1', 0.4);
  }

  // --- TRUCK WATER (ПОЛИВОМОЕЧНЫЙ ВОДОВОЗ КО-829А / АЦПТ) ---
  else if (effectiveType === 'truck_water') {
    const hoodX2 = halfL - fc;
    const cabBackX = resolvedTruck ? resolvedTruck.cabRearX : (cabinX - cabinL / 2);

    // 1. Front Washing Nozzles (Поливомоечные сопла / «гусиные лапки» КО-829А под передним бампером)
    drawDeformedLine(hoodX2 - 1.8, -halfW * 0.68, hoodX2 + 0.6, -halfW * 0.82, '#1e293b', 2.2);
    drawDeformedRect(hoodX2 - 0.6, -halfW * 0.84, 1.4, 1.6, '#334155');
    drawDeformedLine(hoodX2 + 0.4, -halfW * 0.82, hoodX2 + 0.8, -halfW * 0.86, '#94a3b8', 1.6);

    drawDeformedLine(hoodX2 - 1.8, halfW * 0.68, hoodX2 + 0.6, halfW * 0.82, '#1e293b', 2.2);
    drawDeformedRect(hoodX2 - 0.6, halfW * 0.84 - 1.6, 1.4, 1.6, '#334155');
    drawDeformedLine(hoodX2 + 0.4, halfW * 0.82, hoodX2 + 0.8, halfW * 0.86, '#94a3b8', 1.6);

    // Realistic Downward-Angled High-Pressure Fan Spray & Ground Impact Curtain
    if (car.isWashingNozzlesActive && car.fluidTank && (car.fluidTank.currentVolume ?? car.fluidTank.currentAmount ?? 0) > 0) {
      ctx.save();
      const isEngineRunning = !!car.engineState?.engineRunning;
      const isPtoOn = !!car.isPtoActive;
      const isHighPressure = isEngineRunning && isPtoOn;
      const rpm = car.engineState?.engineRPM || 800;
      const rpmRatio = Math.min(1.0, Math.max(0, (rpm - 750) / 1850));
      const pressureFactor = isHighPressure ? (0.65 + rpmRatio * 0.55) : 0.15;

      const leftNozzleX = hoodX2 + 0.8;
      const leftNozzleY = -halfW * 0.86;
      const rightNozzleX = hoodX2 + 0.8;
      const rightNozzleY = halfW * 0.86;

      const timeNow = Date.now();
      const pulseL = Math.sin(timeNow * 0.024) * 1.5;
      const pulseR = Math.sin(timeNow * 0.024 + 1.2) * 1.5;

      if (isHighPressure) {
        const impactReach = 20 + pressureFactor * 10;
        const impX = leftNozzleX + impactReach;

        const fanOuterL = leftNozzleY - (14 + pressureFactor * 16) + pulseL;
        const fanInnerL = leftNozzleY + (3 + pressureFactor * 4);
        const fanOuterR = rightNozzleY + (14 + pressureFactor * 16) + pulseR;
        const fanInnerR = rightNozzleY - (3 + pressureFactor * 4);

        const gradL = ctx.createLinearGradient(leftNozzleX, leftNozzleY, impX, fanOuterL);
        gradL.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        gradL.addColorStop(0.25, 'rgba(224, 242, 254, 0.85)');
        gradL.addColorStop(0.70, 'rgba(56, 189, 248, 0.55)');
        gradL.addColorStop(1, 'rgba(186, 230, 253, 0.20)');

        ctx.fillStyle = gradL;
        ctx.beginPath();
        const [nlX, nlY] = deform(leftNozzleX, leftNozzleY);
        const [sp1X, sp1Y] = deform(impX + pulseL, fanOuterL);
        const [sp2X, sp2Y] = deform(impX - 3, fanInnerL);
        ctx.moveTo(nlX, nlY);
        ctx.lineTo(sp1X, sp1Y);
        ctx.lineTo(sp2X, sp2Y);
        ctx.closePath();
        ctx.fill();

        drawDeformedLine(leftNozzleX, leftNozzleY, impX + pulseL * 0.6, leftNozzleY - 7, 'rgba(255, 255, 255, 0.9)', 1.6);
        drawDeformedLine(leftNozzleX, leftNozzleY, impX - 1, leftNozzleY - 1, 'rgba(224, 242, 254, 0.8)', 1.2);
        drawDeformedLine(leftNozzleX, leftNozzleY, impX + pulseL, fanOuterL + 4, 'rgba(56, 189, 248, 0.7)', 1.3);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(sp1X, sp1Y);
        const [midLSpX, midLSpY] = deform(impX + 1.5, (fanOuterL + fanInnerL) / 2);
        ctx.quadraticCurveTo(midLSpX, midLSpY, sp2X, sp2Y);
        ctx.stroke();

        const gradR = ctx.createLinearGradient(rightNozzleX, rightNozzleY, impX, fanOuterR);
        gradR.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        gradR.addColorStop(0.25, 'rgba(224, 242, 254, 0.85)');
        gradR.addColorStop(0.70, 'rgba(56, 189, 248, 0.55)');
        gradR.addColorStop(1, 'rgba(186, 230, 253, 0.20)');

        ctx.fillStyle = gradR;
        ctx.beginPath();
        const [nrX, nrY] = deform(rightNozzleX, rightNozzleY);
        const [sp3X, sp3Y] = deform(impX - 3, fanInnerR);
        const [sp4X, sp4Y] = deform(impX + pulseR, fanOuterR);
        ctx.moveTo(nrX, nrY);
        ctx.lineTo(sp3X, sp3Y);
        ctx.lineTo(sp4X, sp4Y);
        ctx.closePath();
        ctx.fill();

        drawDeformedLine(rightNozzleX, rightNozzleY, impX + pulseR * 0.6, rightNozzleY + 7, 'rgba(255, 255, 255, 0.9)', 1.6);
        drawDeformedLine(rightNozzleX, rightNozzleY, impX - 1, rightNozzleY + 1, 'rgba(224, 242, 254, 0.8)', 1.2);
        drawDeformedLine(rightNozzleX, rightNozzleY, impX + pulseR, fanOuterR - 4, 'rgba(56, 189, 248, 0.7)', 1.3);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(sp3X, sp3Y);
        const [midRSpX, midRSpY] = deform(impX + 1.5, (fanOuterR + fanInnerR) / 2);
        ctx.quadraticCurveTo(midRSpX, midRSpY, sp4X, sp4Y);
        ctx.stroke();
      } else {
        drawDeformedLine(leftNozzleX, leftNozzleY, leftNozzleX + 5, leftNozzleY - 2, 'rgba(224, 242, 254, 0.7)', 1.2);
        drawDeformedLine(rightNozzleX, rightNozzleY, rightNozzleX + 5, rightNozzleY + 2, 'rgba(224, 242, 254, 0.7)', 1.2);
      }
      ctx.restore();
    }

    // 2. Centrifugal Water Pump Deck between Cab and Cistern (Насосный отсек КО-829А)
    const eqX2 = cabBackX - 0.8;
    const eqX1 = eqX2 - 5.2;
    const eqMidX = (eqX1 + eqX2) / 2;
    drawDeformedRect(eqX1, -halfW + 1.2, eqX2 - eqX1, halfW * 2 - 2.4, '#1e293b');
    drawDeformedRect(eqMidX - 1.6, -halfW * 0.42, 3.2, halfW * 0.84, '#334155');
    drawDeformedCircle(eqMidX, -halfW * 0.32, 1.3, '#d97706'); // Brass flange
    drawDeformedCircle(eqMidX - 0.4, 0, 1.5, '#0f172a', '#f8fafc', 0.4); // Pressure gauge
    drawDeformedCircle(eqMidX - 1.1, -halfW * 0.32, 1.3, '#dc2626'); // Red gate valve

    // Right flank water hose reel
    const reelX = eqMidX;
    const reelY = halfW * 0.72;
    const isHoseOut = !!car.fluidTank?.isWaterHoseDeployed;
    drawDeformedRect(reelX - 1.8, reelY - 2.0, 3.6, 4.0, '#0f172a');
    if (!isHoseOut) {
      drawDeformedCircle(reelX, reelY, 2.2, '#0f172a');
      drawDeformedCircle(reelX, reelY, 1.6, '#ea580c');
      drawDeformedCircle(reelX, reelY, 0.6, '#cbd5e1');
    } else {
      drawDeformedCircle(reelX, reelY, 1.1, '#475569');
    }

    // 3. Elliptical Bright Yellow Water Cistern (Бочка водовоза)
    const tankX2 = eqX1;
    const tankX1 = resolvedTruck ? resolvedTruck.rearBodyX + 0.5 : (-halfL + rc + 1.0);
    const tankL = Math.max(12, tankX2 - tankX1);
    const tankW = halfW * 2 - 1.8;

    const tankGrad = ctx.createLinearGradient(0, -tankW / 2, 0, tankW / 2);
    tankGrad.addColorStop(0, '#ca8a04');
    tankGrad.addColorStop(0.18, '#fef08a');
    tankGrad.addColorStop(0.5, '#eab308');
    tankGrad.addColorStop(0.82, '#ca8a04');
    tankGrad.addColorStop(1, '#854d0e');

    drawDeformedRect(tankX1, -tankW / 2, tankL, tankW, tankGrad);
    drawDeformedLine(tankX1, -tankW / 2, tankX2, -tankW / 2, '#854d0e', 1.1);
    drawDeformedLine(tankX2, -tankW / 2, tankX2, tankW / 2, '#854d0e', 1.2);
    drawDeformedLine(tankX2, tankW / 2, tankX1, tankW / 2, '#854d0e', 1.1);
    drawDeformedLine(tankX1, tankW / 2, tankX1, -tankW / 2, '#854d0e', 1.2);

    // Blue communal service stripe along barrel sides ("ВОДА / КОММУНАЛЬНАЯ")
    drawDeformedRect(tankX1 + 0.8, -tankW / 2 + 1.2, tankL - 1.6, 1.5, '#0284c7');
    drawDeformedRect(tankX1 + 0.8, tankW / 2 - 2.7, tankL - 1.6, 1.5, '#0284c7');

    // Steel retention cradle bands with tension bolts
    [0.22, 0.50, 0.78].forEach(frac => {
      const bx = tankX1 + tankL * frac;
      drawDeformedRect(bx - 0.9, -tankW / 2 - 0.3, 1.8, tankW + 0.6, '#0f172a');
      drawDeformedCircle(bx, -tankW / 2 - 0.3, 0.65, '#f8fafc');
      drawDeformedCircle(bx, tankW / 2 + 0.3, 0.65, '#f8fafc');
    });

    // Top Mesh Catwalk, Manhole Hatch & Rear Ladder
    drawDeformedRect(tankX1 + 2.5, -2.4, tankL - 5.0, 4.8, '#334155');
    drawDeformedRect(tankX1 + 3.0, -1.9, tankL - 6.0, 3.8, '#475569');
    const hatchX = tankX1 + tankL * 0.5;
    drawDeformedCircle(hatchX, 0, 2.8, '#1e293b');
    drawDeformedCircle(hatchX, 0, 1.8, '#cbd5e1');
    drawDeformedCircle(hatchX, 0, 0.8, '#dc2626');

    // Cylindrical Side Suction Hose Canisters
    drawDeformedRect(tankX1 + 1.0, -halfW + 0.1, tankL - 2.0, 1.4, '#334155');
    drawDeformedRect(tankX1 + 1.0, halfW - 1.5, tankL - 2.0, 1.4, '#334155');

    // Rear gravity sprinkler bar
    drawDeformedRect(tankX1 - 1.6, -3.2, 1.6, 6.4, '#334155');
    drawDeformedCircle(tankX1 - 1.2, 0, 1.4, '#0284c7');
  }

  // --- TRUCK BOOM CRANE (АВТОКРАН СТРЕЛОВОЙ КС-3577 / КС-45717 «ИВАНОВЕЦ» 16–25 т) ---
  else if (effectiveType === 'truck_crane') {
    const cabBackX = resolvedTruck ? resolvedTruck.cabRearX : (cabinX - cabinL / 2);
    const bodyX1 = resolvedTruck ? resolvedTruck.rearBodyX + 0.5 : (-halfL + rc + 1.4);
    const bodyX2 = cabBackX - 0.8;
    const bodyLen = Math.max(16, bodyX2 - bodyX1);
    const bodyW = halfW * 2 - 1.2;

    // 1. Fixed Support Subframe & Diamond-Plate Decking (Неповоротная опорная рама автокрана)
    drawDeformedRect(bodyX1, -bodyW / 2, bodyLen, bodyW, '#1e293b');
    drawDeformedRect(bodyX1 + 0.8, -bodyW / 2 + 1.4, bodyLen - 1.6, bodyW - 2.8, '#334155');
    drawDeformedRect(bodyX1 + 1.6, -bodyW / 2 + 2.2, bodyLen - 3.2, bodyW - 4.4, '#475569');
    for (let px = bodyX1 + 2.8; px < bodyX2 - 2.0; px += 3.0) {
      drawDeformedLine(px, -bodyW / 2 + 2.3, px, bodyW / 2 - 2.3, '#334155', 0.6);
    }
    // Side rigging toolboxes & wooden outrigger dunnage pads (ящики стропальщика и деревянные подкладки)
    const midDeckX = bodyX1 + bodyLen * 0.48;
    drawDeformedRect(midDeckX - 4.5, -bodyW / 2 + 0.3, 9.0, 1.6, '#0f172a');
    drawDeformedRect(midDeckX - 4.0, -bodyW / 2 + 0.5, 8.0, 1.2, '#64748b');
    drawDeformedRect(midDeckX - 4.5, bodyW / 2 - 1.9, 9.0, 1.6, '#78350f'); // Wooden dunnage blocks stack
    drawDeformedLine(midDeckX - 4.3, bodyW / 2 - 1.1, midDeckX + 4.3, bodyW / 2 - 1.1, '#451a03', 0.55);

    // 2. Four Hydraulic Outriggers (4 гидравлические выносные опоры с анимацией выдвижения и подпятниками)
    const extOut = Math.max(0, Math.min(1, car.craneOutriggerExt ?? (car.craneOutriggersDeployed ? 1.0 : 0.0)));
    const outriggerReach = extOut * 7.4;
    const outriggerXs = [bodyX1 + 3.4, bodyX2 - 3.8];

    outriggerXs.forEach((ox) => {
      // Crossbeam housing across frame
      drawDeformedRect(ox - 1.8, -bodyW / 2 - 1.0, 3.6, bodyW + 2.0, '#0f172a');

      // Left sliding/swinging outrigger beam
      const leftPadY = -bodyW / 2 - 1.2 - outriggerReach;
      drawDeformedRect(ox - 1.3, leftPadY, 2.6, outriggerReach + 1.6, '#facc15');
      // Black hazard stripes on left outrigger beam
      for (let sy = leftPadY + 0.6; sy < -bodyW / 2; sy += 2.0) {
        drawDeformedLine(ox - 1.2, sy, ox + 1.2, sy + 0.9, '#0f172a', 0.9);
      }
      // Round steel ground pad (подпятник) & vertical hydraulic jack cylinder
      if (extOut > 0.08) {
        drawDeformedCircle(ox, leftPadY + 0.4, 2.2, '#334155', '#94a3b8', 0.7);
      }
      drawDeformedCircle(ox, leftPadY + 0.6, 1.15, '#0f172a', '#cbd5e1', 0.6);

      // Right sliding/swinging outrigger beam
      const rightPadY = bodyW / 2 + 1.2 + outriggerReach;
      drawDeformedRect(ox - 1.3, bodyW / 2 - 0.4, 2.6, outriggerReach + 1.6, '#facc15');
      for (let sy = bodyW / 2 + 0.4; sy < rightPadY - 0.4; sy += 2.0) {
        drawDeformedLine(ox - 1.2, sy, ox + 1.2, sy + 0.9, '#0f172a', 0.9);
      }
      if (extOut > 0.08) {
        drawDeformedCircle(ox, rightPadY - 0.4, 2.2, '#334155', '#94a3b8', 0.7);
      }
      drawDeformedCircle(ox, rightPadY - 0.6, 1.15, '#0f172a', '#cbd5e1', 0.6);
    });

    // 3. Front Boom Rest Trestle ("Козлы" — стойка поддержки стрелы за кабиной)
    const trestleX = bodyX2 - 2.4;
    drawDeformedRect(trestleX - 1.1, -4.6, 2.2, 9.2, '#0f172a');
    drawDeformedRect(trestleX - 0.7, -3.2, 1.4, 6.4, '#f59e0b');

    // 4. Revolving 360° Turntable Bearing Ring (Опорно-поворотное устройство ОПУ-1400)
    const turretX = -halfL + Math.max(12.5, car.length * 0.25);
    drawDeformedCircle(turretX, 0, 6.8, '#0f172a', '#475569', 0.9);
    drawDeformedCircle(turretX, 0, 5.4, '#1e293b', '#64748b', 0.6);

    // Helper functions to draw components on the rotating crane turret in vehicle-deformed space
    const turretAngle = car.craneTurretAngle ?? 0;
    const cosT = Math.cos(turretAngle);
    const sinT = Math.sin(turretAngle);
    const toVeh = (tx: number, ty: number): [number, number] => [
      turretX + tx * cosT - ty * sinT,
      tx * sinT + ty * cosT,
    ];
    const drawTurretPoly = (pts: [number, number][], fill: string, stroke?: string, lw = 0.8) => {
      if (pts.length < 3) return;
      ctx.beginPath();
      const [vx0, vy0] = toVeh(pts[0][0], pts[0][1]);
      const [dx0, dy0] = deform(vx0, vy0);
      ctx.moveTo(dx0, dy0);
      for (let i = 1; i < pts.length; i++) {
        const [vxi, vyi] = toVeh(pts[i][0], pts[i][1]);
        const [dxi, dyi] = deform(vxi, vyi);
        ctx.lineTo(dxi, dyi);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lw;
        ctx.stroke();
      }
    };
    const drawTurretRect = (tx: number, ty: number, w: number, h: number, fill: string, stroke?: string, lw = 0.8) => {
      drawTurretPoly(
        [
          [tx, ty],
          [tx + w, ty],
          [tx + w, ty + h],
          [tx, ty + h],
        ],
        fill,
        stroke,
        lw
      );
    };
    const drawTurretLine = (tx1: number, ty1: number, tx2: number, ty2: number, stroke: string, lw = 1.0) => {
      const [vx1, vy1] = toVeh(tx1, ty1);
      const [vx2, vy2] = toVeh(tx2, ty2);
      drawDeformedLine(vx1, vy1, vx2, vy2, stroke, lw);
    };
    const drawTurretCircle = (tx: number, ty: number, r: number, fill: string, stroke?: string, lw = 0.8) => {
      const [vx, vy] = toVeh(tx, ty);
      drawDeformedCircle(vx, vy, r, fill, stroke, lw);
    };

    // 5. Revolving Turret Frame, 2.6t Counterweight & Winch Machinery Housing (Поворотная рама, противовес и лебёдка)
    // Rear cast-iron counterweight slab (-9.6 to -5.4) with black/yellow GOST hazard stripes
    drawTurretRect(-9.6, -5.8, 4.2, 11.6, '#eab308', '#0f172a', 1.0);
    for (let cy = -5.0; cy <= 4.5; cy += 2.2) {
      drawTurretLine(-9.4, cy, -7.8, cy + 1.2, '#0f172a', 1.1);
    }
    // Central revolving machinery frame (-5.4 to +3.6)
    drawTurretRect(-5.4, -3.4, 9.0, 8.6, '#ca8a04', '#1e293b', 0.9);
    // Right-side hydraulic oil tank & engine/valve hood
    drawTurretRect(-4.6, 2.2, 7.2, 2.8, '#d97706', '#0f172a', 0.7);
    drawTurretCircle(-1.2, 3.6, 0.65, '#0f172a', '#cbd5e1', 0.4); // Oil filler cap
    // Main cargo winch drum (грузовая лебёдка с тросом) in rear-center of turret
    drawTurretRect(-4.8, -2.2, 3.2, 4.0, '#0f172a');
    drawTurretRect(-4.4, -1.8, 2.4, 3.2, '#475569');
    for (let wy = -1.5; wy <= 1.2; wy += 0.55) {
      drawTurretLine(-4.3, wy, -2.1, wy, '#94a3b8', 0.45);
    }

    // 6. Crane Operator Cabin ("Скворечник" — кабина крановщика КС-3577 слева от стрелы)
    drawTurretRect(-3.6, -8.8, 8.8, 5.0, '#eab308', '#0f172a', 0.95);
    // Dark roof & panoramic slanted front/top skylight glazing
    drawTurretRect(1.8, -8.4, 3.1, 4.2, '#0f172a');
    drawTurretRect(2.1, -8.1, 2.5, 3.6, 'rgba(56, 189, 248, 0.42)', '#38bdf8', 0.5);
    // Operator seat & dual control levers visible inside cabin
    drawTurretRect(0.2, -7.4, 1.8, 2.2, '#1e293b');
    drawTurretCircle(2.6, -7.2, 0.35, '#0f172a');
    drawTurretCircle(2.6, -5.4, 0.35, '#0f172a');
    // Wiper blade on front glass & work spotlight on cabin front corner
    drawTurretLine(4.6, -6.3, 3.0, -7.3, '#0f172a', 0.55);
    drawTurretCircle(4.8, -8.2, 0.65, '#fef08a', '#0f172a', 0.5);

    // 7. 3-Section Telescopic Box Boom (Трёхсекционная телескопическая стрела 9.0–21.7 м)
    const ext = Math.max(0, Math.min(1, car.craneBoomExtension ?? 0));
    const elev = Math.max(0, Math.min(1, car.craneBoomElevation ?? 0.2));
    const elevProj = 1.0 - elev * 0.14;
    const baseBoomL = Math.max(25, halfL - turretX - 3.5) * elevProj;
    const sec2ExtL = ext * 20.0 * elevProj;
    const sec3ExtL = ext * 20.0 * elevProj;

    const rootStartX = -4.2;
    const sec1EndX = rootStartX + baseBoomL;
    const sec2EndX = sec1EndX + sec2ExtL;
    const sec3EndX = sec2EndX + sec3ExtL;

    // Hydraulic boom elevation (luffing) cylinder & chrome rod beneath/front of root section
    drawTurretRect(0.5, -1.3, 8.5, 2.6, '#334155', '#0f172a', 0.6);
    drawTurretRect(9.0, -0.85, 4.5 + elev * 4.5, 1.7, '#e2e8f0', '#64748b', 0.4);

    // Section 3 (Innermost telescopic section)
    if (sec3ExtL > 0.2) {
      drawTurretRect(sec2EndX - 2.0, -1.4, sec3ExtL + 2.0, 2.8, '#fde047', '#0f172a', 0.8);
      drawTurretLine(sec2EndX, 0, sec3EndX - 1.5, 0, 'rgba(202, 138, 4, 0.55)', 0.6);
    }

    // Section 2 (Middle telescopic section)
    if (sec2ExtL > 0.2) {
      drawTurretRect(sec1EndX - 2.2, -1.85, sec2ExtL + 2.2, 3.7, '#facc15', '#0f172a', 0.85);
      // Black grease slide pads at collar
      drawTurretRect(sec2EndX - 1.2, -1.95, 1.2, 3.9, '#1e293b');
      drawTurretLine(sec1EndX, 0, sec2EndX - 1.2, 0, 'rgba(161, 98, 7, 0.55)', 0.7);
    }

    // Section 1 (Main root box boom section with ONK-140 cable drum & pivot cheek plates)
    drawTurretRect(rootStartX, -2.35, baseBoomL, 4.7, '#eab308', '#0f172a', 1.0);
    // Longitudinal chamfer weld ribs along the box boom
    drawTurretLine(rootStartX + 1.5, -1.5, sec1EndX - 1.4, -1.5, '#ca8a04', 0.75);
    drawTurretLine(rootStartX + 1.5, 1.5, sec1EndX - 1.4, 1.5, '#ca8a04', 0.75);
    // Front collar of root section
    drawTurretRect(sec1EndX - 1.5, -2.5, 1.5, 5.0, '#1e293b');
    // Root pivot pin & ONK-140 load limiter cable reel on left side of boom
    drawTurretCircle(rootStartX + 1.2, 0, 1.6, '#334155', '#0f172a', 0.7);
    drawTurretCircle(rootStartX + 6.5, -2.7, 1.3, '#dc2626', '#0f172a', 0.5);
    // Twin wire-rope elevation cables running from winch to boom tip
    drawTurretLine(-3.2, -0.5, sec3EndX, -0.5, '#cbd5e1', 0.55);
    drawTurretLine(-3.2, 0.5, sec3EndX, 0.5, '#cbd5e1', 0.55);

    // 8. Boom Head Pulley Sheave Assembly & Hanging Hook Block (Оголовок стрелы и крюковая подвеска)
    const headX = sec3EndX;
    drawTurretRect(headX - 1.6, -2.1, 3.0, 4.2, '#dc2626', '#0f172a', 0.85);
    drawTurretRect(headX - 0.6, -1.4, 2.2, 2.8, '#facc15', '#0f172a', 0.6);
    drawTurretCircle(headX + 0.8, 0, 1.1, '#475569', '#0f172a', 0.6); // Upper pulley sheave

    // Hanging 3-sheave hook block (крюковая обойма на полиспасте)
    const hookH = Math.max(0, Math.min(1, car.craneHookHeight ?? 0.65));
    const cableDropPx = (1.0 - hookH) * 8.5 + 1.8;
    const hookTx = headX + 1.4 + cableDropPx * 0.35;
    const hookTy = cableDropPx * 0.45;
    // Multi-part wire rope falls between boom head and hook block
    drawTurretLine(headX + 0.9, -0.7, hookTx, hookTy - 0.6, '#94a3b8', 0.65);
    drawTurretLine(headX + 0.9, 0.0, hookTx, hookTy, '#cbd5e1', 0.75);
    drawTurretLine(headX + 0.9, 0.7, hookTx, hookTy + 0.6, '#94a3b8', 0.65);
    // Hook block body with hazard stripes & forged steel hook
    drawTurretCircle(hookTx, hookTy, 1.85, '#facc15', '#0f172a', 0.85);
    drawTurretCircle(hookTx, hookTy, 0.85, '#dc2626');
  }

  // --- VACUUM SEWAGE TRUCK KO-503V / ANM-53 (ВАКУУМНАЯ АССЕНИЗАТОРСКАЯ МАШИНА КО-503В-2 / АНМ-53, 4.2 м³) ---
  else if (effectiveType === 'truck_vacuum_ko503') {
    const cabBackX = resolvedTruck ? resolvedTruck.cabRearX : (cabinX - cabinL / 2);
    const bodyX1 = resolvedTruck ? resolvedTruck.rearBodyX + 0.5 : (-halfL + rc + 1.2);
    const bodyX2 = cabBackX - 0.8;

    // 1. Front Vacuum Pump & Moisture Separator Deck behind Cab (Отсек вакуумного насоса КО-503 и 4-ходового крана)
    const eqX2 = bodyX2;
    const eqX1 = eqX2 - 5.4;
    const eqMidX = (eqX1 + eqX2) / 2;
    drawDeformedRect(eqX1, -halfW + 1.2, eqX2 - eqX1, halfW * 2 - 2.4, '#1e293b');
    // Left-mounted rotary-vane vacuum pump KO-503 with cooling fins
    drawDeformedRect(eqMidX - 2.1, -halfW + 1.6, 4.2, 5.2, '#0f172a');
    for (let fi = -1.5; fi <= 1.5; fi += 0.75) {
      drawDeformedLine(eqMidX + fi, -halfW + 1.9, eqMidX + fi, -halfW + 6.4, '#475569', 0.55);
    }
    // Cylindrical moisture/oil separator dome & muffler on right side of pump bay
    drawDeformedCircle(eqMidX + 0.4, 1.8, 1.7, '#334155', '#0f172a', 0.7);
    drawDeformedCircle(eqMidX - 1.2, 4.6, 1.2, '#475569', '#0f172a', 0.6);
    // 4-Way Valve Control Lever (Четырёхходовой кран: Всасывание / Нагнетание)
    const isSuctionMode = (car.fluidTank?.vacuumPumpMode ?? 'suction') === 'suction';
    drawDeformedLine(
      eqMidX + 0.4,
      -1.2,
      eqMidX + (isSuctionMode ? 2.2 : -1.4),
      -3.4,
      '#cbd5e1',
      0.9
    );
    drawDeformedCircle(eqMidX + (isSuctionMode ? 2.2 : -1.4), -3.4, 0.65, isSuctionMode ? '#22c55e' : '#f59e0b');
    // Round Vacuum Gauge (Вакуумметр)
    drawDeformedCircle(eqMidX - 0.8, -halfW + 2.4, 1.45, '#0f172a');
    drawDeformedCircle(eqMidX - 0.8, -halfW + 2.4, 1.05, '#f8fafc');
    drawDeformedLine(eqMidX - 0.8, -halfW + 2.4, eqMidX - 1.4, -halfW + 2.0, '#dc2626', 0.55);

    // 2. Main Inclined Cylindrical Vacuum Cistern (Голубая вакуумная цистерна Горводоканала с наклонной посадкой)
    const tankFront = eqX1 - 0.4;
    const tankRear = bodyX1 + 2.2;
    const tankX = (tankFront + tankRear) / 2;
    const tankL = Math.max(12, tankFront - tankRear);
    const tankW = halfW * 2 - 2.4;

    const ko503Grad = ctx.createLinearGradient(0, -tankW / 2, 0, tankW / 2);
    ko503Grad.addColorStop(0, '#0c4a6e');
    ko503Grad.addColorStop(0.2, '#38bdf8');
    ko503Grad.addColorStop(0.5, '#0284c7');
    ko503Grad.addColorStop(0.82, '#0369a1');
    ko503Grad.addColorStop(1, '#082f49');

    drawDeformedRect(tankRear, -tankW / 2, tankL, tankW, ko503Grad);
    // Hemispherical front & rear dome caps
    {
      const [fTopX, fTopY] = deform(tankFront, -tankW / 2);
      const [fMidX, fMidY] = deform(tankFront + 2.2, 0);
      const [fBotX, fBotY] = deform(tankFront, tankW / 2);
      ctx.fillStyle = ko503Grad;
      ctx.beginPath();
      ctx.moveTo(fTopX, fTopY);
      ctx.quadraticCurveTo(fMidX, fMidY, fBotX, fBotY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#082f49';
      ctx.lineWidth = 1.1;
      ctx.stroke();

      const [rTopX, rTopY] = deform(tankRear, -tankW / 2);
      const [rMidX, rMidY] = deform(tankRear - 2.4, 0);
      const [rBotX, rBotY] = deform(tankRear, tankW / 2);
      ctx.fillStyle = ko503Grad;
      ctx.beginPath();
      ctx.moveTo(rTopX, rTopY);
      ctx.quadraticCurveTo(rMidX, rMidY, rBotX, rBotY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#082f49';
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
    drawDeformedLine(tankRear, -tankW / 2, tankFront, -tankW / 2, '#082f49', 1.1);
    drawDeformedLine(tankRear, tankW / 2, tankFront, tankW / 2, '#082f49', 1.1);

    // White & orange municipal contrast stripes along tank flanks ("ВАКУУМНАЯ")
    drawDeformedRect(tankRear + 0.8, -tankW / 2 + 1.0, tankL - 1.6, 1.2, '#f8fafc');
    drawDeformedRect(tankRear + 0.8, -tankW / 2 + 2.2, tankL - 1.6, 0.7, '#f97316');
    drawDeformedRect(tankRear + 0.8, tankW / 2 - 2.2, tankL - 1.6, 1.2, '#f8fafc');
    drawDeformedRect(tankRear + 0.8, tankW / 2 - 2.9, tankL - 1.6, 0.7, '#f97316');

    // 2 external steel stiffening rings (шпангоуты жёсткости)
    [0.32, 0.68].forEach((frac) => {
      const rx = tankRear + tankL * frac;
      drawDeformedRect(rx - 0.65, -tankW / 2 - 0.35, 1.3, tankW + 0.7, '#0f172a');
      drawDeformedLine(rx, -tankW / 2 - 0.3, rx, tankW / 2 + 0.3, '#38bdf8', 0.5);
    });

    // 3. Top SPU Float Valve Dome, Air Suction Pipe & Level Sight Glass (Горловина СПУ и смотровое окно)
    const spuX = tankFront - tankL * 0.24;
    drawDeformedCircle(spuX, 0, 3.1, '#0f172a', '#475569', 0.8);
    drawDeformedCircle(spuX, 0, 2.0, '#0284c7');
    drawDeformedCircle(spuX, 0, 0.9, '#f59e0b'); // Brass float cutoff valve cap
    // Steel air suction pipeline connecting vacuum pump to SPU dome
    drawDeformedLine(eqMidX, 0.2, spuX, 0.2, '#64748b', 1.7);
    drawDeformedLine(eqMidX, 0.2, eqMidX, -halfW + 3.8, '#475569', 1.6);
    // Illuminated spherical level sight glass on rear top of tank
    const fillRatio = car.fluidTank ? (car.fluidTank.currentVolume / Math.max(1, car.fluidTank.capacity)) : 0.3;
    const sightX = tankRear + tankL * 0.22;
    drawDeformedCircle(sightX, 0, 1.6, '#0f172a', '#cbd5e1', 0.6);
    drawDeformedCircle(sightX, 0, 1.0, fillRatio > 0.85 ? '#ef4444' : (fillRatio > 0.1 ? '#38bdf8' : '#334155'));

    // 4. Side Galvanized Hose Carrier Trays & Corrugated d=100mm Suction Hoses (Боковые пеналы с гофрорукавами)
    const isHoseOut = !!car.fluidTank?.isWaterHoseDeployed;
    const trayW = 2.3;
    // Left tray
    drawDeformedRect(tankRear + 0.6, -tankW / 2 - trayW + 0.2, tankL - 1.2, trayW, '#334155');
    if (!isHoseOut) {
      drawDeformedLine(tankRear + 1.4, -tankW / 2 - trayW / 2, tankFront - 1.4, -tankW / 2 - trayW / 2, '#09090b', 2.1);
      for (let hx = tankRear + 1.8; hx <= tankFront - 1.8; hx += 1.5) {
        drawDeformedLine(hx, -tankW / 2 - trayW + 0.3, hx, -tankW / 2 - 0.1, '#94a3b8', 0.6);
      }
    }
    // Right tray (reserve extension hose)
    drawDeformedRect(tankRear + 0.6, tankW / 2 - 0.2, tankL - 1.2, trayW, '#334155');
    drawDeformedLine(tankRear + 1.4, tankW / 2 + trayW / 2, tankFront - 1.4, tankW / 2 + trayW / 2, '#09090b', 2.1);
    for (let hx = tankRear + 1.8; hx <= tankFront - 1.8; hx += 1.5) {
      drawDeformedLine(hx, tankW / 2 + 0.1, hx, tankW / 2 + trayW - 0.3, '#94a3b8', 0.6);
    }

    // 5. Rear ANM-53 Slide Gate Valve & Brass Receiving Snout (Шиберная задвижка АНМ-53 в заднем днище)
    const flangeX = tankRear - 2.0;
    drawDeformedRect(flangeX, -2.6, 0.8, 5.2, '#334155');
    drawDeformedRect(flangeX - 1.6, -1.5, 1.6, 3.0, '#1e293b');
    drawDeformedLine(flangeX - 0.8, -0.8, flangeX + 1.8, -3.8, '#475569', 1.1);
    drawDeformedCircle(flangeX + 1.8, -3.8, 0.65, '#dc2626'); // Red slide gate handle knob
    drawDeformedRect(flangeX - 3.0, -0.85, 1.4, 1.7, '#b45309'); // Brass receiving snout
    drawDeformedCircle(flangeX - 3.1, 0, 0.95, isHoseOut ? '#94a3b8' : '#d97706');
  }

  // --- HEAVY SLUDGE VACUUM TRUCK KO-505A (ТЯЖЁЛЫЙ ИЛОСОС КО-505А / КО-507А СО СТРЕЛОЙ, 10 м³) ---
  else if (effectiveType === 'truck_vacuum_ko505') {
    const cabBackX = resolvedTruck ? resolvedTruck.cabRearX : (cabinX - cabinL / 2);
    const bodyX1 = resolvedTruck ? resolvedTruck.rearBodyX + 0.5 : (-halfL + rc + 1.2);
    const bodyX2 = cabBackX - 0.8;

    // 1. VK-6M2 High-Capacity Vacuum Pump & Hydraulic Power Bay behind Cab
    const pumpBayX2 = bodyX2;
    const pumpBayX1 = pumpBayX2 - 6.6;
    const pumpMidX = (pumpBayX1 + pumpBayX2) / 2;
    drawDeformedRect(pumpBayX1, -halfW + 1.0, pumpBayX2 - pumpBayX1, halfW * 2 - 2.0, '#1e293b');
    // Left VK-6M2 liquid-ring vacuum pump & vertical exhaust silencer stack
    drawDeformedRect(pumpBayX1 + 0.6, -halfW + 1.4, 5.2, 6.2, '#334155');
    drawDeformedCircle(pumpMidX - 0.6, -halfW + 3.2, 1.6, '#0f172a', '#94a3b8', 0.6); // Silencer stack
    // Right hydraulic oil tank & control cabinet with dual vacuum/pressure gauges
    drawDeformedRect(pumpBayX1 + 0.6, 0.8, 5.2, halfW - 2.2, '#0f172a');
    drawDeformedCircle(pumpMidX - 1.0, halfW - 2.6, 1.2, '#f8fafc', '#0f172a', 0.5);
    drawDeformedCircle(pumpMidX + 1.0, halfW - 2.6, 1.2, '#f8fafc', '#0f172a', 0.5);

    // 2. Heavy-Wall 10 m³ Cylindrical Sludge Cistern with 4 External Box Stiffening Rings
    const tankFront = pumpBayX1 - 0.4;
    const tankRear = bodyX1 + 2.4;
    const tankL = Math.max(14, tankFront - tankRear);
    const tankW = halfW * 2 - 1.8;

    const ko505Grad = ctx.createLinearGradient(0, -tankW / 2, 0, tankW / 2);
    ko505Grad.addColorStop(0, '#7c2d12');
    ko505Grad.addColorStop(0.2, '#fb923c');
    ko505Grad.addColorStop(0.5, '#ea580c');
    ko505Grad.addColorStop(0.82, '#c2410c');
    ko505Grad.addColorStop(1, '#431407');

    drawDeformedRect(tankRear, -tankW / 2, tankL, tankW, ko505Grad);
    // Hinged full-bore rear dish door (Откидное заднее днище илососа на верхних шарнирах и гидроцилиндрах)
    {
      const [rTopX, rTopY] = deform(tankRear, -tankW / 2);
      const [rMidX, rMidY] = deform(tankRear - 2.8, 0);
      const [rBotX, rBotY] = deform(tankRear, tankW / 2);
      ctx.fillStyle = ko505Grad;
      ctx.beginPath();
      ctx.moveTo(rTopX, rTopY);
      ctx.quadraticCurveTo(rMidX, rMidY, rBotX, rBotY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
    // 4 heavy external box-section stiffening rings (4 мощных внешних шпангоута жёсткости КО-505А)
    [0.18, 0.40, 0.62, 0.84].forEach((frac) => {
      const rx = tankRear + tankL * frac;
      drawDeformedRect(rx - 0.85, -tankW / 2 - 0.5, 1.7, tankW + 1.0, '#1e293b');
      drawDeformedLine(rx, -tankW / 2 - 0.4, rx, tankW / 2 + 0.4, '#fdba74', 0.6);
    });
    // White GOST side stripes along barrel
    drawDeformedRect(tankRear + 0.8, -tankW / 2 + 1.1, tankL - 1.6, 1.15, '#f8fafc');
    drawDeformedRect(tankRear + 0.8, tankW / 2 - 2.25, tankL - 1.6, 1.15, '#f8fafc');

    // Twin hydraulic cylinders on rear flanks for opening the rear sludge door + 2 rear acrylic sight glasses
    drawDeformedRect(tankRear - 0.4, -tankW / 2 - 0.6, 5.8, 1.0, '#cbd5e1');
    drawDeformedRect(tankRear - 0.4, tankW / 2 - 0.4, 5.8, 1.0, '#cbd5e1');
    drawDeformedCircle(tankRear - 1.2, -2.4, 1.05, '#0f172a', '#cbd5e1', 0.5); // Sight glass 1
    drawDeformedCircle(tankRear - 1.5, 2.4, 1.05, '#0f172a', '#cbd5e1', 0.5);  // Sight glass 2

    // 3. Top Revolving Hydraulic Suction Boom (Поворотная гидравлическая всасывающая стрела КО-505 на крыше цистерны)
    const boomTurretX = tankFront - tankL * 0.30;
    drawDeformedCircle(boomTurretX, 0, 3.6, '#0f172a', '#475569', 0.85);
    drawDeformedCircle(boomTurretX, 0, 2.2, '#334155');
    // Slewing steel suction boom arm extending rearward with corrugated d=100mm suction pipe
    const boomTipX = tankRear - 1.8;
    drawDeformedRect(boomTipX, -1.35, boomTurretX - boomTipX + 1.2, 2.7, '#1e293b');
    drawDeformedRect(boomTipX + 0.6, -0.85, boomTurretX - boomTipX, 1.7, '#facc15');
    // Thick corrugated hose routed along the top boom
    drawDeformedLine(boomTipX - 0.6, 0, boomTurretX, 0, '#09090b', 2.2);
    for (let hx = boomTipX; hx < boomTurretX - 1.0; hx += 1.5) {
      drawDeformedLine(hx, -1.1, hx, 1.1, '#94a3b8', 0.6);
    }

    // 4. Side Hose Cassette Trays & Rear Gate Valve Snout
    const isHoseOut = !!car.fluidTank?.isWaterHoseDeployed;
    drawDeformedRect(tankRear + 0.5, -halfW + 0.05, tankL - 1.0, 2.0, '#334155');
    drawDeformedRect(tankRear + 0.5, halfW - 2.05, tankL - 1.0, 2.0, '#334155');
    if (!isHoseOut) {
      drawDeformedLine(tankRear + 1.2, -halfW + 1.0, tankFront - 1.2, -halfW + 1.0, '#09090b', 1.9);
    }
    drawDeformedLine(tankRear + 1.2, halfW - 1.0, tankFront - 1.2, halfW - 1.0, '#09090b', 1.9);
    // Rear bottom suction/discharge gate valve & brass snout
    drawDeformedRect(tankRear - 3.6, -1.4, 1.8, 2.8, '#1e293b');
    drawDeformedRect(tankRear - 4.8, -0.95, 1.2, 1.9, '#b45309');
  }

  // --- COMBINED SEWER JETTER & VACUUM TRUCK KO-560 (КОМБИНИРОВАННАЯ КАНАЛОПРОМЫВОЧНАЯ И ВАКУУМНАЯ МАШИНА КО-560, 6.5 м³) ---
  else if (effectiveType === 'truck_vacuum_ko560') {
    const cabBackX = resolvedTruck ? resolvedTruck.cabRearX : (cabinX - cabinL / 2);
    const bodyX1 = resolvedTruck ? resolvedTruck.rearBodyX + 0.5 : (-halfL + rc + 1.2);
    const bodyX2 = cabBackX - 0.8;
    const totalLen = Math.max(16, bodyX2 - bodyX1);
    const bodyW = halfW * 2 - 1.2;

    // 1. Front Insulated High-Pressure Plunger Pump Compartment behind Cab
    const compLen = Math.min(8.5, totalLen * 0.26);
    const compX1 = bodyX2 - compLen;
    drawDeformedRect(compX1, -bodyW / 2, compLen, bodyW, '#0f172a');
    drawDeformedRect(compX1 + 0.5, -bodyW / 2 + 0.6, compLen - 1.0, bodyW - 1.2, '#334155');
    // Side aluminum roller shutters of the high-pressure pump room
    drawDeformedRect(compX1 + 1.0, -bodyW / 2 + 0.2, compLen - 2.0, 1.4, '#cbd5e1');
    drawDeformedRect(compX1 + 1.0, bodyW / 2 - 1.6, compLen - 2.0, 1.4, '#cbd5e1');

    // 2. Side Stainless-Steel Saddle Clean-Water Tanks + Central Teal Vacuum Sludge Tank
    const tankFront = compX1 - 0.4;
    const tankRear = bodyX1 + 3.0;
    const tankL = Math.max(11, tankFront - tankRear);

    // Left & Right rectangular stainless-steel clean water saddle tanks along the lower sides
    const saddleW = 3.2;
    drawDeformedRect(tankRear + 0.4, -bodyW / 2, tankL - 0.8, saddleW, '#94a3b8');
    drawDeformedRect(tankRear + 0.8, -bodyW / 2 + 0.4, tankL - 1.6, saddleW - 0.8, '#cbd5e1');
    drawDeformedRect(tankRear + 0.4, bodyW / 2 - saddleW, tankL - 0.8, saddleW, '#94a3b8');
    drawDeformedRect(tankRear + 0.8, bodyW / 2 - saddleW + 0.4, tankL - 1.6, saddleW - 0.8, '#cbd5e1');

    // Central cylindrical emerald-teal vacuum sludge tank ("АВАРИЙНАЯ ВОДОКАНАЛ")
    const vacW = bodyW - 3.6;
    const ko560Grad = ctx.createLinearGradient(0, -vacW / 2, 0, vacW / 2);
    ko560Grad.addColorStop(0, '#134e4a');
    ko560Grad.addColorStop(0.2, '#2dd4bf');
    ko560Grad.addColorStop(0.5, '#0d9488');
    ko560Grad.addColorStop(0.82, '#0f766e');
    ko560Grad.addColorStop(1, '#042f2e');

    drawDeformedRect(tankRear, -vacW / 2, tankL, vacW, ko560Grad);
    // White & yellow emergency Vodokanal stripes
    drawDeformedRect(tankRear + 0.6, -vacW / 2 + 0.9, tankL - 1.2, 1.0, '#f8fafc');
    drawDeformedRect(tankRear + 0.6, -vacW / 2 + 1.9, tankL - 1.2, 0.7, '#facc15');
    drawDeformedRect(tankRear + 0.6, vacW / 2 - 1.9, tankL - 1.2, 1.0, '#f8fafc');
    drawDeformedRect(tankRear + 0.6, vacW / 2 - 2.6, tankL - 1.2, 0.7, '#facc15');

    // 3 stiffening rings & top SPU suction dome
    [0.25, 0.52, 0.78].forEach((frac) => {
      const rx = tankRear + tankL * frac;
      drawDeformedRect(rx - 0.65, -vacW / 2 - 0.3, 1.3, vacW + 0.6, '#0f172a');
    });
    const domeX = tankFront - tankL * 0.28;
    drawDeformedCircle(domeX, 0, 2.8, '#0f172a', '#cbd5e1', 0.7);
    drawDeformedCircle(domeX, 0, 1.6, '#facc15');

    // Corrugated vacuum hose on left saddle rack (disappears when deployed)
    const isHoseOut = !!car.fluidTank?.isWaterHoseDeployed;
    if (!isHoseOut) {
      drawDeformedLine(tankRear + 1.2, -bodyW / 2 + 1.4, tankFront - 1.2, -bodyW / 2 + 1.4, '#09090b', 2.0);
      for (let hx = tankRear + 1.6; hx <= tankFront - 1.6; hx += 1.5) {
        drawDeformedLine(hx, -bodyW / 2 + 0.5, hx, -bodyW / 2 + 2.3, '#94a3b8', 0.6);
      }
    }

    // 3. Rear Pivoting Hydraulic High-Pressure Hose Reel (Задний поворотный барабан РВД КО-560) & ANM-53 Valve
    const reelX = tankRear - 1.6;
    drawDeformedRect(reelX - 1.8, -4.6, 3.2, 9.2, '#1e293b');
    drawDeformedRect(reelX - 1.4, -3.8, 2.4, 7.6, '#ea580c'); // Wound high-pressure orange jetting hose
    for (let ry = -3.2; ry <= 3.2; ry += 1.1) {
      drawDeformedLine(reelX - 1.3, ry, reelX + 0.9, ry, '#9a3412', 0.6);
    }
    // Lower ANM-53 vacuum intake snout & dual rear amber beacons
    drawDeformedRect(reelX - 2.9, -0.9, 1.3, 1.8, '#b45309');
    drawDeformedCircle(tankRear + 0.8, -vacW / 2 + 1.4, 0.9, '#f59e0b');
    drawDeformedCircle(tankRear + 0.8, vacW / 2 - 1.4, 0.9, '#f59e0b');
  }

  // --- TRUCK TANKER (АВТОЦИСТЕРНА ГСМ АТЗ / БЕНЗОВОЗ «ОГНЕОПАСНО») ---
  else if (effectiveType === 'truck_tanker') {
    const cabBackX = resolvedTruck ? resolvedTruck.cabRearX : (cabinX - cabinL / 2);
    const tankX1 = resolvedTruck ? resolvedTruck.rearBodyX + 0.6 : (-halfL + rc + 1.5);
    const tankX2 = cabBackX - 1.8;
    const tankL = Math.max(14, tankX2 - tankX1);
    const tankW = halfW * 2 - 1.4;
    const halfTankW = tankW / 2;

    // 1. Subframe Saddles & Grounding Chain / Fire Extinguisher Boxes
    drawDeformedRect(tankX1 - 0.4, -halfTankW - 0.4, tankL + 0.8, tankW + 0.8, 'rgba(2, 6, 23, 0.45)');
    // Red fire extinguisher tube behind cab
    drawDeformedRect(tankX2 + 0.2, -halfTankW + 0.6, 1.2, 5.2, '#dc2626');
    drawDeformedRect(tankX2 + 0.2, halfTankW - 5.8, 1.2, 5.2, '#dc2626');

    // 2. Elliptical Fuel Cistern Barrel (Оранжево-серебристая бочка ГСМ по ГОСТ)
    const tankGrad = ctx.createLinearGradient(0, -halfTankW, 0, halfTankW);
    tankGrad.addColorStop(0, '#9a3412');
    tankGrad.addColorStop(0.16, '#fb923c');
    tankGrad.addColorStop(0.32, '#f97316');
    tankGrad.addColorStop(0.50, '#fdba74');
    tankGrad.addColorStop(0.68, '#ea580c');
    tankGrad.addColorStop(0.84, '#c2410c');
    tankGrad.addColorStop(1, '#7c2d12');
    drawDeformedRect(tankX1, -halfTankW, tankL, tankW, tankGrad);

    // Side longitudinal white/red hazard bands ("ОГНЕОПАСНО")
    drawDeformedRect(tankX1 + 0.8, -halfTankW + 1.2, tankL - 1.6, 1.6, '#ffffff');
    drawDeformedRect(tankX1 + 0.8, -halfTankW + 1.5, tankL - 1.6, 1.0, '#dc2626');
    drawDeformedRect(tankX1 + 0.8, halfTankW - 2.8, tankL - 1.6, 1.6, '#ffffff');
    drawDeformedRect(tankX1 + 0.8, halfTankW - 2.5, tankL - 1.6, 1.0, '#dc2626');

    // Tank perimeter & dished bulkhead seams
    drawDeformedLine(tankX1, -halfTankW, tankX2, -halfTankW, '#7c2d12', 1.2);
    drawDeformedLine(tankX1, halfTankW, tankX2, halfTankW, '#7c2d12', 1.2);
    drawDeformedLine(tankX2, -halfTankW, tankX2, halfTankW, '#431407', 1.4);
    drawDeformedLine(tankX1, -halfTankW, tankX1, halfTankW, '#431407', 1.4);

    // Heavy steel mounting cradle straps & internal baffle rings
    const strapCount = tankL > 38 ? 4 : 3;
    for (let i = 1; i <= strapCount; i++) {
      const sx = tankX1 + (tankL / (strapCount + 1)) * i;
      drawDeformedRect(sx - 0.8, -halfTankW - 0.3, 1.6, tankW + 0.6, '#1e293b');
      drawDeformedCircle(sx, -halfTankW - 0.3, 0.55, '#cbd5e1');
      drawDeformedCircle(sx, halfTankW + 0.3, 0.55, '#cbd5e1');
    }

    // 3. Top Rollover Coaming Rails (Защитное ограждение горловин), Catwalk & Expansion Domes
    const coamW = 5.6;
    drawDeformedRect(tankX1 + 1.5, -coamW / 2, tankL - 3.0, coamW, '#334155');
    drawDeformedLine(tankX1 + 1.5, -coamW / 2, tankX2 - 1.5, -coamW / 2, '#f97316', 1.0);
    drawDeformedLine(tankX1 + 1.5, coamW / 2, tankX2 - 1.5, coamW / 2, '#f97316', 1.0);
    // Perforated aluminum catwalk grating along top
    drawDeformedRect(tankX1 + 2.0, -2.0, tankL - 4.0, 1.6, '#94a3b8');

    // Manhole expansion domes with breather valves & vapor recovery pipe
    const domePositions = tankL > 38 ? [0.25, 0.52, 0.78] : [0.32, 0.68];
    domePositions.forEach(frac => {
      const dx = tankX1 + tankL * frac;
      drawDeformedCircle(dx, 0.5, 2.2, '#1e293b', '#64748b', 0.5);
      drawDeformedCircle(dx, 0.5, 1.3, '#cbd5e1');
      drawDeformedCircle(dx - 0.3, 0.5, 0.55, '#eab308'); // Brass flame-arrestor breather valve
    });
    // Vapor recovery manifold pipe
    drawDeformedLine(tankX1 + 2.5, 2.1, tankX2 - 2.5, 2.1, '#cbd5e1', 0.9);

    // 4. Side Hose Canisters, Dispensing Meter Cabinet & Rear Ladder
    drawDeformedRect(tankX1 + 1.2, -halfW + 0.1, tankL - 2.4, 1.3, '#334155');
    drawDeformedRect(tankX1 + 1.2, halfW - 1.4, tankL - 2.4, 1.3, '#334155');
    // Rear access ladder & ADR orange hazard placard
    drawDeformedLine(tankX1 - 1.6, -1.8, tankX1 + 0.4, -1.8, '#cbd5e1', 0.9);
    drawDeformedLine(tankX1 - 1.6, 0.4, tankX1 + 0.4, 0.4, '#cbd5e1', 0.9);
    drawDeformedRect(tankX1 - 0.8, 1.4, 0.8, 2.8, '#f97316'); // ADR 33/1203 plate
  }

  // --- TRUCK FLATBED (БОРТОВАЯ ДЕРЕВЯННАЯ / СТАЛЬНАЯ ПЛАТФОРМА) ---
  else if (effectiveType === 'truck_flatbed') {
    const cabBackX = resolvedTruck ? resolvedTruck.cabRearX : (cabinX - cabinL / 2);
    const bedX1 = resolvedTruck ? resolvedTruck.rearBodyX + 0.5 : (-halfL + rc + 1.2);
    const bedX2 = cabBackX - 1.6;
    const bedL = Math.max(12, bedX2 - bedX1);
    const bedW = halfW * 2 - 0.6;
    const halfBedW = bedW / 2;

    // 1. Subframe Shadow & Transverse Support Bolsters over Bare Frame
    drawDeformedRect(bedX1 - 0.4, -halfBedW - 0.4, bedL + 0.8, bedW + 0.8, 'rgba(2, 6, 23, 0.42)');

    // 2. Authentic Pine/Oak Wooden Bed Floor Planks (Дощатый настил пола бортовой платформы)
    drawDeformedRect(bedX1, -halfBedW, bedL, bedW, '#78350f');
    const plankCount = 8;
    const plankH = bedW / plankCount;
    const woodShades = ['#92400e', '#78350f', '#a16207', '#854d0e', '#9a3412', '#78350f', '#a16207', '#854d0e'];

    for (let p = 0; p < plankCount; p++) {
      const py = -halfBedW + p * plankH;
      const shade = woodShades[p % woodShades.length];
      drawDeformedRect(bedX1 + 0.5, py + 0.35, bedL - 1.0, plankH - 0.7, shade);
      drawDeformedLine(bedX1 + 1.2, py + 0.8, bedX2 - 1.2, py + 0.8, 'rgba(255, 255, 255, 0.10)', 0.5);
      if (p > 0) {
        drawDeformedLine(bedX1 + 0.2, py, bedX2 - 0.2, py, 'rgba(0, 0, 0, 0.45)', 0.8);
      }
    }

    // Steel Floor Skid Wear Strips & Transverse Bolster Bolts
    const stripY1 = -halfBedW * 0.45;
    const stripY2 = halfBedW * 0.45;
    drawDeformedLine(bedX1 + 1.8, stripY1, bedX2 - 1.8, stripY1, '#475569', 0.9);
    drawDeformedLine(bedX1 + 1.8, stripY2, bedX2 - 1.8, stripY2, '#475569', 0.9);

    const beamCount = Math.max(4, Math.round(bedL / 8));
    for (let i = 0; i < beamCount; i++) {
      const bx = bedX1 + 2.5 + i * ((bedL - 5.0) / Math.max(1, beamCount - 1));
      [-halfBedW * 0.7, -halfBedW * 0.25, halfBedW * 0.25, halfBedW * 0.7].forEach(ry => {
        drawDeformedCircle(bx, ry, 0.35, '#1e293b');
      });
    }

    // 3. High Front Protective Headboard (Передний защитный щит за кабиной)
    const frontBoardX = bedX2 - 1.8;
    drawDeformedRect(frontBoardX, -halfBedW, 1.8, bedW, '#451a03');
    drawDeformedRect(frontBoardX + 0.3, -halfBedW + 0.6, 1.2, bedW - 1.2, '#92400e');
    [-halfBedW * 0.6, 0, halfBedW * 0.6].forEach(uy => {
      drawDeformedRect(frontBoardX - 0.3, uy - 0.6, 2.2, 1.2, '#1e293b');
    });

    // 4. Slatted Drop Sideboards with Steel Stakes & Tarpaulin Tie-Down Hooks
    const boardThick = 1.9;
    drawDeformedRect(bedX1, -halfBedW, bedL, boardThick, '#571c05');
    drawDeformedRect(bedX1 + 0.4, -halfBedW + 0.3, bedL - 0.8, boardThick - 0.6, '#a16207');
    drawDeformedLine(bedX1, -halfBedW + boardThick, bedX2, -halfBedW + boardThick, 'rgba(0,0,0,0.5)', 0.8);

    drawDeformedRect(bedX1, halfBedW - boardThick, bedL, boardThick, '#571c05');
    drawDeformedRect(bedX1 + 0.4, halfBedW - boardThick + 0.3, bedL - 0.8, boardThick - 0.6, '#a16207');
    drawDeformedLine(bedX1, halfBedW - boardThick, bedX2, halfBedW - boardThick, 'rgba(0,0,0,0.5)', 0.8);

    // 4 Corner Posts & Intermediate Drop-Side Stakes
    drawDeformedRect(bedX1 - 0.3, -halfBedW - 0.3, 1.8, boardThick + 0.6, '#0f172a');
    drawDeformedRect(bedX1 - 0.3, halfBedW - boardThick - 0.3, 1.8, boardThick + 0.6, '#0f172a');
    drawDeformedRect(bedX2 - 1.5, -halfBedW - 0.3, 1.8, boardThick + 0.6, '#0f172a');
    drawDeformedRect(bedX2 - 1.5, halfBedW - boardThick - 0.3, 1.8, boardThick + 0.6, '#0f172a');

    const stakeFracs = bedL > 40 ? [0.25, 0.50, 0.75] : [0.35, 0.70];
    stakeFracs.forEach(frac => {
      const sx = bedX1 + bedL * frac;
      drawDeformedRect(sx - 0.6, -halfBedW - 0.3, 1.2, boardThick + 0.6, '#1e293b');
      drawDeformedCircle(sx, -halfBedW - 0.4, 0.5, '#cbd5e1');
      drawDeformedRect(sx - 0.6, halfBedW - boardThick - 0.3, 1.2, boardThick + 0.6, '#1e293b');
      drawDeformedCircle(sx, halfBedW + 0.4, 0.5, '#cbd5e1');
    });

    // Outer Tarpaulin Tie-Down Hooks
    for (let hx = bedX1 + 3.5; hx < bedX2 - 3.5; hx += 5.0) {
      drawDeformedCircle(hx, -halfBedW - 0.35, 0.4, '#94a3b8');
      drawDeformedCircle(hx, halfBedW + 0.35, 0.4, '#94a3b8');
    }

    // 5. Rear Tailgate with Corner Locking Hinges
    drawDeformedRect(bedX1, -halfBedW, boardThick, bedW, '#571c05');
    drawDeformedRect(bedX1 + 0.3, -halfBedW + 0.6, boardThick - 0.6, bedW - 1.2, '#92400e');
    drawDeformedLine(bedX1 + boardThick, -halfBedW, bedX1 + boardThick, halfBedW, 'rgba(0,0,0,0.5)', 0.8);
    drawDeformedRect(bedX1 - 0.4, -halfBedW * 0.82, 1.4, 1.2, '#1e293b');
    drawDeformedRect(bedX1 - 0.4, halfBedW * 0.82 - 1.2, 1.4, 1.2, '#1e293b');
  }

  // --- TRUCK COVERED WITH SLATE ROOF (КРЫТЫЙ БОРТОВОЙ КУНГ С ШИФЕРНОЙ КРЫШЕЙ И ПЕЧКОЙ) ---
  else if (effectiveType === 'truck_covered') {
    const cabBackX = resolvedTruck ? resolvedTruck.cabRearX : (cabinX - cabinL / 2);
    const bedX1 = resolvedTruck ? resolvedTruck.rearBodyX + 0.5 : (-halfL + rc + 1.2);
    const bedX2 = cabBackX - 1.6;
    const bedL = Math.max(12, bedX2 - bedX1);
    const bedW = halfW * 2 - 0.8;
    const halfBedW = bedW / 2;

    // 1. Timber Superstructure Body Frame & Walls
    drawDeformedRect(bedX1 - 0.4, -halfBedW - 0.4, bedL + 0.8, bedW + 0.8, 'rgba(2, 6, 23, 0.45)');
    drawDeformedRect(bedX1, -halfBedW, bedL, bedW, '#451a03');
    drawDeformedRect(bedX2 - 1.5, -halfBedW, 1.5, bedW, '#271003');
    drawDeformedRect(bedX1, -halfBedW, 1.6, bedW, '#271003');
    drawDeformedLine(bedX1 + 0.8, -halfBedW + 1, bedX1 + 0.8, halfBedW - 1, '#78350f', 0.8);
    drawDeformedLine(bedX1, 0, bedX1 + 1.6, 0, '#0f172a', 1.0);
    drawDeformedRect(bedX1 - 0.4, -halfBedW * 0.7, 1.0, 1.4, '#1e293b');
    drawDeformedRect(bedX1 - 0.4, halfBedW * 0.7 - 1.4, 1.0, 1.4, '#1e293b');
    drawDeformedCircle(bedX1 + 0.4, 0.8, 0.5, '#cbd5e1');

    // 2. Corrugated Slate Roof (Асбестоцементная кровля из волнистого шифера)
    const roofX1 = bedX1 - 0.5;
    const roofX2 = bedX2 + 0.5;
    const roofL = roofX2 - roofX1;
    const roofW = bedW + 1.0;
    const halfRoofW = roofW / 2;

    drawDeformedRect(roofX1, -halfRoofW, roofL, roofW, '#475569');

    const waveCount = 13;
    const waveStep = roofW / waveCount;
    for (let w = 0; w < waveCount; w++) {
      const wy1 = -halfRoofW + w * waveStep;
      const wyMid = wy1 + waveStep * 0.5;
      drawDeformedRect(roofX1, wy1, roofL, waveStep * 0.35, '#334155');
      drawDeformedRect(roofX1, wy1 + waveStep * 0.25, roofL, waveStep * 0.5, '#64748b');
      drawDeformedLine(roofX1 + 0.4, wyMid, roofX2 - 0.4, wyMid, '#94a3b8', 1.1);
      drawDeformedLine(roofX1 + 1.2, wyMid, roofX2 - 1.2, wyMid, 'rgba(241, 245, 249, 0.35)', 0.5);
      if (w > 0) {
        drawDeformedLine(roofX1, wy1, roofX2, wy1, '#1e293b', 0.7);
      }
    }

    // Overlapping Slate Sheets along Length
    const seam1X = roofX1 + roofL * 0.34;
    const seam2X = roofX1 + roofL * 0.67;
    [seam1X, seam2X].forEach(sx => {
      drawDeformedLine(sx - 0.5, -halfRoofW + 0.2, sx - 0.5, halfRoofW - 0.2, 'rgba(0, 0, 0, 0.55)', 1.1);
      drawDeformedLine(sx, -halfRoofW + 0.2, sx, halfRoofW - 0.2, '#cbd5e1', 0.8);
      drawDeformedLine(sx + 0.5, -halfRoofW + 0.4, sx + 0.5, halfRoofW - 0.4, '#475569', 0.6);
    });

    // Roofing Nails with Round Washers
    const purlinXPositions = [roofX1 + roofL * 0.16, roofX1 + roofL * 0.50, roofX1 + roofL * 0.84];
    purlinXPositions.forEach(px => {
      for (let w = 0; w < waveCount; w += 2) {
        const wyMid = -halfRoofW + (w + 0.5) * waveStep;
        drawDeformedCircle(px, wyMid, 0.5, '#cbd5e1', '#0f172a', 0.35);
      }
    });

    // Weathering / Natural Moss Patches on Aged Slate
    drawDeformedRect(seam1X - 3.5, -halfRoofW + 1.2, 5.0, 3.2, 'rgba(77, 124, 15, 0.28)');
    drawDeformedRect(seam2X - 2.0, halfRoofW - 4.5, 4.2, 3.0, 'rgba(77, 124, 15, 0.24)');

    // Stovepipe Chimney with Conical Rain Cap (Печная труба буржуйки с зонтиком)
    const pipeX = roofX2 - Math.min(7.0, roofL * 0.22);
    const pipeY = -halfRoofW * 0.44;
    drawDeformedRect(pipeX - 1.8, pipeY - 1.8, 3.6, 3.6, '#334155');
    drawDeformedCircle(pipeX, pipeY, 2.1, '#94a3b8', '#1e293b', 0.6);
    drawDeformedCircle(pipeX, pipeY, 0.6, '#cbd5e1');
  }

  // --- CEMENT MIXER (АВТОБЕТОНОСМЕСИТЕЛЬ АБС-6ДА / СБ-92 «МИКСЕР») ---
  else if (effectiveType === 'cement_mixer') {
    const cabBackX = resolvedTruck ? resolvedTruck.cabRearX : (cabinX - cabinL / 2);
    const mixerX1 = resolvedTruck ? resolvedTruck.rearBodyX + 0.8 : (-halfL + rc + 1.5);
    const mixerX2 = cabBackX - 1.2;
    const mixerL = Math.max(16, mixerX2 - mixerX1);
    const drumW = halfW * 2 - 1.4;

    // 1. Heavy Mixer Subframe Pedestals (Подрамник миксера, передняя и задняя стойки)
    drawDeformedRect(mixerX1, -5.2, mixerL, 10.4, '#1e293b');
    // Front pedestal & planetary hydraulic gearbox housing
    const frontPedX = mixerX2 - 3.8;
    drawDeformedRect(frontPedX, -4.6, 3.4, 9.2, '#0f172a');
    drawDeformedCircle(frontPedX + 1.2, 0, 2.2, '#334155', '#64748b', 0.5);
    // Rear roller cradle pedestal
    const rearPedX = mixerX1 + 0.8;
    drawDeformedRect(rearPedX, -4.8, 3.0, 9.6, '#0f172a');
    drawDeformedCircle(rearPedX + 1.6, -3.2, 1.0, '#64748b');
    drawDeformedCircle(rearPedX + 1.6, 3.2, 1.0, '#64748b');

    // 2. Transverse Flushing Water Tank behind Cab (Бак для воды промывки барабана)
    const wtX = mixerX2 - 4.4;
    const wtW = drumW * 0.88;
    drawDeformedRect(wtX, -wtW / 2, 3.8, wtW, '#0284c7');
    drawDeformedLine(wtX + 1.0, -wtW / 2 + 0.6, wtX + 1.0, wtW / 2 - 0.6, 'rgba(255,255,255,0.45)', 0.8);
    drawDeformedRect(wtX + 0.6, -wtW * 0.32, 2.6, 0.8, '#0f172a');
    drawDeformedRect(wtX + 0.6, wtW * 0.32 - 0.8, 2.6, 0.8, '#0f172a');
    drawDeformedCircle(wtX + 1.9, 0, 0.9, '#cbd5e1');

    // 3. Pear-Shaped Concrete Mixing Drum ("Груша" с диагональными спиральными полосами)
    const drumX1 = mixerX1 + 2.4;
    const drumX2 = wtX - 0.4;
    const drumLen = Math.max(11, drumX2 - drumX1);
    const bellyX = drumX1 + drumLen * 0.56;

    const dp1 = deform(drumX2, -drumW * 0.26);
    const dp2 = deform(bellyX, -drumW * 0.50);
    const dp3 = deform(drumX1, -drumW * 0.24);
    const dp4 = deform(drumX1, drumW * 0.24);
    const dp5 = deform(bellyX, drumW * 0.50);
    const dp6 = deform(drumX2, drumW * 0.26);

    const drumGrad = ctx.createLinearGradient(0, -drumW * 0.5, 0, drumW * 0.5);
    drumGrad.addColorStop(0, '#94a3b8');
    drumGrad.addColorStop(0.22, '#f8fafc');
    drumGrad.addColorStop(0.50, '#e2e8f0');
    drumGrad.addColorStop(0.80, '#cbd5e1');
    drumGrad.addColorStop(1, '#475569');

    ctx.fillStyle = drumGrad;
    ctx.beginPath();
    ctx.moveTo(dp1[0], dp1[1]);
    ctx.lineTo(dp2[0], dp2[1]);
    ctx.lineTo(dp3[0], dp3[1]);
    ctx.lineTo(dp4[0], dp4[1]);
    ctx.lineTo(dp5[0], dp5[1]);
    ctx.lineTo(dp6[0], dp6[1]);
    ctx.closePath();
    ctx.fill();

    // Diagonal orange/amber spiral agitation stripes & welded conical seam rings
    [0.24, 0.48, 0.72].forEach(frac => {
      const sx1 = drumX1 + drumLen * (frac - 0.10);
      const sx2 = drumX1 + drumLen * (frac + 0.10);
      const wAt = drumW * (0.34 + Math.sin(frac * Math.PI) * 0.14);
      drawDeformedLine(sx1, -wAt * 0.85, sx2, wAt * 0.85, '#ea580c', 2.4);
      drawDeformedLine(sx1 + 0.8, -wAt * 0.85, sx2 + 0.8, wAt * 0.85, '#f59e0b', 1.0);
    });

    // Steel roller track ring near rear cone
    const ringX = drumX1 + drumLen * 0.20;
    const ringW = drumW * 0.70;
    drawDeformedLine(ringX, -ringW / 2, ringX, ringW / 2, '#1e293b', 1.8);
    drawDeformedLine(bellyX, -drumW * 0.49, bellyX, drumW * 0.49, '#64748b', 1.1);

    // Drum outline
    drawDeformedLine(drumX1, -drumW * 0.24, bellyX, -drumW * 0.50, '#334155', 1.2);
    drawDeformedLine(bellyX, -drumW * 0.50, drumX2, -drumW * 0.26, '#334155', 1.2);
    drawDeformedLine(drumX2, -drumW * 0.26, drumX2, drumW * 0.26, '#1e293b', 1.4);
    drawDeformedLine(drumX2, drumW * 0.26, bellyX, drumW * 0.50, '#334155', 1.2);
    drawDeformedLine(bellyX, drumW * 0.50, drumX1, drumW * 0.24, '#334155', 1.2);
    drawDeformedLine(drumX1, drumW * 0.24, drumX1, -drumW * 0.24, '#1e293b', 1.4);

    // 4. Rear Charging Hopper Funnel, Swivel Discharge Chute & Inspection Ladder
    // Charging hopper funnel (Загрузочная воронка)
    drawDeformedRect(drumX1 - 2.2, -3.2, 2.4, 6.4, '#ea580c');
    drawDeformedRect(drumX1 - 1.8, -2.2, 1.8, 4.4, '#1e293b');
    // Swivel concrete discharge chute (Поворотный разгрузочный лоток)
    drawDeformedLine(drumX1 - 1.6, 0, drumX1 - 3.6, 3.8, '#94a3b8', 2.2);
    drawDeformedLine(drumX1 - 1.6, 0, drumX1 - 3.6, 3.8, '#475569', 1.0);
    // Left side inspection ladder & platform
    drawDeformedLine(drumX1 - 1.0, -4.4, drumX1 + 2.2, -4.4, '#cbd5e1', 0.9);
    drawDeformedLine(drumX1 - 1.0, -2.8, drumX1 + 2.2, -2.8, '#cbd5e1', 0.9);
  }

  // --- GARBAGE TRUCK (МУСОРОВОЗ КО-440 / МКМ С БОКОВЫМ И ЗАДНИМ МАНИПУЛЯТОРОМ) ---
  else if (effectiveType === 'garbage_truck') {
    const cabBackX = resolvedTruck ? resolvedTruck.cabRearX : (cabinX - cabinL / 2);
    const compX1 = resolvedTruck ? resolvedTruck.rearBodyX + 3.2 : (-halfL + rc + 4.5);
    const compX2 = cabBackX - 1.6;
    const compL = Math.max(14, compX2 - compX1);
    const compW = halfW * 2 - 1.0;
    const halfCompW = compW / 2;

    // 1. Subframe Shadow & Main Compactor Body with Curved Ribbed Sides
    drawDeformedRect(compX1 - 3.6, -halfCompW - 0.5, compL + 4.2, compW + 1.0, 'rgba(2, 6, 23, 0.45)');

    const bodyGrad = ctx.createLinearGradient(0, -halfCompW, 0, halfCompW);
    bodyGrad.addColorStop(0, '#14532d');
    bodyGrad.addColorStop(0.18, '#22c55e');
    bodyGrad.addColorStop(0.50, '#16a34a');
    bodyGrad.addColorStop(0.82, '#15803d');
    bodyGrad.addColorStop(1, '#052e16');
    drawDeformedRect(compX1, -halfCompW, compL, compW, bodyGrad);

    // Perimeter reinforcement frame & diagonal white/orange municipal hazard stripes
    drawDeformedLine(compX1, -halfCompW, compX2, -halfCompW, '#052e16', 1.3);
    drawDeformedLine(compX2, -halfCompW, compX2, halfCompW, '#052e16', 1.3);
    drawDeformedLine(compX2, halfCompW, compX1, halfCompW, '#052e16', 1.3);
    drawDeformedLine(compX1, halfCompW, compX1, -halfCompW, '#052e16', 1.4);

    // Heavy external curved box-section ribs (дугообразные шпангоуты жесткости кузова)
    const ribStep = Math.max(4.8, compL / 5);
    for (let rx = compX1 + ribStep * 0.7; rx < compX2 - 2.2; rx += ribStep) {
      drawDeformedRect(rx - 0.7, -halfCompW - 0.2, 1.4, compW + 0.4, '#14532d');
      drawDeformedLine(rx - 0.2, -halfCompW, rx - 0.2, halfCompW, '#4ade80', 0.6);
    }

    // Top Loading Hopper Hatch & Compactor Pusher Plate Hydraulic Guide Track
    const hopperX = compX2 - Math.min(7.5, compL * 0.28);
    drawDeformedRect(hopperX - 2.6, -halfCompW * 0.58, 5.2, compW * 0.58, '#0f172a');
    drawDeformedRect(hopperX - 2.0, -halfCompW * 0.48, 4.0, compW * 0.48, '#334155');
    // Central telescopic ejection cylinder track on roof
    drawDeformedRect(compX1 + 1.5, -1.2, hopperX - compX1 - 4.2, 2.4, '#14532d');
    drawDeformedLine(compX1 + 2.0, 0, hopperX - 2.8, 0, '#cbd5e1', 0.9);

    // 2. Right-Side Hydraulic Container Loader Arm (Боковой гидроманипулятор захвата баков)
    const armX = hopperX;
    const armY = halfCompW + 0.2;
    drawDeformedRect(armX - 3.0, armY - 1.2, 6.0, 1.8, '#ea580c');
    drawDeformedRect(armX - 1.8, armY - 0.6, 3.6, 1.0, '#f59e0b');
    drawDeformedCircle(armX - 2.2, armY - 0.4, 0.7, '#0f172a');
    drawDeformedCircle(armX + 2.2, armY - 0.4, 0.7, '#0f172a');

    // 3. Rear Tailgate Hopper & Compaction Mechanism (Задний загрузочный ковш с прессующей плитой)
    const tailX1 = compX1 - 3.6;
    drawDeformedRect(tailX1, -halfCompW + 0.2, 3.6, compW - 0.4, '#ea580c');
    drawDeformedRect(tailX1 + 0.5, -halfCompW + 1.2, 2.4, compW - 2.4, '#1e293b');
    // Twin hydraulic tailgate lift cylinders on top corners
    drawDeformedLine(compX1 + 1.2, -halfCompW + 1.0, tailX1 + 0.8, -halfCompW + 1.0, '#cbd5e1', 1.2);
    drawDeformedLine(compX1 + 1.2, halfCompW - 1.0, tailX1 + 0.8, halfCompW - 1.0, '#cbd5e1', 1.2);
    // Amber warning beacons on rear hopper corners
    drawDeformedCircle(tailX1 + 0.8, -halfCompW + 1.4, 0.85, '#f59e0b');
    drawDeformedCircle(tailX1 + 0.8, halfCompW - 1.4, 0.85, '#f59e0b');
  }

  // ==========================================
  // 1. WAGONS (УНИВЕРСАЛЫ)
  // ==========================================
  if (car.type === 'wagon_classic') {
    // Retro Classic Estate (ВАЗ-2104 style)
    // Chrome front bumper with black rubber overrider pads
    drawDeformedRect(halfL - fc - 0.5, -halfW + 1.2, 2.2, car.width - 2.4, '#cbd5e1');
    drawDeformedRect(halfL - fc + 0.2, -halfW * 0.5, 1.4, 3, '#1e293b');
    drawDeformedRect(halfL - fc + 0.2, halfW * 0.5 - 3, 1.4, 3, '#1e293b');

    // Rear chrome bumper
    drawDeformedRect(-halfL + rc - 1.8, -halfW + 1.2, 2.2, car.width - 2.4, '#cbd5e1');

    // Chrome body side beltline trim
    drawDeformedLine(-halfL + rc + 3, -halfW + 0.8, halfL - fc - 2, -halfW + 0.8, '#cbd5e1', 1.0);
    drawDeformedLine(-halfL + rc + 3, halfW - 0.8, halfL - fc - 2, halfW - 0.8, '#cbd5e1', 1.0);

    // Full roof luggage rack with wooden slats and strapped vintage suitcase
    const rackX1 = cabinX - cabinL * 0.38;
    const rackX2 = cabinX + cabinL * 0.28;
    const rackW = cabinW * 0.82;
    // Outer perimeter rails
    drawDeformedLine(rackX1, -rackW / 2, rackX2, -rackW / 2, '#94a3b8', 1.5);
    drawDeformedLine(rackX1, rackW / 2, rackX2, rackW / 2, '#94a3b8', 1.5);
    drawDeformedLine(rackX1, -rackW / 2, rackX1, rackW / 2, '#94a3b8', 1.5);
    drawDeformedLine(rackX2, -rackW / 2, rackX2, rackW / 2, '#94a3b8', 1.5);

    // Cross slats (steel/wood)
    for (let sx = rackX1 + 4; sx < rackX2 - 2; sx += 5) {
      drawDeformedLine(sx, -rackW / 2 + 0.5, sx, rackW / 2 - 0.5, '#78350f', 1.2);
    }
    // Strapped luggage cargo suitcase
    drawDeformedRect(cabinX - 5, -rackW * 0.28, 9, rackW * 0.56, '#b45309');
    drawDeformedRect(cabinX - 4, -rackW * 0.24, 7, rackW * 0.48, '#d97706');
    // Leather straps
    drawDeformedLine(cabinX - 2, -rackW * 0.28, cabinX - 2, rackW * 0.28, '#451a03', 1.0);
    drawDeformedLine(cabinX + 2, -rackW * 0.28, cabinX + 2, rackW * 0.28, '#451a03', 1.0);

    // Rear window defroster lines & wiper
    const rearGlassX = cabinX - cabinL * 0.42;
    drawDeformedLine(rearGlassX, -cabinW * 0.28, rearGlassX, cabinW * 0.28, '#ea580c', 0.8);
    drawDeformedLine(rearGlassX - 1.5, -cabinW * 0.25, rearGlassX - 1.5, cabinW * 0.25, '#ea580c', 0.8);
    drawDeformedLine(rearGlassX, 0, rearGlassX + 3, 3, '#0f172a', 1.2);
  } else if (car.type === 'wagon_modern') {
    // Sleek Modern Touring Estate
    // Panoramic tinted glass roof section
    const panoL = cabinL * 0.55;
    const panoW = cabinW * 0.72;
    drawDeformedRect(cabinX - panoL / 2 + 1, -panoW / 2, panoL, panoW, '#0f172a');
    drawDeformedLine(cabinX, -panoW / 2, cabinX, panoW / 2, '#334155', 1.2);

    // Flush satin silver roof rails
    const railX1 = cabinX - cabinL * 0.36;
    const railX2 = cabinX + cabinL * 0.28;
    drawDeformedLine(railX1, -cabinW * 0.44, railX2, -cabinW * 0.44, '#e2e8f0', 1.8);
    drawDeformedLine(railX1, cabinW * 0.44, railX2, cabinW * 0.44, '#e2e8f0', 1.8);

    // Aerodynamic shark fin antenna
    drawDeformedRect(cabinX - cabinL * 0.34, -0.6, 2.5, 1.2, '#0f172a');

    // Tailgate spoiler lip
    const spoilerX = cabinX - cabinL * 0.46;
    drawDeformedRect(spoilerX, -cabinW * 0.38, 2.2, cabinW * 0.76, '#0f172a');

    // Dual chrome oval exhaust tips in rear diffuser
    drawDeformedRect(-halfL + rc - 1.2, -halfW * 0.65, 2, 2.2, '#cbd5e1');
    drawDeformedRect(-halfL + rc - 1.2, halfW * 0.65 - 2.2, 2, 2.2, '#cbd5e1');
  } else if (car.type === 'wagon_allroad') {
    // Rugged Offroad / Cross Country Lifted Wagon
    // Dark protective wheel arch claddings (fender flares)
    const archColor = '#1e293b';
    drawDeformedRect(halfL * 0.56, -halfW, 7, 1.4, archColor);
    drawDeformedRect(halfL * 0.56, halfW - 1.4, 7, 1.4, archColor);
    drawDeformedRect(-halfL * 0.66, -halfW, 7, 1.4, archColor);
    drawDeformedRect(-halfL * 0.66, halfW - 1.4, 7, 1.4, archColor);

    // Aluminum silver front and rear skid plates
    drawDeformedRect(halfL - fc - 0.5, -halfW * 0.42, 2.2, halfW * 0.84, '#cbd5e1');
    drawDeformedRect(-halfL + rc - 1.5, -halfW * 0.42, 2.2, halfW * 0.84, '#cbd5e1');

    // Heavy duty roof crossbars with sports equipment cargo pod (Thule style box)
    const crossX1 = cabinX - cabinL * 0.25;
    const crossX2 = cabinX + cabinL * 0.20;
    drawDeformedLine(crossX1, -cabinW * 0.45, crossX1, cabinW * 0.45, '#0f172a', 2.0);
    drawDeformedLine(crossX2, -cabinW * 0.45, crossX2, cabinW * 0.45, '#0f172a', 2.0);

    // Aerodynamic glossy black cargo pod
    const podL = cabinL * 0.62;
    const podW = cabinW * 0.42;
    drawDeformedRect(cabinX - podL / 2, -podW / 2, podL, podW, '#0f172a');
    drawDeformedRect(cabinX - podL / 2 + 2, -podW / 2 + 1, podL - 4, podW - 2, '#334155');
    drawDeformedLine(cabinX - podL / 2 + 1, 0, cabinX + podL / 2 - 1, 0, '#64748b', 1.0);
  }

  // ==========================================
  // 2. SEDANS & RETRO (СЕДАНЫ И КЛАССИКА)
  // ==========================================
  else if (car.type === 'sedan_classic') {
    // Iconic Retro Sedan (ВАЗ-2106 / Жигули)
    // Chrome front bumper with rubber fang guards
    drawDeformedRect(halfL - fc - 0.4, -halfW + 1.2, 2.0, car.width - 2.4, '#cbd5e1');
    drawDeformedRect(halfL - fc + 0.2, -halfW * 0.55, 1.4, 2.5, '#0f172a');
    drawDeformedRect(halfL - fc + 0.2, halfW * 0.55 - 2.5, 1.4, 2.5, '#0f172a');

    // Chrome front grille with central red badge
    drawDeformedRect(halfL - fc - 2.5, -halfW * 0.55, 2.2, halfW * 1.10, '#334155');
    drawDeformedLine(halfL - fc - 1.5, -halfW * 0.52, halfL - fc - 1.5, halfW * 0.52, '#cbd5e1', 1.0);
    drawDeformedRect(halfL - fc - 1.8, -1, 1.4, 2, '#dc2626'); // Red classic badge

    // Chrome side body molding strip with orange front turn signal repeaters
    drawDeformedLine(-halfL + rc + 3, -halfW + 0.6, halfL - fc - 3, -halfW + 0.6, '#cbd5e1', 1.0);
    drawDeformedLine(-halfL + rc + 3, halfW - 0.6, halfL - fc - 3, halfW - 0.6, '#cbd5e1', 1.0);
    drawDeformedRect(halfL * 0.5, -halfW + 0.2, 1.5, 1.2, '#f59e0b');
    drawDeformedRect(halfL * 0.5, halfW - 1.4, 1.5, 1.2, '#f59e0b');

    // Distinctive black ventilation louvers on C-pillars
    const louverX = cabinX - cabinL * 0.32;
    drawDeformedRect(louverX, -cabinW * 0.44, 2.5, 1.5, '#0f172a');
    drawDeformedRect(louverX, cabinW * 0.44 - 1.5, 2.5, 1.5, '#0f172a');

    // Rear bumper & classic wide horizontal taillights
    drawDeformedRect(-halfL + rc - 1.6, -halfW + 1.2, 1.8, car.width - 2.4, '#cbd5e1');
    drawDeformedRect(-halfL + rc + 0.2, -halfW * 0.78, 1.6, 5.5, '#dc2626');
    drawDeformedRect(-halfL + rc + 0.2, halfW * 0.78 - 5.5, 1.6, 5.5, '#dc2626');
  } else if (car.type === 'sedan_luxury') {
    // Executive Long-Wheelbase Luxury Sedan (S-Class / 7-Series)
    // Chrome window trim surrounding greenhouse
    const winL = cabinL * 0.94;
    const winW = cabinW * 0.96;
    drawDeformedLine(cabinX - winL / 2, -winW / 2, cabinX + winL / 2, -winW / 2, '#cbd5e1', 1.2);
    drawDeformedLine(cabinX - winL / 2, winW / 2, cabinX + winL / 2, winW / 2, '#cbd5e1', 1.2);

    // Chrome prestige waterfall front grille with upright hood star ornament
    drawDeformedRect(halfL - fc - 2.8, -halfW * 0.48, 2.6, halfW * 0.96, '#cbd5e1');
    for (let gy = -halfW * 0.42; gy < halfW * 0.42; gy += 2.2) {
      drawDeformedLine(halfL - fc - 2.6, gy, halfL - fc - 0.4, gy, '#475569', 0.8);
    }
    // Upright hood star emblem
    drawDeformedCircle(halfL - fc + 0.4, 0, 1.2, '#f8fafc', '#cbd5e1', 0.8);

    // Dark VIP privacy tinted glass on rear doors & rear window
    drawDeformedRect(cabinX - cabinL * 0.44, -cabinW * 0.38, cabinL * 0.42, cabinW * 0.76, 'rgba(15, 23, 42, 0.75)');

    // Rear connected OLED taillight lightbar
    drawDeformedLine(-halfL + rc + 0.5, -halfW * 0.75, -halfL + rc + 0.5, halfW * 0.75, car.brakeLightsOn ? '#ef4444' : '#991b1b', 1.8);

    // Quad rectangular chrome exhaust tips
    drawDeformedRect(-halfL + rc - 1.4, -halfW * 0.70, 1.8, 3.8, '#cbd5e1');
    drawDeformedRect(-halfL + rc - 1.4, halfW * 0.70 - 3.8, 1.8, 3.8, '#cbd5e1');
  } else if (car.type === 'sedan_compact') {
    // Modern City Compact Sedan (Solaris/Rio style)
    // Black honeycomb lower front grille
    drawDeformedRect(halfL - fc - 2.0, -halfW * 0.48, 1.8, halfW * 0.96, '#1e293b');
    // Modern LED DRL light signatures framing the upper headlamp edge
    drawDeformedLine(halfL - fc - 1.0, -halfW * 0.82, halfL - fc - 4.0, -halfW * 0.68, 'rgba(255,255,255,0.7)', 1.0);
    drawDeformedLine(halfL - fc - 1.0, halfW * 0.82, halfL - fc - 4.0, halfW * 0.68, 'rgba(255,255,255,0.7)', 1.0);

    // Color-matched aerodynamic door mirrors
    drawDeformedRect(cabinX + cabinL * 0.28, -halfW - 1.8, 2.0, 1.8, car.color);
    drawDeformedRect(cabinX + cabinL * 0.28, halfW, 2.0, 1.8, car.color);
  } else if (car.type === 'police') {
    // =========================================================================
    // POLICE PATROL INTERCEPTOR (ДПС / ППС ГОСТ Р 50574) - STRICT TOP-DOWN VIEW
    // =========================================================================
    // 1. Authentic CIS Police Hood Livery (Central royal blue stripe on white/silver body)
    const hoodX1 = cabinX + cabinL * 0.36;
    const hoodX2 = halfL - fc - 0.8;
    const hoodW = halfW * 1.30;
    const hoodStripeW = hoodW * 0.62;

    // Crisp royal blue central hood stripe with white border trim
    drawDeformedRect(hoodX1, -hoodStripeW / 2 - 0.6, hoodX2 - hoodX1, hoodStripeW + 1.2, '#ffffff');
    drawDeformedRect(hoodX1, -hoodStripeW / 2, hoodX2 - hoodX1, hoodStripeW, '#1d4ed8');
    drawDeformedRect(hoodX1 + 1, -hoodStripeW / 2 + 1, hoodX2 - hoodX1 - 2, hoodStripeW - 2, '#2563eb');

    // Bold Cyrillic «ДПС» inscription centered on the blue hood stripe
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const [dHX, dHY] = deform(hoodX1 + (hoodX2 - hoodX1) * 0.52, 0);
    ctx.fillText('ДПС', dHX, dHY);
    ctx.restore();

    // Dual black hood windshield washer nozzles
    drawDeformedCircle(hoodX1 + 1.8, -hoodW * 0.28, 0.6, '#0f172a');
    drawDeformedCircle(hoodX1 + 1.8, hoodW * 0.28, 0.6, '#0f172a');

    // 2. Front Windshield & Interior Speed Radar Pod («Бинар» / «Визир»)
    const fWsX1 = cabinX + cabinL * 0.12;
    const fWsX2 = cabinX + cabinL * 0.36;
    // Speed radar unit on passenger dashboard
    drawDeformedRect(fWsX1 + 2.0, -cabinW * 0.26, 3.2, 2.2, '#0f172a');
    drawDeformedCircle(fWsX1 + 4.2, -cabinW * 0.26 + 1.1, 0.7, '#38bdf8'); // Radar optical lens

    // 3. Side Door Livery Bands (ГОСТ blue bands along flanks with white border)
    const flankX1 = -halfL * 0.34;
    const flankX2 = halfL * 0.32;
    drawDeformedLine(flankX1, -halfW + 0.8, flankX2, -halfW + 0.8, '#ffffff', 3.6);
    drawDeformedLine(flankX1, -halfW + 0.8, flankX2, -halfW + 0.8, '#1d4ed8', 2.6);
    drawDeformedLine(flankX1, halfW - 0.8, flankX2, halfW - 0.8, '#ffffff', 3.6);
    drawDeformedLine(flankX1, halfW - 0.8, flankX2, halfW - 0.8, '#1d4ed8', 2.6);

    // 4. White Roof with Operational Callsign «102»
    ctx.save();
    ctx.fillStyle = '#1d4ed8';
    ctx.font = 'bold 6.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const [dRX, dRY] = deform(cabinX - cabinL * 0.08, 0);
    ctx.fillText('102', dRX, dRY);
    ctx.restore();

    // Slanted VHF whip radio antenna on magnetic mount (Штыревая антенна УКВ)
    const antBaseX = cabinX - cabinL * 0.22;
    drawDeformedCircle(antBaseX, 0, 1.2, '#0f172a');
    drawDeformedCircle(antBaseX, 0, 0.7, '#cbd5e1');
    drawDeformedLine(antBaseX, 0, antBaseX - 6.5, 0, '#475569', 1.0);

    // 5. White Trunk Lid with Rear Blue Edge Livery Stripe
    const trunkX1 = -halfL + rc + 1.5;
    const trunkX2 = cabinX - cabinL * 0.36;
    const trunkW = halfW * 1.35;
    // Blue band across rear lip of trunk
    drawDeformedRect(trunkX1, -trunkW / 2, 2.2, trunkW, '#1d4ed8');
    drawDeformedLine(trunkX1 + 2.2, -trunkW / 2, trunkX1 + 2.2, trunkW / 2, '#ffffff', 0.8);
  } else if (car.type === 'taxi') {
    // Public City Taxi (Жёлтое Такси с шашечками)
    // 1. Classic black/white checkerboard stripes («шашечки») on both flanks
    const checkCount = 8;
    const checkSpan = (cabinL * 0.8) / checkCount;
    for (let c = 0; c < checkCount; c++) {
      const cx = cabinX - cabinL * 0.4 + c * checkSpan;
      const isBlack = c % 2 === 0;
      drawDeformedRect(cx, -halfW + 0.4, checkSpan, 1.6, isBlack ? '#0f172a' : '#ffffff');
      drawDeformedRect(cx, halfW - 2.0, checkSpan, 1.6, isBlack ? '#0f172a' : '#ffffff');
    }

    // 2. Glowing yellow illuminated roof taxi sign pod («ТАКСИ»)
    const signW = cabinW * 0.65;
    drawDeformedRect(cabinX - 1.8, -signW / 2, 3.6, signW, '#f59e0b');
    drawDeformedRect(cabinX - 1.2, -signW / 2 + 0.8, 2.4, signW - 1.6, '#fef08a');
    // Mini black checkered graphics on the sign edges
    drawDeformedRect(cabinX - 1.0, -signW / 2 + 1.2, 2.0, 2.0, '#0f172a');
    drawDeformedRect(cabinX - 1.0, signW / 2 - 3.2, 2.0, 2.0, '#0f172a');

    // 3. Green "Available" LED dot inside front passenger windshield corner
    drawDeformedCircle(cabinX + cabinL * 0.32, halfW * 0.28, 1.0, '#22c55e');
  }

  // ==========================================
  // 3. COMPACTS & MICRO CARS (ХЭТЧБЕКИ И МИКРО)
  // ==========================================
  else if (car.type === 'hatch_hot') {
    // Hot Hatch Sport (Civic Type R / Golf R style)
    // Aggressive front carbon splitter with aero winglets
    drawDeformedRect(halfL - fc + 0.2, -halfW - 0.8, 1.8, car.width + 1.6, '#0f172a');
    drawDeformedRect(halfL - fc - 1.5, -halfW - 1.0, 3.0, 1.2, '#0f172a');
    drawDeformedRect(halfL - fc - 1.5, halfW - 0.2, 3.0, 1.2, '#0f172a');

    // Dual vented hood heat extractors
    drawDeformedRect(halfL * 0.32, -halfW * 0.38, 3.5, 2.0, '#1e293b');
    drawDeformedRect(halfL * 0.32, halfW * 0.38 - 2.0, 3.5, 2.0, '#1e293b');

    // Distinct high-mount rally / cup rear roof wing
    const wingX = cabinX - cabinL * 0.52;
    drawDeformedRect(wingX, -cabinW * 0.48, 3.5, cabinW * 0.96, '#0f172a');
    drawDeformedRect(wingX - 1.0, -cabinW * 0.48, 4.5, 1.5, '#dc2626');
    drawDeformedRect(wingX - 1.0, cabinW * 0.48 - 1.5, 4.5, 1.5, '#dc2626');

    // Center dual oversized stainless exhaust pipes
    drawDeformedCircle(-halfL + rc - 1.2, -1.8, 1.4, '#e2e8f0', '#0f172a', 0.8);
    drawDeformedCircle(-halfL + rc - 1.2, 1.8, 1.4, '#e2e8f0', '#0f172a', 0.8);

    // Bright red high-performance brake calipers visible behind wheels
    const calColor = '#ef4444';
    drawDeformedRect(halfL * 0.62, -halfW + 0.5, 2.4, 1.4, calColor);
    drawDeformedRect(halfL * 0.62, halfW - 1.9, 2.4, 1.4, calColor);
    drawDeformedRect(-halfL * 0.62, -halfW + 0.5, 2.4, 1.4, calColor);
    drawDeformedRect(-halfL * 0.62, halfW - 1.9, 2.4, 1.4, calColor);
  } else if (car.type === 'micro_car') {
    // Ultra-compact 2-seater City Smart
    // Signature contrasting Tridion safety cell frame (silver/titanium arc)
    const tridionColor = '#94a3b8';
    const cX = cabinX;
    // Safety arc wrapping roof and rear pillars
    drawDeformedLine(cX - cabinL * 0.42, -cabinW * 0.44, cX + cabinL * 0.32, -cabinW * 0.44, tridionColor, 2.2);
    drawDeformedLine(cX - cabinL * 0.42, cabinW * 0.44, cX + cabinL * 0.32, cabinW * 0.44, tridionColor, 2.2);
    drawDeformedLine(cX - cabinL * 0.42, -cabinW * 0.44, cX - cabinL * 0.42, cabinW * 0.44, tridionColor, 2.4);

    // Micro rear window with wiper
    drawDeformedLine(cX - cabinL * 0.38, 0, cX - cabinL * 0.38 + 2.5, 2.5, '#0f172a', 1.0);

    // Central compact exhaust
    drawDeformedCircle(-halfL + rc - 1.0, 0, 1.2, '#cbd5e1', '#0f172a', 0.8);
  } else if (car.type === 'classic_compact') {
    // Vintage Compact Sedan («Копейка» / ВАЗ-2101 / Fiat 124)
    // Chrome horizontal grille slats
    drawDeformedRect(halfL - fc - 2.5, -halfW * 0.48, 2.0, halfW * 0.96, '#334155');
    drawDeformedLine(halfL - fc - 1.5, -halfW * 0.46, halfL - fc - 1.5, halfW * 0.46, '#cbd5e1', 1.2);

    // Polished chrome front & rear bumpers with vertical buffer overriders
    drawDeformedRect(halfL - fc - 0.4, -halfW + 1.2, 1.8, car.width - 2.4, '#cbd5e1');
    drawDeformedRect(halfL - fc + 0.2, -halfW * 0.48, 1.4, 2.2, '#cbd5e1');
    drawDeformedRect(halfL - fc + 0.2, halfW * 0.48 - 2.2, 1.4, 2.2, '#cbd5e1');

    drawDeformedRect(-halfL + rc - 1.6, -halfW + 1.2, 1.8, car.width - 2.4, '#cbd5e1');
    drawDeformedRect(-halfL + rc - 2.0, -halfW * 0.48, 1.4, 2.2, '#cbd5e1');
    drawDeformedRect(-halfL + rc - 2.0, halfW * 0.48 - 2.2, 1.4, 2.2, '#cbd5e1');

    // Classic chrome rain gutters along roof edges
    drawDeformedLine(cabinX - cabinL * 0.35, -cabinW * 0.45, cabinX + cabinL * 0.35, -cabinW * 0.45, '#cbd5e1', 1.0);
    drawDeformedLine(cabinX - cabinL * 0.35, cabinW * 0.45, cabinX + cabinL * 0.35, cabinW * 0.45, '#cbd5e1', 1.0);

    // Thin vintage steering wheel with chrome horn ring visible through windshield
    drawDeformedCircle(cabinX + cabinL * 0.18, -cabinW * 0.22, 2.2, 'rgba(0,0,0,0)', '#f8fafc', 0.9);
  } else if (car.type === 'retro_bubble') {
    // Retro Rear-Engine Bubble Microcar («Горбатый» ЗАЗ-965)
    drawDeformedRect(halfL - fc - 0.8, -1.2, 1.2, 2.4, '#cbd5e1'); // Front chrome chevron

    // Iconic lateral rear air intake scoops («уши») on left and right rear fenders!
    drawDeformedRect(-halfL * 0.35, -halfW - 1.2, 4.0, 1.6, car.color);
    drawDeformedLine(-halfL * 0.35 + 4.0, -halfW - 1.2, -halfL * 0.35, -halfW + 0.2, '#0f172a', 1.2);
    drawDeformedRect(-halfL * 0.35, halfW - 0.4, 4.0, 1.6, car.color);
    drawDeformedLine(-halfL * 0.35 + 4.0, halfW + 1.2, -halfL * 0.35, halfW - 0.2, '#0f172a', 1.2);

    // Rear engine lid cooling louvers
    for (let ry = -halfW * 0.38; ry < halfW * 0.38; ry += 2.2) {
      drawDeformedLine(-halfL + rc + 2.0, ry, -halfL + rc + 4.5, ry, '#0f172a', 0.9);
    }

    // Vintage ivory two-spoke steering wheel inside
    drawDeformedCircle(cabinX + cabinL * 0.16, -cabinW * 0.22, 2.0, 'rgba(0,0,0,0)', '#fef08a', 0.9);
  }

  // ==========================================
  // 4. SUVS & 4X4 OFF-ROAD (ВНЕДОРОЖНИКИ И ДЖИПЫ)
  // ==========================================
  else if (car.type === 'suv_luxury') {
    // Luxury Premium SUV (Range Rover style)
    // Sculpted clamshell hood creases & badge
    drawDeformedLine(halfL * 0.2, -halfW * 0.45, halfL - fc - 2, -halfW * 0.40, 'rgba(255,255,255,0.25)', 1.0);
    drawDeformedLine(halfL * 0.2, halfW * 0.45, halfL - fc - 2, halfW * 0.40, 'rgba(255,255,255,0.25)', 1.0);

    // Large full-length panoramic glass sunroof
    const panL = cabinL * 0.60;
    const panW = cabinW * 0.74;
    drawDeformedRect(cabinX - panL / 2, -panW / 2, panL, panW, '#0f172a');
    drawDeformedLine(cabinX, -panW / 2, cabinX, panW / 2, '#475569', 1.2);

    // Satin silver aluminum front fender side vents
    drawDeformedRect(halfL * 0.25, -halfW + 0.2, 3.2, 1.2, '#cbd5e1');
    drawDeformedRect(halfL * 0.25, halfW - 1.4, 3.2, 1.2, '#cbd5e1');

    // Integrated side running steps
    drawDeformedRect(-halfL * 0.2, -halfW - 1.2, halfL * 0.7, 1.2, '#334155');
    drawDeformedRect(-halfL * 0.2, halfW, halfL * 0.7, 1.2, '#334155');

    // Dual integrated chrome exhaust ports
    drawDeformedRect(-halfL + rc - 1.2, -halfW * 0.68, 1.8, 3.4, '#cbd5e1');
    drawDeformedRect(-halfL + rc - 1.2, halfW * 0.68 - 3.4, 1.8, 3.4, '#cbd5e1');
  } else if (car.type === 'offroad_hardcore') {
    // Hardcore Expedition 4x4 Trophy / Overland Rig
    // Heavy steel winch front bumper with red tow hooks
    drawDeformedRect(halfL - fc + 0.2, -halfW - 0.5, 2.5, car.width + 1.0, '#0f172a');
    drawDeformedRect(halfL - fc + 1.0, -halfW * 0.25, 1.8, halfW * 0.5, '#475569'); // Winch drum
    drawDeformedRect(halfL - fc + 1.8, -halfW * 0.15, 1.2, halfW * 0.3, '#cbd5e1'); // Silver cable
    drawDeformedCircle(halfL - fc + 2.5, -halfW * 0.65, 1.4, '#ef4444'); // Red hook
    drawDeformedCircle(halfL - fc + 2.5, halfW * 0.65, 1.4, '#ef4444');

    // Engine air intake snorkel running along right A-pillar
    drawDeformedLine(halfL * 0.25, halfW + 0.5, cabinX + cabinL * 0.25, halfW + 0.8, '#0f172a', 2.0);
    drawDeformedRect(cabinX + cabinL * 0.25, halfW + 0.4, 3.0, 1.8, '#0f172a'); // Snorkel head

    // Full heavy expedition roof rack
    const rackL = cabinL * 0.82;
    const rackW = cabinW * 0.90;
    const rX = cabinX - cabinL * 0.05;
    // Outer tube frame
    drawDeformedRect(rX - rackL / 2, -rackW / 2, rackL, rackW, '#0f172a');
    drawDeformedRect(rX - rackL / 2 + 1.2, -rackW / 2 + 1.2, rackL - 2.4, rackW - 2.4, '#334155');

    // Real spare off-road knobby tire strapped onto roof
    drawDeformedCircle(rX - rackL * 0.18, -rackW * 0.12, 4.5, '#0f172a', '#475569', 1.5);
    drawDeformedCircle(rX - rackL * 0.18, -rackW * 0.12, 2.0, '#64748b');

    // Two expedition fuel jerry cans (olive green and red)
    drawDeformedRect(rX + rackL * 0.22, -rackW * 0.35, 4.0, 2.8, '#3f6212'); // Olive jerrycan
    drawDeformedRect(rX + rackL * 0.22, -rackW * 0.35 + 3.2, 4.0, 2.8, '#b91c1c'); // Red jerrycan

    // Watertight black Pelican tool chest
    drawDeformedRect(rX + rackL * 0.10, rackW * 0.05, 5.0, rackW * 0.35, '#0f172a');

    // Ultra-bright roof LED lightbar across front of rack
    const isLightsOn = car.headlightsOn;
    drawDeformedRect(rX + rackL / 2 - 1.2, -rackW / 2 + 1.5, 1.8, rackW - 3.0, isLightsOn ? '#fef08a' : '#475569');
  } else if (car.type === 'crossover_compact') {
    // Stylish Urban Crossover
    // Contrast two-tone roof (black)
    const roofColor = '#0f172a';
    drawDeformedRect(cabinX - cabinL * 0.32, -cabinW * 0.38, cabinL * 0.64, cabinW * 0.76, roofColor);

    // Slim silver roof rails
    drawDeformedLine(cabinX - cabinL * 0.30, -cabinW * 0.44, cabinX + cabinL * 0.25, -cabinW * 0.44, '#cbd5e1', 1.5);
    drawDeformedLine(cabinX - cabinL * 0.30, cabinW * 0.44, cabinX + cabinL * 0.25, cabinW * 0.44, '#cbd5e1', 1.5);

    // Matte black wheel arch flares
    drawDeformedRect(halfL * 0.55, -halfW, 6.5, 1.2, '#1e293b');
    drawDeformedRect(halfL * 0.55, halfW - 1.2, 6.5, 1.2, '#1e293b');
    drawDeformedRect(-halfL * 0.65, -halfW, 6.5, 1.2, '#1e293b');
    drawDeformedRect(-halfL * 0.65, halfW - 1.2, 6.5, 1.2, '#1e293b');

    // Silver front chin plate
    drawDeformedRect(halfL - fc - 0.5, -halfW * 0.45, 2.0, halfW * 0.9, '#cbd5e1');
  } else if (car.type === 'suv_classic_box') {
    // Legendary Boxy Frame Offroader («Гелик» / G-Class / УАЗ-469)
    // Iconic raised turn signal indicator pods ON TOP of front fenders!
    drawDeformedRect(halfL * 0.68, -halfW * 0.85, 2.8, 1.8, '#f59e0b');
    drawDeformedRect(halfL * 0.68, halfW * 0.85 - 1.8, 2.8, 1.8, '#f59e0b');

    // Front tubular brush guard (кенгурятник) cleanly framing the center grille
    drawDeformedRect(halfL - fc + 0.2, -halfW * 0.45, 1.8, halfW * 0.90, '#1e293b');
    drawDeformedLine(halfL - fc + 0.4, -halfW * 0.45, halfL - fc - 1.6, -halfW * 0.45, '#334155', 1.8);
    drawDeformedLine(halfL - fc + 0.4, halfW * 0.45, halfL - fc - 1.6, halfW * 0.45, '#334155', 1.8);

    // Heavy steel spare tire carrier frame securely anchoring tire to rear tailgate door
    drawDeformedRect(-halfL + rc - 2.0, -1.8, 3.2, 3.6, '#0f172a');
    drawDeformedLine(-halfL + rc + 0.5, -2.5, -halfL + rc - 1.8, -1.8, '#334155', 1.6);
    drawDeformedLine(-halfL + rc + 0.5, 2.5, -halfL + rc - 1.8, 1.8, '#334155', 1.6);

    // Stainless steel external spare tire cover on rear door
    drawDeformedCircle(-halfL + rc - 1.8, 0, 4.2, '#cbd5e1', '#0f172a', 1.5);
    drawDeformedCircle(-halfL + rc - 1.8, 0, 2.2, '#334155');
    drawDeformedCircle(-halfL + rc - 1.8, 0, 0.9, '#f8fafc'); // Chrome central star/badge

    // Side-exit dual exhaust tips under left side sill
    drawDeformedRect(-halfL * 0.15, -halfW - 1.2, 3.5, 1.2, '#cbd5e1');
    drawDeformedRect(-halfL * 0.15, halfW, 3.5, 1.2, '#cbd5e1');

    // Exposed external door hinges on body flanks
    drawDeformedRect(halfL * 0.18, -halfW + 0.2, 1.2, 1.2, '#0f172a');
    drawDeformedRect(halfL * 0.18, halfW - 1.4, 1.2, 1.2, '#0f172a');
    drawDeformedRect(-halfL * 0.22, -halfW + 0.2, 1.2, 1.2, '#0f172a');
    drawDeformedRect(-halfL * 0.22, halfW - 1.4, 1.2, 1.2, '#0f172a');
  } else if (car.type === 'suv') {
    // Modern Family SUV / Crossover (RAV4 / Sportage style)
    // 1. Sleek silver roof rails on both flanks
    const railX1 = cabinX - cabinL * 0.32;
    const railX2 = cabinX + cabinL * 0.28;
    drawDeformedLine(railX1, -cabinW * 0.44, railX2, -cabinW * 0.44, '#cbd5e1', 1.6);
    drawDeformedLine(railX1, cabinW * 0.44, railX2, cabinW * 0.44, '#cbd5e1', 1.6);

    // 2. Rear roof tailgate spoiler
    const spoilerX = cabinX - cabinL * 0.46;
    drawDeformedRect(spoilerX, -cabinW * 0.42, 2.4, cabinW * 0.84, '#0f172a');

    // 3. Front & Rear brushed aluminum chin skid plates
    drawDeformedRect(halfL - fc - 0.6, -halfW * 0.42, 2.2, halfW * 0.84, '#cbd5e1');
    drawDeformedRect(-halfL + rc - 1.6, -halfW * 0.42, 2.2, halfW * 0.84, '#cbd5e1');

    // 4. Matte black protective wheel arch claddings
    const flareColor = '#1e293b';
    drawDeformedRect(halfL * 0.55, -halfW, 6.5, 1.2, flareColor);
    drawDeformedRect(halfL * 0.55, halfW - 1.2, 6.5, 1.2, flareColor);
    drawDeformedRect(-halfL * 0.65, -halfW, 6.5, 1.2, flareColor);
    drawDeformedRect(-halfL * 0.65, halfW - 1.2, 6.5, 1.2, flareColor);

    // 5. Dual chrome exhaust tips in rear diffuser
    drawDeformedRect(-halfL + rc - 1.2, -halfW * 0.62, 1.8, 2.5, '#cbd5e1');
    drawDeformedRect(-halfL + rc - 1.2, halfW * 0.62 - 2.5, 1.8, 2.5, '#cbd5e1');
  }

  // ==========================================
  // 5. SUPER & MUSCLE CARS (СУПЕРКАРЫ И МАСЛКАРЫ)
  // ==========================================
  else if (car.type === 'supercar') {
    // Mid-Engine Exotic Supercar (Aventador / Ferrari style)
    // Front aerodynamic carbon hood nostrils (S-duct)
    drawDeformedRect(halfL * 0.35, -halfW * 0.40, 4.0, 2.5, '#0f172a');
    drawDeformedRect(halfL * 0.35, halfW * 0.40 - 2.5, 4.0, 2.5, '#0f172a');
    drawDeformedRect(halfL - fc + 0.2, -halfW - 0.5, 1.8, car.width + 1.0, '#0f172a'); // Low carbon chin

    // Mid-engine transparent tempered glass engine bay!
    const engX = cabinX - cabinL * 0.65;
    const engL = halfL * 0.52;
    const engW = halfW * 1.35;
    drawDeformedRect(engX - engL / 2, -engW / 2, engL, engW, '#020617');

    // Detailed V10/V12 engine block with red intake plenums and silver exhaust manifolds!
    drawDeformedRect(engX - engL * 0.35, -engW * 0.25, engL * 0.70, engW * 0.50, '#1e293b');
    // Twin red cylinder heads
    drawDeformedRect(engX - engL * 0.30, -engW * 0.22, engL * 0.60, 2.4, '#dc2626');
    drawDeformedRect(engX - engL * 0.30, engW * 0.22 - 2.4, engL * 0.60, 2.4, '#dc2626');
    // Silver carbon cross-brace over engine
    drawDeformedLine(engX - engL * 0.35, -engW * 0.25, engX + engL * 0.35, engW * 0.25, '#94a3b8', 1.5);
    drawDeformedLine(engX - engL * 0.35, engW * 0.25, engX + engL * 0.35, -engW * 0.25, '#94a3b8', 1.5);

    // Massive GT carbon rear wing with side endplates
    const wingX = -halfL + rc + 2;
    drawDeformedRect(wingX, -halfW - 1.2, 3.2, car.width + 2.4, '#0f172a');
    drawDeformedRect(wingX - 1.0, -halfW - 1.8, 5.0, 1.6, '#0f172a'); // Left endplate
    drawDeformedRect(wingX - 1.0, halfW + 0.2, 5.0, 1.6, '#0f172a');  // Right endplate

    // Giant rear carbon diffuser with 4 massive exhaust cannon tips
    drawDeformedRect(-halfL + rc - 1.5, -halfW * 0.45, 1.8, halfW * 0.90, '#0f172a');
    drawDeformedCircle(-halfL + rc - 1.4, -4.5, 1.5, '#cbd5e1', '#0f172a', 0.8);
    drawDeformedCircle(-halfL + rc - 1.4, -1.5, 1.5, '#cbd5e1', '#0f172a', 0.8);
    drawDeformedCircle(-halfL + rc - 1.4, 1.5, 1.5, '#cbd5e1', '#0f172a', 0.8);
    drawDeformedCircle(-halfL + rc - 1.4, 4.5, 1.5, '#cbd5e1', '#0f172a', 0.8);
  } else if (car.type === 'muscle_classic') {
    // 1969 Vintage Muscle Car (Charger / SS with Supercharger Blower)
    // Iconic Supercharger blower protruding through hood cutout!
    const blowX = halfL * 0.35;
    drawDeformedRect(blowX - 3.5, -3.2, 7.0, 6.4, '#cbd5e1'); // Polished aluminum housing
    drawDeformedRect(blowX - 3.0, -2.8, 6.0, 5.6, '#e2e8f0');
    // Triple red intake butterflies facing forward
    drawDeformedCircle(blowX + 3.2, -1.8, 1.0, '#dc2626');
    drawDeformedCircle(blowX + 3.2, 0, 1.0, '#dc2626');
    drawDeformedCircle(blowX + 3.2, 1.8, 1.0, '#dc2626');

    // Bold twin white racing stripes down hood, roof and trunk
    const stripeW = 2.4;
    const stripeDist = 2.6;
    const stripeColor = '#ffffff';
    drawDeformedLine(-halfL + rc + 1, -stripeDist, halfL - fc - 1, -stripeDist, stripeColor, stripeW);
    drawDeformedLine(-halfL + rc + 1, stripeDist, halfL - fc - 1, stripeDist, stripeColor, stripeW);

    // Chrome front wrap-around bumper with hidden headlight grille
    drawDeformedRect(halfL - fc - 0.4, -halfW + 0.8, 2.2, car.width - 1.6, '#cbd5e1');
    drawDeformedRect(halfL - fc - 2.8, -halfW * 0.72, 2.4, halfW * 1.44, '#0f172a'); // Black muscle grille
    // Rear ducktail trunk spoiler
    drawDeformedRect(-halfL + rc + 0.5, -halfW * 0.82, 2.2, halfW * 1.64, '#0f172a');
  } else if (car.type === 'coupe_gt') {
    // Gran Turismo High-Speed Sports Coupe
    // Long sculpted power-dome hood
    drawDeformedLine(halfL * 0.15, -halfW * 0.35, halfL - fc - 2, -halfW * 0.28, 'rgba(255,255,255,0.25)', 1.0);
    drawDeformedLine(halfL * 0.15, halfW * 0.35, halfL - fc - 2, halfW * 0.28, 'rgba(255,255,255,0.25)', 1.0);

    // Fastback sloped rear window
    const fastL = cabinL * 0.45;
    drawDeformedRect(cabinX - cabinL * 0.50, -cabinW * 0.38, fastL, cabinW * 0.76, '#0f172a');

    // Quad stainless exhaust tips in rear diffuser
    drawDeformedRect(-halfL + rc - 1.2, -halfW * 0.65, 1.8, 3.2, '#cbd5e1');
    drawDeformedRect(-halfL + rc - 1.2, halfW * 0.65 - 3.2, 1.8, 3.2, '#cbd5e1');
  } else if (car.type === 'sports') {
    // High-Performance Sports Coupe (BRZ / Supra / 370Z style)
    // 1. Aggressive front carbon chin splitter
    drawDeformedRect(halfL - fc + 0.2, -halfW - 0.4, 1.8, car.width + 0.8, '#0f172a');

    // 2. Sculpted hood heat extractor vents
    drawDeformedRect(halfL * 0.32, -halfW * 0.35, 3.6, 2.0, '#1e293b');
    drawDeformedRect(halfL * 0.32, halfW * 0.35 - 2.0, 3.6, 2.0, '#1e293b');

    // 3. Aerodynamic side rocker sill extensions
    drawDeformedLine(-halfL * 0.35, -halfW - 0.8, halfL * 0.35, -halfW - 0.8, '#0f172a', 1.5);
    drawDeformedLine(-halfL * 0.35, halfW + 0.8, halfL * 0.35, halfW + 0.8, '#0f172a', 1.5);

    // 4. Low-profile aerodynamic ducktail rear deck spoiler
    const spoilerX = -halfL + rc + 1.2;
    drawDeformedRect(spoilerX, -halfW * 0.65, 2.2, halfW * 1.30, '#0f172a');

    // 5. Dual large-bore stainless sports exhaust tips
    drawDeformedCircle(-halfL + rc - 1.2, -halfW * 0.55, 1.4, '#e2e8f0', '#0f172a', 0.8);
    drawDeformedCircle(-halfL + rc - 1.2, halfW * 0.55, 1.4, '#e2e8f0', '#0f172a', 0.8);
  }

  // ==========================================
  // 6. UTILITY, PICKUPS & COMMERCIAL
  // ==========================================
  else if (car.type === 'pickup') {
    // Single-Cab Compact Pickup Truck (Hilux / УАЗ Карго style)
    // 1. Open cargo bed with rugged black liner
    const bedX1 = -halfL + rc + 2.5;
    const bedX2 = cabinX - cabinL / 2 - 1.2;
    const bedW = halfW * 2 - 3.8;
    drawDeformedRect(bedX1, -bedW / 2, bedX2 - bedX1, bedW, '#1e293b');
    // Ribbed cargo bed floor slats
    for (let by = -bedW / 2 + 2; by < bedW / 2; by += 2.5) {
      drawDeformedLine(bedX1 + 1, by, bedX2 - 1, by, '#334155', 1.0);
    }

    // 2. Tubular steel cab guard (headache rack) behind rear cabin window
    const rackX = cabinX - cabinL / 2 - 0.6;
    drawDeformedLine(rackX, -halfW * 0.82, rackX, halfW * 0.82, '#0f172a', 2.0);
    drawDeformedLine(rackX, -halfW * 0.35, rackX, halfW * 0.35, '#475569', 1.2);

    // 3. Drop tailgate with center handle & rear step bumper
    drawDeformedRect(bedX1 - 1.4, -bedW / 2 + 1, 1.6, bedW - 2, car.color);
    drawDeformedRect(bedX1 - 1.8, -1.5, 1.2, 3.0, '#0f172a'); // Tailgate handle
    drawDeformedRect(-halfL + rc - 2.2, -halfW * 0.65, 1.8, halfW * 1.30, '#334155'); // Step bumper
    drawDeformedCircle(-halfL + rc - 2.2, 0, 1.1, '#cbd5e1'); // Tow hitch ball
  } else if (car.type === 'pickup_heavy') {
    // Heavy Duty Dually 4x4 Pickup Truck (3500 HD)
    // Massive flared dually rear fenders (wide hips!)
    const duallyX = -halfL * 0.60;
    const duallyL = 14;
    const duallyW = 2.4;
    drawDeformedRect(duallyX - duallyL / 2, -halfW - duallyW + 0.8, duallyL, duallyW, car.color);
    drawDeformedRect(duallyX - duallyL / 2, halfW - 0.8, duallyL, duallyW, car.color);
    drawDeformedLine(duallyX - duallyL / 2, -halfW - duallyW + 0.8, duallyX + duallyL / 2, -halfW - duallyW + 0.8, 'rgba(0,0,0,0.4)', 1.0);
    drawDeformedLine(duallyX - duallyL / 2, halfW + duallyW - 0.8, duallyX + duallyL / 2, halfW + duallyW - 0.8, 'rgba(0,0,0,0.4)', 1.0);

    // Open truck bed with diamond-plate bed liner
    const bedX1 = -halfL + rc + 3;
    const bedX2 = cabinX - cabinL / 2 - 1.5;
    const bedW = halfW * 2 - 4.5;
    drawDeformedRect(bedX1, -bedW / 2, bedX2 - bedX1, bedW, '#1e293b');
    // Bed floor ribs
    for (let by = -bedW / 2 + 2; by < bedW / 2; by += 2.8) {
      drawDeformedLine(bedX1 + 1, by, bedX2 - 1, by, '#334155', 1.0);
    }

    // Heavy black bed roll bar with 4 forward-facing KC offroad spotlights
    const barX = bedX2 - 4;
    drawDeformedLine(barX, -halfW * 0.78, barX, halfW * 0.78, '#0f172a', 2.5);
    for (let ly = -halfW * 0.55; ly <= halfW * 0.55; ly += halfW * 0.36) {
      // Forward-facing spotlight bucket & front glass lens (strictly fixed, no expanding circle!)
      drawDeformedRect(barX - 0.4, ly - 1.2, 1.2, 2.4, '#0f172a');
      drawDeformedRect(barX + 0.6, ly - 1.0, 0.6, 2.0, car.headlightsOn ? '#fffbeb' : '#64748b');
      if (car.headlightsOn) {
        drawDeformedRect(barX + 0.2, ly - 0.3, 0.4, 0.6, '#ffffff');
      }
    }

    // 5 amber cab clearance marker lights across roof edge
    const cabFrontX = cabinX + cabinL * 0.28;
    for (let my = -cabinW * 0.35; my <= cabinW * 0.35; my += cabinW * 0.175) {
      drawDeformedRect(cabFrontX, my - 0.6, 1.2, 1.2, '#f59e0b');
    }

    // Heavy trailer hitch (фаркоп) on rear
    drawDeformedRect(-halfL + rc - 3.2, -1.5, 3.2, 3.0, '#0f172a');
    drawDeformedCircle(-halfL + rc - 3.2, 0, 1.2, '#cbd5e1');
  } else if (car.type === 'van') {
    // Modern Commercial & Business Transporter Van (Sprinter / V-Class style)
    // 1. Sleek Aerodynamic Front Grille with Chrome Trim Blades & Center Star/Emblem
    drawDeformedRect(halfL - fc - 2.6, -halfW * 0.48, 2.4, halfW * 0.96, '#1e293b');
    drawDeformedLine(halfL - fc - 2.0, -halfW * 0.44, halfL - fc - 2.0, halfW * 0.44, '#cbd5e1', 1.2);
    drawDeformedLine(halfL - fc - 1.0, -halfW * 0.44, halfL - fc - 1.0, halfW * 0.44, '#cbd5e1', 1.2);
    drawDeformedCircle(halfL - fc - 1.4, 0, 1.4, '#f8fafc', '#cbd5e1', 0.8);

    // 2. Lower Bumper Air Dam & Integrated Fog Light Bezels
    drawDeformedRect(halfL - fc - 0.6, -halfW * 0.40, 1.4, halfW * 0.80, '#0f172a');
    drawDeformedRect(halfL - fc - 1.2, -halfW * 0.76, 1.4, 1.8, '#1e293b');
    drawDeformedRect(halfL - fc - 1.2, halfW * 0.76 - 1.8, 1.4, 1.8, '#1e293b');
    drawDeformedCircle(halfL - fc - 0.5, -halfW * 0.76 + 0.9, 0.7, '#fef08a');
    drawDeformedCircle(halfL - fc - 0.5, halfW * 0.76 - 0.9, 0.7, '#fef08a');

    // 3. Aerodynamic Side Mirrors with Integrated Turn Signal Repeaters
    const mirrorX = cabinX + cabinL * 0.32;
    drawDeformedRect(mirrorX, -halfW - 2.0, 2.2, 2.0, car.color);
    drawDeformedLine(mirrorX + 0.4, -halfW - 2.0, mirrorX + 0.4, -halfW, '#f59e0b', 0.8);
    drawDeformedRect(mirrorX, halfW, 2.2, 2.0, car.color);
    drawDeformedLine(mirrorX + 0.4, halfW, mirrorX + 0.4, halfW + 2.0, '#f59e0b', 0.8);

    // 4. Side Body Protective Molding Strips Along Flanks
    drawDeformedLine(-halfL + rc + 3, -halfW + 0.5, halfL - fc - 3, -halfW + 0.5, '#1e293b', 1.4);
    drawDeformedLine(-halfL + rc + 3, halfW - 0.5, halfL - fc - 3, halfW - 0.5, '#1e293b', 1.4);

    // 5. Rear Cargo Step Bumper & Dual Vertical Taillight Columns
    drawDeformedRect(-halfL + rc - 1.8, -halfW * 0.55, 1.8, halfW * 1.10, '#1e293b'); // Step tread
    drawDeformedRect(-halfL + rc + 0.2, -halfW * 0.82, 1.6, 6.0, car.brakeLightsOn ? '#ef4444' : '#991b1b');
    drawDeformedRect(-halfL + rc + 0.2, halfW * 0.82 - 6.0, 1.6, 6.0, car.brakeLightsOn ? '#ef4444' : '#991b1b');
  } else if (car.type === 'van_camper') {
    // Adventure Campervan / Expedition Motorhome (RV)
    // 1. Front Cab Styling & Aerodynamic Mirrors
    const mirrorX = cabinX + cabinL * 0.30;
    drawDeformedRect(mirrorX, -halfW - 2.0, 2.2, 2.0, '#f8fafc');
    drawDeformedLine(mirrorX + 0.4, -halfW - 2.0, mirrorX + 0.4, -halfW, '#f59e0b', 0.8);
    drawDeformedRect(mirrorX, halfW, 2.2, 2.0, '#f8fafc');
    drawDeformedLine(mirrorX + 0.4, halfW, mirrorX + 0.4, halfW + 2.0, '#f59e0b', 0.8);

    // Front lower cooling grille
    drawDeformedRect(halfL - fc - 2.0, -halfW * 0.42, 1.8, halfW * 0.84, '#1e293b');

    // 2. Rear Wall Aluminum Roof Access Ladder (left rear door)
    const ladderY = -halfW * 0.48;
    drawDeformedLine(-halfL + rc + 0.2, ladderY - 1.5, -halfL + rc - 1.8, ladderY - 1.5, '#cbd5e1', 1.2);
    drawDeformedLine(-halfL + rc + 0.2, ladderY + 1.5, -halfL + rc - 1.8, ladderY + 1.5, '#cbd5e1', 1.2);
    for (let lx = -halfL + rc; lx >= -halfL + rc - 1.8; lx -= 0.8) {
      drawDeformedLine(lx, ladderY - 1.5, lx, ladderY + 1.5, '#cbd5e1', 1.0);
    }

    // 3. Heavy-Duty Rear Bike Carrier (STURDILY ANCHORED to rear wall & bumper — NO FLOATING!)
    const rackMountX = -halfL + rc + 0.2;
    const bikeTrayX = -halfL + rc - 2.2;
    // Solid mounting brackets connecting camper body to bike tray
    drawDeformedLine(rackMountX, -halfW * 0.20, bikeTrayX, -halfW * 0.20, '#475569', 1.8);
    drawDeformedLine(rackMountX, halfW * 0.50, bikeTrayX, halfW * 0.50, '#475569', 1.8);
    drawDeformedLine(rackMountX, 0, bikeTrayX, 0, '#475569', 1.6);
    // Transverse aluminum support tray rails
    drawDeformedLine(bikeTrayX, -halfW * 0.25, bikeTrayX, halfW * 0.68, '#94a3b8', 2.0);
    drawDeformedLine(bikeTrayX - 1.4, -halfW * 0.25, bikeTrayX - 1.4, halfW * 0.68, '#64748b', 1.6);

    // 4. Two Mountain Bikes Firmly Clamped into Wheel Trays
    // Bike 1 (Red frame):
    drawDeformedLine(bikeTrayX - 0.7, -halfW * 0.18, bikeTrayX - 0.7, halfW * 0.20, '#dc2626', 1.6); // Frame tube
    drawDeformedLine(bikeTrayX - 2.0, 0, bikeTrayX, 0, '#94a3b8', 1.2); // Handlebars
    drawDeformedRect(bikeTrayX - 1.2, -halfW * 0.24, 1.8, 1.4, '#0f172a'); // Front wheel
    drawDeformedRect(bikeTrayX - 1.2, halfW * 0.20, 1.8, 1.4, '#0f172a'); // Rear wheel

    // Bike 2 (Blue frame):
    drawDeformedLine(bikeTrayX - 1.8, halfW * 0.05, bikeTrayX - 1.8, halfW * 0.62, '#2563eb', 1.6); // Frame tube
    drawDeformedLine(bikeTrayX - 3.0, halfW * 0.35, bikeTrayX - 1.0, halfW * 0.35, '#94a3b8', 1.2); // Handlebars
    drawDeformedRect(bikeTrayX - 2.2, halfW * 0.02, 1.8, 1.4, '#0f172a'); // Front wheel
    drawDeformedRect(bikeTrayX - 2.2, halfW * 0.62, 1.8, 1.4, '#0f172a'); // Rear wheel

    // 5. Camper Rear Step Bumper & Tow Hitch
    drawDeformedRect(-halfL + rc - 1.5, -halfW * 0.85, 1.6, halfW * 1.70, '#1e293b');
    drawDeformedRect(-halfL + rc + 0.2, -halfW * 0.82, 1.6, 5.0, car.brakeLightsOn ? '#ef4444' : '#991b1b');
    drawDeformedRect(-halfL + rc + 0.2, halfW * 0.82 - 5.0, 1.6, 5.0, car.brakeLightsOn ? '#ef4444' : '#991b1b');
    drawDeformedRect(-halfL + rc - 3.0, -1.2, 1.8, 2.4, '#0f172a'); // Trailer hitch
    drawDeformedCircle(-halfL + rc - 3.0, 0, 1.0, '#cbd5e1');

    // 6. Roll-Out Awning Case (Маркиза) on passenger side flank
    const awningX1 = cabinX - cabinL * 0.28;
    const awningX2 = cabinX + cabinL * 0.22;
    drawDeformedRect(awningX1, halfW - 1.0, awningX2 - awningX1, 2.2, '#334155');
    drawDeformedLine(awningX1, halfW + 1.0, awningX2, halfW + 1.0, '#cbd5e1', 1.0);

    // 7. Roof Living Amenities (Dometic AC unit, Skylight Dome & Solar Panels)
    // High-efficiency black photovoltaic solar panel
    const solarX = cabinX - cabinL * 0.15;
    const solarL = cabinL * 0.26;
    const solarW = cabinW * 0.65;
    drawDeformedRect(solarX - solarL / 2, -solarW / 2, solarL, solarW, '#0f172a');
    drawDeformedRect(solarX - solarL / 2 + 0.8, -solarW / 2 + 0.8, solarL - 1.6, solarW - 1.6, '#1e293b');
    drawDeformedLine(solarX, -solarW / 2 + 1, solarX, solarW / 2 - 1, '#38bdf8', 0.8);
    drawDeformedLine(solarX - solarL / 4, -solarW / 2 + 1, solarX - solarL / 4, solarW / 2 - 1, '#38bdf8', 0.6);
    drawDeformedLine(solarX + solarL / 4, -solarW / 2 + 1, solarX + solarL / 4, solarW / 2 - 1, '#38bdf8', 0.6);

    // Aerodynamic rooftop air conditioner pod
    const acX = cabinX + cabinL * 0.14;
    drawDeformedRect(acX - 4.0, -cabinW * 0.25, 8.0, cabinW * 0.50, '#f8fafc');
    drawDeformedCircle(acX, 0, 1.8, '#64748b');

    // Translucent acrylic roof skylight hatch with ventilation trim
    const ventX = cabinX - cabinL * 0.34;
    drawDeformedRect(ventX - 2.5, -2.5, 5.0, 5.0, 'rgba(56, 189, 248, 0.4)');
    drawDeformedLine(ventX - 2.5, -2.5, ventX + 2.5, -2.5, '#cbd5e1', 1.0);
    drawDeformedLine(ventX + 2.5, -2.5, ventX + 2.5, 2.5, '#cbd5e1', 1.0);
    drawDeformedLine(ventX + 2.5, 2.5, ventX - 2.5, 2.5, '#cbd5e1', 1.0);
    drawDeformedLine(ventX - 2.5, 2.5, ventX - 2.5, -2.5, '#cbd5e1', 1.0);
  } else if (car.type === 'van_cargo_old') {
    // Retro Cab-Over Van («Буханка» / УАЗ-452)
    // Iconic split dual-pane flat windshield with center pillar
    const glassX = cabinX + cabinL * 0.36;
    drawDeformedLine(glassX, -cabinW * 0.40, glassX, -1.0, '#38bdf8', 2.0);
    drawDeformedLine(glassX, 1.0, glassX, cabinW * 0.40, '#38bdf8', 2.0);
    drawDeformedLine(glassX - 0.5, 0, glassX + 1.5, 0, car.color, 1.5); // Center split bar

    // Rounded retro nose with front stamped cooling slots
    drawDeformedRect(halfL - fc - 2.2, -halfW * 0.45, 1.8, halfW * 0.90, '#1e293b');

    // Full-length steel tubular expedition roof rack with ladder
    const rackX1 = cabinX - cabinL * 0.40;
    const rackX2 = cabinX + cabinL * 0.30;
    const rackW = cabinW * 0.86;
    drawDeformedLine(rackX1, -rackW / 2, rackX2, -rackW / 2, '#475569', 1.6);
    drawDeformedLine(rackX1, rackW / 2, rackX2, rackW / 2, '#475569', 1.6);
    drawDeformedLine(rackX1, -rackW / 2, rackX1, rackW / 2, '#475569', 1.6);
    drawDeformedLine(rackX2, -rackW / 2, rackX2, rackW / 2, '#475569', 1.6);
    for (let rx = rackX1 + 5; rx < rackX2; rx += 6) {
      drawDeformedLine(rx, -rackW / 2, rx, rackW / 2, '#475569', 1.2);
    }
  } else if (effectiveType === 'truck_tow') {
    // =========================================================================
    // SLIDING FLATBED ROLLBACK & WHEEL-LIFT TOW TRUCK (ЭВАКУАТОР СО СДВИЖНОЙ ПЛАТФОРМОЙ И КМУ)
    // =========================================================================
    const cabBackX = resolvedTruck ? resolvedTruck.cabRearX : (cabinX - cabinL / 2);
    const deckX1 = resolvedTruck ? resolvedTruck.rearBodyX + 0.4 : (-halfL + rc + 1.5);
    const deckX2 = cabBackX - 1.4;
    const deckL = Math.max(14, deckX2 - deckX1);
    const deckW = halfW * 2 - 0.6;
    const halfDeckW = deckW / 2;

    // 1. Subframe Shadow & Heavy Steel Rollback Deck Side Rails (Жёлто-чёрная окантовка платформы)
    drawDeformedRect(deckX1 - 0.6, -halfDeckW - 0.4, deckL + 1.2, deckW + 0.8, 'rgba(2, 6, 23, 0.45)');
    drawDeformedRect(deckX1, -halfDeckW, deckL, deckW, '#eab308');
    // Black hazard chevron stripes along outer side rails
    for (let sx = deckX1 + 1.5; sx < deckX2 - 1.5; sx += 4.0) {
      drawDeformedRect(sx, -halfDeckW, 1.8, 1.4, '#0f172a');
      drawDeformedRect(sx, halfDeckW - 1.4, 1.8, 1.4, '#0f172a');
    }

    // 2. Perforated Galvanized Steel Wheel Tracks & Central Diamond-Plate Walkway
    const trackW = 3.8;
    // Left & Right perforated wheel runways
    [-halfDeckW + 1.4, halfDeckW - 1.4 - trackW].forEach(ty => {
      drawDeformedRect(deckX1 + 1.2, ty, deckL - 3.6, trackW, '#64748b');
      drawDeformedLine(deckX1 + 1.2, ty, deckX2 - 2.4, ty, '#1e293b', 0.8);
      drawDeformedLine(deckX1 + 1.2, ty + trackW, deckX2 - 2.4, ty + trackW, '#1e293b', 0.8);
      // Punched anti-slip oval slots along wheel tracks
      for (let px = deckX1 + 2.4; px < deckX2 - 3.2; px += 2.2) {
        drawDeformedRect(px, ty + 0.6, 1.0, trackW - 1.2, '#1e293b');
      }
    });
    // Central dark steel deck bay between wheel tracks
    const centerW = Math.max(2.0, deckW - 2.8 - trackW * 2);
    drawDeformedRect(deckX1 + 1.2, -centerW / 2, deckL - 3.6, centerW, '#1e293b');
    for (let cx = deckX1 + 3.0; cx < deckX2 - 3.5; cx += 3.5) {
      drawDeformedLine(cx, -centerW / 2 + 0.4, cx, centerW / 2 - 0.4, '#334155', 0.7);
    }

    // 3. Front Protective Flyer / Pylon Arch with Lightbar & Hydraulic Winch (Передняя дуга и лебёдка)
    const pylonX = deckX2 - 2.2;
    drawDeformedRect(pylonX, -halfDeckW, 2.2, deckW, '#0f172a');
    drawDeformedRect(pylonX + 0.3, -halfDeckW + 0.6, 1.6, deckW - 1.2, '#eab308');
    // Heavy hydraulic winch drum with spooled steel wire rope
    drawDeformedRect(pylonX - 2.0, -3.2, 2.4, 6.4, '#0f172a');
    drawDeformedRect(pylonX - 1.6, -2.2, 1.8, 4.4, '#94a3b8'); // Steel cable spool
    // Wire rope + forged red tow hook stretched down the center of deck
    drawDeformedLine(pylonX - 1.6, 0, deckX1 + 5.5, 0, '#cbd5e1', 0.8);
    drawDeformedCircle(deckX1 + 5.0, 0, 0.9, '#ef4444');
    // Adjustable yellow wheel chocks on deck
    drawDeformedRect(pylonX - 5.5, -halfDeckW + 1.8, 1.4, trackW - 0.8, '#eab308');
    drawDeformedRect(pylonX - 5.5, halfDeckW - 1.0 - trackW, 1.4, trackW - 0.8, '#eab308');

    // 4. Rear Beavertail Approach Ramp & Hydraulic Wheel-Lift Stinger ("Очки" частичной погрузки)
    drawDeformedRect(deckX1, -halfDeckW + 0.6, 1.6, deckW - 1.2, '#334155');
    for (let ry = -halfDeckW + 1.4; ry < halfDeckW - 1.8; ry += 2.0) {
      drawDeformedLine(deckX1 + 0.2, ry, deckX1 + 1.4, ry, '#eab308', 0.8);
    }
    // Hydraulic underlift stinger boom & crossbar extending from rear
    const stingerX = deckX1 - 2.8;
    drawDeformedRect(stingerX, -1.2, 2.8, 2.4, '#0f172a');
    drawDeformedRect(stingerX - 1.2, -halfDeckW * 0.68, 1.4, deckW * 0.68, '#eab308');
    drawDeformedRect(stingerX - 2.2, -halfDeckW * 0.66, 1.8, 2.2, '#0f172a');
    drawDeformedRect(stingerX - 2.2, halfDeckW * 0.66 - 2.2, 1.8, 2.2, '#0f172a');
  } else if (effectiveType === 'truck_armored') {
    // =========================================================================
    // HEAVILY ARMORED CASH-IN-TRANSIT VAULT BODY (БРОНЕКУЗОВ «ИНКАССАЦИЯ» ГОСТ Р 50574)
    // =========================================================================
    const cabBackX = resolvedTruck ? resolvedTruck.cabRearX : (cabinX - cabinL / 2);
    const vaultX1 = resolvedTruck ? resolvedTruck.rearBodyX + 0.4 : (-halfL + rc + 1.5);
    const vaultX2 = resolvedTruck ? cabBackX - 0.8 : (cabinX + cabinL * 0.44);
    const vaultL = Math.max(12, vaultX2 - vaultX1);
    const vaultW = halfW * 2 - 0.8;
    const halfVaultW = vaultW / 2;

    // 1. Armored Vault Base Shell (Beige-grey ballistic steel with welded overlap seams)
    drawDeformedRect(vaultX1 - 0.4, -halfVaultW - 0.4, vaultL + 0.8, vaultW + 0.8, 'rgba(2, 6, 23, 0.48)');
    const armorGrad = ctx.createLinearGradient(0, -halfVaultW, 0, halfVaultW);
    armorGrad.addColorStop(0, '#a8a29e');
    armorGrad.addColorStop(0.18, '#f5f5f4');
    armorGrad.addColorStop(0.50, '#e7e5e4');
    armorGrad.addColorStop(0.82, '#d6d3d1');
    armorGrad.addColorStop(1, '#78716c');
    drawDeformedRect(vaultX1, -halfVaultW, vaultL, vaultW, armorGrad);

    // 2. Emerald Green GOST Security Livery Bands (Цветографическая схема «Инкассация» и «РОСИНКАС»)
    drawDeformedRect(vaultX1, -halfVaultW + 0.4, vaultL, 2.2, '#15803d');
    drawDeformedLine(vaultX1, -halfVaultW + 2.6, vaultX2, -halfVaultW + 2.6, '#ffffff', 0.6);
    drawDeformedRect(vaultX1, halfVaultW - 2.6, vaultL, 2.2, '#15803d');
    drawDeformedLine(vaultX1, halfVaultW - 2.6, vaultX2, halfVaultW - 2.6, '#ffffff', 0.6);

    // Heavy overlapping ballistic steel roof plates & rivets
    drawDeformedLine(vaultX1, -halfVaultW, vaultX2, -halfVaultW, '#1e293b', 1.3);
    drawDeformedLine(vaultX1, halfVaultW, vaultX2, halfVaultW, '#1e293b', 1.3);
    drawDeformedLine(vaultX2, -halfVaultW, vaultX2, halfVaultW, '#1e293b', 1.3);
    drawDeformedLine(vaultX1, -halfVaultW, vaultX1, halfVaultW, '#1e293b', 1.3);

    const seamStep = Math.max(5.0, vaultL / 4);
    for (let sx = vaultX1 + seamStep; sx < vaultX2 - 2.0; sx += seamStep) {
      drawDeformedLine(sx, -halfVaultW + 1.0, sx, halfVaultW - 1.0, '#78716c', 0.9);
      for (let ry = -halfVaultW + 2.0; ry <= halfVaultW - 2.0; ry += 2.8) {
        drawDeformedCircle(sx - 0.3, ry, 0.25, '#44403c');
      }
    }

    // 3. Circular Ballistic Gun Loops / Firing Ports along Sides (Бойницы с бронезаглушками)
    [0.25, 0.55, 0.80].forEach(frac => {
      const px = vaultX1 + vaultL * frac;
      drawDeformedCircle(px, -halfVaultW + 0.9, 1.1, '#0f172a');
      drawDeformedCircle(px, -halfVaultW + 0.9, 0.55, '#64748b');
      drawDeformedCircle(px, halfVaultW - 0.9, 1.1, '#0f172a');
      drawDeformedCircle(px, halfVaultW - 0.9, 0.55, '#64748b');
    });

    // 4. Armored Roof Escape Hatch, FVU Filtration Domes & GLONASS Antenna
    const hatchX = vaultX1 + vaultL * 0.58;
    drawDeformedRect(hatchX - 3.2, -2.8, 6.4, 5.6, '#1e293b');
    drawDeformedRect(hatchX - 2.6, -2.2, 5.2, 4.4, '#57534e');
    drawDeformedLine(hatchX - 2.4, 0, hatchX + 2.4, 0, '#1e293b', 0.9);
    drawDeformedLine(hatchX, -2.0, hatchX, 2.0, '#1e293b', 0.9);
    drawDeformedCircle(hatchX - 1.2, 0, 0.55, '#cbd5e1');
    drawDeformedCircle(hatchX + 1.2, 0, 0.55, '#cbd5e1');

    // Dual mushroom air filtration domes (Грибки ФВУ)
    const fvuX = vaultX1 + vaultL * 0.24;
    drawDeformedCircle(fvuX, -vaultW * 0.22, 1.6, '#1e293b', '#78716c', 0.5);
    drawDeformedCircle(fvuX, vaultW * 0.22, 1.6, '#1e293b', '#78716c', 0.5);

    // GLONASS/GPS satellite tracking dome & green roof lettering
    const satX = vaultX1 + vaultL * 0.84;
    drawDeformedCircle(satX, 0, 1.5, '#ffffff', '#15803d', 0.5);

    // 5. Rear Armored Vault Door, External Hinges & Collector Step Bumper
    drawDeformedRect(vaultX1 - 1.6, -halfVaultW * 0.82, 1.6, vaultW * 0.82, '#0f172a');
    drawDeformedRect(vaultX1 - 0.4, -0.8, 1.6, 1.6, '#0f172a'); // Heavy vault deadbolt
  } else if (car.type === 'delivery_truck') {
    // City Delivery Stepvan (FedEx / UPS style)
    // Ribbed corrugated cargo body
    const bodyX1 = -halfL + rc + 3;
    const bodyX2 = cabinX + cabinL * 0.15;
    const bodyW = halfW * 2 - 1.5;
    drawDeformedRect(bodyX1, -bodyW / 2, bodyX2 - bodyX1, bodyW, car.color);

    // Translucent fiberglass roof panel (allows light into cargo hold)
    drawDeformedRect(bodyX1 + 3, -bodyW * 0.25, bodyX2 - bodyX1 - 6, bodyW * 0.50, '#f8fafc');

    // Corrugated vertical side rib lines
    for (let rx = bodyX1 + 4; rx < bodyX2 - 4; rx += 5) {
      drawDeformedLine(rx, -bodyW / 2, rx, -bodyW * 0.30, 'rgba(0,0,0,0.3)', 1.0);
      drawDeformedLine(rx, bodyW * 0.30, rx, bodyW / 2, 'rgba(0,0,0,0.3)', 1.0);
    }

    // Rear roll-up shutter door with step bumper
    drawDeformedRect(bodyX1 - 1.2, -bodyW * 0.40, 1.4, bodyW * 0.80, '#94a3b8');
    drawDeformedRect(bodyX1 - 2.8, -halfW * 0.65, 1.6, halfW * 1.30, '#0f172a');
  }

  // --- EMERGENCY & UTILITY ROOF SIRENS & DYNAMIC LIGHTBARS ---
  const isEmergency = effectiveType === 'police' || effectiveType === 'fire_engine' || 
                      effectiveType === 'fire_ladder' || effectiveType === 'fire_rescue' ||
                      effectiveType === 'ambulance' || effectiveType === 'ambulance_van' || 
                      effectiveType === 'ambulance_suv' || effectiveType === 'truck_tow' || 
                      effectiveType === 'truck_armored';

  if (isEmergency) {
    const isTow = effectiveType === 'truck_tow';
    const isArmored = effectiveType === 'truck_armored';
    // Tow trucks flash amber beacon when moving or working; emergency cars when siren active
    const isSirenActive = isTow ? (car.speed > 5 || car.isHonking) : (isArmored ? car.speed > 30 : car.sirenOn === true);
    const strobe = isSirenActive ? (Math.floor(Date.now() / 90) % 4) : -1;

    const barW = isTow ? cabinW * 0.7 : (isArmored ? 4 : cabinW * 0.9);
    const sirenX = resolvedTruck ? resolvedTruck.cabinX : (isTow ? (cabinX + cabinL * 0.1) : cabinX);

    // Note: Configurable trucks (resolvedTruck) already draw authentic roof beacons on their cab roofs in vehicleArchetypes.ts
    if (!resolvedTruck) {
      drawDeformedRect(sirenX - 1.5, -barW / 2, 3, barW, '#0f172a');

      const isFire = effectiveType === 'fire_engine' || effectiveType === 'fire_ladder' || effectiveType === 'fire_rescue';
      const primaryColor = isTow ? '#f59e0b' : (isArmored ? '#3b82f6' : (isFire ? '#ef4444' : '#3b82f6'));
      const secondaryColor = isTow ? '#f59e0b' : (isArmored ? '#f59e0b' : (isFire ? '#3b82f6' : '#ef4444'));

      if (strobe === 0 || strobe === 1) {
        drawDeformedRect(sirenX - 1, -barW * 0.45, 2, barW * 0.4, primaryColor);
      } else {
        drawDeformedRect(sirenX - 1, -barW * 0.45, 2, barW * 0.4, isSirenActive ? '#78350f' : '#1e293b');
      }

      if (strobe === 2 || strobe === 3) {
        drawDeformedRect(sirenX - 1, barW * 0.05, 2, barW * 0.4, secondaryColor);
      } else {
        drawDeformedRect(sirenX - 1, barW * 0.05, 2, barW * 0.4, isSirenActive ? '#78350f' : '#311010');
      }

      drawDeformedRect(sirenX - 1.2, -1, 2.4, 2, '#ffffff');
    }

    // Auxiliary rear strobes on ambulance van & fire rescue
    if (effectiveType === 'ambulance_van' || effectiveType === 'fire_rescue' || effectiveType === 'fire_ladder') {
      const rearStrobeX = resolvedTruck ? resolvedTruck.rearBodyX + 1.2 : (-halfL + rc + 3);
      drawDeformedRect(rearStrobeX, -halfW + 1.5, 2, 2.5, (strobe === 0 || strobe === 2) ? '#3b82f6' : '#1e293b');
      drawDeformedRect(rearStrobeX, halfW - 4, 2, 2.5, (strobe === 1 || strobe === 3) ? '#ef4444' : '#1e293b');
    }

    // Night & ambient dynamic light glow
    if (isSirenActive && nightAlpha > 0.05) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      const [dcabinX, dcabinY1] = deform(sirenX, -barW * 0.35);
      const [dcabinX2, dcabinY2] = deform(sirenX, barW * 0.35);

      const glowColor1 = isTow ? 'rgba(245, 158, 11, 0.55)' : ((strobe === 0 || strobe === 1) ? 'rgba(59, 130, 246, 0.55)' : 'rgba(59, 130, 246, 0.15)');
      const leftGlow = ctx.createRadialGradient(dcabinX, dcabinY1, 1, dcabinX, dcabinY1, 24);
      leftGlow.addColorStop(0, glowColor1);
      leftGlow.addColorStop(1, isTow ? 'rgba(245, 158, 11, 0)' : 'rgba(59, 130, 246, 0)');
      ctx.fillStyle = leftGlow;
      ctx.beginPath(); ctx.arc(dcabinX, dcabinY1, 24, 0, Math.PI * 2); ctx.fill();

      const glowColor2 = isTow ? 'rgba(245, 158, 11, 0.55)' : ((strobe === 2 || strobe === 3) ? 'rgba(239, 68, 68, 0.55)' : 'rgba(239, 68, 68, 0.15)');
      const rightGlow = ctx.createRadialGradient(dcabinX2, dcabinY2, 1, dcabinX2, dcabinY2, 24);
      rightGlow.addColorStop(0, glowColor2);
      rightGlow.addColorStop(1, isTow ? 'rgba(245, 158, 11, 0)' : 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = rightGlow;
      ctx.beginPath(); ctx.arc(dcabinX2, dcabinY2, 24, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // --- SOVIET TRACTORS: MTZ-82.1 / MTZ-80 / MTZ-80 OLD (PREMIUM TOP-DOWN TEXTURES) ---
  if (car.type === 'tractor_mtz82' || car.type === 'tractor_mtz80' || car.type === 'tractor_mtz80_old') {
    const isOld = car.type === 'tractor_mtz80_old';
    const is82 = car.type === 'tractor_mtz82';
    const hoodX1 = cabinX + cabinL / 2;
    const hoodX2 = halfL - fc - 0.5;
    const hoodW = halfW * 0.68;

    // -------------------------------------------------------------------------
    // 1. FRONT NOSE & TOWING BRACKET (NO COUNTERWEIGHTS)
    // -------------------------------------------------------------------------
    drawDeformedRect(hoodX2 - 1.0, -2.4, 2.2, 4.8, '#1e293b');
    drawDeformedCircle(hoodX2 + 0.6, 0, 0.8, '#cbd5e1'); // Drop pin

    // -------------------------------------------------------------------------
    // 2. FRONT CORNER MARKERS & TURN INDICATOR PODS (Указатели поворота / габариты УП-101)
    // -------------------------------------------------------------------------
    const turnX = cabinX + cabinL / 2 + 0.6;
    const turnY = cabinW * 0.48;
    // Left marker pod (White parking front + Amber turn side)
    drawDeformedRect(turnX - 0.8, -turnY - 1.5, 1.6, 2.2, '#0f172a');
    drawDeformedRect(turnX, -turnY - 1.2, 0.6, 1.0, '#f8fafc'); // White marker
    drawDeformedRect(turnX - 0.6, -turnY - 1.2, 0.6, 1.0, '#f59e0b'); // Amber turn
    // Right marker pod
    drawDeformedRect(turnX - 0.8, turnY - 0.7, 1.6, 2.2, '#0f172a');
    drawDeformedRect(turnX, turnY - 0.2, 0.6, 1.0, '#f8fafc');
    drawDeformedRect(turnX - 0.6, turnY - 0.2, 0.6, 1.0, '#f59e0b');

    // -------------------------------------------------------------------------
    // 3. FRONT AXLE
    // -------------------------------------------------------------------------
    const frontAxleX = halfL * 0.70;
    if (is82) {
      // 4WD Portal Axle Center Beam
      drawDeformedLine(frontAxleX, -halfW * 0.50, frontAxleX, halfW * 0.50, '#1e293b', 2.0);
      drawDeformedCircle(frontAxleX, 0, 1.8, '#0f172a');
    } else {
      // 2WD Steering Axle Beam
      drawDeformedLine(frontAxleX, -halfW * 0.55, frontAxleX, halfW * 0.55, '#334155', 2.2);
      drawDeformedCircle(frontAxleX, 0, 1.5, '#1e293b');
    }

    // -------------------------------------------------------------------------
    // 4. ENGINE ACCESSORIES: EXHAUST & CYCLONE AIR CLEANER
    // -------------------------------------------------------------------------
    // Vertical Diesel Exhaust Stack (Right side)
    const exhaustX = hoodX1 + (hoodX2 - hoodX1) * 0.35;
    const exhaustY = hoodW * 0.36;
    drawDeformedCircle(exhaustX, exhaustY, 2.0, '#1e293b');
    drawDeformedCircle(exhaustX, exhaustY, 1.0, '#0f172a');
    drawDeformedLine(exhaustX - 0.5, exhaustY - 1.4, exhaustX + 1.6, exhaustY + 0.9, '#94a3b8', 1.0); // Rain flapper

    // Cyclone Air Cleaner (Left side)
    const airX = hoodX1 + (hoodX2 - hoodX1) * 0.28;
    const airY = -hoodW * 0.36;
    drawDeformedCircle(airX, airY, 2.2, '#1e293b');
    drawDeformedCircle(airX, airY, 1.2, 'rgba(56, 189, 248, 0.4)');

    // -------------------------------------------------------------------------
    // 5. SIDE REAR-VIEW MIRRORS
    // -------------------------------------------------------------------------
    const cabFrontX = cabinX + cabinL / 2;
    const mirrorY = cabinW * 0.65;
    drawDeformedLine(cabFrontX, -cabinW * 0.46, cabFrontX + 2.5, -mirrorY, '#1e293b', 1.2);
    drawDeformedRect(cabFrontX + 1.8, -mirrorY - 1.0, 2.2, 1.8, '#0f172a');
    drawDeformedRect(cabFrontX + 2.0, -mirrorY - 0.8, 1.6, 1.4, '#f8fafc');

    drawDeformedLine(cabFrontX, cabinW * 0.46, cabFrontX + 2.5, mirrorY, '#1e293b', 1.2);
    drawDeformedRect(cabFrontX + 1.8, mirrorY - 0.8, 2.2, 1.8, '#0f172a');
    drawDeformedRect(cabFrontX + 2.0, mirrorY - 0.6, 1.6, 1.4, '#f8fafc');

    // -------------------------------------------------------------------------
    // 6. CABIN ROOF WORK LIGHTS (FLOODLIGHTS)
    // -------------------------------------------------------------------------
    const roofX = cabinX - cabinL * 0.02;
    const roofL = isOld ? cabinL * 0.68 : cabinL * 0.72;
    const roofW = isOld ? cabinW * 0.84 : cabinW * 0.86;

    if (is82) {
      // MTZ-82.1: 2 Front Cabin Roof Floodlights
      drawDeformedRect(roofX + roofL / 2 - 0.6, -roofW * 0.36, 1.4, 2.0, '#fef08a');
      drawDeformedRect(roofX + roofL / 2 - 0.6, roofW * 0.36 - 2.0, 1.4, 2.0, '#fef08a');
    }

    if (!isOld) {
      // 2 Rear Cabin Roof Floodlights (рабочие прожекторы назад / реверс)
      drawDeformedRect(roofX - roofL / 2 - 0.8, -roofW * 0.36, 1.4, 2.0, '#fef08a');
      drawDeformedRect(roofX - roofL / 2 - 0.8, roofW * 0.36 - 2.0, 1.4, 2.0, '#fef08a');
    }

    // -------------------------------------------------------------------------
    // 7. FUEL TANKS & BOARDING STEP
    // -------------------------------------------------------------------------
    const tankX = cabinX - cabinL * 0.05;
    const tankL = cabinL * 0.70;
    const tankW = halfW * 0.22;

    drawDeformedRect(tankX - tankL / 2, -halfW * 0.90, tankL, tankW, '#1e293b');
    drawDeformedCircle(tankX + tankL * 0.25, -halfW * 0.79, 1.0, '#f8fafc');

    drawDeformedRect(tankX - tankL / 2, halfW * 0.68, tankL, tankW, '#1e293b');
    drawDeformedCircle(tankX + tankL * 0.25, halfW * 0.79, 1.0, '#f8fafc');

    // Left Boarding Ladder Step
    const stepX = cabinX - cabinL * 0.12;
    drawDeformedRect(stepX - 2.0, -halfW * 0.96, 4.0, 2.0, '#0f172a');
    drawDeformedLine(stepX - 1.8, -halfW * 0.90, stepX + 1.8, -halfW * 0.90, '#cbd5e1', 1.0);

    // -------------------------------------------------------------------------
    // 8. REAR FENDER COMBINATION LIGHT BLOCKS & MUDFLAPS
    // -------------------------------------------------------------------------
    const rearFenderX = -halfL * 0.48;
    const fenderL = 14.5;
    const fenderW = 5.4;

    // Combination Tail Light Blocks mounted on top of rear fenders (Фонари ФП-209 на крыльях)
    const blockX = cabinX - cabinL / 2 + 2.0;
    // Left fender block (Red brake/tail + Amber turn signal)
    drawDeformedRect(blockX - 1.0, -halfW * 0.88, 2.0, 3.2, '#0f172a');
    drawDeformedRect(blockX - 0.75, -halfW * 0.88 + 0.25, 1.5, 1.5, '#ef4444');
    drawDeformedRect(blockX - 0.75, -halfW * 0.88 + 1.8, 1.5, 1.15, '#f59e0b');
    // Right fender block (Red brake/tail + Amber turn signal)
    drawDeformedRect(blockX - 1.0, halfW * 0.88 - 3.2, 2.0, 3.2, '#0f172a');
    drawDeformedRect(blockX - 0.75, halfW * 0.88 - 3.2 + 0.25, 1.5, 1.5, '#ef4444');
    drawDeformedRect(blockX - 0.75, halfW * 0.88 - 3.2 + 1.8, 1.5, 1.15, '#f59e0b');

    // Mudflaps with Red Reflectors (Резиновые брызговики с катафотами)
    const mudflapX = -halfL * 0.76 - 1.0;
    drawDeformedRect(mudflapX, -halfW * 0.96, 1.4, fenderW, '#0f172a');
    drawDeformedRect(mudflapX + 0.2, -halfW * 0.85, 0.8, 1.4, '#ef4444');

    drawDeformedRect(mudflapX, halfW * 0.96 - fenderW, 1.4, fenderW, '#0f172a');
    drawDeformedRect(mudflapX + 0.2, halfW * 0.85 - 1.4, 0.8, 1.4, '#ef4444');

    // -------------------------------------------------------------------------
    // 9. REAR 3-POINT HITCH & PTO (NO SOLID BACKGROUND, OPEN STEEL LINKAGE)
    // -------------------------------------------------------------------------
    const hitchX = -halfL + rc;
    const cabBackX = cabinX - cabinL / 2;

    // Lower Draft Arms (Нижние продольные тяги)
    drawDeformedLine(cabBackX, -cabinW * 0.24, hitchX - 1.5, -cabinW * 0.36, '#1e293b', 2.4);
    drawDeformedLine(cabBackX, cabinW * 0.24, hitchX - 1.5, cabinW * 0.36, '#1e293b', 2.4);
    drawDeformedCircle(hitchX - 1.5, -cabinW * 0.36, 1.0, '#64748b');
    drawDeformedCircle(hitchX - 1.5, cabinW * 0.36, 1.0, '#64748b');

    // Center Top Link (Центральная тяга)
    drawDeformedLine(cabBackX + 1.0, 0, hitchX - 2.5, 0, '#334155', 2.2);

    // Towing Crossbar & Pin (Прицепная планка и палец)
    drawDeformedRect(hitchX - 3.0, -cabinW * 0.26, 2.2, cabinW * 0.52, '#0f172a');
    drawDeformedCircle(hitchX - 1.9, 0, 1.1, '#cbd5e1');

    // PTO Shaft (ВОМ)
    drawDeformedCircle(hitchX - 3.4, 0, 1.3, '#0f172a');
    drawDeformedCircle(hitchX - 3.4, 0, 0.8, '#eab308');

    // -------------------------------------------------------------------------
    // 10. RETRO RUST & WEATHERING (MTZ-80 Old Veteran)
    // -------------------------------------------------------------------------
    if (isOld) {
      drawDeformedCircle(hoodX1 + 3, -hoodW * 0.18, 1.6, '#78350f');
      drawDeformedCircle(hoodX1 + 8, hoodW * 0.22, 2.0, '#854d0e');
      drawDeformedLine(cabinX - 2, -halfW * 0.65, cabinX + 2, -halfW * 0.65, '#451a03', 1.0);
    }
  }

  // (Motorcycles are rendered with 100% prototype-accurate textures and components in renderVehicleGreenhouseAndBodyPanels)

  // --- TRACTOR BARREL TRAILER (Тракторная бочка-цистерна) ---
  if (car.type === 'trailer_barrel') {
    // 1. Triangular A-frame drawbar extending forward to tow hitch ball (Дышло с кольцом)
    // Synchronized exactly with car.couplerOffset (26px) from physical simulation to prevent any overlapping or offset gap
    const hitchX = car.couplerOffset !== undefined ? car.couplerOffset : (halfL + 8);
    drawDeformedLine(halfL * 0.25, 0, hitchX, 0, '#1e293b', 2.6); // Central drawbar beam
    drawDeformedLine(halfL * 0.25, -halfW * 0.48, hitchX, 0, '#334155', 1.8); // Left A-arm
    drawDeformedLine(halfL * 0.25, halfW * 0.48, hitchX, 0, '#334155', 1.8); // Right A-arm
    drawDeformedCircle(hitchX, 0, 2.2, '#cbd5e1'); // Ring coupler eye

    // 2. Main Tank Body (Vintage faded, sun-bleached 20-year Soviet blue enamel)
    const tankFront = halfL * 0.65;
    const tankRear = -halfL * 0.86;
    const tankX = (tankFront + tankRear) / 2;
    const tankL = tankFront - tankRear;
    const tankW = halfW * 1.46;
    
    // Highly realistic weathered blue gradient (Матовый выгоревший сине-голубой)
    const tankGrad = ctx.createLinearGradient(0, -tankW / 2, 0, tankW / 2);
    tankGrad.addColorStop(0, '#354d6b');    // Dusty blue-grey shadow on underside
    tankGrad.addColorStop(0.18, '#8ba9c4'); // Chalky, bleached light-blue sun highlight
    tankGrad.addColorStop(0.5, '#5a81a3');  // Sun-bleached matte Soviet blue enamel
    tankGrad.addColorStop(0.82, '#4a6885'); // Slightly darker faded blue flank
    tankGrad.addColorStop(1, '#203147');    // Dark bottom shadow
 
    // Draw main cylindrical tank body
    drawDeformedRect(tankX - tankL / 2, -tankW / 2, tankL, tankW, tankGrad);
 
    // End-plate weld seams and border contours in dark weathered blue/slate
    drawDeformedLine(tankX - tankL / 2, -tankW / 2, tankX + tankL / 2, -tankW / 2, '#243547', 1.0);
    drawDeformedLine(tankX + tankL / 2, -tankW / 2, tankX + tankL / 2, tankW / 2, '#243547', 1.1); // Front welded plate
    drawDeformedLine(tankX + tankL / 2, tankW / 2, tankX - tankL / 2, tankW / 2, '#243547', 1.0);
    drawDeformedLine(tankX - tankL / 2, tankW / 2, tankX - tankL / 2, -tankW / 2, '#243547', 1.1); // Rear welded plate
 
    // 3. Subtle rolled steel circumferential reinforcement ribs
    const ribPositions = [tankX - tankL * 0.28, tankX + tankL * 0.28];
    ribPositions.forEach((rx) => {
      drawDeformedLine(rx, -tankW / 2, rx, tankW / 2, '#243547', 1.0);
      drawDeformedLine(rx + 0.5, -tankW / 2, rx + 0.5, tankW / 2, 'rgba(139, 169, 196, 0.25)', 0.6);
    });
 
    // 4. Top Inspection / Filling Hatch Manhole (Люк перемещен ближе к дышлу и также окрашен в выцветший синий)
    const hatchX = tankFront - tankL * 0.22;
    drawDeformedCircle(hatchX, 0, 2.6, '#243547'); // Outer weathered steel collar rim
    drawDeformedCircle(hatchX, 0, 1.8, '#5a81a3'); // Faded blue enamel hatch lid
    drawDeformedCircle(hatchX, -0.3, 0.6, '#8ba9c4'); // Muted sun glint
    drawDeformedCircle(hatchX, 0, 0.7, '#1e293b'); // Center locking dog-bolt / clamp
 
    // 5. Side Wheel Fenders / Mudguards (Cleanly centered over rearward wheels)
    const wheelAxleX = -halfL * 0.28;
    const fenderL = 11.2;
    const fenderX = wheelAxleX - fenderL / 2;
    drawDeformedRect(fenderX, -tankW / 2 - 1.6, fenderL, 1.4, '#1e293b');
    drawDeformedRect(fenderX, tankW / 2 + 0.2, fenderL, 1.4, '#1e293b');
 
    // 6. Rear Steel Bumper & Realistic Compact Brass Discharge Tap / Faucet (Аккуратный соразмерный кран сзади)
    const rearBumperX = tankRear - 1.0;
    drawDeformedLine(rearBumperX, -halfW * 0.65, rearBumperX, halfW * 0.65, '#334155', 1.8);
 
    // Compact threaded brass pipe nipple extending out
    drawDeformedRect(rearBumperX - 1.4, -0.6, 1.4, 1.2, '#92400e'); // Brass threaded fitting
    drawDeformedRect(rearBumperX - 0.7, -0.8, 0.5, 1.6, '#b45309'); // Hex nut collar
 
    // Compact brass valve body
    drawDeformedRect(rearBumperX - 2.6, -0.7, 1.2, 1.4, '#d97706');
    // Small neat red cross-valve lever (Компактный красный вентиль)
    drawDeformedLine(rearBumperX - 2.0, -1.5, rearBumperX - 2.0, 1.5, '#dc2626', 1.0);
    drawDeformedCircle(rearBumperX - 2.0, 0, 0.4, '#f8fafc');
 
    // Threaded hose connection spout (Штуцер для шланга - без лишней навесной техники/шлангов)
    const isHoseOut = !!car.fluidTank?.isWaterHoseDeployed;
    if (!isHoseOut) {
      // Clean brass coupler with dust cap (никаких смотанных шлангов и катушек)
      drawDeformedCircle(rearBumperX - 3.2, 0, 0.7, '#b45309');
    } else {
      // Open brass spout with connected active black hose lead when deployed
      drawDeformedCircle(rearBumperX - 3.2, 0, 0.7, '#b45309');
      drawDeformedLine(rearBumperX - 3.0, 0, rearBumperX - 5.0, 0, '#09090b', 1.8);
    }
  }

  // --- TRACTOR VACUUM BARREL TRAILER (Тракторная вакуумная бочка) ---
  if (car.type === 'trailer_vacuum') {
    // 1. Triangular A-frame drawbar extending forward to tow hitch ball (Дышло с кольцом)
    const hitchX = car.couplerOffset !== undefined ? car.couplerOffset : (halfL + 8);
    drawDeformedLine(halfL * 0.25, 0, hitchX, 0, '#1e293b', 2.8); // Central drawbar beam
    drawDeformedLine(halfL * 0.25, -halfW * 0.48, hitchX, 0, '#334155', 2.0); // Left A-arm
    drawDeformedLine(halfL * 0.25, halfW * 0.48, hitchX, 0, '#334155', 2.0); // Right A-arm
    drawDeformedCircle(hitchX, 0, 2.5, '#cbd5e1'); // Ring coupler eye

    // 2. Technical Tool/Utility Box (Технический ящик) on the drawbar right behind the hitch
    const boxX = hitchX - 5.2;
    const boxW = 7.4;
    const boxL = 3.8;
    drawDeformedRect(boxX - boxL / 2, -boxW / 2, boxL, boxW, '#1e293b'); // Outer tech box frame (dark industrial black)
    drawDeformedRect(boxX - boxL / 2 + 0.4, -boxW / 2 + 0.4, boxL - 0.8, boxW - 0.8, '#334155'); // Inner lid panel (grey slate)
    drawDeformedRect(boxX - 0.5, -0.5, 1.0, 1.0, '#94a3b8'); // Metallic silver toggle latch/lock in center
    drawDeformedLine(boxX - boxL / 2, 0, boxX + boxL / 2, 0, '#1e293b', 0.8); // Center divider weld seam

    // 3. Vacuum Pump (Компрессор КО-503) mounted behind the tech box
    const pumpX = halfL + 1.8;
    drawDeformedRect(pumpX - 2.8, -2.4, 5.6, 4.8, '#1e293b'); // Main pump casing
    drawDeformedRect(pumpX - 3.6, -1.5, 0.8, 3.0, '#475569'); // Drive pulley guard
    for (let i = -2; i <= 2; i++) {
      drawDeformedLine(pumpX + i * 0.8, -2.2, pumpX + i * 0.8, 2.2, '#475569', 0.6); // Cooling fins
    }
    drawDeformedCircle(pumpX - 1.2, -2.8, 1.0, '#64748b'); // Oil-water separator dome

    // 4. Main Tank Body (Rich glossy industrial blue gradient)
    const tankFront = halfL * 0.70;
    const tankRear = -halfL * 0.88;
    const tankX = (tankFront + tankRear) / 2;
    const tankL = tankFront - tankRear;
    const tankW = halfW * 1.46;
    
    // Rich glossy industrial blue gradient
    const tankGrad = ctx.createLinearGradient(0, -tankW / 2, 0, tankW / 2);
    tankGrad.addColorStop(0, '#172554');    // Deep navy bottom shadow
    tankGrad.addColorStop(0.18, '#3b82f6'); // Bright glossy royal blue highlight
    tankGrad.addColorStop(0.5, '#2563eb');  // Primary royal blue
    tankGrad.addColorStop(0.82, '#1d4ed8'); // Deep blue flank
    tankGrad.addColorStop(1, '#0f172a');    // Dark underbelly shadow
 
    // Draw main cylindrical tank body
    drawDeformedRect(tankX - tankL / 2, -tankW / 2, tankL, tankW, tankGrad);

    // Draw rounded shallow front dome cap (Полусферическое закругленное переднее днище бочки)
    // We start at (tankX + tankL/2, -tankW/2), curve forward to (tankX + tankL/2 + 2.5, 0), then curve back to (tankX + tankL/2, tankW/2)
    // To ensure beautiful uniform borders, we draw it filled first, and then stroke its outer curved edge!
    {
      const [fTopX, fTopY] = deform(tankX + tankL / 2, -tankW / 2);
      const [fMidX, fMidY] = deform(tankX + tankL / 2 + 2.5, 0); // Shallow bulge forward by only 2.5 pixels
      const [fBotX, fBotY] = deform(tankX + tankL / 2, tankW / 2);
      
      ctx.fillStyle = tankGrad;
      ctx.beginPath();
      ctx.moveTo(fTopX, fTopY);
      ctx.quadraticCurveTo(fMidX, fMidY, fBotX, fBotY);
      ctx.lineTo(fTopX, fTopY);
      ctx.fill();
      
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(fTopX, fTopY);
      ctx.quadraticCurveTo(fMidX, fMidY, fBotX, fBotY);
      ctx.stroke();
    }

    // Draw rounded shallow rear dome cap (Полусферическое закругленное заднее днище бочки)
    // We start at (tankX - tankL/2, -tankW/2), curve backward to (tankX - tankL/2 - 2.5, 0), then curve back to (tankX - tankL/2, tankW/2)
    {
      const [rTopX, rTopY] = deform(tankX - tankL / 2, -tankW / 2);
      const [rMidX, rMidY] = deform(tankX - tankL / 2 - 2.5, 0); // Shallow bulge backward by only 2.5 pixels
      const [rBotX, rBotY] = deform(tankX - tankL / 2, tankW / 2);
      
      ctx.fillStyle = tankGrad;
      ctx.beginPath();
      ctx.moveTo(rTopX, rTopY);
      ctx.quadraticCurveTo(rMidX, rMidY, rBotX, rBotY);
      ctx.lineTo(rTopX, rTopY);
      ctx.fill();
      
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(rTopX, rTopY);
      ctx.quadraticCurveTo(rMidX, rMidY, rBotX, rBotY);
      ctx.stroke();
    }
 
    // End-plate weld seams (Сварные швы днищ) and border contours in dark weathered blue/slate
    drawDeformedLine(tankX - tankL / 2, -tankW / 2, tankX + tankL / 2, -tankW / 2, '#1e293b', 1.0);
    drawDeformedLine(tankX + tankL / 2, -tankW / 2, tankX + tankL / 2, tankW / 2, '#1e293b', 1.2); // Front welded ring seam
    drawDeformedLine(tankX + tankL / 2, tankW / 2, tankX - tankL / 2, tankW / 2, '#1e293b', 1.0);
    drawDeformedLine(tankX - tankL / 2, tankW / 2, tankX - tankL / 2, -tankW / 2, '#1e293b', 1.2); // Rear welded ring seam
 
    // 5. Structural steel circumferential reinforcement ribs
    const ribPositions = [tankX - tankL * 0.28, tankX + tankL * 0.28];
    ribPositions.forEach((rx) => {
      drawDeformedLine(rx, -tankW / 2, rx, tankW / 2, '#1e293b', 1.2);
      drawDeformedLine(rx + 0.5, -tankW / 2, rx + 0.5, tankW / 2, 'rgba(96, 165, 250, 0.40)', 0.7); // Glossy glint on ribs
    });
 
    // 7. Top Inspection Hatch and Safety Valve Dome
    const hatchX = tankFront - tankL * 0.25;
    drawDeformedCircle(hatchX, 0, 3.2, '#1e293b'); // Outer steel hatch ring
    drawDeformedCircle(hatchX, 0, 2.2, '#1d4ed8'); // Blue hatch cover
    drawDeformedCircle(hatchX - 0.4, -0.4, 0.7, '#60a5fa'); // Highlight
    drawDeformedRect(hatchX - 0.4, -1.8, 0.8, 3.6, '#334155'); // Hinged lock clamp bar

    // Dual safety pressure valves / relief stack
    drawDeformedCircle(hatchX - 4.5, 0, 1.4, '#1e293b'); // Valve housing
    drawDeformedCircle(hatchX - 4.5, 0, 0.8, '#cbd5e1'); // Silver cap

    // 8. Steel Pressure Pipe (Труба для давления в upper люк)
    // Run pipe from vacuum pump to top inspection hatch
    drawDeformedLine(pumpX, -1.2, hatchX, -1.2, '#64748b', 1.8); // Steel pipe body
    drawDeformedLine(pumpX, -1.2, pumpX, 0, '#475569', 1.8); // Elbow down to pump intake
    drawDeformedLine(hatchX, -1.2, hatchX, 0, '#475569', 1.8); // Elbow down to hatch intake
    // Mounting brackets holding pipe to tank
    const bkt1 = tankX + tankL * 0.2;
    const bkt2 = tankX - tankL * 0.1;
    drawDeformedRect(bkt1 - 0.4, -1.8, 0.8, 1.2, '#0f172a'); // Steel strap clamp 1
    drawDeformedRect(bkt2 - 0.4, -1.8, 0.8, 1.2, '#0f172a'); // Steel strap clamp 2

    // 9. Round Vacuum Gauge (Вакуумметр с цветным циферблатом и красной стрелкой)
    const gaugeX = tankFront - 4.5;
    const gaugeY = -tankW * 0.22;
    drawDeformedCircle(gaugeX, gaugeY, 1.8, '#0f172a'); // Black housing
    drawDeformedCircle(gaugeX, gaugeY, 1.4, '#f1f5f9'); // White dial face
    drawDeformedCircle(gaugeX, gaugeY, 0.8, '#22c55e'); // Green safety sector
    drawDeformedLine(gaugeX, gaugeY, gaugeX - 0.9, gaugeY + 0.5, '#dc2626', 0.6); // Red pointer needle

    // 10. Heavy Curved Fenders with Realistic 3D Shading & Rear Lighting (Прочные крылья над колесами с интегрированной светотехникой)
    const wheelAxleX = -halfL * 0.28;
    const fenderL = 12.0;
    const fenderX = wheelAxleX - fenderL / 2;
    const fenderW = 4.0; // Cover the wheel width 3.4 completely
    const barrelTrackY = halfW * 0.82 + 1.7; // Center wheel axis line

    // Left Fender (arched metal wrapping over wheel, colored and shaded blue)
    drawDeformedRect(fenderX, -barrelTrackY - fenderW / 2, fenderL, fenderW, '#1e293b'); // Dark underlying frame/brackets
    // Rear sloped portion (darker shade for 3D curvature)
    drawDeformedRect(fenderX + 0.2, -barrelTrackY - fenderW / 2 + 0.2, 2.0, fenderW - 0.4, '#1d4ed8');
    // Top flat portion (bright royal blue matching the tank highlights)
    drawDeformedRect(fenderX + 2.2, -barrelTrackY - fenderW / 2 + 0.2, 7.6, fenderW - 0.4, '#3b82f6');
    // Front sloped portion (darker shade for 3D curvature)
    drawDeformedRect(fenderX + 9.8, -barrelTrackY - fenderW / 2 + 0.2, 2.0, fenderW - 0.4, '#1d4ed8');
    // Shiny outer metal lip highlight
    drawDeformedLine(fenderX, -barrelTrackY - fenderW / 2 + 0.3, fenderX + fenderL, -barrelTrackY - fenderW / 2 + 0.3, '#93c5fd', 0.8);
    // Rear black rubber mudflap (брызговик) attached to the rear end (fenderX)
    drawDeformedRect(fenderX - 2.4, -barrelTrackY - 1.6, 2.4, 3.2, '#18181b');
    drawDeformedLine(fenderX - 1.5, -barrelTrackY - 1.2, fenderX - 1.5, -barrelTrackY + 1.2, '#27272a', 0.6);
    // Left integrated rectangular tail light unit on the rear slope face (no upward-facing circles)
    drawDeformedRect(fenderX + 0.4, -barrelTrackY - 1.5, 1.0, 3.0, '#09090b'); // Housing box
    drawDeformedRect(fenderX + 0.55, -barrelTrackY - 1.3, 0.7, 1.3, '#f97316'); // Amber indicator segment (outer)
    drawDeformedRect(fenderX + 0.55, -barrelTrackY + 0.0, 0.7, 1.3, '#ef4444'); // Red brake segment (inner)

    // Right Fender (arched metal wrapping over wheel, colored and shaded blue)
    drawDeformedRect(fenderX, barrelTrackY - fenderW / 2, fenderL, fenderW, '#1e293b'); // Dark underlying frame/brackets
    // Rear sloped portion (darker shade for 3D curvature)
    drawDeformedRect(fenderX + 0.2, barrelTrackY - fenderW / 2 + 0.2, 2.0, fenderW - 0.4, '#1d4ed8');
    // Top flat portion (bright royal blue matching the tank highlights)
    drawDeformedRect(fenderX + 2.2, barrelTrackY - fenderW / 2 + 0.2, 7.6, fenderW - 0.4, '#3b82f6');
    // Front sloped portion (darker shade for 3D curvature)
    drawDeformedRect(fenderX + 9.8, barrelTrackY - fenderW / 2 + 0.2, 2.0, fenderW - 0.4, '#1d4ed8');
    // Shiny outer metal lip highlight
    drawDeformedLine(fenderX, barrelTrackY + fenderW / 2 - 0.3, fenderX + fenderL, barrelTrackY + fenderW / 2 - 0.3, '#93c5fd', 0.8);
    // Rear black rubber mudflap (брызговик) attached to the rear end (fenderX)
    drawDeformedRect(fenderX - 2.4, barrelTrackY - 1.6, 2.4, 3.2, '#18181b');
    drawDeformedLine(fenderX - 1.5, barrelTrackY - 1.2, fenderX - 1.5, barrelTrackY + 1.2, '#27272a', 0.6);
    // Right integrated rectangular tail light unit on the rear slope face (no upward-facing circles)
    drawDeformedRect(fenderX + 0.4, barrelTrackY - 1.5, 1.0, 3.0, '#09090b'); // Housing box
    drawDeformedRect(fenderX + 0.55, barrelTrackY - 1.3, 0.7, 1.3, '#ef4444'); // Red brake segment (inner)
    drawDeformedRect(fenderX + 0.55, barrelTrackY + 0.0, 0.7, 1.3, '#f97316'); // Amber indicator segment (outer)

    const isVacuumHoseOut = !!car.fluidTank?.isWaterHoseDeployed;

    // 10b. Side-mounted long suction hose carrier trays/racks (Пеналы с рукавами поверх крыльев)
    // By drawing them here (after Section 10 fenders), they render cleanly on top of the fenders!
    const trayW = 2.4;
    
    // Left carrier tray and its dynamic suction hose (vanishes from tray when uncoiled/active)
    drawDeformedRect(tankX - tankL / 2 + 1.5, -tankW / 2 - trayW + 0.2, tankL - 3.0, trayW, '#334155'); // Metal tray shelf
    // Mounting brackets connecting tray over the fender / tank
    for (let bx = tankX - tankL / 2 + 4; bx < tankX + tankL / 2 - 4; bx += 8) {
      drawDeformedLine(bx, -tankW / 2 - trayW - 0.2, bx, -tankW / 2 + 0.1, '#475569', 0.8);
    }
    
    if (!isVacuumHoseOut) {
      // Hose is folded/stored in the left rack: thick modern corrugated black suction hose
      drawDeformedLine(tankX - tankL / 2 + 2.5, -tankW / 2 - trayW / 2, tankX + tankL / 2 - 2.5, -tankW / 2 - trayW / 2, '#09090b', 2.0);
      // Bright gray ribbed spiraled corrugations
      for (let hx = tankX - tankL / 2 + 3.0; hx <= tankX + tankL / 2 - 3.0; hx += 1.5) {
        drawDeformedLine(hx, -tankW / 2 - trayW + 0.3, hx, -tankW / 2 - 0.1, '#475569', 0.6);
      }
    }

    // Right carrier tray and its stored secondary/extension corrugated hose (always present as reserve)
    drawDeformedRect(tankX - tankL / 2 + 1.5, tankW / 2 - 0.2, tankL - 3.0, trayW, '#334155'); // Metal tray shelf
    for (let bx = tankX - tankL / 2 + 4; bx < tankX + tankL / 2 - 4; bx += 8) {
      drawDeformedLine(bx, tankW / 2 - 0.1, bx, tankW / 2 + trayW + 0.2, '#475569', 0.8);
    }
    // Reserved corrugated black suction hose in right tray
    drawDeformedLine(tankX - tankL / 2 + 2.5, tankW / 2 + trayW / 2, tankX + tankL / 2 - 2.5, tankW / 2 + trayW / 2, '#09090b', 2.0);
    // Bright gray ribbed spiraled corrugations
    for (let hx = tankX - tankL / 2 + 3.0; hx <= tankX + tankL / 2 - 3.0; hx += 1.5) {
      drawDeformedLine(hx, tankW / 2 + 0.1, hx, tankW / 2 + trayW - 0.3, '#475569', 0.6);
    }

    // 11. Rear Heavy Gate Valve ANM-53 in Strict Top-Down Perspective (Задвижка АНМ-53 в строгом виде сверху)
    // The rear cap dome curves backwards to tankRear - 2.5.
    // The valve mounting flange (фланец крепления задвижки к цистерне) is viewed edge-on (vertical flat strip).
    const flangeX = tankRear - 2.1;
    drawDeformedRect(flangeX, -3.2, 0.8, 6.4, '#334155'); // Dark steel mounting flange plate
    
    // 4 flange fastening bolt heads visible from above (2 top, 2 bottom)
    drawDeformedCircle(flangeX + 0.4, -2.4, 0.45, '#cbd5e1'); // Bolt 1
    drawDeformedCircle(flangeX + 0.4, -1.3, 0.45, '#cbd5e1'); // Bolt 2
    drawDeformedCircle(flangeX + 0.4, 1.3, 0.45, '#cbd5e1');  // Bolt 3
    drawDeformedCircle(flangeX + 0.4, 2.4, 0.45, '#cbd5e1');  // Bolt 4

    // Main heavy cast-iron gate valve body (корпус задвижки АНМ-53) extending directly backwards
    const valveX = flangeX - 1.8;
    drawDeformedRect(valveX, -1.8, 1.8, 3.6, '#1e293b'); // Valve body box

    // Slide gate slot housing (направляющие пластины шибера) crossing the valve body
    const slotX = valveX + 0.6;
    drawDeformedRect(slotX, -2.2, 0.6, 4.4, '#0f172a'); // Slide slot

    // Long hand-operated control lever (рукоятка шибера) extending at an angle in top-down view
    // Starts from the slide slot at y = -1.0, angled forward-left for ergonomic handle
    drawDeformedLine(slotX + 0.3, -1.0, slotX + 3.2, -4.8, '#4b5563', 1.2); // Steel lever arm
    drawDeformedCircle(slotX + 3.2, -4.8, 0.75, '#dc2626'); // Red round control knob

    // Flange connector lip on the outer snout end
    drawDeformedRect(valveX - 0.4, -1.4, 0.4, 2.8, '#475569');

    // Brass/bronze receiving snout nozzle (Приемный патрубок под шланг) extending backwards
    const snoutX = valveX - 2.0;
    drawDeformedRect(snoutX, -0.9, 1.6, 1.8, '#b45309'); // Brass pipe neck
    drawDeformedRect(snoutX - 0.4, -1.1, 0.4, 2.2, '#78350f'); // Coupler outer flange collar

    // Quick-action lock clamps / wing bolts (зажимные барашки) on the side flanges
    drawDeformedLine(valveX, -1.5, snoutX + 0.3, -1.7, '#334155', 0.8);
    drawDeformedLine(valveX, 1.5, snoutX + 0.3, 1.7, '#334155', 0.8);
    drawDeformedCircle(snoutX + 0.3, -1.7, 0.5, '#cbd5e1'); // Wing nut left
    drawDeformedCircle(snoutX + 0.3, 1.7, 0.5, '#cbd5e1');  // Wing nut right

    if (!isVacuumHoseOut) {
      // Dust cap locked on snout (заглушка на цепочке)
      const capX = snoutX - 0.7;
      drawDeformedCircle(capX, 0, 1.2, '#b45309'); // Brass cap face
      drawDeformedLine(capX, -0.9, capX, 0.9, '#78350f', 0.8); // Cap grab handle
      
      // Fine metal safety chain (цепочка заглушки) drooping and looping down to the tank flange
      drawDeformedLine(capX, 0.2, flangeX + 0.4, 2.6, '#94a3b8', 0.55); // Safety chain
    } else {
      // Suction hose connected - show silver camlock coupler locked onto the end of the snout!
      const collarX = snoutX - 0.4;
      drawDeformedRect(collarX - 0.3, -1.2, 0.6, 2.4, '#475569'); // Steel locking sleeve of camlock
      drawDeformedCircle(collarX - 0.3, -1.2, 0.4, '#cbd5e1'); // Camlock locking arm 1
      drawDeformedCircle(collarX - 0.3, 1.2, 0.4, '#cbd5e1');  // Camlock locking arm 2
    }
  }

  // --- 2-AXLE FLATBED FARM TRAILER 2-PTS-4 (Бортовой 2-осный тракторный прицеп 2-ПТС-4) ---
  // Strictly orthogonal 90° top-down view (вид строго сверху): no 2.5D perspective, no side wall faces,
  // no vertical triangles/hazard signs, authentic weathered Soviet timber plank floor and steel frame.
  if (car.type === 'trailer_flatbed_2axle') {
    // 1. Front Turntable Dolly Ring & Steerable A-Frame Drawbar (Поворотный круг и дышло)
    const dollyWorldAngle = car.trailerDollyAngle !== undefined ? car.trailerDollyAngle : car.angle;
    let relDollyAngle = dollyWorldAngle - car.angle;
    relDollyAngle = ((relDollyAngle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;

    const dollyPivotX = halfL * 0.44;
    const drawbarLen = car.drawbarLength || 16;
    const hitchX = dollyPivotX + Math.cos(relDollyAngle) * drawbarLen;
    const hitchY = Math.sin(relDollyAngle) * drawbarLen;

    // Heavy cast turntable ring (поворотный круг) underneath front subframe
    drawDeformedCircle(dollyPivotX, 0, halfW * 0.52, '#232a32', '#14191f', 1.0);
    drawDeformedCircle(dollyPivotX, 0, halfW * 0.36, '#3a4450', '#1c2229', 0.8);
    drawDeformedCircle(dollyPivotX, 0, 1.8, '#14191f'); // Kingpin center

    // Horizontal A-frame drawbar (стальное треугольное дышло на уровне сцепки)
    const cosD = Math.cos(relDollyAngle);
    const sinD = Math.sin(relDollyAngle);
    const armWidth = halfW * 0.42;

    const armLeftX = dollyPivotX - sinD * armWidth;
    const armLeftY = cosD * armWidth;
    const armRightX = dollyPivotX + sinD * armWidth;
    const armRightY = -cosD * armWidth;

    // Main drawbar channel beams
    drawDeformedLine(dollyPivotX, 0, hitchX, hitchY, '#1c232a', 2.4);
    drawDeformedLine(armLeftX, armLeftY, hitchX, hitchY, '#29323c', 1.8);
    drawDeformedLine(armRightX, armRightY, hitchX, hitchY, '#29323c', 1.8);

    // Crossbrace between A-arms (поперечина треугольного дышла)
    const braceFrac = 0.45;
    const braceLX = armLeftX + (hitchX - armLeftX) * braceFrac;
    const braceLY = armLeftY + (hitchY - armLeftY) * braceFrac;
    const braceRX = armRightX + (hitchX - armRightX) * braceFrac;
    const braceRY = armRightY + (hitchY - armRightY) * braceFrac;
    drawDeformedLine(braceLX, braceLY, braceRX, braceRY, '#1c232a', 1.5);

    // Tow hitch eye ring (кованая сцепная петля)
    drawDeformedCircle(hitchX, hitchY, 2.6, '#374151', '#111827', 1.0);
    drawDeformedCircle(hitchX, hitchY, 1.1, '#0b0f14');

    // 2. Cargo Bed Box Dimensions (strictly 90° overhead)
    const boxFront = halfL * 0.72;
    const boxRear = -halfL * 0.88;
    const boxL = boxFront - boxRear;
    const boxW = halfW * 0.96 * 2;
    const boxX = (boxFront + boxRear) / 2;

    // Outer rim & perimeter binding base
    const baseColor = car.color || '#3e5443';
    drawDeformedRect(boxRear, -boxW / 2, boxL, boxW, baseColor);

    // 3. Authentic Weathered Soviet Wooden Plank Floor (Дощатый настил кузова)
    // Planks run longitudinally (продольно от переднего к заднему борту)
    const floorLeft = boxRear + 1.2;
    const floorRight = boxFront - 1.2;
    const floorL = floorRight - floorLeft;
    const floorTop = -boxW / 2 + 1.2;
    const floorBottom = boxW / 2 - 1.2;
    const floorW = floorBottom - floorTop;

    const plankCount = 11;
    const pw = floorW / plankCount;
    // Faded, dried, weathered timber tones with natural plank-to-plank variation
    const plankPalette = [
      '#4b4339', '#534b40', '#463f35', '#4f473c', '#433c32', 
      '#4c443a', '#554d42', '#484136', '#50483d', '#453e34', '#4d453b'
    ];

    for (let i = 0; i < plankCount; i++) {
      const py = floorTop + i * pw;
      const pColor = plankPalette[i % plankPalette.length];
      drawDeformedRect(floorLeft, py, floorL, pw, pColor);

      // Fine dark joint seam between boards
      if (i > 0) {
        drawDeformedLine(floorLeft, py, floorRight, py, '#26201a', 0.6);
      }
      // Subtle natural grain / weathered streak
      const grainY = py + pw * 0.45;
      drawDeformedLine(floorLeft + 4, grainY, floorRight - 6, grainY, 'rgba(30, 24, 18, 0.25)', 0.5);
    }

    // Dirt/wear patina accumulation in corners & along perimeter
    drawDeformedLine(floorLeft, floorTop, floorRight, floorTop, 'rgba(25, 20, 15, 0.45)', 0.8);
    drawDeformedLine(floorLeft, floorBottom, floorRight, floorBottom, 'rgba(25, 20, 15, 0.45)', 0.8);
    drawDeformedLine(floorLeft, floorTop, floorLeft, floorBottom, 'rgba(25, 20, 15, 0.5)', 0.8);
    drawDeformedLine(floorRight, floorTop, floorRight, floorBottom, 'rgba(25, 20, 15, 0.5)', 0.8);

    // Rows of carriage bolts securing planks to chassis crossmembers (поперечные ряды крепежных болтов к раме)
    const crossmemberFractions = [0.15, 0.38, 0.62, 0.85];
    for (const frac of crossmemberFractions) {
      const cx = floorLeft + floorL * frac;
      // Faint steel crossmember shadow under seams
      drawDeformedLine(cx, floorTop, cx, floorBottom, 'rgba(35, 28, 22, 0.35)', 0.8);
      // Small bolt heads along the crossmember
      for (let i = 0; i < plankCount; i += 2) {
        const by = floorTop + (i + 0.5) * pw;
        drawDeformedCircle(cx, by, 0.5, '#1e1812');
      }
    }

    // Central Hydraulic Lift Cylinder Cover Hatch (Металлический люк гидроцилиндра опрокидывания)
    const hatchL = 5.5;
    const hatchW = 4.2;
    drawDeformedRect(boxX - hatchL / 2, -hatchW / 2, hatchL, hatchW, '#3a434b');
    drawDeformedLine(boxX - hatchL / 2, -hatchW / 2, boxX + hatchL / 2, -hatchW / 2, '#5c4331', 0.6);
    drawDeformedLine(boxX - hatchL / 2, hatchW / 2, boxX + hatchL / 2, hatchW / 2, '#5c4331', 0.6);
    drawDeformedLine(boxX - hatchL / 2, -hatchW / 2, boxX - hatchL / 2, hatchW / 2, '#5c4331', 0.6);
    drawDeformedLine(boxX + hatchL / 2, -hatchW / 2, boxX + hatchL / 2, hatchW / 2, '#5c4331', 0.6);
    drawDeformedCircle(boxX - hatchL / 2 + 0.8, -hatchW / 2 + 0.8, 0.35, '#181f26');
    drawDeformedCircle(boxX + hatchL / 2 - 0.8, -hatchW / 2 + 0.8, 0.35, '#181f26');
    drawDeformedCircle(boxX - hatchL / 2 + 0.8, hatchW / 2 - 0.8, 0.35, '#181f26');
    drawDeformedCircle(boxX + hatchL / 2 - 0.8, hatchW / 2 - 0.8, 0.35, '#181f26');

    // 4. Drop-Side Top Edge Rims & Hardware (Кромки бортов и металлическая фурнитура - вид строго сверху)
    // The drop sides are vertical panels, so from directly above only their top rim edge is visible!
    const rimColor = '#2b382d'; // Dark weathered steel channel binding
    drawDeformedLine(boxRear, -boxW / 2, boxFront, -boxW / 2, rimColor, 1.2);
    drawDeformedLine(boxRear, boxW / 2, boxFront, boxW / 2, rimColor, 1.2);
    drawDeformedLine(boxRear, -boxW / 2, boxRear, boxW / 2, rimColor, 1.2);
    drawDeformedLine(boxFront, -boxW / 2, boxFront, boxW / 2, rimColor, 1.4);

    // Front header board tubular reinforcement beam (усилитель переднего борта)
    drawDeformedLine(boxFront - 0.3, -boxW / 2 + 1.0, boxFront - 0.3, boxW / 2 - 1.0, '#1e2820', 1.0);

    // Four corner steel stake posts (угловые кованые стойки кузова)
    const stakeSize = 2.4;
    drawDeformedRect(boxFront - stakeSize, -boxW / 2, stakeSize, stakeSize, '#1c242c');
    drawDeformedRect(boxFront - stakeSize, boxW / 2 - stakeSize, stakeSize, stakeSize, '#1c242c');
    drawDeformedRect(boxRear, -boxW / 2, stakeSize, stakeSize, '#1c242c');
    drawDeformedRect(boxRear, boxW / 2 - stakeSize, stakeSize, stakeSize, '#1c242c');
    // Corner hinge pin rivets
    drawDeformedCircle(boxFront - stakeSize / 2, -boxW / 2 + stakeSize / 2, 0.5, '#475569');
    drawDeformedCircle(boxFront - stakeSize / 2, boxW / 2 - stakeSize / 2, 0.5, '#475569');
    drawDeformedCircle(boxRear + stakeSize / 2, -boxW / 2 + stakeSize / 2, 0.5, '#475569');
    drawDeformedCircle(boxRear + stakeSize / 2, boxW / 2 - stakeSize / 2, 0.5, '#475569');

    // Central dividing stakes with side board locks (центральные стойки с запорами бортов)
    const midStakeL = 2.4;
    const midStakeW = 1.6;
    drawDeformedRect(boxX - midStakeL / 2, -boxW / 2 - 0.4, midStakeL, midStakeW, '#1c242c');
    drawDeformedRect(boxX - midStakeL / 2, boxW / 2 - midStakeW + 0.4, midStakeL, midStakeW, '#1c242c');
    // Lock handle pins
    drawDeformedCircle(boxX, -boxW / 2 + 0.3, 0.4, '#334155');
    drawDeformedCircle(boxX, boxW / 2 - 0.3, 0.4, '#334155');

    // Rear tailgate latch hooks (замки заднего откидного борта)
    drawDeformedRect(boxRear - 0.4, -boxW * 0.32, 1.2, 1.6, '#1e252d');
    drawDeformedRect(boxRear - 0.4, boxW * 0.32 - 1.6, 1.2, 1.6, '#1e252d');

    // 5. Rear Towing Hitch for Tandem Trailer (Буксирный прибор / фаркоп для автопоезда)
    // Iconic 2-PTS-4 rear towing hook for pulling a second trailer
    drawDeformedRect(boxRear - 2.4, -1.3, 2.4, 2.6, '#1a2128');
    drawDeformedCircle(boxRear - 1.6, 0, 0.8, '#475569');

    // Soviet taillight brackets under rear edge (ФП-130) - top edge visible only, no vertical triangles!
    drawDeformedRect(boxRear - 0.8, -boxW * 0.42, 1.0, 2.4, '#1c2127');
    drawDeformedRect(boxRear - 0.8, -boxW * 0.42 + 0.4, 0.8, 1.6, '#7f1d1d');
    drawDeformedRect(boxRear - 0.8, boxW * 0.42 - 2.4, 1.0, 2.4, '#1c2127');
    drawDeformedRect(boxRear - 0.8, boxW * 0.42 - 2.0, 0.8, 1.6, '#7f1d1d');
  }

  // --- UNIFIED DATA-DRIVEN CHMSL (THIRD BRAKE LIGHT) ---
  const optics = getVehicleOpticsMounts(car);
  if (optics.thirdBrakeLight?.enabled) {
    const tbl = optics.thirdBrakeLight;
    const tblX = car.length * tbl.xFrac + rc * 0.7;
    const tblY = car.width * tbl.yFrac;
    const halfWidth = tbl.width / 2;
    const col = car.brakeLightsOn ? '#ef4444' : '#7f1d1d';
    drawDeformedLine(tblX, tblY - halfWidth, tblX, tblY + halfWidth, col, tbl.height);
  }
}

