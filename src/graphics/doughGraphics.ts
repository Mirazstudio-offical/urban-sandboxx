import { DoughAttributes, RollingPinAttributes, RollingPinPattern } from '../types';
import { buildDefaultDoughAttributes, buildRollingPinAttributes } from '../doughData';
import { drawShadow, mixHex } from './itemGraphicShared';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function shade(hex: string, amount: number): string {
  return amount >= 0 ? mixHex(hex, '#ffffff', clamp(amount, 0, 1)) : mixHex(hex, '#1c1008', clamp(-amount, 0, 1));
}

function drawEmbossedPatternOverlay(
  ctx: CanvasRenderingContext2D,
  pattern: RollingPinPattern | undefined,
  rx: number,
  ry: number,
  strokeColor: string
) {
  if (!pattern || pattern === 'none' || pattern === 'wood_grain' || pattern === 'marble_veins' || pattern === 'brushed_metal' || pattern === 'pastel_speckle') {
    return;
  }
  ctx.save();
  ctx.strokeStyle = strokeColor;
  ctx.globalAlpha = 0.42;
  ctx.lineWidth = 0.42;
  if (pattern === 'carved_lattice') {
    for (let x = -rx; x <= rx; x += 2.2) {
      ctx.beginPath();
      ctx.moveTo(x - 2, -ry);
      ctx.lineTo(x + 2, ry);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 2, -ry);
      ctx.lineTo(x - 2, ry);
      ctx.stroke();
    }
  } else if (pattern === 'carved_waves') {
    for (let y = -ry + 1.5; y <= ry - 1.5; y += 2.2) {
      ctx.beginPath();
      for (let x = -rx; x <= rx; x += 1.2) {
        const wy = y + Math.sin(x * 1.3) * 0.7;
        if (x === -rx) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
  } else {
    // carved_floral / carved_folklore medallions
    for (let y = -ry + 2.2; y <= ry - 2.2; y += 3.4) {
      for (let x = -rx + 2.2; x <= rx - 2.2; x += 3.4) {
        ctx.beginPath();
        ctx.arc(x, y, 1.05, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawDoughFlecks(
  ctx: CanvasRenderingContext2D,
  fleckColor: string | undefined,
  rx: number,
  ry: number
) {
  if (!fleckColor) return;
  ctx.save();
  ctx.fillStyle = fleckColor;
  ctx.globalAlpha = 0.62;
  const pts: [number, number, number][] = [
    [-0.55, -0.32, 0.45],
    [0.35, -0.45, 0.38],
    [-0.18, 0.28, 0.42],
    [0.52, 0.16, 0.36],
    [-0.42, 0.44, 0.35],
    [0.08, -0.15, 0.32],
    [0.24, 0.48, 0.34],
  ];
  for (const [fx, fy, r] of pts) {
    ctx.beginPath();
    ctx.arc(fx * rx, fy * ry, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFillingDots(
  ctx: CanvasRenderingContext2D,
  attrs: DoughAttributes,
  rx: number,
  ry: number
) {
  if (!attrs.fillings || attrs.fillings.length === 0) return;
  ctx.save();
  const count = Math.min(9, Math.max(4, attrs.fillings.length * 3));
  for (let i = 0; i < count; i++) {
    const f = attrs.fillings[i % attrs.fillings.length];
    const ang = (i / count) * Math.PI * 2 + 0.4;
    const rad = i % 2 === 0 ? 0.46 : 0.24;
    const px = Math.cos(ang) * rx * rad;
    const py = Math.sin(ang) * ry * rad;
    const baseCol = f.colorHex || '#c2410c';
    ctx.fillStyle = attrs.cookState === 'baked' || attrs.cookState === 'fried' ? shade(baseCol, -0.15) : baseCol;
    ctx.beginPath();
    ctx.ellipse(px, py, 1.45, 1.05, ang, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = shade(baseCol, -0.35);
    ctx.lineWidth = 0.25;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawRollingPinItem(
  ctx: CanvasRenderingContext2D,
  item?: any
): boolean {
  const attrs: RollingPinAttributes = buildRollingPinAttributes(item?.rollingPinAttributes);
  const bodyCol = attrs.color || '#d4a373';
  const handleCol = attrs.accentColor || '#9c6644';
  const patCol = attrs.patternColor || shade(bodyCol, -0.3);

  ctx.save();
  ctx.rotate(-0.56);
  drawShadow(ctx, 9.6, 1.8, 3.2, 0.24);

  const isMini = attrs.shape === 'mini_dowel' || attrs.modelId === 'mini_pastry';
  const isFrench = attrs.shape === 'tapered_french';
  const isStraight = attrs.shape === 'straight_cylinder' || isMini;
  const hasHandles = attrs.shape === 'cylindrical_handles' || attrs.shape === 'stepped_rings';

  const barrelHalfLen = isMini ? 6.8 : isFrench ? 10.6 : isStraight ? 10.2 : 6.4;
  const barrelHalfH = isMini ? 1.55 : clamp((attrs.diameterMm || 48) / 22, 1.7, 2.75);

  // Handles (if applicable)
  if (hasHandles) {
    for (const dir of [-1, 1]) {
      const hStart = dir * barrelHalfLen;
      const hLen = 3.6;
      const hGrad = ctx.createLinearGradient(0, -1.2, 0, 1.2);
      hGrad.addColorStop(0, shade(handleCol, 0.25));
      hGrad.addColorStop(0.5, handleCol);
      hGrad.addColorStop(1, shade(handleCol, -0.32));

      // Metal axle pin
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(dir > 0 ? hStart - 0.2 : hStart - 0.6, -0.45, 0.8, 0.9);

      // Turned handle knob
      ctx.fillStyle = hGrad;
      ctx.beginPath();
      const x0 = dir > 0 ? hStart + 0.4 : hStart - 0.4 - hLen;
      ctx.roundRect(x0, -1.05, hLen, 2.1, 0.95);
      ctx.fill();
      ctx.strokeStyle = shade(handleCol, -0.42);
      ctx.lineWidth = 0.28;
      ctx.stroke();

      // Stepped silicone thickness rings
      if (attrs.shape === 'stepped_rings') {
        ctx.fillStyle = attrs.accentColor || '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(dir > 0 ? hStart - 0.85 : hStart - 0.15, -barrelHalfH - 0.42, 1.0, (barrelHalfH + 0.42) * 2, 0.35);
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 0.24;
        ctx.stroke();
      }
    }
  }

  // Main barrel body
  const bGrad = ctx.createLinearGradient(0, -barrelHalfH, 0, barrelHalfH);
  bGrad.addColorStop(0.0, shade(bodyCol, 0.38));
  bGrad.addColorStop(0.32, shade(bodyCol, 0.14));
  bGrad.addColorStop(0.7, bodyCol);
  bGrad.addColorStop(1.0, shade(bodyCol, -0.34));

  ctx.fillStyle = bGrad;
  ctx.beginPath();
  if (isFrench) {
    const tipH = barrelHalfH * 0.48;
    ctx.moveTo(-barrelHalfLen, -tipH);
    ctx.quadraticCurveTo(-barrelHalfLen * 0.45, -barrelHalfH, 0, -barrelHalfH);
    ctx.quadraticCurveTo(barrelHalfLen * 0.45, -barrelHalfH, barrelHalfLen, -tipH);
    ctx.quadraticCurveTo(barrelHalfLen + 0.6, 0, barrelHalfLen, tipH);
    ctx.quadraticCurveTo(barrelHalfLen * 0.45, barrelHalfH, 0, barrelHalfH);
    ctx.quadraticCurveTo(-barrelHalfLen * 0.45, barrelHalfH, -barrelHalfLen, tipH);
    ctx.quadraticCurveTo(-barrelHalfLen - 0.6, 0, -barrelHalfLen, -tipH);
    ctx.closePath();
  } else {
    ctx.roundRect(-barrelHalfLen, -barrelHalfH, barrelHalfLen * 2, barrelHalfH * 2, 0.8);
  }
  ctx.fill();

  // Clip barrel interior for surface patterns
  ctx.save();
  ctx.clip();
  if (attrs.pattern === 'wood_grain') {
    ctx.strokeStyle = patCol;
    ctx.globalAlpha = 0.32;
    ctx.lineWidth = 0.35;
    for (let y = -barrelHalfH + 0.7; y < barrelHalfH; y += 1.05) {
      ctx.beginPath();
      ctx.moveTo(-barrelHalfLen, y);
      ctx.bezierCurveTo(-2.5, y + 0.35, 2.5, y - 0.35, barrelHalfLen, y);
      ctx.stroke();
    }
  } else if (attrs.pattern === 'marble_veins') {
    ctx.strokeStyle = patCol;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 0.38;
    for (let x = -barrelHalfLen + 1.5; x < barrelHalfLen; x += 2.6) {
      ctx.beginPath();
      ctx.moveTo(x - 1.2, -barrelHalfH);
      ctx.quadraticCurveTo(x + 0.6, 0, x - 0.8, barrelHalfH);
      ctx.stroke();
    }
  } else if (attrs.pattern === 'carved_floral' || attrs.pattern === 'carved_folklore' || attrs.pattern === 'carved_lattice' || attrs.pattern === 'carved_waves') {
    drawEmbossedPatternOverlay(ctx, attrs.pattern, barrelHalfLen - 0.4, barrelHalfH - 0.3, patCol);
  } else if (attrs.pattern === 'pastel_speckle') {
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.35;
    for (let x = -barrelHalfLen + 1; x < barrelHalfLen; x += 1.8) {
      ctx.beginPath();
      ctx.arc(x, ((Math.abs(x * 7) % 3) - 1) * 0.9, 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Specular highlight strip
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(-barrelHalfLen, -barrelHalfH + 0.35, barrelHalfLen * 2, Math.max(0.55, barrelHalfH * 0.36));
  ctx.restore();

  ctx.strokeStyle = shade(bodyCol, -0.45);
  ctx.lineWidth = 0.32;
  ctx.stroke();

  ctx.restore();
  return true;
}

export function drawDoughItem(
  ctx: CanvasRenderingContext2D,
  item?: any
): boolean {
  const attrs: DoughAttributes = item?.doughAttributes || buildDefaultDoughAttributes();
  const baseRawCol = attrs.color || '#f5ead6';
  const brown = clamp(item?.brownLevel ?? (attrs.cookState === 'baked' || attrs.cookState === 'fried' || attrs.cookState === 'deep_fried' ? 0.58 : 0), 0, 1);
  const char = clamp(item?.charLevel ?? (attrs.cookState === 'burnt' ? 0.78 : 0), 0, 1);

  // Resolve visual surface color dynamically from ingredient blend + cooking state
  let surfCol = baseRawCol;
  if (attrs.cookState === 'boiled' || attrs.cookState === 'steamed') {
    surfCol = mixHex(baseRawCol, '#fffbeb', 0.22);
  } else if (brown > 0.02) {
    const goldenTarget = attrs.sweetness >= 30 || attrs.eggPct >= 14 ? '#c2741b' : '#b46924';
    surfCol = mixHex(baseRawCol, goldenTarget, clamp(brown * 0.78, 0, 0.8));
  }
  if (char > 0.08) {
    surfCol = mixHex(surfCol, '#261810', clamp(char * 0.85, 0, 0.86));
  }

  const hiCol = shade(surfCol, 0.26);
  const shCol = shade(surfCol, -0.24);
  const rimCol = shade(surfCol, -0.42);
  const embossCol = shade(surfCol, -0.32);

  // Subtle visual scale from weight & oven rise
  const massScale = clamp(0.78 + Math.cbrt(Math.max(20, attrs.weightGrams) / 250) * 0.22, 0.78, 1.12);
  const riseScale = clamp(attrs.riseFactor || 1.0, 1.0, 1.35);

  ctx.save();
  ctx.scale(massScale, massScale);

  const makeDomeGrad = (rx: number, ry: number) => {
    const g = ctx.createRadialGradient(-rx * 0.28, -ry * 0.3, 0.8, 0, 0, Math.max(rx, ry) * 1.12);
    g.addColorStop(0.0, hiCol);
    g.addColorStop(0.62, surfCol);
    g.addColorStop(1.0, shCol);
    return g;
  };

  switch (attrs.shape) {
    case 'lump': {
      drawShadow(ctx, 7.6, 2.8, 6.6, 0.24);
      ctx.fillStyle = makeDomeGrad(7.6, 5.8);
      ctx.beginPath();
      ctx.moveTo(-6.8, 2.4);
      ctx.bezierCurveTo(-8.2, -1.8, -4.6, -6.2, 0.2, -5.8);
      ctx.bezierCurveTo(5.6, -5.6, 8.4, -1.4, 7.2, 2.8);
      ctx.bezierCurveTo(6.2, 5.8, -5.6, 5.6, -6.8, 2.4);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.clip();
      drawDoughFlecks(ctx, attrs.fleckColor, 7, 5);
      // Flour dusting when raw
      if (attrs.cookState === 'raw') {
        ctx.fillStyle = 'rgba(255,255,255,0.34)';
        ctx.beginPath();
        ctx.ellipse(-1.4, -2.1, 3.2, 1.6, -0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 0.42;
      ctx.stroke();
      break;
    }

    case 'ball':
    case 'bun': {
      const ry = attrs.shape === 'bun' ? 6.2 * Math.min(1.15, riseScale) : 6.6;
      drawShadow(ctx, 7.2, 2.6, 6.2, 0.25);
      ctx.fillStyle = makeDomeGrad(7.2, ry);
      ctx.beginPath();
      ctx.ellipse(0, 0.4, 7.2, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.clip();
      drawDoughFlecks(ctx, attrs.fleckColor, 6.5, ry);
      if (attrs.shape === 'bun' && attrs.cookState !== 'raw') {
        // Glossy baked bun top shine
        ctx.fillStyle = 'rgba(255,248,225,0.28)';
        ctx.beginPath();
        ctx.ellipse(-1.8, -2.5, 2.8, 1.2, -0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 0.42;
      ctx.stroke();
      break;
    }

    case 'flatbread':
    case 'sheet': {
      const isThin = attrs.shape === 'sheet';
      const rx = isThin ? 9.4 : 8.4;
      const ry = isThin ? 6.4 : 5.8;
      drawShadow(ctx, rx, 2.2, ry + 0.8, 0.22);
      ctx.fillStyle = makeDomeGrad(rx, ry);
      ctx.beginPath();
      ctx.ellipse(0, 0.6, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.clip();
      drawDoughFlecks(ctx, attrs.fleckColor, rx - 1, ry - 1);
      drawEmbossedPatternOverlay(ctx, attrs.embossedPattern, rx - 1, ry - 1, embossCol);
      drawFillingDots(ctx, attrs, rx * 0.72, ry * 0.72);
      // Rustic dimples on flatbread
      if (!isThin && attrs.fillings.length === 0) {
        ctx.fillStyle = shCol;
        ctx.globalAlpha = 0.35;
        for (const [dx, dy] of [[-2.6, -1.2], [2.4, -0.8], [0.2, 1.6], [-2.0, 2.0]]) {
          ctx.beginPath();
          ctx.ellipse(dx, dy, 1.1, 0.7, 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = isThin ? 0.36 : 0.46;
      ctx.stroke();
      break;
    }

    case 'square_sheet': {
      drawShadow(ctx, 8.8, 2.2, 6.6, 0.22);
      ctx.fillStyle = makeDomeGrad(8.8, 6.2);
      ctx.beginPath();
      ctx.roundRect(-8.8, -5.8, 17.6, 11.6, 1.4);
      ctx.fill();
      ctx.save();
      ctx.clip();
      drawDoughFlecks(ctx, attrs.fleckColor, 8, 5.2);
      drawEmbossedPatternOverlay(ctx, attrs.embossedPattern, 8.2, 5.2, embossCol);
      drawFillingDots(ctx, attrs, 6.4, 4.2);
      ctx.restore();
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 0.4;
      ctx.stroke();
      break;
    }

    case 'open_pie': {
      drawShadow(ctx, 9.0, 2.5, 6.8, 0.25);
      // Raised outer crust ring
      ctx.fillStyle = makeDomeGrad(8.8, 6.6);
      ctx.beginPath();
      ctx.ellipse(0, 0.4, 8.8, 6.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 0.46;
      ctx.stroke();

      // Inner recessed filling bed
      const fillBase =
        attrs.fillings.length > 0
          ? attrs.fillings[0].colorHex
          : shade(surfCol, -0.08);
      ctx.fillStyle = mixHex(fillBase, surfCol, attrs.fillings.length > 0 ? 0.18 : 0.7);
      ctx.beginPath();
      ctx.ellipse(0, 0.5, 6.5, 4.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.clip();
      drawFillingDots(ctx, attrs, 5.6, 3.8);
      ctx.restore();
      ctx.strokeStyle = shCol;
      ctx.lineWidth = 0.38;
      ctx.stroke();
      break;
    }

    case 'loaf': {
      drawShadow(ctx, 9.2, 2.8, 5.6, 0.28);
      const ry = clamp(5.0 * Math.min(1.18, riseScale), 4.6, 6.2);
      ctx.fillStyle = makeDomeGrad(9.0, ry);
      ctx.beginPath();
      ctx.roundRect(-9.0, -ry * 0.88, 18.0, ry * 1.76, ry * 0.82);
      ctx.fill();
      ctx.save();
      ctx.clip();
      drawDoughFlecks(ctx, attrs.fleckColor, 8.2, ry * 0.75);
      // Baker's diagonal score slashes
      ctx.strokeStyle = attrs.cookState === 'raw' ? shCol : shade(hiCol, 0.18);
      ctx.lineWidth = 0.9;
      ctx.lineCap = 'round';
      for (const sx of [-4.6, -0.4, 3.8]) {
        ctx.beginPath();
        ctx.moveTo(sx - 1.4, -ry * 0.52);
        ctx.lineTo(sx + 1.8, ry * 0.35);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 0.44;
      ctx.stroke();
      break;
    }

    case 'rope': {
      ctx.save();
      ctx.rotate(-0.32);
      drawShadow(ctx, 9.6, 2.0, 3.2, 0.24);
      ctx.fillStyle = makeDomeGrad(9.4, 2.4);
      ctx.beginPath();
      ctx.roundRect(-9.4, -2.2, 18.8, 4.4, 2.2);
      ctx.fill();
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 0.4;
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'braid': {
      drawShadow(ctx, 9.2, 2.4, 4.6, 0.26);
      ctx.fillStyle = makeDomeGrad(8.8, 4.4);
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.ellipse(i * 3.1, i % 2 === 0 ? -0.9 : 0.9, 2.9, 2.1, i % 2 === 0 ? 0.42 : -0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rimCol;
        ctx.lineWidth = 0.38;
        ctx.stroke();
      }
      break;
    }

    case 'bagel_ring': {
      drawShadow(ctx, 7.8, 2.4, 6.8, 0.25);
      ctx.fillStyle = makeDomeGrad(7.6, 6.2);
      ctx.beginPath();
      ctx.ellipse(0, 0.3, 7.6, 6.2, 0, 0, Math.PI * 2);
      ctx.ellipse(0, 0.3, 2.9, 2.2, 0, 0, Math.PI * 2, true);
      ctx.fill('evenodd');
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 0.42;
      ctx.beginPath();
      ctx.ellipse(0, 0.3, 7.6, 6.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0.3, 2.9, 2.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case 'croissant_crescent': {
      drawShadow(ctx, 8.6, 2.4, 5.6, 0.26);
      ctx.fillStyle = makeDomeGrad(8.4, 5.4);
      ctx.beginPath();
      ctx.moveTo(-7.8, 3.6);
      ctx.quadraticCurveTo(-5.8, -5.6, 0, -5.8);
      ctx.quadraticCurveTo(5.8, -5.6, 7.8, 3.6);
      ctx.quadraticCurveTo(4.2, 4.8, 3.2, 1.2);
      ctx.quadraticCurveTo(0, -1.6, -3.2, 1.2);
      ctx.quadraticCurveTo(-4.2, 4.8, -7.8, 3.6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 0.44;
      ctx.stroke();
      // Rolled layer crease lines
      ctx.strokeStyle = shCol;
      ctx.lineWidth = 0.42;
      for (const cx of [-2.8, 0, 2.8]) {
        ctx.beginPath();
        ctx.moveTo(cx, -4.6);
        ctx.quadraticCurveTo(cx * 0.7, -1.2, cx * 0.8, 0.8);
        ctx.stroke();
      }
      break;
    }

    case 'pocket_pirozhok': {
      drawShadow(ctx, 8.6, 2.5, 5.4, 0.26);
      ctx.fillStyle = makeDomeGrad(8.6, 5.0);
      ctx.beginPath();
      ctx.moveTo(-8.8, 0.4);
      ctx.quadraticCurveTo(-4.8, -5.2, 0, -5.0);
      ctx.quadraticCurveTo(4.8, -5.2, 8.8, 0.4);
      ctx.quadraticCurveTo(4.8, 5.4, 0, 5.2);
      ctx.quadraticCurveTo(-4.8, 5.4, -8.8, 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.clip();
      drawDoughFlecks(ctx, attrs.fleckColor, 7.5, 4.2);
      ctx.restore();
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 0.44;
      ctx.stroke();
      // Pinched central seam ridge
      ctx.strokeStyle = shCol;
      ctx.lineWidth = 0.48;
      ctx.beginPath();
      ctx.moveTo(-6.8, 0.3);
      ctx.quadraticCurveTo(0, -0.8, 6.8, 0.3);
      ctx.stroke();
      break;
    }

    case 'dumpling_crescent': {
      drawShadow(ctx, 8.2, 2.4, 5.2, 0.25);
      ctx.fillStyle = makeDomeGrad(8.0, 5.0);
      ctx.beginPath();
      ctx.moveTo(-7.8, 1.8);
      ctx.quadraticCurveTo(-6.2, -5.2, 0, -5.2);
      ctx.quadraticCurveTo(6.2, -5.2, 7.8, 1.8);
      ctx.quadraticCurveTo(0, 4.2, -7.8, 1.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 0.44;
      ctx.stroke();
      // Crimped scalloped crest along top arc
      ctx.strokeStyle = shCol;
      ctx.lineWidth = 0.38;
      for (let i = -3; i <= 3; i++) {
        const ang = -Math.PI / 2 + i * 0.32;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * 7.2, Math.sin(ang) * 4.6 + 0.6);
        ctx.lineTo(Math.cos(ang) * 5.2, Math.sin(ang) * 3.1 + 0.6);
        ctx.stroke();
      }
      break;
    }

    case 'pouch_khinkali': {
      drawShadow(ctx, 7.6, 2.5, 6.4, 0.26);
      ctx.fillStyle = makeDomeGrad(7.4, 5.8);
      ctx.beginPath();
      ctx.moveTo(-1.4, -6.2);
      ctx.lineTo(1.4, -6.2);
      ctx.bezierCurveTo(2.4, -3.4, 7.8, -1.6, 7.2, 2.8);
      ctx.bezierCurveTo(6.6, 5.8, -6.6, 5.8, -7.2, 2.8);
      ctx.bezierCurveTo(-7.8, -1.6, -2.4, -3.4, -1.4, -6.2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 0.44;
      ctx.stroke();
      // Pleat folds radiating from twisted top knot
      ctx.strokeStyle = shCol;
      ctx.lineWidth = 0.36;
      for (const px of [-4.4, -2.0, 0, 2.0, 4.4]) {
        ctx.beginPath();
        ctx.moveTo(px * 0.25, -4.6);
        ctx.quadraticCurveTo(px * 0.85, -1.0, px, 3.2);
        ctx.stroke();
      }
      break;
    }

    case 'roll_strudel': {
      drawShadow(ctx, 9.0, 2.6, 5.2, 0.26);
      ctx.fillStyle = makeDomeGrad(8.8, 4.6);
      ctx.beginPath();
      ctx.roundRect(-8.8, -4.4, 17.6, 8.8, 2.6);
      ctx.fill();
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 0.44;
      ctx.stroke();
      // Visible swirl on the right cut face showing filling!
      const swirlCol = attrs.fillings[0]?.colorHex || '#92400e';
      ctx.fillStyle = shade(surfCol, 0.14);
      ctx.beginPath();
      ctx.ellipse(6.8, 0, 2.1, 4.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = swirlCol;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.arc(6.8, 0, 1.35, 0, Math.PI * 1.75);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(6.8, 0, 0.55, 0.4, Math.PI * 1.9);
      ctx.stroke();
      break;
    }

    case 'noodles':
    case 'strip': {
      drawShadow(ctx, 8.4, 2.2, 5.2, 0.22);
      const isFine = attrs.shape === 'noodles';
      const w = isFine ? 1.15 : 2.1;
      const count = isFine ? 7 : 4;
      for (let i = 0; i < count; i++) {
        const yOff = -4.2 + (i / Math.max(1, count - 1)) * 8.4;
        ctx.fillStyle = i % 2 === 0 ? surfCol : hiCol;
        ctx.strokeStyle = rimCol;
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(-8.2, yOff - w * 0.45);
        ctx.bezierCurveTo(-3, yOff - 1.3, 3, yOff + 1.1, 8.2, yOff - w * 0.45);
        ctx.lineTo(8.2, yOff + w * 0.45);
        ctx.bezierCurveTo(3, yOff + 1.1 + w, -3, yOff - 1.3 + w, -8.2, yOff + w * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case 'cubes_pieces':
    default: {
      drawShadow(ctx, 7.8, 2.4, 5.6, 0.22);
      const pieces: [number, number, number, number][] = [
        [-4.2, -2.0, 2.6, 2.0],
        [1.2, -2.6, 2.5, 2.1],
        [4.4, 0.6, 2.4, 2.0],
        [-1.0, 1.4, 2.8, 2.2],
        [-4.8, 2.4, 2.3, 1.9],
      ];
      for (const [px, py, rx, ry] of pieces) {
        ctx.fillStyle = makeDomeGrad(rx, ry);
        ctx.beginPath();
        ctx.ellipse(px, py, rx, ry, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rimCol;
        ctx.lineWidth = 0.36;
        ctx.stroke();
      }
      break;
    }
  }

  ctx.restore();
  return true;
}
