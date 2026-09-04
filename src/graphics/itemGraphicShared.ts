// Shared procedural 2D canvas drawing helpers for realistic item models

export function drawShadow(
  ctx: CanvasRenderingContext2D,
  rx: number = 7,
  ry: number = 2.6,
  y: number = 7.5,
  alpha: number = 0.22,
  x: number = 0.5
) {
  ctx.save();
  ctx.fillStyle = `rgba(15, 23, 42, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(1, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawGlossBand(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha: number = 0.35
) {
  ctx.save();
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

export function drawMedicalCross(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number = 4,
  color: string = '#ffffff'
) {
  ctx.save();
  ctx.fillStyle = color;
  const bar = size * 0.36;
  ctx.fillRect(x - bar / 2, y - size / 2, bar, size);
  ctx.fillRect(x - size / 2, y - bar / 2, size, bar);
  ctx.restore();
}
