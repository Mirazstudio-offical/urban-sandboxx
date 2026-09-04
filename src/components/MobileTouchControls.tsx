import React, { useEffect, useRef, useState } from 'react';
import { InputState } from '../types';
import { 
  ArrowLeft,
  ArrowRight,
  Car, 
  ChevronLeft,
  ChevronRight,
  Flame, 
  Lightbulb, 
  MapPin, 
  Navigation, 
  ShieldAlert, 
  Volume2, 
  ZoomIn, 
  ZoomOut,
  RotateCcw,
  Zap,
  AlertTriangle,
  Gauge,
  ChevronUp,
  ChevronDown,
  Power
} from 'lucide-react';

interface MobileTouchControlsProps {
  inputRef: React.MutableRefObject<InputState>;
  isInVehicle: boolean;
  isNearVehicle?: boolean;
  onEnterExitVehicle: () => void;
  onResetVehicle: () => void;
  onOpenMap: () => void;
  onOpenSpawnMenu: () => void;
  onToggleConsole: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onOpenRadialMenu?: () => void;
  activeCarName?: string;
  speedKmh?: number;
  activeTurnSignal?: 'none' | 'left' | 'right' | 'hazard';
  onToggleTurnSignal?: (signal: 'left' | 'right' | 'hazard') => void;
  gear?: string;
  transmissionType?: 'AUTO' | 'MANUAL';
  onSelectGear?: (gear: 'P' | 'R' | 'N' | 'D' | number | string) => void;
  onToggleEngine?: () => void;
  isEngineRunning?: boolean;
  onInteractE?: () => void;
  canInteractF?: boolean;
  canInteractE?: boolean;
}

const triggerHaptic = (ms: number = 10) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(ms);
    } catch (e) {
      // ignore
    }
  }
};

// Reusable Multi-Touch Button that supports pressing multiple controls simultaneously
interface TouchButtonProps {
  inputKey: keyof InputState;
  inputRef: React.MutableRefObject<InputState>;
  hapticMs?: number;
  className?: string;
  activeClassName?: string;
  children: React.ReactNode;
}

const TouchButton: React.FC<TouchButtonProps> = ({
  inputKey,
  inputRef,
  hapticMs = 12,
  className = '',
  activeClassName = '',
  children,
}) => {
  const [isPressed, setIsPressed] = useState<boolean>(false);
  const touchIds = useRef<Set<number>>(new Set());

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      touchIds.current.add(e.changedTouches[i].identifier);
    }
    // @ts-ignore
    inputRef.current[inputKey] = true;
    setIsPressed(true);
    triggerHaptic(hapticMs);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      touchIds.current.delete(e.changedTouches[i].identifier);
    }
    if (touchIds.current.size === 0) {
      // @ts-ignore
      inputRef.current[inputKey] = false;
      setIsPressed(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    // @ts-ignore
    inputRef.current[inputKey] = true;
    setIsPressed(true);
    triggerHaptic(hapticMs);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    // @ts-ignore
    inputRef.current[inputKey] = false;
    setIsPressed(false);
  };

  return (
    <button
      type="button"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`select-none touch-none transition-all duration-75 ${className} ${
        isPressed ? `scale-95 brightness-125 ${activeClassName}` : ''
      }`}
    >
      {children}
    </button>
  );
};

