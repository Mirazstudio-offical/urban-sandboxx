import { useEffect, useState } from 'react';

export type KeybindContext = 'global' | 'vehicle' | 'foot' | 'crane';

export type KeybindGroupId = 'vehicle' | 'lights' | 'special' | 'player' | 'interface' | 'debug';

export type KeybindAction =
  // Movement & Driving
  | 'moveForward'
  | 'moveBackward'
  | 'turnLeft'
  | 'turnRight'
  | 'handbrake'
  | 'shiftUp'
  | 'shiftDown'
  | 'engineToggle'
  | 'horn'
  | 'vehicleBoard'
  | 'toggleWindow'
  | 'transferCase'
  | 'diffLock'
  | 'gboToggle'
  // Lights & Signals
  | 'headlights'
  | 'turnSignalLeft'
  | 'turnSignalRight'
  | 'hazardLights'
  | 'frontFogLights'
  | 'rearFogLights'
  | 'roadTrainLights'
  // Special Machinery & Crane/Excavator/Tractor
  | 'ptoToggle'
  | 'specialMode'
  | 'craneBoomRetract'
  | 'craneBoomExtend'
  | 'craneHookUp'
  | 'craneHookDown'
  | 'tractorBrakeLatch'
  | 'tractorBrakeLeft'
  | 'tractorBrakeRight'
  // Player on foot
  | 'sprint'
  | 'jump'
  | 'swapHand'
  | 'handLeft'
  | 'handRight'
  | 'hotbar1'
  | 'hotbar2'
  | 'hotbar3'
  | 'hotbar4'
  | 'hotbar5'
  | 'hotbar6'
  // Interface
  | 'inventory'
  | 'bodyInspection'
  | 'fullMap'
  | 'chat'
  | 'onlineMenu'
  // Debug & Tools
  | 'slowMotion'
  | 'cycleTime'
  | 'gridMode'
  | 'aiConsole'
  | 'crashDiagnostics'
  | 'perfProfiler';

export interface KeybindDefinition {
  id: KeybindAction;
  label: string;
  group: KeybindGroupId;
  context: KeybindContext;
  defaultCode: string;
  hint?: string;
}

export interface KeybindGroupMeta {
  id: KeybindGroupId;
  title: string;
}

export const KEYBIND_GROUPS: KeybindGroupMeta[] = [
  { id: 'vehicle', title: 'Автомобиль и движение' },
  { id: 'lights', title: 'Освещение и поворотники' },
  { id: 'special', title: 'Спецтехника, кран и трактор' },
  { id: 'player', title: 'Персонаж пешком' },
  { id: 'interface', title: 'Интерфейс и сеть' },
  { id: 'debug', title: 'Инструменты и отладка' },
];

