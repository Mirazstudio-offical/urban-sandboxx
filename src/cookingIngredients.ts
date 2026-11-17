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

  { id: 'potato_whole', name: 'Raw Yellow Potato', nameRu: 'Картофель', desc: 'Whole raw potato.', descRu: 'Свежий картофельный клубень.', wt: 0.15, vol: 0.14, usable: true, hunger: 4, taste: ['Крахмалистый, вяжущий вкус сырой картошки...', 'Землистый привкус кожуры.'] },
  { id: 'potato_peeled', name: 'Peeled Raw Potato', nameRu: 'Очищенный картофель', desc: 'Peeled raw potato tuber.', descRu: 'Очищенный от кожуры сырой картофельный клубень.', wt: 0.13, vol: 0.12, usable: true, hunger: 4, taste: ['Гладкий, чистый срез картофеля...', 'Крахмалистый вкус без горечи кожуры.'] },
  { id: 'potato_sliced', name: 'Sliced Potato Wedges', nameRu: 'Нарезанный картофель (дольки)', desc: 'Sliced raw potato wedges.', descRu: 'Сырые нарезанные дольки картофеля.', wt: 0.15, vol: 0.14, usable: true, hunger: 4, taste: ['Сырой хрустящий картофель, выделяется крахмал...'] },
  { id: 'potato_grated', name: 'Grated Raw Potato Mass', nameRu: 'Тертый картофель (для драников)', desc: 'Grated raw potato pulp.', descRu: 'Тертая картофельная масса со стекающим крахмалистым соком.', wt: 0.3, vol: 0.28, usable: true, hunger: 6, taste: ['Влажная сырая картофельная кашица...'] },

  { id: 'carrot_whole', name: 'Fresh Sweet Carrot', nameRu: 'Свежая морковь', desc: 'Whole fresh sweet carrot.', descRu: 'Свежая цельная оранжевая морковь.', wt: 0.12, vol: 0.11, usable: true, hunger: 6, taste: ['Хрустящая сладкая морковка!', 'Освежающий сочный хруст.'] },
  { id: 'carrot_peeled', name: 'Peeled Fresh Carrot', nameRu: 'Очищенная морковь', desc: 'Freshly scraped sweet carrot.', descRu: 'Очищенная от кожуры ярко-оранжевая морковь.', wt: 0.1, vol: 0.09, usable: true, hunger: 6, taste: ['Гладкая, сладкая и хрустящая чистая морковка!'] },
  { id: 'carrot_diced', name: 'Diced Carrot Pieces', nameRu: 'Нарезанная морковь (кубики)', desc: 'Diced carrot pieces.', descRu: 'Нарезанная кубиками оранжевая морковь.', wt: 0.12, vol: 0.11, usable: true, hunger: 6, taste: ['Хрустящие сочные кубики свежей моркови...'] },
  { id: 'carrot_grated', name: 'Julienne Shredded Carrot', nameRu: 'Тертая морковь (салатная)', desc: 'Shredded carrot strips.', descRu: 'Тонко натертая соломкой свежая оранжевая морковь.', wt: 0.15, vol: 0.14, usable: true, hunger: 7, taste: ['Сочная сладкая морковная соломка пускает сок...'] },

  { id: 'beet_whole', name: 'Purple Beetroot', nameRu: 'Свекла красная', desc: 'Whole raw red beetroot.', descRu: 'Сырая цельная красная свекла.', wt: 0.25, vol: 0.23, usable: true, hunger: 5, taste: ['Сырая жесткая свекла со сладковато-землистым вкусом...'] },
  { id: 'beet_peeled_boiled', name: 'Boiled Peeled Beetroot', nameRu: 'Свекла отварная очищенная', desc: 'Whole peeled cooked red beetroot.', descRu: 'Цельная отварная очищенная красная свекла. Готова к употреблению или нарезке в борщ и салаты.', wt: 0.15, vol: 0.14, usable: true, hunger: 12, taste: ['Мягкая, сладкая и сочная отварная свекла!'] },
  { id: 'beet_sliced', name: 'Sliced Beetroot', nameRu: 'Нарезанная свекла (ломтики)', desc: 'Sliced raw beetroot.', descRu: 'Сырые нарезанные ломтики свеклы.', wt: 0.25, vol: 0.23, usable: true, hunger: 5, taste: ['Плотный хрустящий ломтик свежей свеклы...'] },
  { id: 'beet_grated', name: 'Grated Boiled Beetroot', nameRu: 'Тертая вареная свекла', desc: 'Grated cooked beetroot.', descRu: 'Тертая бордовая свекла для салатов и заправки.', wt: 0.2, vol: 0.18, usable: true, hunger: 10, taste: ['Сочная, сладкая рубиновая свекольная масса...'] },

  { id: 'turnip_whole', name: 'Yellow Turnip', nameRu: 'Свежая репа', desc: 'Whole turnip root.', descRu: 'Свежий плотный корнеплод желтой репы.', wt: 0.2, vol: 0.18, usable: true, hunger: 6, taste: ['Пряный, слегка горьковатый хруст свежей репы...'] },
  { id: 'turnip_sliced', name: 'Sliced Turnip Wedges', nameRu: 'Нарезанная репа (брусочки)', desc: 'Sliced yellow turnip.', descRu: 'Нарезанные брусочки хрустящей желтой репы.', wt: 0.2, vol: 0.18, usable: true, hunger: 6, taste: ['Сочные острые брусочки репы с легкой горчинкой.'] },

  { id: 'onion_bulb', name: 'Yellow Onion Bulb', nameRu: 'Репчатый лук (головка)', desc: 'Whole yellow onion.', descRu: 'Свежая головка репчатого лука.', wt: 0.1, vol: 0.09, usable: true, hunger: 4, taste: ['Ужасно жгучий вкус лука!', 'Глаза слезятся, рот горит, дыхание перехватывает!'] },
  { id: 'onion_peeled', name: 'Peeled Yellow Onion', nameRu: 'Очищенная луковица', desc: 'Peeled shiny onion bulb.', descRu: 'Очищенная от сухой шелухи блестящая сочная луковица.', wt: 0.09, vol: 0.08, usable: true, hunger: 4, taste: ['Едкий, слезоточивый сок брызжет из очищенного лука!'] },
  { id: 'onion_chopped', name: 'Chopped Onion', nameRu: 'Нашинкованный репчатый лук', desc: 'Chopped yellow onion.', descRu: 'Мелко нашинкованный репчатый лук.', wt: 0.1, vol: 0.09, usable: true, hunger: 4, taste: ['Резкий жгучий хруст нашинкованного лука...'] },
  { id: 'onion_rings', name: 'Raw Onion Rings', nameRu: 'Луковые кольца свежие', desc: 'Crisp raw onion rings.', descRu: 'Нарезанные упругие кольца репчатого лука для бургеров и мяса.', wt: 0.1, vol: 0.09, usable: true, hunger: 4, taste: ['Хрустящее кольцо острого сочного лука!'] },

  { id: 'leek_stalk', name: 'Fresh Leek Stalk', nameRu: 'Стебель лука-порея', desc: 'Whole fresh leek stalk.', descRu: 'Свежий зеленый стебель лука-порея.', wt: 0.25, vol: 0.24, usable: true, hunger: 5, taste: ['Мягкий травянистый луковый вкус порея...'] },
  { id: 'leek_sliced', name: 'Sliced Leek Rings', nameRu: 'Нарезанный лук-порей (кольца)', desc: 'Sliced leek stalk rings.', descRu: 'Нарезанные нежные бело-зеленые кольца лука-порея.', wt: 0.2, vol: 0.19, usable: true, hunger: 5, taste: ['Нежные сладковатые колечки порея...'] },
  { id: 'shallot_bulbs', name: 'Shallot Bulbs Bunch', nameRu: 'Пучок лука-шалот', desc: 'Bunch of shallot bulbs.', descRu: 'Сладковатый лук-шалот пучком.', wt: 0.15, vol: 0.14, usable: true, hunger: 5, taste: ['Нежный, слегка сладкий и менее жгучий луковый вкус...'] },

  { id: 'garlic_bulb', name: 'Whole Garlic Bulb', nameRu: 'Головка чеснока', desc: 'Whole fresh garlic bulb.', descRu: 'Цельная головка чеснока.', wt: 0.05, vol: 0.04, usable: true, hunger: 3, taste: ['Вы откусываете головку чеснока... Огненный взрыв фитонцидов во рту!', 'Дыхание обжигает, острота невероятная!'] },
  { id: 'garlic_clove', name: 'Peeled Garlic Clove', nameRu: 'Зубчик чеснока очищенный', desc: 'Single peeled garlic clove.', descRu: 'Очищенный зубчик свежего чеснока.', wt: 0.005, vol: 0.004, usable: true, hunger: 1, taste: ['Острый, жгучий зубчик чеснока. Отличный антисептик.'] },
  { id: 'garlic_crushed', name: 'Crushed Minced Garlic Paste', nameRu: 'Раздавленный чеснок (паста)', desc: 'Crushed garlic paste.', descRu: 'Раздавленная ароматная чесночная масса с соком.', wt: 0.03, vol: 0.025, usable: true, hunger: 2, taste: ['Концентрированная чесночная паста обжигает язык!'] },

  { id: 'tomato_whole', name: 'Ripe Red Tomato', nameRu: 'Томат спелый красный', desc: 'Whole red tomato.', descRu: 'Спелый цельный красный помидор.', wt: 0.15, vol: 0.14, usable: true, hunger: 8, thirst: 10, taste: ['Сочный взрыв томатного сока!', 'Тонкая кожица и нежная сладковатая мякоть помидора.'] },
  { id: 'tomato_sliced', name: 'Sliced Tomato', nameRu: 'Нарезанный кружочками томат', desc: 'Sliced ripe tomato.', descRu: 'Нарезанные кружочками ломтики томата.', wt: 0.15, vol: 0.14, usable: true, hunger: 8, thirst: 10, taste: ['Сочный нежный ломтик спелого томата...'] },
  { id: 'tomato_diced', name: 'Diced Tomato Concasse', nameRu: 'Нарезанный томат (кубики)', desc: 'Diced peeled tomatoes.', descRu: 'Сочные кубики спелого томата для соусов и пасты.', wt: 0.15, vol: 0.14, usable: true, hunger: 8, thirst: 10, taste: ['Сладкие томатные кубики тают во рту...'] },
  { id: 'tomato_cherry_single', name: 'Single Cherry Tomato', nameRu: 'Помидорка черри поштучно', desc: 'Single fresh cherry tomato.', descRu: 'Свежая одиночная помидорка черри.', wt: 0.02, vol: 0.018, usable: true, hunger: 1, thirst: 1, taste: ['Упругий сочный укус маленькой черри...', 'Маленький помидор черри со сладким соком.'] },
  { id: 'tomato_cherry_sliced', name: 'Sliced Cherry Tomato', nameRu: 'Нарезанный помидор черри (половинки)', desc: 'Sliced fresh cherry tomato halves.', descRu: 'Свежий нарезанный помидор черри (половинки).', wt: 0.02, vol: 0.018, usable: true, hunger: 1, thirst: 1, taste: ['Нежная сочная половинка помидора черри...', 'Сладкий томатный вкус половинки черри.'] },

  { id: 'cucumber_whole', name: 'Crisp Green Cucumber', nameRu: 'Огурец грунтовой свежий', desc: 'Crisp green cucumber.', descRu: 'Хрустящий зеленый грунтовой огурец.', wt: 0.12, vol: 0.11, usable: true, hunger: 6, thirst: 15, taste: ['Освежающий водянистый хруст свежего огурца!', 'Запах свежести и лета.'] },
  { id: 'cucumber_peeled', name: 'Peeled Fresh Cucumber', nameRu: 'Очищенный свежий огурец', desc: 'Peeled green cucumber.', descRu: 'Очищенный от жесткой кожуры нежный огурец.', wt: 0.1, vol: 0.09, usable: true, hunger: 6, thirst: 15, taste: ['Невероятно нежный, сочный хруст огурца без горечи.'] },
  { id: 'cucumber_sliced', name: 'Sliced Cucumber', nameRu: 'Нарезанный огурец (ломтики)', desc: 'Sliced green cucumber.', descRu: 'Нарезанный ломтиками огурец.', wt: 0.12, vol: 0.11, usable: true, hunger: 6, thirst: 15, taste: ['Хрустящий освежающий ломтик сочного огурца...'] },

  { id: 'eggplant_whole', name: 'Purple Eggplant', nameRu: 'Баклажан фиолетовый', desc: 'Whole purple eggplant.', descRu: 'Свежий фиолетовый баклажан.', wt: 0.35, vol: 0.33, usable: true, hunger: 5, taste: ['Горьковатый, резиновый вкус сырого баклажана... Очень на любителя.'] },
  { id: 'eggplant_sliced', name: 'Sliced Eggplant Rounds', nameRu: 'Нарезанный баклажан (кружки)', desc: 'Sliced purple eggplant.', descRu: 'Нарезанные кружки баклажана для обжарки и запекания.', wt: 0.3, vol: 0.28, usable: true, hunger: 5, taste: ['Сырой ломтик баклажана с плотной мякотью.'] },

  { id: 'zucchini_whole', name: 'Green Zucchini', nameRu: 'Кабачок цукини зеленый', desc: 'Whole green zucchini.', descRu: 'Свежий нежный зеленый кабачок цукини.', wt: 0.4, vol: 0.38, usable: true, hunger: 6, taste: ['Травянистый нейтральный хруст сырого кабачка...'] },
  { id: 'zucchini_sliced', name: 'Sliced Zucchini Rounds', nameRu: 'Нарезанный кабачок (кружки)', desc: 'Sliced fresh zucchini.', descRu: 'Нарезанные кружочки нежного кабачка цукини.', wt: 0.35, vol: 0.33, usable: true, hunger: 6, taste: ['Нежные сочные кружочки цукини.'] },

  { id: 'pumpkin_whole', name: 'Giant Orange Pumpkin', nameRu: 'Тыква рыжая цельная', desc: 'Giant whole orange pumpkin.', descRu: 'Огромная цельная рыжая тыква.', wt: 5.0, vol: 4.8, usable: true, hunger: 30, taste: ['Очень жесткая волокнистая кожура тыквы... Прогрызть невозможно.'] },
  { id: 'pumpkin_cut', name: 'Large Cut of Pumpkin', nameRu: 'Нарезанный кусок тыквы', desc: 'Raw pumpkin cut.', descRu: 'Свежий плотный ломоть оранжевой тыквенной мякоти.', wt: 1.0, vol: 0.95, usable: true, hunger: 15, taste: ['Плотная, сладковатая волокнистая мякоть сырой тыквы...'] },
  { id: 'pumpkin_diced', name: 'Diced Pumpkin Cubes', nameRu: 'Нарезанная тыква (кубики)', desc: 'Diced sweet pumpkin cubes.', descRu: 'Очищенные сладкие оранжевые кубики тыквы для каши и запекания.', wt: 0.4, vol: 0.38, usable: true, hunger: 10, taste: ['Сладкие плотные тыквенные кубики.'] },

  { id: 'cabbage_white_head', name: 'White Cabbage Head', nameRu: 'Кочан белокочанной капусты', desc: 'Whole white cabbage.', descRu: 'Плотный кочан белокочанной капусты.', wt: 2.0, vol: 1.9, usable: true, hunger: 12, taste: ['Сочный хруст капустных листьев!', 'Горьковатая кочерыжка и хрустящая листва.'] },
  { id: 'cabbage_half', name: 'Half White Cabbage Head', nameRu: 'Половина кочана капусты', desc: 'Half white cabbage.', descRu: 'Половина разрезанного плотного кочана капусты.', wt: 1.0, vol: 0.95, usable: true, hunger: 8, taste: ['Свежий сочный срез капустного кочана.'] },
  { id: 'cabbage_leaves', name: 'Blanched Cabbage Leaves', nameRu: 'Капустные листья (для голубцов)', desc: 'Large fresh cabbage leaves.', descRu: 'Крупные упругие листья капусты для заворачивания голубцов.', wt: 0.3, vol: 0.28, usable: true, hunger: 5, taste: ['Нежные сочные листья капусты.'] },
  { id: 'cabbage_shredded', name: 'Shredded Cabbage', nameRu: 'Нашинкованная капуста', desc: 'Shredded fresh cabbage.', descRu: 'Мелко нашинкованная сочная капуста.', wt: 0.5, vol: 0.48, usable: true, hunger: 8, taste: ['Свежий сочный салатный хруст капусты...'] },

  { id: 'cauliflower_head', name: 'Cauliflower Head', nameRu: 'Цветная капуста (кочан)', desc: 'Fresh cauliflower head.', descRu: 'Кочан свежей цветной капусты.', wt: 0.8, vol: 0.75, usable: true, hunger: 8, taste: ['Плотные соцветия сырой цветной капусты с нейтральным вкусом...'] },
  { id: 'cauliflower_florets', name: 'Cauliflower Florets Bunch', nameRu: 'Соцветия цветной капусты', desc: 'Cut cauliflower florets.', descRu: 'Разобранные нежные белые соцветия цветной капусты.', wt: 0.4, vol: 0.38, usable: true, hunger: 6, taste: ['Нежные белые хрустящие соцветия.'] },
  { id: 'broccoli_head', name: 'Whole Broccoli Head', nameRu: 'Кочан брокколи', desc: 'Whole fresh green broccoli.', descRu: 'Цельный свежий темно-зеленый кочан брокколи с плотным стеблем.', wt: 0.6, vol: 0.55, usable: true, hunger: 9, taste: ['Свежий сочный зеленый кочан брокколи.'] },
  { id: 'broccoli_florets', name: 'Broccoli Florets Bunch', nameRu: 'Соцветия брокколи', desc: 'Fresh broccoli florets bunch.', descRu: 'Зеленые кудрявые соцветия свежей брокколи.', wt: 0.4, vol: 0.38, usable: true, hunger: 6, taste: ['Хрустящие зеленые веточки брокколи с легким травяным ароматом...'] },

  { id: 'bell_pepper_red', name: 'Red Bell Pepper', nameRu: 'Болгарский перец красный', desc: 'Sweet red bell pepper.', descRu: 'Сладкий красный болгарский перец.', wt: 0.18, vol: 0.17, usable: true, hunger: 8, thirst: 8, taste: ['Очень сочный, сладкий и хрустящий красный перец!', 'Приятный свежий вкус.'] },
  { id: 'bell_pepper_yellow', name: 'Yellow Bell Pepper', nameRu: 'Болгарский перец желтый', desc: 'Sweet yellow bell pepper.', descRu: 'Сладкий желтый болгарский перец.', wt: 0.18, vol: 0.17, usable: true, hunger: 8, thirst: 8, taste: ['Сладкий сочный хруст желтого перца...'] },
  { id: 'bell_pepper_sliced', name: 'Sliced Bell Pepper Strips', nameRu: 'Нарезанный болгарский перец (соломка)', desc: 'Sliced sweet pepper strips.', descRu: 'Очищенная от семян сочная соломка красного и желтого перца.', wt: 0.18, vol: 0.17, usable: true, hunger: 8, thirst: 8, taste: ['Сладкие сочные полоски перца брызжут соком.'] },

  { id: 'chili_pepper_fresh', name: 'Spicy Red Chili Pepper', nameRu: 'Острый перец чили свежий', desc: 'Fiery fresh red chili pepper.', descRu: 'Пламенный свежий стручок красного перца чили.', wt: 0.02, vol: 0.018, usable: true, hunger: 2, energy: 10, taste: ['Взрыв капсаицинового пожара во рту!', 'Язык и горло полыхают пламенем! Глаза лезут на лоб!'] },
  { id: 'chili_pepper_sliced', name: 'Sliced Chili Pepper', nameRu: 'Нарезанный перец чили', desc: 'Sliced spicy red chili pepper.', descRu: 'Нарезанный колечками острый перец чили.', wt: 0.02, vol: 0.018, usable: true, hunger: 2, energy: 10, taste: ['Пламенное колечко чили обжигает вкусовые рецепторы...'] },
  { id: 'chili_pepper_dried', name: 'Dried Whole Red Chili Pod', nameRu: 'Сушеный перец чили', desc: 'Dried spicy red chili pod.', descRu: 'Высушенный на солнце стручок жгучего красного перца чили.', wt: 0.005, vol: 0.006, usable: true, hunger: 1, energy: 10, taste: ['Сухой ломкий чили обжигает рот концентрированной остротой!'] },

  { id: 'ginger_root_fresh', name: 'Fresh Ginger Root', nameRu: 'Свежий корень имбиря', desc: 'Fresh spicy ginger root.', descRu: 'Свежий плотный корень имбиря.', wt: 0.15, vol: 0.14, usable: true, hunger: 3, energy: 15, taste: ['Острый, лимонно-жгучий сок свежего имбиря обжигает горло!', 'Прилив тепла и бодрости.'] },
  { id: 'ginger_grated', name: 'Fresh Grated Ginger Pulp', nameRu: 'Тертый корень имбиря', desc: 'Fresh grated ginger pulp.', descRu: 'Свеженатертая пряная имбирная масса с соком.', wt: 0.05, vol: 0.04, usable: true, hunger: 2, energy: 15, taste: ['Огненный лимонно-пряный имбирный сок прочищает пазухи!'] },

  // === FRUITS & BERRIES ===
  { id: 'apple_green', name: 'Sour Green Apple', nameRu: 'Кислое зеленое яблоко', desc: 'Sour granny smith apple.', descRu: 'Сочное, кислое зеленое яблоко.', wt: 0.15, vol: 0.14, usable: true, hunger: 15, thirst: 12, taste: ['Крепкий, сочный укус яблока!', 'Яркая кислинка сводит челюсть и бодрит рецепторы!'] },
  { id: 'apple_sliced', name: 'Sliced Apple Wedges (Cored)', nameRu: 'Нарезанное яблоко (дольки)', desc: 'Crisp apple wedges without core.', descRu: 'Очищенные от сердцевины и косточек сочные дольки яблока.', wt: 0.15, vol: 0.14, usable: true, hunger: 15, thirst: 12, taste: ['Сладкие, хрустящие дольки яблока без огрызка.'] },

  { id: 'pear_yellow', name: 'Juicy Duchess Pear', nameRu: 'Сочная груша Дюшес', desc: 'Sweet juicy yellow pear.', descRu: 'Сладкая сочная желтая груша сорта Дюшес.', wt: 0.18, vol: 0.17, usable: true, hunger: 18, thirst: 15, taste: ['Медовая сладость спелой сочной груши!', 'Мякоть тает во рту, сок стекает по подбородку.'] },
  { id: 'pear_sliced', name: 'Sliced Sweet Pear Wedges', nameRu: 'Нарезанная груша (дольки)', desc: 'Juicy pear slices.', descRu: 'Нежные очищенные дольки сладкой сочной груши.', wt: 0.18, vol: 0.17, usable: true, hunger: 18, thirst: 15, taste: ['Медовый сок нежнейшей грушевой дольки...'] },

  { id: 'plum_purple', name: 'Sweet Purple Plum', nameRu: 'Слива синяя сладкая', desc: 'Ripe sweet purple plum.', descRu: 'Спелая сладкая сине-фиолетовая слива.', wt: 0.04, vol: 0.038, usable: true, hunger: 4, thirst: 4, taste: ['Нежная сладкая мякоть с легкой кислинкой у шкурки.'] },
  { id: 'plum_halves', name: 'Pitted Plum Halves', nameRu: 'Сливы половинками (без косточек)', desc: 'Pitted sweet plum halves.', descRu: 'Сочные половинки сладкой сливы без косточек.', wt: 0.15, vol: 0.14, usable: true, hunger: 14, thirst: 12, taste: ['Мягкие сочные половинки сладких слив.'] },

  { id: 'apricot_orange', name: 'Orange Apricot', nameRu: 'Абрикос спелый', desc: 'Velvety orange apricot.', descRu: 'Спелый бархатистый оранжевый абрикос.', wt: 0.03, vol: 0.028, usable: true, hunger: 3, thirst: 3, taste: ['Бархатистый сладкий абрикос...'] },
  { id: 'apricot_halves', name: 'Pitted Apricot Halves', nameRu: 'Абрикосы половинками (без косточек)', desc: 'Pitted ripe apricot halves.', descRu: 'Спелые сочные половинки абрикоса без косточек.', wt: 0.15, vol: 0.14, usable: true, hunger: 14, thirst: 12, taste: ['Сладкие, нежные абрикосовые дольки.'] },

  { id: 'peach_velvet', name: 'Fuzzy Velvet Peach', nameRu: 'Персик бархатистый', desc: 'Sweet fuzzy peach.', descRu: 'Спелый крупный бархатистый персик.', wt: 0.15, vol: 0.14, usable: true, hunger: 14, thirst: 12, taste: ['Невероятно сочный персиковый взрыв!', 'Ароматный сладкий сок и нежнейшая мякоть.'] },

  { id: 'orange_citrus', name: 'Sweet Orange Citrus', nameRu: 'Апельсин сочный', desc: 'Sweet juicy orange.', descRu: 'Спелый сочный сладкий апельсин.', wt: 0.2, vol: 0.18, usable: true, hunger: 16, thirst: 18, taste: ['Брызги эфирного масла из цедры!', 'Сладкие, наполненные соком дольки апельсина.'] },
  { id: 'orange_segments', name: 'Peeled Orange Segments', nameRu: 'Очищенный апельсин (дольки)', desc: 'Peeled juicy orange segments.', descRu: 'Очищенные от цедры сочные сладкие дольки апельсина.', wt: 0.18, vol: 0.16, usable: true, hunger: 16, thirst: 18, taste: ['Сладкие цитрусовые дольки сочным взрывом лопаются на языке!'] },

  { id: 'lemon_whole', name: 'Sour Yellow Lemon', nameRu: 'Лимон кислый желтый', desc: 'Extremely sour yellow lemon.', descRu: 'Кислый спелый желтый лимон.', wt: 0.12, vol: 0.11, usable: true, hunger: 4, thirst: 10, energy: 15, taste: ['Вы вонзаете зубы в лимон... Оглушительная кислота!', 'Глаза зажмуриваются, рот сводит спазмом! Но бодрит мгновенно!'] },
  { id: 'lemon_slice', name: 'Lemon Slice', nameRu: 'Долька лимона', desc: 'Fresh sour lemon slice.', descRu: 'Тонкий ломтик свежего лимона.', wt: 0.01, vol: 0.009, usable: true, hunger: 1, thirst: 2, energy: 3, taste: ['Освежающе-кислая долька лимона... Отлично для чая.'] },
  { id: 'lime_whole', name: 'Zesty Green Lime', nameRu: 'Лайм зеленый ароматный', desc: 'Zesty fresh green lime.', descRu: 'Ароматный кислый зеленый лайм.', wt: 0.08, vol: 0.075, usable: true, hunger: 3, thirst: 8, energy: 12, taste: ['Острый, парфюмерно-кислый вкус зеленого лайма с горчинкой...'] },
  { id: 'lime_slice', name: 'Fresh Lime Slice', nameRu: 'Долька лайма', desc: 'Fragrant green lime slice.', descRu: 'Свежая сочная долька зеленого лайма для напитков.', wt: 0.01, vol: 0.008, usable: true, hunger: 1, thirst: 2, energy: 3, taste: ['Яркая парфюмерная кислинка дольки лайма освежает язык!'] },

  { id: 'banana_single', name: 'Yellow Sweet Banana', nameRu: 'Бананы спелые (связка)', desc: 'Bunch of yellow bananas.', descRu: 'Связка спелых желтых бананов.', wt: 0.4, vol: 0.38, usable: true, hunger: 20, taste: ['Сладкий сытный банан, кремовая мякоть утоляет голод.'] },
  { id: 'banana_peeled', name: 'Peeled Sweet Banana', nameRu: 'Очищенный банан', desc: 'Freshly peeled sweet banana.', descRu: 'Очищенный от желтой кожуры спелый сладкий банан.', wt: 0.15, vol: 0.14, usable: true, hunger: 15, taste: ['Кремовая, нежная и сладкая банановая мякоть.'] },

  { id: 'melon_cantaloupe', name: 'Sweet Cantaloupe Melon', nameRu: 'Дыня Канталупа', desc: 'Sweet cantaloupe melon.', descRu: 'Сладкая круглая дыня сорта Канталупа.', wt: 2.2, vol: 2.1, usable: true, hunger: 40, thirst: 30, taste: ['Восхитительно нежный, медовый вкус спелой дыни!'] },
  { id: 'melon_slice', name: 'Juicy Slice of Sweet Melon', nameRu: 'Сочный ломоть дыни Канталупа', desc: 'Juicy slice of cantaloupe melon.', descRu: 'Нарезанный полукруглый ломоть спелой медовой дыни.', wt: 0.35, vol: 0.33, usable: true, hunger: 15, thirst: 20, taste: ['Медовая сахарная мякоть дыни тает во рту!'] },

  { id: 'watermelon_whole', name: 'Giant Striped Watermelon', nameRu: 'Арбуз полосатый цельный', desc: 'Giant ripe watermelon.', descRu: 'Огромный спелый полосатый арбуз.', wt: 6.5, vol: 6.2, usable: true, hunger: 30, thirst: 60, taste: ['Жесткая толстая корка арбуза. Нужно как-то разрезать...'] },
  { id: 'watermelon_slice', name: 'Watermelon Slice', nameRu: 'Сочный ломоть арбуза', desc: 'Juicy slice of watermelon.', descRu: 'Отрезанный сочный кусок сахарного арбуза.', wt: 0.5, vol: 0.48, usable: true, hunger: 15, thirst: 40, taste: ['Сахарная, крупитчатая мякоть арбуза! Потрясающее утоление жажды.'] },

  { id: 'pomegranate_whole', name: 'Royal Pomegranate', nameRu: 'Гранат спелый', desc: 'Ripe pomegranate fruit.', descRu: 'Спелый крупный восточный гранат.', wt: 0.4, vol: 0.38, usable: true, hunger: 10, thirst: 12, taste: ['Вы прокусываете зернышко граната... Терпко-сладкий рубиновый сок!'] },

  { id: 'kiwi_fruit', name: 'Fuzzy Kiwi Fruit', nameRu: 'Киви волосатый спелый', desc: 'Fuzzy green kiwi fruit.', descRu: 'Свежий спелый киви с волосатой шкуркой.', wt: 0.08, vol: 0.075, usable: true, hunger: 6, thirst: 6, taste: ['Нежно-зеленая кисло-сладкая мякоть с мелкими хрустящими семечками.'] },
  { id: 'kiwi_peeled', name: 'Peeled Emerald Kiwi', nameRu: 'Очищенный киви', desc: 'Peeled green kiwi.', descRu: 'Очищенный от мохнатой шкурки изумрудный плод киви.', wt: 0.07, vol: 0.065, usable: true, hunger: 6, thirst: 6, taste: ['Нежнейшая изумрудная кисло-сладкая мякоть.'] },
  { id: 'kiwi_sliced', name: 'Sliced Kiwi Rounds', nameRu: 'Нарезанный киви (кружочки)', desc: 'Sliced kiwi rounds.', descRu: 'Нарезанные кружочки сочного изумрудного киви.', wt: 0.07, vol: 0.065, usable: true, hunger: 6, thirst: 6, taste: ['Сочные кисло-сладкие кружочки киви.'] },

  // === GRAPES & EXOTIC FRUITS ===
  { id: 'grapes_green_bunch', name: 'Green Grapes Bunch', nameRu: 'Гроздь зеленого винограда', desc: 'Bunch of sweet green grapes.', descRu: 'Гроздь сочного сладкого зеленого винограда кишмиш.', wt: 0.4, vol: 0.38, usable: true, hunger: 15, thirst: 12, taste: ['Упругие ягоды винограда сочным взрывом лопаются на языке!'] },
  { id: 'grapes_red_bunch', name: 'Red Grapes Bunch', nameRu: 'Гроздь красного винограда', desc: 'Bunch of sweet red grapes.', descRu: 'Гроздь спелого красного винограда с мускатным вкусом.', wt: 0.4, vol: 0.38, usable: true, hunger: 15, thirst: 12, taste: ['Богатый мускатный вкус спелого сладкого винограда...'] },

  { id: 'pineapple_whole', name: 'Ripe Golden Pineapple', nameRu: 'Ананас спелый', desc: 'Whole sweet tropical pineapple.', descRu: 'Цельный ароматный тропический ананас с зелёным султаном.', wt: 1.4, vol: 1.5, usable: true, hunger: 28, thirst: 26, bites: 14, taste: ['Сочная золотая мякоть ананаса брызжет тропической сладостью и кислинкой!'] },
  { id: 'mango_whole', name: 'Ripe Tropical Mango', nameRu: 'Манго спелое', desc: 'Whole juicy red-gold mango.', descRu: 'Спелое сладкое манго с красно-золотистым румянцем.', wt: 0.38, vol: 0.36, usable: true, hunger: 18, thirst: 14, bites: 6, taste: ['Шелковистая медово-хвойная мякоть спелого манго тает во рту!'] },
  { id: 'passionfruit_whole', name: 'Purple Passionfruit', nameRu: 'Маракуйя фиолетовая', desc: 'Fresh aromatic passionfruit.', descRu: 'Тропическая фиолетовая маракуйя с ароматной мякотью.', wt: 0.09, vol: 0.09, usable: true, hunger: 7, thirst: 8, energy: 4, bites: 2, taste: ['Взрыв кисло-сладкого нектара маракуйи с хрустящими косточками!'] },
  { id: 'guava_whole', name: 'Pink Tropical Guava', nameRu: 'Гуава розовая', desc: 'Fresh pink-fleshed guava.', descRu: 'Ароматная грушевидная гуава с розовой мякотью.', wt: 0.18, vol: 0.18, usable: true, hunger: 10, thirst: 8, bites: 4, taste: ['Сладкий мускусный аромат земляники и груши в спелой гуаве.'] },
  { id: 'papaya_whole', name: 'Fresh Ripe Papaya', nameRu: 'Папайя спелая', desc: 'Whole sweet orange papaya.', descRu: 'Спелая тропическая папайя с янтарно-лососевой мякотью.', wt: 0.75, vol: 0.78, usable: true, hunger: 22, thirst: 18, bites: 10, taste: ['Нежная маслянистая мякоть папайи напоминает дыню и абрикос.'] },
  { id: 'dragonfruit_whole', name: 'Red Dragonfruit (Pitaya)', nameRu: 'Питахайя (драгонфрут)', desc: 'Bright magenta dragonfruit.', descRu: 'Экзотическая малиновая питахайя с зелёными чешуйками.', wt: 0.42, vol: 0.44, usable: true, hunger: 15, thirst: 16, bites: 6, taste: ['Освежающая нежная мякоть драгонфрута с мелкими чёрными семечками.'] },
  { id: 'yuzu_citrus', name: 'Japanese Yuzu Citrus', nameRu: 'Цитрус юзу свежий', desc: 'Aromatic East Asian yuzu fruit.', descRu: 'Редкий ароматный японский цитрус юзу.', wt: 0.14, vol: 0.14, usable: true, hunger: 5, thirst: 8, energy: 6, bites: 4, taste: ['Невероятно яркий аромат мандарина, лайма и хвои на языке!'] },
  { id: 'grapefruit_pink', name: 'Ruby Pink Grapefruit', nameRu: 'Грейпфрут розовый', desc: 'Large juicy pink grapefruit.', descRu: 'Крупный рубиновый грейпфрут с бодрящей горчинкой.', wt: 0.34, vol: 0.34, usable: true, hunger: 12, thirst: 18, energy: 4, bites: 6, taste: ['Бодрящая рубиновая мякоть грейпфрута с благородной горчинкой!'] },
  { id: 'mandarin_citrus', name: 'Sweet Mandarin', nameRu: 'Мандарин сладкий', desc: 'Sweet easy-peel mandarin.', descRu: 'Душистый сладкий мандарин с тонкой оранжевой кожурой.', wt: 0.09, vol: 0.09, usable: true, hunger: 6, thirst: 7, bites: 3, taste: ['Новогодний взрыв сладкого мандаринового сока!'] },
  { id: 'blood_orange_citrus', name: 'Sicilian Blood Orange', nameRu: 'Красный апельсин (сицилийский)', desc: 'Deep crimson blood orange.', descRu: 'Сицилийский кровавый апельсин с малиново-ягодной мякотью.', wt: 0.19, vol: 0.19, usable: true, hunger: 9, thirst: 14, energy: 3, bites: 5, taste: ['Глубокий цитрусовый вкус с яркой малиново-гранатовой нотой!'] },
  { id: 'radish_bunch_fresh', name: 'Fresh Red Radish Bunch', nameRu: 'Редис свежий (пучок)', desc: 'Crisp red radishes with greens.', descRu: 'Пучок хрустящего красного редиса с сочной ботвой (используется и как пигмент).', wt: 0.25, vol: 0.26, usable: true, hunger: 8, thirst: 6, bites: 6, taste: ['Хрустящий, свежий редис с приятной горчичной остринкой!'] },
  { id: 'tarragon_sprigs_fresh', name: 'Fresh Tarragon (Tarhun) Sprigs', nameRu: 'Тархун (эстрагон) пучок', desc: 'Fresh aromatic tarragon herbs.', descRu: 'Свежий пучок изумрудного эстрагона (тархуна) с анисовым ароматом.', wt: 0.04, vol: 0.035, usable: true, hunger: 2, energy: 2, bites: 2, taste: ['Травянистый анисовый вкус настоящего лимонадного тархуна!'] },
  { id: 'eucalyptus_leaves_fresh', name: 'Fresh Eucalyptus Leaves', nameRu: 'Листья эвкалипта (пучок)', desc: 'Aromatic cooling eucalyptus sprigs.', descRu: 'Пучок сизо-зелёных ароматных листьев эвкалипта.', wt: 0.05, vol: 0.05, usable: true, hunger: 1, health: 4, sleep: -4, bites: 2, taste: ['Сильный бальзамический ментолово-хвойный вкус — мгновенно пробивает дыхание!'] },
  { id: 'beeswax_bar', name: 'Food-Grade Beeswax Bar', nameRu: 'Воск пчелиный пищевой (брусок 100г)', desc: 'Natural golden beeswax E901.', descRu: 'Натуральный очищенный пчелиный воск E901 для глазирования мармелада и выпечки.', wt: 0.1, vol: 0.1, usable: false, bites: 1, taste: ['Пластичный медово-прополисный воск — не растворяется, жуётся как жвачка.'] },

  // === MUSHROOMS ===
  { id: 'cep_mushroom_whole', name: 'Porcini Wild Cep Mushroom', nameRu: 'Белый гриб лесной цельный', desc: 'King of wild forest mushrooms.', descRu: 'Свежий благородный белый гриб (боровик).', wt: 0.1, vol: 0.09, usable: true, hunger: 6, taste: ['Мясистая упругая ножка боровика с глубоким грибным ароматом.'] },
  { id: 'cep_mushroom_dried', name: 'Dried Porcini Strings', nameRu: 'Связка сушеных белых грибов', desc: 'Dried wild porcini mushrooms.', descRu: 'Душистая связка сушеных белых грибов на нитке.', wt: 0.05, vol: 0.08, usable: true, hunger: 4, taste: ['Сухой гриб жесткий, но имеет невероятно концентрированный лесной аромат.'] },
  { id: 'boletus_mushroom_whole', name: 'Birch Boletus Mushroom', nameRu: 'Подберезовик свежий', desc: 'Wild birch boletus.', descRu: 'Лесной свежий подберезовик с тонкой ножкой.', wt: 0.08, vol: 0.07, usable: true, hunger: 5, taste: ['Мягкая шляпка и упругая ножка свежего подберезовика...'] },
  { id: 'aspen_boletus_whole', name: 'Red-capped Aspen Boletus', nameRu: 'Подосиновик свежий', desc: 'Wild red-capped boletus.', descRu: 'Красивый лесной подосиновик с яркой рыжей шляпкой.', wt: 0.09, vol: 0.08, usable: true, hunger: 5, taste: ['Плотный лесной гриб со свежим ароматом хвои и листвы.'] },
  { id: 'butter_boletus_whole', name: 'Slippery Jack Butter Boletus', nameRu: 'Масленок свежий', desc: 'Slippery wild butter boletus.', descRu: 'Свежий лесной масленок со скользкой шляпкой.', wt: 0.06, vol: 0.05, usable: true, hunger: 4, taste: ['Скользкая маслянистая шляпка гриба со свежим хвойным ароматом...'] },
  { id: 'morel_spring_mushroom', name: 'Spring Morel Mushroom', nameRu: 'Сморчок весенний', desc: 'Delicacy spring morel mushroom.', descRu: 'Первый весенний гриб-сморчок со сморщенной шляпкой.', wt: 0.05, vol: 0.045, usable: true, hunger: 4, taste: ['Необычный, нежный грибной вкус весеннего сморчка...'] },
  { id: 'truffle_black_rare', name: 'Rare Black Truffle', nameRu: 'Редкий черный трюфель', desc: 'Rare expensive black truffle.', descRu: 'Драгоценный деликатесный черный трюфель.', wt: 0.03, vol: 0.025, usable: true, hunger: 6, energy: 20, taste: ['Сложнейший землистый, ореховый и чесночный аромат изысканного трюфеля...'] },
  { id: 'champignon_white_whole', name: 'Fresh White Button Champignon', nameRu: 'Шампиньон', desc: 'Cultivated white button mushroom.', descRu: 'Свежий белый шампиньон.', wt: 0.03, vol: 0.028, usable: true, hunger: 4, taste: ['Упругий нейтральный грибной вкус культивируемого шампиньона.'] },
  { id: 'champignon_brown_whole', name: 'Fresh Royal Brown Champignon', nameRu: 'Шампиньон свежий королевский', desc: 'Cultivated royal brown mushroom.', descRu: 'Свежий королевский бурый шампиньон.', wt: 0.03, vol: 0.028, usable: true, hunger: 4, taste: ['Плотный королевский шампиньон с более насыщенным ароматом...'] },
  { id: 'champignon_sliced', name: 'Sliced Champignon Mushrooms', nameRu: 'Нарезанные шампиньоны', desc: 'Sliced white champignons.', descRu: 'Свежие нарезанные шампиньоны.', wt: 0.15, vol: 0.14, usable: true, hunger: 4, taste: ['Нарезанный упругий ломтик свежего шампиньона...'] },
  { id: 'oyster_mushroom_cluster', name: 'Oyster Mushroom Cluster', nameRu: 'Гроздь вешенок свежих', desc: 'Cultivated oyster mushrooms.', descRu: 'Большая гроздь свежих культивируемых вешенок.', wt: 0.3, vol: 0.28, usable: true, hunger: 8, taste: ['Плотная, мясистая сероватая шляпка вешенки...'] },
  { id: 'shiitake_fresh', name: 'Fresh Shiitake Mushroom', nameRu: 'Шиитаке свежий', desc: 'Fresh shiitake mushroom.', descRu: 'Свежий зонтик азиатского гриба шиитаке.', wt: 0.04, vol: 0.038, usable: true, hunger: 4, taste: ['Пряный, древесно-грибной вкус свежего шиитаке...'] },
  { id: 'enoki_mushroom_bunch', name: 'Enoki Golden Needle Bunch', nameRu: 'Пучок грибов эноки', desc: 'White needle enoki bunch.', descRu: 'Свежий пучок нитевидных белых грибов эноки.', wt: 0.15, vol: 0.14, usable: true, hunger: 5, taste: ['Хрустящие тонкие нити белых грибов эноки...'] },
  { id: 'portobello_mushroom', name: 'Large Portobello Cap', nameRu: 'Шляпка гриба Портобелло', desc: 'Large meaty portobello cap.', descRu: 'Огромная мясистая шляпка гриба Портобелло.', wt: 0.12, vol: 0.11, usable: true, hunger: 6, taste: ['Мясистый, плотный укус крупного гриба Портобелло...'] },
  { id: 'wood_ear_mushroom_dried', name: 'Dried Wood Ear Mushrooms', nameRu: 'Сушеные древесные грибы (Муэр)', desc: 'Dried wood ear mushrooms.', descRu: 'Сушеные черные древесные грибы Муэр.', wt: 0.05, vol: 0.06, usable: true, hunger: 3, taste: ['Тонкие хрустящие пластинки сушеных древесных грибов...'] },
  { id: 'parasol_mushroom_cap', name: 'Parasol Mushroom Cap', nameRu: 'Шляпка гриба-зонтика', desc: 'Large parasol mushroom cap.', descRu: 'Огромная нежная шляпка гриба-зонтика пестрого.', wt: 0.06, vol: 0.05, usable: true, hunger: 4, taste: ['Нежная ореховая мякоть крупной шляпки гриба-зонтика...'] },

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

