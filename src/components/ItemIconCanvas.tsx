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
  const melt = Math.round((item.meltLevel || 0) * 20);
  const cheeseGlaze = item.cheeseGlazed ? (item.cheeseGlazeColor || '1') : '';
  const st = item.attributes?.state || '';
  const method = item.cookMethod || '';
  const soakCol = item.soakedColor || '';
  const soakId = item.soakedLiquidId || '';
  const open = item.isOpen ? 1 : 0;
  const origCat = item.originalCatalogId || '';
  const cTint = item.containerTintColor || '';
  const cv = item.containerVisuals || item.fluidStorage?.containerVisuals;
  const cVis = cv
    ? `${cv.shape || ''}:${cv.materialRgb ? cv.materialRgb.join(',') : ''}:${cv.capRgb ? cv.capRgb.join(',') : ''}:${cv.labelRgb ? cv.labelRgb.join(',') : 'none'}:${cv.labelAccentRgb ? cv.labelAccentRgb.join(',') : ''}`
    : '';
  const cd = item.culinaryData;
  const cdKey = cd
    ? `${Math.round((cd.denaturation || 0) * 10)},${Math.round((cd.maillard || 0) * 10)},${Math.round((cd.charring || 0) * 10)}`
    : '';
  const fs = item.fluidStorage;
  const fsKey = fs
    ? `${fs.liquidId || ''}:${Math.round((fs.currentMl || 0) / 5)}/${fs.maxMl || 0}:${fs.attributes?.customColor || ''}:${fs.attributes?.secondaryColor || ''}:${fs.attributes?.isOpened || fs.isOpen ? 1 : 0}`
    : '';
  let childKey = '';
  if (Array.isArray(item.contents) && item.contents.length > 0) {
    const parts: string[] = [String(item.contents.length)];
    const limit = Math.min(4, item.contents.length);
    for (let i = 0; i < limit; i++) {
      const ch = item.contents[i];
      if (!ch) continue;
      const chDa = ch.doughAttributes
        ? `:${ch.doughAttributes.shape}:${ch.doughAttributes.doughType || ''}:${ch.doughAttributes.consistency || ''}:${ch.doughAttributes.color}:${ch.doughAttributes.cookState}:${ch.doughAttributes.embossedPattern || ''}:${ch.doughAttributes.fillings?.map((f: any) => `${f.itemId || ''}:${f.colorHex || ''}:${Math.round(f.weightGrams || 0)}`).join(',') || ''}`
        : '';
      const chPortions = typeof ch.portions === 'number' ? `:${ch.portions}/${ch.maxPortions || ''}` : '';
      parts.push(
        `${ch.itemId}:${Math.round((ch.brownLevel || 0) * 10)}:${Math.round((ch.charLevel || 0) * 10)}:${Math.round((ch.cookProgress || 0) * 10)}:${Math.round((ch.meltLevel || 0) * 10)}:${ch.cheeseGlazed ? 1 : 0}:${Math.round((ch.wetness || 0) / 10)}:${ch.attributes?.state || ''}${chPortions}${chDa}`
      );
    }
    childKey = parts.join(';');
  }
  const portionsKey = typeof item.portions === 'number' ? `${item.portions}/${item.maxPortions || ''}` : '';
  const da = item.doughAttributes;
  const daFillKey = da?.fillings
    ? da.fillings.map((f: any) => `${f.itemId || ''}:${f.colorHex || ''}:${Math.round(f.weightGrams || 0)}`).join(',')
    : '';
  const daKey = da
    ? `${da.shape}:${da.doughType || ''}:${da.consistency || ''}:${da.color}:${da.fleckColor || ''}:${da.cookState}:${da.embossedPattern || ''}:${daFillKey}:${Math.round(da.thicknessMm || 0)}:${Math.round((da.riseFactor || 1) * 10)}:${Math.round((da.weightGrams || da.totalWeightGrams || 0) / 5)}`
    : '';
  const rp = item.rollingPinAttributes;
  const rpKey = rp
    ? `${rp.modelId}:${rp.shape}:${rp.material}:${rp.color}:${rp.accentColor || ''}:${rp.pattern}:${rp.patternColor || ''}`
    : '';
  const pa = item.produceAttributes;
  const paKey = pa
    ? `${pa.speciesId || ''}:${pa.varietyRu || ''}:${pa.cutForm || ''}:${pa.size || ''}:${pa.part || ''}:${pa.modelKey || ''}:${pa.isPeeled ? 1 : 0}:${pa.isDried ? 1 : 0}:${pa.color || ''}:${pa.fleshColor || ''}:${Math.round((pa.remainingFraction ?? 1) * 20)}`
    : '';
  const ma = item.meatAttributes;
  const maKey = ma
    ? `${ma.speciesId || ''}:${ma.anatomicalPartRu || ''}:${ma.cutForm || ''}:${ma.size || ''}:${ma.color || ''}:${ma.fatColor || ''}:${ma.hasBone ? 1 : 0}:${ma.hasSkin ? 1 : 0}:${Math.round((ma.remainingFraction ?? 1) * 20)}`
    : '';
  const ba = item.branchAttributes;
  const baKey = ba
    ? `${ba.branchKind || ''}:${ba.color || ''}:${ba.attachedFruit?.itemId || ''}:${ba.attachedFruit?.count || 0}`
    : '';
  const kw = item.kitchenwareAttributes;
  const kwKey = kw
    ? `${kw.kind || ''}:${kw.material || ''}:${kw.shape || ''}:${kw.color || ''}:${kw.accentColor || ''}:${kw.pattern || ''}:${kw.patternColor || ''}:${kw.isElectric ? 1 : 0}:${kw.hasWhistle ? 1 : 0}:${kw.hasSaucer ? 1 : 0}`
    : '';
  const ph = item.phoneAttributes;
  const phKey = ph
    ? `${ph.modelId || ''}:${ph.chassisStyle || ''}:${ph.colorHex || ''}:${ph.accentHex || ''}:${ph.cameraPlateColor || ''}`
    : '';
  const hw = item.hardwareAttributes;
  const hwKey = hw ? `${hw.kind || ''}:${hw.colorHex || ''}:${hw.accentHex || ''}` : '';
  const choco = item.chocolateAttributes;
  const chocoKey = choco
    ? `${choco.shape || ''}:${choco.size || ''}:${choco.outerColor || ''}:${choco.innerColor || ''}:${choco.hasFilling ? 1 : 0}:${choco.surfaceTexture || ''}`
    : '';
  const gum = item.gummyAttributes;
  const gumKey = gum ? `${gum.shape || ''}:${gum.color || ''}:${gum.sourDust ? 1 : 0}` : '';
  const pel = item.pelmenAttributes;
  const pelKey = pel
    ? `${pel.shape || ''}:${pel.size || ''}:${pel.state || ''}:${pel.doughColor || ''}:${pel.fillingColor || ''}:${pel.flourDusting ? 1 : 0}:${pel.butterGlaze ? 1 : 0}`
    : '';
  const cl = item.clothingStats;
  const clKey = cl ? `${cl.color || ''}:${cl.secondaryColor || ''}` : '';
  const lbl = item.labelColor || '';
  return `${t}|${wet}|${soap}|${inf}|${cook}|${brown}|${char}|${melt}|${cheeseGlaze}|${st}|${method}|${soakCol}|${soakId}|${open}|${origCat}|${cTint}|${cVis}|${cdKey}|${fsKey}|${childKey}|${portionsKey}|${daKey}|${rpKey}|${paKey}|${maKey}|${baKey}|${kwKey}|${phKey}|${hwKey}|${chocoKey}|${gumKey}|${pelKey}|${clKey}|${lbl}`;
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
