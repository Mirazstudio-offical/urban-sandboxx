const fs = require('fs');
const path = require('path');

// Color palettes for authentic variety
const BED_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#e11d48', '#d97706'];
const SOFA_COLORS = ['#1e3a8a', '#475569', '#334155', '#7c2d12', '#065f46', '#581c87', '#155e75', '#831843', '#374151'];
const RUG_COLORS = ['#334155', '#1e293b', '#475569', '#3b0764', '#064e3b', '#7c2d12', '#1e3a8a', '#374151', '#4c1d95'];
const WOOD_COLORS = ['#78350f', '#451a03', '#3e2213', '#713f12', '#292524', '#573012', '#64748b'];

function getApartmentDoor(rm, walls) {
  const rx1 = rm.x;
  const ry1 = rm.y;
  const rx2 = rm.x + rm.width;
  const ry2 = rm.y + rm.height;
  const eps = 2.0;

  // Bottom
  const bottomWalls = walls.filter(w => Math.abs(w.y1 - ry2) < eps && Math.abs(w.y2 - ry2) < eps);
  if (bottomWalls.length > 0) {
    const segs = bottomWalls.map(w => ({ x1: Math.min(w.x1, w.x2), x2: Math.max(w.x1, w.x2) }))
      .filter(s => s.x2 > rx1 && s.x1 < rx2)
      .sort((a, b) => a.x1 - b.x1);
    let curX = rx1;
    for (const s of segs) {
      if (s.x1 > curX + 5) return { side: 'bottom', x1: curX, y1: ry2, x2: s.x1, y2: ry2 };
      curX = Math.max(curX, s.x2);
    }
    if (curX < rx2 - 5) return { side: 'bottom', x1: curX, y1: ry2, x2: rx2, y2: ry2 };
  }

  // Top
  const topWalls = walls.filter(w => Math.abs(w.y1 - ry1) < eps && Math.abs(w.y2 - ry1) < eps);
  if (topWalls.length > 0) {
    const segs = topWalls.map(w => ({ x1: Math.min(w.x1, w.x2), x2: Math.max(w.x1, w.x2) }))
      .filter(s => s.x2 > rx1 && s.x1 < rx2)
      .sort((a, b) => a.x1 - b.x1);
    let curX = rx1;
    for (const s of segs) {
      if (s.x1 > curX + 5) return { side: 'top', x1: curX, y1: ry1, x2: s.x1, y2: ry1 };
      curX = Math.max(curX, s.x2);
    }
    if (curX < rx2 - 5) return { side: 'top', x1: curX, y1: ry1, x2: rx2, y2: ry1 };
  }

  // Left
  const leftWalls = walls.filter(w => Math.abs(w.x1 - rx1) < eps && Math.abs(w.x2 - rx1) < eps);
  if (leftWalls.length > 0) {
    const segs = leftWalls.map(w => ({ y1: Math.min(w.y1, w.y2), y2: Math.max(w.y1, w.y2) }))
      .filter(s => s.y2 > ry1 && s.y1 < ry2)
      .sort((a, b) => a.y1 - b.y1);
    let curY = ry1;
    for (const s of segs) {
      if (s.y1 > curY + 5) return { side: 'left', x1: rx1, y1: curY, x2: rx1, y2: s.y1 };
      curY = Math.max(curY, s.y2);
    }
    if (curY < rx2 - 5) return { side: 'left', x1: rx1, y1: curY, x2: rx1, y2: ry2 };
  }

  // Right
  const rightWalls = walls.filter(w => Math.abs(w.x1 - rx2) < eps && Math.abs(w.x2 - rx2) < eps);
  if (rightWalls.length > 0) {
    const segs = rightWalls.map(w => ({ y1: Math.min(w.y1, w.y2), y2: Math.max(w.y1, w.y2) }))
      .filter(s => s.y2 > ry1 && s.y1 < ry2)
      .sort((a, b) => a.y1 - b.y1);
    let curY = ry1;
    for (const s of segs) {
      if (s.y1 > curY + 5) return { side: 'right', x1: rx2, y1: curY, x2: rx2, y2: s.y1 };
      curY = Math.max(curY, s.y2);
    }
    if (curY < rx2 - 5) return { side: 'right', x1: rx2, y1: curY, x2: rx2, y2: ry2 };
  }

  return { side: 'bottom', x1: rm.x + rm.width / 2 - 12, y1: ry2, x2: rm.x + rm.width / 2 + 12, y2: ry2 };
}

