/**
 * GpuPostFx — WebGL2 post-processing layer for the Canvas 2D game view.
 *
 * The game keeps drawing into its 2D canvas (the "source"). Every frame this module uploads that canvas as a
 * texture and runs a chain of fragment-shader passes into a second, transparent-to-input canvas (the "target")
 * placed on top of it:
 *
 *   1. bloom      dual-Kawase down/up chain over a thresholded copy of the frame (headlights, neon, fire)
 *   2. blur       small blurred copy used for local contrast ("clarity") and depth in shadows
 *   3. composite  bicubic upscale, CAS sharpening, sun-driven relief shading, clarity, bloom add, ACES tone curve,
 *                 time-of-day / weather colour grading, haze, vignette, chromatic fringe, film grain
 *   4. final      FXAA (or plain copy) to the screen
 *
 * If WebGL2 is unavailable or the context is lost, `available` becomes false and the game keeps showing the
 * untouched 2D canvas, so nothing here is ever required for the game to run.
 */

import { getCurrentSunShadowState } from '../shadowSystem';

export interface PostFxSettings {
  bloom: number;           // 0..100
  bloomRadius?: number;    // 50..150 (%)
  grading: number;         // 0..100 colour grading + tone curve strength
  clarity: number;         // 0..100 local contrast / depth in dark gaps
  relief: number;          // 0..100 sun-driven micro relief shading
  sharpness: number;       // 0..100 CAS sharpening
  vignette: number;        // 0..100
  grain: number;           // 0..100
  chromatic: number;       // 0..100 lens colour fringing at the screen edges
  antiAlias: boolean;      // FXAA
  bicubicUpscale?: boolean;// 5-tap Catmull-Rom bicubic upscale
  gi: number;              // 0..100 bounce light + glow of lights in fog
  wet: number;             // 0..100 wet asphalt sheen in rain
  waterShader?: number;    // 0..100 GPU water optical shader strength
  waterWakes?: number;     // 0..100 GPU hydrodynamic wakes & whitewater foam
  heatShimmer?: number;    // 0..150 Thermal refractive heat haze above fires
  fireLighting?: number;   // 0..150 3D normal relief & warm bounce from fires
  fogScattering?: number;  // 0..150 Atmospheric Mie scattering in fog/rain
  exposure?: number;       // 50..150 (%)
  contrast?: number;       // 50..150 (%)
  saturation?: number;     // 0..150 (%)
}

import type { PostFxWaterWake } from '../riverSystem';
import { RIVER_WAYPOINTS } from '../riverSystem';

// The river channel used by the GPU water shader is generated from RIVER_WAYPOINTS (single source of truth),
// so the shader flow field can never drift out of sync with the Canvas river geometry and gameplay physics.
// The GLSL binary search below does 6 steps, which covers up to 64 waypoints.
const RIVER_WP_COUNT = RIVER_WAYPOINTS.length;
const RIVER_WP_GLSL = RIVER_WAYPOINTS
  .map(w => `  vec4(${w.x.toFixed(1)}, ${w.y.toFixed(1)}, ${w.width.toFixed(1)}, ${w.currentSpeed.toFixed(1)})`)
  .join(',\n');

export interface PostFxFireSource {
  x: number;         // World X (px)
  y: number;         // World Y (px)
  radius: number;    // World radius of fire core (px)
  intensity: number; // 0..1+ combustion intensity
  windVx: number;    // World wind + slipstream X (px/s)
  windVy: number;    // World wind + slipstream Y (px/s)
}

export interface PostFxFrame {
  hour: number;             // 0..24 time of day
  weather: string;          // WeatherType
  cameraAngle: number;      // radians, same convention as the renderer
  cameraX?: number;         // world X of camera center
  cameraY?: number;         // world Y of camera center
  cameraZoom?: number;      // camera zoom factor
  isFreezing?: boolean;     // true when water is frozen into ice
  windVx?: number;          // ambient wind X velocity (px/s)
  windVy?: number;          // ambient wind Y velocity (px/s)
  riverFlowVx?: number;     // local river flow X velocity near camera (px/s)
  riverFlowVy?: number;     // local river flow Y velocity near camera (px/s)
  timeSec: number;          // wall-clock seconds, drives grain & water waves
  dt: number;               // frame delta in seconds, for parameter smoothing
  sunrise?: number;
  sunset?: number;
  season?: string;
  hasResidualWetness?: boolean;
  lightmap?: HTMLCanvasElement | null; // darkness layer (alpha = dark), null when the frame had none
  materialMap?: HTMLCanvasElement | null; // exact G-buffer material ID & fluid thickness map
  fires?: PostFxFireSource[];          // active world-space fire sources for heat haze & normal relief lighting
  wakes?: PostFxWaterWake[];           // active world-space water wakes & ripples for direct GPU wave/foam simulation
}

const VS = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FS_DOWN = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uTex;
uniform vec2 uTexel;     // texel size of the source texture
uniform float uThreshold;// < 0 disables the bright pass
uniform float uKnee;
void main() {
  vec4 s = texture(uTex, vUv) * 4.0;
  s += texture(uTex, vUv + uTexel * vec2(-1.0, -1.0));
  s += texture(uTex, vUv + uTexel * vec2( 1.0, -1.0));
  s += texture(uTex, vUv + uTexel * vec2(-1.0,  1.0));
  s += texture(uTex, vUv + uTexel * vec2( 1.0,  1.0));
  vec3 c = s.rgb / 8.0;
  if (uThreshold >= 0.0) {
    float l = max(c.r, max(c.g, c.b));
    float w = smoothstep(uThreshold, uThreshold + uKnee, l);
    c *= w;
  }
  o = vec4(c, 1.0);
}`;

const FS_UP = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uTex;
uniform vec2 uTexel;     // texel size of the (smaller) source texture
uniform float uScale;
void main() {
  vec2 t = uTexel * 0.5;
  vec3 s = texture(uTex, vUv + vec2(-t.x * 2.0, 0.0)).rgb;
  s += texture(uTex, vUv + vec2(-t.x,  t.y)).rgb * 2.0;
  s += texture(uTex, vUv + vec2(0.0,  t.y * 2.0)).rgb;
  s += texture(uTex, vUv + vec2( t.x,  t.y)).rgb * 2.0;
  s += texture(uTex, vUv + vec2( t.x * 2.0, 0.0)).rgb;
  s += texture(uTex, vUv + vec2( t.x, -t.y)).rgb * 2.0;
  s += texture(uTex, vUv + vec2(0.0, -t.y * 2.0)).rgb;
  s += texture(uTex, vUv + vec2(-t.x, -t.y)).rgb * 2.0;
  o = vec4(s / 12.0 * uScale, 1.0);
}`;

const FS_COMPOSITE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;

uniform sampler2D uSrc;
uniform sampler2D uBloom;
uniform sampler2D uBlur;
uniform sampler2D uBloomWide;
uniform sampler2D uLight;
uniform float uLightOn;
uniform vec2 uLightSize;
uniform sampler2D uMat;
uniform float uMatOn;
uniform float uGi;
uniform float uWet;
uniform float uSnow;
uniform float uRain;
uniform float uFogGlow;
uniform vec2 uSrcSize;
uniform vec2 uOutSize;
uniform float uUpscale;     // 1 when the source is smaller than the output
uniform float uTime;
uniform vec2 uSun;          // light direction in screen UV space
uniform float uSunElev;     // sun / moon elevation, 0 (horizon) .. 1 (zenith)
uniform vec2 uCamPos;       // camera world position (px)
uniform float uCamZoom;     // camera zoom
uniform float uCamAngle;    // camera angle (rad)
uniform float uFreezing;    // 1 when frozen ice, 0 when liquid water
uniform float uRelief;
uniform float uClarity;
uniform float uBloomStr;
uniform float uSharp;
uniform float uTone;        // tone curve + grading blend
uniform float uExposure;
uniform float uContrast;
uniform float uSat;
uniform vec3 uShadowTint;
uniform vec3 uHighTint;
uniform vec4 uHaze;         // rgb colour, a amount
uniform float uVig;
uniform float uGrain;
uniform float uChroma;
uniform float uDay;         // 0 night .. 1 day
uniform int uFireCount;
uniform vec4 uFirePosRad[16]; // xy = world pos, z = radius, w = intensity
uniform vec2 uFireWind[16];   // xy = world wind + slipstream
uniform vec2 uWind;           // xy = smoothed prevailing wind velocity (px/s)
uniform float uWindPhase;     // monotonically accumulated wind wave phase (never reverses on gusts)
uniform float uWindGust;      // instantaneous wind gust factor (drives localized cat's-paw ripple patches)
uniform vec2 uRiverFlow;      // xy = river current velocity near camera (px/s)
uniform int uWakeCount;
uniform vec4 uWakePosRad[32];   // xy = world pos, z = current radius, w = intensity
uniform vec4 uWakeVelParam[32]; // xy = source velocity (vx, vy), z = progress (0..1), w = typeAndFoam
uniform float uWaterShader;     // 0..1 GPU water shader strength
uniform float uWaterWakes;      // 0..1 GPU hydrodynamic wakes & foam strength
uniform float uHeatShimmer;     // 0..1.5 thermal heat haze strength
uniform float uFireLighting;    // 0..1.5 fire normal relief & bounce strength
uniform float uUserExposure;    // 0.5..1.5 user exposure multiplier
uniform float uUserContrast;    // 0.5..1.5 user contrast multiplier
uniform float uUserSat;         // 0..1.5 user saturation multiplier

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

vec3 bicubic(sampler2D tex, vec2 uv) {
  // 5-tap Catmull-Rom (Jimenez): centre tap plus four axis taps
  vec2 pos = uv * uSrcSize;
  vec2 c = floor(pos - 0.5) + 0.5;
  vec2 f = pos - c;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2;
  vec2 off12 = w2 / w12;
  vec2 t0 = (c - 1.0) / uSrcSize;
  vec2 t3 = (c + 2.0) / uSrcSize;
  vec2 t12 = (c + off12) / uSrcSize;
  vec3 res = texture(tex, vec2(t12.x, t0.y)).rgb * (w12.x * w0.y)
           + texture(tex, vec2(t0.x, t12.y)).rgb * (w0.x * w12.y)
           + texture(tex, vec2(t12.x, t12.y)).rgb * (w12.x * w12.y)
           + texture(tex, vec2(t3.x, t12.y)).rgb * (w3.x * w12.y)
           + texture(tex, vec2(t12.x, t3.y)).rgb * (w12.x * w3.y);
  float total = w12.x * w0.y + w0.x * w12.y + w12.x * w12.y + w3.x * w12.y + w12.x * w3.y;
  return max(res / total, 0.0);
}

vec3 fetchSrc(vec2 uv) {
  if (uUpscale > 0.5) return bicubic(uSrc, uv);
  return texture(uSrc, uv).rgb;
}

// Soft shoulder: values past 0.8 (bloom overshoot, light cores) roll off towards 1 instead of clipping
vec3 shoulder(vec3 x) {
  vec3 t = max(x - 0.8, 0.0);
  return min(x, vec3(0.8)) + 0.2 * (1.0 - exp(-t / 0.2));
}
// Gentle natural rolloff that preserves true-to-life mid-tones and shadow detail without artificial contrast
vec3 sCurve(vec3 x) {
  x = clamp(x, 0.0, 1.0);
  return mix(x, x * x * (3.0 - 2.0 * x), 0.10);
}

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// 2D smooth value noise returningvec3(value, dValue/dx, dValue/dy)
vec3 noise2DAndGrad(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);

  float a = hash(i + vec2(0.0, 0.0));
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  float k0 = a;
  float k1 = b - a;
  float k2 = c - a;
  float k3 = a - b - c + d;

  float val = k0 + k1 * u.x + k2 * u.y + k3 * u.x * u.y;
  vec2 grad = du * (vec2(k1, k2) + k3 * u.yx);
  return vec3(val, grad);
}

// Reconstruct world-space position (in game pixels) from screen UV
vec2 screenUvToWorld(vec2 uv) {
  vec2 screenPx = (vec2(uv.x, 1.0 - uv.y) - 0.5) * uOutSize / max(uCamZoom, 0.05);
  float rot = uCamAngle + 1.57079632679;
  float ca = cos(rot);
  float sa = sin(rot);
  return uCamPos + vec2(screenPx.x * ca - screenPx.y * sa, screenPx.x * sa + screenPx.y * ca);
}

// Rotate world-space direction vector into screen UV space (X right, Y up)
vec2 worldDirToScreenUv(vec2 worldDir) {
  float a = -uCamAngle - 1.57079632679;
  float ca = cos(a);
  float sa = sin(a);
  return vec2(worldDir.x * ca - worldDir.y * sa, -(worldDir.x * sa + worldDir.y * ca));
}

// Catmull-Rom spline of River "Быстрица" (vec4(x, y, width, currentSpeed))
// Generated from RIVER_WAYPOINTS in src/riverSystem.ts so every river pixel on screen knows its exact
// riverbed tangent (tx, ty), lateral bank fraction (-1..+1), and parabolic channel flow speed.
const vec4 RIVER_WP[${RIVER_WP_COUNT}] = vec4[${RIVER_WP_COUNT}](
${RIVER_WP_GLSL}
);

float crSpline(float p0, float p1, float p2, float p3, float t) {
  float t2 = t * t;
  float t3 = t2 * t;
  return 0.5 * ((2.0 * p1) + (-p0 + p2) * t + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2 + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3);
}

