import React from 'react';
import { VehicleControlTheme } from './vehicleControlStyles';

interface ShiftKnobModelProps {
  theme: VehicleControlTheme;
  isAuto: boolean;
  isTractor: boolean;
  is6Speed: boolean;
  currentGearKey: string;
  localRange?: 1 | 2;
  tiltX: number;
  tiltY: number;
}

export const ShiftKnobModel: React.FC<ShiftKnobModelProps> = ({
  theme,
  isAuto,
  isTractor,
  is6Speed,
  currentGearKey,
  localRange = 1,
  tiltX,
  tiltY,
}) => {
  // Normalize current active gear label
  const activeGear = currentGearKey;

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{
        transform: `perspective(300px) rotateX(${tiltY * 0.25}deg) rotateY(${tiltX * 0.25}deg)`,
        transition: 'transform 0.08s ease-out',
      }}
    >
      {/* ========================================================================= */}
      {/* 1. RETRO: THE LEGENDARY SOVIET EPOXY ROSE KNOB («РОЗОЧКА В ЭПОКСИДКЕ»)   */}
      {/* ========================================================================= */}
      {theme === 'retro' && (
        <div
          className="relative w-14 h-14 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.8)] flex items-center justify-center overflow-hidden border border-amber-300/40"
          style={{
            background: 'radial-gradient(circle at 35% 30%, rgba(254, 243, 199, 0.95) 0%, rgba(245, 158, 11, 0.85) 45%, rgba(180, 83, 9, 0.95) 85%, #451a03 100%)',
          }}
        >
          {/* Faceted Crystal Edge Reflections */}
          <div className="absolute inset-1 rounded-full border border-white/40 pointer-events-none" />
          <div className="absolute top-1 left-2 w-5 h-2.5 bg-white/60 rounded-full blur-[1px] transform -rotate-25 pointer-events-none" />

          {/* 3D Handcrafted Miniature Rose Flower Encased in Amber Resin */}
          <svg viewBox="0 0 40 40" className="w-9 h-9 drop-shadow-md">
            {/* Emerald Green Stem & Tiny Leaves */}
            <path d="M 20 28 Q 18 34 20 37" stroke="#15803d" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 19 32 Q 13 30 14 27 Q 18 28 19 32" fill="#16a34a" />
            <path d="M 21 30 Q 27 28 26 25 Q 22 26 21 30" fill="#15803d" />

            {/* Crimson Rose Petals Spiral */}
            {/* Outer Petals */}
            <path d="M 12 21 C 11 15, 17 12, 20 12 C 23 12, 29 15, 28 21 C 27 26, 13 26, 12 21 Z" fill="#991b1b" />
            <path d="M 14 18 C 13 13, 20 10, 24 13 C 27 15, 26 22, 22 24 C 17 24, 14 22, 14 18 Z" fill="#b91c1c" />
            <path d="M 16 16 C 15 12, 22 11, 24 14 C 25 17, 23 21, 20 21 C 17 21, 16 18, 16 16 Z" fill="#dc2626" />
            {/* Center Rose Bud Core */}
            <path d="M 18 16 Q 20 14 22 16 Q 20 19 18 16" fill="#f87171" />

            {/* Microscopic Suspended Air Bubbles in Amber */}
            <circle cx="27" cy="12" r="0.8" fill="#ffffff" opacity="0.8" />
            <circle cx="12" cy="27" r="0.6" fill="#ffffff" opacity="0.7" />
            <circle cx="28" cy="25" r="0.7" fill="#ffffff" opacity="0.75" />
          </svg>

          {/* Active Gear Display floating in crystal */}
          <div className="absolute bottom-1 bg-black/60 backdrop-blur-xs px-1.5 py-0.2 rounded text-[8px] font-black font-mono text-amber-200 border border-amber-400/40">
            {activeGear}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2a. MACHINERY: INDUSTRIAL HYDROSTATIC DRIVE JOYSTICK (ДЖОЙСТИК ХОДА ГСТ)  */}
      {/* ========================================================================= */}
      {theme === 'machinery' && (
        <div
          className="relative w-14 h-14 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.85),inset_0_2px_4px_rgba(255,255,255,0.2)] flex flex-col items-center justify-center border-2 border-amber-600/80"
          style={{
            background: 'linear-gradient(145deg, #292524 0%, #1c1917 50%, #0c0a09 100%)',
          }}
        >
          {/* Construction safety warning chevron trim */}
          <div className="absolute top-1 w-11 h-1.5 rounded-xs bg-amber-500 flex items-center justify-around overflow-hidden shadow-xs">
            <div className="w-1.5 h-3 bg-black -skew-x-25" />
            <div className="w-1.5 h-3 bg-black -skew-x-25" />
            <div className="w-1.5 h-3 bg-black -skew-x-25" />
          </div>

          {/* Hydrostatic Gate Display */}
          <div className="w-11 h-9 mt-1 rounded-xl bg-stone-950 border border-amber-500/50 flex flex-col items-center justify-center shadow-inner p-0.5">
            <div className="text-[7px] font-black font-mono text-amber-400 tracking-wider mb-0.5">
              ГСТ · ХОД
            </div>
            {/* 3-position hydrostatic gate: F (Drive), N (Stop), R (Reverse) */}
            <div className="flex items-center gap-1 text-[8.5px] font-black font-mono">
              <span className={activeGear === 'D' || activeGear === 'F' || activeGear === '1' ? 'text-emerald-400 bg-emerald-950/90 px-1 py-0.2 rounded border border-emerald-500 scale-110 shadow-xs' : 'text-stone-500'}>F</span>
              <span className={activeGear === 'N' || activeGear === 'P' || activeGear === '0' ? 'text-amber-400 bg-amber-950/90 px-1 py-0.2 rounded border border-amber-500 scale-110 shadow-xs' : 'text-stone-500'}>N</span>
              <span className={activeGear === 'R' || activeGear === '-1' ? 'text-rose-400 bg-rose-950/90 px-1 py-0.2 rounded border border-rose-500 scale-110 shadow-xs' : 'text-stone-500'}>R</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2b. TRACTOR: SOVIET MTZ-80/82 EBONITE TEARDROP KNOB WITH BRASS COLLAR     */}
      {/* ========================================================================= */}
      {theme === 'tractor' && (
        <div
          className="relative w-14 h-14 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.8),inset_0_2px_3px_rgba(255,255,255,0.2)] flex flex-col items-center justify-center border-2 border-stone-800"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #44403c 0%, #1c1917 60%, #0c0a09 100%)',
          }}
        >
          {/* Heavy Brass Threaded Base Ring */}
          <div className="absolute -bottom-1 w-8 h-2 rounded-full bg-linear-to-r from-amber-700 via-amber-400 to-amber-800 border border-amber-900 shadow-sm" />

          {/* Authentic MTZ Gear Scheme Cap */}
          <div className="w-10 h-10 rounded-full bg-stone-900/90 border border-amber-600/60 flex flex-col items-center justify-center shadow-inner p-1">
            <div className="text-[7.5px] font-black font-mono text-amber-400 leading-none mb-0.5">
              МТЗ · {localRange === 1 ? 'I ДИАП' : 'II ДИАП'}
            </div>
            {/* 4-Track MTZ Layout Mini Grid */}
            <div className="grid grid-cols-4 gap-0.5 text-[6.5px] font-black font-mono leading-none text-stone-300">
              <span className={activeGear === 'R' ? 'text-amber-400 font-black scale-110' : 'opacity-60'}>R</span>
              <span className={activeGear === '1' ? 'text-amber-400 font-black scale-110' : 'opacity-60'}>1</span>
              <span className={activeGear === '3' ? 'text-amber-400 font-black scale-110' : 'opacity-60'}>3</span>
              <span className={activeGear === '4' ? 'text-amber-400 font-black scale-110' : 'opacity-60'}>4</span>
              <span className={activeGear === '9' ? 'text-amber-400 font-black scale-110' : 'opacity-60'}>9</span>
              <span className={activeGear === '2' ? 'text-amber-400 font-black scale-110' : 'opacity-60'}>2</span>
              <span className={activeGear === '5' ? 'text-amber-400 font-black scale-110' : 'opacity-60'}>5</span>
              <span className={activeGear === '6' ? 'text-amber-400 font-black scale-110' : 'opacity-60'}>6</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TRUCK: COMMERCIAL TRUCK KNOB WITH SPLITTER TOGGLE SWITCH (ЗИЛ/КАМАЗ)   */}
      {/* ========================================================================= */}
      {theme === 'truck' && (
        <div
          className="relative w-14 h-14 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.2)] flex items-center justify-center border-2 border-slate-700"
          style={{
            background: 'linear-gradient(145deg, #27272a 0%, #18181b 50%, #09090b 100%)',
          }}
        >
          {/* HIGH-LOW RANGE SPLITTER FLIPPER SWITCH (ФЛАЖОК ДЕЛИЕТЛЯ) on the left */}
          <div
            className="absolute -left-2.5 top-2 w-3.5 h-7 rounded-r-md bg-linear-to-b from-sky-400 to-sky-700 border border-sky-300 shadow-md flex items-center justify-center"
            title="Делитель передач"
          >
            <div className="w-1 h-3 bg-white/80 rounded-full" />
          </div>

          {/* High-Contrast Commercial Truck Gear Cap */}
          <div className="w-10 h-10 rounded-xl bg-slate-950 border border-sky-500/50 flex flex-col items-center justify-center shadow-inner">
            <div className="text-[7px] font-black font-mono text-sky-400 tracking-wider mb-0.5">
              {isAuto ? 'АКПП' : is6Speed ? '6-СТУП' : '5-СТУП'}
            </div>
            {/* Gear scheme or active gear badge */}
            <div className="flex items-center gap-1">
              <span className="text-xs font-black font-mono text-white bg-sky-950 px-1.5 py-0.5 rounded border border-sky-400">
                {activeGear}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SPORT: FORGED CARBON & BILLET ALUMINUM RACING KNOB (RED ACCENTS)       */}
      {/* ========================================================================= */}
      {theme === 'sport' && (
        <div
          className="relative w-13 h-13 rounded-full shadow-[0_8px_24px_rgba(239,68,68,0.35),inset_0_2px_4px_rgba(255,255,255,0.4)] flex items-center justify-center border-2 border-red-600"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #334155 0%, #0f172a 60%, #020617 100%)',
          }}
        >
          {/* Anodized Crimson Red Accent Ring */}
          <div className="absolute inset-0.5 rounded-full border-2 border-red-500 pointer-events-none" />

          {/* Brushed Billet Aluminum Top Cap */}
          <div
            className="w-8.5 h-8.5 rounded-full border border-red-400/80 flex flex-col items-center justify-center shadow-inner"
            style={{
              background: 'radial-gradient(circle, #f8fafc 0%, #cbd5e1 50%, #64748b 100%)',
            }}
          >
            <div className="text-[6.5px] font-black font-mono text-red-600 leading-none">SPORT</div>
            <div className="text-sm font-black font-mono text-slate-950 leading-none mt-0.5">
              {activeGear}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. LUXURY: FACETED CRYSTAL & PIANO-BLACK YACHT SELECTOR                   */}
      {/* ========================================================================= */}
      {theme === 'luxury' && (
        <div
          className="relative w-14 h-14 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.7),inset_0_2px_5px_rgba(255,255,255,0.7)] flex items-center justify-center border border-slate-400/60"
          style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 25%, #1e293b 60%, #090d16 100%)',
          }}
        >
          {/* Beveled Smoked Crystal Face with Ambient LED Backlight */}
          <div className="w-10 h-10 rounded-xl bg-slate-950/90 border border-slate-600 flex flex-col items-center justify-center shadow-inner">
            <div className="text-[7px] font-black font-sans text-slate-400 tracking-widest uppercase">
              SELECT
            </div>
            <div className="text-base font-black font-mono text-sky-300 drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]">
              {activeGear}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. OFFROAD: 4x4 TIRE-TREAD NON-SLIP RUBBER KNOB                          */}
      {/* ========================================================================= */}
      {theme === 'offroad' && (
        <div
          className="relative w-13 h-13 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.2)] flex items-center justify-center border-2 border-emerald-600"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #1e293b 0%, #0f172a 70%, #020617 100%)',
          }}
        >
          {/* Tire-Tread Notches around outer edge */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <div
              key={deg}
              className="absolute w-1 h-2 bg-emerald-800 rounded-xs"
              style={{
                top: `${24 + 23 * Math.sin((deg * Math.PI) / 180)}px`,
                left: `${24 + 23 * Math.cos((deg * Math.PI) / 180)}px`,
              }}
            />
          ))}

          {/* Stamped 4x4 Cap */}
          <div className="w-9 h-9 rounded-full bg-slate-900 border border-emerald-500/60 flex flex-col items-center justify-center shadow-inner">
            <div className="text-[6.5px] font-black font-mono text-emerald-400">4WD</div>
            <div className="text-sm font-black font-mono text-white leading-none">
              {activeGear}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. EMERGENCY: HIGH-VISIBILITY FLEET SERVICE KNOB                          */}
      {theme === 'emergency' && (
        <div
          className="relative w-13 h-13 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.8)] flex items-center justify-center border-2 border-sky-500"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #1e293b 0%, #090d16 100%)',
          }}
        >
          <div className="w-9 h-9 rounded-full bg-slate-950 border border-sky-400 flex flex-col items-center justify-center shadow-inner">
            <div className="text-[6.5px] font-black font-mono text-sky-400">СЛУЖБА</div>
            <div className="text-sm font-black font-mono text-sky-200 leading-none">
              {activeGear}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. STANDARD: MODERN ERGONOMIC TEARDROP CIVILIAN LEATHER/COMPOSITE KNOB   */}
      {theme === 'standard' && (
        <div
          className="relative w-13 h-13 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.7),inset_0_2px_4px_rgba(255,255,255,0.2)] flex items-center justify-center border-2 border-slate-500"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #334155 0%, #1e293b 60%, #0f172a 100%)',
          }}
        >
          {/* Chrome Trim Ring */}
          <div className="absolute inset-1 rounded-full border border-slate-400/40 pointer-events-none" />

          {/* Glossy Curved Lens Cap */}
          <div className="w-8.5 h-8.5 rounded-full bg-slate-950 border border-slate-400 flex flex-col items-center justify-center shadow-inner">
            <div className="text-[6.5px] font-bold font-mono text-slate-400">GEAR</div>
            <div className="text-sm font-black font-mono text-white leading-none">
              {activeGear}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
