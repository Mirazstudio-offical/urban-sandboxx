import React, { useEffect, useState } from 'react';
import {
  Anchor,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Gauge,
  Lightbulb,
  Link2,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  ShieldAlert,
  Volume2,
} from 'lucide-react';
import { GameWorld, InputState, Player, Vehicle } from '../types';
import {
  getVehicleCraneGeometry,
  isVehicleCraneTruck,
  resolveVehicleTruckFrameAndBody,
} from '../truckChassisVariants';
import { toggleCraneHookAttach } from '../physics';
import { sound } from '../audio';
import { hasPtoDrive } from '../ptoSystem';
import './truckConsole.css';

interface TruckSuperstructureHUDProps {
  player: Player | null;
  world: GameWorld | null;
  inputRef: React.MutableRefObject<InputState>;
  isMobileTouch?: boolean;
  onForceUpdate?: () => void;
  onOpenOutriggersModal?: () => void;
  onEnterCraneCab?: () => void;
  onExitCraneCab?: () => void;
}

type InputFlag = keyof InputState;

/* Clicks and touches on the console must never reach the world (camera drag, hose, interaction). */
const stopWorld = {
  onPointerDown: (e: React.SyntheticEvent) => e.stopPropagation(),
  onMouseDown: (e: React.SyntheticEvent) => e.stopPropagation(),
  onMouseMove: (e: React.SyntheticEvent) => e.stopPropagation(),
  onTouchStart: (e: React.SyntheticEvent) => e.stopPropagation(),
  onTouchMove: (e: React.SyntheticEvent) => e.stopPropagation(),
  onWheel: (e: React.SyntheticEvent) => e.stopPropagation(),
};

const setFlag = (inputRef: React.MutableRefObject<InputState>, key: InputFlag, val: boolean) => {
  (inputRef.current as unknown as Record<string, boolean>)[key as string] = val;
};

interface HoldKeyProps {
  inputRef: React.MutableRefObject<InputState>;
  inputKey: InputFlag;
  title: string;
  disabled?: boolean;
  icon: React.ReactNode;
  label?: string;
  cap?: string;
  isIcon?: boolean;
}

