import { Vehicle } from './types';
import type { VehicleRenderContext } from './vehicleArchetypes';

/**
 * =============================================================================
 * ULTRA-REALISTIC MOTORCYCLE TEXTURE & COMPONENT RENDERING ENGINE
 * =============================================================================
 * First-principles simulation & high-fidelity graphic modeling for:
 * 1. Иж Юпитер-5 / Планета (moto_izh_jupiter)
 * 2. Урал М-67-36 с коляской (moto_ural_sidecar)
 * 3. Ява 350 / 638 «Пеналка» (moto_jawa350)
 * 4. Спортбайк 1000cc (moto_sport)
 * 5. Чоппер V-Twin Custom (moto_chopper)
 * 6. Советский мопед «Карпаты» / «Рига» (moped_soviet)
 */

/**
 * 1. ИЖ ЮПИТЕР-5 / ПЛАНЕТА (moto_izh_jupiter)
 * Classic Soviet 350cc twin-cylinder two-stroke roadster.
 */
export function renderMotoIzhJupiter(vCtx: VehicleRenderContext): void {
  const {
    ctx, car, halfL, halfW, fc, rc,
    deform, drawDeformedRect, drawDeformedLine, drawDeformedCircle, nightAlpha
  } = vCtx;

  const baseColor = car.color || '#1e3a8a';
  const steer = car.steerAngle || 0;

  // 1. Double-Cradle Steel Tubular Frame (Черная дуплексная трубчатая рама)
  drawDeformedLine(-halfL * 0.60, -1.8, halfL * 0.35, -1.8, '#0f172a', 2.0);
  drawDeformedLine(-halfL * 0.60, 1.8, halfL * 0.35, 1.8, '#0f172a', 2.0);
  drawDeformedLine(-halfL * 0.40, -halfW * 0.35, -halfL * 0.40, halfW * 0.35, '#1e293b', 1.6);
  drawDeformedLine(halfL * 0.15, -halfW * 0.35, halfL * 0.15, halfW * 0.35, '#1e293b', 1.6);

  // 2. 2-Cylinder 2-Stroke Engine Block & Massive Transverse Cooling Fins (Двигатель Юпитер-5)
  const engX = -halfL * 0.05;
  const engL = halfL * 0.38;
  const engW = halfW * 0.96;

  // Engine crankcase (Картер)
  drawDeformedRect(engX - engL / 2, -engW * 0.38, engL, engW * 0.76, '#334155');
  drawDeformedRect(engX - engL * 0.35, -engW * 0.32, engL * 0.70, engW * 0.64, '#475569');

  // Left & Right Finned Cylinder Jugs (Оребренные цилиндры)
  [-engW / 2 + 0.5, engW / 2 - 2.5].forEach((cy, idx) => {
    drawDeformedRect(engX - engL * 0.45, cy, engL * 0.90, 2.0, '#1e293b');
    // Cooling fins (ребра охлаждения цилиндров)
    for (let fx = engX - engL * 0.40; fx <= engX + engL * 0.40; fx += 1.8) {
      drawDeformedLine(fx, cy - 0.4, fx, cy + 2.4, '#cbd5e1', 0.8);
    }
    // Spark plugs with red silicone caps (Свечи зажигания с красными колпачками)
    const plugX = engX + (idx === 0 ? -1.0 : 1.0);
    const plugY = idx === 0 ? cy - 0.8 : cy + 2.8;
    drawDeformedCircle(plugX, plugY, 0.9, '#ef4444');
    drawDeformedCircle(plugX, plugY, 0.4, '#f8fafc');
    // Ignition HT cable
    drawDeformedLine(plugX, plugY, engX - 2, 0, '#0f172a', 0.8);
  });

  // Central Carburetor with air duct (Карбюратор К-65 с резиновым патрубком)
  drawDeformedRect(engX - engL * 0.45, -1.8, 2.8, 3.6, '#64748b');
  drawDeformedCircle(engX - engL * 0.45 + 1.4, 0, 1.2, '#94a3b8');

  // Kickstarter & Gear Lever on left side, rear brake pedal on right
  drawDeformedLine(engX - 2, -engW * 0.38, engX - 4, -engW * 0.55, '#cbd5e1', 1.2); // Kickstarter
  drawDeformedCircle(engX - 4, -engW * 0.55, 0.8, '#0f172a'); // Rubber peg
  drawDeformedLine(engX + 3, engW * 0.38, engX + 5, engW * 0.52, '#94a3b8', 1.2); // Brake pedal

  // Footpeg rubbers (Резиновые подножки водителя с рифлением)
  drawDeformedRect(engX - 1.5, -halfW * 0.82, 3.0, 1.6, '#0f172a');
  drawDeformedLine(engX - 1.2, -halfW * 0.82 + 0.8, engX + 1.2, -halfW * 0.82 + 0.8, '#475569', 0.6);
  drawDeformedRect(engX - 1.5, halfW * 0.82 - 1.6, 3.0, 1.6, '#0f172a');
  drawDeformedLine(engX - 1.2, halfW * 0.82 - 0.8, engX + 1.2, halfW * 0.82 - 0.8, '#475569', 0.6);

  // 3. Symmetrical Dual Chrome Exhaust Pipes & Silencers (Две хромированные выхлопные трубы с глушителями-сигарами)
  [-halfW * 0.58, halfW * 0.58].forEach((ey, idx) => {
    // Header pipe from cylinder
    drawDeformedLine(engX + engL * 0.35, idx === 0 ? -engW * 0.30 : engW * 0.30, engX + engL * 0.45, ey, '#cbd5e1', 1.6);
    // Main silencer body
    const silX1 = engX - engL * 0.2;
    const silX2 = -halfL + rc + 0.5;
    drawDeformedLine(silX1, ey, silX2, ey, '#f8fafc', 2.0);
    drawDeformedLine(silX1, ey, silX2, ey, '#94a3b8', 1.0);
    // Flared megaphone end tip
    drawDeformedCircle(silX2, ey, 1.2, '#cbd5e1');
    drawDeformedCircle(silX2, ey, 0.6, '#0f172a');
  });

  // 4. Iconic Angular Sculpted Fuel Tank (Гранёный бензобак Иж Юпитер-5)
  const tankX = halfL * 0.18;
  const tankL = halfL * 0.48;
  const tankW = halfW * 0.90;

  // Main tank metal body
  drawDeformedRect(tankX - tankL / 2, -tankW / 2, tankL, tankW, baseColor);

  // Angular tank facet crease lines & highlights
  drawDeformedLine(tankX - tankL / 2, 0, tankX + tankL / 2, 0, 'rgba(255, 255, 255, 0.45)', 1.2);
  drawDeformedLine(tankX - tankL / 2 + 1, -tankW * 0.32, tankX + tankL / 2 - 1, -tankW * 0.32, 'rgba(255, 255, 255, 0.22)', 0.8);
  drawDeformedLine(tankX - tankL / 2 + 1, tankW * 0.32, tankX + tankL / 2 - 1, tankW * 0.32, 'rgba(0, 0, 0, 0.25)', 0.8);

  // Black Rubber Knee-Grip Pads with Ribbed Texture (Резиновые нигрипсы с рифлением)
  const padL = tankL * 0.52;
  const padX = tankX - tankL * 0.05;
  drawDeformedRect(padX - padL / 2, -tankW / 2 - 0.4, padL, 1.4, '#0f172a');
  drawDeformedRect(padX - padL / 2, tankW / 2 - 1.0, padL, 1.4, '#0f172a');
  for (let px = padX - padL / 2 + 1.2; px <= padX + padL / 2 - 1.2; px += 2.0) {
    drawDeformedLine(px, -tankW / 2 - 0.3, px, -tankW / 2 + 0.9, '#334155', 0.6);
    drawDeformedLine(px, tankW / 2 - 0.9, px, tankW / 2 + 0.3, '#334155', 0.6);
  }

  // Soviet "ИЖ" Chrome Tank Emblems (Эмблемы «ИЖ»)
  drawDeformedRect(tankX - 1.5, -tankW / 2 + 0.3, 3.0, 0.8, '#cbd5e1');
  drawDeformedRect(tankX - 1.5, tankW / 2 - 1.1, 3.0, 0.8, '#cbd5e1');

  // Chrome Flip-Up Gas Cap (Хромированная крышка бензобака)
  drawDeformedCircle(tankX + tankL * 0.20, 0, 1.8, '#0f172a');
  drawDeformedCircle(tankX + tankL * 0.20, 0, 1.4, '#f8fafc');
  drawDeformedCircle(tankX + tankL * 0.20, 0, 0.6, '#cbd5e1');

  // 5. Two-Up Ribbed Leather Saddle (Двухместное кожаное седло с поперечным рифлением)
  const seatX = -halfL * 0.32;
  const seatL = halfL * 0.62;
  const seatW = halfW * 0.82;

  // Black vinyl seat base
  drawDeformedRect(seatX - seatL / 2, -seatW / 2, seatL, seatW, '#0f172a');
  drawDeformedRect(seatX - seatL / 2 + 0.5, -seatW / 2 + 0.5, seatL - 1.0, seatW - 1.0, '#1e293b');

  // Transverse ribbed stitching seams (Поперечная прошивка подушки)
  for (let sx = seatX - seatL / 2 + 2.4; sx <= seatX + seatL / 2 - 2.4; sx += 2.4) {
    drawDeformedLine(sx, -seatW / 2 + 1.0, sx, seatW / 2 - 1.0, '#0f172a', 0.8);
    drawDeformedLine(sx + 0.4, -seatW / 2 + 1.0, sx + 0.4, seatW / 2 - 1.0, 'rgba(255, 255, 255, 0.12)', 0.5);
  }

  // White perimeter piping border (Белый кант по контуру сиденья)
  drawDeformedLine(seatX - seatL / 2, -seatW / 2, seatX + seatL / 2, -seatW / 2, '#94a3b8', 0.7);
  drawDeformedLine(seatX - seatL / 2, seatW / 2, seatX + seatL / 2, seatW / 2, '#94a3b8', 0.7);
  drawDeformedLine(seatX - seatL / 2, -seatW / 2, seatX - seatL / 2, seatW / 2, '#94a3b8', 0.7);

  // Chrome Passenger Grab Rail Arch (Хромированный поручень пассажира / бугель)
  drawDeformedLine(seatX - seatL / 2 - 0.8, -seatW * 0.45, seatX - seatL / 2 - 2.5, -seatW * 0.45, '#cbd5e1', 1.4);
  drawDeformedLine(seatX - seatL / 2 - 2.5, -seatW * 0.45, seatX - seatL / 2 - 2.5, seatW * 0.45, '#cbd5e1', 1.4);
  drawDeformedLine(seatX - seatL / 2 - 2.5, seatW * 0.45, seatX - seatL / 2 - 0.8, seatW * 0.45, '#cbd5e1', 1.4);

  // Side Tool Boxes & Battery Cover Panels (Боковые ящики-бардачки с замками)
  const boxX = seatX + seatL * 0.12;
  drawDeformedRect(boxX - 3.5, -halfW * 0.65, 7.0, 1.8, baseColor);
  drawDeformedCircle(boxX, -halfW * 0.65 + 0.9, 0.7, '#cbd5e1'); // Key lock
  drawDeformedRect(boxX - 3.5, halfW * 0.65 - 1.8, 7.0, 1.8, baseColor);
  drawDeformedCircle(boxX, halfW * 0.65 - 0.9, 0.7, '#cbd5e1');

  // Rear Chrome Shock Absorbers with Exposed Springs (Задние амортизаторы)
  [-halfW * 0.50, halfW * 0.50].forEach(sy => {
    drawDeformedLine(seatX - seatL * 0.35, sy, -halfL + rc + 2, sy, '#cbd5e1', 1.5);
    drawDeformedLine(seatX - seatL * 0.35, sy, -halfL + rc + 2, sy, '#0f172a', 0.8, true);
  });

  // 6. Rear Mudguard Fender & Soviet FP-246 Taillight (Заднее крыло и фонарь ФП-246)
  const rearFenderX = -halfL + rc + 1.0;
  drawDeformedRect(rearFenderX - 2.5, -halfW * 0.35, 4.0, halfW * 0.70, baseColor);
  drawDeformedLine(rearFenderX - 2.5, 0, rearFenderX + 1.5, 0, 'rgba(255, 255, 255, 0.35)', 1.0);

  // Rectangular Tail Light (Фонарь ФП-246)
  const lightX = rearFenderX - 2.0;
  drawDeformedRect(lightX - 1.2, -2.0, 1.6, 4.0, '#0f172a');
  drawDeformedRect(lightX - 0.8, -1.6, 1.2, 3.2, car.brakeLightsOn ? '#ef4444' : '#dc2626');
  if (car.brakeLightsOn) {
    drawDeformedCircle(lightX, 0, 1.8, '#fef08a');
  }

  // Amber Rear Turn Signals (Указатели поворота)
  drawDeformedRect(rearFenderX - 1.0, -halfW * 0.65, 1.2, 1.8, '#f59e0b');
  drawDeformedLine(rearFenderX - 1.0, -halfW * 0.35, rearFenderX - 1.0, -halfW * 0.65, '#cbd5e1', 1.0);
  drawDeformedRect(rearFenderX - 1.0, halfW * 0.65 - 1.8, 1.2, 1.8, '#f59e0b');
  drawDeformedLine(rearFenderX - 1.0, halfW * 0.35, rearFenderX - 1.0, halfW * 0.65, '#cbd5e1', 1.0);

  // 7. Front Steering Fork, Handlebars & Cockpit (Передняя вилка, руль и фара)
  const forkX = halfL * 0.48;
  const barW = halfW * 1.95;

  // Front Painted Mudguard Fender (Переднее глубокое крыло)
  const fFenderX = halfL * 0.68;
  drawDeformedRect(fFenderX - 2.0, -halfW * 0.28, 5.0, halfW * 0.56, baseColor);
  drawDeformedLine(fFenderX - 2.0, 0, fFenderX + 3.0, 0, 'rgba(255, 255, 255, 0.4)', 0.8);

  // Front Fork Triple Trees & Stanchions (Траверсы и перья вилки с гофрами)
  [-halfW * 0.32, halfW * 0.32].forEach(fy => {
    drawDeformedLine(forkX - 1, fy, fFenderX + 1, fy, '#cbd5e1', 1.8);
    // Black accordion rubber gaiters (резиновые гофры)
    drawDeformedLine(forkX + 1, fy, forkX + 4, fy, '#0f172a', 2.4);
    drawDeformedLine(forkX + 1, fy, forkX + 4, fy, '#475569', 1.0, true);
  });

  // Swept-Back Chrome Handlebars (Хромированный изогнутый руль)
  drawDeformedLine(forkX, -barW / 2 + 1.5, forkX + 1.0, 0, '#f8fafc', 2.0);
  drawDeformedLine(forkX + 1.0, 0, forkX, barW / 2 - 1.5, '#f8fafc', 2.0);
  drawDeformedLine(forkX, -barW / 2 + 1.5, forkX - 2.0, -barW / 2, '#cbd5e1', 2.0);
  drawDeformedLine(forkX, barW / 2 - 1.5, forkX - 2.0, barW / 2, '#cbd5e1', 2.0);

  // Black Rubber Grips (Черные рифленые рукоятки)
  drawDeformedRect(forkX - 3.2, -barW / 2 - 0.2, 3.2, 1.8, '#0f172a');
  drawDeformedRect(forkX - 3.2, barW / 2 - 1.6, 3.2, 1.8, '#0f172a');

  // Chrome Brake & Clutch Lever Blades (Рычаги сцепления и тормоза)
  drawDeformedLine(forkX - 2.0, -barW / 2 + 0.5, forkX + 1.5, -barW / 2 + 2.5, '#cbd5e1', 1.2);
  drawDeformedLine(forkX - 2.0, barW / 2 - 0.5, forkX + 1.5, barW / 2 - 2.5, '#cbd5e1', 1.2);

  // Dual Round Chrome Rearview Mirrors (Круглые хромированные зеркала на ножках)
  drawDeformedLine(forkX - 1.0, -barW * 0.40, forkX + 3.0, -barW * 0.48, '#cbd5e1', 1.2);
  drawDeformedCircle(forkX + 3.2, -barW * 0.48, 1.5, '#f8fafc', '#475569', 0.6);
  drawDeformedLine(forkX - 1.0, barW * 0.40, forkX + 3.0, barW * 0.48, '#cbd5e1', 1.2);
  drawDeformedCircle(forkX + 3.2, barW * 0.48, 1.5, '#f8fafc', '#475569', 0.6);

  // Classic Soviet Round/Square Chrome Headlight (Фара с рассеивателем)
  const headX = forkX + 3.2;
  drawDeformedRect(headX - 1.2, -halfW * 0.38, 3.0, halfW * 0.76, '#0f172a');
  drawDeformedRect(headX - 0.8, -halfW * 0.35, 2.6, halfW * 0.70, '#cbd5e1'); // Chrome rim
  drawDeformedRect(headX, -halfW * 0.30, 1.8, halfW * 0.60, car.headlightsOn ? '#fef08a' : '#e2e8f0'); // Glass lens
  if (car.headlightsOn) {
    drawDeformedCircle(headX + 0.8, 0, 1.8, '#ffffff');
  }

  // Instrument Console Pod (Приборная панель Иж-5: спидометр и контрольные лампы)
  drawDeformedRect(forkX - 2.2, -2.4, 2.8, 4.8, '#1e293b');
  drawDeformedCircle(forkX - 0.8, 0, 1.5, '#0f172a');
  drawDeformedCircle(forkX - 0.8, 0, 1.1, '#38bdf8'); // Speedometer dial
  drawDeformedCircle(forkX - 1.6, -1.2, 0.5, '#22c55e'); // Neutral green
  drawDeformedCircle(forkX - 1.6, 1.2, 0.5, '#ef4444'); // Charge red
}

