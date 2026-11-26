import React, { useEffect, useRef } from 'react';
import { drawItemModel2D } from '../itemGraphic';

interface ItemIconCanvasProps {
  itemId: string;
  item?: any;
  size?: number; // Canvas width and height in px
  className?: string;
  rawBase?: boolean;
}

const MAX_SPRITE_CACHE = 600;
const spriteCache = new Map<string, HTMLCanvasElement>();

function getCachedItemSprite(
  itemId: string,
  item: any,
  size: number,
  dpr: number,
  rawBase: boolean,
  visualStateKey: string
): HTMLCanvasElement {
  const key = `${itemId}|${size}|${dpr}|${rawBase ? 1 : 0}|${visualStateKey}`;
  const existing = spriteCache.get(key);
  if (existing) {
    spriteCache.delete(key);
    spriteCache.set(key, existing);
    return existing;
  }

  const offscreen = document.createElement('canvas');
  offscreen.width = Math.max(1, Math.round(size * dpr));
  offscreen.height = Math.max(1, Math.round(size * dpr));
  const octx = offscreen.getContext('2d');
  if (octx) {
    octx.save();
    octx.scale(dpr, dpr);
    drawItemModel2D(octx, itemId, size / 2, size / 2, size * 0.78, item, false, rawBase);
    octx.restore();
  }

  if (spriteCache.size >= MAX_SPRITE_CACHE) {
    const oldestKey = spriteCache.keys().next().value;
    if (oldestKey !== undefined) {
      spriteCache.delete(oldestKey);
    }
  }
  spriteCache.set(key, offscreen);
  return offscreen;
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
  const origCat = item.originalCatalogId || '';
  const cTint = item.containerTintColor || '';
  const cVis = item.containerVisuals
    ? `${item.containerVisuals.shape || ''}:${item.containerVisuals.color || ''}:${item.containerVisuals.capColor || ''}:${item.containerVisuals.labelColor || ''}`
    : '';
  const cd = item.culinaryData;
  const cdKey = cd
    ? `${Math.round((cd.denaturation || 0) * 10)},${Math.round((cd.maillard || 0) * 10)},${Math.round((cd.charring || 0) * 10)}`
    : '';
  const fs = item.fluidStorage;
  const fsKey = fs
    ? `${fs.liquidId || ''}:${Math.round((fs.currentMl || 0) / 5)}:${fs.attributes?.customColor || ''}:${fs.isOpen ? 1 : 0}`
    : '';
  let childKey = '';
  if (Array.isArray(item.contents) && item.contents.length > 0) {
    const parts: string[] = [String(item.contents.length)];
    const limit = Math.min(4, item.contents.length);
    for (let i = 0; i < limit; i++) {
      const ch = item.contents[i];
      if (!ch) continue;
      const chDa = ch.doughAttributes
        ? `:${ch.doughAttributes.shape}:${ch.doughAttributes.color}:${ch.doughAttributes.cookState}:${ch.doughAttributes.fillings?.length || 0}`
        : '';
      parts.push(
        `${ch.itemId}:${Math.round((ch.brownLevel || 0) * 10)}:${Math.round((ch.charLevel || 0) * 10)}:${Math.round((ch.cookProgress || 0) * 10)}:${Math.round((ch.wetness || 0) / 10)}:${ch.attributes?.state || ''}${chDa}`
      );
    }
    childKey = parts.join(';');
  }
  const da = item.doughAttributes;
  const daKey = da
    ? `${da.shape}:${da.color}:${da.cookState}:${da.embossedPattern || ''}:${da.fillings?.length || 0}:${Math.round(da.thicknessMm || 0)}:${Math.round((da.riseFactor || 1) * 10)}`
    : '';
  const rp = item.rollingPinAttributes;
  const rpKey = rp
    ? `${rp.modelId}:${rp.shape}:${rp.color}:${rp.pattern}`
    : '';
  const pa = item.produceAttributes;
  const paKey = pa
    ? `${pa.speciesId || ''}:${pa.variantRu || ''}:${pa.cutForm || ''}:${pa.isPeeled ? 1 : 0}:${pa.isDried ? 1 : 0}:${pa.color || ''}`
    : '';
  const ma = item.meatAttributes;
  const maKey = ma
    ? `${ma.speciesId || ''}:${ma.anatomicalPart || ''}:${ma.cutForm || ''}:${ma.color || ''}`
    : '';
  const ba = item.branchAttributes;
  const baKey = ba
    ? `${ba.speciesId || ''}:${ba.attachedFruit?.count || 0}`
    : '';
  const kw = item.kitchenwareAttributes;
  const kwKey = kw
    ? `${kw.kind || ''}:${kw.material || ''}:${kw.color || ''}:${kw.pattern || ''}`
    : '';
  const ph = item.phoneAttributes;
  const phKey = ph
    ? `${ph.brand || ''}:${ph.modelName || ''}:${ph.colorHex || ''}`
    : '';
  const choco = item.chocolateAttributes;
  const chocoKey = choco ? `${choco.kind || ''}:${choco.flavor || ''}:${choco.shape || ''}` : '';
  const gum = item.gummyAttributes;
  const gumKey = gum ? `${gum.shape || ''}:${gum.color || ''}` : '';
  const pel = item.pelmenAttributes;
  const pelKey = pel ? `${pel.shape || ''}:${pel.filling || ''}` : '';
  const lbl = item.labelColor || '';
  return `${t}|${wet}|${soap}|${inf}|${cook}|${brown}|${char}|${st}|${method}|${soakCol}|${soakId}|${open}|${origCat}|${cTint}|${cVis}|${cdKey}|${fsKey}|${childKey}|${daKey}|${rpKey}|${paKey}|${maKey}|${baKey}|${kwKey}|${phKey}|${chocoKey}|${gumKey}|${pelKey}|${lbl}`;
}

const ItemIconCanvasInner: React.FC<ItemIconCanvasProps> = ({
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

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const targetW = Math.max(1, Math.round(size * dpr));
    const targetH = Math.max(1, Math.round(size * dpr));
    if (canvas.width !== targetW) canvas.width = targetW;
    if (canvas.height !== targetH) canvas.height = targetH;

    const sprite = getCachedItemSprite(itemId, item, size, dpr, rawBase, visualStateKey);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, targetW, targetH);
    ctx.drawImage(sprite, 0, 0, targetW, targetH);
  }, [itemId, item, size, rawBase, visualStateKey]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`inline-block pointer-events-none ${className}`}
    />
  );
};

export const ItemIconCanvas = React.memo(ItemIconCanvasInner, (prev, next) => {
  if (prev.itemId !== next.itemId || prev.size !== next.size || prev.className !== next.className || prev.rawBase !== next.rawBase) {
    return false;
  }
  if (prev.item === next.item) return true;
  if (!prev.item || !next.item) return false;
  if (prev.rawBase && next.rawBase) return true;
  return buildItemVisualStateKey(prev.item) === buildItemVisualStateKey(next.item);
});
