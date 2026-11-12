import { GameWorld, Building, Vehicle, Pedestrian, Tree, StreetProp, Player, Vector2D } from './types';
import { getVehicleBasePolygon } from './vehicleVisuals';
import { mapPolyToDeformVerts } from './softbodyPolyMap';
import { getEffectiveWeatherWeights } from './weatherTransition';
import { performanceConfig } from './performanceConfig';
import { RemotePlayerState } from './onlineSystem';

export type Point = Vector2D;

export interface CloudShadowCluster {
  baseX: number;
  baseY: number;
  speedMult: number;
  baseScale: number;
  lobes: {
    relX: number;
    relY: number;
    radius: number;
    opacityMultiplier: number;
  }[];
}

export interface SunShadowState {
  /** Unit vector pointing FROM the ground TOWARD the sun/moon in world XY */
  sunDirX: number;
  sunDirY: number;
  /** Unit vector pointing in the direction shadows are cast (opposite to sunDir) */
  shadowDirX: number;
  shadowDirY: number;
  /** World-space shadow displacement per 1px of object height (shadowDir * lengthFactor) */
  castX: number;
  castY: number;
  /** Solar elevation in [0.05 .. 0.85] (radians/normalized altitude) */
  sunElevation: number;
  /** Shadow length multiplier per 1 world height unit (cotangent of solar elevation) */
  lengthFactor: number;
  /** Overall opacity of the shadow layer in [0 .. 0.85] before lightmap cutouts */
  shadowOpacity: number;
  /** Softness / penumbra expansion factor (higher when overcast or low sun) */
  penumbraFactor: number;
  /** Whether we are currently in lunar (night) shadow mode vs solar shadow mode */
  isNight: boolean;
  /** Ambient darkness alpha from time of day + weather */
  ambientNightAlpha: number;
}

let currentSunShadowState: SunShadowState = {
  sunDirX: 0.42,
  sunDirY: 0.91,
  shadowDirX: -0.42,
  shadowDirY: -0.91,
  castX: -0.44,
  castY: -0.96,
  sunElevation: 0.62,
  lengthFactor: 1.05,
  shadowOpacity: 0.74,
  penumbraFactor: 1.0,
  isNight: false,
  ambientNightAlpha: 0,
};

export function getCurrentSunShadowState(): SunShadowState {
  return currentSunShadowState;
}

/**
 * Computes physically grounded solar & lunar 3D shadow vectors from astronomical time,
 * calendar sunrise/sunset, season at ~55°N latitude, and atmospheric weather weights.
 */
export function computeSunShadowState(
  world: GameWorld,
  timeHour: number
): SunShadowState {
  const sunrise = world.calendar?.sunriseHour ?? 6.5;
  const sunset = world.calendar?.sunsetHour ?? 18.5;
  const dayLen = Math.max(2.0, sunset - sunrise);

  const weights = getEffectiveWeatherWeights(world);
  const cloudCover = Math.min(
    1.0,
    weights.rain * 0.85 + weights.fog * 0.92 + weights.snow * 0.75 + weights.overcast * 0.55
  );

  // Season latitude declination factor:
  // In summer at solar noon the sun climbs high near zenith (short compact shadows);
  // in spring/autumn it transits at medium-high elevation; in winter it arcs lower in the South.
  const season = world.calendar?.season ?? world.season ?? 'summer';
  const maxSeasonalElev =
    season === 'winter'
      ? 0.58
      : season === 'autumn' || season === 'spring'
      ? 0.78
      : 0.92;

  let sunDirX = 0;
  let sunDirY = 1;
  let sunElevation = 0.5;
  let isNight = false;
  let baseShadowOpacity = 0.75;

  // Dawn/dusk twilight buffer (0.6h before sunrise and after sunset)
  const dawnStart = sunrise - 0.55;
  const duskEnd = sunset + 0.55;

  if (timeHour >= dawnStart && timeHour <= duskEnd) {
    // Solar daytime & golden hour arc:
    // Sun rises in the East (+X, +Y), transits through South-Southeast at 12:00 (Russian Decree Time solar noon ~13:35),
    // and sets in the West (-X, +Y). Using a 0.65 power curve on cos(azimuth) avoids lingering at sunDirX ~ 0,
    // ensuring both North-South and East-West building facades cast unmistakable 3D depth shadows at midday.
    const shiftedHour = timeHour - 0.85; // Shift solar meridian transit to ~13:20 local clock time
    const dayFrac = Math.max(0, Math.min(1, (shiftedHour - sunrise) / dayLen));
    const azimuthAngle = (1.0 - dayFrac) * Math.PI;
    const rawCos = Math.cos(azimuthAngle);
    sunDirX = (rawCos >= 0 ? 1 : -1) * Math.max(0.34, Math.pow(Math.abs(rawCos), 0.68));
    // Keep Southern component (+Y) so shadows cast North-West in morning/noon and North-East in afternoon
    const southBias = season === 'winter' ? 0.88 : season === 'summer' ? 0.68 : 0.78;
    sunDirY = Math.max(0.36, Math.sin(azimuthAngle) * southBias + 0.24);
    const norm = Math.hypot(sunDirX, sunDirY) || 1;
    sunDirX /= norm;
    sunDirY /= norm;

    const elevFrac = Math.max(0, Math.min(1, (timeHour - sunrise) / dayLen));
    const rawElev = Math.max(0, Math.sin(Math.PI * elevFrac));
    sunElevation = Math.max(0.08, rawElev * maxSeasonalElev);

    // Smooth fade during dawn and dusk transitions
    let twilightFade = 1.0;
    if (timeHour < sunrise + 0.35) {
      twilightFade = Math.max(0.22, Math.min(1.0, (timeHour - dawnStart) / 0.9));
    } else if (timeHour > sunset - 0.35) {
      twilightFade = Math.max(0.22, Math.min(1.0, (duskEnd - timeHour) / 0.9));
    }

    // Deep, crisp shadows in clear sun (~0.58), softened by heavy rain/fog/overcast
    baseShadowOpacity = (0.58 - cloudCover * 0.32) * twilightFade;
  } else {
    // Lunar nighttime arc: Moon transits from East-Southeast to West-Southwest
    isNight = true;
    const nightLen = Math.max(2.0, 24.0 - dayLen);
    const nightElapsed =
      timeHour > duskEnd
        ? timeHour - duskEnd
        : timeHour + (24.0 - duskEnd);
    const nightFrac = Math.max(0, Math.min(1, nightElapsed / nightLen));
    const moonAzimuth = (1.0 - nightFrac) * Math.PI;
    const rawMoonCos = Math.cos(moonAzimuth);
    sunDirX = (rawMoonCos >= 0 ? 1 : -1) * Math.max(0.34, Math.pow(Math.abs(rawMoonCos), 0.72));
    sunDirY = Math.max(0.45, Math.sin(moonAzimuth) * 0.75 + 0.25);
    const norm = Math.hypot(sunDirX, sunDirY) || 1;
    sunDirX /= norm;
    sunDirY /= norm;

    const rawMoonElev = Math.sin(Math.PI * nightFrac);
    sunElevation = Math.max(0.22, rawMoonElev * 0.65);
    baseShadowOpacity = (0.24 - cloudCover * 0.16) * (0.55 + 0.45 * rawMoonElev);
  }

  const shadowDirX = -sunDirX;
  const shadowDirY = -sunDirY;

  // Shadow length per 1px of 3D height:
  // At solar noon in summer (sunElevation ~ 0.92), lengthFactor is ~0.36 (compact for cars/cottages, while tall 12-16 story towers still cast ~115-155px shadows).
  // In spring/autumn noon (sunElevation ~ 0.78), lengthFactor is ~0.50.
  // Near sunrise/sunset (sunElevation -> 0.08), lengthFactor stretches up to ~2.55.
  const rawLengthFactor = isNight
    ? 0.48 + (1.0 - sunElevation) * 0.85
    : Math.min(2.55, 0.32 + Math.pow(1.0 - sunElevation, 1.75) * 2.45);
  const lengthScaleMult = Math.max(0.25, Math.min(2.5, (performanceConfig.shadowLengthScale ?? 100) / 100));
  const lengthFactor = rawLengthFactor * lengthScaleMult;

  const softnessRatio = Math.max(0, Math.min(2.0, (performanceConfig.shadowSoftness ?? 60) / 60));
  const penumbraFactor = (0.85 + cloudCover * 1.4 + (1.0 - sunElevation) * 0.45) * softnessRatio;

  const intensityMult = Math.max(0.1, Math.min(2.0, (performanceConfig.shadowIntensity ?? 100) / 100));
  const finalShadowOpacity = Math.max(0.03, Math.min(0.88, baseShadowOpacity * intensityMult));

  currentSunShadowState = {
    sunDirX,
    sunDirY,
    shadowDirX,
    shadowDirY,
    castX: shadowDirX * lengthFactor,
    castY: shadowDirY * lengthFactor,
    sunElevation,
    lengthFactor,
    shadowOpacity: finalShadowOpacity,
    penumbraFactor,
    isNight,
    ambientNightAlpha: 0,
  };

  return currentSunShadowState;
}

/**
 * Computes the world-space shadow offset (dx, dy) for a given vertical height H (in world pixels).
 */
export function getShadowOffset(
  heightPx: number,
  state: SunShadowState = currentSunShadowState
): { dx: number; dy: number } {
  const len = heightPx * state.lengthFactor;
  return {
    dx: state.shadowDirX * len,
    dy: state.shadowDirY * len,
  };
}

/**
 * Converts a world-space shadow offset for height `heightPx` into an object's local coordinate frame
 * rotated by `objectAngle` (so local drawings after `ctx.rotate(objectAngle)` still cast shadows in true world sun direction!).
 */
export function getLocalShadowOffset(
  heightPx: number,
  objectAngle: number,
  state: SunShadowState = currentSunShadowState
): { lx: number; ly: number } {
  const { dx, dy } = getShadowOffset(heightPx, state);
  const cos = Math.cos(-objectAngle);
  const sin = Math.sin(-objectAngle);
  return {
    lx: dx * cos - dy * sin,
    ly: dx * sin + dy * cos,
  };
}

/**
 * Clips the canvas to the EXTERIOR of a polygon using the 'evenodd' winding rule.
 * This ensures an object's 3D extruded shadow NEVER darkens its own sunlit top surface
 * AND never uses 'destination-out' (so it never erases shadows cast onto this object by taller casters!).
 */
function clipOutsidePolygon(
  ctx: CanvasRenderingContext2D,
  poly: Point[],
  padBounds: { minX: number; minY: number; maxX: number; maxY: number }
) {
  ctx.beginPath();
  ctx.rect(
    padBounds.minX,
    padBounds.minY,
    padBounds.maxX - padBounds.minX,
    padBounds.maxY - padBounds.minY
  );
  if (poly.length >= 3) {
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) {
      ctx.lineTo(poly[i].x, poly[i].y);
    }
    ctx.closePath();
  }
  ctx.clip('evenodd');
}

function clipOutsideRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  padX: number,
  padY: number
) {
  const bx = Math.min(x, x + padX) - 24;
  const by = Math.min(y, y + padY) - 24;
  const bw = w + Math.abs(padX) + 48;
  const bh = h + Math.abs(padY) + 48;
  ctx.beginPath();
  ctx.rect(bx, by, bw, bh);
  ctx.rect(x, y, w, h);
  ctx.clip('evenodd');
}

function clipOutsideRotatedRect(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  angle: number,
  padX: number,
  padY: number
) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const hw = w * 0.5;
  const hh = h * 0.5;
  const poly: Point[] = [
    { x: cx + (-hw * cos - -hh * sin), y: cy + (-hw * sin + -hh * cos) },
    { x: cx + (hw * cos - -hh * sin), y: cy + (hw * sin + -hh * cos) },
    { x: cx + (hw * cos - hh * sin), y: cy + (hw * sin + hh * cos) },
    { x: cx + (-hw * cos - hh * sin), y: cy + (-hw * sin + hh * cos) },
  ];
  const reach = Math.hypot(hw, hh) + Math.hypot(padX, padY) + 24;
  clipOutsidePolygon(ctx, poly, {
    minX: cx - reach,
    minY: cy - reach,
    maxX: cx + reach,
    maxY: cy + reach,
  });
}

function clipOutsideCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  padX: number,
  padY: number
) {
  const bx = Math.min(cx - r, cx - r + padX) - 24;
  const by = Math.min(cy - r, cy - r + padY) - 24;
  const bw = r * 2 + Math.abs(padX) + 48;
  const bh = r * 2 + Math.abs(padY) + 48;
  ctx.beginPath();
  ctx.rect(bx, by, bw, bh);
  ctx.moveTo(cx + r, cy);
  ctx.arc(cx, cy, Math.max(0.5, r), 0, Math.PI * 2);
  ctx.clip('evenodd');
}

/**
 * Extrudes a 2D convex or concave polygon along (dx, dy) to form its true 3D cast shadow volume.
 */
/**
 * Extrudes a 2D convex or concave polygon along (dx, dy) to form its true 3D cast shadow volume
 * in a SINGLE batched beginPath/fill call using consistent clockwise winding for all subpaths.
 */
export function extrudePolygonShadow(
  ctx: CanvasRenderingContext2D,
  poly: Point[],
  baseDx: number,
  baseDy: number,
  topDx: number,
  topDy: number
) {
  const n = poly.length;
  if (n < 3) return;

  // Determine polygon signed area so base and top footprints are traced with positive (CW) winding
  let area2 = 0;
  for (let i = 0; i < n; i++) {
    const p0 = poly[i];
    const p1 = poly[(i + 1) % n];
    area2 += p0.x * p1.y - p1.x * p0.y;
  }
  const isCW = area2 >= 0;

  ctx.beginPath();

  // 1. Base footprint at zBottom (always CW)
  if (isCW) {
    ctx.moveTo(poly[0].x + baseDx, poly[0].y + baseDy);
    for (let i = 1; i < n; i++) {
      ctx.lineTo(poly[i].x + baseDx, poly[i].y + baseDy);
    }
  } else {
    ctx.moveTo(poly[n - 1].x + baseDx, poly[n - 1].y + baseDy);
    for (let i = n - 2; i >= 0; i--) {
      ctx.lineTo(poly[i].x + baseDx, poly[i].y + baseDy);
    }
  }
  ctx.closePath();

  // 2. Top footprint at zTop (always CW)
  const extDx = topDx - baseDx;
  const extDy = topDy - baseDy;
  if (Math.abs(extDx) > 0.05 || Math.abs(extDy) > 0.05) {
    if (isCW) {
      ctx.moveTo(poly[0].x + topDx, poly[0].y + topDy);
      for (let i = 1; i < n; i++) {
        ctx.lineTo(poly[i].x + topDx, poly[i].y + topDy);
      }
    } else {
      ctx.moveTo(poly[n - 1].x + topDx, poly[n - 1].y + topDy);
      for (let i = n - 2; i >= 0; i--) {
        ctx.lineTo(poly[i].x + topDx, poly[i].y + topDy);
      }
    }
    ctx.closePath();

    // 3. Side wall quads connecting base to top (oriented with positive CW winding so nonzero rule never cancels)
    for (let i = 0; i < n; i++) {
      const p0 = poly[i];
      const p1 = poly[(i + 1) % n];
      const edgeDx = p1.x - p0.x;
      const edgeDy = p1.y - p0.y;
      const cross = edgeDx * extDy - edgeDy * extDx;
      if (Math.abs(cross) < 0.001) continue;
      if (cross > 0) {
        ctx.moveTo(p0.x + baseDx, p0.y + baseDy);
        ctx.lineTo(p1.x + baseDx, p1.y + baseDy);
        ctx.lineTo(p1.x + topDx, p1.y + topDy);
        ctx.lineTo(p0.x + topDx, p0.y + topDy);
      } else {
        ctx.moveTo(p0.x + baseDx, p0.y + baseDy);
        ctx.lineTo(p0.x + topDx, p0.y + topDy);
        ctx.lineTo(p1.x + topDx, p1.y + topDy);
        ctx.lineTo(p1.x + baseDx, p1.y + baseDy);
      }
      ctx.closePath();
    }
  }

  ctx.fill();
}

