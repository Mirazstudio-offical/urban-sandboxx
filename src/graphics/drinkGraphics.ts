// Procedural 2D Canvas Studio Models for Drink, Oil, Vinegar & Sauce Vessels
import {
  drawShadow,
  drawBotanicalLeaf,
  drawMetalCanLid,
  drawGlassJarShell,
  applyCylinderLightingOverlay,
  drawStudioLabelPanel,
  drawScrewCap,
  drawCrownCap,
  drawMicroBarcode,
  adjustHex,
  hexToRgba
} from './itemGraphicShared';

interface PetBottleSpec {
  w: number;
  topY: number;
  botY: number;
  plasticTint: string;
  liquidTop?: string;
  liquidBot?: string;
  liquidLevelY?: number; // y where meniscus sits
  emptyCrinkled?: boolean;
  ribCount?: number;
  capColor: string;
  labelBand: string;
  labelPaper: string;
  labelAccent: string;
  emblem: 'circle' | 'crest' | 'diamond' | 'leaf' | 'none';
}

function drawStudioPetBottle(ctx: CanvasRenderingContext2D, spec: PetBottleSpec) {
  const {
    w,
    topY,
    botY,
    plasticTint,
    liquidTop,
    liquidBot,
    liquidLevelY = topY + (botY - topY) * 0.32,
    emptyCrinkled = false,
    ribCount = 2,
    capColor,
    labelBand,
    labelPaper,
    labelAccent,
    emblem
  } = spec;

  const hw = w * 0.5;
  const shY = topY + 2.8;
  const neckW = Math.min(2.2, hw * 0.44);
  const waistY = (shY + botY) * 0.5;

  const traceBody = () => {
    ctx.beginPath();
    ctx.moveTo(-neckW, topY);
    ctx.lineTo(neckW, topY);
    ctx.lineTo(neckW, topY + 1.2);
    ctx.bezierCurveTo(hw * 0.92, topY + 1.6, hw, shY, hw, shY + 1.4);
    ctx.bezierCurveTo(hw * 0.98, waistY - 0.6, hw * 0.88, waistY, hw * 0.94, waistY + 1.6);
    ctx.lineTo(hw * 0.94, botY - 1.3);
    ctx.quadraticCurveTo(hw * 0.92, botY + 0.5, hw * 0.55, botY + 0.65);
    ctx.quadraticCurveTo(0, botY + 0.85, -hw * 0.55, botY + 0.65);
    ctx.quadraticCurveTo(-hw * 0.92, botY + 0.5, -hw * 0.94, botY - 1.3);
    ctx.lineTo(-hw * 0.94, waistY + 1.6);
    ctx.bezierCurveTo(-hw * 0.88, waistY, -hw * 0.98, waistY - 0.6, -hw, shY + 1.4);
    ctx.bezierCurveTo(-hw, shY, -hw * 0.92, topY + 1.6, -neckW, topY + 1.2);
    ctx.closePath();
  };

  // Translucent PET shell background
  const shellGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
  shellGrad.addColorStop(0.0, hexToRgba(adjustHex(plasticTint, -0.25), emptyCrinkled ? 0.34 : 0.62));
  shellGrad.addColorStop(0.24, hexToRgba(adjustHex(plasticTint, 0.35), emptyCrinkled ? 0.28 : 0.48));
  shellGrad.addColorStop(0.55, hexToRgba(plasticTint, emptyCrinkled ? 0.14 : 0.28));
  shellGrad.addColorStop(0.88, hexToRgba(adjustHex(plasticTint, -0.2), emptyCrinkled ? 0.3 : 0.55));
  shellGrad.addColorStop(1.0, hexToRgba(adjustHex(plasticTint, -0.35), emptyCrinkled ? 0.38 : 0.68));
  ctx.fillStyle = shellGrad;
  traceBody();
  ctx.fill();

  // Interior liquid column clipped inside PET walls
  if (!emptyCrinkled && liquidTop && liquidBot) {
    ctx.save();
    traceBody();
    ctx.clip();

    const liqGrad = ctx.createLinearGradient(0, liquidLevelY, 0, botY + 0.8);
    liqGrad.addColorStop(0.0, liquidTop);
    liqGrad.addColorStop(0.55, adjustHex(liquidTop, -0.14));
    liqGrad.addColorStop(1.0, liquidBot);
    ctx.fillStyle = liqGrad;
    ctx.fillRect(-hw - 0.5, liquidLevelY, w + 1, botY - liquidLevelY + 1.2);

    // Cylindrical refraction shading through liquid
    applyCylinderLightingOverlay(ctx, -hw, liquidLevelY, w, botY - liquidLevelY + 1.2, 0.26, 0.34);

    // Bright curved surface meniscus ellipse
    ctx.fillStyle = hexToRgba(adjustHex(liquidTop, 0.45), 0.72);
    ctx.beginPath();
    ctx.ellipse(0, liquidLevelY, hw * 0.92, 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 0.24;
    ctx.stroke();

    // Thick molded petaloid PET base refraction
    ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
    for (const bx of [-hw * 0.48, 0, hw * 0.48]) {
      ctx.beginPath();
      ctx.ellipse(bx, botY - 0.2, hw * 0.26, 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (emptyCrinkled) {
    // Crinkled fold facets & dry condensate streaks inside empty bottle
    ctx.save();
    traceBody();
    ctx.clip();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.moveTo(-hw * 0.65, shY + 1.2);
    ctx.lineTo(hw * 0.25, waistY);
    ctx.lineTo(-hw * 0.4, botY - 1.5);
    ctx.moveTo(hw * 0.55, shY + 1.8);
    ctx.lineTo(-hw * 0.2, waistY + 1.2);
    ctx.lineTo(hw * 0.45, botY - 2.2);
    ctx.stroke();
    ctx.restore();
  }

  // Structural blow-molded annular ribs above/below label
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.lineWidth = 0.28;
  for (let i = 0; i < ribCount; i++) {
    const ry = shY + 1.6 + i * 1.1;
    ctx.beginPath();
    ctx.moveTo(-hw * 0.9, ry);
    ctx.quadraticCurveTo(0, ry + 0.42, hw * 0.9, ry);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-hw * 0.9, botY - 1.6);
  ctx.quadraticCurveTo(0, botY - 1.2, hw * 0.9, botY - 1.6);
  ctx.stroke();

  // Wrap-around studio paper/BOPP label in recessed waist
  const lblH = Math.min(4.6, (botY - shY) * 0.42);
  const lblY = waistY - lblH * 0.45;
  drawStudioLabelPanel(ctx, -hw * 0.94, lblY, w * 0.94, lblH, {
    paperColor: labelPaper,
    bandColor: labelBand,
    accentColor: labelAccent,
    inkColor: '#0f172a',
    goldFoil: false,
    hasBarcode: !emptyCrinkled,
    emblem,
    cylindrical: true
  });

  // Crisp PET studio softbox specular pillar + right rim highlight
  const fGrad = ctx.createLinearGradient(-hw * 0.72, 0, -hw * 0.36, 0);
  fGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.05)');
  fGrad.addColorStop(0.42, 'rgba(255, 255, 255, 0.62)');
  fGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = fGrad;
  ctx.fillRect(-hw * 0.72, shY, hw * 0.36, botY - shY - 0.6);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fillRect(hw * 0.66, shY + 0.4, hw * 0.14, botY - shY - 1.2);

  // Thin crisp PET rim outline
  ctx.strokeStyle = hexToRgba(adjustHex(plasticTint, -0.45), 0.55);
  ctx.lineWidth = 0.34;
  traceBody();
  ctx.stroke();

  // Knurled screw cap with tamper ring
  drawScrewCap(ctx, 0, topY - 1.65, neckW * 2.15, 2.05, capColor, true);
}

interface GlassBottleSpec {
  glassHex: string;
  glassTintAlpha?: number;
  liquidHex?: string;
  liquidTopY?: number;
  w?: number;
  topY?: number;
  botY?: number;
  shoulderStyle?: 'bordeaux' | 'burgundy' | 'square' | 'tapered';
  closure?: 'capsule' | 'crown' | 'screw' | 'pourer' | 'cork';
  closureColor: string;
  foilCollarColor?: string;
  labelPaper?: string;
  labelBand?: string;
  labelAccent?: string;
  labelStyle?: 'studio' | 'hex_soy' | 'crest';
  emblem?: 'circle' | 'crest' | 'diamond' | 'leaf' | 'none';
}

function drawStudioGlassBottle(ctx: CanvasRenderingContext2D, spec: GlassBottleSpec) {
  const {
    glassHex,
    glassTintAlpha = 0.88,
    liquidHex,
    liquidTopY = -1.6,
    w = 8.4,
    topY = -8.4,
    botY = 7.2,
    shoulderStyle = 'bordeaux',
    closure = 'screw',
    closureColor,
    foilCollarColor,
    labelPaper = '#f8f5ec',
    labelBand = '#1e293b',
    labelAccent = '#b45309',
    labelStyle = 'studio',
    emblem = 'crest'
  } = spec;

  const hw = w * 0.5;
  const neckW = Math.min(1.75, hw * 0.38);
  const shY = shoulderStyle === 'burgundy' ? -0.8 : -2.6;

  const traceBottle = () => {
    ctx.beginPath();
    ctx.moveTo(-neckW, topY);
    ctx.lineTo(neckW, topY);
    ctx.lineTo(neckW, -5.2);
    if (shoulderStyle === 'tapered') {
      ctx.quadraticCurveTo(hw * 0.8, -1.0, hw, botY - 0.8);
    } else if (shoulderStyle === 'square') {
      ctx.quadraticCurveTo(hw * 0.98, -4.6, hw, -3.0);
      ctx.lineTo(hw, botY - 1.1);
    } else if (shoulderStyle === 'burgundy') {
      ctx.bezierCurveTo(neckW * 1.1, -3.2, hw, shY - 1.8, hw, shY + 1.2);
      ctx.lineTo(hw * 0.96, botY - 1.0);
    } else {
      ctx.bezierCurveTo(neckW * 1.2, -4.2, hw, -4.0, hw, shY);
      ctx.lineTo(hw * 0.96, botY - 1.0);
    }
    ctx.quadraticCurveTo(hw * 0.94, botY + 0.4, hw * 0.52, botY + 0.55);
    ctx.quadraticCurveTo(0, botY + 0.72, -hw * 0.52, botY + 0.55);
    ctx.quadraticCurveTo(-hw * 0.94, botY + 0.4, -hw * 0.96, botY - 1.0);
    if (shoulderStyle === 'tapered') {
      ctx.lineTo(-hw, botY - 0.8);
      ctx.quadraticCurveTo(-hw * 0.8, -1.0, -neckW, -5.2);
    } else if (shoulderStyle === 'square') {
      ctx.lineTo(-hw, -3.0);
      ctx.quadraticCurveTo(-hw * 0.98, -4.6, -neckW, -5.2);
    } else if (shoulderStyle === 'burgundy') {
      ctx.lineTo(-hw, shY + 1.2);
      ctx.bezierCurveTo(-hw, shY - 1.8, -neckW * 1.1, -3.2, -neckW, -5.2);
    } else {
      ctx.lineTo(-hw, shY);
      ctx.bezierCurveTo(-hw, -4.0, -neckW * 1.2, -4.2, -neckW, -5.2);
    }
    ctx.closePath();
  };

  // Glass body cylindrical gradient
  const gGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
  gGrad.addColorStop(0.0, hexToRgba(adjustHex(glassHex, -0.35), glassTintAlpha));
  gGrad.addColorStop(0.24, hexToRgba(adjustHex(glassHex, 0.32), glassTintAlpha * 0.86));
  gGrad.addColorStop(0.54, hexToRgba(glassHex, glassTintAlpha * 0.76));
  gGrad.addColorStop(0.86, hexToRgba(adjustHex(glassHex, -0.28), glassTintAlpha * 0.92));
  gGrad.addColorStop(1.0, hexToRgba(adjustHex(glassHex, -0.45), glassTintAlpha));
  ctx.fillStyle = gGrad;
  traceBottle();
  ctx.fill();

  // Internal liquid fill + punt refraction
  ctx.save();
  traceBottle();
  ctx.clip();

  if (liquidHex) {
    const lGrad = ctx.createLinearGradient(-hw, liquidTopY, hw, botY);
    lGrad.addColorStop(0.0, adjustHex(liquidHex, -0.15));
    lGrad.addColorStop(0.32, adjustHex(liquidHex, 0.16));
    lGrad.addColorStop(0.75, liquidHex);
    lGrad.addColorStop(1.0, adjustHex(liquidHex, -0.38));
    ctx.fillStyle = lGrad;
    ctx.fillRect(-hw - 0.5, liquidTopY, w + 1, botY - liquidTopY + 1.2);

    // Meniscus refraction line
    ctx.fillStyle = hexToRgba(adjustHex(liquidHex, 0.45), 0.55);
    ctx.beginPath();
    ctx.ellipse(0, liquidTopY, hw * 0.9, 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Thick glass bottom punt wedge & shadow
  const puntGrad = ctx.createLinearGradient(0, botY - 1.8, 0, botY + 0.6);
  puntGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.08)');
  puntGrad.addColorStop(0.45, 'rgba(226, 232, 240, 0.34)');
  puntGrad.addColorStop(1.0, 'rgba(15, 23, 42, 0.48)');
  ctx.fillStyle = puntGrad;
  ctx.fillRect(-hw, botY - 1.5, w, 2.2);

  // Curved glass punt dome arch inside base
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 0.35;
  ctx.beginPath();
  ctx.arc(0, botY + 0.6, hw * 0.48, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();

  // Soft cylindrical shade across glass
  applyCylinderLightingOverlay(ctx, -hw, topY, w, botY - topY + 1, 0.22, 0.34);
  ctx.restore();

  // Glass shoulder collar & finish ring under closure
  ctx.fillStyle = hexToRgba(adjustHex(glassHex, 0.28), 0.72);
  ctx.beginPath();
  ctx.roundRect(-neckW - 0.28, topY + 0.9, (neckW + 0.28) * 2, 0.65, 0.25);
  ctx.fill();

  // Optional neck foil band
  if (foilCollarColor) {
    const fGrad = ctx.createLinearGradient(-neckW - 0.1, 0, neckW + 0.1, 0);
    fGrad.addColorStop(0, adjustHex(foilCollarColor, -0.35));
    fGrad.addColorStop(0.32, adjustHex(foilCollarColor, 0.35));
    fGrad.addColorStop(0.75, foilCollarColor);
    fGrad.addColorStop(1, adjustHex(foilCollarColor, -0.4));
    ctx.fillStyle = fGrad;
    ctx.fillRect(-neckW - 0.1, -6.2, (neckW + 0.1) * 2, 1.5);
  }

  // Front label
  if (labelStyle === 'hex_soy') {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0.4);
    ctx.lineTo(2.45, 1.5);
    ctx.lineTo(2.45, 4.15);
    ctx.lineTo(0, 5.25);
    ctx.lineTo(-2.45, 4.15);
    ctx.lineTo(-2.45, 1.5);
    ctx.closePath();
    ctx.fillStyle = labelPaper;
    ctx.fill();
    ctx.strokeStyle = labelAccent;
    ctx.lineWidth = 0.32;
    ctx.stroke();
    ctx.fillStyle = labelBand;
    ctx.fillRect(-1.45, 2.3, 2.9, 0.85);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-1.1, 3.55, 2.2, 0.35);
    ctx.restore();
  } else {
    const lblH = shoulderStyle === 'tapered' ? 4.2 : 5.2;
    const lblY = shoulderStyle === 'tapered' ? 1.2 : 0.2;
    const lblW = w * (shoulderStyle === 'tapered' ? 0.68 : 0.86);
    drawStudioLabelPanel(ctx, -lblW * 0.5, lblY, lblW, lblH, {
      paperColor: labelPaper,
      bandColor: labelBand,
      accentColor: labelAccent,
      inkColor: '#1e293b',
      goldFoil: true,
      hasBarcode: lblW >= 6.8,
      emblem,
      cylindrical: true
    });
  }

  // Studio Fresnel left reflection streak & neck catchlight
  const sGrad = ctx.createLinearGradient(-hw * 0.72, 0, -hw * 0.35, 0);
  sGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  sGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.58)');
  sGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sGrad;
  ctx.fillRect(-hw * 0.72, shY + 0.5, hw * 0.34, botY - shY - 1.5);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.fillRect(-neckW * 0.68, topY + 0.5, neckW * 0.35, 3.2);
  ctx.fillRect(hw * 0.68, shY + 0.8, hw * 0.14, botY - shY - 2.0);

  // Outer crisp glass rim
  ctx.strokeStyle = hexToRgba(adjustHex(glassHex, -0.5), 0.52);
  ctx.lineWidth = 0.34;
  traceBottle();
  ctx.stroke();

  // Closure hardware
  if (closure === 'crown') {
    drawCrownCap(ctx, 0, topY - 1.35, neckW * 2.3, 1.55, closureColor);
  } else if (closure === 'capsule') {
    const capH = 3.1;
    const cGrad = ctx.createLinearGradient(-neckW - 0.2, 0, neckW + 0.2, 0);
    cGrad.addColorStop(0, adjustHex(closureColor, -0.4));
    cGrad.addColorStop(0.3, adjustHex(closureColor, 0.25));
    cGrad.addColorStop(0.7, closureColor);
    cGrad.addColorStop(1, adjustHex(closureColor, -0.45));
    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.roundRect(-neckW - 0.18, topY - 1.4, (neckW + 0.18) * 2, capH, 0.45);
    ctx.fill();
    // Gold foil neck tear band
    ctx.fillStyle = labelAccent;
    ctx.fillRect(-neckW - 0.18, topY + 0.8, (neckW + 0.18) * 2, 0.32);
  } else if (closure === 'pourer') {
    // Dual-ear dispenser pourer cap (soy sauce)
    drawScrewCap(ctx, 0, topY - 1.8, neckW * 2.2, 2.2, closureColor, false);
    ctx.fillStyle = closureColor;
    ctx.beginPath();
    ctx.moveTo(-neckW - 1.0, topY - 1.1);
    ctx.lineTo(-neckW * 1.9, topY - 1.5);
    ctx.lineTo(-neckW * 1.8, topY - 0.5);
    ctx.lineTo(-neckW - 0.6, topY - 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(neckW + 1.0, topY - 1.1);
    ctx.lineTo(neckW * 1.9, topY - 1.5);
    ctx.lineTo(neckW * 1.8, topY - 0.5);
    ctx.lineTo(neckW + 0.6, topY - 0.3);
    ctx.closePath();
    ctx.fill();
  } else if (closure === 'cork') {
    const corkGrad = ctx.createLinearGradient(-neckW, 0, neckW, 0);
    corkGrad.addColorStop(0, '#92400e');
    corkGrad.addColorStop(0.4, '#d97706');
    corkGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = corkGrad;
    ctx.beginPath();
    ctx.roundRect(-neckW * 0.92, topY - 1.2, neckW * 1.84, 1.8, 0.35);
    ctx.fill();
  } else {
    drawScrewCap(ctx, 0, topY - 1.7, neckW * 2.18, 2.1, closureColor, true);
  }
}

function drawStudioAluminumCan(
  ctx: CanvasRenderingContext2D,
  w: number,
  topY: number,
  botY: number,
  bodyHex: string,
  accentHex: string,
  variant: 'cola' | 'cola_zero' | 'energy' | 'beer'
) {
  const hw = w * 0.5;
  const lidRx = hw * 0.91;
  const neckY = topY + 1.35;

  // Rolled brushed aluminum bottom chime
  const botGrad = ctx.createLinearGradient(-lidRx, 0, lidRx, 0);
  botGrad.addColorStop(0, '#64748b');
  botGrad.addColorStop(0.3, '#f1f5f9');
  botGrad.addColorStop(0.7, '#94a3b8');
  botGrad.addColorStop(1, '#475569');
  ctx.fillStyle = botGrad;
  ctx.beginPath();
  ctx.ellipse(0, botY - 0.35, lidRx, 1.35, 0, 0, Math.PI * 2);
  ctx.fill();

  const traceCanBody = () => {
    ctx.beginPath();
    ctx.moveTo(-lidRx, topY + 0.3);
    ctx.lineTo(lidRx, topY + 0.3);
    ctx.lineTo(hw, neckY);
    ctx.lineTo(hw, botY - 1.1);
    ctx.lineTo(lidRx, botY - 0.3);
    ctx.quadraticCurveTo(0, botY + 0.45, -lidRx, botY - 0.3);
    ctx.lineTo(-hw, botY - 1.1);
    ctx.lineTo(-hw, neckY);
    ctx.closePath();
  };

  // Brushed satin anodized can base gradient
  const bGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
  bGrad.addColorStop(0.0, adjustHex(bodyHex, -0.35));
  bGrad.addColorStop(0.22, adjustHex(bodyHex, 0.3));
  bGrad.addColorStop(0.42, bodyHex);
  bGrad.addColorStop(0.78, adjustHex(bodyHex, -0.25));
  bGrad.addColorStop(0.95, adjustHex(bodyHex, -0.45));
  bGrad.addColorStop(1.0, adjustHex(bodyHex, -0.18));
  ctx.fillStyle = bGrad;
  traceCanBody();
  ctx.fill();

  ctx.save();
  traceCanBody();
  ctx.clip();

  // Upper bare-aluminum necked-in shoulder band
  const shGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
  shGrad.addColorStop(0, '#64748b');
  shGrad.addColorStop(0.28, '#f8fafc');
  shGrad.addColorStop(0.6, '#cbd5e1');
  shGrad.addColorStop(1, '#475569');
  ctx.fillStyle = shGrad;
  ctx.fillRect(-hw, topY, w, 1.45);

  if (variant === 'cola' || variant === 'cola_zero') {
    // Crisp dynamic brushed silver & crimson ribbon swoosh
    ctx.strokeStyle = variant === 'cola_zero' ? accentHex : '#f8fafc';
    ctx.lineWidth = 1.45;
    ctx.beginPath();
    ctx.moveTo(-hw - 0.5, 2.8);
    ctx.bezierCurveTo(-1.8, 0.4, 1.5, 2.4, hw + 0.5, -0.8);
    ctx.stroke();

    ctx.strokeStyle = variant === 'cola_zero' ? '#e2e8f0' : 'rgba(254, 202, 202, 0.8)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-hw - 0.5, 3.8);
    ctx.bezierCurveTo(-1.8, 1.5, 1.5, 3.4, hw + 0.5, 0.2);
    ctx.stroke();

    if (variant === 'cola_zero') {
      // Matte red satin emblem band
      ctx.fillStyle = accentHex;
      ctx.fillRect(-hw, -2.5, w, 2.2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2.6, -1.7, 5.2, 0.55);
    }
    drawMicroBarcode(ctx, hw - 2.6, 3.4, 2.0, 2.2, '#0f172a', 'rgba(255, 255, 255, 0.78)');
  } else if (variant === 'energy') {
    // Precision faceted geometric chevron & cyan micro-grid lines
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.moveTo(-hw, -4.4);
    ctx.lineTo(hw, -2.6);
    ctx.moveTo(-hw, 4.4);
    ctx.lineTo(hw, 2.6);
    ctx.stroke();

    const boltGrad = ctx.createLinearGradient(-2, -4, 2, 4);
    boltGrad.addColorStop(0, '#fef08a');
    boltGrad.addColorStop(0.5, accentHex);
    boltGrad.addColorStop(1, '#ca8a04');
    ctx.fillStyle = boltGrad;
    ctx.beginPath();
    ctx.moveTo(0.8, -4.4);
    ctx.lineTo(-2.5, 0.2);
    ctx.lineTo(-0.2, 0.2);
    ctx.lineTo(-1.1, 4.4);
    ctx.lineTo(2.6, -0.4);
    ctx.lineTo(0.2, -0.4);
    ctx.closePath();
    ctx.fill();
    drawMicroBarcode(ctx, -hw + 0.7, 3.4, 1.8, 2.2, '#0f172a', 'rgba(255, 255, 255, 0.75)');
  } else if (variant === 'beer') {
    // Cream frosted top collar wave + heraldic cream/gold pilsner crest
    ctx.fillStyle = 'rgba(248, 250, 252, 0.9)';
    ctx.beginPath();
    ctx.moveTo(-hw, neckY + 0.4);
    ctx.lineTo(hw, neckY + 0.4);
    ctx.lineTo(hw, neckY + 1.8);
    ctx.quadraticCurveTo(2.0, neckY + 2.6, 0, neckY + 1.7);
    ctx.quadraticCurveTo(-2.2, neckY + 0.9, -hw, neckY + 2.0);
    ctx.closePath();
    ctx.fill();

    drawStudioLabelPanel(ctx, -hw * 0.84, -1.6, w * 0.84, 5.8, {
      paperColor: '#fdf8e8',
      bandColor: '#14532d',
      accentColor: '#d97706',
      inkColor: '#14532d',
      goldFoil: true,
      hasBarcode: true,
      emblem: 'crest',
      cylindrical: false
    });
  }

  // Anisotropic metallic reflection strips
  applyCylinderLightingOverlay(ctx, -hw, topY, w, botY - topY, 0.34, 0.34);
  ctx.restore();

  // Sharp can edge
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.34)';
  ctx.lineWidth = 0.32;
  traceCanBody();
  ctx.stroke();

  // Detailed double-seamed stay-on tab aluminum top lid
  drawMetalCanLid(ctx, 0, topY + 0.1, lidRx, 1.55, true, '#cbd5e1');
}

export function drawDrinkItem(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  switch (itemId) {
    // Standard 0.5L PET Plastic Water Bottle
    case 'drinking_water':
    case 'bottle_plastic_500':
    case 'bottle_water':
    case 'mineral_water':
    case 'water_bottle': {
      drawShadow(ctx, 5.8, 2.3, 7.8, 0.24);
      drawStudioPetBottle(ctx, {
        w: 8.6,
        topY: -7.8,
        botY: 7.2,
        plasticTint: '#bae6fd',
        liquidTop: '#7dd3fc',
        liquidBot: '#0284c7',
        liquidLevelY: -2.2,
        ribCount: 2,
        capColor: '#0284c7',
        labelBand: '#0284c7',
        labelPaper: '#f8fafc',
        labelAccent: '#38bdf8',
        emblem: 'circle'
      });
      return true;
    }

    // Tall 1.5L Large PET Plastic Water Bottle
    case 'drinking_water_1500':
    case 'bottle_plastic_1500': {
      drawShadow(ctx, 6.8, 2.6, 8.6, 0.26);
      drawStudioPetBottle(ctx, {
        w: 10.2,
        topY: -10.4,
        botY: 8.2,
        plasticTint: '#bae6fd',
        liquidTop: '#7dd3fc',
        liquidBot: '#0284c7',
        liquidLevelY: -4.2,
        ribCount: 3,
        capColor: '#0284c7',
        labelBand: '#0369a1',
        labelPaper: '#ffffff',
        labelAccent: '#38bdf8',
        emblem: 'crest'
      });
      return true;
    }

    // Empty Transparent Crinkled PET Bottle
    case 'bottle_empty':
    case 'water_bottle_empty': {
      drawShadow(ctx, 5.6, 2.1, 7.6, 0.16);
      drawStudioPetBottle(ctx, {
        w: 8.4,
        topY: -7.8,
        botY: 7.1,
        plasticTint: '#e0f2fe',
        emptyCrinkled: true,
        ribCount: 2,
        capColor: '#0284c7',
        labelBand: '#94a3b8',
        labelPaper: 'rgba(248, 250, 252, 0.72)',
        labelAccent: '#cbd5e1',
        emblem: 'none'
      });
      return true;
    }

    // Glass Milk Bottle with Gold Foil Cap & Cream Collar
    case 'milk_bottle': {
      drawShadow(ctx, 6.2, 2.5, 7.8, 0.25);
      drawStudioGlassBottle(ctx, {
        glassHex: '#e2e8f0',
        glassTintAlpha: 0.9,
        liquidHex: '#f8fafc',
        liquidTopY: -2.6,
        w: 8.8,
        topY: -8.2,
        botY: 7.2,
        shoulderStyle: 'burgundy',
        closure: 'capsule',
        closureColor: '#ca8a04',
        labelPaper: '#fffbeb',
        labelBand: '#15803d',
        labelAccent: '#eab308',
        emblem: 'leaf'
      });
      return true;
    }

    // Dark Amber Ribbed 1.5L Bread Kvas Bottle
    case 'kvas':
    case 'kvas_bottle': {
      drawShadow(ctx, 6.4, 2.5, 7.8, 0.25);
      drawStudioPetBottle(ctx, {
        w: 9.2,
        topY: -8.4,
        botY: 7.2,
        plasticTint: '#78350f',
        liquidTop: '#b45309',
        liquidBot: '#451a03',
        liquidLevelY: -2.4,
        ribCount: 2,
        capColor: '#451a03',
        labelBand: '#78350f',
        labelPaper: '#fef3c7',
        labelAccent: '#d97706',
        emblem: 'crest'
      });
      return true;
    }

    case 'soda_can':
    case 'can_alu_330':
    case 'cola_can':
    case 'cola': {
      drawShadow(ctx, 6.2, 2.4, 7.8, 0.25);
      drawStudioAluminumCan(ctx, 10.6, -6.2, 7.6, '#dc2626', '#ffffff', 'cola');
      return true;
    }

    case 'energy_drink': {
      drawShadow(ctx, 5.8, 2.3, 7.8, 0.25);
      drawStudioAluminumCan(ctx, 9.6, -7.4, 7.6, '#0f172a', '#facc15', 'energy');
      return true;
    }

    case 'cola_zero': {
      drawShadow(ctx, 6.2, 2.4, 7.8, 0.25);
      drawStudioAluminumCan(ctx, 10.6, -6.2, 7.6, '#18181b', '#dc2626', 'cola_zero');
      return true;
    }

    case 'can_beer':
    case 'beer_can': {
      drawShadow(ctx, 6.2, 2.4, 7.8, 0.25);
      drawStudioAluminumCan(ctx, 10.8, -6.4, 7.6, '#15803d', '#eab308', 'beer');
      return true;
    }

    // Takeaway Espresso / Hot Coffee Paper Cup with Corrugated Kraft Sleeve
    case 'hot_coffee':
    case 'coffee':
    case 'paper_cup':
    case 'coffee_cup':
    case 'plastic_cup':
    case 'coffee_cup_empty': {
      drawShadow(ctx, 6.0, 2.4, 7.8, 0.24);

      const traceCup = () => {
        ctx.beginPath();
        ctx.moveTo(-5.0, -5.2);
        ctx.lineTo(5.0, -5.2);
        ctx.lineTo(3.8, 7.0);
        ctx.quadraticCurveTo(0, 7.75, -3.8, 7.0);
        ctx.closePath();
      };

      // Satin off-white paperboard cup
      const cupGrad = ctx.createLinearGradient(-5, 0, 5, 0);
      cupGrad.addColorStop(0.0, '#cbd5e1');
      cupGrad.addColorStop(0.28, '#ffffff');
      cupGrad.addColorStop(0.65, '#f1f5f9');
      cupGrad.addColorStop(1.0, '#94a3b8');
      ctx.fillStyle = cupGrad;
      traceCup();
      ctx.fill();

      // Clipped corrugated kraft heat sleeve + botanical coffee roast seal
      ctx.save();
      traceCup();
      ctx.clip();

      const slGrad = ctx.createLinearGradient(-4.8, 0, 4.8, 0);
      slGrad.addColorStop(0.0, '#78350f');
      slGrad.addColorStop(0.3, '#b45309');
      slGrad.addColorStop(0.7, '#92400e');
      slGrad.addColorStop(1.0, '#451a03');
      ctx.fillStyle = slGrad;
      ctx.fillRect(-5.2, -1.8, 10.4, 5.4);

      // Corrugated vertical flutes
      ctx.strokeStyle = 'rgba(28, 12, 3, 0.3)';
      ctx.lineWidth = 0.28;
      for (let rx = -4.2; rx <= 4.2; rx += 0.72) {
        ctx.beginPath();
        ctx.moveTo(rx, -1.8);
        ctx.lineTo(rx * 0.9, 3.6);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.16)';
      ctx.lineWidth = 0.22;
      for (let rx = -4.0; rx <= 4.0; rx += 0.72) {
        ctx.beginPath();
        ctx.moveTo(rx + 0.22, -1.8);
        ctx.lineTo(rx * 0.9 + 0.2, 3.6);
        ctx.stroke();
      }

      // Roasted coffee bean emblem on circular parchment medallion
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(0, 0.9, 1.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, 0.9, 0.9, 1.2, 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 0.34;
      ctx.beginPath();
      ctx.moveTo(-0.15, -0.1);
      ctx.quadraticCurveTo(0.35, 0.9, -0.15, 1.9);
      ctx.stroke();

      // Cast shadow directly under lid skirt
      ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
      ctx.fillRect(-5.2, -5.2, 10.4, 0.8);
      ctx.restore();

      // Matte molded ABS travel lid with stepped rim & sip spout
      const lidGrad = ctx.createLinearGradient(-5.6, 0, 5.6, 0);
      lidGrad.addColorStop(0.0, '#18181b');
      lidGrad.addColorStop(0.32, '#3f3f46');
      lidGrad.addColorStop(0.75, '#18181b');
      lidGrad.addColorStop(1.0, '#09090b');
      ctx.fillStyle = lidGrad;
      ctx.beginPath();
      ctx.roundRect(-5.6, -6.5, 11.2, 1.75, 0.65);
      ctx.fill();

      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.roundRect(-4.6, -7.8, 9.2, 1.65, 0.55);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.fillRect(-4.0, -7.6, 8.0, 0.32);

      // Sip hole & vent pinhole
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.ellipse(1.6, -7.25, 0.78, 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-1.8, -7.2, 0.2, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Tetra Brik / Gable Carton Citrus Juice (1L)
    case 'fresh_juice':
    case 'tetra_pack_1000':
    case 'tetra_pack_1000_open':
    case 'juice_pack':
    case 'juice':
    case 'juice_box': {
      drawShadow(ctx, 6.6, 2.5, 7.8, 0.24);

      // 3D perspective juice carton: front face (-5.2..2.8) + right shaded depth flank (2.8..5.4)
      const frontGrad = ctx.createLinearGradient(-5.2, -5.5, 2.8, 7.2);
      frontGrad.addColorStop(0.0, '#fb923c');
      frontGrad.addColorStop(0.55, '#ea580c');
      frontGrad.addColorStop(1.0, '#c2410c');
      ctx.fillStyle = frontGrad;
      ctx.beginPath();
      ctx.roundRect(-5.2, -5.6, 8.0, 12.8, [0.4, 0, 0.4, 0.6]);
      ctx.fill();

      // Shaded side panel
      ctx.fillStyle = '#9a3412';
      ctx.beginPath();
      ctx.moveTo(2.8, -5.6);
      ctx.lineTo(5.2, -4.6);
      ctx.lineTo(5.2, 6.4);
      ctx.lineTo(2.8, 7.2);
      ctx.closePath();
      ctx.fill();

      // Top slanted foil-laminated roof + folded gusset ear
      ctx.fillStyle = '#fdba74';
      ctx.beginPath();
      ctx.moveTo(-5.2, -5.6);
      ctx.lineTo(-2.8, -7.3);
      ctx.lineTo(5.2, -4.6);
      ctx.lineTo(2.8, -5.6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#c2410c';
      ctx.beginPath();
      ctx.moveTo(-5.2, -5.6);
      ctx.lineTo(-3.4, -7.0);
      ctx.lineTo(2.8, -5.6);
      ctx.closePath();
      ctx.fill();

      // Crisp cream editorial fruit card on front panel
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.roundRect(-4.4, -3.6, 6.4, 8.8, 0.45);
      ctx.fill();
      ctx.fillStyle = '#15803d';
      ctx.fillRect(-4.4, -3.6, 6.4, 1.45);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3.2, -3.05, 4.0, 0.4);

      // Detailed botanical citrus slice & green leaf inside cream panel
      drawBotanicalLeaf(ctx, 0.3, -0.4, 2.2, 0.72, -0.55, '#4ade80', '#166534');
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(-1.2, 1.4, 2.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(-1.2, 1.4, 1.88, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fef9c3';
      ctx.lineWidth = 0.28;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(-1.2, 1.4);
        ctx.lineTo(-1.2 + Math.cos(a) * 1.85, 1.4 + Math.sin(a) * 1.85);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-1.2, 1.4, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Barcode on shaded side panel
      drawMicroBarcode(ctx, 3.25, 1.8, 1.5, 2.8, '#0f172a', 'rgba(255,255,255,0.8)');

      // White threaded reclosable TetraCap spout (open/closed visual)
      drawScrewCap(ctx, 0.6, -6.9, 2.1, 1.35, '#f8fafc', false);
      return true;
    }

    // Artisan Cappuccino with Microfoam Rosetta
    case 'cappuccino': {
      drawShadow(ctx, 6.0, 2.4, 7.8, 0.24);
      const cupGrad = ctx.createLinearGradient(-5.2, 0, 5.2, 0);
      cupGrad.addColorStop(0.0, '#451a03');
      cupGrad.addColorStop(0.32, '#92400e');
      cupGrad.addColorStop(0.75, '#78350f');
      cupGrad.addColorStop(1.0, '#290f02');
      ctx.fillStyle = cupGrad;
      ctx.beginPath();
      ctx.moveTo(-5.2, -3.8);
      ctx.lineTo(5.2, -3.8);
      ctx.lineTo(3.9, 7.0);
      ctx.quadraticCurveTo(0, 7.75, -3.9, 7.0);
      ctx.closePath();
      ctx.fill();

      // Cream satin band with roast emblem
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(-4.7, 0.2, 9.4, 3.0);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-2.8, 1.15, 5.6, 0.45);
      ctx.fillRect(-1.8, 2.0, 3.6, 0.35);

      // Rolled cup lip
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.ellipse(0, -3.8, 5.25, 2.15, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Espresso crema ring + velvety microfoam + latte rosetta
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(0, -3.8, 4.95, 1.9, 0, 0, Math.PI * 2);
      ctx.fill();

      const foamGrad = ctx.createRadialGradient(-0.8, -4.1, 0.3, 0, -3.8, 4.4);
      foamGrad.addColorStop(0.0, '#ffffff');
      foamGrad.addColorStop(0.7, '#fefce8');
      foamGrad.addColorStop(1.0, '#d97706');
      ctx.fillStyle = foamGrad;
      ctx.beginPath();
      ctx.ellipse(0, -3.8, 4.35, 1.65, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cocoa rosetta heart swirl
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(-0.55, -3.9, 0.65, 0, Math.PI * 2);
      ctx.arc(0.55, -3.9, 0.65, 0, Math.PI * 2);
      ctx.moveTo(-1.15, -3.7);
      ctx.lineTo(0, -2.75);
      ctx.lineTo(1.15, -3.7);
      ctx.closePath();
      ctx.fill();
      return true;
    }

    // Borosilicate Double-Wall Tea Glass Mug
    case 'tea_green':
    case 'tea_cup':
    case 'tea':
    case 'glass_mug': {
      drawShadow(ctx, 6.2, 2.5, 7.8, 0.22);

      // Curved glass C-handle with bright catchlight
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.85)';
      ctx.lineWidth = 1.45;
      ctx.beginPath();
      ctx.arc(5.1, 1.2, 2.8, -Math.PI * 0.44, Math.PI * 0.44);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.arc(5.2, 1.0, 2.95, -Math.PI * 0.36, Math.PI * 0.12);
      ctx.stroke();

      // Glass outer wall
      const glGrad = ctx.createLinearGradient(-5.2, 0, 5.2, 0);
      glGrad.addColorStop(0.0, 'rgba(148, 163, 184, 0.42)');
      glGrad.addColorStop(0.28, 'rgba(255, 255, 255, 0.46)');
      glGrad.addColorStop(0.75, 'rgba(226, 232, 240, 0.25)');
      glGrad.addColorStop(1.0, 'rgba(100, 116, 139, 0.48)');
      ctx.fillStyle = glGrad;
      ctx.beginPath();
      ctx.roundRect(-5.2, -3.8, 10.4, 10.8, [0.8, 0.8, 3.2, 3.2]);
      ctx.fill();

      // Steeped emerald-jade green tea infusion
      const teaGrad = ctx.createRadialGradient(-1, 1.5, 0.4, 0, 2.2, 5.8);
      teaGrad.addColorStop(0.0, '#6ee7b7');
      teaGrad.addColorStop(0.45, '#10b981');
      teaGrad.addColorStop(1.0, '#065f46');
      ctx.fillStyle = teaGrad;
      ctx.beginPath();
      ctx.roundRect(-4.5, -2.0, 9.0, 8.2, [0.3, 0.3, 2.6, 2.6]);
      ctx.fill();

      // Top hot tea meniscus + floating detailed mint leaf
      ctx.fillStyle = 'rgba(167, 243, 208, 0.72)';
      ctx.beginPath();
      ctx.ellipse(0, -2.0, 4.45, 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      drawBotanicalLeaf(ctx, -1.6, -1.9, 3.0, 0.82, 0.14, '#34d399', '#065f46');

      // Glass softbox streak & thick glass bottom
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(-3.8, -3.2, 1.1, 8.8);
      ctx.fillStyle = 'rgba(226, 232, 240, 0.52)';
      ctx.beginPath();
      ctx.roundRect(-4.5, 5.6, 9.0, 1.3, [0, 0, 2.6, 2.6]);
      ctx.fill();

      // Draped cotton teabag string + cream tea tag
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(1.2, -2.0);
      ctx.quadraticCurveTo(-2.6, -5.2, -6.1, -0.6);
      ctx.stroke();

      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.roundRect(-7.2, -0.8, 2.1, 2.5, 0.3);
      ctx.fill();
      ctx.fillStyle = '#15803d';
      ctx.fillRect(-6.8, 0.1, 1.3, 0.75);
      return true;
    }

    // Filled Stainless Steel Army Flask
    case 'camp_flask': {
      drawShadow(ctx, 7.2, 2.7, 7.8, 0.25);
      const stGrad = ctx.createLinearGradient(-6.2, 0, 6.2, 0);
      stGrad.addColorStop(0.0, '#64748b');
      stGrad.addColorStop(0.24, '#f1f5f9');
      stGrad.addColorStop(0.46, '#cbd5e1');
      stGrad.addColorStop(0.82, '#64748b');
      stGrad.addColorStop(1.0, '#94a3b8');
      ctx.fillStyle = stGrad;
      ctx.beginPath();
      ctx.roundRect(-6.2, -4.4, 12.4, 11.8, 2.4);
      ctx.fill();

      // Top & bottom spun rim shadow
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
      ctx.lineWidth = 0.35;
      ctx.stroke();

      // Stamped crisp recessed crest medallion
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.45)';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(0, -1.6);
      ctx.lineTo(2.4, 1.4);
      ctx.lineTo(0, 4.4);
      ctx.lineTo(-2.4, 1.4);
      ctx.closePath();
      ctx.stroke();

      // Captive hinge arm + knurled screw cap
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(-1.8, -5.6);
      ctx.lineTo(-3.1, -6.8);
      ctx.lineTo(-2.2, -7.8);
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-1.4, -6.2, 2.8, 1.9);
      drawScrewCap(ctx, 0, -8.3, 4.2, 2.2, '#94a3b8', false);
      return true;
    }

    // Empty Army Flask with Open Hollow Neck & Dangling Cap
    case 'camp_flask_empty': {
      drawShadow(ctx, 7.0, 2.5, 7.6, 0.2);
      const stGrad = ctx.createLinearGradient(-6.2, 0, 6.2, 0);
      stGrad.addColorStop(0.0, '#475569');
      stGrad.addColorStop(0.24, '#cbd5e1');
      stGrad.addColorStop(0.5, '#94a3b8');
      stGrad.addColorStop(0.85, '#475569');
      stGrad.addColorStop(1.0, '#64748b');
      ctx.fillStyle = stGrad;
      ctx.beginPath();
      ctx.roundRect(-6.2, -4.4, 12.4, 11.8, 2.4);
      ctx.fill();

      // Machined threaded neck & hollow dark bore
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-1.4, -6.4, 2.8, 2.1);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.28;
      ctx.beginPath();
      ctx.moveTo(-1.4, -5.8); ctx.lineTo(1.4, -5.4);
      ctx.moveTo(-1.4, -5.1); ctx.lineTo(1.4, -4.7);
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, -6.4, 1.1, 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dangling hinged cap
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(-1.4, -5.3);
      ctx.quadraticCurveTo(-4.0, -5.8, -4.4, -2.8);
      ctx.stroke();
      drawScrewCap(ctx, -4.4, -3.2, 3.2, 2.4, '#64748b', false);
      return true;
    }

    // Heavy Vacuum Stainless Thermos (1.0L)
    case 'thermos': {
      drawShadow(ctx, 7.2, 2.6, 8.4, 0.26);
      const stGrad = ctx.createLinearGradient(-5, 0, 5, 0);
      stGrad.addColorStop(0.0, '#64748b');
      stGrad.addColorStop(0.24, '#f8fafc');
      stGrad.addColorStop(0.48, '#cbd5e1');
      stGrad.addColorStop(0.84, '#475569');
      stGrad.addColorStop(1.0, '#94a3b8');
      ctx.fillStyle = stGrad;
      ctx.beginPath();
      ctx.roundRect(-5.0, -5.8, 10.0, 13.8, 1.6);
      ctx.fill();

      // Molded anti-slip elastomer grip collars
      for (const gy of [-3.4, 3.6]) {
        const gGrad = ctx.createLinearGradient(-5.2, gy, 5.2, gy);
        gGrad.addColorStop(0.0, '#09090b');
        gGrad.addColorStop(0.32, '#334155');
        gGrad.addColorStop(0.8, '#0f172a');
        gGrad.addColorStop(1.0, '#1e293b');
        ctx.fillStyle = gGrad;
        ctx.fillRect(-5.15, gy, 10.3, 1.75);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 0.35;
        for (let kx = -4.2; kx <= 4.2; kx += 0.9) {
          ctx.beginPath();
          ctx.moveTo(kx, gy + 0.2);
          ctx.lineTo(kx, gy + 1.55);
          ctx.stroke();
        }
      }

      // Red push-button inner valve peek
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-1.4, -6.5, 2.8, 1.0, 0.3);
      ctx.fill();

      // Insulated matte slate & chrome drinking cup lid
      const capGrad = ctx.createLinearGradient(-4.7, 0, 4.7, 0);
      capGrad.addColorStop(0.0, '#0f172a');
      capGrad.addColorStop(0.28, '#475569');
      capGrad.addColorStop(0.75, '#1e293b');
      capGrad.addColorStop(1.0, '#09090b');
      ctx.fillStyle = capGrad;
      ctx.beginPath();
      ctx.roundRect(-4.65, -10.8, 9.3, 4.8, 1.0);
      ctx.fill();

      // Machined steel cup collar & top dome lip
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-4.65, -6.7, 9.3, 0.72);
      ctx.fillRect(-4.1, -11.1, 8.2, 0.55);

      // Shoulder strap webbing D-ring on left
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(-5.0, -1.8);
      ctx.lineTo(-6.3, 0);
      ctx.lineTo(-5.0, 1.8);
      ctx.stroke();
      return true;
    }

    // === GLASS BEVERAGE & LIQUOR BOTTLES ===
    case 'bottle_glass_medium':
    case 'glass_bottle_500': {
      drawShadow(ctx, 5.8, 2.3, 7.8, 0.24);
      drawStudioGlassBottle(ctx, {
        glassHex: '#cffafe',
        glassTintAlpha: 0.78,
        w: 8.6,
        topY: -8.2,
        botY: 7.2,
        shoulderStyle: 'bordeaux',
        closure: 'crown',
        closureColor: '#94a3b8',
        labelPaper: 'rgba(248, 250, 252, 0.65)',
        labelBand: '#0284c7',
        labelAccent: '#38bdf8',
        emblem: 'circle'
      });
      return true;
    }

    case 'bottle_glass_large': {
      drawShadow(ctx, 6.6, 2.5, 7.8, 0.25);
      drawStudioGlassBottle(ctx, {
        glassHex: '#bae6fd',
        glassTintAlpha: 0.82,
        w: 9.8,
        topY: -9.4,
        botY: 7.4,
        shoulderStyle: 'bordeaux',
        closure: 'screw',
        closureColor: '#0284c7',
        labelPaper: 'rgba(248, 250, 252, 0.72)',
        labelBand: '#0369a1',
        labelAccent: '#7dd3fc',
        emblem: 'crest'
      });
      return true;
    }

    case 'beer':
    case 'bottle_beer':
    case 'beer_bottle': {
      drawShadow(ctx, 5.8, 2.3, 7.8, 0.24);
      drawStudioGlassBottle(ctx, {
        glassHex: '#92400e',
        glassTintAlpha: 0.94,
        liquidHex: '#78350f',
        liquidTopY: -2.4,
        w: 8.6,
        topY: -8.4,
        botY: 7.2,
        shoulderStyle: 'bordeaux',
        closure: 'crown',
        closureColor: '#ca8a04',
        foilCollarColor: '#eab308',
        labelPaper: '#fdf8e8',
        labelBand: '#14532d',
        labelAccent: '#ca8a04',
        emblem: 'crest'
      });
      return true;
    }

    case 'vodka':
    case 'bottle_vodka':
    case 'vodka_bottle': {
      drawShadow(ctx, 5.8, 2.3, 7.8, 0.24);
      drawStudioGlassBottle(ctx, {
        glassHex: '#e2e8f0',
        glassTintAlpha: 0.86,
        liquidHex: 'rgba(248, 250, 252, 0.55)',
        liquidTopY: -2.5,
        w: 8.6,
        topY: -8.6,
        botY: 7.2,
        shoulderStyle: 'bordeaux',
        closure: 'screw',
        closureColor: '#cbd5e1',
        foilCollarColor: '#0284c7',
        labelPaper: '#f8fafc',
        labelBand: '#0f172a',
        labelAccent: '#38bdf8',
        emblem: 'diamond'
      });
      return true;
    }

    case 'wine_red':
    case 'wine_white':
    case 'wine_bottle':
    case 'bottle_wine': {
      drawShadow(ctx, 5.8, 2.3, 7.8, 0.25);
      const isWhite = itemId === 'wine_white';
      drawStudioGlassBottle(ctx, {
        glassHex: isWhite ? '#4d7c0f' : '#064e3b',
        glassTintAlpha: 0.94,
        liquidHex: isWhite ? '#fde047' : '#4c0519',
        liquidTopY: -2.2,
        w: 8.6,
        topY: -8.8,
        botY: 7.2,
        shoulderStyle: 'bordeaux',
        closure: 'capsule',
        closureColor: isWhite ? '#d97706' : '#881337',
        labelPaper: '#fdf6e4',
        labelBand: isWhite ? '#365314' : '#7f1d1d',
        labelAccent: '#d97706',
        emblem: 'crest'
      });
      return true;
    }

    // === CULINARY OILS ===
    case 'oil_sunflower':
    case 'oil_sunflower_bottle': {
      drawShadow(ctx, 5.8, 2.4, 7.8, 0.24);
      drawStudioPetBottle(ctx, {
        w: 8.6,
        topY: -8.0,
        botY: 7.2,
        plasticTint: '#fef9c3',
        liquidTop: '#fde047',
        liquidBot: '#ca8a04',
        liquidLevelY: -2.6,
        ribCount: 2,
        capColor: '#dc2626',
        labelBand: '#ca8a04',
        labelPaper: '#fffbeb',
        labelAccent: '#f59e0b',
        emblem: 'circle'
      });
      return true;
    }

    case 'oil_olive':
    case 'oil_olive_extra_virgin': {
      drawShadow(ctx, 5.8, 2.4, 7.8, 0.25);
      drawStudioGlassBottle(ctx, {
        glassHex: '#15803d',
        glassTintAlpha: 0.94,
        liquidHex: '#65a30d',
        liquidTopY: -2.0,
        w: 8.4,
        topY: -8.2,
        botY: 7.2,
        shoulderStyle: 'square',
        closure: 'capsule',
        closureColor: '#b45309',
        labelPaper: '#fef3c7',
        labelBand: '#14532d',
        labelAccent: '#ca8a04',
        emblem: 'leaf'
      });
      return true;
    }

    case 'oil_linseed':
    case 'oil_linseed_bottle': {
      drawShadow(ctx, 5.6, 2.3, 7.8, 0.24);
      drawStudioGlassBottle(ctx, {
        glassHex: '#92400e',
        glassTintAlpha: 0.94,
        liquidHex: '#d97706',
        liquidTopY: -1.8,
        w: 8.0,
        topY: -8.0,
        botY: 7.2,
        shoulderStyle: 'burgundy',
        closure: 'screw',
        closureColor: '#1e293b',
        labelPaper: '#fffbeb',
        labelBand: '#1d4ed8',
        labelAccent: '#d97706',
        emblem: 'circle'
      });
      return true;
    }

    case 'oil_sesame':
    case 'oil_sesame_bottle': {
      drawShadow(ctx, 5.4, 2.2, 7.8, 0.24);
      drawStudioGlassBottle(ctx, {
        glassHex: '#78350f',
        glassTintAlpha: 0.94,
        liquidHex: '#92400e',
        liquidTopY: -1.8,
        w: 7.6,
        topY: -7.8,
        botY: 7.2,
        shoulderStyle: 'bordeaux',
        closure: 'screw',
        closureColor: '#18181b',
        labelPaper: '#fef3c7',
        labelBand: '#b91c1c',
        labelAccent: '#d97706',
        emblem: 'diamond'
      });
      return true;
    }

    // === VINEGARS ===
    case 'vinegar_table':
    case 'vinegar_table_bottle': {
      drawShadow(ctx, 5.8, 2.3, 7.8, 0.22);
      drawStudioGlassBottle(ctx, {
        glassHex: '#e2e8f0',
        glassTintAlpha: 0.85,
        liquidHex: '#f1f5f9',
        liquidTopY: -2.0,
        w: 8.2,
        topY: -8.2,
        botY: 7.2,
        shoulderStyle: 'bordeaux',
        closure: 'screw',
        closureColor: '#f8fafc',
        labelPaper: '#ffffff',
        labelBand: '#dc2626',
        labelAccent: '#94a3b8',
        emblem: 'diamond'
      });
      return true;
    }

    case 'vinegar_apple':
    case 'vinegar_apple_cider': {
      drawShadow(ctx, 5.8, 2.4, 7.8, 0.24);
      drawStudioGlassBottle(ctx, {
        glassHex: '#fde68a',
        glassTintAlpha: 0.88,
        liquidHex: '#d97706',
        liquidTopY: -2.0,
        w: 8.6,
        topY: -8.2,
        botY: 7.2,
        shoulderStyle: 'burgundy',
        closure: 'screw',
        closureColor: '#15803d',
        labelPaper: '#fef3c7',
        labelBand: '#991b1b',
        labelAccent: '#15803d',
        emblem: 'leaf'
      });
      return true;
    }

    case 'vinegar_balsamic':
    case 'vinegar_balsamic_premium': {
      drawShadow(ctx, 6.2, 2.5, 7.8, 0.25);
      drawStudioGlassBottle(ctx, {
        glassHex: '#27272a',
        glassTintAlpha: 0.96,
        liquidHex: '#09090b',
        liquidTopY: -1.8,
        w: 9.4,
        topY: -7.8,
        botY: 7.2,
        shoulderStyle: 'square',
        closure: 'capsule',
        closureColor: '#d97706',
        labelPaper: '#fdf6e4',
        labelBand: '#18181b',
        labelAccent: '#d97706',
        emblem: 'crest'
      });
      return true;
    }

    // === SAUCES ===
    case 'sauce_soy':
    case 'soy_sauce_classic': {
      drawShadow(ctx, 6.2, 2.5, 7.8, 0.25);
      drawStudioGlassBottle(ctx, {
        glassHex: '#292524',
        glassTintAlpha: 0.94,
        liquidHex: '#09090b',
        liquidTopY: -1.6,
        w: 8.8,
        topY: -5.8,
        botY: 7.2,
        shoulderStyle: 'tapered',
        closure: 'pourer',
        closureColor: '#dc2626',
        labelPaper: '#fef08a',
        labelBand: '#dc2626',
        labelAccent: '#b45309',
        labelStyle: 'hex_soy'
      });
      return true;
    }

    case 'sauce_fish_premium': {
      drawShadow(ctx, 5.6, 2.3, 7.8, 0.24);
      drawStudioGlassBottle(ctx, {
        glassHex: '#9a3412',
        glassTintAlpha: 0.92,
        liquidHex: '#78350f',
        liquidTopY: -2.0,
        w: 7.8,
        topY: -8.2,
        botY: 7.2,
        shoulderStyle: 'bordeaux',
        closure: 'screw',
        closureColor: '#eab308',
        labelPaper: '#eff6ff',
        labelBand: '#1e3a8a',
        labelAccent: '#fbbf24',
        emblem: 'crest'
      });
      return true;
    }

    case 'sauce_worcestershire': {
      drawShadow(ctx, 5.6, 2.3, 7.8, 0.24);
      drawStudioGlassBottle(ctx, {
        glassHex: '#292524',
        glassTintAlpha: 0.95,
        liquidHex: '#0c0a09',
        liquidTopY: -2.0,
        w: 7.8,
        topY: -8.4,
        botY: 7.2,
        shoulderStyle: 'bordeaux',
        closure: 'screw',
        closureColor: '#991b1b',
        labelPaper: '#fef3c7',
        labelBand: '#ea580c',
        labelAccent: '#1c1917',
        emblem: 'crest'
      });
      return true;
    }

    case 'sauce_teriyaki':
    case 'sauce_teriyaki_bottle': {
      drawShadow(ctx, 5.8, 2.3, 7.8, 0.24);
      drawStudioGlassBottle(ctx, {
        glassHex: '#27272a',
        glassTintAlpha: 0.95,
        liquidHex: '#09090b',
        liquidTopY: -2.0,
        w: 8.2,
        topY: -8.2,
        botY: 7.2,
        shoulderStyle: 'bordeaux',
        closure: 'screw',
        closureColor: '#27272a',
        labelPaper: '#f8fafc',
        labelBand: '#dc2626',
        labelAccent: '#fbbf24',
        emblem: 'circle'
      });
      return true;
    }

    case 'sauce_narsharab':
    case 'sauce_pomegranate_narsharab': {
      drawShadow(ctx, 6.2, 2.5, 7.8, 0.25);
      drawStudioGlassBottle(ctx, {
        glassHex: '#e2e8f0',
        glassTintAlpha: 0.78,
        liquidHex: '#4c0519',
        liquidTopY: -1.8,
        w: 9.0,
        topY: -6.4,
        botY: 7.2,
        shoulderStyle: 'tapered',
        closure: 'screw',
        closureColor: '#d97706',
        labelPaper: '#fff1f2',
        labelBand: '#881337',
        labelAccent: '#fbbf24',
        emblem: 'circle'
      });
      return true;
    }

    // === COOKING WINES ===
    case 'wine_white_cooking': {
      drawShadow(ctx, 5.8, 2.4, 7.8, 0.24);
      drawStudioGlassBottle(ctx, {
        glassHex: '#4ade80',
        glassTintAlpha: 0.68,
        liquidHex: '#fde047',
        liquidTopY: -2.0,
        w: 8.6,
        topY: -8.6,
        botY: 7.2,
        shoulderStyle: 'bordeaux',
        closure: 'capsule',
        closureColor: '#16a34a',
        labelPaper: '#fefce8',
        labelBand: '#15803d',
        labelAccent: '#ca8a04',
        emblem: 'leaf'
      });
      return true;
    }

    case 'wine_red_cooking': {
      drawShadow(ctx, 5.8, 2.4, 7.8, 0.25);
      drawStudioGlassBottle(ctx, {
        glassHex: '#292524',
        glassTintAlpha: 0.94,
        liquidHex: '#4c0519',
        liquidTopY: -2.0,
        w: 8.6,
        topY: -8.6,
        botY: 7.2,
        shoulderStyle: 'bordeaux',
        closure: 'capsule',
        closureColor: '#991b1b',
        labelPaper: '#fef3c7',
        labelBand: '#7f1d1d',
        labelAccent: '#d97706',
        emblem: 'crest'
      });
      return true;
    }

    // === FERMENTATION & DAIRY DRINKS ===
    case 'liquid_yeast_mixture': {
      drawShadow(ctx, 6.2, 2.5, 7.8, 0.24);
      drawGlassJarShell(ctx, -4.6, -3.5, 9.2, 10.6, 1.8, '#b45309', '#78350f', () => {
        const yGrad = ctx.createLinearGradient(0, -1.2, 0, 7.0);
        yGrad.addColorStop(0.0, '#fffbeb');
        yGrad.addColorStop(0.55, '#fde68a');
        yGrad.addColorStop(1.0, '#b45309');
        ctx.fillStyle = yGrad;
        ctx.fillRect(-4.2, -1.0, 8.4, 8.0);

        // Frothy yeast krausen foam layer
        ctx.fillStyle = '#fffbeb';
        for (const [fx, fy, fr] of [[-2.0, -0.9, 1.0], [0, -1.2, 1.2], [2.0, -0.8, 1.0]]) {
          ctx.beginPath();
          ctx.arc(fx, fy, fr, 0, Math.PI * 2);
          ctx.fill();
        }
        // CO2 fermentation micro-bubbles
        ctx.fillStyle = 'rgba(180, 83, 9, 0.65)';
        for (const [bx, by, br] of [[-1.5, 2.0, 0.35], [1.2, 3.5, 0.4], [-0.8, 5.0, 0.32], [1.8, 1.2, 0.28]]) {
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Milliliter graduation hash ticks etched on side
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 0.32;
      ctx.beginPath();
      ctx.moveTo(-3.8, 0.8); ctx.lineTo(-2.2, 0.8);
      ctx.moveTo(-3.8, 2.8); ctx.lineTo(-2.5, 2.8);
      ctx.moveTo(-3.8, 4.8); ctx.lineTo(-2.2, 4.8);
      ctx.stroke();
      return true;
    }

    case 'milk_raw':
    case 'milk_bottle_raw': {
      drawShadow(ctx, 6.0, 2.4, 7.8, 0.24);
      drawStudioGlassBottle(ctx, {
        glassHex: '#f1f5f9',
        glassTintAlpha: 0.92,
        liquidHex: '#ffffff',
        liquidTopY: -2.4,
        w: 8.6,
        topY: -8.2,
        botY: 7.2,
        shoulderStyle: 'burgundy',
        closure: 'screw',
        closureColor: '#1d4ed8',
        labelPaper: '#ffffff',
        labelBand: '#1d4ed8',
        labelAccent: '#fef08a',
        emblem: 'circle'
      });
      return true;
    }

    case 'carton_milk':
    case 'milk':
    case 'milk_pasteurized_carton': {
      drawShadow(ctx, 6.4, 2.6, 7.8, 0.25);

      // 3D gable-top dairy carton
      const fGrad = ctx.createLinearGradient(-5.2, 0, 2.8, 0);
      fGrad.addColorStop(0.0, '#ffffff');
      fGrad.addColorStop(1.0, '#e2e8f0');
      ctx.fillStyle = fGrad;
      ctx.fillRect(-5.2, -3.6, 8.0, 10.8);

      // Shaded right panel
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(2.8, -3.6);
      ctx.lineTo(5.2, -2.6);
      ctx.lineTo(5.2, 6.4);
      ctx.lineTo(2.8, 7.2);
      ctx.closePath();
      ctx.fill();

      // Gable roof slopes
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-5.2, -3.6);
      ctx.lineTo(-1.2, -7.2);
      ctx.lineTo(2.8, -3.6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(-1.2, -7.2);
      ctx.lineTo(1.2, -6.2);
      ctx.lineTo(5.2, -2.6);
      ctx.lineTo(2.8, -3.6);
      ctx.closePath();
      ctx.fill();

      // Heat-sealed top fin
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(-1.2, -8.0);
      ctx.lineTo(1.2, -7.0);
      ctx.lineTo(1.2, -6.2);
      ctx.lineTo(-1.2, -7.2);
      ctx.closePath();
      ctx.fill();

      // Editorial dairy blue & meadow band
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-5.2, -1.6, 8.0, 4.4);
      ctx.fillStyle = '#0369a1';
      ctx.beginPath();
      ctx.moveTo(2.8, -1.6);
      ctx.lineTo(5.2, -0.8);
      ctx.lineTo(5.2, 3.3);
      ctx.lineTo(2.8, 2.8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#16a34a';
      ctx.fillRect(-5.2, 4.4, 8.0, 2.8);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-1.2, 0.5, 1.15, 0, Math.PI * 2);
      ctx.fill();
      drawMicroBarcode(ctx, 3.25, 3.5, 1.45, 2.2, '#0f172a', 'rgba(255,255,255,0.85)');

      // Plastic dairy cap on gable slope
      drawScrewCap(ctx, 1.8, -5.8, 2.1, 1.35, '#0284c7', false);
      return true;
    }

    case 'kefir':
    case 'kefir_fermented_bottle': {
      drawShadow(ctx, 5.8, 2.4, 7.8, 0.24);
      drawStudioGlassBottle(ctx, {
        glassHex: '#f1f5f9',
        glassTintAlpha: 0.94,
        liquidHex: '#ffffff',
        liquidTopY: -2.4,
        w: 8.6,
        topY: -8.2,
        botY: 7.2,
        shoulderStyle: 'burgundy',
        closure: 'screw',
        closureColor: '#15803d',
        labelPaper: '#f8fafc',
        labelBand: '#16a34a',
        labelAccent: '#4ade80',
        emblem: 'leaf'
      });
      return true;
    }

    case 'buttermilk':
    case 'buttermilk_fermented_jar': {
      drawShadow(ctx, 6.8, 2.7, 7.8, 0.25);
      // Glazed earthenware crock with parchment tie-cover
      const crockGrad = ctx.createLinearGradient(-5.2, 0, 5.2, 0);
      crockGrad.addColorStop(0.0, '#78350f');
      crockGrad.addColorStop(0.28, '#d97706');
      crockGrad.addColorStop(0.65, '#92400e');
      crockGrad.addColorStop(1.0, '#451a03');
      ctx.fillStyle = crockGrad;
      ctx.beginPath();
      ctx.roundRect(-5.0, -3.4, 10.0, 10.8, 2.4);
      ctx.fill();

      // Glazed rim collar
      ctx.fillStyle = '#5c2c0e';
      ctx.beginPath();
      ctx.roundRect(-5.4, -4.1, 10.8, 1.8, 0.7);
      ctx.fill();

      // Pleated breathable linen/parchment cover tied with hemp twine
      ctx.fillStyle = '#fef9c3';
      ctx.beginPath();
      ctx.roundRect(-4.7, -6.2, 9.4, 2.6, 0.9);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(-4.7, -4.1);
      ctx.lineTo(4.7, -4.1);
      ctx.stroke();

      // Studio glaze specular highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.fillRect(-3.6, -2.0, 1.1, 8.2);
      return true;
    }

    default:
      return false;
  }
}