/* A key that holds an input flag while it is pressed (mouse, touch and pen through pointer events). */
const HoldKey: React.FC<HoldKeyProps> = ({ inputRef, inputKey, title, disabled = false, icon, label, cap, isIcon }) => {
  const [down, setDown] = useState(false);

  const set = (val: boolean) => {
    if (val && disabled) return;
    setFlag(inputRef, inputKey, val);
    setDown(val);
    if (val) sound.playHydraulicHiss(0.18);
  };

  useEffect(() => {
    if (disabled && down) set(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  useEffect(() => () => setFlag(inputRef, inputKey, false), [inputRef, inputKey]);

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        set(true);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        set(false);
      }}
      onPointerCancel={() => set(false)}
      onLostPointerCapture={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={`tc-key${isIcon ? ' is-icon' : ''}${down ? ' is-down' : ''}`}
    >
      {icon}
      {label && <span>{label}</span>}
      {cap && <span className="tc-cap">{cap}</span>}
    </button>
  );
};

interface LeverProps {
  name: string;
  inputRef: React.MutableRefObject<InputState>;
  neg: { key: InputFlag; icon: React.ReactNode; cap: string; title: string };
  pos: { key: InputFlag; icon: React.ReactNode; cap: string; title: string };
  disabled?: boolean;
  compact?: boolean;
}

const Lever: React.FC<LeverProps> = ({ name, inputRef, neg, pos, disabled, compact }) => {
  if (compact) {
    return (
      <div className="tc-lv">
        <span className="tc-pair-name">{name}</span>
        <HoldKey inputRef={inputRef} inputKey={neg.key} title={neg.title} icon={neg.icon} disabled={disabled} />
        <HoldKey inputRef={inputRef} inputKey={pos.key} title={pos.title} icon={pos.icon} disabled={disabled} />
      </div>
    );
  }
  return (
    <div className="tc-lever">
      <HoldKey inputRef={inputRef} inputKey={neg.key} title={neg.title} icon={neg.icon} cap={neg.cap} disabled={disabled} />
      <span className="tc-lever-name">{name}</span>
      <HoldKey inputRef={inputRef} inputKey={pos.key} title={pos.title} icon={pos.icon} cap={pos.cap} disabled={disabled} />
    </div>
  );
};

interface SlideLeverProps {
  name: string;
  inputRef: React.MutableRefObject<InputState>;
  neg: { key: InputFlag; icon: React.ReactNode; title: string };
  pos: { key: InputFlag; icon: React.ReactNode; title: string };
  disabled?: boolean;
}

const TRAVEL = 40; // finger travel in px from the press point to full tilt
const MAX_TILT = 34; // lever tilt in degrees at full travel
const ENGAGE = 0.35;

/* A cab lever: just a stalk and a ball grip, no panel and no captions.
   Press anywhere on it and push the finger up (lever tilts away, positive input) or down (lever tilts toward you, negative input).
   Release and it springs back to upright. */
const SlideLever: React.FC<SlideLeverProps> = ({ name, inputRef, neg, pos, disabled = false }) => {
  const activeId = React.useRef<number | null>(null);
  const startY = React.useRef(0);
  const [offset, setOffset] = useState(0); // px, positive = pushed away
  const [dragging, setDragging] = useState(false);
  const dir = React.useRef<-1 | 0 | 1>(0);

  const apply = (v: number) => {
    const next: -1 | 0 | 1 = v > ENGAGE ? 1 : v < -ENGAGE ? -1 : 0;
    if (next === dir.current) return;
    dir.current = next;
    setFlag(inputRef, pos.key, next === 1);
    setFlag(inputRef, neg.key, next === -1);
    if (next !== 0) sound.playHydraulicHiss(0.18);
  };

  const moveTo = (clientY: number) => {
    const px = Math.max(-TRAVEL, Math.min(TRAVEL, startY.current - clientY));
    setOffset(px);
    apply(px / TRAVEL);
  };

  const release = () => {
    activeId.current = null;
    setDragging(false);
    setOffset(0);
    apply(0);
  };

  useEffect(() => {
    if (disabled && activeId.current !== null) release();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  useEffect(
    () => () => {
      setFlag(inputRef, pos.key, false);
      setFlag(inputRef, neg.key, false);
    },
    [inputRef, pos.key, neg.key],
  );

  const state = dir.current === 1 ? 'is-pos' : dir.current === -1 ? 'is-neg' : '';
  const tilt = (offset / TRAVEL) * MAX_TILT;

  return (
    <div className={`tc-lv3${disabled ? ' is-off' : ''}`}>
      <div
        className={`tc-lv3-hit ${state}${dragging ? ' is-drag' : ''}`}
        style={{ '--a': `${tilt.toFixed(1)}deg` } as React.CSSProperties}
        onPointerDown={(e) => {
          if (disabled || activeId.current !== null) return;
          e.preventDefault();
          e.stopPropagation();
          activeId.current = e.pointerId;
          startY.current = e.clientY;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          setDragging(true);
        }}
        onPointerMove={(e) => {
          if (activeId.current === e.pointerId) moveTo(e.clientY);
        }}
        onPointerUp={(e) => {
          if (activeId.current === e.pointerId) release();
        }}
        onPointerCancel={(e) => {
          if (activeId.current === e.pointerId) release();
        }}
        onLostPointerCapture={() => {
          if (activeId.current !== null) release();
        }}
        onContextMenu={(e) => e.preventDefault()}
        role="slider"
        aria-label={name}
        aria-valuemin={-1}
        aria-valuemax={1}
        aria-valuenow={dir.current}
        title={`${pos.title} / ${neg.title}`}
      >
        <i className="tc-lv3-arm">
          <i className="tc-lv3-rod" />
          <i className="tc-lv3-grip" />
        </i>
      </div>
    </div>
  );
};

interface TapKeyProps {
  onClick: () => void;
  title: string;
  icon?: React.ReactNode;
  label?: string;
  cap?: string;
  tone?: 'on' | 'good' | 'blue' | 'bad' | 'primary';
  isIcon?: boolean;
  disabled?: boolean;
}

const TapKey: React.FC<TapKeyProps> = ({ onClick, title, icon, label, cap, tone, isIcon, disabled = false }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    disabled={disabled}
    onClick={onClick}
    className={`tc-key${isIcon ? ' is-icon' : ''}${tone ? ` is-${tone}` : ''}`}
  >
    {icon}
    {label && <span>{label}</span>}
    {cap && <span className="tc-cap">{cap}</span>}
  </button>
);

export const TruckSuperstructureHUD: React.FC<TruckSuperstructureHUDProps> = ({
  player,
  world,
  inputRef,
  isMobileTouch = false,
  onForceUpdate,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  if (!player || !world) return null;

  // Active vehicle: only when player is inside a crane truck cab
  if (!player.isInVehicle || !player.currentVehicleId) return null;
  const activeVehicle = world.vehicles.find((v) => v.id === player.currentVehicleId) || null;
  if (!activeVehicle || !isVehicleCraneTruck(activeVehicle)) return null;

  const isOperatorInCraneCab = !!(player.isInVehicle && (player.craneOperatorActive || activeVehicle.craneOperatorActive));
  if (!isOperatorInCraneCab) return null;

  const resolvedTruck = resolveVehicleTruckFrameAndBody(activeVehicle);
  const bodyTitle =
    resolvedTruck?.body.modelCode ||
    resolvedTruck?.body.nameRu ||
    'Спецнадстройка';
  const veh = activeVehicle;

  const FoldButton = (
    <button type="button" className="tc-fold" onClick={() => setCollapsed(true)} title="Свернуть пульт" aria-label="Свернуть пульт">
      <Minimize2 />
    </button>
  );

  // Collapsed: one small chip in the bottom-left corner (left edge under the F / E buttons on phones)
  if (collapsed) {
    return (
      <div
        className={`tc ${isMobileTouch ? 'tc-left' : ''}`}
        style={isMobileTouch ? { width: 'auto' } : { left: 16, bottom: 16 }}
        {...stopWorld}
      >
        <button
          type="button"
          className="tc-card tc-chip tc-key"
          style={{ width: 'auto', height: 36, background: 'var(--tc-glass)' }}
          onClick={() => {
            sound.playButtonPress();
            setCollapsed(false);
          }}
        >
          <Gauge />
          <span>{isMobileTouch ? 'Пульт' : `Пульт ${bodyTitle}`}</span>
          <Maximize2 style={{ width: 14, height: 14 }} />
        </button>
      </div>
    );
  }

  // =========================================================================
  // BOOM CRANE (КС-3577 «Ивановец»)
  // =========================================================================
  const hasPressure = hasPtoDrive(veh);

  const geom = getVehicleCraneGeometry(veh);
  const deg = Math.round((geom.turretAngle * 180) / Math.PI);
  const outriggerPct = Math.round((geom.outriggerExt ?? 0) * 100);
  const outriggersOk = (geom.outriggerExt ?? 0) >= 0.7;

  const hookedVeh = veh.craneHookedVehicleId ? world.vehicles.find((v) => v.id === veh.craneHookedVehicleId) : null;

  const hookedMassTons = hookedVeh ? (hookedVeh.mass ? +(hookedVeh.mass / 1000).toFixed(1) : 1.8) : 0.0;
  const loadMomentPct = Math.min(100, Math.round((hookedMassTons / Math.max(0.1, geom.maxLoadTons)) * 100));
  const workingRadiusMeters = +(geom.totalBoomReachPx * 0.28).toFixed(1);
  const boomAngleDeg = Math.round(15 + (veh.craneBoomElevation ?? 0.25) * 55);
  const barTone = loadMomentPct > 95 ? 'is-bad' : loadMomentPct > 75 ? 'is-warn' : '';
  const locked = !outriggersOk || !hasPressure;

  const toggleHook = () => {
    toggleCraneHookAttach(veh, world, player);
    onForceUpdate?.();
  };
  const toggleLight = () => {
    sound.playButtonPress();
    veh.craneSpotlightOn = !veh.craneSpotlightOn;
    onForceUpdate?.();
  };

  const status = !outriggersOk
    ? { cls: 'is-bad', text: 'Нет опор' }
    : !hasPressure
    ? { cls: 'is-amber', text: 'Нет давления' }
    : { cls: 'is-good', text: 'Норма' };

  const slew = {
    neg: { key: 'craneTurretLeft' as InputFlag, icon: <RotateCcw />, cap: 'A', title: 'Башня влево [A]' },
    pos: { key: 'craneTurretRight' as InputFlag, icon: <RotateCw />, cap: 'D', title: 'Башня вправо [D]' },
  };
  const elev = {
    neg: { key: 'craneBoomDown' as InputFlag, icon: <ArrowDown />, cap: 'S', title: 'Опустить стрелу [S]' },
    pos: { key: 'craneBoomUp' as InputFlag, icon: <ArrowUp />, cap: 'W', title: 'Поднять стрелу [W]' },
  };
  const tele = {
    neg: { key: 'craneBoomRetract' as InputFlag, icon: <ChevronDown />, cap: 'Q', title: 'Втянуть секции [Q]' },
    pos: { key: 'craneBoomExtend' as InputFlag, icon: <ChevronUp />, cap: 'E', title: 'Выдвинуть секции [E]' },
  };
  const winch = {
    neg: { key: 'craneHookDown' as InputFlag, icon: <ArrowDown />, cap: 'F', title: 'Майна, опустить крюк [F]' },
    pos: { key: 'craneHookUp' as InputFlag, icon: <ArrowUp />, cap: 'R', title: 'Вира, поднять крюк [R]' },
  };
  const lockNote = !outriggersOk ? 'Опоры не выставлены' : !hasPressure ? 'Нет давления, включите КОМ' : '';

  if (isMobileTouch) {
    return (
      <>
        <div className="tc tc-read-mini" {...stopWorld}>
          <div className="tc-mini" title="Загрузка по моменту">
            <b>{hookedMassTons > 0 ? hookedMassTons.toFixed(1) : '0.0'} / {geom.maxLoadTons.toFixed(1)} т</b>
            <div className={`tc-bar ${barTone}`}>
              <i style={{ width: `${Math.max(4, loadMomentPct)}%` }} />
            </div>
          </div>
          <div className="tc-mini-sub">R {workingRadiusMeters} м, {boomAngleDeg}°</div>
          {lockNote && <div className="tc-state-line">{lockNote}</div>}
        </div>

        <div className="tc tc-bank is-cab" {...stopWorld}>
          <SlideLever name="Поворот" inputRef={inputRef} disabled={locked} {...slew} />
          <SlideLever name="Стрела" inputRef={inputRef} disabled={locked} {...elev} />
          <SlideLever name="Телескоп" inputRef={inputRef} disabled={locked} {...tele} />
          <SlideLever name="Лебёдка" inputRef={inputRef} disabled={!hasPressure} {...winch} />
        </div>

        <div className="tc tc-strip is-right" {...stopWorld}>
          <TapKey
            onClick={toggleHook}
            title={hookedVeh ? 'Отцепить строп' : 'Зацепить строп'}
            icon={<Link2 />}
            tone={hookedVeh ? 'good' : undefined}
            isIcon
          />
          <TapKey onClick={() => sound.playCraneHorn()} title="Сигнал крановщика" icon={<Volume2 />} isIcon />
          <TapKey onClick={toggleLight} title="Фара на стреле" icon={<Lightbulb />} tone={veh.craneSpotlightOn ? 'on' : undefined} isIcon />
        </div>
      </>
    );
  }

  return (
    <div className="tc tc-card tc-panel" {...stopWorld}>
      <div className="tc-head">
        <Anchor style={{ width: 16, height: 16, color: '#e0ab45' }} />
        <span className="tc-title">Кабина крана</span>
        <span className={`tc-tag ${status.cls}`}>{status.text}</span>
        {FoldButton}
      </div>

      <div className="tc-read">
        <div className="tc-read-top">
          <span className="tc-read-k">Груз / максимум</span>
          <span className="tc-read-v">
            {hookedMassTons > 0 ? hookedMassTons.toFixed(1) : '0.0'}
            <small>/ {geom.maxLoadTons.toFixed(1)} т</small>
          </span>
        </div>
        <div className={`tc-bar ${barTone}`}>
          <i style={{ width: `${Math.max(2, loadMomentPct)}%` }} />
        </div>
        <div className="tc-stats">
          <div className="tc-stat"><span>Вылет</span><b>{workingRadiusMeters} м</b></div>
          <div className="tc-stat"><span>Стрела</span><b>{geom.boomLengthMeters.toFixed(1)} м</b></div>
          <div className="tc-stat"><span>Наклон</span><b>{boomAngleDeg}°</b></div>
          <div className="tc-stat"><span>Поворот</span><b>{deg > 0 ? `+${deg}` : deg}°</b></div>
        </div>
      </div>

      {!outriggersOk && (
        <div className="tc-warn">
          <ShieldAlert />
          <span>Опоры {outriggerPct}%. Спуститесь и выставьте их на пульте у рамы</span>
        </div>
      )}

      <div className="tc-levers">
        <Lever name="Поворот" inputRef={inputRef} disabled={locked} {...slew} />
        <Lever name="Подъём стрелы" inputRef={inputRef} disabled={locked} {...elev} />
        <Lever name="Телескоп" inputRef={inputRef} disabled={locked} {...tele} />
        <Lever name="Лебёдка" inputRef={inputRef} disabled={!hasPressure} {...winch} />
      </div>

      <div className="tc-row c3">
        <TapKey
          onClick={toggleHook}
          title="Зацепить или отцепить четырёхветвевой строп [Пробел]"
          icon={<Link2 />}
          label={hookedVeh ? 'Отцепить' : 'Строп'}
          tone={hookedVeh ? 'good' : undefined}
        />
        <TapKey onClick={() => sound.playCraneHorn()} title="Сигнал крановщика [H]" icon={<Volume2 />} label="Сигнал" />
        <TapKey onClick={toggleLight} title="Фара на стреле [L]" icon={<Lightbulb />} label="Фара" tone={veh.craneSpotlightOn ? 'on' : undefined} />
      </div>
    </div>
  );
};

