const fs = require('fs');
let code = fs.readFileSync('src/components/InventoryModal.tsx', 'utf8');

// Add import
code = code.replace(
  'useItemOnPlayer, dropItemFromPlayer, addItemToPlayer, moveInventoryItem, ITEM_CATALOG, isPlayerNearTrashBin, disposeTrashInBin, pickupNearbyLitter } from \'../items\';',
  'useItemOnPlayer, dropItemFromPlayer, addItemToPlayer, moveInventoryItem, ITEM_CATALOG, isPlayerNearTrashBin, disposeTrashInBin, pickupNearbyLitter, equipClothing, unequipClothing } from \'../items\';'
);

// Add handlers
const handlers = `
  const handleEquipItem = (idx: number) => {
    if (!player) return;
    equipClothing(player, idx);
    forceRender(n => n + 1);
  };
  const handleUnequipItem = (slot: any, layer: any) => {
    if (!player) return;
    unequipClothing(player, slot, layer);
    forceRender(n => n + 1);
  };
`;
code = code.replace(
  '  const handleUseItem = (idx: number) => {',
  handlers + '\n  const handleUseItem = (idx: number) => {'
);

// Update equip button in details section
// Search for "Использовать" or something.
// We can just add an equip button if the selected item has clothingStats.
const useBtn = `                      {selectedEntry.item.clothingStats ? (
                        <button
                          id="btn-equip-selected-item"
                          onClick={() => handleEquipItem(selectedEntry.originalIndex)}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-bold rounded-xl border border-blue-400/40 shadow-lg flex items-center justify-center gap-2 text-sm transition"
                        >
                          <span>Надеть / Экипировать</span>
                        </button>
                      ) : selectedEntry.item.usable && (`;

code = code.replace(
  `                      {selectedEntry.item.usable && (`,
  useBtn
);

// Close the wrapper for usable
code = code.replace(
  `                      )}
                      <button
                        id="btn-drop-selected-item"`,
  `                      )}
                      <button
                        id="btn-drop-selected-item"`
); // Wait, this doesn't change anything, just making sure.

// Update the clothing tab to include Unequip button
const unequipBtn = `
                        <div className="flex-1">
                          <div className="text-sm font-medium">{item.nameRu}</div>
                          <div className="text-xs text-slate-400">Слой: {layer}</div>
                        </div>
                        <button onClick={() => handleUnequipItem(slot, layer)} className="px-3 py-1 bg-red-900/50 hover:bg-red-800 text-red-200 text-xs rounded transition">
                          Снять
                        </button>
`;
code = code.replace(
  `                        <div className="flex-1">
                          <div className="text-sm font-medium">{item.nameRu}</div>
                          <div className="text-xs text-slate-400">Слой: {layer}</div>
                        </div>`,
  unequipBtn
);

fs.writeFileSync('src/components/InventoryModal.tsx', code, 'utf8');
