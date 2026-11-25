import React, { useEffect, useRef } from 'react';
import { drawItemModel2D } from '../itemGraphic';

interface ItemIconCanvasProps {
  itemId: string;
  item?: any;
  size?: number; // Canvas width and height in px
  className?: string;
  rawBase?: boolean;
}

function buildItemVisualStateKey(item: any): string {
  if (!item) return '';
  const t = typeof item.surfaceTemperature === 'number'
    ? Math.round(item.surfaceTemperature)
    : typeof item.temperature === 'number'
    ? Math.round(item.temperature)
    : 20;
  const wet = Math.round((item.wetness || 0) / 2);
  const soap = Math.round((item.soapyLevel || 0) * 20);
  const inf = Math.round((item.infusionProgress || 0) * 20);
  const cook = Math.round((item.cookProgress || 0) * 20);
  const brown = Math.round((item.brownLevel || 0) * 20);
  const char = Math.round((item.charLevel || 0) * 20);
  const st = item.attributes?.state || '';
  const method = item.cookMethod || '';
  const soakCol = item.soakedColor || '';
  const soakId = item.soakedLiquidId || '';
  const open = item.isOpen ? 1 : 0;
  const cd = item.culinaryData;
  const cdKey = cd
    ? `${Math.round((cd.denaturation || 0) * 10)},${Math.round((cd.maillard || 0) * 10)},${Math.round((cd.charring || 0) * 10)}`
    : '';
  const fs = item.fluidStorage;
  const fsKey = fs
    ? `${fs.liquidId || ''}:${Math.round((fs.currentMl || 0) / 5)}:${fs.attributes?.customColor || ''}`
    : '';
  let childKey = '';
  if (Array.isArray(item.contents) && item.contents.length > 0) {
    const parts: string[] = [String(item.contents.length)];
    const limit = Math.min(4, item.contents.length);
    for (let i = 0; i < limit; i++) {
      const ch = item.contents[i];
      if (!ch) continue;
      parts.push(
        `${ch.itemId}:${Math.round((ch.brownLevel || 0) * 10)}:${Math.round((ch.charLevel || 0) * 10)}:${Math.round((ch.cookProgress || 0) * 10)}:${Math.round((ch.wetness || 0) / 10)}:${ch.attributes?.state || ''}`
      );
    }
    childKey = parts.join(';');
  }
  return `${t}|${wet}|${soap}|${inf}|${cook}|${brown}|${char}|${st}|${method}|${soakCol}|${soakId}|${open}|${cdKey}|${fsKey}|${childKey}`;
}

export const ItemIconCanvas: React.FC<ItemIconCanvasProps> = ({
  itemId,
  item,
  size = 32,
  className = '',
  rawBase = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const visualStateKey = rawBase ? '' : buildItemVisualStateKey(item);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);
    drawItemModel2D(ctx, itemId, size / 2, size / 2, size * 0.78, item, false, rawBase);
    ctx.restore();
  }, [itemId, item, size, rawBase, visualStateKey]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`inline-block pointer-events-none ${className}`}
    />
  );
};
