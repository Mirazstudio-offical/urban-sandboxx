// =====================================================================
// PROCEDURAL 2D CANVAS GRAPHICS FOR DYNAMIC PREPS, COOKWARE & FINISHED DISHES
// =====================================================================
// 1. drawCulinaryDishItem: Renders icon / ground / inventory model (24x24 scale)
// 2. drawLiveCulinaryViewport: High-fidelity interactive workstation canvas
// =====================================================================

import { drawShadow } from './itemGraphicShared';
import { CookwareVessel, CulinaryIngredient } from '../cookingEngine';

// Stable pseudo-random seed
function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export type CulinaryFoodType =
  | 'potato'
  | 'carrot'
  | 'onion'
  | 'cabbage'
  | 'mushroom'
  | 'pasta'
  | 'rice'
  | 'egg'
  | 'bread'
  | 'cheese'
  | 'flour'
  | 'sugar'
  | 'salt'
  | 'pepper'
  | 'fish'
  | 'poultry'
  | 'meat'
  | 'tomato'
  | 'greens'
  | 'generic';

export function identifyIngredientType(ing: any): CulinaryFoodType {
  const name = (ing?.nameRu || ing?.name || '').toLowerCase();
  const id = (ing?.sourceItemId || ing?.itemId || '').toLowerCase();

  if (name.includes('картоф') || id.includes('potato')) return 'potato';
  if (name.includes('морков') || id.includes('carrot')) return 'carrot';
  if (name.includes('лук') || name.includes('чеснок') || id.includes('onion') || id.includes('garlic')) return 'onion';
  if (name.includes('капуст') || id.includes('cabbage')) return 'cabbage';
  if (name.includes('гриб') || id.includes('mushroom')) return 'mushroom';
  if (name.includes('макарон') || name.includes('паст') || name.includes('лапш') || id.includes('pasta') || id.includes('noodle')) return 'pasta';
  if (name.includes('рис') || name.includes('гречк') || name.includes('круп') || id.includes('rice') || id.includes('grain')) return 'rice';
  if (name.includes('яйц') || id.includes('egg')) return 'egg';
  if (name.includes('хлеб') || name.includes('сухар') || name.includes('батон') || id.includes('bread')) return 'bread';
  if (name.includes('сыр') || id.includes('cheese')) return 'cheese';
  if (name.includes('мук') || id.includes('flour')) return 'flour';
  if (name.includes('сахар') || id.includes('sugar')) return 'sugar';
  if (name.includes('сол') || id.includes('salt')) return 'salt';
  if (name.includes('перец') || id.includes('pepper')) return 'pepper';
  if (name.includes('зелен') || name.includes('укроп') || name.includes('петрушк') || id.includes('herb')) return 'greens';
  if (name.includes('томат') || name.includes('помидор') || id.includes('tomato')) return 'tomato';
  if (name.includes('рыб') || name.includes('лосос') || name.includes('окунь') || id.includes('fish') || id.includes('salmon')) return 'fish';
  if (name.includes('куриц') || name.includes('цыпл') || name.includes('индейк') || name.includes('утк') || id.includes('chicken') || id.includes('poultry')) return 'poultry';
  if (name.includes('говядин') || name.includes('свинин') || name.includes('баран') || name.includes('мяс') || name.includes('фарш') || name.includes('колбас') || id.includes('meat') || id.includes('beef') || id.includes('pork')) return 'meat';

  return 'generic';
}

/**
 * Procedural rendering of an individual ingredient with its REAL item texture & cooking state.
 * No generic steak fallback! Vegetables look like vegetables, pasta looks like pasta!
 */
