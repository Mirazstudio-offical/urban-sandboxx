import { Animal, GameWorld } from './types';
import { getCurrentSunShadowState, SunShadowState } from './shadowSystem';
import { performanceConfig } from './performanceConfig';

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function seededRand(seed: number, salt: number): number {
  const h = Math.imul((seed ^ (salt * 2654435761)) >>> 0, 2246822519);
  const h2 = Math.imul(h ^ (h >>> 13), 3266489917);
  return ((h2 ^ (h2 >>> 16)) >>> 0) / 4294967296;
}

/**
 * Computes articulated 4-limb foot offsets (fl, fr, bl, br) in animal-local coordinates
 * using biologically accurate gait phase offsets (4-beat walk, diagonal trot, bounding gallop,
 * asymmetric injured limp, or tucked resting legs).
 */
function computeQuadrupedLegs(
  a: Animal,
  halfLen: number,
  halfWid: number
): {
  flX: number; flY: number;
  frX: number; frY: number;
  blX: number; blY: number;
  brX: number; brY: number;
  bodyStretch: number;
  visible: boolean;
} {
  const p = a.gaitPhase;
  const g = a.gaitType;
  if (g === 'rest' || a.state === 'curled' || a.state === 'resting') {
    return { flX: 0, flY: 0, frX: 0, frY: 0, blX: 0, blY: 0, brX: 0, brY: 0, bodyStretch: 0.94, visible: false };
  }

  const frontAnchor = halfLen * 0.46;
  const rearAnchor = -halfLen * 0.48;
  const lat = halfWid * 0.86;
  const strideAmp = halfLen * 0.34;

  let sFL = 0;
  let sFR = 0;
  let sBL = 0;
  let sBR = 0;
  let bodyStretch = 1.0;

  if (g === 'stand') {
    return {
      flX: frontAnchor, flY: -lat,
      frX: frontAnchor, frY: lat,
      blX: rearAnchor, blY: -lat,
      brX: rearAnchor, brY: lat,
      bodyStretch: 1.0,
      visible: a.species === 'moose' || a.species === 'horse' || a.species === 'cow' || a.species === 'roe_deer'
    };
  } else if (g === 'walk') {
    // 4-beat lateral sequence: BL -> FL -> BR -> FR
    sBL = Math.sin(p) * strideAmp * 0.65;
    sFL = Math.sin(p + Math.PI * 0.5) * strideAmp * 0.65;
    sBR = Math.sin(p + Math.PI) * strideAmp * 0.65;
    sFR = Math.sin(p + Math.PI * 1.5) * strideAmp * 0.65;
  } else if (g === 'trot') {
    // Diagonal pairs: (FL + BR) in phase, (FR + BL) opposite
    sFL = Math.sin(p) * strideAmp * 0.92;
    sBR = Math.sin(p) * strideAmp * 0.92;
    sFR = Math.sin(p + Math.PI) * strideAmp * 0.92;
    sBL = Math.sin(p + Math.PI) * strideAmp * 0.92;
    bodyStretch = 1.0 + Math.abs(Math.sin(p)) * 0.04;
  } else if (g === 'gallop' || g === 'bound') {
    // Rotary gallop / saltatorial bound: front legs extend together while rear legs drive back
    const flex = Math.sin(p);
    sFL = Math.sin(p) * strideAmp * 1.25;
    sFR = Math.sin(p + 0.35) * strideAmp * 1.25;
    sBL = Math.sin(p + Math.PI) * strideAmp * 1.3;
    sBR = Math.sin(p + Math.PI + 0.32) * strideAmp * 1.3;
    bodyStretch = 1.0 + flex * (g === 'bound' ? 0.19 : 0.12);
  } else if (g === 'limp') {
    // Asymmetric injured gait favoring one forelimb
    sFL = Math.sin(p) * strideAmp * 0.25;
    sFR = Math.sin(p + Math.PI) * strideAmp * 0.78;
    sBL = Math.sin(p + 0.7) * strideAmp * 0.65;
    sBR = Math.sin(p + Math.PI + 0.4) * strideAmp * 0.7;
  } else {
    // Swim paddle
    sFL = Math.sin(p) * strideAmp * 0.85;
    sFR = Math.sin(p + Math.PI) * strideAmp * 0.85;
    sBL = Math.sin(p + Math.PI * 0.7) * strideAmp * 0.85;
    sBR = Math.sin(p + Math.PI * 1.7) * strideAmp * 0.85;
  }

  return {
    flX: frontAnchor + sFL,
    flY: -lat - Math.max(0, sFL) * 0.08,
    frX: frontAnchor + sFR,
    frY: lat + Math.max(0, sFR) * 0.08,
    blX: rearAnchor + sBL,
    blY: -lat - Math.max(0, -sBL) * 0.06,
    brX: rearAnchor + sBR,
    brY: lat + Math.max(0, -sBR) * 0.06,
    bodyStretch,
    visible: true,
  };
}

