import React from 'react';
import { InteractionTarget } from '../interactionSystem';
import {
  Car,
  Wrench,
  Fuel,
  Droplet,
  Home,
  ChevronsUpDown,
  Coins,
  Sparkles,
  Link,
  Power,
  Trash2,
  ShieldCheck,
  Compass,
  ArrowRightLeft,
  Store,
  Bus,
  Armchair,
  LogOut,
  UserCheck,
  Layers
} from 'lucide-react';

interface ContextInteractionHUDProps {
  target: InteractionTarget | null;
  onExecute: () => void;
  isMobileTouch?: boolean;
}

// Clean Lucide icons mapping with unified subtle amber accent
const getIconForType = (type: string) => {
  const iconClass = "w-3.5 h-3.5 text-[#e5a94e]";
  switch (type) {
    case 'enter_vehicle':
      return <Car className={iconClass} />;
    case 'exit_vehicle':
      return <ArrowRightLeft className={iconClass} />;
    case 'enter_bus_saloon':
    case 'enter_passenger_car':
      return <Bus className={iconClass} />;
    case 'exit_bus_saloon':
    case 'exit_passenger_car':
      return <LogOut className={iconClass} />;
    case 'sit_seat':
      return <Armchair className={iconClass} />;
    case 'stand_up':
      return <UserCheck className={iconClass} />;
    case 'open_hood':
      return <Wrench className={iconClass} />;
    case 'fuel_insert':
    case 'pump_take_nozzle':
    case 'pump_return_nozzle':
      return <Fuel className={iconClass} />;
    case 'water_hose_take':
    case 'water_hose_stow':
    case 'vacuum_gate_valve_toggle':
    case 'vacuum_pump_panel':
    case 'vacuum_hose_mode_toggle':
      return <Droplet className={iconClass} />;
    case 'enter_building':
    case 'exit_building':
      return <Home className={iconClass} />;
    case 'building_elevator':
      return <ChevronsUpDown className={iconClass} />;
    case 'building_shop':
      return <Store className={iconClass} />;
    case 'gas_cashier':
      return <Coins className={iconClass} />;
    case 'pickup_item':
      return <Sparkles className={iconClass} />;
    case 'pickup_litter':
    case 'trash_throw':
    case 'eco_recycle':
      return <Trash2 className={iconClass} />;
    case 'trailer_hitch':
    case 'trailer_unhitch':
      return <Link className={iconClass} />;
    case 'trailer_connect_plug':
    case 'trailer_connect_brakes':
      return <Power className={iconClass} />;
    case 'trailer_toggle_handbrake':
      return <ShieldCheck className={iconClass} />;
    default:
      return <Compass className={iconClass} />;
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

  // If this is a personal action like standing up from a chair, show it docked at the bottom center of the screen
  if (target.isSelfAction) {
    return (
      <div
        id="context-interaction-hud-self-overlay"
        className="fixed bottom-14 left-1/2 -translate-x-1/2 z-50 pointer-events-auto select-none flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[rgba(18,20,24,0.92)] border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.6)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150"
      >
        <div className="flex items-center justify-center w-6 h-6 rounded bg-[#20242c] border border-white/10 text-[#f0f3f6]">
          {getIconForType(target.type)}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-[#f0f3f6] leading-tight">
            {target.actionTitle}
          </span>
          {target.detail && (
            <span className="text-[10px] text-[#8e95a2] leading-tight mt-0.5">
              {target.detail}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onExecute}
          className="ml-1.5 px-2 py-0.5 rounded bg-[#c9922b]/20 hover:bg-[#c9922b]/35 border border-[#c9922b]/60 text-[#f0c264] font-mono text-[11px] font-bold tracking-wider active:scale-95 transition-all cursor-pointer"
        >
          {target.primaryKey}
        </button>
      </div>
    );
  }

  return (
    <div
      id="context-interaction-hud-overlay"
      className="fixed pointer-events-none select-none z-50 transition-opacity duration-150"
      style={{ left: 0, top: 0, display: 'none' }}
    >
      {/* 
        World Leader Pin & Line System:
        (0, 0) is the exact physical world target anchor.
        We draw an SVG anchor dot with leader line going up & right to the HUD card.
      */}
      <div className="relative pointer-events-none">
        
        {/* SVG Leader Line connecting physical target point (0, 0) to card anchor (24, -36) */}
        <svg 
          className="absolute overflow-visible pointer-events-none" 
          style={{ left: 0, top: 0, width: 60, height: 50 }}
        >
          {/* Outer diffuse anchor ring */}
          <circle cx="0" cy="0" r="4.5" fill="none" stroke="rgba(201, 146, 43, 0.4)" strokeWidth="1" />
          {/* Crisp center anchor pin on target */}
          <circle cx="0" cy="0" r="2.2" fill="#e5a94e" />

          {/* Leader elbow line: (0,0) -> (12, -18) -> (24, -28) */}
          <path
            d="M 0 0 L 10 -16 L 22 -26"
            fill="none"
            stroke="rgba(201, 146, 43, 0.7)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Compact, clean interaction card offset by (22, -26) */}
        <div
          className="absolute flex flex-col gap-1.5 p-2 rounded-md bg-[rgba(18,20,24,0.94)] border border-white/10 shadow-[0_8px_28px_rgba(0,0,0,0.65)] backdrop-blur-md z-10"
          style={{ left: '22px', bottom: '26px', minWidth: '150px', maxWidth: '240px' }}
        >
          {/* Primary Action Row */}
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded bg-[#c9922b]/20 border border-[#c9922b]/60 text-[#f0c264] font-mono text-[11px] font-black shrink-0 shadow-xs">
              {target.primaryKey}
            </span>
            <div className="flex flex-col min-w-0 pr-1">
              <span className="text-xs font-semibold text-[#f0f3f6] leading-tight truncate">
                {target.actionTitle}
              </span>
              {target.detail && (
                <span className="text-[10px] text-[#8e95a2] leading-tight truncate mt-0.5">
                  {target.detail}
                </span>
              )}
            </div>
            <div className="ml-auto shrink-0 opacity-80">
              {getIconForType(target.type)}
            </div>
          </div>

          {/* Secondary Keys Stack (if any: e.g. R - Повернуть, F - Убрать) */}
          {target.availableKeys && target.availableKeys.length > 0 && (
            <div className="pt-1.5 mt-0.5 border-t border-white/[0.08] flex flex-col gap-1">
              {target.availableKeys.map(ak => (
                <div key={ak.key} className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-4 h-4 rounded bg-white/[0.08] border border-white/15 text-[#cbd5e1] font-mono text-[9px] font-bold shrink-0">
                    {ak.key}
                  </span>
                  <span className="text-[11px] text-[#cbd5e1] leading-tight truncate">
                    {ak.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
