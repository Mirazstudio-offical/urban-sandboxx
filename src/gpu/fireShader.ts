/**
 * GpuFireRenderer — Real-time WebGL2 Procedural Volumetric Combustion & Blackbody Fire Engine.
 *
 * Replaces particle-spam sprite flames with an instanced GPU fragment shader that solves:
 *   - Multi-octave domain-warped turbulent advection (Kelvin-Helmholtz curl vortices + ridged flame sheets)
 *   - Anisotropic wind & vehicle slipstream shearing + screen-space convective thermal buoyancy
 *   - Emitter-specific combustion bed geometry (organic fuel/oil puddles, engine hood seams & grille jets,
 *     cabin window venting, ruptured rear fuel tank jets, and transient explosion fireballs)
 *   - True Planckian blackbody emission ramp (1800K white-yellow core -> 1300K amber-orange tongues ->
 *     850K crimson shear tips -> absorptive pyrolysis carbon soot rim)
 *
 * Uses premultiplied alpha blending (ONE, ONE_MINUS_SRC_ALPHA) and tight screen-space scissor bounds
 * so that both dark absorptive soot edges and additive incandescent flame cores composite in a single
 * sub-millisecond pass, with zero allocations and zero particle saturation when idle.
 */

export const enum FireEmitterKind {
  FuelPool = 0,
  OilPool = 1,
  VehicleEngine = 2,
  VehicleCabin = 3,
  VehicleTank = 4,
  TransientFlash = 5,
}

export interface FireEmitter {
  x: number;           // World X center (px)
  y: number;           // World Y center (px)
  radiusX: number;     // Half-length along emitter local X (px)
  radiusY: number;     // Half-width along emitter local Y (px)
  angle: number;       // World orientation angle (radians)
  intensity: number;   // 0..1+ combustion intensity
  kind: FireEmitterKind;
  seed: number;        // Deterministic spatial/entity phase seed
  windVx: number;      // Local slipstream + atmospheric wind X (world px/s)
  windVy: number;      // Local slipstream + atmospheric wind Y (world px/s)
  burnRatio: number;   // 0..1 lifecycle / burn progression
}

export interface CameraTransform {
  x: number;
  y: number;
  zoom: number;
  angle: number;
}

const MAX_INSTANCES = 128;
const FLOATS_PER_INSTANCE = 11;

