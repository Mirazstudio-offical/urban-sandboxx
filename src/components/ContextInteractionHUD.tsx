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
  Briefcase,
  Bus,
  Armchair,
  LogOut,
  UserCheck
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
      return <Car className="w-4 h-4 text-[#e5a94e]" />;
    case 'exit_vehicle':
      return <ArrowRightLeft className="w-4 h-4 text-[#e5a94e]" />;
    case 'enter_bus_saloon':
    case 'enter_passenger_car':
      return <Bus className="w-4 h-4 text-[#e5a94e]" />;
    case 'exit_bus_saloon':
    case 'exit_passenger_car':
      return <LogOut className="w-4 h-4 text-[#e5a94e]" />;
    case 'sit_seat':
      return <Armchair className="w-4 h-4 text-[#e5a94e]" />;
    case 'stand_up':
      return <UserCheck className="w-4 h-4 text-[#e5a94e]" />;
    case 'open_hood':
      return <Wrench className="w-4 h-4 text-[#e5a94e]" />;
    case 'fuel_insert':
    case 'pump_take_nozzle':
    case 'pump_return_nozzle':
      return <Fuel className="w-4 h-4 text-[#e5a94e]" />;
    case 'water_hose_take':
    case 'water_hose_stow':
      return <Droplet className="w-4 h-4 text-[#e5a94e]" />;
    case 'enter_building':
    case 'exit_building':
      return <Home className="w-4 h-4 text-[#e5a94e]" />;
    case 'building_elevator':
      return <ChevronsUpDown className="w-4 h-4 text-[#e5a94e]" />;
    case 'building_shop':
      return <Store className="w-4 h-4 text-[#e5a94e]" />;
    case 'gas_cashier':
      return <Coins className="w-4 h-4 text-[#e5a94e]" />;
    case 'pickup_item':
      return <Sparkles className="w-4 h-4 text-[#e5a94e]" />;
    case 'pickup_litter':
      return <Trash2 className="w-4 h-4 text-[#e5a94e]" />;
    case 'trailer_hitch':
    case 'trailer_unhitch':
      return <Link className="w-4 h-4 text-[#e5a94e]" />;
    case 'trailer_connect_plug':
    case 'trailer_connect_brakes':
      return <Power className="w-4 h-4 text-[#e5a94e]" />;
    case 'trailer_toggle_handbrake':
      return <ShieldCheck className="w-4 h-4 text-[#e5a94e]" />;
    case 'eco_recycle':
    case 'trash_throw':
      return <Trash2 className="w-4 h-4 text-[#e5a94e]" />;
    default:
      return <Compass className="w-4 h-4 text-[#e5a94e]" />;
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

  return (
    <div
      id="context-interaction-hud-overlay"
      className="fixed pointer-events-none select-none z-50 flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150"
      style={{ left: 0, top: 0, display: 'none' }}
    >
      {/* 1. BeamNG Crisp Technical Frame */}
      <div className="relative flex items-center gap-2 bg-[rgba(20,22,26,0.92)] border border-[#c68a35]/60 shadow-[0_4px_20px_rgba(0,0,0,0.8)] px-2.5 py-1.5 rounded-[2px] backdrop-blur-md z-10">
        
        {/* Left Ochre Accent Tag */}
        <div className="w-[3px] self-stretch bg-[#c68a35] -ml-1 rounded-[1px]" />

        {/* Icon Frame */}
        <div className="p-1 bg-[#14161a] border border-white/[0.08] rounded-[2px] flex items-center justify-center">
          {getIconForType(target.type)}
        </div>

        {/* Action Title & Key Badge */}
        <div className="flex items-center gap-2">
          {target.actionTitle && (
            <span className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6]">
              {target.actionTitle}
            </span>
          )}

          <div className="px-1.5 py-0.5 bg-[#c68a35]/15 border border-[#c68a35]/60 text-[#e5a94e] font-mono text-[10px] font-black rounded-[2px] tracking-wider">
            [{target.primaryKey}]
          </div>

          {target.availableKeys && target.availableKeys.map(ak => {
            const shortLabel = ak.key === 'F' ? 'Убрать' : ak.key === 'R' ? 'Повернуть' : ak.title;
            return (
              <div
                key={ak.key}
                className="px-1.5 py-0.5 bg-white/[0.05] border border-white/10 text-[#8b929e] font-mono text-[9px] font-bold rounded-[2px]"
              >
                [{ak.key}] {shortLabel}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
