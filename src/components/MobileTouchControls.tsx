import React, { useEffect, useRef, useState } from 'react';
import { InputState } from '../types';
import { sound } from '../audio';
import { getVehicleControlTheme, CONTROL_THEME_META } from './vehicleControlStyles';
import { SteeringWheelModel } from './SteeringWheelModel';
import { ShiftKnobModel } from './ShiftKnobModel';
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
  Power,
  CloudFog,
  Sun,
  Hand,
  LogOut,
  Compass,
  Square,
  Truck
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
  hasTransferCase?: boolean;
  transferCaseMode?: 'HIGH' | 'LOW';
  onToggleTransferCase?: () => void;
  carType?: string;
  tractorRange?: 1 | 2;
  headlightMode?: 'off' | 'low' | 'high';
  onToggleHeadlights?: () => void;
  isFrontFogOn?: boolean;
  onToggleFrontFog?: () => void;
  isRearFogOn?: boolean;
  onToggleRearFog?: () => void;
  hasRoadTrainLights?: boolean;
  isRoadTrainLightsOn?: boolean;
  onToggleRoadTrainLights?: () => void;
  tractorBrakeLatch?: boolean;
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

/* Premium Compact Luxury Gear Stick Lever for Mobile Controls with authentic MTZ-80 and Multi-Gate support */
interface GearStickLeverProps {
  gear?: string;
  transmissionType?: 'AUTO' | 'MANUAL';
  carType?: string;
  tractorRange?: 1 | 2;
  onSelectGear?: (gear: 'P' | 'R' | 'N' | 'D' | number | string) => void;
}