const VS_FIRE = `#version 300 es
precision highp float;

layout(location = 0) in vec4 aCenterAndSize;     // x, y, radiusX, radiusY
layout(location = 1) in vec4 aAngleIntKindSeed;  // angle, intensity, kind, seed
layout(location = 2) in vec3 aWindAndBurn;       // windVx, windVy, burnRatio

uniform vec2 uCamPos;
uniform float uCamZoom;
uniform float uCamAngle;
uniform vec2 uViewSize;

out vec2 vWorldPos;
out vec2 vLocalPos;
out vec4 vCenterSize;
out vec4 vParams;
out vec3 vWindBurn;
out vec2 vZenithDir;

void main() {
  // Quad corner in [-1, 1] from gl_VertexID (0..5)
  int vid = gl_VertexID;
  vec2 corner = vec2(
    (vid == 1 || vid == 2 || vid == 4) ? 1.0 : -1.0,
    (vid == 2 || vid == 4 || vid == 5) ? 1.0 : -1.0
  );

  vec2 center = aCenterAndSize.xy;
  vec2 radii = max(aCenterAndSize.zw, vec2(2.0));
  float angle = aAngleIntKindSeed.x;
  float intensity = aAngleIntKindSeed.y;
  float kind = aAngleIntKindSeed.z;

  // True Top-Down 2.5D zenith perspective vector:
  // In a bird's-eye view, vertical height (+Z toward camera) projects radially outward from camera center
  // by a subtle zenith parallax, while horizontal drift is driven strictly by world wind & slipstream.
  vec2 camToEmitter = center - uCamPos;
  float camDist = length(camToEmitter);
  vec2 zenithParallax = camDist > 1.0 ? (camToEmitter / camDist) * min(14.0, camDist * 0.035) : vec2(0.0);

  vec2 draftWorld = aWindAndBurn.xy * 0.95 + zenithParallax;
  float draftMag = length(draftWorld);
  vec2 draftDir = draftMag > 0.001 ? (draftWorld / draftMag) : vec2(cos(angle), sin(angle));

  // Generous quad bounds to encompass 360-degree top-down flame tongues AND the rising/downwind smoke crown
  float padScale = (kind > 1.5 && kind < 4.5) ? 3.25 : 2.95;
  float windStretch = min((radii.x + radii.y) * 1.55, draftMag * 0.58) * clamp(intensity, 0.40, 1.40);

  float ca = cos(angle);
  float sa = sin(angle);
  vec2 axisX = vec2(ca, sa);
  vec2 axisY = vec2(-sa, ca);

  // Shift quad center slightly along horizontal wind/plume drift so downwind smoke never clips
  vec2 quadCenter = center + draftDir * (windStretch * 0.48);
  vec2 halfSpan = radii * padScale + vec2(windStretch * 0.78);

  vec2 worldPos = quadCenter + axisX * (corner.x * halfSpan.x) + axisY * (corner.y * halfSpan.y);
  vec2 relWorld = worldPos - center;
  vec2 localPos = vec2(dot(relWorld, axisX) / radii.x, dot(relWorld, axisY) / radii.y);

  // Transform worldPos to screen space matching GameRenderer:
  float camRot = -uCamAngle - 1.57079632679;
  vec2 camRel = worldPos - uCamPos;
  float cCam = cos(camRot);
  float sCam = sin(camRot);
  vec2 rotPx = vec2(camRel.x * cCam - camRel.y * sCam, camRel.x * sCam + camRel.y * cCam) * uCamZoom;
  vec2 screenPx = rotPx + uViewSize * 0.5;

  vec2 clip = vec2(
    (screenPx.x / uViewSize.x) * 2.0 - 1.0,
    1.0 - (screenPx.y / uViewSize.y) * 2.0
  );

  gl_Position = vec4(clip, 0.0, 1.0);
  vWorldPos = worldPos;
  vLocalPos = localPos;
  vCenterSize = vec4(center, radii);
  vParams = aAngleIntKindSeed;
  vWindBurn = aWindAndBurn;
  vZenithDir = zenithParallax;
}`;