/**
 * 2. УРАЛ М-67-36 С КОЛЯСКОЙ (moto_ural_sidecar)
 * Heavy Soviet motorcycle with opposed flat-twin boxer engine and authentic passenger sidecar.
 */
export function renderMotoUralSidecar(vCtx: VehicleRenderContext): void {
  const {
    ctx, car, halfL, halfW, fc, rc,
    deform, drawDeformedRect, drawDeformedLine, drawDeformedCircle, nightAlpha
  } = vCtx;

  const bikeY = -halfW * 0.44;
  const sidecarY = halfW * 0.54;
  const baseColor = car.color || '#15803d'; // Iconic Soviet deep military green / dark teal

  // =========================================================================
  // PART A: MOTORCYCLE CHASSIS & POWERTRAIN
  // =========================================================================

  // 1. Heavy Duplex Steel Cradle Frame (Мощная дуплексная трубчатая рама)
  drawDeformedLine(-halfL * 0.65, bikeY - 1.8, halfL * 0.35, bikeY - 1.8, '#0f172a', 2.2);
  drawDeformedLine(-halfL * 0.65, bikeY + 1.8, halfL * 0.35, bikeY + 1.8, '#0f172a', 2.2);

  // 2. Legendary 650/750cc Flat-Twin Boxer Engine (Оппозитный двигатель ИМЗ)
  const engX = -halfL * 0.05;
  const engL = halfL * 0.36;

  // Central engine crankcase (Картер оппозита)
  drawDeformedRect(engX - engL / 2, bikeY - 3.2, engL, 6.4, '#334155');
  drawDeformedRect(engX - engL * 0.35, bikeY - 2.6, engL * 0.70, 5.2, '#475569');

  // Left Horizontally Opposed Cylinder (Левый выступающий цилиндр)
  const cylL = 4.8;
  const cylW = 3.6;
  drawDeformedRect(engX - cylL / 2, bikeY - 8.2, cylL, 5.2, '#1e293b'); // Cylinder barrel
  for (let cy = bikeY - 7.8; cy <= bikeY - 3.8; cy += 1.2) {
    drawDeformedLine(engX - cylL / 2 - 0.6, cy, engX + cylL / 2 + 0.6, cy, '#cbd5e1', 0.9); // Cooling fins
  }
  // Valve Rocker Cover (Клапанная крышка со шпильками)
  drawDeformedRect(engX - cylL * 0.45, bikeY - 9.4, cylL * 0.90, 1.4, '#475569');
  drawDeformedCircle(engX - 1.2, bikeY - 8.8, 0.5, '#cbd5e1');
  drawDeformedCircle(engX + 1.2, bikeY - 8.8, 0.5, '#cbd5e1');
  // Spark Plug with red cap
  drawDeformedCircle(engX, bikeY - 7.5, 0.9, '#ef4444');
  drawDeformedLine(engX, bikeY - 7.5, engX - 2, bikeY - 2, '#0f172a', 0.8);

  // Right Horizontally Opposed Cylinder (Правый выступающий цилиндр)
  drawDeformedRect(engX - cylL / 2, bikeY + 3.0, cylL, 5.2, '#1e293b');
  for (let cy = bikeY + 3.8; cy <= bikeY + 7.8; cy += 1.2) {
    drawDeformedLine(engX - cylL / 2 - 0.6, cy, engX + cylL / 2 + 0.6, cy, '#cbd5e1', 0.9);
  }
  // Right Rocker Cover
  drawDeformedRect(engX - cylL * 0.45, bikeY + 8.0, cylL * 0.90, 1.4, '#475569');
  drawDeformedCircle(engX - 1.2, bikeY + 8.6, 0.5, '#cbd5e1');
  drawDeformedCircle(engX + 1.2, bikeY + 8.6, 0.5, '#cbd5e1');
  // Spark Plug
  drawDeformedCircle(engX, bikeY + 7.5, 0.9, '#ef4444');
  drawDeformedLine(engX, bikeY + 7.5, engX - 2, bikeY + 2, '#0f172a', 0.8);

  // Carburetors & Central Aluminum Air Filter Drum (Воздушный фильтр «кастрюля» и карбюраторы К-65Т)
  drawDeformedCircle(engX - engL * 0.45, bikeY, 2.4, '#475569');
  drawDeformedCircle(engX - engL * 0.45, bikeY, 1.6, '#64748b');
  drawDeformedLine(engX - engL * 0.45, bikeY - 2.0, engX - 1, bikeY - 4.2, '#0f172a', 1.2); // Air duct left
  drawDeformedLine(engX - engL * 0.45, bikeY + 2.0, engX - 1, bikeY + 4.2, '#0f172a', 1.2); // Air duct right

  // Enclosed Driveshaft (Карданный вал к заднему редуктору)
  drawDeformedLine(engX - engL / 2, bikeY + 1.2, -halfL + rc + 2, bikeY + 1.2, '#1e293b', 2.0);
  drawDeformedCircle(-halfL + rc + 2, bikeY + 1.2, 1.8, '#334155'); // Final drive bevel gear hub

  // Dual Exhaust Pipes with Long Cylindrical Silencers
  drawDeformedLine(engX + engL * 0.35, bikeY - 4.5, -halfL + rc + 1, bikeY - 4.5, '#cbd5e1', 1.6);
  drawDeformedRect(-halfL * 0.65, bikeY - 5.2, halfL * 0.42, 1.4, '#f8fafc');

  // 3. Teardrop Steel Fuel Tank with Top Tool Compartment (Бак с инструментальным бардачком)
  const tankX = halfL * 0.16;
  const tankL = halfL * 0.46;
  const tankW = 8.5;

  drawDeformedRect(tankX - tankL / 2, bikeY - tankW / 2, tankL, tankW, baseColor);
  drawDeformedLine(tankX - tankL / 2, bikeY, tankX + tankL / 2, bikeY, 'rgba(255, 255, 255, 0.4)', 1.2);

  // Top Tool Box Lid on Tank (Откидной лючок бардачка на баке)
  drawDeformedRect(tankX - 2.5, bikeY - 2.0, 5.0, 4.0, '#0f172a');
  drawDeformedRect(tankX - 2.0, bikeY - 1.6, 4.0, 3.2, baseColor);
  drawDeformedCircle(tankX + 1.2, bikeY, 0.6, '#cbd5e1'); // Key turn lock

  // Chrome Flip-Up Fuel Cap (Откидная крышка заливной горловины)
  drawDeformedCircle(tankX + tankL * 0.28, bikeY, 1.4, '#f8fafc');
  drawDeformedCircle(tankX + tankL * 0.28, bikeY, 0.6, '#0f172a');

  // Rubber Knee Grips on Tank Flanks (Резиновые наколенники)
  drawDeformedRect(tankX - 3.0, bikeY - tankW / 2 - 0.4, 6.0, 1.2, '#0f172a');
  drawDeformedRect(tankX - 3.0, bikeY + tankW / 2 - 0.8, 6.0, 1.2, '#0f172a');

  // 4. Sprung Triangular Driver Saddle & Pillion Pad (Раздельные сиденья: седло-лягушка и пассажирская подушка)
  // Sprung driver seat ("Лягушка")
  const seatX = -halfL * 0.22;
  drawDeformedCircle(seatX, bikeY, 3.8, '#0f172a');
  drawDeformedCircle(seatX + 0.5, bikeY, 3.0, '#1e293b');
  drawDeformedLine(seatX - 3.0, bikeY - 2.0, seatX + 2.0, bikeY, '#0f172a', 1.0);
  drawDeformedLine(seatX - 3.0, bikeY + 2.0, seatX + 2.0, bikeY, '#0f172a', 1.0);

  // Passenger rear fender pillion cushion (Пассажирская подушка на крыле с ремнем)
  const pillionX = -halfL * 0.52;
  drawDeformedRect(pillionX - 3.5, bikeY - 2.8, 7.0, 5.6, '#0f172a');
  drawDeformedRect(pillionX - 3.0, bikeY - 2.4, 6.0, 4.8, '#1e293b');
  drawDeformedLine(pillionX, bikeY - 2.8, pillionX, bikeY + 2.8, '#78350f', 1.2); // Leather grab strap

  // Rear Heavy Steel Mudguard with FP-246 Taillight (Глубокое заднее крыло и фонарь)
  drawDeformedRect(-halfL + rc + 0.5, bikeY - 2.6, 5.0, 5.2, baseColor);
  drawDeformedRect(-halfL + rc - 1.5, bikeY - 1.4, 1.6, 2.8, '#0f172a');
  drawDeformedRect(-halfL + rc - 1.2, bikeY - 1.1, 1.2, 2.2, car.brakeLightsOn ? '#ef4444' : '#dc2626');

  // 5. Front Fork, Handlebars & Big Round Chrome Headlight (Передняя вилка, руль, фара Урала)
  const forkX = halfL * 0.50;
  const barW = 16.0;

  // Heavy Telescopic Fork with Rubber Gaiters (Перья вилки с резиновыми гофрами)
  [-3.0, 3.0].forEach(fy => {
    drawDeformedLine(forkX - 1, bikeY + fy, halfL * 0.72, bikeY + fy, '#cbd5e1', 2.0);
    drawDeformedLine(forkX + 1, bikeY + fy, forkX + 4.5, bikeY + fy, '#0f172a', 2.6);
  });

  // Front Mudguard Fender
  drawDeformedRect(halfL * 0.55, bikeY - 2.5, 6.0, 5.0, baseColor);

  // Wide Sturdy Handlebars (Широкий мощный руль Урала)
  drawDeformedLine(forkX, bikeY - barW / 2, forkX + 1.2, bikeY, '#f8fafc', 2.2);
  drawDeformedLine(forkX + 1.2, bikeY, forkX, bikeY + barW / 2, '#f8fafc', 2.2);
  // Rubber Grips
  drawDeformedRect(forkX - 3.2, bikeY - barW / 2 - 0.2, 3.2, 1.8, '#0f172a');
  drawDeformedRect(forkX - 3.2, bikeY + barW / 2 - 1.6, 3.2, 1.8, '#0f172a');
  // Levers
  drawDeformedLine(forkX - 2.0, bikeY - barW / 2 + 0.5, forkX + 1.5, bikeY - barW / 2 + 2.5, '#cbd5e1', 1.4);
  drawDeformedLine(forkX - 2.0, bikeY + barW / 2 - 0.5, forkX + 1.5, bikeY + barW / 2 - 2.5, '#cbd5e1', 1.4);

  // Big Round Chrome Headlight Bowl with Top Ignition Switch (Большая круглая фара-ведро с замком зажигания)
  const headX = forkX + 3.6;
  drawDeformedCircle(headX, bikeY, 3.2, '#0f172a');
  drawDeformedCircle(headX, bikeY, 2.6, '#cbd5e1');
  drawDeformedCircle(headX + 0.5, bikeY, 2.0, car.headlightsOn ? '#fef08a' : '#f8fafc');
  if (car.headlightsOn) {
    drawDeformedCircle(headX + 0.5, bikeY, 1.0, '#ffffff');
  }
  // Top Ignition Key & Charge Telltale
  drawDeformedCircle(headX - 1.5, bikeY, 0.7, '#0f172a');
  drawDeformedCircle(headX - 1.5, bikeY, 0.4, '#cbd5e1');

  // =========================================================================
  // PART B: 4-POINT TUBULAR CHASSIS SUBFRAME (Крепления рамы коляски к мотоциклу)
  // =========================================================================
  drawDeformedLine(-halfL * 0.45, bikeY + 2.0, -halfL * 0.45, sidecarY - 4.0, '#1e293b', 2.4); // Rear lower collet clamp
  drawDeformedLine(halfL * 0.15, bikeY + 2.0, halfL * 0.15, sidecarY - 4.0, '#1e293b', 2.4);  // Front lower collet clamp
  drawDeformedLine(-halfL * 0.25, bikeY + 2.0, -halfL * 0.10, sidecarY - 4.0, '#334155', 1.8); // Diagonal strut tie-rod
  drawDeformedLine(halfL * 0.25, bikeY + 2.0, halfL * 0.30, sidecarY - 4.0, '#334155', 1.8);   // Front upper tie-rod

  // =========================================================================
  // PART C: AUTHENTIC SOVIET SIDECAR BOAT («Люлька / Коляска»)
  // =========================================================================
  const scFrontX = halfL * 0.42;
  const scRearX = -halfL * 0.78;
  const scL = scFrontX - scRearX;
  const scW = halfW * 0.76;

  // 1. Aerodynamic Boat Hull ("Лодочка" коляски Урала)
  // Main contoured body
  drawDeformedRect(scRearX, sidecarY - scW / 2, scL, scW, baseColor);
  // Rounded streamlined front nose
  drawDeformedCircle(scFrontX - 2.0, sidecarY, scW * 0.45, baseColor);
  drawDeformedLine(scRearX, sidecarY - scW / 2, scFrontX - 2.0, sidecarY - scW / 2, 'rgba(255, 255, 255, 0.35)', 1.2);
  drawDeformedLine(scRearX, sidecarY + scW / 2, scFrontX - 2.0, sidecarY + scW / 2, 'rgba(0, 0, 0, 0.3)', 1.2);

  // Front Amber Marker Light on Sidecar Nose (Габаритный фонарик на носу)
  drawDeformedRect(scFrontX + 1.5, sidecarY - 1.2, 1.4, 2.4, '#0f172a');
  drawDeformedRect(scFrontX + 1.8, sidecarY - 0.9, 1.0, 1.8, '#f59e0b');

  // 2. Passenger Cockpit & Soft Leatherette Seat (Пассажирский салон коляски)
  const cockX = scFrontX - scL * 0.42;
  const cockL = scL * 0.38;
  const cockW = scW * 0.78;

  drawDeformedRect(cockX - cockL / 2, sidecarY - cockW / 2, cockL, cockW, '#0f172a');
  // Padded seat cushion & backrest
  drawDeformedRect(cockX - cockL * 0.38, sidecarY - cockW * 0.40, cockL * 0.45, cockW * 0.80, '#1e293b');
  drawDeformedRect(cockX - cockL * 0.45, sidecarY - cockW * 0.42, 2.0, cockW * 0.84, '#334155'); // Backrest
  // Chrome passenger grab handle on cockpit edge
  drawDeformedLine(cockX + cockL * 0.45, sidecarY - cockW * 0.40, cockX + cockL * 0.45, sidecarY + cockW * 0.40, '#cbd5e1', 1.4);

  // Weather Tonneau Apron Canvas Cover (Брезентовый полог с люверсами)
  const tarpX = scFrontX - scL * 0.15;
  drawDeformedRect(tarpX - 3.5, sidecarY - cockW / 2 + 0.4, 7.0, cockW - 0.8, '#3f4234'); // Military olive canvas
  drawDeformedLine(tarpX - 3.5, sidecarY - cockW / 2 + 0.4, tarpX + 3.5, sidecarY - cockW / 2 + 0.4, '#71745d', 1.0);
  drawDeformedLine(tarpX - 3.5, sidecarY + cockW / 2 - 0.4, tarpX + 3.5, sidecarY + cockW / 2 - 0.4, '#26291e', 1.0);

  // 3. Sidecar Outer Wheel Fender & Combination Light (Крыло коляски с габаритом)
  const scFenderX = -halfL * 0.20;
  const scFenderL = 15.0;
  drawDeformedRect(scFenderX - scFenderL / 2, sidecarY + scW / 2 - 0.8, scFenderL, 2.4, baseColor);
  drawDeformedLine(scFenderX - scFenderL / 2, sidecarY + scW / 2 + 1.6, scFenderX + scFenderL / 2, sidecarY + scW / 2 + 1.6, 'rgba(0, 0, 0, 0.4)', 1.0);

  // Sidecar fender combination lamp (Передний белый/оранжевый габарит + задний красный стоп-сигнал)
  drawDeformedRect(scFenderX + scFenderL * 0.38, sidecarY + scW / 2 + 0.4, 1.8, 1.4, '#f59e0b');
  drawDeformedRect(scFenderX - scFenderL * 0.45, sidecarY + scW / 2 + 0.4, 1.8, 1.4, car.brakeLightsOn ? '#ef4444' : '#dc2626');

  // 4. Rear Trunk Compartment & Full-Size Spare Wheel (Запасное колесо на багажнике коляски)
  const trunkX = scRearX + scL * 0.25;

  // Rubber spare tire
  drawDeformedCircle(trunkX, sidecarY, 4.4, '#0f172a');
  drawDeformedCircle(trunkX, sidecarY, 3.8, '#1e293b');
  // Chrome spoke wheel rim
  drawDeformedCircle(trunkX, sidecarY, 2.6, '#475569');
  drawDeformedCircle(trunkX, sidecarY, 2.2, '#94a3b8');
  // Spoke pattern cross
  drawDeformedLine(trunkX - 2.0, sidecarY, trunkX + 2.0, sidecarY, '#cbd5e1', 0.8);
  drawDeformedLine(trunkX, sidecarY - 2.0, trunkX, sidecarY + 2.0, '#cbd5e1', 0.8);
  // Center mounting hub & chrome wing-nut clamp (Центральный барашковый зажим)
  drawDeformedCircle(trunkX, sidecarY, 1.1, '#0f172a');
  drawDeformedCircle(trunkX, sidecarY, 0.7, '#f8fafc');
  drawDeformedLine(trunkX - 1.4, sidecarY, trunkX + 1.4, sidecarY, '#f8fafc', 0.8);

  // Crossed Leather Hold-Down Retention Straps (Кожаные крепежные ремни)
  drawDeformedLine(trunkX - 3.8, sidecarY - 3.8, trunkX + 3.8, sidecarY + 3.8, '#78350f', 1.2);
  drawDeformedLine(trunkX - 3.8, sidecarY + 3.8, trunkX + 3.8, sidecarY - 3.8, '#78350f', 1.2);
  drawDeformedCircle(trunkX - 2.5, sidecarY - 2.5, 0.4, '#cbd5e1'); // Brass buckles
  drawDeformedCircle(trunkX + 2.5, sidecarY + 2.5, 0.4, '#cbd5e1');
}

