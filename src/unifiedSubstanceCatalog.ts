import { LiquidId, FluidSubstanceAttributes } from './liquidSystem';
import { GummyCandyAttributes, PelmenAttributes, ChocolateAttributes } from './types';

export interface UnifiedFluidMappingEntry {
  containerId: string;
  liquidId: LiquidId | null;
  amountMl: number;
  attributes?: FluidSubstanceAttributes;
}

export interface UnifiedPackagingMappingEntry {
  containerId: string;
  countInside?: number;
  innerItemId?: string;
  labelColor?: string;
  containerTintColor?: string;
  customNameRu?: string;
  customDescriptionRu?: string;
  innerGummyPresets?: Partial<GummyCandyAttributes>[];
  innerPelmenPresets?: Partial<PelmenAttributes>[];
  innerChocolatePresets?: Partial<ChocolateAttributes>[];
}

function attr(
  varietyRu: string,
  ingredients: string,
  preparationMethod: string,
  purpose: string,
  reasonAndOrigin: string,
  customColor: string,
  extra?: Partial<FluidSubstanceAttributes>
): FluidSubstanceAttributes {
  return {
    varietyRu,
    ingredients,
    preparationMethod,
    purpose,
    reasonAndOrigin,
    customColor,
    ...extra
  };
}

export const LEGACY_SUBSTANCE_ID_ALIASES: Record<string, string> = {
  "water_bottle": "drinking_water",
  "water_bottle_1500": "drinking_water_1500",
  "bottle_water": "drinking_water",
  "kvas_bottle": "kvas",
  "milk_bottle": "milk",
  "beer_bottle": "beer",
  "bottle_beer": "beer",
  "vodka_bottle": "vodka",
  "bottle_vodka": "vodka",
  "bottle_wine": "wine_red",
  "wine_bottle": "wine_red",
  "wine_white_cooking": "wine_white",
  "wine_red_cooking": "wine_red",
  "fuel_canister": "gasoline_95",
  "canister_fuel": "gasoline_95",
  "canister_diesel": "diesel",
  "canister_water": "drinking_water_20l",
  "oil_canister": "motor_oil",
  "canister_oil": "motor_oil",
  "antifreeze_canister": "antifreeze",
  "canister_coolant": "antifreeze",
  "washer_fluid_can": "washer_fluid",
  "canister_washer_fluid": "washer_fluid",
  "brake_fluid_can": "brake_fluid",
  "canister_brake_fluid": "brake_fluid",
  "coffee_cup": "coffee",
  "hot_coffee": "coffee",
  "tea_cup": "tea",
  "cola_can": "cola",
  "soda_can": "cola",
  "can_beer": "beer",
  "beer_can": "beer",
  "carton_milk": "milk",
  "juice_pack": "juice",
  "milk_pasteurized_carton": "milk",
  "hot_soup": "soup",
  "sugar_bag": "sugar",
  "salt_pack": "salt",
  "salt_bag_coarse": "salt_coarse",
  "jar_honey": "honey",
  "honey_wild_jar": "honey_wild",
  "jar_pickles": "pickles",
  "ginger_pickled_jar": "ginger_pickled",
  "ginger_pickled_box": "ginger_pickled",
  "olives_green_jar": "olives_green",
  "olives_black_jar": "olives_black",
  "capers_pickled_jar": "capers_pickled",
  "sun_dried_tomatoes_jar": "sun_dried_tomatoes",
  "tomato_sundried_jar": "sun_dried_tomatoes",
  "cucumber_pickled_jar": "cucumber_pickled",
  "cabbage_sauerkraut_jar": "cabbage_sauerkraut",
  "jalapeno_pickled_jar": "jalapeno_pickled",
  "canned_meat": "stew_meat",
  "canned_stew": "stew_meat",
  "canned_fish": "fish_preserves",
  "corn_canned_jar": "sweet_corn",
  "corn_canned": "sweet_corn",
  "canned_corn": "sweet_corn",
  "peas_canned_green": "green_peas",
  "canned_peas": "green_peas",
  "beans_canned_tomato": "beans_tomato",
  "canned_beans": "beans_tomato",
  "pineapple_rings_canned": "pineapple_rings",
  "peach_halves_canned": "peach_halves",
  "cherry_pitted_jar": "cherry_pitted",
  "jar_jam": "jam",
  "raspberry_jam_jar": "jam_raspberry",
  "strawberry_jam_jar": "jam_strawberry",
  "canned_caviar": "caviar",
  "salmon_caviar_jar": "salmon_caviar",
  "pike_caviar_jar": "pike_caviar",
  "cod_caviar_jar": "cod_caviar",
  "perch_caviar_jar": "perch_caviar",
  "herring_caviar_jar": "herring_caviar",
  "tuna_caviar_jar": "tuna_caviar",
  "eel_caviar_jar": "eel_caviar",
  "catfish_caviar_jar": "catfish_caviar",
  "caviar_squash_jar": "caviar_squash",
  "zucchini_caviar_jar": "caviar_squash",
  "caviar_eggplant_jar": "caviar_eggplant",
  "eggplant_caviar_jar": "caviar_eggplant",
  "apple_puree_jar": "apple_puree",
  "tomato_paste_can": "tomato_paste",
  "tomato_paste_jar": "tomato_paste",
  "peanut_butter_jar": "peanut_butter",
  "tahini_paste_jar": "tahini_paste",
  "miso_paste_tub": "miso_paste",
  "miso_paste_jar": "miso_paste",
  "broth_beef_jar": "broth_beef",
  "broth_chicken_jar": "broth_chicken",
  "broth_fish_jar": "broth_fish",
  "broth_vegetable_jar": "broth_vegetable",
  "lard_pork_pot": "lard_pork",
  "fat_beef_pot": "fat_beef",
  "ghee_butter_pot": "ghee_butter",
  "oil_sunflower_bottle": "oil_sunflower",
  "oil_olive_extra_virgin": "oil_olive",
  "oil_linseed_bottle": "oil_linseed",
  "oil_sesame_bottle": "oil_sesame",
  "vinegar_table_bottle": "vinegar_table",
  "vinegar_apple_cider": "vinegar_apple",
  "vinegar_balsamic_premium": "vinegar_balsamic",
  "sauce_teriyaki_bottle": "sauce_teriyaki",
  "mustard_dijon_jar": "mustard_dijon",
  "canned_condensed_milk": "condensed_milk",
  "maple_syrup_bottle": "maple_syrup",
  "milk_bottle_raw": "milk_raw",
  "cream_heavy_jar": "cream_heavy",
  "sour_cream_pot": "sour_cream",
  "kefir_fermented_bottle": "kefir",
  "buttermilk_fermented_jar": "buttermilk",
  "yogurt_natural_cup": "yogurt",
  "cottage_cheese_pack": "cottage_cheese",
  "yeast_dry_sachet": "yeast_dry",
  "flour_bag": "flour",
  "flour_wheat_bag_1k": "flour_wheat",
  "flour_rye_bag_1k": "flour_rye",
  "flour_corn_bag_500g": "flour_corn",
  "flour_rice_bag_500g": "flour_rice",
  "grain_wheat_raw_bag": "grain_wheat_raw",
  "grain_rye_raw_bag": "grain_rye_raw",
  "grain_oats_bag": "grain_oats",
  "rice_basmati_bag": "rice_basmati",
  "rice_arborio_bag": "rice_arborio",
  "rice_white_bag_1k": "rice_white",
  "buckwheat_roasted_bag": "buckwheat_roasted",
  "barley_pearl_bag": "barley_pearl",
  "millet_yellow_bag": "millet_yellow",
  "semolina_wheat_bag": "semolina_wheat",
  "salt_sea_premium": "salt_sea",
  "black_pepper_grinder": "black_pepper_whole",
  "black_pepper_powder_sachet": "black_pepper_ground",
  "chili_powder_sachet": "chili_powder",
  "paprika_sweet_sachet": "paprika_sweet",
  "bay_leaves_dried_sachet": "bay_leaves_dried",
  "cinnamon_powder_sachet": "cinnamon_powder",
  "turmeric_powder_sachet": "turmeric_powder",
  "coriander_seeds_sachet": "coriander_seeds",
  "allspice_berries_sachet": "allspice_berries",
  "shiitake_dried_bag": "shiitake_dried",
  "garlic_powder_jar": "garlic_powder",
  "dill_dried_jar": "dill_dried",
  "basil_dried_jar": "basil_dried",
  "mint_dried_jar": "mint_dried",
  "salt_shaker": "salt_fine",
  "antiseptic_bottle": "antiseptic",
  "iodine_bottle": "iodine",
  "panthenol_spray": "panthenol",
  "gelatin_powder_sachet": "gelatin_powder",
  "gelatin_beef_pack": "gelatin_beef",
  "pectin_apple_sachet": "pectin_apple",
  "pectin_citrus_sachet": "pectin_citrus",
  "agar_agar_sachet": "agar_agar",
  "starch_modified_pack": "starch_modified",
  "starch_corn_pack": "starch_corn",
  "glucose_syrup_bottle": "glucose_syrup",
  "glucose_fructose_syrup_bottle": "glucose_fructose_syrup",
  "starch_molasses_jar": "starch_molasses",
  "topinambur_syrup_bottle": "topinambur_syrup",
  "coconut_milk_can": "coconut_milk",
  "citric_acid_sachet": "citric_acid",
  "citric_acid_jar": "citric_acid_coarse",
  "malic_acid_sachet": "malic_acid",
  "tartaric_acid_sachet": "tartaric_acid",
  "lactic_acid_bottle": "lactic_acid",
  "sodium_citrate_sachet": "sodium_citrate",
  "menthol_crystals_tin": "menthol_crystals",
  "menthol_crystals_jar": "menthol_crystals_coarse",
  "carmine_extract_bottle": "dye_carmine",
  "chlorophyllin_bottle": "dye_chlorophyllin",
  "anthocyanin_extract_bottle": "dye_anthocyanin",
  "spirulina_extract_bottle": "dye_spirulina",
  "beta_carotene_bottle": "dye_beta_carotene",
  "caramel_color_bottle": "dye_caramel",
  "lycopene_extract_bottle": "dye_lycopene",
  "kola_nut_extract_bottle": "extract_kola_nut",
  "vanilla_extract_bottle": "extract_vanilla",
  "hibiscus_extract_bottle": "extract_hibiscus",
  "safflower_extract_bottle": "extract_safflower",
  "paprika_extract_bottle": "extract_paprika",
  "black_carrot_concentrate_bottle": "concentrate_black_carrot",
  "tarragon_extract_bottle": "extract_tarragon",
  "eucalyptus_extract_bottle": "extract_eucalyptus",
  "peppermint_oil_bottle": "oil_peppermint",
  "spearmint_oil_bottle": "oil_spearmint",
  "hibiscus_dried_sachet": "hibiscus_dried",
  "safflower_dried_sachet": "safflower_dried",
  "carnauba_wax_pack": "carnauba_wax",
  "egg_chicken_carton": "eggs_chicken",
  "eggs_chicken_carton": "eggs_chicken",
  "egg_quail_carton": "eggs_quail",
  "eggs_quail_pack": "eggs_quail",
  "cookie_pack": "cookies",
  "pomegranate_seeds_cup": "pomegranate_seeds",
  "grapes_berries_cup": "grapes_berries",
  "grape_cup": "grapes_berries",
  "berries_basket": "berries",
  "blueberry_basket": "berries_blueberry",
  "lingonberry_basket": "berries_lingonberry",
  "cranberry_basket": "berries_cranberry",
  "raspberry_basket": "berries_raspberry",
  "strawberry_basket": "berries_strawberry",
  "blackcurrant_basket": "berries_blackcurrant",
  "redcurrant_basket": "berries_redcurrant",
  "cherry_basket": "berries_cherry",
  "blackberry_basket": "berries_blackberry",
  "sea_buckthorn_basket": "berries_sea_buckthorn",
  "elderberry_basket": "berries_elderberry",
  "chanterelle_basket": "mushrooms_chanterelle",
  "honey_agaric_basket": "mushrooms_honey_agaric",
  "berries_tray_fresh": "berries_fresh",
  "popcorn_bucket": "popcorn_salted"
};