const FS_FIRE = `#version 300 es
precision highp float;

in vec2 vWorldPos;
in vec2 vLocalPos;
in vec4 vCenterSize;
in vec4 vParams;
in vec3 vWindBurn;
in vec2 vZenithDir;

uniform float uTime;
uniform float uCamAngle;
uniform float uSmokeCrown;

out vec4 oColor;

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Smooth 2D value noise with analytical spatial derivatives: vec3(val, dVal/dx, dVal/dy)
vec3 noise2DGrad(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);

  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));

  float k0 = a;
  float k1 = b - a;
  float k2 = c - a;
  float k3 = a - b - c + d;

  float val = k0 + k1 * u.x + k2 * u.y + k3 * u.x * u.y;
  vec2 grad = du * (vec2(k1, k2) + k3 * u.yx);
  return vec3(val, grad);
}

// Fast cellular Voronoi boil pattern for top-down convection cells & billowing smoke cauliflower lobes
float cellularBoil(vec2 p, float timeOffset) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float minDist = 1.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      float h = hash21(n + g);
      vec2 o = 0.5 + 0.38 * sin(timeOffset + 6.2831 * vec2(h, fract(h * 17.3)));
      vec2 r = g + o - f;
      float d = dot(r, r);
      minDist = min(minDist, d);
    }
  }
  return sqrt(minDist);
}

// Planckian blackbody color ramp for top-down combustion zones
vec3 blackbodyColor(float temp) {
  vec3 soot     = vec3(0.04,  0.025, 0.02);
  vec3 ember    = vec3(0.55,  0.045, 0.008);
  vec3 crimson  = vec3(0.94,  0.16,  0.015);
  vec3 orange   = vec3(1.00,  0.50,  0.045);
  vec3 gold     = vec3(1.00,  0.85,  0.26);
  vec3 whiteHot = vec3(1.00,  0.98,  0.90);

  vec3 col = mix(soot, ember, smoothstep(0.04, 0.22, temp));
  col = mix(col, crimson,  smoothstep(0.20, 0.44, temp));
  col = mix(col, orange,   smoothstep(0.40, 0.72, temp));
  col = mix(col, gold,     smoothstep(0.68, 0.96, temp));
  col = mix(col, whiteHot, smoothstep(0.94, 1.30, temp));
  return col;
}

void main() {
  float angle = vParams.x;
  float intensity = clamp(vParams.y, 0.05, 1.5);
  int kind = int(floor(vParams.z + 0.5));
  float seed = vParams.w;
  vec2 windWorld = vWindBurn.xy;
  float burnRatio = clamp(vWindBurn.z, 0.0, 1.0);
  vec2 radii = vCenterSize.zw;

  // Rotate horizontal world wind + subtle 2.5D camera zenith parallax into emitter-local space
  vec2 draftWorld = windWorld * 0.95 + vZenithDir;
  float ca = cos(angle);
  float sa = sin(angle);
  vec2 draftLocal = vec2(
    draftWorld.x * ca + draftWorld.y * sa,
   -draftWorld.x * sa + draftWorld.y * ca
  ) / max(radii, vec2(4.0));

  float draftLen = length(draftLocal);
  vec2 draftDir = draftLen > 0.001 ? (draftLocal / draftLen) : vec2(1.0, 0.0);

  // Decompose position along horizontal wind drift (no fake screen-upward side-scroller gravity!)
  float alongWind = dot(vLocalPos, draftDir);
  float windShear = min(0.85, draftLen * 0.16);
  float flameStretch = 1.0 + windShear * smoothstep(-0.4, 1.5, alongWind);
  vec2 pFlame = vLocalPos - draftDir * (max(0.0, alongWind) * (1.0 - 1.0 / flameStretch));

  // --- 1. Top-Down Emitter Footprint SDF & 360-Degree Combustion Bed ---
  float bedDist = 1.0;
  float rimBoost = 0.0;
  float jetBoost = 0.0;
  float smokeDensityBase = 0.72;

  if (kind == 0 || kind == 1) {
    // Fuel (0) or Heavy Oil (1) ground pool viewed from above: irregular multi-harmonic puddle contour
    float ang = atan(pFlame.y, pFlame.x);
    float harmonic = 1.0
      + 0.14 * sin(ang * 2.0 + seed * 1.73)
      + 0.10 * cos(ang * 3.0 - seed * 2.31)
      + 0.07 * sin(ang * 5.0 + seed * 4.17)
      + 0.05 * cos(ang * 7.0 - seed * 3.09);
    bedDist = length(pFlame) / max(0.35, harmonic);

    // In top-down view, vapor-oxygen mixing creates a bright turbulent combustion ring around the puddle perimeter
    // plus boiling convection cells across the interior surface
    if (kind == 0) {
      rimBoost = smoothstep(0.30, 0.76, bedDist) * (1.0 - smoothstep(0.80, 1.16, bedDist)) * 0.36;
      smokeDensityBase = 0.68 + burnRatio * 0.18;
    } else {
      rimBoost = smoothstep(0.24, 0.68, bedDist) * (1.0 - smoothstep(0.72, 1.12, bedDist)) * 0.24;
      smokeDensityBase = 0.88; // Heavy motor oil produces thick black carbon smoke
    }
  } else if (kind == 2) {
    // Vehicle Engine Bay Fire (Top-Down): flames erupting from hood side seams, radiator grille, and cowl
    vec2 q = abs(pFlame) - vec2(0.56, 0.60);
    float boxDist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    bedDist = boxDist + 0.72;

    float sideSeam = exp(-pow((abs(pFlame.y) - 0.64) * 4.2, 2.0)) * smoothstep(0.85, 0.15, abs(pFlame.x));
    float grilleJet = exp(-pow((pFlame.x - 0.60) * 3.8, 2.0)) * smoothstep(0.85, 0.15, abs(pFlame.y));
    float hoodCore = smoothstep(0.85, 0.08, length(pFlame * vec2(0.9, 1.05))) * (0.50 + 0.50 * burnRatio);
    jetBoost = (sideSeam * 0.55 + grilleJet * 0.58 + hoodCore * 0.48);
    smokeDensityBase = 0.82;
  } else if (kind == 3) {
    // Vehicle Cabin Fire (Top-Down): flames venting out of side windows, windshield, and rear glass around roof
    vec2 q = abs(pFlame) - vec2(0.66, 0.64);
    float boxDist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    bedDist = boxDist + 0.70;

    float windowVents = exp(-pow((abs(pFlame.y) - 0.66) * 4.0, 2.0)) * smoothstep(0.90, 0.12, abs(pFlame.x));
    float glassVents = exp(-pow((abs(pFlame.x) - 0.62) * 3.8, 2.0)) * smoothstep(0.85, 0.15, abs(pFlame.y));
    jetBoost = (windowVents * 0.60 + glassVents * 0.50 + 0.38);
    smokeDensityBase = 0.86;
  } else if (kind == 4) {
    // Vehicle Fuel Tank / Rear Underbody Fire (Top-Down)
    float ang = atan(pFlame.y, pFlame.x);
    float asym = 1.0 + 0.18 * cos(ang - 3.14159) + 0.12 * sin(ang * 3.0 + seed);
    bedDist = length(pFlame * vec2(0.92, 1.06)) / asym;
    jetBoost = smoothstep(0.95, 0.18, bedDist) * 0.50;
    smokeDensityBase = 0.80;
  } else {
    // Transient Flash / Deflagration Fireball (Top-Down expanding blast wave)
    bedDist = length(pFlame);
    rimBoost = smoothstep(0.20, 0.75, bedDist) * (1.0 - smoothstep(0.75, 1.15, bedDist)) * 0.48;
    smokeDensityBase = 0.58 * burnRatio;
  }

  // --- 2. Top-Down Radial + Swirling Vortex Flame Advection ---
  // In a top-down view, flames boil radially outward from the combustion center/bed in 360 degrees
  // while swirling in counter-rotating turbulent eddies and drifting with horizontal wind!
  float rLen = length(pFlame);
  vec2 radialDir = rLen > 0.001 ? (pFlame / rLen) : vec2(1.0, 0.0);
  vec2 tangentDir = vec2(-radialDir.y, radialDir.x);

  float speedScale = (kind == 1) ? 2.4 : 3.4;
  // Radial outward boil + gentle wind drift (creates authentic bird's-eye 360° roaring fire instead of side-view rising stripes)
  vec2 radialAdvect = radialDir * (rLen * 1.65 - uTime * speedScale * 0.62)
                    + tangentDir * (atan(pFlame.y, pFlame.x) * 0.95)
                    - draftDir * (uTime * speedScale * min(0.55, draftLen * 0.12));

  vec2 flowUv = pFlame * 1.90 - radialDir * (uTime * speedScale * 0.58) - draftDir * (uTime * speedScale * min(0.65, 0.12 + draftLen * 0.14)) + vec2(seed * 5.17, seed * 2.93);

  // Octave 1: Macro Kelvin-Helmholtz vortex curl
  vec3 n1 = noise2DGrad(flowUv);
  vec2 curl1 = vec2(-n1.z, n1.y);

  // Octave 2: Domain-warped secondary radial/swirling eddies
  const mat2 rot2 = mat2(0.80, -0.60, 0.60, 0.80);
  vec2 uv2 = rot2 * (flowUv * 2.15 + curl1 * 0.52 + radialAdvect * 0.22) - radialDir * (uTime * speedScale * 0.75);
  vec3 n2 = noise2DGrad(uv2);
  vec2 curl2 = vec2(-n2.z, n2.y);

  // Octave 3: Crisp 360-degree radial flame filaments & cellular convection ridges
  const mat2 rot3 = mat2(0.60, 0.80, -0.80, 0.60);
  vec2 uv3 = rot3 * (flowUv * 4.10 + (curl1 + curl2) * 0.38) - radialDir * (uTime * speedScale * 1.15);
  vec3 n3 = noise2DGrad(uv3);

  float ridge1 = 1.0 - abs(2.0 * n1.x - 1.0);
  float ridge2 = 1.0 - abs(2.0 * n2.x - 1.0);
  float ridge3 = 1.0 - abs(2.0 * n3.x - 1.0);
  float flameRidges = pow(ridge1, 1.25) * 0.45 + pow(ridge2, 1.55) * 0.36 + pow(ridge3, 1.85) * 0.19;

  // Top-down Bénard-style boiling convection cells across the horizontal flame sheet
  float boil = 1.0 - cellularBoil(pFlame * 2.35 - radialDir * (uTime * 1.35) + curl1 * 0.28, uTime * 3.1 + seed);
  float boilCells = smoothstep(0.12, 0.84, boil);

  // 360-degree radial flame tongue reach, slightly elongated on the downwind side when wind/slipstream is strong
  float downwindFactor = smoothstep(-0.7, 1.0, alongWind) * min(1.0, draftLen * 0.22);
  float tongueReach = (0.36 + 0.28 * downwindFactor) * (n1.x * 0.42 + flameRidges * 0.78);
  float warpedDist = bedDist - tongueReach - jetBoost * 0.30;

  float coreMask = 1.0 - smoothstep(0.10, 1.16, warpedDist);
  float outerEnvelope = 1.0 - smoothstep(0.52, 1.44, warpedDist);

  float temp = 0.0;
  if (outerEnvelope > 0.001) {
    // Top-down thermal profile: intense cellular boiling pockets & bright vortex ridges across the planform
    temp = coreMask * (0.64 + 0.56 * flameRidges + 0.32 * boilCells)
         + outerEnvelope * (flameRidges * 0.58 + rimBoost + jetBoost * 0.68);
    temp *= clamp(intensity * (0.90 + 0.10 * sin(uTime * 13.7 + seed * 3.1 + n1.x * 4.0)), 0.15, 1.45);
  }

  vec3 fireRgb = blackbodyColor(temp);
  float flameAlpha = smoothstep(0.05, 0.48, temp) * outerEnvelope * clamp(intensity * 0.95, 0.20, 0.96);
  float emissiveBoost = smoothstep(0.26, 1.15, temp) * 0.42 * outerEnvelope;
  vec3 firePremul = fireRgb * (flameAlpha + emissiveBoost);

  // Subtle ambient ground thermal glow under the fire bed
  float baseHalo = (1.0 - smoothstep(0.0, 1.35, bedDist)) * 0.13 * clamp(intensity, 0.0, 1.0);
  firePremul += vec3(0.95, 0.32, 0.04) * baseHalo;

  // --- 3. Volumetric Top-Down Pyrolysis Smoke Crown (Rising in +Z toward Camera & Drifting Downwind) ---
  // In a top-down view, rising smoke sits ABOVE the flame bed (partially veiling the center & ring from above)
  // and trails downwind in billowing, rotating cauliflower clouds!
  float smokeAlpha = 0.0;
  vec3 smokePremul = vec3(0.0);

  if (kind != 5) {
    // Center of the elevated smoke crown is shifted downwind + along camera zenith parallax
    float driftShift = min(1.35, 0.24 + draftLen * 0.26);
    vec2 pSmoke = vLocalPos - draftDir * driftShift;

    // Plume widens as it rises toward the camera and drifts downwind
    float alongPlume = dot(vLocalPos, draftDir);
    float plumeSpread = 1.0 + clamp(alongPlume, -0.3, 2.2) * (0.28 + min(0.45, draftLen * 0.08));
    vec2 pSmokeScaled = pSmoke / plumeSpread;

    // Multi-lobed turbulent smoke advection (slower, heavier rolling billows than the underlying flames)
    vec2 smokeUv = pSmokeScaled * 1.45
                 - draftDir * (uTime * 1.35 * min(1.4, 0.45 + draftLen * 0.22))
                 - radialDir * (uTime * 0.65)
                 + vec2(seed * 9.13, seed * 4.71);

    vec3 sn1 = noise2DGrad(smokeUv);
    vec2 sCurl = vec2(-sn1.z, sn1.y);
    vec3 sn2 = noise2DGrad(rot2 * (smokeUv * 2.15 + sCurl * 0.55) - radialDir * (uTime * 0.95));

    // Cauliflower spherical billow cells (1 - cellular Voronoi distance)
    float sBoil1 = 1.0 - cellularBoil(pSmokeScaled * 1.65 - draftDir * (uTime * 0.95) + sCurl * 0.35, uTime * 1.7 + seed * 2.3);
    float sBoil2 = 1.0 - cellularBoil(pSmokeScaled * 2.85 + sCurl * 0.45, uTime * 2.3 + seed * 5.1);
    float billowShape = smoothstep(0.18, 0.85, sBoil1) * 0.65 + smoothstep(0.20, 0.82, sBoil2) * 0.35;

    // Smoke footprint covers the outer flame ring, broken patches over the hot core (top-down occlusion),
    // and the downwind billowing plume
    float smokeDist = length(pSmokeScaled) - (sn1.x * 0.38 + billowShape * 0.46);
    float smokeEnvelope = 1.0 - smoothstep(0.32, 1.32, smokeDist);

    // Over the very center of the fire, leave dynamic gaps so bright flames punch through the rising smoke column
    float coreWindow = 1.0 - 0.52 * smoothstep(0.65, 0.05, bedDist) * (1.0 - billowShape * 0.75);
    float rawSmoke = smokeEnvelope * coreWindow * smoothstep(0.22, 0.78, billowShape * 0.70 + sn2.x * 0.45);

    smokeAlpha = clamp(rawSmoke * smokeDensityBase * uSmokeCrown * clamp(intensity * 0.95, 0.35, 0.92), 0.0, 0.92);

    if (smokeAlpha > 0.005) {
      // 3D Top-Down Normal of each spherical smoke billow lobe from spatial noise gradients
      vec2 lobeNormal = normalize(sn1.yz * 0.6 + sn2.yz * 0.4 + pSmokeScaled * 0.5 + vec2(1e-4));

      // Top-down ambient/sun highlight on upper-left (NW) of each cauliflower puff vs deep carbon self-shadow on SE
      float sunFacing = clamp(dot(lobeNormal, vec2(-0.707, -0.707)) * 0.5 + 0.5, 0.0, 1.0);
      vec3 darkSoot = (kind == 1) ? vec3(0.025, 0.028, 0.035) : vec3(0.045, 0.050, 0.062);
      vec3 litSlate = (kind == 1) ? vec3(0.11,  0.12,  0.15)  : vec3(0.20,  0.22,  0.26);
      vec3 smokeCol = mix(darkSoot, litSlate, sunFacing * (0.45 + 0.55 * billowShape));

      // Subsurface & rim firelight illumination from the flames directly beneath the smoke column!
      float fireProximity = exp(-bedDist * 1.15) * clamp(intensity, 0.2, 1.3);
      float inwardFacing = clamp(-dot(lobeNormal, radialDir) * 0.5 + 0.5, 0.0, 1.0);
      float underGlow = fireProximity * (0.35 + 0.65 * inwardFacing) * (1.0 - rawSmoke * 0.42);
      vec3 fireBacklight = mix(vec3(0.88, 0.18, 0.02), vec3(1.0, 0.56, 0.10), clamp(temp * 0.85, 0.0, 1.0));
      smokeCol += fireBacklight * underGlow * 0.78;

      smokePremul = smokeCol * smokeAlpha;
    }
  }

  // --- 4. Top-Down Z-Ordered Composite: Elevated Smoke Crown OVER Ground/Vehicle Flame Bed ---
  // Since the camera looks down from above (+Z), the rising smoke column partially occludes the flames beneath it,
  // while intense turbulent flame tongues still pierce through the gaps.
  float bleedThrough = smoothstep(0.72, 1.28, temp) * 0.42;
  float effSmokeAlpha = smokeAlpha * (1.0 - bleedThrough);
  vec3 effSmokePremul = smokePremul * (1.0 - bleedThrough);

  vec3 totalPremul = effSmokePremul + firePremul * (1.0 - effSmokeAlpha);
  float totalAlpha = clamp(effSmokeAlpha + clamp(flameAlpha * 0.82, 0.0, 0.94) * (1.0 - effSmokeAlpha), 0.0, 0.95);

  if (totalAlpha <= 0.003 && length(totalPremul) <= 0.003) {
    discard;
  }

  oColor = vec4(clamp(totalPremul, 0.0, 1.0), totalAlpha);
}`;

