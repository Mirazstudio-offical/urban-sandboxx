import { ItemCategory } from './types';

export interface CookingIngredientDefinition {
  itemId: string;
  name: string;
  nameRu: string;
  category: ItemCategory;
  maxStack: number;
  icon: string;
  description: string;
  descriptionRu: string;
  effects: {
    health?: number;
    hunger?: number;
    thirst?: number;
    energy?: number;
    sleepiness?: number;
  };
  weight: number;
  volume?: number;
  usable: boolean;
  biteCount?: number;
  biteDuration?: number;
  leftoverId?: string;
  leftoverNameRu?: string;
  tasteMessages?: string[];
  fullnessPerBite?: number;
}

export const COOKING_INGREDIENTS_CATALOG: Record<string, CookingIngredientDefinition> = {};

// 1. Meat templates (95 items)
interface AnimalTemplate {
  id: string;
  name: string;
  nameRu: string;
  adjM: string;
  adjF: string;
  adjN: string;
  adjPl: string;
  factor: number;
}

const animals: AnimalTemplate[] = [
  { id: 'beef', name: 'Beef', nameRu: 'Говядина', adjM: 'говяжий', adjF: 'говяжья', adjN: 'говяжье', adjPl: 'говяжьи', factor: 1.0 },
  { id: 'pork', name: 'Pork', nameRu: 'Свинина', adjM: 'свиной', adjF: 'свиная', adjN: 'свиное', adjPl: 'свиные', factor: 0.8 },
  { id: 'mutton', name: 'Mutton', nameRu: 'Баранина', adjM: 'баранья', adjF: 'баранья', adjN: 'баранье', adjPl: 'бараньи', factor: 0.7 },
  { id: 'venison', name: 'Venison', nameRu: 'Оленина', adjM: 'олений', adjF: 'оленья', adjN: 'оленье', adjPl: 'оленьи', factor: 0.9 },
  { id: 'goat', name: 'Goat', nameRu: 'Козлятина', adjM: 'козий', adjF: 'козья', adjN: 'козье', adjPl: 'козьи', factor: 0.6 }
];

for (const a of animals) {
  const cuts = [
    { sfx: 'carcass', name: `Whole ${a.name} Carcass`, nameRu: `Целая туша (${a.nameRu.toLowerCase()})`, wt: 200 * a.factor, vol: 190 * a.factor },
    { sfx: 'side', name: `${a.name} Side`, nameRu: `Полутуша (${a.nameRu.toLowerCase()})`, wt: 100 * a.factor, vol: 95 * a.factor },
    { sfx: 'quarter', name: `${a.name} Forequarter`, nameRu: `Четвертина (${a.nameRu.toLowerCase()})`, wt: 50 * a.factor, vol: 48 * a.factor },
    { sfx: 'tenderloin_huge', name: `Huge Slab of ${a.name} Tenderloin`, nameRu: `Огромный пласт (${a.adjF} вырезка)`, wt: 6.0 * a.factor, vol: 5.8 * a.factor },
    { sfx: 'brisket_large', name: `Large Cut of ${a.name} Brisket`, nameRu: `Большой кусок (${a.adjF} грудинка)`, wt: 4.0 * a.factor, vol: 3.8 * a.factor },
    { sfx: 'rump_large', name: `Large Cut of ${a.name} Rump`, nameRu: `Большой кусок (${a.adjM} окорок)`, wt: 5.0 * a.factor, vol: 4.8 * a.factor },
    { sfx: 'neck_medium', name: `Medium Piece of ${a.name} Neck`, nameRu: `Средний кусок (${a.adjF} шея)`, wt: 2.5 * a.factor, vol: 2.4 * a.factor },
    { sfx: 'ribs_medium', name: `Medium Piece of ${a.name} Ribs`, nameRu: `Средние ребрышки (${a.adjPl})`, wt: 1.8 * a.factor, vol: 1.7 * a.factor },
    { sfx: 'scraps_small', name: `Small Pieces of ${a.name} Scraps`, nameRu: `Мелкие обрезки (${a.adjF} поджарка)`, wt: 0.5, vol: 0.48 },
    { sfx: 'liver', name: `${a.name} Liver`, nameRu: `${a.adjF} печень`, wt: 1.5 * a.factor, vol: 1.4 * a.factor },
    { sfx: 'heart', name: `${a.name} Heart`, nameRu: `${a.adjN} сердце`, wt: 0.5 * a.factor, vol: 0.48 * a.factor },
    { sfx: 'kidney', name: `${a.name} Kidney`, nameRu: `${a.adjF} почка`, wt: 0.3 * a.factor, vol: 0.28 * a.factor },
    { sfx: 'brain', name: `${a.name} Brain`, nameRu: `${a.adjM} мозг`, wt: 0.3 * a.factor, vol: 0.28 * a.factor },
    { sfx: 'tongue', name: `${a.name} Tongue`, nameRu: `${a.adjM} язык`, wt: 0.8 * a.factor, vol: 0.75 * a.factor },
    { sfx: 'tripe', name: `${a.name} Tripe (Stomach)`, nameRu: `${a.adjM} рубец (желудок)`, wt: 1.5 * a.factor, vol: 1.4 * a.factor },
    { sfx: 'intestines', name: `${a.name} Intestines`, nameRu: `${a.adjPl} очищенные кишки`, wt: 1.0, vol: 0.95 },
    { sfx: 'bone_marrow', name: `${a.name} Marrow Bone`, nameRu: `Мозговая кость (${a.adjF})`, wt: 0.8 * a.factor, vol: 0.7 * a.factor },
    { sfx: 'bone_soup', name: `${a.name} Soup Bone`, nameRu: `Суповая кость (${a.adjF})`, wt: 1.0 * a.factor, vol: 0.9 * a.factor },
    { sfx: 'tallow', name: `${a.name} Tallow`, nameRu: `Чистый нутряной жир (${a.adjM})`, wt: 1.0, vol: 1.05 },
    { sfx: 'minced', name: `Ground ${a.name} Minced Meat (1kg)`, nameRu: `Фарш ${a.adjM} (1 кг)`, wt: 1.0, vol: 0.95 }
  ];

  for (const c of cuts) {
    const isMinced = c.sfx === 'minced';
    const itemId = `${a.id}_${c.sfx}`;
    COOKING_INGREDIENTS_CATALOG[itemId] = {
      itemId,
      name: c.name,
      nameRu: c.nameRu,
      category: 'food',
      maxStack: isMinced ? 5 : (c.wt > 10 ? 1 : 5),
      icon: '',
      description: isMinced ? `Fresh ground ${a.name} minced meat (1kg). 100 portions of 10g each.` : `Raw unprocessed ${a.name} part. Part of anatomical carcass dressing.`,
      descriptionRu: isMinced ? `Свежий сырой прокрученный фарш (${a.nameRu.toLowerCase()}) (1 кг). Содержит 100 порций по 10 грамм.` : `Сырая необработанная часть туши (${a.nameRu.toLowerCase()}). Реалистичные физические параметры массы и объема.`,
      effects: isMinced ? { health: -8, hunger: 200 } : { health: -10, hunger: 15 },
      weight: isMinced ? 1.0 : parseFloat(c.wt.toFixed(3)),
      volume: isMinced ? 0.95 : parseFloat(c.vol.toFixed(3)),
      usable: true,
      biteCount: isMinced ? 100 : 5,
      biteDuration: isMinced ? 0.1 : 1.0,
      leftoverId: undefined,
      leftoverNameRu: undefined,
      tasteMessages: isMinced ? [
        `Сырой фарш (${a.nameRu.toLowerCase()}, порция 10г)...`,
        `Влажная перекрученная мясная масса (${a.nameRu.toLowerCase()})...`,
        `Мелко перемолотые волокна сырого мяса (${a.nameRu.toLowerCase()})...`
      ] : [
        `Сырое мясо (${a.nameRu.toLowerCase()})... Жутко склизко, вяло и небезопасно для желудка!`,
        `Вкус сырой крови и волокон... Вас слегка подташнивает от сыроедения.`,
        `Жевать сырую плоть крайне тяжело... Тягучая мышечная ткань.`
      ],
      fullnessPerBite: isMinced ? 1 : 3
    };
  }
}

