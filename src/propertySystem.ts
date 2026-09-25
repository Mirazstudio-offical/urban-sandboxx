import { Building, GameWorld, InventoryItem, Player } from './types';
import { BuildingLayout, InteriorFurniture, InteriorRoom, InteriorWall, InteriorZone } from './buildingInteriors';
import { createItem, addItemToPlayer, getPlayerCash, deductPlayerCash, addPlayerNotification } from './items';
import { sound } from './audio';

export interface DynamicFurniture {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  width?: number;
  height?: number;
  color?: string;
  storageId?: string;
}

export interface PropertyApartment {
  id: string;
  buildingId: string;
  buildingNameRu: string;
  buildingType: Building['type'];
  address: string;
  cadastralNumber: string;
  floor: number;
  totalBuildingFloors: number;
  apartmentNumber: number;
  roomsCount: number;
  roomsLabel: string;
  areaSqM: number;
  ceilingHeightM: number;
  wallMaterial: string;
  yearBuilt: number;
  priceRub: number;
  stateDutyRub: number;
  notaryFeeRub: number;
  monthlyUtilitiesRub: number;
  descriptionRu: string;
  features: string[];
  keyId: string;
  lockCode: string;
  isLocked: boolean;
  isOwned: boolean;
  ownerName?: string;
  purchaseDate?: string;
  layout: BuildingLayout;
  dynamicFurniture?: DynamicFurniture[];
  entranceWorldX?: number;
  entranceWorldY?: number;
  spawnX?: number;
  spawnY?: number;
}

