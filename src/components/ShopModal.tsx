import React from 'react';
import { Player } from '../types';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ShoppingBag, X, DollarSign, Wrench } from 'lucide-react';
import { sound } from '../audio';
import { getPlayerCash } from '../items';

export interface ShopItem {
  id: string;
  itemId: string;
  nameRu: string;
  price: number;
  description: string;
  category: 'food' | 'medical' | 'auto';
  effectText: string;
}

export interface CityShop {
  id: string;
  nameRu: string;
  type: 'supermarket' | 'pharmacy' | 'auto_shop' | 'cafe' | 'gear_shop';
  x: number;
  y: number;
  icon: string;
  badgeColor: string;
  description: string;
}

export const CITY_SHOPS: CityShop[] = [
  {
    id: 'shop_pyaterochka_mall',
    nameRu: 'Супермаркет "Пятёрочка 24/7" (ТРЦ)',
    type: 'supermarket',
    x: 3585,
    y: 2589,
    icon: '🛒',
    badgeColor: '#f59e0b',
    description: 'Центральный супермаркет в ТРЦ. Продукты, вода, напитки и снеки.'
  },
  {
    id: 'shop_pyaterochka_east',
    nameRu: 'Супермаркет "Пятёрочка 24/7" (Восточный)',
    type: 'supermarket',
    x: 7611,
    y: 3356,
    icon: '🛒',
    badgeColor: '#f59e0b',
    description: 'Филиал супермаркета в восточном коммерческом секторе.'
  },
  {
    id: 'shop_pharmacy_hospital',
    nameRu: 'Аптека "36.6" (При больнице)',
    type: 'pharmacy',
    x: 3525,
    y: 944,
    icon: '💊',
    badgeColor: '#10b981',
    description: 'Главный аптечный пункт в здании городской больницы.'
  },
  {
    id: 'shop_pharmacy_west',
    nameRu: 'Аптека "36.6" (Западные кварталы)',
    type: 'pharmacy',
    x: 1200,
    y: 3356,
    icon: '💊',
    badgeColor: '#10b981',
    description: 'Дежурная аптека в западном торговом комплексе.'
  },
  {
    id: 'shop_pharmacy_east',
    nameRu: 'Аптека "36.6" (Восточный район)',
    type: 'pharmacy',
    x: 6015,
    y: 3356,
    icon: '💊',
    badgeColor: '#10b981',
    description: 'Аптечный филиал в восточной части города.'
  },
  {
    id: 'shop_pharmacy_south',
    nameRu: 'Аптека "36.6" (Южный универмаг)',
    type: 'pharmacy',
    x: 2800,
    y: 5756,
    icon: '💊',
    badgeColor: '#10b981',
    description: 'Аптека в южном коммерческом центре.'
  },
  {
    id: 'shop_pitstop',
    nameRu: 'Автомастерская & Запчасти "PIT-STOP"',
    type: 'auto_shop',
    x: 3434,
    y: 1741,
    icon: '🔧',
    badgeColor: '#0284c7',
    description: 'Полный сервис и ремонт авто, запчасти, инструменты и канистры.'
  },
  {
    id: 'shop_pitstop_southwest',
    nameRu: 'Автомастерская "PIT-STOP" (Юго-Западная)',
    type: 'auto_shop',
    x: 157,
    y: 5744,
    icon: '🔧',
    badgeColor: '#0284c7',
    description: 'Дополнительный автосервис рядом с южным автосалоном.'
  },
  {
    id: 'shop_cafe_center',
    nameRu: 'Кафе & Кофейня "Bean & Bistro" (Центр)',
    type: 'cafe',
    x: 4415,
    y: 3356,
    icon: '☕',
    badgeColor: '#f97316',
    description: 'Кофейня в центре города. Горячий кофе Espresso, капучино и супы.'
  },
  {
    id: 'shop_cafe_west',
    nameRu: 'Кафе & Кофейня "Bean & Bistro" (Запад)',
    type: 'cafe',
    x: 389,
    y: 3356,
    icon: '☕',
    badgeColor: '#f97316',
    description: 'Уютный кофейный филиал в западной части города.'
  },
  {
    id: 'shop_gear',
    nameRu: 'Магазин "Охотник & Снаряжение"',
    type: 'gear_shop',
    x: 2601,
    y: 1766,
    icon: '🔦',
    badgeColor: '#8b5cf6',
    description: 'Тактические фонари, ножи, термоодежда и инструменты.'
  }
];

