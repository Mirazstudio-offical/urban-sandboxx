import { Player, Vehicle } from './types';
import { sound } from './audio';
import { addPlayerNotification } from './items';
import { PX_S_TO_SPEED_KMH } from './vehicleHelpers';
import { isVehicleCraneTruck, isVehicleVacuumTruck } from './truckChassisVariants';

/* Power take-off (КОМ, коробка отбора мощности).
   One place for the state, the rules and the only switch: the vehicle control menu calls togglePto().
   The box is off by default, like on a real truck; it is engaged from the cab with the engine running. */

/** Highest speed (km/h) at which the box can be engaged. Pumps and crane hydraulics are run on a stand. */
export const PTO_MAX_ENGAGE_KMH = 5;

export function vehicleHasPto(v: Vehicle | null | undefined): boolean {
  if (!v) return false;
  return v.type === 'truck_water' || v.type === 'fire_engine' || !!v.fluidTank?.hasWaterHose || isVehicleVacuumTruck(v) || isVehicleCraneTruck(v);
}

export function isPtoOn(v: Vehicle | null | undefined): boolean {
  return !!v?.isPtoActive;
}

/** Hydraulic or pump drive is live: box engaged and the engine running. */
export function hasPtoDrive(v: Vehicle | null | undefined): boolean {
  if (!v || !v.isPtoActive) return false;
  return v.engineState ? !!v.engineState.engineRunning : true;
}

function describe(v: Vehicle): string {
  if (isVehicleCraneTruck(v)) return 'гидронасос крана';
  if (isVehicleVacuumTruck(v)) return 'вакуумный насос';
  return 'водяной насос';
}

/** Flip the box. Returns the new state. Engaging while driving is refused. */
export function togglePto(v: Vehicle, player?: Player | null): boolean {
  const kmh = Math.abs(v.speed) * PX_S_TO_SPEED_KMH;
  if (!v.isPtoActive && kmh > PTO_MAX_ENGAGE_KMH) {
    sound.playAlert();
    if (player) addPlayerNotification(player, 'КОМ включают на стоянке: остановите машину', 'warning');
    return false;
  }

  v.isPtoActive = !v.isPtoActive;
  sound.playButtonPress();

  const running = v.engineState ? !!v.engineState.engineRunning : true;
  if (v.isPtoActive) {
    if (running) sound.playHydraulicHiss(0.3);
    if (player) {
      addPlayerNotification(
        player,
        running ? `КОМ включён: привод на ${describe(v)}` : 'КОМ включён. Заведите двигатель, давления пока нет',
        'info',
      );
    }
  } else if (player) {
    addPlayerNotification(player, `КОМ выключен: ${describe(v)} не работает`, 'warning');
  }
  return !!v.isPtoActive;
}
