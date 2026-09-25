/**
 * Level Crossing Discovery & Intersection Management System
 * Automatically computes exact mathematical intersections between railway tracks and roads (including curved / Bezier roads).
 */

import { GameWorld, RoadSegment, RailwayTrackSegment } from './types';

export interface LevelCrossingTrackIntersection {
  trackId: string;
  trackName: string;
  x: number;
  y: number;
  angle: number;
}

export interface LevelCrossingInfo {
  id: string;
  name: string;
  centerX: number;
  centerY: number;
  roadId: string;
  roadName: string;
  roadWidth: number;
  roadAngle: number;
  tracks: LevelCrossingTrackIntersection[];
  tracksY: number[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  yMin: number;
  yMax: number;
  approachMinX: number;
  approachMaxX: number;
  barrierNorthY: number;
  barrierSouthY: number;
  signalNorthId: string;
  signalSouthId: string;
}

let cachedCrossings: LevelCrossingInfo[] | null = null;
let cachedWorldRef: GameWorld | null = null;

/**
 * Robust line-line intersection algorithm
 */
function lineLineIntersection(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): { x: number; y: number } | null {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 1e-6) return null;

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return {
      x: x1 + ua * (x2 - x1),
      y: y1 + ua * (y2 - y1)
    };
  }
  return null;
}

/**
 * Discovers and computes all level crossings between railway tracks and roads in the world.
 */
export function getLevelCrossings(world: GameWorld): LevelCrossingInfo[] {
  if (cachedCrossings && cachedWorldRef === world) {
    return cachedCrossings;
  }

  const roads = world.roads || [];
  const tracks = world.railwayTracks || [];
  const foundPoints: {
    x: number;
    y: number;
    road: RoadSegment;
    track: RailwayTrackSegment;
    angle: number;
  }[] = [];

  for (const road of roads) {
    const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
    if (road.curvePoints && road.curvePoints.length > 1) {
      for (let i = 0; i < road.curvePoints.length - 1; i++) {
        segments.push({
          x1: road.curvePoints[i].x,
          y1: road.curvePoints[i].y,
          x2: road.curvePoints[i + 1].x,
          y2: road.curvePoints[i + 1].y,
        });
      }
    } else {
      segments.push({ x1: road.x1, y1: road.y1, x2: road.x2, y2: road.y2 });
    }

    for (const seg of segments) {
      for (const track of tracks) {
        const pt = lineLineIntersection(
          seg.x1, seg.y1, seg.x2, seg.y2,
          track.x1, track.y1, track.x2, track.y2
        );

        if (pt) {
          const segAngle = Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);
          foundPoints.push({
            x: Math.round(pt.x),
            y: Math.round(pt.y),
            road,
            track,
            angle: segAngle
          });
        }
      }
    }
  }

  // Cluster crossings by proximity (within 350px)
  const clusters: LevelCrossingInfo[] = [];

  for (const pt of foundPoints) {
    let cluster = clusters.find(c => Math.hypot(c.centerX - pt.x, c.centerY - pt.y) < 350);
    if (!cluster) {
      let id = `crossing_${Math.round(pt.x)}_${Math.round(pt.y)}`;
      let name = `Железнодорожный переезд (${pt.road.name || 'Автодорога'})`;
      let sigNorthId = '';
      let sigSouthId = '';

      if (Math.abs(pt.x - 12600) < 400) {
        id = 'crossing_station_42';
        name = 'Степной переезд №42 (Станция Степная)';
        sigNorthId = 'sig_cross_north';
        sigSouthId = 'sig_cross_south';
      } else if (Math.abs(pt.x - 18321) < 500) {
        id = 'crossing_canyon_west';
        name = 'Степной переезд 18 км (Каньонное шоссе, Запад)';
        sigNorthId = 'sig_cross_canyon_w_n';
        sigSouthId = 'sig_cross_canyon_w_s';
      } else if (Math.abs(pt.x - 24149) < 500) {
        id = 'crossing_quarry';
        name = 'Переезд 24 км (Спуск в карьер)';
        sigNorthId = 'sig_cross_quarry_n';
        sigSouthId = 'sig_cross_quarry_s';
      } else if (Math.abs(pt.x - 29958) < 500) {
        id = 'crossing_canyon_east';
        name = 'Степной переезд 30 км (Каньонное шоссе, Восток)';
        sigNorthId = 'sig_cross_canyon_e_n';
        sigSouthId = 'sig_cross_canyon_e_s';
      } else if (Math.abs(pt.x - 47140) < 500) {
        id = 'crossing_dunes';
        name = 'Барханный переезд 47 км (Трасса «Золотые Пески»)';
        sigNorthId = 'sig_cross_dunes_n';
        sigSouthId = 'sig_cross_dunes_s';
      } else if (Math.abs(pt.x - 49802) < 500) {
        id = 'crossing_border';
        name = 'Переезд 50 км (Восточный рубеж / Погранзастава)';
        sigNorthId = 'sig_cross_border_n';
        sigSouthId = 'sig_cross_border_s';
      }

      cluster = {
        id,
        name,
        centerX: pt.x,
        centerY: pt.y,
        roadId: pt.road.id,
        roadName: pt.road.name,
        roadWidth: pt.road.width || 72,
        roadAngle: pt.angle,
        tracks: [],
        tracksY: [],
        minX: pt.x,
        maxX: pt.x,
        minY: pt.y,
        maxY: pt.y,
        yMin: pt.y,
        yMax: pt.y,
        approachMinX: pt.x - 1400,
        approachMaxX: pt.x + 1400,
        barrierNorthY: pt.y - 80,
        barrierSouthY: pt.y + 80,
        signalNorthId: sigNorthId,
        signalSouthId: sigSouthId,
      };
      clusters.push(cluster);
    }

    if (!cluster.tracksY.includes(pt.y)) {
      cluster.tracksY.push(pt.y);
      cluster.tracks.push({
        trackId: pt.track.id,
        trackName: pt.track.name,
        x: pt.x,
        y: pt.y,
        angle: pt.angle
      });
    }
  }

  for (const c of clusters) {
    c.tracksY.sort((a, b) => a - b);
    c.tracks.sort((a, b) => a.y - b.y);
    const minTrackY = Math.min(...c.tracksY);
    const maxTrackY = Math.max(...c.tracksY);
    const avgX = c.tracks.reduce((acc, t) => acc + t.x, 0) / Math.max(1, c.tracks.length);
    c.centerX = Math.round(avgX);
    c.centerY = Math.round((minTrackY + maxTrackY) / 2);
    c.minY = minTrackY - 110;
    c.maxY = maxTrackY + 110;
    c.yMin = c.minY;
    c.yMax = c.maxY;
    c.minX = c.centerX - 120;
    c.maxX = c.centerX + 120;
    c.barrierNorthY = minTrackY - 60;
    c.barrierSouthY = maxTrackY + 60;
    c.approachMinX = c.centerX - 1400;
    c.approachMaxX = c.centerX + 1400;
  }

  cachedCrossings = clusters;
  cachedWorldRef = world;
  return clusters;
}