/**
 * 3. ЯВА 350 / 638 «ПЕНАЛКА» (moto_jawa350)
 * Iconic Czechoslovakian 350cc twin-cylinder sports roadster in deep cherry red.
 */
export function renderMotoJawa350(vCtx: VehicleRenderContext): void {
  const {
    ctx, car, halfL, halfW, fc, rc,
    deform, drawDeformedRect, drawDeformedLine, drawDeformedCircle, nightAlpha
  } = vCtx;

  const cherryRed = car.color || '#991b1b'; // Authentic Czechoslovakian cherry red enamel

  // 1. Black Tubular Spine & Cradle Frame (Трубчатая рама Явы)
  drawDeformedLine(-halfL * 0.60, -1.6, halfL * 0.35, -1.6, '#0f172a', 2.0);
  drawDeformedLine(-halfL * 0.60, 1.6, halfL * 0.35, 1.6, '#0f172a', 2.0);

  // 2. Iconic Parallel 2-Cylinder 350cc Engine with Fan-Finned Heads (Двигатель Ява 638 с веерным оребрением)
  const engX = -halfL * 0.05;
  const engL = halfL * 0.38;
  const engW = halfW * 0.94;

  // Crankcase
  drawDeformedRect(engX - engL / 2, -engW * 0.36, engL, engW * 0.72, '#334155');
  drawDeformedRect(engX - engL * 0.35, -engW * 0.30, engL * 0.70, engW * 0.60, '#475569');

  // Cylinder barrels with characteristic wide fan-fins (Знаменитые веерные ребра охлаждения головок 638)
  [-engW / 2 + 0.4, engW / 2 - 2.4].forEach((cy, idx) => {
    drawDeformedRect(engX - engL * 0.48, cy, engL * 0.96, 2.0, '#1e293b');
    for (let fx = engX - engL * 0.42; fx <= engX + engL * 0.42; fx += 1.8) {
      drawDeformedLine(fx, cy - 0.6, fx, cy + 2.6, '#e2e8f0', 0.9);
    }
    // Spark plug with orange silicone cap (Явовский оранжевый свечной колпачок)
    const plugX = engX + (idx === 0 ? -1.0 : 1.0);
    const plugY = idx === 0 ? cy - 0.8 : cy + 2.8;
    drawDeformedCircle(plugX, plugY, 0.9, '#ea580c');
    drawDeformedCircle(plugX, plugY, 0.4, '#f8fafc');
  });

  // Dual-purpose Kickstarter / Gearshift Lever combo (Совмещенный вал кикстартера)
  drawDeformedLine(engX - 2, -engW * 0.36, engX - 4.5, -engW * 0.52, '#f8fafc', 1.2);
  drawDeformedCircle(engX - 4.5, -engW * 0.52, 0.8, '#0f172a');

  // 3. Jaunty Upswept Chrome Megaphone Mufflers (Задорно задранные вверх хромированные глушители «огурцы»)
  const silX1 = engX - engL * 0.2;
  const silX2 = -halfL + rc + 0.5;
  // Left muffler (angled upwards toward rear)
  drawDeformedLine(silX1, -halfW * 0.48, silX2, -halfW * 0.60, '#f8fafc', 2.2);
  drawDeformedLine(silX1, -halfW * 0.48, silX2, -halfW * 0.60, '#94a3b8', 1.0);
  drawDeformedCircle(silX2, -halfW * 0.60, 1.3, '#cbd5e1');
  drawDeformedCircle(silX2, -halfW * 0.60, 0.6, '#0f172a');
  // Right muffler
  drawDeformedLine(silX1, halfW * 0.48, silX2, halfW * 0.60, '#f8fafc', 2.2);
  drawDeformedLine(silX1, halfW * 0.48, silX2, halfW * 0.60, '#94a3b8', 1.0);
  drawDeformedCircle(silX2, halfW * 0.60, 1.3, '#cbd5e1');
  drawDeformedCircle(silX2, halfW * 0.60, 0.6, '#0f172a');

  // 4. Angular Sculpted Cherry-Red Fuel Tank with Chrome Flanks (Бак Явы с хромированными накладками)
  const tankX = halfL * 0.18;
  const tankL = halfL * 0.50;
  const tankW = halfW * 0.88;

  // Glossy cherry red paint
  drawDeformedRect(tankX - tankL / 2, -tankW / 2, tankL, tankW, cherryRed);
  drawDeformedLine(tankX - tankL / 2, 0, tankX + tankL / 2, 0, 'rgba(255, 255, 255, 0.5)', 1.2);

  // Polished Chrome Side Panels (Хромированные боковины бака)
  const chromeL = tankL * 0.55;
  drawDeformedRect(tankX - chromeL / 2, -tankW / 2 + 0.3, chromeL, 1.2, '#f8fafc');
  drawDeformedRect(tankX - chromeL / 2, tankW / 2 - 1.5, chromeL, 1.2, '#f8fafc');

  // Gold Oval "JAWA" Medallions (Золотистый овальный шильдик JAWA)
  drawDeformedRect(tankX - 1.8, -tankW / 2 + 0.4, 3.6, 1.0, '#fbbf24');
  drawDeformedRect(tankX - 1.8, tankW / 2 - 1.4, 3.6, 1.0, '#fbbf24');

  // Chrome Flip Fuel Cap
  drawDeformedCircle(tankX + tankL * 0.22, 0, 1.6, '#f8fafc');
  drawDeformedCircle(tankX + tankL * 0.22, 0, 0.6, '#cbd5e1');

  // 5. Stepped Sport Saddle & Iconic Plastic Ducktail Cowl ("Пенал" Явы 638)
  const seatX = -halfL * 0.24;
  const seatL = halfL * 0.52;
  const seatW = halfW * 0.80;

  // Black vinyl seat with white piping
  drawDeformedRect(seatX - seatL / 2, -seatW / 2, seatL, seatW, '#0f172a');
  drawDeformedRect(seatX - seatL / 2 + 0.5, -seatW / 2 + 0.5, seatL - 1.0, seatW - 1.0, '#1e293b');
  drawDeformedLine(seatX - seatL / 2, -seatW / 2, seatX + seatL / 2, -seatW / 2, '#ffffff', 0.8);
  drawDeformedLine(seatX - seatL / 2, seatW / 2, seatX + seatL / 2, seatW / 2, '#ffffff', 0.8);

  // Iconic Rear Plastic Fairing Tail ("Пенал")
  const tailX = -halfL * 0.62;
  const tailL = halfL * 0.32;
  const tailW = halfW * 0.76;
  drawDeformedRect(tailX - tailL / 2, -tailW / 2, tailL, tailW, cherryRed);
  drawDeformedLine(tailX - tailL / 2, 0, tailX + tailL / 2, 0, 'rgba(255, 255, 255, 0.4)', 1.0);

  // Embossed White JAWA Script on Tail
  drawDeformedRect(tailX - 1.8, -0.6, 3.6, 1.2, '#ffffff');

  // Integrated Square Tail Light on Ducktail
  const lightX = tailX - tailL / 2 - 0.8;
  drawDeformedRect(lightX - 1.2, -2.0, 1.4, 4.0, '#0f172a');
  drawDeformedRect(lightX - 0.8, -1.6, 1.0, 3.2, car.brakeLightsOn ? '#ef4444' : '#dc2626');
  if (car.brakeLightsOn) {
    drawDeformedCircle(lightX, 0, 1.6, '#fef08a');
  }

  // Chrome passenger grab handles
  drawDeformedLine(seatX - 3.0, -seatW / 2 - 0.6, seatX + 3.0, -seatW / 2 - 0.6, '#cbd5e1', 1.2);
  drawDeformedLine(seatX - 3.0, seatW / 2 + 0.6, seatX + 3.0, seatW / 2 + 0.6, '#cbd5e1', 1.2);

  // 6. Sport Instrument Pod, Rectangular Headlight & Visor (Спорт приборка и фара с козырьком)
  const forkX = halfL * 0.48;
  const barW = halfW * 1.88;

  // Front chrome telescopic fork
  [-halfW * 0.30, halfW * 0.30].forEach(fy => {
    drawDeformedLine(forkX - 1, fy, halfL * 0.70, fy, '#cbd5e1', 1.8);
    drawDeformedLine(forkX + 1, fy, forkX + 4.5, fy, '#0f172a', 2.2); // Rubber boots
  });

  // Front painted cherry-red mudguard fender
  drawDeformedRect(halfL * 0.52, -halfW * 0.26, 5.0, halfW * 0.52, cherryRed);

  // Low Sport Chrome Handlebars
  drawDeformedLine(forkX, -barW / 2 + 1.2, forkX + 0.8, 0, '#f8fafc', 2.0);
  drawDeformedLine(forkX + 0.8, 0, forkX, barW / 2 - 1.2, '#f8fafc', 2.0);
  drawDeformedRect(forkX - 3.0, -barW / 2 - 0.2, 3.0, 1.6, '#0f172a'); // Grips
  drawDeformedRect(forkX - 3.0, barW / 2 - 1.4, 3.0, 1.6, '#0f172a');
  // Alloy levers
  drawDeformedLine(forkX - 1.8, -barW / 2 + 0.4, forkX + 1.4, -barW / 2 + 2.2, '#cbd5e1', 1.2);
  drawDeformedLine(forkX - 1.8, barW / 2 - 0.4, forkX + 1.4, barW / 2 - 2.2, '#cbd5e1', 1.2);

  // Dual Round Instrument Pods (Тахометр слева, Спидометр справа)
  drawDeformedRect(forkX - 2.0, -3.4, 2.6, 6.8, '#0f172a');
  drawDeformedCircle(forkX - 0.7, -1.8, 1.3, '#334155'); // Tachometer
  drawDeformedCircle(forkX - 0.7, -1.8, 0.9, '#22c55e');
  drawDeformedCircle(forkX - 0.7, 1.8, 1.3, '#334155');  // Speedometer
  drawDeformedCircle(forkX - 0.7, 1.8, 0.9, '#38bdf8');

  // Rectangular Headlight with Black Visor Cowl (Фара с черным козырьком)
  const headX = forkX + 3.2;
  drawDeformedRect(headX - 1.0, -halfW * 0.36, 2.8, halfW * 0.72, '#0f172a'); // Black visor cowl
  drawDeformedRect(headX - 0.4, -halfW * 0.30, 2.2, halfW * 0.60, car.headlightsOn ? '#fef08a' : '#f8fafc');
  if (car.headlightsOn) {
    drawDeformedCircle(headX + 0.6, 0, 1.6, '#ffffff');
  }
}

