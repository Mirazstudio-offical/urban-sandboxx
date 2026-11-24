import { Building, InventoryItem, Player } from '../types';
import { BuildingLayout, InteriorFurniture } from '../buildingInteriors';
import {
  FurnitureStorage,
  buildFurnitureStorageId,
  getExistingFurnitureStorage,
  getSinkStreamMetrics,
  getBathStreamMetrics,
} from '../furnitureStorageSystem';
import { drawItemModel2D } from '../itemGraphic';
import { rr } from './furnitureTopDownMaterials';

function drawPlacedItemTopDown(
  ctx: CanvasRenderingContext2D,
  item: InventoryItem,
  x: number,
  y: number,
  size: number,
  rotRad: number = 0,
  tintDimAlpha: number = 0
): void {
  if (!item || !item.itemId) return;
  ctx.save();
  ctx.translate(x, y);
  if (rotRad !== 0) ctx.rotate(rotRad);

  // Subtle ambient contact shadow underneath placed item
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.ellipse(size * 0.05, size * 0.08, size * 0.42, size * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();

  drawItemModel2D(ctx, item.itemId, 0, 0, size, item);

  if (tintDimAlpha > 0) {
    ctx.fillStyle = `rgba(186, 230, 253, ${tintDimAlpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.46, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSteamWisps(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  nowSec: number,
  intensity: number = 1
): void {
  const alphaBase = Math.min(0.45, 0.24 * intensity);
  ctx.save();
  ctx.strokeStyle = `rgba(241, 245, 249, ${alphaBase.toFixed(2)})`;
  ctx.lineWidth = Math.max(0.32, radius * 0.14);
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const phase = nowSec * 2.2 + i * 2.1;
    const ox = (i - 1) * radius * 0.42 + Math.sin(phase) * radius * 0.16;
    const oy = -Math.abs(Math.cos(phase * 0.8)) * radius * 0.55;
    ctx.beginPath();
    ctx.moveTo(x + ox, y + oy + radius * 0.25);
    ctx.quadraticCurveTo(
      x + ox - radius * 0.18,
      y + oy,
      x + ox + radius * 0.12,
      y + oy - radius * 0.32
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawWaterRipplesAndJet(
  ctx: CanvasRenderingContext2D,
  spoutX: number,
  spoutY: number,
  targetX: number,
  targetY: number,
  tempC: number,
  nowSec: number,
  jetWidth: number
): void {
  const waterTint = tempC >= 50 ? '251, 146, 60' : tempC >= 34 ? '125, 211, 252' : '56, 189, 248';
  ctx.save();
  // Animated water jet
  ctx.strokeStyle = `rgba(${waterTint}, 0.85)`;
  ctx.lineWidth = jetWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(spoutX, spoutY);
  ctx.lineTo(targetX, targetY);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = Math.max(0.22, jetWidth * 0.36);
  ctx.setLineDash([0.8, 0.8]);
  ctx.lineDashOffset = -(nowSec * 12) % 1.6;
  ctx.beginPath();
  ctx.moveTo(spoutX, spoutY);
  ctx.lineTo(targetX, targetY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Concentric splash ripples
  for (let rIdx = 0; rIdx < 2; rIdx++) {
    const p = ((nowSec * 1.8 + rIdx * 0.5) % 1);
    const rad = Math.max(0.5, jetWidth * (0.9 + p * 2.2));
    ctx.strokeStyle = `rgba(224, 242, 254, ${(0.58 * (1 - p)).toFixed(2)})`;
    ctx.lineWidth = 0.28;
    ctx.beginPath();
    ctx.arc(targetX, targetY, rad, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function renderGridItemsOnRect(
  ctx: CanvasRenderingContext2D,
  items: InventoryItem[],
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  maxItems: number,
  seedOffset: number,
  itemScaleFactor: number = 0.72,
  glassTint: number = 0
): void {
  const count = Math.min(maxItems, items.length);
  if (count <= 0 || rw <= 1 || rh <= 1) return;

  // Choose balanced cols x rows for the target rectangle aspect
  const aspect = rw / Math.max(1, rh);
  let cols = Math.max(1, Math.round(Math.sqrt(count * aspect)));
  cols = Math.min(count, Math.max(1, cols));
  const rows = Math.max(1, Math.ceil(count / cols));

  const cellW = rw / cols;
  const cellH = rh / rows;
  const itemSize = Math.max(2.1, Math.min(4.8, Math.min(cellW, cellH) * itemScaleFactor));

  for (let i = 0; i < count; i++) {
    const it = items[i];
    if (!it) continue;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const jx = Math.sin((i + 1 + seedOffset) * 12.7) * cellW * 0.1;
    const jy = Math.cos((i + 1 + seedOffset) * 7.3) * cellH * 0.1;
    const cx = rx + (col + 0.5) * cellW + jx;
    const cy = ry + (row + 0.5) * cellH + jy;
    const angle = Math.sin((i + seedOffset) * 4.1) * 0.28;
    drawPlacedItemTopDown(ctx, it, cx, cy, itemSize, angle, glassTint);
  }
}

function renderStoveOverlay(
  ctx: CanvasRenderingContext2D,
  f: InteriorFurniture,
  storage: FurnitureStorage,
  nowSec: number
): void {
  const st = storage.stoveState;
  if (!st) return;

  const w = f.width;
  const h = f.height;
  const hw = w / 2;
  const hh = h / 2;
  const minD = Math.min(w, h);
  const hex = f.color || '#334155';
  const isBrickOven = hex === '#c2410c' || hex === '#b45309' || hex === '#9a3412';

  if (isBrickOven) {
    const hobW = w * 0.56;
    const hobH = h * 0.42;
    const r = Math.min(hobW * 0.2, hobH * 0.34);
    const positions = [
      { cx: -hobW * 0.24, cy: hh * 0.05 + hobH * 0.5 },
      { cx: hobW * 0.24, cy: hh * 0.05 + hobH * 0.5 },
    ];
    for (let i = 0; i < 2; i++) {
      const b = st.burners[i];
      const pos = positions[i];
      if (!b || !pos) continue;
      if (b.gasOn) {
        const pulse = 0.85 + Math.sin(nowSec * 18 + i * 1.7) * 0.15;
        ctx.strokeStyle = `rgba(249, 115, 22, ${(0.82 * pulse).toFixed(2)})`;
        ctx.lineWidth = Math.max(0.55, r * 0.32);
        ctx.beginPath();
        ctx.arc(pos.cx, pos.cy, r * 0.72, 0, Math.PI * 2);
        ctx.stroke();
      } else if (b.temperature >= 42) {
        const heatAlpha = Math.min(0.5, ((b.temperature - 42) / 140) * 0.5);
        ctx.strokeStyle = `rgba(239, 68, 68, ${heatAlpha.toFixed(2)})`;
        ctx.lineWidth = Math.max(0.4, r * 0.22);
        ctx.beginPath();
        ctx.arc(pos.cx, pos.cy, r * 0.65, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (b.item) {
        const sz = Math.max(2.6, r * 2.2);
        drawPlacedItemTopDown(ctx, b.item, pos.cx, pos.cy, sz, 0);
        const itemTemp = b.item.surfaceTemperature ?? b.item.temperature ?? 21;
        if (itemTemp >= 48 || (b.gasOn && itemTemp >= 34)) {
          drawSteamWisps(ctx, pos.cx, pos.cy - r * 0.4, r * 1.1, nowSec, 0.9);
        }
      }
    }
  } else {
    const ventH = Math.max(0.6, h * 0.1);
    const pad = Math.max(0.65, minD * 0.085);
    const deckY = -hh + ventH + 0.25;
    const deckH = h - ventH - pad * 1.4 - 0.55;
    const deckW = w - pad * 2;
    const burnersGeo = [
      { cx: -deckW * 0.25, cy: deckY + deckH * 0.28, r: Math.min(deckW, deckH) * 0.2 },
      { cx: deckW * 0.25, cy: deckY + deckH * 0.28, r: Math.min(deckW, deckH) * 0.15 },
      { cx: -deckW * 0.25, cy: deckY + deckH * 0.73, r: Math.min(deckW, deckH) * 0.16 },
      { cx: deckW * 0.25, cy: deckY + deckH * 0.73, r: Math.min(deckW, deckH) * 0.21 },
    ];

    for (let i = 0; i < 4; i++) {
      const b = st.burners[i];
      const geo = burnersGeo[i];
      if (!b || !geo) continue;

      if (b.gasOn) {
        const flicker = 0.85 + Math.sin(nowSec * 22 + i * 2.3) * 0.15;
        // Blue gas flame crown petals
        const petals = 8;
        for (let p = 0; p < petals; p++) {
          const ang = (p / petals) * Math.PI * 2 + nowSec * 1.8;
          const fx = geo.cx + Math.cos(ang) * geo.r * 0.62;
          const fy = geo.cy + Math.sin(ang) * geo.r * 0.62;
          ctx.fillStyle = `rgba(56, 189, 248, ${(0.88 * flicker).toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(fx, fy, Math.max(0.28, geo.r * 0.19), 0, Math.PI * 2);
          ctx.fill();
        }
        // Subtle warm orange corona around burner
        ctx.strokeStyle = `rgba(251, 146, 60, ${(0.52 * flicker).toFixed(2)})`;
        ctx.lineWidth = Math.max(0.38, geo.r * 0.18);
        ctx.beginPath();
        ctx.arc(geo.cx, geo.cy, geo.r * 0.72, 0, Math.PI * 2);
        ctx.stroke();
      } else if (b.temperature >= 42) {
        const heatAlpha = Math.min(0.45, ((b.temperature - 42) / 150) * 0.45);
        ctx.strokeStyle = `rgba(239, 68, 68, ${heatAlpha.toFixed(2)})`;
        ctx.lineWidth = Math.max(0.35, geo.r * 0.16);
        ctx.beginPath();
        ctx.arc(geo.cx, geo.cy, geo.r * 0.68, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (b.item) {
        const sz = Math.max(2.6, Math.min(4.8, geo.r * 2.35));
        drawPlacedItemTopDown(ctx, b.item, geo.cx, geo.cy, sz, 0);
        const itemTemp = b.item.surfaceTemperature ?? b.item.temperature ?? 21;
        if (itemTemp >= 48 || (b.gasOn && itemTemp >= 34) || (b.item.wetness || 0) >= 25) {
          drawSteamWisps(ctx, geo.cx, geo.cy - geo.r * 0.2, geo.r * 1.05, nowSec + i, 0.9);
        }
      }
    }
  }

  // Oven front door amber thermal spill when oven gas is ON or chamber hot
  if (st.oven.gasOn || st.oven.temperature >= 65) {
    const pulse = st.oven.gasOn ? 0.85 + Math.sin(nowSec * 9) * 0.15 : 0.45;
    const glowAlpha = st.oven.gasOn ? 0.42 * pulse : Math.min(0.28, ((st.oven.temperature - 65) / 130) * 0.28);
    const og = ctx.createLinearGradient(0, hh - 0.5, 0, hh + 3.2);
    og.addColorStop(0, `rgba(249, 115, 22, ${glowAlpha.toFixed(2)})`);
    og.addColorStop(1, 'rgba(249, 115, 22, 0)');
    ctx.fillStyle = og;
    ctx.fillRect(-w * 0.36, hh - 0.3, w * 0.72, 3.4);
  }
}

function renderSinkOverlay(
  ctx: CanvasRenderingContext2D,
  f: InteriorFurniture,
  storage: FurnitureStorage,
  nowSec: number
): void {
  const st = storage.sinkState;
  const w = f.width;
  const h = f.height;
  const hw = w / 2;
  const hh = h / 2;
  const rx = hw * 0.74;
  const ry = hh * 0.62;
  const cy = hh * 0.14;

  if (st) {
    const metrics = getSinkStreamMetrics(st, false);
    const fillPct = Math.max(0, Math.min(1, st.basinWaterMl / Math.max(1, st.basinMaxMl)));

    if (fillPct > 0.02) {
      const tColor = st.waterTemperature >= 50
        ? '251, 146, 60'
        : st.waterTemperature >= 34
        ? '125, 211, 252'
        : '56, 189, 248';
      const waterAlpha = 0.24 + fillPct * 0.36;
      const scale = 0.55 + fillPct * 0.4;
      ctx.fillStyle = `rgba(${tColor}, ${waterAlpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(0, cy, rx * scale, ry * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (metrics.flowing) {
      const spoutY = -hh + Math.max(0.7, h * 0.15) + Math.max(1.2, h * 0.3) * 0.45;
      drawWaterRipplesAndJet(ctx, 0, spoutY, 0, cy + ry * 0.05, metrics.streamTempC, nowSec, Math.max(0.45, Math.min(w, h) * 0.07));
    }

    const activeTemp = metrics.flowing ? metrics.streamTempC : st.waterTemperature;
    if ((metrics.flowing || fillPct > 0.08) && activeTemp >= 44) {
      drawSteamWisps(ctx, 0, cy, Math.min(rx, ry) * 0.7, nowSec, 0.85);
    }
  }

  // Items resting in sink basin (up to 4)
  if (storage.items.length > 0) {
    renderGridItemsOnRect(
      ctx,
      storage.items,
      -rx * 0.72,
      cy - ry * 0.7,
      rx * 1.44,
      ry * 1.4,
      4,
      3,
      0.66
    );
  }
}

function renderKitchenCounterOverlay(
  ctx: CanvasRenderingContext2D,
  f: InteriorFurniture,
  counterStorage: FurnitureStorage | undefined,
  sinkStorage: FurnitureStorage | undefined,
  nowSec: number
): void {
  const w = f.width;
  const h = f.height;
  const hw = w / 2;
  const hh = h / 2;
  const splashH = Math.max(0.55, h * 0.09);

  // 1. Left built-in sink geometry matching furnitureTopDownDomestic.ts
  const sinkW = Math.min(w * 0.34, Math.max(4.5, h * 1.05));
  const sinkH = h - splashH - Math.max(1.4, h * 0.22);
  const sinkX = -hw + Math.max(1.0, w * 0.055);
  const sinkY = -hh + splashH + (h - splashH - sinkH) * 0.55;

  if (sinkStorage) {
    const st = sinkStorage.sinkState;
    if (st) {
      const metrics = getSinkStreamMetrics(st, false);
      const fillPct = Math.max(0, Math.min(1, st.basinWaterMl / Math.max(1, st.basinMaxMl)));
      if (fillPct > 0.02) {
        const tColor = st.waterTemperature >= 50
          ? '251, 146, 60'
          : st.waterTemperature >= 34
          ? '125, 211, 252'
          : '56, 189, 248';
        ctx.fillStyle = `rgba(${tColor}, ${(0.24 + fillPct * 0.34).toFixed(2)})`;
        const inset = Math.max(0.25, (1 - fillPct) * 0.9);
        rr(ctx, sinkX + inset, sinkY + inset, Math.max(0.8, sinkW - inset * 2), Math.max(0.8, sinkH - inset * 2), 0.45);
        ctx.fill();
      }
      if (metrics.flowing) {
        drawWaterRipplesAndJet(
          ctx,
          sinkX + sinkW * 0.5,
          sinkY - 0.15,
          sinkX + sinkW * 0.5,
          sinkY + sinkH * 0.5,
          metrics.streamTempC,
          nowSec,
          Math.max(0.45, Math.min(sinkW, sinkH) * 0.08)
        );
      }
      const activeTemp = metrics.flowing ? metrics.streamTempC : st.waterTemperature;
      if ((metrics.flowing || fillPct > 0.08) && activeTemp >= 44) {
        drawSteamWisps(ctx, sinkX + sinkW * 0.5, sinkY + sinkH * 0.45, Math.min(sinkW, sinkH) * 0.38, nowSec, 0.85);
      }
    }

    if (sinkStorage.items.length > 0) {
      renderGridItemsOnRect(
        ctx,
        sinkStorage.items,
        sinkX + 0.4,
        sinkY + 0.4,
        sinkW - 0.8,
        sinkH - 0.8,
        3,
        7,
        0.65
      );
    }
  }

  // 2. Countertop items placed right of the sink
  if (counterStorage && counterStorage.items.length > 0) {
    const startX = sinkX + sinkW + 1.0;
    const availW = hw - 1.0 - startX;
    const availY = -hh + splashH + 0.7;
    const availH = h - splashH - 1.4;
    if (availW > 2.5 && availH > 2.0) {
      renderGridItemsOnRect(ctx, counterStorage.items, startX, availY, availW, availH, 6, 11, 0.72);
    }
  }
}

function renderBathOverlay(
  ctx: CanvasRenderingContext2D,
  f: InteriorFurniture,
  storage: FurnitureStorage,
  nowSec: number
): void {
  const st = storage.sinkState;
  const w = f.width;
  const h = f.height;
  const isHoriz = w >= h;
  const bw = isHoriz ? w : h;
  const bh = isHoriz ? h : w;
  const bhw = bw / 2;
  const bhh = bh / 2;

  const rim = Math.max(1.1, bh * 0.14);
  const wPad = rim + Math.max(0.45, bh * 0.055);
  const watW = bw - wPad * 2;
  const watH = bh - wPad * 2;
  const inR = Math.min((bh - rim * 2) * 0.44, 3.8);

  ctx.save();
  if (!isHoriz) ctx.rotate(Math.PI / 2);

  if (st) {
    const metrics = getBathStreamMetrics(st);
    const fillPct = Math.max(0, Math.min(1, st.basinWaterMl / Math.max(1, st.basinMaxMl)));

    if (fillPct > 0.015) {
      const tColor = st.waterTemperature >= 50
        ? '251, 146, 60'
        : st.waterTemperature >= 34
        ? '125, 211, 252'
        : '14, 165, 233';
      const alpha = 0.2 + fillPct * 0.44;
      const scale = 0.68 + fillPct * 0.32;
      const drawW = watW * scale;
      const drawH = watH * scale;
      ctx.fillStyle = `rgba(${tColor}, ${alpha.toFixed(2)})`;
      rr(ctx, -drawW / 2, -drawH / 2, drawW, drawH, Math.max(0.6, inR - 0.5));
      ctx.fill();

      // Subtle caustic shimmer arcs when bath is noticeably filled
      if (fillPct > 0.18) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${(0.18 + fillPct * 0.22).toFixed(2)})`;
        ctx.lineWidth = Math.max(0.28, bh * 0.028);
        ctx.beginPath();
        const shimmerDrift = Math.sin(nowSec * 1.4) * 0.35;
        ctx.moveTo(-drawW * 0.26, -drawH * 0.16 + shimmerDrift);
        ctx.quadraticCurveTo(0, -drawH * 0.25 + shimmerDrift, drawW * 0.24, -drawH * 0.12 + shimmerDrift);
        ctx.stroke();
      }
    }

    if (metrics.flowing) {
      const spoutX = -bhw + wPad * 0.9;
      const hitX = -bhw + wPad + watW * 0.16;
      drawWaterRipplesAndJet(ctx, spoutX, 0, hitX, 0, metrics.streamTempC, nowSec, Math.max(0.65, bh * 0.075));
    }

    const activeTemp = metrics.flowing ? metrics.streamTempC : st.waterTemperature;
    if ((metrics.flowing || fillPct > 0.06) && activeTemp >= 42) {
      drawSteamWisps(ctx, -watW * 0.12, 0, bh * 0.26, nowSec, 1.0);
    }
  }

  if (storage.items.length > 0) {
    renderGridItemsOnRect(
      ctx,
      storage.items,
      -watW * 0.38,
      -watH * 0.38,
      watW * 0.76,
      watH * 0.76,
      6,
      19,
      0.7
    );
  }

  ctx.restore();
}

function renderWashingMachineOverlay(
  ctx: CanvasRenderingContext2D,
  f: InteriorFurniture,
  storage: FurnitureStorage,
  nowSec: number
): void {
  const ws = storage.washingState;
  if (!ws) return;
  const w = f.width;
  const h = f.height;
  const hw = w / 2;
  const hh = h / 2;
  const fasciaH = Math.max(1.1, h * 0.16);
  const portW = w * 0.56;
  const portDepth = Math.max(0.65, h * 0.1);

  if (ws.isRunning) {
    // Active foam & drum shimmer inside protruding porthole at front (+hh)
    const swirl = Math.sin(nowSec * (ws.spinRpm >= 800 ? 22 : 6)) * 0.5 + 0.5;
    let foamRgb = '125, 211, 252';
    if (ws.hasDetergent && ws.detergentColor && /^#?[0-9a-fA-F]{6}$/.test(ws.detergentColor)) {
      const hex = ws.detergentColor.startsWith('#') ? ws.detergentColor.slice(1) : ws.detergentColor;
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      foamRgb = `${r}, ${g}, ${b}`;
    }
    ctx.fillStyle = `rgba(${foamRgb}, ${(0.35 + swirl * 0.32).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(0, hh - 0.02, portW * 0.42, portDepth * 0.85, 0, 0, Math.PI);
    ctx.fill();

    // Amber active indicator bar on fascia
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(hw - w * 0.28, hh - fasciaH + 0.42, w * 0.14, fasciaH * 0.24);
  } else if (ws.phase === 'done') {
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(hw - w * 0.28, hh - fasciaH + 0.42, w * 0.14, fasciaH * 0.24);
  }
}

function renderMicrowaveOverlay(
  ctx: CanvasRenderingContext2D,
  f: InteriorFurniture,
  storage: FurnitureStorage,
  nowSec: number
): void {
  const mw = storage.microwaveState;
  if (!mw) return;
  const w = f.width;
  const h = f.height;
  const hw = w / 2;
  const hh = h / 2;
  const doorW = w * 0.68;

  if (mw.hasMetalWarning) {
    const blink = Math.sin(nowSec * 10) > 0 ? 1 : 0.25;
    ctx.fillStyle = `rgba(239, 68, 68, ${blink.toFixed(2)})`;
    ctx.fillRect(-hw + doorW + (w - doorW) * 0.28, hh - 0.35, (w - doorW) * 0.44, 0.28);
  } else if (mw.isRunning) {
    const pulse = 0.85 + Math.sin(nowSec * 14) * 0.15;
    // Warm amber microwave light spilling from front glass & louver vents
    const mg = ctx.createLinearGradient(0, hh - 0.4, 0, hh + 2.4);
    mg.addColorStop(0, `rgba(245, 158, 11, ${(0.55 * pulse).toFixed(2)})`);
    mg.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = mg;
    ctx.fillRect(-hw + 0.3, hh - 0.3, doorW - 0.6, 2.7);

    // Warm internal slit light through cooling louvers
    ctx.fillStyle = `rgba(251, 191, 36, ${(0.28 * pulse).toFixed(2)})`;
    ctx.fillRect(-hw + w * 0.1, -hh + h * 0.18, w * 0.42, h * 0.48);
  }
}

function renderCoolerOverlay(
  ctx: CanvasRenderingContext2D,
  f: InteriorFurniture,
  storage: FurnitureStorage
): void {
  const cs = storage.coolerState;
  const w = f.width;
  const h = f.height;
  const hw = w / 2;
  const hh = h / 2;
  const trayW = w * 0.62;
  const trayH = Math.max(0.75, h * 0.14);

  if (cs) {
    const pct = Math.max(0, Math.min(1, cs.bottleWaterMl / Math.max(1, cs.bottleMaxMl)));
    const jugR = Math.min(hw, hh) * 0.76;
    const jugY = -hh * 0.06;

    // Fade carboy brightness cleanly as bottle empties
    if (pct < 0.95) {
      ctx.fillStyle = `rgba(15, 23, 42, ${((1 - pct) * 0.56).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(0, jugY, jugR * 0.96, 0, Math.PI * 2);
      ctx.fill();
    }

    // Active heating / cooling indicator pips
    ctx.fillStyle = cs.hotOn ? '#fb923c' : '#475569';
    ctx.beginPath();
    ctx.arc(-trayW * 0.25, hh - trayH * 0.65, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cs.coldOn ? '#38bdf8' : '#475569';
    ctx.beginPath();
    ctx.arc(trayW * 0.25, hh - trayH * 0.65, 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // Up to 2 cups/bottles placed on front drip tray
  if (storage.items.length > 0) {
    renderGridItemsOnRect(
      ctx,
      storage.items,
      -trayW * 0.45,
      hh - trayH * 0.2,
      trayW * 0.9,
      trayH * 1.1,
      2,
      31,
      0.85
    );
  }
}

export function renderDynamicInteriorFurnitureOverlays(
  ctx: CanvasRenderingContext2D,
  bld: Building,
  layout: BuildingLayout,
  player: Player
): void {
  if (!layout || !layout.furniture || layout.furniture.length === 0) return;

  const floor = player.currentFloor || 0;
  const aptId = player.isInsideApartment && player.insideApartmentId ? player.insideApartmentId : undefined;
  const nowSec = Date.now() / 1000;

  for (let fIdx = 0; fIdx < layout.furniture.length; fIdx++) {
    const f = layout.furniture[fIdx];
    if (!f || f.type === 'carpet') continue;

    const mainId = buildFurnitureStorageId(bld.id, floor, fIdx, aptId);
    const storage = getExistingFurnitureStorage(mainId);

    const sinkSubStorage =
      f.type === 'kitchen_counter'
        ? getExistingFurnitureStorage(buildFurnitureStorageId(bld.id, floor, fIdx, aptId, 'sink'))
        : undefined;

    if (!storage && !sinkSubStorage) continue;

    const hasOpenSurfaceItems = Boolean(storage && storage.items && storage.items.length > 0);
    const needsRender =
      f.type === 'stove' ||
      f.type === 'sink' ||
      f.type === 'bath' ||
      f.type === 'kitchen_counter' ||
      f.type === 'washing_machine' ||
      f.type === 'microwave' ||
      f.type === 'cooler' ||
      hasOpenSurfaceItems;

    if (!needsRender) continue;

    ctx.save();
    ctx.translate(f.x + f.width / 2, f.y + f.height / 2);
    ctx.rotate(f.angle || 0);

    switch (f.type) {
      case 'stove':
        if (storage) renderStoveOverlay(ctx, f, storage, nowSec);
        break;
      case 'sink':
        if (storage) renderSinkOverlay(ctx, f, storage, nowSec);
        break;
      case 'kitchen_counter':
        renderKitchenCounterOverlay(ctx, f, storage, sinkSubStorage, nowSec);
        break;
      case 'bath':
        if (storage) renderBathOverlay(ctx, f, storage, nowSec);
        break;
      case 'washing_machine':
        if (storage) renderWashingMachineOverlay(ctx, f, storage, nowSec);
        break;
      case 'microwave':
        if (storage) renderMicrowaveOverlay(ctx, f, storage, nowSec);
        break;
      case 'cooler':
        if (storage) renderCoolerOverlay(ctx, f, storage);
        break;
      case 'radiator':
        if (storage && storage.items.length > 0) {
          renderGridItemsOnRect(
            ctx,
            storage.items,
            -f.width * 0.42,
            -f.height * 0.42,
            f.width * 0.84,
            f.height * 0.84,
            4,
            41,
            0.78
          );
          if (storage.items.some(it => (it.wetness || 0) >= 15)) {
            drawSteamWisps(ctx, 0, 0, Math.min(f.width, f.height) * 0.55, nowSec, 0.7);
          }
        }
        break;
      case 'freezer_display':
        if (storage && storage.items.length > 0) {
          renderGridItemsOnRect(
            ctx,
            storage.items,
            -f.width * 0.42,
            -f.height * 0.38,
            f.width * 0.84,
            f.height * 0.76,
            8,
            53,
            0.72,
            0.22
          );
        }
        break;
      case 'table':
      case 'kids_table':
      case 'desk':
      case 'desk_reception':
      case 'counter':
      case 'shelf':
      case 'bookshelf':
      case 'pallet_stack':
        if (storage && storage.items.length > 0) {
          renderGridItemsOnRect(
            ctx,
            storage.items,
            -f.width * 0.4,
            -f.height * 0.38,
            f.width * 0.8,
            f.height * 0.76,
            8,
            fIdx * 13 + 7,
            0.74
          );
        }
        break;
      default:
        // Opaque enclosed containers (wardrobe, fridge, safe, dresser, lockers, file_cabinet, nightstand, tv_cabinet, toy_chest) intentionally stay hidden
        break;
    }

    ctx.restore();
  }
}
