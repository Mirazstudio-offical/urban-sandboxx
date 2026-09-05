const fs = require('fs');
let content = fs.readFileSync('src/items.ts', 'utf8');

const backpackItem = `
  backpack: {
    itemId: 'backpack',
    name: 'Canvas Backpack',
    nameRu: 'Брезентовый рюкзак',
    category: 'clothing',
    maxStack: 1,
    icon: '🎒',
    description: 'Increases inventory space.',
    descriptionRu: 'Увеличивает вместимость инвентаря.',
    effects: {},
    weight: 0.5,
    usable: true,
  },
`;

content = content.replace('beanie_black: {', backpackItem + '  beanie_black: {');

const backpackStat = `
  backpack: { slot: 'back', layer: 'outerwear', insulation: 5, windResistance: 5, waterResistance: 5, breathability: 90, mobilityPenalty: 2, color: '#4a5568' },
`;
content = content.replace('beanie_black: { slot: \'head\'', backpackStat + '  beanie_black: { slot: \'head\'');

fs.writeFileSync('src/items.ts', content, 'utf8');

let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace(
  `feet: { outerwear: createItem('work_boots', 1) }`,
  `feet: { outerwear: createItem('work_boots', 1) },\n      back: { outerwear: createItem('backpack', 1) }`
);
fs.writeFileSync('src/App.tsx', appContent, 'utf8');
