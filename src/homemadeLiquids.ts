import { InventoryItem } from './types';
import type {
  FluidMixComponent,
  FluidSubstanceAttributes,
  LiquidId,
} from './liquidSystem';
import { PRODUCE_SPECIES_SPECS } from './produceData';

type ItemFluidStorage = NonNullable<InventoryItem['fluidStorage']>;

export interface HomemadeRecipeMatch {
  recipeId: string;
  targetLiquidId: LiquidId;
  culinaryEquivalentId?: string;
  varietyRu: string;
  preparationMethod: string;
  purpose: string;
  reasonAndOrigin: string;
  colorHex: string;
  ingredients: string[];
  requiredSec: number;
  effects: NonNullable<FluidSubstanceAttributes['customEffects']>;
  tasteMessages: string[];
  /** Optional volume multiplier on existing liquid (e.g. 0.72 for condensed milk simmering) */
  volumeScale?: number;
  /** Optional extra ml generated from dissolved/rendered solids */
  generatedMl?: number;
  /** Indices of solid items in container.contents to consume/dissolve into the liquid */
  consumeSolidIndices?: number[];
  /** Optional state tag to apply to remaining solids (e.g. pickled/fermented) */
  markRemainingSolids?: {
    state: string;
    stateNameRu: string;
    preparationMethod: string;
    hungerMult?: number;
  };
  /** Optional component snapshot to replace old pre-cooked components */
  resultComponents?: FluidMixComponent[];
}

interface AnalyzedSolids {
  all: { item: InventoryItem; idx: number; cleanName: string; weightKg: number }[];
  butter: number[];
  tallow: number[];
  redMeat: number[];
  poultry: number[];
  fishSeafood: number[];
  bones: number[];
  mushrooms: number[];
  berries: number[];
  sweetFruits: number[];
  citrus: number[];
  pomegranates: number[];
  tomatoes: number[];
  zucchini: number[];
  eggplants: number[];
  cabbage: number[];
  chiliPeppers: number[];
  picklableVeg: number[];
  pureeVeg: number[];
  savoryVeg: number[];
  freshHerbs: number[];
  ginger: number[];
  garlic: number[];
  onion: number[];
  bread: number[];
  sugarSolids: number[];
  saltSolids: number[];
  totalSolidMl: number;
}

const SWEET_FRUIT_IDS = new Set([
  'apple_whole',
  'pear_whole',
  'peach_whole',
  'apricot_whole',
  'plum_whole',
  'nectarine_whole',
  'banana_single',
  'mango_whole',
  'kiwi_whole',
  'persimmon_whole',
  'fig_whole',
  'quince_whole',
  'pineapple_whole',
  'melon_whole',
  'watermelon_whole',
  'grape_berry',
  'cherry_single',
  'sweet_cherry_single',
  'pomegranate_whole',
]);

const PUREE_VEG_IDS = new Set([
  'potato_whole',
  'sweet_potato_whole',
  'pumpkin_whole',
  'carrot_whole',
  'beetroot_whole',
  'cauliflower_head',
  'broccoli_head',
  'pea_pod',
]);

const PICKLABLE_VEG_IDS = new Set([
  'cucumber_whole',
  'tomato_whole',
  'tomato_cherry_single',
  'cabbage_white_head',
  'cabbage_red_head',
  'cabbage_napa_head',
  'bell_pepper_whole',
  'chili_pepper_whole',
  'garlic_bulb',
  'onion_yellow_whole',
  'onion_red_whole',
  'carrot_whole',
  'radish_whole',
  'ginger_root',
  'cauliflower_head',
  'turnip_whole',
  'beetroot_whole',
  'zucchini_whole',
  'eggplant_whole',
  'olive_single',
]);

const HERB_IDS = new Set([
  'mint_leaves_fresh',
  'dill_bunch_fresh',
  'parsley_bunch_fresh',
  'cilantro_bunch_fresh',
  'basil_leaves_fresh',
  'thyme_sprig_fresh',
  'rosemary_sprig_fresh',
  'oregano_sprig_fresh',
  'bay_leaf_single',
  'green_onion_stalk',
  'sorrel_leaf_fresh',
  'spinach_leaf_fresh',
]);

function cleanDisplayName(nameRu: string): string {
  // If wrapped in packaging like "Бумажная упаковка (Сливочное масло...)", extract the product inside parentheses
  const packMatch = nameRu.match(/^(?:Бумажная упаковка|Упаковка|Пакет|Лоток)\s*\(([^)]+)\)/i);
  if (packMatch && packMatch[1]) {
    return packMatch[1].trim();
  }
  return (
    nameRu
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || nameRu
  );
}

function getSolidCleanName(item: InventoryItem): string {
  const rawName = item.nameRu || item.itemId;
  if (/^(?:Бумажная упаковка|Упаковка|Пакет|Лоток)/i.test(rawName)) {
    if (item.originalCatalogId === 'butter_brick_salted' || item.itemId === 'butter_brick_salted') {
      return 'Сливочное масло';
    }
    if (item.attributes?.varietyRu && !/^(?:Бумажная упаковка|Упаковка)/i.test(item.attributes.varietyRu)) {
      return item.attributes.varietyRu.trim();
    }
  }
  return cleanDisplayName(rawName);
}

function uniqueStrings(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const s = raw.trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(s);
    }
  }
  return out;
}

function getSolidSpeciesId(item: InventoryItem): string {
  return (
    item.produceAttributes?.speciesId ||
    item.meatAttributes?.speciesId ||
    item.originalCatalogId ||
    item.itemId ||
    ''
  ).toLowerCase();
}

