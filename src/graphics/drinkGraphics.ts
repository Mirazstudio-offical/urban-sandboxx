// Procedural 2D Canvas Models for Drink Items
import { drawShadow, drawGlossBand } from './itemGraphicShared';

export function drawDrinkItem(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  switch (itemId) {
    // Standard 0.5L PET Plastic Water Bottle
    case 'bottle_plastic_500':
    case 'bottle_water':
    case 'mineral_water':
    case 'water_bottle': {
      drawShadow(ctx, 6.2, 2.5, 7.8, 0.22);

      // Translucent PET plastic body (contoured waist)
      ctx.fillStyle = 'rgba(186, 230, 253, 0.75)';
      ctx.beginPath();
      ctx.moveTo(-4.5, -4);
      ctx.lineTo(-3.8, 5.5);
      ctx.quadraticCurveTo(-3.8, 7.2, 0, 7.2);
      ctx.quadraticCurveTo(3.8, 7.2, 3.8, 5.5);
      ctx.lineTo(4.5, -4);
      ctx.quadraticCurveTo(4.5, -5.5, 2.2, -6.5);
      ctx.lineTo(2.2, -8);
      ctx.lineTo(-2.2, -8);
      ctx.lineTo(-2.2, -6.5);
      ctx.quadraticCurveTo(-4.5, -5.5, -4.5, -4);
      ctx.closePath();
      ctx.fill();

      // Clear spring water liquid inside
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(-3.8, -1);
      ctx.lineTo(-3.6, 5.2);
      ctx.quadraticCurveTo(-3.6, 6.8, 0, 6.8);
      ctx.quadraticCurveTo(3.6, 6.8, 3.6, 5.2);
      ctx.lineTo(3.8, -1);
      ctx.closePath();
      ctx.fill();

      // White and blue brand label
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4.2, -0.5, 8.4, 4);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-4.2, 0.8, 8.4, 1.5);
      // Droplet wave on label
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, 1.5, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Horizontal bottle reinforcement ribs
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-4, -2.5); ctx.lineTo(4, -2.5);
      ctx.moveTo(-3.8, 5); ctx.lineTo(3.8, 5);
      ctx.stroke();

      // Glossy specular reflection streak
      drawGlossBand(ctx, -3.2, -4, 1.4, 10, 0.45);

      // Deep blue threaded screw cap
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-2.6, -9.2, 5.2, 2.8, 0.8);
      ctx.fill();
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(-2.6, -7.2, 5.2, 0.8); // tamper ring
      return true;
    }

    // Tall 1.5L Large PET Plastic Water Bottle (Пластиковая бутылка 1.5л)
    case 'bottle_plastic_1500': {
      drawShadow(ctx, 7.2, 2.8, 8.5, 0.25);

      // Tall contoured 1.5L PET bottle with ribbed waist and tapered neck
      ctx.fillStyle = 'rgba(186, 230, 253, 0.75)';
      ctx.beginPath();
      ctx.moveTo(-5.5, -6);
      ctx.lineTo(-4.8, 6.5);
      ctx.quadraticCurveTo(-4.8, 8.2, 0, 8.2);
      ctx.quadraticCurveTo(4.8, 8.2, 4.8, 6.5);
      ctx.lineTo(5.5, -6);
      ctx.quadraticCurveTo(5.5, -8, 2.6, -9);
      ctx.lineTo(2.6, -11);
      ctx.lineTo(-2.6, -11);
      ctx.lineTo(-2.6, -9);
      ctx.quadraticCurveTo(-5.5, -8, -5.5, -6);
      ctx.closePath();
      ctx.fill();

      // Clear purified spring water inside (up to neck)
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(-4.8, -3);
      ctx.lineTo(-4.4, 6.2);
      ctx.quadraticCurveTo(-4.4, 7.8, 0, 7.8);
      ctx.quadraticCurveTo(4.4, 7.8, 4.4, 6.2);
      ctx.lineTo(4.8, -3);
      ctx.closePath();
      ctx.fill();

      // Wide brand label across middle
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-5.2, -2, 10.4, 5.5);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-5.2, -0.5, 10.4, 2.2);

      // 1.5L typography on label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 2.4px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('1.5L', 0, 0.6);

      // Multiple structural annular ribs
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-5, -4.5); ctx.lineTo(5, -4.5);
      ctx.moveTo(-4.6, 4.5); ctx.lineTo(4.6, 4.5);
      ctx.moveTo(-4.6, 6.0); ctx.lineTo(4.6, 6.0);
      ctx.stroke();

      drawGlossBand(ctx, -4.0, -6, 1.5, 13, 0.45);

      // Blue screw cap on tall neck
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-2.8, -12.2, 5.6, 3.0, 0.8);
      ctx.fill();
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(-2.8, -10.0, 5.6, 0.8);
      return true;
    }

    // Empty Transparent Crinkled Plastic Water Bottle (Пустая пластиковая бутылка)
    case 'bottle_empty':
    case 'water_bottle_empty': {
      drawShadow(ctx, 6.0, 2.2, 7.5, 0.16);

      // Ultra-transparent crinkled PET plastic body (clear air inside, NO water)
      ctx.fillStyle = 'rgba(224, 242, 254, 0.35)';
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.75)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-4.5, -4);
      ctx.lineTo(-3.8, 5.5);
      ctx.quadraticCurveTo(-3.8, 7.2, 0, 7.2);
      ctx.quadraticCurveTo(3.8, 7.2, 3.8, 5.5);
      ctx.lineTo(4.5, -4);
      ctx.quadraticCurveTo(4.5, -5.5, 2.2, -6.5);
      ctx.lineTo(2.2, -8);
      ctx.lineTo(-2.2, -8);
      ctx.lineTo(-2.2, -6.5);
      ctx.quadraticCurveTo(-4.5, -5.5, -4.5, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Crinkle lines & dry internal reflections
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-2.5, -2); ctx.lineTo(1.5, 1); ctx.lineTo(-1, 4.5);
      ctx.moveTo(2, -1); ctx.lineTo(-1.5, 2.5);
      ctx.stroke();

      // Torn / faded label band
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(-4.0, -0.2, 8.0, 3.2);

      drawGlossBand(ctx, -3.2, -4, 1.0, 9.5, 0.4);

      // Blue cap
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-2.6, -9.2, 5.2, 2.8, 0.8);
      ctx.fill();
      return true;
    }

    // Glass / Plastic Milk Bottle (Бутылка молока)
    case 'milk_bottle': {
      drawShadow(ctx, 6.8, 2.6, 7.8, 0.25);

      // Glass bottle with rich opaque creamy white milk
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-4.6, -4);
      ctx.lineTo(-4.0, 5.5);
      ctx.quadraticCurveTo(-4.0, 7.2, 0, 7.2);
      ctx.quadraticCurveTo(4.0, 7.2, 4.0, 5.5);
      ctx.lineTo(4.6, -4);
      ctx.quadraticCurveTo(4.6, -5.5, 2.4, -6.5);
      ctx.lineTo(2.4, -8);
      ctx.lineTo(-2.4, -8);
      ctx.lineTo(-2.4, -6.5);
      ctx.quadraticCurveTo(-4.6, -5.5, -4.6, -4);
      ctx.closePath();
      ctx.fill();

      // Glass outline
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.8)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Green farm dairy label
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(-4.2, -0.5, 8.4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 2px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('МОЛОКО', 0, 1.5);

      // Dairy gold foil top cap
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.roundRect(-2.8, -9.2, 5.6, 2.8, 0.8);
      ctx.fill();

      drawGlossBand(ctx, -3.4, -4, 1.2, 10, 0.35);
      return true;
    }

    case 'kvas':
    case 'kvas_bottle': {
      drawShadow(ctx, 6.5, 2.6, 7.8, 0.24);

      // Authentic 1.5L Russian Bread Kvas in Dark Amber Ribbed Bottle
      // Rich translucent malt amber-brown bottle
      const kvasBottleGrad = ctx.createLinearGradient(-4.8, -6, 4.8, 7.5);
      kvasBottleGrad.addColorStop(0, '#78350f');
      kvasBottleGrad.addColorStop(0.3, '#92400e');
      kvasBottleGrad.addColorStop(0.7, '#451a03');
      kvasBottleGrad.addColorStop(1, '#291102');
      ctx.fillStyle = kvasBottleGrad;
      ctx.beginPath();
      ctx.moveTo(-4.8, -4);
      ctx.lineTo(-4.0, 5.5);
      ctx.quadraticCurveTo(-4.0, 7.2, 0, 7.2);
      ctx.quadraticCurveTo(4.0, 7.2, 4.0, 5.5);
      ctx.lineTo(4.8, -4);
      ctx.quadraticCurveTo(4.8, -5.5, 2.4, -6.5);
      ctx.lineTo(2.4, -8.2);
      ctx.lineTo(-2.4, -8.2);
      ctx.lineTo(-2.4, -6.5);
      ctx.quadraticCurveTo(-4.8, -5.5, -4.8, -4);
      ctx.closePath();
      ctx.fill();

      // Deep fermented malt liquid inside with foamy micro-bubbles
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(-4.0, -1);
      ctx.lineTo(-3.8, 5.2);
      ctx.quadraticCurveTo(-3.8, 6.8, 0, 6.8);
      ctx.quadraticCurveTo(3.8, 6.8, 3.8, 5.2);
      ctx.lineTo(4.0, -1);
      ctx.closePath();
      ctx.fill();

      // Foam head layer
      ctx.fillStyle = 'rgba(254, 243, 199, 0.7)';
      ctx.fillRect(-3.8, -1.2, 7.6, 0.8);

      // Traditional Gold & Rye Bread Label
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.roundRect(-4.4, -0.5, 8.8, 4.8, 0.6);
      ctx.fill();

      // Dark brown & gold borders
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-4.4, -0.5, 8.8, 1.0);
      ctx.fillRect(-4.4, 3.3, 8.8, 1.0);

      // Golden rye sheaf icon
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, 3.0); ctx.lineTo(0, 0.8);
      ctx.moveTo(-1.2, 1.6); ctx.lineTo(0, 2.2); ctx.lineTo(1.2, 1.6);
      ctx.stroke();

      // Horizontal reinforcement ridges
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-4.2, -2.8); ctx.lineTo(4.2, -2.8);
      ctx.moveTo(-3.8, 5.2); ctx.lineTo(3.8, 5.2);
      ctx.stroke();

      // Specular PET reflection streak
      drawGlossBand(ctx, -3.2, -4.5, 1.2, 10.5, 0.35);

      // Dark chocolate-brown plastic screw cap
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.roundRect(-2.6, -9.4, 5.2, 2.6, 0.8);
      ctx.fill();
      ctx.fillStyle = '#291102';
      ctx.fillRect(-2.6, -7.5, 5.2, 0.7);
      return true;
    }

    case 'soda_can':
    case 'can_alu_330':
    case 'cola_can':
    case 'cola': {
      drawShadow(ctx, 6.8, 2.6, 7.8, 0.25);

      // Red aluminum can cylinder body
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-5.5, -6, 11, 13.5, 2);
      ctx.fill();

      // Bottom silver rim
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(0, 7.2, 5.2, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Iconic white swooping wave graphic
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-5.5, 3.5);
      ctx.quadraticCurveTo(0, -1, 5.5, 1);
      ctx.stroke();

      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-5.5, 4.8);
      ctx.quadraticCurveTo(0, 0.5, 5.5, 2.5);
      ctx.stroke();

      // Vertical metallic sheen highlight
      drawGlossBand(ctx, -3.8, -6, 1.8, 13.5, 0.35);

      // Silver aluminum top rim
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(0, -6, 5.5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Recessed lid
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(0, -6, 4.4, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Metal pull tab with rivet
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.roundRect(-1.2, -7, 2.4, 2, 0.5);
      ctx.fill();
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(0, -6, 0.6, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'hot_coffee':
    case 'coffee':
    case 'paper_cup':
    case 'coffee_cup':
    case 'plastic_cup':
    case 'coffee_cup_empty': {
      drawShadow(ctx, 6.5, 2.6, 7.8, 0.22);

      // Tapered white paper cup body
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-5.2, -5.5);
      ctx.lineTo(5.2, -5.5);
      ctx.lineTo(4, 7.2);
      ctx.lineTo(-4, 7.2);
      ctx.closePath();
      ctx.fill();

      // Soft cup shadow on side
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(1.5, -5.5);
      ctx.lineTo(5.2, -5.5);
      ctx.lineTo(4, 7.2);
      ctx.lineTo(1.2, 7.2);
      ctx.closePath();
      ctx.fill();

      // Kraft brown corrugated heat sleeve
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(-4.9, -1.8);
      ctx.lineTo(4.9, -1.8);
      ctx.lineTo(4.3, 3.8);
      ctx.lineTo(-4.3, 3.8);
      ctx.closePath();
      ctx.fill();

      // Sleeve corrugated texture lines
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 0.7;
      for (let x = -3.8; x <= 3.8; x += 1.4) {
        ctx.beginPath();
        ctx.moveTo(x, -1.8);
        ctx.lineTo(x * 0.9, 3.8);
        ctx.stroke();
      }

      // Stylized coffee bean logo on sleeve
      ctx.fillStyle = '#3b1806';
      ctx.beginPath();
      ctx.ellipse(0, 1, 1.8, 2.2, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-0.2, -0.8);
      ctx.quadraticCurveTo(0.6, 1, -0.2, 2.8);
      ctx.stroke();

      // Snug black travel lid
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.ellipse(0, -5.5, 5.8, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Raised lid drinking spout
      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.roundRect(-2.8, -7.5, 5.6, 2.2, 0.8);
      ctx.fill();
      // Sip hole
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.ellipse(0, -6.8, 1.2, 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'energy_drink': {
      drawShadow(ctx, 6.2, 2.5, 7.8, 0.25);

      // Sleek midnight navy blue aluminum cylinder
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-5, -7.5, 10, 15, 2);
      ctx.fill();

      // Electric yellow lightning chevron
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(0.5, -4.5);
      ctx.lineTo(-2.8, 0.5);
      ctx.lineTo(-0.2, 0.5);
      ctx.lineTo(-1.2, 4.8);
      ctx.lineTo(2.8, -0.2);
      ctx.lineTo(0.2, -0.2);
      ctx.closePath();
      ctx.fill();

      // Neon cyan secondary accents
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-4.5, -6);
      ctx.lineTo(4.5, -3);
      ctx.moveTo(-4.5, 5);
      ctx.lineTo(4.5, 2);
      ctx.stroke();

      // Metallic gleam
      drawGlossBand(ctx, -3.5, -7.5, 1.6, 15, 0.3);

      // Silver top rim & recessed lid
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(0, -7.5, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(0, -7.5, 4, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Neon pull tab
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-1, -8.5, 2, 1.8);
      return true;
    }

    case 'fresh_juice':
    case 'tetra_pack_1000':
    case 'juice_pack':
    case 'juice':
    case 'juice_box': {
      drawShadow(ctx, 6.8, 2.6, 7.8, 0.22);

      // Orange tetrapak carton body
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.roundRect(-5.5, -6, 11, 13.5, 1.5);
      ctx.fill();

      // Top folded roof
      ctx.fillStyle = '#c2410c';
      ctx.beginPath();
      ctx.moveTo(-5.5, -6);
      ctx.lineTo(0, -8);
      ctx.lineTo(5.5, -6);
      ctx.closePath();
      ctx.fill();

      // Citrus slice graphic on front
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0.5, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(0, 0.5, 3.0, 0, Math.PI * 2);
      ctx.fill();
      // Segments
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 0.6;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(0, 0.5);
        ctx.lineTo(Math.cos(a) * 3, 0.5 + Math.sin(a) * 3);
        ctx.stroke();
      }

      // Green bendy drinking straw
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(2, -7.5);
      ctx.lineTo(3.2, -10.5);
      ctx.lineTo(5.5, -11.5);
      ctx.stroke();
      return true;
    }

    case 'cappuccino': {
      drawShadow(ctx, 6.5, 2.6, 7.8, 0.22);

      // Tapered warm terracotta cup body
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(-5.5, -4);
      ctx.lineTo(5.5, -4);
      ctx.lineTo(4.2, 7.2);
      ctx.lineTo(-4.2, 7.2);
      ctx.closePath();
      ctx.fill();

      // Cream wrap band
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(-5, 0, 10, 3.5);

      // Fluffy white steamed milk foam topping
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, -4, 5.8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cocoa / cinnamon dusting spiral
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, -4, 2.5, 0.2, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -4, 1.2, Math.PI * 1.2, Math.PI * 2.5);
      ctx.stroke();
      return true;
    }

    case 'cola_zero': {
      drawShadow(ctx, 6.8, 2.6, 7.8, 0.25);

      // Matte pitch black aluminum body
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-5.5, -6, 11, 13.5, 2);
      ctx.fill();

      // Bold crimson "ZERO" banner
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-5.5, -0.5, 11, 4.5);

      // White ZERO lettering graphic block
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3.8, 0.8, 7.6, 1.8);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-2.2, 1.2, 4.4, 1.0);

      // Brushed silver rims
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(0, 7.2, 5.2, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(0, -6, 5.5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Recessed lid
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(0, -6, 4.4, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pull tab
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-1.2, -7, 2.4, 2);

      // Sleek gloss reflection
      drawGlossBand(ctx, -3.8, -6, 1.4, 13.5, 0.25);
      return true;
    }

    case 'milkshake': {
      drawShadow(ctx, 6.5, 2.5, 7.8, 0.22);

      // Clear sundae cup with pink strawberry shake
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.moveTo(-5, -2);
      ctx.lineTo(5, -2);
      ctx.lineTo(3.6, 7.2);
      ctx.lineTo(-3.6, 7.2);
      ctx.closePath();
      ctx.fill();

      // Swirled whipped cream dome
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-2, -3.5, 2.8, 0, Math.PI * 2);
      ctx.arc(2, -3.5, 2.8, 0, Math.PI * 2);
      ctx.arc(0, -5.5, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Glossy ruby red maraschino cherry with stem
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.arc(0, -7.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -7.5);
      ctx.quadraticCurveTo(2, -10, 1.5, -11.5);
      ctx.stroke();

      // Diagonal pink-and-white spiral straw
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(2, -4);
      ctx.lineTo(4.5, -10.5);
      ctx.stroke();

      // Glass specular reflection
      drawGlossBand(ctx, -3.6, -2, 1.2, 9, 0.35);
      return true;
    }

    case 'tea_green':
    case 'tea_cup':
    case 'tea':
    case 'glass_mug': {
      drawShadow(ctx, 6.8, 2.6, 7.8, 0.22);

      // Glass teacup / mug
      ctx.fillStyle = 'rgba(241, 245, 249, 0.5)';
      ctx.beginPath();
      ctx.roundRect(-5.5, -4, 11, 11.2, [1, 1, 3.5, 3.5]);
      ctx.fill();

      // Mug handle
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.8)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(5.8, 1, 3.2, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();

      // Jade green brewed tea liquid
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.roundRect(-4.8, -2.5, 9.6, 9.2, [0, 0, 2.8, 2.8]);
      ctx.fill();

      // Floating mint / tea leaf
      ctx.fillStyle = '#047857';
      ctx.beginPath();
      ctx.ellipse(0, -1, 2.4, 1.2, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Teabag string & tag draped over side
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-4, -5, -6.5, -1);
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-7.5, -1, 2, 2.5);
      return true;
    }

    // Filled Steel Army Flask (Походная стальная фляга)
    case 'camp_flask': {
      drawShadow(ctx, 7.5, 2.8, 7.8, 0.25);

      // Stainless steel kidney-shaped flask body
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(-6.5, -4.5, 13, 12, 2.5);
      ctx.fill();

      // Brushed steel vertical gradient sheen
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-4.5, -4.5, 3, 12);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(3.5, -4.5, 3, 12);

      // Subtle embossed diamond crest
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, -1.5);
      ctx.lineTo(2.5, 1.5);
      ctx.lineTo(0, 4.5);
      ctx.lineTo(-2.5, 1.5);
      ctx.closePath();
      ctx.stroke();

      // Screw neck & knurled captive cap
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-1.5, -6.5, 3, 2);

      // Knurled metal cap
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.roundRect(-2.4, -8.5, 4.8, 2.5, 0.8);
      ctx.fill();

      // Captive hinge strap
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-2, -6);
      ctx.lineTo(-3.2, -7.5);
      ctx.lineTo(-2.4, -8);
      ctx.stroke();
      return true;
    }

    // Empty Army Flask with Unscrewed Dangling Cap (Пустая фляга)
    case 'camp_flask_empty': {
      drawShadow(ctx, 7.2, 2.6, 7.5, 0.2);

      // Scuffed steel flask body
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.roundRect(-6.5, -4.5, 13, 12, 2.5);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-4.5, -4.5, 2.5, 12);

      // Open threaded spout (hollow inside)
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-1.5, -6.5, 3, 2);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, -6.5, 1.2, 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cap unscrewed and hanging to the side
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-1.5, -5.5);
      ctx.quadraticCurveTo(-4, -6, -4.5, -3);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(-6, -3, 3, 4, 0.6);
      ctx.fill();
      return true;
    }

    // Heavy Vacuum Thermos with Cup Lid (Походный термос 1.0L)
    case 'thermos': {
      drawShadow(ctx, 7.8, 2.8, 8.5, 0.26);

      // Tall cylindrical brushed stainless steel thermos body
      const stGrad = ctx.createLinearGradient(-5, -6, 5, 8);
      stGrad.addColorStop(0, '#94a3b8');
      stGrad.addColorStop(0.3, '#f1f5f9');
      stGrad.addColorStop(0.7, '#cbd5e1');
      stGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = stGrad;
      ctx.beginPath();
      ctx.roundRect(-5.2, -6, 10.4, 14, 2);
      ctx.fill();

      // Black rubber textured anti-slip grip rings
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-5.3, -3.5, 10.6, 1.8);
      ctx.fillRect(-5.3, 3.5, 10.6, 1.8);

      // Ribbed silicone grip texture
      ctx.fillStyle = '#334155';
      for (let x = -4.5; x <= 4.5; x += 1.5) {
        ctx.fillRect(x, -3.3, 0.7, 1.4);
        ctx.fillRect(x, 3.7, 0.7, 1.4);
      }

      // Detachable insulated chrome/black drinking cup cap on top
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-4.8, -11, 9.6, 5.2, 1.2);
      ctx.fill();

      // Chrome rim on cup cap
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-4.8, -6.5, 9.6, 1);
      ctx.fillRect(-4.5, -11.5, 9.0, 0.8);

      // Red one-touch push-button valve indicator peeking
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(0, -6, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Nylon shoulder strap attachment loop
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-5.2, -2);
      ctx.lineTo(-7, 0);
      ctx.lineTo(-5.2, 2);
      ctx.stroke();

      drawGlossBand(ctx, -3.8, -6, 1.4, 13.5, 0.4);
      return true;
    }

    // === PREMIUM GLASS BOTTLES (Стеклянные бутылки) ===
    case 'bottle_glass_medium':
    case 'glass_bottle_500': {
      drawShadow(ctx, 6.2, 2.4, 7.8, 0.22);

      // Translucent soda-lime glass body with slight greenish-cyan tint
      const glassGrad = ctx.createLinearGradient(-4.5, -6, 4.5, 7.5);
      glassGrad.addColorStop(0, 'rgba(207, 250, 254, 0.75)');
      glassGrad.addColorStop(0.3, 'rgba(165, 243, 252, 0.5)');
      glassGrad.addColorStop(0.7, 'rgba(103, 232, 249, 0.6)');
      glassGrad.addColorStop(1, 'rgba(6, 182, 212, 0.7)');

      ctx.fillStyle = glassGrad;
      ctx.beginPath();
      // Bottom base
      ctx.moveTo(-4.2, 6.8);
      ctx.lineTo(-4.5, -0.5);
      // Shoulder taper
      ctx.quadraticCurveTo(-4.5, -3.5, -1.8, -5.5);
      // Neck
      ctx.lineTo(-1.8, -8);
      ctx.lineTo(1.8, -8);
      ctx.lineTo(1.8, -5.5);
      ctx.quadraticCurveTo(4.5, -3.5, 4.5, -0.5);
      ctx.lineTo(4.2, 6.8);
      ctx.quadraticCurveTo(0, 7.6, -4.2, 6.8);
      ctx.closePath();
      ctx.fill();

      // Thick glass punt / heavy bottom
      ctx.fillStyle = 'rgba(6, 182, 212, 0.55)';
      ctx.beginPath();
      ctx.ellipse(0, 6.2, 3.8, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Embossed glass ring details
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-4, 0); ctx.lineTo(4, 0);
      ctx.moveTo(-4, 4.5); ctx.lineTo(4, 4.5);
      ctx.stroke();

      // Embossed volume text "0.5 L"
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = 'bold 2.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('0.5 L', 0, 2.2);

      // Crisp vertical specular reflection streak
      drawGlossBand(ctx, -3.2, -4.5, 1.2, 10.5, 0.45);
      drawGlossBand(ctx, 2.2, -4, 0.7, 9.5, 0.3);

      // Crown cap / metal screw closure
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(-2.2, -9.2, 4.4, 2.2, 0.6);
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-2.2, -7.5, 4.4, 0.6);
      return true;
    }

    case 'bottle_glass_large': {
      drawShadow(ctx, 7.0, 2.6, 7.8, 0.25);

      // Sturdy 1.0L tall glass bottle body
      const glassGrad = ctx.createLinearGradient(-5.2, -8, 5.2, 7.5);
      glassGrad.addColorStop(0, 'rgba(224, 242, 254, 0.8)');
      glassGrad.addColorStop(0.3, 'rgba(186, 230, 253, 0.55)');
      glassGrad.addColorStop(0.7, 'rgba(125, 211, 252, 0.65)');
      glassGrad.addColorStop(1, 'rgba(56, 189, 248, 0.75)');

      ctx.fillStyle = glassGrad;
      ctx.beginPath();
      ctx.moveTo(-5, 6.8);
      ctx.lineTo(-5.2, -1);
      // Broad sturdy shoulder
      ctx.quadraticCurveTo(-5.2, -4.5, -2, -6.5);
      // Neck
      ctx.lineTo(-2, -9);
      ctx.lineTo(2, -9);
      ctx.lineTo(2, -6.5);
      ctx.quadraticCurveTo(5.2, -4.5, 5.2, -1);
      ctx.lineTo(5, 6.8);
      ctx.quadraticCurveTo(0, 7.8, -5, 6.8);
      ctx.closePath();
      ctx.fill();

      // Heavy reinforced bottom glass layer
      ctx.fillStyle = 'rgba(14, 165, 233, 0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 6.2, 4.5, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Embossed "1.0 L" glass mark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.font = 'bold 3.2px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('1.0 L', 0, 2.5);

      // Glass wall refraction & highlights
      drawGlossBand(ctx, -3.8, -5, 1.4, 11, 0.5);
      drawGlossBand(ctx, 2.8, -4.5, 0.8, 10, 0.35);

      // Knurled metal closure with seal ring
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-2.4, -10.2, 4.8, 2.4, 0.7);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-2.4, -8.3, 4.8, 0.6);
      return true;
    }

    case 'can_beer':
    case 'beer_can': {
      drawShadow(ctx, 6.8, 2.6, 7.8, 0.25);

      // Authentic 0.5L Aluminum Beer Can (Lager / Pilsner)
      // Metallic deep forest green and gold can cylinder
      const canGrad = ctx.createLinearGradient(-5.5, -6, 5.5, 7.5);
      canGrad.addColorStop(0, '#15803d');
      canGrad.addColorStop(0.4, '#166534');
      canGrad.addColorStop(0.8, '#14532d');
      canGrad.addColorStop(1, '#052e16');
      ctx.fillStyle = canGrad;
      ctx.beginPath();
      ctx.roundRect(-5.5, -6, 11, 13.5, 2);
      ctx.fill();

      // Brushed silver rims at top and bottom
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(0, 7.2, 5.2, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, -6, 5.2, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Recessed lid and pull-tab
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(0, -6, 4.2, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-1.0, -7.0, 2.0, 1.8);

      // Gold central shield with hop cone and barley ears
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.roundRect(-4.5, -1.0, 9.0, 6.2, 1.0);
      ctx.fill();

      // Gold border
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-4.3, -0.8, 8.6, 5.8);

      // Gold hop emblem
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(0, 1.2, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(0, 1.2, 0.7, 0, Math.PI * 2);
      ctx.fill();

      // "LAGER 0.5L" banner
      ctx.fillStyle = '#166534';
      ctx.font = 'bold 1.8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LAGER', 0, 4.0);

      // White frothy foam wave at shoulder
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.moveTo(-5.5, -3.5);
      ctx.quadraticCurveTo(-2, -5.0, 0, -3.8);
      ctx.quadraticCurveTo(2, -2.8, 5.5, -4.0);
      ctx.lineTo(5.5, -2.5);
      ctx.lineTo(-5.5, -2.5);
      ctx.closePath();
      ctx.fill();

      // Metallic specular reflection streak
      drawGlossBand(ctx, -3.6, -6, 1.4, 13.5, 0.35);
      return true;
    }

    case 'beer':
    case 'bottle_beer':
    case 'beer_bottle': {
      drawShadow(ctx, 6.2, 2.4, 7.8, 0.24);

      // Dark amber / brown beer bottle glass
      const amberGrad = ctx.createLinearGradient(-4.5, -6, 4.5, 7.5);
      amberGrad.addColorStop(0, '#92400e');
      amberGrad.addColorStop(0.4, '#b45309');
      amberGrad.addColorStop(0.8, '#78350f');
      amberGrad.addColorStop(1, '#451a03');

      ctx.fillStyle = amberGrad;
      ctx.beginPath();
      ctx.moveTo(-4.2, 6.8);
      ctx.lineTo(-4.4, 0);
      ctx.quadraticCurveTo(-4.4, -3.5, -1.8, -5.5);
      ctx.lineTo(-1.8, -8);
      ctx.lineTo(1.8, -8);
      ctx.lineTo(1.8, -5.5);
      ctx.quadraticCurveTo(4.4, -3.5, 4.4, 0);
      ctx.lineTo(4.2, 6.8);
      ctx.quadraticCurveTo(0, 7.6, -4.2, 6.8);
      ctx.closePath();
      ctx.fill();

      // Craft brewery parchment label
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.roundRect(-4.0, 0.5, 8.0, 5.0, 0.5);
      ctx.fill();
      // Label golden hop badge
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(0, 3.0, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(0, 3.0, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Neck gold foil band
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-1.8, -5.8, 3.6, 1.4);

      // Amber glass specular reflection
      drawGlossBand(ctx, -3.2, -4, 1.2, 10, 0.35);

      // Crimped golden crown cap
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.roundRect(-2.2, -9.2, 4.4, 2.0, 0.5);
      ctx.fill();
      return true;
    }

    case 'vodka':
    case 'bottle_vodka':
    case 'vodka_bottle': {
      drawShadow(ctx, 6.2, 2.4, 7.8, 0.24);

      // Clear heavy-base flint glass cylinder
      const vodkaGrad = ctx.createLinearGradient(-4.5, -6, 4.5, 7.5);
      vodkaGrad.addColorStop(0, 'rgba(241, 245, 249, 0.85)');
      vodkaGrad.addColorStop(0.3, 'rgba(226, 232, 240, 0.65)');
      vodkaGrad.addColorStop(0.7, 'rgba(203, 213, 225, 0.7)');
      vodkaGrad.addColorStop(1, 'rgba(148, 163, 184, 0.8)');

      ctx.fillStyle = vodkaGrad;
      ctx.beginPath();
      ctx.moveTo(-4.2, 6.8);
      ctx.lineTo(-4.4, -0.5);
      ctx.quadraticCurveTo(-4.4, -3.8, -1.9, -5.8);
      ctx.lineTo(-1.9, -8.2);
      ctx.lineTo(1.9, -8.2);
      ctx.lineTo(1.9, -5.8);
      ctx.quadraticCurveTo(4.4, -3.8, 4.4, -0.5);
      ctx.lineTo(4.2, 6.8);
      ctx.quadraticCurveTo(0, 7.6, -4.2, 6.8);
      ctx.closePath();
      ctx.fill();

      // Thick crystal glass bottom punt
      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.beginPath();
      ctx.ellipse(0, 5.8, 3.8, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Silver & frost blue premium label
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-4.0, 0.0, 8.0, 4.8, 0.5);
      ctx.fill();
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-3.5, 1.2, 7.0, 1.2);
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(0, 3.2, 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Specular crystal gleams
      drawGlossBand(ctx, -3.2, -4.5, 1.3, 10.5, 0.5);
      drawGlossBand(ctx, 2.2, -4, 0.7, 9.5, 0.35);

      // Brushed silver tall screw cap
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(-2.2, -9.8, 4.4, 2.6, 0.7);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-2.2, -7.8, 4.4, 0.6);
      return true;
    }

    case 'wine_bottle':
    case 'bottle_wine': {
      drawShadow(ctx, 6.2, 2.4, 7.8, 0.24);

      // Authentic 0.75L Bordeaux Wine Bottle in Dark Olive-Emerald Glass
      const wineGlassGrad = ctx.createLinearGradient(-4.5, -6, 4.5, 7.5);
      wineGlassGrad.addColorStop(0, '#064e3b');
      wineGlassGrad.addColorStop(0.4, '#047857');
      wineGlassGrad.addColorStop(0.8, '#064e3b');
      wineGlassGrad.addColorStop(1, '#022c22');
      ctx.fillStyle = wineGlassGrad;
      ctx.beginPath();
      ctx.moveTo(-4.2, 6.8);
      ctx.lineTo(-4.4, -0.2);
      ctx.quadraticCurveTo(-4.4, -3.5, -1.8, -5.5);
      ctx.lineTo(-1.8, -8.5);
      ctx.lineTo(1.8, -8.5);
      ctx.lineTo(1.8, -5.5);
      ctx.quadraticCurveTo(4.4, -3.5, 4.4, -0.2);
      ctx.lineTo(4.2, 6.8);
      ctx.quadraticCurveTo(0, 7.6, -4.2, 6.8);
      ctx.closePath();
      ctx.fill();

      // Deep Ruby Red Wine Level inside bottle
      ctx.fillStyle = '#4c0519';
      ctx.beginPath();
      ctx.roundRect(-3.8, -1.0, 7.6, 7.5, 1);
      ctx.fill();

      // Cream Parchment Chateaux Label
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.roundRect(-3.8, 0.2, 7.6, 5.4, 0.6);
      ctx.fill();

      // Crimson & Gold Coat of Arms Crest
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(-3.5, 0.5, 7.0, 4.8);
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.arc(0, 2.0, 1.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-2.5, 3.6, 5.0, 0.7);

      // Glass specular reflection
      drawGlossBand(ctx, -3.2, -4, 1.2, 10, 0.35);

      // Crimson shrink capsule / wax seal on neck & cork
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.roundRect(-2.2, -10.2, 4.4, 3.2, 0.6);
      ctx.fill();
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(-2.2, -7.5, 4.4, 0.6);
      return true;
    }

    // === CULINARY OILS ===
    case 'oil_sunflower':
    case 'oil_sunflower_bottle': {
      drawShadow(ctx, 6, 2.5, 7.8, 0.22);

      // Clear PET bottle with golden-yellow sunflower oil
      ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
      ctx.beginPath();
      ctx.roundRect(-4.5, -4, 9, 11.5, 2);
      ctx.fill();

      // Golden oil liquid inside
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.roundRect(-4, -2.5, 8, 9.5, 1.5);
      ctx.fill();

      // Glossy sheen band
      drawGlossBand(ctx, -3.5, -3.5, 1.2, 10, 0.4);

      // Sunflower floral label
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3.8, 0, 7.6, 4.5);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, 2.2, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, 2.2, 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Slender neck and bright red pourer cap
      ctx.fillStyle = 'rgba(254, 240, 138, 0.9)';
      ctx.fillRect(-2, -6.5, 4, 3);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-2.4, -8.5, 4.8, 2.5, 0.8);
      ctx.fill();
      return true;
    }

    case 'oil_olive':
    case 'oil_olive_extra_virgin': {
      drawShadow(ctx, 6, 2.5, 7.8, 0.24);

      // Dark square antique green Marasca glass bottle
      const oliveGrad = ctx.createLinearGradient(-4.5, -4, 4.5, 7);
      oliveGrad.addColorStop(0, '#14532d');
      oliveGrad.addColorStop(0.5, '#166534');
      oliveGrad.addColorStop(1, '#052e16');
      ctx.fillStyle = oliveGrad;
      ctx.beginPath();
      ctx.roundRect(-4.5, -4.5, 9, 12, 1.5);
      ctx.fill();

      // Golden green olive oil liquid shimmer peek
      ctx.fillStyle = '#84cc16';
      ctx.fillRect(-3.5, -1, 7, 7);

      // Premium parchment label with olive branch emblem
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.roundRect(-3.6, 0.5, 7.2, 5, 0.5);
      ctx.fill();

      // Olive branch
      ctx.strokeStyle = '#3f6212';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-2, 3); ctx.lineTo(2, 3);
      ctx.stroke();
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.ellipse(-0.8, 3, 0.8, 0.5, 0.3, 0, Math.PI * 2);
      ctx.ellipse(0.8, 3, 0.8, 0.5, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Glass specular reflection
      drawGlossBand(ctx, -3.8, -4, 1, 11, 0.35);

      // Slender neck and dark bronze screw cap
      ctx.fillStyle = '#14532d';
      ctx.fillRect(-1.8, -6.8, 3.6, 2.8);
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(-2.2, -8.8, 4.4, 2.4, 0.6);
      ctx.fill();
      return true;
    }

    case 'oil_linseed':
    case 'oil_linseed_bottle': {
      drawShadow(ctx, 5.8, 2.4, 7.8, 0.22);

      // Amber medicinal glass bottle
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(-4, -4, 8, 11.5, 1.8);
      ctx.fill();

      // Rich amber oil level
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-3.2, -2, 6.4, 8.5);

      // Blue flax flower label
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3.2, 0.5, 6.4, 4.5);
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(0, 2.7, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 2.7, 0.4, 0, Math.PI * 2);
      ctx.fill();

      drawGlossBand(ctx, -3.2, -3.5, 0.9, 10, 0.35);

      // Neck & black cap
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-1.6, -6.5, 3.2, 2.8);
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-2, -8.5, 4, 2.4, 0.6);
      ctx.fill();
      return true;
    }

    case 'oil_sesame':
    case 'oil_sesame_bottle': {
      drawShadow(ctx, 5.5, 2.2, 7.8, 0.22);

      // Compact dark amber bottle for toasted sesame oil
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.roundRect(-3.8, -3.5, 7.6, 11, 1.6);
      ctx.fill();

      // Deep dark toasted oil
      ctx.fillStyle = '#713f12';
      ctx.fillRect(-3, -1.5, 6, 8);

      // Japanese / Asian style calligraphy banner label
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(-3, 0.8, 6, 4.2);
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(-2.4, 1.4, 1.8, 3);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(0.2, 2.2, 2, 1.2);

      drawGlossBand(ctx, -3, -3, 0.8, 9.5, 0.35);

      // Black fluted neck cap
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-1.5, -5.8, 3, 2.5);
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-1.9, -7.8, 3.8, 2.2, 0.5);
      ctx.fill();
      return true;
    }

    // === VINEGARS ===
    case 'vinegar_table':
    case 'vinegar_table_bottle': {
      drawShadow(ctx, 6, 2.4, 7.8, 0.2);

      // Clear glass bottle with fluted neck and crystal water-clear 9% vinegar
      ctx.fillStyle = 'rgba(226, 232, 240, 0.7)';
      ctx.beginPath();
      ctx.roundRect(-4.2, -4, 8.4, 11.5, 1.8);
      ctx.fill();

      // Water-clear liquid reflection
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(-3.4, -2, 6.8, 8.5);

      // White label with red 9% bold text bar
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3.6, 0.2, 7.2, 4.5);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-3.2, 1.2, 6.4, 1.4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1, 1.4, 2, 1);

      drawGlossBand(ctx, -3.2, -3.5, 1, 10, 0.45);

      // Slender neck and white plastic dispenser cap
      ctx.fillStyle = 'rgba(226, 232, 240, 0.8)';
      ctx.fillRect(-1.8, -6.5, 3.6, 2.8);
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-2.2, -8.5, 4.4, 2.4, 0.6);
      ctx.fill();
      return true;
    }

    case 'vinegar_apple':
    case 'vinegar_apple_cider': {
      drawShadow(ctx, 6.2, 2.5, 7.8, 0.22);

      // Rounded retro bottle with golden-amber apple cider vinegar
      ctx.fillStyle = 'rgba(245, 158, 11, 0.75)';
      ctx.beginPath();
      ctx.roundRect(-4.5, -4, 9, 11.5, 2.2);
      ctx.fill();

      // Warm amber hazy liquid
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(-3.8, -2, 7.6, 8.5, 1.5);
      ctx.fill();

      // Craft label with red apple emblem
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(-3.8, 0.5, 7.6, 4.5);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(0, 2.7, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#15803d';
      ctx.fillRect(-0.2, 1.2, 0.8, 0.8);

      drawGlossBand(ctx, -3.6, -3.5, 1.1, 10, 0.4);

      // Slender neck & green screw cap
      ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
      ctx.fillRect(-1.8, -6.5, 3.6, 2.8);
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.roundRect(-2.2, -8.5, 4.4, 2.4, 0.6);
      ctx.fill();
      return true;
    }

    case 'vinegar_balsamic':
    case 'vinegar_balsamic_premium': {
      drawShadow(ctx, 6.2, 2.6, 7.8, 0.25);

      // Squat antique dark bottle of Modena balsamic vinegar
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-5, -3, 10, 10.5, 2.5);
      ctx.fill();

      // Deep dark syrupy purple-black vinegar
      ctx.fillStyle = '#3b0764';
      ctx.fillRect(-4.2, -1, 8.4, 7.5);

      // Rich vintage gold-bordered crest label
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.roundRect(-4, 0.5, 8, 4.5, 0.8);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(-3.8, 0.7, 7.6, 4.1);

      // Gold coat of arms seal
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(0, 2.7, 1.2, 0, Math.PI * 2);
      ctx.fill();

      drawGlossBand(ctx, -4.2, -2.5, 1.1, 9, 0.35);

      // Gold foil wrapped neck and cork finish
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-2, -5.5, 4, 2.8);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.roundRect(-2.4, -7.8, 4.8, 2.6, 0.7);
      ctx.fill();
      return true;
    }

    // === SAUCES ===
    case 'sauce_soy':
    case 'soy_sauce_classic': {
      drawShadow(ctx, 6.5, 2.6, 7.8, 0.24);

      // Iconic hourglass dispenser bottle with wide stable base
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.moveTo(-4.5, 7);
      ctx.lineTo(-4, 2);
      ctx.lineTo(-2.8, -2.5);
      ctx.lineTo(-2.8, -4.5);
      ctx.lineTo(2.8, -4.5);
      ctx.lineTo(2.8, -2.5);
      ctx.lineTo(4, 2);
      ctx.lineTo(4.5, 7);
      ctx.closePath();
      ctx.fill();

      // Dark umami soy sauce liquid
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.moveTo(-4, 6.5);
      ctx.lineTo(-3.6, 2.2);
      ctx.lineTo(-2.5, -1);
      ctx.lineTo(2.5, -1);
      ctx.lineTo(3.6, 2.2);
      ctx.lineTo(4, 6.5);
      ctx.closePath();
      ctx.fill();

      // Classic yellow hexagonal brand label
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(0, 1.5);
      ctx.lineTo(2.2, 2.5);
      ctx.lineTo(2.2, 4.5);
      ctx.lineTo(0, 5.5);
      ctx.lineTo(-2.2, 4.5);
      ctx.lineTo(-2.2, 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-1.2, 3.2, 2.4, 0.8);

      drawGlossBand(ctx, -3.2, -1, 1, 7.5, 0.35);

      // Iconic dual-spout bright red dispenser cap
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-3.5, -7, 7, 2.8, 0.8);
      ctx.fill();
      // Spout nozzles
      ctx.fillRect(-4.5, -6.2, 1.5, 1.2);
      ctx.fillRect(3, -6.2, 1.5, 1.2);
      return true;
    }

    case 'sauce_fish_premium': {
      drawShadow(ctx, 5.8, 2.4, 7.8, 0.22);

      // Slender glass bottle with clear amber-brown fermented fish sauce
      ctx.fillStyle = 'rgba(217, 119, 6, 0.8)';
      ctx.beginPath();
      ctx.roundRect(-4, -4, 8, 11.5, 1.8);
      ctx.fill();

      ctx.fillStyle = '#9a3412';
      ctx.fillRect(-3.2, -2, 6.4, 8.5);

      // Marine blue label with golden swimming fish
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(-3.4, 0.5, 6.8, 4.5);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.ellipse(0, 2.7, 1.8, 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Fish tail
      ctx.beginPath();
      ctx.moveTo(1.6, 2.7); ctx.lineTo(2.5, 1.8); ctx.lineTo(2.5, 3.6);
      ctx.closePath();
      ctx.fill();

      drawGlossBand(ctx, -3.2, -3.5, 1, 10, 0.4);

      // Yellow tamper cap
      ctx.fillStyle = 'rgba(217, 119, 6, 0.85)';
      ctx.fillRect(-1.6, -6.5, 3.2, 2.8);
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.roundRect(-2, -8.5, 4, 2.4, 0.6);
      ctx.fill();
      return true;
    }

    case 'sauce_worcestershire': {
      drawShadow(ctx, 5.8, 2.4, 7.8, 0.24);

      // Slender dark glass bottle wrapped in iconic orange/parchment label
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.roundRect(-4, -4.5, 8, 12, 1.8);
      ctx.fill();

      // Vintage orange paper wrap label
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(-3.6, -1.5, 7.2, 7.5);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(-3.2, -0.5, 6.4, 5.5);

      // Vintage cursive text lines
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(-2.5, 0.5, 5, 0.7);
      ctx.fillRect(-2, 1.8, 4, 0.6);
      ctx.fillRect(-2.5, 3, 5, 0.6);

      drawGlossBand(ctx, -3.2, -4, 0.9, 10.5, 0.3);

      // Slender dark neck with maroon seal cap
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(-1.6, -6.8, 3.2, 2.6);
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.roundRect(-2, -8.8, 4, 2.3, 0.6);
      ctx.fill();
      return true;
    }

    case 'sauce_teriyaki':
    case 'sauce_teriyaki_bottle': {
      drawShadow(ctx, 6, 2.4, 7.8, 0.24);

      // Dark glass bottle with thick rich teriyaki glaze
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-4.2, -4, 8.4, 11.5, 1.8);
      ctx.fill();

      // Deep brown-black glossy sauce peek
      ctx.fillStyle = '#292524';
      ctx.fillRect(-3.4, -2, 6.8, 8.5);

      // Sleek black and red label with gold kanji / grill marks
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-3.6, 0.2, 7.2, 4.5);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-3.2, 1, 6.4, 3);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, 2.5, 1.1, 0, Math.PI * 2);
      ctx.fill();

      drawGlossBand(ctx, -3.4, -3.5, 1, 10, 0.35);

      // Black fluted neck and cap
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-1.8, -6.5, 3.6, 2.8);
      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.roundRect(-2.2, -8.5, 4.4, 2.4, 0.6);
      ctx.fill();
      return true;
    }

    case 'sauce_narsharab':
    case 'sauce_pomegranate_narsharab': {
      drawShadow(ctx, 6.5, 2.6, 7.8, 0.25);

      // Flared teardrop / bell shaped bottle for Narsharab
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.moveTo(-4.8, 7);
      ctx.lineTo(-4.5, 3);
      ctx.quadraticCurveTo(-3.5, 0, -2.5, -3.5);
      ctx.lineTo(2.5, -3.5);
      ctx.quadraticCurveTo(3.5, 0, 4.5, 3);
      ctx.lineTo(4.8, 7);
      ctx.closePath();
      ctx.fill();

      // Thick ruby-garnet pomegranate molasses
      const narGrad = ctx.createLinearGradient(0, -2, 0, 7);
      narGrad.addColorStop(0, '#881337');
      narGrad.addColorStop(1, '#4c0519');
      ctx.fillStyle = narGrad;
      ctx.beginPath();
      ctx.moveTo(-4.2, 6.5);
      ctx.lineTo(-4, 3.2);
      ctx.quadraticCurveTo(-3, 0.5, -2, -2);
      ctx.lineTo(2, -2);
      ctx.quadraticCurveTo(3, 0.5, 4, 3.2);
      ctx.lineTo(4.2, 6.5);
      ctx.closePath();
      ctx.fill();

      // Ripe split pomegranate emblem label
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, 1.5, 6, 4.2);
      ctx.fillStyle = '#be123c';
      ctx.beginPath();
      ctx.arc(0, 3.5, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-0.4, 2, 0.8, 0.6); // crown

      drawGlossBand(ctx, -2.8, -2, 1, 8, 0.4);

      // Gold capped slender neck
      ctx.fillStyle = '#881337';
      ctx.fillRect(-1.8, -6, 3.6, 2.8);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.roundRect(-2.2, -8, 4.4, 2.3, 0.6);
      ctx.fill();
      return true;
    }

    // === COOKING WINES ===
    case 'wine_white_cooking': {
      drawShadow(ctx, 6, 2.5, 7.8, 0.22);

      // Classic slender Bordeaux wine bottle in translucent green glass
      ctx.fillStyle = 'rgba(74, 222, 128, 0.35)';
      ctx.beginPath();
      ctx.roundRect(-4.5, -3.5, 9, 11, 2);
      ctx.fill();

      // Pale straw-yellow white wine
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-3.8, -1.5, 7.6, 8.2);

      // Elegant cream wine estate label with green grape emblem
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(-3.6, 0.5, 7.2, 4.8);
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-3.4, 0.7, 6.8, 4.4);

      // Grape cluster
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.arc(-0.6, 2.5, 0.6, 0, Math.PI * 2);
      ctx.arc(0.6, 2.5, 0.6, 0, Math.PI * 2);
      ctx.arc(0, 3.4, 0.6, 0, Math.PI * 2);
      ctx.fill();

      drawGlossBand(ctx, -3.6, -3, 1.1, 9.8, 0.4);

      // Long bottle neck with green foil capsule
      ctx.fillStyle = 'rgba(74, 222, 128, 0.5)';
      ctx.fillRect(-1.8, -7, 3.6, 3.8);
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.roundRect(-2.1, -9.2, 4.2, 3.2, 0.6);
      ctx.fill();
      return true;
    }

    case 'wine_red_cooking': {
      drawShadow(ctx, 6, 2.5, 7.8, 0.25);

      // Classic dark glass Burgundy wine bottle with deep ruby red wine
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.roundRect(-4.5, -3.5, 9, 11, 2);
      ctx.fill();

      // Deep rich ruby wine liquid peek
      ctx.fillStyle = '#881337';
      ctx.fillRect(-3.8, -1.5, 7.6, 8.2);

      // Vintage parchment chateau label
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(-3.6, 0.5, 7.2, 4.8);
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-3.4, 0.7, 6.8, 4.4);

      // Red wine vineyard crest
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.arc(0, 2.8, 1.1, 0, Math.PI * 2);
      ctx.fill();

      drawGlossBand(ctx, -3.6, -3, 1.1, 9.8, 0.35);

      // Crimson foil wrapped neck capsule
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(-1.8, -7, 3.6, 3.8);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-2.1, -9.2, 4.2, 3.2, 0.6);
      ctx.fill();
      return true;
    }

    // === FERMENTATION & DAIRY DRINKS ===
    case 'liquid_yeast_mixture': {
      drawShadow(ctx, 6.5, 2.6, 7.8, 0.22);

      // Glass cylindrical fermentation jar / flask
      ctx.fillStyle = 'rgba(241, 245, 249, 0.75)';
      ctx.beginPath();
      ctx.roundRect(-4.5, -3.5, 9, 11, 2);
      ctx.fill();

      // Frothy active bubbling yeast sourdough liquid
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.roundRect(-3.8, -1, 7.6, 8, 1);
      ctx.fill();

      // Frothy foam bubbles on top
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.arc(-2, -1, 1.1, 0, Math.PI * 2);
      ctx.arc(0, -1.4, 1.3, 0, Math.PI * 2);
      ctx.arc(2, -0.9, 1.1, 0, Math.PI * 2);
      ctx.fill();

      // Active fermentation bubble specks inside
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(-1.5, 2, 0.4, 0, Math.PI * 2);
      ctx.arc(1.2, 3.5, 0.5, 0, Math.PI * 2);
      ctx.arc(-0.8, 5, 0.4, 0, Math.PI * 2);
      ctx.arc(1.8, 1.2, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Measuring scale graduation ticks on glass
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-3.8, 1); ctx.lineTo(-2.2, 1);
      ctx.moveTo(-3.8, 3); ctx.lineTo(-2.5, 3);
      ctx.moveTo(-3.8, 5); ctx.lineTo(-2.2, 5);
      ctx.stroke();

      drawGlossBand(ctx, -3.5, -3, 1, 9.5, 0.4);

      // Wide mouth sealed with natural cork / cheesecloth
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(-2.8, -6, 5.6, 2.8, 0.8);
      ctx.fill();
      return true;
    }

    case 'milk_bottle_raw': {
      drawShadow(ctx, 6.2, 2.5, 7.8, 0.22);

      // Traditional glass milk bottle with creamy white whole farm milk
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.roundRect(-4.5, -4, 9, 11.5, 2);
      ctx.fill();

      // Rich whole milk body
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-3.8, -2, 7.6, 9, 1.5);
      ctx.fill();

      // Cream line separation near top
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-3.8, -2, 7.6, 1.2);

      // Blue farm crest label with cow emblem
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(-3.6, 0.5, 7.2, 4.2);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 2.6, 1.2, 0, Math.PI * 2);
      ctx.fill();

      drawGlossBand(ctx, -3.5, -3.5, 1.2, 10, 0.45);

      // Fluted glass bottle neck & blue foil crimped milk cap
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(-2, -6.5, 4, 2.8);
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(-2.6, -8.5, 5.2, 2.4, 0.8);
      ctx.fill();
      return true;
    }

    case 'carton_milk':
    case 'milk':
    case 'milk_pasteurized_carton': {
      drawShadow(ctx, 6.5, 2.8, 7.8, 0.24);

      // Classic gable-top Tetra cardboard milk carton (White & Sky Blue)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-4.5, -3.5, 9, 11, 1.2);
      ctx.fill();

      // Gable top pitched roof
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(-4.5, -3.5);
      ctx.lineTo(0, -7.5);
      ctx.lineTo(4.5, -3.5);
      ctx.closePath();
      ctx.fill();

      // Gable ridge fin
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-1.5, -8.2, 3, 1.2);

      // White plastic screw pour spout on gable side
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(1.8, -5, 1, 0, Math.PI * 2);
      ctx.fill();

      // Blue printed branding banner and cow pasture graphic
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-4.5, -1, 9, 4.5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, 0.2, 6, 1.2); // "MILK"
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(-4.5, 4.5, 9, 2.5); // green pasture wave
      return true;
    }

    case 'kefir_fermented_bottle': {
      drawShadow(ctx, 6.2, 2.5, 7.8, 0.22);

      // White HDPE plastic bottle with contoured ribs for fermented kefir
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-4.5, -4, 9, 11.5, 2);
      ctx.fill();

      // Probiotic green band wave
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(-4.5, 0, 9, 4.5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, 1.2, 6, 1.2);

      // Drop graphic
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(0, 3.2, 0.9, 0, Math.PI * 2);
      ctx.fill();

      drawGlossBand(ctx, -3.5, -3.5, 1.2, 10, 0.35);

      // Ribbed green screw cap
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-2, -6.5, 4, 2.8);
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.roundRect(-2.5, -8.5, 5, 2.4, 0.8);
      ctx.fill();
      return true;
    }

    case 'buttermilk_fermented_jar': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.24);

      // Traditional ceramic earthenware crock / jar with pale cultured buttermilk
      const crockGrad = ctx.createLinearGradient(-5, -4, 5, 6);
      crockGrad.addColorStop(0, '#fef3c7');
      crockGrad.addColorStop(0.5, '#fde68a');
      crockGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = crockGrad;
      ctx.beginPath();
      ctx.roundRect(-5, -3.5, 10, 11, 2.5);
      ctx.fill();

      // Glazed ceramic rim collar
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.roundRect(-5.5, -4.2, 11, 2, 0.8);
      ctx.fill();

      // Rustic tied cloth cover on top with twine string
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.roundRect(-4.5, -6.2, 9, 2.8, 1);
      ctx.fill();

      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-4.5, -4.2); ctx.lineTo(4.5, -4.2);
      ctx.stroke();

      // Rustic pottery glaze highlight
      drawGlossBand(ctx, -3.8, -2, 1.2, 8.5, 0.4);
      return true;
    }

    default:
      return false;
  }
}
