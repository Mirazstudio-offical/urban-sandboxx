import { Building, GameWorld, Player } from './types';
import { performanceConfig } from './performanceConfig';

/**
 * High-fidelity volumetric renderer for old garage cooperatives (ГСК):
 * - Volumetric weathered brick, silicate, concrete panel, and corrugated metal garage boxes
 * - Authentic 2-leaf steel swing gates with wickets, padlocks, Z-stiffeners, and stenciled numbers
 * - Bitumen roll roofing (рубероид) with tar seams, gravel ballast, ventilation mushroom pipes, and stove chimneys
 * - Industrial car inspection overpass ramps (эстакады) with pit and safety curbs
 * - Cooperative checkpoint booths (КПП), entrance arches, and notice boards
 * - Precast concrete road slabs (плиты ПДН) between garage rows with expansion joints and weeds
 * - Sagging overhead electrical wires and warm night bulkhead lighting
 */
export class GarageCooperativeRenderer {
  /**
   * Render ground apron for garage cooperatives: concrete airfield slabs, gravel verges,
   * expansion joints, weeds, drive-in thresholds, and oil stains.
   */
  public static renderGroundApron(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    nightAlpha: number = 0
  ) {
    const garageBuildings = world.buildings.filter(b => 
      b.type === 'garage_cooperative' || 
      b.type === 'garage_box' || 
      b.type === 'garage_workshop' || 
      b.type === 'garage_gatehouse' ||
      b.type === 'garage_substation' ||
      b.type === 'garage_ramp' ||
      (b.id && b.id.startsWith('garage_gsk_'))
    );

    if (garageBuildings.length === 0) return;

    // Identify active cooperative zones
    const zones = [
      { id: 'gsk_lada', x1: 70, y1: 870, x2: 730, y2: 1545, name: 'ГСК «Лада»' },
      { id: 'gsk_auto', x1: 70, y1: 1655, x2: 730, y2: 2330, name: 'ГСК «Автомобилист»' },
      { id: 'gsk_signal', x1: 865, y1: 870, x2: 1535, y2: 1545, name: 'ГСК «Сигнал»' }
    ];

    for (const zone of zones) {
      if (zone.x2 < minX || zone.x1 > maxX || zone.y2 < minY || zone.y1 > maxY) continue;

      ctx.save();

      // 1. NATURAL WEATHERED EARTH & DAMP LOAM BASE
      // Rich dark earth tones instead of sterile flat gray
      ctx.fillStyle = '#2d1e13'; // Dark damp soil base
      ctx.fillRect(zone.x1, zone.y1, zone.x2 - zone.x1, zone.y2 - zone.y1);

      // Darker mud patches and compacted dirt trails
      ctx.fillStyle = '#21150c';
      for (let mx = zone.x1 + 10; mx < zone.x2 - 30; mx += 60) {
        for (let my = zone.y1 + 10; my < zone.y2 - 30; my += 55) {
          const w = 45 + ((mx * 3 + my) % 30);
          const h = 35 + ((mx + my * 5) % 25);
          ctx.beginPath();
          ctx.ellipse(mx + w / 2, my + h / 2, w / 2, h / 2, ((mx * 11) % 10) * 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Crushed brick fragments, clay flecks & coarse gravel grit
      ctx.fillStyle = '#451a03'; // Brick rubble flecks
      for (let bx = zone.x1 + 8; bx < zone.x2; bx += 28) {
        for (let by = zone.y1 + 8; by < zone.y2; by += 28) {
          if ((bx * 7 + by * 13) % 5 === 0) {
            ctx.fillRect(bx + ((by * 3) % 7), by + ((bx * 5) % 7), 3, 2);
          }
        }
      }

      ctx.fillStyle = '#57534e'; // Weathered limestone pebbles
      for (let gx = zone.x1 + 6; gx < zone.x2; gx += 22) {
        for (let gy = zone.y1 + 6; gy < zone.y2; gy += 22) {
          if ((gx * 11 + gy * 17) % 4 === 0) {
            ctx.fillRect(gx + ((gy * 7) % 5), gy + ((gx * 3) % 5), 2, 2);
          }
        }
      }

      // 2. WEATHERED, BROKEN & SUNKEN CONCRETE ROAD SLABS (Плиты ПДН)
      // Placed inside internal driveways between garage rows
      const slabW = 28;
      const slabH = 16;
      for (let sx = zone.x1 + 16; sx < zone.x2 - 16; sx += slabW) {
        for (let sy = zone.y1 + 16; sy < zone.y2 - 16; sy += slabH) {
          // Check if slab is inside an alley, not under buildings
          const slabOverlapsBuilding = garageBuildings.some(b => 
            sx + slabW > b.x - 2 && sx < b.x + b.width + 2 &&
            sy + slabH > b.y - 2 && sy < b.y + b.height + 2
          );
          if (slabOverlapsBuilding) continue;

          // 15% of slabs are completely broken up or subsided into dirt/mud (exposed earth!)
          const slabHash = (sx * 73 + sy * 37) >>> 0;
          if (slabHash % 7 === 0) {
            // Mud pit with broken concrete rubble chunks
            ctx.fillStyle = '#1c120a';
            ctx.fillRect(sx, sy, slabW - 2, slabH - 2);
            // Concrete fragments left behind
            ctx.fillStyle = '#44403c';
            ctx.fillRect(sx + 3, sy + 3, 7, 5);
            ctx.fillRect(sx + slabW - 11, sy + 6, 8, 6);
            continue;
          }

          // Weathered slab tone with shade variations
          const slabTone = (slabHash % 4 === 0) ? '#4b4845' : (slabHash % 4 === 1) ? '#57534e' : '#44403c';
          ctx.fillStyle = slabTone;
          ctx.fillRect(sx, sy, slabW - 1, slabH - 1);

          // Deep dark expansion seams with bitumen
          ctx.strokeStyle = '#18181b';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(sx, sy, slabW - 1, slabH - 1);

          // Diagonal corner lifting loops / notches
          ctx.fillStyle = '#1c1917';
          ctx.fillRect(sx + 2, sy + 2, 2.5, 2.5);
          ctx.fillRect(sx + slabW - 5, sy + 2, 2.5, 2.5);
          ctx.fillRect(sx + 2, sy + slabH - 5, 2.5, 2.5);
          ctx.fillRect(sx + slabW - 5, sy + slabH - 5, 2.5, 2.5);

          // Exposed rusty rebar loop in some slab corners
          if (slabHash % 5 === 0) {
            ctx.strokeStyle = '#b45309';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.arc(sx + 3, sy + 3, 1.8, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Heavy diagonal surface crack across some aged slabs
          if (slabHash % 6 === 0) {
            ctx.strokeStyle = '#27272a';
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(sx + 2, sy + 3);
            ctx.lineTo(sx + slabW / 2 + (slabHash % 5), sy + slabH / 2);
            ctx.lineTo(sx + slabW - 3, sy + slabH - 2);
            ctx.stroke();
          }

          // Weeds and moss growing in the seams between slabs
          if (slabHash % 3 === 0) {
            ctx.fillStyle = '#365314'; // Dark weed green
            ctx.fillRect(sx + slabW - 2, sy + 2, 2.5, 4);
            ctx.fillRect(sx + 4, sy + slabH - 2, 5, 2);
          }
        }
      }

      // 3. PARALLEL DEEP MUD TIRE RUTS (Грязевые колеи вдоль проездов)
      // Every cooperative alley has twin worn mud grooves
      const alleyYList = (zone.id === 'gsk_lada') 
        ? [1013, 1273] 
        : (zone.id === 'gsk_auto') 
        ? [1873, 2133] 
        : [1013, 1393];

      for (const ay of alleyYList) {
        if (ay + 25 < minY || ay - 25 > maxY) continue;

        // Left and right wheel tracks (offset ±15px from centerline)
        const trackOffsets = [-14, 14];
        for (const toff of trackOffsets) {
          const trackY = ay + toff;
          
          // Deep dark compressed mud groove
          ctx.fillStyle = 'rgba(20, 13, 8, 0.78)';
          ctx.fillRect(zone.x1 + 25, trackY - 3, zone.x2 - zone.x1 - 50, 6);

          // Wet glossy shine line along bottom of the rut
          ctx.strokeStyle = 'rgba(70, 50, 35, 0.55)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(zone.x1 + 30, trackY);
          ctx.lineTo(zone.x2 - 30, trackY);
          ctx.stroke();
        }
      }

      // 4. NATURAL RAIN PUDDLES & RAINBOW OIL SLICKS IN THE ALLEYS
      const alleyPuddles = [
        { x: zone.x1 + 160, y: zone.y1 + 120, rx: 18, ry: 9, angle: 0.1 },
        { x: zone.x1 + 420, y: zone.y1 + 115, rx: 24, ry: 11, angle: -0.05 },
        { x: zone.x1 + 270, y: zone.y1 + 305, rx: 22, ry: 10, angle: 0.15 },
        { x: zone.x1 + 540, y: zone.y1 + 310, rx: 20, ry: 10, angle: -0.2 },
        { x: zone.x1 + 210, y: zone.y1 + 495, rx: 26, ry: 12, angle: 0.05 },
        { x: zone.x1 + 480, y: zone.y1 + 500, rx: 22, ry: 9, angle: 0.1 },
      ];

      for (const p of alleyPuddles) {
        if (p.x + p.rx < minX || p.x - p.rx > maxX || p.y + p.ry < minY || p.y - p.ry > maxY) continue;

        // Murky water body
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // Wet mud ring around puddle
        ctx.fillStyle = 'rgba(18, 12, 7, 0.65)';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.rx + 4, p.ry + 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dark sky reflection water
        ctx.fillStyle = 'rgba(30, 45, 55, 0.85)';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // Iridescent rainbow petroleum slick swirl (радужные бензиновые разводы)
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)'; // Violet ring
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(-2, 0, p.rx * 0.55, p.ry * 0.5, 0.3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)'; // Cyan ring
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.ellipse(-1, 0, p.rx * 0.4, p.ry * 0.35, 0.2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)'; // Gold ring
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.rx * 0.25, p.ry * 0.2, 0.1, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      // 5. MOTOR OIL & GREASE SPILLS UNDER GARAGE DOORS
      // For each garage building, render black saturated oil drip pools where cars idle
      for (const b of garageBuildings) {
        if (b.x + b.width < zone.x1 || b.x > zone.x2 || b.y + b.height < zone.y1 || b.y > zone.y2) continue;
        if (b.x + b.width < minX || b.x > maxX || b.y + b.height < minY || b.y > maxY) continue;

        const doorSide = b.entranceSide || 'south';
        const doorCenterX = b.x + b.width / 2;
        const dripY = (doorSide === 'south') ? (b.y + b.height + 6) : (b.y - 6);

        // Dark burnt motor oil stain
        const oilHash = (b.x * 47 + b.y * 89) >>> 0;
        const oilRadius = 5 + (oilHash % 6);
        ctx.fillStyle = 'rgba(12, 10, 8, 0.85)';
        ctx.beginPath();
        ctx.ellipse(doorCenterX + ((oilHash % 5) - 2), dripY, oilRadius, oilRadius * 0.65, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Central thick black grease core
        ctx.fillStyle = '#090807';
        ctx.beginPath();
        ctx.arc(doorCenterX + ((oilHash % 5) - 2), dripY, oilRadius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }

      // 6. WILD OVERGROWN BURDOCK & WEEDS ALONG PERIMETER FENCES & CORNERS
      ctx.fillStyle = '#2d4a1d'; // Dense burdock green
      for (let fx = zone.x1 + 10; fx < zone.x2 - 10; fx += 18) {
        // North & South fence line weeds
        ctx.beginPath();
        ctx.arc(fx + ((fx * 3) % 7), zone.y1 + 4, 3.5, 0, Math.PI * 2);
        ctx.arc(fx + ((fx * 5) % 7), zone.y2 - 6, 4.0, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let fy = zone.y1 + 10; fy < zone.y2 - 10; fy += 20) {
        // West & East fence line weeds
        ctx.beginPath();
        ctx.arc(zone.x1 + 5, fy + ((fy * 3) % 7), 3.8, 0, Math.PI * 2);
        ctx.arc(zone.x2 - 6, fy + ((fy * 7) % 7), 4.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dandelion yellow blossoms in the weeds
      ctx.fillStyle = '#facc15';
      for (let dx = zone.x1 + 24; dx < zone.x2 - 24; dx += 48) {
        if ((dx * 13) % 3 === 0) {
          ctx.fillRect(dx, zone.y1 + 3, 1.8, 1.8);
          ctx.fillRect(dx + 12, zone.y2 - 7, 1.8, 1.8);
        }
      }

      ctx.restore();
    }
  }

  /**
   * Render volumetric garage base: walls (brick/silicate/concrete/metal),
   * steel swing doors with wicket door, padlocks, hinges, Z-braces, and numbers.
   */
  public static renderGarageBase(
    ctx: CanvasRenderingContext2D,
    bld: Building,
    nightAlpha: number = 0,
    player?: Player,
    timeHour: number = 12
  ) {
    const isSpecial = bld.type === 'garage_ramp' || bld.garageSubtype === 'ramp';
    if (isSpecial) {
      this.renderCarInspectionRamp(ctx, bld);
      return;
    }

    const isGatehouse = bld.type === 'garage_gatehouse' || bld.garageSubtype === 'gatehouse';
    const isSubstation = bld.type === 'garage_substation' || bld.garageSubtype === 'substation';
    const isWorkshop = bld.type === 'garage_workshop' || bld.garageSubtype === 'workshop';

    // 1. VOLUMETRIC DIRECTIONAL DROP SHADOW
    if (performanceConfig.enableShadows) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.46)';
      const shadowOffset = isWorkshop ? 9 : 6;
      ctx.fillRect(bld.x + shadowOffset, bld.y + shadowOffset, bld.width, bld.height);
    }

    // 2. REINFORCED CONCRETE FOUNDATION APRON & PLINTH (Блоки ФБС)
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(bld.x - 1, bld.y - 1, bld.width + 2, bld.height + 2);

    // 3. FACADE WALL TEXTURE BY SUBTYPE
    const subtype = bld.garageSubtype || 'brick';
    if (subtype === 'silicate') {
      // White/grey weathered silicate brick (силикатный кирпич)
      ctx.fillStyle = bld.color || '#cbd5e1';
      ctx.fillRect(bld.x, bld.y, bld.width, bld.height);

      // Dark mortar seams
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.35)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let py = bld.y + 4; py < bld.y + bld.height; py += 4) {
        ctx.moveTo(bld.x, py);
        ctx.lineTo(bld.x + bld.width, py);
      }
      ctx.stroke();

      // Lower dampness / splash staining near ground
      ctx.fillStyle = 'rgba(30, 41, 59, 0.25)';
      ctx.fillRect(bld.x, bld.y + bld.height - 4, bld.width, 4);
    } else if (subtype === 'concrete') {
      // Prefabricated concrete panels (железобетонные плиты)
      ctx.fillStyle = bld.color || '#64748b';
      ctx.fillRect(bld.x, bld.y, bld.width, bld.height);

      // Panel vertical seams
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let px = bld.x + 18; px < bld.x + bld.width; px += 18) {
        ctx.moveTo(px, bld.y);
        ctx.lineTo(px, bld.y + bld.height);
      }
      ctx.stroke();
    } else if (subtype === 'metal') {
      // Corrugated galvanized sheet iron (профнастил / железо)
      ctx.fillStyle = bld.color || '#475569';
      ctx.fillRect(bld.x, bld.y, bld.width, bld.height);

      // Vertical corrugated ribs
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let px = bld.x + 3; px < bld.x + bld.width; px += 4) {
        ctx.moveTo(px, bld.y);
        ctx.lineTo(px, bld.y + bld.height);
      }
      ctx.stroke();
    } else {
      // Red weathered clay brick (красный кирпич)
      ctx.fillStyle = bld.color || '#854d0e';
      ctx.fillRect(bld.x, bld.y, bld.width, bld.height);

      // Alternating brick mortar courses
      ctx.strokeStyle = 'rgba(30, 20, 10, 0.4)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let py = bld.y + 4; py < bld.y + bld.height; py += 4) {
        ctx.moveTo(bld.x, py);
        ctx.lineTo(bld.x + bld.width, py);
      }
      ctx.stroke();

      // Salt efflorescence white patch (высолы)
      const safeId = bld.id || 'bld';
      if (safeId.charCodeAt(safeId.length - 1) % 4 === 0) {
        ctx.fillStyle = 'rgba(241, 245, 249, 0.35)';
        ctx.beginPath();
        ctx.ellipse(bld.x + bld.width * 0.3, bld.y + bld.height * 0.4, 8, 4, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. CHECKPOINT BOOTH (КПП) OR SUBSTATION DETAILS
    if (isGatehouse) {
      // Guard window
      const winW = 14;
      const winH = 8;
      const winX = bld.x + (bld.width - winW) / 2;
      const winY = bld.y + bld.height - winH - 2;

      ctx.fillStyle = '#0f172a'; // Window frame
      ctx.fillRect(winX, winY, winW, winH);

      // Cozy illuminated warm light from guard booth
      ctx.fillStyle = nightAlpha > 0.3 ? '#fef08a' : '#38bdf8';
      ctx.fillRect(winX + 1.5, winY + 1.5, winW - 3, winH - 3);

      // Window cross mullion
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(winX + winW / 2, winY); ctx.lineTo(winX + winW / 2, winY + winH);
      ctx.moveTo(winX, winY + winH / 2); ctx.lineTo(winX + winW, winY + winH / 2);
      ctx.stroke();

      // Guardhouse Entrance Door
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bld.x + 3, bld.y + bld.height - 12, 8, 12);
      ctx.fillStyle = '#f59e0b'; // Brass door handle
      ctx.fillRect(bld.x + 9, bld.y + bld.height - 6, 1.5, 1.5);

      // Cooperative announcement board (Доска объявлений ГСК)
      const bX = bld.x + bld.width - 16;
      const bY = bld.y + bld.height - 14;
      ctx.fillStyle = '#78350f'; // Cork/wood board
      ctx.fillRect(bX, bY, 12, 10);
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(bX, bY, 12, 10);
      // Paper flyers on board
      ctx.fillStyle = '#ffffff'; ctx.fillRect(bX + 2, bY + 2, 3, 4);
      ctx.fillStyle = '#fef08a'; ctx.fillRect(bX + 6, bY + 3, 4, 3);
      return;
    }

    if (isSubstation) {
      // Heavy metal doors with High-Voltage Warning Triangle ⚡
      const sdw = Math.min(24, bld.width - 8);
      const sdx = bld.x + (bld.width - sdw) / 2;
      const sdy = bld.y + bld.height - 14;

      ctx.fillStyle = '#334155';
      ctx.fillRect(sdx, sdy, sdw, 14);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(sdx, sdy, sdw, 14);

      // Yellow warning triangle
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(sdx + sdw / 2, sdy + 2);
      ctx.lineTo(sdx + sdw / 2 - 4, sdy + 8);
      ctx.lineTo(sdx + sdw / 2 + 4, sdy + 8);
      ctx.closePath();
      ctx.fill();

      // Black lightning bolt ⚡
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(sdx + sdw / 2, sdy + 3);
      ctx.lineTo(sdx + sdw / 2 - 1.5, sdy + 5.5);
      ctx.lineTo(sdx + sdw / 2 + 0.5, sdy + 5.5);
      ctx.lineTo(sdx + sdw / 2 - 1, sdy + 7.5);
      ctx.lineTo(sdx + sdw / 2 + 1.5, sdy + 5);
      ctx.lineTo(sdx + sdw / 2 - 0.5, sdy + 5);
      ctx.closePath();
      ctx.fill();

      // Louver ventilation grates
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bld.x + 4, bld.y + 4, 8, 8);
      ctx.fillRect(bld.x + bld.width - 12, bld.y + 4, 8, 8);
      return;
    }

    // 5. STANDARD OR WORKSHOP GARAGE GATES (ВОРОТА)
    const side = bld.entranceSide || 'south';
    const isNorthOrSouth = side === 'north' || side === 'south';

    // Gate dimensions
    let gdw = 0, gdh = 0, gdx = 0, gdy = 0;
    if (isNorthOrSouth) {
      gdw = Math.min(bld.width - 6, 30);
      gdh = 5;
      gdx = bld.x + (bld.width - gdw) / 2;
      gdy = side === 'north' ? bld.y - 1 : bld.y + bld.height - 4;
    } else {
      gdw = 5;
      gdh = Math.min(bld.height - 6, 30);
      gdx = side === 'west' ? bld.x - 1 : bld.x + bld.width - 4;
      gdy = bld.y + (bld.height - gdh) / 2;
    }

    // Drive-in threshold concrete apron ramp (пандус въезда)
    ctx.save();
    if (isNorthOrSouth) {
      const rampY = side === 'north' ? bld.y - 10 : bld.y + bld.height;
      ctx.fillStyle = '#52525b';
      ctx.fillRect(gdx - 2, rampY, gdw + 4, 10);
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1;
      ctx.strokeRect(gdx - 2, rampY, gdw + 4, 10);

      // Black tire scuff marks on entrance apron
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(gdx + 3, rampY, 4, 10);
      ctx.fillRect(gdx + gdw - 7, rampY, 4, 10);

      // Dark engine oil drop stain in front of gate
      ctx.fillStyle = 'rgba(15, 10, 5, 0.55)';
      ctx.beginPath();
      ctx.ellipse(gdx + gdw / 2, rampY + 5, 3.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const rampX = side === 'west' ? bld.x - 10 : bld.x + bld.width;
      ctx.fillStyle = '#52525b';
      ctx.fillRect(rampX, gdy - 2, 10, gdh + 4);
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1;
      ctx.strokeRect(rampX, gdy - 2, 10, gdh + 4);

      // Tire scuffs
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(rampX, gdy + 3, 10, 4);
      ctx.fillRect(rampX, gdy + gdh - 7, 10, 4);
    }
    ctx.restore();

    // Recessed door frame
    ctx.fillStyle = '#09090b';
    ctx.fillRect(gdx - 1, gdy - 1, gdw + 2, gdh + 2);

    // Heavy steel double doors with authentic painted color
    const doorColor = bld.garageDoorColor || '#1e3a8a'; // Soviet industrial blue by default
    ctx.fillStyle = doorColor;
    ctx.fillRect(gdx, gdy, gdw, gdh);
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1;
    ctx.strokeRect(gdx, gdy, gdw, gdh);

    if (isNorthOrSouth) {
      // Center seam dividing the two leaves
      const midX = gdx + gdw / 2;
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(midX, gdy);
      ctx.lineTo(midX, gdy + gdh);
      ctx.stroke();

      // Diagonal Z-stiffeners on leaves
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gdx + 2, gdy + 1); ctx.lineTo(midX - 2, gdy + gdh - 1);
      ctx.moveTo(midX + 2, gdy + 1); ctx.lineTo(gdx + gdw - 2, gdy + gdh - 1);
      ctx.stroke();

      // Welded barrel hinges on outer edges
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(gdx - 0.5, gdy + 0.5, 1.5, 1.5);
      ctx.fillRect(gdx - 0.5, gdy + gdh - 2, 1.5, 1.5);
      ctx.fillRect(gdx + gdw - 1, gdy + 0.5, 1.5, 1.5);
      ctx.fillRect(gdx + gdw - 1, gdy + gdh - 2, 1.5, 1.5);

      // Inset pedestrian wicket door (калитка) on right leaf
      const wkW = 9;
      const wkX = midX + 3;
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(wkX, gdy + 0.5, wkW, gdh - 1);

      // Padlock and hasp
      ctx.fillStyle = '#f59e0b'; // Brass padlock
      ctx.fillRect(midX - 1, gdy + gdh / 2 - 1, 2, 2);

      // Bulkhead light fixture above door
      const lampY = side === 'north' ? bld.y - 2 : bld.y + bld.height;
      ctx.fillStyle = '#334155';
      ctx.fillRect(midX - 2.5, lampY, 5, 2);
      ctx.fillStyle = nightAlpha > 0.3 ? '#fef08a' : '#ffffff';
      ctx.beginPath();
      ctx.arc(midX, lampY + (side === 'north' ? -1 : 3), 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Vertical door
      const midY = gdy + gdh / 2;
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(gdx, midY);
      ctx.lineTo(gdx + gdw, midY);
      ctx.stroke();

      // Barrel hinges
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(gdx + 0.5, gdy - 0.5, 1.5, 1.5);
      ctx.fillRect(gdx + 0.5, gdy + gdh - 1, 1.5, 1.5);

      // Padlock
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(gdx + gdw / 2 - 1, midY - 1, 2, 2);
    }
  }

  /**
   * Render volumetric garage roof: multi-layer bitumen ruberoid with longitudinal seams,
   * gravel ballast, tar repair patches, ventilation mushroom pipes, and stove chimneys with smoke.
   */
  public static renderGarageRoof(
    ctx: CanvasRenderingContext2D,
    bld: Building,
    nightAlpha: number = 0,
    player?: Player,
    world?: GameWorld
  ) {
    if (bld.type === 'garage_ramp' || bld.garageSubtype === 'ramp') return; // Ramps are open structures

    const isGatehouse = bld.type === 'garage_gatehouse' || bld.garageSubtype === 'gatehouse';
    const isSubstation = bld.type === 'garage_substation' || bld.garageSubtype === 'substation';
    const isWorkshop = bld.type === 'garage_workshop' || bld.garageSubtype === 'workshop';

    const rx = bld.x;
    const ry = bld.y;
    const rw = bld.width;
    const rh = bld.height;
    const side = bld.entranceSide || 'south';

    // 1. OVERHANGING VISOR LINTEL (Бетонный козырек над воротами)
    // Projects 3px over the door side, casting shadow
    ctx.save();
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    if (side === 'south') {
      ctx.fillRect(rx - 1, ry + rh, rw + 2, 3.5);
      ctx.strokeRect(rx - 1, ry + rh, rw + 2, 3.5);
      // Shadow of visor onto door apron
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(rx, ry + rh + 3.5, rw, 2);
    } else if (side === 'north') {
      ctx.fillRect(rx - 1, ry - 3.5, rw + 2, 3.5);
      ctx.strokeRect(rx - 1, ry - 3.5, rw + 2, 3.5);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(rx, ry - 5.5, rw, 2);
    }
    ctx.restore();

    // 2. MAIN ROOF BODY: HEAVY WEATHERED BITUMEN RUBEROID (Наплавляемая кровля)
    ctx.fillStyle = bld.roofColor || '#1c1917'; // Deep dark asphalt/charcoal bitumen
    ctx.fillRect(rx, ry, rw, rh);

    // Weathered Parapet / Concrete coping frame
    ctx.strokeStyle = bld.accentColor || '#3f3f46';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);

    // Longitudinal roll bitumen overlap seams (полосы наплавки рубероида)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const seamStep = 12;
    for (let sy = ry + seamStep; sy < ry + rh - 4; sy += seamStep) {
      ctx.moveTo(rx + 3, sy);
      ctx.lineTo(rx + rw - 3, sy);
    }
    ctx.stroke();

    // Glossy black bitumen melting streaks & gravel sprinkle
    ctx.fillStyle = '#09090b';
    for (let bx = rx + 8; bx < rx + rw - 6; bx += 18) {
      const by = ry + ((bx * 7) % Math.max(1, rh - 12)) + 4;
      ctx.fillRect(bx, by, 6, 2.5);
    }

    // Tar repair patches (заплатки из битума)
    const safeRoofId = bld.id || 'bld';
    if (safeRoofId.charCodeAt(safeRoofId.length - 1) % 3 === 0) {
      ctx.fillStyle = '#0c0a09';
      ctx.fillRect(rx + rw * 0.4, ry + rh * 0.3, 10, 7);
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(rx + rw * 0.4, ry + rh * 0.3, 10, 7);
    }

    // 3. GALVANIZED VENTILATION MUSHROOM PIPE (Вентиляционный дефлектор)
    // Most garages have a round metal ventilation pipe on the back roof
    const ventX = rx + (side === 'north' ? rw * 0.75 : rw * 0.25);
    const ventY = ry + (side === 'north' ? rh * 0.75 : rh * 0.25);

    // Pipe shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(ventX + 2, ventY + 2, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Galvanized pipe body
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(ventX, ventY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Center conical cap
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(ventX, ventY, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // 4. STOVE CHIMNEY & CURLING WOODSMOKE ON WORKSHOPS & SELECT GARAGES
    const hasStove = isWorkshop || isGatehouse || (safeRoofId.charCodeAt(safeRoofId.length - 1) % 6 === 0);
    if (hasStove) {
      const chimX = rx + (isGatehouse ? rw - 6 : rw * 0.75);
      const chimY = ry + (isGatehouse ? 6 : rh * 0.3);

      // Chimney base shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(chimX + 1.5, chimY + 1.5, 4.5, 4.5);

      // Metal stove pipe with 90-degree elbow
      ctx.fillStyle = '#334155';
      ctx.fillRect(chimX, chimY, 4.5, 4.5);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(chimX, chimY, 4.5, 4.5);

      // Rain flue cap
      ctx.fillStyle = '#64748b';
      ctx.fillRect(chimX - 1, chimY - 1, 6.5, 2);

      // Gentle animated curling woodsmoke drifting northeast
      const now = Date.now();
      const smokeTime = now / 1400;
      for (let p = 0; p < 3; p++) {
        const pTime = (smokeTime + p * 1.5) % 4.5;
        const progress = pTime / 4.5;
        const driftX = chimX + 2 + progress * 24 + Math.sin(smokeTime + p) * 3;
        const driftY = chimY - progress * 22;
        const size = 2.5 + progress * 7;
        const alpha = (1 - progress) * 0.22 * Math.max(0.15, 1 - nightAlpha * 0.7);

        ctx.fillStyle = `rgba(203, 213, 225, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(driftX, driftY, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. WORKSHOP SIGNBOARD ON ROOF OR UPPER FACADE
    if (bld.garageSign && rw > 30) {
      const signW = Math.min(rw - 6, 80);
      const signH = 10;
      const signX = rx + (rw - signW) / 2;
      const signY = side === 'south' ? ry + rh - signH - 2 : ry + 2;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(signX, signY, signW, signH);
      ctx.strokeStyle = '#f59e0b'; // Gold border
      ctx.lineWidth = 1.2;
      ctx.strokeRect(signX, signY, signW, signH);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 6.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bld.garageSign, signX + signW / 2, signY + signH / 2);
    }

    // 6. STENCILED GARAGE NUMBER (№ 14, № 28, etc.)
    if (bld.garageNumber) {
      const numY = side === 'south' ? ry + rh - 4 : ry + 6;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.font = 'bold 6px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bld.garageNumber, rx + rw / 2, numY);
    }
  }

  /**
   * Render full industrial car inspection overpass ramp (эстакада):
   * Inclined concrete approaches, parallel elevated steel I-beam tracks with yellow/black hazard curbs,
   * central open trench with timber planks, handrails, steps, and tool shelf.
   */
  public static renderCarInspectionRamp(ctx: CanvasRenderingContext2D, bld: Building) {
    const rx = bld.x;
    const ry = bld.y;
    const rw = bld.width; // typically 32-36 px
    const rh = bld.height; // typically 64-70 px

    ctx.save();

    // 1. Ramp drop shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.fillRect(rx + 6, ry + 6, rw, rh);

    // 2. Central concrete inspection trench (яма под эстакадой)
    const pitW = 12;
    const pitX = rx + (rw - pitW) / 2;
    ctx.fillStyle = '#18181b'; // Deep pit shadow
    ctx.fillRect(pitX, ry + 12, pitW, rh - 24);
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 1;
    ctx.strokeRect(pitX, ry + 12, pitW, rh - 24);

    // Wooden planks placed across pit
    ctx.fillStyle = '#78350f';
    ctx.fillRect(pitX - 1, ry + 24, pitW + 2, 4);
    ctx.fillRect(pitX - 1, ry + rh - 30, pitW + 2, 4);

    // 3. Inclined approach concrete ramps (north and south approaches)
    const rampLength = 14;
    const trackW = 8;
    const leftTrackX = rx + 3;
    const rightTrackX = rx + rw - trackW - 3;

    // South approach ramp
    ctx.fillStyle = '#52525b';
    ctx.fillRect(leftTrackX, ry + rh - rampLength, trackW, rampLength);
    ctx.fillRect(rightTrackX, ry + rh - rampLength, trackW, rampLength);

    // North approach ramp
    ctx.fillRect(leftTrackX, ry, trackW, rampLength);
    ctx.fillRect(rightTrackX, ry, trackW, rampLength);

    // Traction ribs on approach ramps
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 0.8;
    for (let d = 3; d < rampLength; d += 3) {
      ctx.beginPath();
      ctx.moveTo(leftTrackX, ry + d); ctx.lineTo(leftTrackX + trackW, ry + d);
      ctx.moveTo(rightTrackX, ry + d); ctx.lineTo(rightTrackX + trackW, ry + d);
      ctx.moveTo(leftTrackX, ry + rh - d); ctx.lineTo(leftTrackX + trackW, ry + rh - d);
      ctx.moveTo(rightTrackX, ry + rh - d); ctx.lineTo(rightTrackX + trackW, ry + rh - d);
      ctx.stroke();
    }

    // 4. Elevated horizontal steel runway tracks (стальные колеи эстакады)
    const elevatedH = rh - rampLength * 2;
    const elevatedY = ry + rampLength;

    // Heavy steel I-beam runway track plates
    ctx.fillStyle = '#334155';
    ctx.fillRect(leftTrackX, elevatedY, trackW, elevatedH);
    ctx.fillRect(rightTrackX, elevatedY, trackW, elevatedH);

    // Perforated grip sheet texture
    ctx.fillStyle = '#1e293b';
    for (let gy = elevatedY + 3; gy < elevatedY + elevatedH - 3; gy += 4) {
      ctx.fillRect(leftTrackX + 2, gy, 4, 1.5);
      ctx.fillRect(rightTrackX + 2, gy, 4, 1.5);
    }

    // 5. Yellow/Black hazard safety wheel-stop curbs (колесоотбойники)
    // Left outer curb
    const curbW = 2;
    ctx.fillStyle = '#eab308';
    ctx.fillRect(leftTrackX - curbW, elevatedY, curbW, elevatedH);
    ctx.fillRect(rightTrackX + trackW, elevatedY, curbW, elevatedH);
    // Hazard diagonal stripes
    ctx.fillStyle = '#000000';
    for (let cy = elevatedY; cy < elevatedY + elevatedH; cy += 6) {
      ctx.fillRect(leftTrackX - curbW, cy, curbW, 3);
      ctx.fillRect(rightTrackX + trackW, cy, curbW, 3);
    }

    // 6. Pipe safety handrail along east side
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(rightTrackX + trackW + 3, elevatedY);
    ctx.lineTo(rightTrackX + trackW + 3, elevatedY + elevatedH);
    ctx.stroke();

    // Handrail stanchion posts
    ctx.fillStyle = '#0f172a';
    for (let sy = elevatedY; sy <= elevatedY + elevatedH; sy += 12) {
      ctx.fillRect(rightTrackX + trackW + 2, sy - 1, 3, 2);
    }

    // Metal steps ladder on south-east side
    ctx.fillStyle = '#475569';
    for (let st = 0; st < 3; st++) {
      ctx.fillRect(rightTrackX + trackW + 2, ry + rh - 6 + st * 2, 4, 1.2);
    }

    // 7. Oily mechanic tool shelf / workbench next to ramp
    ctx.fillStyle = '#78350f';
    ctx.fillRect(rx - 8, elevatedY + 8, 6, 12);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(rx - 8, elevatedY + 8, 6, 12);
    // Oil can on shelf
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(rx - 6, elevatedY + 11, 3, 3);

    ctx.restore();
  }

  /**
   * Render overhead sagging electrical wires (СИП) stretching between concrete lamp poles
   * and garage rooftops.
   */
  public static renderOverheadWires(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) {
    const poles = world.props.filter(p => 
      (p.type === 'lamp_concrete' || p.type === 'power_pole') &&
      !p.isBroken &&
      p.x >= minX - 100 && p.x <= maxX + 100 &&
      p.y >= minY - 100 && p.y <= maxY + 100
    );

    if (poles.length < 2) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)'; // Realistic dark wire silhouette
    ctx.lineWidth = 1.0;

    // Connect poles that are within 80-220 px of each other
    for (let i = 0; i < poles.length; i++) {
      for (let j = i + 1; j < poles.length; j++) {
        const p1 = poles[i];
        const p2 = poles[j];
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

        if (dist > 70 && dist < 230) {
          const midX = (p1.x + p2.x) / 2;
          const sagY = (p1.y + p2.y) / 2 + Math.min(8, dist * 0.05); // Natural gravitational catenary sag

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.quadraticCurveTo(midX, sagY, p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  /**
   * Render warm golden amber light cutouts on the night lightmap in front of garage gates and guardhouses.
   */
  public static renderLightmapCutouts(
    lCtx: CanvasRenderingContext2D,
    world: GameWorld,
    nightAlpha: number,
    fogFactor: number
  ) {
    if (nightAlpha < 0.25) return;

    const garages = world.buildings.filter(b => 
      (b.type === 'garage_box' || b.type === 'garage_workshop' || b.type === 'garage_gatehouse')
    );

    lCtx.save();
    for (const bld of garages) {
      const isGatehouse = bld.type === 'garage_gatehouse' || bld.garageSubtype === 'gatehouse';
      const side = bld.entranceSide || 'south';

      let lightX = bld.x + bld.width / 2;
      let lightY = side === 'north' ? bld.y - 6 : bld.y + bld.height + 6;

      const radius = isGatehouse ? 32 : 18;
      const grad = lCtx.createRadialGradient(lightX, lightY, 2, lightX, lightY, radius);
      grad.addColorStop(0, 'rgba(254, 240, 138, 0.85)'); // Warm amber bulb center
      grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.35)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      lCtx.fillStyle = grad;
      lCtx.beginPath();
      lCtx.arc(lightX, lightY, radius, 0, Math.PI * 2);
      lCtx.fill();
    }
    lCtx.restore();
  }

  /**
   * Render additive glowing atmospheric halos for garage lights.
   */
  public static renderAdditiveGlow(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    nightAlpha: number,
    fogFactor: number
  ) {
    if (nightAlpha < 0.3) return;

    const garages = world.buildings.filter(b => 
      (b.type === 'garage_box' || b.type === 'garage_workshop' || b.type === 'garage_gatehouse') &&
      (b.id.charCodeAt(b.id.length - 1) % 2 === 0) // Alternating lamps
    );

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const bld of garages) {
      const side = bld.entranceSide || 'south';
      const lightX = bld.x + bld.width / 2;
      const lightY = side === 'north' ? bld.y - 6 : bld.y + bld.height + 6;

      const radius = 22;
      const grad = ctx.createRadialGradient(lightX, lightY, 1, lightX, lightY, radius);
      grad.addColorStop(0, `rgba(254, 240, 138, ${(0.35 * nightAlpha).toFixed(2)})`);
      grad.addColorStop(0.6, `rgba(245, 158, 11, ${(0.12 * nightAlpha).toFixed(2)})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lightX, lightY, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
