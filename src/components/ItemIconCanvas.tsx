import React, { useEffect, useRef } from 'react';
import { drawItemModel2D } from '../itemGraphic';

interface ItemIconCanvasProps {
  itemId: string;
  size?: number; // Canvas width and height in px
  className?: string;
}

export const ItemIconCanvas: React.FC<ItemIconCanvasProps> = ({
  itemId,
  size = 32,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);
    drawItemModel2D(ctx, itemId, size / 2, size / 2, size * 0.78);
    ctx.restore();
  }, [itemId, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`inline-block pointer-events-none ${className}`}
    />
  );
};
