import React from 'react';
import { InteractionTarget } from '../interactionSystem';
import {
  Car,
  Wrench,
  Fuel,
  Droplet,
  Home,
  ChevronsUpDown,
  ShoppingCart,
  Coins,
  Sparkles,
  Link,
  Power,
  Trash2,
  ShieldCheck,
  Compass,
  ArrowRightLeft,
  Key,
  Layers,
  Store,
  Briefcase
} from 'lucide-react';

interface ContextInteractionHUDProps {
  target: InteractionTarget | null;
  onExecute: () => void;
  isMobileTouch?: boolean;
}

// Map target.type to specific Lucide icons for maximum visual variety
const getIconForType = (type: string) => {
  switch (type) {
    case 'enter_vehicle':
      return <Car className="w-5 h-5 text-white" />;
    case 'exit_vehicle':
      return <ArrowRightLeft className="w-5 h-5 text-white" />;
    case 'open_hood':
      return <Wrench className="w-5 h-5 text-white" />;
    case 'fuel_insert':
    case 'pump_take_nozzle':
    case 'pump_return_nozzle':
      return <Fuel className="w-5 h-5 text-white" />;
    case 'water_hose_take':
    case 'water_hose_stow':
      return <Droplet className="w-5 h-5 text-white" />;
    case 'enter_building':
    case 'exit_building':
      return <Home className="w-5 h-5 text-white" />;
    case 'building_elevator':
      return <ChevronsUpDown className="w-5 h-5 text-white" />;
    case 'building_shop':
      return <Store className="w-5 h-5 text-white" />;
    case 'gas_cashier':
      return <Coins className="w-5 h-5 text-white" />;
    case 'pickup_item':
      return <Sparkles className="w-5 h-5 text-white" />;
    case 'pickup_litter':
      return <Trash2 className="w-5 h-5 text-white" />;
    case 'trailer_hitch':
    case 'trailer_unhitch':
      return <Link className="w-5 h-5 text-white" />;
    case 'trailer_connect_plug':
    case 'trailer_connect_brakes':
      return <Power className="w-5 h-5 text-white" />;
    case 'trailer_toggle_handbrake':
      return <ShieldCheck className="w-5 h-5 text-white" />;
    case 'eco_recycle':
    case 'trash_throw':
      return <Trash2 className="w-5 h-5 text-white" />;
    default:
      return <Compass className="w-5 h-5 text-white" />;
  }
};

export const ContextInteractionHUD: React.FC<ContextInteractionHUDProps> = ({
  target,
  onExecute,
  isMobileTouch
}) => {
  if (!target || target.type === 'hand_item' || target.type === 'exit_vehicle') {
    return null;
  }

  const isF = target.primaryKey === 'F';
  const glowClass = isF
    ? 'shadow-[0_0_20px_rgba(52,211,153,0.3)] border-emerald-400'
    : 'shadow-[0_0_20px_rgba(56,189,248,0.3)] border-sky-400';

  const badgeBgClass = isF ? 'bg-emerald-950/90 border-emerald-500/50' : 'bg-sky-950/90 border-sky-500/50';

  return (
    <div
      id="context-interaction-hud-overlay"
      className="fixed pointer-events-none select-none z-50 flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150"
      style={{ left: 0, top: 0, display: 'none' }}
    >
      {/* 1. Ground Radial Glow */}
      <div className={`absolute w-12 h-12 rounded-full blur-md opacity-40 bg-gradient-to-r ${isF ? 'from-emerald-400 to-teal-500' : 'from-sky-400 to-blue-500'}`} />

      {/* 2. Double Rotating Outer Lace Rings */}
      <div className="absolute w-14 h-14 flex items-center justify-center">
        {/* Outer dashed spinning ring */}
        <div
          className={`absolute w-full h-full rounded-full border-2 border-dashed ${isF ? 'border-emerald-400/60' : 'border-sky-400/60'} animate-[spin_8s_linear_infinite]`}
        />
        {/* Inner reverse-spinning dashed ring */}
        <div
          className={`absolute w-11 h-11 rounded-full border border-dashed ${isF ? 'border-emerald-500/40' : 'border-sky-500/40'} animate-[spin_4s_linear_infinite_reverse]`}
        />
      </div>

      {/* 3. Central Glassmorphic Disc with Vector Icon */}
      <div
        className={`relative w-10 h-10 rounded-full flex items-center justify-center bg-slate-900/95 border-2 ${glowClass} backdrop-blur-sm z-10`}
      >
        {getIconForType(target.type)}
      </div>

      {/* 4. Action Key Badges (Primary + Available Secondary Keys) */}
      <div className="mt-2 flex items-center gap-1.5 z-10">
        <div
          className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold text-white tracking-wide shadow-md ${badgeBgClass}`}
        >
          [{target.primaryKey}]
        </div>
        {target.availableKeys && target.availableKeys.map(ak => {
          const isAkF = ak.key === 'F';
          const akBadgeBg = isAkF ? 'bg-emerald-950/85 border-emerald-500/50 text-emerald-200' : 'bg-amber-950/85 border-amber-500/50 text-amber-200';
          const shortLabel = ak.key === 'F' ? 'Убрать' : ak.key === 'R' ? 'Повернуть' : ak.title;
          return (
            <div
              key={ak.key}
              className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-semibold tracking-wide shadow-sm ${akBadgeBg}`}
            >
              [{ak.key}] {shortLabel}
            </div>
          );
        })}
      </div>

      {/* 5. Action Title below Badge */}
      {target.actionTitle && (
        <div className="mt-1 text-[11px] font-semibold text-slate-100 bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800/60 backdrop-blur-sm shadow-md whitespace-nowrap z-10">
          {target.actionTitle}
        </div>
      )}
    </div>
  );
};
