// --- VACUUM PUMP: helpers shared by the pump control post ---

import type { Vehicle } from './types';
import { isPtoOn } from './ptoSystem';

export type PumpMode = 'suction' | 'discharge';

/* Gauge range in bar: deep vacuum on the left, compressor overpressure on the right. */
export const GAUGE_MIN_BAR = -1;
export const GAUGE_MAX_BAR = 1.6;

export function getPumpMode(car: Pick<Vehicle, 'fluidTank'>): PumpMode {
  return car.fluidTank?.vacuumPumpMode === 'discharge' ? 'discharge' : 'suction';
}

/* The pump turns when the engine runs with the power take-off engaged. A vacuum trailer takes both from its tractor. */
export function isVacuumPumpRunning(car: Vehicle, vehicles: Vehicle[] | undefined): boolean {
  let power: Vehicle = car;
  if (car.type === 'trailer_vacuum' && car.towedById && vehicles) {
    const tractor = vehicles.find((v) => v.id === car.towedById);
    if (tractor) power = tractor;
  }
  const engineRunning = !!power.engineState?.engineRunning;
  const ptoEngaged = car.type === 'trailer_vacuum' ? isPtoOn(car) || isPtoOn(power) : isPtoOn(car);
  return engineRunning && ptoEngaged;
}
