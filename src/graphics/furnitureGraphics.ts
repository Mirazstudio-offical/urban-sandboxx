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

    // 9. Modern Wardrobe / Clothes Closet
    case 'furn_wardrobe': {
      drawShadow(ctx, 9.5, 3.5, 8.5, 0.28);

      // Main tall cabinet body (Warm Scandinavian Oak)
      const woodGrad = ctx.createLinearGradient(-8.5, -9, 8.5, 8);
      woodGrad.addColorStop(0, '#92400e');
      woodGrad.addColorStop(0.5, '#b45309');
      woodGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = woodGrad;
      ctx.beginPath();
      ctx.roundRect(-8.5, -9.5, 17, 18, 1.8);
      ctx.fill();

      // Top crown molding trim
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-8.8, -9.8, 17.6, 1.5);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-8.8, -9.8, 17.6, 0.5);

      // Base plinth
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-8.5, 6.8, 17, 1.7);

      // Twin wardrobe doors with dark shadow seam
      ctx.fillStyle = '#a16207';
      ctx.beginPath();
      ctx.roundRect(-7.8, -7.8, 7.4, 14, 1);
      ctx.roundRect(0.4, -7.8, 7.4, 14, 1);
      ctx.fill();

      // Door panel bevel frames
      ctx.strokeStyle = 'rgba(69, 26, 3, 0.5)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-7.8, -7.8, 7.4, 14);
      ctx.strokeRect(0.4, -7.8, 7.4, 14);

      // Subtle vertical wood grain lines
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.15)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-4.5, -7); ctx.lineTo(-4.5, 5);
      ctx.moveTo(4.2, -7); ctx.lineTo(4.2, 5);
      ctx.stroke();

      // Long minimalist brushed steel vertical handles
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(-1.8, -2, 0.9, 5, 0.4);
      ctx.roundRect(0.9, -2, 0.9, 5, 0.4);
      ctx.fill();

      ctx.fillStyle = '#475569';
      ctx.fillRect(-1.8, -0.2, 0.9, 1.2);
      ctx.fillRect(0.9, -0.2, 0.9, 1.2);
      return true;
    }

    // 10. Bedside Nightstand
    case 'furn_nightstand': {
      drawShadow(ctx, 7, 2.8, 8, 0.26);

      // Four small tapered feet
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-5.5, 6, 1.8, 2);
      ctx.fillRect(3.7, 6, 1.8, 2);

      // Cabinet main body (Rich Walnut)
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(-6.5, -5.5, 13, 12, 1.5);
      ctx.fill();

      // Top bevel tabletop
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.roundRect(-7, -6.5, 14, 2.2, 1);
      ctx.fill();
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-6.8, -6.5, 13.6, 0.6);

      // Upper drawer front
      ctx.fillStyle = '#a16207';
      ctx.beginPath();
      ctx.roundRect(-5.5, -3.8, 11, 4.2, 0.8);
      ctx.fill();

      // Lower drawer front
      ctx.beginPath();
      ctx.roundRect(-5.5, 1.2, 11, 4.2, 0.8);
      ctx.fill();

      // Drawer shadow seams
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 0.7;
      ctx.strokeRect(-5.5, -3.8, 11, 4.2);
      ctx.strokeRect(-5.5, 1.2, 11, 4.2);

      // Brushed brass circular knobs
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, -1.7, 0.9, 0, Math.PI * 2);
      ctx.arc(0, 3.3, 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0.2, -1.5, 0.3, 0, Math.PI * 2);
      ctx.arc(0.2, 3.5, 0.3, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // 11. Kitchen Countertop with Sink & Mixer
    case 'furn_kitchen_counter': {
      drawShadow(ctx, 10, 3.5, 8.5, 0.3);

      // Lower cabinet base (Matte Slate Grey)
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(-8.5, -3, 17, 11.5, 1.2);
      ctx.fill();

      // Base kick-plate plinth
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-8.2, 6.8, 16.4, 1.7);

      // Cabinet twin front doors
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.roundRect(-8, -2.5, 7.5, 8.5, 0.8);
      ctx.roundRect(0.5, -2.5, 7.5, 8.5, 0.8);
      ctx.fill();

      // Horizontal brushed stainless steel bar handles
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(-6.5, -1, 4.5, 0.8, 0.3);
      ctx.roundRect(2, -1, 4.5, 0.8, 0.3);
      ctx.fill();

      // White Quartz / Granite composite countertop slab
      const counterGrad = ctx.createLinearGradient(-9, -5, 9, -2);
      counterGrad.addColorStop(0, '#f8fafc');
      counterGrad.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = counterGrad;
      ctx.beginPath();
      ctx.roundRect(-9, -5.5, 18, 3, 1);
      ctx.fill();

      // Polished front edge highlight
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-8.8, -5.5, 17.6, 0.7);

      // Stainless steel sink basin cutout (right side)
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.roundRect(1, -5.2, 6.8, 2.4, 0.6);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(1.4, -5, 6, 2, 0.4);
      ctx.fill();

      // Drain strainer in basin
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(4.4, -4, 0.6, 0, Math.PI * 2);
      ctx.fill();

      // High-arc gooseneck chrome mixer faucet
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(6.5, -5.2);
      ctx.lineTo(6.5, -8.5);
      ctx.arc(5.2, -8.5, 1.3, 0, Math.PI, true);
      ctx.lineTo(3.9, -7.5);
      ctx.stroke();

      // Faucet base & handle
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(6, -5.8, 1, 0.8);
      ctx.fillRect(5.5, -6.8, 2, 0.6);
      return true;
    }

    // 12. Modern Lowboard TV Cabinet
    case 'furn_tv_cabinet': {
      drawShadow(ctx, 10.5, 3.5, 8.5, 0.28);

      // Sleek black metal hairpin legs
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-7.5, 3); ctx.lineTo(-8.5, 7.5);
      ctx.moveTo(7.5, 3);  ctx.lineTo(8.5, 7.5);
      ctx.moveTo(-1, 3);   ctx.lineTo(-1, 7.5);
      ctx.moveTo(1, 3);    ctx.lineTo(1, 7.5);
      ctx.stroke();

      // Main console chassis (Ash Walnut)
      const ashGrad = ctx.createLinearGradient(-9.5, -3, 9.5, 4);
      ashGrad.addColorStop(0, '#78350f');
      ashGrad.addColorStop(0.5, '#92400e');
      ashGrad.addColorStop(1, '#451a03');
      ctx.fillStyle = ashGrad;
      ctx.beginPath();
      ctx.roundRect(-9.5, -3.5, 19, 7.5, 1.5);
      ctx.fill();

      // Top surface bevel
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-9.2, -3.5, 18.4, 0.7);

      // Left soft-close drop door
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.roundRect(-8.8, -2.2, 5.2, 5.2, 0.8);
      ctx.fill();

      // Right soft-close drop door
      ctx.beginPath();
      ctx.roundRect(3.6, -2.2, 5.2, 5.2, 0.8);
      ctx.fill();

      // Center open electronics / console bay (recessed dark compartment)
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-3, -2.2, 6, 5.2, 0.6);
      ctx.fill();

      // Glass shelf divider in open bay
      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.fillRect(-2.8, 0.4, 5.6, 0.6);

      // Sleek recessed finger-pull notches on doors
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-6.5, -1.8, 1.8, 0.6);
      ctx.fillRect(5, -1.8, 1.8, 0.6);
      return true;
    }

    // 13. Ornamental Area Carpet / Rug
    case 'furn_carpet': {
      drawShadow(ctx, 10, 4, 8, 0.25);

      // White cotton knotted fringe / tassels (Left & Right ends)
      ctx.fillStyle = '#f1f5f9';
      for (let y = -5; y <= 5; y += 1.2) {
        ctx.fillRect(-9.8, y, 1.2, 0.7);
        ctx.fillRect(8.6, y, 1.2, 0.7);
      }

      // Rich Crimson / Persian Ruby Woven Fabric Body
      const carpetGrad = ctx.createLinearGradient(-8.5, -6, 8.5, 6);
      carpetGrad.addColorStop(0, '#991b1b');
      carpetGrad.addColorStop(0.5, '#7f1d1d');
      carpetGrad.addColorStop(1, '#991b1b');
      ctx.fillStyle = carpetGrad;
      ctx.beginPath();
      ctx.roundRect(-8.6, -6, 17.2, 12, 1.2);
      ctx.fill();

      // Outer golden woven border
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 0.9;
      ctx.strokeRect(-7.8, -5.2, 15.6, 10.4);

      // Inner navy blue accent border
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 0.7;
      ctx.strokeRect(-6.8, -4.2, 13.6, 8.4);

      // Ornate central diamond medallion (Gold & Ivory)
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(0, -3.2);
      ctx.lineTo(4, 0);
      ctx.lineTo(0, 3.2);
      ctx.lineTo(-4, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(0, -2.2);
      ctx.lineTo(2.8, 0);
      ctx.lineTo(0, 2.2);
      ctx.lineTo(-2.8, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();

      // Corner floral motifs
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-5.8, -3.4, 1.2, 1.2);
      ctx.fillRect(4.6, -3.4, 1.2, 1.2);
      ctx.fillRect(-5.8, 2.2, 1.2, 1.2);
      ctx.fillRect(4.6, 2.2, 1.2, 1.2);
      return true;
    }

    // 14. Freestanding Enamel Bathtub
    case 'furn_bath': {
      drawShadow(ctx, 10, 3.8, 8.5, 0.28);

      // Four polished chrome clawfeet / pedestal supports
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-7.5, 6, 1.8, 2.2);
      ctx.fillRect(5.7, 6, 1.8, 2.2);

      // Outer tub silhouette (Glossy White Porcelain Enamel)
      const tubGrad = ctx.createLinearGradient(-9, -4, 9, 6);
      tubGrad.addColorStop(0, '#ffffff');
      tubGrad.addColorStop(0.7, '#f1f5f9');
      tubGrad.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = tubGrad;
      ctx.beginPath();
      ctx.roundRect(-9, -4.5, 18, 11, 4.5);
      ctx.fill();

      // Tub rolled rim collar
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-9, -4.5, 18, 11);

      // Inner concave water basin (Reflective soft aqua depth)
      const basinGrad = ctx.createLinearGradient(0, -3.5, 0, 3.5);
      basinGrad.addColorStop(0, '#e0f2fe');
      basinGrad.addColorStop(0.6, '#bae6fd');
      basinGrad.addColorStop(1, '#38bdf8');
      ctx.fillStyle = basinGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0.5, 7.5, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Chrome drain ring at the base
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(4.2, 0.8, 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(4.2, 0.8, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Overflow circle on side
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(-6.5, -0.5, 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Freestanding chrome mixer column with gooseneck spout
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8, -7.5);
      ctx.quadraticCurveTo(-8, -9, -6.5, -8.5);
      ctx.stroke();

      // Handheld shower wand attached
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-8.2, -6);
      ctx.lineTo(-9.5, -4.5);
      ctx.stroke();
      return true;
    }

    // 15. Ceramic Bathroom Sink / Vanity
    case 'furn_sink': {
      drawShadow(ctx, 7.5, 3, 8, 0.26);

      // Vanity pedestal base / bracket
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-2.5, 2, 5, 6);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-2.2, 7, 4.4, 1);

      // Main porcelain vanity basin body (Crisp White Enamel)
      const sinkGrad = ctx.createLinearGradient(-7, -4, 7, 3);
      sinkGrad.addColorStop(0, '#ffffff');
      sinkGrad.addColorStop(0.7, '#f8fafc');
      sinkGrad.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = sinkGrad;
      ctx.beginPath();
      ctx.roundRect(-7, -4.5, 14, 8, 2.5);
      ctx.fill();

      // Inner bowl recess
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5.2, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.ellipse(0, 0.2, 4.6, 2.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Chrome drain hole
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(0, 0.4, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Chrome mixer faucet at rear
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(-1.2, -5.8, 2.4, 2, 0.5);
      ctx.fill();

      // Spout extending over basin
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(0, -5.5);
      ctx.lineTo(0, -3.2);
      ctx.stroke();

      // Top lever
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-1.5, -6.5, 3, 0.7);
      return true;
    }

    // 16. Modern Porcelain Toilet
    case 'furn_toilet': {
      drawShadow(ctx, 6.5, 3.2, 8, 0.28);

      // Pedestal base mounting to floor
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(-3.5, 3.5, 7, 4.5, 1.5);
      ctx.fill();

      // Rear water cistern tank
      const tankGrad = ctx.createLinearGradient(-5, -8, 5, 0);
      tankGrad.addColorStop(0, '#ffffff');
      tankGrad.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = tankGrad;
      ctx.beginPath();
      ctx.roundRect(-5, -8.5, 10, 7.5, 1.5);
      ctx.fill();

      // Cistern top lid
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-5.4, -9.2, 10.8, 1.5, 0.6);
      ctx.fill();

      // Chrome dual-flush push button
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(0, -8.8, 1.4, 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.ellipse(-0.5, -8.8, 0.5, 0.3, 0, 0, Math.PI * 2);
      ctx.ellipse(0.5, -8.8, 0.5, 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Contoured toilet bowl extending forward
      const bowlGrad = ctx.createLinearGradient(-4.5, -1, 4.5, 5);
      bowlGrad.addColorStop(0, '#ffffff');
      bowlGrad.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = bowlGrad;
      ctx.beginPath();
      ctx.ellipse(0, 2.5, 4.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Closed seat lid
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, 2.2, 4.2, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Seat lid contour shadow line
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.ellipse(0, 2.2, 4.2, 4, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Chrome hinge cylinders
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-2.5, -1.8, 1.2, 1);
      ctx.fillRect(1.3, -1.8, 1.2, 1);
      return true;
    }

    // 17. Executive / Study Writing Desk
    case 'furn_desk': {
      drawShadow(ctx, 10, 3.6, 8.5, 0.28);

      // Left black steel leg frame
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(-8.5, -3, 2, 11);

      // Right 3-tier drawer pedestal
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(2.5, -3, 6, 11, 1);
      ctx.fill();

      // 3 drawer faces
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.roundRect(2.8, -2.5, 5.4, 2.8, 0.5);
      ctx.roundRect(2.8, 0.8, 5.4, 2.8, 0.5);
      ctx.roundRect(2.8, 4.1, 5.4, 2.8, 0.5);
      ctx.fill();

      // Brushed silver drawer pull bars
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(4.5, -1.3, 2, 0.6);
      ctx.fillRect(4.5, 2, 2, 0.6);
      ctx.fillRect(4.5, 5.3, 2, 0.6);

      // Spacious Walnut Tabletop
      const deskTopGrad = ctx.createLinearGradient(-9.5, -5.5, 9.5, -2);
      deskTopGrad.addColorStop(0, '#b45309');
      deskTopGrad.addColorStop(0.5, '#d97706');
      deskTopGrad.addColorStop(1, '#92400e');
      ctx.fillStyle = deskTopGrad;
      ctx.beginPath();
      ctx.roundRect(-9.5, -6, 19, 3.2, 1.2);
      ctx.fill();

      // Top bevel highlight
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-9.2, -6, 18.4, 0.6);

      // Dark leather writing pad / blotter on the center-left
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-6.5, -5.5, 8.5, 2.2, 0.4);
      ctx.fill();

      // Chrome cable grommet ring (top right)
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(7.2, -4.5, 0.7, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // 18. Library Bookshelf with Books
    case 'furn_bookshelf': {
      drawShadow(ctx, 9, 3.5, 8.5, 0.28);

      // Outer heavy oak bookcase frame
      const shelfGrad = ctx.createLinearGradient(-8, -9, 8, 8);
      shelfGrad.addColorStop(0, '#78350f');
      shelfGrad.addColorStop(0.5, '#92400e');
      shelfGrad.addColorStop(1, '#451a03');
      ctx.fillStyle = shelfGrad;
      ctx.beginPath();
      ctx.roundRect(-8, -9.5, 16, 18, 1.5);
      ctx.fill();

      // Top decorative crown cornice
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-8.4, -9.8, 16.8, 1.4);

      // Dark backboard interior
      ctx.fillStyle = '#291404';
      ctx.fillRect(-7, -8, 14, 15);

      // 3 horizontal shelf planks
      ctx.fillStyle = '#a16207';
      ctx.fillRect(-7, -3.5, 14, 1.2);
      ctx.fillRect(-7, 1.5, 14, 1.2);
      ctx.fillRect(-7, 6.5, 14, 1.2);

      // Shelf 1 (Top): Row of colorful book spines
      const topBooks = [
        { x: -6.5, w: 1.5, h: 3.8, c: '#dc2626' },
        { x: -4.8, w: 1.8, h: 4.2, c: '#2563eb' },
        { x: -2.8, w: 1.4, h: 3.5, c: '#16a34a' },
        { x: -1.2, w: 2.2, h: 4.0, c: '#d97706' },
        { x: 1.2,  w: 1.6, h: 3.7, c: '#7c3aed' },
        { x: 3.0,  w: 1.9, h: 4.1, c: '#0891b2' },
        { x: 5.1,  w: 1.4, h: 3.4, c: '#b91c1c' }
      ];
      for (const b of topBooks) {
        ctx.fillStyle = b.c;
        ctx.fillRect(b.x, -3.5 - b.h, b.w, b.h);
        // Gold foil spine ribs
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(b.x, -3.5 - b.h + 0.8, b.w, 0.4);
        ctx.fillRect(b.x, -3.5 - 0.8, b.w, 0.4);
      }

      // Shelf 2 (Middle): Varied books + leaning book
      const midBooks = [
        { x: -6.5, w: 2.2, h: 4.4, c: '#475569' },
        { x: -4.1, w: 1.6, h: 4.0, c: '#b45309' },
        { x: -2.3, w: 2.0, h: 4.5, c: '#0f766e' },
        { x: -0.1, w: 1.7, h: 3.9, c: '#9333ea' }
      ];
      for (const b of midBooks) {
        ctx.fillStyle = b.c;
        ctx.fillRect(b.x, 1.5 - b.h, b.w, b.h);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(b.x, 1.5 - b.h + 0.6, b.w, 0.3);
      }
      // Leaning book on the right
      ctx.save();
      ctx.translate(3.5, 1.5);
      ctx.rotate(0.25);
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(0, -4.2, 1.8, 4.2);
      ctx.restore();

      // Shelf 3 (Bottom): Thick heavy encyclopedia volumes
      const botBooks = [
        { x: -6.5, w: 2.6, h: 4.5, c: '#1e293b' },
        { x: -3.7, w: 2.6, h: 4.5, c: '#1e293b' },
        { x: -0.9, w: 2.6, h: 4.5, c: '#1e293b' },
        { x: 1.9,  w: 2.6, h: 4.5, c: '#1e293b' },
        { x: 4.7,  w: 1.8, h: 4.0, c: '#854d0e' }
      ];
      for (const b of botBooks) {
        ctx.fillStyle = b.c;
        ctx.fillRect(b.x, 6.5 - b.h, b.w, b.h);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(b.x + 0.3, 6.5 - b.h + 1, b.w - 0.6, 0.5);
      }
      return true;
    }

    // 19. Elegant Wall Mirror in Molded Frame
    case 'furn_mirror': {
      drawShadow(ctx, 7.5, 2.5, 8.2, 0.22);

      // Wall mounting hook & wire at top
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -9.5);
      ctx.lineTo(-3, -7.5);
      ctx.moveTo(0, -9.5);
      ctx.lineTo(3, -7.5);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(0, -9.5, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Champagne Gold Molded Beveled Frame
      const goldFrame = ctx.createLinearGradient(-7, -7.5, 7, 7.5);
      goldFrame.addColorStop(0, '#fef08a');
      goldFrame.addColorStop(0.3, '#d97706');
      goldFrame.addColorStop(0.7, '#f59e0b');
      goldFrame.addColorStop(1, '#92400e');
      ctx.fillStyle = goldFrame;
      ctx.beginPath();
      ctx.roundRect(-7, -7.5, 14, 15, 2.5);
      ctx.fill();

      // Inner frame bezel
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.7;
      ctx.strokeRect(-7, -7.5, 14, 15);

      // Mirror Glass Face (Cool sky-blue reflective tint)
      const mirrorGrad = ctx.createLinearGradient(-5.5, -6, 5.5, 6);
      mirrorGrad.addColorStop(0, '#e0f2fe');
      mirrorGrad.addColorStop(0.5, '#f0f9ff');
      mirrorGrad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = mirrorGrad;
      ctx.beginPath();
      ctx.roundRect(-5.5, -6, 11, 12, 1.5);
      ctx.fill();

      // Sharp diagonal glass reflection streaks (gloss shine)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.moveTo(-4, -6);
      ctx.lineTo(-1.5, -6);
      ctx.lineTo(-5.5, 2);
      ctx.lineTo(-5.5, -0.5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(2.2, -6);
      ctx.lineTo(-3, 6);
      ctx.lineTo(-5.2, 6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.moveTo(3.5, -6);
      ctx.lineTo(4.8, -6);
      ctx.lineTo(0.5, 6);
      ctx.lineTo(-0.8, 6);
      ctx.closePath();
      ctx.fill();
      return true;
    }

    default:
      return false;
  }
}