/**
 * Check if two items collide (except allowed layers like rugs or items on desks/counters).
 */
function checkPairCollision(f1, f2) {
  if (f1.type === 'carpet' || f2.type === 'carpet') return false;
  if ((f1.type === 'computer' && f2.type === 'desk') || (f2.type === 'computer' && f1.type === 'desk')) return false;
  if ((f1.type === 'tv' && f2.type === 'tv_cabinet') || (f2.type === 'tv' && f1.type === 'tv_cabinet')) return false;
  if ((f1.type === 'microwave' && f2.type === 'kitchen_counter') || (f2.type === 'microwave' && f1.type === 'kitchen_counter')) return false;

  const ox = Math.min(f1.x + f1.width, f2.x + f2.width) - Math.max(f1.x, f2.x);
  const oy = Math.min(f1.y + f1.height, f2.y + f2.height) - Math.max(f1.y, f2.y);
  return (ox > 0.5 && oy > 0.5);
}

/**
 * Generate rich, realistic, zero-overlap, player-passable interior for an apartment room.
 */
function generateApartmentFurniture(apt, door, floor, aptNum, bldType) {
  const items = [];
  const W = apt.width;
  const H = apt.height;
  const X = apt.x;
  const Y = apt.y;

  const seed = (aptNum * 19 + floor * 37 + Math.round(X) * 7 + Math.round(Y) * 13);
  const bedColor = BED_COLORS[seed % BED_COLORS.length];
  const sofaColor = SOFA_COLORS[(seed + 2) % SOFA_COLORS.length];
  const rugColor = RUG_COLORS[(seed + 4) % RUG_COLORS.length];
  const woodColor = WOOD_COLORS[(seed + 1) % WOOD_COLORS.length];
  const layoutStyle = seed % 3;

  function addItem(item) {
    const minX = X + 2;
    const maxX = X + W - item.width - 2;
    const minY = Y + 2;
    const maxY = Y + H - item.height - 2;

    const clampedX = Math.max(minX, Math.min(maxX, Math.round(item.x * 10) / 10));
    const clampedY = Math.max(minY, Math.min(maxY, Math.round(item.y * 10) / 10));

    const finalItem = {
      type: item.type,
      x: clampedX,
      y: clampedY,
      width: Math.round(item.width * 10) / 10,
      height: Math.round(item.height * 10) / 10,
      angle: item.angle || 0,
      color: item.color
    };

    // Strict validation: do not add if it overlaps with an already placed non-carpet item
    for (const existing of items) {
      if (checkPairCollision(finalItem, existing)) {
        // Skip colliding item or report
        return false;
      }
    }

    items.push(finalItem);
    return true;
  }

  // =========================================================================
  // CATEGORY 1: Compact Horizontal Apartment (W: ~57..62, H: ~98)
  // =========================================================================
  if (W < 90 && H >= 85) {
    const doorOnRight = (door.side === 'right');

    if (doorOnRight) {
      // NORTH ZONE (Living / Bedroom):
      // Bed along left wall (x: X+2..X+24, y: Y+6..Y+28)
      addItem({ type: 'bed', x: X + 2, y: Y + 6, width: 22, height: 22, color: bedColor });
      // Radiator under North window: starts at x: X+26, y: Y+2, width 14, height 4 (x: X+26..X+40)
      addItem({ type: 'radiator', x: X + 26, y: Y + 2, width: 14, height: 4, color: '#e2e8f0' });
      // Nightstand below radiator: x: X+26, y: Y+8, width 6, height 6 (y: Y+8..Y+14)
      addItem({ type: 'nightstand', x: X + 26, y: Y + 8, width: 6, height: 6, color: woodColor });
      // Carpet next to bed: x: X+26, y: Y+16, width 16, height: 12 (y: Y+16..Y+28)
      addItem({ type: 'carpet', x: X + 26, y: Y + 16, width: 16, height: 12, color: rugColor });
      // Wardrobe on East wall above doorway (y: Y+6..Y+14):
      addItem({ type: 'wardrobe', x: X + W - 14, y: Y + 6, width: 12, height: 8, color: woodColor });
      // TV cabinet on East wall: y: Y+16..Y+21
      addItem({ type: 'tv_cabinet', x: X + W - 14, y: Y + 16, width: 12, height: 5, color: '#1e293b' });
      addItem({ type: 'tv', x: X + W - 13, y: Y + 17, width: 10, height: 3, color: '#000000' });
      // Plant in North-East corner:
      addItem({ type: 'plant', x: X + W - 8, y: Y + 2, width: 6, height: 6, color: '#16a34a' });

      // HALLWAY (near door on East wall outside opening y: 39..72):
      addItem({ type: 'coat_rack', x: X + W - 8, y: Y + 30, width: 6, height: 6, color: '#78350f' });
      addItem({ type: 'mirror', x: X + W - 4, y: Y + 73, width: 2, height: 8, color: '#f59e0b' });

      // SOUTH ZONE (Kitchen & Dining):
      // Counter + Stove + Fridge along South wall (y: Y+H-10):
      addItem({ type: 'kitchen_counter', x: X + 2, y: Y + H - 10, width: 16, height: 8, color: '#64748b' });
      addItem({ type: 'stove', x: X + 19, y: Y + H - 10, width: 8, height: 8, color: '#334155' });
      addItem({ type: 'fridge', x: X + 28, y: Y + H - 10, width: 8, height: 8, color: '#cbd5e1' });
      // Radiator under South window:
      addItem({ type: 'radiator', x: X + 38, y: Y + H - 6, width: 14, height: 4, color: '#e2e8f0' });
      // Dining table in kitchen area:
      addItem({ type: 'table', x: X + 10, y: Y + H - 24, width: 14, height: 10, color: '#78350f' });
      addItem({ type: 'chair', x: X + 14, y: Y + H - 31, width: 6, height: 5, color: '#92400e' });
      addItem({ type: 'trash_can', x: X + 2, y: Y + H - 20, width: 4, height: 4, color: '#475569' });
    } else {
      // doorOnLeft: Door on West wall at y: 39..72
      // NORTH ZONE:
      // Bed along right wall (x: X+W-24..X+W-2, y: Y+6..Y+28)
      addItem({ type: 'bed', x: X + W - 24, y: Y + 6, width: 22, height: 22, color: bedColor });
      // Radiator under North window: starts at x: X+18, y: Y+2, width 14, height 4 (x: X+18..X+32)
      addItem({ type: 'radiator', x: X + 18, y: Y + 2, width: 14, height: 4, color: '#e2e8f0' });
      // Nightstand to the left of bed:
      addItem({ type: 'nightstand', x: X + W - 32, y: Y + 6, width: 6, height: 6, color: woodColor });
      // Carpet next to bed:
      addItem({ type: 'carpet', x: X + W - 42, y: Y + 14, width: 16, height: 12, color: rugColor });
      // Wardrobe on West wall above doorway:
      addItem({ type: 'wardrobe', x: X + 2, y: Y + 6, width: 12, height: 8, color: woodColor });
      // TV cabinet on West wall:
      addItem({ type: 'tv_cabinet', x: X + 2, y: Y + 16, width: 12, height: 5, color: '#1e293b' });
      addItem({ type: 'tv', x: X + 3, y: Y + 17, width: 10, height: 3, color: '#000000' });
      // Plant in North-West corner:
      addItem({ type: 'plant', x: X + 2, y: Y + 2, width: 6, height: 6, color: '#16a34a' });

      // HALLWAY (near door on West wall):
      addItem({ type: 'coat_rack', x: X + 2, y: Y + 30, width: 6, height: 6, color: '#78350f' });
      addItem({ type: 'mirror', x: X + 2, y: Y + 73, width: 2, height: 8, color: '#f59e0b' });

      // SOUTH ZONE (Kitchen & Dining):
      // Counter + Stove + Fridge along South wall:
      addItem({ type: 'kitchen_counter', x: X + W - 18, y: Y + H - 10, width: 16, height: 8, color: '#64748b' });
      addItem({ type: 'stove', x: X + W - 28, y: Y + H - 10, width: 8, height: 8, color: '#334155' });
      addItem({ type: 'fridge', x: X + W - 38, y: Y + H - 10, width: 8, height: 8, color: '#cbd5e1' });
      // Radiator under South window:
      addItem({ type: 'radiator', x: X + 6, y: Y + H - 6, width: 14, height: 4, color: '#e2e8f0' });
      // Dining table in kitchen area:
      addItem({ type: 'table', x: X + W - 26, y: Y + H - 24, width: 14, height: 10, color: '#78350f' });
      addItem({ type: 'chair', x: X + W - 22, y: Y + H - 31, width: 6, height: 5, color: '#92400e' });
      addItem({ type: 'trash_can', x: X + W - 6, y: Y + H - 20, width: 4, height: 4, color: '#475569' });
    }

    return items;
  }

  // =========================================================================
  // CATEGORY 2: Medium Vertical Apartment (W: ~98, H: ~80..95)
  // =========================================================================
  if (W >= 85 && W <= 105 && H < 110) {
    const doorOnBottom = (door.side === 'bottom');
    const yKitchenFar = doorOnBottom ? (Y + 2) : (Y + H - 10);
    const yBedFar = doorOnBottom ? (Y + 2) : (Y + H - 24);

    // 1. VERTICAL RADIATORS (On outer walls in gaps where no furniture sits!)
    // West wall radiator at y: Y + 24..38
    addItem({ type: 'radiator', x: X + 2, y: Y + 22, width: 4, height: 14, color: '#e2e8f0' });
    // East wall radiator at y: Y + 28..42
    addItem({ type: 'radiator', x: X + W - 6, y: Y + 28, width: 4, height: 14, color: '#e2e8f0' });

    // 2. WEST WING (Kitchen & Dining) - x: X+2..X+34:
    // Kitchen suite along far wall:
    addItem({ type: 'kitchen_counter', x: X + 8, y: yKitchenFar, width: 16, height: 8, color: '#64748b' });
    addItem({ type: 'stove', x: X + 25, y: yKitchenFar, width: 8, height: 8, color: '#334155' });
    addItem({ type: 'fridge', x: X + 2, y: doorOnBottom ? Y + 40 : Y + H - 32, width: 8, height: 8, color: '#cbd5e1' });
    // Table & Chair:
    addItem({ type: 'table', x: X + 14, y: doorOnBottom ? Y + 40 : Y + H - 32, width: 14, height: 10, color: '#78350f' });
    addItem({ type: 'chair', x: X + 18, y: doorOnBottom ? Y + 52 : Y + H - 40, width: 6, height: 5, color: '#92400e' });
    addItem({ type: 'trash_can', x: X + 2, y: doorOnBottom ? Y + 12 : Y + H - 20, width: 4, height: 4, color: '#475569' });

    // 3. EAST WING (Living / Bedroom) - x: X+64..X+W-2:
    if (layoutStyle === 0) {
      // Master Bed:
      addItem({ type: 'bed', x: X + W - 26, y: yBedFar, width: 22, height: 22, color: bedColor });
      addItem({ type: 'nightstand', x: X + W - 34, y: yBedFar, width: 6, height: 6, color: woodColor });
      addItem({ type: 'carpet', x: X + W - 32, y: doorOnBottom ? Y + 26 : Y + H - 42, width: 18, height: 12, color: rugColor });
      addItem({ type: 'wardrobe', x: X + W - 18, y: doorOnBottom ? Y + H - 14 : Y + 6, width: 16, height: 8, color: woodColor });
      addItem({ type: 'tv_cabinet', x: X + 64, y: doorOnBottom ? Y + 32 : Y + H - 24, width: 14, height: 5, color: '#1e293b' });
      addItem({ type: 'tv', x: X + 65, y: doorOnBottom ? Y + 33 : Y + H - 23, width: 12, height: 3, color: '#000000' });
    } else {
      // Sofa Lounge & Desk:
      addItem({ type: 'sofa', x: X + W - 26, y: yBedFar, width: 22, height: 10, color: sofaColor });
      addItem({ type: 'carpet', x: X + W - 26, y: doorOnBottom ? Y + 14 : Y + H - 24, width: 20, height: 12, color: rugColor });
      addItem({ type: 'desk', x: X + W - 20, y: doorOnBottom ? Y + H - 14 : Y + 6, width: 18, height: 8, color: woodColor });
      addItem({ type: 'computer', x: X + W - 14, y: doorOnBottom ? Y + H - 13 : Y + 7, width: 6, height: 4, color: '#38bdf8' });
      addItem({ type: 'chair', x: X + W - 14, y: doorOnBottom ? Y + H - 22 : Y + 16, width: 6, height: 5, color: '#475569' });
      addItem({ type: 'tv_cabinet', x: X + 64, y: doorOnBottom ? Y + 32 : Y + H - 24, width: 14, height: 5, color: '#1e293b' });
      addItem({ type: 'tv', x: X + 65, y: doorOnBottom ? Y + 33 : Y + H - 23, width: 12, height: 3, color: '#000000' });
      addItem({ type: 'bookshelf', x: X + W - 36, y: yBedFar, width: 8, height: 6, color: woodColor });
    }

    // 4. HALLWAY (near doorway x: 39..72):
    addItem({ type: 'coat_rack', x: X + 31, y: doorOnBottom ? Y + H - 9 : Y + 2, width: 6, height: 6, color: '#78350f' });
    addItem({ type: 'mirror', x: X + 73, y: doorOnBottom ? Y + H - 4 : Y + 2, width: 8, height: 2, color: '#f59e0b' });

    return items;
  }

  // =========================================================================
  // CATEGORY 3: Large Horizontal Apartment (W: ~240..280, H: ~98)
  // =========================================================================
  if (W >= 220) {
    const doorOnRight = (door.side === 'right');
    const xDoorWall = doorOnRight ? (X + W - 8) : (X + 2);

    // 1. RADIATORS (Under top and bottom windows in open spaces!)
    addItem({ type: 'radiator', x: X + 16, y: Y + 2, width: 16, height: 4, color: '#e2e8f0' });
    addItem({ type: 'radiator', x: X + 80, y: Y + 2, width: 16, height: 4, color: '#e2e8f0' });
    addItem({ type: 'radiator', x: X + 150, y: Y + H - 6, width: 16, height: 4, color: '#e2e8f0' });
    addItem({ type: 'radiator', x: X + 210, y: Y + H - 6, width: 16, height: 4, color: '#e2e8f0' });

    // 2. ENTRYWAY & HALLWAY
    addItem({ type: 'coat_rack', x: xDoorWall, y: Y + 30, width: 6, height: 6, color: '#78350f' });
    addItem({ type: 'mirror', x: xDoorWall, y: Y + 74, width: 2, height: 8, color: '#f59e0b' });
    addItem({ type: 'bench', x: doorOnRight ? X + W - 24 : X + 10, y: Y + 30, width: 12, height: 5, color: '#78350f' });

    // 3. BATHROOM SUITE
    const xBath = doorOnRight ? (X + W - 52) : (X + 26);
    addItem({ type: 'bath', x: xBath, y: Y + 6, width: 18, height: 10, color: '#ffffff' });
    addItem({ type: 'sink', x: xBath + 20, y: Y + 6, width: 8, height: 7, color: '#e2e8f0' });
    addItem({ type: 'toilet', x: xBath + 30, y: Y + 6, width: 7, height: 7, color: '#ffffff' });
    addItem({ type: 'washing_machine', x: xBath + 39, y: Y + 6, width: 8, height: 8, color: '#cbd5e1' });

    // 4. KITCHEN & DINING
    const xKitchen = doorOnRight ? (X + W - 92) : (X + 88);
    addItem({ type: 'kitchen_counter', x: xKitchen, y: Y + H - 10, width: 22, height: 8, color: '#64748b' });
    addItem({ type: 'stove', x: xKitchen + 24, y: Y + H - 10, width: 8, height: 8, color: '#334155' });
    addItem({ type: 'fridge', x: xKitchen + 34, y: Y + H - 10, width: 8, height: 8, color: '#cbd5e1' });
    addItem({ type: 'table', x: xKitchen + 8, y: Y + H - 28, width: 18, height: 12, color: '#78350f' });
    addItem({ type: 'chair', x: xKitchen + 14, y: Y + H - 36, width: 6, height: 5, color: '#92400e' });
    addItem({ type: 'trash_can', x: xKitchen + 44, y: Y + H - 8, width: 4, height: 4, color: '#475569' });

    // 5. LIVING ROOM (Center wing)
    const xLiving = X + Math.round(W * 0.40);
    addItem({ type: 'sofa', x: xLiving, y: Y + 6, width: 26, height: 10, color: sofaColor });
    addItem({ type: 'carpet', x: xLiving + 2, y: Y + 18, width: 22, height: 14, color: rugColor });
    addItem({ type: 'tv_cabinet', x: xLiving + 4, y: Y + 36, width: 18, height: 5, color: '#1e293b' });
    addItem({ type: 'tv', x: xLiving + 6, y: Y + 37, width: 14, height: 3, color: '#000000' });
    addItem({ type: 'bookshelf', x: xLiving + 30, y: Y + 6, width: 14, height: 6, color: woodColor });

    // 6. MASTER BEDROOM (Far wing)
    const xBed = doorOnRight ? (X + 6) : (X + W - 82);
    addItem({ type: 'bed', x: xBed, y: Y + 8, width: 24, height: 24, color: bedColor });
    addItem({ type: 'nightstand', x: xBed + 26, y: Y + 8, width: 6, height: 6, color: woodColor });
    addItem({ type: 'carpet', x: xBed + 2, y: Y + 34, width: 20, height: 12, color: rugColor });
    addItem({ type: 'wardrobe', x: xBed + 34, y: Y + 8, width: 16, height: 8, color: woodColor });
    addItem({ type: 'dresser', x: xBed + 34, y: Y + 18, width: 14, height: 6, color: woodColor });
    addItem({ type: 'desk', x: xBed, y: Y + H - 14, width: 18, height: 8, color: woodColor });
    addItem({ type: 'computer', x: xBed + 6, y: Y + H - 13, width: 6, height: 4, color: '#38bdf8' });
    addItem({ type: 'chair', x: xBed + 6, y: Y + H - 21, width: 6, height: 5, color: '#475569' });

    return items;
  }

  // =========================================================================
  // CATEGORY 4: Tall Vertical Apartment (W: ~98, H: ~180..220)
  // =========================================================================
  if (W >= 85 && W <= 105 && H >= 160) {
    const doorOnBottom = (door.side === 'bottom');
    const yFarBed = doorOnBottom ? (Y + 6) : (Y + H - 32);
    const yMid = Math.round(Y + H / 2);

    // 1. RADIATORS (Under windows on West and East walls, in open gaps!)
    addItem({ type: 'radiator', x: X + 2, y: yFarBed + 26, width: 4, height: 14, color: '#e2e8f0' });
    addItem({ type: 'radiator', x: X + W - 6, y: yFarBed + 26, width: 4, height: 14, color: '#e2e8f0' });
    addItem({ type: 'radiator', x: X + 2, y: yMid, width: 4, height: 14, color: '#e2e8f0' });
    addItem({ type: 'radiator', x: X + W - 6, y: yMid, width: 4, height: 14, color: '#e2e8f0' });

    // 2. MASTER BEDROOM (Far end)
    addItem({ type: 'bed', x: X + 36, y: yFarBed, width: 24, height: 24, color: bedColor });
    addItem({ type: 'nightstand', x: X + 28, y: yFarBed, width: 6, height: 6, color: woodColor });
    addItem({ type: 'nightstand', x: X + 62, y: yFarBed, width: 6, height: 6, color: woodColor });
    addItem({ type: 'carpet', x: X + 36, y: doorOnBottom ? yFarBed + 26 : yFarBed - 14, width: 22, height: 12, color: rugColor });
    addItem({ type: 'wardrobe', x: X + 6, y: doorOnBottom ? yFarBed + 42 : yFarBed - 14, width: 16, height: 8, color: woodColor });
    addItem({ type: 'dresser', x: X + W - 22, y: doorOnBottom ? yFarBed + 42 : yFarBed - 14, width: 14, height: 7, color: woodColor });

    // 3. LIVING ROOM (Middle section)
    addItem({ type: 'sofa', x: X + W - 26, y: yMid - 16, width: 22, height: 10, color: sofaColor });
    addItem({ type: 'carpet', x: X + W - 26, y: yMid - 4, width: 20, height: 12, color: rugColor });
    addItem({ type: 'tv_cabinet', x: X + W - 26, y: yMid + 10, width: 18, height: 5, color: '#1e293b' });
    addItem({ type: 'tv', x: X + W - 24, y: yMid + 11, width: 14, height: 3, color: '#000000' });
    addItem({ type: 'desk', x: X + 4, y: yMid - 16, width: 16, height: 8, color: woodColor });
    addItem({ type: 'computer', x: X + 9, y: yMid - 15, width: 6, height: 4, color: '#38bdf8' });
    addItem({ type: 'chair', x: X + 9, y: yMid - 6, width: 6, height: 5, color: '#475569' });
    addItem({ type: 'bookshelf', x: X + 4, y: yMid + 16, width: 14, height: 6, color: woodColor });

    // 4. KITCHEN & BATHROOM (Near door section)
    const yNear = doorOnBottom ? (Y + H - 36) : (Y + 54);
    // West wing Kitchen:
    addItem({ type: 'kitchen_counter', x: X + 4, y: doorOnBottom ? Y + H - 12 : Y + 12, width: 16, height: 8, color: '#64748b' });
    addItem({ type: 'stove', x: X + 22, y: doorOnBottom ? Y + H - 12 : Y + 12, width: 8, height: 8, color: '#334155' });
    addItem({ type: 'fridge', x: X + 4, y: doorOnBottom ? Y + H - 22 : Y + 22, width: 8, height: 8, color: '#cbd5e1' });
    addItem({ type: 'table', x: X + 14, y: doorOnBottom ? Y + H - 36 : Y + 34, width: 14, height: 10, color: '#78350f' });
    addItem({ type: 'chair', x: X + 18, y: doorOnBottom ? Y + H - 43 : Y + 46, width: 6, height: 5, color: '#92400e' });
    addItem({ type: 'trash_can', x: X + 4, y: doorOnBottom ? Y + H - 28 : Y + 32, width: 4, height: 4, color: '#475569' });

    // East wing Bathroom:
    addItem({ type: 'bath', x: X + W - 22, y: doorOnBottom ? Y + H - 30 : Y + 12, width: 18, height: 10, color: '#ffffff' });
    addItem({ type: 'sink', x: X + W - 12, y: doorOnBottom ? Y + H - 18 : Y + 24, width: 8, height: 7, color: '#e2e8f0' });
    addItem({ type: 'toilet', x: X + W - 22, y: doorOnBottom ? Y + H - 18 : Y + 24, width: 7, height: 7, color: '#ffffff' });
    addItem({ type: 'washing_machine', x: X + W - 32, y: doorOnBottom ? Y + H - 18 : Y + 24, width: 8, height: 8, color: '#cbd5e1' });

    // Entryway near door (x: 39..72):
    addItem({ type: 'coat_rack', x: X + 31, y: doorOnBottom ? Y + H - 9 : Y + 2, width: 6, height: 6, color: '#78350f' });
    addItem({ type: 'mirror', x: X + 73, y: doorOnBottom ? Y + H - 4 : Y + 2, width: 8, height: 2, color: '#f59e0b' });

    return items;
  }

  return items;
}

