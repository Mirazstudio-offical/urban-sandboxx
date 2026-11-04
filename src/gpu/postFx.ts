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
  bloom: number;      // 0..100
  grading: number;    // 0..100 colour grading + tone curve strength
  clarity: number;    // 0..100 local contrast / depth in dark gaps
  relief: number;     // 0..100 sun-driven micro relief shading
  sharpness: number;  // 0..100 CAS sharpening
  vignette: number;   // 0..100
  grain: number;      // 0..100
  chromatic: number;  // 0..100 lens colour fringing at the screen edges
  antiAlias: boolean; // FXAA
  gi: number;         // 0..100 bounce light + glow of lights in fog
  wet: number;        // 0..100 wet asphalt sheen in rain
}

import type { PostFxWaterWake } from '../riverSystem';

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
  lightmap?: HTMLCanvasElement | null; // darkness layer (alpha = dark), null when the frame had none
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
uniform float uGi;
uniform float uWet;
uniform float uFogGlow;
uniform vec2 uSrcSize;
uniform vec2 uOutSize;
uniform float uUpscale;     // 1 when the source is smaller than the output
uniform float uTime;
uniform vec2 uSun;          // light direction in screen UV space
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
uniform vec2 uWind;           // xy = ambient world wind velocity (px/s)
uniform vec2 uRiverFlow;      // xy = river current velocity near camera (px/s)
uniform int uWakeCount;
uniform vec4 uWakePosRad[32];   // xy = world pos, z = current radius, w = intensity
uniform vec4 uWakeVelParam[32]; // xy = source velocity (vx, vy), z = progress (0..1), w = typeAndFoam

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