// 2. Poultry templates (60 items)
interface BirdTemplate {
  id: string;
  name: string;
  nameRu: string;
  adjF: string;
  adjPl: string;
  factor: number;
}

const birds: BirdTemplate[] = [
  { id: 'chicken', name: 'Chicken', nameRu: 'Курица', adjF: 'куриная', adjPl: 'куриные', factor: 1.0 },
  { id: 'duck', name: 'Duck', nameRu: 'Утка', adjF: 'утиная', adjPl: 'утиные', factor: 1.2 },
  { id: 'goose', name: 'Goose', nameRu: 'Гусь', adjF: 'гусиная', adjPl: 'гусиные', factor: 2.0 },
  { id: 'turkey', name: 'Turkey', nameRu: 'Индейка', adjF: 'индюшачья', adjPl: 'индюшачьи', factor: 3.5 },
  { id: 'pheasant', name: 'Pheasant', nameRu: 'Фазан', adjF: 'фазанья', adjPl: 'фазаньи', factor: 0.8 },
  { id: 'quail', name: 'Quail', nameRu: 'Перепел', adjF: 'перепелиная', adjPl: 'перепелиные', factor: 0.15 }
];

for (const b of birds) {
  const cuts = [
    { sfx: 'carcass_raw', name: `Raw Whole ${b.name} Carcass`, nameRu: `Целая сырая тушка (${b.nameRu.toLowerCase()})`, wt: 1.5 * b.factor, vol: 1.4 * b.factor },
    { sfx: 'carcass_dressed', name: `Dressed Whole ${b.name}`, nameRu: `Потрошеная тушка (${b.nameRu.toLowerCase()})`, wt: 1.2 * b.factor, vol: 1.1 * b.factor },
    { sfx: 'breast_large', name: `Large Cut of ${b.name} Breast`, nameRu: `Филе грудки (${b.adjF})`, wt: 0.4 * b.factor, vol: 0.38 * b.factor },
    { sfx: 'thighs_medium', name: `Medium Piece of ${b.name} Thighs`, nameRu: `Бедра (${b.adjPl})`, wt: 0.3 * b.factor, vol: 0.28 * b.factor },
    { sfx: 'drumsticks_medium', name: `Medium Piece of ${b.name} Drumsticks`, nameRu: `Голени (${b.adjPl})`, wt: 0.25 * b.factor, vol: 0.23 * b.factor },
    { sfx: 'wings_small', name: `Small Piece of ${b.name} Wings`, nameRu: `Крылышки (${b.adjPl})`, wt: 0.15 * b.factor, vol: 0.14 * b.factor },
    { sfx: 'necks_small', name: `Small Piece of ${b.name} Necks`, nameRu: `Шея (${b.adjF})`, wt: 0.1 * b.factor, vol: 0.09 * b.factor },
    { sfx: 'liver', name: `${b.name} Liver`, nameRu: `Печень (${b.adjF})`, wt: 0.15 * b.factor, vol: 0.14 * b.factor },
    { sfx: 'giblets', name: `${b.name} Giblets`, nameRu: `Потроха (${b.adjPl})`, wt: 0.2 * b.factor, vol: 0.19 * b.factor },
    { sfx: 'bones', name: `${b.name} Bones`, nameRu: `Кости остова (${b.adjPl})`, wt: 0.3 * b.factor, vol: 0.28 * b.factor },
    { sfx: 'minced', name: `Ground ${b.name} Minced Meat (1kg)`, nameRu: `Фарш ${b.adjF} (1 кг)`, wt: 1.0, vol: 0.95 }
  ];

  for (const c of cuts) {
    const isMinced = c.sfx === 'minced';
    const itemId = `${b.id}_${c.sfx}`;
    COOKING_INGREDIENTS_CATALOG[itemId] = {
      itemId,
      name: c.name,
      nameRu: c.nameRu,
      category: 'food',
      maxStack: isMinced ? 5 : 8,
      icon: '',
      description: isMinced ? `Fresh ground ${b.name} poultry minced meat pack (1kg). 100 portions of 10g each.` : `Raw poultry ${b.name} part. Highly realistic weight and density parameters.`,
      descriptionRu: isMinced ? `Свежий сырой прокрученный фарш из птицы (${b.nameRu.toLowerCase()}) в лотке (1 кг). 100 порций по 10 грамм.` : `Сырая разделанная часть домашней птицы (${b.nameRu.toLowerCase()}). Реалистичные масса и объем.`,
      effects: isMinced ? { health: -6, hunger: 200 } : { health: -8, hunger: 10 },
      weight: isMinced ? 1.0 : parseFloat(c.wt.toFixed(3)),
      volume: isMinced ? 0.95 : parseFloat(c.vol.toFixed(3)),
      usable: true,
      biteCount: isMinced ? 100 : 4,
      biteDuration: isMinced ? 0.1 : 0.8,
      leftoverId: undefined,
      leftoverNameRu: undefined,
      tasteMessages: isMinced ? [
        `Сырой фарш из птицы (${b.nameRu.toLowerCase()}, порция 10г)...`,
        `Влажная мелко перекрученная масса мяса птицы (${b.nameRu.toLowerCase()})...`
      ] : [
        `Сырая птица (${b.nameRu.toLowerCase()})... Склизкое сырое мясо и риск подхватить сальмонеллу!`,
        `Холодный, склизкий укус сырого мяса птицы. Очень неприятно.`
      ],
      fullnessPerBite: isMinced ? 1 : 2
    };
  }
}

// 3. Fish templates (48 items)
interface FishTemplate {
  id: string;
  name: string;
  nameRu: string;
  adjM: string;
  adjF: string;
  adjN: string;
  adjPl: string;
  factor: number;
}

