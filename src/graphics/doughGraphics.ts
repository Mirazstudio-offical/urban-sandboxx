import {
  DoughAttributes,
  DoughFillingEntry,
  RollingPinAttributes,
  RollingPinPattern,
} from '../types';
import {
  buildDefaultDoughAttributes,
  buildRollingPinAttributes,
  isDoughFillingVisible,
} from '../doughData';
import {
  adjustHex,
  drawBotanicalLeaf,
  drawLitEllipse,
  drawLitSphere,
  drawOrganicBlobPath,
  drawShadow,
  hash01,
  hexToRgba,
  mixHex,
} from './itemGraphicShared';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function shade(hex: string, amount: number): string {
  return amount >= 0
    ? mixHex(hex, '#ffffff', clamp(amount, 0, 1))
    : mixHex(hex, '#180d06', clamp(-amount, 0, 1));
}

// ============================================================================
// 1. EMBOSSED PATTERN OVERLAY (3D Debossed Relief with Highlight & Shadow)
// ============================================================================

function drawEmbossedPatternOverlay(
  ctx: CanvasRenderingContext2D,
  pattern: RollingPinPattern | undefined,
  rx: number,
  ry: number,
  shadowCol: string,
  highlightCol: string
) {
  if (
    !pattern ||
    pattern === 'none' ||
    pattern === 'wood_grain' ||
    pattern === 'marble_veins' ||
    pattern === 'brushed_metal' ||
    pattern === 'pastel_speckle'
  ) {
    return;
  }

  const renderPass = (color: string, alpha: number, offsetX: number, offsetY: number, lw: number) => {
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';

    if (pattern === 'carved_lattice') {
      const step = 2.15;
      for (let x = -rx - ry; x <= rx + ry; x += step) {
        ctx.beginPath();
        ctx.moveTo(x - ry * 0.75, -ry);
        ctx.lineTo(x + ry * 0.75, ry);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + ry * 0.75, -ry);
        ctx.lineTo(x - ry * 0.75, ry);
        ctx.stroke();
      }
      // Small diamond dimples at lattice centers
      for (let y = -ry + 1.1; y <= ry - 1.1; y += step) {
        for (let x = -rx + 1.1; x <= rx - 1.1; x += step) {
          ctx.beginPath();
          ctx.arc(x, y, 0.24, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (pattern === 'carved_waves') {
      for (let y = -ry + 1.3; y <= ry - 1.3; y += 1.95) {
        ctx.beginPath();
        for (let x = -rx; x <= rx; x += 0.85) {
          const wy = y + Math.sin(x * 1.45 + y * 0.6) * 0.68;
          if (x === -rx) ctx.moveTo(x, wy);
          else ctx.lineTo(x, wy);
        }
        ctx.stroke();
      }
    } else if (pattern === 'carved_folklore') {
      const stepX = 3.3;
      const stepY = 3.1;
      for (let y = -ry + 1.8; y <= ry - 1.8; y += stepY) {
        for (let x = -rx + 1.8; x <= rx - 1.8; x += stepX) {
          // Diamond rosette
          ctx.beginPath();
          ctx.moveTo(x, y - 1.15);
          ctx.lineTo(x + 1.15, y);
          ctx.lineTo(x, y + 1.15);
          ctx.lineTo(x - 1.15, y);
          ctx.closePath();
          ctx.stroke();
          // Corner berries
          for (const [dx, dy] of [
            [0, -0.55],
            [0.55, 0],
            [0, 0.55],
            [-0.55, 0],
          ]) {
            ctx.beginPath();
            ctx.arc(x + dx, y + dy, 0.22, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    } else {
      // carved_floral botanical rosettes & leaves
      const step = 3.4;
      for (let y = -ry + 1.9; y <= ry - 1.8; y += step) {
        for (let x = -rx + 1.9; x <= rx - 1.8; x += step) {
          for (let p = 0; p < 6; p++) {
            const a = (p / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.ellipse(
              x + Math.cos(a) * 0.68,
              y + Math.sin(a) * 0.68,
              0.44,
              0.25,
              a,
              0,
              Math.PI * 2
            );
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.arc(x, y, 0.28, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  };

  // Bottom-right lit bevel ridge + recessed dark cavity
  renderPass(highlightCol, 0.42, 0.22, 0.24, 0.44);
  renderPass(shadowCol, 0.58, 0, 0, 0.38);
}

// ============================================================================
// 2. ROLLING PIN STUDIO RENDERER (7 Models & Materials)
// ============================================================================

export function drawRollingPinItem(
  ctx: CanvasRenderingContext2D,
  item?: any
): boolean {
  const attrs: RollingPinAttributes = buildRollingPinAttributes(
    item?.rollingPinAttributes
  );
  const bodyCol = attrs.color || '#d4a373';
  const handleCol = attrs.accentColor || '#9c6644';
  const patCol = attrs.patternColor || shade(bodyCol, -0.35);

  ctx.save();
  ctx.rotate(-0.56);
  drawShadow(ctx, 10.2, 1.95, 3.3, 0.27);

  const isMini = attrs.shape === 'mini_dowel' || attrs.modelId === 'mini_pastry';
  const isFrench = attrs.shape === 'tapered_french';
  const isStraight = attrs.shape === 'straight_cylinder' || isMini;
  const hasHandles =
    attrs.shape === 'cylindrical_handles' || attrs.shape === 'stepped_rings';

  const barrelHalfLen = isMini
    ? 6.9
    : isFrench
    ? 10.7
    : isStraight
    ? 10.3
    : 6.45;
  const barrelHalfH = isMini
    ? 1.58
    : clamp((attrs.diameterMm || 48) / 21.5, 1.75, 2.85);

  // 1. Turned Handles & Steel Axle Hardware
  if (hasHandles) {
    for (const dir of [-1, 1]) {
      const hStart = dir * barrelHalfLen;
      const hLen = 3.75;

      // Brushed stainless steel central rod + bearing washer
      const rodGrad = ctx.createLinearGradient(0, -0.75, 0, 0.75);
      rodGrad.addColorStop(0, '#f8fafc');
      rodGrad.addColorStop(0.45, '#94a3b8');
      rodGrad.addColorStop(1, '#334155');
      ctx.fillStyle = rodGrad;
      ctx.fillRect(
        dir > 0 ? hStart - 0.2 : hStart - 0.75,
        -0.52,
        0.95,
        1.04
      );

      // Ergonomic contoured handle grip
      const hGrad = ctx.createLinearGradient(0, -1.35, 0, 1.35);
      hGrad.addColorStop(0, shade(handleCol, 0.36));
      hGrad.addColorStop(0.28, shade(handleCol, 0.14));
      hGrad.addColorStop(0.65, handleCol);
      hGrad.addColorStop(1, shade(handleCol, -0.42));

      const x0 = dir > 0 ? hStart + 0.45 : hStart - 0.45 - hLen;
      const xTip = dir > 0 ? x0 + hLen : x0;
      const xBase = dir > 0 ? x0 : x0 + hLen;

      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.moveTo(xBase, -0.82);
      ctx.bezierCurveTo(
        (xBase + xTip) * 0.5,
        -1.38,
        xTip - dir * 0.7,
        -1.25,
        xTip,
        -0.55
      );
      ctx.quadraticCurveTo(xTip + dir * 0.35, 0, xTip, 0.55);
      ctx.bezierCurveTo(
        xTip - dir * 0.7,
        1.25,
        (xBase + xTip) * 0.5,
        1.38,
        xBase,
        0.82
      );
      ctx.closePath();
      ctx.fill();

      // Specular highlight along handle crown
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.beginPath();
      ctx.ellipse(
        (xBase + xTip) * 0.52,
        -0.52,
        hLen * 0.36,
        0.26,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.strokeStyle = shade(handleCol, -0.48);
      ctx.lineWidth = 0.28;
      ctx.stroke();

      // Stepped removable pastry thickness rings (dual colored rings)
      if (attrs.shape === 'stepped_rings') {
        const ringX = dir > 0 ? hStart - 0.95 : hStart - 0.15;
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.roundRect(
          ringX + (dir > 0 ? -0.45 : 0.45),
          -barrelHalfH - 0.28,
          0.55,
          (barrelHalfH + 0.28) * 2,
          0.25
        );
        ctx.fill();

        ctx.fillStyle = attrs.accentColor || '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(
          ringX,
          -barrelHalfH - 0.52,
          0.95,
          (barrelHalfH + 0.52) * 2,
          0.35
        );
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 0.24;
        ctx.stroke();
      }
    }
  }

  // 2. Main Rolling Barrel Body
  const bGrad = ctx.createLinearGradient(0, -barrelHalfH, 0, barrelHalfH);
  bGrad.addColorStop(0.0, shade(bodyCol, 0.42));
  bGrad.addColorStop(0.22, shade(bodyCol, 0.2));
  bGrad.addColorStop(0.58, bodyCol);
  bGrad.addColorStop(0.88, shade(bodyCol, -0.32));
  bGrad.addColorStop(1.0, shade(bodyCol, -0.45));

  const traceBarrel = () => {
    ctx.beginPath();
    if (isFrench) {
      const tipH = barrelHalfH * 0.44;
      ctx.moveTo(-barrelHalfLen, -tipH);
      ctx.quadraticCurveTo(
        -barrelHalfLen * 0.48,
        -barrelHalfH * 1.04,
        0,
        -barrelHalfH
      );
      ctx.quadraticCurveTo(
        barrelHalfLen * 0.48,
        -barrelHalfH * 1.04,
        barrelHalfLen,
        -tipH
      );
      ctx.quadraticCurveTo(barrelHalfLen + 0.65, 0, barrelHalfLen, tipH);
      ctx.quadraticCurveTo(
        barrelHalfLen * 0.48,
        barrelHalfH * 1.04,
        0,
        barrelHalfH
      );
      ctx.quadraticCurveTo(
        -barrelHalfLen * 0.48,
        barrelHalfH * 1.04,
        -barrelHalfLen,
        tipH
      );
      ctx.quadraticCurveTo(-barrelHalfLen - 0.65, 0, -barrelHalfLen, -tipH);
      ctx.closePath();
    } else {
      ctx.roundRect(
        -barrelHalfLen,
        -barrelHalfH,
        barrelHalfLen * 2,
        barrelHalfH * 2,
        0.75
      );
    }
  };

  ctx.fillStyle = bGrad;
  traceBarrel();
  ctx.fill();

  // 3. Surface Material & Carved Texture inside Barrel
  ctx.save();
  traceBarrel();
  ctx.clip();

  if (attrs.pattern === 'wood_grain') {
    ctx.strokeStyle = patCol;
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const y = -barrelHalfH + 0.45 + (i / 6) * (barrelHalfH * 2 - 0.9);
      ctx.globalAlpha = i % 2 === 0 ? 0.36 : 0.22;
      ctx.lineWidth = i % 3 === 0 ? 0.38 : 0.24;
      ctx.beginPath();
      ctx.moveTo(-barrelHalfLen, y);
      ctx.bezierCurveTo(
        -barrelHalfLen * 0.35,
        y + (i % 2 === 0 ? 0.42 : -0.35),
        barrelHalfLen * 0.35,
        y + (i % 2 === 0 ? -0.38 : 0.42),
        barrelHalfLen,
        y + 0.1
      );
      ctx.stroke();
    }
    // Wood knot / cathedral arch
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.ellipse(-2.1, 0.2, 2.6, 0.65, 0.08, 0, Math.PI * 2);
    ctx.stroke();
  } else if (attrs.pattern === 'marble_veins') {
    // Translucent sub-surface grey/slate Carrara marble veins
    for (let i = 0; i < 6; i++) {
      const x = -barrelHalfLen + 1.4 + i * 3.1;
      ctx.strokeStyle = i % 2 === 0 ? patCol : shade(patCol, 0.25);
      ctx.globalAlpha = i % 2 === 0 ? 0.46 : 0.25;
      ctx.lineWidth = i % 2 === 0 ? 0.42 : 0.22;
      ctx.beginPath();
      ctx.moveTo(x - 1.4, -barrelHalfH);
      ctx.bezierCurveTo(
        x + 0.8,
        -barrelHalfH * 0.2,
        x - 1.1,
        barrelHalfH * 0.3,
        x + 0.5,
        barrelHalfH
      );
      ctx.stroke();
    }
  } else if (
    attrs.pattern === 'carved_floral' ||
    attrs.pattern === 'carved_folklore' ||
    attrs.pattern === 'carved_lattice' ||
    attrs.pattern === 'carved_waves'
  ) {
    drawEmbossedPatternOverlay(
      ctx,
      attrs.pattern,
      barrelHalfLen - 0.35,
      barrelHalfH - 0.25,
      shade(patCol, -0.25),
      shade(bodyCol, 0.35)
    );
  } else if (attrs.pattern === 'pastel_speckle') {
    for (let i = 0; i < 24; i++) {
      const sx = (hash01(attrs.modelId, i * 2) - 0.5) * barrelHalfLen * 1.85;
      const sy = (hash01(attrs.modelId, i * 2 + 1) - 0.5) * barrelHalfH * 1.75;
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : shade(bodyCol, -0.35);
      ctx.globalAlpha = 0.38;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.22 + (i % 3) * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Cylindrical studio specular highlight bar + lower rim bounce light
  const specH = Math.max(0.55, barrelHalfH * 0.34);
  const specGrad = ctx.createLinearGradient(
    0,
    -barrelHalfH + 0.25,
    0,
    -barrelHalfH + 0.25 + specH
  );
  specGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
  specGrad.addColorStop(0.45, attrs.material === 'marble' ? 'rgba(255,255,255,0.52)' : 'rgba(255,255,255,0.32)');
  specGrad.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = specGrad;
  ctx.fillRect(-barrelHalfLen, -barrelHalfH + 0.22, barrelHalfLen * 2, specH);

  // Subtle flour dust traces on the rolling pin barrel
  ctx.fillStyle = 'rgba(255, 253, 245, 0.22)';
  ctx.beginPath();
  ctx.ellipse(-1.8, 0.25, 3.2, 0.85, -0.1, 0, Math.PI * 2);
  ctx.ellipse(2.6, -0.35, 2.4, 0.65, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = shade(bodyCol, -0.48);
  ctx.lineWidth = 0.34;
  traceBarrel();
  ctx.stroke();

  ctx.restore();
  return true;
}

// ============================================================================
// 3. DOUGH COLOR, CRUST, MICRO-TEXTURE & INGREDIENT INCLUSION ENGINE
// ============================================================================

interface DoughSurfacePalette {
  baseRawCol: string;
  crumbCol: string;
  crumbLight: string;
  crumbDark: string;
  surfCol: string;
  hiCol: string;
  shCol: string;
  deepCol: string;
  rimCol: string;
  equatorCol: string;
  blisterLight: string;
  blisterDark: string;
  brown: number;
  char: number;
  isWetBoiled: boolean;
  isFried: boolean;
  isBaked: boolean;
  isBurnt: boolean;
  isGlossyEgg: boolean;
  seed: string;
}

function buildDoughSurfacePalette(
  attrs: DoughAttributes,
  item?: any
): DoughSurfacePalette {
  const baseRawCol = attrs.color || '#f5ead6';
  const isWetBoiled =
    attrs.cookState === 'boiled' || attrs.cookState === 'steamed';
  const isFried =
    attrs.cookState === 'fried' || attrs.cookState === 'deep_fried';
  const isBaked = attrs.cookState === 'baked';
  const isBurnt = attrs.cookState === 'burnt';

  const defaultBrown =
    isBaked || isFried
      ? attrs.cookState === 'deep_fried'
        ? 0.68
        : 0.58
      : isBurnt
      ? 0.92
      : 0;
  const brown = clamp(item?.brownLevel ?? defaultBrown, 0, 1);
  const char = clamp(item?.charLevel ?? (isBurnt ? 0.8 : 0), 0, 1);

  // Internal alveolar crumb color stays lighter and creamier than the seared outer crust
  const crumbCol = isWetBoiled
    ? mixHex(baseRawCol, '#fffdf5', 0.25)
    : isBurnt
    ? mixHex(baseRawCol, '#4a3222', 0.55)
    : brown > 0.05
    ? mixHex(baseRawCol, '#fdf6e2', 0.18)
    : baseRawCol;
  const crumbLight = shade(crumbCol, 0.24);
  const crumbDark = shade(crumbCol, -0.22);

  let surfCol = baseRawCol;
  if (isWetBoiled) {
    surfCol = mixHex(baseRawCol, '#fffdf7', 0.24);
  } else if (brown > 0.02) {
    const goldenTarget =
      attrs.doughType === 'cocoa_chocolate'
        ? '#3b1c0a'
        : attrs.doughType === 'rye_bread'
        ? '#5c3419'
        : attrs.sweetness >= 28 || attrs.eggPct >= 14
        ? '#c87116'
        : isFried
        ? '#ca781d'
        : '#b86b22';
    surfCol = mixHex(baseRawCol, goldenTarget, clamp(brown * 0.82, 0, 0.84));
  }
  if (char > 0.06) {
    surfCol = mixHex(surfCol, '#1c110b', clamp(char * 0.88, 0, 0.9));
  }

  const hiCol = isWetBoiled
    ? shade(surfCol, 0.32)
    : shade(surfCol, 0.28);
  const shCol = shade(surfCol, -0.26);
  const deepCol = shade(surfCol, -0.44);
  const rimCol = shade(surfCol, -0.52);

  // Pale oven-spring / deep-fry equatorial ring color
  const equatorCol =
    brown > 0.15 && !isBurnt
      ? mixHex(crumbCol, surfCol, 0.36)
      : shade(surfCol, 0.08);

  const blisterLight =
    brown > 0.15 ? shade(surfCol, 0.22) : shade(surfCol, 0.12);
  const blisterDark =
    char > 0.2
      ? '#140c08'
      : brown > 0.15
      ? mixHex(surfCol, '#451a03', 0.55)
      : shade(surfCol, -0.18);

  const isGlossyEgg =
    (isBaked && (attrs.eggPct >= 12 || attrs.richness >= 26)) ||
    isWetBoiled ||
    isFried;

  const seed = `${attrs.doughType}_${attrs.shape}_${attrs.weightGrams}_${attrs.cookState}_${attrs.fillings.length}`;

  return {
    baseRawCol,
    crumbCol,
    crumbLight,
    crumbDark,
    surfCol,
    hiCol,
    shCol,
    deepCol,
    rimCol,
    equatorCol,
    blisterLight,
    blisterDark,
    brown,
    char,
    isWetBoiled,
    isFried,
    isBaked,
    isBurnt,
    isGlossyEgg,
    seed,
  };
}

/**
 * Renders realistic surface micro-texture inside a clipped dough shape:
 * - Ingredient flecks (herbs, bran, rye, corn grits, oats, berries, cocoa, cottage cheese curds)
 * - Consistency & dough-type pores (lacy blin holes, shortcrust sand granules, sourdough fermentation blisters)
 * - Cooking state textures (deep-fry oil micro-bubbles, Maillard oven blisters, raw bench-flour dusting, char spots)
 */
function drawDoughSurfaceMicroTexture(
  ctx: CanvasRenderingContext2D,
  attrs: DoughAttributes,
  pal: DoughSurfacePalette,
  rx: number,
  ry: number,
  options?: { suppressFlour?: boolean; isLacyPancake?: boolean }
) {
  const s = pal.seed;

  // 1. Cottage cheese curds (Творожные крупинки)
  if (attrs.doughType === 'cottage_cheese') {
    for (let i = 0; i < 18; i++) {
      const a = hash01(s + '_curd', i * 3) * Math.PI * 2;
      const d = Math.sqrt(hash01(s + '_curd', i * 3 + 1)) * 0.85;
      const cx = Math.cos(a) * rx * d;
      const cy = Math.sin(a) * ry * d;
      const cr = 0.28 + hash01(s + '_curd', i * 3 + 2) * 0.36;
      ctx.fillStyle = pal.isBurnt ? '#57534e' : '#fffdf7';
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.ellipse(cx, cy, cr * 1.2, cr * 0.85, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 2. Cornmeal / Rye / Oat / Shortcrust granular crumb texture
  if (
    attrs.doughType === 'corn_dough' ||
    attrs.doughType === 'rye_bread' ||
    attrs.doughType === 'shortcrust' ||
    attrs.consistency === 'crumbly'
  ) {
    const granCol =
      attrs.doughType === 'corn_dough'
        ? '#f59e0b'
        : attrs.doughType === 'rye_bread'
        ? '#452712'
        : shade(pal.surfCol, -0.22);
    for (let i = 0; i < 26; i++) {
      const gx = (hash01(s + '_gr', i * 2) - 0.5) * rx * 1.75;
      const gy = (hash01(s + '_gr', i * 2 + 1) - 0.5) * ry * 1.75;
      ctx.fillStyle = i % 3 === 0 ? shade(pal.surfCol, 0.24) : granCol;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(gx, gy, 0.16 + (i % 3) * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 3. Multi-ingredient botanical & pigment flecks from actual dough ingredients
  const hasHerb = attrs.ingredients.some((ing) => {
    const n = ing.nameRu.toLowerCase();
    return (
      n.includes('зелен') ||
      n.includes('укроп') ||
      n.includes('петруш') ||
      n.includes('базилик') ||
      n.includes('шпинат') ||
      n.includes('мят')
    );
  });
  const fleckCol = attrs.fleckColor;
  if (fleckCol || hasHerb) {
    const count = 20;
    for (let i = 0; i < count; i++) {
      const a = hash01(s + '_flk', i * 3) * Math.PI * 2;
      const d = Math.sqrt(hash01(s + '_flk', i * 3 + 1)) * 0.88;
      const fx = Math.cos(a) * rx * d;
      const fy = Math.sin(a) * ry * d;
      const r = 0.18 + hash01(s + '_flk', i * 3 + 2) * 0.28;
      const rot = hash01(s + '_flkR', i) * Math.PI;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(rot);
      ctx.fillStyle =
        hasHerb && i % 2 === 0
          ? i % 4 === 0
            ? '#15803d'
            : '#365314'
          : fleckCol || '#6b4f35';
      ctx.globalAlpha = 0.68;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.45, r * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // 4. Lacy fermentation pores on cooked blini / pancakes (ажурные ноздреватые дырочки)
  if (
    options?.isLacyPancake ||
    ((attrs.doughType === 'liquid_batter' ||
      attrs.doughType === 'pancake_batter') &&
      (pal.isFried || pal.isBaked))
  ) {
    for (let i = 0; i < 28; i++) {
      const a = hash01(s + '_pore', i * 3) * Math.PI * 2;
      const d = Math.sqrt(hash01(s + '_pore', i * 3 + 1)) * 0.88;
      const px = Math.cos(a) * rx * d;
      const py = Math.sin(a) * ry * d;
      const pr = 0.18 + hash01(s + '_pore', i * 3 + 2) * 0.24;
      // Dark pore pit
      ctx.fillStyle = shade(pal.surfCol, -0.38);
      ctx.globalAlpha = 0.62;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
      // Tiny rim highlight around pore
      ctx.strokeStyle = shade(pal.surfCol, 0.22);
      ctx.lineWidth = 0.14;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // 5. Fried / Deep-Fried crispy oil blisters (пузырьки жареного теста)
  if (pal.isFried) {
    const blisterCount = attrs.cookState === 'deep_fried' ? 20 : 13;
    for (let i = 0; i < blisterCount; i++) {
      const a = hash01(s + '_frb', i * 3) * Math.PI * 2;
      const d = Math.sqrt(hash01(s + '_frb', i * 3 + 1)) * 0.82;
      const bx = Math.cos(a) * rx * d;
      const by = Math.sin(a) * ry * d;
      const br = 0.28 + hash01(s + '_frb', i * 3 + 2) * 0.48;

      // Blister shadow ring
      ctx.fillStyle = pal.blisterDark;
      ctx.globalAlpha = 0.46;
      ctx.beginPath();
      ctx.ellipse(bx + 0.1, by + 0.12, br * 1.15, br * 0.88, a, 0, Math.PI * 2);
      ctx.fill();

      // Puffed lighter golden dome
      ctx.fillStyle = pal.blisterLight;
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.ellipse(bx, by, br, br * 0.76, a, 0, Math.PI * 2);
      ctx.fill();

      // Tiny oil glint on top of blister
      ctx.fillStyle = 'rgba(255, 252, 235, 0.55)';
      ctx.beginPath();
      ctx.arc(bx - br * 0.25, by - br * 0.25, Math.max(0.12, br * 0.28), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 6. Baked Maillard caramelization spots & sourdough micro-blisters
  if (pal.isBaked && pal.brown > 0.12) {
    for (let i = 0; i < 12; i++) {
      const a = hash01(s + '_bkb', i * 3) * Math.PI * 2;
      const d = Math.sqrt(hash01(s + '_bkb', i * 3 + 1)) * 0.75;
      const bx = Math.cos(a) * rx * d;
      const by = Math.sin(a) * ry * d;
      const br = 0.35 + hash01(s + '_bkb', i * 3 + 2) * 0.65;
      ctx.fillStyle = pal.blisterDark;
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.ellipse(bx, by, br * 1.25, br * 0.82, a * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 7. Burnt char blisters & carbonized cracks
  if (pal.char > 0.15 || pal.isBurnt) {
    const spots = Math.round(8 + pal.char * 12);
    for (let i = 0; i < spots; i++) {
      const a = hash01(s + '_chr', i * 3) * Math.PI * 2;
      const d = Math.sqrt(hash01(s + '_chr', i * 3 + 1)) * 0.86;
      const cx = Math.cos(a) * rx * d;
      const cy = Math.sin(a) * ry * d;
      const cr = 0.4 + hash01(s + '_chr', i * 3 + 2) * 0.75;
      ctx.fillStyle = i % 2 === 0 ? '#09090b' : '#1c1008';
      ctx.globalAlpha = clamp(0.45 + pal.char * 0.4, 0.4, 0.88);
      ctx.beginPath();
      ctx.ellipse(cx, cy, cr * 1.2, cr * 0.85, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 8. Fine powdery white bench-flour dusting (on raw dough or artisan sourdough bread)
  const showFlour =
    !options?.suppressFlour &&
    ((attrs.cookState === 'raw' && attrs.consistency !== 'batter') ||
      (pal.isBaked &&
        (attrs.doughType === 'sourdough_bread' ||
          attrs.doughType === 'rye_bread' ||
          attrs.shape === 'loaf')));
  if (showFlour) {
    const dustAlpha = attrs.cookState === 'raw' ? 0.36 : 0.26;
    ctx.fillStyle = `rgba(255, 253, 248, ${dustAlpha})`;
    ctx.beginPath();
    ctx.ellipse(-rx * 0.24, -ry * 0.28, rx * 0.42, ry * 0.24, -0.22, 0, Math.PI * 2);
    ctx.fill();

    // Individual fine flour powder particles around dusting zone
    for (let i = 0; i < 18; i++) {
      const a = hash01(s + '_flr', i * 3) * Math.PI * 2;
      const d = Math.sqrt(hash01(s + '_flr', i * 3 + 1)) * 0.84;
      const fx = Math.cos(a) * rx * d;
      const fy = Math.sin(a) * ry * d;
      const fr = 0.14 + hash01(s + '_flr', i * 3 + 2) * 0.22;
      ctx.fillStyle = `rgba(255, 255, 255, ${(dustAlpha * (0.7 + (i % 3) * 0.25)).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 9. Glossy Egg-Wash / Wet Boiled Starch / Sizzling Oil Specular Highlights
  if (pal.isGlossyEgg && !pal.isBurnt) {
    const specAlpha = pal.isWetBoiled ? 0.42 : pal.isFried ? 0.34 : 0.28;
    ctx.fillStyle = `rgba(255, 252, 240, ${specAlpha})`;
    ctx.beginPath();
    ctx.ellipse(-rx * 0.28, -ry * 0.34, rx * 0.32, ry * 0.13, -0.32, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${(specAlpha * 0.75).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(rx * 0.22, -ry * 0.18, rx * 0.14, ry * 0.06, 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Renders porous alveolar bread/dough crumb inside slashes, torn pieces, or cut faces.
 */
function drawAlveolarCrumbTexture(
  ctx: CanvasRenderingContext2D,
  pal: DoughSurfacePalette,
  rx: number,
  ry: number,
  seedSalt: string = 'crumb'
) {
  const s = pal.seed + seedSalt;
  // Base sponge tone
  const g = ctx.createRadialGradient(-rx * 0.2, -ry * 0.2, 0.2, 0, 0, Math.max(rx, ry) * 1.1);
  g.addColorStop(0, pal.crumbLight);
  g.addColorStop(0.65, pal.crumbCol);
  g.addColorStop(1, pal.crumbDark);
  ctx.fillStyle = g;
  ctx.fillRect(-rx * 1.2, -ry * 1.2, rx * 2.4, ry * 2.4);

  // Alveolar gas pores (large + micro fermentation cells)
  const poreCount = Math.max(10, Math.min(28, Math.round((rx * ry) * 0.9)));
  for (let i = 0; i < poreCount; i++) {
    const px = (hash01(s, i * 3) - 0.5) * rx * 1.65;
    const py = (hash01(s, i * 3 + 1) - 0.5) * ry * 1.65;
    const pr = 0.18 + hash01(s, i * 3 + 2) * 0.36;
    const rot = hash01(s + '_r', i) * Math.PI;

    // Shaded pore cavity
    ctx.fillStyle = shade(pal.crumbDark, -0.22);
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.ellipse(px, py, pr * 1.25, pr * 0.82, rot, 0, Math.PI * 2);
    ctx.fill();

    // Bottom cell wall catchlight
    ctx.strokeStyle = pal.crumbLight;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 0.16;
    ctx.beginPath();
    ctx.arc(px, py, pr * 0.95, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ============================================================================
// 4. HYPER-DETAILED FILLING PIECE & INTERIOR CROSS-SECTION ENGINE
// ============================================================================

type FillingVisualArchetype =
  | 'minced_meat'
  | 'sausage_slices'
  | 'meat_chunks'
  | 'poultry'
  | 'fish_seafood'
  | 'mushroom'
  | 'tomato'
  | 'cheese'
  | 'cottage_cheese'
  | 'potato'
  | 'cabbage_onion'
  | 'carrot_veg'
  | 'berry'
  | 'fruit_apple'
  | 'egg_filling'
  | 'chocolate_sweet'
  | 'herbs_greens';

function classifyFillingArchetype(f: DoughFillingEntry): FillingVisualArchetype {
  const id = (f.itemId || '').toLowerCase();
  const n = (f.nameRu || '').toLowerCase();

  if (id.includes('minced') || n.includes('фарш')) return 'minced_meat';
  if (
    id.includes('sausage') ||
    id.includes('salami') ||
    id.includes('ham') ||
    id.includes('bacon') ||
    n.includes('колбас') ||
    n.includes('ветчин') ||
    n.includes('бекон') ||
    n.includes('сосиск') ||
    n.includes('салями')
  ) {
    return 'sausage_slices';
  }
  if (
    id.includes('chicken') ||
    id.includes('turkey') ||
    id.includes('duck') ||
    id.includes('goose') ||
    id.includes('quail') ||
    n.includes('кури') ||
    n.includes('индейк') ||
    n.includes('утк') ||
    n.includes('гус') ||
    n.includes('птиц')
  ) {
    return 'poultry';
  }
  if (
    id.includes('fish') ||
    id.includes('salmon') ||
    id.includes('cod') ||
    id.includes('trout') ||
    id.includes('herring') ||
    id.includes('shrimp') ||
    id.includes('squid') ||
    id.includes('crab') ||
    n.includes('рыб') ||
    n.includes('лосос') ||
    n.includes('форел') ||
    n.includes('треск') ||
    n.includes('кревет') ||
    n.includes('кальмар') ||
    n.includes('сельдь')
  ) {
    return 'fish_seafood';
  }
  if (
    f.isRawMeat ||
    id.includes('beef') ||
    id.includes('pork') ||
    id.includes('mutton') ||
    id.includes('venison') ||
    id.includes('goat') ||
    id.includes('meat') ||
    n.includes('говяд') ||
    n.includes('свин') ||
    n.includes('баран') ||
    n.includes('оленин') ||
    n.includes('мяс') ||
    n.includes('печен') ||
    n.includes('сердц')
  ) {
    return 'meat_chunks';
  }
  if (
    id.includes('mushroom') ||
    id.includes('champignon') ||
    id.includes('boletus') ||
    id.includes('chanterelle') ||
    id.includes('shiitake') ||
    id.includes('oyster') ||
    n.includes('гриб') ||
    n.includes('шампиньон') ||
    n.includes('лисич') ||
    n.includes('боров') ||
    n.includes('опён') ||
    n.includes('опят') ||
    n.includes('вешенк')
  ) {
    return 'mushroom';
  }
  if (id.includes('tomato') || n.includes('томат') || n.includes('помидор')) {
    return 'tomato';
  }
  if (id.includes('cottage') || n.includes('творог')) {
    return 'cottage_cheese';
  }
  if (
    id.includes('cheese') ||
    id.includes('mozzarella') ||
    id.includes('cheddar') ||
    id.includes('suluguni') ||
    n.includes('сыр') ||
    n.includes('моцарелл') ||
    n.includes('сулугун') ||
    n.includes('чеддер') ||
    n.includes('пармезан') ||
    n.includes('брынз')
  ) {
    return 'cheese';
  }
  if (id.includes('potato') || n.includes('картоф')) {
    return 'potato';
  }
  if (
    id.includes('cabbage') ||
    id.includes('onion') ||
    id.includes('garlic') ||
    n.includes('капуст') ||
    n.includes('лук') ||
    n.includes('чеснок')
  ) {
    return 'cabbage_onion';
  }
  if (
    id.includes('dill') ||
    id.includes('parsley') ||
    id.includes('basil') ||
    id.includes('spinach') ||
    id.includes('mint') ||
    id.includes('greens') ||
    n.includes('укроп') ||
    n.includes('петруш') ||
    n.includes('базилик') ||
    n.includes('шпинат') ||
    n.includes('зелен') ||
    n.includes('мят')
  ) {
    return 'herbs_greens';
  }
  if (id.includes('egg') || n.includes('яйц')) {
    return 'egg_filling';
  }
  if (
    id.includes('choc') ||
    id.includes('cocoa') ||
    id.includes('jam') ||
    id.includes('honey') ||
    id.includes('condensed') ||
    n.includes('шоколад') ||
    n.includes('какао') ||
    n.includes('варень') ||
    n.includes('джем') ||
    n.includes('мёд') ||
    n.includes('мед') ||
    n.includes('сгущ') ||
    n.includes('карамел')
  ) {
    return 'chocolate_sweet';
  }
  if (
    id.includes('berry') ||
    id.includes('strawberr') ||
    id.includes('raspberr') ||
    id.includes('blueberr') ||
    id.includes('cherr') ||
    id.includes('cranberr') ||
    id.includes('currant') ||
    id.includes('grape') ||
    n.includes('ягод') ||
    n.includes('клубник') ||
    n.includes('малин') ||
    n.includes('черник') ||
    n.includes('вишн') ||
    n.includes('черешн') ||
    n.includes('смородин') ||
    n.includes('клюкв') ||
    n.includes('ежевик') ||
    n.includes('брусник')
  ) {
    return 'berry';
  }
  if (
    id.includes('apple') ||
    id.includes('pear') ||
    id.includes('peach') ||
    id.includes('apricot') ||
    id.includes('plum') ||
    id.includes('banana') ||
    id.includes('orange') ||
    id.includes('lemon') ||
    n.includes('яблок') ||
    n.includes('груш') ||
    n.includes('персик') ||
    n.includes('абрикос') ||
    n.includes('слив') ||
    n.includes('банан') ||
    n.includes('апельсин') ||
    n.includes('лимон')
  ) {
    return 'fruit_apple';
  }
  return 'carrot_veg';
}

/**
 * Draws a single ultra-detailed 2.5D filling piece at (0,0) with radius ~1.6..2.2 units.
 */
function drawDetailedFillingPiece(
  ctx: CanvasRenderingContext2D,
  f: DoughFillingEntry,
  arch: FillingVisualArchetype,
  isCookedDough: boolean,
  isBurntDough: boolean,
  pieceScale: number,
  seedIdx: number
) {
  const cooked = isCookedDough || Boolean(f.isCooked);
  const rawCol = f.colorHex || '#c2410c';
  const baseCol = isBurntDough
    ? mixHex(rawCol, '#1c120c', 0.72)
    : cooked && f.isRawMeat
    ? '#7c3f1d'
    : cooked
    ? shade(rawCol, -0.08)
    : rawCol;

  ctx.save();
  ctx.scale(pieceScale, pieceScale);

  // Subtle contact shadow underneath the piece
  ctx.fillStyle = 'rgba(15, 10, 5, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0.12, 0.25, 1.55, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();

  switch (arch) {
    case 'minced_meat': {
      // Cluster of savory ground meat granules + rendered fat speck + onion bit
      const mCol = cooked ? '#6b3418' : '#b91c28';
      const mLight = shade(mCol, 0.26);
      const mDark = shade(mCol, -0.35);
      const granules: [number, number, number][] = [
        [-0.65, -0.3, 0.68],
        [0.55, -0.35, 0.64],
        [0.0, 0.45, 0.72],
        [-0.55, 0.42, 0.56],
        [0.62, 0.35, 0.58],
        [0.0, -0.15, 0.66],
      ];
      for (let g = 0; g < granules.length; g++) {
        const [gx, gy, gr] = granules[g];
        const isFat = g === 3;
        drawLitSphere(
          ctx,
          gx,
          gy,
          gr,
          isFat ? '#ffffff' : mLight,
          isFat ? (cooked ? '#fde68a' : '#fef2f2') : mCol,
          isFat ? '#ca8a04' : mDark,
          undefined,
          0.35
        );
      }
      // Black pepper & herb micro-speck
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(0.2, -0.1, 0.16, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'sausage_slices': {
      // Cupped pepperoni / sausage coin with white fat mosaic & smoky sear rim
      const sCol = isBurntDough ? '#29150e' : cooked ? '#991b1b' : '#be123c';
      ctx.fillStyle = shade(sCol, -0.42);
      ctx.beginPath();
      ctx.ellipse(0, 0.18, 1.65, 1.28, 0, 0, Math.PI * 2);
      ctx.fill();

      const sGrad = ctx.createRadialGradient(-0.4, -0.35, 0.2, 0, 0, 1.7);
      sGrad.addColorStop(0, shade(sCol, 0.25));
      sGrad.addColorStop(0.65, sCol);
      sGrad.addColorStop(1, shade(sCol, -0.35));
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.6, 1.22, 0, 0, Math.PI * 2);
      ctx.fill();

      // White pork-fat mosaic specks inside sausage slice
      ctx.fillStyle = cooked ? '#fef3c7' : '#fff1f2';
      for (const [fx, fy, fr] of [
        [-0.55, -0.25, 0.24],
        [0.48, -0.3, 0.2],
        [0.15, 0.38, 0.25],
        [-0.38, 0.35, 0.18],
      ]) {
        ctx.beginPath();
        ctx.arc(fx, fy, fr, 0, Math.PI * 2);
        ctx.fill();
      }
      // Glossy paprika oil catchlight
      ctx.fillStyle = 'rgba(255,255,255,0.34)';
      ctx.beginPath();
      ctx.ellipse(-0.45, -0.4, 0.55, 0.22, -0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'meat_chunks': {
      // 3D beveled butcher meat cube with muscle fibers, fat cap rim & Maillard sear
      const mCol = cooked ? '#78350f' : baseCol;
      const mHi = shade(mCol, 0.28);
      const mDk = shade(mCol, -0.42);

      // 3D side thickness wall
      ctx.fillStyle = mDk;
      ctx.beginPath();
      ctx.roundRect(-1.45, -0.85, 2.9, 2.05, 0.55);
      ctx.fill();

      // Top meat cut face
      const g = ctx.createLinearGradient(-1.4, -1.1, 1.4, 0.9);
      g.addColorStop(0, mHi);
      g.addColorStop(0.55, mCol);
      g.addColorStop(1, mDk);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(-1.45, -1.15, 2.9, 1.85, 0.52);
      ctx.fill();

      // White/golden fat marbling vein & muscle grain
      ctx.strokeStyle = cooked ? 'rgba(254, 240, 138, 0.62)' : 'rgba(255, 241, 242, 0.75)';
      ctx.lineWidth = 0.26;
      ctx.beginPath();
      ctx.moveTo(-1.05, -0.55);
      ctx.quadraticCurveTo(-0.1, 0.05, 1.05, -0.35);
      ctx.stroke();

      ctx.strokeStyle = shade(mDk, -0.2);
      ctx.lineWidth = 0.22;
      ctx.beginPath();
      ctx.moveTo(-0.9, 0.2);
      ctx.lineTo(0.85, 0.25);
      ctx.stroke();

      // Juicy moisture highlight
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.ellipse(-0.5, -0.55, 0.55, 0.2, -0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'poultry': {
      // Tender poultry fillet chunk with golden roasted skin edge & fine grain
      const pCol = cooked ? '#fef3c7' : '#fbcfe8';
      const pEdge = cooked ? '#d97706' : '#f472b6';
      ctx.fillStyle = shade(pEdge, -0.35);
      drawOrganicBlobPath(ctx, 0.08, 0.22, 1.6, 1.15, seedIdx + 11, 0.1, 8);
      ctx.fill();

      const g = ctx.createRadialGradient(-0.4, -0.3, 0.15, 0, 0, 1.7);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.55, pCol);
      g.addColorStop(1, pEdge);
      ctx.fillStyle = g;
      drawOrganicBlobPath(ctx, 0, 0, 1.58, 1.12, seedIdx + 11, 0.1, 8);
      ctx.fill();

      if (cooked) {
        // Golden sear stripe
        ctx.strokeStyle = 'rgba(146, 64, 14, 0.65)';
        ctx.lineWidth = 0.28;
        ctx.beginPath();
        ctx.moveTo(-0.8, -0.35);
        ctx.lineTo(0.75, 0.4);
        ctx.stroke();
      }
      break;
    }

    case 'fish_seafood': {
      // Flaky salmon/fish chunk with white myosepta connective stripes
      const fCol = cooked ? mixHex(baseCol, '#fdba74', 0.45) : baseCol;
      ctx.fillStyle = shade(fCol, -0.35);
      ctx.beginPath();
      ctx.roundRect(-1.5, -0.85, 3.0, 1.95, 0.5);
      ctx.fill();

      const g = ctx.createLinearGradient(-1.5, -1.0, 1.5, 0.8);
      g.addColorStop(0, shade(fCol, 0.28));
      g.addColorStop(0.55, fCol);
      g.addColorStop(1, shade(fCol, -0.25));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(-1.5, -1.05, 3.0, 1.8, 0.48);
      ctx.fill();

      // White myomere flake lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.68)';
      ctx.lineWidth = 0.24;
      for (const sx of [-0.65, 0.15, 0.85]) {
        ctx.beginPath();
        ctx.moveTo(sx - 0.25, -0.85);
        ctx.quadraticCurveTo(sx + 0.2, -0.1, sx - 0.2, 0.55);
        ctx.stroke();
      }
      break;
    }

    case 'mushroom': {
      // Detailed sliced mushroom silhouette with domed cap, dark gills & stem
      const capCol = cooked ? '#92400e' : '#d6d3d1';
      const stemCol = cooked ? '#fde68a' : '#fafaf9';

      // Stem
      ctx.fillStyle = stemCol;
      ctx.beginPath();
      ctx.roundRect(-0.48, -0.1, 0.96, 1.35, 0.28);
      ctx.fill();

      // Dark hymenium gills under cap
      ctx.fillStyle = '#3b1d0d';
      ctx.beginPath();
      ctx.ellipse(0, -0.15, 1.38, 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      // Domed mushroom cap slice
      const cGrad = ctx.createRadialGradient(-0.4, -0.8, 0.15, 0, -0.3, 1.6);
      cGrad.addColorStop(0, shade(capCol, 0.32));
      cGrad.addColorStop(0.65, capCol);
      cGrad.addColorStop(1, shade(capCol, -0.38));
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(0, -0.15, 1.48, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'tomato': {
      // Juicy tomato wedge/slice with dark red seed locules & yellow seeds
      const tCol = cooked ? '#b91c1c' : '#ef4444';
      ctx.fillStyle = shade(tCol, -0.35);
      ctx.beginPath();
      ctx.arc(0, 0, 1.58, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = shade(tCol, 0.18);
      ctx.beginPath();
      ctx.arc(0, 0, 1.32, 0, Math.PI * 2);
      ctx.fill();

      // 3 recessed gelatinous seed chambers
      for (let c = 0; c < 3; c++) {
        const a = (c / 3) * Math.PI * 2 + 0.3;
        const lx = Math.cos(a) * 0.62;
        const ly = Math.sin(a) * 0.62;
        ctx.fillStyle = shade(tCol, -0.28);
        ctx.beginPath();
        ctx.ellipse(lx, ly, 0.46, 0.28, a, 0, Math.PI * 2);
        ctx.fill();

        // Tiny golden tomato seed
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(lx + Math.cos(a) * 0.12, ly + Math.sin(a) * 0.12, 0.13, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'cheese': {
      if (cooked) {
        // Melted bubbly golden-ivory cheese puddle with toasted Maillard blister
        drawOrganicBlobPath(ctx, 0, 0, 1.85, 1.35, seedIdx + 23, 0.16, 10);
        const cGrad = ctx.createRadialGradient(-0.35, -0.3, 0.2, 0, 0, 1.9);
        cGrad.addColorStop(0, '#fffbeb');
        cGrad.addColorStop(0.65, '#fde68a');
        cGrad.addColorStop(1, '#d97706');
        ctx.fillStyle = cGrad;
        ctx.fill();

        // Browned cheese blister spot
        ctx.fillStyle = 'rgba(180, 83, 9, 0.55)';
        ctx.beginPath();
        ctx.ellipse(0.35, 0.15, 0.52, 0.34, 0.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Grated cheese shreds / wedge with cheese holes
        for (const [sx, sy, rot] of [
          [-0.5, -0.35, -0.35],
          [0.45, -0.2, 0.4],
          [-0.1, 0.4, 0.12],
          [0.2, -0.5, -0.15],
        ]) {
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(rot);
          ctx.fillStyle = '#fde047';
          ctx.strokeStyle = '#ca8a04';
          ctx.lineWidth = 0.16;
          ctx.beginPath();
          ctx.roundRect(-0.95, -0.28, 1.9, 0.56, 0.24);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
      break;
    }

    case 'cottage_cheese': {
      // Fluffy white cottage cheese curd cluster with golden baked sheen
      const cTop = cooked ? '#fef9c3' : '#ffffff';
      const cMid = cooked ? '#fde68a' : '#f8fafc';
      const cShd = cooked ? '#ca8a04' : '#cbd5e1';
      for (const [cx, cy, cr] of [
        [-0.6, -0.25, 0.68],
        [0.55, -0.3, 0.64],
        [0.0, 0.42, 0.74],
        [-0.48, 0.38, 0.54],
        [0.55, 0.32, 0.56],
        [0.0, -0.18, 0.7],
      ]) {
        drawLitSphere(ctx, cx, cy, cr, cTop, cMid, cShd, undefined, 0.28);
      }
      break;
    }

    case 'potato': {
      // Beveled golden potato cube / mash rosette with butter sheen & dill speck
      const pHi = cooked ? '#fef9c3' : '#fffbeb';
      const pMid = cooked ? '#facc15' : '#fef08a';
      const pDk = cooked ? '#b45309' : '#ca8a04';

      ctx.fillStyle = pDk;
      ctx.beginPath();
      ctx.roundRect(-1.35, -0.78, 2.7, 1.85, 0.48);
      ctx.fill();

      const g = ctx.createLinearGradient(-1.3, -1.0, 1.3, 0.8);
      g.addColorStop(0, pHi);
      g.addColorStop(0.6, pMid);
      g.addColorStop(1, pDk);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(-1.35, -1.05, 2.7, 1.72, 0.45);
      ctx.fill();

      // Tiny green dill speck on potato
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0.25, -0.35, 0.35, 0.25);
      break;
    }

    case 'cabbage_onion': {
      // Translucent golden sautéed / crisp white onion & cabbage crescent ribbons
      const cRim = cooked ? '#b45309' : '#65a30d';
      const cIn = cooked ? '#fde68a' : '#f0fdf4';
      ctx.lineCap = 'round';
      for (const [ox, oy, rad, a0, a1] of [
        [-0.3, 0.1, 1.25, 0.2, Math.PI * 1.45],
        [0.35, -0.15, 1.05, Math.PI * 0.6, Math.PI * 1.85],
      ]) {
        ctx.strokeStyle = cRim;
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.arc(ox, oy, rad, a0, a1);
        ctx.stroke();

        ctx.strokeStyle = cIn;
        ctx.lineWidth = 0.36;
        ctx.beginPath();
        ctx.arc(ox, oy, rad, a0 + 0.05, a1 - 0.05);
        ctx.stroke();
      }
      break;
    }

    case 'berry': {
      // Plump berry with drupelets/seeds & syrupy ruby juice halo
      if (cooked) {
        ctx.fillStyle = hexToRgba( shade(baseCol, -0.2), 0.45);
        ctx.beginPath();
        ctx.ellipse(0, 0.1, 1.85, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      drawLitSphere(
        ctx,
        0,
        0,
        1.32,
        shade(baseCol, 0.38),
        baseCol,
        shade(baseCol, -0.42),
        undefined,
        0.65
      );
      // Tiny berry achenes / drupelet dimples
      ctx.fillStyle = 'rgba(254, 240, 138, 0.65)';
      for (const [sx, sy] of [
        [-0.45, -0.15],
        [0.35, -0.28],
        [0.05, 0.38],
        [-0.35, 0.42],
        [0.48, 0.25],
      ]) {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.11, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'fruit_apple': {
      // Caramelized / fresh fruit wedge with outer peel arc & warm flesh
      const peelCol = baseCol;
      const fleshCol = cooked ? '#fcd34d' : '#fef9c3';
      ctx.fillStyle = shade(peelCol, -0.2);
      ctx.beginPath();
      ctx.arc(0, -0.2, 1.55, 0.12, Math.PI - 0.12);
      ctx.closePath();
      ctx.fill();

      const fGrad = ctx.createLinearGradient(0, -0.3, 0, 1.2);
      fGrad.addColorStop(0, shade(fleshCol, 0.25));
      fGrad.addColorStop(0.7, fleshCol);
      fGrad.addColorStop(1, cooked ? '#b45309' : '#eab308');
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.arc(0, -0.22, 1.28, 0.16, Math.PI - 0.16);
      ctx.closePath();
      ctx.fill();

      // Cinnamon / caramelized sugar specks
      if (cooked) {
        ctx.fillStyle = 'rgba(120, 53, 15, 0.55)';
        ctx.beginPath();
        ctx.arc(-0.35, 0.3, 0.12, 0, Math.PI * 2);
        ctx.arc(0.3, 0.42, 0.11, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'egg_filling': {
      // Chopped boiled egg white cube + crumbly golden yolk granules
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(-1.35, -0.85, 1.85, 1.55, 0.38);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-1.35, -1.0, 1.85, 1.45, 0.38);
      ctx.fill();

      // Golden yolk spheres beside white
      drawLitSphere(ctx, 0.55, 0.15, 0.78, '#fef08a', '#f59e0b', '#b45309', undefined, 0.35);
      drawLitSphere(ctx, -0.15, 0.45, 0.52, '#fef08a', '#eab308', '#a16207', undefined, 0.25);
      break;
    }

    case 'chocolate_sweet': {
      // Glossy melted chocolate / jam chunk with rich specular facet
      const cCol = baseCol;
      ctx.fillStyle = shade(cCol, -0.45);
      ctx.beginPath();
      ctx.roundRect(-1.35, -0.8, 2.7, 1.85, 0.45);
      ctx.fill();

      const g = ctx.createRadialGradient(-0.4, -0.4, 0.15, 0, 0, 1.65);
      g.addColorStop(0, shade(cCol, 0.35));
      g.addColorStop(0.6, cCol);
      g.addColorStop(1, shade(cCol, -0.35));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(-1.35, -1.0, 2.7, 1.75, 0.45);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.beginPath();
      ctx.ellipse(-0.45, -0.45, 0.55, 0.2, -0.25, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'herbs_greens': {
      drawBotanicalLeaf(
        ctx,
        -1.2,
        0.3,
        2.1,
        0.75,
        -0.35,
        cooked ? '#65a30d' : '#4ade80',
        '#14532d'
      );
      drawBotanicalLeaf(
        ctx,
        -0.2,
        -0.3,
        1.8,
        0.68,
        0.4,
        cooked ? '#4d7c0f' : '#22c55e',
        '#14532d'
      );
      break;
    }

    case 'carrot_veg':
    default: {
      // Beveled 3D vegetable dice (carrot, beet, pumpkin, bell pepper)
      const vHi = shade(baseCol, 0.3);
      const vDk = shade(baseCol, -0.38);

      // Left, right & top isometric cube faces
      ctx.fillStyle = vHi;
      ctx.beginPath();
      ctx.moveTo(0, -1.15);
      ctx.lineTo(1.35, -0.45);
      ctx.lineTo(0, 0.25);
      ctx.lineTo(-1.35, -0.45);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = baseCol;
      ctx.beginPath();
      ctx.moveTo(-1.35, -0.45);
      ctx.lineTo(0, 0.25);
      ctx.lineTo(0, 1.35);
      ctx.lineTo(-1.35, 0.65);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = vDk;
      ctx.beginPath();
      ctx.moveTo(1.35, -0.45);
      ctx.lineTo(0, 0.25);
      ctx.lineTo(0, 1.35);
      ctx.lineTo(1.35, 0.65);
      ctx.closePath();
      ctx.fill();

      // Wet highlight on top diamond
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.beginPath();
      ctx.ellipse(-0.3, -0.5, 0.45, 0.2, -0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

/**
 * Renders the complete filling bed (sauce/juice/melted cheese cushion + dense individual 2.5D chunks)
 * across an elliptical or rectangular open dough surface (pizza, open pie, topped flatbread, rolled sheet).
 */
function drawDetailedFillingBedAndPieces(
  ctx: CanvasRenderingContext2D,
  attrs: DoughAttributes,
  pal: DoughSurfacePalette,
  rx: number,
  ry: number
) {
  if (!attrs.fillings || attrs.fillings.length === 0) return;
  const isCooked = attrs.cookState !== 'raw';
  const s = pal.seed + '_fillbed';

  ctx.save();

  // 1. Analyze fillings to synthesize a realistic underlying sauce / juice / melted cheese cushion
  const archetypes = attrs.fillings.map((f) => ({
    f,
    arch: classifyFillingArchetype(f),
  }));
  const hasTomato = archetypes.some((a) => a.arch === 'tomato');
  const hasCheese = archetypes.some((a) => a.arch === 'cheese');
  const hasBerryOrJam = archetypes.some(
    (a) => a.arch === 'berry' || a.arch === 'chocolate_sweet'
  );
  const hasCottage = archetypes.some((a) => a.arch === 'cottage_cheese');

  const bedColor = hasTomato
    ? '#b91c1c'
    : hasBerryOrJam
    ? archetypes.find((a) => a.arch === 'berry' || a.arch === 'chocolate_sweet')!.f
        .colorHex || '#9f1239'
    : hasCottage
    ? '#fef9c3'
    : hasCheese && isCooked
    ? '#fde68a'
    : archetypes[0].f.colorHex || '#c2410c';

  // Soft juicy / saucy base spread
  const bedGrad = ctx.createRadialGradient(-rx * 0.2, -ry * 0.2, 0.3, 0, 0, Math.max(rx, ry));
  bedGrad.addColorStop(0, hexToRgba(shade(bedColor, 0.22), isCooked ? 0.62 : 0.38));
  bedGrad.addColorStop(0.75, hexToRgba(bedColor, isCooked ? 0.55 : 0.32));
  bedGrad.addColorStop(1, hexToRgba(shade(bedColor, -0.3), 0.0));
  ctx.fillStyle = bedGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.96, ry * 0.96, 0, 0, Math.PI * 2);
  ctx.fill();

  // If cheese is present and cooked, render a melted mozzarella/suluguni web layer underneath toppings
  if (hasCheese && isCooked) {
    ctx.fillStyle = pal.isBurnt ? 'rgba(120, 53, 15, 0.6)' : 'rgba(254, 243, 199, 0.72)';
    for (let m = 0; m < 6; m++) {
      const a = (m / 6) * Math.PI * 2 + 0.2;
      const mx = Math.cos(a) * rx * 0.42;
      const my = Math.sin(a) * ry * 0.42;
      drawOrganicBlobPath(ctx, mx, my, rx * 0.42, ry * 0.42, m + 77, 0.15, 8);
      ctx.fill();
    }
  }

  // 2. Distribute individual 2.5D filling pieces across concentric rings
  const totalFillGrams = Math.max(15, attrs.fillingGrams || 40);
  const densityBoost = clamp(Math.round(totalFillGrams / 16), 6, 18);
  const pieceCount = Math.max(densityBoost, Math.min(20, attrs.fillings.length * 4));

  // Separate non-herb pieces from top herb garnish so herbs always sit on top!
  const mainEntries = archetypes.filter((a) => a.arch !== 'herbs_greens');
  const herbEntries = archetypes.filter((a) => a.arch === 'herbs_greens');
  const pool = mainEntries.length > 0 ? mainEntries : archetypes;

  for (let i = 0; i < pieceCount; i++) {
    const entry = pool[i % pool.length];
    // Golden-angle spiral distribution for natural, non-overlapping culinary arrangement
    const goldenAngle = i * 2.3999632 + hash01(s, i * 3) * 0.35;
    const normR =
      i === 0
        ? 0.08
        : Math.sqrt((i + 0.4) / pieceCount) * (0.82 + (hash01(s, i * 3 + 1) - 0.5) * 0.14);
    const px = Math.cos(goldenAngle) * rx * normR;
    const py = Math.sin(goldenAngle) * ry * normR;
    const rot = (hash01(s, i * 3 + 2) - 0.5) * 1.4;
    const pScale = clamp(
      (0.58 + (entry.f.weightGrams / Math.max(30, totalFillGrams)) * 0.28) *
        (0.9 + hash01(s + '_sc', i) * 0.22),
      0.52,
      0.92
    );

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    drawDetailedFillingPiece(
      ctx,
      entry.f,
      entry.arch,
      isCooked,
      pal.isBurnt,
      pScale,
      i
    );
    ctx.restore();
  }

  // 3. Top Herb Garnish & Melted Cheese Strings (if present)
  if (herbEntries.length > 0) {
    const hCount = Math.min(7, Math.max(3, herbEntries.length * 3));
    for (let h = 0; h < hCount; h++) {
      const a = (h / hCount) * Math.PI * 2 + 0.55;
      const d = 0.25 + (h % 2) * 0.38;
      ctx.save();
      ctx.translate(Math.cos(a) * rx * d, Math.sin(a) * ry * d);
      ctx.rotate(a);
      drawDetailedFillingPiece(
        ctx,
        herbEntries[h % herbEntries.length].f,
        'herbs_greens',
        isCooked,
        pal.isBurnt,
        0.62,
        h + 100
      );
      ctx.restore();
    }
  }

  ctx.restore();
}

/**
 * Renders an authentic 3D cut / bitten interior cross-section cavity (`надлом / разрез`)
 * on closed/folded dough items (pirozhok, pelmen/varenik, khinkali, croissant, bun, loaf)
 * when partially eaten (`portions < maxPortions`) or open at a vent!
 */
function drawExposedInteriorCrossSection(
  ctx: CanvasRenderingContext2D,
  attrs: DoughAttributes,
  pal: DoughSurfacePalette,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rot: number = 0
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);

  // 1. Outer crust rim of the bite/cut
  ctx.fillStyle = pal.rimCol;
  drawOrganicBlobPath(ctx, 0, 0, rx * 1.08, ry * 1.08, 91, 0.08, 12);
  ctx.fill();

  // 2. Thick porous alveolar dough wall (мякиш стенки теста на разломе)
  ctx.save();
  drawOrganicBlobPath(ctx, 0, 0, rx, ry, 91, 0.08, 12);
  ctx.clip();
  drawAlveolarCrumbTexture(ctx, pal, rx, ry, '_biteWall');
  ctx.restore();

  ctx.strokeStyle = shade(pal.surfCol, -0.18);
  ctx.lineWidth = 0.3;
  drawOrganicBlobPath(ctx, 0, 0, rx, ry, 91, 0.08, 12);
  ctx.stroke();

  // 3. Inner filling pocket cavity (if filled)
  if (attrs.fillings && attrs.fillings.length > 0) {
    const cavRx = rx * 0.74;
    const cavRy = ry * 0.72;

    // Broth / juice / gravy rim soaking into the dough crumb wall
    const mainFillCol = attrs.fillings[0].colorHex || '#92400e';
    ctx.fillStyle = hexToRgba(shade(mainFillCol, -0.25), 0.55);
    drawOrganicBlobPath(ctx, 0, 0.08, cavRx * 1.12, cavRy * 1.12, 93, 0.09, 10);
    ctx.fill();

    // Deep cavity background
    ctx.save();
    drawOrganicBlobPath(ctx, 0, 0.08, cavRx, cavRy, 93, 0.09, 10);
    ctx.fillStyle = shade(mainFillCol, -0.48);
    ctx.fill();
    ctx.clip();

    // Pack detailed filling chunks tightly inside the cross-section cavity!
    drawDetailedFillingBedAndPieces(ctx, attrs, pal, cavRx * 0.95, cavRy * 0.95);

    // Inner cavity top overhang shadow for 3D depth
    const cavShade = ctx.createLinearGradient(0, -cavRy, 0, cavRy);
    cavShade.addColorStop(0, 'rgba(15, 8, 4, 0.42)');
    cavShade.addColorStop(0.35, 'rgba(15, 8, 4, 0.0)');
    cavShade.addColorStop(1, 'rgba(255, 250, 240, 0.16)');
    ctx.fillStyle = cavShade;
    ctx.fillRect(-cavRx * 1.2, -cavRy * 1.2, cavRx * 2.4, cavRy * 2.4);

    // Glistening broth/juice highlight inside the bite
    if (attrs.cookState !== 'raw' && attrs.cookState !== 'burnt') {
      ctx.fillStyle = 'rgba(255, 252, 235, 0.42)';
      ctx.beginPath();
      ctx.ellipse(-cavRx * 0.25, cavRy * 0.18, cavRx * 0.35, cavRy * 0.14, 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

// ============================================================================
// 5. MAIN DOUGH & PASTRY ITEM RENDERER (All 16 Shapes)
// ============================================================================

export function drawDoughItem(
  ctx: CanvasRenderingContext2D,
  item?: any
): boolean {
  const attrs: DoughAttributes =
    item?.doughAttributes || buildDefaultDoughAttributes();
  const pal = buildDoughSurfacePalette(attrs, item);

  const isBittenOrCut =
    item?.portions !== undefined &&
    item?.maxPortions !== undefined &&
    item.portions < item.maxPortions;

  // Visual scale from weight & oven rise
  const massScale = clamp(
    0.78 + Math.cbrt(Math.max(20, attrs.weightGrams + attrs.fillingGrams * 0.6) / 250) * 0.22,
    0.78,
    1.14
  );
  const riseScale = clamp(attrs.riseFactor || 1.0, 1.0, 1.38);

  ctx.save();
  ctx.scale(massScale, massScale);

  const makeDomeGrad = (rx: number, ry: number, yOffset: number = 0) => {
    const g = ctx.createRadialGradient(
      -rx * 0.3,
      -ry * 0.32 + yOffset,
      0.7,
      0,
      yOffset,
      Math.max(rx, ry) * 1.15
    );
    g.addColorStop(0.0, pal.hiCol);
    g.addColorStop(0.55, pal.surfCol);
    g.addColorStop(0.88, pal.shCol);
    g.addColorStop(1.0, pal.deepCol);
    return g;
  };

  switch (attrs.shape) {
    // ------------------------------------------------------------------------
    // 1. LUMP (Комок теста ручного замеса со складками клейковины)
    // ------------------------------------------------------------------------
    case 'lump': {
      drawShadow(ctx, 7.8, 2.9, 6.6, 0.26);

      const traceLump = (yShift: number = 0) => {
        ctx.beginPath();
        ctx.moveTo(-7.0, 2.3 + yShift);
        ctx.bezierCurveTo(-8.4, -1.9 + yShift, -4.8, -6.3 + yShift, 0.2, -5.8 + yShift);
        ctx.bezierCurveTo(5.8, -5.6 + yShift, 8.6, -1.3 + yShift, 7.3, 2.8 + yShift);
        ctx.bezierCurveTo(6.1, 6.0 + yShift, -5.8, 5.7 + yShift, -7.0, 2.3 + yShift);
        ctx.closePath();
      };

      // 3D lower undercut base wall
      ctx.fillStyle = pal.deepCol;
      traceLump(0.55);
      ctx.fill();

      // Main kneaded dome
      ctx.fillStyle = makeDomeGrad(7.8, 5.8);
      traceLump(0);
      ctx.fill();

      ctx.save();
      traceLump(0);
      ctx.clip();

      // Hand-kneaded gluten fold creases & dimples
      ctx.strokeStyle = pal.shCol;
      ctx.lineWidth = 0.55;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4.6, -1.2);
      ctx.quadraticCurveTo(-1.2, 0.8, 2.8, -0.9);
      ctx.moveTo(-2.2, 2.4);
      ctx.quadraticCurveTo(1.4, 1.2, 4.5, 2.1);
      ctx.stroke();

      ctx.strokeStyle = pal.hiCol;
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(-4.5, -1.55);
      ctx.quadraticCurveTo(-1.2, 0.45, 2.8, -1.25);
      ctx.stroke();

      drawDoughSurfaceMicroTexture(ctx, attrs, pal, 7.2, 5.2);

      if (attrs.fillings.length > 0) {
        drawDetailedFillingBedAndPieces(ctx, attrs, pal, 4.8, 3.4);
      }
      ctx.restore();

      ctx.strokeStyle = pal.rimCol;
      ctx.lineWidth = 0.44;
      traceLump(0);
      ctx.stroke();

      if (isBittenOrCut) {
        drawExposedInteriorCrossSection(ctx, attrs, pal, 3.8, 1.8, 3.2, 2.3, -0.35);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 2. BALL & BUN (Колобок / Пышная печёная или паровая булочка)
    // ------------------------------------------------------------------------
    case 'ball':
    case 'bun': {
      const isBun = attrs.shape === 'bun';
      const ry = isBun ? 6.1 * Math.min(1.18, riseScale) : 6.5;
      const rx = 7.3;
      drawShadow(ctx, rx + 0.2, 2.8, 6.4, 0.27);

      // 3D base tuck shadow
      ctx.fillStyle = pal.deepCol;
      ctx.beginPath();
      ctx.ellipse(0, 0.85, rx, ry * 0.96, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pale oven-spring equatorial belt on baked/fried buns
      if (isBun && (pal.isBaked || pal.isFried) && !pal.isBurnt) {
        ctx.fillStyle = pal.equatorCol;
        ctx.beginPath();
        ctx.ellipse(0, 0.55, rx, ry * 0.97, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Main spherical/domed crown
      ctx.fillStyle = makeDomeGrad(rx, ry, isBun ? -0.25 : 0);
      ctx.beginPath();
      ctx.ellipse(0, isBun ? 0.15 : 0.35, rx, isBun ? ry * 0.94 : ry, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 0.35, rx, ry, 0, 0, Math.PI * 2);
      ctx.clip();

      drawDoughSurfaceMicroTexture(ctx, attrs, pal, rx - 0.5, ry - 0.5);

      // Artisan sesame seeds or sugar crystals on baked sweet/rich buns
      if (isBun && pal.isBaked && !pal.isBurnt && (attrs.richness >= 22 || attrs.sweetness >= 22)) {
        for (let sIdx = 0; sIdx < 14; sIdx++) {
          const a = hash01(pal.seed + '_ses', sIdx * 3) * Math.PI * 2;
          const d = Math.sqrt(hash01(pal.seed + '_ses', sIdx * 3 + 1)) * 4.4;
          const sx = Math.cos(a) * d;
          const sy = Math.sin(a) * d * 0.78 - 0.8;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(a + 0.5);
          ctx.fillStyle = '#fef3c7';
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 0.14;
          ctx.beginPath();
          ctx.ellipse(0, 0, 0.36, 0.18, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }

      if (attrs.fillings.length > 0 && !isBittenOrCut && attrs.cookState === 'raw') {
        drawDetailedFillingBedAndPieces(ctx, attrs, pal, 4.4, 3.4);
      }
      ctx.restore();

      ctx.strokeStyle = pal.rimCol;
      ctx.lineWidth = 0.44;
      ctx.beginPath();
      ctx.ellipse(0, 0.35, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      if (isBittenOrCut) {
        drawExposedInteriorCrossSection(ctx, attrs, pal, 3.6, 1.6, 3.4, 2.5, -0.32);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 3. FLATBREAD & SHEET (Лепёшка / Блин / Оладьи / Сырник / Раскатанный пласт)
    // ------------------------------------------------------------------------
    case 'flatbread':
    case 'sheet': {
      const isThin = attrs.shape === 'sheet';
      const isBlin =
        attrs.doughType === 'liquid_batter' && (pal.isFried || pal.isBaked);
      const isOladyi =
        attrs.doughType === 'pancake_batter' && (pal.isFried || pal.isBaked);
      const isSyrnik =
        attrs.doughType === 'cottage_cheese' && (pal.isFried || pal.isBaked);

      const rx = isThin ? 9.5 : isBlin ? 9.1 : isSyrnik ? 7.4 : 8.5;
      const ry = isThin ? 6.5 : isBlin ? 6.3 : isSyrnik ? 5.4 : 5.9;
      const bevelH = isThin
        ? clamp(attrs.thicknessMm * 0.14, 0.25, 0.65)
        : isSyrnik
        ? 1.25
        : isBlin
        ? 0.28
        : clamp(attrs.thicknessMm * 0.12, 0.55, 1.15);

      drawShadow(ctx, rx + 0.2, 2.4, ry + 0.85, 0.24);

      const traceOrganicDisc = (yOff: number) => {
        if (isBlin || isThin) {
          drawOrganicBlobPath(ctx, 0, 0.4 + yOff, rx, ry, 19, 0.035, 16);
        } else {
          ctx.beginPath();
          ctx.ellipse(0, 0.4 + yOff, rx, ry, 0, 0, Math.PI * 2);
        }
      };

      // 3D beveled edge thickness wall
      ctx.fillStyle = isSyrnik || isOladyi ? pal.equatorCol : pal.deepCol;
      traceOrganicDisc(bevelH);
      ctx.fill();
      ctx.strokeStyle = pal.rimCol;
      ctx.lineWidth = 0.35;
      ctx.stroke();

      // Main top face
      ctx.fillStyle = makeDomeGrad(rx, ry, 0.4);
      traceOrganicDisc(0);
      ctx.fill();

      ctx.save();
      traceOrganicDisc(0);
      ctx.clip();

      drawDoughSurfaceMicroTexture(ctx, attrs, pal, rx - 0.6, ry - 0.6, {
        isLacyPancake: isBlin || isOladyi,
      });

      // Blin lacy golden-brown ring & crispy rim pattern
      if (isBlin && !pal.isBurnt) {
        ctx.strokeStyle = hexToRgba('#78350f', 0.42);
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.ellipse(0, 0.4, rx * 0.84, ry * 0.84, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Rustic finger dimples & blistered skillet char marks on flatbread
      if (!isThin && !isBlin && attrs.fillings.length === 0) {
        for (const [dx, dy, dr] of [
          [-2.8, -1.1, 1.05],
          [2.5, -0.7, 0.95],
          [0.3, 1.7, 1.1],
          [-2.1, 1.9, 0.85],
          [2.4, 1.6, 0.9],
        ]) {
          ctx.fillStyle = pal.isFried || pal.isBaked ? pal.blisterDark : pal.shCol;
          ctx.globalAlpha = pal.isFried || pal.isBaked ? 0.45 : 0.32;
          ctx.beginPath();
          ctx.ellipse(dx, dy, dr, dr * 0.65, 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      drawEmbossedPatternOverlay(
        ctx,
        attrs.embossedPattern,
        rx - 0.8,
        ry - 0.8,
        pal.deepCol,
        pal.hiCol
      );

      // Detailed fillings / toppings arranged on top
      drawDetailedFillingBedAndPieces(ctx, attrs, pal, rx * 0.76, ry * 0.76);
      ctx.restore();

      ctx.strokeStyle = pal.rimCol;
      ctx.lineWidth = isThin ? 0.36 : 0.46;
      traceOrganicDisc(0);
      ctx.stroke();
      break;
    }

    // ------------------------------------------------------------------------
    // 4. SQUARE SHEET (Квадратный раскатанный пласт слоёного/обычного теста)
    // ------------------------------------------------------------------------
    case 'square_sheet': {
      const bevelH = clamp(attrs.thicknessMm * 0.16, 0.35, 1.1);
      drawShadow(ctx, 9.0, 2.4, 6.8, 0.24);

      // 3D layered pastry edge thickness
      ctx.fillStyle = pal.deepCol;
      ctx.beginPath();
      ctx.roundRect(-8.8, -5.6 + bevelH, 17.6, 11.4, 1.35);
      ctx.fill();

      // Subtle puff-pastry lamination lines along front thickness edge
      if (bevelH >= 0.45) {
        ctx.strokeStyle = pal.crumbLight;
        ctx.lineWidth = 0.22;
        ctx.beginPath();
        ctx.moveTo(-7.6, 5.8 + bevelH * 0.5);
        ctx.lineTo(7.6, 5.8 + bevelH * 0.5);
        ctx.stroke();
      }

      // Top sheet surface
      ctx.fillStyle = makeDomeGrad(8.8, 6.2);
      ctx.beginPath();
      ctx.roundRect(-8.8, -5.6, 17.6, 11.4, 1.35);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-8.8, -5.6, 17.6, 11.4, 1.35);
      ctx.clip();

      drawDoughSurfaceMicroTexture(ctx, attrs, pal, 8.2, 5.2);
      drawEmbossedPatternOverlay(
        ctx,
        attrs.embossedPattern,
        8.2,
        5.1,
        pal.deepCol,
        pal.hiCol
      );
      drawDetailedFillingBedAndPieces(ctx, attrs, pal, 6.8, 4.3);
      ctx.restore();

      ctx.strokeStyle = pal.rimCol;
      ctx.lineWidth = 0.42;
      ctx.beginPath();
      ctx.roundRect(-8.8, -5.6, 17.6, 11.4, 1.35);
      ctx.stroke();
      break;
    }

    // ------------------------------------------------------------------------
    // 5. OPEN PIE / PIZZA / VATRUSHKA (Открытый пирог / Домашняя пицца)
    // ------------------------------------------------------------------------
    case 'open_pie': {
      drawShadow(ctx, 9.2, 2.7, 6.9, 0.27);
      const rx = 8.9;
      const ry = 6.6;

      // 3D outer crust base wall
      ctx.fillStyle = pal.deepCol;
      ctx.beginPath();
      ctx.ellipse(0, 0.85, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Puffed outer cornicione crust ring
      ctx.fillStyle = makeDomeGrad(rx, ry, 0.3);
      ctx.beginPath();
      ctx.ellipse(0, 0.3, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Braided / crimped artisan crust rim scallops & oven blisters
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 0.3, rx, ry, 0, 0, Math.PI * 2);
      ctx.clip();
      drawDoughSurfaceMicroTexture(ctx, attrs, pal, rx - 0.4, ry - 0.4);

      const crimps = 18;
      for (let i = 0; i < crimps; i++) {
        const a = (i / crimps) * Math.PI * 2;
        const cx = Math.cos(a) * (rx * 0.88);
        const cy = Math.sin(a) * (ry * 0.88) + 0.3;
        ctx.strokeStyle = pal.shCol;
        ctx.lineWidth = 0.36;
        ctx.beginPath();
        ctx.arc(cx, cy, 0.85, a - 0.8, a + 0.8);
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = pal.rimCol;
      ctx.lineWidth = 0.48;
      ctx.beginPath();
      ctx.ellipse(0, 0.3, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner recessed filling well
      const wellRx = 6.65;
      const wellRy = 4.75;
      const fillBase =
        attrs.fillings.length > 0
          ? attrs.fillings[0].colorHex
          : shade(pal.surfCol, -0.12);

      // Inner crust wall bevel shadow
      ctx.fillStyle = pal.deepCol;
      ctx.beginPath();
      ctx.ellipse(0, 0.25, wellRx + 0.25, wellRy + 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = mixHex(
        fillBase,
        pal.crumbCol,
        attrs.fillings.length > 0 ? 0.22 : 0.75
      );
      ctx.beginPath();
      ctx.ellipse(0, 0.42, wellRx, wellRy, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 0.42, wellRx, wellRy, 0, 0, Math.PI * 2);
      ctx.clip();
      if (attrs.fillings.length > 0) {
        drawDetailedFillingBedAndPieces(ctx, attrs, pal, wellRx * 0.92, wellRy * 0.92);
      } else {
        // Fork docking pricks on empty tart shell
        ctx.fillStyle = pal.deepCol;
        for (let py = -2.4; py <= 2.4; py += 1.6) {
          for (let px = -3.8; px <= 3.8; px += 1.9) {
            ctx.beginPath();
            ctx.arc(px, py + 0.4, 0.22, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();

      ctx.strokeStyle = pal.shCol;
      ctx.lineWidth = 0.42;
      ctx.beginPath();
      ctx.ellipse(0, 0.42, wellRx, wellRy, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    // ------------------------------------------------------------------------
    // 6. LOAF (Буханка хлеба / Батон с раскрытыми надрезами и пористым мякишем)
    // ------------------------------------------------------------------------
    case 'loaf': {
      drawShadow(ctx, 9.4, 2.9, 5.8, 0.29);
      const ry = clamp(5.05 * Math.min(1.2, riseScale), 4.6, 6.3);
      const rx = 9.1;

      // 3D lower loaf base
      ctx.fillStyle = pal.deepCol;
      ctx.beginPath();
      ctx.roundRect(-rx, -ry * 0.85 + 0.75, rx * 2, ry * 1.72, ry * 0.82);
      ctx.fill();

      // Pale oven-spring side belt
      if ((pal.isBaked || pal.isFried) && !pal.isBurnt) {
        ctx.fillStyle = pal.equatorCol;
        ctx.beginPath();
        ctx.roundRect(-rx, -ry * 0.85 + 0.4, rx * 2, ry * 1.7, ry * 0.82);
        ctx.fill();
      }

      // Main baked/raw loaf dome
      ctx.fillStyle = makeDomeGrad(rx, ry, -0.2);
      ctx.beginPath();
      ctx.roundRect(-rx, -ry * 0.9, rx * 2, ry * 1.72, ry * 0.82);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-rx, -ry * 0.9, rx * 2, ry * 1.72, ry * 0.82);
      ctx.clip();

      drawDoughSurfaceMicroTexture(ctx, attrs, pal, rx - 0.6, ry * 0.8);

      // 3 diagonal baker's lame score slashes (раскрытые хлебные надрезы с пористым мякишем)
      for (const sx of [-4.6, -0.2, 4.2]) {
        ctx.save();
        ctx.translate(sx, -0.2);
        ctx.rotate(0.58);

        // Split almond-shaped score opening
        const slashRx = 0.85;
        const slashRy = ry * 0.48;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, 0, slashRx, slashRy, 0, 0, Math.PI * 2);
        ctx.clip();
        drawAlveolarCrumbTexture(ctx, pal, slashRx, slashRy, `_slash_${sx}`);
        ctx.restore();

        // Crispy raised baker's "ear" ridge along left edge of slash
        ctx.strokeStyle = pal.isBurnt ? '#09090b' : pal.blisterDark;
        ctx.lineWidth = 0.42;
        ctx.beginPath();
        ctx.ellipse(0, 0, slashRx, slashRy, 0, 0.3, Math.PI - 0.3);
        ctx.stroke();

        ctx.strokeStyle = pal.crumbLight;
        ctx.lineWidth = 0.25;
        ctx.beginPath();
        ctx.ellipse(0, 0, slashRx * 0.88, slashRy * 0.88, 0, Math.PI + 0.3, Math.PI * 2 - 0.3);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      ctx.strokeStyle = pal.rimCol;
      ctx.lineWidth = 0.46;
      ctx.beginPath();
      ctx.roundRect(-rx, -ry * 0.9, rx * 2, ry * 1.72, ry * 0.82);
      ctx.stroke();

      // If partially eaten or cut, expose a full bread slice cross-section on the right end!
      if (isBittenOrCut) {
        drawExposedInteriorCrossSection(ctx, attrs, pal, 5.8, 0.2, 2.8, ry * 0.76, 0.08);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 7. ROPE / BAGUETTE (Длинный жгут теста / Французский багет)
    // ------------------------------------------------------------------------
    case 'rope': {
      ctx.save();
      ctx.rotate(-0.32);
      drawShadow(ctx, 9.8, 2.1, 3.2, 0.25);

      const traceRope = (yOff: number) => {
        ctx.beginPath();
        ctx.moveTo(-9.6, yOff);
        ctx.bezierCurveTo(-8.8, -2.5 + yOff, 8.8, -2.5 + yOff, 9.6, yOff);
        ctx.bezierCurveTo(8.8, 2.5 + yOff, -8.8, 2.5 + yOff, -9.6, yOff);
        ctx.closePath();
      };

      ctx.fillStyle = pal.deepCol;
      traceRope(0.45);
      ctx.fill();

      ctx.fillStyle = makeDomeGrad(9.5, 2.4);
      traceRope(0);
      ctx.fill();

      ctx.save();
      traceRope(0);
      ctx.clip();
      drawDoughSurfaceMicroTexture(ctx, attrs, pal, 9.0, 2.1);

      // Diagonal rolling twist creases / baguette scores
      for (const sx of [-5.2, -1.8, 1.8, 5.2]) {
        ctx.strokeStyle = pal.isBaked ? pal.crumbLight : pal.shCol;
        ctx.lineWidth = 0.48;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx - 1.1, -1.1);
        ctx.quadraticCurveTo(sx, 0, sx + 1.1, 1.1);
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = pal.rimCol;
      ctx.lineWidth = 0.42;
      traceRope(0);
      ctx.stroke();
      ctx.restore();
      break;
    }

    // ------------------------------------------------------------------------
    // 8. BRAID (Сдобная плетёнка / Косичка из трёх переплетённых жгутов)
    // ------------------------------------------------------------------------
    case 'braid': {
      drawShadow(ctx, 9.4, 2.6, 4.8, 0.27);
      // Interwoven 3-strand challah plaits with 3D overlap shadows and egg-wash highlights
      const lobes: [number, number, number, number, number][] = [
        [-6.0, -0.7, 2.8, 2.0, 0.45],
        [-3.2, 0.9, 3.0, 2.15, -0.45],
        [-0.2, -0.95, 3.1, 2.2, 0.45],
        [2.9, 0.9, 3.0, 2.15, -0.45],
        [5.8, -0.7, 2.8, 2.0, 0.45],
        [-4.6, -1.0, 2.4, 1.7, -0.35],
        [1.4, 1.05, 2.5, 1.75, 0.35],
      ];

      for (let i = 0; i < lobes.length; i++) {
        const [lx, ly, lrx, lry, rot] = lobes[i];
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);

        // Crease ambient occlusion under plait lobe
        ctx.fillStyle = pal.deepCol;
        ctx.beginPath();
        ctx.ellipse(0.15, 0.38, lrx, lry, 0, 0, Math.PI * 2);
        ctx.fill();

        // Plait strand dome
        const g = ctx.createRadialGradient(-lrx * 0.3, -lry * 0.3, 0.2, 0, 0, lrx * 1.15);
        g.addColorStop(0, pal.hiCol);
        g.addColorStop(0.55, pal.surfCol);
        g.addColorStop(1, pal.shCol);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, lrx, lry, 0, 0, Math.PI * 2);
        ctx.fill();

        // Strand twist fiber line & specular shine
        ctx.strokeStyle = pal.rimCol;
        ctx.lineWidth = 0.36;
        ctx.stroke();

        if (pal.isGlossyEgg && !pal.isBurnt) {
          ctx.fillStyle = 'rgba(255, 252, 235, 0.32)';
          ctx.beginPath();
          ctx.ellipse(-lrx * 0.25, -lry * 0.3, lrx * 0.4, lry * 0.18, -0.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 9. BAGEL RING (Бублик / Баранка / Пончик с 3D тороидальным отверстием)
    // ------------------------------------------------------------------------
    case 'bagel_ring': {
      drawShadow(ctx, 8.0, 2.6, 6.8, 0.27);
      const outRx = 7.7;
      const outRy = 6.2;
      const inRx = 2.75;
      const inRy = 2.05;

      const traceTorus = (yOff: number) => {
        ctx.beginPath();
        ctx.ellipse(0, 0.25 + yOff, outRx, outRy, 0, 0, Math.PI * 2);
        ctx.ellipse(0, 0.25 + yOff, inRx, inRy, 0, 0, Math.PI * 2, true);
      };

      // 3D lower torus wall
      ctx.fillStyle = pal.deepCol;
      traceTorus(0.65);
      ctx.fill('evenodd');

      // Pale deep-fry / oven-spring equatorial belt
      if ((pal.isBaked || pal.isFried) && !pal.isBurnt) {
        ctx.fillStyle = pal.equatorCol;
        traceTorus(0.32);
        ctx.fill('evenodd');
      }

      // Main torus dome
      ctx.fillStyle = makeDomeGrad(outRx, outRy);
      traceTorus(0);
      ctx.fill('evenodd');

      ctx.save();
      traceTorus(0);
      ctx.clip('evenodd');
      drawDoughSurfaceMicroTexture(ctx, attrs, pal, outRx - 0.4, outRy - 0.4);

      // Ring highlight arc along top of torus tube
      ctx.strokeStyle = hexToRgba(pal.hiCol, 0.55);
      ctx.lineWidth = 1.1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(0, 0.1, (outRx + inRx) * 0.5, (outRy + inRy) * 0.5, 0, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();

      // Poppy or sesame seeds on baked bagel
      if (pal.isBaked && !pal.isBurnt) {
        for (let i = 0; i < 22; i++) {
          const a = (i / 22) * Math.PI * 2 + hash01(pal.seed, i) * 0.2;
          const rMid = 0.58 + (i % 3) * 0.12;
          const sx = Math.cos(a) * outRx * rMid;
          const sy = Math.sin(a) * outRy * rMid + 0.2;
          ctx.fillStyle = i % 2 === 0 ? '#fef3c7' : '#1c1917';
          ctx.beginPath();
          ctx.arc(sx, sy, 0.18, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      ctx.strokeStyle = pal.rimCol;
      ctx.lineWidth = 0.44;
      ctx.beginPath();
      ctx.ellipse(0, 0.25, outRx, outRy, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0.25, inRx, inRy, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    // ------------------------------------------------------------------------
    // 10. CROISSANT CRESCENT (Слоёный круассан / Рогалик с ярусами теста)
    // ------------------------------------------------------------------------
    case 'croissant_crescent': {
      drawShadow(ctx, 8.8, 2.5, 5.7, 0.27);

      const traceCrescent = (yOff: number) => {
        ctx.beginPath();
        ctx.moveTo(-8.0, 3.5 + yOff);
        ctx.bezierCurveTo(-7.2, -3.8 + yOff, -3.8, -6.0 + yOff, 0, -6.0 + yOff);
        ctx.bezierCurveTo(3.8, -6.0 + yOff, 7.2, -3.8 + yOff, 8.0, 3.5 + yOff);
        ctx.quadraticCurveTo(5.6, 5.2 + yOff, 3.6, 1.5 + yOff);
        ctx.quadraticCurveTo(0, -1.5 + yOff, -3.6, 1.5 + yOff);
        ctx.quadraticCurveTo(-5.6, 5.2 + yOff, -8.0, 3.5 + yOff);
        ctx.closePath();
      };

      ctx.fillStyle = pal.deepCol;
      traceCrescent(0.55);
      ctx.fill();

      ctx.fillStyle = makeDomeGrad(8.4, 5.6);
      traceCrescent(0);
      ctx.fill();

      ctx.save();
      traceCrescent(0);
      ctx.clip();
      drawDoughSurfaceMicroTexture(ctx, attrs, pal, 8.0, 5.2);

      // Overlapping rolled pastry tier ridges (ярусы слоёного теста)
      for (const [cx, wTop, wBot] of [
        [-4.2, 1.6, 1.1],
        [-1.8, 2.1, 1.4],
        [0, 2.4, 1.6],
        [1.8, 2.1, 1.4],
        [4.2, 1.6, 1.1],
      ]) {
        ctx.strokeStyle = pal.deepCol;
        ctx.lineWidth = 0.52;
        ctx.beginPath();
        ctx.moveTo(cx - wTop, -5.2);
        ctx.quadraticCurveTo(cx * 1.15, -1.8, cx - wBot, 1.8);
        ctx.stroke();

        // Flaky golden edge highlight along tier step
        ctx.strokeStyle = pal.crumbLight;
        ctx.lineWidth = 0.26;
        ctx.beginPath();
        ctx.moveTo(cx - wTop + 0.25, -5.2);
        ctx.quadraticCurveTo(cx * 1.15 + 0.25, -1.8, cx - wBot + 0.25, 1.8);
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = pal.rimCol;
      ctx.lineWidth = 0.44;
      traceCrescent(0);
      ctx.stroke();

      if (isBittenOrCut) {
        drawExposedInteriorCrossSection(ctx, attrs, pal, 3.2, -1.6, 3.1, 2.3, 0.42);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 11. POCKET PIROZHOK (Домашний пирожок лодочкой с фактурным защипом шва)
    // ------------------------------------------------------------------------
    case 'pocket_pirozhok': {
      drawShadow(ctx, 8.8, 2.6, 5.5, 0.27);

      const tracePirozhok = (yOff: number) => {
        ctx.beginPath();
        ctx.moveTo(-8.9, 0.3 + yOff);
        ctx.bezierCurveTo(-6.2, -5.6 + yOff, 6.2, -5.6 + yOff, 8.9, 0.3 + yOff);
        ctx.bezierCurveTo(6.2, 5.8 + yOff, -6.2, 5.8 + yOff, -8.9, 0.3 + yOff);
        ctx.closePath();
      };

      // 3D base shadow wall
      ctx.fillStyle = pal.deepCol;
      tracePirozhok(0.6);
      ctx.fill();

      // Pale deep-fry / oven-spring equatorial side ring
      if ((pal.isBaked || pal.isFried) && !pal.isBurnt) {
        ctx.fillStyle = pal.equatorCol;
        tracePirozhok(0.28);
        ctx.fill();
      }

      // Plump pirozhok belly
      ctx.fillStyle = makeDomeGrad(8.8, 5.2);
      tracePirozhok(0);
      ctx.fill();

      ctx.save();
      tracePirozhok(0);
      ctx.clip();
      drawDoughSurfaceMicroTexture(ctx, attrs, pal, 8.2, 4.6);

      // Hand-pinched rope-crimp central seam ridge («косичка» защипа пирожка)
      const pinchCount = 11;
      for (let i = 0; i < pinchCount; i++) {
        const t = (i / (pinchCount - 1)) * 2 - 1; // -1..1
        const px = t * 6.4;
        const py = -0.35 + t * t * 0.45;
        const pScale = 1 - Math.abs(t) * 0.28;

        ctx.fillStyle = pal.deepCol;
        ctx.beginPath();
        ctx.ellipse(px, py + 0.25, 0.85 * pScale, 0.52 * pScale, 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = pal.hiCol;
        ctx.beginPath();
        ctx.ellipse(px, py, 0.78 * pScale, 0.44 * pScale, 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = pal.shCol;
        ctx.lineWidth = 0.26;
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = pal.rimCol;
      ctx.lineWidth = 0.45;
      tracePirozhok(0);
      ctx.stroke();

      if (isBittenOrCut) {
        drawExposedInteriorCrossSection(ctx, attrs, pal, 4.2, 0.4, 3.5, 2.7, -0.15);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 11B. SAMSA TRIANGLE (Треугольная самса конвертом с кунжутом и чернушкой)
    // ------------------------------------------------------------------------
    case 'samsa_triangle': {
      drawShadow(ctx, 8.4, 2.8, 5.8, 0.28);

      const traceSamsa = (yOff: number) => {
        ctx.beginPath();
        // Rounded plump triangle with 3 folded corners: top-mid (0, -6.4), bottom-right (7.8, 4.4), bottom-left (-7.8, 4.4)
        ctx.moveTo(0, -6.4 + yOff);
        ctx.bezierCurveTo(3.2, -6.4 + yOff, 8.6, 1.2 + yOff, 7.6, 4.2 + yOff);
        ctx.bezierCurveTo(6.4, 6.2 + yOff, -6.4, 6.2 + yOff, -7.6, 4.2 + yOff);
        ctx.bezierCurveTo(-8.6, 1.2 + yOff, -3.2, -6.4 + yOff, 0, -6.4 + yOff);
        ctx.closePath();
      };

      // 3D base crust wall
      ctx.fillStyle = pal.deepCol;
      traceSamsa(0.68);
      ctx.fill();

      // Flaky layered pastry side rim
      if ((pal.isBaked || pal.isFried) && !pal.isBurnt) {
        ctx.fillStyle = pal.equatorCol;
        traceSamsa(0.32);
        ctx.fill();
      }

      // Main triangular dome
      ctx.fillStyle = makeDomeGrad(8.2, 6.0);
      traceSamsa(0);
      ctx.fill();

      ctx.save();
      traceSamsa(0);
      ctx.clip();
      drawDoughSurfaceMicroTexture(ctx, attrs, pal, 7.8, 5.6);

      // Subtle Y-shaped triple envelope fold crease lines meeting near the center
      ctx.strokeStyle = hexToRgba(pal.deepCol, 0.48);
      ctx.lineWidth = 0.55;
      ctx.lineCap = 'round';
      for (const [tx, ty] of [
        [0, -5.2],
        [6.4, 3.6],
        [-6.4, 3.6],
      ]) {
        ctx.beginPath();
        ctx.moveTo(0, 0.4);
        ctx.quadraticCurveTo(tx * 0.45, ty * 0.45 + 0.3, tx, ty);
        ctx.stroke();
      }

      // Glossy egg-yolk glaze & scattered white sesame + black nigella seeds on baked samsa
      if (pal.isBaked && !pal.isBurnt) {
        const glazeGrad = ctx.createRadialGradient(-1.4, -1.6, 0.4, 0, -0.2, 5.4);
        glazeGrad.addColorStop(0, 'rgba(254, 240, 138, 0.38)');
        glazeGrad.addColorStop(0.55, 'rgba(217, 119, 6, 0.22)');
        glazeGrad.addColorStop(1, 'rgba(180, 83, 9, 0)');
        ctx.fillStyle = glazeGrad;
        ctx.beginPath();
        ctx.arc(0, -0.2, 5.4, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < 18; i++) {
          const r = 0.6 + hash01(pal.seed + '_samsa_r', i) * 3.8;
          const a = (i / 18) * Math.PI * 2 + hash01(pal.seed + '_samsa_a', i) * 0.35;
          const sx = Math.cos(a) * r * 1.1;
          const sy = Math.sin(a) * r * 0.85 + 0.3;
          ctx.fillStyle = i % 3 === 0 ? '#1c1917' : '#fef3c7';
          ctx.beginPath();
          ctx.ellipse(sx, sy, 0.26, 0.14, a + 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      ctx.strokeStyle = pal.rimCol;
      ctx.lineWidth = 0.45;
      traceSamsa(0);
      ctx.stroke();

      if (isBittenOrCut) {
        drawExposedInteriorCrossSection(ctx, attrs, pal, 3.6, 1.2, 3.3, 2.5, -0.25);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 12. DUMPLING CRESCENT (Вареник / Пельмень / Жареный Чебурек с зубчиками)
    // ------------------------------------------------------------------------
    case 'dumpling_crescent': {
      drawShadow(ctx, 8.4, 2.5, 5.3, 0.26);

      const traceDumpling = (yOff: number) => {
        ctx.beginPath();
        ctx.moveTo(-8.1, 1.9 + yOff);
        ctx.bezierCurveTo(-6.8, -5.6 + yOff, 6.8, -5.6 + yOff, 8.1, 1.9 + yOff);
        ctx.quadraticCurveTo(0, 4.4 + yOff, -8.1, 1.9 + yOff);
        ctx.closePath();
      };

      ctx.fillStyle = pal.deepCol;
      traceDumpling(0.5);
      ctx.fill();

      ctx.fillStyle = makeDomeGrad(8.2, 5.1);
      traceDumpling(0);
      ctx.fill();

      ctx.save();
      traceDumpling(0);
      ctx.clip();

      // Subsurface translucency of filling glowing softly through thin boiled/raw dumpling belly!
      if (
        attrs.fillings.length > 0 &&
        (pal.isWetBoiled || attrs.cookState === 'raw') &&
        attrs.thicknessMm <= 4.5
      ) {
        const subCol = attrs.fillings[0].colorHex || '#7c2d12';
        const subGrad = ctx.createRadialGradient(0, 0.6, 0.4, 0, 0.6, 4.6);
        subGrad.addColorStop(0, hexToRgba(subCol, pal.isWetBoiled ? 0.34 : 0.18));
        subGrad.addColorStop(1, hexToRgba(subCol, 0));
        ctx.fillStyle = subGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0.6, 4.6, 2.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      drawDoughSurfaceMicroTexture(ctx, attrs, pal, 7.6, 4.5);

      // Scalloped hand-pinched crest (or fork-crimped cheburek teeth when fried)
      const crimpSteps = pal.isFried ? 17 : 11;
      for (let i = 0; i < crimpSteps; i++) {
        const t = i / (crimpSteps - 1);
        const ang = Math.PI * (1.08 + t * 0.84);
        const outX = Math.cos(ang) * 7.4;
        const outY = Math.sin(ang) * 4.7 + 0.7;
        const inX = Math.cos(ang) * 5.35;
        const inY = Math.sin(ang) * 3.2 + 0.7;

        ctx.strokeStyle = pal.deepCol;
        ctx.lineWidth = pal.isFried ? 0.42 : 0.55;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(outX, outY);
        ctx.lineTo(inX, inY);
        ctx.stroke();

        ctx.strokeStyle = pal.hiCol;
        ctx.lineWidth = 0.25;
        ctx.beginPath();
        ctx.moveTo(outX + 0.22, outY);
        ctx.lineTo(inX + 0.22, inY);
        ctx.stroke();
      }

      // Plump belly highlight dividing crimped rim from filling pouch
      ctx.strokeStyle = hexToRgba(pal.shCol, 0.5);
      ctx.lineWidth = 0.42;
      ctx.beginPath();
      ctx.ellipse(0, 0.9, 5.4, 2.9, 0, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = pal.rimCol;
      ctx.lineWidth = 0.44;
      traceDumpling(0);
      ctx.stroke();

      if (isBittenOrCut) {
        drawExposedInteriorCrossSection(ctx, attrs, pal, 2.8, 0.8, 3.2, 2.3, -0.2);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 13. POUCH KHINKALI / BELYASH (Хинкали со складками / Жареный Беляш с окошком)
    // ------------------------------------------------------------------------
    case 'pouch_khinkali': {
      drawShadow(ctx, 7.8, 2.6, 6.5, 0.27);

      // When fried/deep-fried -> render authentic golden Belyash with pleated top opening & visible juicy filling!
      if (pal.isFried) {
        const rx = 7.8;
        const ry = 5.9;
        ctx.fillStyle = pal.deepCol;
        ctx.beginPath();
        ctx.ellipse(0, 0.85, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = pal.equatorCol;
        ctx.beginPath();
        ctx.ellipse(0, 0.45, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = makeDomeGrad(rx, ry, 0.2);
        ctx.beginPath();
        ctx.ellipse(0, 0.2, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, 0.2, rx, ry, 0, 0, Math.PI * 2);
        ctx.clip();
        drawDoughSurfaceMicroTexture(ctx, attrs, pal, rx - 0.5, ry - 0.5);

        // Radial gathered pleats around the central belyash opening
        const pleats = 14;
        for (let i = 0; i < pleats; i++) {
          const a = (i / pleats) * Math.PI * 2;
          ctx.strokeStyle = pal.deepCol;
          ctx.lineWidth = 0.42;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 2.1, Math.sin(a) * 1.55 + 0.1);
          ctx.quadraticCurveTo(
            Math.cos(a + 0.18) * 4.4,
            Math.sin(a + 0.18) * 3.2 + 0.1,
            Math.cos(a + 0.08) * 6.4,
            Math.sin(a + 0.08) * 4.6 + 0.1
          );
          ctx.stroke();
        }
        ctx.restore();

        ctx.strokeStyle = pal.rimCol;
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.ellipse(0, 0.2, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Central belyash steam window exposing the simmering meat/filling inside!
        drawExposedInteriorCrossSection(ctx, attrs, pal, 0, 0.1, 2.7, 2.0, 0);
        break;
      }

      // Raw / Boiled / Steamed / Baked Khinkali pouch with 18 radial pleats & twisted top knot
      const traceKhinkali = (yOff: number) => {
        ctx.beginPath();
        ctx.moveTo(-1.5, -6.3 + yOff);
        ctx.quadraticCurveTo(0, -6.8 + yOff, 1.5, -6.3 + yOff);
        ctx.bezierCurveTo(2.4, -3.3 + yOff, 8.0, -1.5 + yOff, 7.3, 2.8 + yOff);
        ctx.bezierCurveTo(6.7, 6.0 + yOff, -6.7, 6.0 + yOff, -7.3, 2.8 + yOff);
        ctx.bezierCurveTo(-8.0, -1.5 + yOff, -2.4, -3.3 + yOff, -1.5, -6.3 + yOff);
        ctx.closePath();
      };

      ctx.fillStyle = pal.deepCol;
      traceKhinkali(0.55);
      ctx.fill();

      ctx.fillStyle = makeDomeGrad(7.5, 6.0);
      traceKhinkali(0);
      ctx.fill();

      ctx.save();
      traceKhinkali(0);
      ctx.clip();

      if (
        attrs.fillings.length > 0 &&
        (pal.isWetBoiled || attrs.cookState === 'raw')
      ) {
        const subCol = attrs.fillings[0].colorHex || '#7c2d12';
        const subGrad = ctx.createRadialGradient(0, 1.8, 0.4, 0, 1.8, 5.0);
        subGrad.addColorStop(0, hexToRgba(subCol, pal.isWetBoiled ? 0.28 : 0.15));
        subGrad.addColorStop(1, hexToRgba(subCol, 0));
        ctx.fillStyle = subGrad;
        ctx.beginPath();
        ctx.ellipse(0, 1.8, 5.2, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      drawDoughSurfaceMicroTexture(ctx, attrs, pal, 7.0, 5.5);

      // 11 visible front radial 3D pleats converging into the twisted top knot
      for (let i = -5; i <= 5; i++) {
        const px = i * 1.25;
        ctx.strokeStyle = pal.deepCol;
        ctx.lineWidth = 0.42;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(px * 0.22, -4.8);
        ctx.bezierCurveTo(px * 0.55, -2.2, px * 1.05, 0.5, px * 0.95, 4.2);
        ctx.stroke();

        ctx.strokeStyle = pal.hiCol;
        ctx.lineWidth = 0.24;
        ctx.beginPath();
        ctx.moveTo(px * 0.22 + 0.2, -4.8);
        ctx.bezierCurveTo(px * 0.55 + 0.25, -2.2, px * 1.05 + 0.25, 0.5, px * 0.95 + 0.2, 4.2);
        ctx.stroke();
      }

      // Twisted top knot crown («хвостик» хинкали)
      ctx.fillStyle = shade(pal.surfCol, -0.1);
      ctx.beginPath();
      ctx.ellipse(0, -5.8, 1.55, 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = pal.shCol;
      ctx.lineWidth = 0.3;
      ctx.stroke();

      // Coarse black pepper flecks on boiled khinkali
      if (pal.isWetBoiled) {
        ctx.fillStyle = '#1c1917';
        for (const [bx, by] of [
          [-2.2, 1.4],
          [1.8, 0.8],
          [-0.5, 2.6],
          [2.6, 2.4],
          [-1.4, -0.5],
        ]) {
          ctx.beginPath();
          ctx.arc(bx, by, 0.16, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      ctx.strokeStyle = pal.rimCol;
      ctx.lineWidth = 0.44;
      traceKhinkali(0);
      ctx.stroke();

      if (isBittenOrCut) {
        drawExposedInteriorCrossSection(ctx, attrs, pal, 3.2, 1.8, 3.2, 2.4, -0.25);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 14. ROLL STRUDEL (Рулет / Штрудель с детальным спиральным срезом начинки)
    // ------------------------------------------------------------------------
    case 'roll_strudel': {
      drawShadow(ctx, 9.2, 2.7, 5.3, 0.28);

      // 3D base wall
      ctx.fillStyle = pal.deepCol;
      ctx.beginPath();
      ctx.roundRect(-9.0, -4.1, 18.0, 8.9, 2.6);
      ctx.fill();

      // Main cylindrical strudel log
      ctx.fillStyle = makeDomeGrad(8.9, 4.6);
      ctx.beginPath();
      ctx.roundRect(-9.0, -4.5, 18.0, 8.8, 2.6);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-9.0, -4.5, 18.0, 8.8, 2.6);
      ctx.clip();
      drawDoughSurfaceMicroTexture(ctx, attrs, pal, 8.2, 4.2);

      // Diagonal steam vent slashes across top of strudel
      for (const sx of [-5.2, -2.0, 1.2]) {
        ctx.strokeStyle = pal.deepCol;
        ctx.lineWidth = 0.55;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx - 0.9, -2.6);
        ctx.quadraticCurveTo(sx + 0.2, -0.2, sx + 1.1, 2.2);
        ctx.stroke();

        ctx.strokeStyle = pal.hiCol;
        ctx.lineWidth = 0.25;
        ctx.beginPath();
        ctx.moveTo(sx - 0.65, -2.6);
        ctx.quadraticCurveTo(sx + 0.45, -0.2, sx + 1.35, 2.2);
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = pal.rimCol;
      ctx.lineWidth = 0.44;
      ctx.beginPath();
      ctx.roundRect(-9.0, -4.5, 18.0, 8.8, 2.6);
      ctx.stroke();

      // 3D Angled Front Cut Face on right end showing alveolar crumb & spiral filling!
      const cutX = 6.55;
      const cutRx = 2.35;
      const cutRy = 4.25;

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cutX, -0.05, cutRx, cutRy, 0, 0, Math.PI * 2);
      ctx.clip();
      drawAlveolarCrumbTexture(ctx, pal, cutRx, cutRy, '_strudelCut');

      // Multi-turn spiral of filling & detailed filling micro-chunks inside the swirl!
      const swirlCol = attrs.fillings[0]?.colorHex || '#7c2d12';
      ctx.strokeStyle = shade(swirlCol, -0.22);
      ctx.lineWidth = 0.85;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let t = 0.35; t <= Math.PI * 3.35; t += 0.16) {
        const rFrac = (t / (Math.PI * 3.5)) * 0.82;
        const sx = cutX + Math.cos(t) * cutRx * rFrac;
        const sy = -0.05 + Math.sin(t) * cutRy * rFrac;
        if (t === 0.35) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Render actual chunks of fillings tucked along the spiral turns!
      if (attrs.fillings.length > 0) {
        const archetypes = attrs.fillings.map((f) => ({
          f,
          arch: classifyFillingArchetype(f),
        }));
        for (let k = 0; k < 7; k++) {
          const t = 0.8 + k * 1.25;
          const rFrac = (t / (Math.PI * 3.6)) * 0.78;
          const fx = cutX + Math.cos(t) * cutRx * rFrac;
          const fy = -0.05 + Math.sin(t) * cutRy * rFrac;
          const entry = archetypes[k % archetypes.length];
          ctx.save();
          ctx.translate(fx, fy);
          ctx.scale(0.45, 0.65);
          drawDetailedFillingPiece(
            ctx,
            entry.f,
            entry.arch,
            attrs.cookState !== 'raw',
            pal.isBurnt,
            0.75,
            k + 50
          );
          ctx.restore();
        }
      }
      ctx.restore();

      ctx.strokeStyle = pal.rimCol;
      ctx.lineWidth = 0.42;
      ctx.beginPath();
      ctx.ellipse(cutX, -0.05, cutRx, cutRy, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    // ------------------------------------------------------------------------
    // 15. NOODLES & STRIPS (Домашняя лапша / Нарезанные ленты теста)
    // ------------------------------------------------------------------------
    case 'noodles':
    case 'strip': {
      drawShadow(ctx, 8.6, 2.4, 5.4, 0.24);
      const isFine = attrs.shape === 'noodles';
      const w = isFine ? 1.1 : 2.15;
      const count = isFine ? 8 : 5;

      for (let i = 0; i < count; i++) {
        const yOff = -4.3 + (i / Math.max(1, count - 1)) * 8.6;
        const waveAmp = (i % 2 === 0 ? 1 : -1) * (isFine ? 1.35 : 1.05);
        const rot = (i % 3 - 1) * 0.08;

        ctx.save();
        ctx.rotate(rot);

        const traceRibbon = (dy: number) => {
          ctx.beginPath();
          ctx.moveTo(-8.3, yOff - w * 0.48 + dy);
          ctx.bezierCurveTo(
            -3.2,
            yOff - waveAmp + dy,
            3.2,
            yOff + waveAmp + dy,
            8.3,
            yOff - w * 0.48 + dy
          );
          ctx.lineTo(8.3, yOff + w * 0.48 + dy);
          ctx.bezierCurveTo(
            3.2,
            yOff + waveAmp + w + dy,
            -3.2,
            yOff - waveAmp + w + dy,
            -8.3,
            yOff + w * 0.48 + dy
          );
          ctx.closePath();
        };

        // 3D ribbon thickness edge & cast shadow onto lower noodles
        ctx.fillStyle = pal.deepCol;
        traceRibbon(0.42);
        ctx.fill();

        // Top ribbon face
        ctx.fillStyle = i % 2 === 0 ? pal.surfCol : pal.hiCol;
        traceRibbon(0);
        ctx.fill();

        // Specular sheen (wet starch on boiled noodles) or flour dust (on raw)
        if (pal.isWetBoiled || pal.isFried) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
          ctx.lineWidth = 0.28;
          ctx.beginPath();
          ctx.moveTo(-6.5, yOff - w * 0.15);
          ctx.bezierCurveTo(-2.5, yOff - waveAmp * 0.7, 2.5, yOff + waveAmp * 0.7, 6.5, yOff - w * 0.15);
          ctx.stroke();
        } else if (attrs.cookState === 'raw' && i % 2 === 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.beginPath();
          ctx.ellipse((i - 3) * 1.2, yOff, 1.6, w * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.strokeStyle = pal.rimCol;
        ctx.lineWidth = 0.3;
        traceRibbon(0);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 16. CUBES / PIECES / GNOCCHI (Клёцки / Галушки / Нарезанные кусочки теста)
    // ------------------------------------------------------------------------
    case 'cubes_pieces':
    default: {
      drawShadow(ctx, 8.0, 2.5, 5.8, 0.25);
      const pieces: [number, number, number, number, number][] = [
        [-4.2, -2.1, 2.55, 1.95, 0.22],
        [1.3, -2.6, 2.45, 2.05, -0.18],
        [4.5, 0.5, 2.4, 1.95, 0.32],
        [-4.6, 2.2, 2.35, 1.85, -0.25],
        [2.2, 2.5, 2.4, 1.9, 0.15],
        [-0.7, 0.5, 2.75, 2.15, -0.12],
      ];

      for (let i = 0; i < pieces.length; i++) {
        const [px, py, rx, ry, rot] = pieces[i];
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(rot);

        // 3D extruded piece side wall
        ctx.fillStyle = pal.deepCol;
        drawOrganicBlobPath(ctx, 0.15, 0.52, rx, ry, i + 41, 0.08, 8);
        ctx.fill();

        // Top cut/pillowed face
        const g = ctx.createRadialGradient(-rx * 0.3, -ry * 0.3, 0.2, 0, 0, rx * 1.15);
        g.addColorStop(0, pal.hiCol);
        g.addColorStop(0.6, pal.surfCol);
        g.addColorStop(1, pal.shCol);
        ctx.fillStyle = g;
        drawOrganicBlobPath(ctx, 0, 0, rx, ry, i + 41, 0.08, 8);
        ctx.fill();

        ctx.save();
        ctx.clip();
        // Porous crumb texture on cut face or gnocchi fork grooves
        if (attrs.doughType === 'potato_gnocchi' || pal.isWetBoiled) {
          for (let gIdx = -1; gIdx <= 1; gIdx++) {
            ctx.strokeStyle = pal.shCol;
            ctx.lineWidth = 0.34;
            ctx.beginPath();
            ctx.arc(gIdx * 0.85, 0, ry * 0.85, -0.7, 0.7);
            ctx.stroke();
          }
        } else if (pal.isBaked) {
          drawAlveolarCrumbTexture(ctx, pal, rx * 0.85, ry * 0.85, `_pc_${i}`);
        }
        drawDoughSurfaceMicroTexture(ctx, attrs, pal, rx, ry);
        ctx.restore();

        ctx.strokeStyle = pal.rimCol;
        ctx.lineWidth = 0.36;
        drawOrganicBlobPath(ctx, 0, 0, rx, ry, i + 41, 0.08, 8);
        ctx.stroke();

        ctx.restore();
      }
      break;
    }
  }

  ctx.restore();
  return true;
}
