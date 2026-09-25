// --- ULTRA-REALISTIC ROLLING STOCK RENDERER (STRICT TOP-DOWN ORTHOGONAL PROJECTION) ---
// High-fidelity vector graphics for Soviet and Russian Railways (РЖД / СЖД):
// 1. ТЭП70БС — Магистральный пассажирский тепловоз (Коломенский завод) с обтекаемыми кабинами и шахтой холодильника
// 2. ВЛ80С — Грузовой магистральный электровоз переменного тока с пантографами Т-5М1 и высоковольтным оборудованием 25 кВ
// 3. ЧМЭ3 — Маневровый тепловоз ЧКД Прага капотного типа с наружными палубами, перилами и выступающей кабиной
// 4. Вагон ТВЗ 61-4440/61-4447 — Цельнометаллический пассажирский вагон с гофрированной крышей, кондиционерами УКВ и суфле
// 5. Полувагон 12-132 — Четырехосный открытый полувагон со стойками кузова и насыпным грузом (щебень / уголь)
// 6. Цистерна 15-1443 — 4-осная нефтеналивная цистерна с эллиптическими днищами, заливной горловиной, трапом и хомутами
// 7. Платформа 13-4012 — Лесовозная платформа с торцевыми щитами, стойками-кониками и штабелем круглого леса

import { GameWorld, RollingStockCar } from './types';

export class RollingStockRenderer {
  /**
   * Main entry point for rendering all rolling stock in the viewport.
   */
  public static renderRollingStock(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    nightAlpha: number
  ): void {
    const cars = world.rollingStock;
    if (!cars || cars.length === 0) return;

    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      const maxDim = Math.max(car.length, car.width) * 1.5;
      if (car.x + maxDim < minX || car.x - maxDim > maxX || car.y + maxDim < minY || car.y - maxDim > maxY) {
        continue;
      }

      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);

      const halfL = car.length / 2;
      const halfW = car.width / 2;

      // 1. Realistic Deep Drop Shadow onto ballast bed and rails
      this.renderDropShadow(ctx, car, halfL, halfW);

      // 2. Wheel Bogies (18-100 and passenger 2-axle / 3-axle bogies underneath)
      this.renderBogies(ctx, car, halfL, halfW);

      // 3. Automatic Couplers SA-3, Uncoupling Levers & Air Brake Hoses
      this.renderCouplersAndBrakePipes(ctx, car, halfL, halfW);

      // 4. Car / Locomotive Body (Strict Top-Down Orthogonal View)
      const type = car.type || '';
      if (type === 'locomotive_diesel' || type === 'locomotive_passenger' || type.includes('tep70')) {
        this.renderTEP70BS(ctx, car, halfL, halfW, nightAlpha);
      } else if (type === 'locomotive_electric_vl80' || type.includes('vl80')) {
        this.renderVL80S(ctx, car, halfL, halfW, nightAlpha);
      } else if (type === 'locomotive_diesel_chme3' || type === 'locomotive_shunter' || type.includes('chme3')) {
        this.renderCHME3(ctx, car, halfL, halfW, nightAlpha);
      } else if (type.startsWith('passenger_')) {
        this.renderPassengerCoachRZHD(ctx, car, halfL, halfW, nightAlpha);
      } else if (type === 'freight_hopper' || type.includes('hopper') || type.includes('gondola')) {
        this.renderFreightHopper(ctx, car, halfL, halfW, nightAlpha);
      } else if (type === 'freight_tanker' || type.includes('tanker')) {
        this.renderFreightTanker(ctx, car, halfL, halfW, nightAlpha);
      } else if (type === 'freight_flatcar_timber' || type.includes('timber') || type.includes('flatcar')) {
        this.renderFreightFlatcarTimber(ctx, car, halfL, halfW, nightAlpha);
      } else {
        // Universal freight fallback with authentic detailing
        this.renderFreightHopper(ctx, car, halfL, halfW, nightAlpha);
      }

