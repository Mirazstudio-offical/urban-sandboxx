import { InventoryItem, Pedestrian, Player } from './types';
import { WEAPON_SPECS, isWeaponItemId } from './weaponData';

export type HumanActionType =
  | 'idle'
  | 'walk'
  | 'sprint'
  | 'limp'
  | 'wading'
  | 'swimming'
  | 'jump'
  | 'dash_roll'
  | 'sitting'
  | 'lying'
  | 'eating'
  | 'drinking'
  | 'med_bandage'
  | 'med_spray'
  | 'med_pills'
  | 'unpacking'
  | 'pickup'
  | 'throw_trash'
  | 'open_hood'
  | 'close_hood'
  | 'mechanic_work'
  | 'fuel_nozzle_use'
  | 'pouring_canister'
  | 'pouring_sandbag'
  | 'extinguisher_spray'
  | 'lighter_flick'
  | 'knife_slash'
  | 'checking_watch'
  | 'key_fob'
  | 'phone_use'
  | 'using_phone'
  | 'sweeping'
  | 'firefighter_hose'
  | 'water_hose_use'
  | 'tow_rope_haul'
  | 'carrying_box'
  | 'carrying_bag'
  | 'carrying_furniture'
  | 'waving'
  | 'window_shopping'
  | 'waiting_impatient'
  | 'stretching'
  | 'talking_gesture'
  | 'panicking'
  | 'cycling'
  | 'scooter'
  | 'calling_112'
  | 'watching_incident'
  | 'startled'
  | 'resting'
  | 'shielding_rain'
  | 'sheltering';

export interface PlayerActionAnimState {
  type: HumanActionType;
  startTime: number; // seconds (performance.now() * 0.001)
  duration: number;  // seconds
  hand?: 'left' | 'right' | 'both';
  itemId?: string;
  intensity?: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface LimbLegPose {
  hip: Vec3;
  knee: Vec3;
  foot: Vec3;
  footAngle: number;
}

export interface LimbArmPose {
  shoulder: Vec3;
  elbow: Vec3;
  hand: Vec3;
  wristAngle: number;
}

export interface HumanPose3D {
  actionType: HumanActionType;
  actionProgress: number; // 0..1
  isLyingDown: boolean;
  isSitting: boolean;
  isSwimming: boolean;
  isDashing: boolean;
  dashRollPhase: number;
  isJumping?: boolean;
  jumpZ?: number;
  landingImpact?: number;

  // Body & Torso 3D articulation
  pelvis: {
    x: number;
    y: number;
    z: number;
    yaw: number;
  };
  torso: {
    x: number;
    y: number;
    zBottom: number;
    zTop: number;
    rx: number;
    ry: number;
    yaw: number;
    pitch: number; // +forward lean, -backward lean
    roll: number;  // +right hip/shoulder dip
    breathScale: number;
  };
  head: {
    x: number;
    y: number;
    z: number;
    radius: number;
    yaw: number;   // left/right gaze rotation
    pitch: number; // +looking down, -head tilted back
    roll: number;  // head tilt
  };

  // Articulated 2-segment limbs
  legL: LimbLegPose;
  legR: LimbLegPose;
  armL: LimbArmPose;
  armR: LimbArmPose;

