import {
  Bird,
  BirdFlightMode,
  BirdSpecies,
  BirdSubState,
  GameWorld,
  Player,
  Tree,
  Vehicle,
} from './types';
import { getCurrentSunShadowState, SunShadowState } from './shadowSystem';
import { sound } from './audio';
import { performanceConfig } from './performanceConfig';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface WingPose3D {
  shoulder: Vec3;
  wrist: Vec3;
  tip: Vec3;
  trailingOuter: Vec3;
  trailingMid: Vec3;
  trailingInner: Vec3;
  /** Slotted primary feather tips for corvids/jays/woodpeckers in flight */
  primaries: Vec3[];
  speculumStart: Vec3;
  speculumEnd: Vec3;
  extension: number; // 0 (folded on flank) .. 1 (fully outstretched)
  strokeZ: number;   // -1 (bottom of downstroke) .. +1 (top of upstroke)
  isUpstrokeFlexed: boolean;
}

export interface BirdPose3D {
  scale: number;
  bodyCenter: Vec3;
  bodyRx: number;
  bodyRy: number;
  pitch: number;
  bank: number;
  breatheScale: number;
  neckBase: Vec3;
  headCenter: Vec3;
  headRadius: number;
  headYaw: number;
  headPitch: number;
  beakBaseL: Vec3;
  beakBaseR: Vec3;
  beakTip: Vec3;
  tailBase: Vec3;
  tailLeft: Vec3;
  tailCenter: Vec3;
  tailRight: Vec3;
  tailSpread: number;
  leftWing: WingPose3D;
  rightWing: WingPose3D;
  leftHip: Vec3;
  leftFoot: Vec3;
  rightHip: Vec3;
  rightFoot: Vec3;
  showLegs: boolean;
}

interface SpeciesProfile {
  gait: 'walk' | 'hop' | 'trunk_hitch';
  headBob: boolean;
  scale: number;
  bodyRx: number;
  bodyRy: number;
  headR: number;
  beakLen: number;
  beakWidth: number;
  wingSpan: number;
  wingChord: number;
  tailLen: number;
  flapStyle: 'continuous_glide' | 'flap_bound' | 'rowing_glide';
  wingFreqHz: number;
  cruiseSpeed: number;
  climbRate: number;
  cruiseAlt: number;
  fidSlow: number;
  fidFast: number;
  alertDist: number;
  arborealAffinity: number; // 0..1 preference for perching in trees vs ground
  slottedPrimaries: boolean;
}

