// --- ULTRA-REALISTIC ROLLING STOCK RENDERER (STRICT TOP-DOWN ORTHOGONAL PROJECTION) ---
// High-fidelity vector graphics for Soviet and Russian Railways (РЖД / СЖД):
// 1. ТЭП70БС — Магистральный пассажирский тепловоз (Коломенский завод) с обтекаемыми кабинами и шахтой холодильника
// 2. ВЛ80С — Грузовой магистральный электровоз переменного тока с пантографами Т-5М1 и высоковольтным оборудованием 25 кВ
// 3. ЧМЭ3 — Маневровый тепловоз ЧКД Прага капотного типа с наружными палубами, перилами и выступающей кабиной
// 4. Вагон ТВЗ 61-4440/61-4447 — Цельнометаллический пассажирский вагон с гофрированной крышей, кондиционерами УКВ и суфле
// 5. Полувагон 12-132 — Четырехосный открытый полувагон со стойками кузова и насыпным грузом (щебень / уголь)
// 6. Цистерна 15-1443 — 4-осная нефтеналивная цистерна с эллиптическими днищами, заливной горловиной, трапом и хомутами
// 7. Платформа 13-4012 — Лесовозная платформа с торцевыми щитами, стойками-кониками и штабелем круглого леса

import { GameWorld, Player, RollingStockCar } from './types';
import { TrainSystem } from './trainSystem';

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
    nightAlpha: number,
    player?: Player
  ): void {
    const cars = world.rollingStock;
    if (!cars || cars.length === 0) return;

    const activePlayerInsideId = player?.insideCarId || (world.player && world.player.insideCarId);

    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      car.isPlayerInside = !!(activePlayerInsideId && activePlayerInsideId === car.id);
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
      } else if (type.startsWith('passenger_') || type.includes('coach') || type.includes('platskart') || type.includes('kupe') || type.includes('passenger')) {
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
      if (TrainSystem.isTailCar(car.id) && dir < 0) {
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
    this.renderTEP70Cab(ctx, car, halfL, halfW, 1, nightAlpha);
    this.renderTEP70Cab(ctx, car, halfL, halfW, -1, nightAlpha);

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
    car: RollingStockCar,
    halfL: number,
    halfW: number,
    dir: 1 | -1,
    nightAlpha: number
  ): void {
    ctx.save();
    const cx = dir * (halfL - 14);

    const isHeadCar = TrainSystem.isHeadCar(car.id);
    const isTailCar = TrainSystem.isTailCar(car.id);

    let searchlightOn = false;
    let bufferLightsMode: 'off' | 'white' | 'red' = 'off';

    if (dir === 1) {
      // Front cab (facing travel direction)
      if (isHeadCar) {
        searchlightOn = true;
        bufferLightsMode = 'white';
      }
    } else {
      // Rear cab
      if (isTailCar) {
        // Solitary engine tail
        bufferLightsMode = 'red';
      }
    }

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

    if (searchlightOn) {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(slX, 0, 2.0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(slX, 0, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dual Lower Marker/Buffer Lights (буферные фонари)
    const blX = dir > 0 ? halfL - 2 : -halfL + 2;
    ctx.fillStyle = '#0f172a'; // Bezels
    ctx.beginPath();
    ctx.arc(blX, -halfW + 8, 2.6, 0, Math.PI * 2);
    ctx.arc(blX, halfW - 8, 2.6, 0, Math.PI * 2);
    ctx.fill();

    if (bufferLightsMode === 'white') {
      ctx.fillStyle = '#fef08a'; // White light
      ctx.beginPath();
      ctx.arc(blX, -halfW + 8, 1.8, 0, Math.PI * 2);
      ctx.arc(blX, halfW - 8, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (bufferLightsMode === 'red') {
      ctx.fillStyle = '#dc2626'; // Red light
      ctx.beginPath();
      ctx.arc(blX, -halfW + 8, 1.8, 0, Math.PI * 2);
      ctx.arc(blX, halfW - 8, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#1e293b'; // Off
      ctx.beginPath();
      ctx.arc(blX, -halfW + 8, 1.4, 0, Math.PI * 2);
      ctx.arc(blX, halfW - 8, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

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

    const isHeadCar = TrainSystem.isHeadCar(car.id);
    const isTailCar = TrainSystem.isTailCar(car.id);

    let searchlightOn = false;
    let bufferLightsMode: 'off' | 'white' | 'red' = 'off';

    if (!car.isSectionB && isHeadCar) {
      searchlightOn = true;
      bufferLightsMode = 'white';
    } else if (car.isSectionB && isTailCar) {
      bufferLightsMode = 'red';
    }

    // Central High-Power Projector on cab roof
    const projX = halfL - 5;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(projX, 0, 3.8, 0, Math.PI * 2);
    ctx.fill();

    if (searchlightOn) {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(projX, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(projX, 0, 2.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dual Buffer Lights on cab nose (Буферные фонари ВЛ80С)
    const blX = halfL - 2;
    ctx.fillStyle = '#0f172a'; // Bezels
    ctx.beginPath();
    ctx.arc(blX, -halfW + 8, 2.6, 0, Math.PI * 2);
    ctx.arc(blX, halfW - 8, 2.6, 0, Math.PI * 2);
    ctx.fill();

    if (bufferLightsMode === 'white') {
      ctx.fillStyle = '#fef08a'; // White light
      ctx.beginPath();
      ctx.arc(blX, -halfW + 8, 1.8, 0, Math.PI * 2);
      ctx.arc(blX, halfW - 8, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (bufferLightsMode === 'red') {
      ctx.fillStyle = '#dc2626'; // Red light
      ctx.beginPath();
      ctx.arc(blX, -halfW + 8, 1.8, 0, Math.PI * 2);
      ctx.arc(blX, halfW - 8, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#1e293b'; // Off
      ctx.beginPath();
      ctx.arc(blX, -halfW + 8, 1.4, 0, Math.PI * 2);
      ctx.arc(blX, halfW - 8, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

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

    // Shunter Headlights and Buffer Lights (ЧМЭ3)
    const isHeadCar = TrainSystem.isHeadCar(car.id);
    const isTailCar = TrainSystem.isTailCar(car.id);

    // Front lights (at +halfL)
    let frontSearchlightOn = false;
    let frontBufferLights: string = 'off';
    // Rear lights (at -halfL)
    let rearSearchlightOn = false;
    let rearBufferLights: string = 'off';

    if (isHeadCar) {
      frontSearchlightOn = true;
      frontBufferLights = 'white';
    } else if (isTailCar) {
      rearBufferLights = 'red';
    }

    // 1. Draw Front Lights (at +halfL)
    // Front searchlight (on the end of the long hood)
    const frontProjX = halfL - 6;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(frontProjX, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
    if (frontSearchlightOn) {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(frontProjX, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(frontProjX, 0, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Front buffer lights (on the front buffer pilot)
    const frontBlX = halfL - 2;
    for (const by of [-halfW + 8, halfW - 8]) {
      ctx.fillStyle = '#0f172a'; // Bezels
      ctx.beginPath();
      ctx.arc(frontBlX, by, 2.4, 0, Math.PI * 2);
      ctx.fill();
      if (frontBufferLights === 'white') {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(frontBlX, by, 1.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (frontBufferLights === 'red') {
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(frontBlX, by, 1.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(frontBlX, by, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Draw Rear Lights (at -halfL)
    // Rear searchlight (on top of the cab roof facing rearwards)
    const rearProjX = cabCenterX + cabL / 2 + 1;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(rearProjX, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
    if (rearSearchlightOn) {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(rearProjX, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(rearProjX, 0, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rear buffer lights (on the rear buffer pilot)
    const rearBlX = -halfL + 2;
    for (const by of [-halfW + 8, halfW - 8]) {
      ctx.fillStyle = '#0f172a'; // Bezels
      ctx.beginPath();
      ctx.arc(rearBlX, by, 2.4, 0, Math.PI * 2);
      ctx.fill();
      if (rearBufferLights === 'white') {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(rearBlX, by, 1.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (rearBufferLights === 'red') {
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(rearBlX, by, 1.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(rearBlX, by, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

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
  // --- 7. ПАССАЖИРСКИЙ ВАГОН РЖД (ТВЗ 61-4440 КУПЕ / 61-4447 ПЛАЦКАРТ) ---
  // =========================================================================

  private static renderPassengerCoachRZHD(
    ctx: CanvasRenderingContext2D,
    car: RollingStockCar,
    halfL: number,
    halfW: number,
    nightAlpha: number
  ): void {
    ctx.save();

    // 1. Tapered Vestibule Profile (торцевые аэродинамические сужения тамбуров)
    const vestL = 16; // Length of vestibuled end tapers
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
    bodyGrad.addColorStop(0, '#334155');
    bodyGrad.addColorStop(0.18, '#64748b');
    bodyGrad.addColorStop(0.5, '#cbd5e1');
    bodyGrad.addColorStop(0.82, '#64748b');
    bodyGrad.addColorStop(1, '#334155');
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // 2. Bold RZD Crimson Waistline & Dynamic Graphics (фирменная полоса РЖД)
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-halfL + vestL, -halfW + 2.2, car.length - vestL * 2, 3.6);
    ctx.fillRect(-halfL + vestL, halfW - 5.8, car.length - vestL * 2, 3.6);

    // Dynamic RZD Red Accents at Vestibule Tapers
    ctx.beginPath();
    ctx.moveTo(-halfL + vestL, -halfW + 2.2);
    ctx.lineTo(-halfL + 6, -halfW + 6.5);
    ctx.lineTo(-halfL + 6, -halfW + 9.5);
    ctx.lineTo(-halfL + vestL, -halfW + 5.8);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(halfL - vestL, -halfW + 2.2);
    ctx.lineTo(halfL - 6, -halfW + 6.5);
    ctx.lineTo(halfL - 6, -halfW + 9.5);
    ctx.lineTo(halfL - vestL, -halfW + 5.8);
    ctx.closePath();
    ctx.fill();

    const isPlatskart = (car.type && car.type.includes('platskart')) ||
      (car.name && car.name.toLowerCase().includes('плацкарт'));

    const roofL = car.length - vestL * 2;
    const roofW = car.width - 12;
    const roofHalfW = roofW / 2;

    if (car.isPlayerInside) {
      // =======================================================================
      // --- 3.1. 100% REALISTIC INTERIOR CUTAWAY (АНАТОМИЧЕСКИЙ СРЕЗ ВАГОНА) ---
      // =======================================================================

      // 1. Heavy Insulated Chassis & Sub-floor Foundation
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-halfL, -halfW, car.length, car.width);

      // Base oak transport linoleum floor
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-halfL + 2, -halfW + 2.5, car.length - 4, car.width - 5);

      // --- ZONE 1: НЕРАБОЧИЙ ТАМБУР (NON-WORKING VESTIBULE, -halfL .. -halfL + 36) ---
      const nwVestEnd = -halfL + 36;
      // Non-slip corrugated dark steel floor
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-halfL + 2, -halfW + 2.5, 34, car.width - 5);
      // Floor ribs
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.8;
      for (let vx = -halfL + 6; vx < nwVestEnd - 4; vx += 5) {
        ctx.beginPath();
        ctx.moveTo(vx, -halfW + 5); ctx.lineTo(vx, halfW - 5);
        ctx.stroke();
      }

      // Outer Boarding Doors (North & South) with drop-down steps & safety glass
      for (const side of [-1, 1]) {
        const doorY = side === -1 ? -halfW + 1 : halfW - 3.5;
        ctx.fillStyle = '#475569';
        ctx.fillRect(-halfL + 8, doorY, 20, 2.5);
        // Yellow safety grab-rail
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(-halfL + 7, doorY + (side === -1 ? 3 : -0.5));
        ctx.lineTo(-halfL + 29, doorY + (side === -1 ? 3 : -0.5));
        ctx.stroke();
      }

      // Spring-loaded Trash Disposal Hopper (мусоросборник)
      ctx.fillStyle = '#334155';
      ctx.fillRect(-halfL + 4, -9, 8, 18);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-halfL + 4, -9, 8, 18);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-halfL + 6, -6, 4, 12);

      // Insulated Vestibule Bulkhead Wall with Frosted Glass Door
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(nwVestEnd, -halfW + 2.5); ctx.lineTo(nwVestEnd, halfW - 2.5);
      ctx.stroke();
      // Glass door
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.85)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(nwVestEnd, 2); ctx.lineTo(nwVestEnd, 16);
      ctx.stroke();

      // --- ZONE 2: ДВУХКАБИННЫЙ САНИТАРНЫЙ УЗЕЛ ЭЧТК (-halfL + 36 .. -halfL + 85) ---
      const wcStartX = nwVestEnd;
      const wcEndX = -halfL + 85;
      const wcCabinW = (wcEndX - wcStartX) / 2;

      // Two modern vacuum toilet cabins on top half (y = -halfW + 2.5 .. 0)
      for (let c = 0; c < 2; c++) {
        const cx1 = wcStartX + c * wcCabinW;
        const cx2 = cx1 + wcCabinW;

        // Hygienic anti-bacterial turquoise floor
        ctx.fillStyle = '#0f766e';
        ctx.fillRect(cx1 + 0.8, -halfW + 2.8, wcCabinW - 1.6, halfW - 3);

        // Partition dividing walls
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(cx1, -halfW + 2.5); ctx.lineTo(cx1, 0);
        if (c === 1) {
          ctx.moveTo(cx2, -halfW + 2.5); ctx.lineTo(cx2, 0);
        }
        ctx.moveTo(cx1, 0); ctx.lineTo(cx2, 0);
        ctx.stroke();

        // Modern Stainless Steel Vacuum Toilet Bowl
        const tX = cx1 + 6.5;
        const tY = -halfW + 7.5;
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.ellipse(tX, tY, 3.2, 4.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 0.6;
        ctx.stroke();
        // Inner suction bowl opening
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(tX, tY + 0.5, 1.6, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Stainless flush foot-pedal
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(tX - 1.2, tY + 5.0, 2.4, 1.2);

        // Oval Handwash Sink Basin with Chrome Sensor Faucet
        const sX = cx1 + wcCabinW - 6.5;
        const sY = -halfW + 8;
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.ellipse(sX, sY, 3.0, 4.0, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        // Chrome faucet
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(sX - 0.6, -halfW + 3.2, 1.2, 2.5);
        // Water drop highlight
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(sX, sY, 1.0, 0, Math.PI * 2);
        ctx.fill();

        // Wall vanity mirror
        ctx.fillStyle = '#93c5fd';
        ctx.fillRect(cx1 + 3, -halfW + 2.8, wcCabinW - 6, 0.8);

        // Occupancy indicator LED on door (Green = Vacant, Red = Occupied)
        ctx.fillStyle = c === 0 ? '#22c55e' : '#ef4444';
        ctx.beginPath();
        ctx.arc(cx1 + wcCabinW / 2, 0, 1.0, 0, Math.PI * 2);
        ctx.fill();

        // Frosted privacy window in outer hull
        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(cx1 + 4, -halfW + 0.5, wcCabinW - 8, 2.0);
      }

      // Non-working end corridor floor (y = 0 .. halfW - 2.5)
      ctx.fillStyle = '#92400e';
      ctx.fillRect(wcStartX, 0, wcEndX - wcStartX, halfW - 2.5);
      // Wall-mounted powder fire extinguisher (ОП-5) in corridor
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(wcEndX - 8, 4, 3.5, 7, 1);
      ctx.fill();

      // --- ZONE 3: ПАССАЖИРСКИЙ САЛОН (9 ПОЛНОЦЕННЫХ КУПЕ / ОТСЕКОВ, -halfL + 85 .. halfL - 75) ---
      const saloonStartX = wcEndX;
      const saloonEndX = halfL - 75;
      const saloonL = saloonEndX - saloonStartX; // Exactly 330 px!
      const numComps = 9; // Exactly 9 standard RZD compartments!
      const compW = saloonL / numComps; // ~36.67 px per compartment

      if (!isPlatskart) {
        // =====================================================================
        // --- 3.1.A. КУПЕЙНЫЙ ВАГОН (ТВЗ 61-4440 КУПЕ) ---
        // =====================================================================
        // Longitudinal corridor divider wall at y = 1.5
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(saloonStartX, 1.5);
        ctx.lineTo(saloonEndX, 1.5);
        ctx.stroke();

        // 1. Broad Side Corridor with Grand Crimson Runner Carpet
        ctx.fillStyle = '#78350f'; // Warm oak linoleum floor
        ctx.fillRect(saloonStartX, 1.5, saloonL, halfW - 4.0);

        // Crimson red carpet runner along corridor
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(saloonStartX, 5.5, saloonL, 16.5);
        // Double gold embroidered border stripes
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(saloonStartX, 6.5); ctx.lineTo(saloonEndX, 6.5);
        ctx.moveTo(saloonStartX, 8.0); ctx.lineTo(saloonEndX, 8.0);
        ctx.moveTo(saloonStartX, 19.5); ctx.lineTo(saloonEndX, 19.5);
        ctx.moveTo(saloonStartX, 21.0); ctx.lineTo(saloonEndX, 21.0);
        ctx.stroke();

        // Polished Brass Window Handrail (настенный поручень)
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(saloonStartX + 2, halfW - 3.5);
        ctx.lineTo(saloonEndX - 2, halfW - 3.5);
        ctx.stroke();

        // 2. Render 9 Individual Private Compartments
        for (let i = 0; i < numComps; i++) {
          const compX = saloonStartX + i * compW;

          // Transverse divider bulkhead wall between compartments
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(compX, -halfW + 2.5);
          ctx.lineTo(compX, 1.5);
          ctx.stroke();

          // Left Lower Berth (Мягкий диван с велюровой обивкой и постельным бельем)
          ctx.fillStyle = '#1e3a8a'; // Deep railway navy velvet
          ctx.beginPath();
          ctx.roundRect(compX + 2.0, -halfW + 3.5, 10.5, halfW - 4.5, 1);
          ctx.fill();
          // White crisp linen bedsheet band
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(compX + 3.5, -halfW + 7.5, 7.5, 11);
          // Dark blue upholstered bolster headrest
          ctx.fillStyle = '#172554';
          ctx.fillRect(compX + 2.5, -halfW + 4.0, 9.5, 3.2);

          // Right Lower Berth
          ctx.fillStyle = '#1e3a8a';
          ctx.beginPath();
          ctx.roundRect(compX + compW - 12.5, -halfW + 3.5, 10.5, halfW - 4.5, 1);
          ctx.fill();
          // White linen bedsheet band
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(compX + compW - 11.0, -halfW + 7.5, 7.5, 11);
          // Headrest
          ctx.fillStyle = '#172554';
          ctx.fillRect(compX + compW - 12.0, -halfW + 4.0, 9.5, 3.2);

          // Polished Walnut Folding Dining Table by the Window
          const tableX = compX + 13.5;
          const tableW = compW - 27;
          ctx.fillStyle = '#b45309'; // Rich polished wood
          ctx.beginPath();
          ctx.roundRect(tableX, -halfW + 3.0, tableW, 13.5, 1);
          ctx.fill();
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 0.6;
          ctx.strokeRect(tableX, -halfW + 3.0, tableW, 13.5);

          // Iconic Russian Tea in Melchior Glass-holders (стаканы чая в резных подстаканниках)
          const teaY = -halfW + 7.5;
          for (const tx of [tableX + 2.5, tableX + tableW - 2.5]) {
            // Shiny nickel-silver holder rim
            ctx.fillStyle = '#cbd5e1';
            ctx.beginPath();
            ctx.arc(tx, teaY, 1.6, 0, Math.PI * 2);
            ctx.fill();
            // Amber Ceylon tea inside glass
            ctx.fillStyle = '#d97706';
            ctx.beginPath();
            ctx.arc(tx, teaY, 1.0, 0, Math.PI * 2);
            ctx.fill();
          }

          // Sliding Compartment Door along corridor wall (сдвижная дверь купе)
          const doorX = compX + 11.0;
          const doorW = compW - 22.0;
          // Runner guide track
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(doorX - 1, 0.5, doorW + 2, 1.8);
          // Frosted translucent safety glass window in door
          ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
          ctx.fillRect(doorX + 1, 0.5, doorW - 2, 1.2);
          // Polished brass door latch handle
          ctx.fillStyle = '#ca8a04';
          ctx.beginPath();
          ctx.arc(doorX + doorW - 2, 1.5, 0.8, 0, Math.PI * 2);
          ctx.fill();

          // Fold-down corridor jump-seats between windows
          if (i < numComps - 1) {
            ctx.fillStyle = '#92400e';
            ctx.beginPath();
            ctx.roundRect(compX + compW - 3, halfW - 5.5, 6, 2.5, 0.5);
            ctx.fill();
          }
        }
      } else {
        // =====================================================================
        // --- 3.1.B. ПЛАЦКАРТНЫЙ ВАГОН (ТВЗ 61-4447 ПЛАЦКАРТ) ---
        // =====================================================================
        // Open-plan saloon: NO longitudinal wall! Direct access to bays and side berths!

        // Continuous high-traffic corridor walkway (y = 0 .. 12.5)
        ctx.fillStyle = '#713f12';
        ctx.fillRect(saloonStartX, 0, saloonL, 12.5);
        ctx.fillStyle = '#a16207';
        ctx.fillRect(saloonStartX, 4, saloonL, 4.5);

        // 9 Transverse Bays on Top + 9 SIDE BERTHS (БОКОВУШКИ) on Bottom!
        for (let i = 0; i < numComps; i++) {
          const compX = saloonStartX + i * compW;

          // Transverse partition wall between bays
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(compX, -halfW + 2.5);
          ctx.lineTo(compX, 0);
          ctx.stroke();

          // --- TOP SECTION: 2 Transverse Lower Berths & Table ---
          // Left lower berth
          ctx.fillStyle = '#1d4ed8'; // Classic platskart bright blue leatherette
          ctx.beginPath();
          ctx.roundRect(compX + 2.0, -halfW + 3.5, 10.5, halfW - 4.5, 1);
          ctx.fill();
          ctx.fillStyle = '#f8fafc'; // Folded sheet
          ctx.fillRect(compX + 3.5, -halfW + 8.0, 7.5, 10);
          ctx.fillStyle = '#1e3a8a';
          ctx.fillRect(compX + 2.5, -halfW + 4.0, 9.5, 3.2);

          // Right lower berth
          ctx.fillStyle = '#1d4ed8';
          ctx.beginPath();
          ctx.roundRect(compX + compW - 12.5, -halfW + 3.5, 10.5, halfW - 4.5, 1);
          ctx.fill();
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(compX + compW - 11.0, -halfW + 8.0, 7.5, 10);
          ctx.fillStyle = '#1e3a8a';
          ctx.fillRect(compX + compW - 12.0, -halfW + 4.0, 9.5, 3.2);

          // Transverse folding table with 2 recessed cup-holders
          const tableX = compX + 13.5;
          const tableW = compW - 27;
          ctx.fillStyle = '#b45309';
          ctx.beginPath();
          ctx.roundRect(tableX, -halfW + 3.0, tableW, 13.5, 1);
          ctx.fill();
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 0.6;
          ctx.strokeRect(tableX, -halfW + 3.0, tableW, 13.5);

          // Two glasses of tea
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.arc(tableX + 2.5, -halfW + 7.5, 1.2, 0, Math.PI * 2);
          ctx.arc(tableX + tableW - 2.5, -halfW + 7.5, 1.2, 0, Math.PI * 2);
          ctx.fill();

          // Overhead upper berth shelf support bar
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(compX + 2, -1.5); ctx.lineTo(compX + compW - 2, -1.5);
          ctx.stroke();

          // --- BOTTOM SECTION: 9 БОКОВЫХ МЕСТ (SIDE BERTHS / БОКОВУШКИ) ---
          // Floor under side berth
          ctx.fillStyle = '#5c2d91'; // subtle accent under berths
          ctx.fillStyle = '#78350f';
          ctx.fillRect(compX + 1.5, 12.5, compW - 3, halfW - 15);

          // Left side seat
          ctx.fillStyle = '#1d4ed8';
          ctx.beginPath();
          ctx.roundRect(compX + 2.0, 13.5, 9.0, halfW - 16, 1);
          ctx.fill();

          // Right side seat
          ctx.fillStyle = '#1d4ed8';
          ctx.beginPath();
          ctx.roundRect(compX + compW - 11.0, 13.5, 9.0, halfW - 16, 1);
          ctx.fill();

          // Center folding side tea table (раскладной столик боковушки)
          const sTableX = compX + 12.0;
          const sTableW = compW - 24;
          ctx.fillStyle = '#b45309';
          ctx.beginPath();
          ctx.roundRect(sTableX, 14.5, sTableW, halfW - 17.5, 1);
          ctx.fill();
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(sTableX, 14.5, sTableW, halfW - 17.5);

          // Upper side sleeping shelf overhead frame
          ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(compX + 2.0, 13.5, compW - 4.0, halfW - 16);
        }
      }

      // Closing bulkhead wall of the passenger saloon at saloonEndX
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(saloonEndX, -halfW + 2.5); ctx.lineTo(saloonEndX, halfW - 2.5);
      ctx.stroke();

      // --- ZONE 4: СЛУЖЕБНЫЙ БЛОК И ТИТАН (WORKING END SERVICE ZONE, halfL - 75 .. halfL - 33) ---
      const srvStartX = saloonEndX;
      const srvEndX = halfL - 33;

      // 1. Conductor's Private Compartment (Служебное купе проводников, y = -halfW + 2.5 .. 0)
      ctx.fillStyle = '#78350f';
      ctx.fillRect(srvStartX, -halfW + 2.8, srvEndX - srvStartX, halfW - 3);

      // Conductor Upholstered Daybed
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.roundRect(srvStartX + 3, -halfW + 3.5, 16, halfW - 5, 1);
      ctx.fill();

      // Conductor Desk with Train Register Journal & Microphone Handset
      const cDeskX = srvStartX + 22;
      const cDeskW = (srvEndX - srvStartX) - 25;
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.roundRect(cDeskX, -halfW + 3.5, cDeskW, 12, 1);
      ctx.fill();
      // Route paper journal
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cDeskX + 2, -halfW + 5, 5, 7);
      // Radio handset
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cDeskX + cDeskW - 4, -halfW + 5, 2.5, 6);

      // Partition dividing conductor compartment from corridor
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(srvStartX, 0); ctx.lineTo(srvEndX, 0);
      ctx.stroke();
      // Conductor door
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(srvStartX + 8, 0); ctx.lineTo(srvStartX + 20, 0);
      ctx.stroke();

      // 2. Unobstructed Service Corridor Walkway (y = 0 .. 13.5)
      // Completely open and clear! Passengers and crew walk freely without bumping into anything!
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(srvStartX, 0, srvEndX - srvStartX, 13.5);

      // 3. PROPERLY RECESSED BOILER NICHE & TITAN WATER HEATER (y = 13.5 .. halfW - 2.5)
      // Recessed safely against the wall!
      const titanNicheX = srvStartX + 4;
      const titanNicheW = 16;
      // Fireproof steel hearth floor plate
      ctx.fillStyle = '#334155';
      ctx.fillRect(titanNicheX, 13.5, titanNicheW, halfW - 15.5);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.0;
      ctx.strokeRect(titanNicheX, 13.5, titanNicheW, halfW - 15.5);

      // Cylindrical Copper Titan Boiler (Медный угольный титан)
      const titanCenterX = titanNicheX + titanNicheW / 2;
      const titanCenterY = 20.5;

      // Heavy copper outer jacket
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(titanCenterX, titanCenterY, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Brass top valve & piping
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(titanCenterX, titanCenterY, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Warm fiery coal furnace firebox glowing inside
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(titanCenterX - 1.0, titanCenterY + 1.6, 1.0, 0, Math.PI * 2);
      ctx.fill();

      // Hot water spigot and drip tray
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(titanCenterX - 3.5, 14.0, 1.5, 2.0);

      // 4. Main Electrical Switchboard Cabinet (Главный распределительный электрощит)
      const elCabX = titanNicheX + titanNicheW + 2;
      const elCabW = (srvEndX - elCabX) - 2;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(elCabX, 14.5, elCabW, halfW - 16.5);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(elCabX, 14.5, elCabW, halfW - 16.5);

      // Analog dial meters & indicator status lights (220V, 110V, 54V, generator)
      ctx.fillStyle = '#22c55e'; // Green generator OK
      ctx.beginPath();
      ctx.arc(elCabX + 3, 17, 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eab308'; // Amber heating
      ctx.beginPath();
      ctx.arc(elCabX + 6, 17, 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8'; // Blue ventilation
      ctx.beginPath();
      ctx.arc(elCabX + 9, 17, 0.7, 0, Math.PI * 2);
      ctx.fill();

      // --- ZONE 5: РАБОЧИЙ ТАМБУР (WORKING VESTIBULE, halfL - 33 .. halfL) ---
      // Heavy insulated partition between service zone and working vestibule
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(srvEndX, -halfW + 2.5); ctx.lineTo(srvEndX, halfW - 2.5);
      ctx.stroke();
      // Glass door
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.85)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(srvEndX, 2); ctx.lineTo(srvEndX, 14);
      ctx.stroke();

      // Steel checkered anti-slip floor in working vestibule
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(srvEndX, -halfW + 2.5, halfL - srvEndX - 2, car.width - 5);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.8;
      for (let vx = srvEndX + 5; vx < halfL - 4; vx += 5) {
        ctx.beginPath();
        ctx.moveTo(vx, -halfW + 5); ctx.lineTo(vx, halfW - 5);
        ctx.stroke();
      }

      // Outer boarding doors (North & South)
      for (const side of [-1, 1]) {
        const doorY = side === -1 ? -halfW + 1 : halfW - 3.5;
        ctx.fillStyle = '#475569';
        ctx.fillRect(srvEndX + 4, doorY, 20, 2.5);
        // Yellow boarding handrail
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(srvEndX + 3, doorY + (side === -1 ? 3 : -0.5));
        ctx.lineTo(srvEndX + 25, doorY + (side === -1 ? 3 : -0.5));
        ctx.stroke();
      }

      // Coal storage bunker box for titan (ящик для угля)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(srvEndX + 3, -11, 7, 22);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(srvEndX + 3, -11, 7, 22);

      // --- WINDOW CUTOUTS & PANORAMIC GLASS P用於 (BOTH WALLS) ---
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.9;

      // Compartment windows (top wall, y = -halfW)
      for (let i = 0; i < numComps; i++) {
        const winX = saloonStartX + i * compW + 9;
        ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
        ctx.fillRect(winX, -halfW + 0.5, compW - 18, 2.0);
        ctx.strokeRect(winX, -halfW + 0.5, compW - 18, 2.0);
      }

      // Corridor / Side-berth windows (bottom wall, y = halfW - 2.5)
      for (let i = 0; i < numComps; i++) {
        const winX = saloonStartX + i * compW + 9;
        ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
        ctx.fillRect(winX, halfW - 2.5, compW - 18, 2.0);
        ctx.strokeRect(winX, halfW - 2.5, compW - 18, 2.0);
      }

      // Conductor window
      ctx.fillRect(cDeskX, -halfW + 0.5, cDeskW, 2.0);
      ctx.strokeRect(cDeskX, -halfW + 0.5, cDeskW, 2.0);

    } else {
      // =======================================================================
      // --- 3.2. SOLID CORRUGATED ROOF RENDERING (КОГДА ИГРОК СНАРУЖИ) ---
      // =======================================================================
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
        const hLen = 32;
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
      const ventXs = [-roofL * 0.44, -roofL * 0.15, roofL * 0.15, roofL * 0.44];
      for (const vx of ventXs) {
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(vx, 0, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      // Boiler Heating Chimney (труба титана водонагревателя) at the working end
      const chimneyX = halfL - 62;
      const chimneyY = roofHalfW - 5.5;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(chimneyX, chimneyY, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78716c';
      ctx.beginPath();
      ctx.arc(chimneyX, chimneyY, 1.6, 0, Math.PI * 2);
      ctx.fill();

      // 6. Double-Glazed Windows with Warm Interior Night Lighting
      const windowColor = nightAlpha > 0.2 ? '#fef08a' : '#0284c7';
      ctx.fillStyle = windowColor;
      const numWindows = 11;
      const winL = 16;
      const winW = 2.4;
      const winStep = (roofL - 32) / (numWindows - 1);
      for (let w = 0; w < numWindows; w++) {
        const wx = -roofL / 2 + 16 + w * winStep - winL / 2;
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

    // RZD Brand, Car Class & Road Number Stencil
    if (!car.isPlayerInside) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 5.5px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const classLabel = isPlatskart ? 'ПЛАЦКАРТ' : 'КУПЕ';
      ctx.fillText(`${classLabel}  ${car.roadNumber || '018 24519'}`, 0, -roofHalfW + 3);

      // Route Destination Plaque (Маршрутная табличка)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-22, halfW - 6.0, 44, 2.2);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 3.8px sans-serif';
      ctx.fillText('МОСКВА — ВЛАДИВОСТОК', 0, halfW - 4.8);
    }

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
    _ctx: CanvasRenderingContext2D,
    _halfL: number,
    _halfW: number,
    _dir: 1 | -1,
    _nightAlpha: number,
    _speed: number
  ): void {
    // Legacy hard-edged triangle beam is replaced by the authentic physical optics
    // and lightmap cutouts in renderLightmapCutouts & renderLightmapOptics below.
  }

  // =========================================================================
  // --- 12. NIGHTTIME LIGHTMAP CUTOUTS (PASS 1: DESTINATION-OUT) ---
  // =========================================================================
  /**
   * Cuts darkness out of the lightmap so train headlights, windows, and cab lights
   * genuinely penetrate and illuminate the night world around them with natural
   * curved falloff and penumbra instead of hard polygon edges.
   */
  public static renderLightmapCutouts(
    lCtx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    nightAlpha: number,
    fogFactor: number = 1.0
  ): void {
    if (nightAlpha <= 0.04) return;
    const cars = world.rollingStock;
    if (!cars || cars.length === 0) return;

    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      const maxDim = Math.max(car.length, car.width) * 1.5;
      if (car.x + maxDim < minX - 600 || car.x - maxDim > maxX + 600 || car.y + maxDim < minY - 600 || car.y - maxDim > maxY + 600) {
        continue;
      }

      const halfL = car.length / 2;
      const halfW = car.width / 2;
      const isLead = car.hasHeadlight !== false && (car.hasHeadlight || car.type.startsWith('locomotive_') || TrainSystem.isHeadCar(car.id));
      const isTail = TrainSystem.isTailCar(car.id);
      const isPassenger = car.type.startsWith('passenger_') || car.type.includes('coach') || car.type.includes('platskart') || car.name?.includes('Рельсовый автобус');

      lCtx.save();
      lCtx.translate(car.x, car.y);
      lCtx.rotate(car.angle);

      // A. Forward Projector & Headlight Beam Cutout (Прожектор локомотива)
      if (isLead) {
        const beamLen = 540 * fogFactor;
        const beamHalfW = 120 * fogFactor;

        // 1. Natural volumetric beam with curved parabolic boundary and penumbra
        lCtx.save();
        lCtx.translate(halfL, 0);

        const coneGrad = lCtx.createRadialGradient(0, 0, 4, beamLen * 0.35, 0, beamLen);
        coneGrad.addColorStop(0.00, 'rgba(0, 0, 0, 1.0)');
        coneGrad.addColorStop(0.18, 'rgba(0, 0, 0, 0.90)');
        coneGrad.addColorStop(0.45, 'rgba(0, 0, 0, 0.60)');
        coneGrad.addColorStop(0.72, 'rgba(0, 0, 0, 0.25)');
        coneGrad.addColorStop(0.90, 'rgba(0, 0, 0, 0.08)');
        coneGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');

        lCtx.fillStyle = coneGrad;
        lCtx.beginPath();
        lCtx.moveTo(0, 0);
        lCtx.quadraticCurveTo(beamLen * 0.45, -beamHalfW * 0.55, beamLen, -beamHalfW);
        lCtx.bezierCurveTo(
          beamLen + 40, -beamHalfW * 0.5,
          beamLen + 40, beamHalfW * 0.5,
          beamLen, beamHalfW
        );
        lCtx.quadraticCurveTo(beamLen * 0.45, beamHalfW * 0.55, 0, 0);
        lCtx.closePath();
        lCtx.fill();
        lCtx.restore();

        // 2. High-intensity nose halo & dual buffer lights (diffuse ground illumination)
        const noseHalo = lCtx.createRadialGradient(halfL, 0, 2, halfL, 0, 65 * fogFactor);
        noseHalo.addColorStop(0.0, 'rgba(0, 0, 0, 0.95)');
        noseHalo.addColorStop(0.4, 'rgba(0, 0, 0, 0.50)');
        noseHalo.addColorStop(0.8, 'rgba(0, 0, 0, 0.15)');
        noseHalo.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
        lCtx.fillStyle = noseHalo;
        lCtx.beginPath();
        lCtx.arc(halfL, 0, 65 * fogFactor, 0, Math.PI * 2);
        lCtx.fill();

        // Left & right buffer light ground illumination
        for (const by of [-halfW + 6, halfW - 6]) {
          const bGrad = lCtx.createRadialGradient(halfL - 2, by, 1, halfL - 2, by, 36 * fogFactor);
          bGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
          bGrad.addColorStop(0.4, 'rgba(0, 0, 0, 0.35)');
          bGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.08)');
          bGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          lCtx.fillStyle = bGrad;
          lCtx.beginPath();
          lCtx.arc(halfL - 2, by, 36 * fogFactor, 0, Math.PI * 2);
          lCtx.fill();
        }

        // 3. Soft locomotive cab interior glow cutout
        const cabX = halfL - 35;
        const cabHalo = lCtx.createRadialGradient(cabX, 0, 1, cabX, 0, 32);
        cabHalo.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
        cabHalo.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
        cabHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
        lCtx.fillStyle = cabHalo;
        lCtx.beginPath();
        lCtx.arc(cabX, 0, 32, 0, Math.PI * 2);
        lCtx.fill();
      }

      // B. Passenger Coach & Railbus Windows Illumination (Individual soft-penumbra window pools)
      if (isPassenger) {
        if (car.isPlayerInside) {
          // Player is inside: fully illuminate interior carriage space so walls, tables, and floor are brightly visible
          lCtx.fillStyle = 'rgba(0, 0, 0, 1.0)';
          lCtx.beginPath();
          lCtx.roundRect(-halfL - 2, -halfW - 2, car.length + 4, car.width + 4, 3);
          lCtx.fill();
        }

        const roofL = car.length - 24;
        const numWindows = 9;
        const winStep = (roofL - 30) / numWindows;
        const winSpillRadius = 38 * fogFactor;

        // Render each individual window as a natural diffuse radial pool spilling onto the ground
        for (let w = 0; w < numWindows; w++) {
          const wx = -roofL / 2 + 15 + w * winStep + 7;
          for (const wy of [-halfW - 6, halfW + 6]) {
            const wGrad = lCtx.createRadialGradient(wx, wy, 1, wx, wy, winSpillRadius);
            wGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.75)');
            wGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.45)');
            wGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.12)');
            wGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
            lCtx.fillStyle = wGrad;
            lCtx.beginPath();
            lCtx.arc(wx, wy, winSpillRadius, 0, Math.PI * 2);
            lCtx.fill();
          }
        }

        // End vestibules warm glow
        for (const dir of [-1, 1]) {
          const vx = dir * (halfL - 10);
          const vGrad = lCtx.createRadialGradient(vx, 0, 1, vx, 0, 28);
          vGrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
          vGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.20)');
          vGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          lCtx.fillStyle = vGrad;
          lCtx.beginPath();
          lCtx.arc(vx, 0, 28, 0, Math.PI * 2);
          lCtx.fill();
        }
      }

      // C. Rear Red Tail Marker Light Cutout (Хвостовой сигнал)
      if (isTail) {
        const tailX = -halfL;
        const tGrad = lCtx.createRadialGradient(tailX, 0, 1, tailX, 0, 26 * fogFactor);
        tGrad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
        tGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
        tGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        lCtx.fillStyle = tGrad;
        lCtx.beginPath();
        lCtx.arc(tailX, 0, 26 * fogFactor, 0, Math.PI * 2);
        lCtx.fill();
      }

      lCtx.restore();
    }
  }

  // =========================================================================
  // --- 13. NIGHTTIME LIGHTMAP OPTICS (PASS 2: ADDITIVE 'LIGHTER') ---
  // =========================================================================
  /**
   * Draws brilliant optical flares, projector volumetric rays, and warm window
   * glows directly on top of the world with additive blending.
   * Uses realistic curved penumbra and soft diffusion (zero hard triangle/laser edges).
   */
  public static renderLightmapOptics(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    nightAlpha: number,
    fogFactor: number = 1.0
  ): void {
    if (nightAlpha <= 0.04) return;
    const cars = world.rollingStock;
    if (!cars || cars.length === 0) return;

    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      const maxDim = Math.max(car.length, car.width) * 1.5;
      if (car.x + maxDim < minX - 600 || car.x - maxDim > maxX + 600 || car.y + maxDim < minY - 600 || car.y - maxDim > maxY + 600) {
        continue;
      }

      const halfL = car.length / 2;
      const halfW = car.width / 2;
      const isLead = car.hasHeadlight !== false && (car.hasHeadlight || car.type.startsWith('locomotive_') || TrainSystem.isHeadCar(car.id));
      const isTail = TrainSystem.isTailCar(car.id);
      const isPassenger = car.type.startsWith('passenger_') || car.type.includes('coach') || car.type.includes('platskart') || car.name?.includes('Рельсовый автобус');

      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);

      // A. Locomotive Projector & Headlights Volumetric Scattering (Additive)
      if (isLead) {
        const beamLen = 540 * fogFactor;
        const beamOriginX = halfL;
        const beamHalfW = 120 * fogFactor;

        // 1. Broad Volumetric Scattering with soft curved boundary and gaussian-like falloff
        ctx.save();
        ctx.translate(beamOriginX, 0);

        const beamGrad = ctx.createRadialGradient(10, 0, 5, beamLen * 0.4, 0, beamLen);
        beamGrad.addColorStop(0.00, `rgba(255, 248, 220, ${0.40 * nightAlpha})`);
        beamGrad.addColorStop(0.25, `rgba(255, 240, 180, ${0.22 * nightAlpha})`);
        beamGrad.addColorStop(0.55, `rgba(255, 230, 150, ${0.08 * nightAlpha})`);
        beamGrad.addColorStop(0.85, `rgba(255, 220, 120, ${0.02 * nightAlpha})`);
        beamGrad.addColorStop(1.00, 'rgba(255, 220, 120, 0)');

        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(beamLen * 0.45, -beamHalfW * 0.55, beamLen, -beamHalfW);
        ctx.bezierCurveTo(
          beamLen + 40, -beamHalfW * 0.5,
          beamLen + 40, beamHalfW * 0.5,
          beamLen, beamHalfW
        );
        ctx.quadraticCurveTo(beamLen * 0.45, beamHalfW * 0.55, 0, 0);
        ctx.closePath();
        ctx.fill();

        // 2. Soft Forward Optical Core (Natural smooth beam spine)
        const coreGrad = ctx.createRadialGradient(2, 0, 2, beamLen * 0.35, 0, beamLen * 0.65);
        coreGrad.addColorStop(0.00, `rgba(255, 255, 255, ${0.55 * nightAlpha})`);
        coreGrad.addColorStop(0.35, `rgba(255, 250, 225, ${0.22 * nightAlpha})`);
        coreGrad.addColorStop(0.70, `rgba(255, 240, 195, ${0.06 * nightAlpha})`);
        coreGrad.addColorStop(1.00, 'rgba(255, 240, 195, 0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(beamLen * 0.35, -28 * fogFactor, beamLen * 0.65, -35 * fogFactor);
        ctx.quadraticCurveTo(beamLen * 0.70, 0, beamLen * 0.65, 35 * fogFactor);
        ctx.quadraticCurveTo(beamLen * 0.35, 28 * fogFactor, 0, 0);
        ctx.closePath();
        ctx.fill();

        // 3. Projector Lens Flare & Glare Core
        const flareGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 18);
        flareGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
        flareGrad.addColorStop(0.25, 'rgba(255, 248, 210, 0.65)');
        flareGrad.addColorStop(0.65, 'rgba(255, 230, 140, 0.20)');
        flareGrad.addColorStop(1.0, 'rgba(255, 220, 100, 0)');
        ctx.fillStyle = flareGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // 4. Front Buffer Lights Additive Optics
        for (const by of [-halfW + 6, halfW - 6]) {
          const bGrad = ctx.createRadialGradient(halfL - 2, by, 1, halfL - 2, by, 14);
          bGrad.addColorStop(0.0, `rgba(255, 252, 235, ${0.85 * nightAlpha})`);
          bGrad.addColorStop(0.4, `rgba(255, 235, 170, ${0.35 * nightAlpha})`);
          bGrad.addColorStop(1.0, 'rgba(255, 210, 120, 0)');
          ctx.fillStyle = bGrad;
          ctx.beginPath();
          ctx.arc(halfL - 2, by, 14, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // B. Passenger Coach & Railbus Windows Interior Glow (Additive)
      if (isPassenger) {
        const roofL = car.length - 24;
        const numWindows = 9;
        const winStep = (roofL - 30) / numWindows;
        for (let w = 0; w < numWindows; w++) {
          const wx = -roofL / 2 + 15 + w * winStep;
          for (const wy of [-halfW + 2, halfW - 2]) {
            const wGrad = ctx.createRadialGradient(wx + 7, wy, 1, wx + 7, wy, 16);
            wGrad.addColorStop(0.0, `rgba(254, 240, 138, ${0.55 * nightAlpha})`);
            wGrad.addColorStop(0.45, `rgba(254, 215, 100, ${0.20 * nightAlpha})`);
            wGrad.addColorStop(1.0, 'rgba(254, 180, 50, 0)');
            ctx.fillStyle = wGrad;
            ctx.beginPath();
            ctx.arc(wx + 7, wy, 16, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // C. Rear Red Tail Marker Light (Additive)
      if (isTail) {
        const tailX = -halfL;
        const tGrad = ctx.createRadialGradient(tailX, 0, 1, tailX, 0, 18);
        tGrad.addColorStop(0.0, `rgba(239, 68, 68, ${0.90 * nightAlpha})`);
        tGrad.addColorStop(0.4, `rgba(220, 38, 38, ${0.40 * nightAlpha})`);
        tGrad.addColorStop(1.0, 'rgba(185, 28, 28, 0)');
        ctx.fillStyle = tGrad;
        ctx.beginPath();
        ctx.arc(tailX, 0, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}