  // Synchronized 3D props & action geometry (used by both Renderer and ShadowSystem!)
  props: {
    umbrella?: {
      x: number;
      y: number;
      z: number;
      radius: number;
      tiltX: number;
      tiltY: number;
    };
    broom?: {
      gripL: Vec3;
      gripR: Vec3;
      shaftEnd: Vec3;
      headAngle: number;
      sweepNorm: number; // -1..1
    };
    box?: {
      x: number;
      y: number;
      zBottom: number;
      zTop: number;
      w: number; // along X
      l: number; // along Y
      angle: number;
    };
    bag?: {
      x: number;
      y: number;
      zBottom: number;
      zTop: number;
      swingX: number;
      swingY: number;
      swingPitch: number;
    };
    coffee?: {
      x: number;
      y: number;
      z: number;
      isSipping: boolean;
      sipAmount: number; // 0..1
      steamPhase: number;
    };
    phone?: {
      x: number;
      y: number;
      z: number;
      angle: number;
      tapPhase: number;
    };
    extinguisher?: {
      x: number;
      y: number;
      zBottom: number;
      zTop: number;
      angle: number;
      isSpraying: boolean;
    };
    fireNozzle?: {
      x: number;
      y: number;
      z: number;
      angle: number;
      isSpraying: boolean;
    };
    bicycle?: {
      crankAngle: number;
      pedalAngle: number;
      steerAngle: number;
      leanRoll: number;
    };
    scooter?: {
      pushPhase: number;
    };
    dog?: {
      x: number;
      y: number;
      z: number;
      angle: number;
      walkPhase: number;
      legPhase: number;
      tailWag: number;
      tailAngle: number;
      headBob: number;
      leashStart: Vec3;
      leashMid: Vec3;
      leashEnd: Vec3;
    };
    handItemL?: {
      x: number;
      y: number;
      z: number;
      angle: number;
      scale: number;
    };
    handItemR?: {
      x: number;
      y: number;
      z: number;
      angle: number;
      scale: number;
    };
    actionEffect?: {
      kind: 'bandage_gauze' | 'wrench_tool' | 'pour_stream' | 'sand_arc' | 'knife_arc' | 'lighter_flame' | 'crumbs' | 'med_mist';
      type: 'bandage_gauze' | 'wrench_tool' | 'pour_stream' | 'sand_arc' | 'knife_arc' | 'lighter_flame' | 'crumbs' | 'med_mist';
      x: number;
      y: number;
      z: number;
      angle: number;
      progress: number;
    };
  };
}

/**
 * Triggers a timed procedural action animation on the player.
 */
export function triggerPlayerActionAnim(
  player: Player | null | undefined,
  type: HumanActionType,
  duration: number = 1.1,
  optionsOrHandOrItemId?:
    | string
    | {
        hand?: 'left' | 'right' | 'both';
        itemId?: string;
        intensity?: number;
      },
  maybeItemId?: string
): void {
  if (!player) return;
  const nowSec = typeof performance !== 'undefined' ? performance.now() * 0.001 : Date.now() * 0.001;
  let hand: 'left' | 'right' | 'both' | undefined;
  let itemId: string | undefined = maybeItemId;
  let intensity = 1.0;

  if (typeof optionsOrHandOrItemId === 'string') {
    if (optionsOrHandOrItemId === 'left' || optionsOrHandOrItemId === 'right' || optionsOrHandOrItemId === 'both') {
      hand = optionsOrHandOrItemId;
    } else {
      itemId = optionsOrHandOrItemId;
    }
  } else if (optionsOrHandOrItemId && typeof optionsOrHandOrItemId === 'object') {
    hand = optionsOrHandOrItemId.hand;
    itemId = optionsOrHandOrItemId.itemId ?? itemId;
    intensity = optionsOrHandOrItemId.intensity ?? 1.0;
  }

  player.actionAnim = {
    type,
    startTime: nowSec,
    duration: Math.max(0.2, duration),
    hand,
    itemId,
    intensity,
  };
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hashIdToFloat(id: string | undefined): number {
  if (!id) return 0.37;
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * Determines if an inventory item is bulky/two-handed (furniture, 20L canister, sandbag, large crate).
 */
function isBulkyHandItem(item: InventoryItem | null | undefined): boolean {
  if (!item) return false;
  const id = item.itemId || '';
  if (
    id.startsWith('furn_') ||
    id === 'canister_metal_20l' ||
    id === 'fuel_canister' ||
    id === 'canister_empty' ||
    id === 'sandbag' ||
    id.includes('_large') ||
    (item.volume || 0) >= 10
  ) {
    return true;
  }
  return false;
}

/**
 * Computes the complete 3D articulated human pose for either a Player (local/remote) or a Pedestrian (NPC).
 * The returned joint coordinates are in local character space (before scaling by `s = 0.44` and rotating by `angle`),
 * while `z` is in human vertical units (0 = ground, 18.0 = top of standing head).
 */
export function computeHumanPose(
  entity: Player | Pedestrian | any,
  isPlayer: boolean,
  nowSec: number = typeof performance !== 'undefined' ? performance.now() * 0.001 : Date.now() * 0.001
): HumanPose3D {
  const seed = hashIdToFloat(entity.id || entity.peerId || entity.name || 'local_player');
  const phaseOffset = seed * Math.PI * 2;
  const walkCycle: number = entity.walkCycle || 0;

  // Velocity & movement detection
  const vx = entity.vx || 0;
  const vy = entity.vy || 0;
  const rawSpeed = entity.speed !== undefined ? Math.abs(entity.speed) : Math.hypot(vx, vy);
  const velMag = Math.max(rawSpeed, Math.hypot(vx, vy));
  const isMoving = velMag > 2.5 || (isPlayer && !!(entity as any).isMoving);

  // Lying down / unconscious / sleeping / knocked down / dead / crawling from anatomical trauma
  const isLyingDown = Boolean(
    entity.isFainting ||
    entity.isSleeping ||
    entity.body?.isUnconscious ||
    entity.sleepState === 'asleep' ||
    entity.sleepState === 'falling_asleep' ||
    (!isPlayer &&
      (entity.state === 'knocked_down' ||
        entity.state === 'dead' ||
        entity.state === 'unconscious' ||
        entity.state === 'crawling_injured' ||
        (entity.bio && entity.bio.knockdownTimer > 0)))
  );

  // Seated posture
  const isSitting = Boolean(entity.sittingState);

  // Water depth & swimming
  const waterDepth = !entity.insideBuildingId && !entity.insideBusId && !entity.insideCarId && !entity.isFlying ? (entity.waterDepth || 0) : 0;
  const isSwimming = Boolean(entity.isSwimming || waterDepth > 0.85);
  const isWading = !isSwimming && waterDepth > 0.06;

  // Jumping & legacy dashing
  const jumpMeters = Math.max(0, entity.z || 0);
  const isJumping = Boolean((entity.isJumping || jumpMeters > 0.02) && !isSwimming);
  const jumpZUnits = isJumping ? jumpMeters * 10 : 0;
  const landingImpact = !isJumping ? clamp(entity.landingImpact || 0, 0, 1) : 0;
  const isDashing = Boolean(entity.isDashing && !isSwimming && !isJumping);
  const dashTimer = entity.dashTimer || 0;
  const dashRollPhase = isDashing ? clamp(1.0 - dashTimer / 0.28, 0, 1) : 0;

  // Determine active action type & progress
  let actionType: HumanActionType = 'idle';
  let actionProgress = 0;
  let activeHand: 'left' | 'right' | 'both' = entity.activeHand || 'right';
  let activeItemId: string | undefined = undefined;

  if (isLyingDown) {
    actionType = 'lying';
  } else if (isSwimming) {
    actionType = 'swimming';
  } else if (isJumping) {
    actionType = 'jump';
    actionProgress = clamp(jumpMeters / 0.55, 0, 1);
  } else if (isDashing) {
    actionType = 'dash_roll';
    actionProgress = dashRollPhase;
  } else if (isSitting) {
    actionType = 'sitting';
  } else if (isPlayer) {
    // Check player timed action animation first
    const anim: PlayerActionAnimState | undefined = entity.actionAnim;
    if (anim && nowSec - anim.startTime < anim.duration) {
      actionType = anim.type;
      actionProgress = clamp((nowSec - anim.startTime) / anim.duration, 0, 1);
      if (anim.hand) activeHand = anim.hand;
      activeItemId = anim.itemId;
    } else if (entity.consumption?.isConsuming) {
      const c = entity.consumption;
      actionType = c.category === 'drink' ? 'drinking' : 'eating';
      actionProgress = (nowSec * 1.8) % 1.0;
      activeHand = entity.activeHand || 'right';
      activeItemId = c.itemId;
    } else if (entity.heldWaterHose) {
      actionType = 'water_hose_use';
      actionProgress = (nowSec * 2.0) % 1.0;
    } else if (entity.heldFuelNozzle) {
      actionType = 'fuel_nozzle_use';
      actionProgress = (nowSec * 1.5) % 1.0;
    } else if (entity.heldTowRope) {
      actionType = 'tow_rope_haul';
      actionProgress = (nowSec * 1.5) % 1.0;
    } else {
      // Check passive held items in hands
      const lItem: InventoryItem | null = entity.leftHandItem || null;
      const rItem: InventoryItem | null = entity.rightHandItem || null;
      const primaryItem = (entity.activeHand === 'left' ? lItem : rItem) || rItem || lItem;

      if (entity.phoneFlashlightOn || (primaryItem && (primaryItem.itemId === 'phone' || primaryItem.itemId.startsWith('phone_') || primaryItem.itemId === 'smartphone' || primaryItem.phoneAttributes || primaryItem.phoneSpecs))) {
        actionType = 'phone_use';
        activeHand = primaryItem === lItem && primaryItem !== rItem ? 'left' : 'right';
      } else if ( (lItem && lItem.itemId.startsWith('furn_')) || (rItem && rItem.itemId.startsWith('furn_')) ) {
        actionType = 'carrying_furniture';
      } else if (isMoving) {
        const hasLegInjury = Boolean(
          entity.bodyState?.bodyParts &&
            (entity.bodyState.bodyParts.leftLeg?.some((i: any) => !i.treated && i.type !== 'abrasion') ||
              entity.bodyState.bodyParts.rightLeg?.some((i: any) => !i.treated && i.type !== 'abrasion'))
        );
        if (isWading && waterDepth > 0.22) {
          actionType = 'wading';
        } else if (hasLegInjury) {
          actionType = 'limp';
        } else if (velMag > 46) {
          actionType = 'sprint';
        } else {
          actionType = 'walk';
        }
      } else {
        actionType = 'idle';
      }
    }
  } else {
    // NPC / Pedestrian state mapping
    const ped = entity as Pedestrian;
    const isFirefighter = Boolean((ped as any).isFirefighter);
    const ffState = (ped as any).firefighterState;

    if (ped.isCyclist) {
      actionType = 'cycling';
    } else if (ped.isScooter) {
      actionType = 'scooter';
    } else if (isFirefighter && (ffState === 'extinguishing' || ffState === 'going_to_fire' || ffState === 'taking_hose')) {
      actionType = 'firefighter_hose';
    } else if (ped.state === 'extinguishing_fire') {
      actionType = 'extinguisher_spray';
    } else if (ped.state === 'panicking') {
      actionType = 'panicking';
    } else if (ped.state === 'startled') {
      actionType = 'startled';
    } else if (ped.state === 'calling_112') {
      actionType = 'calling_112';
    } else if (ped.state === 'watching_incident') {
      actionType = 'watching_incident';
    } else if (ped.state === 'resting') {
      actionType = 'resting';
    } else if (ped.state === 'sheltering') {
      actionType = 'sheltering';
    } else if (ped.state === 'greeting') {
      actionType = 'waving';
    } else if (ped.state === 'waiting_taxi') {
      actionType = 'waving';
    } else if (ped.state === 'idle_phone' || ped.handheldProp === 'phone') {
      actionType = 'phone_use';
    } else if (ped.state === 'idle_window') {
      actionType = 'window_shopping';
    } else if (ped.hasBroom || ped.isJanitor) {
      actionType = 'sweeping';
    } else if (ped.handheldProp === 'box') {
      actionType = 'carrying_box';
    } else if (ped.handheldProp === 'bag') {
      actionType = 'carrying_bag';
    } else if (ped.state === 'waiting_light' || ped.state === 'waiting_traffic' || ped.state === 'yielding_siren') {
      actionType = 'waiting_impatient';
    } else if (ped.state === 'injured_limp' || (ped.bio && ped.bio.injuryLevel > 22 && isMoving)) {
      actionType = 'limp';
    } else if (isMoving) {
      if (ped.state === 'seeking_shelter' && !ped.hasUmbrella && !ped.hoodUp) {
        actionType = 'shielding_rain';
      } else {
        actionType = velMag > 62 ? 'sprint' : 'walk';
      }
    } else {
      // Idle micro-behaviors for stationary NPCs
      const idleCycle = (nowSec * 0.25 + seed * 10) % 1.0;
      if (idleCycle < 0.25) actionType = 'checking_watch';
      else if (idleCycle < 0.45) actionType = 'stretching';
      else actionType = 'idle';
    }
  }

  // Baseline breathing & physiological exertion rhythm
  const pedBio = !isPlayer ? (entity as Pedestrian).bio : undefined;
  const pedPsy = !isPlayer ? (entity as Pedestrian).psy : undefined;
  const pOxygenDebt = isPlayer ? (entity.bodyState?.oxygenDebt || 0) : 0;
  const pEnergy = isPlayer ? (entity.needs?.energy ?? 100) : 100;
  const playerExertionFactor = isPlayer
    ? clamp(1.0 + (pOxygenDebt / 100) * 1.15 + Math.max(0, 50 - pEnergy) * 0.012 + (velMag > 46 ? 0.35 : 0), 1.0, 2.5)
    : 1.0;
  const exertionFactor = pedBio
    ? clamp(1.0 + (100 - pedBio.stamina) * 0.015 + (pedPsy?.arousal || 0) * 0.7, 1.0, 2.3)
    : playerExertionFactor;
  const breathRate = 2.35 * exertionFactor;
  const breathWave = Math.sin(nowSec * breathRate + phaseOffset);
  const breathAmp = pedBio && pedBio.stamina < 35 ? 0.055 : (isPlayer && (pOxygenDebt > 35 || pEnergy < 30) ? 0.058 : 0.028);
  const breathScale = 1.0 + breathWave * breathAmp;
  const idleShift = isMoving || isJumping ? 0 : Math.sin(nowSec * 1.15 + phaseOffset) * 0.42;

  // Initialize default standing pose
  const pelvis = {
    x: 0,
    y: idleShift * 0.5,
    z: 8.2,
    yaw: 0,
  };

  const torso = {
    x: 0,
    y: idleShift * 0.35,
    zBottom: 8.0,
    zTop: 14.6,
    rx: isPlayer ? 4.4 : 4.1,
    ry: isPlayer ? 5.8 : 5.6,
    yaw: 0,
    pitch: 0,
    roll: 0,
    breathScale,
  };

  const head = {
    x: 1.6,
    y: idleShift * 0.2,
    z: 16.8,
    radius: 3.3,
    yaw: 0,
    pitch: 0,
    roll: 0,
  };

  const legL: LimbLegPose = {
    hip: { x: 0, y: -2.0, z: 8.0 },
    knee: { x: 0.4, y: -2.0, z: 4.2 },
    foot: { x: 0.2, y: -2.0, z: 0 },
    footAngle: 0,
  };

  const legR: LimbLegPose = {
    hip: { x: 0, y: 2.0, z: 8.0 },
    knee: { x: 0.4, y: 2.0, z: 4.2 },
    foot: { x: 0.2, y: 2.0, z: 0 },
    footAngle: 0,
  };

  const armL: LimbArmPose = {
    shoulder: { x: 0.2, y: -4.8, z: 14.0 },
    elbow: { x: 0.5, y: -5.3, z: 10.6 },
    hand: { x: 1.2, y: -4.9, z: 8.2 },
    wristAngle: 0,
  };

  const armR: LimbArmPose = {
    shoulder: { x: 0.2, y: 4.8, z: 14.0 },
    elbow: { x: 0.5, y: 5.3, z: 10.6 },
    hand: { x: 1.2, y: 4.9, z: 8.2 },
    wristAngle: 0,
  };

  const props: HumanPose3D['props'] = {};

  // =========================================================================
  // 1. LOCOMOTION GAIT SOLVER (Walk, Sprint, Limp, Wading, Panicking, Cycling, Scooter)
  // =========================================================================
  if (isLyingDown) {
    torso.zBottom = 0.5;
    torso.zTop = 3.2;
    pelvis.z = 1.8;
    head.x = 6.2;
    head.y = 0;
    head.z = 2.4;
    legL.hip = { x: -2.5, y: -2.0, z: 1.5 };
    legL.knee = { x: -6.0, y: -2.2, z: 1.2 };
    legL.foot = { x: -9.5, y: -2.4, z: 0.8 };
    legR.hip = { x: -2.5, y: 2.0, z: 1.5 };
    legR.knee = { x: -6.0, y: 2.2, z: 1.2 };
    legR.foot = { x: -9.5, y: 2.4, z: 0.8 };
    armL.shoulder = { x: 2.5, y: -4.2, z: 2.2 };
    armL.elbow = { x: 1.0, y: -5.6, z: 1.4 };
    armL.hand = { x: 3.2, y: -4.8, z: 1.0 };
    armR.shoulder = { x: 2.5, y: 4.2, z: 2.2 };
    armR.elbow = { x: 1.0, y: 5.6, z: 1.4 };
    armR.hand = { x: 3.2, y: 4.8, z: 1.0 };
  } else if (isSitting) {
    // Seated posture: pelvis at chair height z=5.5, knees forward, feet planted
    pelvis.x = -1.0;
    pelvis.z = 5.5;
    torso.x = -1.0;
    torso.zBottom = 5.5;
    torso.zTop = 11.2;
    head.x = 1.4;
    head.z = 13.0;
    head.yaw = Math.sin(nowSec * 0.7 + phaseOffset) * 0.14;

    legL.hip = { x: -0.5, y: -2.2, z: 5.5 };
    legL.knee = { x: 3.6, y: -2.4, z: 5.2 };
    legL.foot = { x: 4.2, y: -2.4, z: 0.5 };
    legR.hip = { x: -0.5, y: 2.2, z: 5.5 };
    legR.knee = { x: 3.6, y: 2.4, z: 5.2 };
    legR.foot = { x: 4.2, y: 2.4, z: 0.5 };

    armL.shoulder = { x: -0.6, y: -4.6, z: 10.5 };
    armL.elbow = { x: 1.2, y: -5.0, z: 7.8 };
    armL.hand = { x: 3.4, y: -4.0, z: 6.2 };
    armR.shoulder = { x: -0.6, y: 4.6, z: 10.5 };
    armR.elbow = { x: 1.2, y: 5.0, z: 7.8 };
    armR.hand = { x: 3.4, y: 4.0, z: 6.2 };
  } else if (isSwimming) {
    const strokePhase = entity.swimStrokePhase ?? walkCycle * 0.75;
    const kickL = Math.sin(strokePhase * 2.0) * 2.2;
    const kickR = -kickL;
    const reachX = Math.cos(strokePhase) * 3.8 + 2.6;
    const sweepY = Math.max(0, Math.sin(strokePhase)) * 4.2 + 4.0;

    pelvis.x = -5.5;
    pelvis.z = 1.2;
    torso.x = -1.8;
    torso.zBottom = 1.0;
    torso.zTop = 2.8;
    head.x = 3.0;
    head.z = 3.6;

    legL.hip = { x: -6.0, y: -2.2, z: 1.0 };
    legL.knee = { x: -9.5, y: -2.4 + kickL * 0.3, z: 0.8 };
    legL.foot = { x: -13.0, y: -2.8 + kickL * 0.5, z: 0.5 };
    legR.hip = { x: -6.0, y: 2.2, z: 1.0 };
    legR.knee = { x: -9.5, y: 2.4 + kickR * 0.3, z: 0.8 };
    legR.foot = { x: -13.0, y: 2.8 + kickR * 0.5, z: 0.5 };

    armL.shoulder = { x: 0.8, y: -3.8, z: 2.0 };
    armL.elbow = { x: reachX * 0.55, y: -sweepY - 0.8, z: 2.2 };
    armL.hand = { x: reachX + 0.8, y: -sweepY * 0.72, z: 2.4 };
    armR.shoulder = { x: 0.8, y: 3.8, z: 2.0 };
    armR.elbow = { x: reachX * 0.55, y: sweepY + 0.8, z: 2.2 };
    armR.hand = { x: reachX + 0.8, y: sweepY * 0.72, z: 2.4 };
  } else if (actionType === 'jump') {
    // Athletic countermovement jump tuck & mid-air balance arms
    const vz = entity.vz || 0;
    const tuck = clamp(jumpMeters / 0.52, 0.25, 1.0);
    const kneeFlex = tuck * 2.2;
    const armRaise = vz >= 0 ? 1.8 : 0.8;

    pelvis.z = 8.4 + tuck * 0.8;
    torso.x = 0.75;
    torso.pitch = 0.22;
    torso.zBottom = pelvis.z - 0.2;
    torso.zTop = pelvis.z + 6.3;
    head.x = 2.1;
    head.z = torso.zTop + 2.1;

    // Split lead/trail knee tuck
    legL.hip = { x: -0.2, y: -2.15, z: pelvis.z - 0.2 };
    legL.knee = { x: 2.2 * tuck, y: -2.25, z: 4.9 + kneeFlex * 0.85 };
    legL.foot = { x: -1.3 * tuck, y: -2.2, z: 1.9 + tuck * 1.6 };
    legL.footAngle = -0.35 * tuck;

    legR.hip = { x: -0.2, y: 2.15, z: pelvis.z - 0.2 };
    legR.knee = { x: 1.4 * tuck, y: 2.25, z: 4.5 + kneeFlex * 0.6 };
    legR.foot = { x: -2.0 * tuck, y: 2.2, z: 1.4 + tuck * 1.2 };
    legR.footAngle = -0.28 * tuck;

    armL.shoulder = { x: torso.x, y: -4.8, z: torso.zTop - 0.6 };
    armL.elbow = { x: 1.2, y: -5.8, z: torso.zTop - 2.2 + armRaise };
    armL.hand = { x: 3.1, y: -5.4, z: torso.zTop - 0.8 + armRaise * 1.3 };

    armR.shoulder = { x: torso.x, y: 4.8, z: torso.zTop - 0.6 };
    armR.elbow = { x: 1.2, y: 5.8, z: torso.zTop - 2.2 + armRaise };
    armR.hand = { x: 3.1, y: 5.4, z: torso.zTop - 0.8 + armRaise * 1.3 };
  } else if (isDashing) {
    // Dynamic tucked forward somersault / dive roll
    const rollSin = Math.sin(dashRollPhase * Math.PI);
    const rollCos = Math.cos(dashRollPhase * Math.PI * 2);
    pelvis.x = -1.2 * rollSin;
    pelvis.z = 5.0 + rollSin * 3.5;
    torso.x = rollCos * 1.6;
    torso.zBottom = 4.2;
    torso.zTop = 10.5;
    torso.pitch = 1.1 * rollSin;
    head.x = 2.8 * (1 - rollSin * 0.6);
    head.z = 9.5 - rollSin * 2.5;

    legL.hip = { x: -1.5, y: -2.2, z: 5.5 };
    legL.knee = { x: 1.8, y: -2.5, z: 6.2 };
    legL.foot = { x: -2.8, y: -2.2, z: 3.2 * rollSin };
    legR.hip = { x: -1.5, y: 2.2, z: 5.5 };
    legR.knee = { x: 1.8, y: 2.5, z: 6.2 };
    legR.foot = { x: -2.8, y: 2.2, z: 3.2 * rollSin };

    armL.shoulder = { x: 1.0, y: -4.2, z: 9.0 };
    armL.elbow = { x: 2.8, y: -4.6, z: 7.5 };
    armL.hand = { x: 2.2, y: -2.5, z: 6.0 };
    armR.shoulder = { x: 1.0, y: 4.2, z: 9.0 };
    armR.elbow = { x: 2.8, y: 4.6, z: 7.5 };
    armR.hand = { x: 2.2, y: 2.5, z: 6.0 };
  } else if (actionType === 'cycling') {
    // Cyclist pedaling crank kinematics
    const crank = walkCycle * 1.35;
    const sinC = Math.sin(crank);
    const cosC = Math.cos(crank);

    torso.x = 0.8; // leaned forward toward handlebars
    torso.pitch = 0.38;
    torso.zBottom = 8.8;
    torso.zTop = 14.5;
    head.x = 2.6;
    head.z = 16.4;

    legL.hip = { x: -1.2, y: -2.1, z: 8.8 };
    legL.knee = { x: 1.8 + cosC * 1.4, y: -2.3, z: 6.2 + sinC * 1.8 };
    legL.foot = { x: 0.6 + cosC * 2.2, y: -2.2, z: 2.4 + sinC * 1.6 };

    legR.hip = { x: -1.2, y: 2.1, z: 8.8 };
    legR.knee = { x: 1.8 - cosC * 1.4, y: 2.3, z: 6.2 - sinC * 1.8 };
    legR.foot = { x: 0.6 - cosC * 2.2, y: 2.2, z: 2.4 - sinC * 1.6 };

    armL.shoulder = { x: 1.2, y: -4.3, z: 13.8 };
    armL.elbow = { x: 2.8, y: -3.9, z: 11.8 };
    armL.hand = { x: 4.2, y: -3.0, z: 10.5 };
    armR.shoulder = { x: 1.2, y: 4.3, z: 13.8 };
    armR.elbow = { x: 2.8, y: 3.9, z: 11.8 };
    armR.hand = { x: 4.2, y: 3.0, z: 10.5 };

    props.bicycle = {
      crankAngle: crank,
      pedalAngle: crank,
      steerAngle: Math.sin(walkCycle * 0.5) * 0.06,
      leanRoll: Math.sin(walkCycle * 0.5) * 0.08,
    };
  } else if (actionType === 'scooter') {
    // Electric scooter rider posture
    const pushPhase = Math.sin(walkCycle * 0.7);
    torso.x = 0.4;
    torso.zBottom = 9.0;
    torso.zTop = 15.4;
    head.x = 2.0;
    head.z = 17.5;

    // Left foot forward on scooter deck, right foot braced behind on deck
    legL.hip = { x: -0.2, y: -1.8, z: 8.8 };
    legL.knee = { x: 0.8, y: -1.6, z: 5.0 };
    legL.foot = { x: 1.2, y: -1.4, z: 1.4 };

    legR.hip = { x: -0.6, y: 1.8, z: 8.8 };
    legR.knee = { x: -1.4, y: 1.7, z: 5.0 };
    legR.foot = { x: -2.2, y: 1.5, z: 1.4 };

    armL.shoulder = { x: 0.6, y: -4.2, z: 14.5 };
    armL.elbow = { x: 2.4, y: -3.6, z: 12.6 };
    armL.hand = { x: 4.4, y: -2.6, z: 11.8 };
    armR.shoulder = { x: 0.6, y: 4.2, z: 14.5 };
    armR.elbow = { x: 2.4, y: 3.6, z: 12.6 };
    armR.hand = { x: 4.4, y: 2.6, z: 11.8 };

    props.scooter = { pushPhase };
  } else if (isMoving) {
    // Walking / Sprinting / Limping / Wading / Panicking / Rain-shielding gait
    const isSprint = actionType === 'sprint' || actionType === 'panicking' || actionType === 'shielding_rain' || velMag > 110;
    const isLimp = actionType === 'limp';
    const isElderly = !isPlayer && (entity as Pedestrian).ageGroup === 'elderly';
    const isChildNpc = !isPlayer && ((entity as Pedestrian).isChild || (entity as Pedestrian).ageGroup === 'child');
    const wadeRatio = isWading ? clamp(waterDepth / 0.85, 0, 1) : 0;

    const ageStrideMul = isElderly ? 0.72 : isChildNpc ? 1.08 : 1.0;
    const strideAmp = (isSprint ? 4.3 : isLimp ? 2.2 : 3.2) * ageStrideMul * (1 - wadeRatio * 0.38);
    const kneeLiftAmp = (isSprint ? 3.1 : isWading ? 2.8 : isElderly ? 1.1 : 1.65);
    const sinW = Math.sin(walkCycle);
    const cosW = Math.cos(walkCycle);

    // Asymmetric hitch if limping
    const limpSide = pedBio?.limpSide || -1;
    const limpAsymL = isLimp && limpSide < 0 ? 0.52 : 1.0;
    const limpAsymR = isLimp && limpSide > 0 ? 0.52 : 1.0;
    const strideL = sinW * strideAmp * limpAsymL;
    const strideR = -sinW * strideAmp * limpAsymR;

    // Vertical foot lift during forward swing phase (when cosW > 0 for L, cosW < 0 for R)
    const liftL = Math.max(0, cosW) * kneeLiftAmp * limpAsymL;
    const liftR = Math.max(0, -cosW) * kneeLiftAmp * limpAsymR;

    // Vertical double-frequency bounce of pelvis & torso during gait
    const bobZ = Math.abs(sinW) * (isSprint ? 1.15 : isChildNpc ? 0.85 : isElderly ? 0.35 : 0.62) - (isLimp && sinW * -limpSide > 0 ? 0.85 : 0);
    pelvis.z = 8.2 + bobZ;
    pelvis.yaw = -sinW * (isSprint ? 0.22 : isElderly ? 0.09 : 0.14);

    torso.x = (isSprint ? 1.15 : isElderly ? 0.85 : 0.35);
    torso.zBottom = 8.0 + bobZ;
    torso.zTop = 14.6 + bobZ - (isSprint ? 0.5 : isElderly ? 0.6 : 0);
    torso.yaw = sinW * (isSprint ? 0.26 : isElderly ? 0.10 : 0.16);
    torso.pitch = isSprint ? 0.32 : isElderly ? 0.22 : 0.08;
    torso.roll = isLimp ? Math.max(0, sinW * -limpSide) * 0.22 * -limpSide : sinW * 0.06;

    head.x = 1.6 + (isSprint ? 0.85 : isElderly ? 0.65 : 0.25);
    head.z = 16.8 + bobZ - (isSprint ? 0.4 : isElderly ? 0.55 : 0);
    head.yaw = -torso.yaw * 0.35; // Head stabilizes forward

    // Left Leg (Hip -> Knee -> Foot)
    legL.hip = { x: pelvis.x - sinW * 0.4, y: -2.1, z: pelvis.z - 0.2 };
    legL.knee = {
      x: strideL * 0.62 + Math.max(0, cosW) * 1.4,
      y: -2.15,
      z: 4.1 + liftL * 0.85,
    };
    legL.foot = {
      x: strideL - Math.max(0, cosW) * 0.5,
      y: -2.15,
      z: liftL,
    };
    legL.footAngle = sinW * 0.12;

    // Right Leg (Hip -> Knee -> Foot)
    legR.hip = { x: pelvis.x + sinW * 0.4, y: 2.1, z: pelvis.z - 0.2 };
    legR.knee = {
      x: strideR * 0.62 + Math.max(0, -cosW) * 1.4,
      y: 2.15,
      z: 4.1 + liftR * 0.85,
    };
    legR.foot = {
      x: strideR - Math.max(0, -cosW) * 0.5,
      y: 2.15,
      z: liftR,
    };
    legR.footAngle = -sinW * 0.12;

    // Counter-swinging 2-segment arms (Left arm swings with Right leg: -sinW)
    const armSwingAmp = isSprint ? 3.8 : 2.7;
    const armOut = wadeRatio > 0.25 ? (wadeRatio - 0.25) * 2.6 : 0;
    const swingL = -sinW * armSwingAmp;
    const swingR = sinW * armSwingAmp;
    const elbowBendL = isSprint ? 1.8 : Math.max(0.3, -sinW * 1.2 + 0.5);
    const elbowBendR = isSprint ? 1.8 : Math.max(0.3, sinW * 1.2 + 0.5);

    const shTwistX = Math.sin(torso.yaw) * 4.8;
    armL.shoulder = { x: torso.x + shTwistX, y: -4.8, z: torso.zTop - 0.6 };
    armL.elbow = {
      x: armL.shoulder.x + swingL * 0.45 - 0.6,
      y: -5.2 - armOut * 0.6,
      z: armL.shoulder.z - 3.2 + (isSprint ? 0.8 : 0),
    };
    armL.hand = {
      x: armL.elbow.x + swingL * 0.55 + elbowBendL,
      y: -4.8 - armOut + (isSprint ? 0.9 : 0),
      z: armL.elbow.z - 2.0 + Math.max(0, -sinW) * (isSprint ? 2.4 : 1.1) + armOut * 0.8,
    };

    armR.shoulder = { x: torso.x - shTwistX, y: 4.8, z: torso.zTop - 0.6 };
    armR.elbow = {
      x: armR.shoulder.x + swingR * 0.45 - 0.6,
      y: 5.2 + armOut * 0.6,
      z: armR.shoulder.z - 3.2 + (isSprint ? 0.8 : 0),
    };
    armR.hand = {
      x: armR.elbow.x + swingR * 0.55 + elbowBendR,
      y: 4.8 + armOut - (isSprint ? 0.9 : 0),
      z: armR.elbow.z - 2.0 + Math.max(0, sinW) * (isSprint ? 2.4 : 1.1) + armOut * 0.8,
    };

    if (isLimp) {
      // Left hand braces against injured left thigh
      armL.elbow = { x: 0.8, y: -4.6, z: 10.2 };
      armL.hand = { x: 1.8 + strideL * 0.3, y: -2.8, z: 7.8 };
    }
  } else {
    // Stationary Idle Subtle Motion
    const lookWave = Math.sin(nowSec * 0.65 + phaseOffset);
    head.yaw = lookWave * 0.16;
    torso.yaw = Math.sin(nowSec * 0.9 + phaseOffset) * 0.04;
    legL.foot.x = 0.3;
    legR.foot.x = -0.2;
    legR.footAngle = 0.08;
  }

  // =========================================================================
  // 2. UPPER-BODY & FULL-BODY ACTION OVERRIDES (Player & NPC Actions)
  // =========================================================================
  const env = Math.sin(actionProgress * Math.PI); // Smooth 0 -> 1 -> 0 envelope for one-shot actions

  switch (actionType) {
    case 'eating': {
      // Bringing food in active hand to mouth + chewing rhythm
      const chew = Math.sin(nowSec * 11.5);
      const lift = isPlayer && entity.actionAnim ? clamp(Math.sin(actionProgress * Math.PI * 0.85) * 1.25, 0, 1) : 0.88;
      head.pitch = 0.15 * lift + chew * 0.06;
      head.x = 1.6 + 0.35 * lift;
      const targetArm = activeHand === 'left' ? armL : armR;
      const sideSign = activeHand === 'left' ? -1 : 1;
      targetArm.elbow = {
        x: lerp(targetArm.elbow.x, 3.2, lift),
        y: lerp(targetArm.elbow.y, sideSign * 4.4, lift),
        z: lerp(targetArm.elbow.z, 12.8, lift),
      };
      targetArm.hand = {
        x: lerp(targetArm.hand.x, 4.4 + chew * 0.35, lift),
        y: lerp(targetArm.hand.y, sideSign * 0.9, lift),
        z: lerp(targetArm.hand.z, 15.6 + chew * 0.25, lift),
      };
      props.actionEffect = {
        kind: 'crumbs',
        type: 'crumbs',
        x: 4.8,
        y: sideSign * 0.5,
        z: 15.2,
        angle: chew * 0.3,
        progress: actionProgress,
      };
      break;
    }

    case 'drinking': {
      // Tilting head back, lifting elbow high and tipping bottle/cup to lips
      const gulp = Math.sin(nowSec * 8.0);
      const lift = isPlayer && entity.actionAnim ? clamp(Math.sin(actionProgress * Math.PI * 0.85) * 1.25, 0, 1) : 0.92;
      head.pitch = -0.32 * lift + gulp * 0.04; // Head tilted back
      head.x = 1.3 - 0.3 * lift;
      head.z = 17.0 + 0.3 * lift;
      const targetArm = activeHand === 'left' ? armL : armR;
      const sideSign = activeHand === 'left' ? -1 : 1;
      targetArm.elbow = {
        x: lerp(targetArm.elbow.x, 3.8, lift),
        y: lerp(targetArm.elbow.y, sideSign * 4.8, lift),
        z: lerp(targetArm.elbow.z, 15.2, lift),
      };
      targetArm.hand = {
        x: lerp(targetArm.hand.x, 4.6, lift),
        y: lerp(targetArm.hand.y, sideSign * 0.6, lift),
        z: lerp(targetArm.hand.z, 17.2 + gulp * 0.2, lift),
      };
      break;
    }

    case 'med_bandage': {
      // Both hands winding gauze bandage in front of torso, leaning forward
      const wind = nowSec * 9.5;
      torso.pitch = 0.28;
      torso.x += 0.6;
      head.x += 0.9;
      head.pitch = 0.35;
      armL.elbow = { x: 2.6, y: -4.4, z: 11.4 };
      armR.elbow = { x: 2.6, y: 4.4, z: 11.4 };
      armL.hand = {
        x: 4.8 + Math.cos(wind) * 1.1,
        y: -1.4 + Math.sin(wind) * 0.9,
        z: 11.2 + Math.sin(wind) * 0.8,
      };
      armR.hand = {
        x: 4.8 - Math.cos(wind) * 1.1,
        y: 1.4 - Math.sin(wind) * 0.9,
        z: 11.2 - Math.sin(wind) * 0.8,
      };
      props.actionEffect = {
        kind: 'bandage_gauze',
        type: 'bandage_gauze',
        x: 4.8,
        y: 0,
        z: 11.2,
        angle: wind,
        progress: actionProgress,
      };
      break;
    }

    case 'med_spray': {
      // Left arm presented in front, right hand spraying/applying ointment onto left forearm
      const rub = Math.sin(nowSec * 12.0);
      head.pitch = 0.25;
      armL.elbow = { x: 2.4, y: -4.0, z: 11.0 };
      armL.hand = { x: 4.2, y: -1.0, z: 11.2 };
      armR.elbow = { x: 2.8, y: 4.2, z: 12.0 };
      armR.hand = { x: 4.5 + rub * 0.6, y: 0.4 + rub * 0.5, z: 12.2 };
      props.actionEffect = {
        kind: 'med_mist',
        type: 'med_mist',
        x: 4.3,
        y: -0.4,
        z: 11.6,
        angle: rub * 0.2,
        progress: actionProgress,
      };
      break;
    }

    case 'med_pills': {
      // Quick toss to mouth & head tilt back
      const lift = env;
      head.pitch = -0.35 * lift;
      const targetArm = activeHand === 'left' ? armL : armR;
      const sideSign = activeHand === 'left' ? -1 : 1;
      targetArm.elbow = { x: 3.2, y: sideSign * 4.2, z: 13.8 };
      targetArm.hand = { x: 4.2, y: sideSign * 0.5, z: 16.4 };
      break;
    }

    case 'unpacking': {
      // Both hands gripping package in front of chest and pulling apart to tear open seal
      const pull = Math.sin(actionProgress * Math.PI * 2.5);
      const sep = 1.4 + Math.max(0, actionProgress - 0.35) * 2.4 + Math.abs(pull) * 0.5;
      head.pitch = 0.25;
      armL.elbow = { x: 2.4, y: -4.8, z: 11.8 };
      armR.elbow = { x: 2.4, y: 4.8, z: 11.8 };
      armL.hand = { x: 4.8, y: -sep, z: 11.8 };
      armR.hand = { x: 4.8, y: sep, z: 11.8 };
      break;
    }

    case 'pickup': {
      // Deep knee bend + torso crouch + hand reaching down to ground z=1.5
      const crouch = env;
      pelvis.z = lerp(pelvis.z, 4.8, crouch);
      torso.x = lerp(torso.x, 1.8, crouch);
      torso.zBottom = lerp(torso.zBottom, 4.6, crouch);
      torso.zTop = lerp(torso.zTop, 9.8, crouch);
      torso.pitch = lerp(torso.pitch, 0.65, crouch);
      head.x = lerp(head.x, 3.6, crouch);
      head.z = lerp(head.z, 11.2, crouch);
      head.pitch = 0.35 * crouch;

      legL.knee = { x: lerp(legL.knee.x, 2.4, crouch), y: -2.3, z: lerp(legL.knee.z, 3.2, crouch) };
      legR.knee = { x: lerp(legR.knee.x, 2.4, crouch), y: 2.3, z: lerp(legR.knee.z, 3.2, crouch) };

      const reachArm = activeHand === 'left' ? armL : armR;
      const sideSign = activeHand === 'left' ? -1 : 1;
      reachArm.shoulder.z = torso.zTop - 0.5;
      reachArm.elbow = {
        x: lerp(reachArm.elbow.x, 3.8, crouch),
        y: sideSign * 3.8,
        z: lerp(reachArm.elbow.z, 6.0, crouch),
      };
      reachArm.hand = {
        x: lerp(reachArm.hand.x, 6.2, crouch),
        y: sideSign * 1.2,
        z: lerp(reachArm.hand.z, 1.4, crouch),
      };
      break;
    }

    case 'throw_trash':
    case 'key_fob': {
      // Extending active arm forward to toss trash / point key fob / turn lock
      const ext = env;
      const targetArm = activeHand === 'left' ? armL : armR;
      const sideSign = activeHand === 'left' ? -1 : 1;
      torso.yaw = -sideSign * 0.18 * ext;
      targetArm.elbow = {
        x: lerp(targetArm.elbow.x, 3.6, ext),
        y: sideSign * 3.8,
        z: lerp(targetArm.elbow.z, 12.6, ext),
      };
      targetArm.hand = {
        x: lerp(targetArm.hand.x, 6.6, ext),
        y: sideSign * 1.8,
        z: lerp(targetArm.hand.z, 12.8, ext),
      };
      break;
    }

    case 'checking_watch': {
      // Left wrist raised in front of chest, head tilted down to read dial
      const lift = isPlayer && entity.actionAnim ? env : 0.9;
      head.pitch = 0.26 * lift;
      head.yaw = -0.18 * lift;
      armL.elbow = {
        x: lerp(armL.elbow.x, 2.5, lift),
        y: lerp(armL.elbow.y, -4.6, lift),
        z: lerp(armL.elbow.z, 11.8, lift),
      };
      armL.hand = {
        x: lerp(armL.hand.x, 4.2, lift),
        y: lerp(armL.hand.y, -1.2, lift),
        z: lerp(armL.hand.z, 13.0, lift),
      };
      break;
    }

    case 'stretching': {
      // NPC idle stretch: both arms raised high overhead, chest expanded
      const sWave = Math.sin(nowSec * 1.8 + phaseOffset) * 0.5 + 0.5;
      torso.breathScale = 1.05;
      head.pitch = -0.18 * sWave;
      armL.elbow = { x: 0.4, y: -5.4, z: 15.8 };
      armL.hand = { x: 0.2, y: -4.6, z: 18.8 + sWave * 1.0 };
      armR.elbow = { x: 0.4, y: 5.4, z: 15.8 };
      armR.hand = { x: 0.2, y: 4.6, z: 18.8 + sWave * 1.0 };
      break;
    }

    case 'open_hood': {
      // Three-phase realistic hood lift:
      // 0.00-0.22: Lean in & pop safety latch under leading edge
      // 0.22-0.72: Two-handed smooth upward lift of the hood panel
      // 0.72-1.00: Left hand holds hood while right hand seats the prop rod, then relax
      const p = clamp(actionProgress, 0, 1);
      if (p < 0.22) {
        const t = p / 0.22;
        const ease = t * t * (3 - 2 * t);
        const flick = Math.sin(t * Math.PI) * 0.65;
        torso.x += 1.05 * ease;
        torso.zTop -= 0.9 * ease;
        torso.pitch = 0.34 * ease;
        head.x += 1.35 * ease;
        head.z -= 0.75 * ease;
        head.pitch = 0.28 * ease;
        armL.elbow = { x: lerp(0.5, 3.2, ease), y: lerp(-4.7, -3.8, ease), z: lerp(11.4, 10.2, ease) };
        armL.hand = { x: lerp(0.9, 5.4, ease), y: lerp(-4.5, -2.0, ease), z: lerp(9.0, 9.6, ease) };
        armR.elbow = { x: lerp(0.5, 3.5, ease), y: lerp(4.7, 3.6, ease), z: lerp(11.4, 10.0, ease) };
        armR.hand = { x: lerp(0.9, 6.0, ease) + flick * 0.4, y: lerp(4.5, 1.0, ease) - flick * 0.7, z: lerp(9.0, 9.2, ease) + flick * 0.3 };
      } else if (p < 0.74) {
        const t = (p - 0.22) / 0.52;
        const lift = t * t * (3 - 2 * t);
        torso.x += lerp(1.05, -0.25, lift);
        torso.zTop += lerp(-0.9, 0.35, lift);
        torso.pitch = lerp(0.34, -0.06, lift);
        head.x += lerp(1.35, -0.1, lift);
        head.z += lerp(-0.75, 0.3, lift);
        head.pitch = lerp(0.28, -0.14, lift);
        armL.elbow = { x: lerp(3.2, 2.8, lift), y: lerp(-3.8, -4.3, lift), z: lerp(10.2, 13.8, lift) };
        armL.hand = { x: lerp(5.4, 4.7, lift), y: lerp(-2.0, -2.2, lift), z: lerp(9.6, 16.4, lift) };
        armR.elbow = { x: lerp(3.5, 2.8, lift), y: lerp(3.6, 4.3, lift), z: lerp(10.0, 13.8, lift) };
        armR.hand = { x: lerp(6.0, 4.7, lift), y: lerp(1.0, 2.2, lift), z: lerp(9.2, 16.4, lift) };
      } else {
        const t = (p - 0.74) / 0.26;
        const rodSwing = Math.sin(clamp(t * 1.4, 0, 1) * Math.PI);
        const relax = clamp((t - 0.45) / 0.55, 0, 1);
        const relaxEase = relax * relax * (3 - 2 * relax);
        torso.x += lerp(-0.25, 0, relaxEase);
        torso.zTop += lerp(0.35, 0, relaxEase);
        torso.pitch = lerp(-0.06, 0, relaxEase);
        head.x += lerp(-0.1, 0, relaxEase);
        head.z += lerp(0.3, 0, relaxEase);
        head.pitch = lerp(-0.14, 0.05, relaxEase);
        armL.elbow = { x: lerp(2.8, 0.6, relaxEase), y: lerp(-4.3, -4.7, relaxEase), z: lerp(13.8, 11.4, relaxEase) };
        armL.hand = { x: lerp(4.7, 1.0, relaxEase), y: lerp(-2.2, -4.5, relaxEase), z: lerp(16.4, 9.0, relaxEase) };
        armR.elbow = {
          x: lerp(2.8 + rodSwing * 0.8, 0.6, relaxEase),
          y: lerp(4.3 - rodSwing * 0.5, 4.7, relaxEase),
          z: lerp(12.2 + rodSwing * 1.4, 11.4, relaxEase),
        };
        armR.hand = {
          x: lerp(5.4 + rodSwing * 0.9, 1.0, relaxEase),
          y: lerp(2.4 - rodSwing * 0.6, 4.5, relaxEase),
          z: lerp(12.4 + rodSwing * 2.4, 9.0, relaxEase),
        };
      }
      break;
    }

    case 'close_hood': {
      // Three-phase realistic hood close:
      // 0.00-0.28: Reach up, left hand holds raised hood while right hand unhooks prop rod
      // 0.28-0.78: Two-handed smooth downward guide & weighted slam
      // 0.78-1.00: Firm palm press to engage latch & smooth return to neutral
      const p = clamp(actionProgress, 0, 1);
      if (p < 0.28) {
        const t = p / 0.28;
        const reach = t * t * (3 - 2 * t);
        const rodPull = Math.sin(t * Math.PI);
        torso.x += lerp(0, -0.15, reach);
        torso.pitch = lerp(0, -0.05, reach);
        head.pitch = lerp(0, -0.12, reach);
        armL.elbow = { x: lerp(0.5, 2.8, reach), y: lerp(-4.7, -4.2, reach), z: lerp(11.4, 13.8, reach) };
        armL.hand = { x: lerp(0.9, 4.7, reach), y: lerp(-4.5, -2.1, reach), z: lerp(9.0, 16.2, reach) };
        armR.elbow = { x: lerp(0.5, 3.3, reach), y: lerp(4.7, 3.8, reach), z: lerp(11.4, 12.6 + rodPull * 0.8, reach) };
        armR.hand = { x: lerp(0.9, 5.4, reach), y: lerp(4.5, 2.0, reach), z: lerp(9.0, 13.4 + rodPull * 1.4, reach) };
      } else if (p < 0.78) {
        const t = (p - 0.28) / 0.50;
        const drop = t * t * (2.6 - 1.6 * t); // slightly accelerated weighted swing down
        torso.x += lerp(-0.15, 1.15, drop);
        torso.zTop += lerp(0.25, -1.05, drop);
        torso.pitch = lerp(-0.05, 0.36, drop);
        head.x += lerp(-0.1, 1.45, drop);
        head.z += lerp(0.2, -0.85, drop);
        head.pitch = lerp(-0.12, 0.28, drop);
        armL.elbow = { x: lerp(2.8, 3.4, drop), y: lerp(-4.2, -3.8, drop), z: lerp(13.8, 10.2, drop) };
        armL.hand = { x: lerp(4.7, 5.8, drop), y: lerp(-2.1, -2.0, drop), z: lerp(16.2, 9.2, drop) };
        armR.elbow = { x: lerp(3.3, 3.4, drop), y: lerp(3.8, 3.8, drop), z: lerp(13.2, 10.2, drop) };
        armR.hand = { x: lerp(5.4, 5.8, drop), y: lerp(2.0, 2.0, drop), z: lerp(14.8, 9.2, drop) };
      } else {
        const t = (p - 0.78) / 0.22;
        const press = Math.sin(clamp(t * 2.2, 0, 1) * Math.PI);
        const relax = clamp((t - 0.30) / 0.70, 0, 1);
        const relaxEase = relax * relax * (3 - 2 * relax);
        torso.x += lerp(1.15 + press * 0.35, 0, relaxEase);
        torso.zTop += lerp(-1.05 - press * 0.35, 0, relaxEase);
        torso.pitch = lerp(0.36 + press * 0.08, 0, relaxEase);
        head.x += lerp(1.45, 0, relaxEase);
        head.z += lerp(-0.85 - press * 0.2, 0, relaxEase);
        head.pitch = lerp(0.28, 0, relaxEase);
        armL.elbow = { x: lerp(3.4, 0.6, relaxEase), y: lerp(-3.8, -4.7, relaxEase), z: lerp(10.2 - press * 0.4, 11.4, relaxEase) };
        armL.hand = { x: lerp(5.8, 1.0, relaxEase), y: lerp(-2.0, -4.5, relaxEase), z: lerp(9.2 - press * 0.65, 9.0, relaxEase) };
        armR.elbow = { x: lerp(3.4, 0.6, relaxEase), y: lerp(3.8, 4.7, relaxEase), z: lerp(10.2 - press * 0.4, 11.4, relaxEase) };
        armR.hand = { x: lerp(5.8, 1.0, relaxEase), y: lerp(2.0, 4.5, relaxEase), z: lerp(9.2 - press * 0.65, 9.0, relaxEase) };
      }
      break;
    }

    case 'mechanic_work': {
      // Leaning forward over engine bay / hitch / valve, ratcheting with wrench motion
      const ratchet = Math.sin(nowSec * 12.0);
      torso.x += 1.1;
      torso.zTop -= 1.2;
      torso.pitch = 0.38;
      head.x += 1.5;
      head.z -= 1.0;
      head.pitch = 0.28;
      armL.elbow = { x: 3.4, y: -4.2, z: 10.8 };
      armL.hand = { x: 5.6, y: -2.2, z: 10.2 };
      armR.elbow = { x: 3.6, y: 4.2 + ratchet * 0.5, z: 10.8 };
      armR.hand = { x: 5.8 + ratchet * 0.9, y: 1.4 - ratchet * 0.8, z: 10.4 };
      props.actionEffect = {
        kind: 'wrench_tool',
        type: 'wrench_tool',
        x: 5.8 + ratchet * 0.9,
        y: 1.4 - ratchet * 0.8,
        z: 10.4,
        angle: ratchet * 0.45,
        progress: actionProgress,
      };
      break;
    }

    case 'pouring_canister': {
      // Two-handed heavy lift tipping 20L canister forward to pour fuel/water
      const tilt = Math.sin(nowSec * 6.0) * 0.25;
      torso.x -= 0.4; // Lean back slightly to counterbalance heavy 20L jerrycan
      torso.pitch = 0.18;
      armL.elbow = { x: 2.6, y: -4.6, z: 11.2 };
      armR.elbow = { x: 2.6, y: 4.6, z: 11.2 };
      armL.hand = { x: 5.2, y: -1.8, z: 10.6 + tilt };
      armR.hand = { x: 5.6, y: 1.8, z: 11.4 - tilt };
      props.actionEffect = {
        kind: 'pour_stream',
        type: 'pour_stream',
        x: 6.8,
        y: 0,
        z: 10.2,
        angle: 0,
        progress: actionProgress,
      };
      break;
    }

    case 'pouring_sandbag': {
      // Two-handed heave & shake tipping burlap sandbag forward
      const heave = Math.sin(actionProgress * Math.PI * 3.0);
      torso.x += 0.9;
      torso.pitch = 0.28;
      armL.elbow = { x: 2.8, y: -4.5, z: 10.8 };
      armR.elbow = { x: 2.8, y: 4.5, z: 10.8 };
      armL.hand = { x: 5.8 + heave * 0.8, y: -2.0, z: 9.8 };
      armR.hand = { x: 5.8 + heave * 0.8, y: 2.0, z: 9.8 };
      props.actionEffect = {
        kind: 'sand_arc',
        type: 'sand_arc',
        x: 6.6,
        y: 0,
        z: 9.5,
        angle: 0,
        progress: actionProgress,
      };
      break;
    }

    case 'extinguisher_spray': {
      // Braced two-handed fire suppression stance with nozzle recoil jitter
      const jitter = Math.sin(nowSec * 28.0) * 0.25;
      torso.x -= 0.3;
      armL.elbow = { x: 2.4, y: -4.0, z: 11.5 };
      armL.hand = { x: 4.6 + jitter, y: -1.2, z: 11.2 };
      armR.elbow = { x: 2.6, y: 3.8, z: 11.0 };
      armR.hand = { x: 5.2 + jitter, y: 0.8, z: 10.2 };
      props.extinguisher = {
        x: 5.0 + jitter,
        y: 0,
        zBottom: 7.2,
        zTop: 12.2,
        angle: 0,
        isSpraying: true,
      };
      break;
    }

    case 'lighter_flick': {
      // Right hand extended forward flicking Zippo lighter wheel
      const flick = Math.sin(actionProgress * Math.PI * 4.0) * 0.3;
      const targetArm = activeHand === 'left' ? armL : armR;
      const sideSign = activeHand === 'left' ? -1 : 1;
      targetArm.elbow = { x: 3.2, y: sideSign * 3.8, z: 12.2 };
      targetArm.hand = { x: 5.8, y: sideSign * 1.2, z: 12.8 + flick };
      props.actionEffect = {
        kind: 'lighter_flame',
        type: 'lighter_flame',
        x: 6.4,
        y: sideSign * 1.2,
        z: 13.4,
        angle: 0,
        progress: actionProgress,
      };
      break;
    }

    case 'knife_slash': {
      // Sweeping slash arc across front of body with torso twist
      const slash = Math.cos(actionProgress * Math.PI); // +1 -> -1
      const sideSign = activeHand === 'left' ? -1 : 1;
      torso.yaw = -slash * 0.48 * sideSign;
      const slashAngle = -slash * 1.15 * sideSign;
      const targetArm = activeHand === 'left' ? armL : armR;
      targetArm.elbow = {
        x: 2.8 + Math.cos(slashAngle) * 1.6,
        y: sideSign * 3.2 + Math.sin(slashAngle) * 2.2,
        z: 12.4,
      };
      targetArm.hand = {
        x: 3.2 + Math.cos(slashAngle) * 4.2,
        y: Math.sin(slashAngle) * 4.6,
        z: 12.2,
      };
      targetArm.wristAngle = slashAngle;
      props.actionEffect = {
        kind: 'knife_arc',
        type: 'knife_arc',
        x: targetArm.hand.x,
        y: targetArm.hand.y,
        z: 12.2,
        angle: slashAngle,
        progress: actionProgress,
      };
      break;
    }

    case 'using_phone':
    case 'phone_use': {
      // Cradling glowing smartphone in front of chest, head tilted down, thumb tapping
      const tap = Math.sin(nowSec * 7.5 + phaseOffset);
      head.pitch = 0.32;
      head.x = 1.9;
      armL.elbow = { x: 2.2, y: -4.2, z: 11.4 };
      armL.hand = { x: 4.8, y: -1.4, z: 11.6 };
      armR.elbow = { x: 2.4, y: 4.2, z: 11.4 };
      armR.hand = { x: 5.0 + tap * 0.25, y: 1.2 - tap * 0.25, z: 11.8 };
      props.phone = {
        x: 5.8,
        y: 0,
        z: 11.7,
        angle: 0,
        tapPhase: tap,
      };
      break;
    }

    case 'sweeping': {
      // Janitor rhythmic two-handed sweeping arc left-to-right across sidewalk
      const sweepFreq = isMoving ? walkCycle * 0.85 : nowSec * 3.2 + phaseOffset;
      const sweepNorm = Math.sin(sweepFreq); // -1 (left) .. +1 (right)
      const sweepAngle = sweepNorm * 0.42;

      torso.yaw = sweepNorm * 0.28;
      torso.pitch = 0.22;
      head.yaw = sweepNorm * 0.18;
      head.pitch = 0.20;

      // Left hand grips upper broom shaft, right hand grips lower broom shaft
      const gLX = 4.2 + Math.cos(sweepAngle) * 0.8;
      const gLY = -1.2 + sweepNorm * 1.4;
      const gRX = 5.6 + Math.cos(sweepAngle) * 1.2;
      const gRY = 0.8 + sweepNorm * 2.2;

      armL.elbow = { x: 2.2, y: -4.2 + sweepNorm * 0.6, z: 11.8 };
      armL.hand = { x: gLX, y: gLY, z: 11.0 };
      armR.elbow = { x: 2.6, y: 4.0 + sweepNorm * 0.8, z: 10.6 };
      armR.hand = { x: gRX, y: gRY, z: 9.2 };

      const headX = 15.8 * Math.cos(sweepAngle * 0.85);
      const headY = 15.8 * Math.sin(sweepAngle * 0.85);

      props.broom = {
        gripL: { x: gLX, y: gLY, z: 11.0 },
        gripR: { x: gRX, y: gRY, z: 9.2 },
        shaftEnd: { x: headX, y: headY, z: 0.6 },
        headAngle: sweepAngle * 0.95,
        sweepNorm,
      };
      break;
    }

    case 'firefighter_hose': {
      // Wide-stanced braced posture holding high-pressure brass hose nozzle
      const recoil = Math.sin(nowSec * 22.0) * 0.22;
      torso.x = -0.4 + recoil;
      torso.pitch = 0.24;
      legL.foot.y = -2.8;
      legR.foot.y = 2.8;
      armL.elbow = { x: 2.4, y: -4.2, z: 11.4 };
      armL.hand = { x: 4.8 + recoil, y: -2.0, z: 10.6 };
      armR.elbow = { x: 2.4, y: 4.2, z: 11.2 };
      armR.hand = { x: 5.2 + recoil, y: 1.8, z: 10.4 };
      props.fireNozzle = {
        x: 5.4 + recoil,
        y: 0,
        z: 10.5,
        angle: 0,
        isSpraying: (entity as any).firefighterState === 'extinguishing',
      };
      break;
    }

    case 'water_hose_use': {
      // Player holding water/vacuum/jetter hose coupling with both hands
      const vib = Math.sin(nowSec * 18.0) * 0.16;
      torso.pitch = 0.16;
      armL.elbow = { x: 2.2, y: -4.4, z: 11.2 };
      armL.hand = { x: 4.4 + vib, y: -1.8, z: 10.4 };
      armR.elbow = { x: 2.4, y: 4.4, z: 11.0 };
      armR.hand = { x: 4.8 + vib, y: 1.8, z: 10.2 };
      break;
    }

    case 'fuel_nozzle_use': {
      // Player holding gas station dispenser nozzle extended in right hand
      armR.elbow = { x: 2.8, y: 4.4, z: 11.4 };
      armR.hand = { x: 5.4, y: 2.4, z: 10.8 };
      break;
    }

    case 'tow_rope_haul': {
      // Hauling heavy braided steel tow cable with both hands
      torso.pitch = 0.22;
      armL.elbow = { x: 1.8, y: -4.6, z: 10.8 };
      armL.hand = { x: 3.8, y: -2.2, z: 9.6 };
      armR.elbow = { x: 1.8, y: 4.6, z: 10.8 };
      armR.hand = { x: 3.8, y: 2.2, z: 9.6 };
      break;
    }

    case 'carrying_box':
    case 'carrying_furniture': {
      // Carrying heavy box / furniture in front of chest with both hands, torso leaned back slightly
      torso.x -= 0.45;
      torso.pitch = -0.14;
      armL.elbow = { x: 2.2, y: -5.0, z: 11.0 };
      armL.hand = { x: 5.2, y: -3.4, z: 10.4 };
      armR.elbow = { x: 2.2, y: 5.0, z: 11.0 };
      armR.hand = { x: 5.2, y: 3.4, z: 10.4 };
      if (actionType === 'carrying_box') {
        props.box = {
          x: 6.8,
          y: 0,
          zBottom: 8.6,
          zTop: 13.4,
          w: 5.2,
          l: 7.2,
          angle: 0,
        };
      }
      break;
    }

    case 'carrying_bag': {
      // Right arm carrying shopping tote bag with pendulum swing
      const bagSwing = isMoving ? Math.cos(walkCycle) * 1.1 : Math.sin(nowSec * 1.8 + phaseOffset) * 0.3;
      armR.elbow = { x: bagSwing * 0.4, y: 5.2, z: 10.8 };
      armR.hand = { x: bagSwing * 0.8 + 0.6, y: 6.2, z: 8.4 };
      props.bag = {
        x: armR.hand.x + 0.4,
        y: 7.0,
        zBottom: 3.2,
        zTop: 8.2,
        swingX: bagSwing,
        swingY: Math.abs(bagSwing) * 0.25,
        swingPitch: bagSwing,
      };
      break;
    }

    case 'waving': {
      // Greeting friend or hailing a taxi: right arm raised high overhead waving side-to-side!
      const wave = Math.sin(nowSec * 7.2 + phaseOffset);
      torso.yaw = -0.14;
      head.yaw = wave * 0.10;
      head.pitch = Math.sin(nowSec * 3.6) * 0.08;
      armR.shoulder = { x: 0.6, y: 4.8, z: 14.4 };
      armR.elbow = { x: 2.4, y: 6.0, z: 16.4 };
      armR.hand = {
        x: 3.6 + wave * 1.5,
        y: 5.4 + wave * 1.8,
        z: 19.2 + Math.abs(wave) * 0.6,
      };
      armR.wristAngle = wave * 0.45;
      break;
    }

    case 'window_shopping': {
      // Hands clasped behind lower back, leaning forward slightly to peer into shop window, head scanning left/right
      const scan = Math.sin(nowSec * 1.1 + phaseOffset);
      torso.x = 0.55;
      torso.pitch = 0.16;
      head.x = 2.1;
      head.yaw = scan * 0.38;
      armL.elbow = { x: -2.4, y: -4.2, z: 10.8 };
      armL.hand = { x: -3.4, y: -1.0, z: 8.8 };
      armR.elbow = { x: -2.4, y: 4.2, z: 10.8 };
      armR.hand = { x: -3.4, y: 1.0, z: 8.8 };
      break;
    }

    case 'waiting_impatient': {
      // Waiting at traffic light: looking left and right for traffic, left hand on hip, right foot tapping
      const lookTraffic = Math.sin(nowSec * 1.8 + phaseOffset);
      const tapFoot = Math.max(0, Math.sin(nowSec * 6.5 + phaseOffset));
      head.yaw = lookTraffic * 0.48;
      armL.elbow = { x: -0.6, y: -5.8, z: 11.2 };
      armL.hand = { x: 0.4, y: -3.8, z: 9.0 }; // Hand resting on hip
      legR.foot.x = 0.8;
      legR.foot.z = tapFoot * 0.9;
      legR.footAngle = 0.12 + tapFoot * 0.15;
      break;
    }

    case 'panicking': {
      // Frantic fleeing: both arms raised high flailing wildly, looking back over shoulder in terror!
      const flail = Math.sin(walkCycle * 1.4);
      head.yaw = Math.sin(nowSec * 4.5) > 0 ? 0.65 : -0.55; // Glancing back in panic
      armL.elbow = { x: 1.2 + flail * 1.4, y: -5.8, z: 15.8 };
      armL.hand = { x: 2.4 - flail * 2.2, y: -5.2 + flail * 1.0, z: 18.8 + flail * 1.2 };
      armR.elbow = { x: 1.2 - flail * 1.4, y: 5.8, z: 15.8 };
      armR.hand = { x: 2.4 + flail * 2.2, y: 5.2 - flail * 1.0, z: 18.8 - flail * 1.2 };
      break;
    }

    case 'calling_112': {
      // Holding smartphone pressed to right ear, left hand gesturing anxiously, glancing at incident
      const gest = Math.sin(nowSec * 5.5 + phaseOffset);
      head.pitch = 0.08;
      armR.elbow = { x: 2.0, y: 5.2, z: 14.5 };
      armR.hand = { x: 2.4, y: 3.1, z: 16.8 };
      armL.elbow = { x: 1.8, y: -4.8, z: 11.4 };
      armL.hand = { x: 3.8 + gest * 0.6, y: -2.8 + gest * 0.7, z: 11.6 };
      props.phone = {
        x: 2.6,
        y: 3.3,
        z: 16.8,
        angle: 0.4,
        tapPhase: 0,
      };
      break;
    }

    case 'watching_incident': {
      // Stopped at safe perimeter watching crash/fire/siren: hands on hips or arms folded
      const shift = Math.sin(nowSec * 1.4 + phaseOffset);
      torso.yaw = shift * 0.06;
      armL.elbow = { x: -0.4, y: -5.6, z: 11.2 };
      armL.hand = { x: 1.2, y: -3.2, z: 9.8 };
      armR.elbow = { x: -0.4, y: 5.6, z: 11.2 };
      armR.hand = { x: 1.2, y: 3.2, z: 9.8 };
      break;
    }

    case 'startled': {
      // Sudden defensive flinch: torso pulled back, hands up shielding chest/face
      torso.x = -0.8;
      torso.pitch = -0.15;
      armL.elbow = { x: 1.8, y: -5.4, z: 13.0 };
      armL.hand = { x: 4.4, y: -2.8, z: 15.2 };
      armR.elbow = { x: 1.8, y: 5.4, z: 13.0 };
      armR.hand = { x: 4.4, y: 2.8, z: 15.2 };
      break;
    }

    case 'resting': {
      // Out of breath / exhausted after sprint: hunched forward, hands braced on knees/thighs, heavy panting
      const pant = Math.sin(nowSec * 6.0 + phaseOffset);
      torso.x = 1.4;
      torso.pitch = 0.42;
      torso.zTop = 13.2;
      head.x = 2.8;
      head.z = 15.0 + pant * 0.25;
      head.pitch = 0.34;
      armL.elbow = { x: 2.0, y: -4.4, z: 10.6 };
      armL.hand = { x: 3.2, y: -2.4, z: 7.4 };
      armR.elbow = { x: 2.0, y: 4.4, z: 10.6 };
      armR.hand = { x: 3.2, y: 2.4, z: 7.4 };
      break;
    }

    case 'shielding_rain': {
      // Caught in rain without umbrella: hunched forward, right forearm raised over brow to shield eyes
      torso.pitch = 0.26;
      torso.x += 0.55;
      head.pitch = 0.24;
      armR.elbow = { x: 2.4, y: 4.8, z: 15.8 };
      armR.hand = { x: 3.4, y: 1.0, z: 18.6 };
      break;
    }

    case 'sheltering': {
      // Standing under overhang/canopy checking sky and hugging torso for warmth
      head.pitch = -0.15;
      head.yaw = Math.sin(nowSec * 0.9 + phaseOffset) * 0.35;
      armL.elbow = { x: 1.0, y: -4.6, z: 11.4 };
      armL.hand = { x: 2.8, y: 1.2, z: 11.4 };
      armR.elbow = { x: 1.2, y: 4.6, z: 11.2 };
      armR.hand = { x: 2.6, y: -1.4, z: 11.0 };
      break;
    }

    default:
      break;
  }

  // =========================================================================
  // 2b. BIOLOGICAL & PSYCHOLOGICAL MODULATORS (Cold Shiver, Pockets, Head Gaze)
  // =========================================================================
  if (!isPlayer && !isLyingDown && !isSwimming && actionType !== 'cycling' && actionType !== 'scooter') {
    const pedRef = entity as Pedestrian;
    // Cold stress posture: shoulders hunched in, subtle shiver tremor, hands tucked near coat pockets when walking/idle
    if (pedBio && pedBio.coldLevel > 0.32 && actionType !== 'panicking' && actionType !== 'waving' && actionType !== 'calling_112' && actionType !== 'sweeping') {
      const coldAmt = clamp((pedBio.coldLevel - 0.32) / 0.68, 0, 1);
      const shiver = coldAmt > 0.25 ? Math.sin(nowSec * 31.0 + phaseOffset) * 0.24 * coldAmt : 0;
      torso.pitch += 0.14 * coldAmt;
      torso.y += shiver;
      head.x -= 0.25 * coldAmt;
      head.y += shiver * 0.8;
      if ((actionType === 'walk' || actionType === 'idle' || actionType === 'waiting_impatient') && !pedRef.hasUmbrella && !pedRef.handheldProp) {
        // Tuck hands close to coat pockets
        armL.elbow = { x: lerp(armL.elbow.x, -0.4, coldAmt * 0.85), y: lerp(armL.elbow.y, -4.7, coldAmt * 0.85), z: 10.8 };
        armL.hand = { x: lerp(armL.hand.x, 1.0, coldAmt * 0.85), y: lerp(armL.hand.y, -3.5, coldAmt * 0.85), z: 8.6 };
        armR.elbow = { x: lerp(armR.elbow.x, -0.4, coldAmt * 0.85), y: lerp(armR.elbow.y, 4.7, coldAmt * 0.85), z: 10.8 };
        armR.hand = { x: lerp(armR.hand.x, 1.0, coldAmt * 0.85), y: lerp(armR.hand.y, 3.5, coldAmt * 0.85), z: 8.6 };
      }
    }

    // Psychological attention / stimulus head-tracking (overrides generic idle head turn)
    if (pedPsy && Math.abs(pedPsy.headYawCurrent) > 0.01 && actionType !== 'panicking') {
      head.yaw = clamp(head.yaw * 0.25 + pedPsy.headYawCurrent, -1.05, 1.05);
    }
  }

  // =========================================================================
  // 3. SECONDARY COMBINABLE PROPS (Coffee Cup, Umbrella, Dog Companion, Held Items)
  // =========================================================================
  const ped = entity as Pedestrian;

  // Coffee cup in right hand (periodic sipping animation!)
  if (!isPlayer && ped.handheldProp === 'coffee' && !ped.hasDroppedProp && actionType !== 'panicking') {
    // Every ~7 seconds, NPC raises coffee cup to mouth for a 1.8s sip!
    const sipCycle = (nowSec + seed * 12.0) % 7.5;
    const isSipping = sipCycle < 1.8;
    const sipAmount = isSipping ? Math.sin((sipCycle / 1.8) * Math.PI) : 0;

    if (sipAmount > 0.02) {
      head.pitch = -0.22 * sipAmount;
      armR.elbow = {
        x: lerp(armR.elbow.x, 3.4, sipAmount),
        y: lerp(armR.elbow.y, 4.4, sipAmount),
        z: lerp(armR.elbow.z, 14.2, sipAmount),
      };
      armR.hand = {
        x: lerp(armR.hand.x, 4.6, sipAmount),
        y: lerp(armR.hand.y, 0.8, sipAmount),
        z: lerp(armR.hand.z, 16.2, sipAmount),
      };
    } else {
      // Carrying coffee cup forward in right hand with stabilized wrist
      armR.elbow = { x: 2.0, y: 4.5, z: 11.4 };
      armR.hand = { x: 4.4, y: 3.6, z: 10.6 };
    }

    props.coffee = {
      x: armR.hand.x + 0.9,
      y: armR.hand.y + 0.4,
      z: armR.hand.z + 0.6,
      isSipping,
      sipAmount,
      steamPhase: nowSec * 3.0 + phaseOffset,
    };
  }

  // Rain Umbrella (held at z = 21.0 overhead!)
  if (ped.hasUmbrella && actionType !== 'panicking') {
    const umbBob = isMoving ? Math.sin(walkCycle * 2) * 0.35 : Math.sin(nowSec * 2.0 + phaseOffset) * 0.15;
    // Left hand holds umbrella handle in front of chest unless left hand is busy
    armL.elbow = { x: 2.0, y: -3.8, z: 11.8 };
    armL.hand = { x: 3.6, y: -1.6, z: 12.6 };
    props.umbrella = {
      x: 0.6,
      y: -0.8,
      z: 21.5 + umbBob,
      radius: 9.0,
      tiltX: isMoving ? 0.12 : 0.04,
      tiltY: Math.sin(nowSec * 1.5 + phaseOffset) * 0.06,
    };
  }

  // Dog Companion (animated 4-paw trot, wagging tail, head bob, 3D leash!)
  if (!isPlayer && ped.hasDog) {
    const dogWalkPhase = isMoving ? walkCycle * 1.65 : nowSec * 1.5;
    const tailWag = Math.sin(nowSec * 11.0 + phaseOffset) * 0.55;
    const headBob = isMoving ? Math.cos(dogWalkPhase) * 0.45 : Math.sin(nowSec * 2.4) * 0.2;

    // Dog positioned forward-right in pedestrian's local space
    const dogLocalX = 11.2 + (isMoving ? Math.sin(walkCycle * 0.5) * 0.6 : 0);
    const dogLocalY = 8.4;

    // Right hand holds the leash
    if (actionType === 'walk' || actionType === 'idle' || actionType === 'waiting_impatient') {
      armR.elbow = { x: 1.8, y: 4.8, z: 11.0 };
      armR.hand = { x: 3.6, y: 4.8, z: 9.2 };
    }

    props.dog = {
      x: dogLocalX,
      y: dogLocalY,
      z: 4.5,
      angle: Math.sin(walkCycle * 0.4) * 0.08,
      walkPhase: dogWalkPhase,
      legPhase: dogWalkPhase,
      tailWag,
      tailAngle: tailWag,
      headBob,
      leashStart: { x: armR.hand.x, y: armR.hand.y, z: armR.hand.z },
      leashMid: {
        x: (armR.hand.x + dogLocalX + 1.5) * 0.5,
        y: (armR.hand.y + dogLocalY) * 0.5,
        z: 4.8,
      },
      leashEnd: { x: dogLocalX + 2.2, y: dogLocalY, z: 3.8 },
    };
  }

  // Player Held Items in Left & Right Hands
  if (isPlayer) {
    const lItem: InventoryItem | null = entity.leftHandItem || null;
    const rItem: InventoryItem | null = entity.rightHandItem || null;

    if (lItem) {
      if (actionType === 'walk' || actionType === 'sprint' || actionType === 'idle') {
        if (isBulkyHandItem(lItem)) {
          armL.elbow = { x: 1.8, y: -5.2, z: 10.6 };
          armL.hand = { x: 3.6, y: -4.2, z: 9.2 };
        }
      }
      props.handItemL = {
        x: armL.hand.x + 0.9,
        y: armL.hand.y,
        z: armL.hand.z,
        angle: armL.wristAngle,
        scale: 5.2,
      };
    }

    if (rItem) {
      if (actionType === 'walk' || actionType === 'sprint' || actionType === 'idle') {
        if (isBulkyHandItem(rItem)) {
          armR.elbow = { x: 1.8, y: 5.2, z: 10.6 };
          armR.hand = { x: 3.6, y: 4.2, z: 9.2 };
        }
      }
      props.handItemR = {
        x: armR.hand.x + 0.9,
        y: armR.hand.y,
        z: armR.hand.z,
        angle: armR.wristAngle,
        scale: 5.2,
      };
    }

    // Realistic Firearm & Pneumatic Weapon Stance (1H/2H, Low-Ready -> ADS Shouldered, Recoil & Reload)
    const primaryH: 'left' | 'right' = entity.activeHand === 'left' ? 'left' : 'right';
    const primaryWpn = primaryH === 'left' ? lItem : rItem;
    const secondaryWpn = primaryH === 'left' ? rItem : lItem;
    const heldWpn =
      primaryWpn && isWeaponItemId(primaryWpn.itemId)
        ? { item: primaryWpn, hand: primaryH }
        : !primaryWpn && secondaryWpn && isWeaponItemId(secondaryWpn.itemId)
        ? { item: secondaryWpn, hand: (primaryH === 'left' ? 'right' : 'left') as 'left' | 'right' }
        : null;

    if (heldWpn && !isLyingDown && !isSwimming && !isSitting) {
      const wSpec = WEAPON_SPECS[heldWpn.item.itemId];
      if (wSpec) {
        const rt = entity.weaponRuntime;
        const aim = rt?.aimProgress ?? 0;
        const kick = (rt?.recoilKickPx ?? 0) * 0.28;
        const reload = rt?.reloadState;
        const isLeft = heldWpn.hand === 'left';
        const domArm = isLeft ? armL : armR;
        const supArm = isLeft ? armR : armL;
        const otherHasItem = Boolean(isLeft ? rItem : lItem);
        const sgn = isLeft ? -1 : 1;

        if (wSpec.twoHanded) {
          // Slight bladed shooting stance on torso
          torso.yaw = sgn * (-0.18 - aim * 0.14);
          // Dominant trigger hand at grip (tucked tighter into shoulder pocket at ADS)
          domArm.elbow = { x: -0.6 - kick * 0.4, y: sgn * (4.6 - aim * 0.8), z: 11.2 + aim * 1.4 };
          domArm.hand = { x: 2.3 + aim * 0.9 - kick, y: sgn * (2.4 - aim * 0.7), z: 11.4 + aim * 1.8 };

          if (!otherHasItem) {
            if (reload) {
              // Support hand actively manipulates magazine / bolt / break-barrel / pump
              const rWave = Math.sin(reload.progress * Math.PI);
              supArm.elbow = { x: 2.2, y: -sgn * (3.8 - rWave * 2.2), z: 10.6 };
              supArm.hand = { x: 4.0 + rWave * 1.8, y: sgn * (1.2 - (1 - rWave) * 1.8), z: 10.8 };
            } else {
              // Support hand gripping forend / handguard forward along barrel
              supArm.elbow = { x: 3.1 - kick * 0.3, y: -sgn * (3.6 - aim * 1.1), z: 11.0 + aim * 1.5 };
              supArm.hand = { x: 7.4 + aim * 1.2 - kick, y: sgn * (1.1 - aim * 0.3), z: 11.6 + aim * 1.7 };
            }
          }
        } else {
          // Handgun / CO2 pistol / Revolver stance: low-ready -> extended two-handed Weaver/Isosceles ADS
          torso.yaw = sgn * (-0.08 - aim * 0.08);
          domArm.elbow = { x: 2.0 + aim * 1.4 - kick * 0.5, y: sgn * (4.2 - aim * 1.4), z: 11.0 + aim * 2.0 };
          domArm.hand = { x: 5.2 + aim * 2.4 - kick, y: sgn * (2.8 - aim * 2.1), z: 11.4 + aim * 2.2 };

          if (!otherHasItem && (aim > 0.15 || reload)) {
            if (reload) {
              const rWave = Math.sin(reload.progress * Math.PI);
              supArm.elbow = { x: 1.6, y: -sgn * (3.8 - rWave * 2.4), z: 10.8 };
              supArm.hand = { x: 4.4, y: sgn * (1.8 * rWave - 1.2 * (1 - rWave)), z: 11.0 };
            } else {
              // Cupping/supporting grip with off-hand when aiming pistol
              supArm.elbow = { x: 1.8 + aim * 1.8 - kick * 0.4, y: -sgn * (4.2 - aim * 1.5), z: 11.0 + aim * 1.9 };
              supArm.hand = { x: 4.8 + aim * 2.3 - kick, y: sgn * (0.6 * aim - 2.2 * (1 - aim)), z: 11.2 + aim * 2.1 };
            }
          }
        }
      }
    }
  } else if (!isPlayer && (entity as Pedestrian).state === 'cowering') {
    // Hunched defensive posture with hands protecting head when pinned under gunfire
    torso.pitch += 0.38;
    torso.zTop -= 1.8;
    head.z -= 2.1;
    head.x += 1.0;
    armL.elbow = { x: 2.2, y: -4.2, z: 13.0 };
    armL.hand = { x: 1.8, y: -2.2, z: 15.2 };
    armR.elbow = { x: 2.2, y: 4.2, z: 13.0 };
    armR.hand = { x: 1.8, y: 2.2, z: 15.2 };
  }

  // Landing knee absorption crouch compression
  if (landingImpact > 0.04 && !isLyingDown && !isSwimming && !isSitting) {
    const dip = landingImpact * 1.55;
    pelvis.z = Math.max(4.5, pelvis.z - dip);
    torso.zBottom = Math.max(4.3, torso.zBottom - dip);
    torso.zTop = Math.max(10.0, torso.zTop - dip);
    torso.x += dip * 0.4;
    torso.pitch += landingImpact * 0.24;
    head.z = Math.max(12.0, head.z - dip);
    head.x += dip * 0.35;
    legL.hip.z -= dip;
    legR.hip.z -= dip;
    legL.knee.x += landingImpact * 1.5;
    legR.knee.x += landingImpact * 1.5;
    legL.knee.z -= dip * 0.45;
    legR.knee.z -= dip * 0.45;
  }

  // Vertical jump elevation in 3D character space (elevates shadow projection & aerial body Z)
  if (jumpZUnits > 0.01) {
    pelvis.z += jumpZUnits;
    torso.zBottom += jumpZUnits;
    torso.zTop += jumpZUnits;
    head.z += jumpZUnits;
    legL.hip.z += jumpZUnits;
    legL.knee.z += jumpZUnits;
    legL.foot.z += jumpZUnits;
    legR.hip.z += jumpZUnits;
    legR.knee.z += jumpZUnits;
    legR.foot.z += jumpZUnits;
    armL.shoulder.z += jumpZUnits;
    armL.elbow.z += jumpZUnits;
    armL.hand.z += jumpZUnits;
    armR.shoulder.z += jumpZUnits;
    armR.elbow.z += jumpZUnits;
    armR.hand.z += jumpZUnits;
    if (props.handItemL) props.handItemL.z += jumpZUnits;
    if (props.handItemR) props.handItemR.z += jumpZUnits;
  }

  return {
    actionType,
    actionProgress,
    isLyingDown,
    isSitting,
    isSwimming,
    isDashing,
    dashRollPhase,
    isJumping,
    jumpZ: jumpZUnits,
    landingImpact,
    pelvis,
    torso,
    head,
    legL,
    legR,
    armL,
    armR,
    props,
  };
}
