// --- CRANE OUTRIGGERS: four legs, each with a beam and a vertical jack ---
// The chassis is treated as a rigid plane resting on its four wheels and on every pad that has reached the ground.
// Heights come from the real terrain relief, so the roll and pitch it produces are the ones the bubble level shows.

import type { Vehicle } from './types';
import { getTerrainSlope } from './terrainElevation';

export type LegIndex = 0 | 1 | 2 | 3; // 0 front-left, 1 front-right, 2 rear-left, 3 rear-right
export type OutriggerMode = 'beam' | 'jack';

export const LEG_COUNT = 4;
export const LEG_NAMES = ['Передняя левая', 'Передняя правая', 'Задняя левая', 'Задняя правая'] as const;

/* Same scale the speedometer uses for grade: one terrain height unit is 2.5 px of ground. */
const TERRAIN_K = 2.5;
export const BEAM_REACH_PX = 12.5;
const JACK_STROKE_PX = 12; // vertical pad travel
const PAD_CLEARANCE_PX = 3; // how high the retracted pad hangs above flat ground
const CONTACT_EPS_PX = 0.3;

const BEAM_RATE = 0.5; // 2 s full stroke
const JACK_RATE = 0.3; // about 3.3 s full stroke
const BEAM_OUT = 0.7; // pad is far enough out to bear weight
const BEAM_FULL = 0.95;
export const LEVEL_LIMIT_DEG = 3; // permitted chassis slope when working
const ATTITUDE_RATE = 3; // 1/s, how fast the body settles

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

type LegState = Pick<
  Vehicle,
  | 'craneOutriggerBeam'
  | 'craneOutriggerJack'
  | 'craneOutriggerCmd'
  | 'craneOutriggerMode'
  | 'craneOutriggerContact'
  | 'craneChassisRoll'
  | 'craneChassisPitch'
  | 'craneOutriggerExt'
  | 'craneOutriggersDeployed'
>;

/* Leg state with sensible defaults, so a vehicle saved before this model existed still works. */
export function ensureLegs(v: LegState): { beam: number[]; jack: number[]; cmd: number[]; contact: boolean[] } {
  if (!v.craneOutriggerBeam || v.craneOutriggerBeam.length !== LEG_COUNT) {
    const seed = clamp01(v.craneOutriggerExt ?? (v.craneOutriggersDeployed ? 1 : 0));
    v.craneOutriggerBeam = [seed, seed, seed, seed];
  }
  if (!v.craneOutriggerJack || v.craneOutriggerJack.length !== LEG_COUNT) v.craneOutriggerJack = [0, 0, 0, 0];
  if (!v.craneOutriggerCmd || v.craneOutriggerCmd.length !== LEG_COUNT) v.craneOutriggerCmd = [0, 0, 0, 0];
  if (!v.craneOutriggerContact || v.craneOutriggerContact.length !== LEG_COUNT) {
    v.craneOutriggerContact = [false, false, false, false];
  }
  return { beam: v.craneOutriggerBeam, jack: v.craneOutriggerJack, cmd: v.craneOutriggerCmd, contact: v.craneOutriggerContact };
}

/* Read-only view for drawing code. */
export function getLegs(v: LegState): { beam: number[]; jack: number[]; contact: boolean[] } {
  const b = v.craneOutriggerBeam;
  const j = v.craneOutriggerJack;
  const seed = clamp01(v.craneOutriggerExt ?? (v.craneOutriggersDeployed ? 1 : 0));
  return {
    beam: b && b.length === LEG_COUNT ? b : [seed, seed, seed, seed],
    jack: j && j.length === LEG_COUNT ? j : [0, 0, 0, 0],
    contact: v.craneOutriggerContact && v.craneOutriggerContact.length === LEG_COUNT ? v.craneOutriggerContact : [false, false, false, false],
  };
}

/* Leg anchor points in the vehicle frame: x forward, y to the right. */
function legAnchors(length: number, width: number): { x: number; y: number }[] {
  const halfL = length / 2;
  const halfW = width / 2;
  const xFront = length >= 73 ? length * 0.11 : -1.5;
  const xRear = -halfL + 5.2;
  return [
    { x: xFront, y: -halfW },
    { x: xFront, y: halfW },
    { x: xRear, y: -halfW },
    { x: xRear, y: halfW },
  ];
}

