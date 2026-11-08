// --- LIVING FOREST ECOSYSTEM, CANOPY DYNAMICS, FAUNA & ATMOSPHERE ENGINE ---
// First-principles botanical & ecological simulation:
// 1. Continuous wind-wave crown swaying & damped harmonic impact shaking for all tree species
// 2. Under-canopy dappled sunlight ("солнечные зайчики") & low-lying woodland mist ribbons
// 3. Interactive forest fauna: Red Squirrels on pines, Woodland Hares & Roe Deer, Canopy Birds
// 4. Sunlit woodland butterflies, river dragonflies, and summer night bioluminescent fireflies
// 5. Drifting canopy foliage (autumn leaves, pine needles, spring birch catkins, winter snow puffs)

import { GameWorld, Player, Tree, Vehicle } from './types';
import { getCurrentSunShadowState } from './shadowSystem';
import { getEffectiveWeatherWeights } from './weatherTransition';
import { getBiomeSampleAt } from './biomeSystem';
import { sound } from './audio';

export interface TreeShakeState {
  treeX: number;
  treeY: number;
  intensity: number; // 0..1+
  dirX: number;
  dirY: number;
  startTime: number;
}

interface CanopyDriftParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  altitude: number;
  vz: number;
  angle: number;
  spin: number;
  size: number;
  color: string;
  secondaryColor: string;
  kind: 'needle' | 'leaf_birch' | 'leaf_maple' | 'catkin' | 'snow_puff' | 'pollen';
  life: number;
  maxLife: number;
}

interface ForestSquirrel {
  id: number;
  homeTreeX: number;
  homeTreeY: number;
  homeTreeR: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  state: 'foraging' | 'dashing_to_trunk' | 'up_in_crown';
  timer: number;
  stridePhase: number;
  tailFlick: number;
}

interface ForestMammal {
  id: number;
  species: 'hare' | 'roe_deer';
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  state: 'grazing' | 'alert' | 'fleeing';
  timer: number;
  stridePhase: number;
}

interface CanopyFlockBird {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  altitude: number;
  targetX: number;
  targetY: number;
  species: 'jay' | 'woodpecker' | 'crow' | 'titmouse';
  wingPhase: number;
  life: number;
}

export class ForestSystem {
  private static treeShakes: Map<string, TreeShakeState> = new Map();
  private static driftParticles: CanopyDriftParticle[] = [];
  private static readonly MAX_DRIFT_PARTICLES = 140;
  private static squirrels: Map<number, ForestSquirrel> = new Map();
  private static mammals: Map<number, ForestMammal> = new Map();
  private static canopyFlock: CanopyFlockBird[] = [];
  private static readonly MAX_CANOPY_FLOCK = 36;
  private static lastUpdateSec = 0;
  private static lastSpawnParticleSec = 0;
  private static trampleCallback: ((wx: number, wy: number, r: number, dx: number, dy: number, nowSec: number) => void) | null = null;

  public static registerTrampleCallback(
    cb: (wx: number, wy: number, r: number, dx: number, dy: number, nowSec: number) => void
  ) {
    this.trampleCallback = cb;
  }

