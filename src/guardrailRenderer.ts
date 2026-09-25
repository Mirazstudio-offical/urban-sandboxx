import { GameWorld, GuardrailSegment, Vector2D } from './types';

export class GuardrailRenderer {
  /**
   * Renders all visible soft guardrails and impact attenuators in the world viewport.
   */
  public static renderGuardrails(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    nightAlpha: number = 0
  ): void {
    if (!world.guardrails || world.guardrails.length === 0) {
      return;
    }

    const margin = 100;
    for (const rail of world.guardrails) {
      const rMinX = Math.min(rail.x1, rail.x2) - margin;
      const rMaxX = Math.max(rail.x1, rail.x2) + margin;
      const rMinY = Math.min(rail.y1, rail.y2) - margin;
      const rMaxY = Math.max(rail.y1, rail.y2) + margin;

      // Viewport culling
      if (rMaxX < minX || rMinX > maxX || rMaxY < minY || rMinY > maxY) {
        continue;
      }

      this.renderSingleGuardrail(ctx, rail, nightAlpha);
    }
  }

  private static renderSingleGuardrail(
    ctx: CanvasRenderingContext2D,
    rail: GuardrailSegment,
    nightAlpha: number
  ): void {
    const dx = rail.x2 - rail.x1;
    const dy = rail.y2 - rail.y1;
    const length = Math.hypot(dx, dy);
    if (length < 10) return;

    const angle = Math.atan2(dy, dx);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const normX = -sin;
    const normY = cos;

    ctx.save();

    // -----------------------------------------------------------------------
    // 1. SOFT GROUND SHADOW (Тень от металлического отбойника на дорожном полотне)
    // -----------------------------------------------------------------------
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.lineWidth = rail.width + 4;
    ctx.lineCap = 'round';
    ctx.moveTo(rail.x1 + 3, rail.y1 + 4);
    ctx.lineTo(rail.x2 + 3, rail.y2 + 4);
    ctx.stroke();

    // -----------------------------------------------------------------------
    // 2. SUPPORT POSTS (Металлические двутавровые стойки с распорками)
    // Spaced at realistic 22px intervals along the beam
    // -----------------------------------------------------------------------
    const postSpacing = 22;
    const numPosts = Math.floor(length / postSpacing);
    const startOffset = rail.hasStartAttenuator ? (rail.startAttenuatorLength || 28) : 6;
    const endOffset = rail.hasEndAttenuator ? length - (rail.endAttenuatorLength || 28) : length - 6;

    for (let i = 0; i <= numPosts; i++) {
      const dist = i * postSpacing;
      if (dist < startOffset || dist > endOffset) continue;

      const t = dist / length;
      // Interpolate position with local deformation
      const defOffset = this.getDeformationOffset(rail, t);
      const px = rail.x1 + dx * t + normX * defOffset;
      const py = rail.y1 + dy * t + normY * defOffset;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);

      // Steel I-beam cross section (top-down view)
      ctx.fillStyle = '#334155';
      ctx.fillRect(-2, -rail.width * 0.7, 4, rail.width * 1.4);
      // Metal flange caps
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-3, -rail.width * 0.7, 6, 2);
      ctx.fillRect(-3, rail.width * 0.7 - 2, 6, 2);
      // Fastener bolt highlight
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // -----------------------------------------------------------------------
    // 3. GALVANIZED STEEL W-BEAM PROFILE (Оцинкованная профилированная балка)
    // Multi-pass corrugated wave profile with realistic specular highlights
    // -----------------------------------------------------------------------
    const steps = Math.max(10, Math.floor(length / 10));
    const pts: { x: number; y: number }[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const defOffset = this.getDeformationOffset(rail, t);
      pts.push({
        x: rail.x1 + dx * t + normX * defOffset,
        y: rail.y1 + dy * t + normY * defOffset,
      });
    }

