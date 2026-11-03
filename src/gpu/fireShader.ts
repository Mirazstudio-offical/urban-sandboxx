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

  // Screen-upward unit vector in world space (for thermal convective rise)
  float camRot = -uCamAngle - 1.57079632679;
  vec2 upWorld = vec2(-sin(camRot), -cos(camRot));

  // Total draft vector in world space (buoyancy + wind/slipstream)
  vec2 draftWorld = upWorld * 28.0 + aWindAndBurn.xy * 0.85;
  float draftMag = length(draftWorld);
  vec2 draftDir = draftMag > 0.001 ? (draftWorld / draftMag) : upWorld;

  // Expand bounding quad generously so licking flame tongues and downwind plumes never clip
  float padScale = (kind > 1.5 && kind < 4.5) ? 2.65 : 2.35;
  float windStretch = min(radii.x + radii.y, draftMag * 0.36) * clamp(intensity, 0.35, 1.35);

  float ca = cos(angle);
  float sa = sin(angle);
  vec2 axisX = vec2(ca, sa);
  vec2 axisY = vec2(-sa, ca);

  // Shift quad center slightly along draft direction to accommodate rising/trailing flame tips
  vec2 quadCenter = center + draftDir * (windStretch * 0.42);
  vec2 halfSpan = radii * padScale + vec2(windStretch * 0.68);

  vec2 worldPos = quadCenter + axisX * (corner.x * halfSpan.x) + axisY * (corner.y * halfSpan.y);
  vec2 relWorld = worldPos - center;
  vec2 localPos = vec2(dot(relWorld, axisX) / radii.x, dot(relWorld, axisY) / radii.y);

  // Transform worldPos to screen space matching GameRenderer:
  // translate(w/2, h/2) -> scale(zoom) -> rotate(-camAngle - PI/2) -> translate(-cam.x, -cam.y)
  vec2 camRel = worldPos - uCamPos;
  float cCam = cos(camRot);
  float sCam = sin(camRot);
  vec2 rotPx = vec2(camRel.x * cCam - camRel.y * sCam, camRel.x * sCam + camRel.y * cCam) * uCamZoom;
  vec2 screenPx = rotPx + uViewSize * 0.5;

  // Map screen pixels (top-left origin) to WebGL clip space [-1, 1] (bottom-left origin)
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
}`;

const FS_FIRE = `#version 300 es
precision highp float;

in vec2 vWorldPos;
in vec2 vLocalPos;
in vec4 vCenterSize;
in vec4 vParams;
in vec3 vWindBurn;

uniform float uTime;
uniform float uCamAngle;

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

// Fast cellular Voronoi boil pattern for liquid fuel pools & combustion pockets
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

