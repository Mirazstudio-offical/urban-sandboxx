import type { GameWorld, Player } from '../types';
import { isVehicleInAccident } from '../navigation';
import { RIVER_WAYPOINTS } from '../riverSystem';
import { MAP_COLORS as C, MAP_FONT } from './mapTheme';
import type { LandmarkIconKey } from './landmarks';

/** World-space rectangle that is currently visible (used for culling). */
export interface View { minX: number; maxX: number; minY: number; maxY: number }

/** `px` below = size of one screen pixel in world units (1 / scale). */

const roadColor = (r: { isDirt?: boolean; isGravel?: boolean }) =>
  r.isDirt ? C.roadDirt : r.isGravel ? C.roadGravel : C.roadAsphalt;

function strokePath(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

export function drawRoads(ctx: CanvasRenderingContext2D, world: GameWorld, v: View, px: number, detail: boolean) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // pass 1: casing, pass 2: surface (keeps junctions clean)
  for (let pass = 0; pass < 2; pass++) {
    for (const r of world.roads) {
      if (r.isRoundabout) continue;
      const w = Math.max(r.width, 2.4 * px);
      const pad = w;
      const pts = r.curvePoints && r.curvePoints.length > 1 ? r.curvePoints : null;
      let minX: number, maxX: number, minY: number, maxY: number;
      if (pts) {
        minX = (r._minX ?? Math.min(...pts.map(p => p.x))) - pad;
        maxX = (r._maxX ?? Math.max(...pts.map(p => p.x))) + pad;
        minY = (r._minY ?? Math.min(...pts.map(p => p.y))) - pad;
        maxY = (r._maxY ?? Math.max(...pts.map(p => p.y))) + pad;
      } else {
        minX = Math.min(r.x1, r.x2) - pad; maxX = Math.max(r.x1, r.x2) + pad;
        minY = Math.min(r.y1, r.y2) - pad; maxY = Math.max(r.y1, r.y2) + pad;
      }
      if (maxX < v.minX || minX > v.maxX || maxY < v.minY || minY > v.maxY) continue;
      const line = pts || [{ x: r.x1, y: r.y1 }, { x: r.x2, y: r.y2 }];
      if (pass === 0) {
        if (r.isDirt || r.isGravel || w < 6 * px) continue;
        ctx.strokeStyle = C.roadAsphaltEdge;
        ctx.lineWidth = w + 3 * px;
        strokePath(ctx, line);
      } else {
        ctx.strokeStyle = roadColor(r);
        ctx.lineWidth = w;
        strokePath(ctx, line);
      }
    }
    if (pass === 1 && world.roundabouts) {
      for (const rb of world.roundabouts) {
        if (rb.x + rb.radius < v.minX || rb.x - rb.radius > v.maxX || rb.y + rb.radius < v.minY || rb.y - rb.radius > v.maxY) continue;
        ctx.fillStyle = C.roadAsphalt;
        ctx.beginPath(); ctx.arc(rb.x, rb.y, rb.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.bg;
        ctx.beginPath(); ctx.arc(rb.x, rb.y, rb.innerRadius, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  if (!detail) return;
  // centre lines on wide asphalt roads
  ctx.strokeStyle = C.roadMark;
  ctx.lineWidth = Math.max(1.4 * px, 2);
  ctx.setLineDash([14 * Math.max(px, 1), 12 * Math.max(px, 1)]);
  for (const r of world.roads) {
    if (r.isRoundabout || r.isDirt || r.isGravel || r.width < 40) continue;
    const pts = r.curvePoints && r.curvePoints.length > 1 ? r.curvePoints : [{ x: r.x1, y: r.y1 }, { x: r.x2, y: r.y2 }];
    let mnX: number, mxX: number, mnY: number, mxY: number;
    if (r.curvePoints && r.curvePoints.length > 1) {
      mnX = r._minX ?? Math.min(...pts.map(p => p.x)); mxX = r._maxX ?? Math.max(...pts.map(p => p.x));
      mnY = r._minY ?? Math.min(...pts.map(p => p.y)); mxY = r._maxY ?? Math.max(...pts.map(p => p.y));
    } else {
      mnX = Math.min(r.x1, r.x2); mxX = Math.max(r.x1, r.x2); mnY = Math.min(r.y1, r.y2); mxY = Math.max(r.y1, r.y2);
    }
    if (mxX + r.width < v.minX || mnX - r.width > v.maxX || mxY + r.width < v.minY || mnY - r.width > v.maxY) continue;
    strokePath(ctx, pts);
  }
  ctx.setLineDash([]);
}

export function drawRails(ctx: CanvasRenderingContext2D, world: GameWorld, v: View, px: number) {
  if (!world.railwayTracks) return;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) {
    for (const t of world.railwayTracks) {
      const pts = t.curvePoints && t.curvePoints.length > 1 ? t.curvePoints : [{ x: t.x1, y: t.y1 }, { x: t.x2, y: t.y2 }];
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const p of pts) { if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; }
      if (maxX + 30 < v.minX || minX - 30 > v.maxX || maxY + 30 < v.minY || minY - 30 > v.maxY) continue;
      if (pass === 0) { ctx.strokeStyle = C.railBed; ctx.lineWidth = Math.max(12, 3 * px); }
      else {
        ctx.strokeStyle = C.rail; ctx.lineWidth = Math.max(2.5, 1.2 * px);
        ctx.setLineDash([Math.max(10, 5 * px), Math.max(10, 5 * px)]);
      }
      strokePath(ctx, pts);
      ctx.setLineDash([]);
    }
  }
}

export function drawBuildings(ctx: CanvasRenderingContext2D, world: GameWorld, v: View, px: number) {
  const shadow = px < 4;
  for (const b of world.buildings) {
    if (b.type === 'park_monument') continue;
    if (b.x + b.width < v.minX || b.x > v.maxX || b.y + b.height < v.minY || b.y > v.maxY) continue;
    if (shadow) { ctx.fillStyle = C.buildingShadow; ctx.fillRect(b.x + 3 * px, b.y + 3 * px, b.width, b.height); }
    let fill: string = C.building;
    let edge: string = C.buildingEdge;
    switch (b.type) {
      case 'hospital': fill = 'rgba(122,60,60,0.9)'; edge = '#d9745a'; break;
      case 'police_station': fill = 'rgba(52,70,108,0.92)'; edge = '#6aa7e0'; break;
      case 'fire_station': fill = 'rgba(130,52,40,0.92)'; edge = '#e0583c'; break;
      case 'car_dealership':
      case 'real_estate_agency': fill = 'rgba(120,92,36,0.92)'; edge = C.amberHi; break;
      case 'shopping_mall':
      case 'shop': fill = 'rgba(78,64,104,0.92)'; edge = '#b99be0'; break;
      case 'railway_station': fill = 'rgba(48,84,96,0.92)'; edge = '#6ab0c0'; break;
      case 'industrial': fill = 'rgba(78,70,58,0.92)'; edge = '#8f8570'; break;
    }
    ctx.fillStyle = fill;
    ctx.fillRect(b.x, b.y, b.width, b.height);
    ctx.strokeStyle = edge;
    ctx.lineWidth = Math.max(1 * px, 1.2);
    ctx.strokeRect(b.x, b.y, b.width, b.height);
  }
}

export function drawParkings(ctx: CanvasRenderingContext2D, world: GameWorld, v: View, px: number, label: boolean) {
  for (const p of world.parkings) {
    if (p.x + p.width < v.minX || p.x > v.maxX || p.y + p.height < v.minY || p.y > v.maxY) continue;
    ctx.fillStyle = C.parking;
    ctx.fillRect(p.x, p.y, p.width, p.height);
    ctx.strokeStyle = C.parkingEdge;
    ctx.lineWidth = Math.max(1 * px, 1.2);
    ctx.strokeRect(p.x, p.y, p.width, p.height);
    if (label) {
      ctx.fillStyle = C.parkingEdge;
      ctx.font = `700 ${Math.round(18 * px * 1.1)}px ${MAP_FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('P', p.x + p.width / 2, p.y + p.height / 2);
    }
  }
}

export function drawSignals(ctx: CanvasRenderingContext2D, world: GameWorld, v: View, px: number) {
  const r = Math.max(5, 3 * px);
  for (const i of world.intersections) {
    if (i.x < v.minX || i.x > v.maxX || i.y < v.minY || i.y > v.maxY) continue;
    const ph = i.phases?.[i.currentPhaseIndex] || i.phases?.[0];
    const green = ph ? ph.nsState === 'green' || ph.nsState === 'green_flashing' : false;
    ctx.fillStyle = green ? C.signalGreen : C.signalRed;
    ctx.beginPath(); ctx.arc(i.x, i.y, r, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawRoute(ctx: CanvasRenderingContext2D, world: GameWorld, px: number, time: number) {
  const pts = world.gpsPath;
  if (!pts || pts.length < 2) return;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = C.routeGlow; ctx.lineWidth = 11 * px; strokePath(ctx, pts);
  ctx.strokeStyle = C.route; ctx.lineWidth = 5 * px; strokePath(ctx, pts);
  ctx.strokeStyle = '#1a1409'; ctx.lineWidth = 1.6 * px;
  ctx.setLineDash([7 * px, 11 * px]);
  ctx.lineDashOffset = -(time / 40) * px;
  strokePath(ctx, pts);
  ctx.setLineDash([]); ctx.lineDashOffset = 0;
}

/** Destination flag. Drawn in world space but sized in screen pixels. */
export function drawDestination(ctx: CanvasRenderingContext2D, world: GameWorld, px: number, time: number) {
  const d = world.gpsDestination;
  if (!d) return;
  const pulse = (time % 1400) / 1400;
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.strokeStyle = `rgba(224,171,69,${1 - pulse})`;
  ctx.lineWidth = 2 * px;
  ctx.beginPath(); ctx.arc(0, 0, (10 + pulse * 18) * px, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = C.amberHi; ctx.strokeStyle = '#1a1409'; ctx.lineWidth = 2 * px;
  ctx.beginPath(); ctx.arc(0, 0, 8 * px, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1a1409';
  ctx.beginPath(); ctx.arc(0, 0, 2.6 * px, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawTraffic(ctx: CanvasRenderingContext2D, world: GameWorld, v: View, px: number, time: number, size: number) {
  const L = size * px, Wd = size * 0.5 * px;
  for (const veh of world.vehicles) {
    if (veh.isPlayerControlled) continue;
    if (veh.x < v.minX || veh.x > v.maxX || veh.y < v.minY || veh.y > v.maxY) continue;
    const crash = isVehicleInAccident(veh);
    const jam = !crash && !veh.isParked && (Math.abs(veh.speed) < 15 || veh.aiState === 'stopping_obstacle');
    ctx.save();
    ctx.translate(veh.x, veh.y);
    if (crash) {
      const p = (time % 1000) / 1000;
      ctx.strokeStyle = `rgba(224,88,60,${0.9 - p * 0.8})`;
      ctx.lineWidth = 1.6 * px;
      ctx.beginPath(); ctx.arc(0, 0, (8 + p * 12) * px, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.rotate(veh.angle);
    ctx.fillStyle = crash ? C.accident : jam ? C.trafficJam : veh.isParked ? C.trafficParked : C.traffic;
    ctx.fillRect(-L / 2, -Wd / 2, L, Wd);
    ctx.restore();
  }
}

export function drawPedestrians(ctx: CanvasRenderingContext2D, world: GameWorld, v: View, px: number) {
  ctx.fillStyle = C.pedestrian;
  for (const p of world.pedestrians) {
    if (p.x < v.minX || p.x > v.maxX || p.y < v.minY || p.y > v.maxY) continue;
    ctx.beginPath(); ctx.arc(p.x, p.y, 1.8 * px, 0, Math.PI * 2); ctx.fill();
  }
}

/** Player arrow (amber, dark outline). `px` = world units per screen pixel; `pulse` draws a radar ring. */
export function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, px: number, time: number, pulse: boolean, rotation = player.angle) {
  ctx.save();
  ctx.translate(player.x, player.y);
  if (pulse) {
    const p = (time % 1800) / 1800;
    ctx.strokeStyle = `rgba(224,171,69,${0.7 - p * 0.7})`;
    ctx.lineWidth = 2 * px;
    ctx.beginPath(); ctx.arc(0, 0, (10 + p * 26) * px, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.moveTo(11 * px, 0);
  ctx.lineTo(-7 * px, -7 * px);
  ctx.lineTo(-3 * px, 0);
  ctx.lineTo(-7 * px, 7 * px);
  ctx.closePath();
  ctx.fillStyle = C.player; ctx.fill();
  ctx.lineWidth = 1.8 * px; ctx.strokeStyle = C.playerEdge; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}

/** Terrain + water + parks for the big map. */
export function drawTerrain(ctx: CanvasRenderingContext2D, world: GameWorld, px: number) {
  const minX = -4000, minY = -5000;
  const W = Math.max(56000, world.width + 4000), H = Math.max(35000, world.height + 5000);
  ctx.fillStyle = C.bg; ctx.fillRect(minX, minY, W, H);
  ctx.fillStyle = C.forestDeep; ctx.fillRect(minX, minY, W, 8400);
  ctx.fillStyle = C.forest; ctx.fillRect(minX, 0, 8200, 8800);
  ctx.fillStyle = C.park; ctx.fillRect(3800, 3400, 4400, 5000);
  ctx.fillStyle = C.steppe; ctx.fillRect(8000, 3400, W - 12000, 9600);
  ctx.fillStyle = C.badlands; ctx.fillRect(minX, 13500, W, H - 18500);
  ctx.fillStyle = C.water; ctx.fillRect(17000, 7200, 18000, 1100);

  // parks and ponds of the city core
  ctx.fillStyle = 'rgba(70,110,60,0.38)';
  ctx.fillRect(3700, 2100, 1400, 1400);
  ctx.fillStyle = C.water; ctx.strokeStyle = C.waterLine; ctx.lineWidth = Math.max(2, 1.5 * px);
  ctx.beginPath(); ctx.arc(600, 600, 190, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(4400, 2800, 42, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  if (RIVER_WAYPOINTS.length > 1) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = C.water; ctx.lineWidth = 140; strokePath(ctx, RIVER_WAYPOINTS);
    ctx.strokeStyle = C.waterLine; ctx.lineWidth = Math.max(10, 2 * px); strokePath(ctx, RIVER_WAYPOINTS);
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = Math.max(2, 2 * px);
  ctx.strokeRect(minX, minY, W, H);
}

/** Vector glyph for a landmark, centred at (0,0), `s` = half-size in screen px. Never uses emoji. */
export function drawGlyph(ctx: CanvasRenderingContext2D, key: LandmarkIconKey, s: number) {
  ctx.save();
  ctx.lineWidth = Math.max(1.4, s * 0.2);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#141416'; ctx.fillStyle = '#141416';
  switch (key) {
    case 'hospital': {
      const a = s * 0.28, b = s * 0.78;
      ctx.fillRect(-a, -b, a * 2, b * 2); ctx.fillRect(-b, -a, b * 2, a * 2); break;
    }
    case 'fuel': {
      ctx.strokeRect(-s * 0.4, -s * 0.7, s * 0.6, s * 1.4);
      ctx.beginPath(); ctx.moveTo(s * 0.2, -s * 0.2); ctx.lineTo(s * 0.62, -s * 0.2); ctx.lineTo(s * 0.62, s * 0.4); ctx.stroke(); break;
    }
    case 'police': {
      ctx.beginPath(); ctx.moveTo(0, -s * 0.8); ctx.lineTo(s * 0.65, -s * 0.45); ctx.lineTo(s * 0.5, s * 0.35); ctx.lineTo(0, s * 0.8);
      ctx.lineTo(-s * 0.5, s * 0.35); ctx.lineTo(-s * 0.65, -s * 0.45); ctx.closePath(); ctx.stroke(); break;
    }
    case 'fire': {
      ctx.beginPath(); ctx.moveTo(0, -s * 0.85); ctx.quadraticCurveTo(s * 0.8, 0, s * 0.45, s * 0.7);
      ctx.quadraticCurveTo(0, s * 0.95, -s * 0.45, s * 0.7); ctx.quadraticCurveTo(-s * 0.8, 0, 0, -s * 0.85); ctx.fill(); break;
    }
    case 'car': {
      ctx.fillRect(-s * 0.8, -s * 0.1, s * 1.6, s * 0.5); ctx.fillRect(-s * 0.45, -s * 0.5, s * 0.9, s * 0.4); break;
    }
    case 'garage': {
      ctx.beginPath(); ctx.moveTo(-s * 0.6, s * 0.6); ctx.lineTo(s * 0.35, -s * 0.35); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * 0.45, -s * 0.45, s * 0.3, 0, Math.PI * 2); ctx.stroke(); break;
    }
    case 'nature': {
      ctx.beginPath(); ctx.moveTo(0, -s * 0.85); ctx.lineTo(s * 0.62, s * 0.3); ctx.lineTo(-s * 0.62, s * 0.3); ctx.closePath(); ctx.fill();
      ctx.fillRect(-s * 0.12, s * 0.3, s * 0.24, s * 0.4); break;
    }
    case 'mountain': {
      ctx.beginPath(); ctx.moveTo(-s * 0.85, s * 0.6); ctx.lineTo(-s * 0.2, -s * 0.6); ctx.lineTo(s * 0.25, s * 0.15); ctx.lineTo(s * 0.5, -s * 0.2); ctx.lineTo(s * 0.9, s * 0.6); ctx.closePath(); ctx.fill(); break;
    }
    case 'mall': case 'food': case 'pharmacy': {
      ctx.strokeRect(-s * 0.6, -s * 0.15, s * 1.2, s * 0.85);
      ctx.beginPath(); ctx.arc(0, -s * 0.15, s * 0.32, Math.PI, 0); ctx.stroke(); break;
    }
    case 'industrial': {
      ctx.fillRect(-s * 0.75, -s * 0.1, s * 1.5, s * 0.8);
      ctx.fillRect(-s * 0.6, -s * 0.7, s * 0.28, s * 0.6); break;
    }
    case 'agency': {
      ctx.strokeRect(-s * 0.5, -s * 0.1, s, s * 0.75);
      ctx.beginPath(); ctx.moveTo(-s * 0.65, -s * 0.1); ctx.lineTo(0, -s * 0.7); ctx.lineTo(s * 0.65, -s * 0.1); ctx.stroke(); break;
    }
    case 'train': {
      ctx.beginPath(); ctx.moveTo(-s * 0.45, -s * 0.7); ctx.lineTo(-s * 0.45, s * 0.7); ctx.moveTo(s * 0.45, -s * 0.7); ctx.lineTo(s * 0.45, s * 0.7);
      for (const y of [-0.35, 0, 0.35]) { ctx.moveTo(-s * 0.7, s * y); ctx.lineTo(s * 0.7, s * y); }
      ctx.stroke(); break;
    }
    default: {
      ctx.beginPath(); ctx.arc(0, 0, s * 0.38, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

/** Round marker pin in screen space. */
export function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, key: LandmarkIconKey, active: boolean) {
  ctx.save();
  ctx.translate(x, y);
  if (active) {
    ctx.strokeStyle = C.amberHi; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = active ? '#ffffff' : 'rgba(10,10,12,0.9)'; ctx.lineWidth = 1.8; ctx.stroke();
  if (r >= 7) drawGlyph(ctx, key, r * 0.58);
  ctx.restore();
}