function analyzeSolids(contents: InventoryItem[] | undefined): AnalyzedSolids {
  const res: AnalyzedSolids = {
    all: [],
    butter: [],
    tallow: [],
    redMeat: [],
    poultry: [],
    fishSeafood: [],
    bones: [],
    mushrooms: [],
    berries: [],
    sweetFruits: [],
    citrus: [],
    pomegranates: [],
    tomatoes: [],
    zucchini: [],
    eggplants: [],
    cabbage: [],
    chiliPeppers: [],
    picklableVeg: [],
    pureeVeg: [],
    savoryVeg: [],
    freshHerbs: [],
    ginger: [],
    garlic: [],
    onion: [],
    bread: [],
    sugarSolids: [],
    saltSolids: [],
    totalSolidMl: 0,
  };

  if (!contents || contents.length === 0) return res;

  for (let idx = 0; idx < contents.length; idx++) {
    const item = contents[idx];
    if (!item) continue;
    // Skip nested closed containers/packages (plastic trays, vacuum packs, jars) so sealed plastic wrap doesn't cook
    const rawId = (item.itemId || '').toLowerCase();
    const isSealedPlasticPack =
      Boolean(item.isContainer && !item.isOpen) &&
      (rawId.includes('tray_sealed') || rawId.includes('vacuum_pack') || rawId.includes('carton') || rawId.includes('pouch'));
    if (item.fluidStorage || (item.containerVisuals && !item.isOpen) || isSealedPlasticPack) continue;

    const id = (item.originalCatalogId || item.itemId || '').toLowerCase();
    const speciesId = getSolidSpeciesId(item);
    const nameL = (item.nameRu || '').toLowerCase();
    const cleanName = getSolidCleanName(item);
    const weightKg = Math.max(0.015, item.weight || (item.volume ? item.volume * 0.9 : 0.1));
    const volMl = Math.max(10, Math.round((item.volume || weightKg * 1.05) * 1000));

    res.all.push({ item, idx, cleanName, weightKg });
    res.totalSolidMl += volMl;

    // 1. Butter & animal fats
    if (
      ((id.includes('butter') && !id.includes('boletus') && !id.includes('mushroom') && !id.includes('peanut')) ||
        (nameL.includes('сливочн') && nameL.includes('масл')))
    ) {
      res.butter.push(idx);
      continue;
    }
    if (
      id.includes('tallow') ||
      id.includes('lard') ||
      id.includes('fat_back') ||
      id.includes('salo') ||
      nameL.includes('жир-сырец') ||
      nameL.includes('курдюк') ||
      nameL.includes('сало')
    ) {
      res.tallow.push(idx);
      continue;
    }

    // 2. Bread & baked dough
    const isBakedDoughBread =
      it.itemId === 'dough' &&
      Boolean(
        it.doughAttributes &&
          (it.doughAttributes.cookState === 'baked' || it.doughAttributes.cookState === 'burnt') &&
          (!it.doughAttributes.fillings || it.doughAttributes.fillings.length === 0)
      );
    if (
      isBakedDoughBread ||
      id.includes('bread') ||
      id.includes('loaf') ||
      id.includes('bun') ||
      id.includes('crouton') ||
      id.includes('rusk') ||
      nameL.includes('хлеб') ||
      nameL.includes('батон') ||
      nameL.includes('сухар')
    ) {
      res.bread.push(idx);
      continue;
    }

    // 3. Solid sugar/salt cubes if any
    if (id.includes('sugar') || nameL.includes('сахар')) {
      res.sugarSolids.push(idx);
      continue;
    }
    if (id.includes('salt') || nameL === 'соль') {
      res.saltSolids.push(idx);
      continue;
    }

    // 4. Meat / Poultry / Fish / Bones
    const meatAttr = item.meatAttributes;
    const isBone =
      id.includes('bone') ||
      nameL.includes('кост') ||
      nameL.includes('хребет') ||
      nameL.includes('скелет');
    if (isBone) {
      res.bones.push(idx);
    }

    if (
      meatAttr?.meatCategory === 'fish' ||
      meatAttr?.meatCategory === 'seafood' ||
      id.includes('fish') ||
      id.includes('salmon') ||
      id.includes('trout') ||
      id.includes('pike') ||
      id.includes('perch') ||
      id.includes('cod') ||
      id.includes('carp') ||
      id.includes('herring') ||
      id.includes('mackerel') ||
      id.includes('shrimp') ||
      id.includes('squid') ||
      nameL.includes('рыб') ||
      nameL.includes('лосос') ||
      nameL.includes('форел') ||
      nameL.includes('щук') ||
      nameL.includes('судак') ||
      nameL.includes('окун') ||
      nameL.includes('треск') ||
      nameL.includes('карп') ||
      nameL.includes('сельд') ||
      nameL.includes('скумбр')
    ) {
      res.fishSeafood.push(idx);
      continue;
    }

    if (
      meatAttr?.meatCategory === 'poultry' ||
      id.includes('chicken') ||
      id.includes('duck') ||
      id.includes('goose') ||
      id.includes('turkey') ||
      id.includes('quail') ||
      nameL.includes('куриц') ||
      nameL.includes('курин') ||
      nameL.includes('утк') ||
      nameL.includes('утин') ||
      nameL.includes('гус') ||
      nameL.includes('индейк') ||
      nameL.includes('перепел')
    ) {
      res.poultry.push(idx);
      continue;
    }

    if (
      meatAttr?.meatCategory === 'meat' ||
      meatAttr?.meatCategory === 'offal' ||
      id.includes('beef') ||
      id.includes('pork') ||
      id.includes('mutton') ||
      id.includes('venison') ||
      id.includes('goat') ||
      id.includes('lamb') ||
      id.includes('steak') ||
      id.includes('meat') ||
      nameL.includes('говяд') ||
      nameL.includes('свинин') ||
      nameL.includes('баран') ||
      nameL.includes('оленин') ||
      nameL.includes('козлят') ||
      nameL.includes('мясо') ||
      nameL.includes('вырезк') ||
      nameL.includes('грудинк') ||
      nameL.includes('рёбр') ||
      nameL.includes('печен')
    ) {
      res.redMeat.push(idx);
      continue;
    }

    if (isBone) continue;

    // 5. Produce (Vegetables, Fruits, Citrus, Berries, Mushrooms, Herbs)
    const prodAttr = item.produceAttributes;
    const prodSpec = PRODUCE_SPECIES_SPECS[speciesId] || PRODUCE_SPECIES_SPECS[id];
    const prodCat = prodAttr?.produceCategory || prodSpec?.produceCategory;

    if (
      prodCat === 'mushroom' ||
      id.includes('mushroom') ||
      id.includes('boletus') ||
      id.includes('chanterelle') ||
      id.includes('champignon') ||
      id.includes('agaric') ||
      id.includes('milkcap') ||
      id.includes('russula') ||
      nameL.includes('гриб') ||
      nameL.includes('боровик') ||
      nameL.includes('лисичк') ||
      nameL.includes('опён') ||
      nameL.includes('опят') ||
      nameL.includes('шампиньон') ||
      nameL.includes('груздь') ||
      nameL.includes('подберёз') ||
      nameL.includes('подосинов')
    ) {
      res.mushrooms.push(idx);
      res.picklableVeg.push(idx);
      continue;
    }

    if (
      prodCat === 'herb' ||
      HERB_IDS.has(speciesId) ||
      HERB_IDS.has(id) ||
      nameL.includes('мят') ||
      nameL.includes('укроп') ||
      nameL.includes('петруш') ||
      nameL.includes('базилик') ||
      nameL.includes('тимьян') ||
      nameL.includes('чабрец') ||
      nameL.includes('розмарин') ||
      nameL.includes('лавров') ||
      nameL.includes('кинз')
    ) {
      res.freshHerbs.push(idx);
      continue;
    }

    if (
      speciesId === 'ginger_root' ||
      id.includes('ginger') ||
      nameL.includes('имбир')
    ) {
      res.ginger.push(idx);
      res.picklableVeg.push(idx);
      continue;
    }

    if (
      speciesId === 'garlic_bulb' ||
      id.includes('garlic') ||
      nameL.includes('чеснок')
    ) {
      res.garlic.push(idx);
      res.picklableVeg.push(idx);
      res.savoryVeg.push(idx);
      continue;
    }

    if (
      speciesId.includes('onion') ||
      id.includes('onion') ||
      nameL.includes('лук')
    ) {
      res.onion.push(idx);
      res.picklableVeg.push(idx);
      res.savoryVeg.push(idx);
      continue;
    }

    if (
      speciesId === 'pomegranate_whole' ||
      id.includes('pomegranate') ||
      nameL.includes('гранат')
    ) {
      res.pomegranates.push(idx);
      res.sweetFruits.push(idx);
      continue;
    }

    if (
      prodCat === 'berry' ||
      id.includes('raspberry') ||
      id.includes('strawberry') ||
      id.includes('blueberry') ||
      id.includes('lingonberry') ||
      id.includes('cranberry') ||
      id.includes('currant') ||
      id.includes('blackberry') ||
      id.includes('gooseberry') ||
      id.includes('cherry') ||
      id.includes('sea_buckthorn') ||
      id.includes('grape') ||
      nameL.includes('малин') ||
      nameL.includes('клубник') ||
      nameL.includes('земляник') ||
      nameL.includes('черник') ||
      nameL.includes('брусник') ||
      nameL.includes('клюкв') ||
      nameL.includes('смородин') ||
      nameL.includes('ежевик') ||
      nameL.includes('вишн') ||
      nameL.includes('черешн') ||
      nameL.includes('облепих') ||
      nameL.includes('виноград')
    ) {
      res.berries.push(idx);
      continue;
    }

    if (
      prodCat === 'citrus' ||
      id.includes('lemon') ||
      id.includes('lime') ||
      id.includes('orange') ||
      id.includes('mandarin') ||
      id.includes('grapefruit') ||
      nameL.includes('лимон') ||
      nameL.includes('лайм') ||
      nameL.includes('апельсин') ||
      nameL.includes('мандарин') ||
      nameL.includes('грейпфрут')
    ) {
      res.citrus.push(idx);
      continue;
    }

    if (
      prodCat === 'fruit' ||
      SWEET_FRUIT_IDS.has(speciesId) ||
      SWEET_FRUIT_IDS.has(id) ||
      nameL.includes('яблок') ||
      nameL.includes('груш') ||
      nameL.includes('слив') ||
      nameL.includes('абрикос') ||
      nameL.includes('персик') ||
      nameL.includes('банан') ||
      nameL.includes('манго') ||
      nameL.includes('айв')
    ) {
      res.sweetFruits.push(idx);
      continue;
    }

    // Specific vegetables
    if (speciesId === 'zucchini_whole' || id.includes('zucchini') || nameL.includes('кабачок') || nameL.includes('кабачк') || nameL.includes('цукин')) {
      res.zucchini.push(idx);
      res.savoryVeg.push(idx);
      res.picklableVeg.push(idx);
      continue;
    }
    if (speciesId === 'eggplant_whole' || id.includes('eggplant') || nameL.includes('баклажан')) {
      res.eggplants.push(idx);
      res.savoryVeg.push(idx);
      res.picklableVeg.push(idx);
      continue;
    }
    if (speciesId.includes('cabbage') || id.includes('cabbage') || nameL.includes('капуст')) {
      res.cabbage.push(idx);
      res.picklableVeg.push(idx);
      res.savoryVeg.push(idx);
      continue;
    }
    if (speciesId.includes('tomato') || id.includes('tomato') || nameL.includes('томат') || nameL.includes('помидор')) {
      res.tomatoes.push(idx);
      res.picklableVeg.push(idx);
      res.savoryVeg.push(idx);
      continue;
    }
    if (speciesId === 'chili_pepper_whole' || id.includes('chili') || nameL.includes('чили') || nameL.includes('острый перец')) {
      res.chiliPeppers.push(idx);
      res.picklableVeg.push(idx);
      res.savoryVeg.push(idx);
      continue;
    }
    if (PUREE_VEG_IDS.has(speciesId) || PUREE_VEG_IDS.has(id) || nameL.includes('картоф') || nameL.includes('тыкв') || nameL.includes('морков') || nameL.includes('свёкл') || nameL.includes('свекл')) {
      res.pureeVeg.push(idx);
      res.savoryVeg.push(idx);
      if (PICKLABLE_VEG_IDS.has(speciesId) || PICKLABLE_VEG_IDS.has(id)) {
        res.picklableVeg.push(idx);
      }
      continue;
    }
    if (prodCat === 'vegetable' || PICKLABLE_VEG_IDS.has(speciesId) || PICKLABLE_VEG_IDS.has(id) || nameL.includes('огур') || nameL.includes('перец') || nameL.includes('сельдерей')) {
      res.savoryVeg.push(idx);
      res.picklableVeg.push(idx);
      continue;
    }
  }

  return res;
}

interface FluidComponentSummary {
  totalMl: number;
  byId: Record<string, number>;
  labels: string[];
  has: (id: string, minMl?: number) => boolean;
  mlOf: (id: string) => number;
  hasLabelMatching: (re: RegExp) => boolean;
  hasSoySauce: boolean;
  hasDryTea: boolean;
  hasDryCoffee: boolean;
  hasHerbalSpice: boolean;
  hasSpices: boolean;
  hasSweetener: boolean;
  sweetenerMl: number;
  hasSalt: boolean;
  hasAcidOrVinegar: boolean;
  hasStarterDairy: boolean;
}

function summarizeFluidComponents(storage: ItemFluidStorage): FluidComponentSummary {
  const byId: Record<string, number> = {};
  const labels: string[] = [];
  const totalMl = Math.max(0, storage.currentMl || 0);

  if (Array.isArray(storage.components) && storage.components.length > 0) {
    for (const c of storage.components) {
      if (!c || !c.liquidId || c.ml <= 0.1) continue;
      byId[c.liquidId] = (byId[c.liquidId] || 0) + c.ml;
      if (c.labelRu) labels.push(c.labelRu);
    }
  } else if (storage.liquidId && totalMl > 0) {
    byId[storage.liquidId] = totalMl;
    if (storage.attributes?.varietyRu) labels.push(storage.attributes.varietyRu);
  }

  // Also inspect infused items & existing ingredients text for mixtures created before component tracking
  const attrIngs = storage.attributes?.ingredients ?? storage.attributes?.sourceIngredients;
  const attrIngList: string[] = Array.isArray(attrIngs)
    ? attrIngs
    : typeof attrIngs === 'string'
    ? attrIngs.split(',').map((s) => s.trim())
    : [];
  for (const s of attrIngList) {
    if (s) labels.push(s);
  }
  if (storage.infusedItems) {
    for (const inf of storage.infusedItems) {
      if (inf.nameRu) labels.push(inf.nameRu);
    }
  }

  const allLabelText = labels.join(' | ').toLowerCase();
  const eqId = (storage.attributes?.culinaryEquivalentId || '').toLowerCase();

  // Fallback component inference from ingredient labels when components array had single entry
  if (!byId['sugar'] && /сахар/.test(allLabelText)) {
    byId['sugar'] = Math.max(15, Math.round(totalMl * 0.22));
  }
  if (!byId['salt'] && /(^|\s|,)соль(\s|,|$)|солевой|каменная соль|морская соль/.test(allLabelText)) {
    byId['salt'] = Math.max(8, Math.round(totalMl * 0.06));
  }
  if (!byId['vinegar'] && /уксус/.test(allLabelText)) {
    byId['vinegar'] = Math.max(15, Math.round(totalMl * 0.1));
  }
  if (!byId['honey'] && /мёд|мед(\s|,|$)/.test(allLabelText)) {
    byId['honey'] = Math.max(20, Math.round(totalMl * 0.2));
  }
  if (!byId['flour'] && /мука/.test(allLabelText)) {
    byId['flour'] = Math.max(40, Math.round(totalMl * 0.35));
  }

  const mlOf = (id: string) => byId[id] || 0;
  const has = (id: string, minMl = 1) => (byId[id] || 0) >= minMl;
  const hasLabelMatching = (re: RegExp) => re.test(allLabelText);

  const hasSoySauce =
    eqId === 'sauce_soy' ||
    (has('sauce') && hasLabelMatching(/соев/));

  const hasDryTea =
    has('tea') && (storage.attributes?.physicalForm === 'dry' || has('water') || hasLabelMatching(/чайный лист|сух.*чай|каркаде|гибискус|сенча|заварк/));

  const hasDryCoffee =
    has('coffee') && (storage.attributes?.physicalForm === 'dry' || has('water') || hasLabelMatching(/молотый кофе|зёрна кофе|зернов|кофе в зёрнах/));

  const hasHerbalSpice =
    has('spice_dry') &&
    hasLabelMatching(/трав|мят|чабрец|душиц|ромашк|каркаде|гибискус|лип|шиповник|кориц|имбир|сбор/);

  const hasSpices = has('spice_dry') || hasLabelMatching(/перец|паприк|кориц|куркум|чеснок|трав|лавровый|гвоздик|кориандр/);

  const sweetenerMl = mlOf('sugar') + mlOf('honey');
  const hasSweetener = sweetenerMl >= 8;
  const hasSalt = has('salt', 3);
  const hasAcidOrVinegar = has('vinegar', 5) || has('food_acid', 2);
  const hasStarterDairy =
    has('dairy_fermented', 5) ||
    eqId === 'sour_cream' ||
    eqId === 'kefir' ||
    eqId === 'yogurt' ||
    eqId === 'yeast_liquid';

  return {
    totalMl,
    byId,
    labels,
    has,
    mlOf,
    hasLabelMatching,
    hasSoySauce,
    hasDryTea,
    hasDryCoffee,
    hasHerbalSpice,
    hasSpices,
    hasSweetener,
    sweetenerMl,
    hasSalt,
    hasAcidOrVinegar,
    hasStarterDairy,
  };
}