// Pre-configured realistic apartments across city residential districts
export const CITY_APARTMENTS: PropertyApartment[] = [
  {
    id: 'apt_sovetskaya_fl2_kv14',
    buildingId: 'court_bld_w_5_2',
    buildingNameRu: 'Панельный 9-этажный дом (Серия II-49)',
    buildingType: 'panel_apartment',
    address: 'ул. Парковая, д. 14, 4-й этаж, кв. 14',
    cadastralNumber: '77:04:0002014:1488',
    floor: 3, // Floor 3 in court_bld_w_5_2 has Kv. 14
    totalBuildingFloors: 9,
    apartmentNumber: 14,
    roomsCount: 1,
    roomsLabel: '1-комнатная квартира (Евро-однушка)',
    areaSqM: 38.5,
    ceilingHeightM: 2.65,
    wallMaterial: 'Железобетонные утепленные панели',
    yearBuilt: 2018,
    priceRub: 1850000,
    stateDutyRub: 2000,
    notaryFeeRub: 12000,
    monthlyUtilitiesRub: 3400,
    descriptionRu: 'Уютная светлая однокомнатная квартира на 4-м этаже типового 9-этажного дома. Выполнен свежий косметический ремонт: ламинат, стеклопакеты, новая сантехника. Окна выходят в тихий зеленый двор.',
    features: [
      'Гостиная-спальня с двуспальной кроватью и ТВ',
      'Оборудованная кухня с холодильником и обеденным столом',
      'Раздельный санузел и стиральная машина',
      'Застекленный балкон',
      'Центральное отопление и водоснабжение'
    ],
    keyId: 'key_sovetskaya_14',
    lockCode: 'LC-SOV14-2018',
    isLocked: true,
    isOwned: false,
    entranceWorldX: 4184,
    entranceWorldY: 2042,
    layout: null
  },
  {
    id: 'apt_lenina_fl3_kv27',
    buildingId: 'court_bld_n_5_2',
    buildingNameRu: 'Кирпичный дом повышенной комфортности (Сталинка)',
    buildingType: 'brick_residential',
    address: 'ул. Садовая, д. 8, 5-й этаж, кв. 27',
    cadastralNumber: '77:01:0003008:2741',
    floor: 4, // Floor 4 in court_bld_n_5_2 has Kv. 27
    totalBuildingFloors: 5,
    apartmentNumber: 27,
    roomsCount: 2,
    roomsLabel: '2-комнатная квартира с высокими потолками',
    areaSqM: 56.4,
    ceilingHeightM: 3.20,
    wallMaterial: 'Красный полнотелый кирпич (толщина 64 см)',
    yearBuilt: 1958,
    priceRub: 3200000,
    stateDutyRub: 2000,
    notaryFeeRub: 15000,
    monthlyUtilitiesRub: 4200,
    descriptionRu: 'Престижная 2-комнатная квартира в историческом центре. Толстые кирпичные стены гарантируют идеальную шумоизоляцию и тепло зимой. Высокие потолки 3.2 м, дубовый паркет, лепнина на потолке.',
    features: [
      'Просторная спальня с премиальной кроватью King-Size',
      'Большая гостиная с угловым диваном, домашним кинотеатром и библиотекой',
      'Кухня 12 м² с полным набором встроенной техники и вытяжкой',
      'Ванная комната с чугунной ванной и биде',
      'Кованый балкон с видом на проспект'
    ],
    keyId: 'key_lenina_27',
    lockCode: 'LC-LEN27-1958',
    isLocked: true,
    isOwned: false,
    entranceWorldX: 4375,
    entranceWorldY: 1754,
    layout: null
  },
  {
    id: 'apt_horizon_fl7_kv14',
    buildingId: 'urb_l0_w_6_0',
    buildingNameRu: 'ЖК «Горизонт» (Бизнес-класс)',
    buildingType: 'modern_residential',
    address: 'ул. Набережная, д. 40, 7-й этаж, кв. 14',
    cadastralNumber: '77:02:0005040:8819',
    floor: 6, // 7th floor in urb_l0_w_6_0 has Kv. 14
    totalBuildingFloors: 12,
    apartmentNumber: 14,
    roomsCount: 2,
    roomsLabel: '2-комнатные апартаменты с панорамными окнами',
    areaSqM: 64.0,
    ceilingHeightM: 3.00,
    wallMaterial: 'Монолитный железобетон с вентилируемым керамогранитным фасадом',
    yearBuilt: 2021,
    priceRub: 4800000,
    stateDutyRub: 2000,
    notaryFeeRub: 20000,
    monthlyUtilitiesRub: 5200,
    descriptionRu: 'Элитные видовые апартаменты в современном жилом комплексе премиум-класса «Горизонт». Панорамное остекление, дизайнерская отделка, охраняемая территория, скоростные бесшумные лифты.',
    features: [
      'Мастер-спальня с гардеробной зоной',
      'Кухня-гостиная с барной стойкой и панорамным остеклением',
      'Система кондиционирования и теплые полы',
      'Подземный паркинг и консьерж-сервис'
    ],
    keyId: 'key_horizon_14',
    lockCode: 'LC-HOR14-2021',
    isLocked: true,
    isOwned: false,
    entranceWorldX: 4956,
    entranceWorldY: 446,
    layout: null
  },
  {
    id: 'apt_cottage_steppe_12',
    buildingId: 'cottage_house_plot_12',
    buildingNameRu: 'Загородная усадьба (Коттеджный посёлок)',
    buildingType: 'suburban',
    address: 'КП «Зелёный Рукав», уч. 12 (Коттедж)',
    cadastralNumber: '77:09:0007012:1204',
    floor: 0, // Ground level 2-floor villa
    totalBuildingFloors: 2,
    apartmentNumber: 12,
    roomsCount: 4,
    roomsLabel: 'Двухэтажный кирпичный коттедж с камином и террасой',
    areaSqM: 168.0,
    ceilingHeightM: 3.10,
    wallMaterial: 'Облицовочный клинкерный кирпич + газосиликатный блок D500',
    yearBuilt: 2022,
    priceRub: 8900000,
    stateDutyRub: 2000,
    notaryFeeRub: 25000,
    monthlyUtilitiesRub: 5500,
    descriptionRu: 'Великолепный загородный коттедж на собственном земельном участке. Автономное газовое отопление, скважина с чистейшей артезианской водой, каминная зона, гараж, открытая терраса для барбекю.',
    features: [
      'Большая каминная гостиная с панорамными окнами в сад',
      'Главная спальня King-Size с выходом на террасу',
      'Гостевая спальня и рабочий кабинет',
      'Просторная кухня с каменной столешницей и винным шкафом',
      'Собственный благоустроенный двор и зона отдыха'
    ],
    keyId: 'key_cottage_12',
    lockCode: 'LC-COT12-2022',
    isLocked: true,
    isOwned: false,
    entranceWorldX: 7778,
    entranceWorldY: 5399,
    layout: {
      buildingId: 'apt_cottage_steppe_12',
      floor: 0,
      width: 240,
      height: 150,
      rooms: [
        { name: 'Прихожая / Тамбур', x: 8, y: 80, width: 48, height: 62, color: '#1e293b', floorStyle: 'tile' },
        { name: 'Каминный Зал', x: 58, y: 8, width: 104, height: 80, color: '#334155', floorStyle: 'parquet' },
        { name: 'Мастер-Спальня', x: 164, y: 8, width: 68, height: 80, color: '#1e293b', floorStyle: 'carpet' },
        { name: 'Кухня-Столовая', x: 58, y: 90, width: 94, height: 52, color: '#1e293b', floorStyle: 'tile' },
        { name: 'Ванная & Сауна', x: 8, y: 8, width: 48, height: 70, color: '#0f172a', floorStyle: 'tile' },
        { name: 'Садовая Терраса', x: 154, y: 90, width: 78, height: 52, color: '#334155', floorStyle: 'wood' }
      ],
      walls: [
        { x1: 6, y1: 6, x2: 234, y2: 6 },
        { x1: 234, y1: 6, x2: 234, y2: 144 },
        { x1: 234, y1: 144, x2: 6, y2: 144 },
        { x1: 6, y1: 144, x2: 6, y2: 6 },
        // Internal dividing walls
        { x1: 56, y1: 6, x2: 56, y2: 76 },
        { x1: 56, y1: 88, x2: 56, y2: 144 },
        { x1: 6, y1: 78, x2: 56, y2: 78 },
        { x1: 162, y1: 6, x2: 162, y2: 88 },
        { x1: 56, y1: 88, x2: 234, y2: 88 },
        { x1: 152, y1: 88, x2: 152, y2: 144 }
      ],
      furniture: [
        // Master Bedroom
        { type: 'bed', x: 174, y: 14, width: 46, height: 38, angle: 0, color: '#d97706' },
        { type: 'floor_lamp', x: 166, y: 14, width: 10, height: 10, angle: 0, color: '#fef3c7' },
        { type: 'dresser', x: 166, y: 60, width: 34, height: 16, angle: 0, color: '#78350f' },
        { type: 'safe', x: 218, y: 62, width: 12, height: 14, angle: 0, color: '#0f172a' },
        // Fireplace Hall
        { type: 'sofa', x: 64, y: 16, width: 46, height: 22, angle: 0, color: '#991b1b' },
        { type: 'floor_lamp', x: 60, y: 14, width: 10, height: 10, angle: 0, color: '#fef3c7' },
        { type: 'carpet', x: 74, y: 40, width: 48, height: 34, angle: 0, color: '#b45309' },
        { type: 'bean_bag', x: 130, y: 42, width: 18, height: 18, angle: 0, color: '#ea580c' },
        { type: 'tv_cabinet', x: 114, y: 16, width: 42, height: 8, angle: 0, color: '#451a03' },
        { type: 'tv', x: 120, y: 17, width: 30, height: 5, angle: 0, color: '#0f172a' },
        // Entryway / Corridor
        { type: 'coat_rack', x: 12, y: 86, width: 12, height: 12, angle: 0, color: '#451a03' },
        { type: 'mirror', x: 48, y: 92, width: 6, height: 24, angle: 0, color: '#b45309' },
        // Kitchen
        { type: 'stove', x: 62, y: 92, width: 16, height: 14, angle: 0, color: '#1e293b' },
        { type: 'microwave', x: 80, y: 92, width: 14, height: 12, angle: 0, color: '#334155' },
        { type: 'kitchen_counter', x: 96, y: 92, width: 16, height: 14, angle: 0, color: '#64748b' },
        { type: 'fridge', x: 114, y: 92, width: 18, height: 16, angle: 0, color: '#e2e8f0' },
        { type: 'table', x: 80, y: 114, width: 32, height: 22, angle: 0, color: '#78350f' },
        { type: 'chair', x: 70, y: 118, width: 7, height: 7, angle: 0, color: '#92400e' },
        { type: 'chair', x: 116, y: 118, width: 7, height: 7, angle: 0, color: '#92400e' },
        // Bathroom & Sauna
        { type: 'bath', x: 10, y: 10, width: 42, height: 20, angle: 0, color: '#ffffff' },
        { type: 'sink', x: 10, y: 34, width: 16, height: 12, angle: 0, color: '#e2e8f0' },
        { type: 'washing_machine', x: 10, y: 52, width: 15, height: 15, angle: 0, color: '#f8fafc' },
        { type: 'toilet', x: 34, y: 52, width: 12, height: 14, angle: 0, color: '#ffffff' }
      ],
      exitZone: { x: 14, y: 124, width: 28, height: 14 },
      stairsZone: { x: 0, y: 0, width: 0, height: 0 },
      elevatorZone: { x: 0, y: 0, width: 0, height: 0 },
      exits: [{ x: 14, y: 124, width: 28, height: 14 }],
      stairs: [],
      elevators: []
    }
  }
];