export const KEYBIND_DEFINITIONS: KeybindDefinition[] = [
  // Vehicle & Movement
  { id: 'moveForward', label: 'Газ / идти вперёд', group: 'vehicle', context: 'global', defaultCode: 'KeyW' },
  { id: 'moveBackward', label: 'Тормоз / идти назад', group: 'vehicle', context: 'global', defaultCode: 'KeyS' },
  { id: 'turnLeft', label: 'Влево', group: 'vehicle', context: 'global', defaultCode: 'KeyA' },
  { id: 'turnRight', label: 'Вправо', group: 'vehicle', context: 'global', defaultCode: 'KeyD' },
  { id: 'handbrake', label: 'Ручной тормоз / захват крюка', group: 'vehicle', context: 'vehicle', defaultCode: 'Space' },
  { id: 'shiftUp', label: 'КПП: передача вверх', group: 'vehicle', context: 'vehicle', defaultCode: 'ShiftLeft' },
  { id: 'shiftDown', label: 'КПП: передача вниз', group: 'vehicle', context: 'vehicle', defaultCode: 'AltLeft', hint: 'Безопасная замена Ctrl (Ctrl+W закрывает вкладку)' },
  { id: 'engineToggle', label: 'Завести / заглушить двигатель', group: 'vehicle', context: 'vehicle', defaultCode: 'KeyJ' },
  { id: 'horn', label: 'Клаксон / гудок крана', group: 'vehicle', context: 'vehicle', defaultCode: 'KeyH' },
  { id: 'vehicleBoard', label: 'Бортовое меню авто', group: 'vehicle', context: 'vehicle', defaultCode: 'KeyB' },
  { id: 'toggleWindow', label: 'Окно автомобиля', group: 'vehicle', context: 'vehicle', defaultCode: 'BracketLeft' },
  { id: 'transferCase', label: 'Раздатка (2WD / 4WD / 4L)', group: 'vehicle', context: 'vehicle', defaultCode: 'KeyX' },
  { id: 'diffLock', label: 'Блокировка дифференциала', group: 'vehicle', context: 'vehicle', defaultCode: 'KeyV' },
  { id: 'gboToggle', label: 'ГБО (газ / бензин)', group: 'vehicle', context: 'vehicle', defaultCode: 'KeyK' },

  // Lights & Signals
  { id: 'headlights', label: 'Фары (ближний / дальний)', group: 'lights', context: 'vehicle', defaultCode: 'KeyL' },
  { id: 'turnSignalLeft', label: 'Левый поворотник', group: 'lights', context: 'vehicle', defaultCode: 'KeyQ' },
  { id: 'turnSignalRight', label: 'Правый поворотник', group: 'lights', context: 'vehicle', defaultCode: 'KeyE' },
  { id: 'hazardLights', label: 'Аварийная сигнализация', group: 'lights', context: 'vehicle', defaultCode: 'KeyZ' },
  { id: 'frontFogLights', label: 'Передние противотуманки', group: 'lights', context: 'vehicle', defaultCode: 'KeyU' },
  { id: 'rearFogLights', label: 'Задний противотуманный фонарь', group: 'lights', context: 'vehicle', defaultCode: 'KeyY' },
  { id: 'roadTrainLights', label: 'Огни автопоезда', group: 'lights', context: 'vehicle', defaultCode: 'KeyN' },

  // Special machinery
  { id: 'ptoToggle', label: 'КОМ (вал отбора мощности)', group: 'special', context: 'vehicle', defaultCode: 'KeyP' },
  { id: 'specialMode', label: 'Режим экскаватора / сопла водовоза', group: 'special', context: 'vehicle', defaultCode: 'KeyG' },
  { id: 'craneBoomRetract', label: 'Кран / экскаватор: сложить стрелу', group: 'special', context: 'crane', defaultCode: 'KeyQ' },
  { id: 'craneBoomExtend', label: 'Кран / экскаватор: выдвинуть стрелу', group: 'special', context: 'crane', defaultCode: 'KeyE' },
  { id: 'craneHookUp', label: 'Кран / экскаватор: крюк вверх', group: 'special', context: 'crane', defaultCode: 'KeyR' },
  { id: 'craneHookDown', label: 'Кран / экскаватор: крюк вниз', group: 'special', context: 'crane', defaultCode: 'KeyF' },
  { id: 'tractorBrakeLatch', label: 'МТЗ: сцепка педалей тормоза', group: 'special', context: 'vehicle', defaultCode: 'Slash' },
  { id: 'tractorBrakeLeft', label: 'МТЗ: левый раздельный тормоз', group: 'special', context: 'vehicle', defaultCode: 'Comma' },
  { id: 'tractorBrakeRight', label: 'МТЗ: правый раздельный тормоз', group: 'special', context: 'vehicle', defaultCode: 'Period' },

  // Player on foot
  { id: 'sprint', label: 'Бег пешком', group: 'player', context: 'foot', defaultCode: 'ShiftLeft' },
  { id: 'jump', label: 'Прыжок', group: 'player', context: 'foot', defaultCode: 'Space' },
  { id: 'swapHand', label: 'Сменить активную руку', group: 'player', context: 'foot', defaultCode: 'KeyQ' },
  { id: 'handLeft', label: 'Выбрать левую руку', group: 'player', context: 'foot', defaultCode: 'KeyZ' },
  { id: 'handRight', label: 'Выбрать правую руку', group: 'player', context: 'foot', defaultCode: 'KeyX' },
  { id: 'hotbar1', label: 'Быстрый слот кармана 1', group: 'player', context: 'foot', defaultCode: 'Digit1' },
  { id: 'hotbar2', label: 'Быстрый слот кармана 2', group: 'player', context: 'foot', defaultCode: 'Digit2' },
  { id: 'hotbar3', label: 'Быстрый слот кармана 3', group: 'player', context: 'foot', defaultCode: 'Digit3' },
  { id: 'hotbar4', label: 'Быстрый слот кармана 4', group: 'player', context: 'foot', defaultCode: 'Digit4' },
  { id: 'hotbar5', label: 'Быстрый слот кармана 5', group: 'player', context: 'foot', defaultCode: 'Digit5' },
  { id: 'hotbar6', label: 'Быстрый слот кармана 6', group: 'player', context: 'foot', defaultCode: 'Digit6' },

  // Interface & Online
  { id: 'inventory', label: 'Инвентарь', group: 'interface', context: 'global', defaultCode: 'Tab' },
  { id: 'bodyInspection', label: 'Осмотр тела и здоровья', group: 'interface', context: 'global', defaultCode: 'KeyC' },
  { id: 'fullMap', label: 'Карта (GPS)', group: 'interface', context: 'global', defaultCode: 'KeyM' },
  { id: 'chat', label: 'Чат', group: 'interface', context: 'global', defaultCode: 'Enter' },
  { id: 'onlineMenu', label: 'Онлайн / серверы', group: 'interface', context: 'global', defaultCode: 'KeyO' },

  // Debug & Tools
  { id: 'slowMotion', label: 'Замедление времени', group: 'debug', context: 'global', defaultCode: 'KeyT' },
  { id: 'cycleTime', label: 'Сменить время суток', group: 'debug', context: 'global', defaultCode: 'BracketRight' },
  { id: 'gridMode', label: 'Сетка кузова', group: 'debug', context: 'foot', defaultCode: 'KeyG' },
  { id: 'aiConsole', label: 'Консоль трафика ИИ', group: 'debug', context: 'global', defaultCode: 'F1' },
  { id: 'crashDiagnostics', label: 'Диагностика крашей', group: 'debug', context: 'global', defaultCode: 'F2' },
  { id: 'perfProfiler', label: 'Профайлер производительности', group: 'debug', context: 'global', defaultCode: 'Backquote' },
];