function buildHomemadeIngredientsList(
  storage: ItemFluidStorage,
  solids: AnalyzedSolids,
  includeBaseLiquidNames: boolean = true,
  selectedSolidIndices?: number[]
): string[] {
  const list: string[] = [];

  if (includeBaseLiquidNames) {
    if (Array.isArray(storage.components) && storage.components.length > 0) {
      for (const c of storage.components) {
        if (!c || c.ml <= 0.5) continue;
        const lbl = c.labelRu ? cleanDisplayName(c.labelRu) : defaultLiquidNameRu(c.liquidId);
        list.push(lbl);
      }
    } else if (storage.liquidId && storage.currentMl > 0) {
      const existingIngs = storage.attributes?.ingredients;
      if (Array.isArray(existingIngs) && existingIngs.length > 0) {
        for (const s of existingIngs) list.push(cleanDisplayName(s));
      } else {
        list.push(defaultLiquidNameRu(storage.liquidId));
      }
    }
  }

  const solidEntries = selectedSolidIndices
    ? solids.all.filter((s) => selectedSolidIndices.includes(s.idx))
    : solids.all;

  for (const s of solidEntries) {
    list.push(s.cleanName);
  }

  if (storage.infusedItems && storage.infusedItems.length > 0) {
    for (const inf of storage.infusedItems) {
      if (inf.intensity >= 0.15) {
        list.push(cleanDisplayName(inf.nameRu));
      }
    }
  }

  return uniqueStrings(list);
}

function defaultLiquidNameRu(liquidId: string): string {
  switch (liquidId) {
    case 'water': return 'Питьевая вода';
    case 'milk': return 'Молоко';
    case 'sugar': return 'Сахар-песок';
    case 'salt': return 'Поваренная соль';
    case 'honey': return 'Натуральный мёд';
    case 'vinegar': return 'Столовый уксус';
    case 'oil_culinary': return 'Растительное масло';
    case 'rendered_fat': return 'Топлёный жир';
    case 'spice_dry': return 'Пряности и травы';
    case 'food_acid': return 'Пищевая кислота';
    case 'flour': return 'Пшеничная мука';
    case 'sauce': return 'Соус';
    case 'tea': return 'Чайный лист';
    case 'coffee': return 'Молотый кофе';
    case 'dairy_fermented': return 'Кисломолочная закваска';
    case 'syrup_sweet': return 'Сахарный сироп';
    case 'juice': return 'Фруктовый сок';
    case 'wine': return 'Виноградное вино';
    default: return liquidId;
  }
}

function getFruitJamProfile(solids: AnalyzedSolids): {
  culinaryEquivalentId: string;
  labelRu: string;
  colorHex: string;
} {
  const fruitIndices = [...solids.berries, ...solids.sweetFruits, ...solids.citrus];
  const names = fruitIndices
    .map((i) => solids.all.find((x) => x.idx === i)?.cleanName || '')
    .filter(Boolean);
  const joined = names.join(' ').toLowerCase();

  if (joined.includes('малин')) {
    return { culinaryEquivalentId: 'jam_raspberry', labelRu: 'Домашнее малиновое варенье', colorHex: '#be123c' };
  }
  if (joined.includes('клубник') || joined.includes('земляник')) {
    return { culinaryEquivalentId: 'jam_strawberry', labelRu: 'Домашнее клубничное варенье', colorHex: '#dc2626' };
  }
  if (joined.includes('черник')) {
    return { culinaryEquivalentId: 'jam_blueberry', labelRu: 'Домашнее черничное варенье', colorHex: '#4c1d95' };
  }
  if (joined.includes('вишн') || joined.includes('черешн')) {
    return { culinaryEquivalentId: 'jam', labelRu: 'Домашнее вишнёвое варенье', colorHex: '#881337' };
  }
  if (joined.includes('брусник') || joined.includes('клюкв')) {
    return { culinaryEquivalentId: 'jam', labelRu: 'Домашнее бруснично-клюквенное варенье', colorHex: '#b91c1c' };
  }
  if (joined.includes('смородин') || joined.includes('ежевик')) {
    return { culinaryEquivalentId: 'jam', labelRu: 'Домашнее смородиновое варенье', colorHex: '#581c87' };
  }
  if (joined.includes('абрикос') || joined.includes('персик') || joined.includes('облепих') || joined.includes('апельсин') || joined.includes('лимон')) {
    const lead = names[0] || 'фруктовое';
    return { culinaryEquivalentId: 'jam', labelRu: `Домашнее варенье (${lead})`, colorHex: '#d97706' };
  }
  if (joined.includes('яблок') || joined.includes('груш') || joined.includes('айв')) {
    const lead = names[0] || 'яблочное';
    return { culinaryEquivalentId: 'jam', labelRu: `Домашнее варенье (${lead})`, colorHex: '#ca8a04' };
  }
  if (joined.includes('слив')) {
    return { culinaryEquivalentId: 'jam', labelRu: 'Домашнее сливовое варенье', colorHex: '#6b21a8' };
  }
  const short = uniqueStrings(names).slice(0, 2).join(', ');
  return {
    culinaryEquivalentId: 'jam',
    labelRu: short ? `Домашнее варенье (${short})` : 'Домашнее ягодно-фруктовое варенье',
    colorHex: '#9f1239',
  };
}

