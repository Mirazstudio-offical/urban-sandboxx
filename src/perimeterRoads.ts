import { Intersection, RoadSegment, StreetProp, Vector2D } from './types';
import { generateBezierCurve } from './vehicleHelpers';

export const RING_MIN = 100;
export const RING_MAX = 8100;

export interface PerimeterConfig {
  vertRoadXs: number[];
  horizRoadYs: number[];
  getRoadWidth: (isAvenue: boolean) => number;
  getRoadWidthAtCol: (c: number) => number;
  getRoadWidthAtRow: (r: number) => number;
}

/**
 * Builds the complete outer ring road system surrounding the city,
 * connecting all dead-ends across the 4 borders with diverse surface types
 * (dirt, gravel, asphalt) and corresponding intersection types (regulated / unregulated).
 */
export function buildPerimeterNetwork(
  roads: RoadSegment[],
  intersections: Intersection[],
  props: StreetProp[],
  config: PerimeterConfig
) {
  const { vertRoadXs, horizRoadYs, getRoadWidth } = config;
  const xPoints = [RING_MIN, ...vertRoadXs, RING_MAX];
  const yPoints = [RING_MIN, ...horizRoadYs, RING_MAX];

  // ==========================================
  // 1. GENERATE 4 OUTER RING ROAD PERIMETERS
  // ==========================================

  // --- 1.1 NORTH RING ROAD (y = RING_MIN) ---
  for (let i = 0; i < xPoints.length - 1; i++) {
    const segX1 = xPoints[i];
    const segX2 = xPoints[i + 1];
    const segmentId = `road_ring_n_${i}`;

    const isDirt = i < 4; // Northwest forest sector
    const isAvenue = i === 4 || i === 6; // Connects to Silicon Highway & Metro Ave
    const lanes = isAvenue ? 4 : 2;
    const roadWidth = isAvenue ? 144 : (isDirt ? 64 : 84);
    const laneWidth = roadWidth / lanes;

    const startPad = i === 0 ? 42 : (i - 1 === 4 || i - 1 === 6 ? 72 : 42);
    const endPad = i === xPoints.length - 2 ? 42 : (i === 4 || i === 6 ? 72 : 42);
    const laneX1 = segX1 + startPad;
    const laneX2 = segX2 - endPad;

    const lanePaths: RoadSegment['lanePaths'] = [];
    if (lanes === 4) {
      // Upper 2 lanes: Westbound (-X)
      lanePaths.push({
        laneId: `${segmentId}_w0`,
        laneIndex: 0,
        direction: Math.PI,
        waypoints: [{ x: laneX2, y: RING_MIN - laneWidth * 1.5 }, { x: laneX1, y: RING_MIN - laneWidth * 1.5 }]
      });
      lanePaths.push({
        laneId: `${segmentId}_w1`,
        laneIndex: 1,
        direction: Math.PI,
        waypoints: [{ x: laneX2, y: RING_MIN - laneWidth * 0.5 }, { x: laneX1, y: RING_MIN - laneWidth * 0.5 }]
      });
      // Lower 2 lanes: Eastbound (+X)
      lanePaths.push({
        laneId: `${segmentId}_e1`,
        laneIndex: 2,
        direction: 0,
        waypoints: [{ x: laneX1, y: RING_MIN + laneWidth * 0.5 }, { x: laneX2, y: RING_MIN + laneWidth * 0.5 }]
      });
      lanePaths.push({
        laneId: `${segmentId}_e0`,
        laneIndex: 3,
        direction: 0,
        waypoints: [{ x: laneX1, y: RING_MIN + laneWidth * 1.5 }, { x: laneX2, y: RING_MIN + laneWidth * 1.5 }]
      });
    } else {
      // 2 lanes: North side goes West, South side goes East
      lanePaths.push({
        laneId: `${segmentId}_w0`,
        laneIndex: 0,
        direction: Math.PI,
        waypoints: [{ x: laneX2, y: RING_MIN - laneWidth * 0.5 }, { x: laneX1, y: RING_MIN - laneWidth * 0.5 }]
      });
      lanePaths.push({
        laneId: `${segmentId}_e0`,
        laneIndex: 1,
        direction: 0,
        waypoints: [{ x: laneX1, y: RING_MIN + laneWidth * 0.5 }, { x: laneX2, y: RING_MIN + laneWidth * 0.5 }]
      });
    }

    roads.push({
      id: segmentId,
      x1: segX1,
      y1: RING_MIN,
      x2: segX2,
      y2: RING_MIN,
      lanes,
      width: roadWidth,
      isAvenue,
      isDirt,
      isGravel: false,
      direction: 'horizontal',
      name: isDirt ? 'Северный лесной объездной тракт' : 'Северо-Восточная объездная магистраль',
      lanePaths
    });
  }

  // --- 1.2 SOUTH RING ROAD (y = RING_MAX) ---
  for (let i = 0; i < xPoints.length - 1; i++) {
    const segX1 = xPoints[i];
    const segX2 = xPoints[i + 1];
    const segmentId = `road_ring_s_${i}`;

    const isGravel = i >= 5; // Southeast cottage & river sector
    const isAvenue = i === 4;
    const lanes = isAvenue ? 4 : 2;
    const roadWidth = isAvenue ? 144 : (isGravel ? 64 : 84);
    const laneWidth = roadWidth / lanes;

    const startPad = i === 0 ? 42 : (i - 1 === 4 || i - 1 === 6 ? 72 : 42);
    const endPad = i === xPoints.length - 2 ? 42 : (i === 4 || i === 6 ? 72 : 42);
    const laneX1 = segX1 + startPad;
    const laneX2 = segX2 - endPad;

    const lanePaths: RoadSegment['lanePaths'] = [];
    if (lanes === 4) {
      lanePaths.push({
        laneId: `${segmentId}_w0`,
        laneIndex: 0,
        direction: Math.PI,
        waypoints: [{ x: laneX2, y: RING_MAX - laneWidth * 1.5 }, { x: laneX1, y: RING_MAX - laneWidth * 1.5 }]
      });
      lanePaths.push({
        laneId: `${segmentId}_w1`,
        laneIndex: 1,
        direction: Math.PI,
        waypoints: [{ x: laneX2, y: RING_MAX - laneWidth * 0.5 }, { x: laneX1, y: RING_MAX - laneWidth * 0.5 }]
      });
      lanePaths.push({
        laneId: `${segmentId}_e1`,
        laneIndex: 2,
        direction: 0,
        waypoints: [{ x: laneX1, y: RING_MAX + laneWidth * 0.5 }, { x: laneX2, y: RING_MAX + laneWidth * 0.5 }]
      });
      lanePaths.push({
        laneId: `${segmentId}_e0`,
        laneIndex: 3,
        direction: 0,
        waypoints: [{ x: laneX1, y: RING_MAX + laneWidth * 1.5 }, { x: laneX2, y: RING_MAX + laneWidth * 1.5 }]
      });
    } else {
      lanePaths.push({
        laneId: `${segmentId}_w0`,
        laneIndex: 0,
        direction: Math.PI,
        waypoints: [{ x: laneX2, y: RING_MAX - laneWidth * 0.5 }, { x: laneX1, y: RING_MAX - laneWidth * 0.5 }]
      });
      lanePaths.push({
        laneId: `${segmentId}_e0`,
        laneIndex: 1,
        direction: 0,
        waypoints: [{ x: laneX1, y: RING_MAX + laneWidth * 0.5 }, { x: laneX2, y: RING_MAX + laneWidth * 0.5 }]
      });
    }

    roads.push({
      id: segmentId,
      x1: segX1,
      y1: RING_MAX,
      x2: segX2,
      y2: RING_MAX,
      lanes,
      width: roadWidth,
      isAvenue,
      isDirt: false,
      isGravel,
      direction: 'horizontal',
      name: isGravel ? 'Южная дачная объездная дорога' : 'Юго-Западное объездное шоссе',
      lanePaths
    });
  }

  // --- 1.3 WEST RING ROAD (x = RING_MIN) ---
  for (let i = 0; i < yPoints.length - 1; i++) {
    const segY1 = yPoints[i];
    const segY2 = yPoints[i + 1];
    const segmentId = `road_ring_w_${i}`;

    const isDirt = i < 2; // Forest sector
    const isAvenue = i === 2 || i === 4; // Connects to Grand Blvd & Central Ave
    const lanes = isAvenue ? 4 : 2;
    const roadWidth = isAvenue ? 144 : (isDirt ? 64 : 84);
    const laneWidth = roadWidth / lanes;

    const startPad = i === 0 ? 42 : (i - 1 === 2 || i - 1 === 4 ? 72 : 42);
    const endPad = i === yPoints.length - 2 ? 42 : (i === 2 || i === 4 ? 72 : 42);
    const laneY1 = segY1 + startPad;
    const laneY2 = segY2 - endPad;

    const lanePaths: RoadSegment['lanePaths'] = [];
    if (lanes === 4) {
      lanePaths.push({
        laneId: `${segmentId}_s0`,
        laneIndex: 0,
        direction: Math.PI / 2,
        waypoints: [{ x: RING_MIN - laneWidth * 1.5, y: laneY1 }, { x: RING_MIN - laneWidth * 1.5, y: laneY2 }]
      });
      lanePaths.push({
        laneId: `${segmentId}_s1`,
        laneIndex: 1,
        direction: Math.PI / 2,
        waypoints: [{ x: RING_MIN - laneWidth * 0.5, y: laneY1 }, { x: RING_MIN - laneWidth * 0.5, y: laneY2 }]
      });
      lanePaths.push({
        laneId: `${segmentId}_n1`,
        laneIndex: 2,
        direction: -Math.PI / 2,
        waypoints: [{ x: RING_MIN + laneWidth * 0.5, y: laneY2 }, { x: RING_MIN + laneWidth * 0.5, y: laneY1 }]
      });
      lanePaths.push({
        laneId: `${segmentId}_n0`,
        laneIndex: 3,
        direction: -Math.PI / 2,
        waypoints: [{ x: RING_MIN + laneWidth * 1.5, y: laneY2 }, { x: RING_MIN + laneWidth * 1.5, y: laneY1 }]
      });
    } else {
      lanePaths.push({
        laneId: `${segmentId}_s0`,
        laneIndex: 0,
        direction: Math.PI / 2,
        waypoints: [{ x: RING_MIN - laneWidth * 0.5, y: laneY1 }, { x: RING_MIN - laneWidth * 0.5, y: laneY2 }]
      });
      lanePaths.push({
        laneId: `${segmentId}_n0`,
        laneIndex: 1,
        direction: -Math.PI / 2,
        waypoints: [{ x: RING_MIN + laneWidth * 0.5, y: laneY2 }, { x: RING_MIN + laneWidth * 0.5, y: laneY1 }]
      });
    }

    roads.push({
      id: segmentId,
      x1: RING_MIN,
      y1: segY1,
      x2: RING_MIN,
      y2: segY2,
      lanes,
      width: roadWidth,
      isAvenue,
      isDirt,
      isGravel: false,
      direction: 'vertical',
      name: isDirt ? 'Западный лесной тракт' : 'Западное объездное шоссе',
      lanePaths
    });
  }

  // --- 1.4 EAST RING ROAD (x = RING_MAX) ---
  for (let i = 0; i < yPoints.length - 1; i++) {
    const segY1 = yPoints[i];
    const segY2 = yPoints[i + 1];
    const segmentId = `road_ring_e_${i}`;

    const isGravel = i >= 5; // Cottage village sector
    const isAvenue = i === 2 || i === 4;
    const lanes = isAvenue ? 4 : 2;
    const roadWidth = isAvenue ? 144 : (isGravel ? 64 : 84);
    const laneWidth = roadWidth / lanes;

    const startPad = i === 0 ? 42 : (i - 1 === 2 || i - 1 === 4 ? 72 : 42);
    const endPad = i === yPoints.length - 2 ? 42 : (i === 2 || i === 4 ? 72 : 42);
    const laneY1 = segY1 + startPad;
    const laneY2 = segY2 - endPad;

    const lanePaths: RoadSegment['lanePaths'] = [];
    if (lanes === 4) {
      lanePaths.push({
        laneId: `${segmentId}_s0`,
        laneIndex: 0,
        direction: Math.PI / 2,
        waypoints: [{ x: RING_MAX - laneWidth * 1.5, y: laneY1 }, { x: RING_MAX - laneWidth * 1.5, y: laneY2 }]
      });
      lanePaths.push({
        laneId: `${segmentId}_s1`,
        laneIndex: 1,
        direction: Math.PI / 2,
        waypoints: [{ x: RING_MAX - laneWidth * 0.5, y: laneY1 }, { x: RING_MAX - laneWidth * 0.5, y: laneY2 }]
      });
      lanePaths.push({
        laneId: `${segmentId}_n1`,
        laneIndex: 2,
        direction: -Math.PI / 2,
        waypoints: [{ x: RING_MAX + laneWidth * 0.5, y: laneY2 }, { x: RING_MAX + laneWidth * 0.5, y: laneY1 }]
      });
      lanePaths.push({
        laneId: `${segmentId}_n0`,
        laneIndex: 3,
        direction: -Math.PI / 2,
        waypoints: [{ x: RING_MAX + laneWidth * 1.5, y: laneY2 }, { x: RING_MAX + laneWidth * 1.5, y: laneY1 }]
      });
    } else {
      lanePaths.push({
        laneId: `${segmentId}_s0`,
        laneIndex: 0,
        direction: Math.PI / 2,
        waypoints: [{ x: RING_MAX - laneWidth * 0.5, y: laneY1 }, { x: RING_MAX - laneWidth * 0.5, y: laneY2 }]
      });
      lanePaths.push({
        laneId: `${segmentId}_n0`,
        laneIndex: 1,
        direction: -Math.PI / 2,
        waypoints: [{ x: RING_MAX + laneWidth * 0.5, y: laneY2 }, { x: RING_MAX + laneWidth * 0.5, y: laneY1 }]
      });
    }

    roads.push({
      id: segmentId,
      x1: RING_MAX,
      y1: segY1,
      x2: RING_MAX,
      y2: segY2,
      lanes,
      width: roadWidth,
      isAvenue,
      isDirt: false,
      isGravel,
      direction: 'vertical',
      name: isGravel ? 'Восточный дачный тракт' : 'Восточная промышленная объездная дорога',
      lanePaths
    });
  }

  // =========================================================================
  // 2. GENERATE PERIMETER INTERSECTIONS (Controlled & Uncontrolled Junctions)
  // =========================================================================

  // Standard traffic light phases for regulated T-junctions
  const tPhases = [
    { nsState: 'green', ewState: 'red', duration: 7.0 },
    { nsState: 'green_flashing', ewState: 'red', duration: 3.0 },
    { nsState: 'yellow', ewState: 'red', duration: 2.5 },
    { nsState: 'red', ewState: 'red_yellow', duration: 1.5 },
    { nsState: 'red', ewState: 'green', duration: 8.0 },
    { nsState: 'red', ewState: 'green_flashing', duration: 3.0 },
    { nsState: 'red', ewState: 'yellow', duration: 2.5 },
    { nsState: 'red_yellow', ewState: 'red', duration: 1.5 }
  ] as const;

  // --- 2.1 4 CORNERS ---
  // NW Corner (38, 38) - Dirt Forest Corner
  intersections.push({
    id: 'inter_ring_nw',
    x: RING_MIN,
    y: RING_MIN,
    width: 84,
    height: 84,
    type: '4way',
    hasLights: false,
    currentPhaseIndex: 0,
    phaseTimer: 0,
    phases: [...tPhases],
    stopLines: [],
    crosswalks: [],
    isDirt: true
  });

  // NE Corner (7962, 38) - Northeast Asphalt Corner
  intersections.push({
    id: 'inter_ring_ne',
    x: RING_MAX,
    y: RING_MIN,
    width: 84,
    height: 84,
    type: '4way',
    hasLights: false,
    currentPhaseIndex: 0,
    phaseTimer: 0,
    phases: [...tPhases],
    stopLines: [],
    crosswalks: [],
    isDirt: false
  });

  // SW Corner (38, 7962) - Southwest Asphalt Corner
  intersections.push({
    id: 'inter_ring_sw',
    x: RING_MIN,
    y: RING_MAX,
    width: 84,
    height: 84,
    type: '4way',
    hasLights: false,
    currentPhaseIndex: 0,
    phaseTimer: 0,
    phases: [...tPhases],
    stopLines: [],
    crosswalks: [],
    isDirt: false
  });

  // SE Corner (7962, 7962) - Southeast Gravel Corner
  intersections.push({
    id: 'inter_ring_se',
    x: RING_MAX,
    y: RING_MAX,
    width: 84,
    height: 84,
    type: '4way',
    hasLights: false,
    currentPhaseIndex: 0,
    phaseTimer: 0,
    phases: [...tPhases],
    stopLines: [],
    crosswalks: [],
    isGravel: true
  });

  // --- 2.2 NORTH T-JUNCTIONS (y = RING_MIN) ---
  for (let c = 0; c < vertRoadXs.length; c++) {
    const cx = vertRoadXs[c];
    const isAvenueV = c === 4 || c === 6;
    const hasLights = isAvenueV; // Regulated with traffic lights on Silicon Highway & Metro Ave!
    const isDirt = c < 4;
    const width = getRoadWidth(isAvenueV);
    const height = isAvenueV ? 144 : (isDirt ? 64 : 84);
    const halfW = width / 2;
    const halfH = height / 2;
    const interId = `inter_ring_n_${c}`;

    const stopLines: Intersection['stopLines'] = hasLights ? [
      { direction: 'east', x1: cx + halfW + 30, y1: RING_MIN - halfH, x2: cx + halfW + 30, y2: RING_MIN, lightState: 'red' },
      { direction: 'west', x1: cx - halfW - 30, y1: RING_MIN, x2: cx - halfW - 30, y2: RING_MIN + halfH, lightState: 'red' },
      { direction: 'south', x1: cx, y1: RING_MIN + halfH + 30, x2: cx + halfW, y2: RING_MIN + halfH + 30, lightState: 'green' }
    ] : [];

    const crosswalks: Intersection['crosswalks'] = hasLights ? [
      { id: `cw_${interId}_w`, direction: 'west', x: cx - halfW - 22, y: RING_MIN - halfH, width: 22, height, pedestrianSignal: 'walk' },
      { id: `cw_${interId}_e`, direction: 'east', x: cx + halfW, y: RING_MIN - halfH, width: 22, height, pedestrianSignal: 'walk' },
      { id: `cw_${interId}_s`, direction: 'south', x: cx - halfW, y: RING_MIN + halfH, width, height: 22, pedestrianSignal: 'wait' }
    ] : [];

    intersections.push({
      id: interId,
      x: cx,
      y: RING_MIN,
      width,
      height,
      type: '3way_T_north',
      hasLights,
      currentPhaseIndex: c % 4,
      phaseTimer: Math.random() * 3,
      phases: [...tPhases],
      stopLines,
      crosswalks,
      isDirt
    });

    if (hasLights) {
      props.push(
        { id: `traffic_light_${interId}_east`, x: cx + halfW + 18, y: RING_MIN - halfH - 18, type: 'traffic_light', angle: 0, intersectionId: interId, direction: 'east' },
        { id: `traffic_light_${interId}_west`, x: cx - halfW - 18, y: RING_MIN + halfH + 18, type: 'traffic_light', angle: Math.PI, intersectionId: interId, direction: 'west' },
        { id: `traffic_light_${interId}_south`, x: cx + halfW + 18, y: RING_MIN + halfH + 18, type: 'traffic_light', angle: Math.PI / 2, intersectionId: interId, direction: 'south' }
      );
    }
  }

  // --- 2.3 SOUTH T-JUNCTIONS (y = RING_MAX) ---
  for (let c = 0; c < vertRoadXs.length; c++) {
    const cx = vertRoadXs[c];
    const isAvenueV = c === 4 || c === 6;
    const hasLights = isAvenueV;
    const isGravel = c >= 5;
    const width = getRoadWidth(isAvenueV);
    const height = isAvenueV ? 144 : (isGravel ? 64 : 84);
    const halfW = width / 2;
    const halfH = height / 2;
    const interId = `inter_ring_s_${c}`;

    const stopLines: Intersection['stopLines'] = hasLights ? [
      { direction: 'east', x1: cx + halfW + 30, y1: RING_MAX - halfH, x2: cx + halfW + 30, y2: RING_MAX, lightState: 'red' },
      { direction: 'west', x1: cx - halfW - 30, y1: RING_MAX, x2: cx - halfW - 30, y2: RING_MAX + halfH, lightState: 'red' },
      { direction: 'north', x1: cx - halfW, y1: RING_MAX - halfH - 30, x2: cx, y2: RING_MAX - halfH - 30, lightState: 'green' }
    ] : [];

    const crosswalks: Intersection['crosswalks'] = hasLights ? [
      { id: `cw_${interId}_w`, direction: 'west', x: cx - halfW - 22, y: RING_MAX - halfH, width: 22, height, pedestrianSignal: 'walk' },
      { id: `cw_${interId}_e`, direction: 'east', x: cx + halfW, y: RING_MAX - halfH, width: 22, height, pedestrianSignal: 'walk' },
      { id: `cw_${interId}_n`, direction: 'north', x: cx - halfW, y: RING_MAX - halfH - 22, width, height: 22, pedestrianSignal: 'wait' }
    ] : [];

    intersections.push({
      id: interId,
      x: cx,
      y: RING_MAX,
      width,
      height,
      type: '3way_T_south',
      hasLights,
      currentPhaseIndex: c % 4,
      phaseTimer: Math.random() * 3,
      phases: [...tPhases],
      stopLines,
      crosswalks,
      isGravel
    });

    if (hasLights) {
      props.push(
        { id: `traffic_light_${interId}_east`, x: cx + halfW + 18, y: RING_MAX - halfH - 18, type: 'traffic_light', angle: 0, intersectionId: interId, direction: 'east' },
        { id: `traffic_light_${interId}_west`, x: cx - halfW - 18, y: RING_MAX + halfH + 18, type: 'traffic_light', angle: Math.PI, intersectionId: interId, direction: 'west' },
        { id: `traffic_light_${interId}_north`, x: cx - halfW - 18, y: RING_MAX - halfH - 18, type: 'traffic_light', angle: -Math.PI / 2, intersectionId: interId, direction: 'north' }
      );
    }
  }

  // --- 2.4 WEST T-JUNCTIONS (x = RING_MIN) ---
  for (let r = 0; r < horizRoadYs.length; r++) {
    const cy = horizRoadYs[r];
    const isAvenueH = r === 2 || r === 4;
    const hasLights = isAvenueH; // Regulated on Grand Blvd & Central Ave!
    const isDirt = r < 2;
    const width = isAvenueH ? 144 : (isDirt ? 64 : 84);
    const height = getRoadWidth(isAvenueH);
    const halfW = width / 2;
    const halfH = height / 2;
    const interId = `inter_ring_w_${r}`;

    const stopLines: Intersection['stopLines'] = hasLights ? [
      { direction: 'north', x1: RING_MIN - halfW, y1: cy - halfH - 30, x2: RING_MIN, y2: cy - halfH - 30, lightState: 'green' },
      { direction: 'south', x1: RING_MIN, y1: cy + halfH + 30, x2: RING_MIN + halfW, y2: cy + halfH + 30, lightState: 'green' },
      { direction: 'east', x1: RING_MIN + halfW + 30, y1: cy - halfH, x2: RING_MIN + halfW + 30, y2: cy, lightState: 'red' }
    ] : [];

    const crosswalks: Intersection['crosswalks'] = hasLights ? [
      { id: `cw_${interId}_n`, direction: 'north', x: RING_MIN - halfW, y: cy - halfH - 22, width, height: 22, pedestrianSignal: 'wait' },
      { id: `cw_${interId}_s`, direction: 'south', x: RING_MIN - halfW, y: cy + halfH, width, height: 22, pedestrianSignal: 'wait' },
      { id: `cw_${interId}_e`, direction: 'east', x: RING_MIN + halfW, y: cy - halfH, width: 22, height, pedestrianSignal: 'walk' }
    ] : [];

    intersections.push({
      id: interId,
      x: RING_MIN,
      y: cy,
      width,
      height,
      type: '3way_T_west',
      hasLights,
      currentPhaseIndex: r % 4,
      phaseTimer: Math.random() * 3,
      phases: [...tPhases],
      stopLines,
      crosswalks,
      isDirt
    });

    if (hasLights) {
      props.push(
        { id: `traffic_light_${interId}_north`, x: RING_MIN - halfW - 18, y: cy - halfH - 18, type: 'traffic_light', angle: -Math.PI / 2, intersectionId: interId, direction: 'north' },
        { id: `traffic_light_${interId}_south`, x: RING_MIN + halfW + 18, y: cy + halfH + 18, type: 'traffic_light', angle: Math.PI / 2, intersectionId: interId, direction: 'south' },
        { id: `traffic_light_${interId}_east`, x: RING_MIN + halfW + 18, y: cy - halfH - 18, type: 'traffic_light', angle: 0, intersectionId: interId, direction: 'east' }
      );
    }
  }

  // --- 2.5 EAST T-JUNCTIONS (x = RING_MAX) ---
  for (let r = 0; r < horizRoadYs.length; r++) {
    const cy = horizRoadYs[r];
    const isAvenueH = r === 2 || r === 4;
    const hasLights = isAvenueH;
    const isGravel = r >= 5;
    const width = isAvenueH ? 144 : (isGravel ? 64 : 84);
    const height = getRoadWidth(isAvenueH);
    const halfW = width / 2;
    const halfH = height / 2;
    const interId = `inter_ring_e_${r}`;

    const stopLines: Intersection['stopLines'] = hasLights ? [
      { direction: 'north', x1: RING_MAX - halfW, y1: cy - halfH - 30, x2: RING_MAX, y2: cy - halfH - 30, lightState: 'green' },
      { direction: 'south', x1: RING_MAX, y1: cy + halfH + 30, x2: RING_MAX + halfW, y2: cy + halfH + 30, lightState: 'green' },
      { direction: 'west', x1: RING_MAX - halfW - 30, y1: cy, x2: RING_MAX - halfW - 30, y2: cy + halfH, lightState: 'red' }
    ] : [];

    const crosswalks: Intersection['crosswalks'] = hasLights ? [
      { id: `cw_${interId}_n`, direction: 'north', x: RING_MAX - halfW, y: cy - halfH - 22, width, height: 22, pedestrianSignal: 'wait' },
      { id: `cw_${interId}_s`, direction: 'south', x: RING_MAX - halfW, y: cy + halfH, width, height: 22, pedestrianSignal: 'wait' },
      { id: `cw_${interId}_w`, direction: 'west', x: RING_MAX - halfW - 22, y: cy - halfH, width: 22, height, pedestrianSignal: 'walk' }
    ] : [];

    intersections.push({
      id: interId,
      x: RING_MAX,
      y: cy,
      width,
      height,
      type: '3way_T_east',
      hasLights,
      currentPhaseIndex: r % 4,
      phaseTimer: Math.random() * 3,
      phases: [...tPhases],
      stopLines,
      crosswalks,
      isGravel
    });

    if (hasLights) {
      props.push(
        { id: `traffic_light_${interId}_north`, x: RING_MAX - halfW - 18, y: cy - halfH - 18, type: 'traffic_light', angle: -Math.PI / 2, intersectionId: interId, direction: 'north' },
        { id: `traffic_light_${interId}_south`, x: RING_MAX + halfW + 18, y: cy + halfH + 18, type: 'traffic_light', angle: Math.PI / 2, intersectionId: interId, direction: 'south' },
        { id: `traffic_light_${interId}_west`, x: RING_MAX - halfW - 18, y: cy + halfH + 18, type: 'traffic_light', angle: Math.PI, intersectionId: interId, direction: 'west' }
      );
    }
  }

  // =========================================================================
  // 3. BUILD SEAMLESS LANE CONNECTIONS ACROSS RING & DEAD-END JUNCTIONS
  // =========================================================================

  // --- 3.1 NORTH RING CONNECTIONS ---
  for (let c = 0; c < vertRoadXs.length; c++) {
    const interId = `inter_ring_n_${c}`;
    const cx = vertRoadXs[c];
    const cy = RING_MIN;
    const westRoad = roads.find((r) => r.id === `road_ring_n_${c}`);
    const eastRoad = roads.find((r) => r.id === `road_ring_n_${c + 1}`);
    const southRoad = roads.find((r) => r.id === `road_v_${c}_0`);

    // Through movements & Turns from West Road (Eastbound lanes, direction 0)
    if (westRoad) {
      westRoad.lanePaths.filter((lp) => lp.direction === 0).forEach((inLane) => {
        inLane.connections = inLane.connections || [];
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];

        // Straight East
        if (eastRoad) {
          const outLane = eastRoad.lanePaths.find((lp) => lp.direction === 0 && lp.laneIndex === inLane.laneIndex) ||
                          eastRoad.lanePaths.find((lp) => lp.direction === 0);
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'straight',
              pathWaypoints: [pStart, { x: (pStart.x + pEnd.x) / 2, y: pStart.y }, pEnd],
              intersectionId: interId,
              stopLineDirection: 'west'
            });
          }
        }

        // Right turn South into vertical city avenue
        if (southRoad) {
          const outLane = southRoad.lanePaths.find((lp) => lp.direction === Math.PI / 2 && (lp.laneIndex === 0 || lp.laneIndex === 2)) ||
                          southRoad.lanePaths.find((lp) => lp.direction === Math.PI / 2);
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            const curve = generateBezierCurve(pStart, { x: pStart.x + 35, y: pStart.y }, { x: pEnd.x, y: pEnd.y - 35 }, pEnd, 6);
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'right',
              pathWaypoints: curve,
              intersectionId: interId,
              stopLineDirection: 'west'
            });
          }
        }
      });
    }

    // Through movements & Turns from East Road (Westbound lanes, direction PI)
    if (eastRoad) {
      eastRoad.lanePaths.filter((lp) => lp.direction === Math.PI).forEach((inLane) => {
        inLane.connections = inLane.connections || [];
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];

        // Straight West
        if (westRoad) {
          const outLane = westRoad.lanePaths.find((lp) => lp.direction === Math.PI && lp.laneIndex === inLane.laneIndex) ||
                          westRoad.lanePaths.find((lp) => lp.direction === Math.PI);
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'straight',
              pathWaypoints: [pStart, { x: (pStart.x + pEnd.x) / 2, y: pStart.y }, pEnd],
              intersectionId: interId,
              stopLineDirection: 'east'
            });
          }
        }

        // Left turn South into vertical city avenue
        if (southRoad) {
          const outLane = southRoad.lanePaths.find((lp) => lp.direction === Math.PI / 2 && (lp.laneIndex === 0 || lp.laneIndex === 2)) ||
                          southRoad.lanePaths.find((lp) => lp.direction === Math.PI / 2);
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            const curve = generateBezierCurve(pStart, { x: cx - 15, y: pStart.y }, { x: pEnd.x, y: cy + 15 }, pEnd, 6);
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'left',
              pathWaypoints: curve,
              intersectionId: interId,
              stopLineDirection: 'east'
            });
          }
        }
      });
    }

    // Turns from South Road coming from city (Northbound lanes, direction -PI/2)
    if (southRoad) {
      southRoad.lanePaths.filter((lp) => lp.direction === -Math.PI / 2).forEach((inLane) => {
        inLane.connections = inLane.connections || [];
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];

        // Turn Left West onto North Ring
        if (westRoad) {
          const outLane = westRoad.lanePaths.find((lp) => lp.direction === Math.PI && (lp.laneIndex === 0 || lp.laneIndex === 1)) ||
                          westRoad.lanePaths.find((lp) => lp.direction === Math.PI);
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            const curve = generateBezierCurve(pStart, { x: pStart.x, y: cy + 15 }, { x: cx - 15, y: pEnd.y }, pEnd, 6);
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'left',
              pathWaypoints: curve,
              intersectionId: interId,
              stopLineDirection: 'south'
            });
          }
        }

        // Turn Right East onto North Ring
        if (eastRoad) {
          const outLane = eastRoad.lanePaths.find((lp) => lp.direction === 0 && (lp.laneIndex === 0 || lp.laneIndex === 3)) ||
                          eastRoad.lanePaths.find((lp) => lp.direction === 0);
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            const curve = generateBezierCurve(pStart, { x: pStart.x, y: pStart.y - 35 }, { x: pEnd.x - 35, y: pEnd.y }, pEnd, 6);
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'right',
              pathWaypoints: curve,
              intersectionId: interId,
              stopLineDirection: 'south'
            });
          }
        }
      });
    }
  }

  // --- 3.2 SOUTH RING CONNECTIONS ---
  for (let c = 0; c < vertRoadXs.length; c++) {
    const interId = `inter_ring_s_${c}`;
    const cx = vertRoadXs[c];
    const cy = RING_MAX;
    const westRoad = roads.find((r) => r.id === `road_ring_s_${c}`);
    const eastRoad = roads.find((r) => r.id === `road_ring_s_${c + 1}`);
    const northRoad = roads.find((r) => r.id === `road_v_${c}_9`);

    // From West (Eastbound)
    if (westRoad) {
      westRoad.lanePaths.filter((lp) => lp.direction === 0).forEach((inLane) => {
        inLane.connections = inLane.connections || [];
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];

        // Straight East
        if (eastRoad) {
          const outLane = eastRoad.lanePaths.find((lp) => lp.direction === 0 && lp.laneIndex === inLane.laneIndex) ||
                          eastRoad.lanePaths.find((lp) => lp.direction === 0);
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'straight',
              pathWaypoints: [pStart, { x: (pStart.x + pEnd.x) / 2, y: pStart.y }, pEnd],
              intersectionId: interId,
              stopLineDirection: 'west'
            });
          }
        }

        // Left turn North into city
        if (northRoad) {
          const outLane = northRoad.lanePaths.find((lp) => lp.direction === -Math.PI / 2) || northRoad.lanePaths[0];
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            const curve = generateBezierCurve(pStart, { x: cx + 15, y: pStart.y }, { x: pEnd.x, y: cy - 15 }, pEnd, 6);
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'left',
              pathWaypoints: curve,
              intersectionId: interId,
              stopLineDirection: 'west'
            });
          }
        }
      });
    }

    // From East (Westbound)
    if (eastRoad) {
      eastRoad.lanePaths.filter((lp) => lp.direction === Math.PI).forEach((inLane) => {
        inLane.connections = inLane.connections || [];
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];

        // Straight West
        if (westRoad) {
          const outLane = westRoad.lanePaths.find((lp) => lp.direction === Math.PI && lp.laneIndex === inLane.laneIndex) ||
                          westRoad.lanePaths.find((lp) => lp.direction === Math.PI);
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'straight',
              pathWaypoints: [pStart, { x: (pStart.x + pEnd.x) / 2, y: pStart.y }, pEnd],
              intersectionId: interId,
              stopLineDirection: 'east'
            });
          }
        }

        // Right turn North into city
        if (northRoad) {
          const outLane = northRoad.lanePaths.find((lp) => lp.direction === -Math.PI / 2) || northRoad.lanePaths[0];
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            const curve = generateBezierCurve(pStart, { x: pStart.x - 35, y: pStart.y }, { x: pEnd.x, y: pEnd.y + 35 }, pEnd, 6);
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'right',
              pathWaypoints: curve,
              intersectionId: interId,
              stopLineDirection: 'east'
            });
          }
        }
      });
    }

    // From North Road coming from city (Southbound lanes, direction PI/2)
    if (northRoad) {
      northRoad.lanePaths.filter((lp) => lp.direction === Math.PI / 2).forEach((inLane) => {
        inLane.connections = inLane.connections || [];
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];

        // Turn Right West
        if (westRoad) {
          const outLane = westRoad.lanePaths.find((lp) => lp.direction === Math.PI) || westRoad.lanePaths[0];
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            const curve = generateBezierCurve(pStart, { x: pStart.x, y: pStart.y + 35 }, { x: pEnd.x + 35, y: pEnd.y }, pEnd, 6);
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'right',
              pathWaypoints: curve,
              intersectionId: interId,
              stopLineDirection: 'north'
            });
          }
        }

        // Turn Left East
        if (eastRoad) {
          const outLane = eastRoad.lanePaths.find((lp) => lp.direction === 0) || eastRoad.lanePaths[0];
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            const curve = generateBezierCurve(pStart, { x: pStart.x, y: cy - 15 }, { x: cx + 15, y: pEnd.y }, pEnd, 6);
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'left',
              pathWaypoints: curve,
              intersectionId: interId,
              stopLineDirection: 'north'
            });
          }
        }
      });
    }
  }

  // --- 3.3 WEST RING CONNECTIONS ---
  for (let r = 0; r < horizRoadYs.length; r++) {
    const interId = `inter_ring_w_${r}`;
    const cx = RING_MIN;
    const cy = horizRoadYs[r];
    const northRoad = roads.find((rd) => rd.id === `road_ring_w_${r}`);
    const southRoad = roads.find((rd) => rd.id === `road_ring_w_${r + 1}`);
    const eastRoad = roads.find((rd) => rd.id === `road_h_${r}_0`);

    // From North (Southbound)
    if (northRoad) {
      northRoad.lanePaths.filter((lp) => lp.direction === Math.PI / 2).forEach((inLane) => {
        inLane.connections = inLane.connections || [];
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];

        // Straight South
        if (southRoad) {
          const outLane = southRoad.lanePaths.find((lp) => lp.direction === Math.PI / 2 && lp.laneIndex === inLane.laneIndex) ||
                          southRoad.lanePaths.find((lp) => lp.direction === Math.PI / 2);
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'straight',
              pathWaypoints: [pStart, { x: pStart.x, y: (pStart.y + pEnd.y) / 2 }, pEnd],
              intersectionId: interId,
              stopLineDirection: 'north'
            });
          }
        }

        // Left turn East into city
        if (eastRoad) {
          const outLane = eastRoad.lanePaths.find((lp) => lp.direction === 0) || eastRoad.lanePaths[0];
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            const curve = generateBezierCurve(pStart, { x: pStart.x, y: cy - 15 }, { x: cx + 15, y: pEnd.y }, pEnd, 6);
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'left',
              pathWaypoints: curve,
              intersectionId: interId,
              stopLineDirection: 'north'
            });
          }
        }
      });
    }

    // From South (Northbound)
    if (southRoad) {
      southRoad.lanePaths.filter((lp) => lp.direction === -Math.PI / 2).forEach((inLane) => {
        inLane.connections = inLane.connections || [];
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];

        // Straight North
        if (northRoad) {
          const outLane = northRoad.lanePaths.find((lp) => lp.direction === -Math.PI / 2 && lp.laneIndex === inLane.laneIndex) ||
                          northRoad.lanePaths.find((lp) => lp.direction === -Math.PI / 2);
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'straight',
              pathWaypoints: [pStart, { x: pStart.x, y: (pStart.y + pEnd.y) / 2 }, pEnd],
              intersectionId: interId,
              stopLineDirection: 'south'
            });
          }
        }

        // Right turn East into city
        if (eastRoad) {
          const outLane = eastRoad.lanePaths.find((lp) => lp.direction === 0) || eastRoad.lanePaths[0];
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            const curve = generateBezierCurve(pStart, { x: pStart.x, y: pStart.y - 35 }, { x: pEnd.x - 35, y: pEnd.y }, pEnd, 6);
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'right',
              pathWaypoints: curve,
              intersectionId: interId,
              stopLineDirection: 'south'
            });
          }
        }
      });
    }

    // From City Horizontal Road (Westbound, direction PI)
    if (eastRoad) {
      eastRoad.lanePaths.filter((lp) => lp.direction === Math.PI).forEach((inLane) => {
        inLane.connections = inLane.connections || [];
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];

        // Turn Right North
        if (northRoad) {
          const outLane = northRoad.lanePaths.find((lp) => lp.direction === -Math.PI / 2) || northRoad.lanePaths[0];
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            const curve = generateBezierCurve(pStart, { x: pStart.x - 35, y: pStart.y }, { x: pEnd.x, y: pEnd.y + 35 }, pEnd, 6);
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'right',
              pathWaypoints: curve,
              intersectionId: interId,
              stopLineDirection: 'east'
            });
          }
        }

        // Turn Left South
        if (southRoad) {
          const outLane = southRoad.lanePaths.find((lp) => lp.direction === Math.PI / 2) || southRoad.lanePaths[0];
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            const curve = generateBezierCurve(pStart, { x: cx + 15, y: pStart.y }, { x: pEnd.x, y: cy + 15 }, pEnd, 6);
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'left',
              pathWaypoints: curve,
              intersectionId: interId,
              stopLineDirection: 'east'
            });
          }
        }
      });
    }
  }

  // --- 3.4 EAST RING CONNECTIONS ---
  for (let r = 0; r < horizRoadYs.length; r++) {
    const interId = `inter_ring_e_${r}`;
    const cx = RING_MAX;
    const cy = horizRoadYs[r];
    const northRoad = roads.find((rd) => rd.id === `road_ring_e_${r}`);
    const southRoad = roads.find((rd) => rd.id === `road_ring_e_${r + 1}`);
    const westRoad = roads.find((rd) => rd.id === `road_h_${r}_9`);

    // From North (Southbound)
    if (northRoad) {
      northRoad.lanePaths.filter((lp) => lp.direction === Math.PI / 2).forEach((inLane) => {
        inLane.connections = inLane.connections || [];
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];

        // Straight South
        if (southRoad) {
          const outLane = southRoad.lanePaths.find((lp) => lp.direction === Math.PI / 2 && lp.laneIndex === inLane.laneIndex) ||
                          southRoad.lanePaths.find((lp) => lp.direction === Math.PI / 2);
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'straight',
              pathWaypoints: [pStart, { x: pStart.x, y: (pStart.y + pEnd.y) / 2 }, pEnd],
              intersectionId: interId,
              stopLineDirection: 'north'
            });
          }
        }

        // Right turn West into city
        if (westRoad) {
          const outLane = westRoad.lanePaths.find((lp) => lp.direction === Math.PI) || westRoad.lanePaths[0];
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            const curve = generateBezierCurve(pStart, { x: pStart.x, y: pStart.y + 35 }, { x: pEnd.x + 35, y: pEnd.y }, pEnd, 6);
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'right',
              pathWaypoints: curve,
              intersectionId: interId,
              stopLineDirection: 'north'
            });
          }
        }
      });
    }

    // From South (Northbound)
    if (southRoad) {
      southRoad.lanePaths.filter((lp) => lp.direction === -Math.PI / 2).forEach((inLane) => {
        inLane.connections = inLane.connections || [];
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];

        // Straight North
        if (northRoad) {
          const outLane = northRoad.lanePaths.find((lp) => lp.direction === -Math.PI / 2 && lp.laneIndex === inLane.laneIndex) ||
                          northRoad.lanePaths.find((lp) => lp.direction === -Math.PI / 2);
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'straight',
              pathWaypoints: [pStart, { x: pStart.x, y: (pStart.y + pEnd.y) / 2 }, pEnd],
              intersectionId: interId,
              stopLineDirection: 'south'
            });
          }
        }

        // Left turn West into city
        if (westRoad) {
          const outLane = westRoad.lanePaths.find((lp) => lp.direction === Math.PI) || westRoad.lanePaths[0];
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            const curve = generateBezierCurve(pStart, { x: pStart.x, y: cy + 15 }, { x: cx - 15, y: pEnd.y }, pEnd, 6);
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'left',
              pathWaypoints: curve,
              intersectionId: interId,
              stopLineDirection: 'south'
            });
          }
        }
      });
    }

    // From City Horizontal Road (Eastbound, direction 0)
    if (westRoad) {
      westRoad.lanePaths.filter((lp) => lp.direction === 0).forEach((inLane) => {
        inLane.connections = inLane.connections || [];
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];

        // Turn Left North
        if (northRoad) {
          const outLane = northRoad.lanePaths.find((lp) => lp.direction === -Math.PI / 2) || northRoad.lanePaths[0];
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            const curve = generateBezierCurve(pStart, { x: cx - 15, y: pStart.y }, { x: pEnd.x, y: cy - 15 }, pEnd, 6);
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'left',
              pathWaypoints: curve,
              intersectionId: interId,
              stopLineDirection: 'west'
            });
          }
        }

        // Turn Right South
        if (southRoad) {
          const outLane = southRoad.lanePaths.find((lp) => lp.direction === Math.PI / 2) || southRoad.lanePaths[0];
          if (outLane) {
            const pEnd = outLane.waypoints[0];
            const curve = generateBezierCurve(pStart, { x: pStart.x + 35, y: pStart.y }, { x: pEnd.x, y: pEnd.y - 35 }, pEnd, 6);
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'right',
              pathWaypoints: curve,
              intersectionId: interId,
              stopLineDirection: 'west'
            });
          }
        }
      });
    }
  }

  // --- 3.5 4 CORNER CONTINUOUS LOOPS ---
  // NW Corner: North Ring WB (direction PI) -> West Ring SB (direction PI/2)
  //            West Ring NB (direction -PI/2) -> North Ring EB (direction 0)
  const nwRoadN = roads.find((r) => r.id === 'road_ring_n_0');
  const nwRoadW = roads.find((r) => r.id === 'road_ring_w_0');
  if (nwRoadN && nwRoadW) {
    nwRoadN.lanePaths.filter((lp) => lp.direction === Math.PI).forEach((inLane) => {
      const outLane = nwRoadW.lanePaths.find((lp) => lp.direction === Math.PI / 2);
      if (outLane) {
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];
        const pEnd = outLane.waypoints[0];
        const curve = generateBezierCurve(pStart, { x: pStart.x - 30, y: pStart.y }, { x: pEnd.x, y: pEnd.y - 30 }, pEnd, 6);
        inLane.connections = inLane.connections || [];
        inLane.connections.push({ targetLaneId: outLane.laneId, turnType: 'left', pathWaypoints: curve, intersectionId: 'inter_ring_nw' });
      }
    });
    nwRoadW.lanePaths.filter((lp) => lp.direction === -Math.PI / 2).forEach((inLane) => {
      const outLane = nwRoadN.lanePaths.find((lp) => lp.direction === 0);
      if (outLane) {
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];
        const pEnd = outLane.waypoints[0];
        const curve = generateBezierCurve(pStart, { x: pStart.x, y: pStart.y - 30 }, { x: pEnd.x - 30, y: pEnd.y }, pEnd, 6);
        inLane.connections = inLane.connections || [];
        inLane.connections.push({ targetLaneId: outLane.laneId, turnType: 'right', pathWaypoints: curve, intersectionId: 'inter_ring_nw' });
      }
    });
  }

  // NE Corner: North Ring EB (direction 0) -> East Ring SB (direction PI/2)
  //            East Ring NB (direction -PI/2) -> North Ring WB (direction PI)
  const neRoadN = roads.find((r) => r.id === `road_ring_n_${vertRoadXs.length}`);
  const neRoadE = roads.find((r) => r.id === 'road_ring_e_0');
  if (neRoadN && neRoadE) {
    neRoadN.lanePaths.filter((lp) => lp.direction === 0).forEach((inLane) => {
      const outLane = neRoadE.lanePaths.find((lp) => lp.direction === Math.PI / 2);
      if (outLane) {
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];
        const pEnd = outLane.waypoints[0];
        const curve = generateBezierCurve(pStart, { x: pStart.x + 30, y: pStart.y }, { x: pEnd.x, y: pEnd.y - 30 }, pEnd, 6);
        inLane.connections = inLane.connections || [];
        inLane.connections.push({ targetLaneId: outLane.laneId, turnType: 'right', pathWaypoints: curve, intersectionId: 'inter_ring_ne' });
      }
    });
    neRoadE.lanePaths.filter((lp) => lp.direction === -Math.PI / 2).forEach((inLane) => {
      const outLane = neRoadN.lanePaths.find((lp) => lp.direction === Math.PI);
      if (outLane) {
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];
        const pEnd = outLane.waypoints[0];
        const curve = generateBezierCurve(pStart, { x: pStart.x, y: pStart.y - 30 }, { x: pEnd.x + 30, y: pEnd.y }, pEnd, 6);
        inLane.connections = inLane.connections || [];
        inLane.connections.push({ targetLaneId: outLane.laneId, turnType: 'left', pathWaypoints: curve, intersectionId: 'inter_ring_ne' });
      }
    });
  }

  // SW Corner: West Ring SB (direction PI/2) -> South Ring EB (direction 0)
  //            South Ring WB (direction PI) -> West Ring NB (direction -PI/2)
  const swRoadW = roads.find((r) => r.id === `road_ring_w_${horizRoadYs.length}`);
  const swRoadS = roads.find((r) => r.id === 'road_ring_s_0');
  if (swRoadW && swRoadS) {
    swRoadW.lanePaths.filter((lp) => lp.direction === Math.PI / 2).forEach((inLane) => {
      const outLane = swRoadS.lanePaths.find((lp) => lp.direction === 0);
      if (outLane) {
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];
        const pEnd = outLane.waypoints[0];
        const curve = generateBezierCurve(pStart, { x: pStart.x, y: pStart.y + 30 }, { x: pEnd.x - 30, y: pEnd.y }, pEnd, 6);
        inLane.connections = inLane.connections || [];
        inLane.connections.push({ targetLaneId: outLane.laneId, turnType: 'left', pathWaypoints: curve, intersectionId: 'inter_ring_sw' });
      }
    });
    swRoadS.lanePaths.filter((lp) => lp.direction === Math.PI).forEach((inLane) => {
      const outLane = swRoadW.lanePaths.find((lp) => lp.direction === -Math.PI / 2);
      if (outLane) {
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];
        const pEnd = outLane.waypoints[0];
        const curve = generateBezierCurve(pStart, { x: pStart.x - 30, y: pStart.y }, { x: pEnd.x, y: pEnd.y + 30 }, pEnd, 6);
        inLane.connections = inLane.connections || [];
        inLane.connections.push({ targetLaneId: outLane.laneId, turnType: 'right', pathWaypoints: curve, intersectionId: 'inter_ring_sw' });
      }
    });
  }

  // SE Corner: East Ring SB (direction PI/2) -> South Ring WB (direction PI)
  //            South Ring EB (direction 0) -> East Ring NB (direction -PI/2)
  const seRoadE = roads.find((r) => r.id === `road_ring_e_${horizRoadYs.length}`);
  const seRoadS = roads.find((r) => r.id === `road_ring_s_${vertRoadXs.length}`);
  if (seRoadE && seRoadS) {
    seRoadE.lanePaths.filter((lp) => lp.direction === Math.PI / 2).forEach((inLane) => {
      const outLane = seRoadS.lanePaths.find((lp) => lp.direction === Math.PI);
      if (outLane) {
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];
        const pEnd = outLane.waypoints[0];
        const curve = generateBezierCurve(pStart, { x: pStart.x, y: pStart.y + 30 }, { x: pEnd.x + 30, y: pEnd.y }, pEnd, 6);
        inLane.connections = inLane.connections || [];
        inLane.connections.push({ targetLaneId: outLane.laneId, turnType: 'right', pathWaypoints: curve, intersectionId: 'inter_ring_se' });
      }
    });
    seRoadS.lanePaths.filter((lp) => lp.direction === 0).forEach((inLane) => {
      const outLane = seRoadE.lanePaths.find((lp) => lp.direction === -Math.PI / 2);
      if (outLane) {
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];
        const pEnd = outLane.waypoints[0];
        const curve = generateBezierCurve(pStart, { x: pStart.x + 30, y: pStart.y }, { x: pEnd.x, y: pEnd.y + 30 }, pEnd, 6);
        inLane.connections = inLane.connections || [];
        inLane.connections.push({ targetLaneId: outLane.laneId, turnType: 'left', pathWaypoints: curve, intersectionId: 'inter_ring_se' });
      }
    });
  }
}
