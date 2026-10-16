import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';
import './gameUi.css';

/* ------------------------------------------------------------------ */
/* Escape handling: only the top-most shell reacts, and the event never */
/* reaches the game (so it cannot also open the pause menu).            */
/* ------------------------------------------------------------------ */

const escStack: number[] = [];
let escCounter = 0;

export function useTopmostEscape(onEscape: () => void) {
  const cb = useRef(onEscape);
  cb.current = onEscape;
  useEffect(() => {
    const id = ++escCounter;
    escStack.push(id);
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.code !== 'Escape') return;
      if (escStack[escStack.length - 1] !== id) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      cb.current();
    };
    window.addEventListener('keydown', handler, true);
    return () => {
      window.removeEventListener('keydown', handler, true);
      const i = escStack.indexOf(id);
      if (i >= 0) escStack.splice(i, 1);
    };
  }, []);
}

/* ------------------------------------------------------------------ */
/* small pieces                                                        */
/* ------------------------------------------------------------------ */

export const BrandMark: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg className="gu-mark" width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
    <path d="M18 2 32 10v16L18 34 4 26V10z" fill="none" stroke="#c9922b" strokeWidth="2.5" />
    <path d="M11 22 18 11l7 11z" fill="#c9922b" />
  </svg>
);

export const Key: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="gu-key">{children}</span>;

export const Hints: React.FC<{ items: [string, string][] }> = ({ items }) => (
  <>
    {items.map(([k, t], i) => (
      <React.Fragment key={k + t}>
        <span className={'gu-key' + (i > 0 ? ' gu-hint-gap' : '')}>{k}</span>
        {t}
      </React.Fragment>
    ))}
  </>
);

export const Toggle: React.FC<{ on: boolean; onChange: () => void; label: string }> = ({ on, onChange, label }) => (
  <button type="button" className={'gu-tg' + (on ? ' on' : '')} role="switch" aria-checked={on} aria-label={label} onClick={onChange} />
);

export function Seg<T extends string | number>({
  options,
  value,
  onChange,
  full
}: {
  options: { v: NoInfer<T>; label: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  full?: boolean;
}) {
  return (
    <div className={'gu-seg' + (full ? ' gu-full' : '')} role="group">
      {options.map(o => (
        <button type="button" key={String(o.v)} className={o.v === value ? 'on' : ''} aria-pressed={o.v === value} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

export function Tabs<T extends string>({ items, value, onChange }: { items: TabItem<NoInfer<T>>[]; value: T; onChange: (id: T) => void }) {
  return (
    <div className="gu-tabs" role="tablist">
      {items.map(t => (
        <button type="button" key={t.id} role="tab" aria-selected={t.id === value} className={'gu-tab' + (t.id === value ? ' on' : '')} onClick={() => onChange(t.id)}>
          {t.icon}
          <span>{t.label}</span>
          {!!t.badge && <span className="gu-badge-n">{t.badge}</span>}
        </button>
      ))}
    </div>
  );
}

/** Range input that paints its own filled part in amber. */
export const Range: React.FC<{
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void; label: string;
}> = ({ value, min, max, step = 1, onChange, label }) => {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return (
    <input
      type="range"
      className="gu-range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      style={{ ['--p' as any]: pct + '%' }}
      onChange={e => onChange(parseFloat(e.target.value))}
    />
  );
};

/** Draggable track painted like the sky over 24 hours. Continuous value 0..24 in hours. */
export const SkyScrubber: React.FC<{ hour: number; onChange: (h: number) => void; stepMinutes?: number }> = ({ hour, onChange, stepMinutes = 5 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const step = stepMinutes / 60;
  const h = ((hour % 24) + 24) % 24;
  const pct = (h / 24) * 100;
  const apply = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    onChange(Math.min(24 - step, Math.round((t * 24) / step) * step));
  };
  return (
    <div>
      <div
        ref={ref}
        className="gu-sky"
        role="slider"
        tabIndex={0}
        aria-label="Время суток"
        aria-valuemin={0}
        aria-valuemax={24}
        aria-valuenow={Math.round(h * 10) / 10}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = true; apply(e.clientX); }}
        onPointerMove={e => { if (drag.current) apply(e.clientX); }}
        onPointerUp={() => { drag.current = false; }}
        onPointerCancel={() => { drag.current = false; }}
        onKeyDown={e => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); onChange((h - 0.25 + 24) % 24); }
          else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); onChange((h + 0.25) % 24); }
        }}
      >
        <div className="gu-sky-k" style={{ left: pct + '%' }} />
      </div>
      <div className="gu-ticks" aria-hidden="true">
        <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
      </div>
    </div>
  );
};

export const Avatar: React.FC<{ name: string; url?: string; size?: 'lg'; status?: 'online' | 'game' | 'off' }> = ({ name, url, size, status }) => (
  <span className={'gu-av' + (size === 'lg' ? ' gu-lg' : '')}>
    {url ? <img src={url} alt="" referrerPolicy="no-referrer" /> : (name || '?').charAt(0).toUpperCase()}
    {status && <span className={'gu-dot' + (status === 'online' ? ' gu-on' : status === 'game' ? ' gu-game' : '')} />}
  </span>
);

/* ------------------------------------------------------------------ */
/* modal shell                                                         */
/* ------------------------------------------------------------------ */

export interface ModalShellProps {
  id?: string;
  title: string;
  subtitle?: string;
  width?: number;
  tall?: boolean;
  onClose: () => void;
  headRight?: React.ReactNode;
  tabs?: React.ReactNode;
  footerHints?: [string, string][];
  footerRight?: React.ReactNode;
  /** changing this value plays the amber sweep line (used when switching tabs) */
  wipeKey?: string | number;
  bodyKey?: string | number;
  closeLabel?: string;
  noBodyPadding?: boolean;
  children: React.ReactNode;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  id, title, subtitle, width = 880, tall, onClose, headRight, tabs, footerHints, footerRight, wipeKey, bodyKey, closeLabel = 'Закрыть', noBodyPadding, children
}) => {
  useTopmostEscape(onClose);
  const wipeRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) { first.current = false; return; }
    const w = wipeRef.current;
    if (!w) return;
    w.classList.remove('on');
    void w.offsetWidth;
    w.classList.add('on');
  }, [wipeKey]);

  return (
    <div id={id ? id + '-backdrop' : undefined} className="gu-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div id={id} className={'gu-modal' + (tall ? ' gu-tall' : '')} style={{ ['--gu-w' as any]: width + 'px' }} role="dialog" aria-modal="true" aria-label={title}>
        <div className="gu-wipe" ref={wipeRef} />
        <header className="gu-head">
          <div className="gu-head-l">
            <BrandMark />
            <div style={{ minWidth: 0 }}>
              <div className="gu-title">{title}</div>
              {subtitle && <div className="gu-sub">{subtitle}</div>}
            </div>
          </div>
          <div className="gu-head-r">
            {headRight}
            <button type="button" className="gu-chip gu-sq" onClick={onClose} aria-label={closeLabel} title={closeLabel}>
              <X width={20} height={20} color="#e9e6df" />
            </button>
          </div>
        </header>
        {tabs}
        <div className="gu-body" key={bodyKey} style={noBodyPadding ? { padding: 0 } : undefined}>
          {children}
        </div>
        {(footerHints || footerRight) && (
          <footer className="gu-foot">
            <div className="gu-foot-l">{footerHints && <Hints items={footerHints} />}</div>
            <div className="gu-foot-r">{footerRight}</div>
          </footer>
        )}
      </div>
    </div>
  );
};
