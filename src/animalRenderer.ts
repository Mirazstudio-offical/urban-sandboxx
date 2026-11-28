/** Top-down 2.5D animal rendering coordinator, seasonal pelage adaptation, and shadow dispatch. */
import { Animal, GameWorld } from './types';
import { getCurrentSunShadowState, SunShadowState } from './shadowSystem';
import { performanceConfig } from './performanceConfig';
import {
  AnimalRenderContext,
  computeQuadrupedLegs,
  drawAnatomicalGroundShadow,
  drawSpeciesDownedPosture,
  mixColor,
  shadeColor,
} from './animalRenderUtils';
import {
  drawBear,
  drawFox,
  drawHare,
  drawHedgehog,
  drawMoose,
  drawRoeDeer,
  drawSquirrel,
  drawWildBoar,
  drawWolf,
} from './animalSpeciesWild';
import {
  drawCat,
  drawCow,
  drawDog,
  drawHorse,
  drawSheep,
} from './animalSpeciesDomestic';

function buildAnimalRenderContext(
  a: Animal,
  sun: SunShadowState,
  nowSec: number,
  isWinter: boolean,
  nightAlpha: number,
  detailZoom: boolean
): AnimalRenderContext {
  const halfLen = a.bodyLength * 0.5;
  const halfWid = a.bodyWidth * 0.5;
  const legs = computeQuadrupedLegs(a, halfLen, halfWid);

  // Transform world sun direction into animal-local coordinates (+X forward, +Y right)
  const cosA = Math.cos(a.angle);
  const sinA = Math.sin(a.angle);
  const sunLX = sun.sunDirX * cosA + sun.sunDirY * sinA;
  const sunLY = -sun.sunDirX * sinA + sun.sunDirY * cosA;

  // Seasonal pelage adaptation (winter coat molting)
  let baseCol = a.coat.baseColor;
  let secCol = a.coat.secondaryColor;
  let bellyCol = a.coat.bellyColor;
  const accentCol = a.coat.accentColor;

  if (isWinter) {
    if (a.species === 'hare') {
      baseCol = '#f1f5f9';
      secCol = '#cbd5e1';
      bellyCol = '#ffffff';
    } else if (a.species === 'roe_deer') {
      baseCol = '#7c766e';
      secCol = '#5c5751';
      bellyCol = '#cbd5e1';
    } else if (a.species === 'squirrel') {
      baseCol = '#94a3b8';
      secCol = '#64748b';
      bellyCol = '#f1f5f9';
    }
  }

  // Precompute 3D volumetric shading ramp
  const deepShadow = shadeColor(baseCol, 0.56);
  const midShadow = shadeColor(baseCol, 0.78);
  const highlightCol = mixColor(shadeColor(baseCol, 1.24), '#fff7ed', 0.14);
  const rimCol = mixColor(shadeColor(baseCol, 1.38), '#fef3c7', 0.28);

  return {
    a,
    halfLen,
    halfWid,
    nowSec,
    isWinter,
    nightAlpha,
    detailZoom,
    baseCol,
    secCol,
    bellyCol,
    accentCol,
    deepShadow,
    midShadow,
    highlightCol,
    rimCol,
    sunLX,
    sunLY,
    stretch: legs.bodyStretch,
    breath: 1.0 + Math.sin(a.breathPhase) * 0.022,
    spineBend: a.spineBend || 0,
    tailWag: Math.sin(a.tailPhase) * (0.35 + a.tailHeight * 0.45),
    headDrop: a.headPitch < -0.2 ? -a.headPitch * halfLen * 0.16 : 0,
    legs,
  };
}

/**
 * Renders a single animal's articulated ultra-realistic model in local space (centered at 0,0, facing +X).
 */