export const MobileTouchControls: React.FC<MobileTouchControlsProps> = ({
  inputRef,
  isInVehicle,
  isNearVehicle,
  onEnterExitVehicle,
  onResetVehicle,
  onOpenMap,
  onOpenSpawnMenu,
  onToggleConsole,
  onZoomIn,
  onZoomOut,
  onOpenRadialMenu,
  activeCarName,
  speedKmh = 0,
  activeTurnSignal = 'none',
  onToggleTurnSignal,
  gear = 'D',
  transmissionType = 'AUTO',
  onSelectGear,
  onToggleEngine,
  isEngineRunning = true,
  onInteractE,
  canInteractF = false,
  canInteractE = false,
}) => {
  // Joystick State (Used for Pedestrian Walking)
  const [joystickActive, setJoystickActive] = useState<boolean>(false);
  const [joystickCenter, setJoystickCenter] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joystickKnob, setJoystickKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const joystickTouchId = useRef<number | null>(null);

  // Joystick touch handlers
  const handleJoystickStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (joystickTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    joystickTouchId.current = touch.identifier;
    setJoystickCenter({ x, y });
    setJoystickKnob({ x: 0, y: 0 });
    setJoystickActive(true);
    triggerHaptic(12);
  };

  const handleJoystickMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (joystickTouchId.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId.current) {
        const rect = e.currentTarget.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;

        const rawDx = touchX - joystickCenter.x;
        const rawDy = touchY - joystickCenter.y;
        const dist = Math.hypot(rawDx, rawDy);
        const maxRadius = 45;

        const clampedDist = Math.min(dist, maxRadius);
        const angle = Math.atan2(rawDy, rawDx);

        const knobX = Math.cos(angle) * clampedDist;
        const knobY = Math.sin(angle) * clampedDist;

        setJoystickKnob({ x: knobX, y: knobY });

        // Normalize direction inputs (-1 to 1 threshold)
        const normX = knobX / maxRadius;
        const normY = knobY / maxRadius;
        const threshold = 0.28;

        inputRef.current.forward = normY < -threshold;
        inputRef.current.backward = normY > threshold;
        inputRef.current.left = normX < -threshold;
        inputRef.current.right = normX > threshold;
        break;
      }
    }
  };

  const handleJoystickEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (joystickTouchId.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId.current) {
        joystickTouchId.current = null;
        setJoystickActive(false);
        setJoystickKnob({ x: 0, y: 0 });

        inputRef.current.forward = false;
        inputRef.current.backward = false;
        inputRef.current.left = false;
        inputRef.current.right = false;
        break;
      }
    }
  };

  return (
    <div id="mobile-touch-overlay" className="fixed inset-0 pointer-events-none z-30 select-none overflow-hidden touch-none font-mono">
      
      {/* TOP FLOATING TOUCH TOOLBAR */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto z-40">
        {/* Left Toolbar is empty now to keep corners clean */}
        <div />

        {/* Right Toolbar: Zoom & Options */}
        <div className="flex items-center gap-1.5">
          <div className="flex bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-lg p-0.5 shadow-lg">
            <button
              type="button"
              onClick={onZoomIn}
              className="w-8 h-8 flex items-center justify-center text-slate-300 active:bg-slate-800 rounded transition-all"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] bg-slate-800 my-1" />
            <button
              type="button"
              onClick={onZoomOut}
              className="w-8 h-8 flex items-center justify-center text-slate-300 active:bg-slate-800 rounded transition-all"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleConsole}
            className="h-9 w-9 bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-lg text-slate-300 active:bg-slate-800 active:text-white flex items-center justify-center shadow-lg transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* LEFT SIDE ACTION BUTTONS (F & E) ALWAYS UNDER THE HUD-TOP-LEFT, ABOVE MOVEMENT */}
      <div className="absolute top-[84px] left-4 flex flex-col gap-3 pointer-events-auto z-50">
        {/* Unified F Button (Enter/Exit/Doors) */}
        <button
          type="button"
          disabled={!canInteractF}
          onClick={() => {
            triggerHaptic(20);
            onEnterExitVehicle();
          }}
          className={`w-14 h-14 rounded-full border flex flex-col items-center justify-center shadow-2xl transition-all active:scale-90 ${
            canInteractF
              ? 'bg-[#ccff00] text-black border-[#ccff00] shadow-[0_0_15px_rgba(204,255,0,0.5)] font-black scale-100'
              : 'bg-slate-950/40 text-slate-600 border-slate-800/60 opacity-30 cursor-not-allowed'
          }`}
          title="Действие F (Вход/Выход)"
        >
          <span className="text-base font-black tracking-tighter leading-none">F</span>
          <span className="text-[9px] font-bold text-black uppercase mt-0.5">Вход/Выход</span>
        </button>

        {/* Unified E Button (Use/Interact/Pickup/Shop) */}
        <button
          type="button"
          disabled={!canInteractE}
          onPointerDown={() => {
            triggerHaptic(15);
            inputRef.current.actionE = true;
            onInteractE?.();
          }}
          onPointerUp={() => {
            inputRef.current.actionE = false;
          }}
          onPointerCancel={() => {
            inputRef.current.actionE = false;
          }}
          className={`w-14 h-14 rounded-full border flex flex-col items-center justify-center shadow-2xl transition-all active:scale-90 ${
            canInteractE
              ? 'bg-sky-500 text-white border-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.5)] font-black scale-100'
              : 'bg-slate-950/40 text-slate-600 border-slate-800/60 opacity-30 cursor-not-allowed'
          }`}
          title="Действие E (Взаимодействие)"
        >
          <span className="text-base font-black tracking-tighter leading-none">E</span>
          <span className="text-[9px] font-bold text-sky-100 uppercase mt-0.5">Применить</span>
        </button>
      </div>

      {/* LEFT BOTTOM ZONE: STEERING BUTTONS (IN CAR) OR VIRTUAL JOYSTICK (ON FOOT) */}
      {isInVehicle ? (
        <>
          {/* TURN SIGNAL / INDICATORS BAR ABOVE STEERING */}
          <div id="touch-turn-signals" className="absolute bottom-[112px] left-4 pointer-events-auto flex items-center gap-2 z-40">
            <button
              type="button"
              onClick={() => { triggerHaptic(12); onToggleTurnSignal?.('left'); }}
              className={`w-10 h-10 backdrop-blur-md border rounded-lg flex items-center justify-center shadow-lg transition-all ${
                activeTurnSignal === 'left'
                  ? 'bg-slate-200 text-slate-950 border-white font-bold scale-95'
                  : 'bg-slate-950/95 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            
            <button
              type="button"
              onClick={() => { triggerHaptic(15); onToggleTurnSignal?.('hazard'); }}
              className={`w-10 h-10 backdrop-blur-md border rounded-lg flex items-center justify-center shadow-lg transition-all ${
                activeTurnSignal === 'hazard'
                  ? 'bg-rose-950 text-rose-300 border-rose-600 font-bold scale-95'
                  : 'bg-slate-950/95 text-slate-400 border-slate-700 hover:border-slate-500'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => { triggerHaptic(12); onToggleTurnSignal?.('right'); }}
              className={`w-10 h-10 backdrop-blur-md border rounded-lg flex items-center justify-center shadow-lg transition-all ${
                activeTurnSignal === 'right'
                  ? 'bg-slate-200 text-slate-950 border-white font-bold scale-95'
                  : 'bg-slate-950/95 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
            >
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* IN VEHICLE: ERGONOMIC STEERING ARROWS (LEFT & RIGHT) */}
          <div id="touch-steering-zone" className="absolute bottom-4 left-4 pointer-events-auto flex items-center gap-2.5 z-40 touch-none">
            <TouchButton
              inputKey="left"
              inputRef={inputRef}
              hapticMs={15}
              className="w-20 h-20 bg-slate-950/95 backdrop-blur-md border border-slate-700 text-slate-200 rounded-xl flex flex-col items-center justify-center shadow-2xl"
              activeClassName="bg-slate-800 text-white border-slate-500"
            >
              <ChevronLeft className="w-8 h-8 -ml-0.5 stroke-[2]" />
              <span className="text-[10px] font-bold tracking-widest text-slate-400">ЛЕВО</span>
            </TouchButton>

            <TouchButton
              inputKey="right"
              inputRef={inputRef}
              hapticMs={15}
              className="w-20 h-20 bg-slate-950/95 backdrop-blur-md border border-slate-700 text-slate-200 rounded-xl flex flex-col items-center justify-center shadow-2xl"
              activeClassName="bg-slate-800 text-white border-slate-500"
            >
              <ChevronRight className="w-8 h-8 -mr-0.5 stroke-[2]" />
              <span className="text-[10px] font-bold tracking-widest text-slate-400">ПРАВО</span>
            </TouchButton>
          </div>
        </>
      ) : (
        /* ON FOOT: VIRTUAL ANALOG JOYSTICK */
        <div
          id="touch-joystick-zone"
          className="absolute bottom-0 left-0 w-1/2 h-3/5 pointer-events-auto touch-none"
          onTouchStart={handleJoystickStart}
          onTouchMove={handleJoystickMove}
          onTouchEnd={handleJoystickEnd}
          onTouchCancel={handleJoystickEnd}
        >
          {joystickActive ? (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-slate-600 bg-slate-950/80 backdrop-blur-md flex items-center justify-center shadow-2xl pointer-events-none"
              style={{ left: joystickCenter.x, top: joystickCenter.y }}
            >
              <div
                className="w-12 h-12 rounded-full bg-slate-800 border border-slate-600 shadow-lg transition-transform duration-75"
                style={{
                  transform: `translate(${joystickKnob.x}px, ${joystickKnob.y}px)`,
                }}
              />
            </div>
          ) : (
            <div className="absolute bottom-8 left-8 w-20 h-20 rounded-full border border-slate-800 bg-slate-950/40 flex items-center justify-center pointer-events-none opacity-40">
              <div className="w-6 h-6 rounded-full bg-slate-800" />
              <span className="absolute bottom-1 text-[9px] text-slate-500 font-bold uppercase tracking-wider">Движение</span>
            </div>
          )}
        </div>
      )}

      {/* RIGHT BOTTOM ZONE: ERGONOMIC ACTION BUTTONS */}
      <div id="touch-actions-zone" className="absolute bottom-4 right-4 pointer-events-auto flex flex-col items-end gap-2.5 z-40 touch-none">
        
        {/* TOP ROW OF AUXILIARY ACTIONS (SIREN / LIGHTS / HORN / ENTER-EXIT) */}
        <div className="flex items-center gap-2">
          {isInVehicle && (
            <>
              <button
                type="button"
                onClick={() => { triggerHaptic(15); onOpenRadialMenu?.(); }}
                className="px-3 h-10 bg-slate-950/95 border border-slate-700 text-slate-300 active:bg-slate-800 active:text-white rounded-lg flex items-center justify-center gap-1.5 shadow-lg font-bold transition-all text-xs"
                title="Приборы"
              >
                <Gauge className="w-4 h-4 text-emerald-400" />
                <span>МЕНЮ</span>
              </button>

              <TouchButton
                inputKey="hornH"
                inputRef={inputRef}
                hapticMs={15}
                className="w-10 h-10 bg-slate-950/95 border border-slate-700 text-slate-300 rounded-lg flex items-center justify-center shadow-lg font-bold"
                activeClassName="bg-slate-800 text-white"
              >
                <Volume2 className="w-4 h-4 text-slate-400" />
              </TouchButton>
            </>
          )}

          {/* ENGINE IGNITION (START / STOP) */}
          {isInVehicle && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                onToggleEngine?.();
              }}
              className={`h-10 px-3 rounded-lg flex items-center gap-1.5 font-bold text-xs shadow-xl border transition-all active:scale-95 ${
                isEngineRunning
                  ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : 'bg-rose-950/90 border-rose-600 text-rose-300 animate-pulse'
              }`}
              title="Запустить/заглушить двигатель"
            >
              <Power className="w-4 h-4" />
              <span>{isEngineRunning ? 'МОТОР' : 'СТАРТ'}</span>
            </button>
          )}


        </div>

        {/* PRIMARY CONTROLS BLOCK */}
        {isInVehicle ? (
          /* VEHICLE DRIVING PEDALS & HANDBRAKE */
          <div className="flex items-end gap-1.5 sm:gap-2">
            {/* PRND OR MANUAL GEAR SELECTOR */}
            {transmissionType === 'AUTO' ? (
              <div className="flex flex-col gap-1 mr-1 mb-0.5">
                {(['P', 'R', 'N', 'D'] as const).map((mode) => {
                  const isSelected = (gear || 'D').toUpperCase().startsWith(mode);
                  const colorClass = {
                    P: isSelected ? 'bg-red-600 text-white font-black shadow-[0_0_10px_rgba(239,68,68,0.7)] border-red-400' : 'bg-slate-950/90 text-slate-400 border-slate-700 active:bg-slate-800',
                    R: isSelected ? 'bg-amber-500 text-black font-black shadow-[0_0_10px_rgba(245,158,11,0.7)] border-amber-300' : 'bg-slate-950/90 text-slate-400 border-slate-700 active:bg-slate-800',
                    N: isSelected ? 'bg-slate-200 text-slate-950 font-black shadow-[0_0_8px_rgba(255,255,255,0.6)] border-slate-300' : 'bg-slate-950/90 text-slate-400 border-slate-700 active:bg-slate-800',
                    D: isSelected ? 'bg-sky-500 text-white font-black shadow-[0_0_10px_rgba(14,165,233,0.7)] border-sky-300' : 'bg-slate-950/90 text-slate-400 border-slate-700 active:bg-slate-800',
                  }[mode];

                  return (
                    <button
                      key={mode}
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        triggerHaptic(20);
                        onSelectGear?.(mode);
                      }}
                      className={`w-10 h-8 rounded-lg border flex items-center justify-center text-xs font-mono font-bold transition-all active:scale-95 ${colorClass}`}
                      title={`Режим ${mode}`}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 mr-1 mb-1">
                <TouchButton
                  inputKey="shiftUp"
                  inputRef={inputRef}
                  hapticMs={15}
                  className="w-12 h-10 bg-slate-950/95 border border-slate-700 text-slate-300 rounded-lg flex items-center justify-center shadow-xl active:bg-slate-800"
                  activeClassName="bg-slate-800 text-white border-slate-500"
                >
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                </TouchButton>
                <div className="text-center font-mono text-[11px] font-bold text-sky-400">
                  {gear || '1'}
                </div>
                <TouchButton
                  inputKey="shiftDown"
                  inputRef={inputRef}
                  hapticMs={15}
                  className="w-12 h-10 bg-slate-950/95 border border-slate-700 text-slate-300 rounded-lg flex items-center justify-center shadow-xl active:bg-slate-800"
                  activeClassName="bg-slate-800 text-white border-slate-500"
                >
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                </TouchButton>
              </div>
            )}

            {/* DRIFT / HANDBRAKE */}
            <TouchButton
              inputKey="handbrake"
              inputRef={inputRef}
              hapticMs={20}
              className="w-13 h-14 bg-slate-950/95 border border-slate-700 text-slate-300 rounded-xl flex flex-col items-center justify-center shadow-xl font-bold text-[9px] leading-tight"
              activeClassName="bg-slate-800 text-white border-slate-500"
            >
              <Flame className="w-4 h-4 mb-0.5 text-slate-400" />
              <span>РУЧНИК</span>
            </TouchButton>

            {/* BRAKE PEDAL */}
            <TouchButton
              inputKey="backward"
              inputRef={inputRef}
              hapticMs={15}
              className="w-16 h-22 bg-slate-950/95 border border-slate-700 text-slate-200 rounded-xl flex flex-col items-center justify-center shadow-2xl"
              activeClassName="bg-slate-800 text-white border-slate-500"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider mb-1 text-slate-300">СТОП</span>
              <span className="text-[9px] text-slate-400 font-mono">ТОРМОЗ</span>
            </TouchButton>

            {/* ACCELERATOR PEDAL (GAS) */}
            <TouchButton
              inputKey="forward"
              inputRef={inputRef}
              hapticMs={15}
              className="w-18 h-26 bg-slate-950/95 border border-slate-600 text-slate-100 rounded-xl flex flex-col items-center justify-center shadow-2xl"
              activeClassName="bg-slate-800 text-white border-slate-400"
            >
              <span className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-200">ГАЗ</span>
              <span className="text-[9px] text-slate-400 font-mono">
                {gear === 'R' ? 'НАЗАД' : gear === 'P' || gear === 'N' ? 'ОБОРОТЫ' : 'ВПЕРЕД'}
              </span>
            </TouchButton>
          </div>
        ) : (
          /* PEDESTRIAN ACTION BUTTONS */
          <div className="flex items-end gap-2.5">
            {/* DODGE ROLL / QUICK DASH (SPACE) */}
            <TouchButton
              inputKey="handbrake"
              inputRef={inputRef}
              hapticMs={20}
              className="w-16 h-16 bg-slate-950/95 border border-slate-700 text-slate-300 rounded-xl flex flex-col items-center justify-center shadow-xl font-bold text-[10px] leading-tight"
              activeClassName="bg-slate-800 text-white border-slate-500"
            >
              <RotateCcw className="w-4 h-4 mb-0.5 text-slate-400" />
              <span>РЫВОК</span>
            </TouchButton>

            {/* SPRINT BUTTON (SHIFT) */}
            <TouchButton
              inputKey="sprint"
              inputRef={inputRef}
              hapticMs={20}
              className="w-20 h-20 bg-slate-950/95 border border-slate-700 text-slate-200 rounded-xl flex flex-col items-center justify-center shadow-2xl font-bold text-xs leading-tight"
              activeClassName="bg-slate-800 text-white border-slate-500"
            >
              <Zap className="w-5 h-5 mb-0.5 text-slate-400" />
              <span>БЕГ</span>
            </TouchButton>
          </div>
        )}
      </div>

    </div>
  );
};

