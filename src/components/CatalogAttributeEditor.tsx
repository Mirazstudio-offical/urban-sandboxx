import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Droplets,
  Sliders,
  Sparkles,
  Shirt,
  Smartphone,
  Cpu,
  Utensils,
  Package,
  Candy,
  Leaf,
  Beef,
  Cookie,
} from 'lucide-react';
import {
  InventoryItem,
  ContainerVisualShape,
  ContainerVisualAttributes,
  KitchenwareMaterial,
  KitchenwarePattern,
  GummyCandyShape,
  ChocolateShape,
  ChocolateSize,
  PelmenShape,
  PelmenSize,
  PelmenState,
  RollingPinModel,
  RollingPinMaterial,
  RollingPinPattern,
  DoughShape,
  DoughCookState,
  ProduceCutForm,
  ProduceSizeTier,
  MeatCutForm,
  PlantBranchKind,
} from '../types';
import {
  KITCHENWARE_MATERIAL_NAMES_RU,
  KITCHENWARE_PATTERN_NAMES_RU,
  GUMMY_SHAPE_NAMES_RU,
  CHOCOLATE_SHAPE_NAMES_RU,
  CHOCOLATE_SIZE_NAMES_RU,
  PELMEN_SHAPE_NAMES_RU,
  PELMEN_SIZE_NAMES_RU,
  PELMEN_STATE_NAMES_RU,
  applyKitchenwareAttributesToItem,
  applyPhoneAttributesToItem,
  applyHardwareAttributesToItem,
  createGummyCandy,
  createChocolate,
  createPelmen,
  normalizeItemAttributes,
} from '../items';
import {
  LIQUID_REGISTRY,
  LiquidId,
  isJarCanOrBottleContainer,
  resolveContainerVisualAttributes,
  syncItemContainerProperties,
} from '../liquidSystem';
import { PHONE_MODELS } from '../phoneData';
import {
  ROLLING_PIN_PRESETS,
  DOUGH_SHAPE_NAMES_RU,
  DOUGH_COOK_STATE_RU,
  applyRollingPinAttributesToItem,
  applyDoughAttributesToItem,
} from '../doughData';
import {
  applyProduceAttributesToItem,
  applyBranchAttributesToItem,
} from '../produceData';
import { applyMeatAttributesToItem } from '../meatData';

export interface CatalogAttributeEditorProps {
  item: InventoryItem;
  onChange: (nextItem: InventoryItem) => void;
}

const SWATCH_PALETTE: string[] = [
  '#f4f1ea',
  '#1f2937',
  '#b91c1c',
  '#ea580c',
  '#d97706',
  '#eab308',
  '#65a30d',
  '#15803d',
  '#0d9488',
  '#0284c7',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#78350f',
];

const GLASS_SWATCHES: { hex: string; label: string }[] = [
  { hex: '#e0f2fe', label: 'Прозрачное' },
  { hex: '#bbf7d0', label: 'Зелёное' },
  { hex: '#fef3c7', label: 'Янтарное' },
  { hex: '#dbeafe', label: 'Кобальт' },
  { hex: '#f3e8ff', label: 'Аметист' },
  { hex: '#fecdd3', label: 'Розовое' },
  { hex: '#cbd5e1', label: 'Матовое' },
  { hex: '#334155', label: 'Тёмное' },
];

const CONTAINER_SHAPES: { id: ContainerVisualShape; label: string }[] = [
  { id: 'classic', label: 'Классика' },
  { id: 'cylinder', label: 'Цилиндр' },
  { id: 'hexagonal', label: 'Шестигран.' },
  { id: 'octagonal', label: 'Восьмигран.' },
  { id: 'barrel', label: 'Бочонок' },
  { id: 'square', label: 'Квадрат' },
  { id: 'amphora', label: 'Амфора' },
  { id: 'oval', label: 'Овал' },
  { id: 'sleek', label: 'Стройная' },
  { id: 'bordeaux', label: 'Бордо' },
  { id: 'burgundy', label: 'Бургундия' },
  { id: 'flask', label: 'Фляга' },
  { id: 'bulbous', label: 'Пузатая' },
  { id: 'pinched', label: 'С талией' },
];

const ROLLING_PIN_MATERIALS: { id: RollingPinMaterial; label: string }[] = [
  { id: 'beech_wood', label: 'Бук' },
  { id: 'oak_wood', label: 'Дуб' },
  { id: 'birch_wood', label: 'Берёза' },
  { id: 'walnut_wood', label: 'Орех' },
  { id: 'marble', label: 'Мрамор' },
  { id: 'stainless_steel', label: 'Нержавейка' },
  { id: 'silicone', label: 'Силикон' },
  { id: 'ceramic', label: 'Керамика' },
];

const ROLLING_PIN_PATTERNS: { id: RollingPinPattern; label: string }[] = [
  { id: 'none', label: 'Без узора' },
  { id: 'wood_grain', label: 'Древесина' },
  { id: 'carved_floral', label: 'Резные цветы' },
  { id: 'carved_lattice', label: 'Резная решётка' },
  { id: 'carved_waves', label: 'Резные волны' },
  { id: 'carved_folklore', label: 'Фольклорный узор' },
  { id: 'marble_veins', label: 'Прожилки мрамора' },
  { id: 'brushed_metal', label: 'Шлифованный металл' },
  { id: 'pastel_speckle', label: 'Пастельная крошка' },
];

const CHOCOLATE_TEXTURES: { id: NonNullable<NonNullable<InventoryItem['chocolateAttributes']>['surfaceTexture']>; label: string }[] = [
  { id: 'smooth', label: 'Гладкая' },
  { id: 'nuts', label: 'С орехами' },
  { id: 'crisps', label: 'Хруст' },
  { id: 'marbled', label: 'Мрамор' },
  { id: 'dusted', label: 'Пудра' },
];

const PRODUCE_CUT_FORMS: { id: ProduceCutForm; label: string }[] = [
  { id: 'whole', label: 'Целый' },
  { id: 'peeled', label: 'Очищенный' },
  { id: 'half', label: 'Половинка' },
  { id: 'quarter', label: 'Четвертинка' },
  { id: 'wedge', label: 'Долька' },
  { id: 'slice', label: 'Кружок / ломтик' },
  { id: 'ring', label: 'Кольца' },
  { id: 'chunk', label: 'Кусочек' },
  { id: 'strips', label: 'Соломка' },
  { id: 'diced', label: 'Кубики' },
  { id: 'shredded', label: 'Шинковка' },
  { id: 'grated', label: 'Тёртый' },
  { id: 'crushed', label: 'Толчёный' },
  { id: 'peel', label: 'Кожура' },
  { id: 'core', label: 'Сердцевина' },
];

const MEAT_CUT_FORMS: { id: MeatCutForm; label: string }[] = [
  { id: 'whole', label: 'Целый кусок' },
  { id: 'half', label: 'Половина' },
  { id: 'chunk', label: 'Кусок' },
  { id: 'steak', label: 'Стейк' },
  { id: 'medallion', label: 'Медальон' },
  { id: 'fillet', label: 'Филе' },
  { id: 'strips', label: 'Полоски' },
  { id: 'cubes', label: 'Кубики' },
  { id: 'minced', label: 'Фарш' },
];

const SIZE_TIERS: { id: ProduceSizeTier; label: string }[] = [
  { id: 'tiny', label: 'Крош.' },
  { id: 'small', label: 'Мал.' },
  { id: 'medium', label: 'Сред.' },
  { id: 'large', label: 'Круп.' },
  { id: 'giant', label: 'Гиг.' },
];

const BRANCH_KINDS: { id: PlantBranchKind; label: string }[] = [
  { id: 'twig', label: 'Веточка' },
  { id: 'cluster', label: 'Гроздь' },
  { id: 'bunch', label: 'Пучок' },
  { id: 'mycelium', label: 'Грибница' },
];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function rgbTupleToHex(rgb?: [number, number, number] | null, fallback = '#e0f2fe'): string {
  if (!rgb || rgb.length < 3) return fallback;
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
}

