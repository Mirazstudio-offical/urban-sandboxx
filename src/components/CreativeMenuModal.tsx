import React, { useState } from 'react';
import {
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
  AlertTriangle,
  MinusCircle,
  Armchair,
  Flame,
  Lamp,
  Store,
  Flower2,
  Disc,
  MapPin,
  Package,
  Layers,
  Zap
} from 'lucide-react';
import { CAR_CONFIGS } from '../vehicleHelpers';
import { ITEM_CATALOG } from '../items';
import { ActivePlacement } from '../types';
import { GameCalendarState, formatGameDate, formatGameTime } from '../calendarSystem';
import { ModalShell, Tabs, Seg, Toggle, Hints } from './gameUi';

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
  onSpawnVehicleNearPlayer?: (key: string, color: string) => void;
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
  const [vehicleCategoryFilter, setVehicleCategoryFilter] = useState<'all' | 'car' | 'truck' | 'bus' | 'trailer'>('all');
  const [itemCategoryFilter, setItemCategoryFilter] = useState<'all' | 'food' | 'med' | 'tool' | 'valuable'>('all');
  const [propCategoryFilter, setPropCategoryFilter] = useState<'all' | 'road' | 'urban' | 'nature'>('all');

  if (!isOpen) return null;

  const filteredVehicles = Object.entries(CAR_CONFIGS).filter(([key, config]) => {
    const q = vehicleSearch.trim().toLowerCase();
    const nameMatches = !q || config.name.toLowerCase().includes(q) || key.toLowerCase().includes(q);
    if (!nameMatches) return false;

    if (vehicleCategoryFilter === 'all') return true;
    const t = (config.type || '').toLowerCase();
    if (vehicleCategoryFilter === 'bus') return t.includes('bus') || t.includes('paz') || t.includes('ikarus');
    if (vehicleCategoryFilter === 'trailer') return t.startsWith('trailer_') || t === 'trailer_barrel' || t === 'trailer_flatbed_2axle';
    if (vehicleCategoryFilter === 'truck') return t.includes('truck') || t.includes('kamaz') || t.includes('zil') || t.includes('ural') || t.includes('gazel') || t.includes('fire');
    if (vehicleCategoryFilter === 'car') return !t.includes('bus') && !t.includes('truck') && !t.includes('kamaz') && !t.includes('zil') && !t.startsWith('trailer_');
    return true;
  });

  const filteredProps = PROP_CATALOG.filter(prop => propCategoryFilter === 'all' || prop.category === propCategoryFilter);

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

  const cheats: { on: boolean; toggle: () => void; Icon: React.ComponentType<{ width?: number; height?: number }>; title: string; desc: string }[] = [
    { on: isFlying, toggle: onToggleFlying, Icon: Plane, title: 'Полет (Noclip)', desc: 'Свободное перемещение сквозь стены. Ускорение: Shift' },
    { on: isInvincible, toggle: onToggleInvincible, Icon: ShieldAlert, title: 'Бессмертие и виталы', desc: '100% показатели, иммунитет к переломам и голоду' },
    { on: isGridMode, toggle: onToggleGridMode, Icon: Grid, title: 'Сетка деформации', desc: 'Визуализация узлов кузова в реальном времени' },
    { on: isCleanMode, toggle: onToggleCleanMode, Icon: Sparkles, title: 'Чистый краш-тест', desc: 'Отключение дыма и пара для чистой записи физики' }
  ];

  const Search_ = (value: string, set: (v: string) => void, placeholder: string) => (
    <label className="gu-search" style={{ flex: '1 1 220px', maxWidth: 340 }}>
      <Search width={18} height={18} color="#a29e93" />
      <input type="text" value={value} onChange={e => set(e.target.value)} placeholder={placeholder} />
    </label>
  );

  return (
    <ModalShell
      id="creative-modal"
      title="Режим творчества"
      subtitle="Техника, объекты, экипировка и параметры мира"
      width={1040}
      tall
      onClose={onClose}
      wipeKey={creativeTab}
      bodyKey={creativeTab}
      headRight={
        activePlacement ? (
          <div className="gu-pill on gu-hide-s">
            <MapPin width={16} height={16} />
            <span>Установка: {activePlacement.nameRu}</span>
          </div>
        ) : undefined
      }
      tabs={
        <Tabs
          value={creativeTab}
          onChange={setCreativeTab}
          items={[
            { id: 'vehicles', label: 'Транспорт', icon: <Car width={18} height={18} /> },
            { id: 'props', label: 'Объекты', icon: <Layers width={18} height={18} /> },
            { id: 'items', label: 'Предметы', icon: <Package width={18} height={18} /> },
            { id: 'cheats', label: 'Читы и мир', icon: <Zap width={18} height={18} /> }
          ]}
        />
      }
      footerHints={[['Esc', 'Закрыть и выключить режим']]}
      footerRight={<span>Выберите объект, затем кликните по карте</span>}
    >
      <div className="gu-stagger">
        {/* ===================== VEHICLES ===================== */}
        {creativeTab === 'vehicles' && (
          <>
            <div className="gu-panel gu-pad gu-row2 gu-wrap" style={{ justifyContent: 'space-between' }}>
              <div className="gu-row2">
                <span className="gu-cn gu-mut" style={{ fontSize: 14 }}>Цвет кузова</span>
                <span style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid rgba(255,255,255,.35)', background: creativeVehicleColor }} />
              </div>
              <div className="gu-row2 gu-wrap" style={{ gap: 10 }}>
                {VEHICLE_COLORS.map(col => (
                  <button
                    type="button"
                    key={col.hex}
                    className={'gu-sw' + (creativeVehicleColor === col.hex ? ' on' : '')}
                    style={{ background: col.hex }}
                    onClick={() => setCreativeVehicleColor(col.hex)}
                    title={col.name}
                    aria-label={col.name}
                  />
                ))}
              </div>
            </div>

            <div className="gu-row2 gu-wrap" style={{ justifyContent: 'space-between' }}>
              <Seg
                value={vehicleCategoryFilter}
                onChange={v => setVehicleCategoryFilter(v)}
                options={[
                  { v: 'all', label: 'Все' },
                  { v: 'car', label: 'Легковые' },
                  { v: 'truck', label: 'Грузовые' },
                  { v: 'bus', label: 'Автобусы' },
                  { v: 'trailer', label: 'Прицепы' }
                ]}
              />
              {Search_(vehicleSearch, setVehicleSearch, 'Поиск транспорта')}
            </div>

            {filteredVehicles.length === 0 ? (
              <div className="gu-panel gu-empty">Ничего не найдено</div>
            ) : (
              <div className="gu-grid gu-g3">
                {filteredVehicles.map(([key, config]) => {
                  const IconComponent = getVehicleTypeIcon(config.type);
                  const placing = activePlacement?.type === 'vehicle' && activePlacement.id === key;
                  return (
                    <div key={key} className={'gu-card' + (placing ? ' on' : '')}>
                      <div className="gu-card-h">
                        <span className="gu-ico"><IconComponent className="w-5 h-5" /></span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="gu-card-t">{config.name}</div>
                          <div className="gu-card-d">{key} · {config.mass} кг</div>
                        </div>
                      </div>
                      <div className="gu-card-a">
                        <button
                          type="button"
                          className={'gu-btn gu-btn-sm ' + (placing ? 'gu-btn-p' : 'gu-btn-s')}
                          onClick={() => onSelectVehicleForPlacement(key, config.name, creativeVehicleColor)}
                        >
                          <MapPin width={15} height={15} />Разместить
                        </button>
                        <button
                          type="button"
                          className="gu-btn gu-btn-sm gu-btn-p"
                          onClick={() => onSpawnVehicleNearPlayer && onSpawnVehicleNearPlayer(key, creativeVehicleColor)}
                        >
                          <Sparkles width={15} height={15} />Рядом
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ===================== PROPS ===================== */}
        {creativeTab === 'props' && (
          <>
            <div>
              <Seg
                value={propCategoryFilter}
                onChange={v => setPropCategoryFilter(v)}
                options={[
                  { v: 'all', label: 'Все объекты' },
                  { v: 'road', label: 'Дорожные' },
                  { v: 'urban', label: 'Городские' },
                  { v: 'nature', label: 'Озеленение' }
                ]}
              />
            </div>
            <div className="gu-grid gu-g3">
              {filteredProps.map(prop => {
                const IconComponent = prop.icon;
                const placing = activePlacement?.type === 'prop' && activePlacement.id === prop.id;
                return (
                  <div key={prop.id} className={'gu-card' + (placing ? ' on' : '')}>
                    <div className="gu-card-h">
                      <span className="gu-ico"><IconComponent className="w-5 h-5" /></span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="gu-card-t">{prop.label}</div>
                        <div className="gu-card-d">{prop.desc}</div>
                      </div>
                    </div>
                    <div className="gu-card-a">
                      <button
                        type="button"
                        className={'gu-btn gu-btn-sm ' + (placing ? 'gu-btn-p' : 'gu-btn-s')}
                        onClick={() => onSelectPropForPlacement(prop.id, prop.label)}
                      >
                        <MapPin width={15} height={15} />{placing ? 'Выбрано для клика' : 'Установить в мир'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ===================== ITEMS ===================== */}
        {creativeTab === 'items' && (
          <>
            <div className="gu-row2 gu-wrap" style={{ justifyContent: 'space-between' }}>
              <Seg
                value={itemCategoryFilter}
                onChange={v => setItemCategoryFilter(v)}
                options={[
                  { v: 'all', label: 'Все' },
                  { v: 'food', label: 'Еда и напитки' },
                  { v: 'med', label: 'Аптечка' },
                  { v: 'tool', label: 'Инструменты' },
                  { v: 'valuable', label: 'Ценности' }
                ]}
              />
              {Search_(itemSearch, setItemSearch, 'Поиск предметов')}
            </div>

            {filteredItems.length === 0 ? (
              <div className="gu-panel gu-empty">Ничего не найдено</div>
            ) : (
              <div className="gu-grid gu-g3">
                {filteredItems.map(([key, item]) => {
                  const maxStack = item.maxStack || 5;
                  return (
                    <div key={key} className="gu-card">
                      <div style={{ minWidth: 0 }}>
                        <div className="gu-row2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <div className="gu-card-t">{item.nameRu || item.name}</div>
                          <span className="gu-cn gu-mut" style={{ fontSize: 11, flex: 'none' }}>{item.category}</span>
                        </div>
                        <div className="gu-card-d">{item.descriptionRu || item.description}</div>
                      </div>
                      <div className="gu-row2" style={{ justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.06)' }}>
                        <span className="gu-mut" style={{ fontSize: 13 }}>{item.weight ? `${item.weight} кг` : 'Легкий'}</span>
                        <div className="gu-row2" style={{ gap: 8 }}>
                          <button type="button" className="gu-btn gu-btn-sm gu-btn-s" onClick={() => onGiveItem(key, 1)} title="Выдать 1 шт в инвентарь">+1</button>
                          <button type="button" className="gu-btn gu-btn-sm gu-btn-p" onClick={() => onGiveItem(key, maxStack)} title={`Выдать полный стак (${maxStack} шт)`}>+ Стак</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ===================== CHEATS & WORLD ===================== */}
        {creativeTab === 'cheats' && (
          <>
            <div className="gu-panel" style={{ overflow: 'hidden' }}>
              {cheats.map(c => (
                <div className="gu-set" key={c.title}>
                  <div className="gu-set-main">
                    <span className={'gu-set-i' + (c.on ? ' on' : '')}><c.Icon width={20} height={20} /></span>
                    <div>
                      <div className="gu-set-t">{c.title}</div>
                      <div className="gu-set-d">{c.desc}</div>
                    </div>
                  </div>
                  <Toggle on={c.on} onChange={c.toggle} label={c.title} />
                </div>
              ))}
            </div>

            <div className="gu-grid gu-g3">
              <button type="button" className="gu-card" onClick={() => onGiveCash(100000)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                <span className="gu-ico"><Coins width={20} height={20} /></span>
                <div>
                  <div className="gu-card-t">Выдать 100 000 ₽</div>
                  <div className="gu-card-d" style={{ marginTop: 2 }}>Пополнить кошелек водителя</div>
                </div>
              </button>
              <button type="button" className="gu-card" onClick={onRepairAllVehicles} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                <span className="gu-ico"><Wrench width={20} height={20} /></span>
                <div>
                  <div className="gu-card-t">Починить технику</div>
                  <div className="gu-card-d" style={{ marginTop: 2 }}>Устранить вмятины и поломки</div>
                </div>
              </button>
              <button type="button" className="gu-card" onClick={onClearCreatedSpawns} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', borderColor: 'rgba(217,116,90,.35)' }}>
                <span className="gu-ico" style={{ borderColor: 'rgba(217,116,90,.5)', background: 'rgba(217,116,90,.1)', color: '#d9745a' }}><Trash2 width={20} height={20} /></span>
                <div>
                  <div className="gu-card-t" style={{ color: '#efa690' }}>Очистить спавн</div>
                  <div className="gu-card-d" style={{ marginTop: 2 }}>Удалить созданные объекты</div>
                </div>
              </button>
            </div>

            <div className="gu-panel gu-pad gu-row2 gu-wrap" style={{ justifyContent: 'space-between' }}>
              <div className="gu-set-main">
                <span className="gu-set-i on"><Calendar width={20} height={20} /></span>
                <div>
                  <div className="gu-set-t">Календарь и климат</div>
                  <div className="gu-set-d">{formatGameDate(calendar, 'medium')} · {formatGameTime(timeHour)}</div>
                </div>
              </div>
              <div className="gu-row2" style={{ gap: 8 }}>
                <button type="button" className="gu-btn gu-btn-s gu-btn-sm gu-btn-sq" onClick={() => onStepDay(-1)} title="-1 день" aria-label="Предыдущий день"><ChevronLeft width={18} height={18} /></button>
                <button type="button" className="gu-btn gu-btn-s gu-btn-sm gu-btn-sq" onClick={() => onStepDay(1)} title="+1 день" aria-label="Следующий день"><ChevronRight width={18} height={18} /></button>
                <button type="button" className="gu-btn gu-btn-p gu-btn-sm" onClick={onOpenCalendar}>Открыть календарь</button>
              </div>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
};

export const CreativePlacementHud: React.FC<{
  placement: ActivePlacement;
  onCancel: () => void;
}> = ({ placement, onCancel }) => {
  return (
    <div
      className="gu-backdrop"
      style={{ inset: 'auto', left: '50%', bottom: 96, transform: 'translateX(-50%)', zIndex: 40, padding: 0, background: 'none', backdropFilter: 'none', WebkitBackdropFilter: 'none', width: 'auto', display: 'block' }}
    >
      <div className="gu-panel" style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '12px 16px 12px 20px', background: 'rgba(20,20,22,.92)', borderColor: 'rgba(201,146,43,.55)', boxShadow: '0 20px 50px rgba(0,0,0,.7)', pointerEvents: 'auto' }}>
        <div>
          <div className="gu-cn" style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
            <span style={{ color: '#f0c264' }}>Установка:</span> {placement.nameRu}
          </div>
          <div className="gu-mut" style={{ fontSize: 13, marginTop: 6, display: 'flex', alignItems: 'center' }}>
            <Hints items={[['ЛКМ', 'Разместить'], ['R', 'Поворот'], ['Esc', 'Отмена']]} />
          </div>
        </div>
        <button type="button" className="gu-btn gu-btn-s gu-btn-sm" onClick={onCancel}>Отмена</button>
      </div>
    </div>
  );
};