const _rectPolyScratch: Point[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];

/**
 * Extrudes an axis-aligned rectangle (x, y, w, h) from zBottom to zTop along the sun shadow vector.
 */
export function extrudeRectShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  zBottom: number,
  zTop: number,
  state: SunShadowState
) {
  const bOff = getShadowOffset(zBottom, state);
  const tOff = getShadowOffset(zTop, state);
  _rectPolyScratch[0].x = x;
  _rectPolyScratch[0].y = y;
  _rectPolyScratch[1].x = x + w;
  _rectPolyScratch[1].y = y;
  _rectPolyScratch[2].x = x + w;
  _rectPolyScratch[2].y = y + h;
  _rectPolyScratch[3].x = x;
  _rectPolyScratch[3].y = y + h;
  extrudePolygonShadow(ctx, _rectPolyScratch, bOff.dx, bOff.dy, tOff.dx, tOff.dy);
}

const _rotRectPolyScratch: Point[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];

/**
 * Extrudes a rotated rectangle centered at (cx, cy) with size (w, h) and rotation `angle`
 * from zBottom to zTop in world space.
 */
export function extrudeRotatedRectShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  angle: number,
  zBottom: number,
  zTop: number,
  state: SunShadowState
) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const hw = w * 0.5;
  const hh = h * 0.5;
  _rotRectPolyScratch[0].x = cx + (-hw * cos - -hh * sin);
  _rotRectPolyScratch[0].y = cy + (-hw * sin + -hh * cos);
  _rotRectPolyScratch[1].x = cx + (hw * cos - -hh * sin);
  _rotRectPolyScratch[1].y = cy + (hw * sin + -hh * cos);
  _rotRectPolyScratch[2].x = cx + (hw * cos - hh * sin);
  _rotRectPolyScratch[2].y = cy + (hw * sin + hh * cos);
  _rotRectPolyScratch[3].x = cx + (-hw * cos - hh * sin);
  _rotRectPolyScratch[3].y = cy + (-hw * sin + hh * cos);
  const bOff = getShadowOffset(zBottom, state);
  const tOff = getShadowOffset(zTop, state);
  extrudePolygonShadow(ctx, _rotRectPolyScratch, bOff.dx, bOff.dy, tOff.dx, tOff.dy);
}

/**
 * Extrudes a vertical cylinder (circle of radius `r` at `(cx, cy)`) from `zBottom` to `zTop`.
 */
export function extrudeCylinderShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  zBottom: number,
  zTop: number,
  state: SunShadowState
) {
  const bOff = getShadowOffset(zBottom, state);
  const tOff = getShadowOffset(zTop, state);
  const x0 = cx + bOff.dx;
  const y0 = cy + bOff.dy;
  const x1 = cx + tOff.dx;
  const y1 = cy + tOff.dy;

  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);

  ctx.beginPath();
  if (dist < 0.2) {
    ctx.arc(x0, y0, r, 0, Math.PI * 2);
  } else {
    const ang = Math.atan2(dy, dx);
    ctx.arc(x0, y0, r, ang + Math.PI * 0.5, ang - Math.PI * 0.5, false);
    ctx.arc(x1, y1, r, ang - Math.PI * 0.5, ang + Math.PI * 0.5, false);
    ctx.closePath();
  }
  ctx.fill();
}

/**
 * Estimates realistic 3D building height in world pixels from building archetype, floorsCount, interiors, and footprint.
 * Scale reference: standing human (~1.8m) = 22px, city bus (~3.1m) = 34px, 1 residential floor (~3.0m) = 26-27px.
 */
export function getBuildingHeightPx(bld: Building): number {
  // 1. Specialized non-story structures & industrial/infrastructure archetypes
  switch (bld.type) {
    case 'railway_platform':
    case 'gas_station_island':
      return 10;
    case 'garage_ramp':
      return 16;
    case 'garage_cooperative':
    case 'garage_box':
    case 'garage_workshop':
    case 'garage_gatehouse':
    case 'garage_substation':
    case 'railway_crossing_post':
      return 22;
    case 'park_monument':
      return 24;
    case 'gas_station_canopy':
      return 52;
    case 'industrial':
      return 76;
    case 'sports_stadium':
      return 92;
    case 'suburban': {
      const idLower = (bld.id || '').toLowerCase();
      const nameLower = (bld.nameRu || '').toLowerCase();
      const maxDim = Math.max(bld.width || 0, bld.height || 0);
      // 1-story outbuildings: bathhouse (баня), suburban garage, shed, or ruined izba
      if (
        idLower.includes('banya') ||
        idLower.includes('bathhouse') ||
        idLower.includes('shed') ||
        idLower.includes('garage') ||
        idLower.includes('abandoned') ||
        nameLower.includes('баня') ||
        nameLower.includes('гараж') ||
        nameLower.includes('сарай') ||
        maxDim <= 74
      ) {
        return 18;
      }
      // 1-story rural log izbas, village stores (сельпо), club, barn
      if (
        idLower.includes('izba') ||
        idLower.includes('village') ||
        idLower.includes('barn') ||
        idLower.includes('selpo') ||
        idLower.includes('club') ||
        maxDim <= 125
      ) {
        return 24;
      }
      // 2-story suburban brick/timber cottages (КП «Зелёный Рукав» plots)
      return 38;
    }
  }

  // 2. Determine true floor count from explicit floorsCount, interior floor keys, or building archetype
  const interiorFloors = bld.interiors ? Object.keys(bld.interiors).length : 0;
  let floors = typeof bld.floorsCount === 'number' && bld.floorsCount > 0 ? bld.floorsCount : interiorFloors;

  if (floors <= 1) {
    switch (bld.type) {
      case 'business_center':
        floors = 16;
        break;
      case 'modern_residential':
        floors = 12;
        break;
      case 'panel_apartment':
        floors = 9;
        break;
      case 'brick_residential':
      case 'office':
        floors = 5;
        break;
      case 'hospital':
      case 'police_station':
      case 'real_estate_agency':
        floors = 3;
        break;
      case 'school_kindergarten':
      case 'fire_station':
      case 'shopping_mall':
      case 'commercial':
      case 'commercial_gallery':
      case 'cultural_center':
      case 'transit_hub':
      case 'railway_station':
        floors = 2;
        break;
      default:
        floors = Math.max(1, floors);
        break;
    }
  }

  // 3. Multi-story buildings (2 to 16+ stories):
  // - 5-story brick house (Stalinka / Khrushchevka): 5 * 26 = 130px
  // - 9-story panel apartment (II-49): 9 * 26 = 234px
  // - 12-story modern residential tower: 12 * 27 = 324px
  // - 16-story business center skyscraper: 16 * 27 = 432px
  if (floors >= 2) {
    const pxPerFloor =
      bld.type === 'business_center' || bld.type === 'modern_residential'
        ? 27
        : bld.type === 'shopping_mall' ||
          bld.type === 'commercial' ||
          bld.type === 'commercial_gallery' ||
          bld.type === 'school_kindergarten' ||
          bld.type === 'fire_station' ||
          bld.type === 'transit_hub' ||
          bld.type === 'cultural_center'
        ? 33
        : bld.type === 'hospital' || bld.type === 'police_station' || bld.type === 'real_estate_agency'
        ? 29
        : 26;
    return floors * pxPerFloor;
  }

  // 4. Single-story urban commercial, retail, dining & service buildings
  switch (bld.type) {
    case 'gas_station_shop':
    case 'bakery_cafe':
    case 'coffee_bistro':
    case 'pharmacy_store':
    case 'tactical_store':
    case 'car_wash_station':
      return 36;
    case 'railway_warehouse':
    case 'auto_service_center':
    case 'car_dealership':
    case 'fast_food_restaurant':
    case 'pizzeria_restaurant':
    case 'supermarket_store':
    case 'electronics_store':
    case 'sports_store':
    case 'shop':
    default:
      return 44;
  }
}

function hashCoord(x: number, y: number): number {
  let h = ((Math.round(x) * 374761393) ^ (Math.round(y) * 668265263)) >>> 0;
  h = ((h ^ (h >> 13)) * 1274126177) >>> 0;
  return (h ^ (h >> 16)) >>> 0;
}

/**
 * Renders 3D shadows for rooftop structures (parapets, elevator penthouses, HVAC units,
 * chimneys, smokestacks, skylights, pitched roof ridges) directly onto building roofs and beyond.
 */
function renderBuildingRooftopShadows(
  sCtx: CanvasRenderingContext2D,
  bld: Building,
  sunState: SunShadowState
) {
  if (
    bld.type === 'park_monument' ||
    bld.type === 'gas_station_island' ||
    bld.type === 'railway_platform' ||
    bld.type === 'garage_ramp'
  ) {
    return;
  }

  const h = hashCoord(bld.x, bld.y);

  // 1. Pitched / Hip Roofs (Suburban Houses, Village Cottages, Small Residential, Railway Station)
  if (
    bld.type === 'suburban' ||
    bld.type === 'railway_station' ||
    bld.type === 'railway_crossing_post' ||
    ((bld.type === 'residential' || bld.type === 'brick_residential') &&
      bld.width <= 120 &&
      bld.height <= 120 &&
      h % 3 === 0)
  ) {
    const isHorizontal = bld.width >= bld.height;
    const cx = bld.x + bld.width * 0.5;
    const cy = bld.y + bld.height * 0.5;

    // Leeward roof slope shade (depends on whether sun is illuminating the slope or not)
    if (isHorizontal) {
      const northDot = -sunState.sunDirY;
      const southDot = sunState.sunDirY;
      if (northDot < 0.15) {
        sCtx.fillRect(bld.x + 2, bld.y + 2, bld.width - 4, bld.height * 0.5 - 2);
      }
      if (southDot < 0.15) {
        sCtx.fillRect(bld.x + 2, cy, bld.width - 4, bld.height * 0.5 - 2);
      }
    } else {
      const westDot = -sunState.sunDirX;
      const eastDot = sunState.sunDirX;
      if (westDot < 0.15) {
        sCtx.fillRect(bld.x + 2, bld.y + 2, bld.width * 0.5 - 2, bld.height - 4);
      }
      if (eastDot < 0.15) {
        sCtx.fillRect(cx, bld.y + 2, bld.width * 0.5 - 2, bld.height - 4);
      }
    }

    // Brick chimney 3D shadow on pitched roof
    const chimW = bld.type === 'suburban' ? 7 : 10;
    const chimH = bld.type === 'suburban' ? 7 : 10;
    const chimZ = bld.type === 'suburban' ? 14 : 18;
    const chimX = isHorizontal
      ? bld.x + bld.width * (0.28 + ((h & 7) / 7) * 0.44) - chimW * 0.5
      : cx - chimW * 0.5 + (((h >> 3) & 1) ? -5 : 5);
    const chimY = isHorizontal
      ? cy - chimH * 0.5 + (((h >> 3) & 1) ? -5 : 5)
      : bld.y + bld.height * (0.28 + ((h & 7) / 7) * 0.44) - chimH * 0.5;

    const cOff = getShadowOffset(chimZ, sunState);
    sCtx.save();
    clipOutsideRect(sCtx, chimX, chimY, chimW, chimH, cOff.dx, cOff.dy);
    extrudeRectShadow(sCtx, chimX, chimY, chimW, chimH, 0, chimZ, sunState);
    sCtx.restore();
    return;
  }

  // 2. Garage Box / Cooperative Stove Pipes
  if (
    bld.type === 'garage_box' ||
    bld.type === 'garage_cooperative' ||
    bld.type === 'garage_workshop'
  ) {
    if (h % 2 === 0) {
      const pipeX = bld.x + bld.width * (0.25 + ((h & 7) / 14));
      const pipeY = bld.y + bld.height * (0.25 + (((h >> 3) & 7) / 14));
      const pOff = getShadowOffset(12, sunState);
      sCtx.save();
      clipOutsideCircle(sCtx, pipeX, pipeY, 2.0, pOff.dx, pOff.dy);
      extrudeCylinderShadow(sCtx, pipeX, pipeY, 2.4, 0, 12, sunState);
      sCtx.restore();
    }
    return;
  }

  // 3. Flat-Roofed Buildings (Residential Blocks, Commercial Towers, Shops, Warehouses, Industrial)
  const parapetW = Math.min(8, Math.max(4, Math.min(bld.width, bld.height) * 0.055));
  const innerX = bld.x + parapetW;
  const innerY = bld.y + parapetW;
  const innerW = bld.width - parapetW * 2;
  const innerH = bld.height - parapetW * 2;
  if (innerW <= 12 || innerH <= 12) return;

  // 3a. Parapet wall inner shadow cast onto the recessed flat roof deck
  const parapetZ = 6.5;
  const pOff = getShadowOffset(parapetZ, sunState);
  sCtx.save();
  sCtx.beginPath();
  sCtx.rect(innerX, innerY, innerW, innerH);
  sCtx.clip();
  if (pOff.dx > 0.3) {
    sCtx.fillRect(innerX, innerY, Math.min(innerW, pOff.dx), innerH);
  } else if (pOff.dx < -0.3) {
    const pw = Math.min(innerW, -pOff.dx);
    sCtx.fillRect(innerX + innerW - pw, innerY, pw, innerH);
  }
  if (pOff.dy > 0.3) {
    sCtx.fillRect(innerX, innerY, innerW, Math.min(innerH, pOff.dy));
  } else if (pOff.dy < -0.3) {
    const ph = Math.min(innerH, -pOff.dy);
    sCtx.fillRect(innerX, innerY + innerH - ph, innerW, ph);
  }
  sCtx.restore();

  // 3b. Explicit roofDetails from map.json (AC units, skylights, antennas, helipads)
  if (bld.roofDetails && bld.roofDetails.length > 0) {
    for (const rd of bld.roofDetails) {
      const rx = bld.x + rd.rx * bld.width;
      const ry = bld.y + rd.ry * bld.height;
      const rw = Math.max(6, rd.rw * bld.width);
      const rh = Math.max(6, rd.rh * bld.height);
      if (rd.type === 'antenna') {
        extrudeCylinderShadow(sCtx, rx, ry, 2.2, 0, 38, sunState);
      } else if (rd.type === 'ac' || rd.type === 'skylight') {
        const z = rd.type === 'ac' ? 12 : 9;
        const off = getShadowOffset(z, sunState);
        sCtx.save();
        clipOutsideRect(sCtx, rx, ry, rw, rh, off.dx, off.dy);
        extrudeRectShadow(sCtx, rx, ry, rw, rh, 0, z, sunState);
        sCtx.restore();
      }
    }
  }

  // 3c. Procedural Rooftop Superstructures (Elevator Penthouses, Stairwell Bulkheads, HVAC Arrays, Smokestacks)
  const isHorizontal = bld.width >= bld.height;
  const longSide = isHorizontal ? innerW : innerH;
  const shortSide = isHorizontal ? innerH : innerW;

  if (
    bld.type === 'residential' ||
    bld.type === 'panel_apartment' ||
    bld.type === 'brick_residential' ||
    bld.type === 'modern_residential'
  ) {
    const numSections = Math.max(1, Math.min(4, Math.floor(longSide / 85)));
    for (let s = 0; s < numSections; s++) {
      const frac = (s + 0.5) / numSections;
      const phW = isHorizontal ? Math.min(26, (longSide / numSections) * 0.38) : Math.min(22, shortSide * 0.42);
      const phH = isHorizontal ? Math.min(22, shortSide * 0.42) : Math.min(26, (longSide / numSections) * 0.38);
      const phX = isHorizontal
        ? innerX + longSide * frac - phW * 0.5
        : innerX + (innerW - phW) * (((h + s) & 1) ? 0.32 : 0.68);
      const phY = isHorizontal
        ? innerY + (innerH - phH) * (((h + s) & 1) ? 0.32 : 0.68)
        : innerY + longSide * frac - phH * 0.5;
      const phZ = 18;
      const off = getShadowOffset(phZ, sunState);

      sCtx.save();
      clipOutsideRect(sCtx, phX, phY, phW, phH, off.dx, off.dy);
      extrudeRectShadow(sCtx, phX, phY, phW, phH, 0, phZ, sunState);
      sCtx.restore();

      const ventW = 6;
      const ventH = 6;
      const ventX = isHorizontal ? phX + phW + 8 : phX + (phW - ventW) * 0.5;
      const ventY = isHorizontal ? phY + (phH - ventH) * 0.5 : phY + phH + 8;
      if (ventX + ventW < innerX + innerW - 2 && ventY + ventH < innerY + innerH - 2) {
        const vOff = getShadowOffset(10, sunState);
        sCtx.save();
        clipOutsideRect(sCtx, ventX, ventY, ventW, ventH, vOff.dx, vOff.dy);
        extrudeRectShadow(sCtx, ventX, ventY, ventW, ventH, 0, 10, sunState);
        sCtx.restore();
      }
    }
  } else if (
    bld.type === 'industrial' ||
    bld.type === 'railway_warehouse'
  ) {
    const numBays = Math.max(2, Math.min(5, Math.floor(longSide / 52)));
    for (let b = 0; b < numBays; b++) {
      const bayFrac = (b + 0.5) / numBays;
      const monW = isHorizontal ? Math.min(28, (longSide / numBays) * 0.55) : Math.min(innerW - 16, shortSide * 0.68);
      const monH = isHorizontal ? Math.min(innerH - 16, shortSide * 0.68) : Math.min(28, (longSide / numBays) * 0.55);
      const monX = isHorizontal ? innerX + longSide * bayFrac - monW * 0.5 : innerX + (innerW - monW) * 0.5;
      const monY = isHorizontal ? innerY + (innerH - monH) * 0.5 : innerY + longSide * bayFrac - monH * 0.5;
      const monZ = 14;
      const bOff = getShadowOffset(monZ, sunState);
      sCtx.save();
      clipOutsideRect(sCtx, monX, monY, monW, monH, bOff.dx, bOff.dy);
      extrudeRectShadow(sCtx, monX, monY, monW, monH, 0, monZ, sunState);
      sCtx.restore();
    }

    if (bld.type === 'industrial') {
      const stackX = innerX + innerW * ((h & 1) ? 0.82 : 0.18);
      const stackY = innerY + innerH * ((h & 2) ? 0.78 : 0.22);
      const stackR = 7.5;
      const stackZ = 56;
      const stOff = getShadowOffset(stackZ, sunState);
      sCtx.save();
      clipOutsideCircle(sCtx, stackX, stackY, stackR * 0.85, stOff.dx, stOff.dy);
      extrudeCylinderShadow(sCtx, stackX, stackY, stackR, 0, stackZ, sunState);
      sCtx.restore();
    }
  } else {
    // Commercial, Office, Mall, Shop, Hospital, Police/Fire Station: Central Mechanical Penthouse + HVAC Bank
    const mechW = Math.min(44, innerW * 0.36);
    const mechH = Math.min(36, innerH * 0.36);
    const mechX = innerX + (innerW - mechW) * 0.5;
    const mechY = innerY + (innerH - mechH) * 0.5;
    const mechZ = bld.type === 'commercial' || bld.type === 'office' || bld.type === 'business_center' ? 24 : 15;
    const mOff = getShadowOffset(mechZ, sunState);

    sCtx.save();
    clipOutsideRect(sCtx, mechX, mechY, mechW, mechH, mOff.dx, mOff.dy);
    extrudeRectShadow(sCtx, mechX, mechY, mechW, mechH, 0, mechZ, sunState);
    sCtx.restore();

    const hvacCount = mechZ > 20 ? 3 : 2;
    for (let i = 0; i < hvacCount; i++) {
      const hx = innerX + 8 + ((i * 29 + (h & 15)) % Math.max(10, Math.floor(innerW - 22)));
      const hy = innerY + 8 + (((i * 43 + (h >> 4)) & 31) % Math.max(10, Math.floor(innerH - 22)));
      if (hx + 12 > mechX - 3 && hx < mechX + mechW + 3 && hy + 10 > mechY - 3 && hy < mechY + mechH + 3) continue;
      const hOff = getShadowOffset(11, sunState);
      sCtx.save();
      clipOutsideRect(sCtx, hx, hy, 11, 9, hOff.dx, hOff.dy);
      extrudeRectShadow(sCtx, hx, hy, 11, 9, 0, 11, sunState);
      sCtx.restore();
    }
  }
}