function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = (hex || '#ffffff').replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
      : clean.slice(0, 6).padEnd(6, '0');
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [224, 242, 254];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function normalizeHex(color?: string, fallback = '#c9922b'): string {
  if (!color || typeof color !== 'string') return fallback;
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
  }
  const m = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return rgbTupleToHex([Number(m[1]), Number(m[2]), Number(m[3])], fallback);
  return fallback;
}

function cloneItem(item: InventoryItem): InventoryItem {
  return JSON.parse(JSON.stringify(item)) as InventoryItem;
}

function stopInputKeys(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== 'Escape') {
    e.stopPropagation();
    e.nativeEvent.stopPropagation();
  }
}

interface ColorControlProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  swatches?: string[];
}

const ColorControl: React.FC<ColorControlProps> = ({ label, value, onChange, swatches = SWATCH_PALETTE }) => {
  const hex = normalizeHex(value);
  return (
    <div className="cat-ed-field">
      <div className="cat-ed-row">
        <span className="cat-ed-lbl">{label}</span>
        <label className="cat-ed-color-btn" title="Выбрать произвольный цвет">
          <span className="cat-ed-color-dot" style={{ background: hex }} />
          <span className="mono">{hex.toUpperCase()}</span>
          <input
            type="color"
            value={hex}
            onChange={e => onChange(e.target.value)}
            onKeyDown={stopInputKeys}
          />
        </label>
      </div>
      <div className="cat-ed-swatches">
        {swatches.map(sw => (
          <button
            type="button"
            key={sw}
            className={'cat-ed-sw' + (sw.toLowerCase() === hex ? ' on' : '')}
            style={{ background: sw }}
            title={sw.toUpperCase()}
            onClick={() => onChange(sw)}
          />
        ))}
      </div>
    </div>
  );
};

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
}

const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}) => {
  const display = step < 1 ? Number(value.toFixed(step < 0.05 ? 3 : 2)) : Math.round(value);
  return (
    <div className="cat-ed-field">
      <div className="cat-ed-row">
        <span className="cat-ed-lbl">{label}</span>
        <span className="cat-ed-val mono">
          {display}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
      <input
        type="range"
        className="cat-ed-range"
        min={min}
        max={max}
        step={step}
        value={clamp(value, min, max)}
        onChange={e => onChange(parseFloat(e.target.value))}
        onKeyDown={stopInputKeys}
      />
    </div>
  );
};

interface ToggleControlProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleControl: React.FC<ToggleControlProps> = ({ label, checked, onChange }) => (
  <button
    type="button"
    className={'cat-ed-toggle' + (checked ? ' on' : '')}
    onClick={() => onChange(!checked)}
  >
    <span>{label}</span>
    <span className="cat-ed-switch">
      <i />
    </span>
  </button>
);

interface SectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

const EditorSection: React.FC<SectionProps> = ({ id, title, icon, open, onToggle, children }) => (
  <div className={'cat-ed-sec' + (open ? ' open' : '')}>
    <button type="button" className="cat-ed-sec-h" onClick={() => onToggle(id)}>
      <span className="cat-ed-sec-l">
        {icon}
        <span className="cn">{title}</span>
      </span>
      {open ? <ChevronDown width={15} height={15} /> : <ChevronRight width={15} height={15} />}
    </button>
    {open && <div className="cat-ed-sec-b">{children}</div>}
  </div>
);