export type KeybindMap = Record<KeybindAction, string>;

const STORAGE_KEY = 'flatbody_keybinds_v1';

export const DEFAULT_KEYBINDS: KeybindMap = KEYBIND_DEFINITIONS.reduce((acc, def) => {
  acc[def.id] = def.defaultCode;
  return acc;
}, {} as KeybindMap);

const DEF_BY_ID: Record<KeybindAction, KeybindDefinition> = KEYBIND_DEFINITIONS.reduce((acc, def) => {
  acc[def.id] = def;
  return acc;
}, {} as Record<KeybindAction, KeybindDefinition>);

const listeners = new Set<() => void>();

function loadStoredKeybinds(): KeybindMap {
  const result: KeybindMap = { ...DEFAULT_KEYBINDS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return result;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      for (const def of KEYBIND_DEFINITIONS) {
        const val = parsed[def.id];
        if (typeof val === 'string' && val.length > 0 && val !== 'Escape') {
          // Migrate legacy Digit1/Digit2 on handLeft/handRight so Digit1..6 work for the 6-slot pocket hotbar
          if (def.id === 'handLeft' && val === 'Digit1' && !parsed.hotbar1) continue;
          if (def.id === 'handRight' && val === 'Digit2' && !parsed.hotbar2) continue;
          result[def.id] = val;
        }
      }
    }
  } catch {
    // ignore storage errors
  }
  return result;
}

let currentKeybinds: KeybindMap = loadStoredKeybinds();

function persistAndNotify() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentKeybinds));
  } catch {
    // ignore quota errors
  }
  listeners.forEach((fn) => fn());
}

export function getKeybinds(): KeybindMap {
  return currentKeybinds;
}

export function getKeybind(action: KeybindAction): string {
  return currentKeybinds[action] || DEFAULT_KEYBINDS[action];
}

export function getKeybindLabel(action: KeybindAction): string {
  return formatKeyCode(getKeybind(action));
}