interface SupportPoint {
  x: number;
  y: number;
  h: number;
  wheel: boolean;
}

/* Centre of mass over the chassis, in the vehicle frame: the loaded turret sits behind the cab. */
function massCentre(length: number): { x: number; y: number } {
  return { x: -length * 0.17, y: 0 };
}

/* A rigid body rests on three of its supports. Out of every triple take the plane that has all other supports below it
   and the centre of mass inside the triangle: that is where the body really settles, and it moves smoothly as pads come down. */
function restPlane(pts: SupportPoint[], com: { x: number; y: number }): { a: number; b: number; c: number } {
  let best: { a: number; b: number; c: number } | null = null;
  let bestMiss = Infinity;
  const n = pts.length;
  for (let i = 0; i < n - 2; i++) {
    for (let j = i + 1; j < n - 1; j++) {
      for (let k = j + 1; k < n; k++) {
        const p1 = pts[i], p2 = pts[j], p3 = pts[k];
        const det = (p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y);
        if (Math.abs(det) < 1e-6) continue;
        const b = ((p2.h - p1.h) * (p3.y - p1.y) - (p3.h - p1.h) * (p2.y - p1.y)) / det;
        const c = ((p3.h - p1.h) * (p2.x - p1.x) - (p2.h - p1.h) * (p3.x - p1.x)) / det;
        const a = p1.h - b * p1.x - c * p1.y;
        let above = true;
        for (let m = 0; m < n; m++) {
          if (pts[m].h > a + b * pts[m].x + c * pts[m].y + 1e-6) { above = false; break; }
        }
        if (!above) continue;
        // barycentric weights of the centre of mass in the triangle
        const l1 = ((p2.y - p3.y) * (com.x - p3.x) + (p3.x - p2.x) * (com.y - p3.y)) / ((p2.y - p3.y) * (p1.x - p3.x) + (p3.x - p2.x) * (p1.y - p3.y));
        const l2 = ((p3.y - p1.y) * (com.x - p3.x) + (p1.x - p3.x) * (com.y - p3.y)) / ((p2.y - p3.y) * (p1.x - p3.x) + (p3.x - p2.x) * (p1.y - p3.y));
        const l3 = 1 - l1 - l2;
        const miss = Math.max(0, -l1, -l2, -l3);
        if (miss < bestMiss - 1e-9) {
          bestMiss = miss;
          best = { a, b, c };
          if (miss === 0) return best;
        }
      }
    }
  }
  return best ?? { a: 0, b: 0, c: 0 };
}

export interface ChassisAttitude {
  roll: number; // radians, positive when the right side is higher
  pitch: number; // radians, positive when the nose is higher
  contact: boolean[];
}

/* Where the body would settle right now, from the terrain under the wheels and under every extended pad. */
export function solveChassisAttitude(v: Pick<Vehicle, 'x' | 'y' | 'angle' | 'length' | 'width'> & LegState): ChassisAttitude {
  const { beam, jack } = ensureLegs(v);
  const length = v.length || 70;
  const width = v.width || 22;
  const cos = Math.cos(v.angle || 0);
  const sin = Math.sin(v.angle || 0);
  const centre = getTerrainSlope(v.x, v.y);
  const zc = centre.elevation * TERRAIN_K;
  const sx = centre.slopeX * TERRAIN_K;
  const sy = centre.slopeY * TERRAIN_K;
  const heightAtLocal = (lx: number, ly: number) => sx * (cos * lx - sin * ly) + sy * (sin * lx + cos * ly);

  const pts: SupportPoint[] = [];
  // wheels stand on the ground plane
  const wx = length * 0.3;
  const wy = width * 0.4;
  for (const [lx, ly] of [[wx, -wy], [wx, wy], [-wx, -wy], [-wx, wy]]) {
    pts.push({ x: lx, y: ly, h: heightAtLocal(lx, ly), wheel: true });
  }

  const anchors = legAnchors(length, width);
  const padPts: { x: number; y: number; m: number }[] = [];
  for (let i = 0; i < LEG_COUNT; i++) {
    if (beam[i] < BEAM_OUT) continue;
    const side = anchors[i].y < 0 ? -1 : 1;
    const lx = anchors[i].x;
    const ly = anchors[i].y + side * (1.2 + beam[i] * BEAM_REACH_PX);
    const wxp = v.x + cos * lx - sin * ly;
    const wyp = v.y + sin * lx + cos * ly;
    const g = getTerrainSlope(wxp, wyp).elevation * TERRAIN_K - zc;
    const m = g - PAD_CLEARANCE_PX + jack[i] * JACK_STROKE_PX;
    pts.push({ x: lx, y: ly, h: m, wheel: false });
    padPts.push({ x: lx, y: ly, m });
  }

  const plane = restPlane(pts, massCentre(length));
  const contact = [false, false, false, false];
  let k = 0;
  for (let i = 0; i < LEG_COUNT; i++) {
    if (beam[i] < BEAM_OUT) continue;
    const p = padPts[k++];
    contact[i] = plane.a + plane.b * p.x + plane.c * p.y - p.m <= CONTACT_EPS_PX;
  }
  return { roll: Math.atan(plane.c), pitch: Math.atan(plane.b), contact };
}