/**
 * Renders 3D shadows for the Gas Station complex (pumps, islands, columns, price totem, floodlights, canopy).
 */
function renderGasStationShadows(
  sCtx: CanvasRenderingContext2D,
  world: GameWorld,
  sunState: SunShadowState,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  tier: 'low' | 'high'
) {
  if (maxX < 4750 || minX > 5580 || maxY < 4750 || minY > 5580) return;

  if (tier === 'low') {
    // 1. Concrete Pump Islands (z = 0 .. 3.5)
    const islandXs = [5110, 5200];
    for (const ix of islandXs) {
      const off = getShadowOffset(3.5, sunState);
      sCtx.save();
      clipOutsideRect(sCtx, ix - 9, 5025, 18, 170, off.dx, off.dy);
      extrudeRectShadow(sCtx, ix - 9, 5025, 18, 170, 0, 3.5, sunState);
      sCtx.restore();
    }

    // 2. Fuel Dispensers / Gas Pumps (z = 1 .. 22px)
    const pumps = world.gasPumps || [];
    for (const pump of pumps) {
      if (pump.x < minX - 100 || pump.x > maxX + 100 || pump.y < minY - 100 || pump.y > maxY + 100) continue;
      const off = getShadowOffset(22, sunState);
      sCtx.save();
      clipOutsideRotatedRect(sCtx, pump.x, pump.y, 10, 18, pump.angle || 0, off.dx, off.dy);
      extrudeRotatedRectShadow(sCtx, pump.x, pump.y, 10, 18, pump.angle || 0, 1, 22, sunState);
      sCtx.restore();
    }
  } else {
    // Tier 2 (Tall structures that cast shadows over vehicles and islands):
    // 3. Canopy Support Columns (z = 0 .. 52px)
    const islandXs = [5110, 5200];
    const colYs = [5045, 5175];
    for (const ix of islandXs) {
      for (const cy of colYs) {
        extrudeCylinderShadow(sCtx, ix, cy, 3.8, 0, 52, sunState);
      }
    }

    // 4. Illuminated Price Totem Pylon at (5055, 5000) (width 18, depth 8, height 54px)
    {
      const tx = 5055 - 9;
      const ty = 5000 - 4;
      const off = getShadowOffset(54, sunState);
      sCtx.save();
      clipOutsideRect(sCtx, tx, ty, 18, 8, off.dx, off.dy);
      extrudeRectShadow(sCtx, tx, ty, 18, 8, 0, 54, sunState);
      sCtx.restore();
    }

    // 5. Perimeter Floodlight Poles (height 58px)
    const poles = [
      { x: 5052, y: 4930 },
      { x: 5255, y: 4930 },
      { x: 5255, y: 5240 },
      { x: 5052, y: 5240 },
    ];
    for (const p of poles) {
      extrudeCylinderShadow(sCtx, p.x, p.y, 2.2, 0, 58, sunState);
    }

    // 6. Elevated Forecourt Canopy Roof (x: 5075..5235, y: 5010..5210, z = 48 .. 56px)
    // Because zBottom = 48px, the shadow detaches from the canopy columns and projects onto the forecourt and cars!
    const cOffTop = getShadowOffset(56, sunState);
    sCtx.save();
    clipOutsideRect(sCtx, 5075, 5010, 160, 200, cOffTop.dx, cOffTop.dy);
    extrudeRectShadow(sCtx, 5075, 5010, 160, 200, 48, 56, sunState);
    sCtx.restore();
  }
}

/**
 * Renders 3D shadows for Railway infrastructure: platforms, canopies, catenary masts, signals, and rolling stock trains.
 */
function renderRailwayShadows(
  sCtx: CanvasRenderingContext2D,
  world: GameWorld,
  sunState: SunShadowState,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  tier: 'low' | 'high'
) {
  if (tier === 'low') {
    // 1. Concrete Passenger Platforms (z = 0 .. 11px)
    if (world.railwayPlatforms) {
      for (const plat of world.railwayPlatforms) {
        if (
          plat.x + plat.width < minX - 120 ||
          plat.x > maxX + 120 ||
          plat.y + plat.height < minY - 120 ||
          plat.y > maxY + 120
        ) {
          continue;
        }
        const pOff = getShadowOffset(11, sunState);
        sCtx.save();
        clipOutsideRect(sCtx, plat.x, plat.y, plat.width, plat.height, pOff.dx, pOff.dy);
        extrudeRectShadow(sCtx, plat.x, plat.y, plat.width, plat.height, 0, 11, sunState);
        sCtx.restore();
      }
    }

    // 2. Rolling Stock (Trains: Locomotives & Wagons in world.rollingStock)
    if (world.rollingStock) {
      for (const car of world.rollingStock) {
        if (car.x < minX - 180 || car.x > maxX + 180 || car.y < minY - 180 || car.y > maxY + 180) continue;
        const length = car.length || 84;
        const width = car.width || 24;
        const off = getShadowOffset(36, sunState);

        // Main carbody shadow (clipped outside the sunlit carbody top)
        sCtx.save();
        clipOutsideRotatedRect(sCtx, car.x, car.y, length - 2, width - 2, car.angle, off.dx, off.dy);
        extrudeRotatedRectShadow(sCtx, car.x, car.y, length, width, car.angle, 4, 36, sunState);
        sCtx.restore();

        // Rooftop pantograph / air reservoir equipment shadow cast across the train roof
        const eqOff = getShadowOffset(8, sunState);
        const cos = Math.cos(car.angle);
        const sin = Math.sin(car.angle);
        for (const xFrac of [-0.28, 0.28]) {
          const ex = car.x + cos * (length * xFrac);
          const ey = car.y + sin * (length * xFrac);
          sCtx.save();
          clipOutsideRotatedRect(sCtx, ex, ey, 12, 10, car.angle, eqOff.dx, eqOff.dy);
          extrudeRotatedRectShadow(sCtx, ex, ey, 12, 10, car.angle, 0, 8, sunState);
          sCtx.restore();
        }
      }
    }
    return;
  }

  // Tier 2 (Tall Railway Structures):
  // 3. Platform Canopies & Columns
  if (world.railwayPlatforms) {
    for (const plat of world.railwayPlatforms) {
      if (!plat.hasCanopy) continue;
      if (
        plat.x + plat.width < minX - 150 ||
        plat.x > maxX + 150 ||
        plat.y + plat.height < minY - 150 ||
        plat.y > maxY + 150
      ) {
        continue;
      }
      const isHoriz = plat.width >= plat.height;
      const canopyW = isHoriz ? plat.width * 0.62 : plat.width - 4;
      const canopyH = isHoriz ? plat.height - 4 : plat.height * 0.62;
      const canopyX = plat.x + (plat.width - canopyW) * 0.5;
      const canopyY = plat.y + (plat.height - canopyH) * 0.5;

      const numCols = 5;
      for (let i = 0; i < numCols; i++) {
        const frac = (i + 0.5) / numCols;
        const cx = isHoriz ? canopyX + canopyW * frac : canopyX + canopyW * 0.5;
        const cy = isHoriz ? canopyY + canopyH * 0.5 : canopyY + canopyH * frac;
        extrudeCylinderShadow(sCtx, cx, cy, 2.2, 11, 34, sunState);
      }

      const cOff = getShadowOffset(36, sunState);
      sCtx.save();
      clipOutsideRect(sCtx, canopyX, canopyY, canopyW, canopyH, cOff.dx, cOff.dy);
      extrudeRectShadow(sCtx, canopyX, canopyY, canopyW, canopyH, 28, 36, sunState);
      sCtx.restore();
    }
  }

  // 4. Railway Signals & Level Crossing Barriers (world.railwaySignals)
  if (world.railwaySignals) {
    for (const sig of world.railwaySignals) {
      if (sig.x < minX - 100 || sig.x > maxX + 100 || sig.y < minY - 100 || sig.y > maxY + 100) continue;
      const isDwarf = sig.mastType === 'dwarf';
      const sigH = isDwarf ? 9 : 38;
      extrudeCylinderShadow(sCtx, sig.x, sig.y, isDwarf ? 2.2 : 1.8, 0, sigH, sunState);
      if (!isDwarf) {
        extrudeCylinderShadow(sCtx, sig.x, sig.y, 4.0, sigH - 9, sigH, sunState);
      }
      if (sig.isCrossingGate && sig.barrierLength) {
        const closeProg = sig.barrierProgress ?? 0;
        const armZTop = 10 + (1 - closeProg) * 24;
        const armReach = Math.max(8, sig.barrierLength * (0.25 + 0.75 * closeProg));
        extrudeRotatedRectShadow(
          sCtx,
          sig.x + Math.cos(sig.angle) * (armReach * 0.5),
          sig.y + Math.sin(sig.angle) * (armReach * 0.5),
          armReach,
          2.2,
          sig.angle,
          9,
          armZTop,
          sunState
        );
      }
    }
  }
}

/**
 * Renders 3D shadows for street signs at road intersections and the Grand Park Fountain.
 */
function renderIntersectionSignsAndFountainsShadows(
  sCtx: CanvasRenderingContext2D,
  world: GameWorld,
  visibleBuildings: Building[],
  sunState: SunShadowState,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
) {
  // 1. Intersection Street Name Signs (pole height 28px + elevated sign board)
  if (world.intersections) {
    for (const inter of world.intersections) {
      if (inter.x < minX - 200 || inter.x > maxX + 200 || inter.y < minY - 200 || inter.y > maxY + 200) continue;
      const signX = inter.x + inter.width * 0.5 + 16;
      const signY = inter.y - inter.height * 0.5 - 16;
      extrudeCylinderShadow(sCtx, signX, signY, 1.8, 0, 28, sunState);
      extrudeRectShadow(sCtx, signX - 14, signY - 2, 28, 4, 22, 28, sunState);
    }
  }

  // 2. Park Monument / Fountain Multi-Tier Basin & Spire Shadows
  for (const bld of visibleBuildings) {
    if (bld.type !== 'park_monument') continue;
    const cx = bld.x + bld.width * 0.5;
    const cy = bld.y + bld.height * 0.5;
    const outerR = bld.width * 0.5;

    // Outer granite basin rim (z = 0 .. 9px)
    const off1 = getShadowOffset(9, sunState);
    sCtx.save();
    clipOutsideCircle(sCtx, cx, cy, outerR, off1.dx, off1.dy);
    extrudeCylinderShadow(sCtx, cx, cy, outerR + 1.5, 0, 9, sunState);
    sCtx.restore();

    // Middle carved chalice bowl (z = 6 .. 20px) casting shadow onto the lower water pool
    const midR = 17;
    const off2 = getShadowOffset(20, sunState);
    sCtx.save();
    clipOutsideCircle(sCtx, cx, cy, midR, off2.dx, off2.dy);
    extrudeCylinderShadow(sCtx, cx, cy, midR, 6, 20, sunState);
    sCtx.restore();

    // Central bronze spire / water column (z = 16 .. 34px)
    const topR = 6;
    const off3 = getShadowOffset(34, sunState);
    sCtx.save();
    clipOutsideCircle(sCtx, cx, cy, topR, off3.dx, off3.dy);
    extrudeCylinderShadow(sCtx, cx, cy, topR, 16, 34, sunState);
    sCtx.restore();
  }
}

