/** Procedural high-detail top-down models for all 5 domestic animal species. */
import {
  AnimalRenderContext,
  drawAnatomicalEyes,
  drawArticulatedLimbs,
  drawDorsalSpineHighlight,
  drawFurTextureStrokes,
  drawSculptedEars,
  drawTaperedLimbSegment,
  drawWetNose,
  drawWhiskers,
  makeDomeGradient,
  makeVolumetricGradient,
  mixColor,
  rgbaColor,
  seededRand,
  shadeColor,
  TorsoProfilePoint,
  traceOrganicTorsoPath,
} from './animalRenderUtils';

// ============================================================================
// 10. COW (КОРОВА) — Broad barrel pasture body, sculpted hip bones, Holstein/Simmental patches, horns
// ============================================================================
export function drawCow(ctx: CanvasRenderingContext2D, r: AnimalRenderContext): void {
  const { a, halfLen, halfWid, baseCol, secCol, accentCol, deepShadow, highlightCol, rimCol, sunLX, sunLY, stretch, breath, spineBend, tailWag, headDrop, nowSec, detailZoom } = r;

  drawArticulatedLimbs(ctx, r.legs, {
    upperColor: shadeColor(baseCol, 0.85),
    lowerColor: a.coat.pattern === 'piebald' ? baseCol : shadeColor(secCol, 0.9),
    footColor: '#181412',
    upperRadius: halfWid * 0.21,
    kneeRadius: halfWid * 0.14,
    footRadius: halfWid * 0.16,
    terminalStyle: 'cloven_hoof',
    detailZoom,
  });

  // Long swishing fly-whisk bovine tail with tufted brush switch
  const tailSwish = Math.sin(nowSec * 2.6 + a.seed) * 0.56 + tailWag * 0.4;
  const tailRootY = spineBend * halfLen * 0.15;
  ctx.save();
  ctx.translate(-halfLen * 0.84 * stretch, tailRootY);
  const tMidX = -halfLen * 0.22;
  const tMidY = tailSwish * 4.0;
  const tEndX = -halfLen * 0.38;
  const tEndY = tailSwish * 6.0;
  ctx.strokeStyle = shadeColor(baseCol, 0.86);
  ctx.lineWidth = 1.25;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(tMidX, tMidY, tEndX, tEndY);
  ctx.stroke();

  ctx.fillStyle = secCol;
  ctx.beginPath();
  ctx.ellipse(tEndX - 0.5, tEndY, 1.85, 0.95, tailSwish * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const profile: TorsoProfilePoint[] = [
    { x: -halfLen * 0.86 * stretch, w: halfWid * 0.36 },
    { x: -halfLen * 0.68 * stretch, w: halfWid * 0.86 * breath },
    { x: -halfLen * 0.34 * stretch, w: halfWid * 0.96 * breath },
    { x: 0, w: halfWid * 1.04 * breath },
    { x: halfLen * 0.36 * stretch, w: halfWid * 0.96 * breath },
    { x: halfLen * 0.64 * stretch, w: halfWid * 0.78 * breath },
    { x: halfLen * 0.76 * stretch, w: halfWid * 0.46 },
  ];

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.fillStyle = makeVolumetricGradient(ctx, 0, 0, halfWid * 1.12, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.fill();

  ctx.save();
  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.clip();

  if (a.coat.pattern === 'piebald' || a.coat.pattern === 'spotted') {
    for (let p = 0; p < 5; p++) {
      const px = (seededRand(a.seed, p * 5 + 1) - 0.5) * halfLen * 1.35;
      const py = (seededRand(a.seed, p * 5 + 2) - 0.5) * halfWid * 1.55;
      const prx = halfLen * (0.2 + seededRand(a.seed, p * 5 + 3) * 0.24);
      const pry = halfWid * (0.38 + seededRand(a.seed, p * 5 + 4) * 0.36);
      const rot = seededRand(a.seed, p * 5 + 5) * Math.PI;
      ctx.fillStyle = makeVolumetricGradient(
        ctx,
        px,
        py,
        Math.max(prx, pry),
        sunLX,
        sunLY,
        shadeColor(secCol, 1.24),
        secCol,
        shadeColor(secCol, 0.68)
      );
      ctx.beginPath();
      ctx.ellipse(px, py, prx, pry, rot, 0, Math.PI * 2);
      ctx.ellipse(px + prx * 0.44, py + pry * 0.2, prx * 0.6, pry * 0.54, rot + 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = rgbaColor(secCol, 0.32);
    ctx.beginPath();
    ctx.ellipse(0, 0, halfLen * 0.66, halfWid * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle anatomical hip-bone crests (hooks) & dorsal spine ridge
  drawDorsalSpineHighlight(ctx, -halfLen * 0.72, halfLen * 0.58, halfWid * 0.14, rgbaColor(rimCol, 0.26), spineBend, halfLen);
  ctx.fillStyle = rgbaColor(rimCol, 0.2);
  ctx.beginPath();
  ctx.ellipse(-halfLen * 0.54, -halfWid * 0.56, 2.1, 1.15, 0.25, 0, Math.PI * 2);
  ctx.ellipse(-halfLen * 0.54, halfWid * 0.56, 2.1, 1.15, -0.25, 0, Math.PI * 2);
  ctx.fill();

  // Global flank wrap shadow over coat patches for 3D cylindrical volume
  ctx.fillStyle = makeVolumetricGradient(
    ctx,
    0,
    0,
    halfWid * 1.15,
    sunLX,
    sunLY,
    'rgba(255, 250, 240, 0.08)',
    'rgba(0, 0, 0, 0)',
    'rgba(10, 12, 16, 0.26)'
  );
  ctx.fillRect(-halfLen * 1.1, -halfWid * 1.3, halfLen * 2.2, halfWid * 2.6);

  if (detailZoom) {
    drawFurTextureStrokes(
      ctx,
      a.seed,
      halfLen * 0.8,
      halfWid * 0.92,
      rgbaColor(rimCol, 0.16),
      rgbaColor(deepShadow, 0.18),
      24,
      1.35,
      0.28,
      spineBend
    );
  }
  ctx.restore();

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.strokeStyle = rgbaColor(deepShadow, 0.46);
  ctx.lineWidth = 0.44;
  ctx.stroke();

  // Heavy bovine neck, broad head, outstretched ears, curved horns & muted moist muzzle
  ctx.save();
  ctx.translate(halfLen * 0.64 * stretch, spineBend * halfLen * 0.09);
  ctx.rotate(a.headYaw * 0.7);

  const neckLen = 2.8 + headDrop * 0.45;
  ctx.fillStyle = makeVolumetricGradient(ctx, neckLen * 0.5, 0, halfWid * 0.62, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.beginPath();
  ctx.ellipse(neckLen * 0.5, 0, 3.5, halfWid * 0.54, 0, 0, Math.PI * 2);
  ctx.fill();

  const hx = neckLen + 2.0 + headDrop * 0.55;
  const headBase = a.coat.pattern === 'piebald' ? secCol : baseCol;

  // Outstretched bovine ears swept gently back-and-out
  drawSculptedEars(
    ctx,
    hx - 2.3,
    2.25,
    2.9,
    1.3,
    1.95 - a.earAlert * 0.22,
    headBase,
    mixColor(accentCol, '#ccb0a8', 0.45),
    null,
    detailZoom
  );

  ctx.fillStyle = makeDomeGradient(
    ctx,
    hx + 0.2,
    0,
    4.2,
    sunLX,
    sunLY,
    shadeColor(headBase, 1.18),
    headBase,
    shadeColor(headBase, 0.66)
  );
  ctx.beginPath();
  ctx.moveTo(hx - 2.8, -2.45);
  ctx.quadraticCurveTo(hx - 0.4, -2.85, hx + 2.1, -2.05);
  ctx.quadraticCurveTo(hx + 4.1, -2.05, hx + 4.5, -0.95);
  ctx.quadraticCurveTo(hx + 4.8, 0, hx + 4.5, 0.95);
  ctx.quadraticCurveTo(hx + 4.1, 2.05, hx + 2.1, 2.05);
  ctx.quadraticCurveTo(hx - 0.4, 2.85, hx - 2.8, 2.45);
  ctx.quadraticCurveTo(hx - 3.3, 0, hx - 2.8, -2.45);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgbaColor(deepShadow, 0.42);
  ctx.lineWidth = 0.36;
  ctx.stroke();

  if (a.coat.pattern === 'piebald') {
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(hx - 1.5, 0);
    ctx.lineTo(hx + 0.7, -0.88);
    ctx.lineTo(hx + 2.1, 0);
    ctx.lineTo(hx + 0.7, 0.88);
    ctx.closePath();
    ctx.fill();
  }

  // Realistic muted fleshy bovine muzzle
  const muzzleCol = mixColor(accentCol, '#8c6d66', 0.34);
  drawWetNose(ctx, hx + 3.55, 0, 1.35, 1.88, muzzleCol, detailZoom);

  // Curved 3D-shaded ivory horns with dark keratin tips
  if (a.hasHorns) {
    for (const s of [-1, 1]) {
      ctx.strokeStyle = '#918068';
      ctx.lineWidth = 1.45;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - 1.85, s * 1.88);
      ctx.quadraticCurveTo(hx - 0.75, s * 4.65, hx + 1.45, s * 4.35);
      ctx.stroke();

      ctx.strokeStyle = '#e5dcc9';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(hx - 1.75, s * 1.98);
      ctx.quadraticCurveTo(hx - 0.75, s * 4.52, hx + 1.15, s * 4.32);
      ctx.stroke();

      ctx.fillStyle = '#26201b';
      ctx.beginPath();
      ctx.arc(hx + 1.45, s * 4.35, 0.48, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawAnatomicalEyes(ctx, hx + 0.45, 1.85, 0.5, '#2b1d14', a.eyeShineIntensity, '#fef08a', detailZoom);

  ctx.restore();
}

// ============================================================================
// 11. SHEEP (ОВЦА) — Unified softly scalloped plush woolly fleece, warm crevice shadows, narrow face
// ============================================================================
export function drawSheep(ctx: CanvasRenderingContext2D, r: AnimalRenderContext): void {
  const { a, halfLen, halfWid, baseCol, secCol, accentCol, deepShadow, highlightCol, sunLX, sunLY, breath, spineBend, tailWag, headDrop, detailZoom } = r;

  drawArticulatedLimbs(ctx, r.legs, {
    upperColor: shadeColor(accentCol, 0.9),
    lowerColor: accentCol,
    footColor: '#141210',
    upperRadius: halfWid * 0.17,
    kneeRadius: halfWid * 0.12,
    footRadius: halfWid * 0.13,
    terminalStyle: 'cloven_hoof',
    detailZoom,
  });

  // Woolly bobbed tail
  ctx.fillStyle = makeVolumetricGradient(ctx, -halfLen * 0.88, tailWag * 0.7, 2.0, sunLX, sunLY, highlightCol, baseCol, secCol);
  ctx.beginPath();
  ctx.ellipse(-halfLen * 0.88, tailWag * 0.8 + spineBend * halfLen * 0.13, 1.9, 1.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // Build unified scalloped woolly silhouette path around the sheep's torso!
  const traceWoolSilhouette = () => {
    const lobes = 16;
    const rxBase = halfLen * 0.84;
    const ryBase = halfWid * 1.02 * breath;
    ctx.beginPath();
    for (let i = 0; i <= lobes; i++) {
      const idx = i % lobes;
      const t = (idx / lobes) * Math.PI * 2;
      const tNext = (((idx + 1) % lobes) / lobes) * Math.PI * 2;
      const tMid = (t + (tNext < t ? tNext + Math.PI * 2 : tNext)) * 0.5;
      const bump = 1.06 + (seededRand(a.seed, idx + 7) - 0.5) * 0.1;
      const pinch = 0.94 + (seededRand(a.seed, idx + 31) - 0.5) * 0.06;
      const px = Math.cos(t) * rxBase * pinch;
      const py = Math.sin(t) * ryBase * pinch;
      const cx = Math.cos(tMid) * rxBase * bump;
      const cy = Math.sin(tMid) * ryBase * bump;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        const prevIdx = (idx - 1 + lobes) % lobes;
        const prevT = (prevIdx / lobes) * Math.PI * 2;
        const prevMid = (prevT + (t < prevT ? t + Math.PI * 2 : t)) * 0.5;
        const prevBump = 1.07 + (seededRand(a.seed, prevIdx + 7) - 0.5) * 0.1;
        ctx.quadraticCurveTo(
          Math.cos(prevMid) * rxBase * prevBump,
          Math.sin(prevMid) * ryBase * prevBump,
          px,
          py
        );
      }
      void cx;
      void cy;
    }
    ctx.closePath();
  };

  // Unified 3D directional sunlight shading across the entire plush fleece blanket
  traceWoolSilhouette();
  ctx.fillStyle = makeVolumetricGradient(
    ctx,
    0,
    0,
    halfWid * 1.18,
    sunLX,
    sunLY,
    highlightCol,
    baseCol,
    mixColor(secCol, deepShadow, 0.35)
  );
  ctx.fill();

  // Soft internal wool staple clusters & crimped fleece texture clipped cleanly inside!
  ctx.save();
  traceWoolSilhouette();
  ctx.clip();

  // Warm sunlit dorsal ridge puffiness (feathered radial cloud)
  const ridgeGrad = ctx.createRadialGradient(
    sunLX * 1.4,
    sunLY * 1.6,
    halfWid * 0.1,
    0,
    0,
    halfLen * 0.78
  );
  ridgeGrad.addColorStop(0, rgbaColor(highlightCol, 0.46));
  ridgeGrad.addColorStop(0.65, rgbaColor(baseCol, 0.16));
  ridgeGrad.addColorStop(1, rgbaColor(baseCol, 0));
  ctx.fillStyle = ridgeGrad;
  ctx.fillRect(-halfLen * 1.1, -halfWid * 1.25, halfLen * 2.2, halfWid * 2.5);

  // Soft billowing wool staple clouds with feathered edges (zero hard polka-dot rims)
  const tuftCount = detailZoom ? 20 : 10;
  for (let i = 0; i < tuftCount; i++) {
    const tx = (seededRand(a.seed, i * 4 + 11) - 0.5) * halfLen * 1.38;
    const ty = (seededRand(a.seed, i * 4 + 12) - 0.5) * halfWid * 1.56 * breath;
    const tr = halfWid * (0.22 + seededRand(a.seed, i * 4 + 13) * 0.16);

    // Feathered anti-sun crevice shade
    const shX = tx - sunLX * 0.42;
    const shY = ty - sunLY * 0.42;
    const shGrad = ctx.createRadialGradient(shX, shY, 0, shX, shY, tr * 1.05);
    shGrad.addColorStop(0, rgbaColor(secCol, 0.3));
    shGrad.addColorStop(0.6, rgbaColor(secCol, 0.12));
    shGrad.addColorStop(1, rgbaColor(secCol, 0));
    ctx.fillStyle = shGrad;
    ctx.beginPath();
    ctx.arc(shX, shY, tr * 1.05, 0, Math.PI * 2);
    ctx.fill();

    // Feathered sunlit plush fleece crown
    const hiX = tx + sunLX * 0.28;
    const hiY = ty + sunLY * 0.28;
    const hiGrad = ctx.createRadialGradient(hiX, hiY, 0, hiX, hiY, tr * 0.88);
    hiGrad.addColorStop(0, rgbaColor(highlightCol, 0.48));
    hiGrad.addColorStop(0.55, rgbaColor(highlightCol, 0.16));
    hiGrad.addColorStop(1, rgbaColor(highlightCol, 0));
    ctx.fillStyle = hiGrad;
    ctx.beginPath();
    ctx.arc(hiX, hiY, tr * 0.88, 0, Math.PI * 2);
    ctx.fill();
  }

  if (detailZoom) {
    // Delicate crimped wool curl crevices + paired sunlit fleece ridges
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.26;
    ctx.strokeStyle = rgbaColor(secCol, 0.34);
    ctx.beginPath();
    for (let i = 0; i < 20; i++) {
      const cx = (seededRand(a.seed, i * 4 + 81) - 0.5) * halfLen * 1.32;
      const cy = (seededRand(a.seed, i * 4 + 82) - 0.5) * halfWid * 1.48 * breath;
      const cr = 0.6 + seededRand(a.seed, i * 4 + 83) * 0.48;
      const sa = seededRand(a.seed, i * 4 + 84) * Math.PI * 2;
      ctx.moveTo(cx + Math.cos(sa) * cr, cy + Math.sin(sa) * cr);
      ctx.arc(cx, cy, cr, sa, sa + Math.PI * 0.95);
    }
    ctx.stroke();

    ctx.lineWidth = 0.22;
    ctx.strokeStyle = rgbaColor(highlightCol, 0.42);
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const cx = (seededRand(a.seed, i * 4 + 141) - 0.5) * halfLen * 1.24 + sunLX * 0.2;
      const cy = (seededRand(a.seed, i * 4 + 142) - 0.5) * halfWid * 1.38 * breath + sunLY * 0.2;
      const cr = 0.52 + seededRand(a.seed, i * 4 + 143) * 0.44;
      const sa = seededRand(a.seed, i * 4 + 144) * Math.PI * 2;
      ctx.moveTo(cx + Math.cos(sa) * cr, cy + Math.sin(sa) * cr);
      ctx.arc(cx, cy, cr, sa, sa + Math.PI * 0.85);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Gentle soft fleece border
  traceWoolSilhouette();
  ctx.strokeStyle = rgbaColor(secCol, 0.58);
  ctx.lineWidth = 0.42;
  ctx.stroke();

  // Narrow ovine face peeking out of thick wool collar
  ctx.save();
  ctx.translate(halfLen * 0.64, spineBend * halfLen * 0.08);
  ctx.rotate(a.headYaw * 0.75);

  const hx = 2.0 + headDrop * 0.65;

  drawSculptedEars(
    ctx,
    hx - 1.35,
    1.25,
    2.2,
    0.9,
    2.02 - a.earAlert * 0.28,
    accentCol,
    mixColor(accentCol, '#b8a398', 0.42),
    null,
    detailZoom
  );

  ctx.fillStyle = makeDomeGradient(
    ctx,
    hx + 0.2,
    0,
    2.8,
    sunLX,
    sunLY,
    shadeColor(accentCol, 1.24),
    accentCol,
    shadeColor(accentCol, 0.68)
  );
  ctx.beginPath();
  ctx.moveTo(hx - 1.7, -1.48);
  ctx.quadraticCurveTo(hx + 0.4, -1.58, hx + 2.35, -0.88);
  ctx.quadraticCurveTo(hx + 3.0, 0, hx + 2.35, 0.88);
  ctx.quadraticCurveTo(hx + 0.4, 1.58, hx - 1.7, 1.48);
  ctx.closePath();
  ctx.fill();

  // Plush woolly forehead crown tuft
  ctx.fillStyle = makeVolumetricGradient(ctx, hx - 1.25, 0, 1.6, sunLX, sunLY, highlightCol, baseCol, secCol);
  ctx.beginPath();
  ctx.arc(hx - 1.4, -0.42, 1.08, 0, Math.PI * 2);
  ctx.arc(hx - 1.4, 0.42, 1.08, 0, Math.PI * 2);
  ctx.arc(hx - 0.98, 0, 1.18, 0, Math.PI * 2);
  ctx.fill();

  drawWetNose(ctx, hx + 2.68, 0, 0.45, 0.6, shadeColor(accentCol, 0.55), detailZoom);
  drawAnatomicalEyes(ctx, hx + 0.35, 1.12, 0.38, '#a16207', a.eyeShineIntensity, '#fef9c3', detailZoom);

  ctx.restore();
}

// ============================================================================
// 12. HORSE (ЛОШАДЬ) — Athletic equine musculature, glossy coat, flowing mane & tail, noble head
// ============================================================================
export function drawHorse(ctx: CanvasRenderingContext2D, r: AnimalRenderContext): void {
  const { a, halfLen, halfWid, baseCol, secCol, accentCol, deepShadow, highlightCol, rimCol, sunLX, sunLY, stretch, breath, spineBend, tailWag, headDrop, detailZoom } = r;

  const hasWhiteSocks = a.seed % 3 === 1;
  drawArticulatedLimbs(ctx, r.legs, {
    upperColor: shadeColor(baseCol, 0.85),
    lowerColor: hasWhiteSocks ? '#ece8e1' : accentCol,
    footColor: '#171412',
    upperRadius: halfWid * 0.23,
    kneeRadius: halfWid * 0.14,
    footRadius: halfWid * 0.19,
    terminalStyle: 'solid_hoof',
    detailZoom,
  });

  // Long sweeping multi-strand horsehair tail
  ctx.save();
  ctx.translate(-halfLen * 0.84 * stretch, spineBend * halfLen * 0.15);
  ctx.rotate(tailWag * 0.46 + spineBend * 0.55);

  const tLen = halfLen * 0.72;
  const tailGrad = makeVolumetricGradient(ctx, -tLen * 0.4, 0, 2.4, sunLX, sunLY, shadeColor(accentCol, 1.38), accentCol, shadeColor(accentCol, 0.62));
  ctx.fillStyle = tailGrad;
  ctx.beginPath();
  ctx.moveTo(0, -1.05);
  ctx.bezierCurveTo(-tLen * 0.28, -2.4, -tLen * 0.72, -1.85, -tLen, 0.2);
  ctx.bezierCurveTo(-tLen * 0.72, 2.05, -tLen * 0.28, 2.35, 0, 1.05);
  ctx.closePath();
  ctx.fill();

  if (detailZoom) {
    ctx.strokeStyle = rgbaColor(shadeColor(accentCol, 1.65), 0.34);
    ctx.lineWidth = 0.34;
    ctx.beginPath();
    for (let s = -1; s <= 1; s++) {
      ctx.moveTo(-0.5, s * 0.55);
      ctx.quadraticCurveTo(-tLen * 0.45, s * 1.4, -tLen * 0.92, s * 0.42);
    }
    ctx.stroke();
  }
  ctx.restore();

  const profile: TorsoProfilePoint[] = [
    { x: -halfLen * 0.86 * stretch, w: halfWid * 0.28 },
    { x: -halfLen * 0.62 * stretch, w: halfWid * 0.92 * breath },
    { x: -halfLen * 0.28 * stretch, w: halfWid * 0.96 * breath },
    { x: halfLen * 0.04 * stretch, w: halfWid * 0.86 * breath },
    { x: halfLen * 0.36 * stretch, w: halfWid * 0.98 * breath },
    { x: halfLen * 0.62 * stretch, w: halfWid * 0.78 * breath },
    { x: halfLen * 0.74 * stretch, w: halfWid * 0.44 },
  ];

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.fillStyle = makeVolumetricGradient(ctx, 0, 0, halfWid * 1.1, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.fill();

  ctx.save();
  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.clip();

  if (a.coat.pattern === 'piebald') {
    for (let p = 0; p < 4; p++) {
      const px = (seededRand(a.seed, p * 4 + 1) - 0.5) * halfLen * 1.25;
      const py = (seededRand(a.seed, p * 4 + 2) - 0.5) * halfWid * 1.4;
      const prx = halfLen * (0.22 + seededRand(a.seed, p * 4 + 3) * 0.2);
      const pry = halfWid * (0.4 + seededRand(a.seed, p * 4 + 4) * 0.32);
      ctx.fillStyle = makeVolumetricGradient(ctx, px, py, Math.max(prx, pry), sunLX, sunLY, shadeColor(secCol, 1.2), secCol, shadeColor(secCol, 0.7));
      ctx.beginPath();
      ctx.ellipse(px, py, prx, pry, seededRand(a.seed, p + 17) * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (a.coat.pattern === 'dapple') {
    for (let d = 0; d < 12; d++) {
      const dx = (seededRand(a.seed, d * 3 + 11) - 0.5) * halfLen * 1.25;
      const dy = (seededRand(a.seed, d * 3 + 12) - 0.5) * halfWid * 1.35;
      const dr = 1.15 + seededRand(a.seed, d * 3 + 13) * 0.9;
      ctx.strokeStyle = rgbaColor(secCol, 0.48);
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.arc(dx, dy, dr, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Glossy equine croup & shoulder muscular sheen
  ctx.fillStyle = rgbaColor(rimCol, 0.22);
  ctx.beginPath();
  ctx.ellipse(-halfLen * 0.44 * stretch, -halfWid * 0.24, halfLen * 0.22, halfWid * 0.34, 0.12, 0, Math.PI * 2);
  ctx.ellipse(-halfLen * 0.44 * stretch, halfWid * 0.24, halfLen * 0.22, halfWid * 0.34, -0.12, 0, Math.PI * 2);
  ctx.ellipse(halfLen * 0.34 * stretch, 0, halfLen * 0.2, halfWid * 0.44, 0, 0, Math.PI * 2);
  ctx.fill();

  drawDorsalSpineHighlight(ctx, -halfLen * 0.68, halfLen * 0.54, halfWid * 0.13, rgbaColor(deepShadow, 0.28), spineBend, halfLen);

  ctx.fillStyle = makeVolumetricGradient(
    ctx,
    0,
    0,
    halfWid * 1.12,
    sunLX,
    sunLY,
    'rgba(255, 252, 244, 0.12)',
    'rgba(0, 0, 0, 0)',
    'rgba(8, 10, 14, 0.24)'
  );
  ctx.fillRect(-halfLen * 1.1, -halfWid * 1.3, halfLen * 2.2, halfWid * 2.6);
  ctx.restore();

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.strokeStyle = rgbaColor(deepShadow, 0.46);
  ctx.lineWidth = 0.44;
  ctx.stroke();

  // Long muscular arched equine neck, flowing side-draped mane & noble tapered head
  ctx.save();
  ctx.translate(halfLen * 0.52 * stretch, spineBend * halfLen * 0.09);
  ctx.rotate(a.headYaw * 0.72);

  const neckLen = halfLen * 0.42 + headDrop * 0.55;
  drawTaperedLimbSegment(
    ctx,
    -1.0,
    0,
    halfWid * 0.5,
    neckLen,
    0,
    halfWid * 0.29,
    makeVolumetricGradient(ctx, neckLen * 0.45, 0, halfWid * 0.5, sunLX, sunLY, highlightCol, baseCol, deepShadow)
  );

  // Flowing multi-strand mane draping gracefully along one side of the neck crest
  const maneSide = a.seed % 2 === 0 ? -1 : 1;
  ctx.fillStyle = accentCol;
  ctx.beginPath();
  ctx.moveTo(-2.0, maneSide * 0.15);
  ctx.quadraticCurveTo(neckLen * 0.42, maneSide * (halfWid * 0.48), neckLen + 0.1, maneSide * 0.88);
  ctx.quadraticCurveTo(neckLen * 0.45, maneSide * 0.12, -2.0, -maneSide * 0.42);
  ctx.closePath();
  ctx.fill();

  if (detailZoom) {
    ctx.strokeStyle = rgbaColor(shadeColor(accentCol, 1.55), 0.34);
    ctx.lineWidth = 0.32;
    ctx.beginPath();
    for (let m = 0; m < 8; m++) {
      const mx = -1.1 + (m / 7) * neckLen;
      ctx.moveTo(mx, 0);
      ctx.quadraticCurveTo(mx - 0.5, maneSide * 1.3, mx - 1.25, maneSide * 2.15);
    }
    ctx.stroke();
  }

  const hx = neckLen + 2.1 + headDrop * 0.5;

  // Alert pricked equine ears angled subtly out-and-back
  drawSculptedEars(
    ctx,
    hx - 2.6,
    1.35,
    2.4,
    0.88,
    2.02 - a.earAlert * 0.34,
    baseCol,
    mixColor(baseCol, '#e7dcd0', 0.45),
    accentCol,
    detailZoom
  );

  ctx.fillStyle = makeDomeGradient(ctx, hx + 0.4, 0, 4.4, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.beginPath();
  ctx.moveTo(hx - 2.8, -1.95);
  ctx.quadraticCurveTo(hx - 0.5, -2.2, hx + 1.8, -1.35);
  ctx.quadraticCurveTo(hx + 4.1, -1.4, hx + 4.8, -0.75);
  ctx.quadraticCurveTo(hx + 5.1, 0, hx + 4.8, 0.75);
  ctx.quadraticCurveTo(hx + 4.1, 1.4, hx + 1.8, 1.35);
  ctx.quadraticCurveTo(hx - 0.5, 2.2, hx - 2.8, 1.95);
  ctx.quadraticCurveTo(hx - 3.3, 0, hx - 2.8, -1.95);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgbaColor(deepShadow, 0.42);
  ctx.lineWidth = 0.36;
  ctx.stroke();

  if (a.seed % 3 === 0) {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(hx + 1.3, 0, 2.5, 0.56, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (a.seed % 3 === 2) {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(hx - 0.5, 0, 0.68, 0, Math.PI * 2);
    ctx.fill();
  }

  // Forelock mane tuft spilling between ears
  ctx.fillStyle = accentCol;
  ctx.beginPath();
  ctx.moveTo(hx - 2.65, -0.58);
  ctx.quadraticCurveTo(hx - 1.45, 0, hx - 0.55, 0.22);
  ctx.quadraticCurveTo(hx - 1.55, 0.68, hx - 2.65, 0.58);
  ctx.closePath();
  ctx.fill();

  drawWetNose(ctx, hx + 4.15, 0, 0.88, 1.24, shadeColor(accentCol, 1.15), detailZoom);

  drawAnatomicalEyes(ctx, hx - 0.15, 1.45, 0.48, '#2b1b10', a.eyeShineIntensity, '#fde68a', detailZoom);

  ctx.restore();
}

// ============================================================================
// 13. DOG (СОБАКА) — Village & courtyard breeds, sleek collar with tag, feathered tail, curled sleep
// ============================================================================
export function drawDog(ctx: CanvasRenderingContext2D, r: AnimalRenderContext): void {
  const { a, halfLen, halfWid, baseCol, secCol, bellyCol, accentCol, deepShadow, highlightCol, rimCol, sunLX, sunLY, stretch, breath, spineBend, detailZoom } = r;

  if (a.state === 'resting') {
    const rad = halfLen * 0.66 * breath;
    ctx.fillStyle = makeDomeGradient(ctx, 0, 0, rad, sunLX, sunLY, highlightCol, baseCol, deepShadow);
    ctx.beginPath();
    ctx.ellipse(0, 0, rad * 1.04, rad * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgbaColor(secCol, 0.48);
    ctx.beginPath();
    ctx.arc(-rad * 0.18, rad * 0.1, rad * 0.58, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = makeVolumetricGradient(ctx, 0, rad * 0.5, rad, sunLX, sunLY, highlightCol, baseCol, secCol);
    ctx.lineWidth = Math.max(1.4, halfWid * 0.4);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, rad * 0.88, 0.55, 2.55);
    ctx.stroke();

    ctx.save();
    ctx.translate(rad * 0.42, -rad * 0.16);
    ctx.rotate(0.75);
    ctx.fillStyle = makeDomeGradient(ctx, 0.5, 0, 2.6, sunLX, sunLY, highlightCol, baseCol, deepShadow);
    ctx.beginPath();
    ctx.ellipse(0.5, 0, 2.45, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.ellipse(-0.4, -1.45, 1.15, 0.68, 0.4, 0, Math.PI * 2);
    ctx.ellipse(-0.4, 1.45, 1.15, 0.68, -0.4, 0, Math.PI * 2);
    ctx.fill();
    drawWetNose(ctx, 2.75, 0, 0.46, 0.48, '#09090b', detailZoom);
    ctx.restore();
    return;
  }

  drawArticulatedLimbs(ctx, r.legs, {
    upperColor: mixColor(baseCol, bellyCol, 0.35),
    lowerColor: bellyCol,
    footColor: shadeColor(bellyCol, 0.65),
    upperRadius: halfWid * 0.23,
    kneeRadius: halfWid * 0.15,
    footRadius: halfWid * 0.18,
    terminalStyle: 'canid_paw',
    detailZoom,
  });

  // Expressive feathered wagging dog tail
  const isHusky = a.coat.id === 'husky_mix';
  const wagAmp = a.state === 'fleeing' ? 0.14 : 0.48 + a.tailHeight * 0.52;
  const tAngle = Math.sin(a.tailPhase) * wagAmp + spineBend * 0.42;
  ctx.save();
  ctx.translate(-halfLen * 0.74 * stretch, spineBend * halfLen * 0.14);
  ctx.rotate(tAngle);

  const tLen = halfLen * (isHusky ? 0.62 : 0.54);
  const tWid = isHusky ? 1.75 : 1.05;
  ctx.fillStyle = makeVolumetricGradient(ctx, -tLen * 0.45, 0, tWid, sunLX, sunLY, bellyCol, baseCol, secCol);
  ctx.beginPath();
  ctx.moveTo(0, -tWid * 0.52);
  ctx.quadraticCurveTo(-tLen * 0.45, -tWid * 1.1, -tLen, 0);
  ctx.quadraticCurveTo(-tLen * 0.45, tWid * 0.82, 0, tWid * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const profile: TorsoProfilePoint[] = [
    { x: -halfLen * 0.80 * stretch, w: halfWid * 0.26 },
    { x: -halfLen * 0.52 * stretch, w: halfWid * 0.82 * breath },
    { x: -halfLen * 0.12 * stretch, w: halfWid * 0.74 * breath },
    { x: halfLen * 0.28 * stretch, w: halfWid * 0.96 * breath },
    { x: halfLen * 0.56 * stretch, w: halfWid * 0.82 * breath },
    { x: halfLen * 0.72 * stretch, w: halfWid * 0.46 },
  ];

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.fillStyle = makeVolumetricGradient(ctx, 0, 0, halfWid * 1.05, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.fill();

  ctx.save();
  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.clip();

  // Softly blended breed coat markings (natural feathered transitions!)
  if (a.coat.pattern === 'saddle') {
    const sGrad = ctx.createRadialGradient(-halfLen * 0.04, 0, halfWid * 0.15, -halfLen * 0.04, 0, halfLen * 0.6);
    sGrad.addColorStop(0, rgbaColor(secCol, 0.92));
    sGrad.addColorStop(0.62, rgbaColor(secCol, 0.58));
    sGrad.addColorStop(1, rgbaColor(secCol, 0));
    ctx.fillStyle = sGrad;
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.04, 0, halfLen * 0.62, halfWid * 0.76, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (a.coat.pattern === 'spotted' || a.coat.pattern === 'piebald') {
    for (let p = 0; p < 4; p++) {
      const px = (seededRand(a.seed, p * 4 + 1) - 0.5) * halfLen * 1.15;
      const py = (seededRand(a.seed, p * 4 + 2) - 0.5) * halfWid * 1.3;
      const prx = halfLen * (0.18 + seededRand(a.seed, p * 4 + 3) * 0.16);
      const pry = halfWid * (0.34 + seededRand(a.seed, p * 4 + 4) * 0.28);
      ctx.fillStyle = secCol;
      ctx.beginPath();
      ctx.ellipse(px, py, prx, pry, seededRand(a.seed, p + 12) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = rgbaColor(secCol, 0.28);
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.06, 0, halfLen * 0.52, halfWid * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (detailZoom) {
    drawFurTextureStrokes(
      ctx,
      a.seed,
      halfLen * 0.75,
      halfWid * 0.85,
      rgbaColor(rimCol, 0.2),
      rgbaColor(deepShadow, 0.28),
      24,
      1.3,
      0.26,
      spineBend
    );
  }
  ctx.restore();

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.strokeStyle = rgbaColor(deepShadow, 0.46);
  ctx.lineWidth = 0.38;
  ctx.stroke();

  // Sleek worn leather/nylon collar with gleaming metallic D-ring
  if (a.coat.collarColor) {
    const cx = halfLen * 0.50 * stretch;
    const cy = spineBend * halfLen * 0.08;
    ctx.strokeStyle = shadeColor(a.coat.collarColor, 0.62);
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy - halfWid * 0.64);
    ctx.quadraticCurveTo(cx + 0.7, cy, cx, cy + halfWid * 0.64);
    ctx.stroke();

    ctx.strokeStyle = a.coat.collarColor;
    ctx.lineWidth = 0.82;
    ctx.beginPath();
    ctx.moveTo(cx, cy - halfWid * 0.62);
    ctx.quadraticCurveTo(cx + 0.7, cy, cx, cy + halfWid * 0.62);
    ctx.stroke();

    if (detailZoom) {
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.24;
      ctx.beginPath();
      ctx.arc(cx + 0.42, cy, 0.46, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Sculpted canine skull, snout mask, pricked/floppy ears & soulful lateral eyes
  ctx.save();
  ctx.translate(halfLen * 0.60 * stretch, spineBend * halfLen * 0.09);
  ctx.rotate(a.headYaw);

  ctx.fillStyle = makeDomeGradient(ctx, 1.3, 0, 2.8, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.beginPath();
  ctx.moveTo(-0.8, -1.98);
  ctx.quadraticCurveTo(1.2, -2.2, 2.55, -1.28);
  ctx.lineTo(4.6, -0.74);
  ctx.quadraticCurveTo(5.05, 0, 4.6, 0.74);
  ctx.lineTo(2.55, 1.28);
  ctx.quadraticCurveTo(1.2, 2.2, -0.8, 1.98);
  ctx.quadraticCurveTo(-1.35, 0, -0.8, -1.98);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = isHusky ? '#f1f5f9' : rgbaColor(accentCol, 0.68);
  ctx.beginPath();
  ctx.ellipse(3.3, 0, 1.48, 0.88, 0, 0, Math.PI * 2);
  ctx.fill();

  if (a.seed % 2 === 0 || isHusky || a.coat.id === 'shepherd_saddle') {
    drawSculptedEars(
      ctx,
      0.05,
      1.22,
      2.1,
      1.0,
      2.02 - a.earAlert * 0.32,
      secCol,
      mixColor(bellyCol, '#d9beb4', 0.35),
      null,
      detailZoom
    );
  } else {
    for (const s of [-1, 1]) {
      ctx.fillStyle = makeDomeGradient(ctx, 0.6, s * 1.85, 1.5, sunLX, sunLY, shadeColor(secCol, 1.18), secCol, shadeColor(secCol, 0.68));
      ctx.beginPath();
      ctx.ellipse(0.55, s * 1.92, 1.45, 0.88, s * -0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawWetNose(ctx, 4.75, 0, 0.52, 0.56, '#09090b', detailZoom);
  if (detailZoom) {
    drawWhiskers(ctx, 4.0, 0.62, 0.95, 'rgba(241, 245, 249, 0.34)');
  }
  drawAnatomicalEyes(
    ctx,
    2.1,
    0.94,
    0.38,
    isHusky ? '#60a5fa' : '#451a03',
    a.eyeShineIntensity,
    '#bef264',
    detailZoom
  );

  ctx.restore();
}

// ============================================================================
// 14. CAT (КОШКА) — Supple sinuous feline, S-curved tail, tabby/calico/tuxedo/black, natural eyes & nose
// ============================================================================
export function drawCat(ctx: CanvasRenderingContext2D, r: AnimalRenderContext): void {
  const { a, halfLen, halfWid, baseCol, secCol, bellyCol, accentCol, deepShadow, highlightCol, rimCol, sunLX, sunLY, stretch, breath, spineBend, detailZoom } = r;

  if (a.state === 'resting') {
    const rx = halfLen * 0.68 * breath;
    const ry = halfWid * 1.18 * breath;

    ctx.fillStyle = makeDomeGradient(ctx, 0, 0, Math.max(rx, ry), sunLX, sunLY, highlightCol, baseCol, deepShadow);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    if (a.coat.pattern === 'tabby') {
      ctx.strokeStyle = rgbaColor(secCol, 0.68);
      ctx.lineWidth = 0.65;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 1.35, -ry);
        ctx.quadraticCurveTo(i * 1.35 - 0.55, 0, i * 1.35, ry);
        ctx.stroke();
      }
    } else if (a.coat.pattern === 'calico') {
      ctx.fillStyle = secCol;
      ctx.beginPath();
      ctx.ellipse(-0.9, -0.6, rx * 0.55, ry * 0.55, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accentCol;
      ctx.beginPath();
      ctx.ellipse(0.8, 0.7, rx * 0.42, ry * 0.48, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = shadeColor(baseCol, 0.88);
    ctx.lineWidth = 1.25;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, ry * 1.04, 0.45, 2.65);
    ctx.stroke();

    ctx.save();
    ctx.translate(rx * 0.62, -0.45);
    ctx.rotate(0.5);
    ctx.fillStyle = makeDomeGradient(ctx, 0, 0, 1.9, sunLX, sunLY, highlightCol, baseCol, deepShadow);
    ctx.beginPath();
    ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();
    drawSculptedEars(ctx, -0.3, 0.92, 1.4, 0.72, 1.95, secCol, '#cfa2a8', null, detailZoom);
    ctx.restore();
    return;
  }

  const pawCol = a.coat.pattern === 'tuxedo' ? '#f1f5f9' : mixColor(baseCol, bellyCol, 0.35);
  drawArticulatedLimbs(ctx, r.legs, {
    upperColor: baseCol,
    lowerColor: a.coat.pattern === 'tuxedo' ? '#f1f5f9' : shadeColor(baseCol, 0.92),
    footColor: pawCol,
    upperRadius: halfWid * 0.22,
    kneeRadius: halfWid * 0.14,
    footRadius: halfWid * 0.16,
    terminalStyle: 'feline_paw',
    detailZoom,
  });

  // Expressive sinuous S-curved cat tail
  const tailSway = Math.sin(a.tailPhase) * 0.68;
  const puff = a.fear > 0.55 ? 1.62 : 1.0;
  ctx.save();
  ctx.translate(-halfLen * 0.74 * stretch, spineBend * halfLen * 0.15);
  ctx.lineCap = 'round';

  ctx.strokeStyle = deepShadow;
  ctx.lineWidth = 1.25 * puff;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(
    -halfLen * 0.34,
    tailSway * 2.8,
    -halfLen * 0.66,
    -tailSway * 2.4,
    -halfLen * 0.96,
    tailSway * 1.65
  );
  ctx.stroke();

  ctx.strokeStyle = baseCol;
  ctx.lineWidth = 0.98 * puff;
  ctx.stroke();

  if (detailZoom && a.coat.pattern === 'tabby') {
    ctx.strokeStyle = secCol;
    ctx.lineWidth = 0.64 * puff;
    ctx.setLineDash([0.7, 0.8]);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (a.coat.pattern === 'tuxedo') {
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.arc(-halfLen * 0.96, tailSway * 1.65, 0.55 * puff, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const profile: TorsoProfilePoint[] = [
    { x: -halfLen * 0.80 * stretch, w: halfWid * 0.24 },
    { x: -halfLen * 0.50 * stretch, w: halfWid * 0.84 * breath },
    { x: -halfLen * 0.08 * stretch, w: halfWid * 0.72 * breath },
    { x: halfLen * 0.32 * stretch, w: halfWid * 0.88 * breath },
    { x: halfLen * 0.60 * stretch, w: halfWid * 0.70 * breath },
    { x: halfLen * 0.72 * stretch, w: halfWid * 0.38 },
  ];

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.fillStyle = makeVolumetricGradient(ctx, 0, 0, halfWid * 1.04, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.fill();

  ctx.save();
  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.clip();

  if (a.coat.pattern === 'tabby') {
    drawDorsalSpineHighlight(ctx, -halfLen * 0.72, halfLen * 0.55, 0.65, rgbaColor(secCol, 0.85), spineBend, halfLen);
    ctx.strokeStyle = rgbaColor(secCol, 0.78);
    ctx.lineWidth = 0.58;
    ctx.lineCap = 'round';
    for (let st = -2; st <= 2; st++) {
      const sx = st * halfLen * 0.24;
      ctx.beginPath();
      ctx.moveTo(sx + 0.3, -halfWid * 0.88);
      ctx.quadraticCurveTo(sx - 0.5, 0, sx + 0.3, halfWid * 0.88);
      ctx.stroke();
    }
  } else if (a.coat.pattern === 'calico') {
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.28, -halfWid * 0.36, halfLen * 0.32, halfWid * 0.52, 0.35, 0, Math.PI * 2);
    ctx.ellipse(halfLen * 0.34, -halfWid * 0.18, halfLen * 0.2, halfWid * 0.38, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accentCol;
    ctx.beginPath();
    ctx.ellipse(halfLen * 0.14, halfWid * 0.36, halfLen * 0.28, halfWid * 0.46, -0.3, 0, Math.PI * 2);
    ctx.ellipse(-halfLen * 0.42, halfWid * 0.28, halfLen * 0.18, halfWid * 0.34, 0.25, 0, Math.PI * 2);
    ctx.fill();
  } else if (a.coat.pattern === 'tuxedo') {
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.ellipse(halfLen * 0.52, 0, halfLen * 0.22, halfWid * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.beginPath();
    ctx.ellipse(halfLen * 0.08, -halfWid * 0.18, halfLen * 0.45, halfWid * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle global 3D roundness pass over calico/tabby patches
  ctx.fillStyle = makeVolumetricGradient(
    ctx,
    0,
    0,
    halfWid * 1.05,
    sunLX,
    sunLY,
    'rgba(255, 250, 240, 0.08)',
    'rgba(0, 0, 0, 0)',
    'rgba(8, 10, 14, 0.22)'
  );
  ctx.fillRect(-halfLen, -halfWid * 1.2, halfLen * 2, halfWid * 2.4);

  if (detailZoom) {
    drawFurTextureStrokes(
      ctx,
      a.seed,
      halfLen * 0.74,
      halfWid * 0.82,
      rgbaColor(rimCol, 0.18),
      rgbaColor(deepShadow, 0.18),
      16,
      1.0,
      0.22,
      spineBend
    );
  }
  ctx.restore();

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.strokeStyle = rgbaColor(deepShadow, 0.42);
  ctx.lineWidth = 0.32;
  ctx.stroke();

  // Round sculpted feline head, natural triangular ears, subtle brow-tucked eyes & whiskers
  ctx.save();
  ctx.translate(halfLen * 0.62 * stretch, spineBend * halfLen * 0.09);
  ctx.rotate(a.headYaw);

  ctx.fillStyle = makeDomeGradient(ctx, 1.0, 0, 2.2, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.beginPath();
  ctx.ellipse(1.0, 0, 2.08, 1.88, 0, 0, Math.PI * 2);
  ctx.fill();

  if (a.coat.pattern === 'tuxedo') {
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(1.15, 0);
    ctx.lineTo(3.0, -0.82);
    ctx.lineTo(3.0, 0.82);
    ctx.closePath();
    ctx.fill();
  } else if (a.coat.pattern === 'tabby' && detailZoom) {
    ctx.strokeStyle = rgbaColor(secCol, 0.78);
    ctx.lineWidth = 0.28;
    ctx.beginPath();
    ctx.moveTo(0.2, -0.5); ctx.lineTo(1.1, -0.32);
    ctx.moveTo(0.2, 0); ctx.lineTo(1.2, 0);
    ctx.moveTo(0.2, 0.5); ctx.lineTo(1.1, 0.32);
    ctx.stroke();
  }

  // Crisp pointed triangular feline ears angled gently back-and-out with muted dusty-rose inner pinna
  drawSculptedEars(
    ctx,
    0.22,
    0.98,
    1.68,
    0.88,
    1.95 - a.earAlert * 0.26,
    secCol,
    '#c79a9e',
    null,
    detailZoom
  );

  // Tiny natural dusty-terracotta or charcoal feline nose leather
  const noseCol =
    a.coat.pattern === 'tuxedo' || a.coat.pattern === 'calico' || a.coat.id === 'ginger_tabby'
      ? '#a8706e'
      : '#272422';
  drawWetNose(ctx, 2.95, 0, 0.28, 0.34, noseCol, false);

  if (detailZoom) {
    drawWhiskers(ctx, 2.38, 0.58, 1.28, 'rgba(248, 250, 252, 0.44)');
  }

  // Subtle realistic brow-tucked feline eyes (muted olive-gold / amber tint)
  const irisCol = a.coat.id === 'ginger_tabby' ? '#b47824' : '#658a42';
  drawAnatomicalEyes(ctx, 1.72, 0.84, 0.32, irisCol, a.eyeShineIntensity, '#4ade80', detailZoom);

  ctx.restore();
}
