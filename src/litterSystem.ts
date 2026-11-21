import {
  Building,
  GameWorld,
  LitterItem,
  LitterSubtype,
  LitterType,
  Pedestrian,
  Player,
  Vehicle,
} from './types';
import { getCurrentSunShadowState, SunShadowState } from './shadowSystem';
import { getRiverWaterAt } from './riverSystem';
import { performanceConfig } from './performanceConfig';

export type LitterKinematicClass =
  | 'foliage_flutter' // Leaves, pine needles, catkins: high lift-to-mass, Andersen-Pesavento pendular swoop & helical autorotation
  | 'sheet_flutter'   // Paper, newspaper, surgical mask: broad sheet aerodynamics, multi-facet folding, capillary pavement adhesion
  | 'light_film'      // Plastic grocery bag, foil candy wrapper: ultra-low mass, ballooning drag, rapid turbulent eddy response
  | 'cylinder_roll'   // Aluminum can, PET/glass bottle, takeaway cup, coffee cup: anisotropic rolling perpendicular to cylinder axis
  | 'small_rod'       // Cigarette butt, woody twig, bark chip: low-profile ground tumbling & water floating
  | 'rigid_box'       // Corrugated cardboard box: moderate mass, sliding Coulomb friction, crushable under tires
  | 'heavy_flat';     // Dropped smartphone: high density, high sliding friction, screen glow & glass fracture under tires

export interface LitterPhysicalProfile {
  kinematicClass: LitterKinematicClass;
  massKg: number;            // Dry rest mass (kg)
  areaM2: number;            // Characteristic aerodynamic reference area (m^2)
  cdFlat: number;            // Normal face-on drag coefficient
  cdEdge: number;            // Tangential edge-on drag coefficient
  liftCoeff: number;         // Aerodynamic circulation / gliding lift coefficient
  flutterFreq: number;       // Natural pitch/roll oscillation frequency in flight (rad/s)
  flutterAmp: number;        // Lateral swoop amplitude during descent
  frictionStatic: number;    // Static ground friction threshold on dry pavement
  frictionKinetic: number;   // Kinetic sliding drag on ground
  rollingFriction: number;   // Rolling resistance perpendicular to cylinder axis (for cylinder_roll)
  restitution: number;       // Coefficient of restitution against walls, curbs & props (0..1)
  waterAbsorbency: number;   // Max fractional mass gain when soaked (0 = waterproof, 2.5 = heavy wet paper/leaf)
  buoyancy: number;          // 0 = sinks, 1 = floats high on water surface
  crushResistance: number;   // Tire vertical load threshold to deform/crush (0 = easily flattened, 1 = rigid)
}

const LITTER_PROFILES: Record<LitterType, LitterPhysicalProfile> = {
  leaf: {
    kinematicClass: 'foliage_flutter',
    massKg: 0.00045,
    areaM2: 0.0032,
    cdFlat: 1.95,
    cdEdge: 0.18,
    liftCoeff: 1.45,
    flutterFreq: 8.5,
    flutterAmp: 24.0,
    frictionStatic: 0.32,
    frictionKinetic: 2.8,
    rollingFriction: 2.4,
    restitution: 0.12,
    waterAbsorbency: 2.4,
    buoyancy: 0.92,
    crushResistance: 0.15,
  },
  paper: {
    kinematicClass: 'sheet_flutter',
    massKg: 0.0042,
    areaM2: 0.018,
    cdFlat: 1.75,
    cdEdge: 0.25,
    liftCoeff: 1.15,
    flutterFreq: 6.8,
    flutterAmp: 19.0,
    frictionStatic: 0.38,
    frictionKinetic: 3.1,
    rollingFriction: 2.2,
    restitution: 0.18,
    waterAbsorbency: 2.8,
    buoyancy: 0.78,
    crushResistance: 0.1,
  },
  newspaper: {
    kinematicClass: 'sheet_flutter',
    massKg: 0.022,
    areaM2: 0.068,
    cdFlat: 1.85,
    cdEdge: 0.22,
    liftCoeff: 1.25,
    flutterFreq: 5.4,
    flutterAmp: 21.0,
    frictionStatic: 0.44,
    frictionKinetic: 3.5,
    rollingFriction: 3.0,
    restitution: 0.12,
    waterAbsorbency: 3.2,
    buoyancy: 0.72,
    crushResistance: 0.1,
  },
  bag: {
    kinematicClass: 'light_film',
    massKg: 0.0038,
    areaM2: 0.045,
    cdFlat: 2.35,
    cdEdge: 0.45,
    liftCoeff: 1.55,
    flutterFreq: 4.8,
    flutterAmp: 28.0,
    frictionStatic: 0.28,
    frictionKinetic: 2.4,
    rollingFriction: 2.0,
    restitution: 0.15,
    waterAbsorbency: 0.15,
    buoyancy: 0.95,
    crushResistance: 0.05,
  },
  wrapper: {
    kinematicClass: 'light_film',
    massKg: 0.0014,
    areaM2: 0.0085,
    cdFlat: 1.65,
    cdEdge: 0.28,
    liftCoeff: 1.1,
    flutterFreq: 9.2,
    flutterAmp: 18.0,
    frictionStatic: 0.30,
    frictionKinetic: 2.6,
    rollingFriction: 1.9,
    restitution: 0.22,
    waterAbsorbency: 0.05,
    buoyancy: 0.96,
    crushResistance: 0.1,
  },
  mask: {
    kinematicClass: 'sheet_flutter',
    massKg: 0.0032,
    areaM2: 0.015,
    cdFlat: 1.8,
    cdEdge: 0.24,
    liftCoeff: 1.2,
    flutterFreq: 7.4,
    flutterAmp: 17.0,
    frictionStatic: 0.36,
    frictionKinetic: 3.0,
    rollingFriction: 2.5,
    restitution: 0.14,
    waterAbsorbency: 1.6,
    buoyancy: 0.85,
    crushResistance: 0.1,
  },
  butt: {
    kinematicClass: 'small_rod',
    massKg: 0.0008,
    areaM2: 0.0006,
    cdFlat: 1.1,
    cdEdge: 0.4,
    liftCoeff: 0.35,
    flutterFreq: 10.0,
    flutterAmp: 6.0,
    frictionStatic: 0.42,
    frictionKinetic: 3.4,
    rollingFriction: 1.4,
    restitution: 0.2,
    waterAbsorbency: 1.8,
    buoyancy: 0.88,
    crushResistance: 0.15,
  },
  cup: {
    kinematicClass: 'cylinder_roll',
    massKg: 0.013,
    areaM2: 0.0095,
    cdFlat: 1.18,
    cdEdge: 0.55,
    liftCoeff: 0.35,
    flutterFreq: 4.5,
    flutterAmp: 6.0,
    frictionStatic: 0.34,
    frictionKinetic: 2.8,
    rollingFriction: 0.72,
    restitution: 0.34,
    waterAbsorbency: 0.65,
    buoyancy: 0.94,
    crushResistance: 0.25,
  },
  coffee: {
    kinematicClass: 'cylinder_roll',
    massKg: 0.018,
    areaM2: 0.0095,
    cdFlat: 1.15,
    cdEdge: 0.55,
    liftCoeff: 0.28,
    flutterFreq: 4.2,
    flutterAmp: 5.0,
    frictionStatic: 0.40,
    frictionKinetic: 3.1,
    rollingFriction: 0.82,
    restitution: 0.30,
    waterAbsorbency: 0.65,
    buoyancy: 0.90,
    crushResistance: 0.28,
  },
  can: {
    kinematicClass: 'cylinder_roll',
    massKg: 0.015,
    areaM2: 0.0078,
    cdFlat: 1.12,
    cdEdge: 0.48,
    liftCoeff: 0.22,
    flutterFreq: 4.0,
    flutterAmp: 4.0,
    frictionStatic: 0.32,
    frictionKinetic: 2.4,
    rollingFriction: 0.58,
    restitution: 0.46,
    waterAbsorbency: 0.0,
    buoyancy: 0.88,
    crushResistance: 0.38,
  },
  bottle: {
    kinematicClass: 'cylinder_roll',
    massKg: 0.032,
    areaM2: 0.012,
    cdFlat: 1.08,
    cdEdge: 0.42,
    liftCoeff: 0.20,
    flutterFreq: 3.6,
    flutterAmp: 3.5,
    frictionStatic: 0.36,
    frictionKinetic: 2.5,
    rollingFriction: 0.62,
    restitution: 0.44,
    waterAbsorbency: 0.0,
    buoyancy: 0.96,
    crushResistance: 0.42,
  },
  box: {
    kinematicClass: 'rigid_box',
    massKg: 0.11,
    areaM2: 0.032,
    cdFlat: 1.45,
    cdEdge: 0.95,
    liftCoeff: 0.25,
    flutterFreq: 2.8,
    flutterAmp: 3.0,
    frictionStatic: 0.58,
    frictionKinetic: 4.2,
    rollingFriction: 3.8,
    restitution: 0.22,
    waterAbsorbency: 2.2,
    buoyancy: 0.76,
    crushResistance: 0.32,
  },
  phone: {
    kinematicClass: 'heavy_flat',
    massKg: 0.185,
    areaM2: 0.011,
    cdFlat: 1.15,
    cdEdge: 0.25,
    liftCoeff: 0.08,
    flutterFreq: 2.0,
    flutterAmp: 1.0,
    frictionStatic: 0.68,
    frictionKinetic: 5.2,
    rollingFriction: 5.0,
    restitution: 0.28,
    waterAbsorbency: 0.0,
    buoyancy: 0.0,
    crushResistance: 0.55,
  },
};

interface CachedActiveVehicle {
  veh: Vehicle;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  cosA: number;
  sinA: number;
  dirSign: number;
  halfL: number;
  halfW: number;
  wakeRad: number;
  wakeRadSq: number;
}

const CANOPY_ALTITUDE_SPLIT = 14.0;
const MAX_DYNAMIC_FOLIAGE = 165;

export class LitterSystem {
  private static _activeVehicles: CachedActiveVehicle[] = [];
  private static _activePeds: Pedestrian[] = [];
  private static _activeJanitors: Pedestrian[] = [];
  private static _nearbyBuildings: Building[] = [];
  private static _groundLitterScratch: LitterItem[] = [];
  private static _canopyLitterScratch: LitterItem[] = [];
  private static _visibleCandidatesScratch: LitterItem[] = [];
  private static _lastCanopySpawnSec = 0;
  private static _dynamicSeq = 1;

