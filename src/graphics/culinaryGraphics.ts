// =====================================================================
// PHOTOREALISTIC 2.5D PROCEDURAL GRAPHICS FOR DYNAMIC PREPS, COOKWARE & DISHES
// =====================================================================
// 1. drawCulinaryDishItem: Renders icon / ground / inventory model (24x24 scale)
// 2. drawLiveCulinaryViewport: High-fidelity interactive workstation canvas
// =====================================================================

import {
  drawBotanicalLeaf,
  drawLitEllipse,
  drawLitSphere,
  drawOrganicBlobPath,
  drawShadow,
  hash01,
} from './itemGraphicShared';
import { CookwareVessel } from '../cookingEngine';

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

export function drawProceduralIngredient(
  ctx: CanvasRenderingContext2D,
  ing: any,
  scale: number = 1.0
): void {
  const type = identifyIngredientType(ing);
  const cutLevel = ing.cookingAttributes?.cutLevel ?? ing.bioState?.cutLevel ?? (ing.itemId?.includes('minced') ? 2 : 0);
  const isBoiled = (ing.cookingAttributes?.boiled ?? 0) > 0.2;
  const isFried = (ing.cookingAttributes?.fried ?? 0) > 0.2;
  const isBaked = (ing.cookingAttributes?.baked ?? 0) > 0.2;
  const isBurnt = (ing.cookingAttributes?.charring ?? ing.bioState?.charring ?? 0) > 0.35;
  const seed = String(ing?.id || ing?.sourceItemId || ing?.itemId || type);

  ctx.save();
  ctx.scale(scale, scale);

  switch (type) {
    case 'potato': {
      if (cutLevel >= 2) {
        // Creamy whipped mash rosette with melted butter sheen & herb speck
        drawOrganicBlobPath(ctx, 0, 0, 4.0, 3.3, 11, 0.12, 10);
        const mGrad = ctx.createRadialGradient(-1.0, -1.0, 0.3, 0, 0, 4.2);
        mGrad.addColorStop(0.0, '#ffffff');
        mGrad.addColorStop(0.55, isBoiled ? '#fef9c3' : '#fef08a');
        mGrad.addColorStop(1.0, '#ca8a04');
        ctx.fillStyle = mGrad;
        ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.ellipse(-0.3, -0.3, 1.3, 0.85, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#15803d';
        ctx.fillRect(1.1, 0.8, 0.55, 0.55);
      } else if (cutLevel === 1) {
        // Roasted / pan-fried golden potato wedge
        const pLight = isBurnt ? '#78350f' : (isFried || isBaked) ? '#fef08a' : '#fffbeb';
        const pMid = isBurnt ? '#451a03' : (isFried || isBaked) ? '#f59e0b' : '#fef08a';
        const pDark = isBurnt ? '#1c1917' : (isFried || isBaked) ? '#92400e' : '#b45309';
        drawLitEllipse(ctx, 0, 0, 4.3, 2.5, 0.18, pLight, pMid, pDark, undefined, isFried ? 0.38 : 0.2);
        if (isFried || isBaked) {
          ctx.fillStyle = isBurnt ? 'rgba(9,9,11,0.55)' : 'rgba(180,83,9,0.42)';
          ctx.beginPath();
          ctx.ellipse(0.6, 0.4, 2.0, 0.8, 0.18, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Whole unpeeled earthy potato
        drawLitEllipse(ctx, 0, 0, 5.4, 3.8, -0.1, '#eab308', '#b45309', '#78350f', undefined, 0.14);
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.ellipse(-2.1, -0.9, 0.5, 0.26, 0.2, 0, Math.PI * 2);
        ctx.ellipse(1.8, 1.0, 0.45, 0.24, -0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'carrot': {
      if (cutLevel >= 2) {
        for (const [cx, cy] of [[-2.0, -1.4], [1.0, -1.6], [-0.8, 1.0], [1.8, 1.2]]) {
          ctx.fillStyle = isBurnt ? '#451a03' : '#c2410c';
          ctx.fillRect(cx - 0.8, cy - 0.5, 1.7, 1.6);
          ctx.fillStyle = isBurnt ? '#78350f' : '#fb923c';
          ctx.fillRect(cx - 0.85, cy - 0.85, 1.7, 1.35);
        }
      } else if (cutLevel === 1) {
        // Ribbed carrot coin with lighter xylem ring
        drawLitSphere(
          ctx, 0, 0, 3.4,
          isBurnt ? '#9a3412' : '#fdba74',
          isBurnt ? '#451a03' : (isBoiled ? '#c2410c' : '#ea580c'),
          '#7c2d12', undefined, isFried ? 0.35 : 0.22
        );
        ctx.fillStyle = isBurnt ? '#78350f' : '#fed7aa';
        ctx.beginPath();
        ctx.arc(0, 0, 1.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(124, 45, 18, 0.45)';
        ctx.lineWidth = 0.35;
        ctx.stroke();
      } else {
        const cGrad = ctx.createLinearGradient(-5, -2, 5, 2);
        cGrad.addColorStop(0, '#fdba74');
        cGrad.addColorStop(0.5, '#ea580c');
        cGrad.addColorStop(1, '#9a3412');
        ctx.fillStyle = cGrad;
        ctx.beginPath();
        ctx.moveTo(-5.5, -1.9);
        ctx.lineTo(5.8, 0.2);
        ctx.lineTo(-5.5, 1.9);
        ctx.closePath();
        ctx.fill();
        drawBotanicalLeaf(ctx, -5.2, 0, -2.5, 0.9, 0.25, '#4ade80', '#15803d');
      }
      break;
    }

    case 'onion': {
      // Translucent layered onion crescent rings
      const rim = isBurnt ? '#292524' : isFried ? '#92400e' : '#ca8a04';
      const inner = isBurnt ? '#57534e' : isFried ? '#f59e0b' : (isBoiled ? '#fef9c3' : '#ffffff');
      ctx.strokeStyle = rim;
      ctx.lineWidth = 1.25;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, 3.6, 0.25, Math.PI * 1.65);
      ctx.stroke();
      ctx.strokeStyle = inner;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, 3.55, 0.28, Math.PI * 1.62);
      ctx.stroke();
      ctx.strokeStyle = rim;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(0, 0, 2.2, 0.45, Math.PI * 1.45);
      ctx.stroke();
      break;
    }

    case 'cabbage':
    case 'greens': {
      const isGreens = type === 'greens';
      if (isGreens) {
        drawBotanicalLeaf(ctx, -3.2, 0.6, 4.2, 1.4, -0.35, isBoiled ? '#65a30d' : '#4ade80', '#14532d');
        drawBotanicalLeaf(ctx, -0.8, -0.6, 3.8, 1.3, 0.35, isBoiled ? '#4d7c0f' : '#22c55e', '#14532d');
      } else {
        ctx.strokeStyle = isBoiled ? '#84cc16' : '#f0fdf4';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-3.6, -1.4);
        ctx.quadraticCurveTo(0, 1.8, 3.6, -0.9);
        ctx.stroke();
        ctx.strokeStyle = isBoiled ? '#4d7c0f' : '#4ade80';
        ctx.lineWidth = 0.95;
        ctx.beginPath();
        ctx.moveTo(-2.4, 1.4);
        ctx.quadraticCurveTo(0.8, -1.6, 3.2, 1.1);
        ctx.stroke();
      }
      break;
    }

    case 'mushroom': {
      // Detailed sliced mushroom profile with stem, gill darks & browned cap
      const stemC = isFried ? '#fde68a' : '#f5f5f4';
      const capHi = isBurnt ? '#292524' : isFried ? '#b45309' : '#a8a29e';
      const capDk = isBurnt ? '#09090b' : isFried ? '#451a03' : '#57534e';
      ctx.fillStyle = stemC;
      ctx.beginPath();
      ctx.roundRect(-1.2, -0.6, 2.4, 3.8, 0.7);
      ctx.fill();
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-3.4, -0.9, 6.8, 0.9);
      const cGrad = ctx.createRadialGradient(-1.2, -2.5, 0.3, 0, -1.0, 4.2);
      cGrad.addColorStop(0, capHi);
      cGrad.addColorStop(1, capDk);
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(0, -0.8, 3.8, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'pasta': {
      // Twirled golden egg-pasta ribbon with specular highlight
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 2.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-3.8, -0.8);
      ctx.bezierCurveTo(-1.4, 3.2, 1.4, -3.2, 3.8, 0.8);
      ctx.stroke();
      ctx.strokeStyle = isBoiled ? '#fef9c3' : '#fde047';
      ctx.lineWidth = 1.25;
      ctx.stroke();
      break;
    }

    case 'rice': {
      for (const [rx, ry, rot] of [[-2.0, -1.0, 0.4], [1.4, -1.4, -0.3], [-1.0, 1.5, -0.2], [1.9, 1.1, 0.5]]) {
        drawLitEllipse(ctx, rx, ry, 1.65, 0.8, rot, '#ffffff', isBoiled ? '#f1f5f9' : '#fef9c3', '#cbd5e1', undefined, 0.35);
      }
      break;
    }

    case 'egg': {
      // Glossy fried/poached egg white + golden domed yolk
      drawOrganicBlobPath(ctx, 0, 0.1, 4.9, 3.7, 22, 0.12, 12);
      const wGrad = ctx.createRadialGradient(-1.2, -1.0, 0.5, 0, 0, 5.2);
      wGrad.addColorStop(0.0, '#ffffff');
      wGrad.addColorStop(0.75, '#f8fafc');
      wGrad.addColorStop(1.0, isFried ? '#d97706' : '#cbd5e1');
      ctx.fillStyle = wGrad;
      ctx.fill();
      if (isFried) {
        ctx.strokeStyle = isBurnt ? '#451a03' : '#b45309';
        ctx.lineWidth = 0.55;
        ctx.stroke();
      }
      drawLitSphere(ctx, 0.2, 0, 1.95, '#fef08a', '#f59e0b', '#b45309', undefined, 0.72);
      break;
    }

    case 'bread': {
      // Crispy golden-toasted crouton / bread slice with crust
      ctx.fillStyle = isBurnt ? '#18181b' : '#78350f';
      ctx.beginPath();
      ctx.roundRect(-3.6, -3.4, 7.2, 6.8, 1.2);
      ctx.fill();
      const bGrad = ctx.createRadialGradient(-1, -1, 0.4, 0, 0, 4.4);
      bGrad.addColorStop(0.0, isBurnt ? '#451a03' : (isFried || isBaked ? '#fde68a' : '#fffbeb'));
      bGrad.addColorStop(1.0, isBurnt ? '#1c1917' : (isFried || isBaked ? '#d97706' : '#fde68a'));
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.roundRect(-3.0, -2.8, 6.0, 5.6, 0.8);
      ctx.fill();
      // Porous crumb alveoles
      ctx.fillStyle = 'rgba(120, 53, 15, 0.25)';
      ctx.beginPath();
      ctx.arc(-1.0, -0.8, 0.42, 0, Math.PI * 2);
      ctx.arc(1.2, 0.9, 0.36, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'cheese': {
      const chGrad = ctx.createLinearGradient(-3.5, -3, 4, 3);
      chGrad.addColorStop(0, '#fef08a');
      chGrad.addColorStop(0.55, isFried ? '#f59e0b' : '#facc15');
      chGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = chGrad;
      ctx.beginPath();
      ctx.moveTo(-3.6, -3.0);
      ctx.lineTo(4.2, -0.2);
      ctx.lineTo(-3.6, 3.0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(-1.2, -0.4, 0.68, 0, Math.PI * 2);
      ctx.arc(1.1, 0.2, 0.48, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'flour':
    case 'sugar':
    case 'salt':
    case 'pepper': {
      const mC = type === 'pepper' ? '#18181b' : type === 'sugar' ? '#f8fafc' : type === 'salt' ? '#ffffff' : '#fef9c3';
      const dC = type === 'pepper' ? '#09090b' : '#cbd5e1';
      drawLitSphere(ctx, 0, 0, 3.8, '#ffffff', mC, dC, undefined, 0.1);
      ctx.fillStyle = type === 'pepper' ? '#52525b' : '#94a3b8';
      for (let i = 0; i < 8; i++) {
        const px = (hash01(seed, i * 2) - 0.5) * 4.5;
        const py = (hash01(seed, i * 2 + 1) - 0.5) * 4.5;
        ctx.fillRect(px, py, 0.55, 0.55);
      }
      break;
    }

    case 'fish': {
      // Flaky salmon / whitefish fillet chunk with myosepta lines & sear crust
      const fGrad = ctx.createLinearGradient(-4.5, -2.5, 4.5, 2.5);
      if (isBurnt) {
        fGrad.addColorStop(0, '#451a03'); fGrad.addColorStop(1, '#18181b');
      } else if (isBoiled || isFried) {
        fGrad.addColorStop(0, '#ffedd5'); fGrad.addColorStop(0.55, '#fdba74'); fGrad.addColorStop(1, '#c2410c');
      } else {
        fGrad.addColorStop(0, '#fda4af'); fGrad.addColorStop(0.55, '#fb7185'); fGrad.addColorStop(1, '#be123c');
      }
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.roundRect(-4.6, -2.6, 9.2, 5.2, 1.3);
      ctx.fill();
      // Flake striation lines
      ctx.strokeStyle = isBoiled || isFried ? 'rgba(255,255,255,0.48)' : 'rgba(255, 228, 230, 0.65)';
      ctx.lineWidth = 0.45;
      for (const sx of [-2.4, 0, 2.4]) {
        ctx.beginPath();
        ctx.moveTo(sx - 0.6, -2.1);
        ctx.quadraticCurveTo(sx + 0.5, 0, sx - 0.5, 2.1);
        ctx.stroke();
      }
      break;
    }

    case 'poultry': {
      drawOrganicBlobPath(ctx, 0, 0, 4.5, 2.9, 55, 0.08, 10);
      const pGrad = ctx.createRadialGradient(-1.2, -1.0, 0.4, 0, 0, 4.8);
      if (isBurnt) {
        pGrad.addColorStop(0, '#78350f'); pGrad.addColorStop(1, '#18181b');
      } else if (isFried || isBaked) {
        pGrad.addColorStop(0, '#fef08a'); pGrad.addColorStop(0.55, '#f59e0b'); pGrad.addColorStop(1, '#92400e');
      } else if (isBoiled) {
        pGrad.addColorStop(0, '#ffffff'); pGrad.addColorStop(0.65, '#fef3c7'); pGrad.addColorStop(1, '#d6d3d1');
      } else {
        pGrad.addColorStop(0, '#fce7f3'); pGrad.addColorStop(0.65, '#fbcfe8'); pGrad.addColorStop(1, '#db2777');
      }
      ctx.fillStyle = pGrad;
      ctx.fill();
      if (isFried) {
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-2.5, -1.2); ctx.lineTo(1.8, 1.5);
        ctx.moveTo(-1.2, -1.8); ctx.lineTo(2.8, 0.6);
        ctx.stroke();
      }
      break;
    }

    case 'meat': {
      // Marbled beef/pork medallion with Maillard sear lines when fried
      drawOrganicBlobPath(ctx, 0, 0, 4.6, 3.1, 66, 0.08, 10);
      const mGrad = ctx.createRadialGradient(-1.2, -1.0, 0.4, 0, 0, 5.0);
      if (isBurnt) {
        mGrad.addColorStop(0, '#451a03'); mGrad.addColorStop(1, '#09090b');
      } else if (isFried || isBaked) {
        mGrad.addColorStop(0, '#b45309'); mGrad.addColorStop(0.55, '#78350f'); mGrad.addColorStop(1, '#451a03');
      } else if (isBoiled) {
        mGrad.addColorStop(0, '#d6d3d1'); mGrad.addColorStop(0.6, '#a8a29e'); mGrad.addColorStop(1, '#57534e');
      } else {
        mGrad.addColorStop(0, '#fb7185'); mGrad.addColorStop(0.5, '#e11d48'); mGrad.addColorStop(1, '#881337');
      }
      ctx.fillStyle = mGrad;
      ctx.fill();

      // Intramuscular fat marbling or sear grill marks
      ctx.strokeStyle = isFried ? '#290f02' : 'rgba(255, 241, 242, 0.55)';
      ctx.lineWidth = isFried ? 0.65 : 0.42;
      ctx.beginPath();
      ctx.moveTo(-2.5, -1.5); ctx.lineTo(1.5, 1.6);
      ctx.moveTo(-0.5, -2.0); ctx.lineTo(3.0, 0.8);
      ctx.stroke();
      break;
    }

    case 'tomato': {
      drawLitSphere(ctx, 0, 0, 3.7, '#f87171', '#dc2626', '#7f1d1d', undefined, 0.72);
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(0, -3.1, 1.35, 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    default: {
      drawLitEllipse(
        ctx, 0, 0, 3.6, 2.4, 0.15,
        isBurnt ? '#78350f' : '#fed7aa',
        isBurnt ? '#451a03' : (isFried ? '#d97706' : (isBoiled ? '#fde68a' : '#fb923c')),
        isBurnt ? '#18181b' : '#9a3412',
        undefined, 0.3
      );
    }
  }

  if (isBurnt) {
    ctx.fillStyle = '#09090b';
    for (let i = 0; i < 4; i++) {
      const cx = (hash01(seed, i * 2 + 30) - 0.5) * 4.5;
      const cy = (hash01(seed, i * 2 + 31) - 0.5) * 3.0;
      ctx.beginPath();
      ctx.arc(cx, cy, 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

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

  drawShadow(ctx, 8.6, 3.4, 8.4, 0.28);

  if (containerType === 'board') {
    // Rich oiled oak butcher cutting board
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.roundRect(-8.5, -6.9, 17, 15, 2.3);
    ctx.fill();

    const wGrad = ctx.createLinearGradient(-8.5, -7.5, 8.5, 7.5);
    wGrad.addColorStop(0.0, '#d97706');
    wGrad.addColorStop(0.45, '#b45309');
    wGrad.addColorStop(1.0, '#78350f');
    ctx.fillStyle = wGrad;
    ctx.beginPath();
    ctx.roundRect(-8.5, -7.5, 17, 14.6, 2.3);
    ctx.fill();

    // Butcher-block stave seams & wood grain
    ctx.fillStyle = 'rgba(69, 26, 3, 0.38)';
    ctx.fillRect(-8.5, -3.5, 17, 0.55);
    ctx.fillRect(-8.5, 2.0, 17, 0.55);
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.45)';
    ctx.lineWidth = 0.45;
    ctx.strokeRect(-7.2, -6.2, 14.4, 12.0);
    // Thumb hole
    ctx.fillStyle = '#290f02';
    ctx.beginPath();
    ctx.arc(6.3, 0, 1.15, 0, Math.PI * 2);
    ctx.fill();
  } else if (containerType === 'pan') {
    // Riveted cast-iron skillet with walnut grip handle
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(5.2, -1.7, 6.8, 3.4, 1.2);
    ctx.fill();
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.roundRect(6.8, -1.0, 4.5, 2.0, 0.7);
    ctx.fill();

    const rimGrad = ctx.createLinearGradient(-9.5, -8.5, 6.5, 8.5);
    rimGrad.addColorStop(0, '#475569');
    rimGrad.addColorStop(0.5, '#0f172a');
    rimGrad.addColorStop(1, '#020617');
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(-1.5, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();

    const panGrad = ctx.createRadialGradient(-3.0, -2.0, 0.5, -1.5, 0, 7.5);
    panGrad.addColorStop(0, '#334155');
    panGrad.addColorStop(0.85, '#1e293b');
    panGrad.addColorStop(1, '#09090b');
    ctx.fillStyle = panGrad;
    ctx.beginPath();
    ctx.arc(-1.5, 0, 7.2, 0, Math.PI * 2);
    ctx.fill();

    // Oil sheen
    const oilGrad = ctx.createRadialGradient(-2.8, -1.8, 0.4, -1.5, 0, 6.8);
    oilGrad.addColorStop(0, 'rgba(253, 224, 71, 0.38)');
    oilGrad.addColorStop(1, 'rgba(180, 83, 9, 0.08)');
    ctx.fillStyle = oilGrad;
    ctx.beginPath();
    ctx.arc(-1.5, 0, 6.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (containerType === 'pot') {
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-9.8, -1.8, 19.6, 3.6, 1.3);
    ctx.fill();

    const potGrad = ctx.createRadialGradient(-2.5, -2.5, 0.6, 0, 0, 8.8);
    potGrad.addColorStop(0, '#f87171');
    potGrad.addColorStop(0.55, '#dc2626');
    potGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = potGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.85;
    ctx.stroke();

    const hasLiquids = (data.liquids && data.liquids.length > 0) || dishType === 'soup';
    const brothGrad = ctx.createRadialGradient(-1.5, -1.5, 0.6, 0, 0, 7.4);
    if (dishType === 'soup' || hasLiquids) {
      brothGrad.addColorStop(0.0, '#fcd34d');
      brothGrad.addColorStop(0.55, '#d97706');
      brothGrad.addColorStop(1.0, '#78350f');
    } else {
      brothGrad.addColorStop(0.0, '#7dd3fc');
      brothGrad.addColorStop(0.7, '#0284c7');
      brothGrad.addColorStop(1.0, '#075985');
    }
    ctx.fillStyle = brothGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 7.2, 0, Math.PI * 2);
    ctx.fill();

    // Floating lipid globules
    ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
    for (const [bx, by, br] of [[-2.8, -1.8, 0.85], [2.4, -2.8, 0.65], [-1.8, 2.8, 0.72], [3.2, 1.8, 0.9]]) {
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (containerType === 'bowl') {
    const bGrad = ctx.createRadialGradient(-2.5, -2.5, 0.6, 0, 0, 8.8);
    bGrad.addColorStop(0.0, isMix ? '#b45309' : '#ffffff');
    bGrad.addColorStop(0.75, isMix ? '#78350f' : '#e2e8f0');
    bGrad.addColorStop(1.0, isMix ? '#451a03' : '#94a3b8');
    ctx.fillStyle = bGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isMix ? '#92400e' : '#1d4ed8';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, 8.0, 0, Math.PI * 2);
    ctx.stroke();

    const innerGrad = ctx.createRadialGradient(1.5, 1.5, 0.8, 0, 0, 7.2);
    innerGrad.addColorStop(0, isMix ? '#d97706' : '#f8fafc');
    innerGrad.addColorStop(1, isMix ? '#78350f' : '#cbd5e1');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 7.1, 0, Math.PI * 2);
    ctx.fill();

    if (isMix) {
      drawLitSphere(ctx, 0, 0, 6.0, '#fffbeb', '#fef3c7', '#d97706', undefined, 0.12);
    }
  } else {
    // Glazed porcelain dinner plate with soft recessed well shading
    const rimGrad = ctx.createRadialGradient(-2.5, -2.5, 0.8, 0, 0, 8.8);
    rimGrad.addColorStop(0.0, '#ffffff');
    rimGrad.addColorStop(0.78, '#f1f5f9');
    rimGrad.addColorStop(1.0, '#94a3b8');
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
    ctx.stroke();

    const wellGrad = ctx.createRadialGradient(1.2, 1.2, 0.5, 0, 0, 6.2);
    wellGrad.addColorStop(0.0, '#ffffff');
    wellGrad.addColorStop(0.85, '#f8fafc');
    wellGrad.addColorStop(1.0, '#e2e8f0');
    ctx.fillStyle = wellGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 6.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Constituent procedural ingredients plated inside
  const offsetCenterX = containerType === 'pan' ? -1.5 : (containerType === 'board' ? -1 : 0);

  if (ingredientsList.length > 0) {
    const renderLimit = Math.min(6, ingredientsList.length);
    for (let i = 0; i < renderLimit; i++) {
      const ing = ingredientsList[i];
      const angle = (i / renderLimit) * Math.PI * 2 + 0.3;
      const radius = 2.4 + (i % 2) * 1.45;
      const px = offsetCenterX + Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;

      ctx.save();
      ctx.translate(px, py);
      drawProceduralIngredient(ctx, ing, 0.72);
      ctx.restore();
    }
  } else {
    const pseudoIng = {
      nameRu: item?.nameRu || item?.name || '',
      sourceItemId: itemId,
      cookingAttributes: data.cookingAttributes || {
        boiled: dishType === 'soup' ? 1 : 0,
        fried: dishType === 'fried' ? 1 : 0,
        baked: dishType === 'baked' ? 1 : 0,
        doneness: data.denaturation ?? 0.5,
        charring: data.charring ?? 0,
        cutLevel: 1,
      },
    };
    ctx.save();
    ctx.translate(offsetCenterX, 0);
    drawProceduralIngredient(ctx, pseudoIng, 0.9);
    ctx.restore();
  }

  // Hot steam wisps
  const itemTemp = item?.temperature ?? 20;
  if (itemTemp >= 60) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 0.7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(offsetCenterX - 2, -4);
    ctx.quadraticCurveTo(offsetCenterX - 3.8, -7, offsetCenterX - 2, -9);
    ctx.moveTo(offsetCenterX + 2, -3.5);
    ctx.quadraticCurveTo(offsetCenterX + 3.8, -6.5, offsetCenterX + 2, -8.5);
    ctx.stroke();
  }

  return true;
}

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

  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;

  if (isCuttingBoard) {
    const wGrad = ctx.createLinearGradient(-100, -85, 100, 85);
    wGrad.addColorStop(0.0, '#d97706');
    wGrad.addColorStop(0.5, '#b45309');
    wGrad.addColorStop(1.0, '#78350f');
    ctx.fillStyle = wGrad;
    ctx.beginPath();
    ctx.roundRect(-100, -85, 200, 170, 12);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.fillStyle = 'rgba(69, 26, 3, 0.35)';
    ctx.fillRect(-100, -40, 200, 2.5);
    ctx.fillRect(-100, 15, 200, 2.5);
    ctx.fillRect(-100, 55, 200, 2.5);
    ctx.strokeStyle = 'rgba(69, 26, 3, 0.4)';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(-86, -71, 172, 142);

    ctx.fillStyle = '#290f02';
    ctx.beginPath();
    ctx.arc(80, 0, 10, 0, Math.PI * 2);
    ctx.fill();
  } else if (isStoveBare) {
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, 95, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    ctx.stroke();

    const burnerGrad = ctx.createRadialGradient(-15, -15, 5, 0, 0, 80);
    burnerGrad.addColorStop(0, '#1e293b');
    burnerGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = burnerGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 80, 0, Math.PI * 2);
    ctx.fill();

    if (vessel.temperature >= 60) {
      const glow = Math.min(1.0, (vessel.temperature - 60) / 200);
      ctx.fillStyle = `rgba(239, 68, 68, ${glow * 0.72})`;
      ctx.beginPath();
      ctx.arc(0, 0, 68, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (isPan) {
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(65, -16, 75, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.roundRect(80, -11, 55, 22, 6);
    ctx.fill();

    const pRimGrad = ctx.createLinearGradient(-102, -92, 82, 92);
    pRimGrad.addColorStop(0, '#334155');
    pRimGrad.addColorStop(0.5, '#0f172a');
    pRimGrad.addColorStop(1, '#020617');
    ctx.fillStyle = pRimGrad;
    ctx.beginPath();
    ctx.arc(-10, 0, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    const pFloorGrad = ctx.createRadialGradient(-30, -25, 8, -10, 0, 82);
    pFloorGrad.addColorStop(0, '#334155');
    pFloorGrad.addColorStop(0.85, '#1e293b');
    pFloorGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = pFloorGrad;
    ctx.beginPath();
    ctx.arc(-10, 0, 82, 0, Math.PI * 2);
    ctx.fill();
  } else if (isPot) {
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-108, -14, 216, 28, 8);
    ctx.fill();

    const potGrad = ctx.createRadialGradient(-25, -25, 10, 0, 0, 92);
    potGrad.addColorStop(0, '#ef4444');
    potGrad.addColorStop(0.7, '#dc2626');
    potGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = potGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 86, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, 0, 80, 0, Math.PI * 2);
    ctx.fill();
  } else if (isBowl) {
    const bGrad = ctx.createRadialGradient(-25, -25, 8, 0, 0, 90);
    bGrad.addColorStop(0, '#ffffff');
    bGrad.addColorStop(0.75, '#e2e8f0');
    bGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = bGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 88, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 84, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.arc(0, 0, 76, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const plGrad = ctx.createRadialGradient(-25, -25, 8, 0, 0, 90);
    plGrad.addColorStop(0, '#ffffff');
    plGrad.addColorStop(0.75, '#f1f5f9');
    plGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = plGrad;
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

  const offsetCenterX = isPan ? -10 : 0;
  const liquidRadius = isCuttingBoard ? 65 : 75;
  const hasOil = vessel.liquids.some((l) => l.isFatOrOil);
  const hasWater = vessel.liquids.some((l) => !l.isFatOrOil);

  if (vessel.liquids.length > 0) {
    if (hasWater) {
      const isSimmering = vessel.temperature >= 70;
      const brothGrad = ctx.createRadialGradient(offsetCenterX - 12, -12, 10, offsetCenterX, 0, liquidRadius);
      if (isSimmering) {
        brothGrad.addColorStop(0, 'rgba(251, 191, 36, 0.78)');
        brothGrad.addColorStop(0.7, 'rgba(180, 83, 9, 0.88)');
        brothGrad.addColorStop(1, 'rgba(120, 53, 15, 0.94)');
      } else {
        brothGrad.addColorStop(0, 'rgba(125, 211, 252, 0.55)');
        brothGrad.addColorStop(0.7, 'rgba(2, 132, 199, 0.7)');
        brothGrad.addColorStop(1, 'rgba(3, 105, 161, 0.8)');
      }
      ctx.fillStyle = brothGrad;
      ctx.beginPath();
      ctx.arc(offsetCenterX, 0, liquidRadius, 0, Math.PI * 2);
      ctx.fill();

      for (const [bx, by, br] of [[-30, -20, 8], [25, -28, 6], [-22, 32, 7], [35, 22, 9]]) {
        ctx.fillStyle = 'rgba(254, 240, 138, 0.78)';
        ctx.beginPath();
        ctx.arc(offsetCenterX + bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (hasOil) {
      const oilGrad = ctx.createRadialGradient(offsetCenterX - 15, -15, 10, offsetCenterX, 0, liquidRadius);
      oilGrad.addColorStop(0, 'rgba(253, 224, 71, 0.58)');
      oilGrad.addColorStop(0.7, 'rgba(234, 179, 8, 0.42)');
      oilGrad.addColorStop(1, 'rgba(180, 83, 9, 0.2)');
      ctx.fillStyle = oilGrad;
      ctx.beginPath();
      ctx.arc(offsetCenterX, 0, liquidRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (vessel.temperature >= 85 && (hasOil || hasWater)) {
    const phase = tickTime * 0.004;
    ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + phase;
      const dist = 28 + ((i * 7) % 35);
      const bx = offsetCenterX + Math.cos(angle) * dist;
      const by = Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.arc(bx, by, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const ings = vessel.ingredients;
  for (let idx = 0; idx < ings.length; idx++) {
    const ing = ings[idx];
    const isSelected = selectedIdx === idx;
    const h = hash01(String(ing.id || idx), idx);

    const totalIngs = Math.max(1, ings.length);
    const angle = (idx / totalIngs) * Math.PI * 2 + h * 0.4;
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

    drawProceduralIngredient(ctx, ing, 3.8);
    ctx.restore();
  }

  if (vessel.saltGrams > 0) {
    ctx.fillStyle = '#ffffff';
    for (let s = 0; s < 20; s++) {
      const sx = offsetCenterX - 45 + ((s * 23) % 90);
      const sy = -40 + ((s * 19) % 80);
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  if (vessel.temperature >= 65) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
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
