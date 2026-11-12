import React, { useState } from 'react';
import { VehicleControlTheme } from './vehicleControlStyles';
import './boardHardware.css';

/* Physical switchgear for the cab switchboard. Every part is drawn like the real thing:
   tumblers, rockers with a lamp in the face, flip covers, rotary selectors, push buttons and lamps.
   The theme only decides which family of hardware sits on the plate and how the plate is finished. */

export type SwitchFamily = 'toggle' | 'rocker' | 'guard' | 'piano';

export const THEME_FAMILY: Record<VehicleControlTheme, SwitchFamily> = {
  tractor: 'toggle',
  machinery: 'toggle',
  retro: 'toggle',
  truck: 'rocker',
  offroad: 'rocker',
  standard: 'rocker',
  sport: 'guard',
  emergency: 'guard',
  luxury: 'piano',
};

export type LampTone = 'amber' | 'green' | 'red' | 'blue' | 'white';

/* ---------- lamp ---------- */

export const Lamp: React.FC<{ on: boolean; tone?: LampTone; blink?: boolean }> = ({ on, tone = 'amber', blink }) => (
  <i className={`hw-lamp is-${tone}${blink && on ? ' is-blink' : ''}`} data-on={on} aria-hidden="true" />
);

/* ---------- engraved plate parts ---------- */

export const Screw: React.FC<{ className: string; turn?: number }> = ({ className, turn = 0 }) => (
  <i className={`hw-screw ${className}`} style={{ ['--turn' as string]: `${turn}deg` }} aria-hidden="true" />
);

export const Group: React.FC<{ title: string; className?: string; children: React.ReactNode }> = ({ title, className, children }) => (
  <section className={`hw-group${className ? ` ${className}` : ''}`}>
    <h3 className="hw-group-t">{title}</h3>
    <div className="hw-group-body">{children}</div>
  </section>
);

export const Cell: React.FC<{
  label: string;
  keyHint?: string;
  note?: string;
  wide?: boolean;
  lamp?: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, keyHint, note, wide, lamp, children }) => (
  <div className={`hw-cell${wide ? ' is-wide' : ''}`}>
    <div className="hw-cell-lamp">{lamp}</div>
    <div className="hw-cell-ctl">{children}</div>
    <span className="hw-label">
      {label}
      {keyHint && <b className="hw-key">{keyHint}</b>}
    </span>
    {note && <span className="hw-note">{note}</span>}
  </div>
);

export const Lcd: React.FC<{ label: string; value: string; warn?: boolean }> = ({ label, value, warn }) => (
  <div className={`hw-lcd${warn ? ' is-warn' : ''}`}>
    <span className="hw-lcd-l">{label}</span>
    <span className="hw-lcd-v">{value}</span>
  </div>
);

/* ---------- flip cover over a switch or a button ---------- */

const Covered: React.FC<{ forceOpen?: boolean; children: React.ReactNode }> = ({ forceOpen, children }) => {
  const [open, setOpen] = useState(false);
  const isOpen = open || !!forceOpen;
  return (
    <span className="hw-covered" data-open={isOpen}>
      <span className="hw-covered-in" aria-hidden={!isOpen} style={{ pointerEvents: isOpen ? 'auto' : 'none' }}>
        {children}
      </span>
      <button
        type="button"
        className="hw-flap"
        aria-label={isOpen ? 'Закрыть защитную крышку' : 'Открыть защитную крышку'}
        onClick={(e) => {
          e.stopPropagation();
          if (!forceOpen) setOpen(!open);
        }}
      />
    </span>
  );
};

/* ---------- two position switch ---------- */

interface HwSwitchProps {
  family: SwitchFamily;
  on: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  lens?: LampTone;
}

export const HwSwitch: React.FC<HwSwitchProps> = ({ family, on, onClick, label, disabled, lens = 'amber' }) => {
  const press = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) onClick();
  };

  const tumbler = (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} className="hw-sw hw-toggle" data-on={on} onClick={press}>
      <i className="hw-t-nut" />
      <i className="hw-t-arm" />
    </button>
  );

  if (family === 'guard') return <Covered forceOpen={on}>{tumbler}</Covered>;
  if (family === 'toggle') return tumbler;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      className={`hw-sw hw-rocker${family === 'piano' ? ' is-piano' : ''}`}
      data-on={on}
      onClick={press}
    >
      <i className="hw-r-face">
        <span className="hw-r-i">I</span>
        <span className={`hw-r-lens is-${lens}`} data-on={on} />
        <span className="hw-r-o">O</span>
      </i>
    </button>
  );
};

