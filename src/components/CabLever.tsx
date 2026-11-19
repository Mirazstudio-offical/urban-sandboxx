import React, { useEffect, useRef, useState } from 'react';
import './truckConsole.css';

const TRAVEL = 40; // finger travel in px from the press point to full tilt
const MAX_TILT = 34; // lever tilt in degrees at full travel
const ENGAGE = 0.35;

interface CabLeverProps {
  name: string;
  title?: string;
  disabled?: boolean;
  /* -1 pulled toward you, 0 upright, 1 pushed away. Fires only when the direction changes. */
  onDirChange: (dir: -1 | 0 | 1) => void;
}

/* A cab lever: a steel shaft and an ebonite ball, no panel and no captions.
   Press anywhere on it and push the finger up (lever tilts away) or down (tilts toward you).
   Release and it springs back to upright. The shaft rises from below the screen edge. */
export const CabLever: React.FC<CabLeverProps> = ({ name, title, disabled = false, onDirChange }) => {
  const activeId = useRef<number | null>(null);
  const startY = useRef(0);
  const dir = useRef<-1 | 0 | 1>(0);
  const onDirChangeRef = useRef(onDirChange);
  onDirChangeRef.current = onDirChange;
  const [offset, setOffset] = useState(0); // px, positive = pushed away
  const [dragging, setDragging] = useState(false);

  const apply = (v: number) => {
    const next: -1 | 0 | 1 = v > ENGAGE ? 1 : v < -ENGAGE ? -1 : 0;
    if (next === dir.current) return;
    dir.current = next;
    onDirChangeRef.current(next);
  };

  const moveTo = (clientY: number) => {
    const px = Math.max(-TRAVEL, Math.min(TRAVEL, startY.current - clientY));
    setOffset(px);
    apply(px / TRAVEL);
  };

  const release = () => {
    activeId.current = null;
    setDragging(false);
    setOffset(0);
    if (dir.current !== 0) {
      dir.current = 0;
      onDirChangeRef.current(0);
    }
  };

  useEffect(() => {
    if (disabled && (activeId.current !== null || dir.current !== 0)) release();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  useEffect(() => {
    if (!dragging) return;
    const onGlobalPointerMove = (e: PointerEvent) => {
      if (activeId.current === e.pointerId) moveTo(e.clientY);
    };
    const onGlobalPointerUp = (e: PointerEvent) => {
      if (activeId.current === null || activeId.current === e.pointerId) release();
    };
    const onGlobalReset = () => release();
    window.addEventListener('pointermove', onGlobalPointerMove);
    window.addEventListener('pointerup', onGlobalPointerUp);
    window.addEventListener('pointercancel', onGlobalPointerUp);
    window.addEventListener('mouseup', onGlobalReset);
    window.addEventListener('blur', onGlobalReset);
    window.addEventListener('visibilitychange', onGlobalReset);
    return () => {
      window.removeEventListener('pointermove', onGlobalPointerMove);
      window.removeEventListener('pointerup', onGlobalPointerUp);
      window.removeEventListener('pointercancel', onGlobalPointerUp);
      window.removeEventListener('mouseup', onGlobalReset);
      window.removeEventListener('blur', onGlobalReset);
      window.removeEventListener('visibilitychange', onGlobalReset);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  useEffect(
    () => () => {
      if (dir.current !== 0) {
        dir.current = 0;
        onDirChangeRef.current(0);
      }
      activeId.current = null;
    },
    [],
  );

  const tilt = (offset / TRAVEL) * MAX_TILT;

  return (
    <div className={`tc-lv3${disabled ? ' is-off' : ''}`}>
      <div
        className={`tc-lv3-hit${dragging ? ' is-drag' : ''}`}
        style={{ '--a': `${tilt.toFixed(1)}deg` } as React.CSSProperties}
        onPointerDown={(e) => {
          if (disabled || activeId.current !== null) return;
          e.preventDefault();
          e.stopPropagation();
          activeId.current = e.pointerId;
          startY.current = e.clientY;
          try {
            e.currentTarget.setPointerCapture?.(e.pointerId);
          } catch {
            // Pointer capture may not be supported on all touch/iframe targets
          }
          setDragging(true);
        }}
        onPointerMove={(e) => {
          if (activeId.current === e.pointerId) moveTo(e.clientY);
        }}
        onPointerUp={(e) => {
          if (activeId.current === e.pointerId) {
            try {
              e.currentTarget.releasePointerCapture?.(e.pointerId);
            } catch {
              // ignore
            }
            release();
          }
        }}
        onPointerCancel={(e) => {
          if (activeId.current === e.pointerId) release();
        }}
        onLostPointerCapture={() => {
          if (activeId.current !== null || dir.current !== 0) release();
        }}
        onContextMenu={(e) => e.preventDefault()}
        role="slider"
        aria-label={name}
        aria-valuemin={-1}
        aria-valuemax={1}
        aria-valuenow={dir.current}
        title={title}
      >
        <i className="tc-lv3-arm">
          <i className="tc-lv3-rod" />
          <i className="tc-lv3-grip" />
        </i>
      </div>
    </div>
  );
};
