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
    if (curY < ry2 - 5) return { side: 'left', x1: rx1, y1: curY, x2: rx1, y2: ry2 };
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
 * Generate rich, realistic, player-passable interior for an apartment room.
 */
function generateApartmentFurniture(apt, door, floor, aptNum, bldType) {
  const items = [];
  const W = apt.width;
  const H = apt.height;
  const X = apt.x;
  const Y = apt.y;

  const seed = (aptNum * 17 + floor * 31 + Math.round(X) * 7 + Math.round(Y) * 13);
  const bedColor = BED_COLORS[seed % BED_COLORS.length];
  const sofaColor = SOFA_COLORS[(seed + 2) % SOFA_COLORS.length];
  const rugColor = RUG_COLORS[(seed + 4) % RUG_COLORS.length];
  const woodColor = WOOD_COLORS[(seed + 1) % WOOD_COLORS.length];
  const layoutStyle = seed % 3; // 0, 1, 2 variations

  // Helper to add item with strict boundary checks
  function addItem(item) {
    // Clamp coordinates inside room with 2px margin
    const minX = X + 2;
    const maxX = X + W - item.width - 2;
    const minY = Y + 2;
    const maxY = Y + H - item.height - 2;

    const clampedX = Math.max(minX, Math.min(maxX, Math.round(item.x * 10) / 10));
    const clampedY = Math.max(minY, Math.min(maxY, Math.round(item.y * 10) / 10));

    items.push({
      type: item.type,
      x: clampedX,
      y: clampedY,
      width: Math.round(item.width * 10) / 10,
      height: Math.round(item.height * 10) / 10,
      angle: item.angle || 0,
      color: item.color
    });
  }

  // =========================================================================
  // CATEGORY 1: Compact Horizontal Apartment (W: ~57..62, H: ~98)
  // =========================================================================
  if (W < 90 && H >= 85) {
    const doorOnRight = (door.side === 'right');
    const xDoorSide = doorOnRight ? (X + W - 18) : (X + 2);
    const xFarSide = doorOnRight ? (X + 2) : (X + W - 26);
    const xMid = Math.round(X + W / 2);

    // 1. RADIATORS (Under top and bottom windows)
    addItem({ type: 'radiator', x: X + 8, y: Y + 2, width: 14, height: 4, color: '#e2e8f0' });
    addItem({ type: 'radiator', x: X + 8, y: Y + H - 6, width: 14, height: 4, color: '#e2e8f0' });

    // 2. HALLWAY ZONE (near door, outside door opening y: 39..72)
    addItem({ type: 'coat_rack', x: doorOnRight ? X + W - 9 : X + 3, y: Y + 32, width: 6, height: 6, color: '#78350f' });
    addItem({ type: 'mirror', x: doorOnRight ? X + W - 5 : X + 2, y: Y + 73, width: 2, height: 8, color: '#f59e0b' });

    // 3. NORTH ZONE (Living / Bedroom)
    if (layoutStyle === 0) {
      // Style 0: Master Bedroom
      addItem({ type: 'bed', x: xFarSide, y: Y + 7, width: 22, height: 24, color: bedColor });
      addItem({ type: 'nightstand', x: doorOnRight ? X + 25 : X + W - 33, y: Y + 7, width: 6, height: 6, color: woodColor });
      addItem({ type: 'carpet', x: doorOnRight ? X + 25 : X + W - 44, y: Y + 15, width: 16, height: 14, color: rugColor });
      addItem({ type: 'wardrobe', x: doorOnRight ? X + W - 16 : X + 2, y: Y + 7, width: 14, height: 8, color: woodColor });
      addItem({ type: 'tv_cabinet', x: doorOnRight ? X + W - 18 : X + 2, y: Y + 18, width: 16, height: 5, color: '#1e293b' });
      addItem({ type: 'tv', x: doorOnRight ? X + W - 16 : X + 4, y: Y + 19, width: 12, height: 3, color: '#000000' });
      addItem({ type: 'plant', x: X + W - 8, y: Y + 2, width: 6, height: 6, color: '#16a34a' });
    } else if (layoutStyle === 1) {
      // Style 1: Sofa Lounge + Study Desk
      addItem({ type: 'sofa', x: xFarSide, y: Y + 7, width: 24, height: 10, color: sofaColor });
      addItem({ type: 'carpet', x: xFarSide + 2, y: Y + 19, width: 20, height: 12, color: rugColor });
      addItem({ type: 'tv_cabinet', x: doorOnRight ? X + W - 18 : X + 2, y: Y + 7, width: 16, height: 5, color: '#1e293b' });
      addItem({ type: 'tv', x: doorOnRight ? X + W - 16 : X + 4, y: Y + 8, width: 12, height: 3, color: '#000000' });
      addItem({ type: 'desk', x: xFarSide, y: Y + 23, width: 16, height: 8, color: woodColor });
      addItem({ type: 'computer', x: xFarSide + 5, y: Y + 24, width: 6, height: 4, color: '#38bdf8' });
      addItem({ type: 'chair', x: xFarSide + 5, y: Y + 32, width: 5, height: 5, color: '#475569' });
      addItem({ type: 'bookshelf', x: doorOnRight ? X + W - 16 : X + 2, y: Y + 15, width: 14, height: 6, color: woodColor });
      addItem({ type: 'plant', x: X + W - 8, y: Y + 2, width: 6, height: 6, color: '#16a34a' });
    } else {
      // Style 2: Studio with Bed & Wardrobe & Coffee Table
      addItem({ type: 'bed', x: xFarSide, y: Y + 7, width: 22, height: 24, color: bedColor });
      addItem({ type: 'wardrobe', x: doorOnRight ? X + W - 16 : X + 2, y: Y + 7, width: 14, height: 8, color: woodColor });
      addItem({ type: 'bookshelf', x: doorOnRight ? X + W - 16 : X + 2, y: Y + 18, width: 14, height: 6, color: woodColor });
      addItem({ type: 'carpet', x: doorOnRight ? X + 25 : X + W - 43, y: Y + 14, width: 16, height: 14, color: rugColor });
      addItem({ type: 'nightstand', x: doorOnRight ? X + 25 : X + W - 32, y: Y + 7, width: 6, height: 6, color: woodColor });
      addItem({ type: 'floor_lamp', x: X + W - 8, y: Y + 2, width: 5, height: 5, color: '#f59e0b' });
    }

    // 4. SOUTH ZONE (Kitchen & Dining)
    addItem({ type: 'kitchen_counter', x: xFarSide, y: Y + H - 10, width: 18, height: 8, color: '#64748b' });
    addItem({ type: 'stove', x: doorOnRight ? X + 21 : X + W - 35, y: Y + H - 10, width: 8, height: 8, color: '#334155' });
    addItem({ type: 'fridge', x: doorOnRight ? X + 30 : X + W - 44, y: Y + H - 10, width: 8, height: 8, color: '#cbd5e1' });
    addItem({ type: 'table', x: doorOnRight ? X + W - 16 : X + 2, y: Y + H - 18, width: 14, height: 10, color: '#78350f' });
    addItem({ type: 'chair', x: doorOnRight ? X + W - 12 : X + 6, y: Y + H - 24, width: 5, height: 5, color: '#92400e' });
    addItem({ type: 'trash_can', x: doorOnRight ? X + W - 19 : X + 17, y: Y + H - 8, width: 4, height: 4, color: '#475569' });
    addItem({ type: 'plant', x: X + W - 8, y: Y + H - 8, width: 6, height: 6, color: '#16a34a' });

    return items;
  }

  // =========================================================================
  // CATEGORY 2: Medium Vertical Apartment (W: ~98, H: ~80..95)
  // =========================================================================
  if (W >= 85 && W <= 105 && H < 110) {
    const doorOnBottom = (door.side === 'bottom');
    const yFarSide = doorOnBottom ? (Y + 6) : (Y + H - 28);
    const yNearDoor = doorOnBottom ? (Y + H - 12) : (Y + 6);

    // 1. VERTICAL RADIATORS (On outer left and right walls with windows)
    addItem({ type: 'radiator', x: X + 2, y: Y + 8, width: 4, height: 14, color: '#e2e8f0' });
    addItem({ type: 'radiator', x: X + W - 6, y: Y + 8, width: 4, height: 14, color: '#e2e8f0' });

    // 2. HALLWAY ZONE (Flanking the central doorway at x: 39..72)
    addItem({ type: 'coat_rack', x: X + 31, y: yNearDoor, width: 6, height: 6, color: '#78350f' });
    addItem({ type: 'mirror', x: X + 73, y: doorOnBottom ? Y + H - 4 : Y + 2, width: 8, height: 2, color: '#f59e0b' });

    // 3. WEST ZONE (Kitchen & Dining)
    addItem({ type: 'kitchen_counter', x: X + 8, y: yFarSide, width: 18, height: 8, color: '#64748b' });
    addItem({ type: 'stove', x: X + 27, y: yFarSide, width: 8, height: 8, color: '#334155' });
    addItem({ type: 'fridge', x: X + 2, y: doorOnBottom ? Y + 24 : Y + H - 20, width: 8, height: 8, color: '#cbd5e1' });
    addItem({ type: 'table', x: X + 14, y: doorOnBottom ? Y + 38 : Y + H - 34, width: 14, height: 10, color: '#78350f' });
    addItem({ type: 'chair', x: X + 18, y: doorOnBottom ? Y + 50 : Y + H - 42, width: 5, height: 5, color: '#92400e' });
    addItem({ type: 'trash_can', x: X + 2, y: doorOnBottom ? Y + 34 : Y + H - 26, width: 4, height: 4, color: '#475569' });

    // 4. EAST ZONE (Living / Bedroom)
    if (layoutStyle === 0) {
      // Style 0: Bedroom with Master Bed
      addItem({ type: 'bed', x: X + W - 26, y: yFarSide, width: 24, height: 24, color: bedColor });
      addItem({ type: 'nightstand', x: X + W - 33, y: yFarSide, width: 6, height: 6, color: woodColor });
      addItem({ type: 'carpet', x: X + W - 28, y: doorOnBottom ? Y + 32 : Y + H - 44, width: 18, height: 14, color: rugColor });
      addItem({ type: 'wardrobe', x: X + W - 18, y: doorOnBottom ? Y + H - 18 : Y + 12, width: 16, height: 8, color: woodColor });
      addItem({ type: 'tv_cabinet', x: X + 64, y: doorOnBottom ? Y + 42 : Y + H - 24, width: 16, height: 5, color: '#1e293b' });
      addItem({ type: 'tv', x: X + 66, y: doorOnBottom ? Y + 43 : Y + H - 23, width: 12, height: 3, color: '#000000' });
      addItem({ type: 'plant', x: X + W - 8, y: doorOnBottom ? Y + 28 : Y + H - 32, width: 6, height: 6, color: '#16a34a' });
    } else if (layoutStyle === 1) {
      // Style 1: Living Room with Sofa & Study Desk
      addItem({ type: 'sofa', x: X + W - 26, y: yFarSide, width: 24, height: 10, color: sofaColor });
      addItem({ type: 'carpet', x: X + W - 26, y: doorOnBottom ? Y + 18 : Y + H - 32, width: 22, height: 14, color: rugColor });
      addItem({ type: 'tv_cabinet', x: X + 64, y: yFarSide, width: 16, height: 5, color: '#1e293b' });
      addItem({ type: 'tv', x: X + 66, y: yFarSide + 1, width: 12, height: 3, color: '#000000' });
      addItem({ type: 'desk', x: X + W - 20, y: doorOnBottom ? Y + H - 18 : Y + 14, width: 18, height: 8, color: woodColor });
      addItem({ type: 'computer', x: X + W - 15, y: doorOnBottom ? Y + H - 17 : Y + 15, width: 6, height: 4, color: '#38bdf8' });
      addItem({ type: 'chair', x: X + W - 15, y: doorOnBottom ? Y + H - 25 : Y + 23, width: 5, height: 5, color: '#475569' });
      addItem({ type: 'bookshelf', x: X + W - 38, y: doorOnBottom ? Y + H - 10 : Y + 6, width: 14, height: 6, color: woodColor });
      addItem({ type: 'plant', x: X + W - 8, y: doorOnBottom ? Y + 30 : Y + H - 32, width: 6, height: 6, color: '#16a34a' });
    } else {
      // Style 2: Family Apartment with Child Bed & Sofa
      addItem({ type: 'sofa', x: X + W - 26, y: yFarSide, width: 24, height: 10, color: sofaColor });
      addItem({ type: 'carpet', x: X + W - 26, y: doorOnBottom ? Y + 18 : Y + H - 32, width: 20, height: 12, color: rugColor });
      addItem({ type: 'kids_bed', x: X + W - 22, y: doorOnBottom ? Y + H - 24 : Y + 14, width: 20, height: 18, color: bedColor });
      addItem({ type: 'toy_chest', x: X + W - 34, y: doorOnBottom ? Y + H - 12 : Y + 6, width: 10, height: 6, color: '#f59e0b' });
      addItem({ type: 'wardrobe', x: X + 64, y: doorOnBottom ? Y + 40 : Y + H - 22, width: 14, height: 8, color: woodColor });
      addItem({ type: 'tv_cabinet', x: X + 64, y: yFarSide, width: 16, height: 5, color: '#1e293b' });
      addItem({ type: 'tv', x: X + 66, y: yFarSide + 1, width: 12, height: 3, color: '#000000' });
    }

    return items;
  }

  // =========================================================================
  // CATEGORY 3: Large Horizontal Apartment (W: ~240..280, H: ~98)
  // =========================================================================
  if (W >= 220) {
    const doorOnRight = (door.side === 'right');
    const xNearDoor = doorOnRight ? (X + W - 35) : (X + 15);
    const xDoorWall = doorOnRight ? (X + W - 8) : (X + 2);

    // 1. RADIATORS (under windows along outer top and bottom walls)
    addItem({ type: 'radiator', x: X + 20, y: Y + 2, width: 16, height: 4, color: '#e2e8f0' });
    addItem({ type: 'radiator', x: X + 80, y: Y + 2, width: 16, height: 4, color: '#e2e8f0' });
    addItem({ type: 'radiator', x: X + 150, y: Y + H - 6, width: 16, height: 4, color: '#e2e8f0' });
    addItem({ type: 'radiator', x: X + 210, y: Y + H - 6, width: 16, height: 4, color: '#e2e8f0' });

    // 2. ENTRYWAY & HALLWAY
    addItem({ type: 'coat_rack', x: xDoorWall, y: Y + 32, width: 7, height: 7, color: '#78350f' });
    addItem({ type: 'mirror', x: xDoorWall, y: Y + 73, width: 2, height: 10, color: '#f59e0b' });
    addItem({ type: 'bench', x: doorOnRight ? X + W - 22 : X + 10, y: Y + 32, width: 12, height: 5, color: '#78350f' });

    // 3. BATHROOM SUITE (Tucked near entryway)
    const xBath = doorOnRight ? (X + W - 50) : (X + 28);
    addItem({ type: 'bath', x: xBath, y: Y + 7, width: 18, height: 10, color: '#ffffff' });
    addItem({ type: 'sink', x: xBath + 20, y: Y + 7, width: 8, height: 7, color: '#e2e8f0' });
    addItem({ type: 'toilet', x: xBath + 30, y: Y + 7, width: 7, height: 7, color: '#ffffff' });
    addItem({ type: 'washing_machine', x: xBath + 39, y: Y + 7, width: 8, height: 8, color: '#cbd5e1' });

    // 4. KITCHEN & DINING SALON
    const xKitchen = doorOnRight ? (X + W - 90) : (X + 90);
    addItem({ type: 'kitchen_counter', x: xKitchen, y: Y + H - 10, width: 24, height: 8, color: '#64748b' });
    addItem({ type: 'stove', x: xKitchen + 25, y: Y + H - 10, width: 8, height: 8, color: '#334155' });
    addItem({ type: 'microwave', x: xKitchen + 25, y: Y + H - 18, width: 6, height: 5, color: '#475569' });
    addItem({ type: 'fridge', x: xKitchen + 35, y: Y + H - 10, width: 9, height: 9, color: '#cbd5e1' });
    addItem({ type: 'table', x: xKitchen + 10, y: Y + H - 32, width: 18, height: 12, color: '#78350f' });
    addItem({ type: 'chair', x: xKitchen + 12, y: Y + H - 39, width: 5, height: 5, color: '#92400e' });
    addItem({ type: 'chair', x: xKitchen + 21, y: Y + H - 39, width: 5, height: 5, color: '#92400e' });
    addItem({ type: 'trash_can', x: xKitchen + 46, y: Y + H - 8, width: 4, height: 4, color: '#475569' });

    // 5. LIVING ROOM (Center wing)
    const xLiving = X + Math.round(W * 0.42);
    addItem({ type: 'sofa', x: xLiving, y: Y + 7, width: 28, height: 11, color: sofaColor });
    addItem({ type: 'carpet', x: xLiving + 2, y: Y + 20, width: 24, height: 16, color: rugColor });
    addItem({ type: 'tv_cabinet', x: xLiving + 4, y: Y + 40, width: 20, height: 5, color: '#1e293b' });
    addItem({ type: 'tv', x: xLiving + 7, y: Y + 41, width: 14, height: 3, color: '#000000' });
    addItem({ type: 'bookshelf', x: xLiving + 30, y: Y + 7, width: 16, height: 6, color: woodColor });
    addItem({ type: 'floor_lamp', x: xLiving - 6, y: Y + 7, width: 5, height: 5, color: '#f59e0b' });

    // 6. MASTER BEDROOM & WORKSPACE (Far end)
    const xBed = doorOnRight ? (X + 8) : (X + W - 80);
    addItem({ type: 'bed', x: xBed, y: Y + 7, width: 24, height: 26, color: bedColor });
    addItem({ type: 'nightstand', x: xBed + 26, y: Y + 7, width: 6, height: 6, color: woodColor });
    addItem({ type: 'carpet', x: xBed + 2, y: Y + 35, width: 22, height: 14, color: rugColor });
    addItem({ type: 'wardrobe', x: xBed + 35, y: Y + 7, width: 18, height: 8, color: woodColor });
    addItem({ type: 'dresser', x: xBed + 35, y: Y + 18, width: 14, height: 7, color: woodColor });
    addItem({ type: 'desk', x: xBed, y: Y + H - 18, width: 18, height: 8, color: woodColor });
    addItem({ type: 'computer', x: xBed + 6, y: Y + H - 17, width: 6, height: 4, color: '#38bdf8' });
    addItem({ type: 'chair', x: xBed + 6, y: Y + H - 25, width: 5, height: 5, color: '#475569' });
    addItem({ type: 'plant', x: xBed + 20, y: Y + H - 12, width: 7, height: 7, color: '#16a34a' });

    return items;
  }

  // =========================================================================
  // CATEGORY 4: Tall Vertical Apartment (W: ~98, H: ~180..220)
  // =========================================================================
  if (W >= 85 && W <= 105 && H >= 160) {
    const doorOnBottom = (door.side === 'bottom');
    const yFar = doorOnBottom ? (Y + 6) : (Y + H - 50);
    const yNear = doorOnBottom ? (Y + H - 24) : (Y + 12);
    const yMid = Math.round(Y + H / 2);

    // 1. VERTICAL RADIATORS (On outer walls)
    addItem({ type: 'radiator', x: X + 2, y: yFar + 10, width: 4, height: 14, color: '#e2e8f0' });
    addItem({ type: 'radiator', x: X + W - 6, y: yFar + 10, width: 4, height: 14, color: '#e2e8f0' });
    addItem({ type: 'radiator', x: X + 2, y: yMid, width: 4, height: 14, color: '#e2e8f0' });
    addItem({ type: 'radiator', x: X + W - 6, y: yMid, width: 4, height: 14, color: '#e2e8f0' });

    // 2. ENTRYWAY & HALLWAY
    addItem({ type: 'coat_rack', x: X + 31, y: yNear, width: 7, height: 7, color: '#78350f' });
    addItem({ type: 'mirror', x: X + 73, y: doorOnBottom ? Y + H - 4 : Y + 2, width: 8, height: 2, color: '#f59e0b' });

    // 3. BATHROOM (Flanking near door)
    const yBath = doorOnBottom ? (Y + H - 48) : (Y + 28);
    addItem({ type: 'bath', x: X + W - 22, y: yBath, width: 20, height: 10, color: '#ffffff' });
    addItem({ type: 'sink', x: X + W - 12, y: doorOnBottom ? yBath + 12 : yBath - 9, width: 8, height: 7, color: '#e2e8f0' });
    addItem({ type: 'toilet', x: X + W - 22, y: doorOnBottom ? yBath + 12 : yBath - 9, width: 7, height: 7, color: '#ffffff' });
    addItem({ type: 'washing_machine', x: X + W - 32, y: yBath, width: 8, height: 8, color: '#cbd5e1' });

    // 4. KITCHEN & DINING
    const yKitchen = doorOnBottom ? (Y + H - 52) : (Y + 26);
    addItem({ type: 'kitchen_counter', x: X + 2, y: yKitchen, width: 18, height: 8, color: '#64748b' });
    addItem({ type: 'stove', x: X + 21, y: yKitchen, width: 8, height: 8, color: '#334155' });
    addItem({ type: 'fridge', x: X + 2, y: doorOnBottom ? yKitchen + 10 : yKitchen - 10, width: 8, height: 8, color: '#cbd5e1' });
    addItem({ type: 'table', x: X + 14, y: doorOnBottom ? yKitchen + 14 : yKitchen - 16, width: 14, height: 10, color: '#78350f' });
    addItem({ type: 'chair', x: X + 18, y: doorOnBottom ? yKitchen + 26 : yKitchen - 23, width: 5, height: 5, color: '#92400e' });
    addItem({ type: 'trash_can', x: X + 2, y: doorOnBottom ? yKitchen + 22 : yKitchen - 18, width: 4, height: 4, color: '#475569' });

    // 5. LIVING ROOM (Middle)
    addItem({ type: 'sofa', x: X + W - 26, y: yMid - 16, width: 24, height: 10, color: sofaColor });
    addItem({ type: 'carpet', x: X + W - 26, y: yMid - 4, width: 22, height: 14, color: rugColor });
    addItem({ type: 'tv_cabinet', x: X + 62, y: yMid - 16, width: 18, height: 5, color: '#1e293b' });
    addItem({ type: 'tv', x: X + 65, y: yMid - 15, width: 12, height: 3, color: '#000000' });
    addItem({ type: 'desk', x: X + 2, y: yMid - 8, width: 16, height: 8, color: woodColor });
    addItem({ type: 'computer', x: X + 7, y: yMid - 7, width: 6, height: 4, color: '#38bdf8' });
    addItem({ type: 'chair', x: X + 7, y: yMid + 2, width: 5, height: 5, color: '#475569' });
    addItem({ type: 'bookshelf', x: X + 2, y: yMid - 20, width: 14, height: 6, color: woodColor });
    addItem({ type: 'floor_lamp', x: X + W - 8, y: yMid - 22, width: 5, height: 5, color: '#f59e0b' });

    // 6. MASTER BEDROOM (Far end)
    addItem({ type: 'bed', x: X + W - 26, y: yFar, width: 24, height: 26, color: bedColor });
    addItem({ type: 'nightstand', x: X + W - 33, y: yFar, width: 6, height: 6, color: woodColor });
    addItem({ type: 'carpet', x: X + W - 26, y: doorOnBottom ? yFar + 28 : yFar - 16, width: 20, height: 14, color: rugColor });
    addItem({ type: 'wardrobe', x: X + 6, y: yFar, width: 18, height: 8, color: woodColor });
    addItem({ type: 'dresser', x: X + 6, y: doorOnBottom ? yFar + 12 : yFar - 12, width: 14, height: 7, color: woodColor });
    addItem({ type: 'plant', x: X + W - 8, y: doorOnBottom ? yFar + 28 : yFar - 22, width: 6, height: 6, color: '#16a34a' });

    return items;
  }

  // Fallback for any other dimensions
  addItem({ type: 'radiator', x: X + 4, y: Y + 2, width: 14, height: 4, color: '#e2e8f0' });
  addItem({ type: 'sofa', x: X + 4, y: Y + 8, width: 24, height: 10, color: sofaColor });
  addItem({ type: 'carpet', x: X + 4, y: Y + 20, width: 18, height: 12, color: rugColor });
  addItem({ type: 'kitchen_counter', x: X + W - 22, y: Y + H - 10, width: 20, height: 8, color: '#64748b' });
  addItem({ type: 'stove', x: X + W - 32, y: Y + H - 10, width: 8, height: 8, color: '#334155' });
  addItem({ type: 'fridge', x: X + W - 42, y: Y + H - 10, width: 8, height: 8, color: '#cbd5e1' });

  return items;
}