// Planckian blackbody color ramp with pyrolysis carbon soot transition
vec3 blackbodyColor(float temp) {
  // temp in [0.0 .. 1.45]
  vec3 soot     = vec3(0.035, 0.025, 0.025);
  vec3 ember    = vec3(0.52,  0.04,  0.008);
  vec3 crimson  = vec3(0.92,  0.14,  0.015);
  vec3 orange   = vec3(1.00,  0.48,  0.04);
  vec3 gold     = vec3(1.00,  0.84,  0.24);
  vec3 whiteHot = vec3(1.00,  0.98,  0.88);

  vec3 col = mix(soot, ember, smoothstep(0.04, 0.22, temp));
  col = mix(col, crimson,  smoothstep(0.20, 0.44, temp));
  col = mix(col, orange,   smoothstep(0.40, 0.72, temp));
  col = mix(col, gold,     smoothstep(0.68, 0.98, temp));
  col = mix(col, whiteHot, smoothstep(0.95, 1.32, temp));
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

  // Screen-upward direction in world space (convective buoyancy rise)
  float camRot = -uCamAngle - 1.57079632679;
  vec2 upWorld = vec2(-sin(camRot), -cos(camRot));

  // Rotate world draft (buoyancy + wind/slipstream) into emitter-local coordinates
  vec2 draftWorld = upWorld * 26.0 + windWorld * 0.85;
  float ca = cos(angle);
  float sa = sin(angle);
  vec2 draftLocal = vec2(
    draftWorld.x * ca + draftWorld.y * sa,
   -draftWorld.x * sa + draftWorld.y * ca
  ) / max(radii, vec2(4.0));

  float draftLen = length(draftLocal);
  vec2 draftDir = draftLen > 0.001 ? (draftLocal / draftLen) : vec2(0.0, -1.0);
  vec2 perpDir = vec2(-draftDir.y, draftDir.x);

  // Decompose position along and across the thermal draft plume
  float alongDraft = dot(vLocalPos, draftDir);
  float acrossDraft = dot(vLocalPos, perpDir);

  // Shear coordinates so rising/downwind flames taper and curl along the draft trajectory
  float plumeStretch = 1.0 + min(1.35, draftLen * 0.22) * smoothstep(-0.2, 1.4, alongDraft);
  vec2 pShifted = vLocalPos - draftDir * (max(0.0, alongDraft) * (1.0 - 1.0 / plumeStretch));

  // --- 1. Emitter-specific physical fuel bed SDF & reaction rate profile ---
  float bedDist = 1.0;
  float rimBoost = 0.0;
  float jetBoost = 0.0;
  float sootWeight = 0.42;

  if (kind == 0 || kind == 1) {
    // Fuel (0) or Heavy Oil (1) ground pool: organic multi-harmonic liquid puddle contour
    float ang = atan(pShifted.y, pShifted.x);
    float harmonic = 1.0
      + 0.14 * sin(ang * 2.0 + seed * 1.73)
      + 0.10 * cos(ang * 3.0 - seed * 2.31)
      + 0.07 * sin(ang * 5.0 + seed * 4.17)
      + 0.05 * cos(ang * 7.0 - seed * 3.09);
    bedDist = length(pShifted) / max(0.35, harmonic);

    // Volatile gasoline has a bright vapor-oxygen meniscus ring around the puddle rim
    if (kind == 0) {
      rimBoost = smoothstep(0.35, 0.78, bedDist) * (1.0 - smoothstep(0.82, 1.18, bedDist)) * 0.34;
      sootWeight = 0.32 + burnRatio * 0.22;
    } else {
      // Heavy motor oil burns thicker with denser black pyrolysis soot
      rimBoost = smoothstep(0.25, 0.68, bedDist) * (1.0 - smoothstep(0.72, 1.12, bedDist)) * 0.22;
      sootWeight = 0.62;
    }
  } else if (kind == 2) {
    // Vehicle Engine Bay Fire: escaping from hood side gaps, front radiator grille, and cowl seam
    vec2 q = abs(pShifted) - vec2(0.58, 0.62);
    float boxDist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    bedDist = boxDist + 0.72;

    // Pressurized flame jets along hood side seams (|y| ~ 0.68), front grille (x ~ 0.65), and cowl (x ~ -0.55)
    float sideSeam = exp(-pow((abs(pShifted.y) - 0.66) * 4.2, 2.0)) * smoothstep(0.85, 0.2, abs(pShifted.x));
    float grilleJet = exp(-pow((pShifted.x - 0.62) * 3.8, 2.0)) * smoothstep(0.85, 0.2, abs(pShifted.y));
    float hoodCore = smoothstep(0.85, 0.1, length(pShifted * vec2(0.9, 1.1))) * (0.45 + 0.55 * burnRatio);
    jetBoost = (sideSeam * 0.52 + grilleJet * 0.58 + hoodCore * 0.45);
    sootWeight = 0.52;
  } else if (kind == 3) {
    // Vehicle Cabin Fire: roaring compartment fire venting out of side windows, windshield, and rear glass
    vec2 q = abs(pShifted) - vec2(0.68, 0.66);
    float boxDist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    bedDist = boxDist + 0.70;

    float windowVents = exp(-pow((abs(pShifted.y) - 0.68) * 4.0, 2.0)) * smoothstep(0.9, 0.15, abs(pShifted.x));
    float glassVents = exp(-pow((abs(pShifted.x) - 0.64) * 3.8, 2.0)) * smoothstep(0.85, 0.2, abs(pShifted.y));
    jetBoost = (windowVents * 0.58 + glassVents * 0.48 + 0.35);
    sootWeight = 0.56;
  } else if (kind == 4) {
    // Vehicle Fuel Tank / Rear Underbody Fire: volatile gasoline jet + dripping pool
    float ang = atan(pShifted.y, pShifted.x);
    float asym = 1.0 + 0.18 * cos(ang - 3.14159) + 0.12 * sin(ang * 3.0 + seed);
    bedDist = length(pShifted * vec2(0.92, 1.08)) / asym;
    jetBoost = smoothstep(0.95, 0.2, bedDist) * 0.48;
    sootWeight = 0.46;
  } else {
    // Transient Flash / Explosion Fireball
    bedDist = length(pShifted);
    rimBoost = smoothstep(0.2, 0.75, bedDist) * (1.0 - smoothstep(0.75, 1.15, bedDist)) * 0.45;
    sootWeight = 0.38 * burnRatio;
  }

  if (bedDist > 2.15) {
    discard;
  }

  // --- 2. Multi-Octave Domain-Warped Turbulent Advection & Ridged Flame Tongues ---
  float speedScale = (kind == 1) ? 2.6 : 3.9;
  vec2 flowUv = vLocalPos * 1.95 - draftDir * (uTime * speedScale) + vec2(seed * 5.17, seed * 2.93);

  // Octave 1: Macro Kelvin-Helmholtz vortex curl
  vec3 n1 = noise2DGrad(flowUv);
  vec2 curl1 = vec2(-n1.z, n1.y);

  // Octave 2: Domain-warped secondary shear eddies
  const mat2 rot2 = mat2(0.80, -0.60, 0.60, 0.80);
  vec2 uv2 = rot2 * (flowUv * 2.15 + curl1 * 0.48) - draftDir * (uTime * speedScale * 1.35);
  vec3 n2 = noise2DGrad(uv2);
  vec2 curl2 = vec2(-n2.z, n2.y);

  // Octave 3: High-frequency licking flame tongues & filaments
  const mat2 rot3 = mat2(0.60, 0.80, -0.80, 0.60);
  vec2 uv3 = rot3 * (flowUv * 4.25 + (curl1 + curl2) * 0.36) - draftDir * (uTime * speedScale * 1.85);
  vec3 n3 = noise2DGrad(uv3);

  // Sharp diffusion-flame reaction ridges (1 - |2n - 1|) produce crisp, pointed flame tongues instead of blurry clouds
  float ridge1 = 1.0 - abs(2.0 * n1.x - 1.0);
  float ridge2 = 1.0 - abs(2.0 * n2.x - 1.0);
  float ridge3 = 1.0 - abs(2.0 * n3.x - 1.0);

  float flameRidges = pow(ridge1, 1.25) * 0.46 + pow(ridge2, 1.55) * 0.36 + pow(ridge3, 1.85) * 0.18;

  // Cellular boiling pockets inside liquid fuel / engine core
  float boil = 1.0 - cellularBoil(vLocalPos * 2.4 - draftDir * (uTime * 1.8) + curl1 * 0.25, uTime * 3.2 + seed);
  float boilCells = smoothstep(0.15, 0.82, boil);

  // Dynamic boundary perturbation: flame tongues lick outward far more in the downwind/draft direction
  float downwindFactor = smoothstep(-0.6, 1.0, alongDraft);
  float tongueReach = (0.34 + 0.42 * downwindFactor) * (n1.x * 0.45 + flameRidges * 0.75);
  float warpedDist = bedDist - tongueReach - jetBoost * 0.28;

  // Smooth core-to-tip envelope with detached flame tips at the outer shear margin
  float coreMask = 1.0 - smoothstep(0.12, 1.18, warpedDist);
  float outerEnvelope = 1.0 - smoothstep(0.55, 1.48, warpedDist);
  if (outerEnvelope <= 0.002) {
    discard;
  }

  // Temperature field T combines core proximity, sharp flame ridges, boiling cells, and rim/seam jets
  float temp = coreMask * (0.68 + 0.52 * flameRidges + 0.26 * boilCells)
             + outerEnvelope * (flameRidges * 0.58 + rimBoost + jetBoost * 0.65);
  temp *= clamp(intensity * (0.88 + 0.12 * sin(uTime * 13.7 + seed * 3.1 + n1.x * 4.0)), 0.15, 1.45);

  if (temp <= 0.03) {
    discard;
  }

  // --- 3. Planckian Blackbody Radiance & Pyrolysis Soot Rim ---
  vec3 fireRgb = blackbodyColor(temp);

  // Outer cooling zone forms dark absorptive carbon soot wisps around the crimson flame tips
  float sootBand = smoothstep(0.04, 0.20, temp) * (1.0 - smoothstep(0.22, 0.48, temp));
  float sootAlpha = sootBand * sootWeight * outerEnvelope * clamp(intensity, 0.3, 1.0);

  // Flame opacity & additive luminance weight
  float flameAlpha = smoothstep(0.06, 0.52, temp) * outerEnvelope * clamp(intensity * 0.95, 0.2, 0.96);

  // Premultiplied output for (ONE, ONE_MINUS_SRC_ALPHA):
  // - In the soot rim, premulRgb is near-black while alpha = sootAlpha -> darkens underlying surface naturally
  // - In the hot flame zone, premulRgb has boosted HDR emission while alpha transitions smoothly
  float totalAlpha = clamp(max(flameAlpha * 0.78, sootAlpha), 0.0, 0.94);
  float emissiveBoost = smoothstep(0.28, 1.15, temp) * 0.42;
  vec3 premulRgb = fireRgb * (flameAlpha + emissiveBoost);

  // Subtle ambient thermal halo around base of fire so flames sit organically in the scene
  float baseHalo = (1.0 - smoothstep(0.0, 1.38, bedDist)) * 0.14 * clamp(intensity, 0.0, 1.0);
  premulRgb += vec3(0.95, 0.32, 0.04) * baseHalo;

  oColor = vec4(clamp(premulRgb, 0.0, 1.0), totalAlpha);
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
    timeSec: number
  ) {
    const count = Math.min(emitters.length, MAX_INSTANCES);
    if (count === 0 || viewWidth < 2 || viewHeight < 2) return;

    if (!this.available || this.lost || !this.gl || !this.prog || !this.vao || !this.instanceBuf) {
      this.renderFallback2D(ctx, emitters, count, timeSec);
      return;
    }

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
      const boundR = (maxR * 3.1 + Math.min(maxR * 2.0, windMag * 0.45) + 18) * camera.zoom;

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
