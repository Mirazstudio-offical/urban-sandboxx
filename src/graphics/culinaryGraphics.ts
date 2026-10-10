// =====================================================================
// PROCEDURAL 2D CANVAS GRAPHICS FOR DYNAMIC PREPS, COOKWARE & FINISHED DISHES
// =====================================================================
// 1. drawCulinaryDishItem: Renders icon / ground / inventory model (24x24 scale)
// 2. drawLiveCulinaryViewport: High-fidelity interactive workstation canvas
// =====================================================================

import { drawShadow } from './itemGraphicShared';
import { CookwareVessel, CulinaryIngredient } from '../cookingEngine';

// Pseudo-random stable hash for ingredient placement
function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Determines ingredient category & colors based on name/id & biochemistry
function getIngredientColorProfile(ing: CulinaryIngredient | any) {
  const name = (ing.nameRu || ing.name || '').toLowerCase();
  const id = (ing.sourceItemId || ing.itemId || '').toLowerCase();
  const denat = ing.bioState?.denaturation ?? ing.denaturation ?? 0.0;
  const maillard = ing.bioState?.maillard ?? ing.maillard ?? 0.0;
  const char = ing.bioState?.charring ?? ing.charring ?? 0.0;

  // 1. Meat (Beef, Pork, Lamb)
  if (name.includes('говядин') || name.includes('свинин') || name.includes('баран') || name.includes('мяс') || id.includes('meat') || id.includes('beef') || id.includes('pork')) {
    if (char >= 0.4) return { base: '#18181b', crust: '#09090b', highlight: '#27272a' };
    if (char >= 0.15) return { base: '#451a03', crust: '#1c1917', highlight: '#78350f' };
    if (maillard >= 0.35) return { base: '#854d0e', crust: '#78350f', highlight: '#b45309' };
    if (denat >= 0.55) return { base: '#a8a29e', crust: '#78716c', highlight: '#d6d3d1' };
    if (denat >= 0.2) return { base: '#fb7185', crust: '#f43f5e', highlight: '#fecdd3' };
    return { base: '#e11d48', crust: '#be123c', highlight: '#fda4af' }; // Fresh raw red
  }

  // 2. Poultry (Chicken, Turkey, Duck)
  if (name.includes('куриц') || name.includes('цыпл') || name.includes('индейк') || name.includes('утк') || id.includes('chicken') || id.includes('poultry')) {
    if (char >= 0.4) return { base: '#18181b', crust: '#09090b', highlight: '#27272a' };
    if (char >= 0.15) return { base: '#573010', crust: '#291807', highlight: '#78350f' };
    if (maillard >= 0.35) return { base: '#b45309', crust: '#78350f', highlight: '#d97706' };
    if (denat >= 0.5) return { base: '#fef3c7', crust: '#fde68a', highlight: '#ffffff' };
    return { base: '#fbcfe8', crust: '#f472b6', highlight: '#fdf2f8' }; // Raw pale poultry pink
  }

  // 3. Fish & Seafood
  if (name.includes('рыб') || name.includes('лосос') || name.includes('окунь') || name.includes('щук') || name.includes('форел') || id.includes('fish') || id.includes('salmon')) {
    if (char >= 0.35) return { base: '#18181b', crust: '#09090b', highlight: '#27272a' };
    if (maillard >= 0.3) return { base: '#d97706', crust: '#92400e', highlight: '#fbbf24' };
    if (denat >= 0.5) return { base: '#ffedd5', crust: '#fed7aa', highlight: '#fff7ed' };
    return { base: '#fb7185', crust: '#f43f5e', highlight: '#ffe4e6' }; // Coral salmon pink
  }

  // 4. Onion & Garlic
  if (name.includes('лук') || name.includes('чеснок') || id.includes('onion') || id.includes('garlic')) {
    if (char >= 0.35) return { base: '#27272a', crust: '#09090b', highlight: '#52525b' };
    if (maillard >= 0.35) return { base: '#d97706', crust: '#b45309', highlight: '#fef08a' }; // Caramelized onion
    return { base: '#fef9c3', crust: '#fef08a', highlight: '#ffffff' }; // Translucent ivory-white
  }

  // 5. Carrot
  if (name.includes('морков') || id.includes('carrot')) {
    if (char >= 0.35) return { base: '#27272a', crust: '#09090b', highlight: '#c2410c' };
    if (maillard >= 0.35) return { base: '#c2410c', crust: '#7c2d12', highlight: '#ea580c' };
    return { base: '#ea580c', crust: '#c2410c', highlight: '#fb923c' }; // Vibrant orange
  }

  // 6. Potato
  if (name.includes('картоф') || id.includes('potato')) {
    if (char >= 0.35) return { base: '#27272a', crust: '#09090b', highlight: '#78350f' };
    if (maillard >= 0.35) return { base: '#b45309', crust: '#78350f', highlight: '#fef08a' }; // Golden roasted crust
    return { base: '#fef08a', crust: '#fde047', highlight: '#fef9c3' }; // Pale potato
  }

  // 7. Mushrooms
  if (name.includes('гриб') || id.includes('mushroom')) {
    if (char >= 0.35) return { base: '#18181b', crust: '#09090b', highlight: '#3f3f46' };
    if (maillard >= 0.3) return { base: '#573010', crust: '#3b1d06', highlight: '#78350f' };
    return { base: '#78350f', crust: '#451a03', highlight: '#a8a29e' };
  }

  // 8. Cabbage & Greenery
  if (name.includes('капуст') || name.includes('зелен') || name.includes('укроп') || name.includes('петрушк') || id.includes('cabbage')) {
    if (char >= 0.35) return { base: '#18181b', crust: '#09090b', highlight: '#14532d' };
    if (maillard >= 0.3) return { base: '#4d7c0f', crust: '#365314', highlight: '#84cc16' };
    return { base: '#16a34a', crust: '#15803d', highlight: '#4ade80' };
  }

  // Fallback
  return { base: '#f43f5e', crust: '#e11d48', highlight: '#fda4af' };
}