// In-memory active apartments storage
let currentCityApartments: PropertyApartment[] = [...CITY_APARTMENTS];

export function getCityApartments(): PropertyApartment[] {
  return currentCityApartments;
}

export function initializeCityApartmentsFromWorld(world: GameWorld): void {
  // Preserve any modified state (isLocked, isOwned, dynamicFurniture, etc.) from existing session
  const stateMap = new Map<string, Partial<PropertyApartment>>();
  if (Array.isArray(currentCityApartments)) {
    for (const a of currentCityApartments) {
      stateMap.set(a.id, {
        isLocked: a.isLocked,
        isOwned: a.isOwned,
        ownerName: a.ownerName,
        purchaseDate: a.purchaseDate,
        dynamicFurniture: a.dynamicFurniture
      });
    }
  }

  const dynamicApartments: PropertyApartment[] = [...CITY_APARTMENTS];

  // Apply saved state to base apartments
  for (const apt of dynamicApartments) {
    const saved = stateMap.get(apt.id);
    if (saved) {
      Object.assign(apt, saved);
    }
  }

  const suburbanTemplate = CITY_APARTMENTS.find(a => a.buildingType === 'suburban');

  if (world && Array.isArray(world.buildings)) {
    world.buildings.forEach(bld => {
      const isResidential = ['panel_apartment', 'brick_residential', 'modern_residential', 'suburban'].includes(bld.type);
      if (!isResidential) return;

      // Determine street name
      let street = 'ул. Садовая';
      if (bld.x < 2500) street = 'ул. Лесная';
      else if (bld.x > 5800) street = 'ул. Загородная';
      else if (bld.y < 2500) street = 'ул. Парковая';
      else if (bld.y > 5800) street = 'пр. Строителей';
      else if (bld.y > 4500) street = 'ул. Тенистая';
      else if (bld.x > 4500) street = 'ул. Набережная';

      // House number
      const houseNum = Math.floor((bld.x + bld.y) / 190) % 65 + 1;

      if (bld.type === 'suburban') {
        // Skip if already registered
        if (dynamicApartments.some(a => a.buildingId === bld.id)) return;

        // Skip if it's an abandoned/old village building
        if (
          bld.id.toLowerCase().includes('abandoned') ||
          bld.id.toLowerCase().includes('izba') ||
          bld.id.toLowerCase().includes('village') ||
          bld.id.toLowerCase().includes('old') ||
          bld.id.toLowerCase().includes('ruin') ||
          (bld.nameRu && bld.nameRu.toLowerCase().includes('заброш')) ||
          (bld.nameRu && bld.nameRu.toLowerCase().includes('изба')) ||
          (bld.nameRu && bld.nameRu.toLowerCase().includes('деревн'))
        ) {
          return;
        }

        // Single cottage
        const price = 6500000 + Math.floor(bld.x % 4) * 1000000;
        const area = 140 + Math.floor(bld.y % 3) * 30;
        const roomsLabel = 'Двухэтажный загородный коттедж';
        const address = `${street}, д. ${houseNum} (Коттедж)`;
        const cadastralNumber = `77:0${Math.floor(bld.x / 1000) % 9 + 1}:000${Math.floor(bld.y / 1000) % 9 + 1}00${houseNum}:1`;
        
        const cottageApt: PropertyApartment = {
          id: `suburban_${bld.id}`,
          buildingId: bld.id,
          buildingNameRu: bld.nameRu || 'Загородный коттедж',
          buildingType: 'suburban',
          address,
          cadastralNumber,
          floor: 0,
          totalBuildingFloors: 2,
          apartmentNumber: 1,
          roomsCount: 4,
          roomsLabel,
          areaSqM: area,
          ceilingHeightM: 3.0,
          wallMaterial: 'Кирпич/Брус',
          yearBuilt: 2018,
          priceRub: price,
          stateDutyRub: 2000,
          notaryFeeRub: Math.floor(price * 0.005),
          monthlyUtilitiesRub: Math.floor(area * 60),
          descriptionRu: `Уютный загородный коттедж по адресу ${address} с собственным двором.`,
          features: ['Автономное отопление', 'Каминный зал', 'Гараж', 'Терраса'],
          keyId: `key_suburban_${bld.id}`,
          lockCode: `LC-SUB-${houseNum}`,
          isLocked: true,
          isOwned: false,
          layout: suburbanTemplate?.layout ? {
            ...suburbanTemplate.layout,
            buildingId: bld.id,
            floor: 0
          } : null
        };

        const saved = stateMap.get(cottageApt.id);
        if (saved) Object.assign(cottageApt, saved);
        dynamicApartments.push(cottageApt);
        return;
      }

      // Multi-apartment building using actual interiors from map.json
      if (bld.interiors) {
        for (const floorKey of Object.keys(bld.interiors)) {
          const floorNum = parseInt(floorKey);
          const floorLayout = bld.interiors[floorKey];
          if (!floorLayout || !Array.isArray(floorLayout.rooms)) continue;

          floorLayout.rooms.forEach(rm => {
            if (rm && rm.name && rm.name.startsWith('Кв.')) {
              const aptNum = parseInt(rm.name.replace(/\D/g, '')) || 1;

              // Skip if already in dynamicApartments (e.g. predefined featured apartment)
              if (dynamicApartments.some(a => a.buildingId === bld.id && a.floor === floorNum && a.apartmentNumber === aptNum)) {
                return;
              }

              const address = `${street}, д. ${houseNum}, ${floorNum + 1}-й этаж, кв. ${aptNum}`;
              const cadastralNumber = `77:0${Math.floor(bld.x / 1000) % 9 + 1}:000${Math.floor(bld.y / 1000) % 9 + 1}00${houseNum}:${aptNum}`;

              let price = 1500000;
              let rooms = 1;
              let roomsLabel = '1-комнатная квартира';
              let area = 35;

              if (bld.type === 'panel_apartment') {
                price = 1400000 + (aptNum % 3) * 300000;
                rooms = (aptNum % 3) + 1;
                roomsLabel = `${rooms}-комнатная квартира (Панель)`;
                area = 35 + rooms * 15;
              } else if (bld.type === 'brick_residential') {
                price = 2200000 + (aptNum % 2) * 500000;
                rooms = (aptNum % 2) + 2;
                roomsLabel = `${rooms}-комнатная квартира (Сталинка)`;
                area = 50 + rooms * 18;
              } else if (bld.type === 'modern_residential') {
                price = 3500000 + (aptNum % 3) * 800000;
                rooms = (aptNum % 3) + 1;
                roomsLabel = `${rooms}-комнатная квартира (ЖК Бизнес)`;
                area = 45 + rooms * 20;
              }

              const aptObj: PropertyApartment = {
                id: `apt_${bld.id}_f${floorNum}_apt${aptNum}`,
                buildingId: bld.id,
                buildingNameRu: bld.nameRu || (bld.type === 'panel_apartment' ? 'Панельная многоэтажка' : (bld.type === 'brick_residential' ? 'Кирпичный сталинский дом' : 'Современный ЖК')),
                buildingType: bld.type,
                address,
                cadastralNumber,
                floor: floorNum,
                totalBuildingFloors: bld.floorsCount || 5,
                apartmentNumber: aptNum,
                roomsCount: rooms,
                roomsLabel,
                areaSqM: area,
                ceilingHeightM: bld.type === 'brick_residential' ? 3.2 : 2.7,
                wallMaterial: bld.type === 'brick_residential' ? 'Кирпич' : 'Панель/Монолит',
                yearBuilt: bld.type === 'brick_residential' ? 1965 : (bld.type === 'panel_apartment' ? 1982 : 2021),
                priceRub: price,
                stateDutyRub: 2000,
                notaryFeeRub: Math.floor(price * 0.005),
                monthlyUtilitiesRub: Math.floor(area * 80),
                descriptionRu: `Квартира №${aptNum} по адресу ${address}. Удобная планировка в обустроенном подъезде.`,
                features: ['Центральные коммуникации', 'Парковка во дворе', 'Развитый район'],
                keyId: `key_apt_${bld.id}_f${floorNum}_apt${aptNum}`,
                lockCode: `LC-DYN-${houseNum}-${aptNum}`,
                isLocked: true,
                isOwned: false,
                layout: null // Uses physical interior of the building!
              };

              const saved = stateMap.get(aptObj.id);
              if (saved) Object.assign(aptObj, saved);
              dynamicApartments.push(aptObj);
            }
          });
        }
      }
    });
  }

  currentCityApartments = dynamicApartments;
}

