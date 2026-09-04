import { Vehicle } from './types';
export {
  getVehicleBasePolygon,
  getVehicleCabinDimensions,
  renderVehicleGreenhouseAndBodyPanels
} from './vehicleArchetypes';
export type { VehicleRenderContext } from './vehicleArchetypes';
import type { VehicleRenderContext } from './vehicleArchetypes';

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
    drawDeformedRect(halfL - fc - 2, -halfW + 3, 2, halfW * 2 - 6, '#0f172a');
    drawDeformedRect(cabinX + cabinL * 0.35, -4, 1.5, 2, '#f59e0b');
    drawDeformedRect(cabinX + cabinL * 0.35, -1, 1.5, 2, '#f59e0b');
    drawDeformedRect(cabinX + cabinL * 0.35, 2, 1.5, 2, '#f59e0b');

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

  // --- TRUCK DUMP (REDESIGNED HEAVY 3-AXLE TIPPER / САМОСВАЛ НА ВЫСШЕМ УРОВНЕ) ---
  else if (car.type === 'truck_dump') {
    // Cab visor/rock shield & exhaust stack behind cab
    drawDeformedRect(halfL - fc - 1, -halfW + 2, 2.5, halfW * 2 - 4, '#1e293b');
    drawDeformedCircle(cabinX - cabinL / 2 - 1, -halfW + 3, 2, '#0f172a'); // Vertical exhaust stack

    // Hydraulic lifting cylinder between cab and tipper body
    const cylX = cabinX - cabinL / 2 - 2;
    drawDeformedRect(cylX - 2, -3, 3, 6, '#475569');
    drawDeformedRect(cylX - 1.5, -2, 2, 4, '#e2e8f0'); // Chrome piston rod

    // Dump body (кузов) with large front protective canopy (козырек) over cab!
    const dumpX1 = -halfL + rc + 2;
    const dumpX2 = cabinX - 1; // Canopy extends forward over rear cab!
    const dumpW = halfW * 2 - 1;

    // Body outer steel frame (heavy orange/amber construction paint)
    drawDeformedRect(dumpX1, -dumpW / 2, dumpX2 - dumpX1, dumpW, '#d97706');
    drawDeformedLine(dumpX1, -dumpW / 2, dumpX2, -dumpW / 2, '#78350f', 1.4);
    drawDeformedLine(dumpX2, -dumpW / 2, dumpX2, dumpW / 2, '#78350f', 1.4);
    drawDeformedLine(dumpX2, dumpW / 2, dumpX1, dumpW / 2, '#78350f', 1.4);
    drawDeformedLine(dumpX1, dumpW / 2, dumpX1, -dumpW / 2, '#78350f', 1.4);

    // Heavy vertical and slanted stiffening ribs (ребра жесткости) on sides
    for (let rx = dumpX1 + 5; rx < dumpX2 - 4; rx += 6) {
      drawDeformedLine(rx, -dumpW / 2, rx, -dumpW / 2 + 3, '#92400e', 1.5);
      drawDeformedLine(rx, dumpW / 2 - 3, rx, dumpW / 2, '#92400e', 1.5);
    }

    // Heavy protective canopy (козырек) overhang
    drawDeformedRect(cabinX - cabinL * 0.2, -dumpW * 0.45, (dumpX2 - (cabinX - cabinL * 0.2)), dumpW * 0.9, '#b45309');
    drawDeformedLine(dumpX2, -dumpW * 0.45, dumpX2, dumpW * 0.45, '#78350f', 1.2);

    // Inner cargo bed filled with 3D heaped construction crushed gravel/stones (щебень)
    const bedX1 = dumpX1 + 3;
    const bedX2 = cabinX - cabinL / 2 - 2;
    const bedW = dumpW - 6;
    drawDeformedRect(bedX1, -bedW / 2, bedX2 - bedX1, bedW, '#475569');

    // Granular rock texture with depth and varied gravel shades
    for (let gx = bedX1 + 3; gx < bedX2 - 2; gx += 4.5) {
      for (let gy = -bedW / 2 + 3; gy < bedW / 2 - 2; gy += 4.5) {
        const seed = Math.sin(gx * 12.9898 + gy * 78.233);
        const radius = 1.4 + (seed * 0.6);
        const stoneColor = seed > 0.3 ? '#94a3b8' : (seed > -0.3 ? '#64748b' : '#334155');
        drawDeformedCircle(gx + seed, gy + (seed * 0.8), radius, stoneColor);
      }
    }

    // Rear tailgate with hinge lugs and mudflaps
    drawDeformedRect(dumpX1, -dumpW / 2 + 2, 2.5, dumpW - 4, '#78350f');
    drawDeformedRect(dumpX1 - 1.5, -dumpW / 2 + 1, 1.5, 3, '#0f172a');
    drawDeformedRect(dumpX1 - 1.5, dumpW / 2 - 4, 1.5, 3, '#0f172a');
  }

  // --- TRUCK WATER (ВОДОВОЗ НА БАЗЕ АВТОЦИСТЕРНЫ С ЖЁЛТОЙ БОЧКОЙ «ВОДА») ---
  else if (car.type === 'truck_water') {
    // Cab hood & front grille matching tanker truck chassis
    const hoodX1 = cabinX + cabinL / 2;
    const hoodX2 = halfL - fc;
    drawDeformedRect(hoodX1, -halfW + 2.5, hoodX2 - hoodX1, halfW * 2 - 5, car.color || '#0284c7');
    drawDeformedRect(hoodX2 - 2, -halfW + 1, 2.5, halfW * 2 - 2, '#0f172a');
    drawDeformedRect(hoodX2 - 1.5, -halfW + 3, 1.5, halfW * 2 - 6, '#cbd5e1'); // Front chrome grille bar

    // Side chassis frame steps & diesel tank / toolboxes behind cab
    const frameX1 = -halfL + rc + 1;
    const frameX2 = cabinX - cabinL / 2;
    drawDeformedRect(frameX1, -halfW + 0.5, frameX2 - frameX1, 1.8, '#1e293b');
    drawDeformedRect(frameX1, halfW - 2.3, frameX2 - frameX1, 1.8, '#1e293b');

    // Bright yellow cistern barrel body with metallic 3D cylinder gradient
    const tankX1 = -halfL + rc + 2;
    const tankX2 = cabinX - cabinL / 2 - 1;
    const tankW = halfW * 2 - 2;
    const tankGrad = ctx.createLinearGradient(0, -tankW / 2, 0, tankW / 2);
    tankGrad.addColorStop(0, '#d97706');
    tankGrad.addColorStop(0.18, '#fde047');
    tankGrad.addColorStop(0.5, '#eab308');
    tankGrad.addColorStop(0.82, '#d97706');
    tankGrad.addColorStop(1, '#b45309');

    drawDeformedRect(tankX1, -tankW / 2, tankX2 - tankX1, tankW, tankGrad);
    drawDeformedLine(tankX1, -tankW / 2, tankX2, -tankW / 2, '#92400e', 1.2);
    drawDeformedLine(tankX2, -tankW / 2, tankX2, tankW / 2, '#92400e', 1.2);
    drawDeformedLine(tankX2, tankW / 2, tankX1, tankW / 2, '#92400e', 1.2);
    drawDeformedLine(tankX1, tankW / 2, tankX1, -tankW / 2, '#92400e', 1.2);

    // Rounded tank end cap domes (front and rear)
    drawDeformedCircle(tankX1, 0, tankW * 0.46, '#d97706');
    drawDeformedCircle(tankX2, 0, tankW * 0.46, '#eab308');

    // Side hose storage canisters (длинные пеналы для рукавов/шлангов)
    drawDeformedRect(tankX1 + 2, -halfW + 0.2, tankX2 - tankX1 - 4, 1.6, '#334155');
    drawDeformedRect(tankX1 + 2, halfW - 1.8, tankX2 - tankX1 - 4, 1.6, '#334155');

    // Black steel retention mounting straps with silver tensioning bolts
    const band1X = tankX1 + (tankX2 - tankX1) * 0.25;
    const band2X = tankX1 + (tankX2 - tankX1) * 0.50;
    const band3X = tankX1 + (tankX2 - tankX1) * 0.75;
    [band1X, band2X, band3X].forEach(bx => {
      drawDeformedRect(bx - 1, -tankW / 2 - 0.5, 2, tankW + 1, '#0f172a');
      drawDeformedCircle(bx, -tankW / 2 - 0.5, 1, '#f8fafc');
      drawDeformedCircle(bx, tankW / 2 + 0.5, 1, '#f8fafc');
    });

    // Top catwalk and dual fill hatches
    drawDeformedRect(tankX1 + 4, -2.5, tankX2 - tankX1 - 8, 5, '#475569');
    const hatch1X = tankX1 + (tankX2 - tankX1) * 0.35;
    const hatch2X = tankX1 + (tankX2 - tankX1) * 0.65;
    drawDeformedCircle(hatch1X, 0, 3.2, '#0f172a');
    drawDeformedCircle(hatch1X, 0, 1.8, '#cbd5e1');
    drawDeformedCircle(hatch2X, 0, 3.2, '#0f172a');
    drawDeformedCircle(hatch2X, 0, 1.8, '#cbd5e1');

    // Rear water discharge tap & valve assembly
    drawDeformedRect(tankX1 - 2.5, -3, 2.5, 6, '#334155');
    drawDeformedCircle(tankX1 - 2.5, 0, 1.8, '#0284c7');
    drawDeformedLine(tankX1 - 2.5, -4, tankX1 - 2.5, 4, '#38bdf8', 1.2);

    // Cyrillic Stencil Inscription on both flanks: « В О Д А »
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const midX = tankX1 + (tankX2 - tankX1) * 0.5;
    const [dLX, dLY] = deform(midX, -tankW * 0.28);
    ctx.fillText('В О Д А', dLX, dLY);
    const [dRX, dRY] = deform(midX, tankW * 0.28);
    ctx.fillText('В О Д А', dRX, dRY);
    ctx.restore();
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

  // --- TRUCK FLATBED ---
  else if (car.type === 'truck_flatbed') {
    const hoodX1 = cabinX + cabinL / 2;
    const hoodX2 = halfL - fc;
    drawDeformedRect(hoodX1, -halfW + 2, hoodX2 - hoodX1, halfW * 2 - 4, car.color || '#0284c7');
    drawDeformedRect(hoodX2 - 3.5, -halfW + 3, 3.5, halfW * 2 - 6, '#f8fafc');

    const craneX = cabinX - cabinL / 2 - 3;
    drawDeformedRect(craneX - 3, -halfW + 2, 5, halfW * 2 - 4, '#0284c7');
    drawDeformedRect(craneX - 2, -3, 3, 6, '#0f172a');
    drawDeformedRect(craneX - 1, -1.5, 7, 3, '#f59e0b');

    const flatX1 = -halfL + rc + 3;
    const flatX2 = craneX - 4;
    const flatW = halfW * 2 - 2;
    drawDeformedRect(flatX1, -flatW / 2, flatX2 - flatX1, flatW, '#78350f');
    drawDeformedLine(flatX1, -flatW / 2, flatX2, -flatW / 2, '#451a03', 1.4);
    drawDeformedLine(flatX2, -flatW / 2, flatX2, flatW / 2, '#451a03', 1.4);
    drawDeformedLine(flatX2, flatW / 2, flatX1, flatW / 2, '#451a03', 1.4);
    drawDeformedLine(flatX1, flatW / 2, flatX1, -flatW / 2, '#451a03', 1.4);

    drawDeformedRect(flatX1 + 4, -flatW / 2 + 3, 16, 10, '#d97706');
    drawDeformedRect(flatX1 + 24, -flatW / 2 + 3, flatX2 - flatX1 - 28, 4, '#475569');
    drawDeformedRect(flatX1 + 24, -flatW / 2 + 8, flatX2 - flatX1 - 28, 4, '#475569');
  }

  // --- CEMENT MIXER ---
  else if (car.type === 'cement_mixer') {
    drawDeformedRect(halfL - fc - 2, -halfW + 3, 2, halfW * 2 - 6, '#0f172a');
    drawDeformedRect(cabinX + cabinL * 0.35, -4, 1.5, 2, '#f59e0b');
    drawDeformedRect(cabinX + cabinL * 0.35, -1, 1.5, 2, '#f59e0b');
    drawDeformedRect(cabinX + cabinL * 0.35, 2, 1.5, 2, '#f59e0b');
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
    drawDeformedRect(halfL - fc - 2.5, -halfW * 0.62, 2.2, halfW * 1.24, '#334155');
    drawDeformedLine(halfL - fc - 1.5, -halfW * 0.60, halfL - fc - 1.5, halfW * 0.60, '#cbd5e1', 1.0);
    drawDeformedRect(halfL - fc - 1.8, -1, 1.4, 2, '#dc2626'); // Red classic badge

    // Distinct twin round chrome headlights on each side
    drawDeformedCircle(halfL - fc - 0.8, -halfW * 0.72, 1.8, '#fef08a', '#94a3b8', 1.0);
    drawDeformedCircle(halfL - fc - 0.8, -halfW * 0.52, 1.8, '#fef08a', '#94a3b8', 1.0);
    drawDeformedCircle(halfL - fc - 0.8, halfW * 0.52, 1.8, '#fef08a', '#94a3b8', 1.0);
    drawDeformedCircle(halfL - fc - 0.8, halfW * 0.72, 1.8, '#fef08a', '#94a3b8', 1.0);

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
    drawDeformedRect(halfL - fc - 2.0, -halfW * 0.55, 1.8, halfW * 1.1, '#1e293b');
    // Sleek swept-back front headlights
    drawDeformedLine(halfL - fc - 0.5, -halfW * 0.76, halfL - fc - 3.5, -halfW * 0.60, '#f8fafc', 1.8);
    drawDeformedLine(halfL - fc - 0.5, halfW * 0.76, halfL - fc - 3.5, halfW * 0.60, '#f8fafc', 1.8);

    // Color-matched aerodynamic door mirrors
    drawDeformedRect(cabinX + cabinL * 0.28, -halfW - 1.8, 2.0, 1.8, car.color);
    drawDeformedRect(cabinX + cabinL * 0.28, halfW, 2.0, 1.8, car.color);

    // Sloped rear deck with third brake light
    drawDeformedLine(cabinX - cabinL * 0.42, -cabinW * 0.2, cabinX - cabinL * 0.42, cabinW * 0.2, car.brakeLightsOn ? '#ef4444' : '#7f1d1d', 1.2);
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

    // Cute rounded projector front headlights
    drawDeformedCircle(halfL - fc - 0.8, -halfW * 0.62, 2.0, '#f8fafc', '#64748b', 1.0);
    drawDeformedCircle(halfL - fc - 0.8, halfW * 0.62, 2.0, '#f8fafc', '#64748b', 1.0);

    // Micro rear window with wiper
    drawDeformedLine(cX - cabinL * 0.38, 0, cX - cabinL * 0.38 + 2.5, 2.5, '#0f172a', 1.0);

    // Central compact exhaust
    drawDeformedCircle(-halfL + rc - 1.0, 0, 1.2, '#cbd5e1', '#0f172a', 0.8);
  } else if (car.type === 'classic_compact') {
    // Vintage Compact Sedan («Копейка» / ВАЗ-2101 / Fiat 124)
    // Single large circular chrome headlights
    drawDeformedCircle(halfL - fc - 0.8, -halfW * 0.68, 2.2, '#fef08a', '#cbd5e1', 1.2);
    drawDeformedCircle(halfL - fc - 0.8, halfW * 0.68, 2.2, '#fef08a', '#cbd5e1', 1.2);

    // Chrome horizontal grille slats
    drawDeformedRect(halfL - fc - 2.5, -halfW * 0.54, 2.0, halfW * 1.08, '#334155');
    drawDeformedLine(halfL - fc - 1.5, -halfW * 0.52, halfL - fc - 1.5, halfW * 0.52, '#cbd5e1', 1.2);

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
    // Rounded cute teardrop nose
    drawDeformedCircle(halfL - fc - 0.5, -halfW * 0.65, 2.0, '#fef08a', '#cbd5e1', 1.0);
    drawDeformedCircle(halfL - fc - 0.5, halfW * 0.65, 2.0, '#fef08a', '#cbd5e1', 1.0);
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

    // Front tubular brush guard (кенгурятник)
    drawDeformedRect(halfL - fc - 0.2, -halfW * 0.75, 2.2, halfW * 1.5, '#0f172a');
    drawDeformedCircle(halfL - fc - 1.0, -halfW * 0.62, 2.0, '#fef08a', '#0f172a', 1.2);
    drawDeformedCircle(halfL - fc - 1.0, halfW * 0.62, 2.0, '#fef08a', '#0f172a', 1.2);

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
  }

  // ==========================================
  // 6. UTILITY, PICKUPS & COMMERCIAL
  // ==========================================
  else if (car.type === 'pickup_heavy') {
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
  } else if (car.type === 'van_camper') {
    // Adventure Campervan / Road-Trip Motorhome
    // Aerodynamic raised high-roof bubble
    const roofX = cabinX - cabinL * 0.05;
    const roofL = cabinL * 0.85;
    const roofW = cabinW * 0.88;
    drawDeformedRect(roofX - roofL / 2, -roofW / 2, roofL, roofW, '#f8fafc');

    // Dual monocrystalline solar panels with photovoltaic grid
    const solX = roofX - roofL * 0.15;
    drawDeformedRect(solX - 5, -roofW * 0.38, 10, roofW * 0.76, '#0f172a');
    drawDeformedRect(solX - 4.5, -roofW * 0.35, 9, roofW * 0.70, '#1e3a8a');
    for (let sy = -roofW * 0.30; sy < roofW * 0.30; sy += 2.5) {
      drawDeformedLine(solX - 4.5, sy, solX + 4.5, sy, '#3b82f6', 0.8);
    }

    // Side roll-out awning cassette along passenger roof edge
    drawDeformedRect(roofX - roofL * 0.38, roofW / 2 - 0.5, roofL * 0.76, 2.2, '#94a3b8');

    // Roof ventilation skylight hatch
    drawDeformedRect(roofX + roofL * 0.22, -2.5, 5, 5, '#334155');
    drawDeformedRect(roofX + roofL * 0.22 + 0.8, -1.8, 3.4, 3.4, '#64748b');

    // Rear aluminum bicycle carrier with 2 mountain bikes!
    const bikeX = -halfL + rc - 3.5;
    drawDeformedLine(bikeX, -halfW * 0.72, bikeX, halfW * 0.72, '#94a3b8', 1.8);
    // Bike frame tubes and handlebars
    drawDeformedLine(bikeX - 1.2, -halfW * 0.55, bikeX - 1.2, -halfW * 0.1, '#dc2626', 1.5);
    drawDeformedLine(bikeX - 1.2, halfW * 0.1, bikeX - 1.2, halfW * 0.55, '#2563eb', 1.5);
    drawDeformedRect(bikeX - 2.5, -halfW * 0.65, 1.8, 1.5, '#0f172a'); // Bike wheels
    drawDeformedRect(bikeX - 2.5, -halfW * 0.15, 1.8, 1.5, '#0f172a');
    drawDeformedRect(bikeX - 2.5, halfW * 0.15, 1.8, 1.5, '#0f172a');
    drawDeformedRect(bikeX - 2.5, halfW * 0.65, 1.8, 1.5, '#0f172a');
  } else if (car.type === 'van_cargo_old') {
    // Retro Cab-Over Van («Буханка» / УАЗ-452)
    // Iconic split dual-pane flat windshield with center pillar
    const glassX = cabinX + cabinL * 0.36;
    drawDeformedLine(glassX, -cabinW * 0.40, glassX, -1.0, '#38bdf8', 2.0);
    drawDeformedLine(glassX, 1.0, glassX, cabinW * 0.40, '#38bdf8', 2.0);
    drawDeformedLine(glassX - 0.5, 0, glassX + 1.5, 0, car.color, 1.5); // Center split bar

    // Rounded retro nose with front stamped cooling slots
    drawDeformedRect(halfL - fc - 2.2, -halfW * 0.45, 1.8, halfW * 0.90, '#1e293b');
    drawDeformedCircle(halfL - fc - 0.8, -halfW * 0.65, 2.0, '#fef08a', '#cbd5e1', 1.0);
    drawDeformedCircle(halfL - fc - 0.8, halfW * 0.65, 2.0, '#fef08a', '#cbd5e1', 1.0);

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
    // Heavily Armored Cash-in-Transit Transit Vehicle (Инкассация)
    // Narrow ballistic slit windows (bulletproof slits)
    const slitX = cabinX + cabinL * 0.32;
    drawDeformedRect(slitX, -cabinW * 0.32, 1.6, cabinW * 0.64, '#38bdf8');
    // Side door slit windows
    drawDeformedRect(cabinX, -halfW + 0.2, 3.5, 1.2, '#38bdf8');
    drawDeformedRect(cabinX, halfW - 1.4, 3.5, 1.2, '#38bdf8');

    // Armored gun firing ports (бойницы) on side armor panels
    drawDeformedCircle(cabinX - cabinL * 0.22, -halfW + 0.8, 1.2, '#0f172a');
    drawDeformedCircle(cabinX - cabinL * 0.22, halfW - 0.8, 1.2, '#0f172a');

    // Heavy steel ramming front bumper
    drawDeformedRect(halfL - fc + 0.2, -halfW - 0.4, 3.0, car.width + 0.8, '#0f172a');
    drawDeformedRect(halfL - fc + 1.2, -halfW * 0.45, 1.8, halfW * 0.90, '#475569');

    // Roof armored ventilation dome & security beacon mount
    drawDeformedCircle(cabinX, 0, 2.4, '#334155');
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
}
