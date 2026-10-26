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

interface GridCell<T> {
  frameId: number;
  items: T[];
}

export class SpatialGrid<T extends SpatialItem> {
  private cellSize: number;
  private invCellSize: number;
  private grid: Map<number, GridCell<T>> = new Map();
  private frameId: number = 1;
  private currentQueryId: number = 0;

  constructor(cellSize: number = 200) {
    this.cellSize = cellSize;
    this.invCellSize = 1 / cellSize;
  }

  public clear() {
    this.frameId++;
    if (this.frameId > 2000000000) {
      this.frameId = 1;
      for (const cell of this.grid.values()) {
        cell.items.length = 0;
        cell.frameId = 0;
      }
    }
  }

  public remove(item: T | { id: string }) {
    const itemId = typeof item === 'string' ? item : item.id;
    const curFrame = this.frameId;
    for (const cell of this.grid.values()) {
      if (cell.frameId === curFrame) {
        const idx = cell.items.findIndex(i => i.id === itemId);
        if (idx !== -1) {
          cell.items.splice(idx, 1);
        }
      }
    }
  }

  public insert(item: T) {
    const halfW = (item.width || (item.radius ? item.radius * 2 : 20)) * 0.5;
    const halfH = (item.height || (item.radius ? item.radius * 2 : 20)) * 0.5;

    const inv = this.invCellSize;
    const minCx = Math.floor((item.x - halfW) * inv);
    const maxCx = Math.floor((item.x + halfW) * inv);
    const minCy = Math.floor((item.y - halfH) * inv);
    const maxCy = Math.floor((item.y + halfH) * inv);
    const curFrame = this.frameId;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = (((cx & 0xffff) << 16) | (cy & 0xffff)) >>> 0;
        let cell = this.grid.get(key);
        if (cell === undefined) {
          cell = { frameId: curFrame, items: [item] };
          this.grid.set(key, cell);
        } else if (cell.frameId !== curFrame) {
          cell.frameId = curFrame;
          cell.items.length = 0;
          cell.items.push(item);
        } else {
          cell.items.push(item);
        }
      }
    }
  }

  public queryRect(x: number, y: number, width: number, height: number, out?: T[]): T[] {
    const inv = this.invCellSize;
    const minCx = Math.floor(x * inv);
    const maxCx = Math.floor((x + width) * inv);
    const minCy = Math.floor(y * inv);
    const maxCy = Math.floor((y + height) * inv);

    this.currentQueryId++;
    if (this.currentQueryId > 2000000000) this.currentQueryId = 1;
    const qId = this.currentQueryId;
    const curFrame = this.frameId;

    const result: T[] = out ? (out.length = 0, out) : [];

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = (((cx & 0xffff) << 16) | (cy & 0xffff)) >>> 0;
        const cell = this.grid.get(key);
        if (cell !== undefined && cell.frameId === curFrame) {
          const items = cell.items;
          const len = items.length;
          for (let i = 0; i < len; i++) {
            const item = items[i];
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

  public queryRadius(x: number, y: number, radius: number, out?: T[]): T[] {
    return this.queryRect(x - radius, y - radius, radius * 2, radius * 2, out);
  }

  public queryCallback(x: number, y: number, width: number, height: number, callback: (item: T) => void): void {
    const inv = this.invCellSize;
    const minCx = Math.floor(x * inv);
    const maxCx = Math.floor((x + width) * inv);
    const minCy = Math.floor(y * inv);
    const maxCy = Math.floor((y + height) * inv);

    this.currentQueryId++;
    if (this.currentQueryId > 2000000000) this.currentQueryId = 1;
    const qId = this.currentQueryId;
    const curFrame = this.frameId;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = (((cx & 0xffff) << 16) | (cy & 0xffff)) >>> 0;
        const cell = this.grid.get(key);
        if (cell !== undefined && cell.frameId === curFrame) {
          const items = cell.items;
          const len = items.length;
          for (let i = 0; i < len; i++) {
            const item = items[i];
            if (item._gridQueryId !== qId) {
              item._gridQueryId = qId;
              callback(item);
            }
          }
        }
      }
    }
  }
}
