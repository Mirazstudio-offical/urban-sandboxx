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
      <circle cx="50" cy="50" r="12" fill="none" stroke="#3a3a26" strokeWidth="1.1" />
      <circle cx="50" cy="50" r="24" fill="none" stroke="#3a3a26" strokeWidth="0.7" strokeDasharray="2 2" />
      <g style={{ transform: `translate(${(x * k).toFixed(1)}px, ${(y * k).toFixed(1)}px)`, transition: 'transform 0.35s ease-out' }}>
        <circle cx="50" cy="50" r="9" fill="url(#opl-bubble)" stroke="#6b7040" strokeWidth="0.8" />
      </g>
      <ellipse cx="38" cy="30" rx="20" ry="10" fill="#ffffff" opacity="0.14" transform="rotate(-30 38 30)" />
    </svg>
  );
};