export class GpuFireRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private prog: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private instanceBuf: WebGLBuffer | null = null;
  private instanceData = new Float32Array(MAX_INSTANCES * FLOATS_PER_INSTANCE);

  private uCamPos: WebGLUniformLocation | null = null;
  private uCamZoom: WebGLUniformLocation | null = null;
  private uCamAngle: WebGLUniformLocation | null = null;
  private uViewSize: WebGLUniformLocation | null = null;
  private uTime: WebGLUniformLocation | null = null;
  private uSmokeCrown: WebGLUniformLocation | null = null;

  private available = false;
  private lost = false;
  private scale = 0.75; // 0.75x CSS resolution: 44% fewer pixels, silky-smooth volumetric filtering

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 2;
    this.canvas.height = 2;
    try {
      this.init();
    } catch (e) {
      console.warn('GpuFireRenderer: WebGL2 unavailable, using procedural 2D fire fallback', e);
      this.available = false;
    }
  }

  private init() {
    const gl = this.canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('webgl2 unavailable');
    this.gl = gl;

    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
      this.available = false;
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.lost = false;
      try {
        this.init();
      } catch {
        this.available = false;
      }
    });

    const vs = this.compile(gl, gl.VERTEX_SHADER, VS_FIRE);
    const fs = this.compile(gl, gl.FRAGMENT_SHADER, FS_FIRE);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('GpuFireRenderer link error: ' + gl.getProgramInfoLog(prog));
    }
    this.prog = prog;

    this.uCamPos = gl.getUniformLocation(prog, 'uCamPos');
    this.uCamZoom = gl.getUniformLocation(prog, 'uCamZoom');
    this.uCamAngle = gl.getUniformLocation(prog, 'uCamAngle');
    this.uViewSize = gl.getUniformLocation(prog, 'uViewSize');
    this.uTime = gl.getUniformLocation(prog, 'uTime');
    this.uSmokeCrown = gl.getUniformLocation(prog, 'uSmokeCrown');

    const vao = gl.createVertexArray()!;
    const buf = gl.createBuffer()!;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.byteLength, gl.DYNAMIC_DRAW);

    const stride = FLOATS_PER_INSTANCE * 4;
    // location 0: vec4 aCenterAndSize
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(0, 1);

    // location 1: vec4 aAngleIntKindSeed
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 16);
    gl.vertexAttribDivisor(1, 1);

    // location 2: vec3 aWindAndBurn
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 32);
    gl.vertexAttribDivisor(2, 1);

    gl.bindVertexArray(null);
    this.vao = vao;
    this.instanceBuf = buf;
    this.available = true;
  }

  private compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error('GpuFireRenderer shader compile: ' + log);
    }
    return sh;
  }

  /**
   * Renders a batch of world-space fire emitters in a single instanced WebGL2 draw call
   * and composites only the active screen-space bounding rectangle onto `ctx`.
   */
  public renderEmitters(
    ctx: CanvasRenderingContext2D,
    emitters: readonly FireEmitter[],
    camera: CameraTransform,
    viewWidth: number,
    viewHeight: number,
    backingScale: number,
    timeSec: number,
    enableGpu: boolean = true,
    scaleOverride: number = 0.75,
    smokeCrownMult: number = 0.9
  ) {
    const count = Math.min(emitters.length, MAX_INSTANCES);
    if (count === 0 || viewWidth < 2 || viewHeight < 2) return;

    if (!enableGpu || !this.available || this.lost || !this.gl || !this.prog || !this.vao || !this.instanceBuf) {
      this.renderFallback2D(ctx, emitters, count, timeSec);
      return;
    }

    this.scale = Math.max(0.5, Math.min(1.0, scaleOverride || 0.75));
    const gl = this.gl;
    const targetW = Math.max(2, Math.round(viewWidth * this.scale));
    const targetH = Math.max(2, Math.round(viewHeight * this.scale));
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }

    // Compute tight screen-space bounding box of all active fire quads for fast scissor clear & blit
    const camRot = -camera.angle - Math.PI * 0.5;
    const cCam = Math.cos(camRot);
    const sCam = Math.sin(camRot);
    const halfVW = viewWidth * 0.5;
    const halfVH = viewHeight * 0.5;

    let minSX = viewWidth;
    let minSY = viewHeight;
    let maxSX = 0;
    let maxSY = 0;

    let writeIdx = 0;
    const data = this.instanceData;

    for (let i = 0; i < count; i++) {
      const em = emitters[i];
      if (em.intensity <= 0.01) continue;

      const dx = em.x - camera.x;
      const dy = em.y - camera.y;
      const sx = (dx * cCam - dy * sCam) * camera.zoom + halfVW;
      const sy = (dx * sCam + dy * cCam) * camera.zoom + halfVH;

      const maxR = Math.max(em.radiusX, em.radiusY, 4);
      const windMag = Math.hypot(em.windVx, em.windVy);
      const boundR = (maxR * 4.2 + Math.min(maxR * 3.0, windMag * 0.85) + 24) * camera.zoom;

      if (sx + boundR < 0 || sx - boundR > viewWidth || sy + boundR < 0 || sy - boundR > viewHeight) {
        continue;
      }

      if (sx - boundR < minSX) minSX = sx - boundR;
      if (sy - boundR < minSY) minSY = sy - boundR;
      if (sx + boundR > maxSX) maxSX = sx + boundR;
      if (sy + boundR > maxSY) maxSY = sy + boundR;

      const base = writeIdx * FLOATS_PER_INSTANCE;
      data[base + 0] = em.x;
      data[base + 1] = em.y;
      data[base + 2] = Math.max(2.0, em.radiusX);
      data[base + 3] = Math.max(2.0, em.radiusY);
      data[base + 4] = em.angle;
      data[base + 5] = em.intensity;
      data[base + 6] = em.kind;
      data[base + 7] = em.seed;
      data[base + 8] = em.windVx;
      data[base + 9] = em.windVy;
      data[base + 10] = em.burnRatio;
      writeIdx++;
    }

    if (writeIdx === 0) return;

    // Clamp screen bounds and map to scaled WebGL framebuffer coordinates
    minSX = Math.max(0, Math.floor(minSX));
    minSY = Math.max(0, Math.floor(minSY));
    maxSX = Math.min(viewWidth, Math.ceil(maxSX));
    maxSY = Math.min(viewHeight, Math.ceil(maxSY));
    const rectW = maxSX - minSX;
    const rectH = maxSY - minSY;
    if (rectW <= 1 || rectH <= 1) return;

    const glX = Math.max(0, Math.floor(minSX * this.scale));
    const glY = Math.max(0, Math.floor((viewHeight - maxSY) * this.scale));
    const glW = Math.min(targetW - glX, Math.ceil(rectW * this.scale) + 2);
    const glH = Math.min(targetH - glY, Math.ceil(rectH * this.scale) + 2);
    if (glW <= 0 || glH <= 0) return;

    gl.viewport(0, 0, targetW, targetH);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(glX, glY, glW, glH);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(this.prog);
    gl.uniform2f(this.uCamPos, camera.x, camera.y);
    gl.uniform1f(this.uCamZoom, camera.zoom);
    gl.uniform1f(this.uCamAngle, camera.angle);
    gl.uniform2f(this.uViewSize, viewWidth, viewHeight);
    gl.uniform1f(this.uTime, timeSec);
    gl.uniform1f(this.uSmokeCrown, Math.max(0.0, Math.min(2.0, smokeCrownMult)));

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data.subarray(0, writeIdx * FLOATS_PER_INSTANCE));
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, writeIdx);
    gl.bindVertexArray(null);
    gl.disable(gl.SCISSOR_TEST);

    // Composite only the active scissor sub-rectangle onto the 2D canvas
    const srcX = glX;
    const srcY = targetH - (glY + glH);
    const dstX = srcX / this.scale;
    const dstY = srcY / this.scale;
    const dstW = glW / this.scale;
    const dstH = glH / this.scale;

    ctx.save();
    ctx.setTransform(backingScale, 0, 0, backingScale, 0, 0);
    ctx.drawImage(this.canvas, srcX, srcY, glW, glH, dstX, dstY, dstW, dstH);
    ctx.restore();
  }

  /** Lightweight analytical multi-tongued blackbody fallback if WebGL2 is unavailable. */
  private renderFallback2D(
    ctx: CanvasRenderingContext2D,
    emitters: readonly FireEmitter[],
    count: number,
    timeSec: number
  ) {
    ctx.save();
    for (let i = 0; i < count; i++) {
      const em = emitters[i];
      if (em.intensity <= 0.01) continue;
      ctx.save();
      ctx.translate(em.x, em.y);
      ctx.rotate(em.angle);
      const rx = Math.max(3, em.radiusX);
      const ry = Math.max(3, em.radiusY);
      const flick = 0.9 + 0.1 * Math.sin(timeSec * 14 + em.seed);
      const grad = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, Math.max(rx, ry) * 1.25 * flick);
      grad.addColorStop(0.0, `rgba(255, 250, 220, ${Math.min(1, em.intensity * 0.95)})`);
      grad.addColorStop(0.35, `rgba(255, 165, 30, ${Math.min(1, em.intensity * 0.85)})`);
      grad.addColorStop(0.72, `rgba(235, 45, 10, ${Math.min(1, em.intensity * 0.55)})`);
      grad.addColorStop(1.0, 'rgba(40, 10, 5, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * 1.25 * flick, ry * 1.25 * flick, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
}