function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  a: Animal,
  sun: SunShadowState,
  nightAlpha: number,
  bodyRx: number,
  bodyRy: number
) {
  if (!performanceConfig.enableShadows || nightAlpha > 0.82) return;
  const alt = Math.max(0, a.z || 0);
  const shadowAlpha = clamp((0.34 - alt * 0.014) * (1.0 - nightAlpha * 0.82), 0.06, 0.36);
  const sunShiftX = sun.shadowDirX * (1.6 + alt * 0.45 + bodyRy * 0.28);
  const sunShiftY = sun.shadowDirY * (1.6 + alt * 0.45 + bodyRy * 0.28);
  const shrink = clamp(1.0 - alt * 0.015, 0.65, 1.08);

  ctx.save();
  ctx.translate(a.x + sunShiftX, a.y + sunShiftY);
  ctx.rotate(a.angle);
  ctx.fillStyle = `rgba(8, 16, 12, ${shadowAlpha.toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyRx * 1.06 * shrink, bodyRy * 1.08 * shrink, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLimbs(
  ctx: CanvasRenderingContext2D,
  legs: ReturnType<typeof computeQuadrupedLegs>,
  color: string,
  hoofColor: string | null,
  lineWidth: number,
  frontBaseX: number,
  rearBaseX: number,
  halfWid: number
) {
  if (!legs.visible) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(frontBaseX, -halfWid * 0.45);
  ctx.lineTo(legs.flX, legs.flY);
  ctx.moveTo(frontBaseX, halfWid * 0.45);
  ctx.lineTo(legs.frX, legs.frY);
  ctx.moveTo(rearBaseX, -halfWid * 0.45);
  ctx.lineTo(legs.blX, legs.blY);
  ctx.moveTo(rearBaseX, halfWid * 0.45);
  ctx.lineTo(legs.brX, legs.brY);
  ctx.stroke();

  if (hoofColor) {
    ctx.fillStyle = hoofColor;
    const hr = lineWidth * 0.52;
    ctx.beginPath();
    ctx.arc(legs.flX, legs.flY, hr, 0, Math.PI * 2);
    ctx.arc(legs.frX, legs.frY, hr, 0, Math.PI * 2);
    ctx.arc(legs.blX, legs.blY, hr, 0, Math.PI * 2);
    ctx.arc(legs.brX, legs.brY, hr, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDeadOrDownedPosture(
  ctx: CanvasRenderingContext2D,
  a: Animal,
  halfLen: number,
  halfWid: number,
  baseCol: string,
  secCol: string,
  accentCol: string
) {
  const side = a.deathSide || 1;
  const flatScale = 1.0 + (a.crushedLevel || 0) * 0.28;

  // Subtle dark crimson pool beneath fatally injured/crushed animal
  if (a.state === 'dead' || a.injuryLevel > 0.55) {
    ctx.fillStyle = 'rgba(92, 12, 16, 0.46)';
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.08, side * halfWid * 0.2, halfLen * 0.72, halfWid * 0.85, 0.2 * side, 0, Math.PI * 2);
    ctx.fill();
  }

  // Splayed relaxed limbs sticking out to one side
  ctx.strokeStyle = secCol;
  ctx.lineWidth = Math.max(1.1, halfWid * 0.28);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(halfLen * 0.38, side * halfWid * 0.35);
  ctx.lineTo(halfLen * 0.55, side * halfWid * 1.42);
  ctx.moveTo(halfLen * 0.22, side * halfWid * 0.28);
  ctx.lineTo(halfLen * 0.25, side * halfWid * 1.28);
  ctx.moveTo(-halfLen * 0.36, side * halfWid * 0.35);
  ctx.lineTo(-halfLen * 0.56, side * halfWid * 1.38);
  ctx.moveTo(-halfLen * 0.48, side * halfWid * 0.24);
  ctx.lineTo(-halfLen * 0.72, side * halfWid * 1.15);
  ctx.stroke();

  // Collapsed torso on its side
  ctx.fillStyle = baseCol;
  ctx.beginPath();
  ctx.ellipse(0, 0, halfLen * 0.84 * flatScale, halfWid * 0.96 * flatScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Flank shading
  ctx.fillStyle = secCol;
  ctx.beginPath();
  ctx.ellipse(-halfLen * 0.05, -side * halfWid * 0.22, halfLen * 0.64 * flatScale, halfWid * 0.56 * flatScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Limp head turned to side
  ctx.fillStyle = baseCol;
  ctx.beginPath();
  ctx.ellipse(halfLen * 0.88, side * halfWid * 0.22, halfLen * 0.28, halfWid * 0.44, side * 0.38, 0, Math.PI * 2);
  ctx.fill();

  // Ears & nose
  ctx.fillStyle = accentCol;
  ctx.beginPath();
  ctx.arc(halfLen * 1.12, side * halfWid * 0.32, Math.max(0.7, halfWid * 0.16), 0, Math.PI * 2);
  ctx.fill();

  // Antlers / horns still visible on downed moose/deer/cow
  if (a.hasAntlers && a.species === 'moose') {
    drawMooseAntlers(ctx, halfLen * 0.78, side * halfWid * 0.16, halfWid * 1.35, '#d6cbb8');
  } else if (a.hasAntlers && a.species === 'roe_deer') {
    drawRoeAntlers(ctx, halfLen * 0.78, side * halfWid * 0.15, halfWid * 0.95);
  }
}

function drawMooseAntlers(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  span: number,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#9c8c74';
  ctx.lineWidth = 0.7;

  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, s * 1.0);
    ctx.quadraticCurveTo(span * 0.15, s * span * 0.52, -span * 0.22, s * span * 0.88);
    // Palmate broad shovel with forward tines
    ctx.lineTo(span * 0.28, s * span * 1.05);
    ctx.lineTo(span * 0.12, s * span * 0.72);
    ctx.lineTo(span * 0.42, s * span * 0.74);
    ctx.lineTo(span * 0.18, s * span * 0.48);
    ctx.lineTo(span * 0.38, s * span * 0.36);
    ctx.quadraticCurveTo(span * 0.12, s * span * 0.24, 0, s * 1.0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawRoeAntlers(ctx: CanvasRenderingContext2D, x: number, y: number, span: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#d6c7b2';
  ctx.lineWidth = 0.95;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.7);
    ctx.lineTo(-span * 0.45, s * span * 0.82);
    ctx.moveTo(-span * 0.2, s * span * 0.45);
    ctx.lineTo(span * 0.22, s * span * 0.72);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEyeShine(
  ctx: CanvasRenderingContext2D,
  headX: number,
  headY: number,
  eyeOffsetX: number,
  eyeOffsetY: number,
  intensity: number,
  color: string
) {
  if (intensity <= 0.08) return;
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = clamp(intensity, 0, 0.95);
  ctx.beginPath();
  ctx.arc(headX + eyeOffsetX, headY - eyeOffsetY, 1.05, 0, Math.PI * 2);
  ctx.arc(headX + eyeOffsetX, headY + eyeOffsetY, 1.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSpeciesBody(
  ctx: CanvasRenderingContext2D,
  a: Animal,
  nowSec: number,
  isWinter: boolean,
  nightAlpha: number,
  detailZoom: boolean
) {
  const halfLen = a.bodyLength * 0.5;
  const halfWid = a.bodyWidth * 0.5;
  const legs = computeQuadrupedLegs(a, halfLen, halfWid);
  const stretch = legs.bodyStretch;
  const breath = 1.0 + Math.sin(a.breathPhase) * 0.022;
  const tailWag = Math.sin(a.tailPhase) * (0.35 + a.tailHeight * 0.45);
  const headDrop = a.headPitch < -0.2 ? -a.headPitch * halfLen * 0.16 : 0;

  // Seasonal pelage adaptation (winter coat molting)
  let baseCol = a.coat.baseColor;
  let secCol = a.coat.secondaryColor;
  let accentCol = a.coat.accentColor;
  if (isWinter) {
    if (a.species === 'hare') {
      baseCol = '#f1f5f9';
      secCol = '#cbd5e1';
    } else if (a.species === 'roe_deer') {
      baseCol = '#7c766e';
      secCol = '#5c5751';
    } else if (a.species === 'squirrel') {
      baseCol = '#94a3b8';
      secCol = '#64748b';
    }
  }

  // Downed / dead posture overrides normal upright rig
  if (a.state === 'dead' || a.state === 'knocked_down') {
    drawDeadOrDownedPosture(ctx, a, halfLen, halfWid, baseCol, secCol, accentCol);
    return;
  }

  // =========================================================================
  // 1. MOOSE (ЛОСЬ) — Towering forest giant with humped withers & palmate antlers
  // =========================================================================
  if (a.species === 'moose') {
    drawLimbs(ctx, legs, '#b8a898', '#1c1917', 2.2, halfLen * 0.36, -halfLen * 0.44, halfWid);

    // Stubby dark tail
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.94, tailWag * 0.8, 2.2, 1.1, tailWag * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Muscular hindquarters
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.38, 0, halfLen * 0.48 * stretch, halfWid * 0.82 * breath, 0, 0, Math.PI * 2);
    ctx.fill();

    // Massive broad chest & humped withers
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(halfLen * 0.18, 0, halfLen * 0.52 * stretch, halfWid * 0.98 * breath, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark dorsal ridge & shoulder mane hump
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.ellipse(halfLen * 0.24, 0, halfLen * 0.36, halfWid * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Articulated heavy neck & Roman-nosed head
    ctx.save();
    ctx.translate(halfLen * 0.56 * stretch, 0);
    ctx.rotate(a.headYaw);
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(halfLen * 0.16, 0, halfLen * 0.24, halfWid * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    const hx = halfLen * 0.44 + headDrop;
    // Large cupped moose ears
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.ellipse(hx - 2.6, -halfWid * 0.56, 3.0, 1.35, -0.75 + a.earAlert * 0.25, 0, Math.PI * 2);
    ctx.ellipse(hx - 2.6, halfWid * 0.56, 3.0, 1.35, 0.75 - a.earAlert * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Elongated head & overhanging bulbous nose
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(hx, 0, 5.2, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accentCol;
    ctx.beginPath();
    ctx.ellipse(hx + 3.6, 0, 2.3, 2.05, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bull palmate antlers (shed in deep winter)
    if (a.hasAntlers && !isWinter) {
      drawMooseAntlers(ctx, hx - 1.6, 0, halfWid * 1.65, '#dcd0bc');
    }

    drawEyeShine(ctx, hx, 0, 1.2, 1.7, a.eyeShineIntensity, '#fde68a');
    ctx.restore();
    return;
  }

  // =========================================================================
  // 2. ROE DEER (КОСУЛЯ) — Graceful woodland cervid with white rump "mirror"
  // =========================================================================
  if (a.species === 'roe_deer') {
    drawLimbs(ctx, legs, '#4b3220', '#1c1917', 1.35, halfLen * 0.36, -halfLen * 0.42, halfWid);

    // Iconic white heart-shaped rump patch ("зеркало")
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.86, 0, 2.1, halfWid * 0.64, 0, 0, Math.PI * 2);
    ctx.fill();

    // Slender athletic torso
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(0, 0, halfLen * 0.82 * stretch, halfWid * 0.88 * breath, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.08, 0, halfLen * 0.56 * stretch, halfWid * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();

    // Spotted summer fawn coat markings
    if (a.age === 'juvenile' && !isWinter && detailZoom) {
      ctx.fillStyle = 'rgba(254, 243, 199, 0.78)';
      for (let i = 0; i < 6; i++) {
        const sx = -halfLen * 0.45 + i * halfLen * 0.16;
        const sy = (i % 2 === 0 ? -1 : 1) * halfWid * 0.42;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Graceful neck & alert head
    ctx.save();
    ctx.translate(halfLen * 0.55 * stretch, 0);
    ctx.rotate(a.headYaw);

    ctx.strokeStyle = baseCol;
    ctx.lineWidth = Math.max(2.2, halfWid * 0.72);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.5, 0);
    ctx.lineTo(halfLen * 0.36 + headDrop, 0);
    ctx.stroke();

    const hx = halfLen * 0.44 + headDrop;
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(hx, 0, 2.75, 1.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Large swiveling ears
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.ellipse(hx - 1.5, -1.9, 1.75, 0.75, -0.65 + a.earAlert * 0.35, 0, Math.PI * 2);
    ctx.ellipse(hx - 1.5, 1.9, 1.75, 0.75, 0.65 - a.earAlert * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Black nose tip
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(hx + 2.45, 0, 0.65, 0, Math.PI * 2);
    ctx.fill();

    if (a.hasAntlers && !isWinter) {
      drawRoeAntlers(ctx, hx - 1.0, 0, halfWid * 0.95);
    }

    drawEyeShine(ctx, hx, 0, 0.7, 1.05, a.eyeShineIntensity, '#bbf7d0');
    ctx.restore();
    return;
  }

  // =========================================================================
  // 3. WILD BOAR (КАБАН) — Heavy wedge-shaped body, bristly dorsal ridge, tusks
  // =========================================================================
  if (a.species === 'wild_boar') {
    drawLimbs(ctx, legs, '#1f1916', '#0c0a09', 1.65, halfLen * 0.34, -halfLen * 0.42, halfWid);

    // Tufted whisk tail
    ctx.strokeStyle = secCol;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-halfLen * 0.8, 0);
    ctx.quadraticCurveTo(-halfLen * 1.02, tailWag * 2.2, -halfLen * 1.12, tailWag * 3.0);
    ctx.stroke();

    // Narrower hindquarters + broad muscular wedge forequarters
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.moveTo(-halfLen * 0.85, 0);
    ctx.quadraticCurveTo(-halfLen * 0.55, -halfWid * 0.85, halfLen * 0.25, -halfWid * 1.06 * breath);
    ctx.quadraticCurveTo(halfLen * 0.75, -halfWid * 0.82, halfLen * 0.95, -halfWid * 0.34);
    ctx.lineTo(halfLen * 0.95, halfWid * 0.34);
    ctx.quadraticCurveTo(halfLen * 0.75, halfWid * 0.82, halfLen * 0.25, halfWid * 1.06 * breath);
    ctx.quadraticCurveTo(-halfLen * 0.55, halfWid * 0.85, -halfLen * 0.85, 0);
    ctx.closePath();
    ctx.fill();

    // Bristled dorsal crest ("щетина") or longitudinal stripes for piglets
    if (a.age === 'juvenile') {
      ctx.strokeStyle = '#d6b48c';
      ctx.lineWidth = 0.85;
      for (const s of [-0.48, 0, 0.48]) {
        ctx.beginPath();
        ctx.moveTo(-halfLen * 0.62, s * halfWid);
        ctx.lineTo(halfLen * 0.45, s * halfWid * 0.85);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = secCol;
      ctx.beginPath();
      ctx.ellipse(halfLen * 0.12, 0, halfLen * 0.62, halfWid * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Thick neckless wedge head + snout disk + curved tusks
    ctx.save();
    ctx.translate(halfLen * 0.68, 0);
    ctx.rotate(a.headYaw * 0.55);

    // Flared bristled ears
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.ellipse(-0.4, -halfWid * 0.72, 1.9, 1.05, -0.5, 0, Math.PI * 2);
    ctx.ellipse(-0.4, halfWid * 0.72, 1.9, 1.05, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Conical boar head
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.moveTo(-1.2, -halfWid * 0.62);
    ctx.lineTo(4.6 + headDrop * 0.5, -1.35);
    ctx.lineTo(4.6 + headDrop * 0.5, 1.35);
    ctx.lineTo(-1.2, halfWid * 0.62);
    ctx.closePath();
    ctx.fill();

    // Flat rooting snout disk
    ctx.fillStyle = '#573b32';
    ctx.beginPath();
    ctx.ellipse(4.8 + headDrop * 0.5, 0, 0.95, 1.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ivory lower tusks on adult boars
    if (a.hasTusks) {
      ctx.strokeStyle = '#f5f0e1';
      ctx.lineWidth = 1.05;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(2.4, -1.6);
      ctx.quadraticCurveTo(3.6, -2.9, 2.7, -3.5);
      ctx.moveTo(2.4, 1.6);
      ctx.quadraticCurveTo(3.6, 2.9, 2.7, 3.5);
      ctx.stroke();
    }

    drawEyeShine(ctx, 1.2, 0, 0.4, 1.5, a.eyeShineIntensity, '#fca5a5');
    ctx.restore();
    return;
  }

  // =========================================================================
  // 4. BROWN BEAR (БУРЫЙ МЕДВЕДЬ) — Massive broad shoulders, shaggy fur, round ears
  // =========================================================================
  if (a.species === 'bear') {
    drawLimbs(ctx, legs, secCol, '#0c0a09', 3.4, halfLen * 0.34, -halfLen * 0.44, halfWid);

    // Broad muscular rump
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.32, 0, halfLen * 0.54 * stretch, halfWid * 0.94 * breath, 0, 0, Math.PI * 2);
    ctx.fill();

    // Massive forequarters & iconic dorsal shoulder hump
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(halfLen * 0.18, 0, halfLen * 0.52 * stretch, halfWid * 1.04 * breath, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shaggy dorsal ruff & shoulder hump highlight
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.ellipse(halfLen * 0.16, 0, halfLen * 0.42, halfWid * 0.68, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stubby bear tail
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.arc(-halfLen * 0.86, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Heavy broad bear skull, small rounded ears & lighter muzzle
    ctx.save();
    ctx.translate(halfLen * 0.64 * stretch, 0);
    ctx.rotate(a.headYaw * 0.72);

    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(2.2, 0, 4.4, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Small rounded teddy-like ears
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.arc(0.4, -3.4, 1.45, 0, Math.PI * 2);
    ctx.arc(0.4, 3.4, 1.45, 0, Math.PI * 2);
    ctx.fill();

    // Lighter brown muzzle & black nose
    ctx.fillStyle = accentCol;
    ctx.beginPath();
    ctx.ellipse(5.5, 0, 2.4, 2.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0c0a09';
    ctx.beginPath();
    ctx.ellipse(7.4, 0, 1.0, 1.25, 0, 0, Math.PI * 2);
    ctx.fill();

    drawEyeShine(ctx, 3.4, 0, 0.8, 1.85, a.eyeShineIntensity, '#fdba74');
    ctx.restore();
    return;
  }

  // =========================================================================
  // 5. WOLF (ВОЛК) — Lean timber predator, thick ruff, bushy black-tipped tail
  // =========================================================================
  if (a.species === 'wolf') {
    drawLimbs(ctx, legs, a.coat.bellyColor, '#18181b', 1.45, halfLen * 0.36, -halfLen * 0.44, halfWid);

    // Bushy tail with dark dorsal stripe & black tip
    ctx.save();
    ctx.translate(-halfLen * 0.76, 0);
    ctx.rotate(tailWag * 0.45 + a.spineBend * 0.5);
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.34, 0, halfLen * 0.38, 1.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.62, 0, halfLen * 0.16, 1.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Lean torso with narrow waist & broad chest ruff
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.18, 0, halfLen * 0.66 * stretch, halfWid * 0.78 * breath, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(halfLen * 0.24, 0, halfLen * 0.44 * stretch, halfWid * 0.96 * breath, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark timber saddle along spine
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.ellipse(0, 0, halfLen * 0.56, halfWid * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pointed wolf head, pale cheeks & upright triangular ears
    ctx.save();
    ctx.translate(halfLen * 0.62 * stretch, 0);
    ctx.rotate(a.headYaw);

    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(1.6, 0, 3.0, 2.25, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pale cheek ruff
    ctx.fillStyle = a.coat.bellyColor;
    ctx.beginPath();
    ctx.ellipse(0.9, -1.5, 1.5, 0.9, 0.2, 0, Math.PI * 2);
    ctx.ellipse(0.9, 1.5, 1.5, 0.9, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Pointed snout & black nose
    ctx.fillStyle = accentCol;
    ctx.beginPath();
    ctx.ellipse(4.1, 0, 1.9, 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.arc(5.8, 0, 0.62, 0, Math.PI * 2);
    ctx.fill();

    // Triangular ears
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.moveTo(0.2, -1.6);
    ctx.lineTo(-1.1, -2.9);
    ctx.lineTo(1.7, -2.0);
    ctx.closePath();
    ctx.moveTo(0.2, 1.6);
    ctx.lineTo(-1.1, 2.9);
    ctx.lineTo(1.7, 2.0);
    ctx.closePath();
    ctx.fill();

    drawEyeShine(ctx, 2.6, 0, 0.5, 1.15, a.eyeShineIntensity, '#fde047');
    ctx.restore();
    return;
  }

  // =========================================================================
  // 6. RED FOX (РЫЖАЯ ЛИСА) — Sleek flame coat, dark socks, huge white-tipped brush tail
  // =========================================================================
  if (a.species === 'fox') {
    drawLimbs(ctx, legs, '#1c1917', null, 1.05, halfLen * 0.34, -halfLen * 0.4, halfWid);

    // Signature massive fluffy white-tipped fox brush tail
    ctx.save();
    ctx.translate(-halfLen * 0.72, 0);
    ctx.rotate(tailWag * 0.55 + a.spineBend * 0.65);
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.44, 0, halfLen * 0.52, halfWid * 0.74, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.84, 0, halfLen * 0.2, halfWid * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Sleek elongated torso
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(0, 0, halfLen * 0.82 * stretch, halfWid * 0.84 * breath, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.06, 0, halfLen * 0.55, halfWid * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sharp triangular head, black-backed ears & white cheeks
    ctx.save();
    ctx.translate(halfLen * 0.62 * stretch, 0);
    ctx.rotate(a.headYaw);

    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.moveTo(-1.0, -halfWid * 0.68);
    ctx.lineTo(4.4, 0);
    ctx.lineTo(-1.0, halfWid * 0.68);
    ctx.closePath();
    ctx.fill();

    // Black-backed pointed ears
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.ellipse(-0.3, -1.7, 1.35, 0.7, -0.5, 0, Math.PI * 2);
    ctx.ellipse(-0.3, 1.7, 1.35, 0.7, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Crisp black nose
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.arc(4.3, 0, 0.5, 0, Math.PI * 2);
    ctx.fill();

    drawEyeShine(ctx, 1.4, 0, 0.4, 0.85, a.eyeShineIntensity, '#bef264');
    ctx.restore();
    return;
  }

  // =========================================================================
  // 7. SQUIRREL (БЕЛКА) — Agile tree-dweller with curled plumed tail & ear tufts
  // =========================================================================
  if (a.species === 'squirrel') {
    const tailCurl = Math.sin(nowSec * 7.5 + a.seed) * 0.25;
    // Curled bushy plumed tail arched back
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.72, tailCurl * 1.4, halfLen * 0.74, halfWid * 0.88, tailCurl, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.64, tailCurl * 1.1, halfLen * 0.55, halfWid * 0.62, tailCurl, 0, Math.PI * 2);
    ctx.fill();

    // Compact hunched body
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(halfLen * 0.1, 0, halfLen * 0.65 * stretch, halfWid * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head + ear tufts
    ctx.fillStyle = accentCol;
    ctx.beginPath();
    ctx.arc(halfLen * 0.68 * stretch, 0, halfWid * 0.68, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = secCol;
    ctx.fillRect(halfLen * 0.48 * stretch, -halfWid * 0.8, 1.1, 0.55);
    ctx.fillRect(halfLen * 0.48 * stretch, halfWid * 0.25, 1.1, 0.55);
    return;
  }

  // =========================================================================
  // 8. HEDGEHOG (ЁЖ) — Radial spiny dome; curls into tight defensive ball
  // =========================================================================
  if (a.species === 'hedgehog') {
    const curled = a.state === 'curled' || a.state === 'resting';
    const rx = curled ? halfWid * 1.05 : halfLen * 0.86;
    const ry = curled ? halfWid * 1.05 : halfWid * 0.95;

    // Pointed dark snout when uncurled
    if (!curled) {
      ctx.fillStyle = a.coat.bellyColor;
      ctx.beginPath();
      ctx.moveTo(rx * 0.55, -ry * 0.45);
      ctx.lineTo(rx * 1.38, 0);
      ctx.lineTo(rx * 0.55, ry * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(rx * 1.38, 0, 0.48, 0, Math.PI * 2);
      ctx.fill();
    }

    // Spiny dome base
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(curled ? 0 : -0.4, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crisp radial quill needles
    if (detailZoom) {
      ctx.strokeStyle = accentCol;
      ctx.lineWidth = 0.55;
      const quills = curled ? 14 : 10;
      ctx.beginPath();
      for (let q = 0; q < quills; q++) {
        const qa = (q / quills) * Math.PI * 2 + (curled ? 0 : Math.PI * 0.15);
        if (!curled && Math.abs(qa) < 0.55) continue;
        const qx0 = Math.cos(qa) * rx * 0.52;
        const qy0 = Math.sin(qa) * ry * 0.52;
        const qx1 = Math.cos(qa) * rx * 1.18;
        const qy1 = Math.sin(qa) * ry * 1.18;
        ctx.moveTo(qx0, qy0);
        ctx.lineTo(qx1, qy1);
      }
      ctx.stroke();
    }
    return;
  }

  // =========================================================================
  // 9. HARE (ЗАЯЦ-РУСАК / БЕЛЯК) — Long black-tipped ears, winter white molt, white scut
  // =========================================================================
  if (a.species === 'hare') {
    const boundStretch = a.gaitType === 'bound' ? stretch : 1.0;

    // Fluffy white scut tail
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(-halfLen * 0.88 * boundStretch, 0, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Muscular hind haunches & body
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.12, 0, halfLen * 0.8 * boundStretch, halfWid * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.18, 0, halfLen * 0.54 * boundStretch, halfWid * 0.58, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head & long swept-back ears with crisp black tips
    ctx.save();
    ctx.translate(halfLen * 0.56 * boundStretch, 0);
    ctx.rotate(a.headYaw * 0.6);

    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(0.9, 0, 2.0, 1.45, 0, 0, Math.PI * 2);
    ctx.fill();

    const earSweep = a.state === 'fleeing' ? -0.35 : 0.25 * a.earAlert;
    ctx.strokeStyle = baseCol;
    ctx.lineWidth = 1.25;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0.2, -0.7);
    ctx.lineTo(-2.6 + earSweep, -2.35);
    ctx.moveTo(0.2, 0.7);
    ctx.lineTo(-2.6 + earSweep, 2.35);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-2.6 + earSweep, -2.35, 0.62, 0, Math.PI * 2);
    ctx.arc(-2.6 + earSweep, 2.35, 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // =========================================================================
  // 10. COW (КОРОВА) — Broad barrel pasture body, Holstein/Simmental patches, horns, swishing tail
  // =========================================================================
  if (a.species === 'cow') {
    drawLimbs(ctx, legs, baseCol, '#1c1917', 2.0, halfLen * 0.36, -halfLen * 0.44, halfWid);

    // Long swishing fly-whisk tail with tassel tuft
    const tailSwish = Math.sin(nowSec * 2.8 + a.seed) * 0.55 + tailWag * 0.4;
    ctx.strokeStyle = baseCol;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(-halfLen * 0.84, 0);
    ctx.quadraticCurveTo(-halfLen * 1.05, tailSwish * 4.5, -halfLen * 1.18, tailSwish * 6.2);
    ctx.stroke();
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.ellipse(-halfLen * 1.2, tailSwish * 6.4, 1.7, 1.05, tailSwish, 0, Math.PI * 2);
    ctx.fill();

    // Broad boxy-barrel bovine torso
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.roundRect(-halfLen * 0.84, -halfWid * 0.96 * breath, halfLen * 1.66, halfWid * 1.92 * breath, halfWid * 0.72);
    ctx.fill();

    // Natural Holstein / Simmental / Brown-Swiss organic coat patches (clipped inside barrel!)
    if (a.coat.pattern === 'piebald' || a.coat.pattern === 'spotted') {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-halfLen * 0.84, -halfWid * 0.96 * breath, halfLen * 1.66, halfWid * 1.92 * breath, halfWid * 0.72);
      ctx.clip();
      ctx.fillStyle = secCol;
      for (let p = 0; p < 4; p++) {
        const px = (seededRand(a.seed, p * 3 + 1) - 0.5) * halfLen * 1.35;
        const py = (seededRand(a.seed, p * 3 + 2) - 0.5) * halfWid * 1.45;
        const prx = halfLen * (0.22 + seededRand(a.seed, p * 3 + 3) * 0.24);
        const pry = halfWid * (0.42 + seededRand(a.seed, p * 3 + 4) * 0.36);
        ctx.beginPath();
        ctx.ellipse(px, py, prx, pry, seededRand(a.seed, p + 20) * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else {
      // Subtle dorsal spine highlight
      ctx.fillStyle = secCol;
      ctx.beginPath();
      ctx.ellipse(0, 0, halfLen * 0.62, halfWid * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Thick neck, broad head, curved horns & pink/dark muzzle
    ctx.save();
    ctx.translate(halfLen * 0.66, 0);
    ctx.rotate(a.headYaw * 0.7);

    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(1.5, 0, 3.6, halfWid * 0.58, 0, 0, Math.PI * 2);
    ctx.fill();

    const hx = 4.2 + headDrop;
    // Outstretched ears
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.ellipse(hx - 2.1, -3.5, 2.0, 1.0, -0.4, 0, Math.PI * 2);
    ctx.ellipse(hx - 2.1, 3.5, 2.0, 1.0, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Head + broad square muzzle
    ctx.fillStyle = a.coat.pattern === 'piebald' ? secCol : baseCol;
    ctx.beginPath();
    ctx.ellipse(hx, 0, 4.0, 2.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accentCol;
    ctx.beginPath();
    ctx.ellipse(hx + 3.2, 0, 1.75, 2.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Curved ivory horns
    if (a.hasHorns) {
      ctx.strokeStyle = '#e7dec8';
      ctx.lineWidth = 1.35;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - 1.5, -2.0);
      ctx.quadraticCurveTo(hx - 0.6, -4.6, hx + 1.4, -4.3);
      ctx.moveTo(hx - 1.5, 2.0);
      ctx.quadraticCurveTo(hx - 0.6, 4.6, hx + 1.4, 4.3);
      ctx.stroke();
    }

    drawEyeShine(ctx, hx, 0, 0.8, 1.8, a.eyeShineIntensity, '#fef08a');
    ctx.restore();
    return;
  }

  // =========================================================================
  // 11. SHEEP (ОВЦА) — Scalloped fluffy woolly cloud silhouette & dark/cream face
  // =========================================================================
  if (a.species === 'sheep') {
    drawLimbs(ctx, legs, accentCol, '#1c1917', 1.25, halfLen * 0.34, -halfLen * 0.38, halfWid);

    // Scalloped multi-puff woolly fleece cloud
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.ellipse(-0.3, 0, halfLen * 0.82, halfWid * 1.04 * breath, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = baseCol;
    const puffs = [
      [-halfLen * 0.48, -halfWid * 0.42, halfWid * 0.56],
      [-halfLen * 0.48, halfWid * 0.42, halfWid * 0.56],
      [0, -halfWid * 0.52, halfWid * 0.62],
      [0, halfWid * 0.52, halfWid * 0.62],
      [halfLen * 0.42, -halfWid * 0.38, halfWid * 0.54],
      [halfLen * 0.42, halfWid * 0.38, halfWid * 0.54],
      [-halfLen * 0.68, 0, halfWid * 0.52],
      [0, 0, halfWid * 0.72],
    ];
    ctx.beginPath();
    for (let i = 0; i < puffs.length; i++) {
      const [px, py, pr] = puffs[i];
      ctx.moveTo(px + pr, py);
      ctx.arc(px, py, pr, 0, Math.PI * 2);
    }
    ctx.fill();

    // Woolly bobbed tail
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.arc(-halfLen * 0.92, tailWag * 0.8, 1.65, 0, Math.PI * 2);
    ctx.fill();

    // Narrow face poking out of fleece
    ctx.save();
    ctx.translate(halfLen * 0.64, 0);
    ctx.rotate(a.headYaw * 0.75);

    ctx.fillStyle = accentCol;
    ctx.beginPath();
    ctx.ellipse(2.0 + headDrop, 0, 2.75, 1.65, 0, 0, Math.PI * 2);
    ctx.fill();
    // Drooping ears
    ctx.beginPath();
    ctx.ellipse(0.6 + headDrop, -2.0, 1.5, 0.7, -0.5, 0, Math.PI * 2);
    ctx.ellipse(0.6 + headDrop, 2.0, 1.5, 0.7, 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Little wool tuft on forehead
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.arc(0.4 + headDrop, 0, 1.35, 0, Math.PI * 2);
    ctx.fill();

    drawEyeShine(ctx, 2.0 + headDrop, 0, 0.6, 1.0, a.eyeShineIntensity, '#fef9c3');
    ctx.restore();
    return;
  }

  // =========================================================================
  // 12. HORSE (ЛОШАДЬ) — Athletic barrel, flowing mane along neck, long sweeping tail
  // =========================================================================
  if (a.species === 'horse') {
    drawLimbs(ctx, legs, secCol, '#1c1917', 1.9, halfLen * 0.4, -halfLen * 0.46, halfWid);

    // Long flowing horsehair tail
    ctx.save();
    ctx.translate(-halfLen * 0.84, 0);
    ctx.rotate(tailWag * 0.45 + a.spineBend * 0.55);
    ctx.fillStyle = accentCol;
    ctx.beginPath();
    ctx.moveTo(0, -1.2);
    ctx.quadraticCurveTo(-halfLen * 0.35, -2.1, -halfLen * 0.62, 0);
    ctx.quadraticCurveTo(-halfLen * 0.35, 2.1, 0, 1.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Muscular sculpted equine hindquarters & barrel
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.36, 0, halfLen * 0.52 * stretch, halfWid * 0.94 * breath, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(halfLen * 0.16, 0, halfLen * 0.54 * stretch, halfWid * 0.92 * breath, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pinto / dapple coat variations
    if (a.coat.pattern === 'piebald' || a.coat.pattern === 'dapple') {
      ctx.fillStyle = secCol;
      for (let i = 0; i < 4; i++) {
        const px = -halfLen * 0.5 + i * halfLen * 0.3;
        const py = (i % 2 === 0 ? -1 : 1) * halfWid * 0.36;
        ctx.beginPath();
        ctx.ellipse(px, py, a.coat.pattern === 'dapple' ? 1.8 : 4.2, a.coat.pattern === 'dapple' ? 1.4 : 2.8, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Long arched neck with flowing mane crest + narrow noble head
    ctx.save();
    ctx.translate(halfLen * 0.52 * stretch, 0);
    ctx.rotate(a.headYaw * 0.72);

    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(halfLen * 0.18, 0, halfLen * 0.28, halfWid * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flowing mane along neck ridge
    ctx.fillStyle = accentCol;
    ctx.beginPath();
    ctx.ellipse(halfLen * 0.14, -0.5, halfLen * 0.3, 1.25, 0.06, 0, Math.PI * 2);
    ctx.fill();

    const hx = halfLen * 0.48 + headDrop;
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(hx, 0, 4.4, 2.05, 0, 0, Math.PI * 2);
    ctx.fill();

    // White forehead blaze on some horses
    if (a.seed % 3 === 0) {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(hx + 1.4, 0, 2.4, 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pricked equine ears
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(hx - 2.4, -2.0, 1.6, 0.65, -0.55, 0, Math.PI * 2);
    ctx.ellipse(hx - 2.4, 2.0, 1.6, 0.65, 0.55, 0, Math.PI * 2);
    ctx.fill();

    drawEyeShine(ctx, hx, 0, 0.8, 1.35, a.eyeShineIntensity, '#fde68a');
    ctx.restore();
    return;
  }

  // =========================================================================
  // 13. DOG (СОБАКА) — Urban/village mutts & breeds, wagging tail, collars, saddle/spotted
  // =========================================================================
  if (a.species === 'dog') {
    if (a.state === 'resting') {
      // Curled sleeping dog donut
      ctx.fillStyle = baseCol;
      ctx.beginPath();
      ctx.arc(0, 0, halfLen * 0.68, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = secCol;
      ctx.beginPath();
      ctx.arc(-halfLen * 0.14, halfWid * 0.12, halfLen * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = baseCol;
      ctx.beginPath();
      ctx.ellipse(halfLen * 0.34, -halfWid * 0.15, 2.4, 1.8, 0.6, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    drawLimbs(ctx, legs, a.coat.bellyColor, null, 1.3, halfLen * 0.34, -halfLen * 0.42, halfWid);

    // Expressive wagging dog tail (tucked when scared, high & wagging fast when friendly!)
    const wagAmp = a.state === 'fleeing' ? 0.15 : 0.45 + a.tailHeight * 0.55;
    const tAngle = Math.sin(a.tailPhase) * wagAmp + a.spineBend * 0.4;
    ctx.save();
    ctx.translate(-halfLen * 0.74, 0);
    ctx.rotate(tAngle);
    ctx.strokeStyle = baseCol;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-halfLen * 0.25, 0.8, -halfLen * 0.46, 0);
    ctx.stroke();
    ctx.restore();

    // Torso
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(0, 0, halfLen * 0.78 * stretch, halfWid * 0.88 * breath, 0, 0, Math.PI * 2);
    ctx.fill();

    // Natural breed coat markings (shepherd saddle / spotted / brindle)
    if (a.coat.pattern === 'saddle') {
      ctx.fillStyle = secCol;
      ctx.beginPath();
      ctx.ellipse(-halfLen * 0.04, 0, halfLen * 0.52, halfWid * 0.64, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (a.coat.pattern === 'spotted' || a.coat.pattern === 'piebald') {
      ctx.fillStyle = secCol;
      ctx.beginPath();
      ctx.ellipse(-halfLen * 0.28, -halfWid * 0.26, halfLen * 0.28, halfWid * 0.44, 0.4, 0, Math.PI * 2);
      ctx.ellipse(halfLen * 0.18, halfWid * 0.25, halfLen * 0.24, halfWid * 0.38, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Optional worn collar on village/yard dogs
    if (a.coat.collarColor) {
      ctx.strokeStyle = a.coat.collarColor;
      ctx.lineWidth = 1.45;
      ctx.beginPath();
      ctx.moveTo(halfLen * 0.48, -halfWid * 0.66);
      ctx.lineTo(halfLen * 0.48, halfWid * 0.66);
      ctx.stroke();
    }

    // Head, snout & ears (upright vs floppy by seed)
    ctx.save();
    ctx.translate(halfLen * 0.6 * stretch, 0);
    ctx.rotate(a.headYaw);

    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(1.3, 0, 2.55, 2.0, 0, 0, Math.PI * 2);
    ctx.fill();

    // Muzzle & black nose
    ctx.fillStyle = accentCol;
    ctx.beginPath();
    ctx.ellipse(3.3, 0, 1.55, 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.arc(4.6, 0, 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Ears (floppy or pricked shepherd ears)
    ctx.fillStyle = secCol;
    if (a.seed % 2 === 0) {
      // Pricked pointed ears
      ctx.beginPath();
      ctx.moveTo(0.2, -1.4);
      ctx.lineTo(-0.8, -2.6);
      ctx.lineTo(1.5, -1.7);
      ctx.closePath();
      ctx.moveTo(0.2, 1.4);
      ctx.lineTo(-0.8, 2.6);
      ctx.lineTo(1.5, 1.7);
      ctx.closePath();
      ctx.fill();
    } else {
      // Soft folded/floppy ears
      ctx.beginPath();
      ctx.ellipse(0.6, -2.0, 1.4, 0.85, 0.35, 0, Math.PI * 2);
      ctx.ellipse(0.6, 2.0, 1.4, 0.85, -0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    drawEyeShine(ctx, 2.1, 0, 0.45, 0.95, a.eyeShineIntensity, '#bef264');
    ctx.restore();
    return;
  }

  // =========================================================================
  // 14. CAT (КОШКА) — Sinuous body, S-curved expressive tail, tabby/calico/tuxedo/ginger
  // =========================================================================
  if (a.species === 'cat') {
    if (a.state === 'resting') {
      // Sunbathing loaf / curled cat ball with tucked tail
      ctx.fillStyle = baseCol;
      ctx.beginPath();
      ctx.ellipse(0, 0, halfLen * 0.66, halfWid * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
      if (a.coat.pattern === 'tabby' || a.coat.pattern === 'calico') {
        ctx.fillStyle = secCol;
        ctx.beginPath();
        ctx.ellipse(-0.6, 0.4, halfLen * 0.35, halfWid * 0.55, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      // Tail curled tightly around body
      ctx.strokeStyle = baseCol;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, halfWid * 1.25, 0.5, 2.6);
      ctx.stroke();
      // Tucked head
      ctx.fillStyle = baseCol;
      ctx.beginPath();
      ctx.arc(halfLen * 0.42, -0.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    drawLimbs(ctx, legs, a.coat.pattern === 'tuxedo' ? '#f8fafc' : baseCol, null, 0.95, halfLen * 0.34, -halfLen * 0.38, halfWid);

    // Long sinuous S-curved cat tail (puffed thick when hissing/fleeing!)
    const tailSway = Math.sin(a.tailPhase) * 0.65;
    const tailThickness = a.fear > 0.55 ? 1.85 : 1.05;
    ctx.save();
    ctx.translate(-halfLen * 0.72, 0);
    ctx.strokeStyle = baseCol;
    ctx.lineWidth = tailThickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(
      -halfLen * 0.32, tailSway * 2.8,
      -halfLen * 0.62, -tailSway * 2.4,
      -halfLen * 0.92, tailSway * 1.6
    );
    ctx.stroke();
    ctx.restore();

    // Supple feline torso
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(0, 0, halfLen * 0.76 * stretch, halfWid * 0.84 * breath, 0, 0, Math.PI * 2);
    ctx.fill();

    // Feline coat genetics: mackerel tabby stripes / calico patches / tuxedo bib
    if (a.coat.pattern === 'tabby' && detailZoom) {
      ctx.strokeStyle = secCol;
      ctx.lineWidth = 0.85;
      for (let st = -2; st <= 2; st++) {
        const sx = st * halfLen * 0.22;
        ctx.beginPath();
        ctx.moveTo(sx, -halfWid * 0.72);
        ctx.lineTo(sx - 0.5, halfWid * 0.72);
        ctx.stroke();
      }
    } else if (a.coat.pattern === 'calico') {
      ctx.fillStyle = secCol;
      ctx.beginPath();
      ctx.ellipse(-halfLen * 0.25, -halfWid * 0.32, halfLen * 0.28, halfWid * 0.44, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accentCol;
      ctx.beginPath();
      ctx.ellipse(halfLen * 0.16, halfWid * 0.28, halfLen * 0.24, halfWid * 0.4, -0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (a.coat.pattern === 'tuxedo') {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(halfLen * 0.45, 0, halfLen * 0.2, halfWid * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Round feline head, sharp triangular ears & delicate nose
    ctx.save();
    ctx.translate(halfLen * 0.62 * stretch, 0);
    ctx.rotate(a.headYaw);

    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.ellipse(1.0, 0, 2.05, 1.9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pointed triangular ears
    ctx.fillStyle = secCol;
    ctx.beginPath();
    ctx.moveTo(0.4, -1.2);
    ctx.lineTo(-0.7, -2.35);
    ctx.lineTo(1.5, -1.55);
    ctx.closePath();
    ctx.moveTo(0.4, 1.2);
    ctx.lineTo(-0.7, 2.35);
    ctx.lineTo(1.5, 1.55);
    ctx.closePath();
    ctx.fill();

    // Pink/dark tiny nose
    ctx.fillStyle = a.coat.pattern === 'tuxedo' || a.coat.pattern === 'calico' ? '#f472b6' : '#27272a';
    ctx.beginPath();
    ctx.arc(2.9, 0, 0.42, 0, Math.PI * 2);
    ctx.fill();

    drawEyeShine(ctx, 1.6, 0, 0.4, 0.78, a.eyeShineIntensity, '#4ade80');
    ctx.restore();
  }
}

export class AnimalRenderer {
  public static renderAnimals(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    nightAlpha: number,
    cameraZoom: number
  ) {
    const animals = world.animals;
    if (!performanceConfig.enableAnimals || !animals || animals.length === 0) return;

    const nowSec = typeof performance !== 'undefined' ? performance.now() * 0.001 : 0;
    const sun = getCurrentSunShadowState();
    const season = world.calendar?.season || world.season || 'summer';
    const isWinter = season === 'winter' || (world.snowCover ?? 0) > 0.55;
    const detailZoom = cameraZoom > 0.48 && !performanceConfig.lowQualityRendering;

    ctx.save();
    for (let i = 0; i < animals.length; i++) {
      const a = animals[i];
      if (a.state === 'in_tree') continue; // Squirrels hidden up inside pine/birch canopy
      const pad = Math.max(24, a.bodyLength * 1.4);
      if (a.x < minX - pad || a.x > maxX + pad || a.y < minY - pad || a.y > maxY + pad) {
        continue;
      }

      const visualY = a.y - (a.z || 0) * 0.72;

      // 1. Dynamic Sun-Projected Ground Contact Shadow
      drawGroundShadow(ctx, a, sun, nightAlpha, a.bodyLength * 0.52, a.bodyWidth * 0.52);

      // 2. Articulated Top-Down 2.5D Species Model
      ctx.save();
      ctx.translate(a.x, visualY);
      ctx.rotate(a.angle);

      // Subtle leaping scale elevation when bounding/launched
      if (a.z > 0.5) {
        const zScale = 1.0 + Math.min(0.24, a.z * 0.012);
        ctx.scale(zScale, zScale);
      }

      drawSpeciesBody(ctx, a, nowSec, isWinter, nightAlpha, detailZoom);

      // Nighttime ambient dimness over fur (keeps eye-shine vivid!)
      if (nightAlpha > 0.35 && a.state !== 'dead') {
        // Subtle natural silhouette darkening handled by world lightmap pass
      }

      ctx.restore();
    }
    ctx.restore();
  }
}
