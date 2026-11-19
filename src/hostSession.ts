import { onlineManager, AntiCheatLevel } from './onlineSystem';
import { auth, createP2PServerDoc, removeP2PServerDoc, updateP2PServerHeartbeat } from './firebase';

/**
 * Host-side P2P session manager shared across MainMenu, PauseMenu, and OnlineModal.
 *
 * The room itself lives in onlineManager (PeerJS). This module owns the optional entry in the
 * public server catalogue (Firestore `p2p_servers`) and its 10s heartbeat, independent of any React
 * component lifetime, and cleans up on exit / tab close so stale rooms disappear promptly.
 *
 * access = 'all'  -> the room is listed in the server catalogue
 * access = 'code' -> the room is not listed; players need the room code (or an invite)
 */
export type HostAccess = 'all' | 'code';

export const MAP_NAME = 'flatbody';
export const DEFAULT_MAX_PLAYERS = 8;

interface HostSession {
  access: HostAccess;
  maxPlayers: number;
  docId: string | null;
  serverName: string;
  gameMode: string;
  mapName: string;
}

let session: HostSession | null = null;
let heartbeat: number | undefined;
let busy = false;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach(l => l());

export function subscribeHostSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getHostSession(): Readonly<HostSession> | null {
  return session;
}

export function isHostSessionBusy(): boolean {
  return busy;
}

function stopHeartbeat() {
  if (heartbeat !== undefined) {
    window.clearInterval(heartbeat);
    heartbeat = undefined;
  }
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeat = window.setInterval(() => {
    if (!session?.docId) return;
    if (onlineManager.status !== 'connected' || !onlineManager.isHost) return;
    const count = onlineManager.getRemotePlayersArray().length + 1;
    updateP2PServerHeartbeat(session.docId, count, 'active');
  }, 10000);
}

// Best-effort cleanup when host closes the browser tab
if (typeof window !== 'undefined') {
  const cleanupOnUnload = () => {
    if (session?.docId) {
      const id = session.docId;
      session.docId = null;
      void removeP2PServerDoc(id);
    }
  };
  window.addEventListener('beforeunload', cleanupOnUnload);
  window.addEventListener('pagehide', cleanupOnUnload);
}

async function registerInCatalogue(s: HostSession, hostName: string, settings?: any): Promise<void> {
  if (!auth.currentUser) {
    // Only signed-in users can list public rooms in Firestore (enforced by firestore.rules)
    s.docId = null;
    return;
  }
  try {
    s.docId = await createP2PServerDoc({
      hostUid: auth.currentUser.uid,
      hostName: hostName.slice(0, 64),
      name: s.serverName.slice(0, 80),
      peerId: onlineManager.roomCode.slice(0, 64),
      maxPlayers: s.maxPlayers,
      currentPlayers: onlineManager.getRemotePlayersArray().length + 1,
      mapName: s.mapName || MAP_NAME,
      gameMode: s.gameMode || 'free_roam',
      isPrivate: settings?.passwordRequired || false,
      status: 'active',
      trafficEnabled: settings?.trafficEnabled ?? true,
      vehicleCount: settings?.vehicleCount ?? 15,
      pedestrianCount: settings?.pedestrianCount ?? 10,
      hasPassword: settings?.passwordRequired || false,
      savePlayerData: settings?.savePlayerData ?? true,
      antiCheat: settings?.antiCheat ?? 'moderate'
    });
  } catch (err) {
    console.error('Failed to register server in the catalogue', err);
    s.docId = null;
  }
}

async function unregisterFromCatalogue(s: HostSession): Promise<void> {
  if (!s.docId) return;
  const id = s.docId;
  s.docId = null;
  try {
    await removeP2PServerDoc(id);
  } catch (err) {
    console.error('Failed to remove server from the catalogue', err);
  }
}

/** Opens a new room as host. No-op when this client is already connected to a room. */
export async function openHostSession(opts: {
  access: HostAccess;
  roomCode?: string;
  serverName?: string;
  mapName?: string;
  gameMode?: string;
  maxPlayers?: number;
  nickname?: string;
  trafficEnabled?: boolean;
  vehicleCount?: number;
  pedestrianCount?: number;
  passwordRequired?: boolean;
  password?: string;
  savePlayerData?: boolean;
  antiCheat?: AntiCheatLevel;
}): Promise<string | null> {
  if (busy || onlineManager.status === 'connected' || onlineManager.status === 'connecting') return onlineManager.roomCode || null;
  busy = true;
  notify();
  try {
    const nickname = (opts.nickname || onlineManager.localPlayerName || 'Игрок').trim();
    const rawCode = opts.roomCode ? onlineManager.sanitizeRoomCode(opts.roomCode) : '';
    const code = rawCode || ('room-' + Math.floor(1000 + Math.random() * 9000));
    const s: HostSession = {
      access: opts.access,
      maxPlayers: opts.maxPlayers ?? DEFAULT_MAX_PLAYERS,
      docId: null,
      serverName: (opts.serverName || ('Сервер ' + nickname)).trim(),
      gameMode: opts.gameMode || 'free_roam',
      mapName: opts.mapName || MAP_NAME
    };
    session = s;
    const settings = {
      trafficEnabled: opts.trafficEnabled ?? true,
      vehicleCount: opts.vehicleCount ?? 15,
      pedestrianCount: opts.pedestrianCount ?? 10,
      passwordRequired: opts.passwordRequired ?? false,
      password: opts.password || '',
      savePlayerData: opts.savePlayerData ?? true,
      antiCheat: opts.antiCheat ?? ('moderate' as AntiCheatLevel)
    };
    onlineManager.joinOrCreateRoom(code, nickname, true, opts.passwordRequired ? opts.password : undefined, settings);
    if (s.access === 'all') await registerInCatalogue(s, nickname, settings);
    startHeartbeat();
    return code;
  } finally {
    busy = false;
    notify();
  }
}

/** Switches the open room between "listed for everyone" and "by code only". */
export async function setHostAccess(access: HostAccess): Promise<void> {
  if (busy || onlineManager.status !== 'connected' || !onlineManager.isHost) return;
  busy = true;
  notify();
  try {
    if (!session) {
      session = {
        access,
        maxPlayers: DEFAULT_MAX_PLAYERS,
        docId: null,
        serverName: 'Сервер ' + onlineManager.localPlayerName,
        gameMode: 'free_roam',
        mapName: MAP_NAME
      };
    }
    const s = session;
    if (access === 'code') {
      await unregisterFromCatalogue(s);
    } else if (!s.docId) {
      await registerInCatalogue(s, onlineManager.localPlayerName);
    }
    s.access = access;
    startHeartbeat();
  } finally {
    busy = false;
    notify();
  }
}

/** Leaves the room (host or guest) and removes the catalogue entry if there is one. */
export async function closeHostSession(): Promise<void> {
  if (busy) return;
  busy = true;
  notify();
  try {
    stopHeartbeat();
    const s = session;
    session = null;
    if (s) await unregisterFromCatalogue(s);
    onlineManager.leaveRoom();
  } finally {
    busy = false;
    notify();
  }
}