/**
 * Renders 3D shadows for all street props (poles, lamps, traffic lights, benches, bus stops, kiosks, fences, etc.).
 */
function renderStreetPropShadows(
  sCtx: CanvasRenderingContext2D,
  props: StreetProp[],
  sunState: SunShadowState,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  tier: 'low' | 'high'
) {
  for (const prop of props) {
    if (prop.x < minX - 150 || prop.x > maxX + 150 || prop.y < minY - 150 || prop.y > maxY + 150) continue;

    const angle = prop.angle || 0;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Only toppled poles/signals or breached fences lie flat on the ground when broken;
    // solid structures (kiosks, bus stops, dumpsters, benches) keep their 3D silhouette shadow.
    const isToppledPoleOrFence =
      prop.isBroken &&
      (prop.type === 'lamp' ||
        prop.type === 'lamp_highway' ||
        prop.type === 'traffic_light' ||
        prop.type === 'bollard' ||
        prop.type === 'railway_signal' ||
        prop.type === 'fence_wood_vertical' ||
        prop.type === 'fence_metal_vertical' ||
        prop.type === 'cottage_gate' ||
        prop.type === 'wicket_gate');

    if (isToppledPoleOrFence) {
      if (tier !== 'low') continue;
      const fallAngle = prop.breakAngle ?? prop.tiltAngle ?? angle;
      extrudeRotatedRectShadow(
        sCtx,
        prop.x + Math.cos(fallAngle) * 10,
        prop.y + Math.sin(fallAngle) * 10,
        22,
        3.2,
        fallAngle,
        0,
        3.0,
        sunState
      );
      continue;
    }

    const isTallProp =
      prop.type === 'lamp' ||
      prop.type === 'lamp_concrete' ||
      prop.type === 'lamp_highway' ||
      prop.type === 'power_pole' ||
      prop.type === 'traffic_light' ||
      prop.type === 'kiosk' ||
      prop.type === 'bus_stop' ||
      prop.type === 'shipping_container' ||
      prop.type === 'industrial_tank' ||
      prop.type === 'silo_tank' ||
      prop.type === 'industrial_floodlight' ||
      prop.type === 'railway_catenary_mast' ||
      prop.type === 'railway_signal';

    if (tier === 'low' && isTallProp) continue;
    if (tier === 'high' && !isTallProp) continue;

    switch (prop.type) {
      case 'lamp': {
        // Tall street lamp pole (z = 0..76px) + luminaire bracket arm at top
        extrudeCylinderShadow(sCtx, prop.x, prop.y, 1.8, 0, 76, sunState);
        const armEndX = prop.x + cos * 11;
        const armEndY = prop.y + sin * 11;
        const topOff = getShadowOffset(76, sunState);
        sCtx.beginPath();
        sCtx.moveTo(prop.x + topOff.dx, prop.y + topOff.dy);
        sCtx.lineTo(armEndX + topOff.dx, armEndY + topOff.dy);
        sCtx.lineWidth = 2.6;
        sCtx.stroke();
        extrudeCylinderShadow(sCtx, armEndX, armEndY, 3.2, 73, 76, sunState);
        break;
      }
      case 'lamp_concrete': {
        // Post-Soviet octagonal concrete pole (z = 0..82px) + angled bracket
        extrudeCylinderShadow(sCtx, prop.x, prop.y, 2.1, 0, 82, sunState);
        const armEndX = prop.x + cos * 10;
        const armEndY = prop.y + sin * 10;
        const topOff = getShadowOffset(82, sunState);
        sCtx.beginPath();
        sCtx.moveTo(prop.x + topOff.dx, prop.y + topOff.dy);
        sCtx.lineTo(armEndX + topOff.dx, armEndY + topOff.dy);
        sCtx.lineWidth = 2.8;
        sCtx.stroke();
        extrudeCylinderShadow(sCtx, armEndX, armEndY, 3.0, 79, 82, sunState);
        break;
      }
      case 'lamp_highway':
      case 'industrial_floodlight': {
        // Heavy highway cobra-head mast / floodlight tower (z = 0..105px) + long truss arm
        extrudeCylinderShadow(sCtx, prop.x, prop.y, 2.4, 0, 105, sunState);
        const armEndX = prop.x + cos * 22;
        const armEndY = prop.y + sin * 22;
        const topOff = getShadowOffset(105, sunState);
        sCtx.beginPath();
        sCtx.moveTo(prop.x + topOff.dx, prop.y + topOff.dy);
        sCtx.lineTo(armEndX + topOff.dx, armEndY + topOff.dy);
        sCtx.lineWidth = 3.0;
        sCtx.stroke();
        extrudeCylinderShadow(sCtx, armEndX, armEndY, 3.8, 101, 105, sunState);
        break;
      }
      case 'power_pole':
      case 'railway_catenary_mast': {
        // Wooden/concrete utility pole or catenary mast (z = 0..88px) + crossarm
        extrudeCylinderShadow(sCtx, prop.x, prop.y, 2.2, 0, 88, sunState);
        extrudeRotatedRectShadow(sCtx, prop.x, prop.y, 2.5, 16, angle, 78, 84, sunState);
        break;
      }
      case 'traffic_light':
      case 'railway_signal':
      case 'railway_crossing_light': {
        // Signal pole (z = 0..54px) + signal head housing
        extrudeCylinderShadow(sCtx, prop.x, prop.y, 1.9, 0, 54, sunState);
        extrudeRotatedRectShadow(sCtx, prop.x, prop.y, 6.5, 6.5, angle, 40, 54, sunState);
        break;
      }
      case 'village_sign':
      case 'industrial_sign':
      case 'railway_platform_sign':
      case 'railway_clock': {
        // Sign post (z = 0..28px) + sign plate at top (z = 20..28px)
        extrudeCylinderShadow(sCtx, prop.x, prop.y, 1.5, 0, 28, sunState);
        extrudeRotatedRectShadow(sCtx, prop.x, prop.y, 4.0, 14, angle, 20, 28, sunState);
        break;
      }
      case 'bus_stop': {
        // Bus shelter back/side glass walls (z = 0..30px) + cantilevered roof (z = 24..32px)
        const off = getShadowOffset(32, sunState);
        sCtx.save();
        clipOutsideRotatedRect(sCtx, prop.x, prop.y, 36, 14, angle, off.dx, off.dy);
        extrudeRotatedRectShadow(sCtx, prop.x, prop.y, 36, 14, angle, 24, 32, sunState);
        extrudeRotatedRectShadow(
          sCtx,
          prop.x - sin * 5.5,
          prop.y + cos * 5.5,
          35,
          2.2,
          angle,
          0,
          30,
          sunState
        );
        sCtx.restore();
        break;
      }
      case 'kiosk': {
        const off = getShadowOffset(32, sunState);
        sCtx.save();
        clipOutsideRotatedRect(sCtx, prop.x, prop.y, 24, 18, angle, off.dx, off.dy);
        extrudeRotatedRectShadow(sCtx, prop.x, prop.y, 24, 18, angle, 0, 32, sunState);
        sCtx.restore();
        break;
      }
      case 'shipping_container': {
        const off = getShadowOffset(30, sunState);
        sCtx.save();
        clipOutsideRotatedRect(sCtx, prop.x, prop.y, 48, 20, angle, off.dx, off.dy);
        extrudeRotatedRectShadow(sCtx, prop.x, prop.y, 48, 20, angle, 0, 30, sunState);
        sCtx.restore();
        break;
      }
      case 'industrial_tank':
      case 'silo_tank': {
        const r = prop.type === 'silo_tank' ? 14 : 18;
        const z = prop.type === 'silo_tank' ? 64 : 42;
        const off = getShadowOffset(z, sunState);
        sCtx.save();
        clipOutsideCircle(sCtx, prop.x, prop.y, r * 0.9, off.dx, off.dy);
        extrudeCylinderShadow(sCtx, prop.x, prop.y, r, 0, z, sunState);
        sCtx.restore();
        break;
      }
      case 'concrete_fence_po2':
      case 'fence_wood_vertical':
      case 'fence_metal_vertical':
      case 'industrial_gate':
      case 'cottage_gate':
      case 'wicket_gate': {
        const off = getShadowOffset(22, sunState);
        sCtx.save();
        clipOutsideRotatedRect(sCtx, prop.x, prop.y, 28, 3.8, angle, off.dx, off.dy);
        extrudeRotatedRectShadow(sCtx, prop.x, prop.y, 28, 3.8, angle, 0, 22, sunState);
        sCtx.restore();
        break;
      }
      case 'concrete_barrier':
      case 'security_barrier':
      case 'railway_crossing_gate':
      case 'railway_buffer_stop': {
        const off = getShadowOffset(11, sunState);
        sCtx.save();
        clipOutsideRotatedRect(sCtx, prop.x, prop.y, 20, 5, angle, off.dx, off.dy);
        extrudeRotatedRectShadow(sCtx, prop.x, prop.y, 20, 5, angle, 0, 11, sunState);
        sCtx.restore();
        break;
      }
      case 'bench':
      case 'garage_sofa':
      case 'garage_workbench': {
        const off = getShadowOffset(9.5, sunState);
        sCtx.save();
        clipOutsideRotatedRect(sCtx, prop.x, prop.y, 16, 6.5, angle, off.dx, off.dy);
        extrudeRotatedRectShadow(sCtx, prop.x, prop.y, 16, 6.5, angle, 1.5, 9.5, sunState);
        sCtx.restore();
        break;
      }
      case 'dumpster':
      case 'village_well':
      case 'pallet_stack':
      case 'woodpile': {
        const off = getShadowOffset(15, sunState);
        sCtx.save();
        clipOutsideRotatedRect(sCtx, prop.x, prop.y, 14, 10, angle, off.dx, off.dy);
        extrudeRotatedRectShadow(sCtx, prop.x, prop.y, 14, 10, angle, 0, 15, sunState);
        sCtx.restore();
        break;
      }
      case 'rustic_car_wreck':
      case 'tarp_covered_car':
      case 'car_on_blocks': {
        const off = getShadowOffset(15, sunState);
        sCtx.save();
        clipOutsideRotatedRect(sCtx, prop.x, prop.y, 38, 18, angle, off.dx, off.dy);
        extrudeRotatedRectShadow(sCtx, prop.x, prop.y, 38, 18, angle, 1, 15, sunState);
        sCtx.restore();
        break;
      }
      case 'haystack':
      case 'cable_spool':
      case 'oil_barrel_cluster': {
        const off = getShadowOffset(16, sunState);
        sCtx.save();
        clipOutsideCircle(sCtx, prop.x, prop.y, 7.5, off.dx, off.dy);
        extrudeCylinderShadow(sCtx, prop.x, prop.y, 8.0, 0, 16, sunState);
        sCtx.restore();
        break;
      }
      case 'trash_can':
      case 'mailbox':
      case 'railway_switch_box': {
        const off = getShadowOffset(11, sunState);
        sCtx.save();
        clipOutsideCircle(sCtx, prop.x, prop.y, 3.2, off.dx, off.dy);
        extrudeCylinderShadow(sCtx, prop.x, prop.y, 3.5, 0, 11, sunState);
        sCtx.restore();
        break;
      }
      case 'hydrant': {
        const off = getShadowOffset(10, sunState);
        sCtx.save();
        clipOutsideCircle(sCtx, prop.x, prop.y, 2.6, off.dx, off.dy);
        extrudeCylinderShadow(sCtx, prop.x, prop.y, 2.8, 0, 10, sunState);
        sCtx.restore();
        break;
      }
      case 'bollard':
      case 'cone':
      case 'railway_picket_post': {
        const off = getShadowOffset(8.5, sunState);
        sCtx.save();
        clipOutsideCircle(sCtx, prop.x, prop.y, 1.8, off.dx, off.dy);
        extrudeCylinderShadow(sCtx, prop.x, prop.y, 2.0, 0, 8.5, sunState);
        sCtx.restore();
        break;
      }
      case 'flowerbed':
      case 'tire_flowerbed':
      case 'sandbox': {
        const off = getShadowOffset(5.5, sunState);
        sCtx.save();
        clipOutsideRotatedRect(sCtx, prop.x, prop.y, 14, 14, angle, off.dx, off.dy);
        extrudeRotatedRectShadow(sCtx, prop.x, prop.y, 14, 14, angle, 0, 5.5, sunState);
        sCtx.restore();
        break;
      }
      case 'carpet_rack': {
        const off = getShadowOffset(10, sunState);
        sCtx.save();
        clipOutsideRotatedRect(sCtx, prop.x, prop.y, 20, 4, angle, off.dx, off.dy);
        extrudeRotatedRectShadow(sCtx, prop.x, prop.y, 20, 4, angle, 0, 10, sunState);
        sCtx.restore();
        break;
      }
      case 'yard_rotunda': {
        const off = getShadowOffset(16, sunState);
        sCtx.save();
        clipOutsideCircle(sCtx, prop.x, prop.y, 14.5, off.dx, off.dy);
        extrudeCylinderShadow(sCtx, prop.x, prop.y, 15, 0, 16, sunState);
        sCtx.restore();
        break;
      }
      case 'fallen_log': {
        const off = getShadowOffset(6.5, sunState);
        sCtx.save();
        clipOutsideRotatedRect(sCtx, prop.x, prop.y, 32, 7.5, angle, off.dx, off.dy);
        extrudeRotatedRectShadow(sCtx, prop.x, prop.y, 32, 7.5, angle, 0, 6.5, sunState);
        sCtx.restore();
        break;
      }
      case 'tree_stump':
      case 'anthill': {
        const off = getShadowOffset(7.5, sunState);
        sCtx.save();
        clipOutsideCircle(sCtx, prop.x, prop.y, 5.8, off.dx, off.dy);
        extrudeCylinderShadow(sCtx, prop.x, prop.y, 6.0, 0, 7.5, sunState);
        sCtx.restore();
        break;
      }
      case 'moss_boulder': {
        const off = getShadowOffset(9.5, sunState);
        sCtx.save();
        clipOutsideCircle(sCtx, prop.x, prop.y, 8.0, off.dx, off.dy);
        extrudeCylinderShadow(sCtx, prop.x, prop.y, 8.2, 0, 9.5, sunState);
        sCtx.restore();
        break;
      }
      case 'manhole':
      case 'drain_grate':
      case 'garden_path_tile':
        // Flush with the ground — no vertical shadow
        break;
      default: {
        const off = getShadowOffset(9, sunState);
        sCtx.save();
        clipOutsideCircle(sCtx, prop.x, prop.y, 3.2, off.dx, off.dy);
        extrudeCylinderShadow(sCtx, prop.x, prop.y, 3.5, 0, 9, sunState);
        sCtx.restore();
        break;
      }
    }
  }
}

