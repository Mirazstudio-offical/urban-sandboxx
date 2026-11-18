import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Compass,
  Gauge,
  Lightbulb,
  Lock,
  Maximize2,
  Minimize2,
  Power,
  RotateCcw,
  RotateCw,
  ShieldAlert,
  Unlock,
  Volume2,
} from 'lucide-react';
import { GameWorld, InputState, Player } from '../types';
import {
  EK12_SPECS,
  ensureExcavatorState,
  getExcavatorGeometry,
  isExcavatorStabilized,
  isExcavatorVehicle,
  stowExcavatorForTransport,
} from '../excavatorSystem';
import { hasPtoDrive, isPtoOn, togglePto } from '../ptoSystem';
import { addPlayerNotification } from '../items';
import { sound } from '../audio';
import { CabLever } from './CabLever';
import './truckConsole.css';

interface ExcavatorHUDProps {
  player: Player | null;
  world: GameWorld | null;
  inputRef: React.MutableRefObject<InputState>;
  isMobileTouch?: boolean;
  onForceUpdate?: () => void;
}

type InputFlag = keyof InputState;

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

const HoldKey: React.FC<HoldKeyProps> = ({
  inputRef,
  inputKey,
  title,
  disabled = false,
  icon,
  label,
  cap,
  isIcon,
}) => {
  const [down, setDown] = useState(false);

  const set = (val: boolean) => {
    if (val && disabled) return;
    setFlag(inputRef, inputKey, val);
    setDown(val);
    if (val) sound.playHydraulicHiss(0.16);
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
  neg: { key: InputFlag; title: string };
  pos: { key: InputFlag; title: string };
  disabled?: boolean;
}

const SlideLever: React.FC<SlideLeverProps> = ({ name, inputRef, neg, pos, disabled = false }) => {
  useEffect(
    () => () => {
      setFlag(inputRef, pos.key, false);
      setFlag(inputRef, neg.key, false);
    },
    [inputRef, pos.key, neg.key],
  );

  return (
    <CabLever
      name={name}
      title={`${pos.title} / ${neg.title}`}
      disabled={disabled}
      onDirChange={(d) => {
        setFlag(inputRef, pos.key, d === 1);
        setFlag(inputRef, neg.key, d === -1);
        if (d !== 0) sound.playHydraulicHiss(0.16);
      }}
    />
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

const TapKey: React.FC<TapKeyProps> = ({
  onClick,
  title,
  icon,
  label,
  cap,
  tone,
  isIcon,
  disabled = false,
}) => (
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

export const ExcavatorHUD: React.FC<ExcavatorHUDProps> = ({
  player,
  world,
  inputRef,
  isMobileTouch = false,
  onForceUpdate,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  if (!player || !world) return null;
  if (!player.isInVehicle || !player.currentVehicleId) return null;

  const veh = world.vehicles.find((v) => v.id === player.currentVehicleId) || null;
  if (!veh || !isExcavatorVehicle(veh)) return null;

  ensureExcavatorState(veh);
  const geom = getExcavatorGeometry(veh);
  const isRunning = !!veh.engineState?.engineRunning;
  const ptoOn = isPtoOn(veh);
  const hasPressure = isRunning && hasPtoDrive(veh);
  const stabilized = isExcavatorStabilized(veh);
  const opMode = !!veh.exOperatorMode;

  const pressureMpa = veh.exHydPressureMpa ?? 0;
  const pressurePct = Math.min(100, Math.round((pressureMpa / EK12_SPECS.reliefPressureMpa) * 100));
  const pressureBarCls =
    pressureMpa >= 30.0 ? 'is-bad' : pressureMpa >= 20.0 ? 'is-amber' : '';
  const hydTemp = Math.round(veh.exHydTempC ?? 28);
  const bucketVolM3 = +((veh.exBucketLoad ?? 0) * EK12_SPECS.bucketCapacityM3).toFixed(2);
  const bladePct = Math.round((veh.exBladePos ?? 0) * 100);
  const outPct = Math.round((veh.exOutriggersPos ?? 0) * 100);

  const toggleWorkMode = () => {
    sound.playButtonPress();
    veh.exOperatorMode = !veh.exOperatorMode;
    addPlayerNotification(
      player,
      veh.exOperatorMode
        ? 'Режим работы: джойстики (WASD / Q E / R Пробел)'
        : 'Транспортный режим: управление ходом ЕК-12',
      'info',
    );
    onForceUpdate?.();
  };

  const toggleWorkLights = () => {
    sound.playButtonPress();
    veh.exWorkLightOn = !veh.exWorkLightOn;
    onForceUpdate?.();
  };

  const toggleAxleLock = () => {
    sound.playButtonPress();
    veh.exAxleOscillationLocked = !veh.exAxleOscillationLocked;
    onForceUpdate?.();
  };

  const handleTogglePto = () => {
    togglePto(veh, player);
    onForceUpdate?.();
  };

  const handleStow = () => {
    stowExcavatorForTransport(veh, player);
    onForceUpdate?.();
  };

  const status = !isRunning
    ? { cls: 'is-bad', text: 'Заглушен' }
    : !hasPressure
    ? { cls: 'is-amber', text: 'Нет КОМ' }
    : opMode
    ? { cls: 'is-good', text: 'Работа' }
    : stabilized
    ? { cls: 'is-good', text: 'Опоры' }
    : { cls: '', text: 'Ход' };

  const slew = {
    neg: { key: 'exSlewLeft' as InputFlag, icon: <RotateCcw />, cap: 'A', title: 'Поворот платформы влево [A]' },
    pos: { key: 'exSlewRight' as InputFlag, icon: <RotateCw />, cap: 'D', title: 'Поворот платформы вправо [D]' },
  };
  const boom = {
    neg: { key: 'exBoomDown' as InputFlag, icon: <ChevronDown />, cap: 'Q', title: 'Опустить стрелу [Q]' },
    pos: { key: 'exBoomUp' as InputFlag, icon: <ChevronUp />, cap: 'E', title: 'Поднять стрелу [E]' },
  };
  const stick = {
    neg: { key: 'exStickIn' as InputFlag, icon: <ArrowDown />, cap: 'S', title: 'Рукоять на себя [S]' },
    pos: { key: 'exStickOut' as InputFlag, icon: <ArrowUp />, cap: 'W', title: 'Рукоять от себя [W]' },
  };
  const bucket = {
    neg: { key: 'exBucketCurl' as InputFlag, icon: <ChevronDown />, cap: 'R', title: 'Закрыть / копать ковш [R]' },
    pos: { key: 'exBucketDump' as InputFlag, icon: <ChevronUp />, cap: 'Прб', title: 'Разгрузить ковш [Пробел]' },
  };
  const blade = {
    neg: { key: 'exBladeUp' as InputFlag, icon: <ArrowUp />, cap: '', title: 'Поднять отвал' },
    pos: { key: 'exBladeDown' as InputFlag, icon: <ArrowDown />, cap: '', title: 'Опустить отвал' },
  };
  const outriggers = {
    neg: { key: 'exStabilizersUp' as InputFlag, icon: <ArrowUp />, cap: '', title: 'Поднять аутригеры' },
    pos: { key: 'exStabilizersDown' as InputFlag, icon: <ArrowDown />, cap: '', title: 'Выдвинуть аутригеры' },
  };

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
          <span>{isMobileTouch ? 'ЕК-12' : 'Пульт ТВЭКС ЕК-12'}</span>
          <Maximize2 style={{ width: 14, height: 14 }} />
        </button>
      </div>
    );
  }

  // Mobile layout
  if (isMobileTouch) {
    if (opMode) {
      return (
        <>
          <div className="tc tc-read-mini" {...stopWorld}>
            <div className="tc-mini" title="Давление гидросистемы">
              <b>{pressureMpa.toFixed(1)} МПа</b>
              <div className={`tc-bar ${pressureBarCls}`}>
                <i style={{ width: `${Math.max(4, pressurePct)}%` }} />
              </div>
            </div>
            <div className="tc-mini-sub">
              Ковш {bucketVolM3.toFixed(2)} м³ · {geom.bucketHeightM >= 0 ? '+' : ''}
              {geom.bucketHeightM.toFixed(1)} м
            </div>
            {!hasPressure && <div className="tc-state-line">Включите КОМ</div>}
          </div>

          <div className="tc tc-bank is-cab" {...stopWorld}>
            <SlideLever name="Поворот" inputRef={inputRef} disabled={!hasPressure} neg={slew.neg} pos={slew.pos} />
            <SlideLever name="Стрела" inputRef={inputRef} disabled={!hasPressure} neg={boom.neg} pos={boom.pos} />
            <SlideLever name="Рукоять" inputRef={inputRef} disabled={!hasPressure} neg={stick.neg} pos={stick.pos} />
            <SlideLever name="Ковш" inputRef={inputRef} disabled={!hasPressure} neg={bucket.neg} pos={bucket.pos} />
          </div>

          <div className="tc tc-card tc-edge tc-left is-cab" {...stopWorld}>
            <div className="tc-pairs c2">
              <Lever name="Отвал" compact inputRef={inputRef} disabled={!hasPressure} {...blade} />
              <Lever name="Опоры" compact inputRef={inputRef} disabled={!hasPressure} {...outriggers} />
            </div>
          </div>

          <div className="tc tc-strip is-right" {...stopWorld}>
            <TapKey
              onClick={handleTogglePto}
              title="Коробка отбора мощности (гидронасос)"
              icon={<Power />}
              tone={hasPressure ? 'good' : ptoOn ? 'on' : undefined}
              isIcon
            />
            <TapKey
              onClick={toggleWorkLights}
              title="Фары рабочего света"
              icon={<Lightbulb />}
              tone={veh.exWorkLightOn ? 'on' : undefined}
              isIcon
            />
            <TapKey
              onClick={toggleWorkMode}
              title="Вернуться в транспортный ход"
              icon={<Compass />}
              tone="primary"
              isIcon
            />
          </div>
        </>
      );
    }

    // Travel mode on phones: compact edge cluster
    return (
      <div className="tc tc-card tc-edge tc-left" {...stopWorld}>
        <div className="tc-pairs c2">
          <Lever name={`Отвал ${bladePct}%`} compact inputRef={inputRef} disabled={!hasPressure} {...blade} />
          <Lever name={`Опоры ${outPct}%`} compact inputRef={inputRef} disabled={!hasPressure} {...outriggers} />
        </div>
        <div className="tc-pairs c3" style={{ marginTop: 4 }}>
          <TapKey
            onClick={handleTogglePto}
            title="КОМ"
            icon={<Power />}
            tone={hasPressure ? 'good' : ptoOn ? 'on' : undefined}
            isIcon
          />
          <TapKey
            onClick={toggleWorkMode}
            title="Джойстики экскаватора"
            icon={<Compass />}
            tone="primary"
            isIcon
          />
          <TapKey onClick={handleStow} title="Транспортное положение" icon={<Minimize2 />} isIcon />
        </div>
      </div>
    );
  }

  // Desktop expanded console
  return (
    <div className="tc tc-card tc-panel" style={{ width: 356 }} {...stopWorld}>
      <div className="tc-head">
        <Compass style={{ width: 16, height: 16, color: '#e0ab45' }} />
        <span className="tc-title">ТВЭКС ЕК-12</span>
        <span className={`tc-tag ${status.cls}`}>{status.text}</span>
        <button
          type="button"
          className="tc-fold"
          onClick={() => setCollapsed(true)}
          title="Свернуть пульт"
          aria-label="Свернуть пульт"
        >
          <Minimize2 />
        </button>
      </div>

      <div className="tc-read">
        <div className="tc-read-top">
          <span className="tc-read-k">Давление ГС / клапан</span>
          <span className="tc-read-v">
            {pressureMpa.toFixed(1)}
            <small>/ {EK12_SPECS.reliefPressureMpa} МПа</small>
          </span>
        </div>
        <div className={`tc-bar ${pressureBarCls}`}>
          <i style={{ width: `${Math.max(hasPressure ? 4 : 0, pressurePct)}%` }} />
        </div>
        <div className="tc-stats">
          <div className="tc-stat">
            <span>Ковш</span>
            <b>{bucketVolM3.toFixed(2)} м³</b>
          </div>
          <div className="tc-stat">
            <span>Вылет</span>
            <b>{geom.reachMeters.toFixed(1)} м</b>
          </div>
          <div className="tc-stat">
            <span>Уровень</span>
            <b>
              {geom.bucketHeightM >= 0 ? '+' : ''}
              {geom.bucketHeightM.toFixed(1)} м
            </b>
          </div>
          <div className="tc-stat">
            <span>Масло ГС</span>
            <b>{hydTemp} °C</b>
          </div>
        </div>
      </div>

      {!hasPressure && (
        <div className="tc-warn">
          <ShieldAlert />
          <span>{isRunning ? 'Включите КОМ для питания гидронасоса' : 'Заведите дизель Д-245 [J] и КОМ [P]'}</span>
          <TapKey
            onClick={handleTogglePto}
            title="Включить или выключить КОМ [P]"
            label="КОМ"
            cap="P"
            tone={ptoOn ? 'on' : 'primary'}
          />
        </div>
      )}

      <div className="tc-row c3" style={{ marginTop: 0, paddingTop: 0, borderTop: 0, marginBottom: 8 }}>
        <TapKey
          onClick={toggleWorkMode}
          title="Переключить режим Ход / Джойстики [G]"
          icon={<Compass />}
          label={opMode ? 'Джойстики' : 'Ход'}
          cap="G"
          tone={opMode ? 'good' : 'primary'}
        />
        <TapKey
          onClick={handleTogglePto}
          title="Коробка отбора мощности [P]"
          icon={<Power />}
          label="КОМ"
          cap="P"
          tone={hasPressure ? 'good' : ptoOn ? 'on' : undefined}
        />
        <TapKey
          onClick={handleStow}
          title="Сложить стрелу, отвал и аутригеры в транспортное положение"
          label="Транспорт"
          disabled={!hasPressure}
        />
      </div>

      <div className="tc-levers">
        <Lever name="Поворот" inputRef={inputRef} disabled={!hasPressure} {...slew} />
        <Lever name="Стрела" inputRef={inputRef} disabled={!hasPressure} {...boom} />
        <Lever name="Рукоять" inputRef={inputRef} disabled={!hasPressure} {...stick} />
        <Lever name="Ковш" inputRef={inputRef} disabled={!hasPressure} {...bucket} />
        <Lever name={`Отвал ${bladePct}%`} inputRef={inputRef} disabled={!hasPressure} {...blade} />
        <Lever name={`Опоры ${outPct}%`} inputRef={inputRef} disabled={!hasPressure} {...outriggers} />
      </div>

      <div className="tc-row c3">
        <TapKey
          onClick={toggleWorkLights}
          title="Рабочее освещение на кабине и стреле"
          icon={<Lightbulb />}
          label="Фара"
          tone={veh.exWorkLightOn ? 'on' : undefined}
        />
        <TapKey
          onClick={toggleAxleLock}
          title="Блокировка качания переднего моста"
          icon={veh.exAxleOscillationLocked ? <Lock /> : <Unlock />}
          label="Балансир"
          tone={veh.exAxleOscillationLocked ? 'bad' : undefined}
        />
        <TapKey
          onClick={() => sound.playCraneHorn()}
          title="Звуковой сигнал машиниста [H]"
          icon={<Volume2 />}
          label="Сигнал"
        />
      </div>
    </div>
  );
};
