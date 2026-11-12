import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { GameWorld, Player, Vehicle } from '../types';
import { sound } from '../audio';
import { isPtoOn } from '../ptoSystem';
import { isVehicleCraneTruck } from '../truckChassisVariants';
import { CabLever } from './CabLever';
import { PressureGauge, SpiritLevel } from './OutriggerInstruments';
import './outriggerPost.css';

interface CraneOutriggersModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  player: Player | null;
  world: GameWorld | null;
  onForceUpdate?: () => void;
}

const WORKING_MPA = 16;
const MOVING_MPA = 11; // the needle sags while the cylinders are moving

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

/* Outrigger control post at the chassis frame.
   One distributor lever: push it away to lower the outriggers, pull it toward you to raise them.
   The legs themselves are watched in the world, so the screen is not dimmed. */
export const CraneOutriggersModal: React.FC<CraneOutriggersModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  onForceUpdate,
}) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // the outrigger extension moves in the physics loop, so redraw the instruments while the post is open
  useEffect(() => {
    if (!isOpen) return;
    const id = window.setInterval(() => setTick((t) => (t + 1) % 1000), 80);
    return () => window.clearInterval(id);
  }, [isOpen]);

  if (!isOpen || !vehicle || !isVehicleCraneTruck(vehicle)) return null;

  const isEngineRunning = vehicle.engineState ? vehicle.engineState.engineRunning : true;
  const hasHydraulicPressure = isEngineRunning && isPtoOn(vehicle);

  const ext = vehicle.craneOutriggerExt ?? (vehicle.craneOutriggersDeployed ? 1.0 : 0.0);
  const target = vehicle.craneOutriggersDeployed ? 1 : 0;
  const isMoving = Math.abs(ext - target) > 0.01;
  const isDeployed = ext >= 0.85;

  // the bubble drifts while the chassis hangs on its springs and centres as the legs take the weight
  const tilt = 1 - Math.min(1, ext / 0.85);
  const bubbleX = Math.sin(vehicle.angle) * 18 * tilt;
  const bubbleY = Math.cos(vehicle.angle) * 14 * tilt;

  const mpa = !hasHydraulicPressure ? 0 : isMoving ? MOVING_MPA : WORKING_MPA;

  const handleToggleOutriggers = (targetState: boolean) => {
    if (!hasHydraulicPressure && targetState) {
      sound.playAlert();
      return;
    }
    sound.playButtonPress();
    sound.playHydraulicHiss(0.45);
    vehicle.craneOutriggersDeployed = targetState;
    setIsDeploying(true);
    setTimeout(() => {
      sound.playOutriggerLock();
      setIsDeploying(false);
      onForceUpdate?.();
    }, 1200);
    onForceUpdate?.();
  };

  const onLeverDir = (dir: -1 | 0 | 1) => {
    if (dir === 0 || isDeploying) return;
    if (dir === 1 && !isDeployed) handleToggleOutriggers(true);
    if (dir === -1 && ext > 0) handleToggleOutriggers(false);
  };

  return (
    <div className="op-layer" onPointerDown={stop} onMouseDown={stop} onTouchStart={stop} onClick={onClose}>
      <button type="button" className="op-close" onClick={onClose} title="Закрыть пульт [Esc / E]" aria-label="Закрыть пульт">
        <X />
      </button>

      {!hasHydraulicPressure && <div className="op-hint">Нет давления, включите КОМ и запустите двигатель</div>}

      <div className="op-post" onClick={stop} onPointerDown={stop} onMouseDown={stop} onTouchStart={stop}>
        <i className="op-bolt is-tl" />
        <i className="op-bolt is-tr" />
        <i className="op-bolt is-bl" />
        <i className="op-bolt is-br" />
        <div className="op-gauge">
          <PressureGauge mpa={mpa} />
        </div>
        <div />
        <div className="op-level">
          <SpiritLevel x={bubbleX} y={bubbleY} />
        </div>
      </div>

      <div className="op-lever" onClick={stop}>
        <CabLever
          name="Рычаг выносных опор"
          title="От себя: выставить опоры. На себя: убрать в транспортное"
          disabled={isDeploying}
          onDirChange={onLeverDir}
        />
      </div>
    </div>
  );
};