const fishes: FishTemplate[] = [
  { id: 'salmon', name: 'Salmon', nameRu: 'Лосось', adjM: 'лососевый', adjF: 'лососевая', adjN: 'лососевое', adjPl: 'лососевые', factor: 1.8 },
  { id: 'tuna', name: 'Tuna', nameRu: 'Тунец', adjM: 'тунцовый', adjF: 'тунцовая', adjN: 'тунцовое', adjPl: 'тунцовые', factor: 8.0 },
  { id: 'cod', name: 'Cod', nameRu: 'Треска', adjM: 'тресковый', adjF: 'тресковая', adjN: 'тресковое', adjPl: 'тресковые', factor: 1.5 },
  { id: 'perch', name: 'Perch', nameRu: 'Окунь', adjM: 'окуневый', adjF: 'окуневая', adjN: 'окуневое', adjPl: 'окуневые', factor: 0.4 },
  { id: 'herring', name: 'Herring', nameRu: 'Сельдь', adjM: 'селедочный', adjF: 'селедочная', adjN: 'селедочное', adjPl: 'селедочные', factor: 0.3 },
  { id: 'pike', name: 'Pike', nameRu: 'Щука', adjM: 'щучий', adjF: 'щучья', adjN: 'щучье', adjPl: 'щучьи', factor: 1.2 },
  { id: 'eel', name: 'Eel', nameRu: 'Угорь', adjM: 'угольный', adjF: 'угольная', adjN: 'угольное', adjPl: 'угольные', factor: 0.6 },
  { id: 'catfish', name: 'Catfish', nameRu: 'Сом', adjM: 'сомовый', adjF: 'сомовая', adjN: 'сомовое', adjPl: 'сомовые', factor: 3.5 }
];

for (const f of fishes) {
  const cuts = [
    { sfx: 'whole', name: `Whole ${f.name} Fish`, nameRu: `Цельный ${f.nameRu.toLowerCase()}`, wt: 2.0 * f.factor, vol: 1.8 * f.factor },
    { sfx: 'fillet', name: `${f.name} Fillet`, nameRu: `Филе (${f.adjN})`, wt: 0.6 * f.factor, vol: 0.55 * f.factor },
    { sfx: 'steak', name: `${f.name} Steak`, nameRu: `Стейк (${f.adjM})`, wt: 0.25 * f.factor, vol: 0.23 * f.factor },
    { sfx: 'head', name: `${f.name} Head`, nameRu: `Голова (${f.adjF})`, wt: 0.25 * f.factor, vol: 0.2 * f.factor },
    { sfx: 'skeleton', name: `${f.name} Skeleton & Fins`, nameRu: `Хребет и плавники (${f.adjM})`, wt: 0.15 * f.factor, vol: 0.12 * f.factor },
    { sfx: 'minced', name: `Ground ${f.name} Minced Fish (1kg)`, nameRu: `Фарш ${f.adjM} (1 кг)`, wt: 1.0, vol: 0.95 }
  ];

  for (const c of cuts) {
    const isMinced = c.sfx === 'minced';
    const itemId = `${f.id}_${c.sfx}`;
    COOKING_INGREDIENTS_CATALOG[itemId] = {
      itemId,
      name: c.name,
      nameRu: c.nameRu,
      category: 'food',
      maxStack: isMinced ? 5 : 10,
      icon: '',
      description: isMinced
        ? `Fresh ground ${f.name} fish minced meat (1kg). 100 portions of 10g each.`
        : `Fresh raw ${f.name} anatomical component. Part of realistic fish preparation.`,
      descriptionRu: isMinced
        ? `Свежий сырой рыбный фарш (${f.nameRu.toLowerCase()}, 1 кг). 100 порций по 10 грамм.`
        : `Свежий сырой анатомический компонент рыбы (${f.nameRu.toLowerCase()}). Реалистичные масса и объем.`,
      effects: isMinced ? { health: -5, hunger: 180 } : { health: -5, hunger: 12 },
      weight: isMinced ? 1.0 : parseFloat(c.wt.toFixed(3)),
      volume: isMinced ? 0.95 : parseFloat(c.vol.toFixed(3)),
      usable: true,
      biteCount: isMinced ? 100 : 4,
      biteDuration: isMinced ? 0.1 : 0.8,
      tasteMessages: isMinced ? [
        `Сырой рыбный фарш (${f.nameRu.toLowerCase()}, порция 10г)...`,
        `Перекрученное филе рыбы (${f.nameRu.toLowerCase()}) с морским ароматом...`
      ] : [
        `Сырая рыба (${f.nameRu.toLowerCase()})... Прохладный водянистый укус, пахнет тиной и солью.`,
        `Вкус сырого рыбьего жира... Скользкая текстура волокон.`
      ],
      fullnessPerBite: isMinced ? 1 : 2
    };
  }
}