// Physically grounded directional short-crested capillary-gravity wave spectrum + direct GPU hydrodynamic wake solver.
// Eliminates recursive domain-warping "snake/worm" artifacts and strictly aligns wave propagation with actual
// river current (uRiverFlow) and wind vector (uWind), while computing real-time analytical wave slopes and
// porous cellular whitewater foam for up to 32 active vehicle/tire/human/obstacle wakes.
vec2 computeWaterWaveNormal(vec2 worldPos, float time, bool inRiverCorridor, out float outWakeFoam) {
  outWakeFoam = 0.0;

  // 1. Determine physical ambient advection velocity (combines river current in river corridor + wind vector)
  float windSpeed = length(uWind);
  vec2 windDir = windSpeed > 0.2 ? (uWind / windSpeed) : vec2(0.94, 0.34);

  vec2 flowVel = uWind * 0.42;
  if (inRiverCorridor) {
    // Analytical tangent of River Bystritsa (flows East-Northeast) blended with exact camera-local uRiverFlow
    vec2 defaultRiverVel = normalize(vec2(1.0, 0.055 + 0.025 * sin(worldPos.x * 0.0007))) * 32.0;
    vec2 riverVel = length(uRiverFlow) > 1.0 ? uRiverFlow : defaultRiverVel;
    flowVel = riverVel + uWind * 0.22;
  }

  float flowSpeed = length(flowVel);
  vec2 dir0 = flowSpeed > 0.2 ? (flowVel / flowSpeed) : windDir;
  vec2 perp0 = vec2(-dir0.y, dir0.x);

  // Normalized advection speed for wave phase progression (smooth, physical downstream/downwind drift)
  float advSpeed = clamp(flowSpeed * 0.038, 0.35, 2.20);
  float windFactor = clamp(0.55 + windSpeed * 0.022, 0.45, 1.65);

  // 2. Multi-component directional short-crested wave spectrum (zero recursive domain-warp snakes!)
  // Wave Train 1: Primary swell aligned with physical flow/wind direction, elongated across-crest
  vec2 p1 = vec2(dot(worldPos, dir0) * 0.048 - time * advSpeed * 1.15, dot(worldPos, perp0) * 0.022);
  vec3 n1 = noise2DAndGrad(p1);
  vec2 g1 = (dir0 * n1.y * 0.048 + perp0 * n1.z * 0.022) * 18.0;

  // Wave Train 2 & 3: Symmetric bimodal short-crested crossing waves at +21 deg and -21 deg to flow/wind
  // In real hydrodynamics, wind/current waves propagate in a directional spreading cone (+/- 18..25 deg),
  // forming natural diamond/rhomboid short-crested wave facets that move coherently downstream/downwind.
  const float ca1 = 0.93358; // cos(21 deg)
  const float sa1 = 0.35837; // sin(21 deg)
  vec2 dirA = vec2(dir0.x * ca1 - dir0.y * sa1, dir0.x * sa1 + dir0.y * ca1);
  vec2 perpA = vec2(-dirA.y, dirA.x);
  vec2 p2 = vec2(dot(worldPos, dirA) * 0.082 - time * advSpeed * 1.48, dot(worldPos, perpA) * 0.036 + 13.7);
  vec3 n2 = noise2DAndGrad(p2);
  vec2 g2 = (dirA * n2.y * 0.082 + perpA * n2.z * 0.036) * 11.5;

  vec2 dirB = vec2(dir0.x * ca1 + dir0.y * sa1, -dir0.x * sa1 + dir0.y * ca1);
  vec2 perpB = vec2(-dirB.y, dirB.x);
  vec2 p3 = vec2(dot(worldPos, dirB) * 0.086 - time * advSpeed * 1.54, dot(worldPos, perpB) * 0.038 + 29.3);
  vec3 n3 = noise2DAndGrad(p3);
  vec2 g3 = (dirB * n3.y * 0.086 + perpB * n3.z * 0.038) * 11.0;

  // Wave Train 4: High-frequency capillary wind ripples aligned with ambient wind vector uWind
  vec2 windPerp = vec2(-windDir.y, windDir.x);
  vec2 p4 = vec2(dot(worldPos, windDir) * 0.19 - time * (1.35 + windSpeed * 0.035), dot(worldPos, windPerp) * 0.085 + 53.1);
  vec3 n4 = noise2DAndGrad(p4);
  vec2 g4 = (windDir * n4.y * 0.19 + windPerp * n4.z * 0.085) * (4.2 * windFactor);

  vec2 worldGrad = (g1 * 0.42 + (g2 + g3) * 0.34 + g4 * 0.24) * windFactor;

  // 3. Direct GPU Hydrodynamic Wake & Dispersive Ripple Solver (Vehicles, Tires, Swimmers, Bridge Piers)
  if (uWakeCount > 0) {
    vec2 wakeGradAccum = vec2(0.0);
    float foamAccum = 0.0;

    for (int i = 0; i < 32; i++) {
      if (i >= uWakeCount) break;
      vec4 wp = uWakePosRad[i];   // xy = pos, z = radius, w = intensity
      vec4 wv = uWakeVelParam[i]; // xy = source vel, z = progress, w = typeAndFoam

      vec2 rel = worldPos - wp.xy;
      float maxReach = wp.z * 2.15 + 24.0;
      if (abs(rel.x) > maxReach || abs(rel.y) > maxReach) continue;

      float dist = length(rel);
      if (dist > maxReach) continue;

      float intensity = wp.w;
      float progress = wv.z;

      if (wv.w >= 1.0) {
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
        // Ahead of or beside the hull/wheel, forms a curved parabolic bow wave wrapping backward at the flanks
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

    worldGrad += wakeGradAccum;

    // Modulate accumulated wake foam with multi-scale cellular bubble texture advected by water flow
    if (foamAccum > 0.01) {
      vec2 foamUv = worldPos * 0.24 - dir0 * (time * advSpeed * 0.85);
      float cell1 = noise2DAndGrad(foamUv).x;
      float cell2 = noise2DAndGrad(foamUv * 2.35 + vec2(17.1, -9.3) + worldGrad * 0.6).x;
      float bubbleNet = smoothstep(0.22, 0.72, cell1 * 0.6 + cell2 * 0.55);
      outWakeFoam = clamp(foamAccum * (0.45 + 0.75 * bubbleNet), 0.0, 0.92);
    }
  }

  return worldDirToScreenUv(worldGrad);
}

// Reconstruct approximate unshadowed surface color by undoing the midnight-navy shadow overlay (rgb(4,8,22))
// from uLight so that shadowed grass/trees/roads are never misclassified as cyan water.
vec3 recoverUnshadowedColor(vec3 col, vec2 uv) {
  if (uLightOn < 0.5) return col;
  vec4 lm = texture(uLight, uv);
  float lmLum = luma(lm.rgb);
  // Shadow regions in lightmap have dark navy RGB (rgb(4,8,22) -> luma ~0.03) and alpha 0.25..0.75
  float shadowMask = smoothstep(0.18, 0.04, lmLum) * smoothstep(0.08, 0.35, lm.a);
  float shadowAlpha = clamp(lm.a * shadowMask, 0.0, 0.78);
  if (shadowAlpha < 0.02) return col;
  return clamp((col - lm.rgb * shadowAlpha) / max(1.0 - shadowAlpha, 0.20), 0.0, 1.0);
}

// Optical classifier for liquid water pixels (river, salt lakes, ponds, puddles)
// Strictly excludes shadowed grass/foliage (where unshadowed G >= B) and navy shadows / slate asphalt / roofs.
float detectWaterMask(vec3 col, vec3 unshadowedCol, vec2 worldPos) {
  if (uFreezing > 0.5) return 0.0;
  float lum = luma(col);

  // 1. Reject green grass, moss, and pine foliage on both raw AND unshadowed color!
  // When midnight-navy shadow rgb(4,8,22) is blended over green grass, raw B can slightly exceed raw G,
  // but unshadowedCol still has G > B, and even in raw color B barely exceeds G.
  float notGreenRaw = 1.0 - smoothstep(-0.006, 0.012, col.g - col.b);
  float notGreenUnshadowed = 1.0 - smoothstep(-0.008, 0.010, unshadowedCol.g - unshadowedCol.b);
  float notGreenGrass = notGreenRaw * notGreenUnshadowed;
  if (notGreenGrass <= 0.001) return 0.0;

  // 2. Reject midnight-navy shadows (rgb(4,8,22)), slate-grey asphalt (#1e293b), roofs (#334155), and wet mud.
  // In genuine teal-cyan water, BOTH G and B are strongly elevated above R, with B distinctly above G,
  // and G positioned in the upper-middle of the [R, B] interval: (G - R) / (B - R) in [0.60, 0.90].
  // In navy shadows and slate greys, G sits in the lower half of [R, B] ((G - R) / (B - R) < 0.50).
  // In shadowed grass, B and G are nearly equal so (G - R) / (B - R) > 0.92.
  float blueOverRed = unshadowedCol.b - unshadowedCol.r;
  float greenOverRed = unshadowedCol.g - unshadowedCol.r;
  float blueOverGreen = unshadowedCol.b - unshadowedCol.g;
  float greenPosInRB = greenOverRed / max(blueOverRed, 0.004);
  float greenOverRedRatio = unshadowedCol.g / max(unshadowedCol.r, 0.008);

  bool inRiverCorridor = (worldPos.y >= -4250.0 && worldPos.y <= -1750.0 && worldPos.x >= -3500.0 && worldPos.x <= 50500.0);
  bool inSaltLakeZone = (worldPos.y >= 7250.0 && worldPos.y <= 8250.0 && worldPos.x >= 16950.0 && worldPos.x <= 35050.0);

  // Teal spectral window: G must be well above R+0.54*(B-R) (excludes navy shadows/asphalt)
  // AND B must be distinctly above G (excludes shadowed grass/olive foliage)
  float minGreenPos = (inRiverCorridor || inSaltLakeZone) ? 0.56 : 0.62;
  float tealBand = smoothstep(minGreenPos, minGreenPos + 0.10, greenPosInRB)
                 * (1.0 - smoothstep(0.89, 0.96, greenPosInRB));

  float minRatio = (inRiverCorridor || inSaltLakeZone) ? 1.62 : 1.85;
  float minBlueRed = (inRiverCorridor || inSaltLakeZone) ? 0.048 : 0.068;

  float cyanGate = tealBand
                 * smoothstep(minRatio, minRatio + 0.45, greenOverRedRatio)
                 * smoothstep(minBlueRed, minBlueRed + 0.055, blueOverRed)
                 * smoothstep(0.008, 0.026, blueOverGreen);

  float minLum = inRiverCorridor ? 0.026 : 0.038;
  float lumGate = smoothstep(minLum, minLum + 0.035, lum) * (1.0 - smoothstep(0.68, 0.88, lum));

  return clamp(notGreenGrass * cyanGate * lumGate, 0.0, 1.0);
}

void main() {
  vec2 uv = vUv;
  vec2 texel = 1.0 / uSrcSize;
  vec2 worldPos = screenUvToWorld(uv);

  // --- Thermal Heat Shimmer (Top-Down Refractive Index Gradient Distortion around Active Fires) -------------
  if (uFireCount > 0) {
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
      // Top-down radial heat sheath slightly elongated along the horizontal wind/slipstream vector
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
      float heatAmt = min(1.0, totalHeat);
      vec2 advect = (radialAccum * 0.55 + normalize(netWindWorld) * 0.45) * (uTime * 6.5);
      vec3 hNoise1 = noise2DAndGrad(worldPos * 0.14 - advect);
      vec3 hNoise2 = noise2DAndGrad(worldPos * 0.29 - advect * 1.35 + hNoise1.yz * 0.35);
      vec2 shimmerGrad = worldDirToScreenUv(hNoise1.yz * 0.6 + hNoise2.yz * 0.4);
      uv = clamp(uv + shimmerGrad * texel * (2.05 * heatAmt), vec2(0.001), vec2(0.999));
    }
  }

  // --- Initial sample & water optical wave normal / UV refraction -------------------------------------------
  vec3 cRaw = fetchSrc(uv);
  vec3 cUnshadowed = recoverUnshadowedColor(cRaw, uv);
  float waterMask = detectWaterMask(cRaw, cUnshadowed, worldPos);
  vec2 waveN = vec2(0.0);
  float wakeFoam = 0.0;

  if (waterMask > 0.01) {
    bool inRiver = (worldPos.y >= -4250.0 && worldPos.y <= -1750.0 && worldPos.x >= -3500.0 && worldPos.x <= 50500.0);
    waveN = computeWaterWaveNormal(worldPos, uTime, inRiver, wakeFoam);
    // Real-time UV refraction of submerged bed, stones, weeds, and submerged vehicle hulls (amplified across steep wake waves)
    vec2 refrUv = clamp(uv + waveN * texel * 2.45 * waterMask, vec2(0.001), vec2(0.999));
    vec3 cRefr = fetchSrc(refrUv);
    vec3 cRefrUnshadowed = recoverUnshadowedColor(cRefr, refrUv);
    float refrMask = detectWaterMask(cRefr, cRefrUnshadowed, worldPos);
    cRaw = mix(cRaw, cRefr, waterMask * refrMask * 0.82);
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

  // --- micro relief: luminance read as height, lit by the sun, lamps, and real-time flickering fires --------
  if (uRelief > 0.001 || uFireCount > 0) {
    float hl = luma(texture(uSrc, uv + vec2(-texel.x * 1.5, 0.0)).rgb);
    float hr = luma(texture(uSrc, uv + vec2( texel.x * 1.5, 0.0)).rgb);
    float hd = luma(texture(uSrc, uv + vec2(0.0, -texel.y * 1.5)).rgb);
    float hu = luma(texture(uSrc, uv + vec2(0.0,  texel.y * 1.5)).rgb);
    vec2 g = vec2(hr - hl, hu - hd) + waveN * waterMask * 0.14;
    float shade = 1.0 - l0 * 0.55;

    if (uRelief > 0.001) {
      // slopes that rise towards the light face away from it: n.L = -g.L
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
    if (uFireCount > 0) {
      vec3 fireBounceAccum = vec3(0.0);
      float effRelief = max(uRelief, 0.35);
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

          // Micro-slope rim highlights on nearby cars, curbs, walls, and road grain
          float rimBoost = max(0.0, slopeLit) * effRelief * 1.35;
          // Subtle warm diffuse radiance on surrounding surfaces (stronger at dusk/night)
          float diffuseWarm = (0.10 + 0.22 * (1.0 - uDay)) * (0.65 + 0.35 * slopeLit);
          // Wet road / water specular reflection of dancing flames
          float wetSpec = 0.0;
          if (uWet > 0.01 || waterMask > 0.01) {
            float waveFacet = 0.5 + 0.5 * clamp(dot(waveN + g * 2.0, toFireUv), -1.0, 1.0);
            wetSpec = max(uWet * 0.45, waterMask * 0.85) * waveFacet * 0.42;
          }
          fireBounceAccum += fireTint * atten * ((rimBoost + diffuseWarm) * shade + wetSpec);
        }
      }
      c += fireBounceAccum * (c * 0.65 + 0.35);
    }
  }

  // --- Water Surface Shader: Solar/Lunar Glints, Fresnel Sky, Dynamic Reflections & Porous Wake Foam --------
  if (waterMask > 0.01) {
    // 1. Fresnel sky dome reflection modulated by directional wave & wake facets
    float facetTilt = clamp(dot(waveN, uSun) * 0.65 + 0.35, 0.0, 1.0);
    vec3 daySkyCol = mix(vec3(0.45, 0.68, 0.88), vec3(0.95, 0.78, 0.58), clamp(1.0 - uDay * 1.15, 0.0, 1.0));
    vec3 nightSkyCol = vec3(0.05, 0.09, 0.16);
    vec3 skyCol = mix(nightSkyCol, daySkyCol, uDay);
    c = mix(c, skyCol, waterMask * (0.05 + 0.08 * facetTilt));

    // 2. Solar / Lunar micro-facet specular glints on ambient waves and steep Kelvin wake slopes
    float waveSlopeMag = length(waveN);
    float sunAlign = dot(normalize(waveN + uSun * 0.45), uSun);
    float glintSharp = pow(clamp(sunAlign, 0.0, 1.0), 18.0) * smoothstep(0.08, 0.42, waveSlopeMag);
    vec3 sunGlintCol = mix(vec3(0.55, 0.70, 0.95) * 0.35, vec3(1.0, 0.95, 0.82), uDay);
    c += sunGlintCol * waterMask * glintSharp * 0.46;

    // 3. Porous Cellular Aerated Whitewater Foam (from vehicle/wheel Kelvin wakes, bow waves, and turbulent slipstreams)
    if (wakeFoam > 0.005) {
      float localLit = uDay * (0.72 + 0.28 * clamp(dot(waveN, uSun), -0.5, 1.0));
      if (uLightOn > 0.5) {
        float lampHere = 1.0 - texture(uLight, uv).a;
        localLit = max(localLit, lampHere * 0.85 + 0.12);
      } else {
        localLit = max(localLit, 0.16);
      }
      vec3 foamCol = mix(vec3(0.72, 0.85, 0.94), vec3(0.96, 0.99, 1.0), uDay) * localLit;
      c = mix(c, foamCol, clamp(waterMask * wakeFoam, 0.0, 0.88));
    }

    // 4. Dynamic lightmap & bloom reflections on water (headlights, taillights, sirens, streetlamps, flashlights)
    vec2 reflUv = clamp(uv + waveN * 0.014, vec2(0.001), vec2(0.999));
    vec3 reflBloom = texture(uBloom, reflUv).rgb + texture(uBloomWide, reflUv).rgb * 0.85;
    float waveFacetHighlight = 0.65 + 0.75 * clamp(dot(waveN, vec2(0.707, -0.707)), -0.6, 1.0);
    c += reflBloom * waterMask * waveFacetHighlight * mix(1.55, 0.65, uDay);

    if (uLightOn > 0.5) {
      float litPerturbed = 1.0 - texture(uLight, clamp(uv + waveN * 0.018, vec2(0.001), vec2(0.999))).a;
      float litBase = 1.0 - texture(uLight, uv).a;
      float specRipple = max(0.0, litPerturbed - litBase * 0.65) + litPerturbed * pow(max(0.0, waveSlopeMag * 0.75), 2.0);
      vec3 artificialSpecCol = mix(vec3(1.0, 0.93, 0.78), reflBloom * 1.6 + vec3(0.45, 0.55, 0.70), 0.55);
      c += artificialSpecCol * waterMask * specRipple * (0.28 + 0.55 * (1.0 - uDay));
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

  // --- wet asphalt, mud, soil & water sheen: mirror nearby lights --------------------------------------------
  if (uWet > 0.001) {
    float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
    float neutralMask = 1.0 - smoothstep(0.08, 0.22, sat);
    float earthHue = step(c.g, c.r) * step(c.b, c.g) * (1.0 - smoothstep(0.18, 0.42, sat));
    float surfaceMask = max(max(neutralMask, earthHue * 0.85), waterMask * 0.9);
    float mask = surfaceMask * smoothstep(0.015, 0.09, l0) * (1.0 - smoothstep(0.32, 0.58, l0));
    vec2 wetReflUv = clamp(uv + waveN * 0.01 * waterMask, vec2(0.001), vec2(0.999));
    vec3 wetWide = texture(uBloomWide, wetReflUv).rgb;
    c = c * (1.0 - 0.14 * uWet * mask * (1.0 - waterMask * 0.7)) + wetWide * mask * uWet * 1.85 + vec3(0.70, 0.82, 1.0) * mask * uWet * uDay * 0.045;
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

  // --- tone curve + grading ---------------------------------------------------------------------------------
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
      'uSrc', 'uBloom', 'uBlur', 'uBloomWide', 'uLight', 'uLightOn', 'uLightSize', 'uGi', 'uWet', 'uFogGlow', 'uSrcSize', 'uOutSize', 'uUpscale', 'uTime', 'uSun',
      'uCamPos', 'uCamZoom', 'uCamAngle', 'uFreezing',
      'uRelief', 'uClarity', 'uBloomStr',
      'uSharp', 'uTone', 'uExposure', 'uContrast', 'uSat', 'uShadowTint', 'uHighTint', 'uHaze', 'uVig', 'uGrain', 'uChroma', 'uDay',
      'uFireCount', 'uFirePosRad[0]', 'uFireWind[0]',
      'uWind', 'uRiverFlow', 'uWakeCount', 'uWakePosRad[0]', 'uWakeVelParam[0]',
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

    // --- bloom chain -----------------------------------------------------------------------------------------
    const bloomOn = s.bloom > 0 || s.gi > 0 || s.wet > 0;
    if (bloomOn) {
      gl.useProgram(this.pDown.prog);
      let prevTex: WebGLTexture = this.srcTex;
      let prevW = sw;
      let prevH = sh;
      for (let i = 0; i < this.bloomChain.length; i++) {
        const t = this.bloomChain[i];
        this.bindTex(0, prevTex);
        gl.uniform1i(this.pDown.u.uTex, 0);
        gl.uniform2f(this.pDown.u.uTexel, 1 / prevW, 1 / prevH);
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
        gl.uniform2f(this.pUp.u.uTexel, 1 / small.w, 1 / small.h);
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
    gl.uniform1i(c.u.uSrc, 0);
    gl.uniform1i(c.u.uBloom, 1);
    gl.uniform1i(c.u.uBlur, 2);
    gl.uniform1i(c.u.uLight, 3);
    gl.uniform1i(c.u.uBloomWide, 4);
    gl.uniform1f(c.u.uLightOn, lm ? 1 : 0);
    gl.uniform2f(c.u.uLightSize, lm ? lm.width : 1, lm ? lm.height : 1);
    gl.uniform1f(c.u.uGi, bloomOn ? (s.gi / 100) * 0.55 : 0);
    gl.uniform1f(c.u.uWet, bloomOn ? (s.wet / 100) * g.wet : 0);
    gl.uniform1f(c.u.uFogGlow, (s.gi / 100) * g.fogGlow);
    gl.uniform2f(c.u.uSrcSize, sw, sh);
    gl.uniform2f(c.u.uOutSize, this.outW, this.outH);
    gl.uniform1f(c.u.uUpscale, sw < this.outW * 0.98 || sh < this.outH * 0.98 ? 1 : 0);
    gl.uniform1f(c.u.uTime, frame.timeSec);
    const dprScale = this.target.clientWidth > 0 ? this.outW / this.target.clientWidth : 1;
    gl.uniform2f(c.u.uCamPos, frame.cameraX ?? 0, frame.cameraY ?? 0);
    gl.uniform1f(c.u.uCamZoom, (frame.cameraZoom ?? 1) * dprScale);
    gl.uniform1f(c.u.uCamAngle, frame.cameraAngle);
    gl.uniform1f(c.u.uFreezing, frame.isFreezing ? 1 : 0);

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

    // Upload physical wind & river flow vectors and active water wakes (max 32) for direct GPU water wave & foam simulation
    gl.uniform2f(c.u.uWind, frame.windVx ?? 14, frame.windVy ?? 4);
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
      if (this.vao) gl.deleteVertexArray(this.vao);
      [this.pDown, this.pUp, this.pComposite, this.pFinal].forEach((p) => p && gl.deleteProgram(p.prog));
    }
    this.available = false;
  }
}
