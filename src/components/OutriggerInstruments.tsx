import React from 'react';

const MAX_MPA = 25;
const SWEEP = 270; // dial sweep in degrees, from -135 to +135

const angleOf = (mpa: number) => -SWEEP / 2 + (mpa / MAX_MPA) * SWEEP;
const pt = (deg: number, r: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [50 + r * Math.sin(a), 50 - r * Math.cos(a)];
};

interface PressureGaugeProps {
  mpa: number;
}

/* Round hydraulic pressure gauge: steel bezel, dark dial, white ticks, red zone, needle on a spring. */
export const PressureGauge: React.FC<PressureGaugeProps> = ({ mpa }) => {
  const ticks: React.ReactNode[] = [];
  for (let i = 0; i <= MAX_MPA; i++) {
    const major = i % 5 === 0;
    const a = angleOf(i);
    const [x1, y1] = pt(a, 38);
    const [x2, y2] = pt(a, major ? 31 : 34.5);
    ticks.push(
      <line key={`t${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#dcd8cb" strokeWidth={major ? 1.4 : 0.7} strokeLinecap="butt" />,
    );
    if (major) {
      const [tx, ty] = pt(a, 24.5);
      ticks.push(
        <text key={`n${i}`} x={tx} y={ty + 2.6} textAnchor="middle" fontSize="7.5" fill="#dcd8cb" fontFamily="Barlow, system-ui, sans-serif">
          {i}
        </text>,
      );
    }
  }
  const [rx1, ry1] = pt(angleOf(20), 36);
  const [rx2, ry2] = pt(angleOf(25), 36);
  const needle = angleOf(Math.max(0, Math.min(MAX_MPA, mpa)));

  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={`Манометр, ${mpa.toFixed(0)} МПа`}>
      <defs>
        <linearGradient id="opg-bezel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c9cbcf" />
          <stop offset="0.45" stopColor="#6d7075" />
          <stop offset="1" stopColor="#2c2d30" />
        </linearGradient>
        <radialGradient id="opg-face" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#22231f" />
          <stop offset="1" stopColor="#0c0d0b" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="49" fill="url(#opg-bezel)" />
      <circle cx="50" cy="50" r="43.5" fill="#101110" />
      <circle cx="50" cy="50" r="42" fill="url(#opg-face)" />
      <path d={`M ${rx1} ${ry1} A 36 36 0 0 1 ${rx2} ${ry2}`} fill="none" stroke="#b8402e" strokeWidth="2.4" />
      {ticks}
      <text x="50" y="72" textAnchor="middle" fontSize="7" fill="#a9a595" fontFamily="Barlow, system-ui, sans-serif">
        МПа
      </text>
      <g style={{ transformOrigin: '50px 50px', transform: `rotate(${needle}deg)`, transition: 'transform 0.45s cubic-bezier(0.3, 1.4, 0.5, 1)' }}>
        <polygon points="49,56 51,56 50.4,14 49.6,14" fill="#e8e2cf" />
        <rect x="49.2" y="53" width="1.6" height="9" fill="#e8e2cf" />
      </g>
      <circle cx="50" cy="50" r="4.5" fill="#2a2b2d" stroke="#6d7075" strokeWidth="0.8" />
      <ellipse cx="38" cy="30" rx="22" ry="12" fill="#ffffff" opacity="0.06" transform="rotate(-30 38 30)" />
    </svg>
  );
};

/* One degree of chassis slope moves the bubble this many dial units; the inner ring is the 3 degree limit. */
export const LEVEL_UNITS_PER_DEG = 3.5;

interface SpiritLevelProps {
  /* bubble offset from the centre in dial units, about -22 .. 22 */
  x: number;
  y: number;
}

/* Round bubble level: a vial of pale spirit with an air bubble, ringed target in the middle. */
export const SpiritLevel: React.FC<SpiritLevelProps> = ({ x, y }) => {
  const r = Math.hypot(x, y);
  const k = r > 21 ? 21 / r : 1;
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="Круглый уровень">
      <defs>
        <linearGradient id="opl-bezel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b9a67a" />
          <stop offset="0.5" stopColor="#6e6446" />
          <stop offset="1" stopColor="#2a2619" />
        </linearGradient>
        <radialGradient id="opl-liquid" cx="0.42" cy="0.38" r="0.75">
          <stop offset="0" stopColor="#e3e6b8" />
          <stop offset="1" stopColor="#a9b270" />
        </radialGradient>
        <radialGradient id="opl-bubble" cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#fbfcee" stopOpacity="0.95" />
          <stop offset="1" stopColor="#cfd49a" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="49" fill="url(#opl-bezel)" />
      <circle cx="50" cy="50" r="42" fill="#1a1710" />
      <circle cx="50" cy="50" r="39.5" fill="url(#opl-liquid)" />
      <circle cx="50" cy="50" r="10.5" fill="none" stroke="#3a3a26" strokeWidth="1.1" />
      <circle cx="50" cy="50" r="21" fill="none" stroke="#3a3a26" strokeWidth="0.7" strokeDasharray="2 2" />
      <g style={{ transform: `translate(${(x * k).toFixed(1)}px, ${(y * k).toFixed(1)}px)`, transition: 'transform 0.35s ease-out' }}>
        <circle cx="50" cy="50" r="9" fill="url(#opl-bubble)" stroke="#6b7040" strokeWidth="0.8" />
      </g>
      <ellipse cx="38" cy="30" rx="20" ry="10" fill="#ffffff" opacity="0.14" transform="rotate(-30 38 30)" />
    </svg>
  );
};

/* Engraved plan view of the truck with one corner marked: shows which leg a lever belongs to.
   The mark is dark when the beam is in, amber when it is out, green when the pad bears on the ground. */
export const LegMark: React.FC<{ leg: number; state: 'in' | 'out' | 'ground' }> = ({ leg, state }) => {
  const front = leg < 2;
  const left = leg % 2 === 0;
  const dotX = left ? 3.5 : 20.5;
  const dotY = front ? 8 : 25;
  const dot = state === 'ground' ? '#7fbf5a' : state === 'out' ? '#d1a232' : '#34372e';
  return (
    <svg viewBox="0 0 24 32" aria-hidden="true">
      <rect x="6" y="3" width="12" height="26" rx="1.5" fill="none" stroke="#b9b8a8" strokeWidth="1" opacity="0.7" />
      <rect x="7" y="4" width="10" height="7" rx="1" fill="#b9b8a8" opacity="0.35" />
      <line x1={left ? 6 : 18} y1={dotY} x2={dotX} y2={dotY} stroke="#b9b8a8" strokeWidth="1" opacity="0.7" />
      <circle cx={dotX} cy={dotY} r="2.6" fill={dot} stroke="#0d0e0b" strokeWidth="0.6" />
    </svg>
  );
};

/* Engraved pictograms for the mode toggle. */
export const PictoBeam: React.FC = () => (
  <svg viewBox="0 0 24 16" aria-hidden="true">
    <g fill="none" stroke="#c9c8b8" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
      <line x1="3" y1="8" x2="21" y2="8" />
      <polyline points="7,4 3,8 7,12" />
      <polyline points="17,4 21,8 17,12" />
    </g>
  </svg>
);
export const PictoJack: React.FC = () => (
  <svg viewBox="0 0 24 16" aria-hidden="true">
    <g fill="none" stroke="#c9c8b8" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
      <line x1="12" y1="1.5" x2="12" y2="11" />
      <polyline points="8,7.5 12,11.5 16,7.5" />
      <line x1="4" y1="14.5" x2="20" y2="14.5" />
    </g>
  </svg>
);

interface ModeToggleProps {
  mode: 'beam' | 'jack';
  onChange: (m: 'beam' | 'jack') => void;
}

/* A two-position tumbler: left for the beams, right for the jacks. */
export const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onChange }) => {
  const angle = mode === 'beam' ? -32 : 32;
  return (
    <button
      type="button"
      className="op-toggle"
      role="switch"
      aria-checked={mode === 'jack'}
      aria-label="Режим: балки или домкраты"
      title="Балки / домкраты"
      onClick={(e) => {
        e.stopPropagation();
        onChange(mode === 'beam' ? 'jack' : 'beam');
      }}
    >
      <svg viewBox="0 0 60 48" aria-hidden="true">
        <defs>
          <linearGradient id="opt-steel" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2b2c30" />
            <stop offset="0.45" stopColor="#b3b5ba" />
            <stop offset="1" stopColor="#3a3b3f" />
          </linearGradient>
          <radialGradient id="opt-ball" cx="0.36" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#6a574b" />
            <stop offset="1" stopColor="#120c09" />
          </radialGradient>
        </defs>
        <ellipse cx="30" cy="42" rx="12" ry="4.5" fill="#101110" />
        <path d="M21 41 L24 33 L36 33 L39 41 Z" fill="url(#opt-steel)" stroke="#0d0e0b" strokeWidth="0.6" />
        <g style={{ transformOrigin: '30px 36px', transform: `rotate(${angle}deg)`, transition: 'transform 0.14s cubic-bezier(0.3, 1.5, 0.5, 1)' }}>
          <rect x="28.6" y="12" width="2.8" height="24" fill="url(#opt-steel)" />
          <circle cx="30" cy="10" r="5.2" fill="url(#opt-ball)" />
        </g>
      </svg>
    </button>
  );
};