export function getApartmentById(aptId: string): PropertyApartment | undefined {
  return currentCityApartments.find(a => a.id === aptId);
}

export function getApartmentsByBuildingId(bldId: string): PropertyApartment[] {
  return currentCityApartments.filter(a => a.buildingId === bldId);
}

/**
 * Checks if the player has the key for a specific apartment in inventory or hands
 */
export function hasPlayerApartmentKey(player: Player, apt: PropertyApartment): boolean {
  if (!player || !player.inventory) return false;
  return player.inventory.some(item => 
    item && 
    (item.itemId === 'apartment_key' || item.itemId === 'apartment_key_spare') && 
    (item.lockCode === apt.lockCode || item.propertyId === apt.id || item.descriptionRu.includes(apt.cadastralNumber) || item.descriptionRu.includes(apt.address))
  );
}

/**
 * Toggle apartment door lock state
 */
export function toggleApartmentLock(player: Player, apt: PropertyApartment): { success: boolean; message: string } {
  if (!hasPlayerApartmentKey(player, apt)) {
    return {
      success: false,
      message: `Дверь заперта! Требуется стальной ключ от квартиры (${apt.address})`
    };
  }
  apt.isLocked = !apt.isLocked;
  return {
    success: true,
    message: apt.isLocked ? `Дверь квартиры №${apt.apartmentNumber} заперта на ключ.` : `Дверь квартиры №${apt.apartmentNumber} отперта.`
  };
}

