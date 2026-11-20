import Peer, { DataConnection } from 'peerjs';
import { 
  GameCalendarState,
  CarType, 
  DeformVertex, 
  EquippedClothing, 
  GameWorld, 
  InventoryItem, 
  Player, 
  ScratchMark, 
  Vehicle, 
  VehicleDamage,
  WeatherType
} from './types';
import { CAR_CONFIGS, createDefaultEngineState, createDefaultFuelSystem, ensureVehicleDamage } from './vehicleHelpers';
import { applyPowertrain } from './powertrainVariants';
import { sound } from './audio';

export interface RemoteVehicleState {
  id: string;
  type: CarType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  steerAngle: number;
  speed: number;
  color: string;
  roofColor: string;
  
  // Lights & signals
  headlightsOn: boolean;
  headlightMode: 'off' | 'low' | 'high';
  brakeLightsOn: boolean;
  isReversing?: boolean;
  turnSignal: 'none' | 'left' | 'right' | 'hazard';
  isHonking: boolean;
  sirenOn?: boolean;
  wipersOn?: boolean;

  // Engine state
  engineRunning?: boolean;
  engineRPM?: number;
  engineTemperature?: number;

  // Damage & Geometry
  damage: {
    frontCrumple: number;
    rearCrumple: number;
    leftDent: number;
    rightDent: number;
    frontLeftDent: number;
    frontRightDent: number;
    rearLeftDent: number;
    rearRightDent: number;
    hoodBuckled: boolean;
    windshieldCracked: boolean;
    rearGlassCracked: boolean;
    leftHeadlightBroken: boolean;
    rightHeadlightBroken: boolean;
    leftTaillightBroken: boolean;
    rightTaillightBroken: boolean;
    engineSmoking?: boolean;
    underHoodSmolder?: boolean;
    engineFire?: boolean;
    fuelTankFire?: boolean;
    cabinFire?: boolean;
    isFullyBurnt?: boolean;
    scratches?: ScratchMark[];
    deformedVertices?: DeformVertex[];
    frameBentAngle?: number;
    hoodRaisedAmount?: number;
    bumperSagLeft?: number;
    bumperSagRight?: number;
  };

  // Trailer
  trailerId?: string | null;
  towedById?: string | null;
  trailerDollyAngle?: number;
  trailerDollyX?: number;
  trailerDollyY?: number;
  trailerRearX?: number;
  trailerRearY?: number;
}

export interface RemotePlayerState {
  peerId: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  walkCycle: number;
  isDashing?: boolean;
  isFlying?: boolean;
  skinColor: string;
  shirtColor: string;
  pantsColor: string;
  hairColor: string;
  
  // Clothing
  equippedClothing: EquippedClothing;
  
  // In hands
  leftHandItem?: InventoryItem | null;
  rightHandItem?: InventoryItem | null;
  activeHand?: 'left' | 'right';
  actionAnim?: Player['actionAnim'];
  
  // Transport & vehicle
  isInVehicle: boolean;
  currentVehicleId: string | null;
  vehicleState?: RemoteVehicleState | null;
  trailerState?: RemoteVehicleState | null;

  // Metadata
  lastUpdated: number;
  ping?: number;
  cash?: number;
  inventoryCount?: number;
}

export interface ChatMessage {
  id: string;
  senderPeerId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface SpeechBubble {
  text: string;
  expiresAt: number;
  isVehicle?: boolean;
}

export type AntiCheatLevel = 'none' | 'moderate' | 'strict';

export interface ServerSettings {
  trafficEnabled: boolean;
  vehicleCount: number;
  pedestrianCount: number;
  /** When true, each player registers a personal password for their nickname on first join and logs in on subsequent joins. */
  passwordRequired: boolean;
  savePlayerData: boolean;
  antiCheat: AntiCheatLevel;
}

export const DEFAULT_SERVER_SETTINGS: ServerSettings = {
  trafficEnabled: true,
  vehicleCount: 15,
  pedestrianCount: 10,
  passwordRequired: false,
  savePlayerData: true,
  antiCheat: 'moderate'
};

export type ServerAuthState = 'idle' | 'pending_register' | 'pending_login' | 'authenticated' | 'kicked';

export interface ServerAuthChallenge {
  mode: 'register' | 'login';
  roomCode: string;
  serverName: string;
  nickname: string;
  error?: string;
  attemptsLeft?: number;
  submitting?: boolean;
}

export interface StoredServerAccount {
  displayName: string;
  salt: string;
  hash: string;
  registeredAt: number;
  lastLoginAt: number;
}

export interface ServerBanRecord {
  nickname: string;
  normNick: string;
  reason: string;
  bannedAt: number;
  bannedBy: string;
}

export interface ServerMuteRecord {
  nickname: string;
  normNick: string;
  reason: string;
  mutedAt: number;
}

export interface ServerPlayerSaveRecord {
  nickname: string;
  normNick: string;
  cash: number;
  x: number;
  y: number;
  angle: number;
  isInVehicle?: boolean;
  vehicleType?: string | null;
  vehicleColor?: string | null;
  inventory?: any[];
  equippedClothing?: any;
  leftHandItem?: any;
  rightHandItem?: any;
  activeHand?: 'left' | 'right';
  needs?: any;
  bodyState?: any;
  updatedAt: number;
}

export interface ServerPersistentState {
  roomCode: string;
  accounts: Record<string, StoredServerAccount>;
  bans: Record<string, ServerBanRecord>;
  mutes: Record<string, ServerMuteRecord>;
  playerSaves: Record<string, ServerPlayerSaveRecord>;
}

function normalizeServerNick(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function serverAccountsStorageKey(roomCode: string): string {
  return `flatbody_server_accounts_${roomCode.toLowerCase()}`;
}

function serverBansStorageKey(roomCode: string): string {
  return `flatbody_server_bans_${roomCode.toLowerCase()}`;
}

function serverMutesStorageKey(roomCode: string): string {
  return `flatbody_server_mutes_${roomCode.toLowerCase()}`;
}

function serverPlayerSavesStorageKey(roomCode: string): string {
  return `flatbody_server_player_saves_${roomCode.toLowerCase()}`;
}

function loadJsonMap<T>(key: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveJsonMap<T>(key: string, data: Record<string, T>): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore storage quota errors
  }
}

function loadServerAccounts(roomCode: string): Record<string, StoredServerAccount> {
  return roomCode ? loadJsonMap<StoredServerAccount>(serverAccountsStorageKey(roomCode)) : {};
}

function saveServerAccounts(roomCode: string, accounts: Record<string, StoredServerAccount>): void {
  if (!roomCode) return;
  saveJsonMap(serverAccountsStorageKey(roomCode), accounts);
}

function loadServerBans(roomCode: string): Record<string, ServerBanRecord> {
  return roomCode ? loadJsonMap<ServerBanRecord>(serverBansStorageKey(roomCode)) : {};
}

function saveServerBans(roomCode: string, bans: Record<string, ServerBanRecord>): void {
  if (!roomCode) return;
  saveJsonMap(serverBansStorageKey(roomCode), bans);
}

function loadServerMutes(roomCode: string): Record<string, ServerMuteRecord> {
  return roomCode ? loadJsonMap<ServerMuteRecord>(serverMutesStorageKey(roomCode)) : {};
}

function saveServerMutes(roomCode: string, mutes: Record<string, ServerMuteRecord>): void {
  if (!roomCode) return;
  saveJsonMap(serverMutesStorageKey(roomCode), mutes);
}

function loadServerPlayerSaves(roomCode: string): Record<string, ServerPlayerSaveRecord> {
  return roomCode ? loadJsonMap<ServerPlayerSaveRecord>(serverPlayerSavesStorageKey(roomCode)) : {};
}

function saveServerPlayerSaves(roomCode: string, saves: Record<string, ServerPlayerSaveRecord>): void {
  if (!roomCode) return;
  saveJsonMap(serverPlayerSavesStorageKey(roomCode), saves);
}

function generateSalt(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(12);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {}
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function hashAccountPassword(salt: string, password: string): Promise<string> {
  const input = `${salt}:${password}:flatbody_srv_auth_v1`;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
      return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {}
  // Deterministic fallback hash if SubtleCrypto is unavailable (e.g. non-HTTPS local LAN)
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

export interface SyncTrafficVehicle {
  id: string;
  type: CarType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  steerAngle?: number;
  color: string;
  roofColor?: string;
  headlightsOn?: boolean;
  brakeLightsOn?: boolean;
  turnSignal?: 'none' | 'left' | 'right' | 'hazard';
  isParked?: boolean;
}

export interface SyncPedestrian {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  walkCycle: number;
  skinColor: string;
  shirtColor: string;
  pantsColor: string;
}

export interface SyncWorldState {
  timeHour: number;
  calendar?: GameCalendarState;
  weather: WeatherType;
  gameMode: 'career' | 'freeroam';
  savePlayerData: boolean;
  updatedAt?: number;
}

export type NetworkPacket = 
  | { type: 'join'; packetId: string; peerId: string; name: string }
  | { type: 'leave'; packetId: string; peerId: string; name: string }
  | { type: 'sync'; packetId: string; peerId: string; player: RemotePlayerState }
  | { type: 'chat'; packetId: string; message: ChatMessage }
  | { type: 'room_info'; packetId: string; hostPeerId: string; players: { peerId: string; name: string }[]; settings?: ServerSettings; targetPeerId?: string }
  | { type: 'auth_challenge'; packetId: string; mode: 'register' | 'login'; roomCode: string; serverName: string; nickname: string; targetPeerId?: string }
  | { type: 'auth_submit'; packetId: string; peerId: string; mode: 'register' | 'login'; nickname: string; password: string }
  | { type: 'auth_result'; packetId: string; success: boolean; mode?: 'register' | 'login' | 'none'; retryable?: boolean; attemptsLeft?: number; reason?: string; authenticatedNick?: string; settings?: ServerSettings; targetPeerId?: string }
  | { type: 'server_settings'; packetId: string; settings: ServerSettings; targetPeerId?: string }
  | { type: 'traffic_sync'; packetId: string; vehicles: SyncTrafficVehicle[]; pedestrians: SyncPedestrian[] }
  | { type: 'world_state_sync'; packetId: string; worldState: SyncWorldState }
  | { type: 'kick'; packetId: string; reason: string; targetPeerId?: string }
  | { type: 'teleport'; packetId: string; x: number; y: number; reason?: string; targetPeerId?: string }
  | { type: 'player_save_upload'; packetId: string; peerId: string; nickname: string; save: ServerPlayerSaveRecord }
  | { type: 'player_save_restore'; packetId: string; save: ServerPlayerSaveRecord; targetPeerId?: string };

export type OnlineStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

class OnlineManager {
  private peer: Peer | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private recentPacketIds: Set<string> = new Set();
  private packetCounter: number = 0;

  public status: OnlineStatus = 'disconnected';
  public errorMessage: string | null = null;
  public roomCode: string = '';
  public serverDisplayName: string = '';
  public isHost: boolean = false;
  public localPeerId: string = '';
  public localPlayerName: string = '';

  public remotePlayers: Map<string, RemotePlayerState> = new Map();
  public chatMessages: ChatMessage[] = [];
  public speechBubbles: Map<string, SpeechBubble> = new Map();

  // Configurable server settings (traffic, per-player nick password auth, save protection, anti-cheat)
  public serverSettings: ServerSettings = { ...DEFAULT_SERVER_SETTINGS };
  public authState: ServerAuthState = 'idle';
  public authChallenge: ServerAuthChallenge | null = null;
  public authKickReason: string | null = null;

  // Host-side per-peer authentication, moderation & persistent save hooks
  private authenticatedPeers: Set<string> = new Set();
  private pendingAuthPeers: Map<string, { name: string; normNick: string; attempts: number }> = new Map();
  private activeNickByPeer: Map<string, string> = new Map();
  public onHostSaveRequested?: (reason: string) => Promise<boolean> | void;
  public onHostTeleportSelf?: (x: number, y: number, targetName: string) => void;
  public onGuestTeleported?: (x: number, y: number, reason?: string) => void;
  public onGuestServerSaveReceived?: (save: ServerPlayerSaveRecord) => void;

  private peerAntiCheatMap: Map<string, { lastX: number; lastY: number; lastTime: number; lastCash?: number; violations: number }> = new Map();
  public lastTrafficSync: { vehicles: SyncTrafficVehicle[]; pedestrians: SyncPedestrian[] } | null = null;
  public lastWorldStateSync: SyncWorldState | null = null;

  private listeners: Set<() => void> = new Set();
  private syncTimer: number = 0;
  private worldSyncTimer: number = 0;
  private lastHonkingVehicles: Set<string> = new Set();

  constructor() {
    // Load saved player name or default to a random Russian callsign
    const savedName = localStorage.getItem('m2d_player_nickname');
    if (savedName && savedName.trim()) {
      this.localPlayerName = savedName.trim();
    } else {
      const defaultNames = ['Стритрейсер', 'Шофер', 'Автомеханик', 'Курьер', 'Спецагент', 'Пилот', 'Дальнобойщик', 'Сталкер'];
      const randNum = Math.floor(100 + Math.random() * 900);
      const randName = defaultNames[Math.floor(Math.random() * defaultNames.length)];
      this.localPlayerName = `${randName}_${randNum}`;
    }
  }

  public setPlayerName(name: string) {
    const trimmed = name.trim().slice(0, 20);
    if (!trimmed) return;
    this.localPlayerName = trimmed;
    try {
      localStorage.setItem('m2d_player_nickname', trimmed);
    } catch {}
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('[OnlineManager] Listener error:', err);
      }
    });
  }