  public static hashString(s: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  public static hash2D(x: number, y: number, salt: number = 0): number {
    const ix = Math.floor(x * 10) ^ salt;
    const iy = Math.floor(y * 10) ^ (salt * 131);
    let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  /**
   * Ensures every LitterItem (including raw items loaded from map.json) has deterministic
   * subtype, seed, secondaryColor, and 3D attitude angles initialized.
   */
  public static ensureInitialized(lit: LitterItem, season: string = 'summer'): void {
    if (lit.seed !== undefined && lit.subtype !== undefined) return;

    const h = lit.seed ?? (this.hashString(lit.id || '') ^ Math.floor(Math.abs(lit.x * 31 + lit.y * 17)));
    lit.seed = h;
    if (lit.pitch === undefined) lit.pitch = ((h & 255) / 255 - 0.5) * 0.25;
    if (lit.roll === undefined) lit.roll = (((h >> 8) & 255) / 255 - 0.5) * 0.25;
    if (lit.rollPhase === undefined) lit.rollPhase = ((h >> 16) & 255) * 0.025;
    if (lit.flutterPhase === undefined) lit.flutterPhase = (h & 1023) * 0.01;

    if (!lit.subtype) {
      if (lit.type === 'leaf') {
        const mod = h % 100;
        if (mod < 44) lit.subtype = 'leaf_birch';
        else if (mod < 78) lit.subtype = 'leaf_maple';
        else if (mod < 92) lit.subtype = 'leaf_oak';
        else if (mod < 97) lit.subtype = 'pine_needle';
        else lit.subtype = 'twig';

        // Assign rich botanical coloration if generic white/default color was in map.json
        if (!lit.color || lit.color === '#ffffff' || lit.color === '#22c55e') {
          const palette = this.pickBotanicalPalette(lit.subtype, season, (h % 997) / 997);
          lit.color = palette.primary;
          lit.secondaryColor = palette.secondary;
        } else if (!lit.secondaryColor) {
          lit.secondaryColor = '#3f6212';
        }
      } else if (lit.type === 'can') {
        const variants: LitterSubtype[] = ['can_cola', 'can_energy', 'can_citrus', 'can_gold'];
        lit.subtype = variants[h % variants.length];
      } else if (lit.type === 'bottle') {
        const variants: LitterSubtype[] = ['bottle_water', 'bottle_amber', 'bottle_emerald', 'bottle_cola'];
        lit.subtype = variants[h % variants.length];
      }
    }
  }

  public static pickBotanicalPalette(
    subtype: LitterSubtype,
    season: string,
    rand01: number
  ): { primary: string; secondary: string } {
    if (subtype === 'twig' || subtype === 'bark_chip') {
      return rand01 < 0.5
        ? { primary: '#5c3a21', secondary: '#3b2313' }
        : { primary: '#784b2a', secondary: '#452714' };
    }
    if (subtype === 'pine_needle') {
      if (season === 'autumn') {
        return rand01 < 0.55
          ? { primary: '#854d0e', secondary: '#451a03' }
          : { primary: '#3f6212', secondary: '#1a2e05' };
      }
      return rand01 < 0.65
        ? { primary: '#2d6a4f', secondary: '#1b4332' }
        : { primary: '#3f6212', secondary: '#14532d' };
    }
    if (subtype === 'catkin') {
      return { primary: '#a3e635', secondary: '#4d7c0f' };
    }
    if (season === 'autumn') {
      if (subtype === 'leaf_maple') {
        if (rand01 < 0.38) return { primary: '#dc2626', secondary: '#7f1d1d' };
        if (rand01 < 0.74) return { primary: '#ea580c', secondary: '#9a3412' };
        return { primary: '#eab308', secondary: '#a16207' };
      }
      if (subtype === 'leaf_oak') {
        if (rand01 < 0.5) return { primary: '#b45309', secondary: '#78350f' };
        return { primary: '#d97706', secondary: '#7c2d12' };
      }
      // Birch
      if (rand01 < 0.55) return { primary: '#f59e0b', secondary: '#b45309' };
      if (rand01 < 0.85) return { primary: '#eab308', secondary: '#854d0e' };
      return { primary: '#ca8a04', secondary: '#713f12' };
    }
    if (season === 'spring') {
      return rand01 < 0.6
        ? { primary: '#84cc16', secondary: '#3f6212' }
        : { primary: '#65a30d', secondary: '#365314' };
    }
    // Summer / default
    if (rand01 < 0.45) return { primary: '#65a30d', secondary: '#365314' };
    if (rand01 < 0.78) return { primary: '#4d7c0f', secondary: '#14532d' };
    if (rand01 < 0.92) return { primary: '#ca8a04', secondary: '#713f12' };
    return { primary: '#d97706', secondary: '#78350f' };
  }

  public static getProfile(lit: LitterItem): LitterPhysicalProfile {
    const base = LITTER_PROFILES[lit.type] || LITTER_PROFILES.paper;
    if (lit.type === 'leaf') {
      if (lit.subtype === 'twig' || lit.subtype === 'bark_chip') {
        return LITTER_PROFILES.butt;
      }
    }
    return base;
  }

  /**
   * Spawns a physical canopy foliage item (leaf, needle, catkin, twig) at tree crown altitude.
   * Uses a bounded recycling pool for `isDynamicFoliage` items so `world.litter` never grows unboundedly.
   */
  public static spawnCanopyFoliage(
    world: GameWorld,
    x: number,
    y: number,
    vx: number,
    vy: number,
    treeType: string = 'birch',
    season: string = 'summer',
    fromShakeBurst: boolean = false
  ): LitterItem | null {
    if (!world.litter) world.litter = [];

    const r = Math.random();
    let subtype: LitterSubtype = 'leaf_birch';
    let size = 4.2;

    if (treeType === 'pine' || treeType === 'spruce') {
      subtype = r < 0.82 ? 'pine_needle' : 'twig';
      size = subtype === 'pine_needle' ? 3.8 + Math.random() * 1.2 : 4.4 + Math.random() * 1.4;
    } else if (treeType === 'maple' || (season === 'autumn' && r > 0.52 && r < 0.86)) {
      subtype = 'leaf_maple';
      size = 4.5 + Math.random() * 1.5;
    } else if (treeType === 'oak' || r > 0.86) {
      subtype = r > 0.95 ? 'twig' : 'leaf_oak';
      size = 4.3 + Math.random() * 1.3;
    } else if (season === 'spring' && r < 0.35) {
      subtype = 'catkin';
      size = 3.8 + Math.random() * 1.0;
    } else {
      subtype = 'leaf_birch';
      size = 3.8 + Math.random() * 1.3;
    }

    const palette = this.pickBotanicalPalette(subtype, season, Math.random());
    const seq = this._dynamicSeq++;
    const nowSec = typeof performance !== 'undefined' ? performance.now() * 0.001 : 0;

    // Count existing dynamic foliage items and recycle oldest/distant one if at cap
    let dynCount = 0;
    let oldestIdx = -1;
    let oldestTime = Infinity;

    for (let i = 0; i < world.litter.length; i++) {
      const item = world.litter[i];
      if (item.isDynamicFoliage) {
        dynCount++;
        const st = item.spawnTime ?? 0;
        // Prefer recycling grounded dynamic items first
        const score = st + (item.isAirborne ? 120 : 0);
        if (score < oldestTime) {
          oldestTime = score;
          oldestIdx = i;
        }
      }
    }

    const targetItem: LitterItem =
      dynCount >= MAX_DYNAMIC_FOLIAGE && oldestIdx >= 0
        ? world.litter[oldestIdx]
        : ({} as LitterItem);

    targetItem.id = `foliage_dyn_${seq}`;
    targetItem.x = x;
    targetItem.y = y;
    targetItem.vx = vx;
    targetItem.vy = vy;
    targetItem.angle = Math.random() * Math.PI * 2;
    targetItem.rotationSpeed = (Math.random() - 0.5) * 6.5;
    targetItem.type = 'leaf';
    targetItem.subtype = subtype;
    targetItem.color = palette.primary;
    targetItem.secondaryColor = palette.secondary;
    targetItem.size = size;
    targetItem.isAirborne = true;
    targetItem.airborneTimer = fromShakeBurst ? 2.4 + Math.random() * 1.6 : 3.2 + Math.random() * 2.2;
    targetItem.altitude = fromShakeBurst ? 19 + Math.random() * 15 : 24 + Math.random() * 16;
    targetItem.vz = -(4.5 + Math.random() * 4.0);
    targetItem.wetness = 0;
    targetItem.crushed = 0;
    targetItem.flutterPhase = Math.random() * Math.PI * 2;
    targetItem.seed = seq * 7919;
    targetItem.pitch = (Math.random() - 0.5) * 0.6;
    targetItem.roll = (Math.random() - 0.5) * 0.6;
    targetItem.pitchVel = (Math.random() - 0.5) * 4.0;
    targetItem.rollVel = (Math.random() - 0.5) * 4.0;
    targetItem.rollPhase = 0;
    targetItem.inWater = false;
    targetItem.isDynamicFoliage = true;
    targetItem.spawnTime = nowSec;
    targetItem.washDuration = 0;
    targetItem.sleeping = false;

    if (!(dynCount >= MAX_DYNAMIC_FOLIAGE && oldestIdx >= 0)) {
      world.litter.push(targetItem);
    }

    return targetItem;
  }

  /**
   * Spawns a burst of real physical leaves/needles/twigs when a vehicle or player shakes a tree.
   */
  public static spawnTreeCrownBurst(
    world: GameWorld | undefined,
    treeX: number,
    treeY: number,
    treeRadius: number,
    intensity: number,
    dirX: number,
    dirY: number,
    season: string = 'summer',
    treeType: string = 'birch'
  ): void {
    if (!world || season === 'winter') return;
    const count = Math.min(14, Math.floor(4 + intensity * 8));
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.random() * treeRadius * 0.85;
      const px = treeX + Math.cos(ang) * dist;
      const py = treeY + Math.sin(ang) * dist;
      const pushSpd = 16 + Math.random() * 26 * intensity;
      this.spawnCanopyFoliage(
        world,
        px,
        py,
        dirX * pushSpd + (Math.random() - 0.5) * 24,
        dirY * pushSpd + (Math.random() - 0.5) * 24,
        treeType,
        season,
        true
      );
    }
  }

  /**
   * Spills real physical trash items when a street trash can or dumpster is impacted by a vehicle.
   */
  public static spawnTrashCanSpill(
    world: GameWorld,
    x: number,
    y: number,
    impactVx: number,
    impactVy: number,
    count: number = 5
  ): void {
    if (!world.litter) world.litter = [];
    const spillPool: Array<{ type: LitterType; size: number; color: string }> = [
      { type: 'can', size: 4.2, color: '#ef4444' },
      { type: 'bottle', size: 4.6, color: '#38bdf8' },
      { type: 'cup', size: 4.2, color: '#f8fafc' },
      { type: 'paper', size: 5.2, color: '#f8fafc' },
      { type: 'wrapper', size: 4.0, color: '#f59e0b' },
      { type: 'newspaper', size: 7.2, color: '#f1f5f9' },
      { type: 'bag', size: 5.6, color: '#e11d48' },
      { type: 'butt', size: 2.8, color: '#f8fafc' },
    ];

    const nowSec = typeof performance !== 'undefined' ? performance.now() * 0.001 : 0;
    for (let i = 0; i < count; i++) {
      const tpl = spillPool[(this._dynamicSeq + i) % spillPool.length];
      const spreadAng = Math.atan2(impactVy, impactVx) + (Math.random() - 0.5) * 1.4;
      const spd = Math.hypot(impactVx, impactVy) * (0.35 + Math.random() * 0.45) + 25 + Math.random() * 40;
      const item: LitterItem = {
        id: `spill_trash_${this._dynamicSeq++}`,
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(spreadAng) * spd,
        vy: Math.sin(spreadAng) * spd,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 14,
        type: tpl.type,
        color: tpl.color,
        size: tpl.size,
        isAirborne: true,
        airborneTimer: 0.55 + Math.random() * 0.55,
        altitude: 5 + Math.random() * 8,
        vz: 18 + Math.random() * 24,
        isDynamicFoliage: true,
        spawnTime: nowSec,
        sleeping: false,
      };
      this.ensureInitialized(item, world.calendar?.season || 'summer');
      world.litter.push(item);
    }
  }

  /**
   * Main first-principles physics step for all unified leaves, canopy foliage, and street trash.
   */
  public static update(
    world: GameWorld,
    player: Player,
    dt: number,
    wind: { vx: number; vy: number; speed: number; angle: number; gust?: number },
    rainAmt: number,
    vehGrid?: any
  ): void {
    if (!world.litter) return;

    const season = world.calendar?.season || 'summer';
    const nowSec = typeof performance !== 'undefined' ? performance.now() * 0.001 : 0;
    const wSpd = wind.speed * (wind.gust ?? 1.0);
    const wCos = Math.cos(wind.angle);
    const wSin = Math.sin(wind.angle);

    // 1. Spontaneous wind-driven canopy leaf shedding from nearby trees
    const spawnInterval = season === 'autumn' ? 0.14 : 0.28;
    if (season !== 'winter' && nowSec - this._lastCanopySpawnSec > spawnInterval && world.trees && world.trees.length > 0) {
      this._lastCanopySpawnSec = nowSec;
      // Pick 1-2 random trees near player
      const attempts = season === 'autumn' ? 3 : 2;
      for (let a = 0; a < attempts; a++) {
        const t = world.trees[Math.floor(Math.random() * world.trees.length)];
        const dxT = t.x - player.x;
        const dyT = t.y - player.y;
        if (dxT * dxT + dyT * dyT < 950 * 950) {
          const r = t.radius || 16;
          const ang = Math.random() * Math.PI * 2;
          const dist = Math.random() * r * 0.85;
          const driftSpd = (10 + wSpd * 0.75) * (0.75 + Math.random() * 0.5);
          this.spawnCanopyFoliage(
            world,
            t.x + Math.cos(ang) * dist,
            t.y + Math.sin(ang) * dist,
            wCos * driftSpd + (Math.random() - 0.5) * 12,
            wSin * driftSpd + (Math.random() - 0.5) * 12,
            t.type || 'birch',
            season,
            false
          );
        }
      }
    }

    if (world.litter.length === 0) return;

    // 2. Pre-filter active nearby vehicles, pedestrians, janitors, and buildings once per frame
    const activeVehicles = this._activeVehicles;
    activeVehicles.length = 0;
    const rawVehicles: Vehicle[] = vehGrid
      ? vehGrid.queryRadius(player.x, player.y, 1450)
      : world.vehicles;

    for (let i = 0; i < rawVehicles.length; i++) {
      const v = rawVehicles[i];
      const dx = v.x - player.x;
      const dy = v.y - player.y;
      if (dx * dx + dy * dy > 2250000) continue;
      const spd = Math.abs(v.speed);
      if (spd < 1.5 && v.isParked) continue;
      const halfL = (v.length || 48) * 0.5;
      const halfW = (v.width || 22) * 0.5;
      const wakeRad = halfL * 2.4 + Math.min(48, spd * 0.35);
      activeVehicles.push({
        veh: v,
        x: v.x,
        y: v.y,
        vx: v.vx || Math.cos(v.angle) * v.speed,
        vy: v.vy || Math.sin(v.angle) * v.speed,
        speed: spd,
        cosA: Math.cos(v.angle),
        sinA: Math.sin(v.angle),
        dirSign: v.speed >= 0 ? 1 : -1,
        halfL,
        halfW,
        wakeRad,
        wakeRadSq: wakeRad * wakeRad,
      });
    }

    const activePeds = this._activePeds;
    const activeJanitors = this._activeJanitors;
    activePeds.length = 0;
    activeJanitors.length = 0;
    if (world.pedestrians) {
      for (let i = 0; i < world.pedestrians.length; i++) {
        const ped = world.pedestrians[i];
        if (ped.isInsideBuilding) continue;
        const dx = ped.x - player.x;
        const dy = ped.y - player.y;
        if (dx * dx + dy * dy > 1440000) continue; // 1200px
        if (ped.isJanitor && ped.state === 'walking') {
          activeJanitors.push(ped);
        }
        if (ped.speed > 4) {
          activePeds.push(ped);
        }
      }
    }

    const nearbyBuildings = this._nearbyBuildings;
    nearbyBuildings.length = 0;
    if (world.buildings) {
      for (let i = 0; i < world.buildings.length; i++) {
        const b = world.buildings[i];
        if (b.type === 'gas_station_canopy') continue;
        const cx = b.x + b.width * 0.5;
        const cy = b.y + b.height * 0.5;
        const dx = cx - player.x;
        const dy = cy - player.y;
        if (dx * dx + dy * dy < 2500000) {
          nearbyBuildings.push(b);
        }
      }
    }

    // 3. Janitor Cleanup Pass
    if (activeJanitors.length > 0) {
      for (let i = world.litter.length - 1; i >= 0; i--) {
        const lit = world.litter[i];
        if (lit.isAirborne || (lit.altitude || 0) > 2) continue;
        for (let j = 0; j < activeJanitors.length; j++) {
          const jan = activeJanitors[j];
          const dx = jan.x - lit.x;
          const dy = jan.y - lit.y;
          if (dx * dx + dy * dy < 900) { // 30px
            world.litter.splice(i, 1);
            break;
          }
        }
      }
    }

    const pFootVx = !player.isInVehicle ? (player.vx || 0) : 0;
    const pFootVy = !player.isInVehicle ? (player.vy || 0) : 0;
    const pFootSpd = Math.hypot(pFootVx, pFootVy);

    // 4. Individual Item First-Principles Physics Solver
    for (let i = 0; i < world.litter.length; i++) {
      const lit = world.litter[i];
      const dxP = lit.x - player.x;
      const dyP = lit.y - player.y;
      const distSqP = dxP * dxP + dyP * dyP;

      // Skip distant grounded litter outside active 1500px simulation bubble
      if (!lit.isAirborne && distSqP > 2250000) continue;

      this.ensureInitialized(lit, season);
      const profile = this.getProfile(lit);

      // Update surface moisture & capillary water film
      if (lit.inWater) {
        lit.wetness = 1.0;
      } else if (rainAmt > 0.05) {
        lit.wetness = Math.min(1.0, (lit.wetness ?? 0) + dt * 0.14 * rainAmt);
      } else {
        lit.wetness = Math.max(0, (lit.wetness ?? 0) - dt * 0.025);
      }

      const wet = lit.wetness ?? 0;
      const crushed = lit.crushed ?? 0;
      const effectiveMassKg = profile.massKg * (1.0 + wet * profile.waterAbsorbency);
      // Capillary adhesion anchors wet flat sheets and leaves to wet asphalt
      const capillaryAdhesion =
        profile.kinematicClass === 'foliage_flutter' ||
        profile.kinematicClass === 'sheet_flutter' ||
        profile.kinematicClass === 'light_film'
          ? 1.0 - Math.min(0.84, wet * 0.88)
          : 1.0 - Math.min(0.35, wet * 0.35);

      const alt = lit.altitude || 0;
      const isAirborne = Boolean(lit.isAirborne || alt > 0.5);

      // Compute local wind sheltering behind buildings (leeward eddy trapping)
      let windShelter = 1.0;
      if (alt < 26) {
        for (let bi = 0; bi < nearbyBuildings.length; bi++) {
          const b = nearbyBuildings[bi];
          // Check if item is near building perimeter or leeward shadow
          if (
            lit.x >= b.x - 28 &&
            lit.x <= b.x + b.width + 28 &&
            lit.y >= b.y - 28 &&
            lit.y <= b.y + b.height + 28
          ) {
            // Item is right along a building wall/curb recess -> strong eddy wind reduction
            windShelter = 0.22;
            break;
          }
          // Check upwind ray (22px upwind)
          const upX = lit.x - wCos * 26;
          const upY = lit.y - wSin * 26;
          if (upX >= b.x && upX <= b.x + b.width && upY >= b.y && upY <= b.y + b.height) {
            windShelter = Math.min(windShelter, 0.35);
          }
        }
      }

      const localWindSpd = wSpd * windShelter;
      const localWindVx = wind.vx * windShelter;
      const localWindVy = wind.vy * windShelter;

      // =======================================================================
      // A. 3D AIRBORNE AERODYNAMICS (ANDERSEN-PESAVENTO FALLING LEAF & FLUTTER)
      // =======================================================================
      if (isAirborne && !lit.inWater) {
        lit.sleeping = false;
        const aeroRatio = (profile.areaM2 * profile.cdFlat) / Math.max(0.0002, effectiveMassKg);
        const windCoupling = Math.min(4.8, aeroRatio * 0.42);

        // 1. Horizontal wind advection + turbulent spatial curl
        lit.vx += (localWindVx - lit.vx) * Math.min(1.0, windCoupling * dt);
        lit.vy += (localWindVy - lit.vy) * Math.min(1.0, windCoupling * dt);

        // 2. Andersen-Pesavento pendular flutter & gliding slip for leaves/sheets/films
        const flutterRate = profile.flutterFreq * (0.85 + Math.min(1.2, localWindSpd * 0.015));
        lit.flutterPhase = (lit.flutterPhase ?? 0) + flutterRate * dt;
        const phase = lit.flutterPhase + (lit.seed ?? 0) * 0.001;

        if (
          profile.kinematicClass === 'foliage_flutter' ||
          profile.kinematicClass === 'sheet_flutter' ||
          profile.kinematicClass === 'light_film'
        ) {
          // Coupled pitch & roll oscillation produces side-to-side swooping glide
          const targetRoll = Math.sin(phase) * (0.58 + Math.min(0.45, localWindSpd * 0.008));
          const targetPitch = Math.cos(phase * 0.78) * 0.48;
          lit.roll = (lit.roll ?? 0) + (targetRoll - (lit.roll ?? 0)) * Math.min(1.0, 9.0 * dt);
          lit.pitch = (lit.pitch ?? 0) + (targetPitch - (lit.pitch ?? 0)) * Math.min(1.0, 9.0 * dt);

          // Gliding side-slip acceleration perpendicular to wind + circulation lift
          const swoopWave = Math.sin(phase);
          const glideMag = profile.flutterAmp * (0.7 + Math.min(1.3, Math.abs(lit.vz || 10) * 0.04));
          const perpX = -wSin * Math.cos(lit.angle) + wCos * 0.35;
          const perpY =  wCos * Math.sin(lit.angle) + wSin * 0.35;
          lit.vx += (-wSin * swoopWave * glideMag + perpX * swoopWave * 8.0) * dt;
          lit.vy += ( wCos * swoopWave * glideMag + perpY * swoopWave * 8.0) * dt;

          // Aerodynamic yaw torque aligns and oscillates blade heading
          lit.rotationSpeed += Math.cos(phase * 1.15) * 3.8 * dt;
        } else {
          // Tumbling ballistic spin in flight
          lit.pitch = ((lit.pitch ?? 0) + (lit.pitchVel ?? 3.0) * dt) % (Math.PI * 2);
          lit.roll = ((lit.roll ?? 0) + (lit.rollVel ?? 2.5) * dt) % (Math.PI * 2);
        }

        // 3. Vertical Z equation of motion: Gravity vs Aerodynamic Drag & Updraft Lift
        // Terminal descent speed depends on effective mass / drag area and inclination cos(pitch)*cos(roll)
        const tiltCos = Math.max(0.28, Math.abs(Math.cos(lit.pitch ?? 0) * Math.cos(lit.roll ?? 0)));
        const terminalVz = Math.max(
          5.5,
          Math.min(72.0, 14.5 / Math.sqrt(Math.max(0.15, aeroRatio * 0.18 * tiltCos)))
        );
        const gustUpdraft =
          profile.liftCoeff *
          (Math.max(0, localWindSpd - 16) * 0.38 + Math.sin(phase * 1.3) * 7.5) *
          capillaryAdhesion;
        const gravityAccel = 56.0;

        lit.vz = (lit.vz ?? -8.0) + (gustUpdraft - gravityAccel) * dt;
        // Quadratic vertical drag clamping toward terminal velocity
        if (lit.vz < -terminalVz) {
          lit.vz += (-terminalVz - lit.vz) * Math.min(1.0, 6.5 * dt);
        }

        lit.airborneTimer = Math.max(0, (lit.airborneTimer || 0) - dt);
        lit.altitude = Math.max(0, Math.min(48, alt + lit.vz * dt));

        // Ground touchdown
        if (lit.altitude <= 0.2 && lit.vz <= 0) {
          if (profile.restitution > 0.28 && Math.abs(lit.vz) > 16) {
            // Cans, bottles, phones bounce on hard pavement
            lit.altitude = 0.3;
            lit.vz = -lit.vz * profile.restitution;
            lit.vx *= 0.72;
            lit.vy *= 0.72;
            lit.rotationSpeed *= 0.75;
          } else {
            lit.altitude = 0;
            lit.vz = 0;
            lit.isAirborne = false;
            lit.airborneTimer = 0;
            lit.pitch = (lit.pitch ?? 0) * 0.25;
            lit.roll = (lit.roll ?? 0) * 0.25;
          }
        }
      } else {
        // =====================================================================
        // B. GROUNDED / FLOATING KINEMATICS (COULOMB FRICTION, ANISOTROPIC ROLL & LIFT)
        // =====================================================================
        lit.altitude = 0;
        lit.vz = 0;
        lit.isAirborne = false;

        // Check if resting on river water surface
        const riv = getRiverWaterAt(lit.x, lit.y);
        if (riv.inWater && !riv.isBridge && profile.buoyancy > 0.25) {
          lit.inWater = true;
          lit.sleeping = false;
          // Advect with river current + gentle eddy bobbing
          lit.vx += (riv.currentVx * 0.92 - lit.vx) * Math.min(1.0, 3.8 * dt);
          lit.vy += (riv.currentVy * 0.92 - lit.vy) * Math.min(1.0, 3.8 * dt);
          const waterSpin = Math.sin(nowSec * 1.8 + (lit.seed ?? 0)) * 0.65;
          lit.rotationSpeed += (waterSpin - lit.rotationSpeed) * Math.min(1.0, 2.5 * dt);
        } else {
          lit.inWater = false;

          // Wind boundary-layer shear on grounded litter
          const aeroMobility = (profile.areaM2 * profile.cdFlat) / Math.max(0.0003, effectiveMassKg);
          const staticWindThreshold =
            (18.0 * profile.frictionStatic) / Math.max(0.18, Math.min(2.8, aeroMobility * 0.22 * capillaryAdhesion));

          if (localWindSpd > staticWindThreshold) {
            lit.sleeping = false;
            lit.flutterPhase = (lit.flutterPhase ?? 0) + dt * (3.0 + localWindSpd * 0.08);
            const excessWind = localWindSpd - staticWindThreshold;
            const groundPush = excessWind * Math.min(1.2, aeroMobility * 0.085) * capillaryAdhesion;
            lit.vx += wCos * groundPush * dt;
            lit.vy += wSin * groundPush * dt;
            lit.rotationSpeed +=
              Math.sin(lit.x * 0.06 + lit.y * 0.05 + nowSec * 3.2) * (1.8 + excessWind * 0.05) * dt;

            // Aerodynamic ground-gust lift-off for dry leaves, paper, wrappers, bags & masks
            if (
              (profile.kinematicClass === 'foliage_flutter' ||
                profile.kinematicClass === 'sheet_flutter' ||
                profile.kinematicClass === 'light_film') &&
              capillaryAdhesion > 0.45 &&
              localWindSpd > staticWindThreshold * 1.65 &&
              Math.random() < 0.42 * dt
            ) {
              lit.isAirborne = true;
              lit.airborneTimer = 0.9 + Math.random() * 1.4;
              lit.altitude = 0.8;
              lit.vz = 18 + Math.min(28, excessWind * 0.55) + Math.random() * 12;
              lit.rotationSpeed = (Math.random() - 0.5) * 8.5;
            }
          }
        }
      }

      // =======================================================================
      // C. VEHICLE BOW-WAVE, 4-WHEEL TIRE CRUSHING & TRAILING KÁRMÁN VORTICES
      // =======================================================================
      for (let vi = 0; vi < activeVehicles.length; vi++) {
        const cv = activeVehicles[vi];
        const dx = lit.x - cv.x;
        const dy = lit.y - cv.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > cv.wakeRadSq) continue;

        lit.sleeping = false;
        // Transform into vehicle local coordinates (+relFwd = toward front of car)
        const relFwd = (dx * cv.cosA + dy * cv.sinA) * cv.dirSign;
        const relSide = -dx * cv.sinA + dy * cv.cosA;
        const absSide = Math.abs(relSide);

        // 1. Direct Underbody & 4-Wheel Tire Contact Check
        if (Math.abs(relFwd) <= cv.halfL + 4 && absSide <= cv.halfW + 3 && alt < 10) {
          // Check if directly under front or rear wheel tracks
          const wheelLon = cv.halfL * 0.62;
          const wheelLat = cv.halfW * 0.82;
          const underWheel =
            (Math.abs(Math.abs(relFwd) - wheelLon) < 7.5 && Math.abs(absSide - wheelLat) < 5.2);

          if (underWheel && cv.speed > 4) {
            // Tire crushing & tread ejection
            lit.crushed = Math.min(1.0, crushed + (1.0 - profile.crushResistance * 0.5) * 0.75);
            const ejectSpd = cv.speed * 0.55 + 18;
            lit.vx = -cv.cosA * cv.dirSign * ejectSpd + (Math.random() - 0.5) * 28;
            lit.vy = -cv.sinA * cv.dirSign * ejectSpd + (Math.random() - 0.5) * 28;
            lit.rotationSpeed = (Math.random() - 0.5) * 16;
          } else {
            // Bumper / underbody deflection outward
            const sideSign = relSide >= 0 ? 1 : -1;
            const outVx = -cv.sinA * sideSign;
            const outVy =  cv.cosA * sideSign;
            const push = cv.speed * 0.72 + 22;
            lit.vx += (cv.cosA * cv.dirSign * 0.45 + outVx * 0.85) * push * dt * 12;
            lit.vy += (cv.sinA * cv.dirSign * 0.45 + outVy * 0.85) * push * dt * 12;
            lit.rotationSpeed += sideSign * 10 * dt;
          }
        } else if (cv.speed > 14) {
          // 2. High-Speed Aerodynamic Bow-Wave & Rear Kármán Vortex Slipstream
          const dist = Math.sqrt(distSq) || 1;
          const falloff = Math.max(0, 1.0 - dist / cv.wakeRad);
          const sideSign = relSide >= 0 ? 1 : -1;
          const vDirX = cv.cosA * cv.dirSign;
          const vDirY = cv.sinA * cv.dirSign;
          const latX = -cv.sinA * sideSign;
          const latY =  cv.cosA * sideSign;

          const isLightAero =
            profile.kinematicClass === 'foliage_flutter' ||
            profile.kinematicClass === 'sheet_flutter' ||
            profile.kinematicClass === 'light_film';

          if (relFwd > cv.halfL * 0.3) {
            // Forward Bow-Wave pushes litter outward and ahead of the front bumper
            const bowStrength = (cv.speed * 0.65 + 14) * falloff * (isLightAero ? 1.15 : 0.42);
            lit.vx += (vDirX * 0.38 + latX * 0.92) * bowStrength * dt * 5.5;
            lit.vy += (vDirY * 0.38 + latY * 0.92) * bowStrength * dt * 5.5;
          } else {
            // Rear Slipstream & Twin Counter-Rotating Trailing Vortices behind the car!
            const vortexPhase = relFwd * 0.14 + nowSec * 11.0;
            const inwardPull = -Math.cos(vortexPhase) * 0.65 - 0.25;
            const wakeDrag = 0.82;
            const swirlForce =
              (cv.speed * 0.92 + 26) *
              falloff *
              (isLightAero ? capillaryAdhesion * 1.25 : profile.kinematicClass === 'cylinder_roll' ? 0.45 : 0.18);

            lit.vx += (vDirX * wakeDrag + latX * inwardPull) * swirlForce * dt * 6.5;
            lit.vy += (vDirY * wakeDrag + latY * inwardPull) * swirlForce * dt * 6.5;
            lit.rotationSpeed += sideSign * (7.5 + cv.speed * 0.1) * falloff * dt * 5.5;

            if (isLightAero && capillaryAdhesion > 0.3 && cv.speed > 20) {
              lit.isAirborne = true;
              lit.airborneTimer = Math.max(lit.airborneTimer || 0, 1.1 + Math.min(1.6, cv.speed * 0.016));
              lit.vz = Math.max(lit.vz ?? 0, 20 + cv.speed * 0.42 * falloff);
            }
          }
        }
      }

      // =======================================================================
      // D. PLAYER & NPC FOOTSTEP KICKS AND SPRINT SLIPSTREAM
      // =======================================================================
      if (!player.isInVehicle && alt < 12) {
        if (distSqP < 256 && distSqP > 0.01) { // < 16px direct foot kick
          lit.sleeping = false;
          const dP = Math.sqrt(distSqP);
          const kickDirX = pFootSpd > 8 ? (pFootVx / pFootSpd) * 0.72 + (dxP / dP) * 0.28 : dxP / dP;
          const kickDirY = pFootSpd > 8 ? (pFootVy / pFootSpd) * 0.72 + (dyP / dP) * 0.28 : dyP / dP;
          const kickMult =
            profile.kinematicClass === 'cylinder_roll'
              ? 1.25
              : profile.kinematicClass === 'heavy_flat'
                ? 0.45
                : 0.92;
          const kickMag = kickMult * (30 + pFootSpd * 1.05);
          lit.vx = kickDirX * kickMag;
          lit.vy = kickDirY * kickMag;
          lit.rotationSpeed = (Math.random() - 0.5) * 15;

          if (
            (profile.kinematicClass === 'foliage_flutter' ||
              profile.kinematicClass === 'sheet_flutter' ||
              profile.kinematicClass === 'light_film') &&
            capillaryAdhesion > 0.35
          ) {
            lit.isAirborne = true;
            lit.airborneTimer = 0.65 + Math.random() * 0.55;
            lit.vz = 18 + Math.min(28, pFootSpd * 0.28);
          }
        } else if (
          pFootSpd > 42 &&
          distSqP < 1444 &&
          (profile.kinematicClass === 'foliage_flutter' ||
            profile.kinematicClass === 'sheet_flutter' ||
            profile.kinematicClass === 'light_film')
        ) {
          // Sprint wake rustles dry leaves and wrappers behind the player's heels
          lit.sleeping = false;
          const dP = Math.sqrt(distSqP);
          const draft = (1.0 - dP / 38) * pFootSpd * 0.52 * capillaryAdhesion;
          lit.vx += ((pFootVx / pFootSpd) * 0.62 + (dxP / dP) * 0.38) * draft * dt * 5.5;
          lit.vy += ((pFootVy / pFootSpd) * 0.62 + (dyP / dP) * 0.38) * draft * dt * 5.5;
          lit.rotationSpeed += (Math.random() - 0.5) * 9 * dt;
        }
      }

      if (alt < 10) {
        for (let pi = 0; pi < activePeds.length; pi++) {
          const ped = activePeds[pi];
          const dxPed = lit.x - ped.x;
          const dyPed = lit.y - ped.y;
          const dSqPed = dxPed * dxPed + dyPed * dyPed;
          if (dSqPed < 225 && dSqPed > 0.01) {
            lit.sleeping = false;
            const dPed = Math.sqrt(dSqPed);
            const kickAngle = ped.angle + (Math.random() - 0.5) * 0.45;
            const kickPower =
              profile.kinematicClass === 'cylinder_roll'
                ? 52
                : profile.kinematicClass === 'foliage_flutter'
                  ? 36
                  : 28;
            lit.vx += Math.cos(kickAngle) * kickPower + (dxPed / dPed) * 14;
            lit.vy += Math.sin(kickAngle) * kickPower + (dyPed / dPed) * 14;
            lit.rotationSpeed += (Math.random() - 0.5) * 12;
            if (profile.kinematicClass === 'foliage_flutter' && capillaryAdhesion > 0.45) {
              lit.isAirborne = true;
              lit.airborneTimer = 0.55;
              lit.vz = 16;
            }
            break;
          }
        }
      }

      // =======================================================================
      // E. POSITION INTEGRATION, ANISOTROPIC CYLINDER ROLLING & WALL COLLISIONS
      // =======================================================================
      const spdSq = lit.vx * lit.vx + lit.vy * lit.vy;
      if (!lit.isAirborne && !lit.inWater && spdSq < 0.08 && Math.abs(lit.rotationSpeed) < 0.05) {
        lit.vx = 0;
        lit.vy = 0;
        lit.rotationSpeed = 0;
        lit.sleeping = true;
        continue;
      }

      lit.x += lit.vx * dt;
      lit.y += lit.vy * dt;
      lit.angle += lit.rotationSpeed * dt;

      if (!lit.isAirborne && !lit.inWater) {
        if (profile.kinematicClass === 'cylinder_roll') {
          // Anisotropic Cylinder Rolling Physics:
          // Cylinder axis is along (cosA, sinA); rolling direction is perpendicular (-sinA, cosA)
          const cosA = Math.cos(lit.angle);
          const sinA = Math.sin(lit.angle);
          const vAxial = lit.vx * cosA + lit.vy * sinA;
          const vRoll = -lit.vx * sinA + lit.vy * cosA;

          const axialDamp = Math.max(0, 1.0 - dt * (profile.frictionKinetic * 1.45));
          const rollDamp = Math.max(0, 1.0 - dt * (profile.rollingFriction * (1.0 + crushed * 1.8)));

          const newAxial = vAxial * axialDamp;
          const newRoll = vRoll * rollDamp;

          lit.vx = cosA * newAxial - sinA * newRoll;
          lit.vy = sinA * newAxial + cosA * newRoll;

          // Advance cylinder roll phase around its symmetry axis
          const cylRadius = Math.max(1.5, lit.size * 0.38);
          lit.rollPhase = ((lit.rollPhase ?? 0) + (newRoll * dt) / cylRadius) % (Math.PI * 2);
          lit.rotationSpeed *= Math.max(0, 1.0 - dt * 2.4);
        } else {
          // Isotropic ground sliding friction + wet capillary drag
          const groundDrag = profile.frictionKinetic + wet * 2.8;
          const damp = Math.max(0, 1.0 - dt * groundDrag);
          lit.vx *= damp;
          lit.vy *= damp;
          lit.rotationSpeed *= Math.max(0, 1.0 - dt * 3.0);
        }
      } else if (lit.isAirborne) {
        const airDamp = Math.max(0, 1.0 - dt * 1.05);
        lit.vx *= airDamp;
        lit.vy *= airDamp;
        lit.rotationSpeed *= Math.max(0, 1.0 - dt * 0.85);
      }

      // Building Wall Collision & Corner Eddy Trapping (for items below roof height)
      if ((lit.altitude || 0) < 28 && (Math.abs(lit.vx) > 0.3 || Math.abs(lit.vy) > 0.3)) {
        const r = Math.max(1.8, lit.size * 0.45);
        for (let bi = 0; bi < nearbyBuildings.length; bi++) {
          const b = nearbyBuildings[bi];
          if (
            lit.x + r > b.x &&
            lit.x - r < b.x + b.width &&
            lit.y + r > b.y &&
            lit.y - r < b.y + b.height
          ) {
            // Find nearest face of building AABB
            const penLeft = lit.x + r - b.x;
            const penRight = b.x + b.width - (lit.x - r);
            const penTop = lit.y + r - b.y;
            const penBottom = b.y + b.height - (lit.y - r);
            const minPen = Math.min(penLeft, penRight, penTop, penBottom);

            if (minPen === penLeft) {
              lit.x = b.x - r;
              if (lit.vx > 0) lit.vx = -lit.vx * profile.restitution;
              lit.vy *= 0.82;
            } else if (minPen === penRight) {
              lit.x = b.x + b.width + r;
              if (lit.vx < 0) lit.vx = -lit.vx * profile.restitution;
              lit.vy *= 0.82;
            } else if (minPen === penTop) {
              lit.y = b.y - r;
              if (lit.vy > 0) lit.vy = -lit.vy * profile.restitution;
              lit.vx *= 0.82;
            } else {
              lit.y = b.y + b.height + r;
              if (lit.vy < 0) lit.vy = -lit.vy * profile.restitution;
              lit.vx *= 0.82;
            }
            lit.rotationSpeed *= -0.5;
            break;
          }
        }
      }
    }
  }

