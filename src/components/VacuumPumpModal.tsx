import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { GameWorld, Player, Vehicle } from '../types';
import { sound } from '../audio';
import { getPumpMode, isVacuumPumpRunning, PumpMode } from '../vacuumPump';
import { CompoundGauge, FourWayValve, PictoFlow } from './PumpInstruments';
import './outriggerPost.css';
import './vacuumPost.css';

interface VacuumPumpModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  player: Player | null;
  world: GameWorld | null;
  onForceUpdate?: () => void;
}

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

/* Pump control post on the side of the body: a compound gauge and the four-way cock.
   Left stop draws the air out of the tank (suction), right stop pumps it in (discharge).
   The tank pressure builds in the physics loop, so the needle follows the real cistern. */
export const VacuumPumpModal: React.FC<VacuumPumpModalProps> = ({ isOpen, onClose, vehicle, world, onForceUpdate }) => {
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

  // the cistern pressure moves in the physics loop, so redraw the gauge while the post is open
  useEffect(() => {
    if (!isOpen) return;
    const id = window.setInterval(() => setTick((t) => (t + 1) % 1000), 100);
    return () => window.clearInterval(id);
  }, [isOpen]);

  if (!isOpen || !vehicle || !vehicle.fluidTank) return null;

  const mode = getPumpMode(vehicle);
  const running = isVacuumPumpRunning(vehicle, world?.vehicles);
  const bar = vehicle.fluidTank.vacuumPressureBar ?? 0;

  const setMode = (m: PumpMode) => {
    if (!vehicle.fluidTank || m === mode) return;
    vehicle.fluidTank.vacuumPumpMode = m;
    const curBar = vehicle.fluidTank.vacuumPressureBar ?? 0;
    if (m === 'discharge' && curBar < 0) {
      vehicle.fluidTank.vacuumPressureBar = 0;
    } else if (m === 'suction' && curBar > 0) {
      vehicle.fluidTank.vacuumPressureBar = 0;
    }
    sound.playHydraulicHiss(0.22);
    onForceUpdate?.();
  };

  return (
    <div className="op-layer" onPointerDown={stop} onMouseDown={stop} onTouchStart={stop} onClick={onClose}>
      <button type="button" className="op-close" onClick={onClose} title="Закрыть пульт [Esc / E]" aria-label="Закрыть пульт">
        <X />
      </button>

      {!running && <div className="vp-hint">Насос стоит, включите КОМ и запустите двигатель</div>}

      <div className="vp-post" onClick={stop} onPointerDown={stop} onMouseDown={stop} onTouchStart={stop}>
        <i className="op-bolt is-tl" />
        <i className="op-bolt is-tr" />
        <i className="op-bolt is-bl" />
        <i className="op-bolt is-br" />

        <div className="vp-gauge">
          <CompoundGauge bar={bar} />
        </div>

        <div className="vp-cock">
          <span className={`vp-picto${mode === 'suction' ? ' is-on' : ''}`}><PictoFlow mode="suction" /></span>
          <FourWayValve mode={mode} onChange={setMode} />
          <span className={`vp-picto${mode === 'discharge' ? ' is-on' : ''}`}><PictoFlow mode="discharge" /></span>
        </div>
      </div>
    </div>
  );
};
