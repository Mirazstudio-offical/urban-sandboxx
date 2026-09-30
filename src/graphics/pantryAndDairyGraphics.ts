// Procedural 2D Canvas Models for Pantry, Spices, Grains, Dairy & Eggs
import { drawShadow, drawGlossBand } from './itemGraphicShared';

export function drawPantryAndDairyItem(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  switch (itemId) {
    // === SALT & PEPPER ===
    case 'salt_shaker': {
      drawShadow(ctx, 5.5, 2.2, 7.8, 0.2);

      // Glass shaker cylinder with white salt crystals
      ctx.fillStyle = 'rgba(241, 245, 249, 0.8)';
      ctx.beginPath();
      ctx.roundRect(-3.5, -3, 7, 9.5, 1.5);
      ctx.fill();

      // Salt level
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, -1, 6, 7);

      drawGlossBand(ctx, -2.8, -2.5, 0.8, 8, 0.4);

      // Perforated stainless steel cap with holes
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(-3.8, -6, 7.6, 3, 0.8);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      for (const x of [-1.8, 0, 1.8]) {
        ctx.beginPath();
        ctx.arc(x, -4.5, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'salt':
    case 'salt_pack':
    case 'salt_bag_coarse': {
      drawShadow(ctx, 7.5, 3.2, 8, 0.24);

      // Burlap salt sack with blue "NaCl" label
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(-6.5, -5, 13, 11, 2);
      ctx.fill();

      ctx.fillStyle = '#2563eb';
      ctx.fillRect(-4.5, -0.5, 9, 3.5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3.5, 0.8, 7, 1);
      return true;
    }

    case 'salt_sea_premium': {
      drawShadow(ctx, 6.5, 2.6, 7.8, 0.22);

      // Glass jar with wooden lid and coarse sea salt flakes
      ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
      ctx.beginPath();
      ctx.roundRect(-4.5, -3.5, 9, 10.5, 1.8);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3.8, -1.5, 7.6, 7.8);

      // Wooden lid
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.roundRect(-5, -6, 10, 2.8, 0.8);
      ctx.fill();
      return true;
    }

    case 'black_pepper_grinder': {
      drawShadow(ctx, 5.5, 2.2, 7.8, 0.24);

      // Glass and dark wood peppercorn mill
      ctx.fillStyle = 'rgba(241, 245, 249, 0.8)';
      ctx.beginPath();
      ctx.roundRect(-3.5, -2, 7, 8.5, 1.5);
      ctx.fill();

      // Black peppercorns visible inside
      ctx.fillStyle = '#18181b';
      for (const pt of [[-1.5, 0], [1.2, 1], [-1, 3], [1.5, 4], [0, 2]]) {
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      // Wooden grinding head on top
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.roundRect(-3.8, -6.5, 7.6, 4.5, 1.2);
      ctx.fill();
      return true;
    }

    // Foil sachets (Black pepper, Chili, Paprika, Turmeric, Bay leaves, Cinnamon, Yeast, Cloves, Cardamom, Coriander, Allspice)
    case 'black_pepper_powder_sachet':
    case 'chili_powder_sachet':
    case 'paprika_sweet_sachet':
    case 'turmeric_powder_sachet':
    case 'bay_leaves_dried_sachet':
    case 'cinnamon_powder_sachet':
    case 'yeast_dry_sachet':
    case 'cloves_buds_dried':
    case 'cardamom_pods_dried':
    case 'coriander_seeds_sachet':
    case 'allspice_berries_sachet': {
      drawShadow(ctx, 6.5, 2.6, 7.8, 0.22);

      let sachetBg = '#dc2626'; // chili
      if (itemId === 'black_pepper_powder_sachet') sachetBg = '#1e293b';
      if (itemId === 'paprika_sweet_sachet') sachetBg = '#ea580c';
      if (itemId === 'turmeric_powder_sachet') sachetBg = '#eab308';
      if (itemId === 'bay_leaves_dried_sachet' || itemId === 'cardamom_pods_dried') sachetBg = '#15803d';
      if (itemId === 'cinnamon_powder_sachet' || itemId === 'cloves_buds_dried' || itemId === 'allspice_berries_sachet') sachetBg = '#78350f';
      if (itemId === 'coriander_seeds_sachet' || itemId === 'yeast_dry_sachet') sachetBg = '#ca8a04';

      // Glossy sealed spice pouch
      ctx.fillStyle = sachetBg;
      ctx.beginPath();
      ctx.roundRect(-4.8, -6, 9.6, 12, 1.2);
      ctx.fill();

      // Metallic crimped top and bottom seal borders
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-4.8, -6, 9.6, 1.2);
      ctx.fillRect(-4.8, 4.8, 9.6, 1.2);

      // Label window
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3.6, -2, 7.2, 4);
      return true;
    }

    // Fresh Herb Sprigs (Rosemary, Thyme, Basil, Dill, Parsley, Cilantro, Mint)
    case 'rosemary_sprigs_fresh':
    case 'thyme_sprigs_fresh':
    case 'basil_leaves_fresh':
    case 'dill_bunch_fresh':
    case 'parsley_bunch_fresh':
    case 'cilantro_bunch_fresh':
    case 'mint_leaves_fresh': {
      drawShadow(ctx, 7, 2.5, 7.8, 0.2);

      // Tied green herbs bunch
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-5, 4); ctx.lineTo(4, -4);
      ctx.moveTo(-4, 5); ctx.lineTo(5, -3);
      ctx.stroke();

      // Herb leaves
      ctx.fillStyle = '#22c55e';
      for (const pt of [[-2, 1], [0, -1], [2, -3], [-1, 2], [1, 0], [3, -2]]) {
        ctx.beginPath();
        ctx.ellipse(pt[0], pt[1], 1.8, 0.9, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Twine tie at base
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-4.5, 3); ctx.lineTo(-2.5, 5);
      ctx.stroke();
      return true;
    }

    case 'cinnamon_sticks_whole': {
      drawShadow(ctx, 7, 2.5, 7.8, 0.22);

      // Bundle of rolled cinnamon bark quills
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(-6, -2.5, 12, 5, 2);
      ctx.fill();

      // Raffia tie
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -2.5); ctx.lineTo(0, 2.5);
      ctx.stroke();
      return true;
    }

    case 'nutmeg_whole_seeds': {
      drawShadow(ctx, 6, 2.5, 7.8, 0.22);

      // Oval brown nutmeg seed
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 3.8, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Grooves
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-3, -1); ctx.lineTo(3, 1);
      ctx.stroke();
      return true;
    }

    case 'ginger_root_fresh': {
      drawShadow(ctx, 7.5, 2.8, 7.8, 0.24);

      // Knobby branched fresh ginger root
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(-6.5, -2, 13, 4.5, 2.2);
      ctx.fill();

      // Knobby side shoots
      ctx.beginPath();
      ctx.roundRect(-3, -5, 3.5, 4, 1.5);
      ctx.roundRect(1, 1.5, 3.5, 4, 1.5);
      ctx.fill();
      return true;
    }

    case 'vanilla_pod_fresh': {
      drawShadow(ctx, 7, 2.2, 7.8, 0.2);

      // Slender dark vanilla bean pod
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-7, 2); ctx.quadraticCurveTo(0, -3, 7, -1);
      ctx.stroke();
      return true;
    }

    // === FATS & BROTHS ===
    case 'lard_pork_pot':
    case 'fat_beef_pot':
    case 'ghee_butter_pot': {
      drawShadow(ctx, 7.5, 3.2, 8, 0.26);

      // Clay earthenware pot
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.roundRect(-5.5, -3.5, 11, 10, 2);
      ctx.fill();

      // Top fat layer (Lard: white, Beef: pale ivory, Ghee: golden)
      let fatColor = '#f8fafc';
      if (itemId === 'fat_beef_pot') fatColor = '#fef3c7';
      if (itemId === 'ghee_butter_pot') fatColor = '#facc15';

      ctx.fillStyle = fatColor;
      ctx.beginPath();
      ctx.ellipse(0, -3.5, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'broth_beef_jar':
    case 'broth_chicken_jar':
    case 'broth_fish_jar':
    case 'broth_vegetable_jar': {
      drawShadow(ctx, 6.5, 2.6, 7.8, 0.24);

      // Glass preserve jar
      ctx.fillStyle = 'rgba(241, 245, 249, 0.8)';
      ctx.beginPath();
      ctx.roundRect(-4.5, -3.5, 9, 10.5, 1.8);
      ctx.fill();

      // Broth colors: Beef dark brown, Chicken golden, Fish clear, Veg amber
      let brothColor = '#d97706';
      if (itemId === 'broth_beef_jar') brothColor = '#78350f';
      if (itemId === 'broth_chicken_jar') brothColor = '#eab308';
      if (itemId === 'broth_fish_jar') brothColor = '#fef08a';

      ctx.fillStyle = brothColor;
      ctx.fillRect(-3.8, -1.5, 7.6, 7.8);

      // Gold lid
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.roundRect(-5, -6, 10, 2.8, 0.8);
      ctx.fill();
      return true;
    }

    case 'maple_syrup':
    case 'maple_syrup_bottle': {
      drawShadow(ctx, 6.5, 2.6, 7.8, 0.24);

      // Maple leaf jug with side handle
      ctx.fillStyle = 'rgba(217, 119, 6, 0.85)';
      ctx.beginPath();
      ctx.roundRect(-4.5, -3.5, 9, 11, 2);
      ctx.fill();

      // Handle on left
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.85)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(-4.5, 0, 2.5, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();

      // Amber syrup
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-3.8, -1, 7.6, 7.5);

      // Gold cap
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.roundRect(-2.2, -7.5, 4.4, 2.5, 0.6);
      ctx.fill();
      return true;
    }

    case 'honey':
    case 'jar_honey':
    case 'honey_wild':
    case 'honey_buckwheat':
    case 'honey_wild_jar': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.25);

      // Hexagonal honey jar with golden wild honey
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(-4.5, -3, 9, 10, 2);
      ctx.fill();

      // Honeycomb emblem
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-2.5, 0, 5, 4);

      // Wooden honey dipper lid
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(-5, -5.5, 10, 2.8, 0.8);
      ctx.fill();
      return true;
    }

    case 'mustard_dijon':
    case 'mustard_dijon_jar': {
      drawShadow(ctx, 6.5, 2.6, 7.8, 0.24);

      // French stoneware jar with Dijon mustard
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.roundRect(-4.5, -3.5, 9, 10.5, 1.8);
      ctx.fill();

      // Black mustard seeds specks
      ctx.fillStyle = '#18181b';
      for (const pt of [[-2, 0], [1, 1], [-1, 3], [2, 4]]) {
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Stone crock lid
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(-5, -6, 10, 2.8, 0.8);
      ctx.fill();
      return true;
    }

    // === FLOURS & GRAIN SACKS ===
    case 'flour':
    case 'flour_bag':
    case 'flour_wheat_bag_1k':
    case 'flour_rye_bag_1k':
    case 'flour_corn_bag_500g':
    case 'flour_rice_bag_500g':
    case 'grain_wheat_raw_bag':
    case 'grain_rye_raw_bag':
    case 'grain_oats_bag':
    case 'rice_basmati_bag':
    case 'rice_arborio_bag':
    case 'buckwheat_roasted_bag':
    case 'barley_pearl_bag':
    case 'millet_yellow_bag':
    case 'semolina_wheat_bag':
    case 'peas_split_yellow':
    case 'beans_red_kidney':
    case 'beans_white_lima':
    case 'lentils_red_dry':
    case 'lentils_green_dry':
    case 'chickpeas_garbanzo_dry': {
      drawShadow(ctx, 7.5, 3.2, 8, 0.24);

      // Package body (Paper / Burlap / Plastic)
      let bagBg = '#ffffff';
      if (itemId.includes('rye') || itemId.includes('buckwheat')) bagBg = '#d97706';
      if (itemId.includes('corn') || itemId.includes('millet') || itemId.includes('peas')) bagBg = '#fef08a';
      if (itemId.includes('grain_')) bagBg = '#b45309';

      ctx.fillStyle = bagBg;
      ctx.beginPath();
      ctx.roundRect(-6.5, -5.5, 13, 12, 1.5);
      ctx.fill();

      // Folded top seal
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(-6.5, -5.5, 13, 1.5);

      // Center grain / product icon
      let iconColor = '#2563eb';
      if (itemId.includes('red') || itemId.includes('kidney')) iconColor = '#dc2626';
      if (itemId.includes('green') || itemId.includes('lentils_green')) iconColor = '#16a34a';

      ctx.fillStyle = iconColor;
      ctx.beginPath();
      ctx.arc(0, 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'sugar':
    case 'sugar_bag': {
      drawShadow(ctx, 7.5, 3.2, 8, 0.24);

      // Authentic 1kg Paper Bag of Granulated Sugar ("Сахар-песок 1 кг")
      // Crisp matte white paper packaging
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-6.5, -5.5, 13, 12, 1.5);
      ctx.fill();

      // Cyan / Blue geometric header & footer bands
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-6.5, -5.5, 13, 2.2);
      ctx.fillRect(-6.5, 4.5, 13, 2.0);

      // Folded top seal crimp
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(-6.5, -5.5, 13, 0.7);

      // Center graphic: glistening sugar crystals emblem
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(0, -0.5, 3.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Sugar crystal facets
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(0, -2.5); ctx.lineTo(1.8, -0.5); ctx.lineTo(0, 1.5); ctx.lineTo(-1.8, -0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -2.2); ctx.lineTo(1.2, -0.5); ctx.lineTo(0, 1.2); ctx.lineTo(-1.2, -0.5);
      ctx.closePath();
      ctx.fill();

      // "САХАР 1кг" banner text
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 2px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('САХАР', 0, 3.5);
      return true;
    }

    case 'jar_pickles':
    case 'pickles': {
      drawShadow(ctx, 7.0, 2.8, 7.8, 0.25);

      // Home-Style Pickled Gherkins in 720ml Glass Preservation Jar
      // Translucent pale herb-infused brine
      ctx.fillStyle = 'rgba(163, 230, 53, 0.35)';
      ctx.beginPath();
      ctx.roundRect(-5.0, -3.5, 10, 11, 2.0);
      ctx.fill();

      // Glass jar walls outline & gloss
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Crisp pickled gherkins (cucumbers) with bumpy skin
      // Cucumber 1 (left tilted)
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.roundRect(-4.0, -1.5, 2.8, 7.5, 1.4);
      ctx.fill();
      // Cucumber 2 (center upright)
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.roundRect(-1.5, -2.2, 3.0, 8.2, 1.5);
      ctx.fill();
      // Cucumber 3 (right tilted)
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.roundRect(1.2, -1.0, 2.8, 7.0, 1.4);
      ctx.fill();

      // Tiny pimple dots / warts on gherkins
      ctx.fillStyle = '#22c55e';
      const warts = [[-3.0, 0], [-2.5, 2.5], [-3.2, 4.5], [0, 0.5], [-0.5, 3.0], [0.2, 5.0], [2.2, 1.5], [2.6, 3.5]];
      warts.forEach(([wx, wy]) => {
        ctx.fillRect(wx, wy, 0.7, 0.7);
      });

      // Yellow dill flower umbrella & black peppercorns
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(2.0, -1.8, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-2.0, 5.0, 0.7, 0, Math.PI * 2);
      ctx.arc(2.5, 4.5, 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Specular glass reflection
      drawGlossBand(ctx, -4.0, -3.5, 1.2, 10.5, 0.45);

      // Gold-lacquered screw-on twist-off lid with checkered pattern
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.roundRect(-5.4, -6.2, 10.8, 3.0, 0.8);
      ctx.fill();
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-5.4, -4.5, 10.8, 0.6); // Lid rim
      return true;
    }

    case 'jam_raspberry': {
      drawShadow(ctx, 6.8, 2.6, 7.8, 0.24);

      // Wild Raspberry Preserve in Faceted Glass Hex Jar
      // Glowing ruby-red raspberry jam with texture
      ctx.fillStyle = '#9f1239';
      ctx.beginPath();
      ctx.roundRect(-4.8, -3.2, 9.6, 10.5, 1.8);
      ctx.fill();

      // Rich inner berry mass
      ctx.fillStyle = '#be123c';
      ctx.beginPath();
      ctx.roundRect(-4.2, -1.5, 8.4, 8.2, 1.2);
      ctx.fill();

      // Tiny yellow raspberry seed specks
      ctx.fillStyle = '#fde047';
      const seeds = [[-2.5, 0], [1.2, 1], [-1.0, 2.5], [2.2, 3.5], [-2.0, 4.5], [0.8, 5.0]];
      seeds.forEach(([sx, sy]) => {
        ctx.fillRect(sx, sy, 0.6, 0.8);
      });

      // Rustic Kraft Paper dust cover tied over lid
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(-5.5, -6.5, 11, 3.8, 1.0);
      ctx.fill();

      // Crinkled paper skirt over jar neck
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(-5.5, -3.5);
      ctx.lineTo(-4.0, -1.8);
      ctx.lineTo(4.0, -1.8);
      ctx.lineTo(5.5, -3.5);
      ctx.closePath();
      ctx.fill();

      // Rustic jute twine tied around neck with bow
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-4.5, -3.2); ctx.lineTo(4.5, -3.2);
      ctx.stroke();
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(0, -3.2, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Handwritten-style kraft label on front
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.roundRect(-3.2, 0.5, 6.4, 4.0, 0.5);
      ctx.fill();
      ctx.fillStyle = '#9f1239';
      ctx.fillRect(-2.2, 2.0, 4.4, 1.0);

      drawGlossBand(ctx, -3.8, -3.0, 1.0, 9.5, 0.35);
      return true;
    }

    case 'jam':
    case 'jar_jam':
    case 'jam_strawberry':
    case 'jam_blueberry': {
      drawShadow(ctx, 6.8, 2.6, 7.8, 0.24);

      // Sweet Strawberry Jam in Glass Pot
      const isBlue = itemId.includes('blueberry');
      const jamColor = isBlue ? '#1e1b4b' : '#dc2626';
      const jamFill = isBlue ? '#312e81' : '#b91c1c';

      ctx.fillStyle = jamColor;
      ctx.beginPath();
      ctx.roundRect(-4.8, -3.2, 9.6, 10.5, 1.8);
      ctx.fill();

      ctx.fillStyle = jamFill;
      ctx.beginPath();
      ctx.roundRect(-4.2, -1.5, 8.4, 8.2, 1.2);
      ctx.fill();

      // Traditional Red-and-White (or Blue-and-White) Gingham Fabric Lid
      ctx.fillStyle = isBlue ? '#2563eb' : '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-5.4, -6.5, 10.8, 3.8, 1.2);
      ctx.fill();

      // Gingham checks
      ctx.fillStyle = '#ffffff';
      for (let gx = -5.0; gx <= 4.0; gx += 2.0) {
        ctx.fillRect(gx, -6.0, 1.0, 3.0);
      }

      // Tie cord
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-4.5, -3.2); ctx.lineTo(4.5, -3.2);
      ctx.stroke();

      // Oval artisan fruit sticker
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 2.2, 2.8, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isBlue ? '#1e3a8a' : '#b91c1c';
      ctx.beginPath();
      ctx.arc(0, 2.2, 1.0, 0, Math.PI * 2);
      ctx.fill();

      drawGlossBand(ctx, -3.8, -3.0, 1.0, 9.5, 0.35);
      return true;
    }

    case 'caviar_squash_jar':
    case 'caviar_squash': {
      drawShadow(ctx, 7.0, 2.8, 7.8, 0.25);

      // Traditional Squash Caviar in Glass Jar ("Икра кабачковая")
      // Velvety homogeneous terracotta-orange vegetable puree
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.roundRect(-4.8, -3.2, 9.6, 10.5, 1.8);
      ctx.fill();

      // Rich inner sheen
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.roundRect(-4.2, -1.5, 8.4, 8.2, 1.2);
      ctx.fill();

      // Label with fresh summer squash illustration
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.roundRect(-3.8, 0.5, 7.6, 4.5, 0.6);
      ctx.fill();

      // Squash emblem
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.ellipse(0, 2.5, 2.2, 1.1, -0.2, 0, Math.PI * 2);
      ctx.fill();

      drawGlossBand(ctx, -3.8, -3.0, 1.1, 9.5, 0.4);

      // Gold twist-off preservation lid
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(-5.2, -6.0, 10.4, 3.0, 0.8);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-5.2, -4.5, 10.4, 0.6);
      return true;
    }

    case 'caviar_eggplant_jar':
    case 'caviar_eggplant': {
      drawShadow(ctx, 7.0, 2.8, 7.8, 0.25);

      // Spicy Eggplant Caviar in Glass Jar ("Икра баклажанная")
      // Deep dark savory purple-brown roasted eggplant puree
      ctx.fillStyle = '#581c87';
      ctx.beginPath();
      ctx.roundRect(-4.8, -3.2, 9.6, 10.5, 1.8);
      ctx.fill();

      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.roundRect(-4.2, -1.5, 8.4, 8.2, 1.2);
      ctx.fill();

      // Herb and tomato specks
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-2, 1, 0.8, 0.8);
      ctx.fillRect(1.5, 3.5, 0.8, 0.8);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, 2, 0.8, 0.8);
      ctx.fillRect(-1.5, 4.5, 0.8, 0.8);

      // Rustic cream label
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.roundRect(-3.8, 0.5, 7.6, 4.5, 0.6);
      ctx.fill();

      // Eggplant emblem
      ctx.fillStyle = '#3b0764';
      ctx.beginPath();
      ctx.ellipse(0, 2.5, 2.0, 1.1, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#15803d';
      ctx.fillRect(-0.4, 1.4, 0.8, 0.6); // stem

      drawGlossBand(ctx, -3.8, -3.0, 1.1, 9.5, 0.4);

      // Gold twist-off lid
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(-5.2, -6.0, 10.4, 3.0, 0.8);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-5.2, -4.5, 10.4, 0.6);
      return true;
    }

    case 'caviar':
    case 'canned_caviar':
    case 'salmon_caviar':
    case 'pike_caviar':
    case 'cod_caviar': {
      drawShadow(ctx, 7.5, 2.6, 7.8, 0.25);

      // Classic Russian Salmon Caviar Green Tin ("Икра лососевая зернистая")
      // Flat cylindrical dark emerald-green tin can
      ctx.fillStyle = '#064e3b';
      ctx.beginPath();
      ctx.ellipse(0, 1.0, 7.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#047857';
      ctx.beginPath();
      ctx.roundRect(-7.5, -3.5, 15, 6.0, 3);
      ctx.fill();

      // Top crimped tin lid with gold rim
      ctx.fillStyle = '#065f46';
      ctx.beginPath();
      ctx.ellipse(0, -3.5, 7.2, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Center gold emblem
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.ellipse(0, -3.5, 3.5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(-2.0, -3.9, 4.0, 0.8);

      // Silver pull-ring
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(-4.2, -3.5, 1.1, 0, Math.PI * 2);
      ctx.stroke();

      drawGlossBand(ctx, -4.5, -4.5, 2.0, 6.0, 0.35);
      return true;
    }

    // === DAIRY & EGGS ===
    case 'cream_heavy_jar':
    case 'sour_cream_pot': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.24);

      // Dairy pot with thick white cream
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(-5, -3, 10, 9.5, 2);
      ctx.fill();

      // White smetana / cream dollop on top
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, -3, 4.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'cottage_cheese_pack': {
      drawShadow(ctx, 7.5, 3, 7.8, 0.24);

      // Brick pack of cottage cheese (Tvorog)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-6.5, -4, 13, 9, 1.2);
      ctx.fill();

      // Blue dairy ribbon banner
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-6.5, -1, 13, 3);
      return true;
    }

    case 'yogurt_natural_cup': {
      drawShadow(ctx, 6, 2.5, 7.8, 0.22);

      // White yogurt tub with foil lid
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-4, -4); ctx.lineTo(4, -4); ctx.lineTo(3.2, 5.5); ctx.lineTo(-3.2, 5.5);
      ctx.closePath();
      ctx.fill();

      // Silver peel-off foil lid
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(-4.5, -5.2, 9, 1.5, 0.5);
      ctx.fill();
      return true;
    }

    case 'butter_brick_salted': {
      drawShadow(ctx, 7.5, 3, 7.8, 0.24);

      // Rich golden butter brick wrapped in foil
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.roundRect(-6.5, -3.5, 13, 8, 1.5);
      ctx.fill();

      // Embossed dairy crest
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-4, -1.5, 8, 4);
      return true;
    }

    // Cheeses (Cheddar, Gouda, Parmesan, Mozzarella, Suluguni, Feta)
    case 'cheese_cheddar_block':
    case 'cheese_gouda_wheel':
    case 'cheese_parmesan_wedge':
    case 'cheese_mozzarella_ball':
    case 'cheese_suluguni_braid':
    case 'cheese_feta_block': {
      drawShadow(ctx, 7.5, 3, 7.8, 0.26);

      if (itemId === 'cheese_mozzarella_ball') {
        // Smooth white mozzarella ball
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0.5, 5.5, 0, Math.PI * 2);
        ctx.fill();
        return true;
      }

      if (itemId === 'cheese_suluguni_braid') {
        // Smoked golden-braided cheese
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-5, 4); ctx.lineTo(0, -4); ctx.lineTo(5, 4);
        ctx.stroke();
        return true;
      }

      if (itemId === 'cheese_gouda_wheel') {
        // Round wheel in red wax rind
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.ellipse(0, 0, 6.5, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Yellow cheese exposed
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(5, 2); ctx.lineTo(1, 4.5);
        ctx.closePath();
        ctx.fill();
        return true;
      }

      if (itemId === 'cheese_parmesan_wedge') {
        // Triangular hard cheese wedge
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(-6, -4); ctx.lineTo(6, 0); ctx.lineTo(-4, 5);
        ctx.closePath();
        ctx.fill();
        return true;
      }

      // Default cheese block (Cheddar / Feta)
      const cheeseColor = itemId === 'cheese_cheddar_block' ? '#f59e0b' : '#ffffff';
      ctx.fillStyle = cheeseColor;
      ctx.beginPath();
      ctx.roundRect(-6.5, -4, 13, 8.5, 1.2);
      ctx.fill();
      return true;
    }

    // Eggs
    case 'eggs_chicken_carton':
    case 'eggs_quail_pack': {
      drawShadow(ctx, 8, 3.2, 8, 0.26);

      // Cardboard egg carton
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(-7.5, -4.5, 15, 10, 1.5);
      ctx.fill();

      // Eggs peeking inside carton
      ctx.fillStyle = itemId === 'eggs_quail_pack' ? '#fef3c7' : '#fed7aa';
      for (const pt of [[-5, -2], [-1.8, -2], [1.8, -2], [5, -2], [-5, 1.5], [-1.8, 1.5], [1.8, 1.5], [5, 1.5]]) {
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'egg_chicken_single':
    case 'egg_quail_single':
    case 'egg_duck_single':
    case 'egg_goose_single': {
      drawShadow(ctx, 6, 2.5, 7.8, 0.22);

      let eggColor = '#fed7aa'; // chicken brown
      if (itemId === 'egg_duck_single') eggColor = '#e0f2fe'; // duck bluish
      if (itemId === 'egg_goose_single') eggColor = '#ffffff'; // goose white
      if (itemId === 'egg_quail_single') eggColor = '#fef3c7'; // quail

      // Egg contour
      ctx.fillStyle = eggColor;
      ctx.beginPath();
      ctx.ellipse(0, 0.5, 4.5, 5.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Quail spots
      if (itemId === 'egg_quail_single') {
        ctx.fillStyle = '#78350f';
        for (const pt of [[-1.5, -2], [1.2, -1], [-1, 2], [1.5, 3], [0, 0]]) {
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return true;
    }

    default:
      return false;
  }
}
