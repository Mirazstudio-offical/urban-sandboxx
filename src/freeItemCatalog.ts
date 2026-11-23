import { ITEM_CATALOG } from './items';

/** One row of the freeroam "give any item" catalog. */
export interface FreeCatalogEntry {
  key: string;
  nameRu: string;
  name: string;
  descriptionRu: string;
  category: string;
  maxStack: number;
  weight: number;
}

let cachedEntries: FreeCatalogEntry[] | null = null;

/**
 * Every real base item defined in ITEM_CATALOG (unpackaged raw products,
 * standalone ingredients, empty containers/packaging, tools, clothing, etc.).
 * Packaged store products are composed per-shop in map.json rather than duplicated here.
 */
export function getAllFreeCatalogItems(): FreeCatalogEntry[] {
  if (cachedEntries) return cachedEntries;

  const entries: FreeCatalogEntry[] = Object.entries(ITEM_CATALOG).map(([key, def]) => ({
    key,
    nameRu: def.nameRu || def.name,
    name: def.name,
    descriptionRu: def.descriptionRu || def.description || '',
    category: def.category,
    maxStack: Math.max(1, def.maxStack || 1),
    weight: def.weight || 0
  }));

  cachedEntries = entries;
  return entries;
}

export const FREE_CATALOG_CATEGORIES: { id: string; label: string; match: (category: string) => boolean }[] = [
  { id: 'all', label: 'Все', match: () => true },
  { id: 'food', label: 'Еда', match: c => c === 'food' },
  { id: 'drink', label: 'Напитки', match: c => c === 'drink' },
  { id: 'med', label: 'Медицина', match: c => c === 'med' || c === 'medical' },
  { id: 'tool', label: 'Инструменты', match: c => c === 'tool' || c === 'gear' },
  { id: 'clothing', label: 'Одежда', match: c => c === 'clothing' },
  { id: 'electronics', label: 'Электроника', match: c => c === 'electronics' },
  { id: 'valuable', label: 'Ценности', match: c => c === 'valuable' },
  { id: 'other', label: 'Прочее', match: c => !['food', 'drink', 'med', 'medical', 'tool', 'gear', 'clothing', 'electronics', 'valuable'].includes(c) }
];

export function getFreeCategoryLabelRu(category: string): string {
  switch (category) {
    case 'food': return 'Еда';
    case 'drink': return 'Напиток';
    case 'med':
    case 'medical': return 'Медицина';
    case 'tool': return 'Инструмент';
    case 'gear': return 'Снаряжение';
    case 'clothing': return 'Одежда';
    case 'electronics': return 'Электроника';
    case 'valuable': return 'Ценность';
    case 'furniture': return 'Мебель';
    case 'auto': return 'Авто';
    case 'trash': return 'Мусор';
    default: return 'Предмет';
  }
}
