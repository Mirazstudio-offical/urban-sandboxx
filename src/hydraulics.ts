// Shared physical hydraulic actuator helpers for excavators, truck cranes, and outriggers.
// Models diesel-driven pump RPM flow, multi-circuit distributor flow sharing,
// proportional spool ramp-up / viscous hydraulic braking, and cylinder end-stop cushioning.

export const clamp01 = (v: number): number => (v <= 0 ? 0 : v >= 1 ? 1 : v);

/**
 * Scales hydraulic pump flow rate from diesel engine RPM and (optional) hydraulic oil temperature.
 * - Idle (~650-800 RPM): ~0.76x nominal flow
 * - Working governor (~1450-1600 RPM): 1.00x nominal flow
 * - High throttle (~2200+ RPM): up to 1.18x flow
 * - Cold HLP-46 oil (< 35 C): slightly higher viscosity (~0.88x at 20 C -> 1.0x at 40 C+)
 */
export function computePumpFlowFactor(engineRPM?: number, oilTempC?: number): number {
  let rpmFactor = 1.0;
  if (typeof engineRPM === 'number' && Number.isFinite(engineRPM) && engineRPM > 0) {
    // Map 650 RPM -> 0.76, 1500 RPM -> 1.00, 2300 RPM -> 1.18
    const norm = (engineRPM - 650) / 850;
    rpmFactor = Math.max(0.68, Math.min(1.18, 0.76 + norm * 0.24));
  }

  let viscosityFactor = 1.0;
  if (typeof oilTempC === 'number' && Number.isFinite(oilTempC)) {
    if (oilTempC < 40) {
      const warmT = clamp01((oilTempC - 15) / 25);
      viscosityFactor = 0.86 + warmT * 0.14;
    }
  }

  return rpmFactor * viscosityFactor;
}

/**
 * Splits pump flow realistically when multiple distributor spools are opened simultaneously.
 * Twin-pump systems (e.g. EK-12 dual axial-piston pumps) suffer less starvation than single-pump cranes.
 */
export function computeFlowShare(activeCircuits: number, isTwinPump = false): number {
  if (activeCircuits <= 1) return 1.0;
  const exponent = isTwinPump ? 0.38 : 0.48;
  return 1.0 / Math.pow(activeCircuits, exponent);
}

/**
 * Hydraulic cylinder internal end-stop cushioning.
 * Smoothly tapers target velocity in the last ~6-7% of stroke toward 0.0 or 1.0
 * so heavy arms decelerate cleanly into the stops rather than slamming at full speed.
 */
export function computeEndStopCushion(pos: number, dir: number, cushionZone = 0.065): number {
  if (dir === 0 || cushionZone <= 0) return 1.0;
  const dist = dir > 0 ? 1.0 - pos : pos;
  if (dist >= cushionZone) return 1.0;
  if (dist <= 0) return 0.0;
  const t = clamp01(dist / cushionZone);
  // Smooth ease-out curve with 0.22 minimum creep so cylinder always finishes travel cleanly
  const smooth = t * t * (3 - 2 * t);
  return 0.22 + 0.78 * smooth;
}

/**
 * Frame-rate independent exponential hydraulic velocity solver.
 * Separates spool opening / inertia buildup (`accelRate`), viscous stop braking (`brakeRate`),
 * and active counter-pressure reversal (`brakeRate * 1.35`).
 */
export function stepHydraulicVelocity(
  currentVel: number,
  targetVel: number,
  accelRate: number,
  brakeRate: number,
  dt: number
): number {
  const safeDt = Math.max(0, Math.min(0.05, dt));
  if (safeDt === 0) return currentVel;

  const isReversing =
    targetVel !== 0 &&
    currentVel !== 0 &&
    Math.sign(targetVel) !== Math.sign(currentVel);
  const isBraking = Math.abs(targetVel) < Math.abs(currentVel);

  const rate = isReversing
    ? brakeRate * 1.35
    : isBraking
    ? brakeRate
    : accelRate;

  const alpha = 1.0 - Math.exp(-Math.max(0.1, rate) * safeDt);
  const next = currentVel + (targetVel - currentVel) * alpha;

  if (targetVel === 0 && Math.abs(next) < 1e-4) {
    return 0;
  }
  return next;
}
