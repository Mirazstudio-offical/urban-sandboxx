import type { Particle } from '../types';

/**
 * Physical Aerosol & Volumetric Particle Modes for WebGL2 Instanced Shader
 */
export enum VolumetricParticleKind {
  /** Dense carbon pyrolysis smoke (burning engines, tires, oil/fuel fires) with dark soot core & subsurface fire glow */
  CarbonSmoke = 0,
  /** Pure white condensed water vapor / radiator steam / breath with bright Mie forward/back scattering */
  CondensateSteam = 1,
  /** High-temperature vulcanized rubber burnout / drift smoke with dense blue-grey polymer scattering */
  TireSmoke = 2,
  /** Tailpipe & tractor stack exhaust gas plume with rapid turbulent curl dissipation */
  ExhaustPlume = 3,
  /** Wind-sheared offroad soil / chernozem / silica sand dust cloud with embedded particulate grain noise */
  TerraDust = 4,
  /** Atomized hydrodynamic water spray / splash mist with refractive specular glints */
  HydroMist = 5,
}

/**
 * Moving world-space entity collider (vehicle, player on foot, NPC pedestrian)
 * that parts, deflects, and swirls nearby smoke, steam, mist, and dust clouds in real time.
 */
export interface ParticleCollider {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

const VS_PARTICLE = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aCorner;        // [-1..1, -1..1] quad corner
layout(location = 1) in vec4 aPosRadZ;       // x: worldX, y: worldY, z: radius, w: altitudeZ
layout(location = 2) in vec4 aVelLifeKind;   // x: vx, y: vy, z: progress (0..1), w: kind + floor(seed)*8
layout(location = 3) in vec4 aColorAlpha;    // r, g, b (0..1), a: alpha (0..1)
layout(location = 4) in vec4 aRotStretchFire;// x: angle, y: aspectStretch, z: fireGlow (0..1), w:condensation (0..1)

uniform vec2 uCamPos;
uniform float uCamZoom;
uniform float uCamAngle;
uniform vec2 uViewport;
uniform vec2 uWind;
uniform int uColliderCount;
uniform vec4 uColliderPosVel[24]; // xy: world pos, zw: velocity
uniform float uColliderRad[24];

out vec2 vLocal;
out vec2 vWorldPos;
out vec4 vColorAlpha;
out float vProgress;
out float vKind;
out float vSeed;
out float vFireGlow;
out float vCondense;
out vec2 vWakeDeflect;
out float vWakeVorticity;
out vec2 vScreenRadDirX;
out vec2 vScreenRadDirY;

void main() {
  float rawW = aVelLifeKind.w;
  float kind = mod(rawW, 8.0);
  float seed = floor(rawW / 8.0) * 0.0173;

  vec2 worldCenter = aPosRadZ.xy;
  float baseRadius = aPosRadZ.z;
  float altZ = max(0.0, aPosRadZ.w);
  float progress = clamp(aVelLifeKind.z, 0.0, 1.0);

  // 1. Real-time aerodynamic entity wake & Kármán vortex deflection from vehicles, player & pedestrians
  vec2 totalPush = vec2(0.0);
  float vorticity = 0.0;
  for (int i = 0; i < 24; i++) {
    if (i >= uColliderCount) break;
    vec4 cpv = uColliderPosVel[i];
    float cRad = uColliderRad[i];
    vec2 toP = worldCenter - cpv.xy;
    float dist = length(toP);
    float reach = cRad * 2.15 + baseRadius * 0.85;
    if (dist < reach && dist > 0.1) {
      vec2 dir = toP / dist;
      float falloff = pow(clamp(1.0 - dist / reach, 0.0, 1.0), 1.6);
      float spd = length(cpv.zw);
      vec2 moveDir = spd > 1.0 ? (cpv.zw / spd) : dir;
      vec2 movePerp = vec2(-moveDir.y, moveDir.x);
      float side = sign(dot(toP, movePerp) + 0.001);
      float along = dot(dir, moveDir);

      // Bow wave pushes smoke/steam outward ahead of vehicle; rear slipstream curls into twin vortices
      vec2 bowPush = (dir * 0.65 + movePerp * side * (along > 0.0 ? 0.55 : -0.38)) * min(22.0, (6.0 + spd * 0.16) * falloff);
      totalPush += bowPush;
      vorticity += side * clamp(spd * 0.025, 0.25, 2.8) * falloff;
    }
  }

  worldCenter += totalPush * (0.45 + 0.55 * progress);

  // 2. Top-down 2.5D zenith parallax expansion as buoyant smoke/steam rises toward the camera
  float zScale = 1.0 + min(0.38, altZ * 0.0055);
  float rotAngle = aRotStretchFire.x + vorticity * 0.65;
  float stretch = clamp(aRotStretchFire.y, 0.75, 2.35);

  float rx = baseRadius * zScale * stretch * 1.28;
  float ry = baseRadius * zScale * max(0.78, 1.85 - stretch * 0.42) * 1.28;

  float cosR = cos(rotAngle);
  float sinR = sin(rotAngle);
  vec2 localScaled = vec2(aCorner.x * rx, aCorner.y * ry);
  vec2 rotatedOffset = vec2(
    localScaled.x * cosR - localScaled.y * sinR,
    localScaled.x * sinR + localScaled.y * cosR
  );

  vec2 vertexWorld = worldCenter + rotatedOffset;

  // Transform world -> camera screen space (matching ctx.rotate(-camera.angle - PI/2))
  vec2 rel = (vertexWorld - uCamPos) * uCamZoom;
  float camRot = -uCamAngle - 1.57079632679;
  float cA = cos(camRot);
  float sA = sin(camRot);
  vec2 screenOffset = vec2(rel.x * cA - rel.y * sA, rel.x * sA + rel.y * cA);

  vec2 screenPx = uViewport * 0.5 + screenOffset;
  vec2 ndc = (screenPx / uViewport) * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);