/**
 * 4. СПОРТБАЙК 1000cc (moto_sport)
 * High-performance modern 1000cc track machine (Yamaha R1 / CBR1000RR / Ninja style).
 */
export function renderMotoSport(vCtx: VehicleRenderContext): void {
  const {
    ctx, car, halfL, halfW, fc, rc,
    deform, drawDeformedRect, drawDeformedLine, drawDeformedCircle, nightAlpha
  } = vCtx;

  const raceColor = car.color || '#2563eb'; // Factory racing blue / lime green / crimson

  // 1. Polished Aluminum Twin-Spar Perimeter Deltabox Frame (Массивная диагональная рама)
  drawDeformedLine(-halfL * 0.45, -halfW * 0.42, halfL * 0.30, -halfW * 0.32, '#cbd5e1', 2.8);
  drawDeformedLine(-halfL * 0.45, halfW * 0.42, halfL * 0.30, halfW * 0.32, '#cbd5e1', 2.8);
  drawDeformedLine(-halfL * 0.45, -halfW * 0.42, halfL * 0.30, -halfW * 0.32, '#f8fafc', 1.4);
  drawDeformedLine(-halfL * 0.45, halfW * 0.42, halfL * 0.30, halfW * 0.32, '#f8fafc', 1.4);

  // 2. High-Tech Compact 1000cc Inline-4 Engine & Radiator
  const engX = -halfL * 0.04;
  drawDeformedRect(engX - 3.5, -halfW * 0.45, 7.0, halfW * 0.90, '#1e293b');
  // Magnesium clutch/stator case covers
  drawDeformedCircle(engX, -halfW * 0.44, 1.8, '#d97706'); // Gold/bronze magnesium clutch cover
  drawDeformedCircle(engX, halfW * 0.44, 1.6, '#0f172a');

  // Curved High-Capacity Curved Racing Radiator with Dual Electric Fans
  const radX = halfL * 0.22;
  drawDeformedRect(radX - 1.2, -halfW * 0.48, 2.4, halfW * 0.96, '#0f172a');
  drawDeformedLine(radX, -halfW * 0.44, radX, halfW * 0.44, '#64748b', 1.2);

  // 3. Lightweight Titanium Header Pipes & Upswept Hexagonal Carbon Exhaust (Титановый выпуск и карбоновая банка)
  drawDeformedLine(radX - 1.0, halfW * 0.25, -halfL * 0.10, halfW * 0.48, '#3b82f6', 1.6); // Blue titanium heat temper
  // Carbon hexagonal silencer canister
  const silX1 = -halfL * 0.10;
  const silX2 = -halfL + rc + 2.5;
  drawDeformedLine(silX1, halfW * 0.48, silX2, halfW * 0.62, '#0f172a', 3.2); // Carbon weave body
  drawDeformedLine(silX1, halfW * 0.48, silX2, halfW * 0.62, '#334155', 1.8);
  drawDeformedCircle(silX2, halfW * 0.62, 1.4, '#94a3b8'); // End cap
  drawDeformedCircle(silX2, halfW * 0.62, 0.7, '#0f172a'); // Exhaust port

  // Rear Aluminum Swingarm & Gold O-Ring Drive Chain (Маятник и золотая цепь)
  drawDeformedLine(-halfL * 0.45, -halfW * 0.28, -halfL + rc + 1, -halfW * 0.28, '#cbd5e1', 2.4);
  drawDeformedLine(-halfL * 0.45, -halfW * 0.32, -halfL + rc + 1, -halfW * 0.32, '#eab308', 1.2); // Gold chain

  // 4. Muscular Sculpted Fuel Tank with Carbon Pad (Мускулистый бак с карбоновой накладкой)
  const tankX = halfL * 0.14;
  const tankL = halfL * 0.48;
  const tankW = halfW * 0.92;

  drawDeformedRect(tankX - tankL / 2, -tankW / 2, tankL, tankW, raceColor);
  // Deep knee cutout creases
  drawDeformedLine(tankX - tankL * 0.35, -tankW * 0.35, tankX + tankL * 0.35, -tankW * 0.25, 'rgba(0, 0, 0, 0.35)', 1.2);
  drawDeformedLine(tankX - tankL * 0.35, tankW * 0.35, tankX + tankL * 0.35, tankW * 0.25, 'rgba(0, 0, 0, 0.35)', 1.2);

  // Carbon Fiber Tank Protector Spine (Карбоновая наклейка на бак)
  drawDeformedLine(tankX - tankL * 0.40, 0, tankX + tankL * 0.25, 0, '#0f172a', 2.4);
  drawDeformedLine(tankX - tankL * 0.40, 0, tankX + tankL * 0.25, 0, '#334155', 1.2);

  // Quick-Release Billet Aluminum Fuel Cap (Быстросъемная крышка бака)
  drawDeformedCircle(tankX + tankL * 0.18, 0, 1.8, '#0f172a');
  drawDeformedCircle(tankX + tankL * 0.18, 0, 1.2, '#cbd5e1');

  // 5. Razor-Sharp Single-Seat Racing Tail Cowl (Острый хвост-монопосто с диффузором)
  const tailX = -halfL * 0.42;
  const tailL = halfL * 0.60;
  const tailW = halfW * 0.70;

  // Ultra-thin Alcantara Rider Pad
  drawDeformedRect(tailX + 2.0, -tailW * 0.45, 5.5, tailW * 0.90, '#0f172a');

  // Sharp Aerodynamic Single-Seat Cowl (Монопосто с аэродинамическими тоннелями)
  drawDeformedRect(tailX - tailL * 0.35, -tailW * 0.35, tailL * 0.65, tailW * 0.70, raceColor);
  drawDeformedLine(tailX - tailL * 0.35, 0, tailX + tailL * 0.30, 0, 'rgba(255, 255, 255, 0.45)', 1.2);

  // Ultra-Slim Vertical LED Taillight Strip (Узкая вертикальная полоска LED стоп-сигнала)
  const lightX = tailX - tailL * 0.35 - 0.5;
  drawDeformedRect(lightX - 1.0, -1.8, 1.2, 3.6, '#0f172a');
  drawDeformedRect(lightX - 0.6, -1.4, 0.8, 2.8, car.brakeLightsOn ? '#ef4444' : '#dc2626');
  if (car.brakeLightsOn) {
    drawDeformedCircle(lightX, 0, 1.8, '#fef08a');
  }

  // 6. Aerodynamic Fairing Nose, Smoked Bubble Screen & Ram-Air Intake
  const fX = halfL * 0.52;
  const fW = halfW * 1.82;

  // Gold-Anodized Inverted Upside-Down Front Forks (Золотые перья перевернутой вилки)
  [-halfW * 0.34, halfW * 0.34].forEach(fy => {
    drawDeformedLine(fX - 2, fy, halfL * 0.74, fy, '#eab308', 2.2);
    // Radial Brembo Monobloc Calipers (Радиальные суппорты)
    drawDeformedRect(halfL * 0.68, fy - 0.8, 2.2, 1.6, '#1e293b');
  });

  // Front Carbon Mudguard
  drawDeformedRect(halfL * 0.58, -halfW * 0.28, 4.5, halfW * 0.56, '#0f172a');

  // Aggressive Front Aerodynamic Fairing Nose (Хищный носовой обтекатель)
  drawDeformedRect(fX - 1.0, -fW * 0.45, 5.0, fW * 0.90, raceColor);

  // Smoked Acrylic Double-Bubble Windscreen (Тонированное спортивное стекло «дабл-баббл»)
  drawDeformedLine(fX - 1.0, -fW * 0.32, fX + 4.5, 0, 'rgba(15, 23, 42, 0.90)', 2.4);
  drawDeformedLine(fX + 4.5, 0, fX - 1.0, fW * 0.32, 'rgba(15, 23, 42, 0.90)', 2.4);

  // Central Ram-Air High-Pressure Intake Duct (Центральный воздухозаборник инерционного наддува)
  drawDeformedRect(fX + 3.8, -1.4, 1.6, 2.8, '#020617');

  // Predatory Slanted Dual LED Projector Headlights (Хищные раскосые светодиодные фары)
  const lampX = fX + 2.5;
  drawDeformedLine(lampX, -fW * 0.32, lampX + 2.0, -fW * 0.12, car.headlightsOn ? '#fef08a' : '#cbd5e1', 1.6);
  drawDeformedLine(lampX, fW * 0.32, lampX + 2.0, fW * 0.12, car.headlightsOn ? '#fef08a' : '#cbd5e1', 1.6);
  if (car.headlightsOn) {
    drawDeformedCircle(lampX + 1.2, -fW * 0.20, 1.2, '#ffffff');
    drawDeformedCircle(lampX + 1.2, fW * 0.20, 1.2, '#ffffff');
  }

  // Low Clip-on Handlebars under top CNC Triple Clamp (Клипоны под верхней траверсой)
  drawDeformedLine(fX - 2.5, -fW * 0.45, fX, 0, '#cbd5e1', 1.8);
  drawDeformedLine(fX, 0, fX - 2.5, fW * 0.45, '#cbd5e1', 1.8);
  drawDeformedRect(fX - 4.5, -fW * 0.45 - 0.2, 3.2, 1.6, '#0f172a'); // Rubber grips
  drawDeformedRect(fX - 4.5, fW * 0.45 - 1.4, 3.2, 1.6, '#0f172a');

  // Translucent Front Brake Fluid Cup Reservoir (Бачок тормозной жидкости)
  drawDeformedCircle(fX - 1.5, fW * 0.36, 0.9, '#fef08a');
  drawDeformedCircle(fX - 1.5, fW * 0.36, 0.5, '#f59e0b');

  // Full-Color Digital TFT Race Dashboard Display (Цветная гоночная TFT-приборка)
  drawDeformedRect(fX - 2.0, -2.5, 2.4, 5.0, '#0f172a');
  drawDeformedRect(fX - 1.6, -2.1, 1.6, 4.2, '#0284c7');
  drawDeformedLine(fX - 1.6, -1.8, fX - 1.6, 1.8, '#ef4444', 0.6); // Rev bar
}