const SPECIES_PROFILES: Record<BirdSpecies, SpeciesProfile> = {
  pigeon: {
    gait: 'walk',
    headBob: true,
    scale: 1.04,
    bodyRx: 3.1,
    bodyRy: 1.95,
    headR: 1.32,
    beakLen: 1.35,
    beakWidth: 0.55,
    wingSpan: 7.4,
    wingChord: 2.5,
    tailLen: 3.0,
    flapStyle: 'continuous_glide',
    wingFreqHz: 21.0,
    cruiseSpeed: 108,
    climbRate: 58,
    cruiseAlt: 72,
    fidSlow: 46,
    fidFast: 82,
    alertDist: 102,
    arborealAffinity: 0.06,
    slottedPrimaries: false,
  },
  sparrow: {
    gait: 'hop',
    headBob: false,
    scale: 0.82,
    bodyRx: 2.45,
    bodyRy: 1.62,
    headR: 1.22,
    beakLen: 1.15,
    beakWidth: 0.58,
    wingSpan: 5.6,
    wingChord: 2.0,
    tailLen: 2.3,
    flapStyle: 'flap_bound',
    wingFreqHz: 31.0,
    cruiseSpeed: 94,
    climbRate: 64,
    cruiseAlt: 54,
    fidSlow: 54,
    fidFast: 90,
    alertDist: 112,
    arborealAffinity: 0.42,
    slottedPrimaries: false,
  },
  titmouse: {
    gait: 'hop',
    headBob: false,
    scale: 0.80,
    bodyRx: 2.4,
    bodyRy: 1.58,
    headR: 1.2,
    beakLen: 1.1,
    beakWidth: 0.5,
    wingSpan: 5.5,
    wingChord: 1.95,
    tailLen: 2.35,
    flapStyle: 'flap_bound',
    wingFreqHz: 32.0,
    cruiseSpeed: 95,
    climbRate: 66,
    cruiseAlt: 52,
    fidSlow: 56,
    fidFast: 92,
    alertDist: 116,
    arborealAffinity: 0.76,
    slottedPrimaries: false,
  },
  jay: {
    gait: 'hop',
    headBob: false,
    scale: 1.10,
    bodyRx: 3.15,
    bodyRy: 1.88,
    headR: 1.38,
    beakLen: 1.55,
    beakWidth: 0.62,
    wingSpan: 7.8,
    wingChord: 2.75,
    tailLen: 3.45,
    flapStyle: 'continuous_glide',
    wingFreqHz: 18.5,
    cruiseSpeed: 100,
    climbRate: 56,
    cruiseAlt: 66,
    fidSlow: 64,
    fidFast: 104,
    alertDist: 132,
    arborealAffinity: 0.82,
    slottedPrimaries: true,
  },
  woodpecker: {
    gait: 'trunk_hitch',
    headBob: false,
    scale: 0.98,
    bodyRx: 2.95,
    bodyRy: 1.68,
    headR: 1.28,
    beakLen: 1.75,
    beakWidth: 0.55,
    wingSpan: 6.9,
    wingChord: 2.35,
    tailLen: 2.85,
    flapStyle: 'flap_bound',
    wingFreqHz: 23.5,
    cruiseSpeed: 104,
    climbRate: 62,
    cruiseAlt: 62,
    fidSlow: 60,
    fidFast: 98,
    alertDist: 124,
    arborealAffinity: 0.94,
    slottedPrimaries: false,
  },
  crow: {
    gait: 'walk',
    headBob: true,
    scale: 1.24,
    bodyRx: 3.55,
    bodyRy: 2.08,
    headR: 1.48,
    beakLen: 1.95,
    beakWidth: 0.72,
    wingSpan: 9.2,
    wingChord: 3.05,
    tailLen: 3.6,
    flapStyle: 'rowing_glide',
    wingFreqHz: 14.5,
    cruiseSpeed: 114,
    climbRate: 52,
    cruiseAlt: 86,
    fidSlow: 52,
    fidFast: 92,
    alertDist: 128,
    arborealAffinity: 0.50,
    slottedPrimaries: true,
  },
};

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function wrapAngleDiff(target: number, current: number): number {
  let d = (target - current) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function hashId(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class BirdSystem {
  private static scratchVehicles: Vehicle[] = [];
  private static treeMap: Map<string, Tree> = new Map();
  private static lastTreeMapCount = -1;
  private static lastFlapSoundSec = 0;

  private static getProfile(species: BirdSpecies): SpeciesProfile {
    return SPECIES_PROFILES[species] || SPECIES_PROFILES.sparrow;
  }

  private static playFlapThrottled(nowSec: number) {
    if (nowSec - this.lastFlapSoundSec > 0.14) {
      this.lastFlapSoundSec = nowSec;
      sound.playBirdFlap();
    }
  }

  private static ensureTreeLookup(world: GameWorld) {
    if (!world.trees) return;
    if (this.lastTreeMapCount !== world.trees.length) {
      this.treeMap.clear();
      for (let i = 0; i < world.trees.length; i++) {
        const t = world.trees[i];
        this.treeMap.set(t.id, t);
      }
      this.lastTreeMapCount = world.trees.length;
    }
  }

  private static findNearestTree(
    world: GameWorld,
    x: number,
    y: number,
    maxDist: number,
    excludeTreeId?: string
  ): Tree | null {
    if (!world.trees || world.trees.length === 0) return null;
    let best: Tree | null = null;
    let bestSq = maxDist * maxDist;
    for (let i = 0; i < world.trees.length; i++) {
      const t = world.trees[i];
      if (excludeTreeId && t.id === excludeTreeId) continue;
      const dx = t.x - x;
      const dy = t.y - y;
      const dSq = dx * dx + dy * dy;
      if (dSq < bestSq) {
        bestSq = dSq;
        best = t;
      }
    }
    return best;
  }

  /**
   * Initializes biological state on `world.birds` once after map load.
   * Preserves all static coordinates from `public/map.json` while binding arboreal species
   * (woodpeckers, jays, titmice) near trees to natural trunk/canopy perches.
   */
  public static ensureBirdsInitialized(world: GameWorld) {
    if (!world.birds || world.birds.length === 0) return;
    this.ensureTreeLookup(world);

    for (let i = 0; i < world.birds.length; i++) {
      const b = world.birds[i];
      if (b.bioInitialized) continue;
      b.bioInitialized = true;

      const h = hashId(b.id || `bird_${i}`);
      // Convert a subset of woodland sparrows near trees into Great Tits (titmouse) so all 6 unified species live in the ecosystem
      if (b.type === 'sparrow' && h % 5 === 0) {
        const nearTree = this.findNearestTree(world, b.x, b.y, 140);
        if (nearTree) {
          b.type = 'titmouse';
        }
      }

      const prof = this.getProfile(b.type);
      b.homeX = b.x;
      b.homeY = b.y;
      b.subState = 'idle';
      b.subStateTimer = 0.6 + (h % 100) * 0.025;
      b.headYaw = 0;
      b.targetHeadYaw = 0;
      b.headScanTimer = 0.4 + (h % 80) * 0.015;
      b.headBobPhase = (h % 628) * 0.01;
      b.hopPhase = 0;
      b.hopHeight = 0;
      b.peckPhase = 0;
      b.peckCount = 0;
      b.preenSide = h % 2 === 0 ? 1 : -1;
      b.bankAngle = 0;
      b.pitchAngle = 0;
      b.tailSpread = 0.1;
      b.tailFlickPhase = 0;
      b.alertLevel = 0;
      b.alarmDelay = 0;

      // Arboreal species (woodpeckers, and some jays/titmice) naturally perch on nearby trees
      if (
        b.state === 'ground' &&
        (b.type === 'woodpecker' ||
          (b.type === 'jay' && h % 3 !== 0) ||
          (b.type === 'titmouse' && h % 2 === 0))
      ) {
        const tree = this.findNearestTree(world, b.x, b.y, 180);
        if (tree) {
          b.state = 'perched';
          b.perchTreeId = tree.id;
          const trunkAng = ((h % 360) * Math.PI) / 180;
          b.trunkAngle = trunkAng;
          const r = Math.max(12, tree.radius || 16);
          if (b.type === 'woodpecker') {
            // Cling to tree trunk bark perimeter
            const trunkR = Math.min(4.2, r * 0.26);
            b.x = tree.x + Math.cos(trunkAng) * trunkR;
            b.y = tree.y + Math.sin(trunkAng) * trunkR;
            b.angle = trunkAng + Math.PI * 0.5;
            b.altitude = 22 + (h % 10);
          } else {
            // Perch in upper outer tree boughs
            const crownR = r * (0.35 + ((h % 40) / 100));
            b.x = tree.x + Math.cos(trunkAng) * crownR;
            b.y = tree.y + Math.sin(trunkAng) * crownR;
            b.altitude = 32 + (h % 14);
          }
        }
      }
    }
  }

  /**
   * Unifies ForestSystem tree-shake startling directly into `world.birds`.
   * Any perched or ground birds near the shaken tree burst into immediate takeoff;
   * if none are currently perched on that tree, recruits 1-3 distant forest birds to burst out of its crown.
   */
  public static onTreeShaken(
    world: GameWorld | undefined,
    treeId: string,
    treeX: number,
    treeY: number,
    treeRadius: number,
    intensity: number
  ) {
    if (!world || !world.birds || world.birds.length === 0 || !performanceConfig.enableBirds) return;
    this.ensureBirdsInitialized(world);

    const nowSec = typeof performance !== 'undefined' ? performance.now() * 0.001 : 0;
    const scareRadius = Math.max(48, treeRadius * 2.4 + intensity * 35);
    let startledCount = 0;

    for (let i = 0; i < world.birds.length; i++) {
      const b = world.birds[i];
      if (b.state === 'flying' || b.state === 'takeoff') continue;
      const d = Math.hypot(b.x - treeX, b.y - treeY);
      if (b.perchTreeId === treeId || d < scareRadius) {
        this.triggerBirdTakeoff(world, b, treeX, treeY, nowSec, true);
        startledCount++;
      }
    }

    // If no bird happened to be sitting in this specific shaken tree, recruit up to 2 distant out-of-view woodland birds
    // so shaking a forest tree crown reliably flushes canopy birds using the unified world.birds pool!
    if (startledCount === 0 && intensity > 0.35) {
      const targetRecruits = 1 + (intensity > 0.75 ? 1 : 0);
      let recruited = 0;
      for (let i = 0; i < world.birds.length && recruited < targetRecruits; i++) {
        const b = world.birds[i];
        if (b.state === 'flying' || b.state === 'takeoff') continue;
        if (b.type !== 'jay' && b.type !== 'woodpecker' && b.type !== 'titmouse' && b.type !== 'crow') continue;
        const d = Math.hypot(b.x - treeX, b.y - treeY);
        if (d > 480) {
          const ang = Math.random() * Math.PI * 2;
          b.x = treeX + Math.cos(ang) * Math.min(10, treeRadius * 0.45);
          b.y = treeY + Math.sin(ang) * Math.min(10, treeRadius * 0.45);
          b.altitude = 28 + Math.random() * 12;
          b.perchTreeId = undefined;
          this.triggerBirdTakeoff(world, b, treeX, treeY, nowSec, true);
          recruited++;
        }
      }
    }
  }

  /**
   * Initiates biologically realistic takeoff away from a threat or perch,
   * and triggers staggered social alarm contagion across nearby flockmates.
   */
  public static triggerBirdTakeoff(
    world: GameWorld,
    bird: Bird,
    threatX: number,
    threatY: number,
    nowSec: number,
    playAudio: boolean = true
  ) {
    if (bird.state === 'takeoff' || bird.state === 'flying') return;
    const prof = this.getProfile(bird.type);

    const awayDX = bird.x - threatX;
    const awayDY = bird.y - threatY;
    const baseEscapeAngle =
      Math.abs(awayDX) > 0.5 || Math.abs(awayDY) > 0.5
        ? Math.atan2(awayDY, awayDX) + (Math.random() - 0.5) * 0.85
        : Math.random() * Math.PI * 2;

    // Slight bias into wind for aerodynamic lift during takeoff
    const windAngle = world.wind?.angle ?? 0.45;
    const escapeAngle = baseEscapeAngle + wrapAngleDiff(windAngle + Math.PI, baseEscapeAngle) * 0.15;

    const launchSpeed = prof.cruiseSpeed * (0.85 + Math.random() * 0.25);
    bird.state = 'takeoff';
    bird.subState = 'idle';
    bird.flightMode = 'flapping';
    bird.flightModeTimer = 0.75 + Math.random() * 0.55;
    bird.flightTimer = 0;
    bird.flyVX = Math.cos(escapeAngle) * launchSpeed;
    bird.flyVY = Math.sin(escapeAngle) * launchSpeed;
    bird.vz = prof.climbRate * (1.05 + Math.random() * 0.2);
    bird.angle = escapeAngle;
    bird.altitude = Math.max(bird.altitude || 0, 1.5 + (bird.hopHeight || 0));
    bird.hopHeight = 0;
    bird.hopPhase = 0;
    bird.peckCount = 0;
    bird.peckPhase = 0;
    bird.alarmDelay = 0;
    bird.alertLevel = 1.0;
    bird.tailSpread = 1.0;
    bird.pitchAngle = 0.48;
    bird.headYaw = 0;
    bird.targetHeadYaw = 0;

    // Pick an initial flight destination (another tree for arboreal birds, or safe distance away)
    this.assignFlightDestination(world, bird, escapeAngle);
    bird.perchTreeId = undefined;

    if (playAudio) {
      this.playFlapThrottled(nowSec);
    }

    // Social alarm cascade: nearby flockmates react with a biological 40..220ms visual/acoustic reflex delay
    for (let i = 0; i < world.birds.length; i++) {
      const other = world.birds[i];
      if (other === bird || other.state === 'flying' || other.state === 'takeoff') continue;
      if ((other.alarmDelay ?? 0) > 0) continue;
      const dist = Math.hypot(other.x - bird.x, other.y - bird.y);
      const sameFlock = Boolean(bird.groupId && other.groupId === bird.groupId);
      if ((sameFlock && dist < 110) || dist < 58) {
        other.alarmDelay = 0.045 + dist * 0.0018 + Math.random() * 0.11;
        other.threatX = threatX;
        other.threatY = threatY;
        other.subState = 'alert';
        other.alertLevel = 1.0;
      }
    }
  }

  private static assignFlightDestination(world: GameWorld, bird: Bird, preferredAngle: number) {
    const prof = this.getProfile(bird.type);
    const wantsTree = Math.random() < prof.arborealAffinity;

    if (wantsTree && world.trees && world.trees.length > 0) {
      const probeDist = 170 + Math.random() * 220;
      const probeX = bird.x + Math.cos(preferredAngle) * probeDist;
      const probeY = bird.y + Math.sin(preferredAngle) * probeDist;
      const candidateTree = this.findNearestTree(world, probeX, probeY, 220, bird.perchTreeId);
      if (candidateTree && Math.hypot(candidateTree.x - bird.x, candidateTree.y - bird.y) > 65) {
        const r = Math.max(12, candidateTree.radius || 16);
        const tAng = Math.random() * Math.PI * 2;
        bird.perchTreeId = candidateTree.id;
        if (bird.type === 'woodpecker') {
          const trunkR = Math.min(4.2, r * 0.26);
          bird.targetX = candidateTree.x + Math.cos(tAng) * trunkR;
          bird.targetY = candidateTree.y + Math.sin(tAng) * trunkR;
          bird.targetAltitude = 22 + (hashId(bird.id) % 10);
          bird.trunkAngle = tAng;
        } else {
          const crownR = r * (0.3 + Math.random() * 0.4);
          bird.targetX = candidateTree.x + Math.cos(tAng) * crownR;
          bird.targetY = candidateTree.y + Math.sin(tAng) * crownR;
          bird.targetAltitude = 32 + Math.random() * 14;
        }
        return;
      }
    }

    // Ground landing target (biased slightly back toward home territory if safe, or along flight vector)
    const dist = 190 + Math.random() * 240;
    const homeDist = Math.hypot((bird.homeX ?? bird.x) - bird.x, (bird.homeY ?? bird.y) - bird.y);
    if (homeDist > 260 && Math.random() < 0.65) {
      const toHomeAng = Math.atan2((bird.homeY ?? bird.y) - bird.y, (bird.homeX ?? bird.x) - bird.x);
      bird.targetX = (bird.homeX ?? bird.x) + (Math.random() - 0.5) * 70;
      bird.targetY = (bird.homeY ?? bird.y) + (Math.random() - 0.5) * 70;
      bird.angle = toHomeAng;
    } else {
      bird.targetX = clamp(bird.x + Math.cos(preferredAngle) * dist, 120, world.width - 120);
      bird.targetY = clamp(bird.y + Math.sin(preferredAngle) * dist, 120, world.height - 120);
    }
    bird.targetAltitude = 0;
    bird.perchTreeId = undefined;
  }

  /**
   * Main per-frame biological physics & ethology update for all birds in `world.birds`.
   */
  public static updateBirds(world: GameWorld, player: Player, dt: number, vehGrid?: any) {
    if (!performanceConfig.enableBirds || !world.birds || world.birds.length === 0) return;
    this.ensureBirdsInitialized(world);

    const safeDt = Math.min(0.05, Math.max(0.001, dt));
    const nowSec = typeof performance !== 'undefined' ? performance.now() * 0.001 : 0;
    const playerSpeed = (player.isInVehicle || player.isInsideBuilding || player.insideBusId || player.insideCarId)
      ? 0
      : Math.hypot(player.vx || 0, player.vy || 0);
    const isNight = (world.timeHour ?? 12) < 5.2 || (world.timeHour ?? 12) > 21.2;

    for (let i = 0; i < world.birds.length; i++) {
      const bird = world.birds[i];
      const prof = this.getProfile(bird.type);

      // 1. Update transient animation timers (tail flick, saccadic head scan)
      if ((bird.tailFlickPhase ?? 0) > 0) {
        bird.tailFlickPhase = Math.max(0, (bird.tailFlickPhase || 0) - safeDt * 3.8);
      }

      bird.headScanTimer = (bird.headScanTimer ?? 0.8) - safeDt;
      if (bird.headScanTimer <= 0) {
        if (bird.state === 'ground' || bird.state === 'perched') {
          if (bird.subState === 'preening') {
            bird.targetHeadYaw = (bird.preenSide || 1) * (1.85 + Math.sin(nowSec * 8) * 0.22);
            bird.headScanTimer = 0.25;
          } else if (bird.subState === 'alert' && bird.threatX !== undefined && bird.threatY !== undefined) {
            // Cock head so lateral eye focuses directly on threat
            const angleToThreat = Math.atan2(bird.threatY - bird.y, bird.threatX - bird.x);
            const relThreat = wrapAngleDiff(angleToThreat, bird.angle);
            bird.targetHeadYaw = clamp(relThreat * 0.65, -1.15, 1.15);
            bird.headScanTimer = 0.2;
          } else if (bird.subState === 'pecking' || bird.subState === 'drumming') {
            bird.targetHeadYaw = (Math.random() - 0.5) * 0.18;
            bird.headScanTimer = 0.35;
          } else {
            // Discrete avian saccadic head movement
            bird.targetHeadYaw = (Math.random() - 0.5) * 1.35;
            bird.headScanTimer = 0.45 + Math.random() * 1.35;
          }
        } else {
          bird.targetHeadYaw = clamp((bird.bankAngle || 0) * 0.35, -0.35, 0.35);
          bird.headScanTimer = 0.3;
        }
      }
      // Fast saccadic snap toward targetHeadYaw
      const yawDiff = (bird.targetHeadYaw ?? 0) - (bird.headYaw ?? 0);
      bird.headYaw = (bird.headYaw ?? 0) + yawDiff * Math.min(1, safeDt * 18);

      // =========================================================================
      // STATE A: GROUND & TREE-PERCHED ETHOLOGY
      // =========================================================================
      if (bird.state === 'ground' || bird.state === 'perched') {
        // Check staggered flock alarm cascade first
        if ((bird.alarmDelay ?? 0) > 0) {
          bird.alarmDelay = (bird.alarmDelay || 0) - safeDt;
          if ((bird.alarmDelay || 0) <= 0) {
            this.triggerBirdTakeoff(
              world,
              bird,
              bird.threatX ?? player.x,
              bird.threatY ?? player.y,
              nowSec,
              true
            );
            continue;
          }
        }

        // Evaluate proximity threats (Player & Moving Vehicles)
        // Perched canopy birds high in trees are much safer from pedestrians, but still startle from fast cars or close approach
        const perchSafetyMult = bird.state === 'perched' ? 0.52 : 1.0;
        let closestThreatDist = Infinity;
        let threatX = player.x;
        let threatY = player.y;
        let shouldTakeoff = false;

        const distToPlayer = Math.hypot(player.x - bird.x, player.y - bird.y);
        const playerDynamicFID =
          (playerSpeed > 75 ? prof.fidFast : playerSpeed > 15 ? (prof.fidSlow + prof.fidFast) * 0.5 : prof.fidSlow) *
          perchSafetyMult;

        if (distToPlayer < prof.alertDist * perchSafetyMult) {
          closestThreatDist = distToPlayer;
          threatX = player.x;
          threatY = player.y;
          if (distToPlayer < playerDynamicFID) {
            shouldTakeoff = true;
          }
        }

        if (!shouldTakeoff) {
          const vehiclesToCheck = vehGrid
            ? vehGrid.queryRadius(bird.x, bird.y, 125, this.scratchVehicles)
            : world.vehicles;
          for (let v = 0; v < vehiclesToCheck.length; v++) {
            const veh = vehiclesToCheck[v];
            const vSpd = Math.abs(veh.speed || 0) + Math.hypot(veh.vx || 0, veh.vy || 0);
            if (vSpd < 6 && !veh.hornActive) continue;
            const dVeh = Math.hypot(veh.x - bird.x, veh.y - bird.y);
            const vehFID = (veh.hornActive ? 135 : Math.min(115, 55 + vSpd * 0.45)) * perchSafetyMult;
            if (dVeh < vehFID) {
              shouldTakeoff = true;
              threatX = veh.x;
              threatY = veh.y;
              break;
            } else if (dVeh < closestThreatDist && dVeh < 130) {
              closestThreatDist = dVeh;
              threatX = veh.x;
              threatY = veh.y;
            }
          }
        }

        if (shouldTakeoff) {
          this.triggerBirdTakeoff(world, bird, threatX, threatY, nowSec, true);
          continue;
        }

        // Update vigilance / alert level
        if (closestThreatDist < prof.alertDist * perchSafetyMult) {
          bird.subState = 'alert';
          bird.threatX = threatX;
          bird.threatY = threatY;
          bird.alertLevel = clamp(1.0 - closestThreatDist / (prof.alertDist * perchSafetyMult), 0.25, 1.0);
          bird.peckCount = 0;
          bird.peckPhase = 0;

          // Bold species (crows, pigeons) on the ground walk/hop cautiously away from a slow passerby before deciding to fly
          if (bird.state === 'ground' && (bird.type === 'crow' || bird.type === 'pigeon') && closestThreatDist < prof.fidSlow * 1.45) {
            const awayAng = Math.atan2(bird.y - threatY, bird.x - threatX);
            bird.angle += wrapAngleDiff(awayAng, bird.angle) * Math.min(1, safeDt * 6);
            bird.flyVX = Math.cos(bird.angle) * 16;
            bird.flyVY = Math.sin(bird.angle) * 16;
          }
        } else {
          bird.alertLevel = Math.max(0, (bird.alertLevel || 0) - safeDt * 1.8);
          if (bird.subState === 'alert' && (bird.alertLevel || 0) <= 0.05) {
            bird.subState = 'idle';
            bird.subStateTimer = 0.4 + Math.random() * 1.2;
          }
        }

        // --- PERCHED ARBOREAL BEHAVIOR (WOODPECKER TRUNK HITCHING/DRUMMING & CANOPY PERCHING) ---
        if (bird.state === 'perched') {
          const tree = bird.perchTreeId ? this.treeMap.get(bird.perchTreeId) : null;
          if (!tree) {
            bird.state = 'ground';
            bird.altitude = 0;
            continue;
          }

          bird.subStateTimer = (bird.subStateTimer ?? 1.5) - safeDt;
          if (bird.subStateTimer <= 0 && bird.subState !== 'alert') {
            const roll = Math.random();
            if (!isNight && roll < 0.08) {
              // Spontaneous canopy-to-canopy or canopy-to-ground foraging flight!
              this.triggerBirdTakeoff(world, bird, tree.x + (Math.random() - 0.5) * 20, tree.y + (Math.random() - 0.5) * 20, nowSec, false);
              continue;
            } else if (bird.type === 'woodpecker' && roll < 0.52) {
              // Woodpecker rapid trunk drumming or bark pecking burst
              bird.subState = 'drumming';
              bird.peckCount = 6 + Math.floor(Math.random() * 8);
              bird.peckPhase = 0;
              bird.subStateTimer = 0.8 + Math.random() * 1.1;
            } else if (bird.type === 'woodpecker' && roll < 0.78) {
              // Hitch slightly around/up the tree trunk bark
              bird.subState = 'foraging';
              bird.trunkAngle = (bird.trunkAngle ?? 0) + (Math.random() - 0.5) * 0.85;
              const r = Math.max(12, tree.radius || 16);
              const trunkR = Math.min(4.2, r * 0.26);
              bird.x = tree.x + Math.cos(bird.trunkAngle) * trunkR;
              bird.y = tree.y + Math.sin(bird.trunkAngle) * trunkR;
              bird.angle = bird.trunkAngle + Math.PI * 0.5;
              bird.hopPhase = 0.01;
              bird.tailFlickPhase = 0.7;
              bird.subStateTimer = 0.7 + Math.random() * 1.4;
            } else if (roll < 0.35) {
              // Canopy branch hop to another twig in the same tree crown
              bird.subState = 'foraging';
              const r = Math.max(12, tree.radius || 16);
              const branchAng = Math.random() * Math.PI * 2;
              const branchR = r * (0.25 + Math.random() * 0.45);
              const nx = tree.x + Math.cos(branchAng) * branchR;
              const ny = tree.y + Math.sin(branchAng) * branchR;
              bird.angle = Math.atan2(ny - bird.y, nx - bird.x);
              bird.flyVX = (nx - bird.x) * 2.2;
              bird.flyVY = (ny - bird.y) * 2.2;
              bird.hopPhase = 0.01;
              bird.tailFlickPhase = 0.9;
              bird.subStateTimer = 0.65 + Math.random() * 1.2;
            } else if (roll < 0.55) {
              bird.subState = 'preening';
              bird.preenSide = Math.random() < 0.5 ? -1 : 1;
              bird.subStateTimer = 1.4 + Math.random() * 2.0;
            } else {
              bird.subState = 'idle';
              bird.subStateTimer = 1.2 + Math.random() * 2.5;
            }
          }

          // Update woodpecker drumming / canopy branch hop
          if (bird.subState === 'drumming' && (bird.peckCount ?? 0) > 0) {
            bird.peckPhase = (bird.peckPhase || 0) + safeDt * 15.5; // Rapid 15.5 Hz woodpecker hammer
            if (bird.peckPhase >= 1.0) {
              bird.peckPhase -= 1.0;
              bird.peckCount = (bird.peckCount || 1) - 1;
              if (bird.peckCount <= 0) {
                bird.subState = 'idle';
                bird.peckPhase = 0;
              }
            }
          } else if ((bird.hopPhase ?? 0) > 0) {
            bird.hopPhase = (bird.hopPhase || 0) + safeDt * 4.5;
            if (bird.hopPhase >= 1.0) {
              bird.hopPhase = 0;
              bird.hopHeight = 0;
              bird.flyVX = 0;
              bird.flyVY = 0;
              bird.tailFlickPhase = 1.0;
            } else {
              bird.hopHeight = Math.sin(bird.hopPhase * Math.PI) * 2.8;
              bird.x += bird.flyVX * safeDt;
              bird.y += bird.flyVY * safeDt;
            }
          }
          bird.tailSpread = clamp((bird.tailSpread || 0.1) + (0.12 - (bird.tailSpread || 0.1)) * safeDt * 6, 0.05, 1);
          bird.pitchAngle = (bird.pitchAngle || 0) * (1 - safeDt * 8);
          bird.bankAngle = (bird.bankAngle || 0) * (1 - safeDt * 8);
          continue;
        }

        // --- GROUND ETHOLOGY (FORAGING, WALKING HEAD-BOB, BIPEDAL HOPPING, PECKING, PREENING, SOCIAL) ---
        bird.subStateTimer = (bird.subStateTimer ?? (bird.walkTimer ?? 1.5)) - safeDt;
        if (bird.subStateTimer <= 0 && bird.subState !== 'alert') {
          const roll = Math.random();

          // Arboreal birds on the ground occasionally fly up into a nearby tree crown
          if (!isNight && roll < prof.arborealAffinity * 0.12) {
            const nearTree = this.findNearestTree(world, bird.x, bird.y, 260);
            if (nearTree) {
              this.triggerBirdTakeoff(world, bird, bird.x - (nearTree.x - bird.x), bird.y - (nearTree.y - bird.y), nowSec, false);
              continue;
            }
          }

          if (roll < 0.36) {
            // Locomotion foraging bout (Walk for pigeon/crow, Hop series for sparrow/titmouse/jay)
            bird.subState = 'foraging';
            let moveVX = (Math.random() - 0.5) * 24;
            let moveVY = (Math.random() - 0.5) * 24;

            // Social Boids ground cohesion & separation within groupId
            if (bird.groupId) {
              let cx = 0;
              let cy = 0;
              let sepX = 0;
              let sepY = 0;
              let count = 0;
              for (let j = 0; j < world.birds.length; j++) {
                const b2 = world.birds[j];
                if (b2 === bird || b2.state !== 'ground' || b2.groupId !== bird.groupId) continue;
                const dx = b2.x - bird.x;
                const dy = b2.y - bird.y;
                const d = Math.hypot(dx, dy);
                cx += b2.x;
                cy += b2.y;
                count++;
                if (d > 0.1 && d < 11) {
                  sepX -= (dx / d) * (11 - d) * 1.8;
                  sepY -= (dy / d) * (11 - d) * 1.8;
                }
              }
              if (count > 0) {
                cx /= count;
                cy /= count;
                const distToCenter = Math.hypot(cx - bird.x, cy - bird.y);
                if (distToCenter > 26) {
                  moveVX += (cx - bird.x) * 0.55;
                  moveVY += (cy - bird.y) * 0.55;
                }
                moveVX += sepX;
                moveVY += sepY;
              }
            }

            const spd = Math.hypot(moveVX, moveVY);
            const maxGaitSpd = prof.gait === 'hop' ? 24 : 18;
            if (spd > maxGaitSpd) {
              moveVX = (moveVX / spd) * maxGaitSpd;
              moveVY = (moveVY / spd) * maxGaitSpd;
            }
            bird.flyVX = moveVX;
            bird.flyVY = moveVY;
            if (spd > 1.5) {
              bird.angle = Math.atan2(moveVY, moveVX);
            }
            if (prof.gait === 'hop') {
              bird.hopPhase = 0.01; // Start first hop arc
              bird.subStateTimer = 0.45 + Math.random() * 0.9;
            } else {
              bird.subStateTimer = 0.8 + Math.random() * 1.6;
            }
          } else if (roll < 0.68) {
            // Multi-strike seed/insect pecking burst
            bird.subState = 'pecking';
            bird.flyVX = 0;
            bird.flyVY = 0;
            bird.peckCount = 2 + Math.floor(Math.random() * 5);
            bird.peckPhase = 0;
            bird.subStateTimer = 0.7 + bird.peckCount * 0.24;
          } else if (roll < 0.82) {
            // Feather preening (turning head back to groom wing)
            bird.subState = 'preening';
            bird.flyVX = 0;
            bird.flyVY = 0;
            bird.preenSide = Math.random() < 0.5 ? -1 : 1;
            bird.targetHeadYaw = bird.preenSide * 1.95;
            bird.subStateTimer = 1.3 + Math.random() * 1.8;
          } else {
            // Rest & vigilant look-around
            bird.subState = 'idle';
            bird.flyVX = 0;
            bird.flyVY = 0;
            bird.subStateTimer = 1.2 + Math.random() * 2.4;
          }
          bird.walkTimer = bird.subStateTimer;
        }

        // Execute active ground sub-behavior kinematics
        if (bird.subState === 'pecking' && (bird.peckCount ?? 0) > 0) {
          const peckRate = bird.type === 'sparrow' || bird.type === 'titmouse' ? 6.2 : 4.4;
          bird.peckPhase = (bird.peckPhase || 0) + safeDt * peckRate;
          if (bird.peckPhase >= 1.0) {
            bird.peckPhase -= 1.0;
            bird.peckCount = (bird.peckCount || 1) - 1;
            // Slight micro-turn between pecks
            bird.angle += (Math.random() - 0.5) * 0.22;
            if (bird.peckCount <= 0) {
              bird.peckPhase = 0;
              bird.subState = 'idle';
            }
          }
        } else {
          bird.peckPhase = 0;
        }

        // Locomotion update: Hopping vs Alternating Walking with Head-Bob
        const groundSpd = Math.hypot(bird.flyVX, bird.flyVY);
        if (prof.gait === 'hop') {
          if ((bird.hopPhase ?? 0) > 0 || groundSpd > 1.2) {
            bird.hopPhase = (bird.hopPhase || 0) + safeDt * 4.8;
            if (bird.hopPhase >= 1.0) {
              // Touchdown at end of hop
              bird.hopHeight = 0;
              bird.tailFlickPhase = 1.0; // Characteristic passerine tail balance flick upon landing!
              if (bird.subState === 'foraging' && (bird.subStateTimer ?? 0) > 0.22 && groundSpd > 2.5) {
                // Chain another hop after a tiny pause
                bird.hopPhase = 0.01;
                bird.angle += (Math.random() - 0.5) * 0.35;
                const nextSpd = groundSpd * 0.88;
                bird.flyVX = Math.cos(bird.angle) * nextSpd;
                bird.flyVY = Math.sin(bird.angle) * nextSpd;
              } else {
                bird.hopPhase = 0;
                bird.flyVX = 0;
                bird.flyVY = 0;
              }
            } else {
              // Parabolic vertical hop trajectory; horizontal translation occurs while feet are off the ground
              const airPhase = Math.sin(bird.hopPhase * Math.PI);
              bird.hopHeight = airPhase * (bird.type === 'jay' ? 3.2 : 2.3);
              bird.x += bird.flyVX * safeDt * (0.4 + 0.9 * airPhase);
              bird.y += bird.flyVY * safeDt * (0.4 + 0.9 * airPhase);
              bird.wingCycle += safeDt * 18;
            }
          } else {
            bird.hopHeight = 0;
            bird.hopPhase = 0;
          }
        } else {
          // Alternating Bipedal Walk (Pigeons & Crows) with Head-Bobbing
          bird.hopHeight = 0;
          bird.hopPhase = 0;
          if (groundSpd > 0.8) {
            bird.x += bird.flyVX * safeDt;
            bird.y += bird.flyVY * safeDt;
            const stepRate = 1.15 * groundSpd;
            bird.wingCycle += safeDt * stepRate;
            bird.headBobPhase = (bird.headBobPhase || 0) + safeDt * stepRate * 2.0;
            bird.flyVX *= 1 - safeDt * 3.2;
            bird.flyVY *= 1 - safeDt * 3.2;
            if (groundSpd < 1.2) {
              bird.flyVX = 0;
              bird.flyVY = 0;
            }
          }
        }

        bird.tailSpread = clamp(
          (bird.tailSpread || 0.1) + ((bird.hopHeight ? 0.45 : 0.1) - (bird.tailSpread || 0.1)) * safeDt * 8,
          0.08,
          1.0
        );
        bird.pitchAngle = (bird.pitchAngle || 0) * (1 - safeDt * 8);
        bird.bankAngle = (bird.bankAngle || 0) * (1 - safeDt * 8);
      } else {
        // =========================================================================
        // STATE B: AERODYNAMIC FLIGHT (TAKEOFF -> CRUISING/BOIDS/GLIDING -> LANDING)
        // =========================================================================
        bird.flightTimer = (bird.flightTimer || 0) + safeDt;
        const prevAngle = bird.angle;

        // 1. Transition from 'takeoff' to 'flying' once initial climb burst completes
        if (bird.state === 'takeoff') {
          bird.altitude = Math.min(prof.cruiseAlt, bird.altitude + (bird.vz || prof.climbRate) * safeDt);
          bird.wingCycle += safeDt * prof.wingFreqHz * 1.42; // Fast high-power takeoff wingbeats
          bird.tailSpread = clamp((bird.tailSpread || 1) - safeDt * 0.6, 0.45, 1.0);
          bird.pitchAngle = 0.42;
          if (bird.flightTimer > 0.7 || bird.altitude >= 28) {
            bird.state = 'flying';
            bird.flightMode = 'flapping';
            bird.flightModeTimer = 0.9 + Math.random() * 1.2;
          }
        } else if (bird.state === 'flying') {
          // 2. Biologically authentic Flap-Glide / Flap-Bound duty cycle
          bird.flightModeTimer = (bird.flightModeTimer ?? 1.0) - safeDt;
          if (bird.flightModeTimer <= 0) {
            if (prof.flapStyle === 'flap_bound') {
              // Small passerines & woodpeckers: alternate rapid flap burst with brief folded-wing bound
              if (bird.flightMode === 'flapping') {
                bird.flightMode = 'bounding';
                bird.flightModeTimer = 0.16 + Math.random() * 0.18;
              } else {
                bird.flightMode = 'flapping';
                bird.flightModeTimer = 0.36 + Math.random() * 0.45;
              }
            } else {
              // Pigeons, crows & jays: alternate active wing-rowing bouts with open-wing cambered gliding
              if (bird.flightMode === 'flapping') {
                bird.flightMode = 'gliding';
                bird.flightModeTimer = 0.55 + Math.random() * 1.15;
              } else {
                bird.flightMode = 'flapping';
                bird.flightModeTimer = 0.85 + Math.random() * 1.45;
              }
            }
          }

          // Advance wing phase & vertical altitude undulation according to flight mode
          if (bird.flightMode === 'flapping') {
            bird.wingCycle += safeDt * prof.wingFreqHz;
            const targetAlt = prof.cruiseAlt;
            bird.altitude += clamp((targetAlt - bird.altitude) * 1.8 + 8, -20, prof.climbRate) * safeDt;
            bird.pitchAngle = clamp((targetAlt - bird.altitude) * 0.015, -0.15, 0.28);
            bird.tailSpread = clamp((bird.tailSpread || 0.25) + (0.22 - (bird.tailSpread || 0.25)) * safeDt * 5, 0.15, 1);
          } else if (bird.flightMode === 'gliding') {
            // Hold wings outstretched near horizontal dihedral (sin(wingCycle) ~ 0.15)
            const glideTargetPhase = Math.round(bird.wingCycle / (Math.PI * 2)) * (Math.PI * 2) + 0.2;
            bird.wingCycle += (glideTargetPhase - bird.wingCycle) * Math.min(1, safeDt * 12);
            bird.altitude = Math.max(24, bird.altitude - 4.5 * safeDt);
            bird.pitchAngle = -0.06;
            bird.tailSpread = clamp((bird.tailSpread || 0.35) + (0.42 - (bird.tailSpread || 0.35)) * safeDt * 4, 0.2, 1);
          } else if (bird.flightMode === 'bounding') {
            // Brief ballistic bound with wings tucked against body
            bird.altitude = Math.max(18, bird.altitude - 14 * safeDt);
            bird.pitchAngle = -0.18;
            bird.tailSpread = 0.08;
          }

          // 3. 3D Boids Flocking (Separation, Alignment, Cohesion) + Steering toward Target Perch/Landing
          let sepX = 0;
          let sepY = 0;
          let alignVX = 0;
          let alignVY = 0;
          let cohX = 0;
          let cohY = 0;
          let neighbors = 0;

          for (let j = 0; j < world.birds.length; j++) {
            const other = world.birds[j];
            if (other === bird || (other.state !== 'flying' && other.state !== 'takeoff')) continue;
            if (other.type !== bird.type && other.groupId !== bird.groupId) continue;
            const dx = other.x - bird.x;
            const dy = other.y - bird.y;
            const d = Math.hypot(dx, dy);
            if (d > 0.1 && d < 115) {
              neighbors++;
              alignVX += other.flyVX;
              alignVY += other.flyVY;
              cohX += other.x;
              cohY += other.y;
              if (d < 24) {
                sepX -= (dx / d) * (24 - d) * 3.2;
                sepY -= (dy / d) * (24 - d) * 3.2;
              }
            }
          }

          let desiredVX = bird.flyVX;
          let desiredVY = bird.flyVY;

          if (neighbors > 0) {
            alignVX /= neighbors;
            alignVY /= neighbors;
            cohX = cohX / neighbors - bird.x;
            cohY = cohY / neighbors - bird.y;
            desiredVX += sepX * 1.4 + (alignVX - bird.flyVX) * 0.45 + cohX * 0.35;
            desiredVY += sepY * 1.4 + (alignVY - bird.flyVY) * 0.45 + cohY * 0.35;
          }

          // Steer toward assigned landing/perch target
          if (bird.targetX !== undefined && bird.targetY !== undefined) {
            const toTargetX = bird.targetX - bird.x;
            const toTargetY = bird.targetY - bird.y;
            const distToTarget = Math.hypot(toTargetX, toTargetY);

            if (distToTarget > 10) {
              const targetPull = bird.flightTimer > 2.2 ? 0.85 : 0.35;
              desiredVX += (toTargetX / distToTarget) * prof.cruiseSpeed * targetPull;
              desiredVY += (toTargetY / distToTarget) * prof.cruiseSpeed * targetPull;
            }

            // Initiate landing flare approach when close to destination and safe from player
            const distFromPlayer = Math.hypot(player.x - bird.x, player.y - bird.y);
            if (
              bird.flightTimer > 1.8 &&
              distToTarget < 88 &&
              (distFromPlayer > prof.fidFast * 0.9 || bird.perchTreeId !== undefined)
            ) {
              bird.state = 'landing';
              bird.flightMode = 'flaring';
            } else if (bird.flightTimer > 7.5 && distToTarget < 35) {
              // Pick a new waypoint if landing spot was blocked by player
              this.assignFlightDestination(world, bird, bird.angle + (Math.random() - 0.5) * 1.4);
            }
          } else if (bird.flightTimer > 3.5) {
            this.assignFlightDestination(world, bird, bird.angle);
          }

          // Normalize to species cruise speed
          const dSpd = Math.hypot(desiredVX, desiredVY) || 1;
          const targetSpd = prof.cruiseSpeed * (bird.flightMode === 'gliding' ? 0.92 : 1.0);
          bird.flyVX += ((desiredVX / dSpd) * targetSpd - bird.flyVX) * Math.min(1, safeDt * 3.6);
          bird.flyVY += ((desiredVY / dSpd) * targetSpd - bird.flyVY) * Math.min(1, safeDt * 3.6);
        } else if (bird.state === 'landing') {
          // 4. Aerodynamic Landing Approach & Braking Flare
          const tx = bird.targetX ?? bird.x;
          const ty = bird.targetY ?? bird.y;
          const tAlt = bird.targetAltitude ?? 0;
          const dx = tx - bird.x;
          const dy = ty - bird.y;
          const dist = Math.hypot(dx, dy);

          // Flare wings and spread tail fan wide to bleed airspeed
          bird.flightMode = 'flaring';
          bird.wingCycle += safeDt * prof.wingFreqHz * 1.32;
          bird.tailSpread = clamp((bird.tailSpread || 0.5) + safeDt * 3.5, 0.4, 1.0);
          bird.pitchAngle = 0.45;

          const approachSpd = clamp(dist * 1.35, 16, prof.cruiseSpeed * 0.85);
          if (dist > 1.5) {
            bird.flyVX = (dx / dist) * approachSpd;
            bird.flyVY = (dy / dist) * approachSpd;
          }
          const altDiff = tAlt - bird.altitude;
          bird.altitude += clamp(altDiff * 3.2, -prof.climbRate * 1.15, prof.climbRate) * safeDt;

          if (dist < 8 && Math.abs(bird.altitude - tAlt) < 4.5) {
            bird.x = tx;
            bird.y = ty;
            bird.altitude = tAlt;
            bird.flyVX = 0;
            bird.flyVY = 0;
            bird.vz = 0;
            bird.pitchAngle = 0;
            bird.bankAngle = 0;
            bird.tailSpread = 0.15;
            bird.tailFlickPhase = 1.0;
            bird.state = bird.perchTreeId ? 'perched' : 'ground';
            bird.subState = 'idle';
            bird.subStateTimer = 1.0 + Math.random() * 2.2;
            if (bird.perchTreeId && bird.type === 'woodpecker' && bird.trunkAngle !== undefined) {
              bird.angle = bird.trunkAngle + Math.PI * 0.5;
            }
            continue;
          }
        }

        // Integrate flight position & compute aerodynamic roll (bankAngle) from turn rate
        bird.x += bird.flyVX * safeDt;
        bird.y += bird.flyVY * safeDt;
        if (Math.abs(bird.flyVX) > 0.5 || Math.abs(bird.flyVY) > 0.5) {
          const newAngle = Math.atan2(bird.flyVY, bird.flyVX);
          const turnDelta = wrapAngleDiff(newAngle, prevAngle);
          const turnRate = turnDelta / safeDt;
          bird.angle = prevAngle + turnDelta * Math.min(1, safeDt * 10);
          const targetBank = clamp(turnRate * 0.28, -0.72, 0.72);
          bird.bankAngle = (bird.bankAngle || 0) + (targetBank - (bird.bankAngle || 0)) * Math.min(1, safeDt * 9);
        }

        // Keep flying birds within world bounds (turn smoothly back into the map)
        if (bird.x < -80 || bird.x > world.width + 80 || bird.y < -80 || bird.y > world.height + 80) {
          bird.x = clamp(bird.x, 80, world.width - 80);
          bird.y = clamp(bird.y, 80, world.height - 80);
          this.assignFlightDestination(world, bird, Math.atan2(player.y - bird.y, player.x - bird.x));
        }
      }
    }
  }

  /**
   * Computes the full 3D anatomical pose of a bird for both direct rendering and true 3D shadow projection.
   */
  public static computeBirdPose(bird: Bird, nowSec: number): BirdPose3D {
    const prof = this.getProfile(bird.type);
    const scale = prof.scale;
    const isAirborne = bird.state === 'flying' || bird.state === 'takeoff' || bird.state === 'landing';
    const groundSpd = Math.hypot(bird.flyVX, bird.flyVY);
    const isWalking = !isAirborne && prof.gait === 'walk' && groundSpd > 0.8;
    const isHopping = !isAirborne && (bird.hopHeight || 0) > 0.05;

    // 1. Respiratory breathing & body posture
    const idSeed = (hashId(bird.id) % 100) * 0.0628;
    const breatheScale = 1.0 + Math.sin(nowSec * 3.8 + idSeed) * 0.028;
    const hopZ = bird.hopHeight || 0;
    const baseZ = isAirborne ? 0 : 2.3 + hopZ;
    const pitch = isAirborne
      ? bird.pitchAngle || 0
      : bird.subState === 'pecking' || bird.subState === 'drumming'
      ? -0.35 * Math.sin((bird.peckPhase || 0) * Math.PI)
      : isHopping
      ? Math.cos((bird.hopPhase || 0) * Math.PI) * 0.25
      : 0;
    const bank = isAirborne ? bird.bankAngle || 0 : 0;

    // Lateral hip sway when walking (pigeons & crows)
    const walkSwayY = isWalking ? Math.sin(bird.wingCycle) * 0.26 : 0;
    const bodyCenter: Vec3 = { x: 0, y: walkSwayY, z: baseZ };

    // 2. Head, Neck, Head-Bobbing & Pecking kinematics
    const peckPulse =
      bird.subState === 'pecking' || bird.subState === 'drumming'
        ? Math.pow(Math.sin((bird.peckPhase || 0) * Math.PI), 1.4)
        : 0;
    const headBobOffset =
      isWalking && prof.headBob ? Math.sin((bird.headBobPhase || 0)) * 0.72 : 0;
    const alertStretch = !isAirborne && (bird.alertLevel || 0) > 0.1 ? (bird.alertLevel || 0) * 0.65 : 0;

    const neckBase: Vec3 = {
      x: prof.bodyRx * 0.62,
      y: walkSwayY * 0.5,
      z: baseZ + 0.5 + Math.sin(pitch) * 0.8,
    };

    const headForward =
      prof.bodyRx * 0.78 + headBobOffset + peckPulse * 1.15 + alertStretch * 0.25;
    const headZ = Math.max(
      0.45,
      baseZ + 0.95 + alertStretch * 0.85 - peckPulse * (bird.subState === 'drumming' ? 0.45 : 1.75) + Math.sin(pitch) * 1.2
    );
    const headYaw = isAirborne ? clamp(bank * 0.3, -0.35, 0.35) : bird.headYaw || 0;
    const headCenter: Vec3 = {
      x: headForward,
      y: walkSwayY * 0.35 + Math.sin(headYaw) * 0.35,
      z: headZ,
    };

    const cosYaw = Math.cos(headYaw);
    const sinYaw = Math.sin(headYaw);
    const beakReach = prof.headR * 0.78 + prof.beakLen;
    const beakBaseDist = prof.headR * 0.72;
    const beakHalfW = prof.beakWidth;

    const beakTip: Vec3 = {
      x: headCenter.x + cosYaw * beakReach,
      y: headCenter.y + sinYaw * beakReach,
      z: Math.max(0.25, headCenter.z - peckPulse * 0.55),
    };
    const beakBaseL: Vec3 = {
      x: headCenter.x + cosYaw * beakBaseDist - sinYaw * beakHalfW,
      y: headCenter.y + sinYaw * beakBaseDist + cosYaw * beakHalfW,
      z: headCenter.z,
    };
    const beakBaseR: Vec3 = {
      x: headCenter.x + cosYaw * beakBaseDist + sinYaw * beakHalfW,
      y: headCenter.y + sinYaw * beakBaseDist - cosYaw * beakHalfW,
      z: headCenter.z,
    };

    // 3. Articulated Tail Fan (Spreads for takeoff/landing braking & balances hops)
    const tailSpread = clamp(
      bird.tailSpread ?? (isAirborne ? 0.3 : 0.12),
      0.08,
      1.0
    );
    const tailFlickZ =
      (bird.tailFlickPhase || 0) > 0
        ? Math.sin((bird.tailFlickPhase || 0) * Math.PI * 3) * 0.85
        : 0;
    const tailBase: Vec3 = {
      x: -prof.bodyRx * 0.82,
      y: walkSwayY * 0.4,
      z: baseZ - Math.sin(pitch) * 0.7,
    };
    const tailEndX = tailBase.x - prof.tailLen;
    const tailHalfFan = (0.55 + tailSpread * 1.75) * (prof.bodyRy * 0.75);
    const tailTipZ = Math.max(
      0.2,
      tailBase.z - Math.sin(pitch) * 1.1 + tailFlickZ + (bird.subState === 'pecking' ? peckPulse * 0.65 : 0)
    );

    const tailLeft: Vec3 = {
      x: tailEndX + tailSpread * 0.35,
      y: tailBase.y - tailHalfFan,
      z: tailTipZ + Math.sin(bank) * tailHalfFan * 0.45,
    };
    const tailCenter: Vec3 = {
      x: tailEndX - (1 - tailSpread) * 0.3,
      y: tailBase.y,
      z: tailTipZ,
    };
    const tailRight: Vec3 = {
      x: tailEndX + tailSpread * 0.35,
      y: tailBase.y + tailHalfFan,
      z: tailTipZ - Math.sin(bank) * tailHalfFan * 0.45,
    };

    // 4. Two-Joint Articulated Wings (Humerus/Forearm -> Carpal Wrist -> Primary Hand-Wing)
    // Real avian wing kinematics:
    // - Downstroke: full wingspan extension, sweeping downward and forward with high lift
    // - Upstroke: carpal wrist flexes inward toward body while outer primaries fold backward to minimize drag
    const buildWing = (side: -1 | 1): WingPose3D => {
      const shoulder: Vec3 = {
        x: prof.bodyRx * 0.22,
        y: side * prof.bodyRy * 0.72,
        z: baseZ + 0.35,
      };

      const isPreeningThisWing =
        !isAirborne && bird.subState === 'preening' && (bird.preenSide || 1) === side;
      const isAlertFlick =
        !isAirborne && (bird.alertLevel || 0) > 0.35 && Math.sin(nowSec * 18 + idSeed) > 0.5;
      const isBoundingTuck = isAirborne && bird.flightMode === 'bounding';

      if ((!isAirborne && !isPreeningThisWing && !isAlertFlick) || isBoundingTuck) {
        // Folded wing resting neatly along flank
        const wrist: Vec3 = {
          x: prof.bodyRx * 0.35,
          y: side * (prof.bodyRy * 0.98),
          z: baseZ + 0.25,
        };
        const tip: Vec3 = {
          x: -prof.bodyRx * 0.92,
          y: side * (prof.bodyRy * 0.52),
          z: baseZ + 0.15,
        };
        const trailingOuter: Vec3 = {
          x: -prof.bodyRx * 0.45,
          y: side * (prof.bodyRy * 0.88),
          z: baseZ + 0.15,
        };
        const trailingMid: Vec3 = {
          x: -prof.bodyRx * 0.2,
          y: side * (prof.bodyRy * 0.95),
          z: baseZ + 0.2,
        };
        const trailingInner: Vec3 = {
          x: -prof.bodyRx * 0.55,
          y: side * (prof.bodyRy * 0.55),
          z: baseZ + 0.2,
        };
        return {
          shoulder,
          wrist,
          tip,
          trailingOuter,
          trailingMid,
          trailingInner,
          primaries: [],
          speculumStart: wrist,
          speculumEnd: trailingMid,
          extension: 0,
          strokeZ: 0,
          isUpstrokeFlexed: false,
        };
      }

      if (isPreeningThisWing || isAlertFlick) {
        // Partially stretched wing on ground/perch during preening or nervous wing-flick
        const stretch = isPreeningThisWing ? 0.62 + Math.sin(nowSec * 6) * 0.12 : 0.32;
        const span = prof.wingSpan * stretch;
        const wrist: Vec3 = {
          x: prof.bodyRx * 0.28,
          y: side * (prof.bodyRy * 0.8 + span * 0.42),
          z: baseZ + 0.4,
        };
        const tip: Vec3 = {
          x: -prof.bodyRx * 0.65,
          y: side * (prof.bodyRy * 0.7 + span),
          z: baseZ + 0.2,
        };
        const trailingOuter: Vec3 = {
          x: -prof.bodyRx * 0.85,
          y: side * (prof.bodyRy * 0.6 + span * 0.72),
          z: baseZ + 0.15,
        };
        const trailingMid: Vec3 = {
          x: -prof.bodyRx * 0.7,
          y: side * (prof.bodyRy * 0.6 + span * 0.4),
          z: baseZ + 0.2,
        };
        const trailingInner: Vec3 = {
          x: -prof.bodyRx * 0.55,
          y: side * prof.bodyRy * 0.75,
          z: baseZ + 0.25,
        };
        return {
          shoulder,
          wrist,
          tip,
          trailingOuter,
          trailingMid,
          trailingInner,
          primaries: [],
          speculumStart: wrist,
          speculumEnd: trailingOuter,
          extension: stretch,
          strokeZ: -0.2,
          isUpstrokeFlexed: false,
        };
      }

      // Active Flight Wing Kinematics (Downstroke vs Wrist-Flexed Upstroke vs Glide vs Landing Flare)
      const isGliding = bird.flightMode === 'gliding';
      const rawSin = isGliding ? 0.18 : Math.sin(bird.wingCycle);
      const rawCos = isGliding ? 0.0 : Math.cos(bird.wingCycle);

      // When rawCos < 0, the wing is moving from top (+1) to bottom (-1) -> power DOWNSTROKE (fully extended)
      // When rawCos > 0, the wing is recovering from bottom (-1) to top (+1) -> recovery UPSTROKE (wrist flexed inward)
      const isUpstroke = !isGliding && rawCos > 0.15;
      const upstrokeFlex = isUpstroke ? Math.pow(rawCos, 1.2) * 0.44 : 0;

      // Banked turn perspective foreshortening & roll Z tilt
      const bankTiltZ = -side * Math.sin(bank) * prof.wingSpan * 0.55;
      const bankForeshorten = Math.cos(bank);

      // Vertical flapping excursion (wingtip rises above back at top of stroke, sweeps below body at bottom)
      const verticalExcursion = rawSin * prof.wingSpan * 0.58;
      // Apparent horizontal span foreshortens slightly at steep up/down stroke angles AND pulls in during upstroke wrist flexion
      const geometricCos = Math.sqrt(Math.max(0.28, 1.0 - rawSin * rawSin * 0.52));
      const effectiveSpan =
        prof.wingSpan * geometricCos * (1.0 - upstrokeFlex * 0.42) * bankForeshorten;

      const wristSpan = effectiveSpan * (0.44 - upstrokeFlex * 0.12);
      const flareForward = bird.flightMode === 'flaring' ? 0.85 : 0;
      const sweepX = isGliding
        ? 0.25
        : -rawSin * 1.15 - upstrokeFlex * 1.45 + flareForward;

      const wristZ = baseZ + 0.4 + verticalExcursion * 0.45 + bankTiltZ * 0.45;
      const tipZ = baseZ + 0.35 + verticalExcursion + bankTiltZ;

      const wrist: Vec3 = {
        x: shoulder.x + 0.45 + sweepX * 0.35,
        y: side * (prof.bodyRy * 0.65 + wristSpan),
        z: wristZ,
      };
      const tip: Vec3 = {
        x: shoulder.x - 0.35 + sweepX,
        y: side * (prof.bodyRy * 0.55 + effectiveSpan),
        z: tipZ,
      };
      const trailingOuter: Vec3 = {
        x: tip.x - prof.wingChord * (0.82 - upstrokeFlex * 0.2),
        y: side * (prof.bodyRy * 0.55 + effectiveSpan * 0.76),
        z: tipZ - 0.15,
      };
      const trailingMid: Vec3 = {
        x: wrist.x - prof.wingChord * 0.95,
        y: side * (prof.bodyRy * 0.6 + wristSpan * 0.92),
        z: wristZ - 0.15,
      };
      const trailingInner: Vec3 = {
        x: -prof.bodyRx * 0.55,
        y: side * prof.bodyRy * 0.78,
        z: baseZ + 0.2,
      };

      // Slotted primary wingtip feathers (маховые перья первого порядка) for crows, jays, pigeons in downstroke/glide
      const primaries: Vec3[] = [];
      if (prof.slottedPrimaries && !isUpstroke) {
        for (let p = 0; p < 3; p++) {
          const frac = p / 2;
          primaries.push({
            x: tip.x - frac * prof.wingChord * 0.62 + (1 - frac) * 0.35,
            y: tip.y - side * frac * 1.05,
            z: tipZ,
          });
        }
      }

      return {
        shoulder,
        wrist,
        tip,
        trailingOuter,
        trailingMid,
        trailingInner,
        primaries,
        speculumStart: {
          x: (wrist.x + trailingMid.x) * 0.5,
          y: (wrist.y + trailingMid.y) * 0.5,
          z: wristZ,
        },
        speculumEnd: {
          x: (tip.x + trailingOuter.x) * 0.5,
          y: (tip.y + trailingOuter.y) * 0.5,
          z: tipZ,
        },
        extension: 1.0 - upstrokeFlex,
        strokeZ: rawSin,
        isUpstrokeFlexed: isUpstroke,
      };
    };

    const leftWing = buildWing(-1);
    const rightWing = buildWing(1);

    // 5. Bipedal Legs & Three-Toed Avian Feet
    const showLegs = !isAirborne || bird.altitude < 10;
    const hipX = -prof.bodyRx * 0.12;
    const hipY = prof.bodyRy * 0.44;
    const leftStride = isWalking ? Math.sin(bird.wingCycle) * 1.15 : isHopping ? 0.45 : 0;
    const rightStride = isWalking ? -Math.sin(bird.wingCycle) * 1.15 : isHopping ? 0.45 : 0;
    const leftLiftZ = isWalking ? Math.max(0, Math.cos(bird.wingCycle)) * 0.65 : hopZ;
    const rightLiftZ = isWalking ? Math.max(0, -Math.cos(bird.wingCycle)) * 0.65 : hopZ;

    const leftHip: Vec3 = { x: hipX, y: -hipY + walkSwayY, z: baseZ - 0.5 };
    const rightHip: Vec3 = { x: hipX, y: hipY + walkSwayY, z: baseZ - 0.5 };
    const leftFoot: Vec3 = { x: hipX + 0.35 + leftStride, y: -hipY * 0.95, z: leftLiftZ };
    const rightFoot: Vec3 = { x: hipX + 0.35 + rightStride, y: hipY * 0.95, z: rightLiftZ };

    return {
      scale,
      bodyCenter,
      bodyRx: prof.bodyRx,
      bodyRy: prof.bodyRy * breatheScale,
      pitch,
      bank,
      breatheScale,
      neckBase,
      headCenter,
      headRadius: prof.headR,
      headYaw,
      headPitch: pitch,
      beakBaseL,
      beakBaseR,
      beakTip,
      tailBase,
      tailLeft,
      tailCenter,
      tailRight,
      tailSpread,
      leftWing,
      rightWing,
      leftHip,
      leftFoot,
      rightHip,
      rightFoot,
      showLegs,
    };
  }

  /**
   * Projects a 3D animated bird pose onto a 2D shadow plane at `baseAltitudePx`
   * using the true solar/lunar vector `(sunState.castX, sunState.castY)`.
   * Every wingbeat, wrist flexion, banked turn, tail fan flare, head turn, peck, and hop
   * is faithfully reflected in the projected shadow geometry.
   */
  public static traceProjectedBirdShadowPath(
    ctx: CanvasRenderingContext2D,
    bird: Bird,
    pose: BirdPose3D,
    baseAltitudePx: number,
    sunState: SunShadowState
  ) {
    const cos = Math.cos(bird.angle);
    const sin = Math.sin(bird.angle);
    const s = pose.scale;

    const proj = (pt: Vec3): { x: number; y: number } => {
      const wx = bird.x + (pt.x * cos - pt.y * sin) * s;
      const wy = bird.y + (pt.x * sin + pt.y * cos) * s;
      const totalZ = Math.max(0, baseAltitudePx + pt.z * s);
      return {
        x: wx + sunState.castX * totalZ,
        y: wy + sunState.castY * totalZ,
      };
    };

    // 1. Torso shadow ellipse
    const bc = proj(pose.bodyCenter);
    ctx.beginPath();
    ctx.ellipse(bc.x, bc.y, pose.bodyRx * s, pose.bodyRy * s, bird.angle, 0, Math.PI * 2);

    // 2. Articulated Tail Fan shadow
    const tb = proj(pose.tailBase);
    const tl = proj(pose.tailLeft);
    const tc = proj(pose.tailCenter);
    const tr = proj(pose.tailRight);
    ctx.moveTo(tb.x, tb.y);
    ctx.lineTo(tl.x, tl.y);
    ctx.lineTo(tc.x, tc.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.closePath();

    // 3. Two-Joint Left & Right Wing shadows (only when extended in flight, takeoff, landing, or preening)
    const traceWingShadow = (w: WingPose3D) => {
      if (w.extension <= 0.04) return;
      const sh = proj(w.shoulder);
      const wr = proj(w.wrist);
      const tp = proj(w.tip);
      const to = proj(w.trailingOuter);
      const tm = proj(w.trailingMid);
      const ti = proj(w.trailingInner);
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(wr.x, wr.y);
      ctx.lineTo(tp.x, tp.y);
      ctx.lineTo(to.x, to.y);
      ctx.lineTo(tm.x, tm.y);
      ctx.lineTo(ti.x, ti.y);
      ctx.closePath();
    };
    traceWingShadow(pose.leftWing);
    traceWingShadow(pose.rightWing);

    // 4. Head & Beak shadow (animates head-bobbing, saccadic yaw, and ground pecking!)
    const hc = proj(pose.headCenter);
    ctx.moveTo(hc.x + pose.headRadius * s, hc.y);
    ctx.arc(hc.x, hc.y, pose.headRadius * s, 0, Math.PI * 2);

    const bl = proj(pose.beakBaseL);
    const br = proj(pose.beakBaseR);
    const bt = proj(pose.beakTip);
    ctx.moveTo(bl.x, bl.y);
    ctx.lineTo(bt.x, bt.y);
    ctx.lineTo(br.x, br.y);
    ctx.closePath();
  }

  /**
   * Renders unified 3D-projected animated bird shadows onto the world shadow map (`src/shadowSystem.ts`).
   * - `tier === 'low'`: Ground, hopping, and low takeoff/landing birds (cast crisp animated shadows on pavement/grass)
   * - `tier === 'high'`: Flying, soaring, and canopy-perched birds (cast animated wing/tail silhouettes over trees, cars & roofs)
   */
  public static renderUnifiedShadows(
    sCtx: CanvasRenderingContext2D,
    world: GameWorld,
    sunState: SunShadowState,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    tier: 'low' | 'high'
  ) {
    if (!performanceConfig.enableBirds || !world.birds || sunState.isNight) return;
    const nowSec = typeof performance !== 'undefined' ? performance.now() * 0.001 : 0;

    for (let i = 0; i < world.birds.length; i++) {
      const bird = world.birds[i];
      const isHighCaster =
        bird.state === 'flying' ||
        bird.state === 'perched' ||
        ((bird.state === 'takeoff' || bird.state === 'landing') && bird.altitude >= 16);

      if ((tier === 'high') !== isHighCaster) continue;

      const baseAlt =
        bird.state === 'ground'
          ? 0
          : Math.max(2, bird.altitude || 0);
      const approxShiftX = sunState.castX * (baseAlt + 3);
      const approxShiftY = sunState.castY * (baseAlt + 3);
      const sx = bird.x + approxShiftX;
      const sy = bird.y + approxShiftY;

      if (sx < minX - 60 || sx > maxX + 60 || sy < minY - 60 || sy > maxY + 60) continue;

      const pose = this.computeBirdPose(bird, nowSec);
      sCtx.save();
      this.traceProjectedBirdShadowPath(sCtx, bird, pose, baseAlt, sunState);
      sCtx.fill();

      // Add thin leg shadow filaments connecting ground feet to raised torso shadow for ground/hopping birds
      if (tier === 'low' && pose.showLegs) {
        const cos = Math.cos(bird.angle);
        const sin = Math.sin(bird.angle);
        const s = pose.scale;
        const projLeg = (pt: Vec3) => ({
          x: bird.x + (pt.x * cos - pt.y * sin) * s + sunState.castX * (baseAlt + pt.z * s),
          y: bird.y + (pt.x * sin + pt.y * cos) * s + sunState.castY * (baseAlt + pt.z * s),
        });
        const lFoot = projLeg(pose.leftFoot);
        const lHip = projLeg(pose.leftHip);
        const rFoot = projLeg(pose.rightFoot);
        const rHip = projLeg(pose.rightHip);
        sCtx.lineWidth = 0.85 * s;
        sCtx.beginPath();
        sCtx.moveTo(lFoot.x, lFoot.y);
        sCtx.lineTo(lHip.x, lHip.y);
        sCtx.moveTo(rFoot.x, rFoot.y);
        sCtx.lineTo(rHip.x, rHip.y);
        sCtx.stroke();
      }
      sCtx.restore();
    }
  }

  /**
   * Partitions `world.birds` into ground-layer birds (rendered before vehicles/trees)
   * and canopy/sky-layer birds (rendered above tree crowns and building roofs).
   */
  public static partitionBirdsForRender(
    world: GameWorld,
    groundBirdsOut: Bird[],
    canopyAndSkyBirdsOut: Bird[]
  ) {
    groundBirdsOut.length = 0;
    canopyAndSkyBirdsOut.length = 0;
    if (!performanceConfig.enableBirds || !world.birds) return;

    this.ensureBirdsInitialized(world);

    for (let i = 0; i < world.birds.length; i++) {
      const b = world.birds[i];
      if (
        b.state === 'ground' ||
        ((b.state === 'takeoff' || b.state === 'landing') && b.altitude < 16 && !b.perchTreeId)
      ) {
        groundBirdsOut.push(b);
      } else {
        canopyAndSkyBirdsOut.push(b);
      }
    }
  }

  /**
   * Renders a list of birds with full anatomical detail, articulated 2-joint wings,
   * tail fan, head-bobbing/pecking/saccadic yaw, and immediate animated contact/canopy shadow.
   */
  public static renderBirds(
    ctx: CanvasRenderingContext2D,
    birds: Bird[],
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    nightAlpha: number = 0
  ) {
    if (!performanceConfig.enableBirds || birds.length === 0) return;

    const nowSec = typeof performance !== 'undefined' ? performance.now() * 0.001 : 0;
    const sunState = getCurrentSunShadowState();

    for (let i = 0; i < birds.length; i++) {
      const b = birds[i];
      const visualY = b.y - (b.altitude || 0) * 0.6 - (b.hopHeight || 0) * 0.75;
      if (b.x < minX - 40 || b.x > maxX + 40 || visualY < minY - 40 || visualY > maxY + 40) {
        continue;
      }

      const pose = this.computeBirdPose(b, nowSec);
      const s = pose.scale;

      // 1. Direct Animated Contact Shadow (on ground for ground/hopping birds, or onto tree canopy for perched/low-flying canopy birds)
      if (nightAlpha < 0.75) {
        const isCanopyBird = b.state === 'perched' || (b.altitude >= 16 && b.altitude <= 58);
        const localShadowAlt =
          b.state === 'ground'
            ? 0.2
            : b.state === 'perched'
            ? 2.2
            : Math.min(14, b.altitude * 0.32);

        if (b.state === 'ground' || isCanopyBird || b.altitude < 28) {
          ctx.save();
          // Translate so local shadow renders around the bird's visual altitude plane (e.g. on the tree crown or pavement)
          const shadowPlaneYOffset =
            b.state === 'perched'
              ? -(b.altitude || 0) * 0.6 + 2.2
              : b.state === 'ground'
              ? 0
              : -Math.max(0, (b.altitude || 0) - localShadowAlt) * 0.6;
          ctx.translate(0, shadowPlaneYOffset);
          const shadowAlpha =
            (b.state === 'ground' ? 0.28 : 0.22) * (1.0 - nightAlpha * 0.85);
          ctx.fillStyle = `rgba(8, 15, 28, ${shadowAlpha.toFixed(3)})`;
          this.traceProjectedBirdShadowPath(ctx, b, pose, localShadowAlt, sunState);
          ctx.fill();
          ctx.restore();
        }
      }

      // 2. Render Articulated Bird Body in Visual Space
      ctx.save();
      ctx.translate(b.x, visualY);
      ctx.rotate(b.angle);
      ctx.scale(s, s);

      // Species color palette
      let bodyColor = '#b45309';
      let mantleColor = '#92400e';
      let wingColor = '#451a03';
      let headColor = '#78350f';
      let beakColor = '#f59e0b';
      let legColor = '#d97706';

      switch (b.type) {
        case 'pigeon':
          bodyColor = '#64748b';
          mantleColor = '#94a3b8';
          wingColor = '#475569';
          headColor = '#334155';
          beakColor = '#cbd5e1';
          legColor = '#e11d48';
          break;
        case 'sparrow':
          bodyColor = '#a16207';
          mantleColor = '#78350f';
          wingColor = '#451a03';
          headColor = '#713f12';
          beakColor = '#52525b';
          legColor = '#b45309';
          break;
        case 'titmouse':
          bodyColor = '#eab308'; // Bright yellow breast/flanks
          mantleColor = '#65a30d'; // Olive-green mantle
          wingColor = '#334155';
          headColor = '#0f172a'; // Glossy black head with white cheeks
          beakColor = '#1e293b';
          legColor = '#475569';
          break;
        case 'jay':
          bodyColor = '#9a6b56'; // Vinaceous pinkish-brown
          mantleColor = '#845946';
          wingColor = '#1e293b';
          headColor = '#a87963';
          beakColor = '#27272a';
          legColor = '#785543';
          break;
        case 'woodpecker':
          bodyColor = '#0f172a'; // Pied black back
          mantleColor = '#1e293b';
          wingColor = '#09090b';
          headColor = '#0f172a';
          beakColor = '#475569';
          legColor = '#334155';
          break;
        case 'crow':
          bodyColor = '#3f3f46'; // Hooded crow ash-grey body
          mantleColor = '#27272a';
          wingColor = '#18181b'; // Charcoal-black wings
          headColor = '#09090b';
          beakColor = '#27272a';
          legColor = '#18181b';
          break;
      }

      if (nightAlpha > 0.45) {
        bodyColor = '#0f172a';
        mantleColor = '#1e293b';
        wingColor = '#09090b';
        headColor = '#020617';
      }

      // 2A. Bipedal Legs & Claws (when standing, walking, hopping, or taking off)
      if (pose.showLegs) {
        ctx.strokeStyle = legColor;
        ctx.lineWidth = 0.65;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pose.leftHip.x, pose.leftHip.y);
        ctx.lineTo(pose.leftFoot.x, pose.leftFoot.y);
        ctx.moveTo(pose.leftFoot.x, pose.leftFoot.y);
        ctx.lineTo(pose.leftFoot.x + 0.65, pose.leftFoot.y - 0.3);
        ctx.moveTo(pose.leftFoot.x, pose.leftFoot.y);
        ctx.lineTo(pose.leftFoot.x + 0.7, pose.leftFoot.y + 0.25);

        ctx.moveTo(pose.rightHip.x, pose.rightHip.y);
        ctx.lineTo(pose.rightFoot.x, pose.rightFoot.y);
        ctx.moveTo(pose.rightFoot.x, pose.rightFoot.y);
        ctx.lineTo(pose.rightFoot.x + 0.65, pose.rightFoot.y - 0.25);
        ctx.moveTo(pose.rightFoot.x, pose.rightFoot.y);
        ctx.lineTo(pose.rightFoot.x + 0.7, pose.rightFoot.y + 0.3);
        ctx.stroke();
      }

      // 2B. Articulated Tail Fan (Flares wide on takeoff/landing, flicks after hops, braces for woodpeckers)
      ctx.fillStyle = b.type === 'jay' || b.type === 'crow' || b.type === 'woodpecker' ? '#09090b' : wingColor;
      ctx.beginPath();
      ctx.moveTo(pose.tailBase.x, pose.tailBase.y - 0.55);
      ctx.lineTo(pose.tailLeft.x, pose.tailLeft.y);
      ctx.lineTo(pose.tailCenter.x, pose.tailCenter.y);
      ctx.lineTo(pose.tailRight.x, pose.tailRight.y);
      ctx.lineTo(pose.tailBase.x, pose.tailBase.y + 0.55);
      ctx.closePath();
      ctx.fill();

      // White terminal tail band for pigeons / outer tail rectrices for titmice & woodpeckers
      if (nightAlpha <= 0.45 && (b.type === 'pigeon' || b.type === 'woodpecker' || b.type === 'titmouse')) {
        ctx.strokeStyle = b.type === 'pigeon' ? '#1e293b' : 'rgba(248, 250, 252, 0.75)';
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.moveTo(pose.tailLeft.x, pose.tailLeft.y);
        ctx.lineTo(pose.tailRight.x, pose.tailRight.y);
        ctx.stroke();
      }

      // White rump flash on Eurasian Jay in flight
      if (nightAlpha <= 0.45 && b.type === 'jay' && pose.leftWing.extension > 0.2) {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(pose.tailBase.x + 0.35, pose.tailBase.y, 0.95, 1.05, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2C. Torso & Mantle Plumage
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(
        pose.bodyCenter.x,
        pose.bodyCenter.y,
        pose.bodyRx,
        pose.bodyRy,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Dorsal mantle overlay
      ctx.fillStyle = mantleColor;
      ctx.beginPath();
      ctx.ellipse(
        pose.bodyCenter.x - 0.15,
        pose.bodyCenter.y,
        pose.bodyRx * 0.82,
        pose.bodyRy * 0.78,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Woodpecker snow-white scapular shoulder ovals on folded/perched back
      if (nightAlpha <= 0.45 && b.type === 'woodpecker') {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(-0.3, -pose.bodyRy * 0.55, 1.25, 0.48, 0.15, 0, Math.PI * 2);
        ctx.ellipse(-0.3, pose.bodyRy * 0.55, 1.25, 0.48, -0.15, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pigeon iridescent green/violet neck collar sheen
      if (nightAlpha <= 0.45 && b.type === 'pigeon') {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.45)';
        ctx.beginPath();
        ctx.arc(pose.neckBase.x - 0.2, pose.neckBase.y, 1.25, -1.1, 1.1);
        ctx.fill();
      }

      // 2D. Two-Joint Articulated Wings (Downstroke, Wrist-Flexed Upstroke, Gliding & Folded)
      const drawWing = (w: WingPose3D, side: -1 | 1) => {
        if (w.extension <= 0.04) {
          // Folded wing coverts & wingbars along flank
          ctx.fillStyle = wingColor;
          ctx.beginPath();
          ctx.moveTo(w.shoulder.x, w.shoulder.y);
          ctx.quadraticCurveTo(w.wrist.x, w.wrist.y, w.tip.x, w.tip.y);
          ctx.lineTo(w.trailingInner.x, w.trailingInner.y);
          ctx.closePath();
          ctx.fill();

          if (nightAlpha <= 0.45) {
            if (b.type === 'jay') {
              // Bright azure-blue speculum flash on folded jay wing
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.moveTo(0.4, side * pose.bodyRy * 0.82);
              ctx.lineTo(-1.1, side * pose.bodyRy * 0.72);
              ctx.stroke();
            } else if (b.type === 'pigeon') {
              // Dual black wing bars on pigeon
              ctx.strokeStyle = '#1e293b';
              ctx.lineWidth = 0.55;
              ctx.beginPath();
              ctx.moveTo(0.1, side * pose.bodyRy * 0.45);
              ctx.lineTo(-0.3, side * pose.bodyRy * 0.92);
              ctx.moveTo(-0.7, side * pose.bodyRy * 0.42);
              ctx.lineTo(-1.1, side * pose.bodyRy * 0.84);
              ctx.stroke();
            } else if (b.type === 'titmouse' || b.type === 'sparrow') {
              // White/buff wingbar
              ctx.strokeStyle = b.type === 'titmouse' ? '#f8fafc' : '#fde68a';
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(0.2, side * pose.bodyRy * 0.55);
              ctx.lineTo(-0.4, side * pose.bodyRy * 0.88);
              ctx.stroke();
            }
          }
          return;
        }

        // Extended / Articulated Wing Polygon (Shoulder -> Carpal Wrist -> Wingtip -> Trailing Edge)
        ctx.fillStyle = wingColor;
        ctx.beginPath();
        ctx.moveTo(w.shoulder.x, w.shoulder.y);
        ctx.lineTo(w.wrist.x, w.wrist.y);
        ctx.lineTo(w.tip.x, w.tip.y);
        ctx.lineTo(w.trailingOuter.x, w.trailingOuter.y);
        ctx.lineTo(w.trailingMid.x, w.trailingMid.y);
        ctx.lineTo(w.trailingInner.x, w.trailingInner.y);
        ctx.closePath();
        ctx.fill();

        // Slotted primary wingtip feathers (маховые перья)
        if (w.primaries.length > 0) {
          ctx.strokeStyle = wingColor;
          ctx.lineWidth = 0.65;
          ctx.lineCap = 'round';
          ctx.beginPath();
          for (let p = 0; p < w.primaries.length; p++) {
            const pf = w.primaries[p];
            ctx.moveTo(w.wrist.x, w.wrist.y);
            ctx.lineTo(pf.x, pf.y);
          }
          ctx.stroke();
        }

        // Species-specific wing markings in flight (Azure Jay Speculum, Pied Woodpecker Bands, Pigeon Wingbars)
        if (nightAlpha <= 0.45) {
          if (b.type === 'jay') {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.25;
            ctx.beginPath();
            ctx.moveTo(w.speculumStart.x, w.speculumStart.y);
            ctx.lineTo(w.speculumEnd.x, w.speculumEnd.y);
            ctx.stroke();
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(w.wrist.x - 0.3, w.wrist.y);
            ctx.lineTo(w.trailingMid.x + 0.3, w.trailingMid.y);
            ctx.stroke();
          } else if (b.type === 'woodpecker') {
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 1.05;
            ctx.beginPath();
            ctx.moveTo(w.speculumStart.x, w.speculumStart.y);
            ctx.lineTo(w.speculumEnd.x, w.speculumEnd.y);
            ctx.stroke();
          } else if (b.type === 'pigeon') {
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(w.shoulder.x, w.shoulder.y);
            ctx.lineTo(w.wrist.x, w.wrist.y);
            ctx.stroke();
          }
        }
      };

      drawWing(pose.leftWing, -1);
      drawWing(pose.rightWing, 1);

      // 2E. Articulated Head, Crown Markings, Cheeks, Eye & Beak (rotates with headYaw & extends with head-bob/pecking!)
      ctx.fillStyle = headColor;
      ctx.beginPath();
      ctx.arc(pose.headCenter.x, pose.headCenter.y, pose.headRadius, 0, Math.PI * 2);
      ctx.fill();

      if (nightAlpha <= 0.45) {
        const cosY = Math.cos(pose.headYaw);
        const sinY = Math.sin(pose.headYaw);

        if (b.type === 'woodpecker') {
          // Great Spotted Woodpecker crimson-red nape cap & white cheek patches
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(
            pose.headCenter.x - cosY * 0.45,
            pose.headCenter.y - sinY * 0.45,
            pose.headRadius * 0.65,
            0,
            Math.PI * 2
          );
          ctx.fill();
        } else if (b.type === 'titmouse') {
          // Great Tit snow-white cheek patches on glossy black head
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.arc(
            pose.headCenter.x + cosY * 0.15 - sinY * 0.72,
            pose.headCenter.y + sinY * 0.15 + cosY * 0.72,
            0.52,
            0,
            Math.PI * 2
          );
          ctx.arc(
            pose.headCenter.x + cosY * 0.15 + sinY * 0.72,
            pose.headCenter.y + sinY * 0.15 - cosY * 0.72,
            0.52,
            0,
            Math.PI * 2
          );
          ctx.fill();
        } else if (b.type === 'jay') {
          // Streaked white-and-black crown crest on Jay
          ctx.fillStyle = '#f1f5f9';
          ctx.beginPath();
          ctx.arc(
            pose.headCenter.x - cosY * 0.25,
            pose.headCenter.y - sinY * 0.25,
            pose.headRadius * 0.55,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }

      // Beak (Opens slightly during pecking/calling)
      ctx.fillStyle = beakColor;
      ctx.beginPath();
      ctx.moveTo(pose.beakBaseL.x, pose.beakBaseL.y);
      ctx.lineTo(pose.beakTip.x, pose.beakTip.y);
      ctx.lineTo(pose.beakBaseR.x, pose.beakBaseR.y);
      ctx.closePath();
      ctx.fill();

      // White fleshy cere at base of pigeon beak
      if (nightAlpha <= 0.45 && b.type === 'pigeon') {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(
          (pose.beakBaseL.x + pose.beakBaseR.x) * 0.5,
          (pose.beakBaseL.y + pose.beakBaseR.y) * 0.5,
          0.38,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      ctx.restore();
    }
  }
}