float crSplineDeriv(float p0, float p1, float p2, float p3, float t) {
  float t2 = t * t;
  return 0.5 * ((-p0 + p2) + 2.0 * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t + 3.0 * (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t2);
}

// Evaluates exact river channel geometry & curvilinear flow coordinates at worldPos
void sampleRiverChannel(
  vec2 worldPos,
  out vec2 outT,
  out vec2 outN,
  out float outAlong,
  out float outCross,
  out float outLatFrac,
  out float outSpeed,
  out float outRiverMask
) {
  outT = vec2(1.0, 0.0);
  outN = vec2(0.0, 1.0);
  outAlong = worldPos.x;
  outCross = 0.0;
  outLatFrac = 0.0;
  outSpeed = 0.0;
  outRiverMask = 0.0;

  if (worldPos.x < -3100.0 || worldPos.x > 49600.0 || worldPos.y < -4220.0 || worldPos.y > -1820.0) {
    return;
  }

  // 5-step binary search over monotonic X waypoints
  int lo = 0;
  int hi = ${RIVER_WP_COUNT - 2};
  for (int b = 0; b < 6; b++) {
    int mid = (lo + hi) >> 1;
    if (worldPos.x < RIVER_WP[mid + 1].x) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  int idx = clamp(lo, 0, ${RIVER_WP_COUNT - 2});
  vec4 w0 = RIVER_WP[max(0, idx - 1)];
  vec4 w1 = RIVER_WP[idx];
  vec4 w2 = RIVER_WP[idx + 1];
  vec4 w3 = RIVER_WP[min(${RIVER_WP_COUNT - 1}, idx + 2)];

  float segDx = max(1.0, w2.x - w1.x);
  float t = clamp((worldPos.x - w1.x) / segDx, 0.0, 1.0);
  float cx = crSpline(w0.x, w1.x, w2.x, w3.x, t);
  float cy = crSpline(w0.y, w1.y, w2.y, w3.y, t);
  float dx = crSplineDeriv(w0.x, w1.x, w2.x, w3.x, t);
  float dy = crSplineDeriv(w0.y, w1.y, w2.y, w3.y, t);

  outT = normalize(vec2(dx, dy));
  outN = vec2(-outT.y, outT.x);

  float smoothT = t * t * (3.0 - 2.0 * t);
  float halfWidth = mix(w1.z, w2.z, smoothT) * 0.5;
  outSpeed = mix(w1.w, w2.w, smoothT);

  vec2 relToCenter = worldPos - vec2(cx, cy);
  outCross = dot(relToCenter, outN);
  outAlong = worldPos.x + dot(relToCenter, outT) * 0.35;
  outLatFrac = outCross / max(halfWidth, 1.0);
  outRiverMask = 1.0 - smoothstep(0.96, 1.18, abs(outLatFrac));
}

// Relative water depth (0 = shoreline, 1 = mid-channel) of the pixel being shaded. Set by computeWaterWaveNormal:
// derived from the lateral position in the river channel (parabolic cross-section), 0.75 for standing water.
// Drives depth-proportional refraction: the apparent shift of the bed is ~ depth * slope, so shallow edges stay crisp.
float gWaterDepth01 = 0.75;

// Deep-water gravity wave swell for standing water (lakes, ponds, fountain basin). Three directional sine trains with
// the true dispersion relation w = sqrt(g * k) (g ~ 98 px/s^2 at ~10 px per metre), so long waves outrun short ones.
// Returns the height gradient in WORLD space; amplitudes are slopes, scaled by local wind strength.
vec2 waterSwellGrad(vec2 worldPos, vec2 windDir, float windStrength, float time) {
  vec2 acc = vec2(0.0);
  const float G_PX = 98.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float ang = (fi - 1.0) * 0.42;                       // spread around the wind direction
    float ca = cos(ang);
    float sa = sin(ang);
    vec2 d = vec2(windDir.x * ca - windDir.y * sa, windDir.x * sa + windDir.y * ca);
    float lambda = 62.0 - 17.0 * fi;                     // 62, 45, 28 px wavelength
    float k = 6.28318 / lambda;
    float w = sqrt(G_PX * k);
    float phase = k * dot(worldPos, d) - w * time + fi * 2.7;
    float slopeAmp = (0.11 - 0.028 * fi) * windStrength; // steeper = shorter = weaker
    acc += d * (slopeAmp * cos(phase));
  }
  return acc;
}

// Procedural sky radiance seen in the water: horizon-to-zenith gradient (warm at low sun, dark at night) plus a layer of
// clouds that drifts with the wind and is distorted by the wave normal through the reflection vector, so reflections
// move and ripple instead of being a flat tint. Rain thickens the cloud deck and greys it out.
vec3 waterSkyRadiance(vec3 R, vec2 worldPos, float sunE) {
  float elev = clamp(R.z, 0.0, 1.0);
  vec3 zenithCol = mix(vec3(0.030, 0.060, 0.130), vec3(0.26, 0.50, 0.85), uDay);
  vec3 warmHorizon = vec3(0.95, 0.74, 0.52);
  vec3 coolHorizon = vec3(0.74, 0.86, 0.96);
  vec3 horizonCol = mix(vec3(0.07, 0.11, 0.19), mix(warmHorizon, coolHorizon, smoothstep(0.30, 0.80, sunE)), uDay);
  vec3 sky = mix(horizonCol, zenithCol, pow(elev, 0.55));

  float windLen = length(uWind);
  vec2 windDir = windLen > 0.2 ? (uWind / windLen) : vec2(0.94, 0.34);
  vec2 cuv = worldPos * 0.0016 + R.xy / max(R.z, 0.3) * 0.25 - windDir * (uWindPhase * 0.018);
  float cloud = noise2DAndGrad(cuv).x * 0.65 + noise2DAndGrad(cuv * 2.3 + vec2(7.1, 3.7)).x * 0.35;
  float cover = mix(0.50, 0.10, uRain);
  float cMask = smoothstep(cover, cover + 0.28, cloud);
  vec3 cloudCol = mix(vec3(0.10, 0.13, 0.20), mix(vec3(0.96, 0.97, 0.98), vec3(0.55, 0.58, 0.64), uRain), uDay);
  sky = mix(sky, cloudCol, cMask * 0.85);
  return sky;
}

// Physically grounded two-layer river channel flow + surface wind capillary wave solver + direct GPU hydrodynamic wake & obstacle solver.
// 1. Inside the river channel: primary water mass flows strictly downstream along the curving riverbed tangent T(x)
//    with a parabolic cross-channel velocity profile (faster in the mid-channel thalweg, slower near banks),
//    while wind (uWind) creates a realistic secondary layer of capillary wind ripples and travelling cat's-paw gust patches.
//    Crucially, wind wave phase uses monotonically integrated uWindPhase so wind gusts NEVER push waves backward!
// 2. On standing water (ponds, puddles, salt lakes): water has zero channel flow and reacts directly to wind and wakes.
// 3. Around submerged obstacles (vehicles, bridge piers, boulders, wading humans): flow deflects laterally around the obstacle,
//    piling up a foaming bow stagnation collar upstream and shedding a Kelvin V-wake and turbulent vortex street downstream.
vec2 computeWaterWaveNormal(vec2 worldPos, float time, bool inRiverCorridor, out float outWakeFoam, out float outCrestHighlight) {
  outWakeFoam = 0.0;
  outCrestHighlight = 0.0;

  float windSpeed = length(uWind);
  vec2 windDir = windSpeed > 0.2 ? (uWind / windSpeed) : vec2(0.94, 0.34);
  vec2 windPerp = vec2(-windDir.y, windDir.x);

  // Spatially localized travelling wind gust patches ("рябь от порывов ветра" / cat's paws):
  // Instead of the whole water body jumping forward/backward together, gusts travel across the water surface as organic patches
  vec2 gustPatchUv = vec2(dot(worldPos, windDir) * 0.0045 - uWindPhase * 0.28, dot(worldPos, windPerp) * 0.0085 + 19.7);
  float gustPatchNoise = noise2DAndGrad(gustPatchUv).x;
  float localGustBoost = smoothstep(0.32, 0.78, gustPatchNoise) * clamp((uWindGust - 0.85) * 1.15, 0.0, 1.25);
  float windStrength = clamp(windSpeed / 32.0, 0.06, 1.35) * (0.78 + 0.55 * localGustBoost);

  vec2 rT, rN;
  float rAlong, rCross, rLatFrac, rSpeed, riverMask;
  if (inRiverCorridor) {
    sampleRiverChannel(worldPos, rT, rN, rAlong, rCross, rLatFrac, rSpeed, riverMask);
  } else {
    rT = windDir;
    rN = windPerp;
    rAlong = 0.0;
    rCross = 0.0;
    rLatFrac = 0.0;
    rSpeed = 0.0;
    riverMask = 0.0;
  }

  vec2 dir0 = riverMask > 0.01 ? rT : windDir;
  vec2 worldGrad = vec2(0.0);

  if (riverMask > 0.01) {
    // --- A. RIVER CHANNEL HYDRODYNAMIC FLOW (Вода течёт строго по изгибам русла) ---
    // Parabolic velocity profile across channel width: faster in deep mid-channel fairway, slower near shallow shores
    float latClamped = clamp(rLatFrac, -1.0, 1.0);
    gWaterDepth01 = clamp(1.0 - latClamped * latClamped, 0.06, 1.0);
    float speedProfile = clamp(1.0 - 0.50 * latClamped * latClamped, 0.35, 1.05);
    float localFlowSpeed = rSpeed * speedProfile;
    float flowAdv = time * (localFlowSpeed * 0.048);

    // 1. Longitudinal current streamlines & shear eddies elongated along the riverbed tangent rT
    vec2 pStream = vec2(rAlong * 0.024 - flowAdv * 1.15, rCross * 0.082);
    vec3 nStream = noise2DAndGrad(pStream);
    vec2 gStream = (rT * nStream.y * 0.024 + rN * nStream.z * 0.082) * 14.5;

    // 2. Downstream hydraulic V-chevrons / turbulent boil facets (+/- 18 deg to river tangent rT)
    const float ca = 0.95106; // cos(18 deg)
    const float sa = 0.30902; // sin(18 deg)
    vec2 dA = vec2(rT.x * ca - rT.y * sa, rT.x * sa + rT.y * ca);
    vec2 pA = vec2(-dA.y, dA.x);
    vec2 uvA = vec2((rAlong * ca - rCross * sa) * 0.052 - flowAdv * 1.38, (rAlong * sa + rCross * ca) * 0.058 + 13.7);
    vec3 nA = noise2DAndGrad(uvA);
    vec2 gA = (dA * nA.y * 0.052 + pA * nA.z * 0.058) * 10.5;

    vec2 dB = vec2(rT.x * ca + rT.y * sa, -rT.x * sa + rT.y * ca);
    vec2 pB = vec2(-dB.y, dB.x);
    vec2 uvB = vec2((rAlong * ca + rCross * sa) * 0.054 - flowAdv * 1.42, (-rAlong * sa + rCross * ca) * 0.060 + 29.3);
    vec3 nB = noise2DAndGrad(uvB);
    vec2 gB = (dB * nB.y * 0.054 + pB * nB.z * 0.060) * 10.2;

    // 3. Fine micro-capillary surface shimmer riding along the current
    vec2 uvMicro = vec2(rAlong * 0.11 - flowAdv * 1.75 + nStream.x * 0.65, rCross * 0.13 - 11.4);
    vec3 nMicro = noise2DAndGrad(uvMicro);
    vec2 gMicro = (rT * nMicro.y * 0.11 + rN * nMicro.z * 0.13) * 5.2;

    vec2 riverFlowGrad = gStream * 0.48 + (gA + gB) * 0.36 + gMicro * 0.28;
    outCrestHighlight += smoothstep(0.58, 0.85, (nA.x + nB.x) * 0.5) * 0.35;

    // --- B. SURFACE WIND RIPPLES RIDING ON TOP OF THE MOVING RIVER CURRENT ---
    // Advected along the river spline coordinate (rAlong, rCross) + monotonic uWindPhase so wind gusts
    // never shift the whole river forward/backward!
    float windAlong = rAlong * dot(rT, windDir) + rCross * dot(rN, windDir);
    float windCross = rAlong * dot(rT, windPerp) + rCross * dot(rN, windPerp);
    float opposingSteepen = 1.0 + 0.45 * max(0.0, -dot(windDir, rT));

    vec2 wUv1 = vec2(windAlong * 0.14 - uWindPhase * 1.15 - flowAdv * 0.45, windCross * 0.052 + 41.2);
    vec3 wn1 = noise2DAndGrad(wUv1);
    vec2 wg1 = (windDir * wn1.y * 0.14 + windPerp * wn1.z * 0.052) * 5.8;

    vec2 wUv2 = vec2(windAlong * 0.25 - uWindPhase * 1.55 - flowAdv * 0.55, windCross * 0.095 + 73.9);
    vec3 wn2 = noise2DAndGrad(wUv2);
    vec2 wg2 = (windDir * wn2.y * 0.25 + windPerp * wn2.z * 0.095) * 3.4;

    vec2 windRippleGrad = (wg1 + wg2) * (windStrength * opposingSteepen * 0.46);
    worldGrad = riverFlowGrad + windRippleGrad;
  } else {
    // --- C. STANDING WATER (Ponds, Puddles, Salt Lakes): Driven by Monotonic Wind Phase uWindPhase ---
    const float ca = 0.93358; // cos(21 deg)
    const float sa = 0.35837; // sin(21 deg)
    vec2 wDirA = vec2(windDir.x * ca - windDir.y * sa, windDir.x * sa + windDir.y * ca);
    vec2 wPerpA = vec2(-wDirA.y, wDirA.x);
    vec2 wDirB = vec2(windDir.x * ca + windDir.y * sa, -windDir.x * sa + windDir.y * ca);
    vec2 wPerpB = vec2(-wDirB.y, wDirB.x);

    vec2 p1 = vec2(dot(worldPos, windDir) * 0.068 - uWindPhase, dot(worldPos, windPerp) * 0.028);
    vec3 n1 = noise2DAndGrad(p1);
    vec2 g1 = (windDir * n1.y * 0.068 + windPerp * n1.z * 0.028) * 14.0;

    vec2 p2 = vec2(dot(worldPos, wDirA) * 0.11 - uWindPhase * 1.28, dot(worldPos, wPerpA) * 0.045 + 17.3);
    vec3 n2 = noise2DAndGrad(p2);
    vec2 g2 = (wDirA * n2.y * 0.11 + wPerpA * n2.z * 0.045) * 9.5;

    vec2 p3 = vec2(dot(worldPos, wDirB) * 0.12 - uWindPhase * 1.34, dot(worldPos, wPerpB) * 0.048 + 31.9);
    vec3 n3 = noise2DAndGrad(p3);
    vec2 g3 = (wDirB * n3.y * 0.12 + wPerpB * n3.z * 0.048) * 9.0;

    worldGrad = (g1 * 0.45 + (g2 + g3) * 0.35) * windStrength;
    // Coherent dispersive swell on top of the wind-ripple noise: gives lakes real wave crests instead of blotchy noise only
    worldGrad += waterSwellGrad(worldPos, windDir, windStrength, time);
    outCrestHighlight += smoothstep(0.60, 0.86, (n2.x + n3.x) * 0.5) * 0.25 * windStrength;
  }

  float advSpeed = riverMask > 0.01 ? clamp(rSpeed * 0.042, 0.6, 2.2) : clamp(windSpeed * 0.038, 0.3, 1.8);

  // 3. Direct GPU Hydrodynamic Obstacle Deflection, Kelvin Wake & Dispersive Ripple Solver
  if (uWakeCount > 0 && uWaterWakes > 0.001) {
    vec2 wakeGradAccum = vec2(0.0);
    float foamAccum = 0.0;

    for (int i = 0; i < 32; i++) {
      if (i >= uWakeCount) break;
      vec4 wp = uWakePosRad[i];   // xy = pos, z = radius, w = intensity
      vec4 wv = uWakeVelParam[i]; // xy = source vel, z = progress, w = typeAndFoam

      vec2 rel = worldPos - wp.xy;
      float maxReach = wp.z * (wv.w >= 2.0 ? 3.2 : 2.15) + 28.0;
      if (abs(rel.x) > maxReach || abs(rel.y) > maxReach) continue;

      float dist = length(rel);
      if (dist > maxReach) continue;

      float intensity = wp.w;
      float progress = wv.z;

      if (wv.w >= 2.0) {
        // --- OBSTACLE FLOW-AROUND DEFLECTION, STAGNATION BOW COLLAR & TURBULENT FOAM WAKE ---
        // (Submerged vehicles, emergent boulders, bridge piers, wading humans in flowing water)
        float foamStr = wv.w - 2.0;
        float vLen = length(wv.xy);
        vec2 vDir = vLen > 0.5 ? (wv.xy / vLen) : -dir0; // Points upstream into the oncoming relative flow
        vec2 vPerp = vec2(-vDir.y, vDir.x);

        float xPar = dot(rel, vDir);   // > 0 upstream (bow), < 0 downstream (wake tail)
        float yPerp = dot(rel, vPerp);
        float absY = abs(yPerp);
        float R = max(4.5, wp.z);

        // 1. Potential-flow dipole deflection around the obstacle contour: bends ambient river waves around the hull/rock!
        float rNorm = dist / R;
        if (rNorm > 0.35 && rNorm < 2.6) {
          float collarEnv = exp(-pow(rNorm - 1.02, 2.0) / 0.16);
          float upstreamBias = clamp(xPar / max(dist, 0.1) * 0.55 + 0.45, 0.0, 1.0);
          vec2 radOut = rel / max(dist, 0.1);
          // Steep standing bow wave & lateral parting ridge right along the object's waterline perimeter
          float collarWave = sin((rNorm - 0.95) * 6.28318 - time * 5.2);
          wakeGradAccum += radOut * ((1.25 + 0.85 * collarWave) * collarEnv * (0.45 + 0.75 * upstreamBias) * intensity * 2.6);
          // Aerated whitewater foam necklace wrapping around the upstream bow & flanks of the obstacle
          foamAccum += collarEnv * (0.42 + 0.78 * upstreamBias) * intensity * (0.45 + 0.85 * foamStr);
          outCrestHighlight += collarEnv * upstreamBias * intensity * 0.55;
        }

        // 2. Curved parabolic bow wave & diverging Kelvin V-arms wrapping around the obstacle into a downstream wake
        float bodyScale = R * 0.78;
        float wakeLen = R * 2.85 + 18.0;
        if (xPar < bodyScale * 1.15 && xPar > -wakeLen) {
          float behind = max(0.0, -xPar + bodyScale * 0.55);
          float armHalfWidth = bodyScale * 0.72 + sqrt(behind * bodyScale * 0.65) + behind * 0.24;
          float distFromArm = absY - armHalfWidth;

          float lonEnv = smoothstep(-wakeLen, -wakeLen * 0.12, xPar) * (1.0 - smoothstep(bodyScale * 0.55, bodyScale * 1.15, xPar));
          float armWidth = max(3.5, R * 0.36);
          float armEnv = exp(-(distFromArm * distFromArm) / (armWidth * armWidth)) * lonEnv;

          // Multi-harmonic standing feather waves along the parted V-wake arms
          float kArm = 0.58;
          float armPhase = distFromArm * kArm - time * 7.8 + behind * 0.12;
          float dArm = (cos(armPhase) + 0.4 * cos(armPhase * 1.8 + 0.9)) * kArm;
          float sideSign = yPerp >= 0.0 ? 1.0 : -1.0;
          vec2 armNormal = normalize(vPerp * sideSign * 0.90 + vDir * 0.44);
          wakeGradAccum += armNormal * (dArm * armEnv * intensity * 2.45);

          // Turbulent von Karman vortex street & aerated whitewater boil in the lee shadow behind the obstacle
          float leeShadow = exp(-(yPerp * yPerp) / max(10.0, R * R * 0.62))
                          * smoothstep(R * 0.2, -R * 0.45, xPar)
                          * smoothstep(-wakeLen, -R * 0.6, xPar);
          if (leeShadow > 0.01) {
            float vortexSway = sin(xPar * 0.22 + time * 9.5) * R * 0.25;
            vec2 boilUv = (worldPos + vPerp * vortexSway) * 0.18 + vDir * (time * 3.8);
            vec3 nBoil = noise2DAndGrad(boilUv);
            wakeGradAccum += (vDir * nBoil.y + vPerp * nBoil.z) * (leeShadow * intensity * 2.1);
          }

          float armCrest = max(0.0, sin(armPhase)) * armEnv;
          foamAccum += (armCrest * 0.92 + leeShadow * 0.88) * intensity * (0.40 + 0.85 * foamStr);
        }
      } else if (wv.w >= 1.0) {
        // --- DIRECTIONAL HYDRODYNAMIC KELVIN V-WAKE + PARABOLIC BOW WAVE + TURBULENT SLIPSTREAM ---
        float foamStr = wv.w - 1.0;
        float vLen = length(wv.xy);
        vec2 vDir = vLen > 0.5 ? (wv.xy / vLen) : dir0;
        vec2 vPerp = vec2(-vDir.y, vDir.x);

        // Local coordinates relative to disturbance center: xPar > 0 ahead, xPar < 0 behind in wake
        float xPar = dot(rel, vDir);
        float yPerp = dot(rel, vPerp);
        float absY = abs(yPerp);

        // Parabolic bow & Kelvin Mach-like V-cone coordinate:
        float bodyScale = max(6.0, wp.z * 0.34);
        float bowCurve = xPar + 0.36 * (yPerp * yPerp) / bodyScale;
        float wakeLen = wp.z * 1.95 + 14.0;

        if (xPar < bodyScale * 0.95 && xPar > -wakeLen) {
          float behind = max(0.0, -xPar + bodyScale * 0.35);
          // Kelvin half-angle tan(19.47 deg) ~ 0.3535, widening slightly with source radius
          float armHalfWidth = bodyScale * 0.42 + behind * 0.38;
          float distFromArm = absY - armHalfWidth;

          // Longitudinal & lateral envelope decay
          float lonEnv = smoothstep(-wakeLen, -wakeLen * 0.15, xPar) * (1.0 - smoothstep(bodyScale * 0.25, bodyScale * 0.95, xPar));
          float armEnv = exp(-(distFromArm * distFromArm) / max(12.0, bodyScale * bodyScale * 0.55)) * lonEnv;

          // Diverging feather wave phase along the V-arms + transverse wave phase in the interior cone
          float kArm = 0.52;
          float armPhase = distFromArm * kArm - time * 8.5 + progress * 4.0;
          float dArm = cos(armPhase) * kArm;

          // Outward + backward normal of the Kelvin V-arm
          float sideSign = yPerp >= 0.0 ? 1.0 : -1.0;
          vec2 armNormal = normalize(vPerp * sideSign * 0.92 + vDir * 0.39);
          wakeGradAccum += armNormal * (dArm * armEnv * intensity * 2.35);

          // Transverse waves inside the V-wake cone (between the two arms)
          float insideCone = smoothstep(armHalfWidth * 1.15, armHalfWidth * 0.25, absY) * lonEnv * step(xPar, bodyScale * 0.2);
          if (insideCone > 0.01) {
            float kTrans = 0.34;
            float transPhase = bowCurve * kTrans + time * 6.2;
            wakeGradAccum += vDir * (cos(transPhase) * kTrans * insideCone * intensity * 1.25);
          }

          // Aerated whitewater foam on breaking bow crest, V-arm rollers, and turbulent centerline slipstream
          float armCrest = max(0.0, sin(armPhase)) * armEnv;
          float slipstreamEnv = exp(-(yPerp * yPerp) / max(8.0, bodyScale * bodyScale * 0.32)) * lonEnv * smoothstep(bodyScale * 0.3, -bodyScale * 0.4, xPar);
          foamAccum += (armCrest * 0.85 + slipstreamEnv * 0.95) * intensity * (0.35 + 0.85 * foamStr);
        }
      } else {
        // --- DISPERSIVE CONCENTRIC CAPILLARY-GRAVITY WAVE PACKET (Footsteps, Wading, Splashes, Raindrops) ---
        float foamStr = wv.w;
        float dr = dist - wp.z;
        float packetWidth = max(4.5, wp.z * 0.32 + 3.5);
        float env = exp(-(dr * dr) / (packetWidth * packetWidth)) * smoothstep(1.5, 5.5, dist);
        if (env > 0.005) {
          // Dispersive wave train: shorter capillary wavelengths at the leading edge, longer gravity waves trailing
          float kRad = 0.68 / (1.0 + progress * 0.55);
          float phase = dr * kRad - progress * 8.5;
          // Primary + secondary harmonic ring
          float dWave = (cos(phase) + 0.45 * cos(phase * 1.65 + 0.8)) * kRad;
          vec2 radDir = rel / max(dist, 0.001);
          wakeGradAccum += radDir * (dWave * env * intensity * 2.15);

          float crestFoam = max(0.0, sin(phase)) * env * intensity * foamStr * (1.0 - progress * 0.7);
          foamAccum += crestFoam * 0.65;
        }
      }
    }

    worldGrad += wakeGradAccum * uWaterWakes;

    // Modulate accumulated wake foam with multi-scale cellular bubble texture advected by water flow
    if (foamAccum > 0.01) {
      vec2 foamUv = worldPos * 0.22 - dir0 * (time * advSpeed * 0.85) + worldGrad * 0.18;
      float cell1 = noise2DAndGrad(foamUv).x;
      float cell2 = noise2DAndGrad(foamUv * 2.45 + vec2(17.1, -9.3) + worldGrad * 0.45).x;
      float cell3 = noise2DAndGrad(foamUv * 5.2 - vec2(7.4, 21.8)).x;
      // Rich lacy whitewater foam structure: dense solid core on strong bow crests, porous bubble lace at trailing edges
      float bubbleLace = smoothstep(0.18, 0.68, cell1 * 0.50 + cell2 * 0.35 + cell3 * 0.25);
      float denseCore = smoothstep(0.55, 1.15, foamAccum);
      outWakeFoam = clamp(foamAccum * uWaterWakes * mix(0.35 + 0.85 * bubbleLace, 0.96, denseCore), 0.0, 0.94);
    }
  }

  return worldDirToScreenUv(worldGrad);
}

// ============================================================================
// MATERIAL G-BUFFER DECODER (100% Material-Driven, Zero Color Guessing)
// ============================================================================
// Material IDs encoded in uMat.r (0..255):
//   0 = MAT_OCCLUDER     (R=0:   Cars, Roofs, Buildings, Balconies, Bridges, Trees, Props, Humans, Sand)
//   1 = MAT_EARTH        (R=32:  Natural ground, grass, fields, snow-covered earth)
//   2 = MAT_DIRT         (R=64:  Dirt/gravel roads, unpaved tracks, muddy riverbanks)
//   3 = MAT_CONCRETE     (R=96:  Sidewalks, concrete slabs, industrial/garage aprons)
//   4 = MAT_ASPHALT      (R=128: Paved asphalt roads, intersections, parkings, gas station apron)
//   5 = MAT_WATER_BODY   (R=160: River "Быстрица", Salt Lakes, Park Fountain basin)
//   6 = MAT_PUDDLE_WATER (R=192: Road/ground water puddles & spilled water stains)
//   7 = MAT_FUEL         (R=224: Gasoline / diesel spills)
//   8 = MAT_OIL          (R=240: Motor oil / lubricant spills)
//   9 = MAT_COOLANT      (R=255: Antifreeze / coolant spills)
int classifyMatCode(float r255) {
  if (r255 < 16.0) return 0;
  if (r255 < 48.0) return 1;
  if (r255 < 80.0) return 2;
  if (r255 < 112.0) return 3;
  if (r255 < 144.0) return 4;
  if (r255 < 176.0) return 5;
  if (r255 < 208.0) return 6;
  if (r255 < 232.0) return 7;
  if (r255 < 248.0) return 8;
  return 9;
}

void sampleMaterial(
  vec2 uv,
  vec2 texel,
  out int matId,
  out float paramG,
  out float alphaB,
  out vec2 meniscusN
) {
  matId = 0;
  paramG = 0.0;
  alphaB = 0.0;
  meniscusN = vec2(0.0);
  if (uMatOn < 0.5) return;

  vec4 mC = texture(uMat, uv);
  vec4 mL = texture(uMat, clamp(uv - vec2(texel.x * 1.5, 0.0), vec2(0.001), vec2(0.999)));
  vec4 mR = texture(uMat, clamp(uv + vec2(texel.x * 1.5, 0.0), vec2(0.001), vec2(0.999)));
  vec4 mD = texture(uMat, clamp(uv - vec2(0.0, texel.y * 1.5), vec2(0.001), vec2(0.999)));
  vec4 mU = texture(uMat, clamp(uv + vec2(0.0, texel.y * 1.5), vec2(0.001), vec2(0.999)));

  float rC = mC.r * 255.0;
  float rL = mL.r * 255.0;
  float rR = mR.r * 255.0;
  float rD = mD.r * 255.0;
  float rU = mU.r * 255.0;

  float rMin = min(rC, min(min(rL, rR), min(rD, rU)));
  float rMax = max(rC, max(max(rL, rR), max(rD, rU)));

  // Strict Occluder Guard: if this pixel or its anti-aliased edge touches MAT_OCCLUDER (0),
  // immediately classify as MAT_OCCLUDER (0) so cars/roofs never get water/road shaders!
  if (rC < 16.0 || (rMin < 8.0 && (rMax - rMin) > 12.0 && abs(rC - rMax) > 4.0)) {
    matId = 0;
    return;
  }

  // Snap 1-pixel Canvas 2D anti-aliased seams between two materials to the nearest valid material code
  if ((rMax - rMin) > 10.0 && abs(rC - rMin) > 4.0 && abs(rC - rMax) > 4.0) {
    rC = (abs(rC - rMax) <= abs(rC - rMin)) ? rMax : rMin;
  }

  matId = classifyMatCode(rC);
  paramG = mC.g;
  alphaB = mC.b;

  // For liquid puddles & stains (matId >= 6), compute the outward 3D meniscus contact-rim normal
  if (matId >= 6) {
    float hL = (classifyMatCode(rL) == matId) ? mL.g : 0.0;
    float hR = (classifyMatCode(rR) == matId) ? mR.g : 0.0;
    float hD = (classifyMatCode(rD) == matId) ? mD.g : 0.0;
    float hU = (classifyMatCode(rU) == matId) ? mU.g : 0.0;
    meniscusN = vec2(hL - hR, hD - hU);
  }
}

// Procedural concentric raindrop splash ripples on puddles and water surfaces during active rainfall
vec2 computeRaindropRipples(vec2 worldPos, float time, float rainAmt) {
  if (rainAmt <= 0.01) return vec2(0.0);
  vec2 accum = vec2(0.0);
  for (int layer = 0; layer < 2; layer++) {
    float scale = layer == 0 ? 0.11 : 0.17;
    vec2 p = worldPos * scale + float(layer) * vec2(13.7, 29.3);
    vec2 cell = floor(p);
    vec2 f = fract(p) - 0.5;
    float h = hash(cell);
    float period = 0.85;
    float t = fract(time / period + h);
    vec2 dropCenter = (vec2(hash(cell + vec2(3.1, 7.2)), hash(cell + vec2(9.4, 1.8))) - 0.5) * 0.45;
    vec2 dVec = f - dropCenter;
    float r = length(dVec);
    float ringR = t * 0.48;
    float env = exp(-pow((r - ringR) * 14.0, 2.0)) * (1.0 - t) * smoothstep(0.02, 0.08, r);
    float wave = cos((r - ringR) * 58.0);
    if (r > 1e-4) {
      accum += (dVec / r) * (wave * env);
    }
  }
  return worldDirToScreenUv(accum * (1.35 * rainAmt));
}

// Puddle & thin-liquid local capillary wave + wake interaction solver
vec2 computePuddleWaveNormal(vec2 worldPos, float time, float depthFactor) {
  float windSpeed = length(uWind);
  vec2 windDir = windSpeed > 0.2 ? (uWind / windSpeed) : vec2(0.94, 0.34);
  vec2 windPerp = vec2(-windDir.y, windDir.x);

  // Shallow puddles damp long gravity waves and exhibit fine wind capillary ripples
  float capStrength = clamp(windSpeed / 30.0, 0.08, 1.15) * smoothstep(0.10, 0.55, depthFactor);
  vec2 uv1 = vec2(dot(worldPos, windDir) * 0.24 - uWindPhase * 1.45, dot(worldPos, windPerp) * 0.14);
  vec2 uv2 = vec2(dot(worldPos, windDir) * 0.46 - uWindPhase * 2.15 + 11.3, dot(worldPos, windPerp) * 0.32 - 7.1);
  vec3 n1 = noise2DAndGrad(uv1);
  vec3 n2 = noise2DAndGrad(uv2);

  vec2 worldGrad = (windDir * (n1.y * 0.24) + windPerp * (n1.z * 0.14)) * (0.45 * capStrength)
                 + (windDir * (n2.y * 0.46) + windPerp * (n2.z * 0.32)) * (0.28 * capStrength);

  // Interactive wake rings when stepping or driving through a puddle
  if (uWakeCount > 0 && uWaterWakes > 0.001) {
    for (int i = 0; i < 32; i++) {
      if (i >= uWakeCount) break;
      vec4 wp = uWakePosRad[i];
      vec4 wv = uWakeVelParam[i];
      vec2 rel = worldPos - wp.xy;
      float maxReach = wp.z * 1.65 + 14.0;
      if (abs(rel.x) > maxReach || abs(rel.y) > maxReach) continue;
      float dist = length(rel);
      if (dist > maxReach || dist < 0.2) continue;
      float bandHalf = max(3.5, wp.z * 0.28);
      float dR = dist - wp.z;
      float env = exp(-(dR * dR) / (bandHalf * bandHalf)) * (1.0 - wv.z * 0.65);
      float phase = dR * 0.65 - time * 8.5;
      worldGrad += (rel / dist) * (cos(phase) * env * wp.w * 1.35 * uWaterWakes);
    }
  }

  return worldDirToScreenUv(worldGrad);
}

void main() {
  vec2 uv = vUv;
  vec2 texel = 1.0 / uSrcSize;
  vec2 worldPos = screenUvToWorld(uv);

  // --- Thermal Heat Shimmer (Top-Down Refractive Index Gradient Distortion around Active Fires) -------------
  if (uFireCount > 0 && uHeatShimmer > 0.001) {
    float totalHeat = 0.0;
    vec2 netWindWorld = vec2(1e-4, 0.0);
    vec2 radialAccum = vec2(0.0);

    for (int i = 0; i < 16; i++) {
      if (i >= uFireCount) break;
      vec4 fp = uFirePosRad[i];
      vec2 fw = uFireWind[i];
      float windLen = length(fw);
      vec2 windDir = windLen > 0.001 ? (fw / windLen) : vec2(1.0, 0.0);
      vec2 rel = worldPos - fp.xy;
      float along = dot(rel, windDir);
      vec2 perp = rel - windDir * along;
      float effAlong = along > 0.0 ? along / (1.0 + min(0.85, windLen * 0.015)) : along * 1.08;
      float dist = length(perp + windDir * effAlong);
      float heatRad = max(20.0, fp.z * 2.85);
      if (dist < heatRad) {
        float coreSuppress = smoothstep(fp.z * 0.20, fp.z * 0.80, dist);
        float falloff = 1.0 - smoothstep(fp.z * 0.40, heatRad, dist);
        float w = falloff * (0.45 + 0.55 * coreSuppress) * clamp(fp.w, 0.0, 1.2);
        totalHeat += w;
        netWindWorld += fw * w;
        if (dist > 0.5) {
          radialAccum += (rel / dist) * w;
        }
      }
    }

    if (totalHeat > 0.01) {
      float heatAmt = min(1.0, totalHeat) * uHeatShimmer;
      vec2 advect = (radialAccum * 0.55 + normalize(netWindWorld) * 0.45) * (uTime * 6.5);
      vec3 hNoise1 = noise2DAndGrad(worldPos * 0.14 - advect);
      vec3 hNoise2 = noise2DAndGrad(worldPos * 0.29 - advect * 1.35 + hNoise1.yz * 0.35);
      vec2 shimmerGrad = worldDirToScreenUv(hNoise1.yz * 0.6 + hNoise2.yz * 0.4);
      uv = clamp(uv + shimmerGrad * texel * (2.05 * heatAmt), vec2(0.001), vec2(0.999));
    }
  }

  // --- Exact Material G-Buffer Lookup -----------------------------------------------------------------------
  int matId = 0;
  float matParam = 0.0;
  float matAlpha = 0.0;
  vec2 meniscusN = vec2(0.0);
  sampleMaterial(uv, texel, matId, matParam, matAlpha, meniscusN);

  bool isWaterBody = (matId == 5);
  bool isPuddleWater = (matId == 6);
  bool isFuel = (matId == 7);
  bool isOil = (matId == 8);
  bool isCoolant = (matId == 9);
  bool isRoad = (matId == 4 || matId == 3);
  bool isEarthOrDirt = (matId == 1 || matId == 2);

  // --- Initial sample & Material-Driven UV Refraction (Water Bodies, Puddles, Coolant) ----------------------
  vec3 cRaw = fetchSrc(uv);
  float waterMask = (isWaterBody && uFreezing < 0.5 && uWaterShader > 0.001) ? uWaterShader : 0.0;
  float puddleBasinMask = (isPuddleWater && uFreezing < 0.5 && uWaterShader > 0.001)
    ? smoothstep(0.16, 0.36, matParam) * clamp(matAlpha * 1.15, 0.0, 1.0) * uWaterShader
    : 0.0;

  vec2 waveN = vec2(0.0);
  float wakeFoam = 0.0;
  float crestHighlight = 0.0;

  if (waterMask > 0.01) {
    bool inRiver = (worldPos.y >= -4250.0 && worldPos.y <= -1750.0 && worldPos.x >= -3500.0 && worldPos.x <= 50500.0);
    waveN = computeWaterWaveNormal(worldPos, uTime, inRiver, wakeFoam, crestHighlight)
          + computeRaindropRipples(worldPos, uTime, uRain) * 0.65;
    // Real-time UV refraction strictly guarded by uMat so dry cars/bridges/banks never bleed into water!
    vec2 refrUv = clamp(uv + waveN * texel * (0.7 + 2.6 * gWaterDepth01) * waterMask, vec2(0.001), vec2(0.999));
    float rRefr = texture(uMat, refrUv).r * 255.0;
    if (classifyMatCode(rRefr) == 5) {
      vec3 cRefr = fetchSrc(refrUv);
      cRaw = mix(cRaw, cRefr, waterMask * 0.85);
    }
  } else if (puddleBasinMask > 0.01) {
    waveN = computePuddleWaveNormal(worldPos, uTime, matParam)
          + computeRaindropRipples(worldPos, uTime, uRain)
          + meniscusN * 0.42;
    vec2 refrUv = clamp(uv + waveN * texel * 1.55 * puddleBasinMask, vec2(0.001), vec2(0.999));
    float rRefr = texture(uMat, refrUv).r * 255.0;
    if (classifyMatCode(rRefr) == 6) {
      vec3 cRefr = fetchSrc(refrUv);
      cRaw = mix(cRaw, cRefr, puddleBasinMask * 0.72);
    }
  } else if (isCoolant) {
    vec2 coolCapN = computePuddleWaveNormal(worldPos, uTime * 0.45, matParam) * 0.35 + meniscusN * 1.15;
    waveN = coolCapN;
    vec2 refrUv = clamp(uv + coolCapN * texel * 1.15 * matAlpha, vec2(0.001), vec2(0.999));
    float rRefr = texture(uMat, refrUv).r * 255.0;
    if (classifyMatCode(rRefr) == 9) {
      cRaw = mix(cRaw, fetchSrc(refrUv), matAlpha * 0.55);
    }
  }

  // --- colour fetch with optional lens fringing -------------------------------------------------------------
  vec3 c = cRaw;
  vec2 cen = uv - 0.5;
  float r2 = dot(cen * vec2(uOutSize.x / uOutSize.y, 1.0), cen * vec2(uOutSize.x / uOutSize.y, 1.0));
  if (uChroma > 0.001) {
    vec2 off = cen * (uChroma * 0.012 * r2);
    c.r = fetchSrc(uv + off).r;
    c.b = fetchSrc(uv - off).b;
  }

  // --- CAS-style sharpening (restores crispness after render-scale upscale) ---------------------------------
  if (uSharp > 0.001) {
    vec3 b = texture(uSrc, uv + vec2(0.0,  texel.y)).rgb;
    vec3 d = texture(uSrc, uv + vec2(-texel.x, 0.0)).rgb;
    vec3 f = texture(uSrc, uv + vec2( texel.x, 0.0)).rgb;
    vec3 h = texture(uSrc, uv + vec2(0.0, -texel.y)).rgb;
    vec3 mn = min(min(min(d, c), min(f, b)), h);
    vec3 mx = max(max(max(d, c), max(f, b)), h);
    vec3 amp = sqrt(clamp(min(mn, 1.0 - mx) / max(mx, vec3(1e-4)), 0.0, 1.0));
    vec3 w = amp * (-1.0 / mix(8.0, 5.0, clamp(uSharp, 0.0, 1.0)));
    vec3 rcp = 1.0 / (1.0 + 4.0 * w);
    c = clamp((b * w + d * w + f * w + h * w + c) * rcp, 0.0, 1.0);
  }

  float l0 = luma(c);

  // --- Procedural Material Micro-Normals (Asphalt Aggregate, Concrete Grain, Soil Biomes, Tire Ruts, Snowdrifts) --------
  vec2 matMicroN = vec2(0.0);
  float roadSkidMask = isRoad ? clamp((matAlpha - 0.52) * 2.15, 0.0, 1.0) : 0.0;
  float offroadRutMask = isEarthOrDirt ? clamp((matAlpha - 0.52) * 2.15, 0.0, 1.0) : 0.0;

  if (isRoad) {
    vec3 ag1 = noise2DAndGrad(worldPos * 0.85);
    vec3 ag2 = noise2DAndGrad(worldPos * 2.35 + vec2(17.3, -9.1));
    // Bitumen repair patches (matParam < 0.22) and vulcanized rubber skidmarks smooth out raw stone aggregate pores
    float isBitumenPatch = 1.0 - smoothstep(0.12, 0.24, matParam);
    float granScale = ((matId == 4) ? 0.050 : 0.032) * (1.0 - isBitumenPatch * 0.45) * (1.0 - roadSkidMask * 0.62);
    matMicroN = worldDirToScreenUv(ag1.yz * 0.55 + ag2.yz * 0.45) * granScale;
    if (uSnow > 0.01) {
      float rutMask = max(smoothstep(0.60, 0.88, matParam), roadSkidMask);
      vec3 snN = noise2DAndGrad(worldPos * 0.16 + vec2(5.2, 11.8));
      matMicroN = mix(matMicroN, worldDirToScreenUv(snN.yz) * 0.065, uSnow * (1.0 - rutMask * 0.75));
    }
  } else if (isEarthOrDirt) {
    vec3 er1 = noise2DAndGrad(worldPos * 0.34);
    vec3 er2 = noise2DAndGrad(worldPos * 1.15 + vec2(-13.4, 7.9));
    float earthScale = (matId == 2) ? ((matParam < 0.42) ? 0.072 : 0.058) : 0.045;
    vec2 baseEarthGrad = er1.yz * 0.65 + er2.yz * 0.35;

    if (matId == 1 && matParam < 0.25) {
      // Plowed Chernozem: regular tractor furrow ridges + heavy soil clods
      float furrowDeriv = cos(worldPos.y * 0.78 + er1.x * 1.4) * 0.85;
      baseEarthGrad = mix(baseEarthGrad, vec2(er2.y * 0.4, furrowDeriv), 0.65);
      earthScale = 0.064;
    } else if (matId == 1 && matParam >= 0.25 && matParam < 0.42) {
      // Silica Sand & Salt Flats: wind-rippled micro-dunes perpendicular to prevailing wind
      float wLen = length(uWind);
      vec2 wDir = wLen > 0.1 ? (uWind / wLen) : vec2(0.92, 0.39);
      float ripplePhase = dot(worldPos, wDir) * 0.55 - uWindPhase * 0.15 + er1.x * 1.8;
      vec2 duneGrad = wDir * cos(ripplePhase) * 0.75 + er2.yz * 0.25;
      baseEarthGrad = duneGrad;
      earthScale = 0.048;
    }
    matMicroN = worldDirToScreenUv(baseEarthGrad) * earthScale;

    // 3D Offroad Tire Rut normal perturbation from uMat.b screen-space height gradient
    if (offroadRutMask > 0.01) {
      float rL = clamp((texture(uMat, uv + vec2(-texel.x * 2.0, 0.0)).b - 0.52) * 2.15, 0.0, 1.0);
      float rR = clamp((texture(uMat, uv + vec2( texel.x * 2.0, 0.0)).b - 0.52) * 2.15, 0.0, 1.0);
      float rD = clamp((texture(uMat, uv + vec2(0.0, -texel.y * 2.0)).b - 0.52) * 2.15, 0.0, 1.0);
      float rU = clamp((texture(uMat, uv + vec2(0.0,  texel.y * 2.0)).b - 0.52) * 2.15, 0.0, 1.0);
      // Trench is sunken (-height), so gradient of depth points into the trench walls
      vec2 rutWallN = vec2(rL - rR, rD - rU) * 0.18;
      matMicroN = mix(matMicroN, matMicroN * 0.45 + rutWallN, min(1.0, offroadRutMask * 1.35));
    }

    if (uSnow > 0.01) {
      vec3 drift1 = noise2DAndGrad(worldPos * 0.055);
      vec3 drift2 = noise2DAndGrad(worldPos * 0.22 + vec2(19.1, -6.4));
      matMicroN = mix(matMicroN, worldDirToScreenUv(drift1.yz * 0.65 + drift2.yz * 0.35) * 0.085, uSnow * (1.0 - offroadRutMask * 0.65));
    }
  } else if (isOil) {
    // Viscous oil damps underlying asphalt grain in its core and forms a steep 3D meniscus rim
    waveN = meniscusN * 1.65 + computePuddleWaveNormal(worldPos, uTime * 0.25, matParam) * 0.12;
  } else if (isFuel) {
    waveN = meniscusN * 0.75 + computePuddleWaveNormal(worldPos, uTime * 0.80, matParam) * 0.32;
  }

  // --- micro relief: luminance read as height + material micro-normals, lit by sun, lamps, and fires --------
  vec2 g = vec2(0.0);
  if (uRelief > 0.001 || uFireCount > 0) {
    float hl = luma(texture(uSrc, uv + vec2(-texel.x * 1.5, 0.0)).rgb);
    float hr = luma(texture(uSrc, uv + vec2( texel.x * 1.5, 0.0)).rgb);
    float hd = luma(texture(uSrc, uv + vec2(0.0, -texel.y * 1.5)).rgb);
    float hu = luma(texture(uSrc, uv + vec2(0.0,  texel.y * 1.5)).rgb);
    // Viscous oil smooths out underlying substrate roughness
    float subRoughSuppress = isOil ? (1.0 - smoothstep(0.15, 0.65, matParam) * matAlpha * 0.85) : 1.0;
    g = (vec2(hr - hl, hu - hd) + matMicroN) * subRoughSuppress + waveN * max(waterMask, puddleBasinMask) * 0.14;
    float shade = 1.0 - l0 * 0.55;

    if (uRelief > 0.001) {
      float sunLit = clamp(-dot(g, uSun) * 3.2, -0.35, 0.35);
      c *= 1.0 + sunLit * uRelief * mix(0.5, 1.0, uDay) * shade;
      if (uLightOn > 0.5) {
        vec2 lt = vec2(12.0) / uLightSize;
        float lL = 1.0 - texture(uLight, uv + vec2(-lt.x, 0.0)).a;
        float lR = 1.0 - texture(uLight, uv + vec2( lt.x, 0.0)).a;
        float lD = 1.0 - texture(uLight, uv + vec2(0.0, -lt.y)).a;
        float lU = 1.0 - texture(uLight, uv + vec2(0.0,  lt.y)).a;
        vec2 lg = vec2(lR - lL, lU - lD);
        float lm = length(lg);
        float here = 1.0 - texture(uLight, uv).a;
        vec2 toLight = lg / max(lm, 1e-4);
        float lampLit = clamp(-dot(g, toLight) * 4.0, -0.5, 0.5);
        c *= 1.0 + lampLit * uRelief * smoothstep(0.0, 0.05, lm) * smoothstep(0.05, 0.5, here) * (0.4 + 0.6 * (1.0 - uDay)) * shade;
      }
    }

    // Dynamic per-fire normal-mapped surface relief & warm blackbody ground bounce
    if (uFireCount > 0 && uFireLighting > 0.001) {
      vec3 fireBounceAccum = vec3(0.0);
      float effRelief = max(uRelief, 0.35);
      float fluidSpecMask = max(max(waterMask, puddleBasinMask), (isOil || isFuel || isCoolant) ? matAlpha : 0.0);
      for (int i = 0; i < 16; i++) {
        if (i >= uFireCount) break;
        vec4 fp = uFirePosRad[i];
        vec2 toFireWorld = fp.xy - worldPos;
        float dist = length(toFireWorld);
        float lightReach = max(65.0, fp.z * 5.2);
        if (dist < lightReach && dist > 0.5) {
          float fi = float(i);
          float flick = 1.0
            + 0.09 * sin(uTime * 13.7 + fi * 2.31 + fp.x * 0.05)
            + 0.06 * cos(uTime * 22.9 - fi * 1.73 + fp.y * 0.05);
          float normDist = dist / lightReach;
          float atten = pow(max(0.0, 1.0 - normDist), 2.15) * clamp(fp.w, 0.0, 1.3) * flick;

          vec2 toFireUv = worldDirToScreenUv(toFireWorld / dist);
          float slopeLit = clamp(-dot(g, toFireUv) * 5.2, -0.25, 0.75);
          vec3 fireTint = mix(vec3(0.96, 0.32, 0.05), vec3(1.0, 0.76, 0.32), smoothstep(0.55, 0.08, normDist));

          float rimBoost = max(0.0, slopeLit) * effRelief * 1.35;
          float diffuseWarm = (0.10 + 0.22 * (1.0 - uDay)) * (0.65 + 0.35 * slopeLit);
          float wetSpec = 0.0;
          if ((uWet > 0.01 && (isRoad || isEarthOrDirt)) || fluidSpecMask > 0.01) {
            float waveFacet = 0.5 + 0.5 * clamp(dot(waveN + g * 2.0, toFireUv), -1.0, 1.0);
            wetSpec = max(uWet * 0.45 * float(isRoad || isEarthOrDirt), fluidSpecMask * 0.88) * waveFacet * 0.44;
          }
          fireBounceAccum += fireTint * atten * ((rimBoost + diffuseWarm) * shade + wetSpec);
        }
      }
      c += fireBounceAccum * uFireLighting * (c * 0.65 + 0.35);
    }
  }

  // Shared sky reflection palette & local artificial lighting helper
  vec3 daySkyCol = mix(vec3(0.45, 0.68, 0.88), vec3(0.95, 0.78, 0.58), clamp(1.0 - uDay * 1.15, 0.0, 1.0));
  vec3 nightSkyCol = vec3(0.05, 0.09, 0.16);
  vec3 skyCol = mix(nightSkyCol, daySkyCol, uDay);
  vec3 sunGlintCol = mix(vec3(0.55, 0.72, 0.96) * 0.38, vec3(1.0, 0.96, 0.84), uDay);
  float lampHere = (uLightOn > 0.5) ? (1.0 - texture(uLight, uv).a) : 0.0;

  // ============================================================================
  // SHADER 1: DEEP / FLOWING WATER BODIES (River "Быстрица", Salt Lakes, Fountain)
  // ============================================================================
  if (isWaterBody) {
    if (uFreezing > 0.5) {
      // Frozen River / Lake Crystalline Ice Shader
      vec3 iceN1 = noise2DAndGrad(worldPos * 0.15);
      vec3 iceN2 = noise2DAndGrad(worldPos * 0.65 + vec2(31.2, -14.8));
      vec2 iceGrad = worldDirToScreenUv(iceN1.yz * 0.6 + iceN2.yz * 0.4);
      float iceSun = dot(normalize(iceGrad + uSun * 0.35), uSun);
      float iceGlaze = pow(clamp(iceSun, 0.0, 1.0), 18.0) * 0.32;
      float frostSparkle = step(0.965, hash(floor(worldPos * 2.4) + floor(uCamPos * 0.02))) * (0.35 * uDay + 0.65 * lampHere);
      vec3 reflBloom = texture(uBloomWide, clamp(uv + iceGrad * 0.008, vec2(0.001), vec2(0.999))).rgb;
      c = mix(c, skyCol * 1.08, 0.12);
      c += sunGlintCol * iceGlaze + vec3(0.88, 0.95, 1.0) * frostSparkle * 0.55 + reflBloom * 0.65;
    } else if (waterMask > 0.01) {
      float waveSlopeMag = length(waveN);
      float sunDot = dot(waveN, uSun);

      // 1. Subsurface scattering (SSS) in translucent emerald-cyan wave crests + dark optical troughs
      float sssCrest = clamp(sunDot * 0.75 + crestHighlight * 0.65, -0.45, 1.0);
      vec3 sssTint = mix(vec3(0.02, 0.14, 0.22), vec3(0.10, 0.56, 0.64), uDay);
      c += sssTint * waterMask * max(0.0, sssCrest) * 0.20;
      c *= 1.0 + clamp(sunDot * 0.18, -0.14, 0.16) * waterMask;

      // 2. Schlick Fresnel on the real wave normal + procedural sky / cloud reflection.
      //    N is the surface normal rebuilt from the height gradient. The reflection term uses a mildly oblique eye vector:
      //    from a true nadir view water reflects only ~2%, which would hide the sky entirely, so the game camera is treated
      //    as pitched ~50 deg for this term only. Reflectance then depends on how each facet is tilted, not on a constant.
      vec3 waterN = normalize(vec3(-waveN, 1.0));
      float sunE = clamp(uSunElev, 0.05, 1.0);
      const vec3 VIEW_REFL = vec3(0.0, -0.77, 0.64);
      float cosV = clamp(dot(waterN, VIEW_REFL), 0.0, 1.0);
      float fresnel = 0.02 + 0.98 * pow(1.0 - cosV, 5.0);
      vec3 skyRefl = waterSkyRadiance(reflect(-VIEW_REFL, waterN), worldPos, sunE);
      float skyAmt = clamp(fresnel * 1.7, 0.0, 0.30);
      c = mix(c, skyRefl, waterMask * skyAmt);

      // 3. Sun / moon glitter: Blinn-Phong around the half vector between the 3D light direction and the eye vector.
      //    A facet sparkles only when its tilt matches the half vector, so glints follow sun height (rough lobe at dawn/dusk,
      //    tight at noon) and vanish under rain / overcast instead of shimmering at a fixed strength. The eye is tilted
      //    slightly away from the sun (like a real perspective view across the glitter path); a strict nadir eye would
      //    hide almost all glints when the sun is low.
      vec2 sunXY = length(uSun) > 1e-3 ? normalize(uSun) : vec2(0.0, 1.0);
      vec3 lightDir = normalize(vec3(sunXY * sqrt(max(0.0, 1.0 - sunE * sunE)), sunE));
      vec3 eyeGlint = normalize(vec3(-sunXY * 0.42, 1.0));
      vec3 halfV = normalize(lightDir + eyeGlint);
      float nDotH = max(dot(waterN, halfV), 0.0);
      float glintBroad = pow(nDotH, mix(16.0, 42.0, sunE)) * 0.14;
      float glintSharp = pow(nDotH, mix(90.0, 260.0, sunE)) * 0.60;
      float clearSky = 1.0 - 0.85 * uRain;
      c += sunGlintCol * waterMask * (glintBroad + glintSharp) * clearSky;

      // 4. Porous Cellular Aerated Whitewater Foam
      if (wakeFoam > 0.005) {
        float localLit = max(uDay * (0.76 + 0.24 * clamp(sunDot, -0.4, 1.0)), (uLightOn > 0.5) ? (lampHere * 0.88 + 0.14) : 0.18);
        vec3 foamCol = mix(vec3(0.74, 0.87, 0.95), vec3(0.97, 0.99, 1.0), uDay) * localLit;
        c = mix(c, foamCol, clamp(waterMask * wakeFoam, 0.0, 0.92));
      }

      // 5. Dynamic lightmap & bloom reflections on water
      vec2 reflUv = clamp(uv + waveN * 0.015, vec2(0.001), vec2(0.999));
      vec3 reflBloom = texture(uBloom, reflUv).rgb + texture(uBloomWide, reflUv).rgb * 0.85;
      float waveFacetHighlight = 0.65 + 0.75 * clamp(dot(waveN, vec2(0.707, -0.707)), -0.6, 1.0);
      c += reflBloom * waterMask * waveFacetHighlight * mix(1.55, 0.65, uDay);

      if (uLightOn > 0.5) {
        float litPerturbed = 1.0 - texture(uLight, clamp(uv + waveN * 0.018, vec2(0.001), vec2(0.999))).a;
        float specRipple = max(0.0, litPerturbed - lampHere * 0.65) + litPerturbed * pow(max(0.0, waveSlopeMag * 0.75), 2.0);
        vec3 artificialSpecCol = mix(vec3(1.0, 0.93, 0.78), reflBloom * 1.6 + vec3(0.45, 0.55, 0.70), 0.55);
        c += artificialSpecCol * waterMask * specRipple * (0.28 + 0.55 * (1.0 - uDay));
      }
    }
  }

  // ============================================================================
  // SHADER 2: WATER PUDDLES & SPILLED WATER (MAT_PUDDLE_WATER)
  // ============================================================================
  else if (isPuddleWater) {
    float pAlpha = clamp(matAlpha * 1.15, 0.0, 1.0);
    // Outer porous wet darkening meniscus ring (water soaked into asphalt/soil pores around the puddle)
    float soakRing = smoothstep(0.02, 0.22, matParam) * (1.0 - smoothstep(0.24, 0.48, matParam));
    c *= 1.0 - 0.28 * soakRing * pAlpha;

    if (uFreezing > 0.5) {
      // Frozen road puddle (Наледь / Тонкий лёд на асфальте)
      vec3 iceG = noise2DAndGrad(worldPos * 0.45);
      vec2 iceN = worldDirToScreenUv(iceG.yz) * 0.35 + meniscusN * 0.85;
      float iceSpec = pow(clamp(dot(normalize(iceN + uSun * 0.45), uSun), 0.0, 1.0), 20.0) * 0.42;
      vec3 reflB = texture(uBloomWide, clamp(uv + iceN * 0.008, vec2(0.001), vec2(0.999))).rgb;
      c = mix(c, skyCol * 1.12, 0.22 * pAlpha * smoothstep(0.12, 0.35, matParam));
      c += (sunGlintCol * iceSpec + reflB * 0.95) * pAlpha;
    } else if (puddleBasinMask > 0.01) {
      // Standing puddle water basin: planar sky mirror + capillary/rain ripples + headlight/lamp reflections
      float slopeMag = length(waveN);
      float sunDot = dot(waveN, uSun);
      // Darker wet substrate beneath shallow puddle water
      c *= 1.0 - 0.18 * puddleBasinMask;

      // Planar Fresnel sky reflection (stronger on flat puddle mirror, perturbed by ripples)
      float puddleFresnel = clamp(0.18 + 0.14 * smoothstep(0.25, 0.85, matParam) + 0.08 * sunDot, 0.0, 0.38);
      c = mix(c, skyCol, puddleBasinMask * puddleFresnel);

      // Sharp solar / lunar glint on puddle ripples & meniscus rim
      float sunAlign = dot(normalize(waveN + uSun * 0.38), uSun);
      float pGlint = pow(clamp(sunAlign, 0.0, 1.0), 22.0) * smoothstep(0.04, 0.32, slopeMag) * 0.48;
      c += sunGlintCol * puddleBasinMask * pGlint;

      // Mirror reflection of headlights, taillights, neon, and streetlamps in the puddle
      vec2 pReflUv = clamp(uv + waveN * 0.012, vec2(0.001), vec2(0.999));
      vec3 pBloom = texture(uBloom, pReflUv).rgb + texture(uBloomWide, pReflUv).rgb * 1.15;
      c += pBloom * puddleBasinMask * mix(1.85, 0.80, uDay);

      if (uLightOn > 0.5) {
        float litP = 1.0 - texture(uLight, clamp(uv + waveN * 0.014, vec2(0.001), vec2(0.999))).a;
        float rippleSpec = max(0.0, litP - lampHere * 0.55) + litP * smoothstep(0.05, 0.45, slopeMag) * 0.45;
        c += mix(vec3(1.0, 0.94, 0.80), pBloom * 1.5 + vec3(0.55, 0.68, 0.85), 0.5) * puddleBasinMask * rippleSpec * (0.35 + 0.65 * (1.0 - uDay));
      }
    }
  }

  // ============================================================================
  // SHADER 3: GASOLINE & DIESEL SPILLS (MAT_FUEL — Thin-Film Rainbow Interference)
  // ============================================================================
  else if (isFuel) {
    float fAlpha = clamp(matAlpha * 1.25, 0.0, 1.0);
    // 1. Hydrocarbon wetting of porous asphalt/soil substrate
    c *= 1.0 - 0.26 * fAlpha;

    // 2. Swirling multi-octave sub-micron film thickness map d(x,y,t)
    float windSpd = length(uWind);
    vec2 wDir = windSpd > 0.2 ? (uWind / windSpd) : vec2(0.94, 0.34);
    vec3 filmN1 = noise2DAndGrad(worldPos * 0.13 - wDir * (uWindPhase * 0.22));
    vec3 filmN2 = noise2DAndGrad(worldPos * 0.31 + vec2(14.2, -8.7) + filmN1.yz * 0.45);
    float opticalThickness = matParam * 2.35 + filmN1.x * 0.85 + filmN2.x * 0.45;

    // 3. Exact Newton Thin-Film Interference for R (650nm), G (532nm), B (460nm) with n_fuel = 1.44
    // Phase = 4 * pi * n * d / lambda
    vec3 phase = opticalThickness * vec3(6.28318 * 1.00, 6.28318 * 1.22, 6.28318 * 1.42) + vec3(0.0, 0.55, 1.15);
    vec3 iridescence = 0.5 + 0.5 * cos(phase);
    // Interference fringes are most vivid in the sub-micron mid/outer film and slightly desaturated at the thick core
    float fringeEnvelope = smoothstep(0.04, 0.22, matParam) * (1.0 - 0.38 * smoothstep(0.72, 0.98, matParam));
    float lightMod = max(0.28 + 0.72 * uDay, lampHere * 0.95);

    // Blend physical rainbow interference sheen over the dark wetted substrate
    vec3 fuelSheen = mix(vec3(luma(iridescence)), iridescence, 0.82) * lightMod;
    c = mix(c, c * 0.65 + fuelSheen * 0.42, fAlpha * fringeEnvelope * 0.78);

    // 4. High-IOR dielectric specular reflection (n = 1.44) & volatile meniscus highlight
    vec2 fuelNormal = meniscusN * 0.95 + worldDirToScreenUv(filmN1.yz * 0.25 + filmN2.yz * 0.20) + waveN * 0.5;
    float sunAlign = dot(normalize(fuelNormal + uSun * 0.35), uSun);
    float fuelGlint = pow(clamp(sunAlign, 0.0, 1.0), 18.0) * 0.46;
    vec2 fReflUv = clamp(uv + fuelNormal * 0.010, vec2(0.001), vec2(0.999));
    vec3 fBloom = texture(uBloom, fReflUv).rgb + texture(uBloomWide, fReflUv).rgb;
    c = mix(c, skyCol * (0.75 + 0.45 * iridescence), fAlpha * 0.18);
    c += (sunGlintCol * iridescence * fuelGlint + fBloom * (0.7 + 0.6 * iridescence) * mix(1.6, 0.7, uDay)) * fAlpha;
  }

  // ============================================================================
  // SHADER 4: MOTOR OIL & LUBRICANT SPILLS (MAT_OIL — Viscous Dark Mirror & 3D Meniscus)
  // ============================================================================
  else if (isOil) {
    float oAlpha = clamp(matAlpha * 1.25, 0.0, 1.0);
    // 1. Beer-Lambert optical absorption in dense petroleum hydrocarbon (transmits warm bronze-amber only at thin rim)
    vec3 oilTrans = exp(-vec3(3.6, 4.9, 6.8) * (matParam * 1.45));
    vec3 darkOilCore = vec3(0.016, 0.018, 0.024) * max(0.25, uDay * 0.85 + lampHere * 0.65);
    vec3 bronzeEdge = vec3(0.22, 0.14, 0.06) * max(0.25, uDay + lampHere * 0.8);
    float coreWeight = smoothstep(0.08, 0.45, matParam);
    vec3 oilBody = mix(c * oilTrans + bronzeEdge * (1.0 - coreWeight) * 0.35, darkOilCore, coreWeight * 0.90);
    c = mix(c, oilBody, oAlpha);

    // 2. Steep 3D surface-tension contact meniscus & glass-smooth interior reflection (n = 1.48, F0 = 0.038)
    float menMag = length(meniscusN);
    vec2 oilN = meniscusN * 1.75 + waveN * 0.25;
    float sunDot = dot(normalize(oilN + uSun * 0.28), uSun);
    float oilFresnel = clamp(0.16 + 0.26 * smoothstep(0.02, 0.35, menMag) + 0.10 * clamp(sunDot, 0.0, 1.0), 0.0, 0.48);
    c = mix(c, skyCol * 0.92, oAlpha * oilFresnel * smoothstep(0.06, 0.25, matParam));

    // 3. Razor-sharp liquid mirror rim highlight on the 3D oil meniscus + headlight/lamp reflection
    float rimSpec = pow(clamp(sunDot, 0.0, 1.0), 28.0) * (0.25 + 1.35 * smoothstep(0.02, 0.28, menMag));
    vec2 oReflUv = clamp(uv + oilN * 0.012, vec2(0.001), vec2(0.999));
    vec3 oBloom = texture(uBloom, oReflUv).rgb + texture(uBloomWide, oReflUv).rgb * 1.2;
    float lampRim = (uLightOn > 0.5) ? lampHere * smoothstep(0.03, 0.28, menMag) * 0.55 : 0.0;
    c += (sunGlintCol * rimSpec * 0.72 + vec3(1.0, 0.92, 0.76) * lampRim + oBloom * mix(2.1, 0.95, uDay)) * oAlpha;
  }

  // ============================================================================
  // SHADER 5: ANTIFREEZE / COOLANT SPILLS (MAT_COOLANT — Syrupy Fluorescent Glycol)
  // ============================================================================
  else if (isCoolant) {
    float cAlpha = clamp(matAlpha * 1.20, 0.0, 1.0);
    // 1. Wet substrate darkening around perimeter
    c *= 1.0 - 0.20 * cAlpha;

    // 2. Internal fluorescent ethylene-glycol dye subsurface scattering & luminescence
    // Glows with rich emerald-chartreuse radiance when illuminated by sunlight, streetlamps, or vehicle headlights
    vec3 cBloomHere = texture(uBloomWide, uv).rgb;
    float incidentLight = clamp(uDay * 0.92 + lampHere * 0.85 + luma(cBloomHere) * 1.65, 0.18, 1.45);
    float poolDepth = smoothstep(0.06, 0.68, matParam);
    vec3 glycolDeep = vec3(0.04, 0.52, 0.28);
    vec3 glycolFluoro = vec3(0.14, 0.94, 0.46);
    vec3 coolantVol = mix(glycolDeep, glycolFluoro, 0.45 + 0.55 * poolDepth) * incidentLight;
    c = mix(c, mix(c * vec3(0.45, 0.95, 0.65), coolantVol, 0.62), cAlpha * smoothstep(0.04, 0.35, matParam));

    // 3. Syrupy 3D meniscus rim & wet dielectric mirror gloss (n = 1.43)
    float menMag = length(meniscusN);
    vec2 coolN = meniscusN * 1.35 + waveN;
    float sunAlign = dot(normalize(coolN + uSun * 0.32), uSun);
    float coolSpec = pow(clamp(sunAlign, 0.0, 1.0), 24.0) * (0.30 + 1.10 * smoothstep(0.02, 0.26, menMag));
    vec2 cReflUv = clamp(uv + coolN * 0.011, vec2(0.001), vec2(0.999));
    vec3 cReflBloom = texture(uBloom, cReflUv).rgb + texture(uBloomWide, cReflUv).rgb;
    c = mix(c, skyCol, cAlpha * 0.16 * smoothstep(0.12, 0.40, matParam));
    c += (sunGlintCol * coolSpec * 0.65 + cReflBloom * mix(1.65, 0.75, uDay)) * cAlpha;
  }

  // ============================================================================
  // ============================================================================
  // SHADER 6: ASPHALT, CONCRETE, MINERAL AGGREGATE & VULCANIZED RUBBER SKIDMARKS
  // ============================================================================
  else if (isRoad) {
    float rutMask = max(smoothstep(0.60, 0.88, matParam), roadSkidMask * 0.85); // Tire-polished wheel tracks + rubber skids
    float isConcrete = (matId == 3) ? 1.0 : 0.0;
    float isBitumenPatch = (matId == 4) ? (1.0 - smoothstep(0.12, 0.24, matParam)) : 0.0;

    // 0. DRY MINERAL AGGREGATE SPARKLE & BITUMEN REPAIR PATCHES
    if (uSnow < 0.65) {
      // Crushed granite/quartz/basalt aggregate micro-facets catch sunlight & vehicle headlights on dry/damp pavement
      vec3 roadBloomHere = texture(uBloomWide, uv).rgb;
      vec2 agCell = floor(worldPos * (isConcrete > 0.5 ? 3.4 : 2.6));
      float agHash = hash(agCell + floor((uCamPos + uSun * 90.0) * 0.03));
      float mineralSparkle = smoothstep(0.972, 0.997, agHash)
        * (1.0 - isBitumenPatch * 0.8)
        * (1.0 - roadSkidMask * 0.75)
        * (0.28 * uDay + 0.45 * lampHere + luma(roadBloomHere) * 0.95);
      c += mix(sunGlintCol, vec3(0.90, 0.94, 1.0), 0.35) * mineralSparkle * (isConcrete > 0.5 ? 0.24 : 0.32);

      // Fresh dark tar/bitumen repair patches have higher dielectric gloss and slightly warmer pitch absorption
      if (isBitumenPatch > 0.01) {
        float tarSun = pow(clamp(dot(normalize(matMicroN * 6.0 + uSun * 0.35), uSun), 0.0, 1.0), 16.0) * 0.16;
        c *= 1.0 - 0.08 * isBitumenPatch;
        c += (sunGlintCol * tarSun + roadBloomHere * 0.42) * isBitumenPatch;
      }
    }

    // 0B. VULCANIZED RUBBER SKIDMARK & CARRIED TIRE TRACK SHADER
    if (roadSkidMask > 0.01) {
      // Molten/vulcanized polymer fills asphalt pores: anisotropic specular sheen at grazing sun/headlight angles
      vec2 skidReflUv = clamp(uv + matMicroN * 0.12, vec2(0.001), vec2(0.999));
      vec3 skidBloom = texture(uBloom, skidReflUv).rgb * 0.55 + texture(uBloomWide, skidReflUv).rgb * 0.95;
      float rubberSpec = pow(clamp(dot(normalize(matMicroN * 5.0 + uSun * 0.42), uSun), 0.0, 1.0), 18.0) * 0.24;
      vec3 rubberSheenCol = mix(vec3(0.18, 0.22, 0.29), sunGlintCol * 0.65, uDay);
      c = mix(c, c * 0.82, roadSkidMask * 0.45);
      c += (rubberSheenCol * rubberSpec + skidBloom * mix(1.15, 0.45, uDay)) * roadSkidMask;
      if (uLightOn > 0.5) {
        c += vec3(0.95, 0.90, 0.80) * lampHere * 0.14 * roadSkidMask * (1.0 - uDay * 0.6);
      }
    }

    // A. WET ROAD SHADER (Angstrom porous darkening, wheel-rut water film, anisotropic headlight/sky mirror)
    if (uWet > 0.005 && uFreezing < 0.5) {
      vec3 wPatch1 = noise2DAndGrad(worldPos * 0.035);
      vec3 wPatch2 = noise2DAndGrad(worldPos * 0.11 + vec2(23.4, -11.7));
      float puddleFilm = clamp((wPatch1.x * 0.6 + wPatch2.x * 0.4 - 0.32) * 1.45 + rutMask * 0.46, 0.0, 1.0);
      float localWet = uWet * (0.55 + 0.45 * puddleFilm);

      // Porous wet asphalt darkening (water fills micro-cavities, causing internal light trapping)
      c *= 1.0 - 0.25 * localWet * (1.0 - isConcrete * 0.28);

      // Anisotropic specular reflection perturbed by bitumen aggregate micro-normals
      vec2 wetReflUv = clamp(uv + matMicroN * 0.22, vec2(0.001), vec2(0.999));
      vec3 wetBloom = texture(uBloom, wetReflUv).rgb * 0.65 + texture(uBloomWide, wetReflUv).rgb * 1.35;
      float sunSpec = pow(clamp(dot(normalize(matMicroN * 8.0 + uSun * 0.35), uSun), 0.0, 1.0), 14.0) * 0.22;

      float skySheen = localWet * (0.06 + 0.13 * puddleFilm * (0.5 + 0.5 * rutMask));
      c = mix(c, skyCol, skySheen * uDay);
      c += wetBloom * localWet * (1.25 + 0.90 * rutMask) * mix(1.55, 0.55, uDay);
      c += sunGlintCol * sunSpec * localWet * (0.6 + 0.65 * rutMask);

      if (uLightOn > 0.5) {
        float litPert = 1.0 - texture(uLight, clamp(uv + matMicroN * 0.25, vec2(0.001), vec2(0.999))).a;
        float roadLampSpec = max(0.0, litPert - lampHere * 0.72) + lampHere * 0.18 * puddleFilm;
        c += vec3(1.0, 0.93, 0.78) * roadLampSpec * localWet * (0.35 + 0.65 * rutMask) * (0.35 + 0.65 * (1.0 - uDay));
      }
    }

    // B. SNOWY & ICY ROAD SHADER (Compacted snow shoulders, dark slush/glaze-ice wheel ruts, crystal sparkle)
    if (uSnow > 0.01 || uFreezing > 0.5) {
      vec3 snNoise = noise2DAndGrad(worldPos * 0.08 + vec2(7.1, -19.3));
      float snowCoverMask = clamp(uSnow * (1.0 - rutMask * 0.72 + (snNoise.x - 0.45) * 0.45), 0.0, 1.0);
      float glazeIceMask = clamp((uFreezing * 0.65 + uSnow * 0.55) * (0.35 + 0.65 * rutMask), 0.0, 1.0);

      // Glaze ice (гололёд / накатанная ледяная колея) specular sheen in wheel tracks
      vec2 iceReflUv = clamp(uv + matMicroN * 0.18, vec2(0.001), vec2(0.999));
      vec3 iceBloom = texture(uBloomWide, iceReflUv).rgb;
      float iceSunGlint = pow(clamp(dot(normalize(matMicroN * 6.0 + uSun * 0.4), uSun), 0.0, 1.0), 16.0) * 0.24;
      c += (iceBloom * 0.95 + sunGlintCol * iceSunGlint) * glazeIceMask;

      // Micro-crystalline diamond snow glints on snow-covered road shoulders & lanes
      if (snowCoverMask > 0.05) {
        vec2 crystalCell = floor(worldPos * 2.8);
        float cHash = hash(crystalCell + floor((uCamPos + uSun * 120.0) * 0.04));
        float sparkle = smoothstep(0.968, 0.996, cHash) * snowCoverMask * (0.55 * uDay + 0.75 * lampHere + luma(iceBloom) * 1.4);
        c += vec3(0.92, 0.97, 1.0) * sparkle * 0.65;
      }
    }
  }

  // ============================================================================
  // SHADER 7: BIOME EARTH, PLOWED CHERNOZEM, SAND, GRAVEL, WINDY MEADOWS & 3D OFFROAD RUTS
  // ============================================================================
  else if (isEarthOrDirt) {
    float isDirtTrackOrBank = (matId == 2) ? 1.0 : 0.0;
    float isGravelSurface = (matId == 2 && matParam < 0.42) ? 1.0 : 0.0;
    float bankMoisture = (matId == 2) ? clamp((matParam - 0.5) * 2.0, 0.0, 1.0) : 0.0;
    float isPlowedChernozem = (matId == 1 && matParam < 0.25) ? 1.0 : 0.0;
    float isSandOrSalt = (matId == 1 && matParam >= 0.25 && matParam < 0.42) ? 1.0 : 0.0;
    float isMeadowOrCrop = (matId == 1 && matParam >= 0.42 && matParam <= 0.78) ? 1.0 : 0.0;
    float isForestFloor = (matId == 1 && matParam > 0.78) ? 1.0 : 0.0;

    // 0A. SILICA SAND & SALT FLATS QUARTZ SCINTILLATION + WIND RIPPLE SHADING
    if (isSandOrSalt > 0.5 && uSnow < 0.5) {
      vec3 sandBloom = texture(uBloomWide, uv).rgb;
      vec2 quartzCell = floor(worldPos * 3.2);
      float qHash = hash(quartzCell + floor((uCamPos + uSun * 110.0) * 0.035));
      float quartzGlint = smoothstep(0.966, 0.996, qHash) * (0.55 * uDay + 0.65 * lampHere + luma(sandBloom) * 1.3);
      float duneLit = clamp(-dot(matMicroN * 14.0, uSun), -0.35, 0.35);
      c *= 1.0 + duneLit * 0.22 * uDay;
      c += mix(vec3(1.0, 0.93, 0.76), sunGlintCol, 0.5) * quartzGlint * 0.52;
    }

    // 0B. PLOWED CHERNOZEM FURROW RELIEF & HUMUS VELVET ABSORPTION
    if (isPlowedChernozem > 0.5 && uSnow < 0.5) {
      float furrowCrest = sin(worldPos.y * 0.78);
      float furrowSun = clamp(-dot(matMicroN * 12.0, uSun), -0.4, 0.4);
      // Deep furrow troughs trap ambient light; overturned moist clod crests catch warm solar rim
      c *= 0.92 + 0.08 * furrowCrest + furrowSun * 0.24 * uDay;
    }

    // 0C. CRUSHED GRAVEL MINERAL FACET GLINTS
    if (isGravelSurface > 0.5 && uSnow < 0.5) {
      vec2 gravCell = floor(worldPos * 2.4);
      float gHash = hash(gravCell + floor(uCamPos * 0.025));
      float stoneFacet = (gHash - 0.5) * 0.09;
      c *= 1.0 + stoneFacet * (1.0 - uWet * 0.5);
    }

    // 0D. MEADOW, STEPPE & CROP CANOPY ANISOTROPIC WIND-GUST WAVES
    if (isMeadowOrCrop > 0.5 && uSnow < 0.6 && offroadRutMask < 0.35) {
      float wSpd = length(uWind);
      vec2 wDir = wSpd > 0.1 ? (uWind / wSpd) : vec2(0.92, 0.39);
      vec2 wPerp = vec2(-wDir.y, wDir.x);
      // Travelling wave fronts across grass & crop fields driven by uWindPhase and uWindGust
      vec3 gustN1 = noise2DAndGrad(worldPos * 0.028 - wDir * (uWindPhase * 0.32) + wPerp * (worldPos.x * 0.008));
      vec3 gustN2 = noise2DAndGrad(worldPos * 0.085 - wDir * (uWindPhase * 0.58) + vec2(13.7, -9.2));
      float waveCrest = smoothstep(0.36, 0.78, gustN1.x * 0.62 + gustN2.x * 0.38);
      float gustStrength = clamp((wSpd / 55.0) * (0.65 + 0.35 * uWindGust), 0.08, 1.0);
      // Bent grass/wheat blades expose their glossy underside to the sun & sky
      vec3 bladeSheen = mix(vec3(0.12, 0.18, 0.09), sunGlintCol * vec3(0.88, 0.96, 0.72), uDay);
      c += bladeSheen * waveCrest * gustStrength * 0.085 * (0.35 + 0.65 * uDay);
      c *= 1.0 - (1.0 - waveCrest) * gustStrength * 0.045;
    }

    // 0E. FOREST HUMUS & MOSS FLOOR
    if (isForestFloor > 0.5 && uSnow < 0.5) {
      c *= 0.95;
    }

    // 0F. 3D OFFROAD TIRE RUT SHADER (Sunken Trench Walls, Lateral Soil Berms & Wet Rut Mirror)
    if (offroadRutMask > 0.01) {
      float rL = clamp((texture(uMat, uv + vec2(-texel.x * 2.0, 0.0)).b - 0.52) * 2.15, 0.0, 1.0);
      float rR = clamp((texture(uMat, uv + vec2( texel.x * 2.0, 0.0)).b - 0.52) * 2.15, 0.0, 1.0);
      float rD = clamp((texture(uMat, uv + vec2(0.0, -texel.y * 2.0)).b - 0.52) * 2.15, 0.0, 1.0);
      float rU = clamp((texture(uMat, uv + vec2(0.0,  texel.y * 2.0)).b - 0.52) * 2.15, 0.0, 1.0);
      vec2 rutGrad = vec2(rR - rL, rU - rD);
      float wallSlope = length(rutGrad);
      // Directional self-shadowing & sunlit rim on the 3D rut walls
      float rutSunLit = clamp(dot(rutGrad, uSun) * 2.8, -0.38, 0.42);
      c *= 1.0 - offroadRutMask * 0.18 + rutSunLit * (0.35 + 0.65 * uDay);

      // Wet or compacted clay/mud at the bottom of the tire rut reflects sky, sun & vehicle headlights
      float rutWetness = clamp(uWet * 1.25 + bankMoisture * 0.8 + offroadRutMask * 0.45, 0.0, 1.0);
      vec2 rutReflUv = clamp(uv + (rutGrad * 0.012 + matMicroN * 0.18), vec2(0.001), vec2(0.999));
      vec3 rutBloom = texture(uBloomWide, rutReflUv).rgb;
      float rutGlint = pow(clamp(dot(normalize(rutGrad + matMicroN * 6.0 + uSun * 0.35), uSun), 0.0, 1.0), 16.0) * 0.28;
      c = mix(c, skyCol * 0.82, offroadRutMask * rutWetness * 0.14 * uDay);
      c += (sunGlintCol * rutGlint + rutBloom * mix(1.35, 0.55, uDay) + vec3(0.95, 0.88, 0.74) * lampHere * 0.18 * wallSlope) * offroadRutMask * rutWetness;
    }

    // A. WET EARTH & SLICK MUD SHADER
    float effMudWet = max(uWet, bankMoisture * 0.65);
    if (effMudWet > 0.01 && uFreezing < 0.5) {
      vec3 mudNoise = noise2DAndGrad(worldPos * 0.09 + vec2(-15.2, 9.4));
      float mudPatch = clamp(effMudWet * (0.45 + 0.55 * max(isDirtTrackOrBank, isPlowedChernozem) + 0.40 * (mudNoise.x - 0.4)), 0.0, 1.0);

      // Waterlogged chernozem / loam darkening
      c *= 1.0 - 0.22 * mudPatch;

      // Glossy wet mud clod highlights & sky/headlight sheen
      float mudSun = pow(clamp(dot(normalize(matMicroN * 9.0 + uSun * 0.35), uSun), 0.0, 1.0), 12.0) * 0.26;
      vec3 mudBloom = texture(uBloomWide, clamp(uv + matMicroN * 0.20, vec2(0.001), vec2(0.999))).rgb;
      c = mix(c, skyCol * 0.85, mudPatch * 0.09 * (0.4 + 0.6 * max(isDirtTrackOrBank, isPlowedChernozem)) * uDay);
      c += (sunGlintCol * mudSun + mudBloom * 1.10 * mix(1.4, 0.5, uDay)) * mudPatch * (0.45 + 0.55 * max(isDirtTrackOrBank, isPlowedChernozem));
    }

    // B. SNOWY EARTH & WINTER SNOWDRIFT SHADER (Искрящийся снег и сугробы)
    if (uSnow > 0.01) {
      // Cold azure-blue ambient scattering in snowdrift shadow troughs + warm sunlit crests
      float driftSlope = clamp(-dot(matMicroN * 10.0, uSun), -0.5, 0.5);
      vec3 snowShadowTint = vec3(-0.03, 0.00, 0.05) * max(0.0, -driftSlope) * uSnow * uDay;
      vec3 snowCrestTint = sunGlintCol * 0.06 * max(0.0, driftSlope) * uSnow * uDay;
      c += snowShadowTint + snowCrestTint;

      // Crystalline snow-crust scintillation (тысячи искрящихся снежинок на солнце и в свете фар)
      vec3 snowBloom = texture(uBloomWide, uv).rgb;
      vec2 snowCell = floor(worldPos * 3.1);
      float sHash = hash(snowCell + floor((uCamPos + uSun * 150.0) * 0.035));
      float snowSparkle = smoothstep(0.964, 0.995, sHash) * uSnow * (0.65 * uDay + 0.85 * lampHere + luma(snowBloom) * 1.8);
      c += vec3(0.94, 0.98, 1.0) * snowSparkle * 0.72;
    }
  }

  // --- clarity: local contrast, stronger on the dark side so gaps between objects gain depth -----------------
  if (uClarity > 0.001) {
    vec3 blur = texture(uBlur, uv).rgb;
    vec3 detail = clamp(c - blur, -0.22, 0.22);
    vec3 k = mix(vec3(1.0), vec3(1.3), step(detail, vec3(0.0)));
    c += detail * k * uClarity;
  }

  // --- bounce light: nearby bright lights tint the surfaces they fall on (scaled by the surface colour) ----------
  vec3 wide = texture(uBloomWide, uv).rgb;
  if (uGi > 0.001) {
    c += wide * (c * 0.85 + 0.08) * uGi * mix(1.4, 0.45, uDay);
  }

  // --- lights glowing in fog / rain / snow ------------------------------------------------------------------
  if (uLightOn > 0.5 && uFogGlow > 0.001) {
    vec2 r1 = vec2(20.0) / uLightSize;
    vec2 r2 = vec2(46.0) / uLightSize;
    float gl = (1.0 - texture(uLight, uv).a) * 0.25;
    gl += (1.0 - texture(uLight, uv + vec2( r1.x, 0.0)).a + 1.0 - texture(uLight, uv + vec2(-r1.x, 0.0)).a
         + 1.0 - texture(uLight, uv + vec2(0.0,  r1.y)).a + 1.0 - texture(uLight, uv + vec2(0.0, -r1.y)).a) * 0.125;
    gl += (1.0 - texture(uLight, uv + vec2( r2.x,  r2.y)).a + 1.0 - texture(uLight, uv + vec2(-r2.x,  r2.y)).a
         + 1.0 - texture(uLight, uv + vec2( r2.x, -r2.y)).a + 1.0 - texture(uLight, uv + vec2(-r2.x, -r2.y)).a) * 0.0625;
    c += vec3(1.0, 0.92, 0.76) * smoothstep(0.25, 0.95, gl) * uFogGlow * (0.25 + 0.75 * (1.0 - uDay)) * 0.5;
  }

  // --- bloom ------------------------------------------------------------------------------------------------
  vec3 bloom = texture(uBloom, uv).rgb;
  c += bloom * uBloomStr * mix(1.0, 1.35, 1.0 - uDay);

  // --- tone curve + grading + user color calibration --------------------------------------------------------
  vec3 graded = c * uExposure;
  float lg = luma(graded);
  float sw = 1.0 - smoothstep(0.0, 0.55, lg);
  float hw = smoothstep(0.35, 1.0, lg);
  graded += uShadowTint * sw + uHighTint * hw;
  graded = (graded - 0.45) * uContrast + 0.45;
  float lg2 = luma(graded);
  graded = mix(vec3(lg2), graded, uSat);
  graded = mix(graded, uHaze.rgb, uHaze.a);
  vec3 toned = sCurve(shoulder(max(graded, 0.0)));
  c = mix(shoulder(max(c, 0.0)), toned, uTone);

  // Apply explicit user Exposure / Contrast / Saturation adjustments
  c *= uUserExposure;
  c = (c - 0.45) * uUserContrast + 0.45;
  float lUser = luma(max(c, 0.0));
  c = clamp(mix(vec3(lUser), c, uUserSat), 0.0, 1.0);

  // --- vignette ---------------------------------------------------------------------------------------------
  float v = smoothstep(0.95, 0.30, sqrt(r2));
  c *= mix(1.0 - uVig, 1.0, v);

  // --- film grain -------------------------------------------------------------------------------------------
  if (uGrain > 0.001) {
    float n = hash(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5;
    c += n * uGrain * 0.07 * (1.0 - luma(c) * 0.6);
  }

  o = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

const FS_FINAL = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uFxaa;

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
  vec3 rgbM = texture(uTex, vUv).rgb;
  if (uFxaa < 0.5) { o = vec4(rgbM, 1.0); return; }
  vec3 rgbNW = texture(uTex, vUv + vec2(-1.0,  1.0) * uTexel).rgb;
  vec3 rgbNE = texture(uTex, vUv + vec2( 1.0,  1.0) * uTexel).rgb;
  vec3 rgbSW = texture(uTex, vUv + vec2(-1.0, -1.0) * uTexel).rgb;
  vec3 rgbSE = texture(uTex, vUv + vec2( 1.0, -1.0) * uTexel).rgb;
  float lM = luma(rgbM), lNW = luma(rgbNW), lNE = luma(rgbNE), lSW = luma(rgbSW), lSE = luma(rgbSE);
  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
  float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  vec2 dir;
  dir.x = -((lNW + lNE) - (lSW + lSE));
  dir.y =  ((lNW + lSW) - (lNE + lSE));
  float dirReduce = max((lNW + lNE + lSW + lSE) * 0.25 * (1.0 / 8.0), 1.0 / 128.0);
  float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
  dir = clamp(dir * rcpDirMin, vec2(-8.0), vec2(8.0)) * uTexel;
  vec3 rgbA = 0.5 * (texture(uTex, vUv + dir * (1.0 / 3.0 - 0.5)).rgb + texture(uTex, vUv + dir * (2.0 / 3.0 - 0.5)).rgb);
  vec3 rgbB = rgbA * 0.5 + 0.25 * (texture(uTex, vUv + dir * -0.5).rgb + texture(uTex, vUv + dir * 0.5).rgb);
  float lB = luma(rgbB);
  o = vec4((lB < lMin || lB > lMax) ? rgbA : rgbB, 1.0);
}`;

interface Target {
  tex: WebGLTexture;
  fbo: WebGLFramebuffer;
  w: number;
  h: number;
}

interface Program {
  prog: WebGLProgram;
  u: Record<string, WebGLUniformLocation | null>;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

interface GradeState {
  exposure: number;
  contrast: number;
  sat: number;
  shadow: [number, number, number];
  high: [number, number, number];
  haze: [number, number, number, number];
  bloomBoost: number;
  day: number;
  wet: number;
  fogGlow: number;
}

export class GpuPostFx {
  public available = false;

  private gl: WebGL2RenderingContext | null = null;
  private source: HTMLCanvasElement;
  private target: HTMLCanvasElement;

  private pDown!: Program;
  private pUp!: Program;
  private pComposite!: Program;
  private pFinal!: Program;
  private vao: WebGLVertexArrayObject | null = null;

  private srcTex: WebGLTexture | null = null;
  private lightTex: WebGLTexture | null = null;
  private matTex: WebGLTexture | null = null;
  private srcW = 0;
  private srcH = 0;
  private scene: Target | null = null;
  private bloomChain: Target[] = [];
  private blurA: Target | null = null;
  private blurB: Target | null = null;
  private hdrFormat = false;
  private outW = 0;
  private outH = 0;

  private grade: GradeState = {
    exposure: 1, contrast: 1, sat: 1, shadow: [0, 0, 0], high: [0, 0, 0], haze: [0.5, 0.5, 0.55, 0], bloomBoost: 1, day: 1, wet: 0, fogGlow: 0,
  };
  private graded = false;
  private lost = false;
  private firePosRadBuf = new Float32Array(16 * 4);
  private fireWindBuf = new Float32Array(16 * 2);
  private wakePosRadBuf = new Float32Array(32 * 4);
  private wakeVelParamBuf = new Float32Array(32 * 4);
  private smoothWindVx = 14;
  private smoothWindVy = 4;
  private windPhaseAccum = 0;
  private smoothSnow = 0;
  private smoothRain = 0;

  constructor(source: HTMLCanvasElement, target: HTMLCanvasElement) {
    this.source = source;
    this.target = target;
    try {
      this.init();
    } catch (e) {
      console.warn('GpuPostFx: WebGL2 init failed, falling back to plain 2D canvas', e);
      this.available = false;
    }
  }

  private init() {
    const gl = this.target.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('webgl2 unavailable');
    this.gl = gl;

    this.target.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; this.available = false; });
    this.target.addEventListener('webglcontextrestored', () => {
      this.lost = false;
      try { this.init(); } catch { this.available = false; }
    });

    this.hdrFormat = !!gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');

    this.pDown = this.makeProgram(VS, FS_DOWN, ['uTex', 'uTexel', 'uThreshold', 'uKnee']);
    this.pUp = this.makeProgram(VS, FS_UP, ['uTex', 'uTexel', 'uScale']);
    this.pComposite = this.makeProgram(VS, FS_COMPOSITE, [
      'uSrc', 'uBloom', 'uBlur', 'uBloomWide', 'uLight', 'uLightOn', 'uLightSize',
      'uMat', 'uMatOn', 'uGi', 'uWet', 'uSnow', 'uRain', 'uFogGlow',
      'uSrcSize', 'uOutSize', 'uUpscale', 'uTime', 'uSun', 'uSunElev',
      'uCamPos', 'uCamZoom', 'uCamAngle', 'uFreezing',
      'uRelief', 'uClarity', 'uBloomStr',
      'uSharp', 'uTone', 'uExposure', 'uContrast', 'uSat', 'uShadowTint', 'uHighTint', 'uHaze', 'uVig', 'uGrain', 'uChroma', 'uDay',
      'uFireCount', 'uFirePosRad[0]', 'uFireWind[0]',
      'uWind', 'uWindPhase', 'uWindGust', 'uRiverFlow', 'uWakeCount', 'uWakePosRad[0]', 'uWakeVelParam[0]',
      'uWaterShader', 'uWaterWakes', 'uHeatShimmer', 'uFireLighting',
      'uUserExposure', 'uUserContrast', 'uUserSat',
    ]);
    this.pFinal = this.makeProgram(VS, FS_FINAL, ['uTex', 'uTexel', 'uFxaa']);

    this.vao = gl.createVertexArray();
    this.srcTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    this.setTexParams(true);
    this.lightTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.lightTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    this.setTexParams(true);
    this.matTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.matTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    this.setTexParams(false); // gl.NEAREST so discrete material IDs in R are never blurred across edges!

    this.scene = null;
    this.bloomChain = [];
    this.blurA = null;
    this.blurB = null;
    this.srcW = 0;
    this.srcH = 0;
    this.outW = 0;
    this.outH = 0;
    this.available = true;
  }

  private compile(type: number, src: string): WebGLShader {
    const gl = this.gl!;
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error('shader compile: ' + log);
    }
    return sh;
  }

  private makeProgram(vs: string, fs: string, uniforms: string[]): Program {
    const gl = this.gl!;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, this.compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, this.compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('program link: ' + gl.getProgramInfoLog(prog));
    const u: Record<string, WebGLUniformLocation | null> = {};
    for (const name of uniforms) u[name] = gl.getUniformLocation(prog, name);
    return { prog, u };
  }

  private setTexParams(linear: boolean) {
    const gl = this.gl!;
    const f = linear ? gl.LINEAR : gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private makeTarget(w: number, h: number, hdr: boolean): Target {
    const gl = this.gl!;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (hdr && this.hdrFormat) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    this.setTexParams(true);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fbo, w, h };
  }

  private freeTarget(t: Target | null) {
    if (!t || !this.gl) return;
    this.gl.deleteFramebuffer(t.fbo);
    this.gl.deleteTexture(t.tex);
  }

  private freeTargets() {
    this.freeTarget(this.scene);
    this.bloomChain.forEach((t) => this.freeTarget(t));
    this.freeTarget(this.blurA);
    this.freeTarget(this.blurB);
    this.scene = null;
    this.bloomChain = [];
    this.blurA = null;
    this.blurB = null;
  }

  /** Size the output canvas (device pixels) and rebuild the intermediate targets. */
  public resize(outW: number, outH: number) {
    if (!this.gl || !this.available) return;
    outW = Math.max(2, Math.round(outW));
    outH = Math.max(2, Math.round(outH));
    if (outW === this.outW && outH === this.outH) return;
    this.outW = outW;
    this.outH = outH;
    this.target.width = outW;
    this.target.height = outH;
    this.freeTargets();
    this.scene = this.makeTarget(outW, outH, false);
    let w = outW;
    let h = outH;
    for (let i = 0; i < 5; i++) {
      w = Math.max(2, w >> 1);
      h = Math.max(2, h >> 1);
      this.bloomChain.push(this.makeTarget(w, h, true));
    }
    this.blurA = this.makeTarget(Math.max(2, outW >> 2), Math.max(2, outH >> 2), false);
    this.blurB = this.makeTarget(Math.max(2, outW >> 3), Math.max(2, outH >> 3), false);
  }

  /** Target colour grade for the time of day and weather; eased each frame so changes never pop. */
  private computeGrade(hour: number, weather: string, sunrise: number, sunset: number): GradeState {
    const dayLen = Math.max(1, sunset - sunrise);
    const frac = clamp01((hour - sunrise) / dayLen);
    const sunElev = hour > sunrise && hour < sunset ? Math.sin(Math.PI * frac) : 0;
    const day = smooth(0.0, 0.35, sunElev);

    // warm light near sunrise / sunset, cold blue at night
    const golden = Math.exp(-Math.pow((hour - (sunrise + 0.8)) / 1.2, 2)) + Math.exp(-Math.pow((hour - (sunset - 0.9)) / 1.4, 2));
    const dusk = Math.exp(-Math.pow((hour - (sunset + 0.9)) / 1.1, 2)) + Math.exp(-Math.pow((hour - (sunrise - 0.7)) / 1.0, 2));
    const night = 1 - day;

    const shadow: [number, number, number] = [
      -0.005 * night + 0.003 * golden + 0.005 * dusk,
      -0.001 * night - 0.001 * golden,
      0.012 * night - 0.004 * golden + 0.01 * dusk,
    ];
    const high: [number, number, number] = [
      0.022 * golden + 0.006 * day - 0.005 * night,
      0.01 * golden + 0.003 * day,
      -0.015 * golden - 0.002 * day + 0.006 * night,
    ];
    let exposure = 1.0 + 0.01 * golden;
    let contrast = 1.0;
    let sat = lerp(0.97, 1.02, day) + 0.03 * golden;
    const haze: [number, number, number, number] = [lerp(0.08, 0.72, day), lerp(0.1, 0.76, day), lerp(0.16, 0.8, day), 0];
    let bloomBoost = lerp(1.15, 0.8, day);
    let wet = 0;
    let fogGlow = 0;

    switch (weather) {
      case 'overcast': sat *= 0.90; contrast *= 0.98; haze[3] = 0.03; fogGlow = 0.1; break;
      case 'drizzle': sat *= 0.92; haze[3] = 0.04; bloomBoost *= 1.08; wet = 0.55; fogGlow = 0.3; break;
      case 'rain': sat *= 0.88; exposure *= 0.98; haze[3] = 0.06; bloomBoost *= 1.15; wet = 0.9; fogGlow = 0.45; break;
      case 'storm': sat *= 0.82; exposure *= 0.94; contrast *= 1.0; haze[3] = 0.08; bloomBoost *= 1.2; wet = 1; fogGlow = 0.55; break;
      case 'fog': sat *= 0.78; contrast *= 0.94; haze[3] = 0.18; bloomBoost *= 1.18; fogGlow = 1; break;
      case 'snow': sat *= 0.88; exposure *= 1.02; haze[3] = 0.06; wet = 0.15; fogGlow = 0.35; break;
      case 'blizzard': sat *= 0.76; exposure *= 1.01; haze[3] = 0.14; fogGlow = 0.7; break;
      default: break;
    }
    return { exposure, contrast, sat, shadow, high, haze, bloomBoost, day, wet, fogGlow };
  }

  private easeGrade(target: GradeState, dt: number) {
    const k = this.graded ? 1 - Math.exp(-Math.max(0.001, Math.min(0.25, dt)) * 1.6) : 1;
    this.graded = true;
    const g = this.grade;
    g.exposure = lerp(g.exposure, target.exposure, k);
    g.contrast = lerp(g.contrast, target.contrast, k);
    g.sat = lerp(g.sat, target.sat, k);
    g.bloomBoost = lerp(g.bloomBoost, target.bloomBoost, k);
    g.day = lerp(g.day, target.day, k);
    // surfaces dry out more slowly than they get wet
    g.wet = lerp(g.wet, target.wet, target.wet > g.wet ? k : k * 0.3);
    g.fogGlow = lerp(g.fogGlow, target.fogGlow, k);
    for (let i = 0; i < 3; i++) {
      g.shadow[i] = lerp(g.shadow[i], target.shadow[i], k);
      g.high[i] = lerp(g.high[i], target.high[i], k);
    }
    for (let i = 0; i < 4; i++) g.haze[i] = lerp(g.haze[i], target.haze[i], k);
  }

  private bindTex(unit: number, tex: WebGLTexture | null) {
    const gl = this.gl!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
  }

  private pass(t: Target | null, w: number, h: number) {
    const gl = this.gl!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fbo : null);
    gl.viewport(0, 0, w, h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Run the whole chain for the current content of the source canvas. */
  public render(frame: PostFxFrame, s: PostFxSettings): boolean {
    const gl = this.gl;
    if (!gl || !this.available || this.lost || !this.scene || !this.srcTex) return false;
    const sw = this.source.width;
    const sh = this.source.height;
    if (sw < 2 || sh < 2) return false;

    const sunrise = frame.sunrise ?? 6;
    const sunset = frame.sunset ?? 19;
    this.easeGrade(this.computeGrade(frame.hour, frame.weather, sunrise, sunset), frame.dt);
    const g = this.grade;

    // --- upload the 2D frame ---------------------------------------------------------------------------------
    gl.disable(gl.BLEND);
    gl.bindVertexArray(this.vao);
    this.bindTex(0, this.srcTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    if (sw !== this.srcW || sh !== this.srcH) {
      this.srcW = sw;
      this.srcH = sh;
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, this.source);

    // --- lightmap (darkness layer) ---------------------------------------------------------------------------
    const lm = frame.lightmap && frame.lightmap.width > 1 && frame.lightmap.height > 1 ? frame.lightmap : null;
    if (lm && this.lightTex) {
      this.bindTex(3, this.lightTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, lm);
    }

    // --- material G-buffer (material IDs + fluid thickness) --------------------------------------------------
    const mm = frame.materialMap && frame.materialMap.width > 1 && frame.materialMap.height > 1 ? frame.materialMap : null;
    if (mm && this.matTex) {
      this.bindTex(5, this.matTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, mm);
    }

    // --- bloom chain -----------------------------------------------------------------------------------------
    const bloomOn = s.bloom > 0 || s.gi > 0 || s.wet > 0 || (s.waterShader ?? 85) > 0;
    const bloomRadMult = Math.max(0.5, Math.min(1.6, (s.bloomRadius ?? 100) / 100));
    if (bloomOn) {
      gl.useProgram(this.pDown.prog);
      let prevTex: WebGLTexture = this.srcTex;
      let prevW = sw;
      let prevH = sh;
      for (let i = 0; i < this.bloomChain.length; i++) {
        const t = this.bloomChain[i];
        this.bindTex(0, prevTex);
        gl.uniform1i(this.pDown.u.uTex, 0);
        gl.uniform2f(this.pDown.u.uTexel, bloomRadMult / prevW, bloomRadMult / prevH);
        gl.uniform1f(this.pDown.u.uThreshold, i === 0 ? 0.72 : -1);
        gl.uniform1f(this.pDown.u.uKnee, 0.28);
        this.pass(t, t.w, t.h);
        prevTex = t.tex;
        prevW = t.w;
        prevH = t.h;
      }
      gl.useProgram(this.pUp.prog);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      for (let i = this.bloomChain.length - 1; i > 0; i--) {
        const small = this.bloomChain[i];
        const big = this.bloomChain[i - 1];
        this.bindTex(0, small.tex);
        gl.uniform1i(this.pUp.u.uTex, 0);
        gl.uniform2f(this.pUp.u.uTexel, bloomRadMult / small.w, bloomRadMult / small.h);
        gl.uniform1f(this.pUp.u.uScale, 0.62);
        this.pass(big, big.w, big.h);
      }
      gl.disable(gl.BLEND);
    }

    // --- blurred copy for clarity ----------------------------------------------------------------------------
    const clarityOn = s.clarity > 0 && this.blurA && this.blurB;
    if (clarityOn) {
      gl.useProgram(this.pDown.prog);
      this.bindTex(0, this.srcTex);
      gl.uniform1i(this.pDown.u.uTex, 0);
      gl.uniform2f(this.pDown.u.uTexel, 2 / sw, 2 / sh);
      gl.uniform1f(this.pDown.u.uThreshold, -1);
      this.pass(this.blurA!, this.blurA!.w, this.blurA!.h);
      this.bindTex(0, this.blurA!.tex);
      gl.uniform2f(this.pDown.u.uTexel, 1 / this.blurA!.w, 1 / this.blurA!.h);
      this.pass(this.blurB!, this.blurB!.w, this.blurB!.h);
    }

    // --- composite -------------------------------------------------------------------------------------------
    const c = this.pComposite;
    gl.useProgram(c.prog);
    this.bindTex(0, this.srcTex);
    this.bindTex(1, bloomOn ? this.bloomChain[0].tex : this.srcTex);
    this.bindTex(2, clarityOn ? this.blurB!.tex : this.srcTex);
    this.bindTex(3, this.lightTex);
    this.bindTex(4, bloomOn ? this.bloomChain[2].tex : this.srcTex);
    this.bindTex(5, this.matTex);
    gl.uniform1i(c.u.uSrc, 0);
    gl.uniform1i(c.u.uBloom, 1);
    gl.uniform1i(c.u.uBlur, 2);
    gl.uniform1i(c.u.uLight, 3);
    gl.uniform1i(c.u.uBloomWide, 4);
    gl.uniform1i(c.u.uMat, 5);
    gl.uniform1f(c.u.uLightOn, lm ? 1 : 0);
    gl.uniform2f(c.u.uLightSize, lm ? lm.width : 1, lm ? lm.height : 1);
    gl.uniform1f(c.u.uMatOn, mm ? 1 : 0);
    gl.uniform1f(c.u.uGi, bloomOn ? (s.gi / 100) * 0.55 : 0);

    const effWetWeather = Math.max(g.wet, frame.hasResidualWetness ? 0.35 : 0);
    gl.uniform1f(c.u.uWet, bloomOn ? (s.wet / 100) * effWetWeather : 0);

    const targetSnow = (frame.season === 'winter' ? 0.90 : 0.0)
      + (frame.weather === 'blizzard' ? 1.0 : frame.weather === 'snow' ? 0.75 : 0.0);
    const targetRain = (!frame.isFreezing)
      ? (frame.weather === 'storm' ? 1.0 : frame.weather === 'rain' ? 0.75 : frame.weather === 'drizzle' ? 0.40 : 0.0)
      : 0.0;
    const wLerp = 1 - Math.exp(-Math.max(0.001, Math.min(0.25, frame.dt || 0.016)) * 2.0);
    this.smoothSnow = lerp(this.smoothSnow, Math.min(1.0, targetSnow), wLerp);
    this.smoothRain = lerp(this.smoothRain, Math.min(1.0, targetRain), wLerp);
    gl.uniform1f(c.u.uSnow, this.smoothSnow);
    gl.uniform1f(c.u.uRain, this.smoothRain);

    const fogScatMult = (s.fogScattering ?? 85) / 100;
    gl.uniform1f(c.u.uFogGlow, fogScatMult * g.fogGlow);
    gl.uniform2f(c.u.uSrcSize, sw, sh);
    gl.uniform2f(c.u.uOutSize, this.outW, this.outH);
    const needUpscale = (s.bicubicUpscale !== false) && (sw < this.outW * 0.98 || sh < this.outH * 0.98);
    gl.uniform1f(c.u.uUpscale, needUpscale ? 1 : 0);
    gl.uniform1f(c.u.uTime, frame.timeSec);
    const dprScale = this.target.clientWidth > 0 ? this.outW / this.target.clientWidth : 1;
    gl.uniform2f(c.u.uCamPos, frame.cameraX ?? 0, frame.cameraY ?? 0);
    gl.uniform1f(c.u.uCamZoom, (frame.cameraZoom ?? 1) * dprScale);
    gl.uniform1f(c.u.uCamAngle, frame.cameraAngle);
    gl.uniform1f(c.u.uFreezing, frame.isFreezing ? 1 : 0);
    gl.uniform1f(c.u.uWaterShader, Math.max(0, Math.min(1, (s.waterShader ?? 85) / 100)));
    gl.uniform1f(c.u.uWaterWakes, Math.max(0, Math.min(1, (s.waterWakes ?? 85) / 100)));
    gl.uniform1f(c.u.uHeatShimmer, Math.max(0, Math.min(1.8, (s.heatShimmer ?? 85) / 100)));
    gl.uniform1f(c.u.uFireLighting, Math.max(0, Math.min(1.8, (s.fireLighting ?? 90) / 100)));
    gl.uniform1f(c.u.uUserExposure, Math.max(0.4, Math.min(1.8, (s.exposure ?? 100) / 100)));
    gl.uniform1f(c.u.uUserContrast, Math.max(0.4, Math.min(1.8, (s.contrast ?? 100) / 100)));
    gl.uniform1f(c.u.uUserSat, Math.max(0.0, Math.min(1.8, (s.saturation ?? 100) / 100)));

    // Upload active world-space fire sources (max 16) for thermal heat shimmer & normal-mapped relief lighting
    const fires = frame.fires;
    const fireCount = fires ? Math.min(16, fires.length) : 0;
    gl.uniform1i(c.u.uFireCount, fireCount);
    if (fireCount > 0 && fires) {
      for (let i = 0; i < fireCount; i++) {
        const fSrc = fires[i];
        const b4 = i * 4;
        this.firePosRadBuf[b4] = fSrc.x;
        this.firePosRadBuf[b4 + 1] = fSrc.y;
        this.firePosRadBuf[b4 + 2] = fSrc.radius;
        this.firePosRadBuf[b4 + 3] = fSrc.intensity;
        const b2 = i * 2;
        this.fireWindBuf[b2] = fSrc.windVx;
        this.fireWindBuf[b2 + 1] = fSrc.windVy;
      }
      gl.uniform4fv(c.u['uFirePosRad[0]'], this.firePosRadBuf, 0, fireCount * 4);
      gl.uniform2fv(c.u['uFireWind[0]'], this.fireWindBuf, 0, fireCount * 2);
    }

    // Upload physical wind & river flow vectors and active water wakes (max 32) for direct GPU water wave & foam simulation.
    // Smooth the wind vector with a slow low-pass filter so gusts never rotate or slosh the entire wave coordinate grid,
    // and monotonically integrate windPhaseAccum so waves always propagate forward!
    const rawWindVx = frame.windVx ?? 14;
    const rawWindVy = frame.windVy ?? 4;
    const rawWindSpeed = Math.hypot(rawWindVx, rawWindVy);
    const dtClamped = Math.max(0.001, Math.min(0.1, frame.dt || 0.016));
    const windSmoothAlpha = 1 - Math.exp(-dtClamped * 0.45);
    this.smoothWindVx += (rawWindVx - this.smoothWindVx) * windSmoothAlpha;
    this.smoothWindVy += (rawWindVy - this.smoothWindVy) * windSmoothAlpha;
    const smoothSpeed = Math.max(1.0, Math.hypot(this.smoothWindVx, this.smoothWindVy));
    const gustRatio = Math.max(0.6, Math.min(2.2, rawWindSpeed / smoothSpeed));
    this.windPhaseAccum = (this.windPhaseAccum + dtClamped * (0.42 + rawWindSpeed * 0.032)) % 10000.0;

    gl.uniform2f(c.u.uWind, this.smoothWindVx, this.smoothWindVy);
    gl.uniform1f(c.u.uWindPhase, this.windPhaseAccum);
    gl.uniform1f(c.u.uWindGust, gustRatio);
    gl.uniform2f(c.u.uRiverFlow, frame.riverFlowVx ?? 0, frame.riverFlowVy ?? 0);
    const wakes = frame.wakes;
    const wakeCount = wakes ? Math.min(32, wakes.length) : 0;
    gl.uniform1i(c.u.uWakeCount, wakeCount);
    if (wakeCount > 0 && wakes) {
      for (let i = 0; i < wakeCount; i++) {
        const wSrc = wakes[i];
        const b4 = i * 4;
        this.wakePosRadBuf[b4] = wSrc.x;
        this.wakePosRadBuf[b4 + 1] = wSrc.y;
        this.wakePosRadBuf[b4 + 2] = wSrc.radius;
        this.wakePosRadBuf[b4 + 3] = wSrc.intensity;
        this.wakeVelParamBuf[b4] = wSrc.vx;
        this.wakeVelParamBuf[b4 + 1] = wSrc.vy;
        this.wakeVelParamBuf[b4 + 2] = wSrc.progress;
        this.wakeVelParamBuf[b4 + 3] = wSrc.typeAndFoam;
      }
      gl.uniform4fv(c.u['uWakePosRad[0]'], this.wakePosRadBuf, 0, wakeCount * 4);
      gl.uniform4fv(c.u['uWakeVelParam[0]'], this.wakeVelParamBuf, 0, wakeCount * 4);
    }

    // light comes from the opposite side of the game's shadow direction, rotated into screen space
    const sunState = getCurrentSunShadowState();
    const wx = sunState.sunDirX;
    const wy = sunState.sunDirY;
    const a = -frame.cameraAngle - Math.PI / 2;
    const sx = wx * Math.cos(a) - wy * Math.sin(a);
    const sy = wx * Math.sin(a) + wy * Math.cos(a);
    gl.uniform2f(c.u.uSun, sx, -sy); // UV space has Y pointing up
    gl.uniform1f(c.u.uSunElev, Math.max(0.05, Math.min(1, sunState.sunElevation)));

    const grading = s.grading / 100;
    gl.uniform1f(c.u.uRelief, (s.relief / 100) * 0.8);
    gl.uniform1f(c.u.uClarity, clarityOn ? (s.clarity / 100) * 0.7 : 0);
    gl.uniform1f(c.u.uBloomStr, s.bloom > 0 ? (s.bloom / 100) * 0.6 * g.bloomBoost : 0);
    gl.uniform1f(c.u.uSharp, s.sharpness / 100);
    gl.uniform1f(c.u.uTone, grading);
    gl.uniform1f(c.u.uExposure, g.exposure);
    gl.uniform1f(c.u.uContrast, g.contrast);
    gl.uniform1f(c.u.uSat, g.sat);
    gl.uniform3f(c.u.uShadowTint, g.shadow[0], g.shadow[1], g.shadow[2]);
    gl.uniform3f(c.u.uHighTint, g.high[0], g.high[1], g.high[2]);
    gl.uniform4f(c.u.uHaze, g.haze[0], g.haze[1], g.haze[2], g.haze[3]);
    gl.uniform1f(c.u.uVig, (s.vignette / 100) * 0.55);
    gl.uniform1f(c.u.uGrain, s.grain / 100);
    gl.uniform1f(c.u.uChroma, s.chromatic / 100);
    gl.uniform1f(c.u.uDay, g.day);
    this.pass(this.scene, this.outW, this.outH);

    // --- final (FXAA / copy) ---------------------------------------------------------------------------------
    const f = this.pFinal;
    gl.useProgram(f.prog);
    this.bindTex(0, this.scene.tex);
    gl.uniform1i(f.u.uTex, 0);
    gl.uniform2f(f.u.uTexel, 1 / this.outW, 1 / this.outH);
    gl.uniform1f(f.u.uFxaa, s.antiAlias ? 1 : 0);
    this.pass(null, this.outW, this.outH);
    return true;
  }

  public dispose() {
    this.freeTargets();
    const gl = this.gl;
    if (gl) {
      if (this.srcTex) gl.deleteTexture(this.srcTex);
      if (this.lightTex) gl.deleteTexture(this.lightTex);
      if (this.matTex) gl.deleteTexture(this.matTex);
      if (this.vao) gl.deleteVertexArray(this.vao);
      [this.pDown, this.pUp, this.pComposite, this.pFinal].forEach((p) => p && gl.deleteProgram(p.prog));
    }
    this.available = false;
  }
}
