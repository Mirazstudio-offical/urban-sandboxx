import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
      {root && createPortal(<><style>{css}</style>{children}</>, root)}
    </div>
  );
};

/** Должен совпадать с @media в pauseMenu.css / radialMenu.css: узкий экран или телефон в альбоме. */
export const MOBILE_MEDIA = '(max-width: 900px), (max-height: 500px)';

export const isMobileViewport = (): boolean =>
  typeof matchMedia === 'function' && matchMedia(MOBILE_MEDIA).matches;

/** Реактивный флаг мобильной раскладки. */
export function useMobileViewport(): boolean {
  const [mobile, setMobile] = useState<boolean>(isMobileViewport);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(MOBILE_MEDIA);
    const on = () => setMobile(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return mobile;
}

/**
 * Fits the fixed 1440x900 stage into its wrapper (no page scroll on any screen size).
 * With mobileFlow, on mobile viewports the stage is not scaled: the CSS mobile layout stacks it
 * into a scrollable column so text stays readable.
 * Call from a layout effect; returns a cleanup function.
 */
export function attachStageFit(
  getWrap: () => HTMLElement | null,
  getStage: () => HTMLElement | null,
  mobileFlow = false
): () => void {
  let ro: ResizeObserver | null = null;
  let raf = 0;
  let onResize: (() => void) | null = null;
  const attach = () => {
    const w = getWrap();
    const gm = getStage();
    if (!w || !gm) { raf = requestAnimationFrame(attach); return; }
    const fit = () => {
      if (mobileFlow && isMobileViewport()) { gm.style.transform = 'none'; return; }
      const W = w.clientWidth, H = w.clientHeight;
      if (!W || !H) return;
      const k = Math.min(W / 1440, H / 900);
      gm.style.transform = 'translate(' + (W - 1440 * k) / 2 + 'px,' + (H - 900 * k) / 2 + 'px) scale(' + k + ')';
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