/**
 * Renders 3D shadows for all road guardrails (support posts + elevated W-beam corrugated rail).
 */
function renderGuardrailShadows(
  sCtx: CanvasRenderingContext2D,
  world: GameWorld,
  sunState: SunShadowState,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
) {
  if (!world.guardrails) return;
  const postOff = getShadowOffset(9.5, sunState);
  const railBottomOff = getShadowOffset(4.0, sunState);
  const railTopOff = getShadowOffset(9.5, sunState);

  for (const gr of world.guardrails) {
    if (
      Math.max(gr.x1, gr.x2) < minX - 40 ||
      Math.min(gr.x1, gr.x2) > maxX + 40 ||
      Math.max(gr.y1, gr.y2) < minY - 40 ||
      Math.min(gr.y1, gr.y2) > maxY + 40
    ) {
      continue;
    }

    const dx = gr.x2 - gr.x1;
    const dy = gr.y2 - gr.y1;
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;

    // 1. Vertical support posts along the barrier
    const postSpacing = 24;
    const steps = Math.max(1, Math.floor(len / postSpacing));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = gr.x1 + dx * t;
      const py = gr.y1 + dy * t;
      sCtx.beginPath();
      sCtx.moveTo(px, py);
      sCtx.lineTo(px + postOff.dx, py + postOff.dy);
      sCtx.lineWidth = 2.4;
      sCtx.stroke();
    }

    // 2. Elevated W-Beam rail ribbon (z = 4.0 .. 9.5px)
    const poly: Point[] = [
      { x: gr.x1, y: gr.y1 },
      { x: gr.x2, y: gr.y2 },
      { x: gr.x2 - (dy / len) * 2.2, y: gr.y2 + (dx / len) * 2.2 },
      { x: gr.x1 - (dy / len) * 2.2, y: gr.y1 + (dx / len) * 2.2 },
    ];
    extrudePolygonShadow(sCtx, poly, railBottomOff.dx, railBottomOff.dy, railTopOff.dx, railTopOff.dy);
  }
}

/**
 * Renders 3D shadows for a single vehicle (including softbody deformation, wheels,
 * side mirrors, trailer drawbar, and raised cabin/greenhouse extrusion).
 */
function renderVehicleShadow(
  sCtx: CanvasRenderingContext2D,
  car: Vehicle,
  sunState: SunShadowState
) {
  const cos = Math.cos(car.angle);
  const sin = Math.sin(car.angle);
  const halfL = car.length * 0.5;
  const halfW = car.width * 0.5;

  // Determine proportional 3D chassis & cabin heights in world pixels
  let chassisH = 10.5;
  let cabinH = 17.5;
  let cabinFrontX = -halfL * 0.18;
  let cabinRearX = halfL * 0.32;
  let cabinWidthRatio = 0.84;
  let hasCabin = true;

  const vType = car.type as string;

  if (vType.startsWith('moto_')) {
    chassisH = 8.0;
    cabinH = 14.0;
    hasCabin = false;
  } else if (
    vType === 'bus' ||
    vType === 'truck_semi' ||
    vType === 'truck_box' ||
    vType === 'truck_dump' ||
    vType === 'truck_water' ||
    vType === 'truck_fuel' ||
    vType === 'fire_engine' ||
    vType === 'fire_ladder' ||
    vType === 'garbage_truck' ||
    vType === 'cement_mixer'
  ) {
    chassisH = 18.0;
    cabinH = 34.0;
    cabinFrontX = -halfL * 0.88;
    cabinRearX = halfL * 0.88;
    cabinWidthRatio = 0.94;
  } else if (
    vType === 'van' ||
    vType === 'ambulance' ||
    vType === 'bus_minibus' ||
    vType === 'delivery_truck' ||
    vType.startsWith('tractor_') ||
    vType.startsWith('roller_')
  ) {
    chassisH = 14.0;
    cabinH = 26.0;
    cabinFrontX = -halfL * 0.45;
    cabinRearX = halfL * 0.42;
    cabinWidthRatio = 0.90;
  } else if (vType.includes('suv') || vType.includes('pickup')) {
    chassisH = 12.5;
    cabinH = 21.0;
    cabinFrontX = vType.includes('pickup') ? -halfL * 0.05 : -halfL * 0.42;
    cabinRearX = halfL * 0.35;
    cabinWidthRatio = 0.86;
  } else if (vType === 'trailer_flatbed_2axle') {
    chassisH = 8.5;
    cabinH = 12.0;
    hasCabin = false;
  } else if (vType.startsWith('trailer_')) {
    chassisH = 15.0;
    cabinH = 22.0;
    hasCabin = false;
  }

  const alt = Math.max(0, (((car as any).altitude as number) || 0) * 1.35);
  const zGroundClearance = 2.0 + alt;
  const zChassisTop = chassisH + alt;
  const zCabinTop = cabinH + alt;

  // Compute deformed vehicle hull in local coordinates and transform to world coordinates
  const dmg = (car.damage || {}) as any;
  const fc = Math.min(halfL * 0.68, dmg.frontCrumple || 0);
  const rc = Math.min(halfL * 0.55, dmg.rearCrumple || 0);
  const ld = Math.min(halfW * 0.65, dmg.leftDent || 0);
  const rd = Math.min(halfW * 0.65, dmg.rightDent || 0);
  const fld = Math.min(halfL * 0.50, dmg.frontLeftDent || 0);
  const frd = Math.min(halfL * 0.50, dmg.frontRightDent || 0);
  const rld = Math.min(halfL * 0.45, dmg.rearLeftDent || 0);
  const rrd = Math.min(halfL * 0.45, dmg.rearRightDent || 0);

  const hasSoftbody = !!(dmg.deformedVertices && dmg.deformedVertices.length >= 16);
  const basePolyLocal = getVehicleBasePolygon(
    car,
    halfL,
    halfW,
    hasSoftbody ? 0 : fc,
    hasSoftbody ? 0 : rc,
    hasSoftbody ? 0 : ld,
    hasSoftbody ? 0 : rd,
    hasSoftbody ? 0 : fld,
    hasSoftbody ? 0 : frd,
    hasSoftbody ? 0 : rld,
    hasSoftbody ? 0 : rrd
  );

  let deformedLocal = basePolyLocal;
  if (hasSoftbody) {
    const polyDvs = mapPolyToDeformVerts(
      basePolyLocal,
      dmg.deformedVertices,
      dmg.nodeBeam?.perimeterCount ?? 0
    );
    deformedLocal = basePolyLocal.map((bv, idx) => {
      const dv = polyDvs[idx] as any;
      if (!dv) return bv;
      const ox = isFinite(dv.offsetX) ? dv.offsetX : 0;
      const oy = isFinite(dv.offsetY) ? dv.offsetY : 0;
      const ex = isFinite(dv.elasticX) ? Math.max(-10.0, Math.min(10.0, dv.elasticX)) : 0;
      const ey = isFinite(dv.elasticY) ? Math.max(-10.0, Math.min(10.0, dv.elasticY)) : 0;
      return { x: bv.x + ox + ex, y: bv.y + oy + ey };
    });
  }

  const worldPoly: Point[] = new Array(deformedLocal.length);
  const maskPoly: Point[] = new Array(deformedLocal.length);

  let minPX = Infinity;
  let minPY = Infinity;
  let maxPX = -Infinity;
  let maxPY = -Infinity;

  for (let i = 0; i < deformedLocal.length; i++) {
    const lp = deformedLocal[i];
    const wx = car.x + (lp.x * cos - lp.y * sin);
    const wy = car.y + (lp.x * sin + lp.y * cos);
    worldPoly[i] = { x: wx, y: wy };

    const mx = car.x + (lp.x * 0.93 * cos - lp.y * 0.93 * sin);
    const my = car.y + (lp.x * 0.93 * sin + lp.y * 0.93 * cos);
    maskPoly[i] = { x: mx, y: my };

    if (wx < minPX) minPX = wx;
    if (wx > maxPX) maxPX = wx;
    if (wy < minPY) minPY = wy;
    if (wy > maxPY) maxPY = wy;
  }

  const baseOff = getShadowOffset(zGroundClearance, sunState);
  const chassisOff = getShadowOffset(zChassisTop, sunState);
  const cabinOff = getShadowOffset(zCabinTop, sunState);

  const pad = Math.hypot(cabinOff.dx, cabinOff.dy) + 45;
  const bounds = {
    minX: minPX - pad,
    minY: minPY - pad,
    maxX: maxPX + pad,
    maxY: maxPY + pad,
  };

  // 1. Lower Chassis, Wheels, Side Mirrors & Trailer Drawbar Shadow
  // Clipped to the exterior of `maskPoly` (only when grounded) so the vehicle's own sunlit top stays bright!
  sCtx.save();
  if (alt < 4.0) {
    clipOutsidePolygon(sCtx, maskPoly, bounds);
  }

  const detailShadows = performanceConfig.enableVehicleDetailShadows !== false;

  // 1a. 4 Wheel Shadows touching the road (z = alt .. alt + 7.5px)
  if (detailShadows && !vType.startsWith('moto_')) {
    const wOffX = halfL * 0.62;
    const wOffY = halfW * 0.94;
    const wheelPositions = [
      { lx: wOffX, ly: -wOffY },
      { lx: wOffX, ly: wOffY },
      { lx: -wOffX, ly: -wOffY },
      { lx: -wOffX, ly: wOffY },
    ];
    for (const wp of wheelPositions) {
      const wx = car.x + (wp.lx * cos - wp.ly * sin);
      const wy = car.y + (wp.lx * sin + wp.ly * cos);
      extrudeRotatedRectShadow(sCtx, wx, wy, 8.5, 4.2, car.angle, alt, alt + 7.5, sunState);
    }
  }

  // 1b. Extruded Lower Body / Chassis Volume
  extrudePolygonShadow(sCtx, worldPoly, baseOff.dx, baseOff.dy, chassisOff.dx, chassisOff.dy);

  // 1c. Side Mirrors (z = chassisH * 0.78 .. chassisH * 1.08)
  if (detailShadows && !vType.startsWith('trailer_') && !vType.startsWith('moto_')) {
    const mirX = halfL * 0.22;
    for (const side of [-1, 1]) {
      const mirY = side * (halfW + 1.8);
      const mx = car.x + (mirX * cos - mirY * sin);
      const my = car.y + (mirX * sin + mirY * cos);
      extrudeRotatedRectShadow(
        sCtx,
        mx,
        my,
        3.2,
        2.6,
        car.angle,
        zChassisTop * 0.78,
        zChassisTop * 1.08,
        sunState
      );
    }
  }

  // 1d. Trailer Drawbar / A-Frame Tongue Shadow
  if (detailShadows && (vType.startsWith('trailer_') || car.isTrailer)) {
    const tongueStart = halfL * 0.85;
    const tongueEnd = halfL + 14;
    const tPoly: Point[] = [
      {
        x: car.x + (tongueStart * cos - -3.5 * sin),
        y: car.y + (tongueStart * sin + -3.5 * cos),
      },
      {
        x: car.x + tongueEnd * cos,
        y: car.y + tongueEnd * sin,
      },
      {
        x: car.x + (tongueStart * cos - 3.5 * sin),
        y: car.y + (tongueStart * sin + 3.5 * cos),
      },
    ];
    const tBase = getShadowOffset(alt + 3.0, sunState);
    const tTop = getShadowOffset(alt + 6.5, sunState);
    extrudePolygonShadow(sCtx, tPoly, tBase.dx, tBase.dy, tTop.dx, tTop.dy);
  }

  // 2. Raised Cabin / Greenhouse / Superstructure Extrusion (z = chassisH .. cabinH)
  if (hasCabin && detailShadows) {
    const cabHalfW = halfW * cabinWidthRatio;
    const cabinPoly: Point[] = [
      {
        x: car.x + (cabinFrontX * cos - -cabHalfW * sin),
        y: car.y + (cabinFrontX * sin + -cabHalfW * cos),
      },
      {
        x: car.x + (cabinRearX * cos - -cabHalfW * sin),
        y: car.y + (cabinRearX * sin + -cabHalfW * cos),
      },
      {
        x: car.x + (cabinRearX * cos - cabHalfW * sin),
        y: car.y + (cabinRearX * sin + cabHalfW * cos),
      },
      {
        x: car.x + (cabinFrontX * cos - cabHalfW * sin),
        y: car.y + (cabinFrontX * sin + cabHalfW * cos),
      },
    ];
    extrudePolygonShadow(sCtx, cabinPoly, chassisOff.dx, chassisOff.dy, cabinOff.dx, cabinOff.dy);
  }

  // Motorcycle Rider 3D Shadow
  if (vType.startsWith('moto_') && (car.isPlayerControlled || Math.abs(car.speed) > 0.5 || !car.isParked)) {
    const riderOff = getShadowOffset(alt + 20.0, sunState);
    extrudeCylinderShadow(sCtx, car.x, car.y, 4.5, alt + 6.0, alt + 20.0, sunState);
    sCtx.beginPath();
    sCtx.arc(car.x + riderOff.dx, car.y + riderOff.dy, 3.6, 0, Math.PI * 2);
    sCtx.fill();
  }

  sCtx.restore();
}

/**
 * Renders an articulated 3D human shadow (feet -> legs -> torso/arms -> head + handheld props)
 * along the world-space solar shadow vector.
 */
