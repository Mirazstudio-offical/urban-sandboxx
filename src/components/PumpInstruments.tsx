import React from 'react';
import { GAUGE_MAX_BAR, GAUGE_MIN_BAR, PumpMode } from '../vacuumPump';

const SWEEP = 270; // dial sweep in degrees
const SPAN = GAUGE_MAX_BAR - GAUGE_MIN_BAR;

const angleOf = (bar: number) => -SWEEP / 2 + ((bar - GAUGE_MIN_BAR) / SPAN) * SWEEP;
const pt = (deg: number, r: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [50 + r * Math.sin(a), 50 - r * Math.cos(a)];
};
const arc = (from: number, to: number, r: number) => {
  const [x1, y1] = pt(angleOf(from), r);
  const [x2, y2] = pt(angleOf(to), r);
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
};

/* Compound gauge: vacuum to the left of zero, pressure to the right. A pale band marks each side, red marks the limits. */
export const CompoundGauge: React.FC<{ bar: number }> = ({ bar }) => {
  const marks: React.ReactNode[] = [];
  for (let i = 0; i <= 26; i++) {
    const v = GAUGE_MIN_BAR + i * 0.1;
    const major = i % 5 === 0;
    const a = angleOf(v);
    const [x1, y1] = pt(a, 38);
    const [x2, y2] = pt(a, major ? 31 : 34.5);
    marks.push(<line key={`t${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#dcd8cb" strokeWidth={major ? 1.4 : 0.7} />);
  }
  for (const v of [-1, 0, 1]) {
    const [tx, ty] = pt(angleOf(v), 24.5);
    marks.push(
      <text key={`n${v}`} x={tx} y={ty + 2.6} textAnchor="middle" fontSize="8" fill="#dcd8cb" fontFamily="Barlow, system-ui, sans-serif">
        {v}
      </text>,
    );
  }
  const needle = angleOf(Math.max(GAUGE_MIN_BAR, Math.min(GAUGE_MAX_BAR, bar)));

  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={`Мановакуумметр, ${bar.toFixed(2)} бар`}>
      <defs>
        <linearGradient id="vpg-bezel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c9cbcf" />
          <stop offset="0.45" stopColor="#6d7075" />
          <stop offset="1" stopColor="#2c2d30" />
        </linearGradient>
        <radialGradient id="vpg-face" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#22231f" />
          <stop offset="1" stopColor="#0c0d0b" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="49" fill="url(#vpg-bezel)" />
      <circle cx="50" cy="50" r="43.5" fill="#101110" />
      <circle cx="50" cy="50" r="42" fill="url(#vpg-face)" />
      <path d={arc(-0.9, 0, 40.5)} fill="none" stroke="#5f8fa8" strokeWidth="2" opacity="0.8" />
      <path d={arc(0, 1.5, 40.5)} fill="none" stroke="#c28a45" strokeWidth="2" opacity="0.8" />
      <path d={arc(-1, -0.9, 40.5)} fill="none" stroke="#b8402e" strokeWidth="2" />
      <path d={arc(1.5, 1.6, 40.5)} fill="none" stroke="#b8402e" strokeWidth="2" />
      {marks}
      <text x="50" y="72" textAnchor="middle" fontSize="7" fill="#a9a595" fontFamily="Barlow, system-ui, sans-serif">
        бар
      </text>
      <g style={{ transformOrigin: '50px 50px', transform: `rotate(${needle}deg)`, transition: 'transform 0.6s cubic-bezier(0.3, 1.3, 0.5, 1)' }}>
        <polygon points="49,56 51,56 50.4,14 49.6,14" fill="#e8e2cf" />
        <rect x="49.2" y="53" width="1.6" height="9" fill="#e8e2cf" />
      </g>
      <circle cx="50" cy="50" r="4.5" fill="#2a2b2d" stroke="#6d7075" strokeWidth="0.8" />
      <ellipse cx="38" cy="30" rx="22" ry="12" fill="#ffffff" opacity="0.06" transform="rotate(-30 38 30)" />
    </svg>
  );
};

/* Engraved flow pictograms: a tank outline with an arrow going in (suction) or out (discharge). */
export const PictoFlow: React.FC<{ mode: PumpMode }> = ({ mode }) => (
  <svg viewBox="0 0 34 20" aria-hidden="true">
    <g fill="none" stroke="#c9c8b8" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
      {mode === 'suction' ? (
        <>
          <rect x="17" y="4" width="14" height="12" rx="4" />
          <line x1="2" y1="10" x2="14" y2="10" />
          <polyline points="10.5,6.5 14,10 10.5,13.5" />
        </>
      ) : (
        <>
          <rect x="3" y="4" width="14" height="12" rx="4" />
          <line x1="20" y1="10" x2="32" y2="10" />
          <polyline points="28.5,6.5 32,10 28.5,13.5" />
        </>
      )}
    </g>
  </svg>
);

interface FourWayValveProps {
  mode: PumpMode;
  onChange: (m: PumpMode) => void;
}

/* Four-way plug cock: a cast body with four pipe stubs and a red flat handle that stops at two positions. */
export const FourWayValve: React.FC<FourWayValveProps> = ({ mode, onChange }) => {
  const angle = mode === 'suction' ? -45 : 45;
  return (
    <button
      type="button"
      className="vp-valve"
      role="switch"
      aria-checked={mode === 'discharge'}
      aria-label="Четырёхходовой кран: всасывание или нагнетание"
      title="Четырёхходовой кран"
      onClick={(e) => {
        e.stopPropagation();
        onChange(mode === 'suction' ? 'discharge' : 'suction');
      }}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="vpv-iron" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8a8d90" />
            <stop offset="0.5" stopColor="#4a4c4f" />
            <stop offset="1" stopColor="#1f2022" />
          </linearGradient>
          <linearGradient id="vpv-handle" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c0392b" />
            <stop offset="1" stopColor="#7a1f16" />
          </linearGradient>
        </defs>
        {/* pipe stubs with flanges */}
        {[0, 90, 180, 270].map((r) => (
          <g key={r} transform={`rotate(${r} 50 50)`}>
            <rect x="43" y="4" width="14" height="26" fill="url(#vpv-iron)" stroke="#0d0e0b" strokeWidth="0.8" />
            <rect x="40" y="3" width="20" height="6" rx="1" fill="#5a5c5f" stroke="#0d0e0b" strokeWidth="0.8" />
            <circle cx="43.5" cy="6" r="1.1" fill="#16171a" />
            <circle cx="56.5" cy="6" r="1.1" fill="#16171a" />
          </g>
        ))}
        <circle cx="50" cy="50" r="24" fill="url(#vpv-iron)" stroke="#0d0e0b" strokeWidth="1" />
        <circle cx="50" cy="50" r="17" fill="#2a2b2d" stroke="#6d7075" strokeWidth="0.8" />
        {/* stop pins at both handle positions */}
        {[-45, 45].map((r) => (
          <circle key={r} cx={50 + 21 * Math.sin((r * Math.PI) / 180)} cy={50 - 21 * Math.cos((r * Math.PI) / 180)} r="1.8" fill="#b9b8a8" />
        ))}
        <g style={{ transformOrigin: '50px 50px', transform: `rotate(${angle}deg)`, transition: 'transform 0.18s cubic-bezier(0.3, 1.6, 0.5, 1)' }}>
          <rect x="46.5" y="9" width="7" height="48" rx="3.5" fill="url(#vpv-handle)" stroke="#2a0b07" strokeWidth="0.8" />
          <circle cx="50" cy="12" r="5.4" fill="url(#vpv-handle)" stroke="#2a0b07" strokeWidth="0.8" />
          <circle cx="50" cy="50" r="5.5" fill="#b3b5ba" stroke="#2a2b2d" strokeWidth="0.8" />
          <circle cx="50" cy="50" r="2" fill="#2a2b2d" />
        </g>
      </svg>
    </button>
  );
};