/**
 * Checks if a given train car or consist occupies or approaches a level crossing across any tracks and directions.
 */
export function isCrossingApproachOccupied(crossing: LevelCrossingInfo, world: GameWorld): boolean {
  const rollingStock = world.rollingStock || [];
  if (rollingStock.length === 0 || !crossing.tracksY || crossing.tracksY.length === 0) return false;

  const minTrackY = Math.min(...crossing.tracksY) - 55;
  const maxTrackY = Math.max(...crossing.tracksY) + 55;

  for (const car of rollingStock) {
    // Check if car Y is within vertical span of the crossing tracks
    if (car.y >= minTrackY && car.y <= maxTrackY) {
      const halfLen = (car.length || 220) / 2;
      const carMinX = car.x - halfLen;
      const carMaxX = car.x + halfLen;

      // 1. Directly on or occupying the crossing deck (within +/- 35px of crossing road edges)
      if (carMaxX >= crossing.minX - 35 && carMinX <= crossing.maxX + 35) {
        return true;
      }

      // 2. Stationary or slow-moving train directly at crossing threshold (< 220px)
      if (carMaxX >= crossing.minX - 220 && carMinX <= crossing.maxX + 220) {
        return true;
      }

      // Compute physical velocity along X axis
      const rawSpeed = typeof car.speed === 'number' ? Math.abs(car.speed) : 0;
      const dir = car.direction !== undefined ? car.direction : (Math.cos(car.angle) >= 0 ? 1 : -1);
      const vx = dir * rawSpeed;

      // 3. Eastbound train approaching from the west (x < crossing.minX)
      if (carMaxX >= crossing.approachMinX && carMinX < crossing.minX) {
        if (vx > 5 || (car.x >= crossing.minX - 450 && rawSpeed >= 0.1)) {
          return true;
        }
      }

      // 4. Westbound train approaching from the east (x > crossing.maxX)
      if (carMinX <= crossing.approachMaxX && carMaxX > crossing.maxX) {
        if (vx < -5 || (car.x <= crossing.maxX + 450 && rawSpeed >= 0.1)) {
          return true;
        }
      }
    }
  }

  return false;
}
