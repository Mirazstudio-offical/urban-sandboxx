import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface CachedDragUi<T> {
  sourceKey: string;
  item: T;
  overKey: string | null;
}

interface CachedRect {
  key: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface UseCachedSlotDragOptions<T> {
  rootRef: React.RefObject<HTMLElement | null>;
  slotAttr?: string;
  zoneAttr?: string;
  snapMarginPx?: number;
  activationPx?: number;
  selectedKey?: string | null;
  onSelectKey?: (next: string | null | ((prev: string | null) => string | null)) => void;
  canTargetSlot?: (targetKey: string, sourceKey: string) => boolean;
  onDrop: (targetKey: string, sourceKey: string) => void;
  onSimpleClick?: (
    slotKey: string,
    item: T | null | undefined,
    onSelectClick: (() => void) | undefined,
    pointerType: string
  ) => void;
  resolvePriorityTarget?: (
    x: number,
    y: number,
    sourceKey: string,
    rootNode: ParentNode
  ) => string | null;
}

interface ActiveDragSession<T> {
  pointerId: number;
  pointerType: string;
  sourceKey: string;
  item: T;
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;
  overKey: string | null;
  onSelectClick?: () => void;
  slotRects: CachedRect[];
  zoneRects: CachedRect[];
  scrollEls: HTMLElement[];
  dirtyRects: boolean;
  secondScrollPointer: {
    pointerId: number;
    lastX: number;
    lastY: number;
    scrollEl: HTMLElement | null;
  } | null;
}

export function useCachedSlotDrag<T>({
  rootRef,
  slotAttr = 'data-kf-slot',
  zoneAttr = 'data-kf-zone',
  snapMarginPx = 16,
  activationPx = 8,
  selectedKey,
  onSelectKey,
  canTargetSlot,
  onDrop,
  onSimpleClick,
  resolvePriorityTarget,
}: UseCachedSlotDragOptions<T>) {
  const [dragUi, setDragUi] = useState<CachedDragUi<T> | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<ActiveDragSession<T> | null>(null);
  const rafMoveRef = useRef<number>(0);
  const cleanupFnsRef = useRef<(() => void) | null>(null);

  const selectedKeyRef = useRef(selectedKey);
  selectedKeyRef.current = selectedKey;
  const onSelectKeyRef = useRef(onSelectKey);
  onSelectKeyRef.current = onSelectKey;
  const canTargetSlotRef = useRef(canTargetSlot);
  canTargetSlotRef.current = canTargetSlot;
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  const onSimpleClickRef = useRef(onSimpleClick);
  onSimpleClickRef.current = onSimpleClick;
  const resolvePriorityRef = useRef(resolvePriorityTarget);
  resolvePriorityRef.current = resolvePriorityTarget;

  const getQueryRoot = useCallback((): ParentNode | null => {
    const el = rootRef.current;
    if (!el) return null;
    const rn = el.getRootNode();
    if (rn && typeof (rn as ShadowRoot).querySelectorAll === 'function') {
      return rn as ParentNode;
    }
    return el;
  }, [rootRef]);

  const snapshotRects = useCallback(
    (s: ActiveDragSession<T>) => {
      const qRoot = getQueryRoot();
      if (!qRoot) return;

      const slots: CachedRect[] = [];
      const slotNodes = qRoot.querySelectorAll<HTMLElement>(`[${slotAttr}]`);
      for (let i = 0; i < slotNodes.length; i++) {
        const node = slotNodes[i];
        const key = node.getAttribute(slotAttr);
        if (!key || key === s.sourceKey) continue;
        const r = node.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        slots.push({ key, left: r.left, right: r.right, top: r.top, bottom: r.bottom });
      }
      s.slotRects = slots;

      const zones: CachedRect[] = [];
      if (zoneAttr) {
        const zoneNodes = qRoot.querySelectorAll<HTMLElement>(`[${zoneAttr}]`);
        for (let i = 0; i < zoneNodes.length; i++) {
          const node = zoneNodes[i];
          const key = node.getAttribute(zoneAttr);
          if (!key) continue;
          const r = node.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;
          zones.push({ key, left: r.left, right: r.right, top: r.top, bottom: r.bottom });
        }
      }
      s.zoneRects = zones;

      const scrollers: HTMLElement[] = [];
      const scrollNodes = qRoot.querySelectorAll<HTMLElement>('.scroll');
      for (let i = 0; i < scrollNodes.length; i++) {
        if (scrollNodes[i].scrollHeight > scrollNodes[i].clientHeight + 2) {
          scrollers.push(scrollNodes[i]);
        }
      }
      s.scrollEls = scrollers;
      s.dirtyRects = false;
    },
    [getQueryRoot, slotAttr, zoneAttr]
  );

  const findTargetFromCache = useCallback(
    (x: number, y: number, s: ActiveDragSession<T>): string | null => {
      if (s.dirtyRects) {
        snapshotRects(s);
      }

      if (resolvePriorityRef.current) {
        const qRoot = getQueryRoot();
        if (qRoot) {
          const prio = resolvePriorityRef.current(x, y, s.sourceKey, qRoot);
          if (prio) return prio;
        }
      }

      let bestKey: string | null = null;
      let bestDist = Infinity;
      const rects = s.slotRects;

      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          return rect.key;
        }
        const dx = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
        const dy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
        if (dx <= snapMarginPx && dy <= snapMarginPx) {
          const d = dx * dx + dy * dy;
          if (d <= snapMarginPx * snapMarginPx && d < bestDist) {
            bestDist = d;
            bestKey = rect.key;
          }
        }
      }

      if (!bestKey && s.zoneRects.length > 0) {
        for (let i = 0; i < s.zoneRects.length; i++) {
          const zr = s.zoneRects[i];
          if (x >= zr.left && x <= zr.right && y >= zr.top && y <= zr.bottom) {
            return zr.key;
          }
        }
      }

      return bestKey;
    },
    [getQueryRoot, snapMarginPx, snapshotRects]
  );

  const findScrollableAt = useCallback(
    (x: number, y: number, s: ActiveDragSession<T>): HTMLElement | null => {
      const qRoot = getQueryRoot();
      if (qRoot && typeof (qRoot as ShadowRoot).elementFromPoint === 'function') {
        let el = (qRoot as ShadowRoot).elementFromPoint(x, y) as HTMLElement | null;
        while (el) {
          if (el.scrollHeight > el.clientHeight + 2) {
            const st = window.getComputedStyle(el);
            if (st.overflowY === 'auto' || st.overflowY === 'scroll') {
              return el;
            }
          }
          el = el.parentElement;
        }
      }
      for (let i = 0; i < s.scrollEls.length; i++) {
        const node = s.scrollEls[i];
        const r = node.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom && node.scrollHeight > node.clientHeight + 2) {
          return node;
        }
      }
      return null;
    },
    [getQueryRoot]
  );

  const positionGhost = useCallback((x: number, y: number, visible: boolean) => {
    const g = ghostRef.current;
    if (!g) return;
    if (!visible) {
      g.style.display = 'none';
      return;
    }
    g.style.display = 'flex';
    g.style.transform = `translate3d(${Math.round(x - 32)}px, ${Math.round(y - 32)}px, 0)`;
  }, []);

  useEffect(() => {
    const s = sessionRef.current;
    if (dragUi && s && s.active) {
      positionGhost(s.x, s.y, true);
    } else {
      positionGhost(0, 0, false);
    }
  }, [dragUi, positionGhost]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafMoveRef.current);
      cleanupFnsRef.current?.();
      cleanupFnsRef.current = null;
      sessionRef.current = null;
    };
  }, []);

  const startSlotPointerDrag = useCallback(
    (
      e: React.PointerEvent<HTMLElement>,
      slotKey: string,
      item: T | null | undefined,
      onSelectClick?: () => void
    ) => {
      if (e.button !== 0) return;
      if (sessionRef.current && sessionRef.current.pointerId !== e.pointerId) return;
      const targetEl = e.target as HTMLElement | null;
      if (targetEl?.closest('button, input, select, textarea')) return;

      if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      e.stopPropagation();

      if (!item) {
        if (onSimpleClickRef.current) {
          onSimpleClickRef.current(slotKey, null, onSelectClick, e.pointerType);
        } else if (onSelectClick) {
          onSelectClick();
        } else if (selectedKeyRef.current && selectedKeyRef.current !== slotKey) {
          onDropRef.current(slotKey, selectedKeyRef.current);
          onSelectKeyRef.current?.(null);
        }
        return;
      }

      cleanupFnsRef.current?.();

      const session: ActiveDragSession<T> = {
        pointerId: e.pointerId,
        pointerType: e.pointerType || 'mouse',
        sourceKey: slotKey,
        item,
        startX: e.clientX,
        startY: e.clientY,
        x: e.clientX,
        y: e.clientY,
        active: false,
        overKey: null,
        onSelectClick,
        slotRects: [],
        zoneRects: [],
        scrollEls: [],
        dirtyRects: true,
        secondScrollPointer: null,
      };
      sessionRef.current = session;

      const scheduleMoveFrame = () => {
        if (rafMoveRef.current) return;
        rafMoveRef.current = requestAnimationFrame(() => {
          rafMoveRef.current = 0;
          const s = sessionRef.current;
          if (!s || !s.active) return;
          positionGhost(s.x, s.y, true);
          let nextOver = findTargetFromCache(s.x, s.y, s);
          if (nextOver && canTargetSlotRef.current && !canTargetSlotRef.current(nextOver, s.sourceKey)) {
            nextOver = null;
          }
          if (nextOver !== s.overKey) {
            s.overKey = nextOver;
            setDragUi({ sourceKey: s.sourceKey, item: s.item, overKey: nextOver });
          }
        });
      };

      const activateDrag = (s: ActiveDragSession<T>) => {
        s.active = true;
        snapshotRects(s);
        let over = findTargetFromCache(s.x, s.y, s);
        if (over && canTargetSlotRef.current && !canTargetSlotRef.current(over, s.sourceKey)) {
          over = null;
        }
        s.overKey = over;
        setDragUi({ sourceKey: s.sourceKey, item: s.item, overKey: over });
      };

      const onExtraPointerDown = (ev: PointerEvent) => {
        const s = sessionRef.current;
        if (!s || ev.pointerId === s.pointerId) return;
        if (!s.active) activateDrag(s);
        s.secondScrollPointer = {
          pointerId: ev.pointerId,
          lastX: ev.clientX,
          lastY: ev.clientY,
          scrollEl: findScrollableAt(ev.clientX, ev.clientY, s),
        };
      };

      const onPointerMove = (ev: PointerEvent) => {
        const s = sessionRef.current;
        if (!s) return;

        if (ev.pointerId === s.pointerId) {
          s.x = ev.clientX;
          s.y = ev.clientY;
          if (!s.active) {
            if (Math.hypot(ev.clientX - s.startX, ev.clientY - s.startY) >= activationPx) {
              activateDrag(s);
            } else {
              return;
            }
          }
          scheduleMoveFrame();
          return;
        }

        if (s.secondScrollPointer && ev.pointerId === s.secondScrollPointer.pointerId) {
          const dy = ev.clientY - s.secondScrollPointer.lastY;
          const dx = ev.clientX - s.secondScrollPointer.lastX;
          s.secondScrollPointer.lastY = ev.clientY;
          s.secondScrollPointer.lastX = ev.clientX;
          if (!s.secondScrollPointer.scrollEl) {
            s.secondScrollPointer.scrollEl = findScrollableAt(ev.clientX, ev.clientY, s);
          }
          if (s.secondScrollPointer.scrollEl) {
            s.secondScrollPointer.scrollEl.scrollTop -= dy;
            s.secondScrollPointer.scrollEl.scrollLeft -= dx;
            s.dirtyRects = true;
            if (s.active) scheduleMoveFrame();
          }
        }
      };

      const onScrollOrWheel = () => {
        const s = sessionRef.current;
        if (!s) return;
        s.dirtyRects = true;
        if (s.active) scheduleMoveFrame();
      };

      const qRoot = getQueryRoot();

      const cleanupListeners = () => {
        cancelAnimationFrame(rafMoveRef.current);
        rafMoveRef.current = 0;
        window.removeEventListener('pointerdown', onExtraPointerDown, true);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);
        window.removeEventListener('wheel', onScrollOrWheel, true);
        if (qRoot) {
          qRoot.removeEventListener('scroll', onScrollOrWheel, true);
        }
        cleanupFnsRef.current = null;
      };

      const finish = (ev: PointerEvent, cancelled: boolean) => {
        const s = sessionRef.current;
        if (!s) return;
        if (ev.pointerId !== s.pointerId) {
          if (s.secondScrollPointer && ev.pointerId === s.secondScrollPointer.pointerId) {
            s.secondScrollPointer = null;
          }
          return;
        }

        cleanupListeners();
        sessionRef.current = null;
        positionGhost(0, 0, false);
        setDragUi(null);

        if (cancelled) return;

        if (s.active) {
          s.dirtyRects = true;
          let targetKey = findTargetFromCache(ev.clientX, ev.clientY, s) || s.overKey;
          if (targetKey && canTargetSlotRef.current && !canTargetSlotRef.current(targetKey, s.sourceKey)) {
            targetKey = null;
          }
          if (targetKey && targetKey !== s.sourceKey) {
            onDropRef.current(targetKey, s.sourceKey);
            onSelectKeyRef.current?.(null);
          }
        } else {
          if (onSimpleClickRef.current) {
            onSimpleClickRef.current(s.sourceKey, s.item, s.onSelectClick, s.pointerType);
          } else if (s.onSelectClick) {
            s.onSelectClick();
          } else if (onSelectKeyRef.current) {
            onSelectKeyRef.current(prev => (prev === s.sourceKey ? null : s.sourceKey));
          }
        }
      };

      const onPointerUp = (ev: PointerEvent) => finish(ev, false);
      const onPointerCancel = (ev: PointerEvent) => finish(ev, true);

      cleanupFnsRef.current = cleanupListeners;

      window.addEventListener('pointerdown', onExtraPointerDown, true);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerCancel);
      window.addEventListener('wheel', onScrollOrWheel, true);
      if (qRoot) {
        qRoot.addEventListener('scroll', onScrollOrWheel, true);
      }
    },
    [activationPx, findScrollableAt, findTargetFromCache, getQueryRoot, positionGhost, snapshotRects]
  );

  return {
    dragUi,
    ghostRef,
    startSlotPointerDrag,
    startSlotPointer: startSlotPointerDrag,
    startSlotDrag: startSlotPointerDrag,
  };
}