  /**
   * Viewport-culls `world.litter` FIRST (so `litterLimit` applies to visible items in the camera frustum
   * rather than arbitrarily cutting off indices 0..N), and partitions into ground/low vs over-canopy items.
   */
  public static partitionForRender(
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): { groundLitter: LitterItem[]; canopyLitter: LitterItem[] } {
    const ground = this._groundLitterScratch;
    const canopy = this._canopyLitterScratch;
    const visible = this._visibleCandidatesScratch;
    ground.length = 0;
    canopy.length = 0;
    visible.length = 0;

    if (!world.litter || world.litter.length === 0) {
      return { groundLitter: ground, canopyLitter: canopy };
    }

    const season = world.calendar?.season || 'summer';
    const pad = 24;
    for (let i = 0; i < world.litter.length; i++) {
      const lit = world.litter[i];
      const alt = lit.altitude || 0;
      if (
        lit.x >= minX - pad &&
        lit.x <= maxX + pad &&
        lit.y - alt >= minY - pad &&
        lit.y <= maxY + pad
      ) {
        this.ensureInitialized(lit, season);
        visible.push(lit);
      }
    }

    const limit = Math.max(20, performanceConfig.litterLimit || 180);
    const startIdx = Math.max(0, visible.length - limit);

    for (let i = startIdx; i < visible.length; i++) {
      const lit = visible[i];
      if ((lit.altitude || 0) >= CANOPY_ALTITUDE_SPLIT) {
        canopy.push(lit);
      } else {
        ground.push(lit);
      }
    }

    return { groundLitter: ground, canopyLitter: canopy };
  }