export function chassisTiltDeg(v: Pick<Vehicle, 'craneChassisRoll' | 'craneChassisPitch'>): number {
  return (Math.hypot(v.craneChassisRoll ?? 0, v.craneChassisPitch ?? 0) * 180) / Math.PI;
}

export function isCraneStabilized(v: LegState): boolean {
  const { beam, contact } = getLegs(v);
  for (let i = 0; i < LEG_COUNT; i++) if (beam[i] < BEAM_FULL || !contact[i]) return false;
  return chassisTiltDeg(v as Vehicle) <= LEVEL_LIMIT_DEG;
}

/* Why the boom is locked, for the cab display; empty when it is free. */
export function craneLockReason(v: LegState, hasPressure: boolean): string {
  if (!hasPressure) return 'Нет давления, включите КОМ';
  const { beam, contact } = getLegs(v);
  if (beam.some((b) => b < BEAM_FULL)) return 'Балки опор не выдвинуты';
  if (contact.some((c) => !c)) return 'Не все опоры стоят на грунте';
  if (chassisTiltDeg(v as Vehicle) > LEVEL_LIMIT_DEG) return `Кран не по уровню, наклон больше ${LEVEL_LIMIT_DEG}°`;
  return '';
}

/* One physics step: hydraulics move the legs the lever commands ask for, then the body settles. */
export function stepOutriggers(v: Vehicle, dt: number, hasPressure: boolean): void {
  const { beam, jack, cmd } = ensureLegs(v);
  const mode: OutriggerMode = v.craneOutriggerMode === 'jack' ? 'jack' : 'beam';

  if (hasPressure) {
    for (let i = 0; i < LEG_COUNT; i++) {
      const c = cmd[i];
      if (!c) continue;
      if (mode === 'beam') {
        // a beam cannot slide back while its jack still holds the load
        if (c < 0 && jack[i] > 0.02) continue;
        beam[i] = clamp01(beam[i] + c * BEAM_RATE * dt);
      } else {
        // the jack only goes down when its beam is fully out
        if (c > 0 && beam[i] < BEAM_FULL) continue;
        jack[i] = clamp01(jack[i] + c * JACK_RATE * dt);
      }
    }
  }

  const target = solveChassisAttitude(v);
  const k = Math.min(1, ATTITUDE_RATE * dt);
  v.craneChassisRoll = (v.craneChassisRoll ?? 0) + (target.roll - (v.craneChassisRoll ?? 0)) * k;
  v.craneChassisPitch = (v.craneChassisPitch ?? 0) + (target.pitch - (v.craneChassisPitch ?? 0)) * k;
  v.craneOutriggerContact = target.contact;

  // fields other systems still read
  v.craneOutriggerExt = (beam[0] + beam[1] + beam[2] + beam[3]) / LEG_COUNT;
  v.craneOutriggersDeployed = target.contact.every(Boolean);
}

export function isOutriggerMoving(v: LegState, hasPressure: boolean): boolean {
  if (!hasPressure) return false;
  const { cmd } = ensureLegs(v);
  return cmd.some((c) => c !== 0);
}
