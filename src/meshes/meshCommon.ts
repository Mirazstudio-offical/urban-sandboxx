import { BeamTemplate, BeamLinkType } from '../types';

export const DEFAULT_K_STRUCTURAL = 2800;
export const DEFAULT_C_STRUCTURAL = 85;
export const DEFAULT_K_CHASSIS = 5200;
export const DEFAULT_C_CHASSIS = 150;
export const DEFAULT_K_CROSS = 2200;
export const DEFAULT_C_CROSS = 70;
export const DEFAULT_K_SUPPORT = 3400;
export const DEFAULT_C_SUPPORT = 90;
export const DEFAULT_K_LATCH = 2200;
export const DEFAULT_C_LATCH = 75;

/**
 * Creates closed perimeter ring beams for outer body panels
 */
export function createPerimeterBeams(
  count: number,
  yieldBumper = 0.38,
  yieldSide = 0.50,
  breakDist = 18.0,
  springMult = 1.0
): BeamTemplate[] {
  const beams: BeamTemplate[] = [];
  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count;
    const isFront = i === 0 || i === count - 1;
    const isRear = i === Math.floor(count / 2) - 1 || i === Math.floor(count / 2);
    beams.push({
      nodeA: i,
      nodeB: next,
      type: 'structural',
      spring: DEFAULT_K_STRUCTURAL * springMult,
      damp: DEFAULT_C_STRUCTURAL * springMult,
      yieldDist: isFront || isRear ? yieldBumper : yieldSide,
      breakDist
    });
  }
  return beams;
}

/**
 * Helper to add an array of beams with a common type and stiffness
 */
export function addBeamChain(
  beams: BeamTemplate[],
  chain: [number, number][],
  type: BeamLinkType,
  spring: number,
  damp: number,
  yieldDist: number,
  breakDist: number,
  partTag?: BeamTemplate['partTag']
): void {
  for (const [a, b] of chain) {
    beams.push({
      nodeA: a,
      nodeB: b,
      type,
      spring,
      damp,
      yieldDist,
      breakDist,
      partTag
    });
  }
}