  /**
   * Renders 3D sun-projected shadows for both low/grounded litter and high airborne canopy leaves.
   */
  public static renderUnifiedShadows(
    sCtx: CanvasRenderingContext2D,
    world: GameWorld,
    sunState: SunShadowState,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    pass: 'low' | 'high'
  ): void {
    if (!world.litter || world.litter.length === 0) return;
    const limit = Math.max(20, performanceConfig.litterLimit || 180);
    let drawn = 0;

    for (let i = world.litter.length - 1; i >= 0 && drawn < limit; i--) {
      const lit = world.litter[i];
      const alt = lit.altitude || 0;
      if (pass === 'low' && alt >= CANOPY_ALTITUDE_SPLIT) continue;
      if (pass === 'high' && alt < CANOPY_ALTITUDE_SPLIT) continue;
      if (lit.x < minX - 28 || lit.x > maxX + 28 || lit.y < minY - 28 || lit.y > maxY + 28) continue;

      drawn++;
      const z = 1.4 + alt;
      const sx = lit.x + sunState.castX * z;
      const sy = lit.y + sunState.castY * z;
      const r = Math.max(1.2, lit.size * 0.52);

      sCtx.save();
      sCtx.translate(sx, sy);
      sCtx.rotate(lit.angle);

      if (lit.type === 'can' || lit.type === 'bottle' || lit.type === 'cup' || lit.type === 'butt') {
        sCtx.beginPath();
        sCtx.ellipse(0, 0, r * 0.72, r * 1.15, 0, 0, Math.PI * 2);
        sCtx.fill();
      } else if (lit.type === 'box' || lit.type === 'newspaper' || lit.type === 'phone') {
        sCtx.fillRect(-r * 0.9, -r * 0.75, r * 1.8, r * 1.5);
      } else {
        const flutterScale = alt > 1 ? Math.max(0.35, Math.abs(Math.cos(lit.roll ?? 0))) : 0.78;
        sCtx.beginPath();
        sCtx.ellipse(0, 0, r * 1.05, r * flutterScale, 0, 0, Math.PI * 2);
        sCtx.fill();
      }
      sCtx.restore();
    }
  }

