// --- REALISTIC RAILWAY INFRASTRUCTURE & TEXTURES RENDERER ---
// Renders ultra-realistic railway ballast prisms, concrete/wooden sleepers with tie-plates,
// mirror-polished steel rails with rust web patina, authentic switch turnouts with point machines,
// high/island passenger platforms with tactile yellow paving, buffer stops, overhead catenary system,
// level crossings with rubber panels, and authentic rolling stock (ЧМЭ3 shunter, passenger cars, hoppers).

import { Building, GameWorld, RailwayPlatform, RailwayTrackSegment, RollingStockCar } from './types';
import { RollingStockRenderer } from './rollingStockRenderer';
import { getLevelCrossings } from './levelCrossingSystem';

export class RailwayRenderer {
  /**
   * 1. Renders the complete track superstructure: Ballast bed, sleepers, rails, switches, and buffer stops.
   * Cached into static map chunks for 60fps performance.
   */
  public static renderTrackSuperstructure(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): void {
    const tracks = world.railwayTracks;
    if (!tracks || tracks.length === 0) return;

    // Filter visible tracks
    const visibleTracks: RailwayTrackSegment[] = [];
    for (const track of tracks) {
      let tMinX: number, tMaxX: number, tMinY: number, tMaxY: number;
      if (track.curvePoints && track.curvePoints.length > 1) {
        tMinX = track.curvePoints[0].x;
        tMaxX = track.curvePoints[0].x;
        tMinY = track.curvePoints[0].y;
        tMaxY = track.curvePoints[0].y;
        for (let i = 1; i < track.curvePoints.length; i++) {
          const pt = track.curvePoints[i];
          if (pt.x < tMinX) tMinX = pt.x;
          if (pt.x > tMaxX) tMaxX = pt.x;
          if (pt.y < tMinY) tMinY = pt.y;
          if (pt.y > tMaxY) tMaxY = pt.y;
        }
        tMinX -= 70; tMaxX += 70; tMinY -= 70; tMaxY += 70;
      } else {
        tMinX = Math.min(track.x1, track.x2) - 70;
        tMaxX = Math.max(track.x1, track.x2) + 70;
        tMinY = Math.min(track.y1, track.y2) - 70;
        tMaxY = Math.max(track.y1, track.y2) + 70;
      }

      if (tMaxX >= minX && tMinX <= maxX && tMaxY >= minY && tMinY <= maxY) {
        visibleTracks.push(track);
      }
    }

    if (visibleTracks.length === 0) return;

    // --- MULTI-PASS HIGH-FIDELITY TRACK SUPERSTRUCTURE ---
    // PASS 1: Ballast Prisms (merged seamless crushed stone foundation across all tracks)
    this.renderBallastPass(ctx, visibleTracks);

    // PASS 2: Sleepers (concrete and timber ties laid along track tangents)
    this.renderSleepersPass(ctx, visibleTracks, minX, minY, maxX, maxY);

    // PASS 3: Dual Steel Rails (continuous smooth R65 dual rails with polished heads)
    this.renderRailsPass(ctx, visibleTracks);

    // PASS 4: Track Switch Equipment & Buffer Stops
    this.renderEquipmentPass(ctx, visibleTracks);

    // PASS 5: Level Crossing Deck Panels, Rubber Insets, Stop Lines & Barricades
    this.renderLevelCrossingsPass(ctx, world, minX, minY, maxX, maxY);
  }

  /**
   * PASS 1: Continuous merged ballast bed for all visible tracks
   */
  private static renderBallastPass(ctx: CanvasRenderingContext2D, tracks: RailwayTrackSegment[]): void {
    ctx.save();

    for (const track of tracks) {
      const gauge = track.gauge ?? 34;
      const ballastW = track.ballastWidth ?? 92;
      const halfBallast = ballastW / 2;

      if (track.curvePoints && track.curvePoints.length > 1) {
        const pts = track.curvePoints;
        const n = pts.length;
        ctx.save();
        // CRITICAL: lineCap 'butt' prevents artificial circular bulges at turnout junctions and ends
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'round';

        // 1a. Outer dark soil edge shadow
        ctx.strokeStyle = '#262422';
        ctx.lineWidth = ballastW + 12;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < n; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        // 1b. Ballast slope base
        ctx.strokeStyle = '#383532';
        ctx.lineWidth = ballastW + 4;
        ctx.stroke();

        // 1c. Ballast crushed granite core
        ctx.strokeStyle = '#4a4641';
        ctx.lineWidth = ballastW;
        ctx.stroke();

        // 1d. Ballast crown / top surface
        ctx.strokeStyle = '#56514b';
        ctx.lineWidth = ballastW - 8;
        ctx.stroke();

        // 1e. Center track grease and oil stain
        ctx.strokeStyle = 'rgba(24, 20, 16, 0.5)';
        ctx.lineWidth = gauge * 0.85;
        ctx.stroke();

        ctx.restore();
      } else {
        const dx = track.x2 - track.x1;
        const dy = track.y2 - track.y1;
        const len = Math.hypot(dx, dy);
        if (len < 1) continue;
        const angle = Math.atan2(dy, dx);

        ctx.save();
        ctx.translate(track.x1, track.y1);
        ctx.rotate(angle);

        // 1a. Outer dark soil edge shadow
        ctx.fillStyle = '#262422';
        ctx.fillRect(0, -halfBallast - 6, len, ballastW + 12);

        // 1b. Ballast slope base
        ctx.fillStyle = '#383532';
        ctx.fillRect(0, -halfBallast - 2, len, ballastW + 4);

        // 1c. Ballast crushed granite core
        ctx.fillStyle = '#4a4641';
        ctx.fillRect(0, -halfBallast, len, ballastW);

        // 1d. Ballast crown / top surface
        ctx.fillStyle = '#56514b';
        ctx.fillRect(0, -halfBallast + 4, len, ballastW - 8);

        // 1e. Central oil and grease staining patina
        ctx.fillStyle = 'rgba(24, 20, 16, 0.45)';
        ctx.fillRect(0, -gauge * 0.4, len, gauge * 0.8);

        ctx.restore();
      }
    }

    ctx.restore();
  }