export function drawAnimalSpeciesBody(
  ctx: CanvasRenderingContext2D,
  a: Animal,
  sun: SunShadowState,
  nowSec: number,
  isWinter: boolean,
  nightAlpha: number,
  detailZoom: boolean
): void {
  const r = buildAnimalRenderContext(a, sun, nowSec, isWinter, nightAlpha, detailZoom);

  if (a.state === 'dead' || a.state === 'knocked_down') {
    drawSpeciesDownedPosture(ctx, r);
    return;
  }

  switch (a.species) {
    case 'moose':
      drawMoose(ctx, r);
      return;
    case 'roe_deer':
      drawRoeDeer(ctx, r);
      return;
    case 'wild_boar':
      drawWildBoar(ctx, r);
      return;
    case 'bear':
      drawBear(ctx, r);
      return;
    case 'wolf':
      drawWolf(ctx, r);
      return;
    case 'fox':
      drawFox(ctx, r);
      return;
    case 'squirrel':
      drawSquirrel(ctx, r);
      return;
    case 'hedgehog':
      drawHedgehog(ctx, r);
      return;
    case 'hare':
      drawHare(ctx, r);
      return;
    case 'cow':
      drawCow(ctx, r);
      return;
    case 'sheep':
      drawSheep(ctx, r);
      return;
    case 'horse':
      drawHorse(ctx, r);
      return;
    case 'dog':
      drawDog(ctx, r);
      return;
    case 'cat':
      drawCat(ctx, r);
      return;
  }
}

export class AnimalRenderer {
  public static renderAnimals(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    nightAlpha: number,
    cameraZoom: number
  ) {
    const animals = world.animals;
    if (!performanceConfig.enableAnimals || !animals || animals.length === 0) return;

    const nowSec = typeof performance !== 'undefined' ? performance.now() * 0.001 : 0;
    const sun = getCurrentSunShadowState();
    const season = world.calendar?.season || world.season || 'summer';
    const isWinter = season === 'winter' || (world.snowCover ?? 0) > 0.55;
    const detailZoom = cameraZoom > 0.48 && !performanceConfig.lowQualityRendering;

    ctx.save();
    for (let i = 0; i < animals.length; i++) {
      const a = animals[i];
      if (a.state === 'in_tree') continue; // Squirrels hidden up inside pine/birch canopy
      const pad = Math.max(28, a.bodyLength * 1.5);
      if (a.x < minX - pad || a.x > maxX + pad || a.y < minY - pad || a.y > maxY + pad) {
        continue;
      }

      const visualY = a.y - (a.z || 0) * 0.72;

      // 1. Anatomical Contact AO + Directional Sun-Projected Cast Shadow
      drawAnatomicalGroundShadow(ctx, a, sun, nightAlpha, isWinter);

      // 2. Articulated Top-Down 2.5D Ultra-Realistic Species Model
      ctx.save();
      ctx.translate(a.x, visualY);
      ctx.rotate(a.angle);

      // Subtle leaping scale elevation when bounding/launched
      if (a.z > 0.5) {
        const zScale = 1.0 + Math.min(0.24, a.z * 0.012);
        ctx.scale(zScale, zScale);
      }

      drawAnimalSpeciesBody(ctx, a, sun, nowSec, isWinter, nightAlpha, detailZoom);

      if (a.anatomy && (a.anatomy.bloodLoss > 3 || a.anatomy.gunshotCount > 0)) {
        const halfL = (a.bodyLength || 14) * 0.5;
        ctx.fillStyle = 'rgba(136, 19, 24, 0.72)';
        if (a.anatomy.zones.vitals.length > 0) {
          ctx.beginPath();
          ctx.ellipse(halfL * 0.2, 0, Math.max(1.3, halfL * 0.22), Math.max(1.1, halfL * 0.16), 0, 0, Math.PI * 2);
          ctx.fill();
        }
        if (a.anatomy.zones.head.length > 0) {
          ctx.beginPath();
          ctx.arc(halfL * 0.72, 0, Math.max(1.0, halfL * 0.14), 0, Math.PI * 2);
          ctx.fill();
        }
        if (a.anatomy.zones.abdomen.length > 0) {
          ctx.beginPath();
          ctx.ellipse(-halfL * 0.25, 0, Math.max(1.2, halfL * 0.2), Math.max(1.0, halfL * 0.15), 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
    ctx.restore();
  }
}
