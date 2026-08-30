/**
 * High-performance 2D Spatial Hash Grid for broadphase collision detection & viewport culling
 */

export interface SpatialItem {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  _gridQueryId?: number;
}

export class SpatialGrid<T extends SpatialItem> {
  private cellSize: number;
  private grid: Map<number, T[]> = new Map();
  private currentQueryId: number = 0;
  private reusableResult: T[] = [];

  constructor(cellSize: number = 200) {
    this.cellSize = cellSize;
  }

  private getKey(cx: number, cy: number): number {
    return ((cx & 0xffff) << 16) | (cy & 0xffff);
  }

  public clear() {
    this.grid.clear();
  }

  public insert(item: T) {
    const w = item.width || (item.radius ? item.radius * 2 : 20);
    const h = item.height || (item.radius ? item.radius * 2 : 20);
    
    const minX = Math.min(item.x, item.x - w / 2);
    const maxX = Math.max(item.x + w, item.x + w / 2);
    const minY = Math.min(item.y, item.y - h / 2);
    const maxY = Math.max(item.y + h, item.y + h / 2);

    const minCx = Math.floor(minX / this.cellSize);
    const maxCx = Math.floor(maxX / this.cellSize);
    const minCy = Math.floor(minY / this.cellSize);
    const maxCy = Math.floor(maxY / this.cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this.getKey(cx, cy);
        let cell = this.grid.get(key);
        if (!cell) {
          cell = [];
          this.grid.set(key, cell);
        }
        cell.push(item);
      }
    }
  }

  public queryRect(x: number, y: number, width: number, height: number): T[] {
    const minCx = Math.floor(x / this.cellSize);
    const maxCx = Math.floor((x + width) / this.cellSize);
    const minCy = Math.floor(y / this.cellSize);
    const maxCy = Math.floor((y + height) / this.cellSize);

    this.currentQueryId++;
    if (this.currentQueryId > 2000000000) this.currentQueryId = 1;
    const qId = this.currentQueryId;

    const result: T[] = [];

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this.getKey(cx, cy);
        const cell = this.grid.get(key);
        if (cell) {
          const len = cell.length;
          for (let i = 0; i < len; i++) {
            const item = cell[i];
            if (item._gridQueryId !== qId) {
              item._gridQueryId = qId;
              result.push(item);
            }
          }
        }
      }
    }

    return result;
  }

  public queryRadius(x: number, y: number, radius: number): T[] {
    return this.queryRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}
