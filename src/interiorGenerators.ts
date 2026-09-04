import { InteriorFurniture, InteriorRoom, InteriorWall, InteriorZone } from './buildingInteriors';

// Safe clearance helper: adds furniture only if within bounds and not obstructing doorway
export function addSafeFurniture(
  list: InteriorFurniture[],
  f: InteriorFurniture
) {
  list.push(f);
}

// -------------------------------------------------------------
// RESIDENTIAL APARTMENT PROCEDURAL VARIETY (6 RICH THEMES)
// -------------------------------------------------------------

export function generateHorizontalApartmentInterior(
  furniture: InteriorFurniture[],
  aptNum: number,
  themeIndex: number,
  secX0: number,
  secX1: number,
  secY0: number,
  secY1: number,
  hallX: number,
  hallW: number,
  isLeft: boolean,
  doorY: number,
  doorWidth: number
) {
  const aptX0 = isLeft ? secX0 : hallX + hallW;
  const aptX1 = isLeft ? hallX : secX1;
  const aptW = aptX1 - aptX0;
  const aptH = secY1 - secY0;

  // Doorway corridor span along Y: [doorY - 6, doorY + doorWidth + 6]
  const topMaxY = doorY - 8;
  const botMinY = doorY + doorWidth + 8;

  // Primary carpet in room center
  const carpetColors = ['#1e293b', '#334155', '#475569', '#3f3f46', '#1e3a8a', '#312e81'];
  furniture.push({
    type: 'carpet',
    x: aptX0 + 6,
    y: secY0 + 6,
    width: aptW - 12,
    height: aptH - 12,
    angle: 0,
    color: carpetColors[themeIndex % carpetColors.length]
  });

  if (isLeft) {
    // --- LEFT APARTMENT CONFIGURATIONS ---
    switch (themeIndex % 6) {
      case 0: // Master Bedroom & Cozy Living
        // Top zone: Double Bed + Nightstand + Wardrobe
        furniture.push({ type: 'bed', x: aptX0 + 5, y: secY0 + 5, width: 22, height: 26, angle: 0, color: '#e11d48' });
        furniture.push({ type: 'nightstand', x: aptX0 + 29, y: secY0 + 5, width: 6, height: 6, angle: 0, color: '#78350f' });
        furniture.push({ type: 'wardrobe', x: aptX0 + 5, y: secY0 + 35, width: 14, height: 8, angle: 0, color: '#451a03' });
        // Bottom zone: Sofa + TV Unit + Bookshelf
        furniture.push({ type: 'sofa', x: aptX0 + 5, y: secY1 - 15, width: 26, height: 10, angle: 0, color: '#0284c7' });
        furniture.push({ type: 'tv_cabinet', x: aptX0 + 35, y: secY1 - 9, width: 18, height: 4, angle: 0, color: '#1e293b' });
        furniture.push({ type: 'tv', x: aptX0 + 37, y: secY1 - 8, width: 14, height: 2, angle: 0, color: '#000000' });
        if (aptW > 45 && topMaxY > secY0 + 26) {
          furniture.push({ type: 'bookshelf', x: hallX - 16, y: secY0 + 5, width: 12, height: 6, angle: 0, color: '#78350f' });
        }
        break;

      case 1: // Modern Tech IT Studio
        // Top zone: Workstation with PC & Dual monitors + Bookshelf
        furniture.push({ type: 'desk', x: aptX0 + 5, y: secY0 + 5, width: 20, height: 10, angle: 0, color: '#0f172a' });
        furniture.push({ type: 'computer', x: aptX0 + 10, y: secY0 + 7, width: 8, height: 4, angle: 0, color: '#38bdf8' });
        furniture.push({ type: 'chair', x: aptX0 + 12, y: secY0 + 18, width: 5, height: 5, angle: 0, color: '#64748b' });
        furniture.push({ type: 'bookshelf', x: aptX0 + 28, y: secY0 + 5, width: 14, height: 6, angle: 0, color: '#334155' });
        // Bottom zone: Modular Sofa-Bed + Coffee Table + Kitchenette
        furniture.push({ type: 'sofa', x: aptX0 + 5, y: secY1 - 16, width: 28, height: 11, angle: 0, color: '#6366f1' });
        furniture.push({ type: 'kitchen_counter', x: aptX0 + 37, y: secY1 - 12, width: 16, height: 7, angle: 0, color: '#475569' });
        furniture.push({ type: 'fridge', x: aptX0 + 55, y: secY1 - 12, width: 7, height: 7, angle: 0, color: '#cbd5e1' });
        break;

      case 2: // Family Apartment with Children's Corner
        // Top zone: Kids Bed + Toy Chest + Desk
        furniture.push({ type: 'kids_bed', x: aptX0 + 5, y: secY0 + 5, width: 20, height: 22, angle: 0, color: '#38bdf8' });
        furniture.push({ type: 'toy_chest', x: aptX0 + 28, y: secY0 + 5, width: 10, height: 6, angle: 0, color: '#f59e0b' });
        furniture.push({ type: 'wardrobe', x: aptX0 + 5, y: secY0 + 30, width: 14, height: 8, angle: 0, color: '#78350f' });
        // Bottom zone: Master Sofa + TV Stand
        furniture.push({ type: 'sofa', x: aptX0 + 5, y: secY1 - 15, width: 26, height: 10, angle: 0, color: '#ec4899' });
        furniture.push({ type: 'tv_cabinet', x: aptX0 + 34, y: secY1 - 9, width: 16, height: 4, angle: 0, color: '#1e293b' });
        furniture.push({ type: 'tv', x: aptX0 + 35, y: secY1 - 8, width: 12, height: 2, angle: 0, color: '#000000' });
        break;

      case 3: // Vintage Retro "Бабушкина квартира"
        // Top zone: Classic Bed + High Wardrobe Wall ("Стенка")
        furniture.push({ type: 'bed', x: aptX0 + 5, y: secY0 + 5, width: 22, height: 26, angle: 0, color: '#b91c1c' });
        furniture.push({ type: 'wardrobe', x: aptX0 + 29, y: secY0 + 5, width: 18, height: 8, angle: 0, color: '#451a03' });
        furniture.push({ type: 'bookshelf', x: aptX0 + 5, y: secY0 + 35, width: 14, height: 6, angle: 0, color: '#78350f' });
        // Bottom zone: Retro Sofa + CRT TV on low cabinet
        furniture.push({ type: 'sofa', x: aptX0 + 5, y: secY1 - 15, width: 24, height: 10, angle: 0, color: '#d97706' });
        furniture.push({ type: 'tv_cabinet', x: aptX0 + 33, y: secY1 - 9, width: 14, height: 5, angle: 0, color: '#78350f' });
        furniture.push({ type: 'tv', x: aptX0 + 34, y: secY1 - 8, width: 10, height: 3, angle: 0, color: '#000000' });
        break;

      case 4: // Open-Plan Euro Kitchen-Living
        // Top zone: Full Kitchen Unit with Sink & Stove + Fridge
        furniture.push({ type: 'kitchen_counter', x: aptX0 + 5, y: secY0 + 5, width: 24, height: 8, angle: 0, color: '#0284c7' });
        furniture.push({ type: 'fridge', x: aptX0 + 31, y: secY0 + 5, width: 8, height: 8, angle: 0, color: '#cbd5e1' });
        if (aptW > 45 && topMaxY > secY0 + 28) {
          furniture.push({ type: 'table', x: hallX - 20, y: secY0 + 5, width: 14, height: 10, angle: 0, color: '#b45309' });
          furniture.push({ type: 'chair', x: hallX - 16, y: secY0 + 17, width: 5, height: 5, angle: 0, color: '#64748b' });
        }
        // Bottom zone: Large L-Sofa + Wall TV + Bed in corner
        furniture.push({ type: 'bed', x: aptX0 + 5, y: secY1 - 27, width: 22, height: 22, angle: 0, color: '#10b981' });
        furniture.push({ type: 'sofa', x: aptX0 + 30, y: secY1 - 15, width: 24, height: 10, angle: 0, color: '#047857' });
        furniture.push({ type: 'tv', x: aptX0 + 34, y: secY1 - 3, width: 14, height: 2, angle: 0, color: '#000000' });
        break;

      case 5: // Scandinavian Minimalist
      default:
        // Top zone: Light wood bed + Nightstand + Plant
        furniture.push({ type: 'bed', x: aptX0 + 5, y: secY0 + 5, width: 22, height: 26, angle: 0, color: '#f59e0b' });
        furniture.push({ type: 'nightstand', x: aptX0 + 29, y: secY0 + 5, width: 6, height: 6, angle: 0, color: '#d97706' });
        furniture.push({ type: 'plant', x: aptX0 + 8, y: secY0 + 35, width: 6, height: 6, angle: 0, color: '#16a34a' });
        // Bottom zone: Grey sofa + Minimalist desk with laptop
        furniture.push({ type: 'sofa', x: aptX0 + 5, y: secY1 - 15, width: 26, height: 10, angle: 0, color: '#94a3b8' });
        furniture.push({ type: 'desk', x: aptX0 + 34, y: secY1 - 12, width: 16, height: 7, angle: 0, color: '#f1f5f9' });
        furniture.push({ type: 'computer', x: aptX0 + 38, y: secY1 - 11, width: 6, height: 3, angle: 0, color: '#000000' });
        break;
    }
  } else {
    // --- RIGHT APARTMENT CONFIGURATIONS ---
    switch (themeIndex % 6) {
      case 0: // Master Bedroom & Cozy Living
        // Top zone: Double Bed + Nightstand + Wardrobe
        furniture.push({ type: 'bed', x: aptX1 - 27, y: secY0 + 5, width: 22, height: 26, angle: 0, color: '#9333ea' });
        furniture.push({ type: 'nightstand', x: aptX1 - 35, y: secY0 + 5, width: 6, height: 6, angle: 0, color: '#78350f' });
        furniture.push({ type: 'wardrobe', x: aptX1 - 19, y: secY0 + 35, width: 14, height: 8, angle: 0, color: '#451a03' });
        // Bottom zone: Sofa + TV Unit
        furniture.push({ type: 'sofa', x: aptX1 - 31, y: secY1 - 15, width: 26, height: 10, angle: 0, color: '#059669' });
        furniture.push({ type: 'tv_cabinet', x: aptX1 - 53, y: secY1 - 9, width: 18, height: 4, angle: 0, color: '#1e293b' });
        furniture.push({ type: 'tv', x: aptX1 - 51, y: secY1 - 8, width: 14, height: 2, angle: 0, color: '#000000' });
        if (aptW > 45 && topMaxY > secY0 + 26) {
          furniture.push({ type: 'bookshelf', x: aptX0 + 6, y: secY0 + 5, width: 12, height: 6, angle: 0, color: '#78350f' });
        }
        break;

      case 1: // Modern Tech IT Studio
        furniture.push({ type: 'desk', x: aptX1 - 25, y: secY0 + 5, width: 20, height: 10, angle: 0, color: '#0f172a' });
        furniture.push({ type: 'computer', x: aptX1 - 20, y: secY0 + 7, width: 8, height: 4, angle: 0, color: '#38bdf8' });
        furniture.push({ type: 'chair', x: aptX1 - 18, y: secY0 + 18, width: 5, height: 5, angle: 0, color: '#64748b' });
        furniture.push({ type: 'bookshelf', x: aptX1 - 42, y: secY0 + 5, width: 14, height: 6, angle: 0, color: '#334155' });
        furniture.push({ type: 'sofa', x: aptX1 - 33, y: secY1 - 16, width: 28, height: 11, angle: 0, color: '#8b5cf6' });
        furniture.push({ type: 'kitchen_counter', x: aptX1 - 55, y: secY1 - 12, width: 16, height: 7, angle: 0, color: '#475569' });
        break;

      case 2: // Family Apartment with Children's Room
        furniture.push({ type: 'kids_bed', x: aptX1 - 25, y: secY0 + 5, width: 20, height: 22, angle: 0, color: '#ec4899' });
        furniture.push({ type: 'toy_chest', x: aptX1 - 38, y: secY0 + 5, width: 10, height: 6, angle: 0, color: '#f59e0b' });
        furniture.push({ type: 'wardrobe', x: aptX1 - 19, y: secY0 + 30, width: 14, height: 8, angle: 0, color: '#78350f' });
        furniture.push({ type: 'sofa', x: aptX1 - 31, y: secY1 - 15, width: 26, height: 10, angle: 0, color: '#0284c7' });
        furniture.push({ type: 'tv_cabinet', x: aptX1 - 50, y: secY1 - 9, width: 16, height: 4, angle: 0, color: '#1e293b' });
        furniture.push({ type: 'tv', x: aptX1 - 49, y: secY1 - 8, width: 12, height: 2, angle: 0, color: '#000000' });
        break;

      case 3: // Vintage Retro
        furniture.push({ type: 'bed', x: aptX1 - 27, y: secY0 + 5, width: 22, height: 26, angle: 0, color: '#047857' });
        furniture.push({ type: 'wardrobe', x: aptX1 - 47, y: secY0 + 5, width: 18, height: 8, angle: 0, color: '#451a03' });
        furniture.push({ type: 'sofa', x: aptX1 - 29, y: secY1 - 15, width: 24, height: 10, angle: 0, color: '#b45309' });
        furniture.push({ type: 'tv_cabinet', x: aptX1 - 47, y: secY1 - 9, width: 14, height: 5, angle: 0, color: '#78350f' });
        furniture.push({ type: 'tv', x: aptX1 - 46, y: secY1 - 8, width: 10, height: 3, angle: 0, color: '#000000' });
        break;

      case 4: // Euro Kitchen-Living
        furniture.push({ type: 'kitchen_counter', x: aptX1 - 29, y: secY0 + 5, width: 24, height: 8, angle: 0, color: '#0284c7' });
        furniture.push({ type: 'fridge', x: aptX1 - 39, y: secY0 + 5, width: 8, height: 8, angle: 0, color: '#cbd5e1' });
        furniture.push({ type: 'bed', x: aptX1 - 27, y: secY1 - 27, width: 22, height: 22, angle: 0, color: '#6366f1' });
        furniture.push({ type: 'sofa', x: aptX1 - 54, y: secY1 - 15, width: 24, height: 10, angle: 0, color: '#4f46e5' });
        break;

      case 5: // Scandinavian Minimalist
      default:
        furniture.push({ type: 'bed', x: aptX1 - 27, y: secY0 + 5, width: 22, height: 26, angle: 0, color: '#10b981' });
        furniture.push({ type: 'nightstand', x: aptX1 - 35, y: secY0 + 5, width: 6, height: 6, angle: 0, color: '#059669' });
        furniture.push({ type: 'sofa', x: aptX1 - 31, y: secY1 - 15, width: 26, height: 10, angle: 0, color: '#64748b' });
        furniture.push({ type: 'desk', x: aptX1 - 50, y: secY1 - 12, width: 16, height: 7, angle: 0, color: '#f1f5f9' });
        furniture.push({ type: 'computer', x: aptX1 - 46, y: secY1 - 11, width: 6, height: 3, angle: 0, color: '#000000' });
        break;
    }
  }
}

