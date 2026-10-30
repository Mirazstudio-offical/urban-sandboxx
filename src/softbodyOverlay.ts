import type { Vehicle } from './types';

/**
 * Оверлей softbody-сетки: узлы и балки реального node-beam каркаса каждой машины.
 *
 * Рисуется последним в мировом проходе (поверх кузовов, крыш, дыма, ночного затемнения и
 * ников), в системе координат камеры, поэтому не перекрывается другими объектами.
 * Толщина линий и размер узлов зависят от зума: на дальнем плане сетка не пропадает,
 * на ближнем не становится толстой кашей.
 *
 * Цвета:
 *   - балка без пластической деформации — чёрная, с белым ореолом (читается на любом фоне);
 *   - балка, согнутая необратимо, — от жёлтого к красному по доле пластической деформации;
 *   - разорванная балка — пунктир серым;
 *   - узлы кожи — охра (как было в режиме сетки), узлы каркаса и шасси — светлые, колёса — синие.
 */

const OCHRE = '#c68a35';
const WHEEL = '#2563eb';
const HALO = 'rgba(255, 255, 255, 0.85)';

/** Масштаб линий и узлов в экранных пикселях от зума камеры (корень, чтобы не разбухать при приближении). */
function screenScale(zoom: number): number {
  return Math.max(0.7, Math.min(2.4, Math.sqrt(Math.max(zoom, 0.01))));
}

function plasticColor(ratio: number): string {
  if (ratio < 0.02) return '#000000';
  if (ratio < 0.5) return '#b45309';
  return '#dc2626';
}

export function renderSoftbodyMeshOverlay(ctx: CanvasRenderingContext2D, vehicles: Vehicle[], zoom: number): void {
  const k = screenScale(zoom);
  // Все размеры заданы в экранных пикселях и переводятся в мировые делением на зум.
  const beamPx = 1.1 * k;
  const haloPx = beamPx + 1.6 * k;
  const nodePx = 2.1 * k;
  const nodeRimPx = 0.6 * k;
  const inv = 1 / Math.max(zoom, 0.01);

  ctx.save();
  ctx.lineCap = 'round';
  for (const car of vehicles) {
    const nb = car.damage?.nodeBeam;
    if (!nb || !nb.nodes || nb.nodes.length === 0) continue;
    const nodes = nb.nodes;

    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // 1. Ореол под всеми балками — даёт контраст на тёмном и светлом фоне
    ctx.strokeStyle = HALO;
    ctx.lineWidth = haloPx * inv;
    ctx.beginPath();
    for (const b of nb.beams) {
      const A = nodes[b.nodeA], B = nodes[b.nodeB];
      if (!A || !B || !isFinite(A.x) || !isFinite(B.x)) continue;
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
    }
    ctx.stroke();

    // 2. Балки по цвету пластической деформации; разорванные — пунктиром
    ctx.lineWidth = beamPx * inv;
    for (const b of nb.beams) {
      const A = nodes[b.nodeA], B = nodes[b.nodeB];
      if (!A || !B || !isFinite(A.x) || !isFinite(B.x)) continue;
      if (b.broken) {
        ctx.setLineDash([3 * inv, 3 * inv]);
        ctx.strokeStyle = '#64748b';
      } else {
        ctx.setLineDash([]);
        const ratio = b.yieldDist > 0 ? (b.plasticDeform ?? 0) / b.yieldDist : 0;
        ctx.strokeStyle = plasticColor(ratio);
      }
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 3. Узлы: кожа — охра, колёса — синие, остальные — светлые с тёмным ободом
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!n || !isFinite(n.x) || !isFinite(n.y)) continue;
      const fill = n.group === 'wheel' ? WHEEL : (i < nb.perimeterCount ? OCHRE : '#f8fafc');
      ctx.beginPath();
      ctx.arc(n.x, n.y, nodePx * inv, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = nodeRimPx * inv;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();
    }

    ctx.restore();
  }
  ctx.restore();
}
