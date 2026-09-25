// Procedural 2D Canvas Models for Valuables and Kitchenware (Pots, Kettles, Plates, Cutlery, Mugs)
import { drawShadow, drawGlossBand } from './itemGraphicShared';

export function drawKitchenAndValuableItem(
  ctx: CanvasRenderingContext2D,
  itemId: string
): boolean {
  switch (itemId) {
    // ==========================================
    // === 1. VALUABLES (ЦЕННОСТИ) ===
    // ==========================================

    // Gold Wristwatch Slava (Золотые наручные часы «Слава»)
    case 'valuable_gold_watch': {
      drawShadow(ctx, 7, 8, 7, 0.28);

      // Leather strap top & bottom
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(-3, -11, 6, 22, 1);
      ctx.fill();

      // Stitching on leather strap
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([1, 1]);
      ctx.strokeRect(-2.5, -10.5, 5, 21);
      ctx.setLineDash([]);

      // Gold watch case (circular)
      const goldGrad = ctx.createLinearGradient(-7, -7, 7, 7);
      goldGrad.addColorStop(0, '#fef08a');
      goldGrad.addColorStop(0.3, '#eab308');
      goldGrad.addColorStop(0.7, '#ca8a04');
      goldGrad.addColorStop(1, '#854d0e');
      ctx.fillStyle = goldGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      ctx.fill();

      // Crown winder knob on right
      ctx.fillStyle = '#eab308';
      ctx.fillRect(7.2, -1.5, 1.2, 3);

      // Dial face (cream white enamel)
      ctx.fillStyle = '#fef8ee';
      ctx.beginPath();
      ctx.arc(0, 0, 5.8, 0, Math.PI * 2);
      ctx.fill();

      // Gold hour tick marks (12, 3, 6, 9)
      ctx.fillStyle = '#a16207';
      ctx.fillRect(-0.4, -5.2, 0.8, 1.2); // 12
      ctx.fillRect(-0.4, 4.0, 0.8, 1.2);  // 6
      ctx.fillRect(4.0, -0.4, 1.2, 0.8);  // 3
      ctx.fillRect(-5.2, -0.4, 1.2, 0.8); // 9

      // Black steel watch hands
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -3.8); // Minute hand
      ctx.moveTo(0, 0);
      ctx.lineTo(2.5, -0.8); // Hour hand
      ctx.stroke();

      // Center gold dot
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(0, 0, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Glass shine
      drawGlossBand(ctx, -4, -4, 3, 8, 0.25);
      return true;
    }

    // Antique Silver Pocket Watch (Карманные серебряные часы)
    case 'valuable_silver_pocket_watch': {
      drawShadow(ctx, 8, 9, 8, 0.3);

      // Top crown ring / loop
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, -9, 2.5, 0, Math.PI * 2);
      ctx.stroke();

      // Top winder stem
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-1, -7.5, 2, 1.8);

      // Pocket watch silver casing
      const silvGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 8.5);
      silvGrad.addColorStop(0, '#ffffff');
      silvGrad.addColorStop(0.5, '#cbd5e1');
      silvGrad.addColorStop(0.85, '#94a3b8');
      silvGrad.addColorStop(1, '#475569');
      ctx.fillStyle = silvGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 8.2, 0, Math.PI * 2);
      ctx.fill();

      // Inner silver bezel
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, 6.8, 0, Math.PI * 2);
      ctx.stroke();

      // Cream vintage dial face
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
      ctx.fill();

      // Blued steel hands
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-1.8, -4.2);
      ctx.moveTo(0, 0);
      ctx.lineTo(3.2, 1.2);
      ctx.stroke();

      // Roman tick marks
      ctx.fillStyle = '#334155';
      for (let i = 0; i < 12; i++) {
        const ang = (i * Math.PI) / 6;
        const tx = Math.sin(ang) * 5.0;
        const ty = -Math.cos(ang) * 5.0;
        ctx.beginPath();
        ctx.arc(tx, ty, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      drawGlossBand(ctx, -5, -4, 3, 9, 0.22);
      return true;
    }

    // Gold Ring with Diamond (Золотое кольцо с бриллиантом)
    case 'valuable_diamond_ring': {
      drawShadow(ctx, 6, 7, 6, 0.25);

      // Gold ring band (torus shape from top-angled perspective)
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, 1.5, 6.2, 5.0, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Specular highlight on band
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.ellipse(-2, 0.5, 4.5, 3.5, 0, Math.PI * 0.8, Math.PI * 1.5);
      ctx.stroke();

      // Crown setting (4 gold prongs)
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(-2.2, -5.5, 1.0, 2.5);
      ctx.fillRect(1.2, -5.5, 1.0, 2.5);

      // Brilliant Cut Diamond Gem
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.moveTo(0, -8.5); // top apex
      ctx.lineTo(3.2, -5.2);
      ctx.lineTo(2.0, -3.2);
      ctx.lineTo(0, -2.5); // bottom point
      ctx.lineTo(-2.0, -3.2);
      ctx.lineTo(-3.2, -5.2);
      ctx.closePath();
      ctx.fill();

      // Facet reflection lines
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, -8.5);
      ctx.lineTo(0, -2.5);
      ctx.moveTo(-3.2, -5.2);
      ctx.lineTo(3.2, -5.2);
      ctx.stroke();

      // Diamond sparkle star highlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-1.0, -6.5, 0.8, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Heavy Gold Chain (Массивная золотая цепочка)
    case 'valuable_gold_chain': {
      drawShadow(ctx, 8, 9, 7, 0.28);

      // Gold chain loop links
      const goldGrad = ctx.createLinearGradient(-8, -8, 8, 8);
      goldGrad.addColorStop(0, '#fef08a');
      goldGrad.addColorStop(0.5, '#eab308');
      goldGrad.addColorStop(1, '#a16207');

      ctx.strokeStyle = goldGrad;
      ctx.lineWidth = 1.8;

      // Draw oval chain loop
      ctx.beginPath();
      ctx.ellipse(0, 0, 7.5, 8.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Chain link bumps texture
      ctx.fillStyle = '#fef08a';
      for (let i = 0; i < 10; i++) {
        const ang = (i * Math.PI) / 5;
        const lx = Math.sin(ang) * 7.5;
        const ly = Math.cos(ang) * 8.5;
        ctx.beginPath();
        ctx.arc(lx, ly, 1.0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Gold lobster clasp at top
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(-2, -9, 4, 2.2);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-1, -8.6, 2, 1);
      return true;
    }

    // Baltic Amber Pendant (Балтийский янтарный кулон)
    case 'valuable_amber_pendant': {
      drawShadow(ctx, 6, 8, 7, 0.28);

      // Silver loop at top
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, -8.5, 2.0, 0, Math.PI * 2);
      ctx.stroke();

      // Silver bezel cap frame
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(-3.5, -7, 7, 3, 1);
      ctx.fill();

      // Amber gemstone body (teardrop)
      const amberGrad = ctx.createRadialGradient(-1, -2, 1, 0, 0, 7);
      amberGrad.addColorStop(0, '#fef08a');
      amberGrad.addColorStop(0.3, '#fbbf24');
      amberGrad.addColorStop(0.7, '#d97706');
      amberGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = amberGrad;

      ctx.beginPath();
      ctx.moveTo(0, -5.5);
      ctx.bezierCurveTo(5.5, -2, 6.0, 4, 0, 8.0);
      ctx.bezierCurveTo(-6.0, 4, -5.5, -2, 0, -5.5);
      ctx.closePath();
      ctx.fill();

      // Internal amber inclusion bubbles / flakes
      ctx.fillStyle = 'rgba(120, 53, 15, 0.6)';
      ctx.beginPath();
      ctx.arc(-1.5, 1, 1.2, 0, Math.PI * 2);
      ctx.arc(1.8, 3, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Glossy surface glare
      drawGlossBand(ctx, -2.5, -2, 2, 6, 0.35);
      return true;
    }

    // Imperial Silver Coin (Старинная серебряная монета 1913г)
    case 'valuable_antique_coin': {
      drawShadow(ctx, 7, 7, 6.5, 0.25);

      // Coin reeding outer circle
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(0, 0, 7.8, 0, Math.PI * 2);
      ctx.fill();

      // Milled edge notches
      ctx.fillStyle = '#334155';
      for (let i = 0; i < 20; i++) {
        const ang = (i * Math.PI) / 10;
        ctx.fillRect(Math.sin(ang) * 7.2 - 0.3, Math.cos(ang) * 7.2 - 0.3, 0.6, 0.6);
      }

      // Silver coin face patina gradient
      const coinGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 7);
      coinGrad.addColorStop(0, '#ffffff');
      coinGrad.addColorStop(0.6, '#cbd5e1');
      coinGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = coinGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 7.0, 0, Math.PI * 2);
      ctx.fill();

      // Relief inner ring
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, 5.8, 0, Math.PI * 2);
      ctx.stroke();

      // Double-headed eagle heraldic crest in center
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      // Eagle wings
      ctx.moveTo(-3.5, -1.5);
      ctx.lineTo(0, -3.5);
      ctx.lineTo(3.5, -1.5);
      ctx.lineTo(2.0, 1.5);
      ctx.lineTo(0, 2.5);
      ctx.lineTo(-2.0, 1.5);
      ctx.closePath();
      ctx.fill();

      // Year text "1913"
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 1.8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('1913', 0, 4.8);
      return true;
    }

    // Gold Earrings with Rubies (Золотые серьги с рубинами)
    case 'valuable_ruby_earrings': {
      drawShadow(ctx, 8, 8, 7, 0.28);

      // Draw twin earrings (Left and Right)
      const offsets = [-3.5, 3.5];
      for (const ox of offsets) {
        // Gold french hook
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(ox, -7, 1.8, Math.PI, Math.PI * 2.2);
        ctx.lineTo(ox, -3);
        ctx.stroke();

        // Gold cap setting
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath();
        ctx.arc(ox, -2.5, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Ruby drop gemstone
        const rubyGrad = ctx.createRadialGradient(ox - 0.5, 0, 0.5, ox, 1, 4);
        rubyGrad.addColorStop(0, '#f87171');
        rubyGrad.addColorStop(0.4, '#dc2626');
        rubyGrad.addColorStop(0.85, '#991b1b');
        rubyGrad.addColorStop(1, '#450a0a');
        ctx.fillStyle = rubyGrad;

        ctx.beginPath();
        ctx.ellipse(ox, 1.5, 2.2, 3.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Gem specular shine
        ctx.fillStyle = '#fef2f2';
        ctx.beginPath();
        ctx.arc(ox - 0.8, -0.5, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    // Engraved Silver Cigarette Case (Серебряный гравированный портсигар)
    case 'valuable_silver_cigarette_case': {
      drawShadow(ctx, 9, 10, 8, 0.32);

      // Silver body with metallic gradient
      const silvGrad = ctx.createLinearGradient(-8, -9, 8, 9);
      silvGrad.addColorStop(0, '#f8fafc');
      silvGrad.addColorStop(0.4, '#cbd5e1');
      silvGrad.addColorStop(0.8, '#94a3b8');
      silvGrad.addColorStop(1, '#475569');
      ctx.fillStyle = silvGrad;

      ctx.beginPath();
      ctx.roundRect(-8, -9, 16, 18, 3);
      ctx.fill();

      // Outer bezel edge
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-7.5, -8.5, 15, 17);

      // Diagonal engraved stripe texture
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.35)';
      ctx.lineWidth = 0.6;
      for (let x = -6; x <= 6; x += 2.5) {
        ctx.beginPath();
        ctx.moveTo(x, -7.5);
        ctx.lineTo(x + 3, 7.5);
        ctx.stroke();
      }

      // Center coat-of-arms oval medallion
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.2, 4.0, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Push button latch on right edge
      ctx.fillStyle = '#dc2626'; // ruby push button
      ctx.fillRect(8.0, -1.5, 1.2, 3.0);
      return true;
    }

    // Souvenir Imperial Egg Replica (Яйцо в стиле Фаберже)
    case 'valuable_faberge_egg_replica': {
      drawShadow(ctx, 7, 9, 8, 0.35);

      // Gold tripod claw pedestal base
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(-5, 9);
      ctx.lineTo(0, 5);
      ctx.lineTo(5, 9);
      ctx.lineTo(3, 5);
      ctx.lineTo(-3, 5);
      ctx.closePath();
      ctx.fill();

      // Imperial Blue Enamel Egg Body
      const enamelGrad = ctx.createRadialGradient(-2, -3, 1, 0, -1, 7.5);
      enamelGrad.addColorStop(0, '#60a5fa');
      enamelGrad.addColorStop(0.35, '#1d4ed8');
      enamelGrad.addColorStop(0.8, '#1e3a8a');
      enamelGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = enamelGrad;

      ctx.beginPath();
      ctx.ellipse(0, -1, 6.2, 8.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Gold Filigree Lattice Grid
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 0.8;

      ctx.beginPath();
      // Diagonal grid lines
      ctx.moveTo(-5, -6); ctx.lineTo(5, 4);
      ctx.moveTo(-5, 2);  ctx.lineTo(3, -6);
      ctx.moveTo(-5, -2); ctx.lineTo(5, 2);
      ctx.moveTo(-3, 4);  ctx.lineTo(5, -4);
      ctx.stroke();

      // Tiny pearl/diamond crystal nodes on lattice intersections
      ctx.fillStyle = '#ffffff';
      const nodes = [{x: 0, y: -1}, {x: -2.5, y: -3.5}, {x: 2.5, y: 1.5}, {x: -2.5, y: 1.5}, {x: 2.5, y: -3.5}];
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Top gold imperial eagle crown
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, -9.2, 1.2, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Small Gold Bullion Bar 50g (Слиток золота 50г)
    case 'valuable_gold_bar_small': {
      drawShadow(ctx, 8, 9, 8, 0.3);

      // Gold Bar metallic gradient
      const barGrad = ctx.createLinearGradient(-7, -8, 7, 8);
      barGrad.addColorStop(0, '#fef08a');
      barGrad.addColorStop(0.3, '#eab308');
      barGrad.addColorStop(0.7, '#ca8a04');
      barGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = barGrad;

      // Bevelled ingot shape
      ctx.beginPath();
      ctx.roundRect(-7, -9, 14, 18, 2);
      ctx.fill();

      // Inner bevel stamped facet
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.roundRect(-5.5, -7.5, 11, 15, 1);
      ctx.fill();

      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.roundRect(-5.0, -7.0, 10, 14, 1);
      ctx.fill();

      // Refinery Stamped markings
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 1.8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('999.9', 0, -3.5);
      ctx.fillText('GOLD', 0, -0.5);
      ctx.fillText('50g', 0, 2.5);

      // Serial bar code stamp
      ctx.fillRect(-3, 4.5, 6, 0.8);
      return true;
    }

    // Silver Bullion Bar 100g (Слиток серебра 100г)
    case 'valuable_silver_bar_100g': {
      drawShadow(ctx, 9, 10, 8, 0.32);

      // Silver Ingot gradient
      const barGrad = ctx.createLinearGradient(-8, -9, 8, 9);
      barGrad.addColorStop(0, '#ffffff');
      barGrad.addColorStop(0.35, '#cbd5e1');
      barGrad.addColorStop(0.7, '#94a3b8');
      barGrad.addColorStop(1, '#475569');
      ctx.fillStyle = barGrad;

      ctx.beginPath();
      ctx.roundRect(-8, -10, 16, 20, 2);
      ctx.fill();

      // Inner bevel face
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-6.5, -8.5, 13, 17, 1);
      ctx.fill();

      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(-6.0, -8.0, 12, 16, 1);
      ctx.fill();

      // Stamped markings
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 1.8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SILVER', 0, -4.5);
      ctx.fillText('999', 0, -1.5);
      ctx.fillText('100g', 0, 1.5);

      // Protective plastic capsule outline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-8.5, -10.5, 17, 21);
      return true;
    }

    // Carved Jade Dragon Statuette (Нефритовая резная статуэтка)
    case 'valuable_jade_figurine': {
      drawShadow(ctx, 8, 9, 8, 0.35);

      // Dark wooden base stand
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.roundRect(-7, 5, 14, 4, 1);
      ctx.fill();

      // Translucent Jade Dragon / Lion figurine
      const jadeGrad = ctx.createRadialGradient(-2, -3, 1, 0, 0, 8);
      jadeGrad.addColorStop(0, '#86efac');
      jadeGrad.addColorStop(0.3, '#22c55e');
      jadeGrad.addColorStop(0.7, '#15803d');
      jadeGrad.addColorStop(1, '#064e3b');
      ctx.fillStyle = jadeGrad;

      // Stylized dragon silhouette
      ctx.beginPath();
      ctx.moveTo(-5, 5);
      ctx.bezierCurveTo(-6, 0, -4, -6, -1, -8);
      ctx.bezierCurveTo(2, -10, 6, -6, 5, -2);
      ctx.bezierCurveTo(4, 1, 6, 3, 5, 5);
      ctx.closePath();
      ctx.fill();

      // Jade carved scale highlights
      ctx.strokeStyle = '#bbf7d0';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(-1, -3, 1.8, 0, Math.PI);
      ctx.arc(1.5, -1, 1.8, 0, Math.PI);
      ctx.stroke();

      drawGlossBand(ctx, -3, -6, 2, 8, 0.28);
      return true;
    }


    // ==========================================
    // === 2. KITCHENWARE (КУХОННАЯ УТВАРЬ) ===
    // ==========================================

    // Enamel Pot (Эмалированная кастрюля)
    case 'kitchen_pot_enamel': {
      drawShadow(ctx, 10, 8, 8, 0.3);

      // Black Bakelite side handles
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-11, -3, 3, 6, 1.5);
      ctx.roundRect(8, -3, 3, 6, 1.5);
      ctx.fill();

      // Bright Red Enamel Pot Body
      const enamelGrad = ctx.createLinearGradient(-8, -6, 8, 6);
      enamelGrad.addColorStop(0, '#f87171');
      enamelGrad.addColorStop(0.3, '#ef4444');
      enamelGrad.addColorStop(0.8, '#dc2626');
      enamelGrad.addColorStop(1, '#991b1b');
      ctx.fillStyle = enamelGrad;

      ctx.beginPath();
      ctx.roundRect(-8, -6, 16, 13, 3);
      ctx.fill();

      // White Polka Dots / Flower ornament on enamel
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-4, -1, 1.2, 0, Math.PI * 2);
      ctx.arc(0, 2, 1.2, 0, Math.PI * 2);
      ctx.arc(4, -1, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Black Rim accent on top
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-8.2, -6.5, 16.4, 1.2);

      // Enamel Lid with Black Knob
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(0, -7, 8.2, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Center Knob
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, -9, 1.8, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Stainless Steel Pot (Стальная кастрюля из нержавейки)
    case 'kitchen_pot_steel': {
      drawShadow(ctx, 10, 8, 8, 0.32);

      // Stainless Tubular Handles
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-9.5, 0, 2.8, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(9.5, 0, 2.8, Math.PI * 1.5, Math.PI * 0.5);
      ctx.stroke();

      // Polished Stainless Steel Body
      const stGrad = ctx.createLinearGradient(-8, 0, 8, 0);
      stGrad.addColorStop(0, '#e2e8f0');
      stGrad.addColorStop(0.25, '#ffffff');
      stGrad.addColorStop(0.5, '#cbd5e1');
      stGrad.addColorStop(0.75, '#f1f5f9');
      stGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = stGrad;

      ctx.beginPath();
      ctx.roundRect(-8, -5, 16, 12, 2);
      ctx.fill();

      // Satin steel horizontal band accent
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(-8, 2, 16, 0.1);

      // Glass Lid with Stainless Steel Rim
      ctx.fillStyle = 'rgba(224, 242, 254, 0.55)';
      ctx.beginPath();
      ctx.ellipse(0, -6, 8.0, 3.0, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Lid Steel Knob & Steam Vent Hole
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(0, -8, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Tiny steam vent
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(3.5, -6.5, 0.5, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Aluminum Pot (Алюминиевая кастрюля)
    case 'kitchen_pot_aluminum': {
      drawShadow(ctx, 9, 8, 8, 0.28);

      // Flat Aluminum Handles
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-10.5, -2, 2.5, 4);
      ctx.fillRect(8.0, -2, 2.5, 4);

      // Matte brushed aluminum body
      const alGrad = ctx.createLinearGradient(-8, -5, 8, 5);
      alGrad.addColorStop(0, '#cbd5e1');
      alGrad.addColorStop(0.5, '#94a3b8');
      alGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = alGrad;

      ctx.beginPath();
      ctx.roundRect(-8, -5, 16, 12, 1.5);
      ctx.fill();

      // Flat Aluminum Lid
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(0, -5.5, 8.2, 2.0, 0, 0, Math.PI * 2);
      ctx.fill();

      // Aluminum Wire Loop Handle on lid
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(0, -7, 1.8, Math.PI, Math.PI * 2);
      ctx.stroke();
      return true;
    }

    // Cast Iron Pot / Dutch Oven (Чугунный казан/кастрюля)
    case 'kitchen_pot_cast_iron': {
      drawShadow(ctx, 10, 9, 8, 0.4);

      // Thick Cast Side Handles
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-10.5, -2, 2.5, 4);
      ctx.fillRect(8.0, -2, 2.5, 4);

      // Heavy Rough Cast Iron Body
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-8, -5, 16, 13, 4);
      ctx.fill();

      // Cast Iron Lid
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, -6, 8.2, 3.0, 0, 0, Math.PI * 2);
      ctx.fill();

      // Polished Brass Knob on lid
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(0, -8.2, 1.6, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }


    // Enamel Tea Kettle (Эмалированный чайник)
    case 'kitchen_kettle_enamel': {
      drawShadow(ctx, 9, 8, 8, 0.3);

      // Spout on right
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(6, -2);
      ctx.lineTo(10, -6);
      ctx.lineTo(11, -4.5);
      ctx.lineTo(7, 2);
      ctx.closePath();
      ctx.fill();

      // Teal/Cream Enamel Body
      const ketGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 8);
      ketGrad.addColorStop(0, '#5eead4');
      ketGrad.addColorStop(0.5, '#0d9488');
      ketGrad.addColorStop(1, '#115e59');
      ctx.fillStyle = ketGrad;

      ctx.beginPath();
      ctx.ellipse(0, 1, 7.5, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lid with knob
      ctx.fillStyle = '#0d9488';
      ctx.beginPath();
      ctx.ellipse(0, -4.5, 4.5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#115e59';
      ctx.beginPath();
      ctx.arc(0, -6, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Arching overhead handle (black with wood grip)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, -3, 7.0, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      // Wooden handle grip segment
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(0, -3, 7.0, Math.PI * 1.35, Math.PI * 1.65);
      ctx.stroke();
      return true;
    }

    // Steel Whistling Kettle (Стальной чайник со свистком)
    case 'kitchen_kettle_steel': {
      drawShadow(ctx, 9, 8, 8, 0.35);

      // Whistling spout on right
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(5, -1);
      ctx.lineTo(10, -5);
      ctx.lineTo(11, -3);
      ctx.lineTo(6, 3);
      ctx.closePath();
      ctx.fill();

      // Whistle tip (red flap)
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(10, -5.5, 1.8, 2.5);

      // Chrome Dome Body
      const chrmGrad = ctx.createRadialGradient(-2, -3, 1, 0, 0, 8);
      chrmGrad.addColorStop(0, '#ffffff');
      chrmGrad.addColorStop(0.4, '#e2e8f0');
      chrmGrad.addColorStop(0.75, '#94a3b8');
      chrmGrad.addColorStop(1, '#475569');
      ctx.fillStyle = chrmGrad;

      ctx.beginPath();
      ctx.ellipse(0, 1.5, 7.5, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ergonomic Overhead Black Handle
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -2, 7.2, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      return true;
    }

    // Electric Glass Kettle (Электрический чайник)
    case 'kitchen_kettle_electric': {
      drawShadow(ctx, 8, 9, 8, 0.32);

      // Black power base
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-7, 6, 14, 2.5, 1);
      ctx.fill();

      // Clear Borosilicate Glass Cylinder
      ctx.fillStyle = 'rgba(224, 242, 254, 0.45)';
      ctx.beginPath();
      ctx.roundRect(-6, -6, 12, 12, 2);
      ctx.fill();

      // Internal Blue LED Water Glow
      const ledGrad = ctx.createLinearGradient(0, -6, 0, 6);
      ledGrad.addColorStop(0, 'rgba(56, 189, 248, 0.1)');
      ledGrad.addColorStop(1, 'rgba(14, 165, 233, 0.6)');
      ctx.fillStyle = ledGrad;
      ctx.fillRect(-5.5, -1, 11, 7);

      // Stainless Steel Rim & Handle
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-6, -7, 12, 1.5);

      // Right handle
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-6, -5);
      ctx.lineTo(-9, -3);
      ctx.lineTo(-9, 4);
      ctx.lineTo(-6, 5);
      ctx.stroke();
      return true;
    }

    // Clay Teapot (Глиняный заварочный чайник)
    case 'kitchen_kettle_clay': {
      drawShadow(ctx, 8, 8, 7.5, 0.28);

      // Terracotta Clay Gradient
      const clayGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 7);
      clayGrad.addColorStop(0, '#f97316');
      clayGrad.addColorStop(0.5, '#c2410c');
      clayGrad.addColorStop(1, '#7c2d12');
      ctx.fillStyle = clayGrad;

      // Clay Body
      ctx.beginPath();
      ctx.ellipse(0, 1, 6.8, 5.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Spout on right
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(9, -4);
      ctx.lineTo(8, -2);
      ctx.lineTo(5, 3);
      ctx.closePath();
      ctx.fill();

      // Loop handle on left
      ctx.strokeStyle = '#c2410c';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(-6, 1, 3.2, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();

      // Clay Lid
      ctx.fillStyle = '#9a3412';
      ctx.beginPath();
      ctx.arc(0, -4.5, 3.5, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -5.5, 1.0, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }


    // Cast Iron Skillet (Чугунная сковорода)
    case 'kitchen_pan_cast_iron': {
      drawShadow(ctx, 9, 10, 8, 0.38);

      // Long Wooden Handle extending top-left
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(-12, -12);
      ctx.stroke();

      // Brass hanging loop
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(-12.5, -12.5, 1.2, 0, Math.PI * 2);
      ctx.stroke();

      // Heavy Black Cast Iron Pan Rim
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(1, 1, 8.0, 0, Math.PI * 2);
      ctx.fill();

      // Inner Cooking Surface
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(1, 1, 6.8, 0, Math.PI * 2);
      ctx.fill();

      // Pouring spouts on sides
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-7.2, 0, 1.2, 2);
      ctx.fillRect(8.2, 0, 1.2, 2);
      return true;
    }

    // Non-Stick Teflon Pan (Тефлоновая сковорода)
    case 'kitchen_pan_teflon': {
      drawShadow(ctx, 9, 10, 8, 0.32);

      // Black Bakelite Handle extending top-left
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(-12, -12);
      ctx.stroke();

      // Red heat indicator dot on handle root
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(-5.5, -5.5, 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Outer Brushed Aluminum Rim
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(1, 1, 8.2, 0, Math.PI * 2);
      ctx.fill();

      // Dark Teflon Surface
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(1, 1, 7.2, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }


    // Glazed Ceramic Plate (Керамическая тарелка)
    case 'kitchen_plate_ceramic': {
      drawShadow(ctx, 9, 9, 7.5, 0.25);

      // Off-white Glazed Ceramic Rim
      const cerGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 8.5);
      cerGrad.addColorStop(0, '#ffffff');
      cerGrad.addColorStop(0.7, '#f8fafc');
      cerGrad.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = cerGrad;

      ctx.beginPath();
      ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
      ctx.fill();

      // Inner Recess Rim
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, 5.8, 0, Math.PI * 2);
      ctx.stroke();

      drawGlossBand(ctx, -5, -4, 2.5, 9, 0.22);
      return true;
    }

    // Fine Porcelain Plate with Gzhel Pattern (Фарфоровая тарелка)
    case 'kitchen_plate_porcelain': {
      drawShadow(ctx, 9, 9, 7.5, 0.25);

      // Fine Porcelain Rim
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
      ctx.fill();

      // Gzhel Cobalt Blue Ornamental Ring
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      ctx.stroke();

      // 24k Gold Leaf inner border
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
      ctx.stroke();

      // Center blue flower ornament
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Enamel Deep Bowl (Эмалированная глубокая миска)
    case 'kitchen_plate_enamel': {
      drawShadow(ctx, 8, 8, 7.5, 0.28);

      // Soviet Blue/White Enamel Bowl
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.arc(0, 0, 8.0, 0, Math.PI * 2);
      ctx.fill();

      // Dark Blue Rim line
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 8.0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner bowl depth gradient
      const depGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 6.5);
      depGrad.addColorStop(0, '#e2e8f0');
      depGrad.addColorStop(1, '#ffffff');
      ctx.fillStyle = depGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Carved Wooden Bowl (Деревянная резная пиала)
    case 'kitchen_bowl_wooden': {
      drawShadow(ctx, 8, 8, 7.5, 0.28);

      // Wood Grain Radial Gradient
      const wGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 8);
      wGrad.addColorStop(0, '#fde047');
      wGrad.addColorStop(0.4, '#d97706');
      wGrad.addColorStop(0.85, '#92400e');
      wGrad.addColorStop(1, '#451a03');
      ctx.fillStyle = wGrad;

      ctx.beginPath();
      ctx.arc(0, 0, 8.0, 0, Math.PI * 2);
      ctx.fill();

      // Concentric tree ring lines
      ctx.strokeStyle = 'rgba(69, 26, 3, 0.3)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
      ctx.stroke();
      return true;
    }


    // Ceramic Mug (Керамическая кружка)
    case 'kitchen_mug_ceramic': {
      drawShadow(ctx, 7, 8, 7, 0.28);

      // Sturdy Handle on right
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(4.5, 0, 3.2, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();

      // Navy Blue Ceramic Cylinder
      const mugGrad = ctx.createLinearGradient(-5, -6, 5, 6);
      mugGrad.addColorStop(0, '#3b82f6');
      mugGrad.addColorStop(0.5, '#1d4ed8');
      mugGrad.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = mugGrad;

      ctx.beginPath();
      ctx.roundRect(-5.5, -6, 10, 12, 2.5);
      ctx.fill();

      // Dark opening on top
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, -6, 5.0, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

      drawGlossBand(ctx, -3.5, -5, 1.8, 10, 0.28);
      return true;
    }

    // Enamel Camping Mug (Эмалированная кружка)
    case 'kitchen_mug_enamel': {
      drawShadow(ctx, 7, 8, 7, 0.28);

      // Right handle
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(4.5, 0, 3.0, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();

      // White Enamel Body
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-5, -6, 9.5, 12, 1.5);
      ctx.fill();

      // Dark Blue Rim Accent
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(-5.2, -6.5, 9.9, 1.0);

      // Enamel chip on front
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(-1, 1, 1.0, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Transparent Glass Tea Mug (Стеклянная граненая кружка)
    case 'kitchen_mug_glass': {
      drawShadow(ctx, 7, 8, 7, 0.25);

      // Glass Handle
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.8)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(4.5, 0, 3.2, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();

      // Transparent Glass Body
      ctx.fillStyle = 'rgba(224, 242, 254, 0.4)';
      ctx.beginPath();
      ctx.roundRect(-5, -6, 9.5, 12, 2);
      ctx.fill();

      // Hot Amber Tea inside
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-4.5, -2, 8.5, 7.5);

      // Glass Facet vertical highlights
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(-3, -5, 0.1, 10);
      ctx.strokeRect(0, -5, 0.1, 10);
      return true;
    }

    // Porcelain Tea Cup (Фарфоровая чашка)
    case 'kitchen_cup_porcelain': {
      drawShadow(ctx, 8, 8, 7, 0.25);

      // Saucer underneath
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, 3, 8.5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Delicate handle
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(4.2, -2, 2.5, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();

      // Tapered Porcelain Cup Body
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-4.5, -6);
      ctx.lineTo(4.5, -6);
      ctx.lineTo(3.2, 1);
      ctx.lineTo(-3.2, 1);
      ctx.closePath();
      ctx.fill();

      // Gold rim
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-4.6, -6.5, 9.2, 0.8);
      return true;
    }


    // Chef's Knife (Кухонный нож шеф-повара)
    case 'kitchen_knife_chef': {
      drawShadow(ctx, 11, 4, 8, 0.3);

      // Full Tang Dark Wood Handle
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.roundRect(-12, -2, 8, 4, 1);
      ctx.fill();

      // Silver Rivets on handle
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(-10, 0, 0.8, 0, Math.PI * 2);
      ctx.arc(-7, 0, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Stainless Steel Bolster
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-4, -2.2, 1.8, 4.4);

      // Forged Wide Blade
      const bladeGrad = ctx.createLinearGradient(-2, -3, 10, 3);
      bladeGrad.addColorStop(0, '#ffffff');
      bladeGrad.addColorStop(0.5, '#e2e8f0');
      bladeGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = bladeGrad;

      ctx.beginPath();
      ctx.moveTo(-2.2, -2.5);
      ctx.lineTo(11, -0.5); // sharp tip
      ctx.lineTo(10, 2.5);  // curved heel
      ctx.lineTo(-2.2, 2.5);
      ctx.closePath();
      ctx.fill();

      // Razor edge highlight line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-2.2, 2.5);
      ctx.lineTo(11, -0.5);
      ctx.stroke();
      return true;
    }

    // Stainless Steel Fork (Стальная вилка)
    case 'kitchen_fork_steel': {
      drawShadow(ctx, 10, 3, 7, 0.22);

      // Handle neck
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(-11, -1.2, 12, 2.4, 0.8);
      ctx.fill();

      // 4 Steel Tines
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(1, -2.2, 10, 0.8);
      ctx.fillRect(1, -0.8, 10, 0.8);
      ctx.fillRect(1, 0.6, 10, 0.8);
      ctx.fillRect(1, 2.0, 10, 0.8);
      return true;
    }

    // Antique Silver Fork (Серебряная вилка)
    case 'kitchen_fork_silver': {
      drawShadow(ctx, 10, 3, 7, 0.25);

      // Engraved Rococo Silver Handle
      const silvGrad = ctx.createLinearGradient(-11, 0, 1, 0);
      silvGrad.addColorStop(0, '#f8fafc');
      silvGrad.addColorStop(0.5, '#cbd5e1');
      silvGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = silvGrad;

      ctx.beginPath();
      ctx.roundRect(-11, -1.5, 12, 3.0, 1.2);
      ctx.fill();

      // Rococo Engraving Details
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(-8, 0, 0.8, 0, Math.PI * 2);
      ctx.arc(-4, 0, 0.8, 0, Math.PI * 2);
      ctx.stroke();

      // 4 Silver Tines
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(1, -2.2, 10, 0.8);
      ctx.fillRect(1, -0.8, 10, 0.8);
      ctx.fillRect(1, 0.6, 10, 0.8);
      ctx.fillRect(1, 2.0, 10, 0.8);
      return true;
    }

    // Stainless Steel Spoon (Стальная ложка)
    case 'kitchen_spoon_steel': {
      drawShadow(ctx, 10, 4, 7, 0.22);

      // Handle
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(-11, -1.0, 12, 2.0, 0.8);
      ctx.fill();

      // Oval Spoon Bowl
      const spGrad = ctx.createRadialGradient(5, 0, 0.5, 5, 0, 4);
      spGrad.addColorStop(0, '#ffffff');
      spGrad.addColorStop(0.7, '#cbd5e1');
      spGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = spGrad;

      ctx.beginPath();
      ctx.ellipse(5.5, 0, 5.0, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Khokhloma Wooden Spoon (Деревянная хохломская ложка)
    case 'kitchen_spoon_wooden': {
      drawShadow(ctx, 10, 4, 7, 0.28);

      // Wooden Handle
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(-11, -1.2, 12, 2.4, 1.0);
      ctx.fill();

      // Khokhloma Red & Gold Spoon Bowl
      ctx.fillStyle = '#dc2626'; // Russian Red
      ctx.beginPath();
      ctx.ellipse(5.5, 0, 5.2, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Gold Leaf and Black Berries Motif
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(4, -1, 1.0, 0, Math.PI * 2);
      ctx.arc(7, 1, 1.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(5.5, 0, 0.8, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    default:
      return false;
  }
}