export const CatalogAttributeEditor: React.FC<CatalogAttributeEditorProps> = ({ item, onChange }) => {
  const hasFluid = Boolean(item.fluidStorage || isJarCanOrBottleContainer(item.itemId));
  const hasKitchenware = Boolean(item.kitchenwareAttributes);
  const hasPhone = Boolean(item.phoneAttributes);
  const hasHardware = Boolean(item.hardwareAttributes);
  const hasRollingPin = Boolean(item.rollingPinAttributes);
  const hasGummy = Boolean(item.gummyAttributes);
  const hasChocolate = Boolean(item.chocolateAttributes);
  const hasPelmen = Boolean(item.pelmenAttributes);
  const hasDough = Boolean(item.doughAttributes);
  const hasProduce = Boolean(item.produceAttributes);
  const hasMeat = Boolean(item.meatAttributes);
  const hasBranch = Boolean(item.branchAttributes);
  const hasClothing = Boolean(item.clothingStats);
  const hasPackaging = Boolean(
    !hasFluid && (item.isContainer || item.labelColor || item.containerTintColor)
  );

  const primarySection = useMemo(() => {
    if (hasKitchenware) return 'kitchenware';
    if (hasFluid) return 'fluid';
    if (hasPhone) return 'phone';
    if (hasHardware) return 'hardware';
    if (hasRollingPin) return 'rolling_pin';
    if (hasGummy) return 'gummy';
    if (hasChocolate) return 'chocolate';
    if (hasPelmen) return 'pelmen';
    if (hasDough) return 'dough';
    if (hasProduce) return 'produce';
    if (hasMeat) return 'meat';
    if (hasBranch) return 'branch';
    if (hasClothing) return 'clothing';
    if (hasPackaging) return 'packaging';
    return 'general';
  }, [
    hasKitchenware,
    hasFluid,
    hasPhone,
    hasHardware,
    hasRollingPin,
    hasGummy,
    hasChocolate,
    hasPelmen,
    hasDough,
    hasProduce,
    hasMeat,
    hasBranch,
    hasClothing,
    hasPackaging,
  ]);

  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenMap({
      [primarySection]: true,
      ...(hasKitchenware && hasFluid ? { fluid: false } : {}),
      general: primarySection === 'general',
      effects: false,
    });
  }, [item.id, primarySection, hasKitchenware, hasFluid]);

  const toggleSec = (id: string) => {
    setOpenMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const sortedLiquids = useMemo(() => {
    return (Object.keys(LIQUID_REGISTRY) as LiquidId[])
      .map(id => ({ id, def: LIQUID_REGISTRY[id] }))
      .sort((a, b) => a.def.nameRu.localeCompare(b.def.nameRu, 'ru'));
  }, []);

  const commit = (mutator: (draft: InventoryItem) => InventoryItem | void) => {
    const draft = cloneItem(item);
    const result = mutator(draft) || draft;
    onChange(normalizeItemAttributes(result));
  };

  const resolveItemContainerVisuals = (target: InventoryItem): ContainerVisualAttributes =>
    resolveContainerVisualAttributes(
      typeof target.itemId === 'string' ? target.itemId : '',
      target.fluidStorage?.liquidId ?? null,
      target.fluidStorage?.attributes,
      target.originalCatalogId,
      target.containerVisuals || target.fluidStorage?.containerVisuals
    );

  const updateContainerVisuals = (patch: Partial<ContainerVisualAttributes>) => {
    commit(draft => {
      const current = resolveItemContainerVisuals(draft);
      const nextVis: ContainerVisualAttributes = {
        ...current,
        ...patch,
      };
      draft.containerVisuals = nextVis;
      if (draft.fluidStorage) {
        draft.fluidStorage.containerVisuals = { ...nextVis };
      }
      if (draft.fluidStorage) {
        syncItemContainerProperties(draft);
      }
    });
  };

  // ---- Fluid / Jar visual snapshot ----
  const resolvedVis = hasFluid ? resolveItemContainerVisuals(item) : null;
  const fs = item.fluidStorage;
  const activeLiquidDef = fs?.liquidId ? LIQUID_REGISTRY[fs.liquidId] : null;
  const activeLiquidColor = normalizeHex(
    fs?.attributes?.customColor || activeLiquidDef?.color || '#38bdf8',
    '#38bdf8'
  );

  return (
    <div className="cat-ed">
      {/* 1. FLUID & CONTAINER */}
      {hasFluid && (
        <EditorSection
          id="fluid"
          title="Жидкость и тара"
          icon={<Droplets width={14} height={14} color="#e0ab45" />}
          open={Boolean(openMap.fluid)}
          onToggle={toggleSec}
        >
          {fs && (
            <>
              <div className="cat-ed-field">
                <span className="cat-ed-lbl">Содержимое</span>
                <select
                  className="cat-ed-select"
                  value={fs.liquidId || ''}
                  onKeyDown={stopInputKeys}
                  onChange={e => {
                    const nextId = (e.target.value || null) as LiquidId | null;
                    commit(draft => {
                      if (!draft.fluidStorage) return;
                      if (!nextId) {
                        draft.fluidStorage.liquidId = null;
                        draft.fluidStorage.currentMl = 0;
                        draft.fluidStorage.attributes = undefined;
                      } else {
                        const def = LIQUID_REGISTRY[nextId];
                        draft.fluidStorage.liquidId = nextId;
                        if (draft.fluidStorage.currentMl <= 0) {
                          draft.fluidStorage.currentMl = draft.fluidStorage.maxMl;
                        }
                        draft.fluidStorage.attributes = {
                          ...(draft.fluidStorage.attributes || {}),
                          varietyRu: def?.nameRu || nextId,
                          customColor: def?.color || '#38bdf8',
                        };
                      }
                      syncItemContainerProperties(draft);
                    });
                  }}
                >
                  <option value="">Пусто</option>
                  {sortedLiquids.map(({ id, def }) => (
                    <option key={id} value={id}>
                      {def.nameRu}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cat-ed-field">
                <div className="cat-ed-row">
                  <span className="cat-ed-lbl">Уровень наполнения</span>
                  <span className="cat-ed-val mono">
                    {Math.round(fs.currentMl)} / {Math.round(fs.maxMl)} мл
                  </span>
                </div>
                <div className="cat-ed-fill-bar">
                  <i
                    style={{
                      width: `${fs.maxMl > 0 ? clamp((fs.currentMl / fs.maxMl) * 100, 0, 100) : 0}%`,
                      background: fs.liquidId ? activeLiquidColor : '#57534e',
                    }}
                  />
                </div>
                <input
                  type="range"
                  className="cat-ed-range"
                  min={0}
                  max={Math.max(10, fs.maxMl)}
                  step={Math.max(5, Math.round(fs.maxMl / 40))}
                  value={clamp(fs.currentMl, 0, fs.maxMl)}
                  onKeyDown={stopInputKeys}
                  onChange={e => {
                    const ml = Number(e.target.value);
                    commit(draft => {
                      if (!draft.fluidStorage) return;
                      draft.fluidStorage.currentMl = ml;
                      if (ml <= 0) {
                        draft.fluidStorage.liquidId = null;
                      } else if (!draft.fluidStorage.liquidId) {
                        draft.fluidStorage.liquidId = 'water';
                        draft.fluidStorage.attributes = {
                          varietyRu: LIQUID_REGISTRY.water.nameRu,
                          customColor: LIQUID_REGISTRY.water.color,
                        };
                      }
                      syncItemContainerProperties(draft);
                    });
                  }}
                />
                <div className="cat-ed-quick-row">
                  {[0, 25, 50, 75, 100].map(pct => (
                    <button
                      type="button"
                      key={pct}
                      className="cat-ed-chip"
                      onClick={() => {
                        commit(draft => {
                          if (!draft.fluidStorage) return;
                          const ml = Math.round((draft.fluidStorage.maxMl * pct) / 100);
                          draft.fluidStorage.currentMl = ml;
                          if (ml <= 0) {
                            draft.fluidStorage.liquidId = null;
                          } else if (!draft.fluidStorage.liquidId) {
                            draft.fluidStorage.liquidId = 'water';
                            draft.fluidStorage.attributes = {
                              varietyRu: LIQUID_REGISTRY.water.nameRu,
                              customColor: LIQUID_REGISTRY.water.color,
                            };
                          }
                          syncItemContainerProperties(draft);
                        });
                      }}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {fs.liquidId && (
                <>
                  <ColorControl
                    label="Цвет жидкости"
                    value={activeLiquidColor}
                    onChange={hex => {
                      commit(draft => {
                        if (!draft.fluidStorage) return;
                        draft.fluidStorage.attributes = {
                          ...(draft.fluidStorage.attributes || {}),
                          customColor: hex,
                        };
                        syncItemContainerProperties(draft);
                      });
                    }}
                  />
                  <div className="cat-ed-field">
                    <span className="cat-ed-lbl">Сорт / название вещества</span>
                    <input
                      type="text"
                      className="cat-ed-input"
                      value={fs.attributes?.varietyRu || activeLiquidDef?.nameRu || ''}
                      onKeyDown={stopInputKeys}
                      onChange={e => {
                        const val = e.target.value;
                        commit(draft => {
                          if (!draft.fluidStorage) return;
                          draft.fluidStorage.attributes = {
                            ...(draft.fluidStorage.attributes || {}),
                            varietyRu: val,
                          };
                          syncItemContainerProperties(draft);
                        });
                      }}
                    />
                  </div>
                </>
              )}

              <ToggleControl
                label="Крышка открыта"
                checked={Boolean(fs.isOpen)}
                onChange={checked => {
                  commit(draft => {
                    if (!draft.fluidStorage) return;
                    draft.fluidStorage.isOpen = checked;
                    syncItemContainerProperties(draft);
                  });
                }}
              />
            </>
          )}

          {resolvedVis && isJarCanOrBottleContainer(item.itemId) && (
            <>
              <div className="cat-ed-field">
                <span className="cat-ed-lbl">Форма тары</span>
                <div className="cat-ed-chips">
                  {CONTAINER_SHAPES.map(sh => (
                    <button
                      type="button"
                      key={sh.id}
                      className={'cat-ed-chip' + (resolvedVis.shape === sh.id ? ' on' : '')}
                      onClick={() => updateContainerVisuals({ shape: sh.id, shapeNameRu: sh.label })}
                    >
                      {sh.label}
                    </button>
                  ))}
                </div>
              </div>

              <ColorControl
                label="Цвет стекла / корпуса"
                value={rgbTupleToHex(resolvedVis.materialRgb, '#e0f2fe')}
                swatches={GLASS_SWATCHES.map(s => s.hex)}
                onChange={hex => updateContainerVisuals({ materialRgb: hexToRgbTuple(hex) })}
              />

              <ColorControl
                label="Цвет крышки"
                value={rgbTupleToHex(resolvedVis.capRgb, '#94a3b8')}
                onChange={hex => updateContainerVisuals({ capRgb: hexToRgbTuple(hex) })}
              />

              <ToggleControl
                label="Этикетка на таре"
                checked={resolvedVis.labelRgb !== null}
                onChange={checked =>
                  updateContainerVisuals({
                    labelRgb: checked ? [248, 244, 232] : null,
                  })
                }
              />

              {resolvedVis.labelRgb !== null && (
                <ColorControl
                  label="Цвет этикетки"
                  value={rgbTupleToHex(resolvedVis.labelRgb, '#f8f4e8')}
                  onChange={hex => updateContainerVisuals({ labelRgb: hexToRgbTuple(hex) })}
                />
              )}
            </>
          )}
        </EditorSection>
      )}

      {/* 2. KITCHENWARE */}
      {hasKitchenware && item.kitchenwareAttributes && (() => {
        const kw = item.kitchenwareAttributes;
        return (
          <EditorSection
            id="kitchenware"
            title="Посуда и материал"
            icon={<Utensils width={14} height={14} color="#e0ab45" />}
            open={Boolean(openMap.kitchenware)}
            onToggle={toggleSec}
          >
            <div className="cat-ed-grid2">
              <div className="cat-ed-field">
                <span className="cat-ed-lbl">Материал</span>
                <select
                  className="cat-ed-select"
                  value={kw.material}
                  onKeyDown={stopInputKeys}
                  onChange={e => {
                    const mat = e.target.value as KitchenwareMaterial;
                    commit(draft => {
                      applyKitchenwareAttributesToItem(draft, {
                        material: mat,
                        materialRu: KITCHENWARE_MATERIAL_NAMES_RU[mat],
                      });
                    });
                  }}
                >
                  {(Object.keys(KITCHENWARE_MATERIAL_NAMES_RU) as KitchenwareMaterial[]).map(mat => (
                    <option key={mat} value={mat}>
                      {KITCHENWARE_MATERIAL_NAMES_RU[mat]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="cat-ed-field">
                <span className="cat-ed-lbl">Узор</span>
                <select
                  className="cat-ed-select"
                  value={kw.pattern}
                  onKeyDown={stopInputKeys}
                  onChange={e => {
                    const pat = e.target.value as KitchenwarePattern;
                    commit(draft => {
                      applyKitchenwareAttributesToItem(draft, {
                        pattern: pat,
                        patternNameRu: KITCHENWARE_PATTERN_NAMES_RU[pat],
                      });
                    });
                  }}
                >
                  {(Object.keys(KITCHENWARE_PATTERN_NAMES_RU) as KitchenwarePattern[]).map(pat => (
                    <option key={pat} value={pat}>
                      {KITCHENWARE_PATTERN_NAMES_RU[pat]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <ColorControl
              label="Основной цвет"
              value={kw.color}
              onChange={hex => commit(draft => applyKitchenwareAttributesToItem(draft, { color: hex }))}
            />
            <ColorControl
              label="Цвет ручки / ободка"
              value={kw.accentColor || '#475569'}
              onChange={hex => commit(draft => applyKitchenwareAttributesToItem(draft, { accentColor: hex }))}
            />
            {kw.pattern !== 'none' && (
              <ColorControl
                label="Цвет узора"
                value={kw.patternColor || '#1d4ed8'}
                onChange={hex => commit(draft => applyKitchenwareAttributesToItem(draft, { patternColor: hex }))}
              />
            )}

            {kw.capacityMl > 0 && (
              <SliderControl
                label="Объём посуды"
                value={kw.capacityMl}
                min={100}
                max={8000}
                step={50}
                unit="мл"
                onChange={val => commit(draft => applyKitchenwareAttributesToItem(draft, { capacityMl: val }))}
              />
            )}
            <SliderControl
              label="Размер (диаметр / длина)"
              value={kw.dimensionCm || 20}
              min={6}
              max={42}
              step={1}
              unit="см"
              onChange={val => commit(draft => applyKitchenwareAttributesToItem(draft, { dimensionCm: val }))}
            />

            <div className="cat-ed-toggles">
              {kw.kind === 'kettle' && (
                <>
                  <ToggleControl
                    label="Электрический"
                    checked={Boolean(kw.isElectric)}
                    onChange={checked => commit(draft => applyKitchenwareAttributesToItem(draft, { isElectric: checked }))}
                  />
                  <ToggleControl
                    label="Со свистком"
                    checked={Boolean(kw.hasWhistle)}
                    onChange={checked => commit(draft => applyKitchenwareAttributesToItem(draft, { hasWhistle: checked }))}
                  />
                </>
              )}
              {(kw.kind === 'cup' || kw.kind === 'mug') && (
                <ToggleControl
                  label="С блюдцем"
                  checked={Boolean(kw.hasSaucer)}
                  onChange={checked => commit(draft => applyKitchenwareAttributesToItem(draft, { hasSaucer: checked }))}
                />
              )}
            </div>
          </EditorSection>
        );
      })()}

      {/* 3. PHONE */}
      {hasPhone && item.phoneAttributes && (() => {
        const pa = item.phoneAttributes;
        const ps = item.phoneSpecs;
        return (
          <EditorSection
            id="phone"
            title="Смартфон и корпус"
            icon={<Smartphone width={14} height={14} color="#e0ab45" />}
            open={Boolean(openMap.phone)}
            onToggle={toggleSec}
          >
            <div className="cat-ed-field">
              <span className="cat-ed-lbl">Модель</span>
              <select
                className="cat-ed-select"
                value={pa.modelId}
                onKeyDown={stopInputKeys}
                onChange={e => {
                  const modelId = e.target.value;
                  const tpl = PHONE_MODELS[modelId];
                  if (!tpl) return;
                  commit(draft => {
                    draft.phoneAttributes = undefined;
                    draft.phoneSpecs = undefined;
                    applyPhoneAttributesToItem(draft, {}, modelId);
                  });
                }}
              >
                {Object.values(PHONE_MODELS).map(m => (
                  <option key={m.modelId} value={m.modelId}>
                    {m.brand} {m.modelName}
                  </option>
                ))}
              </select>
            </div>

            <ColorControl
              label="Цвет корпуса"
              value={pa.colorHex}
              onChange={hex =>
                commit(draft => {
                  const [r, g, b] = hexToRgbTuple(hex);
                  applyPhoneAttributesToItem(draft, {
                    colorHex: hex,
                    colorRgb: { r, g, b },
                  });
                })
              }
            />
            <ColorControl
              label="Цвет рамки / акцента"
              value={pa.accentHex}
              onChange={hex => commit(draft => applyPhoneAttributesToItem(draft, { accentHex: hex }))}
            />
            <ColorControl
              label="Цвет блока камер"
              value={pa.cameraPlateColor || '#1e293b'}
              onChange={hex => commit(draft => applyPhoneAttributesToItem(draft, { cameraPlateColor: hex }))}
            />

            <div className="cat-ed-field">
              <span className="cat-ed-lbl">Материал корпуса</span>
              <input
                type="text"
                className="cat-ed-input"
                value={pa.materialRu}
                onKeyDown={stopInputKeys}
                onChange={e => commit(draft => applyPhoneAttributesToItem(draft, { materialRu: e.target.value }))}
              />
            </div>

            {ps && (
              <>
                <SliderControl
                  label="Заряд батареи"
                  value={ps.batteryLevelPct}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  onChange={val =>
                    commit(draft => {
                      if (draft.phoneSpecs) draft.phoneSpecs.batteryLevelPct = val;
                    })
                  }
                />
                <div className="cat-ed-grid3">
                  <div className="cat-ed-field">
                    <span className="cat-ed-lbl">ОЗУ (ГБ)</span>
                    <input
                      type="number"
                      className="cat-ed-input mono"
                      min={1}
                      max={64}
                      value={ps.ramGb}
                      onKeyDown={stopInputKeys}
                      onChange={e => {
                        const val = clamp(Number(e.target.value) || 4, 1, 64);
                        commit(draft => {
                          if (draft.phoneSpecs) draft.phoneSpecs.ramGb = val;
                          draft.ram = val;
                        });
                      }}
                    />
                  </div>
                  <div className="cat-ed-field">
                    <span className="cat-ed-lbl">Память (ГБ)</span>
                    <input
                      type="number"
                      className="cat-ed-input mono"
                      min={8}
                      max={2048}
                      step={8}
                      value={ps.storageGb}
                      onKeyDown={stopInputKeys}
                      onChange={e => {
                        const val = clamp(Number(e.target.value) || 64, 8, 2048);
                        commit(draft => {
                          if (draft.phoneSpecs) draft.phoneSpecs.storageGb = val;
                          draft.storage = val;
                        });
                      }}
                    />
                  </div>
                  <div className="cat-ed-field">
                    <span className="cat-ed-lbl">АКБ (мАч)</span>
                    <input
                      type="number"
                      className="cat-ed-input mono"
                      min={500}
                      max={20000}
                      step={100}
                      value={ps.batteryCapacityMah}
                      onKeyDown={stopInputKeys}
                      onChange={e => {
                        const val = clamp(Number(e.target.value) || 4000, 500, 20000);
                        commit(draft => {
                          if (draft.phoneSpecs) draft.phoneSpecs.batteryCapacityMah = val;
                          draft.battery = val;
                        });
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </EditorSection>
        );
      })()}

      {/* 4. HARDWARE COMPONENT */}
      {hasHardware && item.hardwareAttributes && (() => {
        const hw = item.hardwareAttributes;
        return (
          <EditorSection
            id="hardware"
            title="Комплектующее"
            icon={<Cpu width={14} height={14} color="#e0ab45" />}
            open={Boolean(openMap.hardware)}
            onToggle={toggleSec}
          >
            <div className="cat-ed-grid2">
              <div className="cat-ed-field">
                <span className="cat-ed-lbl">Бренд</span>
                <input
                  type="text"
                  className="cat-ed-input"
                  value={hw.brand}
                  onKeyDown={stopInputKeys}
                  onChange={e => commit(draft => applyHardwareAttributesToItem(draft, { brand: e.target.value }))}
                />
              </div>
              <div className="cat-ed-field">
                <span className="cat-ed-lbl">Модель</span>
                <input
                  type="text"
                  className="cat-ed-input"
                  value={hw.model}
                  onKeyDown={stopInputKeys}
                  onChange={e => commit(draft => applyHardwareAttributesToItem(draft, { model: e.target.value }))}
                />
              </div>
            </div>
            <div className="cat-ed-field">
              <span className="cat-ed-lbl">Материал</span>
              <input
                type="text"
                className="cat-ed-input"
                value={hw.materialRu}
                onKeyDown={stopInputKeys}
                onChange={e => commit(draft => applyHardwareAttributesToItem(draft, { materialRu: e.target.value }))}
              />
            </div>
            <ColorControl
              label="Цвет платы / корпуса"
              value={hw.colorHex}
              onChange={hex => commit(draft => applyHardwareAttributesToItem(draft, { colorHex: hex }))}
            />
            <ColorControl
              label="Акцентный цвет"
              value={hw.accentHex || '#f59e0b'}
              onChange={hex => commit(draft => applyHardwareAttributesToItem(draft, { accentHex: hex }))}
            />
            <SliderControl
              label="Вес узла"
              value={hw.weightGrams}
              min={1}
              max={1500}
              step={1}
              unit="г"
              onChange={val => commit(draft => applyHardwareAttributesToItem(draft, { weightGrams: val }))}
            />
          </EditorSection>
        );
      })()}

      {/* 5. ROLLING PIN */}
      {hasRollingPin && item.rollingPinAttributes && (() => {
        const rp = item.rollingPinAttributes;
        return (
          <EditorSection
            id="rolling_pin"
            title="Скалка"
            icon={<Utensils width={14} height={14} color="#e0ab45" />}
            open={Boolean(openMap.rolling_pin)}
            onToggle={toggleSec}
          >
            <div className="cat-ed-field">
              <span className="cat-ed-lbl">Модель скалки</span>
              <select
                className="cat-ed-select"
                value={rp.modelId}
                onKeyDown={stopInputKeys}
                onChange={e =>
                  commit(draft =>
                    applyRollingPinAttributesToItem(draft, { modelId: e.target.value as RollingPinModel })
                  )
                }
              >
                {(Object.keys(ROLLING_PIN_PRESETS) as RollingPinModel[]).map(mid => (
                  <option key={mid} value={mid}>
                    {ROLLING_PIN_PRESETS[mid].modelNameRu}
                  </option>
                ))}
              </select>
            </div>
            <div className="cat-ed-grid2">
              <div className="cat-ed-field">
                <span className="cat-ed-lbl">Материал</span>
                <select
                  className="cat-ed-select"
                  value={rp.material}
                  onKeyDown={stopInputKeys}
                  onChange={e => {
                    const m = ROLLING_PIN_MATERIALS.find(x => x.id === e.target.value);
                    if (m) {
                      commit(draft =>
                        applyRollingPinAttributesToItem(draft, { material: m.id, materialRu: m.label })
                      );
                    }
                  }}
                >
                  {ROLLING_PIN_MATERIALS.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="cat-ed-field">
                <span className="cat-ed-lbl">Узор</span>
                <select
                  className="cat-ed-select"
                  value={rp.pattern}
                  onKeyDown={stopInputKeys}
                  onChange={e => {
                    const p = ROLLING_PIN_PATTERNS.find(x => x.id === e.target.value);
                    if (p) {
                      commit(draft =>
                        applyRollingPinAttributesToItem(draft, { pattern: p.id, patternNameRu: p.label })
                      );
                    }
                  }}
                >
                  {ROLLING_PIN_PATTERNS.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <ColorControl
              label="Цвет вала"
              value={rp.color}
              onChange={hex => commit(draft => applyRollingPinAttributesToItem(draft, { color: hex }))}
            />
            <ColorControl
              label="Цвет ручек"
              value={rp.accentColor}
              onChange={hex => commit(draft => applyRollingPinAttributesToItem(draft, { accentColor: hex }))}
            />
            <SliderControl
              label="Длина"
              value={rp.lengthCm}
              min={14}
              max={60}
              step={1}
              unit="см"
              onChange={val => commit(draft => applyRollingPinAttributesToItem(draft, { lengthCm: val }))}
            />
            <SliderControl
              label="Диаметр"
              value={rp.diameterMm}
              min={22}
              max={85}
              step={1}
              unit="мм"
              onChange={val => commit(draft => applyRollingPinAttributesToItem(draft, { diameterMm: val }))}
            />
            <ToggleControl
              label="Тиснение узора на тесте"
              checked={Boolean(rp.embossPatternOnDough)}
              onChange={checked =>
                commit(draft => applyRollingPinAttributesToItem(draft, { embossPatternOnDough: checked }))
              }
            />
          </EditorSection>
        );
      })()}

      {/* 6. GUMMY CANDY */}
      {hasGummy && item.gummyAttributes && (() => {
        const g = item.gummyAttributes;
        const rebuildGummy = (patch: Partial<typeof g>) => {
          commit(draft => {
            const nextAttrs = { ...g, ...patch };
            if (patch.shape) nextAttrs.shapeNameRu = GUMMY_SHAPE_NAMES_RU[patch.shape];
            const fresh = createGummyCandy(nextAttrs);
            fresh.id = draft.id;
            fresh.temperature = draft.temperature;
            fresh.wetness = draft.wetness;
            return fresh;
          });
        };
        return (
          <EditorSection
            id="gummy"
            title="Мармелад"
            icon={<Candy width={14} height={14} color="#e0ab45" />}
            open={Boolean(openMap.gummy)}
            onToggle={toggleSec}
          >
            <div className="cat-ed-field">
              <span className="cat-ed-lbl">Форма</span>
              <div className="cat-ed-chips">
                {(Object.keys(GUMMY_SHAPE_NAMES_RU) as GummyCandyShape[]).map(sh => (
                  <button
                    type="button"
                    key={sh}
                    className={'cat-ed-chip' + (g.shape === sh ? ' on' : '')}
                    onClick={() => rebuildGummy({ shape: sh })}
                  >
                    {GUMMY_SHAPE_NAMES_RU[sh]}
                  </button>
                ))}
              </div>
            </div>
            <ColorControl
              label="Цвет мармеладки"
              value={g.color}
              onChange={hex => rebuildGummy({ color: hex })}
            />
            <div className="cat-ed-field">
              <span className="cat-ed-lbl">Вкус</span>
              <input
                type="text"
                className="cat-ed-input"
                value={g.flavorRu || ''}
                onKeyDown={stopInputKeys}
                onChange={e => rebuildGummy({ flavorRu: e.target.value })}
              />
            </div>
            <ToggleControl
              label="Кислая сахарная обсыпка"
              checked={Boolean(g.sourDust)}
              onChange={checked => rebuildGummy({ sourDust: checked })}
            />
          </EditorSection>
        );
      })()}

      {/* 7. CHOCOLATE */}
      {hasChocolate && item.chocolateAttributes && (() => {
        const ch = item.chocolateAttributes;
        const rebuildChoc = (patch: Partial<typeof ch>) => {
          commit(draft => {
            const nextAttrs = { ...ch, ...patch };
            if (patch.shape) nextAttrs.shapeNameRu = CHOCOLATE_SHAPE_NAMES_RU[patch.shape];
            if (patch.size) nextAttrs.sizeNameRu = CHOCOLATE_SIZE_NAMES_RU[patch.size];
            const fresh = createChocolate(nextAttrs);
            fresh.id = draft.id;
            fresh.temperature = draft.temperature;
            return fresh;
          });
        };
        return (
          <EditorSection
            id="chocolate"
            title="Шоколад"
            icon={<Candy width={14} height={14} color="#e0ab45" />}
            open={Boolean(openMap.chocolate)}
            onToggle={toggleSec}
          >
            <div className="cat-ed-field">
              <span className="cat-ed-lbl">Форма</span>
              <select
                className="cat-ed-select"
                value={ch.shape}
                onKeyDown={stopInputKeys}
                onChange={e => rebuildChoc({ shape: e.target.value as ChocolateShape })}
              >
                {(Object.keys(CHOCOLATE_SHAPE_NAMES_RU) as ChocolateShape[]).map(sh => (
                  <option key={sh} value={sh}>
                    {CHOCOLATE_SHAPE_NAMES_RU[sh]}
                  </option>
                ))}
              </select>
            </div>
            <div className="cat-ed-field">
              <span className="cat-ed-lbl">Размер</span>
              <div className="cat-ed-chips">
                {(Object.keys(CHOCOLATE_SIZE_NAMES_RU) as ChocolateSize[]).map(sz => (
                  <button
                    type="button"
                    key={sz}
                    className={'cat-ed-chip' + (ch.size === sz ? ' on' : '')}
                    onClick={() => rebuildChoc({ size: sz })}
                  >
                    {CHOCOLATE_SIZE_NAMES_RU[sz]}
                  </button>
                ))}
              </div>
            </div>
            <div className="cat-ed-field">
              <span className="cat-ed-lbl">Фактура поверхности</span>
              <div className="cat-ed-chips">
                {CHOCOLATE_TEXTURES.map(tx => (
                  <button
                    type="button"
                    key={tx.id}
                    className={'cat-ed-chip' + ((ch.surfaceTexture || 'smooth') === tx.id ? ' on' : '')}
                    onClick={() => rebuildChoc({ surfaceTexture: tx.id })}
                  >
                    {tx.label}
                  </button>
                ))}
              </div>
            </div>
            <SliderControl
              label="Содержание какао"
              value={ch.cocoaPercent ?? 45}
              min={0}
              max={99}
              step={1}
              unit="%"
              onChange={val => rebuildChoc({ cocoaPercent: val })}
            />
            <ColorControl
              label="Цвет оболочки"
              value={ch.outerColor}
              onChange={hex => rebuildChoc({ outerColor: hex })}
            />
            <ToggleControl
              label="Начинка внутри"
              checked={Boolean(ch.hasFilling)}
              onChange={checked => rebuildChoc({ hasFilling: checked })}
            />
            {ch.hasFilling && (
              <>
                <ColorControl
                  label="Цвет начинки"
                  value={ch.innerColor}
                  onChange={hex => rebuildChoc({ innerColor: hex })}
                />
                <div className="cat-ed-field">
                  <span className="cat-ed-lbl">Описание начинки</span>
                  <input
                    type="text"
                    className="cat-ed-input"
                    value={ch.innerMaterialRu}
                    onKeyDown={stopInputKeys}
                    onChange={e => rebuildChoc({ innerMaterialRu: e.target.value })}
                  />
                </div>
              </>
            )}
          </EditorSection>
        );
      })()}

      {/* 8. PELMEN */}
      {hasPelmen && item.pelmenAttributes && (() => {
        const p = item.pelmenAttributes;
        const rebuildPelmen = (patch: Partial<typeof p>) => {
          commit(draft => {
            const nextAttrs = { ...p, ...patch };
            if (patch.shape) nextAttrs.shapeNameRu = PELMEN_SHAPE_NAMES_RU[patch.shape];
            if (patch.size) nextAttrs.sizeNameRu = PELMEN_SIZE_NAMES_RU[patch.size];
            if (patch.state) nextAttrs.stateNameRu = PELMEN_STATE_NAMES_RU[patch.state];
            const fresh = createPelmen(nextAttrs);
            fresh.id = draft.id;
            return fresh;
          });
        };
        return (
          <EditorSection
            id="pelmen"
            title="Пельмень"
            icon={<Cookie width={14} height={14} color="#e0ab45" />}
            open={Boolean(openMap.pelmen)}
            onToggle={toggleSec}
          >
            <div className="cat-ed-field">
              <span className="cat-ed-lbl">Форма лепки</span>
              <select
                className="cat-ed-select"
                value={p.shape}
                onKeyDown={stopInputKeys}
                onChange={e => rebuildPelmen({ shape: e.target.value as PelmenShape })}
              >
                {(Object.keys(PELMEN_SHAPE_NAMES_RU) as PelmenShape[]).map(sh => (
                  <option key={sh} value={sh}>
                    {PELMEN_SHAPE_NAMES_RU[sh]}
                  </option>
                ))}
              </select>
            </div>
            <div className="cat-ed-field">
              <span className="cat-ed-lbl">Размер</span>
              <div className="cat-ed-chips">
                {(Object.keys(PELMEN_SIZE_NAMES_RU) as PelmenSize[]).map(sz => (
                  <button
                    type="button"
                    key={sz}
                    className={'cat-ed-chip' + (p.size === sz ? ' on' : '')}
                    onClick={() => rebuildPelmen({ size: sz })}
                  >
                    {PELMEN_SIZE_NAMES_RU[sz]}
                  </button>
                ))}
              </div>
            </div>
            <div className="cat-ed-field">
              <span className="cat-ed-lbl">Состояние</span>
              <div className="cat-ed-chips">
                {(Object.keys(PELMEN_STATE_NAMES_RU) as PelmenState[]).map(st => (
                  <button
                    type="button"
                    key={st}
                    className={'cat-ed-chip' + (p.state === st ? ' on' : '')}
                    onClick={() => rebuildPelmen({ state: st })}
                  >
                    {PELMEN_STATE_NAMES_RU[st]}
                  </button>
                ))}
              </div>
            </div>
            <ColorControl
              label="Цвет теста"
              value={p.doughColor}
              onChange={hex => rebuildPelmen({ doughColor: hex })}
            />
            <ColorControl
              label="Цвет начинки"
              value={p.fillingColor}
              onChange={hex => rebuildPelmen({ fillingColor: hex })}
            />
            <SliderControl
              label="Доля начинки"
              value={p.fillingRatioPercent}
              min={20}
              max={85}
              step={5}
              unit="%"
              onChange={val => rebuildPelmen({ fillingRatioPercent: val })}
            />
            <SliderControl
              label="Толщина теста"
              value={p.doughThicknessMm}
              min={0.6}
              max={3.0}
              step={0.1}
              unit="мм"
              onChange={val => rebuildPelmen({ doughThicknessMm: val })}
            />
            <div className="cat-ed-toggles">
              <ToggleControl
                label="Мучная обсыпка"
                checked={Boolean(p.flourDusting)}
                onChange={checked => rebuildPelmen({ flourDusting: checked })}
              />
              <ToggleControl
                label="Блеск масла / бульона"
                checked={Boolean(p.butterGlaze)}
                onChange={checked => rebuildPelmen({ butterGlaze: checked })}
              />
            </div>
          </EditorSection>
        );
      })()}

      {/* 9. DOUGH */}
      {hasDough && item.doughAttributes && (() => {
        const d = item.doughAttributes;
        const patchDough = (patch: Partial<typeof d>) => {
          commit(draft => {
            if (!draft.doughAttributes) return;
            const next = { ...draft.doughAttributes, ...patch };
            if (patch.shape) next.shapeNameRu = DOUGH_SHAPE_NAMES_RU[patch.shape];
            if (patch.cookState) next.cookStateRu = DOUGH_COOK_STATE_RU[patch.cookState];
            applyDoughAttributesToItem(draft, next);
          });
        };
        return (
          <EditorSection
            id="dough"
            title="Тесто и выпечка"
            icon={<Cookie width={14} height={14} color="#e0ab45" />}
            open={Boolean(openMap.dough)}
            onToggle={toggleSec}
          >
            <div className="cat-ed-field">
              <span className="cat-ed-lbl">Форма изделия</span>
              <select
                className="cat-ed-select"
                value={d.shape}
                onKeyDown={stopInputKeys}
                onChange={e => patchDough({ shape: e.target.value as DoughShape })}
              >
                {(Object.keys(DOUGH_SHAPE_NAMES_RU) as DoughShape[]).map(sh => (
                  <option key={sh} value={sh}>
                    {DOUGH_SHAPE_NAMES_RU[sh]}
                  </option>
                ))}
              </select>
            </div>
            <div className="cat-ed-field">
              <span className="cat-ed-lbl">Термообработка</span>
              <div className="cat-ed-chips">
                {(Object.keys(DOUGH_COOK_STATE_RU) as DoughCookState[]).map(st => (
                  <button
                    type="button"
                    key={st}
                    className={'cat-ed-chip' + (d.cookState === st ? ' on' : '')}
                    onClick={() => patchDough({ cookState: st })}
                  >
                    {DOUGH_COOK_STATE_RU[st]}
                  </button>
                ))}
              </div>
            </div>
            <ColorControl
              label="Цвет теста"
              value={d.color}
              onChange={hex => patchDough({ color: hex })}
            />
            <ColorControl
              label="Цвет вкраплений"
              value={d.fleckColor || '#92400e'}
              onChange={hex => patchDough({ fleckColor: hex })}
            />
            <SliderControl
              label="Масса теста"
              value={d.weightGrams}
              min={20}
              max={2000}
              step={10}
              unit="г"
              onChange={val => patchDough({ weightGrams: val, baseMassGrams: Math.max(d.baseMassGrams, val) })}
            />
            <SliderControl
              label="Толщина пласта"
              value={d.thicknessMm}
              min={1}
              max={60}
              step={1}
              unit="мм"
              onChange={val => patchDough({ thicknessMm: val })}
            />
            <div className="cat-ed-field">
              <span className="cat-ed-lbl">Рельефный узор</span>
              <select
                className="cat-ed-select"
                value={d.embossedPattern || 'none'}
                onKeyDown={stopInputKeys}
                onChange={e => {
                  const pat = e.target.value as RollingPinPattern;
                  const meta = ROLLING_PIN_PATTERNS.find(x => x.id === pat);
                  patchDough({
                    embossedPattern: pat === 'none' ? undefined : pat,
                    embossedPatternRu: pat === 'none' ? undefined : meta?.label,
                  });
                }}
              >
                {ROLLING_PIN_PATTERNS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </EditorSection>
        );
      })()}

      {/* 10. PRODUCE */}
      {hasProduce && item.produceAttributes && (() => {
        const pr = item.produceAttributes;
        return (
          <EditorSection
            id="produce"
            title="Плоды и нарезка"
            icon={<Leaf width={14} height={14} color="#e0ab45" />}
            open={Boolean(openMap.produce)}
            onToggle={toggleSec}
          >
            <div className="cat-ed-field">
              <span className="cat-ed-lbl">Форма нарезки</span>
              <select
                className="cat-ed-select"
                value={pr.cutForm}
                onKeyDown={stopInputKeys}
                onChange={e =>
                  commit(draft =>
                    applyProduceAttributesToItem(draft, { cutForm: e.target.value as ProduceCutForm })
                  )
                }
              >
                {PRODUCE_CUT_FORMS.map(cf => (
                  <option key={cf.id} value={cf.id}>
                    {cf.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="cat-ed-field">
              <span className="cat-ed-lbl">Размер</span>
              <div className="cat-ed-chips">
                {SIZE_TIERS.map(sz => (
                  <button
                    type="button"
                    key={sz.id}
                    className={'cat-ed-chip' + (pr.size === sz.id ? ' on' : '')}
                    onClick={() => commit(draft => applyProduceAttributesToItem(draft, { size: sz.id }))}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="cat-ed-field">
              <span className="cat-ed-lbl">Сорт</span>
              <input
                type="text"
                className="cat-ed-input"
                value={pr.varietyRu}
                onKeyDown={stopInputKeys}
                onChange={e =>
                  commit(draft => applyProduceAttributesToItem(draft, { varietyRu: e.target.value }))
                }
              />
            </div>
            <ColorControl
              label="Цвет кожицы"
              value={pr.color}
              onChange={hex => commit(draft => applyProduceAttributesToItem(draft, { color: hex }))}
            />
            <ColorControl
              label="Цвет мякоти"
              value={pr.fleshColor}
              onChange={hex => commit(draft => applyProduceAttributesToItem(draft, { fleshColor: hex }))}
            />
            <SliderControl
              label="Сочность"
              value={pr.juiciness}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={val => commit(draft => applyProduceAttributesToItem(draft, { juiciness: val }))}
            />
            <SliderControl
              label="Вес плода"
              value={pr.weightGrams}
              min={5}
              max={Math.max(1500, pr.baseWholeWeightGrams * 2)}
              step={5}
              unit="г"
              onChange={val => commit(draft => applyProduceAttributesToItem(draft, { weightGrams: val }))}
            />
            <div className="cat-ed-toggles">
              <ToggleControl
                label="Очищен от кожуры"
                checked={Boolean(pr.isPeeled)}
                onChange={checked => commit(draft => applyProduceAttributesToItem(draft, { isPeeled: checked }))}
              />
              <ToggleControl
                label="Сушёный / вяленый"
                checked={Boolean(pr.isDried)}
                onChange={checked => commit(draft => applyProduceAttributesToItem(draft, { isDried: checked }))}
              />
            </div>
          </EditorSection>
        );
      })()}

      {/* 11. MEAT & FISH */}
      {hasMeat && item.meatAttributes && (() => {
        const mt = item.meatAttributes;
        return (
          <EditorSection
            id="meat"
            title="Мясо и разделка"
            icon={<Beef width={14} height={14} color="#e0ab45" />}
            open={Boolean(openMap.meat)}
            onToggle={toggleSec}
          >
            <div className="cat-ed-field">
              <span className="cat-ed-lbl">Форма нарезки</span>
              <select
                className="cat-ed-select"
                value={mt.cutForm}
                onKeyDown={stopInputKeys}
                onChange={e =>
                  commit(draft => applyMeatAttributesToItem(draft, { cutForm: e.target.value as MeatCutForm }))
                }
              >
                {MEAT_CUT_FORMS.map(cf => (
                  <option key={cf.id} value={cf.id}>
                    {cf.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="cat-ed-field">
              <span className="cat-ed-lbl">Размер</span>
              <div className="cat-ed-chips">
                {SIZE_TIERS.map(sz => (
                  <button
                    type="button"
                    key={sz.id}
                    className={'cat-ed-chip' + (mt.size === sz.id ? ' on' : '')}
                    onClick={() => commit(draft => applyMeatAttributesToItem(draft, { size: sz.id }))}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>
            </div>
            <ColorControl
              label="Цвет мякоти"
              value={mt.color}
              onChange={hex => commit(draft => applyMeatAttributesToItem(draft, { color: hex }))}
            />
            <ColorControl
              label="Цвет жира / прожилок"
              value={mt.fatColor}
              onChange={hex => commit(draft => applyMeatAttributesToItem(draft, { fatColor: hex }))}
            />
            <SliderControl
              label="Сочность"
              value={mt.juiciness}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={val => commit(draft => applyMeatAttributesToItem(draft, { juiciness: val }))}
            />
            <SliderControl
              label="Жирность"
              value={mt.fatContent}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={val => commit(draft => applyMeatAttributesToItem(draft, { fatContent: val }))}
            />
            <SliderControl
              label="Вес куска"
              value={mt.weightGrams}
              min={20}
              max={Math.max(3000, mt.baseWholeWeightGrams * 2)}
              step={10}
              unit="г"
              onChange={val => commit(draft => applyMeatAttributesToItem(draft, { weightGrams: val }))}
            />
            <div className="cat-ed-toggles">
              <ToggleControl
                label="На кости"
                checked={Boolean(mt.hasBone)}
                onChange={checked => commit(draft => applyMeatAttributesToItem(draft, { hasBone: checked }))}
              />
              <ToggleControl
                label="С кожей / панцирем"
                checked={Boolean(mt.hasSkin)}
                onChange={checked => commit(draft => applyMeatAttributesToItem(draft, { hasSkin: checked }))}
              />
            </div>
          </EditorSection>
        );
      })()}

      {/* 12. PLANT BRANCH */}
      {hasBranch && item.branchAttributes && (() => {
        const br = item.branchAttributes;
        return (
          <EditorSection
            id="branch"
            title="Ветка и плоды"
            icon={<Leaf width={14} height={14} color="#e0ab45" />}
            open={Boolean(openMap.branch)}
            onToggle={toggleSec}
          >
            <div className="cat-ed-field">
              <span className="cat-ed-lbl">Тип ветки</span>
              <div className="cat-ed-chips">
                {BRANCH_KINDS.map(bk => (
                  <button
                    type="button"
                    key={bk.id}
                    className={'cat-ed-chip' + (br.branchKind === bk.id ? ' on' : '')}
                    onClick={() =>
                      commit(draft =>
                        applyBranchAttributesToItem(draft, { branchKind: bk.id, branchKindRu: bk.label })
                      )
                    }
                  >
                    {bk.label}
                  </button>
                ))}
              </div>
            </div>
            <ColorControl
              label="Цвет ветки"
              value={br.color}
              onChange={hex => commit(draft => applyBranchAttributesToItem(draft, { color: hex }))}
            />
            <SliderControl
              label="Свежесть"
              value={br.freshness}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={val => commit(draft => applyBranchAttributesToItem(draft, { freshness: val }))}
            />
            {br.attachedFruit && (
              <SliderControl
                label={`Плодов (${br.attachedFruit.nameRu})`}
                value={br.attachedFruit.count}
                min={0}
                max={Math.max(24, br.attachedFruit.maxCount)}
                step={1}
                unit="шт"
                onChange={val =>
                  commit(draft => {
                    if (!draft.branchAttributes?.attachedFruit) return;
                    const af = {
                      ...draft.branchAttributes.attachedFruit,
                      count: val,
                      maxCount: Math.max(draft.branchAttributes.attachedFruit.maxCount, val),
                    };
                    applyBranchAttributesToItem(draft, { attachedFruit: val > 0 ? af : null });
                  })
                }
              />
            )}
          </EditorSection>
        );
      })()}

      {/* 13. CLOTHING */}
      {hasClothing && item.clothingStats && (() => {
        const cs = item.clothingStats;
        const patchCloth = (patch: Partial<typeof cs>) => {
          commit(draft => {
            if (!draft.clothingStats) return;
            draft.clothingStats = { ...draft.clothingStats, ...patch };
          });
        };
        return (
          <EditorSection
            id="clothing"
            title="Одежда и защита"
            icon={<Shirt width={14} height={14} color="#e0ab45" />}
            open={Boolean(openMap.clothing)}
            onToggle={toggleSec}
          >
            <ColorControl
              label="Основной цвет"
              value={cs.color || '#334155'}
              onChange={hex => patchCloth({ color: hex })}
            />
            <ColorControl
              label="Дополнительный цвет"
              value={cs.secondaryColor || '#94a3b8'}
              onChange={hex => patchCloth({ secondaryColor: hex })}
            />
            <SliderControl
              label="Утепление"
              value={cs.insulation}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={val => patchCloth({ insulation: val })}
            />
            <SliderControl
              label="Ветрозащита"
              value={cs.windResistance}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={val => patchCloth({ windResistance: val })}
            />
            <SliderControl
              label="Влагозащита"
              value={cs.waterResistance}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={val => patchCloth({ waterResistance: val })}
            />
            <SliderControl
              label="Дышащие свойства"
              value={cs.breathability}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={val => patchCloth({ breathability: val })}
            />
            <SliderControl
              label="Штраф подвижности"
              value={cs.mobilityPenalty}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={val => patchCloth({ mobilityPenalty: val })}
            />
            {cs.pocketCapacityL !== undefined && (
              <SliderControl
                label="Объём карманов"
                value={cs.pocketCapacityL}
                min={0}
                max={20}
                step={0.1}
                unit="л"
                onChange={val => patchCloth({ pocketCapacityL: val })}
              />
            )}
          </EditorSection>
        );
      })()}

      {/* 14. CONTAINER / PACKAGING */}
      {hasPackaging && (
        <EditorSection
          id="packaging"
          title="Контейнер и оформление"
          icon={<Package width={14} height={14} color="#e0ab45" />}
          open={Boolean(openMap.packaging)}
          onToggle={toggleSec}
        >
          <ColorControl
            label="Цвет корпуса / упаковки"
            value={item.containerTintColor || '#64748b'}
            onChange={hex => commit(draft => { draft.containerTintColor = hex; })}
          />
          <ColorControl
            label="Цвет этикетки"
            value={item.labelColor || '#f4f1ea'}
            onChange={hex => commit(draft => { draft.labelColor = hex; })}
          />
          {item.containerCapacityL !== undefined && (
            <SliderControl
              label="Вместимость"
              value={item.containerCapacityL}
              min={0.1}
              max={80}
              step={0.1}
              unit="л"
              onChange={val => commit(draft => { draft.containerCapacityL = val; })}
            />
          )}
          <ToggleControl
            label="Открыт"
            checked={Boolean(item.isOpen)}
            onChange={checked => commit(draft => { draft.isOpen = checked; })}
          />
        </EditorSection>
      )}

      {/* 15. GENERAL PARAMETERS */}
      <EditorSection
        id="general"
        title="Общие параметры"
        icon={<Sliders width={14} height={14} color="#e0ab45" />}
        open={Boolean(openMap.general)}
        onToggle={toggleSec}
      >
        <div className="cat-ed-field">
          <span className="cat-ed-lbl">Название</span>
          <input
            type="text"
            className="cat-ed-input"
            value={item.nameRu}
            onKeyDown={stopInputKeys}
            onChange={e => commit(draft => { draft.nameRu = e.target.value; })}
          />
        </div>
        <div className="cat-ed-grid2">
          <div className="cat-ed-field">
            <span className="cat-ed-lbl">Вес (кг)</span>
            <input
              type="number"
              className="cat-ed-input mono"
              min={0.001}
              max={200}
              step={0.01}
              value={Number((item.weight || 0).toFixed(3))}
              onKeyDown={stopInputKeys}
              onChange={e => {
                const v = Math.max(0.001, parseFloat(e.target.value) || 0.001);
                commit(draft => { draft.weight = Number(v.toFixed(3)); });
              }}
            />
          </div>
          <div className="cat-ed-field">
            <span className="cat-ed-lbl">Объём (л)</span>
            <input
              type="number"
              className="cat-ed-input mono"
              min={0.001}
              max={200}
              step={0.01}
              value={Number((item.volume || 0).toFixed(3))}
              onKeyDown={stopInputKeys}
              onChange={e => {
                const v = Math.max(0.001, parseFloat(e.target.value) || 0.001);
                commit(draft => { draft.volume = Number(v.toFixed(3)); });
              }}
            />
          </div>
        </div>
        <SliderControl
          label="Температура"
          value={item.temperature ?? 20}
          min={-25}
          max={120}
          step={1}
          unit="°C"
          onChange={val =>
            commit(draft => {
              draft.temperature = val;
              draft.surfaceTemperature = val;
            })
          }
        />
        <SliderControl
          label="Влажность"
          value={item.wetness ?? 0}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={val => commit(draft => { draft.wetness = val; })}
        />
        {(item.maxPortions || 0) > 1 && (
          <SliderControl
            label="Порции"
            value={item.portions ?? item.maxPortions ?? 1}
            min={1}
            max={item.maxPortions || 10}
            step={1}
            onChange={val => commit(draft => { draft.portions = val; })}
          />
        )}
      </EditorSection>

      {/* 16. CONSUMPTION EFFECTS */}
      <EditorSection
        id="effects"
        title="Эффекты употребления"
        icon={<Sparkles width={14} height={14} color="#e0ab45" />}
        open={Boolean(openMap.effects)}
        onToggle={toggleSec}
      >
        <div className="cat-ed-grid2">
          {(
            [
              { key: 'hunger', label: 'Сытость' },
              { key: 'thirst', label: 'Жажда' },
              { key: 'health', label: 'Здоровье' },
              { key: 'energy', label: 'Бодрость' },
              { key: 'sleepiness', label: 'Сонливость' },
            ] as const
          ).map(eff => (
            <div key={eff.key} className="cat-ed-field">
              <span className="cat-ed-lbl">{eff.label}</span>
              <input
                type="number"
                className="cat-ed-input mono"
                min={-100}
                max={100}
                step={1}
                value={item.effects?.[eff.key] ?? 0}
                onKeyDown={stopInputKeys}
                onChange={e => {
                  const v = clamp(parseInt(e.target.value, 10) || 0, -100, 100);
                  commit(draft => {
                    const nextEffects = { ...(draft.effects || {}) };
                    if (v === 0) {
                      delete nextEffects[eff.key];
                    } else {
                      nextEffects[eff.key] = v;
                    }
                    draft.effects = nextEffects;
                    if (Object.keys(nextEffects).length > 0) {
                      draft.usable = true;
                    }
                  });
                }}
              />
            </div>
          ))}
        </div>
      </EditorSection>
    </div>
  );
};
