import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Car,
  Truck,
  Bus,
  ShieldAlert,
  Plane,
  Grid,
  Coins,
  Wrench,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Check,
  AlertTriangle,
  MinusCircle,
  Armchair,
  Flame,
  Lamp,
  Store,
  Flower2,
  Disc,
  Clock,
  Compass,
  Sliders,
  MapPin,
  Heart,
  Wand2,
  Package,
  Layers,
  Zap
} from 'lucide-react';
import { CAR_CONFIGS } from '../vehicleHelpers';
import { ActivePlacement } from '../types';
import { GameCalendarState, formatGameDate, formatGameTime } from '../calendarSystem';
import { VehiclePreviewCanvas } from './VehiclePreviewCanvas';
import { VEHICLE_CATALOG, VehicleCatalogEntry, getVehicleCatalogItem } from '../vehicleCatalog';
import { ITEM_CATALOG } from '../items';

export interface CreativeMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Tabs & state
  creativeTab: 'vehicles' | 'props' | 'items' | 'cheats';
  setCreativeTab: (tab: 'vehicles' | 'props' | 'items' | 'cheats') => void;
  // Vehicles
  creativeVehicleColor: string;
  setCreativeVehicleColor: (col: string) => void;
  onSelectVehicleForPlacement: (key: string, nameRu: string, color: string) => void;
  onSpawnVehicleNearPlayer?: (key: string, color: string, autoEnter?: boolean) => void;
  activePlacement: ActivePlacement | null;
  // Props
  onSelectPropForPlacement: (propId: string, nameRu: string) => void;
  // Items
  itemSearch: string;
  setItemSearch: (s: string) => void;
  onGiveItem: (key: string, count: number) => void;
  // Cheats
  isFlying: boolean;
  onToggleFlying: () => void;
  isInvincible: boolean;
  onToggleInvincible: () => void;
  isGridMode: boolean;
  onToggleGridMode: () => void;
  isCleanMode: boolean;
  onToggleCleanMode: () => void;
  onGiveCash: (amount: number) => void;
  onOpenCalendar: () => void;
  calendar: GameCalendarState;
  timeHour: number;
  onStepDay: (delta: number) => void;
  onRepairAllVehicles: () => void;
  onClearCreatedSpawns: () => void;
}

const VEHICLE_COLORS = [
  { hex: '#c68a35', name: 'Охра Тракт' },
  { hex: '#f43f5e', name: 'Красный' },
  { hex: '#f97316', name: 'Оранжевый' },
  { hex: '#eab308', name: 'Жёлтый' },
  { hex: '#22c55e', name: 'Зелёный' },
  { hex: '#06b6d4', name: 'Бирюзовый' },
  { hex: '#38bdf8', name: 'Голубой' },
  { hex: '#818cf8', name: 'Индиго' },
  { hex: '#a855f7', name: 'Фиолетовый' },
  { hex: '#e2e8f0', name: 'Белый' },
  { hex: '#475569', name: 'Серый' },
  { hex: '#0f172a', name: 'Чёрный' }
];

const PROP_CATALOG = [
  { id: 'cone', label: 'Дорожный конус', category: 'road', icon: AlertTriangle, desc: 'Пластиковый оградительный конус' },
  { id: 'bollard', label: 'Столбик ограждения', category: 'road', icon: MinusCircle, desc: 'Парковочный стальной столбик' },
  { id: 'lamp_highway', label: 'Шоссейный фонарь', category: 'urban', icon: Lamp, desc: 'Высокая опора освещения с консолью' },
  { id: 'lamp_concrete', label: 'Бетонный столб', category: 'urban', icon: Lamp, desc: 'Тяжелый несбиваемый советский столб' },
  { id: 'lamp', label: 'Парковый фонарь', category: 'urban', icon: Lamp, desc: 'Классический чугунный светильник' },
  { id: 'bench', label: 'Уличная скамейка', category: 'urban', icon: Armchair, desc: 'Деревянная лавка со спинкой' },
  { id: 'trash_can', label: 'Мусорная урна', category: 'urban', icon: Trash2, desc: 'Городская урна для мелкого сора' },
  { id: 'dumpster', label: 'Мусорный бак', category: 'urban', icon: Trash2, desc: 'Большой металлический контейнер' },
  { id: 'hydrant', label: 'Пожарный гидрант', category: 'urban', icon: Flame, desc: 'Чугунный гидрант подачи воды' },
  { id: 'mailbox', label: 'Почтовый ящик', category: 'urban', icon: MailIcon, desc: 'Синий металлический почтовый ящик' },
  { id: 'bus_stop', label: 'Автобусная остановка', category: 'urban', icon: Store, desc: 'Крытый павильон ожидания' },
  { id: 'kiosk', label: 'Торговый киоск', category: 'urban', icon: Store, desc: 'Газетный киоск «Союзпечать»' },
  { id: 'flowerbed', label: 'Клумба с цветами', category: 'nature', icon: Flower2, desc: 'Круглая городская клумба' },
  { id: 'tire_flowerbed', label: 'Клумба из покрышки', category: 'nature', icon: Disc, desc: 'Дворовая клумба из крашеной шины' }
];

