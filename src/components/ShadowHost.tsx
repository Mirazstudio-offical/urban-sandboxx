import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import compactCss from './menuCompact.css?inline';

interface ShadowHostProps {
  /** Stylesheet text injected into the shadow root (kept verbatim from the supplied mock-ups). */
  css: string;
  children: React.ReactNode;
  /** Colour painted behind the stage (the stage itself is a fixed 1440x900 canvas scaled to fit). */
  background?: string;
  zIndex?: number;
}

/**
 * Renders a screen inside a shadow root so its stylesheet can never clash with the game's own CSS
 * (same technique MainMenu uses for the menu stylesheet).
 */
export const ShadowHost: React.FC<ShadowHostProps> = ({ css, children, background = '#0d0e10', zIndex = 50 }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    setRoot(el.shadowRoot || el.attachShadow({ mode: 'open' }));
  }, []);
  return (
    <div
      ref={hostRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        boxSizing: 'border-box',
        background,
        overflow: 'hidden',
        overscrollBehavior: 'none',
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        WebkitTextSizeAdjust: '100%',
        transition: 'background .4s',
        padding: 'env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)'
      }}
    >
      {root && createPortal(<><style>{css}</style><style>{compactCss}</style>{children}</>, root)}
    </div>
  );
};

/** Logical height of the stage in compact (phone / short window) mode. */
export const COMPACT_STAGE_H = 560;
/** Windows at most this tall (CSS px) use the compact stage instead of the fixed 1440x900 one. */
export const COMPACT_MAX_H = 600;

export interface StageMetrics {
  compact: boolean;
  /** CSS scale applied to the stage. */
  k: number;
  /** Logical stage size (what the menu CSS lays out in). */
  sw: number;
  sh: number;
}

/**
 * Desktop: fixed 1440x900 stage scaled to fit (as in the mock-ups).
 * Phones / short windows: the stage takes the real aspect ratio of the screen (about 1200x560 logical px),
 * so text and buttons stay large enough to tap and nothing needs to scroll as a whole.
 */
export function stageMetrics(W: number, H: number): StageMetrics {
  if (H > COMPACT_MAX_H) {
    return { compact: false, k: Math.min(W / 1440, H / 900), sw: 1440, sh: 900 };
  }
  const k = Math.min(H / COMPACT_STAGE_H, W / 900);
  return { compact: true, k, sw: W / k, sh: H / k };
}

/** Applies compact-mode state to the stage element (data attribute so React re-renders never wipe it). */
export function applyCompactState(gm: HTMLElement, m: StageMetrics): void {
  if (m.compact) {
    gm.setAttribute('data-mob', '1');
    gm.style.width = m.sw + 'px';
    gm.style.height = m.sh + 'px';
    gm.style.setProperty('--sw', m.sw + 'px');
    gm.style.setProperty('--sh', m.sh + 'px');
    gm.style.setProperty('--ox', '0px');
  } else {
    gm.removeAttribute('data-mob');
    gm.style.removeProperty('--sh');
    gm.style.height = '';
    gm.style.width = '';
  }
}

/**
 * Fits the stage into its wrapper (no page scroll on any screen size).
 * Call from a layout effect; returns a cleanup function.
 */
export function attachStageFit(getWrap: () => HTMLElement | null, getStage: () => HTMLElement | null): () => void {
  let ro: ResizeObserver | null = null;
  let raf = 0;
  let onResize: (() => void) | null = null;
  const attach = () => {
    const w = getWrap();
    const gm = getStage();
    if (!w || !gm) { raf = requestAnimationFrame(attach); return; }
    const fit = () => {
      const W = w.clientWidth, H = w.clientHeight;
      if (!W || !H) return;
      const m = stageMetrics(W, H);
      applyCompactState(gm, m);
      if (m.compact) {
        gm.style.transform = 'scale(' + m.k + ')';
      } else {
        gm.style.transform = 'translate(' + (W - 1440 * m.k) / 2 + 'px,' + (H - 900 * m.k) / 2 + 'px) scale(' + m.k + ')';
      }
    };
    fit();
    if (window.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(w); }
    else { onResize = fit; window.addEventListener('resize', fit); }
  };
  attach();
  return () => {
    cancelAnimationFrame(raf);
    ro?.disconnect();
    if (onResize) window.removeEventListener('resize', onResize);
  };
}
