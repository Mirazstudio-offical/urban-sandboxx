import { DeformVertex, Vehicle } from './types';

/**
 * Traces a softbody perimeter contour using Catmull-Rom splines for smooth metal curves
 * and high-frequency accordion fold vertices for crumpled plastic-strain zones.
 */
export function traceSoftbodyPath(
  ctx: CanvasRenderingContext2D,
  bodyPoly: { x: number; y: number }[],
  deformedVertices?: DeformVertex[]
): void {
  if (!bodyPoly || bodyPoly.length === 0) return;
  const n = bodyPoly.length;

  const pStart = bodyPoly[0];
  if (!pStart || !isFinite(pStart.x) || !isFinite(pStart.y)) return;

  ctx.moveTo(pStart.x, pStart.y);

  for (let i = 0; i < n; i++) {
    const idx0 = i;
    const idx1 = (i + 1) % n;
    const idxPrev = (i - 1 + n) % n;
    const idxNext = (i + 2) % n;

    const p0 = bodyPoly[idx0];
    const p1 = bodyPoly[idx1];
    const pPrev = bodyPoly[idxPrev];
    const pNext = bodyPoly[idxNext];

    if (!p0 || !p1 || !pPrev || !pNext ||
        !isFinite(p0.x) || !isFinite(p0.y) ||
        !isFinite(p1.x) || !isFinite(p1.y) ||
        !isFinite(pPrev.x) || !isFinite(pPrev.y) ||
        !isFinite(pNext.x) || !isFinite(pNext.y)) {
      continue;
    }

    const strain0 = deformedVertices ? (deformedVertices[idx0]?.plasticStrain || 0) : 0;
    const strain1 = deformedVertices ? (deformedVertices[idx1]?.plasticStrain || 0) : 0;
    const maxStrain = Math.max(strain0, strain1);

    // Dynamic spline tension factor: smoother rounded curves for bulges, slightly tighter for severe crumpled zones
    const tension = Math.max(0.12, 0.22 - maxStrain * 0.05);

    // Smooth Catmull-Rom / Bezier curve segment across all nodes (prevents sharp 1-point triangular spikes)
    const cp1x = p0.x + (p1.x - pPrev.x) * tension;
    const cp1y = p0.y + (p1.y - pPrev.y) * tension;
    const cp2x = p1.x - (pNext.x - p0.x) * tension;
    const cp2y = p1.y - (pNext.y - p0.y) * tension;

    if (isFinite(cp1x) && isFinite(cp1y) && isFinite(cp2x) && isFinite(cp2y)) {
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p1.x, p1.y);
    } else {
      ctx.lineTo(p1.x, p1.y);
    }
  }
}

/**
 * Renders metallic stress highlights on raised fold ridges
 * and ambient occlusion shadow lines inside deep crease troughs.
 */
export function renderSoftbodyStressLines(
  ctx: CanvasRenderingContext2D,
  bodyPoly: { x: number; y: number }[],
  deformedVertices?: DeformVertex[]
): void {
  if (!deformedVertices || deformedVertices.length < 16) return;

  const n = bodyPoly.length;
  for (let i = 0; i < n; i++) {
    const dv = deformedVertices[i];
    if (!dv) continue;
    const strain = dv.plasticStrain || 0;
    if (strain < 0.12) continue;

    const p = bodyPoly[i];
    const pPrev = bodyPoly[(i - 1 + n) % n];
    const pNext = bodyPoly[(i + 1) % n];

    // Compute angle bend between previous and next edge
    const v1x = p.x - pPrev.x;
    const v1y = p.y - pPrev.y;
    const v2x = pNext.x - p.x;
    const v2y = pNext.y - p.y;

    const cross = v1x * v2y - v1y * v2x;
    const isConvex = cross > 0;

    // Line inward towards car center
    const len = Math.hypot(p.x, p.y) || 1;
    const dirX = -p.x / len;
    const dirY = -p.y / len;

    const lineLen = Math.min(10, 3 + strain * 5);

    ctx.save();
    ctx.lineWidth = 1.1;

    if (isConvex) {
      // Metallic Specular Ridge Highlight
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.7, 0.25 + strain * 0.4)})`;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + dirX * lineLen, p.y + dirY * lineLen);
      ctx.stroke();
    } else {
      // Ambient Occlusion Crease Shadow
      ctx.strokeStyle = `rgba(15, 23, 42, ${Math.min(0.8, 0.35 + strain * 0.45)})`;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + dirX * lineLen, p.y + dirY * lineLen);
      ctx.stroke();
    }

    ctx.restore();
  }
}

/**
 * Renders 2.5D buckled hood overlay with fold shadow and ridge specular highlight
 */
export function renderBuckledHoodOverlay(
  ctx: CanvasRenderingContext2D,
  car: Vehicle,
  bodyPoly: { x: number; y: number }[],
  halfL: number,
  halfW: number
): void {
  const dmg = car.damage;
  if (!dmg) return;

  const hoodAmount = dmg.hoodRaisedAmount || (dmg.hoodBuckled ? 0.5 : 0);
  if (hoodAmount <= 0) return;

  const fc = dmg.frontCrumple || 0;
  const hoodApexX = halfL * 0.15 - fc * 0.5;
  const hoodWidth = halfW * 1.35;
  const liftY = Math.min(6, hoodAmount * 5);

  ctx.save();

  // Dark cast shadow under the buckled fold line
  ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.beginPath();
  ctx.moveTo(halfL - fc - 2, -hoodWidth * 0.4);
  ctx.lineTo(hoodApexX, 0);
  ctx.lineTo(halfL - fc - 2, hoodWidth * 0.4);
  ctx.lineTo(hoodApexX - 3, 0);
  ctx.closePath();
  ctx.fill();

  // Raised V-shaped fold ridge with bright specular highlight
  ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.85, 0.35 + hoodAmount * 0.5)})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(halfL - fc - 1, -hoodWidth * 0.38 - liftY * 0.2);
  ctx.lineTo(hoodApexX, -liftY);
  ctx.lineTo(halfL - fc - 1, hoodWidth * 0.38 + liftY * 0.2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Renders sagging or dangling bumper ends on severe corner impacts
 */
export function renderSaggingBumpers(
  ctx: CanvasRenderingContext2D,
  car: Vehicle,
  bodyPoly: { x: number; y: number }[],
  halfL: number,
  halfW: number
): void {
  const dmg = car.damage;
  if (!dmg || bodyPoly.length < 16) return;

  const sagL = dmg.bumperSagLeft || 0;
  const sagR = dmg.bumperSagRight || 0;

  if (sagL > 0) {
    const p = bodyPoly[2]; // Front-left corner
    if (p) {
      const swing = Math.sin(Date.now() * 0.008 + car.x) * 1.5 * sagL;
      ctx.save();
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(p.x - 1, p.y - 2 + swing, 3.5, 2.5 + sagL * 3);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  if (sagR > 0) {
    const p = bodyPoly.length >= 20 ? bodyPoly[17] : (bodyPoly[14] || bodyPoly[bodyPoly.length - 2]); // Front-right corner
    if (p) {
      const swing = Math.cos(Date.now() * 0.008 + car.y) * 1.5 * sagR;
      ctx.save();
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(p.x - 1, p.y - 0.5 + swing, 3.5, 2.5 + sagR * 3);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
}
