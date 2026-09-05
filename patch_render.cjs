const fs = require('fs');
let code = fs.readFileSync('src/renderer.ts', 'utf8');

const regex = /private renderPlayerPedestrian\(player: Player\) \{[\s\S]*?ctx\.fill\(\);\n\n    ctx\.restore\(\); \/\/ end rotated part/;
const replacement = `private renderPlayerPedestrian(player: Player) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(player.x, player.y);

    // Ground Directional Indicator Ring
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.rotate(player.angle);

    // Directional facing dot on ground
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(12, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Dodge Roll Motion Trail
    if (player.isDashing) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath();
      ctx.arc(-8, 0, 7, 0, Math.PI * 2);
      ctx.arc(-16, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(1.5, 2, 5.2, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Determine colors based on equipped clothing
    let cSkin = player.skinColor;
    let cPants = player.pantsColor;
    let cShirt = player.shirtColor;
    let cHair = player.hairColor;
    let cShoes = '#111111';
    let cHat = null;
    let cBack = null;
    let cHands = cSkin;

    if (player.equippedClothing) {
      if (player.equippedClothing.legs?.outerwear) cPants = player.equippedClothing.legs.outerwear.clothingStats?.color || cPants;
      else if (player.equippedClothing.legs?.jacket) cPants = player.equippedClothing.legs.jacket.clothingStats?.color || cPants;
      else if (player.equippedClothing.legs?.shirt) cPants = player.equippedClothing.legs.shirt.clothingStats?.color || cPants;

      if (player.equippedClothing.torso?.outerwear) cShirt = player.equippedClothing.torso.outerwear.clothingStats?.color || cShirt;
      else if (player.equippedClothing.torso?.jacket) cShirt = player.equippedClothing.torso.jacket.clothingStats?.color || cShirt;
      else if (player.equippedClothing.torso?.shirt) cShirt = player.equippedClothing.torso.shirt.clothingStats?.color || cShirt;

      if (player.equippedClothing.feet?.outerwear) cShoes = player.equippedClothing.feet.outerwear.clothingStats?.color || cShoes;
      else if (player.equippedClothing.feet?.jacket) cShoes = player.equippedClothing.feet.jacket.clothingStats?.color || cShoes;

      if (player.equippedClothing.head?.outerwear) cHat = player.equippedClothing.head.outerwear.clothingStats?.color;
      
      if (player.equippedClothing.back?.outerwear) cBack = player.equippedClothing.back.outerwear.clothingStats?.color;

      if (player.equippedClothing.hands?.outerwear) cHands = player.equippedClothing.hands.outerwear.clothingStats?.color || cHands;
    }

    const legSwing = Math.sin(player.walkCycle) * 3.2;

    // Legs / Pants
    ctx.fillStyle = cPants;
    ctx.beginPath();
    ctx.arc(legSwing, -1.8, 2.2, 0, Math.PI * 2);
    ctx.arc(-legSwing, 1.8, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Shoes
    ctx.fillStyle = cShoes;
    ctx.fillRect(-1.5 + legSwing, -3.5, 3, 3.2);
    ctx.fillRect(-1.5 - legSwing, 0.5, 3, 3.2);

    // Torso
    ctx.fillStyle = cShirt;
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.5, 6.0, 0, 0, Math.PI * 2);
    ctx.fill();

    // Backpack
    if (cBack) {
      ctx.fillStyle = cBack;
      ctx.fillRect(-4.5, -3, 3.5, 6);
    }

    // Arms swinging with walk cycle
    const armSwing = Math.sin(player.walkCycle) * 2.8;
    ctx.fillStyle = cShirt;
    ctx.beginPath();
    ctx.arc(armSwing, -5.2, 1.8, 0, Math.PI * 2);
    ctx.arc(-armSwing, 5.2, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Hands
    ctx.fillStyle = cHands;
    ctx.beginPath();
    ctx.arc(armSwing + 1, -5.2, 1.2, 0, Math.PI * 2);
    ctx.arc(-armSwing + 1, 5.2, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = cSkin;
    ctx.beginPath();
    ctx.arc(1.8, 0, 3.4, 0, Math.PI * 2);
    ctx.fill();

    // Hair or Hat
    if (cHat) {
      ctx.fillStyle = cHat;
      ctx.beginPath();
      ctx.arc(1.5, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = cHair;
      ctx.beginPath();
      ctx.arc(0.6, 0, 3.2, Math.PI * 0.5, Math.PI * 1.5);
      ctx.fill();
    }

    ctx.restore(); // end rotated part`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/renderer.ts', code, 'utf8');
  console.log("Patched renderer");
} else {
  console.log("Renderer regex not found");
}