// MAIN EXECUTION
function main() {
  const mapPath = path.join(__dirname, '..', 'public', 'map.json');
  console.log('Loading map from:', mapPath);
  const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

  const resTypes = ['panel_apartment', 'brick_residential', 'modern_residential', 'residential'];
  const resBlds = mapData.buildings.filter(b => resTypes.includes(b.type) && b.interiors);
  console.log(`Found ${resBlds.length} residential buildings with interiors.`);

  let totalApartmentsProcessed = 0;
  let totalFurnitureAdded = 0;
  let boundsViolations = 0;

  for (const bld of resBlds) {
    for (const floorKey of Object.keys(bld.interiors)) {
      const floorNum = parseInt(floorKey);
      const layout = bld.interiors[floorKey];
      if (!layout || !Array.isArray(layout.rooms) || !Array.isArray(layout.walls)) continue;

      const walls = layout.walls;
      const aptRooms = layout.rooms.filter(r => r.name && r.name.startsWith('Кв.'));
      const entranceRooms = layout.rooms.filter(r => r.name && r.name.startsWith('Подъезд'));

      // Keep only entrance furniture
      const keptEntranceFurniture = (layout.furniture || []).filter(f => {
        return entranceRooms.some(ent => {
          return f.x >= ent.x - 2 && f.x + f.width <= ent.x + ent.width + 2 &&
                 f.y >= ent.y - 2 && f.y + f.height <= ent.y + ent.height + 2;
        });
      });

      const newApartmentFurniture = [];

      for (const apt of aptRooms) {
        totalApartmentsProcessed++;
        const aptNum = parseInt(apt.name.replace(/\D/g, '')) || 1;
        const door = getApartmentDoor(apt, walls);

        const aptFurniture = generateApartmentFurniture(apt, door, floorNum, aptNum, bld.type);

        // Verification of bounds
        for (const f of aptFurniture) {
          if (f.x < apt.x || f.x + f.width > apt.x + apt.width ||
              f.y < apt.y || f.y + f.height > apt.y + apt.height) {
            boundsViolations++;
            console.error(`Boundary violation in bld ${bld.id} fl ${floorKey} ${apt.name}:`, f);
          }
        }

        newApartmentFurniture.push(...aptFurniture);
        totalFurnitureAdded += aptFurniture.length;
      }

      // Update layout furniture
      layout.furniture = [...keptEntranceFurniture, ...newApartmentFurniture];
    }
  }

  console.log(`Processing complete!`);
  console.log(`Total Apartments processed: ${totalApartmentsProcessed}`);
  console.log(`Total Furniture items in apartments: ${totalFurnitureAdded}`);
  console.log(`Bounds violations: ${boundsViolations}`);

  if (boundsViolations === 0) {
    fs.writeFileSync(mapPath, JSON.stringify(mapData, null, 2), 'utf8');
    console.log(`Successfully updated ${mapPath}!`);
  } else {
    console.error('Aborting write due to bounds violations!');
  }
}

main();