  /**
   * Renders a list of unified litter/foliage items (used for both Layer 8b Ground Litter and Layer 16e Over-Canopy Foliage).
   */
  public static renderLitterBatch(
    ctx: CanvasRenderingContext2D,
    items: LitterItem[],
    nightAlpha: number = 0
  ): void {
    if (!items || items.length === 0) return;

    const sunState = getCurrentSunShadowState();
    const sunLx = sunState.sunDirX ?? 0.42;
    const sunLy = sunState.sunDirY ?? 0.91;

    for (let i = 0; i < items.length; i++) {
      const lit = items[i];
      const alt = lit.altitude || 0;
      const renderY = lit.y - alt;
      const wet = lit.wetness ?? 0;
      const crushed = lit.crushed ?? 0;
      const seed = lit.seed ?? i;

      ctx.save();
      ctx.translate(lit.x, renderY);

      // 1. Contact Ambient Occlusion & Wet Capillary Meniscus Ring (or River Floating Meniscus)
      if (lit.inWater) {
        const mr = lit.size * 0.68;
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.28)';
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.ellipse(0, 0, mr * 1.1, mr * 0.85, lit.angle, 0, Math.PI * 2);
        ctx.stroke();
      } else if (alt < 1.5) {
        const aoR = lit.size * (0.58 + crushed * 0.16);
        ctx.fillStyle =
          wet > 0.15
            ? `rgba(6, 12, 22, ${(0.30 + wet * 0.24).toFixed(2)})`
            : 'rgba(10, 15, 24, 0.25)';
        ctx.beginPath();
        ctx.ellipse(-sunLx * 0.45, -sunLy * 0.45, aoR, aoR * 0.76, lit.angle, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.rotate(lit.angle);

      // 2. 3D Pitch/Roll Perspective Foreshortening in Flight or Tire-Crushed Flattening on Ground
      if (alt > 1.0) {
        const pitchCos = Math.max(0.42, Math.abs(Math.cos(lit.pitch ?? 0)));
        const rollCos = Math.max(0.36, Math.abs(Math.cos(lit.roll ?? (lit.flutterPhase ?? 0))));
        const altScale = 1.0 + Math.min(0.32, alt * 0.0075);
        ctx.scale(altScale * pitchCos, altScale * rollCos);
      } else if (crushed > 0.05) {
        ctx.scale(1.0 + crushed * 0.26, Math.max(0.62, 1.0 - crushed * 0.24));
      }

      const cosA = Math.cos(lit.angle);
      const sinA = Math.sin(lit.angle);
      const localSunX = sunLx * cosA + sunLy * sinA;
      const localSunY = -sunLx * sinA + sunLy * cosA;

      // 3. Dispatch to Redrawn High-Detail Botanical & Material Models
      switch (lit.type) {
        case 'leaf':
          this.drawBotanicalFoliageModel(
            ctx,
            lit.subtype || 'leaf_birch',
            lit.size,
            lit.color,
            lit.secondaryColor || '#3f6212',
            localSunX,
            localSunY,
            wet
          );
          break;
        case 'can':
          this.drawBeverageCanModel(ctx, lit, localSunX, localSunY, crushed);
          break;
        case 'bottle':
          this.drawBottleModel(ctx, lit, localSunX, localSunY, crushed);
          break;
        case 'cup':
          this.drawTakeawayCupModel(ctx, lit, localSunX, localSunY, crushed, false);
          break;
        case 'coffee':
          this.drawTakeawayCupModel(ctx, lit, localSunX, localSunY, crushed, true);
          break;
        case 'paper':
          this.drawCrumpledPaperModel(ctx, lit, localSunX, localSunY, wet, seed);
          break;
        case 'newspaper':
          this.drawNewspaperModel(ctx, lit, localSunX, localSunY, wet);
          break;
        case 'bag':
          this.drawPlasticBagModel(ctx, lit, localSunX, localSunY, alt > 1.0);
          break;
        case 'wrapper':
          this.drawFoilWrapperModel(ctx, lit, localSunX, localSunY, seed);
          break;
        case 'box':
          this.drawCardboardBoxModel(ctx, lit, localSunX, localSunY, wet, crushed);
          break;
        case 'mask':
          this.drawSurgicalMaskModel(ctx, lit, localSunX, localSunY, wet);
          break;
        case 'butt':
          this.drawCigaretteButtModel(ctx, lit, localSunX, localSunY);
          break;
        case 'phone':
          this.drawSmartphoneModel(ctx, lit, localSunX, localSunY, nightAlpha, crushed);
          break;
      }

      // 4. Wet Surface Fresnel Specular Glint
      if (wet > 0.22 && !lit.inWater) {
        ctx.fillStyle = `rgba(224, 242, 254, ${(wet * 0.42).toFixed(2)})`;
        ctx.beginPath();
        ctx.ellipse(localSunX * lit.size * 0.16, localSunY * lit.size * 0.12, 0.9, 0.45, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // ===========================================================================
  // REDRAWN BOTANICAL FOLIAGE MODELS (BIRCH, MAPLE, OAK, PINE NEEDLES, CATKIN, TWIG, BARK)
  // ===========================================================================
  public static drawBotanicalFoliageModel(
    ctx: CanvasRenderingContext2D,
    subtype: LitterSubtype,
    size: number,
    primaryColor: string,
    secondaryColor: string,
    localSunX: number,
    localSunY: number,
    wetness: number = 0
  ): void {
    const r = Math.max(2.0, size * 0.62);

    if (subtype === 'pine_needle') {
      // Paired pine needle fascicle in dark papery basal sheath (Пучок сосновой хвои)
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 0.85;
      ctx.lineCap = 'round';
      ctx.beginPath();
      // Left needle
      ctx.moveTo(-r * 1.15, 0);
      ctx.quadraticCurveTo(0, -r * 0.28, r * 1.25, -r * 0.48);
      // Right needle
      ctx.moveTo(-r * 1.15, 0);
      ctx.quadraticCurveTo(0, r * 0.24, r * 1.2, r * 0.45);
      // Middle needle
      ctx.moveTo(-r * 1.15, 0);
      ctx.lineTo(r * 1.1, -r * 0.04);
      ctx.stroke();

      // Dark brown basal fascicle sheath (чешуйчатое влагалище пучка)
      ctx.fillStyle = '#3b2313';
      ctx.beginPath();
      ctx.ellipse(-r * 1.05, 0, r * 0.28, r * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (subtype === 'catkin') {
      // Birch catkin with overlapping bract scales (Берёзовая серёжка)
      ctx.strokeStyle = '#4d7c0f';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-r * 1.25, -r * 0.15);
      ctx.lineTo(-r * 0.85, 0);
      ctx.stroke();

      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.05, r * 0.36, 0.08, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      for (let k = -2; k <= 2; k++) {
        const kx = k * r * 0.32;
        ctx.moveTo(kx, -r * 0.3);
        ctx.lineTo(kx + r * 0.14, r * 0.3);
      }
      ctx.stroke();
      return;
    }

    if (subtype === 'twig') {
      // Knotted woody branchlet with forked side shoot & leaf buds (Сухая веточка с сучком)
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 1.25;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 1.3, r * 0.12);
      ctx.quadraticCurveTo(-r * 0.15, -r * 0.22, r * 1.3, r * 0.08);
      ctx.stroke();

      // Forked side shoot
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, -r * 0.1);
      ctx.lineTo(r * 0.65, -r * 0.72);
      ctx.stroke();

      // Sunlit bark ridge highlight
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.28)';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(-r * 1.1, r * 0.04);
      ctx.lineTo(r * 0.9, -r * 0.05);
      ctx.stroke();
      return;
    }

    if (subtype === 'bark_chip') {
      // Irregular layered rough bark flake (Кусочек древесной коры)
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.moveTo(-r * 1.05, -r * 0.42);
      ctx.lineTo(r * 0.85, -r * 0.62);
      ctx.lineTo(r * 1.12, r * 0.35);
      ctx.lineTo(-r * 0.78, r * 0.65);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, -r * 0.28);
      ctx.lineTo(r * 0.65, -r * 0.42);
      ctx.lineTo(r * 0.82, r * 0.22);
      ctx.lineTo(-r * 0.62, r * 0.42);
      ctx.closePath();
      ctx.fill();
      return;
    }

    if (subtype === 'leaf_maple') {
      // 5-Lobed Palmate Norway Maple Leaf (Пятилопастный лист клёна остролистного)
      // Petiole stem
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 0.65;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 1.48, r * 0.08);
      ctx.quadraticCurveTo(-r * 1.1, 0, -r * 0.72, 0);
      ctx.stroke();

      // Palmate 5-lobe blade polygon with deep sinuses
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.moveTo(-r * 0.72, 0); // Petiole attachment base
      // Lower-left basal lobe
      ctx.lineTo(-r * 0.88, -r * 0.58);
      ctx.lineTo(-r * 0.42, -r * 0.46);
      // Upper-left lateral lobe
      ctx.lineTo(-r * 0.22, -r * 1.15);
      ctx.lineTo(r * 0.05, -r * 0.82);
      ctx.lineTo(r * 0.38, -r * 1.02);
      ctx.lineTo(r * 0.34, -r * 0.48);
      // Central apical lobe (3-pointed crown)
      ctx.lineTo(r * 0.96, -r * 0.36);
      ctx.lineTo(r * 1.38, 0);
      ctx.lineTo(r * 0.96, r * 0.36);
      ctx.lineTo(r * 0.34, r * 0.48);
      // Lower-right lateral lobe
      ctx.lineTo(r * 0.38, r * 1.02);
      ctx.lineTo(r * 0.05, r * 0.82);
      ctx.lineTo(-r * 0.22, r * 1.15);
      ctx.lineTo(-r * 0.42, r * 0.46);
      // Basal right lobe
      ctx.lineTo(-r * 0.88, r * 0.58);
      ctx.closePath();
      ctx.fill();

      // Sunlit lobe half-lamina highlight
      ctx.fillStyle = wetness > 0.2 ? 'rgba(255, 255, 255, 0.24)' : 'rgba(254, 240, 138, 0.22)';
      ctx.beginPath();
      ctx.moveTo(-r * 0.68, 0);
      ctx.lineTo(-r * 0.2, -r * 0.95);
      ctx.lineTo(r * 1.15, 0);
      ctx.closePath();
      ctx.fill();

      // 5 Radiating Palmate Main Veins
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.72, 0);
      ctx.lineTo(r * 1.15, 0);
      ctx.moveTo(-r * 0.65, 0);
      ctx.lineTo(-r * 0.12, -r * 0.88);
      ctx.moveTo(-r * 0.65, 0);
      ctx.lineTo(-r * 0.12, r * 0.88);
      ctx.moveTo(-r * 0.68, 0);
      ctx.lineTo(-r * 0.72, -r * 0.45);
      ctx.moveTo(-r * 0.68, 0);
      ctx.lineTo(-r * 0.72, r * 0.45);
      ctx.stroke();
      return;
    }

    if (subtype === 'leaf_oak') {
      // Sinuate-Lobed Pedunculate Oak Leaf (Выемчато-лопастный лист дуба черешчатого)
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 0.7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 1.42, 0);
      ctx.lineTo(-r * 0.95, 0);
      ctx.stroke();

      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.moveTo(-r * 0.98, 0);
      // 3 rounded wavy lobes along top margin
      ctx.quadraticCurveTo(-r * 0.75, -r * 0.48, -r * 0.48, -r * 0.24);
      ctx.quadraticCurveTo(-r * 0.15, -r * 0.88, r * 0.18, -r * 0.36);
      ctx.quadraticCurveTo(r * 0.58, -r * 0.82, r * 0.88, -r * 0.28);
      // Rounded apical tip
      ctx.quadraticCurveTo(r * 1.35, 0, r * 0.88, r * 0.28);
      // 3 rounded wavy lobes along bottom margin
      ctx.quadraticCurveTo(r * 0.58, r * 0.82, r * 0.18, r * 0.36);
      ctx.quadraticCurveTo(-r * 0.15, r * 0.88, -r * 0.48, r * 0.24);
      ctx.quadraticCurveTo(-r * 0.75, r * 0.48, -r * 0.98, 0);
      ctx.closePath();
      ctx.fill();

      // Central midrib & pinnate lobe veins
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(-r * 0.95, 0);
      ctx.lineTo(r * 1.05, 0);
      ctx.moveTo(-r * 0.25, 0);
      ctx.lineTo(0, -r * 0.52);
      ctx.moveTo(-r * 0.25, 0);
      ctx.lineTo(0, r * 0.52);
      ctx.moveTo(r * 0.32, 0);
      ctx.lineTo(r * 0.62, -r * 0.48);
      ctx.moveTo(r * 0.32, 0);
      ctx.lineTo(r * 0.62, r * 0.48);
      ctx.stroke();
      return;
    }

