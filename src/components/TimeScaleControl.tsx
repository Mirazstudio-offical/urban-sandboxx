import React from 'react';
import { Gauge } from 'lucide-react';
import './gameUi.css';

/** Available simulation speeds, from normal to the slowest. */
export const TIME_SCALE_STEPS = [1, 0.5, 0.25, 0.1, 0.05] as const;
export const DEFAULT_SLOW_SCALE = 0.25;

const LABELS: Record<number, string> = { 1: '1x', 0.5: '1/2', 0.25: '1/4', 0.1: '1/10', 0.05: '1/20' };

/** Short label used on buttons: "1x", "1/4", ... */
export const stepLabel = (s: number) => LABELS[s] ?? String(s);

/** Value shown to the player: "1.0x", "0.25x", "0.05x". */
export const formatTimeScale = (s: number) => (s >= 1 ? '1.0x' : `${parseFloat(s.toFixed(2))}x`);

/** The nearest defined step (guards against stale or odd values). */
export const snapTimeScale = (s: number): number =>
  TIME_SCALE_STEPS.reduce((best, cur) => (Math.abs(cur - s) < Math.abs(best - s) ? cur : best), TIME_SCALE_STEPS[0]);

/**
 * Speed picker for the in-game menu: one row of steps and a on/off toggle,
 * the way racing and sandbox games present slow motion.
 */
export const TimeScalePicker: React.FC<{
  value: number;
  onChange: (s: number) => void;
  onToggle: () => void;
}> = ({ value, onChange, onToggle }) => {
  const current = snapTimeScale(value);
  const slow = current < 1;
  return (
    <div className="gu-speed">
      <div className="gu-speed-top">
        <span className={'gu-speed-val' + (slow ? ' slow' : '')}>{formatTimeScale(current)}</span>
        <span className="gu-speed-name">{slow ? 'Замедление' : 'Обычная скорость'}</span>
      </div>
      <div className="gu-speed-track" role="group" aria-label="Скорость симуляции">
        {TIME_SCALE_STEPS.map(s => (
          <button
            key={s}
            type="button"
            className={s === current ? 'on' : ''}
            aria-pressed={s === current}
            onClick={() => onChange(s)}
            title={`Скорость ${formatTimeScale(s)}`}
          >
            {stepLabel(s)}
          </button>
        ))}
      </div>
    </div>
  );
};

/** HUD button: shows the current speed, click toggles slow motion on and off. */
export const TimeScaleButton: React.FC<{ value: number; onToggle: () => void }> = ({ value, onToggle }) => {
  const slow = value < 1;
  return (
    <button
      id="hud-sim-speed-btn"
      type="button"
      className={'hud-btn' + (slow ? ' on' : '')}
      onClick={onToggle}
      title="Замедление времени [T]"
      aria-label="Замедление времени"
      aria-pressed={slow}
    >
      <Gauge className="w-4 h-4" />
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTimeScale(value)}</span>
    </button>
  );
};

/** Unobtrusive on-screen cue while time is slowed: a small readout plus soft vignette. */
export const SlowMotionIndicator: React.FC<{ value: number }> = ({ value }) => {
  const current = snapTimeScale(value);
  const level = TIME_SCALE_STEPS.indexOf(current as (typeof TIME_SCALE_STEPS)[number]); // 0 = normal
  return (
    <>
      <div className="gu-vignette" style={{ opacity: Math.min(1, level / 3 + 0.25) }} aria-hidden="true" />
      <div className="gu-slowmo" role="status">
        <span>Замедление</span>
        <b>{formatTimeScale(current)}</b>
        <span className="gu-pips" aria-hidden="true">
          {TIME_SCALE_STEPS.slice(1).map((s, i) => <i key={s} className={i < level ? 'on' : ''} />)}
        </span>
        <span className="gu-key" style={{ margin: 0 }}>T</span>
      </div>
    </>
  );
};
