import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { GameWorld, Player, Vehicle } from '../types';
import { sound } from '../audio';
import { isPtoOn } from '../ptoSystem';
import { isVehicleCraneTruck } from '../truckChassisVariants';
import { ensureLegs, getLegs, isOutriggerMoving, LEG_COUNT, LEG_NAMES } from '../craneOutriggers';
import { CabLever } from './CabLever';
import {
  LEVEL_UNITS_PER_DEG,
  LegMark,
  ModeToggle,
  PictoBeam,
  PictoJack,
  PressureGauge,
  SpiritLevel,
} from './OutriggerInstruments';
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
const MOVING_MPA = 11; // the needle sags while a cylinder is moving
const RELIEF_MPA = 22; // a lever held at the end of its stroke runs into the relief valve
const RAD_TO_DEG = 180 / Math.PI;

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

/* Outrigger control post at the chassis frame: the plate with a pressure gauge and a bubble level,
   a beam/jack tumbler and one lever per leg. The legs themselves are watched in the world, so the screen is not dimmed. */
export const CraneOutriggersModal: React.FC<CraneOutriggersModalProps> = ({ isOpen, onClose, vehicle }) => {
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

  // the legs and the body move in the physics loop, so redraw the instruments while the post is open
  useEffect(() => {
    if (!isOpen) return;
    const id = window.setInterval(() => setTick((t) => (t + 1) % 1000), 80);
    return () => window.clearInterval(id);
  }, [isOpen]);

  // leaving the post releases every lever
  useEffect(
    () => () => {
      if (vehicle) ensureLegs(vehicle).cmd.fill(0);
    },
    [vehicle],
  );

  if (!isOpen || !vehicle || !isVehicleCraneTruck(vehicle)) return null;

  const isEngineRunning = vehicle.engineState ? vehicle.engineState.engineRunning : true;
  const hasHydraulicPressure = isEngineRunning && isPtoOn(vehicle);

  const legs = ensureLegs(vehicle);
  const view = getLegs(vehicle);
  const mode = vehicle.craneOutriggerMode === 'jack' ? 'jack' : 'beam';
  const moving = isOutriggerMoving(vehicle, hasHydraulicPressure);

  // a lever held against the end of its stroke blows the relief valve
  const atLimit = legs.cmd.some((c, i) => {
    if (!c) return false;
    const v = mode === 'beam' ? view.beam[i] : view.jack[i];
    return (c > 0 && v >= 0.999) || (c < 0 && v <= 0.001);
  });
  const mpa = !hasHydraulicPressure ? 0 : atLimit ? RELIEF_MPA : moving ? MOVING_MPA : WORKING_MPA;

  // the bubble runs to the high side of the chassis, like a real level
  const bubbleX = (vehicle.craneChassisRoll ?? 0) * RAD_TO_DEG * LEVEL_UNITS_PER_DEG;
  const bubbleY = -(vehicle.craneChassisPitch ?? 0) * RAD_TO_DEG * LEVEL_UNITS_PER_DEG;

  const setMode = (m: 'beam' | 'jack') => {
    sound.playButtonPress();
    legs.cmd.fill(0);
    vehicle.craneOutriggerMode = m;
  };

  const onLeverDir = (i: number, dir: -1 | 0 | 1) => {
    legs.cmd[i] = dir;
    if (dir === 0) return;
    if (!hasHydraulicPressure) {
      sound.playAlert();
      return;
    }
    sound.playHydraulicHiss(0.3);
  };

  const legState = (i: number): 'in' | 'out' | 'ground' =>
    view.contact[i] ? 'ground' : view.beam[i] >= 0.7 ? 'out' : 'in';

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

        <div className="op-mid">
          <span className="op-picto"><PictoBeam /></span>
          <ModeToggle mode={mode} onChange={setMode} />
          <span className="op-picto"><PictoJack /></span>
        </div>

        <div className="op-level">
          <SpiritLevel x={bubbleX} y={bubbleY} />
        </div>

        <div className="op-marks">
          {Array.from({ length: LEG_COUNT }, (_, i) => (
            <span key={i} className="op-mark" title={LEG_NAMES[i]}>
              <LegMark leg={i} state={legState(i)} />
            </span>
          ))}
        </div>
      </div>

      <div className="op-levers" onClick={stop} onPointerDown={stop} onMouseDown={stop} onTouchStart={stop}>
        {Array.from({ length: LEG_COUNT }, (_, i) => (
          <CabLever
            key={i}
            name={`Рычаг опоры: ${LEG_NAMES[i].toLowerCase()}`}
            title={`${LEG_NAMES[i]} опора. От себя: ${mode === 'beam' ? 'выдвинуть балку' : 'опустить домкрат'}. На себя: ${mode === 'beam' ? 'втянуть' : 'поднять'}`}
            onDirChange={(d) => onLeverDir(i, d)}
          />
        ))}
      </div>
    </div>
  );
};