// 4. Seafood, Vegetables, Fruits, Mushrooms, Fresh Herbs, Dairy & Single Eggs
export const extraIngredients: {
  id: string;
  name: string;
  nameRu: string;
  cat?: ItemCategory;
  stack?: number;
  desc: string;
  descRu: string;
  wt: number;
  vol: number;
  usable: boolean;
  bites?: number;
  hunger?: number;
  thirst?: number;
  health?: number;
  energy?: number;
  sleep?: number;
  leftoverId?: string;
  leftoverNameRu?: string;
  taste: string[];
}[] = [
  { id: 'minced_meat_mixed', name: 'Home Mixed Minced Meat (1kg)', nameRu: 'Фарш домашний (говядина + свинина, 1 кг)', desc: 'Classic 50/50 beef and pork minced meat (1kg).', descRu: 'Классический домашний свежий фарш (1 кг) из сочной говядины и свинины. 100 порций по 10 грамм.', wt: 1.0, vol: 0.95, usable: true, bites: 100, hunger: 200, taste: ['Сырой домашний фарш из говядины и свинины (порция 10г)...', 'Сочная перекрученная смешанная мясная масса...'] },
  { id: 'squid_tubes', name: 'Raw Squid Tubes', nameRu: 'Тушки кальмара очищенные', desc: 'Raw squid mantle tubes.', descRu: 'Очищенные сырые тушки кальмара.', wt: 0.5, vol: 0.48, usable: true, hunger: 5, taste: ['Упругий, резиновый укус сырого кальмара...', 'Пахнет соленым морем.'] },
  { id: 'squid_tentacles', name: 'Raw Squid Tentacles', nameRu: 'Щупальца кальмара', desc: 'Raw squid tentacles.', descRu: 'Сырые щупальца кальмара.', wt: 0.3, vol: 0.28, usable: true, hunger: 4, taste: ['Сырые присоски и упругая плоть щупальца...'] },
  { id: 'octopus_whole', name: 'Whole Raw Octopus', nameRu: 'Цельный осьминог', desc: 'Whole raw octopus carcass.', descRu: 'Сырой цельный осьминог.', wt: 1.5, vol: 1.4, usable: true, hunger: 10, taste: ['Слизкое, резиновое тело сырого осьминога...', 'Тяжело прожевать.'] },
  { id: 'octopus_tentacles', name: 'Octopus Tentacles', nameRu: 'Щупальца осьминога', desc: 'Fresh octopus tentacles.', descRu: 'Свежие сырые щупальца осьминога.', wt: 0.5, vol: 0.46, usable: true, hunger: 6, taste: ['Упругое щупальце с характерной текстурой...'] },
  { id: 'shrimp_king', name: 'Raw King Shrimps', nameRu: 'Королевские креветки сырые', desc: 'Unpeeled raw king shrimps.', descRu: 'Королевские креветки сырые неочищенные.', wt: 0.5, vol: 0.48, usable: true, hunger: 5, taste: ['Сырой укус креветки в панцире... Слишком хрустит и колется.'] },
  { id: 'mussels_half_shell', name: 'Mussels on Half Shell', nameRu: 'Мидии в полуракушках', desc: 'Raw green mussels on shells.', descRu: 'Свежие зеленые мидии в полуракушках.', wt: 0.4, vol: 0.35, usable: true, hunger: 4, taste: ['Склизкий солоноватый укус сырой мидии...'] },
  { id: 'scallops_fresh', name: 'Fresh Sea Scallops', nameRu: 'Морские гребешки свежие', desc: 'Fresh scallops meat.', descRu: 'Морские гребешки свежие деликатесные.', wt: 0.3, vol: 0.28, usable: true, hunger: 5, taste: ['Нежная, сладковатая плоть сырого гребешка. Удивительно приятно.'] },
  { id: 'crab_legs', name: 'King Crab Legs', nameRu: 'Ноги королевского краба', desc: 'Uncracked raw crab legs.', descRu: 'Ноги королевского краба в прочном панцире.', wt: 0.8, vol: 0.7, usable: true, hunger: 8, taste: ['Хрустит прочный панцирь крабовой ноги... До мяса не добраться.'] },

  // === VEGETABLES (UNIFIED SINGLE-PIECE BASE SPECIES) ===
  { id: 'potato_whole', name: 'Potato', nameRu: 'Картофель', desc: 'Whole raw potato tuber.', descRu: 'Свежий картофельный клубень.', wt: 0.15, vol: 0.14, usable: true, hunger: 4, taste: ['Крахмалистый, вяжущий вкус сырой картошки...', 'Землистый привкус кожуры.'] },
  { id: 'carrot_whole', name: 'Carrot', nameRu: 'Морковь', desc: 'Whole fresh sweet orange carrot.', descRu: 'Свежая цельная сладкая оранжевая морковь.', wt: 0.12, vol: 0.11, usable: true, hunger: 10, health: 2, taste: ['Хрустящая сладкая морковка.', 'Освежающий сочный хруст.'] },
  { id: 'beet_whole', name: 'Beetroot', nameRu: 'Свёкла', desc: 'Whole fresh red beetroot.', descRu: 'Цельная красная столовая свёкла.', wt: 0.25, vol: 0.23, usable: true, hunger: 10, health: 3, taste: ['Плотная сладковато-землистая свёкла.'] },
  { id: 'turnip_whole', name: 'Turnip', nameRu: 'Репа', desc: 'Whole turnip root.', descRu: 'Свежий плотный корнеплод жёлтой репы.', wt: 0.2, vol: 0.18, usable: true, hunger: 6, taste: ['Пряный, слегка горьковатый хруст свежей репы.'] },
  { id: 'onion_bulb', name: 'Onion', nameRu: 'Репчатый лук', desc: 'Whole yellow onion bulb.', descRu: 'Свежая головка репчатого лука.', wt: 0.1, vol: 0.09, usable: true, hunger: 4, taste: ['Жгучий вкус лука, глаза слезятся.'] },
  { id: 'leek_stalk', name: 'Leek', nameRu: 'Лук-порей', desc: 'Whole fresh leek stalk.', descRu: 'Свежий зелёный стебель лука-порея.', wt: 0.25, vol: 0.24, usable: true, hunger: 5, taste: ['Мягкий травянистый луковый вкус порея.'] },
  { id: 'shallot_bulb', name: 'Shallot', nameRu: 'Лук-шалот', desc: 'Single fresh shallot bulb.', descRu: 'Сладковатая луковица лука-шалот поштучно.', wt: 0.038, vol: 0.035, usable: true, hunger: 3, taste: ['Нежный, слегка сладковатый и менее жгучий луковый вкус.'] },
  { id: 'garlic_bulb', name: 'Garlic', nameRu: 'Чеснок', desc: 'Whole fresh garlic bulb.', descRu: 'Цельная головка свежего чеснока.', wt: 0.05, vol: 0.04, usable: true, hunger: 3, taste: ['Огненный взрыв фитонцидов во рту.'] },
  { id: 'tomato_whole', name: 'Tomato', nameRu: 'Томат', desc: 'Whole ripe red tomato.', descRu: 'Спелый цельный красный помидор.', wt: 0.15, vol: 0.14, usable: true, hunger: 8, thirst: 10, taste: ['Сочный взрыв томатного сока.', 'Тонкая кожица и нежная сладковатая мякоть помидора.'] },
  { id: 'tomato_cherry_single', name: 'Cherry Tomato', nameRu: 'Томат черри', desc: 'Single fresh cherry tomato.', descRu: 'Свежая одиночная помидорка черри.', wt: 0.02, vol: 0.018, usable: true, hunger: 2, thirst: 2, bites: 2, taste: ['Упругий сочный укус маленькой черри.'] },
  { id: 'cucumber_whole', name: 'Cucumber', nameRu: 'Огурец', desc: 'Crisp green cucumber.', descRu: 'Хрустящий зелёный грунтовой огурец.', wt: 0.12, vol: 0.11, usable: true, hunger: 6, thirst: 15, taste: ['Освежающий водянистый хруст свежего огурца.'] },
  { id: 'eggplant_whole', name: 'Eggplant', nameRu: 'Баклажан', desc: 'Whole purple eggplant.', descRu: 'Свежий фиолетовый баклажан.', wt: 0.35, vol: 0.33, usable: true, hunger: 5, taste: ['Плотная слегка горьковатая мякоть сырого баклажана.'] },
  { id: 'zucchini_whole', name: 'Zucchini', nameRu: 'Кабачок цукини', desc: 'Whole green zucchini.', descRu: 'Свежий нежный зелёный кабачок цукини.', wt: 0.4, vol: 0.38, usable: true, hunger: 6, taste: ['Травянистый нейтральный хруст сырого кабачка.'] },
  { id: 'pumpkin_whole', name: 'Pumpkin', nameRu: 'Тыква', desc: 'Whole orange pumpkin.', descRu: 'Цельная рыжая столовая тыква.', wt: 5.0, vol: 4.8, usable: true, hunger: 30, taste: ['Плотная, сладковатая волокнистая мякоть тыквы.'] },
  { id: 'cabbage_white_head', name: 'White Cabbage', nameRu: 'Капуста белокочанная', desc: 'Whole white cabbage head.', descRu: 'Плотный кочан белокочанной капусты.', wt: 2.0, vol: 1.9, usable: true, hunger: 12, taste: ['Сочный хруст капустных листьев.'] },
  { id: 'cauliflower_head', name: 'Cauliflower', nameRu: 'Цветная капуста', desc: 'Fresh cauliflower head.', descRu: 'Кочан свежей цветной капусты.', wt: 0.8, vol: 0.75, usable: true, hunger: 8, taste: ['Плотные соцветия сырой цветной капусты с мягким вкусом.'] },
  { id: 'broccoli_head', name: 'Broccoli', nameRu: 'Брокколи', desc: 'Whole fresh green broccoli.', descRu: 'Цельный свежий тёмно-зелёный кочан брокколи.', wt: 0.6, vol: 0.55, usable: true, hunger: 9, taste: ['Свежий сочный зелёный кочан брокколи.'] },
  { id: 'bell_pepper_red', name: 'Bell Pepper', nameRu: 'Болгарский перец', desc: 'Sweet juicy bell pepper.', descRu: 'Сладкий толстостенный болгарский перец.', wt: 0.18, vol: 0.17, usable: true, hunger: 8, thirst: 8, taste: ['Очень сочный, сладкий и хрустящий болгарский перец.'] },
  { id: 'chili_pepper_fresh', name: 'Chili Pepper', nameRu: 'Острый перец чили', desc: 'Fiery red chili pepper.', descRu: 'Пламенный стручок острого перца чили.', wt: 0.02, vol: 0.018, usable: true, hunger: 2, energy: 10, bites: 2, taste: ['Взрыв капсаицинового жара во рту.'] },
  { id: 'radish_single', name: 'Radish', nameRu: 'Редис', desc: 'Single crisp red radish.', descRu: 'Хрустящий красный редис поштучно.', wt: 0.028, vol: 0.026, usable: true, hunger: 3, thirst: 2, bites: 2, taste: ['Хрустящий свежий редис с приятной горчичной остринкой.'] },
  { id: 'ginger_root_fresh', name: 'Ginger Root', nameRu: 'Корень имбиря', desc: 'Fresh spicy ginger root.', descRu: 'Свежий плотный корень имбиря.', wt: 0.15, vol: 0.14, usable: true, hunger: 3, energy: 15, taste: ['Острый лимонно-жгучий сок свежего имбиря.'] },

  // === FRUITS, CITRUSES & LARGE BERRIES (UNIFIED SINGLE-PIECE BASE SPECIES) ===
  { id: 'pear_yellow', name: 'Pear', nameRu: 'Груша', desc: 'Sweet juicy yellow pear.', descRu: 'Сладкая сочная груша сорта Дюшес.', wt: 0.18, vol: 0.17, usable: true, hunger: 18, thirst: 15, taste: ['Медовая сладость спелой сочной груши.'] },
  { id: 'plum_purple', name: 'Plum', nameRu: 'Слива', desc: 'Ripe sweet purple plum.', descRu: 'Спелая сладкая сине-фиолетовая слива.', wt: 0.045, vol: 0.042, usable: true, hunger: 5, thirst: 5, bites: 3, taste: ['Нежная сладкая мякоть с лёгкой кислинкой у шкурки.'] },
  { id: 'apricot_orange', name: 'Apricot', nameRu: 'Абрикос', desc: 'Velvety orange apricot.', descRu: 'Спелый бархатистый оранжевый абрикос.', wt: 0.04, vol: 0.038, usable: true, hunger: 4, thirst: 4, bites: 3, taste: ['Бархатистый сладкий абрикос.'] },
  { id: 'peach_velvet', name: 'Peach', nameRu: 'Персик', desc: 'Sweet fuzzy peach.', descRu: 'Спелый крупный бархатистый персик.', wt: 0.15, vol: 0.14, usable: true, hunger: 14, thirst: 12, taste: ['Ароматный сладкий сок и нежнейшая мякоть персика.'] },
  { id: 'orange_citrus', name: 'Orange', nameRu: 'Апельсин', desc: 'Sweet juicy orange.', descRu: 'Спелый сочный сладкий апельсин.', wt: 0.2, vol: 0.18, usable: true, hunger: 16, thirst: 18, taste: ['Сладкие наполненные соком дольки апельсина.'] },
  { id: 'blood_orange_citrus', name: 'Blood Orange', nameRu: 'Красный апельсин', desc: 'Deep crimson blood orange.', descRu: 'Сицилийский кровавый апельсин с малиново-ягодной мякотью.', wt: 0.19, vol: 0.19, usable: true, hunger: 9, thirst: 14, energy: 3, bites: 5, taste: ['Глубокий цитрусовый вкус с малиново-гранатовой нотой.'] },
  { id: 'mandarin_citrus', name: 'Mandarin', nameRu: 'Мандарин', desc: 'Sweet easy-peel mandarin.', descRu: 'Душистый сладкий мандарин с тонкой оранжевой кожурой.', wt: 0.09, vol: 0.09, usable: true, hunger: 6, thirst: 7, bites: 3, taste: ['Яркий сладкий мандариновый сок.'] },
  { id: 'grapefruit_pink', name: 'Grapefruit', nameRu: 'Грейпфрут', desc: 'Large juicy pink grapefruit.', descRu: 'Крупный рубиновый грейпфрут с бодрящей горчинкой.', wt: 0.34, vol: 0.34, usable: true, hunger: 12, thirst: 18, energy: 4, bites: 6, taste: ['Бодрящая рубиновая мякоть грейпфрута с благородной горчинкой.'] },
  { id: 'yuzu_citrus', name: 'Yuzu Citrus', nameRu: 'Цитрус юзу', desc: 'Aromatic East Asian yuzu fruit.', descRu: 'Редкий ароматный японский цитрус юзу.', wt: 0.14, vol: 0.14, usable: true, hunger: 5, thirst: 8, energy: 6, bites: 4, taste: ['Яркий аромат мандарина, лайма и хвои.'] },
  { id: 'lemon_whole', name: 'Lemon', nameRu: 'Лимон', desc: 'Extremely sour yellow lemon.', descRu: 'Кислый спелый жёлтый лимон.', wt: 0.12, vol: 0.11, usable: true, hunger: 4, thirst: 10, energy: 15, taste: ['Яркая цитрусовая кислота, мгновенно бодрит.'] },
  { id: 'lime_whole', name: 'Lime', nameRu: 'Лайм', desc: 'Zesty fresh green lime.', descRu: 'Ароматный кислый зелёный лайм.', wt: 0.08, vol: 0.075, usable: true, hunger: 3, thirst: 8, energy: 12, taste: ['Острый парфюмерно-кислый вкус зелёного лайма.'] },
  { id: 'melon_cantaloupe', name: 'Cantaloupe Melon', nameRu: 'Дыня Канталупа', desc: 'Sweet cantaloupe melon.', descRu: 'Сладкая круглая дыня сорта Канталупа.', wt: 2.2, vol: 2.1, usable: true, hunger: 40, thirst: 30, taste: ['Нежный медовый вкус спелой дыни.'] },
  { id: 'watermelon_whole', name: 'Watermelon', nameRu: 'Арбуз', desc: 'Giant ripe watermelon.', descRu: 'Спелый полосатый сахарный арбуз.', wt: 6.5, vol: 6.2, usable: true, hunger: 30, thirst: 60, taste: ['Сахарная сочная мякоть арбуза, отлично утоляет жажду.'] },
  { id: 'pomegranate_whole', name: 'Pomegranate', nameRu: 'Гранат', desc: 'Ripe pomegranate fruit.', descRu: 'Спелый крупный восточный гранат.', wt: 0.4, vol: 0.38, usable: true, hunger: 10, thirst: 12, taste: ['Терпко-сладкий рубиновый сок зёрен граната.'] },
  { id: 'kiwi_fruit', name: 'Kiwi', nameRu: 'Киви', desc: 'Fuzzy green kiwi fruit.', descRu: 'Свежий спелый киви с изумрудной мякотью.', wt: 0.08, vol: 0.075, usable: true, hunger: 6, thirst: 6, taste: ['Нежно-зелёная кисло-сладкая мякоть с мелкими семечками.'] },
  { id: 'grape_single', name: 'Grape', nameRu: 'Виноград', desc: 'Single juicy grape berry.', descRu: 'Отдельная спелая сочная виноградина.', wt: 0.008, vol: 0.007, usable: true, hunger: 2, thirst: 2, bites: 1, taste: ['Упругая виноградина сочным взрывом лопается на языке.'] },
  { id: 'pineapple_whole', name: 'Pineapple', nameRu: 'Ананас', desc: 'Whole sweet tropical pineapple.', descRu: 'Цельный ароматный тропический ананас с зелёным султаном.', wt: 1.4, vol: 1.5, usable: true, hunger: 28, thirst: 26, bites: 14, taste: ['Сочная золотая мякоть ананаса с тропической кислинкой.'] },
  { id: 'mango_whole', name: 'Mango', nameRu: 'Манго', desc: 'Whole juicy red-gold mango.', descRu: 'Спелое сладкое манго с красно-золотистым румянцем.', wt: 0.38, vol: 0.36, usable: true, hunger: 18, thirst: 14, bites: 6, taste: ['Шелковистая медово-хвойная мякоть спелого манго.'] },
  { id: 'passionfruit_whole', name: 'Passionfruit', nameRu: 'Маракуйя', desc: 'Fresh aromatic passionfruit.', descRu: 'Тропическая фиолетовая маракуйя с ароматной мякотью.', wt: 0.09, vol: 0.09, usable: true, hunger: 7, thirst: 8, energy: 4, bites: 2, taste: ['Кисло-сладкий нектар маракуйи с хрустящими косточками.'] },
  { id: 'guava_whole', name: 'Guava', nameRu: 'Гуава', desc: 'Fresh pink-fleshed guava.', descRu: 'Ароматная грушевидная гуава с розовой мякотью.', wt: 0.18, vol: 0.18, usable: true, hunger: 10, thirst: 8, bites: 4, taste: ['Сладкий аромат земляники и груши в спелой гуаве.'] },
  { id: 'papaya_whole', name: 'Papaya', nameRu: 'Папайя', desc: 'Whole sweet orange papaya.', descRu: 'Спелая тропическая папайя с янтарно-лососевой мякотью.', wt: 0.75, vol: 0.78, usable: true, hunger: 22, thirst: 18, bites: 10, taste: ['Нежная маслянистая мякоть папайи.'] },
  { id: 'dragonfruit_whole', name: 'Dragonfruit', nameRu: 'Питахайя (драгонфрут)', desc: 'Bright magenta dragonfruit.', descRu: 'Экзотическая малиновая питахайя с зелёными чешуйками.', wt: 0.42, vol: 0.44, usable: true, hunger: 15, thirst: 16, bites: 6, taste: ['Освежающая нежная мякоть драгонфрута с чёрными семечками.'] },
  { id: 'lychee_single', name: 'Lychee', nameRu: 'Личи', desc: 'Single fresh tropical lychee fruit.', descRu: 'Тропический плод личи с нежной прозрачной мякотью и цветочным вкусом.', wt: 0.022, vol: 0.02, usable: true, hunger: 3, thirst: 4, bites: 2, taste: ['Сладкий цветочный вкус сочного плода личи.'] },

  { id: 'tarragon_sprigs_fresh', name: 'Fresh Tarragon (Tarhun) Sprigs', nameRu: 'Тархун (эстрагон) пучок', desc: 'Fresh aromatic tarragon herbs.', descRu: 'Свежий пучок изумрудного эстрагона (тархуна) с анисовым ароматом.', wt: 0.04, vol: 0.035, usable: true, hunger: 2, energy: 2, bites: 2, taste: ['Травянистый анисовый вкус настоящего тархуна.'] },
  { id: 'eucalyptus_leaves_fresh', name: 'Fresh Eucalyptus Leaves', nameRu: 'Листья эвкалипта (пучок)', desc: 'Aromatic cooling eucalyptus sprigs.', descRu: 'Пучок сизо-зелёных ароматных листьев эвкалипта.', wt: 0.05, vol: 0.05, usable: true, hunger: 1, health: 4, sleep: -4, bites: 2, taste: ['Сильный бальзамический ментолово-хвойный вкус.'] },
  { id: 'beeswax_bar', name: 'Food-Grade Beeswax Bar', nameRu: 'Воск пчелиный пищевой (брусок 100г)', desc: 'Natural golden beeswax E901.', descRu: 'Натуральный очищенный пчелиный воск E901 для глазирования мармелада и выпечки.', wt: 0.1, vol: 0.1, usable: false, bites: 1, taste: ['Пластичный медово-прополисный воск — жуётся как жвачка.'] },

  // === MUSHROOMS (UNIFIED SINGLE-PIECE BASE SPECIES) ===
  { id: 'cep_mushroom_whole', name: 'Porcini Mushroom', nameRu: 'Белый гриб (боровик)', desc: 'King of wild forest mushrooms.', descRu: 'Благородный лесной белый гриб (боровик).', wt: 0.1, vol: 0.09, usable: true, hunger: 6, taste: ['Мясистая упругая ножка боровика с глубоким грибным ароматом.'] },
  { id: 'boletus_mushroom_whole', name: 'Birch Boletus', nameRu: 'Подберёзовик', desc: 'Wild birch boletus.', descRu: 'Лесной свежий подберёзовик с тонкой ножкой.', wt: 0.08, vol: 0.07, usable: true, hunger: 5, taste: ['Мягкая шляпка и упругая ножка свежего подберёзовика.'] },
  { id: 'aspen_boletus_whole', name: 'Aspen Boletus', nameRu: 'Подосиновик', desc: 'Wild red-capped boletus.', descRu: 'Лесной подосиновик с яркой рыжей шляпкой.', wt: 0.09, vol: 0.08, usable: true, hunger: 5, taste: ['Плотный лесной гриб со свежим ароматом хвои и листвы.'] },
  { id: 'butter_boletus_whole', name: 'Butter Boletus', nameRu: 'Маслёнок', desc: 'Slippery wild butter boletus.', descRu: 'Свежий лесной маслёнок со скользкой шляпкой.', wt: 0.06, vol: 0.05, usable: true, hunger: 4, taste: ['Маслянистая шляпка гриба со свежим хвойным ароматом.'] },
  { id: 'morel_spring_mushroom', name: 'Spring Morel', nameRu: 'Сморчок', desc: 'Delicacy spring morel mushroom.', descRu: 'Весенний гриб-сморчок со сморщенной шляпкой.', wt: 0.05, vol: 0.045, usable: true, hunger: 4, taste: ['Необычный нежный грибной вкус весеннего сморчка.'] },
  { id: 'truffle_black_rare', name: 'Black Truffle', nameRu: 'Чёрный трюфель', desc: 'Rare expensive black truffle.', descRu: 'Драгоценный деликатесный чёрный трюфель.', wt: 0.03, vol: 0.025, usable: true, hunger: 6, energy: 20, taste: ['Сложный землистый, ореховый и чесночный аромат изысканного трюфеля.'] },
  { id: 'champignon_white_whole', name: 'Champignon', nameRu: 'Шампиньон', desc: 'Cultivated button mushroom.', descRu: 'Свежий культивируемый шампиньон.', wt: 0.032, vol: 0.028, usable: true, hunger: 4, taste: ['Упругий нейтральный грибной вкус шампиньона.'] },
  { id: 'oyster_mushroom_whole', name: 'Oyster Mushroom', nameRu: 'Вешенка', desc: 'Single fresh oyster mushroom.', descRu: 'Отдельный свежий мясистый гриб вешенка.', wt: 0.048, vol: 0.045, usable: true, hunger: 4, bites: 3, taste: ['Плотная мясистая сероватая шляпка вешенки.'] },
  { id: 'shiitake_fresh', name: 'Shiitake', nameRu: 'Шиитаке', desc: 'Fresh shiitake mushroom.', descRu: 'Свежий зонтик азиатского гриба шиитаке.', wt: 0.04, vol: 0.038, usable: true, hunger: 4, taste: ['Пряный древесно-грибной вкус свежего шиитаке.'] },
  { id: 'enoki_mushroom_whole', name: 'Enoki Mushroom', nameRu: 'Гриб эноки', desc: 'Single slender white enoki mushroom.', descRu: 'Тонкий хрустящий белый гриб эноки поштучно.', wt: 0.011, vol: 0.01, usable: true, hunger: 2, bites: 1, taste: ['Хрустящая тонкая ножка и миниатюрная шляпка эноки.'] },
  { id: 'portobello_mushroom', name: 'Portobello', nameRu: 'Гриб Портобелло', desc: 'Large meaty portobello mushroom.', descRu: 'Крупный мясистый гриб Портобелло.', wt: 0.12, vol: 0.11, usable: true, hunger: 6, taste: ['Мясистый плотный укус крупного гриба Портобелло.'] },
  { id: 'wood_ear_mushroom_dried', name: 'Wood Ear Mushroom', nameRu: 'Древесный гриб Муэр', desc: 'Wood ear mushroom.', descRu: 'Чёрный древесный гриб Муэр.', wt: 0.02, vol: 0.025, usable: true, hunger: 3, taste: ['Тонкие хрустящие пластинки древесных грибов.'] },
  { id: 'parasol_mushroom_cap', name: 'Parasol Mushroom', nameRu: 'Гриб-зонтик', desc: 'Large parasol mushroom.', descRu: 'Крупный лесной гриб-зонтик пёстрый.', wt: 0.06, vol: 0.05, usable: true, hunger: 4, taste: ['Нежная ореховая мякоть гриба-зонтика.'] },

  // === FRESH HERBS & WHOLE SPICES ===
  { id: 'rosemary_sprigs_fresh', name: 'Fresh Rosemary Sprigs', nameRu: 'Пучок свежего розмарина', desc: 'Fresh rosemary sprigs bunch.', descRu: 'Свежий пучок хвойных веточек розмарина.', wt: 0.03, vol: 0.025, usable: true, hunger: 2, taste: ['Сильный, смолистый хвойный вкус листьев розмарина...'] },
  { id: 'thyme_sprigs_fresh', name: 'Fresh Thyme Sprigs', nameRu: 'Пучок свежего тимьяна', desc: 'Fresh thyme bunch.', descRu: 'Свежий пучок мелкого тимьяна (чабреца).', wt: 0.02, vol: 0.018, usable: true, hunger: 2, taste: ['Душистый, пряно-горьковатый травяной вкус свежего тимьяна...'] },
  { id: 'basil_leaves_fresh', name: 'Fresh Green Basil', nameRu: 'Пучок зеленого базилика', desc: 'Fresh sweet green basil.', descRu: 'Пучок сочного зеленого базилика.', wt: 0.03, vol: 0.025, usable: true, hunger: 3, taste: ['Ароматный пряный укус базилика с анисовым оттенком...'] },
  { id: 'dill_bunch_fresh', name: 'Fresh Green Dill Bunch', nameRu: 'Пучок свежего укропа', desc: 'Fresh green dill.', descRu: 'Пучок свежего ароматного зеленого укропа.', wt: 0.05, vol: 0.04, usable: true, hunger: 3, taste: ['Классический освежающий вкус свежего укропа!'] },
  { id: 'parsley_bunch_fresh', name: 'Fresh Green Parsley', nameRu: 'Пучок свежей петрушки', desc: 'Fresh green parsley.', descRu: 'Пучок свежей зеленой петрушки кудрявой.', wt: 0.05, vol: 0.04, usable: true, hunger: 3, taste: ['Травянистый, насыщенный и слегка терпкий вкус петрушки...'] },
  { id: 'cilantro_bunch_fresh', name: 'Fresh Green Cilantro', nameRu: 'Пучок свежей кинзы', desc: 'Fresh green coriander leaves.', descRu: 'Пучок свежей ароматной кинзы (кориандра).', wt: 0.05, vol: 0.04, usable: true, hunger: 3, taste: ['Специфический мыльно-пряный вкус свежей кинзы... На любителя.'] },
  { id: 'mint_leaves_fresh', name: 'Fresh Green Peppermint', nameRu: 'Пучок свежей мяты', desc: 'Fresh peppermint bunch.', descRu: 'Пучок ароматной холодящей мяты перечной.', wt: 0.04, vol: 0.03, usable: true, hunger: 2, sleep: -5, taste: ['Взрыв ментоловой прохлады на языке!', 'Приятно освежает дыхание.'] },
  { id: 'greens_chopped_mix', name: 'Fresh Chopped Greens Mix', nameRu: 'Свежая рубленая зелень', desc: 'Chopped dill, parsley and scallions.', descRu: 'Свежая сочная посыпка из мелко нарубленного укропа, петрушки и зеленого лука.', wt: 0.05, vol: 0.04, usable: true, hunger: 3, taste: ['Ароматная, свежая сочная зелень для супа и мяса!'] },
  { id: 'cinnamon_sticks_whole', name: 'Cinnamon Sticks Whole', nameRu: 'Палочки натуральной корицы', desc: 'Whole cinnamon bark sticks.', descRu: 'Свитки натуральной коры корицы (палочки).', wt: 0.03, vol: 0.025, usable: true, hunger: 1, taste: ['Сухая древесная кора корицы, имеет теплый сладкий аромат...'] },
  { id: 'nutmeg_whole_seeds', name: 'Whole Nutmeg Seeds', nameRu: 'Цельный мускатный орех', desc: 'Whole nutmeg seeds.', descRu: 'Цельные твердые ядра мускатного ореха.', wt: 0.03, vol: 0.025, usable: true, hunger: 1, taste: ['Каменный сухой орех... Прокусить невозможно.'] },
  { id: 'vanilla_pod_fresh', name: 'Premium Fresh Vanilla Bean', nameRu: 'Стручок натуральной ванили', desc: 'Fresh black vanilla pod.', descRu: 'Стручок темной натуральной мадагаскарской ванили.', wt: 0.005, vol: 0.004, usable: true, hunger: 1, taste: ['Горький, но умопомрачительно ароматный темный стручок ванили...'] },

  // === BUTTER, CHEESE & SINGLE EGGS ===
  { id: 'butter_brick_salted', name: 'Sweet Cream Butter 82.5%', nameRu: 'Сливочное масло 82.5%', desc: 'Salted butter brick.', descRu: 'Брикет натурального сливочного масла (200 г) 82.5%.', wt: 0.2, vol: 0.21, usable: true, hunger: 15, bites: 20, taste: ['Сладковатый жирный кусок сливочного масла... Тает во рту.'] },
  { id: 'cheese_cheddar_block', name: 'Sharp Cheddar Block', nameRu: 'Сыр Чеддер (брусок)', desc: 'Sharp cheddar block.', descRu: 'Брусок выдержанного твердого сыра Чеддер.', wt: 0.35, vol: 0.33, usable: true, hunger: 18, bites: 15, taste: ['Острый, насыщенный и пикантный сырный вкус Чеддера!'] },
  { id: 'cheese_gouda_wheel', name: 'Gouda Cheese Mini Wheel', nameRu: 'Круг сыра Гауда', desc: 'Small gouda wheel.', descRu: 'Небольшой цельный круг сыра Гауда.', wt: 1.2, vol: 1.1, usable: true, hunger: 45, bites: 40, taste: ['Плотный, мягкий сливочный вкус сыра Гауда. Сытно и нежно.'] },
  { id: 'cheese_parmesan_wedge', name: 'Aged Parmesan Wedge', nameRu: 'Сыр Пармезан (кусок)', desc: 'Aged parmesan wedge.', descRu: 'Кусок твердого выдержанного сыра Пармезан.', wt: 0.25, vol: 0.23, usable: true, hunger: 16, bites: 20, taste: ['Кристаллический, соленый пикантный вкус выдержанного пармезана...'] },
  { id: 'cheese_mozzarella_ball', name: 'Fresh Mozzarella Ball', nameRu: 'Шарик сыра Моцарелла', desc: 'Mozzarella ball in brine.', descRu: 'Шарик мягкого нежного сыра Моцарелла.', wt: 0.12, vol: 0.15, usable: true, hunger: 8, bites: 6, taste: ['Очень мягкий, пресноватый нежный сливочный шарик моцареллы.'] },
  { id: 'cheese_suluguni_braid', name: 'Suluguni Smoked Braid', nameRu: 'Сыр Сулугуни копченый', desc: 'Smoked suluguni braid.', descRu: 'Волокнистая плетёная косичка копченого сыра Сулугуни.', wt: 0.3, vol: 0.28, usable: true, hunger: 14, thirst: -5, bites: 15, taste: ['Волокнистый соленый сыр с прекрасным ароматом копчения!'] },
  { id: 'cheese_feta_block', name: 'Fresh Greek Feta Block', nameRu: 'Сыр Фета (брусок)', desc: 'Fresh feta block.', descRu: 'Брусок соленого мягкого сыра Фета.', wt: 0.2, vol: 0.18, usable: true, hunger: 12, thirst: -8, bites: 12, taste: ['Рассыпчатый, солено-кисловатый сыр с нежным вкусом...'] },
  { id: 'egg_chicken_single', name: 'Farm Chicken Egg', nameRu: 'Куриное яйцо поштучно', desc: 'Single chicken egg.', descRu: 'Куриное яйцо поштучно.', wt: 0.06, vol: 0.05, usable: true, hunger: 2, bites: 1, taste: ['Сырое куриное яйцо... Полезно для горла.'] },
  { id: 'egg_quail_single', name: 'Single Quail Egg', nameRu: 'Перепелиное яйцо поштучно', desc: 'Single small quail egg.', descRu: 'Маленькое пятнистое перепелиное яйцо.', wt: 0.012, vol: 0.01, usable: true, hunger: 1, bites: 1, taste: ['Маленькое сырое перепелиное яйцо.'] },
  { id: 'egg_duck_single', name: 'Rich Farm Duck Egg', nameRu: 'Утиное яйцо крупное', desc: 'Single large duck egg.', descRu: 'Крупное утиное яйцо с прочной скорлупой.', wt: 0.09, vol: 0.08, usable: true, hunger: 3, bites: 1, taste: ['Жирное, насыщенное сырое утиное яйцо...'] },
  { id: 'egg_goose_single', name: 'Giant Farm Goose Egg', nameRu: 'Гусиное яйцо гигантское', desc: 'Single giant goose egg.', descRu: 'Огромное гусиное яйцо с толстой белой скорлупой.', wt: 0.15, vol: 0.14, usable: true, hunger: 5, bites: 1, taste: ['Огромное сырое яйцо гуся... Весь рот в склизком белке.'] }
];

for (const x of extraIngredients) {
  COOKING_INGREDIENTS_CATALOG[x.id] = {
    itemId: x.id,
    name: x.name,
    nameRu: x.nameRu,
    category: x.cat || 'food',
    maxStack: x.stack || 10,
    icon: '',
    description: x.desc,
    descriptionRu: x.descRu,
    effects: {
      hunger: x.hunger || 0,
      thirst: x.thirst || 0,
      health: x.health || 0,
      energy: x.energy || 0,
      sleepiness: x.sleep || 0
    },
    weight: x.wt,
    volume: x.vol,
    usable: x.usable,
    biteCount: x.bites || 10,
    biteDuration: 0.8,
    leftoverId: x.leftoverId,
    leftoverNameRu: x.leftoverNameRu,
    tasteMessages: x.taste,
    fullnessPerBite: Math.max(1, Math.round((x.hunger || 1) / (x.bites || 10)))
  };
}

