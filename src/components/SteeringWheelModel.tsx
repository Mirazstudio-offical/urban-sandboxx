import React from 'react';
import { VehicleControlTheme } from './vehicleControlStyles';

interface SteeringWheelModelProps {
  theme: VehicleControlTheme;
  isHornActive: boolean;
  carType?: string;
}

export const SteeringWheelModel: React.FC<SteeringWheelModelProps> = ({
  theme,
  isHornActive,
  carType,
}) => {
  return (
    <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-2xl">
      <defs>
        {/* COMMON: High-contrast Chrome Gradient */}
        <linearGradient id="chromeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="28%" stopColor="#cbd5e1" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="75%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>

        {/* COMMON: Brushed Titanium Spoke Gradient */}
        <linearGradient id="titaniumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        {/* TRACTOR: Heavy Industrial Bakelite / Ebonite Rim */}
        <radialGradient id="tractorBakelite" cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="#1c1917" />
          <stop offset="88%" stopColor="#292524" />
          <stop offset="100%" stopColor="#0c0a09" />
        </radialGradient>

        {/* TRACTOR: Spinner Knob Body */}
        <radialGradient id="spinnerKnobGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#44403c" />
          <stop offset="60%" stopColor="#1c1917" />
          <stop offset="100%" stopColor="#0c0a09" />
        </radialGradient>

        {/* TRUCK: Heavy Commercial Polyurethane Rim */}
        <radialGradient id="truckRimGrad" cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="#18181b" />
          <stop offset="90%" stopColor="#27272a" />
          <stop offset="100%" stopColor="#09090b" />
        </radialGradient>

        {/* RETRO: Vintage Glossy Ivory Enamel */}
        <radialGradient id="retroIvoryGrad" cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#fef3c7" />
          <stop offset="85%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>

        {/* RETRO: Ruby Enamel Center Crest */}
        <radialGradient id="retroRubyGrad" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="90%" stopColor="#7f1d1d" />
          <stop offset="100%" stopColor="#450a0a" />
        </radialGradient>

        {/* SPORT: Carbon Fiber Twill Grid Pattern */}
        <pattern id="carbonPattern" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="2" height="2" fill="#1e293b" />
          <rect x="2" width="2" height="2" fill="#0f172a" />
          <rect y="2" width="2" height="2" fill="#0f172a" />
          <rect x="2" y="2" width="2" height="2" fill="#334155" />
        </pattern>

        {/* SPORT: Anodized Red Aluminum */}
        <linearGradient id="anodizedRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="40%" stopColor="#ef4444" />
          <stop offset="80%" stopColor="#b91c1c" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>

        {/* LUXURY: Dark Walnut Burl Wood Grain */}
        <radialGradient id="walnutWoodGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#92400e" />
          <stop offset="40%" stopColor="#78350f" />
          <stop offset="75%" stopColor="#451a03" />
          <stop offset="100%" stopColor="#291102" />
        </radialGradient>

        {/* LUXURY: Satin Champagne Silver */}
        <linearGradient id="satinSilverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="50%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        {/* OFFROAD: Tactical Poly & Hex Bolts */}
        <radialGradient id="offroadRimGrad" cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="#0f172a" />
          <stop offset="90%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>

        {/* MACHINERY: Heavy High-Grip Industrial Polyurethane & Amber Warning Rim */}
        <radialGradient id="machineryRimGrad" cx="50%" cy="50%" r="50%">
          <stop offset="68%" stopColor="#1c1917" />
          <stop offset="85%" stopColor="#292524" />
          <stop offset="100%" stopColor="#0c0a09" />
        </radialGradient>
        <radialGradient id="machineryKnobGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#451a03" />
        </radialGradient>
      </defs>

      {/* ========================================================================= */}
      {/* 0. MACHINERY: ROAD CONSTRUCTION & INDUSTRIAL MACHINERY WITH SPINNER KNOB */}
      {/* ========================================================================= */}
      {theme === 'machinery' && (
        <g id="machinery-steering-model">
          {/* Heavy Textured Industrial Outer Rim */}
          <circle cx="70" cy="70" r="61" stroke="url(#machineryRimGrad)" strokeWidth="16" fill="none" />
          {/* Outer & Inner Industrial Molding Beads */}
          <circle cx="70" cy="70" r="68.5" stroke="#78350f" strokeWidth="1.2" fill="none" opacity="0.8" />
          <circle cx="70" cy="70" r="53" stroke="#451a03" strokeWidth="1.2" fill="none" opacity="0.9" />

          {/* Industrial Grip Notches around Rim */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <line
              key={deg}
              x1={70 + 54 * Math.cos((deg * Math.PI) / 180)}
              y1={70 + 54 * Math.sin((deg * Math.PI) / 180)}
              x2={70 + 68 * Math.cos((deg * Math.PI) / 180)}
              y2={70 + 68 * Math.sin((deg * Math.PI) / 180)}
              stroke="#eab308"
              strokeWidth="1.2"
              opacity="0.45"
            />
          ))}

          {/* 3 Heavy Industrial Steel Spokes with Weight-Reduction Cutouts */}
          {/* Bottom vertical spoke (6 o'clock) */}
          <path d="M 63 116 L 65 82 L 75 82 L 77 116 Z" fill="#1c1917" stroke="#854d0e" strokeWidth="1.2" />
          <circle cx="70" cy="98" r="3" fill="#0c0a09" stroke="#78350f" strokeWidth="0.8" />

          {/* Top-Right diagonal spoke (40 deg) */}
          <path d="M 106 36 L 79 61 L 73 54 L 98 29 Z" fill="#1c1917" stroke="#854d0e" strokeWidth="1.2" />
          <circle cx="89" cy="44" r="3" fill="#0c0a09" stroke="#78350f" strokeWidth="0.8" />

          {/* Top-Left diagonal spoke (140 deg) */}
          <path d="M 34 36 L 61 61 L 67 54 L 42 29 Z" fill="#1c1917" stroke="#854d0e" strokeWidth="1.2" />
          <circle cx="51" cy="44" r="3" fill="#0c0a09" stroke="#78350f" strokeWidth="0.8" />

          {/* Central Heavy Cast-Iron Hub with Amber Rim */}
          <circle cx="70" cy="70" r="23" fill="#1c1917" stroke="#eab308" strokeWidth="2.5" />
          <circle cx="70" cy="70" r="19" fill="#0c0a09" stroke="#854d0e" strokeWidth="1" />

          {/* 6 Heavy Industrial Hex Locking Bolts */}
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <circle
              key={deg}
              cx={70 + 16 * Math.cos((deg * Math.PI) / 180)}
              y={70 + 16 * Math.sin((deg * Math.PI) / 180)}
              r="1.4"
              fill="#fbbf24"
              stroke="#0c0a09"
              strokeWidth="0.4"
            />
          ))}

          {/* Center Horn / Machinery Indicator Badge */}
          <circle
            cx="70"
            cy="70"
            r="12"
            fill={isHornActive ? '#ca8a04' : '#1c1917'}
            stroke="#f59e0b"
            strokeWidth="1.2"
          />
          <text
            x="70"
            y="69"
            textAnchor="middle"
            fontSize="5.5"
            fontWeight="900"
            fill={isHornActive ? '#ffffff' : '#fbbf24'}
            fontFamily="monospace"
            letterSpacing="0.5"
          >
            {carType?.startsWith('roller_') ? 'КАТОК' : 'ГСТ'}
          </text>
          <text
            x="70"
            y="75"
            textAnchor="middle"
            fontSize="3.8"
            fontWeight="bold"
            fill={isHornActive ? '#ffffff' : '#d97706'}
            fontFamily="sans-serif"
          >
            {carType?.startsWith('paver_') ? 'УКЛАДЧИК' : 'СПЕЦТЕХ'}
          </text>

          {/* INDUSTRIAL RAPID-STEER SPINNER KNOB ("ЛЕНТЯЙКА") at 2 o'clock */}
          <g id="machinery-spinner-knob" transform="translate(108, 28)">
            {/* Cast Heavy Clamp Bracket */}
            <ellipse cx="0" cy="0" rx="9" ry="7" fill="url(#chromeGrad)" stroke="#1c1917" strokeWidth="1.2" />
            <circle cx="-5" cy="0" r="1" fill="#0c0a09" />
            <circle cx="5" cy="0" r="1" fill="#0c0a09" />
            {/* High-visibility Amber/Industrial Ergonomic Ball */}
            <circle cx="0" cy="-6" r="9.5" fill="url(#machineryKnobGrad)" stroke="#78350f" strokeWidth="1.5" />
            <circle cx="0" cy="-6" r="4.5" fill="#1c1917" stroke="#eab308" strokeWidth="0.8" />
            {/* Center Heavy Hex Pivot Nut */}
            <circle cx="0" cy="-6" r="2.2" fill="url(#chromeGrad)" stroke="#0c0a09" strokeWidth="0.5" />
          </g>
        </g>
      )}

      {/* ========================================================================= */}
      {/* 1. TRACTOR: SOVIET MTZ-80/82 BAKELITE WHEEL WITH AUTHENTIC SPINNER KNOB */}
      {/* ========================================================================= */}
      {theme === 'tractor' && (
        <g id="tractor-steering-model">
          {/* Heavy Bakelite Outer Rim */}
          <circle cx="70" cy="70" r="61" stroke="url(#tractorBakelite)" strokeWidth="16" fill="none" />
          {/* Outer & Inner Industrial Molding Beads */}
          <circle cx="70" cy="70" r="68.5" stroke="#44403c" strokeWidth="1" fill="none" opacity="0.6" />
          <circle cx="70" cy="70" r="53" stroke="#292524" strokeWidth="1.2" fill="none" opacity="0.8" />

          {/* Grip Scallop Ridges around the rim */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <line
              key={deg}
              x1={70 + 54 * Math.cos((deg * Math.PI) / 180)}
              y1={70 + 54 * Math.sin((deg * Math.PI) / 180)}
              x2={70 + 68 * Math.cos((deg * Math.PI) / 180)}
              y2={70 + 68 * Math.sin((deg * Math.PI) / 180)}
              stroke="#0c0a09"
              strokeWidth="1.2"
              opacity="0.35"
            />
          ))}

          {/* 3 Heavy Structural Spokes (at 6 o'clock, 2 o'clock, 10 o'clock) */}
          {/* Bottom vertical spoke */}
          <path d="M 64 116 L 66 84 L 74 84 L 76 116 Z" fill="#1c1917" stroke="#44403c" strokeWidth="1" />
          <line x1="70" y1="84" x2="70" y2="114" stroke="#0c0a09" strokeWidth="1.5" />

          {/* Top-Right diagonal spoke (40 deg) */}
          <path d="M 105 35 L 80 62 L 75 56 L 98 30 Z" fill="#1c1917" stroke="#44403c" strokeWidth="1" />
          <line x1="77" y1="59" x2="102" y2="33" stroke="#0c0a09" strokeWidth="1.5" />

          {/* Top-Left diagonal spoke (140 deg) */}
          <path d="M 35 35 L 60 62 L 65 56 L 42 30 Z" fill="#1c1917" stroke="#44403c" strokeWidth="1" />
          <line x1="63" y1="59" x2="38" y2="33" stroke="#0c0a09" strokeWidth="1.5" />

          {/* Central Heavy Industrial Hub */}
          <circle cx="70" cy="70" r="23" fill="#1c1917" stroke="#78350f" strokeWidth="2.5" />
          <circle cx="70" cy="70" r="19" fill="#0c0a09" stroke="#44403c" strokeWidth="1" />
          {/* Hex bolts on hub perimeter */}
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <circle
              key={deg}
              cx={70 + 16 * Math.cos((deg * Math.PI) / 180)}
              y={70 + 16 * Math.sin((deg * Math.PI) / 180)}
              r="1.4"
              fill="#d97706"
              stroke="#0c0a09"
              strokeWidth="0.4"
            />
          ))}

          {/* Horn Center Button with "БЕЛАРУС" text */}
          <circle cx="70" cy="70" r="12" fill={isHornActive ? '#b45309' : '#1c1917'} stroke="#d97706" strokeWidth="1.2" />
          <text
            x="70"
            y="69"
            textAnchor="middle"
            fontSize="5.5"
            fontWeight="900"
            fill={isHornActive ? '#fef08a' : '#fbbf24'}
            fontFamily="monospace"
            letterSpacing="0.5"
          >
            МТЗ
          </text>
          <text
            x="70"
            y="75"
            textAnchor="middle"
            fontSize="4"
            fontWeight="bold"
            fill={isHornActive ? '#ffffff' : '#d97706'}
            fontFamily="sans-serif"
          >
            БЕЛАРУС
          </text>

          {/* AUTHENTIC TRACTOR SPINNER KNOB ("ЛЕНТЯЙКА") at 10 o'clock */}
          <g id="tractor-spinner-knob" transform="translate(32, 28)">
            {/* Metal Clamp Bracket around rim */}
            <ellipse cx="0" cy="0" rx="9" ry="7" fill="url(#chromeGrad)" stroke="#1c1917" strokeWidth="1.2" />
            <circle cx="-5" cy="0" r="1" fill="#0c0a09" />
            <circle cx="5" cy="0" r="1" fill="#0c0a09" />
            {/* Revolving Knob Body with Shadow */}
            <circle cx="0" cy="-6" r="9" fill="url(#spinnerKnobGrad)" stroke="#57534e" strokeWidth="1.5" />
            <circle cx="0" cy="-6" r="4.5" fill="#292524" stroke="#78716c" strokeWidth="0.8" />
            {/* Center Chrome Pivot Screw */}
            <circle cx="0" cy="-6" r="2.2" fill="url(#chromeGrad)" stroke="#0c0a09" strokeWidth="0.5" />
          </g>
        </g>
      )}

      {/* ========================================================================= */}
      {/* 2. TRUCK: HEAVY COMMERCIAL 2-SPOKE BAR (ZIL-4331 / KAMAZ STYLE) */}
      {/* ========================================================================= */}
      {theme === 'truck' && (
        <g id="truck-steering-model">
          {/* Wide-Diameter Heavy Commercial Rim */}
          <circle cx="70" cy="70" r="61" stroke="url(#truckRimGrad)" strokeWidth="16" fill="none" />
          <circle cx="70" cy="70" r="68.5" stroke="#3f3f46" strokeWidth="1" fill="none" opacity="0.6" />
          <circle cx="70" cy="70" r="53" stroke="#27272a" strokeWidth="1" fill="none" opacity="0.8" />

          {/* Lower Diagonal Reinforcing Struts */}
          <path d="M 48 76 L 40 116 L 46 117 L 54 76 Z" fill="#18181b" stroke="#3f3f46" strokeWidth="0.8" />
          <path d="M 92 76 L 100 116 L 94 117 L 86 76 Z" fill="#18181b" stroke="#3f3f46" strokeWidth="0.8" />

          {/* Wide Horizontal Crossbar Spanning 9 to 3 o'clock */}
          <rect x="10" y="60" width="120" height="20" rx="4" fill="#18181b" stroke="#3f3f46" strokeWidth="1.2" />
          
          {/* Integrated Left & Right Thumb Horn Buttons on the Crossbar */}
          <rect x="18" y="64" width="18" height="12" rx="3" fill="#27272a" stroke="#52525b" strokeWidth="0.8" />
          <text x="27" y="72.5" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#a1a1aa" fontFamily="monospace">СИГНАЛ</text>

          <rect x="104" y="64" width="18" height="12" rx="3" fill="#27272a" stroke="#52525b" strokeWidth="0.8" />
          <text x="113" y="72.5" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#a1a1aa" fontFamily="monospace">СИГНАЛ</text>

          {/* Large Rectangular Center Truck Hub */}
          <rect x="44" y="55" width="52" height="30" rx="5" fill="#09090b" stroke="#0284c7" strokeWidth="1.8" />
          
          {/* Heavy Truck Crest */}
          <g transform="translate(70, 70)">
            {/* Truck Cab Silhouette */}
            <path
              d="M -12 -5 L -8 -11 L 4 -11 L 8 -5 L 12 -5 L 12 5 L -12 5 Z"
              fill={isHornActive ? '#38bdf8' : '#1e293b'}
              stroke="#0284c7"
              strokeWidth="1"
            />
            {/* Windshield */}
            <path d="M -7 -10 L 3 -10 L 6 -5 L -6 -5 Z" fill="#0284c7" opacity="0.6" />
            <text
              x="0"
              y="11"
              textAnchor="middle"
              fontSize="4.5"
              fontWeight="900"
              fill={isHornActive ? '#38bdf8' : '#7dd3fc'}
              fontFamily="sans-serif"
              letterSpacing="0.8"
            >
              ЗИЛ · КАМАЗ
            </text>
          </g>
        </g>
      )}

      {/* ========================================================================= */}
      {/* 3. RETRO: SOVIET CLASSIC WITH AUTHENTIC CHROME HORN RING (VAZ/GAZ/UAZ) */}
      {/* ========================================================================= */}
      {theme === 'retro' && (
        <g id="retro-steering-model">
          {/* Slender Glossy Ivory/Cream Rim */}
          <circle cx="70" cy="70" r="62" stroke="url(#retroIvoryGrad)" strokeWidth="10" fill="none" />
          <circle cx="70" cy="70" r="66.5" stroke="#b45309" strokeWidth="0.8" fill="none" opacity="0.4" />
          <circle cx="70" cy="70" r="57.5" stroke="#92400e" strokeWidth="0.8" fill="none" opacity="0.4" />

          {/* Twin Slender Chrome Horizontal Spokes */}
          <path d="M 12 68 L 52 68 L 52 72 L 12 72 Z" fill="url(#chromeGrad)" stroke="#64748b" strokeWidth="0.7" />
          <path d="M 88 68 L 128 68 L 128 72 L 88 72 Z" fill="url(#chromeGrad)" stroke="#64748b" strokeWidth="0.7" />

          {/* Slender Lower Strut */}
          <path d="M 68 88 L 68 122 L 72 122 L 72 88 Z" fill="url(#chromeGrad)" stroke="#64748b" strokeWidth="0.7" />

          {/* SIGNATURE FEATURE: SUSPENDED CHROME HORN RING (ХРОМИРОВАННОЕ КОЛЬЦО СИГНАЛА) */}
          <circle cx="70" cy="70" r="41" stroke="url(#chromeGrad)" strokeWidth="3.2" fill="none" />
          <circle cx="70" cy="70" r="42.5" stroke="#ffffff" strokeWidth="0.6" fill="none" opacity="0.8" />
          <circle cx="70" cy="70" r="39.5" stroke="#475569" strokeWidth="0.6" fill="none" opacity="0.7" />

          {/* 3 Slender Chrome Mounting Brackets for the Ring */}
          <line x1="28" y1="70" x2="41" y2="70" stroke="url(#chromeGrad)" strokeWidth="2.5" />
          <line x1="99" y1="70" x2="112" y2="70" stroke="url(#chromeGrad)" strokeWidth="2.5" />
          <line x1="70" y1="99" x2="70" y2="111" stroke="url(#chromeGrad)" strokeWidth="2.5" />

          {/* Chrome Domed Center Hub with Knurled Bezel */}
          <circle cx="70" cy="70" r="19" fill="url(#chromeGrad)" stroke="#475569" strokeWidth="1.5" />
          <circle cx="70" cy="70" r="17" fill="#0f172a" stroke="#64748b" strokeWidth="1" />

          {/* Ruby Enamel Soviet Retro Crest */}
          <circle cx="70" cy="70" r="13" fill="url(#retroRubyGrad)" stroke="#fef08a" strokeWidth="1" />
          
          {/* Golden Retro Ship / Star Motif */}
          <g transform="translate(70, 70) scale(0.7)">
            {/* Soviet Star Emblem */}
            <polygon
              points="0,-10 3,-3 10,-3 4,2 6,9 0,5 -6,9 -4,2 -10,-3 -3,-3"
              fill={isHornActive ? '#ffffff' : '#fbbf24'}
              stroke="#b45309"
              strokeWidth="0.8"
            />
          </g>
        </g>
      )}

      {/* ========================================================================= */}
      {/* 4. SPORT: D-CUT FLAT-BOTTOM RACING WHEEL WITH PADDLE SHIFTERS & CARBON */}
      {/* ========================================================================= */}
      {theme === 'sport' && (
        <g id="sport-steering-model">
          {/* ANODIZED RED ALUMINUM PADDLE SHIFTERS BEHIND WHEEL */}
          {/* Left Paddle (-) */}
          <g transform="translate(18, 30)">
            <rect x="0" y="0" width="11" height="28" rx="3.5" fill="url(#anodizedRed)" stroke="#7f1d1d" strokeWidth="1" />
            <text x="5.5" y="17" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#ffffff" fontFamily="sans-serif">−</text>
          </g>
          {/* Right Paddle (+) */}
          <g transform="translate(111, 30)">
            <rect x="0" y="0" width="11" height="28" rx="3.5" fill="url(#anodizedRed)" stroke="#7f1d1d" strokeWidth="1" />
            <text x="5.5" y="17" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#ffffff" fontFamily="sans-serif">+</text>
          </g>

          {/* D-CUT FLAT-BOTTOM RIM PATH (Carbon Top/Bottom + Alcantara Sides) */}
          <path
            d="M 12 70 A 58 58 0 0 1 128 70 A 58 58 0 0 1 112 114 L 28 114 A 58 58 0 0 1 12 70 Z"
            stroke="#0f172a"
            strokeWidth="15"
            fill="none"
          />
          {/* Carbon Fiber Layer */}
          <path
            d="M 12 70 A 58 58 0 0 1 128 70 A 58 58 0 0 1 112 114 L 28 114 A 58 58 0 0 1 12 70 Z"
            stroke="url(#carbonPattern)"
            strokeWidth="14"
            fill="none"
            opacity="0.85"
          />

          {/* Perforated Alcantara Side Grips with Red Cross-Stitching */}
          <path d="M 8 70 A 58 58 0 0 1 14 46 L 24 50 A 50 50 0 0 0 18 70 Z" fill="#1e293b" />
          <path d="M 8 70 A 58 58 0 0 0 16 94 L 24 90 A 50 50 0 0 1 18 70 Z" fill="#1e293b" />
          <path d="M 132 70 A 58 58 0 0 0 126 46 L 116 50 A 50 50 0 0 1 122 70 Z" fill="#1e293b" />
          <path d="M 132 70 A 58 58 0 0 1 124 94 L 116 90 A 50 50 0 0 0 122 70 Z" fill="#1e293b" />

          {/* Red Contrast Hand Stitching on Grips */}
          <path d="M 21 48 A 52 52 0 0 1 21 92" stroke="#ef4444" strokeWidth="1.4" strokeDasharray="2 2" fill="none" />
          <path d="M 119 48 A 52 52 0 0 0 119 92" stroke="#ef4444" strokeWidth="1.4" strokeDasharray="2 2" fill="none" />

          {/* Vibrant 12 O'Clock Racing Alignment Stripe */}
          <rect x="66" y="2" width="8" height="14" rx="2" fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.8" />

          {/* 3 Skeletonized Titanium Spokes with Drilled Race Holes */}
          <path d="M 23 66 L 50 67 L 50 73 L 23 74 Z" fill="url(#titaniumGrad)" stroke="#1e293b" strokeWidth="0.8" />
          <circle cx="34" cy="70" r="2.8" fill="#0f172a" />
          <circle cx="43" cy="70" r="2.8" fill="#0f172a" />

          <path d="M 117 66 L 90 67 L 90 73 L 117 74 Z" fill="url(#titaniumGrad)" stroke="#1e293b" strokeWidth="0.8" />
          <circle cx="106" cy="70" r="2.8" fill="#0f172a" />
          <circle cx="97" cy="70" r="2.8" fill="#0f172a" />

          <path d="M 66 112 L 67 90 L 73 90 L 74 112 Z" fill="url(#titaniumGrad)" stroke="#1e293b" strokeWidth="0.8" />
          <circle cx="70" cy="103" r="2.8" fill="#0f172a" />

          {/* Sport Center Boss with Red Ring & GT Emblem */}
          <circle cx="70" cy="70" r="22" fill="#0f172a" stroke="url(#anodizedRed)" strokeWidth="2.5" />
          <circle cx="70" cy="70" r="18" fill="url(#carbonPattern)" stroke="#334155" strokeWidth="1" />
          
          <text
            x="70"
            y="69"
            textAnchor="middle"
            fontSize="6.5"
            fontWeight="900"
            fill={isHornActive ? '#ef4444' : '#ffffff'}
            fontFamily="sans-serif"
            fontStyle="italic"
            letterSpacing="1"
          >
            GT
          </text>
          <text
            x="70"
            y="75"
            textAnchor="middle"
            fontSize="3.8"
            fontWeight="bold"
            fill="#ef4444"
            fontFamily="monospace"
          >
            RACING
          </text>
        </g>
      )}

      {/* ========================================================================= */}
      {/* 5. LUXURY: DARK BURL WALNUT WOOD & NAPPA LEATHER WITH TOUCH CONTROLS */}
      {/* ========================================================================= */}
      {theme === 'luxury' && (
        <g id="luxury-steering-model">
          {/* Base Outer Rim in Nappa Leather */}
          <circle cx="70" cy="70" r="62" stroke="#0f172a" strokeWidth="15" fill="none" />

          {/* Genuine Dark Burl Walnut Wood Inlays (Top & Bottom Arcs) */}
          <path d="M 28 35 A 62 62 0 0 1 112 35" stroke="url(#walnutWoodGrad)" strokeWidth="15.5" fill="none" />
          <path d="M 45 110 A 62 62 0 0 0 95 110" stroke="url(#walnutWoodGrad)" strokeWidth="15.5" fill="none" />

          {/* Satin Champagne Silver Dividing Accent Rings at Wood/Leather boundaries */}
          <line x1="24" y1="28" x2="33" y2="41" stroke="url(#satinSilverGrad)" strokeWidth="2.2" />
          <line x1="116" y1="28" x2="107" y2="41" stroke="url(#satinSilverGrad)" strokeWidth="2.2" />
          <line x1="40" y1="105" x2="49" y2="114" stroke="url(#satinSilverGrad)" strokeWidth="2.2" />
          <line x1="100" y1="105" x2="91" y2="114" stroke="url(#satinSilverGrad)" strokeWidth="2.2" />

          {/* Dual Multi-Tier Satin Silver Spokes */}
          <path d="M 22 66 L 50 67 L 50 73 L 22 74 Z" fill="url(#satinSilverGrad)" stroke="#475569" strokeWidth="0.8" />
          <path d="M 118 66 L 90 67 L 90 73 L 118 74 Z" fill="url(#satinSilverGrad)" stroke="#475569" strokeWidth="0.8" />
          <path d="M 67 116 L 68 88 L 72 88 L 73 116 Z" fill="url(#satinSilverGrad)" stroke="#475569" strokeWidth="0.8" />

          {/* Capacitive Multifunction Touchpads on Horizontal Spokes */}
          {/* Left: Cruise Control */}
          <rect x="26" y="66" width="16" height="8" rx="2" fill="#020617" stroke="#94a3b8" strokeWidth="0.6" />
          <circle cx="30" cy="70" r="1.2" fill="#cbd5e1" />
          <circle cx="34" cy="70" r="1.2" fill="#cbd5e1" />
          <circle cx="38" cy="70" r="1.2" fill="#cbd5e1" />

          {/* Right: Audio Volume / Phone */}
          <rect x="98" y="66" width="16" height="8" rx="2" fill="#020617" stroke="#94a3b8" strokeWidth="0.6" />
          <circle cx="102" cy="70" r="1.2" fill="#cbd5e1" />
          <circle cx="106" cy="70" r="1.2" fill="#cbd5e1" />
          <circle cx="110" cy="70" r="1.2" fill="#cbd5e1" />

          {/* Stitched Nappa Leather Center Airbag Pad with Winged Luxury Crest */}
          <circle cx="70" cy="70" r="22" fill="#0f172a" stroke="url(#satinSilverGrad)" strokeWidth="2" />
          <circle cx="70" cy="70" r="19" fill="#1e293b" stroke="#334155" strokeWidth="1" strokeDasharray="2 1.5" />
          
          {/* Winged Luxury Crest */}
          <g transform="translate(70, 70) scale(0.85)">
            <path
              d="M -12 -3 Q -6 -9 0 -4 Q 6 -9 12 -3 Q 6 -1 0 5 Q -6 -1 -12 -3 Z"
              fill={isHornActive ? '#f8fafc' : 'url(#satinSilverGrad)'}
              stroke="#475569"
              strokeWidth="0.8"
            />
            <circle cx="0" cy="-1" r="2.5" fill="#f8fafc" />
          </g>
        </g>
      )}

      {/* ========================================================================= */}
      {/* 6. OFFROAD: RUGGED 4x4 WITH HEX BOLTS & TIRE-TREAD THUMB PADS */}
      {/* ========================================================================= */}
      {theme === 'offroad' && (
        <g id="offroad-steering-model">
          {/* Chunky Outer Rim */}
          <circle cx="70" cy="70" r="61" stroke="url(#offroadRimGrad)" strokeWidth="16" fill="none" />
          
          {/* Tire-Tread Pattern Thumb Grips at 9 and 3 o'clock */}
          <path d="M 8 70 A 61 61 0 0 1 12 50 L 22 54 A 53 53 0 0 0 18 70 Z" fill="#047857" opacity="0.6" />
          <path d="M 8 70 A 61 61 0 0 0 12 90 L 22 86 A 53 53 0 0 1 18 70 Z" fill="#047857" opacity="0.6" />
          <path d="M 132 70 A 61 61 0 0 0 128 50 L 118 54 A 53 53 0 0 1 122 70 Z" fill="#047857" opacity="0.6" />
          <path d="M 132 70 A 61 61 0 0 1 128 90 L 118 86 A 53 53 0 0 0 122 70 Z" fill="#047857" opacity="0.6" />

          {/* 4 Chunky Spoke Beams in X-Pattern */}
          <path d="M 28 35 L 56 60 L 52 66 L 24 41 Z" fill="#1e293b" stroke="#334155" strokeWidth="1" />
          <path d="M 112 35 L 84 60 L 88 66 L 116 41 Z" fill="#1e293b" stroke="#334155" strokeWidth="1" />
          <path d="M 28 105 L 56 80 L 52 74 L 24 99 Z" fill="#1e293b" stroke="#334155" strokeWidth="1" />
          <path d="M 112 105 L 84 80 L 88 74 L 116 99 Z" fill="#1e293b" stroke="#334155" strokeWidth="1" />

          {/* Hexagonal Offroad Center Pad with Exposed Hex Screws */}
          <polygon
            points="70,47 88,57 88,83 70,93 52,83 52,57"
            fill="#0f172a"
            stroke="#10b981"
            strokeWidth="2"
          />
          {/* 6 Stainless Hex Screws */}
          {[[70, 50], [85, 59], [85, 81], [70, 90], [55, 81], [55, 59]].map(([bx, by], i) => (
            <circle key={i} cx={bx} cy={by} r="1.5" fill="#cbd5e1" stroke="#0f172a" strokeWidth="0.5" />
          ))}

          {/* 4x4 Mountain Crest */}
          <text
            x="70"
            y="68"
            textAnchor="middle"
            fontSize="7"
            fontWeight="900"
            fill={isHornActive ? '#6ee7b7' : '#10b981'}
            fontFamily="monospace"
          >
            4x4
          </text>
          <text
            x="70"
            y="75"
            textAnchor="middle"
            fontSize="4"
            fontWeight="bold"
            fill="#cbd5e1"
            fontFamily="sans-serif"
          >
            OFFROAD
          </text>
        </g>
      )}

      {/* ========================================================================= */}
      {/* 7. EMERGENCY: TACTICAL SERVICE WHEEL (POLICE / AMBULANCE / FIRE) */}
      {/* ========================================================================= */}
      {theme === 'emergency' && (
        <g id="emergency-steering-model">
          {/* High-Durability Tactical Rim */}
          <circle cx="70" cy="70" r="62" stroke="#0f172a" strokeWidth="15" fill="none" />
          <circle cx="70" cy="70" r="54.5" stroke="#334155" strokeWidth="1" fill="none" opacity="0.8" />

          {/* 3 Heavy Tactical Spokes */}
          <path d="M 23 66 L 50 67 L 50 73 L 23 74 Z" fill="#1e293b" stroke="#475569" strokeWidth="1" />
          <path d="M 117 66 L 90 67 L 90 73 L 117 74 Z" fill="#1e293b" stroke="#475569" strokeWidth="1" />
          <path d="M 66 117 L 67 90 L 73 90 L 74 117 Z" fill="#1e293b" stroke="#475569" strokeWidth="1" />

          {/* Emergency PTT / Siren Buttons on Spokes */}
          <circle cx="34" cy="70" r="3.2" fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.8" />
          <circle cx="106" cy="70" r="3.2" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.8" />

          {/* Center Police / Service Star Shield */}
          <circle cx="70" cy="70" r="22" fill="#09090b" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="70" cy="70" r="18" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
          
          <text
            x="70"
            y="69"
            textAnchor="middle"
            fontSize="6.5"
            fontWeight="900"
            fill={isHornActive ? '#ffffff' : '#38bdf8'}
            fontFamily="sans-serif"
            letterSpacing="1"
          >
            {carType === 'taxi' ? 'ТАКСИ' : 'ДПС'}
          </text>
          <text
            x="70"
            y="75"
            textAnchor="middle"
            fontSize="3.8"
            fontWeight="bold"
            fill={carType === 'taxi' ? '#facc15' : '#ef4444'}
            fontFamily="monospace"
          >
            {carType === 'taxi' ? '•••' : 'СЛУЖБА'}
          </text>
        </g>
      )}

      {/* ========================================================================= */}
      {/* 8. STANDARD: CONTEMPORARY ERGONOMIC 3-SPOKE MODERN CIVILIAN */}
      {/* ========================================================================= */}
      {theme === 'standard' && (
        <g id="standard-steering-model">
          {/* Outer Ergonomic Leatherette Rim */}
          <circle cx="70" cy="70" r="62" stroke="#0f172a" strokeWidth="15" fill="none" />
          <circle cx="70" cy="70" r="54.5" stroke="#334155" strokeWidth="1" fill="none" opacity="0.8" />
          <circle cx="70" cy="70" r="69.5" stroke="#475569" strokeWidth="1" fill="none" opacity="0.6" />

          {/* Ergonomic Thumb Rests at 9 and 3 o'clock */}
          <path d="M 8 70 A 62 62 0 0 1 12 50 L 22 54 A 54.5 54.5 0 0 0 18 70 Z" fill="#334155" opacity="0.7" />
          <path d="M 132 70 A 62 62 0 0 0 128 50 L 118 54 A 54.5 54.5 0 0 1 122 70 Z" fill="#334155" opacity="0.7" />

          {/* 3 Spokes with Lower Silver V-Accent */}
          <path d="M 23 66 L 50 67 L 50 73 L 23 74 Z" fill="url(#titaniumGrad)" stroke="#1e293b" strokeWidth="0.8" />
          <path d="M 117 66 L 90 67 L 90 73 L 117 74 Z" fill="url(#titaniumGrad)" stroke="#1e293b" strokeWidth="0.8" />
          <path d="M 66 117 L 67 90 L 73 90 L 74 117 Z" fill="url(#titaniumGrad)" stroke="#1e293b" strokeWidth="0.8" />

          {/* Modern Center Airbag Hub */}
          <circle cx="70" cy="70" r="22" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
          <circle cx="70" cy="70" r="18" fill="#1e293b" stroke="#334155" strokeWidth="1" />
          
          {/* Modern Horn Bugle Icon */}
          <g transform="translate(63, 63) scale(0.6)">
            <path
              d="M11 5L6 9H2V15H6L11 19V5Z"
              fill={isHornActive ? '#38bdf8' : '#94a3b8'}
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />
            <path
              d="M15.54 8.46C16.48 9.4 17 10.67 17 12C17 13.33 16.48 14.6 15.54 15.54"
              stroke={isHornActive ? '#38bdf8' : '#94a3b8'}
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        </g>
      )}
    </svg>
  );
};