function renderHumanShadow(
  sCtx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bodyAngle: number,
  walkCycle: number,
  isLyingDown: boolean,
  isSitting: boolean,
  scale: number,
  sunState: SunShadowState,
  handheldProp?: string | null,
  hasBroom?: boolean
) {
  const s = scale || 1.0;

  if (isLyingDown) {
    const off = getShadowOffset(4.5 * s, sunState);
    sCtx.save();
    clipOutsideRotatedRect(sCtx, x, y, 16 * s, 7 * s, bodyAngle, off.dx, off.dy);
    extrudeRotatedRectShadow(sCtx, x, y, 16 * s, 7 * s, bodyAngle, 0, 4.5 * s, sunState);
    sCtx.restore();
    return;
  }

  // Standing human is ~22px tall in 3D world scale; sitting on bench is ~15px tall
  const totalH = (isSitting ? 15.0 : 22.0) * s;
  const pelvisOff = getShadowOffset(totalH * 0.45, sunState);
  const shoulderOff = getShadowOffset(totalH * 0.80, sunState);
  const headOff = getShadowOffset(totalH, sunState);

  const cos = Math.cos(bodyAngle);
  const sin = Math.sin(bodyAngle);
  const stride = isSitting ? 0 : Math.sin(walkCycle) * 3.4 * s;
  const shoulderSpan = 4.4 * s;

  // Clip out only the sunlit top of the head/shoulders so the person doesn't darken their own head/hat
  sCtx.save();
  clipOutsideCircle(
    sCtx,
    x - sunState.shadowDirX * 0.8,
    y - sunState.shadowDirY * 0.8,
    3.4 * s,
    headOff.dx,
    headOff.dy
  );

  // 1. Left & Right Leg Shadows connecting the feet on the ground to the pelvis shadow
  const leftFootX = x + stride * cos - -2.2 * s * sin;
  const leftFootY = y + stride * sin + -2.2 * s * cos;
  const rightFootX = x - stride * cos - 2.2 * s * sin;
  const rightFootY = y - stride * sin + 2.2 * s * cos;

  const leftHipX = x - -2.0 * s * sin + pelvisOff.dx;
  const leftHipY = y + -2.0 * s * cos + pelvisOff.dy;
  const rightHipX = x - 2.0 * s * sin + pelvisOff.dx;
  const rightHipY = y + 2.0 * s * cos + pelvisOff.dy;

  sCtx.lineCap = 'round';
  sCtx.lineJoin = 'round';
  sCtx.lineWidth = 2.8 * s;
  sCtx.beginPath();
  sCtx.moveTo(leftFootX, leftFootY);
  sCtx.lineTo(leftHipX, leftHipY);
  sCtx.moveTo(rightFootX, rightFootY);
  sCtx.lineTo(rightHipX, rightHipY);
  sCtx.stroke();

  // 2. Extruded Torso & Shoulders Shadow (from pelvis z=0.45H to shoulders z=0.80H)
  const shLX = x - -shoulderSpan * sin + shoulderOff.dx;
  const shLY = y + -shoulderSpan * cos + shoulderOff.dy;
  const shRX = x - shoulderSpan * sin + shoulderOff.dx;
  const shRY = y + shoulderSpan * cos + shoulderOff.dy;

  sCtx.beginPath();
  sCtx.moveTo(leftHipX, leftHipY);
  sCtx.lineTo(rightHipX, rightHipY);
  sCtx.lineTo(shRX, shRY);
  sCtx.lineTo(shLX, shLY);
  sCtx.closePath();
  sCtx.fill();

  // Rounded shoulder caps
  sCtx.beginPath();
  sCtx.arc((shLX + shRX) * 0.5, (shLY + shRY) * 0.5, shoulderSpan * 0.92, 0, Math.PI * 2);
  sCtx.fill();

  // 3. Swinging Arms Shadow
  const armSwing = isSitting ? 1.5 : Math.cos(walkCycle) * 3.2 * s;
  const handLX = x + (-armSwing * cos - -(shoulderSpan + 1.0) * sin) + pelvisOff.dx * 1.15;
  const handLY = y + (-armSwing * sin + -(shoulderSpan + 1.0) * cos) + pelvisOff.dy * 1.15;
  const handRX = x + (armSwing * cos - (shoulderSpan + 1.0) * sin) + pelvisOff.dx * 1.15;
  const handRY = y + (armSwing * sin + (shoulderSpan + 1.0) * cos) + pelvisOff.dy * 1.15;

  sCtx.lineWidth = 2.2 * s;
  sCtx.beginPath();
  sCtx.moveTo(shLX, shLY);
  sCtx.lineTo(handLX, handLY);
  sCtx.moveTo(shRX, shRY);
  sCtx.lineTo(handRX, handRY);
  sCtx.stroke();

  // 4. Projected 3D Head Shadow at z = totalH
  sCtx.beginPath();
  sCtx.arc(x + headOff.dx, y + headOff.dy, 3.3 * s, 0, Math.PI * 2);
  sCtx.fill();

  // 5. Handheld Props (Box, Shopping Bag, Broom, Extinguisher, Coffee)
  if (hasBroom) {
    const broomStartX = x + cos * 4.5 + pelvisOff.dx * 1.1;
    const broomStartY = y + sin * 4.5 + pelvisOff.dy * 1.1;
    const broomEndX = x + cos * 16.5;
    const broomEndY = y + sin * 16.5;
    sCtx.lineWidth = 1.6;
    sCtx.beginPath();
    sCtx.moveTo(broomStartX, broomStartY);
    sCtx.lineTo(broomEndX, broomEndY);
    sCtx.stroke();
  } else if (handheldProp === 'box') {
    const bx = x + cos * 6.5;
    const by = y + sin * 6.5;
    extrudeRotatedRectShadow(sCtx, bx, by, 5.2, 7.2, bodyAngle, totalH * 0.45, totalH * 0.72, sunState);
  } else if (handheldProp === 'bag' || handheldProp === 'extinguisher') {
    const bx = x + cos * 2.0 - sin * 6.5;
    const by = y + sin * 2.0 + cos * 6.5;
    extrudeCylinderShadow(sCtx, bx, by, 2.8, totalH * 0.2, totalH * 0.52, sunState);
  }

  sCtx.restore();
}

export type TreeSpecies = 'dead' | 'pine' | 'birch' | 'oak' | 'maple';

export function classifyTreeSpecies(tree: Tree): TreeSpecies {
  const rawType = (tree as any).type;
  const col = (tree.color || '').toLowerCase();
  if (
    rawType === 'dead' ||
    col === '#57534e' ||
    col === '#78716c' ||
    col === '#44403c' ||
    col === '#3b3835' ||
    col === '#525252'
  ) {
    return 'dead';
  }
  if (
    rawType === 'pine' ||
    col === '#0f3e24' ||
    col === '#124c2c' ||
    col === '#165732' ||
    col === '#1b6138'
  ) {
    return 'pine';
  }
  if (
    rawType === 'birch' ||
    col === '#84cc16' ||
    col === '#a3e635' ||
    col === '#65a30d'
  ) {
    return 'birch';
  }
  const h = hashCoord(tree.x, tree.y);
  return (h & 1) === 0 ? 'oak' : 'maple';
}

/**
 * Traces and fills an organic scalloped/serrated foliage cluster polygon at (cx, cy)
 * so tree shadows have natural leafy edges rather than artificial geometric circles.
 */
/**
 * Appends an organic scalloped/serrated foliage cluster polygon at (cx, cy) to the active path
 * with clockwise winding so multiple foliage clusters can be filled in a single ctx.fill() call.
 */
function traceOrganicLeafClusterShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotAngle: number,
  seed: number,
  serrationAmp: number = 0.14,
  pointsCount: number = 14
) {
  const cosR = Math.cos(rotAngle);
  const sinR = Math.sin(rotAngle);
  for (let i = 0; i < pointsCount; i++) {
    const a = (i / pointsCount) * Math.PI * 2;
    const wave1 = Math.sin(a * 5 + (seed & 31) * 0.45);
    const wave2 = Math.cos(a * 3 - ((seed >> 4) & 31) * 0.35);
    const jag = (i & 1) === 0 ? 1 + serrationAmp * 0.55 : 1 - serrationAmp * 0.45;
    const mod = jag + (wave1 * 0.6 + wave2 * 0.4) * serrationAmp;
    const lx = Math.cos(a) * rx * mod;
    const ly = Math.sin(a) * ry * mod;
    const px = cx + lx * cosR - ly * sinR;
    const py = cy + lx * sinR + ly * cosR;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/**
 * Traces and fills an organic scalloped/serrated foliage cluster polygon at (cx, cy)
 * so tree shadows have natural leafy edges rather than artificial geometric circles.
 */
function fillOrganicLeafClusterShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotAngle: number,
  seed: number,
  serrationAmp: number = 0.14,
  pointsCount: number = 14
) {
  ctx.beginPath();
  traceOrganicLeafClusterShadow(ctx, cx, cy, rx, ry, rotAngle, seed, serrationAmp, pointsCount);
  ctx.fill();
}

/**
 * Builds an organic polygon representing the sunlit upper crown of a tree so that
 * clipping outside it preserves the bright sunlit leaves without leaving a circular
 * "Pac-Man" cutout or dark ring around the tree's perimeter.
 */
function buildSunlitCrownClipPolygon(
  tree: Tree,
  species: TreeSpecies,
  sunState: SunShadowState,
  h: number
): Point[] {
  const r = Math.max(8, tree.radius || 16);
  const shiftX = -sunState.shadowDirX * (r * 0.14);
  const shiftY = -sunState.shadowDirY * (r * 0.14);
  const cx = tree.x + shiftX;
  const cy = tree.y + shiftY;
  const poly: Point[] = [];

  if (species === 'pine') {
    const numTips = 12;
    const baseRot = ((h & 63) / 64) * Math.PI * 2;
    for (let i = 0; i < numTips * 2; i++) {
      const a = (i / (numTips * 2)) * Math.PI * 2 + baseRot;
      const isTip = (i & 1) === 0;
      const rad = r * (isTip ? 0.86 : 0.64) * (0.92 + Math.sin(a * 3 + h) * 0.08);
      poly.push({
        x: cx + Math.cos(a) * rad,
        y: cy + Math.sin(a) * rad,
      });
    }
    return poly;
  }

  const numPts = 18;
  const phase = (h & 31) * 0.2;
  for (let i = 0; i < numPts; i++) {
    const a = (i / numPts) * Math.PI * 2;
    const lobeWave =
      0.84 +
      0.12 * Math.sin(a * 5 + phase) +
      0.08 * Math.cos(a * 3 - phase * 0.7);
    const rad = r * lobeWave;
    poly.push({
      x: cx + Math.cos(a) * rad,
      y: cy + Math.sin(a) * rad,
    });
  }
  return poly;
}

/**
 * Renders 3D botanical tree shadows with batched path subpaths:
 * - Dead snags & bare winter deciduous/birch trees cast true 3D branching skeleton shadows.
 * - Pines cast serrated whorled coniferous cone shadows with radiating needle-bough tips.
 * - Broadleaf (oak, maple) & birch trees cast multi-lobed scalloped foliage shadows anchored by forked boughs.
 */
const treeShadowSpriteCache = new Map<
  string,
  { canvas: HTMLCanvasElement; half: number }
>();

function renderTreeShadow(
  sCtx: CanvasRenderingContext2D,
  tree: Tree,
  sunState: SunShadowState,
  season: string = 'summer'
) {
  const r = Math.max(8, tree.radius || 16);
  const species = classifyTreeSpecies(tree);
  const h = hashCoord(tree.x, tree.y);

  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const qRad = Math.round(r);
    const qHash = h & 31;
    const cxKey = Math.round(sunState.castX * 18);
    const cyKey = Math.round(sunState.castY * 18);
    const cacheKey = `${species}_${qRad}_${qHash}_${season}_${cxKey}_${cyKey}`;
    let cached = treeShadowSpriteCache.get(cacheKey);
    if (!cached) {
      if (treeShadowSpriteCache.size > 512) {
        treeShadowSpriteCache.clear();
      }
      const maxShadowReach = Math.ceil(qRad * 2.5 * Math.hypot(sunState.castX, sunState.castY) + qRad * 1.6 + 12);
      const half = Math.max(48, Math.min(220, maxShadowReach));
      const offCanvas = document.createElement('canvas');
      offCanvas.width = half * 2;
      offCanvas.height = half * 2;
      const offCtx = offCanvas.getContext('2d');
      if (offCtx) {
        offCtx.fillStyle = 'rgb(4, 8, 22)';
        offCtx.strokeStyle = 'rgb(4, 8, 22)';
        offCtx.lineCap = 'round';
        offCtx.lineJoin = 'round';
        const localTree: Tree = { ...tree, x: half, y: half, radius: qRad };
        renderTreeShadowGeometry(offCtx, localTree, qRad, species, qHash * 97 + 13, qHash * 199 + 17, sunState, season);
        cached = { canvas: offCanvas, half };
        treeShadowSpriteCache.set(cacheKey, cached);
      }
    }
    if (cached) {
      sCtx.drawImage(cached.canvas, tree.x - cached.half, tree.y - cached.half);
      return;
    }
  }

  const seed = Math.abs(Math.floor(tree.x * 12.9898 + tree.y * 78.233));
  renderTreeShadowGeometry(sCtx, tree, r, species, h, seed, sunState, season);
}