function pickFruitColor(solids: AnalyzedSolids, indices: number[], fallback: string): string {
  for (const idx of indices) {
    const entry = solids.all.find((s) => s.idx === idx);
    const c =
      entry?.item.produceAttributes?.color ||
      entry?.item.attributes?.customColor ||
      entry?.item.attributes?.visuals?.color;
    if (c && /^#[0-9a-f]{6}$/i.test(c)) return c;
  }
  return fallback;
}

/**
 * Evaluates whether a container (on a stove, in an oven/microwave, or resting at room temperature)
 * currently satisfies a logical homemade culinary liquid / preserve recipe WITHOUT factory equipment.
 */
export function evaluateHomemadeLiquidRecipe(
  container: InventoryItem
): HomemadeRecipeMatch | null {
  const storage = container.fluidStorage;
  if (!storage) return null;

  const tempC = container.temperature ?? 20;
  const solids = analyzeSolids(container.contents);
  const fl = summarizeFluidComponents(storage);
  const currentLiq = storage.liquidId;
  const isAlreadyHomemade = Boolean(storage.attributes?.isHomemade);
  const prevHomemadeId = isAlreadyHomemade ? (storage.homemadeRecipeId || '') : '';
  const isDry = fl.totalMl < 3 || storage.attributes?.physicalForm === 'dry';

  const hasWater = fl.has('water', 15);
  const waterMl = fl.mlOf('water');
  const hasMilk = fl.has('milk', 25);
  const milkMl = fl.mlOf('milk');
  const hasOil = fl.has('oil_culinary', 15);
  const hasRenderedFat = fl.has('rendered_fat', 15);
  const hasAnyMeat = solids.redMeat.length > 0 || solids.poultry.length > 0 || solids.fishSeafood.length > 0 || solids.bones.length > 0;
  const hasSweetFruitsOrBerries = solids.berries.length > 0 || solids.sweetFruits.length > 0 || solids.citrus.length > 0;

  // =========================================================================
  // 1. DRY-PAN / POT FAT RENDERING -> rendered_fat (Ghee / Lard / Tallow)
  // =========================================================================
  if ((fl.totalMl < 5 || currentLiq === 'rendered_fat') && solids.butter.length > 0 && tempC >= 65) {
    const butterWeightKg = solids.butter.reduce(
      (sum, idx) => sum + (solids.all.find((s) => s.idx === idx)?.weightKg || 0.2),
      0
    );
    const yieldMl = Math.max(40, Math.round(butterWeightKg * 880));
    const ings = buildHomemadeIngredientsList(storage, solids, fl.totalMl > 5, [
      ...solids.butter,
      ...solids.freshHerbs,
      ...solids.garlic,
      ...solids.saltSolids,
    ]);
    return {
      recipeId: 'homemade_ghee',
      targetLiquidId: 'rendered_fat',
      culinaryEquivalentId: 'ghee',
      varietyRu: 'Домашнее топлёное масло (Гхи)',
      preparationMethod: 'Домашнее медленное перетапливание сливочного масла на сковороде с выпариванием влаги',
      purpose: 'Высокотемпературная жарка без дыма, заправка каш и выпечки',
      reasonAndOrigin: 'Приготовлено дома без промышленного сепаратора — чистый вытопленный молочный жир из сливочного масла.',
      colorHex: '#f59e0b',
      ingredients: ings.length > 0 ? ings : ['Сливочное масло (домашнее перетапливание)'],
      requiredSec: 12,
      effects: { hunger: 44, energy: 24, health: 8 },
      tasteMessages: ['Тёплый ореховый аромат свежевытопленного домашнего масла Гхи.'],
      generatedMl: yieldMl,
      consumeSolidIndices: [...solids.butter],
      resultComponents: [{ liquidId: 'rendered_fat', ml: fl.totalMl + yieldMl, labelRu: 'Домашнее топлёное масло (Гхи)', color: '#f59e0b' }],
    };
  }

  if ((fl.totalMl < 5 || currentLiq === 'rendered_fat') && solids.tallow.length > 0 && tempC >= 75) {
    const fatWeightKg = solids.tallow.reduce(
      (sum, idx) => sum + (solids.all.find((s) => s.idx === idx)?.weightKg || 0.3),
      0
    );
    const yieldMl = Math.max(50, Math.round(fatWeightKg * 820));
    const fatInfoStr = solids.tallow
      .map((idx) => {
        const entry = solids.all.find((s) => s.idx === idx);
        if (!entry) return '';
        return `${entry.item.itemId} ${entry.item.originalCatalogId || ''} ${entry.item.meatAttributes?.speciesId || ''} ${entry.item.nameRu} ${entry.cleanName}`;
      })
      .join(' ')
      .toLowerCase();
    const isPork = fatInfoStr.includes('pork') || fatInfoStr.includes('свин') || fatInfoStr.includes('сало') || fatInfoStr.includes('lard');
    const isMutton = fatInfoStr.includes('mutton') || fatInfoStr.includes('баран') || fatInfoStr.includes('курдюк');
    const varietyRu = isPork
      ? 'Домашний топлёный свиной смалец'
      : isMutton
      ? 'Домашний топлёный бараний жир'
      : 'Домашний топлёный животный жир';
    const ings = buildHomemadeIngredientsList(storage, solids, fl.totalMl > 5, [
      ...solids.tallow,
      ...solids.garlic,
      ...solids.onion,
      ...solids.freshHerbs,
      ...solids.saltSolids,
    ]);
    return {
      recipeId: isPork ? 'homemade_lard_pork' : 'homemade_tallow',
      targetLiquidId: 'rendered_fat',
      culinaryEquivalentId: isPork ? 'lard_pork' : 'beef_tallow',
      varietyRu,
      preparationMethod: 'Домашнее вытапливание жира-сырца на медленном огне',
      purpose: 'Жарка картофеля и мяса, домашняя выпечка и сытная намазка',
      reasonAndOrigin: 'Вытоплено дома вручную без фабричной рафинации и отбеливания.',
      colorHex: isPork ? '#fef3c7' : '#fde68a',
      ingredients: ings,
      requiredSec: 16,
      effects: { hunger: 44, energy: 20 },
      tasteMessages: ['Ароматный домашний вытопленный жир со шкварочным духом.'],
      generatedMl: yieldMl,
      consumeSolidIndices: [...solids.tallow],
      resultComponents: [{ liquidId: 'rendered_fat', ml: fl.totalMl + yieldMl, labelRu: varietyRu, color: isPork ? '#fef3c7' : '#fde68a' }],
    };
  }

  // =========================================================================
  // 2. DRY SUGAR CARAMELIZATION -> syrup_sweet (Домашняя карамель / жжёнка)
  // =========================================================================
  if (
    !isAlreadyHomemade &&
    fl.has('sugar', 15) &&
    waterMl <= fl.mlOf('sugar') * 0.45 &&
    !hasMilk &&
    !hasSweetFruitsOrBerries &&
    !hasAnyMeat &&
    tempC >= 135
  ) {
    const ings = buildHomemadeIngredientsList(storage, solids, true);
    return {
      recipeId: 'homemade_caramel',
      targetLiquidId: 'syrup_sweet',
      culinaryEquivalentId: 'dye_caramel',
      varietyRu: 'Домашняя карамель (жжёный сахар)',
      preparationMethod: 'Домашнее плавление и карамелизация сахара на сковороде',
      purpose: 'Поливка десертов, подкрашивание кваса, выпечки и домашних соусов',
      reasonAndOrigin: 'Сварено дома из сахара без фабричной патоки и регуляторов кислотности.',
      colorHex: '#78350f',
      ingredients: ings.length > 0 ? ings : ['Сахар-песок'],
      requiredSec: 12,
      effects: { hunger: 36, energy: 34, soothePanic: 18 },
      tasteMessages: ['Тягучая янтарная домашняя карамель с лёгкой горчинкой жжёного сахара.'],
      volumeScale: 0.82,
      resultComponents: [{ liquidId: 'syrup_sweet', ml: Math.max(12, Math.round(fl.totalMl * 0.82)), labelRu: 'Домашняя карамель', color: '#78350f' }],
    };
  }

  // =========================================================================
  // 3. HOMEMADE SAUERKRAUT (Квашеная капуста — даже без добавления воды!)
  // =========================================================================
  if (
    prevHomemadeId !== 'homemade_sauerkraut' &&
    solids.cabbage.length > 0 &&
    (fl.hasSalt || solids.saltSolids.length > 0) &&
    !hasAnyMeat &&
    !hasMilk &&
    !hasOil &&
    ((tempC >= 14 && tempC <= 42) || tempC >= 70)
  ) {
    const cabbageWeightKg = solids.cabbage.reduce(
      (sum, idx) => sum + (solids.all.find((s) => s.idx === idx)?.weightKg || 0.4),
      0
    );
    const ownJuiceMl = waterMl < 30 ? Math.max(60, Math.round(cabbageWeightKg * 320)) : 0;
    const ings = buildHomemadeIngredientsList(storage, solids, fl.totalMl > 0);
    const extras = solids.all
      .filter((s) => !solids.cabbage.includes(s.idx))
      .map((s) => s.cleanName);
    const extraLabel = extras.length > 0 ? ` (${uniqueStrings(extras).slice(0, 2).join(', ')})` : '';
    const isHotQuick = tempC >= 70;
    return {
      recipeId: 'homemade_sauerkraut',
      targetLiquidId: 'pickles',
      culinaryEquivalentId: 'sauerkraut',
      varietyRu: `Домашняя квашеная капуста${extraLabel}`,
      preparationMethod: isHotQuick
        ? 'Домашнее быстрое горячее маринование капусты'
        : 'Домашнее естественное молочнокислое квашение в собственном капустном соку',
      purpose: 'Хрустящая витаминная закуска, основа для кислых щей и пирогов',
      reasonAndOrigin: 'Заквашено дома из свежей капусты и соли без фабричных консервантов и пастеризации.',
      colorHex: '#d9f99d',
      ingredients: ings,
      requiredSec: isHotQuick ? 12 : 28,
      effects: { hunger: 26, thirst: 12, health: 12, energy: 6 },
      tasteMessages: ['Хрустящая домашняя квашеная капуста с бодрящим кислым рассолом.'],
      generatedMl: ownJuiceMl,
      consumeSolidIndices: [...solids.saltSolids],
      markRemainingSolids: {
        state: 'pickled',
        stateNameRu: 'Квашеный',
        preparationMethod: 'Домашнее квашение в рассоле',
        hungerMult: 1.08,
      },
      resultComponents: [{ liquidId: 'pickles', ml: Math.max(40, fl.totalMl + ownJuiceMl), labelRu: `Домашняя квашеная капуста${extraLabel}`, color: '#d9f99d' }],
    };
  }

  // =========================================================================
  // 4. HOMEMADE BREWED COFFEE (Свежесваренный домашний кофе)
  // =========================================================================
  if (
    !isAlreadyHomemade &&
    hasWater &&
    fl.hasDryCoffee &&
    !hasAnyMeat &&
    tempC >= 72
  ) {
    const ings = buildHomemadeIngredientsList(storage, solids, true);
    const hasDairy = hasMilk || fl.has('dairy_fermented', 10);
    const varietyRu = hasDairy
      ? 'Домашний свежесваренный кофе с молоком'
      : fl.hasSpices
      ? 'Домашний пряный кофе по-домашнему'
      : 'Домашний свежесваренный кофе';
    const colorHex = hasDairy ? '#8d6e63' : '#3e2723';
    return {
      recipeId: 'homemade_coffee',
      targetLiquidId: 'coffee',
      varietyRu,
      preparationMethod: 'Домашняя варка молотого кофе в горячей воде на плите',
      purpose: 'Бодрящий горячий напиток, прогоняющий сонливость',
      reasonAndOrigin: 'Сварено дома вручную из натурального кофе и воды без кофейных ароматизаторов.',
      colorHex,
      ingredients: ings,
      requiredSec: 10,
      effects: { thirst: 26, energy: 36, sleepiness: -32, soothePanic: 12, hunger: hasDairy ? 8 : 0 },
      tasteMessages: ['Густой аромат свежесваренного домашнего кофе мгновенно бодрит.'],
      resultComponents: [{ liquidId: 'coffee', ml: fl.totalMl, labelRu: varietyRu, color: colorHex }],
    };
  }

  // =========================================================================
  // 5. HOMEMADE BREWED TEA & HERBAL INFUSIONS (Домашний чай и травяные отвары)
  // =========================================================================
  if (
    !isAlreadyHomemade &&
    hasWater &&
    !hasAnyMeat &&
    solids.savoryVeg.length === 0 &&
    solids.mushrooms.length === 0 &&
    (fl.hasDryTea || fl.hasHerbalSpice || solids.freshHerbs.length > 0 || (solids.ginger.length > 0 && (solids.citrus.length > 0 || fl.hasSweetener))) &&
    tempC >= 68
  ) {
    const herbNames = [
      ...solids.freshHerbs.map((i) => solids.all.find((s) => s.idx === i)?.cleanName || ''),
      ...solids.ginger.map((i) => solids.all.find((s) => s.idx === i)?.cleanName || ''),
      ...solids.citrus.map((i) => solids.all.find((s) => s.idx === i)?.cleanName || ''),
      ...solids.berries.map((i) => solids.all.find((s) => s.idx === i)?.cleanName || ''),
    ].filter(Boolean);
    const shortAddons = uniqueStrings(herbNames).slice(0, 3).join(', ');
    const isGreenOrHerbal =
      !fl.hasDryTea || fl.hasLabelMatching(/зел[её]н|сенча|мят|трав|чабрец|ромашк/);
    const varietyRu = fl.hasDryTea
      ? shortAddons
        ? `Домашний свежезаваренный чай (${shortAddons})`
        : 'Домашний свежезаваренный чай'
      : shortAddons
      ? `Домашний травяной чай (${shortAddons})`
      : 'Домашний травяной отвар';
    const colorHex =
      solids.berries.length > 0 || fl.hasLabelMatching(/каркаде|гибискус/)
        ? '#9f1239'
        : isGreenOrHerbal
        ? '#65a30d'
        : '#92400e';
    const ings = buildHomemadeIngredientsList(storage, solids, true);
    return {
      recipeId: 'homemade_tea',
      targetLiquidId: 'tea',
      culinaryEquivalentId: isGreenOrHerbal ? 'tea_green' : undefined,
      varietyRu,
      preparationMethod: 'Домашнее заваривание горячей водой',
      purpose: 'Согревающий и тонизирующий домашний напиток',
      reasonAndOrigin: 'Заварено дома из натуральных листьев и трав без пакетированной пыли и красителей.',
      colorHex,
      ingredients: ings,
      requiredSec: 10,
      effects: {
        thirst: 42,
        energy: 14,
        health: solids.ginger.length > 0 || solids.citrus.length > 0 || solids.berries.length > 0 ? 10 : 6,
        soothePanic: 28,
      },
      tasteMessages: ['Душистый свежезаваренный домашний чай мягко согревает и успокаивает.'],
      resultComponents: [{ liquidId: 'tea', ml: fl.totalMl, labelRu: varietyRu, color: colorHex }],
    };
  }

  // =========================================================================
  // 6. HOMEMADE CONDENSED MILK (Домашняя сгущёнка: молоко + сахар на плите)
  // =========================================================================
  if (
    !isAlreadyHomemade &&
    hasMilk &&
    (fl.has('sugar', 12) || solids.sugarSolids.length > 0) &&
    (fl.mlOf('sugar') >= milkMl * 0.12 || solids.sugarSolids.length > 0) &&
    !hasAnyMeat &&
    solids.savoryVeg.length === 0 &&
    solids.mushrooms.length === 0 &&
    tempC >= 82
  ) {
    const ings = buildHomemadeIngredientsList(storage, solids, true);
    const nextMl = Math.max(25, Math.round(fl.totalMl * 0.72));
    return {
      recipeId: 'homemade_condensed_milk',
      targetLiquidId: 'syrup_sweet',
      culinaryEquivalentId: 'condensed_milk',
      varietyRu: 'Домашнее сгущённое молоко',
      preparationMethod: 'Домашнее долгое уваривание молока с сахаром на медленном огне',
      purpose: 'Сладкая добавка к чаю, кофе, блинам, кашам и домашней выпечке',
      reasonAndOrigin: 'Сварено дома в открытой посуде без вакуум-выпарных установок, сухого молока и стабилизаторов.',
      colorHex: '#fde68a',
      ingredients: ings,
      requiredSec: 20,
      effects: { hunger: 48, energy: 34, health: 6, soothePanic: 36 },
      tasteMessages: ['Нежная кремовая домашняя сгущёнка с лёгким карамельным оттенком.'],
      volumeScale: 0.72,
      consumeSolidIndices: [...solids.sugarSolids],
      resultComponents: [{ liquidId: 'syrup_sweet', ml: nextMl, labelRu: 'Домашнее сгущённое молоко', color: '#fde68a' }],
    };
  }

  // =========================================================================
  // 7. HOMEMADE TERIYAKI SAUCE (Соевый соус + сахар/мёд [+ имбирь/чеснок])
  // =========================================================================
  if (
    !isAlreadyHomemade &&
    fl.hasSoySauce &&
    (fl.hasSweetener || solids.sugarSolids.length > 0) &&
    !hasAnyMeat &&
    tempC >= 78
  ) {
    const ings = buildHomemadeIngredientsList(storage, solids, true);
    const nextMl = Math.max(20, Math.round(fl.totalMl * 0.85));
    return {
      recipeId: 'homemade_teriyaki',
      targetLiquidId: 'sauce',
      culinaryEquivalentId: 'sauce_teriyaki',
      varietyRu: 'Домашний соус Терияки',
      preparationMethod: 'Домашнее уваривание соевого соуса с подсластителем и пряностями до глянцевой глазури',
      purpose: 'Глазирование курицы, рыбы, мяса и заправка риса с лапшой',
      reasonAndOrigin: 'Сварено дома на плите без промышленного крахмального загустителя и консервантов.',
      colorHex: '#451a03',
      ingredients: ings,
      requiredSec: 14,
      effects: { hunger: 20, energy: 14, thirst: -10, soothePanic: 10 },
      tasteMessages: ['Глянцевый кисло-сладкий домашний соус Терияки с богатым вкусом умами.'],
      volumeScale: 0.85,
      consumeSolidIndices: [...solids.sugarSolids, ...solids.ginger, ...solids.garlic],
      resultComponents: [{ liquidId: 'sauce', ml: nextMl, labelRu: 'Домашний соус Терияки', color: '#451a03' }],
    };
  }

  // =========================================================================
  // 8. HOMEMADE BRAISED STEW MEAT & OIL-CONFIT FISH (Домашняя тушёнка / рыба в масле)
  // =========================================================================
  const meatPieces = [...solids.redMeat, ...solids.poultry];
  if (
    prevHomemadeId !== 'homemade_stew_meat' &&
    meatPieces.length > 0 &&
    waterMl <= Math.max(80, solids.totalSolidMl * 0.45) &&
    (hasRenderedFat || hasOil || solids.tallow.length > 0 || fl.hasSalt || fl.hasSpices || solids.onion.length > 0 || solids.garlic.length > 0 || solids.freshHerbs.length > 0) &&
    tempC >= 88
  ) {
    const meatWeightKg = meatPieces.reduce(
      (sum, idx) => sum + (solids.all.find((s) => s.idx === idx)?.weightKg || 0.25),
      0
    );
    const stewMl = Math.max(80, Math.round(meatWeightKg * 780));
    const leadNames = uniqueStrings(
      meatPieces.map((i) => solids.all.find((s) => s.idx === i)?.cleanName || '')
    ).slice(0, 2);
    const varietyRu = leadNames.length > 0
      ? `Домашняя тушёнка (${leadNames.join(', ')})`
      : 'Домашняя мясная тушёнка';
    const ings = buildHomemadeIngredientsList(storage, solids, fl.totalMl > 0);
    const toConsume = [...meatPieces, ...solids.tallow, ...solids.onion, ...solids.garlic, ...solids.freshHerbs, ...solids.saltSolids];
    return {
      recipeId: 'homemade_stew_meat',
      targetLiquidId: 'canned_preserve',
      culinaryEquivalentId: 'stew_meat',
      varietyRu,
      preparationMethod: 'Домашнее длительное томление мяса в собственном соку с жиром и пряностями',
      purpose: 'Сытное готовое мясное блюдо для каш, макарон и походных супов',
      reasonAndOrigin: 'Приготовлено дома длительным тушением без промышленного автоклава и нитритных добавок.',
      colorHex: '#7c2d12',
      ingredients: ings,
      requiredSec: 24,
      effects: { hunger: 72, energy: 26, health: 14, soothePanic: 32 },
      tasteMessages: ['Мягкие волокна домашней тушёнки в наваристом мясном соке и жирке.'],
      generatedMl: stewMl,
      consumeSolidIndices: toConsume,
      resultComponents: [{ liquidId: 'canned_preserve', ml: Math.round(fl.totalMl * 0.8 + stewMl), labelRu: varietyRu, color: '#7c2d12' }],
    };
  }

  if (
    prevHomemadeId !== 'homemade_fish_preserve' &&
    solids.fishSeafood.length > 0 &&
    hasOil &&
    waterMl < 30 &&
    tempC >= 84
  ) {
    const fishWeightKg = solids.fishSeafood.reduce(
      (sum, idx) => sum + (solids.all.find((s) => s.idx === idx)?.weightKg || 0.25),
      0
    );
    const yieldMl = Math.max(70, Math.round(fishWeightKg * 720));
    const fishNames = uniqueStrings(
      solids.fishSeafood.map((i) => solids.all.find((s) => s.idx === i)?.cleanName || '')
    ).slice(0, 2);
    const varietyRu = fishNames.length > 0
      ? `Домашняя рыба в масле (${fishNames.join(', ')})`
      : 'Домашняя рыба томлёная в масле';
    const ings = buildHomemadeIngredientsList(storage, solids, true);
    return {
      recipeId: 'homemade_fish_preserve',
      targetLiquidId: 'canned_preserve',
      culinaryEquivalentId: 'fish_preserves',
      varietyRu,
      preparationMethod: 'Домашнее бережное томление рыбы в растительном масле со специями',
      purpose: 'Нежная рыбная закуска, основа для салатов и быстрых бутербродов',
      reasonAndOrigin: 'Приготовлено дома без промышленной автоклавной стерилизации.',
      colorHex: '#b45309',
      ingredients: ings,
      requiredSec: 20,
      effects: { hunger: 62, energy: 20, health: 14, soothePanic: 28 },
      tasteMessages: ['Нежные кусочки домашней рыбы, томлённой в ароматном масле.'],
      generatedMl: yieldMl,
      consumeSolidIndices: [...solids.fishSeafood, ...solids.onion, ...solids.garlic, ...solids.freshHerbs, ...solids.saltSolids],
      resultComponents: [{ liquidId: 'canned_preserve', ml: Math.round(fl.totalMl * 0.85 + yieldMl), labelRu: varietyRu, color: '#b45309' }],
    };
  }

  // =========================================================================
  // 9. HOMEMADE JAM (Домашнее варенье: ягоды/фрукты + сахар/мёд при кипении)
  // =========================================================================
  const jamSolids = [...solids.berries, ...solids.sweetFruits, ...solids.citrus];
  if (
    prevHomemadeId !== 'homemade_jam' &&
    jamSolids.length > 0 &&
    (fl.hasSweetener || solids.sugarSolids.length > 0) &&
    !hasAnyMeat &&
    solids.savoryVeg.length === 0 &&
    solids.mushrooms.length === 0 &&
    waterMl <= Math.max(120, solids.totalSolidMl * 1.5) &&
    tempC >= 86
  ) {
    const jamProf = getFruitJamProfile(solids);
    const fruitWeightKg = jamSolids.reduce(
      (sum, idx) => sum + (solids.all.find((s) => s.idx === idx)?.weightKg || 0.12),
      0
    );
    const generatedMl = Math.max(45, Math.round(fruitWeightKg * 760));
    const finalMl = Math.round(fl.totalMl * 0.78 + generatedMl);
    const ings = buildHomemadeIngredientsList(storage, solids, fl.totalMl > 0);
    return {
      recipeId: 'homemade_jam',
      targetLiquidId: 'jam',
      culinaryEquivalentId: jamProf.culinaryEquivalentId,
      varietyRu: jamProf.labelRu,
      preparationMethod: 'Домашняя варка ягод и фруктов с сахаром в собственном соку на плите',
      purpose: 'Сладкое лакомство к чаю, начинка для пирогов и блинов, поддержка при простуде',
      reasonAndOrigin: 'Сварено дома без промышленных консервантов, ароматизаторов и искусственных загустителей.',
      colorHex: jamProf.colorHex,
      ingredients: ings,
      requiredSec: 16,
      effects: { hunger: 42, energy: 32, health: 14, soothePanic: 34 },
      tasteMessages: ['Душистое густое домашнее варенье со вкусом настоящих ягод.'],
      volumeScale: 0.78,
      generatedMl,
      consumeSolidIndices: [...jamSolids, ...solids.sugarSolids],
      resultComponents: [{ liquidId: 'jam', ml: finalMl, labelRu: jamProf.labelRu, color: jamProf.colorHex }],
    };
  }

  // =========================================================================
  // 10. HOMEMADE VEGETABLE CAVIAR (Домашняя кабачковая / баклажанная икра)
  // =========================================================================
  const hasCaviarBase = solids.zucchini.length > 0 || solids.eggplants.length > 0;
  if (
    prevHomemadeId !== 'homemade_caviar' &&
    hasCaviarBase &&
    !hasAnyMeat &&
    waterMl <= Math.max(120, solids.totalSolidMl * 1.2) &&
    tempC >= 84
  ) {
    const isEggplant = solids.eggplants.length >= solids.zucchini.length && solids.eggplants.length > 0;
    const varietyRu = isEggplant ? 'Домашняя баклажанная икра' : 'Домашняя кабачковая икра';
    const colorHex = isEggplant ? '#7c2d12' : '#d97706';
    const vegWeightKg = solids.all.reduce((sum, s) => sum + s.weightKg, 0);
    const generatedMl = Math.max(70, Math.round(vegWeightKg * 720));
    const finalMl = Math.round(fl.totalMl * 0.75 + generatedMl);
    const ings = buildHomemadeIngredientsList(storage, solids, fl.totalMl > 0);
    return {
      recipeId: 'homemade_caviar',
      targetLiquidId: 'caviar',
      culinaryEquivalentId: isEggplant ? 'caviar_eggplant' : 'caviar_squash',
      varietyRu,
      preparationMethod: 'Домашнее тушение и уваривание овощей в кастрюле до мягкой икорной массы',
      purpose: 'Сытная домашняя овощная закуска для хлеба и гарнир к горячему',
      reasonAndOrigin: 'Приготовлено дома из свежих овощей без промышленного протирочного цеха и стабилизаторов.',
      colorHex,
      ingredients: ings,
      requiredSec: 18,
      effects: { hunger: 46, energy: 20, health: 14, soothePanic: 28 },
      tasteMessages: ['Нежная пряная домашняя овощная икра с насыщенным вкусом тушёных овощей.'],
      volumeScale: 0.75,
      generatedMl,
      consumeSolidIndices: solids.all.map((s) => s.idx),
      resultComponents: [{ liquidId: 'caviar', ml: finalMl, labelRu: varietyRu, color: colorHex }],
    };
  }

  // =========================================================================
  // 11. HOMEMADE TOMATO / CHILI / POMEGRANATE SAUCES & TOMATO PASTE
  // =========================================================================
  if (
    prevHomemadeId !== 'homemade_pomegranate_sauce' &&
    solids.pomegranates.length > 0 &&
    !hasAnyMeat &&
    waterMl <= Math.max(100, solids.totalSolidMl * 1.2) &&
    tempC >= 84
  ) {
    const pomWeightKg = solids.pomegranates.reduce(
      (sum, idx) => sum + (solids.all.find((s) => s.idx === idx)?.weightKg || 0.25),
      0
    );
    const generatedMl = Math.max(40, Math.round(pomWeightKg * 420));
    const finalMl = Math.round(fl.totalMl * 0.65 + generatedMl);
    const ings = buildHomemadeIngredientsList(storage, solids, fl.totalMl > 0);
    return {
      recipeId: 'homemade_pomegranate_sauce',
      targetLiquidId: 'sauce',
      culinaryEquivalentId: 'sauce_narsharab',
      varietyRu: 'Домашний гранатовый соус (Наршараб)',
      preparationMethod: 'Домашнее выпаривание гранатового сока на медленном огне до густоты',
      purpose: 'Кисло-сладкий соус к мясу на углях, рыбе и овощам',
      reasonAndOrigin: 'Уварено дома из свежих зёрен граната без фабричного сиропа и красителей.',
      colorHex: '#7f1d1d',
      ingredients: ings,
      requiredSec: 18,
      effects: { hunger: 18, thirst: 4, energy: 14, health: 8 },
      tasteMessages: ['Терпкий рубиновый домашний гранатовый соус с яркой кислинкой.'],
      volumeScale: 0.65,
      generatedMl,
      consumeSolidIndices: solids.all.map((s) => s.idx),
      resultComponents: [{ liquidId: 'sauce', ml: finalMl, labelRu: 'Домашний соус Наршараб', color: '#7f1d1d' }],
    };
  }

  if (
    prevHomemadeId !== 'homemade_tomato_sauce' &&
    prevHomemadeId !== 'homemade_tomato_paste' &&
    prevHomemadeId !== 'homemade_chili_sauce' &&
    (solids.tomatoes.length > 0 || solids.chiliPeppers.length > 0) &&
    !hasAnyMeat &&
    !hasCaviarBase &&
    waterMl <= Math.max(100, solids.totalSolidMl * 1.2) &&
    tempC >= 82
  ) {
    const isChiliDominant = solids.chiliPeppers.length > 0 && solids.chiliPeppers.length >= solids.tomatoes.length;
    const hasSauceSeasoning =
      fl.hasSpices ||
      fl.hasAcidOrVinegar ||
      fl.hasSweetener ||
      solids.garlic.length > 0 ||
      solids.onion.length > 0 ||
      solids.freshHerbs.length > 0 ||
      solids.chiliPeppers.length > 0;

    const solidWeightKg = solids.all.reduce((sum, s) => sum + s.weightKg, 0);
    const ings = buildHomemadeIngredientsList(storage, solids, fl.totalMl > 0);

    if (isChiliDominant) {
      const generatedMl = Math.max(35, Math.round(solidWeightKg * 620));
      const finalMl = Math.round(fl.totalMl * 0.78 + generatedMl);
      return {
        recipeId: 'homemade_chili_sauce',
        targetLiquidId: 'sauce',
        culinaryEquivalentId: 'sauce_sriracha',
        varietyRu: 'Домашний острый соус чили',
        preparationMethod: 'Домашнее уваривание жгучего перца чили со специями и чесноком',
        purpose: 'Острая пряная заправка для мяса, супов, лапши и закусок',
        reasonAndOrigin: 'Сварено дома из свежего перца без промышленных стабилизаторов и экстрактов.',
        colorHex: '#b91c1c',
        ingredients: ings,
        requiredSec: 16,
        effects: { hunger: 16, energy: 24, sleepiness: -18, soothePanic: 14 },
        tasteMessages: ['Огненный ароматный домашний соус чили мгновенно согревает.'],
        volumeScale: 0.78,
        generatedMl,
        consumeSolidIndices: solids.all.map((s) => s.idx),
        resultComponents: [{ liquidId: 'sauce', ml: finalMl, labelRu: 'Домашний острый соус чили', color: '#b91c1c' }],
      };
    }

    if (hasSauceSeasoning) {
      const generatedMl = Math.max(55, Math.round(solidWeightKg * 680));
      const finalMl = Math.round(fl.totalMl * 0.78 + generatedMl);
      return {
        recipeId: 'homemade_tomato_sauce',
        targetLiquidId: 'sauce',
        culinaryEquivalentId: 'sauce_ketchup',
        varietyRu: 'Домашний томатный соус (кетчуп)',
        preparationMethod: 'Домашнее уваривание спелых томатов с пряностями на медленном огне',
        purpose: 'Подача к мясу, картофелю, макаронам, пельменям и горячим блюдам',
        reasonAndOrigin: 'Сварено дома из свежих томатов без фабричного модифицированного крахмала и консервантов.',
        colorHex: '#dc2626',
        ingredients: ings,
        requiredSec: 16,
        effects: { hunger: 22, thirst: 6, health: 6, soothePanic: 14 },
        tasteMessages: ['Насыщенный ароматный домашний томатный соус со вкусом спелых помидоров.'],
        volumeScale: 0.78,
        generatedMl,
        consumeSolidIndices: solids.all.map((s) => s.idx),
        resultComponents: [{ liquidId: 'sauce', ml: finalMl, labelRu: 'Домашний томатный соус', color: '#dc2626' }],
      };
    }

    // Pure tomatoes (+ optional salt/oil) -> Homemade boiled-down tomato paste!
    const generatedMl = Math.max(40, Math.round(solidWeightKg * 500));
    const finalMl = Math.round(fl.totalMl * 0.65 + generatedMl);
    return {
      recipeId: 'homemade_tomato_paste',
      targetLiquidId: 'puree',
      culinaryEquivalentId: 'tomato_paste',
      varietyRu: 'Домашняя уваренная томатная паста',
      preparationMethod: 'Домашнее долгое выпаривание свежей томатной мякоти на плите',
      purpose: 'Основа для борща, подлив, тушёных блюд и домашних соусов',
      reasonAndOrigin: 'Уварено дома из свежих томатов без вакуумных котлов и химических консервантов.',
      colorHex: '#991b1b',
      ingredients: ings,
      requiredSec: 18,
      effects: { hunger: 24, thirst: 4, health: 6 },
      tasteMessages: ['Густая концентрированная домашняя томатная паста с ярким вкусом помидоров.'],
      volumeScale: 0.65,
      generatedMl,
      consumeSolidIndices: solids.all.map((s) => s.idx),
      resultComponents: [{ liquidId: 'puree', ml: finalMl, labelRu: 'Домашняя томатная паста', color: '#991b1b' }],
    };
  }

  // =========================================================================
  // 12. HOMEMADE FRUIT & VEGETABLE PUREE (Домашнее фруктовое / овощное пюре)
  // =========================================================================
  const pureeFruitIndices = [...solids.sweetFruits, ...solids.berries];
  const pureeVegIndices = [...solids.pureeVeg];
  const canFruitPuree =
    pureeFruitIndices.length > 0 &&
    !fl.hasSweetener &&
    solids.sugarSolids.length === 0 &&
    !hasAnyMeat &&
    solids.savoryVeg.length === 0 &&
    fl.totalMl <= Math.max(90, solids.totalSolidMl * 1.0);
  const canVegPuree =
    pureeVegIndices.length > 0 &&
    !hasAnyMeat &&
    !hasCaviarBase &&
    !fl.hasAcidOrVinegar &&
    (fl.totalMl <= Math.max(100, solids.totalSolidMl * 1.1) || hasMilk || hasRenderedFat);

  if (
    prevHomemadeId !== 'homemade_puree' &&
    (canFruitPuree || canVegPuree) &&
    tempC >= 84
  ) {
    const targetIndices = canFruitPuree ? pureeFruitIndices : pureeVegIndices;
    const leadNames = uniqueStrings(
      targetIndices.map((i) => solids.all.find((s) => s.idx === i)?.cleanName || '')
    ).slice(0, 2);
    const isPotato = leadNames.some((n) => n.toLowerCase().includes('картоф'));
    const isApple = leadNames.some((n) => n.toLowerCase().includes('яблок'));
    const isPumpkin = leadNames.some((n) => n.toLowerCase().includes('тыкв'));
    const varietyRu = isPotato
      ? 'Домашнее картофельное пюре'
      : isApple
      ? 'Домашнее яблочное пюре'
      : isPumpkin
      ? 'Домашнее тыквенное пюре'
      : `Домашнее пюре (${leadNames.join(', ')})`;
    const colorHex = isPotato
      ? '#fef08a'
      : isPumpkin
      ? '#ea580c'
      : pickFruitColor(solids, targetIndices, canFruitPuree ? '#eab308' : '#f59e0b');
    const solidWeightKg = solids.all.reduce((sum, s) => sum + s.weightKg, 0);
    const generatedMl = Math.max(55, Math.round(solidWeightKg * 780));
    const finalMl = Math.round(fl.totalMl * 0.8 + generatedMl);
    const ings = buildHomemadeIngredientsList(storage, solids, fl.totalMl > 0);
    return {
      recipeId: 'homemade_puree',
      targetLiquidId: 'puree',
      varietyRu,
      preparationMethod: 'Домашнее разваривание и разминание мягких плодов без добавок',
      purpose: canFruitPuree
        ? 'Нежный витаминный десерт, начинка для выпечки и детского питания'
        : 'Сытный домашний гарнир и основа для крем-супов',
      reasonAndOrigin: 'Приготовлено дома из цельных продуктов без фабричных аскорбатов и крахмала.',
      colorHex,
      ingredients: ings,
      requiredSec: 16,
      effects: { hunger: 38, thirst: 12, health: 10, energy: 14, soothePanic: 16 },
      tasteMessages: [`Нежное тёплое ${varietyRu.toLowerCase()} с натуральным вкусом.`],
      volumeScale: 0.8,
      generatedMl,
      consumeSolidIndices: solids.all.map((s) => s.idx),
      resultComponents: [{ liquidId: 'puree', ml: finalMl, labelRu: varietyRu, color: colorHex }],
    };
  }

  // =========================================================================
  // 13. HOMEMADE PICKLES, BRINED MUSHROOMS & OIL MARINADES (Соленья и маринады)
  // =========================================================================
  const hasPicklableSolids = solids.picklableVeg.length > 0 || solids.mushrooms.length > 0;
  const isBrineOrMarinade =
    hasWater && (fl.hasSalt || fl.hasAcidOrVinegar) && !hasAnyMeat && !hasMilk;
  const isOilMarinade =
    hasOil && !hasWater && !hasAnyMeat && (solids.tomatoes.length > 0 || solids.mushrooms.length > 0 || solids.garlic.length > 0) && (solids.freshHerbs.length > 0 || fl.hasSpices || fl.hasSalt);

  if (
    prevHomemadeId !== 'homemade_pickles' &&
    hasPicklableSolids &&
    ((isBrineOrMarinade && ((tempC >= 12 && tempC <= 48) || tempC >= 72)) ||
      (isOilMarinade && tempC >= 15 && tempC <= 95))
  ) {
    const isMushroom = solids.mushrooms.length > 0;
    const isVinegarMarinade = fl.hasAcidOrVinegar;
    const itemNames = uniqueStrings(
      [...solids.mushrooms, ...solids.picklableVeg]
        .map((i) => solids.all.find((s) => s.idx === i)?.cleanName || '')
    ).slice(0, 3);
    const shortList = itemNames.join(', ');
    const varietyRu = isOilMarinade
      ? `Домашние пряные ${shortList} в масле`
      : isMushroom
      ? isVinegarMarinade
        ? `Домашние маринованные грибы (${shortList})`
        : `Домашние солёные грибы (${shortList})`
      : isVinegarMarinade
      ? `Домашние маринады (${shortList})`
      : `Домашние соленья (${shortList})`;
    const colorHex = isOilMarinade
      ? '#ca8a04'
      : isMushroom
      ? '#92400e'
      : isVinegarMarinade
      ? '#bef264'
      : '#a3e635';
    const ings = buildHomemadeIngredientsList(storage, solids, true);
    const isHot = tempC >= 72;
    return {
      recipeId: 'homemade_pickles',
      targetLiquidId: 'pickles',
      culinaryEquivalentId: isMushroom ? 'pickles_salted_mushrooms' : 'pickles',
      varietyRu,
      preparationMethod: isOilMarinade
        ? 'Домашнее настаивание в пряном растительном масле'
        : isHot
        ? 'Домашняя заливка горячим рассолом / маринадом'
        : 'Домашний холодный посол и естественное просаливание в банке',
      purpose: 'Хрустящая домашняя закуска и пикантный рассол для супов',
      reasonAndOrigin: 'Засолено дома вручную без промышленного уксусного ангидрида и бензоата натрия.',
      colorHex,
      ingredients: ings,
      requiredSec: isHot ? 12 : 28,
      effects: { hunger: 26, thirst: 14, health: 10, soothePanic: 22 },
      tasteMessages: ['Хрустящие ароматные домашние соленья в насыщенном пряном рассоле.'],
      consumeSolidIndices: [...solids.saltSolids],
      markRemainingSolids: {
        state: 'pickled',
        stateNameRu: isOilMarinade ? 'В пряном масле' : isVinegarMarinade ? 'Маринованный' : 'Солёный',
        preparationMethod: isOilMarinade ? 'Настаивание в пряном масле' : 'Домашний посол / маринование',
        hungerMult: 1.08,
      },
      resultComponents: [{ liquidId: 'pickles', ml: fl.totalMl, labelRu: varietyRu, color: colorHex }],
    };
  }

  // =========================================================================
  // 14. HOMEMADE COMPOTE & BERRY MORS -> juice (Домашний компот / морс)
  // =========================================================================
  const compoteSolids = [...solids.berries, ...solids.sweetFruits, ...solids.citrus];
  if (
    prevHomemadeId !== 'homemade_compote' &&
    hasWater &&
    compoteSolids.length > 0 &&
    !hasAnyMeat &&
    solids.savoryVeg.length === 0 &&
    solids.mushrooms.length === 0 &&
    (!fl.hasSweetener || waterMl > solids.totalSolidMl * 1.5) &&
    tempC >= 80
  ) {
    const isBerryMors = solids.berries.length >= solids.sweetFruits.length && solids.berries.length > 0;
    const fruitNames = uniqueStrings(
      compoteSolids.map((i) => solids.all.find((s) => s.idx === i)?.cleanName || '')
    ).slice(0, 3);
    const varietyRu = isBerryMors
      ? `Домашний ягодный морс (${fruitNames.join(', ')})`
      : `Домашний фруктовый компот (${fruitNames.join(', ')})`;
    const colorHex = pickFruitColor(solids, compoteSolids, isBerryMors ? '#be123c' : '#d97706');
    const ings = buildHomemadeIngredientsList(storage, solids, true);
    return {
      recipeId: 'homemade_compote',
      targetLiquidId: 'juice',
      varietyRu,
      preparationMethod: 'Домашняя варка свежих ягод и фруктов в воде на плите',
      purpose: 'Освежающий витаминный домашний напиток',
      reasonAndOrigin: 'Сварено дома из свежих плодов без восстановленного концентрата и лимонной кислоты из пакета.',
      colorHex,
      ingredients: ings,
      requiredSec: 13,
      effects: { thirst: 48, hunger: 12, health: 12, energy: 14, soothePanic: 22 },
      tasteMessages: ['Душистый насыщенный домашний компот со вкусом настоящих плодов.'],
      consumeSolidIndices: [...solids.sugarSolids],
      resultComponents: [{ liquidId: 'juice', ml: fl.totalMl, labelRu: varietyRu, color: colorHex }],
    };
  }

  // =========================================================================
  // 15. HOMEMADE BROTHS -> broth (Говяжий / Куриный / Рыбный / Грибной / Овощной)
  // =========================================================================
  const hasBrothSolids =
    hasAnyMeat || solids.mushrooms.length > 0 || solids.savoryVeg.length > 0;
  if (
    prevHomemadeId !== 'homemade_broth' &&
    hasWater &&
    hasBrothSolids &&
    !hasMilk &&
    tempC >= 80
  ) {
    let eqId = 'broth_vegetable';
    let kindRu = 'Домашний овощной бульон';
    let colorHex = '#ca8a04';
    let effects: NonNullable<FluidSubstanceAttributes['customEffects']> = {
      hunger: 36,
      thirst: 44,
      energy: 16,
      health: 12,
      soothePanic: 28,
    };

    if (solids.poultry.length > 0 && solids.redMeat.length === 0) {
      eqId = 'broth_chicken';
      kindRu = 'Домашний куриный бульон';
      colorHex = '#d97706';
      effects = { hunger: 52, thirst: 40, energy: 22, health: 18, soothePanic: 38 };
    } else if (solids.fishSeafood.length > 0 && solids.redMeat.length === 0 && solids.poultry.length === 0) {
      eqId = 'broth_fish';
      kindRu = 'Домашняя уха (рыбный бульон)';
      colorHex = '#b45309';
      effects = { hunger: 50, thirst: 36, energy: 18, health: 16, soothePanic: 34 };
    } else if (solids.redMeat.length > 0 || solids.bones.length > 0) {
      eqId = 'broth_beef';
      kindRu = solids.bones.length > 0 ? 'Домашний костный мясной бульон' : 'Домашний мясной бульон';
      colorHex = '#92400e';
      effects = { hunger: 58, thirst: 36, energy: 24, health: 18, soothePanic: 42 };
    } else if (solids.mushrooms.length > 0) {
      eqId = 'broth_mushroom';
      kindRu = 'Домашний грибной бульон';
      colorHex = '#5c3a21';
      effects = { hunger: 48, thirst: 34, energy: 18, health: 14, soothePanic: 36 };
    }

    const shortSolidNames = uniqueStrings(solids.all.map((s) => s.cleanName)).slice(0, 3);
    const varietyRu = shortSolidNames.length > 0
      ? `${kindRu} (${shortSolidNames.join(', ')})`
      : kindRu;
    const ings = buildHomemadeIngredientsList(storage, solids, true);

    return {
      recipeId: 'homemade_broth',
      targetLiquidId: 'broth',
      culinaryEquivalentId: eqId,
      varietyRu,
      preparationMethod: 'Домашняя медленная варка и вываривание на плите',
      purpose: 'Сытное горячее первое блюдо и натуральная основа для супов и каш',
      reasonAndOrigin: 'Сварено дома из свежих продуктов без бульонных кубиков, глутамата натрия и пальмового жира.',
      colorHex,
      ingredients: ings,
      requiredSec: 15,
      effects,
      tasteMessages: [`Наваристый ароматный ${kindRu.toLowerCase()} согревает изнутри.`],
      consumeSolidIndices: [...solids.saltSolids],
      resultComponents: [{ liquidId: 'broth', ml: fl.totalMl, labelRu: varietyRu, color: colorHex }],
    };
  }

  // =========================================================================
  // 16. HOMEMADE SUGAR / SPICE SYRUP -> syrup_sweet
  // =========================================================================
  if (
    !isAlreadyHomemade &&
    hasWater &&
    fl.hasSweetener &&
    fl.sweetenerMl >= waterMl * 0.18 &&
    !hasMilk &&
    !hasAnyMeat &&
    solids.all.length === 0 &&
    tempC >= 84
  ) {
    const varietyRu = fl.hasSpices
      ? 'Домашний пряный сахарный сироп'
      : 'Домашний сахарный сироп';
    const nextMl = Math.max(25, Math.round(fl.totalMl * 0.85));
    const ings = buildHomemadeIngredientsList(storage, solids, true);
    return {
      recipeId: 'homemade_sugar_syrup',
      targetLiquidId: 'syrup_sweet',
      varietyRu,
      preparationMethod: 'Домашнее уваривание воды с сахаром на плите',
      purpose: 'Пропитка выпечки, основа для домашних лимонадов, фруктов в сиропе и десертов',
      reasonAndOrigin: 'Сварено дома на плите без промышленного глюкозно-фруктозного сиропа.',
      colorHex: '#eab308',
      ingredients: ings,
      requiredSec: 14,
      effects: { hunger: 34, energy: 30, soothePanic: 20 },
      tasteMessages: ['Прозрачный сладкий домашний сироп тянется тонкой янтарной нитью.'],
      volumeScale: 0.85,
      resultComponents: [{ liquidId: 'syrup_sweet', ml: nextMl, labelRu: varietyRu, color: '#eab308' }],
    };
  }

  // =========================================================================
  // 17. HOMEMADE FRUITS IN SYRUP -> canned_preserve
  // =========================================================================
  if (
    prevHomemadeId !== 'homemade_fruits_in_syrup' &&
    currentLiq === 'syrup_sweet' &&
    storage.attributes?.culinaryEquivalentId !== 'condensed_milk' &&
    compoteSolids.length > 0 &&
    !hasAnyMeat &&
    tempC >= 84
  ) {
    const names = uniqueStrings(
      compoteSolids.map((i) => solids.all.find((s) => s.idx === i)?.cleanName || '')
    ).slice(0, 2);
    const varietyRu = `Домашние плоды в сиропе (${names.join(', ')})`;
    const colorHex = pickFruitColor(solids, compoteSolids, '#f59e0b');
    const ings = buildHomemadeIngredientsList(storage, solids, true);
    return {
      recipeId: 'homemade_fruits_in_syrup',
      targetLiquidId: 'canned_preserve',
      varietyRu,
      preparationMethod: 'Домашнее томление долек плодов в горячем сахарном сиропе',
      purpose: 'Сладкий домашний десерт и заготовка на зиму',
      reasonAndOrigin: 'Приготовлено дома без фабричного автоклавирования и диоксида серы.',
      colorHex,
      ingredients: ings,
      requiredSec: 15,
      effects: { hunger: 44, thirst: 16, energy: 28, health: 10, soothePanic: 30 },
      tasteMessages: ['Сочные пропитанные сиропом домашние плоды тают во рту.'],
      resultComponents: [{ liquidId: 'canned_preserve', ml: fl.totalMl, labelRu: varietyRu, color: colorHex }],
    };
  }

  // =========================================================================
  // 18. HOMEMADE BREAD KVASS -> kvas (Хлеб + вода + сахар/мёд при комнатной/тёплой темп.)
  // =========================================================================
  if (
    prevHomemadeId !== 'homemade_kvas' &&
    hasWater &&
    solids.bread.length > 0 &&
    (fl.hasSweetener || solids.sugarSolids.length > 0 || fl.hasStarterDairy) &&
    !hasAnyMeat &&
    !hasMilk &&
    tempC >= 16 &&
    tempC <= 42
  ) {
    const ings = buildHomemadeIngredientsList(storage, solids, true);
    return {
      recipeId: 'homemade_kvas',
      targetLiquidId: 'kvas',
      varietyRu: 'Домашний хлебный квас',
      preparationMethod: 'Домашнее настаивание и естественное брожение хлебного сусла в тепле',
      purpose: 'Бодрящий прохладительный напиток и основа для летней окрошки',
      reasonAndOrigin: 'Сброжено дома на хлебе и воде без фабричного квасного концентрата и газирования из баллона.',
      colorHex: '#78350f',
      ingredients: ings,
      requiredSec: 32,
      effects: { thirst: 52, hunger: 14, energy: 14, health: 8, soothePanic: 24 },
      tasteMessages: ['Ядрёный душистый домашний хлебный квас с мягкой естественной кислинкой.'],
      consumeSolidIndices: [...solids.bread, ...solids.sugarSolids],
      resultComponents: [{ liquidId: 'kvas', ml: fl.totalMl, labelRu: 'Домашний хлебный квас', color: '#78350f' }],
    };
  }

  // =========================================================================
  // 19. HOMEMADE SOUR MILK (Простокваша), COTTAGE CHEESE (Творог) & SOURDOUGH STARTER
  // =========================================================================
  // 19A. Homemade Cottage Cheese (heating soured milk / kefir gently 58..82°C)
  if (
    prevHomemadeId !== 'homemade_cottage_cheese' &&
    currentLiq === 'dairy_fermented' &&
    storage.attributes?.culinaryEquivalentId !== 'cottage_cheese' &&
    storage.attributes?.culinaryEquivalentId !== 'yeast_liquid' &&
    storage.attributes?.culinaryEquivalentId !== 'cream_heavy' &&
    !hasAnyMeat &&
    tempC >= 58 &&
    tempC <= 84
  ) {
    const ings = buildHomemadeIngredientsList(storage, solids, true);
    const nextMl = Math.max(25, Math.round(fl.totalMl * 0.68));
    return {
      recipeId: 'homemade_cottage_cheese',
      targetLiquidId: 'dairy_fermented',
      culinaryEquivalentId: 'cottage_cheese',
      varietyRu: 'Домашний отварной творог',
      preparationMethod: 'Домашнее бережное створаживание простокваши нагревом с отделением сыворотки',
      purpose: 'Белковый завтрак, основа для сырников, запеканок и вареников',
      reasonAndOrigin: 'Приготовлено дома без хлористого кальция, ферментных ускорителей и растительных жиров.',
      colorHex: '#fffbeb',
      ingredients: ings,
      requiredSec: 18,
      effects: { hunger: 38, energy: 18, health: 12, soothePanic: 20 },
      tasteMessages: ['Нежный рассыпчатый домашний творог со сливочной кислинкой.'],
      volumeScale: 0.68,
      resultComponents: [{ liquidId: 'dairy_fermented', ml: nextMl, labelRu: 'Домашний творог', color: '#fffbeb' }],
    };
  }

  // 19B. Homemade Prostokvasha / Soured Milk (milk + starter/acid/lemon/bread crust at 20..44°C)
  if (
    prevHomemadeId !== 'homemade_prostokvasha' &&
    hasMilk &&
    !hasAnyMeat &&
    (fl.hasStarterDairy || fl.hasAcidOrVinegar || solids.citrus.length > 0 || solids.bread.length > 0) &&
    tempC >= 20 &&
    tempC <= 44
  ) {
    const ings = buildHomemadeIngredientsList(storage, solids, true);
    return {
      recipeId: 'homemade_prostokvasha',
      targetLiquidId: 'dairy_fermented',
      culinaryEquivalentId: 'kefir',
      varietyRu: 'Домашняя простокваша',
      preparationMethod: 'Домашнее тёплое сквашивание молока',
      purpose: 'Освежающий кисломолочный напиток, основа для оладий и домашнего творога',
      reasonAndOrigin: 'Сквашено дома без промышленных термостатных линий и загустителей.',
      colorHex: '#fefce8',
      ingredients: ings,
      requiredSec: 28,
      effects: { thirst: 36, hunger: 22, health: 12, soothePanic: 22 },
      tasteMessages: ['Нежная густая домашняя простокваша с приятной кислинкой.'],
      resultComponents: [{ liquidId: 'dairy_fermented', ml: fl.totalMl, labelRu: 'Домашняя простокваша', color: '#fefce8' }],
    };
  }

  // 19C. Homemade Live Sourdough Yeast Starter (flour + water at 18..36°C)
  if (
    prevHomemadeId !== 'homemade_sourdough' &&
    hasWater &&
    fl.has('flour', 15) &&
    !hasAnyMeat &&
    !hasMilk &&
    tempC >= 18 &&
    tempC <= 36
  ) {
    const ings = buildHomemadeIngredientsList(storage, solids, true);
    return {
      recipeId: 'homemade_sourdough',
      targetLiquidId: 'dairy_fermented',
      culinaryEquivalentId: 'yeast_liquid',
      varietyRu: 'Домашняя живая хлебная закваска',
      preparationMethod: 'Домашнее спонтанное сбраживание муки и воды в тепле',
      purpose: 'Выпечка домашнего хлеба, оладий и постановка кваса',
      reasonAndOrigin: 'Выведено дома на диких дрожжах из муки и воды без прессованных фабричных дрожжей.',
      colorHex: '#f5f5dc',
      ingredients: ings,
      requiredSec: 34,
      effects: { hunger: 16, thirst: 4 },
      tasteMessages: ['Пузырящаяся ароматная домашняя закваска с кисловатым хлебным духом.'],
      resultComponents: [{ liquidId: 'dairy_fermented', ml: fl.totalMl, labelRu: 'Домашняя хлебная закваска', color: '#f5f5dc' }],
    };
  }

  // =========================================================================
  // 20. HOMEMADE APPLE / FRUIT / WINE VINEGAR -> vinegar
  // =========================================================================
  const isOpen = Boolean(container.isOpen || !container.containerVisuals);
  if (
    prevHomemadeId !== 'homemade_vinegar' &&
    isOpen &&
    !isDry &&
    (currentLiq === 'juice' || currentLiq === 'wine') &&
    (fl.has('vinegar', 5) || fl.hasSweetener || fl.hasStarterDairy) &&
    tempC >= 18 &&
    tempC <= 36
  ) {
    const isWine = currentLiq === 'wine';
    const varietyRu = isWine ? 'Домашний винный уксус' : 'Домашний яблочно-фруктовый уксус';
    const ings = buildHomemadeIngredientsList(storage, solids, true);
    return {
      recipeId: 'homemade_vinegar',
      targetLiquidId: 'vinegar',
      culinaryEquivalentId: isWine ? 'vinegar_wine' : 'vinegar_apple',
      varietyRu,
      preparationMethod: 'Домашнее открытое уксуснокислое брожение в тепле',
      purpose: 'Домашние маринады, заправка салатов и соусов',
      reasonAndOrigin: 'Сброжено дома естественным путём без промышленной синтетической уксусной эссенции.',
      colorHex: isWine ? '#881337' : '#d97706',
      ingredients: ings,
      requiredSec: 40,
      effects: { thirst: -15, hunger: 4 },
      tasteMessages: ['Резкий ароматный домашний натуральный уксус с мягкой фруктовой ноткой.'],
      resultComponents: [{ liquidId: 'vinegar', ml: fl.totalMl, labelRu: varietyRu, color: isWine ? '#881337' : '#d97706' }],
    };
  }

  return null;
}

/**
 * Advances continuous homemade liquid cooking / steeping / rendering / fermentation on a container.
 * Returns true if container state changed (progress advanced or transformation completed).
 */
export function tickHomemadeLiquidTransformations(
  container: InventoryItem | null | undefined,
  dtSeconds: number
): boolean {
  if (!container || !container.fluidStorage || dtSeconds <= 0) return false;
  const storage = container.fluidStorage;

  const match = evaluateHomemadeLiquidRecipe(container);
  if (!match) {
    if (storage.homemadeProgress && storage.homemadeProgress > 0 && !storage.attributes?.isHomemade) {
      // Gently decay incomplete progress only if vessel cooled down / ingredients removed
      storage.homemadeProgress = Math.max(0, Number((storage.homemadeProgress - 0.015 * dtSeconds).toFixed(3)));
      return true;
    }
    return false;
  }

  // If this exact homemade recipe already completed on this vessel, don't loop infinitely
  if (storage.homemadeRecipeId === match.recipeId && storage.attributes?.isHomemade) {
    return false;
  }

  // Reset progress if player changed ingredients to a different recipe
  if (storage.homemadeRecipeId && storage.homemadeRecipeId !== match.recipeId && !storage.attributes?.isHomemade) {
    storage.homemadeProgress = 0;
  }

  const prevProgress = storage.homemadeProgress || 0;
  const step = Math.min(1.0, dtSeconds / Math.max(4, match.requiredSec));
  const nextProgress = Math.min(1.0, Number((prevProgress + step).toFixed(3)));

  storage.homemadeRecipeId = match.recipeId;
  storage.homemadeProgress = nextProgress;

  if (nextProgress < 1.0) {
    return nextProgress !== prevProgress;
  }

  // === COMPLETE HOMEMADE TRANSFORMATION ===
  const prevMl = Math.max(0, storage.currentMl || 0);
  const scaledMl = match.volumeScale !== undefined ? prevMl * match.volumeScale : prevMl;
  const generatedMl = match.generatedMl || 0;
  const finalMl = Math.min(
    storage.maxMl || 1000,
    Math.max(10, Math.round(scaledMl + generatedMl))
  );

  // Consume dissolved/rendered/mashed solid items from container.contents
  if (container.contents && match.consumeSolidIndices && match.consumeSolidIndices.length > 0) {
    const toRemove = new Set(match.consumeSolidIndices);
    container.contents = container.contents.filter((_, idx) => !toRemove.has(idx));
  }

  // Mark remaining solids (e.g. pickled cucumbers, sauerkraut cabbage)
  if (container.contents && match.markRemainingSolids) {
    const tag = match.markRemainingSolids;
    for (const child of container.contents) {
      if (!child || child.fluidStorage) continue;
      const alreadyMarked = child.attributes?.state === tag.state;
      child.attributes = {
        ...(child.attributes || {}),
        state: tag.state,
        stateNameRu: tag.stateNameRu,
        preparationMethod: tag.preparationMethod,
      };
      if (!alreadyMarked && tag.hungerMult && child.effects && typeof child.effects.hunger === 'number') {
        child.effects.hunger = Math.round(child.effects.hunger * tag.hungerMult);
      }
    }
  }

  storage.liquidId = match.targetLiquidId;
  storage.currentMl = finalMl;
  storage.components = match.resultComponents
    ? match.resultComponents.map((c) => ({ ...c, ml: Math.min(finalMl, Math.max(1, c.ml)) }))
    : [{ liquidId: match.targetLiquidId, ml: finalMl, labelRu: match.varietyRu, color: match.colorHex }];

  const prevAttrs = storage.attributes || {};
  storage.attributes = {
    ...prevAttrs,
    varietyRu: match.varietyRu,
    ingredients: match.ingredients,
    sourceIngredients: match.ingredients,
    preparationMethod: match.preparationMethod,
    purpose: match.purpose,
    reasonAndOrigin: match.reasonAndOrigin,
    culinaryEquivalentId: match.culinaryEquivalentId,
    physicalForm: 'liquid',
    physicalFormRu: 'Домашнее приготовление',
    isHomemade: true,
    customColor: match.colorHex,
    visuals: {
      ...(prevAttrs.visuals || {}),
      color: match.colorHex,
    },
    customEffects: { ...match.effects },
    customTasteMessages: [...match.tasteMessages],
    isOpened: true,
  };

  // Clear infusedItems that were already folded into the finished homemade product
  if (match.consumeSolidIndices && match.consumeSolidIndices.length > 0) {
    storage.infusedItems = [];
  }

  return true;
}