export function subscribeKeybinds(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useKeybinds(): KeybindMap {
  const [map, setMap] = useState<KeybindMap>(() => ({ ...currentKeybinds }));
  useEffect(() => subscribeKeybinds(() => setMap({ ...currentKeybinds })), []);
  return map;
}

/**
 * Contexts conflict when both actions can trigger in the same player state.
 * Note: `crane` overrides `vehicle` while operating a crane/excavator.
 */
export function contextsConflict(a: KeybindContext, b: KeybindContext): boolean {
  if (a === 'global' || b === 'global') return true;
  return a === b;
}

export interface RebindResult {
  swappedWith?: KeybindDefinition;
  warning?: string;
}

export function setKeybind(action: KeybindAction, newCode: string): RebindResult {
  if (!newCode || newCode === 'Escape') return {};
  const targetDef = DEF_BY_ID[action];
  if (!targetDef) return {};

  const prevCode = currentKeybinds[action];
  if (prevCode === newCode) return {};

  // Find first conflicting action in an overlapping context
  let swappedWith: KeybindDefinition | undefined;
  for (const other of KEYBIND_DEFINITIONS) {
    if (other.id === action) continue;
    if (currentKeybinds[other.id] !== newCode) continue;
    if (contextsConflict(targetDef.context, other.context)) {
      swappedWith = other;
      break;
    }
  }

  const next: KeybindMap = { ...currentKeybinds, [action]: newCode };
  if (swappedWith) {
    next[swappedWith.id] = prevCode;
  }

  currentKeybinds = next;
  persistAndNotify();

  const warning =
    newCode === 'ControlLeft' || newCode === 'ControlRight'
      ? 'Осторожно: в браузере Ctrl + W закрывает вкладку.'
      : undefined;

  return { swappedWith, warning };
}

export function resetKeybind(action: KeybindAction): void {
  const def = DEF_BY_ID[action];
  if (!def) return;
  setKeybind(action, def.defaultCode);
}

export function resetAllKeybinds(): void {
  currentKeybinds = { ...DEFAULT_KEYBINDS };
  persistAndNotify();
}

export function isAnyKeybindCustomized(): boolean {
  return KEYBIND_DEFINITIONS.some((def) => currentKeybinds[def.id] !== def.defaultCode);
}

const FALLBACK_ALIASES: Partial<Record<KeybindAction, string[]>> = {
  moveForward: ['ArrowUp'],
  moveBackward: ['ArrowDown'],
  turnLeft: ['ArrowLeft'],
  turnRight: ['ArrowRight'],
  handLeft: ['Numpad1'],
  handRight: ['Numpad2'],
  inventory: ['KeyI'],
  shiftUp: ['ShiftRight'],
  sprint: ['ShiftRight'],
};

function isCodeExplicitlyBound(code: string): boolean {
  for (const def of KEYBIND_DEFINITIONS) {
    if (currentKeybinds[def.id] === code) return true;
  }
  return false;
}

/**
 * Checks whether a KeyboardEvent.code matches an action's primary bind
 * or its non-conflicting convenience alias (e.g. Arrow keys for WASD when arrows are unbound).
 */
export function matchesKeybind(action: KeybindAction, code: string): boolean {
  if (currentKeybinds[action] === code) return true;
  // Only honor fallback aliases if the action is still on its default key and the alias isn't bound elsewhere
  const def = DEF_BY_ID[action];
  if (!def || currentKeybinds[action] !== def.defaultCode) return false;
  const aliases = FALLBACK_ALIASES[action];
  if (!aliases || !aliases.includes(code)) return false;
  return !isCodeExplicitlyBound(code);
}

const CODE_LABELS: Record<string, string> = {
  Space: 'Пробел',
  Enter: 'Enter',
  NumpadEnter: 'Num Enter',
  Tab: 'Tab',
  Escape: 'Esc',
  Backspace: 'Backspace',
  Delete: 'Del',
  Insert: 'Ins',
  Home: 'Home',
  End: 'End',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
  ShiftLeft: 'L.Shift',
  ShiftRight: 'R.Shift',
  ControlLeft: 'L.Ctrl',
  ControlRight: 'R.Ctrl',
  AltLeft: 'L.Alt',
  AltRight: 'R.Alt',
  MetaLeft: 'Meta',
  MetaRight: 'R.Meta',
  CapsLock: 'Caps',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Minus: '-',
  Equal: '=',
  Backquote: '`',
  NumpadAdd: 'Num +',
  NumpadSubtract: 'Num -',
  NumpadMultiply: 'Num *',
  NumpadDivide: 'Num /',
  NumpadDecimal: 'Num .',
};

export function formatKeyCode(code: string): string {
  if (!code) return '—';
  if (CODE_LABELS[code]) return CODE_LABELS[code];
  if (code.startsWith('Key') && code.length === 4) return code.slice(3);
  if (code.startsWith('Digit') && code.length === 6) return code.slice(5);
  if (code.startsWith('Numpad') && code.length === 7) return 'Num ' + code.slice(6);
  return code;
}