function renderTreeShadowGeometry(
  sCtx: CanvasRenderingContext2D,
  tree: Tree,
  r: number,
  species: TreeSpecies,
  h: number,
  seed: number,
  sunState: SunShadowState,
  season: string = 'summer'
) {

  const isBareSkeleton =
    species === 'dead' || (season === 'winter' && species !== 'pine');

  const perpX = -sunState.shadowDirY;
  const perpY = sunState.shadowDirX;

  // ==========================================================================
  // CASE 1: BARE SKELETON SHADOW (Dead Trees & Winter Deciduous / Birch Trees)
  // ==========================================================================
  if (isBareSkeleton) {
    const treeH = species === 'birch' ? r * 2.15 : r * 2.05;
    const trunkTopZ = treeH * 0.44;
    const trunkOff = getShadowOffset(trunkTopZ, sunState);
    const maxOff = getShadowOffset(treeH * 1.1, sunState);

    const stumpClipR = species === 'dead' ? Math.max(3.2, r * 0.24) : Math.max(2.6, r * 0.18);
    const reach = r * 1.8 + Math.hypot(maxOff.dx, maxOff.dy) + 80;
    const stumpPoly: Point[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      stumpPoly.push({
        x: tree.x - sunState.shadowDirX * 1.2 + Math.cos(a) * stumpClipR,
        y: tree.y - sunState.shadowDirY * 1.2 + Math.sin(a) * stumpClipR,
      });
    }

    sCtx.save();
    clipOutsidePolygon(sCtx, stumpPoly, {
      minX: tree.x - reach,
      minY: tree.y - reach,
      maxX: tree.x + reach,
      maxY: tree.y + reach,
    });

    // 1. Root flare & tapered main trunk from ground (0) to primary fork (trunkTopZ)
    const baseR = Math.max(2.2, r * (species === 'dead' ? 0.21 : 0.17));
    const forkR = Math.max(1.4, r * 0.11);
    const forkX = tree.x + trunkOff.dx;
    const forkY = tree.y + trunkOff.dy;

    sCtx.beginPath();
    sCtx.moveTo(tree.x + perpX * baseR, tree.y + perpY * baseR);
    sCtx.lineTo(tree.x - perpX * baseR, tree.y - perpY * baseR);
    sCtx.lineTo(forkX - perpX * forkR, forkY - perpY * forkR);
    sCtx.lineTo(forkX + perpX * forkR, forkY + perpY * forkR);
    sCtx.closePath();
    sCtx.fill();

    // 2. Primary crooked boughs & secondary forked twigs batched into 2 stroke passes
    const numBranches = species === 'dead' ? 6 : species === 'birch' ? 6 : 5;
    sCtx.lineWidth = Math.max(1.8, r * (species === 'birch' ? 0.12 : 0.16));
    sCtx.beginPath();
    for (let b = 0; b < numBranches; b++) {
      const ang =
        (b / numBranches) * Math.PI * 2 +
        ((seed * (b + 1)) % 10) * (species === 'dead' ? 0.15 : 0.14);
      const len =
        r *
        (species === 'dead'
          ? 0.8 + ((seed + b * 7) % 6) * 0.09
          : 0.76 + ((seed + b * 5) % 6) * 0.08);

      const midZ = trunkTopZ + (treeH - trunkTopZ) * 0.48;
      const tipZ = trunkTopZ + (treeH - trunkTopZ) * (0.82 + (b % 3) * 0.11);
      const midOff = getShadowOffset(midZ, sunState);
      const tipOff = getShadowOffset(tipZ, sunState);

      const curveBend = species === 'dead' ? 0.25 : 0.22;
      const mx = tree.x + Math.cos(ang + curveBend) * (len * 0.52) + midOff.dx;
      const my = tree.y + Math.sin(ang + curveBend) * (len * 0.52) + midOff.dy;
      const bx = tree.x + Math.cos(ang) * len + tipOff.dx;
      const by = tree.y + Math.sin(ang) * len + tipOff.dy;

      sCtx.moveTo(forkX, forkY);
      sCtx.quadraticCurveTo(mx, my, bx, by);
    }
    sCtx.stroke();

    sCtx.lineWidth = Math.max(1.0, r * 0.075);
    sCtx.beginPath();
    for (let b = 0; b < numBranches; b++) {
      const ang =
        (b / numBranches) * Math.PI * 2 +
        ((seed * (b + 1)) % 10) * (species === 'dead' ? 0.15 : 0.14);
      const len =
        r *
        (species === 'dead'
          ? 0.8 + ((seed + b * 7) % 6) * 0.09
          : 0.76 + ((seed + b * 5) % 6) * 0.08);

      const midZ = trunkTopZ + (treeH - trunkTopZ) * 0.48;
      const tipZ = trunkTopZ + (treeH - trunkTopZ) * (0.82 + (b % 3) * 0.11);
      const midOff = getShadowOffset(midZ, sunState);
      const tipOff = getShadowOffset(tipZ, sunState);

      const curveBend = species === 'dead' ? 0.25 : 0.22;
      const mx = tree.x + Math.cos(ang + curveBend) * (len * 0.52) + midOff.dx;
      const my = tree.y + Math.sin(ang + curveBend) * (len * 0.52) + midOff.dy;
      const bx = tree.x + Math.cos(ang) * len + tipOff.dx;
      const by = tree.y + Math.sin(ang) * len + tipOff.dy;

      const subAngA = ang + (b % 2 === 0 ? 0.44 : -0.44);
      const subLenA = r * 0.36;
      const subZA = tipZ + r * 0.18;
      const subOffA = getShadowOffset(subZA, sunState);
      const txA = tree.x + Math.cos(ang) * len + Math.cos(subAngA) * subLenA + subOffA.dx;
      const tyA = tree.y + Math.sin(ang) * len + Math.sin(subAngA) * subLenA + subOffA.dy;

      sCtx.moveTo(bx, by);
      sCtx.lineTo(txA, tyA);

      const subAngB = ang + (b % 2 === 0 ? -0.52 : 0.52);
      const subLenB = r * 0.28;
      const subZB = midZ + r * 0.22;
      const subOffB = getShadowOffset(subZB, sunState);
      const txB =
        tree.x +
        Math.cos(ang + curveBend) * (len * 0.52) +
        Math.cos(subAngB) * subLenB +
        subOffB.dx;
      const tyB =
        tree.y +
        Math.sin(ang + curveBend) * (len * 0.52) +
        Math.sin(subAngB) * subLenB +
        subOffB.dy;

      sCtx.moveTo(mx, my);
      sCtx.lineTo(txB, tyB);
    }
    sCtx.stroke();

    sCtx.restore();
    return;
  }

  // ==========================================================================
  // CASE 2: PINE / SPRUCE (CONIFEROUS WHORLED EVERGREEN SHADOW)
  // ==========================================================================
  if (species === 'pine') {
    const treeH = r * 2.42;
    const skirtZ = r * 0.34;
    const apexOff = getShadowOffset(treeH, sunState);
    const reach = r * 2.2 + Math.hypot(apexOff.dx, apexOff.dy) + 96;

    const sunlitPoly = buildSunlitCrownClipPolygon(tree, species, sunState, h);
    sCtx.save();
    clipOutsidePolygon(sCtx, sunlitPoly, {
      minX: tree.x - reach,
      minY: tree.y - reach,
      maxX: tree.x + reach,
      maxY: tree.y + reach,
    });

    // Batch trunk + 5 star-whorls + serrated flank spine into a SINGLE beginPath/fill call
    const skirtOff = getShadowOffset(skirtZ, sunState);
    const trunkBaseR = Math.max(2.0, r * 0.16);
    const trunkTopR = Math.max(1.5, r * 0.12);
    sCtx.beginPath();
    // 1. Trunk (CW winding)
    sCtx.moveTo(tree.x - perpX * trunkBaseR, tree.y - perpY * trunkBaseR);
    sCtx.lineTo(tree.x + perpX * trunkBaseR, tree.y + perpY * trunkBaseR);
    sCtx.lineTo(tree.x + skirtOff.dx + perpX * trunkTopR, tree.y + skirtOff.dy + perpY * trunkTopR);
    sCtx.lineTo(tree.x + skirtOff.dx - perpX * trunkTopR, tree.y + skirtOff.dy - perpY * trunkTopR);
    sCtx.closePath();

    // 2. Serrated Conical Whorls (5 overlapping star-whorl layers, all CW winding)
    const whorls = 5;
    for (let w = 0; w < whorls; w++) {
      const frac = w / (whorls - 1);
      const z = skirtZ + (treeH - skirtZ) * Math.pow(frac, 0.92);
      const off = getShadowOffset(z, sunState);
      const wx = tree.x + off.dx;
      const wy = tree.y + off.dy;
      const whorlR = r * (1.02 - frac * 0.76);
      const numBoughs = 9 - Math.floor(frac * 3);
      const rot = ((h & 31) * 0.12) + w * 0.58;

      for (let i = 0; i < numBoughs * 2; i++) {
        const a = (i / (numBoughs * 2)) * Math.PI * 2 + rot;
        const isTip = (i & 1) === 0;
        const jitter = 0.92 + (((h >> (i & 7)) & 7) / 7) * 0.16;
        const rad = whorlR * (isTip ? 1.08 : 0.62) * jitter;
        const px = wx + Math.cos(a) * rad;
        const py = wy + Math.sin(a) * rad;
        if (i === 0) sCtx.moveTo(px, py);
        else sCtx.lineTo(px, py);
      }
      sCtx.closePath();
    }

    // 3. Continuous serrated flank spine (traced in CW order so it unions cleanly with whorls)
    const flankTiers = 6;
    for (let t = 0; t <= flankTiers; t++) {
      const f = t / flankTiers;
      const z = skirtZ + (treeH - skirtZ) * f;
      const off = getShadowOffset(z, sunState);
      const wRad = r * (0.94 - f * 0.82);
      const boughOut = (t < flankTiers ? 1.08 : 0.35) * wRad;
      const px = tree.x + off.dx - perpX * boughOut;
      const py = tree.y + off.dy - perpY * boughOut;
      if (t === 0) sCtx.moveTo(px, py);
      else sCtx.lineTo(px, py);
      if (t < flankTiers) {
        const nextF = (t + 0.55) / flankTiers;
        const nextZ = skirtZ + (treeH - skirtZ) * nextF;
        const nOff = getShadowOffset(nextZ, sunState);
        const valleyR = r * (0.94 - nextF * 0.82) * 0.64;
        sCtx.lineTo(tree.x + nOff.dx - perpX * valleyR, tree.y + nOff.dy - perpY * valleyR);
      }
    }
    sCtx.lineTo(
      tree.x + apexOff.dx + sunState.shadowDirX * (r * 0.18),
      tree.y + apexOff.dy + sunState.shadowDirY * (r * 0.18)
    );
    for (let t = flankTiers; t >= 0; t--) {
      const f = t / flankTiers;
      const z = skirtZ + (treeH - skirtZ) * f;
      const off = getShadowOffset(z, sunState);
      const wRad = r * (0.94 - f * 0.82);
      const boughOut = (t < flankTiers ? 1.08 : 0.35) * wRad;
      if (t < flankTiers) {
        const prevF = (t + 0.55) / flankTiers;
        const prevZ = skirtZ + (treeH - skirtZ) * prevF;
        const pOff = getShadowOffset(prevZ, sunState);
        const valleyR = r * (0.94 - prevF * 0.82) * 0.64;
        sCtx.lineTo(tree.x + pOff.dx + perpX * valleyR, tree.y + pOff.dy + perpY * valleyR);
      }
      sCtx.lineTo(tree.x + off.dx + perpX * boughOut, tree.y + off.dy + perpY * boughOut);
    }
    sCtx.closePath();
    sCtx.fill();

    sCtx.restore();
    return;
  }

  // ==========================================================================
  // CASE 3: BROADLEAF DECIDUOUS (OAK / MAPLE) & RUSSIAN BIRCH SHADOW
  // ==========================================================================
  const treeH = species === 'birch' ? r * 2.18 : species === 'oak' ? r * 2.04 : r * 2.12;
  const trunkH = treeH * 0.34;
  const trunkOff = getShadowOffset(trunkH, sunState);
  const crownOff = getShadowOffset(treeH * 0.86, sunState);
  const reach = r * 2.4 + Math.hypot(crownOff.dx, crownOff.dy) + 96;

  const sunlitPoly = buildSunlitCrownClipPolygon(tree, species, sunState, h);
  sCtx.save();
  clipOutsidePolygon(sCtx, sunlitPoly, {
    minX: tree.x - reach,
    minY: tree.y - reach,
    maxX: tree.x + reach,
    maxY: tree.y + reach,
  });

  const trunkBaseR = Math.max(2.1, r * (species === 'birch' ? 0.14 : 0.19));
  const trunkTopR = Math.max(1.4, r * (species === 'birch' ? 0.10 : 0.14));
  const forkX = tree.x + trunkOff.dx;
  const forkY = tree.y + trunkOff.dy;

  // Two diverging lower boughs from the trunk fork into the lower canopy flanks (single batched stroke)
  const boughZ = treeH * 0.56;
  const boughOff = getShadowOffset(boughZ, sunState);
  sCtx.lineWidth = Math.max(1.6, trunkTopR * 1.35);
  sCtx.beginPath();
  for (let side = -1; side <= 1; side += 2) {
    const bEndX = tree.x + boughOff.dx + perpX * side * (r * 0.38);
    const bEndY = tree.y + boughOff.dy + perpY * side * (r * 0.38);
    sCtx.moveTo(forkX, forkY);
    sCtx.lineTo(bEndX, bEndY);
  }
  sCtx.stroke();

  // Batch Trunk + Lower/Upper Canopy Core + 6-7 Sub-Crowns + 8-10 Peripheral Leaf Tufts into ONE fill() call!
  sCtx.beginPath();

  // 1. Tapered Main Trunk (CW winding)
  sCtx.moveTo(tree.x - perpX * trunkBaseR, tree.y - perpY * trunkBaseR);
  sCtx.lineTo(tree.x + perpX * trunkBaseR, tree.y + perpY * trunkBaseR);
  sCtx.lineTo(forkX + perpX * trunkTopR, forkY + perpY * trunkTopR);
  sCtx.lineTo(forkX - perpX * trunkTopR, forkY - perpY * trunkTopR);
  sCtx.closePath();

  // 2. Lower & Mid Canopy Core
  const midOff = getShadowOffset(treeH * 0.58, sunState);
  const shadowAngle = Math.atan2(sunState.shadowDirY, sunState.shadowDirX);
  traceOrganicLeafClusterShadow(
    sCtx,
    tree.x + midOff.dx,
    tree.y + midOff.dy,
    r * (species === 'birch' ? 0.72 : 0.82),
    r * (species === 'birch' ? 0.68 : 0.76),
    shadowAngle + 0.3,
    h,
    species === 'maple' ? 0.16 : 0.13,
    14
  );

  // Upper main dome core
  traceOrganicLeafClusterShadow(
    sCtx,
    tree.x + crownOff.dx,
    tree.y + crownOff.dy,
    r * (species === 'birch' ? 0.76 : 0.85),
    r * (species === 'birch' ? 0.70 : 0.78),
    shadowAngle - 0.25,
    h ^ 0x5a5a,
    species === 'maple' ? 0.17 : 0.14,
    14
  );

  // 3. Asymmetric Bough Sub-Crowns
  const numDomes = species === 'birch' ? 7 : 6;
  for (let i = 0; i < numDomes; i++) {
    const ang = (i / numDomes) * Math.PI * 2 + ((h & 31) * 0.09) + (i % 2) * 0.14;
    const dist = r * (species === 'birch' ? 0.48 : 0.44) * (0.86 + ((h >> (i + 2)) & 3) * 0.08);
    const domeR =
      r *
      (species === 'birch' ? 0.44 : 0.52) *
      (0.88 + ((i & 1) ? 0.12 : -0.06));
    const domeZ = treeH * (0.64 + ((i * 3 + (h & 3)) % 4) * 0.09);
    const dOff = getShadowOffset(domeZ, sunState);

    const dx = tree.x + Math.cos(ang) * dist + dOff.dx;
    const dy = tree.y + Math.sin(ang) * dist + dOff.dy;

    traceOrganicLeafClusterShadow(
      sCtx,
      dx,
      dy,
      domeR * 1.06,
      domeR * 0.92,
      ang,
      h + i * 97,
      species === 'maple' ? 0.18 : 0.15,
      10
    );
  }

  // 4. Peripheral Leaf Tufts / Feathered Edge Clusters
  const numTufts = species === 'birch' ? 10 : 8;
  for (let t = 0; t < numTufts; t++) {
    const tAng = (t / numTufts) * Math.PI * 2 + ((h >> 3) & 15) * 0.13;
    const tDist = r * (0.74 + ((t * 5 + h) & 3) * 0.06);
    const tRad = r * (species === 'birch' ? 0.23 : 0.27);
    const tZ = treeH * (0.60 + (t % 3) * 0.11);
    const tOff = getShadowOffset(tZ, sunState);

    traceOrganicLeafClusterShadow(
      sCtx,
      tree.x + Math.cos(tAng) * tDist + tOff.dx,
      tree.y + Math.sin(tAng) * tDist + tOff.dy,
      tRad * 1.1,
      tRad * 0.85,
      tAng,
      h + t * 131,
      0.18,
      8
    );
  }

  sCtx.fill();
  sCtx.restore();
}

/**
 * Main entry point: Renders all unified 3D world shadows onto `shadowCtx` in two height-ordered passes:
 * - Tier 1 (Low/Mid Ground Objects: z <= 36px — ground items, guardrails, street furniture, gas pumps,
 *   pedestrians, player, dogs, vehicles, trains).
 * - Tier 2 (Tall Overhead Casters: z > 36px — tall lamps/poles, gas station canopy, garage blocks,
 *   railway buildings/canopies/catenary, city buildings + rooftop structures, trees, flying birds, clouds).
 */