export const SHOP_CATALOGS: Record<string, ShopItem[]> = {
  supermarket: [
    { id: 'sup_water', itemId: 'water_bottle', nameRu: 'Минеральная вода (0.5L)', price: 30, description: 'Чистая питьевая вода для утоления жажды.', category: 'food', effectText: '+40% Гидратация' },
    { id: 'sup_burger', itemId: 'burger', nameRu: 'Сытный бургер', price: 80, description: 'Горячий бургер с говядиной и сыром.', category: 'food', effectText: '+50% Энергия/Сытость' },
    { id: 'sup_energy', itemId: 'energy_drink', nameRu: 'Энергетик Flash', price: 65, description: 'Бодрящий напиток с таурином.', category: 'food', effectText: '+35% Энергия' },
    { id: 'sup_juice', itemId: 'fresh_juice', nameRu: 'Апельсиновый сок', price: 45, description: 'Натуральный сок с витамином C.', category: 'food', effectText: '+30% Гидратация' },
    { id: 'sup_sandwich', itemId: 'sandwich', nameRu: 'Классический сэндвич', price: 50, description: 'Сэндвич с ветчиной и сыром.', category: 'food', effectText: '+30% Сытость' },
    { id: 'sup_chocolate', itemId: 'chocolate', nameRu: 'Шоколадный батончик', price: 25, description: 'Быстрые углеводы для восстановления тонуса.', category: 'food', effectText: '+20% Энергия' },
    { id: 'sup_canned', itemId: 'canned_meat', nameRu: 'Консервированный тунец', price: 90, description: 'Питательные консервы длительного хранения.', category: 'food', effectText: '+60% Сытость' },
  ],
  pharmacy: [
    { id: 'pha_bandage', itemId: 'bandage', nameRu: 'Стерильный бинт', price: 100, description: 'Быстро останавливает кровотечения.', category: 'medical', effectText: 'Лечение кровотечений' },
    { id: 'pha_painkillers', itemId: 'painkillers', nameRu: 'Сильное обезболивающее', price: 140, description: 'Снимает болевой шок при травмах.', category: 'medical', effectText: '-40 Уровень боли' },
    { id: 'pha_medkit', itemId: 'medkit', nameRu: 'Большая медицинская аптечка', price: 350, description: 'Комплексное средство для лечения ушибов.', category: 'medical', effectText: '+60 HP, Лечение ушибов' },
    { id: 'pha_antiseptic', itemId: 'antiseptic', nameRu: 'Антисептик для ран', price: 75, description: 'Обеззараживает глубокие царапины.', category: 'medical', effectText: 'Дезинфекция' },
    { id: 'pha_vitamins', itemId: 'vitamins', nameRu: 'Витаминный комплекс', price: 85, description: 'Укрепляет иммунитет и тонус.', category: 'medical', effectText: '+15 HP, Восстановление' },
  ],
  auto_shop: [
    { id: 'aut_repair_kit', itemId: 'repair_kit', nameRu: 'Набор автоинструментов', price: 220, description: 'Инструменты для самостоятельного ремонта.', category: 'auto', effectText: 'Ремонт кузова/двигателя' },
    { id: 'aut_oil', itemId: 'motor_oil', nameRu: 'Канистра моторного масла', price: 110, description: 'Синтетическое масло для двигателя.', category: 'auto', effectText: 'Защита двигателя' },
    { id: 'aut_battery', itemId: 'car_battery', nameRu: 'Запасной аккумулятор', price: 180, description: 'Надежный запуск авто в любую погоду.', category: 'auto', effectText: 'Питание электроники' },
    { id: 'aut_extinguisher', itemId: 'extinguisher', nameRu: 'Автоогнетушитель', price: 130, description: 'Огнетушитель для тушения пожара.', category: 'auto', effectText: 'Безопасность' },
  ],
  cafe: [
    { id: 'caf_espresso', itemId: 'hot_coffee', nameRu: 'Горячий Espresso', price: 50, description: 'Крепкий бодрящий согревающий кофе.', category: 'food', effectText: '+5°C Тепло, +25% Бодрость' },
    { id: 'caf_cappuccino', itemId: 'cappuccino', nameRu: 'Сливочный Cappuccino', price: 65, description: 'Кофейный напиток со сливочной пенкой.', category: 'food', effectText: '+20% Гидратация, +20% Бодрость' },
    { id: 'caf_croissant', itemId: 'croissant', nameRu: 'Свежий масляный круассан', price: 45, description: 'Выпечка с хрустящей корочкой.', category: 'food', effectText: '+25% Сытость' },
    { id: 'caf_soup', itemId: 'soup', nameRu: 'Горячий куриный бульон', price: 110, description: 'Согревающий домашний суп.', category: 'food', effectText: '+40% Сытость, +8°C Тепло' },
  ],
  gear_shop: [
    { id: 'gea_flashlight', itemId: 'flashlight', nameRu: 'Яркий LED-фонарь', price: 160, description: 'Мощный фонарь для ночных прогулок.', category: 'auto', effectText: 'Освещение в темноте' },
    { id: 'gea_knife', itemId: 'pocket_knife', nameRu: 'Туристический нож', price: 200, description: 'Универсальный инструмент из стали.', category: 'auto', effectText: 'Инструмент' },
    { id: 'gea_coat', itemId: 'thermal_coat', nameRu: 'Термокуртка "Arctix"', price: 350, description: 'Сохраняет тепло при морозе и ветре.', category: 'auto', effectText: 'Защита от холода' },
    { id: 'gea_tape', itemId: 'duct_tape', nameRu: 'Прочный армированный скотч', price: 40, description: 'Для быстрой починки предметов.', category: 'auto', effectText: 'Починка вещей' },
  ]
};

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  shopTitle?: string;
  shopType?: 'supermarket' | 'pharmacy' | 'auto_shop' | 'cafe' | 'gear_shop';
  onBuyItem: (item: ShopItem) => void;
  onRepairVehicle?: () => void;
  canRepairVehicle?: boolean;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  player,
  shopTitle = 'СУПЕРМАРКЕТ 24/7',
  shopType = 'supermarket',
  onBuyItem,
  onRepairVehicle,
  canRepairVehicle = false
}) => {
  if (!isOpen || !player) return null;

  const playerCash = getPlayerCash(player);
  const currentCatalog = SHOP_CATALOGS[shopType] || SHOP_CATALOGS.supermarket;

  return (
    <div 
      id="shop-modal-overlay"
      className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        id="shop-modal-container"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base tracking-wide flex items-center gap-2">
                <span>{shopTitle}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ЗАВЕДЕНИЕ
                </span>
              </h2>
              <p className="text-slate-400 text-xs">Ассортимент товаров и услуг данного заведения</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Player Cash Balance Badge */}
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 font-mono font-bold text-sm shadow-md">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>{playerCash}</span>
            </div>

            <button
              id="btn-close-shop"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Vehicle Repair Option (If in auto shop or near car) */}
          {(canRepairVehicle || shopType === 'auto_shop') && onRepairVehicle && (
            <div className="p-4 bg-gradient-to-r from-sky-950/80 to-blue-950/80 border border-sky-500/40 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-500/20 rounded-xl border border-sky-400/40 text-sky-300">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Полный автосервис и ремонт</h3>
                  <p className="text-sky-200/80 text-xs">Восстановление кузова, двигателя, колес и стекол машины</p>
                </div>
              </div>

              <button
                onClick={onRepairVehicle}
                disabled={playerCash < 300}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 shadow-lg ${
                  playerCash >= 300
                    ? 'bg-sky-600 hover:bg-sky-500 text-white active:scale-95 border border-sky-400/40'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <span>Отремонтировать</span>
                <span className="font-mono text-amber-300">$300</span>
              </button>
            </div>
          )}

          {/* Item Catalog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentCatalog.map((item) => {
              const canAfford = playerCash >= item.price;

              return (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-800/60 border border-slate-700/70 rounded-xl flex items-center justify-between gap-3 hover:border-slate-600 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 p-1">
                      <ItemIconCanvas itemId={item.itemId} size={36} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-100 truncate">{item.nameRu}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{item.description}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-slate-900/80 border border-slate-700/80 rounded text-[9px] font-semibold text-sky-300">
                        {item.effectText}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (canAfford) {
                        onBuyItem(item);
                        sound.playUseItem();
                      }
                    }}
                    disabled={!canAfford}
                    className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center min-w-[75px] ${
                      canAfford
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 border border-emerald-400/40 shadow-md'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    <span>Купить</span>
                    <span className="font-mono text-[11px] text-amber-300">${item.price}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>💡 Купленные предметы отправляются в ваш инвентарь [I]</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
