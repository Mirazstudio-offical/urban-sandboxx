// Procedural 2D Canvas Models for Drink Items
import { drawShadow, drawGlossBand } from './itemGraphicShared';

export function drawDrinkItem(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  switch (itemId) {
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

    case 'soda_can': {
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

    case 'hot_coffee': {
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

    case 'fresh_juice': {
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

    case 'tea_green': {
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

    default:
      return false;
  }
}