export function renderUnifiedWorldShadows(
  sCtx: CanvasRenderingContext2D,
  mainCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  backingScale: number,
  world: GameWorld,
  sunState: SunShadowState,
  visibleBuildings: Building[],
  nearbyVehicles: Vehicle[],
  visiblePedestrians: Pedestrian[],
  visibleTrees: Tree[],
  props: StreetProp[],
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  player?: Player,
  remotePlayers?: RemotePlayerState[],
  cloudShadows?: CloudShadowCluster[]
) {
  const shadowScale = Math.max(0.5, Math.min(1.0, performanceConfig.shadowResolutionScale ?? 1.0));
  sCtx.save();
  sCtx.setTransform(1, 0, 0, 1, 0, 0);
  sCtx.clearRect(0, 0, Math.ceil(width * shadowScale), Math.ceil(height * shadowScale));

  // Match camera world-to-screen transform (scaled by shadowResolutionScale / backingScale)
  const t = mainCtx.getTransform();
  const ik = shadowScale / backingScale;
  sCtx.setTransform(t.a * ik, t.b * ik, t.c * ik, t.d * ik, t.e * ik, t.f * ik);

  // Deep midnight-navy shadow color matching the night darkness shroud.
  // Drawn opaque onto shadowCanvas so overlapping shadows never double-darken;
  // overall shadow opacity is applied once when compositing shadowCanvas onto lightmapCanvas.
  const shadowColor = 'rgb(4, 8, 22)';
  const softness = performanceConfig.shadowSoftness ?? 60;
  const penumbraStrokeColor = 'rgba(4, 8, 22, 0.34)';
  const outerPenumbraStrokeColor = 'rgba(4, 8, 22, 0.16)';
  sCtx.fillStyle = shadowColor;
  sCtx.strokeStyle = shadowColor;
  sCtx.lineCap = 'round';
  sCtx.lineJoin = 'round';

  // ============================================================================
  // TIER 1: GROUND & LOW/MID-HEIGHT CASTERS (z <= 36px)
  // ============================================================================

  // 1A. Ground Items, Litter & Sand Mounds (z = 1.5 .. 4.5px)
  if (performanceConfig.enableMicroShadows !== false) {
    if (world.groundItems) {
      const itemOff = getShadowOffset(2.8, sunState);
      for (const gi of world.groundItems) {
        if (gi.x < minX - 20 || gi.x > maxX + 20 || gi.y < minY - 20 || gi.y > maxY + 20) continue;
        sCtx.beginPath();
        sCtx.arc(gi.x + itemOff.dx, gi.y + itemOff.dy, 2.8, 0, Math.PI * 2);
        sCtx.fill();
      }
    }
    if (world.litter) {
      for (const lit of world.litter) {
        if (lit.x < minX - 20 || lit.x > maxX + 20 || lit.y < minY - 20 || lit.y > maxY + 20) continue;
        const z = 1.6 + (lit.altitude || 0);
        const lOff = getShadowOffset(z, sunState);
        sCtx.beginPath();
        sCtx.arc(lit.x + lOff.dx, lit.y + lOff.dy, Math.max(1.2, lit.size * 0.55), 0, Math.PI * 2);
        sCtx.fill();
      }
    }
    if (world.stains) {
      for (const st of world.stains) {
        if (st.type !== 'sand') continue;
        if (st.x < minX - 40 || st.x > maxX + 40 || st.y < minY - 40 || st.y > maxY + 40) continue;
        const sandOff = getShadowOffset(4.5, sunState);
        sCtx.save();
        clipOutsideCircle(sCtx, st.x, st.y, st.radius * 0.85, sandOff.dx, sandOff.dy);
        extrudeCylinderShadow(sCtx, st.x, st.y, st.radius, 0, 4.5, sunState);
        sCtx.restore();
      }
    }
  }

  if (performanceConfig.enablePropShadows !== false) {
    // 1B. Road Guardrails (posts + W-beam rail, z = 0 .. 9.5px)
    renderGuardrailShadows(sCtx, world, sunState, minX, minY, maxX, maxY);

    // 1C. Low Street Furniture, Signs & Park Fountain Tiers
    renderStreetPropShadows(sCtx, props, sunState, minX, minY, maxX, maxY, 'low');
    renderIntersectionSignsAndFountainsShadows(
      sCtx,
      world,
      visibleBuildings,
      sunState,
      minX,
      minY,
      maxX,
      maxY
    );

    // 1D. Gas Station Low Casters (Islands & Fuel Pumps)
    renderGasStationShadows(sCtx, world, sunState, minX, minY, maxX, maxY, 'low');

    // 1E. Railway Low/Mid Casters (Platforms & Rolling Stock Trains)
    renderRailwayShadows(sCtx, world, sunState, minX, minY, maxX, maxY, 'low');
  }

  // 1F. Pedestrians & Dogs (z = 0 .. 22px)
  if (performanceConfig.enablePedestrianShadows !== false) {
    for (const ped of visiblePedestrians) {
      if (ped.isInsideBuilding) continue;
      const pedScale = ped.isChild || ped.ageGroup === 'child' ? 0.74 : 1.0;
      renderHumanShadow(
        sCtx,
        ped.x,
        ped.y,
        ped.angle,
        ped.walkCycle || 0,
        false,
        false,
        pedScale,
        sunState,
        ped.handheldProp,
        ped.hasBroom
      );

      // Pedestrian's Dog Companion Shadow (z = 0 .. 9.5px)
      if (ped.hasDog) {
        const cosP = Math.cos(ped.angle);
        const sinP = Math.sin(ped.angle);
        const dogX = ped.x + cosP * 11 - sinP * 8.5;
        const dogY = ped.y + sinP * 11 + cosP * 8.5;
        const dOff = getShadowOffset(9.5, sunState);
        sCtx.save();
        clipOutsideRotatedRect(sCtx, dogX, dogY, 8.5, 4.0, ped.angle, dOff.dx, dOff.dy);
        extrudeRotatedRectShadow(sCtx, dogX, dogY, 9.0, 4.2, ped.angle, 1.5, 9.5, sunState);
        sCtx.restore();
      }
    }

    // 1G. Player & Remote Players (when on foot)
    if (player && !player.isInVehicle && !player.isInsideBuilding && !player.insideBusId) {
      const pAny = player as any;
      const isLying =
        !!pAny.body?.isUnconscious ||
        pAny.sleepState === 'asleep' ||
        pAny.sleepState === 'falling_asleep';
      const isMoving = Math.hypot(player.vx || 0, player.vy || 0) > 2;
      const walkPhase = isMoving ? Date.now() * 0.012 : 0;
      renderHumanShadow(
        sCtx,
        player.x,
        player.y,
        player.angle,
        walkPhase,
        isLying,
        false,
        1.0,
        sunState
      );
    }
    if (remotePlayers) {
      for (const rp of remotePlayers) {
        if (rp.isInVehicle) continue;
        if (rp.x < minX - 80 || rp.x > maxX + 80 || rp.y < minY - 80 || rp.y > maxY + 80) continue;
        const walkPhase = (rp as any).isMoving ? Date.now() * 0.012 : 0;
        renderHumanShadow(sCtx, rp.x, rp.y, rp.angle, walkPhase, false, false, 1.0, sunState);
      }
    }
  }

  // 1H. All Vehicles & Trailers (z = 2 .. 34px + altitude)
  if (performanceConfig.enableVehicleShadows !== false) {
    for (const car of nearbyVehicles) {
      renderVehicleShadow(sCtx, car, sunState);
    }
  }

  // ============================================================================
  // TIER 2: TALL OVERHEAD CASTERS (z > 36px — Cast Shadows OVER Cars, Peds & Roads!)
  // ============================================================================

  if (performanceConfig.enablePropShadows !== false) {
    // 2A. Tall Streetlights, Highway Masts, Utility Poles, Traffic Lights, Bus Stops & Kiosks
    renderStreetPropShadows(sCtx, props, sunState, minX, minY, maxX, maxY, 'high');

    // 2B. Gas Station Canopy, Support Columns, Price Totem & Floodlight Towers
    renderGasStationShadows(sCtx, world, sunState, minX, minY, maxX, maxY, 'high');

    // 2C. Railway Platform Canopies & Signals
    renderRailwayShadows(sCtx, world, sunState, minX, minY, maxX, maxY, 'high');
  }

  // 2D. All City, Village, Garage & Railway Buildings + Balconies/Fire Escapes + Rooftop Superstructures
  if (performanceConfig.enableBuildingShadows !== false) {
    const drawRooftops = performanceConfig.enableRooftopShadows !== false;
    for (const bld of visibleBuildings) {
      if (
        bld.type === 'park_monument' ||
        bld.type === 'gas_station_island' ||
        bld.type === 'railway_platform'
      ) {
        continue;
      }
      const bldH = getBuildingHeightPx(bld);
      const bOff = getShadowOffset(bldH, sunState);

      // 1. Main Building 3D Wall Shadow (clipped to the exterior of the building's own roof footprint
      // so its walls don't darken its own roof, while preserving shadows from taller casters!)
      sCtx.save();
      clipOutsideRect(sCtx, bld.x, bld.y, bld.width, bld.height, bOff.dx, bOff.dy);
      if (bld.type === 'gas_station_canopy') {
        extrudeRectShadow(sCtx, bld.x, bld.y, bld.width, bld.height, 44, bldH, sunState);
      } else if (bld.type === 'garage_ramp') {
        extrudeRectShadow(sCtx, bld.x, bld.y, bld.width, bld.height, 6, bldH, sunState);
      } else {
        extrudeRectShadow(sCtx, bld.x, bld.y, bld.width, bld.height, 0, bldH, sunState);
      }

      // Exterior balconies & fire escapes on residential/industrial facades
      if (drawRooftops && bld.balconies && bld.balconies.length > 0) {
        for (const bal of bld.balconies) {
          let bx = bld.x;
          let by = bld.y;
          let bw = bal.length;
          let bh = bal.depth;
          if (bal.side === 'north') {
            bx = bld.x + bal.offset * bld.width - bal.length * 0.5;
            by = bld.y - bal.depth;
          } else if (bal.side === 'south') {
            bx = bld.x + bal.offset * bld.width - bal.length * 0.5;
            by = bld.y + bld.height;
          } else if (bal.side === 'west') {
            bx = bld.x - bal.depth;
            by = bld.y + bal.offset * bld.height - bal.length * 0.5;
            bw = bal.depth;
            bh = bal.length;
          } else {
            bx = bld.x + bld.width;
            by = bld.y + bal.offset * bld.height - bal.length * 0.5;
            bw = bal.depth;
            bh = bal.length;
          }
          extrudeRectShadow(sCtx, bx, by, bw, bh, bldH * 0.25, bldH * 0.88, sunState);
        }
      }
      if (drawRooftops && bld.fireEscapes && bld.fireEscapes.length > 0) {
        for (const fe of bld.fireEscapes) {
          let fx = bld.x;
          let fy = bld.y;
          let fw = fe.length;
          let fh = fe.depth;
          if (fe.side === 'north') {
            fx = bld.x + fe.offset * bld.width - fe.length * 0.5;
            fy = bld.y - fe.depth;
          } else if (fe.side === 'south') {
            fx = bld.x + fe.offset * bld.width - fe.length * 0.5;
            fy = bld.y + bld.height;
          } else if (fe.side === 'west') {
            fx = bld.x - fe.depth;
            fy = bld.y + fe.offset * bld.height - fe.length * 0.5;
            fw = fe.depth;
            fh = fe.length;
          } else {
            fx = bld.x + bld.width;
            fy = bld.y + fe.offset * bld.height - fe.length * 0.5;
            fw = fe.depth;
            fh = fe.length;
          }
          extrudeRectShadow(sCtx, fx, fy, fw, fh, bldH * 0.15, bldH * 0.92, sunState);
        }
      }
      sCtx.restore();

      // 2. Rooftop Structures (parapets, elevator penthouses, HVAC, skylights, chimneys, smokestacks)
      // Drawn AFTER restoring the roof clip so they cast crisp 3D shadows right across the building's roof!
      if (drawRooftops) {
        renderBuildingRooftopShadows(sCtx, bld, sunState);
      }

      // 3. Soft Penumbra Outline along the projected building shadow boundary
      if (softness > 0 && sunState.penumbraFactor > 0.05) {
        sCtx.save();
        clipOutsideRect(sCtx, bld.x, bld.y, bld.width, bld.height, bOff.dx, bOff.dy);
        sCtx.strokeStyle = penumbraStrokeColor;
        sCtx.lineWidth = Math.max(1.0, 3.2 * sunState.penumbraFactor);
        sCtx.strokeRect(bld.x + bOff.dx, bld.y + bOff.dy, bld.width, bld.height);
        if (softness >= 50) {
          sCtx.strokeStyle = outerPenumbraStrokeColor;
          sCtx.lineWidth = Math.max(2.0, 6.8 * sunState.penumbraFactor);
          sCtx.strokeRect(bld.x + bOff.dx, bld.y + bOff.dy, bld.width, bld.height);
        }
        sCtx.restore();
        sCtx.fillStyle = shadowColor;
        sCtx.strokeStyle = shadowColor;
      }
    }
  }

  // 2E. Trees (z = 55 .. 95px — cast full canopy + trunk shadows over roads, cars, pedestrians, and low roofs!)
  if (performanceConfig.enableTreeShadows !== false) {
    const currentSeason = world.calendar?.season ?? world.season ?? 'summer';
    const treePad = 140;
    for (const tree of visibleTrees) {
      if (
        tree.x < minX - treePad ||
        tree.x > maxX + treePad ||
        tree.y < minY - treePad ||
        tree.y > maxY + treePad
      ) {
        continue;
      }
      renderTreeShadow(sCtx, tree, sunState, currentSeason);
    }
  }

  // 2F. Flying Birds (high-altitude soaring silhouettes cast far along the solar vector)
  if (world.birds && !sunState.isNight) {
    for (const bird of world.birds) {
      if (bird.state !== 'flying') continue;
      const birdAlt = Math.max(45, bird.altitude || 75);
      const birdOff = getShadowOffset(birdAlt, sunState);
      const bx = bird.x + birdOff.dx;
      const by = bird.y + birdOff.dy;
      if (bx < minX - 40 || bx > maxX + 40 || by < minY - 40 || by > maxY + 40) continue;
      const bAngle = Math.atan2(bird.flyVY || 0, bird.flyVX || 1);
      const flap = Math.sin(bird.wingCycle || 0) * 2.5;
      sCtx.save();
      sCtx.translate(bx, by);
      sCtx.rotate(bAngle);
      sCtx.beginPath();
      sCtx.moveTo(3.5, 0);
      sCtx.lineTo(-1.5, -5.5 + flap);
      sCtx.lineTo(-0.5, 0);
      sCtx.lineTo(-1.5, 5.5 - flap);
      sCtx.closePath();
      sCtx.fill();
      sCtx.restore();
    }
  }

  // 2G. Drifting Overhead Cloud Shadows (soft atmospheric darkening patches across the world)
  if (
    performanceConfig.enableCloudShadows &&
    cloudShadows &&
    cloudShadows.length > 0 &&
    !sunState.isNight
  ) {
    const weights = getEffectiveWeatherWeights(world);
    const baseCloudAlpha = weights.cloudShadowAlpha;
    if (baseCloudAlpha > 0.004) {
      const scaleMult = weights.cloudShadowScale || 1.0;
      const timeSec = performance.now() * 0.001;
      const windVx = world.wind ? world.wind.vx * 0.35 : 24;
      const windVy = world.wind ? world.wind.vy * 0.35 : 7;
      const MAP_W = 54000;
      const MAP_H = 32000;
      const cloudOff = getShadowOffset(180, sunState);

      for (const cluster of cloudShadows) {
        const maxRadius = cluster.baseScale * scaleMult * 1.25;
        const clusterX =
          ((((cluster.baseX + timeSec * windVx * cluster.speedMult + cloudOff.dx) % MAP_W) + MAP_W) % MAP_W);
        const clusterY =
          ((((cluster.baseY + timeSec * windVy * cluster.speedMult + cloudOff.dy) % MAP_H) + MAP_H) % MAP_H);

        if (
          clusterX + maxRadius < minX ||
          clusterX - maxRadius > maxX ||
          clusterY + maxRadius < minY ||
          clusterY - maxRadius > maxY
        ) {
          continue;
        }

        for (const lobe of cluster.lobes) {
          // NOTE: lobe.relX, lobe.relY, and lobe.radius are ALREADY scaled by cluster.baseScale in world pixels!
          const cx = clusterX + lobe.relX * scaleMult;
          const cy = clusterY + lobe.relY * scaleMult;
          const r = lobe.radius * scaleMult;
          if (cx + r < minX || cx - r > maxX || cy + r < minY || cy - r > maxY) {
            continue;
          }
          const lobeAlpha = Math.min(0.45, baseCloudAlpha * (lobe.opacityMultiplier || 1));
          const peakA = lobeAlpha.toFixed(3);
          const midA = (lobeAlpha * 0.55).toFixed(3);
          const cGrad = sCtx.createRadialGradient(cx, cy, r * 0.12, cx, cy, r);
          cGrad.addColorStop(0.0, `rgba(4, 8, 22, ${peakA})`);
          cGrad.addColorStop(0.55, `rgba(4, 8, 22, ${midA})`);
          cGrad.addColorStop(1.0, 'rgba(4, 8, 22, 0.0)');
          sCtx.fillStyle = cGrad;
          sCtx.beginPath();
          sCtx.arc(cx, cy, r, 0, Math.PI * 2);
          sCtx.fill();
        }
      }
      sCtx.fillStyle = shadowColor;
    }
  }

  sCtx.restore();
}