// MAIN
function main() {
  const mapPath = path.join(__dirname, '..', 'public', 'map.json');
  console.log('Loading map from:', mapPath);
  const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

  const resTypes = ['panel_apartment', 'brick_residential', 'modern_residential', 'residential'];
  const resBlds = mapData.buildings.filter(b => resTypes.includes(b.type) && b.interiors);

  let totalApartments = 0;
  let totalFurniture = 0;
  let totalCollisions = 0;

  for (const bld of resBlds) {
    for (const floorKey of Object.keys(bld.interiors)) {
      const floorNum = parseInt(floorKey);
      const layout = bld.interiors[floorKey];
      if (!layout || !Array.isArray(layout.rooms) || !Array.isArray(layout.walls)) continue;

      const walls = layout.walls;
      const aptRooms = layout.rooms.filter(r => r.name && r.name.startsWith('Кв.'));
      const entranceRooms = layout.rooms.filter(r => r.name && r.name.startsWith('Подъезд'));

      // Keep ONLY legitimate entrance furniture (mailbox_bank, hallway radiator, bench, trash_can)
      const keptEntranceFurniture = (layout.furniture || []).filter(f => {
        const isEntranceItem = ['mailbox_bank', 'radiator', 'bench', 'trash_can'].includes(f.type);
        if (!isEntranceItem) return false;
        return entranceRooms.some(ent => {
          return f.x >= ent.x && f.x + f.width <= ent.x + ent.width &&
                 f.y >= ent.y && f.y + f.height <= ent.y + ent.height;
        });
      });

      const newApartmentFurniture = [];

      for (const apt of aptRooms) {
        totalApartments++;
        const aptNum = parseInt(apt.name.replace(/\D/g, '')) || 1;
        const door = getApartmentDoor(apt, walls);

        const aptFurniture = generateApartmentFurniture(apt, door, floorNum, aptNum, bld.type);

        // Verify zero overlap within the apartment
        for (let i = 0; i < aptFurniture.length; i++) {
          for (let j = i + 1; j < aptFurniture.length; j++) {
            if (checkPairCollision(aptFurniture[i], aptFurniture[j])) {
              totalCollisions++;
              console.error(`COLLISION in ${bld.id} fl ${floorKey} ${apt.name}:`, aptFurniture[i].type, aptFurniture[j].type);
            }
          }
        }

        newApartmentFurniture.push(...aptFurniture);
        totalFurniture += aptFurniture.length;
      }

      layout.furniture = [...keptEntranceFurniture, ...newApartmentFurniture];
    }
  }

  console.log(`Results:`);
  console.log(`Apartments processed: ${totalApartments}`);
  console.log(`Furniture items placed: ${totalFurniture}`);
  console.log(`Collisions found: ${totalCollisions}`);

  if (totalCollisions === 0) {
    fs.writeFileSync(mapPath, JSON.stringify(mapData), 'utf8');
    console.log(`Successfully written 0-collision map to ${mapPath}!`);
  } else {
    console.error(`Aborted write due to collisions!`);
  }
}

main();