  private static hash2D(x: number, y: number, seed: number = 1337): number {
    const h = Math.imul(Math.floor(x) ^ seed, 374761393) + Math.imul(Math.floor(y) ^ (seed >> 1), 668265263);
    const h2 = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h2 ^ (h2 >>> 16)) >>> 0) / 4294967296;
  }

  /**
   * Triggers a physical shudder on a tree when a vehicle or player impacts or brushes past it,
   * bursting needles/leaves/snow from the crown and startling perched birds.
   */
  public static triggerTreeShake(
    treeId: string,
    treeX: number,
    treeY: number,
    treeRadius: number,
    intensity: number,
    dirX: number,
    dirY: number,
    season: string = 'summer'
  ) {
    const nowSec = typeof performance !== 'undefined' ? performance.now() * 0.001 : 0;
    const existing = this.treeShakes.get(treeId);
    if (existing && nowSec - existing.startTime < 0.25 && existing.intensity >= intensity) {
      return;
    }

    const norm = Math.hypot(dirX, dirY) || 1;
    const ndx = dirX / norm;
    const ndy = dirY / norm;

    this.treeShakes.set(treeId, {
      treeX,
      treeY,
      intensity: Math.min(1.6, Math.max(0.25, intensity)),
      dirX: ndx,
      dirY: ndy,
      startTime: nowSec,
    });

    // Spawn a burst of falling leaves / pine needles / winter snow puffs from the shaken crown
    const burstCount = Math.min(18, Math.floor(6 + intensity * 10));
    for (let i = 0; i < burstCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.random() * treeRadius * 0.85;
      const px = treeX + Math.cos(ang) * dist;
      const py = treeY + Math.sin(ang) * dist;
      this.spawnSingleDriftParticle(
        px,
        py,
        ndx * (18 + Math.random() * 25) + (Math.random() - 0.5) * 24,
        ndy * (18 + Math.random() * 25) + (Math.random() - 0.5) * 24,
        season,
        true
      );
    }

    // Startle a small flock of forest birds out of the shaken crown
    if (intensity > 0.35) {
      this.spawnStartledCanopyBirds(treeX, treeY, 2 + Math.floor(Math.random() * 3));
      sound.playBirdFlap();
    }
  }

  public static spawnStartledCanopyBirds(originX: number, originY: number, count: number) {
    const speciesList: CanopyFlockBird['species'][] = ['jay', 'titmouse', 'woodpecker', 'crow'];
    for (let i = 0; i < count; i++) {
      const flyAng = Math.random() * Math.PI * 2;
      const speed = 95 + Math.random() * 55;
      const dist = 260 + Math.random() * 340;
      const bird: CanopyFlockBird = {
        active: true,
        x: originX + (Math.random() - 0.5) * 14,
        y: originY + (Math.random() - 0.5) * 14,
        vx: Math.cos(flyAng) * speed,
        vy: Math.sin(flyAng) * speed,
        altitude: 18 + Math.random() * 12,
        targetX: originX + Math.cos(flyAng) * dist,
        targetY: originY + Math.sin(flyAng) * dist,
        species: speciesList[(Math.floor(Math.abs(originX + originY)) + i) % speciesList.length],
        wingPhase: Math.random() * Math.PI * 2,
        life: 0,
      };
      if (this.canopyFlock.length < this.MAX_CANOPY_FLOCK) {
        this.canopyFlock.push(bird);
      } else {
        const inactiveIdx = this.canopyFlock.findIndex((b) => !b.active);
        if (inactiveIdx >= 0) this.canopyFlock[inactiveIdx] = bird;
        else this.canopyFlock[i % this.MAX_CANOPY_FLOCK] = bird;
      }
    }
  }

  /**
   * Computes continuous wind-driven crown displacement + damped physical impact shake for a single tree.
   */
  public static getTreeWindSway(
    tree: Tree,
    world: GameWorld,
    nowSec: number
  ): {
    swayX: number;
    swayY: number;
    gustWave: number;
    isShaking: boolean;
  } {
    const windAngle = world.wind?.angle ?? 0.45;
    const windSpeed = world.wind?.speed ?? 0.35;
    const weatherWeights = getEffectiveWeatherWeights(world);
    const stormBoost = 1.0 + weatherWeights.rain * 0.55 + (world.weather === 'storm' ? 0.85 : 0);
    const effectiveWind = Math.min(2.2, (0.32 + windSpeed * 1.15) * stormBoost);

    const wCos = Math.cos(windAngle);
    const wSin = Math.sin(windAngle);

    // Spatial traveling wind wave across the forest canopy
    const uWind = tree.x * wCos + tree.y * wSin;
    const vWind = -tree.x * wSin + tree.y * wCos;
    const treePhase = (tree.x * 0.013 + tree.y * 0.017) % (Math.PI * 2);

    // Birches flutter faster; heavy pines sway with a deep, majestic slow cadence
    const isBirch = tree.type === 'birch';
    const isPine = tree.type === 'pine';
    const freq = isBirch ? 2.55 : isPine ? 1.65 : 2.05;

    const mainWave = Math.sin(uWind * 0.0045 - nowSec * freq + Math.sin(vWind * 0.003) * 1.2);
    const flutterWave = Math.cos(treePhase + nowSec * (isBirch ? 5.2 : 3.1)) * (isBirch ? 0.32 : 0.16);
    const gustWave = 0.55 + 0.45 * mainWave;

    const rScale = Math.max(0.65, Math.min(1.45, (tree.radius || 18) / 20));
    const amp = effectiveWind * rScale * (isBirch ? 2.85 : isPine ? 2.15 : 2.45);

    let swayX = wCos * amp * (0.65 + 0.55 * mainWave) - wSin * amp * flutterWave;
    let swayY = wSin * amp * (0.65 + 0.55 * mainWave) + wCos * amp * flutterWave;

    // Add damped harmonic physical shake if a vehicle or player recently hit/brushed this tree
    let isShaking = false;
    const shake = this.treeShakes.get(tree.id);
    if (shake) {
      const elapsed = nowSec - shake.startTime;
      if (elapsed > 1.85) {
        this.treeShakes.delete(tree.id);
      } else {
        isShaking = true;
        const decay = Math.exp(-elapsed * 3.2);
        const osc = Math.cos(elapsed * 26.0) * shake.intensity * decay * 5.5;
        const perpOsc = Math.sin(elapsed * 19.0) * shake.intensity * decay * 2.2;
        swayX += shake.dirX * osc - shake.dirY * perpOsc;
        swayY += shake.dirY * osc + shake.dirX * perpOsc;
      }
    }

    return { swayX, swayY, gustWave, isShaking };
  }

  private static spawnSingleDriftParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    season: string = 'summer',
    fromBurst: boolean = false
  ) {
    let kind: CanopyDriftParticle['kind'] = 'needle';
    let color = '#2d6a4f';
    let secondaryColor = '#1b4332';
    let size = 2.6;

    const r = Math.random();
    if (season === 'winter') {
      kind = r < 0.78 ? 'snow_puff' : 'needle';
      color = kind === 'snow_puff' ? 'rgba(241, 245, 249, 0.86)' : '#1e4620';
      secondaryColor = '#cbd5e1';
      size = kind === 'snow_puff' ? 3.8 + Math.random() * 3.2 : 2.4;
    } else if (season === 'autumn') {
      if (r < 0.52) {
        kind = 'leaf_birch';
        color = r < 0.26 ? '#f59e0b' : '#eab308';
        secondaryColor = '#b45309';
        size = 2.8 + Math.random() * 1.4;
      } else if (r < 0.84) {
        kind = 'leaf_maple';
        color = r < 0.68 ? '#dc2626' : '#ea580c';
        secondaryColor = '#991b1b';
        size = 3.2 + Math.random() * 1.6;
      } else {
        kind = 'needle';
        color = '#78350f';
        secondaryColor = '#451a03';
        size = 2.5;
      }
    } else if (season === 'spring') {
      if (r < 0.45 && !fromBurst) {
        kind = 'pollen';
        color = 'rgba(253, 224, 71, 0.78)';
        secondaryColor = 'rgba(254, 240, 138, 0.45)';
        size = 1.4 + Math.random() * 1.1;
      } else if (r < 0.78) {
        kind = 'catkin';
        color = '#a3e635';
        secondaryColor = '#65a30d';
        size = 2.6 + Math.random() * 1.0;
      } else {
        kind = 'leaf_birch';
        color = '#84cc16';
        secondaryColor = '#4d7c0f';
        size = 2.4 + Math.random() * 1.0;
      }
    } else {
      // Summer
      if (r < 0.36 && !fromBurst) {
        kind = 'pollen';
        color = 'rgba(254, 240, 138, 0.72)';
        secondaryColor = 'rgba(190, 242, 100, 0.40)';
        size = 1.3 + Math.random() * 1.0;
      } else if (r < 0.72) {
        kind = 'needle';
        color = r < 0.54 ? '#2d6a4f' : '#7c4a27';
        secondaryColor = '#1b4332';
        size = 2.6 + Math.random() * 1.0;
      } else {
        kind = 'leaf_birch';
        color = r < 0.86 ? '#65a30d' : '#eab308';
        secondaryColor = '#3f6212';
        size = 2.5 + Math.random() * 1.1;
      }
    }

    const p: CanopyDriftParticle = {
      active: true,
      x,
      y,
      vx,
      vy,
      altitude: fromBurst ? 18 + Math.random() * 14 : 22 + Math.random() * 16,
      vz: -(4.2 + Math.random() * 3.5),
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 4.5,
      size,
      color,
      secondaryColor,
      kind,
      life: 0,
      maxLife: fromBurst ? 2.4 + Math.random() * 1.8 : 3.8 + Math.random() * 2.8,
    };

    if (this.driftParticles.length < this.MAX_DRIFT_PARTICLES) {
      this.driftParticles.push(p);
    } else {
      const idx = this.driftParticles.findIndex((item) => !item.active);
      if (idx >= 0) this.driftParticles[idx] = p;
      else this.driftParticles[Math.floor(Math.random() * this.MAX_DRIFT_PARTICLES)] = p;
    }
  }

  /**
   * Layer 1 (Under-Canopy / Ground Overlay):
   * - Low-lying morning & post-rain woodland mist ribbons in forest hollows
   * - Swaying golden-emerald dappled sunlight patches ("солнечные зайчики") under tree crowns
   * - Interactive forest floor fauna (Red Squirrels, Woodland Hares, Roe Deer)
   */
  public static renderUnderCanopyAtmosphereAndFauna(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    player: Player | undefined,
    visibleVehicles: Vehicle[],
    vpTrees: Tree[],
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    timeHour: number,
    nightAlpha: number,
    cameraZoom: number
  ) {
    if (vpTrees.length < 3) return;

    const nowSec = typeof performance !== 'undefined' ? performance.now() * 0.001 : 0;
    const dt =
      this.lastUpdateSec > 0 ? Math.min(0.05, Math.max(0.004, nowSec - this.lastUpdateSec)) : 0.016;
    this.lastUpdateSec = nowSec;

    const season = world.calendar?.season || 'summer';
    const isWinter = season === 'winter';
    const weatherWeights = getEffectiveWeatherWeights(world);
    const sunState = getCurrentSunShadowState();

    // Check if vehicles brush closely past any visible trees to trigger physical branch shake
    for (let vIdx = 0; vIdx < visibleVehicles.length; vIdx++) {
      const v = visibleVehicles[vIdx];
      const vSpeed = Math.hypot(v.vx || 0, v.vy || 0) || Math.abs(v.speed || 0);
      if (vSpeed < 6) continue;
      const reach = (v.width || 20) * 0.5 + 16;
      for (let tIdx = 0; tIdx < vpTrees.length; tIdx++) {
        const t = vpTrees[tIdx];
        const dx = t.x - v.x;
        const dy = t.y - v.y;
        const dSq = dx * dx + dy * dy;
        const hitR = reach + (t.radius || 16) * 0.72;
        if (dSq < hitR * hitR) {
          this.triggerTreeShake(
            t.id,
            t.x,
            t.y,
            t.radius || 16,
            Math.min(1.2, vSpeed * 0.025),
            v.vx || Math.cos(v.angle),
            v.vy || Math.sin(v.angle),
            season
          );
        }
      }
    }

    ctx.save();

    // =========================================================================
    // 1. DAPPLED FOREST SUNLIGHT ("СОЛНЕЧНЫЕ ЗАЙЧИКИ" ПОД ПОЛОГОМ ЛЕСА)
    // =========================================================================
    const sunStrength = Math.max(
      0,
      (1.0 - nightAlpha * 1.45) * (1.0 - weatherWeights.rain * 0.85 - weatherWeights.overcast * 0.65)
    );
    if (sunStrength > 0.08 && cameraZoom > 0.35) {
      const dapplePath = new Path2D();
      const warmDapplePath = new Path2D();
      const maxDappleTrees = Math.min(vpTrees.length, 95);

      for (let i = 0; i < maxDappleTrees; i++) {
        const t = vpTrees[i];
        const r = Math.max(12, t.radius || 16);
        const phase = t.x * 0.019 + t.y * 0.023 + nowSec * 1.85;
        const swayShiftX = Math.cos(phase) * 2.8 + sunState.shadowDirX * (r * 0.35);
        const swayShiftY = Math.sin(phase * 0.9) * 2.8 + sunState.shadowDirY * (r * 0.35);

        // 3 filtering sunbeam spots per tree crown
        for (let s = 0; s < 3; s++) {
          const sAng = (s * Math.PI * 2) / 3 + (i % 7) * 0.45 + Math.sin(phase + s) * 0.18;
          const sDist = r * (0.34 + (s % 2) * 0.24);
          const sx = t.x + Math.cos(sAng) * sDist + swayShiftX;
          const sy = t.y + Math.sin(sAng) * sDist + swayShiftY;
          const spotRx = r * (0.22 + Math.sin(phase * 1.3 + s) * 0.04);
          const spotRy = spotRx * 0.72;

          if (s === 0) {
            warmDapplePath.moveTo(sx + spotRx * Math.cos(sAng), sy + spotRx * Math.sin(sAng));
            warmDapplePath.ellipse(sx, sy, spotRx, spotRy, sAng, 0, Math.PI * 2);
          } else {
            dapplePath.moveTo(sx + spotRx * Math.cos(sAng), sy + spotRx * Math.sin(sAng));
            dapplePath.ellipse(sx, sy, spotRx, spotRy, sAng, 0, Math.PI * 2);
          }
        }
      }

      const isGoldenHour = timeHour < 8.5 || timeHour > 17.2;
      ctx.fillStyle = isWinter
        ? `rgba(254, 249, 195, ${(0.11 * sunStrength).toFixed(3)})`
        : isGoldenHour
          ? `rgba(253, 224, 71, ${(0.14 * sunStrength).toFixed(3)})`
          : `rgba(190, 242, 100, ${(0.12 * sunStrength).toFixed(3)})`;
      ctx.fill(dapplePath);

      ctx.fillStyle = isGoldenHour
        ? `rgba(251, 191, 36, ${(0.16 * sunStrength).toFixed(3)})`
        : `rgba(254, 240, 138, ${(0.13 * sunStrength).toFixed(3)})`;
      ctx.fill(warmDapplePath);
    }

    // =========================================================================
    // 2. WOODLAND MORNING & POST-RAIN VALLEY MIST (ЛЕСНОЙ ТУМАН В НИЗИНАХ)
    // =========================================================================
    const isMorningMistWindow = timeHour >= 4.2 && timeHour <= 9.6;
    const isEveningMistWindow = timeHour >= 18.8 && timeHour <= 22.8;
    const mistIntensity = Math.min(
      0.42,
      (isMorningMistWindow ? 0.24 * (1.0 - Math.abs(timeHour - 6.8) / 2.8) : 0) +
        (isEveningMistWindow ? 0.16 * (1.0 - Math.abs(timeHour - 20.8) / 2.0) : 0) +
        (weatherWeights.isWetSurface ? 0.16 : 0) +
        weatherWeights.fog * 0.28
    );

    if (mistIntensity > 0.03 && vpTrees.length >= 6) {
      const mistStep = Math.min(22, vpTrees.length);
      for (let i = 0; i < mistStep; i++) {
        const t = vpTrees[(i * 3) % vpTrees.length];
        const driftX = t.x + Math.sin(nowSec * 0.22 + i * 1.7) * 28;
        const driftY = t.y + Math.cos(nowSec * 0.18 + i * 2.3) * 18;
        const mistR = 54 + (i % 4) * 18;
        const grad = ctx.createRadialGradient(driftX, driftY, 6, driftX, driftY, mistR);
        grad.addColorStop(0, `rgba(226, 232, 240, ${(mistIntensity * 0.55).toFixed(3)})`);
        grad.addColorStop(0.55, `rgba(203, 213, 225, ${(mistIntensity * 0.26).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(203, 213, 225, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(driftX, driftY, mistR * 1.35, mistR * 0.78, 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // =========================================================================
    // 3. FOREST FLOOR FAUNA: RED SQUIRRELS, HARES & ROE DEER
    // =========================================================================
    if (cameraZoom > 0.42) {
      this.updateAndRenderSquirrels(ctx, vpTrees, player, visibleVehicles, dt, nowSec);
      this.updateAndRenderForestMammals(ctx, vpTrees, player, visibleVehicles, dt, nowSec, isWinter);
    }

    // =========================================================================
    // 4. SUNLIT WOODLAND BUTTERFLIES & RIVER DRAGONFLIES (БАБОЧКИ И СТРЕКОЗЫ)
    // =========================================================================
    if (!isWinter && season !== 'autumn' && nightAlpha < 0.35 && weatherWeights.rain < 0.2 && cameraZoom > 0.45) {
      this.renderWoodlandButterflies(ctx, vpTrees, nowSec);
    }

    ctx.restore();
  }

  private static updateAndRenderSquirrels(
    ctx: CanvasRenderingContext2D,
    vpTrees: Tree[],
    player: Player | undefined,
    visibleVehicles: Vehicle[],
    dt: number,
    nowSec: number
  ) {
    // Deterministically anchor squirrels to every ~9th visible tree
    for (let i = 0; i < vpTrees.length; i++) {
      const t = vpTrees[i];
      const seed = Math.abs(Math.floor(t.x * 17 + t.y * 31));
      if (seed % 9 !== 0) continue;

      let sq = this.squirrels.get(seed);
      if (!sq) {
        if (this.squirrels.size > 48) {
          const firstKey = this.squirrels.keys().next().value;
          if (firstKey !== undefined) this.squirrels.delete(firstKey);
        }
        const startAng = (seed % 628) * 0.01;
        const startDist = (t.radius || 16) * 0.75 + 6;
        sq = {
          id: seed,
          homeTreeX: t.x,
          homeTreeY: t.y,
          homeTreeR: t.radius || 16,
          x: t.x + Math.cos(startAng) * startDist,
          y: t.y + Math.sin(startAng) * startDist,
          vx: 0,
          vy: 0,
          angle: startAng,
          state: 'foraging',
          timer: 1.5 + (seed % 5) * 0.6,
          stridePhase: 0,
          tailFlick: 0,
        };
        this.squirrels.set(seed, sq);
      }

      // Check threat distance (player or fast vehicle)
      let threatDist = Infinity;
      if (player && !player.isInsideBuilding) {
        threatDist = Math.hypot(player.x - sq.x, player.y - sq.y);
      }
      for (let v = 0; v < visibleVehicles.length; v++) {
        const veh = visibleVehicles[v];
        if (Math.abs(veh.speed || 0) > 4) {
          const d = Math.hypot(veh.x - sq.x, veh.y - sq.y);
          if (d < threatDist) threatDist = d;
        }
      }

      if (sq.state === 'up_in_crown') {
        sq.timer -= dt;
        if (sq.timer <= 0 && threatDist > 135) {
          sq.state = 'foraging';
          const outAng = Math.random() * Math.PI * 2;
          sq.x = sq.homeTreeX + Math.cos(outAng) * (sq.homeTreeR * 0.65);
          sq.y = sq.homeTreeY + Math.sin(outAng) * (sq.homeTreeR * 0.65);
          sq.timer = 2.0 + Math.random() * 3.0;
        }
        continue; // Hidden up in the pine boughs
      }

      if (threatDist < 90 && sq.state !== 'dashing_to_trunk') {
        sq.state = 'dashing_to_trunk';
      }

      if (sq.state === 'dashing_to_trunk') {
        const dx = sq.homeTreeX - sq.x;
        const dy = sq.homeTreeY - sq.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 5.5) {
          sq.state = 'up_in_crown';
          sq.timer = 6.0 + Math.random() * 5.0;
          continue;
        }
        const speed = 78;
        sq.vx = (dx / dist) * speed;
        sq.vy = (dy / dist) * speed;
        sq.x += sq.vx * dt;
        sq.y += sq.vy * dt;
        sq.angle = Math.atan2(sq.vy, sq.vx);
        sq.stridePhase += dt * 26;
      } else {
        // Foraging hops around tree base
        sq.timer -= dt;
        if (sq.timer <= 0) {
          if (Math.random() < 0.55) {
            const targetAng = Math.random() * Math.PI * 2;
            const targetDist = sq.homeTreeR * (0.55 + Math.random() * 0.75);
            const tx = sq.homeTreeX + Math.cos(targetAng) * targetDist;
            const ty = sq.homeTreeY + Math.sin(targetAng) * targetDist;
            const dx = tx - sq.x;
            const dy = ty - sq.y;
            const len = Math.hypot(dx, dy) || 1;
            sq.vx = (dx / len) * 32;
            sq.vy = (dy / len) * 32;
            sq.angle = Math.atan2(sq.vy, sq.vx);
            sq.timer = 0.45 + Math.random() * 0.65;
          } else {
            sq.vx = 0;
            sq.vy = 0;
            sq.timer = 1.2 + Math.random() * 2.2;
          }
        }
        sq.x += sq.vx * dt;
        sq.y += sq.vy * dt;
        sq.vx *= 1 - dt * 4.5;
        sq.vy *= 1 - dt * 4.5;
        if (Math.hypot(sq.vx, sq.vy) > 3) {
          sq.stridePhase += dt * 18;
        }
      }

      // Render Red Squirrel (Рыжая лесная белка с пушистым хвостом)
      ctx.save();
      ctx.translate(sq.x, sq.y);
      ctx.rotate(sq.angle);

      const hopStretch = Math.hypot(sq.vx, sq.vy) > 4 ? 1.0 + Math.sin(sq.stridePhase) * 0.18 : 1.0;
      const tailSway = Math.sin(nowSec * 6.5 + sq.id) * 0.22;

      // Ground shadow
      ctx.fillStyle = 'rgba(10, 24, 14, 0.34)';
      ctx.beginPath();
      ctx.ellipse(0, 0.8, 3.2 * hopStretch, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bushy curved rufous tail
      ctx.fillStyle = '#9a3412';
      ctx.beginPath();
      ctx.ellipse(-2.8, tailSway * 1.5, 2.7, 1.45, tailSway, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.ellipse(-2.5, tailSway * 1.2, 2.1, 1.05, tailSway, 0, Math.PI * 2);
      ctx.fill();

      // Torso
      ctx.fillStyle = '#c2410c';
      ctx.beginPath();
      ctx.ellipse(0.4, 0, 2.3 * hopStretch, 1.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head & tufted ears
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(2.3 * hopStretch, 0, 1.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(1.8 * hopStretch, -1.25, 0.9, 0.5);
      ctx.fillRect(1.8 * hopStretch, 0.75, 0.9, 0.5);

      ctx.restore();
    }
  }

  private static updateAndRenderForestMammals(
    ctx: CanvasRenderingContext2D,
    vpTrees: Tree[],
    player: Player | undefined,
    visibleVehicles: Vehicle[],
    dt: number,
    nowSec: number,
    isWinter: boolean
  ) {
    // Deterministically anchor hares & roe deer to glade trees
    for (let i = 0; i < vpTrees.length; i++) {
      const t = vpTrees[i];
      const seed = Math.abs(Math.floor(t.x * 23 + t.y * 41));
      if (seed % 29 !== 0) continue;

      const isDeer = seed % 58 === 0;
      let m = this.mammals.get(seed);
      if (!m) {
        if (this.mammals.size > 24) {
          const firstKey = this.mammals.keys().next().value;
          if (firstKey !== undefined) this.mammals.delete(firstKey);
        }
        const gladeOffsetAng = (seed % 360) * (Math.PI / 180);
        const gx = t.x + Math.cos(gladeOffsetAng) * 34;
        const gy = t.y + Math.sin(gladeOffsetAng) * 34;
        m = {
          id: seed,
          species: isDeer ? 'roe_deer' : 'hare',
          homeX: gx,
          homeY: gy,
          x: gx,
          y: gy,
          vx: 0,
          vy: 0,
          angle: gladeOffsetAng,
          state: 'grazing',
          timer: 2.0 + (seed % 7) * 0.5,
          stridePhase: 0,
        };
        this.mammals.set(seed, m);
      }

      // Threat check
      let threatX = 0;
      let threatY = 0;
      let minThreatDist = Infinity;

      if (player && !player.isInsideBuilding) {
        const d = Math.hypot(player.x - m.x, player.y - m.y);
        if (d < minThreatDist) {
          minThreatDist = d;
          threatX = player.x;
          threatY = player.y;
        }
      }
      for (let v = 0; v < visibleVehicles.length; v++) {
        const veh = visibleVehicles[v];
        const d = Math.hypot(veh.x - m.x, veh.y - m.y);
        const effectiveDist = Math.abs(veh.speed || 0) > 8 ? d * 0.72 : d;
        if (effectiveDist < minThreatDist) {
          minThreatDist = effectiveDist;
          threatX = veh.x;
          threatY = veh.y;
        }
      }

      const scareRadius = m.species === 'roe_deer' ? 165 : 125;
      if (minThreatDist < scareRadius) {
        m.state = 'fleeing';
        const awayX = m.x - threatX;
        const awayY = m.y - threatY;
        const len = Math.hypot(awayX, awayY) || 1;
        const fleeSpeed = m.species === 'roe_deer' ? 118 : 96;
        m.vx = (awayX / len) * fleeSpeed;
        m.vy = (awayY / len) * fleeSpeed;
        m.angle = Math.atan2(m.vy, m.vx);
        m.timer = 2.6;
      }

      if (m.state === 'fleeing') {
        m.timer -= dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.stridePhase += dt * 22;

        // Stamp real trampled grass trail as the deer or hare bounds through the forest!
        if (this.trampleCallback && Math.floor(m.stridePhase) !== Math.floor(m.stridePhase - dt * 22)) {
          const spd = Math.hypot(m.vx, m.vy) || 1;
          this.trampleCallback(
            m.x,
            m.y,
            m.species === 'roe_deer' ? 3.6 : 2.6,
            m.vx / spd,
            m.vy / spd,
            nowSec
          );
        }

        if (m.timer <= 0) {
          m.state = 'grazing';
          m.vx = 0;
          m.vy = 0;
          m.timer = 3.5;
        }
      } else {
        m.timer -= dt;
        if (m.timer <= 0) {
          if (Math.random() < 0.45) {
            // Gentle grazing step back toward home glade
            const dx = m.homeX + (Math.random() - 0.5) * 45 - m.x;
            const dy = m.homeY + (Math.random() - 0.5) * 45 - m.y;
            const len = Math.hypot(dx, dy) || 1;
            const walkSpd = m.species === 'roe_deer' ? 18 : 14;
            m.vx = (dx / len) * walkSpd;
            m.vy = (dy / len) * walkSpd;
            m.angle = Math.atan2(m.vy, m.vx);
            m.timer = 1.2 + Math.random() * 1.8;
          } else {
            m.vx = 0;
            m.vy = 0;
            m.timer = 2.5 + Math.random() * 3.5;
          }
        }
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (Math.hypot(m.vx, m.vy) > 1.5) {
          m.stridePhase += dt * 9;
        }
      }

      const speed = Math.hypot(m.vx, m.vy);
      const stride = speed > 2 ? Math.sin(m.stridePhase) : 0;

      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.angle);

      if (m.species === 'hare') {
        // Woodland Hare (Заяц-русак / беляк зимой)
        const coatMain = isWinter ? '#f1f5f9' : '#855836';
        const coatBack = isWinter ? '#e2e8f0' : '#5c3a21';
        const stretch = 1.0 + Math.max(0, stride) * 0.25;

        ctx.fillStyle = 'rgba(10, 22, 12, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 1.2, 4.2 * stretch, 2.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fluffy white tail puff
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(-3.6 * stretch, 0, 1.15, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = coatMain;
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.6 * stretch, 2.0, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = coatBack;
        ctx.beginPath();
        ctx.ellipse(-0.3, 0, 2.4 * stretch, 1.25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head & long black-tipped ears
        ctx.fillStyle = coatMain;
        ctx.beginPath();
        ctx.ellipse(3.1 * stretch, 0, 1.65, 1.25, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = coatMain;
        ctx.lineWidth = 1.1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(2.4 * stretch, -0.6);
        ctx.lineTo(0.2 * stretch, -2.1);
        ctx.moveTo(2.4 * stretch, 0.6);
        ctx.lineTo(0.2 * stretch, 2.1);
        ctx.stroke();

        // Black ear tips
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0.2 * stretch, -2.1, 0.55, 0, Math.PI * 2);
        ctx.arc(0.2 * stretch, 2.1, 0.55, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Woodland Roe Deer (Лесная косуля с белым «зеркалом» и грациозной шеей)
        const coatCol = isWinter ? '#78716c' : '#9a5b32';
        const saddleCol = isWinter ? '#57534e' : '#7c431e';
        const headBob = speed < 2 ? Math.sin(nowSec * 1.8 + m.id) * 0.8 : stride * 1.4;

        // Ground shadow
        ctx.fillStyle = 'rgba(8, 22, 12, 0.42)';
        ctx.beginPath();
        ctx.ellipse(0, 2.0, 8.2, 4.0, 0, 0, Math.PI * 2);
        ctx.fill();

        // Legs during stride
        if (speed > 2) {
          ctx.strokeStyle = '#432818';
          ctx.lineWidth = 1.4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(4.0, -2.0);
          ctx.lineTo(4.0 + stride * 3.8, -2.4);
          ctx.moveTo(4.0, 2.0);
          ctx.lineTo(4.0 - stride * 3.8, 2.4);
          ctx.moveTo(-4.5, -2.0);
          ctx.lineTo(-4.5 - stride * 3.8, -2.4);
          ctx.moveTo(-4.5, 2.0);
          ctx.lineTo(-4.5 + stride * 3.8, 2.4);
          ctx.stroke();
        }

        // White rump patch ("зеркало" косули)
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(-6.8, 0, 1.6, 2.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // Slender deer torso
        ctx.fillStyle = coatCol;
        ctx.beginPath();
        ctx.ellipse(0, 0, 6.8, 3.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = saddleCol;
        ctx.beginPath();
        ctx.ellipse(-0.5, 0, 4.8, 2.0, 0, 0, Math.PI * 2);
        ctx.fill();

        // Neck & head
        ctx.strokeStyle = coatCol;
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(4.6, 0);
        ctx.lineTo(7.8 + headBob, 0);
        ctx.stroke();

        ctx.fillStyle = coatCol;
        ctx.beginPath();
        ctx.ellipse(8.4 + headBob, 0, 2.2, 1.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.fillStyle = saddleCol;
        ctx.beginPath();
        ctx.ellipse(6.8 + headBob, -1.7, 1.4, 0.65, -0.6, 0, Math.PI * 2);
        ctx.ellipse(6.8 + headBob, 1.7, 1.4, 0.65, 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Dark nose tip
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(10.3 + headBob, 0, 0.65, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private static renderWoodlandButterflies(
    ctx: CanvasRenderingContext2D,
    vpTrees: Tree[],
    nowSec: number
  ) {
    const lemonWings = new Path2D();
    const azureWings = new Path2D();
    const peacockWings = new Path2D();
    const bodyPath = new Path2D();

    const maxGladeSpots = Math.min(vpTrees.length, 65);
    for (let i = 0; i < maxGladeSpots; i += 3) {
      const t = vpTrees[i];
      const seed = Math.abs(Math.floor(t.x * 13 + t.y * 29));
      if (seed % 3 !== 0) continue;

      // Orbiting figure-8 flight path around sunlit edge of tree crown
      const orbitPhase = nowSec * (1.35 + (seed % 5) * 0.15) + seed;
      const r = (t.radius || 16) + 10;
      const bx = t.x + Math.cos(orbitPhase) * r + Math.sin(orbitPhase * 2.1) * 8;
      const by = t.y + Math.sin(orbitPhase * 0.85) * r + Math.cos(orbitPhase * 1.7) * 8;
      const heading = Math.atan2(
        Math.cos(orbitPhase * 0.85) * 0.85,
        -Math.sin(orbitPhase)
      );

      // Rapid wing flap modulation
      const wingSpan = 0.35 + Math.abs(Math.sin(nowSec * 16.5 + seed)) * 0.85;
      const cosH = Math.cos(heading);
      const sinH = Math.sin(heading);
      const nx = -sinH;
      const ny = cosH;

      const targetPath =
        seed % 3 === 0 ? lemonWings : seed % 3 === 1 ? azureWings : peacockWings;

      const wDist = 1.65 * wingSpan;
      const lx = bx + nx * wDist;
      const ly = by + ny * wDist;
      const rx = bx - nx * wDist;
      const ry = by - ny * wDist;

      targetPath.moveTo(lx + 1.4, ly);
      targetPath.ellipse(lx, ly, 1.5, 1.05 * wingSpan, heading + 0.3, 0, Math.PI * 2);
      targetPath.moveTo(rx + 1.4, ry);
      targetPath.ellipse(rx, ry, 1.5, 1.05 * wingSpan, heading - 0.3, 0, Math.PI * 2);

      bodyPath.moveTo(bx - cosH * 1.2, by - sinH * 1.2);
      bodyPath.lineTo(bx + cosH * 1.2, by + sinH * 1.2);
    }

    // Brimstone yellow butterfly (Лимонница)
    ctx.fillStyle = 'rgba(253, 224, 71, 0.92)';
    ctx.fill(lemonWings);
    // Common Blue butterfly (Голубянка икар)
    ctx.fillStyle = 'rgba(96, 165, 250, 0.92)';
    ctx.fill(azureWings);
    // Peacock / Tortoiseshell butterfly (Павлиний глаз / Крапивница)
    ctx.fillStyle = 'rgba(249, 115, 22, 0.92)';
    ctx.fill(peacockWings);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.7;
    ctx.stroke(bodyPath);
  }

  /**
   * Layer 2 (Over-Canopy / Above Trees & Lightmap):
   * - Drifting leaves, pine needles, spring birch catkins, and winter snow powder puffs
   * - Startled & spontaneous canopy bird flights between tree crowns
   * - Bioluminescent summer night fireflies glowing in the dark woods
   */
  public static renderOverCanopyEffects(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    vpTrees: Tree[],
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    timeHour: number,
    nightAlpha: number
  ) {
    if (vpTrees.length === 0 && this.driftParticles.length === 0 && this.canopyFlock.length === 0) {
      return;
    }

    const nowSec = typeof performance !== 'undefined' ? performance.now() * 0.001 : 0;
    const dt = 0.016;
    const season = world.calendar?.season || 'summer';
    const windAngle = world.wind?.angle ?? 0.45;
    const windSpeed = world.wind?.speed ?? 0.35;
    const wCos = Math.cos(windAngle);
    const wSin = Math.sin(windAngle);

    // 1. Spontaneously spawn wind-borne canopy particles from visible trees
    if (vpTrees.length >= 3 && nowSec - this.lastSpawnParticleSec > 0.09) {
      this.lastSpawnParticleSec = nowSec;
      const spawnCalls = season === 'autumn' ? 3 : 2;
      for (let s = 0; s < spawnCalls; s++) {
        const tree = vpTrees[Math.floor(Math.random() * vpTrees.length)];
        const r = tree.radius || 16;
        const ang = Math.random() * Math.PI * 2;
        const dist = Math.random() * r * 0.85;
        const baseSpd = (12 + windSpeed * 28) * (0.75 + Math.random() * 0.5);
        this.spawnSingleDriftParticle(
          tree.x + Math.cos(ang) * dist,
          tree.y + Math.sin(ang) * dist,
          wCos * baseSpd + (Math.random() - 0.5) * 10,
          wSin * baseSpd + (Math.random() - 0.5) * 10,
          season,
          false
        );
      }

      // Occasional spontaneous bird flight from one tree crown to another during daytime
      if (nightAlpha < 0.55 && vpTrees.length >= 8 && Math.random() < 0.045) {
        const srcTree = vpTrees[Math.floor(Math.random() * vpTrees.length)];
        this.spawnStartledCanopyBirds(srcTree.x, srcTree.y, 1 + (Math.random() < 0.35 ? 1 : 0));
      }
    }

    ctx.save();

    // =========================================================================
    // 2. UPDATE & RENDER DRIFTING CANOPY PARTICLES (ЛИСТЬЯ, ХВОЯ, СЕРЁЖКИ, КУХТА)
    // =========================================================================
    for (let i = 0; i < this.driftParticles.length; i++) {
      const p = this.driftParticles[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      // Helical fluttering spiral descent
      const flutter = Math.sin(p.life * 5.5 + i) * 12;
      p.x += (p.vx - wSin * flutter * 0.35) * dt;
      p.y += (p.vy + wCos * flutter * 0.35) * dt;
      p.altitude = Math.max(0, p.altitude + p.vz * dt);
      p.angle += p.spin * dt;

      if (p.x < minX - 60 || p.x > maxX + 60 || p.y < minY - 60 || p.y > maxY + 60) {
        continue;
      }

      const fadeIn = Math.min(1.0, p.life / 0.35);
      const fadeOut = Math.min(1.0, (p.maxLife - p.life) / 0.65);
      const alpha = fadeIn * fadeOut * (1.0 - nightAlpha * 0.55);
      if (alpha <= 0.04) continue;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      if (p.kind === 'snow_puff') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.arc(p.size * 0.6, -p.size * 0.3, p.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'pollen') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'needle') {
        // Pine needle V-pair (сдвоенная сосновая хвоинка)
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 0.95;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-p.size, 0);
        ctx.lineTo(p.size, -0.7);
        ctx.moveTo(-p.size, 0);
        ctx.lineTo(p.size * 0.9, 0.7);
        ctx.stroke();
      } else if (p.kind === 'catkin') {
        // Birch catkin (берёзовая серёжка)
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.15, p.size * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Tumbling birch or maple leaf
        const flip = 0.45 + 0.55 * Math.abs(Math.cos(p.life * 6.0 + i));
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.68 * flip, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = p.secondaryColor;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-p.size * 1.1, 0);
        ctx.lineTo(p.size * 0.8, 0);
        ctx.stroke();
      }

      ctx.restore();
    }

    // =========================================================================
    // 3. CANOPY BIRD FLOCKS (СОЙКИ, ДЯТЛЫ, СИНИЦЫ И ВОРОНЫ НАД КРОНАМИ)
    // =========================================================================
    for (let i = 0; i < this.canopyFlock.length; i++) {
      const b = this.canopyFlock[i];
      if (!b.active) continue;

      b.life += dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.wingPhase += dt * 24;

      const distToTarget = Math.hypot(b.targetX - b.x, b.targetY - b.y);
      if (distToTarget < 18 || b.life > 5.5) {
        b.active = false;
        continue;
      }

      if (b.x < minX - 80 || b.x > maxX + 80 || b.y < minY - 80 || b.y > maxY + 80) {
        continue;
      }

      const flyAngle = Math.atan2(b.vy, b.vx);
      const wingStroke = Math.sin(b.wingPhase);
      const scale = b.species === 'crow' ? 1.25 : b.species === 'jay' ? 1.12 : 0.92;

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(flyAngle);
      ctx.scale(scale, scale);

      // Soft shadow cast onto canopy below
      ctx.fillStyle = 'rgba(8, 18, 12, 0.28)';
      ctx.beginPath();
      ctx.ellipse(-6, 8, 3.2, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Species coloration
      const bodyCol =
        b.species === 'crow'
          ? '#1e293b'
          : b.species === 'jay'
            ? '#9a6b56'
            : b.species === 'woodpecker'
              ? '#0f172a'
              : '#eab308'; // titmouse yellow belly/back
      const wingCol =
        b.species === 'crow'
          ? '#0f172a'
          : b.species === 'jay'
            ? '#38bdf8' // bright azure jay wing flash!
            : b.species === 'woodpecker'
              ? '#f8fafc' // pied black-and-white woodpecker wings
              : '#334155';

      // Flapping wings
      const wSpan = 5.4 * (0.45 + 0.55 * Math.abs(wingStroke));
      const wSweep = -wingStroke * 1.4;
      ctx.fillStyle = wingCol;
      ctx.beginPath();
      ctx.moveTo(1.2, 0);
      ctx.lineTo(wSweep, -wSpan);
      ctx.lineTo(-2.4, -0.8);
      ctx.lineTo(wSweep, wSpan);
      ctx.closePath();
      ctx.fill();

      // Bird body & tail
      ctx.fillStyle = bodyCol;
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.8, 1.25, 0, 0, Math.PI * 2);
      ctx.fill();

      if (b.species === 'woodpecker') {
        // Red crown cap of woodpecker (красная шапочка дятла)
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(2.3, 0, 0.85, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // =========================================================================
    // 4. BIOLUMINESCENT SUMMER NIGHT FIREFLIES (ЛЕСНЫЕ СВЕТЛЯЧКИ В СУМЕРКАХ И НОЧЬЮ)
    // =========================================================================
    if (season !== 'winter' && season !== 'autumn' && nightAlpha > 0.22 && vpTrees.length >= 4) {
      const fireflyAlphaBase = Math.min(1.0, (nightAlpha - 0.22) / 0.45);
      const count = Math.min(36, vpTrees.length);

      for (let i = 0; i < count; i++) {
        const t = vpTrees[(i * 2) % vpTrees.length];
        const seed = Math.abs(Math.floor(t.x * 19 + t.y * 37 + i * 53));
        const pulse = Math.sin(nowSec * (2.2 + (seed % 5) * 0.45) + seed);
        if (pulse < -0.15) continue;

        const glowAlpha = ((pulse + 0.15) / 1.15) * fireflyAlphaBase;
        const fx = t.x + Math.cos(nowSec * 0.65 + seed) * ((t.radius || 16) + 12) + Math.sin(nowSec * 1.4 + i) * 7;
        const fy = t.y + Math.sin(nowSec * 0.58 + seed) * ((t.radius || 16) + 12) + Math.cos(nowSec * 1.2 + i) * 7;

        const grad = ctx.createRadialGradient(fx, fy, 0.5, fx, fy, 6.5);
        grad.addColorStop(0, `rgba(236, 252, 203, ${(glowAlpha * 0.95).toFixed(3)})`);
        grad.addColorStop(0.35, `rgba(163, 230, 53, ${(glowAlpha * 0.55).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(132, 204, 22, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(fx, fy, 6.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Computes local forest density around the camera/player and updates procedural 3D forest audio.
   */
  public static updateForestAudioForPlayer(
    world: GameWorld,
    player: Player | undefined,
    vpTrees: Tree[],
    cameraX: number,
    cameraY: number,
    timeHour: number,
    dt: number
  ) {
    if (player?.isInsideBuilding) {
      sound.updateForestAmbiance(0, 0, timeHour, world.calendar?.season || 'summer', false, false, dt);
      return;
    }

    let nearbyTrees = 0;
    for (let i = 0; i < vpTrees.length; i++) {
      const t = vpTrees[i];
      const dx = t.x - cameraX;
      const dy = t.y - cameraY;
      if (dx * dx + dy * dy < 380 * 380) {
        nearbyTrees++;
      }
    }

    const biome = getBiomeSampleAt(cameraX, cameraY);
    const biomeBoost = biome.forestWeight * 0.45 + biome.woodlandWeight * 0.25;
    const rawDensity = Math.min(1.0, nearbyTrees / 26 + biomeBoost);
    const windSpeed = world.wind?.speed ?? 0.35;
    const isWet = getEffectiveWeatherWeights(world).isWetSurface;
    const playerSpeed = player ? Math.hypot(player.vx || 0, player.vy || 0) || Math.abs(player.speed || 0) : 0;
    const isPlayerWalkingInForest =
      Boolean(player && !player.isInVehicle && !player.insideCarId && !player.insideBusId && playerSpeed > 1.8 && rawDensity > 0.32);

    sound.updateForestAmbiance(
      rawDensity,
      windSpeed,
      timeHour,
      world.calendar?.season || 'summer',
      isWet,
      isPlayerWalkingInForest,
      dt
    );
  }
}