export function drawProceduralIngredient(
  ctx: CanvasRenderingContext2D,
  ing: any,
  scale: number = 1.0
): void {
  const type = identifyIngredientType(ing);
  const cutLevel = ing.cookingAttributes?.cutLevel ?? ing.bioState?.cutLevel ?? (ing.itemId?.includes('minced') ? 2 : 0);
  const isBoiled = (ing.cookingAttributes?.boiled ?? 0) > 0.2;
  const isFried = (ing.cookingAttributes?.fried ?? 0) > 0.2;
  const isBurnt = (ing.cookingAttributes?.charring ?? ing.bioState?.charring ?? 0) > 0.35;

  ctx.save();
  ctx.scale(scale, scale);

  switch (type) {
    case 'potato': {
      if (cutLevel >= 2) {
        // Mashed / pureed potato
        ctx.fillStyle = isBoiled ? '#fef9c3' : '#fef08a';
        ctx.beginPath();
        ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath();
        ctx.arc(-1, -1, 1.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (cutLevel === 1) {
        // Potato wedges / slices
        ctx.fillStyle = isFried ? '#fde047' : (isBoiled ? '#fef9c3' : '#fef08a');
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.2, 2.6, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isFried ? (isBurnt ? '#451a03' : '#a16207') : '#b45309';
        ctx.lineWidth = isFried ? 0.9 : 0.6;
        ctx.stroke();
      } else {
        // Whole potato tuber
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.ellipse(0, 0, 6.0, 4.2, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(-2.5, -1, 0.6, 0, Math.PI * 2);
        ctx.arc(2.0, 1.2, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'carrot': {
      if (cutLevel >= 2) {
        // Minced orange dice
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(-2.5, -2, 2, 2);
        ctx.fillRect(0.5, -1.5, 2, 2);
        ctx.fillRect(-1.5, 0.8, 2, 2);
      } else if (cutLevel === 1) {
        // Sliced carrot round coin
        ctx.fillStyle = isBoiled ? '#c2410c' : '#ea580c';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
        ctx.fill();
        if (isFried) {
          ctx.strokeStyle = '#7c2d12';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      } else {
        // Whole tapered orange carrot
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(-6, -1.8);
        ctx.lineTo(6, 0.2);
        ctx.lineTo(-6, 1.8);
        ctx.closePath();
        ctx.fill();
        // Green top stem
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(-7.5, -0.8, 2, 1.6);
      }
      break;
    }

    case 'onion': {
      // Translucent ivory / golden crescents
      const onionBase = isFried ? '#d97706' : (isBoiled ? '#fef08a' : '#fef9c3');
      const onionRim = isFried ? '#78350f' : '#ca8a04';
      ctx.strokeStyle = onionRim;
      ctx.fillStyle = onionBase;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(0, 0, 3.6, 0.3, Math.PI * 1.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 2.2, 0.5, Math.PI * 1.5);
      ctx.stroke();
      break;
    }

    case 'cabbage':
    case 'greens': {
      // Thin crisp ribbon strips of cabbage/greens
      ctx.strokeStyle = isBoiled ? '#4d7c0f' : '#16a34a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-3.5, -1.5);
      ctx.quadraticCurveTo(0, 2, 3.5, -1);
      ctx.stroke();
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-2, 1.5);
      ctx.quadraticCurveTo(1, -2, 3, 1);
      ctx.stroke();
      break;
    }

    case 'mushroom': {
      // Sliced mushroom umbrella profile
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, -1, 3.8, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#f5f5f4';
      ctx.fillRect(-1.2, -1, 2.4, 3.8);
      ctx.fillStyle = '#a8a29e';
      ctx.fillRect(-3, -1, 6, 0.8);
      break;
    }

    case 'pasta': {
      // Golden yellow pasta noodle curl
      ctx.strokeStyle = isBoiled ? '#fef08a' : '#fde047';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-3.5, -1);
      ctx.bezierCurveTo(-1.5, 3, 1.5, -3, 3.5, 1);
      ctx.stroke();
      break;
    }

    case 'rice': {
      // Cluster of white/cream grains
      ctx.fillStyle = isBoiled ? '#f8fafc' : '#ffffff';
      for (const pt of [[-2, -1.2], [1.5, -1.5], [-1, 1.5], [2, 1]]) {
        ctx.beginPath();
        ctx.ellipse(pt[0], pt[1], 1.8, 0.9, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 0.3;
        ctx.stroke();
      }
      break;
    }

    case 'egg': {
      // White albumen with rich sunny yolk
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.8, 3.6, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(0, 0, 2.0, 0, Math.PI * 2);
      ctx.fill();
      if (isFried) {
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.8, 3.6, 0.1, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }

    case 'bread': {
      // Golden toasted bread cube / crouton
      ctx.fillStyle = isFried ? '#b45309' : '#fef08a';
      ctx.beginPath();
      ctx.roundRect(-3.5, -3.5, 7, 7, 1);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      break;
    }

    case 'cheese': {
      // Pale yellow cheese with tiny holes
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(-3.5, -3);
      ctx.lineTo(4, 0);
      ctx.lineTo(-3.5, 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(-1, -0.5, 0.7, 0, Math.PI * 2);
      ctx.arc(1.5, 0.2, 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'flour':
    case 'sugar':
    case 'salt':
    case 'pepper': {
      // Fine powdery granular dust
      const dustColor = type === 'pepper' ? '#18181b' : (type === 'sugar' ? '#f8fafc' : (type === 'salt' ? '#ffffff' : '#fef9c3'));
      ctx.fillStyle = dustColor;
      ctx.beginPath();
      ctx.arc(0, 0, 4.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = type === 'pepper' ? '#52525b' : '#cbd5e1';
      for (const p of [[-2, -1], [1.5, -2], [0, 2], [2.2, 1]]) {
        ctx.fillRect(p[0], p[1], 0.8, 0.8);
      }
      break;
    }

    case 'fish': {
      // Flaky salmon cutlet
      ctx.fillStyle = isBoiled || isFried ? '#fed7aa' : '#fb7185';
      ctx.beginPath();
      ctx.roundRect(-4.5, -2.5, 9, 5, 1.2);
      ctx.fill();
      ctx.strokeStyle = isFried ? '#9a3412' : '#94a3b8';
      ctx.lineWidth = 0.7;
      ctx.stroke();
      break;
    }

    case 'poultry': {
      // Pale tender poultry / chicken breast
      ctx.fillStyle = isFried ? '#fde68a' : (isBoiled ? '#fef3c7' : '#fbcfe8');
      ctx.beginPath();
      ctx.roundRect(-4.2, -2.8, 8.4, 5.6, 1.5);
      ctx.fill();
      if (isFried) {
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      break;
    }

    case 'meat': {
      // Beef / pork / meat chunks (ONLY for actual meat items!)
      const meatColor = isFried
        ? (isBurnt ? '#18181b' : '#78350f')
        : (isBoiled ? '#a8a29e' : '#e11d48');
      ctx.fillStyle = meatColor;
      ctx.beginPath();
      ctx.roundRect(-4.5, -3.0, 9, 6, 1.5);
      ctx.fill();
      ctx.strokeStyle = isBurnt ? '#09090b' : (isFried ? '#451a03' : '#be123c');
      ctx.lineWidth = 0.8;
      ctx.stroke();
      break;
    }

    case 'tomato': {
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(-0.8, -4.5, 1.6, 1.4);
      break;
    }

    default: {
      // Clean neutral grocery produce cube/slice
      ctx.fillStyle = isFried ? '#ca8a04' : (isBoiled ? '#fed7aa' : '#fb923c');
      ctx.beginPath();
      ctx.roundRect(-3.5, -2.5, 7, 5, 1);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  // Burnt crust specks if charred
  if (isBurnt) {
    ctx.fillStyle = '#09090b';
    ctx.fillRect(-2, -1, 1.2, 1.2);
    ctx.fillRect(1.5, 0.8, 1.0, 1.0);
  }

  ctx.restore();
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
    itemId === 'food_mix' ||
    itemId.startsWith('cooked_') ||
    itemId.startsWith('prep_') ||
    Boolean(item?.culinaryData);

  if (!isDish) return false;

  const data = item?.culinaryData || {};
  const isMix = Boolean(data.isMix || itemId === 'food_mix');
  const isWorkpiece = Boolean(data.isWorkpiece || itemId === 'prep_workpiece') && !isMix;
  const ingredientsList: any[] = data.ingredients || [];
  const dishType = data.dishType || (isWorkpiece ? 'salad' : (isMix ? 'mix' : 'fried'));

  // Container Type Detection
  let containerType = data.containerType;
  if (!containerType) {
    if (itemId.startsWith('kitchen_pot_') || itemId === 'pot_clay_medium') containerType = 'pot';
    else if (itemId.startsWith('kitchen_pan_')) containerType = 'pan';
    else if (itemId.startsWith('kitchen_bowl_') || itemId === 'soup_bowl_empty') containerType = 'bowl';
    else if (itemId.startsWith('kitchen_plate_')) containerType = 'plate';
    else if (isMix) containerType = 'bowl';
    else if (isWorkpiece) containerType = 'board';
    else if (dishType === 'soup') containerType = 'pot';
    else containerType = 'plate';
  }

  // 1. Drop Shadow
  drawShadow(ctx, 8.5, 3.5, 8.5, 0.3);

  // 2. Outer Vessel / Surface
  if (containerType === 'board') {
    // === OAK CUTTING BOARD (WORKPIECE) ===
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.roundRect(-8.5, -7.5, 17, 15, 2.5);
    ctx.fill();

    ctx.fillStyle = '#78350f';
    ctx.fillRect(-8.5, -3.8, 17, 0.7);
    ctx.fillRect(-8.5, 2.2, 17, 0.7);

    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-5, -1.5);
    ctx.lineTo(-2, 0.5);
    ctx.moveTo(1, -2);
    ctx.lineTo(4, -0.5);
    ctx.stroke();

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

    // Sizzling oil sheen
    const grad = ctx.createRadialGradient(-2, -2, 1, -1.5, 0, 7);
    grad.addColorStop(0, 'rgba(250, 204, 21, 0.45)');
    grad.addColorStop(1, 'rgba(180, 83, 9, 0.15)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(-1.5, 0, 6.8, 0, Math.PI * 2);
    ctx.fill();

  } else if (containerType === 'pot') {
    // === ENAMEL RED POT (MATCHES KITCHEN_POT_ENAMEL) ===
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-9.8, -2, 19.6, 4, 1.5);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();

    // Enamel white polka dots
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-5, -4, 0.9, 0, Math.PI * 2);
    ctx.arc(5, -4, 0.9, 0, Math.PI * 2);
    ctx.arc(0, 5, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Black rim
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, 8.2, 0, Math.PI * 2);
    ctx.stroke();

    // Liquid Layer (Water / Simmering Broth)
    const hasLiquids = (data.liquids && data.liquids.length > 0) || dishType === 'soup';
    const brothGrad = ctx.createRadialGradient(-1, -1, 1, 0, 0, 7.5);
    if (dishType === 'soup' || hasLiquids) {
      brothGrad.addColorStop(0, '#f59e0b');
      brothGrad.addColorStop(0.7, '#b45309');
      brothGrad.addColorStop(1, '#78350f');
    } else {
      brothGrad.addColorStop(0, '#38bdf8');
      brothGrad.addColorStop(0.7, '#0284c7');
      brothGrad.addColorStop(1, '#0369a1');
    }
    ctx.fillStyle = brothGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 7.3, 0, Math.PI * 2);
    ctx.fill();

    // Floating lipid droplets
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(-3, -2, 0.9, 0, Math.PI * 2);
    ctx.arc(2.5, -3, 0.7, 0, Math.PI * 2);
    ctx.arc(-2, 3, 0.8, 0, Math.PI * 2);
    ctx.arc(3.5, 2, 1.0, 0, Math.PI * 2);
    ctx.fill();

  } else if (containerType === 'bowl') {
    // === DEEP BOWL (CLAY / CERAMIC) ===
    ctx.fillStyle = isMix ? '#78350f' : '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isMix ? '#b45309' : '#1d4ed8';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, 8.2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = isMix ? '#92400e' : '#e2e8f0';
    ctx.beginPath();
    ctx.arc(0, 0, 7.2, 0, Math.PI * 2);
    ctx.fill();

    if (isMix) {
      // Flour / powdered spices bed
      ctx.fillStyle = '#fef9c3';
      ctx.beginPath();
      ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
      ctx.fill();
    }

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

  // 3. Render Real Constituent Ingredients inside container
  const offsetCenterX = containerType === 'pan' ? -1.5 : (containerType === 'board' ? -1 : 0);

  if (ingredientsList.length > 0) {
    const renderLimit = Math.min(6, ingredientsList.length);
    for (let i = 0; i < renderLimit; i++) {
      const ing = ingredientsList[i];
      const angle = (i / renderLimit) * Math.PI * 2 + 0.3;
      const radius = 2.4 + (i % 2) * 1.5;
      const px = offsetCenterX + Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;

      ctx.save();
      ctx.translate(px, py);
      drawProceduralIngredient(ctx, ing, 0.72);
      ctx.restore();
    }
  } else {
    // If no ingredients stored in array, synthesize based on nameRu/itemId
    const pseudoIng = {
      nameRu: item?.nameRu || item?.name || '',
      sourceItemId: itemId,
      cookingAttributes: data.cookingAttributes || {
        boiled: dishType === 'soup' ? 1 : 0,
        fried: dishType === 'fried' ? 1 : 0,
        baked: dishType === 'baked' ? 1 : 0,
        doneness: data.denaturation ?? 0.5,
        charring: data.charring ?? 0,
        cutLevel: 1
      }
    };
    ctx.save();
    ctx.translate(offsetCenterX, 0);
    drawProceduralIngredient(ctx, pseudoIng, 0.9);
    ctx.restore();
  }

  // 4. Steam Wisps if Hot
  const itemTemp = item?.temperature ?? 20;
  if (itemTemp >= 60) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(offsetCenterX - 2, -4);
    ctx.quadraticCurveTo(offsetCenterX - 4, -7, offsetCenterX - 2, -9);
    ctx.moveTo(offsetCenterX + 2, -3.5);
    ctx.quadraticCurveTo(offsetCenterX + 4, -6.5, offsetCenterX + 2, -8.5);
    ctx.stroke();
  }

  return true;
}

/**
 * HIGH-FIDELITY LIVE CULINARY VIEWPORT (Interactive Workstation Canvas)
 * Renders top-down cutting board, frying pan or pot with truthful procedural ingredients,
 * dynamic simmering broth/oil, heat glow, and Maillard reactions.
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

    ctx.fillStyle = '#92400e';
    ctx.fillRect(-100, -40, 200, 2.5);
    ctx.fillRect(-100, 15, 200, 2.5);
    ctx.fillRect(-100, 55, 200, 2.5);

    ctx.strokeStyle = 'rgba(69, 26, 3, 0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-45, -25);
    ctx.lineTo(-20, 10);
    ctx.moveTo(10, -35);
    ctx.lineTo(35, 5);
    ctx.stroke();

    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(80, 0, 10, 0, Math.PI * 2);
    ctx.fill();

  } else if (isStoveBare) {
    // === BARE STOVE BURNER ===
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, 95, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 92, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, 80, 0, Math.PI * 2);
    ctx.fill();

    if (vessel.temperature >= 60) {
      const glow = Math.min(1.0, (vessel.temperature - 60) / 200);
      ctx.fillStyle = `rgba(239, 68, 68, ${glow * 0.75})`;
      ctx.beginPath();
      ctx.arc(0, 0, 68, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (isPan) {
    // === HEAVY CAST IRON PAN ===
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(65, -16, 75, 32, 8);
    ctx.fill();

    ctx.fillStyle = '#78350f';
    ctx.fillRect(80, -11, 55, 22);

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-10, 0, 92, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(-10, 0, 82, 0, Math.PI * 2);
    ctx.fill();

  } else if (isPot) {
    // === RED ENAMEL STOCKPOT WITH SIDE HANDLES ===
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-108, -14, 216, 28, 8);
    ctx.fill();

    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, 0, 90, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // White polka dots
    ctx.fillStyle = '#ffffff';
    for (const dot of [[-45, -45], [45, -45], [-50, 45], [50, 45], [0, 65], [0, -65]]) {
      ctx.beginPath();
      ctx.arc(dot[0], dot[1], 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Black rim
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 86, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.arc(0, 0, 80, 0, Math.PI * 2);
    ctx.fill();

  } else if (isBowl) {
    // === DEEP BOWL ===
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

  // 3. Liquid Layer (Broth or Sizzling Oil)
  const offsetCenterX = isPan ? -10 : 0;
  const liquidRadius = isCuttingBoard ? 65 : 75;

  const hasOil = vessel.liquids.some(l => l.isFatOrOil);
  const hasWater = vessel.liquids.some(l => !l.isFatOrOil);

  if (vessel.liquids.length > 0) {
    if (hasWater) {
      // Golden broth or clear water
      const isSimmering = vessel.temperature >= 70;
      const brothGrad = ctx.createRadialGradient(offsetCenterX - 10, -10, 10, offsetCenterX, 0, liquidRadius);
      if (isSimmering) {
        brothGrad.addColorStop(0, 'rgba(245, 158, 11, 0.75)');
        brothGrad.addColorStop(0.7, 'rgba(180, 83, 9, 0.88)');
        brothGrad.addColorStop(1, 'rgba(120, 53, 15, 0.95)');
      } else {
        brothGrad.addColorStop(0, 'rgba(56, 189, 248, 0.55)');
        brothGrad.addColorStop(0.7, 'rgba(2, 132, 199, 0.7)');
        brothGrad.addColorStop(1, 'rgba(3, 105, 161, 0.8)');
      }
      ctx.fillStyle = brothGrad;
      ctx.beginPath();
      ctx.arc(offsetCenterX, 0, liquidRadius, 0, Math.PI * 2);
      ctx.fill();

      // Lipid droplets
      ctx.fillStyle = '#fef08a';
      const bubblePositions = [
        { x: -30, y: -20, r: 8 },
        { x: 25, y: -28, r: 6 },
        { x: -22, y: 32, r: 7 },
        { x: 35, y: 22, r: 9 }
      ];
      for (const bp of bubblePositions) {
        ctx.beginPath();
        ctx.arc(offsetCenterX + bp.x, bp.y, bp.r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (hasOil) {
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
  if (vessel.temperature >= 85 && (hasOil || hasWater)) {
    ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + (Date.now() / 250);
      const dist = 28 + ((i * 7) % 35);
      const bx = offsetCenterX + Math.cos(angle) * dist;
      const by = Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.arc(bx, by, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 4. Solid Ingredients Rendering with Truthful Procedural Models
  const ings = vessel.ingredients;
  for (let idx = 0; idx < ings.length; idx++) {
    const ing = ings[idx];
    const isSelected = selectedIdx === idx;
    const seed = hashSeed(ing.id);

    const totalIngs = Math.max(1, ings.length);
    const angle = (idx / totalIngs) * Math.PI * 2 + ((seed % 100) / 100) * 0.4;
    const dist = totalIngs === 1 ? 0 : 25 + (idx % 3) * 16;
    const basePx = offsetCenterX + Math.cos(angle) * dist;
    const basePy = Math.sin(angle) * dist;

    ctx.save();
    ctx.translate(basePx, basePy);

    if (isSelected) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, 32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowColor = 'transparent';
    }

    // Scale up for live high-res workstation
    drawProceduralIngredient(ctx, ing, 3.8);

    ctx.restore();
  }

  // 5. Seasonings Overlay
  if (vessel.saltGrams > 0) {
    ctx.fillStyle = '#ffffff';
    for (let s = 0; s < 20; s++) {
      const sx = offsetCenterX - 45 + ((s * 23) % 90);
      const sy = -40 + ((s * 19) % 80);
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  // 6. Thermal Overlay: Steam Wisps
  if (vessel.temperature >= 65) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2.5;
    for (let st = 0; st < 3; st++) {
      const sx = offsetCenterX - 25 + st * 25;
      ctx.beginPath();
      ctx.moveTo(sx, 10);
      ctx.quadraticCurveTo(sx - 15, -30, sx + 5, -60);
      ctx.stroke();
    }
  }

  ctx.restore();
}
