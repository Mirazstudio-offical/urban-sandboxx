import React, { useEffect, useRef, useState } from 'react';
import { InputState } from '../types';
import { sound } from '../audio';
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

/* Premium Compact Luxury Gear Stick Lever for Mobile Controls */
interface GearStickLeverProps {
  gear?: string;
  transmissionType?: 'AUTO' | 'MANUAL';
  onSelectGear?: (gear: 'P' | 'R' | 'N' | 'D' | number | string) => void;
}

const GearStickLever: React.FC<GearStickLeverProps> = ({
  gear = 'D',
  transmissionType = 'AUTO',
  onSelectGear,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragY, setDragY] = useState<number>(0);
  const [dragX, setDragX] = useState<number>(0);
  const touchIdRef = useRef<number | null>(null);

  const isAuto = transmissionType === 'AUTO';
  const rawGearStr = String(gear || (isAuto ? 'D' : '1')).toUpperCase();

  let currentGearKey = isAuto ? 'D' : '1';
  if (isAuto) {
    if (rawGearStr.startsWith('P')) currentGearKey = 'P';
    else if (rawGearStr.startsWith('R')) currentGearKey = 'R';
    else if (rawGearStr.startsWith('N')) currentGearKey = 'N';
    else currentGearKey = 'D';
  } else {
    if (rawGearStr === 'R' || rawGearStr === '-1') currentGearKey = 'R';
    else if (rawGearStr === 'N' || rawGearStr === '0') currentGearKey = 'N';
    else if (['1', '2', '3', '4', '5'].includes(rawGearStr)) currentGearKey = rawGearStr;
    else currentGearKey = '1';
  }

  const activeGearRef = useRef<string>(currentGearKey);

  // Discrete notch offsets along Y-axis for Automatic (strictly dx = 0)
  const AUTO_NOTCHES: Record<string, number> = {
    P: -32,
    R: -11,
    N: 11,
    D: 32,
  };

  // Discrete notch offsets for Manual (1, 2, 3, 4, 5, R, N)
  const MANUAL_NOTCHES: Record<string, { x: number; y: number }> = {
    '1': { x: -20, y: -24 },
    '2': { x: -20, y: 24 },
    '3': { x: 0, y: -24 },
    '4': { x: 0, y: 24 },
    '5': { x: 20, y: -24 },
    'R': { x: 20, y: 24 },
    'N': { x: 0, y: 0 },
  };

  const restingOffset = isAuto
    ? { x: 0, y: AUTO_NOTCHES[currentGearKey] ?? 32 }
    : (MANUAL_NOTCHES[currentGearKey] ?? { x: 0, y: 0 });

  const currentOffset = isDragging
    ? { x: isAuto ? 0 : dragX, y: dragY }
    : restingOffset;

  // Process touch / drag movement
  const processMove = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const centerX = rect.left + rect.width / 2;

    const rawDY = clientY - centerY;
    const rawDX = clientX - centerX;

    if (isAuto) {
      // AUTOMATIC: STRICTLY ZERO SIDEWAYS DRIFT (dx = 0)
      // Step through discrete notch positions with mechanical clicks
      let detectedNotch = 'D';
      if (rawDY < -21) detectedNotch = 'P';
      else if (rawDY < 0) detectedNotch = 'R';
      else if (rawDY < 21) detectedNotch = 'N';
      else detectedNotch = 'D';

      setDragX(0);
      setDragY(AUTO_NOTCHES[detectedNotch]);

      if (detectedNotch !== activeGearRef.current) {
        activeGearRef.current = detectedNotch;
        triggerHaptic(25);
        sound.playGearShift();
        onSelectGear?.(detectedNotch);
      }
    } else {
      // MANUAL: H-GATE GUIDED MOVEMENT
      let clampedX = Math.max(-22, Math.min(22, rawDX));
      let clampedY = Math.max(-26, Math.min(26, rawDY));

      if (Math.abs(clampedY) > 8) {
        if (clampedX < -10) clampedX = -20;
        else if (clampedX > 10) clampedX = 20;
        else clampedX = 0;
      }

      setDragX(clampedX);
      setDragY(clampedY);

      let detectedNotch = 'N';
      if (Math.hypot(clampedX, clampedY) < 10) {
        detectedNotch = 'N';
      } else if (clampedX < -10) {
        detectedNotch = clampedY < 0 ? '1' : '2';
      } else if (clampedX > 10) {
        detectedNotch = clampedY < 0 ? '5' : 'R';
      } else {
        detectedNotch = clampedY < 0 ? '3' : '4';
      }

      if (detectedNotch !== activeGearRef.current) {
        activeGearRef.current = detectedNotch;
        triggerHaptic(22);
        sound.playGearShift();
        if (onSelectGear) {
          if (detectedNotch === 'R') onSelectGear('R');
          else if (detectedNotch === 'N') onSelectGear('N');
          else onSelectGear(Number(detectedNotch));
        }
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setIsDragging(true);
    triggerHaptic(15);
    processMove(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        processMove(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setIsDragging(false);
        triggerHaptic(10);
        break;
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    triggerHaptic(15);
    processMove(e.clientX, e.clientY);

    const handleMouseMove = (me: MouseEvent) => {
      processMove(me.clientX, me.clientY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      triggerHaptic(10);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Dimensions for compact luxury console
  const boxW = 84;
  const boxH = 120;
  const cx = boxW / 2;
  const cy = boxH / 2;

  const knobX = cx + currentOffset.x;
  const knobY = cy + currentOffset.y;

  const tiltY = (-currentOffset.y / 32) * 28;
  const tiltX = (currentOffset.x / 22) * 22;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      className="relative w-[72px] h-[110px] bg-transparent select-none touch-none flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing shrink-0 my-auto"
      title="Ручка КПП (переключайте режимы свайпом)"
    >
      {/* AUTOMATIC OR MANUAL FLOATING GUIDE SLOTS */}
      {isAuto ? (
        /* AUTOMATIC VERTICAL GUIDE LINE & SUBTLE LED DOTS */
        <div className="absolute inset-y-3 w-0.5 bg-slate-800/60 rounded-full flex flex-col justify-between items-center py-1.5 pointer-events-none">
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${currentGearKey === 'P' ? 'bg-red-500 shadow-[0_0_8px_#ef4444] scale-125' : 'bg-slate-700/60'}`} />
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${currentGearKey === 'R' ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b] scale-125' : 'bg-slate-700/60'}`} />
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${currentGearKey === 'N' ? 'bg-slate-200 shadow-[0_0_8px_#ffffff] scale-125' : 'bg-slate-700/60'}`} />
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${currentGearKey === 'D' ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8] scale-125' : 'bg-slate-700/60'}`} />
        </div>
      ) : (
        /* MANUAL SUBTLE H-GATE GUIDE LINES */
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
          <line x1={cx - 20} y1={cy - 24} x2={cx - 20} y2={cy + 24} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
          <line x1={cx} y1={cy - 24} x2={cx} y2={cy + 24} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
          <line x1={cx + 20} y1={cy - 24} x2={cx + 20} y2={cy + 24} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
          <line x1={cx - 20} y1={cy} x2={cx + 20} y2={cy} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
        </svg>
      )}

      {/* METALLIC SHAFT & ROUND LEATHER BASE GAITER COLLAR */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
        <defs>
          <linearGradient id="chromeShaft_v2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="35%" stopColor="#ffffff" />
            <stop offset="65%" stopColor="#475569" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <radialGradient id="gaiterShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#020617" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Circular Leather Gaiter Base Collar */}
        <ellipse cx={cx} cy={cy} rx={18} ry={12} fill="url(#gaiterShadow)" stroke="#334155" strokeWidth="1.2" />
        <ellipse cx={cx} cy={cy} rx={12} ry={8} fill="#0f172a" stroke="#1e293b" strokeWidth="1" />

        {/* Solid Chrome Rod from Pivot (cx, cy) to Knob Base (knobX, knobY) */}
        <line
          x1={cx}
          y1={cy}
          x2={knobX}
          y2={knobY}
          stroke="url(#chromeShaft_v2)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <line
          x1={cx}
          y1={cy}
          x2={knobX}
          y2={knobY}
          stroke="#ffffff"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.9"
        />
      </svg>

      {/* REALISTIC LUXURY SHIFT KNOB / HANDLE WITH ENGRAVED DIAGRAM */}
      <div
        className="absolute z-20 pointer-events-none"
        style={{
          left: `${knobX}px`,
          top: `${knobY}px`,
          transform: `translate(-50%, -50%) perspective(260px) rotateX(${tiltY}deg) rotateY(${tiltX}deg)`,
          transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.25), left 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.25), top 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.25)',
        }}
      >
        {/* Ergonomic Leather Shift Knob Body */}
        <div className="w-13 h-13 rounded-full bg-slate-950 border-2 border-slate-400 shadow-[0_8px_22px_rgba(0,0,0,0.95)] flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-black">
          
          {/* Perforated Leather Grip Texture & Stitching Details */}
          <div className="absolute inset-0 rounded-full opacity-40 bg-[radial-gradient(#ffffff_0.8px,transparent_0.8px)] [background-size:5px_5px] pointer-events-none" />
          <div className="absolute inset-0.5 rounded-full border border-dashed border-slate-500/50 pointer-events-none" />

          {/* Brushed Chrome / Metallic Top Cap Insert */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-b from-slate-200 via-slate-400 to-slate-800 p-0.5 border border-slate-300 shadow-md flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden p-0.5">
              
              {/* ENGRAVED GEAR SHIFT DIAGRAM ON TOP OF KNOB */}
              {isAuto ? (
                /* AUTOMATIC: VERTICAL ENGRAVED PRND SCHEMA ON KNOB CAP */
                <div className="flex flex-col items-center justify-center leading-none tracking-tighter font-mono text-[8px] font-black py-0.5">
                  <span className={currentGearKey === 'P' ? 'text-red-500 scale-125 font-black drop-shadow-[0_0_4px_#ef4444]' : 'text-slate-500'}>P</span>
                  <span className={currentGearKey === 'R' ? 'text-amber-400 scale-125 font-black drop-shadow-[0_0_4px_#f59e0b]' : 'text-slate-500'}>R</span>
                  <span className={currentGearKey === 'N' ? 'text-slate-100 scale-125 font-black drop-shadow-[0_0_4px_#ffffff]' : 'text-slate-500'}>N</span>
                  <span className={currentGearKey === 'D' ? 'text-sky-400 scale-125 font-black drop-shadow-[0_0_4px_#38bdf8]' : 'text-slate-500'}>D</span>
                </div>
              ) : (
                /* MANUAL: ETCHED H-PATTERN SHIFT DIAGRAM ON KNOB CAP */
                <div className="flex flex-col items-center justify-center w-full h-full text-[7px] font-mono font-black text-slate-400 leading-none py-0.5">
                  <div className="flex justify-between w-full px-1">
                    <span className={currentGearKey === '1' ? 'text-sky-400 font-black scale-125' : ''}>1</span>
                    <span className={currentGearKey === '3' ? 'text-sky-400 font-black scale-125' : ''}>3</span>
                    <span className={currentGearKey === '5' ? 'text-sky-400 font-black scale-125' : ''}>5</span>
                  </div>
                  <div className="w-full my-[1px] flex items-center justify-center">
                    <div className="w-5 h-[1px] bg-slate-500/80" />
                  </div>
                  <div className="flex justify-between w-full px-1">
                    <span className={currentGearKey === '2' ? 'text-sky-400 font-black scale-125' : ''}>2</span>
                    <span className={currentGearKey === '4' ? 'text-sky-400 font-black scale-125' : ''}>4</span>
                    <span className={currentGearKey === 'R' ? 'text-amber-400 font-black scale-125' : ''}>R</span>
                  </div>
                </div>
              )}

              {/* Glossy Curved Glass Lens Reflection */}
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent rounded-t-full pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </div>
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
      
      {/* LEFT SIDE ACTION BUTTONS (F & E) SAFELY BELOW TOP-LEFT HUD */}
      <div className="absolute top-[60px] left-3 flex flex-col gap-2 pointer-events-auto z-30">
        {/* Unified F Button (Enter/Exit/Doors) */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(20);
            onEnterExitVehicle();
          }}
          className={`w-12 h-12 rounded-2xl border flex flex-col items-center justify-center shadow-xl transition-all active:scale-90 cursor-pointer ${
            canInteractF
              ? 'bg-[#ccff00] text-black border-[#ccff00] shadow-[0_0_15px_rgba(204,255,0,0.4)] font-black'
              : 'bg-slate-900/80 text-slate-400 border-slate-700/80 hover:border-slate-500'
          }`}
          title="Действие F (Вход/Выход из транспорта или здания)"
        >
          <span className="text-sm font-black tracking-tighter leading-none">F</span>
          <span className="text-[8px] font-bold uppercase mt-0.5 opacity-90">Вход</span>
        </button>

        {/* Unified E Button (Use/Interact/Pickup/Shop) */}
        <button
          type="button"
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
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            inputRef.current.actionE = false;
          }}
          className={`w-12 h-12 rounded-2xl border flex flex-col items-center justify-center shadow-xl transition-all active:scale-90 cursor-pointer ${
            canInteractE
              ? 'bg-sky-500 text-white border-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.4)] font-black'
              : 'bg-slate-900/80 text-slate-400 border-slate-700/80 hover:border-slate-500'
          }`}
          title="Действие E (Взаимодействие / Использовать предмет)"
        >
          <span className="text-sm font-black tracking-tighter leading-none">E</span>
          <span className="text-[8px] font-bold uppercase mt-0.5 opacity-90">Действие</span>
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
            {/* PHYSICAL TILTING GEAR STICK LEVER */}
            <GearStickLever
              gear={gear}
              transmissionType={transmissionType}
              onSelectGear={onSelectGear}
            />

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

