# Project Guidance for AI Coding Agents

## 🎒 Hand vs Inventory Item Usage
When adding or modifying usable items in this codebase, you **must** implement their activation logic in both files/functions:
1. **From Inventory:** `useItemOnPlayer(player, itemIndex, world, ...)` in `src/items.ts`
2. **From Hands (Equipped):** `useHandItemOnPlayer(player, hand, world, ...)` in `src/items.ts` (triggered by pressing the **E** key while holding the item in the active hand)

> ⚠️ **CRITICAL:** If you only implement item usage in `useItemOnPlayer` and forget `useHandItemOnPlayer`, using the item from the player's hand (with **E**) will fallback to default consumption logic, which treats the item like generic food or drink, causing the item to disappear ("be eaten") without triggering its actual functional effect!

---

## ⏳ Sandbag and Empty Sack Mechanics
- **Sandbag (`sandbag`)**:
  - Drops 1 kg of silica sand when activated.
  - Generates sand mounds (`stain` with `type: 'sand'`) on the ground.
  - Instantly extinguishes nearby fire stains and vehicle engine/fuel fires.
  - Absorbs/dries out flammable or wet oil, fuel, and coolant spills on the ground in a ~75px radius.
  - Consuming a sandbag replaces it in the inventory/hand with an **Empty Sack** (`sack_empty`).
- **Empty Sack (`sack_empty`)**:
  - Standard non-usable storage/fabric item (`usable: false`). Light and durable burlap canvas.
