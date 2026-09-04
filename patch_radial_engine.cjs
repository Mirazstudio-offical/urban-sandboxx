const fs = require('fs');
let code = fs.readFileSync('src/components/RadialMenu.tsx', 'utf8');

code = code.replace(
  "onToggleWindow?: () => void;\n}",
  "onToggleWindow?: () => void;\n  onToggleEngine?: () => void;\n}"
);

code = code.replace(
  "import { \n  Lightbulb,",
  "import { \n  Lightbulb,\n  Power,"
);

const isEngineRunning = `  const isEngineRunning = veh.engineState?.engineRunning ?? false;`;
code = code.replace("const isWindowOpen = !!veh.windowOpen;", `${isEngineRunning}\n  const isWindowOpen = !!veh.windowOpen;`);

const newMenuItem = `    {
      id: 'engine',
      label: 'ЗАЖИГАНИЕ',
      keyHint: 'J',
      sub: isEngineRunning ? 'РАБОТАЕТ' : 'ВЫКЛ',
      icon: <Power className={\`w-5 h-5 \${isEngineRunning ? 'text-green-400' : 'text-red-400'}\`} />,
      active: isEngineRunning,
      badgeColor: isEngineRunning ? 'bg-green-500 text-green-950' : 'bg-red-500 text-red-950',
      activeBorder: isEngineRunning ? 'border-green-400/80 shadow-green-500/25 text-green-400' : 'border-slate-700/80 text-red-400',
      action: () => {
        sound.playButtonPress();
        if (onToggleEngine) onToggleEngine();
      }
    },`;

// Replace siren with engine since it's a generic vehicle
const sirenItem = `    {
      id: 'siren',
      label: 'СПЕЦСИГНАЛ',
      keyHint: 'H',
      sub: sirenActive ? 'СИРЕНА' : 'ВЫКЛ',
      icon: <ShieldAlert className={\`w-5 h-5 \${sirenActive ? 'text-rose-400 animate-bounce' : ''}\`} />,
      active: sirenActive,
      badgeColor: sirenActive ? 'bg-rose-500 text-rose-950 animate-pulse' : 'bg-slate-700 text-slate-300',
      activeBorder: sirenActive ? 'border-rose-400/80 shadow-rose-500/30 text-rose-400' : 'border-slate-700/80 text-slate-400',
      action: () => {
        sound.playButtonPress();
        onToggleSiren();
      }
    },`;

code = code.replace(sirenItem, newMenuItem);
fs.writeFileSync('src/components/RadialMenu.tsx', code);
