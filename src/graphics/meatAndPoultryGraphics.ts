// Procedural 2D Canvas Models for Meat, Offal, Poultry, and Minced Meat (Butcher-Grade 2.5D Studio Art)
import {
  drawShadow,
  drawLitSphere,
  drawLitEllipse,
  drawOrganicBlobPath,
  adjustHex,
  mixHex,
  hexToRgba,
  hash01
} from './itemGraphicShared';

interface MeatPalette {
  primary: string;
  dark: string;
  deep: string;
  light: string;
  highlight: string;
  fat: string;
  fatShade: string;
  fatCap: string;
  silverskin: string;
  marblingDensity: number;
  organTint: string;
}

const MEAT_PALETTES: Record<string, MeatPalette> = {
  beef: {
    primary: '#9e1c20',
    dark: '#6c1014',
    deep: '#3f070a',
    light: '#d83438',
    highlight: '#f46d70',
    fat: '#fef6db',
    fatShade: '#e5cf99',
    fatCap: '#fdf0c0',
    silverskin: '#dce8f4',
    marblingDensity: 1.0,
    organTint: '#6a121b'
  },
  pork: {
    primary: '#dc637f',
    dark: '#a0304f',
    deep: '#63172d',
    light: '#f495ac',
    highlight: '#fbc4d1',
    fat: '#fff8f9',
    fatShade: '#ead5db',
    fatCap: '#fff1f3',
    silverskin: '#eef3f8',
    marblingDensity: 0.85,
    organTint: '#8d2642'
  },
  mutton: {
    primary: '#8e2319',
    dark: '#5d130d',
    deep: '#360906',
    light: '#c7432a',
    highlight: '#e6745a',
    fat: '#fef3c7',
    fatShade: '#dec47a',
    fatCap: '#fde69a',
    silverskin: '#e2e8f0',
    marblingDensity: 0.9,
    organTint: '#5e1412'
  },
  venison: {
    primary: '#6e112b',
    dark: '#48071a',
    deep: '#27030e',
    light: '#9f1d43',
    highlight: '#cf486e',
    fat: '#f7f9fc',
    fatShade: '#cbd5e1',
    fatCap: '#edf2f7',
    silverskin: '#cbd9e8',
    marblingDensity: 0.38,
    organTint: '#48081c'
  },
  goat: {
    primary: '#9d3417',
    dark: '#6b200c',
    deep: '#3f1106',
    light: '#cf532c',
    highlight: '#ea815c',
    fat: '#fef9d6',
    fatShade: '#e0d295',
    fatCap: '#fdf2b8',
    silverskin: '#e3eaf2',
    marblingDensity: 0.55,
    organTint: '#661d12'
  }
};

interface BirdPalette {
  skinHighlight: string;
  skin: string;
  skinMid: string;
  skinDark: string;
  fatPad: string;
  meatLight: string;
  meat: string;
  meatDark: string;
  darkMeat: string;
  darkMeatDeep: string;
  bone: string;
  boneShade: string;
  follicle: string;
}

const BIRD_PALETTES: Record<string, BirdPalette> = {
  chicken: {
    skinHighlight: '#fff9f0',
    skin: '#fde0be',
    skinMid: '#f2be8c',
    skinDark: '#c87e4b',
    fatPad: '#fde68a',
    meatLight: '#fdd7da',
    meat: '#f0939b',
    meatDark: '#bd4b58',
    darkMeat: '#c84b52',
    darkMeatDeep: '#7c1f27',
    bone: '#fbfcfe',
    boneShade: '#cbd5e1',
    follicle: 'rgba(168, 92, 42, 0.24)'
  },
  duck: {
    skinHighlight: '#fff3e2',
    skin: '#fcc794',
    skinMid: '#e69856',
    skinDark: '#a9511f',
    fatPad: '#fcd34d',
    meatLight: '#e97d7f',
    meat: '#bd2b33',
    meatDark: '#731118',
    darkMeat: '#9d1d24',
    darkMeatDeep: '#560a10',
    bone: '#f6f8fb',
    boneShade: '#c4cfdd',
    follicle: 'rgba(146, 64, 14, 0.28)'
  },
  goose: {
    skinHighlight: '#fefce4',
    skin: '#fae091',
    skinMid: '#e3b349',
    skinDark: '#9e6514',
    fatPad: '#fde047',
    meatLight: '#df6b6c',
    meat: '#a82228',
    meatDark: '#640e14',
    darkMeat: '#8b1920',
    darkMeatDeep: '#4c090e',
    bone: '#f4f7fb',
    boneShade: '#bfcbd9',
    follicle: 'rgba(140, 74, 16, 0.27)'
  },
  turkey: {
    skinHighlight: '#fffaf4',
    skin: '#fae3d2',
    skinMid: '#e4b396',
    skinDark: '#ac6344',
    fatPad: '#fef0b8',
    meatLight: '#fce0e5',
    meat: '#e18292',
    meatDark: '#9d364b',
    darkMeat: '#a83345',
    darkMeatDeep: '#621423',
    bone: '#fbfcfe',
    boneShade: '#cbd5e1',
    follicle: 'rgba(154, 72, 42, 0.22)'
  },
  pheasant: {
    skinHighlight: '#fef7dd',
    skin: '#f2ca7d',
    skinMid: '#d19340',
    skinDark: '#874a15',
    fatPad: '#facc15',
    meatLight: '#d96973',
    meat: '#971e2b',
    meatDark: '#520b15',
    darkMeat: '#7c1421',
    darkMeatDeep: '#420710',
    bone: '#f0f4f8',
    boneShade: '#b7c4d3',
    follicle: 'rgba(120, 53, 15, 0.29)'
  },
  quail: {
    skinHighlight: '#fefde9',
    skin: '#f3d997',
    skinMid: '#d9ad5f',
    skinDark: '#9b601e',
    fatPad: '#fef08a',
    meatLight: '#f6bac4',
    meat: '#d86679',
    meatDark: '#8c2339',
    darkMeat: '#a93148',
    darkMeatDeep: '#631325',
    bone: '#ffffff',
    boneShade: '#cbd5e1',
    follicle: 'rgba(146, 64, 14, 0.25)'
  }
};

export function drawMeatAndPoultryItem(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  if (itemId === 'minced_meat_mixed' || itemId.includes('minced')) {
    return drawMincedMeat(ctx, itemId);
  }

  for (const animal of ['beef', 'pork', 'mutton', 'venison', 'goat']) {
    if (itemId.startsWith(`${animal}_`)) {
      const cut = itemId.slice(animal.length + 1);
      const pal = MEAT_PALETTES[animal] || MEAT_PALETTES.beef;
      return drawMammalCut(ctx, cut, pal, animal);
    }
  }

  for (const bird of ['chicken', 'duck', 'goose', 'turkey', 'pheasant', 'quail']) {
    if (itemId.startsWith(`${bird}_`)) {
      const cut = itemId.slice(bird.length + 1);
      const pal = BIRD_PALETTES[bird] || BIRD_PALETTES.chicken;
      return drawBirdCut(ctx, cut, pal, bird);
    }
  }

  return false;
}

// ============================================================
// === SHARED BUTCHER-GRADE PROCEDURAL MICRO-TEXTURE HELPERS ===
// ============================================================