  /**
   * Sanitizes room code into safe peer ID string.
   */
  public sanitizeRoomCode(code: string): string {
    return code
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24) || 'metro-room';
  }

  /**
   * Internal teardown of the PeerJS instance without resetting the entire room state.
   */
  private destroyPeerOnly() {
    if (this.peer && !this.peer.destroyed) {
      try {
        this.peer.destroy();
      } catch {}
    }
    this.peer = null;
    this.connections.forEach((conn) => {
      try {
        conn.close();
      } catch {}
    });
    this.connections.clear();
  }

  /**
   * Connect to or create a P2P room.
   * Seamlessly auto-negotiates Host and Client roles:
   * 1. Attempts to become room host (`m2d_${room}_host`) or connect to existing host.
   * 2. If host ID is taken, transparently joins as a client.
   * 3. If host is offline/unavailable, transparently takes over as the host.
   */
  public async joinOrCreateRoom(
    rawRoomCode: string,
    playerName?: string,
    asHost: boolean = true,
    serverDisplayName?: string,
    initialSettings?: Partial<ServerSettings>
  ) {
    this.leaveRoom();

    if (playerName && playerName.trim()) {
      this.setPlayerName(playerName);
    }

    if (initialSettings) {
      this.serverSettings = { ...DEFAULT_SERVER_SETTINGS, ...initialSettings };
    } else if (!asHost) {
      this.serverSettings = { ...DEFAULT_SERVER_SETTINGS };
    }

    const cleanCode = this.sanitizeRoomCode(rawRoomCode);
    this.roomCode = cleanCode;
    this.serverDisplayName = (serverDisplayName || `Сервер ${cleanCode}`).trim();
    this.status = 'connecting';
    this.errorMessage = null;
    this.authKickReason = null;
    this.authChallenge = null;
    this.authState = asHost ? 'authenticated' : 'idle';
    this.notify();

    // 1. Setup local BroadcastChannel (for instant zero-latency multi-tab connection on same machine)
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel(`m2d_room_${cleanCode}`);
        this.broadcastChannel.onmessage = (ev) => {
          this.handleIncomingPacket(ev.data, 'broadcast');
        };
      }
    } catch (err) {
      console.warn('[OnlineManager] BroadcastChannel not supported/allowed:', err);
    }

    // 2. Setup PeerJS WebRTC P2P
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const hostPeerId = `m2d_${cleanCode}_host`;
    const clientPeerId = `m2d_${cleanCode}_cli_${randomSuffix}`;

    this.isHost = asHost;
    const targetPeerId = asHost ? hostPeerId : clientPeerId;
    this.localPeerId = targetPeerId;
    if (asHost) {
      this.activeNickByPeer.set(hostPeerId, normalizeServerNick(this.localPlayerName));
    }

    try {
      // PeerJS cloud broker (debug: 0 suppresses internal console error spam on normal discovery)
      this.peer = new Peer(targetPeerId, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      });

      this.peer.on('open', (id) => {
        this.localPeerId = id;
        this.status = 'connected';
        this.errorMessage = null;

        if (this.isHost) {
          this.authState = 'authenticated';
          this.activeNickByPeer.set(id, normalizeServerNick(this.localPlayerName));
          this.addSystemMessage(`Вы создали комнату «${this.roomCode}» (Хост). Ожидание игроков...`);
        } else {
          // Connect directly to host and send join handshake over BroadcastChannel too (for multi-tab)
          this.connectToPeer(hostPeerId);
          if (this.broadcastChannel) {
            try {
              this.broadcastChannel.postMessage({
                type: 'join',
                packetId: this.nextPacketId(),
                peerId: this.localPeerId,
                name: this.localPlayerName
              } as NetworkPacket);
            } catch {}
          }
          this.addSystemMessage(`Подключение к комнате «${this.roomCode}»...`);
        }

        this.notify();
      });

      // Handle incoming peer connections (Host receives clients, or mesh clients receive peers)
      this.peer.on('connection', (conn) => {
        this.setupConnectionHandlers(conn);
      });

      this.peer.on('error', (err: any) => {
        const errType = err?.type;
        const errMsg = err?.message || String(err);

        // 1. Host ID already taken -> Notify host instead of silently joining someone else's server
        if (errType === 'unavailable-id' && this.isHost) {
          this.status = 'error';
          this.errorMessage = `Код комнаты «${cleanCode}» уже занят другим сервером. Выберите другой код.`;
          this.authState = 'kicked';
          this.authKickReason = this.errorMessage;
          this.destroyPeerOnly();
          this.notify();
          return;
        }

        // 2. Client could not reach host -> Never hijack as host; report server offline cleanly
        if (errType === 'peer-unavailable') {
          if (!this.isHost && errMsg.includes(hostPeerId)) {
            // If BroadcastChannel already authenticated us (local multi-tab host), ignore PeerJS cloud miss
            if (this.authState === 'authenticated' || this.authChallenge) {
              return;
            }
            const reason = `Сервер «${cleanCode}» не найден или хост уже завершил сессию.`;
            this.status = 'error';
            this.errorMessage = reason;
            this.authState = 'kicked';
            this.authKickReason = reason;
            this.authChallenge = null;
            this.destroyPeerOnly();
            this.notify();
            return;
          }
          // Non-fatal: if another remote client disconnected, ignore
          return;
        }

        // 3. Network or socket issues: BroadcastChannel keeps local tabs running smoothly
        if (this.broadcastChannel) {
          this.status = 'connected';
          this.errorMessage = null;
          this.notify();
          return;
        }

        if (this.connections.size === 0 && !this.broadcastChannel) {
          this.status = 'error';
          this.errorMessage = `Сетевая ошибка: ${errMsg || errType}`;
          this.notify();
        }
      });

      this.peer.on('disconnected', () => {
        if (this.status === 'connected' && this.peer && !this.peer.destroyed) {
          try {
            this.peer.reconnect();
          } catch {}
        }
      });
    } catch (err: any) {
      // Fallback: If BroadcastChannel is working, we can still be connected locally
      if (this.broadcastChannel) {
        this.status = 'connected';
        this.addSystemMessage(`Комната «${this.roomCode}» активна в локальном режиме!`);
      } else {
        this.status = 'error';
        this.errorMessage = err.message || 'Ошибка подключения к сети';
      }
      this.notify();
    }
  }

  private connectToPeer(targetPeerId: string) {
    if (!this.peer || this.peer.destroyed || targetPeerId === this.localPeerId) return;
    if (this.connections.has(targetPeerId)) return;

    try {
      const conn = this.peer.connect(targetPeerId, {
        reliable: true
      });
      this.setupConnectionHandlers(conn);
    } catch (err) {
      console.warn('[OnlineManager] Failed to connect to peer:', targetPeerId, err);
    }
  }

  private setupConnectionHandlers(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);

      // Guest initiates handshake with join packet; host waits for join before authorizing & sharing room_info
      if (!this.isHost) {
        conn.send({
          type: 'join',
          packetId: this.nextPacketId(),
          peerId: this.localPeerId,
          name: this.localPlayerName
        } as NetworkPacket);
      }

      this.notify();
    });

    conn.on('data', (data) => {
      this.handleIncomingPacket(data, 'webrtc', conn.peer);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.authenticatedPeers.delete(conn.peer);
      this.pendingAuthPeers.delete(conn.peer);
      this.activeNickByPeer.delete(conn.peer);
      const player = this.remotePlayers.get(conn.peer);
      if (player) {
        this.addSystemMessage(`${player.name} вышел из комнаты.`);
        this.remotePlayers.delete(conn.peer);
        this.speechBubbles.delete(conn.peer);
      }
      this.notify();
    });

    conn.on('error', (err) => {
      console.warn('[OnlineManager] Connection error with', conn.peer, err);
      this.connections.delete(conn.peer);
      this.authenticatedPeers.delete(conn.peer);
      this.pendingAuthPeers.delete(conn.peer);
      this.activeNickByPeer.delete(conn.peer);
    });
  }

  private sendDirectPacket(targetPeerId: string | undefined, packet: NetworkPacket) {
    const conn = targetPeerId ? this.connections.get(targetPeerId) : null;
    if (conn && conn.open) {
      try {
        conn.send(packet);
        return;
      } catch {}
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(packet);
      } catch {}
    }
  }

  private finalizeHostAuthorizePeer(peerId: string, displayName: string, normNick: string, authMode: 'register' | 'login' | 'none') {
    this.pendingAuthPeers.delete(peerId);
    this.authenticatedPeers.add(peerId);
    this.activeNickByPeer.set(peerId, normNick);

    this.sendDirectPacket(peerId, {
      type: 'auth_result',
      packetId: this.nextPacketId(),
      success: true,
      mode: authMode,
      authenticatedNick: displayName,
      settings: { ...this.serverSettings },
      targetPeerId: peerId
    });

    const playerList = Array.from(this.remotePlayers.values()).map((p) => ({
      peerId: p.peerId,
      name: p.name
    }));
    playerList.push({ peerId: this.localPeerId, name: this.localPlayerName });

    this.sendDirectPacket(peerId, {
      type: 'room_info',
      packetId: this.nextPacketId(),
      hostPeerId: this.localPeerId,
      players: playerList,
      settings: { ...this.serverSettings },
      targetPeerId: peerId
    });

    this.sendDirectPacket(peerId, {
      type: 'server_settings',
      packetId: this.nextPacketId(),
      settings: { ...this.serverSettings },
      targetPeerId: peerId
    });

    // If the host has a server-side saved profile for this nickname, push it directly to the authenticated player
    if (this.serverSettings.savePlayerData !== false) {
      const serverSaves = loadServerPlayerSaves(this.roomCode);
      const savedProfile = serverSaves[normNick];
      if (savedProfile) {
        this.sendDirectPacket(peerId, {
          type: 'player_save_restore',
          packetId: this.nextPacketId(),
          save: savedProfile,
          targetPeerId: peerId
        });
      }
    }

    this.worldSyncTimer = 99;
    this.addSystemMessage(
      authMode === 'register'
        ? `${displayName} зарегистрировал аккаунт и вошел в комнату.`
        : `${displayName} вошел в комнату.`
    );
    if (authMode === 'register') {
      void this.onHostSaveRequested?.('account_register');
    }
    this.notify();
  }

  /**
   * Exports all persistent host-side server data (password accounts, bans, mutes, player saves)
   * for storage in Cloud Firestore / local DB.
   */
  public exportServerState(targetRoomCode?: string): ServerPersistentState {
    const code = this.sanitizeRoomCode(targetRoomCode || this.roomCode);
    return {
      roomCode: code,
      accounts: loadServerAccounts(code),
      bans: loadServerBans(code),
      mutes: loadServerMutes(code),
      playerSaves: loadServerPlayerSaves(code)
    };
  }

  /**
   * Imports persisted server data (from Firestore DB) into host storage before starting the server.
   */
  public importServerState(roomCode: string, state: Partial<ServerPersistentState>) {
    const code = this.sanitizeRoomCode(roomCode);
    if (!code) return;
    if (state.accounts && typeof state.accounts === 'object') {
      saveServerAccounts(code, state.accounts);
    }
    if (state.bans && typeof state.bans === 'object') {
      saveServerBans(code, state.bans);
    }
    if (state.mutes && typeof state.mutes === 'object') {
      saveServerMutes(code, state.mutes);
    }
    if (state.playerSaves && typeof state.playerSaves === 'object') {
      saveServerPlayerSaves(code, state.playerSaves);
    }
  }

  /**
   * Guest uploads compact profile snapshot to the host so the server DB retains all players' progress.
   */
  public uploadLocalServerSave(save: Omit<ServerPlayerSaveRecord, 'normNick' | 'updatedAt'>) {
    if (this.isHost || this.status !== 'connected' || this.authState !== 'authenticated') return;
    if (this.serverSettings.savePlayerData === false) return;
    const normNick = normalizeServerNick(save.nickname || this.localPlayerName);
    if (!normNick) return;
    const fullSave: ServerPlayerSaveRecord = {
      ...save,
      nickname: (save.nickname || this.localPlayerName).trim().slice(0, 24),
      normNick,
      updatedAt: Date.now()
    };
    const hostPeerId = `m2d_${this.roomCode}_host`;
    this.sendDirectPacket(hostPeerId, {
      type: 'player_save_upload',
      packetId: this.nextPacketId(),
      peerId: this.localPeerId,
      nickname: fullSave.nickname,
      save: fullSave
    });
  }

  /**
   * Broadcasts a server-wide system announcement from the host.
   */
  public broadcastSystemMessage(text: string) {
    const message: ChatMessage = {
      id: `sys_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderPeerId: 'system',
      senderName: 'СЕРВЕР',
      text,
      timestamp: Date.now(),
      isSystem: true
    };
    this.chatMessages.push(message);
    if (this.chatMessages.length > 100) {
      this.chatMessages.shift();
    }
    this.broadcastPacket({
      type: 'chat',
      packetId: this.nextPacketId(),
      message
    });
    this.notify();
  }

  private findOnlineRemoteByQuery(query: string): RemotePlayerState | null {
    const q = normalizeServerNick(query);
    if (!q) return null;
    const players = Array.from(this.remotePlayers.values());
    const exact = players.find((p) => normalizeServerNick(p.name) === q || p.peerId === query);
    if (exact) return exact;
    const prefixMatches = players.filter((p) => normalizeServerNick(p.name).startsWith(q));
    if (prefixMatches.length === 1) return prefixMatches[0];
    const subMatches = players.filter((p) => normalizeServerNick(p.name).includes(q));
    if (subMatches.length === 1) return subMatches[0];
    return null;
  }

  private disconnectPeerWithReason(peerId: string, reason: string) {
    this.sendDirectPacket(peerId, {
      type: 'kick',
      packetId: this.nextPacketId(),
      reason,
      targetPeerId: peerId
    });
    this.remotePlayers.delete(peerId);
    this.speechBubbles.delete(peerId);
    this.authenticatedPeers.delete(peerId);
    this.pendingAuthPeers.delete(peerId);
    this.activeNickByPeer.delete(peerId);
    const conn = this.connections.get(peerId);
    if (conn) {
      setTimeout(() => {
        try { conn.close(); } catch {}
      }, 220);
      this.connections.delete(peerId);
    }
    this.notify();
  }

  public kickPlayer(nickQuery: string, reason = 'Кикнут хостом сервера'): boolean {
    if (!this.isHost) {
      this.addSystemMessage('Команда доступна только хосту сервера.');
      return false;
    }
    const target = this.findOnlineRemoteByQuery(nickQuery);
    if (!target) {
      this.addSystemMessage(`Игрок «${nickQuery}» не найден в сети.`);
      return false;
    }
    const cleanReason = reason.trim() || 'Кикнут хостом сервера';
    this.disconnectPeerWithReason(target.peerId, `Вы были кикнуты с сервера. Причина: ${cleanReason}`);
    this.broadcastSystemMessage(`${target.name} кикнут хостом (${cleanReason}).`);
    return true;
  }

  public banPlayer(nickQuery: string, reason = 'Нарушение правил сервера'): boolean {
    if (!this.isHost) {
      this.addSystemMessage('Команда доступна только хосту сервера.');
      return false;
    }
    const targetOnline = this.findOnlineRemoteByQuery(nickQuery);
    const displayName = (targetOnline?.name || nickQuery).trim().slice(0, 24);
    const normNick = normalizeServerNick(displayName);
    if (!normNick) return false;
    if (normNick === normalizeServerNick(this.localPlayerName)) {
      this.addSystemMessage('Нельзя забанить самого себя (хоста).');
      return false;
    }
    const cleanReason = reason.trim() || 'Нарушение правил сервера';
    const bans = loadServerBans(this.roomCode);
    bans[normNick] = {
      nickname: displayName,
      normNick,
      reason: cleanReason,
      bannedAt: Date.now(),
      bannedBy: this.localPlayerName
    };
    saveServerBans(this.roomCode, bans);

    if (targetOnline) {
      this.disconnectPeerWithReason(
        targetOnline.peerId,
        `Вы забанены на этом сервере. Причина: ${cleanReason}`
      );
    }
    this.broadcastSystemMessage(`${displayName} забанен на сервере (${cleanReason}).`);
    void this.onHostSaveRequested?.('ban');
    return true;
  }

  public unbanPlayer(nickQuery: string): boolean {
    if (!this.isHost) {
      this.addSystemMessage('Команда доступна только хосту сервера.');
      return false;
    }
    const norm = normalizeServerNick(nickQuery);
    const bans = loadServerBans(this.roomCode);
    const matchKey = Object.keys(bans).find((k) => k === norm || k.includes(norm));
    if (!matchKey) {
      this.addSystemMessage(`Игрок «${nickQuery}» не найден в списке банов.`);
      return false;
    }
    const removed = bans[matchKey];
    delete bans[matchKey];
    saveServerBans(this.roomCode, bans);
    this.broadcastSystemMessage(`${removed.nickname} разбанен хостом.`);
    void this.onHostSaveRequested?.('unban');
    return true;
  }

  public mutePlayer(nickQuery: string, reason = 'Нарушение правил чата'): boolean {
    if (!this.isHost) {
      this.addSystemMessage('Команда доступна только хосту сервера.');
      return false;
    }
    const targetOnline = this.findOnlineRemoteByQuery(nickQuery);
    const displayName = (targetOnline?.name || nickQuery).trim().slice(0, 24);
    const normNick = normalizeServerNick(displayName);
    if (!normNick || normNick === normalizeServerNick(this.localPlayerName)) {
      this.addSystemMessage('Нельзя замутить самого себя.');
      return false;
    }
    const cleanReason = reason.trim() || 'Нарушение правил чата';
    const mutes = loadServerMutes(this.roomCode);
    mutes[normNick] = {
      nickname: displayName,
      normNick,
      reason: cleanReason,
      mutedAt: Date.now()
    };
    saveServerMutes(this.roomCode, mutes);
    this.broadcastSystemMessage(`${displayName} получил мут в чате (${cleanReason}).`);
    void this.onHostSaveRequested?.('mute');
    return true;
  }

  public unmutePlayer(nickQuery: string): boolean {
    if (!this.isHost) {
      this.addSystemMessage('Команда доступна только хосту сервера.');
      return false;
    }
    const norm = normalizeServerNick(nickQuery);
    const mutes = loadServerMutes(this.roomCode);
    const matchKey = Object.keys(mutes).find((k) => k === norm || k.includes(norm));
    if (!matchKey) {
      this.addSystemMessage(`Игрок «${nickQuery}» не находится в муте.`);
      return false;
    }
    const removed = mutes[matchKey];
    delete mutes[matchKey];
    saveServerMutes(this.roomCode, mutes);
    this.broadcastSystemMessage(`С игрока ${removed.nickname} снят мут.`);
    void this.onHostSaveRequested?.('unmute');
    return true;
  }

  public resetPlayerPassword(nickQuery: string): boolean {
    if (!this.isHost) {
      this.addSystemMessage('Команда доступна только хосту сервера.');
      return false;
    }
    const norm = normalizeServerNick(nickQuery);
    const accounts = loadServerAccounts(this.roomCode);
    const matchKey = Object.keys(accounts).find((k) => k === norm);
    if (!matchKey) {
      this.addSystemMessage(`Зарегистрированный аккаунт «${nickQuery}» не найден.`);
      return false;
    }
    const name = accounts[matchKey].displayName;
    delete accounts[matchKey];
    saveServerAccounts(this.roomCode, accounts);
    this.addSystemMessage(`Пароль аккаунта «${name}» сброшен. При следующем входе игрок сможет задать новый пароль.`);
    void this.onHostSaveRequested?.('resetpass');
    return true;
  }

  public getServerBans(): ServerBanRecord[] {
    if (!this.roomCode) return [];
    return Object.values(loadServerBans(this.roomCode)).sort((a, b) => b.bannedAt - a.bannedAt);
  }

  private executeChatCommand(rawText: string) {
    const body = rawText.slice(1).trim();
    if (!body) return;
    const parts = body.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg1 = parts[1] || '';
    const restAfterArg1 = parts.slice(2).join(' ').trim();
    const allArgs = parts.slice(1).join(' ').trim();

    if (cmd === 'help' || cmd === '?') {
      this.addSystemMessage('Общие команды: /players (список игроков), /help (справка)');
      if (this.isHost) {
        this.addSystemMessage(
          'Команды хоста: /kick <ник> [причина], /ban <ник> [причина], /unban <ник>, /bans, /mute <ник> [причина], /unmute <ник>, /tp <ник>, /tphere <ник>, /say <текст>, /resetpass <ник>, /save'
        );
      }
      return;
    }

    if (cmd === 'players' || cmd === 'online' || cmd === 'list') {
      const remotes = this.getRemotePlayersArray();
      const names = [
        `${this.localPlayerName}${this.isHost ? ' (Хост)' : ' (Вы)'}`,
        ...remotes.map((p) => `${p.name}${p.isInVehicle ? ' [авто]' : ''}`)
      ];
      this.addSystemMessage(`Игроки онлайн (${names.length}): ${names.join(', ')}`);
      return;
    }

    if (!this.isHost) {
      this.addSystemMessage(`Команда /${cmd} доступна только хосту сервера. Введите /help для списка команд.`);
      return;
    }

    switch (cmd) {
      case 'kick': {
        if (!arg1) {
          this.addSystemMessage('Использование: /kick <ник> [причина]');
          return;
        }
        this.kickPlayer(arg1, restAfterArg1 || 'Кикнут хостом сервера');
        return;
      }
      case 'ban': {
        if (!arg1) {
          this.addSystemMessage('Использование: /ban <ник> [причина]');
          return;
        }
        this.banPlayer(arg1, restAfterArg1 || 'Нарушение правил сервера');
        return;
      }
      case 'unban': {
        if (!arg1) {
          this.addSystemMessage('Использование: /unban <ник>');
          return;
        }
        this.unbanPlayer(arg1);
        return;
      }
      case 'bans':
      case 'banlist': {
        const list = this.getServerBans();
        if (list.length === 0) {
          this.addSystemMessage('Список банов пуст.');
        } else {
          const summary = list.map((b) => `${b.nickname} (${b.reason})`).join('; ');
          this.addSystemMessage(`Забаненные игроки (${list.length}): ${summary}`);
        }
        return;
      }
      case 'mute': {
        if (!arg1) {
          this.addSystemMessage('Использование: /mute <ник> [причина]');
          return;
        }
        this.mutePlayer(arg1, restAfterArg1 || 'Нарушение правил чата');
        return;
      }
      case 'unmute': {
        if (!arg1) {
          this.addSystemMessage('Использование: /unmute <ник>');
          return;
        }
        this.unmutePlayer(arg1);
        return;
      }
      case 'tp': {
        if (!arg1) {
          this.addSystemMessage('Использование: /tp <ник>');
          return;
        }
        const target = this.findOnlineRemoteByQuery(arg1);
        if (!target) {
          this.addSystemMessage(`Игрок «${arg1}» не найден в сети.`);
          return;
        }
        if (this.onHostTeleportSelf) {
          this.onHostTeleportSelf(target.x, target.y, target.name);
          this.addSystemMessage(`Вы телепортировались к игроку ${target.name}.`);
        } else {
          this.addSystemMessage('Телепортация недоступна в текущем состоянии.');
        }
        return;
      }
      case 'tphere': {
        if (!arg1) {
          this.addSystemMessage('Использование: /tphere <ник>');
          return;
        }
        const target = this.findOnlineRemoteByQuery(arg1);
        if (!target) {
          this.addSystemMessage(`Игрок «${arg1}» не найден в сети.`);
          return;
        }
        if (this.lastLocalHostPos) {
          this.sendDirectPacket(target.peerId, {
            type: 'teleport',
            packetId: this.nextPacketId(),
            x: this.lastLocalHostPos.x + 36,
            y: this.lastLocalHostPos.y,
            reason: `Хост ${this.localPlayerName} телепортировал вас к себе.`,
            targetPeerId: target.peerId
          });
          this.broadcastSystemMessage(`Хост телепортировал игрока ${target.name} к себе.`);
        } else {
          this.addSystemMessage('Не удалось определить координаты хоста.');
        }
        return;
      }
      case 'say':
      case 'bc':
      case 'announce': {
        if (!allArgs) {
          this.addSystemMessage('Использование: /say <сообщение>');
          return;
        }
        this.broadcastSystemMessage(`[Объявление] ${allArgs}`);
        return;
      }
      case 'resetpass': {
        if (!arg1) {
          this.addSystemMessage('Использование: /resetpass <ник>');
          return;
        }
        this.resetPlayerPassword(arg1);
        return;
      }
      case 'save': {
        if (!this.onHostSaveRequested) {
          this.addSystemMessage('Сохранение сервера недоступно в этой сессии.');
          return;
        }
        this.addSystemMessage('Сохранение сервера, аккаунтов, банов и профилей игроков в БД...');
        Promise.resolve(this.onHostSaveRequested('manual_command')).then((ok) => {
          if (ok) {
            this.addSystemMessage('Сервер успешно сохранён в базу данных.');
          } else {
            this.addSystemMessage('Сервер сохранён локально (войдите в Google для облачной БД).');
          }
        });
        return;
      }
      default: {
        this.addSystemMessage(`Неизвестная команда /${cmd}. Введите /help для списка команд.`);
        return;
      }
    }
  }

  /**
   * Client submits personal account password (register or login) to the host.
   */
  public submitServerAuth(password: string) {
    if (this.isHost || !this.authChallenge) return;
    const trimmed = password.trim();
    if (trimmed.length < 4) {
      this.authChallenge = {
        ...this.authChallenge,
        error: 'Пароль должен содержать минимум 4 символа.',
        submitting: false
      };
      this.notify();
      return;
    }
    this.authChallenge = {
      ...this.authChallenge,
      error: undefined,
      submitting: true
    };
    this.notify();

    const packet: NetworkPacket = {
      type: 'auth_submit',
      packetId: this.nextPacketId(),
      peerId: this.localPeerId,
      mode: this.authChallenge.mode,
      nickname: this.authChallenge.nickname,
      password: trimmed
    };

    const hostPeerId = `m2d_${this.roomCode}_host`;
    this.sendDirectPacket(hostPeerId, packet);
  }

  public clearAuthKick() {
    this.authKickReason = null;
    if (this.authState === 'kicked') {
      this.authState = 'idle';
    }
    this.notify();
  }

  private nextPacketId(): string {
    this.packetCounter++;
    return `${this.localPeerId}_${Date.now()}_${this.packetCounter}`;
  }

  /**
   * Broadcast packet across all WebRTC peer connections and local BroadcastChannel.
   */
  public broadcastPacket(packet: NetworkPacket) {
    // Send over BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(packet);
      } catch (err) {
        console.warn('[OnlineManager] BroadcastChannel post error:', err);
      }
    }

    // Send to WebRTC connections
    this.connections.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(packet);
        } catch (err) {
          console.warn('[OnlineManager] Send error to', conn.peer, err);
        }
      }
    });
  }

  /**
   * Process incoming packet from WebRTC or BroadcastChannel with deduplication.
   */
  private handleIncomingPacket(data: any, source: 'webrtc' | 'broadcast', senderPeerId?: string) {
    if (!data || typeof data !== 'object' || !data.type || !data.packetId) return;
    const packet = data as NetworkPacket;

    // Ignore self packets
    if ('peerId' in packet && packet.peerId === this.localPeerId) return;

    // Deduplicate packets
    if (this.recentPacketIds.has(packet.packetId)) return;
    this.recentPacketIds.add(packet.packetId);
    if (this.recentPacketIds.size > 300) {
      const first = this.recentPacketIds.values().next().value;
      if (first) this.recentPacketIds.delete(first);
    }

    // Ignore targeted packets addressed to a different peer
    if ('targetPeerId' in packet && packet.targetPeerId && packet.targetPeerId !== this.localPeerId) {
      return;
    }

    const effectiveSenderId = senderPeerId || ('peerId' in packet ? packet.peerId : undefined);

    // Host firewall: block & do NOT relay any gameplay packets from peers that haven't completed auth
    if (this.isHost && effectiveSenderId && packet.type !== 'join' && packet.type !== 'auth_submit' && packet.type !== 'leave') {
      if (this.serverSettings.passwordRequired && !this.authenticatedPeers.has(effectiveSenderId)) {
        return;
      }
    }

    // Host relay: relay authenticated non-auth/non-admin packets to other authenticated clients
    if (
      this.isHost &&
      source === 'webrtc' &&
      senderPeerId &&
      packet.type !== 'auth_submit' &&
      packet.type !== 'auth_challenge' &&
      packet.type !== 'auth_result' &&
      packet.type !== 'join' &&
      packet.type !== 'kick' &&
      packet.type !== 'teleport' &&
      packet.type !== 'player_save_upload' &&
      packet.type !== 'player_save_restore'
    ) {
      // Drop chat packets from muted players before relaying to others
      if (packet.type === 'chat') {
        const senderNorm = this.activeNickByPeer.get(senderPeerId);
        if (senderNorm) {
          const mutes = loadServerMutes(this.roomCode);
          if (mutes[senderNorm]) {
            this.sendDirectPacket(senderPeerId, {
              type: 'chat',
              packetId: this.nextPacketId(),
              message: {
                id: `mute_warn_${Date.now()}`,
                senderPeerId: 'system',
                senderName: 'СЕРВЕР',
                text: `Вы не можете писать в чат (мут: ${mutes[senderNorm].reason}).`,
                timestamp: Date.now(),
                isSystem: true
              }
            });
            return;
          }
        }
      }
      this.connections.forEach((conn, peer) => {
        if (peer !== senderPeerId && conn.open) {
          if (this.serverSettings.passwordRequired && !this.authenticatedPeers.has(peer)) return;
          try {
            conn.send(packet);
          } catch {}
        }
      });
    }

    switch (packet.type) {
      case 'join': {
        if (!this.isHost) break;
        const peerId = effectiveSenderId || packet.peerId;
        const displayName = (packet.name || 'Игрок').trim().slice(0, 24) || 'Игрок';
        const normNick = normalizeServerNick(displayName);

        // Enforce persistent server ban list BEFORE auth
        const bans = loadServerBans(this.roomCode);
        const banRecord = bans[normNick];
        if (banRecord) {
          this.sendDirectPacket(peerId, {
            type: 'auth_result',
            packetId: this.nextPacketId(),
            success: false,
            retryable: false,
            reason: `Вы забанены на этом сервере. Причина: ${banRecord.reason}`,
            targetPeerId: peerId
          });
          const conn = this.connections.get(peerId);
          if (conn) setTimeout(() => { try { conn.close(); } catch {} }, 180);
          return;
        }

        // Reject if another connected player (or the host) is already online with this nickname
        let duplicateOnline = false;
        this.activeNickByPeer.forEach((activeNorm, existingPeer) => {
          if (existingPeer !== peerId && activeNorm === normNick) {
            duplicateOnline = true;
          }
        });
        if (duplicateOnline) {
          this.sendDirectPacket(peerId, {
            type: 'auth_result',
            packetId: this.nextPacketId(),
            success: false,
            retryable: false,
            reason: `Ник «${displayName}» уже используется игроком на сервере.`,
            targetPeerId: peerId
          });
          const conn = this.connections.get(peerId);
          if (conn) setTimeout(() => { try { conn.close(); } catch {} }, 180);
          return;
        }

        // If per-player password protection is enabled, send register or login challenge
        if (this.serverSettings.passwordRequired) {
          const accounts = loadServerAccounts(this.roomCode);
          const mode: 'register' | 'login' = accounts[normNick] ? 'login' : 'register';
          this.pendingAuthPeers.set(peerId, { name: displayName, normNick, attempts: 0 });
          this.sendDirectPacket(peerId, {
            type: 'auth_challenge',
            packetId: this.nextPacketId(),
            mode,
            roomCode: this.roomCode,
            serverName: this.serverDisplayName || `Сервер ${this.roomCode}`,
            nickname: displayName,
            targetPeerId: peerId
          });
          return;
        }

        // Open server without per-nick password: authorize immediately
        this.finalizeHostAuthorizePeer(peerId, displayName, normNick, 'none');
        break;
      }

      case 'auth_challenge': {
        if (this.isHost) break;
        this.authState = packet.mode === 'register' ? 'pending_register' : 'pending_login';
        this.authChallenge = {
          mode: packet.mode,
          roomCode: packet.roomCode,
          serverName: packet.serverName,
          nickname: packet.nickname,
          attemptsLeft: packet.mode === 'login' ? 3 : undefined,
          submitting: false
        };
        this.authKickReason = null;
        this.notify();
        break;
      }

      case 'auth_submit': {
        if (!this.isHost) break;
        const peerId = effectiveSenderId || packet.peerId;
        const pending = this.pendingAuthPeers.get(peerId);
        if (!pending) return;

        const rawPass = (packet.password || '').trim();
        if (rawPass.length < 4) {
          this.sendDirectPacket(peerId, {
            type: 'auth_result',
            packetId: this.nextPacketId(),
            success: false,
            retryable: true,
            attemptsLeft: Math.max(1, 3 - pending.attempts),
            reason: 'Пароль должен содержать минимум 4 символа.',
            targetPeerId: peerId
          });
          return;
        }

        void (async () => {
          const accounts = loadServerAccounts(this.roomCode);
          const existing = accounts[pending.normNick];

          if (packet.mode === 'register') {
            if (existing) {
              // Nick was registered concurrently; prompt login instead
              this.sendDirectPacket(peerId, {
                type: 'auth_challenge',
                packetId: this.nextPacketId(),
                mode: 'login',
                roomCode: this.roomCode,
                serverName: this.serverDisplayName || `Сервер ${this.roomCode}`,
                nickname: pending.name,
                targetPeerId: peerId
              });
              return;
            }
            const salt = generateSalt();
            const hash = await hashAccountPassword(salt, rawPass);
            const now = Date.now();
            accounts[pending.normNick] = {
              displayName: pending.name,
              salt,
              hash,
              registeredAt: now,
              lastLoginAt: now
            };
            saveServerAccounts(this.roomCode, accounts);
            this.finalizeHostAuthorizePeer(peerId, pending.name, pending.normNick, 'register');
            return;
          }

          // Login verification
          if (!existing) {
            this.sendDirectPacket(peerId, {
              type: 'auth_challenge',
              packetId: this.nextPacketId(),
              mode: 'register',
              roomCode: this.roomCode,
              serverName: this.serverDisplayName || `Сервер ${this.roomCode}`,
              nickname: pending.name,
              targetPeerId: peerId
            });
            return;
          }

          const candidateHash = await hashAccountPassword(existing.salt, rawPass);
          if (candidateHash === existing.hash) {
            existing.lastLoginAt = Date.now();
            saveServerAccounts(this.roomCode, accounts);
            this.finalizeHostAuthorizePeer(peerId, pending.name, pending.normNick, 'login');
          } else {
            pending.attempts += 1;
            const attemptsLeft = Math.max(0, 3 - pending.attempts);
            if (attemptsLeft > 0) {
              this.sendDirectPacket(peerId, {
                type: 'auth_result',
                packetId: this.nextPacketId(),
                success: false,
                retryable: true,
                attemptsLeft,
                reason: `Неверный пароль. Осталось попыток: ${attemptsLeft}.`,
                targetPeerId: peerId
              });
            } else {
              this.pendingAuthPeers.delete(peerId);
              this.sendDirectPacket(peerId, {
                type: 'auth_result',
                packetId: this.nextPacketId(),
                success: false,
                retryable: false,
                attemptsLeft: 0,
                reason: 'Превышено число попыток ввода пароля. Доступ к аккаунту заблокирован.',
                targetPeerId: peerId
              });
              const conn = this.connections.get(peerId);
              if (conn) setTimeout(() => { try { conn.close(); } catch {} }, 180);
            }
          }
        })();
        break;
      }

      case 'auth_result': {
        if (this.isHost) break;
        if (packet.success) {
          this.authState = 'authenticated';
          this.authChallenge = null;
          this.authKickReason = null;
          if (packet.settings) {
            this.serverSettings = { ...this.serverSettings, ...packet.settings };
          }
          if (packet.mode === 'register') {
            this.addSystemMessage('Аккаунт зарегистрирован на сервере. Ваш ник и сохранение защищены паролем.');
          } else if (packet.mode === 'login') {
            this.addSystemMessage('Вход подтверждён. Профиль сервера разблокирован.');
          }
          this.notify();
        } else if (packet.retryable && this.authChallenge) {
          this.authChallenge = {
            ...this.authChallenge,
            error: packet.reason || 'Неверный пароль.',
            attemptsLeft: packet.attemptsLeft,
            submitting: false
          };
          this.notify();
        } else {
          const reason = packet.reason || 'Отказано в доступе к серверу.';
          this.addSystemMessage(`Ошибка входа: ${reason}`);
          this.leaveRoom();
          this.authState = 'kicked';
          this.authKickReason = reason;
          this.notify();
        }
        break;
      }

      case 'server_settings': {
        if (packet.settings) {
          this.serverSettings = { ...this.serverSettings, ...packet.settings };
          this.notify();
        }
        break;
      }

      case 'traffic_sync': {
        if (!this.isHost && packet.vehicles && packet.pedestrians) {
          this.lastTrafficSync = { vehicles: packet.vehicles, pedestrians: packet.pedestrians };
        }
        break;
      }

      case 'world_state_sync': {
        if (!this.isHost && packet.worldState) {
          this.lastWorldStateSync = { ...packet.worldState, updatedAt: Date.now() };
          if (typeof packet.worldState.savePlayerData === 'boolean') {
            this.serverSettings.savePlayerData = packet.worldState.savePlayerData;
          }
          this.notify();
        }
        break;
      }

      case 'leave': {
        const player = this.remotePlayers.get(packet.peerId);
        if (player) {
          this.addSystemMessage(`${player.name} покинул комнату.`);
          this.remotePlayers.delete(packet.peerId);
          this.speechBubbles.delete(packet.peerId);
        }
        this.notify();
        break;
      }

      case 'sync': {
        const p = packet.player;
        if (!p || p.peerId === this.localPeerId) return;

        if (this.isHost && this.serverSettings.antiCheat !== 'none') {
          let record = this.peerAntiCheatMap.get(p.peerId);
          const nowTime = Date.now();
          if (record) {
            const distMoved = Math.hypot(p.x - record.lastX, p.y - record.lastY);
            const timeDiff = (nowTime - record.lastTime) / 1000;
            if (this.serverSettings.antiCheat === 'strict' && timeDiff > 0.02 && (distMoved / timeDiff) > 2500 && !p.isInVehicle) {
              record.violations++;
              if (record.violations > 5) return;
            }
            record.lastX = p.x;
            record.lastY = p.y;
            record.lastTime = nowTime;
          } else {
            this.peerAntiCheatMap.set(p.peerId, { lastX: p.x, lastY: p.y, lastTime: nowTime, violations: 0 });
          }
        }

        p.lastUpdated = Date.now();
        this.remotePlayers.set(p.peerId, p);
        break;
      }

      case 'chat': {
        const msg = packet.message;
        if (!msg) return;

        // Also enforce mute for BroadcastChannel local tabs on host
        if (this.isHost && !msg.isSystem) {
          const senderNorm =
            (effectiveSenderId && this.activeNickByPeer.get(effectiveSenderId)) ||
            normalizeServerNick(msg.senderName || '');
          if (senderNorm) {
            const mutes = loadServerMutes(this.roomCode);
            if (mutes[senderNorm]) return;
          }
        }

        this.chatMessages.push(msg);
        if (this.chatMessages.length > 100) {
          this.chatMessages.shift();
        }

        // Set speech bubble above remote player (or their car)
        if (!msg.isSystem) {
          this.speechBubbles.set(msg.senderPeerId, {
            text: msg.text,
            expiresAt: Date.now() + 5000,
            isVehicle: false
          });
        }

        sound.playAlert(); // Subtle friendly notification sound
        this.notify();
        break;
      }

      case 'kick': {
        if (this.isHost) break;
        const reason = packet.reason || 'Вы были отключены хостом сервера.';
        this.leaveRoom();
        this.authState = 'kicked';
        this.authKickReason = reason;
        this.notify();
        break;
      }

      case 'teleport': {
        if (this.isHost) break;
        if (typeof packet.x === 'number' && typeof packet.y === 'number') {
          this.onGuestTeleported?.(packet.x, packet.y, packet.reason);
          if (packet.reason) {
            this.addSystemMessage(packet.reason);
          }
        }
        break;
      }

      case 'player_save_upload': {
        if (!this.isHost) break;
        if (this.serverSettings.savePlayerData === false) break;
        const peerId = effectiveSenderId || packet.peerId;
        const verifiedNorm = this.activeNickByPeer.get(peerId);
        if (!verifiedNorm || !packet.save) break;
        const saves = loadServerPlayerSaves(this.roomCode);
        saves[verifiedNorm] = {
          ...packet.save,
          normNick: verifiedNorm,
          updatedAt: Date.now()
        };
        saveServerPlayerSaves(this.roomCode, saves);
        break;
      }

      case 'player_save_restore': {
        if (this.isHost || !packet.save) break;
        this.onGuestServerSaveReceived?.(packet.save);
        break;
      }

      case 'room_info': {
        // Connect to peers listed by host if not connected yet
        if (Array.isArray(packet.players)) {
          packet.players.forEach((p) => {
            if (p.peerId !== this.localPeerId && !this.connections.has(p.peerId)) {
              this.connectToPeer(p.peerId);
            }
          });
        }
        this.notify();
        break;
      }
    }
  }

  private lastLocalHostPos: { x: number; y: number } | null = null;

  /**
   * Sends a chat message to everyone in the room, or executes a `/` server command.
   */
  public sendChatMessage(text: string) {
    if (!this.isHost && this.status === 'connected' && this.authState !== 'authenticated') {
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('/')) {
      this.executeChatCommand(trimmed);
      return;
    }

    // Safe cap to prevent WebRTC SCTP buffer overflow on huge prompts
    const safeText = trimmed.length > 4000 ? trimmed.slice(0, 4000) : trimmed;

    const message: ChatMessage = {
      id: `${this.localPeerId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      senderPeerId: this.localPeerId,
      senderName: this.localPlayerName,
      text: safeText,
      timestamp: Date.now()
    };

    this.chatMessages.push(message);
    if (this.chatMessages.length > 100) {
      this.chatMessages.shift();
    }

    // Set local player's speech bubble (compact overhead preview)
    const bubblePreview = safeText.length > 120 ? safeText.slice(0, 117) + '...' : safeText;
    this.speechBubbles.set('local', {
      text: bubblePreview,
      expiresAt: Date.now() + 5000
    });
    this.speechBubbles.set(this.localPeerId, {
      text: bubblePreview,
      expiresAt: Date.now() + 5000
    });

    try {
      this.broadcastPacket({
        type: 'chat',
        packetId: this.nextPacketId(),
        message
      });
    } catch (err) {
      console.warn('[OnlineManager] Error broadcasting chat:', err);
    }

    this.notify();
  }

  public addSystemMessage(text: string) {
    const message: ChatMessage = {
      id: `sys_${Date.now()}_${Math.random()}`,
      senderPeerId: 'system',
      senderName: 'СИСТЕМА',
      text,
      timestamp: Date.now(),
      isSystem: true
    };
    this.chatMessages.push(message);
    if (this.chatMessages.length > 100) {
      this.chatMessages.shift();
    }
    this.notify();
  }

  /**
   * Leave room and close all peer connections.
   */
  public leaveRoom() {
    if (this.status === 'connected' && this.localPeerId) {
      this.broadcastPacket({
        type: 'leave',
        packetId: this.nextPacketId(),
        peerId: this.localPeerId,
        name: this.localPlayerName
      });
    }

    this.connections.forEach((conn) => {
      try {
        conn.close();
      } catch {}
    });
    this.connections.clear();

    if (this.peer && !this.peer.destroyed) {
      try {
        this.peer.destroy();
      } catch {}
    }
    this.peer = null;

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {}
      this.broadcastChannel = null;
    }

    this.remotePlayers.clear();
    this.speechBubbles.clear();
    this.chatMessages = [];
    this.lastTrafficSync = null;
    this.lastWorldStateSync = null;
    this.peerAntiCheatMap.clear();
    this.authenticatedPeers.clear();
    this.pendingAuthPeers.clear();
    this.activeNickByPeer.clear();
    this.authChallenge = null;
    this.authState = 'idle';
    this.status = 'disconnected';
    this.roomCode = '';
    this.serverDisplayName = '';
    this.isHost = false;
    this.errorMessage = null;
    this.notify();
  }

  /**
   * Removes remote players' ghost vehicles from the local world when exiting online mode
   * or converting a server session into a standalone singleplayer world.
   */
  public clearRemoteVehiclesFromWorld(world: GameWorld | null) {
    if (!world || !Array.isArray(world.vehicles)) return;
    world.vehicles = world.vehicles.filter((v) => !(v as any).isRemoteControlled);
  }

  /**
   * Synchronizes the local player's state (and their vehicle + trailer if driving)
   * to all other players in the room.
   */
  public broadcastLocalState(player: Player, world: GameWorld) {
    if (this.status !== 'connected') return;
    if (!this.isHost && this.authState !== 'authenticated') return;
    if (this.isHost) {
      this.lastLocalHostPos = { x: player.x, y: player.y };
    }

    let vehicleState: RemoteVehicleState | null = null;
    let trailerState: RemoteVehicleState | null = null;

    if (player.isInVehicle && player.currentVehicleId) {
      const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
      if (veh) {
        vehicleState = {
          id: veh.id,
          type: veh.type,
          x: veh.x,
          y: veh.y,
          vx: veh.vx,
          vy: veh.vy,
          angle: veh.angle,
          steerAngle: veh.steerAngle,
          speed: veh.speed,
          color: veh.color,
          roofColor: veh.roofColor,
          headlightsOn: veh.headlightsOn,
          headlightMode: veh.headlightMode,
          brakeLightsOn: veh.brakeLightsOn,
          isReversing: veh.isReversing,
          turnSignal: veh.turnSignal,
          isHonking: veh.isHonking,
          sirenOn: veh.sirenOn,
          wipersOn: veh.wipersOn,
          engineRunning: veh.engineState?.engineRunning,
          engineRPM: veh.engineState?.engineRPM,
          engineTemperature: veh.engineState?.temperature,
          damage: {
            frontCrumple: veh.damage.frontCrumple,
            rearCrumple: veh.damage.rearCrumple,
            leftDent: veh.damage.leftDent,
            rightDent: veh.damage.rightDent,
            frontLeftDent: veh.damage.frontLeftDent,
            frontRightDent: veh.damage.frontRightDent,
            rearLeftDent: veh.damage.rearLeftDent,
            rearRightDent: veh.damage.rearRightDent,
            hoodBuckled: veh.damage.hoodBuckled,
            windshieldCracked: veh.damage.windshieldCracked,
            rearGlassCracked: veh.damage.rearGlassCracked,
            leftHeadlightBroken: veh.damage.leftHeadlightBroken,
            rightHeadlightBroken: veh.damage.rightHeadlightBroken,
            leftTaillightBroken: veh.damage.leftTaillightBroken,
            rightTaillightBroken: veh.damage.rightTaillightBroken,
            engineSmoking: veh.damage.engineSmoking,
            underHoodSmolder: veh.damage.underHoodSmolder,
            engineFire: veh.damage.engineFire,
            fuelTankFire: veh.damage.fuelTankFire,
            cabinFire: veh.damage.cabinFire,
            isFullyBurnt: veh.damage.isFullyBurnt,
            scratches: veh.damage.scratches ? [...veh.damage.scratches] : [],
            deformedVertices: veh.damage.deformedVertices ? [...veh.damage.deformedVertices] : [],
            frameBentAngle: veh.damage.frameBentAngle,
            hoodRaisedAmount: veh.damage.hoodRaisedAmount,
            bumperSagLeft: veh.damage.bumperSagLeft,
            bumperSagRight: veh.damage.bumperSagRight
          },
          trailerId: veh.trailerId,
          towedById: veh.towedById,
          trailerDollyAngle: veh.trailerDollyAngle,
          trailerDollyX: veh.trailerDollyX,
          trailerDollyY: veh.trailerDollyY
        };

        // If towing a trailer, serialize trailer vehicle as well
        if (veh.trailerId) {
          const trailerVeh = world.vehicles.find((v) => v.id === veh.trailerId);
          if (trailerVeh) {
            trailerState = {
              id: trailerVeh.id,
              type: trailerVeh.type,
              x: trailerVeh.x,
              y: trailerVeh.y,
              vx: trailerVeh.vx,
              vy: trailerVeh.vy,
              angle: trailerVeh.angle,
              steerAngle: trailerVeh.steerAngle,
              speed: trailerVeh.speed,
              color: trailerVeh.color,
              roofColor: trailerVeh.roofColor,
              headlightsOn: trailerVeh.headlightsOn,
              headlightMode: trailerVeh.headlightMode,
              brakeLightsOn: trailerVeh.brakeLightsOn,
              isReversing: trailerVeh.isReversing,
              turnSignal: trailerVeh.turnSignal,
              isHonking: false,
              damage: {
                frontCrumple: trailerVeh.damage?.frontCrumple || 0,
                rearCrumple: trailerVeh.damage?.rearCrumple || 0,
                leftDent: trailerVeh.damage?.leftDent || 0,
                rightDent: trailerVeh.damage?.rightDent || 0,
                frontLeftDent: 0,
                frontRightDent: 0,
                rearLeftDent: 0,
                rearRightDent: 0,
                hoodBuckled: false,
                windshieldCracked: false,
                rearGlassCracked: false,
                leftHeadlightBroken: false,
                rightHeadlightBroken: false,
                leftTaillightBroken: trailerVeh.damage?.leftTaillightBroken || false,
                rightTaillightBroken: trailerVeh.damage?.rightTaillightBroken || false,
                deformedVertices: trailerVeh.damage?.deformedVertices ? [...trailerVeh.damage.deformedVertices] : []
              },
              towedById: veh.id,
              trailerDollyAngle: trailerVeh.trailerDollyAngle,
              trailerDollyX: trailerVeh.trailerDollyX,
              trailerDollyY: trailerVeh.trailerDollyY,
              trailerRearX: trailerVeh.trailerRearX,
              trailerRearY: trailerVeh.trailerRearY
            };
          }
        }
      }
    }

    const state: RemotePlayerState = {
      peerId: this.localPeerId,
      name: this.localPlayerName,
      x: player.x,
      y: player.y,
      vx: player.vx,
      vy: player.vy,
      angle: player.angle,
      speed: player.speed,
      walkCycle: player.walkCycle,
      isDashing: player.isDashing,
      isFlying: player.isFlying,
      skinColor: player.skinColor,
      shirtColor: player.shirtColor,
      pantsColor: player.pantsColor,
      hairColor: player.hairColor,
      equippedClothing: player.equippedClothing || {},
      leftHandItem: player.leftHandItem,
      rightHandItem: player.rightHandItem,
      activeHand: player.activeHand,
      actionAnim: player.actionAnim || null,
      isInVehicle: player.isInVehicle,
      currentVehicleId: player.currentVehicleId,
      vehicleState,
      trailerState,
      lastUpdated: Date.now()
    };

    this.broadcastPacket({
      type: 'sync',
      packetId: this.nextPacketId(),
      peerId: this.localPeerId,
      player: state
    });
  }

  /**
   * Called on every game frame to update remote vehicles in world and prune dead peers.
   */
  public update(dt: number, world: GameWorld) {
    if (this.status !== 'connected') return;

    const now = Date.now();

    // Host world atmosphere/time/mode broadcasting (~every 2.5s or immediately on peer join)
    if (this.isHost) {
      this.worldSyncTimer += dt;
      if (this.worldSyncTimer >= 2.5) {
        this.worldSyncTimer = 0;
        this.broadcastPacket({
          type: 'world_state_sync',
          packetId: this.nextPacketId(),
          worldState: {
            timeHour: typeof world.timeHour === 'number' ? world.timeHour : 12,
            calendar: world.calendar ? { ...world.calendar } : undefined,
            weather: world.weather || 'clear',
            gameMode: world.gameMode || 'career',
            savePlayerData: this.serverSettings.savePlayerData
          }
        });
      }
    }

    // Host traffic broadcasting
    if (this.isHost && this.serverSettings.trafficEnabled) {
      this.syncTimer += dt;
      if (this.syncTimer >= 0.1) {
        this.syncTimer = 0;
        const vehiclesToSync: SyncTrafficVehicle[] = world.vehicles
          .filter(v => !v.isPlayerControlled && !(v as any).isRemoteControlled && !v.isParked && v.id !== 'evac_ambulance_special' && !v.keyId)
          .slice(0, this.serverSettings.vehicleCount)
          .map(v => ({
            id: v.id,
            type: v.type,
            x: v.x,
            y: v.y,
            vx: v.vx,
            vy: v.vy,
            angle: v.angle,
            speed: v.speed,
            steerAngle: v.steerAngle,
            color: v.color,
            roofColor: v.roofColor,
            headlightsOn: v.headlightsOn,
            brakeLightsOn: v.brakeLightsOn,
            turnSignal: v.turnSignal,
            isParked: v.isParked
          }));

        const pedsToSync: SyncPedestrian[] = world.pedestrians
          .slice(0, this.serverSettings.pedestrianCount)
          .map(p => ({
            id: p.id,
            x: p.x,
            y: p.y,
            vx: p.vx,
            vy: p.vy,
            angle: p.angle,
            speed: p.speed,
            walkCycle: p.walkCycle,
            skinColor: p.skinColor,
            shirtColor: p.shirtColor,
            pantsColor: p.pantsColor
          }));

        this.broadcastPacket({
          type: 'traffic_sync',
          packetId: this.nextPacketId(),
          vehicles: vehiclesToSync,
          pedestrians: pedsToSync
        });
      }
    }

    // Client applying traffic sync
    if (!this.isHost && this.lastTrafficSync) {
      this.lastTrafficSync.vehicles.forEach(sv => {
        let v = world.vehicles.find(item => item.id === sv.id);
        if (v && !v.isPlayerControlled) {
          v.x += (sv.x - v.x) * Math.min(1, dt * 10);
          v.y += (sv.y - v.y) * Math.min(1, dt * 10);
          v.vx = sv.vx;
          v.vy = sv.vy;
          v.angle = sv.angle;
          v.speed = sv.speed;
        }
      });
    }

    // 1. Prune expired speech bubbles
    this.speechBubbles.forEach((bubble, key) => {
      if (bubble.expiresAt <= now) {
        this.speechBubbles.delete(key);
      }
    });

    // 2. Prune timed-out remote players (> 10s no sync)
    this.remotePlayers.forEach((p, peerId) => {
      if (now - p.lastUpdated > 10000) {
        this.remotePlayers.delete(peerId);
        this.speechBubbles.delete(peerId);
        this.notify();
      }
    });

    // 3. Update or spawn remote players' vehicles in local world
    this.remotePlayers.forEach((p) => {
      if (p.isInVehicle && p.vehicleState) {
        const vs = p.vehicleState;
        let veh = world.vehicles.find((v) => v.id === vs.id);

        if (!veh) {
          // Vehicle does not exist in local world; spawn it!
          const cfg = CAR_CONFIGS[vs.type] || CAR_CONFIGS.sedan;
          veh = {
            id: vs.id,
            type: vs.type,
            x: vs.x,
            y: vs.y,
            vx: vs.vx || 0,
            vy: vs.vy || 0,
            angle: vs.angle,
            steerAngle: vs.steerAngle || 0,
            targetSteerAngle: vs.steerAngle || 0,
            speed: vs.speed || 0,
            lateralVelocity: 0,
            angularVelocity: 0,
            isDrifting: false,
            driftFactor: 0,
            mass: cfg.mass,
            width: cfg.width,
            length: cfg.length,
            wheelBase: cfg.wheelBase,
            color: vs.color,
            roofColor: vs.roofColor,
            headlightsOn: vs.headlightsOn,
            headlightMode: vs.headlightMode || 'low',
            brakeLightsOn: vs.brakeLightsOn || false,
            isReversing: vs.isReversing || false,
            turnSignal: vs.turnSignal || 'none',
            turnSignalTimer: 0,
            requiredFuel: 'ai92',
            engineState: createDefaultEngineState(vs.type),
            fuelSystem: createDefaultFuelSystem(vs.type),
            damage: ensureVehicleDamage({ damage: vs.damage as unknown as VehicleDamage, length: cfg.length, width: cfg.width }),
            isPlayerControlled: false,
            isParked: false,
            targetSpeed: 0,
            currentLaneId: null,
            targetWaypointIndex: 0,
            routeWaypoints: [],
            aiState: 'driving',
            inIntersection: false,
            plannedTurn: 'straight',
            stuckTimer: 0,
            honkTimer: 0,
            isHonking: vs.isHonking || false,
            hornEffectTimer: 0,
            sirenOn: vs.sirenOn || false,
            wipersOn: vs.wipersOn || false
          };
          (veh as any).isRemoteControlled = true;
          (veh as any).remoteDriverName = p.name;
          applyPowertrain(veh);
          world.vehicles.push(veh);
        }

        // Apply synchronized state to the vehicle
        (veh as any).isRemoteControlled = true;
        (veh as any).remoteDriverName = p.name;
        veh.isPlayerControlled = false;
        veh.isParked = false;

        // Smooth position interpolation
        const lerpFactor = Math.min(1, dt * 15);
        veh.x += (vs.x - veh.x) * lerpFactor;
        veh.y += (vs.y - veh.y) * lerpFactor;
        veh.vx = vs.vx;
        veh.vy = vs.vy;
        veh.speed = vs.speed;

        // Angular interpolation
        let angleDiff = vs.angle - veh.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        veh.angle += angleDiff * lerpFactor;
        veh.steerAngle = vs.steerAngle;

        // Lights & signals
        veh.headlightsOn = vs.headlightsOn;
        veh.headlightMode = vs.headlightMode;
        veh.brakeLightsOn = vs.brakeLightsOn;
        veh.isReversing = vs.isReversing;
        veh.turnSignal = vs.turnSignal;
        veh.sirenOn = vs.sirenOn;
        veh.wipersOn = vs.wipersOn;

        // Horn sound and wave
        if (vs.isHonking) {
          veh.isHonking = true;
          veh.hornEffectTimer = 0.25;
          if (!this.lastHonkingVehicles.has(vs.id)) {
            sound.playHorn(vs.type);
            this.lastHonkingVehicles.add(vs.id);
          }
        } else {
          veh.isHonking = false;
          if (this.lastHonkingVehicles.has(vs.id)) {
            sound.stopHorn();
            this.lastHonkingVehicles.delete(vs.id);
          }
        }

        // Powertrain & engine
        if (veh.engineState) {
          veh.engineState.engineRunning = vs.engineRunning ?? veh.engineState.engineRunning;
          veh.engineState.engineRPM = vs.engineRPM ?? veh.engineState.engineRPM;
          veh.engineState.temperature = vs.engineTemperature ?? veh.engineState.temperature;
        }

        // Damage & Softbody Geometry
        if (vs.damage) {
          veh.damage = ensureVehicleDamage({ damage: vs.damage as unknown as VehicleDamage, length: veh.length, width: veh.width });
        }

        // Synchronize Trailer if present
        if (vs.trailerId && p.trailerState) {
          const ts = p.trailerState;
          let trailer = world.vehicles.find((v) => v.id === ts.id);
          if (!trailer) {
            const tCfg = CAR_CONFIGS[ts.type] || CAR_CONFIGS.trailer_barrel;
            trailer = {
              id: ts.id,
              type: ts.type,
              x: ts.x,
              y: ts.y,
              vx: ts.vx || 0,
              vy: ts.vy || 0,
              angle: ts.angle,
              steerAngle: 0,
              targetSteerAngle: 0,
              speed: ts.speed || 0,
              lateralVelocity: 0,
              angularVelocity: 0,
              isDrifting: false,
              driftFactor: 0,
              mass: tCfg.mass,
              width: tCfg.width,
              length: tCfg.length,
              wheelBase: tCfg.wheelBase,
              color: ts.color,
              roofColor: ts.roofColor,
              headlightsOn: ts.headlightsOn,
              headlightMode: ts.headlightMode,
              brakeLightsOn: ts.brakeLightsOn,
              isReversing: ts.isReversing,
              turnSignal: ts.turnSignal,
              turnSignalTimer: 0,
              requiredFuel: 'ai92',
              damage: ensureVehicleDamage({ damage: ts.damage as unknown as VehicleDamage, length: tCfg.length, width: tCfg.width }),
              isPlayerControlled: false,
              isParked: false,
              targetSpeed: 0,
              currentLaneId: null,
              targetWaypointIndex: 0,
              routeWaypoints: [],
              aiState: 'driving',
              inIntersection: false,
              plannedTurn: 'straight',
              stuckTimer: 0,
              honkTimer: 0,
              isHonking: false,
              hornEffectTimer: 0,
              isTrailer: true,
              towedById: veh.id,
              trailerDollyAngle: ts.trailerDollyAngle,
              trailerDollyX: ts.trailerDollyX,
              trailerDollyY: ts.trailerDollyY,
              trailerRearX: ts.trailerRearX,
              trailerRearY: ts.trailerRearY
            };
            (trailer as any).isRemoteControlled = true;
            world.vehicles.push(trailer);
          }

          veh.trailerId = trailer.id;
          trailer.towedById = veh.id;
          trailer.isTrailer = true;
          trailer.x += (ts.x - trailer.x) * lerpFactor;
          trailer.y += (ts.y - trailer.y) * lerpFactor;
          trailer.angle = ts.angle;
          trailer.trailerDollyAngle = ts.trailerDollyAngle;
          if (ts.trailerRearX !== undefined) trailer.trailerRearX = ts.trailerRearX;
          if (ts.trailerRearY !== undefined) trailer.trailerRearY = ts.trailerRearY;
          trailer.turnSignal = ts.turnSignal;
          trailer.brakeLightsOn = ts.brakeLightsOn;
          (trailer as any).isRemoteControlled = true;
        }
      }
    });
  }

  public getRemotePlayersArray(): RemotePlayerState[] {
    return Array.from(this.remotePlayers.values());
  }

  public getSpeechBubbles(): Map<string, SpeechBubble> {
    return this.speechBubbles;
  }
}

export const onlineManager = new OnlineManager();
