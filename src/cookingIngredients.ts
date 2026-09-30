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
    { sfx: 'tallow', name: `${a.name} Tallow`, nameRu: `Чистый нутряной жир (${a.adjM})`, wt: 1.0, vol: 1.05 }
  ];

  for (const c of cuts) {
    const itemId = `${a.id}_${c.sfx}`;
    COOKING_INGREDIENTS_CATALOG[itemId] = {
      itemId,
      name: c.name,
      nameRu: c.nameRu,
      category: 'food',
      maxStack: c.wt > 10 ? 1 : 5,
      icon: '',
      description: `Raw unprocessed ${a.name} part. Part of anatomical carcass dressing.`,
      descriptionRu: `Сырая необработанная часть туши (${a.nameRu.toLowerCase()}). Реалистичные физические параметры массы и объема.`,
      effects: { health: -10, hunger: 15 },
      weight: parseFloat(c.wt.toFixed(3)),
      volume: parseFloat(c.vol.toFixed(3)),
      usable: true,
      biteCount: 5,
      biteDuration: 1.0,
      tasteMessages: [
        `Сырое мясо (${a.nameRu.toLowerCase()})... Жутко склизко, вяло и небезопасно для желудка!`,
        `Вкус сырой крови и волокон... Вас слегка подташнивает от сыроедения.`,
        `Жевать сырую плоть крайне тяжело... Тягучая мышечная ткань.`
      ],
      fullnessPerBite: 3
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
    { sfx: 'bones', name: `${b.name} Bones`, nameRu: `Кости остова (${b.adjPl})`, wt: 0.3 * b.factor, vol: 0.28 * b.factor }
  ];

  for (const c of cuts) {
    const itemId = `${b.id}_${c.sfx}`;
    COOKING_INGREDIENTS_CATALOG[itemId] = {
      itemId,
      name: c.name,
      nameRu: c.nameRu,
      category: 'food',
      maxStack: 8,
      icon: '',
      description: `Raw poultry ${b.name} part. Highly realistic weight and density parameters.`,
      descriptionRu: `Сырая разделанная часть домашней птицы (${b.nameRu.toLowerCase()}). Реалистичные масса и объем.`,
      effects: { health: -8, hunger: 10 },
      weight: parseFloat(c.wt.toFixed(3)),
      volume: parseFloat(c.vol.toFixed(3)),
      usable: true,
      biteCount: 4,
      biteDuration: 0.8,
      tasteMessages: [
        `Сырая птица (${b.nameRu.toLowerCase()})... Склизкое сырое мясо и риск подхватить сальмонеллу!`,
        `Холодный, склизкий укус сырого мяса птицы. Очень неприятно.`
      ],
      fullnessPerBite: 2
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
    { sfx: 'caviar_jar', name: `${f.name} Caviar (Jar)`, nameRu: `Икра (${f.adjF}) в баночке`, wt: 0.15, vol: 0.14 }
  ];

  for (const c of cuts) {
    const itemId = `${f.id}_${c.sfx}`;
    const isCaviar = c.sfx === 'caviar_jar';
    COOKING_INGREDIENTS_CATALOG[itemId] = {
      itemId,
      name: c.name,
      nameRu: c.nameRu,
      category: 'food',
      maxStack: 10,
      icon: '',
      description: isCaviar
        ? `Fresh ${f.nameRu.toLowerCase()} caviar in a small sealed glass jar.`
        : `Fresh raw ${f.name} anatomical component. Part of realistic fish preparation.`,
      descriptionRu: isCaviar
        ? `Свежая зернистая икра (${f.nameRu.toLowerCase()}) в малом стеклянном стекле (250 мл). Деликатес.`
        : `Свежий сырой анатомический компонент рыбы (${f.nameRu.toLowerCase()}). Реалистичные масса и объем.`,
      effects: isCaviar ? { health: 5, hunger: 30, energy: 12 } : { health: -5, hunger: 12 },
      weight: parseFloat(c.wt.toFixed(3)),
      volume: parseFloat(c.vol.toFixed(3)),
      usable: true,
      biteCount: isCaviar ? 20 : 4,
      biteDuration: 0.8,
      leftoverId: isCaviar ? 'jar_glass_small' : undefined,
      leftoverNameRu: isCaviar ? 'Унифицированная стеклянная банка (0.2л)' : undefined,
      tasteMessages: isCaviar ? [
        `Соленое зернышко икры (${f.adjF}) лопается на языке... Деликатесный морской вкус!`,
        `Богатый сливочно-соленый вкус икры... Настоящий деликатес!`,
        `Маленькая ложечка икры с приятным морским ароматом.`
      ] : [
        `Сырая рыба (${f.nameRu.toLowerCase()})... Прохладный водянистый укус, пахнет тиной и солью.`,
        `Вкус сырого рыбьего жира... Скользкая текстура волокон.`
      ],
      fullnessPerBite: isCaviar ? 1 : 2
    };
  }
}

// 4. Seafood & Vegetables (38 items)
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
  { id: 'squid_tubes', name: 'Raw Squid Tubes', nameRu: 'Тушки кальмара очищенные', desc: 'Raw squid mantle tubes.', descRu: 'Очищенные сырые тушки кальмара.', wt: 0.5, vol: 0.48, usable: true, hunger: 5, taste: ['Упругий, резиновый укус сырого кальмара...', 'Пахнет соленым морем.'] },
  { id: 'squid_tentacles', name: 'Raw Squid Tentacles', nameRu: 'Щупальца кальмара', desc: 'Raw squid tentacles.', descRu: 'Сырые щупальца кальмара.', wt: 0.3, vol: 0.28, usable: true, hunger: 4, taste: ['Сырые присоски и упругая плоть щупальца...'] },
  { id: 'octopus_whole', name: 'Whole Raw Octopus', nameRu: 'Цельный осьминог', desc: 'Whole raw octopus carcass.', descRu: 'Сырой цельный осьминог.', wt: 1.5, vol: 1.4, usable: true, hunger: 10, taste: ['Слизкое, резиновое тело сырого осьминога...', 'Тяжело прожевать.'] },
  { id: 'octopus_tentacles', name: 'Octopus Tentacles', nameRu: 'Щупальца осьминога', desc: 'Fresh octopus tentacles.', descRu: 'Свежие сырые щупальца осьминога.', wt: 0.5, vol: 0.46, usable: true, hunger: 6, taste: ['Упругое щупальце с характерной текстурой...'] },
  { id: 'shrimp_king', name: 'Raw King Shrimps', nameRu: 'Королевские креветки сырые', desc: 'Unpeeled raw king shrimps.', descRu: 'Королевские креветки сырые неочищенные.', wt: 0.5, vol: 0.48, usable: true, hunger: 5, taste: ['Сырой укус креветки в панцире... Слишком хрустит и колется.'] },
  { id: 'mussels_half_shell', name: 'Mussels on Half Shell', nameRu: 'Мидии в полуракушках', desc: 'Raw green mussels on shells.', descRu: 'Свежие зеленые мидии в полуракушках.', wt: 0.4, vol: 0.35, usable: true, hunger: 4, taste: ['Склизкий солоноватый укус сырой мидии...'] },
  { id: 'scallops_fresh', name: 'Fresh Sea Scallops', nameRu: 'Морские гребешки свежие', desc: 'Fresh scallops meat.', descRu: 'Морские гребешки свежие деликатесные.', wt: 0.3, vol: 0.28, usable: true, hunger: 5, taste: ['Нежная, сладковатая плоть сырого гребешка. Удивительно приятно.'] },
  { id: 'crab_legs', name: 'King Crab Legs', nameRu: 'Ноги королевского краба', desc: 'Uncracked raw crab legs.', descRu: 'Ноги королевского краба в прочном панцире.', wt: 0.8, vol: 0.7, usable: true, hunger: 8, taste: ['Хрустит прочный панцирь крабовой ноги... До мяса не добраться.'] },

  { id: 'potato_whole', name: 'Raw Yellow Potato', nameRu: 'Картофель желтый сырой', desc: 'Whole raw potato.', descRu: 'Сырой неочищенный картофельный клубень.', wt: 0.15, vol: 0.14, usable: true, hunger: 4, taste: ['Крахмалистый, вяжущий вкус сырой картошки...', 'Землистый привкус кожуры.'] },
  { id: 'potato_sliced', name: 'Sliced Potato Wedges', nameRu: 'Нарезанный картофель (дольки)', desc: 'Sliced raw potato wedges.', descRu: 'Сырые нарезанные дольки картофеля.', wt: 0.15, vol: 0.14, usable: true, hunger: 4, taste: ['Сырой хрустящий картофель, выделяется крахмал...'] },
  { id: 'carrot_whole', name: 'Fresh Sweet Carrot', nameRu: 'Свежая морковь', desc: 'Whole fresh sweet carrot.', descRu: 'Свежая цельная оранжевая морковь.', wt: 0.12, vol: 0.11, usable: true, hunger: 6, taste: ['Хрустящая сладкая морковка!', 'Освежающий сочный хруст.'] },
  { id: 'carrot_diced', name: 'Diced Carrot Pieces', nameRu: 'Нарезанная морковь (кубики)', desc: 'Diced carrot pieces.', descRu: 'Нарезанная кубиками оранжевая морковь.', wt: 0.12, vol: 0.11, usable: true, hunger: 6, taste: ['Хрустящие сочные кубики свежей моркови...'] },
  { id: 'beet_whole', name: 'Purple Beetroot', nameRu: 'Свекла красная', desc: 'Whole raw red beetroot.', descRu: 'Сырая цельная красная свекла.', wt: 0.25, vol: 0.23, usable: true, hunger: 5, taste: ['Сырая жесткая свекла со сладковато-землистым вкусом...'] },
  { id: 'beet_sliced', name: 'Sliced Beetroot', nameRu: 'Нарезанная свекла (ломтики)', desc: 'Sliced raw beetroot.', descRu: 'Сырые нарезанные ломтики свеклы.', wt: 0.25, vol: 0.23, usable: true, hunger: 5, taste: ['Плотный хрустящий ломтик свежей свеклы...'] },
  { id: 'turnip_whole', name: 'Yellow Turnip', nameRu: 'Свежая репа', desc: 'Whole turnip root.', descRu: 'Свежий плотный корнеплод желтой репы.', wt: 0.2, vol: 0.18, usable: true, hunger: 6, taste: ['Пряный, слегка горьковатый хруст свежей репы...'] },
  { id: 'onion_bulb', name: 'Yellow Onion Bulb', nameRu: 'Репчатый лук (головка)', desc: 'Whole yellow onion.', descRu: 'Свежая головка репчатого лука.', wt: 0.1, vol: 0.09, usable: true, hunger: 4, taste: ['Ужасно жгучий вкус лука!', 'Глаза слезятся, рот горит, дыхание перехватывает!'] },
  { id: 'onion_chopped', name: 'Chopped Onion', nameRu: 'Нашинкованный репчатый лук', desc: 'Chopped yellow onion.', descRu: 'Мелко нашинкованный репчатый лук.', wt: 0.1, vol: 0.09, usable: true, hunger: 4, taste: ['Резкий жгучий хруст нашинкованного лука...'] },
  { id: 'leek_stalk', name: 'Fresh Leek Stalk', nameRu: 'Стебель лука-порея', desc: 'Whole fresh leek stalk.', descRu: 'Свежий зеленый стебель лука-порея.', wt: 0.25, vol: 0.24, usable: true, hunger: 5, taste: ['Мягкий травянистый луковый вкус порея...'] },
  { id: 'shallot_bulbs', name: 'Shallot Bulbs Bunch', nameRu: 'Пучок лука-шалот', desc: 'Bunch of shallot bulbs.', descRu: 'Сладковатый лук-шалот пучком.', wt: 0.15, vol: 0.14, usable: true, hunger: 5, taste: ['Нежный, слегка сладкий и менее жгучий луковый вкус...'] },
  { id: 'garlic_bulb', name: 'Whole Garlic Bulb', nameRu: 'Головка чеснока', desc: 'Whole fresh garlic bulb.', descRu: 'Цельная головка чеснока.', wt: 0.05, vol: 0.04, usable: true, hunger: 3, taste: ['Вы откусываете головку чеснока... Огненный взрыв фитонцидов во рту!', 'Дыхание обжигает, острота невероятная!'] },
  { id: 'garlic_clove', name: 'Peeled Garlic Clove', nameRu: 'Зубчик чеснока очищенный', desc: 'Single peeled garlic clove.', descRu: 'Очищенный зубчик свежего чеснока.', wt: 0.005, vol: 0.004, usable: true, hunger: 1, taste: ['Острый, жгучий зубчик чеснока. Отличный антисептик.'] },
  { id: 'tomato_whole', name: 'Ripe Red Tomato', nameRu: 'Томат спелый красный', desc: 'Whole red tomato.', descRu: 'Спелый цельный красный помидор.', wt: 0.15, vol: 0.14, usable: true, hunger: 8, thirst: 10, taste: ['Сочный взрыв томатного сока!', 'Тонкая кожица и нежная сладковатая мякоть помидора.'] },
  { id: 'tomato_sliced', name: 'Sliced Tomato', nameRu: 'Нарезанный кружочками томат', desc: 'Sliced ripe tomato.', descRu: 'Нарезанные кружочками ломтики томата.', wt: 0.15, vol: 0.14, usable: true, hunger: 8, thirst: 10, taste: ['Сочный нежный ломтик спелого томата...'] },
  { id: 'tomato_cherry_bunch', name: 'Cherry Tomatoes Bunch', nameRu: 'Веточка томатов черри', desc: 'Fresh cherry tomatoes.', descRu: 'Сладкие маленькие помидоры черри на ветке.', wt: 0.25, vol: 0.23, usable: true, hunger: 12, thirst: 12, leftoverId: 'box_cardboard_small', leftoverNameRu: 'Малая картонная коробка', taste: ['Маленький черри упруго лопается во рту сочным сладким соком!'] },
  { id: 'tomato_cherry_single', name: 'Single Cherry Tomato', nameRu: 'Помидорка черри поштучно', desc: 'Single fresh cherry tomato.', descRu: 'Свежая одиночная помидорка черри.', wt: 0.02, vol: 0.018, usable: true, hunger: 1, thirst: 1, taste: ['Упругий сочный укус маленькой черри...', 'Маленький помидор черри со сладким соком.'] },
  { id: 'tomato_cherry_sliced', name: 'Sliced Cherry Tomato', nameRu: 'Нарезанный помидор черри (половинки)', desc: 'Sliced fresh cherry tomato halves.', descRu: 'Свежий нарезанный помидор черри (половинки).', wt: 0.02, vol: 0.018, usable: true, hunger: 1, thirst: 1, taste: ['Нежная сочная половинка помидора черри...', 'Сладкий томатный вкус половинки черри.'] },
  { id: 'cucumber_whole', name: 'Crisp Green Cucumber', nameRu: 'Огурец грунтовой свежий', desc: 'Crisp green cucumber.', descRu: 'Хрустящий зеленый грунтовой огурец.', wt: 0.12, vol: 0.11, usable: true, hunger: 6, thirst: 15, taste: ['Освежающий водянистый хруст свежего огурца!', 'Запах свежести и лета.'] },
  { id: 'cucumber_sliced', name: 'Sliced Cucumber', nameRu: 'Нарезанный огурец (ломтики)', desc: 'Sliced green cucumber.', descRu: 'Нарезанный ломтиками огурец.', wt: 0.12, vol: 0.11, usable: true, hunger: 6, thirst: 15, taste: ['Хрустящий освежающий ломтик сочного огурца...'] },
  { id: 'eggplant_whole', name: 'Purple Eggplant', nameRu: 'Баклажан фиолетовый', desc: 'Whole purple eggplant.', descRu: 'Свежий фиолетовый баклажан.', wt: 0.35, vol: 0.33, usable: true, hunger: 5, taste: ['Горьковатый, резиновый вкус сырого баклажана... Очень на любителя.'] },
  { id: 'zucchini_whole', name: 'Green Zucchini', nameRu: 'Кабачок цукини зеленый', desc: 'Whole green zucchini.', descRu: 'Свежий нежный зеленый кабачок цукини.', wt: 0.4, vol: 0.38, usable: true, hunger: 6, taste: ['Травянистый нейтральный хруст сырого кабачка...'] },
  { id: 'pumpkin_whole', name: 'Giant Orange Pumpkin', nameRu: 'Тыква рыжая цельная', desc: 'Giant whole orange pumpkin.', descRu: 'Огромная цельная рыжая тыква.', wt: 5.0, vol: 4.8, usable: true, hunger: 30, taste: ['Очень жесткая волокнистая кожура тыквы... Прогрызть невозможно.'] },
  { id: 'pumpkin_cut', name: 'Large Cut of Pumpkin', nameRu: 'Нарезанный кусок тыквы', desc: 'Raw pumpkin cut.', descRu: 'Свежий плотный ломоть оранжевой тыквенной мякоти.', wt: 1.0, vol: 0.95, usable: true, hunger: 15, taste: ['Плотная, сладковатая волокнистая мякоть сырой тыквы...'] },
  { id: 'cabbage_white_head', name: 'White Cabbage Head', nameRu: 'Кочан белокочанной капусты', desc: 'Whole white cabbage.', descRu: 'Плотный кочан белокочанной капусты.', wt: 2.0, vol: 1.9, usable: true, hunger: 12, taste: ['Сочный хруст капустных листьев!', 'Горьковатая кочерыжка и хрустящая листва.'] },
  { id: 'cabbage_shredded', name: 'Shredded Cabbage', nameRu: 'Нашинкованная капуста', desc: 'Shredded fresh cabbage.', descRu: 'Мелко нашинкованная сочная капуста.', wt: 0.5, vol: 0.48, usable: true, hunger: 8, taste: ['Свежий сочный салатный хруст капусты...'] },
  { id: 'cauliflower_head', name: 'Cauliflower Head', nameRu: 'Цветная капуста (кочан)', desc: 'Fresh cauliflower head.', descRu: 'Кочан свежей цветной капусты.', wt: 0.8, vol: 0.75, usable: true, hunger: 8, taste: ['Плотные соцветия сырой цветной капусты с нейтральным вкусом...'] },
  { id: 'broccoli_florets', name: 'Broccoli Florets Bunch', nameRu: 'Соцветия брокколи', desc: 'Fresh broccoli florets bunch.', descRu: 'Зеленые кудрявые соцветия свежей брокколи.', wt: 0.4, vol: 0.38, usable: true, hunger: 6, taste: ['Хрустящие зеленые веточки брокколи с легким травяным ароматом...'] },
  { id: 'bell_pepper_red', name: 'Red Bell Pepper', nameRu: 'Болгарский перец красный', desc: 'Sweet red bell pepper.', descRu: 'Сладкий красный болгарский перец.', wt: 0.18, vol: 0.17, usable: true, hunger: 8, thirst: 8, taste: ['Очень сочный, сладкий и хрустящий красный перец!', 'Приятный свежий вкус.'] },
  { id: 'bell_pepper_yellow', name: 'Yellow Bell Pepper', nameRu: 'Болгарский перец желтый', desc: 'Sweet yellow bell pepper.', descRu: 'Сладкий желтый болгарский перец.', wt: 0.18, vol: 0.17, usable: true, hunger: 8, thirst: 8, taste: ['Сладкий сочный хруст желтого перца...'] },
  { id: 'chili_pepper_fresh', name: 'Spicy Red Chili Pepper', nameRu: 'Острый перец чили свежий', desc: 'Fiery fresh red chili pepper.', descRu: 'Пламенный свежий стручок красного перца чили.', wt: 0.02, vol: 0.018, usable: true, hunger: 2, energy: 10, taste: ['Взрыв капсаицинового пожара во рту!', 'Язык и горло полыхают пламенем! Глаза лезут на лоб!'] },
  { id: 'chili_pepper_sliced', name: 'Sliced Chili Pepper', nameRu: 'Нарезанный перец чили', desc: 'Sliced spicy red chili pepper.', descRu: 'Нарезанный колечками острый перец чили.', wt: 0.02, vol: 0.018, usable: true, hunger: 2, energy: 10, taste: ['Пламенное колечко чили обжигает вкусовые рецепторы...'] },

  // === FRUITS & BERRIES ===
  { id: 'apple_green', name: 'Sour Green Apple', nameRu: 'Кислое зеленое яблоко', desc: 'Sour granny smith apple.', descRu: 'Сочное, кислое зеленое яблоко.', wt: 0.15, vol: 0.14, usable: true, hunger: 15, thirst: 12, taste: ['Крепкий, сочный укус яблока!', 'Яркая кислинка сводит челюсть и бодрит рецепторы!'] },
  { id: 'pear_yellow', name: 'Juicy Duchess Pear', nameRu: 'Сочная груша Дюшес', desc: 'Sweet juicy yellow pear.', descRu: 'Сладкая сочная желтая груша сорта Дюшес.', wt: 0.18, vol: 0.17, usable: true, hunger: 18, thirst: 15, taste: ['Медовая сладость спелой сочной груши!', 'Мякоть тает во рту, сок стекает по подбородку.'] },
  { id: 'plum_purple', name: 'Sweet Purple Plum', nameRu: 'Сливая синяя сладкая', desc: 'Ripe sweet purple plum.', descRu: 'Спелая сладкая сине-фиолетовая слива.', wt: 0.04, vol: 0.038, usable: true, hunger: 4, thirst: 4, taste: ['Нежная сладкая мякоть с легкой кислинкой у шкурки.'] },
  { id: 'apricot_orange', name: 'Orange Apricot', nameRu: 'Абрикос спелый', desc: 'Velvety orange apricot.', descRu: 'Спелый бархатистый оранжевый абрикос.', wt: 0.03, vol: 0.028, usable: true, hunger: 3, thirst: 3, taste: ['Bakrhatisty sladky apricot...'] },
  { id: 'peach_velvet', name: 'Fuzzy Velvet Peach', nameRu: 'Персик бархатистый', desc: 'Sweet fuzzy peach.', descRu: 'Спелый крупный бархатистый персик.', wt: 0.15, vol: 0.14, usable: true, hunger: 14, thirst: 12, taste: ['Невероятно сочный персиковый взрыв!', 'Ароматный сладкий сок и нежнейшая мякоть.'] },
  { id: 'orange_citrus', name: 'Sweet Orange Citrus', nameRu: 'Апельсин сочный', desc: 'Sweet juicy orange.', descRu: 'Спелый сочный сладкий апельсин.', wt: 0.2, vol: 0.18, usable: true, hunger: 16, thirst: 18, taste: ['Брызги эфирного масла из цедры!', 'Сладкие, наполненные соком дольки апельсина.'] },
  { id: 'lemon_whole', name: 'Sour Yellow Lemon', nameRu: 'Лимон кислый желтый', desc: 'Extremely sour yellow lemon.', descRu: 'Кислый спелый желтый лимон.', wt: 0.12, vol: 0.11, usable: true, hunger: 4, thirst: 10, energy: 15, taste: ['Вы вонзаете зубы в лимон... Оглушительная кислота!', 'Глаза зажмуриваются, рот сводит спазмом! Но бодрит мгновенно!'] },
  { id: 'lemon_slice', name: 'Lemon Slice', nameRu: 'Долька лимона', desc: 'Fresh sour lemon slice.', descRu: 'Тонкий ломтик свежего лимона.', wt: 0.01, vol: 0.009, usable: true, hunger: 1, thirst: 2, energy: 3, taste: ['Освежающе-кислая долька лимона... Отлично для чая.'] },
  { id: 'lime_whole', name: 'Zesty Green Lime', nameRu: 'Лайм зеленый ароматный', desc: 'Zesty fresh green lime.', descRu: 'Ароматный кислый зеленый лайм.', wt: 0.08, vol: 0.075, usable: true, hunger: 3, thirst: 8, energy: 12, taste: ['Острый, парфюмерно-кислый вкус зеленого лайма с горчинкой...'] },
  { id: 'blueberry_basket', name: 'Wild Blueberries Basket', nameRu: 'Лукошко лесной черники', desc: 'Basket of sweet blueberries.', descRu: 'Плетёное лукошко со спелой лесной черникой.', wt: 0.3, vol: 0.28, usable: true, hunger: 12, thirst: 8, taste: ['Горсть черной лесной черники лопается во рту сладким соком...'] },
  { id: 'lingonberry_basket', name: 'Wild Lingonberries Basket', nameRu: 'Лукошко брусники', desc: 'Basket of tart lingonberries.', descRu: 'Лукошко с красной лесной брусникой.', wt: 0.3, vol: 0.28, usable: true, hunger: 10, thirst: 8, taste: ['Горьковато-кислый, освежающий дикий вкус таежной брусники...'] },
  { id: 'cranberry_basket', name: 'Wild Cranberries Basket', nameRu: 'Лукошко болотной клюквы', desc: 'Basket of sour cranberries.', descRu: 'Лукошко с кислой болотной клюквой.', wt: 0.3, vol: 0.28, usable: true, hunger: 8, thirst: 10, taste: ['Резкий, пронзительно-кислый укол болотной клюквы! Прекрасно бодрит.'] },
  { id: 'raspberry_basket', name: 'Garden Raspberries Basket', nameRu: 'Лукошко садовой малины', desc: 'Basket of sweet raspberries.', descRu: 'Лукошко со спелой ароматной малиной.', wt: 0.25, vol: 0.23, usable: true, hunger: 14, thirst: 8, taste: ['Нежнейшие, ароматные сладкие ягоды садовой малины...'] },
  { id: 'strawberry_basket', name: 'Sweet Strawberries Basket', nameRu: 'Лукошко спелой клубники', desc: 'Basket of juicy strawberries.', descRu: 'Лукошко со спелой сочной клубникой.', wt: 0.3, vol: 0.28, usable: true, hunger: 15, thirst: 10, taste: ['Роскошный летний вкус сладкой клубники!'] },
  { id: 'blackcurrant_basket', name: 'Black Currant Basket', nameRu: 'Лукошко черной смородины', desc: 'Basket of black currants.', descRu: 'Лукошко со спелой черной смородиной.', wt: 0.25, vol: 0.23, usable: true, hunger: 12, thirst: 8, taste: ['Ароматные, терпкие сладкие ягоды черной смородины.'] },
  { id: 'redcurrant_basket', name: 'Red Currant Basket', nameRu: 'Лукошко красной смородины', desc: 'Basket of tart red currants.', descRu: 'Лукошко со спелой красной смородиной.', wt: 0.25, vol: 0.23, usable: true, hunger: 10, thirst: 10, taste: ['Кисло-сладкие прозрачные ягодки красной смородины...'] },
  { id: 'grapes_green_bunch', name: 'Green Grapes Bunch', nameRu: 'Гроздь зеленого винограда', desc: 'Bunch of sweet green grapes.', descRu: 'Гроздь сочного сладкого зеленого винограда кишмиш.', wt: 0.4, vol: 0.38, usable: true, hunger: 15, thirst: 12, taste: ['Упругие ягоды винограда сочным взрывом лопаются на языке!'] },
  { id: 'grapes_red_bunch', name: 'Red Grapes Bunch', nameRu: 'Гроздь красного винограда', desc: 'Bunch of sweet red grapes.', descRu: 'Гроздь спелого красного винограда с мускатным вкусом.', wt: 0.4, vol: 0.38, usable: true, hunger: 15, thirst: 12, taste: ['Богатый мускатный вкус спелого сладкого винограда...'] },
  { id: 'banana_single', name: 'Yellow Sweet Banana', nameRu: 'Бананы спелые (связка)', desc: 'Bunch of yellow bananas.', descRu: 'Связка спелых желтых бананов.', wt: 0.4, vol: 0.38, usable: true, hunger: 20, taste: ['Сладкий сытный банан, кремовая мякоть утоляет голод.'] },
  { id: 'melon_cantaloupe', name: 'Sweet Cantaloupe Melon', nameRu: 'Дыня Канталупа', desc: 'Sweet cantaloupe melon.', descRu: 'Сладкая круглая дыня сорта Канталупа.', wt: 2.2, vol: 2.1, usable: true, hunger: 40, thirst: 30, taste: ['Восхитительно нежный, медовый вкус спелой дыни!'] },
  { id: 'watermelon_whole', name: 'Giant Striped Watermelon', nameRu: 'Арбуз полосатый цельный', desc: 'Giant ripe watermelon.', descRu: 'Огромный спелый полосатый арбуз.', wt: 6.5, vol: 6.2, usable: true, hunger: 30, thirst: 60, taste: ['Жесткая толстая корка арбуза. Нужно как-то разрезать...'] },
  { id: 'watermelon_slice', name: 'Watermelon Slice', nameRu: 'Сочный ломоть арбуза', desc: 'Juicy slice of watermelon.', descRu: 'Отрезанный сочный кусок сахарного арбуза.', wt: 0.5, vol: 0.48, usable: true, hunger: 15, thirst: 40, taste: ['Сахарная, крупитчатая мякоть арбуза! Потрясающее утоление жажды.'] },
  { id: 'cherry_basket', name: 'Sweet Cherries Basket', nameRu: 'Лукошко черешни', desc: 'Basket of ripe cherries.', descRu: 'Лукошко со спелой темной черешней.', wt: 0.3, vol: 0.28, usable: true, hunger: 14, thirst: 10, taste: ['Мясистая сладкая черешня! Аккуратнее с косточками.'] },
  { id: 'pomegranate_whole', name: 'Royal Pomegranate', nameRu: 'Гранат спелый', desc: 'Ripe pomegranate fruit.', descRu: 'Спелый крупный восточный гранат.', wt: 0.4, vol: 0.38, usable: true, hunger: 10, thirst: 12, taste: ['Вы прокусываете зернышко граната... Терпко-сладкий рубиновый сок!'] },
  { id: 'kiwi_fruit', name: 'Fuzzy Kiwi Fruit', nameRu: 'Киви волосатый спелый', desc: 'Fuzzy green kiwi fruit.', descRu: 'Свежий спелый киви с волосатой шкуркой.', wt: 0.08, vol: 0.075, usable: true, hunger: 6, thirst: 6, taste: ['Нежно-зеленая кисло-сладкая мякоть с мелкими хрустящими семечками.'] },

  // === MUSHROOMS ===
  { id: 'cep_mushroom_whole', name: 'Porcini Wild Cep Mushroom', nameRu: 'Белый гриб лесной цельный', desc: 'King of wild forest mushrooms.', descRu: 'Свежий благородный белый гриб (боровик).', wt: 0.1, vol: 0.09, usable: true, hunger: 6, taste: ['Мясистая упругая ножка боровика с глубоким грибным ароматом.'] },
  { id: 'cep_mushroom_dried', name: 'Dried Porcini Strings', nameRu: 'Связка сушеных белых грибов', desc: 'Dried wild porcini mushrooms.', descRu: 'Душистая связка сушеных белых грибов на нитке.', wt: 0.05, vol: 0.08, usable: true, hunger: 4, taste: ['Сухой гриб жесткий, но имеет невероятно концентрированный лесной аромат.'] },
  { id: 'boletus_mushroom_whole', name: 'Birch Boletus Mushroom', nameRu: 'Подберезовик свежий', desc: 'Wild birch boletus.', descRu: 'Лесной свежий подберезовик с тонкой ножкой.', wt: 0.08, vol: 0.07, usable: true, hunger: 5, taste: ['Мягкая шляпка и упругая ножка свежего подберезовика...'] },
  { id: 'aspen_boletus_whole', name: 'Red-capped Aspen Boletus', nameRu: 'Подосиновик свежий', desc: 'Wild red-capped boletus.', descRu: 'Красивый лесной подосиновик с яркой рыжей шляпкой.', wt: 0.09, vol: 0.08, usable: true, hunger: 5, taste: ['Плотный лесной гриб со свежим ароматом хвои и листвы.'] },
  { id: 'chanterelle_basket', name: 'Basket of Fresh Chanterelles', nameRu: 'Лукошко свежих лисичек', desc: 'Yellow forest chanterelles.', descRu: 'Свежесобранные ярко-желтые лисички в корзине.', wt: 0.4, vol: 0.38, usable: true, hunger: 12, taste: ['Упругие рыжие лисички, пахнут осенним дождем и сосновой хвоей.'] },
  { id: 'honey_agaric_basket', name: 'Basket of Forest Honey Agarics', nameRu: 'Лукошко опят осенних', desc: 'Fresh wild honey agarics.', descRu: 'Лукошко свежих осенних опят.', wt: 0.4, vol: 0.38, usable: true, hunger: 12, taste: ['Тонкие упругие ножки и скользкие шляпки опят...'] },
  { id: 'milk_mushroom_salted', name: 'Salted White Milk Mushrooms', nameRu: 'Грузди белые соленые', desc: 'Traditionally salted milk mushrooms.', descRu: 'Традиционные соленые белые грузди в банке.', wt: 0.5, vol: 0.48, usable: true, hunger: 15, thirst: -10, taste: ['Хрустящий соленый груздь с ароматом укропа, чеснока и смородины! Великолепно.'] },
  { id: 'butter_boletus_whole', name: 'Slippery Jack Butter Boletus', nameRu: 'Масленок свежий', desc: 'Slippery wild butter boletus.', descRu: 'Свежий лесной масленок со скользкой шляпкой.', wt: 0.06, vol: 0.05, usable: true, hunger: 4, taste: ['Скользкая маслянистая шляпка гриба со свежим хвойным ароматом...'] },
  { id: 'morel_spring_mushroom', name: 'Spring Morel Mushroom', nameRu: 'Сморчок весенний', desc: 'Delicacy spring morel mushroom.', descRu: 'Первый весенний гриб-сморчок со сморщенной шляпкой.', wt: 0.05, vol: 0.045, usable: true, hunger: 4, taste: ['Необычный, нежный грибной вкус весеннего сморчка...'] },
  { id: 'truffle_black_rare', name: 'Rare Black Truffle', nameRu: 'Редкий черный трюфель', desc: 'Rare expensive black truffle.', descRu: 'Драгоценный деликатесный черный трюфель.', wt: 0.03, vol: 0.025, usable: true, hunger: 6, energy: 20, taste: ['Сложнейший землистый, ореховый и чесночный аромат изысканного трюфеля...'] },
  { id: 'champignon_white_whole', name: 'Fresh White Button Champignon', nameRu: 'Шампиньон свежий белый', desc: 'Cultivated white button mushroom.', descRu: 'Свежий белый шампиньон.', wt: 0.03, vol: 0.028, usable: true, hunger: 4, taste: ['Упругий нейтральный грибной вкус культивируемого шампиньона.'] },
  { id: 'champignon_brown_whole', name: 'Fresh Royal Brown Champignon', nameRu: 'Шампиньон свежий королевский', desc: 'Cultivated royal brown mushroom.', descRu: 'Свежий королевский бурый шампиньон.', wt: 0.03, vol: 0.028, usable: true, hunger: 4, taste: ['Плотный королевский шампиньон с более насыщенным ароматом...'] },
  { id: 'champignon_sliced', name: 'Sliced Champignon Mushrooms', nameRu: 'Нарезанные шампиньоны', desc: 'Sliced white champignons.', descRu: 'Свежие нарезанные шампиньоны.', wt: 0.15, vol: 0.14, usable: true, hunger: 4, taste: ['Нарезанный упругий ломтик свежего шампиньона...'] },
  { id: 'oyster_mushroom_cluster', name: 'Oyster Mushroom Cluster', nameRu: 'Гроздь вешенок свежих', desc: 'Cultivated oyster mushrooms.', descRu: 'Большая гроздь свежих культивируемых вешенок.', wt: 0.3, vol: 0.28, usable: true, hunger: 8, taste: ['Плотная, мясистая сероватая шляпка вешенки...'] },
  { id: 'shiitake_dried_bag', name: 'Dried Shiitake Mushrooms Bag', nameRu: 'Сушеные грибы шиитаке', desc: 'Dried shiitake pack.', descRu: 'Пакетик сушеных азиатских грибов шиитаке.', wt: 0.08, vol: 0.1, usable: true, hunger: 3, taste: ['Жесткий сушеный азиатский гриб с пряным ароматом...'] },
  { id: 'shiitake_fresh', name: 'Fresh Shiitake Mushroom', nameRu: 'Шиитаке свежий', desc: 'Fresh shiitake mushroom.', descRu: 'Свежий зонтик азиатского гриба шиитаке.', wt: 0.04, vol: 0.038, usable: true, hunger: 4, taste: ['Пряный, древесно-грибной вкус свежего шиитаке...'] },
  { id: 'enoki_mushroom_bunch', name: 'Enoki Golden Needle Bunch', nameRu: 'Пучок грибов эноки', desc: 'White needle enoki bunch.', descRu: 'Свежий пучок нитевидных белых грибов эноки.', wt: 0.15, vol: 0.14, usable: true, hunger: 5, taste: ['Хрустящие тонкие нити белых грибов эноки...'] },
  { id: 'portobello_mushroom', name: 'Large Portobello Cap', nameRu: 'Шляпка гриба Портобелло', desc: 'Large meaty portobello cap.', descRu: 'Огромная мясистая шляпка гриба Портобелло.', wt: 0.12, vol: 0.11, usable: true, hunger: 6, taste: ['Мясистый, плотный укус крупного гриба Портобелло...'] },
  { id: 'wood_ear_mushroom_dried', name: 'Dried Wood Ear Mushrooms', nameRu: 'Сушеные древесные грибы (Муэр)', desc: 'Dried wood ear mushrooms.', descRu: 'Сушеные черные древесные грибы Муэр.', wt: 0.05, vol: 0.06, usable: true, hunger: 3, taste: ['Тонкие хрустящие пластинки сушеных древесных грибов...'] },
  { id: 'parasol_mushroom_cap', name: 'Parasol Mushroom Cap', nameRu: 'Шляпка гриба-зонтика', desc: 'Large parasol mushroom cap.', descRu: 'Огромная нежная шляпка гриба-зонтика пестрого.', wt: 0.06, vol: 0.05, usable: true, hunger: 4, taste: ['Нежная ореховая мякоть крупной шляпки гриба-зонтика...'] },

  // === SPICES ===
  { id: 'salt_shaker', name: 'Household Salt Shaker', nameRu: 'Солонка кухонная', desc: 'Table salt shaker.', descRu: 'Пластиковая солонка с мелкой солью экстра.', wt: 0.15, vol: 0.12, usable: true, hunger: 1, thirst: -10, taste: ['Язык обжигает чистая соленая горечь!', 'Невероятно солено, ужасно хочется пить!'] },
  { id: 'salt_bag_coarse', name: 'Coarse Rock Salt Bag', nameRu: 'Мешок крупной соли (1кг)', desc: 'Coarse rock salt bag.', descRu: 'Мешок крупной пищевой каменной соли (1 кг).', wt: 1.0, vol: 0.8, usable: true, hunger: 1, thirst: -25, taste: ['Вы лизнули каменную соль... Жгучая соленая корка.'] },
  { id: 'salt_sea_premium', name: 'Sea Salt Flakes Jar', nameRu: 'Морская соль хлопьями', desc: 'Premium sea salt flakes.', descRu: 'Стеклянная баночка с хлопьями морской соли.', wt: 0.25, vol: 0.2, usable: true, hunger: 1, thirst: -12, taste: ['Хрустящие деликатные кристаллики морской соли...'] },
  { id: 'black_pepper_grinder', name: 'Black Peppercorn Grinder', nameRu: 'Мельница с черным перцем', desc: 'Whole black peppercorn grinder.', descRu: 'Стеклянная мельница с горошком черного перца.', wt: 0.12, vol: 0.1, usable: true, hunger: 1, energy: 5, taste: ['Резкий, пряно-острый вкус свежемолотого черного перца!', 'Вы чихаете от аромата!'] },
  { id: 'black_pepper_powder_sachet', name: 'Ground Black Pepper', nameRu: 'Молотый черный перец', desc: 'Ground black pepper sachet.', descRu: 'Пакетик молотого ароматного черного перца.', wt: 0.02, vol: 0.015, usable: true, hunger: 1, taste: ['Вы чихаете от мелкой перечной пыли... Сухо и остро.'] },
  { id: 'chili_powder_sachet', name: 'Ground Chili Powder', nameRu: 'Молотый перец чили (пакетик)', desc: 'Ground red chili sachet.', descRu: 'Пакетик молотого острого перца чили.', wt: 0.02, vol: 0.015, usable: true, hunger: 1, taste: ['Обжигающий красный порошок чили сушит и жжет рот...'] },
  { id: 'paprika_sweet_sachet', name: 'Sweet Smoked Paprika', nameRu: 'Копченая сладкая паприка', desc: 'Smoked sweet paprika.', descRu: 'Пакетик сладкой копченой паприки.', wt: 0.03, vol: 0.025, usable: true, hunger: 2, taste: ['Ароматный, сладковатый порошок сушеной паприки с дымком.'] },
  { id: 'rosemary_sprigs_fresh', name: 'Fresh Rosemary Sprigs', nameRu: 'Пучок свежего розмарина', desc: 'Fresh rosemary sprigs bunch.', descRu: 'Свежий пучок хвойных веточек розмарина.', wt: 0.03, vol: 0.025, usable: true, hunger: 2, taste: ['Сильный, смолистый хвойный вкус листьев розмарина...'] },
  { id: 'thyme_sprigs_fresh', name: 'Fresh Thyme Sprigs', nameRu: 'Пучок свежего тимьяна', desc: 'Fresh thyme bunch.', descRu: 'Свежий пучок мелкого тимьяна (чабреца).', wt: 0.02, vol: 0.018, usable: true, hunger: 2, taste: ['Душистый, пряно-горьковатый травяной вкус свежего тимьяна...'] },
  { id: 'basil_leaves_fresh', name: 'Fresh Green Basil', nameRu: 'Пучок зеленого базилика', desc: 'Fresh sweet green basil.', descRu: 'Пучок сочного зеленого базилика.', wt: 0.03, vol: 0.025, usable: true, hunger: 3, taste: ['Ароматный пряный укус базилика с анисовым оттенком...'] },
  { id: 'dill_bunch_fresh', name: 'Fresh Green Dill Bunch', nameRu: 'Пучок свежего укропа', desc: 'Fresh green dill.', descRu: 'Пучок свежего ароматного зеленого укропа.', wt: 0.05, vol: 0.04, usable: true, hunger: 3, taste: ['Классический освежающий вкус свежего укропа!'] },
  { id: 'parsley_bunch_fresh', name: 'Fresh Green Parsley', nameRu: 'Пучок свежей петрушки', desc: 'Fresh green parsley.', descRu: 'Пучок свежей зеленой петрушки кудрявой.', wt: 0.05, vol: 0.04, usable: true, hunger: 3, taste: ['Травянистый, насыщенный и слегка терпкий вкус петрушки...'] },
  { id: 'cilantro_bunch_fresh', name: 'Fresh Green Cilantro', nameRu: 'Пучок свежей кинзы', desc: 'Fresh green coriander leaves.', descRu: 'Пучок свежей ароматной кинзы (кориандра).', wt: 0.05, vol: 0.04, usable: true, hunger: 3, taste: ['Специфический мыльно-пряный вкус свежей кинзы... На любителя.'] },
  { id: 'mint_leaves_fresh', name: 'Fresh Green Peppermint', nameRu: 'Пучок свежей мяты', desc: 'Fresh peppermint bunch.', descRu: 'Пучок ароматной холодящей мяты перечной.', wt: 0.04, vol: 0.03, usable: true, hunger: 2, sleep: -5, taste: ['Взрыв ментоловой прохлады на языке!', 'Приятно освежает дыхание.'] },
  { id: 'bay_leaves_dried_sachet', name: 'Dried Bay Leaves', nameRu: 'Сухой лавровый лист (пакетик)', desc: 'Dried bay leaves pack.', descRu: 'Пакетик сухого лаврового листа для супов.', wt: 0.01, vol: 0.015, usable: true, hunger: 1, taste: ['Сухой жесткий лавровый лист ломается на зубах, горчит смолой...'] },
  { id: 'cinnamon_sticks_whole', name: 'Cinnamon Sticks Whole', nameRu: 'Палочки натуральной корицы', desc: 'Whole cinnamon bark sticks.', descRu: 'Свитки натуральной коры корицы (палочки).', wt: 0.03, vol: 0.025, usable: true, hunger: 1, taste: ['Сухая древесная кора корицы, имеет теплый сладкий аромат...'] },
  { id: 'cinnamon_powder_sachet', name: 'Ground Cinnamon Powder', nameRu: 'Пакетик молотой корицы', desc: 'Ground cinnamon powder.', descRu: 'Пакетик молотой сладкой корицы.', wt: 0.02, vol: 0.018, usable: true, hunger: 1, taste: ['Сухой пряный порошок корицы, заставляет кашлять...'] },
  { id: 'cloves_buds_dried', name: 'Dried Clove Buds', nameRu: 'Пакетик сушеной гвоздики', desc: 'Dried clove buds sachet.', descRu: 'Пакетик пряных высушенных бутонов гвоздики.', wt: 0.02, vol: 0.018, usable: true, hunger: 1, taste: ['Жгуче-пряный гвоздичный вкус, слегка немеет язык...'] },
  { id: 'nutmeg_whole_seeds', name: 'Whole Nutmeg Seeds', nameRu: 'Цельный мускатный орех', desc: 'Whole nutmeg seeds pack.', descRu: 'Цельные твердые ядра мускатного ореха.', wt: 0.03, vol: 0.025, usable: true, hunger: 1, taste: ['Каменный сухой орех... Прокусить невозможно.'] },
  { id: 'ginger_root_fresh', name: 'Fresh Ginger Root', nameRu: 'Свежий корень имбиря', desc: 'Fresh spicy ginger root.', descRu: 'Свежий плотный корень имбиря.', wt: 0.15, vol: 0.14, usable: true, hunger: 3, energy: 15, taste: ['Острый, лимонно-жгучий сок свежего имбиря обжигает горло!', 'Прилив тепла и бодрости.'] },
  { id: 'turmeric_powder_sachet', name: 'Golden Turmeric Powder', nameRu: 'Пакетик молотой куркумы', desc: 'Golden turmeric powder.', descRu: 'Пакетик ярко-желтой молотой куркумы.', wt: 0.03, vol: 0.025, usable: true, hunger: 1, taste: ['Землисто-пряный порошок куркумы красит зубы в желтый цвет...'] },
  { id: 'cardamom_pods_dried', name: 'Green Cardamom Pods', nameRu: 'Зеленый кардамон (коробочки)', desc: 'Green cardamom pods sachet.', descRu: 'Пакетик сушеных коробочек зеленого кардамона.', wt: 0.02, vol: 0.018, usable: true, hunger: 1, taste: ['Парфюмерно-камфорный сильный вкус разжеванного кардамона...'] },
  { id: 'coriander_seeds_sachet', name: 'Whole Coriander Seeds', nameRu: 'Пакетик семян кориандра', desc: 'Whole coriander seeds.', descRu: 'Пакетик цельных круглых семян кориандра.', wt: 0.02, vol: 0.018, usable: true, hunger: 1, taste: ['Хвойно-цитрусовый пряный хруст семян кориандра...'] },
  { id: 'vanilla_pod_fresh', name: 'Premium Fresh Vanilla Bean', nameRu: 'Стручок натуральной ванили', desc: 'Fresh black vanilla pod.', descRu: 'Стручок темной натуральной мадагаскарской ванили.', wt: 0.005, vol: 0.004, usable: true, hunger: 1, taste: ['Горький, но умопомрачительно ароматный темный стручок ванили...'] },
  { id: 'allspice_berries_sachet', name: 'Allspice Berries Sachet', nameRu: 'Пакетик душистого перца', desc: 'Allspice berries sachet.', descRu: 'Пакетик крупных горошин душистого перца.', wt: 0.02, vol: 0.018, usable: true, hunger: 1, taste: ['Сложный аромат перца, корицы и гвоздики в одной горошине...'] },

  // === OILS & LIQUIDS ===
  { id: 'oil_sunflower_bottle', name: 'Sunflower Cooking Oil', nameRu: 'Подсолнечное масло', cat: 'drink', desc: 'Sunflower seed cooking oil.', descRu: 'Бутылка подсолнечного масла (1 л) для жарки.', wt: 0.9, vol: 1.0, usable: true, hunger: 10, bites: 30, leftoverId: 'bottle_glass_large', leftoverNameRu: 'Унифицированная стеклянная бутылка (1.0л)', taste: ['Вязкий, маслянистый глоток подсолнечного масла... Слишком жирно.'] },
  { id: 'oil_olive_extra_virgin', name: 'Extra Virgin Olive Oil', nameRu: 'Оливковое масло', cat: 'drink', desc: 'Premium extra virgin olive oil.', descRu: 'Бутылка оливкового масла холодного отжима (0.75 л).', wt: 0.75, vol: 0.75, usable: true, hunger: 12, bites: 25, leftoverId: 'bottle_glass_medium', leftoverNameRu: 'Унифицированная стеклянная бутылка (0.5л)', taste: ['Густой оливковый вкус с приятной горчинкой в горле...'] },
  { id: 'oil_linseed_bottle', name: 'Cold Pressed Linseed Oil', nameRu: 'Лняное масло', cat: 'drink', desc: 'Cold pressed linseed oil.', descRu: 'Бутылка льняного масла (0.5 л) холодного прессования.', wt: 0.5, vol: 0.5, usable: true, hunger: 10, bites: 20, leftoverId: 'bottle_glass_medium', leftoverNameRu: 'Унифицированная стеклянная бутылка (0.5л)', taste: ['Специфический масляный вкус с рыбным и древесным оттенком...'] },
  { id: 'oil_sesame_bottle', name: 'Toasted Sesame Oil', nameRu: 'Кунжутное масло', cat: 'drink', desc: 'Toasted sesame seed oil.', descRu: 'Бутылочка кунжутного ароматного масла (0.25 л).', wt: 0.25, vol: 0.25, usable: true, hunger: 12, bites: 20, leftoverId: 'bottle_glass_small', leftoverNameRu: 'Стеклянная бутылочка (0.25л)', taste: ['Яркий, концентрированный ореховый вкус кунжута...'] },
  { id: 'lard_pork_pot', name: 'Rendered Pork Lard', nameRu: 'Горшочек свиного смальца', desc: 'Pork lard in clay pot.', descRu: 'Глиняный горшочек со свиным смальцем (лярдом).', wt: 0.5, vol: 0.48, usable: true, hunger: 25, bites: 30, leftoverId: 'pot_clay_medium', leftoverNameRu: 'Глиняный горшочек (0.5л)', taste: ['Соленый, очень калорийный топленый свиной жир... Тянется на языке.'] },
  { id: 'fat_beef_pot', name: 'Rendered Beef Tallow', nameRu: 'Топленый говяжий жир', desc: 'Beef tallow in clay pot.', descRu: 'Глиняный горшочек с топленым говяжьим жиром.', wt: 0.5, vol: 0.48, usable: true, hunger: 24, bites: 30, leftoverId: 'pot_clay_medium', leftoverNameRu: 'Глиняный горшочек (0.5л)', taste: ['Твердый говяжий жир неохотно тает во рту, липнет к нёбу...'] },
  { id: 'ghee_butter_pot', name: 'Ghee Clarified Butter', nameRu: 'Топленое масло Гхи', desc: 'Ghee butter in clay pot.', descRu: 'Глиняный горшочек с топленым сливочным маслом Гхи.', wt: 0.4, vol: 0.38, usable: true, hunger: 26, bites: 30, leftoverId: 'pot_clay_medium', leftoverNameRu: 'Глиняный горшочек (0.5л)', taste: ['Невероятно нежный, сливочный ореховый вкус масла Гхи!'] },
  { id: 'vinegar_table_bottle', name: 'Table Vinegar 9%', nameRu: 'Столовый уксус 9%', cat: 'drink', desc: 'Table vinegar 9% in bottle.', descRu: 'Бутылочка столового уксуса 9% (0.5 л).', wt: 0.5, vol: 0.5, usable: true, health: -15, thirst: -10, bites: 25, leftoverId: 'bottle_glass_medium', leftoverNameRu: 'Унифицированная стеклянная бутылка (0.5л)', taste: ['Вы делаете глоток столового уксуса... Ужасный химический ожог!', 'Горло спазмирует от кислоты! Вы кашляете и задыхаетесь!'] },
  { id: 'vinegar_apple_cider', name: 'Organic Apple Cider Vinegar', nameRu: 'Яблочный уксус', cat: 'drink', desc: 'Apple cider vinegar.', descRu: 'Бутылочка натурального яблочного уксуса (0.5 л).', wt: 0.5, vol: 0.5, usable: true, health: -8, thirst: -5, bites: 25, leftoverId: 'bottle_glass_medium', leftoverNameRu: 'Унифицированная стеклянная бутылка (0.5л)', taste: ['Кислый яблочный вкус со жгучей уксусной остротой...'] },
  { id: 'vinegar_balsamic_premium', name: 'Aged Balsamic Vinegar', nameRu: 'Бальзамический уксус', cat: 'drink', desc: 'Balsamic vinegar bottle.', descRu: 'Бутылочка выдержанного густого бальзамического уксуса.', wt: 0.25, vol: 0.25, usable: true, hunger: 2, bites: 20, leftoverId: 'bottle_glass_small', leftoverNameRu: 'Стеклянная бутылочка (0.25л)', taste: ['Кисло-сладкий, сложный виноградный вкус изысканного бальзамика.'] },
  { id: 'soy_sauce_classic', name: 'Naturally Brewed Soy Sauce', nameRu: 'Соевый соус', cat: 'drink', desc: 'Classic soy sauce bottle.', descRu: 'Бутылочка соевого соуса натурального брожения.', wt: 0.25, vol: 0.25, usable: true, thirst: -15, bites: 25, leftoverId: 'bottle_glass_small', leftoverNameRu: 'Стеклянная бутылочка (0.25л)', taste: ['Очень соленый, насыщенный вкус умами...', 'Хочется немедленно запить водой.'] },
  { id: 'sauce_fish_premium', name: 'Premium Asian Fish Sauce', nameRu: 'Азиатский рыбный соус', cat: 'drink', desc: 'Premium fish sauce bottle.', descRu: 'Бутылочка концентрированного рыбного соуса.', wt: 0.2, vol: 0.2, usable: true, thirst: -15, bites: 20, leftoverId: 'bottle_glass_small', leftoverNameRu: 'Стеклянная бутылочка (0.25л)', taste: ['Резкий солено-анчоусный рыбный вкус азиатского соуса...'] },
  { id: 'sauce_worcestershire', name: 'Original Worcestershire Sauce', nameRu: 'Соус ворчестер', cat: 'drink', desc: 'Worcestershire sauce bottle.', descRu: 'Оригинальный пикантный ворчестерширский соус.', wt: 0.29, vol: 0.29, usable: true, hunger: 2, bites: 25, leftoverId: 'bottle_glass_small', leftoverNameRu: 'Стеклянная бутылочка (0.25л)', taste: ['Сложный кисло-сладкий пряный вкус ворчестершира...'] },
  { id: 'sauce_teriyaki_bottle', name: 'Rich Teriyaki Glaze', nameRu: 'Соус Терияки', cat: 'drink', desc: 'Teriyaki glaze bottle.', descRu: 'Бутылочка густого сладковатого соуса Терияки.', wt: 0.3, vol: 0.3, usable: true, hunger: 5, bites: 25, leftoverId: 'bottle_glass_small', leftoverNameRu: 'Стеклянная бутылочка (0.25л)', taste: ['Сладковато-соленый вкус терияки с имбирем и соей...'] },
  { id: 'sauce_pomegranate_narsharab', name: 'Pomegranate Sauce Narsharab', nameRu: 'Гранатовый соус Наршараб', cat: 'drink', desc: 'Narsharab sauce bottle.', descRu: 'Бутылочка кисло-сладкого азербайджанского соуса Наршараб.', wt: 0.35, vol: 0.25, usable: true, hunger: 6, bites: 25, leftoverId: 'bottle_glass_small', leftoverNameRu: 'Стеклянная бутылочка (0.25л)', taste: ['Терпкий, кисло-сладкий концентрированный гранатовый соус.'] },
  { id: 'broth_beef_jar', name: 'Beef Bone Broth', nameRu: 'Концентрированный говяжий бульон', desc: 'Concentrated beef broth jar.', descRu: 'Баночка густого говяжьего бульона.', wt: 0.5, vol: 0.45, usable: true, hunger: 15, thirst: 10, bites: 15, leftoverId: 'jar_glass_medium', leftoverNameRu: 'Унифицированная стеклянная банка (0.5л)', taste: ['Густой соленый мясной бульон с жирком. Наваристо.'] },
  { id: 'broth_chicken_jar', name: 'Concentrated Chicken Broth', nameRu: 'Концентрированный куриный бульон', desc: 'Chicken broth jar.', descRu: 'Баночка концентрированного золотистого куриного бульона.', wt: 0.5, vol: 0.45, usable: true, hunger: 12, thirst: 12, bites: 15, leftoverId: 'jar_glass_medium', leftoverNameRu: 'Унифицированная стеклянная банка (0.5л)', taste: ['Золотистый, легкий и ароматный куриный бульон...'] },
  { id: 'broth_fish_jar', name: 'Fish Dashi Broth', nameRu: 'Рыбный бульон даси', desc: 'Fish dashi broth jar.', descRu: 'Баночка японского рыбного бульона даси.', wt: 0.5, vol: 0.45, usable: true, hunger: 10, thirst: 10, bites: 15, leftoverId: 'jar_glass_medium', leftoverNameRu: 'Унифицированная стеклянная банка (0.5л)', taste: ['Солоноватый рыбный вкус бульона с водорослями...'] },
  { id: 'broth_vegetable_jar', name: 'Organic Vegetable Broth', nameRu: 'Овощной бульон', desc: 'Vegetable broth jar.', descRu: 'Баночка легкого концентрированного овощного бульона.', wt: 0.5, vol: 0.45, usable: true, hunger: 8, thirst: 12, bites: 15, leftoverId: 'jar_glass_medium', leftoverNameRu: 'Унифицированная стеклянная банка (0.5л)', taste: ['Легкий травянистый бульон с ароматом кореньев и сельдерея...'] },
  { id: 'wine_white_cooking', name: 'White Cooking Wine', nameRu: 'Белое вино сухое (кулинария)', cat: 'drink', desc: 'White dry wine bottle.', descRu: 'Бутылка белого сухого вина (0.75 л) для кулинарии.', wt: 0.75, vol: 0.75, usable: true, hunger: 2, thirst: 15, energy: 5, bites: 20, leftoverId: 'bottle_glass_large', leftoverNameRu: 'Унифицированная стеклянная бутылка (1.0л)', taste: ['Кисловатый виноградный вкус сухого белого вина...'] },
  { id: 'wine_red_cooking', name: 'Red Cooking Wine', nameRu: 'Красное вино сухое (кулинария)', cat: 'drink', desc: 'Red dry wine bottle.', descRu: 'Бутылка красного сухого вина (0.75 л) для кулинарии.', wt: 0.75, vol: 0.75, usable: true, hunger: 2, thirst: 15, energy: 5, bites: 20, leftoverId: 'bottle_glass_large', leftoverNameRu: 'Унифицированная стеклянная бутылка (1.0л)', taste: ['Терпкий ягодный вкус сухого красного вина...'] },
  { id: 'liquid_yeast_mixture', name: 'Active Liquid Yeast', nameRu: 'Дрожжевая закваска жидкая', cat: 'drink', desc: 'Fermenting liquid yeast.', descRu: 'Баночка с живой бродящей дрожжевой закваской.', wt: 0.2, vol: 0.18, usable: true, hunger: 4, bites: 10, leftoverId: 'jar_glass_small', leftoverNameRu: 'Унифицированная стеклянная банка (0.2л)', taste: ['Кислый бродящий хлебный вкус жидких дрожжей...'] },
  { id: 'maple_syrup_bottle', name: 'Canadian Maple Syrup', nameRu: 'Канадский кленовый сироп', desc: 'Sweet maple syrup bottle.', descRu: 'Бутылочка натурального кленового сиропа.', wt: 0.35, vol: 0.25, usable: true, hunger: 18, bites: 30, leftoverId: 'bottle_glass_medium', leftoverNameRu: 'Унифицированная стеклянная бутылка (0.5л)', taste: ['Очень сладкий, древесно-карамельный кленовый сироп...'] },
  { id: 'honey_wild_jar', name: 'Wild Forest Honey', nameRu: 'Баночка дикого меда', desc: 'Wild forest honey jar.', descRu: 'Стеклянная баночка с диким ароматным лесным медом.', wt: 0.5, vol: 0.35, usable: true, hunger: 22, bites: 40, leftoverId: 'jar_glass_medium', leftoverNameRu: 'Унифицированная стеклянная банка (0.5л)', taste: ['Медовая сладость обжигает горло, пахнет липой и травами!'] },
  { id: 'mustard_dijon_jar', name: 'Spicy Dijon Mustard', nameRu: 'Дижонская горчица', desc: 'Dijon mustard jar.', descRu: 'Стеклянная баночка с пикантной дижонской горчицей.', wt: 0.2, vol: 0.18, usable: true, hunger: 4, bites: 50, leftoverId: 'jar_glass_small', leftoverNameRu: 'Унифицированная стеклянная банка (0.2л)', taste: ['Мягко-острый уксусный вкус горчичных семян... Приятно бодрит.'] },

  // === FLOURS & GRAINS ===
  { id: 'flour_wheat_bag_1k', name: 'Premium Wheat Flour', nameRu: 'Пшеничная мука (1кг)', desc: 'Wheat flour bag.', descRu: 'Мешок пшеничной муки высшего сорта (1 кг).', wt: 1.0, vol: 1.5, usable: false, leftoverId: 'sack_cloth_small', leftoverNameRu: 'Унифицированный тканевый мешок (1л)', taste: ['Сухой порошок склеивает рот... Тяжело дышать и глотать!'] },
  { id: 'flour_rye_bag_1k', name: 'Organic Rye Flour', nameRu: 'Ржаная мука (1кг)', desc: 'Rye flour bag.', descRu: 'Мешок ржаной муки грубого помола (1 кг).', wt: 1.0, vol: 1.5, usable: false, leftoverId: 'sack_cloth_small', leftoverNameRu: 'Унифицированный тканевый мешок (1л)', taste: ['Плотный сухой ржаной порошок... Мешает говорить.'] },
  { id: 'flour_corn_bag_500g', name: 'Cornmeal Flour', nameRu: 'Кукурузная мука (500г)', desc: 'Corn flour bag.', descRu: 'Пакетик желтой кукурузной муки крупного помола.', wt: 0.5, vol: 0.75, usable: false, leftoverId: 'sack_cloth_small', leftoverNameRu: 'Унифицированный тканевый мешок (1л)', taste: ['Жесткий сухой порошок со вкусом кукурузного крахмала...'] },
  { id: 'flour_rice_bag_500g', name: 'Rice Flour', nameRu: 'Рисовая мука (500г)', desc: 'Rice flour bag.', descRu: 'Пакетик безглютеновой рисовой муки.', wt: 0.5, vol: 0.7, usable: false, leftoverId: 'sack_cloth_small', leftoverNameRu: 'Унифицированный тканевый мешок (1л)', taste: ['Мелкий белый сухой порошок...'] },
  { id: 'grain_wheat_raw_bag', name: 'Raw Wheat Grain', nameRu: 'Цельное зерно пшеницы (1кг)', desc: 'Raw wheat grain bag.', descRu: 'Мешок цельного отборного зерна пшеницы (1 кг).', wt: 1.0, vol: 1.2, usable: true, hunger: 4, bites: 30, leftoverId: 'sack_cloth_small', leftoverNameRu: 'Унифицированный тканевый мешок (1л)', taste: ['Очень жесткие зерна пшеницы... Зубы с трудом их разгрызают.'] },
  { id: 'grain_rye_raw_bag', name: 'Raw Rye Grain', nameRu: 'Цельное зерно ржи (1кг)', desc: 'Raw rye grain bag.', descRu: 'Мешок цельного фуражного зерна ржи (1 кг).', wt: 1.0, vol: 1.2, usable: true, hunger: 4, bites: 30, leftoverId: 'sack_cloth_small', leftoverNameRu: 'Унифицированный тканевый мешок (1л)', taste: ['Темные твердые ржаные зерна со специфическим вкусом...'] },
  { id: 'grain_oats_bag', name: 'Rolled Oats Porridge', nameRu: 'Овсяные хлопья', desc: 'Rolled oats bag.', descRu: 'Картонная пачка овсяных хлопьев "Геркулес" (500 г).', wt: 0.5, vol: 1.0, usable: true, hunger: 8, bites: 20, leftoverId: 'box_cardboard_medium', leftoverNameRu: 'Средняя картонная коробка', taste: ['Сухие пресные хлопья липнут к зубам... Хочется сварить кашу.'] },
  { id: 'rice_basmati_bag', name: 'Premium Basmati Rice', nameRu: 'Рис Басмати (1кг)', desc: 'Basmati rice bag.', descRu: 'Пачка длиннозерного ароматного риса Басмати (1 кг).', wt: 1.0, vol: 1.1, usable: true, hunger: 5, bites: 30, leftoverId: 'sack_cloth_small', leftoverNameRu: 'Унифицированный тканевый мешок (1л)', taste: ['Жесткий сухой рис трещит на зубах. Склизкий крахмал.'] },
  { id: 'rice_arborio_bag', name: 'Arborio Risotto Rice', nameRu: 'Рис Арборио для ризотто', desc: 'Arborio rice bag.', descRu: 'Пачка круглозерного крахмалистого риса Арборио (500 г).', wt: 0.5, vol: 0.55, usable: true, hunger: 5, bites: 20, leftoverId: 'sack_cloth_small', leftoverNameRu: 'Унифицированный тканевый мешок (1л)', taste: ['Сухие зерна риса...'] },
  { id: 'buckwheat_roasted_bag', name: 'Roasted Buckwheat', nameRu: 'Гречневая крупа (1кг)', desc: 'Roasted buckwheat bag.', descRu: 'Мешок отборной обжаренной гречневой крупы ядрица (1 кг).', wt: 1.0, vol: 1.2, usable: true, hunger: 6, bites: 30, leftoverId: 'sack_cloth_small', leftoverNameRu: 'Унифицированный тканевый мешок (1л)', taste: ['Сухая гречка имеет приятный ореховый, но слишком жесткий вкус...'] },
  { id: 'barley_pearl_bag', name: 'Pearl Barley Groats', nameRu: 'Крупа перловая (1кг)', desc: 'Pearl barley bag.', descRu: 'Мешок ячменной крупы (перловки) длительной варки (1 кг).', wt: 1.0, vol: 1.25, usable: true, hunger: 5, bites: 30, leftoverId: 'sack_cloth_small', leftoverNameRu: 'Унифицированный тканевый мешок (1л)', taste: ['Жесткие ячменные ядра... Требуют долгой варки.'] },
  { id: 'millet_yellow_bag', name: 'Yellow Millet', nameRu: 'Пшено золотое (800г)', desc: 'Millet bag.', descRu: 'Пачка золотого шлифованного пшена (800 г).', wt: 0.8, vol: 0.9, usable: true, hunger: 4, bites: 25, leftoverId: 'sack_cloth_small', leftoverNameRu: 'Унифицированный тканевый мешок (1л)', taste: ['Мелкие сухие желтые крупинки пшена горчат...'] },
  { id: 'semolina_wheat_bag', name: 'Semolina Wheat', nameRu: 'Манная крупа (500г)', desc: 'Semolina bag.', descRu: 'Пакетик манной крупы мелкого помола (500 г).', wt: 0.5, vol: 0.6, usable: false, leftoverId: 'sack_cloth_small', leftoverNameRu: 'Унифицированный тканевый мешок (1л)', taste: ['Сухая манка забивает горло...'] },
  { id: 'peas_split_yellow', name: 'Yellow Split Peas', nameRu: 'Горох колотый желтый', desc: 'Split peas bag.', descRu: 'Пачка колотого желтого сушеного гороха (800 г).', wt: 0.8, vol: 0.9, usable: true, hunger: 6, bites: 25, leftoverId: 'sack_cloth_small', leftoverNameRu: 'Унифицированный тканевый мешок (1л)', taste: ['Сухой жесткий горох... Абсолютно не жуется в таком виде.'] },
  { id: 'beans_red_kidney', name: 'Red Kidney Beans', nameRu: 'Красная фасоль сухая', desc: 'Dry kidney beans bag.', descRu: 'Пачка красной фасоли сухой (800 г).', wt: 0.8, vol: 0.9, usable: true, hunger: 6, bites: 25, leftoverId: 'sack_cloth_small', leftoverNameRu: 'Унифицированный тканевый мешок (1л)', taste: ['Каменные сухие фасолины... Зубы можно сломать.'] },
  { id: 'beans_white_lima', name: 'White Lima Beans', nameRu: 'Белая фасоль сухая', desc: 'Dry white beans bag.', descRu: 'Пачка крупной сухой белой фасоли Лима (800 г).', wt: 0.8, vol: 0.9, usable: true, hunger: 6, bites: 25, leftoverId: 'sack_cloth_small', leftoverNameRu: 'Унифицированный тканевый мешок (1л)', taste: ['Каменные белые фасолины...'] },
  { id: 'lentils_red_dry', name: 'Red Split Lentils', nameRu: 'Чечевица красная', desc: 'Red lentils bag.', descRu: 'Пачка быстрой красной чечевицы (500 г).', wt: 0.5, vol: 0.55, usable: true, hunger: 5, bites: 20, leftoverId: 'sack_cloth_small', leftoverNameRu: 'Унифицированный тканевый мешок (1л)', taste: ['Сухие плоские диски чечевицы...'] },
  { id: 'lentils_green_dry', name: 'Green Whole Lentils', nameRu: 'Чечевица зеленая', desc: 'Green lentils bag.', descRu: 'Пачка крупной зеленой чечевицы (500 г).', wt: 0.5, vol: 0.55, usable: true, hunger: 5, bites: 20, leftoverId: 'sack_cloth_small', leftoverNameRu: 'Унифицированный тканевый мешок (1л)', taste: ['Сухие жесткие плоские зерна зеленой чечевицы...'] },
  { id: 'chickpeas_garbanzo_dry', name: 'Garbanzo Chickpeas', nameRu: 'Нут сухой', desc: 'Dry chickpeas bag.', descRu: 'Пачка крупного круглого сухого нута (800 г).', wt: 0.8, vol: 0.9, usable: true, hunger: 6, bites: 25, leftoverId: 'sack_cloth_small', leftoverNameRu: 'Унифицированный тканевый мешок (1л)', taste: ['Твердые как галька сухие зерна нута...'] },
  { id: 'yeast_dry_sachet', name: 'Instant Dry Yeast', nameRu: 'Сухие дрожжи (пакетик)', desc: 'Instant dry yeast sachet.', descRu: 'Маленький пакетик быстродействующих сухих дрожжей.', wt: 0.01, vol: 0.012, usable: true, hunger: 1, bites: 1, taste: ['Солоновато-кислый сухой порошок с сильным запахом брожения...'] },

  // === DAIRY & EGGS ===
  { id: 'milk_bottle_raw', name: 'Fresh Farm Milk', nameRu: 'Молоко парное деревенское', cat: 'drink', desc: 'Raw fresh cow milk.', descRu: 'Кувшин цельного деревенского парного молока.', wt: 1.03, vol: 1.0, usable: true, hunger: 10, thirst: 15, bites: 15, leftoverId: 'jar_glass_large', leftoverNameRu: 'Унифицированная стеклянная банка (1.0л)', taste: ['Сладкий, жирный вкус парного молока!', 'Насыщенный домашний сливочный аромат.'] },
  { id: 'milk_pasteurized_carton', name: 'Pasteurized Milk 3.2%', nameRu: 'Молоко пастеризованное 3.2%', cat: 'drink', desc: 'Pasteurized milk carton.', descRu: 'Коробка питьевого пастеризованного молока (1 л) 3.2%.', wt: 1.03, vol: 1.0, usable: true, hunger: 8, thirst: 12, bites: 15, leftoverId: 'tetra_pack_1000', leftoverNameRu: 'Тетрапак (1.0л)', taste: ['Приятный освежающий глоток холодного молока.'] },
  { id: 'cream_heavy_jar', name: 'Heavy Sour Cream 30%', nameRu: 'Сливки деревенские густые', desc: 'Heavy fresh cream jar.', descRu: 'Стеклянная баночка жирных густых деревенских сливок 30%.', wt: 0.4, vol: 0.38, usable: true, hunger: 15, bites: 20, leftoverId: 'jar_glass_medium', leftoverNameRu: 'Унифицированная стеклянная банка (0.5л)', taste: ['Густые, сладкие сливочные сливки. Невероятно нежно.'] },
  { id: 'sour_cream_pot', name: 'Russian Sour Cream (Smetana)', nameRu: 'Сметана 20%', desc: 'Thick sour cream pot.', descRu: 'Горшочек густой сметаны 20%.', wt: 0.45, vol: 0.43, usable: true, hunger: 14, bites: 20, leftoverId: 'jar_glass_medium', leftoverNameRu: 'Унифицированная стеклянная банка (0.5л)', taste: ['Густая, нежная сметана со сливочной кислинкой! Классический вкус.'] },
  { id: 'kefir_fermented_bottle', name: 'Kefir Probiotic Drink', nameRu: 'Кефир 2.5%', cat: 'drink', desc: 'Fermented kefir bottle.', descRu: 'Бутылка густого кисломолочного кефира (1 л) 2.5%.', wt: 1.0, vol: 0.95, usable: true, hunger: 10, thirst: 10, bites: 15, leftoverId: 'bottle_glass_large', leftoverNameRu: 'Унифицированная стеклянная бутылка (1.0л)', taste: ['Густой освежающий кефир приятно покалывает язык кисломолочным вкусом.'] },
  { id: 'cottage_cheese_pack', name: 'Fresh Cottage Cheese', nameRu: 'Творог рассыпчатый 9%', desc: 'Cottage cheese package.', descRu: 'Пачка рассыпчатого творога (250 г) 9%.', wt: 0.25, vol: 0.24, usable: true, hunger: 15, bites: 10, leftoverId: 'box_cardboard_small', leftoverNameRu: 'Малая картонная коробка', taste: ['Творожистый, нежный кисловатый вкус зерненого творога...'] },
  { id: 'yogurt_natural_cup', name: 'Plain Natural Yogurt', nameRu: 'Йогурт натуральный', desc: 'Plain unsweetened yogurt.', descRu: 'Стаканчик натурального несладкого йогурта без добавок.', wt: 0.15, vol: 0.14, usable: true, hunger: 6, thirst: 5, bites: 8, leftoverId: 'box_cardboard_small', leftoverNameRu: 'Малая картонная коробка', taste: ['Легкий йогурт со сливочной текстурой и чистым вкусом...'] },
  { id: 'buttermilk_fermented_jar', name: 'Cultured Buttermilk', nameRu: 'Кисломолочная пахта', cat: 'drink', desc: 'Cultured buttermilk jar.', descRu: 'Кувшин полезной кисломолочной пахты.', wt: 0.5, vol: 0.48, usable: true, hunger: 8, thirst: 8, bites: 12, leftoverId: 'jar_glass_medium', leftoverNameRu: 'Унифицированная стеклянная банка (0.5л)', taste: ['Легкий, жидкий кисломолочный напиток с приятным освежающим вкусом...'] },
  { id: 'butter_brick_salted', name: 'Sweet Cream Butter 82.5%', nameRu: 'Сливочное масло 82.5%', desc: 'Salted butter brick.', descRu: 'Брикет натурального сливочного масла (200 г) 82.5%.', wt: 0.2, vol: 0.21, usable: true, hunger: 15, bites: 20, leftoverId: 'box_cardboard_small', leftoverNameRu: 'Малая картонная коробка', taste: ['Сладковатый жирный кусок сливочного масла... Тает во рту.'] },
  { id: 'cheese_cheddar_block', name: 'Sharp Cheddar Block', nameRu: 'Сыр Чеддер (брусок)', desc: 'Sharp cheddar block.', descRu: 'Брусок выдержанного твердого сыра Чеддер.', wt: 0.35, vol: 0.33, usable: true, hunger: 18, bites: 15, leftoverId: 'box_cardboard_small', leftoverNameRu: 'Малая картонная коробка', taste: ['Острый, насыщенный и пикантный сырный вкус Чеддера!'] },
  { id: 'cheese_gouda_wheel', name: 'Gouda Cheese Mini Wheel', nameRu: 'Круг сыра Гауда', desc: 'Small gouda wheel.', descRu: 'Небольшой цельный круг сыра Гауда.', wt: 1.2, vol: 1.1, usable: true, hunger: 45, bites: 40, leftoverId: 'box_cardboard_medium', leftoverNameRu: 'Средняя картонная коробка', taste: ['Плотный, мягкий сливочный вкус сыра Гауда. Сытно и нежно.'] },
  { id: 'cheese_parmesan_wedge', name: 'Aged Parmesan Wedge', nameRu: 'Сыр Пармезан (кусок)', desc: 'Aged parmesan wedge.', descRu: 'Кусок твердого выдержанного сыра Пармезан.', wt: 0.25, vol: 0.23, usable: true, hunger: 16, bites: 20, leftoverId: 'box_cardboard_small', leftoverNameRu: 'Малая картонная коробка', taste: ['Кристаллический, соленый пикантный вкус выдержанного пармезана...'] },
  { id: 'cheese_mozzarella_ball', name: 'Fresh Mozzarella Ball', nameRu: 'Шарик сыра Моцарелла', desc: 'Mozzarella ball in brine.', descRu: 'Шарик мягкого нежного сыра Моцарелла в рассоле.', wt: 0.12, vol: 0.15, usable: true, hunger: 8, bites: 6, taste: ['Очень мягкий, пресноватый нежный сливочный шарик моцареллы.'] },
  { id: 'cheese_suluguni_braid', name: 'Suluguni Smoked Braid', nameRu: 'Сыр Сулугуни копченый', desc: 'Smoked suluguni braid.', descRu: 'Волокнистая плетёная косичка копченого сыра Сулугуни.', wt: 0.3, vol: 0.28, usable: true, hunger: 14, thirst: -5, bites: 15, leftoverId: 'box_cardboard_small', leftoverNameRu: 'Малая картонная коробка', taste: ['Волокнистый соленый сыр с прекрасным ароматом копчения!'] },
  { id: 'cheese_feta_block', name: 'Fresh Greek Feta Block', nameRu: 'Сыр Фета (брусок)', desc: 'Fresh feta block.', descRu: 'Брусок соленого мягкого сыра Фета в упаковке.', wt: 0.2, vol: 0.18, usable: true, hunger: 12, thirst: -8, bites: 12, leftoverId: 'box_cardboard_small', leftoverNameRu: 'Малая картонная коробка', taste: ['Рассыпчатый, солено-кисловатый сыр с нежным вкусом...'] },
  { id: 'eggs_chicken_carton', name: 'Chicken Eggs Carton (10x)', nameRu: 'Лоток куриных яиц (10 шт)', desc: 'Carton of chicken eggs.', descRu: 'Упаковка столовых куриных яиц (10 штук).', wt: 0.65, vol: 1.2, usable: true, hunger: 15, bites: 10, leftoverId: 'box_cardboard_medium', leftoverNameRu: 'Средняя картонная коробка', taste: ['Вы разбиваете яйцо и пьете его сырым... Слизкий белок и жидкий желток.'] },
  { id: 'egg_chicken_single', name: 'Farm Chicken Egg', nameRu: 'Куриное яйцо поштучно', desc: 'Single chicken egg.', descRu: 'Куриное яйцо поштучно.', wt: 0.06, vol: 0.05, usable: true, hunger: 2, bites: 1, taste: ['Сырое куриное яйцо... Полезно для горла.'] },
  { id: 'eggs_quail_pack', name: 'Quail Eggs Carton (18x)', nameRu: 'Лоток перепелиных яиц (18 шт)', desc: 'Carton of quail eggs.', descRu: 'Упаковка маленьких пятнистых перепелиных яиц (18 штук).', wt: 0.22, vol: 0.4, usable: true, hunger: 10, bites: 18, leftoverId: 'box_cardboard_small', leftoverNameRu: 'Малая картонная коробка', taste: ['Крошечные перепелиные яйца... Нежный жидкий желток.'] },
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
