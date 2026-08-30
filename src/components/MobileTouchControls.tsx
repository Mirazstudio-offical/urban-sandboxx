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
  AlertTriangle
} from 'lucide-react';

interface MobileTouchControlsProps {
  inputRef: React.MutableRefObject<InputState>;
  isInVehicle: boolean;
  onEnterExitVehicle: () => void;
  onResetVehicle: () => void;
  onOpenMap: () => void;
  onOpenSpawnMenu: () => void;
  onToggleConsole: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleHeadlights: () => void;
  onToggleSiren: () => void;
  activeCarName?: string;
  speedKmh?: number;
  activeTurnSignal?: 'none' | 'left' | 'right' | 'hazard';
  onToggleTurnSignal?: (signal: 'left' | 'right' | 'hazard') => void;
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
  onEnterExitVehicle,
  onResetVehicle,
  onOpenMap,
  onOpenSpawnMenu,
  onToggleConsole,
  onZoomIn,
  onZoomOut,
  onToggleHeadlights,
  onToggleSiren,
  activeCarName,
  speedKmh = 0,
  activeTurnSignal = 'none',
  onToggleTurnSignal,
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
    <div id="mobile-touch-overlay" className="fixed inset-0 pointer-events-none z-30 select-none overflow-hidden touch-none">
      