const GearStickLever: React.FC<GearStickLeverProps> = ({
  gear = 'D',
  transmissionType = 'AUTO',
  carType,
  tractorRange = 1,
  onSelectGear,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragY, setDragY] = useState<number>(0);
  const [dragX, setDragX] = useState<number>(0);
  const touchIdRef = useRef<number | null>(null);

  const isMachinery = (carType?.startsWith('roller_') || carType?.startsWith('paver_')) || false;
  const isAuto = !isMachinery && transmissionType === 'AUTO';
  const isTractor = !isAuto && !isMachinery && (carType?.startsWith('tractor_') || false);
  const is6Speed = !isAuto && !isMachinery && !isTractor && [
    'truck_semi', 'truck_box', 'truck_dump', 'truck_tanker', 'truck_water', 'truck_flatbed', 'truck_covered', 
    'cement_mixer', 'garbage_truck', 'bus', 'delivery_truck', 'truck_tow', 
    'fire_engine', 'fire_ladder', 'fire_rescue', 'pickup_heavy', 'truck_armored', 
    'supercar', 'sports', 'hatch_hot', 'coupe_gt', 'moto_sport'
  ].includes(carType || '');

  // Soviet MTZ Tractor Range: 1 (Slow / Low) or 2 (Speed / High)
  const [localRange, setLocalRange] = useState<1 | 2>(tractorRange || 1);
  useEffect(() => {
    if (tractorRange) setLocalRange(tractorRange);
  }, [tractorRange]);

  const rawGearStr = String(gear || (isAuto || isMachinery ? 'D' : '1')).toUpperCase();

  let currentGearKey = isAuto || isMachinery ? 'D' : '1';
  if (isMachinery) {
    if (rawGearStr.startsWith('R') || rawGearStr === '-1') currentGearKey = 'R';
    else if (rawGearStr.startsWith('N') || rawGearStr.startsWith('P') || rawGearStr === '0') currentGearKey = 'N';
    else currentGearKey = 'D';
  } else if (isAuto) {
    if (rawGearStr.startsWith('P')) currentGearKey = 'P';
    else if (rawGearStr.startsWith('R')) currentGearKey = 'R';
    else if (rawGearStr.startsWith('N')) currentGearKey = 'N';
    else currentGearKey = 'D';
  } else if (isTractor) {
    if (rawGearStr === 'R' || rawGearStr === '-1') currentGearKey = 'R';
    else if (rawGearStr === 'N' || rawGearStr === '0') currentGearKey = 'N';
    else if (rawGearStr === 'RANGE_I') currentGearKey = 'RANGE_I';
    else if (rawGearStr === 'RANGE_II') currentGearKey = 'RANGE_II';
    else if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(rawGearStr)) currentGearKey = rawGearStr;
    else currentGearKey = '1';
  } else if (is6Speed) {
    if (rawGearStr === 'R' || rawGearStr === '-1') currentGearKey = 'R';
    else if (rawGearStr === 'N' || rawGearStr === '0') currentGearKey = 'N';
    else if (['1', '2', '3', '4', '5', '6'].includes(rawGearStr)) currentGearKey = rawGearStr;
    else currentGearKey = '1';
  } else {
    // Standard 5-speed
    if (rawGearStr === 'R' || rawGearStr === '-1') currentGearKey = 'R';
    else if (rawGearStr === 'N' || rawGearStr === '0') currentGearKey = 'N';
    else if (['1', '2', '3', '4', '5'].includes(rawGearStr)) currentGearKey = rawGearStr;
    else currentGearKey = '1';
  }

  const activeGearRef = useRef<string>(currentGearKey);

  // Notch offsets along Y-axis for Automatic (strictly dx = 0)
  const AUTO_NOTCHES: Record<string, number> = {
    P: -32,
    R: -11,
    N: 11,
    D: 32,
  };

  // Notch offsets along Y-axis for Industrial Hydrostatic Drive (F: Forward, N: Neutral, R: Reverse)
  const MACHINERY_NOTCHES: Record<string, number> = {
    D: -28,
    N: 0,
    R: 28,
    P: 0,
  };

  // Standard 5-speed notches
  const MANUAL_5SPEED_NOTCHES: Record<string, { x: number; y: number }> = {
    '1': { x: -20, y: -24 },
    '2': { x: -20, y: 24 },
    '3': { x: 0, y: -24 },
    '4': { x: 0, y: 24 },
    '5': { x: 20, y: -24 },
    'R': { x: 20, y: 24 },
    'N': { x: 0, y: 0 },
  };

  // 6-speed commercial / sports notches (R top-left, 1-6 standard)
  const MANUAL_6SPEED_NOTCHES: Record<string, { x: number; y: number }> = {
    'R': { x: -26, y: -24 },
    '1': { x: -9, y: -24 },
    '2': { x: -9, y: 24 },
    '3': { x: 9, y: -24 },
    '4': { x: 9, y: 24 },
    '5': { x: 26, y: -24 },
    '6': { x: 26, y: 24 },
    'N': { x: 0, y: 0 },
  };

  // MTZ-80 Soviet Tractor 4-track authentic culisse
  // Track 0: Range I (up) / Range II (down)
  // Track 1: 1/3 (up) / 4/7 (down)
  // Track 2: 5/8 (up) / 2/6 (down)
  // Track 3: 9 (up) / R (down)
  const MANUAL_MTZ_NOTCHES: Record<string, { x: number; y: number }> = {
    'RANGE_I': { x: -32, y: -24 },
    'RANGE_II': { x: -32, y: 24 },
    '1': { x: -11, y: -24 },
    '3': { x: -11, y: -24 },
    '4': { x: -11, y: 24 },
    '7': { x: -11, y: 24 },
    '5': { x: 11, y: -24 },
    '8': { x: 11, y: -24 },
    '2': { x: 11, y: 24 },
    '6': { x: 11, y: 24 },
    '9': { x: 32, y: -24 },
    'R': { x: 32, y: 24 },
    'N': { x: 0, y: 0 },
  };

  const getRestingOffset = () => {
    if (isMachinery) return { x: 0, y: MACHINERY_NOTCHES[currentGearKey] ?? 0 };
    if (isAuto) return { x: 0, y: AUTO_NOTCHES[currentGearKey] ?? 32 };
    if (isTractor) return MANUAL_MTZ_NOTCHES[currentGearKey] ?? { x: 0, y: 0 };
    if (is6Speed) return MANUAL_6SPEED_NOTCHES[currentGearKey] ?? { x: 0, y: 0 };
    return MANUAL_5SPEED_NOTCHES[currentGearKey] ?? { x: 0, y: 0 };
  };

  const restingOffset = getRestingOffset();

  const currentOffset = isDragging
    ? { x: isAuto || isMachinery ? 0 : dragX, y: dragY }
    : restingOffset;

  // Process touch / drag movement
  const processMove = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const centerX = rect.left + rect.width / 2;

    const rawDY = clientY - centerY;
    const rawDX = clientX - centerX;

    if (isMachinery) {
      // HYDROSTATIC LEVER: 1-AXIS SMOOTH FORWARD (D/F) / NEUTRAL (N) / REVERSE (R)
      let detectedNotch = 'N';
      if (rawDY < -14) detectedNotch = 'D';
      else if (rawDY > 14) detectedNotch = 'R';
      else detectedNotch = 'N';

      setDragX(0);
      setDragY(MACHINERY_NOTCHES[detectedNotch]);

      if (detectedNotch !== activeGearRef.current) {
        activeGearRef.current = detectedNotch;
        triggerHaptic(25);
        sound.playGearShift();
        onSelectGear?.(detectedNotch);
      }
    } else if (isAuto) {
      // AUTOMATIC: STRICTLY ZERO SIDEWAYS DRIFT (dx = 0)
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
    } else if (isTractor) {
      // MTZ-80 SOVIET 4-TRACK DUAL-RANGE CULISSE
      // Free sideways movement in neutral corridor (Math.abs(rawDY) <= 8)
      let clampedX = Math.max(-33, Math.min(33, rawDX));
      let clampedY = Math.max(-25, Math.min(25, rawDY));

      if (Math.abs(clampedY) > 7) {
        // Snap to nearest vertical track
        if (clampedX < -21) clampedX = -32; // Track 0: Range
        else if (clampedX < 0) clampedX = -11; // Track 1: 1/3 and 4/7
        else if (clampedX < 21) clampedX = 11; // Track 2: 5/8 and 2/6
        else clampedX = 32; // Track 3: 9 and R
      } else {
        clampedY = 0; // Floating inside horizontal neutral groove
      }

      setDragX(clampedX);
      setDragY(clampedY);

      let detectedNotch = 'N';
      if (Math.abs(clampedY) <= 8) {
        detectedNotch = 'N';
      } else if (clampedY < -10) {
        // Top row
        if (clampedX === -32) {
          detectedNotch = 'RANGE_I';
          setLocalRange(1);
        } else if (clampedX === -11) {
          detectedNotch = localRange === 1 ? '1' : '3';
        } else if (clampedX === 11) {
          detectedNotch = localRange === 1 ? '5' : '8';
        } else {
          detectedNotch = '9';
        }
      } else if (clampedY > 10) {
        // Bottom row
        if (clampedX === -32) {
          detectedNotch = 'RANGE_II';
          setLocalRange(2);
        } else if (clampedX === -11) {
          detectedNotch = localRange === 1 ? '4' : '7';
        } else if (clampedX === 11) {
          detectedNotch = localRange === 1 ? '2' : '6';
        } else {
          detectedNotch = 'R';
        }
      }

      if (detectedNotch !== activeGearRef.current) {
        activeGearRef.current = detectedNotch;
        triggerHaptic(22);
        sound.playGearShift();
        if (onSelectGear) {
          if (detectedNotch === 'RANGE_I') onSelectGear('RANGE_I');
          else if (detectedNotch === 'RANGE_II') onSelectGear('RANGE_II');
          else if (detectedNotch === 'R') onSelectGear('R');
          else if (detectedNotch === 'N') onSelectGear('N');
          else onSelectGear(Number(detectedNotch));
        }
      }
    } else if (is6Speed) {
      // 6-SPEED MANUAL (R at -26 up, 1-2 at -9, 3-4 at 9, 5-6 at 26)
      let clampedX = Math.max(-28, Math.min(28, rawDX));
      let clampedY = Math.max(-25, Math.min(25, rawDY));

      if (Math.abs(clampedY) > 7) {
        if (clampedX < -17) clampedX = -26;
        else if (clampedX < 0) clampedX = -9;
        else if (clampedX < 17) clampedX = 9;
        else clampedX = 26;
      } else {
        clampedY = 0;
      }

      setDragX(clampedX);
      setDragY(clampedY);

      let detectedNotch = 'N';
      if (Math.abs(clampedY) <= 8) {
        detectedNotch = 'N';
      } else if (clampedX === -26) {
        detectedNotch = clampedY < 0 ? 'R' : 'N';
      } else if (clampedX === -9) {
        detectedNotch = clampedY < 0 ? '1' : '2';
      } else if (clampedX === 9) {
        detectedNotch = clampedY < 0 ? '3' : '4';
      } else {
        detectedNotch = clampedY < 0 ? '5' : '6';
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
    } else {
      // STANDARD 5-SPEED MANUAL
      let clampedX = Math.max(-22, Math.min(22, rawDX));
      let clampedY = Math.max(-25, Math.min(25, rawDY));

      if (Math.abs(clampedY) > 7) {
        if (clampedX < -10) clampedX = -20;
        else if (clampedX > 10) clampedX = 20;
        else clampedX = 0;
      } else {
        clampedY = 0;
      }

      setDragX(clampedX);
      setDragY(clampedY);

      let detectedNotch = 'N';
      if (Math.abs(clampedY) <= 8) {
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

  // Dimensions for console
  const boxW = (isTractor || is6Speed) ? 96 : 84;
  const boxH = 118;
  const cx = boxW / 2;
  const cy = boxH / 2;

  const knobX = cx + currentOffset.x;
  const knobY = cy + currentOffset.y;

  const tiltY = (-currentOffset.y / 32) * 28;
  const tiltX = (currentOffset.x / 24) * 22;

  const theme = getVehicleControlTheme(carType);
  const themeMeta = CONTROL_THEME_META[theme];

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      className={`relative h-[112px] select-none touch-none flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing shrink-0 my-auto ${
        isTractor || is6Speed ? 'w-[88px] sm:w-[96px]' : 'w-[72px] sm:w-[80px]'
      }`}
      title={`${themeMeta.knobName} (переключайте режимы свайпом)`}
    >
      {/* TRACTOR QUICK RANGE INDICATOR BADGE (TAPPABLE) */}
      {isTractor && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const nextR = localRange === 1 ? 2 : 1;
            setLocalRange(nextR);
            triggerHaptic(20);
            sound.playGearShift();
            onSelectGear?.(nextR === 1 ? 'RANGE_I' : 'RANGE_II');
          }}
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-slate-950/90 border border-amber-500/50 text-[7.5px] font-mono font-black text-amber-400 whitespace-nowrap shadow-md cursor-pointer hover:bg-slate-900 active:scale-95 transition z-30 flex items-center gap-1"
          title="Нажмите для переключения диапазона МТЗ (I / II)"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>Д-{localRange === 1 ? 'I (МЕДЛ)' : 'II (СКОР)'}</span>
        </button>
      )}

      {/* AUTOMATIC OR MANUAL FLOATING GUIDE SLOTS */}
      {isMachinery ? (
        /* INDUSTRIAL HYDROSTATIC LEVER VERTICAL SLOT */
        <div className="absolute inset-y-2.5 w-1 bg-stone-900/90 border border-amber-500/40 rounded-full flex flex-col justify-between items-center py-2 pointer-events-none">
          <div className="flex items-center justify-center">
            <span className={`text-[7px] font-black font-mono px-1 rounded transition-all ${currentGearKey === 'D' ? 'text-emerald-400 bg-emerald-950/90 border border-emerald-500 scale-110 shadow-xs' : 'text-stone-600'}`}>F</span>
          </div>
          <div className="flex items-center justify-center">
            <span className={`text-[7px] font-black font-mono px-1 rounded transition-all ${currentGearKey === 'N' || currentGearKey === 'P' ? 'text-amber-400 bg-amber-950/90 border border-amber-500 scale-110 shadow-xs' : 'text-stone-600'}`}>N</span>
          </div>
          <div className="flex items-center justify-center">
            <span className={`text-[7px] font-black font-mono px-1 rounded transition-all ${currentGearKey === 'R' ? 'text-rose-400 bg-rose-950/90 border border-rose-500 scale-110 shadow-xs' : 'text-stone-600'}`}>R</span>
          </div>
        </div>
      ) : isAuto ? (
        /* AUTOMATIC VERTICAL GUIDE LINE & SUBTLE LED DOTS */
        <div className="absolute inset-y-3 w-0.5 bg-slate-800/60 rounded-full flex flex-col justify-between items-center py-1.5 pointer-events-none">
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${currentGearKey === 'P' ? 'bg-red-500 shadow-[0_0_8px_#ef4444] scale-125' : 'bg-slate-700/60'}`} />
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${currentGearKey === 'R' ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b] scale-125' : 'bg-slate-700/60'}`} />
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${currentGearKey === 'N' ? 'bg-slate-200 shadow-[0_0_8px_#ffffff] scale-125' : 'bg-slate-700/60'}`} />
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${currentGearKey === 'D' ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8] scale-125' : 'bg-slate-700/60'}`} />
        </div>
      ) : isTractor ? (
        /* SOVIET TRACTOR 4-TRACK CULISSE GUIDE PLATE */
        <div className="absolute inset-0 pointer-events-none">
          {/* Top Notch Labels */}
          <div className="absolute top-1.5 inset-x-1 flex justify-between text-[7px] font-mono font-bold px-1.5">
            <span className={localRange === 1 ? 'text-amber-400 font-black' : 'text-slate-500'}>I</span>
            <span className={currentGearKey === '1' || currentGearKey === '3' ? 'text-sky-400 font-black' : 'text-slate-400'}>1/3</span>
            <span className={currentGearKey === '5' || currentGearKey === '8' ? 'text-sky-400 font-black' : 'text-slate-400'}>5/8</span>
            <span className={currentGearKey === '9' ? 'text-sky-400 font-black' : 'text-slate-400'}>9</span>
          </div>

          <svg className="w-full h-full opacity-35">
            {/* 4 Vertical Slots */}
            <line x1={cx - 32} y1={cy - 24} x2={cx - 32} y2={cy + 24} stroke="#cbd5e1" strokeWidth="1.6" strokeDasharray="2 2" strokeLinecap="round" />
            <line x1={cx - 11} y1={cy - 24} x2={cx - 11} y2={cy + 24} stroke="#cbd5e1" strokeWidth="1.6" strokeDasharray="2 2" strokeLinecap="round" />
            <line x1={cx + 11} y1={cy - 24} x2={cx + 11} y2={cy + 24} stroke="#cbd5e1" strokeWidth="1.6" strokeDasharray="2 2" strokeLinecap="round" />
            <line x1={cx + 32} y1={cy - 24} x2={cx + 32} y2={cy + 24} stroke="#cbd5e1" strokeWidth="1.6" strokeDasharray="2 2" strokeLinecap="round" />
            {/* Horizontal Neutral Crossbar */}
            <line x1={cx - 32} y1={cy} x2={cx + 32} y2={cy} stroke="#cbd5e1" strokeWidth="1.6" strokeDasharray="2 2" strokeLinecap="round" />
          </svg>

          {/* Bottom Notch Labels */}
          <div className="absolute bottom-1.5 inset-x-1 flex justify-between text-[7px] font-mono font-bold px-1.5">
            <span className={localRange === 2 ? 'text-amber-400 font-black' : 'text-slate-500'}>II</span>
            <span className={currentGearKey === '4' || currentGearKey === '7' ? 'text-sky-400 font-black' : 'text-slate-400'}>4/7</span>
            <span className={currentGearKey === '2' || currentGearKey === '6' ? 'text-sky-400 font-black' : 'text-slate-400'}>2/6</span>
            <span className={currentGearKey === 'R' ? 'text-rose-400 font-black' : 'text-slate-400'}>R</span>
          </div>
        </div>
      ) : is6Speed ? (
        /* 6-SPEED COMMERCIAL / SPORTS H-GATE */
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1.5 inset-x-1 flex justify-between text-[7.5px] font-mono font-bold px-2">
            <span className={currentGearKey === 'R' ? 'text-rose-400 font-black' : 'text-slate-400'}>R</span>
            <span className={currentGearKey === '1' ? 'text-sky-400 font-black' : 'text-slate-400'}>1</span>
            <span className={currentGearKey === '3' ? 'text-sky-400 font-black' : 'text-slate-400'}>3</span>
            <span className={currentGearKey === '5' ? 'text-sky-400 font-black' : 'text-slate-400'}>5</span>
          </div>

          <svg className="w-full h-full opacity-30">
            <line x1={cx - 26} y1={cy - 24} x2={cx - 26} y2={cy} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
            <line x1={cx - 9} y1={cy - 24} x2={cx - 9} y2={cy + 24} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
            <line x1={cx + 9} y1={cy - 24} x2={cx + 9} y2={cy + 24} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
            <line x1={cx + 26} y1={cy - 24} x2={cx + 26} y2={cy + 24} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
            <line x1={cx - 26} y1={cy} x2={cx + 26} y2={cy} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
          </svg>

          <div className="absolute bottom-1.5 inset-x-1 flex justify-between text-[7.5px] font-mono font-bold px-2">
            <span className="opacity-0">·</span>
            <span className={currentGearKey === '2' ? 'text-sky-400 font-black' : 'text-slate-400'}>2</span>
            <span className={currentGearKey === '4' ? 'text-sky-400 font-black' : 'text-slate-400'}>4</span>
            <span className={currentGearKey === '6' ? 'text-sky-400 font-black' : 'text-slate-400'}>6</span>
          </div>
        </div>
      ) : (
        /* STANDARD 5-SPEED MANUAL SUBTLE H-GATE */
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1.5 inset-x-2 flex justify-between text-[7.5px] font-mono font-bold px-1">
            <span className={currentGearKey === '1' ? 'text-sky-400 font-black' : 'text-slate-400'}>1</span>
            <span className={currentGearKey === '3' ? 'text-sky-400 font-black' : 'text-slate-400'}>3</span>
            <span className={currentGearKey === '5' ? 'text-sky-400 font-black' : 'text-slate-400'}>5</span>
          </div>

          <svg className="w-full h-full opacity-30">
            <line x1={cx - 20} y1={cy - 24} x2={cx - 20} y2={cy + 24} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
            <line x1={cx} y1={cy - 24} x2={cx} y2={cy + 24} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
            <line x1={cx + 20} y1={cy - 24} x2={cx + 20} y2={cy + 24} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
            <line x1={cx - 20} y1={cy} x2={cx + 20} y2={cy} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
          </svg>

          <div className="absolute bottom-1.5 inset-x-2 flex justify-between text-[7.5px] font-mono font-bold px-1">
            <span className={currentGearKey === '2' ? 'text-sky-400 font-black' : 'text-slate-400'}>2</span>
            <span className={currentGearKey === '4' ? 'text-sky-400 font-black' : 'text-slate-400'}>4</span>
            <span className={currentGearKey === 'R' ? 'text-rose-400 font-black' : 'text-slate-400'}>R</span>
          </div>
        </div>
      )}

      {/* VEHICLE-AUTHENTIC GAITER BOOT & METALLIC SHAFT */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
        <defs>
          <linearGradient id="chromeShaft_v2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="35%" stopColor="#ffffff" />
            <stop offset="65%" stopColor="#475569" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="blackShaft_v2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3f3f46" />
            <stop offset="40%" stopColor="#18181b" />
            <stop offset="100%" stopColor="#09090b" />
          </linearGradient>

          <radialGradient id="gaiterShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#020617" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Gaiter Base Collar themed */}
        {themeMeta.bootStyle === 'rubber_bellows' ? (
          <g>
            {/* Rubber bellow accordion folds for tractor & truck */}
            <ellipse cx={cx} cy={cy + 4} rx={22} ry={13} fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" />
            <ellipse cx={cx} cy={cy} rx={17} ry={10} fill="#09090b" stroke="#27272a" strokeWidth="1.2" />
            <ellipse cx={cx} cy={cy - 3} rx={12} ry={7} fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
          </g>
        ) : themeMeta.bootStyle === 'vintage_pleated' ? (
          <g>
            {/* Soviet polished chrome bezel with pleated vinyl */}
            <ellipse cx={cx} cy={cy} rx={21} ry={14} fill="url(#chromeShaft_v2)" stroke="#94a3b8" strokeWidth="1" />
            <ellipse cx={cx} cy={cy} rx={17} ry={11} fill="#1c1917" stroke="#78716c" strokeWidth="1" />
            <line x1={cx - 12} y1={cy - 5} x2={cx + 12} y2={cy + 5} stroke="#44403c" strokeWidth="0.8" />
            <line x1={cx - 12} y1={cy + 5} x2={cx + 12} y2={cy - 5} stroke="#44403c" strokeWidth="0.8" />
          </g>
        ) : themeMeta.bootStyle === 'sport_alcantara' ? (
          <g>
            {/* Alcantara boot with red contrast stitching */}
            <ellipse cx={cx} cy={cy} rx={20} ry={13} fill="#09090b" stroke="#ef4444" strokeWidth="1.2" />
            <ellipse cx={cx} cy={cy} rx={15} ry={9} fill="#020617" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="2 1.5" />
          </g>
        ) : themeMeta.bootStyle === 'luxury_leather' ? (
          <g>
            {/* Nappa leather with satin silver bezel */}
            <ellipse cx={cx} cy={cy} rx={21} ry={14} fill="url(#chromeShaft_v2)" stroke="#e2e8f0" strokeWidth="1.2" />
            <ellipse cx={cx} cy={cy} rx={17} ry={10} fill="#0f172a" stroke="#334155" strokeWidth="1" />
          </g>
        ) : (
          <g>
            <ellipse cx={cx} cy={cy} rx={18} ry={12} fill="url(#gaiterShadow)" stroke="#334155" strokeWidth="1.2" />
            <ellipse cx={cx} cy={cy} rx={12} ry={8} fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
          </g>
        )}

        {/* Rod from Pivot (cx, cy) to Knob Base (knobX, knobY) */}
        <line
          x1={cx}
          y1={cy}
          x2={knobX}
          y2={knobY}
          stroke={themeMeta.shaftStyle === 'black_industrial' ? 'url(#blackShaft_v2)' : 'url(#chromeShaft_v2)'}
          strokeWidth={themeMeta.shaftStyle === 'chrome_slender' ? '5' : themeMeta.shaftStyle === 'black_industrial' ? '8' : '7'}
          strokeLinecap="round"
        />
        {themeMeta.shaftStyle !== 'black_industrial' && (
          <line
            x1={cx}
            y1={cy}
            x2={knobX}
            y2={knobY}
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.9"
          />
        )}
      </svg>

      {/* REALISTIC VEHICLE-SPECIFIC SHIFT KNOB */}
      <div
        className="absolute z-20 pointer-events-none"
        style={{
          left: `${knobX}px`,
          top: `${knobY}px`,
          transform: `translate(-50%, -50%) perspective(260px) rotateX(${tiltY}deg) rotateY(${tiltX}deg)`,
          transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.25), left 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.25), top 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.25)',
        }}
      >
        <ShiftKnobModel
          theme={theme}
          isAuto={isAuto}
          isTractor={isTractor}
          is6Speed={is6Speed}
          currentGearKey={currentGearKey}
          localRange={localRange}
          tiltX={tiltX}
          tiltY={tiltY}
        />
      </div>
    </div>
  );
};

