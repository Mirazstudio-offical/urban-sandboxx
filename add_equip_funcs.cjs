const fs = require('fs');
let code = fs.readFileSync('src/items.ts', 'utf8');

const funcs = `
export function equipClothing(player: Player, inventoryIndex: number) {
  const item = player.inventory[inventoryIndex];
  if (!item || !item.clothingStats) return { success: false, message: 'Это не одежда' };
  
  const stats = item.clothingStats;
  player.equippedClothing = player.equippedClothing || {};
  player.equippedClothing[stats.slot] = player.equippedClothing[stats.slot] || {};
  
  // If there is already something in this layer, we should probably swap it, 
  // but for now let's just unequip it and put it in inventory
  if (player.equippedClothing[stats.slot]![stats.layer]) {
    const existing = player.equippedClothing[stats.slot]![stats.layer]!;
    player.inventory[inventoryIndex] = existing;
  } else {
    // Remove from inventory
    player.inventory.splice(inventoryIndex, 1);
  }
  player.equippedClothing[stats.slot]![stats.layer] = item;
  return { success: true, message: 'Одежда надета' };
}

export function unequipClothing(player: Player, slot: import('./types').ClothingSlot, layer: import('./types').ClothingLayer) {
  if (!player.equippedClothing || !player.equippedClothing[slot] || !player.equippedClothing[slot]![layer]) return { success: false };
  
  const item = player.equippedClothing[slot]![layer]!;
  
  if (player.inventory.length >= player.maxInventorySlots) {
    return { success: false, message: 'Инвентарь полон' };
  }
  
  player.inventory.push(item);
  delete player.equippedClothing[slot]![layer];
  return { success: true, message: 'Одежда снята' };
}
`;

code = code + '\n' + funcs;
fs.writeFileSync('src/items.ts', code, 'utf8');
