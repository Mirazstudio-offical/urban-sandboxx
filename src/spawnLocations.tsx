import React from 'react';
import { 
  Building2, 
  Car, 
  Compass, 
  Fuel, 
  HeartPulse, 
  Home, 
  Map, 
  MapPin, 
  Mountain, 
  Navigation, 
  Shield, 
  ShoppingBag, 
  Train, 
  TreePine, 
  Truck, 
  Wrench, 
  Flame 
} from 'lucide-react';
import { GameWorld } from './types';

export interface SpawnLocation {
  id: string;
  name: string;
  nameRu: string;
  x: number;
  y: number;
  description: string;
  icon: React.ReactNode;
  category?: 'city' | 'highway' | 'nature' | 'industrial' | 'mountain';
}

export const SPAWN_LOCATIONS: SpawnLocation[] = [
  {
    id: 'railway_station_loc',
    name: 'Railway Station Stepnaya',
    nameRu: 'Ж/Д Вокзал «Станция Степная»',
    x: 11120,
    y: 5640,
    description: 'Новый вокзальный комплекс: двухэтажный вокзал РЖД, платформы, поезда, переезд и путевая сеть',
    icon: <Train className="w-7 h-7 text-sky-400" />,
    category: 'city'
  },
  {
    id: 'central_park',
    name: 'Central Park Promenade',
    nameRu: 'Центральный Парк (Фонтан & Сквер)',
    x: 4400,
    y: 2400,
    description: 'Парковый фонтан, аллеи со скамейками, сквер и прогулочные зоны',
    icon: <TreePine className="w-7 h-7 text-emerald-400" />,
    category: 'city'
  },
  {
    id: 'real_estate_agency_loc',
    name: 'Real Estate Agency GlavNedvizhimost',
    nameRu: 'Агентство Недвижимости «ГлавНедвижимость»',
    x: 5030,
    y: 4610,
    description: 'Официальный риелторский центр и Росреестр: покупка квартир, выдача ключей и ЕГРН',
    icon: <Building2 className="w-7 h-7 text-yellow-400" />,
    category: 'city'
  },
  {
    id: 'car_dealership_loc',
    name: 'Car Dealership & Showroom',
    nameRu: 'Автосалон "Премиум Авто"',
    x: 252,
    y: 5600,
    description: 'Официальный автосалон: выставка авто, выбор цвета и КПП, покупка с ПТС и ключом',
    icon: <Car className="w-7 h-7 text-amber-400" />,
    category: 'city'
  },
  {
    id: 'downtown_plaza',
    name: 'Downtown Commercial Plaza',
    nameRu: 'Деловой Центр (Парковка & Небоскребы)',
    x: 4000,
    y: 2000,
    description: 'Оживленный перекрёсток проспектов, высотные офисы и парковочный комплекс',
    icon: <Building2 className="w-7 h-7 text-slate-300" />,
    category: 'city'
  },
  {
    id: 'residential_courtyard',
    name: 'Residential Courtyard',
    nameRu: 'Жилой Двор (Многоэтажки & Дворовая парковка)',
    x: 2750,
    y: 2400,
    description: 'Уютный закрытый двор, подъезды, скамейки, урны, баки и припаркованные авто',
    icon: <Home className="w-7 h-7 text-amber-400" />,
    category: 'city'
  },
  {
    id: 'garage_coop_loc',
    name: 'Garage Cooperative Vostok-1',
    nameRu: 'Гаражный Кооператив «Восток-1»',
    x: 1200,
    y: 4800,
    description: 'Массив частных кирпичных гаражей, ремонтные ямы и эстакады',
    icon: <Wrench className="w-7 h-7 text-slate-400" />,
    category: 'industrial'
  },
  {
    id: 'cottage_district_loc',
    name: 'Pine Ridge Cottage Settlement',
    nameRu: 'Коттеджный Посёлок «Сосновый Бор»',
    x: 4500,
    y: 6400,
    description: 'Тихий частный сектор, загородные дома, коттеджи и живописные улички',
    icon: <Home className="w-7 h-7 text-emerald-400" />,
    category: 'nature'
  },
  {
    id: 'auto_service_pitstop',
    name: 'PIT-STOP Auto Repair Service',
    nameRu: 'Автотехцентр "PIT-STOP" & Тюнинг',
    x: 2400,
    y: 3500,
    description: 'СТО, ремонт двигателя, замена жидкостей, шин и покупка автозапчастей',
    icon: <Wrench className="w-7 h-7 text-amber-500" />,
    category: 'city'
  },
  {
    id: 'gas_station_main_loc',
    name: 'Grand-Oil Gas Station 24/7',
    nameRu: 'АЗС «Гранд-Ойл» (Минимаркет 24/7)',
    x: 4300,
    y: 3200,
    description: 'Заправка всех видов топлива (АИ-92, 95, 98, ДТ, СУГ) и хот-доги',
    icon: <Fuel className="w-7 h-7 text-blue-400" />,
    category: 'city'
  },
  {
    id: 'hospital_city_1',
    name: 'City Emergency Hospital #1',
    nameRu: 'Городская Больница №1 / ОРИТ',
    x: 4000,
    y: 2200,
    description: 'Круглосуточный медицинский комплекс, травматология и скорая помощь',
    icon: <HeartPulse className="w-7 h-7 text-rose-500" />,
    category: 'city'
  },
  {
    id: 'gallery_mall_loc',
    name: 'Passage Shopping Mall',
    nameRu: 'ТРЦ «Пассаж» (Азимут & Электро-Маркет)',
    x: 3500,
    y: 2400,
    description: 'Крупный Торгово-Развлекательный Центр: продукты, электроника, одежда и кафе',
    icon: <ShoppingBag className="w-7 h-7 text-purple-400" />,
    category: 'city'
  },
  {
    id: 'industrial_district',
    name: 'Freight Logistics Yard',
    nameRu: 'Промзона (Грузовая база & Склады)',
    x: 6400,
    y: 1030,
    description: 'Логистический хаб, стоянки спецтехники, грузовые терминалы и ангары',
    icon: <Truck className="w-7 h-7 text-stone-400" />,
    category: 'industrial'
  },
  {
    id: 'pine_forest',
    name: 'Pine Ridge Outpost',
    nameRu: 'Лесной Заповедник & Магазин «Охота»',
    x: 1200,
    y: 1600,
    description: 'Извилистые лесные тропы, сосновый бор, пруды и магазин снаряжения',
    icon: <Map className="w-7 h-7 text-emerald-500" />,
    category: 'nature'
  },
  {
    id: 'steppe_highway',
    name: 'Steppe Express Highway M-12',
    nameRu: 'Степное Шоссе М-12 (Магистраль 110 км/ч)',
    x: 9500,
    y: 4000,
    description: 'Скоростная 4-полосная автомагистраль через дикую степь с разделительным барьером',
    icon: <Navigation className="w-7 h-7 text-amber-500" />,
    category: 'highway'
  },
  {
    id: 'steppe_village',
    name: 'Village Polynovka',
    nameRu: 'Деревня Полыновка (Полузаброшенная)',
    x: 11480,
    y: 2500,
    description: 'Атмосферная глухая деревня: деревянные избы, колодец с журавлём, клуб и сады',
    icon: <Home className="w-7 h-7 text-emerald-500" />,
    category: 'nature'
  },
  {
    id: 'highway_hub_1',
    name: 'Steppe Interchange Hub 1 (14 km)',
    nameRu: 'Развилка 1: Степной Узел (14-й км)',
    x: 14400,
    y: 4000,
    description: '4-сторонняя скоростная развязка: поворот на Северный Тракт к тайге и Южный объезд',
    icon: <Compass className="w-7 h-7 text-sky-400" />,
    category: 'highway'
  },
  {
    id: 'highway_hub_2',
    name: 'Oasis Motel & Fuel Hub (24 km)',
    nameRu: 'Развилка 2: АЗС Оазис & Мотель (24-й км)',
    x: 24000,
    y: 4000,
    description: 'Загородный комплекс: АЗС «Транзит-Оазис», мотель «Степной Бриз», съезд в Каньон',
    icon: <Fuel className="w-7 h-7 text-emerald-400" />,
    category: 'highway'
  },
  {
    id: 'alpine_pass',
    name: 'Eagle Peak Mountain Pass',
    nameRu: 'Перевал «Орлиный Пик» (Горный серпантин)',
    x: 36000,
    y: 3880,
    description: 'Высокогорная трасса над облаками, крутые виражи перевала, смотровая площадка',
    icon: <Mountain className="w-7 h-7 text-cyan-400" />,
    category: 'mountain'
  },
  {
    id: 'canyon_descent',
    name: 'Clay Bluffs & Terraces Serpentine',
    nameRu: 'Урочище «Глинистые Обрывы» (Серпантин)',
    x: 24000,
    y: 15000,
    description: 'Каскад опасных крутых поворотов, геологические разломы и террасы глинистого каньона',
    icon: <Compass className="w-7 h-7 text-amber-600" />,
    category: 'mountain'
  },
  {
    id: 'dunes_express',
    name: 'Salt Lake Steppe Express Highway',
    nameRu: 'Озерная Магистраль «Солончаки»',
    x: 32000,
    y: 9330,
    description: 'Скоростная 20-километровая панорамная прямая вдоль котловины Солёного озера и степных просторов',
    icon: <Navigation className="w-7 h-7 text-cyan-500" />,
    category: 'highway'
  },
  {
    id: 'east_gate_terminal',
    name: 'Far East Gate Terminal (48 km)',
    nameRu: 'Восточные Ворота (Терминал 48-й км)',
    x: 48000,
    y: 4000,
    description: 'Дальний рубеж автомагистрали М-12: разворотная петля и пограничный пост',
    icon: <Shield className="w-7 h-7 text-indigo-400" />,
    category: 'highway'
  }
];

export function getAllSpawnLocations(world: GameWorld | null): SpawnLocation[] {
  const list = [...SPAWN_LOCATIONS];
  if (world && Array.isArray(world.spawnPoints)) {
    for (const sp of world.spawnPoints) {
      if (!sp || !sp.id) continue;
      if (!list.some(s => s.id === sp.id)) {
        list.push({
          id: sp.id,
          name: sp.nameEn || sp.nameRu,
          nameRu: sp.nameRu,
          x: sp.x,
          y: sp.y,
          description: sp.description || 'Точка спавна с карты',
          icon: <MapPin className="w-7 h-7 text-sky-400" />,
          category: 'city'
        });
      }
    }
  }
  return list;
}