export const EXTENDED_LEGACY_CONTAINER_MAP: Record<string, UnifiedFluidMappingEntry> = {
  // === 1. HONEY (МЁД НАТУРАЛЬНЫЙ) ===
  honey: {
    containerId: 'jar_glass_small',
    liquidId: 'honey',
    amountMl: 200,
    attributes: attr(
      'Мёд цветочный луговой',
      'Цветочный нектар разнотравья, ферменты медоносных пчёл',
      'Естественная ферментация в сотах и холодная откачка в медогонке',
      'Укрепление иммунитета, быстрое восстановление энергии и подслащивание чая или выпечки',
      'Высокая концентрация природных сахаров препятствует развитию бактерий и позволяет хранить продукт годами',
      '#f59e0b',
      { culinaryEquivalentId: 'honey' }
    )
  },
  honey_wild: {
    containerId: 'jar_glass_medium',
    liquidId: 'honey',
    amountMl: 500,
    attributes: attr(
      'Мёд дикий бортевой таёжный',
      'Нектар лесной липы, кипрея, малины и диких трав, перга и воск',
      'Сбор из дупла-борти диких пчёл с отжимом без нагрева',
      'Согревающее и общеукрепляющее средство при переохлаждении, питательный десерт',
      'Бортевой мёд созревает в естественных условиях леса и содержит максимум микроэлементов и прополиса',
      '#d97706',
      { culinaryEquivalentId: 'honey_wild' }
    )
  },
  honey_buckwheat: {
    containerId: 'jar_glass_medium',
    liquidId: 'honey',
    amountMl: 500,
    attributes: attr(
      'Мёд гречишный тёмный',
      'Нектар цветущей посевной гречихи',
      'Пасечный сбор и центрифужная откачка зрелых запечатанных рамок',
      'Восполнение железа и белка, глазировка мяса и приготовление пряного теста',
      'Тёмный цвет и терпкое першение в горле обусловлены высоким содержанием железа и аминокислот цветков гречихи',
      '#78350f',
      { culinaryEquivalentId: 'honey_buckwheat' }
    )
  },

  // === 2. PICKLES & SALTED PRESERVES (СОЛЕНЬЯ И КВАШЕНИЯ) ===
  pickles: {
    containerId: 'jar_glass_medium',
    liquidId: 'pickles',
    amountMl: 500,
    attributes: attr(
      'Огурцы солёные хрустящие с укропом и чесноком',
      'Огурцы корнишоны, вода, каменная соль, чеснок, укроп, душистый перец',
      'Традиционный холодный засол с естественной ферментацией',
      'Хрустящая закуска к горячим блюдам и компонент для салатов и супов',
      'Солевой раствор вытягивает влагу и консервирует овощи без потери витамина C',
      '#65a30d',
      { culinaryEquivalentId: 'pickles' }
    )
  },
  cucumber_pickled: {
    containerId: 'jar_glass_medium',
    liquidId: 'pickles',
    amountMl: 500,
    attributes: attr(
      'Огурцы бочковые пряного посола',
      'Свежие огурцы, рассол, корень хрена, дубовый лист, чеснок',
      'Квашение в рассоле с дубильными листьями дуба и вишни',
      'Приготовление рассольника, винегрета, оливье и подача к картофелю',
      'Танины дубового листа предотвращают размягчение клетчатки и делают огурец упругим',
      '#4d7c0f',
      { culinaryEquivalentId: 'cucumber_pickled' }
    )
  },
  tomato_pickled: {
    containerId: 'jar_glass_large',
    liquidId: 'pickles',
    amountMl: 1000,
    attributes: attr(
      'Томаты бочковые солёные в пряном рассоле',
      'Спелые сливовидные томаты, вода, соль, сельдерей, чеснок, стручковый перец',
      'Засол с молочнокислым брожением в пряном рассоле',
      'Сочная кисло-солёная закуска к мясу и гарнирам',
      'При брожении томатный сок внутри плода становится слабогазированным и резким на вкус',
      '#dc2626',
      { culinaryEquivalentId: 'tomato_pickled' }
    )
  },
  cabbage_sauerkraut: {
    containerId: 'jar_glass_large',
    liquidId: 'pickles',
    amountMl: 1000,
    attributes: attr(
      'Капуста квашеная хрустящая с морковью',
      'Белокочанная капуста поздних сортов, тёртая морковь, крупная соль, семена тмина',
      'Шинковка, перетирание с солью до выделения собственного сока и квашение под гнётом',
      'Щи из кислой капусты, тушение со свининой, витаминный салат',
      'Квашение в собственном соку многократно увеличивает биодоступность витамина C и пробиотиков',
      '#fde047',
      { culinaryEquivalentId: 'cabbage_sauerkraut' }
    )
  },
  milk_mushroom_salted: {
    containerId: 'jar_glass_medium',
    liquidId: 'pickles',
    amountMl: 500,
    attributes: attr(
      'Грузди солёные холодного посола с чесноком',
      'Лесные белые грузди, крупная соль, пластинки чеснока, лист смородины и укроп',
      'Трёхдневное вымачивание от млечного сока и холодный засол слоями под дубовым кружком',
      'Деликатесная лесная закуска со сметаной и луком',
      'Холодный засол убирает горечь млечного сока и сохраняет плотную хрустящую мякоть гриба',
      '#d6d3d1',
      { culinaryEquivalentId: 'milk_mushroom_salted' }
    )
  },

  // === 3. MARINADED GOODS (МАРИНАДЫ В ЗАЛИВКЕ) ===
  garlic_pickled: {
    containerId: 'jar_glass_small',
    liquidId: 'pickles',
    amountMl: 200,
    attributes: attr(
      'Чеснок маринованный со свёклой',
      'Головки и зубчики молодого чеснока, яблочный уксус, свекольный сок, сахар, соль, гвоздика',
      'Бланширование и горячее маринование в кисло-сладкой свекольной заливке',
      'Пикантная закуска к плову, шашлыку и жирному мясу',
      'Кислота маринада убирает резкий запах чеснока, оставляя мягкий пряный вкус и рубиновый оттенок',
      '#9f1239',
      { culinaryEquivalentId: 'garlic_pickled' }
    )
  },
  butter_boletus_pickled: {
    containerId: 'jar_glass_medium',
    liquidId: 'pickles',
    amountMl: 500,
    attributes: attr(
      'Маслята лесные маринованные с луком',
      'Молодые шляпки сосновых маслят, вода, уксус, лавровый лист, душистый перец, гвоздика',
      'Отваривание очищенных шляпок и заливка пряным уксусным маринадом под закатку',
      'Праздничная грибная закуска с душистым подсолнечным маслом и зелёным луком',
      'Уксусный маринад сохраняет упругость нежных трубчатых грибов и предотвращает порчу при хранении',
      '#a16207',
      { culinaryEquivalentId: 'butter_boletus_pickled' }
    )
  },
  honey_agaric_pickled: {
    containerId: 'jar_glass_medium',
    liquidId: 'pickles',
    amountMl: 500,
    attributes: attr(
      'Опята осенние маринованные по-домашнему',
      'Целые мелкие осенние опята, вода, соль, сахар, уксусная эссенция, укроп, чеснок',
      'Варка в подсоленной воде со снятием пены и консервация в прозрачном маринаде',
      'Закуска к отварному картофелю, начинка для пирогов и салатов',
      'Мелкие гвоздики-опята не требуют нарезки и впитывают пряности целиком, оставаясь хрустящими',
      '#b45309',
      { culinaryEquivalentId: 'honey_agaric_pickled' }
    )
  },

  // === 4. CANNED PRESERVES (КОНСЕРВЫ В БАНКАХ И ЖЕСТИ) ===
  stew_meat: {
    containerId: 'can_metal_medium',
    liquidId: 'canned_preserve',
    amountMl: 400,
    attributes: attr(
      'Говядина тушёная кусковая в желе',
      'Говядина кусковая, мясной бульон-желе, жир, специи',
      'Автоклавная стерилизация в жестяной банке 0.4л',
      'Сытный перекус или приготовление горячих блюд',
      'Богата полноценным белком и коллагеном',
      '#991b1b',
      { culinaryEquivalentId: 'stew_meat', customEffects: { hunger: 75, health: 10, energy: 10 } }
    )
  },
  fish_preserves: {
    containerId: 'can_metal_oval',
    liquidId: 'canned_preserve',
    amountMl: 200,
    attributes: attr(
      'Пресервы рыбные в пряно-масляной заливке',
      'Филе сельди и балтийской кильки, растительное масло, кориандр, душистый перец, гвоздика',
      'Посол в пряном тузлуке и созревание в масляной заливке в овальной жестяной банке',
      'Закуска к отварному картофелю и чёрному хлебу',
      'Ферменты рыбы при холодном созревании расщепляют белки до нежной тающей консистенции',
      '#d97706',
      { culinaryEquivalentId: 'fish_preserves', customEffects: { hunger: 55, health: 8, energy: 8 } }
    )
  },
  sweet_corn: {
    containerId: 'can_metal_medium',
    liquidId: 'canned_preserve',
    amountMl: 400,
    attributes: attr(
      'Кукуруза сахарная деликатесная в зёрнах',
      'Цельные зёрна сахарной кукурузы молочной спелости, вода, сахар, соль',
      'Бланширование свежих зёрен и вакуумная стерилизация в жестяной банке',
      'Крабовый и овощной салаты, гарниры, мексиканские блюда',
      'Консервация в первые часы после сбора початка сохраняет природную сладость и сочность зерна',
      '#facc15',
      { culinaryEquivalentId: 'sweet_corn' }
    )
  },
  green_peas: {
    containerId: 'can_metal_medium',
    liquidId: 'canned_preserve',
    amountMl: 400,
    attributes: attr(
      'Горошек зелёный мозговых сортов консервированный',
      'Свежий зелёный горошек мозговых сортов, вода, сахар, соль',
      'Термическая стерилизация в слабосолёной заливке в жестяной банке',
      'Незаменимый ингредиент салата «Оливье», винегрета и гарниров',
      'Мозговые сорта содержат больше сахаров и меньше крахмала, поэтому горошины остаются нежными и не мучнистыми',
      '#4ade80',
      { culinaryEquivalentId: 'green_peas' }
    )
  },
  beans_tomato: {
    containerId: 'can_metal_medium',
    liquidId: 'canned_preserve',
    amountMl: 400,
    attributes: attr(
      'Фасоль красная в густом томатном соусе',
      'Зерновая красная фасоль, томатная паста, вода, сахар, лук, чеснок, паприка',
      'Замачивание и томление фасоли в пряном томатном соусе в автоклаве',
      'Готовый сытный гарнир, начинка для буррито, добавка в борщ и чили кон карне',
      'Длительное томление под давлением разрушает фитиновую кислоту бобов и делает их мягкими и питательными',
      '#b91c1c',
      { culinaryEquivalentId: 'beans_tomato' }
    )
  },
  pineapple_rings: {
    containerId: 'can_metal_medium',
    liquidId: 'canned_preserve',
    amountMl: 400,
    attributes: attr(
      'Ананасы кольцами в лёгком сахарном сиропе',
      'Кольца очищенного тропического ананаса, вода, тростниковый сахар, лимонная кислота',
      'Пастеризация фруктовых колец в сахарном сиропе в жестяной банке',
      'Десерт, запекание мяса и птицы, фруктовые салаты и пицца',
      'Термическая обработка деактивирует фермент бромелайн, поэтому консервированный ананас не щиплет язык',
      '#fde047',
      { culinaryEquivalentId: 'pineapple_rings' }
    )
  },
  peach_halves: {
    containerId: 'can_metal_medium',
    liquidId: 'canned_preserve',
    amountMl: 400,
    attributes: attr(
      'Персики половинками в сладком сиропе',
      'Очищенные половинки спелых жёлтых персиков без косточки, вода, сахар',
      'Бланширование, снятие кожицы паром и стерилизация в сиропе',
      'Фруктовый десерт, украшение тортов, выпечка и утоление голода и жажды',
      'Сироп сохраняет плотную бархатистую текстуру и солнечный аромат южных персиков круглый год',
      '#fb923c',
      { culinaryEquivalentId: 'peach_halves' }
    )
  },

  // === 5. JAMS & FRUIT PRESERVES (ВАРЕНЬЕ И ДЖЕМ) ===
  jam: {
    containerId: 'jar_glass_small',
    liquidId: 'jam',
    amountMl: 200,
    attributes: attr(
      'Варенье домашнее ягодное',
      'Садовые ягоды, сахар-песок',
      'Уваривание в сахарном сиропе до густоты',
      'Десерт к чаю, намазка на хлеб и начинка для выпечки',
      'Традиционный способ заготовки ягод на зиму',
      '#be123c',
      { culinaryEquivalentId: 'jam' }
    )
  },
  jam_raspberry: {
    containerId: 'jar_glass_small',
    liquidId: 'jam',
    amountMl: 200,
    attributes: attr(
      'Варенье малиновое домашнее',
      'Душистая лесная и садовая малина, сахар',
      'Выдержка малины под сахаром до пуска сока и бережная варка',
      'Первое средство при простуде и ознобе с горячим чаем, добавка к выпечке',
      'Малина содержит природную салициловую кислоту, оказывающую мягкое потогонное и согревающее действие',
      '#e11d48',
      { culinaryEquivalentId: 'jam_raspberry' }
    )
  },
  jam_strawberry: {
    containerId: 'jar_glass_small',
    liquidId: 'jam',
    amountMl: 200,
    attributes: attr(
      'Варенье клубничное с цельными ягодами',
      'Садовая клубника (земляника), сахар, щепотка лимонной кислоты',
      'Многоступенчатая варка в густом сахарном сиропе',
      'Подслащивание каш, творога, тостов и чаепитие',
      'Постепенное пропитывание сиропом не даёт ягодам развариться и сохраняет их форму',
      '#dc2626',
      { culinaryEquivalentId: 'jam_strawberry' }
    )
  },
  jam_blueberry: {
    containerId: 'jar_glass_small',
    liquidId: 'jam',
    amountMl: 200,
    attributes: attr(
      'Варенье черничное лесное',
      'Таёжная черника, сахар-песок',
      'Томление в собственном соку с сахаром',
      'Десерт к чаю, поддержка зрения и антиоксидантная защита',
      'Черника богата антоцианами и пектинами, благодаря чему варенье приобретает густой чернильно-фиолетовый цвет',
      '#312e81',
      { culinaryEquivalentId: 'jam_blueberry' }
    )
  },

  // === 6. FISH ROE CAVIAR (ИКРА РЫБНАЯ ЗЕРНИСТАЯ) ===
  caviar: {
    containerId: 'can_metal_flat',
    liquidId: 'caviar',
    amountMl: 140,
    attributes: attr(
      'Икра лососёвая зернистая красная (ГОСТ)',
      'Зерно икры дальневосточной горбуши и кеты, поваренная соль (малосольная), капля растительного масла',
      'Пробивка ястыков через грохотку и слабый посол в охлаждённом тузлуке с фасовкой в шайбу',
      'Праздничные бутерброды со сливочным маслом, блины, тарталетки',
      'Нежная оболочка икринок лопается на языке, высвобождая богатый омега-3 и лецитином белковый сок',
      '#ea580c',
      { culinaryEquivalentId: 'caviar' }
    )
  },
  salmon_caviar: {
    containerId: 'jar_glass_small',
    liquidId: 'caviar',
    amountMl: 140,
    attributes: attr(
      'Икра лососёвая зернистая',
      'Икра лосося, соль',
      'Слабосолёный посол в тузлуке',
      'Деликатесная закуска и ингредиент для блюд высокой кухни',
      'Источник легкоусвояемого белка и фосфора',
      '#ea580c',
      { culinaryEquivalentId: 'salmon_caviar' }
    )
  },
  pike_caviar: {
    containerId: 'jar_glass_small',
    liquidId: 'caviar',
    amountMl: 140,
    attributes: attr(
      'Икра щучья янтарная',
      'Икра щуки, соль',
      'Традиционный астраханский посол',
      'Подача с блинами, тостами и сметаной',
      'Отличается упругим янтарным зерном и низкой жирностью',
      '#eab308',
      { culinaryEquivalentId: 'pike_caviar' }
    )
  },
  cod_caviar: {
    containerId: 'jar_glass_small',
    liquidId: 'caviar',
    amountMl: 140,
    attributes: attr(
      'Икра трески пробойная',
      'Икра трески, соль',
      'Пробойный посол',
      'Намазка на бутерброды и тосты',
      'Нежная текстура и высокая питательность',
      '#fde047',
      { culinaryEquivalentId: 'cod_caviar' }
    )
  },

  // === 7. VEGETABLE CAVIAR (ИКРА ОВОЩНАЯ УВАРЕННАЯ) ===
  caviar_squash: {
    containerId: 'jar_glass_medium',
    liquidId: 'caviar',
    amountMl: 500,
    attributes: attr(
      'Икра кабачковая домашняя',
      'Кабачки, морковь, лук, томатная паста, растительное масло, специи',
      'Тушение и протирание обжаренных овощей',
      'Намазка на свежий хлеб и гарнир',
      'Лёгкое, но сытное овощное блюдо, богатое клетчаткой и каротином',
      '#d97706',
      { culinaryEquivalentId: 'caviar_squash' }
    )
  },
  caviar_eggplant: {
    containerId: 'jar_glass_medium',
    liquidId: 'caviar',
    amountMl: 500,
    attributes: attr(
      'Икра баклажанная пряная',
      'Баклажаны, томаты, сладкий перец, лук, чеснок, масло',
      'Медленное томление рубленых овощей в масле',
      'Холодная закуска и гарнир',
      'Насыщенный южный вкус с чесночно-томатной ноткой',
      '#78350f',
      { culinaryEquivalentId: 'caviar_eggplant' }
    )
  },

  // === 8. PUREES & PASTES (ПЮРЕ И ГУСТЫЕ ПАСТЫ) ===
  peanut_butter: {
    containerId: 'jar_glass_small',
    liquidId: 'puree',
    amountMl: 200,
    attributes: attr(
      'Паста арахисовая кремовая обжаренная',
      'Отборный обжаренный арахис (95%), морская соль, капля мёда',
      'Сухая обжарка ядер арахиса и многократный жерновой помол до выделения орехового масла',
      'Питательные тосты на завтрак, энергетический перекус в походе, соусы и выпечка',
      'Сверхвысокая калорийность и растительный белок надолго утоляют голод при малом объёме',
      '#b45309',
      { culinaryEquivalentId: 'peanut_butter' }
    )
  },
  tahini_paste: {
    containerId: 'jar_glass_small',
    liquidId: 'puree',
    amountMl: 200,
    attributes: attr(
      'Паста кунжутная (Тахини / Тхина)',
      '100% очищенные семена белого кунжута',
      'Бережная обжарка и перетирание семян кунжута на каменных жерновах в текучую эмульсию',
      'Обязательная основа для хумуса, фалафеля, халвы и восточных заправок',
      'Рекордсмен по содержанию природного кальция и цинка с характерной благородной ореховой горчинкой',
      '#e7e5e4',
      { culinaryEquivalentId: 'tahini_paste' }
    )
  },
  miso_paste: {
    containerId: 'jar_glass_small',
    liquidId: 'puree',
    amountMl: 200,
    attributes: attr(
      'Паста Мисо ферментированная соевая (Ака-мисо)',
      'Соевые бобы, рис, морская соль, культура грибка кодзи (Aspergillus oryzae)',
      'Многомесячная ферментация отварных соевых бобов с солью и солодом кодзи в кедровых бочках',
      'Приготовление мисо-супа, рамена, маринадов для рыбы и глазировки овощей',
      'Длительная ферментация расщепляет соевый белок до свободных аминокислот, создавая глубокий вкус умами',
      '#92400e',
      { culinaryEquivalentId: 'miso_paste' }
    )
  },

  // === 9. BROTHS (БУЛЬОНЫ И НАВАРЫ) ===
  broth_beef: {
    containerId: 'jar_glass_medium',
    liquidId: 'broth',
    amountMl: 450,
    attributes: attr(
      'Бульон говяжий костный концентрированный',
      'Говяжьи мозговые кости, грудинка, печёный лук, морковь, корень петрушки, лавровый лист',
      'Шестичасовое медленное томление запечённых костей при 90 °C со снятием пены и процеживанием',
      'Основа для борща, щей, соусов демиглас или согревающее питьё для восстановления сил',
      'Долгое томление вытягивает из костей коллаген и желатин, застывающий при охлаждении в упругое желе',
      '#78350f',
      { culinaryEquivalentId: 'broth_beef' }
    )
  },
  broth_chicken: {
    containerId: 'jar_glass_medium',
    liquidId: 'broth',
    amountMl: 450,
    attributes: attr(
      'Бульон куриный домашний золотистый',
      'Фермерская курица на кости, золотистая луковица в шелухе, морковь, стебель сельдерея, укроп',
      'Медленная варка на тихом огне без бурного кипения для идеальной прозрачности',
      'Домашняя лапша, ризотто, пельмени и первое средство для больного или продрогшего человека',
      'Цистеин и карнозин куриного бульона облегчают дыхание и быстро согревают организм изнутри',
      '#eab308',
      { culinaryEquivalentId: 'broth_chicken' }
    )
  },
  broth_fish: {
    containerId: 'jar_glass_medium',
    liquidId: 'broth',
    amountMl: 450,
    attributes: attr(
      'Бульон рыбный (Фюме / двойная уха)',
      'Головы, хребты и плавники судака, щуки и лосося, лук-порей, белое сухое вино, фенхель',
      ' сорокаминутное томление рыбных костей с кореньями и осветление',
      'Наваристая рыбацкая уха, рыбная солянка, буйабес и сливочные соусы к морепродуктам',
      'Хрящи рыбьих голов отдают в отвар клейкие вещества и фосфор, делая уху бархатистой и наваристой',
      '#fef08a',
      { culinaryEquivalentId: 'broth_fish' }
    )
  },
  broth_vegetable: {
    containerId: 'jar_glass_medium',
    liquidId: 'broth',
    amountMl: 450,
    attributes: attr(
      'Бульон овощной пряный из кореньев',
      'Печёная морковь, корень сельдерея, лук-порей, томаты, чеснок, тимьян, петрушка',
      'Запекание кореньев до карамелизации и часовой навар с пряными травами',
      'Лёгкие вегетарианские супы, супы-пюре, тушение овощей и варка круп',
      'Предварительное запекание овощей придаёт постному отвару глубокий золотисто-янтарный цвет и насыщенность',
      '#facc15',
      { culinaryEquivalentId: 'broth_vegetable' }
    )
  },

  // === 10. RENDERED FATS (ТОПЛЁНЫЕ ЖИРЫ И МАСЛА) ===
  lard_pork: {
    containerId: 'pot_clay_medium',
    liquidId: 'rendered_fat',
    amountMl: 500,
    attributes: attr(
      'Смалец свиной домашний топлёный с чесноком',
      'Свежее свиное нутряное и подкожное сало, зубчик чеснока, лавровый лист, щепотка соли',
      'Медленное вытапливание нарезанного сала в чугунке со сливом прозрачного жира в глиняный горшочек',
      'Сытная намазка на ржаной хлеб с солью и луком, жарка картофеля и заправка каш',
      'При вытапливании испаряется вся влага, поэтому смалец в керамическом горшочке не портится месяцами и не горит на сковороде',
      '#fef9c3',
      { culinaryEquivalentId: 'lard_pork' }
    )
  },
  fat_beef: {
    containerId: 'pot_clay_medium',
    liquidId: 'rendered_fat',
    amountMl: 500,
    attributes: attr(
      'Жир говяжий топлёный кулинарный',
      'Говяжий околопочечный жир-сырец (нутряк)',
      'Многочасовое томление на водяной бане и фильтрация через холст в глиняный горшок',
      'Жарка во фритюре, плов, самса, чебуреки и румяный картофель',
      'Обладает высокой температурой дымления (210 °C), благодаря чему даёт самую хрустящую корочку без канцерогенов',
      '#fef08a',
      { culinaryEquivalentId: 'fat_beef' }
    )
  },
  ghee_butter: {
    containerId: 'pot_clay_small',
    liquidId: 'rendered_fat',
    amountMl: 250,
    attributes: attr(
      'Масло топлёное сливочное (Гхи, 99% жира)',
      'Натуральное несолёное сливочное масло 82.5%',
      'Медленное перетапливание в толстостенном котле с отделением молочной сыворотки и карамелизацией казеина',
      'Жарка блинов, стейков, каш, выпечка и заправка горячих блюд',
      'После удаления молочного белка масло приобретает ореховый аромат, янтарный цвет и не горит при 250 °C',
      '#f59e0b',
      { culinaryEquivalentId: 'ghee_butter' }
    )
  },

  // === 11. CULINARY OILS (РАСТИТЕЛЬНЫЕ МАСЛА) ===
  oil_sunflower: {
    containerId: 'bottle_glass_large',
    liquidId: 'oil_culinary',
    amountMl: 1000,
    attributes: attr(
      'Масло подсолнечное кулинарное',
      'Семена подсолнечника',
      'Холодный отжим и фильтрация',
      'Жарка, пассеровка овощей, выпечка и салатные заправки',
      'Базовое кулинарное масло для тепловой обработки',
      '#facc15',
      { culinaryEquivalentId: 'oil_sunflower' }
    )
  },
  oil_olive: {
    containerId: 'bottle_glass_medium',
    liquidId: 'oil_culinary',
    amountMl: 500,
    attributes: attr(
      'Масло оливковое нерафинированное',
      'Плоды оливы',
      'Холодное прессование',
      'Салаты, паста, рыба и овощи гриль',
      'Богато мононенасыщенными жирными кислотами',
      '#84cc16',
      { culinaryEquivalentId: 'oil_olive' }
    )
  },
  oil_linseed: {
    containerId: 'bottle_glass_medium',
    liquidId: 'oil_culinary',
    amountMl: 500,
    attributes: attr(
      'Масло льняное холодного отжима',
      'Семена льна',
      'Сыродавленный отжим',
      'Холодные заправки для овощей и круп',
      'Природный источник альфа-линоленовой кислоты (Омега-3)',
      '#ca8a04',
      { culinaryEquivalentId: 'oil_linseed' }
    )
  },
  oil_sesame: {
    containerId: 'bottle_glass_small',
    liquidId: 'oil_culinary',
    amountMl: 250,
    attributes: attr(
      'Масло кунжутное ароматное',
      'Семена кунжута',
      'Отжим обжаренного семени',
      'Азиатские блюда, салаты и вок',
      'Насыщенный ореховый аромат и антиоксидант сезамол',
      '#92400e',
      { culinaryEquivalentId: 'oil_sesame' }
    )
  },

  // === 12. VINEGARS (УКСУСЫ КУЛИНАРНЫЕ) ===
  vinegar_table: {
    containerId: 'bottle_glass_medium',
    liquidId: 'vinegar',
    amountMl: 500,
    attributes: attr(
      'Уксус столовый 9%',
      'Вода, уксусная кислота пищевая',
      'Ферментативное окисление',
      'Маринады, пельмени и домашнее консервирование',
      'Универсальный регулятор кислотности и консервант',
      '#f1f5f9',
      { culinaryEquivalentId: 'vinegar_table' }
    )
  },
  vinegar_apple: {
    containerId: 'bottle_glass_medium',
    liquidId: 'vinegar',
    amountMl: 500,
    attributes: attr(
      'Уксус яблочный сидровый',
      'Яблочный сидр',
      'Естественное уксуснокислое брожение',
      'Салаты, маринады и соусы',
      'Мягкая фруктовая кислота и аромат осенних яблок',
      '#fbbf24',
      { culinaryEquivalentId: 'vinegar_apple' }
    )
  },
  vinegar_balsamic: {
    containerId: 'bottle_glass_small',
    liquidId: 'vinegar',
    amountMl: 250,
    attributes: attr(
      'Уксус бальзамический тёмный',
      'Виноградное сусло, винный уксус',
      'Бочковая выдержка',
      'Салаты, мясо гриль и сырные тарелки',
      'Глубокий кисло-сладкий виноградный профиль',
      '#27272a',
      { culinaryEquivalentId: 'vinegar_balsamic' }
    )
  },
  vinegar_rice: {
    containerId: 'bottle_glass_medium',
    liquidId: 'vinegar',
    amountMl: 500,
    attributes: attr(
      'Уксус рисовый японский мягкий (Мицукан)',
      'Ферментированный шлифованный белый рис, родниковая вода, культура кодзи',
      'Двойное осахаривание рисового крахмала, спиртовое и медленное уксуснокислое брожение',
      'Заправка риса для суши и роллов, маринование имбиря гари, салатов суномоно и морепродуктов',
      'Обладает самой низкой кислотностью (4%) и мягким сладковатым вкусом без резкого спиртового запаха',
      '#fef9c3',
      { culinaryEquivalentId: 'vinegar_apple' }
    )
  },

  // === 13. SAUCES & CONDIMENTS (СОУСЫ, ГОРЧИЦЫ, АДЖИКИ) ===
  soy_sauce_classic: {
    containerId: 'bottle_glass_small',
    liquidId: 'sauce',
    amountMl: 250,
    attributes: attr(
      'Соус соевый натурального брожения',
      'Соевые бобы, обжаренная пшеница, вода, морская соль, закваска кодзи',
      'Шестимесячная естественная ферментация сусла мором и прессование через ткань',
      'Суши и роллы, маринование мяса, жарка лапши и риса, замена соли',
      'Природный глутамат из ферментированной сои усиливает вкус любого мясного, рыбного или овощного блюда',
      '#27272a',
      { culinaryEquivalentId: 'soy_sauce_classic' }
    )
  },
  sauce_soy: {
    containerId: 'bottle_glass_small',
    liquidId: 'sauce',
    amountMl: 250,
    attributes: attr(
      'Соус соевый классический',
      'Соя, пшеница, вода, соль',
      'Естественное брожение',
      'Азиатские блюда, роллы, маринады и вок',
      'Насыщенный солёно-пряный вкус умами',
      '#27272a',
      { culinaryEquivalentId: 'sauce_soy' }
    )
  },
  sauce_fish_premium: {
    containerId: 'bottle_glass_small',
    liquidId: 'sauce',
    amountMl: 250,
    attributes: attr(
      'Соус рыбный ферментированный (Нам Пла)',
      'Свежие морские анчоусы, морская соль, вода',
      'Годичная ферментация цельных анчоусов под солевым прессом со сбором прозрачного янтарного экстракта',
      'Суп Том Ям, Пад Тай, карри и азиатские салаты',
      'Несмотря на резкий морской запах в бутылке, в горячем блюде раскрывается тонким карамельно-мясным вкусом',
      '#b45309',
      { culinaryEquivalentId: 'sauce_fish_premium' }
    )
  },
  sauce_fish: {
    containerId: 'bottle_glass_small',
    liquidId: 'sauce',
    amountMl: 250,
    attributes: attr(
      'Соус рыбный азиатский',
      'Анчоусы, морская соль',
      'Ферментация в бочках',
      'Тайские и вьетнамские супы и вок',
      'Природный усилитель вкуса на основе морской рыбы',
      '#b45309',
      { culinaryEquivalentId: 'sauce_fish' }
    )
  },
  sauce_worcestershire: {
    containerId: 'bottle_glass_small',
    liquidId: 'sauce',
    amountMl: 250,
    attributes: attr(
      'Соус Вустерширский (Ворчестер) английский',
      'Солодовый уксус, патока, анчоусы, мякоть тамаринда, лук-шалот, чеснок, гвоздика, чили',
      'Двухлетняя бочковая ферментация сложного пряно-рыбного настоя',
      'Стейки, ростбиф, салат «Цезарь», бургеры и рагу',
      'Сложная композиция из 15 ингредиентов придаёт мясу благородную пикантность и кисло-сладкую глубину',
      '#3f2e21',
      { culinaryEquivalentId: 'sauce_worcestershire' }
    )
  },
  sauce_pomegranate_narsharab: {
    containerId: 'bottle_glass_small',
    liquidId: 'sauce',
    amountMl: 250,
    attributes: attr(
      'Соус гранатовый «Наршараб» уваренный',
      'Сок дикорастущего кислого граната, кориандр, базилик, корица, лавровый лист, чёрный перец',
      'Пятикратное уваривание гранатового сока до густоты жидкого рубинового сиропа со специями',
      'Шашлык из баранины и говядины, люля-кебаб, запечённая рыба и птица',
      'Фруктовые кислоты граната расщепляют тяжёлые жиры баранины и создают яркий кисло-терпкий контраст',
      '#4c0519',
      { culinaryEquivalentId: 'sauce_pomegranate_narsharab' }
    )
  },
  sauce_narsharab: {
    containerId: 'bottle_glass_small',
    liquidId: 'sauce',
    amountMl: 250,
    attributes: attr(
      'Соус гранатовый «Наршараб»',
      'Гранатовый сок, восточные специи',
      'Уваривание до густоты',
      'Подача к жареному мясу и рыбе',
      'Густой рубиновый соус с терпкой гранатовой кислинкой',
      '#4c0519',
      { culinaryEquivalentId: 'sauce_narsharab' }
    )
  },
  sauce_teriyaki: {
    containerId: 'bottle_glass_small',
    liquidId: 'sauce',
    amountMl: 250,
    attributes: attr(
      'Соус Терияки японский',
      'Соевый соус, мирин, сахар, имбирь',
      'Уваривание с карамелизацией',
      'Глазировка птицы, рыбы и лапши вок',
      'Сладковато-пряный вкус и глянцевая корочка при жарке',
      '#451a03',
      { culinaryEquivalentId: 'sauce_teriyaki' }
    )
  },
  mustard_dijon: {
    containerId: 'jar_glass_small',
    liquidId: 'sauce',
    amountMl: 200,
    attributes: attr(
      'Горчица Дижонская и Русская ядрёная',
      'Горчичный порошок и зерно, винный уксус, масло, соль, сахар',
      'Заваривание и вызревание горчичной пасты',
      'К холодцу, салу, сосискам и мясным блюдам',
      'Эфирные масла горчицы мгновенно согревают и стимулируют пищеварение',
      '#eab308',
      { culinaryEquivalentId: 'mustard_dijon' }
    )
  },

  // === 14. SWEET SYRUPS & CONDENSED MILK (СИРОПЫ И СГУЩЁННОЕ МОЛОКО) ===
  condensed_milk: {
    containerId: 'can_metal_medium',
    liquidId: 'syrup_sweet',
    amountMl: 400,
    attributes: attr(
      'Молоко сгущённое с сахаром',
      'Цельное молоко, сахар',
      'Вакуумное выпаривание с сахаром',
      'К блинам, выпечке, кофе и чаю',
      'Густое сливочное лакомство с мощным зарядом быстрых углеводов',
      '#fef9c3',
      { culinaryEquivalentId: 'condensed_milk', customEffects: { hunger: 60, energy: 25, health: 5 } }
    )
  },
  maple_syrup: {
    containerId: 'bottle_glass_small',
    liquidId: 'syrup_sweet',
    amountMl: 250,
    attributes: attr(
      'Сироп кленовый натуральный',
      'Кленовый сок',
      'Выпаривание сока сахарного клёна',
      'Поливка для блинов, оладий и десертов',
      'Натуральный древесный подсластитель с минералами марганца и цинка',
      '#b45309',
      { culinaryEquivalentId: 'maple_syrup' }
    )
  },

  // === 15. FERMENTED DAIRY & CREAM (КИСЛОМОЛОЧНЫЕ ПРОДУКТЫ, СМЕТАНА, ЗАКВАСКИ) ===
  milk_raw: {
    containerId: 'bottle_glass_large',
    liquidId: 'milk',
    amountMl: 1000,
    attributes: attr(
      'Молоко фермерское парное цельное (4.2%)',
      'Цельное непастеризованное коровье молоко утреннего удоя',
      'Охлаждение и процеживание сразу после дойки с розливом в стеклянную бутылку',
      'Питьё, варка каш, приготовление домашнего творога, простокваши и выпечки',
      'Сверху в бутылке отстаивается густой слой натуральных жёлтых сливок',
      '#fffbeb',
      { culinaryEquivalentId: 'milk_raw' }
    )
  },
  cream_heavy: {
    containerId: 'jar_glass_medium',
    liquidId: 'dairy_fermented',
    amountMl: 500,
    attributes: attr(
      'Сливки деревенские жирные (33%)',
      'Цельное коровье молоко',
      'Сепарирование тёплого парного молока в центрифуге',
      'Взбивание крема, сливочные соусы для пасты и жюльена, добавление в кофе и крем-супы',
      'Высокая массовая доля молочного жира (33%) позволяет взбивать сливки в пышную стойкую пену и сбивать домашнее масло',
      '#fefce8',
      { culinaryEquivalentId: 'cream_heavy' }
    )
  },
  sour_cream: {
    containerId: 'pot_clay_medium',
    liquidId: 'dairy_fermented',
    amountMl: 500,
    attributes: attr(
      'Сметана деревенская густая (25%) в горшочке',
      'Пастеризованные густые сливки, закваска молочнокислых стрептококков',
      'Сквашивание сливок в глиняном горшочке и холодное созревание в погребе (до состояния «ложка стоит»)',
      'Заправка борща, щей, пельменей, вареников, блинов, грибов в сметане и выпечки',
      'При холодном созревании жировые шарики сливок кристаллизуются, делая сметану густой и бархатистой без загустителей',
      '#fefce8',
      { culinaryEquivalentId: 'sour_cream' }
    )
  },
  kefir: {
    containerId: 'bottle_glass_large',
    liquidId: 'dairy_fermented',
    amountMl: 1000,
    attributes: attr(
      'Кефир термостатный живой (3.2%)',
      'Цельное коровье молоко, живая симбиотическая закваска на кефирных грибках',
      'Двойное молочнокислое и спиртовое брожение прямо в стеклянной бутылке',
      'Освежающий напиток, основа для окрошки, пышных оладий и маринадов',
      'Симбиоз молочнокислых бактерий и дрожжей придаёт кефиру лёгкую природную газированность и освежающую кислинку',
      '#f8fafc',
      { culinaryEquivalentId: 'kefir' }
    )
  },
  buttermilk: {
    containerId: 'jar_glass_medium',
    liquidId: 'dairy_fermented',
    amountMl: 500,
    attributes: attr(
      'Пахта ферментированная и ряженка томлёная',
      'Сладкие сливки и топлёное молоко, закваска термофильных бактерий',
      'Отделение пахты при сбивании масла и сквашивание с томлёным молоком',
      'Идеальная основа для бисквитов, панкейков и нежного питья',
      'Богата фосфолипидами (лецитином), делающими любую выпечку невесомой и долго не черствеющей',
      '#fef3c7',
      { culinaryEquivalentId: 'buttermilk' }
    )
  },
  yogurt: {
    containerId: 'cup_plastic_dairy_small',
    liquidId: 'dairy_fermented',
    amountMl: 200,
    attributes: attr(
      'Йогурт греческий натуральный густой без сахара',
      'Отборное молоко, болгарская палочка (Lactobacillus bulgaricus) и термофильный стрептококк',
      'Термостатное сквашивание и сцеживание лишней сыворотки через ткань в стаканчик под фольгу',
      'Лёгкий белковый завтрак с ягодами и мёдом, соус дзадзики и заправка для салатов',
      'Удаление сыворотки удваивает концентрацию белка и создаёт плотную сливочную текстуру',
      '#ffffff',
      { culinaryEquivalentId: 'yogurt' }
    )
  },
  liquid_yeast_mixture: {
    containerId: 'jar_glass_small',
    liquidId: 'dairy_fermented',
    amountMl: 200,
    attributes: attr(
      'Опара и жидкая хлебная закваска (Левито Мадре)',
      'Пшеничная и ржаная мука грубого помола, тёплая родниковая вода, дикие дрожжи и лактобактерии',
      'Многодневное спонтанное сбраживание мучной болтушки с регулярным освежением',
      'Выпечка ремесленного хлеба на закваске, пышных пирогов, куличей и блинов',
      'Симбиоз диких дрожжей и молочнокислых бактерий разрыхляет тесто углекислым газом и даёт хлебу хрустящую корку и богатый мякиш',
      '#fde68a',
      { culinaryEquivalentId: 'liquid_yeast_mixture' }
    )
  },

  // === 16. DRY MIXES, POWDERS & FLOURS (СУХИЕ СМЕСИ, МУКА, ПОРОШКИ) ===
  yeast_dry: {
    containerId: 'package_sachet',
    liquidId: 'dry_mix',
    amountMl: 50,
    attributes: attr(
      'Смесь сухая: Дрожжи хлебопекарные быстродействующие',
      'Чистая культура дрожжей Saccharomyces cerevisiae, эмульгатор сорбитан моностеарат',
      'Выращивание на мелассе, вакуумная фильтрация и щадящая сушка в гранулы',
      'Быстрый подъём сдобного, хлебного и пирожкового теста',
      'В спящем обезвоженном состоянии клетки дрожжей сохраняют активность месяцами и пробуждаются при контакте с тёплой водой и сахаром',
      '#d6d3d1',
      { culinaryEquivalentId: 'yeast_dry' }
    )
  },
  flour: {
    containerId: 'sack_cloth_medium',
    liquidId: 'flour',
    amountMl: 3000,
    attributes: attr(
      'Мука пшеничная хлебопекарная высшего сорта',
      'Отборное мягкое и твёрдое зерно пшеницы (эндосперм)',
      'Очистка зерна, кондиционирование водой и тонкий вальцовый помол с просеиванием через шёлковые сита',
      'Выпечка хлеба, пирогов, блинов, лепка пельменей, панировка и загущение соусов',
      'Высокое содержание клейковины (глютена) образует упругий каркас теста, удерживающий пузырьки газа при выпечке',
      '#f8fafc',
      { culinaryEquivalentId: 'flour' }
    )
  },
  flour_wheat: {
    containerId: 'sack_cloth_small',
    liquidId: 'flour',
    amountMl: 1000,
    attributes: attr(
      'Мука пшеничная пекарская (1 кг)',
      'Яровая и озимая пшеница',
      'Мельничный помол высшего сорта',
      'Домашняя выпечка, блины, вареники и пельмени',
      'Белоснежная мука мелкого помола для пышного сдобного теста',
      '#f8fafc',
      { culinaryEquivalentId: 'flour_wheat' }
    )
  },
  flour_rye: {
    containerId: 'sack_cloth_small',
    liquidId: 'flour',
    amountMl: 1000,
    attributes: attr(
      'Мука ржаная обдирная',
      'Цельное зерно озимой ржи с частицами цветочной оболочки',
      'Обдирный жерновой помол с сохранением отрубянистых частиц и зародыша',
      'Выпечка бородинского и дарницкого ржаного хлеба, калиток, пряников и закваски для кваса',
      'Богата пентозанами, клетчаткой и витаминами группы B, придающими ржаному хлебу сочный мякиш и солодовый дух',
      '#d6d3d1',
      { culinaryEquivalentId: 'flour_rye' }
    )
  },
  flour_corn: {
    containerId: 'package_bag',
    liquidId: 'flour',
    amountMl: 500,
    attributes: attr(
      'Мука кукурузная тонкого помола золотистая',
      'Стекловидные зёрна жёлтой кукурузы',
      'Сушка кукурузного зерна, отделение зародыша и тонкий помол',
      'Кукурузные лепёшки тортильи, мамалыга, полента, мчади и хрустящая панировка',
      'Не содержит глютена, окрашивает выпечку в солнечный жёлтый цвет и даёт рассыпчатую текстуру',
      '#fde047',
      { culinaryEquivalentId: 'flour_corn' }
    )
  },
  flour_rice: {
    containerId: 'package_bag',
    liquidId: 'flour',
    amountMl: 500,
    attributes: attr(
      'Мука рисовая белоснежная',
      'Шлифованное белое зерно риса',
      'Тонкое измельчение рисового зерна до пудровой фракции',
      'Идеальные сырники, кляр темпура, рисовая лапша, моти и безглютеновые десерты',
      'Впитывает меньше масла при жарке и не даёт сырникам расползаться на сковороде',
      '#ffffff',
      { culinaryEquivalentId: 'flour_rice' }
    )
  },

  // === 17. GRAINS, CEREALS & LEGUMES (КРУПЫ, ЗЛАКИ И БОБОВЫЕ) ===
  grain_wheat_raw: {
    containerId: 'grain_pack_pouch',
    liquidId: 'grain_wheat',
    amountMl: 1000,
    attributes: attr(
      'Зерно пшеницы цельное отборное',
      '100% нешлифованные цельные зёрна твёрдой пшеницы (Triticum durum)',
      'Обмолот колосьев, отвеивание от половы, калибровка и бережная сушка',
      'Помол в цельнозерновую муку, проращивание, варка кутьи и сытной пшеничной каши',
      'В цельном зерне сохранены зародыш и алейроновая оболочка со всеми природными маслами, клетчаткой и минералами',
      '#d97706',
      {
        culinaryEquivalentId: 'grain_wheat_raw',
        productShapeRu: 'Цельное овальное зерно с бороздкой',
        grainGradeRu: 'Высший класс, цельнозерновая (для проращивания и варки)',
        surfaceTextureRu: 'Плотная природная оболочка',
        cookingTimeMin: '45–60 мин (с замачиванием)',
        glutenFree: false,
        proteinPer100g: 13.2
      }
    )
  },
  grain_rye_raw: {
    containerId: 'grain_pack_pouch',
    liquidId: 'grain_rye',
    amountMl: 1000,
    attributes: attr(
      'Зерно ржи озимой цельное',
      '100% очищенные зёрна озимой ржи (Secale cereale)',
      'Сбор спелого урожая, веяние, оптическая очистка и просушка зерна',
      'Приготовление ржаного солода, домашнего хлебного кваса, каш и обдирной муки',
      'При проращивании и томлении зерно ржи образует фермент диастазу, осахаривающую крахмал в ароматный сладкий солод',
      '#a16207',
      {
        culinaryEquivalentId: 'grain_rye_raw',
        productShapeRu: 'Удлинённое узкое цельное зерно',
        grainGradeRu: 'Продовольственное озимое зерно 1 класса',
        surfaceTextureRu: 'Матовая волокнистая оболочка',
        cookingTimeMin: '50–60 мин',
        glutenFree: false,
        proteinPer100g: 10.3
      }
    )
  },
  grain_oats: {
    containerId: 'grain_pack_box',
    liquidId: 'grain_oats',
    amountMl: 800,
    attributes: attr(
      'Хлопья овсяные «Геркулес» традиционные',
      '100% цельное пропаренное зерно голозёрного и плёнчатого овса',
      'Шелушение, пропаривание паром и плющение на гладких вальцах в крупные лепестки',
      'Утренняя овсяная каша на молоке или воде, овсяное печенье, гранола и овсяный кисель',
      'Плющение ускоряет варку в 4 раза, сохраняя растворимые бета-глюканы, которые обволакивают желудок и дают долгую сытость',
      '#fde68a',
      {
        culinaryEquivalentId: 'grain_oats',
        productShapeRu: 'Крупные плющеные лепестки-хлопья',
        grainGradeRu: 'Традиционные №1 (долговарка)',
        surfaceTextureRu: 'Плоские бархатистые хлопья',
        cookingTimeMin: '15–20 мин',
        glutenFree: false,
        proteinPer100g: 12.5
      }
    )
  },
  spelt_whole_grain: {
    containerId: 'grain_pack_box',
    liquidId: 'grain_spelt',
    amountMl: 750,
    attributes: attr(
      'Полба цельнозерновая (Спельта старинная)',
      '100% зёрна древней плёнчатой пшеницы-полбы (Triticum spelta)',
      'Бережная обдирка плотной защитной плёнки без шлифовки ценного ядра',
      'Ароматная каша «как из русской печи», полбяной плов с грибами и деревенские супы',
      'Дикий предок современной пшеницы с насыщенным ореховым вкусом, высоким содержанием белка и низким гликемическим индексом',
      '#b45309',
      {
        culinaryEquivalentId: 'grain_wheat_raw',
        productShapeRu: 'Крупное удлинённое нешлифованное зерно',
        grainGradeRu: 'Отборная цельнозерновая крупа',
        surfaceTextureRu: 'Полушлифованная янтарная оболочка',
        cookingTimeMin: '35–40 мин',
        glutenFree: false,
        proteinPer100g: 14.6
      }
    )
  },
  rice_basmati: {
    containerId: 'grain_pack_pouch',
    liquidId: 'rice',
    amountMl: 1000,
    attributes: attr(
      'Рис Басмати длиннозёрный ароматный',
      '100% выдержанное длинное зерно индийского риса Басмати',
      'Бережная шлифовка и годичная выдержка сухого зерна в проветриваемых хранилищах',
      'Узбекский и индийский плов, рассыпчатые восточные гарниры, бирьяни и карри',
      'Благодаря годичной выдержке зёрна при варке удлиняются вдвое, не слипаются и источают тонкий орехово-сливочный аромат',
      '#f8fafc',
      {
        culinaryEquivalentId: 'rice_basmati',
        productShapeRu: 'Тонкое длинное игольчатое зерно',
        grainGradeRu: 'Экстра длиннозёрный (выдержка 12 мес.)',
        surfaceTextureRu: 'Гладкая полированная',
        cookingTimeMin: '12–15 мин',
        glutenFree: true,
        proteinPer100g: 7.5
      }
    )
  },
  rice_arborio: {
    containerId: 'grain_pack_box',
    liquidId: 'rice',
    amountMl: 750,
    attributes: attr(
      'Рис Арборио круглозёрный для ризотто',
      '100% крупное полупрозрачное зерно итальянского риса сорта Арборио с белой сердцевиной',
      'Мягкая шлифовка с сохранением поверхностного слоя амилопектинового крахмала',
      'Сливочное ризотто с белыми грибами, молочная рисовая каша, пудинги и голубцы',
      'Внешний слой зерна отдаёт в бульон бархатистый крахмал, а плотное ядро внутри сохраняет упругость «аль денте»',
      '#f1f5f9',
      {
        culinaryEquivalentId: 'rice_arborio',
        productShapeRu: 'Крупное овально-округлое жемчужное зерно',
        grainGradeRu: 'Итальянский сорт Superfino для ризотто',
        surfaceTextureRu: 'Крахмалистая полуматовая',
        cookingTimeMin: '18–20 мин',
        glutenFree: true,
        proteinPer100g: 6.9
      }
    )
  },
  rice_white: {
    containerId: 'grain_pack_pouch',
    liquidId: 'rice',
    amountMl: 1000,
    attributes: attr(
      'Рис круглозёрный японский шлифованный (для суши)',
      '100% отборное круглое зерно японского риса сорта Косихикари с высоким содержанием амилопектина',
      'Многоступенчатая бережная полировка зерна для чистого вкуса и идеальной клейкости при варке',
      'Лепка суши нигири, роллов маки, онигири, поке и нежных молочных каш',
      'Высокая доля разветвлённого крахмала позволяет зёрнам прочно держаться вместе в ролле, оставаясь упругими и глянцевыми',
      '#ffffff',
      {
        culinaryEquivalentId: 'rice_arborio',
        productShapeRu: 'Короткое округлое зерно',
        grainGradeRu: 'Премиум Косихикари (клейкий)',
        surfaceTextureRu: 'Белоснежная глянцевая шлифовка',
        cookingTimeMin: '15 мин + 10 мин под крышкой',
        glutenFree: true,
        proteinPer100g: 6.5
      }
    )
  },
  rice_brown_whole: {
    containerId: 'grain_pack_pouch',
    liquidId: 'rice',
    amountMl: 900,
    attributes: attr(
      'Рис бурый нешлифованный цельнозерновой',
      '100% длиннозёрный рис с сохранённой отрубевой оболочкой',
      'Удаление только внешней цветочной шелухи без полировки питательной коричневой оболочки',
      'Диетические гарниры, боулы, плов с овощами и сбалансированное спортивное питание',
      'Сохраняет витамины группы B, магний и пищевые волокна, обладает плотной текстурой и лёгким ореховым вкусом',
      '#b08968',
      {
        culinaryEquivalentId: 'rice_basmati',
        productShapeRu: 'Цельное длинное зерно в отрубевой оболочке',
        grainGradeRu: 'Нешлифованный цельнозерновой',
        surfaceTextureRu: 'Матовая отрубевая оболочка',
        cookingTimeMin: '30–35 мин',
        glutenFree: true,
        proteinPer100g: 7.9
      }
    )
  },
  rice_jasmine: {
    containerId: 'grain_pack_pouch',
    liquidId: 'rice',
    amountMl: 900,
    attributes: attr(
      'Рис Жасмин тайский ароматный',
      '100% отборный длиннозёрный тайский рис сорта Хом Мали',
      'Деликатная шлифовка без пропаривания для сохранения природного цветочного аромата',
      'Тайское карри, том-ям, жареный рис в воке, блюда с кокосовым молоком и рыбой',
      'При варке зёрна слегка сцепляются друг с другом, оставаясь белоснежными, мягкими и благоухающими нотками жасмина',
      '#fffbeb',
      {
        culinaryEquivalentId: 'rice_basmati',
        productShapeRu: 'Длинное тонкое белое зерно',
        grainGradeRu: 'Тайский Hom Mali, высший сорт',
        surfaceTextureRu: 'Шелковистая тонкая шлифовка',
        cookingTimeMin: '12–15 мин',
        glutenFree: true,
        proteinPer100g: 7.2
      }
    )
  },
  rice_wild_black: {
    containerId: 'grain_pack_box',
    liquidId: 'rice',
    amountMl: 600,
    attributes: attr(
      'Рис дикий чёрный (Цицания водная)',
      '100% семена дикого болотного злака Zizania aquatica',
      'Сбор с воды, лёгкое прокаливание для аромата и естественная сушка',
      'Ресторанные гарниры к утке и рыбе, смеси с белым рисом, тёплые салаты с орехами',
      'Ботанически является диким водным злаком с рекордным содержанием белка, антиоксидантов и ярким дымно-ореховым вкусом',
      '#27272a',
      {
        culinaryEquivalentId: 'rice_basmati',
        productShapeRu: 'Очень длинные тонкие тёмные иголочки',
        grainGradeRu: 'Деликатесный отборный',
        surfaceTextureRu: 'Плотная глянцевая тёмная кожура',
        cookingTimeMin: '40–45 мин',
        glutenFree: true,
        proteinPer100g: 14.7,
        secondaryColor: '#52525b'
      }
    )
  },
  buckwheat_roasted: {
    containerId: 'grain_pack_pouch',
    liquidId: 'buckwheat',
    amountMl: 1000,
    attributes: attr(
      'Крупа гречневая ядрица быстроразваривающаяся',
      '100% цельные ядра гречихи посевной (Fagopyrum esculentum)',
      'Гидротермическая обработка паром под давлением, лущение гранёной шелухи и обжарка',
      'Рассыпчатая гречневая каша с маслом, греча по-купечески с мясом и грибами, супы',
      'Пропаривание и обжарка укрепляют ядро, чтобы каша получалась пушистой, зернистой и с насыщенным ореховым духом',
      '#92400e',
      {
        culinaryEquivalentId: 'buckwheat_roasted',
        productShapeRu: 'Цельное трёхгранное ядро (ядрица)',
        grainGradeRu: 'Ядрица 1 сорт (пропаренная обжаренная)',
        surfaceTextureRu: 'Гранёное матовое ядро',
        cookingTimeMin: '15–18 мин',
        glutenFree: true,
        proteinPer100g: 12.6
      }
    )
  },
  buckwheat_green: {
    containerId: 'grain_pack_box',
    liquidId: 'buckwheat',
    amountMl: 800,
    attributes: attr(
      'Гречка зелёная живая необжаренная',
      '100% сырые необжаренные ядра зелёной гречихи',
      'Холодное механическое лущение без пропарки и термической обжарки',
      'Проращивание, нежная кремовая каша, безглютеновый хлеб на закваске и смузи-боулы',
      'Отсутствие обжарки сохраняет способность к прорастанию, максимум рутина и мягкий травянисто-ореховый вкус',
      '#a3a86b',
      {
        culinaryEquivalentId: 'buckwheat_roasted',
        productShapeRu: 'Цельное светло-зелёное трёхгранное ядро',
        grainGradeRu: 'Высший сорт для варки и проращивания',
        surfaceTextureRu: 'Сырое нежное ядро без обжарки',
        cookingTimeMin: '12–15 мин',
        glutenFree: true,
        proteinPer100g: 13.3
      }
    )
  },
  barley_pearl: {
    containerId: 'grain_pack_pouch',
    liquidId: 'barley_pearl',
    amountMl: 1000,
    attributes: attr(
      'Крупа перловая шлифованная №1',
      '100% ядра отборного посевного ячменя (Hordeum vulgare)',
      'Освобождение от цветочных плёнок и многократная шлифовка до гладких «жемчужин»',
      'Классический рассольник с солёными огурцами, грибной суп, перлотто и каша с тушёнкой',
      'Название происходит от слова «перл» (жемчуг) — при долгом томлении зёрна набухают втрое и остаются приятно упругими',
      '#d6d3d1',
      {
        culinaryEquivalentId: 'barley_pearl',
        productShapeRu: 'Округло-овальное шлифованное зерно-жемчужина',
        grainGradeRu: '№1 крупная шлифованная',
        surfaceTextureRu: 'Гладкая полированная с тёмной бороздкой',
        cookingTimeMin: '45–55 мин',
        glutenFree: false,
        proteinPer100g: 9.3
      }
    )
  },
  barley_crushed_yachka: {
    containerId: 'grain_pack_pouch',
    liquidId: 'barley_crushed',
    amountMl: 900,
    attributes: attr(
      'Крупа ячневая дроблёная №2',
      '100% дроблёные нешлифованные ядра ячменя',
      'Очистка от цветочных плёнок и дробление ячменного ядра на мелкие гранулы без шлифовки',
      'Вязкая сливочная ячневая каша, биточки, запеканки и наваристые похлёбки',
      'В отличие от перловки, ячка не шлифуется и сохраняет всю клетчатку оболочки, но варится втрое быстрее',
      '#d9cbb8',
      {
        culinaryEquivalentId: 'barley_pearl',
        productShapeRu: 'Мелкие угловатые дроблёные частицы',
        grainGradeRu: '№2 среднедроблёная нешлифованная',
        surfaceTextureRu: 'Шероховатая дроблёная крупка',
        cookingTimeMin: '15–20 мин',
        glutenFree: false,
        proteinPer100g: 10.0
      }
    )
  },
  millet_yellow: {
    containerId: 'grain_pack_pouch',
    liquidId: 'millet',
    amountMl: 900,
    attributes: attr(
      'Пшено шлифованное золотистое высшего сорта',
      '100% очищенные ядра культурного проса (Panicum miliaceum)',
      'Обдирка жёстких оболочек проса и полировка мелких круглых жёлтых ядер',
      'Сливочная пшённая каша с тыквой, полевой кулеш с салом и рыбацкая уха',
      'Богато кремнием, железом и калием, согревающими и восстанавливающими силы после тяжёлой работы',
      '#facc15',
      {
        culinaryEquivalentId: 'millet_yellow',
        productShapeRu: 'Мелкие круглые шарики-зёрнышки',
        grainGradeRu: 'Шлифованное высший сорт',
        surfaceTextureRu: 'Ярко-жёлтая гладкая шлифовка',
        cookingTimeMin: '20–25 мин',
        glutenFree: true,
        proteinPer100g: 11.5
      }
    )
  },
  semolina_wheat: {
    containerId: 'grain_pack_pouch',
    liquidId: 'semolina',
    amountMl: 800,
    attributes: attr(
      'Крупа манная пшеничная (марка Т — из твёрдой пшеницы)',
      '100% крупно размолотая центральная часть эндосперма твёрдой пшеницы',
      'Сортовой помол пшеницы с отбором чистой янтарной крупки диаметром 0.25–0.75 мм',
      'Нежная молочная манная каша без комочков, творожные запеканки, манник, ньокки и панировка',
      'Отсутствие грубой клетчатки позволяет манке свариться за 3–5 минут и быстро дать энергию',
      '#fef08a',
      {
        culinaryEquivalentId: 'semolina_wheat',
        productShapeRu: 'Мельчайшая сыпучая крупка 0.3–0.7 мм',
        grainGradeRu: 'Марка Т (из твёрдых сортов пшеницы)',
        surfaceTextureRu: 'Сыпучий мелкий гранулят',
        cookingTimeMin: '4–5 мин',
        glutenFree: false,
        proteinPer100g: 11.3
      }
    )
  },
  bulgur_golden: {
    containerId: 'grain_pack_pouch',
    liquidId: 'bulgur',
    amountMl: 900,
    attributes: attr(
      'Булгур золотистый среднезерновой (Пилафлык)',
      '100% дроблёное зерно твёрдой пшеницы (дурум), обработанное паром',
      'Варка цельной пшеницы на пару, просушка на солнце, снятие отрубей и дробление',
      'Турецкий плов с вермишелью и томатами, салат табуле, фаршированные перцы и харчо',
      'Предварительная пропаренность придаёт булгуру янтарный цвет, нежный ореховый аромат и рассыпчатость без слипания',
      '#eab308',
      {
        culinaryEquivalentId: 'grain_wheat_raw',
        productShapeRu: 'Крупные янтарные дроблёные зёрна',
        grainGradeRu: 'Средняя фракция (Pilavlik)',
        surfaceTextureRu: 'Стекловидные пропаренные грани',
        cookingTimeMin: '15–18 мин',
        glutenFree: false,
        proteinPer100g: 12.3
      }
    )
  },
  couscous_moroccan: {
    containerId: 'grain_pack_box',
    liquidId: 'couscous',
    amountMl: 750,
    attributes: attr(
      'Кускус марокканский средний из твёрдой пшеницы',
      '100% семолина из твёрдой пшеницы, вода',
      'Скатывание увлажнённой манной крупки в ровные шарики 1–1.5 мм, пропаривание и просушка',
      'Быстрый гарнир с овощами и нутом, марокканский тажин с бараниной, тёплые салаты',
      'Благодаря предварительной паровой обработке кускус достаточно залить кипятком на 5 минут — и он станет воздушным',
      '#fde047',
      {
        culinaryEquivalentId: 'semolina_wheat',
        productShapeRu: 'Ровные мелкие гранулы-шарики 1.2 мм',
        grainGradeRu: 'Средний (Medium) из дурум-семолины',
        surfaceTextureRu: 'Гладкие пропаренные шарики',
        cookingTimeMin: '5 мин (запаривание кипятком)',
        glutenFree: false,
        proteinPer100g: 12.8
      }
    )
  },
  corn_grits_polenta: {
    containerId: 'grain_pack_pouch',
    liquidId: 'corn_grits',
    amountMl: 900,
    attributes: attr(
      'Крупа кукурузная золотая (для поленты и мамалыги)',
      '100% дроблёный эндосперм кремнистой жёлтой кукурузы',
      'Очистка зёрен от оболочки и зародыша, помол и калибровка до ровной солнечной крупки',
      'Итальянская полента с пармезаном, молдавская мамалыга с брынзой, сладкая кукурузная каша',
      'Не содержит глютен, богата каротиноидами и придаёт блюдам яркий солнечный цвет и сладковатый аромат',
      '#f59e0b',
      {
        culinaryEquivalentId: 'millet_yellow',
        productShapeRu: 'Мелкая ярко-жёлтая дроблёная крупка',
        grainGradeRu: 'Шлифованная №4 (мелкая полента)',
        surfaceTextureRu: 'Сыпучая зернистая крупка',
        cookingTimeMin: '20–25 мин',
        glutenFree: true,
        proteinPer100g: 8.3
      }
    )
  },
  quinoa_white_tricolor: {
    containerId: 'grain_pack_box',
    liquidId: 'quinoa',
    amountMl: 700,
    attributes: attr(
      'Киноа трёхцветная перуанская (белая, красная, чёрная)',
      'Смесь семян белой (60%), красной (25%) и чёрной (15%) андской киноа',
      'Очистка от природных сапонинов, промывка, сушка и купажирование трёх сортов',
      'Боулы с авокадо и лососем, тёплые овощные салаты, фитнес-гарниры и супы',
      'Содержит полный профиль незаменимых аминокислот; при варке из семян раскрываются хрустящие белые спиральки',
      '#e7e5e4',
      {
        culinaryEquivalentId: 'quinoa_white_tricolor',
        productShapeRu: 'Мелкие плоские диски-семена (трёхцветная смесь)',
        grainGradeRu: 'Органический микс Royal Tricolor',
        surfaceTextureRu: 'Тонкая хрустящая оболочка',
        cookingTimeMin: '15 мин',
        glutenFree: true,
        proteinPer100g: 14.1,
        secondaryColor: '#991b1b'
      }
    )
  },
  peas_split_yellow: {
    containerId: 'grain_pack_pouch',
    liquidId: 'peas_dry',
    amountMl: 950,
    attributes: attr(
      'Горох колотый шлифованный жёлтый',
      '100% зрелые сушёные семена посевного гороха (Pisum sativum)',
      'Шелушение семенной кожуры, раскалывание на две семядоли и полировка',
      'Наваристый гороховый суп с копчёными рёбрышками и густая гороховая каша-пюре',
      'Колотый горох без жёсткой шкурки разваривается в нежное бархатистое пюре даже без замачивания на ночь',
      '#eab308',
      {
        culinaryEquivalentId: 'peas_split_yellow',
        productShapeRu: 'Колотые половинки-полусферы',
        grainGradeRu: 'Колотый шлифованный 1 сорт',
        surfaceTextureRu: 'Гладкая полированная семядоля',
        cookingTimeMin: '40–50 мин',
        glutenFree: true,
        proteinPer100g: 23.0
      }
    )
  },
  beans_red_kidney: {
    containerId: 'grain_pack_pouch',
    liquidId: 'beans_dry',
    amountMl: 900,
    attributes: attr(
      'Фасоль красная зерновая сухая (Кидни)',
      '100% высушенные зёрна красной фасоли сорта Red Kidney',
      'Естественная сушка в стручках, обмолот, полировка и калибровка',
      'Грузинское лобио с кинзой и грецкими орехами, красный борщ, чили кон карне и рагу',
      'По содержанию и усвояемости белка красная фасоль близка к мясу и отлично держит форму при долгом тушении',
      '#7f1d1d',
      {
        culinaryEquivalentId: 'beans_red_kidney',
        productShapeRu: 'Крупные почковидные бобы',
        grainGradeRu: 'Отборная продовольственная',
        surfaceTextureRu: 'Глянцевая плотная бордовая кожура',
        cookingTimeMin: '60–80 мин (после замачивания)',
        glutenFree: true,
        proteinPer100g: 21.6
      }
    )
  },
  beans_white_lima: {
    containerId: 'grain_pack_pouch',
    liquidId: 'beans_dry',
    amountMl: 900,
    attributes: attr(
      'Фасоль белая крупная маслянистая (Лима)',
      '100% крупные белые бобы фасоли Лима (Phaseolus lunatus)',
      'Сушка, бережная очистка и калибровка зрелых крупных бобов',
      'Густые белые супы, запечённая фасоль в томатном соусе, паштеты и тёплые салаты',
      'При варке приобретает нежную сливочно-кремовую сердцевину, за что её называют «масляной фасолью»',
      '#f8fafc',
      {
        culinaryEquivalentId: 'beans_white_lima',
        productShapeRu: 'Крупные плоские белые бобы',
        grainGradeRu: 'Крупноплодная отборная Лима',
        surfaceTextureRu: 'Тонкая кремово-белая кожура',
        cookingTimeMin: '50–65 мин (после замачивания)',
        glutenFree: true,
        proteinPer100g: 21.5
      }
    )
  },
  lentils_red_dry: {
    containerId: 'grain_pack_pouch',
    liquidId: 'lentils',
    amountMl: 800,
    attributes: attr(
      'Чечевица красная колотая (Футбол)',
      '100% очищенные от оболочки зёрна красной чечевицы',
      'Шелушение и шлифовка плоских оранжево-красных семядолей',
      'Турецкий чечевичный крем-суп с лимоном, индийский дал и быстрые белковые гарниры',
      'Единственная из бобовых, которая варится всего 12–15 минут без замачивания и даёт нежную кремовую консистенцию',
      '#ea580c',
      {
        culinaryEquivalentId: 'lentils_red_dry',
        productShapeRu: 'Мелкие плоские оранжевые диски-половинки',
        grainGradeRu: 'Шлифованная колотая высшего сорта',
        surfaceTextureRu: 'Бархатистая без оболочки',
        cookingTimeMin: '12–15 мин',
        glutenFree: true,
        proteinPer100g: 24.6
      }
    )
  },
  lentils_green_dry: {
    containerId: 'grain_pack_pouch',
    liquidId: 'lentils',
    amountMl: 800,
    attributes: attr(
      'Чечевица зелёная цельная тарелочная',
      '100% цельные зёрна зелёной чечевицы в тонкой оболочке',
      'Бережная сушка, веяние и калибровка цельного зерна',
      'Сытные гарниры с беконом и луком, похлёбки, рагу и тёплые средиземноморские салаты',
      'В отличие от красной, не разваривается в пюре, сохраняет упругую форму и лёгкий орехово-грибной привкус',
      '#65a30d',
      {
        culinaryEquivalentId: 'lentils_green_dry',
        productShapeRu: 'Плоские чечевичные зёрна в оболочке',
        grainGradeRu: 'Тарелочная крупная цельная',
        surfaceTextureRu: 'Тонкая оливково-зелёная кожура',
        cookingTimeMin: '25–30 мин',
        glutenFree: true,
        proteinPer100g: 24.0
      }
    )
  },
  chickpeas_garbanzo_dry: {
    containerId: 'grain_pack_pouch',
    liquidId: 'chickpeas',
    amountMl: 900,
    attributes: attr(
      'Нут крупный турецкий горох (Гарбанзо)',
      '100% крупные фигурные зёрна бараньего гороха (Cicer arietinum)',
      'Высушивание на солнце, очистка и калибровка крупных зёрен (8–9 мм)',
      'Узбекский плов, шурпа, бозбаш, классический хумус с тахини и хрустящий фалафель',
      'После замачивания и варки нут становится маслянистым, ореховым и впитывает весь мясной и пряный аромат зирвака',
      '#fcd34d',
      {
        culinaryEquivalentId: 'chickpeas_garbanzo_dry',
        productShapeRu: 'Крупные округлые зёрна с характерным «носиком»',
        grainGradeRu: 'Крупнозерновой турецкий (калибр 9 мм)',
        surfaceTextureRu: 'Рельефная светло-бежевая оболочка',
        cookingTimeMin: '60–90 мин (после замачивания)',
        glutenFree: true,
        proteinPer100g: 19.3
      }
    )
  },
  mung_beans_green: {
    containerId: 'grain_pack_pouch',
    liquidId: 'mung_beans',
    amountMl: 850,
    attributes: attr(
      'Маш зелёный отборный (Золотистая фасоль Мунг)',
      '100% мелкие цельные зелёные бобы маш (Vigna radiata)',
      'Естественная сушка, очистка и полировка мелких бобов',
      'Узбекский машкичири и машхурда, индийский кичари, азиатские ростки для вока',
      'Быстро разваривается без замачивания, легко усваивается и даёт хрустящие сочные проростки за 2–3 дня',
      '#4d7c0f',
      {
        culinaryEquivalentId: 'lentils_green_dry',
        productShapeRu: 'Мелкие овальные зелёные бобы с белым глазком',
        grainGradeRu: 'Высший сорт (для варки и проращивания)',
        surfaceTextureRu: 'Гладкая глянцевая зелёная кожура',
        cookingTimeMin: '30–35 мин',
        glutenFree: true,
        proteinPer100g: 23.9
      }
    )
  },

  // === 17.5. PASTA PRODUCTS (МАКАРОННЫЕ ИЗДЕЛИЯ — СЫПУЧИЕ) ===
  pasta_spaghetti_durum: {
    containerId: 'pasta_pack_long',
    liquidId: 'pasta',
    amountMl: 850,
    attributes: attr(
      'Спагетти №5 из твёрдых сортов пшеницы',
      'Мука из твёрдой пшеницы высшего сорта (дурум), очищенная питьевая вода',
      'Экструзия крутого теста через круглые матрицы и медленная низкотемпературная сушка',
      'Паста болоньезе, карбонара, алио э олио, песто и томатные соусы',
      'Высокое содержание стекловидного белка позволяет спагетти сохранять упругость «аль денте» и не слипаться при варке',
      '#facc15',
      {
        culinaryEquivalentId: 'pasta_spaghetti_durum',
        productShapeRu: 'Длинные тонкие круглые нити (№5, Ø 1.8 мм)',
        pastaShapeId: 'spaghetti',
        grainGradeRu: 'Группа А, высший сорт (100% Дурум)',
        surfaceTextureRu: 'Гладкая золотистая',
        cookingTimeMin: '8–9 мин (al dente)',
        glutenFree: false,
        proteinPer100g: 13.0
      }
    )
  },
  pasta_penne_rigate: {
    containerId: 'pasta_pack_bag',
    liquidId: 'pasta',
    amountMl: 850,
    attributes: attr(
      'Пенне Ригате (перья рифлёные) из твёрдой пшеницы',
      'Мука из твёрдой пшеницы (дурум), питьевая вода',
      'Формовка полых рифлёных трубочек с косым срезом и ступенчатая сушка',
      'Паста арраббиата, сливочно-грибной соус, запеканки под сырной корочкой и мясное рагу',
      'Наружные продольные канавки и полая сердцевина идеально захватывают и удерживают густые соусы и тёртый сыр',
      '#fde047',
      {
        culinaryEquivalentId: 'pasta_penne_rigate',
        productShapeRu: 'Полые трубочки-перья с косым срезом',
        pastaShapeId: 'penne',
        grainGradeRu: 'Группа А, высший сорт (100% Дурум)',
        surfaceTextureRu: 'Рифлёная (Rigate)',
        cookingTimeMin: '10–11 мин',
        glutenFree: false,
        proteinPer100g: 13.0
      }
    )
  },
  pasta_fusilli_tricolor: {
    containerId: 'pasta_pack_bag',
    liquidId: 'pasta',
    amountMl: 850,
    attributes: attr(
      'Фузилли триколор (спиральки со шпинатом и томатом)',
      'Мука из твёрдой пшеницы (дурум), вода, порошок сушёного шпината (3%), томатный порошок (3%)',
      'Замес трёх видов овощного теста, формовка тройных спиралей и бережная сушка',
      'Паста с соусом песто, тёплые и холодные паста-салаты, сырные и овощные гарниры',
      'Витки спирали задерживают мелкие кусочки зелени и соуса, а натуральный шпинат и томат придают яркий цвет без красителей',
      '#fde047',
      {
        culinaryEquivalentId: 'pasta_fusilli_tricolor',
        productShapeRu: 'Трёхлопастные витые спиральки (триколор)',
        pastaShapeId: 'fusilli',
        grainGradeRu: 'Группа А, высший сорт с овощными добавками',
        surfaceTextureRu: 'Спиральная с глубокими витками',
        cookingTimeMin: '9–10 мин',
        glutenFree: false,
        proteinPer100g: 12.8,
        secondaryColor: '#22c55e'
      }
    )
  },
  pasta_farfalle_bow: {
    containerId: 'pasta_pack_bag',
    liquidId: 'pasta',
    amountMl: 850,
    attributes: attr(
      'Фарфалле (бантики / бабочки) из твёрдой пшеницы',
      'Мука из твёрдой пшеницы (дурум), очищенная вода',
      'Раскатка теста, фигурная резка зубчатым краем и защипывание по центру',
      'Сливочная паста с лососем и шпинатом, лёгкие соусы с зелёным горошком и сыром',
      'Плотная защипнутая серединка остаётся упругой, а тонкие «крылышки» бантика нежно пропитываются сливочным соусом',
      '#fef08a',
      {
        culinaryEquivalentId: 'pasta_farfalle_bow',
        productShapeRu: 'Фигурные бантики с зубчатым краем',
        pastaShapeId: 'farfalle',
        grainGradeRu: 'Группа А, высший сорт (100% Дурум)',
        surfaceTextureRu: 'Гладкая с фигурным рельефным защипом',
        cookingTimeMin: '10–11 мин',
        glutenFree: false,
        proteinPer100g: 12.5
      }
    )
  },
  pasta_conchiglie_shells: {
    containerId: 'pasta_pack_bag',
    liquidId: 'pasta',
    amountMl: 850,
    attributes: attr(
      'Конкилье Ригате (ракушки рифлёные)',
      'Мука из твёрдой пшеницы (дурум), очищенная вода',
      'Штамповка полых раковин с наружным рельефом и мягкая сушка',
      'Макароны по-флотски, томатные и мясные соусы, сырный соус «Мак энд Чиз»',
      'Форма морской ракушки работает как мини-ложечка, собирая внутрь фарш, горошек и густой соус',
      '#fde047',
      {
        culinaryEquivalentId: 'pasta_conchiglie_shells',
        productShapeRu: 'Полые ракушки среднего размера',
        pastaShapeId: 'conchiglie',
        grainGradeRu: 'Группа А, высший сорт (100% Дурум)',
        surfaceTextureRu: 'Ребристая наружная (Rigate)',
        cookingTimeMin: '10–12 мин',
        glutenFree: false,
        proteinPer100g: 13.0
      }
    )
  },
  pasta_macaroni_elbows: {
    containerId: 'pasta_pack_bag',
    liquidId: 'pasta',
    amountMl: 900,
    attributes: attr(
      'Рожки классические (Макарони / Элбоу)',
      'Мука из твёрдой пшеницы (дурум), питьевая вода',
      'Экструзия изогнутых коротких трубочек и равномерная сушка',
      'Домашние макароны с сыром, макароны по-флотски с тушёнкой, молочный суп и гарнир к котлетам',
      'Универсальный повседневный формат: быстро варятся, отлично держат сливочное масло и расплавленный чеддер',
      '#facc15',
      {
        culinaryEquivalentId: 'pasta_macaroni_elbows',
        productShapeRu: 'Короткие изогнутые полые трубочки-рожки',
        pastaShapeId: 'macaroni',
        grainGradeRu: 'Группа А, высший сорт (100% Дурум)',
        surfaceTextureRu: 'Гладкая (Lisce)',
        cookingTimeMin: '7–8 мин',
        glutenFree: false,
        proteinPer100g: 12.5
      }
    )
  },
  pasta_vermicelli_fine: {
    containerId: 'pasta_pack_bag',
    liquidId: 'pasta',
    amountMl: 800,
    attributes: attr(
      'Вермишель тонкая яичная «Паутинка»',
      'Мука из твёрдой пшеницы высшего сорта, свежие куриные яйца (15%), вода',
      'Тонкая экструзия на яичном тесте, нарезка короткими нитями и деликатная сушка',
      'Прозрачный куриный суп с вермишелью, молочный суп и быстрый утренний гарнир',
      'Добавление куриного яйца придаёт вермишели насыщенный золотистый цвет, нежный вкус и стойкость в горячем бульоне',
      '#fbbf24',
      {
        culinaryEquivalentId: 'pasta_vermicelli_fine',
        productShapeRu: 'Короткие сверхтонкие нити-паутинка (Ø 1.0 мм)',
        pastaShapeId: 'vermicelli',
        grainGradeRu: 'Группа А яичная высшего сорта',
        surfaceTextureRu: 'Гладкая тонкая яичная',
        cookingTimeMin: '3–4 мин',
        glutenFree: false,
        proteinPer100g: 14.0
      }
    )
  },
  pasta_tagliatelle_nests: {
    containerId: 'grain_pack_box',
    liquidId: 'pasta',
    amountMl: 750,
    attributes: attr(
      'Тальятелле яичные в гнёздах (Паста фреска сушёная)',
      'Мука из твёрдой пшеницы семолина (72%), свежие куриные яйца (28%)',
      'Тонкая раскатка теста, нарезка плоских лент шириной 7 мм, свивка в порционные гнёзда и сушка',
      'Классическое болоньезе по-болонски, грибной соус со сливками и трюфелем, рагу из утки',
      'Высокий процент яичного желтка и шероховатая лента придают пасте ресторанную шёлковость и богатый вкус',
      '#f59e0b',
      {
        culinaryEquivalentId: 'pasta_tagliatelle_nests',
        productShapeRu: 'Плоские широкие ленты, свёрнутые в гнёзда',
        pastaShapeId: 'tagliatelle',
        grainGradeRu: 'Группа А яичная премиум (28% яиц)',
        surfaceTextureRu: 'Пористая шероховатая лента',
        cookingTimeMin: '6–7 мин',
        glutenFree: false,
        proteinPer100g: 15.2
      }
    )
  },
  pasta_rigatoni_bronze: {
    containerId: 'pasta_pack_bag',
    liquidId: 'pasta',
    amountMl: 850,
    attributes: attr(
      'Ригатони Трафилата аль Бронзо (крупные рифлёные трубы)',
      'Мука грубого помола из твёрдой пшеницы (семолина), родниковая вода',
      'Медленная экструзия через бронзовые матрицы (Trafilatura al bronzo) и сушка 18 часов при 45°C',
      'Паста алла карбонара, аматричана, густое говяжье рагу и запеканка «Ригатони аль форно»',
      'Бронзовая матрица оставляет поверхность матово-шероховатой, словно бархат, благодаря чему соус буквально «прилипает» к пасте',
      '#fef3c7',
      {
        culinaryEquivalentId: 'pasta_rigatoni_bronze',
        productShapeRu: 'Крупные широкие рифлёные цилиндры с прямым срезом',
        pastaShapeId: 'rigatoni',
        grainGradeRu: 'Группа А ремесленная (Бронзовая матрица)',
        surfaceTextureRu: 'Матовая шероховатая бронзовая (Al Bronzo)',
        cookingTimeMin: '12–13 мин',
        glutenFree: false,
        proteinPer100g: 14.0
      }
    )
  },
  pasta_orzo_risoni: {
    containerId: 'pasta_pack_bag',
    liquidId: 'pasta',
    amountMl: 850,
    attributes: attr(
      'Орзо / Ризони (паста в форме рисовых зёрен)',
      'Мука из твёрдой пшеницы (дурум), очищенная вода',
      'Формовка мелких удлинённых зёрен-капель и сушка горячим воздухом',
      'Средиземноморские супы (минестроне, авголемоно), паста-ризотто с морепродуктами, греческие салаты',
      'Внешне напоминает крупный рис или ячмень, но готовится за 8 минут и обладает нежной упругой текстурой пасты',
      '#fde68a',
      {
        culinaryEquivalentId: 'pasta_orzo_risoni',
        productShapeRu: 'Мелкие овальные зёрнышки (форма риса)',
        pastaShapeId: 'orzo',
        grainGradeRu: 'Группа А, высший сорт (100% Дурум)',
        surfaceTextureRu: 'Гладкая каплевидная',
        cookingTimeMin: '8–9 мин',
        glutenFree: false,
        proteinPer100g: 12.8
      }
    )
  },
  pasta_spaghetti_wholewheat: {
    containerId: 'pasta_pack_long',
    liquidId: 'pasta',
    amountMl: 850,
    attributes: attr(
      'Спагетти цельнозерновые (Integrale)',
      'Цельнозерновая мука из твёрдой пшеницы с отрубями, питьевая вода',
      'Помол целого пшеничного зерна без просеивания отрубей, экструзия и бережная сушка',
      'Сбалансированная паста с овощами гриль, песто, оливковым маслом и морепродуктами',
      'Богаты пищевыми волокнами (8 г клетчатки на 100 г), обладают тёплым хлебно-ореховым ароматом и низким гликемическим индексом',
      '#a16207',
      {
        culinaryEquivalentId: 'pasta_spaghetti_durum',
        productShapeRu: 'Длинные тонкие круглые нити (цельнозерновые)',
        pastaShapeId: 'spaghetti',
        grainGradeRu: 'Группа А цельнозерновая (Integrale)',
        surfaceTextureRu: 'Шероховатая с вкраплениями отрубей',
        cookingTimeMin: '9–10 мин',
        glutenFree: false,
        proteinPer100g: 14.5
      }
    )
  },
  pasta_spaghetti_black_ink: {
    containerId: 'pasta_pack_long',
    liquidId: 'pasta',
    amountMl: 800,
    attributes: attr(
      'Спагетти чёрные с чернилами каракатицы (Nero di Seppia)',
      'Мука из твёрдой пшеницы (дурум), очищенная вода, натуральные чернила каракатицы (3%), морская соль',
      'Замес теста с чернилами каракатицы, формовка на бронзовых матрицах и медленная сушка',
      'Паста с креветками, кальмарами и мидиями в сливочно-чесночном или беловинно-томатном соусе',
      'Натуральные чернила каракатицы придают спагетти глубокий угольно-чёрный цвет и деликатный солоноватый морской вкус',
      '#1e293b',
      {
        culinaryEquivalentId: 'pasta_spaghetti_durum',
        productShapeRu: 'Длинные чёрные круглые спагетти',
        pastaShapeId: 'spaghetti',
        grainGradeRu: 'Группа А деликатесная (Бронзовая матрица)',
        surfaceTextureRu: 'Матовая угольно-чёрная шероховатая',
        cookingTimeMin: '8–9 мин',
        glutenFree: false,
        proteinPer100g: 13.5,
        secondaryColor: '#334155'
      }
    )
  },
  pasta_soba_buckwheat: {
    containerId: 'pasta_pack_long',
    liquidId: 'pasta',
    amountMl: 800,
    attributes: attr(
      'Лапша гречневая Соба японская',
      'Мука гречневая (65%), мука пшеничная хлебопекарная (33%), вода, морская соль',
      'Замес гречневого теста, тонкая нарезка прямых плоских полосок и естественная сушка',
      'Азиатский вок с курицей и соусом терияки, холодная соба с соусом цую, горячие супы с даси',
      'Гречневая мука дарит лапше землисто-ореховый аромат, серо-коричневый оттенок и лёгкость усвоения',
      '#8d7055',
      {
        culinaryEquivalentId: 'pasta_spaghetti_durum',
        productShapeRu: 'Длинные тонкие плоские ленты лапши (Соба)',
        pastaShapeId: 'spaghetti',
        grainGradeRu: 'Японская традиционная гречневая (65% гречки)',
        surfaceTextureRu: 'Матовая тонкая с крапинками гречки',
        cookingTimeMin: '4–5 мин',
        glutenFree: false,
        proteinPer100g: 13.8
      }
    )
  },
  pasta_fusilli_red_lentil: {
    containerId: 'pasta_pack_bag',
    liquidId: 'pasta',
    amountMl: 750,
    attributes: attr(
      'Фузилли из красной чечевицы (высокобелковые, без глютена)',
      '100% мука из шлифованной красной чечевицы, питьевая вода',
      'Тонкий помол красной чечевицы, паровая экструзия в спиральки и деликатная сушка',
      'Фитнес-паста с овощами и песто, томатные соусы, высокобелковые безглютеновые блюда',
      'Рекордные 25 г растительного белка на 100 г и полное отсутствие глютена; сохраняет яркий терракотовый цвет после варки',
      '#ea580c',
      {
        culinaryEquivalentId: 'pasta_fusilli_tricolor',
        productShapeRu: 'Витые спиральки терракотового цвета',
        pastaShapeId: 'fusilli',
        grainGradeRu: 'Бобовая безглютеновая (High Protein)',
        surfaceTextureRu: 'Плотная матовая спираль',
        cookingTimeMin: '6–7 мин',
        glutenFree: true,
        proteinPer100g: 25.0
      }
    )
  },
  pasta_penne_corn_rice: {
    containerId: 'pasta_pack_bag',
    liquidId: 'pasta',
    amountMl: 800,
    attributes: attr(
      'Пенне кукурузно-рисовые (Без глютена)',
      'Мука кукурузная жёлтая (70%), мука рисовая белая (30%), очищенная вода',
      'Термоэкструзия смеси кукурузной и рисовой муки через рифлёные матрицы для перьев',
      'Диетическая безглютеновая паста с любыми томатными, сырными и сливочными соусами',
      'Кукурузная мука даёт солнечный цвет и упругость, а рисовая — мягкость, позволяя не развариваться при отсутствии глютена',
      '#fcd34d',
      {
        culinaryEquivalentId: 'pasta_penne_rigate',
        productShapeRu: 'Рифлёные перья-трубочки со скошенным краем',
        pastaShapeId: 'penne',
        grainGradeRu: 'Безглютеновая (кукуруза + рис)',
        surfaceTextureRu: 'Рифлёная ярко-жёлтая',
        cookingTimeMin: '8–9 мин',
        glutenFree: true,
        proteinPer100g: 7.5
      }
    )
  },
  pasta_stelline_stars: {
    containerId: 'pasta_pack_bag',
    liquidId: 'pasta',
    amountMl: 800,
    attributes: attr(
      'Стеллине (звёздочки суповые) из твёрдой пшеницы',
      'Мука из твёрдой пшеницы высшего сорта (дурум), очищенная вода',
      'Микроэкструзия теста через фигурные матрицы-звёзды и сушка',
      'Куриный и овощной бульон, детский молочный суп, наваристая фрикадельковая похлёбка',
      'Крошечные звёздочки с отверстием в центре мгновенно провариваются в бульоне, не делая суп мутным',
      '#fef08a',
      {
        culinaryEquivalentId: 'pasta_vermicelli_fine',
        productShapeRu: 'Мелкие фигурные звёздочки с отверстием (Ø 4 мм)',
        pastaShapeId: 'stelline',
        grainGradeRu: 'Группа А суповая, высший сорт (100% Дурум)',
        surfaceTextureRu: 'Гладкая миниатюрная фигурная',
        cookingTimeMin: '5–6 мин',
        glutenFree: false,
        proteinPer100g: 12.5
      }
    )
  },

  // === 18. DRY SPICES & HERBS (СУХИЕ ПРЯНОСТИ, ТРАВЫ И СПЕЦИИ) ===
  salt_sea: {
    containerId: 'jar_spice_small',
    liquidId: 'salt',
    amountMl: 100,
    attributes: attr(
      'Соль морская крупнокристаллическая в баночке',
      'Природная морская вода',
      'Естественное выпаривание морской воды на солнце в соляных бассейнах',
      'Посол стейков, запекание рыбы в соли и финальная подача блюд',
      'Содержит природные микроэлементы моря — магний, калий, кальций и йод, делающие вкус мягче каменной соли',
      '#f8fafc',
      { culinaryEquivalentId: 'salt_sea' }
    )
  },
  black_pepper_whole: {
    containerId: 'jar_spice_small',
    liquidId: 'spice_dry',
    amountMl: 100,
    attributes: attr(
      'Перец чёрный горошком и свежемолотый в мельнице',
      'Незрелые ферментированные ягоды лианы Piper nigrum',
      'Сбор зелёных гроздей, ошпаривание и сушка на солнце до сморщивания и почернения оболочки',
      'Универсальная пряность для супов, стейков, пельменей, яичницы и маринадов',
      'Алкалоид пиперин в оболочке и эфирные масла ядра дают жгучую остроту и хвойно-пряный аромат',
      '#27272a',
      { culinaryEquivalentId: 'black_pepper_whole' }
    )
  },
  black_pepper_ground: {
    containerId: 'package_sachet',
    liquidId: 'spice_dry',
    amountMl: 50,
    attributes: attr(
      'Перец чёрный молотый душистый',
      'Зёрна чёрного перца',
      'Тонкий холодный помол горошин перца',
      'Приправление фарша, супов, котлет и вторых блюд',
      'Мелкий помол равномерно распределяет остроту по всему объёму блюда',
      '#3f3f46',
      { culinaryEquivalentId: 'black_pepper_ground' }
    )
  },
  chili_powder: {
    containerId: 'package_sachet',
    liquidId: 'spice_dry',
    amountMl: 50,
    attributes: attr(
      'Перец красный чили острый молотый (Кайенский)',
      'Спелые огненно-красные стручки перца чили (Capsicum frutescens)',
      'Огневая или солнечная сушка стручков и помол вместе с семенами',
      'Острые супы харчо и том ям, маринады для крылышек, гуляш и соусы',
      'Капсаицин вызывает выброс эндорфинов, разгоняет кровообращение и мгновенно согревает на морозе',
      '#dc2626',
      { culinaryEquivalentId: 'chili_powder' }
    )
  },
  paprika_sweet: {
    containerId: 'package_sachet',
    liquidId: 'spice_dry',
    amountMl: 50,
    attributes: attr(
      'Паприка красная сладкая копчёная',
      'Мясистые сладкие красные перцы сортов Паприка',
      'Сушка спелых перцев над дубовым дымом и тонкий помол без перегородок',
      'Венгерский гуляш, запечённый картофель, курица гриль, плов и колбасы',
      'Окрашивает бульоны и корочку мяса в аппетитный багряно-золотой цвет и дарит сладковатый аромат костра',
      '#ea580c',
      { culinaryEquivalentId: 'paprika_sweet' }
    )
  },
  bay_leaves_dried: {
    containerId: 'package_sachet',
    liquidId: 'spice_dry',
    amountMl: 50,
    attributes: attr(
      'Лист лавровый благородный сушёный',
      'Цельные листья вечнозелёного лавра благородного (Laurus nobilis)',
      'Зимний сбор взрослых листьев и теневая сушка с сохранением эфирных масел (цинеола)',
      'Супы, борщи, пельменный бульон, холодец, тушёнка и все виды маринадов',
      'При нагревании в бульоне лист отдаёт благородный смолисто-камфорный аромат, убирающий посторонние запахи мяса и рыбы',
      '#4d7c0f',
      { culinaryEquivalentId: 'bay_leaves_dried' }
    )
  },
  cinnamon_powder: {
    containerId: 'package_sachet',
    liquidId: 'spice_dry',
    amountMl: 50,
    attributes: attr(
      'Корица цейлонская молотая ароматная',
      'Тонкий внутренний слой коры молодых побегов коричного дерева',
      'Снятие коры в сезон дождей, скручивание в трубочки при сушке и помол в пудру',
      'Булочки с корицей, яблочный штрудель, глинтвейн, кофе, каши и восточные мясные блюда',
      'Коричный альдегид создаёт тёплый уютный аромат домашней выпечки и снижает тягу к сладкому',
      '#92400e',
      { culinaryEquivalentId: 'cinnamon_powder' }
    )
  },
  cloves_buds_dried: {
    containerId: 'package_sachet',
    liquidId: 'spice_dry',
    amountMl: 50,
    attributes: attr(
      'Гвоздика цельная в бутонах',
      'Нераспустившиеся цветочные почки гвоздичного дерева (Syzygium aromaticum)',
      'Ручной сбор розовых бутонов и сушка на солнце до тёмно-коричневого цвета',
      'Маринады для грибов и сельди, глинтвейн, пряники и тушёная баранина',
      'Шляпка бутона содержит до 20% эфирного масла эвгенола, обладающего жгучим пряным ароматом и природным антисептическим действием',
      '#451a03',
      { culinaryEquivalentId: 'cloves_buds_dried' }
    )
  },
  turmeric_powder: {
    containerId: 'package_sachet',
    liquidId: 'spice_dry',
    amountMl: 50,
    attributes: attr(
      'Куркума индийская молотая золотая',
      'Клубневидные корневища растения Curcuma longa (семейство имбирных)',
      'Отваривание корней, сушка на солнце до твердости камня и помол в ярко-жёлтый порошок',
      'Плов, куриный бульон, карри, рис и соусы',
      'Природный пигмент куркумин окрашивает рис и плов в сияющий золотой цвет и обладает противовоспалительными свойствами',
      '#eab308',
      { culinaryEquivalentId: 'turmeric_powder' }
    )
  },
  cardamom_pods_dried: {
    containerId: 'package_sachet',
    liquidId: 'spice_dry',
    amountMl: 50,
    attributes: attr(
      'Кардамон зелёный в коробочках и молотый',
      'Трёхгранные зелёные семенные коробочки Elettaria cardamomum',
      'Сбор недозрелых коробочек вручную и быстрая сушка для сохранения эфирных масел внутри капсулы',
      'Кофе по-восточному, пряный чай масала, куличи, пасха и пряники',
      'Коробочка герметично хранит камфорно-цитрусовый аромат семян вплоть до момента раздавливания в ступке',
      '#65a30d',
      { culinaryEquivalentId: 'cardamom_pods_dried' }
    )
  },
  coriander_seeds: {
    containerId: 'package_sachet',
    liquidId: 'spice_dry',
    amountMl: 50,
    attributes: attr(
      'Кориандр зерновой и молотый (семена кинзы)',
      'Круглые ребристые семена созревшей кинзы (Coriandrum sativum)',
      'Сушка зонтиков на корню и обмолот ароматных горошин',
      'Выпечка бородинского хлеба, маринование шашлыка, моркови по-корейски и посол сала',
      'При созревании семян травяной запах клопов кинзы исчезает, уступая место тёплому древесно-лимонному аромату линалоола',
      '#a16207',
      { culinaryEquivalentId: 'coriander_seeds' }
    )
  },
  allspice_berries: {
    containerId: 'package_sachet',
    liquidId: 'spice_dry',
    amountMl: 50,
    attributes: attr(
      'Перец душистый ямайский горошком',
      'Крупные сушёные ягоды дерева пимента (Pimenta dioica)',
      'Сбор зелёных ягод и сушка на каменных террасах до бурого цвета',
      'Холодец, уха, рассолы для огурцов и грибов, тушёнка и маринады',
      'Сочетает в одной горошине сразу четыре аромата: чёрного перца, гвоздики, мускатного ореха и корицы',
      '#57534e',
      { culinaryEquivalentId: 'allspice_berries' }
    )
  },
  shiitake_dried: {
    containerId: 'package_bag',
    liquidId: 'spice_dry',
    amountMl: 250,
    attributes: attr(
      'Грибы Шиитаке сушёные цельные',
      'Древесные грибы шиитаке (Lentinula edodes)',
      'Медленная тепловая сушка свежих шляпок на воздухе',
      'Наваристые грибные бульоны, рамен, гречка с грибами и вок (после замачивания)',
      'При сушке в шиитаке образуется гуанилат — вещество, многократно усиливающее грибной аромат и вкус умами при варке',
      '#78350f',
      { culinaryEquivalentId: 'shiitake_dried' }
    )
  },
  wood_ear_mushroom_dried: {
    containerId: 'package_bag',
    liquidId: 'spice_dry',
    amountMl: 200,
    attributes: attr(
      'Грибы Муэр древесные сушёные',
      'Чёрный древесный гриб аурикулярия уховидная',
      'Сбор с лиственных деревьев и сушка до хрупких тёмных пластинок',
      'Азиатские супы, горячие блюда вок и хрустящие салаты',
      'В тёплой воде сухие пластинки увеличиваются в объёме в 6–8 раз и обретают упругую хрящеватую текстуру',
      '#27272a',
      { culinaryEquivalentId: 'wood_ear_mushroom_dried' }
    )
  },

  // === 19. MEDICAL SOLUTIONS, OINTMENTS, SPRAYS & BALMS (МЕДИЦИНСКИЕ РАСТВОРЫ, МАЗИ, СПРЕИ) ===
  antiseptic: {
    containerId: 'bottle_plastic_100',
    liquidId: 'medical_solution',
    amountMl: 100,
    attributes: attr(
      'Раствор антисептический хлоргексидин / мирамистин (0.05%)',
      'Хлоргексидина биглюконат, вода очищенная для инъекций',
      'Асептическое приготовление водного бактерицидного раствора во флаконе с носиком',
      'Безболезненное промывание и обеззараживание открытых ран, ссадин, ожогов и кровотечений',
      'Разрушает клеточные мембраны бактерий, не обжигая живые ткани раны в отличие от спирта',
      '#e0f2fe',
      { medicalEffectId: 'antiseptic', customEffects: { health: 8 } }
    )
  },
  zelenka: {
    containerId: 'bottle_plastic_100',
    liquidId: 'medical_solution',
    amountMl: 50,
    attributes: attr(
      'Раствор бриллиантового зелёного спиртовой 1% (Зелёнка)',
      'Бриллиантовый зелёный анилиновый краситель (10 г/л), этанол 60%, вода очищенная',
      'Растворение кристаллического зелёного пигмента в водно-спиртовой основе',
      'Прижигание и антисептическая обработка ссадин, порезов и краёв ран',
      'Подсушивает раневую поверхность и уничтожает грамположительные бактерии, оставляя стойкий изумрудный след',
      '#059669',
      { medicalEffectId: 'zelenka', customEffects: { health: 7 } }
    )
  },
  iodine: {
    containerId: 'bottle_plastic_100',
    liquidId: 'medical_solution',
    amountMl: 50,
    attributes: attr(
      'Раствор йода спиртовой 5%',
      'Кристаллический йод (50 г/л), калия йодид, спирт этиловый 95%, вода',
      'Растворение молекулярного йода с йодидом калия в водно-спиртовой смеси',
      'Обработка краёв ссадин, нанесение разогревающей йодной сетки при ушибах и растяжениях',
      'Молекулярный йод коагулирует белки патогенных микробов и вызывает приток крови к месту ушиба',
      '#78350f',
      { medicalEffectId: 'iodine', customEffects: { health: 7 } }
    )
  },
  hydrogen_peroxide: {
    containerId: 'bottle_plastic_100',
    liquidId: 'medical_solution',
    amountMl: 100,
    attributes: attr(
      'Раствор перекиси водорода 3%',
      'Водорода пероксид медицинский, натрия бензоат (стабилизатор), вода очищенная',
      'Стабилизация водного раствора пероксида в светозащитном флаконе',
      'Первичная механическая очистка загрязнённых ран и остановка капиллярного кровотечения',
      'При контакте с ферментом каталазой крови бурно выделяет атомарный кислород, вспенивая и вымывая грязь и сгустки из раны',
      '#f8fafc',
      { medicalEffectId: 'hydrogen_peroxide', customEffects: { health: 8 } }
    )
  },
  valerian_drops: {
    containerId: 'bottle_plastic_100',
    liquidId: 'medical_solution',
    amountMl: 50,
    attributes: attr(
      'Настойка валерианы спиртовая успокоительная',
      'Измельчённые корневища с корнями валерианы лекарственной, спирт этиловый 70%',
      'Перколяция (вытяжка) эфирных масел и валепотриатов из корней валерианы на спирту (1:5)',
      'Снятие паники, нервного тремора, тахикардии и бессонницы после аварий и стресса',
      'Сложные эфиры борнеола и изовалериановой кислоты мягко тормозят возбуждение центральной нервной системы',
      '#92400e',
      { medicalEffectId: 'valerian_drops', customEffects: { health: 5, sleepiness: 10 } }
    )
  },
  ammonia_spirit: {
    containerId: 'bottle_plastic_100',
    liquidId: 'medical_solution',
    amountMl: 50,
    attributes: attr(
      'Раствор аммиака водный 10% (Нашатырный спирт)',
      'Аммиак водный концентрированный, очищенная вода',
      'Насыщение дистиллированной воды газообразным аммиаком в герметичном флаконе',
      'Экстренное выведение из обморока, ступора, шока и сильного головокружения',
      'Резкие пары аммиака раздражают рецепторы тройничного нерва в носоглотке, рефлекторно запуская дыхательный и сосудодвигательный центры мозга',
      '#e2e8f0',
      { medicalEffectId: 'ammonia_spirit', customEffects: { energy: 25, health: 4 } }
    )
  },
  eye_drops: {
    containerId: 'bottle_plastic_100',
    liquidId: 'medical_solution',
    amountMl: 40,
    attributes: attr(
      'Капли глазные увлажняющие (Таурин / Искусственная слеза)',
      'Таурин, гиалуронат натрия, изотонический буферный раствор',
      'Стерильная микрофильтрация во флакон-капельницу',
      'Снятие рези в глазах от дыма, пыли и усталости',
      'Восстанавливает слёзную плёнку роговицы и ускоряет регенерацию слизистой',
      '#e0f2fe',
      { medicalEffectId: 'eye_drops', customEffects: { health: 4, energy: 4 } }
    )
  },
  spasatel_ointment: {
    containerId: 'tube_ointment_small',
    liquidId: 'medical_solution',
    amountMl: 50,
    attributes: attr(
      'Бальзам-мазь ранозаживляющий «Спасатель» в тюбике',
      'Топлёное молочное масло, облепиховое масло, пчелиный воск, прополис, терпентин, витамины A и E',
      'Гомогенизация природных масел, воска и липидов без воды и консервантов в алюминиевую тубу',
      'Заживление термических ожогов, глубоких ушибов, ссадин и обморожений',
      'Создаёт на ране защитную липидную плёнку, ускоряющую регенерацию эпидермиса и рассасывание гематом',
      '#f59e0b',
      { medicalEffectId: 'spasatel_ointment', customEffects: { health: 12 } }
    )
  },
  diclofenac_gel: {
    containerId: 'tube_ointment_small',
    liquidId: 'medical_solution',
    amountMl: 50,
    attributes: attr(
      'Гель противовоспалительный «Диклофенак» 5% в тюбике',
      'Диклофенак натрия, изопропанол, пропиленгликоль, карбомер, масло лаванды',
      'Приготовление водно-спиртового гидрогеля с НПВС и фасовка в алюминиевый тюбик',
      'Купирование боли и отёка при растяжениях связок, сильных ушибах и травмах суставов',
      'Диклофенак проникает сквозь кожу к очагу травмы и блокирует синтез простагландинов — медиаторов боли и воспаления',
      '#f8fafc',
      { medicalEffectId: 'diclofenac_gel', customEffects: { health: 10 } }
    )
  },
  panthenol: {
    containerId: 'aerosol_can_small',
    liquidId: 'medical_solution',
    amountMl: 150,
    attributes: attr(
      'Спрей-пена противоожоговая «Декспантенол» 5%',
      'Декспантенол (провитамин B5), аллантоин, витамин E, водно-эмульсионная основа под давлением',
      'Заправка эмульсии декспантенола с пропеллентом в алюминиевый аэрозольный баллончик',
      'Первая помощь при термических и солнечных ожогах 1–2 степени и обширных ссадинах',
      'Воздушная охлаждающая пена наносится бесконтактно, не травмируя обожжённую кожу, и переходит в тканях в пантотеновую кислоту',
      '#ffffff',
      { medicalEffectId: 'panthenol', customEffects: { health: 14 } }
    )
  },
  balm_star: {
    containerId: 'tin_round_mini',
    liquidId: 'medical_solution',
    amountMl: 30,
    attributes: attr(
      'Бальзам ароматический «Золотая Звезда» (Звёздочка)',
      'Кристаллический ментол, камфора, эфирные масла перечной мяты, эвкалипта, гвоздики и корицы, пчелиный воск',
      'Сплавление пчелиного воска и вазелина с концентрированными эфирными маслами и заливка в круглую жестяную шайбу',
      'Натирание висков при головной боли, простуде, головокружении и сонливости за рулём',
      'Убойная концентрация эфирных масел вызывает холодяще-жгучий прилив крови и мгновенно проясняет сознание',
      '#d97706',
      { medicalEffectId: 'balm_star', customEffects: { health: 5, energy: 12 } }
    )
  },

  // === 20. ADDITIONAL CATALOG JARS, PICKLES, SPICES & DRINKS ===
  jalapeno_pickled: {
    containerId: 'jar_glass_small',
    liquidId: 'pickles',
    amountMl: 200,
    attributes: attr(
      'Перец халапеньо острый маринованный колечками',
      'Зелёный и красный перец халапеньо (кольца), винный уксус, вода, тростниковый сахар, морская соль, чеснок',
      'Нарезка свежего перца кольцами и горячее маринование в кисло-сладком уксусном рассоле',
      'Острый топпинг к бургерам, пицце, начос, хот-догам и мясным блюдам',
      'Капсаицин в сочетании с уксусным маринадом мгновенно согревает, бодрит и усиливает аппетит',
      '#15803d',
      { culinaryEquivalentId: 'jalapeno_pickled', customEffects: { hunger: 12, energy: 12 } }
    )
  },
  ginger_pickled: {
    containerId: 'jar_glass_small',
    liquidId: 'pickles',
    amountMl: 200,
    attributes: attr(
      'Имбирь маринованный розовый «Гари» лепестками',
      'Тонкие лепестки молодого корня имбиря, рисовый уксус, тростниковый сахар, морская соль',
      'Тончайшая строганая нарезка корня имбиря и выдержка в сладком рисовом маринаде Амазу',
      'Подача к суши и роллам для очищения вкусовых рецепторов и антибактериальной защиты',
      'Гингерол и рисовый уксус освежают полость рта, стимулируют пищеварение и обладают природным антисептическим эффектом',
      '#f43f5e',
      { culinaryEquivalentId: 'ginger_pickled', customEffects: { hunger: 8, health: 4, energy: 6 } }
    )
  },
  salt_fine: {
    containerId: 'jar_spice_small',
    liquidId: 'salt',
    amountMl: 100,
    attributes: attr(
      'Соль поваренная пищевая мелкая «Экстра» в солонке',
      'Хлорид натрия (NaCl 99.7%) мелкого кристаллического помола',
      'Вакуум-выпарная очистка и расфасовка в настольную стеклянную солонку с дозатором',
      'Досаливание готовых блюд, супов, яичницы, салатов и мяса за столом',
      'Чистые мелкие кристаллы мгновенно растворяются на поверхности горячей и холодной пищи',
      '#f8fafc',
      { culinaryEquivalentId: 'salt_fine' }
    )
  },

  // === 15. CONFECTIONERY GELLING AGENTS, STARCHES, SYRUPS, ACIDS, DYES & EXTRACTS ===
  gelatin_powder: {
    containerId: 'package_sachet',
    liquidId: 'dry_mix',
    amountMl: 80,
    attributes: attr(
      'Желатин пищевой быстрорастворимый П-11 (саше 50 г)',
      'Гидролизованный коллаген животного происхождения (220 Bloom)',
      'Экстракция, очистка, сушка и грануляция в герметичный фольгированный саше-пакет',
      'Желирующий агент для классических мармеладных мишек, желе и заливных блюд',
      'Образует упругий термообратимый гель с характерным жевательным «щелчком» мармелада',
      '#f59e0b',
      { culinaryEquivalentId: 'gelatin_powder', customEffects: { hunger: 4 } }
    )
  },
  gelatin_beef: {
    containerId: 'package_bag',
    liquidId: 'dry_mix',
    amountMl: 450,
    attributes: attr(
      'Желатин говяжий кондитерский 240 Bloom (300 г)',
      'Очищенный говяжий пищевой желатин высокой прочности геля (240 Bloom)',
      'Выварка говяжьего коллагенового сырья, ионная очистка и фасовка в плотный пакет',
      'Приготовление плотного упругого мармелада, бутылочек колы и жевательных червячков',
      'Высокий индекс Bloom обеспечивает эластичность без мутности',
      '#d97706',
      { culinaryEquivalentId: 'gelatin_beef', customEffects: { hunger: 6 } }
    )
  },
  pectin_apple: {
    containerId: 'package_sachet',
    liquidId: 'dry_mix',
    amountMl: 85,
    attributes: attr(
      'Пектин яблочный кондитерский (саше 50 г)',
      'Высокометоксилированный полисахарид из отборного яблочного жмыха',
      'Кислотная экстракция яблочной клетчатки, осаждение и тонкий помол',
      'Натуральный растительный загуститель для ягодного, фруктового и долькового мармелада',
      'Придаёт мармеладу нежный короткий откус без резиновой тягучести',
      '#84cc16',
      { culinaryEquivalentId: 'pectin_apple', customEffects: { hunger: 3 } }
    )
  },
  pectin_citrus: {
    containerId: 'package_sachet',
    liquidId: 'dry_mix',
    amountMl: 85,
    attributes: attr(
      'Пектин цитрусовый NH термообратимый (саше 50 г)',
      'Натуральный пектин из цедры лимонов, лаймов и горьких апельсинов',
      'Экстракция цитрусовой цедры и стандартизация по силе желирования',
      'Основа для глянцевых фруктовых колечек, тропических кубиков и садовых пастилок',
      'Раскрывает яркий фруктово-цитрусовый вкус даже при низкой кислотности',
      '#f97316',
      { culinaryEquivalentId: 'pectin_citrus', customEffects: { hunger: 3 } }
    )
  },
  agar_agar: {
    containerId: 'package_sachet',
    liquidId: 'dry_mix',
    amountMl: 75,
    attributes: attr(
      'Агар-агар 900 из красных водорослей (саше 40 г)',
      'Чистый растительный агар-агар (Gracilaria, сила геля 900 г/см²)',
      'Промывка красных морских водорослей, горячая фильтрация и сушка в тонкий порошок',
      'Веганская основа для тропического мармелада, личи-кубиков и птичьего молока',
      'Застывает уже при +38°C и держит чёткую форму даже без холодильника',
      '#0d9488',
      { culinaryEquivalentId: 'agar_agar', customEffects: { hunger: 2, health: 2 } }
    )
  },
  starch_modified: {
    containerId: 'package_bag',
    liquidId: 'dry_mix',
    amountMl: 600,
    attributes: attr(
      'Крахмал модифицированный кондитерский E1420 (400 г)',
      'Ацетилированный кукурузно-тапиоковый пищевой крахмал высшего сорта',
      'Стабилизация крахмальных зёрен для формовочных отливок мармелада',
      'Создание плотной упругой структуры кислых червячков, колечек и лент',
      'Удерживает влагу и не даёт мармеладу высыхать при хранении',
      '#cbd5e1',
      { culinaryEquivalentId: 'starch_modified' }
    )
  },
  starch_corn: {
    containerId: 'package_bag',
    liquidId: 'dry_mix',
    amountMl: 600,
    attributes: attr(
      'Крахмал кукурузный тонкого помола (400 г)',
      'Очищенный крахмал из зёрен сахарной кукурузы высшего сорта',
      'Мокрое разделение кукурузного зерна и центрифугирование до белоснежной пудры',
      'Посыпка форм, отливка мармелада, загущение ягодных пюре и кремов',
      'Нейтральный вкус и шёлковая сухая текстура',
      '#fef08a',
      { culinaryEquivalentId: 'starch_corn' }
    )
  },
  glucose_syrup: {
    containerId: 'bottle_plastic_500',
    liquidId: 'syrup_sweet',
    amountMl: 500,
    attributes: attr(
      'Глюкозный сироп кондитерский 43 DE (0.5 л)',
      'Концентрированный водный раствор чистой D-глюкозы и мальтозы',
      'Ферментативный гидролиз кукурузного крахмала и вакуумное уваривание',
      'Антикристаллизатор для блестящего тягучего мармелада, карамели и глазури',
      'Предотвращает засахаривание мармеладной массы и даёт упругую прозрачность',
      '#fef08a',
      { culinaryEquivalentId: 'glucose_syrup', customEffects: { hunger: 20, energy: 28, thirst: -4 } }
    )
  },
  glucose_fructose_syrup: {
    containerId: 'bottle_plastic_500',
    liquidId: 'syrup_sweet',
    amountMl: 500,
    attributes: attr(
      'Глюкозно-фруктозный сироп ГФС-42 (0.5 л)',
      'Сбалансированный сироп глюкозы и кристаллической фруктозы',
      'Изомеризация части глюкозы в фруктозу для мягкой фруктовой сладости',
      'Основа мармелада «Золотые мишки», шипучих бутылочек колы и лимонадного микса',
      'Удерживает влагу внутри мармелада и усиливает фруктовую кислинку',
      '#fbbf24',
      { culinaryEquivalentId: 'glucose_fructose_syrup', customEffects: { hunger: 22, energy: 30, thirst: -4 } }
    )
  },
  starch_molasses: {
    containerId: 'jar_glass_small',
    liquidId: 'syrup_sweet',
    amountMl: 200,
    attributes: attr(
      'Патока крахмальная карамельная в банке (270 г)',
      'Осахаренный кукурузный крахмал с высоким содержанием декстринов',
      'Медленное уваривание до густого янтарного блеска в стеклянной банке твист-офф',
      'Придаёт мармеладу плотность, глянец и мягкую сладость без приторности',
      'Классический компонент советских и европейских кондитерских рецептур',
      '#d97706',
      { culinaryEquivalentId: 'starch_molasses', customEffects: { hunger: 22, energy: 26 } }
    )
  },
  topinambur_syrup: {
    containerId: 'bottle_glass_small',
    liquidId: 'syrup_sweet',
    amountMl: 250,
    attributes: attr(
      'Сироп топинамбура натуральный пребиотический (0.25 л)',
      'Уваренный сок клубней топинамбура (инулин и фруктоолигосахариды)',
      'Холодное прессование клубней и щадящее вакуумное выпаривание',
      'Натуральный подсластитель для мармелада на пектине и здоровых десертов',
      'Низкий гликемический индекс и тёплый карамельно-травяной оттенок вкуса',
      '#92400e',
      { culinaryEquivalentId: 'topinambur_syrup', customEffects: { hunger: 18, energy: 22, health: 4 } }
    )
  },
  coconut_milk: {
    containerId: 'can_metal_medium',
    liquidId: 'milk',
    amountMl: 400,
    attributes: attr(
      'Кокосовое молоко 19% в жестяной банке (0.4 л)',
      'Натуральная эмульсия прессованной мякоти зрелого кокоса и очищенной воды',
      'Отжим свежей копры и стерилизация в белой лакированной банке с ключом',
      'Тропический мармелад ананас-кокос, взбитый слой, карри и десерты',
      'Нежная сливочная текстура с натуральным ароматом кокосового ореха',
      '#0d9488',
      { culinaryEquivalentId: 'coconut_milk', customEffects: { thirst: 22, hunger: 16, energy: 10 } }
    )
  },
  citric_acid: {
    containerId: 'package_sachet',
    liquidId: 'food_acid',
    amountMl: 80,
    attributes: attr(
      'Лимонная кислота пищевая кристаллическая (саше 80 г)',
      'Моногидрат лимонной кислоты E330 тонкой кристаллической фракции',
      'Биоферментация углеводов с многоступенчатой перекристаллизацией',
      'Запуск желирования пектина, кислая сахарная обсыпка, маринады и напитки',
      'Чистая звонкая цитрусовая кислинка без постороннего привкуса',
      '#facc15',
      { culinaryEquivalentId: 'citric_acid' }
    )
  },
  citric_acid_coarse: {
    containerId: 'jar_spice_small',
    liquidId: 'food_acid',
    amountMl: 100,
    attributes: attr(
      'Лимонная кислота крупнокристаллическая в банке (100 г)',
      'Крупные прозрачные кристаллы пищевой лимонной кислоты E330',
      'Расфасовка в герметичную стеклянную баночку с закруткой от слёживания',
      'Кондитерская обсыпка для ультра-кислых мармеладных червячков и колечек',
      'Не мокнет в банке и даёт мгновенную резкую искру кислотности на языке',
      '#eab308',
      { culinaryEquivalentId: 'citric_acid_coarse' }
    )
  },
  malic_acid: {
    containerId: 'package_sachet',
    liquidId: 'food_acid',
    amountMl: 70,
    attributes: attr(
      'Яблочная кислота пищевая E296 (саше 70 г)',
      'Органическая яблочная дикарбоновая кислота тонкого кристаллического помола',
      'Сверхчистая кристаллизация для кондитерской кислой обсыпки',
      'Создание «взрывной» долгоиграющей кислой пудры и яблочного мармелада',
      'Дольше держит кислоту во рту и подчёркивает вкус зелёного яблока и ягод',
      '#84cc16',
      { culinaryEquivalentId: 'malic_acid' }
    )
  },
  tartaric_acid: {
    containerId: 'package_sachet',
    liquidId: 'food_acid',
    amountMl: 70,
    attributes: attr(
      'Винная кислота пищевая E334 (саше 70 г)',
      'Натуральная правовращающая виннокаменная кислота из виноградного камня',
      'Переработка осадков виноградного сусла и сушка кристаллов',
      'Шипучая обсыпка и терпкая кислинка виноградного, вишнёвого и кола-мармелада',
      'Придаёт сладостям характерную освежающую терпкость винного камня',
      '#a855f7',
      { culinaryEquivalentId: 'tartaric_acid' }
    )
  },
  lactic_acid: {
    containerId: 'bottle_glass_small',
    liquidId: 'food_acid',
    amountMl: 200,
    attributes: attr(
      'Молочная кислота пищевая 80% E270 (0.2 л)',
      'Очищенный водный концентрат L-молочной кислоты натурального брожения',
      'Молочнокислое сбраживание глюкозы и мембранная очистка в янтарное стекло',
      'Мягкий регулятор кислотности для ягодного, персикового и молочного мармелада',
      'Сглаживает резкие углы кислоты и продлевает свежесть продукта',
      '#eab308',
      { culinaryEquivalentId: 'lactic_acid' }
    )
  },
  sodium_citrate: {
    containerId: 'package_sachet',
    liquidId: 'food_acid',
    amountMl: 75,
    attributes: attr(
      'Цитрат натрия кондитерский E331 (саше 75 г)',
      'Трёхзамещённая натриевая соль лимонной кислоты (буферная соль)',
      'Нейтрализация пищевой лимонной кислоты и сушка до рассыпчатого порошка',
      'Контроль pH при варке пектинового мармелада и эмульгирование сыров',
      'Не даёт пектину свернуться раньше времени до разлива по формам',
      '#38bdf8',
      { culinaryEquivalentId: 'sodium_citrate' }
    )
  },
  menthol_crystals: {
    containerId: 'tin_round_mini',
    liquidId: 'food_acid',
    amountMl: 30,
    attributes: attr(
      'Кристаллы натурального ментола (шайба 30 мл)',
      '100% чистый кристаллический L-ментол из масла перечной мяты',
      'Вымораживание мятного масла и фасовка в герметичную ментоловую шайбу',
      'Мармеладные сердечки «Мята и Эвкалипт», ингаляции и освежающие леденцы',
      'Игольчатые ледяные кристаллы вызывают мощный холодок рецепторов TRPM8',
      '#0d9488',
      { culinaryEquivalentId: 'menthol_crystals', customEffects: { energy: 8 } }
    )
  },
  menthol_crystals_coarse: {
    containerId: 'jar_spice_small',
    liquidId: 'food_acid',
    amountMl: 80,
    attributes: attr(
      'Ментол натуральный кристаллический в банке (80 мл)',
      'Крупные игольчатые кристаллы природного мятного ментола высшей очистки',
      'Дробная кристаллизация в янтарной светозащитной баночке',
      'Кондитерское производство освежающего мармелада и травяных леденцов',
      'Сохраняет пронзительную свежесть благодаря герметичной крышке',
      '#0f766e',
      { culinaryEquivalentId: 'menthol_crystals_coarse' }
    )
  },
  dye_carmine: {
    containerId: 'bottle_plastic_100',
    liquidId: 'food_dye',
    amountMl: 100,
    attributes: attr(
      'Краситель пищевой Кармин E120 (капельница 100 мл)',
      'Водоглицериновый раствор карминовой кислоты природного происхождения',
      'Экстракция пигмента в стерильном флаконе с узким носиком-дозатором',
      'Ярко-рубиновое окрашивание вишнёвого, малинового и клубничного мармелада',
      'Стойкий насыщенный малиновый оттенок всего с 2–3 капель',
      '#be123c',
      { culinaryEquivalentId: 'dye_carmine' }
    )
  },
  dye_chlorophyllin: {
    containerId: 'bottle_plastic_100',
    liquidId: 'food_dye',
    amountMl: 100,
    attributes: attr(
      'Медные комплексы хлорофиллов E141 (капельница 100 мл)',
      'Водорастворимый хлорофиллин из листьев люцерны и крапивы',
      'Хелатирование растительного хлорофилла для устойчивого изумрудного цвета',
      'Окрашивание мармелада с яблоком, лаймом, тархуном и мятой',
      'Не выцветает при нагревании и сохраняет глубокий зелёный тон',
      '#15803d',
      { culinaryEquivalentId: 'dye_chlorophyllin' }
    )
  },
  dye_anthocyanin: {
    containerId: 'bottle_plastic_100',
    liquidId: 'food_dye',
    amountMl: 100,
    attributes: attr(
      'Экстракт антоцианов ягодный E163 (капельница 100 мл)',
      'Концентрированные антоциановые пигменты кожицы красного винограда и бузины',
      'Кислотная водно-спиртовая экстракция без синтетических примесей',
      'Фиолетово-бордовый цвет виноградного, ежевичного и ягодного мармелада',
      'Меняет оттенок от рубинового в кислой среде до фиолетового в нейтральной',
      '#7e22ce',
      { culinaryEquivalentId: 'dye_anthocyanin' }
    )
  },
  dye_spirulina: {
    containerId: 'bottle_plastic_100',
    liquidId: 'food_dye',
    amountMl: 100,
    attributes: attr(
      'Экстракт голубой спирулины фикоцианин (100 мл)',
      'Очищенный голубой пигментный белок сине-зелёной водоросли Arthrospira platensis',
      'Холодная мембранная фильтрация спирулины во флакон-капельницу',
      'Единственный ярко-голубой и бирюзовый природный краситель для мармелада',
      'Даёт чистый небесный цвет для акул, драгонфрута и газированных бутылочек',
      '#0284c7',
      { culinaryEquivalentId: 'dye_spirulina' }
    )
  },
  dye_beta_carotene: {
    containerId: 'bottle_plastic_100',
    liquidId: 'food_dye',
    amountMl: 100,
    attributes: attr(
      'Бета-каротин вододисперсный E160a (капельница 100 мл)',
      'Натуральная эмульсия провитамина А в растительном глицерине',
      'Микроинкапсуляция каротина для равномерного окрашивания мармеладной массы',
      'Солнечно-жёлтые и апельсиновые мишки, манго, маракуйя, юзу и персик',
      'Без синтетических азокрасителей — яркий тёплый янтарно-золотистый цвет',
      '#f97316',
      { culinaryEquivalentId: 'dye_beta_carotene' }
    )
  },
  dye_caramel: {
    containerId: 'bottle_glass_small',
    liquidId: 'food_dye',
    amountMl: 250,
    attributes: attr(
      'Карамельный колер IV E150d (бутылочка 250 мл)',
      'Концентрированный тёмно-коричневый жжёный сахар карамелизации IV',
      'Термическая карамелизация пищевой декстрозы с розливом в стекло',
      'Глубокий цвет бутылочек «Шипучая Кола» и вишнёвой колы',
      'Густой тёмно-коньячный пигмент с лёгкой горчинкой жжёного сахара',
      '#78350f',
      { culinaryEquivalentId: 'dye_caramel' }
    )
  },
  dye_lycopene: {
    containerId: 'bottle_plastic_100',
    liquidId: 'food_dye',
    amountMl: 100,
    attributes: attr(
      'Ликопин натуральный пигмент E160d (капельница 100 мл)',
      'Каротиноидный красный экстракт из спелых томатов, арбуза и гуавы',
      'Масляно-водная микроэмульсия в пластиковом дозаторе 100 мл',
      'Тёплый ало-коралловый тон арбузных колечек, грейпфрута и розовой гуавы',
      'Стойкий природный красный пигмент без привкуса',
      '#ef4444',
      { culinaryEquivalentId: 'dye_lycopene' }
    )
  },
  extract_kola_nut: {
    containerId: 'bottle_glass_small',
    liquidId: 'botanical_extract',
    amountMl: 150,
    attributes: attr(
      'Экстракт ореха кола натуральный (флакон 150 мл)',
      'Ароматический экстракт западноафриканских семян Cola acuminata и пряной ванили',
      'Водно-глицериновая мацерация обжаренного ореха колы с цедрой цитрусов',
      'Настоящий вкус бутылочек шипучей колы и классической газировки',
      'Содержит природный кофеин и богатый пряно-ореховый букет',
      '#451a03',
      { culinaryEquivalentId: 'extract_kola_nut', customEffects: { energy: 10 } }
    )
  },
  extract_vanilla: {
    containerId: 'bottle_glass_small',
    liquidId: 'botanical_extract',
    amountMl: 100,
    attributes: attr(
      'Экстракт бурбонской ванили (стекло 100 мл)',
      'Натуральная вытяжка измельчённых стручков мадагаскарской ванили',
      'Длительная выдержка в тёмном стекле до насыщенного янтарного оттенка',
      'Крем-сода, нежные желейные сердечки, зефир и сливочная выпечка',
      'Живой глубокий аромат настоящего ванилина без синтетической резкости',
      '#92400e',
      { culinaryEquivalentId: 'extract_vanilla' }
    )
  },
  extract_hibiscus: {
    containerId: 'bottle_plastic_100',
    liquidId: 'botanical_extract',
    amountMl: 100,
    attributes: attr(
      'Концентрат гибискуса (каркаде) жидкий (100 мл)',
      'Концентрированная вытяжка рубиновых чашечек суданской розы Hibiscus sabdariffa',
      'Холодная экстракция с сохранением рубиновых антоцианов и фруктовых кислот',
      'Красно-вишнёвый цвет и ягодная кислинка фруктового мармелада',
      'Даёт чистый яркий рубиновый оттенок в паре с концентратом моркови',
      '#9f1239',
      { culinaryEquivalentId: 'extract_hibiscus' }
    )
  },
  extract_safflower: {
    containerId: 'bottle_plastic_100',
    liquidId: 'botanical_extract',
    amountMl: 100,
    attributes: attr(
      'Экстракт сафлора красильного (капельница 100 мл)',
      'Концентрированный золотисто-лимонный настой цветков Carthamus tinctorius',
      'Бережная водная вытяжка жёлтых флавоноидов сафлора',
      'Лимонно-солнечное окрашивание жёлтых мишек, звёздочек и ананасных кубиков',
      'Смешивается со спирулиной для получения насыщенного лаймово-зелёного тона',
      '#eab308',
      { culinaryEquivalentId: 'extract_safflower' }
    )
  },
  extract_paprika: {
    containerId: 'bottle_plastic_100',
    liquidId: 'food_dye',
    amountMl: 100,
    attributes: attr(
      'Экстракт паприки сладкой E160c (капельница 100 мл)',
      'Очищенный капсантин из сладкого красного перца без жгучих капсаицинов',
      'Дезодорированная масляно-водная эмульсия натурального пигмента',
      'Апельсиново-мандариновый и персиковый цвет фруктового мармелада',
      'Совершенно не острый — только чистый тёплый оранжево-красный оттенок',
      '#ea580c',
      { culinaryEquivalentId: 'extract_paprika' }
    )
  },
  concentrate_black_carrot: {
    containerId: 'bottle_glass_small',
    liquidId: 'food_dye',
    amountMl: 200,
    attributes: attr(
      'Концентрат сока чёрной моркови (бутылочка 200 мл)',
      'Выпаренный сок тёмно-фиолетовой моркови Daucus carota ssp. sativus',
      'Ультрафильтрация свежевыжатого сока чёрной моркови и розлив в стекло',
      'Ключевой природный краситель ягодного, ежевичного и цитрусового мармелада',
      'Богат стабильными антоцианами: даёт цвет от мадженты до тёмной вишни',
      '#6b21a8',
      { culinaryEquivalentId: 'concentrate_black_carrot' }
    )
  },
  extract_tarragon: {
    containerId: 'bottle_glass_small',
    liquidId: 'botanical_extract',
    amountMl: 150,
    attributes: attr(
      'Экстракт кавказского тархуна (эстрагона) 150 мл',
      'Концентрированный настой молодых побегов эстрагона с анисовой эссенцией',
      'Паровая дистилляция листьев Artemisia dracunculus с природным хлорофиллом',
      'Изумрудные лимонадные бутылочки «Тархун» и пряные десертные сиропы',
      'Тот самый легендарный освежающий вкус газировки тархун',
      '#16a34a',
      { culinaryEquivalentId: 'extract_tarragon', customEffects: { energy: 4 } }
    )
  },
  extract_eucalyptus: {
    containerId: 'bottle_glass_small',
    liquidId: 'botanical_extract',
    amountMl: 100,
    attributes: attr(
      'Экстракт листьев эвкалипта очищенный (100 мл)',
      'Концентрированная вытяжка листьев шаровидного эвкалипта с цинеолом',
      'Экстракция свежих листьев с розливом в светозащитный стеклянный флакон',
      'Мармеладные сердечки «Мята и Эвкалипт», леденцы для горла и ингаляции',
      'Очищает дыхательные пути и придаёт прохладный хвойный оттенок',
      '#047857',
      { culinaryEquivalentId: 'extract_eucalyptus', customEffects: { health: 4, energy: 4 } }
    )
  },
  oil_peppermint: {
    containerId: 'bottle_plastic_100',
    liquidId: 'essential_oil',
    amountMl: 50,
    attributes: attr(
      'Эфирное масло перечной мяты пищевое (50 мл)',
      '100% натуральное пародистиллированное масло Mentha piperita (52% ментола)',
      'Паровая перегонка цветущих побегов перечной мяты в амбровый капельный флакон',
      'Ароматизация мятно-эвкалиптового мармелада, шоколада и напитков',
      'Буквально 1–2 капли дают ледяной освежающий мятный удар',
      '#10b981',
      { culinaryEquivalentId: 'oil_peppermint' }
    )
  },
  oil_spearmint: {
    containerId: 'bottle_plastic_100',
    liquidId: 'essential_oil',
    amountMl: 50,
    attributes: attr(
      'Эфирное масло мяты кудрявой (колосьевой) 50 мл',
      'Натуральное масло Mentha spicata с высоким содержанием L-карвона',
      'Бережная дистилляция мягких кудрявых листьев мяты',
      'Мягкий сладковатый мятный профиль для жвачки и зелёных мармеладных сердец',
      'В отличие от перечной мяты не обжигает — даёт нежную сладкую свежесть',
      '#34d399',
      { culinaryEquivalentId: 'oil_spearmint' }
    )
  },
  hibiscus_dried: {
    containerId: 'package_sachet',
    liquidId: 'spice_dry',
    amountMl: 80,
    attributes: attr(
      'Цветки гибискуса (каркаде) сушёные (саше 60 г)',
      'Цельные бордовые лепестки суданской розы Hibiscus sabdariffa',
      'Воздушная теневая сушка с сохранением природных кислот и антоцианов',
      'Заваривание рубинового каркаде, окрашивание отваров и фруктового мармелада',
      'Даёт насыщенный кисло-ягодный вкус и глубокий вишнёво-алый настой',
      '#be123c',
      { culinaryEquivalentId: 'hibiscus_dried', customEffects: { hunger: 2, health: 3 } }
    )
  },
  safflower_dried: {
    containerId: 'package_sachet',
    liquidId: 'spice_dry',
    amountMl: 70,
    attributes: attr(
      'Лепестки сафлора красильного сушёные (саше 40 г)',
      'Оранжево-золотистые лепестки дикого шафрана (Carthamus tinctorius)',
      'Ручной сбор цветков и бережная конвекционная сушка',
      'Натуральное жёлтое окрашивание отваров, плова, напитков и мармелада',
      'Мягкий медово-цветочный аромат и яркий золотой настой без горечи',
      '#f59e0b',
      { culinaryEquivalentId: 'safflower_dried', customEffects: { hunger: 2, health: 2 } }
    )
  },
  // === CLEAN CANONICAL SUBSTANCE IDS (WITHOUT CONTAINER SUFFIXES) & NEW SUBSTANCES ===
  carnauba_wax: {
    containerId: 'package_bag',
    liquidId: 'dry_mix',
    amountMl: 100,
    attributes: attr(
      'Карнаубский воск E903 в хлопьях',
      'Очищенный растительный воск листьев бразильской пальмы Copernicia prunifera',
      'Экстракция воскового налёта пальмовых листьев, фильтрация и кристаллизация в тонкие хлопья',
      'Глазирование жевательного мармелада, драже и конфет для зеркального блеска и защиты от слипания',
      'Самый тугоплавкий природный пищевой воск (температура плавления 82–86 °C) — не тает в руках',
      '#fde047',
      { culinaryEquivalentId: 'carnauba_wax' }
    )
  },
  olives_green: {
    containerId: 'jar_glass_small',
    liquidId: 'pickles',
    amountMl: 200,
    attributes: attr(
      'Оливки зелёные без косточки в маринаде',
      'Крупные зелёные плоды оливы, рассол, винный уксус, лимонная кислота',
      'Щелочное удаление природной горечи (олеуропеина) и консервация в слабом маринаде',
      'Приготовление мясной солянки, пиццы, греческого салата и закусок',
      'Сырые оливки с дерева несъедобно горькие — только вымачивание и рассол делают их маслянистыми и нежными',
      '#84cc16',
      { culinaryEquivalentId: 'olives_green' }
    )
  },
  olives_black: {
    containerId: 'can_metal_small',
    liquidId: 'pickles',
    amountMl: 250,
    attributes: attr(
      'Маслины чёрные без косточки в пряной заливке',
      'Маслины без косточки, вода, соль, глюконат железа',
      'Окисление в рассоле и стерилизация в жестяной банке',
      'Классический компонент сборной солянки, пиццы и средиземноморских салатов',
      'Жестяная банка защищает плоды от света и сохраняет глубокий антрацитовый цвет и мягкую текстуру',
      '#27272a',
      { culinaryEquivalentId: 'olives_black' }
    )
  },
  capers_pickled: {
    containerId: 'jar_spice_small',
    liquidId: 'pickles',
    amountMl: 100,
    attributes: attr(
      'Каперсы маринованные в винном уксусе',
      'Нераспустившиеся цветочные бутоны каперсника, белый винный уксус, морская соль',
      'Подвяливание бутонов на солнце и маринование в крепком винном уксусе',
      'Приготовление соуса тартар, солянки и рыбных блюд',
      'Во время маринования в бутонах кристаллизуется рутин, создавая характерный взрывной горчично-пряный вкус',
      '#3f6212',
      { culinaryEquivalentId: 'capers_pickled' }
    )
  },
  sun_dried_tomatoes: {
    containerId: 'jar_glass_small',
    liquidId: 'pickles',
    amountMl: 200,
    attributes: attr(
      'Томаты вяленые в оливковом масле с травами',
      'Половинки сливовидных томатов, оливковое масло Extra Virgin, орегано, базилик, чеснок',
      'Медленное вяление на солнце с морской солью и заливка тёплым пряным маслом',
      'Паста, брускетты, выпечка фокаччи и мясные рулеты',
      'Удаление влаги концентрирует глутаматы и сахара томата, а масло запечатывает аромат трав',
      '#991b1b',
      { culinaryEquivalentId: 'sun_dried_tomatoes' }
    )
  },
  cherry_pitted: {
    containerId: 'jar_glass_medium',
    liquidId: 'canned_preserve',
    amountMl: 500,
    attributes: attr(
      'Вишня без косточки в собственном соку',
      'Крупная тёмная садовая вишня без косточки, вишнёвый сок, сахар',
      'Удаление косточек и пастеризация в стеклянной банке',
      'Начинка для вареников, штруделя, пирогов и соусов к утке',
      'Отсутствие косточек исключает накопление амигдалина и делает ягоды готовыми для выпечки',
      '#881337',
      { culinaryEquivalentId: 'cherry_pitted' }
    )
  },
  perch_caviar: {
    containerId: 'jar_glass_small',
    liquidId: 'caviar',
    amountMl: 140,
    attributes: attr(
      'Икра речного окуня солёная',
      'Свежая икра речного окуня, соль, молотый белый перец',
      'Отделение от ястычных плёнок и домашний посол',
      'Рыбацкая закуска на ржаном хлебе с маслом',
      'Мелкое нежное зерно с характерным речным послевкусием',
      '#facc15',
      { culinaryEquivalentId: 'perch_caviar' }
    )
  },
  herring_caviar: {
    containerId: 'jar_glass_small',
    liquidId: 'caviar',
    amountMl: 140,
    attributes: attr(
      'Икра тихоокеанской сельди в масле',
      'Хрустящая икра сельди, соль, рафинированное масло',
      'Посол в ястыках и пробивка с ароматным маслом',
      'Закуска к картофелю и чёрному хлебу',
      'Знаменита своим плотным хрустом и насыщенным морским вкусом',
      '#fbbf24',
      { culinaryEquivalentId: 'herring_caviar' }
    )
  },
  tuna_caviar: {
    containerId: 'jar_glass_small',
    liquidId: 'caviar',
    amountMl: 140,
    attributes: attr(
      'Икра морского тунца пряного посола',
      'Икра тунца, морская соль, оливковое масло',
      'Выдержка в морской соли и консервация с маслом',
      'Добавка в пасту, брускетты и рыбные блюда',
      'Обладает выраженным вкусом умами и плотной текстурой',
      '#dc2626',
      { culinaryEquivalentId: 'tuna_caviar' }
    )
  },
  eel_caviar: {
    containerId: 'jar_glass_small',
    liquidId: 'caviar',
    amountMl: 140,
    attributes: attr(
      'Икра угря тёмная деликатесная',
      'Зернистая икра угря, морская соль',
      'Бережный посол и фасовка в стекло',
      'Изысканная закуска и украшение канапе',
      'Тёмные мелкие икринки с маслянистым ореховым оттенком вкуса',
      '#1e293b',
      { culinaryEquivalentId: 'eel_caviar' }
    )
  },
  catfish_caviar: {
    containerId: 'jar_glass_small',
    liquidId: 'caviar',
    amountMl: 140,
    attributes: attr(
      'Икра сома речного пробойная',
      'Крупная икра речного сома, соль, душистый перец',
      'Пастеризация и пряный посол',
      'Сытная намазка на хлеб и тосты',
      'Питательная речная икра с мягким сливочным послевкусием',
      '#334155',
      { culinaryEquivalentId: 'catfish_caviar' }
    )
  },
  garlic_powder: {
    containerId: 'jar_spice_small',
    liquidId: 'spice_dry',
    amountMl: 100,
    attributes: attr(
      'Чеснок сушёный гранулированный',
      'Зубчики зрелого ярового чеснока сублимационной сушки',
      'Дегидратация при 50 °C и дробление в мелкую крупку',
      'Мясные маринады, супы, колбасный фарш и чесночные гренки',
      'В отличие от свежего чеснока не подгорает на сковороде и равномерно отдаёт аромат блюду',
      '#fef08a',
      { culinaryEquivalentId: 'garlic_powder' }
    )
  },
  dill_dried: {
    containerId: 'jar_spice_small',
    liquidId: 'spice_dry',
    amountMl: 100,
    attributes: attr(
      'Укроп сушёный душистый',
      'Верхушки и иголочки молодого огородного укропа',
      'Теневая конвекционная сушка для сохранения эфирных масел и изумрудного цвета',
      'Заправка ухи, борща, картофеля и сметанных соусов',
      'Концентрирует эфирное масло карвон и заменяет свежую зелень в зимний сезон',
      '#15803d',
      { culinaryEquivalentId: 'dill_dried' }
    )
  },
  basil_dried: {
    containerId: 'jar_spice_small',
    liquidId: 'spice_dry',
    amountMl: 100,
    attributes: attr(
      'Базилик сушёный сладкий',
      'Листья фиолетового и зелёного душистого базилика',
      'Бережная сушка и измельчение без стеблей',
      'Томатные соусы, пицца, паста, запечённое мясо и овощные рагу',
      'При нагревании в томатном соусе раскрывает тёплый пряно-гвоздичный аромат',
      '#166534',
      { culinaryEquivalentId: 'basil_dried' }
    )
  },
  mint_dried: {
    containerId: 'jar_spice_small',
    liquidId: 'spice_dry',
    amountMl: 100,
    attributes: attr(
      'Мята перечная сушёная листовая',
      'Отборные листья перечной мяты с высоким содержанием ментола',
      'Сушка в проветриваемой тени сразу после сбора до цветения',
      'Заваривание успокаивающего чая, компотов, кваса и пряной выпечки',
      'Эфирное масло ментола снимает спазмы, освежает и успокаивает нервную систему',
      '#059669',
      { culinaryEquivalentId: 'mint_dried' }
    )
  },
  tomato_paste: {
    containerId: 'jar_glass_small',
    liquidId: 'puree',
    amountMl: 200,
    attributes: attr(
      'Томатная паста концентрированная (ГОСТ, 25% сухих веществ)',
      'Спелые красные грунтовые томаты, соль',
      'Протирание томатной мякоти без кожицы и семян и вакуумное выпаривание в 6 раз',
      'Заправка для борща, голубцов, тефтелей, гуляша и пиццы',
      'Концентрирует ликопин и природную кислоту, придавая супам и соусам густоту и рубиновый цвет',
      '#b91c1c',
      { culinaryEquivalentId: 'tomato_paste' }
    )
  },
  apple_puree: {
    containerId: 'jar_glass_small',
    liquidId: 'puree',
    amountMl: 200,
    attributes: attr(
      'Пюре яблочное нежное без сахара',
      'Печёные и томлёные зелёные и красные садовые яблоки',
      'Разваривание очищенных яблок под крышкой и гомогенизация в бархатистое пюре',
      'Лёгкий диетический перекус, детское питание и основа для зефира, мармелада и пастилы',
      'Яблочный пектин создаёт нежную обволакивающую текстуру и легко усваивается желудком',
      '#fde047',
      { culinaryEquivalentId: 'apple_puree' }
    )
  },
  cottage_cheese: {
    containerId: 'cup_plastic_dairy_medium',
    liquidId: 'dairy_fermented',
    amountMl: 250,
    attributes: attr(
      'Творог рассыпчатый натуральный (9%)',
      'Цельное пастеризованное коровье молоко, закваска молочнокислых культур, сычужный фермент',
      'Сквашивание молока, бережный нагрев сгустка и отжим сыворотки в мешочках',
      'Белковый завтрак со сметаной, мёдом или вареньем, приготовление сырников и запеканок',
      'Щадящее сцеживание сохраняет нежное рассыпчатое зерно и легкоусвояемый казеиновый белок',
      '#ffffff',
      { culinaryEquivalentId: 'cottage_cheese' }
    )
  }
};

