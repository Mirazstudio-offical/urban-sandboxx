// Procedural 2D Canvas Models for Clothing, Bags, Headwear, and Footwear
import { drawShadow, drawGlossBand } from './itemGraphicShared';

export function drawClothingItem(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  switch (itemId) {
    // === BAGS / CARRYING ===
    case 'backpack': {
      drawShadow(ctx, 8.5, 3.2, 7.8, 0.26);

      // Padded shoulder straps visible on sides
      ctx.fillStyle = '#273319';
      ctx.beginPath();
      ctx.roundRect(-8.5, -6, 2.5, 12, 1.2);
      ctx.roundRect(6, -6, 2.5, 12, 1.2);
      ctx.fill();

      // Top grab / haul loop handle
      ctx.strokeStyle = '#273319';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, -7.5, 3, Math.PI, 0);
      ctx.stroke();

      // Main rugged canvas backpack body (olive drab)
      ctx.fillStyle = '#3f4f2c';
      ctx.beginPath();
      ctx.roundRect(-6.5, -7, 13, 14, 3);
      ctx.fill();

      // Top storm flap cover
      ctx.fillStyle = '#4d6036';
      ctx.beginPath();
      ctx.roundRect(-6.5, -7, 13, 6, 2);
      ctx.fill();

      // Side elasticized utility / water mesh pouch
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(5, -1, 2.2, 6.5, 1);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(5, -1, 2.2, 6.5);

      // Front bellow cargo pouch
      ctx.fillStyle = '#344224';
      ctx.beginPath();
      ctx.roundRect(-5, 0, 10, 6, 1.5);
      ctx.fill();

      // Brass zipper track on front pouch
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-4, 1.2);
      ctx.lineTo(4, 1.2);
      ctx.stroke();

      // Paracord zipper pull tab
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(1.5, 1.2, 1.2, 2.2);

      // Tactical leather closure straps with silver metal buckles
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-3.8, -6, 1.5, 10);
      ctx.fillRect(2.3, -6, 1.5, 10);

      // Silver metal buckles
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-4.3, -2, 2.5, 1.8);
      ctx.fillRect(1.8, -2, 2.5, 1.8);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-3.7, -1.6, 1.3, 1);
      ctx.fillRect(2.4, -1.6, 1.3, 1);

      // Tactical MOLLE webbing lines on front pocket
      ctx.fillStyle = '#273319';
      ctx.fillRect(-4, 3.2, 8, 0.7);
      ctx.fillRect(-4, 4.6, 8, 0.7);
      return true;
    }

    // === HEADWEAR ===
    case 'beanie_black': {
      drawShadow(ctx, 7.5, 2.6, 7.5, 0.22);

      // Beanie dome crown
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.moveTo(-6.5, 3.5);
      ctx.quadraticCurveTo(-7, -5, -3, -7.5);
      ctx.quadraticCurveTo(0, -8.5, 3, -7.5);
      ctx.quadraticCurveTo(7, -5, 6.5, 3.5);
      ctx.closePath();
      ctx.fill();

      // Crown seam dart lines
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -8.5);
      ctx.lineTo(0, 1);
      ctx.moveTo(-3, -7.5);
      ctx.lineTo(-2, 1);
      ctx.moveTo(3, -7.5);
      ctx.lineTo(2, 1);
      ctx.stroke();

      // Folded thick ribbed cuff at bottom
      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.roundRect(-7, 0.5, 14, 6, 1.5);
      ctx.fill();

      // Vertical knit rib stitches on the cuff
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 0.6;
      for (let x = -5.5; x <= 5.5; x += 1.6) {
        ctx.beginPath();
        ctx.moveTo(x, 1);
        ctx.lineTo(x, 6);
        ctx.stroke();
      }

      // Small woven textile brand label tag on side of cuff
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(3, 2, 2.8, 3.2);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(3.4, 2.8, 2, 0.6);
      ctx.fillRect(3.4, 3.8, 1.5, 0.5);
      return true;
    }

    case 'cap_red': {
      drawShadow(ctx, 8.5, 2.8, 7.8, 0.22);

      // Curved brim / visor projecting forward
      ctx.fillStyle = '#7f1d1d'; // Visor underside shadow
      ctx.beginPath();
      ctx.ellipse(2, 4.5, 7, 2.5, 0.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#b91c1c'; // Visor top surface
      ctx.beginPath();
      ctx.moveTo(-3.5, 3);
      ctx.quadraticCurveTo(3, 2, 8.5, 3.5);
      ctx.quadraticCurveTo(9, 6.5, 2, 6.5);
      ctx.quadraticCurveTo(-3, 6, -3.5, 3);
      ctx.closePath();
      ctx.fill();

      // Main baseball cap crown (6-panel dome)
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-6.5, 3.5);
      ctx.quadraticCurveTo(-6.8, -4.5, -2, -6.5);
      ctx.quadraticCurveTo(1.5, -7.2, 5, -5.5);
      ctx.quadraticCurveTo(7.2, -3.5, 6, 3.5);
      ctx.closePath();
      ctx.fill();

      // Crown panel stitch lines
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, -6.8);
      ctx.lineTo(0, 3.5);
      ctx.moveTo(0, -6.8);
      ctx.lineTo(-4.5, 1);
      ctx.moveTo(0, -6.8);
      ctx.lineTo(4.5, 1);
      ctx.stroke();

      // Embroidered white athletic front emblem
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, -1, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 3px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('A', 0, -1);

      // Top fabric squatchee button
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.arc(0, -6.8, 1, 0, Math.PI * 2);
      ctx.fill();

      // Ventilation eyelets
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.arc(-2.8, -3, 0.5, 0, Math.PI * 2);
      ctx.arc(2.8, -3, 0.5, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'ushanka_hat': {
      drawShadow(ctx, 8.5, 3, 7.8, 0.25);

      // Main felt crown (dark charcoal)
      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.roundRect(-6.5, -6.5, 13, 9, 3);
      ctx.fill();

      // Ear flaps folded up on sides
      ctx.fillStyle = '#78716c';
      ctx.beginPath();
      ctx.roundRect(-7.5, -4, 2.8, 7.5, 1.4);
      ctx.roundRect(4.7, -4, 2.8, 7.5, 1.4);
      ctx.fill();

      // Flap tied laces at the top
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-2, -6.5);
      ctx.lineTo(2, -6.5);
      ctx.moveTo(0, -6.5);
      ctx.lineTo(-0.5, -4.8);
      ctx.stroke();

      // Front fur visor turned upwards
      ctx.fillStyle = '#a8a29e';
      ctx.beginPath();
      ctx.roundRect(-5.5, -2, 11, 7, 2.5);
      ctx.fill();

      // Plush fur texture tufts
      ctx.fillStyle = '#e7e5e4';
      ctx.beginPath();
      for (let i = -4.5; i <= 4.5; i += 1.8) {
        ctx.arc(i, -1.8, 0.8, 0, Math.PI);
        ctx.arc(i, 4.5, 0.8, Math.PI, 0);
      }
      ctx.fill();

      // Soviet style red star cockade emblem in center
      ctx.fillStyle = '#f59e0b'; // Gold border
      ctx.beginPath();
      ctx.arc(0, 1.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626'; // Red enamel star
      ctx.beginPath();
      for (let s = 0; s < 5; s++) {
        const angle = (s * 4 * Math.PI) / 5 - Math.PI / 2;
        const dist = 1.8;
        const x = Math.cos(angle) * dist;
        const y = 1.5 + Math.sin(angle) * dist;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      return true;
    }

    // === FACE & NECK ===
    case 'scarf_blue': {
      drawShadow(ctx, 8, 3, 7.8, 0.22);

      // Dangling scarf tail with fringe
      ctx.fillStyle = '#1e40af';
      ctx.beginPath();
      ctx.roundRect(1, 0, 4.5, 7.5, 1);
      ctx.fill();

      // Bottom fringe tassels
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 0.8;
      for (let fx = 1.4; fx <= 5.2; fx += 1) {
        ctx.beginPath();
        ctx.moveTo(fx, 7);
        ctx.lineTo(fx, 9);
        ctx.stroke();
      }

      // Main chunky knitted scarf coil wrap
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.roundRect(-7.5, -5.5, 15, 8.5, 4);
      ctx.fill();

      // Inner coil loop layer
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(-6, -4, 12, 6, 3);
      ctx.fill();

      // Diagonal cable knit texture ribs
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 0.8;
      for (let k = -5; k <= 5; k += 2) {
        ctx.beginPath();
        ctx.moveTo(k - 1, -4);
        ctx.lineTo(k + 1, 1);
        ctx.stroke();
      }

      // Soft highlight along loop fold
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, -3.5, 4.5, Math.PI * 0.8, Math.PI * 1.8);
      ctx.stroke();
      return true;
    }

    // === SHIRTS & TOPS ===
    case 'tshirt_white': {
      drawShadow(ctx, 8, 2.8, 7.8, 0.2);

      // Folded white cotton t-shirt body
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-6.5, -5.5, 13, 12.5, 1.5);
      ctx.fill();

      // Folded short sleeves on sides
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.roundRect(-8, -4, 2, 7, 1);
      ctx.roundRect(6, -4, 2, 7, 1);
      ctx.fill();

      // Crew-neck collar opening
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(0, -5.5, 3.2, 1.8, 0, 0, Math.PI);
      ctx.fill();

      // Ribbed collar trim
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(0, -5.5, 3.2, 1.8, 0, 0, Math.PI);
      ctx.stroke();

      // Fabric fold crease lines
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-6, 1);
      ctx.lineTo(6, 1);
      ctx.moveTo(-6.5, -4);
      ctx.lineTo(-4, 5);
      ctx.moveTo(6.5, -4);
      ctx.lineTo(4, 5);
      ctx.stroke();

      // Woven inner neck label
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-1.5, -5, 3, 1.2);
      return true;
    }

    case 'tshirt_black': {
      drawShadow(ctx, 8, 2.8, 7.8, 0.22);

      // Folded matte black cotton t-shirt body
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-6.5, -5.5, 13, 12.5, 1.5);
      ctx.fill();

      // Folded sleeves
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.roundRect(-8, -4, 2, 7, 1);
      ctx.roundRect(6, -4, 2, 7, 1);
      ctx.fill();

      // Crew neck collar opening
      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.ellipse(0, -5.5, 3.2, 1.8, 0, 0, Math.PI);
      ctx.fill();

      // Collar ribbed edge
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(0, -5.5, 3.2, 1.8, 0, 0, Math.PI);
      ctx.stroke();

      // Clean fold lines
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-6, 1);
      ctx.lineTo(6, 1);
      ctx.moveTo(-6.5, -4);
      ctx.lineTo(-4, 5);
      ctx.moveTo(6.5, -4);
      ctx.lineTo(4, 5);
      ctx.stroke();

      // Inner neck label
      ctx.fillStyle = '#52525b';
      ctx.fillRect(-1.5, -5, 3, 1.2);
      return true;
    }

    case 'long_johns': {
      drawShadow(ctx, 7.5, 2.8, 7.8, 0.2);

      // Heather slate thermal leggings body
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      // Waistband down to twin tapered legs
      ctx.moveTo(-5.5, -6);
      ctx.lineTo(5.5, -6);
      ctx.lineTo(5.5, -2);
      ctx.lineTo(4.5, 6.5);
      ctx.lineTo(1.5, 6.5);
      ctx.lineTo(0, -1);
      ctx.lineTo(-1.5, 6.5);
      ctx.lineTo(-4.5, 6.5);
      ctx.lineTo(-5.5, -2);
      ctx.closePath();
      ctx.fill();

      // Wide elastic waistband in contrasting charcoal
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-5.5, -6.5, 11, 2.2, 1);
      ctx.fill();

      // Ribbed ankle cuffs
      ctx.fillStyle = '#334155';
      ctx.fillRect(-4.5, 5.5, 3, 1.5);
      ctx.fillRect(1.5, 5.5, 3, 1.5);

      // Flatlock anatomical seam stitching
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, -4.5);
      ctx.lineTo(0, -1);
      ctx.moveTo(-3, -2);
      ctx.lineTo(-3, 5.5);
      ctx.moveTo(3, -2);
      ctx.lineTo(3, 5.5);
      ctx.stroke();

      // Waffle-knit micro dots
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      for (let y = -3; y <= 4; y += 2) {
        ctx.fillRect(-3.5, y, 1, 0.8);
        ctx.fillRect(2.5, y, 1, 0.8);
      }
      return true;
    }

    case 'sweater_blue': {
      drawShadow(ctx, 8.5, 3, 7.8, 0.22);

      // Cozy blue wool sweater body
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.roundRect(-7, -6, 14, 13, 2);
      ctx.fill();

      // Folded long sleeves on flanks
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.roundRect(-8.5, -4.5, 2.2, 9, 1);
      ctx.roundRect(6.3, -4.5, 2.2, 9, 1);
      ctx.fill();

      // Thick ribbed crew neckline collar
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.ellipse(0, -5.8, 3.8, 2, 0, 0, Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Vertical cable knit braids running down chest
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 0.9;
      for (let cx = -3; cx <= 3; cx += 2) {
        ctx.beginPath();
        ctx.moveTo(cx, -4);
        ctx.lineTo(cx + 0.5, -1);
        ctx.lineTo(cx - 0.5, 2);
        ctx.lineTo(cx, 5);
        ctx.stroke();
      }

      // Ribbed bottom waist hem & sleeve cuffs
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(-7, 5.5, 14, 1.8);
      ctx.fillRect(-8.5, 3.5, 2.2, 1.5);
      ctx.fillRect(6.3, 3.5, 2.2, 1.5);
      return true;
    }

    case 'plaid_shirt': {
      drawShadow(ctx, 8.5, 3, 7.8, 0.22);

      // Main flannel shirt body (Red base)
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-7, -5.5, 14, 12.5, 2);
      ctx.fill();

      // Folded sleeves
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.roundRect(-8.5, -4, 2, 8, 1);
      ctx.roundRect(6.5, -4, 2, 8, 1);
      ctx.fill();

      // Buffalo check horizontal and vertical black bars
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-7, -2.5, 14, 2.2);
      ctx.fillRect(-7, 2, 14, 2.2);
      ctx.fillRect(-5, -5.5, 2.2, 12.5);
      ctx.fillRect(2.8, -5.5, 2.2, 12.5);

      // Deep maroon intersection blocks
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(-5, -2.5, 2.2, 2.2);
      ctx.fillRect(2.8, -2.5, 2.2, 2.2);
      ctx.fillRect(-5, 2, 2.2, 2.2);
      ctx.fillRect(2.8, 2, 2.2, 2.2);

      // Center front button placket
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(-1.2, -5.5, 2.4, 12.5);

      // Folded shirt collar
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-4.5, -6);
      ctx.lineTo(-1, -3);
      ctx.lineTo(0, -4.5);
      ctx.lineTo(1, -3);
      ctx.lineTo(4.5, -6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Pearlescent shirt buttons
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, -3.2, 0.6, 0, Math.PI * 2);
      ctx.arc(0, -0.2, 0.6, 0, Math.PI * 2);
      ctx.arc(0, 2.8, 0.6, 0, Math.PI * 2);
      ctx.arc(0, 5.5, 0.6, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // === JACKETS & COATS ===
    case 'leather_jacket': {
      drawShadow(ctx, 8.5, 3.2, 7.8, 0.26);

      // Burnished black leather body
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-7.5, -6.5, 15, 13.5, 2.5);
      ctx.fill();

      // Wide notched biker collar lapels
      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.moveTo(-6, -6.5);
      ctx.lineTo(-2, -2);
      ctx.lineTo(-5.5, -0.5);
      ctx.lineTo(-7, -4);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(6, -6.5);
      ctx.lineTo(1, -2);
      ctx.lineTo(5, -0.5);
      ctx.lineTo(6.5, -4);
      ctx.closePath();
      ctx.fill();

      // Silver snap studs on collar points
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(-4, -1.8, 0.6, 0, Math.PI * 2);
      ctx.arc(3.5, -1.8, 0.6, 0, Math.PI * 2);
      ctx.arc(-5.5, -5, 0.6, 0, Math.PI * 2);
      ctx.arc(5.5, -5, 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Iconic asymmetrical silver metal zipper
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(1.5, -2);
      ctx.lineTo(-2, 5.5);
      ctx.stroke();

      // Slant zippered chest pocket
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(1.5, 0);
      ctx.lineTo(5, 1);
      ctx.stroke();

      // Bottom waist belt with silver buckle
      ctx.fillStyle = '#09090b';
      ctx.fillRect(-7.5, 5.5, 15, 1.8);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-3, 5.2, 2.6, 2.4);
      ctx.fillStyle = '#09090b';
      ctx.fillRect(-2.4, 5.6, 1.4, 1.6);

      // Gloss specular sheen on leather shoulder
      drawGlossBand(ctx, -6, -6, 2.5, 4, 0.25);
      return true;
    }

    case 'winter_jacket': {
      drawShadow(ctx, 9, 3.2, 7.8, 0.25);

      // Heavy arctic navy down puffer coat body
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-8, -6.5, 16, 14, 3);
      ctx.fill();

      // Thick quilted down baffle horizontal ribs
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-7.5, -3); ctx.lineTo(7.5, -3);
      ctx.moveTo(-7.5, 0.5); ctx.lineTo(7.5, 0.5);
      ctx.moveTo(-7.5, 4);   ctx.lineTo(7.5, 4);
      ctx.stroke();

      // Puffer baffle highlights
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-7, -4.5); ctx.lineTo(7, -4.5);
      ctx.moveTo(-7, -1);   ctx.lineTo(7, -1);
      ctx.moveTo(-7, 2.5);  ctx.lineTo(7, 2.5);
      ctx.stroke();

      // Center storm flap with snap buttons
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-1.2, -6.5, 2.4, 14);
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(0, -4.5, 0.6, 0, Math.PI * 2);
      ctx.arc(0, -1, 0.6, 0, Math.PI * 2);
      ctx.arc(0, 2.5, 0.6, 0, Math.PI * 2);
      ctx.arc(0, 6, 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Fluffy warm sherpa/fur hood trim at the top
      ctx.fillStyle = '#d4a373';
      ctx.beginPath();
      ctx.roundRect(-6.5, -8, 13, 3.5, 1.8);
      ctx.fill();
      ctx.fillStyle = '#fef3c7';
      for (let hx = -5.5; hx <= 5.5; hx += 1.8) {
        ctx.beginPath();
        ctx.arc(hx, -7.5, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dual handwarmer pockets
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-6.5, 2, 2.5, 3.5);
      ctx.fillRect(4, 2, 2.5, 3.5);
      return true;
    }

    case 'raincoat_yellow': {
      drawShadow(ctx, 8.5, 3, 7.8, 0.22);

      // High-visibility maritime yellow waterproof body
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.roundRect(-7.5, -6.5, 15, 14, 2.5);
      ctx.fill();

      // Deep integrated rain hood
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.roundRect(-5.5, -8.5, 11, 4.5, 2);
      ctx.fill();

      // Black hood drawstrings with plastic cord locks
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-2.5, -4.5); ctx.lineTo(-2.5, -1);
      ctx.moveTo(2.5, -4.5);  ctx.lineTo(2.5, -1);
      ctx.stroke();
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-3, -2, 1, 1.5);
      ctx.fillRect(2, -2, 1, 1.5);

      // Center front storm flap with snap buttons
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(-1.4, -4.5, 2.8, 12);

      ctx.fillStyle = '#854d0e';
      ctx.beginPath();
      ctx.arc(0, -3, 0.7, 0, Math.PI * 2);
      ctx.arc(0, 0, 0.7, 0, Math.PI * 2);
      ctx.arc(0, 3, 0.7, 0, Math.PI * 2);
      ctx.arc(0, 6, 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Two front flap storm pockets
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(-6, 2, 3.5, 3.8);
      ctx.fillRect(2.5, 2, 3.5, 3.8);

      // Waterproof rubber gloss reflection
      drawGlossBand(ctx, -5.5, -6, 2, 12, 0.35);
      return true;
    }

    // === PANTS & LEGS ===
    case 'jeans_blue': {
      drawShadow(ctx, 7.5, 2.8, 7.8, 0.22);

      // Classic indigo denim folded jeans
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      // Waist down to twin folded legs
      ctx.moveTo(-6, -6);
      ctx.lineTo(6, -6);
      ctx.lineTo(6, 6);
      ctx.lineTo(1.5, 6);
      ctx.lineTo(0, -1);
      ctx.lineTo(-1.5, 6);
      ctx.lineTo(-6, 6);
      ctx.closePath();
      ctx.fill();

      // Contrasting copper-orange denim topstitching
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-5.2, -4); ctx.lineTo(-5.2, 5.5);
      ctx.moveTo(5.2, -4);  ctx.lineTo(5.2, 5.5);
      ctx.moveTo(0, -4);    ctx.lineTo(0, -1);
      ctx.stroke();

      // Curved scoop front pockets with copper rivets
      ctx.strokeStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(-4, -4, 2, 0, Math.PI * 0.5);
      ctx.arc(4, -4, 2, Math.PI * 0.5, Math.PI);
      ctx.stroke();

      // Brass waistband button & copper rivets
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(0, -4.5, 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(-4.5, -4, 0.5, 0, Math.PI * 2);
      ctx.arc(4.5, -4, 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Light cuffed denim hem at bottoms
      ctx.fillStyle = '#93c5fd';
      ctx.fillRect(-6, 5, 4.5, 1.2);
      ctx.fillRect(1.5, 5, 4.5, 1.2);
      return true;
    }

    case 'cargo_pants': {
      drawShadow(ctx, 7.5, 2.8, 7.8, 0.22);

      // Rugged military olive-khaki cargo pants
      ctx.fillStyle = '#4b5536';
      ctx.beginPath();
      ctx.moveTo(-6, -6);
      ctx.lineTo(6, -6);
      ctx.lineTo(6.5, -2);
      ctx.lineTo(6, 6);
      ctx.lineTo(1.5, 6);
      ctx.lineTo(0, -1);
      ctx.lineTo(-1.5, 6);
      ctx.lineTo(-6, 6);
      ctx.lineTo(-6.5, -2);
      ctx.closePath();
      ctx.fill();

      // Large bellow cargo pockets on outer thighs
      ctx.fillStyle = '#363e22';
      ctx.beginPath();
      ctx.roundRect(-7.5, -1, 3, 5, 1);
      ctx.roundRect(4.5, -1, 3, 5, 1);
      ctx.fill();

      // Pocket flap covers with button tabs
      ctx.fillStyle = '#2f361d';
      ctx.fillRect(-7.5, -1, 3, 1.4);
      ctx.fillRect(4.5, -1, 3, 1.4);
      ctx.fillStyle = '#a1a1aa';
      ctx.fillRect(-6.2, -0.5, 0.8, 0.8);
      ctx.fillRect(5.8, -0.5, 0.8, 0.8);

      // Reinforced knee dart patches
      ctx.fillStyle = '#3f4728';
      ctx.fillRect(-4.5, 2.5, 2.5, 2.5);
      ctx.fillRect(2, 2.5, 2.5, 2.5);

      // Belt loops around waistband
      ctx.fillStyle = '#2f361d';
      for (let bx = -4.5; bx <= 4.5; bx += 2.2) {
        ctx.fillRect(bx, -6, 0.8, 1.5);
      }
      return true;
    }

    case 'shorts_khaki': {
      drawShadow(ctx, 8, 2.8, 7.8, 0.2);

      // Tailored desert khaki summer shorts
      ctx.fillStyle = '#d4a373';
      ctx.beginPath();
      ctx.moveTo(-6, -5.5);
      ctx.lineTo(6, -5.5);
      ctx.lineTo(6.5, 3.5);
      ctx.lineTo(1.5, 3.5);
      ctx.lineTo(0, -0.5);
      ctx.lineTo(-1.5, 3.5);
      ctx.lineTo(-6.5, 3.5);
      ctx.closePath();
      ctx.fill();

      // Waistband & belt loops
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-6, -5.5, 12, 1.5);
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, -4.7, 0.6, 0, Math.PI * 2); // Horn button
      ctx.fill();

      // Side chino slant pockets & fly
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-5, -4); ctx.lineTo(-2.5, -1);
      ctx.moveTo(5, -4);  ctx.lineTo(2.5, -1);
      ctx.moveTo(0, -4);  ctx.lineTo(0, -0.5);
      ctx.stroke();

      // Neat folded bottom cuffs
      ctx.fillStyle = '#bc8b5c';
      ctx.fillRect(-6.5, 2.2, 5, 1.3);
      ctx.fillRect(1.5, 2.2, 5, 1.3);
      return true;
    }

    // === FOOTWEAR ===
    case 'sneakers_white': {
      drawShadow(ctx, 8.5, 2.8, 7.8, 0.22);

      // Sculpted running shoe EVA midsole (white/light grey)
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.roundRect(-8, 3.5, 16, 3, 1.5);
      ctx.fill();

      // Grippy rubber tread outsole
      ctx.fillStyle = '#475569';
      ctx.fillRect(-7.5, 5.5, 15, 1);

      // Clean white leather & breathable mesh upper
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-7.5, 3.5);
      ctx.lineTo(-7.5, 0.5);
      ctx.quadraticCurveTo(-7, -3, -4, -3.5);
      ctx.lineTo(-1, -1.5);
      ctx.lineTo(2, -3.5);
      ctx.quadraticCurveTo(6, -3.5, 7.5, 1);
      ctx.lineTo(7.5, 3.5);
      ctx.closePath();
      ctx.fill();

      // Suede mudguard toe cap
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(4.5, 0.5, 3, 3, 1);
      ctx.fill();

      // Dynamic athletic swoosh / wave stripe (sky blue)
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-5, 0.5);
      ctx.quadraticCurveTo(0, 2.5, 5, 0.5);
      ctx.stroke();

      // White shoelace criss-cross pattern
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-3, -2.5); ctx.lineTo(-1, -1.5);
      ctx.moveTo(-1, -1.5); ctx.lineTo(1, -2.5);
      ctx.stroke();

      // Padded ankle collar lining
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(-5.5, -4, 2.5, 2, 1);
      ctx.fill();
      return true;
    }

    case 'work_boots': {
      drawShadow(ctx, 8.5, 3, 7.8, 0.26);

      // Heavy black lugged Vibram commando rubber sole
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-8, 3.5, 16, 3.5, 1.5);
      ctx.fill();

      // Deep traction cleat lugs on bottom
      ctx.fillStyle = '#09090b';
      for (let lx = -7; lx <= 6; lx += 2.4) {
        ctx.fillRect(lx, 6, 1.5, 1.2);
      }

      // Heavy oiled timber leather boot upper (rich brown)
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(-7.5, 3.5);
      ctx.lineTo(-7.5, -4);
      ctx.lineTo(-3, -4);
      ctx.lineTo(-1.5, -0.5);
      ctx.lineTo(3.5, 0);
      ctx.quadraticCurveTo(7.5, 0.5, 7.5, 3.5);
      ctx.closePath();
      ctx.fill();

      // Reinforced double-stitched steel toe cap contour
      ctx.fillStyle = '#5a2608';
      ctx.beginPath();
      ctx.roundRect(3.5, 0.5, 4, 3, 1);
      ctx.fill();

      // Padded black leather ankle collar rim
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-8, -5.5, 5.5, 2.2, 1);
      ctx.fill();

      // Golden-yellow heavy duty taslan boot laces & brass eyelets
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(-2.5, -2.5, 0.6, 0, Math.PI * 2);
      ctx.arc(-1.5, -1, 0.6, 0, Math.PI * 2);
      ctx.arc(0, 0.2, 0.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-3, -3.5);
      ctx.lineTo(-0.5, 0);
      ctx.stroke();
      return true;
    }

    case 'winter_boots': {
      drawShadow(ctx, 8.5, 3, 7.8, 0.26);

      // Deep snow-clearing rubber winter sole
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-8, 3.8, 16, 3.2, 1.5);
      ctx.fill();

      // Waterproof vulcanized black rubber duck-shell lower
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.moveTo(-7.5, 3.8);
      ctx.lineTo(-7.5, 1);
      ctx.quadraticCurveTo(-3, 0.5, 0, 1);
      ctx.lineTo(4, 0.8);
      ctx.quadraticCurveTo(7.5, 1, 7.5, 3.8);
      ctx.closePath();
      ctx.fill();

      // Upper suede insulated shaft (warm charcoal)
      ctx.fillStyle = '#44403c';
      ctx.beginPath();
      ctx.roundRect(-7.5, -4.5, 5.5, 6, 1);
      ctx.fill();

      // Luxurious white plush sherpa/shearling collar overflowing the top
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-8, -6.5, 7, 3, 1.5);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      for (let fx = -7; fx <= -2; fx += 1.5) {
        ctx.beginPath();
        ctx.arc(fx, -6.5, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      // D-ring lace hardware with red winter laces
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-2.5, -3); ctx.lineTo(-0.5, -1);
      ctx.moveTo(-0.5, -1); ctx.lineTo(1.5, 1);
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1'; // D-rings
      ctx.beginPath();
      ctx.arc(-2.5, -3, 0.6, 0, Math.PI * 2);
      ctx.arc(-1, -1, 0.6, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'socks_white': {
      drawShadow(ctx, 7, 2.5, 7.5, 0.18);

      // Folded pair of white athletic crew socks
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      // Sock foot and leg curve
      ctx.moveTo(-5.5, -5.5);
      ctx.lineTo(0.5, -5.5);
      ctx.lineTo(1.5, 0);
      ctx.quadraticCurveTo(4, 2, 6, 4.5);
      ctx.lineTo(4, 6.5);
      ctx.quadraticCurveTo(0, 5.5, -2, 3);
      ctx.lineTo(-4.5, 0);
      ctx.closePath();
      ctx.fill();

      // Retro athletic stripes (Blue & Red) across ribbed cuff
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(-5.5, -4.2, 6, 0.9);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-5.5, -2.6, 6, 0.9);

      // Heather grey reinforced heel and toe caps
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(5, 5.5, 1.4, 0, Math.PI * 2); // Toe
      ctx.arc(-1.5, 2.8, 1.4, 0, Math.PI * 2); // Heel
      ctx.fill();

      // Ribbed texture lines at top cuff
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.6;
      for (let sx = -4.5; sx <= -0.5; sx += 1.2) {
        ctx.beginPath();
        ctx.moveTo(sx, -5.5);
        ctx.lineTo(sx, -4.5);
        ctx.stroke();
      }
      return true;
    }

    case 'socks_wool': {
      drawShadow(ctx, 7.5, 2.6, 7.5, 0.2);

      // Chunky hand-knitted woolen sock (heather oatmeal)
      ctx.fillStyle = '#e7e5e4';
      ctx.beginPath();
      ctx.moveTo(-5.5, -5.5);
      ctx.lineTo(1.5, -5.5);
      ctx.lineTo(2, 0);
      ctx.quadraticCurveTo(4.5, 2.5, 6.5, 5);
      ctx.lineTo(4.5, 7);
      ctx.quadraticCurveTo(0.5, 6, -1.5, 3.5);
      ctx.lineTo(-4.5, 0);
      ctx.closePath();
      ctx.fill();

      // Fair-Isle geometric snowflake pattern band (crimson & evergreen)
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-5.5, -3.8, 7, 1.2);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(-5.5, -2.2, 7, 1);

      // Snowflake dots
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4.5, -3.4, 0.8, 0.6);
      ctx.fillRect(-2, -3.4, 0.8, 0.6);
      ctx.fillRect(0.5, -3.4, 0.8, 0.6);

      // Reinforced darker wool heel and toe
      ctx.fillStyle = '#a8a29e';
      ctx.beginPath();
      ctx.arc(5.5, 6, 1.5, 0, Math.PI * 2);
      ctx.arc(-1.2, 3.2, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Chunky wool ribbing stitches
      ctx.strokeStyle = '#d6d3d1';
      ctx.lineWidth = 0.8;
      for (let wx = -4.5; wx <= 0.5; wx += 1.3) {
        ctx.beginPath();
        ctx.moveTo(wx, -5.5);
        ctx.lineTo(wx, -4);
        ctx.stroke();
      }
      return true;
    }

    // === HANDS ===
    case 'gloves_leather': {
      drawShadow(ctx, 7.5, 2.6, 7.5, 0.22);

      // Pair of tailored espresso-brown driving leather gloves
      ctx.fillStyle = '#292524';
      ctx.beginPath();
      // Palm with 4 fingers and thumb
      ctx.roundRect(-6.5, -3.5, 6, 8, 2);
      ctx.roundRect(1, -3.5, 6, 8, 2);
      ctx.fill();

      // Articulated individual finger tips
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      // Left glove fingers
      ctx.arc(-5.2, -4.5, 1, Math.PI, 0);
      ctx.arc(-3.5, -5.2, 1.1, Math.PI, 0);
      ctx.arc(-1.8, -4.5, 1, Math.PI, 0);
      // Right glove fingers
      ctx.arc(2.2, -4.5, 1, Math.PI, 0);
      ctx.arc(4, -5.2, 1.1, Math.PI, 0);
      ctx.arc(5.8, -4.5, 1, Math.PI, 0);
      ctx.fill();

      // Three iconic raised pintuck stitching ridges on back of hand
      ctx.strokeStyle = '#44403c';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-5, -2); ctx.lineTo(-5, 2.5);
      ctx.moveTo(-3.5, -2.5); ctx.lineTo(-3.5, 2.5);
      ctx.moveTo(-2, -2); ctx.lineTo(-2, 2.5);
      ctx.moveTo(2.5, -2); ctx.lineTo(2.5, 2.5);
      ctx.moveTo(4, -2.5); ctx.lineTo(4, 2.5);
      ctx.moveTo(5.5, -2); ctx.lineTo(5.5, 2.5);
      ctx.stroke();

      // Elastic gathered wrist cuff with brass snap buckle
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(-6.5, 3.5, 6, 1.5);
      ctx.fillRect(1, 3.5, 6, 1.5);
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(-3.5, 4.2, 0.6, 0, Math.PI * 2);
      ctx.arc(4, 4.2, 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Soft leather specular sheen
      drawGlossBand(ctx, -5.5, -3, 1, 5, 0.25);
      drawGlossBand(ctx, 2, -3, 1, 5, 0.25);
      return true;
    }

    case 'gloves_winter': {
      drawShadow(ctx, 8, 2.8, 7.5, 0.22);

      // Insulated heavy thermal stormshell gloves (dark charcoal + orange accent)
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-7, -4.5, 6.5, 10, 2.5);
      ctx.roundRect(1, -4.5, 6.5, 10, 2.5);
      ctx.fill();

      // High-visibility neon orange accent geometric chevron
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-7, -1.5); ctx.lineTo(-3.5, -3.5); ctx.lineTo(0, -1.5); ctx.lineTo(-3.5, 0); ctx.closePath();
      ctx.moveTo(1, -1.5);   ctx.lineTo(4.5, -3.5);  ctx.lineTo(8, -1.5); ctx.lineTo(4.5, 0);  ctx.closePath();
      ctx.fill();

      // Grippy textured rubber palm and thumb patch
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-6, 0, 4.5, 4, 1);
      ctx.roundRect(2, 0, 4.5, 4, 1);
      ctx.fill();

      // Extended storm gauntlet snow-skirt cuffs
      ctx.fillStyle = '#334155';
      ctx.roundRect(-7.5, 3.5, 7.5, 2.5, 1);
      ctx.roundRect(0.5, 3.5, 7.5, 2.5, 1);
      ctx.fill();

      // Adjustable cinch nylon straps with micro buckles
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-7, 2.5, 6.5, 1);
      ctx.fillRect(1, 2.5, 6.5, 1);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-4.5, 2.2, 1.5, 1.6);
      ctx.fillRect(3.5, 2.2, 1.5, 1.6);
      return true;
    }

    default:
      return false;
  }
}