    // Default: Silver Birch Leaf ('leaf_birch' — Ромбически-яйцевидный зубчатый лист берёзы повислой)
    // Slender curved petiole stem
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 0.65;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 1.48, r * 0.08);
    ctx.quadraticCurveTo(-r * 1.18, 0, -r * 0.92, 0);
    ctx.stroke();

    // Cordate-rhombic blade with acuminate pointed apex & doubly-serrate teeth
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.moveTo(-r * 0.92, 0);
    ctx.lineTo(-r * 0.65, -r * 0.56);
    ctx.lineTo(-r * 0.28, -r * 0.82);
    ctx.lineTo(r * 0.15, -r * 0.72);
    ctx.lineTo(r * 0.62, -r * 0.46);
    ctx.lineTo(r * 1.32, 0); // Acuminate apex
    ctx.lineTo(r * 0.62, r * 0.46);
    ctx.lineTo(r * 0.15, r * 0.72);
    ctx.lineTo(-r * 0.28, r * 0.82);
    ctx.lineTo(-r * 0.65, r * 0.56);
    ctx.closePath();
    ctx.fill();

    // Sun-facing upper lamina sheen
    ctx.fillStyle =
      localSunY < 0 ? 'rgba(254, 249, 195, 0.24)' : 'rgba(20, 40, 15, 0.16)';
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, 0);
    ctx.lineTo(-r * 0.28, -r * 0.8);
    ctx.lineTo(r * 1.28, 0);
    ctx.closePath();
    ctx.fill();

    // Central midrib & 3 pairs of herring-bone lateral veins
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.92, 0);
    ctx.lineTo(r * 1.12, 0);
    ctx.moveTo(-r * 0.45, 0);
    ctx.lineTo(-r * 0.15, -r * 0.62);
    ctx.moveTo(-r * 0.45, 0);
    ctx.lineTo(-r * 0.15, r * 0.62);
    ctx.moveTo(0, 0);
    ctx.lineTo(r * 0.35, -r * 0.48);
    ctx.moveTo(0, 0);
    ctx.lineTo(r * 0.35, r * 0.48);
    ctx.stroke();
  }

  // ===========================================================================
  // REDRAWN URBAN STREET TRASH & LITTER MODELS
  // ===========================================================================

  private static drawBeverageCanModel(
    ctx: CanvasRenderingContext2D,
    lit: LitterItem,
    localSunX: number,
    _localSunY: number,
    crushed: number
  ): void {
    const cw = lit.size * 0.82;
    const ch = lit.size * 1.18;
    const rollShift = Math.sin(lit.rollPhase ?? 0) * cw * 0.22;

    let bodyColor = lit.color || '#dc2626';
    let accentColor = '#f8fafc';
    if (lit.subtype === 'can_energy') {
      bodyColor = '#18181b';
      accentColor = '#84cc16';
    } else if (lit.subtype === 'can_citrus') {
      bodyColor = '#15803d';
      accentColor = '#fde047';
    } else if (lit.subtype === 'can_gold') {
      bodyColor = '#d97706';
      accentColor = '#fef3c7';
    } else if (lit.subtype === 'can_cola' && (!lit.color || lit.color === '#ffffff')) {
      bodyColor = '#dc2626';
      accentColor = '#f8fafc';
    }

    // 1. Aluminum bottom dome & top necked chime
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.ellipse(0, ch * 0.46, cw * 0.45, cw * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Main cylindrical body (pinched at waist if crushed by vehicle tire)
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    if (crushed > 0.2) {
      const pinch = cw * (0.48 - crushed * 0.18);
      ctx.moveTo(-cw * 0.48, -ch * 0.42);
      ctx.lineTo(cw * 0.48, -ch * 0.42);
      ctx.lineTo(pinch, 0);
      ctx.lineTo(cw * 0.48, ch * 0.44);
      ctx.lineTo(-cw * 0.48, ch * 0.44);
      ctx.lineTo(-pinch, 0);
      ctx.closePath();
    } else {
      ctx.roundRect(-cw * 0.5, -ch * 0.44, cw, ch * 0.88, 1.1);
    }
    ctx.fill();

    // 3. Brand graphic stripe / wave ribbon that rotates with rollPhase
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.rect(
      Math.max(-cw * 0.46, rollShift - cw * 0.28),
      -ch * 0.14,
      cw * 0.56,
      ch * 0.24
    );
    ctx.fill();

    // 4. Anisotropic brushed aluminum cylindrical specular highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
    ctx.fillRect(localSunX * cw * 0.22 - 0.55, -ch * 0.42, 1.1, ch * 0.84);

    // Crushed metallic buckle crease lines
    if (crushed > 0.2) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(-cw * 0.35, -ch * 0.08);
      ctx.lineTo(cw * 0.32, ch * 0.06);
      ctx.stroke();
    }

    // 5. Silver stay-on-tab lid (SOT крышка с ключом)
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.ellipse(0, -ch * 0.44, cw * 0.46, cw * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 0.45;
    ctx.stroke();

    // Dark drink opening & silver pull-tab ring
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, -ch * 0.44, cw * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }

  private static drawBottleModel(
    ctx: CanvasRenderingContext2D,
    lit: LitterItem,
    localSunX: number,
    _localSunY: number,
    crushed: number
  ): void {
    const bw = lit.size * 0.76;
    const bh = lit.size * 1.28;

    let glassTint = 'rgba(186, 230, 253, 0.76)';
    let labelColor = '#0284c7';
    let capColor = '#2563eb';

    if (lit.subtype === 'bottle_amber') {
      glassTint = 'rgba(180, 83, 9, 0.84)';
      labelColor = '#fef3c7';
      capColor = '#fbbf24';
    } else if (lit.subtype === 'bottle_emerald') {
      glassTint = 'rgba(21, 128, 61, 0.82)';
      labelColor = '#f8fafc';
      capColor = '#166534';
    } else if (lit.subtype === 'bottle_cola') {
      glassTint = 'rgba(148, 163, 184, 0.78)';
      labelColor = '#dc2626';
      capColor = '#dc2626';
    }

    // 1. Moulded bottle body + tapered shoulder + narrow neck
    ctx.fillStyle = glassTint;
    ctx.beginPath();
    const waistW = crushed > 0.2 ? bw * 0.34 : bw * 0.48;
    ctx.moveTo(-bw * 0.48, bh * 0.48);
    ctx.lineTo(-waistW, bh * 0.05);
    ctx.lineTo(-bw * 0.48, -bh * 0.18);
    // Tapered shoulder into bottle neck
    ctx.quadraticCurveTo(-bw * 0.45, -bh * 0.36, -bw * 0.22, -bh * 0.42);
    ctx.lineTo(-bw * 0.22, -bh * 0.56);
    ctx.lineTo(bw * 0.22, -bh * 0.56);
    ctx.lineTo(bw * 0.22, -bh * 0.42);
    ctx.quadraticCurveTo(bw * 0.45, -bh * 0.36, bw * 0.48, -bh * 0.18);
    ctx.lineTo(waistW, bh * 0.05);
    ctx.lineTo(bw * 0.48, bh * 0.48);
    ctx.closePath();
    ctx.fill();

    // 2. Wrap-around printed brand label band
    ctx.fillStyle = labelColor;
    ctx.fillRect(-waistW * 0.96, -bh * 0.12, waistW * 1.92, bh * 0.28);

    // 3. Screw cap & tamper-evident ring
    ctx.fillStyle = capColor;
    ctx.fillRect(-bw * 0.26, -bh * 0.65, bw * 0.52, bh * 0.12);

    // 4. Refractive Fresnel glass/PET highlight streak
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.fillRect(localSunX * bw * 0.18 - 0.45, -bh * 0.32, 0.9, bh * 0.74);
  }

  private static drawTakeawayCupModel(
    ctx: CanvasRenderingContext2D,
    lit: LitterItem,
    localSunX: number,
    localSunY: number,
    crushed: number,
    isUprightCoffee: boolean
  ): void {
    if (isUprightCoffee) {
      // Top-down / tilted takeaway coffee cup with molded sip lid & espresso crema
      const r = lit.size * 0.54;
      // Outer cup rim
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Inner lid channel & rich espresso crema ring
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
      ctx.fill();

      // Sip opening & sunlit rim highlight
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(r * 0.32, -r * 0.18, r * 0.24, r * 0.36);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(localSunX * r * 0.35, localSunY * r * 0.35, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Side-lying tapered takeaway coffee cup with kraft corrugated thermal sleeve & dome lid
    const cw = lit.size * 0.98;
    const ch = lit.size * 1.12;

    // 1. Tapered paper cup frustum
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(-cw * 0.36, ch * 0.48);
    ctx.lineTo(-cw * 0.48, -ch * 0.44);
    ctx.lineTo(cw * 0.48, -ch * 0.44);
    ctx.lineTo(cw * 0.36, ch * 0.48);
    ctx.closePath();
    ctx.fill();

    // 2. Corrugated kraft thermal cardboard sleeve (капхолдер)
    ctx.fillStyle = lit.color && lit.color !== '#ffffff' ? lit.color : '#b45309';
    ctx.beginPath();
    ctx.moveTo(-cw * 0.41, ch * 0.18);
    ctx.lineTo(-cw * 0.45, -ch * 0.18);
    ctx.lineTo(cw * 0.45, -ch * 0.18);
    ctx.lineTo(cw * 0.41, ch * 0.18);
    ctx.closePath();
    ctx.fill();

    // Corrugated vertical ribs on sleeve
    ctx.strokeStyle = 'rgba(69, 26, 3, 0.32)';
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.moveTo(-cw * 0.2, -ch * 0.16);
    ctx.lineTo(-cw * 0.18, ch * 0.16);
    ctx.moveTo(0, -ch * 0.16);
    ctx.lineTo(0, ch * 0.16);
    ctx.moveTo(cw * 0.2, -ch * 0.16);
    ctx.lineTo(cw * 0.18, ch * 0.16);
    ctx.stroke();

    // 3. Sunlit cylindrical highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
    ctx.fillRect(localSunX * cw * 0.16 - 0.55, -ch * 0.42, 1.1, ch * 0.86);

    // 4. Thermoformed dark sip-through dome lid
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-cw * 0.54, -ch * 0.52, cw * 1.08, 1.5);
    ctx.fillRect(-cw * 0.42, -ch * 0.58, cw * 0.84, 0.8);

    if (crushed > 0.2) {
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.55)';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(-cw * 0.32, -ch * 0.25);
      ctx.lineTo(cw * 0.28, ch * 0.32);
      ctx.stroke();
    }
  }

  private static drawCrumpledPaperModel(
    ctx: CanvasRenderingContext2D,
    lit: LitterItem,
    localSunX: number,
    localSunY: number,
    wet: number,
    seed: number
  ): void {
    const pw = lit.size * 0.96;
    const ph = lit.size * 0.78;
    const baseCol = wet > 0.25 ? '#cbd5e1' : lit.color || '#f8fafc';

    // 1. Irregular crumpled polyhedral paper silhouette
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    ctx.moveTo(-pw * 0.52, -ph * 0.38);
    ctx.lineTo(-pw * 0.12, -ph * 0.54);
    ctx.lineTo(pw * 0.48, -ph * 0.42);
    ctx.lineTo(pw * 0.54, ph * 0.12);
    ctx.lineTo(pw * 0.36, ph * 0.52);
    ctx.lineTo(-pw * 0.18, ph * 0.46);
    ctx.lineTo(-pw * 0.48, ph * 0.28);
    ctx.closePath();
    ctx.fill();

    // 2. Origami Delaunay facets shaded by sun angle
    const apexX = ((seed & 7) - 3.5) * 0.06 * pw;
    const apexY = (((seed >> 3) & 7) - 3.5) * 0.06 * ph;

    // Shaded leeward facet
    ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
    ctx.beginPath();
    ctx.moveTo(apexX, apexY);
    ctx.lineTo(pw * 0.54, ph * 0.12);
    ctx.lineTo(pw * 0.36, ph * 0.52);
    ctx.lineTo(-pw * 0.18, ph * 0.46);
    ctx.closePath();
    ctx.fill();

    // Sunlit facet
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.moveTo(apexX, apexY);
    ctx.lineTo(-pw * 0.52, -ph * 0.38);
    ctx.lineTo(-pw * 0.12, -ph * 0.54);
    ctx.lineTo(pw * 0.48, -ph * 0.42);
    ctx.closePath();
    ctx.fill();

    // 3. Crisp fold ridge creases
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.28)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-pw * 0.42, -ph * 0.28);
    ctx.lineTo(apexX, apexY);
    ctx.lineTo(pw * 0.44, ph * 0.18);
    ctx.moveTo(apexX, apexY);
    ctx.lineTo(-pw * 0.16, ph * 0.42);
    ctx.stroke();

    // Rim bevel highlight
    if (localSunX + localSunY < 0.5) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-pw * 0.5, -ph * 0.38);
      ctx.lineTo(-pw * 0.12, -ph * 0.54);
      ctx.lineTo(pw * 0.46, -ph * 0.42);
      ctx.stroke();
    }
  }

  private static drawNewspaperModel(
    ctx: CanvasRenderingContext2D,
    lit: LitterItem,
    _localSunX: number,
    _localSunY: number,
    wet: number
  ): void {
    const nw = lit.size * 1.12;
    const nh = lit.size * 0.86;
    const paperCol = wet > 0.25 ? '#cbd5e1' : '#f1f5f9';

    // 1. Slightly curved double-page broadsheet spread
    ctx.fillStyle = paperCol;
    ctx.beginPath();
    ctx.moveTo(-nw * 0.5, -nh * 0.46);
    ctx.quadraticCurveTo(-nw * 0.25, -nh * 0.54, 0, -nh * 0.46);
    ctx.quadraticCurveTo(nw * 0.25, -nh * 0.52, nw * 0.5, -nh * 0.44);
    ctx.lineTo(nw * 0.48, nh * 0.48);
    ctx.quadraticCurveTo(nw * 0.25, nh * 0.42, 0, nh * 0.48);
    ctx.quadraticCurveTo(-nw * 0.25, nh * 0.42, -nw * 0.48, nh * 0.48);
    ctx.closePath();
    ctx.fill();

    // 2. Center spine fold crease shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
    ctx.fillRect(-0.55, -nh * 0.46, 1.1, nh * 0.94);

    // 3. Bold editorial masthead banner & red accent rule
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-nw * 0.44, -nh * 0.38, nw * 0.38, 1.25);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(nw * 0.06, -nh * 0.38, nw * 0.38, 0.9);

    // 4. Halftone photograph box & typeset grey ink columns
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-nw * 0.44, -nh * 0.16, nw * 0.22, nh * 0.26);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-nw * 0.18, -nh * 0.16, nw * 0.12, 0.8);
    ctx.fillRect(-nw * 0.18, -nh * 0.02, nw * 0.12, 0.8);
    ctx.fillRect(nw * 0.06, -nh * 0.18, nw * 0.36, 0.85);
    ctx.fillRect(nw * 0.06, -nh * 0.02, nw * 0.34, 0.85);
    ctx.fillRect(-nw * 0.44, nh * 0.18, nw * 0.38, 0.85);
    ctx.fillRect(nw * 0.06, nh * 0.16, nw * 0.36, 0.85);
  }

  private static drawPlasticBagModel(
    ctx: CanvasRenderingContext2D,
    lit: LitterItem,
    _localSunX: number,
    _localSunY: number,
    isBillowing: boolean
  ): void {
    const bw = lit.size * (isBillowing ? 1.08 : 0.96);
    const bh = lit.size * 1.18;
    const bagColor = lit.color || '#e11d48';

    // 1. Translucent LDPE T-shirt grocery bag silhouette with dual loop handles
    ctx.save();
    ctx.globalAlpha *= 0.88;
    ctx.fillStyle = bagColor;
    ctx.beginPath();
    // Left loop handle
    ctx.moveTo(-bw * 0.46, -bh * 0.22);
    ctx.lineTo(-bw * 0.44, -bh * 0.54);
    ctx.lineTo(-bw * 0.22, -bh * 0.54);
    ctx.lineTo(-bw * 0.16, -bh * 0.24);
    // U-neck cutout
    ctx.quadraticCurveTo(0, -bh * 0.18, bw * 0.16, -bh * 0.24);
    // Right loop handle
    ctx.lineTo(bw * 0.22, -bh * 0.54);
    ctx.lineTo(bw * 0.44, -bh * 0.54);
    ctx.lineTo(bw * 0.46, -bh * 0.22);
    // Billowing bag pouch
    ctx.quadraticCurveTo(bw * 0.62, bh * 0.15, bw * 0.46, bh * 0.48);
    ctx.quadraticCurveTo(0, bh * 0.54, -bw * 0.46, bh * 0.48);
    ctx.quadraticCurveTo(-bw * 0.62, bh * 0.15, -bw * 0.46, -bh * 0.22);
    ctx.closePath();
    ctx.fill();

    // 2. Glossy polyethylene crinkle folds & specular reflections
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.58)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-bw * 0.26, -bh * 0.12);
    ctx.quadraticCurveTo(-bw * 0.05, bh * 0.08, bw * 0.22, bh * 0.28);
    ctx.moveTo(bw * 0.24, -bh * 0.08);
    ctx.lineTo(-bw * 0.14, bh * 0.32);
    ctx.stroke();
    ctx.restore();
  }

  private static drawFoilWrapperModel(
    ctx: CanvasRenderingContext2D,
    lit: LitterItem,
    _localSunX: number,
    _localSunY: number,
    seed: number
  ): void {
    const ww = lit.size * 0.95;
    const wh = lit.size * 0.68;
    const brandColors = ['#dc2626', '#f59e0b', '#2563eb', '#16a34a'];
    const col = lit.color && lit.color !== '#f8fafc' ? lit.color : brandColors[seed % brandColors.length];

    // 1. Silver aluminized foil crimped end-seals
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-ww * 0.56, -wh * 0.42, ww * 1.12, wh * 0.84);

    // 2. Vibrant snack wrapper body with crumpled pinch
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-ww * 0.44, -wh * 0.46);
    ctx.lineTo(ww * 0.44, -wh * 0.42);
    ctx.lineTo(ww * 0.38, wh * 0.46);
    ctx.lineTo(-ww * 0.42, wh * 0.42);
    ctx.closePath();
    ctx.fill();

    // 3. Metallic foil specular facet glint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.68)';
    ctx.beginPath();
    ctx.moveTo(-ww * 0.22, -wh * 0.26);
    ctx.lineTo(ww * 0.26, -wh * 0.12);
    ctx.lineTo(0, wh * 0.24);
    ctx.closePath();
    ctx.fill();
  }

  private static drawCardboardBoxModel(
    ctx: CanvasRenderingContext2D,
    lit: LitterItem,
    _localSunX: number,
    _localSunY: number,
    wet: number,
    crushed: number
  ): void {
    const bs = lit.size * 1.05;
    const baseKraft = wet > 0.25 ? '#92400e' : lit.color || '#d97706';

    // 1. Corrugated carton body
    ctx.fillStyle = baseKraft;
    ctx.fillRect(-bs * 0.5, -bs * 0.46, bs, bs * 0.92);

    // 2. Slightly splayed top flaps if crushed
    if (crushed > 0.15) {
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(-bs * 0.5, -bs * 0.46);
      ctx.lineTo(-bs * 0.64, -bs * 0.32);
      ctx.lineTo(-bs * 0.5, bs * 0.46);
      ctx.closePath();
      ctx.fill();
    }

    // 3. Sunlit top-left 3D bevel & shadow bottom-right edge
    ctx.strokeStyle = 'rgba(254, 243, 199, 0.52)';
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.moveTo(-bs * 0.5, bs * 0.46);
    ctx.lineTo(-bs * 0.5, -bs * 0.46);
    ctx.lineTo(bs * 0.5, -bs * 0.46);
    ctx.stroke();

    // 4. Center packing tape seam & white shipping barcode label
    ctx.fillStyle = 'rgba(253, 230, 138, 0.45)';
    ctx.fillRect(-bs * 0.5, -0.7, bs, 1.4);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(bs * 0.08, -bs * 0.34, bs * 0.28, bs * 0.22);

    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.moveTo(-bs * 0.5, 0);
    ctx.lineTo(bs * 0.5, 0);
    ctx.stroke();
  }

  private static drawSurgicalMaskModel(
    ctx: CanvasRenderingContext2D,
    lit: LitterItem,
    _localSunX: number,
    _localSunY: number,
    wet: number
  ): void {
    const mw = lit.size * 0.96;
    const mh = lit.size * 0.58;

    // 1. Elastic ear loops
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.arc(-mw * 0.48, 0, mh * 0.42, Math.PI * 0.45, Math.PI * 1.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mw * 0.48, 0, mh * 0.42, -Math.PI * 0.55, Math.PI * 0.55);
    ctx.stroke();

    // 2. Spunbond medical blue mask body with white welded border
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-mw * 0.5, -mh * 0.5, mw, mh);
    ctx.fillStyle = wet > 0.25 ? '#7dd3fc' : '#38bdf8';
    ctx.fillRect(-mw * 0.44, -mh * 0.42, mw * 0.88, mh * 0.84);

    // 3. Accordion pleats (3 horizontal folds)
    ctx.strokeStyle = 'rgba(3, 105, 161, 0.42)';
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.moveTo(-mw * 0.42, -mh * 0.16);
    ctx.lineTo(mw * 0.42, -mh * 0.16);
    ctx.moveTo(-mw * 0.42, mh * 0.16);
    ctx.lineTo(mw * 0.42, mh * 0.16);
    ctx.stroke();
  }

  private static drawCigaretteButtModel(
    ctx: CanvasRenderingContext2D,
    lit: LitterItem,
    _localSunX: number,
    _localSunY: number
  ): void {
    const bl = Math.max(2.6, lit.size * 0.95);
    const bw = Math.max(0.95, lit.size * 0.26);

    // 1. White rolling paper shaft
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-bl * 0.5, -bw * 0.5, bl * 0.85, bw);

    // 2. Cork-orange cellulose acetate filter tip
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-bl * 0.5, -bw * 0.5, bl * 0.36, bw);

    // 3. Charred dark ash cone tip
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bl * 0.32, -bw * 0.5, bl * 0.18, bw);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(bl * 0.42, -bw * 0.35, bl * 0.08, bw * 0.7);
  }

  private static drawSmartphoneModel(
    ctx: CanvasRenderingContext2D,
    lit: LitterItem,
    _localSunX: number,
    _localSunY: number,
    nightAlpha: number,
    crushed: number
  ): void {
    const pw = lit.size * 0.95;
    const ph = lit.size * 1.62;

    // 1. Anodized titanium/aluminum chassis bezel
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(-pw * 0.5, -ph * 0.5, pw, ph, 1.0);
    ctx.fill();

    // 2. OLED Display Glass (illuminated if glowing)
    ctx.fillStyle = lit.isGlowing ? '#38bdf8' : '#0f172a';
    ctx.fillRect(-pw * 0.5 + 0.45, -ph * 0.5 + 0.45, pw - 0.9, ph - 0.9);

    if (lit.isGlowing) {
      // Lockscreen clock bar
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(-pw * 0.24, -ph * 0.28, pw * 0.48, 0.8);
    }

    // 3. Gorilla Glass specular reflection diagonal
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.46)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-pw * 0.34, -ph * 0.36);
    ctx.lineTo(pw * 0.32, ph * 0.32);
    ctx.stroke();

    // 4. Spiderweb glass cracks if run over by a vehicle
    if (crushed > 0.2) {
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.75)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(-pw * 0.35, -ph * 0.1);
      ctx.lineTo(pw * 0.35, ph * 0.15);
      ctx.moveTo(pw * 0.25, -ph * 0.35);
      ctx.lineTo(-pw * 0.2, ph * 0.35);
      ctx.stroke();
    }

    // 5. Night OLED ambient glow
    if (lit.isGlowing && nightAlpha > 0.25) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.32)';
      ctx.beginPath();
      ctx.ellipse(0, 0, pw * 1.15, ph * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