/* Realistic Ergonomic Virtual Steering Wheel for Mobile Driving with Multi-Turn & Mechanical Lock */
interface VirtualSteeringWheelProps {
  inputRef: React.MutableRefObject<InputState>;
  speedKmh?: number;
  carType?: string;
}

const VirtualSteeringWheel: React.FC<VirtualSteeringWheelProps> = ({
  inputRef,
  speedKmh = 0,
  carType,
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const rotationDegRef = useRef<number>(0);
  const isInteractingRef = useRef<boolean>(false);
  const lastTouchAngleRef = useRef<number | null>(null);
  const touchIdRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastHapticTickRef = useRef<number>(0);
  const hornActiveRef = useRef<boolean>(false);

  const theme = getVehicleControlTheme(carType);
  const themeMeta = CONTROL_THEME_META[theme];

  // Maximum physical wheel rotation angle in degrees (+/- 450 deg = 1.25 turns each way, 2.5 turns total lock-to-lock)
  const MAX_WHEEL_DEG = 450;

  const applySteeringAngle = (newDeg: number) => {
    // Hard mechanical lock (упор)
    const clampedDeg = Math.max(-MAX_WHEEL_DEG, Math.min(MAX_WHEEL_DEG, newDeg));
    rotationDegRef.current = clampedDeg;
    setRotationDeg(clampedDeg);

    // Normalize to analog axis (-1.0 left to +1.0 right)
    const axis = clampedDeg / MAX_WHEEL_DEG;
    inputRef.current.steeringAxis = axis;
    inputRef.current.left = axis < -0.06;
    inputRef.current.right = axis > 0.06;

    // Haptic feedback at hard lock and center notch
    const now = performance.now();
    if (Math.abs(clampedDeg) >= MAX_WHEEL_DEG - 0.5 && now - lastHapticTickRef.current > 200) {
      triggerHaptic(20);
      lastHapticTickRef.current = now;
    } else if (Math.abs(clampedDeg) < 8 && now - lastHapticTickRef.current > 180) {
      triggerHaptic(8);
      lastHapticTickRef.current = now;
    }
  };

  const handlePointerDown = (clientX: number, clientY: number, touchId?: number) => {
    if (!wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = clientX - cx;
    const dy = clientY - cy;
    const distSq = dx * dx + dy * dy;

    // Stop auto-centering animation immediately when grabbed
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (touchId !== undefined) {
      touchIdRef.current = touchId;
    }
    isInteractingRef.current = true;

    // Center horn hub check (radius < 22px)
    if (distSq < 22 * 22) {
      if (!hornActiveRef.current) {
        hornActiveRef.current = true;
        inputRef.current.hornH = true;
        triggerHaptic(20);
        sound.playHorn();
      }
      lastTouchAngleRef.current = null;
      return;
    }

    // Grab the wheel at current touch angle without jumping!
    // Angle relative to top vertical (0 deg = up, +rad = clockwise, -rad = counterclockwise)
    const angleRad = Math.atan2(dx, -dy);
    lastTouchAngleRef.current = angleRad;
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!wheelRef.current || !isInteractingRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = clientX - cx;
    const dy = clientY - cy;
    const distSq = dx * dx + dy * dy;

    // Release horn if dragged outside center hub
    if (hornActiveRef.current && distSq >= 24 * 24) {
      hornActiveRef.current = false;
      inputRef.current.hornH = false;
    }

    // If horn is active, don't rotate wheel
    if (hornActiveRef.current) return;

    // Current angle relative to top vertical
    const currentAngleRad = Math.atan2(dx, -dy);

    if (lastTouchAngleRef.current === null) {
      lastTouchAngleRef.current = currentAngleRad;
      return;
    }

    // Calculate angular delta between consecutive frames
    let deltaRad = currentAngleRad - lastTouchAngleRef.current;
    
    // Normalize delta across -PI to +PI boundary (handles circular wraparound seamlessly without snapping)
    while (deltaRad > Math.PI) deltaRad -= 2 * Math.PI;
    while (deltaRad < -Math.PI) deltaRad += 2 * Math.PI;

    const deltaDeg = (deltaRad * 180) / Math.PI;

    // Only apply if finger is sufficiently away from dead center
    if (distSq > 14 * 14) {
      const prevDeg = rotationDegRef.current;
      const targetDeg = prevDeg + deltaDeg;

      // Haptic bump on hitting hard mechanical stop
      if ((prevDeg < MAX_WHEEL_DEG && targetDeg >= MAX_WHEEL_DEG) ||
          (prevDeg > -MAX_WHEEL_DEG && targetDeg <= -MAX_WHEEL_DEG)) {
        triggerHaptic(18);
      }

      applySteeringAngle(targetDeg);
    }

    lastTouchAngleRef.current = currentAngleRad;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    handlePointerDown(touch.clientX, touch.clientY, touch.identifier);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        handlePointerMove(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        endInteraction();
        break;
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handlePointerDown(e.clientX, e.clientY);

    const onMouseMove = (me: MouseEvent) => {
      handlePointerMove(me.clientX, me.clientY);
    };

    const onMouseUp = () => {
      endInteraction();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const endInteraction = () => {
    isInteractingRef.current = false;
    touchIdRef.current = null;
    lastTouchAngleRef.current = null;

    if (hornActiveRef.current) {
      hornActiveRef.current = false;
      inputRef.current.hornH = false;
    }

    // On stationary vehicle (0 km/h), tire dry friction holds the wheels and steering wheel in place!
    // Auto-centering only occurs when the vehicle is rolling (caster effect).
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const currentSpeed = speedKmh || 0;
    if (currentSpeed < 2.0 || Math.abs(rotationDegRef.current) < 1.0) {
      return;
    }

    let lastTime = performance.now();
    const returnStep = (now: number) => {
      if (isInteractingRef.current) {
        animFrameRef.current = null;
        return;
      }

      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const spd = speedKmh || 0;
      if (spd < 2.0) {
        // Vehicle stopped rolling: hold steering wheel at current angle
        animFrameRef.current = null;
        return;
      }

      // Realistic caster self-aligning torque: proportional to rolling speed up to ~30 km/h
      const casterForce = Math.min(1.0, spd / 30.0);
      const returnSpeedDegPerSec = 175.0 * casterForce;

      const currentDeg = rotationDegRef.current;
      const step = Math.sign(currentDeg) * Math.min(Math.abs(currentDeg), returnSpeedDegPerSec * dt);

      if (Math.abs(currentDeg) <= 1.5 || Math.abs(step) >= Math.abs(currentDeg)) {
        applySteeringAngle(0);
        animFrameRef.current = null;
      } else {
        applySteeringAngle(currentDeg - step);
        animFrameRef.current = requestAnimationFrame(returnStep);
      }
    };

    animFrameRef.current = requestAnimationFrame(returnStep);
  };

  // Speed-based dynamic caster update: if the vehicle accelerates while the wheel was left turned,
  // the rolling motion will naturally spin the steering wheel back towards 0 degrees
  useEffect(() => {
    if (isInteractingRef.current) return;
    if (Math.abs(rotationDegRef.current) < 1.5) return;

    const currentSpeed = speedKmh || 0;
    if (currentSpeed < 2.0) {
      // Stopped on the spot: do not auto-center, hold position
      return;
    }

    if (animFrameRef.current) return; // Already unwinding

    let lastTime = performance.now();
    const returnStep = (now: number) => {
      if (isInteractingRef.current) {
        animFrameRef.current = null;
        return;
      }

      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const spd = speedKmh || 0;
      if (spd < 2.0) {
        animFrameRef.current = null;
        return;
      }

      const casterForce = Math.min(1.0, spd / 30.0);
      const returnSpeedDegPerSec = 175.0 * casterForce;

      const currentDeg = rotationDegRef.current;
      const step = Math.sign(currentDeg) * Math.min(Math.abs(currentDeg), returnSpeedDegPerSec * dt);

      if (Math.abs(currentDeg) <= 1.5 || Math.abs(step) >= Math.abs(currentDeg)) {
        applySteeringAngle(0);
        animFrameRef.current = null;
      } else {
        applySteeringAngle(currentDeg - step);
        animFrameRef.current = requestAnimationFrame(returnStep);
      }
    };

    animFrameRef.current = requestAnimationFrame(returnStep);
  }, [speedKmh]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const isAtLeftLock = rotationDeg <= -MAX_WHEEL_DEG + 1;
  const isAtRightLock = rotationDeg >= MAX_WHEEL_DEG - 1;
  const turnsCount = (rotationDeg / 360).toFixed(1);

  return (
    <div
      ref={wheelRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      className="relative w-36 h-36 select-none touch-none flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing shrink-0"
      title={`${themeMeta.wheelName} (крутите по кругу для плавного управления)`}
    >
      {/* BACKGROUND DIAL RING & DEGREE NOTCHES */}
      <div 
        className="absolute inset-0 rounded-full backdrop-blur-md shadow-[0_10px_25px_rgba(0,0,0,0.85)] flex items-center justify-center pointer-events-none transition-colors duration-300"
        style={{
          backgroundColor: themeMeta.dialBgColor,
          border: `1.5px solid ${themeMeta.dialBorderColor}`,
        }}
      >
        {/* Subtle angle degree & vehicle theme badge */}
        <div className="absolute top-1 flex items-center gap-1 text-[8.5px] font-mono font-bold">
          <span style={{ color: themeMeta.accentColor }} className="font-black drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">
            {themeMeta.badgeText}
          </span>
          <span className="text-slate-500">·</span>
          <span className={isAtLeftLock || isAtRightLock ? 'text-amber-400 font-black' : 'text-slate-300'}>
            {Math.abs(Math.round(rotationDeg))}°
          </span>
          <span className="text-[7.5px] text-slate-500">
            ({turnsCount} об.)
          </span>
          {(isAtLeftLock || isAtRightLock) && (
            <span className="px-1 py-0.2 text-[7px] bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded font-black">
              УПОР
            </span>
          )}
        </div>
        <div className={`absolute left-2 text-[8px] font-mono font-bold ${isAtLeftLock ? 'text-amber-400 font-black scale-110' : 'text-slate-500'}`}>
          L
        </div>
        <div className={`absolute right-2 text-[8px] font-mono font-bold ${isAtRightLock ? 'text-amber-400 font-black scale-110' : 'text-slate-500'}`}>
          R
        </div>

        {/* Top 12 o'clock center tick notch */}
        <div 
          className="absolute top-0 w-1.5 h-2 rounded-b-sm opacity-80"
          style={{ backgroundColor: themeMeta.accentColor }}
        />
      </div>

      {/* ROTATING VEHICLE-AUTHENTIC STEERING WHEEL */}
      <div
        className="w-[132px] h-[132px] transition-transform duration-75 ease-out relative pointer-events-none"
        style={{ transform: `rotate(${rotationDeg}deg)` }}
      >
        <SteeringWheelModel
          theme={theme}
          isHornActive={hornActiveRef.current}
          carType={carType}
        />
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
  hasTransferCase,
  transferCaseMode,
  onToggleTransferCase,
  carType,
  tractorRange,
  headlightMode = 'off',
  onToggleHeadlights,
  isFrontFogOn = false,
  onToggleFrontFog,
  isRearFogOn = false,
  onToggleRearFog,
  hasRoadTrainLights = false,
  isRoadTrainLightsOn = false,
  onToggleRoadTrainLights,
  tractorBrakeLatch = true,
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
          className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-xl transition-all active:scale-90 cursor-pointer ${
            canInteractF
              ? 'bg-slate-800 text-slate-100 border-slate-300 shadow-[0_0_12px_rgba(255,255,255,0.25)]'
              : 'bg-slate-950/80 text-slate-500 border-slate-700/80 hover:border-slate-500'
          }`}
          title="Действие F (Вход/Выход из транспорта)"
        >
          {isInVehicle ? <LogOut className="w-5 h-5 text-slate-200" /> : <Car className="w-5 h-5 text-slate-200" />}
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
          className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-xl transition-all active:scale-90 cursor-pointer ${
            canInteractE
              ? 'bg-slate-800 text-slate-100 border-slate-300 shadow-[0_0_12px_rgba(255,255,255,0.25)]'
              : 'bg-slate-950/80 text-slate-500 border-slate-700/80 hover:border-slate-500'
          }`}
          title="Действие E (Взаимодействие / Использовать)"
        >
          <Hand className="w-5 h-5 text-slate-200" />
        </button>
      </div>

      {/* LEFT BOTTOM ZONE: STEERING WHEEL (IN CAR) OR VIRTUAL JOYSTICK (ON FOOT) */}
      {isInVehicle ? (
        <>
          {/* TURN SIGNAL / INDICATORS BAR ABOVE STEERING WHEEL */}
          <div id="touch-turn-signals" className="absolute bottom-[154px] left-4 pointer-events-auto flex items-center gap-2 z-40">
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

          {/* IN VEHICLE: REALISTIC VIRTUAL STEERING WHEEL */}
          <div id="touch-steering-zone" className="absolute bottom-3 left-3 pointer-events-auto flex items-center z-40 touch-none">
            <VirtualSteeringWheel inputRef={inputRef} speedKmh={speedKmh} carType={carType} />
          </div>
        </>
      ) : (
        /* ON FOOT: VIRTUAL ANALOG JOYSTICK */
        <div
          id="touch-joystick-zone"
          className="absolute bottom-0 left-0 w-44 h-44 sm:w-52 sm:h-52 pointer-events-auto touch-none"
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
            </div>
          )}
        </div>
      )}

      {/* RIGHT BOTTOM ZONE: ERGONOMIC ACTION BUTTONS */}
      <div id="touch-actions-zone" className="absolute bottom-4 right-4 pointer-events-auto flex flex-col items-end gap-2.5 z-40 touch-none">
        
        {/* VEHICLE QUICK LIGHTING TOOLBAR (HEADLIGHTS / FRONT FOG / REAR FOG) */}
        {isInVehicle && (
          <div className="flex items-center gap-1.5 bg-slate-950/90 p-1 rounded-xl border border-slate-700/80 shadow-lg">
            <button
              type="button"
              onClick={() => { triggerHaptic(15); onToggleHeadlights?.(); }}
              className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all active:scale-95 ${
                headlightMode === 'high' 
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.3)]' 
                  : headlightMode === 'low'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
              title="Переключить фары (Выкл / Ближний / Дальний)"
            >
              {headlightMode === 'high' ? (
                <Zap className="w-5 h-5 text-sky-300" />
              ) : headlightMode === 'low' ? (
                <Sun className="w-5 h-5 text-emerald-300" />
              ) : (
                <Lightbulb className="w-5 h-5 text-slate-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => { triggerHaptic(15); onToggleFrontFog?.(); }}
              className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all active:scale-95 ${
                isFrontFogOn
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
              title="Передние противотуманки (ПТФ)"
            >
              <CloudFog className={`w-5 h-5 ${isFrontFogOn ? 'text-amber-300' : 'text-slate-400'}`} />
            </button>

            <button
              type="button"
              onClick={() => { triggerHaptic(15); onToggleRearFog?.(); }}
              className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all active:scale-95 ${
                isRearFogOn
                  ? 'bg-rose-500/20 text-rose-300 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
              title="Задние противотуманки (ПТФ ЗАД)"
            >
              <ShieldAlert className={`w-5 h-5 ${isRearFogOn ? 'text-rose-400' : 'text-slate-400'}`} />
            </button>

            {hasRoadTrainLights && (
              <button
                type="button"
                onClick={() => { triggerHaptic(15); onToggleRoadTrainLights?.(); }}
                className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all active:scale-95 ${
                  isRoadTrainLightsOn
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                    : 'bg-slate-900 text-slate-400 border-slate-700'
                }`}
                title="Огни автопоезда (крыша)"
              >
                <Truck className={`w-5 h-5 ${isRoadTrainLightsOn ? 'text-amber-300' : 'text-slate-400'}`} />
              </button>
            )}
          </div>
        )}

        {/* TOP ROW OF AUXILIARY ACTIONS (MENU / HORN / TRANSFER CASE / MOTOR) */}
        <div className="flex items-center gap-2">
          {isInVehicle && (
            <>
              <button
                type="button"
                onClick={() => { triggerHaptic(15); onOpenRadialMenu?.(); }}
                className="w-10 h-10 bg-slate-950/95 border border-slate-700 text-slate-300 active:bg-slate-800 active:text-white rounded-lg flex items-center justify-center shadow-lg font-bold transition-all"
                title="Приборы / Меню"
              >
                <Gauge className="w-5 h-5 text-emerald-400" />
              </button>

              <TouchButton
                inputKey="hornH"
                inputRef={inputRef}
                hapticMs={15}
                className="w-10 h-10 bg-slate-950/95 border border-slate-700 text-slate-300 rounded-lg flex items-center justify-center shadow-lg font-bold"
                activeClassName="bg-slate-800 text-white"
              >
                <Volume2 className="w-5 h-5 text-slate-300" />
              </TouchButton>

              {hasTransferCase && (
                <TouchButton
                  inputKey="transferCaseToggle"
                  inputRef={inputRef}
                  hapticMs={20}
                  className={`w-10 h-10 border rounded-lg flex items-center justify-center shadow-lg font-black transition-all ${
                    transferCaseMode === 'LOW'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                      : 'bg-slate-950/95 text-slate-400 border-slate-700'
                  }`}
                  activeClassName="scale-95 brightness-125"
                  title="Делитель (Повышенная/Пониженная)"
                >
                  <Compass className={`w-5 h-5 ${transferCaseMode === 'LOW' ? 'text-amber-400' : 'text-slate-400'}`} />
                </TouchButton>
              )}
            </>
          )}

          {/* ENGINE IGNITION (START / STOP / MOTOR) */}
          {isInVehicle && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                onToggleEngine?.();
              }}
              className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold shadow-xl border transition-all active:scale-95 ${
                isEngineRunning
                  ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : 'bg-rose-950/90 border-rose-600 text-rose-300 animate-pulse'
              }`}
              title="Запустить/заглушить двигатель"
            >
              <Power className="w-5 h-5" />
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
              carType={carType}
              tractorRange={tractorRange}
              onSelectGear={onSelectGear}
            />

            {/* DRIFT / HANDBRAKE */}
            <TouchButton
              inputKey="handbrake"
              inputRef={inputRef}
              hapticMs={20}
              className="w-13 h-14 bg-slate-950/95 border border-slate-700 text-slate-300 rounded-xl flex items-center justify-center shadow-xl"
              activeClassName="bg-slate-800 text-white border-slate-500"
            >
              <Flame className="w-6 h-6 text-slate-300" />
            </TouchButton>

            {/* BRAKE PEDAL */}
            {carType && carType.startsWith('tractor_') && tractorBrakeLatch === false ? (
              <div className="flex gap-1.5 h-22">
                {/* LEFT BRAKE PEDAL */}
                <TouchButton
                  inputKey="brakeLeft"
                  inputRef={inputRef}
                  hapticMs={15}
                  className="w-10 h-22 bg-slate-950/95 border border-slate-700 text-slate-200 rounded-xl flex flex-col items-center justify-center shadow-2xl"
                  activeClassName="bg-rose-950 text-white border-rose-500"
                >
                  <ChevronDown className="w-5 h-5 text-rose-400 stroke-[2.5]" />
                  <span className="text-[9px] font-extrabold font-mono text-rose-300">Л [,]</span>
                </TouchButton>

                {/* RIGHT BRAKE PEDAL */}
                <TouchButton
                  inputKey="brakeRight"
                  inputRef={inputRef}
                  hapticMs={15}
                  className="w-10 h-22 bg-slate-950/95 border border-slate-700 text-slate-200 rounded-xl flex flex-col items-center justify-center shadow-2xl"
                  activeClassName="bg-rose-950 text-white border-rose-500"
                >
                  <ChevronDown className="w-5 h-5 text-rose-400 stroke-[2.5]" />
                  <span className="text-[9px] font-extrabold font-mono text-rose-300">П [.]</span>
                </TouchButton>
              </div>
            ) : (
              <TouchButton
                inputKey="backward"
                inputRef={inputRef}
                hapticMs={15}
                className="w-16 h-22 bg-slate-950/95 border border-slate-700 text-slate-200 rounded-xl flex items-center justify-center shadow-2xl"
                activeClassName="bg-slate-800 text-white border-slate-500"
              >
                <ChevronDown className="w-8 h-8 text-rose-400 stroke-[3]" />
              </TouchButton>
            )}

            {/* ACCELERATOR PEDAL (GAS) */}
            <TouchButton
              inputKey="forward"
              inputRef={inputRef}
              hapticMs={15}
              className="w-18 h-26 bg-slate-950/95 border border-slate-600 text-slate-100 rounded-xl flex items-center justify-center shadow-2xl"
              activeClassName="bg-slate-800 text-white border-slate-400"
            >
              <ChevronUp className="w-9 h-9 text-emerald-400 stroke-[3]" />
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
              className="w-16 h-16 bg-slate-950/95 border border-slate-700 text-slate-300 rounded-xl flex items-center justify-center shadow-xl"
              activeClassName="bg-slate-800 text-white border-slate-500"
            >
              <RotateCcw className="w-6 h-6 text-slate-200" />
            </TouchButton>

            {/* SPRINT BUTTON (SHIFT) */}
            <TouchButton
              inputKey="sprint"
              inputRef={inputRef}
              hapticMs={20}
              className="w-20 h-20 bg-slate-950/95 border border-slate-700 text-slate-200 rounded-xl flex items-center justify-center shadow-2xl"
              activeClassName="bg-slate-800 text-white border-slate-500"
            >
              <Zap className="w-6 h-6 text-slate-200" />
            </TouchButton>
          </div>
        )}
      </div>

    </div>
  );
};

