// Procedural 2D Canvas Models for Leftovers and Trash Items
// Meticulously styled to match their parent packaging 1:1
import { drawShadow, drawGlossBand, drawMedicalCross } from './itemGraphicShared';

export function drawLeftoverItem(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  switch (itemId) {
    // Empty crushed red soda can (matches soda_can)
    case 'can_empty': {
      drawShadow(ctx, 7.5, 2.5, 7.5, 0.25);

      // Crushed, dented red aluminum body (angled/flattened)
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-6, -3);
      ctx.lineTo(6, -4.5);
      ctx.lineTo(5.5, 3.5);
      ctx.lineTo(1, 1.5); // dent indent
      ctx.lineTo(-2, 4.5);
      ctx.lineTo(-6.5, 2.5);
      ctx.closePath();
      ctx.fill();

      // White swooping wave distorted by the dent
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-5.5, 0);
      ctx.quadraticCurveTo(0, -2, 5, -1);
      ctx.stroke();

      // Metallic crumpled fold lines
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-1, -3.5); ctx.lineTo(1, 1.5);
      ctx.moveTo(1, 1.5); ctx.lineTo(4, 3);
      ctx.stroke();

      // Crushed silver top with popped-open pull tab
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(-5.5, -0.5, 2, 3.2, 0.2, 0, Math.PI * 2);
      ctx.fill();
      // Opened dark drinking aperture
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(-5.5, -0.5, 1, 1.8, 0.2, 0, Math.PI * 2);
      ctx.fill();
      // Popped pull-tab bent back
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-7.2, -2.5, 2, 1.5);
      return true;
    }

    // Crushed black cola zero can (matches cola_zero)
    case 'cola_zero_empty': {
      drawShadow(ctx, 7.5, 2.5, 7.5, 0.25);

      // Crushed matte black body
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.moveTo(-6, -3);
      ctx.lineTo(6, -4.5);
      ctx.lineTo(5.5, 3.5);
      ctx.lineTo(1, 1.5); // dent
      ctx.lineTo(-2, 4.5);
      ctx.lineTo(-6.5, 2.5);
      ctx.closePath();
      ctx.fill();

      // Distorted red ZERO band
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-2, -2); ctx.lineTo(3, -2.5); ctx.lineTo(2.5, 2); ctx.lineTo(-2.5, 2);
      ctx.closePath(); ctx.fill();

      // Silver crushed top
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(-5.5, -0.5, 2, 3.2, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(-5.5, -0.5, 1, 1.8, 0.2, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Crushed navy energy can (matches energy_drink)
    case 'energy_can_empty': {
      drawShadow(ctx, 7.5, 2.5, 7.5, 0.25);

      // Crushed navy blue body
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(-6, -3);
      ctx.lineTo(6, -4.5);
      ctx.lineTo(5.5, 3.5);
      ctx.lineTo(1, 1.5);
      ctx.lineTo(-2, 4.5);
      ctx.lineTo(-6.5, 2.5);
      ctx.closePath();
      ctx.fill();

      // Crinkled electric yellow lightning emblem
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(-1, -2); ctx.lineTo(1.5, 0); ctx.lineTo(0, 0); ctx.lineTo(1, 2.5);
      ctx.lineTo(-1.5, 0.5); ctx.lineTo(0, 0.5);
      ctx.closePath(); ctx.fill();

      // Crushed silver top
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(-5.5, -0.5, 2, 3.2, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(-5.5, -0.5, 1, 1.8, 0.2, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Opened tin can of stew (matches canned_meat)
    case 'tin_can_empty': {
      drawShadow(ctx, 7.5, 2.8, 7.5, 0.25);

      // Metallic steel tin body
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-6, -3.5, 12, 10);

      // Red & gold vintage label on outside
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(-6, -1.5, 12, 6);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-6, 0.5, 12, 1.5);

      // Open top rim & dark interior cavity
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(0, -3.5, 6, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(0, -3.5, 4.8, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Residual stew droplet inside
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.arc(1.5, -3.2, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Peeling curled-back tin lid with pull ring
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(-4, -3.5);
      ctx.quadraticCurveTo(-2, -9, 3, -7.5);
      ctx.quadraticCurveTo(0, -3.5, -4, -3.5);
      ctx.closePath();
      ctx.fill();

      // Pull ring on curled lid
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(2, -7.5, 1.2, 0.8, 0.4, 0, Math.PI * 2);
      ctx.stroke();
      return true;
    }

    // Crumpled clear PET water bottle (matches water_bottle)
    case 'bottle_empty': {
      drawShadow(ctx, 7.5, 2.5, 7.5, 0.2);

      // Squeezed / crinkled transparent plastic bottle body
      ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
      ctx.beginPath();
      ctx.moveTo(-7, -1);
      ctx.lineTo(-4, -2.5);
      ctx.lineTo(2, -2);
      ctx.lineTo(5, -1.2);
      ctx.lineTo(7, -0.5);
      ctx.lineTo(7, 2);
      ctx.lineTo(4, 2.5);
      ctx.lineTo(-1, 1.2); // dent indent
      ctx.lineTo(-5, 2.8);
      ctx.lineTo(-7, 1.5);
      ctx.closePath();
      ctx.fill();

      // The SAME white & blue brand label, now crumpled
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-3, -2.2); ctx.lineTo(1.5, -1.8); ctx.lineTo(1.2, 1.6); ctx.lineTo(-3, 1.8);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-3, -0.8, 4.4, 1.2);

      // Crinkle fold highlight lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-4, -1); ctx.lineTo(-1, 1.2);
      ctx.moveTo(0, -2); ctx.lineTo(3, 1);
      ctx.stroke();

      // Deep blue threaded cap on the neck
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(6.5, -0.8, 2.8, 2.2, 0.5);
      ctx.fill();

      // Residual water droplet
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(-5.5, 0.8, 0.7, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Empty stainless steel camp flask (matches camp_flask)
    case 'camp_flask_empty': {
      drawShadow(ctx, 7.5, 2.8, 7.5, 0.25);

      // Steel flask body
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(-6.5, -3.5, 13, 10.5, 2.5);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-4.5, -3.5, 3, 10.5);

      // Open threaded neck & dark opening hole
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-1.5, -5.5, 3, 2);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, -5.5, 1.2, 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Knurled metal cap unscrewed and dangling on hinge
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.roundRect(-5, -6.5, 3, 2, 0.5);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-1.5, -5); ctx.lineTo(-3.5, -5.5);
      ctx.stroke();
      return true;
    }

    // Crumpled white paper coffee cup (matches hot_coffee)
    case 'cup_disposable': {
      drawShadow(ctx, 7, 2.6, 7.5, 0.22);

      // Squashed paper cup body
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-5.5, -4);
      ctx.lineTo(5.5, -4);
      ctx.lineTo(3.2, 5.5);
      ctx.lineTo(-0.5, 3.8); // squashed dent
      ctx.lineTo(-4.2, 5.5);
      ctx.closePath();
      ctx.fill();

      // The SAME brown corrugated heat sleeve with coffee bean
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(-5, -1.5);
      ctx.lineTo(4.8, -1.5);
      ctx.lineTo(3.8, 2.8);
      ctx.lineTo(-0.2, 1.8);
      ctx.lineTo(-4, 2.8);
      ctx.closePath();
      ctx.fill();

      // Coffee bean logo
      ctx.fillStyle = '#3b1806';
      ctx.beginPath();
      ctx.ellipse(0, 0.5, 1.2, 1.6, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Crumpled black lid pushed askew
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.ellipse(0.5, -4.5, 5.8, 1.8, -0.15, 0, Math.PI * 2);
      ctx.fill();
      // Sip hole
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.ellipse(-2, -4.5, 0.8, 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dark brown coffee drop stain
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(2.5, 3.5, 0.8, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Empty red ceramic soup bowl (matches soup)
    case 'soup_bowl_empty': {
      drawShadow(ctx, 8.5, 3, 7.5, 0.22);

      // Ceramic red bowl body
      ctx.fillStyle = '#9f1239';
      ctx.beginPath();
      ctx.ellipse(0, 1.5, 8.5, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-8.5, -3, 17, 5);

      // Ceramic rim
      ctx.fillStyle = '#be123c';
      ctx.beginPath();
      ctx.ellipse(0, -3, 8.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Empty bowl cavity with oily broth sheen
      ctx.fillStyle = '#4c0519';
      ctx.beginPath();
      ctx.ellipse(0, -2.8, 7.5, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(234, 179, 8, 0.4)';
      ctx.beginPath();
      ctx.ellipse(-1, -2.8, 4, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tiny green herb specks left behind
      ctx.fillStyle = '#15803d';
      ctx.fillRect(-2, -3, 0.8, 0.8);
      ctx.fillRect(1.5, -2.5, 0.8, 0.8);

      // Stainless steel soup spoon resting in bowl
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(-6, -6);
      ctx.lineTo(2, -2.5);
      ctx.lineTo(3.5, -2);
      ctx.lineTo(-5.5, -6.5);
      ctx.closePath();
      ctx.fill();
      return true;
    }

    // Empty squashed fast food fries box (matches french_fries)
    case 'fries_box': {
      drawShadow(ctx, 7.5, 2.6, 7.5, 0.22);

      // Flattened / squashed red cardboard scoop
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-6.5, -3);
      ctx.lineTo(6.5, -3);
      ctx.lineTo(4.5, 6.5);
      ctx.lineTo(-4.5, 6.5);
      ctx.closePath();
      ctx.fill();

      // Empty white paperboard interior with grease stains
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.ellipse(0, -3, 5.5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Translucent yellow-brown grease spots
      ctx.fillStyle = 'rgba(180, 83, 9, 0.35)';
      ctx.beginPath();
      ctx.ellipse(-1.5, -2.8, 2, 0.8, 0, 0, Math.PI * 2);
      ctx.ellipse(2, -3.2, 1.5, 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Yellow double arch emblem on the red carton front
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(-1.5, 2, 1.5, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(1.5, 2, 1.5, Math.PI, 0);
      ctx.stroke();
      return true;
    }

    // Empty milkshake cup with pink residue (matches milkshake)
    case 'shake_cup': {
      drawShadow(ctx, 6.5, 2.5, 7.8, 0.2);

      // Clear cup body
      ctx.fillStyle = 'rgba(241, 245, 249, 0.4)';
      ctx.beginPath();
      ctx.moveTo(-5, -2);
      ctx.lineTo(5, -2);
      ctx.lineTo(3.6, 7.2);
      ctx.lineTo(-3.6, 7.2);
      ctx.closePath();
      ctx.fill();

      // Strawberry shake pink smears on inside walls
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.ellipse(0, 6, 2.5, 1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-3.5, 2, 1.2, 4);
      ctx.fillRect(2.2, 3, 1, 3);

      // Clear dome lid with straw hole
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, -2, 4.5, Math.PI, 0);
      ctx.stroke();

      // Pink & white striped straw bent sideways
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.lineTo(2, -2);
      ctx.lineTo(6.5, -6.5);
      ctx.stroke();
      return true;
    }

    // Empty cinema popcorn bucket (matches popcorn_caramel)
    case 'popcorn_bucket': {
      drawShadow(ctx, 7.2, 2.6, 7.5, 0.22);

      // Red bucket body
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-6.5, -2);
      ctx.lineTo(6.5, -2);
      ctx.lineTo(5, 7.5);
      ctx.lineTo(-5, 7.5);
      ctx.closePath();
      ctx.fill();

      // White vertical stripes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4, -2, 2, 9.5);
      ctx.fillRect(0, -2, 2, 9.5);
      ctx.fillRect(4, -2, 1.5, 9.5);

      // Yellow top rim
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.ellipse(0, -2, 6.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Empty deep interior
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(0, -2, 5.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2 unpopped golden kernels at bottom
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(-1.5, -2, 0.9, 0, Math.PI * 2);
      ctx.arc(1.8, -2.2, 1, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Empty Chinese takeout box (matches wok_box)
    case 'wok_box_empty': {
      drawShadow(ctx, 7.5, 2.8, 7.5, 0.22);

      // White takeout box with open folded flaps
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.moveTo(-6.5, -3);
      ctx.lineTo(6.5, -3);
      ctx.lineTo(4.8, 7.2);
      ctx.lineTo(-4.8, 7.2);
      ctx.closePath();
      ctx.fill();

      // Open top flaps folded outwards
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(-6.5, -3); ctx.lineTo(-8.5, -6); ctx.lineTo(-3, -3); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(6.5, -3); ctx.lineTo(8.5, -6); ctx.lineTo(3, -3); ctx.closePath(); ctx.fill();

      // Dark teriyaki sauce streaks inside
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, -2.5, 4.5, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // The SAME red pagoda logo on the front
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-2, 1, 4, 3);
      ctx.beginPath();
      ctx.moveTo(-3, 1); ctx.lineTo(3, 1); ctx.lineTo(0, -1); ctx.closePath(); ctx.fill();

      // Bamboo chopsticks laid across top
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-7, -4); ctx.lineTo(7, -2);
      ctx.moveTo(-6, -2); ctx.lineTo(8, -4);
      ctx.stroke();
      return true;
    }

    // Empty bento sushi tray (matches sushi_set)
    case 'sushi_tray_empty': {
      drawShadow(ctx, 9.2, 3.2, 7.8, 0.25);

      // Black lacquer tray
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-9.2, -5.5, 18.4, 12, 2);
      ctx.fill();
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Green serrated plastic grass divider (baran)
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.moveTo(-6, -1);
      ctx.lineTo(-5, -4); ctx.lineTo(-4, -1);
      ctx.lineTo(-3, -4); ctx.lineTo(-2, -1);
      ctx.lineTo(-1, -4); ctx.lineTo(0, -1);
      ctx.closePath();
      ctx.fill();

      // Dark soy sauce puddle in corner well
      ctx.fillStyle = '#0c0a09';
      ctx.beginPath();
      ctx.roundRect(-8, 2.5, 4, 2.5, 1);
      ctx.fill();

      // Wasabi residue spot
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.arc(6, -3, 1, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Empty nachos boat (matches nachos)
    case 'nachos_tray_empty': {
      drawShadow(ctx, 8.5, 3.2, 7.5, 0.22);

      // Kraft cardboard boat
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.ellipse(0, 2.5, 8.8, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(0, 1.8, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Empty black round cheese dip cup with residue
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 1, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(0, 1, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // 2 tortilla crumbs
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-4, 2, 1.2, 1.2);
      ctx.fillRect(4, 2.5, 1.4, 1.2);
      return true;
    }

    // Opened military MRE pouch (matches military_ration)
    case 'ration_box': {
      drawShadow(ctx, 8.5, 3, 7.5, 0.25);

      // Olive drab MRE pouch flattened
      ctx.fillStyle = '#365314';
      ctx.beginPath();
      ctx.roundRect(-8.5, -5, 17, 12, 1.5);
      ctx.fill();

      // Jaggedly torn top opening showing silver metallic interior foil
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(-8.5, -5);
      ctx.lineTo(-5, -6.5);
      ctx.lineTo(-2, -5);
      ctx.lineTo(2, -7);
      ctx.lineTo(5, -5);
      ctx.lineTo(8.5, -6);
      ctx.lineTo(8.5, -4);
      ctx.lineTo(-8.5, -4);
      ctx.closePath();
      ctx.fill();

      // Stenciled army text bar
      ctx.fillStyle = '#14532d';
      ctx.fillRect(-6, -1, 12, 2);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-4, 2, 8, 1.2);
      return true;
    }

    // Realistic apple core (matches apple)
    case 'apple_core': {
      drawShadow(ctx, 5.5, 2.2, 7.5, 0.2);

      // Pale chewed flesh contour
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(-3, -3.5);
      ctx.lineTo(3, -3.5);
      ctx.quadraticCurveTo(1, 0, 3, 4.5);
      ctx.lineTo(-3, 4.5);
      ctx.quadraticCurveTo(-1, 0, -3, -3.5);
      ctx.closePath();
      ctx.fill();

      // Red apple skin caps at top and bottom
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.ellipse(0, -3.8, 3.2, 1.2, 0, 0, Math.PI * 2);
      ctx.ellipse(0, 4.5, 3.2, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Woody curved stem & leaf fragment
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -3.8);
      ctx.quadraticCurveTo(1.5, -6, 0.5, -8.5);
      ctx.stroke();

      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.ellipse(2, -6.5, 1.8, 0.9, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Brown oxidized seed chamber with 2 dark pips
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(0, 0.5, 1.5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.ellipse(-0.4, 0, 0.5, 0.8, -0.2, 0, Math.PI * 2);
      ctx.ellipse(0.4, 1, 0.5, 0.8, 0.2, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Crumpled wax burger wrapper (matches burger)
    case 'burger_wrapper': {
      drawShadow(ctx, 8, 3, 7.5, 0.2);

      // Crumpled wax paper
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-7.5, 1);
      ctx.lineTo(-5.5, -4.5);
      ctx.lineTo(2, -5);
      ctx.lineTo(7.5, -2);
      ctx.lineTo(6, 4.5);
      ctx.lineTo(-2, 5.5);
      ctx.closePath();
      ctx.fill();

      // Red & white checkerboard wrapper print
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-4, -3, 2, 2);
      ctx.fillRect(0, -3, 2, 2);
      ctx.fillRect(-2, -1, 2, 2);
      ctx.fillRect(2, -1, 2, 2);
      ctx.fillRect(-4, 1, 2, 2);
      ctx.fillRect(0, 1, 2, 2);

      // Translucent melted yellow cheddar cheese smudge
      ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
      ctx.beginPath();
      ctx.ellipse(0, 0.5, 2.8, 1.8, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Scattered sesame seeds
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-1.5, -0.5, 0.8, 1.4);
      ctx.fillRect(1.5, 1, 0.8, 1.4);
      return true;
    }

    // Hot dog paper wrapper (matches hot_dog)
    case 'hot_dog_wrapper': {
      drawShadow(ctx, 8.5, 3, 7.5, 0.2);

      // Elongated crumpled paper boat
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.roundRect(-8, -2.5, 16, 6, 2);
      ctx.fill();

      // Yellow mustard smear
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-6, -0.5); ctx.lineTo(-2, 1); ctx.lineTo(2, -0.5); ctx.lineTo(5, 0.5);
      ctx.stroke();

      // Ketchup drop & fried onion crumb
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(3.5, 1, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-4, 0.5, 1, 1);
      ctx.fillRect(0, -1, 1, 1);
      return true;
    }

    // Paper pizza plate with crumbs (matches pizza_slice)
    case 'pizza_plate': {
      drawShadow(ctx, 8.5, 3.2, 7.5, 0.2);

      // Round white paper plate with fluted rim
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, 0, 8.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Fluted plate rim creases
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.6;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 6.5, Math.sin(a) * 6.5);
        ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
        ctx.stroke();
      }

      // Greasy triangular shadow where pizza slice rested
      ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
      ctx.beginPath();
      ctx.moveTo(-5, -4);
      ctx.lineTo(5, -4);
      ctx.lineTo(0, 5);
      ctx.closePath();
      ctx.fill();

      // Drop of red tomato sauce & golden crust crumbs
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(-1, -2, 0.9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#b45309';
      ctx.fillRect(1.5, 1, 1, 1);
      ctx.fillRect(-2, 2.5, 1.2, 1.2);
      ctx.fillRect(2, -3, 1, 1);
      return true;
    }

    // Crinkled cellophane sandwich bag (matches sandwich, croissant, bread_loaf)
    case 'sandwich_bag': {
      drawShadow(ctx, 8, 3, 7.5, 0.2);

      // Transparent crinkled cellophane pouch
      ctx.fillStyle = 'rgba(241, 245, 249, 0.45)';
      ctx.beginPath();
      ctx.roundRect(-7.5, -5.5, 15, 11, 2);
      ctx.fill();

      // Crinkle reflection lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-5, -4); ctx.lineTo(-2, 3);
      ctx.moveTo(1, -5); ctx.lineTo(4, 2);
      ctx.stroke();

      // Printed white bakery seal sticker
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -5.5, 4, 2.5);

      // Toasted bread & pastry crumbs inside
      ctx.fillStyle = '#b45309';
      const crumbs = [[-4, 1], [-1, 2], [3, 0], [1.5, 2.5], [-2.5, -1]];
      crumbs.forEach(([cx, cy]) => ctx.fillRect(cx, cy, 1, 1));
      return true;
    }

    // Torn chocolate silver foil (matches chocolate)
    case 'chocolate_wrapper': {
      drawShadow(ctx, 7.5, 2.8, 7.5, 0.22);

      // Crumpled shiny silver foil
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(-6, -4);
      ctx.lineTo(6.5, -5.5);
      ctx.lineTo(5, 5);
      ctx.lineTo(-5.5, 4);
      ctx.closePath();
      ctx.fill();

      // Deep red wrapper sleeve bunched down at bottom
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.roundRect(-6.5, 0, 13, 5, 1);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-5, 1.5, 10, 1);

      // Silver crinkle lines
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-4, -3); ctx.lineTo(0, 1);
      ctx.moveTo(1, -4); ctx.lineTo(4, 0);
      ctx.stroke();

      // Melted cocoa smear on foil
      ctx.fillStyle = '#3b1806';
      ctx.beginPath();
      ctx.ellipse(-1, -2, 2, 1.2, 0.2, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Empty yellow chip bag (matches chips, cookie_pack)
    case 'chips_bag': {
      drawShadow(ctx, 7, 2.6, 7.5, 0.22);

      // Flattened yellow foil bag
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.roundRect(-6.5, -6, 13, 13, 2);
      ctx.fill();

      // Jaggedly torn top opening showing metallic silver interior foil
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(-6.5, -6);
      ctx.lineTo(-3.5, -8);
      ctx.lineTo(-1, -6);
      ctx.lineTo(2.5, -7.5);
      ctx.lineTo(6.5, -5.5);
      ctx.lineTo(6.5, -4.5);
      ctx.lineTo(-6.5, -4.5);
      ctx.closePath();
      ctx.fill();

      // Red brand banner on outside
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-6.5, -1, 13, 3);
      return true;
    }

    // Empty blister pack with popped foil (matches painkillers, antipyretic)
    case 'pill_pack': {
      drawShadow(ctx, 7.2, 2.8, 7.5, 0.22);

      // Silver foil card
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.roundRect(-6.5, -7, 13, 14, 1.5);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // 6 popped blister cavities with torn jagged foil flaps
      const cells = [
        [-3.2, -4], [3.2, -4],
        [-3.2, 0], [3.2, 0],
        [-3.2, 4], [3.2, 4]
      ];
      cells.forEach(([cx, cy], idx) => {
        // Dark hole where pill was pressed out
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Torn jagged silver foil flap pushed outwards
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        if (idx % 2 === 0) {
          ctx.moveTo(cx, cy); ctx.lineTo(cx + 2.4, cy - 1); ctx.lineTo(cx + 1.8, cy + 1.5);
        } else {
          ctx.moveTo(cx, cy); ctx.lineTo(cx - 2.4, cy - 1); ctx.lineTo(cx - 1.8, cy + 1.5);
        }
        ctx.closePath();
        ctx.fill();
      });
      return true;
    }

    // Empty amber pill bottle (matches vitamins)
    case 'pill_bottle_empty': {
      drawShadow(ctx, 6.8, 2.6, 7.8, 0.22);

      // Empty amber bottle
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.roundRect(-5.5, -3, 11, 10.5, 2);
      ctx.fill();

      // Clinical label
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-5.5, -1, 11, 5);
      ctx.fillStyle = '#0d9488';
      ctx.fillRect(-5.5, 0.5, 11, 2);

      // Open neck
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-2.5, -5, 5, 2);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, -5, 2, 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // White cap lying beside bottle
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(5.5, 3, 3, 4, 0.8);
      ctx.fill();
      return true;
    }

    // Empty antiseptic bottle (matches antiseptic)
    case 'antiseptic_empty': {
      drawShadow(ctx, 6.5, 2.5, 7.8, 0.22);

      // Clear empty green bottle
      ctx.fillStyle = 'rgba(5, 150, 105, 0.4)';
      ctx.beginPath();
      ctx.roundRect(-4.8, -3.5, 9.6, 11, 2);
      ctx.fill();

      // White label with red cross
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4.5, -0.5, 9, 5);
      drawMedicalCross(ctx, 0, 2, 3.5, '#dc2626');

      // Pump nozzle
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-2, -5.5, 4, 2);
      ctx.beginPath();
      ctx.roundRect(-2.8, -8.5, 5.6, 3.2, 0.8);
      ctx.fill();
      return true;
    }

    // Empty opened first aid box (matches medkit)
    case 'medkit_empty': {
      drawShadow(ctx, 9, 3.2, 7.8, 0.25);

      // Red case open
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-8.5, -5, 17, 12.5, 2);
      ctx.fill();

      // White empty compartments inside
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.roundRect(-7.5, -3.8, 15, 10, 1.5);
      ctx.fill();

      // Internal compartment divider grid
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, -3.8, 1, 10);
      ctx.fillRect(-7.5, 1.2, 15, 1);

      // Handle
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-3.5, -7.5, 7, 2.5, 1);
      ctx.fill();
      return true;
    }

    // Splayed yellow banana skin (matches banana)
    case 'banana_peel': {
      drawShadow(ctx, 8.5, 3, 7.5, 0.2);

      // 3 curled banana peels splayed out
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 0.8;

      // Left peel
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.quadraticCurveTo(-6, -4, -8, 2);
      ctx.quadraticCurveTo(-5, 0, 0, 0);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Right peel
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.quadraticCurveTo(6, -4, 8, 2);
      ctx.quadraticCurveTo(5, 0, 0, 0);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Center bottom peel
      ctx.beginPath();
      ctx.moveTo(-1.5, -2);
      ctx.quadraticCurveTo(-2.5, 4, 0, 6.5);
      ctx.quadraticCurveTo(2.5, 4, 1.5, -2);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Brown speckles & bruises
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(-4.5, -1, 0.8, 0, Math.PI * 2);
      ctx.arc(4.5, -1, 0.8, 0, Math.PI * 2);
      ctx.arc(0, 3, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Dark top stem
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-1.2, -4.8, 2.4, 2);
      return true;
    }

    // Flattened orange juice carton (matches fresh_juice)
    case 'juice_box': {
      drawShadow(ctx, 6.8, 2.5, 7.5, 0.22);

      // Flattened orange carton
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.roundRect(-6, -4, 12, 10, 1.5);
      ctx.fill();

      // Citrus graphic
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(0, 1, 2, 0, Math.PI * 2);
      ctx.fill();

      // Green bent straw protruding
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(1.5, -3.5);
      ctx.lineTo(3, -6.5);
      ctx.lineTo(5.5, -7.5);
      ctx.stroke();
      return true;
    }

    // Litter / Street trash cluster
    case 'trash':
    case 'litter_trash': {
      drawShadow(ctx, 8.5, 3.2, 7.8, 0.25);

      // Crumpled discarded newspaper page with text lines
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(-7.5, 2);
      ctx.lineTo(-4, -5);
      ctx.lineTo(3, -4);
      ctx.lineTo(7, 3);
      ctx.lineTo(-2, 5.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.6;
      for (let y = -2.5; y <= 2.5; y += 1.2) {
        ctx.beginPath();
        ctx.moveTo(-3, y); ctx.lineTo(3, y);
        ctx.stroke();
      }

      // Crushed soda can in pile
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-4.5, 0, 7, 4, 1);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(-4.5, 2, 1, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Plastic coffee cup lid
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.ellipse(3, 1, 3, 1.8, 0.3, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Depressurized, dented empty Panthenol aerosol canister
    case 'panthenol_empty': {
      drawShadow(ctx, 7, 2.5, 8, 0.22);

      // White aluminum canister body with dent indent
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.moveTo(-5.5, -8.5);
      ctx.lineTo(5.5, -8.5);
      ctx.lineTo(5.5, -2);
      ctx.lineTo(3.2, 0); // dent crease
      ctx.lineTo(5.5, 2);
      ctx.lineTo(5.5, 8);
      ctx.lineTo(-5.5, 8);
      ctx.closePath();
      ctx.fill();

      // Faded/dented Panthenol orange burn stripe
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(-5.5, -2, 8.8, 5);

      // Depressurized popped spray valve on top
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(0, -8.5, 4.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-1.5, -10, 3, 1.5);
      return true;
    }

    // Squeezed, rolled-up empty Spasatel balm tube
    case 'ointment_tube_empty': {
      drawShadow(ctx, 7.5, 2.5, 7.5, 0.22);

      // Flattened green tube body with rolled bottom tail
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.roundRect(-5.5, -6, 11, 10, 1.5);
      ctx.fill();

      // Yellow diagonal stripe distorted by squeezing
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.moveTo(-5.5, -2); ctx.lineTo(5.5, -5); ctx.lineTo(5.5, 0); ctx.lineTo(-5.5, 3);
      ctx.closePath(); ctx.fill();

      // Rolled-up crimped metallic tail coil
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.ellipse(-0.5, 4.5, 5.5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Open nozzle tip without cap
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-1.8, -8, 3.6, 2);

      // Uncrewed white cap lying next to tube
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(4, 2, 3.5, 3.5, 0.8);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.6;
      ctx.stroke();
      return true;
    }

    // Uncapped empty green glass Zelenka bottle
    case 'zelenka_bottle_empty': {
      drawShadow(ctx, 6.5, 2.5, 7.5, 0.22);

      // Dark emerald green glass bottle
      ctx.fillStyle = '#047857';
      ctx.beginPath();
      ctx.roundRect(-5, -4, 10, 11.5, 2);
      ctx.fill();

      // Residual green liquid stain at bottom
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.roundRect(-4.2, 4, 8.4, 2.5, 1);
      ctx.fill();

      // Paper label with green stain
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-4.5, -1, 9, 5.5);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(-3, 1, 3, 3); // green spill drop

      // Open glass bottle neck
      ctx.fillStyle = '#065f46';
      ctx.fillRect(-2.5, -6.5, 5, 2.8);
      ctx.fillStyle = '#022c22';
      ctx.beginPath();
      ctx.ellipse(0, -6.5, 2.2, 1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Unscrewed brown cork lying on the right
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(5, 3, 2, 1.2, 0.4, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Uncapped empty amber glass Iodine bottle
    case 'iodine_bottle_empty': {
      drawShadow(ctx, 6.5, 2.5, 7.5, 0.22);

      // Dark amber glass bottle
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(-5, -4, 10, 11.5, 2);
      ctx.fill();

      // Dried golden-brown iodine ring stain at bottom
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.roundRect(-4.2, 4.5, 8.4, 2, 1);
      ctx.fill();

      // Stained label
      ctx.fillStyle = '#ffedd5';
      ctx.fillRect(-4.5, -1, 9, 5.5);
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(2, 2, 1.8, 0, Math.PI * 2);
      ctx.fill(); // dried spill dot

      // Open neck
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-2.5, -6.5, 5, 2.8);
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, -6.5, 2.2, 1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Brown cap lying nearby
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.ellipse(5.2, 3.5, 2.2, 1.4, -0.3, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Squeezed empty Diclofenac gel tube
    case 'diclofenac_tube_empty': {
      drawShadow(ctx, 7.5, 2.5, 7.5, 0.22);

      // Squeezed and flattened white aluminum body
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.roundRect(-5.5, -6, 11, 10, 1.5);
      ctx.fill();

      // Blue band distorted
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-5.5, -3, 11, 4);

      // Rolled-up bottom end
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(-0.5, 4.5, 5.5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Open threaded nozzle tip
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-1.5, -8, 3, 2);

      // Unscrewed white cap lying on the side
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(4, 2, 3.5, 3.5, 0.8);
      ctx.fill();
      return true;
    }

    // Empty Hydrogen Peroxide plastic bottle
    case 'peroxide_bottle_empty': {
      drawShadow(ctx, 6.5, 2.5, 7.5, 0.22);

      // White plastic bottle body
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.roundRect(-5.5, -5, 11, 13.5, 2.5);
      ctx.fill();

      // Blue label
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-5.5, -2, 11, 6);

      // Open nozzle
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-2.5, -7, 5, 2);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, -7, 1.8, 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Popped white cap lying next to bottle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(5, 3, 2.2, 1.5, 0.4, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Empty Ammonia vial
    case 'ammonia_bottle_empty': {
      drawShadow(ctx, 5.8, 2.4, 7.5, 0.22);

      // Amber glass vial
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(-4.5, -4, 9, 10.5, 2);
      ctx.fill();

      // Open neck
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-2, -6, 4, 2);
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, -6, 1.8, 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // White cap lying beside
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(4.5, 2.5, 2, 1.2, -0.2, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Open split Star Balm tin compact lid & empty base container
    case 'star_tin_empty': {
      drawShadow(ctx, 8.5, 3, 7.5, 0.25);

      // Open gold metallic base container on left
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(-3.5, 0.5, 5.5, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Yellow menthol wax residue inside base
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(-3.5, 0.5, 4.2, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Separated crimson red lid lying on right
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.ellipse(3.8, -1, 5.2, 4.8, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Gold star on separated lid
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      const outerR = 2.8;
      const innerR = 1.2;
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const sx = 3.8 + Math.cos(angle) * r;
        const sy = -1 + Math.sin(angle) * r * 0.92;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
      return true;
    }

    // Empty Valerian dropper bottle with removed pipette dropper
    case 'valerian_bottle_empty': {
      drawShadow(ctx, 7, 2.6, 7.5, 0.22);

      // Dark amber glass bottle
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(-5, -3, 10, 11, 2);
      ctx.fill();

      // Stained label
      ctx.fillStyle = '#f0fdf4';
      ctx.fillRect(-4.5, 0, 9, 5);

      // Open bottle neck
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, -3, 2, 1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glass dropper pipette with black rubber bulb lying beside bottle
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.ellipse(5, -2, 2, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(5, -2); ctx.lineTo(7.5, 4);
      ctx.stroke();
      return true;
    }

    default:
      return false;
  }
}
