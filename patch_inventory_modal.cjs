const fs = require('fs');
let content = fs.readFileSync('src/components/InventoryModal.tsx', 'utf8');

// Add clothing tab state
content = content.replace(
  `const [activeTab, setActiveTab] = useState<'inventory' | 'surroundings'>('inventory');`,
  `const [activeTab, setActiveTab] = useState<'inventory' | 'surroundings' | 'clothing'>('inventory');`
);

// Add clothing button
const clothingBtn = `
            <button
              id="tab-clothing-btn"
              onClick={() => setActiveTab('clothing')}
              className={\`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition \${
                activeTab === 'clothing' 
                  ? 'bg-sky-600 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }\`}
            >
              <span>👔 Одежда</span>
            </button>
`;
content = content.replace(
  `              <Sparkles className="w-3.5 h-3.5" />\n              <span>Вокруг вас ({nearbyGroundItems.length})</span>\n            </button>`,
  `              <Sparkles className="w-3.5 h-3.5" />\n              <span>Вокруг вас ({nearbyGroundItems.length})</span>\n            </button>` + clothingBtn
);

fs.writeFileSync('src/components/InventoryModal.tsx', content, 'utf8');