/**
 * Purchase apartment transaction
 */
export function purchaseApartment(
  player: Player,
  apt: PropertyApartment,
  buyerFullName: string = 'Иванов Иван Иванович',
  world?: GameWorld
): { success: boolean; message: string } {
  const totalCost = apt.priceRub + apt.stateDutyRub + apt.notaryFeeRub;
  const currentCash = getPlayerCash(player);

  if (currentCash < totalCost) {
    return {
      success: false,
      message: `Недостаточно денежных средств! Требуется ${totalCost.toLocaleString('ru-RU')} ₽ (включая госпошлину и нотариуса). У вас: ${currentCash.toLocaleString('ru-RU')} ₽.`
    };
  }

  // Check inventory capacity first to prevent item loss
  let freeSlotsCount = 0;
  if (!player.rightHandItem) freeSlotsCount++;
  if (!player.leftHandItem) freeSlotsCount++;
  if (player.inventory) {
    const maxSlots = player.maxInventorySlots || 18;
    const occupiedCount = player.inventory.filter(i => i).length;
    freeSlotsCount += Math.max(0, maxSlots - occupiedCount);
  } else {
    freeSlotsCount += 18;
  }

  if (freeSlotsCount < 3) {
    return {
      success: false,
      message: `В вашем инвентаре недостаточно места! Требуется минимум 3 свободных слота (в руках или карманах) для получения ключей и договора купли-продажи.`
    };
  }

  // Deduct funds
  deductPlayerCash(player, totalCost);

  // Update apartment ownership
  apt.isOwned = true;
  apt.isLocked = false;
  apt.ownerName = buyerFullName;
  const now = new Date();
  apt.purchaseDate = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;

  const tryAddItem = (item: any, preferPockets = false) => {
    const added = addItemToPlayer(player, item, { preferPockets });
    if (!added && world) {
      if (!world.groundItems) world.groundItems = [];
      const angle = player.angle || 0;
      world.groundItems.push({
        id: `ground_prop_${Date.now()}_${Math.random()}`,
        x: player.x + Math.cos(angle) * 15 + (Math.random() * 10 - 5),
        y: player.y + Math.sin(angle) * 15 + (Math.random() * 10 - 5),
        item: item,
        spawnTime: Date.now()
      });
      addPlayerNotification(player, `Инвентарь полон! ${item.nameRu} выпал на пол.`, 'warning');
    }
  };

  // 1. Issue Primary Apartment Key (goes to active hand if free, or pocket)
  const mainKey: InventoryItem = {
    ...createItem('apartment_key'),
    name: `Ключ: ${apt.address}`,
    nameRu: `Ключ: ${apt.address}`,
    descriptionRu: `Стальной ключ от квартиры (Замок: ${apt.lockCode}). Адрес: ${apt.address}. Кадастр: ${apt.cadastralNumber}.`,
    lockCode: apt.lockCode,
    propertyId: apt.id
  } as any;
  tryAddItem(mainKey, false);

  // 2. Issue Spare Key in brass seal tag (placed directly into pockets/inventory)
  const spareKey: InventoryItem = {
    ...createItem('apartment_key_spare'),
    name: `Дубликат ключа: ${apt.address}`,
    nameRu: `Дубликат ключа: ${apt.address}`,
    descriptionRu: `Официальный запасной дубликат ключа в опечатанной латунной бирке. Адрес: ${apt.address}. Кадастровый № ${apt.cadastralNumber}.`,
    lockCode: apt.lockCode,
    propertyId: apt.id
  } as any;
  tryAddItem(spareKey, true);

  // 3. Issue Official EGRN Property Ownership Certificate (Выписка из ЕГРН)
  const regRecord = `77-77/004-${apt.apartmentNumber}/${apt.buildingId}-${now.getFullYear()}`;
  const cadastralVal = Math.round(apt.priceRub * 0.92);

  const egrnDeed: InventoryItem = {
    ...createItem('property_deed_egrn'),
    name: `Выписка ЕГРН (${apt.cadastralNumber})`,
    nameRu: `Выписка из ЕГРН (${apt.cadastralNumber})`,
    descriptionRu: `Официальная выписка из Единого государственного реестра недвижимости (ЕГРН). Собственник: ${buyerFullName}. Адрес: ${apt.address}. Площадь: ${apt.areaSqM} м². Кадастровый номер: ${apt.cadastralNumber}. Запись регистрации № ${regRecord} от ${apt.purchaseDate} г.`,
    propertyId: apt.id,
    cadastralNumber: apt.cadastralNumber,
    ownerName: buyerFullName,
    purchaseDate: apt.purchaseDate,
    areaSqM: apt.areaSqM,
    address: apt.address,
    priceRub: apt.priceRub,
    roomsCount: apt.roomsCount,
    floor: `${apt.floor} из ${(apt as any).totalFloors || 12}`,
    registrationRecord: regRecord,
    cadastralValueRub: cadastralVal
  } as any;
  tryAddItem(egrnDeed, true);

  // 4. Issue Purchase and Sale Contract (ДКП)
  const dkpContract: InventoryItem = {
    ...createItem('property_contract_dkp'),
    name: `Договор купли-продажи (${apt.address})`,
    nameRu: `Договор купли-продажи (${apt.address})`,
    descriptionRu: `Нотариально удостоверенный договор купли-продажи жилого помещения с отметкой о государственной регистрации перехода права собственности. Сумма сделки: ${apt.priceRub.toLocaleString('ru-RU')} ₽.`,
    propertyId: apt.id,
    cadastralNumber: apt.cadastralNumber,
    ownerName: buyerFullName,
    purchaseDate: apt.purchaseDate,
    areaSqM: apt.areaSqM,
    address: apt.address,
    priceRub: apt.priceRub,
    roomsCount: apt.roomsCount,
    sellerName: 'АО «ГлавНедвижимость» (Застройщик / Агентство)'
  } as any;
  tryAddItem(dkpContract, true);

  // 5. Issue Technical Passport (Техпаспорт помещения)
  const techPass: InventoryItem = {
    ...createItem('property_tech_passport'),
    name: `Техпаспорт БТИ (${apt.address})`,
    nameRu: `Техпаспорт БТИ (${apt.address})`,
    descriptionRu: `Технический паспорт жилого помещения (квартиры) БТИ с поэтажным планом, экспликацией помещений (${apt.roomsCount} комн., ${apt.areaSqM} м²) и инженерными схемами.`,
    propertyId: apt.id,
    cadastralNumber: apt.cadastralNumber,
    ownerName: buyerFullName,
    purchaseDate: apt.purchaseDate,
    areaSqM: apt.areaSqM,
    address: apt.address,
    roomsCount: apt.roomsCount,
    floor: `${apt.floor}`
  } as any;
  tryAddItem(techPass, true);

  sound.playBuySell();

  return {
    success: true,
    message: `Поздравляем с приобретением недвижимости! Вы стали законным собственником ${apt.roomsLabel} по адресу: ${apt.address}. Все ключи и документы переданы вам в инвентарь.`
  };
}