function drawTrabecularBoneCut(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rot: number = 0,
  goldenMarrow: boolean = false
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);

  // Subtle dark contact rim where flesh meets periosteum
  ctx.fillStyle = 'rgba(42, 8, 12, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 0.18, rx * 1.12, ry * 1.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dense ivory cortical bone wall
  drawLitEllipse(ctx, 0, 0, rx, ry, 0, '#ffffff', '#f3f1e8', '#b8bec7', undefined, 0.42);

  // Inner cortical wall rim
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
  ctx.lineWidth = 0.28;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.72, ry * 0.72, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Spongy trabecular marrow core
  const mGrad = ctx.createRadialGradient(-rx * 0.16, -ry * 0.18, 0.08, 0, 0, Math.max(rx, ry) * 0.68);
  if (goldenMarrow) {
    mGrad.addColorStop(0, '#fff7dc');
    mGrad.addColorStop(0.5, '#f2c17d');
    mGrad.addColorStop(0.85, '#c46a49');
    mGrad.addColorStop(1, '#7c241e');
  } else {
    mGrad.addColorStop(0, '#f8a5a5');
    mGrad.addColorStop(0.45, '#be2830');
    mGrad.addColorStop(0.82, '#7c1219');
    mGrad.addColorStop(1, '#3d070c');
  }
  ctx.fillStyle = mGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.58, ry * 0.58, 0, 0, Math.PI * 2);
  ctx.fill();

  // Micro-porous trabecular stipples
  ctx.fillStyle = goldenMarrow ? 'rgba(124, 36, 30, 0.28)' : 'rgba(255, 228, 230, 0.35)';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const d = (i % 2 === 0 ? 0.22 : 0.38);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rx * d, Math.sin(a) * ry * d, 0.16, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wet marrow glint
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.ellipse(-rx * 0.16, -ry * 0.16, rx * 0.18, ry * 0.12, -0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawMuscleFibers(
  ctx: CanvasRenderingContext2D,
  seed: string,
  bounds: { x: number; y: number; w: number; h: number },
  angle: number,
  count: number,
  pal: MeatPalette,
  curveAmount: number = 0.85
) {
  ctx.save();
  ctx.translate(bounds.x + bounds.w * 0.5, bounds.y + bounds.h * 0.5);
  ctx.rotate(angle);

  const halfW = bounds.w * 0.55;
  const halfH = bounds.h * 0.55;

  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0.5;
    const y = -halfH + t * halfH * 2 + (hash01(seed + 'fy', i) - 0.5) * 0.55;
    const wave = (hash01(seed + 'fw', i) - 0.5) * curveAmount * 2;
    const segShift = (hash01(seed + 'fs', i) - 0.5) * 1.1;

    // Dark endomysium groove
    ctx.strokeStyle = hexToRgba(pal.deep, 0.38 + hash01(seed + 'fa', i) * 0.2);
    ctx.lineWidth = 0.42;
    ctx.beginPath();
    ctx.moveTo(-halfW, y + 0.18);
    ctx.quadraticCurveTo(segShift, y + wave + 0.18, halfW, y + 0.18);
    ctx.stroke();

    // Lit muscle bundle ridge
    ctx.strokeStyle = hexToRgba(pal.highlight, 0.22 + hash01(seed + 'fb', i) * 0.18);
    ctx.lineWidth = 0.32;
    ctx.beginPath();
    ctx.moveTo(-halfW, y - 0.12);
    ctx.quadraticCurveTo(segShift, y + wave - 0.12, halfW, y - 0.12);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMarblingNetwork(
  ctx: CanvasRenderingContext2D,
  seed: string,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  pal: MeatPalette,
  baseCount: number = 8
) {
  const veins = Math.max(2, Math.round(baseCount * pal.marblingDensity));
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 0; i < veins; i++) {
    const x0 = cx + (hash01(seed + 'mx0', i) - 0.5) * rx * 1.55;
    const y0 = cy + (hash01(seed + 'my0', i) - 0.5) * ry * 1.45;
    const ang = (hash01(seed + 'ma', i) - 0.5) * Math.PI * 1.6;
    const len = (1.6 + hash01(seed + 'ml', i) * 2.8) * (0.7 + 0.3 * pal.marblingDensity);
    const xm = x0 + Math.cos(ang) * len * 0.52 + (hash01(seed + 'mb', i) - 0.5) * 1.1;
    const ym = y0 + Math.sin(ang) * len * 0.52 + (hash01(seed + 'mc', i) - 0.5) * 1.1;
    const x1 = x0 + Math.cos(ang) * len;
    const y1 = y0 + Math.sin(ang) * len;

    // Soft subcutaneous fat halo
    ctx.strokeStyle = hexToRgba(pal.fatShade, 0.36);
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(xm, ym, x1, y1);
    ctx.stroke();

    // Crisp creamy intramuscular fat vein
    ctx.strokeStyle = hexToRgba(pal.fat, 0.78);
    ctx.lineWidth = 0.38;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(xm, ym, x1, y1);
    ctx.stroke();

    // Fine tributary branch
    if (i % 2 === 0) {
      const bAng = ang + (hash01(seed + 'md', i) > 0.5 ? 0.72 : -0.72);
      const bLen = len * 0.45;
      ctx.strokeStyle = hexToRgba(pal.fat, 0.58);
      ctx.lineWidth = 0.25;
      ctx.beginPath();
      ctx.moveTo(xm, ym);
      ctx.lineTo(xm + Math.cos(bAng) * bLen, ym + Math.sin(bAng) * bLen);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawSilverskinSheen(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  xc: number,
  yc: number,
  x1: number,
  y1: number,
  pal: MeatPalette,
  width: number = 0.9
) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = hexToRgba(pal.silverskin, 0.48);
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(xc, yc, x1, y1);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.58)';
  ctx.lineWidth = width * 0.36;
  ctx.beginPath();
  ctx.moveTo(x0, y0 - 0.12);
  ctx.quadraticCurveTo(xc, yc - 0.12, x1, y1 - 0.12);
  ctx.stroke();
  ctx.restore();
}

function drawWetMeatGloss(
  ctx: CanvasRenderingContext2D,
  highlights: Array<{ x: number; y: number; rx: number; ry: number; rot?: number; alpha?: number }>
) {
  ctx.save();
  for (const h of highlights) {
    const a = h.alpha ?? 0.32;
    const g = ctx.createRadialGradient(h.x, h.y, 0.05, h.x, h.y, Math.max(h.rx, h.ry));
    g.addColorStop(0, `rgba(255, 255, 255, ${a})`);
    g.addColorStop(0.55, `rgba(255, 240, 242, ${a * 0.45})`);
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(h.x, h.y, h.rx, h.ry, h.rot ?? -0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawButcherTwineBand(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  xc: number,
  yc: number,
  x1: number,
  y1: number
) {
  ctx.save();
  ctx.lineCap = 'round';
  // Pinch indentation shadow in the meat
  ctx.strokeStyle = 'rgba(38, 6, 10, 0.55)';
  ctx.lineWidth = 1.45;
  ctx.beginPath();
  ctx.moveTo(x0, y0 + 0.22);
  ctx.quadraticCurveTo(xc, yc + 0.28, x1, y1 + 0.22);
  ctx.stroke();

  // Natural unbleached cotton twine body
  ctx.strokeStyle = '#d6c5a3';
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(xc, yc, x1, y1);
  ctx.stroke();

  // Bright braided highlight
  ctx.strokeStyle = '#faf3e0';
  ctx.lineWidth = 0.34;
  ctx.setLineDash([0.65, 0.55]);
  ctx.beginPath();
  ctx.moveTo(x0, y0 - 0.14);
  ctx.quadraticCurveTo(xc, yc - 0.14, x1, y1 - 0.14);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawPoultryFollicles(
  ctx: CanvasRenderingContext2D,
  seed: string,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  pal: BirdPalette,
  count: number = 14
) {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const ang = hash01(seed + 'fa', i) * Math.PI * 2;
    const rad = Math.sqrt(hash01(seed + 'fr', i));
    const px = cx + Math.cos(ang) * rx * rad;
    const py = cy + Math.sin(ang) * ry * rad;

    ctx.fillStyle = pal.follicle;
    ctx.beginPath();
    ctx.arc(px, py, 0.24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.beginPath();
    ctx.arc(px - 0.12, py - 0.12, 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ============================================================
// === 1. MAMMAL CUTS & OFFAL (5 SPECIES x 19 CUTS) ===
// ============================================================

function drawMammalCut(ctx: CanvasRenderingContext2D, cut: string, pal: MeatPalette, animal: string): boolean {
  switch (cut) {
    // ----------------------------------------------------------
    // WHOLE HANGING CARCASS (Туша на мясницком крюке)
    // ----------------------------------------------------------
    case 'carcass': {
      drawShadow(ctx, 8.2, 3.0, 9.2, 0.32);

      // Forged stainless butcher's S-hook & gambrel bar
      const hookGrad = ctx.createLinearGradient(-3.8, -10.5, 3.8, -5.5);
      hookGrad.addColorStop(0, '#f8fafc');
      hookGrad.addColorStop(0.45, '#94a3b8');
      hookGrad.addColorStop(0.8, '#475569');
      hookGrad.addColorStop(1, '#e2e8f0');
      ctx.strokeStyle = hookGrad;
      ctx.lineWidth = 1.25;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, -8.8, 1.55, Math.PI * 0.9, Math.PI * 0.08);
      ctx.lineTo(1.5, -6.2);
      ctx.stroke();

      // Gambrel spreader bar across hocks
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-4.4, -6.0);
      ctx.lineTo(4.4, -6.0);
      ctx.stroke();
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 0.38;
      ctx.beginPath();
      ctx.moveTo(-4.2, -6.2);
      ctx.lineTo(4.2, -6.2);
      ctx.stroke();

      // Carcass silhouette (tapered haunches up top, broad split ribcage below)
      const drawCarcassPath = () => {
        ctx.beginPath();
        ctx.moveTo(-4.8, -5.8);
        ctx.bezierCurveTo(-7.2, -3.4, -7.8, 1.4, -5.8, 6.2);
        ctx.quadraticCurveTo(-3.2, 8.2, -0.5, 7.8);
        ctx.lineTo(0, 7.1);
        ctx.lineTo(0.5, 7.8);
        ctx.quadraticCurveTo(3.2, 8.2, 5.8, 6.2);
        ctx.bezierCurveTo(7.8, 1.4, 7.2, -3.4, 4.8, -5.8);
        ctx.quadraticCurveTo(0, -6.6, -4.8, -5.8);
        ctx.closePath();
      };

      // Deep 3D back-edge bevel
      ctx.save();
      ctx.translate(0.35, 0.7);
      ctx.fillStyle = pal.deep;
      drawCarcassPath();
      ctx.fill();
      ctx.restore();

      const bodyGrad = ctx.createRadialGradient(-1.8, -2.2, 0.8, 0, 1.0, 9.2);
      bodyGrad.addColorStop(0, pal.light);
      bodyGrad.addColorStop(0.45, pal.primary);
      bodyGrad.addColorStop(0.85, pal.dark);
      bodyGrad.addColorStop(1, pal.deep);
      ctx.fillStyle = bodyGrad;
      drawCarcassPath();
      ctx.fill();

      ctx.save();
      drawCarcassPath();
      ctx.clip();

      // Thick outer subcutaneous fat-cap shoulder & flank coat
      ctx.strokeStyle = pal.fatCap;
      ctx.lineWidth = 2.4;
      drawCarcassPath();
      ctx.stroke();

      ctx.strokeStyle = pal.fatShade;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-5.8, -4.6);
      ctx.bezierCurveTo(-6.6, 0.5, -6.0, 4.5, -4.2, 6.8);
      ctx.moveTo(5.8, -4.6);
      ctx.bezierCurveTo(6.6, 0.5, 6.0, 4.5, 4.2, 6.8);
      ctx.stroke();

      // Deep split thoracic & abdominal cavity
      const cavGrad = ctx.createRadialGradient(0, 0.4, 0.6, 0, 0.6, 5.8);
      cavGrad.addColorStop(0, pal.deep);
      cavGrad.addColorStop(0.7, hexToRgba(pal.dark, 0.85));
      cavGrad.addColorStop(1, hexToRgba(pal.primary, 0));
      ctx.fillStyle = cavGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0.8, 4.8, 5.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sculpted ribcage arches with intercostal meat shadows
      for (let y = -3.8; y <= 4.4; y += 1.45) {
        // Intercostal dark shadow under rib
        ctx.strokeStyle = hexToRgba(pal.deep, 0.65);
        ctx.lineWidth = 1.05;
        ctx.beginPath();
        ctx.moveTo(-0.7, y + 0.35);
        ctx.quadraticCurveTo(-3.2, y + 0.8, -5.6, y - 0.15);
        ctx.moveTo(0.7, y + 0.35);
        ctx.quadraticCurveTo(3.2, y + 0.8, 5.6, y - 0.15);
        ctx.stroke();

        // Ivory rib bone
        ctx.strokeStyle = '#f7f4ea';
        ctx.lineWidth = 0.72;
        ctx.beginPath();
        ctx.moveTo(-0.6, y);
        ctx.quadraticCurveTo(-3.1, y + 0.45, -5.5, y - 0.45);
        ctx.moveTo(0.6, y);
        ctx.quadraticCurveTo(3.1, y + 0.45, 5.5, y - 0.45);
        ctx.stroke();
      }

      // Split spinal column down center with red vertebral marrow pockets
      const spineGrad = ctx.createLinearGradient(-1.15, 0, 1.15, 0);
      spineGrad.addColorStop(0, '#cbd5e1');
      spineGrad.addColorStop(0.5, '#ffffff');
      spineGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = spineGrad;
      ctx.fillRect(-1.05, -5.6, 2.1, 13.0);

      for (let y = -4.6; y <= 6.2; y += 1.45) {
        ctx.fillStyle = '#9e1c20';
        ctx.beginPath();
        ctx.roundRect(-0.55, y, 1.1, 0.72, 0.25);
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(-1.05, y - 0.35);
        ctx.lineTo(1.05, y - 0.35);
        ctx.stroke();
      }

      // Hock knuckle joints at top where gambrel hooks attach
      drawTrabecularBoneCut(ctx, -3.8, -5.2, 0.9, 0.65, -0.3);
      drawTrabecularBoneCut(ctx, 3.8, -5.2, 0.9, 0.65, 0.3);

      // Subtle purple veterinary butcher inspection stamp on left shoulder
      ctx.strokeStyle = 'rgba(109, 40, 217, 0.42)';
      ctx.lineWidth = 0.32;
      ctx.beginPath();
      ctx.ellipse(-4.6, -2.0, 1.0, 0.68, -0.25, 0, Math.PI * 2);
      ctx.stroke();

      drawWetMeatGloss(ctx, [
        { x: -4.2, y: -3.2, rx: 1.4, ry: 0.7, alpha: 0.28 },
        { x: 4.0, y: 1.5, rx: 1.2, ry: 0.6, alpha: 0.22 }
      ]);
      ctx.restore();
      return true;
    }

    // ----------------------------------------------------------
    // HALF CARCASS / SIDE (Полутуша)
    // ----------------------------------------------------------
    case 'side': {
      drawShadow(ctx, 6.8, 3.0, 9.0, 0.3);

      // Steel hanging hook at top chine
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.05;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-1.8, -8.7, 1.15, Math.PI * 0.95, Math.PI * 0.1);
      ctx.lineTo(-0.7, -7.2);
      ctx.stroke();

      const drawSidePath = () => {
        ctx.beginPath();
        ctx.moveTo(-3.4, -7.6);
        ctx.bezierCurveTo(1.8, -7.5, 6.2, -5.4, 7.0, -0.8);
        ctx.bezierCurveTo(7.4, 3.2, 5.2, 7.6, 2.0, 8.2);
        ctx.lineTo(-3.4, 7.9);
        ctx.closePath();
      };

      // Extruded thickness wall
      ctx.save();
      ctx.translate(0.45, 0.75);
      ctx.fillStyle = pal.deep;
      drawSidePath();
      ctx.fill();
      ctx.restore();

      const sGrad = ctx.createLinearGradient(-3.4, -6.5, 7.2, 6.5);
      sGrad.addColorStop(0, pal.deep);
      sGrad.addColorStop(0.28, pal.dark);
      sGrad.addColorStop(0.62, pal.primary);
      sGrad.addColorStop(0.88, pal.light);
      sGrad.addColorStop(1, pal.dark);
      ctx.fillStyle = sGrad;
      drawSidePath();
      ctx.fill();

      ctx.save();
      drawSidePath();
      ctx.clip();

      // Thick outer fat-cap coat along curved back/flank
      ctx.strokeStyle = pal.fatCap;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0.2, -7.8);
      ctx.bezierCurveTo(5.8, -6.2, 7.4, 0.8, 4.4, 7.2);
      ctx.lineTo(1.5, 8.4);
      ctx.stroke();

      ctx.strokeStyle = pal.fatShade;
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(0.0, -6.4);
      ctx.bezierCurveTo(4.6, -5.0, 6.0, 0.8, 3.4, 6.8);
      ctx.stroke();

      // Muscle fibers & marbling in haunch/shoulder
      drawMuscleFibers(ctx, animal + '_side', { x: -2, y: -7, w: 7, h: 14 }, 0.35, 11, pal, 0.7);
      drawMarblingNetwork(ctx, animal + '_side_m', 2.2, 1.2, 4.0, 5.5, pal, 9);

      // Curved thoracic rib rack
      for (let y = -4.6; y <= 4.4; y += 1.55) {
        ctx.strokeStyle = hexToRgba(pal.deep, 0.62);
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-1.5, y + 0.35);
        ctx.quadraticCurveTo(2.0, y + 1.0, 4.9, y - 0.15);
        ctx.stroke();

        ctx.strokeStyle = '#f8f5ec';
        ctx.lineWidth = 0.78;
        ctx.beginPath();
        ctx.moveTo(-1.5, y);
        ctx.quadraticCurveTo(2.0, y + 0.62, 4.8, y - 0.48);
        ctx.stroke();
      }

      // Split vertebral chine bone along left edge
      const chineGrad = ctx.createLinearGradient(-3.4, 0, -1.4, 0);
      chineGrad.addColorStop(0, '#cbd5e1');
      chineGrad.addColorStop(0.55, '#ffffff');
      chineGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = chineGrad;
      ctx.fillRect(-3.4, -7.6, 1.85, 15.6);

      // Red trabecular marrow windows in vertebrae
      for (let y = -6.2; y <= 6.2; y += 1.65) {
        ctx.fillStyle = '#a81c22';
        ctx.beginPath();
        ctx.roundRect(-2.95, y, 0.9, 0.88, 0.2);
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 0.28;
        ctx.beginPath();
        ctx.moveTo(-3.4, y - 0.35);
        ctx.lineTo(-1.55, y - 0.35);
        ctx.stroke();
      }

      drawWetMeatGloss(ctx, [
        { x: 2.8, y: -4.2, rx: 1.8, ry: 0.7, rot: 0.45, alpha: 0.26 },
        { x: 3.6, y: 2.8, rx: 1.5, ry: 0.7, rot: -0.3, alpha: 0.24 }
      ]);
      ctx.restore();
      return true;
    }

    // ----------------------------------------------------------
    // PRIMAL QUARTER / HAUNCH (Четвертина / Окорок)
    // ----------------------------------------------------------
    case 'quarter': {
      drawShadow(ctx, 8.2, 3.2, 8.6, 0.3);

      const drawHaunch = () => {
        ctx.beginPath();
        ctx.moveTo(-7.0, -2.6);
        ctx.bezierCurveTo(-7.6, 3.0, -3.2, 7.2, 2.6, 6.8);
        ctx.bezierCurveTo(7.4, 6.4, 8.0, -0.4, 5.4, -4.6);
        ctx.bezierCurveTo(2.8, -7.6, -5.6, -6.8, -7.0, -2.6);
        ctx.closePath();
      };

      // Thick 3D slab extrusion side-wall
      ctx.save();
      ctx.translate(0.45, 1.25);
      const wallGrad = ctx.createLinearGradient(-7, 2, 7, 6);
      wallGrad.addColorStop(0, pal.deep);
      wallGrad.addColorStop(0.5, pal.dark);
      wallGrad.addColorStop(1, pal.deep);
      ctx.fillStyle = wallGrad;
      drawHaunch();
      ctx.fill();
      ctx.restore();

      // Main cut face
      const hGrad = ctx.createRadialGradient(-2.2, -2.0, 0.8, 0.4, 0.4, 8.6);
      hGrad.addColorStop(0, pal.highlight);
      hGrad.addColorStop(0.28, pal.light);
      hGrad.addColorStop(0.65, pal.primary);
      hGrad.addColorStop(1, pal.deep);
      ctx.fillStyle = hGrad;
      drawHaunch();
      ctx.fill();

      ctx.save();
      drawHaunch();
      ctx.clip();

      // Thick creamy fat cap along upper-right curve
      ctx.strokeStyle = pal.fatCap;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-5.8, -6.2);
      ctx.bezierCurveTo(1.8, -7.4, 6.8, -4.6, 7.4, 2.4);
      ctx.stroke();

      ctx.strokeStyle = pal.fatShade;
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(-5.2, -5.0);
      ctx.bezierCurveTo(1.6, -6.0, 5.8, -3.6, 6.4, 2.2);
      ctx.stroke();

      // Anatomical intermuscular seam dividing top round, bottom round, eye of round
      ctx.strokeStyle = hexToRgba(pal.fat, 0.72);
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(-6.2, 0.5);
      ctx.bezierCurveTo(-2.0, -0.6, 1.2, 0.8, 5.2, 4.4);
      ctx.moveTo(0.8, -0.2);
      ctx.bezierCurveTo(1.8, -2.4, 3.6, -3.6, 5.0, -4.2);
      ctx.stroke();

      // Directional muscle grain per sub-muscle
      drawMuscleFibers(ctx, animal + '_q1', { x: -6.5, y: -5.5, w: 9, h: 6.5 }, -0.35, 9, pal, 0.65);
      drawMuscleFibers(ctx, animal + '_q2', { x: -5.5, y: 0.5, w: 10, h: 6 }, 0.25, 8, pal, 0.6);
      drawMarblingNetwork(ctx, animal + '_qm', 0, 0.2, 6.2, 5.2, pal, 11);

      // Silverskin fascia glint along seam
      drawSilverskinSheen(ctx, -4.8, 0.3, -1.0, -0.3, 2.4, 1.8, pal, 0.8);

      // Exposed central femur bone cross-section with red marrow
      drawTrabecularBoneCut(ctx, -1.6, 1.4, 1.85, 1.45, -0.35);

      // Fresh glistening specular highlights
      drawWetMeatGloss(ctx, [
        { x: -2.4, y: -2.6, rx: 2.2, ry: 0.9, rot: -0.35, alpha: 0.32 },
        { x: 2.8, y: 2.4, rx: 1.6, ry: 0.8, rot: 0.4, alpha: 0.24 }
      ]);
      ctx.restore();
      return true;
    }

    // ----------------------------------------------------------
    // WHOLE TENDERLOIN / CHATEAUBRIAND (Вырезка, перевязанная шпагатом)
    // ----------------------------------------------------------
    case 'tenderloin_huge': {
      drawShadow(ctx, 9.2, 2.9, 6.4, 0.3);

      const drawLoaf = () => {
        ctx.beginPath();
        ctx.moveTo(-8.8, -1.2);
        ctx.bezierCurveTo(-8.6, -4.8, -2.2, -5.6, 4.4, -3.6);
        ctx.bezierCurveTo(8.2, -2.4, 9.4, -0.4, 8.8, 1.6);
        ctx.bezierCurveTo(8.0, 3.8, 2.8, 5.2, -3.6, 4.8);
        ctx.bezierCurveTo(-7.8, 4.5, -9.2, 2.0, -8.8, -1.2);
        ctx.closePath();
      };

      // 3D cylindrical underside shadow wall
      ctx.save();
      ctx.translate(0.25, 0.95);
      ctx.fillStyle = pal.deep;
      drawLoaf();
      ctx.fill();
      ctx.restore();

      // Cylindrical radial-linear studio shading
      const tGrad = ctx.createLinearGradient(-2, -5.2, 1.5, 5.4);
      tGrad.addColorStop(0, pal.highlight);
      tGrad.addColorStop(0.24, pal.light);
      tGrad.addColorStop(0.58, pal.primary);
      tGrad.addColorStop(0.86, pal.dark);
      tGrad.addColorStop(1, pal.deep);
      ctx.fillStyle = tGrad;
      drawLoaf();
      ctx.fill();

      ctx.save();
      drawLoaf();
      ctx.clip();

      // Ultra-fine longitudinal myofibril grain
      drawMuscleFibers(ctx, animal + '_tend', { x: -8.5, y: -4.8, w: 17, h: 9.6 }, 0.08, 14, pal, 0.55);
      drawMarblingNetwork(ctx, animal + '_tend_m', 0, 0, 7.4, 3.4, pal, 6);

      // Pearlescent silverskin fascia ribbon along top spine
      drawSilverskinSheen(ctx, -6.2, -2.5, -0.4, -3.6, 5.6, -1.8, pal, 1.2);
      drawSilverskinSheen(ctx, -3.2, 1.6, 1.6, 1.2, 6.2, 0.4, pal, 0.75);

      // Freshly sliced cross-section butt face on left end
      const cutGrad = ctx.createRadialGradient(-7.2, 0.2, 0.3, -7.2, 0.8, 3.2);
      cutGrad.addColorStop(0, pal.highlight);
      cutGrad.addColorStop(0.55, pal.primary);
      cutGrad.addColorStop(1, pal.deep);
      ctx.fillStyle = cutGrad;
      ctx.beginPath();
      ctx.ellipse(-7.1, 0.6, 1.85, 3.1, -0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(pal.fat, 0.55);
      ctx.lineWidth = 0.45;
      ctx.stroke();

      // 3 butcher's twine roast loops pinching the tenderloin
      drawButcherTwineBand(ctx, -3.2, -4.9, -2.6, 0.2, -3.4, 4.9);
      drawButcherTwineBand(ctx, 0.8, -4.5, 1.4, 0.2, 0.5, 4.7);
      drawButcherTwineBand(ctx, 4.6, -3.4, 5.1, 0.2, 4.2, 3.6);

      drawWetMeatGloss(ctx, [
        { x: -1.0, y: -2.2, rx: 3.4, ry: 0.85, rot: 0.08, alpha: 0.34 },
        { x: 3.2, y: -1.4, rx: 2.0, ry: 0.65, rot: 0.14, alpha: 0.26 }
      ]);
      ctx.restore();

      // Little twine tie knot on top of middle band
      ctx.strokeStyle = '#e5d6b5';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(0.8, -4.2);
      ctx.lineTo(1.7, -5.0);
      ctx.moveTo(0.8, -4.2);
      ctx.lineTo(0.1, -5.1);
      ctx.stroke();
      return true;
    }

    // ----------------------------------------------------------
    // BRISKET / BELLY LAYERED SLAB (Грудинка слоеная)
    // ----------------------------------------------------------
    case 'brisket_large': {
      drawShadow(ctx, 8.8, 3.1, 7.4, 0.3);

      const drawTopSlab = () => {
        ctx.beginPath();
        ctx.moveTo(-7.8, -3.8);
        ctx.bezierCurveTo(-3.2, -5.6, 3.6, -5.4, 7.6, -3.2);
        ctx.lineTo(8.2, 1.8);
        ctx.bezierCurveTo(3.8, 3.8, -3.4, 3.8, -8.0, 2.2);
        ctx.closePath();
      };

      // Extruded layered 3D front face (alternating meat & fat strata like real brisket/belly)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-8.0, 2.2);
      ctx.bezierCurveTo(-3.4, 3.8, 3.8, 3.8, 8.2, 1.8);
      ctx.lineTo(8.0, 5.2);
      ctx.bezierCurveTo(3.6, 7.2, -3.6, 7.2, -7.8, 5.4);
      ctx.closePath();
      const sideGrad = ctx.createLinearGradient(-8, 2, 8, 6.5);
      sideGrad.addColorStop(0, pal.deep);
      sideGrad.addColorStop(0.5, pal.dark);
      sideGrad.addColorStop(1, pal.deep);
      ctx.fillStyle = sideGrad;
      ctx.fill();

      ctx.clip();
      // Creamy layered fat strata visible on front side-wall
      ctx.strokeStyle = pal.fatShade;
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      ctx.moveTo(-8.2, 3.5);
      ctx.bezierCurveTo(-3.2, 5.0, 3.6, 5.0, 8.2, 3.2);
      ctx.stroke();

      ctx.strokeStyle = pal.fat;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(-8.2, 5.1);
      ctx.bezierCurveTo(-3.2, 6.4, 3.6, 6.4, 8.2, 4.8);
      ctx.stroke();
      ctx.restore();

      // Top cut surface
      const bGrad = ctx.createLinearGradient(-7.5, -5.0, 7.5, 3.5);
      bGrad.addColorStop(0, pal.light);
      bGrad.addColorStop(0.45, pal.primary);
      bGrad.addColorStop(0.85, pal.dark);
      bGrad.addColorStop(1, pal.deep);
      ctx.fillStyle = bGrad;
      drawTopSlab();
      ctx.fill();

      ctx.save();
      drawTopSlab();
      ctx.clip();

      // Thick deckle fat cap ribbon across upper edge
      const capGrad = ctx.createLinearGradient(0, -5.8, 0, -2.0);
      capGrad.addColorStop(0, '#ffffff');
      capGrad.addColorStop(0.55, pal.fatCap);
      capGrad.addColorStop(1, pal.fatShade);
      ctx.fillStyle = capGrad;
      ctx.beginPath();
      ctx.moveTo(-8.4, -4.4);
      ctx.bezierCurveTo(-2.8, -6.2, 3.8, -6.0, 8.2, -3.8);
      ctx.lineTo(8.0, -1.8);
      ctx.bezierCurveTo(3.4, -3.4, -2.8, -3.2, -8.2, -2.0);
      ctx.closePath();
      ctx.fill();

      // Coarse brisket muscle grain & marbling seam
      drawMuscleFibers(ctx, animal + '_brisk', { x: -7.5, y: -2.2, w: 15, h: 5.5 }, -0.1, 11, pal, 0.5);
      drawMarblingNetwork(ctx, animal + '_brisk_m', 0, 0.5, 6.6, 2.4, pal, 10);

      // Intermuscular deckle seam splitting point & flat
      ctx.strokeStyle = pal.fat;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-7.6, 0.2);
      ctx.bezierCurveTo(-2.5, -0.6, 2.8, 0.9, 7.8, -0.3);
      ctx.stroke();

      drawWetMeatGloss(ctx, [
        { x: -2.2, y: -3.2, rx: 3.2, ry: 0.7, rot: -0.08, alpha: 0.35 },
        { x: 2.2, y: 0.6, rx: 2.4, ry: 0.75, rot: 0.06, alpha: 0.28 }
      ]);
      ctx.restore();
      return true;
    }

    // ----------------------------------------------------------
    // RUMP / SIRLOIN ROAST STEAK (Огузок / Стейк)
    // ----------------------------------------------------------
    case 'rump_large': {
      drawShadow(ctx, 8.4, 3.2, 7.6, 0.3);

      const drawRump = () => {
        ctx.beginPath();
        ctx.moveTo(-7.4, -1.6);
        ctx.bezierCurveTo(-6.8, -6.2, 1.4, -7.0, 5.8, -4.2);
        ctx.bezierCurveTo(8.6, -2.2, 8.2, 3.4, 4.4, 5.2);
        ctx.bezierCurveTo(-0.4, 7.2, -7.8, 4.4, -7.4, -1.6);
        ctx.closePath();
      };

      // Thick 3D extruded steak side-wall with fat rim along top-right
      ctx.save();
      ctx.translate(0.3, 1.35);
      ctx.fillStyle = pal.deep;
      drawRump();
      ctx.fill();
      ctx.restore();

      const rGrad = ctx.createRadialGradient(-2.0, -1.8, 0.7, 0.2, 0.2, 8.2);
      rGrad.addColorStop(0, pal.highlight);
      rGrad.addColorStop(0.32, pal.light);
      rGrad.addColorStop(0.68, pal.primary);
      rGrad.addColorStop(1, pal.deep);
      ctx.fillStyle = rGrad;
      drawRump();
      ctx.fill();

      ctx.save();
      drawRump();
      ctx.clip();

      // Thick crescent rump fat-cap along top/right contour (picanha style)
      ctx.strokeStyle = pal.fatCap;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(-6.8, -3.4);
      ctx.bezierCurveTo(-3.2, -6.8, 3.4, -6.4, 7.4, -2.2);
      ctx.bezierCurveTo(8.4, -0.4, 8.0, 2.2, 6.2, 4.0);
      ctx.stroke();

      ctx.strokeStyle = pal.fatShade;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-6.0, -2.4);
      ctx.bezierCurveTo(-2.6, -5.2, 2.8, -5.0, 6.2, -1.4);
      ctx.stroke();

      // Rich grain & heavy prime marbling
      drawMuscleFibers(ctx, animal + '_rump', { x: -6.8, y: -4.2, w: 13.6, h: 9.2 }, 0.32, 12, pal, 0.75);
      drawMarblingNetwork(ctx, animal + '_rump_m', -0.4, 0.5, 5.8, 4.2, pal, 13);

      // Subtle silverskin fascia seam
      drawSilverskinSheen(ctx, -4.6, 2.2, -0.5, 0.8, 3.8, 2.6, pal, 0.78);

      drawWetMeatGloss(ctx, [
        { x: -1.8, y: -1.4, rx: 2.8, ry: 1.0, rot: -0.25, alpha: 0.34 },
        { x: 3.0, y: 1.4, rx: 1.8, ry: 0.7, rot: 0.3, alpha: 0.24 }
      ]);
      ctx.restore();
      return true;
    }

    // ----------------------------------------------------------
    // NECK / CHUCK COLLAR CUT (Шея с шейным позвонком)
    // ----------------------------------------------------------
    case 'neck_medium': {
      drawShadow(ctx, 7.8, 3.0, 7.4, 0.28);

      const drawNeck = () => drawOrganicBlobPath(ctx, 0, -0.2, 7.4, 5.8, 412, 0.11, 14);

      // Extruded 3D side-wall
      ctx.save();
      ctx.translate(0.3, 1.25);
      ctx.fillStyle = pal.deep;
      drawNeck();
      ctx.fill();
      ctx.restore();

      const nGrad = ctx.createRadialGradient(-1.6, -1.6, 0.6, 0, 0, 7.6);
      nGrad.addColorStop(0, pal.light);
      nGrad.addColorStop(0.5, pal.primary);
      nGrad.addColorStop(0.88, pal.dark);
      nGrad.addColorStop(1, pal.deep);
      ctx.fillStyle = nGrad;
      drawNeck();
      ctx.fill();

      ctx.save();
      drawNeck();
      ctx.clip();

      // Complex swirled chuck muscle pockets (darker and brighter lobes separated by fat seams)
      const pocketPositions = [
        { x: -3.6, y: -2.0, rx: 2.8, ry: 2.0, c: pal.light },
        { x: 3.4, y: -1.8, rx: 2.6, ry: 2.1, c: pal.dark },
        { x: -2.6, y: 2.6, rx: 2.7, ry: 1.9, c: pal.dark },
        { x: 3.2, y: 2.2, rx: 2.5, ry: 1.8, c: pal.light }
      ];
      for (const p of pocketPositions) {
        ctx.fillStyle = hexToRgba(p.c, 0.42);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.rx, p.ry, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Intermuscular fat web characteristic of neck/chuck
      ctx.strokeStyle = pal.fat;
      ctx.lineWidth = 0.92;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6.6, -0.4);
      ctx.quadraticCurveTo(-1.2, -1.6, 6.4, -0.2);
      ctx.moveTo(-0.8, -5.2);
      ctx.quadraticCurveTo(0.8, 0.2, -1.2, 5.2);
      ctx.moveTo(0.6, 0.4);
      ctx.quadraticCurveTo(3.4, 1.4, 5.8, 3.2);
      ctx.stroke();

      drawMuscleFibers(ctx, animal + '_neck', { x: -6.5, y: -5.0, w: 13, h: 10 }, -0.45, 11, pal, 0.9);
      drawMarblingNetwork(ctx, animal + '_neck_m', 0, 0, 5.8, 4.4, pal, 11);

      // Central cervical vertebra bone cross-section with wing processes
      ctx.fillStyle = '#edece4';
      ctx.beginPath();
      ctx.ellipse(-0.4, 0.2, 2.5, 1.45, -0.2, 0, Math.PI * 2);
      ctx.fill();
      drawTrabecularBoneCut(ctx, -0.3, 0.2, 1.65, 1.35, -0.2);

      drawWetMeatGloss(ctx, [
        { x: -2.8, y: -2.2, rx: 2.0, ry: 0.75, rot: -0.3, alpha: 0.3 },
        { x: 2.6, y: 1.8, rx: 1.5, ry: 0.65, rot: 0.25, alpha: 0.24 }
      ]);
      ctx.restore();
      return true;
    }

    // ----------------------------------------------------------
    // FRENCH-TRIMMED RIBS RACK (Ребрышки / Каре)
    // ----------------------------------------------------------
    case 'ribs_medium': {
      drawShadow(ctx, 8.8, 3.0, 7.6, 0.3);

      // 5 clean French-trimmed curved rib bones rising out of top arch
      const ribOffsets = [-5.8, -3.0, -0.2, 2.6, 5.4];
      for (let i = 0; i < ribOffsets.length; i++) {
        const bx = ribOffsets[i];
        const arch = Math.abs(i - 2) * 0.48;
        ctx.save();
        ctx.translate(bx, -2.0 + arch);
        ctx.rotate((i - 2) * 0.08);

        // Rib shaft shadow
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.roundRect(-0.78, -5.4, 1.68, 7.2, 0.65);
        ctx.fill();

        // Ivory rib bone cylinder
        const bGrad = ctx.createLinearGradient(-0.75, 0, 0.75, 0);
        bGrad.addColorStop(0, '#cbd5e1');
        bGrad.addColorStop(0.35, '#ffffff');
        bGrad.addColorStop(0.75, '#f5f2e8');
        bGrad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.roundRect(-0.75, -5.5, 1.5, 7.1, 0.6);
        ctx.fill();

        // Cut marrow tip on top of each bone
        drawTrabecularBoneCut(ctx, 0, -5.2, 0.72, 0.44, 0);
        ctx.restore();
      }

      // Plump curved rib-rack meat block uniting all 5 ribs
      const drawMeatArch = () => {
        ctx.beginPath();
        ctx.moveTo(-8.2, -1.6);
        ctx.bezierCurveTo(-4.0, -3.4, 4.0, -3.4, 8.2, -1.6);
        ctx.lineTo(8.5, 4.0);
        ctx.bezierCurveTo(3.8, 6.2, -3.8, 6.2, -8.5, 4.0);
        ctx.closePath();
      };

      // Extruded 3D bottom wall
      ctx.save();
      ctx.translate(0.2, 1.15);
      ctx.fillStyle = pal.deep;
      drawMeatArch();
      ctx.fill();
      ctx.restore();

      const meatGrad = ctx.createLinearGradient(0, -3.2, 0, 6.0);
      meatGrad.addColorStop(0, pal.highlight);
      meatGrad.addColorStop(0.28, pal.light);
      meatGrad.addColorStop(0.65, pal.primary);
      meatGrad.addColorStop(1, pal.deep);
      ctx.fillStyle = meatGrad;
      drawMeatArch();
      ctx.fill();

      ctx.save();
      drawMeatArch();
      ctx.clip();

      // Sculpted scalloped valleys between each rib bone
      for (let i = 0; i < ribOffsets.length - 1; i++) {
        const vx = (ribOffsets[i] + ribOffsets[i + 1]) * 0.5;
        const vGrad = ctx.createLinearGradient(vx - 0.9, 0, vx + 0.9, 0);
        vGrad.addColorStop(0, 'rgba(40, 6, 10, 0)');
        vGrad.addColorStop(0.5, hexToRgba(pal.deep, 0.52));
        vGrad.addColorStop(1, 'rgba(40, 6, 10, 0)');
        ctx.fillStyle = vGrad;
        ctx.fillRect(vx - 0.9, -3.6, 1.8, 9.8);
      }

      // Creamy intercostal fat rim along bottom
      ctx.strokeStyle = pal.fatCap;
      ctx.lineWidth = 1.65;
      ctx.beginPath();
      ctx.moveTo(-8.4, 3.6);
      ctx.bezierCurveTo(-3.6, 5.6, 3.6, 5.6, 8.4, 3.6);
      ctx.stroke();

      drawMuscleFibers(ctx, animal + '_ribs', { x: -8.0, y: -2.8, w: 16, h: 7.8 }, 0.04, 10, pal, 0.45);
      drawMarblingNetwork(ctx, animal + '_ribs_m', 0, 1.2, 7.2, 3.0, pal, 10);

      // Pearlescent rib membrane sheen
      drawSilverskinSheen(ctx, -6.6, -1.2, 0, -2.2, 6.6, -1.2, pal, 0.85);

      // Wet highlight atop each rib mound
      drawWetMeatGloss(
        ctx,
        ribOffsets.map((rx) => ({ x: rx - 0.2, y: 0.4, rx: 1.0, ry: 1.4, rot: 0, alpha: 0.25 }))
      );
      ctx.restore();
      return true;
    }

    // ----------------------------------------------------------
    // DICED STEW SCRAPS / GOULASH CUBES (Мясная обрезь / Гуляш)
    // ----------------------------------------------------------
    case 'scraps_small': {
      drawShadow(ctx, 8.0, 2.8, 7.4, 0.28);

      const chunks = [
        { x: -3.8, y: -2.2, rx: 3.1, ry: 2.3, rot: -0.35, seed: 11, fatCorner: true },
        { x: 2.6, y: -2.4, rx: 2.9, ry: 2.1, rot: 0.42, seed: 22, fatCorner: false },
        { x: -4.4, y: 2.2, rx: 2.8, ry: 2.1, rot: 0.28, seed: 33, fatCorner: false },
        { x: 3.6, y: 2.0, rx: 3.0, ry: 2.2, rot: -0.28, seed: 44, fatCorner: true },
        { x: 0.1, y: 0.2, rx: 3.4, ry: 2.5, rot: 0.12, seed: 55, fatCorner: true },
        { x: -0.6, y: 3.6, rx: 2.5, ry: 1.8, rot: -0.18, seed: 66, fatCorner: false }
      ];

      for (const c of chunks) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);

        const drawCube = () => drawOrganicBlobPath(ctx, 0, 0, c.rx, c.ry, c.seed, 0.14, 8);

        // 3D cube depth underside
        ctx.save();
        ctx.translate(0.22, 0.72);
        ctx.fillStyle = pal.deep;
        drawCube();
        ctx.fill();
        ctx.restore();

        // Top cut face
        const cg = ctx.createRadialGradient(-c.rx * 0.3, -c.ry * 0.3, 0.2, 0, 0, c.rx * 1.15);
        cg.addColorStop(0, pal.highlight);
        cg.addColorStop(0.4, pal.light);
        cg.addColorStop(0.75, pal.primary);
        cg.addColorStop(1, pal.deep);
        ctx.fillStyle = cg;
        drawCube();
        ctx.fill();

        ctx.save();
        drawCube();
        ctx.clip();

        if (c.fatCorner) {
          ctx.fillStyle = pal.fatCap;
          ctx.beginPath();
          ctx.ellipse(c.rx * 0.65, -c.ry * 0.45, c.rx * 0.45, c.ry * 0.65, 0.35, 0, Math.PI * 2);
          ctx.fill();
        }

        // Mini grain striations
        ctx.strokeStyle = hexToRgba(pal.deep, 0.42);
        ctx.lineWidth = 0.34;
        for (let l = -1; l <= 1; l++) {
          ctx.beginPath();
          ctx.moveTo(-c.rx, l * 0.85);
          ctx.lineTo(c.rx, l * 0.85 + 0.4);
          ctx.stroke();
        }

        // Tiny marbling vein
        ctx.strokeStyle = hexToRgba(pal.fat, 0.65);
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(-c.rx * 0.45, -c.ry * 0.25);
        ctx.quadraticCurveTo(0, c.ry * 0.2, c.rx * 0.4, -c.ry * 0.15);
        ctx.stroke();

        // Juicy specular spot
        ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
        ctx.beginPath();
        ctx.ellipse(-c.rx * 0.28, -c.ry * 0.3, c.rx * 0.32, c.ry * 0.18, -0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        ctx.restore();
      }
      return true;
    }

    // ----------------------------------------------------------
    // LIVER (Печень — глянцевая двухдолевая)
    // ----------------------------------------------------------
    case 'liver': {
      drawShadow(ctx, 8.6, 3.0, 7.6, 0.3);

      const base = pal.organTint;
      const hi = adjustHex(base, 0.45);
      const deep = adjustHex(base, -0.42);

      // Left tucked accessory lobe
      const drawLeftLobe = () => {
        ctx.beginPath();
        ctx.moveTo(-8.4, 0.4);
        ctx.bezierCurveTo(-8.8, -3.4, -4.6, -5.8, -1.0, -4.4);
        ctx.bezierCurveTo(0.2, -1.8, -0.4, 2.2, -2.4, 4.6);
        ctx.bezierCurveTo(-5.8, 5.6, -8.2, 3.4, -8.4, 0.4);
        ctx.closePath();
      };

      // Larger sculpted right lobe overlapping slightly
      const drawRightLobe = () => {
        ctx.beginPath();
        ctx.moveTo(-2.4, -4.2);
        ctx.bezierCurveTo(1.8, -6.8, 7.8, -5.0, 8.6, -0.6);
        ctx.bezierCurveTo(9.2, 3.6, 4.8, 6.6, -0.2, 5.4);
        ctx.bezierCurveTo(-2.6, 4.6, -3.2, -0.8, -2.4, -4.2);
        ctx.closePath();
      };

      // Left lobe depth & smooth glossy fill
      ctx.save();
      ctx.translate(0.2, 0.85);
      ctx.fillStyle = deep;
      drawLeftLobe();
      ctx.fill();
      ctx.restore();

      const lGrad = ctx.createRadialGradient(-5.2, -2.2, 0.4, -4.4, 0.2, 5.4);
      lGrad.addColorStop(0, hi);
      lGrad.addColorStop(0.5, base);
      lGrad.addColorStop(1, deep);
      ctx.fillStyle = lGrad;
      drawLeftLobe();
      ctx.fill();

      // Right lobe drop shadow onto left lobe
      ctx.save();
      ctx.translate(-0.5, 0.75);
      ctx.fillStyle = 'rgba(24, 3, 8, 0.48)';
      drawRightLobe();
      ctx.fill();
      ctx.restore();

      // Right lobe glossy mahogany dome
      const rGrad = ctx.createRadialGradient(1.4, -2.4, 0.5, 2.6, 0.2, 6.8);
      rGrad.addColorStop(0, adjustHex(hi, 0.14));
      rGrad.addColorStop(0.35, base);
      rGrad.addColorStop(0.8, adjustHex(base, -0.22));
      rGrad.addColorStop(1, deep);
      ctx.fillStyle = rGrad;
      drawRightLobe();
      ctx.fill();

      // Falciform connective ligament seam between lobes
      drawSilverskinSheen(ctx, -2.0, -4.0, -2.4, 0.2, -1.4, 4.4, pal, 0.75);

      // Taut Glisson's capsule smooth broad specular highlights
      drawWetMeatGloss(ctx, [
        { x: 2.2, y: -2.4, rx: 3.2, ry: 1.15, rot: -0.22, alpha: 0.48 },
        { x: -5.2, y: -1.8, rx: 1.9, ry: 0.75, rot: -0.38, alpha: 0.4 },
        { x: 5.0, y: 0.6, rx: 1.1, ry: 0.45, rot: 0.4, alpha: 0.22 }
      ]);
      return true;
    }

    // ----------------------------------------------------------
    // HEART (Сердце — с аортой и коронарным жиром)
    // ----------------------------------------------------------
    case 'heart': {
      drawShadow(ctx, 7.2, 3.0, 8.6, 0.3);

      // Severed arterial stubs (aorta & pulmonary trunk) at top crown
      const drawVessel = (x: number, y: number, w: number, h: number, rot: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        const vg = ctx.createLinearGradient(-w, 0, w, 0);
        vg.addColorStop(0, '#c89b9d');
        vg.addColorStop(0.5, '#f5dfdf');
        vg.addColorStop(1, '#9d666b');
        ctx.fillStyle = vg;
        ctx.beginPath();
        ctx.roundRect(-w, -h, w * 2, h * 1.4, 0.5);
        ctx.fill();
        // Open lumen
        ctx.fillStyle = '#4a0c14';
        ctx.beginPath();
        ctx.ellipse(0, -h, w * 0.78, w * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      drawVessel(-1.6, -5.2, 1.35, 2.2, -0.22);
      drawVessel(1.6, -5.0, 1.15, 1.9, 0.24);

      // Muscular conical heart silhouette
      const drawHeart = () => {
        ctx.beginPath();
        ctx.moveTo(-5.8, -3.4);
        ctx.bezierCurveTo(-6.6, 1.8, -2.4, 6.8, 0.8, 7.6);
        ctx.bezierCurveTo(4.2, 6.8, 6.6, 1.6, 5.6, -3.6);
        ctx.bezierCurveTo(3.8, -6.2, -3.8, -6.2, -5.8, -3.4);
        ctx.closePath();
      };

      // Extruded side shadow
      ctx.save();
      ctx.translate(0.35, 0.85);
      ctx.fillStyle = pal.deep;
      drawHeart();
      ctx.fill();
      ctx.restore();

      const hGrad = ctx.createRadialGradient(-2.0, -1.8, 0.5, 0.4, 0.8, 7.8);
      hGrad.addColorStop(0, pal.light);
      hGrad.addColorStop(0.42, pal.primary);
      hGrad.addColorStop(0.82, pal.dark);
      hGrad.addColorStop(1, pal.deep);
      ctx.fillStyle = hGrad;
      drawHeart();
      ctx.fill();

      ctx.save();
      drawHeart();
      ctx.clip();

      // Waxy yellow-cream coronary epicardial fat band around upper crown
      const fatGrad = ctx.createLinearGradient(-5, -5.5, 5, -1.5);
      fatGrad.addColorStop(0, pal.fatShade);
      fatGrad.addColorStop(0.45, pal.fatCap);
      fatGrad.addColorStop(1, pal.fatShade);
      ctx.fillStyle = fatGrad;
      ctx.beginPath();
      ctx.moveTo(-6.4, -4.6);
      ctx.bezierCurveTo(-2.0, -3.2, 2.2, -3.0, 6.2, -4.4);
      ctx.lineTo(6.0, -1.4);
      ctx.bezierCurveTo(2.0, -0.6, -2.0, -1.0, -6.2, -2.0);
      ctx.closePath();
      ctx.fill();

      // Interventricular groove (sulcus) running diagonally down to apex with fat + fine vessels
      ctx.strokeStyle = hexToRgba(pal.fatCap, 0.72);
      ctx.lineWidth = 1.25;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-1.0, -2.2);
      ctx.bezierCurveTo(0.4, 1.0, 1.2, 4.2, 0.8, 7.2);
      ctx.stroke();

      ctx.strokeStyle = hexToRgba(pal.deep, 0.78);
      ctx.lineWidth = 0.42;
      ctx.beginPath();
      ctx.moveTo(-1.0, -2.2);
      ctx.bezierCurveTo(0.4, 1.0, 1.2, 4.2, 0.8, 7.2);
      ctx.moveTo(0.2, 0.6);
      ctx.quadraticCurveTo(-2.2, 1.8, -3.6, 2.8);
      ctx.moveTo(0.6, 2.4);
      ctx.quadraticCurveTo(2.8, 3.0, 4.0, 3.8);
      ctx.stroke();

      // Fine dense cardiac muscle specular dome
      drawWetMeatGloss(ctx, [
        { x: -2.4, y: 0.4, rx: 1.8, ry: 2.4, rot: -0.2, alpha: 0.34 },
        { x: 2.6, y: 0.8, rx: 1.2, ry: 1.8, rot: 0.18, alpha: 0.22 }
      ]);
      ctx.restore();
      return true;
    }

    // ----------------------------------------------------------
    // KIDNEY (Почка — дольчатая с жировой выемкой)
    // ----------------------------------------------------------
    case 'kidney': {
      drawShadow(ctx, 7.8, 2.8, 6.8, 0.28);

      const base = mixHex(pal.organTint, pal.primary, 0.35);
      const hi = adjustHex(base, 0.42);
      const deep = adjustHex(base, -0.42);

      // Bean-shaped reniform silhouette
      const drawKidney = () => {
        ctx.beginPath();
        ctx.moveTo(-6.8, -0.4);
        ctx.bezierCurveTo(-7.2, -5.6, 0.2, -6.4, 4.6, -4.6);
        ctx.bezierCurveTo(8.2, -3.0, 8.2, 3.4, 4.4, 5.0);
        ctx.bezierCurveTo(0.4, 6.6, -5.8, 5.2, -6.8, 1.2);
        ctx.bezierCurveTo(-4.0, 1.6, -2.6, -0.8, -6.8, -0.4);
        ctx.closePath();
      };

      // Pale perirenal fat pad tucked inside the concave hilum notch
      drawLitEllipse(ctx, -4.6, 0.4, 2.3, 1.5, 0.12, '#ffffff', pal.fatCap, pal.fatShade, undefined, 0.3);

      // Extruded thickness
      ctx.save();
      ctx.translate(0.25, 0.9);
      ctx.fillStyle = deep;
      drawKidney();
      ctx.fill();
      ctx.restore();

      const kGrad = ctx.createRadialGradient(0.4, -2.0, 0.5, 1.0, 0.2, 7.2);
      kGrad.addColorStop(0, hi);
      kGrad.addColorStop(0.48, base);
      kGrad.addColorStop(1, deep);
      ctx.fillStyle = kGrad;
      drawKidney();
      ctx.fill();

      ctx.save();
      drawKidney();
      ctx.clip();

      // Lobular renal clefts (especially pronounced on beef, softer on pork/mutton)
      const cleftAlpha = animal === 'beef' ? 0.55 : 0.28;
      ctx.strokeStyle = hexToRgba(deep, cleftAlpha);
      ctx.lineWidth = 0.72;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-2.6, -4.6);
      ctx.quadraticCurveTo(-1.0, -1.6, -2.2, 0.8);
      ctx.moveTo(1.8, -5.0);
      ctx.quadraticCurveTo(0.8, -1.2, 2.4, 2.0);
      ctx.moveTo(4.8, -3.2);
      ctx.quadraticCurveTo(3.6, 0.4, 5.2, 3.6);
      ctx.moveTo(-1.8, 1.8);
      ctx.quadraticCurveTo(0.4, 2.8, 2.0, 4.8);
      ctx.stroke();

      // Glossy renal capsule highlights on each lobule
      drawWetMeatGloss(ctx, [
        { x: -0.4, y: -2.4, rx: 2.2, ry: 0.9, rot: -0.25, alpha: 0.44 },
        { x: 3.6, y: -1.6, rx: 1.6, ry: 0.75, rot: 0.15, alpha: 0.36 },
        { x: 1.8, y: 2.4, rx: 1.4, ry: 0.65, rot: -0.1, alpha: 0.26 }
      ]);
      ctx.restore();
      return true;
    }

    // ----------------------------------------------------------
    // BRAIN (Мозги — две полусферы с объемными извилинами)
    // ----------------------------------------------------------
    case 'brain': {
      drawShadow(ctx, 8.0, 3.0, 7.2, 0.28);

      const drawBrainPath = () => {
        ctx.beginPath();
        ctx.moveTo(0, -5.6);
        ctx.bezierCurveTo(-4.8, -6.2, -7.8, -2.8, -7.4, 1.4);
        ctx.bezierCurveTo(-7.0, 5.4, -3.0, 6.4, 0, 5.2);
        ctx.bezierCurveTo(3.0, 6.4, 7.0, 5.4, 7.4, 1.4);
        ctx.bezierCurveTo(7.8, -2.8, 4.8, -6.2, 0, -5.6);
        ctx.closePath();
      };

      // Extruded soft pink-grey base
      ctx.save();
      ctx.translate(0.2, 0.9);
      ctx.fillStyle = '#9c6872';
      drawBrainPath();
      ctx.fill();
      ctx.restore();

      const bGrad = ctx.createRadialGradient(-1.6, -2.2, 0.8, 0, 0.2, 7.8);
      bGrad.addColorStop(0, '#fff4f5');
      bGrad.addColorStop(0.45, '#f2cdd2');
      bGrad.addColorStop(0.82, '#d59ea7');
      bGrad.addColorStop(1, '#9c6570');
      ctx.fillStyle = bGrad;
      drawBrainPath();
      ctx.fill();

      ctx.save();
      drawBrainPath();
      ctx.clip();

      // Sculpted cortical gyri/sulci coils across left and right hemispheres
      const gyri: Array<Array<[number, number]>> = [
        [[-5.8, -2.6], [-4.2, -4.0], [-2.2, -3.2], [-1.2, -4.4]],
        [[-6.4, 0.2], [-4.4, -1.2], [-2.8, 0.4], [-1.2, -1.2]],
        [[-5.6, 3.2], [-3.8, 1.8], [-2.2, 3.4], [-1.0, 2.0]],
        [[5.8, -2.6], [4.2, -4.0], [2.2, -3.2], [1.2, -4.4]],
        [[6.4, 0.2], [4.4, -1.2], [2.8, 0.4], [1.2, -1.2]],
        [[5.6, 3.2], [3.8, 1.8], [2.2, 3.4], [1.0, 2.0]]
      ];

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const g of gyri) {
        // Dark sulcus groove shadow
        ctx.strokeStyle = 'rgba(125, 58, 72, 0.62)';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(g[0][0], g[0][1] + 0.35);
        for (let i = 1; i < g.length; i++) {
          ctx.lineTo(g[i][0], g[i][1] + 0.35);
        }
        ctx.stroke();

        // Raised gyrus cream-pink ridge
        ctx.strokeStyle = '#fbe4e7';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(g[0][0], g[0][1]);
        for (let i = 1; i < g.length; i++) {
          ctx.lineTo(g[i][0], g[i][1]);
        }
        ctx.stroke();

        // Faint crimson capillary line tucked in sulcus
        ctx.strokeStyle = 'rgba(185, 28, 28, 0.32)';
        ctx.lineWidth = 0.25;
        ctx.beginPath();
        ctx.moveTo(g[0][0], g[0][1] + 0.42);
        for (let i = 1; i < g.length; i++) {
          ctx.lineTo(g[i][0], g[i][1] + 0.42);
        }
        ctx.stroke();
      }

      // Central longitudinal fissure separating hemispheres
      ctx.strokeStyle = 'rgba(105, 42, 56, 0.72)';
      ctx.lineWidth = 1.05;
      ctx.beginPath();
      ctx.moveTo(0, -5.6);
      ctx.lineTo(0, 5.2);
      ctx.stroke();

      drawWetMeatGloss(ctx, [
        { x: -3.2, y: -2.0, rx: 1.8, ry: 0.9, rot: -0.35, alpha: 0.42 },
        { x: 3.0, y: -2.0, rx: 1.8, ry: 0.9, rot: 0.35, alpha: 0.36 }
      ]);
      ctx.restore();
      return true;
    }

    // ----------------------------------------------------------
    // TONGUE (Язык — мышечный корень и бархатистый кончик)
    // ----------------------------------------------------------
    case 'tongue': {
      drawShadow(ctx, 9.0, 2.8, 6.0, 0.28);

      const drawTongue = () => {
        ctx.beginPath();
        ctx.moveTo(-8.8, -1.6);
        ctx.bezierCurveTo(-8.2, -5.2, -2.4, -5.2, 2.4, -3.2);
        ctx.bezierCurveTo(6.6, -1.8, 9.4, -0.4, 9.0, 1.4);
        ctx.bezierCurveTo(8.6, 3.2, 4.8, 3.8, 0.8, 3.8);
        ctx.bezierCurveTo(-4.4, 4.0, -9.2, 2.4, -8.8, -1.6);
        ctx.closePath();
      };

      // Extruded underside
      ctx.save();
      ctx.translate(0.25, 0.95);
      ctx.fillStyle = pal.deep;
      drawTongue();
      ctx.fill();
      ctx.restore();

      const tBase = mixHex(pal.light, '#e8a2a8', 0.45);
      const tGrad = ctx.createLinearGradient(-8.5, -4.5, 8.8, 3.5);
      tGrad.addColorStop(0, pal.primary);
      tGrad.addColorStop(0.28, tBase);
      tGrad.addColorStop(0.65, '#f2bcc3');
      tGrad.addColorStop(1, '#c97885');
      ctx.fillStyle = tGrad;
      drawTongue();
      ctx.fill();

      ctx.save();
      drawTongue();
      ctx.clip();

      // Raw sliced muscular root on left end
      const rootGrad = ctx.createRadialGradient(-7.2, -0.4, 0.3, -7.0, 0, 3.4);
      rootGrad.addColorStop(0, pal.light);
      rootGrad.addColorStop(0.55, pal.primary);
      rootGrad.addColorStop(1, pal.deep);
      ctx.fillStyle = rootGrad;
      ctx.beginPath();
      ctx.ellipse(-6.8, -0.4, 2.6, 3.5, -0.15, 0, Math.PI * 2);
      ctx.fill();

      // Hyoid fat band along root border
      ctx.strokeStyle = pal.fatCap;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-4.6, -3.8);
      ctx.quadraticCurveTo(-3.6, -0.2, -4.8, 3.6);
      ctx.stroke();

      // Dorsal median groove running toward tip
      ctx.strokeStyle = 'rgba(130, 42, 58, 0.42)';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(-3.6, -0.8);
      ctx.quadraticCurveTo(2.4, -0.4, 7.6, 0.9);
      ctx.stroke();

      // Fine velvety papillae stippling on dorsal surface
      for (let i = 0; i < 24; i++) {
        const px = -2.8 + hash01(animal + '_tpx', i) * 10.2;
        const py = -2.6 + hash01(animal + '_tpy', i) * 4.8;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 240, 244, 0.42)' : 'rgba(148, 52, 70, 0.28)';
        ctx.beginPath();
        ctx.arc(px, py, 0.22, 0, Math.PI * 2);
        ctx.fill();
      }

      drawWetMeatGloss(ctx, [
        { x: 1.4, y: -1.6, rx: 3.4, ry: 0.72, rot: 0.14, alpha: 0.34 },
        { x: 6.2, y: 0.2, rx: 1.5, ry: 0.45, rot: 0.18, alpha: 0.3 }
      ]);
      ctx.restore();
      return true;
    }

    // ----------------------------------------------------------
    // HONEYCOMB TRIPE (Рубец — рельефные соты)
    // ----------------------------------------------------------
    case 'tripe': {
      drawShadow(ctx, 8.4, 2.9, 7.2, 0.26);

      const drawSheet = () => {
        ctx.beginPath();
        ctx.moveTo(-7.6, -3.2);
        ctx.bezierCurveTo(-3.2, -5.8, 3.8, -5.2, 7.8, -2.4);
        ctx.bezierCurveTo(8.4, 1.4, 6.2, 5.2, 1.8, 5.6);
        ctx.bezierCurveTo(-3.2, 6.0, -7.8, 4.2, -8.0, 0.4);
        ctx.closePath();
      };

      // Folded bottom thickness flap
      ctx.save();
      ctx.translate(0.3, 1.1);
      ctx.fillStyle = '#a89a82';
      drawSheet();
      ctx.fill();
      ctx.restore();

      const tripeGrad = ctx.createRadialGradient(-2.0, -2.0, 0.8, 0, 0.4, 8.6);
      tripeGrad.addColorStop(0, '#fffdf5');
      tripeGrad.addColorStop(0.55, '#ede4d0');
      tripeGrad.addColorStop(1, '#c5b79c');
      ctx.fillStyle = tripeGrad;
      drawSheet();
      ctx.fill();

      ctx.save();
      drawSheet();
      ctx.clip();

      // 3D Sculpted honeycomb reticulum cells
      const cellR = 1.42;
      const dx = cellR * 1.72;
      const dy = cellR * 1.48;
      for (let row = -4; row <= 4; row++) {
        for (let col = -4; col <= 4; col++) {
          const cx = col * dx + (row % 2 === 0 ? 0 : dx * 0.5);
          const cy = row * dy;

          // Recessed warm ochre cell pocket
          const cGrad = ctx.createRadialGradient(cx + 0.25, cy + 0.25, 0.1, cx, cy, cellR * 0.95);
          cGrad.addColorStop(0, '#b59d78');
          cGrad.addColorStop(0.65, '#cbb996');
          cGrad.addColorStop(1, '#ede4d0');
          ctx.fillStyle = cGrad;

          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
            const vx = cx + Math.cos(a) * cellR * 0.86;
            const vy = cy + Math.sin(a) * cellR * 0.86;
            if (k === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
          }
          ctx.closePath();
          ctx.fill();

          // Raised ivory honeycomb wall ridge
          ctx.strokeStyle = '#faf6eb';
          ctx.lineWidth = 0.42;
          ctx.stroke();
        }
      }

      // Soft fold shadow wave across the sheet
      const foldGrad = ctx.createLinearGradient(-4, -5, 4, 5);
      foldGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
      foldGrad.addColorStop(0.45, 'rgba(110, 92, 68, 0.16)');
      foldGrad.addColorStop(0.75, 'rgba(255, 255, 255, 0.18)');
      foldGrad.addColorStop(1, 'rgba(90, 74, 52, 0.22)');
      ctx.fillStyle = foldGrad;
      ctx.fillRect(-9, -7, 18, 14);
      ctx.restore();
      return true;
    }

    // ----------------------------------------------------------
    // COILED INTESTINES / NATURAL CASING (Кишки / Черева)
    // ----------------------------------------------------------
    case 'intestines': {
      drawShadow(ctx, 8.2, 3.0, 7.6, 0.28);

      // Draw stacked 3D glossy translucent coils from back to front
      const coils: Array<{ x0: number; y0: number; c1x: number; c1y: number; c2x: number; c2y: number; x1: number; y1: number }> = [
        { x0: -6.4, y0: -2.8, c1x: -3.2, c1y: -6.4, c2x: 3.4, c2y: -6.2, x1: 6.6, y1: -2.2 },
        { x0: 6.6, y0: -2.2, c1x: 7.8, c1y: 1.4, c2x: 3.6, c2y: 4.8, x1: -2.6, y1: 4.4 },
        { x0: -5.8, y0: 1.8, c1x: -8.0, c1y: -1.4, c2x: -3.8, c2y: -3.8, x1: 1.8, y1: -2.8 },
        { x0: 1.8, y0: -2.8, c1x: 6.2, c1y: -1.6, c2x: 5.4, c2y: 2.8, x1: 0.4, y1: 2.2 },
        { x0: 0.4, y0: 2.2, c1x: -4.2, c1y: 1.6, c2x: -4.6, c2y: 5.2, x1: 2.8, y1: 5.4 }
      ];

      ctx.lineCap = 'round';
      for (const c of coils) {
        // Deep ambient occlusion shadow under each coil
        ctx.strokeStyle = 'rgba(110, 56, 66, 0.55)';
        ctx.lineWidth = 3.1;
        ctx.beginPath();
        ctx.moveTo(c.x0, c.y0 + 0.55);
        ctx.bezierCurveTo(c.c1x, c.c1y + 0.55, c.c2x, c.c2y + 0.55, c.x1, c.y1 + 0.55);
        ctx.stroke();

        // Outer shaded casing body
        ctx.strokeStyle = '#cfa0a8';
        ctx.lineWidth = 2.65;
        ctx.beginPath();
        ctx.moveTo(c.x0, c.y0);
        ctx.bezierCurveTo(c.c1x, c.c1y, c.c2x, c.c2y, c.x1, c.y1);
        ctx.stroke();

        // Warm pearlescent pink-cream midtone
        ctx.strokeStyle = '#f5d6db';
        ctx.lineWidth = 1.9;
        ctx.beginPath();
        ctx.moveTo(c.x0, c.y0 - 0.12);
        ctx.bezierCurveTo(c.c1x, c.c1y - 0.12, c.c2x, c.c2y - 0.12, c.x1, c.y1 - 0.12);
        ctx.stroke();

        // Wet translucent specular filament along top of tube
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.lineWidth = 0.58;
        ctx.beginPath();
        ctx.moveTo(c.x0, c.y0 - 0.55);
        ctx.bezierCurveTo(c.c1x, c.c1y - 0.55, c.c2x, c.c2y - 0.55, c.x1, c.y1 - 0.55);
        ctx.stroke();
      }
      return true;
    }

    // ----------------------------------------------------------
    // MARROW BONES (Мозговые косточки — продольный и поперечный срез)
    // ----------------------------------------------------------
    case 'bone_marrow': {
      drawShadow(ctx, 8.6, 2.9, 6.8, 0.28);

      // Back canoe-cut lengthwise femur half cradling rich golden-pink marrow
      ctx.save();
      ctx.translate(-0.6, -1.6);
      ctx.rotate(-0.18);

      // Outer ivory bone cradle
      const canoeGrad = ctx.createLinearGradient(0, -2.6, 0, 2.8);
      canoeGrad.addColorStop(0, '#ffffff');
      canoeGrad.addColorStop(0.5, '#f2efe6');
      canoeGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = canoeGrad;
      ctx.beginPath();
      ctx.roundRect(-7.6, -2.5, 14.8, 5.0, 2.1);
      ctx.fill();

      // Inner luscious marrow trough
      const mGrad = ctx.createLinearGradient(-6.2, -1.2, 6.0, 1.4);
      mGrad.addColorStop(0, '#f3b778');
      mGrad.addColorStop(0.35, '#fae0b0');
      mGrad.addColorStop(0.7, '#e28b6b');
      mGrad.addColorStop(1, '#b8423c');
      ctx.fillStyle = mGrad;
      ctx.beginPath();
      ctx.roundRect(-6.2, -1.35, 12.0, 2.7, 1.2);
      ctx.fill();

      // Red vascular marrow flecks & buttery gloss
      ctx.fillStyle = 'rgba(153, 27, 27, 0.35)';
      for (const mx of [-4.2, -1.0, 2.4, 4.2]) {
        ctx.beginPath();
        ctx.ellipse(mx, 0.1, 0.9, 0.45, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.46)';
      ctx.beginPath();
      ctx.ellipse(-1.4, -0.55, 3.8, 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Foreground upright cross-cut osso-buco style marrow bone ring
      ctx.save();
      ctx.translate(3.4, 2.4);
      // Cylindrical shaft body
      const cylGrad = ctx.createLinearGradient(-3.6, 0, 3.6, 0);
      cylGrad.addColorStop(0, '#cbd5e1');
      cylGrad.addColorStop(0.32, '#ffffff');
      cylGrad.addColorStop(0.72, '#e6e2d6');
      cylGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = cylGrad;
      ctx.beginPath();
      ctx.moveTo(-3.4, -0.4);
      ctx.lineTo(-3.2, 2.8);
      ctx.ellipse(0, 2.8, 3.2, 1.75, 0, Math.PI, 0, true);
      ctx.lineTo(3.4, -0.4);
      ctx.closePath();
      ctx.fill();

      // Clinging raw meat trim along outer bone edge
      ctx.fillStyle = pal.primary;
      ctx.beginPath();
      ctx.ellipse(3.1, 1.5, 0.9, 1.4, 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Top cut trabecular marrow face
      drawTrabecularBoneCut(ctx, 0, -0.4, 3.4, 2.05, 0, true);
      ctx.restore();
      return true;
    }

    // ----------------------------------------------------------
    // ARTICULATED SOUP BONE (Суповая сахарная кость)
    // ----------------------------------------------------------
    case 'bone_soup': {
      drawShadow(ctx, 9.2, 2.8, 6.2, 0.28);

      ctx.save();
      ctx.rotate(-0.22);

      // Left femoral knuckle condyles
      drawLitSphere(ctx, -6.8, -1.6, 2.35, '#ffffff', '#f2efe6', '#94a3b8', undefined, 0.35);
      drawLitSphere(ctx, -6.5, 1.6, 2.25, '#ffffff', '#eae6da', '#94a3b8', undefined, 0.3);

      // Right distal knuckle condyles
      drawLitSphere(ctx, 6.8, -1.5, 2.25, '#ffffff', '#f2efe6', '#94a3b8', undefined, 0.35);
      drawLitSphere(ctx, 6.5, 1.5, 2.15, '#ffffff', '#eae6da', '#94a3b8', undefined, 0.3);

      // Long ivory femur shaft connecting knuckles
      const shaftGrad = ctx.createLinearGradient(0, -2.2, 0, 2.4);
      shaftGrad.addColorStop(0, '#ffffff');
      shaftGrad.addColorStop(0.35, '#f6f3ea');
      shaftGrad.addColorStop(0.75, '#d6d2c4');
      shaftGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = shaftGrad;
      ctx.beginPath();
      ctx.moveTo(-6.2, -1.8);
      ctx.quadraticCurveTo(0, -1.2, 6.2, -1.7);
      ctx.lineTo(6.2, 1.7);
      ctx.quadraticCurveTo(0, 1.2, -6.2, 1.8);
      ctx.closePath();
      ctx.fill();

      // Butcher's cleaver notch revealing red trabecular marrow in mid-shaft
      drawTrabecularBoneCut(ctx, -0.2, -0.1, 1.55, 0.95, 0.15);

      // Clinging meat & tendon scraps along shaft & left joint
      const scrapGrad = ctx.createRadialGradient(-3.6, 0.8, 0.2, -3.2, 1.2, 2.6);
      scrapGrad.addColorStop(0, pal.light);
      scrapGrad.addColorStop(0.6, pal.primary);
      scrapGrad.addColorStop(1, pal.deep);
      ctx.fillStyle = scrapGrad;
      ctx.beginPath();
      ctx.moveTo(-5.2, 0.6);
      ctx.bezierCurveTo(-4.0, -0.2, -2.0, 0.6, -1.4, 2.1);
      ctx.bezierCurveTo(-2.6, 3.0, -5.0, 2.6, -5.2, 0.6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = pal.primary;
      ctx.beginPath();
      ctx.ellipse(3.6, -1.3, 1.7, 0.75, -0.2, 0, Math.PI * 2);
      ctx.fill();

      drawSilverskinSheen(ctx, -4.6, 0.8, -3.0, 1.1, -1.8, 1.9, pal, 0.55);
      ctx.restore();
      return true;
    }

    // ----------------------------------------------------------
    // TALLOW / SUET / LARD BLOCK (Сало / Топленый жир-сырец)
    // ----------------------------------------------------------
    case 'tallow': {
      drawShadow(ctx, 8.6, 3.0, 7.2, 0.26);

      // 3D beveled hand-cut block of waxy raw fat/lard
      const drawTopFace = () => {
        ctx.beginPath();
        ctx.moveTo(-7.6, -2.6);
        ctx.bezierCurveTo(-3.2, -5.4, 3.4, -5.4, 7.4, -2.8);
        ctx.lineTo(8.0, 1.4);
        ctx.bezierCurveTo(3.4, 3.4, -3.4, 3.6, -8.0, 1.6);
        ctx.closePath();
      };

      // Extruded waxy front side-wall with subtle meat-rind bottom layer
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-8.0, 1.6);
      ctx.bezierCurveTo(-3.4, 3.6, 3.4, 3.4, 8.0, 1.4);
      ctx.lineTo(7.8, 5.2);
      ctx.bezierCurveTo(3.4, 7.0, -3.4, 7.2, -7.8, 5.4);
      ctx.closePath();
      const frontGrad = ctx.createLinearGradient(0, 1.4, 0, 7.0);
      frontGrad.addColorStop(0, pal.fatCap);
      frontGrad.addColorStop(0.55, pal.fatShade);
      frontGrad.addColorStop(0.82, mixHex(pal.fatShade, pal.primary, 0.32));
      frontGrad.addColorStop(1, '#a99575');
      ctx.fillStyle = frontGrad;
      ctx.fill();

      // Thin pink meat streak in pork/beef fat slab
      ctx.strokeStyle = hexToRgba(pal.light, 0.48);
      ctx.lineWidth = 0.72;
      ctx.beginPath();
      ctx.moveTo(-7.8, 4.1);
      ctx.bezierCurveTo(-2.8, 5.8, 2.8, 5.6, 7.8, 3.9);
      ctx.stroke();
      ctx.restore();

      // Creamy top bevel face
      const topGrad = ctx.createRadialGradient(-2.4, -2.2, 0.8, 0, 0, 8.8);
      topGrad.addColorStop(0, '#ffffff');
      topGrad.addColorStop(0.48, pal.fat);
      topGrad.addColorStop(0.88, pal.fatCap);
      topGrad.addColorStop(1, pal.fatShade);
      ctx.fillStyle = topGrad;
      drawTopFace();
      ctx.fill();

      ctx.save();
      drawTopFace();
      ctx.clip();

      // Subtle knife-cut wax facets & organic fat-lobe contour lines
      ctx.strokeStyle = hexToRgba(pal.fatShade, 0.55);
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(-6.2, -2.0);
      ctx.quadraticCurveTo(-1.0, -3.6, 5.8, -1.8);
      ctx.moveTo(-5.8, 0.4);
      ctx.quadraticCurveTo(0.8, -0.8, 6.4, 0.6);
      ctx.stroke();

      // Waxy subsurface specular sheen
      drawWetMeatGloss(ctx, [
        { x: -2.6, y: -2.0, rx: 3.4, ry: 1.0, rot: -0.14, alpha: 0.55 },
        { x: 3.0, y: -0.6, rx: 2.0, ry: 0.65, rot: 0.12, alpha: 0.36 }
      ]);
      ctx.restore();

      // Butcher's twine tying the slab
      drawButcherTwineBand(ctx, -2.4, -4.5, -2.0, 0.8, -2.4, 6.3);
      drawButcherTwineBand(ctx, 2.6, -4.4, 3.0, 0.8, 2.6, 6.2);
      return true;
    }

    default:
      return false;
  }
}

// ============================================================
// === 2. POULTRY CUTS (6 SPECIES x 10 CUTS) ===
// ============================================================

function drawBirdCut(ctx: CanvasRenderingContext2D, cut: string, pal: BirdPalette, bird: string): boolean {
  switch (cut) {
    // ----------------------------------------------------------
    // RAW PLUCKED CARCASS (Непотрошеная/сырая тушка птицы)
    // ----------------------------------------------------------
    case 'carcass_raw': {
      drawShadow(ctx, 8.4, 3.0, 7.6, 0.28);

      // Loose plucked neck stub extending left
      ctx.fillStyle = pal.skinMid;
      ctx.beginPath();
      ctx.moveTo(-5.6, -1.6);
      ctx.quadraticCurveTo(-8.8, -2.4, -9.2, -0.4);
      ctx.quadraticCurveTo(-8.8, 1.6, -5.6, 1.4);
      ctx.closePath();
      ctx.fill();
      // Raw neck cross-section
      ctx.fillStyle = pal.meatDark;
      ctx.beginPath();
      ctx.ellipse(-9.0, -0.4, 0.65, 1.15, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Wing silhouette tucked along top edge
      drawLitEllipse(ctx, -1.0, -4.6, 3.6, 1.65, -0.22, pal.skinHighlight, pal.skin, pal.skinDark, undefined, 0.32);

      // Plump main carcass body
      const drawBody = () => {
        ctx.beginPath();
        ctx.moveTo(-6.4, -1.2);
        ctx.bezierCurveTo(-5.8, -5.8, 2.4, -6.0, 6.8, -2.4);
        ctx.bezierCurveTo(8.2, -0.6, 7.8, 3.2, 5.0, 4.8);
        ctx.bezierCurveTo(0.8, 6.6, -6.8, 4.4, -6.4, -1.2);
        ctx.closePath();
      };
      const bodyGrad = ctx.createRadialGradient(-1.6, -2.2, 0.8, 0.5, 0.2, 8.2);
      bodyGrad.addColorStop(0, pal.skinHighlight);
      bodyGrad.addColorStop(0.45, pal.skin);
      bodyGrad.addColorStop(0.82, pal.skinMid);
      bodyGrad.addColorStop(1, pal.skinDark);
      ctx.fillStyle = bodyGrad;
      drawBody();
      ctx.fill();

      ctx.save();
      drawBody();
      ctx.clip();
      drawPoultryFollicles(ctx, bird + '_raw', 0, 0, 5.8, 4.2, pal, 18);

      // Subtle sternum keel ridge highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(-4.8, -1.2);
      ctx.quadraticCurveTo(0.2, -2.0, 4.8, -0.8);
      ctx.stroke();

      // Raw cavity rim on right rump
      ctx.fillStyle = pal.darkMeatDeep;
      ctx.beginPath();
      ctx.ellipse(6.8, 0.6, 1.1, 2.1, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Raw outstretched drumstick + hock knuckle
      drawLitEllipse(ctx, 2.4, 3.6, 4.0, 2.15, 0.24, pal.skinHighlight, pal.skin, pal.skinDark, undefined, 0.36);
      // Exposed ivory ankle bone
      ctx.strokeStyle = pal.bone;
      ctx.lineWidth = 1.15;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(5.8, 4.4);
      ctx.lineTo(8.2, 5.2);
      ctx.stroke();
      drawLitSphere(ctx, 8.4, 5.2, 0.78, '#ffffff', pal.bone, pal.boneShade, undefined, 0.35);

      return true;
    }

    // ----------------------------------------------------------
    // DRESSED & TRUSSED CARCASS (Потрошеная тушка, перевязанная шпагатом)
    // ----------------------------------------------------------
    case 'carcass_dressed': {
      drawShadow(ctx, 8.4, 3.0, 7.6, 0.3);

      // Neatly tucked top wing
      drawLitEllipse(ctx, -1.4, -4.4, 3.3, 1.5, -0.18, pal.skinHighlight, pal.skin, pal.skinDark, undefined, 0.35);

      // Plump rounded oven-ready body
      const drawDressed = () => {
        ctx.beginPath();
        ctx.moveTo(-6.8, -0.6);
        ctx.bezierCurveTo(-6.4, -5.8, 2.0, -6.2, 6.2, -2.6);
        ctx.bezierCurveTo(7.8, -0.8, 7.4, 3.2, 4.6, 4.8);
        ctx.bezierCurveTo(0.2, 6.6, -7.2, 4.4, -6.8, -0.6);
        ctx.closePath();
      };

      const dGrad = ctx.createRadialGradient(-1.8, -2.2, 0.8, 0.2, 0.2, 8.0);
      dGrad.addColorStop(0, pal.skinHighlight);
      dGrad.addColorStop(0.42, pal.skin);
      dGrad.addColorStop(0.8, pal.skinMid);
      dGrad.addColorStop(1, pal.skinDark);
      ctx.fillStyle = dGrad;
      drawDressed();
      ctx.fill();

      ctx.save();
      drawDressed();
      ctx.clip();

      // Golden subcutaneous fat glow on breast
      ctx.fillStyle = hexToRgba(pal.fatPad, 0.25);
      ctx.beginPath();
      ctx.ellipse(-1.4, -1.2, 4.2, 2.5, -0.1, 0, Math.PI * 2);
      ctx.fill();

      drawPoultryFollicles(ctx, bird + '_drs', -0.4, -0.4, 5.4, 3.8, pal, 16);

      // Plump glossy breast specular
      drawWetMeatGloss(ctx, [
        { x: -1.8, y: -2.0, rx: 3.2, ry: 1.1, rot: -0.15, alpha: 0.42 }
      ]);
      ctx.restore();

      // Neatly tucked & crossed drumsticks
      drawLitEllipse(ctx, 2.0, 3.4, 3.9, 2.05, 0.16, pal.skinHighlight, pal.skin, pal.skinDark, undefined, 0.4);
      drawLitSphere(ctx, 6.2, 3.8, 0.85, '#ffffff', pal.bone, pal.boneShade, undefined, 0.35);
      drawLitSphere(ctx, 6.6, 2.6, 0.72, '#ffffff', pal.bone, pal.boneShade, undefined, 0.3);

      // Butcher's trussing cotton twine around body & ankles
      drawButcherTwineBand(ctx, -1.6, -5.2, -0.8, 0.2, -1.2, 5.4);
      drawButcherTwineBand(ctx, 4.8, 2.2, 5.3, 3.3, 4.9, 4.6);

      return true;
    }

    // ----------------------------------------------------------
    // BUTTERFLY BREAST FILLET (Филе грудки — две доли)
    // ----------------------------------------------------------
    case 'breast_large': {
      drawShadow(ctx, 8.2, 3.0, 7.6, 0.28);

      const drawLobe = (side: -1 | 1) => {
        ctx.beginPath();
        ctx.moveTo(0, -5.4);
        ctx.bezierCurveTo(side * 4.2, -6.2, side * 8.0, -2.4, side * 7.2, 1.8);
        ctx.bezierCurveTo(side * 6.4, 5.4, side * 2.2, 6.4, 0, 4.6);
        ctx.closePath();
      };

      for (const side of [-1, 1] as const) {
        // 3D fillet thickness underside
        ctx.save();
        ctx.translate(side * 0.2, 0.95);
        ctx.fillStyle = pal.meatDark;
        drawLobe(side);
        ctx.fill();
        ctx.restore();

        // Smooth raw breast muscle dome
        const bGrad = ctx.createRadialGradient(side * 2.2 - 1.0, -2.2, 0.5, side * 2.8, 0, 6.8);
        bGrad.addColorStop(0, pal.meatLight);
        bGrad.addColorStop(0.5, pal.meat);
        bGrad.addColorStop(1, pal.meatDark);
        ctx.fillStyle = bGrad;
        drawLobe(side);
        ctx.fill();

        ctx.save();
        drawLobe(side);
        ctx.clip();

        // Delicate poultry myofibril chevron striations fanning outward from sternum
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.34)';
        ctx.lineWidth = 0.42;
        ctx.lineCap = 'round';
        for (let y = -4.0; y <= 4.0; y += 1.25) {
          ctx.beginPath();
          ctx.moveTo(side * 0.4, y);
          ctx.quadraticCurveTo(side * 3.4, y - 0.85, side * 6.6, y + 0.65);
          ctx.stroke();
        }
        ctx.strokeStyle = hexToRgba(pal.meatDark, 0.26);
        ctx.lineWidth = 0.32;
        for (let y = -3.4; y <= 4.4; y += 1.25) {
          ctx.beginPath();
          ctx.moveTo(side * 0.5, y);
          ctx.quadraticCurveTo(side * 3.4, y - 0.75, side * 6.6, y + 0.75);
          ctx.stroke();
        }

        // Moist raw translucent gloss
        drawWetMeatGloss(ctx, [
          { x: side * 3.0 - 0.5, y: -1.8, rx: 2.1, ry: 0.95, rot: side * 0.32, alpha: 0.38 }
        ]);
        ctx.restore();
      }

      // Central sternum fascia membrane & subtle golden fat trim
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(0, -5.0);
      ctx.lineTo(0, 4.4);
      ctx.stroke();

      ctx.fillStyle = hexToRgba(pal.fatPad, 0.78);
      ctx.beginPath();
      ctx.ellipse(0, 4.6, 1.4, 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // ----------------------------------------------------------
    // SKIN-ON BONE-IN THIGH (Бедро птицы с кожей и косточкой)
    // ----------------------------------------------------------
    case 'thighs_medium': {
      drawShadow(ctx, 8.2, 3.0, 7.2, 0.28);

      const drawThigh = () => {
        ctx.beginPath();
        ctx.moveTo(-7.2, -1.6);
        ctx.bezierCurveTo(-6.2, -6.2, 1.6, -6.2, 6.2, -3.0);
        ctx.bezierCurveTo(8.4, -1.2, 7.8, 3.8, 4.0, 5.2);
        ctx.bezierCurveTo(-1.0, 6.8, -7.8, 4.2, -7.2, -1.6);
        ctx.closePath();
      };

      // Extruded dark-meat underside rim
      ctx.save();
      ctx.translate(0.25, 1.05);
      ctx.fillStyle = pal.darkMeatDeep;
      drawThigh();
      ctx.fill();
      ctx.restore();

      // Rich dark thigh muscle base
      const mGrad = ctx.createRadialGradient(-1.5, -1.2, 0.6, 0, 0.6, 8.2);
      mGrad.addColorStop(0, pal.meat);
      mGrad.addColorStop(0.52, pal.darkMeat);
      mGrad.addColorStop(1, pal.darkMeatDeep);
      ctx.fillStyle = mGrad;
      drawThigh();
      ctx.fill();

      ctx.save();
      drawThigh();
      ctx.clip();

      // Draped golden-cream poultry skin blanket covering top 70% of thigh
      const drawSkinFlap = () => {
        ctx.beginPath();
        ctx.moveTo(-7.8, -2.0);
        ctx.bezierCurveTo(-5.8, -6.6, 2.2, -6.6, 6.8, -3.0);
        ctx.bezierCurveTo(7.4, -0.4, 5.4, 2.2, 1.4, 2.6);
        ctx.bezierCurveTo(-2.8, 3.0, -6.6, 1.6, -7.8, -2.0);
        ctx.closePath();
      };
      // Soft shadow beneath skin flap edge
      ctx.save();
      ctx.translate(0, 0.65);
      ctx.fillStyle = 'rgba(48, 10, 16, 0.42)';
      drawSkinFlap();
      ctx.fill();
      ctx.restore();

      const skGrad = ctx.createRadialGradient(-2.0, -2.4, 0.6, 0, -1.0, 7.5);
      skGrad.addColorStop(0, pal.skinHighlight);
      skGrad.addColorStop(0.45, pal.skin);
      skGrad.addColorStop(0.85, pal.skinMid);
      skGrad.addColorStop(1, pal.skinDark);
      ctx.fillStyle = skGrad;
      drawSkinFlap();
      ctx.fill();

      // Subcutaneous yellow fat fringe peeking at skin border
      ctx.strokeStyle = hexToRgba(pal.fatPad, 0.72);
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(-6.4, 0.2);
      ctx.bezierCurveTo(-2.4, 2.8, 2.2, 2.8, 5.8, 0.6);
      ctx.stroke();

      drawPoultryFollicles(ctx, bird + '_th', -0.6, -1.6, 5.4, 2.8, pal, 15);

      // Cut hip-bone / femur end visible in dark meat
      drawTrabecularBoneCut(ctx, -3.2, 3.4, 1.25, 0.9, -0.25);

      drawWetMeatGloss(ctx, [
        { x: -1.6, y: -2.6, rx: 3.0, ry: 0.95, rot: -0.16, alpha: 0.4 },
        { x: 3.6, y: 3.0, rx: 1.4, ry: 0.55, rot: 0.2, alpha: 0.28 }
      ]);
      ctx.restore();
      return true;
    }

    // ----------------------------------------------------------
    // DRUMSTICK (Голень птицы)
    // ----------------------------------------------------------
    case 'drumsticks_medium': {
      drawShadow(ctx, 8.8, 2.7, 6.2, 0.28);

      ctx.save();
      ctx.rotate(-0.16);

      // Exposed tibia ankle shaft & double knuckle joint on right
      const boneGrad = ctx.createLinearGradient(0, -1.2, 0, 1.4);
      boneGrad.addColorStop(0, '#ffffff');
      boneGrad.addColorStop(0.55, pal.bone);
      boneGrad.addColorStop(1, pal.boneShade);
      ctx.fillStyle = boneGrad;
      ctx.beginPath();
      ctx.roundRect(3.2, -1.05, 5.2, 2.1, 0.8);
      ctx.fill();
      drawLitSphere(ctx, 8.2, -0.85, 1.15, '#ffffff', pal.bone, pal.boneShade, undefined, 0.38);
      drawLitSphere(ctx, 8.1, 0.95, 1.1, '#ffffff', pal.bone, pal.boneShade, undefined, 0.34);

      // Plump club-shaped drumstick body
      const drawClub = () => {
        ctx.beginPath();
        ctx.moveTo(-8.4, -0.2);
        ctx.bezierCurveTo(-8.4, -4.6, -2.6, -5.2, 1.4, -2.8);
        ctx.bezierCurveTo(3.2, -1.8, 4.2, -1.4, 4.6, -1.1);
        ctx.lineTo(4.6, 1.1);
        ctx.bezierCurveTo(4.2, 1.4, 3.2, 1.8, 1.4, 2.8);
        ctx.bezierCurveTo(-2.6, 5.2, -8.4, 4.6, -8.4, -0.2);
        ctx.closePath();
      };

      // Underside shadow
      ctx.save();
      ctx.translate(0.2, 0.8);
      ctx.fillStyle = pal.skinDark;
      drawClub();
      ctx.fill();
      ctx.restore();

      const cGrad = ctx.createRadialGradient(-3.6, -1.8, 0.6, -2.2, 0.2, 6.8);
      cGrad.addColorStop(0, pal.skinHighlight);
      cGrad.addColorStop(0.42, pal.skin);
      cGrad.addColorStop(0.78, pal.skinMid);
      cGrad.addColorStop(1, pal.skinDark);
      ctx.fillStyle = cGrad;
      drawClub();
      ctx.fill();

      ctx.save();
      drawClub();
      ctx.clip();

      // Subtle translucent dark-meat blush showing at cut left knee end
      const kneeGrad = ctx.createRadialGradient(-7.8, 0.2, 0.2, -7.2, 0.2, 2.8);
      kneeGrad.addColorStop(0, pal.darkMeat);
      kneeGrad.addColorStop(0.65, hexToRgba(pal.meat, 0.55));
      kneeGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = kneeGrad;
      ctx.fillRect(-9, -4.5, 4.2, 9);

      // Follicle dimples along plump calf skin
      drawPoultryFollicles(ctx, bird + '_dr', -2.6, 0, 4.4, 2.9, pal, 14);

      // Cinched white tendon collar around narrow ankle end
      ctx.strokeStyle = 'rgba(241, 245, 249, 0.78)';
      ctx.lineWidth = 1.05;
      ctx.beginPath();
      ctx.moveTo(3.6, -1.5);
      ctx.quadraticCurveTo(4.1, 0, 3.6, 1.5);
      ctx.stroke();

      drawWetMeatGloss(ctx, [
        { x: -3.2, y: -1.8, rx: 3.0, ry: 0.9, rot: -0.1, alpha: 0.42 }
      ]);
      ctx.restore();
      ctx.restore();
      return true;
    }

    // ----------------------------------------------------------
    // ARTICULATED 3-SEGMENT WING (Крылышко птицы)
    // ----------------------------------------------------------
    case 'wings_small': {
      drawShadow(ctx, 8.6, 2.7, 6.2, 0.26);

      // 3-segment V-bent poultry wing: plump drumette -> flat mid-wing -> pointed wingtip
      const drawWingPath = () => {
        ctx.beginPath();
        // Shoulder joint at bottom-left
        ctx.moveTo(-7.6, 2.6);
        // Drumette outer curve up to elbow
        ctx.bezierCurveTo(-6.8, -1.4, -3.2, -4.8, -0.4, -4.6);
        // Mid-wing flat sloping toward wrist
        ctx.bezierCurveTo(2.4, -4.4, 5.2, -1.2, 7.6, 1.4);
        // Tapered translucent wingtip
        ctx.bezierCurveTo(8.8, 2.8, 8.0, 4.2, 6.2, 3.8);
        // Underside skin web back to elbow & shoulder
        ctx.bezierCurveTo(3.4, 3.0, 1.4, 0.8, -0.4, 0.2);
        ctx.bezierCurveTo(-2.4, 1.4, -4.6, 4.6, -6.8, 4.2);
        ctx.bezierCurveTo(-7.8, 4.0, -8.0, 3.2, -7.6, 2.6);
        ctx.closePath();
      };

      // Extruded shadow depth
      ctx.save();
      ctx.translate(0.2, 0.8);
      ctx.fillStyle = pal.skinDark;
      drawWingPath();
      ctx.fill();
      ctx.restore();

      const wGrad = ctx.createLinearGradient(-7.2, -4.6, 7.4, 4.0);
      wGrad.addColorStop(0, pal.skinHighlight);
      wGrad.addColorStop(0.38, pal.skin);
      wGrad.addColorStop(0.75, pal.skinMid);
      wGrad.addColorStop(1, pal.skinDark);
      ctx.fillStyle = wGrad;
      drawWingPath();
      ctx.fill();

      ctx.save();
      drawWingPath();
      ctx.clip();

      // Elbow & wrist joint crease folds
      ctx.strokeStyle = hexToRgba(pal.skinDark, 0.52);
      ctx.lineWidth = 0.72;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-0.8, -4.2);
      ctx.quadraticCurveTo(-0.2, -1.8, -0.6, 0.2);
      ctx.moveTo(4.6, -0.6);
      ctx.quadraticCurveTo(4.0, 1.2, 4.4, 3.2);
      ctx.stroke();

      // Twin ulna/radius bone ridge shading on flat section
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(0.4, -3.0);
      ctx.lineTo(4.2, -0.2);
      ctx.moveTo(0.2, -1.4);
      ctx.lineTo(3.8, 1.2);
      ctx.stroke();

      // Cut shoulder joint meat & bone tip on bottom-left
      drawTrabecularBoneCut(ctx, -6.8, 3.2, 0.9, 0.65, -0.5);

      drawPoultryFollicles(ctx, bird + '_wg', 0, -0.4, 6.2, 3.4, pal, 15);

      drawWetMeatGloss(ctx, [
        { x: -3.4, y: -1.2, rx: 2.2, ry: 0.75, rot: -0.68, alpha: 0.4 },
        { x: 2.4, y: -1.4, rx: 2.0, ry: 0.65, rot: 0.56, alpha: 0.34 }
      ]);
      ctx.restore();
      return true;
    }

    // ----------------------------------------------------------
    // POULTRY NECKS (Шейки птицы — пара рельефных шеек)
    // ----------------------------------------------------------
    case 'necks_small': {
      drawShadow(ctx, 8.2, 2.7, 6.2, 0.26);

      const drawNeckPiece = (tx: number, ty: number, rot: number, scale: number) => {
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(rot);
        ctx.scale(scale, scale);

        const drawTube = () => {
          ctx.beginPath();
          ctx.moveTo(-6.8, -1.6);
          ctx.bezierCurveTo(-2.4, -2.6, 2.8, -2.0, 6.8, -1.0);
          ctx.bezierCurveTo(7.4, -0.2, 7.4, 0.8, 6.8, 1.3);
          ctx.bezierCurveTo(2.6, 2.2, -2.4, 2.6, -6.8, 1.8);
          ctx.closePath();
        };

        // Extruded underside
        ctx.save();
        ctx.translate(0.15, 0.65);
        ctx.fillStyle = pal.darkMeatDeep;
        drawTube();
        ctx.fill();
        ctx.restore();

        const nGrad = ctx.createLinearGradient(0, -2.4, 0, 2.4);
        nGrad.addColorStop(0, pal.meatLight);
        nGrad.addColorStop(0.45, pal.meat);
        nGrad.addColorStop(1, pal.meatDark);
        ctx.fillStyle = nGrad;
        drawTube();
        ctx.fill();

        ctx.save();
        drawTube();
        ctx.clip();

        // Segmented cervical vertebral rings along neck
        for (let x = -4.6; x <= 4.8; x += 1.95) {
          ctx.strokeStyle = hexToRgba(pal.darkMeatDeep, 0.42);
          ctx.lineWidth = 0.55;
          ctx.beginPath();
          ctx.moveTo(x, -2.4);
          ctx.quadraticCurveTo(x + 0.45, 0, x, 2.4);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
          ctx.lineWidth = 0.32;
          ctx.beginPath();
          ctx.moveTo(x + 0.55, -2.0);
          ctx.quadraticCurveTo(x + 0.95, 0, x + 0.55, 2.0);
          ctx.stroke();
        }
        ctx.restore();

        // Exposed vertebral bone ends
        drawTrabecularBoneCut(ctx, -6.6, 0.1, 0.72, 1.25, 0);
        drawTrabecularBoneCut(ctx, 6.7, 0.15, 0.55, 0.88, 0);
        ctx.restore();
      };

      drawNeckPiece(-0.4, -1.8, -0.14, 0.98);
      drawNeckPiece(0.6, 2.2, 0.12, 0.92);
      return true;
    }

    // ----------------------------------------------------------
    // POULTRY LIVER (Птичья печень — пара глянцевых долек)
    // ----------------------------------------------------------
    case 'liver': {
      drawShadow(ctx, 8.0, 2.8, 6.8, 0.28);

      const base = mixHex(pal.darkMeatDeep, '#5c141d', 0.55);
      const hi = adjustHex(base, 0.52);
      const deep = adjustHex(base, -0.45);

      const lobes = [
        { x: -3.2, y: -0.6, rx: 3.6, ry: 2.9, rot: -0.32 },
        { x: 2.8, y: 0.4, rx: 4.0, ry: 3.1, rot: 0.24 },
        { x: -0.2, y: 2.2, rx: 2.6, ry: 1.9, rot: 0.08 }
      ];

      for (const l of lobes) {
        // Soft drop shadow
        ctx.fillStyle = 'rgba(28, 4, 8, 0.4)';
        ctx.beginPath();
        ctx.ellipse(l.x + 0.25, l.y + 0.75, l.rx, l.ry, l.rot, 0, Math.PI * 2);
        ctx.fill();

        drawLitEllipse(ctx, l.x, l.y, l.rx, l.ry, l.rot, hi, base, deep, undefined, 0.52);

        // Crisp wet studio specular
        ctx.fillStyle = 'rgba(255, 240, 242, 0.46)';
        ctx.beginPath();
        ctx.ellipse(l.x - l.rx * 0.26, l.y - l.ry * 0.34, l.rx * 0.42, l.ry * 0.2, l.rot - 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    // ----------------------------------------------------------
    // POULTRY GIBLETS (Потрошки — пупок/желудок с серебрянкой + сердечко)
    // ----------------------------------------------------------
    case 'giblets': {
      drawShadow(ctx, 8.2, 2.8, 6.8, 0.28);

      // 1. Muscular poultry gizzard on left (two rounded dark-red pads united by gleaming silver fascia)
      ctx.save();
      ctx.translate(-3.0, 0.4);
      ctx.rotate(-0.18);
      drawLitEllipse(ctx, -1.6, 0, 2.5, 3.2, -0.15, pal.meat, pal.darkMeat, pal.darkMeatDeep, undefined, 0.35);
      drawLitEllipse(ctx, 1.6, 0, 2.5, 3.2, 0.15, pal.meat, pal.darkMeat, pal.darkMeatDeep, undefined, 0.35);

      // Iconic iridescent silvery-blue tendinous aponeurosis band across gizzard center
      const silGrad = ctx.createLinearGradient(0, -3.2, 0, 3.2);
      silGrad.addColorStop(0, '#94a3b8');
      silGrad.addColorStop(0.35, '#f1f5f9');
      silGrad.addColorStop(0.65, '#cbd5e1');
      silGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = silGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.1, 2.9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.58)';
      ctx.beginPath();
      ctx.ellipse(-0.4, -0.9, 0.95, 0.55, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Plump conical poultry heart on right with golden fat crown
      ctx.save();
      ctx.translate(3.8, 0.5);
      ctx.rotate(0.24);
      // Tiny artery stub
      ctx.fillStyle = '#e5b8bd';
      ctx.fillRect(-0.55, -4.3, 1.1, 1.4);

      const drawSmallHeart = () => {
        ctx.beginPath();
        ctx.moveTo(-2.5, -2.0);
        ctx.bezierCurveTo(-2.9, 0.8, -1.0, 3.6, 0, 4.2);
        ctx.bezierCurveTo(1.0, 3.6, 2.9, 0.8, 2.5, -2.0);
        ctx.quadraticCurveTo(0, -3.4, -2.5, -2.0);
        ctx.closePath();
      };
      const hg = ctx.createRadialGradient(-0.8, -0.8, 0.2, 0, 0.4, 3.8);
      hg.addColorStop(0, pal.meatLight);
      hg.addColorStop(0.45, pal.darkMeat);
      hg.addColorStop(1, pal.darkMeatDeep);
      ctx.fillStyle = hg;
      drawSmallHeart();
      ctx.fill();

      // Golden-yellow fat collar around heart crown
      ctx.strokeStyle = pal.fatPad;
      ctx.lineWidth = 1.05;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-2.2, -1.8);
      ctx.quadraticCurveTo(0, -1.0, 2.2, -1.8);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.44)';
      ctx.beginPath();
      ctx.ellipse(-0.9, 0.2, 0.65, 1.2, -0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    }

    // ----------------------------------------------------------
    // POULTRY STOCK BONES / CARCASS FRAME (Костный остов и киль)
    // ----------------------------------------------------------
    case 'bones': {
      drawShadow(ctx, 7.6, 2.8, 7.6, 0.24);

      const boneGrad = ctx.createLinearGradient(-5, -5, 5, 5);
      boneGrad.addColorStop(0, '#ffffff');
      boneGrad.addColorStop(0.5, pal.bone);
      boneGrad.addColorStop(1, pal.boneShade);

      // Subtle translucent cartilage breastplate backing
      ctx.fillStyle = 'rgba(226, 232, 240, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 1.0, 3.8, 4.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ribcage arcs radiating symmetrically from sternum keel
      ctx.lineCap = 'round';
      for (const ry of [-1.4, 0.6, 2.6, 4.2]) {
        const span = ry === 4.2 ? 2.4 : 4.2 - Math.abs(ry - 0.6) * 0.32;
        ctx.strokeStyle = pal.boneShade;
        ctx.lineWidth = 1.05;
        ctx.beginPath();
        ctx.moveTo(-span, ry + 1.0);
        ctx.quadraticCurveTo(0, ry - 0.7, span, ry + 1.0);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.52;
        ctx.beginPath();
        ctx.moveTo(-span, ry + 0.82);
        ctx.quadraticCurveTo(0, ry - 0.85, span, ry + 0.82);
        ctx.stroke();
      }

      // Prominent wishbone (furcula) V-arch
      ctx.strokeStyle = pal.boneShade;
      ctx.lineWidth = 1.85;
      ctx.beginPath();
      ctx.moveTo(-5.0, 2.8);
      ctx.quadraticCurveTo(0, -7.2, 5.0, 2.8);
      ctx.stroke();

      ctx.strokeStyle = boneGrad;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-5.0, 2.65);
      ctx.quadraticCurveTo(0, -7.35, 5.0, 2.65);
      ctx.stroke();

      // Central raised sternum keel spine
      ctx.strokeStyle = pal.boneShade;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -5.2);
      ctx.lineTo(0, 5.8);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.72;
      ctx.beginPath();
      ctx.moveTo(-0.2, -5.2);
      ctx.lineTo(-0.2, 5.6);
      ctx.stroke();

      // Tiny clinging poultry meat scraps near collar
      ctx.fillStyle = hexToRgba(pal.meat, 0.72);
      ctx.beginPath();
      ctx.ellipse(-2.2, -1.6, 1.05, 0.55, -0.6, 0, Math.PI * 2);
      ctx.ellipse(2.3, 1.4, 0.9, 0.48, 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Hypocleideum top apex knob
      drawLitSphere(ctx, 0, -5.4, 1.1, '#ffffff', pal.bone, pal.boneShade, undefined, 0.42);
      return true;
    }

    default:
      return false;
  }
}

// ============================================================
// === 3. FRESHLY GROUND MINCED MEAT (Фарш — мясной, птичий, рыбный) ===
// ============================================================

function drawMincedMeat(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  drawShadow(ctx, 8.8, 3.2, 8.2, 0.3);

  let primary = '#a61c22';
  let dark = '#5a0c10';
  let deep = '#340508';
  let light = '#de383f';
  let fat = '#fef4d6';

  if (itemId.startsWith('pork_')) {
    primary = '#dc637f'; dark = '#8f2644'; deep = '#521124'; light = '#f598ae'; fat = '#fff7f8';
  } else if (itemId.startsWith('mutton_')) {
    primary = '#8e2319'; dark = '#57110b'; deep = '#320805'; light = '#c94a30'; fat = '#fde9a6';
  } else if (itemId.startsWith('venison_')) {
    primary = '#6e112b'; dark = '#450719'; deep = '#24020c'; light = '#a52248'; fat = '#f4f7fb';
  } else if (itemId.startsWith('goat_')) {
    primary = '#9d3417'; dark = '#631d0b'; deep = '#390e05'; light = '#d15a34'; fat = '#fdf4c0';
  } else if (itemId.startsWith('duck_') || itemId.startsWith('goose_') || itemId.startsWith('pheasant_')) {
    primary = '#b32830'; dark = '#6b1218'; deep = '#3d080c'; light = '#e45c63'; fat = '#fde08d';
  } else if (itemId.startsWith('chicken_') || itemId.startsWith('turkey_') || itemId.startsWith('quail_')) {
    primary = '#e78792'; dark = '#a64352'; deep = '#66202c'; light = '#fbc0c7'; fat = '#fff7e8';
  } else if (itemId.startsWith('salmon_') || itemId.startsWith('tuna_') || itemId.startsWith('cod_') || itemId.includes('fish')) {
    primary = '#ea724d'; dark = '#a23b1c'; deep = '#631f0c'; light = '#fdb596'; fat = '#f8fafc';
  } else if (itemId === 'minced_meat_mixed') {
    primary = '#bc2c3f'; dark = '#701423'; deep = '#400812'; light = '#ea5c70'; fat = '#fef2f2';
  }

  // Sculpted 3D mound silhouette
  const drawMound = () => drawOrganicBlobPath(ctx, 0, 0.2, 8.2, 6.2, 917, 0.09, 14);

  // Dark recessed underside bed
  ctx.save();
  ctx.translate(0.25, 0.85);
  ctx.fillStyle = deep;
  drawMound();
  ctx.fill();
  ctx.restore();

  const bedGrad = ctx.createRadialGradient(-1.8, -1.6, 0.8, 0, 0.4, 8.4);
  bedGrad.addColorStop(0, dark);
  bedGrad.addColorStop(1, deep);
  ctx.fillStyle = bedGrad;
  drawMound();
  ctx.fill();

  ctx.save();
  drawMound();
  ctx.clip();

  // 34 layered extruded meat-grinder strands with depth-ordered lighting
  ctx.lineCap = 'round';
  for (let i = 0; i < 34; i++) {
    const t = i / 33;
    const x0 = -7.6 + hash01(itemId + 'gx', i * 5) * 11.4;
    const y0 = -5.2 + t * 9.8 + (hash01(itemId + 'gy', i * 5 + 1) - 0.5) * 1.5;
    const len = 2.8 + hash01(itemId + 'gl', i * 5 + 2) * 3.4;
    const bend = (hash01(itemId + 'gb', i * 5 + 3) - 0.5) * 3.0;
    const x1 = x0 + len;
    const y1 = y0 + (hash01(itemId + 'ge', i * 5 + 4) - 0.5) * 1.8;
    const xm = (x0 + x1) * 0.5;
    const ym = (y0 + y1) * 0.5 + bend;

    // Deep crevice occlusion beneath extruded noodle
    ctx.strokeStyle = deep;
    ctx.lineWidth = 1.85;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + 0.42);
    ctx.quadraticCurveTo(xm, ym + 0.42, x1, y1 + 0.42);
    ctx.stroke();

    // Shaded lower half of extruded muscle ribbon
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.48;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + 0.14);
    ctx.quadraticCurveTo(xm, ym + 0.14, x1, y1 + 0.14);
    ctx.stroke();

    // Primary rich muscle ribbon (with mixed-meat color variation)
    const isFatStrand = i % 7 === 0;
    const isMixedLight = itemId === 'minced_meat_mixed' && i % 3 === 0;
    ctx.strokeStyle = isFatStrand ? mixHex(primary, fat, 0.52) : (isMixedLight ? adjustHex(primary, 0.22) : primary);
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(x0, y0 - 0.05);
    ctx.quadraticCurveTo(xm, ym - 0.05, x1, y1 - 0.05);
    ctx.stroke();

    // Wet specular ridge atop each grinder strand
    ctx.strokeStyle = isFatStrand ? fat : hexToRgba(light, 0.85);
    ctx.lineWidth = 0.36;
    ctx.beginPath();
    ctx.moveTo(x0 + 0.25, y0 - 0.32);
    ctx.quadraticCurveTo(xm, ym - 0.32, x1 - 0.25, y1 - 0.32);
    ctx.stroke();
  }

  // Finely ground creamy white fat specks scattered through mound
  for (let i = 0; i < 22; i++) {
    const fx = (hash01(itemId + 'mf', i * 3) - 0.5) * 13.0;
    const fy = (hash01(itemId + 'mf', i * 3 + 1) - 0.5) * 9.2;
    const fr = 0.24 + hash01(itemId + 'mf', i * 3 + 2) * 0.34;
    ctx.fillStyle = fat;
    ctx.beginPath();
    ctx.ellipse(fx, fy, fr * 1.15, fr * 0.85, hash01(itemId + 'mr', i) * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Global dome ambient rim darkening for crisp 3D mound volume
  const domeShade = ctx.createRadialGradient(-2.2, -2.0, 2.5, 0, 0.4, 8.6);
  domeShade.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
  domeShade.addColorStop(0.62, 'rgba(0, 0, 0, 0)');
  domeShade.addColorStop(1, 'rgba(32, 4, 8, 0.42)');
  ctx.fillStyle = domeShade;
  ctx.fillRect(-9, -7, 18, 15);

  // Fresh studio moisture glints along mound crown
  drawWetMeatGloss(ctx, [
    { x: -2.2, y: -2.2, rx: 2.8, ry: 0.95, rot: -0.22, alpha: 0.32 },
    { x: 1.8, y: -1.0, rx: 1.4, ry: 0.55, rot: 0.18, alpha: 0.22 }
  ]);
  ctx.restore();
  return true;
}