    // Draw main structural beam layers
    if (pts.length >= 2) {
      // Layer A: Dark galvanized base edge
      ctx.beginPath();
      ctx.lineWidth = rail.width;
      ctx.strokeStyle = '#475569';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();

      // Layer B: Steel zinc body
      ctx.beginPath();
      ctx.lineWidth = Math.max(2, rail.width - 2);
      ctx.strokeStyle = '#94a3b8';
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();

      // Layer C: Top corrugated specular ridge highlight
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#e2e8f0';
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();

      // Layer D: For double-sided median guardrail, add double wave crests
      if (rail.type === 'double_w_beam') {
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#f8fafc';
        ctx.moveTo(pts[0].x + normX * 1.5, pts[0].y + normY * 1.5);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x + normX * 1.5, pts[i].y + normY * 1.5);
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#cbd5e1';
        ctx.moveTo(pts[0].x - normX * 1.5, pts[0].y - normY * 1.5);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x - normX * 1.5, pts[i].y - normY * 1.5);
        }
        ctx.stroke();
      }
    }

    // -----------------------------------------------------------------------
    // 4. RETROREFLECTIVE DELINEATORS (Катафоты КД-1 / КД-2)
    // Red on right shoulder, white on left, bright amber on median divider
    // -----------------------------------------------------------------------
    const reflectorSpacing = 44;
    const numReflectors = Math.floor(length / reflectorSpacing);

    for (let i = 1; i < numReflectors; i++) {
      const dist = i * reflectorSpacing;
      if (dist < startOffset || dist > endOffset) continue;

      const t = dist / length;
      const defOffset = this.getDeformationOffset(rail, t);
      const rx = rail.x1 + dx * t + normX * defOffset;
      const ry = rail.y1 + dy * t + normY * defOffset;

      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(angle);

      // Reflector bracket base
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-1.5, -rail.width * 0.8, 3, rail.width * 1.6);

      if (rail.isSideBarrier) {
        // Red catadioptric prism on outer side, white on inner
        ctx.fillStyle = '#ef4444'; // Red reflector
        ctx.fillRect(-1, -rail.width * 0.7, 2, 2.5);
        ctx.fillStyle = '#f8fafc'; // White reflector
        ctx.fillRect(-1, rail.width * 0.7 - 2.5, 2, 2.5);
      } else {
        // Bright amber double-sided prism for median divider
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-1, -rail.width * 0.7, 2, 2.5);
        ctx.fillRect(-1, rail.width * 0.7 - 2.5, 2, 2.5);
      }

      ctx.restore();
    }

    // -----------------------------------------------------------------------
    // 5. CRASH CUSHIONS & IMPACT ATTENUATORS AT THE TERMINALS (Ударогасители)
    // Heavy-duty energy absorbing telescoping cartridges with chevron hazard face
    // -----------------------------------------------------------------------
    if (rail.hasStartAttenuator) {
      this.renderImpactAttenuator(
        ctx,
        rail.x1,
        rail.y1,
        angle + Math.PI, // Facing outwards at the start
        rail.startAttenuatorLength || 32,
        rail.startAttenuatorCompression,
        rail.width,
        rail.isSideBarrier
      );
    }

    if (rail.hasEndAttenuator) {
      this.renderImpactAttenuator(
        ctx,
        rail.x2,
        rail.y2,
        angle, // Facing outwards at the end
        rail.endAttenuatorLength || 32,
        rail.endAttenuatorCompression,
        rail.width,
        rail.isSideBarrier
      );
    }

    // -----------------------------------------------------------------------
    // 6. SCUFF MARKS & PLASTIC DEFORMATION CRUMPLES (Следы ударов и деформаций)
    // -----------------------------------------------------------------------
    if (rail.deformations && rail.deformations.length > 0) {
      for (const def of rail.deformations) {
        const defX = rail.x1 + dx * def.t + normX * def.lateralOffset;
        const defY = rail.y1 + dy * def.t + normY * def.lateralOffset;

        ctx.save();
        ctx.translate(defX, defY);
        ctx.rotate(angle);

        // Metallic scrape scratch texture
        ctx.strokeStyle = 'rgba(241, 245, 249, 0.75)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-10, -1);
        ctx.lineTo(10, 1);
        ctx.moveTo(-8, 1);
        ctx.lineTo(8, -1);
        ctx.stroke();

        // Burnished dark friction mark
        ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
        ctx.fillRect(-6, -2, 12, 4);

        ctx.restore();
      }
    }

    ctx.restore();
  }

  /**
   * Renders a single crumpling metal energy-absorbing terminal section (Мнущийся металлический концевой элемент отбойника).
   * Features a rounded steel impact head with telescoping crumple creases attached directly to the rail.
   */
  private static renderImpactAttenuator(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    headingAngle: number,
    baseLength: number,
    compression: number,
    guardrailWidth: number,
    isSideBarrier?: boolean
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(headingAngle);

    const comp = Math.max(0, Math.min(1.0, compression));
    const currentLength = baseLength * (1 - 0.65 * comp);
    const cushionWidth = Math.max(7, guardrailWidth + 3);

    // 1. Ground Anchor & Guide Channel
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-2, -cushionWidth / 2 - 0.5, currentLength + 2, cushionWidth + 1);

    // 2. Single Crumpling Galvanized Steel Terminal Box (Мнущийся металлический короб)
    const boxGradient = ctx.createLinearGradient(0, -cushionWidth / 2, 0, cushionWidth / 2);
    boxGradient.addColorStop(0, '#cbd5e1');
    boxGradient.addColorStop(0.3, '#f8fafc');
    boxGradient.addColorStop(0.7, '#94a3b8');
    boxGradient.addColorStop(1, '#475569');

    ctx.fillStyle = boxGradient;
    ctx.fillRect(0, -cushionWidth / 2, currentLength, cushionWidth);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, -cushionWidth / 2, currentLength, cushionWidth);

    // 3. Energy-Absorbing Steel Friction Pins / Diaphragms
    const numFolds = 3;
    const foldLen = currentLength / numFolds;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.2;

    for (let f = 1; f < numFolds; f++) {
      const fx = f * foldLen;
      ctx.beginPath();
      ctx.moveTo(fx, -cushionWidth / 2);
      ctx.lineTo(fx, cushionWidth / 2);
      ctx.stroke();

      // Buckled metal accordion creases if compressed
      if (comp > 0.15) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(fx - foldLen * 0.4, -cushionWidth / 2 + 1);
        ctx.lineTo(fx, 0);
        ctx.lineTo(fx - foldLen * 0.4, cushionWidth / 2 - 1);
        ctx.stroke();
      }
    }

    // 4. Rounded Metal Front Impact Head (Скругленный лобовой надув/оголовок)
    const headX = currentLength;
    const headW = 5;
    const headH = cushionWidth + 3;

    // Curved steel rounded cap face
    ctx.beginPath();
    ctx.fillStyle = '#1e293b';
    ctx.roundRect(headX - 1, -headH / 2, headW + 2, headH, 3);
    ctx.fill();

    // High-contrast diagonal Chevron hazard marking (ГОСТ 1.34)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(headX, -headH / 2, headW, headH, 2);
    ctx.clip();

    ctx.fillStyle = '#facc15';
    ctx.fillRect(headX, -headH / 2, headW, headH);

    ctx.fillStyle = '#0f172a';
    for (let s = -headH; s <= headH; s += 5) {
      ctx.beginPath();
      ctx.moveTo(headX, s);
      ctx.lineTo(headX + headW, s + 2.5);
      ctx.lineTo(headX + headW, s + 5);
      ctx.lineTo(headX, s + 2.5);
      ctx.fill();
    }
    ctx.restore();

    // Steel cap outer rim
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1;
    ctx.strokeRect(headX, -headH / 2, headW, headH);

    ctx.restore();
  }

  /**
   * Helper to compute smoothed lateral plastic deformation offset at normalized coordinate t along the rail.
   * Calculates local bend reach in actual world pixels (spanPx) rather than segment percentage.
   */
  private static getDeformationOffset(rail: GuardrailSegment, t: number): number {
    if (!rail.deformations || rail.deformations.length === 0) {
      return 0;
    }

    const dx = rail.x2 - rail.x1;
    const dy = rail.y2 - rail.y1;
    const railLength = Math.hypot(dx, dy);
    if (railLength < 1) return 0;

    let totalOffset = 0;
    for (const def of rail.deformations) {
      // World pixel distance along segment from deformation point
      const distPx = Math.abs((t - def.t) * railLength);
      // Dent reach in world pixels (e.g., 36px = ~2 meters)
      const spanPx = def.extent || 36;
      if (distPx < spanPx) {
        // Cosine bell curve falloff over localized spanPx
        const factor = 0.5 * (1 + Math.cos((distPx / spanPx) * Math.PI));
        totalOffset += def.lateralOffset * factor;
      }
    }
    return totalOffset;
  }
}