/**
 * 5. ЧОППЕР V-TWIN CUSTOM (moto_chopper)
 * Stretched American cruiser / chopper with raked chrome front, exposed 45° V-Twin, and sissy bar.
 */
export function renderMotoChopper(vCtx: VehicleRenderContext): void {
  const {
    ctx, car, halfL, halfW, fc, rc,
    deform, drawDeformedRect, drawDeformedLine, drawDeformedCircle, nightAlpha
  } = vCtx;

  const paintColor = car.color || '#0f172a'; // Gloss midnight black / candy apple red / purple flake

  // 1. Stretched Low-Slung Custom Hardtail/Softail Frame (Низкая вытянутая рама)
  drawDeformedLine(-halfL * 0.65, -1.6, halfL * 0.28, -1.6, '#0f172a', 2.2);
  drawDeformedLine(-halfL * 0.65, 1.6, halfL * 0.28, 1.6, '#0f172a', 2.2);

  // 2. Massive 45-Degree Air-Cooled V-Twin Engine Block (Большой V-образный 2-цилиндровый мотор)
  const engX = -halfL * 0.05;
  const engL = halfL * 0.38;
  const engW = halfW * 0.88;

  // Polished Chrome Crankcase & Primary Drive Cover (Хромированный картер и первичная передача слева)
  drawDeformedRect(engX - engL / 2, -engW * 0.40, engL, engW * 0.80, '#cbd5e1');
  drawDeformedRect(engX - engL * 0.40, -engW * 0.44, engL * 0.80, 2.0, '#f8fafc'); // Chrome primary case
  drawDeformedCircle(engX, -engW * 0.44 + 1.0, 1.4, '#e2e8f0'); // Derby cover

  // Twin V-Angle Cylinders with Chrome Rocker Boxes & Pushrod Tubes (V-образные цилиндры с хромированными трубками штанг)
  // Front Cylinder (Наклонен вперед)
  drawDeformedRect(engX + 1.5, -engW * 0.30, 4.2, engW * 0.60, '#1e293b');
  drawDeformedRect(engX + 1.8, -engW * 0.32, 3.6, engW * 0.64, '#f8fafc'); // Chrome rocker box
  // Rear Cylinder (Наклонен назад)
  drawDeformedRect(engX - 5.5, -engW * 0.30, 4.2, engW * 0.60, '#1e293b');
  drawDeformedRect(engX - 5.2, -engW * 0.32, 3.6, engW * 0.64, '#f8fafc'); // Chrome rocker box

  // Polished Chrome Pushrod Tubes on right side (Хромированные трубки штанг толкателей)
  drawDeformedLine(engX + 2.0, engW * 0.28, engX + 4.5, engW * 0.28, '#ffffff', 1.2);
  drawDeformedLine(engX - 5.0, engW * 0.28, engX - 2.5, engW * 0.28, '#ffffff', 1.2);

  // Round High-Flow Chrome Air Cleaner Intake (Круглый хромированный воздушный фильтр справа)
  drawDeformedCircle(engX - 0.5, engW * 0.44, 2.2, '#0f172a');
  drawDeformedCircle(engX - 0.5, engW * 0.44, 1.8, '#f8fafc');
  drawDeformedCircle(engX - 0.5, engW * 0.44, 0.8, '#cbd5e1');

  // 3. Staggered Dual Straight-Cut Chrome Drag Pipes (Ступенчатые хромированные прямотоки справа)
  const pipeX1 = engX + 2;
  const pipeX2 = -halfL + rc - 1.0;
  // Upper pipe
  drawDeformedLine(pipeX1, engW * 0.48, pipeX2, engW * 0.48, '#f8fafc', 1.8);
  drawDeformedCircle(pipeX2, engW * 0.48, 0.9, '#0f172a');
  // Lower pipe (staggered slightly longer)
  drawDeformedLine(pipeX1 - 6, engW * 0.58, pipeX2 - 2.5, engW * 0.58, '#f8fafc', 1.8);
  drawDeformedCircle(pipeX2 - 2.5, engW * 0.58, 0.9, '#0f172a');

  // Forward Foot Controls & Chrome Pegs (Вынесенные вперед подножки и рычаги)
  const pegX = engX + engL * 0.65;
  drawDeformedLine(pegX, -halfW * 0.82, pegX, halfW * 0.82, '#cbd5e1', 1.4);
  drawDeformedRect(pegX - 1.2, -halfW * 0.85, 2.4, 1.6, '#0f172a');
  drawDeformedRect(pegX - 1.2, halfW * 0.85 - 1.6, 2.4, 1.6, '#0f172a');

  // 4. Stretched Teardrop "Peanut" Custom Gas Tank (Вытянутый каплевидный бак «Peanut»)
  const tankX = halfL * 0.12;
  const tankL = halfL * 0.52;
  const tankW = halfW * 0.78;

  drawDeformedRect(tankX - tankL / 2, -tankW / 2, tankL, tankW, paintColor);
  // Metallic pinstripe graphics
  drawDeformedLine(tankX - tankL / 2 + 2, -tankW * 0.25, tankX + tankL / 2 - 1, -tankW * 0.15, '#fbbf24', 0.8);
  drawDeformedLine(tankX - tankL / 2 + 2, tankW * 0.25, tankX + tankL / 2 - 1, tankW * 0.15, '#fbbf24', 0.8);
  drawDeformedLine(tankX - tankL / 2, 0, tankX + tankL / 2, 0, 'rgba(255, 255, 255, 0.4)', 1.0);

  // Chrome Teardrop Dash Console & Pop-up Gas Cap (Хромированная консоль на баке)
  drawDeformedRect(tankX - 2.5, -1.2, 5.0, 2.4, '#f8fafc');
  drawDeformedCircle(tankX + 1.2, 0, 1.2, '#cbd5e1'); // Speedometer
  drawDeformedCircle(tankX - 1.5, 0, 0.9, '#f8fafc'); // Flush gas cap

  // 5. Deep-Dish Solo Saddle & Bobbed Rear Fender (Глубокое кожаное седло-ковш и боббер-крыло)
  const seatX = -halfL * 0.28;
  const seatL = halfL * 0.48;
  const seatW = halfW * 0.72;

  // Sculpted brown/black leather seat with diamond stitching (Стеганое кожаное седло)
  drawDeformedRect(seatX - seatL / 2, -seatW / 2, seatL, seatW, '#3e2723'); // Rich dark leather
  drawDeformedLine(seatX - seatL / 2 + 1, -seatW / 2 + 1, seatX + seatL / 2 - 1, seatW / 2 - 1, '#78350f', 0.8);
  drawDeformedLine(seatX - seatL / 2 + 1, seatW / 2 - 1, seatX + seatL / 2 - 1, -seatW / 2 + 1, '#78350f', 0.8);
  // Brass rivets (Латунные клепки по контуру)
  drawDeformedCircle(seatX - seatL / 2 + 1, 0, 0.5, '#fbbf24');
  drawDeformedCircle(seatX + seatL / 2 - 1, 0, 0.5, '#fbbf24');

  // Bobbed Rear Fender hugging fat rear tire (Укороченное крыло-боббер)
  const rearFenderX = -halfL + rc + 0.5;
  drawDeformedRect(rearFenderX - 2.0, -halfW * 0.38, 4.0, halfW * 0.76, paintColor);

  // Tall Chrome Sissy Bar Arch (Высокая хромированная спинка «Sissy Bar»)
  const sissyX = rearFenderX - 2.5;
  drawDeformedLine(sissyX, -halfW * 0.32, sissyX - 2.5, 0, '#f8fafc', 1.8);
  drawDeformedLine(sissyX - 2.5, 0, sissyX, halfW * 0.32, '#f8fafc', 1.8);

  // Minimalist LED Stop Light
  drawDeformedCircle(sissyX - 2.0, 0, 1.2, car.brakeLightsOn ? '#ef4444' : '#dc2626');
  if (car.brakeLightsOn) {
    drawDeformedCircle(sissyX - 2.0, 0, 0.6, '#fef08a');
  }

  // 6. Extended Raked Forks & Tall Ape-Hanger Handlebars (Выдвинутая вилка 38° и руль Ape-Hanger)
  const forkBaseX = halfL * 0.40;
  const forkTipX = halfL * 0.88;
  const barW = halfW * 2.10;

  // Extended Polished Chrome Telescopic Forks (Длинные хромированные перья)
  [-halfW * 0.22, halfW * 0.22].forEach(fy => {
    drawDeformedLine(forkBaseX, fy, forkTipX, fy, '#f8fafc', 2.0);
    drawDeformedLine(forkBaseX, fy, forkTipX, fy, '#cbd5e1', 1.0);
  });

  // Tall Ape-Hanger Handlebars (Высокий руль Эйп-Хэнгер)
  drawDeformedLine(forkBaseX + 1.0, -barW / 2 + 2.0, forkBaseX + 2.5, 0, '#f8fafc', 2.2);
  drawDeformedLine(forkBaseX + 2.5, 0, forkBaseX + 1.0, barW / 2 - 2.0, '#f8fafc', 2.2);
  // Diamond-stitched leather grips
  drawDeformedRect(forkBaseX - 1.5, -barW / 2 - 0.2, 3.2, 1.8, '#3e2723');
  drawDeformedRect(forkBaseX - 1.5, barW / 2 - 1.6, 3.2, 1.8, '#3e2723');
  // Chrome lever blades
  drawDeformedLine(forkBaseX, -barW / 2 + 0.5, forkBaseX + 3.0, -barW / 2 + 2.5, '#f8fafc', 1.2);
  drawDeformedLine(forkBaseX, barW / 2 - 0.5, forkBaseX + 3.0, barW / 2 - 2.5, '#f8fafc', 1.2);

  // Chrome Teardrop Mirrors
  drawDeformedCircle(forkBaseX + 3.2, -barW * 0.45, 1.4, '#f8fafc');
  drawDeformedCircle(forkBaseX + 3.2, barW * 0.45, 1.4, '#f8fafc');

  // Bullet-Shaped Chrome Custom Headlight (Фара-пуля с хромированным корпусом)
  const headX = forkBaseX + 4.5;
  drawDeformedCircle(headX, 0, 2.4, '#0f172a');
  drawDeformedCircle(headX, 0, 2.0, '#f8fafc');
  drawDeformedCircle(headX + 0.6, 0, 1.5, car.headlightsOn ? '#fef08a' : '#ffffff');
  if (car.headlightsOn) {
    drawDeformedCircle(headX + 0.6, 0, 0.8, '#ffffff');
  }
}

