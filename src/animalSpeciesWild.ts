/** Procedural high-detail top-down models for all 9 wild fauna species. */
import {
  AnimalRenderContext,
  drawAnatomicalEyes,
  drawArticulatedLimbs,
  drawDorsalSpineHighlight,
  drawFurTextureStrokes,
  drawMooseAntlers,
  drawRoeAntlers,
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
// 1. MOOSE (ЛОСЬ) — Towering forest giant, humped withers, pale stockings, palmate antlers
// ============================================================================
export function drawMoose(ctx: CanvasRenderingContext2D, r: AnimalRenderContext): void {
  const { a, halfLen, halfWid, baseCol, secCol, bellyCol, accentCol, deepShadow, highlightCol, rimCol, sunLX, sunLY, stretch, breath, spineBend, tailWag, headDrop, detailZoom, isWinter } = r;

  drawArticulatedLimbs(ctx, r.legs, {
    upperColor: shadeColor(baseCol, 0.84),
    lowerColor: '#b5a692',
    footColor: '#171412',
    upperRadius: halfWid * 0.23,
    kneeRadius: halfWid * 0.15,
    footRadius: halfWid * 0.17,
    terminalStyle: 'cloven_hoof',
    detailZoom,
  });

  // Short stubby dark tail
  ctx.save();
  ctx.translate(-halfLen * 0.88 * stretch, spineBend * halfLen * 0.16);
  ctx.rotate(tailWag * 0.3);
  ctx.fillStyle = deepShadow;
  ctx.beginPath();
  ctx.ellipse(-1.2, 0, 2.0, 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const profile: TorsoProfilePoint[] = [
    { x: -halfLen * 0.88 * stretch, w: halfWid * 0.18 },
    { x: -halfLen * 0.68 * stretch, w: halfWid * 0.68 * breath },
    { x: -halfLen * 0.36 * stretch, w: halfWid * 0.78 * breath },
    { x: -halfLen * 0.08 * stretch, w: halfWid * 0.74 * breath },
    { x: halfLen * 0.24 * stretch, w: halfWid * 1.02 * breath },
    { x: halfLen * 0.50 * stretch, w: halfWid * 0.86 * breath },
    { x: halfLen * 0.70 * stretch, w: halfWid * 0.44 },
  ];

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.fillStyle = makeVolumetricGradient(ctx, 0, 0, halfWid * 1.1, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.fill();

  ctx.save();
  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.clip();

  // Subtle muscular croup domes & scapular definition
  ctx.fillStyle = rgbaColor(highlightCol, 0.22);
  ctx.beginPath();
  ctx.ellipse(-halfLen * 0.46 * stretch, -halfWid * 0.28, halfLen * 0.22, halfWid * 0.32, 0.15, 0, Math.PI * 2);
  ctx.ellipse(-halfLen * 0.46 * stretch, halfWid * 0.28, halfLen * 0.22, halfWid * 0.32, -0.15, 0, Math.PI * 2);
  ctx.fill();

  // Iconic towering shoulder withers hump & thick dark mane
  ctx.fillStyle = makeDomeGradient(
    ctx,
    halfLen * 0.24 * stretch,
    0,
    halfLen * 0.4,
    sunLX,
    sunLY,
    shadeColor(secCol, 1.25),
    secCol,
    deepShadow
  );
  ctx.beginPath();
  ctx.ellipse(halfLen * 0.24 * stretch, 0, halfLen * 0.38, halfWid * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();

  drawDorsalSpineHighlight(ctx, -halfLen * 0.72, halfLen * 0.56, halfWid * 0.18, rgbaColor(rimCol, 0.22), spineBend, halfLen);

  if (detailZoom) {
    drawFurTextureStrokes(
      ctx,
      a.seed,
      halfLen * 0.82,
      halfWid * 0.92,
      rgbaColor(rimCol, 0.18),
      rgbaColor(deepShadow, 0.34),
      38,
      2.1,
      0.34,
      spineBend
    );
  }
  ctx.restore();

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.strokeStyle = rgbaColor(deepShadow, 0.52);
  ctx.lineWidth = 0.48;
  ctx.stroke();

  // Articulated muscular neck & Roman-nosed head
  ctx.save();
  ctx.translate(halfLen * 0.54 * stretch, spineBend * halfLen * 0.11);
  ctx.rotate(a.headYaw);

  const neckLen = halfLen * 0.36 + headDrop * 0.5;
  ctx.fillStyle = makeVolumetricGradient(ctx, neckLen * 0.4, 0, halfWid * 0.55, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.beginPath();
  ctx.moveTo(-1.2, -halfWid * 0.52);
  ctx.quadraticCurveTo(neckLen * 0.5, -halfWid * 0.44, neckLen, -halfWid * 0.3);
  ctx.lineTo(neckLen, halfWid * 0.3);
  ctx.quadraticCurveTo(neckLen * 0.5, halfWid * 0.44, -1.2, halfWid * 0.52);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = secCol;
  ctx.lineWidth = halfWid * 0.24;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-0.5, 0);
  ctx.lineTo(neckLen * 0.86, 0);
  ctx.stroke();

  const hx = neckLen + 1.8 + headDrop * 0.55;

  // Large cupped mobile moose ears sweeping back-and-outward behind antlers
  drawSculptedEars(
    ctx,
    hx - 3.3,
    halfWid * 0.28,
    3.9,
    1.55,
    2.12 - a.earAlert * 0.28,
    secCol,
    mixColor(bellyCol, '#c7b5a1', 0.35),
    deepShadow,
    detailZoom
  );

  // Elongated sculpted skull & overhanging Roman muzzle
  ctx.fillStyle = makeDomeGradient(ctx, hx + 0.5, 0, 5.2, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.beginPath();
  ctx.moveTo(hx - 3.6, -2.15);
  ctx.quadraticCurveTo(hx - 1.2, -2.55, hx + 1.8, -1.85);
  ctx.quadraticCurveTo(hx + 4.3, -2.25, hx + 5.7, -1.05);
  ctx.quadraticCurveTo(hx + 6.3, 0, hx + 5.7, 1.05);
  ctx.quadraticCurveTo(hx + 4.3, 2.25, hx + 1.8, 1.85);
  ctx.quadraticCurveTo(hx - 1.2, 2.55, hx - 3.6, 2.15);
  ctx.quadraticCurveTo(hx - 4.3, 0, hx - 3.6, -2.15);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgbaColor(deepShadow, 0.45);
  ctx.lineWidth = 0.38;
  ctx.stroke();

  // Lighter nasal bridge & broad fleshy muzzle pad
  ctx.fillStyle = rgbaColor(bellyCol, 0.24);
  ctx.beginPath();
  ctx.ellipse(hx + 1.1, 0, 2.5, 0.88, 0, 0, Math.PI * 2);
  ctx.fill();

  drawWetNose(ctx, hx + 4.6, 0, 1.35, 1.65, mixColor(accentCol, '#3b2e26', 0.45), detailZoom);

  // Lateral brow-tucked dark eyes
  drawAnatomicalEyes(ctx, hx - 0.1, 1.82, 0.62, '#3b2414', a.eyeShineIntensity, '#fde68a', detailZoom);

  if (a.hasAntlers && !isWinter) {
    drawMooseAntlers(ctx, hx - 2.2, 0, halfWid * 1.72, detailZoom);
  }

  ctx.restore();
}

// ============================================================================
// 2. ROE DEER (КОСУЛЯ) — Graceful woodland cervid, white heart rump mirror, slender limbs
// ============================================================================
export function drawRoeDeer(ctx: CanvasRenderingContext2D, r: AnimalRenderContext): void {
  const { a, halfLen, halfWid, baseCol, secCol, bellyCol, deepShadow, highlightCol, rimCol, sunLX, sunLY, stretch, breath, spineBend, headDrop, detailZoom, isWinter } = r;

  drawArticulatedLimbs(ctx, r.legs, {
    upperColor: shadeColor(baseCol, 0.88),
    lowerColor: shadeColor(secCol, 0.8),
    footColor: '#141210',
    upperRadius: halfWid * 0.22,
    kneeRadius: halfWid * 0.13,
    footRadius: halfWid * 0.14,
    terminalStyle: 'cloven_hoof',
    detailZoom,
  });

  const profile: TorsoProfilePoint[] = [
    { x: -halfLen * 0.88 * stretch, w: halfWid * 0.26 },
    { x: -halfLen * 0.64 * stretch, w: halfWid * 0.84 * breath },
    { x: -halfLen * 0.25 * stretch, w: halfWid * 0.78 * breath },
    { x: halfLen * 0.05 * stretch, w: halfWid * 0.70 * breath },
    { x: halfLen * 0.36 * stretch, w: halfWid * 0.88 * breath },
    { x: halfLen * 0.62 * stretch, w: halfWid * 0.66 * breath },
    { x: halfLen * 0.76 * stretch, w: halfWid * 0.34 },
  ];

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.fillStyle = makeVolumetricGradient(ctx, 0, 0, halfWid * 1.05, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.fill();

  ctx.save();
  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.clip();

  // Soft blended heart-shaped white rump mirror ("зеркало")
  const mirrorBoost = a.state === 'fleeing' || a.state === 'alert' ? 1.15 : 1.0;
  const rumpGrad = ctx.createRadialGradient(-halfLen * 0.86 * stretch, 0, 0.4, -halfLen * 0.84 * stretch, 0, 2.8 * mirrorBoost);
  rumpGrad.addColorStop(0, '#f8f5ef');
  rumpGrad.addColorStop(0.72, '#ebe4d6');
  rumpGrad.addColorStop(1, rgbaColor(baseCol, 0));
  ctx.fillStyle = rumpGrad;
  ctx.beginPath();
  ctx.ellipse(-halfLen * 0.84 * stretch, 0, 2.7 * mirrorBoost, halfWid * 0.66 * mirrorBoost, 0, 0, Math.PI * 2);
  ctx.fill();

  // Warm rufous dorsal saddle
  ctx.fillStyle = rgbaColor(secCol, 0.38);
  ctx.beginPath();
  ctx.ellipse(-halfLen * 0.04, 0, halfLen * 0.56 * stretch, halfWid * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();

  if (a.age === 'juvenile' && !isWinter) {
    ctx.fillStyle = 'rgba(250, 240, 210, 0.78)';
    for (let i = 0; i < 10; i++) {
      const sx = (-0.52 + (i % 5) * 0.24) * halfLen * stretch;
      const row = i < 5 ? -1 : 1;
      const sy = row * halfWid * (0.28 + seededRand(a.seed, i + 17) * 0.3);
      ctx.beginPath();
      ctx.ellipse(sx, sy, 0.68, 0.46, seededRand(a.seed, i + 31) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawDorsalSpineHighlight(ctx, -halfLen * 0.56, halfLen * 0.54, halfWid * 0.16, rgbaColor(rimCol, 0.25), spineBend, halfLen);

  if (detailZoom) {
    drawFurTextureStrokes(
      ctx,
      a.seed,
      halfLen * 0.78,
      halfWid * 0.82,
      rgbaColor(rimCol, 0.2),
      rgbaColor(deepShadow, 0.24),
      22,
      1.35,
      0.26,
      spineBend
    );
  }
  ctx.restore();

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.strokeStyle = rgbaColor(deepShadow, 0.46);
  ctx.lineWidth = 0.38;
  ctx.stroke();

  // Graceful neck & delicate alert cervid head
  ctx.save();
  ctx.translate(halfLen * 0.56 * stretch, spineBend * halfLen * 0.11);
  ctx.rotate(a.headYaw);

  const neckLen = halfLen * 0.36 + headDrop * 0.65;
  drawTaperedLimbSegment(
    ctx,
    -0.8,
    0,
    halfWid * 0.44,
    neckLen,
    0,
    halfWid * 0.28,
    makeVolumetricGradient(ctx, neckLen * 0.5, 0, halfWid * 0.42, sunLX, sunLY, highlightCol, baseCol, deepShadow)
  );

  const hx = neckLen + 1.2 + headDrop * 0.45;

  // Large swiveling ears angled back-and-outward naturally
  drawSculptedEars(
    ctx,
    hx - 1.5,
    halfWid * 0.28,
    2.8,
    1.05,
    2.22 - a.earAlert * 0.34,
    secCol,
    mixColor(bellyCol, '#e8d0c0', 0.4),
    '#1c1917',
    detailZoom
  );

  // Tapered delicate roe skull & muzzle
  ctx.fillStyle = makeDomeGradient(ctx, hx + 0.3, 0, 2.8, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.beginPath();
  ctx.moveTo(hx - 1.8, -1.2);
  ctx.quadraticCurveTo(hx, -1.5, hx + 1.6, -0.88);
  ctx.quadraticCurveTo(hx + 2.95, -0.48, hx + 3.05, 0);
  ctx.quadraticCurveTo(hx + 2.95, 0.48, hx + 1.6, 0.88);
  ctx.quadraticCurveTo(hx, 1.5, hx - 1.8, 1.2);
  ctx.quadraticCurveTo(hx - 2.25, 0, hx - 1.8, -1.2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = rgbaColor(bellyCol, 0.62);
  ctx.beginPath();
  ctx.ellipse(hx + 2.05, 0, 0.72, 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  drawWetNose(ctx, hx + 2.8, 0, 0.5, 0.56, '#141210', detailZoom);

  drawAnatomicalEyes(ctx, hx + 0.35, 1.02, 0.44, '#291a10', a.eyeShineIntensity, '#bbf7d0', detailZoom);

  if (a.hasAntlers && !isWinter) {
    drawRoeAntlers(ctx, hx - 0.9, 0, halfWid * 1.02, detailZoom);
  }

  ctx.restore();
}

// ============================================================================
// 3. WILD BOAR (КАБАН) — Heavy muscular wedge body, bristled dorsal mane, rooting snout & tusks
// ============================================================================
export function drawWildBoar(ctx: CanvasRenderingContext2D, r: AnimalRenderContext): void {
  const { a, halfLen, halfWid, baseCol, secCol, bellyCol, deepShadow, highlightCol, rimCol, sunLX, sunLY, stretch, breath, spineBend, tailWag, headDrop, detailZoom } = r;

  drawArticulatedLimbs(ctx, r.legs, {
    upperColor: shadeColor(baseCol, 0.78),
    lowerColor: '#211b17',
    footColor: '#0c0a09',
    upperRadius: halfWid * 0.24,
    kneeRadius: halfWid * 0.16,
    footRadius: halfWid * 0.16,
    terminalStyle: 'cloven_hoof',
    detailZoom,
  });

  // Tufted whisking boar tail with black brush tip
  ctx.save();
  ctx.translate(-halfLen * 0.84 * stretch, spineBend * halfLen * 0.16);
  const tSway = tailWag * 2.2;
  ctx.strokeStyle = secCol;
  ctx.lineWidth = 0.95;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-halfLen * 0.16, tSway * 0.6, -halfLen * 0.3, tSway);
  ctx.stroke();
  ctx.fillStyle = '#14110f';
  ctx.beginPath();
  ctx.ellipse(-halfLen * 0.32, tSway, 1.35, 0.7, tailWag * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const profile: TorsoProfilePoint[] = [
    { x: -halfLen * 0.86 * stretch, w: halfWid * 0.22 },
    { x: -halfLen * 0.58 * stretch, w: halfWid * 0.72 * breath },
    { x: -halfLen * 0.20 * stretch, w: halfWid * 0.88 * breath },
    { x: halfLen * 0.22 * stretch, w: halfWid * 1.06 * breath },
    { x: halfLen * 0.56 * stretch, w: halfWid * 0.92 * breath },
    { x: halfLen * 0.78 * stretch, w: halfWid * 0.62 },
  ];

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.fillStyle = makeVolumetricGradient(ctx, 0, 0, halfWid * 1.12, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.fill();

  ctx.save();
  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.clip();

  if (a.age !== 'juvenile') {
    ctx.fillStyle = rgbaColor(bellyCol, 0.2);
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.15, -halfWid * 0.68, halfLen * 0.38, halfWid * 0.32, 0.1, 0, Math.PI * 2);
    ctx.ellipse(halfLen * 0.1, halfWid * 0.66, halfLen * 0.34, halfWid * 0.3, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  if (a.age === 'juvenile') {
    ctx.strokeStyle = '#dfc198';
    ctx.lineWidth = 0.85;
    ctx.lineCap = 'round';
    for (const s of [-0.62, -0.32, 0, 0.32, 0.62]) {
      ctx.beginPath();
      ctx.moveTo(-halfLen * 0.68, s * halfWid * 0.72);
      ctx.quadraticCurveTo(0, s * halfWid * 0.92, halfLen * 0.52, s * halfWid * 0.74);
      ctx.stroke();
    }
  } else {
    const maneGrad = makeVolumetricGradient(ctx, halfLen * 0.15, 0, halfWid * 0.42, sunLX, sunLY, shadeColor(secCol, 1.28), secCol, deepShadow);
    ctx.fillStyle = maneGrad;
    ctx.beginPath();
    ctx.ellipse(halfLen * 0.16, 0, halfLen * 0.62, halfWid * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    if (detailZoom) {
      ctx.strokeStyle = rgbaColor(rimCol, 0.28);
      ctx.lineWidth = 0.34;
      ctx.beginPath();
      for (let i = 0; i < 14; i++) {
        const bx = -halfLen * 0.36 + i * halfLen * 0.082;
        const jit = (seededRand(a.seed, i + 41) - 0.5) * 0.6;
        ctx.moveTo(bx, jit);
        ctx.lineTo(bx - 1.65, jit + (seededRand(a.seed, i + 61) - 0.5) * 0.55);
      }
      ctx.stroke();
    }
  }

  if (detailZoom) {
    drawFurTextureStrokes(
      ctx,
      a.seed,
      halfLen * 0.78,
      halfWid * 0.9,
      rgbaColor(rimCol, 0.18),
      rgbaColor(deepShadow, 0.38),
      30,
      1.65,
      0.32,
      spineBend
    );
  }
  ctx.restore();

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.strokeStyle = rgbaColor(deepShadow, 0.54);
  ctx.lineWidth = 0.44;
  ctx.stroke();

  // Thick conical boar head, bristled cheek ruffs, flat rooting snout disc & curved ivory tusks
  ctx.save();
  ctx.translate(halfLen * 0.64 * stretch, spineBend * halfLen * 0.09);
  ctx.rotate(a.headYaw * 0.55);

  drawSculptedEars(
    ctx,
    -0.8,
    halfWid * 0.46,
    2.7,
    1.4,
    2.08 - a.earAlert * 0.25,
    secCol,
    '#4a3931',
    deepShadow,
    detailZoom
  );

  const snLen = 5.0 + headDrop * 0.55;
  ctx.fillStyle = makeDomeGradient(ctx, 1.4, 0, 4.2, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.beginPath();
  ctx.moveTo(-1.4, -halfWid * 0.66);
  ctx.quadraticCurveTo(0.8, -halfWid * 0.54, snLen - 0.4, -1.35);
  ctx.lineTo(snLen, -1.05);
  ctx.lineTo(snLen, 1.05);
  ctx.lineTo(snLen - 0.4, 1.35);
  ctx.quadraticCurveTo(0.8, halfWid * 0.54, -1.4, halfWid * 0.66);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgbaColor(deepShadow, 0.48);
  ctx.lineWidth = 0.36;
  ctx.stroke();

  ctx.fillStyle = rgbaColor(secCol, 0.58);
  ctx.beginPath();
  ctx.ellipse(1.5, 0, 2.2, 0.76, 0, 0, Math.PI * 2);
  ctx.fill();

  drawWetNose(ctx, snLen + 0.15, 0, 0.85, 1.28, '#543931', detailZoom);

  // Sleek realistic curved ivory lower tusks sweeping outward & slightly upward-back
  if (a.hasTusks) {
    for (const s of [-1, 1]) {
      ctx.strokeStyle = '#c4b79e';
      ctx.lineWidth = 0.95;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(2.7, s * 1.25);
      ctx.quadraticCurveTo(3.9, s * 2.4, 3.0, s * 3.1);
      ctx.stroke();

      ctx.strokeStyle = '#f5f0e2';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(2.85, s * 1.35);
      ctx.quadraticCurveTo(3.85, s * 2.38, 3.0, s * 3.1);
      ctx.stroke();
    }
  }

  drawAnatomicalEyes(ctx, 1.05, 1.55, 0.42, '#362316', a.eyeShineIntensity, '#fca5a5', detailZoom);

  ctx.restore();
}

// ============================================================================
// 4. BROWN BEAR (БУРЫЙ МЕДВЕДЬ) — Massive broad shoulders, shaggy coat, clawed paws, round ears
// ============================================================================
export function drawBear(ctx: CanvasRenderingContext2D, r: AnimalRenderContext): void {
  const { a, halfLen, halfWid, baseCol, secCol, accentCol, deepShadow, highlightCol, rimCol, sunLX, sunLY, stretch, breath, spineBend, detailZoom } = r;

  drawArticulatedLimbs(ctx, r.legs, {
    upperColor: shadeColor(baseCol, 0.76),
    lowerColor: secCol,
    footColor: '#1a1411',
    clawColor: '#9e907e',
    upperRadius: halfWid * 0.27,
    kneeRadius: halfWid * 0.21,
    footRadius: halfWid * 0.22,
    terminalStyle: 'bear_claw_paw',
    detailZoom,
  });

  // Shaggy stubby bear tail
  ctx.fillStyle = secCol;
  ctx.beginPath();
  ctx.ellipse(-halfLen * 0.86 * stretch, spineBend * halfLen * 0.14, 1.9, 1.45, 0, 0, Math.PI * 2);
  ctx.fill();

  const profile: TorsoProfilePoint[] = [
    { x: -halfLen * 0.86 * stretch, w: halfWid * 0.34 },
    { x: -halfLen * 0.56 * stretch, w: halfWid * 0.92 * breath },
    { x: -halfLen * 0.16 * stretch, w: halfWid * 0.96 * breath },
    { x: halfLen * 0.22 * stretch, w: halfWid * 1.06 * breath },
    { x: halfLen * 0.56 * stretch, w: halfWid * 0.88 * breath },
    { x: halfLen * 0.74 * stretch, w: halfWid * 0.52 },
  ];

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.fillStyle = makeVolumetricGradient(ctx, 0, 0, halfWid * 1.15, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.fill();

  ctx.save();
  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.clip();

  // Shaggy flank undercoat depth
  ctx.fillStyle = rgbaColor(deepShadow, 0.32);
  ctx.beginPath();
  ctx.ellipse(-halfLen * 0.25, -halfWid * 0.65, halfLen * 0.55, halfWid * 0.42, 0.1, 0, Math.PI * 2);
  ctx.ellipse(-halfLen * 0.25, halfWid * 0.65, halfLen * 0.55, halfWid * 0.42, -0.1, 0, Math.PI * 2);
  ctx.fill();

  // Iconic muscular brown bear shoulder hump
  ctx.fillStyle = makeDomeGradient(
    ctx,
    halfLen * 0.22 * stretch,
    0,
    halfWid * 0.86,
    sunLX,
    sunLY,
    shadeColor(highlightCol, 1.04),
    baseCol,
    secCol
  );
  ctx.beginPath();
  ctx.ellipse(halfLen * 0.22 * stretch, 0, halfLen * 0.38, halfWid * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();

  drawDorsalSpineHighlight(ctx, -halfLen * 0.62, halfLen * 0.52, halfWid * 0.28, rgbaColor(rimCol, 0.2), spineBend, halfLen);

  if (detailZoom) {
    drawFurTextureStrokes(
      ctx,
      a.seed,
      halfLen * 0.82,
      halfWid * 0.94,
      rgbaColor(accentCol, 0.24),
      rgbaColor(deepShadow, 0.38),
      44,
      2.3,
      0.4,
      spineBend
    );
  }
  ctx.restore();

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.strokeStyle = rgbaColor(deepShadow, 0.52);
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Broad heavy ursine skull, thick neck ruff, small fuzzy round ears & tan muzzle
  ctx.save();
  ctx.translate(halfLen * 0.62 * stretch, spineBend * halfLen * 0.09);
  ctx.rotate(a.headYaw * 0.72);

  ctx.fillStyle = makeDomeGradient(ctx, 0.2, 0, halfWid * 0.56, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.beginPath();
  ctx.ellipse(0.4, 0, 3.6, halfWid * 0.58, 0, 0, Math.PI * 2);
  ctx.fill();

  // Small fuzzy rounded ears set cleanly on rear crown
  for (const s of [-1, 1]) {
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.arc(-0.2, s * 3.25, 1.4, 0, Math.PI * 2);
    ctx.fill();
    if (detailZoom) {
      ctx.fillStyle = mixColor(accentCol, '#3d281c', 0.55);
      ctx.beginPath();
      ctx.arc(0.15, s * 3.12, 0.72, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = makeDomeGradient(ctx, 2.3, 0, 4.4, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.beginPath();
  ctx.moveTo(-0.8, -3.45);
  ctx.quadraticCurveTo(2.0, -3.95, 4.5, -2.4);
  ctx.quadraticCurveTo(6.1, -1.5, 6.1, 0);
  ctx.quadraticCurveTo(6.1, 1.5, 4.5, 2.4);
  ctx.quadraticCurveTo(2.0, 3.95, -0.8, 3.45);
  ctx.quadraticCurveTo(-1.7, 0, -0.8, -3.45);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = makeDomeGradient(ctx, 5.3, 0, 2.5, sunLX, sunLY, shadeColor(accentCol, 1.12), accentCol, shadeColor(accentCol, 0.7));
  ctx.beginPath();
  ctx.ellipse(5.35, 0, 2.35, 1.92, 0, 0, Math.PI * 2);
  ctx.fill();

  drawWetNose(ctx, 7.35, 0, 1.0, 1.28, '#0c0a09', detailZoom);

  drawAnatomicalEyes(ctx, 3.45, 1.72, 0.48, '#3b2412', a.eyeShineIntensity, '#fdba74', detailZoom);

  ctx.restore();
}

// ============================================================================
// 5. WOLF (ВОЛК) — Lean timber predator, thick hackles/ruff, grizzled saddle, bushy tail
// ============================================================================
export function drawWolf(ctx: CanvasRenderingContext2D, r: AnimalRenderContext): void {
  const { a, halfLen, halfWid, baseCol, secCol, bellyCol, deepShadow, highlightCol, sunLX, sunLY, stretch, breath, spineBend, tailWag, detailZoom } = r;

  drawArticulatedLimbs(ctx, r.legs, {
    upperColor: mixColor(baseCol, bellyCol, 0.42),
    lowerColor: bellyCol,
    footColor: '#272320',
    upperRadius: halfWid * 0.24,
    kneeRadius: halfWid * 0.16,
    footRadius: halfWid * 0.18,
    terminalStyle: 'canid_paw',
    detailZoom,
  });

  // Bushy multi-layered wolf tail with dark dorsal scent-gland stripe & black tip
  ctx.save();
  ctx.translate(-halfLen * 0.76 * stretch, spineBend * halfLen * 0.15);
  ctx.rotate(tailWag * 0.42 + spineBend * 0.55);

  const tLen = halfLen * 0.76;
  ctx.fillStyle = makeVolumetricGradient(ctx, -tLen * 0.5, 0, 2.1, sunLX, sunLY, bellyCol, baseCol, deepShadow);
  ctx.beginPath();
  ctx.moveTo(0, -1.0);
  ctx.quadraticCurveTo(-tLen * 0.45, -2.15, -tLen, 0);
  ctx.quadraticCurveTo(-tLen * 0.45, 2.15, 0, 1.0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = rgbaColor('#18181b', 0.82);
  ctx.beginPath();
  ctx.ellipse(-tLen * 0.4, 0, tLen * 0.15, 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-tLen * 0.72, -1.08);
  ctx.quadraticCurveTo(-tLen * 0.88, -0.85, -tLen, 0);
  ctx.quadraticCurveTo(-tLen * 0.88, 0.85, -tLen * 0.72, 1.08);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const profile: TorsoProfilePoint[] = [
    { x: -halfLen * 0.82 * stretch, w: halfWid * 0.24 },
    { x: -halfLen * 0.56 * stretch, w: halfWid * 0.80 * breath },
    { x: -halfLen * 0.18 * stretch, w: halfWid * 0.66 * breath },
    { x: halfLen * 0.24 * stretch, w: halfWid * 1.02 * breath },
    { x: halfLen * 0.54 * stretch, w: halfWid * 0.92 * breath },
    { x: halfLen * 0.72 * stretch, w: halfWid * 0.48 },
  ];

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.fillStyle = makeVolumetricGradient(ctx, 0, 0, halfWid * 1.08, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.fill();

  ctx.save();
  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.clip();

  // Softly blended grizzled timber saddle
  const saddleGrad = ctx.createRadialGradient(halfLen * 0.04, 0, halfWid * 0.12, halfLen * 0.04, 0, halfLen * 0.62);
  saddleGrad.addColorStop(0, rgbaColor(secCol, 0.88));
  saddleGrad.addColorStop(0.65, rgbaColor(secCol, 0.48));
  saddleGrad.addColorStop(1, rgbaColor(secCol, 0));
  ctx.fillStyle = saddleGrad;
  ctx.beginPath();
  ctx.ellipse(halfLen * 0.04, 0, halfLen * 0.64, halfWid * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();

  // Lighter shoulder hackle ruff
  ctx.fillStyle = rgbaColor(bellyCol, 0.28);
  ctx.beginPath();
  ctx.ellipse(halfLen * 0.38 * stretch, 0, halfLen * 0.22, halfWid * 0.84, 0, 0, Math.PI * 2);
  ctx.fill();

  drawDorsalSpineHighlight(ctx, -halfLen * 0.68, halfLen * 0.52, halfWid * 0.16, rgbaColor(deepShadow, 0.38), spineBend, halfLen);

  if (detailZoom) {
    drawFurTextureStrokes(
      ctx,
      a.seed,
      halfLen * 0.78,
      halfWid * 0.86,
      rgbaColor(bellyCol, 0.28),
      rgbaColor(deepShadow, 0.36),
      30,
      1.55,
      0.28,
      spineBend
    );
  }
  ctx.restore();

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.strokeStyle = rgbaColor(deepShadow, 0.48);
  ctx.lineWidth = 0.4;
  ctx.stroke();

  // Wolf head: broad cheek ruffs, triangular ears, long powerful muzzle, brow-tucked amber eyes
  ctx.save();
  ctx.translate(halfLen * 0.62 * stretch, spineBend * halfLen * 0.09);
  ctx.rotate(a.headYaw);

  ctx.fillStyle = makeDomeGradient(ctx, 1.4, 0, 3.2, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.beginPath();
  ctx.moveTo(-1.0, -2.3);
  ctx.quadraticCurveTo(1.1, -2.8, 2.9, -1.55);
  ctx.lineTo(5.5, -0.82);
  ctx.quadraticCurveTo(6.15, 0, 5.5, 0.82);
  ctx.lineTo(2.9, 1.55);
  ctx.quadraticCurveTo(1.1, 2.8, -1.0, 2.3);
  ctx.quadraticCurveTo(-1.7, 0, -1.0, -2.3);
  ctx.closePath();
  ctx.fill();

  // Pale cream cheek ruffs
  ctx.fillStyle = rgbaColor(bellyCol, 0.72);
  ctx.beginPath();
  ctx.ellipse(0.85, -1.68, 1.5, 0.82, 0.22, 0, Math.PI * 2);
  ctx.ellipse(0.85, 1.68, 1.5, 0.82, -0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = rgbaColor(secCol, 0.56);
  ctx.beginPath();
  ctx.ellipse(1.5, 0, 2.0, 0.96, 0, 0, Math.PI * 2);
  ctx.fill();

  // Upright triangular wolf ears swept naturally slightly back-and-out
  drawSculptedEars(
    ctx,
    -0.05,
    1.35,
    2.35,
    1.15,
    2.02 - a.earAlert * 0.32,
    secCol,
    bellyCol,
    '#18181b',
    detailZoom
  );

  drawWetNose(ctx, 5.7, 0, 0.58, 0.64, '#09090b', detailZoom);
  if (detailZoom) {
    drawWhiskers(ctx, 4.75, 0.72, 1.25, 'rgba(226, 232, 240, 0.36)');
  }

  drawAnatomicalEyes(ctx, 2.45, 1.08, 0.44, '#d97706', a.eyeShineIntensity, '#fde047', detailZoom);

  ctx.restore();
}

// ============================================================================
// 6. RED FOX (РЫЖАЯ ЛИСА) — Flame-orange coat, black socks & ear-backs, huge white-tipped brush
// ============================================================================
export function drawFox(ctx: CanvasRenderingContext2D, r: AnimalRenderContext): void {
  const { a, halfLen, halfWid, baseCol, secCol, deepShadow, highlightCol, rimCol, sunLX, sunLY, stretch, breath, spineBend, tailWag, detailZoom } = r;

  drawArticulatedLimbs(ctx, r.legs, {
    upperColor: secCol,
    lowerColor: '#1c1917',
    footColor: '#09090b',
    upperRadius: halfWid * 0.22,
    kneeRadius: halfWid * 0.14,
    footRadius: halfWid * 0.16,
    terminalStyle: 'canid_paw',
    detailZoom,
  });

  // Signature massive fluffy white-tipped fox brush tail
  ctx.save();
  ctx.translate(-halfLen * 0.72 * stretch, spineBend * halfLen * 0.15);
  ctx.rotate(tailWag * 0.55 + spineBend * 0.7);

  const bLen = halfLen * 1.18;
  const bWid = halfWid * 0.86;
  ctx.fillStyle = makeVolumetricGradient(ctx, -bLen * 0.45, 0, bWid, sunLX, sunLY, highlightCol, baseCol, secCol);
  ctx.beginPath();
  ctx.moveTo(0, -bWid * 0.36);
  ctx.bezierCurveTo(-bLen * 0.28, -bWid * 1.08, -bLen * 0.76, -bWid * 0.94, -bLen, 0);
  ctx.bezierCurveTo(-bLen * 0.76, bWid * 0.94, -bLen * 0.28, bWid * 1.08, 0, bWid * 0.36);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = rgbaColor(secCol, 0.46);
  ctx.beginPath();
  ctx.ellipse(-bLen * 0.42, 0, bLen * 0.34, bWid * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  // Feathered snowy-white brush tip
  ctx.fillStyle = '#f5f5f4';
  ctx.beginPath();
  ctx.moveTo(-bLen * 0.72, -bWid * 0.58);
  ctx.quadraticCurveTo(-bLen * 0.9, -bWid * 0.38, -bLen, 0);
  ctx.quadraticCurveTo(-bLen * 0.9, bWid * 0.38, -bLen * 0.72, bWid * 0.58);
  ctx.quadraticCurveTo(-bLen * 0.64, 0, -bLen * 0.72, -bWid * 0.58);
  ctx.closePath();
  ctx.fill();

  if (detailZoom) {
    ctx.strokeStyle = rgbaColor(rimCol, 0.28);
    ctx.lineWidth = 0.26;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const tx = -bLen * (0.14 + i * 0.095);
      const ty = (i % 2 === 0 ? -1 : 1) * bWid * 0.32;
      ctx.moveTo(tx, ty * 0.4);
      ctx.lineTo(tx - 1.3, ty * 1.05);
    }
    ctx.stroke();
  }
  ctx.restore();

  const profile: TorsoProfilePoint[] = [
    { x: -halfLen * 0.82 * stretch, w: halfWid * 0.24 },
    { x: -halfLen * 0.50 * stretch, w: halfWid * 0.80 * breath },
    { x: -halfLen * 0.08 * stretch, w: halfWid * 0.72 * breath },
    { x: halfLen * 0.32 * stretch, w: halfWid * 0.90 * breath },
    { x: halfLen * 0.62 * stretch, w: halfWid * 0.72 * breath },
    { x: halfLen * 0.76 * stretch, w: halfWid * 0.38 },
  ];

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.fillStyle = makeVolumetricGradient(ctx, 0, 0, halfWid * 1.05, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.fill();

  ctx.save();
  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.clip();

  ctx.fillStyle = rgbaColor(secCol, 0.48);
  ctx.beginPath();
  ctx.ellipse(-halfLen * 0.04, 0, halfLen * 0.58, halfWid * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  if (a.coat.pattern === 'saddle') {
    ctx.fillStyle = rgbaColor(secCol, 0.65);
    ctx.beginPath();
    ctx.ellipse(halfLen * 0.26, 0, halfLen * 0.14, halfWid * 0.88, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (detailZoom) {
    drawFurTextureStrokes(
      ctx,
      a.seed,
      halfLen * 0.76,
      halfWid * 0.82,
      rgbaColor(rimCol, 0.26),
      rgbaColor(deepShadow, 0.28),
      22,
      1.25,
      0.24,
      spineBend
    );
  }
  ctx.restore();

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.strokeStyle = rgbaColor(deepShadow, 0.42);
  ctx.lineWidth = 0.34;
  ctx.stroke();

  // Sharp triangular fox skull, white cheek tufts, jet-black ear backs & needle-pointed snout
  ctx.save();
  ctx.translate(halfLen * 0.62 * stretch, spineBend * halfLen * 0.09);
  ctx.rotate(a.headYaw);

  ctx.fillStyle = 'rgba(248, 246, 242, 0.88)';
  ctx.beginPath();
  ctx.ellipse(0.05, -1.42, 1.2, 0.72, 0.25, 0, Math.PI * 2);
  ctx.ellipse(0.05, 1.42, 1.2, 0.72, -0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = makeDomeGradient(ctx, 1.2, 0, 2.7, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.beginPath();
  ctx.moveTo(-1.1, -1.85);
  ctx.quadraticCurveTo(0.8, -1.85, 2.2, -0.92);
  ctx.lineTo(4.5, -0.34);
  ctx.quadraticCurveTo(4.85, 0, 4.5, 0.34);
  ctx.lineTo(2.2, 0.92);
  ctx.quadraticCurveTo(0.8, 1.85, -1.1, 1.85);
  ctx.quadraticCurveTo(-1.55, 0, -1.1, -1.85);
  ctx.closePath();
  ctx.fill();

  // Large pointed jet-black-backed fox ears angled naturally back-and-out
  drawSculptedEars(
    ctx,
    -0.35,
    1.0,
    2.2,
    0.95,
    2.02 - a.earAlert * 0.28,
    '#1c1917',
    '#ebe0d0',
    '#09090b',
    detailZoom
  );

  drawWetNose(ctx, 4.58, 0, 0.42, 0.44, '#09090b', detailZoom);
  if (detailZoom) {
    drawWhiskers(ctx, 3.7, 0.48, 1.15, 'rgba(248, 250, 252, 0.42)');
  }
  drawAnatomicalEyes(ctx, 1.75, 0.82, 0.36, '#d97706', a.eyeShineIntensity, '#bef264', detailZoom);

  ctx.restore();
}

// ============================================================================
// 7. SQUIRREL (БЕЛКА) — Agile red/grey tree-dweller, lush layered plumed tail, ear tufts
// ============================================================================
export function drawSquirrel(ctx: CanvasRenderingContext2D, r: AnimalRenderContext): void {
  const { a, halfLen, halfWid, baseCol, secCol, bellyCol, accentCol, deepShadow, highlightCol, rimCol, sunLX, sunLY, stretch, nowSec, detailZoom, isWinter } = r;

  const tailCurl = Math.sin(nowSec * 7.2 + a.seed) * 0.22;

  if (r.legs.visible) {
    drawArticulatedLimbs(ctx, r.legs, {
      upperColor: baseCol,
      lowerColor: secCol,
      footColor: '#4a2c1c',
      upperRadius: halfWid * 0.22,
      kneeRadius: halfWid * 0.14,
      footRadius: halfWid * 0.15,
      terminalStyle: 'rodent_paw',
      detailZoom,
    });
  }

  const profile: TorsoProfilePoint[] = [
    { x: -halfLen * 0.64 * stretch, w: halfWid * 0.26 },
    { x: -halfLen * 0.34 * stretch, w: halfWid * 0.88 },
    { x: halfLen * 0.08 * stretch, w: halfWid * 0.78 },
    { x: halfLen * 0.42 * stretch, w: halfWid * 0.74 },
    { x: halfLen * 0.62 * stretch, w: halfWid * 0.42 },
  ];

  traceOrganicTorsoPath(ctx, profile, r.spineBend, halfLen);
  ctx.fillStyle = makeVolumetricGradient(ctx, 0, 0, halfWid * 0.95, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.fill();

  ctx.fillStyle = rgbaColor(accentCol, 0.4);
  ctx.beginPath();
  ctx.ellipse(halfLen * 0.04, 0, halfLen * 0.46, halfWid * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  // Compact nimble head with lateral bead eyes & tufted red-squirrel ears
  ctx.save();
  ctx.translate(halfLen * 0.56 * stretch, 0);
  ctx.rotate(a.headYaw * 0.7);

  ctx.fillStyle = makeDomeGradient(ctx, 0.6, 0, halfWid * 0.85, sunLX, sunLY, highlightCol, accentCol, secCol);
  ctx.beginPath();
  ctx.ellipse(0.65, 0, halfWid * 0.84, halfWid * 0.64, 0, 0, Math.PI * 2);
  ctx.fill();

  const tuftLen = isWinter ? 1.5 : 1.05;
  drawSculptedEars(ctx, -0.2, halfWid * 0.4, tuftLen, 0.5, 2.25, secCol, bellyCol, deepShadow, detailZoom);

  drawAnatomicalEyes(ctx, 0.92, halfWid * 0.48, 0.28, '#0c0a09', a.eyeShineIntensity, '#fef08a', detailZoom);
  drawWetNose(ctx, halfWid * 0.86 + 0.52, 0, 0.24, 0.26, '#1c1917', false);
  ctx.restore();

  // Lush layered feathery plumed tail curving back-and-over rump
  ctx.save();
  ctx.translate(-halfLen * 0.42 * stretch, 0);
  ctx.rotate(tailCurl);

  const plumeLen = halfLen * 1.15;
  const plumeWid = halfWid * 0.98;
  // Soft outer feathery ruff
  ctx.fillStyle = makeVolumetricGradient(ctx, -plumeLen * 0.48, 0, plumeWid, sunLX, sunLY, highlightCol, baseCol, secCol);
  ctx.beginPath();
  ctx.moveTo(0.3, -plumeWid * 0.28);
  ctx.bezierCurveTo(-plumeLen * 0.3, -plumeWid * 1.08, -plumeLen * 0.84, -plumeWid * 0.98, -plumeLen, 0);
  ctx.bezierCurveTo(-plumeLen * 0.84, plumeWid * 0.98, -plumeLen * 0.3, plumeWid * 1.08, 0.3, plumeWid * 0.28);
  ctx.closePath();
  ctx.fill();

  // Darker central tail spine shading
  ctx.fillStyle = rgbaColor(secCol, 0.58);
  ctx.beginPath();
  ctx.ellipse(-plumeLen * 0.44, 0, plumeLen * 0.38, plumeWid * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fine feathery hair wisps sweeping smoothly back along plume curve
  if (detailZoom) {
    ctx.strokeStyle = rgbaColor(rimCol, 0.42);
    ctx.lineWidth = 0.22;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 14; i++) {
      const t = 0.1 + (i / 14) * 0.76;
      const fx = -plumeLen * t;
      const side = i % 2 === 0 ? -1 : 1;
      const wAtT = Math.sin(t * Math.PI) * plumeWid * 0.88;
      ctx.moveTo(fx, side * wAtT * 0.12);
      ctx.quadraticCurveTo(fx - 0.55, side * wAtT * 0.58, fx - 1.15, side * wAtT * 0.92);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ============================================================================
// 8. HEDGEHOG (ЁЖ) — Densely packed fine tapered banded needles, bristly snout, defensive ball
// ============================================================================
export function drawHedgehog(ctx: CanvasRenderingContext2D, r: AnimalRenderContext): void {
  const { a, halfLen, halfWid, baseCol, secCol, bellyCol, accentCol, deepShadow, highlightCol, sunLX, sunLY, detailZoom } = r;
  const curled = a.state === 'curled' || a.state === 'resting';
  const rx = curled ? halfWid * 1.06 : halfLen * 0.88;
  const ry = curled ? halfWid * 1.06 : halfWid * 0.96;

  if (!curled) {
    if (r.legs.visible) {
      ctx.fillStyle = '#29221d';
      ctx.beginPath();
      ctx.arc(r.legs.fl.footX * 0.65, r.legs.fl.footY * 0.68, 0.44, 0, Math.PI * 2);
      ctx.arc(r.legs.fr.footX * 0.65, r.legs.fr.footY * 0.68, 0.44, 0, Math.PI * 2);
      ctx.arc(r.legs.bl.footX * 0.65, r.legs.bl.footY * 0.68, 0.44, 0, Math.PI * 2);
      ctx.arc(r.legs.br.footX * 0.65, r.legs.br.footY * 0.68, 0.44, 0, Math.PI * 2);
      ctx.fill();
    }

    // Soft bristly pointed snout & dark facial mask
    ctx.fillStyle = makeDomeGradient(ctx, rx * 0.86, 0, ry * 0.72, sunLX, sunLY, shadeColor(bellyCol, 1.08), bellyCol, shadeColor(bellyCol, 0.66));
    ctx.beginPath();
    ctx.moveTo(rx * 0.38, -ry * 0.56);
    ctx.quadraticCurveTo(rx * 0.92, -ry * 0.42, rx * 1.44, 0);
    ctx.quadraticCurveTo(rx * 0.92, ry * 0.42, rx * 0.38, ry * 0.56);
    ctx.closePath();
    ctx.fill();

    // Small rounded furry ears tucked at edge of quill crown
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.arc(rx * 0.56, -ry * 0.54, 0.44, 0, Math.PI * 2);
    ctx.arc(rx * 0.56, ry * 0.54, 0.44, 0, Math.PI * 2);
    ctx.fill();

    drawAnatomicalEyes(ctx, rx * 0.92, ry * 0.26, 0.25, '#09090b', a.eyeShineIntensity, '#fde68a', detailZoom);
    drawWetNose(ctx, rx * 1.44, 0, 0.32, 0.3, '#09090b', false);
  }

  // Shaded armored dorsal base mantle
  const domeCx = curled ? 0 : -0.35;
  ctx.fillStyle = makeDomeGradient(ctx, domeCx, 0, Math.max(rx, ry), sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.beginPath();
  ctx.ellipse(domeCx, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Structured dense overlapping salt-and-pepper banded quills
  ctx.lineCap = 'round';
  const quills: { sx: number; sy: number; dir: number; len: number }[] = [];

  if (curled) {
    const rings = detailZoom ? [6, 13, 20, 24] : [6, 12, 16];
    for (let ri = 0; ri < rings.length; ri++) {
      const cnt = rings[ri];
      const frac = (ri + 0.55) / rings.length;
      for (let q = 0; q < cnt; q++) {
        const ang = (q / cnt) * Math.PI * 2 + ri * 0.37;
        const jit = (seededRand(a.seed, ri * 40 + q) - 0.5) * 0.26;
        quills.push({
          sx: domeCx + Math.cos(ang) * rx * frac * 0.85,
          sy: Math.sin(ang) * ry * frac * 0.85,
          dir: ang + jit,
          len: 0.95 + seededRand(a.seed, ri * 40 + q + 99) * 0.35,
        });
      }
    }
  } else {
    // Walking hedgehog: even overlapping shingle rows sweeping back from forehead crown to rump!
    const rows = detailZoom ? 7 : 5;
    for (let row = 0; row < rows; row++) {
      const u = -0.78 + (row / (rows - 1)) * 1.42; // rear to front crown
      const maxSpanY = Math.sqrt(Math.max(0.08, 1 - u * u * 0.82));
      const cols = Math.max(4, Math.round((detailZoom ? 9 : 6) * maxSpanY));
      for (let c = 0; c < cols; c++) {
        const v = cols === 1 ? 0 : ((c / (cols - 1)) * 2 - 1) * maxSpanY * 0.88;
        const jitX = (seededRand(a.seed, row * 23 + c * 3 + 1) - 0.5) * 0.22;
        const jitY = (seededRand(a.seed, row * 23 + c * 3 + 2) - 0.5) * 0.22;
        const sx = domeCx + u * rx + jitX;
        const sy = v * ry + jitY;
        const fan = v * 0.58 + (seededRand(a.seed, row * 23 + c * 3 + 3) - 0.5) * 0.28;
        quills.push({
          sx,
          sy,
          dir: Math.PI + fan,
          len: 0.95 + seededRand(a.seed, row * 19 + c + 77) * 0.32,
        });
      }
    }
  }

  // Pass 1: dark mahogany needle shafts
  ctx.strokeStyle = deepShadow;
  ctx.lineWidth = detailZoom ? 0.25 : 0.32;
  ctx.beginPath();
  for (let i = 0; i < quills.length; i++) {
    const q = quills[i];
    ctx.moveTo(q.sx, q.sy);
    ctx.lineTo(q.sx + Math.cos(q.dir) * q.len, q.sy + Math.sin(q.dir) * q.len);
  }
  ctx.stroke();

  // Pass 2: crisp buff/ivory banded tips
  ctx.strokeStyle = rgbaColor(accentCol, 0.84);
  ctx.lineWidth = detailZoom ? 0.17 : 0.22;
  ctx.beginPath();
  for (let i = 0; i < quills.length; i++) {
    const q = quills[i];
    const mx = q.sx + Math.cos(q.dir) * q.len * 0.55;
    const my = q.sy + Math.sin(q.dir) * q.len * 0.55;
    ctx.moveTo(mx, my);
    ctx.lineTo(q.sx + Math.cos(q.dir) * q.len, q.sy + Math.sin(q.dir) * q.len);
  }
  ctx.stroke();
}

// ============================================================================
// 9. HARE (ЗАЯЦ-РУСАК / БЕЛЯК) — Muscular folded haunches, long swept-back black-tipped ears, white scut
// ============================================================================
export function drawHare(ctx: CanvasRenderingContext2D, r: AnimalRenderContext): void {
  const { a, halfLen, halfWid, baseCol, secCol, bellyCol, deepShadow, highlightCol, rimCol, sunLX, sunLY, stretch, breath, spineBend, detailZoom, isWinter } = r;
  const bStretch = a.gaitType === 'bound' ? stretch : 1.0;

  if (a.gaitType === 'bound' || a.gaitType === 'gallop' || a.gaitType === 'trot') {
    drawArticulatedLimbs(ctx, r.legs, {
      upperColor: shadeColor(baseCol, 0.88),
      lowerColor: mixColor(baseCol, bellyCol, 0.32),
      footColor: mixColor(bellyCol, '#9ca3af', 0.3),
      upperRadius: halfWid * 0.24,
      kneeRadius: halfWid * 0.15,
      footRadius: halfWid * 0.18,
      terminalStyle: 'rodent_paw',
      detailZoom,
    });
  }

  // Fluffy bobbed scut tail (snowy white underside, dark upper stripe on summer brown hare)
  ctx.fillStyle = '#f5f5f4';
  ctx.beginPath();
  ctx.ellipse(-halfLen * 0.88 * bStretch, spineBend * halfLen * 0.13, 1.45, 1.05, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!isWinter) {
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.84 * bStretch, spineBend * halfLen * 0.13, 0.88, 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const profile: TorsoProfilePoint[] = [
    { x: -halfLen * 0.84 * bStretch, w: halfWid * 0.28 },
    { x: -halfLen * 0.48 * bStretch, w: halfWid * 1.02 * breath },
    { x: -halfLen * 0.06 * bStretch, w: halfWid * 0.88 * breath },
    { x: halfLen * 0.32 * bStretch, w: halfWid * 0.72 * breath },
    { x: halfLen * 0.58 * bStretch, w: halfWid * 0.54 },
    { x: halfLen * 0.70 * bStretch, w: halfWid * 0.3 },
  ];

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.fillStyle = makeVolumetricGradient(ctx, 0, 0, halfWid * 1.05, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.fill();

  ctx.save();
  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.clip();

  // Powerful folded muscular hind thighs flanking the rump
  ctx.fillStyle = rgbaColor(highlightCol, 0.3);
  ctx.beginPath();
  ctx.ellipse(-halfLen * 0.36 * bStretch, -halfWid * 0.54, halfLen * 0.34, halfWid * 0.4, 0.2, 0, Math.PI * 2);
  ctx.ellipse(-halfLen * 0.36 * bStretch, halfWid * 0.54, halfLen * 0.34, halfWid * 0.4, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = rgbaColor(secCol, 0.42);
  ctx.beginPath();
  ctx.ellipse(-halfLen * 0.12 * bStretch, 0, halfLen * 0.52, halfWid * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();

  if (detailZoom) {
    drawFurTextureStrokes(
      ctx,
      a.seed,
      halfLen * 0.72,
      halfWid * 0.86,
      rgbaColor(rimCol, 0.26),
      rgbaColor(deepShadow, 0.28),
      20,
      1.1,
      0.24,
      spineBend
    );
  }
  ctx.restore();

  traceOrganicTorsoPath(ctx, profile, spineBend, halfLen);
  ctx.strokeStyle = rgbaColor(deepShadow, 0.42);
  ctx.lineWidth = 0.32;
  ctx.stroke();

  // Rounded lagomorph skull, lateral eyes & iconic long spoon-shaped black-tipped ears SWEPT BACK along neck!
  ctx.save();
  ctx.translate(halfLen * 0.56 * bStretch, spineBend * halfLen * 0.09);
  ctx.rotate(a.headYaw * 0.65);

  ctx.fillStyle = makeDomeGradient(ctx, 0.95, 0, 2.2, sunLX, sunLY, highlightCol, baseCol, deepShadow);
  ctx.beginPath();
  ctx.ellipse(1.0, 0, 2.15, 1.42, 0, 0, Math.PI * 2);
  ctx.fill();

  // Subtle muted nose & fine whiskers
  drawWetNose(ctx, 3.05, 0, 0.3, 0.36, '#9c7872', false);
  if (detailZoom) {
    drawWhiskers(ctx, 2.4, 0.48, 1.05, 'rgba(248, 250, 252, 0.42)');
  }

  drawAnatomicalEyes(ctx, 1.2, 0.98, 0.34, '#6b3a1a', a.eyeShineIntensity, '#fef08a', detailZoom);

  // Iconic long hare ears swept naturally BACKWARD over shoulders (pinned flatter when fleeing!)
  const earSweep = a.state === 'fleeing' ? 2.86 : 2.66 - a.earAlert * 0.26;
  drawSculptedEars(
    ctx,
    0.05,
    0.58,
    4.1,
    0.92,
    earSweep,
    baseCol,
    mixColor(bellyCol, '#d6afa4', 0.32),
    '#141210',
    detailZoom
  );

  ctx.restore();
}