export const EXTENDED_ITEM_PACKAGING_MAP: Record<string, UnifiedPackagingMappingEntry> = {
  // === 1. FOREST BERRIES & MUSHROOMS IN UNIFIED WICKER BASKET (ЛУКОШКО) ===
  berries: { containerId: 'lukoshko', countInside: 12, innerItemId: 'berry_forest_single' },
  forest_berries: { containerId: 'lukoshko', countInside: 12, innerItemId: 'berry_forest_single' },
  berries_blueberry: { containerId: 'lukoshko', countInside: 15, innerItemId: 'berry_blueberry_single' },
  berries_lingonberry: { containerId: 'lukoshko', countInside: 15, innerItemId: 'berry_lingonberry_single' },
  berries_cranberry: { containerId: 'lukoshko', countInside: 15, innerItemId: 'berry_cranberry_single' },
  berries_raspberry: { containerId: 'lukoshko', countInside: 12, innerItemId: 'berry_raspberry_single' },
  berries_strawberry: { containerId: 'lukoshko', countInside: 10, innerItemId: 'berry_strawberry_single' },
  berries_blackcurrant: { containerId: 'lukoshko', countInside: 14, innerItemId: 'berry_blackcurrant_single' },
  berries_redcurrant: { containerId: 'lukoshko', countInside: 14, innerItemId: 'berry_redcurrant_single' },
  berries_cherry: { containerId: 'lukoshko', countInside: 12, innerItemId: 'berry_cherry_single' },
  berries_blackberry: { containerId: 'lukoshko', countInside: 14, innerItemId: 'berry_blackberry_single' },
  berries_sea_buckthorn: { containerId: 'lukoshko', countInside: 15, innerItemId: 'berry_sea_buckthorn_single' },
  berries_elderberry: { containerId: 'lukoshko', countInside: 15, innerItemId: 'berry_elderberry_single' },
  mushrooms_chanterelle: { containerId: 'lukoshko', countInside: 8, innerItemId: 'mushroom_chanterelle_single' },
  mushrooms_honey_agaric: { containerId: 'lukoshko', countInside: 10, innerItemId: 'mushroom_honey_agaric_single' },

  // === 2. BERRIES & FRUITS IN FOOD TRAYS -> STANDALONE SINGLE ITEMS ===
  berries_fresh: { containerId: 'tray_sealed_food', countInside: 8, innerItemId: 'berry_strawberry_single' },
  strawberry_fresh: { containerId: 'tray_sealed_food', countInside: 8, innerItemId: 'berry_strawberry_single' },
  raspberry_fresh: { containerId: 'tray_sealed_food', countInside: 12, innerItemId: 'berry_raspberry_single' },
  blueberry_fresh: { containerId: 'tray_sealed_food', countInside: 15, innerItemId: 'berry_blueberry_single' },
  cherry_fresh: { containerId: 'tray_sealed_food', countInside: 10, innerItemId: 'berry_cherry_single' },
  tomato_cherry_bunch: { containerId: 'tray_sealed_food', countInside: 12, innerItemId: 'tomato_cherry_single' },
  melon_diced: { containerId: 'tray_sealed_food', countInside: 4, innerItemId: 'melon_slice' },
  lychee_fruit: { containerId: 'tray_sealed_food', countInside: 8, innerItemId: 'berry_cherry_single' },

  // === 3. EGG CARTONS -> STANDALONE SINGLE EGGS ===
  eggs_chicken: { containerId: 'egg_carton_10', countInside: 10, innerItemId: 'egg_chicken_single' },
  eggs_quail: { containerId: 'egg_carton_quail_18', countInside: 18, innerItemId: 'egg_quail_single' },

  // === 4. SNACK POUCHES & FAST-FOOD BOXES -> STANDALONE SINGLE PIECES ===
  chips: { containerId: 'pouch_sealed_snack', countInside: 8, innerItemId: 'chip_potato_single', labelColor: '#eab308' },
  cookies: { containerId: 'pouch_sealed_snack', countInside: 6, innerItemId: 'cookie_choco_single', labelColor: '#78350f' },
  nachos: { containerId: 'pouch_sealed_snack', countInside: 8, innerItemId: 'nacho_chip_single', labelColor: '#ea580c' },
  popcorn_salted: { containerId: 'takeout_box_wok', countInside: 6, innerItemId: 'popcorn_handful', labelColor: '#dc2626' },
  popcorn_caramel: { containerId: 'takeout_box_wok', countInside: 6, innerItemId: 'popcorn_handful', labelColor: '#d97706' },

  // === 5. MEDICAL BLISTERS -> STANDALONE SINGLE PILLS & PATCHES ===
  painkillers: { containerId: 'blister_pack_10', countInside: 6, innerItemId: 'pill_painkiller_single', labelColor: '#ef4444' },
  antipyretic: { containerId: 'blister_pack_10', countInside: 6, innerItemId: 'pill_antipyretic_single', labelColor: '#3b82f6' },
  activated_charcoal: { containerId: 'blister_pack_10', countInside: 10, innerItemId: 'pill_charcoal_single', labelColor: '#18181b' },
  vitamins: { containerId: 'blister_pack_10', countInside: 10, innerItemId: 'pill_vitamin_single', labelColor: '#eab308' },
  medical_patch: { containerId: 'blister_pack_10', countInside: 6, innerItemId: 'patch_bactericidal_single', labelColor: '#10b981' },

  // === 6. GUMMY & CANDY POUCHES (РАЗНООБРАЗНЫЕ УПАКОВКИ МАРМЕЛАДА — 14 РЕАЛИСТИЧНЫХ НАБОРОВ) ===
  gummy_pack_mini_bears: {
    containerId: 'candy_pouch_mini',
    countInside: 12,
    innerItemId: 'gummy_candy',
    labelColor: '#ec4899',
    containerTintColor: '#f472b6',
    customNameRu: 'Саше-пакетик мармелад «Фруктовые мишки» (12 шт., 30 г)',
    customDescriptionRu: 'Компактный четырёхшовный мини-саше с прозрачным окошком и двенадцатью классическими мармеладными мишками.',
    innerGummyPresets: [
      {
        color: '#ef4444',
        colorNameRu: 'Рубиново-красный',
        shape: 'bear',
        shapeNameRu: 'Мишка',
        flavorRu: 'Спелая клубника',
        ingredients: ['Глюкозный сироп', 'Сахар', 'Желатин пищевой', 'Сок клубники (8%)', 'Лимонная кислота', 'Экстракт кармина', 'Пчелиный воск']
      },
      {
        color: '#eab308',
        colorNameRu: 'Солнечно-жёлтый',
        shape: 'bear',
        shapeNameRu: 'Мишка',
        flavorRu: 'Сочный лимон',
        ingredients: ['Глюкозный сироп', 'Сахар', 'Желатин пищевой', 'Лимонный сок (7%)', 'Куркумин', 'Лимонная кислота', 'Карнаубский воск']
      },
      {
        color: '#22c55e',
        colorNameRu: 'Изумрудно-зелёный',
        shape: 'bear',
        shapeNameRu: 'Мишка',
        flavorRu: 'Зелёное яблоко',
        ingredients: ['Глюкозный сироп', 'Сахар', 'Желатин пищевой', 'Яблочный сок (8%)', 'Хлорофиллин', 'Яблочная кислота', 'Карнаубский воск']
      },
      {
        color: '#f97316',
        colorNameRu: 'Янтарно-оранжевый',
        shape: 'bear',
        shapeNameRu: 'Мишка',
        flavorRu: 'Сладкий апельсин',
        ingredients: ['Глюкозный сироп', 'Сахар', 'Желатин пищевой', 'Апельсиновый сок (8%)', 'Бета-каротин', 'Лимонная кислота', 'Пчелиный воск']
      }
    ]
  },
  gummy_pack_mini_mint_hearts: {
    containerId: 'candy_pouch_mini',
    countInside: 10,
    innerItemId: 'gummy_candy',
    labelColor: '#14b8a6',
    containerTintColor: '#2dd4bf',
    customNameRu: 'Саше-пакетик мармелад «Мята и Эвкалипт» (10 шт., 40 г)',
    customDescriptionRu: 'Карманный дорожный мини-саше с освежающими мармеладными сердечками: перечная мята, лайм, эвкалипт и цветочный мёд.',
    innerGummyPresets: [
      {
        color: '#10b981',
        colorNameRu: 'Мятно-изумрудный',
        shape: 'heart',
        shapeNameRu: 'Сердечко',
        flavorRu: 'Перечная мята и лайм',
        ingredients: ['Сироп глюкозы', 'Сахар', 'Пектин цитрусовый', 'Сок лайма (6%)', 'Масло перечной мяты', 'Хлорофиллин', 'Карнаубский воск']
      },
      {
        color: '#0d9488',
        colorNameRu: 'Хвойно-бирюзовый',
        shape: 'heart',
        shapeNameRu: 'Сердечко',
        flavorRu: 'Эвкалипт и липовый мёд',
        ingredients: ['Сироп глюкозы', 'Липовый мёд (5%)', 'Желатин пищевой', 'Экстракт эвкалипта', 'Ментол натуральный', 'Лимонная кислота']
      },
      {
        color: '#38bdf8',
        colorNameRu: 'Ледяной голубой',
        shape: 'heart',
        shapeNameRu: 'Сердечко',
        flavorRu: 'Ледяная ягода с ментолом',
        ingredients: ['Сироп глюкозы', 'Сахар', 'Желатин', 'Экстракт спирулины', 'Масло мяты кудрявой', 'Яблочная кислота', 'Пчелиный воск']
      }
    ]
  },
  gummy_pack_flow_cola: {
    containerId: 'candy_pouch_small',
    countInside: 16,
    innerItemId: 'gummy_candy',
    labelColor: '#991b1b',
    containerTintColor: '#b91c1c',
    customNameRu: 'Флоу-пак мармелад «Шипучая Кола» (16 шт., 80 г)',
    customDescriptionRu: 'Пухлый герметичный пакет-подушечка с жевательными бутылочками колы и вишнёвой колы в кислой шипучей обсыпке.',
    innerGummyPresets: [
      {
        color: '#78350f',
        colorNameRu: 'Карамельно-коричневый',
        shape: 'cola_bottle',
        shapeNameRu: 'Бутылочка колы',
        flavorRu: 'Классическая кола',
        sourDust: true,
        ingredients: ['Патока крахмальная', 'Сахар', 'Желатин', 'Карамельный колер IV', 'Экстракт ореха кола', 'Яблочная и лимонная кислоты', 'Цитрат натрия']
      },
      {
        color: '#9f1239',
        colorNameRu: 'Тёмно-вишнёвый',
        shape: 'cola_bottle',
        shapeNameRu: 'Бутылочка колы',
        flavorRu: 'Вишнёвая кола',
        sourDust: true,
        ingredients: ['Патока крахмальная', 'Сахар', 'Желатин', 'Вишнёвый сок', 'Карамельный колер', 'Лимонная кислота', 'Шипучая сахарная пудра']
      }
    ]
  },
  gummy_pack_flow_bears_gold: {
    containerId: 'candy_pouch_small',
    countInside: 28,
    innerItemId: 'gummy_candy',
    labelColor: '#f59e0b',
    containerTintColor: '#fbbf24',
    customNameRu: 'Флоу-пак мармелад «Золотые мишки» (28 шт., 70 г)',
    customDescriptionRu: 'Классический карманный флоу-пак: 28 упругих фруктовых мишек пяти традиционных вкусов на натуральном соке.',
    innerGummyPresets: [
      {
        color: '#facc15',
        colorNameRu: 'Золотисто-жёлтый',
        shape: 'bear',
        shapeNameRu: 'Мишка',
        flavorRu: 'Сладкий ананас',
        ingredients: ['Глюкозный сироп', 'Сахар', 'Желатин', 'Сок ананаса (7%)', 'Лимонная кислота', 'Куркумин', 'Карнаубский воск']
      },
      {
        color: '#e11d48',
        colorNameRu: 'Малиновый',
        shape: 'bear',
        shapeNameRu: 'Мишка',
        flavorRu: 'Спелая малина',
        ingredients: ['Глюкозный сироп', 'Сахар', 'Желатин', 'Малиновый сок (8%)', 'Концентрат бузины', 'Лимонная кислота', 'Пчелиный воск']
      },
      {
        color: '#eab308',
        colorNameRu: 'Лимонный',
        shape: 'bear',
        shapeNameRu: 'Мишка',
        flavorRu: 'Свежий лимон',
        ingredients: ['Глюкозный сироп', 'Сахар', 'Желатин', 'Лимонный сок (6%)', 'Экстракт сафлора', 'Лимонная кислота', 'Карнаубский воск']
      },
      {
        color: '#f97316',
        colorNameRu: 'Оранжевый',
        shape: 'bear',
        shapeNameRu: 'Мишка',
        flavorRu: 'Апельсин Валенсия',
        ingredients: ['Глюкозный сироп', 'Сахар', 'Желатин', 'Апельсиновый сок (8%)', 'Бета-каротин', 'Лимонная кислота', 'Пчелиный воск']
      },
      {
        color: '#22c55e',
        colorNameRu: 'Светло-зелёный',
        shape: 'bear',
        shapeNameRu: 'Мишка',
        flavorRu: 'Хрустящее яблоко',
        ingredients: ['Глюкозный сироп', 'Сахар', 'Желатин', 'Яблочный сок (8%)', 'Хлорофиллин', 'Яблочная кислота', 'Карнаубский воск']
      }
    ]
  },
  gummy_pack_flow_citrus_stars: {
    containerId: 'candy_pouch_small',
    countInside: 24,
    innerItemId: 'gummy_candy',
    labelColor: '#eab308',
    containerTintColor: '#fde047',
    customNameRu: 'Флоу-пак мармелад «Цитрусовый микс» (24 шт., 84 г)',
    customDescriptionRu: 'Яркий пакет-подушечка с кисло-сладкими мармеладными звёздочками в искрящейся цитрусовой посыпке.',
    innerGummyPresets: [
      {
        color: '#fde047',
        colorNameRu: 'Ярко-лимонный',
        shape: 'star',
        shapeNameRu: 'Звёздочка',
        flavorRu: 'Юзу и лимон',
        sourDust: true,
        ingredients: ['Сироп глюкозы', 'Сахар', 'Пектин', 'Сок юзу и лимона (8%)', 'Лимонная кислота', 'Куркумин', 'Сахарная посыпка']
      },
      {
        color: '#fb7185',
        colorNameRu: 'Кораллово-розовый',
        shape: 'star',
        shapeNameRu: 'Звёздочка',
        flavorRu: 'Розовый грейпфрут',
        sourDust: true,
        ingredients: ['Сироп глюкозы', 'Сахар', 'Желатин', 'Сок грейпфрута (7%)', 'Яблочная кислота', 'Ликопин', 'Цитрат натрия']
      },
      {
        color: '#ea580c',
        colorNameRu: 'Кроваво-оранжевый',
        shape: 'star',
        shapeNameRu: 'Звёздочка',
        flavorRu: 'Сицилийский красный апельсин',
        sourDust: true,
        ingredients: ['Сироп глюкозы', 'Сахар', 'Желатин', 'Сок красного апельсина (9%)', 'Экстракт паприки', 'Антоцианы', 'Сахарная обсыпка']
      },
      {
        color: '#84cc16',
        colorNameRu: 'Лаймовый',
        shape: 'star',
        shapeNameRu: 'Звёздочка',
        flavorRu: 'Бодрящий лайм',
        sourDust: true,
        ingredients: ['Сироп глюкозы', 'Сахар', 'Пектин', 'Сок лайма (8%)', 'Яблочная кислота', 'Хлорофиллин', 'Кислая пудра']
      }
    ]
  },
  gummy_pack_euro_worms: {
    containerId: 'candy_pouch_euro',
    countInside: 22,
    innerItemId: 'gummy_candy',
    labelColor: '#8b5cf6',
    containerTintColor: '#a78bfa',
    customNameRu: 'Евро-пакет мармелад «Кислые червячки» (22 шт., 132 г)',
    customDescriptionRu: 'Прозрачный магазинный евро-пакет с цветным хедером-подвесом и двухцветными кислыми червячками в кристаллической посыпке.',
    innerGummyPresets: [
      {
        color: '#22c55e',
        colorNameRu: 'Лаймово-зелёный',
        shape: 'worm',
        shapeNameRu: 'Червячок',
        flavorRu: 'Кислый лайм и ананас',
        sourDust: true,
        ingredients: ['Глюкозно-фруктозный сироп', 'Сахар', 'Желатин говяжий', 'Модифицированный крахмал', 'Яблочная кислота', 'Молочная кислота', 'Сок лайма']
      },
      {
        color: '#3b82f6',
        colorNameRu: 'Лазурно-синий',
        shape: 'worm',
        shapeNameRu: 'Червячок',
        flavorRu: 'Голубая малина и лимон',
        sourDust: true,
        ingredients: ['Глюкозно-фруктозный сироп', 'Сахар', 'Желатин говяжий', 'Пектин', 'Лимонная кислота', 'Экстракт спирулины', 'Сахарная посыпка']
      },
      {
        color: '#ef4444',
        colorNameRu: 'Алый',
        shape: 'worm',
        shapeNameRu: 'Червячок',
        flavorRu: 'Кислая вишня и манго',
        sourDust: true,
        ingredients: ['Глюкозно-фруктозный сироп', 'Сахар', 'Желатин говяжий', 'Вишнёвый концентрат', 'Винная кислота', 'Антоцианы', 'Сахарная посыпка']
      },
      {
        color: '#a855f7',
        colorNameRu: 'Фиолетовый',
        shape: 'worm',
        shapeNameRu: 'Червячок',
        flavorRu: 'Чёрная смородина и цитрус',
        sourDust: true,
        ingredients: ['Глюкозно-фруктозный сироп', 'Сахар', 'Желатин говяжий', 'Сок чёрной смородины', 'Яблочная кислота', 'Антоцианы', 'Кристаллы цитруса']
      }
    ]
  },
  gummy_pack_euro_tropical_cubes: {
    containerId: 'candy_pouch_euro',
    countInside: 28,
    innerItemId: 'gummy_candy',
    labelColor: '#fb7185',
    containerTintColor: '#fda4af',
    customNameRu: 'Евро-пакет мармелад «Тропические кубики» (28 шт., 140 г)',
    customDescriptionRu: 'Магазинный евро-пакет с плотными желейными кубиками на пектине и агар-агаре с ароматом экзотических фруктов.',
    innerGummyPresets: [
      {
        color: '#f59e0b',
        colorNameRu: 'Мангово-янтарный',
        shape: 'cube',
        shapeNameRu: 'Кубик',
        flavorRu: 'Спелое манго и маракуйя',
        ingredients: ['Пюре манго (14%)', 'Сок маракуйи (6%)', 'Тростниковый сахар', 'Пектин яблочный', 'Агар-агар', 'Лимонная кислота', 'Бета-каротин']
      },
      {
        color: '#fb7185',
        colorNameRu: 'Гуавово-розовый',
        shape: 'cube',
        shapeNameRu: 'Кубик',
        flavorRu: 'Розовая гуава и папайя',
        ingredients: ['Пюре гуавы (12%)', 'Сок папайи (6%)', 'Глюкозный сироп', 'Пектин цитрусовый', 'Агар-агар', 'Антоцианы', 'Лимонная кислота']
      },
      {
        color: '#fef08a',
        colorNameRu: 'Кремово-золотой',
        shape: 'cube',
        shapeNameRu: 'Кубик',
        flavorRu: 'Ананас и кокосовое молоко',
        ingredients: ['Сок ананаса (12%)', 'Кокосовое молоко (5%)', 'Сахар', 'Пектин', 'Агар-агар', 'Натуральный ароматизатор', 'Лимонная кислота']
      },
      {
        color: '#d946ef',
        colorNameRu: 'Пурпурный',
        shape: 'cube',
        shapeNameRu: 'Кубик',
        flavorRu: 'Драгонфрут и личи',
        ingredients: ['Пюре питайи (10%)', 'Сок личи (8%)', 'Сахар', 'Глюкозный сироп', 'Пектин', 'Экстракт гибискуса', 'Яблочная кислота']
      }
    ]
  },
  gummy_pack_euro_soda_bottles: {
    containerId: 'candy_pouch_euro',
    countInside: 26,
    innerItemId: 'gummy_candy',
    labelColor: '#06b6d4',
    containerTintColor: '#22d3ee',
    customNameRu: 'Евро-пакет мармелад «Лимонадный бар» (26 шт., 130 г)',
    customDescriptionRu: 'Евро-пакет с подвесом: шипучие жевательные бутылочки со вкусами тархуна, крем-соды, апельсиновой содовой и колы с лаймом.',
    innerGummyPresets: [
      {
        color: '#10b981',
        colorNameRu: 'Изумрудный',
        shape: 'cola_bottle',
        shapeNameRu: 'Бутылочка колы',
        flavorRu: 'Тархун и груша дюшес',
        sourDust: true,
        ingredients: ['Патока', 'Сахар', 'Желатин', 'Экстракт эстрагона', 'Грушевый сок', 'Лимонная кислота', 'Шипучая сахарная посыпка']
      },
      {
        color: '#38bdf8',
        colorNameRu: 'Небесно-голубой',
        shape: 'cola_bottle',
        shapeNameRu: 'Бутылочка колы',
        flavorRu: 'Ванильная крем-сода',
        sourDust: true,
        ingredients: ['Патока', 'Сахар', 'Желатин', 'Экстракт ванили', 'Цитрат натрия', 'Спирулина', 'Шипучая сахарная пудра']
      },
      {
        color: '#f97316',
        colorNameRu: 'Искристо-оранжевый',
        shape: 'cola_bottle',
        shapeNameRu: 'Бутылочка колы',
        flavorRu: 'Апельсиновая содовая',
        sourDust: true,
        ingredients: ['Патока', 'Сахар', 'Желатин', 'Концентрат апельсина', 'Бета-каротин', 'Яблочная кислота', 'Шипучая обсыпка']
      },
      {
        color: '#78350f',
        colorNameRu: 'Янтарно-кольный',
        shape: 'cola_bottle',
        shapeNameRu: 'Бутылочка колы',
        flavorRu: 'Кола с лаймом',
        sourDust: true,
        ingredients: ['Патока', 'Сахар', 'Желатин', 'Экстракт колы', 'Сок лайма', 'Карамельный колер', 'Лимонная кислота']
      }
    ]
  },
  gummy_pack_doypack_rings: {
    containerId: 'candy_pouch',
    countInside: 28,
    innerItemId: 'gummy_candy',
    labelColor: '#f97316',
    containerTintColor: '#fb923c',
    customNameRu: 'Дой-пак мармелад «Фруктовые колечки» (28 шт., 196 г)',
    customDescriptionRu: 'Удобный стоячий пакет дой-пак с зип-локом и двухслойными фруктово-суфлейными колечками (персик, арбуз, яблоко).',
    innerGummyPresets: [
      {
        color: '#fb923c',
        colorNameRu: 'Персиково-оранжевый',
        shape: 'ring',
        shapeNameRu: 'Колечко',
        flavorRu: 'Бархатный персик',
        sourDust: true,
        ingredients: ['Сахар', 'Глюкозный сироп', 'Персиковое пюре (6%)', 'Желатин', 'Пектин яблочный', 'Лимонная кислота', 'Экстракт паприки']
      },
      {
        color: '#f43f5e',
        colorNameRu: 'Арбузно-розовый',
        shape: 'ring',
        shapeNameRu: 'Колечко',
        flavorRu: 'Сахарный арбуз',
        sourDust: true,
        ingredients: ['Сахар', 'Глюкозный сироп', 'Сок арбуза (6%)', 'Желатин', 'Пектин', 'Яблочная кислота', 'Концентрат моркови и гибискуса']
      },
      {
        color: '#10b981',
        colorNameRu: 'Яблочно-зелёный',
        shape: 'ring',
        shapeNameRu: 'Колечко',
        flavorRu: 'Кисло-сладкое яблоко',
        sourDust: true,
        ingredients: ['Сахар', 'Глюкозный сироп', 'Яблочный сок (7%)', 'Желатин', 'Взбитый белковый слой', 'Яблочная кислота', 'Медные комплексы хлорофиллов']
      }
    ]
  },
  gummy_pack_doypack_berries: {
    containerId: 'candy_pouch',
    countInside: 48,
    innerItemId: 'gummy_candy',
    labelColor: '#be123c',
    containerTintColor: '#e11d48',
    customNameRu: 'Дой-пак мармелад «Лесные ягоды и сердца» (48 шт., 176 г)',
    customDescriptionRu: 'Стоячий дой-пак с застёжкой zip-lock: рельефные ягодки малины, ежевики и нежные вишнёвые сердечки на натуральном соке.',
    innerGummyPresets: [
      {
        color: '#e11d48',
        colorNameRu: 'Малиново-розовый',
        shape: 'berry',
        shapeNameRu: 'Ягодка',
        flavorRu: 'Лесная малина',
        ingredients: ['Пюре малины (12%)', 'Сахар тростниковый', 'Сироп топинамбура', 'Пектин цитрусовый', 'Агар-агар', 'Лимонная кислота', 'Сок чёрной моркови']
      },
      {
        color: '#312e81',
        colorNameRu: 'Ежевично-индиго',
        shape: 'berry',
        shapeNameRu: 'Ягодка',
        flavorRu: 'Дикая ежевика и черника',
        ingredients: ['Сок ежевики и черники (12%)', 'Сахар', 'Патока', 'Пектин', 'Агар-агар', 'Антоцианы', 'Натуральный воск']
      },
      {
        color: '#dc2626',
        colorNameRu: 'Вишнёво-алый',
        shape: 'heart',
        shapeNameRu: 'Сердечко',
        flavorRu: 'Спелая вишня',
        ingredients: ['Вишнёвый сок (10%)', 'Сахар', 'Глюкозный сироп', 'Желатин пищевой', 'Лимонная кислота', 'Экстракт гибискуса']
      }
    ]
  },
  gummy_pack_doypack_bears_xl: {
    containerId: 'candy_pouch',
    countInside: 80,
    innerItemId: 'gummy_candy',
    labelColor: '#ec4899',
    containerTintColor: '#f472b6',
    customNameRu: 'Дой-пак мармелад «Медвежья семья» (80 шт., 200 г)',
    customDescriptionRu: 'Щедрый стоячий пакет дой-пак с многоразовым зип-локом: 80 фруктовых мармеладных мишек шести вкусов.',
    innerGummyPresets: [
      {
        color: '#ef4444',
        colorNameRu: 'Рубиново-красный',
        shape: 'bear',
        shapeNameRu: 'Мишка',
        flavorRu: 'Клубника садовая',
        ingredients: ['Глюкозный сироп', 'Сахар', 'Желатин', 'Клубничный сок (8%)', 'Лимонная кислота', 'Кармин', 'Карнаубский воск']
      },
      {
        color: '#e11d48',
        colorNameRu: 'Малиновый',
        shape: 'bear',
        shapeNameRu: 'Мишка',
        flavorRu: 'Лесная малина',
        ingredients: ['Глюкозный сироп', 'Сахар', 'Желатин', 'Малиновый сок (8%)', 'Антоцианы', 'Лимонная кислота', 'Пчелиный воск']
      },
      {
        color: '#eab308',
        colorNameRu: 'Ананасово-золотой',
        shape: 'bear',
        shapeNameRu: 'Мишка',
        flavorRu: 'Тропический ананас',
        ingredients: ['Глюкозный сироп', 'Сахар', 'Желатин', 'Ананасовый сок (7%)', 'Куркумин', 'Лимонная кислота', 'Карнаубский воск']
      },
      {
        color: '#22c55e',
        colorNameRu: 'Изумрудный',
        shape: 'bear',
        shapeNameRu: 'Мишка',
        flavorRu: 'Зелёное яблоко',
        ingredients: ['Глюкозный сироп', 'Сахар', 'Желатин', 'Яблочный сок (8%)', 'Хлорофиллин', 'Яблочная кислота', 'Карнаубский воск']
      },
      {
        color: '#3b82f6',
        colorNameRu: 'Чернично-синий',
        shape: 'bear',
        shapeNameRu: 'Мишка',
        flavorRu: 'Дикая черника',
        ingredients: ['Глюкозный сироп', 'Сахар', 'Желатин', 'Сок черники (7%)', 'Экстракт спирулины', 'Лимонная кислота', 'Пчелиный воск']
      },
      {
        color: '#f97316',
        colorNameRu: 'Апельсиновый',
        shape: 'bear',
        shapeNameRu: 'Мишка',
        flavorRu: 'Спелый апельсин',
        ingredients: ['Глюкозный сироп', 'Сахар', 'Желатин', 'Апельсиновый сок (8%)', 'Бета-каротин', 'Лимонная кислота', 'Карнаубский воск']
      }
    ]
  },
  gummy_pack_doypack_sour_mix: {
    containerId: 'candy_pouch',
    countInside: 40,
    innerItemId: 'gummy_candy',
    labelColor: '#84cc16',
    containerTintColor: '#a3e635',
    customNameRu: 'Дой-пак мармелад «Ультра-кислый микс» (40 шт., 195 г)',
    customDescriptionRu: 'Стоячий дой-пак с зип-локом для любителей бодрящей кислинки: червячки, кубики, звёздочки и бутылочки в кислой посыпке.',
    innerGummyPresets: [
      {
        color: '#22c55e',
        colorNameRu: 'Кислотно-зелёный',
        shape: 'worm',
        shapeNameRu: 'Червячок',
        flavorRu: 'Кислый лайм и яблоко',
        sourDust: true,
        ingredients: ['Сироп глюкозы', 'Сахар', 'Желатин', 'Яблочная кислота', 'Молочная кислота', 'Сок лайма', 'Сахарная посыпка']
      },
      {
        color: '#a855f7',
        colorNameRu: 'Неоново-фиолетовый',
        shape: 'cube',
        shapeNameRu: 'Кубик',
        flavorRu: 'Кислая чёрная смородина',
        sourDust: true,
        ingredients: ['Сахар', 'Глюкозный сироп', 'Пектин', 'Сок чёрной смородины', 'Винная кислота', 'Антоцианы', 'Кислая корочка']
      },
      {
        color: '#eab308',
        colorNameRu: 'Лимонно-яркий',
        shape: 'star',
        shapeNameRu: 'Звёздочка',
        flavorRu: 'Экстремальный лимон',
        sourDust: true,
        ingredients: ['Сироп глюкозы', 'Сахар', 'Желатин', 'Лимонный сок (8%)', 'Лимонная кислота', 'Куркумин', 'Кислая пудра']
      },
      {
        color: '#9f1239',
        colorNameRu: 'Рубиново-вишнёвый',
        shape: 'cola_bottle',
        shapeNameRu: 'Бутылочка колы',
        flavorRu: 'Кислая вишня-кола',
        sourDust: true,
        ingredients: ['Патока', 'Сахар', 'Желатин', 'Вишнёвый концентрат', 'Яблочная кислота', 'Карамельный колер', 'Шипучая посыпка']
      }
    ]
  },
  gummy_pack_large_party: {
    containerId: 'candy_pouch_large',
    countInside: 96,
    innerItemId: 'gummy_candy',
    labelColor: '#10b981',
    containerTintColor: '#34d399',
    customNameRu: 'Семейный пакет мармелад «Мега-Ассорти» (96 шт., 438 г)',
    customDescriptionRu: 'Большая плоская пачка с боковыми фальцами: 96 мармеладок всевозможных форм, цветов и вкусов для большой компании.',
    innerGummyPresets: [
      {
        color: '#ef4444',
        colorNameRu: 'Клубнично-красный',
        shape: 'bear',
        shapeNameRu: 'Мишка',
        flavorRu: 'Клубника',
        ingredients: ['Глюкозный сироп', 'Сахар', 'Желатин', 'Клубничный сок', 'Лимонная кислота', 'Карнаубский воск']
      },
      {
        color: '#22c55e',
        colorNameRu: 'Зелёный',
        shape: 'worm',
        shapeNameRu: 'Червячок',
        flavorRu: 'Кислое яблоко',
        sourDust: true,
        ingredients: ['Глюкозный сироп', 'Сахар', 'Желатин', 'Яблочный сок', 'Яблочная кислота', 'Сахарная посыпка']
      },
      {
        color: '#eab308',
        colorNameRu: 'Лимонно-золотой',
        shape: 'star',
        shapeNameRu: 'Звёздочка',
        flavorRu: 'Юзу и манго',
        ingredients: ['Сахар', 'Сироп глюкозы', 'Пюре манго', 'Пектин', 'Куркумин', 'Лимонная кислота']
      },
      {
        color: '#a855f7',
        colorNameRu: 'Виноградно-фиолетовый',
        shape: 'cube',
        shapeNameRu: 'Кубик',
        flavorRu: 'Тёмный виноград Изабелла',
        sourDust: true,
        ingredients: ['Сахар', 'Виноградный сок (10%)', 'Пектин фруктовый', 'Агар-агар', 'Винная кислота', 'Сахарная корочка']
      },
      {
        color: '#78350f',
        colorNameRu: 'Карамельно-коричневый',
        shape: 'cola_bottle',
        shapeNameRu: 'Бутылочка колы',
        flavorRu: 'Освежающая кола',
        ingredients: ['Патока', 'Сахар', 'Желатин', 'Карамельный колер', 'Лимонная кислота', 'Экстракт колы']
      },
      {
        color: '#ec4899',
        colorNameRu: 'Нежно-розовый',
        shape: 'heart',
        shapeNameRu: 'Сердечко',
        flavorRu: 'Розовый грейпфрут',
        ingredients: ['Сахар', 'Сироп глюкозы', 'Сок грейпфрута', 'Желатин', 'Концентрат редиса', 'Карнаубский воск']
      },
      {
        color: '#f97316',
        colorNameRu: 'Мандариново-оранжевый',
        shape: 'ring',
        shapeNameRu: 'Колечко',
        flavorRu: 'Спелый мандарин',
        sourDust: true,
        ingredients: ['Сахар', 'Глюкозный сироп', 'Мандариновый сок', 'Желатин', 'Бета-каротин', 'Лимонная кислота']
      },
      {
        color: '#312e81',
        colorNameRu: 'Чернично-синий',
        shape: 'berry',
        shapeNameRu: 'Ягодка',
        flavorRu: 'Лесная черника',
        ingredients: ['Сок черники (12%)', 'Сахар', 'Патока', 'Агар-агар', 'Пектин', 'Антоцианы']
      }
    ]
  },
  gummy_pack_large_berry_orchard: {
    containerId: 'candy_pouch_large',
    countInside: 100,
    innerItemId: 'gummy_candy',
    labelColor: '#be123c',
    containerTintColor: '#e11d48',
    customNameRu: 'Семейный пакет мармелад «Ягодно-фруктовый сад» (100 шт., 400 г)',
    customDescriptionRu: 'Большая семейная пачка с фальцами: 100 натуральных мармеладок на пектине и фруктово-ягодном соке (ягодки, сердечки, кубики, звёздочки).',
    innerGummyPresets: [
      {
        color: '#e11d48',
        colorNameRu: 'Малиновый',
        shape: 'berry',
        shapeNameRu: 'Ягодка',
        flavorRu: 'Садовая малина и брусника',
        ingredients: ['Пюре малины (14%)', 'Сок брусники (5%)', 'Сахар тростниковый', 'Пектин цитрусовый', 'Агар-агар', 'Лимонная кислота']
      },
      {
        color: '#dc2626',
        colorNameRu: 'Вишнёвый',
        shape: 'heart',
        shapeNameRu: 'Сердечко',
        flavorRu: 'Спелая черешня и гранат',
        ingredients: ['Вишнёвый сок (12%)', 'Сок граната (5%)', 'Сироп глюкозы', 'Пектин', 'Экстракт гибискуса', 'Яблочная кислота']
      },
      {
        color: '#7c3aed',
        colorNameRu: 'Сливово-фиолетовый',
        shape: 'cube',
        shapeNameRu: 'Кубик',
        flavorRu: 'Чёрная смородина и слива',
        ingredients: ['Сок чёрной смородины (12%)', 'Пюре сливы (6%)', 'Сахар', 'Пектин', 'Агар-агар', 'Антоцианы']
      },
      {
        color: '#f59e0b',
        colorNameRu: 'Абрикосово-золотой',
        shape: 'star',
        shapeNameRu: 'Звёздочка',
        flavorRu: 'Облепиха и абрикос',
        ingredients: ['Пюре абрикоса (10%)', 'Сок облепихи (6%)', 'Сироп глюкозы', 'Пектин', 'Бета-каротин', 'Лимонная кислота']
      }
    ]
  },

  // === 7. PELMENI & DUMPLING PACKAGES (УПАКОВКИ ПОД ПЕЛЬМЕШКИ С АТРИБУТАМИ ЛЕПКИ, ФОРМЫ, РАЗМЕРА И СОСТАВА) ===
  pelmeni_siberian_pack: {
    containerId: 'pelmeni_pack',
    countInside: 45,
    innerItemId: 'pelmen',
    labelColor: '#b91c1c',
    containerTintColor: '#f8fafc',
    customNameRu: 'Пачка пельменей «Сибирские отборные» со скрепкой (45 шт., 675 г)',
    customDescriptionRu: 'Плотный морозный пакет со скрепкой-клипсой и прозрачным смотровым окном: классические сибирские пельмени «ушко» из тонкого яичного теста с сочным фаршем из говядины и свинины.',
    innerPelmenPresets: [
      {
        shape: 'ear',
        shapeNameRu: 'Сибирское «ушко»',
        size: 'medium',
        sizeNameRu: 'Классический («Домашний», 15 г)',
        state: 'frozen',
        stateNameRu: 'Замороженный (-16 °C)',
        doughColor: '#fef3c7',
        doughNameRu: 'Пшеничное высший сорт на куриных яйцах',
        doughThicknessMm: 1.2,
        fillingRu: 'Рубленая говядина и свиная грудинка с репчатым луком и чёрным перцем',
        fillingColor: '#991b1b',
        fillingRatioPercent: 62,
        moldingMethodRu: 'Ручная лепка защипом «ушко»',
        flourDusting: true,
        ingredients: [
          'Говядина охлаждённая',
          'Свинина полужирная',
          'Мука пшеничная хлебопекарная в/с',
          'Лук репчатый свежий',
          'Вода питьевая ледяная',
          'Яйцо куриное пищевое',
          'Соль каменная',
          'Перец чёрный свежемолотый'
        ]
      }
    ]
  },
  pelmeni_mini_bullion_pack: {
    containerId: 'pelmeni_pack_small',
    countInside: 55,
    innerItemId: 'pelmen',
    labelColor: '#0284c7',
    containerTintColor: '#f0f9ff',
    customNameRu: 'Малая пачка пельменей «Бульонные Малютки» (55 шт., 385 г)',
    customDescriptionRu: 'Компактный пакет с синей клипсой: миниатюрные круглые пельмешки «Сатурн» с тонким пояском и нежной начинкой из телятины и индейки со сливочным маслом.',
    innerPelmenPresets: [
      {
        shape: 'saturn',
        shapeNameRu: 'Круглый «Сатурн» с пояском',
        size: 'mini',
        sizeNameRu: 'Мини («Малютка», 7 г)',
        state: 'frozen',
        stateNameRu: 'Замороженный (-16 °C)',
        doughColor: '#fffbeb',
        doughNameRu: 'Тонкое заварное пшеничное тесто',
        doughThicknessMm: 0.9,
        fillingRu: 'Нежная телятина и филе индейки со сливками и мускатным орехом',
        fillingColor: '#b91c1c',
        fillingRatioPercent: 58,
        moldingMethodRu: 'Барабанная штамповка с пояском',
        flourDusting: true,
        ingredients: [
          'Телятина молочная',
          'Филе грудки индейки',
          'Мука пшеничная твёрдых сортов (дурум)',
          'Сливки питьевые 20%',
          'Масло сливочное 82.5%',
          'Лук репчатый',
          'Яйцо куриное',
          'Соль морская',
          'Мускатный орех молотый'
        ]
      }
    ]
  },
  pelmeni_ural_box: {
    containerId: 'pelmeni_pack_box',
    countInside: 32,
    innerItemId: 'pelmen',
    labelColor: '#dc2626',
    containerTintColor: '#fffbeb',
    customNameRu: 'Картонная пачка пельменей «Уральские по ГОСТу» (32 шт., 480 г)',
    customDescriptionRu: 'Традиционная картонная коробка с перфорированным отрывным клапаном и смотровым окошком: пельмени в форме полумесяца с фигурной косичкой из трёх видов мяса.',
    innerPelmenPresets: [
      {
        shape: 'crescent',
        shapeNameRu: 'Полумесяц с косичкой',
        size: 'medium',
        sizeNameRu: 'Классический («Домашний», 15 г)',
        state: 'frozen',
        stateNameRu: 'Замороженный (-16 °C)',
        doughColor: '#fef3c7',
        doughNameRu: 'Уральское крутое тесто на яйцах и ледяной воде',
        doughThicknessMm: 1.3,
        fillingRu: 'Говядина, свинина и молодая баранина с чесноком и укропом',
        fillingColor: '#7f1d1d',
        fillingRatioPercent: 60,
        moldingMethodRu: 'Фигурный защип косичкой',
        flourDusting: true,
        ingredients: [
          'Говядина первого сорта',
          'Свинина шейная часть',
          'Баранина лопаточная часть',
          'Мука пшеничная хлебопекарная в/с',
          'Лук репчатый',
          'Чеснок свежий',
          'Яйцо куриное',
          'Вода питьевая',
          'Соль поваренная',
          'Перец чёрный и душистый молотый'
        ]
      }
    ]
  },
  pelmeni_bogatyr_large_pack: {
    containerId: 'pelmeni_pack_large',
    countInside: 40,
    innerItemId: 'pelmen',
    labelColor: '#15803d',
    containerTintColor: '#f8fafc',
    customNameRu: 'Семейный мешок пельменей «Богатырские Крупные» (40 шт., 880 г)',
    customDescriptionRu: 'Большой семейный пакет со скрепкой: крупные мясистые пельмени категории А (68% рубленого мяса) в форме ушка.',
    innerPelmenPresets: [
      {
        shape: 'ear',
        shapeNameRu: 'Сибирское «ушко»',
        size: 'large',
        sizeNameRu: 'Крупный («Богатырский», 22 г)',
        state: 'frozen',
        stateNameRu: 'Замороженный (-16 °C)',
        doughColor: '#fde68a',
        doughNameRu: 'Домашнее тесто на деревенских желтках',
        doughThicknessMm: 1.4,
        fillingRu: 'Крупнорубленая мраморная говядина и свиная грудинка с колотым льдом для бульона',
        fillingColor: '#991b1b',
        fillingRatioPercent: 68,
        moldingMethodRu: 'Ручная лепка двойным защипом',
        flourDusting: true,
        ingredients: [
          'Говядина тазобедренная часть',
          'Свиная грудинка',
          'Мука пшеничная высший сорт',
          'Лук репчатый рубленый',
          'Желток яичный',
          'Лёд фраппе (для бульона внутри)',
          'Масло топлёное',
          'Соль каменная',
          'Крупнодробленый чёрный перец',
          'Кориандр молотый'
        ]
      }
    ]
  },
  pelmeni_khinkali_lamb_pack: {
    containerId: 'pelmeni_pack',
    countInside: 28,
    innerItemId: 'pelmen',
    labelColor: '#92400e',
    containerTintColor: '#fef3c7',
    customNameRu: 'Пачка пельменей-бууз «Восточные мешочки с бараниной» (28 шт., 616 г)',
    customDescriptionRu: 'Фирменный пакет с клипсой: крупные фигурные пельмени-мешочки со складками и хвостиком, сочной бараниной, зирой и свежей кинзой.',
    innerPelmenPresets: [
      {
        shape: 'khinkali',
        shapeNameRu: 'Мешочек со складками (бууза)',
        size: 'large',
        sizeNameRu: 'Крупный («Богатырский», 22 г)',
        state: 'frozen',
        stateNameRu: 'Замороженный (-16 °C)',
        doughColor: '#fef9c3',
        doughNameRu: 'Эластичное слоёное тесто длительного вымеса',
        doughThicknessMm: 1.5,
        fillingRu: 'Рубленая баранина с курдючным жирком, свежей кинзой и зирой',
        fillingColor: '#7f1d1d',
        fillingRatioPercent: 65,
        moldingMethodRu: 'Сборка складками в узелок-хвостик',
        flourDusting: true,
        ingredients: [
          'Баранина рубленая',
          'Курдючный жир',
          'Мука пшеничная высший сорт',
          'Лук репчатый',
          'Кинза свежая (кориандр)',
          'Зира (кумин) молотая',
          'Чеснок',
          'Перец красный и чёрный',
          'Соль',
          'Ледяной мясной бульон'
        ]
      }
    ]
  },
  pelmeni_colored_kids_pack: {
    containerId: 'pelmeni_pack_small',
    countInside: 36,
    innerItemId: 'pelmen',
    labelColor: '#7c3aed',
    containerTintColor: '#faf5ff',
    customNameRu: 'Пачка цветных пельмешек «Радужные Розочки и Подушечки» (36 шт., 396 г)',
    customDescriptionRu: 'Яркая пачка с клипсой: фигурные пельмешки на натуральном шпинатном, свекольном и морковном соке с диетическим филе индейки и курицы.',
    innerPelmenPresets: [
      {
        shape: 'rose',
        shapeNameRu: 'Фигурный «Розочка»',
        size: 'small',
        sizeNameRu: 'Мелкий («Столичный», 11 г)',
        state: 'frozen',
        stateNameRu: 'Замороженный (-16 °C)',
        doughColor: '#bbf7d0',
        doughNameRu: 'Пшеничное тесто со свежевыжатым соком шпината',
        doughThicknessMm: 1.1,
        fillingRu: 'Филе куриной грудки и индейки со сливочным сыром',
        fillingColor: '#fca5a5',
        fillingRatioPercent: 58,
        moldingMethodRu: 'Фигурная формовка бутоном',
        flourDusting: true,
        ingredients: [
          'Филе грудки индейки',
          'Филе куриной грудки',
          'Мука пшеничная в/с',
          'Сок листьев шпината натуральный',
          'Сыр сливочный',
          'Лук сладкий белый',
          'Яйцо перепелиное',
          'Соль морская'
        ]
      },
      {
        shape: 'pillow',
        shapeNameRu: 'Подушечка с зубчатым краем',
        size: 'small',
        sizeNameRu: 'Мелкий («Столичный», 11 г)',
        state: 'frozen',
        stateNameRu: 'Замороженный (-16 °C)',
        doughColor: '#fecdd3',
        doughNameRu: 'Пшеничное тесто с натуральным соком молодой свёклы',
        doughThicknessMm: 1.1,
        fillingRu: 'Нежная телятина со сливками и сладким луком',
        fillingColor: '#dc2626',
        fillingRatioPercent: 60,
        moldingMethodRu: 'Зубчатая штамповка конвертиком',
        flourDusting: true,
        ingredients: [
          'Телятина вырезка',
          'Сливки 20%',
          'Мука пшеничная в/с',
          'Сок молодой свёклы прямого отжима',
          'Лук репчатый',
          'Яйцо куриное',
          'Масло сливочное',
          'Соль'
        ]
      },
      {
        shape: 'ear',
        shapeNameRu: 'Сибирское «ушко»',
        size: 'small',
        sizeNameRu: 'Мелкий («Столичный», 11 г)',
        state: 'frozen',
        stateNameRu: 'Замороженный (-16 °C)',
        doughColor: '#fde047',
        doughNameRu: 'Пшеничное тесто с морковным соком и куркумой',
        doughThicknessMm: 1.1,
        fillingRu: 'Индейка и кролик с топлёным маслом',
        fillingColor: '#f87171',
        fillingRatioPercent: 59,
        moldingMethodRu: 'Ручной защип колечком',
        flourDusting: true,
        ingredients: [
          'Мясо кролика бескостное',
          'Филе бедра индейки',
          'Мука пшеничная в/с',
          'Сок морковный свежевыжатый',
          'Куркума натуральная',
          'Масло топлёное',
          'Яйцо куриное',
          'Соль'
        ]
      }
    ]
  },

  // === ШОКОЛАД И ШОКОЛАДНЫЕ УПАКОВКИ ===
  choc_mini_truffle_hazelnut: {
    containerId: 'chocolate_pack_mini',
    countInside: 1,
    innerItemId: 'chocolate',
    labelColor: '#7c2d12',
    containerTintColor: '#f59e0b',
    customNameRu: 'Конфета «Золотой трюфель» (мини-обёртка, 12г)',
    customDescriptionRu: 'Мини-обёртка из золотистой фольги с манжетой: купольный трюфель из тёмного шоколада, обсыпанный какао, с начинкой пралине и дроблёного фундука.',
    innerChocolatePresets: [
      {
        shape: 'truffle_dome',
        shapeNameRu: 'Купольный трюфель',
        size: 'mini',
        sizeNameRu: 'Мини (12 г)',
        outerMaterialRu: 'Тёмный шоколад 64% с бархатистой пудрой алкализованного какао',
        outerColor: '#3b1d12',
        outerColorNameRu: 'Глубокий тёмно-каштановый',
        innerMaterialRu: 'Нежный трюфельный ганаш-пралине с тёртым фундуком',
        innerColor: '#92400e',
        innerColorNameRu: 'Золотисто-ореховый',
        hasFilling: true,
        cocoaPercent: 64,
        flavorRu: 'Трюфель с жареным фундуком',
        surfaceTexture: 'dusted',
        ingredients: [
          'Какао тёртое',
          'Масло какао',
          'Пралине фундучное (28%)',
          'Сливки пастеризованные',
          'Сахар',
          'Какао-порошок алкализованный'
        ]
      }
    ]
  },
  choc_mini_ruby_heart: {
    containerId: 'chocolate_pack_mini',
    countInside: 1,
    innerItemId: 'chocolate',
    labelColor: '#be185d',
    containerTintColor: '#fbcfe8',
    customNameRu: 'Шоколадное сердечко «Рубиновая малина» (мини-обёртка, 12г)',
    customDescriptionRu: 'Миниатюрная обёртка из розовой фольги с рубиновым шоколадным сердечком и малиновой кремовой начинкой.',
    innerChocolatePresets: [
      {
        shape: 'praline_heart',
        shapeNameRu: 'Фигурное сердечко пралине',
        size: 'mini',
        sizeNameRu: 'Мини (12 г)',
        outerMaterialRu: 'Розовый рубиновый шоколад Ruby (47% какао-бобов)',
        outerColor: '#db2777',
        outerColorNameRu: 'Ягодно-рубиновый',
        innerMaterialRu: 'Воздушный крем-мусс с сублимированной лесной малиной',
        innerColor: '#fda4af',
        innerColorNameRu: 'Нежно-малиновый',
        hasFilling: true,
        cocoaPercent: 47,
        flavorRu: 'Рубиновый шоколад и малина',
        surfaceTexture: 'smooth',
        ingredients: [
          'Сахар',
          'Масло какао',
          'Какао-бобы Ruby',
          'Молоко сухое цельное',
          'Малина сублимированная',
          'Сливки сухие',
          'Лимонная кислота'
        ]
      }
    ]
  },
  choc_bar_caramel_chunky: {
    containerId: 'chocolate_pack_bar',
    countInside: 1,
    innerItemId: 'chocolate',
    labelColor: '#b45309',
    containerTintColor: '#e2e8f0',
    customNameRu: 'Батончик «Солёная карамель и арахис» (флоу-пак, 45г)',
    customDescriptionRu: 'Узкий флоу-пак: батончик с округлыми сегментами из молочного шоколада, тягучей солёной карамелью и хрустящим арахисом внутри.',
    innerChocolatePresets: [
      {
        shape: 'chunky_bar',
        shapeNameRu: 'Батончик с округлыми сегментами',
        size: 'small',
        sizeNameRu: 'Малый батончик (45 г)',
        outerMaterialRu: 'Молочный шоколад 38% с обжаренной арахисовой крошкой',
        outerColor: '#6f3e21',
        outerColorNameRu: 'Тёпло-шоколадный',
        innerMaterialRu: 'Тягучая солёная сливочная карамель с дроблёным арахисом',
        innerColor: '#d97706',
        innerColorNameRu: 'Янтарно-карамельный',
        hasFilling: true,
        cocoaPercent: 38,
        flavorRu: 'Солёная карамель и жареный арахис',
        surfaceTexture: 'nuts',
        ingredients: [
          'Молочный шоколад',
          'Карамель сливочная',
          'Арахис жареный дроблёный',
          'Соль морская флёр-де-сель',
          'Патока',
          'Масло сливочное'
        ]
      }
    ]
  },
  choc_bar_coconut_bounty: {
    containerId: 'chocolate_pack_bar',
    countInside: 1,
    innerItemId: 'chocolate',
    labelColor: '#0284c7',
    containerTintColor: '#f8fafc',
    customNameRu: 'Батончик «Тропический кокос» (флоу-пак, 45г)',
    customDescriptionRu: 'Узкий флоу-пак с батончиком из молочного шоколада и белоснежной сочной мякотью кокоса внутри.',
    innerChocolatePresets: [
      {
        shape: 'chunky_bar',
        shapeNameRu: 'Батончик с округлыми сегментами',
        size: 'small',
        sizeNameRu: 'Малый батончик (45 г)',
        outerMaterialRu: 'Сливочный молочный шоколад 35%',
        outerColor: '#724124',
        outerColorNameRu: 'Светло-шоколадный',
        innerMaterialRu: 'Влажная стружка мякоти спелого кокоса в кокосовых сливках',
        innerColor: '#f8fafc',
        innerColorNameRu: 'Белоснежный кокосовый',
        hasFilling: true,
        cocoaPercent: 35,
        flavorRu: 'Нежный кокос и молочный шоколад',
        surfaceTexture: 'smooth',
        ingredients: [
          'Мякоть кокоса сушёная (34%)',
          'Молочный шоколад',
          'Сахар',
          'Глюкозный сироп',
          'Кокосовые сливки',
          'Ванилин натуральный'
        ]
      }
    ]
  },
  choc_bar_wafer_crispy: {
    containerId: 'chocolate_pack_bar',
    countInside: 2,
    innerItemId: 'chocolate',
    labelColor: '#dc2626',
    containerTintColor: '#cbd5e1',
    customNameRu: 'Вафельные палочки в шоколаде «Хрустящий дуэт» (флоу-пак, 24г)',
    customDescriptionRu: 'Узкий флоу-пак с двумя хрустящими вафельными палочками, покрытыми молочным шоколадом, со слоями сливочно-орехового пралине.',
    innerChocolatePresets: [
      {
        shape: 'wafer_stick',
        shapeNameRu: 'Вафельно-шоколадная палочка',
        size: 'mini',
        sizeNameRu: 'Мини (12 г)',
        outerMaterialRu: 'Глазурь из молочного шоколада 34% с вафельной крошкой',
        outerColor: '#7c4727',
        outerColorNameRu: 'Сливочно-коричневый',
        innerMaterialRu: 'Тонкие хрустящие вафельные коржи с прослойкой лесного ореха',
        innerColor: '#fde68a',
        innerColorNameRu: 'Золотисто-кремовый вафельный',
        hasFilling: true,
        cocoaPercent: 34,
        flavorRu: 'Хрустящая вафля и сливочное пралине',
        surfaceTexture: 'crisps',
        ingredients: [
          'Молочный шоколад',
          'Мука пшеничная в/с',
          'Сахар',
          'Масло кокосовое',
          'Фундучная паста',
          'Сухое молоко'
        ]
      }
    ]
  },
  choc_foil_milk_classic: {
    containerId: 'chocolate_pack_foil',
    countInside: 1,
    innerItemId: 'chocolate',
    labelColor: '#1d4ed8',
    containerTintColor: '#e2e8f0',
    customNameRu: 'Шоколад «Альпийское молоко» классический (фольга+бумага, 95г)',
    customDescriptionRu: 'Классическая двухслойная обёртка (тиснёная серебряная фольга + бумажная этикетка): цельная дольчатая плитка молочного шоколада.',
    innerChocolatePresets: [
      {
        shape: 'classic_bar',
        shapeNameRu: 'Классическая дольчатая плитка',
        size: 'medium',
        sizeNameRu: 'Стандартная плитка (95 г)',
        outerMaterialRu: 'Классический альпийский молочный шоколад 36%',
        outerColor: '#6b3e26',
        outerColorNameRu: 'Тёпло-коричневый (молочный)',
        innerMaterialRu: 'Однородная цельная масса из цельного молока и какао-масла',
        innerColor: '#7c4a2d',
        innerColorNameRu: 'Сливочно-шоколадный',
        hasFilling: false,
        cocoaPercent: 36,
        flavorRu: 'Сливочное молоко и бурбонская ваниль',
        surfaceTexture: 'smooth',
        ingredients: [
          'Сахар',
          'Масло какао',
          'Молоко сухое цельное (22%)',
          'Какао тёртое',
          'Сыворотка молочная',
          'Экстракт ванили'
        ]
      }
    ]
  },
  choc_foil_dark_bitter_85: {
    containerId: 'chocolate_pack_foil',
    countInside: 1,
    innerItemId: 'chocolate',
    labelColor: '#18181b',
    containerTintColor: '#fbbf24',
    customNameRu: 'Шоколад горький элитный 85% «Эквадор» (фольга+бумага, 95г)',
    customDescriptionRu: 'Тиснёная золотая фольга и строгий бумажный рукав: плитка горького шоколада из отборных бобов Ариба Насьональ с какао-крупкой.',
    innerChocolatePresets: [
      {
        shape: 'classic_bar',
        shapeNameRu: 'Классическая дольчатая плитка',
        size: 'medium',
        sizeNameRu: 'Стандартная плитка (95 г)',
        outerMaterialRu: 'Экстра-горький тёмный шоколад 85% (моносорт Эквадор)',
        outerColor: '#26130b',
        outerColorNameRu: 'Глубокий чёрно-шоколадный',
        innerMaterialRu: 'Насыщенная терпкая какао-масса с обжаренными какао-нибсами',
        innerColor: '#361a0e',
        innerColorNameRu: 'Тёмный эспрессо-какао',
        hasFilling: false,
        cocoaPercent: 85,
        flavorRu: 'Благородная горчинка и дымный какао',
        surfaceTexture: 'crisps',
        ingredients: [
          'Какао тёртое Эквадор (74%)',
          'Масло какао (11%)',
          'Сахар тростниковый нерафинированный',
          'Крупка какао-бобов обжаренная'
        ]
      }
    ]
  },
  choc_foil_dubai_pistachio: {
    containerId: 'chocolate_pack_foil',
    countInside: 1,
    innerItemId: 'chocolate',
    labelColor: '#047857',
    containerTintColor: '#fbbf24',
    customNameRu: 'Шоколад «Дубайский фисташковый катаифи» (фольга+бумага, 95г)',
    customDescriptionRu: 'Золотая фольга и изумрудная обёртка: рельефная волнистая плитка из молочного шоколада с хрустящим тестом катаифи, фисташковой пастой и тахини внутри.',
    innerChocolatePresets: [
      {
        shape: 'wave_bar',
        shapeNameRu: 'Волнистая рельефная плитка',
        size: 'medium',
        sizeNameRu: 'Стандартная плитка (95 г)',
        outerMaterialRu: 'Глянцевый молочный шоколад 40% с фисташковыми брызгами',
        outerColor: '#6d3b20',
        outerColorNameRu: 'Блестящий какао-молочный',
        innerMaterialRu: 'Хрустящее обжаренное тесто катаифи, паста зелёной фисташки и тахини',
        innerColor: '#65a30d',
        innerColorNameRu: 'Изумрудно-фисташковый',
        hasFilling: true,
        cocoaPercent: 40,
        flavorRu: 'Фисташковый крем, тахини и хруст катаифи',
        surfaceTexture: 'marbled',
        ingredients: [
          'Молочный шоколад (50%)',
          'Паста фисташковая 100% (24%)',
          'Нити теста катаифи обжаренные (16%)',
          'Кунжутная паста тахини',
          'Масло топлёное',
          'Щепотка соли'
        ]
      }
    ]
  },
  choc_square_mint_fondant: {
    containerId: 'chocolate_pack_square',
    countInside: 1,
    innerItemId: 'chocolate',
    labelColor: '#0f766e',
    containerTintColor: '#e2e8f0',
    customNameRu: 'Шоколад квадратный «Мятная прохлада» (кник-пак, 95г)',
    customDescriptionRu: 'Квадратная упаковка кник-пак: плитка 3×3 из тёмного шоколада со свежей мятной помадной начинкой внутри.',
    innerChocolatePresets: [
      {
        shape: 'square_tile',
        shapeNameRu: 'Квадратная плитка (3×3)',
        size: 'medium',
        sizeNameRu: 'Стандартная плитка (95 г)',
        outerMaterialRu: 'Тёмный десертный шоколад 62%',
        outerColor: '#351b11',
        outerColorNameRu: 'Тёмно-коричневый',
        innerMaterialRu: 'Охлаждающая помадка с натуральным маслом перечной мяты',
        innerColor: '#a7f3d0',
        innerColorNameRu: 'Светло-мятный нежный',
        hasFilling: true,
        cocoaPercent: 62,
        flavorRu: 'Терпкий какао и свежая перечная мята',
        surfaceTexture: 'smooth',
        ingredients: [
          'Тёмный шоколад (58%)',
          'Сахарная помадка',
          'Глюкозный сироп',
          'Масло перечной мяты натуральное',
          'Инвертаза'
        ]
      }
    ]
  },
  choc_square_white_strawberry: {
    containerId: 'chocolate_pack_square',
    countInside: 1,
    innerItemId: 'chocolate',
    labelColor: '#e11d48',
    containerTintColor: '#fef3c7',
    customNameRu: 'Шоколад квадратный «Белый с клубничным кремом» (кник-пак, 95г)',
    customDescriptionRu: 'Квадратная упаковка с линией разлома: белая плитка 3×3 из натурального какао-масла со сливочно-клубничной начинкой.',
    innerChocolatePresets: [
      {
        shape: 'square_tile',
        shapeNameRu: 'Квадратная плитка (3×3)',
        size: 'medium',
        sizeNameRu: 'Стандартная плитка (95 г)',
        outerMaterialRu: 'Белый шоколад на чистом масле какао и сливках',
        outerColor: '#f5e6c8',
        outerColorNameRu: 'Сливочно-кремовый (белый)',
        innerMaterialRu: 'Ягодный мусс из пюре садовой клубники и маскарпоне',
        innerColor: '#fb7185',
        innerColorNameRu: 'Нежно-розовый клубничный',
        hasFilling: true,
        cocoaPercent: 32,
        flavorRu: 'Сливочная ваниль и спелая клубника',
        surfaceTexture: 'smooth',
        ingredients: [
          'Масло какао',
          'Сахар',
          'Молоко сухое цельное',
          'Пюре клубники сублимированное',
          'Сыр сливочный сухой',
          'Ваниль мадагаскарская'
        ]
      }
    ]
  },
  choc_prism_honey_nougat: {
    containerId: 'chocolate_pack_prism',
    countInside: 1,
    innerItemId: 'chocolate',
    labelColor: '#ca8a04',
    containerTintColor: '#fbbf24',
    customNameRu: 'Шоколад-призма «Альпийский пик с мёдом и нугой» (180г)',
    customDescriptionRu: 'Знаменитая треугольная картонная призма с золотой фольгой: крупная треугольная плитка с зубцами из молочного шоколада, медово-миндальной нуги и дроблёного миндаля.',
    innerChocolatePresets: [
      {
        shape: 'triangle_prism',
        shapeNameRu: 'Треугольная призма с зубцами',
        size: 'large',
        sizeNameRu: 'Большая плитка (180 г)',
        outerMaterialRu: 'Швейцарский молочный шоколад 34% с крошкой миндальной нуги',
        outerColor: '#704124',
        outerColorNameRu: 'Золотисто-коричневый молочный',
        innerMaterialRu: 'Твёрдая медово-миндальная нуга с цветочным мёдом и орехами',
        innerColor: '#fef08a',
        innerColorNameRu: 'Медово-кремовый',
        hasFilling: true,
        cocoaPercent: 34,
        flavorRu: 'Цветочный мёд, миндаль и тягучая нуга',
        surfaceTexture: 'nuts',
        ingredients: [
          'Сахар',
          'Молоко сухое цельное',
          'Масло какао',
          'Какао тёртое',
          'Мёд цветочный (3%)',
          'Миндаль жареный дроблёный (1.6%)',
          'Белок яичный (нуга)'
        ]
      }
    ]
  },
  choc_king_whole_hazelnut: {
    containerId: 'chocolate_pack_king',
    countInside: 1,
    innerItemId: 'chocolate',
    labelColor: '#451a03',
    containerTintColor: '#fbbf24',
    customNameRu: 'Большая плитка XXL «Цельный лесной орех» (крафт, 300г)',
    customDescriptionRu: 'Массивный крафт-конверт XXL с золочёной фольгой: гигантская семейная плитка 300 г с цельными ядрами жареного фундука.',
    innerChocolatePresets: [
      {
        shape: 'classic_bar',
        shapeNameRu: 'Классическая дольчатая плитка',
        size: 'king',
        sizeNameRu: 'Семейный XXL (300 г)',
        outerMaterialRu: 'Плотный молочно-ореховый шоколад (42% какао) с цельным фундуком',
        outerColor: '#5c331c',
        outerColorNameRu: 'Насыщенно-коричневый ореховый',
        innerMaterialRu: 'Цельные хрустящие ядра отборного жареного фундука в шоколаде',
        innerColor: '#d97706',
        innerColorNameRu: 'Жареный фундук в шоколаде',
        hasFilling: true,
        cocoaPercent: 42,
        flavorRu: 'Цельный жареный фундук и бархатный шоколад',
        surfaceTexture: 'nuts',
        ingredients: [
          'Молочный шоколад 42%',
          'Фундук цельный отборный жареный (26%)',
          'Тёртая ореховая паста джандуйя',
          'Экстракт ванили'
        ]
      }
    ]
  },
  choc_king_matcha_yuzu: {
    containerId: 'chocolate_pack_king',
    countInside: 1,
    innerItemId: 'chocolate',
    labelColor: '#3f6212',
    containerTintColor: '#fde047',
    customNameRu: 'Ремесленная плитка XXL «Матча Удзи и Юзу» (крафт, 180г)',
    customDescriptionRu: 'Крупный крафт-конверт: ремесленная волнистая плитка белого шоколада с японским зелёным чаем Матча и цитрусовой начинкой юзу.',
    innerChocolatePresets: [
      {
        shape: 'wave_bar',
        shapeNameRu: 'Волнистая рельефная плитка',
        size: 'large',
        sizeNameRu: 'Большая плитка (180 г)',
        outerMaterialRu: 'Белый шоколад, растёртый на меланжере с пудрой зелёного чая Матча',
        outerColor: '#4d7c0f',
        outerColorNameRu: 'Травянисто-зелёный (Матча)',
        innerMaterialRu: 'Ароматный цитрусовый ганаш из японского юзу и лимонного курда',
        innerColor: '#fde047',
        innerColorNameRu: 'Солнечно-лимонный юзу',
        hasFilling: true,
        cocoaPercent: 34,
        flavorRu: 'Терпкий зелёный чай Матча и яркий юзу',
        surfaceTexture: 'marbled',
        ingredients: [
          'Масло какао холодного отжима',
          'Сахар тростниковый',
          'Молоко сухое цельное',
          'Чай Матча Удзи церемониальный',
          'Сок и цедра юзу',
          'Сливки 33%'
        ]
      }
    ]
  },
  choc_gift_box_assorted: {
    containerId: 'chocolate_pack_box',
    countInside: 16,
    innerItemId: 'chocolate',
    labelColor: '#881337',
    containerTintColor: '#fbbf24',
    customNameRu: 'Коробка шоколадных конфет «Ассорти Гранд Пралине» (16 шт., 192г)',
    customDescriptionRu: 'Роскошная подарочная коробка со смотровым окном, золотым коррексом и атласным бантом: 16 фигурных конфет (ракушки, ромбы, медальоны, сердечки, трюфели и дольки).',
    innerChocolatePresets: [
      {
        shape: 'shell_seashell',
        shapeNameRu: 'Морская ракушка пралине',
        size: 'mini',
        sizeNameRu: 'Мини (12 г)',
        outerMaterialRu: 'Мраморный бельгийский молочный и белый шоколад',
        outerColor: '#854d27',
        outerColorNameRu: 'Мраморный карамельно-шоколадный',
        innerMaterialRu: 'Шелковистое бельгийское ореховое пралине с нотой фундука',
        innerColor: '#a16207',
        innerColorNameRu: 'Кремово-ореховый',
        hasFilling: true,
        cocoaPercent: 38,
        flavorRu: 'Мраморная ракушка с фундучным пралине',
        surfaceTexture: 'marbled',
        ingredients: ['Бельгийский шоколад', 'Пралине из фундука', 'Масло какао', 'Ваниль']
      },
      {
        shape: 'diamond_bonbon',
        shapeNameRu: 'Огранённый ромб-конфета',
        size: 'mini',
        sizeNameRu: 'Мини (12 г)',
        outerMaterialRu: 'Тёмный глянцевый шоколад 70%',
        outerColor: '#2d160c',
        outerColorNameRu: 'Тёмно-глянцевый какао',
        innerMaterialRu: 'Апельсиново-коньячный трюфельный ганаш с цедрой',
        innerColor: '#ea580c',
        innerColorNameRu: 'Апельсиново-медный',
        hasFilling: true,
        cocoaPercent: 70,
        flavorRu: 'Горький шоколад и красный апельсин',
        surfaceTexture: 'smooth',
        ingredients: ['Тёмный шоколад 70%', 'Сливки', 'Цедра сицилийского апельсина', 'Мёд']
      },
      {
        shape: 'medallion_coin',
        shapeNameRu: 'Шоколадный медальон',
        size: 'mini',
        sizeNameRu: 'Мини (12 г)',
        outerMaterialRu: 'Карамелизованный золотой шоколад Dulce (35% какао)',
        outerColor: '#b45309',
        outerColorNameRu: 'Золотисто-карамельный',
        innerMaterialRu: 'Сливочный крем-брюле с хрустящей вафельной крошкой роялтин',
        innerColor: '#fef3c7',
        innerColorNameRu: 'Ванильно-сливочный',
        hasFilling: true,
        cocoaPercent: 35,
        flavorRu: 'Жжёная карамель и хрустящий роялтин',
        surfaceTexture: 'smooth',
        ingredients: ['Карамельный шоколад', 'Сливки', 'Вафельная крошка', 'Морская соль']
      },
      {
        shape: 'praline_heart',
        shapeNameRu: 'Фигурное сердечко пралине',
        size: 'mini',
        sizeNameRu: 'Мини (12 г)',
        outerMaterialRu: 'Рубиновый ягодный шоколад Ruby',
        outerColor: '#be185d',
        outerColorNameRu: 'Рубиново-розовый',
        innerMaterialRu: 'Крем из вишни и миндального марципана',
        innerColor: '#f43f5e',
        innerColorNameRu: 'Вишнёвый',
        hasFilling: true,
        cocoaPercent: 47,
        flavorRu: 'Вишнёвый марципан в рубиновом шоколаде',
        surfaceTexture: 'smooth',
        ingredients: ['Шоколад Ruby', 'Миндаль бланшированный', 'Вишнёвое пюре', 'Сахар']
      },
      {
        shape: 'truffle_dome',
        shapeNameRu: 'Купольный трюфель',
        size: 'mini',
        sizeNameRu: 'Мини (12 г)',
        outerMaterialRu: 'Тёмный шоколад 65% в какао-пудре',
        outerColor: '#3b1d12',
        outerColorNameRu: 'Бархатный каштановый',
        innerMaterialRu: 'Классический сливочно-кофейный ганаш эспрессо',
        innerColor: '#573018',
        innerColorNameRu: 'Кофейно-шоколадный',
        hasFilling: true,
        cocoaPercent: 65,
        flavorRu: 'Кофейный трюфель в какао',
        surfaceTexture: 'dusted',
        ingredients: ['Тёмный шоколад', 'Сливки 35%', 'Эспрессо', 'Какао-порошок']
      },
      {
        shape: 'break_piece',
        shapeNameRu: 'Отломанная долька со сколом',
        size: 'mini',
        sizeNameRu: 'Мини (12 г)',
        outerMaterialRu: 'Молочный шоколад 40% с кусочками миндаля',
        outerColor: '#6b3e26',
        outerColorNameRu: 'Классический молочный',
        innerMaterialRu: 'Фисташковый марципан с цельным миндалём',
        innerColor: '#84cc16',
        innerColorNameRu: 'Фисташково-салатовый',
        hasFilling: true,
        cocoaPercent: 40,
        flavorRu: 'Ореховый скол с фисташковым марципаном',
        surfaceTexture: 'nuts',
        ingredients: ['Молочный шоколад', 'Фисташковый марципан', 'Миндаль', 'Масло какао']
      }
    ]
  }
};