  /**
   * PASS 2: Sleepers (ties) laid along track path with high-performance viewport culling
   */
  private static renderSleepersPass(
    ctx: CanvasRenderingContext2D,
    tracks: RailwayTrackSegment[],
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): void {
    ctx.save();

    const pad = 70;
    const viewMinX = minX - pad;
    const viewMaxX = maxX + pad;
    const viewMinY = minY - pad;
    const viewMaxY = maxY + pad;

    for (const track of tracks) {
      const gauge = track.gauge ?? 34;
      const halfGauge = gauge / 2;
      const isWood = track.sleepersType === 'wood';
      const sleeperSpacing = isWood ? 18 : 17;
      const sleeperL = gauge + 28; // ~62 px length
      const halfSleeperL = sleeperL / 2;
      const sleeperW = isWood ? 5.8 : 5.2;

      if (track.curvePoints && track.curvePoints.length > 1) {
        const pts = track.curvePoints;
        const n = pts.length;
        const cumDist = new Float64Array(n);
        cumDist[0] = 0;
        for (let i = 1; i < n; i++) {
          cumDist[i] = cumDist[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        }
        const totalLen = cumDist[n - 1];

        let segIdx = 1;
        for (let d = 8; d < totalLen - 8; d += sleeperSpacing) {
          while (segIdx < n - 1 && cumDist[segIdx] < d) segIdx++;
          const pPrev = pts[segIdx - 1];
          const pNext = pts[segIdx];
          const segLen = cumDist[segIdx] - cumDist[segIdx - 1];
          const u = segLen > 0.001 ? (d - cumDist[segIdx - 1]) / segLen : 0;
          const px = pPrev.x + (pNext.x - pPrev.x) * u;
          const py = pPrev.y + (pNext.y - pPrev.y) * u;

          // Viewport culling per curved sleeper
          if (px < viewMinX || px > viewMaxX || py < viewMinY || py > viewMaxY) continue;

          const angle = Math.atan2(pNext.y - pPrev.y, pNext.x - pPrev.x);

          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(angle);
          this.drawSingleSleeper(ctx, sleeperW, sleeperL, halfSleeperL, halfGauge, gauge, isWood);
          ctx.restore();
        }
      } else {
        const dx = track.x2 - track.x1;
        const dy = track.y2 - track.y1;
        const len = Math.hypot(dx, dy);
        if (len < 1) continue;
        const angle = Math.atan2(dy, dx);

        // Fast viewport range calculation for straight track
        let startX = 8;
        let endX = len - 8;

        if (Math.abs(dy) < 0.01) {
          // Pure horizontal track (most common in map)
          const minTrackX = Math.min(track.x1, track.x2);
          const maxTrackX = Math.max(track.x1, track.x2);
          if (track.y1 < viewMinY || track.y1 > viewMaxY) continue;
          if (maxTrackX < viewMinX || minTrackX > viewMaxX) continue;

          if (track.x2 > track.x1) {
            startX = Math.max(8, Math.floor((viewMinX - track.x1) / sleeperSpacing) * sleeperSpacing);
            endX = Math.min(len - 8, Math.ceil((viewMaxX - track.x1) / sleeperSpacing) * sleeperSpacing);
          } else {
            startX = Math.max(8, Math.floor((track.x1 - viewMaxX) / sleeperSpacing) * sleeperSpacing);
            endX = Math.min(len - 8, Math.ceil((track.x1 - viewMinX) / sleeperSpacing) * sleeperSpacing);
          }
        }

        if (startX > endX) continue;

        ctx.save();
        ctx.translate(track.x1, track.y1);
        ctx.rotate(angle);

        // Direct batch rendering without per-sleeper save/restore
        if (isWood) {
          for (let x = startX; x <= endX; x += sleeperSpacing) {
            ctx.fillStyle = '#2b1e15';
            ctx.fillRect(x - sleeperW / 2, -halfSleeperL, sleeperW, sleeperL);
            ctx.fillStyle = '#42372f';
            ctx.fillRect(x - 2.0, -halfGauge - 3.2, 4.0, 6.4);
            ctx.fillRect(x - 2.0, halfGauge - 3.2, 4.0, 6.4);
          }
        } else {
          for (let x = startX; x <= endX; x += sleeperSpacing) {
            ctx.fillStyle = '#6f6d68';
            ctx.fillRect(x - sleeperW / 2, -halfSleeperL, sleeperW, sleeperL);
            ctx.fillStyle = '#898782';
            ctx.fillRect(x - sleeperW / 2, -halfSleeperL, 1.1, sleeperL);
            ctx.fillStyle = '#595753';
            ctx.fillRect(x - sleeperW / 2, -halfGauge * 0.45, sleeperW, gauge * 0.9);
            ctx.fillStyle = '#313338';
            ctx.fillRect(x - 2.2, -halfGauge - 3.6, 4.4, 7.2);
            ctx.fillRect(x - 2.2, halfGauge - 3.6, 4.4, 7.2);
          }
        }

        ctx.restore();
      }
    }

    ctx.restore();
  }

  /**
   * Draws single sleeper with tie-plates and clips
   */
  private static drawSingleSleeper(
    ctx: CanvasRenderingContext2D,
    sleeperW: number,
    sleeperL: number,
    halfSleeperL: number,
    halfGauge: number,
    gauge: number,
    isWood: boolean
  ): void {
    if (isWood) {
      // Wooden creosote sleeper
      ctx.fillStyle = '#2b1e15';
      ctx.fillRect(-sleeperW / 2, -halfSleeperL, sleeperW, sleeperL);
      // Steel tie-plates
      ctx.fillStyle = '#42372f';
      ctx.fillRect(-2.0, -halfGauge - 3.2, 4.0, 6.4);
      ctx.fillRect(-2.0, halfGauge - 3.2, 4.0, 6.4);
    } else {
      // Reinforced concrete sleeper Ш-3
      ctx.fillStyle = '#6f6d68';
      ctx.fillRect(-sleeperW / 2, -halfSleeperL, sleeperW, sleeperL);
      // Highlight edge
      ctx.fillStyle = '#898782';
      ctx.fillRect(-sleeperW / 2, -halfSleeperL, 1.1, sleeperL);
      // Recessed center trough
      ctx.fillStyle = '#595753';
      ctx.fillRect(-sleeperW / 2, -halfGauge * 0.45, sleeperW, gauge * 0.9);
      // Heavy steel tie plates & KB-65 clips
      ctx.fillStyle = '#313338';
      ctx.fillRect(-2.2, -halfGauge - 3.6, 4.4, 7.2);
      ctx.fillRect(-2.2, halfGauge - 3.6, 4.4, 7.2);
      ctx.fillStyle = '#4b4d52';
      ctx.fillRect(-1.4, -halfGauge - 2.8, 2.8, 1.6);
      ctx.fillRect(-1.4, -halfGauge + 1.2, 2.8, 1.6);
      ctx.fillRect(-1.4, halfGauge - 2.8, 2.8, 1.6);
      ctx.fillRect(-1.4, halfGauge + 1.2, 2.8, 1.6);
    }
  }

  /**
   * PASS 3: Seamless Dual Steel Rails (R65)
   */
  private static renderRailsPass(ctx: CanvasRenderingContext2D, tracks: RailwayTrackSegment[]): void {
    ctx.save();

    for (const track of tracks) {
      const gauge = track.gauge ?? 34;
      const halfGauge = gauge / 2;

      if (track.curvePoints && track.curvePoints.length > 1) {
        const pts = track.curvePoints;
        const n = pts.length;
        const leftRailPts: { x: number; y: number }[] = [];
        const rightRailPts: { x: number; y: number }[] = [];

        for (let i = 0; i < n; i++) {
          let dx: number, dy: number;
          if (i === 0) {
            dx = pts[1].x - pts[0].x;
            dy = pts[1].y - pts[0].y;
          } else if (i === n - 1) {
            dx = pts[n - 1].x - pts[n - 2].x;
            dy = pts[n - 1].y - pts[n - 2].y;
          } else {
            dx = pts[i + 1].x - pts[i - 1].x;
            dy = pts[i + 1].y - pts[i - 1].y;
          }
          const len = Math.hypot(dx, dy);
          const nx = len > 0.001 ? -dy / len : 0;
          const ny = len > 0.001 ? dx / len : 1;

          leftRailPts.push({ x: pts[i].x + nx * halfGauge, y: pts[i].y + ny * halfGauge });
          rightRailPts.push({ x: pts[i].x - nx * halfGauge, y: pts[i].y - ny * halfGauge });
        }

        this.drawRailPath(ctx, leftRailPts);
        this.drawRailPath(ctx, rightRailPts);
      } else {
        const dx = track.x2 - track.x1;
        const dy = track.y2 - track.y1;
        const len = Math.hypot(dx, dy);
        if (len < 1) continue;
        const nx = -dy / len;
        const ny = dx / len;

        const leftRailPts = [
          { x: track.x1 + nx * halfGauge, y: track.y1 + ny * halfGauge },
          { x: track.x2 + nx * halfGauge, y: track.y2 + ny * halfGauge }
        ];
        const rightRailPts = [
          { x: track.x1 - nx * halfGauge, y: track.y1 - ny * halfGauge },
          { x: track.x2 - nx * halfGauge, y: track.y2 - ny * halfGauge }
        ];

        this.drawRailPath(ctx, leftRailPts);
        this.drawRailPath(ctx, rightRailPts);
      }
    }

    ctx.restore();
  }

  /**
   * Draws a multi-layered steel rail line with polished head and specular reflection
   */
  private static drawRailPath(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]): void {
    const n = pts.length;
    if (n < 2) return;

    // Pass 1: Rail base shadow
    ctx.strokeStyle = '#1e1c1a';
    ctx.lineWidth = 6.2;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < n; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    // Pass 2: Rust web patina
    ctx.strokeStyle = '#53453b';
    ctx.lineWidth = 4.8;
    ctx.stroke();

    // Pass 3: Polished steel head
    ctx.strokeStyle = '#c7cbd2';
    ctx.lineWidth = 3.2;
    ctx.stroke();

    // Pass 4: Specular running contact mirror line
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  /**
   * PASS 4: Track switch machines and buffer stops (no phantom crossings)
   */
  private static renderEquipmentPass(ctx: CanvasRenderingContext2D, tracks: RailwayTrackSegment[]): void {
    ctx.save();

    for (const track of tracks) {
      const gauge = track.gauge ?? 34;
      const halfGauge = gauge / 2;
      const ballastW = track.ballastWidth ?? 92;
      const halfBallast = ballastW / 2;

      // 1. Buffer stops
      if (track.hasBufferStop) {
        ctx.save();
        let bX: number, bY: number, angle: number;
        if (track.curvePoints && track.curvePoints.length > 1) {
          const pts = track.curvePoints;
          const atEnd = track.bufferStopEnd !== 'start';
          const p = atEnd ? pts[pts.length - 1] : pts[0];
          const pNear = atEnd ? pts[pts.length - 2] : pts[1];
          bX = p.x;
          bY = p.y;
          angle = atEnd ? Math.atan2(p.y - pNear.y, p.x - pNear.x) : Math.atan2(pNear.y - p.y, pNear.x - p.x);
        } else {
          const atEnd = track.bufferStopEnd !== 'start';
          bX = atEnd ? track.x2 : track.x1;
          bY = atEnd ? track.y2 : track.y1;
          angle = Math.atan2(track.y2 - track.y1, track.x2 - track.x1);
          if (!atEnd) angle += Math.PI;
        }

        ctx.translate(bX, bY);
        ctx.rotate(angle);

        // Crushed stone mound
        ctx.fillStyle = '#48433e';
        ctx.beginPath();
        ctx.ellipse(-10, 0, 16, halfBallast * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Massive timber & steel bumper beam across rails
        const beamL = gauge + 14;
        const beamW = 6.4;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-beamW / 2, -beamL / 2, beamW, beamL);

        // Warning red and white chevrons
        const numStripes = 6;
        const stripeH = beamL / numStripes;
        for (let s = 0; s < numStripes; s++) {
          ctx.fillStyle = s % 2 === 0 ? '#dc2626' : '#f8fafc';
          ctx.fillRect(-beamW / 2 + 0.5, -beamL / 2 + s * stripeH, beamW - 1.0, stripeH);
        }

        // Twin buffer discs
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(-2.0, -halfGauge, 4.2, 0, Math.PI * 2);
        ctx.arc(-2.0, halfGauge, 4.2, 0, Math.PI * 2);
        ctx.fill();

        // Center red marker light
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 2. Switch turnouts (электропривод СП-6М)
      if (track.isSwitch && track.switchData && !track.curvePoints) {
        const dx = track.x2 - track.x1;
        const dy = track.y2 - track.y1;
        const len = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const sw = track.switchData;
        const isLeft = sw.branchDirection === 'left';
        const pointLX = Math.max(0, Math.min(len - 20, sw.pointX - track.x1));

        ctx.save();
        ctx.translate(track.x1, track.y1);
        ctx.rotate(angle);

        // Point machine drive box
        const driveY = isLeft ? -halfBallast - 8 : halfBallast + 3;
        ctx.fillStyle = '#1f242d';
        ctx.fillRect(pointLX - 6, driveY - 1, 12, 7);
        ctx.fillStyle = '#475569';
        ctx.fillRect(pointLX - 5.5, driveY - 0.5, 11, 6);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(pointLX - 1.5, driveY + 1.5, 3, 2);

        // Operating throw rod
        ctx.fillStyle = '#64748b';
        const rodTargetY = isLeft ? -halfGauge : halfGauge;
        ctx.fillRect(pointLX - 1.0, Math.min(driveY + 2, rodTargetY), 2.0, Math.abs(rodTargetY - driveY));

        ctx.restore();
      }
    }

    ctx.restore();
  }

  /**
   * PASS 5: Highly authentic Russian railway level crossings (Переезды с резинокордовым настилом)
   * Discovered automatically via geometric intersection script.
   * Full support for orthogonal (90-deg) and diagonal/skewed crossings (косой переезд).
   */
  private static renderLevelCrossingsPass(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): void {
    const crossings = getLevelCrossings(world);
    ctx.save();

    for (const cross of crossings) {
      const cX = cross.centerX;
      const rW = cross.roadWidth;
      const halfRW = rW / 2;
      const roadAngle = cross.roadAngle || Math.PI / 2;
      const isDiagonal = Math.abs(Math.sin(roadAngle)) < 0.95;

      // Viewport culling
      if (cross.maxX + 40 < minX || cross.minX - 40 > maxX || cross.yMax < minY || cross.yMin > maxY) {
        continue;
      }

      // 1. Base Road Surface:
      // For orthogonal straight roads, draw asphalt base.
      // For diagonal / curved roads, the asphalt ribbon is already rendered smoothly by the road renderer.
      if (!isDiagonal) {
        ctx.fillStyle = '#27272a';
        ctx.fillRect(cX - halfRW, cross.yMin, rW, cross.yMax - cross.yMin);

        // Asphalt shoulder gravel edges
        ctx.fillStyle = '#3f3f46';
        ctx.fillRect(cX - halfRW - 3, cross.yMin, 3, cross.yMax - cross.yMin);
        ctx.fillRect(cX + halfRW, cross.yMin, 3, cross.yMax - cross.yMin);
      }

      // 2. Heavy-duty rubberized crossing deck panels (Резинокордовый настил) at each rail intersection
      for (const track of cross.tracks) {
        const tX = track.x;
        const trackY = track.y;
        const gauge = 34;
        const halfGauge = gauge / 2;
        
        // Horizontal span across the track based on road crossing angle
        const sinA = Math.abs(Math.sin(roadAngle)) || 1.0;
        const spanL = Math.max(rW + 12, (rW / sinA) + 12);
        const panelLeft = tX - spanL / 2;

        // Outer approach rubber panels (внешние аппарели)
        ctx.fillStyle = '#18181b';
        ctx.fillRect(panelLeft, trackY - halfGauge - 12, spanL, 10);
        ctx.fillRect(panelLeft, trackY + halfGauge + 2, spanL, 10);

        // Inner between-rails rubber panel (межрельсовый резиновый настил)
        ctx.fillStyle = '#18181b';
        ctx.fillRect(panelLeft, trackY - halfGauge + 4, spanL, gauge - 8);

        // Flangeway wheel gap channel (темные желоба для гребней колес)
        ctx.fillStyle = '#09090b';
        ctx.fillRect(panelLeft, trackY - halfGauge + 0.5, spanL, 3.5);
        ctx.fillRect(panelLeft, trackY + halfGauge - 4.0, spanL, 3.5);

        // Anti-slip ribbed texture lines along rubber surface
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 1.0;
        for (let rx = panelLeft + 6; rx < panelLeft + spanL; rx += 8) {
          ctx.beginPath();
          ctx.moveTo(rx, trackY - halfGauge + 5);
          ctx.lineTo(rx, trackY + halfGauge - 5);
          ctx.stroke();
        }

        // Galvanized recessed fixing bolts (болтовые крепления резиновых плит)
        ctx.fillStyle = '#71717a';
        for (let bx = panelLeft + 8; bx < panelLeft + spanL; bx += 16) {
          ctx.beginPath();
          ctx.arc(bx, trackY - halfGauge + 7, 1.2, 0, Math.PI * 2);
          ctx.arc(bx, trackY + halfGauge - 7, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Steel edge protection framing with yellow/black hazard warning stripes
        const stripeW = 6;
        for (let s = 0; s < spanL; s += stripeW) {
          ctx.fillStyle = Math.floor(s / stripeW) % 2 === 0 ? '#eab308' : '#09090b';
          // North edge
          ctx.fillRect(panelLeft + s, trackY - halfGauge - 13, stripeW, 1.6);
          // South edge
          ctx.fillRect(panelLeft + s, trackY + halfGauge + 11.4, stripeW, 1.6);
        }
      }

      // 3. Crisp Road Markings (Разметка 1.12 «СТОП», стоп-линии и сплошная осевая)
      if (isDiagonal) {
        // Angled stop lines along the diagonal road normal
        const cosA = Math.cos(roadAngle);
        const sinA = Math.sin(roadAngle);
        const normX = -sinA;
        const normY = cosA;

        // North-West approach stop line (heading SE towards tracks)
        const nwX = cross.tracks[0].x - cosA * 70;
        const nwY = cross.tracks[0].y - sinA * 70;

        ctx.save();
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        // Right lane stop line
        ctx.moveTo(nwX, nwY);
        ctx.lineTo(nwX - normX * (halfRW - 4), nwY - normY * (halfRW - 4));
        ctx.stroke();

        // Rotated "СТОП" text
        ctx.translate(nwX - normX * (halfRW / 2) - cosA * 16, nwY - normY * (halfRW / 2) - sinA * 16);
        ctx.rotate(roadAngle - Math.PI / 2);
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
        ctx.fillText('СТОП', 0, 0);
        ctx.restore();

        // South-East approach stop line (heading NW towards tracks)
        const lastTrack = cross.tracks[cross.tracks.length - 1];
        const seX = lastTrack.x + cosA * 70;
        const seY = lastTrack.y + sinA * 70;

        ctx.save();
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        // Right lane for incoming SE traffic
        ctx.moveTo(seX, seY);
        ctx.lineTo(seX + normX * (halfRW - 4), seY + normY * (halfRW - 4));
        ctx.stroke();

        // Rotated "СТОП" text
        ctx.translate(seX + normX * (halfRW / 2) + cosA * 16, seY + normY * (halfRW / 2) + sinA * 16);
        ctx.rotate(roadAngle + Math.PI / 2);
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
        ctx.fillText('СТОП', 0, 0);
        ctx.restore();

      } else {
        // Orthogonal straight stop lines
        const northStopY = cross.yMin + 20;
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(cX - halfRW + 4, northStopY, halfRW - 6, 3.5);

        const southStopY = cross.yMax - 22;
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(cX + 2, southStopY, halfRW - 6, 3.5);

        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
        ctx.fillText('СТОП', cX - halfRW / 2, northStopY - 14);
        ctx.fillText('СТОП', cX + halfRW / 2, southStopY + 14);

        // Double solid centerline
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(cX - 1, cross.yMin - 40); ctx.lineTo(cX - 1, northStopY);
        ctx.moveTo(cX + 1, cross.yMin - 40); ctx.lineTo(cX + 1, northStopY);
        ctx.moveTo(cX - 1, southStopY); ctx.lineTo(cX - 1, cross.yMax + 40);
        ctx.moveTo(cX + 1, southStopY); ctx.lineTo(cX + 1, cross.yMax + 40);
        ctx.stroke();
      }

      // 4. Concrete guide posts with red/white reflectors along shoulders (Направляющие столбики)
      const postYs = [cross.yMin + 8, cross.yMin + 45, cross.yMax - 45, cross.yMax - 8];
      for (const py of postYs) {
        // Left shoulder post
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cX - halfRW - 6, py - 1.5, 3, 3);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(cX - halfRW - 6, py - 0.5, 3, 1);

        // Right shoulder post
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cX + halfRW + 3, py - 1.5, 3, 3);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(cX + halfRW + 3, py - 0.5, 3, 1);
      }
    }

    ctx.restore();
  }

  /**
   * 2. Renders high and island passenger platforms with realistic paving, tactile safety tiles,
   * canopies, station signage, and boarding crossings.
   */
  public static renderPlatforms(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): void {
    const platforms = world.railwayPlatforms;
    if (!platforms || platforms.length === 0) return;

    for (const p of platforms) {
      if (p.x + p.width < minX || p.x > maxX || p.y + p.height < minY || p.y > maxY) continue;

      ctx.save();

      // 1. Concrete platform foundation shadow cast on ballast
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.fillRect(p.x - 2, p.y + p.height, p.width + 4, 3.5);

      // 2. Concrete edging slabs (бордюрный камень платформы)
      ctx.fillStyle = '#475569';
      ctx.fillRect(p.x, p.y, p.width, p.height);

      // 3. Main platform paving deck (текстурированная тротуарная плитка)
      ctx.fillStyle = '#64748b';
      ctx.fillRect(p.x + 2, p.y + 2, p.width - 4, p.height - 4);

      // Paving tile grid pattern with viewport bounds
      ctx.fillStyle = '#525e70';
      const tileSize = 16;
      const startTileX = Math.max(p.x + 4, Math.floor((minX - p.x) / tileSize) * tileSize + p.x);
      const endTileX = Math.min(p.x + p.width - 4, Math.ceil((maxX - p.x) / tileSize) * tileSize + p.x);
      for (let px = startTileX; px <= endTileX; px += tileSize) {
        ctx.fillRect(px, p.y + 2, 0.7, p.height - 4);
      }

      const gridLineStartX = Math.max(p.x + 2, minX);
      const gridLineEndX = Math.min(p.x + p.width - 2, maxX);
      const gridLineW = gridLineEndX - gridLineStartX;
      if (gridLineW > 0) {
        for (let py = p.y + 4; py < p.y + p.height - 4; py += tileSize) {
          ctx.fillRect(gridLineStartX, py, gridLineW, 0.7);
        }
      }

      // 4. Bright yellow tactile warning strip with raised studs (тактильная плитка)
      const isIsland = p.trackSide === 'island';
      const studStart = Math.max(p.x + 4, Math.floor((minX - p.x) / 8) * 8 + p.x);
      const studEnd = Math.min(p.x + p.width - 6, Math.ceil((maxX - p.x) / 8) * 8 + p.x);

      if (isIsland || p.trackSide === 'north') {
        const edgeY = p.y + 3;
        const stripMinX = Math.max(p.x + 2, minX);
        const stripMaxX = Math.min(p.x + p.width - 2, maxX);
        const stripW = stripMaxX - stripMinX;
        if (stripW > 0) {
          ctx.fillStyle = '#eab308';
          ctx.fillRect(stripMinX, edgeY, stripW, 3.5);
        }
        ctx.fillStyle = '#ca8a04';
        for (let tx = studStart; tx <= studEnd; tx += 8) {
          ctx.fillRect(tx, edgeY + 0.8, 2.0, 1.8);
        }
        const whiteMinX = Math.max(p.x + 4, minX);
        const whiteMaxX = Math.min(p.x + p.width - 4, maxX);
        const whiteW = whiteMaxX - whiteMinX;
        if (whiteW > 0) {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(whiteMinX, edgeY + 5, whiteW, 1.4);
        }
      }
      if (isIsland || p.trackSide === 'south') {
        const edgeY = p.y + p.height - 6.5;
        const stripMinX = Math.max(p.x + 2, minX);
        const stripMaxX = Math.min(p.x + p.width - 2, maxX);
        const stripW = stripMaxX - stripMinX;
        if (stripW > 0) {
          ctx.fillStyle = '#eab308';
          ctx.fillRect(stripMinX, edgeY, stripW, 3.5);
        }
        ctx.fillStyle = '#ca8a04';
        for (let tx = studStart; tx <= studEnd; tx += 8) {
          ctx.fillRect(tx, edgeY + 0.8, 2.0, 1.8);
        }
        const whiteMinX = Math.max(p.x + 4, minX);
        const whiteMaxX = Math.min(p.x + p.width - 4, maxX);
        const whiteW = whiteMaxX - whiteMinX;
        if (whiteW > 0) {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(whiteMinX, edgeY - 3, whiteW, 1.4);
        }
      }

      // 6. Platform Canopies (навесы для пассажиров)
      if (p.hasCanopy && p.canopySegments) {
        for (const canopy of p.canopySegments) {
          // Canopy roof cast shadow
          ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
          ctx.fillRect(canopy.x - 2, canopy.y - 2, canopy.w + 4, canopy.h + 4);

          // Structural steel frame
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(canopy.x, canopy.y, canopy.w, canopy.h);

          // Translucent tinted corrugated glass/polycarbonate roofing
          ctx.fillStyle = '#334155';
          ctx.fillRect(canopy.x + 1.5, canopy.y + 1.5, canopy.w - 3, canopy.h - 3);

          // Structural roof rafters
          ctx.fillStyle = '#475569';
          for (let rx = canopy.x + 8; rx < canopy.x + canopy.w - 4; rx += 14) {
            ctx.fillRect(rx, canopy.y, 1.2, canopy.h);
          }

          // Support steel columns
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(canopy.x + 6, canopy.y + canopy.h / 2 - 1.5, 3, 3);
          ctx.fillRect(canopy.x + canopy.w - 9, canopy.y + canopy.h / 2 - 1.5, 3, 3);
        }
      }

      // 7. Platform Signs & Benches spaced along monumental platform length
      const signSpacing = 500;
      for (let sx = p.x + 250; sx < p.x + p.width - 150; sx += signSpacing) {
        const signW = 120;
        const signH = 12;
        const signY = p.y + p.height * 0.5 - signH / 2;
        ctx.fillStyle = '#1d4ed8'; // Russian Railways classic station blue
        ctx.fillRect(sx, signY, signW, signH);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.0;
        ctx.strokeRect(sx, signY, signW, signH);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`СТАНЦИЯ СТЕПНАЯ • ПУТЬ ${p.platformNumber}`, sx + signW / 2, signY + signH / 2);
      }

      // Station benches along platform
      for (let bx = p.x + 80; bx < p.x + p.width - 80; bx += 180) {
        const by = p.y + p.height * 0.5;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(bx - 12, by - 3, 24, 6);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(bx - 11, by - 2.5, 22, 2.0);
        ctx.fillRect(bx - 11, by + 0.5, 22, 2.0);
      }

      ctx.restore();
    }
  }

  /**
   * 3. Renders rolling stock (trains, locomotives, passenger coaches, freight cars)
   * with authentic details, bogies, windows, and couplers.
   */
  public static renderRollingStock(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    nightAlpha: number
  ): void {
    RollingStockRenderer.renderRollingStock(ctx, world, minX, minY, maxX, maxY, nightAlpha);
  }

  /**
   * 4. Renders overhead catenary electric traction wires & support masts.
   */
  public static renderOverheadCatenary(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    nightAlpha: number
  ): void {
    const tracks = world.railwayTracks;
    if (!tracks || tracks.length === 0) return;

    for (const track of tracks) {
      if (!track.isElectrified) continue;

      if (track.curvePoints && track.curvePoints.length > 1) {
        const pts = track.curvePoints;
        ctx.save();
        ctx.strokeStyle = nightAlpha > 0.3 ? 'rgba(148, 163, 184, 0.45)' : 'rgba(71, 85, 105, 0.65)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        // Support poles along curve every ~70 units
        for (let i = 3; i < pts.length - 2; i += 7) {
          const pt = pts[i];
          const pPrev = pts[i - 1];
          const pNext = pts[i + 1];
          const cdx = pNext.x - pPrev.x;
          const cdy = pNext.y - pPrev.y;
          const clen = Math.hypot(cdx, cdy) || 1;
          const nx = -cdy / clen;
          const ny = cdx / clen;
          const mastSide = (i % 2 === 0 ? 1 : -1);
          const mastDist = 38 * mastSide;

          ctx.fillStyle = '#64748b';
          ctx.fillRect(pt.x + nx * mastDist - 2.5, pt.y + ny * mastDist - 2.5, 5, 5);

          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(pt.x + nx * mastDist, pt.y + ny * mastDist);
          ctx.lineTo(pt.x, pt.y);
          ctx.stroke();

          ctx.fillStyle = '#0891b2';
          ctx.fillRect(pt.x + nx * 2 - 1.5, pt.y + ny * 2 - 1.5, 3, 3);
        }

        ctx.restore();
        continue;
      }

      const tMinX = Math.min(track.x1, track.x2) - 40;
      const tMaxX = Math.max(track.x1, track.x2) + 40;
      const tMinY = Math.min(track.y1, track.y2) - 40;
      const tMaxY = Math.max(track.y1, track.y2) + 40;
      if (tMaxX < minX || tMinX > maxX || tMaxY < minY || tMinY > maxY) continue;

      const dx = track.x2 - track.x1;
      const dy = track.y2 - track.y1;
      const len = Math.hypot(dx, dy);
      if (len < 10) continue;

      const angle = Math.atan2(dy, dx);
      ctx.save();
      ctx.translate(track.x1, track.y1);
      ctx.rotate(angle);

      // Contact wire directly overhead along centerline (контактный провод)
      ctx.strokeStyle = nightAlpha > 0.3 ? 'rgba(148, 163, 184, 0.45)' : 'rgba(71, 85, 105, 0.65)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(len, 0);
      ctx.stroke();

      // Catenary messenger cable with subtle zigzag / stagger (зигзаг контактного провода ±200мм)
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      const span = 80;
      for (let x = 0; x < len; x += span) {
        const stagger = (Math.floor(x / span) % 2 === 0 ? 1.5 : -1.5);
        if (x === 0) ctx.moveTo(0, stagger);
        else ctx.lineTo(x, stagger);
      }
      ctx.lineTo(len, 0);
      ctx.stroke();

      // Catenary Poles / Masts with cantilever arms
      for (let mx = 30; mx < len - 20; mx += span) {
        const mastSide = Math.floor(mx / span) % 2 === 0 ? -1 : 1;
        const mastY = mastSide * (track.ballastWidth ?? 38) * 0.55;

        // Concrete mast base
        ctx.fillStyle = '#64748b';
        ctx.fillRect(mx - 2.5, mastY - 2.5, 5.0, 5.0);

        // Cantilever horizontal support bracket (консоль опоры)
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(mx, mastY);
        ctx.lineTo(mx, 0);
        ctx.stroke();

        // Ceramic suspension insulator (гирлянда изоляторов)
        ctx.fillStyle = '#0891b2'; // Turquoise polymer insulator
        ctx.fillRect(mx - 1.5, -mastSide * 2.0, 3.0, 2.5);
      }

      ctx.restore();
    }
  }

  /**
   * 5. Renders grand architectural neoclassical roofs for the Railway Station,
   * freight depot warehouse, and level crossing post.
   */
  public static renderRailwayBuildingRoof(
    ctx: CanvasRenderingContext2D,
    bld: Building,
    nightAlpha: number
  ): void {
    ctx.save();

    if (bld.type === 'railway_station') {
      // --- NEOCLASSICAL GRAND RAILWAY STATION BUILDING ---
      const W = bld.width;
      const H = bld.height;

      // 1. Foundation Drop Shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.fillRect(bld.x - 6, bld.y - 6, W + 12, H + 12);

      // 2. Base Roof Cladding (Dark weathered zinc-slate / copper)
      ctx.fillStyle = bld.roofColor || '#334155';
      ctx.fillRect(bld.x, bld.y, W, H);

      // Roof perimeter parapet & stone cornices (карниз и парапет)
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3.0;
      ctx.strokeRect(bld.x + 1, bld.y + 1, W - 2, H - 2);

      // 3. Symmetrical East and West Wing Pavilions (крылья вокзала)
      const wingW = W * 0.24;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bld.x + 3, bld.y + 3, wingW, H - 6);
      ctx.fillRect(bld.x + W - wingW - 3, bld.y + 3, wingW, H - 6);

      // Mansard hip roof angles on wings
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // West wing
      ctx.moveTo(bld.x + 3, bld.y + 3); ctx.lineTo(bld.x + wingW * 0.5, bld.y + H * 0.5);
      ctx.moveTo(bld.x + wingW, bld.y + 3); ctx.lineTo(bld.x + wingW * 0.5, bld.y + H * 0.5);
      // East wing
      ctx.moveTo(bld.x + W - wingW - 3, bld.y + 3); ctx.lineTo(bld.x + W - wingW * 0.5, bld.y + H * 0.5);
      ctx.moveTo(bld.x + W - 3, bld.y + 3); ctx.lineTo(bld.x + W - wingW * 0.5, bld.y + H * 0.5);
      ctx.stroke();

      // 4. Grand Central Concourse (Центральный пассажирский зал)
      const centerW = W * 0.46;
      const centerX = bld.x + (W - centerW) / 2;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(centerX, bld.y + 3, centerW, H - 6);

      // Large Glass Barrel-Vault Skylight (фонарь верхнего света центрального вестибюля)
      const skylightW = centerW * 0.76;
      const skylightH = H * 0.5;
      const slX = centerX + (centerW - skylightW) / 2;
      const slY = bld.y + (H - skylightH) / 2;

      ctx.fillStyle = nightAlpha > 0.3 ? '#0284c7' : '#0ea5e9';
      ctx.fillRect(slX, slY, skylightW, skylightH);

      // Skylight mullion glass ribs
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(slX, slY, skylightW, skylightH);
      for (let rx = slX + 16; rx < slX + skylightW - 10; rx += 20) {
        ctx.beginPath();
        ctx.moveTo(rx, slY); ctx.lineTo(rx, slY + skylightH);
        ctx.stroke();
      }

      // 5. Classical North Entrance Portico & Triangular Pediment (Front station square)
      const pedW = centerW * 0.7;
      const pedX = centerX + (centerW - pedW) / 2;
      ctx.fillStyle = '#475569';
      ctx.fillRect(pedX, bld.y - 12, pedW, 14);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.0;
      ctx.strokeRect(pedX, bld.y - 12, pedW, 14);

      // Roman Station Clock atop north pediment
      const clockX = bld.x + W / 2;
      const clockY = bld.y - 5;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(clockX, clockY, 8.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b45309'; // Brass bezel
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(clockX - 0.8, clockY - 5.5, 1.6, 5.5);
      ctx.fillRect(clockX, clockY - 0.8, 4.5, 1.6);

      // 6. Illuminated Cyrillic Station Roof Sign: «ВОКЗАЛ СТЕПНАЯ»
      const signText = 'ВОКЗАЛ СТЕПНАЯ';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      if (nightAlpha > 0.2) {
        ctx.fillStyle = 'rgba(234, 179, 8, 0.45)';
        ctx.fillText(signText, clockX, bld.y - 16);
      }
      ctx.fillStyle = '#facc15'; // Bright gold lettering
      ctx.fillText(signText, clockX, bld.y - 17);

      // 7. Classical South Entrance Portico (Facing Platform 1)
      const southPedY = bld.y + H - 2;
      ctx.fillStyle = '#475569';
      ctx.fillRect(pedX, southPedY, pedW, 14);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.0;
      ctx.strokeRect(pedX, southPedY, pedW, 14);

      // South Station Clock
      const southClockY = bld.y + H + 5;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(clockX, southClockY, 7.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(clockX - 0.8, southClockY - 4.5, 1.6, 4.5);
      ctx.fillRect(clockX, southClockY - 0.8, 4.0, 1.6);

      // 7. Roof ventilation pods & chimneys
      ctx.fillStyle = '#334155';
      ctx.fillRect(bld.x + wingW * 0.25, bld.y + 6, 6, 6);
      ctx.fillRect(bld.x + W - wingW * 0.25 - 6, bld.y + 6, 6, 6);
      ctx.fillRect(bld.x + wingW * 0.25, bld.y + H - 12, 6, 6);
      ctx.fillRect(bld.x + W - wingW * 0.25 - 6, bld.y + H - 12, 6, 6);

    } else if (bld.type === 'railway_warehouse') {
      // --- FREIGHT WAREHOUSE (ГРУЗОВОЙ ПАКГАУЗ) ---
      const W = bld.width;
      const H = bld.height;

      // Drop shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.fillRect(bld.x - 3, bld.y - 3, W + 6, H + 6);

      // Weathered corrugated metal roof
      ctx.fillStyle = '#475569';
      ctx.fillRect(bld.x, bld.y, W, H);

      // Central roof ridge (конек крыши)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(bld.x, bld.y + H / 2);
      ctx.lineTo(bld.x + W, bld.y + H / 2);
      ctx.stroke();

      // Corrugation sheets
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.lineWidth = 0.8;
      for (let x = bld.x + 8; x < bld.x + W - 4; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x, bld.y); ctx.lineTo(x, bld.y + H);
        ctx.stroke();
      }

      // Warehouse sign: «ГРУЗОВОЙ ДВОР»
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ГРУЗОВОЙ ДВОР ПЧ-12', bld.x + W / 2, bld.y + 9);

    } else if (bld.type === 'railway_crossing_post') {
      // --- CROSSING GUARD CABIN (ПОСТ ДЕЖУРНОГО ПО ПЕРЕЕЗДУ) ---
      const W = bld.width;
      const H = bld.height;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.fillRect(bld.x - 2, bld.y - 2, W + 4, H + 4);

      // Brown clay tile roof
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(bld.x, bld.y, W, H);

      // White cornice
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1.0;
      ctx.strokeRect(bld.x + 1, bld.y + 1, W - 2, H - 2);

      // Small brick chimney
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(bld.x + 3, bld.y + 3, 4, 4);

      // Radio antenna mast
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(bld.x + W - 3, bld.y + 3);
      ctx.lineTo(bld.x + W - 3, bld.y - 8);
      ctx.stroke();
    }

    ctx.restore();
  }
}
