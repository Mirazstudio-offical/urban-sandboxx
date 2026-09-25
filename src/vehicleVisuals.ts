import { Vehicle } from './types';
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
export {
  renderWheeledAsphaltPaver,
  renderHeavyTandemRoller,
  renderCompactSidewalkRoller,
  renderPneumaticRoller
};

/**
 * High-fidelity rendering for specialized vehicle accessories, cabins, and equipment
 */
export function renderSpecializedVehicleAttachments(vCtx: VehicleRenderContext): void {
  const {
    ctx, car, halfL, halfW, fc, rc,
    cabinX, cabinL, cabinW, deform,
    drawDeformedRect, drawDeformedLine, drawDeformedCircle, nightAlpha
  } = vCtx;

  // --- FIRE ENGINE (STANDARD PUMPER) ---
  if (car.type === 'fire_engine') {
    const bumpX = halfL - fc;
    drawDeformedRect(bumpX - 1, -halfW - 0.5, 3.5, halfW * 2 + 1, '#cbd5e1');
    drawDeformedRect(bumpX - 0.5, -halfW * 0.6, 2, 3, '#0f172a');
    drawDeformedRect(bumpX - 0.5, halfW * 0.6 - 3, 2, 3, '#0f172a');

    const cabBackX = cabinX - cabinL / 2;
    drawDeformedRect(cabBackX, -halfW + 0.5, cabinL, halfW * 2 - 1, '#b91c1c');
    drawDeformedRect(cabinX - cabinL * 0.25, -halfW + 1, 4, 1.8, '#0f172a');
    drawDeformedRect(cabinX - cabinL * 0.25, halfW - 2.8, 4, 1.8, '#0f172a');
    drawDeformedRect(cabinX + cabinL * 0.3, -halfW - 3, 2, 3.5, '#334155');
    drawDeformedRect(cabinX + cabinL * 0.3, halfW - 0.5, 2, 3.5, '#334155');

    const bodyX1 = -halfL + rc + 2;
    const bodyX2 = cabBackX - 1;
    const bodyW = halfW * 2 - 1.5;
    drawDeformedRect(bodyX1, -bodyW / 2, bodyX2 - bodyX1, bodyW, '#dc2626');
    drawDeformedLine(bodyX1, -bodyW / 2, bodyX2, -bodyW / 2, '#991b1b', 1);
    drawDeformedLine(bodyX2, -bodyW / 2, bodyX2, bodyW / 2, '#991b1b', 1);
    drawDeformedLine(bodyX2, bodyW / 2, bodyX1, bodyW / 2, '#991b1b', 1);
    drawDeformedLine(bodyX1, bodyW / 2, bodyX1, -bodyW / 2, '#991b1b', 1);

    const shutterCount = 3;
    const shutterSpan = (bodyX2 - bodyX1 - 4) / shutterCount;
    for (let s = 0; s < shutterCount; s++) {
      const sx = bodyX1 + 2 + s * shutterSpan;
      const sw = shutterSpan - 2;
      drawDeformedRect(sx, -bodyW / 2 + 0.5, sw, 3.5, '#e2e8f0');
      drawDeformedRect(sx, bodyW / 2 - 4, sw, 3.5, '#e2e8f0');
      drawDeformedLine(sx + 1, -bodyW / 2 + 2, sx + sw - 1, -bodyW / 2 + 2, '#64748b', 0.6);
      drawDeformedLine(sx + 1, bodyW / 2 - 2, sx + sw - 1, bodyW / 2 - 2, '#64748b', 0.6);
    }

    drawDeformedRect(bodyX1 + (bodyX2 - bodyX1) * 0.45, -2, 7, 4, '#0f172a');
    drawDeformedRect(bodyX1 + (bodyX2 - bodyX1) * 0.45 + 1.5, -1.2, 1.8, 1.2, '#38bdf8');
    drawDeformedRect(bodyX1 + (bodyX2 - bodyX1) * 0.45 + 3.8, -1.2, 1.8, 1.2, '#38bdf8');

    drawDeformedRect(bodyX1, -bodyW / 2 + 4.5, bodyX2 - bodyX1, 1.8, '#ffffff');
    drawDeformedRect(bodyX1, bodyW / 2 - 6.3, bodyX2 - bodyX1, 1.8, '#ffffff');

    const ladderX1 = bodyX1 + 2;
    const ladderW = 6.5;
    const ladderL = car.length * 0.52;
    drawDeformedRect(ladderX1, -ladderW / 2, ladderL, 1.2, '#cbd5e1');
    drawDeformedRect(ladderX1, ladderW / 2 - 1.2, ladderL, 1.2, '#cbd5e1');
    for (let lx = ladderX1 + 3; lx < ladderX1 + ladderL - 2; lx += 4) {
      drawDeformedLine(lx, -ladderW / 2, lx, ladderW / 2, '#475569', 0.8);
    }

    const cannonX = cabinX - 2;
    drawDeformedCircle(cannonX, 0, 3.5, '#334155');
    drawDeformedRect(cannonX, -1, 7, 2, '#94a3b8');
    drawDeformedCircle(cannonX - 1, 0, 1.5, '#ef4444');
  }

  // --- FIRE LADDER (HEAVY TURNTABLE AERIAL LADDER TRUCK) ---
  else if (car.type === 'fire_ladder') {
    const bumpX = halfL - fc;
    drawDeformedRect(bumpX - 1, -halfW - 0.5, 3.5, halfW * 2 + 1, '#cbd5e1');
    drawDeformedRect(bumpX, -3, 2.5, 6, '#0f172a'); // Heavy winch

    const cabBackX = cabinX - cabinL / 2;
    drawDeformedRect(cabBackX, -halfW + 0.5, cabinL, halfW * 2 - 1, '#b91c1c');
    drawDeformedRect(cabinX + cabinL * 0.3, -halfW - 3, 2, 3.5, '#334155');
    drawDeformedRect(cabinX + cabinL * 0.3, halfW - 0.5, 2, 3.5, '#334155');

    const bodyX1 = -halfL + rc + 2;
    const bodyX2 = cabBackX - 1;
    const bodyW = halfW * 2 - 1.5;
    drawDeformedRect(bodyX1, -bodyW / 2, bodyX2 - bodyX1, bodyW, '#dc2626');
    drawDeformedLine(bodyX1, -bodyW / 2, bodyX2, -bodyW / 2, '#991b1b', 1.2);
    drawDeformedLine(bodyX2, -bodyW / 2, bodyX2, bodyW / 2, '#991b1b', 1.2);
    drawDeformedLine(bodyX2, bodyW / 2, bodyX1, bodyW / 2, '#991b1b', 1.2);
    drawDeformedLine(bodyX1, bodyW / 2, bodyX1, -bodyW / 2, '#991b1b', 1.2);

    // 4 Hydraulic outrigger pods (stabilizers with hazard markings)
    const outriggerPositions = [bodyX1 + 5, bodyX2 - 8];
    outriggerPositions.forEach(ox => {
      drawDeformedRect(ox - 3, -bodyW / 2 - 2.5, 6, 2.5, '#facc15');
      drawDeformedLine(ox - 2, -bodyW / 2 - 2.5, ox, -bodyW / 2, '#0f172a', 1.2);
      drawDeformedRect(ox - 3, bodyW / 2, 6, 2.5, '#facc15');
      drawDeformedLine(ox - 2, bodyW / 2, ox, bodyW / 2 + 2.5, '#0f172a', 1.2);
    });

    // Side lockers
    const shutterCount = 4;
    const shutterSpan = (bodyX2 - bodyX1 - 8) / shutterCount;
    for (let s = 0; s < shutterCount; s++) {
      const sx = bodyX1 + 4 + s * shutterSpan;
      const sw = shutterSpan - 2;
      drawDeformedRect(sx, -bodyW / 2 + 0.5, sw, 3.2, '#e2e8f0');
      drawDeformedRect(sx, bodyW / 2 - 3.7, sw, 3.2, '#e2e8f0');
      drawDeformedLine(sx + 1, -bodyW / 2 + 2, sx + sw - 1, -bodyW / 2 + 2, '#64748b', 0.6);
      drawDeformedLine(sx + 1, bodyW / 2 - 2, sx + sw - 1, bodyW / 2 - 2, '#64748b', 0.6);
    }

    // Rear rotating 360° turntable base
    const turntableX = bodyX1 + (bodyX2 - bodyX1) * 0.32;
    drawDeformedCircle(turntableX, 0, 7.5, '#334155');
    drawDeformedCircle(turntableX, 0, 5.5, '#1e293b');
    drawDeformedCircle(turntableX, 0, 2.5, '#dc2626');
    drawDeformedRect(turntableX - 3, -7, 4, 3, '#0f172a'); // Control chair

    // Telescopic aerial ladder structure extending over truck
    const ladderX1 = turntableX - 5;
    const ladderL = car.length * 0.72;
    const ladderW = 8.5;
    drawDeformedRect(ladderX1, -ladderW / 2, ladderL, ladderW, 'rgba(241, 245, 249, 0.95)');
    drawDeformedLine(ladderX1, -ladderW / 2, ladderX1 + ladderL, -ladderW / 2, '#64748b', 1.4);
    drawDeformedLine(ladderX1, ladderW / 2, ladderX1 + ladderL, ladderW / 2, '#64748b', 1.4);
    drawDeformedLine(ladderX1 + ladderL, -ladderW / 2, ladderX1 + ladderL, ladderW / 2, '#64748b', 1.4);
    drawDeformedLine(ladderX1, -ladderW / 2, ladderX1, ladderW / 2, '#64748b', 1.4);

    // Structural ladder rungs & diagonal lattice
    for (let lx = ladderX1 + 4; lx < ladderX1 + ladderL - 6; lx += 4) {
      drawDeformedLine(lx, -ladderW / 2 + 0.8, lx, ladderW / 2 - 0.8, '#475569', 1.0);
    }
    for (let lx = ladderX1 + 4; lx < ladderX1 + ladderL - 8; lx += 8) {
      drawDeformedLine(lx, -ladderW / 2 + 1, lx + 8, ladderW / 2 - 1, '#94a3b8', 0.6);
    }

    // Inner narrower telescopic section
    drawDeformedLine(ladderX1 + 14, -ladderW * 0.25, ladderX1 + ladderL - 2, -ladderW * 0.25, '#94a3b8', 0.8);
    drawDeformedLine(ladderX1 + 14, ladderW * 0.25, ladderX1 + ladderL - 2, ladderW * 0.25, '#94a3b8', 0.8);

    // Front rescue basket/bucket at ladder tip
    const basketX = ladderX1 + ladderL - 1;
    const basketW = 10;
    drawDeformedRect(basketX, -basketW / 2, 5, basketW, '#e2e8f0');
    drawDeformedLine(basketX, -basketW / 2, basketX + 5, -basketW / 2, '#3b82f6', 1);
    drawDeformedLine(basketX + 5, -basketW / 2, basketX + 5, basketW / 2, '#3b82f6', 1);
    drawDeformedLine(basketX + 5, basketW / 2, basketX, basketW / 2, '#3b82f6', 1);
    drawDeformedCircle(basketX + 4, -basketW * 0.3, 1.2, '#fef08a'); // Searchlights
    drawDeformedCircle(basketX + 4, basketW * 0.3, 1.2, '#fef08a');
  }

  // --- FIRE RESCUE (SQUAD RESCUE TENDER WITH PNEUMATIC LIGHT MAST) ---
  else if (car.type === 'fire_rescue') {
    const bumpX = halfL - fc;
    drawDeformedRect(bumpX - 1, -halfW - 0.5, 3.5, halfW * 2 + 1, '#cbd5e1');
    drawDeformedRect(bumpX + 0.5, -4, 2, 8, '#0f172a'); // Winch & bull-bar

    const cabBackX = cabinX - cabinL / 2;
    drawDeformedRect(cabBackX, -halfW + 0.5, cabinL, halfW * 2 - 1, '#b91c1c');
    drawDeformedRect(cabinX + cabinL * 0.3, -halfW - 3, 2, 3.5, '#334155');
    drawDeformedRect(cabinX + cabinL * 0.3, halfW - 0.5, 2, 3.5, '#334155');

    const bodyX1 = -halfL + rc + 2;
    const bodyX2 = cabBackX - 1;
    const bodyW = halfW * 2 - 1.5;
    drawDeformedRect(bodyX1, -bodyW / 2, bodyX2 - bodyX1, bodyW, '#dc2626');
    drawDeformedLine(bodyX1, -bodyW / 2, bodyX2, -bodyW / 2, '#991b1b', 1.2);
    drawDeformedLine(bodyX2, -bodyW / 2, bodyX2, bodyW / 2, '#991b1b', 1.2);
    drawDeformedLine(bodyX2, bodyW / 2, bodyX1, bodyW / 2, '#991b1b', 1.2);
    drawDeformedLine(bodyX1, bodyW / 2, bodyX1, -bodyW / 2, '#991b1b', 1.2);

    // High-visibility diagonal rescue chevron stripes on flanks
    drawDeformedRect(bodyX1, -bodyW / 2 + 3.8, bodyX2 - bodyX1, 1.6, '#facc15');
    drawDeformedRect(bodyX1, bodyW / 2 - 5.4, bodyX2 - bodyX1, 1.6, '#facc15');

    // 6 Side roller shutters (3 per side)
    const shutterCount = 3;
    const shutterSpan = (bodyX2 - bodyX1 - 4) / shutterCount;
    for (let s = 0; s < shutterCount; s++) {
      const sx = bodyX1 + 2 + s * shutterSpan;
      const sw = shutterSpan - 2;
      drawDeformedRect(sx, -bodyW / 2 + 0.5, sw, 3.2, '#e2e8f0');
      drawDeformedRect(sx, bodyW / 2 - 3.7, sw, 3.2, '#e2e8f0');
      drawDeformedLine(sx + 1, -bodyW / 2 + 2, sx + sw - 1, -bodyW / 2 + 2, '#64748b', 0.6);
      drawDeformedLine(sx + 1, bodyW / 2 - 2, sx + sw - 1, bodyW / 2 - 2, '#64748b', 0.6);
    }

    // Checkerplate roof walkway
    const roofX1 = bodyX1 + 3;
    const roofX2 = bodyX2 - 3;
    const roofW = bodyW - 8;
    drawDeformedRect(roofX1, -roofW / 2, roofX2 - roofX1, roofW, '#94a3b8');
    for (let rx = roofX1 + 4; rx < roofX2; rx += 4) {
      drawDeformedLine(rx, -roofW / 2, rx, roofW / 2, '#64748b', 0.6);
    }

    // Heavy rescue equipment cases & hydraulic generator box
    drawDeformedRect(roofX1 + 2, -roofW / 2 + 1, 12, roofW * 0.45, '#f59e0b');
    drawDeformedRect(roofX1 + 2, 1, 12, roofW * 0.45, '#334155');

    // Telescoping pneumatic floodlight mast with quad LED heads
    const mastX = roofX1 + (roofX2 - roofX1) * 0.75;
    drawDeformedCircle(mastX, 0, 4.5, '#0f172a');
    drawDeformedCircle(mastX, 0, 3, '#cbd5e1');
    drawDeformedRect(mastX - 2, -4.5, 4, 2, '#ffffff'); // 4 LED floodlights
    drawDeformedRect(mastX - 2, 2.5, 4, 2, '#ffffff');
    drawDeformedRect(mastX - 4.5, -2, 2, 4, '#ffffff');
    drawDeformedRect(mastX + 2.5, -2, 2, 4, '#ffffff');
  }

  // --- STANDARD CITY BUS ---
  else if (car.type === 'bus') {
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

  // --- TRUCK BOX ---
  else if (car.type === 'truck_box') {





    const boxX1 = -halfL + rc + 3;
    const boxX2 = cabinX - cabinL / 2 - 1;
    const boxW = halfW * 2 - 1.2;
    drawDeformedRect(boxX1, -boxW / 2, boxX2 - boxX1, boxW, '#f8fafc');
    drawDeformedLine(boxX1, -boxW / 2, boxX2, -boxW / 2, '#94a3b8', 1.2);
    drawDeformedLine(boxX2, -boxW / 2, boxX2, boxW / 2, '#94a3b8', 1.2);
    drawDeformedLine(boxX2, boxW / 2, boxX1, boxW / 2, '#94a3b8', 1.2);
    drawDeformedLine(boxX1, boxW / 2, boxX1, -boxW / 2, '#94a3b8', 1.2);

    for (let bx = boxX1 + 6; bx < boxX2 - 4; bx += 6) {
      drawDeformedLine(bx, -boxW / 2 + 1, bx, boxW / 2 - 1, '#cbd5e1', 0.8);
    }
  }

  // --- TRUCK SEMI (СЕДЕЛЬНЫЙ ТЯГАЧ КАМАЗ-5410 С КАРДАНОМ, МОСТАМИ И СЕДЛОМ) ---
  else if (car.type === 'truck_semi') {
    const fifthWheelX = car.hitchOffset !== undefined ? car.hitchOffset : -12;
    const frameX1 = -halfL + rc + 0.5; // ~ -31.5 rear end of tractor frame
    const frameX2 = cabinX - cabinL / 2 + 1.0; // ~ 6.0 front of frame under sleeper cab
    const frameW = frameX2 - frameX1;

    // 1. Heavy C-Channel Steel Frame Rails (Лонжероны рамы КАМАЗ)
    // Left longitudinal frame rail (C-channel steel, driver side)
    drawDeformedRect(frameX1, -4.8, frameW, 1.8, '#1e293b');
    drawDeformedLine(frameX1, -4.8, frameX2, -4.8, '#334155', 0.8); // Top flange highlight
    // Right longitudinal frame rail (C-channel steel, passenger side)
    drawDeformedRect(frameX1, 3.0, frameW, 1.8, '#1e293b');
    drawDeformedLine(frameX1, 4.8, frameX2, 4.8, '#334155', 0.8);

    // Structural Transverse Crossmembers (Поперечины рамы КАМАЗ с заклепками)
    // Front crossmember behind cab
    drawDeformedRect(frameX2 - 2.5, -4.8, 2.0, 9.6, '#0f172a');
    drawDeformedCircle(frameX2 - 1.5, -3.2, 0.5, '#cbd5e1'); // Rivets
    drawDeformedCircle(frameX2 - 1.5, 3.2, 0.5, '#cbd5e1');

    // Central crossmember (over transmission output)
    drawDeformedRect(-1.5, -4.8, 2.2, 9.6, '#0f172a');
    drawDeformedCircle(-0.4, 0, 1.2, '#1e293b'); // Lightening hole

    // Bogie trunnion suspension crossmember (мощная поперечина балансира)
    drawDeformedRect(-17.8, -4.8, 2.5, 9.6, '#0f172a');

    // Rear closing towing crossmember (задняя буксирная поперечина со скосами)
    drawDeformedRect(frameX1, -4.8, 2.2, 9.6, '#0f172a');
    drawDeformedLine(frameX1, -4.8, frameX1 + 2.0, -4.8, '#475569', 0.8);
    drawDeformedLine(frameX1, 4.8, frameX1 + 2.0, 4.8, '#475569', 0.8);

    // 2. Drivetrain: Gearbox, Cardan Shafts & Tandem Drive Axles (КПП, Карданы и Мосты)
    // Gearbox rear output casing & flange behind engine
    drawDeformedRect(frameX2 - 3.5, -1.8, 3.0, 3.6, '#1e293b');
    drawDeformedRect(frameX2 - 4.5, -1.2, 1.0, 2.4, '#334155'); // Output companion flange

    // Main Cardan Driveshaft (Основной карданный вал от КПП к среднему мосту)
    // Front universal joint (крестовина кардана)
    drawDeformedRect(frameX2 - 5.5, -1.4, 1.2, 2.8, '#0f172a');
    drawDeformedLine(frameX2 - 5.5, 0, frameX2 - 4.3, 0, '#cbd5e1', 0.9);
    // Tubular driveshaft body
    drawDeformedLine(frameX2 - 5.5, 0, -9.5, 0, '#475569', 2.0);
    drawDeformedLine(frameX2 - 5.5, 0, -9.5, 0, '#94a3b8', 0.8); // Steel sheen highlight
    // Rear universal joint at intermediate axle input
    drawDeformedRect(-10.5, -1.4, 1.2, 2.8, '#0f172a');

    // Intermediate Tandem Drive Axle (Проходной ведущий средний мост) at x = -12.0
    // Cast axle casing beam running full width across hubs
    drawDeformedRect(-13.2, -halfW + 1.2, 2.4, halfW * 2 - 2.4, '#0f172a');
    // Central differential carrier pumpkin housing (картер главной передачи с межосевым дифференциалом)
    drawDeformedRect(-14.2, -2.8, 4.4, 5.6, '#1e293b');
    drawDeformedCircle(-12.0, 0, 2.0, '#334155');
    drawDeformedCircle(-12.0, 0, 0.8, '#cbd5e1'); // Inspection plug

    // Inter-Axle Cardan Shaft (Межосевой кардан между средним и задним мостами)
    drawDeformedLine(-14.2, 0, -21.5, 0, '#475569', 1.8);
    drawDeformedLine(-14.2, 0, -21.5, 0, '#94a3b8', 0.6);
    drawDeformedRect(-15.2, -1.2, 1.0, 2.4, '#0f172a'); // Universal joint
    drawDeformedRect(-22.5, -1.2, 1.0, 2.4, '#0f172a');

    // Rear Tandem Drive Axle (Задний ведущий мост) at x = -23.7
    // Cast axle casing beam
    drawDeformedRect(-24.9, -halfW + 1.2, 2.4, halfW * 2 - 2.4, '#0f172a');
    // Central differential carrier pumpkin housing
    drawDeformedRect(-25.8, -2.6, 4.2, 5.2, '#1e293b');
    drawDeformedCircle(-23.7, 0, 1.8, '#334155');

    // 3. Balancing Leaf Springs & Trunnions (Балансирная подвеска КАМАЗ)
    // Left trunnion and spring pack
    drawDeformedRect(-18.6, -6.6, 1.8, 1.6, '#0f172a'); // Trunnion hub
    drawDeformedRect(-24.0, -6.4, 12.0, 1.2, '#334155'); // Multi-leaf spring steel pack
    drawDeformedLine(-24.0, -6.4, -12.0, -6.4, '#64748b', 0.6);
    drawDeformedRect(-19.2, -6.7, 3.0, 1.8, '#cbd5e1'); // U-bolts (стремянки)
    // Right trunnion and spring pack
    drawDeformedRect(-18.6, 5.0, 1.8, 1.6, '#0f172a');
    drawDeformedRect(-24.0, 5.2, 12.0, 1.2, '#334155');
    drawDeformedLine(-24.0, 5.2, -12.0, 5.2, '#64748b', 0.6);
    drawDeformedRect(-19.2, 4.9, 3.0, 1.8, '#cbd5e1');

    // 4. Catwalk Diamond-Plate Deck behind Sleeper Cab (Переходной рифленый мостик)
    const catwalkX1 = frameX2 - 6.5;
    const catwalkX2 = frameX2;
    drawDeformedRect(catwalkX1, -5.5, catwalkX2 - catwalkX1, 11.0, '#334155');
    for (let cwx = catwalkX1 + 1.2; cwx < catwalkX2 - 0.5; cwx += 1.6) {
      drawDeformedLine(cwx, -5.0, cwx, 5.0, '#475569', 0.8);
    }

    // 5. Right Side Equipment: Massive 500L Fuel Tank (Топливный бак 500л)
    const tankX = frameX2 - 17.5;
    const tankL = 16.5;
    const tankW = 5.0;
    const tankY = halfW - tankW - 0.4;
    drawDeformedRect(tankX, tankY, tankL, tankW, '#475569'); // Main aluminum tank body
    drawDeformedRect(tankX, tankY + 0.6, tankL, 1.2, '#64748b'); // Top reflection highlight
    drawDeformedRect(tankX, tankY + tankW - 1.0, tankL, 1.0, '#1e293b'); // Bottom depth shadow
    // Tank steel mounting tension straps (хомуты крепления бака)
    drawDeformedRect(tankX + 2.5, tankY - 0.2, 1.0, tankW + 0.4, '#0f172a');
    drawDeformedRect(tankX + 8.2, tankY - 0.2, 1.0, tankW + 0.4, '#0f172a');
    drawDeformedRect(tankX + 14.0, tankY - 0.2, 1.0, tankW + 0.4, '#0f172a');
    // Tightening T-bolts
    drawDeformedCircle(tankX + 2.5, tankY + 0.5, 0.6, '#cbd5e1');
    drawDeformedCircle(tankX + 8.2, tankY + 0.5, 0.6, '#cbd5e1');
    drawDeformedCircle(tankX + 14.0, tankY + 0.5, 0.6, '#cbd5e1');
    // Chrome fuel filler neck and locking cap
    drawDeformedCircle(tankX + tankL - 2.8, tankY + 2.2, 1.2, '#cbd5e1');
    drawDeformedCircle(tankX + tankL - 2.8, tankY + 2.2, 0.6, '#f59e0b');

    // 6. Left Side Equipment: Heavy Steel Muffler, Battery Box & Air Brake Reservoirs (Глушитель КАМАЗ, АКБ и Ресиверы)
    // Authentic heavy steel cylindrical muffler box & side exhaust pipe outlet (exact anchor x = -3.2, y = -12.48)
    const muffX = -3.2;
    const muffY = -halfW + 1.2;
    drawDeformedRect(muffX - 4.2, muffY, 8.4, 3.4, '#1e293b'); // Main steel muffler body casing
    drawDeformedRect(muffX - 3.8, muffY + 0.4, 7.6, 0.8, '#475569'); // Cylindrical highlight
    drawDeformedRect(muffX - 4.4, muffY - 0.2, 0.8, 3.8, '#334155'); // End cap flange left
    drawDeformedRect(muffX + 3.6, muffY - 0.2, 0.8, 3.8, '#334155'); // End cap flange right
    // Angled exhaust pipe tailtip extending out to left sill (выхлопной патрубок влево под порог)
    drawDeformedLine(muffX - 2.0, muffY, muffX - 3.5, -halfW - 0.5, '#64748b', 2.2);
    drawDeformedCircle(muffX - 3.5, -halfW - 0.5, 1.2, '#0f172a'); // Pipe tip opening
    drawDeformedCircle(muffX - 3.5, -halfW - 0.5, 0.7, '#cbd5e1');

    // Heavy steel battery box with latched cover
    const batX = frameX2 - 9.0;
    const batY = -halfW + 0.6;
    drawDeformedRect(batX, batY, 8.2, 4.2, '#1e293b');
    drawDeformedRect(batX + 0.5, batY + 0.5, 7.2, 3.2, '#334155');
    drawDeformedLine(batX + 0.5, batY + 2.1, batX + 7.7, batY + 2.1, '#1e293b', 0.8);
    drawDeformedCircle(batX + 1.5, batY + 1.0, 0.5, '#cbd5e1'); // Latches
    drawDeformedCircle(batX + 6.7, batY + 1.0, 0.5, '#cbd5e1');

    // Dual cylindrical compressed air reservoirs (ресиверы тормозной системы)
    const resX = frameX2 - 18.5;
    drawDeformedRect(resX, -halfW + 0.8, 8.5, 2.0, '#334155'); // Outer air tank
    drawDeformedRect(resX + 0.8, -halfW + 1.1, 6.9, 0.6, '#64748b'); // Cylindrical highlight
    drawDeformedCircle(resX + 0.4, -halfW + 1.8, 0.5, '#d97706'); // Brass drain cock
    drawDeformedRect(resX, -halfW + 3.2, 8.5, 2.0, '#334155'); // Inner air tank
    drawDeformedRect(resX + 0.8, -halfW + 3.5, 6.9, 0.6, '#64748b');
    drawDeformedCircle(resX + 0.4, -halfW + 4.2, 0.5, '#d97706');

    // 7. Spare Tire on Vertical Winch Carrier behind Cab (Запасное колесо КАМАЗ)
    const spareX = frameX2 - 3.8;
    const spareY = halfW - 10.2;
    drawDeformedRect(spareX, spareY, 3.4, 7.8, '#0f172a'); // Black rubber tire tread
    drawDeformedRect(spareX + 0.6, spareY + 0.6, 2.2, 6.6, '#475569'); // Steel wheel rim
    drawDeformedRect(spareX + 1.0, spareY + 2.0, 1.4, 3.8, '#1e293b'); // Wheel dish
    drawDeformedCircle(spareX + 1.7, spareY + 3.9, 0.8, '#cbd5e1'); // Central retaining clamp

    // 8. Tandem Rear Fenders & Mudguards (Крылья и брызговики задней тележки)
    // Left composite curved fender arch covering both rear axles
    drawDeformedRect(-27.0, -halfW + 0.2, 18.5, 3.8, '#1e293b');
    drawDeformedLine(-27.0, -halfW + 0.2, -8.5, -halfW + 0.2, '#334155', 1.0);
    // Amber side clearance marker light
    drawDeformedCircle(-17.8, -halfW + 0.4, 0.8, '#f59e0b');

    // Right composite curved fender arch covering both rear axles
    drawDeformedRect(-27.0, halfW - 4.0, 18.5, 3.8, '#1e293b');
    drawDeformedLine(-27.0, halfW - 0.2, -8.5, halfW - 0.2, '#334155', 1.0);
    drawDeformedCircle(-17.8, halfW - 0.4, 0.8, '#f59e0b');

    // Heavy black rubber rear mudflaps with white reflector bands
    drawDeformedRect(frameX1 - 1.4, -halfW + 0.3, 1.8, 4.0, '#020617');
    drawDeformedLine(frameX1 - 1.4, -halfW + 2.3, frameX1 + 0.4, -halfW + 2.3, '#f8fafc', 0.8);
    drawDeformedRect(frameX1 - 1.4, halfW - 4.3, 1.8, 4.0, '#020617');
    drawDeformedLine(frameX1 - 1.4, halfW - 2.3, frameX1 + 0.4, halfW - 2.3, '#f8fafc', 0.8);

    // 9. Authentic Fifth Wheel Coupling Assembly (Седельно-сцепное устройство - ССУ "Седло")
    // Heavy mounting subframe baseplate bolted across frame rails
    drawDeformedRect(fifthWheelX - 4.8, -5.2, 9.6, 10.4, '#0f172a');
    // Heavy cast pivot trunnions (опоры седла)
    drawDeformedRect(fifthWheelX - 3.8, -5.2, 7.6, 1.8, '#334155');
    drawDeformedRect(fifthWheelX - 3.8, 3.4, 7.6, 1.8, '#334155');

    // Horseshoe Fifth Wheel Saddle Plate (Плита седла с графитной смазкой)
    drawDeformedRect(fifthWheelX - 4.0, -4.5, 8.0, 9.0, '#1e293b');
    // Dark graphite grease coating
    drawDeformedRect(fifthWheelX - 3.2, -3.8, 6.4, 7.6, '#090d16');
    // Grease distribution grooves (радиальные канавки для смазки)
    drawDeformedLine(fifthWheelX - 2.5, -2.5, fifthWheelX + 2.5, -2.5, '#1e293b', 0.8);
    drawDeformedLine(fifthWheelX - 2.5, 2.5, fifthWheelX + 2.5, 2.5, '#1e293b', 0.8);
    drawDeformedLine(fifthWheelX + 2.5, -2.5, fifthWheelX + 2.5, 2.5, '#1e293b', 0.8);

    // Rear V-shaped entry throat with lead-in guide ramps (зев седла со скосами)
    drawDeformedRect(fifthWheelX - 4.5, -1.6, 4.5, 3.2, '#0f172a'); // Central lock throat
    drawDeformedLine(fifthWheelX - 4.2, -3.5, fifthWheelX - 1.5, -0.8, '#334155', 1.2); // Left guide bevel
    drawDeformedLine(fifthWheelX - 4.2, 3.5, fifthWheelX - 1.5, 0.8, '#334155', 1.2); // Right guide bevel

    // Steel Kingpin Locking Jaws (Кулачки замка шкворня)
    drawDeformedCircle(fifthWheelX - 0.2, 0, 1.4, '#475569');
    drawDeformedCircle(fifthWheelX - 0.2, 0, 0.7, '#0f172a');

    // Manual Release Safety Pull Handle (Рукоятка замка седла с предохранителем)
    // Extending towards driver side (y < 0)
    drawDeformedLine(fifthWheelX - 0.5, -4.5, fifthWheelX - 0.5, -8.2, '#cbd5e1', 1.2);
    drawDeformedLine(fifthWheelX - 0.5, -8.2, fifthWheelX - 2.0, -8.2, '#cbd5e1', 1.2); // Hook handle
    drawDeformedCircle(fifthWheelX - 0.5, -4.8, 0.7, '#ef4444'); // Safety latch pin
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
  // --- TRUCK DUMP (КАМАЗ-5511 САМОСВАЛ - PREMIUM TOP-DOWN TEXTURE) ---
  else if (car.type === 'truck_dump') {
    const dumpColor = car.color || '#d97706';
    
    // Hydraulic lifting cylinder between cab and tipper body
    const cylX = cabinX - cabinL / 2 - 2;
    drawDeformedRect(cylX - 2.5, -3, 3.5, 6, '#334155');
    drawDeformedRect(cylX - 1.5, -2, 2, 4, '#cbd5e1'); // Chrome piston rod

    // Dump body (кузов)
    // Starts behind the spare tire and cab, ends at the rear bumper
    const dumpX1 = -halfL + rc + 2; 
    const dumpX2 = cabinX - cabinL / 2 - 3.5; 
    const dumpW = halfW * 2 - 1.0;
    
    // Outer tipper frame (The orange scoop body)
    drawDeformedRect(dumpX1, -dumpW / 2, dumpX2 - dumpX1, dumpW, dumpColor);
    
    // Edge highlights / shadows (gives premium texture)
    drawDeformedLine(dumpX1, -dumpW / 2, dumpX2, -dumpW / 2, 'rgba(0,0,0,0.4)', 1.5);
    drawDeformedLine(dumpX2, -dumpW / 2, dumpX2, dumpW / 2, 'rgba(0,0,0,0.4)', 1.5);
    drawDeformedLine(dumpX2, dumpW / 2, dumpX1, dumpW / 2, 'rgba(0,0,0,0.4)', 1.5);
    drawDeformedLine(dumpX1, dumpW / 2, dumpX1, -dumpW / 2, 'rgba(0,0,0,0.4)', 1.5);

    // Heavy vertical stiffening ribs (ребра жесткости) on sides
    for (let rx = dumpX1 + 5; rx <= dumpX2 - 5; rx += 7) {
      drawDeformedRect(rx, -dumpW / 2, 3, 2.5, 'rgba(0,0,0,0.3)');
      drawDeformedRect(rx, dumpW / 2 - 2.5, 3, 2.5, 'rgba(0,0,0,0.3)');
    }

    // Heavy protective canopy (козырек) overhang over the cab
    // KAMAZ 5511 canopy covers the gap and extends slightly over the roof
    const canopyX2 = cabinX + cabinL * 0.15;
    const canopyW = dumpW * 0.94;
    drawDeformedRect(dumpX2, -canopyW / 2, canopyX2 - dumpX2, canopyW, dumpColor);
    drawDeformedLine(canopyX2, -canopyW / 2, canopyX2, canopyW / 2, 'rgba(0,0,0,0.5)', 1.5);
    drawDeformedLine(dumpX2, -canopyW / 2, canopyX2, -canopyW / 2, 'rgba(0,0,0,0.3)', 1.2);
    drawDeformedLine(dumpX2, canopyW / 2, canopyX2, canopyW / 2, 'rgba(0,0,0,0.3)', 1.2);
    
    // Slanted reinforcement ribs on the canopy
    drawDeformedLine(dumpX2, -canopyW * 0.35, canopyX2 - 1, -canopyW * 0.2, 'rgba(0,0,0,0.2)', 1.2);
    drawDeformedLine(dumpX2, canopyW * 0.35, canopyX2 - 1, canopyW * 0.2, 'rgba(0,0,0,0.2)', 1.2);

    // Inner cargo bed (scuffed steel floor)
    const bedX1 = dumpX1 + 3.5;
    const bedX2 = dumpX2 - 2.5;
    const bedW = dumpW - 6.0;
    
    // Empty scuffed metal bucket interior
    drawDeformedRect(bedX1, -bedW / 2, bedX2 - bedX1, bedW, '#475569');
    drawDeformedRect(bedX1 + 2, -bedW / 2 + 2, bedX2 - bedX1 - 4, bedW - 4, '#334155');
    // Scrape marks from dumping
    drawDeformedLine(bedX1 + 5, -bedW / 3, bedX2 - 5, -bedW / 3, '#1e293b', 2.0);
    drawDeformedLine(bedX1 + 5, bedW / 3, bedX2 - 5, bedW / 3, '#1e293b', 2.0);
    drawDeformedLine(bedX1 + 2, 0, bedX2 - 2, 0, '#1e293b', 2.5);

    // Slanted rear tail of the scoop (Kamaz 5511 scoop ends without a flat tailgate, it slants up)
    drawDeformedRect(dumpX1, -dumpW / 2 + 0.5, 3.5, dumpW - 1.0, 'rgba(0,0,0,0.25)');
    drawDeformedLine(dumpX1 + 3.5, -dumpW / 2 + 0.5, dumpX1 + 3.5, dumpW / 2 - 0.5, 'rgba(0,0,0,0.4)', 1.5);
    
    // Rear mudflaps
    drawDeformedRect(dumpX1 - 1.5, -dumpW / 2 + 1, 1.5, 3.5, '#0f172a');
    drawDeformedRect(dumpX1 - 1.5, dumpW / 2 - 4.5, 1.5, 3.5, '#0f172a');
  }

  // --- TRUCK WATER (ПОЛИВОМОЕЧНЫЙ ВОДОВОЗ КО-829А НА ШАССИ ЗИЛ-4331) ---
  else if (car.type === 'truck_water') {
    const hoodX1 = cabinX + cabinL / 2;
    const hoodX2 = halfL - fc;

    // 1. Front Washing Nozzles (Поливомоечные сопла / насадки КО-829А, смонтированные ПОД передним бампером)
    // Left & right adjustable heavy-duty steel fan-spray nozzles mounted on lower chassis horns under the bumper
    // Mounting brackets extending from under the chassis/bumper
    drawDeformedLine(hoodX2 - 1.8, -halfW * 0.68, hoodX2 + 0.6, -halfW * 0.82, '#1e293b', 2.2);
    drawDeformedRect(hoodX2 - 0.6, -halfW * 0.84, 1.4, 1.6, '#334155'); // Cast-iron swivel bracket
    drawDeformedLine(hoodX2 + 0.4, -halfW * 0.82, hoodX2 + 0.8, -halfW * 0.86, '#94a3b8', 1.6); // Slit spray orifice (steel/silver)
    
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

      // Nozzle orifice coordinates right under the front bumper edge
      const leftNozzleX = hoodX2 + 0.8;
      const leftNozzleY = -halfW * 0.86;
      const rightNozzleX = hoodX2 + 0.8;
      const rightNozzleY = halfW * 0.86;

      const timeNow = Date.now();
      const pulseL = Math.sin(timeNow * 0.024) * 1.5;
      const pulseR = Math.sin(timeNow * 0.024 + 1.2) * 1.5;

      if (isHighPressure) {
        // Downward impact reach on pavement: in real life nozzles hit pavement ~2.2 - 3.2m (22 - 32px) in front of bumper
        const impactReach = 20 + pressureFactor * 10;
        const impX = leftNozzleX + impactReach;

        // Fan angle: spreads outwards towards road curb and slightly inwards
        const fanOuterL = leftNozzleY - (14 + pressureFactor * 16) + pulseL;
        const fanInnerL = leftNozzleY + (3 + pressureFactor * 4);

        const fanOuterR = rightNozzleY + (14 + pressureFactor * 16) + pulseR;
        const fanInnerR = rightNozzleY - (3 + pressureFactor * 4);

        // --- LEFT NOZZLE WATER SHEET (Водяной нож левого сопла) ---
        // 1) High velocity downward water curtain (gradient from crisp nozzle core to pavement impact)
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

        // Longitudinal high-velocity stream cores (струи под давлением)
        drawDeformedLine(leftNozzleX, leftNozzleY, impX + pulseL * 0.6, leftNozzleY - 7, 'rgba(255, 255, 255, 0.9)', 1.6);
        drawDeformedLine(leftNozzleX, leftNozzleY, impX - 1, leftNozzleY - 1, 'rgba(224, 242, 254, 0.8)', 1.2);
        drawDeformedLine(leftNozzleX, leftNozzleY, impX + pulseL, fanOuterL + 4, 'rgba(56, 189, 248, 0.7)', 1.3);

        // 2) Ground Impact Splash Arc & Foam Crest (Гребень удара о дорожное полотно и белая пена)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(sp1X, sp1Y);
        const [midLSpX, midLSpY] = deform(impX + 1.5, (fanOuterL + fanInnerL) / 2);
        ctx.quadraticCurveTo(midLSpX, midLSpY, sp2X, sp2Y);
        ctx.stroke();

        // Turbulent ground wash wave extending laterally (отвод воды к обочине)
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        const [wOutLX, wOutLY] = deform(impX + 5, fanOuterL - 4);
        ctx.moveTo(sp1X, sp1Y);
        ctx.lineTo(wOutLX, wOutLY);
        ctx.stroke();

        // --- RIGHT NOZZLE WATER SHEET (Водяной нож правого сопла) ---
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

        // Core high velocity streams
        drawDeformedLine(rightNozzleX, rightNozzleY, impX + pulseR * 0.6, rightNozzleY + 7, 'rgba(255, 255, 255, 0.9)', 1.6);
        drawDeformedLine(rightNozzleX, rightNozzleY, impX - 1, rightNozzleY + 1, 'rgba(224, 242, 254, 0.8)', 1.2);
        drawDeformedLine(rightNozzleX, rightNozzleY, impX + pulseR, fanOuterR - 4, 'rgba(56, 189, 248, 0.7)', 1.3);

        // Ground Impact Splash Arc & Foam Crest
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(sp3X, sp3Y);
        const [midRSpX, midRSpY] = deform(impX + 1.5, (fanOuterR + fanInnerR) / 2);
        ctx.quadraticCurveTo(midRSpX, midRSpY, sp4X, sp4Y);
        ctx.stroke();

        // Turbulent ground wash wave extending laterally
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        const [wOutRX, wOutRY] = deform(impX + 5, fanOuterR + 4);
        ctx.moveTo(sp4X, sp4Y);
        ctx.lineTo(wOutRX, wOutRY);
        ctx.stroke();

        // 3) Water Mist / Aerosol Haze around front bumper (Шлейф водяной пыли)
        const mistGradL = ctx.createRadialGradient(impX - 2, fanOuterL + 6, 2, impX - 2, fanOuterL + 6, 16 + pressureFactor * 8);
        mistGradL.addColorStop(0, 'rgba(240, 249, 255, 0.35)');
        mistGradL.addColorStop(0.5, 'rgba(186, 230, 253, 0.18)');
        mistGradL.addColorStop(1, 'rgba(186, 230, 253, 0.0)');
        ctx.fillStyle = mistGradL;
        ctx.beginPath();
        const [mistLX, mistLY] = deform(impX - 2, fanOuterL + 6);
        ctx.arc(mistLX, mistLY, 16 + pressureFactor * 8, 0, Math.PI * 2);
        ctx.fill();

        const mistGradR = ctx.createRadialGradient(impX - 2, fanOuterR - 6, 2, impX - 2, fanOuterR - 6, 16 + pressureFactor * 8);
        mistGradR.addColorStop(0, 'rgba(240, 249, 255, 0.35)');
        mistGradR.addColorStop(0.5, 'rgba(186, 230, 253, 0.18)');
        mistGradR.addColorStop(1, 'rgba(186, 230, 253, 0.0)');
        ctx.fillStyle = mistGradR;
        ctx.beginPath();
        const [mistRX, mistRY] = deform(impX - 2, fanOuterR - 6);
        ctx.arc(mistRX, mistRY, 16 + pressureFactor * 8, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // Low-pressure gravity trickle when PTO is off or engine is stopped (самотёк под бампер)
        drawDeformedLine(leftNozzleX, leftNozzleY, leftNozzleX + 5, leftNozzleY - 2, 'rgba(224, 242, 254, 0.7)', 1.2);
        drawDeformedLine(rightNozzleX, rightNozzleY, rightNozzleX + 5, rightNozzleY + 2, 'rgba(224, 242, 254, 0.7)', 1.2);
        drawDeformedCircle(leftNozzleX + 5.5, leftNozzleY - 2, 1.2, 'rgba(56, 189, 248, 0.6)');
        drawDeformedCircle(rightNozzleX + 5.5, rightNozzleY + 2, 1.2, 'rgba(56, 189, 248, 0.6)');
      }

      ctx.restore();
    }

    // High pressure feed hose pipes from pump to front bumper
    drawDeformedLine(cabinX - cabinL / 2, -halfW * 0.45, hoodX2 - 1, -halfW * 0.45, '#334155', 1.4);

    // 2. Chassis Rail Equipment (170L Diesel tank, air receivers, battery box, side steps)
    const frameX1 = -halfL + rc + 1;
    const frameX2 = cabinX - cabinL / 2 - 5.5;

    // Left side: Diesel fuel tank & cab step
    drawDeformedRect(frameX1 + 2, -halfW - 0.8, 10.0, 2.2, '#1e293b'); // Fuel tank body
    drawDeformedRect(frameX1 + 3, -halfW - 1.0, 1.2, 2.6, '#cbd5e1'); // Silver tank strap
    drawDeformedRect(frameX1 + 9, -halfW - 1.0, 1.2, 2.6, '#cbd5e1');
    drawDeformedCircle(frameX1 + 3.5, -halfW - 0.4, 0.8, '#cbd5e1'); // Filler cap

    // Right side: Pneumatic air receivers & exhaust pipe with spark arrestor
    drawDeformedRect(frameX1 + 2, halfW - 1.4, 7.5, 2.0, '#334155'); // Twin air tanks
    drawDeformedLine(frameX1 + 2, halfW - 0.4, frameX1 + 9.5, halfW - 0.4, '#0f172a', 0.8);
    // Vertical exhaust pipe behind cab with spark arrestor hood
    drawDeformedCircle(cabinX - cabinL / 2 + 1, halfW * 0.82, 1.5, '#0f172a');
    drawDeformedCircle(cabinX - cabinL / 2 + 1, halfW * 0.82, 0.9, '#cbd5e1');

    // 3. Equipment Platform between Cab and Cistern (Насосная установка КО-829А)
    const eqX1 = cabinX - cabinL / 2 - 5.5;
    const eqX2 = cabinX - cabinL / 2;
    const eqMidX = (eqX1 + eqX2) / 2;

    // Heavy steel diamond-plate platform
    drawDeformedRect(eqX1, -halfW + 1.0, eqX2 - eqX1, halfW * 2 - 2.0, '#1e293b');

    // Centrifugal water pump unit (Центробежный насос НЦПН / ЦНС)
    drawDeformedRect(eqMidX - 1.8, -halfW * 0.45, 3.6, halfW * 0.9, '#334155');
    // Cooling ribs & casing bolts
    drawDeformedLine(eqMidX - 0.9, -halfW * 0.4, eqMidX - 0.9, halfW * 0.4, '#0f172a', 0.8);
    drawDeformedLine(eqMidX + 0.9, -halfW * 0.4, eqMidX + 0.9, halfW * 0.4, '#0f172a', 0.8);

    // Suction & discharge manifold piping with brass flanges
    drawDeformedLine(eqMidX, -halfW * 0.35, eqX1 - 1, -halfW * 0.35, '#94a3b8', 2.2);
    drawDeformedCircle(eqMidX, -halfW * 0.35, 1.5, '#d97706'); // Brass flange
    drawDeformedLine(eqMidX, 0, eqMidX, halfW * 0.65, '#cbd5e1', 2.0);
    drawDeformedLine(eqMidX, halfW * 0.65, eqX1 - 0.5, halfW * 0.65, '#cbd5e1', 2.0);

    // Water Pressure Gauge (Манометр давления воды)
    drawDeformedCircle(eqMidX - 0.4, 0, 1.8, '#0f172a');
    drawDeformedCircle(eqMidX - 0.4, 0, 1.3, '#f8fafc');
    drawDeformedLine(eqMidX - 0.4, 0, eqMidX, -0.8, '#ef4444', 0.6);

    // Red Gate Valves (Маховики запорных вентилей)
    drawDeformedCircle(eqMidX - 1.2, -halfW * 0.35, 1.5, '#dc2626');
    drawDeformedCircle(eqMidX - 1.2, -halfW * 0.35, 0.6, '#f59e0b');

    // Water Hose Reel & Coil on the right flank (Барабан с поливочным рукавом)
    const reelX = eqMidX;
    const reelY = halfW * 0.76;
    const isHoseOut = !!car.fluidTank?.isWaterHoseDeployed;

    drawDeformedRect(reelX - 2.0, reelY - 2.2, 4.0, 4.4, '#0f172a');
    if (!isHoseOut) {
      drawDeformedCircle(reelX, reelY, 2.6, '#0f172a');
      drawDeformedCircle(reelX, reelY, 1.9, '#ea580c'); // High-vis hose coil
      drawDeformedCircle(reelX, reelY, 1.2, '#0f172a');
      drawDeformedCircle(reelX, reelY, 0.6, '#cbd5e1');
      drawDeformedLine(reelX + 1.5, reelY + 1.5, reelX + 3.0, reelY + 2.0, '#d97706', 1.2); // Brass nozzle
    } else {
      drawDeformedCircle(reelX, reelY, 1.2, '#475569');
      drawDeformedCircle(reelX, reelY, 0.6, '#cbd5e1');
      drawDeformedLine(reelX, reelY, reelX + 1.5, reelY + 1.5, '#0f172a', 1.5);
    }

    // 4. Cistern Body (Ярко-жёлтая бочка водовоза)
    const tankX2 = cabinX - cabinL / 2 - 5.5;
    const tankX1 = -halfL + rc - 1.5;
    const tankW = halfW * 2 - 2.2;

    // Bright yellow metallic gradient for the barrel body
    const tankGrad = ctx.createLinearGradient(0, -tankW / 2, 0, tankW / 2);
    tankGrad.addColorStop(0, '#ca8a04');   // Darker golden yellow top shadow
    tankGrad.addColorStop(0.18, '#fef08a'); // Shiny yellow highlight
    tankGrad.addColorStop(0.5, '#eab308');  // Rich bright yellow
    tankGrad.addColorStop(0.82, '#ca8a04'); // Golden shadow
    tankGrad.addColorStop(1, '#854d0e');    // Dark bottom edge shadow

    // Clean main barrel rectangle
    drawDeformedRect(tankX1, -tankW / 2, tankX2 - tankX1, tankW, tankGrad);

    // Clean, crisp tank borders & end cap outlines
    drawDeformedLine(tankX1, -tankW / 2, tankX2, -tankW / 2, '#854d0e', 1.0);
    drawDeformedLine(tankX2, -tankW / 2, tankX2, tankW / 2, '#854d0e', 1.2); // Front end cap
    drawDeformedLine(tankX2, tankW / 2, tankX1, tankW / 2, '#854d0e', 1.0);
    drawDeformedLine(tankX1, tankW / 2, tankX1, -tankW / 2, '#854d0e', 1.2); // Rear end cap

    // Longitudinal metallic highlights
    drawDeformedLine(tankX1 + 1, -tankW * 0.28, tankX2 - 1, -tankW * 0.28, 'rgba(255, 255, 255, 0.35)', 0.8);
    drawDeformedLine(tankX1 + 1, tankW * 0.28, tankX2 - 1, tankW * 0.28, 'rgba(0, 0, 0, 0.25)', 0.8);

    // Steel retention straps with silver tensioning bolts
    const band1X = tankX1 + (tankX2 - tankX1) * 0.25;
    const band2X = tankX1 + (tankX2 - tankX1) * 0.50;
    const band3X = tankX1 + (tankX2 - tankX1) * 0.75;
    [band1X, band2X, band3X].forEach(bx => {
      drawDeformedRect(bx - 1.0, -tankW / 2 - 0.4, 2.0, tankW + 0.8, '#0f172a');
      drawDeformedCircle(bx, -tankW / 2 - 0.4, 0.8, '#f8fafc');
      drawDeformedCircle(bx, tankW / 2 + 0.4, 0.8, '#f8fafc');
    });

    // 5. Top Catwalk, Access Ladder & Filling Manhole Hatch
    // Steel mesh catwalk
    drawDeformedRect(tankX1 + 3, -2.6, tankX2 - tankX1 - 6, 5.2, '#334155');
    drawDeformedRect(tankX1 + 3.5, -2.1, tankX2 - tankX1 - 7, 4.2, '#475569');
    // Safety handrail along catwalk
    drawDeformedLine(tankX1 + 4, -2.6, tankX2 - 4, -2.6, '#cbd5e1', 0.8);

    // Rear Access Ladder
    drawDeformedLine(tankX1 - 2.5, -1.8, tankX1, -1.8, '#cbd5e1', 1.2);
    drawDeformedLine(tankX1 - 2.5, 1.8, tankX1, 1.8, '#cbd5e1', 1.2);
    for (let lx = tankX1 - 2.2; lx <= tankX1 - 0.4; lx += 0.8) {
      drawDeformedLine(lx, -1.8, lx, 1.8, '#cbd5e1', 0.8);
    }

    // Top Filling Manhole Hatch
    const hatchX = tankX1 + (tankX2 - tankX1) * 0.5;
    drawDeformedCircle(hatchX, 0, 3.2, '#1e293b'); // Outer collar
    drawDeformedCircle(hatchX, 0, 2.0, '#cbd5e1'); // Metallic dome lid
    drawDeformedCircle(hatchX, 0, 0.9, '#dc2626'); // Red cap

    // 6. Cylindrical Side Hose Canisters
    drawDeformedRect(tankX1 + 1, -halfW - 0.2, tankX2 - tankX1 - 2, 1.6, '#334155');
    drawDeformedCircle(tankX1 + 1, -halfW + 0.6, 0.8, '#cbd5e1');
    drawDeformedCircle(tankX2 - 1, -halfW + 0.6, 0.8, '#cbd5e1');

    drawDeformedRect(tankX1 + 1, halfW - 1.4, tankX2 - tankX1 - 2, 1.6, '#334155');
    drawDeformedCircle(tankX1 + 1, halfW - 0.6, 0.8, '#cbd5e1');
    drawDeformedCircle(tankX2 - 1, halfW - 0.6, 0.8, '#cbd5e1');

    // 7. Rear Underrun Bumper with Red/White Hazard Warning Stripes & Spray Bar
    drawDeformedRect(tankX1 - 3.5, -halfW + 1.0, 2.2, halfW * 2 - 2.0, '#0f172a');
    for (let sy = -halfW + 1.5; sy <= halfW - 2.5; sy += 3.5) {
      drawDeformedRect(tankX1 - 3.2, sy, 1.6, 1.8, '#dc2626');
      drawDeformedRect(tankX1 - 3.2, sy + 1.8, 1.6, 1.7, '#f8fafc');
    }

    // Rear gravity discharge spray nozzle
    drawDeformedRect(tankX1 - 2.8, -2.5, 2.2, 5.0, '#334155');
    drawDeformedCircle(tankX1 - 2.8, 0, 1.8, '#0284c7');
    drawDeformedLine(tankX1 - 2.8, -3.5, tankX1 - 2.8, 3.5, '#38bdf8', 1.2);
  }

  // --- TRUCK TANKER (FUEL TANKER) ---
  else if (car.type === 'truck_tanker') {
    const hoodX1 = cabinX + cabinL / 2;
    const hoodX2 = halfL - fc;
    drawDeformedRect(hoodX1, -halfW + 3, hoodX2 - hoodX1, halfW * 2 - 6, car.color);
    drawDeformedRect(hoodX2 - 2, -halfW + 1, 2.5, halfW * 2 - 2, '#1e293b');

    const tankX1 = -halfL + rc + 3;
    const tankX2 = cabinX - cabinL / 2 - 1;
    const tankW = halfW * 2 - 2;
    const tankGrad = ctx.createLinearGradient(0, -tankW / 2, 0, tankW / 2);
    tankGrad.addColorStop(0, '#94a3b8');
    tankGrad.addColorStop(0.2, '#f8fafc');
    tankGrad.addColorStop(0.5, '#cbd5e1');
    tankGrad.addColorStop(0.8, '#64748b');
    tankGrad.addColorStop(1, '#334155');
    drawDeformedRect(tankX1, -tankW / 2, tankX2 - tankX1, tankW, tankGrad);
    drawDeformedLine(tankX1, -tankW / 2, tankX2, -tankW / 2, '#475569', 1);
    drawDeformedLine(tankX2, -tankW / 2, tankX2, tankW / 2, '#475569', 1);
    drawDeformedLine(tankX2, tankW / 2, tankX1, tankW / 2, '#475569', 1);
    drawDeformedLine(tankX1, tankW / 2, tankX1, -tankW / 2, '#475569', 1);

    drawDeformedRect(tankX1 + 4, -3, tankX2 - tankX1 - 8, 6, '#334155');
    const hatch1X = tankX1 + (tankX2 - tankX1) * 0.3;
    const hatch2X = tankX1 + (tankX2 - tankX1) * 0.7;
    drawDeformedCircle(hatch1X, 0, 3, '#0f172a');
    drawDeformedCircle(hatch2X, 0, 3, '#0f172a');
  }

  // --- TRUCK FLATBED (ГАЗ-53 БОРТОВОЙ ДЕРЕВЯННЫЙ ГРУЗОВИК) ---
  else if (car.type === 'truck_flatbed') {
    const bedX1 = -halfL + rc + 1.2;
    const bedX2 = cabinX - cabinL / 2 - 2.2;
    const bedL = bedX2 - bedX1;
    const bedW = halfW * 2 - 0.8;
    const halfBedW = bedW / 2;

    // 1. Heavy Ladder Chassis Rails & Underbody Equipment (Рама шасси, бак, глушитель, запаска)
    // C-Channel Heavy Steel Frame Rails
    const frameW = halfW * 0.42;
    drawDeformedRect(bedX1, -frameW, bedL + 2, 2.2, '#1e293b');
    drawDeformedRect(bedX1, frameW - 2.2, bedL + 2, 2.2, '#1e293b');

    // 90L Steel Fuel Tank on Left Chassis Rail (Топливный бак 90 л с горловиной и стяжными лентами)
    const tankX = bedX2 - 15;
    const tankL = 13.5;
    const tankW = 4.2;
    const tankY = -halfW + 0.4;
    drawDeformedRect(tankX, tankY, tankL, tankW, '#0f172a');
    drawDeformedRect(tankX + 1, tankY + 0.8, tankL - 2, tankW - 1.6, '#1e293b');
    // Metal mounting retention straps with silver tensioning bolts
    drawDeformedLine(tankX + 3.0, tankY, tankX + 3.0, tankY + tankW, '#64748b', 1.0);
    drawDeformedLine(tankX + tankL - 3.0, tankY, tankX + tankL - 3.0, tankY + tankW, '#64748b', 1.0);
    // Chrome Fuel Filler Neck & Cap (Заливная горловина с крышкой)
    drawDeformedCircle(tankX + tankL - 2.5, tankY + 0.8, 1.2, '#cbd5e1', '#0f172a', 0.6);

    // Battery & Tool Storage Box on Right Side (Инструментальный ящик и АКБ)
    const boxX = bedX2 - 13;
    const boxL = 11.5;
    const boxW = 3.8;
    const boxY = halfW - 4.2;
    drawDeformedRect(boxX, boxY, boxL, boxW, '#0f172a');
    drawDeformedRect(boxX + 0.8, boxY + 0.8, boxL - 1.6, boxW - 1.6, '#1e293b');
    drawDeformedLine(boxX + 2, boxY + boxW / 2, boxX + boxL - 2, boxY + boxW / 2, '#475569', 0.8);
    drawDeformedRect(boxX + boxL / 2 - 1, boxY + 0.4, 2, 1, '#cbd5e1'); // Latch

    // Exhaust System & Muffler under Chassis (Глушитель ГАЗ-53)
    const mufX = bedX2 - 18;
    drawDeformedRect(mufX, 2.0, 9.0, 2.8, '#334155');
    drawDeformedLine(mufX - 2, 3.4, mufX + 11, 3.4, '#475569', 1.2);
    // Tailpipe exit
    drawDeformedLine(mufX - 2, 3.4, mufX - 5, 5.2, '#334155', 1.4);

    // Spare Wheel on Chassis Carrier (Запасное колесо ГАЗ-53)
    const spareX = bedX1 + 10;
    const spareY = -1.5;
    // Black Rubber Tire
    drawDeformedCircle(spareX, spareY, 4.6, '#0f172a');
    // Steel Wheel Rim with Studs & Center Hub
    drawDeformedCircle(spareX, spareY, 2.8, '#334155', '#1e293b', 0.8);
    drawDeformedCircle(spareX, spareY, 1.4, '#1e293b');
    drawDeformedCircle(spareX, spareY, 0.6, '#cbd5e1'); // Central retaining clamp bolt

    // 2. Transverse Subframe Beams (Поперечные деревянные и стальные брусья основания)
    const beamCount = 5;
    for (let i = 0; i < beamCount; i++) {
      const bx = bedX1 + 3.0 + i * ((bedL - 6.0) / (beamCount - 1));
      drawDeformedRect(bx - 0.8, -halfBedW + 0.4, 1.6, bedW - 0.8, '#271003');
    }

    // 3. Authentic Pine/Oak Wooden Bed Floor Planks (Дощатый настил пола платформы ГАЗ-53)
    // Base wood floor foundation
    drawDeformedRect(bedX1, -halfBedW, bedL, bedW, '#78350f');

    // Individual longitudinal wood planks with subtle natural variations & grooved seams
    const plankCount = 8;
    const plankH = bedW / plankCount;
    const woodShades = ['#92400e', '#78350f', '#a16207', '#854d0e', '#9a3412', '#78350f', '#a16207', '#854d0e'];
    
    for (let p = 0; p < plankCount; p++) {
      const py = -halfBedW + p * plankH;
      const shade = woodShades[p % woodShades.length];
      drawDeformedRect(bedX1 + 0.5, py + 0.4, bedL - 1.0, plankH - 0.8, shade);
      // Subtle top highlight on each wood plank crown
      drawDeformedLine(bedX1 + 1.5, py + 0.9, bedX2 - 1.5, py + 0.9, 'rgba(255, 255, 255, 0.10)', 0.6);
      // Deep dark plank seam line
      if (p > 0) {
        drawDeformedLine(bedX1 + 0.2, py, bedX2 - 0.2, py, 'rgba(0, 0, 0, 0.45)', 0.9);
      }
    }

    // Steel Floor Skid Wear Strips (Металлические защитные полосы на полу платформы)
    const stripY1 = -halfBedW * 0.45;
    const stripY2 = halfBedW * 0.45;
    drawDeformedLine(bedX1 + 2.0, stripY1, bedX2 - 2.0, stripY1, '#475569', 0.9);
    drawDeformedLine(bedX1 + 2.0, stripY2, bedX2 - 2.0, stripY2, '#475569', 0.9);

    // Fastener rivet dots along transverse beams
    for (let i = 0; i < beamCount; i++) {
      const bx = bedX1 + 3.0 + i * ((bedL - 6.0) / (beamCount - 1));
      [-halfBedW * 0.7, -halfBedW * 0.25, halfBedW * 0.25, halfBedW * 0.7].forEach(ry => {
        drawDeformedCircle(bx, ry, 0.4, '#1e293b');
      });
    }

    // 4. High Front Protective Headboard (Передний высокий защитный щит за кабиной)
    const frontBoardX = bedX2 - 1.8;
    drawDeformedRect(frontBoardX, -halfBedW, 1.8, bedW, '#451a03');
    drawDeformedRect(frontBoardX + 0.3, -halfBedW + 0.6, 1.2, bedW - 1.2, '#92400e');
    // Vertical steel angle uprights on front headboard
    [-halfBedW * 0.6, 0, halfBedW * 0.6].forEach(uy => {
      drawDeformedRect(frontBoardX - 0.4, uy - 0.6, 2.4, 1.2, '#1e293b');
    });

    // 5. Wooden Slatted Drop Sideboards (Деревянные откидные борта с металлическими оковками)
    const boardThick = 2.0;
    // Left & Right sideboards
    drawDeformedRect(bedX1, -halfBedW, bedL, boardThick, '#571c05');
    drawDeformedRect(bedX1 + 0.4, -halfBedW + 0.3, bedL - 0.8, boardThick - 0.6, '#a16207');
    drawDeformedLine(bedX1, -halfBedW + boardThick, bedX2, -halfBedW + boardThick, 'rgba(0,0,0,0.5)', 0.9);

    drawDeformedRect(bedX1, halfBedW - boardThick, bedL, boardThick, '#571c05');
    drawDeformedRect(bedX1 + 0.4, halfBedW - boardThick + 0.3, bedL - 0.8, boardThick - 0.6, '#a16207');
    drawDeformedLine(bedX1, halfBedW - boardThick, bedX2, halfBedW - boardThick, 'rgba(0,0,0,0.5)', 0.9);

    // Vertical Steel Posts & Stakes (Металлические стойки и замки бортов)
    // 4 Corner Posts
    drawDeformedRect(bedX1 - 0.4, -halfBedW - 0.4, 2.0, boardThick + 0.8, '#0f172a');
    drawDeformedRect(bedX1 - 0.4, halfBedW - boardThick - 0.4, 2.0, boardThick + 0.8, '#0f172a');
    drawDeformedRect(bedX2 - 1.6, -halfBedW - 0.4, 2.0, boardThick + 0.8, '#0f172a');
    drawDeformedRect(bedX2 - 1.6, halfBedW - boardThick - 0.4, 2.0, boardThick + 0.8, '#0f172a');

    // Intermediate drop-side stakes dividing sideboards into 3 hinged sections
    const stake1X = bedX1 + bedL * 0.35;
    const stake2X = bedX1 + bedL * 0.70;
    [stake1X, stake2X].forEach(sx => {
      // Left stake & lock latch
      drawDeformedRect(sx - 0.7, -halfBedW - 0.3, 1.4, boardThick + 0.6, '#1e293b');
      drawDeformedCircle(sx, -halfBedW - 0.5, 0.6, '#cbd5e1'); // Latch handle pin
      // Right stake & lock latch
      drawDeformedRect(sx - 0.7, halfBedW - boardThick - 0.3, 1.4, boardThick + 0.6, '#1e293b');
      drawDeformedCircle(sx, halfBedW + 0.5, 0.6, '#cbd5e1');
    });

    // Outer Tarpaulin Tie-Down Hooks (Крючья для увязки брезента/тента по периметру бортов)
    for (let hx = bedX1 + 4; hx < bedX2 - 4; hx += 5.5) {
      drawDeformedCircle(hx, -halfBedW - 0.4, 0.45, '#94a3b8');
      drawDeformedCircle(hx, halfBedW + 0.4, 0.45, '#94a3b8');
    }

    // 6. Rear Tailgate (Задний откидной борт с запорами и цепями)
    drawDeformedRect(bedX1, -halfBedW, boardThick, bedW, '#571c05');
    drawDeformedRect(bedX1 + 0.3, -halfBedW + 0.6, boardThick - 0.6, bedW - 1.2, '#92400e');
    drawDeformedLine(bedX1 + boardThick, -halfBedW, bedX1 + boardThick, halfBedW, 'rgba(0,0,0,0.5)', 0.9);
    // Rear Tailgate Corner Locking Hinges & Pins
    drawDeformedRect(bedX1 - 0.5, -halfBedW * 0.85, 1.6, 1.4, '#1e293b');
    drawDeformedRect(bedX1 - 0.5, halfBedW * 0.85 - 1.4, 1.6, 1.4, '#1e293b');

    // 7. Rear Underrun Protection Beam, Mudflaps & Soviet FP-130 Tail Lights (Задний брус, брызговики, фонари ФП-130)
    const rearBumperX = bedX1 - 1.4;
    // Heavy steel rear crossmember bumper
    drawDeformedRect(rearBumperX, -halfBedW + 0.4, 1.4, bedW - 0.8, '#0f172a');
    // Central Heavy Towing Hook / Pintle Hitch (Буксирный прибор / фаркоп ГАЗ-53)
    drawDeformedRect(rearBumperX - 2.0, -1.5, 2.0, 3.0, '#334155');
    drawDeformedCircle(rearBumperX - 1.2, 0, 1.0, '#0f172a');

    // Heavy Black Rubber Rear Mudflaps (Брызговики)
    drawDeformedRect(rearBumperX - 1.8, -halfBedW + 0.8, 1.8, 5.0, '#0f172a');
    drawDeformedLine(rearBumperX - 1.0, -halfBedW + 1.2, rearBumperX - 1.0, -halfBedW + 5.2, '#f8fafc', 0.8); // White chevron/reflector
    drawDeformedRect(rearBumperX - 1.8, halfBedW - 5.8, 1.8, 5.0, '#0f172a');
    drawDeformedLine(rearBumperX - 1.0, halfBedW - 5.2, rearBumperX - 1.0, halfBedW - 1.2, '#f8fafc', 0.8);

    // Authentic Soviet FP-130 Tail Lights (Фонари ФП-130: круглый красный стоп/габарит и оранжевый поворотник)
    const isTailOn = car.headlightsOn || car.positionLightsOn;
    const isBraking = car.brakeLightsOn;
    const redLight = isBraking ? '#ef4444' : isTailOn ? '#dc2626' : '#7f1d1d';
    const amberLight = '#f59e0b';
    // Left Light Unit
    drawDeformedRect(rearBumperX - 0.6, -halfBedW + 6.2, 1.0, 3.6, '#0f172a');
    drawDeformedCircle(rearBumperX - 0.2, -halfBedW + 7.0, 0.9, redLight);
    drawDeformedCircle(rearBumperX - 0.2, -halfBedW + 8.8, 0.8, amberLight);
    // Right Light Unit & License Plate Bracket
    drawDeformedRect(rearBumperX - 0.6, halfBedW - 9.8, 1.0, 3.6, '#0f172a');
    drawDeformedCircle(rearBumperX - 0.2, halfBedW - 7.0, 0.9, redLight);
    drawDeformedCircle(rearBumperX - 0.2, halfBedW - 8.8, 0.8, amberLight);
    // Rear Soviet License Plate (Задний номерной знак)
    drawDeformedRect(rearBumperX - 0.5, 2.5, 0.8, 5.5, '#ffffff');
    drawDeformedLine(rearBumperX - 0.1, 3.0, rearBumperX - 0.1, 7.5, '#0f172a', 0.5);
  }

  // --- TRUCK COVERED WITH SLATE ROOF (ГАЗ-53 КРЫТЫЙ, КРЫША КУЗОВА ИЗ ШИФЕРА) ---
  else if (car.type === 'truck_covered') {
    const bedX1 = -halfL + rc + 1.2;
    const bedX2 = cabinX - cabinL / 2 - 2.2;
    const bedL = bedX2 - bedX1;
    const bedW = halfW * 2 - 0.8;
    const halfBedW = bedW / 2;

    // 1. Heavy Ladder Chassis Rails & Underbody Equipment (Рама шасси ГАЗ-53, бак, глушитель, запаска)
    const frameW = halfW * 0.42;
    drawDeformedRect(bedX1, -frameW, bedL + 2, 2.2, '#1e293b');
    drawDeformedRect(bedX1, frameW - 2.2, bedL + 2, 2.2, '#1e293b');

    // 90L Steel Fuel Tank on Left Chassis Rail
    const tankX = bedX2 - 15;
    const tankL = 13.5;
    const tankW = 4.2;
    const tankY = -halfW + 0.4;
    drawDeformedRect(tankX, tankY, tankL, tankW, '#0f172a');
    drawDeformedRect(tankX + 1, tankY + 0.8, tankL - 2, tankW - 1.6, '#1e293b');
    drawDeformedLine(tankX + 3.0, tankY, tankX + 3.0, tankY + tankW, '#64748b', 1.0);
    drawDeformedLine(tankX + tankL - 3.0, tankY, tankX + tankL - 3.0, tankY + tankW, '#64748b', 1.0);
    drawDeformedCircle(tankX + tankL - 2.5, tankY + 0.8, 1.2, '#cbd5e1', '#0f172a', 0.6);

    // Battery & Tool Storage Box on Right Side
    const boxX = bedX2 - 13;
    const boxL = 11.5;
    const boxW = 3.8;
    const boxY = halfW - 4.2;
    drawDeformedRect(boxX, boxY, boxL, boxW, '#0f172a');
    drawDeformedRect(boxX + 0.8, boxY + 0.8, boxL - 1.6, boxW - 1.6, '#1e293b');
    drawDeformedLine(boxX + 2, boxY + boxW / 2, boxX + boxL - 2, boxY + boxW / 2, '#475569', 0.8);
    drawDeformedRect(boxX + boxL / 2 - 1, boxY + 0.4, 2, 1, '#cbd5e1');

    // Exhaust System & Muffler under Chassis
    const mufX = bedX2 - 18;
    drawDeformedRect(mufX, 2.0, 9.0, 2.8, '#334155');
    drawDeformedLine(mufX - 2, 3.4, mufX + 11, 3.4, '#475569', 1.2);
    drawDeformedLine(mufX - 2, 3.4, mufX - 5, 5.2, '#334155', 1.4);

    // Spare Wheel on Chassis Carrier
    const spareX = bedX1 + 10;
    const spareY = -1.5;
    drawDeformedCircle(spareX, spareY, 4.6, '#0f172a');
    drawDeformedCircle(spareX, spareY, 2.8, '#334155', '#1e293b', 0.8);
    drawDeformedCircle(spareX, spareY, 1.4, '#1e293b');
    drawDeformedCircle(spareX, spareY, 0.6, '#cbd5e1');

    // 2. Timber Superstructure Body Frame & Walls (Деревянный каркас кунга / будки)
    // Dark base timber perimeter & corner posts
    drawDeformedRect(bedX1, -halfBedW, bedL, bedW, '#451a03');
    // Front headboard wall facing cab
    drawDeformedRect(bedX2 - 1.5, -halfBedW, 1.5, bedW, '#271003');
    // Rear double doors frame & timber panels
    drawDeformedRect(bedX1, -halfBedW, 1.6, bedW, '#271003');
    drawDeformedLine(bedX1 + 0.8, -halfBedW + 1, bedX1 + 0.8, halfBedW - 1, '#78350f', 0.8);
    // Rear door vertical split seam
    drawDeformedLine(bedX1, 0, bedX1 + 1.6, 0, '#0f172a', 1.0);
    // Metal door hinges & central locking handle
    drawDeformedRect(bedX1 - 0.4, -halfBedW * 0.7, 1.0, 1.4, '#1e293b');
    drawDeformedRect(bedX1 - 0.4, halfBedW * 0.7 - 1.4, 1.0, 1.4, '#1e293b');
    drawDeformedCircle(bedX1 + 0.4, 0.8, 0.5, '#cbd5e1');

    // 3. Corrugated Slate Roof (Асбестоцементная кровля из волнистого шифера)
    // Roof slight eave overhang beyond wooden box walls
    const roofX1 = bedX1 - 0.6;
    const roofX2 = bedX2 + 0.6;
    const roofL = roofX2 - roofX1;
    const roofW = bedW + 1.2;
    const halfRoofW = roofW / 2;

    // Slate base underlay (Темно-серый выдержанный асбестоцемент)
    drawDeformedRect(roofX1, -halfRoofW, roofL, roofW, '#475569');

    // Corrugations / Waves (Волны шифера ГОСТ: чередование гребней и впадин)
    const waveCount = 13;
    const waveStep = roofW / waveCount;
    for (let w = 0; w < waveCount; w++) {
      const wy1 = -halfRoofW + w * waveStep;
      const wyMid = wy1 + waveStep * 0.5;
      const wy2 = wy1 + waveStep;

      // Dark wave trough (Впадина волны в тени)
      drawDeformedRect(roofX1, wy1, roofL, waveStep * 0.35, '#334155');

      // Intermediate wave slope (Скат волны)
      drawDeformedRect(roofX1, wy1 + waveStep * 0.25, roofL, waveStep * 0.5, '#64748b');

      // Sunlit wave crest highlight (Освещенный гребень волны шифера)
      drawDeformedLine(roofX1 + 0.4, wyMid, roofX2 - 0.4, wyMid, '#94a3b8', 1.2);
      drawDeformedLine(roofX1 + 1.2, wyMid, roofX2 - 1.2, wyMid, 'rgba(241, 245, 249, 0.35)', 0.6);

      // Deep groove line between adjacent waves
      if (w > 0) {
        drawDeformedLine(roofX1, wy1, roofX2, wy1, '#1e293b', 0.8);
      }
    }

    // Overlapping Slate Sheets along Length (Поперечные нахлесты листов шифера)
    // Standard sheets overlap along length with cast shadow under overlapping edge
    const seam1X = roofX1 + roofL * 0.34;
    const seam2X = roofX1 + roofL * 0.67;
    [seam1X, seam2X].forEach(sx => {
      // Overlap shadow under edge
      drawDeformedLine(sx - 0.6, -halfRoofW + 0.2, sx - 0.6, halfRoofW - 0.2, 'rgba(0, 0, 0, 0.55)', 1.2);
      // Bright overlapping sheet front cut bevel edge
      drawDeformedLine(sx, -halfRoofW + 0.2, sx, halfRoofW - 0.2, '#cbd5e1', 0.8);
      drawDeformedLine(sx + 0.6, -halfRoofW + 0.4, sx + 0.6, halfRoofW - 0.4, '#475569', 0.6);
    });

    // Roofing Nails with Round Washers (Шиферные гвозди с шайбами в гребнях волн)
    // Fasteners placed along 3 transverse battens into wave crests
    const purlinXPositions = [roofX1 + roofL * 0.16, roofX1 + roofL * 0.50, roofX1 + roofL * 0.84];
    purlinXPositions.forEach(px => {
      for (let w = 0; w < waveCount; w++) {
        // Nails are placed on alternating or all wave crests
        if (w % 2 === 0) {
          const wyMid = -halfRoofW + (w + 0.5) * waveStep;
          // Slate nail galvanized washer head
          drawDeformedCircle(px, wyMid, 0.55, '#cbd5e1', '#0f172a', 0.4);
        }
      }
    });

    // Weathering / Natural Moss Patches on Aged Asbestos Slate (Патина, мох и пятна времени)
    // Subtle weathered moss/patina stains in damp corners and along seams
    drawDeformedRect(seam1X - 3.5, -halfRoofW + 1.2, 5.0, 3.2, 'rgba(77, 124, 15, 0.28)');
    drawDeformedRect(seam2X - 2.0, halfRoofW - 4.5, 4.2, 3.0, 'rgba(77, 124, 15, 0.24)');
    drawDeformedRect(roofX1 + 1.5, -halfRoofW + 2.0, 4.0, 2.5, 'rgba(77, 124, 15, 0.20)');
    drawDeformedRect(roofX2 - 6.0, halfRoofW - 3.8, 4.5, 2.6, 'rgba(30, 41, 59, 0.35)');

    // Stovepipe Chimney with Rain Cap (Печная труба буржуйки с зонтиком-колпаком)
    // Classic authentic fixture for rural work kungs/бытовки on GAZ-53
    const pipeX = roofX2 - 7.0;
    const pipeY = -halfRoofW * 0.44;
    // Flashing base collar on slate
    drawDeformedRect(pipeX - 1.8, pipeY - 1.8, 3.6, 3.6, '#334155');
    drawDeformedCircle(pipeX, pipeY, 1.8, '#475569');
    // Cast iron / galvanized chimney pipe
    drawDeformedCircle(pipeX, pipeY, 1.4, '#0f172a');
    // Galvanized conical rain deflector cowl (Зонтик-дефлектор)
    drawDeformedCircle(pipeX, pipeY, 2.2, '#94a3b8', '#1e293b', 0.6);
    drawDeformedCircle(pipeX, pipeY, 0.6, '#cbd5e1'); // Central apex point
    drawDeformedCircle(pipeX - 0.4, pipeY - 0.4, 0.4, '#ffffff'); // Glint highlight

    // 4. Rear Underrun Protection Beam, Mudflaps & FP-130 Tail Lights
    const rearBumperX = bedX1 - 1.4;
    drawDeformedRect(rearBumperX, -halfBedW + 0.4, 1.4, bedW - 0.8, '#0f172a');
    // Central Heavy Towing Hook / Pintle Hitch
    drawDeformedRect(rearBumperX - 2.0, -1.5, 2.0, 3.0, '#334155');
    drawDeformedCircle(rearBumperX - 1.2, 0, 1.0, '#0f172a');

    // Rear Mudflaps
    drawDeformedRect(rearBumperX - 1.8, -halfBedW + 0.8, 1.8, 5.0, '#0f172a');
    drawDeformedLine(rearBumperX - 1.0, -halfBedW + 1.2, rearBumperX - 1.0, -halfBedW + 5.2, '#f8fafc', 0.8);
    drawDeformedRect(rearBumperX - 1.8, halfBedW - 5.8, 1.8, 5.0, '#0f172a');
    drawDeformedLine(rearBumperX - 1.0, halfBedW - 5.2, rearBumperX - 1.0, halfBedW - 1.2, '#f8fafc', 0.8);

    // Authentic Soviet FP-130 Tail Lights
    const isTailOn = car.headlightsOn || car.positionLightsOn;
    const isBraking = car.brakeLightsOn;
    const redLight = isBraking ? '#ef4444' : isTailOn ? '#dc2626' : '#7f1d1d';
    const amberLight = '#f59e0b';
    // Left Light Unit
    drawDeformedRect(rearBumperX - 0.6, -halfBedW + 6.2, 1.0, 3.6, '#0f172a');
    drawDeformedCircle(rearBumperX - 0.2, -halfBedW + 7.0, 0.9, redLight);
    drawDeformedCircle(rearBumperX - 0.2, -halfBedW + 8.8, 0.8, amberLight);
    // Right Light Unit
    drawDeformedRect(rearBumperX - 0.6, halfBedW - 9.8, 1.0, 3.6, '#0f172a');
    drawDeformedCircle(rearBumperX - 0.2, halfBedW - 7.0, 0.9, redLight);
    drawDeformedCircle(rearBumperX - 0.2, halfBedW - 8.8, 0.8, amberLight);
    // Rear Soviet License Plate
    drawDeformedRect(rearBumperX - 0.5, 2.5, 0.8, 5.5, '#ffffff');
    drawDeformedLine(rearBumperX - 0.1, 3.0, rearBumperX - 0.1, 7.5, '#0f172a', 0.5);
  }

  // --- CEMENT MIXER ---
  else if (car.type === 'cement_mixer') {




    drawDeformedRect(cabinX - cabinL / 2 - 3, -halfW + 2, 3, halfW * 2 - 4, '#38bdf8');

    const drumX1 = -halfL + rc + 8;
    const drumX2 = cabinX - cabinL / 2 - 4;
    const drumW = halfW * 2 - 2;

    const dp1 = deform(drumX2, -drumW * 0.28);
    const dp2 = deform(drumX1 + (drumX2 - drumX1) * 0.5, -drumW * 0.5);
    const dp3 = deform(drumX1, -drumW * 0.32);
    const dp4 = deform(drumX1, drumW * 0.32);
    const dp5 = deform(drumX1 + (drumX2 - drumX1) * 0.5, drumW * 0.5);
    const dp6 = deform(drumX2, drumW * 0.28);
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(dp1[0], dp1[1]); ctx.lineTo(dp2[0], dp2[1]); ctx.lineTo(dp3[0], dp3[1]);
    ctx.lineTo(dp4[0], dp4[1]); ctx.lineTo(dp5[0], dp5[1]); ctx.lineTo(dp6[0], dp6[1]);
    ctx.closePath(); ctx.fill();
    drawDeformedLine(drumX1, -drumW * 0.32, drumX1 + (drumX2 - drumX1) * 0.5, -drumW * 0.5, '#64748b', 1.2);
    drawDeformedLine(drumX1 + (drumX2 - drumX1) * 0.5, -drumW * 0.5, drumX2, -drumW * 0.28, '#64748b', 1.2);
    drawDeformedLine(drumX2, -drumW * 0.28, drumX2, drumW * 0.28, '#64748b', 1.2);
    drawDeformedLine(drumX2, drumW * 0.28, drumX1 + (drumX2 - drumX1) * 0.5, drumW * 0.5, '#64748b', 1.2);
    drawDeformedLine(drumX1 + (drumX2 - drumX1) * 0.5, drumW * 0.5, drumX1, drumW * 0.32, '#64748b', 1.2);
    drawDeformedLine(drumX1, drumW * 0.32, drumX1, -drumW * 0.32, '#64748b', 1.2);
  }

  // --- GARBAGE TRUCK ---
  else if (car.type === 'garbage_truck') {
    drawDeformedCircle(cabinX, -cabinW * 0.35, 2.2, '#f59e0b');
    drawDeformedCircle(cabinX, cabinW * 0.35, 2.2, '#f59e0b');

    const compX1 = -halfL + rc + 7;
    const compX2 = cabinX - cabinL / 2 - 1.5;
    const compW = halfW * 2 - 1.5;
    drawDeformedRect(compX1, -compW / 2, compX2 - compX1, compW, '#16a34a');
    drawDeformedLine(compX1, -compW / 2, compX2, -compW / 2, '#14532d', 1.2);
    drawDeformedLine(compX2, -compW / 2, compX2, compW / 2, '#14532d', 1.2);
    drawDeformedLine(compX2, compW / 2, compX1, compW / 2, '#14532d', 1.2);
    drawDeformedLine(compX1, compW / 2, compX1, -compW / 2, '#14532d', 1.2);

    for (let rx = compX1 + 6; rx < compX2 - 4; rx += 7) {
      drawDeformedLine(rx, -compW / 2, rx, compW / 2, '#15803d', 1.2);
    }

    drawDeformedRect(compX1 - 4, -compW / 2 - 0.5, 4, compW + 1, '#0f172a');
    drawDeformedRect(compX1 - 5, -compW / 2 + 2, 2, 3, '#f59e0b');
    drawDeformedRect(compX1 - 5, compW / 2 - 5, 2, 3, '#f59e0b');
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

    // Tailgate spoiler lip with third brake light strip
    const spoilerX = cabinX - cabinL * 0.46;
    drawDeformedRect(spoilerX, -cabinW * 0.38, 2.2, cabinW * 0.76, '#0f172a');
    drawDeformedLine(spoilerX + 0.5, -cabinW * 0.2, spoilerX + 0.5, cabinW * 0.2, car.brakeLightsOn ? '#ef4444' : '#7f1d1d', 1.2);

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

    // Twin round chrome headlight housings on each side (bezel framing base lamps)
    drawDeformedCircle(halfL - fc - 1.2, -halfW * 0.74, 1.8, 'rgba(0,0,0,0)', '#cbd5e1', 1.0);
    drawDeformedCircle(halfL - fc - 1.2, -halfW * 0.52, 1.6, 'rgba(0,0,0,0)', '#cbd5e1', 1.0);
    drawDeformedCircle(halfL - fc - 1.2, halfW * 0.52, 1.6, 'rgba(0,0,0,0)', '#cbd5e1', 1.0);
    drawDeformedCircle(halfL - fc - 1.2, halfW * 0.74, 1.8, 'rgba(0,0,0,0)', '#cbd5e1', 1.0);

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

    // Sloped rear deck with third brake light
    drawDeformedLine(cabinX - cabinL * 0.42, -cabinW * 0.2, cabinX - cabinL * 0.42, cabinW * 0.2, car.brakeLightsOn ? '#ef4444' : '#7f1d1d', 1.2);
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
    // Rear high-mount third brake light
    drawDeformedRect(cabinX - cabinL * 0.36 - 0.5, -2.0, 1.0, 4.0, car.brakeLightsOn ? '#ef4444' : '#7f1d1d');
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

    // Cute rounded projector front headlight bezels
    drawDeformedCircle(halfL - fc - 1.2, -halfW * 0.62, 2.0, 'rgba(0,0,0,0)', '#64748b', 1.0);
    drawDeformedCircle(halfL - fc - 1.2, halfW * 0.62, 2.0, 'rgba(0,0,0,0)', '#64748b', 1.0);

    // Micro rear window with wiper
    drawDeformedLine(cX - cabinL * 0.38, 0, cX - cabinL * 0.38 + 2.5, 2.5, '#0f172a', 1.0);

    // Central compact exhaust
    drawDeformedCircle(-halfL + rc - 1.0, 0, 1.2, '#cbd5e1', '#0f172a', 0.8);
  } else if (car.type === 'classic_compact') {
    // Vintage Compact Sedan («Копейка» / ВАЗ-2101 / Fiat 124)
    // Single large circular chrome headlight bezels (framing base headlights)
    drawDeformedCircle(halfL - fc - 1.2, -halfW * 0.68, 2.2, 'rgba(0,0,0,0)', '#cbd5e1', 1.2);
    drawDeformedCircle(halfL - fc - 1.2, halfW * 0.68, 2.2, 'rgba(0,0,0,0)', '#cbd5e1', 1.2);

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
    // Rounded cute teardrop nose chrome bezels
    drawDeformedCircle(halfL - fc - 1.0, -halfW * 0.65, 2.0, 'rgba(0,0,0,0)', '#cbd5e1', 1.0);
    drawDeformedCircle(halfL - fc - 1.0, halfW * 0.65, 2.0, 'rgba(0,0,0,0)', '#cbd5e1', 1.0);
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
    // Protective headlight cages (tubular loops framing outer lamps)
    drawDeformedCircle(halfL - fc - 1.2, -halfW * 0.66, 2.2, 'rgba(0,0,0,0)', '#334155', 1.2);
    drawDeformedCircle(halfL - fc - 1.2, halfW * 0.66, 2.2, 'rgba(0,0,0,0)', '#334155', 1.2);

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

    // 2. Rear roof tailgate spoiler with integrated third brake light
    const spoilerX = cabinX - cabinL * 0.46;
    drawDeformedRect(spoilerX, -cabinW * 0.42, 2.4, cabinW * 0.84, '#0f172a');
    drawDeformedLine(spoilerX + 0.5, -cabinW * 0.22, spoilerX + 0.5, cabinW * 0.22, car.brakeLightsOn ? '#ef4444' : '#7f1d1d', 1.4);

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

    // Heavy black bed roll bar with 4 KC offroad spotlights
    const barX = bedX2 - 4;
    drawDeformedLine(barX, -halfW * 0.78, barX, halfW * 0.78, '#0f172a', 2.5);
    for (let ly = -halfW * 0.55; ly <= halfW * 0.55; ly += halfW * 0.36) {
      drawDeformedCircle(barX + 0.5, ly, 1.6, car.headlightsOn ? '#fef08a' : '#475569', '#0f172a', 0.8);
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

    // Rounded retro nose with front stamped cooling slots & chrome headlight bezels
    drawDeformedRect(halfL - fc - 2.2, -halfW * 0.45, 1.8, halfW * 0.90, '#1e293b');
    drawDeformedCircle(halfL - fc - 1.2, -halfW * 0.65, 2.0, 'rgba(0,0,0,0)', '#cbd5e1', 1.0);
    drawDeformedCircle(halfL - fc - 1.2, halfW * 0.65, 2.0, 'rgba(0,0,0,0)', '#cbd5e1', 1.0);

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
  } else if (car.type === 'truck_tow') {
    // Utility Wrecker Tow Truck (Эвакуатор)
    // Rear open deck with diamond steel texture
    const deckX1 = -halfL + rc + 3;
    const deckX2 = cabinX - cabinL / 2 - 1.5;
    const deckW = halfW * 2 - 3.0;
    drawDeformedRect(deckX1, -deckW / 2, deckX2 - deckX1, deckW, '#334155');

    // Heavy hydraulic wheel-lift crane boom & winch drum
    const boomX1 = deckX2 - 4;
    const boomX2 = deckX1 - 4.5;
    drawDeformedLine(boomX1, 0, boomX2, 0, '#eab308', 3.8);
    // Winch drum with silver cable
    drawDeformedRect(deckX2 - 6, -3.5, 3.5, 7.0, '#0f172a');
    drawDeformedRect(deckX2 - 5.5, -2.8, 2.5, 5.6, '#cbd5e1');

    // Rear wheel-lift cradle crossbar (for towing vehicles)
    drawDeformedRect(boomX2 - 2.0, -halfW * 0.75, 2.0, halfW * 1.5, '#eab308');
    drawDeformedRect(boomX2 - 3.5, -halfW * 0.72, 3.5, 2.4, '#0f172a'); // Wheel chocks
    drawDeformedRect(boomX2 - 3.5, halfW * 0.72 - 2.4, 3.5, 2.4, '#0f172a');

    // Toolboxes on sides
    drawDeformedRect(deckX1 + 4, -halfW + 0.2, deckX2 - deckX1 - 8, 1.8, '#cbd5e1');
    drawDeformedRect(deckX1 + 4, halfW - 2.0, deckX2 - deckX1 - 8, 1.8, '#cbd5e1');
  } else if (car.type === 'truck_armored') {
    // =========================================================================
    // HEAVILY ARMORED CASH-IN-TRANSIT VEHICLE (ИНКАССАЦИЯ ГОСТ Р 50574) - STRICT TOP-DOWN
    // =========================================================================
    // 1. Emerald Green GOСТ Security Livery Band (Полоса цветографической схемы «Инкассация»)
    const vanX1 = -halfL + rc + 2.0;
    const vanX2 = cabinX + cabinL * 0.44;
    const greenBandY = halfW * 0.65;

    // Side longitudinal emerald green livery bands
    drawDeformedRect(vanX1, -halfW + 0.6, vanX2 - vanX1, 2.8, '#15803d');
    drawDeformedLine(vanX1, -halfW + 0.6, vanX2, -halfW + 0.6, '#ffffff', 0.6);
    drawDeformedLine(vanX1, -halfW + 3.4, vanX2, -halfW + 3.4, '#ffffff', 0.6);

    drawDeformedRect(vanX1, halfW - 3.4, vanX2 - vanX1, 2.8, '#15803d');
    drawDeformedLine(vanX1, halfW - 3.4, vanX2, halfW - 3.4, '#ffffff', 0.6);
    drawDeformedLine(vanX1, halfW - 0.6, vanX2, halfW - 0.6, '#ffffff', 0.6);

    // Front hood diagonal/transverse emerald green livery band with white text
    const hoodX1 = cabinX + cabinL * 0.32;
    const hoodX2 = halfL - fc - 1.2;
    const hoodW = halfW * 1.4;
    drawDeformedRect(hoodX1 + 1, -hoodW * 0.42, hoodX2 - hoodX1 - 2, hoodW * 0.84, '#15803d');
    drawDeformedLine(hoodX1 + 1, -hoodW * 0.42, hoodX2 - 1, -hoodW * 0.42, '#ffffff', 0.8);
    drawDeformedLine(hoodX1 + 1, hoodW * 0.42, hoodX2 - 1, hoodW * 0.42, '#ffffff', 0.8);

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const [dIX, dIY] = deform(hoodX1 + (hoodX2 - hoodX1) * 0.5, 0);
    ctx.fillText('ИНКАССАЦИЯ', dIX, dIY);
    ctx.restore();

    // 2. Heavy External Overlapping Steel Armor Plates & Weld Seams (Броненакладки)
    const plateX1 = cabinX - cabinL * 0.42;
    const plateX2 = cabinX + cabinL * 0.26;
    drawDeformedLine(plateX1, -halfW + 1.2, plateX2, -halfW + 1.2, '#1e293b', 1.2);
    drawDeformedLine(plateX1, halfW - 1.2, plateX2, halfW - 1.2, '#1e293b', 1.2);

    // External heavy security door hinge blocks (Внешние усиленные петли бронедверей)
    [-halfW + 0.4, halfW - 1.2].forEach(hy => {
      drawDeformedRect(cabinX + cabinL * 0.18, hy, 1.8, 0.9, '#0f172a');
      drawDeformedRect(cabinX - cabinL * 0.08, hy, 1.8, 0.9, '#0f172a');
      drawDeformedRect(cabinX - cabinL * 0.38, hy, 1.8, 0.9, '#0f172a');
    });

    // 3. Thick Ballistic Bulletproof Windows with Steel Retaining Frames (Бронестекла)
    const wsX = cabinX + cabinL * 0.32;
    const wsW = cabinW * 0.72;
    drawDeformedRect(wsX - 1.0, -wsW / 2 - 0.6, 2.0, wsW + 1.2, '#0f172a'); // Heavy frame
    drawDeformedRect(wsX - 0.7, -wsW / 2, 1.4, wsW, '#0284c7'); // Ballistic glass

    // Side armored cab glass with mechanical circular firing ports (Бойницы с бронезаглушками)
    const cabPortX = cabinX + cabinL * 0.16;
    drawDeformedCircle(cabPortX, -halfW + 1.0, 1.4, '#0f172a');
    drawDeformedCircle(cabPortX, -halfW + 1.0, 0.7, '#64748b');
    drawDeformedCircle(cabPortX, halfW - 1.0, 1.4, '#0f172a');
    drawDeformedCircle(cabPortX, halfW - 1.0, 0.7, '#64748b');

    // Rear guard compartment side firing ports
    const rearPortX = cabinX - cabinL * 0.20;
    drawDeformedCircle(rearPortX, -halfW + 1.0, 1.4, '#0f172a');
    drawDeformedCircle(rearPortX, -halfW + 1.0, 0.7, '#64748b');
    drawDeformedCircle(rearPortX, halfW - 1.0, 1.4, '#0f172a');
    drawDeformedCircle(rearPortX, halfW - 1.0, 0.7, '#64748b');

    // 4. Armored Roof Escape & Defense Hatch (Аварийно-вентиляционный бронелюк)
    const hatchX = cabinX - cabinL * 0.05;
    const hatchL = 7.0;
    const hatchW = 6.0;
    drawDeformedRect(hatchX - hatchL / 2, -hatchW / 2, hatchL, hatchW, '#1e293b');
    drawDeformedRect(hatchX - hatchL / 2 + 0.6, -hatchW / 2 + 0.6, hatchL - 1.2, hatchW - 1.2, '#475569');
    // Armored hatch reinforcing cross ribs
    drawDeformedLine(hatchX - hatchL / 2 + 0.8, 0, hatchX + hatchL / 2 - 0.8, 0, '#1e293b', 1.0);
    drawDeformedLine(hatchX, -hatchW / 2 + 0.8, hatchX, hatchW / 2 - 0.8, '#1e293b', 1.0);
    // Rotary locking handles
    drawDeformedCircle(hatchX - hatchL * 0.25, 0, 0.7, '#cbd5e1');
    drawDeformedCircle(hatchX + hatchL * 0.25, 0, 0.7, '#cbd5e1');

    // 5. Dual Mushroom Air Filtration/Ventilation Domes (Грибки ФВУ бронекузова)
    const fvuX = cabinX - cabinL * 0.32;
    drawDeformedCircle(fvuX, -cabinW * 0.24, 1.8, '#1e293b');
    drawDeformedCircle(fvuX, -cabinW * 0.24, 1.2, '#64748b');
    drawDeformedCircle(fvuX, cabinW * 0.24, 1.8, '#1e293b');
    drawDeformedCircle(fvuX, cabinW * 0.24, 1.2, '#64748b');

    // 6. GPS/GLONASS Satellite Tracking Dome (Купол спутниковой антенны мониторинга)
    const satX = cabinX + cabinL * 0.18;
    drawDeformedCircle(satX, 0, 1.6, '#ffffff');
    drawDeformedCircle(satX, 0, 1.1, '#0284c7');

    // 7. Heavy Rear Vault Doors & Steel Collector Step Bumper
    const rearBumperX = -halfL + rc - 0.5;
    // Massive steel collector step bumper with non-slip perforated diamond tread
    drawDeformedRect(rearBumperX - 1.8, -halfW * 0.82, 1.8, halfW * 1.64, '#0f172a');
    drawDeformedLine(rearBumperX - 1.6, -halfW * 0.78, rearBumperX - 0.4, halfW * 0.78, 'rgba(255,255,255,0.2)', 0.8);
    // Rear vault door heavy central locking deadbolt
    drawDeformedRect(vanX1, -0.6, 2.4, 1.2, '#0f172a');
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
  const isEmergency = car.type === 'police' || car.type === 'fire_engine' || 
                      car.type === 'fire_ladder' || car.type === 'fire_rescue' ||
                      car.type === 'ambulance' || car.type === 'ambulance_van' || 
                      car.type === 'ambulance_suv' || car.type === 'truck_tow' || 
                      car.type === 'truck_armored';

  if (isEmergency) {
    const isTow = car.type === 'truck_tow';
    const isArmored = car.type === 'truck_armored';
    // Tow trucks flash amber beacon when moving or working; emergency cars when siren active
    const isSirenActive = isTow ? (car.speed > 5 || car.isHonking) : (isArmored ? car.speed > 30 : car.sirenOn === true);
    const strobe = isSirenActive ? (Math.floor(Date.now() / 90) % 4) : -1;

    // Siren mount bar
    const barW = isTow ? cabinW * 0.7 : (isArmored ? 4 : cabinW * 0.9);
    const sirenX = isTow ? (cabinX + cabinL * 0.1) : cabinX;
    drawDeformedRect(sirenX - 1.5, -barW / 2, 3, barW, '#0f172a');

    const isFire = car.type === 'fire_engine' || car.type === 'fire_ladder' || car.type === 'fire_rescue';
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

    // Auxiliary rear strobes on ambulance van & fire rescue
    if (car.type === 'ambulance_van' || car.type === 'fire_rescue' || car.type === 'fire_ladder') {
      const rearStrobeX = -halfL + rc + 3;
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
    const fenderL = 20.0;
    const fenderW = 8.0;

    // Combination Tail Light Blocks mounted on top of rear fenders (Фонари ФП-209 на крыльях)
    const blockX = cabinX - cabinL / 2 + 2.5;
    // Left fender block (Red brake/tail + Amber turn signal)
    drawDeformedRect(blockX - 1.2, -halfW * 0.88, 2.4, 3.8, '#0f172a');
    drawDeformedRect(blockX - 0.9, -halfW * 0.88 + 0.3, 1.8, 1.8, '#ef4444');
    drawDeformedRect(blockX - 0.9, -halfW * 0.88 + 2.1, 1.8, 1.4, '#f59e0b');
    // Right fender block (Red brake/tail + Amber turn signal)
    drawDeformedRect(blockX - 1.2, halfW * 0.88 - 3.8, 2.4, 3.8, '#0f172a');
    drawDeformedRect(blockX - 0.9, halfW * 0.88 - 3.8 + 0.3, 1.8, 1.8, '#ef4444');
    drawDeformedRect(blockX - 0.9, halfW * 0.88 - 3.8 + 2.1, 1.8, 1.4, '#f59e0b');

    // Mudflaps with Red Reflectors (Резиновые брызговики с катафотами)
    const mudflapX = -halfL * 0.76 - 1.2;
    drawDeformedRect(mudflapX, -halfW * 0.96, 1.6, fenderW, '#0f172a');
    drawDeformedRect(mudflapX + 0.2, -halfW * 0.85, 1.0, 1.6, '#ef4444');

    drawDeformedRect(mudflapX, halfW * 0.96 - fenderW, 1.6, fenderW, '#0f172a');
    drawDeformedRect(mudflapX + 0.2, halfW * 0.85 - 1.6, 1.0, 1.6, '#ef4444');

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

  // --- MOTORCYCLE WITH SIDECAR: URAL M-67-36 ---
  if (car.type === 'moto_ural_sidecar') {
    const bikeY = -halfW * 0.45;
    const sidecarY = halfW * 0.55;

    // 1. Horizontally Opposed 2-Cylinder Boxer Engine (Оппозитный двигатель)
    // Left cylinder head sticking out
    drawDeformedRect(-halfL * 0.05, bikeY - 5.5, halfL * 0.22, 2.8, '#475569');
    drawDeformedLine(-halfL * 0.05, bikeY - 4.5, -halfL * 0.05 + halfL * 0.22, bikeY - 4.5, '#0f172a', 0.8);
    drawDeformedCircle(-halfL * 0.05 + halfL * 0.11, bikeY - 5.8, 0.8, '#ef4444'); // Red spark plug cap
    // Right cylinder head sticking out between frame and sidecar
    drawDeformedRect(-halfL * 0.05, bikeY + 2.7, halfL * 0.22, 2.8, '#475569');
    drawDeformedCircle(-halfL * 0.05 + halfL * 0.11, bikeY + 5.8, 0.8, '#ef4444');

    // 2. Twin Chrome Exhaust Silencers
    // Bike left silencer
    drawDeformedLine(-halfL * 0.05, bikeY - 3.8, -halfL + rc + 1, bikeY - 3.8, '#cbd5e1', 1.5);
    drawDeformedRect(-halfL * 0.65, bikeY - 4.5, halfL * 0.40, 1.4, '#e2e8f0');

    // 3. Sidecar Spare Wheel Mounted on Rear Trunk
    const spareX = -halfL * 0.52;
    const spareY = halfW * 0.55;
    drawDeformedCircle(spareX, spareY, 4.2, '#1e293b'); // Tire
    drawDeformedCircle(spareX, spareY, 2.8, '#475569'); // Rim
    drawDeformedCircle(spareX, spareY, 1.0, '#cbd5e1'); // Center nut
    drawDeformedLine(spareX - 3.5, spareY, spareX + 3.5, spareY, '#78350f', 1.0); // Leather mounting strap

    // 4. Sidecar Front Marker Light
    drawDeformedCircle(halfL * 0.25, halfW * 0.78, 1.2, '#f59e0b');
  }

  // --- CLASSIC SOVIET MOTORCYCLE: IZH JUPITER-5 ---
  if (car.type === 'moto_izh_jupiter') {
    // 1. Dual Chrome Exhaust Pipes on both sides
    drawDeformedLine(-halfL * 0.15, -halfW * 0.48, -halfL + rc + 1, -halfW * 0.48, '#e2e8f0', 1.4);
    drawDeformedLine(-halfL * 0.15, halfW * 0.48, -halfL + rc + 1, halfW * 0.48, '#e2e8f0', 1.4);
    
    // 2. Finned 2-Cylinder Engine Block & Spark Plugs
    drawDeformedRect(-halfL * 0.12, -halfW * 0.38, halfL * 0.28, halfW * 0.76, '#475569');
    drawDeformedLine(-halfL * 0.12, -halfW * 0.25, halfL * 0.16, -halfW * 0.25, '#1e293b', 0.8);
    drawDeformedLine(-halfL * 0.12, halfW * 0.25, halfL * 0.16, halfW * 0.25, '#1e293b', 0.8);
    drawDeformedCircle(0, -halfW * 0.20, 0.8, '#ef4444');
    drawDeformedCircle(0, halfW * 0.20, 0.8, '#ef4444');

    // 3. Chrome Rear Grab Rail behind saddle
    drawDeformedLine(-halfL * 0.58, -halfW * 0.35, -halfL * 0.58, halfW * 0.35, '#cbd5e1', 1.2);
    // 4. Chrome Round Mirrors
    const barX = halfL * 0.42;
    drawDeformedCircle(barX + 2, -halfW * 0.90, 1.1, '#f8fafc');
    drawDeformedCircle(barX + 2, halfW * 0.90, 1.1, '#f8fafc');
  }

  // --- ICONIC VINTAGE MOTORCYCLE: JAWA 350 (638) ---
  if (car.type === 'moto_jawa350') {
    // 1. Upswept Megaphone Chrome Silencers
    drawDeformedLine(-halfL * 0.10, -halfW * 0.45, -halfL + rc + 1, -halfW * 0.52, '#f8fafc', 1.6);
    drawDeformedLine(-halfL * 0.10, halfW * 0.45, -halfL + rc + 1, halfW * 0.52, '#f8fafc', 1.6);
    
    // 2. Chrome Inset Badge on Cherry-Red Tank
    const tankX = halfL * 0.05;
    drawDeformedRect(tankX - 2, -halfW * 0.42, 4, 0.8, '#fbbf24'); // Gold JAWA badge
    drawDeformedRect(tankX - 2, halfW * 0.42 - 0.8, 4, 0.8, '#fbbf24');

    // 3. Black Sport Instrument Pod
    const barX = halfL * 0.42;
    drawDeformedRect(barX + 0.8, -2, 2.2, 4, '#0f172a');
    drawDeformedCircle(barX + 1.8, -1.0, 0.7, '#22c55e');
    drawDeformedCircle(barX + 1.8, 1.0, 0.7, '#38bdf8');
  }

  // --- MODERN SUPERBIKE: 1000cc ---
  if (car.type === 'moto_sport') {
    // 1. Aerodynamic Smoked Bubble Windscreen
    drawDeformedLine(halfL * 0.50, -halfW * 0.35, halfL * 0.65, 0, 'rgba(15, 23, 42, 0.85)', 2.0);
    drawDeformedLine(halfL * 0.65, 0, halfL * 0.50, halfW * 0.35, 'rgba(15, 23, 42, 0.85)', 2.0);

    // 2. Twin Aggressive LED Headlights
    drawDeformedLine(halfL * 0.62, -halfW * 0.22, halfL * 0.68, -halfW * 0.08, '#fef08a', 1.4);
    drawDeformedLine(halfL * 0.62, halfW * 0.22, halfL * 0.68, halfW * 0.08, '#fef08a', 1.4);

    // 3. Carbon Fiber / Titanium Upswept Single Canister (Right side)
    drawDeformedLine(-halfL * 0.10, halfW * 0.42, -halfL + rc + 2, halfW * 0.55, '#1e293b', 2.2);
    drawDeformedCircle(-halfL + rc + 2, halfW * 0.55, 1.2, '#94a3b8');

    // 4. Aluminum Twin-Spar Perimeter Frame
    drawDeformedLine(-halfL * 0.20, -halfW * 0.42, halfL * 0.20, -halfW * 0.30, '#cbd5e1', 1.8);
    drawDeformedLine(-halfL * 0.20, halfW * 0.42, halfL * 0.20, halfW * 0.30, '#cbd5e1', 1.8);
  }

  // --- CUSTOM CHOPPER V-TWIN ---
  if (car.type === 'moto_chopper') {
    // 1. Stretched Extended Front Chrome Telescopic Forks
    drawDeformedLine(halfL * 0.35, -halfW * 0.20, halfL * 0.85, -halfW * 0.12, '#f8fafc', 1.8);
    drawDeformedLine(halfL * 0.35, halfW * 0.20, halfL * 0.85, halfW * 0.12, '#f8fafc', 1.8);

    // 2. Chrome 45-Degree V-Twin Engine Block
    drawDeformedRect(-halfL * 0.15, -halfW * 0.35, halfL * 0.35, halfW * 0.70, '#cbd5e1');
    drawDeformedLine(-halfL * 0.15, 0, halfL * 0.20, 0, '#0f172a', 1.0);
    // Round Chrome Air Cleaner on right
    drawDeformedCircle(0, halfW * 0.42, 1.8, '#f8fafc');

    // 3. Staggered Dual Chrome Straight Drag Pipes
    drawDeformedLine(-halfL * 0.10, halfW * 0.48, -halfL + rc, halfW * 0.48, '#f8fafc', 1.5);
    drawDeformedLine(-halfL * 0.05, halfW * 0.58, -halfL + rc - 2, halfW * 0.58, '#f8fafc', 1.5);
  }

  // --- SOVIET MOPED «КАРПАТЫ» ---
  if (car.type === 'moped_soviet') {
    // 1. Thin Skinny Tubular Frame & Small Engine
    drawDeformedLine(-halfL * 0.40, 0, halfL * 0.40, 0, '#0f172a', 1.8);
    drawDeformedCircle(-halfL * 0.05, 0, 2.0, '#64748b'); // 50cc motor
    // 2. Small Skinny Chrome Exhaust
    drawDeformedLine(-halfL * 0.05, halfW * 0.35, -halfL + rc + 1, halfW * 0.35, '#cbd5e1', 1.0);
    // 3. Rear Tubular Luggage Cargo Rack
    drawDeformedRect(-halfL * 0.55, -halfW * 0.25, halfL * 0.25, halfW * 0.50, '#334155');
    drawDeformedLine(-halfL * 0.55, -halfW * 0.25, -halfL * 0.30, -halfW * 0.25, '#cbd5e1', 1.0);
    drawDeformedLine(-halfL * 0.55, halfW * 0.25, -halfL * 0.30, halfW * 0.25, '#cbd5e1', 1.0);
    drawDeformedLine(-halfL * 0.55, 0, -halfL * 0.30, 0, '#cbd5e1', 1.0);
  }

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
    const fenderL = 15.5;
    const fenderX = wheelAxleX - fenderL / 2;
    drawDeformedRect(fenderX, -tankW / 2 - 1.8, fenderL, 1.6, '#1e293b');
    drawDeformedRect(fenderX, tankW / 2 + 0.2, fenderL, 1.6, '#1e293b');
 
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
    const boxX = hitchX - 6.5;
    const boxW = 8.5;
    const boxL = 4.5;
    drawDeformedRect(boxX - boxL / 2, -boxW / 2, boxL, boxW, '#1e293b'); // Outer tech box frame (dark industrial black)
    drawDeformedRect(boxX - boxL / 2 + 0.4, -boxW / 2 + 0.4, boxL - 0.8, boxW - 0.8, '#334155'); // Inner lid panel (grey slate)
    drawDeformedRect(boxX - 0.6, -0.6, 1.2, 1.2, '#94a3b8'); // Metallic silver toggle latch/lock in center
    drawDeformedLine(boxX - boxL / 2, 0, boxX + boxL / 2, 0, '#1e293b', 0.8); // Center divider weld seam

    // 3. Vacuum Pump (Компрессор КО-503) mounted behind the tech box
    const pumpX = halfL + 3.0;
    drawDeformedRect(pumpX - 3.5, -2.8, 7.0, 5.6, '#1e293b'); // Main pump casing
    drawDeformedRect(pumpX - 4.5, -1.8, 1.0, 3.6, '#475569'); // Drive pulley guard
    for (let i = -2; i <= 2; i++) {
      drawDeformedLine(pumpX + i, -2.6, pumpX + i, 2.6, '#475569', 0.6); // Cooling fins
    }
    drawDeformedCircle(pumpX - 1.5, -3.2, 1.2, '#64748b'); // Oil-water separator dome

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
    const fenderL = 17.5;
    const fenderX = wheelAxleX - fenderL / 2;
    const fenderW = 5.2; // Cover the wheel width 4.6 completely
    const barrelTrackY = halfW * 0.82 + 2.3; // Center wheel axis line

    // Left Fender (arched metal wrapping over wheel, colored and shaded blue)
    drawDeformedRect(fenderX, -barrelTrackY - fenderW / 2, fenderL, fenderW, '#1e293b'); // Dark underlying frame/brackets
    // Rear sloped portion (darker shade for 3D curvature)
    drawDeformedRect(fenderX + 0.2, -barrelTrackY - fenderW / 2 + 0.2, 2.8, fenderW - 0.4, '#1d4ed8');
    // Top flat portion (bright royal blue matching the tank highlights)
    drawDeformedRect(fenderX + 3.0, -barrelTrackY - fenderW / 2 + 0.2, 11.5, fenderW - 0.4, '#3b82f6');
    // Front sloped portion (darker shade for 3D curvature)
    drawDeformedRect(fenderX + 14.5, -barrelTrackY - fenderW / 2 + 0.2, 2.8, fenderW - 0.4, '#1d4ed8');
    // Shiny outer metal lip highlight
    drawDeformedLine(fenderX, -barrelTrackY - fenderW / 2 + 0.3, fenderX + fenderL, -barrelTrackY - fenderW / 2 + 0.3, '#93c5fd', 0.8);
    // Rear black rubber mudflap (брызговик) attached to the rear end (fenderX)
    drawDeformedRect(fenderX - 3.2, -barrelTrackY - 1.9, 3.2, 3.8, '#18181b');
    drawDeformedLine(fenderX - 2.0, -barrelTrackY - 1.5, fenderX - 2.0, -barrelTrackY + 1.5, '#27272a', 0.6);
    // Left integrated rectangular tail light unit on the rear slope face (no upward-facing circles)
    drawDeformedRect(fenderX + 0.5, -barrelTrackY - 1.8, 1.2, 3.6, '#09090b'); // Housing box
    drawDeformedRect(fenderX + 0.7, -barrelTrackY - 1.6, 0.8, 1.6, '#f97316'); // Amber indicator segment (outer)
    drawDeformedRect(fenderX + 0.7, -barrelTrackY + 0.0, 0.8, 1.6, '#ef4444'); // Red brake segment (inner)

    // Right Fender (arched metal wrapping over wheel, colored and shaded blue)
    drawDeformedRect(fenderX, barrelTrackY - fenderW / 2, fenderL, fenderW, '#1e293b'); // Dark underlying frame/brackets
    // Rear sloped portion (darker shade for 3D curvature)
    drawDeformedRect(fenderX + 0.2, barrelTrackY - fenderW / 2 + 0.2, 2.8, fenderW - 0.4, '#1d4ed8');
    // Top flat portion (bright royal blue matching the tank highlights)
    drawDeformedRect(fenderX + 3.0, barrelTrackY - fenderW / 2 + 0.2, 11.5, fenderW - 0.4, '#3b82f6');
    // Front sloped portion (darker shade for 3D curvature)
    drawDeformedRect(fenderX + 14.5, barrelTrackY - fenderW / 2 + 0.2, 2.8, fenderW - 0.4, '#1d4ed8');
    // Shiny outer metal lip highlight
    drawDeformedLine(fenderX, barrelTrackY + fenderW / 2 - 0.3, fenderX + fenderL, barrelTrackY + fenderW / 2 - 0.3, '#93c5fd', 0.8);
    // Rear black rubber mudflap (брызговик) attached to the rear end (fenderX)
    drawDeformedRect(fenderX - 3.2, barrelTrackY - 1.9, 3.2, 3.8, '#18181b');
    drawDeformedLine(fenderX - 2.0, barrelTrackY - 1.5, fenderX - 2.0, barrelTrackY + 1.5, '#27272a', 0.6);
    // Right integrated rectangular tail light unit on the rear slope face (no upward-facing circles)
    drawDeformedRect(fenderX + 0.5, barrelTrackY - 1.8, 1.2, 3.6, '#09090b'); // Housing box
    drawDeformedRect(fenderX + 0.7, barrelTrackY - 1.6, 0.8, 1.6, '#ef4444'); // Red brake segment (inner)
    drawDeformedRect(fenderX + 0.7, barrelTrackY + 0.0, 0.8, 1.6, '#f97316'); // Amber indicator segment (outer)

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
    const drawbarLen = car.drawbarLength || 20;
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
}