/**
 * 6. СОВЕТСКИЙ МОПЕД «КАРПАТЫ-2» / «РИГА-13» (moped_soviet)
 * Lightweight Soviet 50cc moped with stamped spine frame, V-50 engine and luggage rack.
 */
export function renderMopedSoviet(vCtx: VehicleRenderContext): void {
  const {
    ctx, car, halfL, halfW, fc, rc,
    deform, drawDeformedRect, drawDeformedLine, drawDeformedCircle, nightAlpha
  } = vCtx;

  const mopedColor = car.color || '#ea580c'; // Vintage Soviet bright orange / cherry red

  // 1. Stamped-Steel Central Spine Frame (Штампованная хребтовая рама)
  drawDeformedLine(-halfL * 0.55, 0, halfL * 0.38, 0, '#0f172a', 2.8);
  drawDeformedLine(-halfL * 0.55, 0, halfL * 0.38, 0, mopedColor, 1.6);

  // 2. Compact 50cc 2-Stroke Engine (Двигатель V-50 / Ш-58)
  const engX = -halfL * 0.05;
  drawDeformedRect(engX - 2.5, -halfW * 0.35, 5.0, halfW * 0.70, '#475569');
  // Magneto cover on left, clutch cover on right
  drawDeformedCircle(engX, -halfW * 0.32, 1.4, '#64748b');
  drawDeformedCircle(engX, halfW * 0.32, 1.4, '#64748b');
  // Spark plug with black cap
  drawDeformedCircle(engX + 1.5, 0, 0.7, '#0f172a');

  // Slender Chrome Exhaust Pipe on Right (Тонкая хромированная выхлопная труба)
  const exX1 = engX + 1;
  const exX2 = -halfL + rc + 1;
  drawDeformedLine(exX1, halfW * 0.40, exX2, halfW * 0.40, '#f8fafc', 1.4);
  drawDeformedCircle(exX2, halfW * 0.40, 0.7, '#0f172a');

  // Pedals or Kickstart Lever
  drawDeformedLine(engX, -halfW * 0.65, engX, halfW * 0.65, '#cbd5e1', 1.2);
  drawDeformedRect(engX - 1.2, -halfW * 0.75, 2.4, 1.2, '#0f172a');
  drawDeformedRect(engX - 1.2, halfW * 0.75 - 1.2, 2.4, 1.2, '#0f172a');

  // 3. Compact Steel Fuel Tank with Soviet Decals (Компактный бензобак с наклейками)
  const tankX = halfL * 0.16;
  const tankL = halfL * 0.45;
  const tankW = halfW * 0.78;

  drawDeformedRect(tankX - tankL / 2, -tankW / 2, tankL, tankW, mopedColor);
  drawDeformedLine(tankX - tankL / 2, 0, tankX + tankL / 2, 0, 'rgba(255, 255, 255, 0.45)', 1.0);
  // White/Black Decal Stripe
  drawDeformedLine(tankX - tankL * 0.35, -tankW * 0.25, tankX + tankL * 0.35, -tankW * 0.25, '#ffffff', 0.6);
  drawDeformedLine(tankX - tankL * 0.35, tankW * 0.25, tankX + tankL * 0.35, tankW * 0.25, '#ffffff', 0.6);

  // Chrome Screw-On Cap
  drawDeformedCircle(tankX + tankL * 0.20, 0, 1.2, '#f8fafc');
  drawDeformedCircle(tankX + tankL * 0.20, 0, 0.5, '#0f172a');

  // 4. Moped Vinyl Saddle (Мягкое седло мопеда)
  const seatX = -halfL * 0.25;
  const seatL = halfL * 0.45;
  const seatW = halfW * 0.70;

  drawDeformedRect(seatX - seatL / 2, -seatW / 2, seatL, seatW, '#0f172a');
  drawDeformedRect(seatX - seatL / 2 + 0.4, -seatW / 2 + 0.4, seatL - 0.8, seatW - 0.8, '#1e293b');

  // 5. Tubular Steel Rear Luggage Rack with Spring Trap (Задний багажник из стальных прутьев)
  const rackX = -halfL * 0.60;
  const rackL = halfL * 0.32;
  const rackW = halfW * 0.65;

  drawDeformedRect(rackX - rackL / 2, -rackW / 2, rackL, rackW, '#cbd5e1');
  drawDeformedRect(rackX - rackL / 2 + 0.6, -rackW / 2 + 0.6, rackL - 1.2, rackW - 1.2, 'rgba(0,0,0,0.15)');
  drawDeformedLine(rackX - rackL / 2, 0, rackX + rackL / 2, 0, '#94a3b8', 1.0); // Center bar
  drawDeformedLine(rackX, -rackW / 2, rackX, rackW / 2, '#475569', 1.2); // Spring cargo clamp

  // Rear Small Mudguard Fender & Red Round Taillight (Фонарик ФП-226)
  const rearFenderX = -halfL + rc + 0.8;
  drawDeformedRect(rearFenderX - 2.0, -halfW * 0.22, 3.5, halfW * 0.44, mopedColor);
  drawDeformedCircle(rearFenderX - 1.2, 0, 1.0, car.brakeLightsOn ? '#ef4444' : '#dc2626');

  // 6. High Tubular Handlebars with Crossbar, Speedometer & Chrome Headlight (Руль с перемычкой и фара)
  const forkX = halfL * 0.45;
  const barW = halfW * 1.85;

  // Thin Telescopic Fork Legs
  [-halfW * 0.22, halfW * 0.22].forEach(fy => {
    drawDeformedLine(forkX - 1, fy, halfL * 0.65, fy, '#cbd5e1', 1.4);
  });

  // Front Mudguard Fender
  drawDeformedRect(halfL * 0.50, -halfW * 0.20, 4.0, halfW * 0.40, mopedColor);

  // High Moped Handlebars with Crossbar (Руль с перемычкой)
  drawDeformedLine(forkX, -barW / 2 + 1.0, forkX + 0.5, 0, '#f8fafc', 1.8);
  drawDeformedLine(forkX + 0.5, 0, forkX, barW / 2 - 1.0, '#f8fafc', 1.8);
  drawDeformedLine(forkX - 0.5, -barW * 0.32, forkX - 0.5, barW * 0.32, '#cbd5e1', 1.0); // Crossbar brace
  // Black Grips & Levers
  drawDeformedRect(forkX - 2.6, -barW / 2 - 0.2, 2.6, 1.4, '#0f172a');
  drawDeformedRect(forkX - 2.6, barW / 2 - 1.2, 2.6, 1.4, '#0f172a');
  drawDeformedLine(forkX - 1.5, -barW / 2 + 0.3, forkX + 1.0, -barW / 2 + 1.8, '#cbd5e1', 1.0);
  drawDeformedLine(forkX - 1.5, barW / 2 - 0.3, forkX + 1.0, barW / 2 - 1.8, '#cbd5e1', 1.0);

  // Round Small Chrome Headlight & SP-101 Speedometer (Круглая фары и спидометр СП-101)
  const headX = forkX + 2.8;
  drawDeformedCircle(headX, 0, 2.0, '#0f172a');
  drawDeformedCircle(headX, 0, 1.6, '#cbd5e1');
  drawDeformedCircle(headX + 0.4, 0, 1.2, car.headlightsOn ? '#fef08a' : '#f8fafc');
  if (car.headlightsOn) {
    drawDeformedCircle(headX + 0.4, 0, 0.6, '#ffffff');
  }

  // Small round speedometer
  drawDeformedCircle(forkX - 1.2, 0, 1.0, '#0f172a');
  drawDeformedCircle(forkX - 1.2, 0, 0.7, '#38bdf8');
}