function MailIcon(props: { className?: string }) {
  return (
    <svg className={props.className || 'w-4 h-4'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function getVehicleTypeIcon(type?: string) {
  if (!type) return Car;
  const t = type.toLowerCase();
  if (t.includes('bus') || t.includes('paz') || t.includes('ikarus')) return Bus;
  if (t.includes('truck') || t.includes('kamaz') || t.includes('zil') || t.includes('ural') || t.includes('gazel') || t.includes('trailer')) return Truck;
  return Car;
}

export const CreativeMenuModal: React.FC<CreativeMenuModalProps> = ({
  isOpen,
  onClose,
  creativeTab,
  setCreativeTab,
  creativeVehicleColor,
  setCreativeVehicleColor,
  onSelectVehicleForPlacement,
  onSpawnVehicleNearPlayer,
  activePlacement,
  onSelectPropForPlacement,
  itemSearch,
  setItemSearch,
  onGiveItem,
  isFlying,
  onToggleFlying,
  isInvincible,
  onToggleInvincible,
  isGridMode,
  onToggleGridMode,
  isCleanMode,
  onToggleCleanMode,
  onGiveCash,
  onOpenCalendar,
  calendar,
  timeHour,
  onStepDay,
  onRepairAllVehicles,
  onClearCreatedSpawns
}) => {
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleCategoryFilter, setVehicleCategoryFilter] = useState<string>('all');
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('sedan_samara');
  const [itemCategoryFilter, setItemCategoryFilter] = useState<'all' | 'food' | 'med' | 'tool' | 'valuable'>('all');
  const [propCategoryFilter, setPropCategoryFilter] = useState<'all' | 'road' | 'urban' | 'nature'>('all');

  if (!isOpen) return null;

  const filteredVehicles = VEHICLE_CATALOG.filter(v => {
    const q = vehicleSearch.trim().toLowerCase();
    const matchesSearch = !q || v.nameRu.toLowerCase().includes(q) || v.brand.toLowerCase().includes(q) || v.type.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (vehicleCategoryFilter === 'all') return true;
    return v.category === vehicleCategoryFilter;
  });

  const selectedVehicle = VEHICLE_CATALOG.find(v => v.type === selectedVehicleType) || filteredVehicles[0] || VEHICLE_CATALOG[0];

  const filteredProps = PROP_CATALOG.filter(prop => {
    if (propCategoryFilter === 'all') return true;
    return prop.category === propCategoryFilter;
  });

  const filteredItems = Object.entries(ITEM_CATALOG).filter(([key, item]) => {
    const q = itemSearch.trim().toLowerCase();
    const matchesSearch = !q ||
      item.name.toLowerCase().includes(q) ||
      (item.nameRu && item.nameRu.toLowerCase().includes(q)) ||
      key.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (itemCategoryFilter === 'all') return true;
    if (itemCategoryFilter === 'food') return item.category === 'food' || item.category === 'drink';
    if (itemCategoryFilter === 'med') return item.category === 'med';
    if (itemCategoryFilter === 'tool') return item.category === 'tool';
    if (itemCategoryFilter === 'valuable') return item.category === 'valuable';
    return true;
  });

  return (
    <div
      id="creative-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="creative-modal-container"
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#111317]/95 border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] text-[#e9e6df] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <header className="px-5 py-3.5 bg-[#16181e] border-b border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-7 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_12px_rgba(198,138,53,0.5)]" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-wider uppercase font-sans text-white">
                  РЕЖИМ ТВОРЧЕСТВА
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-[#c68a35]/15 border border-[#c68a35]/40 text-[#f0c264] text-[10px] font-mono font-bold tracking-widest uppercase">
                  CREATIVE ENGINE
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#8b929e] tracking-wider uppercase">
                Свободное создание техники, объектов, экипировки и параметров мира
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] font-mono text-[#8b929e]">
              <span>ЗАКРЫТЬ:</span>
              <kbd className="px-1.5 py-0.5 bg-white/10 text-white rounded text-[10px] font-bold border border-white/10">
                ESC
              </kbd>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#8b929e] hover:text-white transition-colors cursor-pointer"
              title="Закрыть режим творчества [ESC]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Tab Navigation (Segmented Industrial Bar) */}
        <div className="px-5 py-2.5 bg-[#14161c] border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5 p-1 bg-[#0d0e12] border border-white/[0.08] rounded-xl shrink-0">
            <button
              onClick={() => setCreativeTab('vehicles')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                creativeTab === 'vehicles'
                  ? 'bg-[#c68a35] text-black shadow-[0_0_12px_rgba(198,138,53,0.4)]'
                  : 'text-[#8b929e] hover:text-white hover:bg-white/5'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Транспорт</span>
            </button>

            <button
              onClick={() => setCreativeTab('props')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                creativeTab === 'props'
                  ? 'bg-[#c68a35] text-black shadow-[0_0_12px_rgba(198,138,53,0.4)]'
                  : 'text-[#8b929e] hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Объекты и пропы</span>
            </button>

            <button
              onClick={() => setCreativeTab('items')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                creativeTab === 'items'
                  ? 'bg-[#c68a35] text-black shadow-[0_0_12px_rgba(198,138,53,0.4)]'
                  : 'text-[#8b929e] hover:text-white hover:bg-white/5'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Предметы</span>
            </button>

            <button
              onClick={() => setCreativeTab('cheats')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                creativeTab === 'cheats'
                  ? 'bg-[#c68a35] text-black shadow-[0_0_12px_rgba(198,138,53,0.4)]'
                  : 'text-[#8b929e] hover:text-white hover:bg-white/5'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Читы и мир</span>
            </button>
          </div>

          {activePlacement && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-amber-500/15 border border-amber-500/40 rounded-lg text-xs font-mono text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="truncate">Режим установки: {activePlacement.nameRu}</span>
            </div>
          )}
        </div>

        {/* Scrollable Main Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin scrollbar-thumb-white/10">

          {/* ===================== TAB 1: VEHICLES ===================== */}
          {creativeTab === 'vehicles' && (
            <div className="space-y-4">
              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1 p-1 bg-[#141720] border border-white/[0.08] rounded-xl text-xs font-bold uppercase tracking-wider overflow-x-auto">
                  {[
                    { id: 'all', label: 'Все' },
                    { id: 'passenger', label: 'Легковые' },
                    { id: 'sport', label: 'Спорт' },
                    { id: 'suv', label: '4x4' },
                    { id: 'commercial', label: 'Грузовые' },
                    { id: 'special', label: 'Спецтехника' },
                    { id: 'emergency', label: 'Службы' },
                    { id: 'bus', label: 'Автобусы' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setVehicleCategoryFilter(cat.id)}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                        vehicleCategoryFilter === cat.id
                          ? 'bg-[#c68a35] text-black shadow-sm'
                          : 'text-[#8b929e] hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-4 h-4 text-[#8b929e] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={vehicleSearch}
                    onChange={e => setVehicleSearch(e.target.value)}
                    placeholder="Поиск транспорта..."
                    className="w-full pl-9 pr-3 py-1.5 bg-[#141720] border border-white/[0.08] focus:border-[#c68a35] rounded-xl text-xs text-white placeholder-[#8b929e] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Main Split: Left Catalog List | Right Showcase Preview */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Left Column: Vehicle List */}
                <div className="md:col-span-6 bg-[#141720] border border-white/[0.08] rounded-xl overflow-hidden flex flex-col max-h-[460px]">
                  <div className="p-2.5 border-b border-white/[0.06] text-[11px] font-mono text-[#8b929e] uppercase tracking-wider flex justify-between">
                    <span>Транспорт в каталоге ({filteredVehicles.length})</span>
                    <span>Клик для выбора</span>
                  </div>
                  <div className="overflow-y-auto p-2 space-y-2 flex-1 scrollbar-thin scrollbar-thumb-white/10">
                    {filteredVehicles.length === 0 ? (
                      <div className="text-center py-10 text-xs text-[#8b929e]">
                        Транспорт не найден
                      </div>
                    ) : (
                      filteredVehicles.map(car => {
                        const isSelected = selectedVehicle?.type === car.type;
                        return (
                          <div
                            key={car.type}
                            onClick={() => setSelectedVehicleType(car.type)}
                            className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                              isSelected
                                ? 'bg-[#c68a35]/15 border-[#c68a35] text-white shadow-[0_0_15px_rgba(198,138,53,0.2)]'
                                : 'bg-[#0f1116] border-white/[0.06] text-[#8b929e] hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-16 h-12 bg-[#090a0d] rounded-lg border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                <VehiclePreviewCanvas
                                  carType={car.type}
                                  color={isSelected ? creativeVehicleColor : (car.colors[0]?.hex || '#38bdf8')}
                                  width={70}
                                  height={46}
                                  showPedestal={false}
                                />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[10px] font-mono uppercase tracking-wider block text-[#c68a35]">
                                  {car.brand}
                                </span>
                                <h4 className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
                                  {car.nameRu}
                                </h4>
                                <div className="flex items-center gap-2 text-[10px] text-[#8b929e] mt-0.5">
                                  <span>{car.powerHp} л.с.</span>
                                  <span>•</span>
                                  <span>{car.topSpeedKmh} км/ч</span>
                                  <span>•</span>
                                  <span>{car.classType}</span>
                                </div>
                              </div>
                            </div>
                            <span className={`text-[10px] font-mono px-2 py-1 rounded shrink-0 ${
                              isSelected ? 'bg-[#c68a35] text-black font-bold' : 'bg-white/5 text-[#8b929e]'
                            }`}>
                              {isSelected ? 'Выбран' : 'Обзор'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Column: Selected Vehicle Showcase & Actions */}
                <div className="md:col-span-6 bg-[#141720] border border-white/[0.08] rounded-xl p-4 flex flex-col justify-between gap-4">
                  {selectedVehicle ? (
                    <>
                      {/* Top Canvas Render */}
                      <div className="flex flex-col items-center justify-center bg-[#0d0e12] rounded-xl p-3 border border-white/10 relative">
                        <VehiclePreviewCanvas
                          carType={selectedVehicle.type}
                          color={creativeVehicleColor}
                          roofColor={creativeVehicleColor}
                          width={240}
                          height={140}
                          showPedestal={true}
                        />
                        <div className="absolute top-2.5 left-3 text-[10px] font-mono text-[#8b929e]">
                          {selectedVehicle.classType}
                        </div>
                        <div className="absolute top-2.5 right-3 text-[10px] font-mono text-[#c68a35]">
                          {selectedVehicle.fuelTypeLabel}
                        </div>
                      </div>

                      {/* Header Info */}
                      <div>
                        <span className="text-xs font-mono uppercase tracking-wider text-[#c68a35] font-bold">
                          {selectedVehicle.brand}
                        </span>
                        <h3 className="text-lg font-bold text-white leading-tight">
                          {selectedVehicle.nameRu}
                        </h3>
                        <p className="text-xs text-[#8b929e] mt-1 leading-relaxed line-clamp-2">
                          {selectedVehicle.descriptionRu}
                        </p>
                      </div>

                      {/* Color Palette Selector */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono text-[#8b929e]">
                          <span>Цвет кузова:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: creativeVehicleColor }} />
                            <span>{creativeVehicleColor}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {VEHICLE_COLORS.map(col => {
                            const isCol = creativeVehicleColor === col.hex;
                            return (
                              <button
                                key={col.hex}
                                onClick={() => setCreativeVehicleColor(col.hex)}
                                className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                                  isCol
                                    ? 'scale-115 border-white shadow-[0_0_8px_rgba(255,255,255,0.7)]'
                                    : 'border-white/20 hover:scale-105'
                                }`}
                                style={{ backgroundColor: col.hex }}
                                title={col.name}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Technical Specs Grid */}
                      <div className="grid grid-cols-3 gap-2 bg-[#0d0e12] p-2.5 rounded-xl border border-white/5 text-center font-mono">
                        <div>
                          <span className="text-[10px] text-[#8b929e] block">Мощность</span>
                          <span className="text-xs font-bold text-white">{selectedVehicle.powerHp} л.с.</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#8b929e] block">Макс. скор.</span>
                          <span className="text-xs font-bold text-white">{selectedVehicle.topSpeedKmh} км/ч</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#8b929e] block">Масса</span>
                          <span className="text-xs font-bold text-white">{selectedVehicle.weightKg} кг</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-1 border-t border-white/[0.08]">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => onSpawnVehicleNearPlayer && onSpawnVehicleNearPlayer(selectedVehicle.type, creativeVehicleColor, false)}
                            className="py-2.5 px-3 bg-[#c68a35]/20 hover:bg-[#c68a35] border border-[#c68a35]/40 text-[#f0c264] hover:text-black rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Заспавнить рядом</span>
                          </button>

                          <button
                            onClick={() => onSpawnVehicleNearPlayer && onSpawnVehicleNearPlayer(selectedVehicle.type, creativeVehicleColor, true)}
                            className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Car className="w-3.5 h-3.5" />
                            <span>Сесть за руль</span>
                          </button>
                        </div>

                        <button
                          onClick={() => onSelectVehicleForPlacement(selectedVehicle.type, selectedVehicle.nameRu, creativeVehicleColor)}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 border ${
                            activePlacement?.type === 'vehicle' && activePlacement.id === selectedVehicle.type
                              ? 'bg-[#c68a35] text-black border-[#c68a35]'
                              : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>
                            {activePlacement?.type === 'vehicle' && activePlacement.id === selectedVehicle.type
                              ? 'Режим размещения активен (кликните на карте)'
                              : 'Режим точной установки (на карте)'}
                          </span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-16 text-xs text-[#8b929e]">
                      Выберите транспорт слева для предпросмотра
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 2: PROPS ===================== */}
          {creativeTab === 'props' && (
            <div className="space-y-4">
              {/* Category Filter */}
              <div className="flex items-center gap-1 p-1 bg-[#141720] border border-white/[0.08] rounded-xl text-xs font-bold uppercase tracking-wider w-fit">
                {(['all', 'road', 'urban', 'nature'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setPropCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      propCategoryFilter === cat
                        ? 'bg-white/15 text-white'
                        : 'text-[#8b929e] hover:text-white'
                    }`}
                  >
                    {cat === 'all' ? 'Все объекты' : cat === 'road' ? 'Дорожные' : cat === 'urban' ? 'Городские' : 'Озеленение'}
                  </button>
                ))}
              </div>

              {/* Props Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredProps.map(prop => {
                  const IconComponent = prop.icon;
                  const isCurrentlyPlacing = activePlacement?.type === 'prop' && activePlacement.id === prop.id;

                  return (
                    <div
                      key={prop.id}
                      className={`p-3.5 bg-[#141720] border rounded-xl flex flex-col justify-between gap-3 transition-all ${
                        isCurrentlyPlacing
                          ? 'border-[#c68a35] shadow-[0_0_20px_rgba(198,138,53,0.25)]'
                          : 'border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[#c68a35] shrink-0">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-white font-sans truncate">
                            {prop.label}
                          </h3>
                          <p className="text-[11px] font-mono text-[#8b929e] mt-0.5 line-clamp-2">
                            {prop.desc}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => onSelectPropForPlacement(prop.id, prop.label)}
                        className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                          isCurrentlyPlacing
                            ? 'bg-[#c68a35] text-black'
                            : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{isCurrentlyPlacing ? 'Выбрано для клика' : 'Установить в мир'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===================== TAB 3: ITEMS ===================== */}
          {creativeTab === 'items' && (
            <div className="space-y-4">
              {/* Category Filter & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1 p-1 bg-[#141720] border border-white/[0.08] rounded-xl text-xs font-bold uppercase tracking-wider">
                  {(['all', 'food', 'med', 'tool', 'valuable'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setItemCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        itemCategoryFilter === cat
                          ? 'bg-white/15 text-white'
                          : 'text-[#8b929e] hover:text-white'
                      }`}
                    >
                      {cat === 'all' ? 'Все' : cat === 'food' ? 'Еда/Напитки' : cat === 'med' ? 'Аптечка' : cat === 'tool' ? 'Инструменты' : 'Ценности'}
                    </button>
                  ))}
                </div>

                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-4 h-4 text-[#8b929e] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={e => setItemSearch(e.target.value)}
                    placeholder="Поиск предметов..."
                    className="w-full pl-9 pr-3 py-1.5 bg-[#141720] border border-white/[0.08] focus:border-[#c68a35] rounded-xl text-xs text-white placeholder-[#8b929e] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Items List Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredItems.map(([key, item]) => {
                  const maxStack = item.maxStack || 5;
                  return (
                    <div
                      key={key}
                      className="p-3 bg-[#141720] border border-white/[0.08] hover:border-white/20 rounded-xl flex flex-col justify-between gap-2.5 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-bold uppercase tracking-wide text-white truncate font-sans">
                            {item.nameRu || item.name}
                          </h4>
                          <span className="text-[10px] font-mono text-[#8b929e] uppercase shrink-0">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-[#8b929e] mt-1 line-clamp-2">
                          {item.descriptionRu || item.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                        <span className="text-[10px] font-mono text-[#8b929e]">
                          {item.weight ? `${item.weight} кг` : 'Легкий'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onGiveItem(key, 1)}
                            className="px-2.5 py-1 bg-white/5 hover:bg-white/15 border border-white/10 text-white rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer"
                            title="Выдать 1 шт в инвентарь"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => onGiveItem(key, maxStack)}
                            className="px-2.5 py-1 bg-[#c68a35]/15 hover:bg-[#c68a35] border border-[#c68a35]/30 text-[#f0c264] hover:text-black rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer"
                            title={`Выдать полный стак (${maxStack} шт)`}
                          >
                            +Стак
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===================== TAB 4: CHEATS & SIM ===================== */}
          {creativeTab === 'cheats' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">

                {/* Cheat Toggle 1: Flight */}
                <div className="p-4 bg-[#141720] border border-white/[0.08] rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2.5 rounded-lg border shrink-0 ${
                      isFlying ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-white/5 border-white/10 text-[#8b929e]'
                    }`}>
                      <Plane className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-white font-sans">
                        Полет (Noclip)
                      </h4>
                      <p className="text-[11px] font-mono text-[#8b929e] mt-0.5">
                        Свободное перемещение сквозь стены. Ускорение: Shift
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onToggleFlying}
                    className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer relative shrink-0 ${
                      isFlying ? 'bg-[#c68a35]' : 'bg-white/15'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      isFlying ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Cheat Toggle 2: God Mode */}
                <div className="p-4 bg-[#141720] border border-white/[0.08] rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2.5 rounded-lg border shrink-0 ${
                      isInvincible ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 text-[#8b929e]'
                    }`}>
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-white font-sans">
                        Бессмертие и виталы
                      </h4>
                      <p className="text-[11px] font-mono text-[#8b929e] mt-0.5">
                        100% показатели, иммунитет к переломам и голоду
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onToggleInvincible}
                    className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer relative shrink-0 ${
                      isInvincible ? 'bg-emerald-500' : 'bg-white/15'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      isInvincible ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Cheat Toggle 3: Grid Mode */}
                <div className="p-4 bg-[#141720] border border-white/[0.08] rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2.5 rounded-lg border shrink-0 ${
                      isGridMode ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-white/5 border-white/10 text-[#8b929e]'
                    }`}>
                      <Grid className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-white font-sans">
                        3D-сетка деформации
                      </h4>
                      <p className="text-[11px] font-mono text-[#8b929e] mt-0.5">
                        Визуализация узлов BeamNG кузова в реальном времени
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onToggleGridMode}
                    className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer relative shrink-0 ${
                      isGridMode ? 'bg-cyan-500' : 'bg-white/15'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      isGridMode ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Cheat Toggle 4: Clean Test Mode */}
                <div className="p-4 bg-[#141720] border border-white/[0.08] rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2.5 rounded-lg border shrink-0 ${
                      isCleanMode ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-white/5 border-white/10 text-[#8b929e]'
                    }`}>
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-white font-sans">
                        Чистый краш-тест
                      </h4>
                      <p className="text-[11px] font-mono text-[#8b929e] mt-0.5">
                        Отключение дыма и пара для кристальной записи физики
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onToggleCleanMode}
                    className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer relative shrink-0 ${
                      isCleanMode ? 'bg-[#c68a35]' : 'bg-white/15'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      isCleanMode ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => onGiveCash(100000)}
                  className="p-4 bg-[#141720] hover:bg-[#1a1f2b] border border-white/10 hover:border-[#c68a35] rounded-xl flex items-center gap-3 transition-all cursor-pointer group text-left"
                >
                  <div className="p-2.5 rounded-lg bg-[#c68a35]/15 border border-[#c68a35]/30 text-[#c68a35] group-hover:bg-[#c68a35] group-hover:text-black transition-colors shrink-0">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-white font-sans group-hover:text-[#c68a35] transition-colors">
                      Выдать ₽100,000
                    </h5>
                    <p className="text-[11px] font-mono text-[#8b929e]">Пополнить кошелек водителя</p>
                  </div>
                </button>

                <button
                  onClick={onRepairAllVehicles}
                  className="p-4 bg-[#141720] hover:bg-[#1a1f2b] border border-white/10 hover:border-[#c68a35] rounded-xl flex items-center gap-3 transition-all cursor-pointer group text-left"
                >
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-black transition-colors shrink-0">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-white font-sans group-hover:text-sky-300 transition-colors">
                      Починить технику
                    </h5>
                    <p className="text-[11px] font-mono text-[#8b929e]">Устранить вмятины и поломки</p>
                  </div>
                </button>

                <button
                  onClick={onClearCreatedSpawns}
                  className="p-4 bg-[#1a1215] hover:bg-[#24151b] border border-rose-900/40 hover:border-rose-600/60 rounded-xl flex items-center gap-3 transition-all cursor-pointer group text-left"
                >
                  <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/40 text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-rose-200 font-sans group-hover:text-rose-100 transition-colors">
                      Очистить спавн
                    </h5>
                    <p className="text-[11px] font-mono text-rose-300/70">Удалить созданные объекты</p>
                  </div>
                </button>
              </div>

              {/* Time and Date Controls Card */}
              <div className="p-4 bg-[#141720] border border-white/[0.08] rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[#c68a35] shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-white font-sans">
                      Игровой календарь и климат
                    </h5>
                    <p className="text-[11px] font-mono text-[#8b929e]">
                      {formatGameDate(calendar, 'medium')} · {formatGameTime(timeHour)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onStepDay(-1)}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-colors cursor-pointer"
                    title="-1 день"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onStepDay(1)}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-colors cursor-pointer"
                    title="+1 день"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onOpenCalendar}
                    className="px-3.5 py-2 bg-[#c68a35]/15 hover:bg-[#c68a35] border border-[#c68a35]/30 text-[#f0c264] hover:text-black rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Открыть календарь
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer info */}
        <footer className="px-5 py-2.5 bg-[#14161c] border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-[#8b929e] shrink-0">
          <span>СИМУЛЯТОР СТЕПНОЙ ТРАКТ 2D</span>
          <span>ВЫБЕРИТЕ ОБЪЕКТ ДЛЯ РАЗМЕЩЕНИЯ НА КАРТЕ</span>
        </footer>
      </div>
    </div>
  );
};

export const CreativePlacementHud: React.FC<{
  placement: ActivePlacement;
  onCancel: () => void;
}> = ({ placement, onCancel }) => {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-[#111317]/95 border border-[#c68a35]/60 rounded-xl px-5 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-md text-white flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-150 pointer-events-auto">
      <div className="flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full bg-[#c68a35] animate-ping" />
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-white font-sans flex items-center gap-1.5">
            <span className="text-[#f0c264]">УСТАНОВКА:</span>
            <span>{placement.nameRu}</span>
          </div>
          <div className="text-[11px] font-mono text-[#8b929e] flex items-center gap-2 mt-0.5">
            <span>[ЛКМ] Разместить</span>
            <span>·</span>
            <span>[R / Колесо] Поворот</span>
            <span>·</span>
            <span>[ESC] Отмена</span>
          </div>
        </div>
      </div>

      <button
        onClick={onCancel}
        className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
      >
        Отмена
      </button>
    </div>
  );
};
