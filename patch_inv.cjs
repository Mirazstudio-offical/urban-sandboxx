const fs = require('fs');
let code = fs.readFileSync('src/components/InventoryModal.tsx', 'utf8');

// Replace {activeTab === 'inventory' ? (
code = code.replace(
  "{activeTab === 'inventory' ? (",
  "{activeTab === 'inventory' && ("
);

// We need to replace the `) : (` that switches to surroundings.
// It's just before `<div className="lg:col-span-12 flex flex-col gap-4">`
code = code.replace(
  ") : (\n            <div className=\"lg:col-span-12 flex flex-col gap-4\">",
  ")}\n          {activeTab === 'surroundings' && (\n            <div className=\"lg:col-span-12 flex flex-col gap-4\">"
);

// We need to append the clothing tab at the end of the grid, which is before:
// `        </div>\n      </div>\n    </div>`
const clothingJSX = `
          {activeTab === 'clothing' && (
            <div className="lg:col-span-12 flex flex-col gap-4 text-white">
              <h3 className="text-lg font-semibold text-sky-400">Надетая одежда</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(player.equippedClothing || {}).map(([slot, layers]) => (
                  <div key={slot} className="bg-slate-900 border border-slate-700 p-4 rounded-xl">
                    <div className="text-sm font-bold text-slate-400 uppercase mb-2">{slot}</div>
                    {Object.entries(layers).map(([layer, item]) => (
                      <div key={layer} className="flex items-center gap-2 mb-2 p-2 bg-slate-800 rounded">
                        <span className="text-2xl">{item.icon}</span>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{item.nameRu}</div>
                          <div className="text-xs text-slate-400">Слой: {layer}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
`;

code = code.replace(
  "          )}\n        </div>\n      </div>\n    </div>",
  clothingJSX + "          )}\n        </div>\n      </div>\n    </div>"
);

fs.writeFileSync('src/components/InventoryModal.tsx', code, 'utf8');
