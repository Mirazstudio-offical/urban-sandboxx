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
  drawDeformedCircle: (cx: number, cy: number, r: number, fill: string) => void;
  nightAlpha: number;
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

  // --- ARTICULATED BUS («ГАРМОШКА») ---
  else if (car.type === 'bus_articulated') {
    const glassX1 = -halfL + 6;
    const glassX2 = halfL - 8;
    const glassW = halfW * 2 - 1.2;
    drawDeformedRect(glassX1, -glassW / 2, glassX2 - glassX1, glassW, '#0f172a');

    const busRoofW = halfW * 2 - 4.5;
    drawDeformedRect(glassX1 + 1, -busRoofW / 2, glassX2 - glassX1 - 2, busRoofW, car.roofColor || car.color);

    // Windows along both cars
    const winCount = 10;
    const winSpan = (glassX2 - glassX1 - 14) / winCount;
    for (let i = 0; i < winCount; i++) {
      if (i === 4 || i === 5) continue; // Skip articulation joint
      const wx = glassX1 + 4 + i * winSpan;
      const ww = winSpan - 2;
      drawDeformedRect(wx, -halfW + 0.5, ww, 2.2, 'rgba(56, 189, 248, 0.16)');
      drawDeformedRect(wx, halfW - 2.7, ww, 2.2, 'rgba(56, 189, 248, 0.16)');
    }

    // Bellows articulation joint (гофра сочленения)
    const bellowsX = -2;
    const bellowsW = halfW * 2 + 0.5;
    const bellowsL = 14;
    drawDeformedRect(bellowsX - bellowsL / 2, -bellowsW / 2, bellowsL, bellowsW, '#0f172a');
    for (let bx = bellowsX - bellowsL / 2 + 1.5; bx <= bellowsX + bellowsL / 2 - 1.5; bx += 2.2) {
      drawDeformedLine(bx, -bellowsW / 2, bx, bellowsW / 2, '#334155', 1.4);
    }
    drawDeformedCircle(bellowsX, 0, 5, '#1e293b'); // Turntable ring

    // Front windshield & LED route display
    const fWindshieldX = halfL - 8;
    const fWindshieldW = halfW * 2 - 2.5;
    drawDeformedRect(fWindshieldX, -fWindshieldW / 2, 5.5, fWindshieldW, '#0f172a');
    drawDeformedRect(fWindshieldX + 1.2, -fWindshieldW / 2 + 0.8, 3.5, fWindshieldW - 1.6, 'rgba(56, 189, 248, 0.22)');
    drawDeformedRect(fWindshieldX - 2.5, -9, 2, 18, '#1e293b');
    drawDeformedRect(fWindshieldX - 2, -7.5, 1.2, 15, '#f59e0b'); // Route board «101»

    // Rear window
    const rWindshieldX = -halfL + 3;
    const rWindshieldW = halfW * 2 - 6;
    drawDeformedRect(rWindshieldX, -rWindshieldW / 2, 3, rWindshieldW, '#0f172a');
    drawDeformedRect(rWindshieldX + 0.5, -rWindshieldW / 2 + 0.5, 2, rWindshieldW - 1, 'rgba(56, 189, 248, 0.16)');

    // 4 Double passenger doors (2 on front car, 2 on rear car)
    const doorW = 7.5;
    const doorPositions = [
      halfL * 0.72,  // Front door
      halfL * 0.18,  // Middle-front door
      -halfL * 0.28, // Middle-rear door
      -halfL * 0.75  // Rear door
    ];
    doorPositions.forEach(dx => {
      drawDeformedRect(dx - doorW / 2, halfW - 2.2, doorW, 2.5, '#1e293b');
      drawDeformedRect(dx - 0.4, halfW - 2.2, 0.8, 2.5, '#cbd5e1');
      drawDeformedRect(dx - doorW / 2 + 0.8, halfW - 1.6, doorW / 2 - 1.4, 1.4, 'rgba(56, 189, 248, 0.22)');
      drawDeformedRect(dx + 0.6, halfW - 1.6, doorW / 2 - 1.4, 1.4, 'rgba(56, 189, 248, 0.22)');
    });

    // Dual Rooftop Air Conditioning Units (Front and rear)
    const acFrontX = halfL * 0.45;
    const acRearX = -halfL * 0.52;
    [acFrontX, acRearX].forEach(acX => {
      drawDeformedRect(acX - 8, -5, 16, 10, '#f8fafc');
      drawDeformedLine(acX - 8, -5, acX + 8, -5, '#cbd5e1', 0.8);
      drawDeformedLine(acX + 8, -5, acX + 8, 5, '#cbd5e1', 0.8);
      drawDeformedLine(acX + 8, 5, acX - 8, 5, '#cbd5e1', 0.8);
      drawDeformedLine(acX - 8, 5, acX - 8, -5, '#cbd5e1', 0.8);
      drawDeformedCircle(acX - 3.5, 0, 2, '#475569');
      drawDeformedCircle(acX + 3.5, 0, 2, '#475569');
    });
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

  // --- TRUCK WATER (КАПОТНЫЙ 2-Х ОСНЫЙ ВОДОВОЗ СО СТАРОЙ ЖЁЛТОЙ БОЧКОЙ «ВОДА») ---
  else if (car.type === 'truck_water') {
    // 1. Classic bonneted front cab (ZIL-130 / GAZ-53 shape in retro turquoise/sky blue)
    const hoodX1 = cabinX + cabinL / 2;
    const hoodX2 = halfL - fc;
    const hoodW = halfW * 2 - 5;

    // Rounded front hood
    drawDeformedRect(hoodX1, -hoodW / 2, hoodX2 - hoodX1, hoodW, '#0284c7');
    drawDeformedLine(hoodX1, -hoodW / 2, hoodX2, -hoodW / 2, '#0369a1', 1.2);
    drawDeformedLine(hoodX2, -hoodW / 2, hoodX2, hoodW / 2, '#0369a1', 1.2);
    drawDeformedLine(hoodX2, hoodW / 2, hoodX1, hoodW / 2, '#0369a1', 1.2);

    // Front white radiator grille mask (характерная белая облицовка решетки)
    drawDeformedRect(hoodX2 - 3, -hoodW / 2 + 1.5, 3, hoodW - 3, '#f8fafc');
    drawDeformedRect(hoodX2 - 2.5, -hoodW * 0.3, 2, hoodW * 0.6, '#334155'); // Grille slats
    drawDeformedCircle(hoodX2 - 1, -hoodW / 2 + 2.5, 1.5, '#fef08a'); // Headlights
    drawDeformedCircle(hoodX2 - 1, hoodW / 2 - 2.5, 1.5, '#fef08a');
    drawDeformedCircle(hoodX2 - 2, -hoodW / 2 + 0.8, 1.0, '#f59e0b'); // Amber turn blinkers
    drawDeformedCircle(hoodX2 - 2, hoodW / 2 - 0.8, 1.0, '#f59e0b');

    // Chrome round side mirrors on curved tubular brackets
    drawDeformedRect(cabinX + cabinL * 0.3, -halfW - 2.5, 1.5, 2.5, '#cbd5e1');
    drawDeformedRect(cabinX + cabinL * 0.3, halfW, 1.5, 2.5, '#cbd5e1');

    // Spare wheel mounted on chassis between cab and tank
    const spareX = cabinX - cabinL / 2 - 2.5;
    drawDeformedRect(spareX - 2.5, -halfW + 2, 5, 2.8, '#0f172a');
    drawDeformedRect(spareX - 1.5, -halfW + 2.5, 3, 1.8, '#64748b');

    // 2. Old Weathered Yellow Water Tank (Старая жёлтая бочка для воды)
    const tankX1 = -halfL + rc + 2;
    const tankX2 = spareX - 2;
    const tankW = halfW * 2 - 2;

    // Tank body gradient (aged sun-bleached yellow with metallic curvature)
    const tankGrad = ctx.createLinearGradient(0, -tankW / 2, 0, tankW / 2);
    tankGrad.addColorStop(0, '#d97706');
    tankGrad.addColorStop(0.2, '#fef08a');
    tankGrad.addColorStop(0.5, '#eab308');
    tankGrad.addColorStop(0.8, '#d97706');
    tankGrad.addColorStop(1, '#b45309');

    // Main cylindrical cistern body
    drawDeformedRect(tankX1, -tankW / 2, tankX2 - tankX1, tankW, tankGrad);
    drawDeformedLine(tankX1, -tankW / 2, tankX2, -tankW / 2, '#78350f', 1.4);
    drawDeformedLine(tankX2, -tankW / 2, tankX2, tankW / 2, '#78350f', 1.4);
    drawDeformedLine(tankX2, tankW / 2, tankX1, tankW / 2, '#78350f', 1.4);
    drawDeformedLine(tankX1, tankW / 2, tankX1, -tankW / 2, '#78350f', 1.4);

    // Rounded spherical front and rear tank end caps
    drawDeformedCircle(tankX1, 0, tankW * 0.45, '#d97706');
    drawDeformedCircle(tankX2, 0, tankW * 0.45, '#eab308');

    // Black steel retention mounting bands (стяжные хомуты)
    const band1X = tankX1 + (tankX2 - tankX1) * 0.28;
    const band2X = tankX1 + (tankX2 - tankX1) * 0.72;
    [band1X, band2X].forEach(bx => {
      drawDeformedRect(bx - 1, -tankW / 2 - 0.5, 2, tankW + 1, '#1e293b');
      drawDeformedCircle(bx, -tankW / 2 - 0.5, 1, '#cbd5e1'); // Tension bolt
      drawDeformedCircle(bx, tankW / 2 + 0.5, 1, '#cbd5e1');
    });

    // Cylindrical hose storage canisters (пеналы для рукавов) on both flanks
    drawDeformedRect(tankX1 + 2, -tankW / 2 - 1.2, tankX2 - tankX1 - 4, 1.8, '#334155');
    drawDeformedRect(tankX1 + 2, tankW / 2 - 0.6, tankX2 - tankX1 - 4, 1.8, '#334155');

    // Top diamond-plate service catwalk and inspection hatch with handwheel
    const topCatwalkX1 = tankX1 + 5;
    const topCatwalkX2 = tankX2 - 5;
    drawDeformedRect(topCatwalkX1, -3, topCatwalkX2 - topCatwalkX1, 6, '#475569');
    for (let cx = topCatwalkX1 + 2; cx < topCatwalkX2; cx += 3) {
      drawDeformedLine(cx, -3, cx, 3, '#334155', 0.6);
    }

    // Top domed fill hatch (заливной люк)
    const hatchX = tankX1 + (tankX2 - tankX1) * 0.5;
    drawDeformedCircle(hatchX, 0, 3.6, '#1e293b');
    drawDeformedCircle(hatchX, 0, 2.4, '#e2e8f0');
    drawDeformedLine(hatchX - 2, 0, hatchX + 2, 0, '#0f172a', 1.0); // Handwheel cross

    // Rear water discharge box / faucet & access ladder (задний кран слива воды и лестница)
    drawDeformedRect(tankX1 - 3, -4, 3, 8, '#334155');
    drawDeformedCircle(tankX1 - 3, 0, 1.5, '#0284c7'); // Water tap
    drawDeformedLine(tankX1 - 2, -3, tankX1, -3, '#cbd5e1', 1.0); // Ladder rungs
    drawDeformedLine(tankX1 - 2, 0, tankX1, 0, '#cbd5e1', 1.0);
    drawDeformedLine(tankX1 - 2, 3, tankX1, 3, '#cbd5e1', 1.0);

    // Iconic Cyrillic Stencil Inscription: « В О Д А »
    ctx.save();
    const [dTextX, dTextY] = deform(hatchX, 0);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Draw on left and right side of tank
    const [dLX, dLY] = deform(hatchX, -tankW * 0.28);
    ctx.fillText('В О Д А', dLX, dLY);
    const [dRX, dRY] = deform(hatchX, tankW * 0.28);
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

  // --- EMERGENCY ROOF SIRENS & DYNAMIC LIGHTBARS ---
  const isEmergency = car.type === 'police' || car.type === 'fire_engine' || 
                      car.type === 'fire_ladder' || car.type === 'fire_rescue' ||
                      car.type === 'ambulance' || car.type === 'ambulance_van' || 
                      car.type === 'ambulance_suv';

  if (isEmergency) {
    const isSirenActive = car.sirenOn === true;
    const strobe = isSirenActive ? (Math.floor(Date.now() / 90) % 4) : -1;

    // Siren mount bar
    const barW = cabinW * 0.9;
    drawDeformedRect(cabinX - 1.5, -barW / 2, 3, barW, '#0f172a');

    const isFire = car.type === 'fire_engine' || car.type === 'fire_ladder' || car.type === 'fire_rescue';
    const primaryColor = isFire ? '#ef4444' : '#3b82f6';
    const secondaryColor = isFire ? '#3b82f6' : '#ef4444';

    if (strobe === 0 || strobe === 1) {
      drawDeformedRect(cabinX - 1, -barW * 0.45, 2, barW * 0.4, primaryColor);
    } else {
      drawDeformedRect(cabinX - 1, -barW * 0.45, 2, barW * 0.4, isSirenActive ? '#1e3a8a' : '#1e293b');
    }

    if (strobe === 2 || strobe === 3) {
      drawDeformedRect(cabinX - 1, barW * 0.05, 2, barW * 0.4, secondaryColor);
    } else {
      drawDeformedRect(cabinX - 1, barW * 0.05, 2, barW * 0.4, isSirenActive ? '#7f1d1d' : '#311010');
    }

    drawDeformedRect(cabinX - 1.2, -1, 2.4, 2, '#ffffff');

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

      const [dcabinX, dcabinY1] = deform(cabinX, -barW * 0.35);
      const [dcabinX2, dcabinY2] = deform(cabinX, barW * 0.35);

      const leftGlow = ctx.createRadialGradient(dcabinX, dcabinY1, 1, dcabinX, dcabinY1, 24);
      leftGlow.addColorStop(0, (strobe === 0 || strobe === 1) ? 'rgba(59, 130, 246, 0.55)' : 'rgba(59, 130, 246, 0.15)');
      leftGlow.addColorStop(1, 'rgba(59, 130, 246, 0)');
      ctx.fillStyle = leftGlow;
      ctx.beginPath(); ctx.arc(dcabinX, dcabinY1, 24, 0, Math.PI * 2); ctx.fill();

      const rightGlow = ctx.createRadialGradient(dcabinX2, dcabinY2, 1, dcabinX2, dcabinY2, 24);
      rightGlow.addColorStop(0, (strobe === 2 || strobe === 3) ? 'rgba(239, 68, 68, 0.55)' : 'rgba(239, 68, 68, 0.15)');
      rightGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = rightGlow;
      ctx.beginPath(); ctx.arc(dcabinX2, dcabinY2, 24, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
}