      ctx.restore();
    }
  }

  // =========================================================================
  // --- 1. DROP SHADOW & UNDER-FRAME ---
  // =========================================================================

  private static renderDropShadow(
    ctx: CanvasRenderingContext2D,
    car: RollingStockCar,
    halfL: number,
    halfW: number
  ): void {
    ctx.save();
    // Soft ambient occlusion contact shadow directly under wheels and car body
    ctx.fillStyle = 'rgba(5, 7, 12, 0.65)';
    ctx.beginPath();
    ctx.roundRect(-halfL - 4, -halfW - 3, car.length + 8, car.width + 6, 4);
    ctx.fill();

    // Darker core shadow under central machinery
    ctx.fillStyle = 'rgba(2, 3, 6, 0.45)';
    ctx.beginPath();
    ctx.roundRect(-halfL + 12, -halfW + 1, car.length - 24, car.width - 2, 2);
    ctx.fill();
    ctx.restore();
  }

  // =========================================================================
  // --- 2. WHEEL BOGIES (ТЕЛЕЖКИ ТИПА 18-100 И ПАССАЖИРСКИЕ 3-ОСНЫЕ) ---
  // =========================================================================

  private static renderBogies(
    ctx: CanvasRenderingContext2D,
    car: RollingStockCar,
    halfL: number,
    halfW: number
  ): void {
    const is3Axle = car.type === 'locomotive_diesel' || car.type.includes('tep70');
    const bogieDist = halfL * (is3Axle ? 0.62 : 0.68);
    const bogiePositions = [-bogieDist, bogieDist];
    const railG = 17; // Half-gauge of 34 px (1520 mm Russian Broad Gauge)

    ctx.save();

    for (const bx of bogiePositions) {
      if (is3Axle) {
        // --- 3-AXLE PASSENGER BOGIE (ТРЕХОСНАЯ БЕСЧЕЛЮСТНАЯ ТЕЛЕЖКА ТЭП70БС) ---
        const bLen = 64;
        const bW = railG * 2 + 10;

        // Cast Steel Side Frame & Subframe
        ctx.fillStyle = '#181a1f';
        ctx.fillRect(bx - bLen / 2, -bW / 2, bLen, bW);

        // Bolster cross-members
        ctx.fillStyle = '#22252a';
        ctx.fillRect(bx - 12, -railG - 3, 24, (railG + 3) * 2);

        // 3 Axle Shafts & Wheel sets
        const axleOffsets = [-20, 0, 20];
        for (const axOff of axleOffsets) {
          const ax = bx + axOff;

          // Steel axle shaft
          ctx.fillStyle = '#334155';
          ctx.fillRect(ax - 2.0, -railG + 1, 4.0, (railG - 1) * 2);

          // Wheels (flange + running surface)
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(ax - 7, -railG - 3.5, 14, 5.0);
          ctx.fillRect(ax - 7, railG - 1.5, 14, 5.0);

          // Mirror polished tread on rail head
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(ax - 5.5, -railG - 1.0, 11, 2.0);
          ctx.fillRect(ax - 5.5, railG - 1.0, 11, 2.0);

          // Axle box journal caps (буксы)
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.arc(ax, -railG - 4.5, 2.4, 0, Math.PI * 2);
          ctx.arc(ax, railG + 4.5, 2.4, 0, Math.PI * 2);
          ctx.fill();

          // Brake blocks / shoes (тормозные колодки)
          ctx.fillStyle = '#475569';
          ctx.fillRect(ax - 8.5, -railG - 2.8, 1.8, 3.6);
          ctx.fillRect(ax + 6.7, -railG - 2.8, 1.8, 3.6);
          ctx.fillRect(ax - 8.5, railG - 0.8, 1.8, 3.6);
          ctx.fillRect(ax + 6.7, railG - 0.8, 1.8, 3.6);
        }

        // Hydraulic dampers / shock absorbers on side frame
        ctx.fillStyle = '#0891b2';
        ctx.fillRect(bx - 16, -railG - 5.0, 6, 1.8);
        ctx.fillRect(bx + 10, -railG - 5.0, 6, 1.8);
        ctx.fillRect(bx - 16, railG + 3.2, 6, 1.8);
        ctx.fillRect(bx + 10, railG + 3.2, 6, 1.8);

      } else {
        // --- 2-AXLE FREIGHT/PASSENGER BOGIE (ТЕЛЕЖКА 18-100 / КВЗ-ЦНИИ) ---
        const bLen = 42;
        const bW = railG * 2 + 10;

        // Cast side frames (литые боковые рамы с технологическими окнами)
        ctx.fillStyle = '#181b20';
        ctx.fillRect(bx - bLen / 2, -bW / 2, bLen, bW);

        // Center bolster beam & center pivot (надрессорная балка и подпятник)
        ctx.fillStyle = '#272b33';
        ctx.fillRect(bx - 6, -railG - 4, 12, (railG + 4) * 2);
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(bx, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // 2 Axle sets
        const axleOffsets = [-12.5, 12.5];
        for (const axOff of axleOffsets) {
          const ax = bx + axOff;

          // Axle shaft
          ctx.fillStyle = '#334155';
          ctx.fillRect(ax - 1.8, -railG + 1, 3.6, (railG - 1) * 2);

          // Wheel rim and wheel tyre
          ctx.fillStyle = '#334155';
          ctx.fillRect(ax - 6.5, -railG - 3.2, 13, 4.8);
          ctx.fillRect(ax - 6.5, railG - 1.6, 13, 4.8);

          // Specular mirror rail polish
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(ax - 5.0, -railG - 0.8, 10, 1.8);
          ctx.fillRect(ax - 5.0, railG - 1.0, 10, 1.8);

          // Axle box journal caps (буксовый узел)
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.arc(ax, -railG - 4.5, 2.2, 0, Math.PI * 2);
          ctx.arc(ax, railG + 4.5, 2.2, 0, Math.PI * 2);
          ctx.fill();

          // Brake shoes
          ctx.fillStyle = '#64748b';
          ctx.fillRect(ax - 8, -railG - 2.5, 1.8, 3.4);
          ctx.fillRect(ax + 6.2, -railG - 2.5, 1.8, 3.4);
          ctx.fillRect(ax - 8, railG - 0.9, 1.8, 3.4);
          ctx.fillRect(ax + 6.2, railG - 0.9, 1.8, 3.4);
        }

        // Dual coil spring nests (пружинные комплекты)
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(bx - 3.5, -railG - 4.8, 7.0, 1.6);
        ctx.fillRect(bx - 3.5, railG + 3.2, 7.0, 1.6);
      }
    }

    ctx.restore();
  }

  // =========================================================================
  // --- 3. COUPLERS (АВТОСЦЕПКИ СА-3), UNCOUPLING LEVER & BRAKE HOSES ---
  // =========================================================================

  private static renderCouplersAndBrakePipes(
    ctx: CanvasRenderingContext2D,
    car: RollingStockCar,
    halfL: number,
    halfW: number
  ): void {
    ctx.save();

    const ends = [-1, 1]; // -1 = Rear (-X), +1 = Front (+X)
    for (const dir of ends) {
      const edgeX = dir * halfL;

      // Heavy End Buffer Beam / Pilot Sill (концевая балка рамы)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(edgeX - (dir > 0 ? 3 : 0), -halfW * 0.75, 3, halfW * 1.5);

      // Coupler Striker Casting & Pocket (ударная розетка автосцепки)
      ctx.fillStyle = '#0f172a';
      const pocketX = dir > 0 ? edgeX - 1 : edgeX - 6;
      ctx.fillRect(pocketX, -5.0, 7.0, 10.0);

      // SA-3 Coupler Shank (хвостовик автосцепки)
      ctx.fillStyle = '#334155';
      const shankX = dir > 0 ? edgeX + 2 : edgeX - 8;
      ctx.fillRect(shankX, -3.2, 6.0, 6.4);

      // SA-3 Coupler Head (голова автосцепки СА-3 с большим и малым зубом)
      const headX = dir > 0 ? edgeX + 7 : edgeX - 12;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      if (dir > 0) {
        ctx.moveTo(headX, -4.5);
        ctx.lineTo(headX + 5.5, -3.0); // Big knuckle
        ctx.lineTo(headX + 5.0, 3.5);  // Guard arm
        ctx.lineTo(headX + 1.0, 4.5);  // Small knuckle
        ctx.lineTo(headX - 1.0, 2.5);
      } else {
        ctx.moveTo(headX + 5.0, -4.5);
        ctx.lineTo(headX - 0.5, -3.0);
        ctx.lineTo(headX, 3.5);
        ctx.lineTo(headX + 4.0, 4.5);
        ctx.lineTo(headX + 6.0, 2.5);
      }
      ctx.closePath();
      ctx.fill();

      // Steel highlight on coupler jaw contour
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Uncoupling lever (расцепной рычаг)
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(edgeX, 0);
      ctx.lineTo(edgeX, dir > 0 ? -halfW * 0.7 : halfW * 0.7);
      ctx.stroke();

      // Flexible Air Brake Hose with shut-off angle cock (тормозной рукав концевого крана)
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const hoseStartY = dir > 0 ? 5.5 : -5.5;
      ctx.moveTo(edgeX, hoseStartY);
      ctx.quadraticCurveTo(edgeX + dir * 6, hoseStartY + 2, edgeX + dir * 8, hoseStartY - 1);
      ctx.stroke();

      // Red angle cock valve handle (концевой кран)
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(edgeX + dir * 1.5, hoseStartY, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // End-of-train marker disc (красный хвостовой диск со светоотражателем на концевом вагоне)
      if (car.carIndex !== undefined && car.carIndex === 0 && dir < 0) {
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(edgeX - 1.5, 7.5, 3.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(edgeX - 1.5, 7.5, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // =========================================================================
  // --- 4. ТЭП70БС — МАГИСТРАЛЬНЫЙ ПАССАЖИРСКИЙ ТЕПЛОВОЗ ---
  // =========================================================================

  private static renderTEP70BS(
    ctx: CanvasRenderingContext2D,
    car: RollingStockCar,
    halfL: number,
    halfW: number,
    nightAlpha: number
  ): void {
    ctx.save();

    // 1. Aerodynamic Tapered Silhouette of TEP70BS
    // Front and Rear cabs have distinct beveled chamfers and rounded nose
    const noseL = 26; // Length of aerodynamic tapered cab section
    const taperW = halfW - 7;

    // Body Outline Path (aerodynamically shaped)
    ctx.beginPath();
    // Start at front nose center
    ctx.moveTo(halfL, -halfW + 10);
    ctx.lineTo(halfL - 6, -halfW + 3);
    ctx.lineTo(halfL - noseL, -halfW);
    // Upper body side to rear
    ctx.lineTo(-halfL + noseL, -halfW);
    ctx.lineTo(-halfL + 6, -halfW + 3);
    ctx.lineTo(-halfL, -halfW + 10);
    // Rear nose bottom
    ctx.lineTo(-halfL, halfW - 10);
    ctx.lineTo(-halfL + 6, halfW - 3);
    ctx.lineTo(-halfL + noseL, halfW);
    // Lower body side to front
    ctx.lineTo(halfL - noseL, halfW);
    ctx.lineTo(halfL - 6, halfW - 3);
    ctx.lineTo(halfL, halfW - 10);
    ctx.closePath();

    // Body Base Fill (Modern Russian Railways RZD PID Crimson & Slate)
    const baseGrad = ctx.createLinearGradient(0, -halfW, 0, halfW);
    baseGrad.addColorStop(0, '#7f1d1d');
    baseGrad.addColorStop(0.15, '#b91c1c');
    baseGrad.addColorStop(0.35, '#dc2626');
    baseGrad.addColorStop(0.65, '#dc2626');
    baseGrad.addColorStop(0.85, '#b91c1c');
    baseGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = baseGrad;
    ctx.fill();

    // 2. Lateral Bevel Shadows & Highlights (Curved Roof Arc)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // 3. Central Graphite Roof Cladding
    const roofL = car.length - noseL * 2;
    const roofW = car.width - 12;
    const roofHalfW = roofW / 2;

    const roofGrad = ctx.createLinearGradient(0, -roofHalfW, 0, roofHalfW);
    roofGrad.addColorStop(0, '#1e2430');
    roofGrad.addColorStop(0.2, '#334155');
    roofGrad.addColorStop(0.5, '#475569');
    roofGrad.addColorStop(0.8, '#334155');
    roofGrad.addColorStop(1, '#1e2430');

    ctx.fillStyle = roofGrad;
    ctx.beginPath();
    ctx.roundRect(-roofL / 2, -roofHalfW, roofL, roofW, 4);
    ctx.fill();

    // Roof Hatch Joints (модульные съемные секции крыши дизеля)
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.lineWidth = 1.0;
    const hatchXs = [-roofL * 0.35, -roofL * 0.1, roofL * 0.15, roofL * 0.35];
    for (const hx of hatchXs) {
      ctx.beginPath();
      ctx.moveTo(hx, -roofHalfW);
      ctx.lineTo(hx, roofHalfW);
      ctx.stroke();
    }

    // 4. Radiator Cooling Compartment (Шахта холодильника с 4 вентиляторами)
    // Located towards front/center
    const fanStartX = -15;
    const fanSpacing = 24;
    for (let f = 0; f < 4; f++) {
      const fx = fanStartX + f * fanSpacing;

      // Dark Fan Well Recess
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(fx, 0, 8.5, 0, Math.PI * 2);
      ctx.fill();

      // Axial Impeller Blades inside
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(fx - 7, 0); ctx.lineTo(fx + 7, 0);
      ctx.moveTo(fx, -7); ctx.lineTo(fx, 7);
      ctx.moveTo(fx - 5, -5); ctx.lineTo(fx + 5, 5);
      ctx.moveTo(fx + 5, -5); ctx.lineTo(fx - 5, 5);
      ctx.stroke();

      // Central Fan Hub
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(fx, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Stainless Protective Mesh Outer Ring
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(fx, 0, 8.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. Diesel Exhaust Silencer Stack (Выхлопной коллектор дизеля 2А-5Д49)
    const exhaustX = -halfL * 0.35;
    // Soot Deposition Halo on Roof
    const sootGrad = ctx.createRadialGradient(exhaustX, 0, 3, exhaustX, 0, 18);
    sootGrad.addColorStop(0, 'rgba(15, 23, 42, 0.85)');
    sootGrad.addColorStop(0.5, 'rgba(30, 41, 59, 0.4)');
    sootGrad.addColorStop(1, 'rgba(30, 41, 59, 0)');
    ctx.fillStyle = sootGrad;
    ctx.beginPath();
    ctx.arc(exhaustX, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    // Twin Exhaust Ports
    ctx.fillStyle = '#090d16';
    ctx.fillRect(exhaustX - 8, -4.5, 16, 9.0);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(exhaustX - 8, -4.5, 16, 9.0);

    // Dynamic brake resistor grid louvers
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.lineWidth = 0.8;
    for (let lx = exhaustX + 16; lx < exhaustX + 38; lx += 3.5) {
      ctx.beginPath();
      ctx.moveTo(lx, -12); ctx.lineTo(lx, 12);
      ctx.stroke();
    }

    // 6. Aerodynamic Driver Cabs (Cab 1 Front & Cab 2 Rear)
    this.renderTEP70Cab(ctx, halfL, halfW, 1, nightAlpha);
    this.renderTEP70Cab(ctx, halfL, halfW, -1, nightAlpha);

    // 7. RZD PID Corporate Branding & Road Number Stencil
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 6.5px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(car.roadNumber || 'ТЭП70БС-0245', 15, -halfW + 4.5);
    ctx.fillText(car.roadNumber || 'ТЭП70БС-0245', 15, halfW - 4.5);

    // Kolomna Locomotive Works plate (Заводская табличка)
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-8, -halfW + 3.2, 16, 2.4);
    ctx.fillRect(-8, halfW - 5.6, 16, 2.4);

    // 8. Forward Headlight & Searchlight Beam
    this.renderLocomotiveLighting(ctx, halfL, halfW, 1, nightAlpha, car.speed || 0);

    ctx.restore();
  }

  private static renderTEP70Cab(
    ctx: CanvasRenderingContext2D,
    halfL: number,
    halfW: number,
    dir: 1 | -1,
    nightAlpha: number
  ): void {
    ctx.save();
    const cx = dir * (halfL - 14);

    // Slanted Front Windshield (триплекс лобового остекления с обогревом)
    const glassX = dir > 0 ? halfL - 10 : -halfL + 6;
    const glassW = 5.0;
    ctx.fillStyle = nightAlpha > 0.3 ? '#0369a1' : '#0284c7';
    ctx.beginPath();
    ctx.roundRect(glassX, -halfW + 8, glassW, halfW * 2 - 16, 2);
    ctx.fill();

    // Black Rubber Gasket & Windshield Wiper Arms (стеклоочистители)
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(glassX, -halfW + 8, glassW, halfW * 2 - 16);
    // Twin wiper blades
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(glassX + (dir > 0 ? 1 : 4), -8);
    ctx.lineTo(glassX + (dir > 0 ? 3 : 2), -1);
    ctx.moveTo(glassX + (dir > 0 ? 1 : 4), 3);
    ctx.lineTo(glassX + (dir > 0 ? 3 : 2), 10);
    ctx.stroke();

    // Cab Air Conditioning Monoblock on Roof (моноблок кондиционера кабины)
    const acX = dir > 0 ? halfL - 26 : -halfL + 18;
    ctx.fillStyle = '#334155';
    ctx.fillRect(acX, -10, 8, 20);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(acX, -10, 8, 20);

    // Signal Horns / Typhons (тифоны ТС-22)
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(acX + (dir > 0 ? 10 : -2), -4, 1.8, 0, Math.PI * 2);
    ctx.arc(acX + (dir > 0 ? 10 : -2), 4, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Upper Searchlight Housing (обтекаемый короб верхнего прожектора)
    const slX = dir > 0 ? halfL - 5 : -halfL + 2;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(slX, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(slX, 0, 2.0, 0, Math.PI * 2);
    ctx.fill();

    // Dual Lower Marker/Buffer Lights (буферные фонари)
    const blX = dir > 0 ? halfL - 2 : -halfL + 2;
    ctx.fillStyle = '#fef08a'; // White light
    ctx.beginPath();
    ctx.arc(blX, -halfW + 8, 2.0, 0, Math.PI * 2);
    ctx.arc(blX, halfW - 8, 2.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // =========================================================================
  // --- 5. ВЛ80С — МАГИСТРАЛЬНЫЙ ГРУЗОВОЙ ЭЛЕКТРОВОЗ (НЭВЗ) ---
  // =========================================================================

  private static renderVL80S(
    ctx: CanvasRenderingContext2D,
    car: RollingStockCar,
    halfL: number,
    halfW: number,
    nightAlpha: number
  ): void {
    ctx.save();

    // 1. Heavy Brutalist Body Profile with Faceted Front Nose
    // Local forward axis is +X (+halfL). Rotation on track is controlled by car.angle
    ctx.fillStyle = '#143d2b'; // Soviet Deep Malachite / Russian Transport Green
    ctx.beginPath();
    ctx.moveTo(halfL, -halfW + 8);
    ctx.lineTo(halfL - 8, -halfW + 2);
    ctx.lineTo(halfL - 16, -halfW);
    ctx.lineTo(-halfL + 2, -halfW);
    ctx.lineTo(-halfL, -halfW + 4);
    ctx.lineTo(-halfL, halfW - 4);
    ctx.lineTo(-halfL + 2, halfW);
    ctx.lineTo(halfL - 16, halfW);
    ctx.lineTo(halfL - 8, halfW - 2);
    ctx.lineTo(halfL, halfW - 8);
    ctx.closePath();
    ctx.fill();

    // 2. Body Corrugation Lines (продольные гофры ВЛ80)
    ctx.strokeStyle = '#0f291e';
    ctx.lineWidth = 1.0;
    const corrugationYs = [-halfW + 4, -halfW + 7, -halfW + 10, halfW - 10, halfW - 7, halfW - 4];
    for (const cy of corrugationYs) {
      ctx.beginPath();
      ctx.moveTo(-halfL + 18, cy);
      ctx.lineTo(halfL - 10, cy);
      ctx.stroke();
    }

    // White/Cream Waistband Stripe (декоративная белая полоса)
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(-halfL + 14, -halfW + 3.2, car.length - 24, 1.8);
    ctx.fillRect(-halfL + 14, halfW - 5.0, car.length - 24, 1.8);

    // 3. Central Metal Roof Plate with Removable Hatches
    const roofL = car.length - 30;
    const roofW = car.width - 14;
    ctx.fillStyle = '#334155';
    ctx.fillRect(-roofL / 2, -roofW / 2, roofL, roofW);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(-roofL / 2, -roofW / 2, roofL, roofW);

    // 4. 25kV High-Voltage Roof Equipment: Pantographs (Пантографы Т-5М1)
    const panto1X = -halfL + 42;
    const panto2X = halfL - 42;
    this.renderPantograph(ctx, panto1X);
    this.renderPantograph(ctx, panto2X);

    // High-Voltage Air Breaker (Главный выключатель ГВ ВОВ-25-4М)
    const gvX = -8;
    // Ceramic Ribbed Insulator Column (фарфоровый ребристый изолятор)
    ctx.fillStyle = '#7c2d12'; // Rust-brown porcelain insulator
    ctx.beginPath();
    ctx.arc(gvX, -8, 5.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9a3412';
    ctx.beginPath();
    ctx.arc(gvX, -8, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // High-pressure Air Reservoir Tank
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.roundRect(gvX - 7, 2, 14, 8, 3);
    ctx.fill();

    // High-Voltage Copper Busbars running between pantographs (высоковольтная шина)
    ctx.strokeStyle = '#b45309'; // Copper bar
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(panto1X + 15, -4);
    ctx.lineTo(gvX, -4);
    ctx.lineTo(gvX, -8);
    ctx.moveTo(gvX, -4);
    ctx.lineTo(panto2X - 15, -4);
    ctx.stroke();

    // Stand-off support ceramic insulators along the busbar
    const insXs = [-halfL + 72, halfL * 0.15];
    for (const ix of insXs) {
      ctx.fillStyle = '#0891b2'; // Polymer / porcelain insulator
      ctx.beginPath();
      ctx.arc(ix, -4, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Driver Cab Visor & Windshield
    const cabX = halfL - 14;
    ctx.fillStyle = nightAlpha > 0.3 ? '#0369a1' : '#0284c7';
    ctx.beginPath();
    ctx.roundRect(cabX, -halfW + 7, 8, halfW * 2 - 14, 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(cabX, -halfW + 7, 8, halfW * 2 - 14);

    // Cab Visor (козырек лобовых стекол)
    ctx.fillStyle = '#0f291e';
    const visorX = halfL - 6;
    ctx.fillRect(visorX, -halfW + 6, 3, halfW * 2 - 12);

    // Central High-Power Projector on cab roof
    const projX = halfL - 5;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(projX, 0, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(projX, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Road Number Stencil
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 6.5px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(car.roadNumber || 'ВЛ80С-1429', 0, halfW - 5.5);

    // Locomotive Lighting (Forward along +X)
    this.renderLocomotiveLighting(ctx, halfL, halfW, 1, nightAlpha, car.speed || 0);

    ctx.restore();
  }

  private static renderPantograph(ctx: CanvasRenderingContext2D, px: number): void {
    ctx.save();
    // Pantograph Base Frame (основание пантографа)
    ctx.fillStyle = '#991b1b'; // Red railway steel
    ctx.fillRect(px - 14, -13, 28, 26);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(px - 11, -10, 22, 20);

    // Diamond Arm Structure (ромбовидная ферма токоприемника)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(px - 10, 0);
    ctx.lineTo(px, -12);
    ctx.lineTo(px + 10, 0);
    ctx.lineTo(px, 12);
    ctx.closePath();
    ctx.stroke();

    // Cross-Collector Shoe with Carbon Strips (полоз токоприемника)
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(px - 3.5, -15, 7.0, 30);
    ctx.fillStyle = '#0f172a'; // Carbon contact inserts
    ctx.fillRect(px - 2.0, -14, 4.0, 28);

    // 4 Corner Insulators (опорные изоляторы)
    ctx.fillStyle = '#7c2d12';
    ctx.beginPath();
    ctx.arc(px - 12, -11, 2.2, 0, Math.PI * 2);
    ctx.arc(px + 12, -11, 2.2, 0, Math.PI * 2);
    ctx.arc(px - 12, 11, 2.2, 0, Math.PI * 2);
    ctx.arc(px + 12, 11, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // =========================================================================
  // --- 6. ЧМЭ3 — МАНЕВРОВЫЙ ТЕПЛОВОЗ ЧКД ПРАГА (КАПОТНЫЙ ТИП) ---
  // =========================================================================

  private static renderCHME3(
    ctx: CanvasRenderingContext2D,
    car: RollingStockCar,
    halfL: number,
    halfW: number,
    nightAlpha: number
  ): void {
    ctx.save();

    // 1. Full-Width Deck / Chassis Frame (несущая главная рама тепловоза)
    // Front pilot buffer beam has red/white warning zebra stripes
    ctx.fillStyle = '#15803d'; // Classic Czechoslovak railway green
    ctx.fillRect(-halfL, -halfW, car.length, car.width);

    // Black frame side border
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-halfL, -halfW, car.length, car.width);

    // Hazard Stripes on Buffer Pilots at both ends
    this.renderHazardStripes(ctx, -halfL, -halfW, 7, car.width);
    this.renderHazardStripes(ctx, halfL - 7, -halfW, 7, car.width);

    // 2. Open Walkways / Footplates with Yellow Safety Railings (наружные обходные палубы)
    // Walkway decking has perforated diamond tread pattern
    ctx.fillStyle = '#22543d';
    ctx.fillRect(-halfL + 7, -halfW + 1, car.length - 14, 4.0);
    ctx.fillRect(-halfL + 7, halfW - 5, car.length - 14, 4.0);

    // Safety Tubular Railings (желтые перила ограждения по всему периметру)
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-halfL + 8, -halfW + 1.2, car.length - 16, 0.1);
    ctx.strokeRect(-halfL + 8, halfW - 1.2, car.length - 16, 0.1);

    // Corner Boarding Ladders (подножки и поручни для составителя поездов)
    const ladderXs = [-halfL + 3, halfL - 3];
    for (const lx of ladderXs) {
      ctx.fillStyle = '#fde047';
      ctx.fillRect(lx - 2, -halfW - 0.5, 4, 1.5);
      ctx.fillRect(lx - 2, halfW - 1.0, 4, 1.5);
    }

    // 3. Narrow Hoods Layout:
    // Long Hood (длинный капот) occupies front section: x from -halfL + 10 to cab
    // Cab is elevated and wider, offset towards rear
    const cabCenterX = -halfL * 0.25;
    const cabL = 34;
    const cabW = car.width - 8; // Cab extends closer to edges
    const hoodW = car.width - 18; // Machinery hoods are noticeably narrower!

    // --- SHORT HOOD (Малый капот аккумуляторного отсека сзади) ---
    const shortHoodStartX = -halfL + 9;
    const shortHoodL = (cabCenterX - cabL / 2) - shortHoodStartX;
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.roundRect(shortHoodStartX, -hoodW / 2, shortHoodL, hoodW, 3);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Battery compartment vents
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(shortHoodStartX + 4, -hoodW / 2 + 2, shortHoodL - 8, hoodW - 4);

    // --- LONG HOOD (Длинный капот дизельного отсека и холодильника спереди) ---
    const longHoodStartX = cabCenterX + cabL / 2;
    const longHoodL = (halfL - 9) - longHoodStartX;
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.roundRect(longHoodStartX, -hoodW / 2, longHoodL, hoodW, 3);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Large Radiator Top Fan at the very front of the long hood
    const fanX = halfL - 22;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(fanX, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();
    // 6 Fan blades inside
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let a = 0; a < Math.PI; a += Math.PI / 3) {
      ctx.moveTo(fanX + Math.cos(a) * 6.5, Math.sin(a) * 6.5);
      ctx.lineTo(fanX - Math.cos(a) * 6.5, -Math.sin(a) * 6.5);
    }
    ctx.stroke();
    // Protective stainless mesh ring
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(fanX, 0, 7.5, 0, Math.PI * 2);
    ctx.stroke();

    // Diesel Engine Hood Access Hatches & Louvers (люки дизеля K6S310DR)
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.lineWidth = 0.8;
    for (let hx = longHoodStartX + 6; hx < fanX - 16; hx += 8) {
      ctx.strokeRect(hx, -hoodW / 2 + 2, 6, hoodW - 4);
    }

    // Exhaust Silencer Pipe with Soot Halo
    const exhX = fanX - 22;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.beginPath();
    ctx.arc(exhX, 0, 7.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(exhX, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // --- DRIVER'S CAB (Кабина машиниста ЧМЭ3) ---
    ctx.fillStyle = '#14532d';
    ctx.beginPath();
    ctx.roundRect(cabCenterX - cabL / 2, -cabW / 2, cabL, cabW, 4);
    ctx.fill();

    // White / Cream Cab Roof (светлая крыша кабины)
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.roundRect(cabCenterX - cabL / 2 + 2, -cabW / 2 + 3, cabL - 4, cabW - 6, 3);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Front and Rear Slanted Windows looking out over both hoods
    ctx.fillStyle = nightAlpha > 0.3 ? '#0369a1' : '#0284c7';
    // Front window
    ctx.fillRect(cabCenterX - cabL / 2 - 0.5, -hoodW / 2 + 2, 2.5, hoodW - 4);
    // Rear window
    ctx.fillRect(cabCenterX + cabL / 2 - 2.0, -hoodW / 2 + 2, 2.5, hoodW - 4);

    // Cab Side Windows
    ctx.fillRect(cabCenterX - 10, -cabW / 2 + 0.5, 20, 2.5);
    ctx.fillRect(cabCenterX - 10, cabW / 2 - 3.0, 20, 2.5);

    // Pneumatic Roof Horns (тифоны)
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(cabCenterX - 10, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Road Number Stencil
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(car.roadNumber || 'ЧМЭ3-4812', cabCenterX, 0);

    // Shunter Headlights at both ends
    this.renderLocomotiveLighting(ctx, halfL, halfW, 1, nightAlpha, car.speed || 0);

    ctx.restore();
  }

  private static renderHazardStripes(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = '#fef08a';
    ctx.lineWidth = 3.0;
    for (let sy = y - w; sy < y + h + w; sy += 7) {
      ctx.beginPath();
      ctx.moveTo(x, sy);
      ctx.lineTo(x + w, sy + w);
      ctx.lineTo(x + w, sy + w + 3.5);
      ctx.lineTo(x, sy + 3.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // =========================================================================
  // --- 7. ПАССАЖИРСКИЙ ВАГОН РЖД (ТВЗ 61-4440 / 61-4447) ---
  // =========================================================================

  private static renderPassengerCoachRZHD(
    ctx: CanvasRenderingContext2D,
    car: RollingStockCar,
    halfL: number,
    halfW: number,
    nightAlpha: number
  ): void {
    ctx.save();

    // 1. Tapered Vestibule Profile (торцевые сужения тамбуров)
    const vestL = 12; // Length of vestibuled end tapers
    ctx.beginPath();
    ctx.moveTo(-halfL + vestL, -halfW);
    ctx.lineTo(halfL - vestL, -halfW);
    ctx.lineTo(halfL, -halfW + 5);
    ctx.lineTo(halfL, halfW - 5);
    ctx.lineTo(halfL - vestL, halfW);
    ctx.lineTo(-halfL + vestL, halfW);
    ctx.lineTo(-halfL, halfW - 5);
    ctx.lineTo(-halfL, -halfW + 5);
    ctx.closePath();

    // Body Color: Modern RZD Slate Grey & Light Titanium
    const bodyGrad = ctx.createLinearGradient(0, -halfW, 0, halfW);
    bodyGrad.addColorStop(0, '#475569');
    bodyGrad.addColorStop(0.18, '#94a3b8');
    bodyGrad.addColorStop(0.5, '#cbd5e1');
    bodyGrad.addColorStop(0.82, '#94a3b8');
    bodyGrad.addColorStop(1, '#475569');
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // 2. Bold RZD Crimson Waistline & Dynamic Graphics (фирменная полоса РЖД)
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-halfL + vestL, -halfW + 2.4, car.length - vestL * 2, 3.6);
    ctx.fillRect(-halfL + vestL, halfW - 6.0, car.length - vestL * 2, 3.6);

    // 3. Arched Corrugated Steel Roof (продольные гофры ТВЗ)
    const roofL = car.length - vestL * 2;
    const roofW = car.width - 12;
    const roofHalfW = roofW / 2;

    const roofGrad = ctx.createLinearGradient(0, -roofHalfW, 0, roofHalfW);
    roofGrad.addColorStop(0, '#334155');
    roofGrad.addColorStop(0.5, '#64748b');
    roofGrad.addColorStop(1, '#334155');
    ctx.fillStyle = roofGrad;
    ctx.beginPath();
    ctx.roundRect(-roofL / 2, -roofHalfW, roofL, roofW, 3);
    ctx.fill();

    // Fine Longitudinal Corrugation Ribs
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
    ctx.lineWidth = 0.8;
    for (let ry = -roofHalfW + 2.5; ry <= roofHalfW - 2.5; ry += 2.8) {
      ctx.beginPath();
      ctx.moveTo(-roofL / 2 + 4, ry);
      ctx.lineTo(roofL / 2 - 4, ry);
      ctx.stroke();
    }

    // 4. Modern Monoblock Roof HVAC Units (два крышевых моноблока кондиционеров УКВ)
    const hvacOffsets = [-roofL * 0.28, roofL * 0.28];
    for (const hx of hvacOffsets) {
      const hLen = 30;
      const hWid = roofW - 8;

      // HVAC Aluminum Housing
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(hx - hLen / 2, -hWid / 2, hLen, hWid, 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Twin Condenser Fans in each HVAC unit
      const fanSpacing = 7.5;
      for (const fy of [-fanSpacing, fanSpacing]) {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(hx, fy, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Air filter intake louvers
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
      ctx.lineWidth = 0.6;
      for (let lx = hx - hLen / 2 + 3; lx < hx - 5; lx += 2) {
        ctx.beginPath();
        ctx.moveTo(lx, -hWid / 2 + 2);
        ctx.lineTo(lx, hWid / 2 - 2);
        ctx.stroke();
      }
    }

    // 5. Roof Deflectors & Vents (вытяжные дефлекторы Чеснокова)
    const ventXs = [-roofL * 0.42, 0, roofL * 0.42];
    for (const vx of ventXs) {
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(vx, 0, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    // Boiler heating chimney (труба угольного котла отопления) at non-working vestibule end
    const chimneyX = -halfL + vestL + 5;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(chimneyX, -roofHalfW + 4, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#78716c';
    ctx.beginPath();
    ctx.arc(chimneyX, -roofHalfW + 4, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // 6. Double-Glazed Windows with Warm Interior Night Lighting
    const windowColor = nightAlpha > 0.2 ? '#fef08a' : '#0284c7';
    ctx.fillStyle = windowColor;
    const numWindows = 9;
    const winL = 14;
    const winW = 2.4;
    const winStep = (roofL - 30) / numWindows;
    for (let w = 0; w < numWindows; w++) {
      const wx = -roofL / 2 + 15 + w * winStep;
      // Top window strip
      ctx.fillRect(wx, -halfW + 0.5, winL, winW);
      // Bottom window strip
      ctx.fillRect(wx, halfW - winW - 0.5, winL, winW);

      // Night light diffusion spill onto ground
      if (nightAlpha > 0.25) {
        ctx.fillStyle = 'rgba(254, 240, 138, 0.08)';
        ctx.fillRect(wx - 2, -halfW - 5, winL + 4, 5);
        ctx.fillRect(wx - 2, halfW, winL + 4, 5);
        ctx.fillStyle = windowColor;
      }
    }

    // 7. End Gangway Bellows (резиновое суфле межвагонного перехода)
    for (const dir of [-1, 1]) {
      const gx = dir > 0 ? halfL - 3 : -halfL;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(gx, -halfW + 12, 3, halfW * 2 - 24);
      // Accordion folds
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.8;
      for (let y = -halfW + 14; y < halfW - 14; y += 3) {
        ctx.beginPath();
        ctx.moveTo(gx, y); ctx.lineTo(gx + 3, y);
        ctx.stroke();
      }
    }

    // RZD Brand & Car Number
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 5.5px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(car.roadNumber || '018 24519', 0, -roofHalfW + 3);

    ctx.restore();
  }

  // =========================================================================
  // --- 8. ПОЛУВАГОН 12-132 (УНИВЕРСАЛЬНЫЙ ЧЕТЫРЕХОСНЫЙ УВЗ) ---
  // =========================================================================

  private static renderFreightHopper(
    ctx: CanvasRenderingContext2D,
    car: RollingStockCar,
    halfL: number,
    halfW: number,
    nightAlpha: number
  ): void {
    ctx.save();

    // 1. Heavy Rectangular Steel Body Frame (верхняя обвязка кузова)
    ctx.fillStyle = '#5c2211'; // Industrial Weathered Red Oxide / Rust Brown
    ctx.fillRect(-halfL, -halfW, car.length, car.width);

    // 2. External Structural Vertical Ribs / Stakes (боковые стойки кузова)
    // Protrude slightly beyond the outer walls, giving genuine 3D profile!
    ctx.fillStyle = '#3f170b';
    const numStakes = 14;
    const stakeSpacing = (car.length - 8) / (numStakes - 1);
    for (let s = 0; s < numStakes; s++) {
      const sx = -halfL + 4 + s * stakeSpacing;
      // Top stake cap
      ctx.fillRect(sx - 1.6, -halfW - 1.2, 3.2, 2.0);
      // Bottom stake cap
      ctx.fillRect(sx - 1.6, halfW - 0.8, 3.2, 2.0);
      // Rib line down outer wall
      ctx.strokeStyle = '#270e06';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx, -halfW); ctx.lineTo(sx, -halfW + 3);
      ctx.moveTo(sx, halfW - 3); ctx.lineTo(sx, halfW);
      ctx.stroke();
    }

    // Corner reinforcement brackets (угловые стойки)
    ctx.fillStyle = '#270e06';
    ctx.fillRect(-halfL, -halfW - 1.0, 3.5, 3.5);
    ctx.fillRect(halfL - 3.5, -halfW - 1.0, 3.5, 3.5);
    ctx.fillRect(-halfL, halfW - 2.5, 3.5, 3.5);
    ctx.fillRect(halfL - 3.5, halfW - 2.5, 3.5, 3.5);

    // 3. Open Cargo Hold Cavity (внутренний объем кузова)
    const holdL = car.length - 8;
    const holdW = car.width - 7;
    ctx.fillStyle = '#170b07';
    ctx.fillRect(-holdL / 2, -holdW / 2, holdL, holdW);

    // 4. Realistic Bulk Cargo (Сыпучий груз: гранитный щебень или уголь)
    const cargo = car.cargoType || 'gravel';
    if (cargo === 'gravel') {
      // --- CRUSHED GRANITE BALLAST GRAVEL (КОЛОТЫЙ ЩЕБЕНЬ) ---
      // Base gravel tone
      ctx.fillStyle = '#44403c';
      ctx.fillRect(-holdL / 2 + 1, -holdW / 2 + 1, holdL - 2, holdW - 2);

      // Multi-layer procedural stones & pyramid peaks
      const stoneColors = ['#57534e', '#78716c', '#a8a29e', '#292524', '#71717a'];
      for (let gx = -holdL / 2 + 4; gx < holdL / 2 - 4; gx += 5) {
        for (let gy = -holdW / 2 + 3; gy < holdW / 2 - 3; gy += 4) {
          const pseudoRand = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453;
          const colorIdx = Math.floor(Math.abs(pseudoRand) % stoneColors.length);
          const size = 2.5 + (Math.abs(pseudoRand * 3) % 2.5);

          ctx.fillStyle = stoneColors[colorIdx];
          ctx.beginPath();
          ctx.arc(gx + (pseudoRand % 2), gy + ((pseudoRand * 2) % 2), size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Longitudinal bulk mounds / ridge peaks (гребни насыпи)
      ctx.strokeStyle = 'rgba(214, 211, 209, 0.35)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-holdL * 0.38, 0);
      ctx.lineTo(holdL * 0.38, 0);
      ctx.stroke();

    } else if (cargo === 'coal') {
      // --- ANTHRACITE BULK COAL (УГОЛЬ АНТРАЦИТ) ---
      ctx.fillStyle = '#09090b';
      ctx.fillRect(-holdL / 2 + 1, -holdW / 2 + 1, holdL - 2, holdW - 2);

      // Shimmering coal facets
      const coalColors = ['#18181b', '#27272a', '#3f3f46', '#09090b', '#030712'];
      for (let cx = -holdL / 2 + 3; cx < holdL / 2 - 3; cx += 4.5) {
        for (let cy = -holdW / 2 + 3; cy < holdW / 2 - 3; cy += 3.8) {
          const pseudoRand = Math.cos(cx * 43.123 + cy * 19.456) * 12345.678;
          const colorIdx = Math.floor(Math.abs(pseudoRand) % coalColors.length);

          ctx.fillStyle = coalColors[colorIdx];
          ctx.fillRect(cx + (pseudoRand % 1.5), cy + ((pseudoRand * 2) % 1.5), 3.2, 2.8);
        }
      }

      // High-contrast coal mound highlights
      ctx.strokeStyle = 'rgba(161, 161, 170, 0.25)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-holdL * 0.35, 0);
      ctx.lineTo(holdL * 0.35, 0);
      ctx.stroke();

    } else {
      // --- EMPTY HOPPER (РАЗГРУЗОЧНЫЕ ЛЮКИ ДНИЩА) ---
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 1.2;
      for (let lx = -holdL / 2 + 8; lx < holdL / 2 - 8; lx += 18) {
        ctx.strokeRect(lx, -holdW / 2 + 3, 14, holdW - 6);
      }
    }

    // 5. White Technical Cyrillic Stencil Markings
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(car.roadNumber || '5482 1092', 0, -halfW + 2);

    ctx.restore();
  }

  // =========================================================================
  // --- 9. ЦИСТЕРНА 15-1443 (НЕФТЯНАЯ 4-ОСНАЯ) ---
  // =========================================================================

  private static renderFreightTanker(
    ctx: CanvasRenderingContext2D,
    car: RollingStockCar,
    halfL: number,
    halfW: number,
    nightAlpha: number
  ): void {
    ctx.save();

    // 1. Underframe End Platforms (концевые площадки рамы)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-halfL, -halfW * 0.7, car.length, halfW * 1.4);

    // 2. Cylindrical Boiler Barrel (котел цистерны)
    // Symmetrical dished elliptical tank heads (эллиптические днища)
    const barrelL = car.length - 16;
    const barrelW = car.width - 4;
    const barrelHalfL = barrelL / 2;
    const barrelHalfW = barrelW / 2;

    // Specular Cylinder Volume Gradient (реалистичный цилиндрический блик от верхнего света)
    const cylGrad = ctx.createLinearGradient(0, -barrelHalfW, 0, barrelHalfW);
    cylGrad.addColorStop(0, '#1c1917');
    cylGrad.addColorStop(0.18, '#292524');
    cylGrad.addColorStop(0.38, '#57534e');
    cylGrad.addColorStop(0.5, '#78716c');
    cylGrad.addColorStop(0.62, '#57534e');
    cylGrad.addColorStop(0.82, '#292524');
    cylGrad.addColorStop(1, '#1c1917');

    ctx.fillStyle = cylGrad;
    ctx.beginPath();
    ctx.roundRect(-barrelHalfL, -barrelHalfW, barrelL, barrelW, barrelHalfW * 0.7);
    ctx.fill();

    // Tank Weld Seams (кольцевые сварные швы обечаек котла)
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.lineWidth = 1.0;
    const seamXs = [-barrelHalfL * 0.65, -barrelHalfL * 0.22, barrelHalfL * 0.22, barrelHalfL * 0.65];
    for (const sx of seamXs) {
      ctx.beginPath();
      ctx.moveTo(sx, -barrelHalfW); ctx.lineTo(sx, barrelHalfW);
      ctx.stroke();
    }

    // 3. Tank Barrel Retaining Straps with Turnbuckles (стяжные хомуты с талрепами)
    const strapXs = [-barrelHalfL * 0.75, -barrelHalfL * 0.35, barrelHalfL * 0.35, barrelHalfL * 0.75];
    for (const stx of strapXs) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(stx - 1.4, -barrelHalfW - 0.5, 2.8, barrelW + 1.0);
      // Brass tensioning nuts
      ctx.fillStyle = '#b45309';
      ctx.fillRect(stx - 1.2, -barrelHalfW + 1, 2.4, 2.0);
      ctx.fillRect(stx - 1.2, barrelHalfW - 3, 2.4, 2.0);
    }

    // 4. Elevated Top Catwalk & Filling Dome (рабочая площадка и заливной колпак)
    const catwalkL = 36;
    const catwalkW = 20;
    ctx.fillStyle = '#44403c';
    ctx.fillRect(-catwalkL / 2, -catwalkW / 2, catwalkL, catwalkW);
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-catwalkL / 2, -catwalkW / 2, catwalkL, catwalkW);

    // Diamond safety grating on catwalk floor
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.lineWidth = 0.6;
    for (let cx = -catwalkL / 2 + 2; cx < catwalkL / 2 - 2; cx += 2.5) {
      ctx.beginPath();
      ctx.moveTo(cx, -catwalkW / 2 + 1); ctx.lineTo(cx, catwalkW / 2 - 1);
      ctx.stroke();
    }

    // Handrail safety perimeter around catwalk
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(-catwalkL / 2 - 0.5, -catwalkW / 2 - 0.5, catwalkL + 1, catwalkW + 1);

    // Oil Spillage Patina (потемневшие потеки нефтепродуктов вокруг горловины)
    ctx.fillStyle = 'rgba(10, 10, 12, 0.75)';
    ctx.beginPath();
    ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
    ctx.fill();

    // Round Manhole Inspection Dome (колпак заливной горловины)
    ctx.fillStyle = '#57534e';
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Hinged Cover Plate with locking swing bolts (крышка горловины с откидными болтами)
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(0, 0, 5.0, 0, Math.PI * 2);
    ctx.fill();

    // Pressure Relief Safety Valve (предохранительный клапан)
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(4, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Access Ladder at end leading down
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-barrelHalfL - 1, -4, 4, 8);

    // 5. Orange Hazmat Placard (Оранжевая табличка опасного груза ООН 1202 / 1203)
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(-barrelHalfL * 0.45 - 5, -barrelHalfW + 4, 10, 8);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-barrelHalfL * 0.45 - 5, -barrelHalfW + 4, 10, 8);
    // Hazard code dividing line
    ctx.beginPath();
    ctx.moveTo(-barrelHalfL * 0.45 - 5, -barrelHalfW + 8);
    ctx.lineTo(-barrelHalfL * 0.45 + 5, -barrelHalfW + 8);
    ctx.stroke();

    // Registration number
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(car.roadNumber || '5719 3302', 0, barrelHalfW - 5);

    ctx.restore();
  }

  // =========================================================================
  // --- 10. ЛЕСОВОЗНАЯ ПЛАТФОРМА 13-4012 (ШТАБЕЛЬ КРУГЛОГО ЛЕСА) ---
  // =========================================================================

  private static renderFreightFlatcarTimber(
    ctx: CanvasRenderingContext2D,
    car: RollingStockCar,
    halfL: number,
    halfW: number,
    nightAlpha: number
  ): void {
    ctx.save();

    // 1. Heavy Steel Chassis with Center Sill (хребтовая и боковые балки платформы)
    ctx.fillStyle = '#292524';
    ctx.fillRect(-halfL, -halfW, car.length, car.width);

    // 2. End Bulkhead Protective Walls (торцевые щиты-стенки для упора бревен)
    ctx.fillStyle = '#44403c';
    ctx.fillRect(-halfL, -halfW, 4, car.width);
    ctx.fillRect(halfL - 4, -halfW, 4, car.width);
    // Wall ribbing
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(-halfL, -halfW, 4, car.width);
    ctx.strokeRect(halfL - 4, -halfW, 4, car.width);

    // 3. Stanchion Stakes (поворотные стойки-коники с упорами)
    const numStanchions = 8;
    const stanSpacing = (car.length - 24) / (numStanchions - 1);
    const stanXs: number[] = [];
    for (let s = 0; s < numStanchions; s++) {
      const sx = -halfL + 12 + s * stanSpacing;
      stanXs.push(sx);

      // Yellow steel vertical stake heads
      ctx.fillStyle = '#eab308';
      ctx.fillRect(sx - 1.8, -halfW - 1.6, 3.6, 2.2);
      ctx.fillRect(sx - 1.8, halfW - 0.6, 3.6, 2.2);
      ctx.strokeStyle = '#713f12';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(sx - 1.8, -halfW - 1.6, 3.6, 2.2);
      ctx.strokeRect(sx - 1.8, halfW - 0.6, 3.6, 2.2);
    }

    // 4. Realistic Timber Log Stacks (хвойные бревна / кругляк)
    const numLogs = 5;
    const logWidth = (car.width - 6) / numLogs;
    const logBarkTones = ['#78350f', '#92400e', '#b45309', '#713f12', '#854d0e'];

    for (let l = 0; l < numLogs; l++) {
      const ly = -halfW + 3 + l * logWidth;
      const barkColor = logBarkTones[l % logBarkTones.length];

      // Longitudinal Log Body
      ctx.fillStyle = barkColor;
      ctx.beginPath();
      ctx.roundRect(-halfL + 4, ly + 0.5, car.length - 8, logWidth - 1.0, 1.5);
      ctx.fill();

      // Bark Texture Ridges
      ctx.strokeStyle = 'rgba(41, 37, 36, 0.4)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-halfL + 8, ly + logWidth * 0.5);
      ctx.lineTo(halfL - 8, ly + logWidth * 0.5);
      ctx.stroke();

      // Fresh Cut Tree Ends with Annual Growth Rings (спилы бревен с кольцами)
      for (const endDir of [-1, 1]) {
        const cutX = endDir > 0 ? halfL - 5.5 : -halfL + 4.5;
        // Outer sapwood
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(cutX - 0.8, ly + 0.8, 1.6, logWidth - 1.6);
        // Inner core
        ctx.fillStyle = '#d97706';
        ctx.fillRect(cutX - 0.4, ly + logWidth * 0.35, 0.8, logWidth * 0.3);
      }
    }

    // 5. High-Tensile Steel Tie-Down Chains & Winch Cables (стяжные цепи и тросы)
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.4;
    for (const sx of stanXs) {
      ctx.beginPath();
      ctx.moveTo(sx, -halfW);
      ctx.lineTo(sx, halfW);
      ctx.stroke();

      // Tensioning ratchet binder in center (храповой натяжитель)
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(sx - 1.2, -1.5, 2.4, 3.0);
    }

    // Road number on frame
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(car.roadNumber || '4291 9901', 0, -halfW + 1.5);

    ctx.restore();
  }

  // =========================================================================
  // --- 11. DYNAMIC LIGHTING & NIGHT HEADLIGHT BEAMS ---
  // =========================================================================

  private static renderLocomotiveLighting(
    ctx: CanvasRenderingContext2D,
    halfL: number,
    halfW: number,
    dir: 1 | -1,
    nightAlpha: number,
    speed: number
  ): void {
    if (nightAlpha <= 0.05 && speed <= 0) return;

    ctx.save();
    const beamOriginX = dir * halfL;
    const beamLen = 320;
    const beamSpread = 85;

    // Smooth volumetric headlight cone
    const beamGrad = ctx.createRadialGradient(
      beamOriginX + dir * 15,
      0,
      10,
      beamOriginX + dir * beamLen,
      0,
      beamLen
    );
    beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
    beamGrad.addColorStop(0.35, 'rgba(254, 240, 138, 0.22)');
    beamGrad.addColorStop(0.7, 'rgba(254, 240, 138, 0.08)');
    beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');

    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(beamOriginX, -10);
    ctx.lineTo(beamOriginX + dir * beamLen, -beamSpread);
    ctx.lineTo(beamOriginX + dir * beamLen, beamSpread);
    ctx.lineTo(beamOriginX, 10);
    ctx.closePath();
    ctx.fill();

    // Bright Projector Lens Flare (блик линзы прожектора)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(beamOriginX, 0, 3.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