      {/* TOP FLOATING TOUCH TOOLBAR */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto z-40">
        {/* Left Toolbar: Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenMap}
            className="h-10 px-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl text-sky-400 active:bg-sky-600 active:text-white flex items-center gap-1.5 shadow-lg font-bold text-xs transition-all"
          >
            <Navigation className="w-4 h-4" />
            <span>Карта</span>
          </button>

          <button
            type="button"
            onClick={onOpenSpawnMenu}
            className="h-10 px-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl text-emerald-400 active:bg-emerald-600 active:text-white flex items-center gap-1.5 shadow-lg font-bold text-xs transition-all"
          >
            <MapPin className="w-4 h-4" />
            <span className="hidden xs:inline">Спавн</span>
          </button>

          <button
            type="button"
            onClick={onResetVehicle}
            className="h-10 w-10 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl text-amber-400 active:bg-amber-600 active:text-white flex items-center justify-center shadow-lg transition-all"
            title="Перевернуть / Сбросить авто"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Right Toolbar: Zoom & Options */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-0.5 shadow-lg">
            <button
              type="button"
              onClick={onZoomIn}
              className="w-9 h-9 flex items-center justify-center text-slate-200 active:bg-slate-700 rounded-lg transition-all"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-[1px] bg-slate-800 my-1" />
            <button
              type="button"
              onClick={onZoomOut}
              className="w-9 h-9 flex items-center justify-center text-slate-200 active:bg-slate-700 rounded-lg transition-all"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleConsole}
            className="h-10 w-10 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl text-purple-400 active:bg-purple-600 active:text-white flex items-center justify-center shadow-lg transition-all"
          >
            <Zap className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* LEFT BOTTOM ZONE: STEERING BUTTONS (IN CAR) OR VIRTUAL JOYSTICK (ON FOOT) */}
      {isInVehicle ? (
        <>
          {/* TURN SIGNAL / INDICATORS BAR ABOVE STEERING */}
          <div id="touch-turn-signals" className="absolute bottom-[124px] left-5 pointer-events-auto flex items-center gap-2.5 z-40">
            <button
              type="button"
              onClick={() => { triggerHaptic(12); onToggleTurnSignal?.('left'); }}
              className={`w-11 h-11 backdrop-blur-md border-2 rounded-xl flex items-center justify-center shadow-lg transition-all ${
                activeTurnSignal === 'left'
                  ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold scale-95 animate-pulse'
                  : 'bg-slate-900/95 text-amber-400 border-amber-500/40 hover:border-amber-400'
              }`}
            >
              <ChevronLeft className="w-6 h-6 stroke-[3]" />
            </button>
            
            <button
              type="button"
              onClick={() => { triggerHaptic(15); onToggleTurnSignal?.('hazard'); }}
              className={`w-11 h-11 backdrop-blur-md border-2 rounded-xl flex items-center justify-center shadow-lg transition-all ${
                activeTurnSignal === 'hazard'
                  ? 'bg-red-600 text-white border-red-400 font-bold scale-95 animate-pulse'
                  : 'bg-slate-900/95 text-red-500 border-red-500/40 hover:border-red-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => { triggerHaptic(12); onToggleTurnSignal?.('right'); }}
              className={`w-11 h-11 backdrop-blur-md border-2 rounded-xl flex items-center justify-center shadow-lg transition-all ${
                activeTurnSignal === 'right'
                  ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold scale-95 animate-pulse'
                  : 'bg-slate-900/95 text-amber-400 border-amber-500/40 hover:border-amber-400'
              }`}
            >
              <ChevronRight className="w-6 h-6 stroke-[3]" />
            </button>
          </div>

          /* IN VEHICLE: ERGONOMIC STEERING ARROWS (LEFT & RIGHT) */
          <div id="touch-steering-zone" className="absolute bottom-5 left-5 pointer-events-auto flex items-center gap-3 z-40 touch-none">
            <TouchButton
              inputKey="left"
              inputRef={inputRef}
              hapticMs={15}
              className="w-24 h-24 bg-slate-900/90 backdrop-blur-md border-2 border-sky-500/80 text-sky-300 rounded-2xl flex flex-col items-center justify-center shadow-2xl"
              activeClassName="ring-4 ring-sky-400/50 bg-sky-600 text-white"
            >
              <ChevronLeft className="w-10 h-10 -ml-1 stroke-[2.5]" />
              <span className="text-xs font-black uppercase tracking-wider">ЛЕВО</span>
            </TouchButton>

            <TouchButton
              inputKey="right"
              inputRef={inputRef}
              hapticMs={15}
              className="w-24 h-24 bg-slate-900/90 backdrop-blur-md border-2 border-sky-500/80 text-sky-300 rounded-2xl flex flex-col items-center justify-center shadow-2xl"
              activeClassName="ring-4 ring-sky-400/50 bg-sky-600 text-white"
            >
              <ChevronRight className="w-10 h-10 -mr-1 stroke-[2.5]" />
              <span className="text-xs font-black uppercase tracking-wider">ПРАВО</span>
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
              className="absolute -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-sky-400/80 bg-slate-950/70 backdrop-blur-md flex items-center justify-center shadow-2xl pointer-events-none"
              style={{ left: joystickCenter.x, top: joystickCenter.y }}
            >
              <div
                className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-500 to-cyan-400 border border-sky-200 shadow-lg shadow-sky-500/50 transition-transform duration-75"
                style={{
                  transform: `translate(${joystickKnob.x}px, ${joystickKnob.y}px)`,
                }}
              />
            </div>
          ) : (
            <div className="absolute bottom-10 left-10 w-24 h-24 rounded-full border border-slate-700/60 bg-slate-900/30 flex items-center justify-center pointer-events-none opacity-40">
              <div className="w-8 h-8 rounded-full bg-slate-700/60" />
              <span className="absolute bottom-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Джойстик</span>
            </div>
          )}
        </div>
      )}

      {/* RIGHT BOTTOM ZONE: ERGONOMIC ACTION BUTTONS */}
      <div id="touch-actions-zone" className="absolute bottom-4 right-4 pointer-events-auto flex flex-col items-end gap-3 z-40 touch-none">
        
        {/* TOP ROW OF AUXILIARY ACTIONS (SIREN / LIGHTS / HORN / ENTER-EXIT) */}
        <div className="flex items-center gap-2.5">
          {isInVehicle && (
            <>
              <button
                type="button"
                onClick={onToggleSiren}
                className="w-11 h-11 bg-slate-900/90 border border-rose-500/60 text-rose-400 active:bg-rose-600 active:text-white rounded-xl flex items-center justify-center shadow-lg font-bold transition-all"
              >
                <ShieldAlert className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={onToggleHeadlights}
                className="w-11 h-11 bg-slate-900/90 border border-amber-500/60 text-amber-400 active:bg-amber-600 active:text-white rounded-xl flex items-center justify-center shadow-lg font-bold transition-all"
              >
                <Lightbulb className="w-5 h-5" />
              </button>

              <TouchButton
                inputKey="hornH"
                inputRef={inputRef}
                hapticMs={15}
                className="w-11 h-11 bg-slate-900/90 border border-slate-700 text-slate-200 rounded-xl flex items-center justify-center shadow-lg font-bold"
                activeClassName="bg-sky-600 text-white"
              >
                <Volume2 className="w-5 h-5" />
              </TouchButton>
            </>
          )}

          {/* VEHICLE ENTER / EXIT (F) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              onEnterExitVehicle();
            }}
            className={`h-12 px-4 rounded-2xl flex items-center gap-2 font-extrabold text-xs shadow-2xl border transition-all ${
              isInVehicle
                ? 'bg-gradient-to-r from-rose-600 to-red-500 text-white border-rose-400 active:scale-95'
                : 'bg-gradient-to-r from-sky-500 to-blue-600 text-white border-sky-300 active:scale-95'
            }`}
          >
            <Car className="w-5 h-5" />
            <span>{isInVehicle ? 'ВЫЙТИ' : 'СЕСТЬ В АВТО'}</span>
          </button>
        </div>

        {/* PRIMARY CONTROLS BLOCK */}
        {isInVehicle ? (
          /* VEHICLE DRIVING PEDALS & HANDBRAKE */
          <div className="flex items-end gap-2.5">
            {/* DRIFT / HANDBRAKE */}
            <TouchButton
              inputKey="handbrake"
              inputRef={inputRef}
              hapticMs={20}
              className="w-16 h-16 bg-gradient-to-tr from-amber-600 to-yellow-500 border-2 border-amber-300 text-slate-950 rounded-2xl flex flex-col items-center justify-center shadow-xl font-black text-xs leading-none"
              activeClassName="ring-4 ring-amber-300/60"
            >
              <Flame className="w-5 h-5 mb-0.5 text-slate-950" />
              <span>ДРИФТ</span>
            </TouchButton>

            {/* BRAKE / REVERSE PEDAL */}
            <TouchButton
              inputKey="backward"
              inputRef={inputRef}
              hapticMs={15}
              className="w-18 h-24 bg-gradient-to-b from-rose-600 to-red-700 border-2 border-rose-400 text-white rounded-2xl flex flex-col items-center justify-center shadow-2xl"
              activeClassName="ring-4 ring-rose-400/60"
            >
              <span className="text-sm font-black uppercase tracking-wider mb-1">ТОРМОЗ</span>
              <span className="text-[10px] text-rose-200 font-mono">НАЗАД</span>
            </TouchButton>

            {/* ACCELERATOR PEDAL (GAS) */}
            <TouchButton
              inputKey="forward"
              inputRef={inputRef}
              hapticMs={15}
              className="w-20 h-28 bg-gradient-to-b from-emerald-500 to-green-600 border-2 border-emerald-300 text-slate-950 rounded-2xl flex flex-col items-center justify-center shadow-2xl"
              activeClassName="ring-4 ring-emerald-300/60"
            >
              <span className="text-base font-black uppercase tracking-wider mb-1 text-slate-950">ГАЗ</span>
              <span className="text-[10px] text-slate-900 font-bold font-mono">ВПЕРЕД</span>
            </TouchButton>
          </div>
        ) : (
          /* PEDESTRIAN ACTION BUTTONS */
          <div className="flex items-end gap-3">
            {/* DODGE ROLL / QUICK DASH (SPACE) */}
            <TouchButton
              inputKey="handbrake"
              inputRef={inputRef}
              hapticMs={20}
              className="w-18 h-18 bg-gradient-to-tr from-emerald-600 to-teal-500 border-2 border-emerald-300 text-white rounded-2xl flex flex-col items-center justify-center shadow-xl font-black text-xs leading-none"
              activeClassName="ring-4 ring-emerald-300/60"
            >
              <RotateCcw className="w-6 h-6 mb-1 text-emerald-100" />
              <span>РЫВОК</span>
            </TouchButton>

            {/* SPRINT BUTTON (SHIFT) */}
            <TouchButton
              inputKey="sprint"
              inputRef={inputRef}
              hapticMs={20}
              className="w-22 h-22 bg-gradient-to-tr from-amber-500 to-orange-600 border-2 border-amber-300 text-slate-950 rounded-2xl flex flex-col items-center justify-center shadow-2xl font-black text-sm leading-none"
              activeClassName="ring-4 ring-amber-300/60"
            >
              <Zap className="w-7 h-7 mb-1 text-slate-950" />
              <span>БЕГ</span>
            </TouchButton>
          </div>
        )}
      </div>

    </div>
  );
};

