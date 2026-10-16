import { onlineManager } from './onlineSystem';
import { auth, createP2PServerDoc, removeP2PServerDoc, updateP2PServerHeartbeat } from './firebase';

/**
 * Host-side P2P session opened from the pause menu ("Открыть сессию для друзей").
 *
 * The room itself lives in onlineManager (PeerJS). This module additionally owns the optional entry in the
 * public server catalogue (Firestore `p2p_servers`) and its heartbeat, independent of any React component
 * lifetime, because the pause menu unmounts as soon as the player returns to the game.
 *
 * access = 'all'  -> the room is listed in the server catalogue
 * access = 'code' -> the room is not listed; players need the room code (or an invite)
 */
export type HostAccess = 'all' | 'code';

export const MAP_NAME = 'Степной Тракт 2D';
export const DEFAULT_MAX_PLAYERS = 8;

interface HostSession {
  access: HostAccess;
  maxPlayers: number;
  docId: string | null;
  serverName: string;
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

async function registerInCatalogue(s: HostSession, hostName: string): Promise<void> {
  try {
    s.docId = await createP2PServerDoc({
      hostUid: auth.currentUser?.uid || 'guest_' + Date.now(),
      hostName,
      name: s.serverName,
      peerId: onlineManager.roomCode,
      maxPlayers: s.maxPlayers,
      currentPlayers: onlineManager.getRemotePlayersArray().length + 1,
      mapName: MAP_NAME,
      gameMode: 'free_roam',
      isPrivate: false,
      status: 'active'
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
export async function openHostSession(opts: { access: HostAccess; maxPlayers?: number; nickname?: string }): Promise<void> {
  if (busy || onlineManager.status === 'connected' || onlineManager.status === 'connecting') return;
  busy = true;
  notify();
  try {
    const nickname = (opts.nickname || onlineManager.localPlayerName || 'Игрок').trim();
    const code = 'room-' + Math.floor(1000 + Math.random() * 9000);
    const s: HostSession = {
      access: opts.access,
      maxPlayers: opts.maxPlayers ?? DEFAULT_MAX_PLAYERS,
      docId: null,
      serverName: 'Сервер ' + nickname
    };
    session = s;
    onlineManager.joinOrCreateRoom(code, nickname, true);
    if (s.access === 'all') await registerInCatalogue(s, nickname);
    startHeartbeat();
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
      session = { access, maxPlayers: DEFAULT_MAX_PLAYERS, docId: null, serverName: 'Сервер ' + onlineManager.localPlayerName };
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