export function generateVerticalApartmentInterior(
  furniture: InteriorFurniture[],
  aptNum: number,
  themeIndex: number,
  secX0: number,
  secX1: number,
  secY0: number,
  secY1: number,
  hallY: number,
  hallH: number,
  isTop: boolean,
  doorX: number,
  doorWidth: number
) {
  const aptY0 = isTop ? secY0 : hallY + hallH;
  const aptY1 = isTop ? hallY : secY1;
  const aptW = secX1 - secX0;
  const aptH = aptY1 - aptY0;

  const carpetColors = ['#1e293b', '#334155', '#475569', '#3f3f46', '#1e3a8a', '#312e81'];
  furniture.push({
    type: 'carpet',
    x: secX0 + 6,
    y: aptY0 + 6,
    width: aptW - 12,
    height: aptH - 12,
    angle: 0,
    color: carpetColors[themeIndex % carpetColors.length]
  });

  if (isTop) {
    switch (themeIndex % 4) {
      case 0:
        furniture.push({ type: 'bed', x: secX0 + 5, y: secY0 + 5, width: 22, height: 26, angle: 0, color: '#e11d48' });
        furniture.push({ type: 'wardrobe', x: secX1 - 19, y: secY0 + 5, width: 14, height: 8, angle: 0, color: '#451a03' });
        furniture.push({ type: 'sofa', x: secX0 + 5, y: hallY - 15, width: 26, height: 10, angle: 0, color: '#0284c7' });
        break;
      case 1:
        furniture.push({ type: 'desk', x: secX0 + 5, y: secY0 + 5, width: 20, height: 10, angle: 0, color: '#0f172a' });
        furniture.push({ type: 'computer', x: secX0 + 10, y: secY0 + 7, width: 8, height: 4, angle: 0, color: '#38bdf8' });
        furniture.push({ type: 'sofa', x: secX1 - 31, y: secY0 + 5, width: 26, height: 10, angle: 0, color: '#8b5cf6' });
        furniture.push({ type: 'kitchen_counter', x: secX0 + 5, y: hallY - 12, width: 18, height: 7, angle: 0, color: '#475569' });
        break;
      case 2:
        furniture.push({ type: 'kids_bed', x: secX0 + 5, y: secY0 + 5, width: 20, height: 22, angle: 0, color: '#38bdf8' });
        furniture.push({ type: 'wardrobe', x: secX1 - 19, y: secY0 + 5, width: 14, height: 8, angle: 0, color: '#78350f' });
        furniture.push({ type: 'sofa', x: secX0 + 5, y: hallY - 15, width: 26, height: 10, angle: 0, color: '#ec4899' });
        break;
      case 3:
      default:
        furniture.push({ type: 'bed', x: secX0 + 5, y: secY0 + 5, width: 22, height: 26, angle: 0, color: '#10b981' });
        furniture.push({ type: 'bookshelf', x: secX1 - 19, y: secY0 + 5, width: 14, height: 6, angle: 0, color: '#78350f' });
        furniture.push({ type: 'sofa', x: secX0 + 5, y: hallY - 15, width: 26, height: 10, angle: 0, color: '#64748b' });
        break;
    }
  } else {
    switch (themeIndex % 4) {
      case 0:
        furniture.push({ type: 'bed', x: secX0 + 5, y: secY1 - 27, width: 22, height: 22, angle: 0, color: '#9333ea' });
        furniture.push({ type: 'wardrobe', x: secX1 - 19, y: secY1 - 13, width: 14, height: 8, angle: 0, color: '#451a03' });
        furniture.push({ type: 'sofa', x: secX1 - 31, y: aptY0 + 5, width: 26, height: 10, angle: 0, color: '#059669' });
        break;
      case 1:
        furniture.push({ type: 'desk', x: secX0 + 5, y: secY1 - 15, width: 20, height: 10, angle: 0, color: '#0f172a' });
        furniture.push({ type: 'computer', x: secX0 + 10, y: secY1 - 13, width: 8, height: 4, angle: 0, color: '#38bdf8' });
        furniture.push({ type: 'sofa', x: secX1 - 31, y: aptY0 + 5, width: 26, height: 10, angle: 0, color: '#6366f1' });
        break;
      case 2:
        furniture.push({ type: 'kids_bed', x: secX0 + 5, y: secY1 - 25, width: 20, height: 20, angle: 0, color: '#ec4899' });
        furniture.push({ type: 'wardrobe', x: secX1 - 19, y: secY1 - 13, width: 14, height: 8, angle: 0, color: '#78350f' });
        furniture.push({ type: 'sofa', x: secX0 + 5, y: aptY0 + 5, width: 26, height: 10, angle: 0, color: '#0284c7' });
        break;
      case 3:
      default:
        furniture.push({ type: 'bed', x: secX0 + 5, y: secY1 - 27, width: 22, height: 22, angle: 0, color: '#f59e0b' });
        furniture.push({ type: 'bookshelf', x: secX1 - 19, y: secY1 - 13, width: 14, height: 6, angle: 0, color: '#78350f' });
        furniture.push({ type: 'sofa', x: secX1 - 31, y: aptY0 + 5, width: 26, height: 10, angle: 0, color: '#94a3b8' });
        break;
    }
  }
}
