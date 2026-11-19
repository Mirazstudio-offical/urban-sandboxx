/**
 * Persistent game saves storage backed by IndexedDB (FlatbodyDB / 'saves' store).
 * Replaces the 5 MB localStorage bottleneck with hundreds of MB of structured storage,
 * and seamlessly migrates legacy localStorage saves ('flatbody_saves') on first load.
 */

const DB_NAME = 'FlatbodyDB';
const DB_VERSION = 2;
const SAVES_STORE = 'saves';
const MAPS_STORE = 'maps';
const SAVES_RECORD_KEY = 'all_saves_v1';
const LEGACY_LS_KEY = 'flatbody_saves';

function openFlatbodyDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e: any) => {
        const db: IDBDatabase = e.target.result;
        if (!db.objectStoreNames.contains(MAPS_STORE)) {
          db.createObjectStore(MAPS_STORE);
        }
        if (!db.objectStoreNames.contains(SAVES_STORE)) {
          db.createObjectStore(SAVES_STORE);
        }
      };
      req.onsuccess = (e: any) => resolve(e.target.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function readLegacyLocalStorageSaves(): any[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LEGACY_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFallbackLocalStorageSaves(saves: any[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LEGACY_LS_KEY, JSON.stringify(saves));
  } catch (e) {
    console.warn('[SaveStorage] localStorage fallback quota exceeded, pruning oldest saves:', e);
    try {
      localStorage.setItem(LEGACY_LS_KEY, JSON.stringify(saves.slice(0, 3)));
    } catch {
      // Ignore if storage is completely blocked
    }
  }
}

/**
 * Loads all saved game sessions from IndexedDB.
 * Automatically migrates any existing saves from legacy localStorage on first run.
 */
export async function loadSavesFromStorage(): Promise<any[]> {
  const db = await openFlatbodyDB();
  if (!db) {
    return readLegacyLocalStorageSaves();
  }

  try {
    const idbSaves = await new Promise<any[] | null>((resolve) => {
      try {
        const tx = db.transaction(SAVES_STORE, 'readonly');
        const req = tx.objectStore(SAVES_STORE).get(SAVES_RECORD_KEY);
        req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });

    const legacySaves = readLegacyLocalStorageSaves();

    if (idbSaves && idbSaves.length > 0) {
      // Merge any un-migrated legacy saves by unique id, then free localStorage space
      if (legacySaves.length > 0) {
        const existingIds = new Set(idbSaves.map((s) => s?.id));
        const merged = [...idbSaves, ...legacySaves.filter((s) => s && !existingIds.has(s.id))];
        const saved = await writeSavesToIDB(db, merged);
        if (saved) {
          try {
            localStorage.removeItem(LEGACY_LS_KEY);
          } catch {}
        }
        return merged;
      }
      return idbSaves;
    }

    if (legacySaves.length > 0) {
      const migrated = await writeSavesToIDB(db, legacySaves);
      if (migrated) {
        try {
          localStorage.removeItem(LEGACY_LS_KEY);
        } catch {}
      }
      return legacySaves;
    }

    return [];
  } catch (err) {
    console.warn('[SaveStorage] IndexedDB read failed, using localStorage fallback:', err);
    return readLegacyLocalStorageSaves();
  }
}

function writeSavesToIDB(db: IDBDatabase, saves: any[]): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(SAVES_STORE, 'readwrite');
      tx.objectStore(SAVES_STORE).put(saves, SAVES_RECORD_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Persists all saved game sessions to IndexedDB (with graceful fallback to localStorage).
 */
export async function saveSavesToStorage(saves: any[]): Promise<void> {
  const db = await openFlatbodyDB();
  if (!db) {
    writeFallbackLocalStorageSaves(saves);
    return;
  }

  const ok = await writeSavesToIDB(db, saves);
  if (ok) {
    // Keep legacy localStorage clean once saves are safely persisted in IndexedDB
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem(LEGACY_LS_KEY)) {
        localStorage.removeItem(LEGACY_LS_KEY);
      }
    } catch {}
  } else {
    writeFallbackLocalStorageSaves(saves);
  }
}

export const DEFAULT_PHONE_NOTES =
  'Мои заметки:\n· Проверить масло в двигателе\n· Купить канистру бензина АИ-95\n· Заехать в автосервис к Санычу\n· Проверить свечи зажигания';

const PHONE_NOTES_LS_KEY = 'player_phone_notes';
let activeWorldPhoneNotes: string | null = null;

export function getActiveWorldPhoneNotes(): string {
  if (activeWorldPhoneNotes !== null) return activeWorldPhoneNotes;
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(PHONE_NOTES_LS_KEY);
      if (typeof saved === 'string') {
        activeWorldPhoneNotes = saved;
        return saved;
      }
    }
  } catch {}
  activeWorldPhoneNotes = DEFAULT_PHONE_NOTES;
  return activeWorldPhoneNotes;
}

export function setActiveWorldPhoneNotes(text: string): void {
  activeWorldPhoneNotes = text;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PHONE_NOTES_LS_KEY, text);
    }
  } catch {}
}

export function resetActiveWorldPhoneNotes(): void {
  setActiveWorldPhoneNotes(DEFAULT_PHONE_NOTES);
}