  // Pass local basis for directional solar self-shadowing in fragment shader
  vScreenRadDirX = vec2(cosR, sinR);
  vScreenRadDirY = vec2(-sinR, cosR);
  vLocal = aCorner;
  vWorldPos = vertexWorld;
  vColorAlpha = aColorAlpha;
  vProgress = progress;
  vKind = kind;
  vSeed = seed;
  vFireGlow = aRotStretchFire.z;
  vCondense = aRotStretchFire.w;
  vWakeDeflect = clamp(totalPush * 0.06, vec2(-1.0), vec2(1.0));
  vWakeVorticity = vorticity;
}
`;

const FS_PARTICLE = `#version 300 es
precision highp float;

in vec2 vLocal;
in vec2 vWorldPos;
in vec4 vColorAlpha;
in float vProgress;
in float vKind;
in float vSeed;
in float vFireGlow;
in float vCondense;
in vec2 vWakeDeflect;
in float vWakeVorticity;
in vec2 vScreenRadDirX;
in vec2 vScreenRadDirY;

uniform float uTime;
uniform vec2 uSunDir;      // World-space normalized vector toward the sun
uniform float uDayFactor;  // 0.0 (night) .. 1.0 (day)
uniform vec2 uWind;

out vec4 fragColor;

// Fast value noise & analytical gradient for volumetric curl billows
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 noiseAndGrad(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  vec2 du = 6.0 * f * (1.0 - f);

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

// 3D Cellular Voronoi cauliflower lobe distance for spherical billowing puffs
float cellularLobe(vec2 p, float phase) {
  vec2 ip = floor(p);
  vec2 fp = fract(p);
  float minDist = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 n = vec2(float(x), float(y));
      vec2 cell = ip + n;
      float h = hash21(cell);
      vec2 jitter = 0.5 + 0.36 * sin(phase + 6.2831 * vec2(h, fract(h * 17.3)));
      vec2 diff = n + jitter - fp;
      minDist = min(minDist, dot(diff, diff));
    }
  }
  return sqrt(minDist);
}