/**
 * Procedural 2D model for ItemIconCanvas, ground items, hands, and inventory
 */
export function drawCulinaryDishItem(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  item?: any
): boolean {
  const isDish =
    itemId === 'custom_cooked_dish' ||
    itemId === 'prep_workpiece' ||
    itemId.startsWith('cooked_') ||
    itemId.startsWith('prep_') ||
    Boolean(item?.culinaryData);

  if (!isDish) return false;

  const data = item?.culinaryData || {};
  const isWorkpiece = Boolean(data.isWorkpiece || itemId === 'prep_workpiece');
  const denat = data.denaturation ?? 0.0;
  const maillard = data.maillard ?? 0.0;
  const char = data.charring ?? 0.0;
  const dishType = data.dishType || (isWorkpiece ? 'salad' : 'fried');
  const containerType = data.containerType || (isWorkpiece ? 'board' : (dishType === 'soup' ? 'pot' : (dishType === 'stew' ? 'bowl' : 'plate')));

  // 1. Drop Shadow
  drawShadow(ctx, 8.5, 3.5, 8.5, 0.3);

  // 2. Outer Vessel / Surface
  if (containerType === 'board') {
    // === WOODEN CUTTING BOARD (WORKPIECE) ===
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.roundRect(-8.5, -7.5, 17, 15, 2.5);
    ctx.fill();

    // Woodgrain planks
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-8.5, -3.8, 17, 0.7);
    ctx.fillRect(-8.5, 2.2, 17, 0.7);

    // Knife chop marks on wood
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-5, -1.5);
    ctx.lineTo(-2, 0.5);
    ctx.moveTo(1, -2);
    ctx.lineTo(4, -0.5);
    ctx.stroke();

    // Board hanging hole
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(6.2, 0, 1.3, 0, Math.PI * 2);
    ctx.fill();

  } else if (containerType === 'pan') {
    // === CAST IRON SKILLET ===
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(5.5, -2, 6.5, 4, 1.5);
    ctx.fill();

    ctx.fillStyle = '#78350f';
    ctx.fillRect(7, -1.2, 4.5, 2.4);

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-1.5, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(-1.5, 0, 7.2, 0, Math.PI * 2);
    ctx.fill();

    // Oil sheen
    const grad = ctx.createRadialGradient(-2, -2, 1, -1.5, 0, 7);
    grad.addColorStop(0, 'rgba(250, 204, 21, 0.4)');
    grad.addColorStop(1, 'rgba(180, 83, 9, 0.15)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(-1.5, 0, 6.8, 0, Math.PI * 2);
    ctx.fill();

  } else if (containerType === 'pot') {
    // === ENAMEL / STEEL SOUP POT ===
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(-9.5, -2, 19, 4, 1.5);
    ctx.fill();

    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, 8.2, 0, Math.PI * 2);
    ctx.stroke();

    const brothGrad = ctx.createRadialGradient(-1, -1, 1, 0, 0, 7.5);
    brothGrad.addColorStop(0, '#f59e0b');
    brothGrad.addColorStop(0.7, '#b45309');
    brothGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = brothGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Floating lipid droplets
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(-3, -2, 1.1, 0, Math.PI * 2);
    ctx.arc(2.5, -3, 0.8, 0, Math.PI * 2);
    ctx.arc(-2, 3, 0.9, 0, Math.PI * 2);
    ctx.arc(3.5, 2, 1.2, 0, Math.PI * 2);
    ctx.fill();

  } else if (containerType === 'bowl') {
    // === DEEP BOWL ===
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, 8.2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(0, 0, 7.2, 0, Math.PI * 2);
    ctx.fill();

  } else {
    // === CERAMIC DINNER PLATE ===
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, 6.8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Render Solid Ingredients inside container
  const offsetCenterX = containerType === 'pan' ? -1.5 : (containerType === 'board' ? -1 : 0);
  const cutLevel = data.cutPieces && data.cutPieces > 12 ? 2 : (data.cutPieces && data.cutPieces > 2 ? 1 : 0);

  // Check if we have specific ingredients stored in culinaryData
  const ingredientsList: any[] = data.ingredients || [];

  if (ingredientsList.length > 0) {
    // Draw real specific components
    for (let i = 0; i < Math.min(6, ingredientsList.length); i++) {
      const ing = ingredientsList[i];
      const colors = getIngredientColorProfile(ing);
      const angle = (i / Math.min(6, ingredientsList.length)) * Math.PI * 2;
      const radius = 2.2 + (i % 2) * 1.5;
      const px = offsetCenterX + Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;

      ctx.save();
      ctx.translate(px, py);

      if (ing.bioState?.cutLevel >= 2) {
        // Minced granules
        ctx.fillStyle = colors.base;
        ctx.beginPath();
        ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (ing.bioState?.cutLevel === 1) {
        // Sliced chunk
        ctx.fillStyle = colors.base;
        ctx.beginPath();
        ctx.roundRect(-1.8, -1.5, 3.6, 3.0, 0.7);
        ctx.fill();
        ctx.strokeStyle = colors.crust;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      } else {
        // Whole cut
        ctx.fillStyle = colors.base;
        ctx.beginPath();
        ctx.roundRect(-3.5, -2.5, 7.0, 5.0, 1.5);
        ctx.fill();
        ctx.strokeStyle = colors.crust;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
      ctx.restore();
    }
  } else {
    // Fallback: general procedural food mesh
    const colors = getIngredientColorProfile({
      nameRu: data.dishType === 'soup' ? 'говядина' : 'мясо',
      bioState: { denaturation: denat, maillard, charring: char }
    });

    if (cutLevel === 0) {
      // Whole cut steak / fillet
      ctx.fillStyle = colors.base;
      ctx.beginPath();
      ctx.roundRect(offsetCenterX - 4.5, -3.2, 9, 6.4, 2.2);
      ctx.fill();

      ctx.strokeStyle = colors.crust;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(offsetCenterX - 3, -2.5);
      ctx.lineTo(offsetCenterX + 3, -1.0);
      ctx.moveTo(offsetCenterX - 3.5, 0.2);
      ctx.lineTo(offsetCenterX + 2.5, 1.6);
      ctx.stroke();

    } else if (cutLevel === 1) {
      // Sliced chunks
      const chunks = [
        { x: -3.0, y: -2.5, w: 3.2, h: 2.8, rot: 0.2 },
        { x: 1.0, y: -3.0, w: 3.5, h: 2.6, rot: -0.3 },
        { x: -3.5, y: 1.0, w: 3.0, h: 3.0, rot: -0.1 },
        { x: 0.5, y: 0.8, w: 3.8, h: 3.2, rot: 0.4 },
        { x: -1.2, y: -0.8, w: 3.2, h: 2.5, rot: 0.05 }
      ];

      for (const ch of chunks) {
        ctx.save();
        ctx.translate(offsetCenterX + ch.x, ch.y);
        ctx.rotate(ch.rot);

        ctx.fillStyle = colors.base;
        ctx.beginPath();
        ctx.roundRect(-ch.w / 2, -ch.h / 2, ch.w, ch.h, 0.8);
        ctx.fill();

        ctx.strokeStyle = colors.crust;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.restore();
      }
    } else {
      // Minced meat
      ctx.fillStyle = colors.base;
      ctx.beginPath();
      ctx.arc(offsetCenterX, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = colors.crust;
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(offsetCenterX + Math.cos(angle) * 2.5, Math.sin(angle) * 2.5, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Garnish: onion rings & greenery
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(offsetCenterX + 1.5, 2.0, 1.2, 0, Math.PI);
  ctx.stroke();

  ctx.fillStyle = '#16a34a';
  ctx.fillRect(offsetCenterX - 0.5, -2.5, 0.9, 0.9);
  ctx.fillRect(offsetCenterX + 2.0, 1.0, 0.8, 0.8);
  ctx.fillRect(offsetCenterX - 2.5, -0.5, 0.8, 0.8);

  // Char specks if burnt
  if (char > 0.2) {
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.arc(offsetCenterX - 1.5, -1.8, 0.9, 0, Math.PI * 2);
    ctx.arc(offsetCenterX + 2.0, 0.5, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  return true;
}

/**
 * HIGH-FIDELITY LIVE CULINARY VIEWPORT (Interactive Workstation Canvas)
 * Renders the live top-down cutting board, frying pan or cooking pot with all ingredients,
 * dynamic liquids, heat shimmer, and real-time Maillard/browning reactions.
 */
export function drawLiveCulinaryViewport(
  ctx: CanvasRenderingContext2D,
  vessel: CookwareVessel,
  width: number,
  height: number,
  isStove: boolean,
  selectedIdx: number | null = null,
  tickTime: number = 0
): void {
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;
  const scale = Math.min(width, height) / 280;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  const isCuttingBoard = !isStove && vessel.vesselType === 'surface';
  const isStoveBare = isStove && vessel.vesselType === 'surface';
  const isPan = vessel.vesselType === 'pan';
  const isPot = vessel.vesselType === 'pot';
  const isBowl = vessel.vesselType === 'bowl';

  // 1. Drop Shadow for Vessel
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;

  // 2. Draw Vessel Structure
  if (isCuttingBoard) {
    // === LARGE HEAVY OAK CUTTING BOARD ===
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.roundRect(-100, -85, 200, 170, 12);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Woodgrain planks
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-100, -40, 200, 2.5);
    ctx.fillRect(-100, 15, 200, 2.5);
    ctx.fillRect(-100, 55, 200, 2.5);

    // Subtle woodgrain fiber lines
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-90, -60);
    ctx.lineTo(90, -58);
    ctx.moveTo(-85, -10);
    ctx.lineTo(85, -8);
    ctx.moveTo(-90, 35);
    ctx.lineTo(90, 36);
    ctx.stroke();

    // Knife chop marks from slicing
    ctx.strokeStyle = 'rgba(69, 26, 3, 0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-45, -25);
    ctx.lineTo(-20, 10);
    ctx.moveTo(10, -35);
    ctx.lineTo(35, 5);
    ctx.moveTo(-15, 20);
    ctx.lineTo(15, 45);
    ctx.stroke();

    // Hanging grip handle hole
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(80, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Inner workspace bevel
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-96, -81, 192, 162, 10);
    ctx.stroke();

  } else if (isStoveBare) {
    // === BARE STOVE BURNER (SPIRAL COIL / CAST IRON DISC) ===
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, 95, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Stainless steel drip pan rim
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 92, 0, Math.PI * 2);
    ctx.stroke();

    // Dark cast iron burner plate
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, 80, 0, Math.PI * 2);
    ctx.fill();

    // Heating spiral grooves / coils
    const glowPower = vessel.heatSourcePower;
    const coilColor = glowPower > 0 
      ? glowPower >= 4 ? '#ef4444' : '#f97316'
      : '#334155';

    ctx.strokeStyle = coilColor;
    ctx.lineWidth = glowPower > 0 ? 4.5 : 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, 65, 0, Math.PI * 2);
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.stroke();

    // Glowing heat aura if turned on
    if (glowPower > 0) {
      const pulse = Math.sin(Date.now() / 200) * 0.15 + 0.85;
      const glowGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 85);
      glowGrad.addColorStop(0, `rgba(239, 68, 68, ${0.4 * pulse})`);
      glowGrad.addColorStop(0.7, `rgba(249, 115, 22, ${0.25 * pulse})`);
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 85, 0, Math.PI * 2);
      ctx.fill();
    }

    // Center burner hub
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

  } else if (isPan) {
    // === HEAVY CAST IRON FRYING PAN ===
    // Long handle with wood grip
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(75, -14, 65, 28, 8);
    ctx.fill();

    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.roundRect(90, -10, 42, 20, 5);
    ctx.fill();

    // Hanging loop hole
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(130, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    // Outer pan body
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(-10, 0, 88, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Outer pan rim highlight
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(-10, 0, 85, 0, Math.PI * 2);
    ctx.stroke();

    // Inner cooking surface
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(-10, 0, 78, 0, Math.PI * 2);
    ctx.fill();

    // Bottom thermal heat shimmer if hot
    if (vessel.temperature >= 100) {
      const heatGrad = ctx.createRadialGradient(-10, 0, 5, -10, 0, 75);
      heatGrad.addColorStop(0, 'rgba(239, 68, 68, 0.2)');
      heatGrad.addColorStop(0.7, 'rgba(249, 115, 22, 0.1)');
      heatGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = heatGrad;
      ctx.beginPath();
      ctx.arc(-10, 0, 78, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (isPot) {
    // === ENAMEL / STEEL SOUP POT ===
    // Dual side handles
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(-108, -14, 216, 28, 8);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-98, -8, 20, 16, 4);
    ctx.roundRect(78, -8, 20, 16, 4);
    ctx.fill();

    // Pot outer body (Burgundy red enamel)
    ctx.fillStyle = '#881337';
    ctx.beginPath();
    ctx.arc(0, 0, 88, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Stainless rim
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, 85, 0, Math.PI * 2);
    ctx.stroke();

    // Pot interior
    ctx.fillStyle = '#4c0519';
    ctx.beginPath();
    ctx.arc(0, 0, 78, 0, Math.PI * 2);
    ctx.fill();

  } else if (isBowl) {
    // === DEEP CERAMIC / WOODEN BOWL ===
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, 0, 88, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 84, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(0, 0, 76, 0, Math.PI * 2);
    ctx.fill();

  } else {
    // === CERAMIC DINNER PLATE ===
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.arc(0, 0, 88, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 74, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 68, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Liquid Layer (Oil pool or Broth)
  const offsetCenterX = isPan ? -10 : 0;
  const liquidRadius = isCuttingBoard ? 65 : 74;

  const hasOil = vessel.liquids.some(l => l.isFatOrOil);
  const hasWater = vessel.liquids.some(l => !l.isFatOrOil);

  if (vessel.liquids.length > 0) {
    if (hasWater) {
      // Golden shimmering broth / water
      const brothGrad = ctx.createRadialGradient(offsetCenterX - 10, -10, 10, offsetCenterX, 0, liquidRadius);
      brothGrad.addColorStop(0, 'rgba(245, 158, 11, 0.7)');
      brothGrad.addColorStop(0.6, 'rgba(180, 83, 9, 0.85)');
      brothGrad.addColorStop(1, 'rgba(120, 53, 15, 0.95)');
      ctx.fillStyle = brothGrad;
      ctx.beginPath();
      ctx.arc(offsetCenterX, 0, liquidRadius, 0, Math.PI * 2);
      ctx.fill();

      // Floating gold lipid droplet rings
      ctx.fillStyle = '#fef08a';
      const bubblePositions = [
        { x: -30, y: -20, r: 8 },
        { x: 25, y: -28, r: 6 },
        { x: -22, y: 32, r: 7 },
        { x: 35, y: 22, r: 9 },
        { x: 5, y: 38, r: 5 }
      ];
      for (const bp of bubblePositions) {
        ctx.beginPath();
        ctx.arc(offsetCenterX + bp.x, bp.y, bp.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    } else if (hasOil) {
      // Golden vegetable / sunflower oil sheen
      const oilGrad = ctx.createRadialGradient(offsetCenterX - 15, -15, 10, offsetCenterX, 0, liquidRadius);
      oilGrad.addColorStop(0, 'rgba(253, 224, 71, 0.6)');
      oilGrad.addColorStop(0.7, 'rgba(234, 179, 8, 0.45)');
      oilGrad.addColorStop(1, 'rgba(180, 83, 9, 0.25)');
      ctx.fillStyle = oilGrad;
      ctx.beginPath();
      ctx.arc(offsetCenterX, 0, liquidRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Sizzling / Boiling micro-bubbles
  if (vessel.temperature >= 120 && (hasOil || hasWater)) {
    ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + (Date.now() / 300);
      const dist = 35 + ((i * 7) % 30);
      const bx = offsetCenterX + Math.cos(angle) * dist;
      const by = Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 4. Solid Ingredients Rendering
  const ings = vessel.ingredients;
  for (let idx = 0; idx < ings.length; idx++) {
    const ing = ings[idx];
    const isSelected = selectedIdx === idx;
    const colors = getIngredientColorProfile(ing);
    const seed = hashSeed(ing.id);

    // Calculate stable center placement for this ingredient on the surface
    const totalIngs = Math.max(1, ings.length);
    const angle = (idx / totalIngs) * Math.PI * 2 + ((seed % 100) / 100) * 0.4;
    const dist = totalIngs === 1 ? 0 : 25 + (idx % 3) * 16;
    const basePx = offsetCenterX + Math.cos(angle) * dist;
    const basePy = Math.sin(angle) * dist;

    ctx.save();
    ctx.translate(basePx, basePy);

    // If selected, draw glowing highlight aura
    if (isSelected) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, 32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowColor = 'transparent';
    }

    if (ing.bioState.cutLevel === 0) {
      // === WHOLE CUT (STEAK, FILLET, WHOLE ROOT) ===
      ctx.rotate(((seed % 60) - 30) * (Math.PI / 180));

      // Meat body
      ctx.fillStyle = colors.base;
      ctx.beginPath();
      ctx.roundRect(-28, -18, 56, 36, 12);
      ctx.fill();

      // Sear crust rim
      ctx.strokeStyle = colors.crust;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Sear / Grill / Fiber stripes
      ctx.strokeStyle = colors.crust;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-18, -12);
      ctx.lineTo(18, -4);
      ctx.moveTo(-20, 2);
      ctx.lineTo(16, 10);
      ctx.moveTo(-15, 14);
      ctx.lineTo(12, 18);
      ctx.stroke();

      // Meat moisture gloss highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(-16, -10, 22, 6);

    } else if (ing.bioState.cutLevel === 1) {
      // === SLICED / DICED CHUNKS ===
      const chunkCount = Math.min(8, Math.max(4, ing.bioState.cutPieces || 6));
      for (let c = 0; c < chunkCount; c++) {
        const cAngle = (c / chunkCount) * Math.PI * 2 + ((c * 17) % 5);
        const cDist = 8 + (c % 3) * 8;
        const cx = Math.cos(cAngle) * cDist;
        const cy = Math.sin(cAngle) * cDist;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(((c * 37) % 60) * (Math.PI / 180));

        ctx.fillStyle = colors.base;
        ctx.beginPath();
        ctx.roundRect(-8, -7, 16, 14, 3);
        ctx.fill();

        ctx.strokeStyle = colors.crust;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore();
      }

    } else {
      // === MINCED / GROUND PUREE ===
      ctx.fillStyle = colors.base;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = colors.crust;
      for (let m = 0; m < 18; m++) {
        const mAngle = (m / 18) * Math.PI * 2;
        const mDist = 6 + (m % 4) * 4.5;
        ctx.beginPath();
        ctx.arc(Math.cos(mAngle) * mDist, Math.sin(mAngle) * mDist, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // 5. Seasonings & Char Overlay
  if (vessel.saltGrams > 0) {
    ctx.fillStyle = '#ffffff';
    for (let s = 0; s < 24; s++) {
      const sx = offsetCenterX - 50 + ((s * 23) % 100);
      const sy = -45 + ((s * 19) % 90);
      ctx.fillRect(sx, sy, 1.8, 1.8);
    }
  }

  // Fresh green herb garnish
  ctx.fillStyle = '#16a34a';
  for (let h = 0; h < 12; h++) {
    const hx = offsetCenterX - 40 + ((h * 31) % 80);
    const hy = -35 + ((h * 29) % 70);
    ctx.fillRect(hx, hy, 2.2, 2.2);
  }

  // 6. Thermal Overlay: Steam Wisps & Smoke Puffs
  if (vessel.temperature >= 70) {
    const steamPulse = Math.sin(Date.now() / 350) * 0.15 + 0.35;
    ctx.fillStyle = `rgba(255, 255, 255, ${steamPulse})`;
    ctx.beginPath();
    ctx.arc(offsetCenterX - 20, -15, 28, 0, Math.PI * 2);
    ctx.arc(offsetCenterX + 25, -25, 32, 0, Math.PI * 2);
    ctx.arc(offsetCenterX, 15, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  if (vessel.smokeIntensity > 0.2) {
    const smokePulse = Math.sin(Date.now() / 250) * 0.2 + 0.5;
    ctx.fillStyle = `rgba(30, 41, 59, ${smokePulse * vessel.smokeIntensity})`;
    ctx.beginPath();
    ctx.arc(offsetCenterX - 10, -20, 45, 0, Math.PI * 2);
    ctx.arc(offsetCenterX + 15, -35, 50, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