/* ---------- push button ---------- */

export const Glyph: React.FC<{ kind: 'power' | 'hazard' | 'left' | 'right' | 'minus' | 'plus' }> = ({ kind }) => {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      {kind === 'power' && (
        <>
          <path d="M12 3v8" {...p} />
          <path d="M6.7 6.6a8 8 0 1 0 10.6 0" {...p} />
        </>
      )}
      {kind === 'hazard' && (
        <>
          <path d="M12 4 21 19.5H3z" {...p} strokeWidth={2.4} />
          <path d="M12 10.2 16.3 17.5H7.7z" {...p} strokeWidth={1.6} />
        </>
      )}
      {kind === 'left' && <path d="M15 5 7 12l8 7" {...p} strokeWidth={3} />}
      {kind === 'right' && <path d="M9 5l8 7-8 7" {...p} strokeWidth={3} />}
      {kind === 'minus' && <path d="M6 12h12" {...p} strokeWidth={3} />}
      {kind === 'plus' && <path d="M6 12h12M12 6v12" {...p} strokeWidth={3} />}
    </svg>
  );
};

interface HwPushProps {
  shape?: 'round' | 'square' | 'wide';
  tone?: 'red' | 'amber' | 'green' | 'plain';
  lit?: boolean;
  glyph: React.ComponentProps<typeof Glyph>['kind'];
  onClick: () => void;
  label: string;
  disabled?: boolean;
  covered?: boolean;
  blink?: boolean;
}

export const HwPush: React.FC<HwPushProps> = ({ shape = 'round', tone = 'plain', lit, glyph, onClick, label, disabled, covered, blink }) => {
  const btn = (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className={`hw-push is-${shape} is-${tone}${lit ? ' is-lit' : ''}${lit && blink ? ' is-blink' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
    >
      <i className="hw-push-cap">
        <Glyph kind={glyph} />
      </i>
    </button>
  );
  return covered ? <Covered>{btn}</Covered> : btn;
};

/* ---------- rotary selector ---------- */

interface RotaryOption {
  id: string;
  label: string;
}

interface HwRotaryProps {
  options: RotaryOption[];
  value: string;
  label: string;
  onSelect: (id: string) => void;
  onKnob?: () => void;
  spread?: number;
}

export const HwRotary: React.FC<HwRotaryProps> = ({ options, value, label, onSelect, onKnob, spread = 56 }) => {
  const n = options.length;
  const idx = Math.max(0, options.findIndex((o) => o.id === value));
  const angleOf = (i: number) => (n === 1 ? 0 : -spread + (i * 2 * spread) / (n - 1));
  const advance = () => {
    if (onKnob) onKnob();
    else onSelect(options[(idx + 1) % n].id);
  };
  return (
    <div className="hw-rotary" role="group" aria-label={label}>
      <svg className="hw-rotary-arc" viewBox="0 0 100 70" aria-hidden="true">
        {options.map((_, i) => {
          const a = (angleOf(i) * Math.PI) / 180;
          return <line key={i} x1={50 + 21 * Math.sin(a)} y1={44 - 21 * Math.cos(a)} x2={50 + 25 * Math.sin(a)} y2={44 - 25 * Math.cos(a)} stroke="currentColor" strokeWidth="1.4" />;
        })}
      </svg>
      {options.map((o, i) => {
        const a = (angleOf(i) * Math.PI) / 180;
        return (
          <button
            key={o.id}
            type="button"
            className={`hw-rotary-pos${i === idx ? ' is-cur' : ''}`}
            style={{ left: `${50 + 36 * Math.sin(a)}%`, top: `${((44 - 33 * Math.cos(a)) / 70) * 100}%` }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(o.id);
            }}
          >
            {o.label}
          </button>
        );
      })}
      <button
        type="button"
        className="hw-knob"
        aria-label={`${label}, переключить`}
        style={{ ['--ang' as string]: `${angleOf(idx)}deg` }}
        onClick={(e) => {
          e.stopPropagation();
          advance();
        }}
      >
        <i className="hw-knob-pointer" />
      </button>
    </div>
  );
};
