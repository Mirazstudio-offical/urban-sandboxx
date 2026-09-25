// Procedural 2D Canvas Models for Furniture & Interior Items
import { drawShadow } from './itemGraphicShared';

export function drawFurnitureItem(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  switch (itemId) {
    // 1. Ergonomic Office / Living Room Chair
    case 'furn_chair': {
      drawShadow(ctx, 8.5, 3.2, 8, 0.28);

      // 5-star wheeled base (steel castors)
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        ctx.moveTo(0, 3.5);
        ctx.lineTo(Math.cos(angle) * 7.5, 3.5 + Math.sin(angle) * 4.5);
      }
      ctx.stroke();

      // Small castor wheels
      ctx.fillStyle = '#0f172a';
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * 7.5, 3.5 + Math.sin(angle) * 4.5, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Central gas-lift chrome cylinder
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(0, 3.5, 2, 0, Math.PI * 2);
      ctx.fill();

      // Padded upholstered seat cushion (Charcoal fabric)
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(-6.5, -2, 13, 8.5, 2.5);
      ctx.fill();

      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.roundRect(-5.5, -1, 11, 6.5, 1.8);
      ctx.fill();

      // Ergonomic curved backrest with lumbar support
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-6, -9.5, 12, 6.5, 2.2);
      ctx.fill();

      // Breathable mesh back insert
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-4.8, -8.5, 9.6, 4.5, 1.4);
      ctx.fill();

      // Chrome armrests
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-7.5, -4.5, 1.2, 5.5);
      ctx.fillRect(6.3, -4.5, 1.2, 5.5);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-8, -4.5, 2.2, 1.5);
      ctx.fillRect(5.8, -4.5, 2.2, 1.5);
      return true;
    }

    // 2. Oak Wooden Dining / Desk Table
    case 'furn_table': {
      drawShadow(ctx, 10, 3.5, 8.5, 0.28);

      // Tapered dark steel angled legs
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-7.5, -6, 2, 12);
      ctx.fillRect(5.5, -6, 2, 12);
      ctx.fillRect(-6.5, 4, 1.8, 3.5);
      ctx.fillRect(4.7, 4, 1.8, 3.5);

      // Solid Oak Wood Plank Tabletop with beveled edge
      const oakGrad = ctx.createLinearGradient(-9, -6, 9, 6);
      oakGrad.addColorStop(0, '#b45309');
      oakGrad.addColorStop(0.5, '#d97706');
      oakGrad.addColorStop(1, '#92400e');
      ctx.fillStyle = oakGrad;
      ctx.beginPath();
      ctx.roundRect(-9, -6.5, 18, 13, 2);
      ctx.fill();

      // Top bevel highlight
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-8.5, -6, 17, 1);

      // Natural wood grain slats
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.45)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-9, -2); ctx.lineTo(9, -2);
      ctx.moveTo(-9, 2);  ctx.lineTo(9, 2);
      ctx.stroke();

      // Wood grain fine texture
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-6, -4.5); ctx.quadraticCurveTo(0, -4, 6, -4.8);
      ctx.moveTo(-7, 0); ctx.quadraticCurveTo(1, 0.5, 7, -0.2);
      ctx.moveTo(-5, 4); ctx.quadraticCurveTo(2, 3.5, 6, 4.2);
      ctx.stroke();
      return true;
    }

    // 3. Contemporary Plush Fabric Sofa
    case 'furn_sofa': {
      drawShadow(ctx, 10.5, 3.8, 8.5, 0.3);

      // Low wooden feet
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-8.5, 6, 2, 2);
      ctx.fillRect(6.5, 6, 2, 2);

      // Main sofa chassis (Deep Slate Blue)
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(-9.5, -6.5, 19, 13.5, 3);
      ctx.fill();

      // Thick padded backrest
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-8.5, -6, 17, 5, 2);
      ctx.fill();

      // Two plush seating cushions
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.roundRect(-8.5, 0, 8, 5.5, 1.5);
      ctx.roundRect(0.5, 0, 8, 5.5, 1.5);
      ctx.fill();

      // Cushion seam stitch lines
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.roundRect(-8.5, 0, 8, 5.5, 1.5);
      ctx.roundRect(0.5, 0, 8, 5.5, 1.5);
      ctx.stroke();

      // Padded rolled armrests
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.roundRect(-9.8, -3.5, 2.5, 9, 1.5);
      ctx.roundRect(7.3, -3.5, 2.5, 9, 1.5);
      ctx.fill();

      // Two accent throw pillows (Golden Ochre)
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(-7.5, -2, 3.2, 3.2, 0.8);
      ctx.roundRect(4.3, -2, 3.2, 3.2, 0.8);
      ctx.fill();
      return true;
    }

    // 4. Double Platform Bed with Mattress & Pillows
    case 'furn_bed': {
      drawShadow(ctx, 10.5, 3.8, 9, 0.3);

      // Wooden bed frame
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(-8.5, -8.5, 17, 17, 2);
      ctx.fill();

      // Upholstered headboard at top
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.roundRect(-8.5, -8.5, 17, 3.5, 1.5);
      ctx.fill();
      // Tufted buttons on headboard
      ctx.fillStyle = '#64748b';
      for (let x = -6; x <= 6; x += 3) {
        ctx.beginPath();
        ctx.arc(x, -6.8, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Crisp white mattress
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-7.5, -4.5, 15, 12, 1.5);
      ctx.fill();

      // Folded Scandinavian quilt duvet (Nordic Sea Blue)
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-7.5, 0, 15, 7.5, 1);
      ctx.fill();

      // Folded sheet duvet rim
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-7.5, -0.5, 15, 1.2);

      // Quilt geometric stitching
      ctx.strokeStyle = '#0369a1';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-7.5, 3.5); ctx.lineTo(7.5, 3.5);
      ctx.moveTo(-2.5, 0);   ctx.lineTo(-2.5, 7.5);
      ctx.moveTo(2.5, 0);    ctx.lineTo(2.5, 7.5);
      ctx.stroke();

      // Twin plush sleeping pillows
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.roundRect(-6.5, -4, 5.5, 3.2, 1);
      ctx.roundRect(1, -4, 5.5, 3.2, 1);
      ctx.fill();
      ctx.stroke();
      return true;
    }

    // 5. Stainless Steel No-Frost Refrigerator
    case 'furn_fridge': {
      drawShadow(ctx, 8.5, 3.2, 8.5, 0.32);

      // Brushed stainless steel body
      const steelGrad = ctx.createLinearGradient(-6.5, -9, 6.5, 9);
      steelGrad.addColorStop(0, '#94a3b8');
      steelGrad.addColorStop(0.3, '#cbd5e1');
      steelGrad.addColorStop(0.7, '#e2e8f0');
      steelGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = steelGrad;
      ctx.beginPath();
      ctx.roundRect(-6.5, -9, 13, 18, 2);
      ctx.fill();

      // Top Freezer Door
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-6, -8.5, 12, 6);

      // Bottom Main Fridge Door
      ctx.strokeRect(-6, -1.5, 12, 10);

      // Digital LED Touch Control Panel on Freezer Door
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-3, -7.2, 6, 2.8, 0.6);
      ctx.fill();
      // Cyan digital display readout: -18°C / +4°C
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-2.2, -6.5, 1.8, 0.7);
      ctx.fillRect(0.4, -6.5, 1.8, 0.7);

      // Recessed horizontal chrome handles
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-4.5, -3.2, 9, 1);
      ctx.fillRect(-4.5, -0.8, 9, 1);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-4.5, -3.2, 9, 0.4);
      ctx.fillRect(-4.5, -0.8, 9, 0.4);

      // Brand metallic logo emblem
      ctx.fillStyle = '#475569';
      ctx.fillRect(-1.5, -8.2, 3, 0.5);

      // High-end diagonal metallic sheen
      const sheenGrad = ctx.createLinearGradient(-6.5, -9, 6.5, 9);
      sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      sheenGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = sheenGrad;
      ctx.beginPath();
      ctx.roundRect(-6.5, -9, 13, 18, 2);
      ctx.fill();
      return true;
    }

    // 6. Ultra-Slim 4K OLED Smart TV
    case 'furn_tv': {
      drawShadow(ctx, 10, 3.2, 8.5, 0.3);

      // Metallic tabletop stand
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.roundRect(-4.5, 6.5, 9, 1.5, 0.8);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.fillRect(-1, 4.5, 2, 2.5);

      // Ultra-thin aluminum bezel frame (Titanium black)
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.roundRect(-9.5, -7.5, 19, 12.5, 1.2);
      ctx.fill();

      // OLED Deep Black Glass Display
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.roundRect(-9, -7, 18, 11.5, 0.8);
      ctx.fill();

      // Specular glass reflection angle
      const glassGrad = ctx.createLinearGradient(-9, -7, 9, 4.5);
      glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
      glassGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.08)');
      glassGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = glassGrad;
      ctx.beginPath();
      ctx.moveTo(-9, -7);
      ctx.lineTo(3, -7);
      ctx.lineTo(-9, 3);
      ctx.closePath();
      ctx.fill();

      // Tiny standby power LED (Red dot at bottom edge)
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 4.8, 0.5, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // 7. Scandinavian Oak Bookcase / Shelving Unit
    case 'furn_shelf': {
      drawShadow(ctx, 9, 3.5, 8.5, 0.3);

      // Wooden Frame
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(-7.5, -9, 15, 18, 1.5);
      ctx.fill();

      // Recessed back panel (warm light beige oak)
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.roundRect(-6.5, -8, 13, 16, 1);
      ctx.fill();

      // 3 horizontal wooden shelves
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-6.5, -3, 13, 1.5);
      ctx.fillRect(-6.5, 2.5, 13, 1.5);

      // Shelf 1 (Top): Row of colorful hardback books
      const bookColors = ['#dc2626', '#0284c7', '#16a34a', '#eab308', '#8b5cf6'];
      let bx = -5.5;
      bookColors.forEach(c => {
        ctx.fillStyle = c;
        ctx.fillRect(bx, -7.5, 1.8, 4.2);
        // Book spine gold title bar
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(bx + 0.3, -6.5, 1.2, 0.6);
        bx += 2.2;
      });

      // Shelf 2 (Middle): Decorative vase + leaning books
      // Leaning book
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(-5.5, -2.5, 2, 4.5);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(-3, -2.5, 2, 4.5);
      // Ceramic decorative vase
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(3.5, 0.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(2.8, -1.8, 1.4, 1);

      // Shelf 3 (Bottom): Thick encyclopedias and storage box
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-5.5, 3.5, 2.2, 4);
      ctx.fillStyle = '#475569';
      ctx.fillRect(-3, 3.5, 2.2, 4);
      // Storage bin
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(0.5, 4.5, 5, 3, 0.8);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(2.2, 5.5, 1.6, 0.6);
      return true;
    }

    // 8. Lush Potted Houseplant (Ficus / Monstera in Ceramic Pot)
    case 'furn_plant': {
      drawShadow(ctx, 8.5, 3.2, 8, 0.25);

      // Terracotta ceramic pot saucer base
      ctx.fillStyle = '#9a3412';
      ctx.beginPath();
      ctx.roundRect(-4.5, 6, 9, 1.8, 0.8);
      ctx.fill();

      // Terracotta ceramic pot with beveled rim
      const potGrad = ctx.createLinearGradient(-4, 0, 4, 6);
      potGrad.addColorStop(0, '#ea580c');
      potGrad.addColorStop(1, '#c2410c');
      ctx.fillStyle = potGrad;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(4, 0);
      ctx.lineTo(3.2, 6);
      ctx.lineTo(-3.2, 6);
      ctx.closePath();
      ctx.fill();

      // Top pot rim collar
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.roundRect(-4.5, -0.5, 9, 1.8, 0.6);
      ctx.fill();

      // Rich fertile potting soil
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, 0.2, 3.8, 1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tropical Monstera / Ficus glossy green leaves radiating upwards
      // Central leaf
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(0, -5, 2.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(-0.5, -5.2, 1.2, 3.8, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Left leaf
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.ellipse(-4.2, -3.5, 2.2, 3.8, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.ellipse(-4.5, -3.8, 1, 3, -0.6, 0, Math.PI * 2);
      ctx.fill();

      // Right leaf
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.ellipse(4.2, -3.5, 2.2, 3.8, 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.ellipse(4.5, -3.8, 1, 3, 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Two lower accent leaves
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(-3, -1, 1.8, 2.8, -1.1, 0, Math.PI * 2);
      ctx.ellipse(3, -1, 1.8, 2.8, 1.1, 0, Math.PI * 2);
      ctx.fill();

      // Fine leaf veins
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, -8);
      ctx.moveTo(0, -1); ctx.lineTo(-4.5, -5.5);
      ctx.moveTo(0, -1); ctx.lineTo(4.5, -5.5);
      ctx.stroke();
      return true;
    }

    default:
      return false;
  }
}
