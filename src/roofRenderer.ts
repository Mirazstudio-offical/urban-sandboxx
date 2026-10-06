import { Building, GameWorld, Player } from './types';
import { performanceConfig } from './performanceConfig';
import { getCityApartments } from './propertySystem';

/**
 * High-Fidelity First-Principles Simulation Roof Renderer:
 * - Authentic bituminous roll roofing (рубероид) with melted tar overlap seams and mineral slate grit
 * - Modern commercial polymeric TPO/PVC membranes with thermo-welded joints and non-slip service walkways
 * - Authentic rural izba gable roofs: sinusoidal corrugated slate (волновой шифер), standing seam metal (фальц), and wooden shakes
 * - Heavy industrial trapezoidal sheet metal (профнастил Н-75) with structural purlin fasteners and skylight lanterns
 * - Natural weathering: rainwater depression puddles, rust streaks from metal flashings, and shaded moss
 * - Architectural rooftop infrastructure: brick/concrete ventilation ducts, lift machine penthouses, fire hatches,
 *   internal drain scuppers, spinning HVAC chillers, solar arrays, helipads, and water towers.
 */

// Deterministic fast PRNG hash for texture coordinates (avoids frame-to-frame flicker)
function roofNoise(x: number, y: number, seed: number = 0): number {
  let h = (Math.imul(Math.floor(x) ^ 0x27d4eb2d, 0x165667b1) ^ Math.imul(Math.floor(y) ^ 0x85ebca6b, 0x9e3779b9) ^ seed) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 13), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export class RoofRenderer {
  /**
   * Main entry point to render building roofs and canopies
   */
  public static renderBuildingRoofs(
    ctx: CanvasRenderingContext2D,
    buildings: Building[],
    nightAlpha: number = 0,
    player?: Player,
    world?: GameWorld
  ): void {
    const now = Date.now();

    for (const bld of buildings) {
      // 1. Skip if player is currently inside this building (reveals interior layout)
      const isPlayerInside = player && (
        (player.isInsideBuilding && player.insideBuildingId === bld.id) ||
        (player.x >= bld.x - 4 && player.x <= bld.x + bld.width + 4 &&
         player.y >= bld.y - 4 && player.y <= bld.y + bld.height + 4)
      );
      if (isPlayerInside) continue;

      // 2. Specialized architectural types delegated to existing specialized renderers
      if (bld.type === 'gas_station_canopy' || bld.type === 'gas_station_island' || bld.type === 'park_monument') {
        continue;
      }
      if (
        bld.type === 'garage_cooperative' ||
        bld.type === 'garage_box' ||
        bld.type === 'garage_workshop' ||
        bld.type === 'garage_gatehouse' ||
        bld.type === 'garage_substation' ||
        bld.type === 'garage_ramp' ||
        (bld.id && bld.id.startsWith('garage_gsk_'))
      ) {
        continue; // Handled by GarageCooperativeRenderer
      }
      if (
        bld.type === 'railway_station' ||
        bld.type === 'railway_warehouse' ||
        bld.type === 'railway_crossing_post'
      ) {
        continue; // Handled by RailwayRenderer
      }

      // 3. Render rural wooden izba gable roof
      if (bld.type === 'suburban') {
        RoofRenderer.renderSuburbanGableRoof(ctx, bld, nightAlpha, now);
        continue;
      }

      // 4. Render industrial factory / warehouse corrugated roof
      if (bld.type === 'industrial') {
        RoofRenderer.renderIndustrialRoof(ctx, bld, nightAlpha, now);
        continue;
      }

      // 5. Render urban flat roof (Residential, Offices, Commercial, Retail, Public)
      RoofRenderer.renderFlatBuildingRoof(ctx, bld, nightAlpha, now);
    }
  }

  // =========================================================================
  // 1. RURAL IZBA GABLE ROOF (ДВУСКАТНАЯ КРЫША СРУБА / ДЕРЕВЕНСКОГО ДОМА)
  // =========================================================================
  public static renderSuburbanGableRoof(
    ctx: CanvasRenderingContext2D,
    bld: Building,
    nightAlpha: number,
    now: number
  ): void {
    const isAbandoned = bld.id ? bld.id.includes('abandoned') : false;
    const isBarn = bld.id ? bld.id.includes('barn') : false;
    const seed = Math.abs(bld.x * 31 + bld.y * 17);

    // Eaves overhang (вынос карнизных свесов)
    const eX = bld.x - 4;
    const eY = bld.y - 4;
    const eW = bld.width + 8;
    const eH = bld.height + 8;
    const midY = eY + eH / 2;
    const slopeH = eH / 2;

    // A. Overhang drop shadow onto ground / walls
    if (performanceConfig.enableShadows) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
      ctx.fillRect(eX + 4, eY + 4, eW, eH);
    }

    // Material selector based on building ID & seed:
    // - Most village izbas: Corrugated Asbestos Slate (волнистый шифер)
    // - Abandoned / aged: Weathered wood shingle (дранка / тёс)
    // - Barn / sheds: Rusted corrugated iron (ржавый профлист/жесть)
    const materialType: 'shifer' | 'wood_shingle' | 'metal_sheet' = 
      isAbandoned ? 'wood_shingle' : (isBarn ? 'metal_sheet' : ((seed % 3 === 0) ? 'metal_sheet' : 'shifer'));

    // B. Base Slopes Rendering (North = shaded, South = sunlit)
    if (materialType === 'shifer') {
      // --- ВОЛНИСТЫЙ ШИФЕР С СВЕТОТЕНЕВЫМ ПРОФИЛЕМ ВОЛНЫ ---
      const northBase = isAbandoned ? '#334155' : '#475569';
      const southBase = isAbandoned ? '#3b495d' : '#526075';

      // North Slope (shaded)
      ctx.fillStyle = northBase;
      ctx.fillRect(eX, eY, eW, slopeH);

      // South Slope (warmer daylight)
      ctx.fillStyle = southBase;
      ctx.fillRect(eX, midY, eW, slopeH);

      // Daytime sunlight warm sheen
      if (nightAlpha < 0.6) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(0.07 * (1 - nightAlpha)).toFixed(3)})`;
        ctx.fillRect(eX, midY, eW, slopeH);
      }

      // Wave profile (шаг волны 10px: гребень светлее, впадина темнее)
      const waveStep = 8;
      for (let wx = eX + 3; wx < eX + eW - 3; wx += waveStep) {
        // Wave trough shadow (тень во впадине)
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.32)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(wx, eY);
        ctx.lineTo(wx, eY + eH);
        ctx.stroke();

        // Wave crest highlight (свет на гребне)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(wx + waveStep / 2, eY);
        ctx.lineTo(wx + waveStep / 2, eY + eH);
        ctx.stroke();
      }

      // Horizontal sheet overlap courses (нахлёст листов шифера по высоте)
      const numCourses = Math.max(2, Math.floor(slopeH / 16));
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.lineWidth = 1.4;
      for (let c = 1; c < numCourses; c++) {
        const ny = eY + (slopeH / numCourses) * c;
        const sy = midY + (slopeH / numCourses) * c;
        ctx.beginPath();
        ctx.moveTo(eX, ny); ctx.lineTo(eX + eW, ny);
        ctx.moveTo(eX, sy); ctx.lineTo(eX + eW, sy);
        ctx.stroke();

        // Fastener nails with round rubber washers on wave crests
        if (!performanceConfig.lowQualityRendering) {
          ctx.fillStyle = '#1e293b';
          for (let wx = eX + 3 + waveStep / 2; wx < eX + eW - 3; wx += waveStep * 2) {
            ctx.fillRect(wx - 0.7, ny - 1.5, 1.4, 1.4);
            ctx.fillRect(wx - 0.7, sy - 1.5, 1.4, 1.4);
          }
        }
      }

      // Natural weathered lichen & green moss along shaded northern eave
      ctx.fillStyle = 'rgba(77, 124, 15, 0.45)';
      for (let mx = eX + 4; mx < eX + eW - 6; mx += 14) {
        const mossDepth = 2 + (roofNoise(mx, eY, 11) * 4);
        ctx.fillRect(mx, eY, 10, mossDepth);
      }
    } else if (materialType === 'metal_sheet') {
      // --- ФАЛЬЦЕВАЯ КРОВЛЯ / РЖАВЫЙ ПРОФЛИСТ С СТОЯЧИМИ ФАЛЬЦАМИ ---
      const baseCol = isBarn ? '#582c16' : (bld.roofColor || '#3b4352');
      ctx.fillStyle = baseCol;
      ctx.fillRect(eX, eY, eW, slopeH);
      ctx.fillStyle = isBarn ? '#6d371d' : '#475163';
      ctx.fillRect(eX, midY, eW, slopeH);

      // Standing seam lock ribs (стоячие фальцы через 12px)
      const seamStep = 11;
      for (let sx = eX + 4; sx < eX + eW - 4; sx += seamStep) {
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(sx, eY); ctx.lineTo(sx, eY + eH);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(sx + 0.8, eY); ctx.lineTo(sx + 0.8, eY + eH);
        ctx.stroke();
      }

      // Corrosion & rust spots on barn/shed
      if (isBarn || isAbandoned) {
        ctx.fillStyle = 'rgba(154, 52, 18, 0.5)';
        for (let rx = eX + 6; rx < eX + eW - 12; rx += 20) {
          const ry = eY + 4 + roofNoise(rx, eY, 77) * (eH - 12);
          ctx.beginPath();
          ctx.ellipse(rx, ry, 6, 3, 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      // --- ДЕРЕВЯННАЯ ДРАНКА / ТЁС СО СМЕЩЁННЫМИ ПЛАШКАМИ ---
      ctx.fillStyle = '#2c1e13';
      ctx.fillRect(eX, eY, eW, slopeH);
      ctx.fillStyle = '#3a281a';
      ctx.fillRect(eX, midY, eW, slopeH);

      // Horizontal courses of shingles with staggered vertical splits
      const courseH = 6;
      for (let cy = eY; cy < eY + eH; cy += courseH) {
        ctx.strokeStyle = 'rgba(10, 6, 4, 0.55)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(eX, cy); ctx.lineTo(eX + eW, cy);
        ctx.stroke();

        const offset = (cy % (courseH * 2) === 0) ? 0 : 7;
        for (let sx = eX + offset; sx < eX + eW; sx += 14) {
          ctx.strokeStyle = 'rgba(15, 8, 4, 0.35)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(sx, cy); ctx.lineTo(sx, cy + courseH);
          ctx.stroke();
        }
      }
    }

    // C. Massive Central Ridge Beam (Конёк крыши с оцинкованным или деревянным уголком)
    ctx.fillStyle = '#1e140d';
    ctx.fillRect(eX, midY - 3, eW, 6);
    ctx.strokeStyle = '#0f0a07';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(eX, midY - 3, eW, 6);
    // Ridge highlight reflection
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(eX, midY - 1); ctx.lineTo(eX + eW, midY - 1);
    ctx.stroke();

    // D. Outer Carved Eaves Fascia Boards (Лобовые доски / ветровые планки)
    ctx.fillStyle = '#24160d';
    ctx.fillRect(eX, eY, 3, eH);
    ctx.fillRect(eX + eW - 3, eY, 3, eH);

    // E. Abandoned House Fracture & Broken Rafters
    if (isAbandoned) {
      const holeX = eX + eW * 0.35;
      const holeY = eY + eH * 0.22;
      const holeW = Math.min(eW * 0.45, 55);
      const holeH = Math.min(eH * 0.55, 34);

      // Dark gaping hole into pitch-black attic void
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.roundRect(holeX, holeY, holeW, holeH, 4);
      ctx.fill();

      // Exposed broken purlin & rafter rafters (сломанная стропильная система)
      ctx.strokeStyle = '#3e2717';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(holeX + 3, holeY);
      ctx.lineTo(holeX + holeW - 4, holeY + holeH);
      ctx.moveTo(holeX + 8, holeY);
      ctx.lineTo(holeX + holeW - 8, holeY + holeH - 2);
      ctx.moveTo(holeX, holeY + holeH * 0.4);
      ctx.lineTo(holeX + holeW, holeY + holeH * 0.6);
      ctx.stroke();

      // Splintered wood edges
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(holeX + 4, holeY + 2);
      ctx.lineTo(holeX + 12, holeY + 8);
      ctx.moveTo(holeX + holeW - 10, holeY + holeH - 4);
      ctx.lineTo(holeX + holeW - 2, holeY + holeH);
      ctx.stroke();

      // Wild green moss overgrowing the broken roof edges
      ctx.fillStyle = '#4d7c0f';
      ctx.beginPath();
      ctx.arc(holeX + 2, holeY + 3, 3.5, 0, Math.PI * 2);
      ctx.arc(holeX + holeW - 2, holeY + 4, 4.0, 0, Math.PI * 2);
      ctx.arc(holeX + 6, holeY + holeH - 2, 3.0, 0, Math.PI * 2);
      ctx.fill();
    } else if (!isBarn) {
      // F. Clay Brick Chimney (Печная труба с распушкой, дымником и металлическим воротником)
      const chimX = eX + Math.min(eW * 0.22, 28);
      const chimY = eY + slopeH * 0.45;
      const chimW = 9;
      const chimH = 9;

      // Chimney drop shadow onto roof slope
      if (performanceConfig.enableShadows) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(chimX + 2.5, chimY + 2.5, chimW, chimH);
      }

      // Galvanized metal collar flashing (фартук примыкания из оцинковки)
      ctx.fillStyle = '#64748b';
      ctx.fillRect(chimX - 2, chimY - 2, chimW + 4, chimH + 4);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(chimX - 2, chimY - 2, chimW + 4, chimH + 4);

      // Red clay brick body
      ctx.fillStyle = '#8b251e';
      ctx.fillRect(chimX, chimY, chimW, chimH);
      ctx.strokeStyle = '#50130f';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(chimX, chimY, chimW, chimH);

      // Mortar seams on brickwork
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(chimX, chimY + 3); ctx.lineTo(chimX + chimW, chimY + 3);
      ctx.moveTo(chimX, chimY + 6); ctx.lineTo(chimX + chimW, chimY + 6);
      ctx.stroke();

      // Dark galvanized storm cowl / rain cap (колпак-дымник с ножками)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(chimX - 1, chimY - 1, chimW + 2, 3.5);
      // Flue smoke vent core
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(chimX + 1.5, chimY + 2.5, chimW - 3, chimH - 4);

      // Gentle realistic woodsmoke plume drifting northeast from active izba
      if (bld.id === 'bld_village_izba_1' || bld.id === 'bld_village_izba_3') {
        const smokeTime = (now / 1500);
        for (let p = 0; p < 4; p++) {
          const pTime = (smokeTime + p * 1.25) % 5.0;
          const progress = pTime / 5.0; // 0 to 1
          const driftX = chimX + chimW / 2 + progress * 32 + Math.sin(smokeTime + p * 1.5) * 4;
          const driftY = chimY + chimH / 2 - progress * 30;
          const size = 3.0 + progress * 8.5;
          const alpha = (1 - progress) * 0.25 * Math.max(0.15, 1 - nightAlpha * 0.75);

          ctx.fillStyle = `rgba(203, 213, 225, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(driftX, driftY, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // =========================================================================
  // 2. INDUSTRIAL WAREHOUSE / FACTORY ROOF (ПРОМЫШЛЕННЫЙ ЦЕХ / АНГАР)
  // =========================================================================
  public static renderIndustrialRoof(
    ctx: CanvasRenderingContext2D,
    bld: Building,
    nightAlpha: number,
    now: number
  ): void {
    const rx = bld.x;
    const ry = bld.y;
    const rw = bld.width;
    const rh = bld.height;

    // A. Drop shadow of building structure
    if (performanceConfig.enableShadows) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
      ctx.fillRect(rx + 8, ry + 8, rw, rh);
    }

    // B. Heavy industrial profiled trapezoidal steel sheets (Профнастил Н-75)
    ctx.fillStyle = bld.roofColor || '#2d3748';
    ctx.fillRect(rx, ry, rw, rh);

    const isHorizontalProfile = rw >= rh;
    const ribStep = 7;

    // 3D Trapezoidal flute ribs (трапециевидная волна: глубокая тень + яркий гребень)
    ctx.beginPath();
    if (isHorizontalProfile) {
      for (let gx = rx + 6; gx < rx + rw - 4; gx += ribStep) {
        // Shaded flute depression
        ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
        ctx.fillRect(gx, ry + 1, 2.5, rh - 2);

        // Highlighted crown rib
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.fillRect(gx + 2.5, ry + 1, 1.8, rh - 2);
      }
    } else {
      for (let gy = ry + 6; gy < ry + rh - 4; gy += ribStep) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
        ctx.fillRect(rx + 1, gy, rw - 2, 2.5);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.fillRect(rx + 1, gy + 2.5, rw - 2, 1.8);
      }
    }

    // Purlin fastener rows (саморезы с уплотнительными шайбами по прогонам)
    if (!performanceConfig.lowQualityRendering) {
      ctx.fillStyle = '#0f172a';
      const purlinStep = 32;
      if (isHorizontalProfile) {
        for (let py = ry + 12; py < ry + rh - 8; py += purlinStep) {
          for (let gx = rx + 6; gx < rx + rw - 6; gx += ribStep * 2) {
            ctx.fillRect(gx + 1, py, 1.4, 1.4);
          }
        }
      }
    }

    // Natural atmospheric weathering & oxidized runoff streaks
    ctx.fillStyle = 'rgba(120, 53, 15, 0.22)';
    for (let ox = rx + 12; ox < rx + rw - 20; ox += 36) {
      const streakW = 6 + (roofNoise(ox, ry, 5) * 8);
      ctx.fillRect(ox, ry + 2, streakW, Math.min(rh * 0.45, 30));
    }

    // Heavy perimeter flashings & parapet trims (нащельники и оцинкованные карнизы)
    ctx.strokeStyle = '#1a202c';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(rx + 1.5, ry + 1.5, rw - 3, rh - 3);

    // C. Continuous Industrial Ridge Skylight Lantern (Светоаэрационный зенитный фонарь)
    if (rw > 50 && rh > 35) {
      const skyW = isHorizontalProfile ? Math.min(rw * 0.65, rw - 24) : rw - 14;
      const skyH = isHorizontalProfile ? Math.min(22, rh * 0.35) : Math.min(rh * 0.65, rh - 24);
      const skyX = rx + (rw - skyW) / 2;
      const skyY = ry + (rh - skyH) / 2;

      // Drop shadow of raised lantern structure
      if (performanceConfig.enableShadows) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(skyX + 3, skyY + 3, skyW, skyH);
      }

      // Reinforced industrial wire-glass panes
      ctx.fillStyle = 'rgba(14, 116, 144, 0.9)';
      ctx.fillRect(skyX, skyY, skyW, skyH);
      ctx.strokeStyle = '#0891b2';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(skyX, skyY, skyW, skyH);

      // Steel structural glazing bars / mullions
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      if (isHorizontalProfile) {
        for (let mx = skyX + 10; mx < skyX + skyW; mx += 10) {
          ctx.moveTo(mx, skyY); ctx.lineTo(mx, skyY + skyH);
        }
      } else {
        for (let my = skyY + 10; my < skyY + skyH; my += 10) {
          ctx.moveTo(skyX, my); ctx.lineTo(skyX + skyW, my);
        }
      }
      ctx.stroke();

      // Translucent ridge ventilator louvers on top of skylight
      ctx.fillStyle = '#1e293b';
      const ventW = isHorizontalProfile ? skyW * 0.8 : skyW - 4;
      const ventH = isHorizontalProfile ? 4 : skyH * 0.8;
      const ventX = skyX + (skyW - ventW) / 2;
      const ventY = skyY + (skyH - ventH) / 2;
      ctx.fillRect(ventX, ventY, ventW, ventH);
    }

    // D. Heavy Industrial Smokestack on major manufacturing plants
    if (bld.id && (bld.id.includes('mfg') || bld.id.includes('hub') || bld.id.includes('9_0') || bld.id.includes('8_3') || bld.id.includes('factory'))) {
      const chimX = rx + Math.min(26, rw * 0.25);
      const chimY = ry + Math.min(26, rh * 0.25);
      const chimR = 9;

      // Smokestack projection shadow
      if (performanceConfig.enableShadows) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.beginPath();
        ctx.arc(chimX + 5, chimY + 5, chimR + 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Reinforced brick/concrete base
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.arc(chimX, chimY, chimR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#450a0a';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Aviation safety red/white stripes on rim
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(chimX, chimY, chimR * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(chimX, chimY, chimR * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Black exhaust orifice core
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(chimX, chimY, chimR * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Heavy industrial exhaust plume drifting away
      const smokeTime = (now / 1400);
      for (let p = 0; p < 5; p++) {
        const pTime = (smokeTime + p * 1.1) % 5.5;
        const progress = pTime / 5.5;
        const driftX = chimX + progress * 42 + Math.sin(smokeTime + p) * 5;
        const driftY = chimY - progress * 32;
        const size = 4.0 + progress * 11;
        const alpha = (1 - progress) * 0.28 * Math.max(0.18, 1 - nightAlpha * 0.72);

        ctx.fillStyle = `rgba(203, 213, 225, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(driftX, driftY, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // E. Rooftop Warehouse Signboard / Facility Designation
    if (bld.name && rw > 90) {
      const signW = Math.min(210, rw - 28);
      const signH = 14;
      const signX = rx + (rw - signW) / 2;
      const signY = ry + 6;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(signX, signY, signW, signH);
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(signX, signY, signW, signH);

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bld.name.toUpperCase(), signX + signW / 2, signY + signH / 2);
    }
  }

  // =========================================================================
  // 3. URBAN FLAT ROOF (RESIDENTIAL, OFFICES, COMMERCIAL & RETAIL)
  // =========================================================================
  public static renderFlatBuildingRoof(
    ctx: CanvasRenderingContext2D,
    bld: Building,
    nightAlpha: number,
    now: number
  ): void {
    const isCommercial = bld.shopBrand !== undefined || 
      ['commercial', 'shop', 'shopping_mall', 'car_dealership', 'supermarket_store', 'pharmacy_store', 'electronics_store', 'sports_store', 'fast_food_restaurant', 'pizzeria_restaurant'].includes(bld.type);

    const isModernHighrise = bld.type === 'modern_residential' || bld.type === 'business_center';

    const bx = bld.x;
    const by = bld.y;
    const bw = bld.width;
    const bh = bld.height;

    // 1. Structural Parapet Wall Border (Парапетное ограждение по внешнему периметру)
    ctx.fillStyle = bld.roofColor || (isCommercial ? '#242933' : '#1e2430');
    ctx.fillRect(bx + 3, by + 3, bw - 6, bh - 6);

    // Parapet coping with galvanized metal caps and accent coping line
    ctx.strokeStyle = bld.accentColor || (isCommercial ? '#475569' : '#334155');
    ctx.lineWidth = isCommercial ? 3.0 : 2.4;
    ctx.strokeRect(bx + 3, by + 3, bw - 6, bh - 6);

    // Parapet expansion joint cuts (стыки защитных металлических фартуков парапета)
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.lineWidth = 1.0;
    const jointStep = 28;
    for (let jx = bx + 16; jx < bx + bw - 16; jx += jointStep) {
      ctx.beginPath();
      ctx.moveTo(jx, by + 1.5); ctx.lineTo(jx, by + 4.5);
      ctx.moveTo(jx, by + bh - 4.5); ctx.lineTo(jx, by + bh - 1.5);
      ctx.stroke();
    }
    for (let jy = by + 16; jy < by + bh - 16; jy += jointStep) {
      ctx.beginPath();
      ctx.moveTo(bx + 1.5, jy); ctx.lineTo(bx + 4.5, jy);
      ctx.moveTo(bx + bw - 4.5, jy); ctx.lineTo(bx + bw - 1.5, jy);
      ctx.stroke();
    }

    // 2. Inner Roof Bed (Основной ковёр кровли: Рубероид vs ПВХ-мембрана)
    const rx = bx + 5;
    const ry = by + 5;
    const rw = bw - 10;
    const rh = bh - 10;

    if (rw <= 8 || rh <= 8) return;

    // Parapet inner shadow (падающая внутренняя тень от парапета на плоскость кровли)
    ctx.fillStyle = 'rgba(10, 15, 25, 0.45)';
    ctx.fillRect(rx, ry, rw, rh);

    if (isCommercial || isModernHighrise) {
      // --- СОВРЕМЕННАЯ ПВХ / ТПО КРОВЕЛЬНАЯ МЕМБРАНА ---
      RoofRenderer.renderPvcMembraneRoof(ctx, rx, ry, rw, rh, bld);
    } else {
      // --- КЛАССИЧЕСКИЙ РУЛОННЫЙ РУБЕРОИД С МИНЕРАЛЬНОЙ ПОСЫПКОЙ И БИТУМНЫМИ ШВАМИ ---
      RoofRenderer.renderBitumenRollRoof(ctx, rx, ry, rw, rh, bld);
    }

    // 3. Environmental Weathering: Rainwater Depressions, Puddles & Efflorescence
    RoofRenderer.renderRooftopWeathering(ctx, rx, ry, rw, rh, bld);

    // 4. Roof Access Structures: Penthouse, Ventilation Risers & Roof Hatches
    if (isCommercial) {
      RoofRenderer.renderCommercialRooftopEquipment(ctx, rx, ry, rw, rh, bld, now);
    } else {
      RoofRenderer.renderResidentialMechanicalPenthouse(ctx, rx, ry, rw, rh, bld);
      RoofRenderer.renderVentilationDuctsAndHatch(ctx, rx, ry, rw, rh, bld);
    }

    // 5. Special Roof Details (AC Chillers with rotating fans, Helipads, Solar Panels, Water Towers, Antennas)
    RoofRenderer.renderBuildingRoofDetails(ctx, bld, now);

    // 6. Rooftop Brand Marquees & Identification Signboards
    RoofRenderer.renderBrandSignage(ctx, bld, now);

    // 7. City Address Plaque
    RoofRenderer.renderAddressPlaque(ctx, bld);
  }

  // -------------------------------------------------------------------------
  // Helper: Bituminous Roll Felt Roofing (Рубероид с нахлёстами и посыпкой)
  // -------------------------------------------------------------------------
  private static renderBitumenRollRoof(
    ctx: CanvasRenderingContext2D,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    bld: Building
  ): void {
    // Anthracite/Charcoal base
    ctx.fillStyle = '#171a21';
    ctx.fillRect(rx, ry, rw, rh);

    // Roll strips laid horizontally or vertically depending on aspect ratio
    const isHorizontal = rw >= rh;
    const rollWidth = 14;

    if (isHorizontal) {
      for (let y = ry; y < ry + rh; y += rollWidth) {
        const curH = Math.min(rollWidth, ry + rh - y);
        const rollSeed = roofNoise(rx, y, 17);
        // Subtle micro-tone variance per roll strip
        const tone = 20 + Math.floor(rollSeed * 7);
        ctx.fillStyle = `rgb(${tone}, ${tone + 2}, ${tone + 5})`;
        ctx.fillRect(rx, y, rw, curH);

        // Melted bitumen welded overlap seam line (наплавленный битумный шов)
        ctx.strokeStyle = '#0b0d11';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(rx, y + curH); ctx.lineTo(rx + rw, y + curH);
        ctx.stroke();

        // Slight bitumen sheen edge
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(rx, y + curH - 1); ctx.lineTo(rx + rw, y + curH - 1);
        ctx.stroke();
      }
    } else {
      for (let x = rx; x < rx + rw; x += rollWidth) {
        const curW = Math.min(rollWidth, rx + rw - x);
        const rollSeed = roofNoise(x, ry, 17);
        const tone = 20 + Math.floor(rollSeed * 7);
        ctx.fillStyle = `rgb(${tone}, ${tone + 2}, ${tone + 5})`;
        ctx.fillRect(x, ry, curW, rh);

        ctx.strokeStyle = '#0b0d11';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x + curW, ry); ctx.lineTo(x + curW, ry + rh);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(x + curW - 1, ry); ctx.lineTo(x + curW - 1, ry + rh);
        ctx.stroke();
      }
    }

    // Mineral slate ballast sprinkling (посыпка каменной крошкой)
    if (!performanceConfig.lowQualityRendering) {
      const step = 6;
      for (let gx = rx + 3; gx < rx + rw - 3; gx += step) {
        for (let gy = ry + 3; gy < ry + rh - 3; gy += step) {
          const gn = roofNoise(gx, gy, 89);
          if (gn > 0.62) {
            ctx.fillStyle = gn > 0.85 ? 'rgba(203, 213, 225, 0.18)' : 'rgba(0, 0, 0, 0.35)';
            ctx.fillRect(gx + ((gn * 5) % 3), gy + ((gn * 7) % 3), 1.2, 1.2);
          }
        }
      }
    }

    // Internal roof drainage scuppers / hoppers (водоприёмные воронки внутреннего водостока)
    const numDrains = Math.max(1, Math.floor((rw * rh) / 3800));
    const drainSpacingX = rw / (numDrains + 1);
    for (let d = 1; d <= numDrains; d++) {
      const dx = rx + drainSpacingX * d;
      const dy = ry + rh * 0.5 + (roofNoise(dx, ry, 41) - 0.5) * (rh * 0.4);

      // Radial slope depression to drain
      ctx.fillStyle = 'rgba(10, 12, 18, 0.5)';
      ctx.beginPath();
      ctx.arc(dx, dy, 7, 0, Math.PI * 2);
      ctx.fill();

      // Drain hopper clamping ring & strainer dome (воронка с защитным гравиеуловителем)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(dx, dy, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Strainer spider ribs
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(dx - 2.5, dy); ctx.lineTo(dx + 2.5, dy);
      ctx.moveTo(dx, dy - 2.5); ctx.lineTo(dx, dy + 2.5);
      ctx.stroke();
    }
  }

  // -------------------------------------------------------------------------
  // Helper: Polymeric PVC/TPO Membrane (ПВХ-мембрана с дорожками обслуживания)
  // -------------------------------------------------------------------------
  private static renderPvcMembraneRoof(
    ctx: CanvasRenderingContext2D,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    bld: Building
  ): void {
    // Slate-gray polymeric membrane base
    ctx.fillStyle = '#262b35';
    ctx.fillRect(rx, ry, rw, rh);

    // Hot-air welded joint bands (термосварные швы между рулонами 20px)
    const bandW = 20;
    ctx.strokeStyle = '#1b1f26';
    ctx.lineWidth = 1.5;
    for (let x = rx + bandW; x < rx + rw; x += bandW) {
      ctx.beginPath();
      ctx.moveTo(x, ry); ctx.lineTo(x, ry + rh);
      ctx.stroke();
      // Heat-weld shiny micro-line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x - 0.8, ry); ctx.lineTo(x - 0.8, ry + rh);
      ctx.stroke();
    }

    // Non-slip maintenance walkway tracks (технологические дорожки обслуживания желтовато-серые)
    if (rw > 45 && rh > 35) {
      const walkW = 10;
      const walkX = rx + rw * 0.3;
      const walkY = ry + 8;
      const walkH = rh - 16;

      ctx.fillStyle = '#3a414e';
      ctx.fillRect(walkX, walkY, walkW, walkH);
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(walkX, walkY, walkW, walkH);

      // Diamond tread pattern on walkway
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 0.6;
      for (let wy = walkY + 3; wy < walkY + walkH; wy += 4) {
        ctx.beginPath();
        ctx.moveTo(walkX + 1, wy); ctx.lineTo(walkX + walkW - 1, wy);
        ctx.stroke();
      }
    }
  }

  // -------------------------------------------------------------------------
  // Helper: Rooftop Environmental Weathering (Лужицы, сырость, потёки)
  // -------------------------------------------------------------------------
  private static renderRooftopWeathering(
    ctx: CanvasRenderingContext2D,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    bld: Building
  ): void {
    // Water pooling depressions & drying mud stains (застойные пятна в низинах)
    const seed = Math.abs(bld.x * 19 + bld.y * 37);
    const numPuddles = 1 + (seed % 3);

    for (let p = 0; p < numPuddles; p++) {
      const px = rx + rw * (0.2 + 0.3 * p) + (roofNoise(rx + p * 30, ry, 13) - 0.5) * (rw * 0.2);
      const py = ry + rh * (0.25 + 0.25 * p) + (roofNoise(rx, ry + p * 30, 23) - 0.5) * (rh * 0.2);
      const prx = 8 + (roofNoise(px, py, 51) * 12);
      const pry = 5 + (roofNoise(px, py, 61) * 7);

      if (px - prx < rx || px + prx > rx + rw || py - pry < ry || py + pry > ry + rh) continue;

      // Dark damp perimeter border (высохшая грязь по кромке лужи)
      ctx.fillStyle = 'rgba(8, 10, 16, 0.42)';
      ctx.beginPath();
      ctx.ellipse(px, py, prx + 2, pry + 1.5, 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Clear dark rainwater body with sky reflection
      ctx.fillStyle = 'rgba(15, 30, 48, 0.65)';
      ctx.beginPath();
      ctx.ellipse(px, py, prx, pry, 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Subtle water surface daylight gloss streak
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(px - prx * 0.5, py - pry * 0.3);
      ctx.lineTo(px + prx * 0.4, py - pry * 0.3);
      ctx.stroke();
    }
  }

  // -------------------------------------------------------------------------
  // Helper: Residential Multi-tier Mechanical Penthouse (Лифтовая надстройка)
  // -------------------------------------------------------------------------
  private static renderResidentialMechanicalPenthouse(
    ctx: CanvasRenderingContext2D,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    bld: Building
  ): void {
    const penW = Math.max(22, rw * 0.28);
    const penH = Math.max(20, rh * 0.28);
    const penX = rx + (rw - penW) / 2;
    const penY = ry + (rh - penH) / 2;

    // Drop shadow onto roof deck
    if (performanceConfig.enableShadows) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(penX + 4, penY + 4, penW, penH);
    }

    // Concrete/brick structural walls of penthouse
    ctx.fillStyle = bld.color || '#334155';
    ctx.fillRect(penX, penY, penW, penH);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(penX, penY, penW, penH);

    // Metal roof deck of penthouse
    ctx.fillStyle = bld.roofColor || '#1e293b';
    ctx.fillRect(penX + 2, penY + 2, penW - 4, penH - 4);
    ctx.strokeStyle = bld.accentColor || '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(penX + 2, penY + 2, penW - 4, penH - 4);

    // Steel access door with lock handle (стальная дверь выхода из машинного отделения)
    const doorW = 8;
    const doorH = 3;
    const doorX = penX + (penW - doorW) / 2;
    const doorY = penY + penH - 3;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(doorX, doorY, doorW, doorH);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(doorX + doorW - 2, doorY + 1, 1.2, 1);
  }

  // -------------------------------------------------------------------------
  // Helper: Ventilation Ducts, Chimneys & Roof Hatch (Вентшахты и люк выхода)
  // -------------------------------------------------------------------------
  private static renderVentilationDuctsAndHatch(
    ctx: CanvasRenderingContext2D,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    bld: Building
  ): void {
    // 1. Steel Fire Roof Access Hatch (Люк выхода на кровлю с защелкой)
    const hatchX = rx + 8;
    const hatchY = ry + 8;
    const hatchW = 8;
    const hatchH = 8;

    if (performanceConfig.enableShadows) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(hatchX + 2, hatchY + 2, hatchW, hatchH);
    }
    ctx.fillStyle = '#475569';
    ctx.fillRect(hatchX, hatchY, hatchW, hatchH);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(hatchX, hatchY, hatchW, hatchH);

    // Hatch lid latch
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(hatchX + hatchW / 2 - 1, hatchY + hatchH - 2, 2, 1.5);

    // 2. Brick/Concrete Ventilation Shaft Risers (Вентиляционные шахты с зонтами)
    const numShafts = Math.max(1, Math.min(3, Math.floor(rw / 45)));
    for (let s = 0; s < numShafts; s++) {
      const sx = rx + rw - 18 - s * 22;
      const sy = ry + rh - 18;
      const sw = 10;
      const sh = 7;

      if (sx < rx + 15 || sy < ry + 15) continue;

      if (performanceConfig.enableShadows) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(sx + 2, sy + 2, sw, sh);
      }

      // Red/Yellow brick shaft base
      ctx.fillStyle = '#8b251e';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = '#50130f';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(sx, sy, sw, sh);

      // Galvanized metal storm cap / hood (оцинкованный зонт шахты)
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(sx - 1, sy - 1, sw + 2, 3);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(sx - 1, sy - 1, sw + 2, 3);
    }
  }

  // -------------------------------------------------------------------------
  // Helper: Commercial Rooftop HVAC Chillers & Equipment
  // -------------------------------------------------------------------------
  private static renderCommercialRooftopEquipment(
    ctx: CanvasRenderingContext2D,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    bld: Building,
    now: number
  ): void {
    // Heavy Industrial Package HVAC Chiller Unit
    const hvacW = Math.min(34, rw * 0.38);
    const hvacH = Math.min(22, rh * 0.38);
    const hvacX = rx + (rw - hvacW) / 2;
    const hvacY = ry + (rh - hvacH) / 2;

    if (performanceConfig.enableShadows) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(hvacX + 3, hvacY + 3, hvacW, hvacH);
    }

    // Heavy steel frame & compressor casing
    ctx.fillStyle = '#334155';
    ctx.fillRect(hvacX, hvacY, hvacW, hvacH);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(hvacX, hvacY, hvacW, hvacH);

    // Condenser fan discharge grills (2 circular well openings with spinning fans)
    const fanRadius = Math.min(hvacW * 0.22, 5.5);
    const fan1X = hvacX + hvacW * 0.3;
    const fan2X = hvacX + hvacW * 0.7;
    const fanY = hvacY + hvacH / 2;

    [fan1X, fan2X].forEach((fx, idx) => {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(fx, fanY, fanRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Spinning aerodynamic fan blades
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      const baseAng = (now * 0.008) + (idx * Math.PI / 4);
      for (let b = 0; b < 4; b++) {
        const ang = baseAng + b * (Math.PI / 2);
        ctx.moveTo(fx - Math.cos(ang) * (fanRadius - 1), fanY - Math.sin(ang) * (fanRadius - 1));
        ctx.lineTo(fx + Math.cos(ang) * (fanRadius - 1), fanY + Math.sin(ang) * (fanRadius - 1));
      }
      ctx.stroke();
    });

    // Glass Skylight Panels on commercial flat roofs
    const skylightW = Math.min(28, (rw - hvacW) / 2 - 10);
    if (skylightW > 12) {
      const sY = ry + 8;
      const sH = rh - 16;
      [rx + 8, rx + rw - skylightW - 8].forEach(sx => {
        if (performanceConfig.enableShadows) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.fillRect(sx + 2, sY + 2, skylightW, sH);
        }
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.fillRect(sx, sY, skylightW, sH);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(sx, sY, skylightW, sH);

        // Mullions
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 0.8;
        for (let my = sY + 8; my < sY + sH; my += 8) {
          ctx.beginPath();
          ctx.moveTo(sx, my); ctx.lineTo(sx + skylightW, my);
          ctx.stroke();
        }
      });
    }
  }

  // -------------------------------------------------------------------------
  // Helper: Roof Details (AC, Helipads, Solar Panels, Water Towers, Antennas)
  // -------------------------------------------------------------------------
  private static renderBuildingRoofDetails(
    ctx: CanvasRenderingContext2D,
    bld: Building,
    now: number
  ): void {
    if (performanceConfig.lowQualityRendering || !bld.roofDetails) return;

    for (const d of bld.roofDetails) {
      const dx = bld.x + bld.width * d.rx;
      const dy = bld.y + bld.height * d.ry;

      if (d.type === 'ac') {
        // Drop shadow
        if (performanceConfig.enableShadows) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.fillRect(dx + 2, dy + 2, d.rw, d.rh);
        }

        ctx.fillStyle = '#475569';
        ctx.fillRect(dx, dy, d.rw, d.rh);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.strokeRect(dx, dy, d.rw, d.rh);

        const numFans = d.rw > d.rh ? 2 : 1;
        for (let f = 0; f < numFans; f++) {
          const fx = dx + d.rw / (numFans * 2) + f * (d.rw / numFans);
          const fy = dy + d.rh / 2;
          const fr = Math.min(d.rw, d.rh) * 0.35;

          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(fx, fy, fr, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = 'rgba(71, 85, 105, 0.8)';
          ctx.lineWidth = 0.5;
          ctx.stroke();

          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          const angleOffset = (now * 0.007) + (f * Math.PI / 4);
          for (let b = 0; b < 4; b++) {
            const bAngle = angleOffset + b * (Math.PI / 2);
            ctx.moveTo(fx - Math.cos(bAngle) * fr, fy - Math.sin(bAngle) * fr);
            ctx.lineTo(fx + Math.cos(bAngle) * fr, fy + Math.sin(bAngle) * fr);
          }
          ctx.stroke();
        }
      } else if (d.type === 'helipad') {
        // Tarmac pad circle
        const radius = d.rw / 2;
        const cx = dx + radius;
        const cy = dy + d.rh / 2;

        if (performanceConfig.enableShadows) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.beginPath();
          ctx.arc(cx + 3, cy + 3, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Yellow warning boundary circle
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
        ctx.stroke();

        // Target grid lines
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(dx, cy); ctx.lineTo(dx + d.rw, cy);
        ctx.moveTo(cx, dy); ctx.lineTo(cx, dy + d.rh);
        ctx.stroke();

        // High-visibility 'H' marking
        ctx.fillStyle = '#eab308';
        ctx.font = 'bold 24px "Courier New", Courier, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('H', cx, cy);

        // Flashing corner aviation obstruction beacons
        const beaconLit = (now % 1000) > 500;
        if (beaconLit) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(dx + 4, dy + 4, 3, 0, Math.PI * 2);
          ctx.arc(dx + d.rw - 4, dy + 4, 3, 0, Math.PI * 2);
          ctx.arc(dx + 4, dy + d.rh - 4, 3, 0, Math.PI * 2);
          ctx.arc(dx + d.rw - 4, dy + d.rh - 4, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (d.type === 'pool') {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(dx, dy, d.rw, d.rh);
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 2;
        ctx.strokeRect(dx, dy, d.rw, d.rh);
      } else if (d.type === 'solar') {
        // Crystalline Silicon solar array
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(dx, dy, d.rw, d.rh);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        ctx.strokeRect(dx, dy, d.rw, d.rh);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let sx = dx + 4; sx < dx + d.rw; sx += 4) {
          ctx.moveTo(sx, dy); ctx.lineTo(sx, dy + d.rh);
        }
        for (let sy = dy + 4; sy < dy + d.rh; sy += 4) {
          ctx.moveTo(dx, sy); ctx.lineTo(dx + d.rw, sy);
        }
        ctx.stroke();
      } else if (d.type === 'skylight') {
        ctx.fillStyle = 'rgba(14, 116, 144, 0.85)';
        ctx.fillRect(dx, dy, d.rw, d.rh);
        ctx.strokeStyle = '#0891b2';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(dx, dy, d.rw, d.rh);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(dx, dy + d.rh); ctx.lineTo(dx + d.rw, dy);
        ctx.stroke();
      } else if (d.type === 'antenna') {
        if (bld.type === 'residential') {
          // Authentic round Water Storage Tower with banded wooden staves & conical lid
          const rad = d.rw / 2;
          const cx = dx + rad;
          const cy = dy + rad;

          if (performanceConfig.enableShadows) {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
            ctx.beginPath();
            ctx.arc(cx + 4, cy + 4, rad, 0, Math.PI * 2);
            ctx.fill();
          }

          // Structural steel support struts
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx - rad, cy - rad); ctx.lineTo(cx + rad, cy + rad);
          ctx.moveTo(cx + rad, cy - rad); ctx.lineTo(cx - rad, cy + rad);
          ctx.stroke();

          // Wooden stave cylinder body
          ctx.fillStyle = '#b45309';
          ctx.beginPath();
          ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Conical Roof lid
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.arc(cx, cy, rad * 0.75, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          // Transmission antenna mast with projection shadow & flashing beacon
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(dx + 2, dy + 2); ctx.lineTo(dx + 16, dy - 12);
          ctx.stroke();

          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(dx, dy); ctx.lineTo(dx + 12, dy - 12);
          ctx.stroke();

          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(dx + 3, dy - 3); ctx.lineTo(dx + 7, dy - 7);
          ctx.moveTo(dx + 6, dy - 6); ctx.lineTo(dx + 10, dy - 10);
          ctx.stroke();

          const beaconLit = (now % 800) > 400;
          if (beaconLit) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(dx + 12, dy - 12, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Helper: Rooftop Brand Signboards
  // -------------------------------------------------------------------------
  private static renderBrandSignage(
    ctx: CanvasRenderingContext2D,
    bld: Building,
    now: number
  ): void {
    if (!bld.shopBrand && bld.type !== 'car_dealership') return;

    const signCx = bld.x + bld.width / 2;
    const signCy = bld.y + Math.min(30, bld.height * 0.35);

    if (bld.shopBrand === 'pharmacy_36_6') {
      const rsw = Math.min(140, bld.width - 20);
      ctx.fillStyle = '#065f46';
      ctx.fillRect(signCx - rsw / 2, signCy - 8, rsw, 16);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(signCx - rsw / 2, signCy - 8, rsw, 16);

      const cp = (now % 600) > 300;
      ctx.fillStyle = cp ? '#34d399' : '#10b981';
      ctx.fillRect(signCx - rsw / 2 + 6, signCy - 5, 3, 10);
      ctx.fillRect(signCx - rsw / 2 + 2.5, signCy - 1.5, 10, 3);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('АПТЕКА ПАНАЦЕЯ', signCx + 4, signCy);
    } else if (bld.shopBrand === 'pyaterochka') {
      const rsw = Math.min(150, bld.width - 20);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(signCx - rsw / 2, signCy - 8, rsw, 16);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(signCx - rsw / 2, signCy - 8, rsw, 16);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(signCx - rsw / 2 + 10, signCy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Р', signCx - rsw / 2 + 10, signCy + 0.5);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText('РЕГУЛЯР', signCx + 6, signCy);
    } else if (bld.shopBrand === 'cofix_bakery') {
      const rsw = Math.min(140, bld.width - 20);
      ctx.fillStyle = '#18181b';
      ctx.fillRect(signCx - rsw / 2, signCy - 8, rsw, 16);
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(signCx - rsw / 2, signCy - 8, rsw, 16);

      ctx.fillStyle = '#ea580c';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('УРБАН & БЕЙКЕРИ', signCx, signCy);
    } else if (bld.shopBrand === 'bean_bistro') {
      const rsw = Math.min(140, bld.width - 20);
      ctx.fillStyle = '#291104';
      ctx.fillRect(signCx - rsw / 2, signCy - 8, rsw, 16);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(signCx - rsw / 2, signCy - 8, rsw, 16);

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BEAN & BISTRO', signCx, signCy);
    } else if (bld.type === 'car_dealership') {
      const rsw = Math.min(220, bld.width - 20);
      ctx.fillStyle = '#09090b';
      ctx.fillRect(signCx - rsw / 2, signCy - 9, rsw, 18);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(signCx - rsw / 2, signCy - 9, rsw, 18);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 8.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ПРЕМИУМ АВТО • АВТОСАЛОН', signCx, signCy);
    } else if (bld.shopBrand === 'pitstop_service') {
      const rsw = Math.min(150, bld.width - 20);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(signCx - rsw / 2, signCy - 8, rsw, 16);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(signCx - rsw / 2, signCy - 8, rsw, 16);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PIT-STOP SERVICE', signCx, signCy);
    } else if (bld.shopBrand === 'splav_gear') {
      const rsw = Math.min(140, bld.width - 20);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(signCx - rsw / 2, signCy - 8, rsw, 16);
      ctx.strokeStyle = '#84cc16';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(signCx - rsw / 2, signCy - 8, rsw, 16);

      ctx.fillStyle = '#84cc16';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('СПЛАВ ТУРИЗМ', signCx, signCy);
    }
  }

  // -------------------------------------------------------------------------
  // Helper: Address Plaque
  // -------------------------------------------------------------------------
  private static renderAddressPlaque(
    ctx: CanvasRenderingContext2D,
    bld: Building
  ): void {
    if (!['panel_apartment', 'brick_residential', 'modern_residential', 'suburban'].includes(bld.type)) {
      return;
    }

    const apartments = getCityApartments();
    const apt = apartments.find(a => a.buildingId === bld.id);
    if (!apt) return;

    ctx.save();
    const plaqueW = 76;
    const plaqueH = 16;
    const px = bld.x + bld.width / 2 - plaqueW / 2;
    const py = bld.y + bld.height - 24;

    if (performanceConfig.enableShadows) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.fillRect(px + 2, py + 2, plaqueW, plaqueH);
    }

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(px, py, plaqueW, plaqueH);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, plaqueW, plaqueH);

    let cleanAddr = apt.address.split(',')[0].replace('ул. ', '').replace('пр. ', '').trim();
    const houseNum = apt.address.split(',')[1].replace(' д. ', '').replace('д. ', '').trim();
    const label = `${cleanAddr}, ${houseNum}`;

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 8.5px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, px + plaqueW / 2, py + plaqueH / 2);
    ctx.restore();
  }
}