void main() {
  // 1. Vortex-warped local coordinates for billowing 3D cauliflower clouds (never a flat circle)
  float rSq = dot(vLocal, vLocal);
  if (rSq > 1.0) discard;

  float swirl = vWakeVorticity * (1.0 - rSq * 0.60);
  float cs = cos(swirl);
  float ss = sin(swirl);
  vec2 p = vec2(vLocal.x * cs - vLocal.y * ss, vLocal.x * ss + vLocal.y * cs);
  p -= vWakeDeflect * 0.22 * (1.0 - rSq);

  vec2 seedVec = vec2(cos(vSeed * 6.2831), sin(vSeed * 6.2831)) * 11.7;
  float timeFlow = uTime * (0.68 + 0.32 * float(vKind == 1.0 || vKind == 3.0));

  // 3-octave FBM with curl-like domain warping + cellular cauliflower lobes
  vec3 n1 = noiseAndGrad(p * 2.25 + seedVec + vec2(timeFlow * 0.42, -timeFlow * 0.30));
  vec2 curl1 = vec2(-n1.z, n1.y) * 0.44;
  vec3 n2 = noiseAndGrad(p * 4.65 - seedVec * 0.7 + curl1 + vec2(-timeFlow * 0.58, timeFlow * 0.46));
  float n3 = noiseAndGrad(p * 9.20 + seedVec * 1.3 + n2.yz * 0.32).x;

  float cauli = 1.0 - cellularLobe(p * 2.15 + curl1 * 0.65, timeFlow * 1.15 + vSeed * 5.0);
  float fbm = n1.x * 0.42 + n2.x * 0.28 + n3 * 0.12 + smoothstep(0.15, 0.85, cauli) * 0.32;

  // Multi-lobed organic cauliflower silhouette boundary
  float radialDist = length(p);
  float edgePerturb = (fbm - 0.46) * (0.48 + 0.24 * vProgress);
  float effRadius = radialDist - edgePerturb;
  if (effRadius >= 0.96) discard;

  // Volumetric optical depth (Beer-Lambert absorption & scattering profile)
  float domeHeight = sqrt(max(0.0, 1.0 - min(1.0, effRadius * effRadius)));
  float billowDensity = smoothstep(0.95, 0.10, effRadius) * (0.52 + 0.68 * fbm);

  // Dissolve into wispy filaments as the cloud ages (vProgress -> 1.0)
  float erosionThreshold = vProgress * 0.48;
  float erodedDensity = smoothstep(erosionThreshold, 0.98, billowDensity);
  if (erodedDensity <= 0.004) discard;

  // Reconstruct 3D volumetric cloud surface normal in world space for solar & ambient lighting
  vec2 localNormalXY = normalize(p * 1.25 - (n1.yz * 0.52 + n2.yz * 0.36) + vec2(1e-4));
  vec2 worldNormalXY = vScreenRadDirX * localNormalXY.x + vScreenRadDirY * localNormalXY.y;
  vec3 cloudNormal = normalize(vec3(worldNormalXY * (1.0 - domeHeight * 0.38), domeHeight * 0.82 + 0.18));

  vec3 sunVec3 = normalize(vec3(uSunDir * 0.82, 0.38 + 0.28 * uDayFactor));
  float nDotL = dot(cloudNormal, sunVec3);
  float selfShadow = smoothstep(-0.72, 0.78, nDotL);
  float internalRidge = smoothstep(0.28, 0.82, cauli);

  // Rim silver-lining forward scattering (Mie phase function at cloud edges)
  float edgeRim = pow(clamp(1.0 - domeHeight, 0.0, 1.0), 1.9) * smoothstep(-0.25, 0.85, nDotL);

  vec3 baseCol = vColorAlpha.rgb;
  float outAlpha = erodedDensity * vColorAlpha.a;

  // ==========================================================================
  // MODE-SPECIFIC PHYSICAL SHADING (Smoke, Steam, Tire Smoke, Exhaust, Dust, Water Mist)
  // ==========================================================================
  vec3 finalCol = baseCol;

  if (vKind < 0.5) {
    // 0: CARBON PYROLYSIS SMOKE (Engine fire / burning fuel / heavy soot)
    vec3 sootDark = baseCol * 0.32;
    vec3 sunlitCrown = mix(baseCol * 1.28, vec3(0.84, 0.88, 0.94), 0.28 * uDayFactor);
    finalCol = mix(sootDark, sunlitCrown, (selfShadow * 0.72 + internalRidge * 0.28) * (0.42 + 0.58 * uDayFactor));
    // Subsurface blackbody firelight glow from flames underneath young smoke billows
    if (vFireGlow > 0.01) {
      float coreThickness = smoothstep(0.10, 0.85, domeHeight) * (1.0 - fbm * 0.32);
      vec3 fireTint = mix(vec3(0.96, 0.26, 0.03), vec3(1.0, 0.72, 0.20), fbm);
      finalCol += fireTint * vFireGlow * coreThickness * 0.95;
    }
    outAlpha = clamp(outAlpha * 1.18, 0.0, 0.96);
  } else if (vKind < 1.5) {
    // 1: CONDENSATE STEAM / RADIATOR VAPOR (High albedo, strong Mie silver-lining, soft feathery billows)
    vec3 shadowVapor = mix(vec3(0.56, 0.66, 0.78), baseCol * 0.78, 0.45) * (0.35 + 0.65 * uDayFactor);
    vec3 litVapor = mix(baseCol, vec3(1.0, 0.99, 0.98), 0.68 * uDayFactor);
    finalCol = mix(shadowVapor, litVapor, 0.28 + 0.72 * (selfShadow * 0.75 + internalRidge * 0.25));
    finalCol += vec3(0.96, 0.99, 1.0) * edgeRim * (0.36 + 0.38 * uDayFactor);
    outAlpha *= (0.82 + 0.22 * vCondense);
  } else if (vKind < 2.5) {
    // 2: VULCANIZED TIRE BURNOUT / DRIFT SMOKE (Thick polymeric blue-grey aerosol)
    vec3 polymerShadow = baseCol * vec3(0.58, 0.64, 0.74) * (0.32 + 0.68 * uDayFactor);
    vec3 polymerLit = mix(baseCol * 1.22, vec3(0.94, 0.97, 1.0), 0.36 * uDayFactor);
    finalCol = mix(polymerShadow, polymerLit, 0.25 + 0.75 * (selfShadow * 0.72 + internalRidge * 0.28));
    finalCol += vec3(0.88, 0.94, 1.0) * edgeRim * 0.30 * uDayFactor;
    outAlpha = clamp(outAlpha * 1.15, 0.0, 0.94);
  } else if (vKind < 3.5) {
    // 3: TAILPIPE & DIESEL STACK EXHAUST PLUME
    vec3 exShadow = baseCol * 0.56 * (0.32 + 0.68 * uDayFactor);
    vec3 exLit = mix(baseCol * (1.05 + 0.28 * uDayFactor), vec3(0.95, 0.97, 1.0), 0.22 * vCondense * uDayFactor);
    finalCol = mix(exShadow, exLit, 0.30 + 0.70 * (selfShadow * 0.74 + internalRidge * 0.26));
    finalCol += vec3(0.90, 0.95, 1.0) * edgeRim * (0.24 + 0.20 * vCondense);
    outAlpha *= 0.92;
  } else if (vKind < 4.5) {
    // 4: TERRA DUST / SAND / CHERNOZEM PLUME (Granular mineral micro-specks + warm solar rim)
    float grainNoise = hash21(floor(vWorldPos * 1.95) + floor(uTime * 9.0));
    float mineralGrain = (grainNoise - 0.5) * 0.20;
    vec3 dustShadow = baseCol * 0.54 * (0.30 + 0.70 * uDayFactor);
    vec3 dustLit = (baseCol * 1.24 + vec3(0.10, 0.07, 0.03) * uDayFactor) + mineralGrain;
    finalCol = mix(dustShadow, dustLit, 0.24 + 0.76 * (selfShadow * 0.75 + internalRidge * 0.25));
    finalCol += vec3(0.98, 0.88, 0.72) * edgeRim * 0.22 * uDayFactor;
    outAlpha *= (0.88 + 0.14 * step(0.32, grainNoise));
  } else {
    // 5: HYDRODYNAMIC WATER SPRAY / ATOMIZED MIST (Refractive droplet glints + translucent cyan-white veil)
    float dropCell = hash21(floor(vWorldPos * 2.5) + floor(uTime * 18.0));
    float dropSparkle = smoothstep(0.80, 0.97, dropCell) * (0.48 + 0.52 * uDayFactor);
    vec3 mistShadow = vec3(0.54, 0.72, 0.88) * (0.35 + 0.65 * uDayFactor);
    vec3 mistLit = vec3(0.95, 0.99, 1.0) * (0.45 + 0.55 * uDayFactor);
    finalCol = mix(mistShadow, mistLit, 0.35 + 0.65 * selfShadow) + vec3(1.0) * dropSparkle * 0.45;
    outAlpha *= (0.76 + 0.26 * smoothstep(0.35, 0.88, fbm));
  }

  // Premultiplied alpha output for artifact-free compositing onto 2D Canvas
  outAlpha = clamp(outAlpha, 0.0, 1.0);
  fragColor = vec4(finalCol * outAlpha, outAlpha);
}
`;

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function parseColorRgb01(color: string): [number, number, number] {
  if (!color) return [0.75, 0.78, 0.82];
  const s = color.trim();
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16) / 255;
      const g = parseInt(hex[1] + hex[1], 16) / 255;
      const b = parseInt(hex[2] + hex[2], 16) / 255;
      return [r || 0.7, g || 0.7, b || 0.7];
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return [
        Number.isFinite(r) ? r : 0.7,
        Number.isFinite(g) ? g : 0.7,
        Number.isFinite(b) ? b : 0.7,
      ];
    }
  }
  const m = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (m) {
    return [
      Math.min(1, Math.max(0, parseFloat(m[1]) / 255)),
      Math.min(1, Math.max(0, parseFloat(m[2]) / 255)),
      Math.min(1, Math.max(0, parseFloat(m[3]) / 255)),
    ];
  }
  return [0.76, 0.79, 0.83];
}

export class GpuParticleShaderRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private instanceBuffer: WebGLBuffer | null = null;
  private failed = false;

  private readonly maxInstances = 1024;
  private readonly floatsPerInstance = 16;
  private readonly instanceData = new Float32Array(this.maxInstances * this.floatsPerInstance);
  private readonly colliderPosVelData = new Float32Array(24 * 4);
  private readonly colliderRadData = new Float32Array(24);

  private uCamPos: WebGLUniformLocation | null = null;
  private uCamZoom: WebGLUniformLocation | null = null;
  private uCamAngle: WebGLUniformLocation | null = null;
  private uViewport: WebGLUniformLocation | null = null;
  private uWind: WebGLUniformLocation | null = null;
  private uTime: WebGLUniformLocation | null = null;
  private uSunDir: WebGLUniformLocation | null = null;
  private uDayFactor: WebGLUniformLocation | null = null;
  private uColliderCount: WebGLUniformLocation | null = null;
  private uColliderPosVel: WebGLUniformLocation | null = null;
  private uColliderRad: WebGLUniformLocation | null = null;

  private init(): boolean {
    if (this.failed) return false;
    if (this.gl && this.program && this.vao) return true;
    if (typeof document === 'undefined') {
      this.failed = true;
      return false;
    }

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
      });
      if (!gl) {
        this.failed = true;
        return false;
      }

      const vs = compileShader(gl, gl.VERTEX_SHADER, VS_PARTICLE);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, FS_PARTICLE);
      if (!vs || !fs) {
        this.failed = true;
        return false;
      }

      const prog = gl.createProgram();
      if (!prog) {
        this.failed = true;
        return false;
      }
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);

      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        this.failed = true;
        return false;
      }

      const vao = gl.createVertexArray();
      const quadBuf = gl.createBuffer();
      const instBuf = gl.createBuffer();
      if (!vao || !quadBuf || !instBuf) {
        this.failed = true;
        return false;
      }

      gl.bindVertexArray(vao);

      // Static unit quad [-1..1]
      const quadVerts = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ]);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      // Per-instance buffer (16 floats = 64 bytes per particle)
      gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
      gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.byteLength, gl.DYNAMIC_DRAW);

      const stride = this.floatsPerInstance * 4;
      for (let attr = 1; attr <= 4; attr++) {
        gl.enableVertexAttribArray(attr);
        gl.vertexAttribPointer(attr, 4, gl.FLOAT, false, stride, (attr - 1) * 16);
        gl.vertexAttribDivisor(attr, 1);
      }

      gl.bindVertexArray(null);

      this.canvas = canvas;
      this.gl = gl;
      this.program = prog;
      this.vao = vao;
      this.instanceBuffer = instBuf;

      this.uCamPos = gl.getUniformLocation(prog, 'uCamPos');
      this.uCamZoom = gl.getUniformLocation(prog, 'uCamZoom');
      this.uCamAngle = gl.getUniformLocation(prog, 'uCamAngle');
      this.uViewport = gl.getUniformLocation(prog, 'uViewport');
      this.uWind = gl.getUniformLocation(prog, 'uWind');
      this.uTime = gl.getUniformLocation(prog, 'uTime');
      this.uSunDir = gl.getUniformLocation(prog, 'uSunDir');
      this.uDayFactor = gl.getUniformLocation(prog, 'uDayFactor');
      this.uColliderCount = gl.getUniformLocation(prog, 'uColliderCount');
      this.uColliderPosVel = gl.getUniformLocation(prog, 'uColliderPosVel');
      this.uColliderRad = gl.getUniformLocation(prog, 'uColliderRad');

      return true;
    } catch {
      this.failed = true;
      return false;
    }
  }

  /**
   * Renders a batch of volumetric particles (smoke, steam, exhaust, dust, water mist)
   * using the instanced WebGL2 volumetric shader and composites onto the 2D canvas.
   * Returns `true` if rendered on GPU, or `false` if WebGL2 is unavailable (allowing 2D fallback).
   */
  public renderParticles(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    camera: { x: number; y: number; zoom: number; angle: number },
    viewportW: number,
    viewportH: number,
    backingScale: number,
    timeSec: number,
    sunDir: { x: number; y: number },
    dayFactor: number,
    wind: { vx: number; vy: number },
    colliders: ParticleCollider[],
    enableGpu: boolean = true
  ): boolean {
    if (!enableGpu || particles.length === 0) return false;
    if (!this.init()) return false;

    const gl = this.gl!;
    const canvas = this.canvas!;
    const renderScale = 0.85;
    const targetW = Math.max(64, Math.min(2560, Math.round(viewportW * renderScale)));
    const targetH = Math.max(64, Math.min(1600, Math.round(viewportH * renderScale)));

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const camRot = -camera.angle - Math.PI * 0.5;
    const cCam = Math.cos(camRot);
    const sCam = Math.sin(camRot);
    const halfVW = viewportW * 0.5;
    const halfVH = viewportH * 0.5;

    let minSX = viewportW;
    let minSY = viewportH;
    let maxSX = 0;
    let maxSY = 0;

    const count = Math.min(this.maxInstances, particles.length);
    const data = this.instanceData;
    let validCount = 0;

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      const alpha = Math.max(0, Math.min(1, p.alpha));
      if (alpha < 0.01 || p.radius <= 0.2) continue;

      const dx = p.x - camera.x;
      const dy = p.y - camera.y;
      const sx = (dx * cCam - dy * sCam) * camera.zoom + halfVW;
      const sy = (dx * sCam + dy * cCam) * camera.zoom + halfVH;
      const boundR = (Math.max(2.0, p.radius) * 3.8 + 32) * camera.zoom;

      if (sx + boundR < 0 || sx - boundR > viewportW || sy + boundR < 0 || sy - boundR > viewportH) {
        continue;
      }

      if (sx - boundR < minSX) minSX = sx - boundR;
      if (sy - boundR < minSY) minSY = sy - boundR;
      if (sx + boundR > maxSX) maxSX = sx + boundR;
      if (sy + boundR > maxSY) maxSY = sy + boundR;

      let kind = VolumetricParticleKind.CarbonSmoke;
      if (p.type === 'dust') {
        kind = VolumetricParticleKind.TerraDust;
      } else if (p.type === 'water_spray' || p.type === 'water_splash' || p.type === 'water_fountain') {
        kind = VolumetricParticleKind.HydroMist;
      } else if (p.isSteam || (p.color && (p.color === '#ffffff' || p.color.startsWith('#f8') || p.color.startsWith('#f1')))) {
        kind = VolumetricParticleKind.CondensateSteam;
      } else if (p.type === 'tire_smoke') {
        kind = VolumetricParticleKind.TireSmoke;
      } else if (p.type === 'exhaust') {
        kind = VolumetricParticleKind.ExhaustPlume;
      } else {
        kind = VolumetricParticleKind.CarbonSmoke;
      }

      const [r, g, b] = parseColorRgb01(p.color);
      const prog = p.maxLife > 0.001 ? Math.min(1, Math.max(0, p.life / p.maxLife)) : 0.5;
      const seedInt = Math.abs(Math.floor(p.shapeSeed ?? (i * 37 + p.x * 0.5))) % 1024;
      const spdSq = p.vx * p.vx + p.vy * p.vy;
      const stretch = spdSq > 120
        ? Math.min(2.15, (p.aspect ?? 1.1) + Math.sqrt(spdSq) * 0.0035)
        : (p.aspect ?? 1.12);
      const fireGlow = (p.secondaryColor && p.life < 1.1) ? Math.max(0, 1.0 - p.life / 1.1) : 0.0;
      const cond = p.isSteam ? 1.0 : 0.35;

      const base = validCount * this.floatsPerInstance;
      // aPosRadZ
      data[base + 0] = p.x;
      data[base + 1] = p.y;
      data[base + 2] = Math.max(1.2, p.radius);
      data[base + 3] = Math.max(0, p.z ?? 0);
      // aVelLifeKind
      data[base + 4] = p.vx;
      data[base + 5] = p.vy;
      data[base + 6] = prog;
      data[base + 7] = kind + seedInt * 8;
      // aColorAlpha
      data[base + 8] = r;
      data[base + 9] = g;
      data[base + 10] = b;
      data[base + 11] = alpha;
      // aRotStretchFire
      data[base + 12] = p.angle ?? (seedInt * 0.15 + p.life * 0.75);
      data[base + 13] = stretch;
      data[base + 14] = fireGlow;
      data[base + 15] = cond;

      validCount++;
    }

    if (validCount === 0) return true;

    minSX = Math.max(0, Math.floor(minSX));
    minSY = Math.max(0, Math.floor(minSY));
    maxSX = Math.min(viewportW, Math.ceil(maxSX));
    maxSY = Math.min(viewportH, Math.ceil(maxSY));
    const rectW = maxSX - minSX;
    const rectH = maxSY - minSY;
    if (rectW <= 1 || rectH <= 1) return true;

    const glX = Math.max(0, Math.floor(minSX * renderScale));
    const glY = Math.max(0, Math.floor((viewportH - maxSY) * renderScale));
    const glW = Math.min(targetW - glX, Math.ceil(rectW * renderScale) + 2);
    const glH = Math.min(targetH - glY, Math.ceil(rectH * renderScale) + 2);
    if (glW <= 0 || glH <= 0) return true;

    const colCount = Math.min(24, colliders.length);
    for (let c = 0; c < colCount; c++) {
      const col = colliders[c];
      this.colliderPosVelData[c * 4 + 0] = col.x;
      this.colliderPosVelData[c * 4 + 1] = col.y;
      this.colliderPosVelData[c * 4 + 2] = col.vx;
      this.colliderPosVelData[c * 4 + 3] = col.vy;
      this.colliderRadData[c] = col.radius;
    }

    const safeSunX = Number.isFinite(sunDir.x) ? sunDir.x : 0.42;
    const safeSunY = Number.isFinite(sunDir.y) ? sunDir.y : 0.91;
    const safeDay = Number.isFinite(dayFactor) ? dayFactor : 1.0;

    gl.viewport(0, 0, targetW, targetH);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(glX, glY, glW, glH);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(this.program!);
    gl.bindVertexArray(this.vao!);

    gl.uniform2f(this.uCamPos, camera.x, camera.y);
    gl.uniform1f(this.uCamZoom, camera.zoom);
    gl.uniform1f(this.uCamAngle, camera.angle);
    gl.uniform2f(this.uViewport, viewportW, viewportH);
    gl.uniform2f(this.uWind, wind.vx || 0, wind.vy || 0);
    gl.uniform1f(this.uTime, timeSec);
    gl.uniform2f(this.uSunDir, safeSunX, safeSunY);
    gl.uniform1f(this.uDayFactor, safeDay);
    gl.uniform1i(this.uColliderCount, colCount);
    if (colCount > 0) {
      gl.uniform4fv(this.uColliderPosVel, this.colliderPosVelData, 0, colCount * 4);
      gl.uniform1fv(this.uColliderRad, this.colliderRadData, 0, colCount);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer!);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data.subarray(0, validCount * this.floatsPerInstance));

    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, validCount);

    gl.bindVertexArray(null);
    gl.disable(gl.SCISSOR_TEST);

    // Composite only the active scissor sub-rectangle onto the 2D Canvas in screen space
    const srcX = glX;
    const srcY = targetH - (glY + glH);
    const dstX = srcX / renderScale;
    const dstY = srcY / renderScale;
    const dstW = glW / renderScale;
    const dstH = glH / renderScale;

    ctx.save();
    ctx.setTransform(backingScale, 0, 0, backingScale, 0, 0);
    ctx.globalAlpha = 1.0;
    ctx.drawImage(canvas, srcX, srcY, glW, glH, dstX, dstY, dstW, dstH);
    ctx.restore();

    return true;
  }
}
