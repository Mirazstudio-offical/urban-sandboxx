import Peer, { DataConnection } from 'peerjs';
import { 
  CarType, 
  DeformVertex, 
  EquippedClothing, 
  GameWorld, 
  InventoryItem, 
  Player, 
  ScratchMark, 
  Vehicle, 
  VehicleDamage 
} from './types';
import { CAR_CONFIGS, createDefaultEngineState, createDefaultFuelSystem, ensureVehicleDamage } from './vehicleHelpers';
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
  
  // Transport & vehicle
  isInVehicle: boolean;
  currentVehicleId: string | null;
  vehicleState?: RemoteVehicleState | null;
  trailerState?: RemoteVehicleState | null;

  // Metadata
  lastUpdated: number;
  ping?: number;
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

export type NetworkPacket = 
  | { type: 'join'; packetId: string; peerId: string; name: string }
  | { type: 'leave'; packetId: string; peerId: string; name: string }
  | { type: 'sync'; packetId: string; peerId: string; player: RemotePlayerState }
  | { type: 'chat'; packetId: string; message: ChatMessage }
  | { type: 'room_info'; packetId: string; hostPeerId: string; players: { peerId: string; name: string }[] };

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
  public isHost: boolean = false;
  public localPeerId: string = '';
  public localPlayerName: string = '';

  public remotePlayers: Map<string, RemotePlayerState> = new Map();
  public chatMessages: ChatMessage[] = [];
  public speechBubbles: Map<string, SpeechBubble> = new Map();

  private listeners: Set<() => void> = new Set();
  private syncTimer: number = 0;
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
  public async joinOrCreateRoom(rawRoomCode: string, playerName?: string, asHost: boolean = true) {
    this.leaveRoom();

    if (playerName && playerName.trim()) {
      this.setPlayerName(playerName);
    }

    const cleanCode = this.sanitizeRoomCode(rawRoomCode);
    this.roomCode = cleanCode;
    this.status = 'connecting';
    this.errorMessage = null;
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

        // Broadcast join packet
        this.broadcastPacket({
          type: 'join',
          packetId: this.nextPacketId(),
          peerId: this.localPeerId,
          name: this.localPlayerName
        });

        // Add local system message
        this.addSystemMessage(
          this.isHost 
            ? `Вы подключились к комнате «${this.roomCode}» (Хост). Ожидание игроков...` 
            : `Вы подключились к комнате «${this.roomCode}»!`
        );

        // If client, connect directly to host
        if (!this.isHost) {
          this.connectToPeer(hostPeerId);
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

        // 1. Host ID already taken -> Connect as client to the existing host
        if (errType === 'unavailable-id' && this.isHost) {
          this.destroyPeerOnly();
          this.joinOrCreateRoom(rawRoomCode, playerName, false);
          return;
        }

        // 2. Client could not reach host (host offline or room newly formed) -> Take over as host!
        if (errType === 'peer-unavailable') {
          if (!this.isHost && errMsg.includes(hostPeerId)) {
            this.destroyPeerOnly();
            this.joinOrCreateRoom(rawRoomCode, playerName, true);
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

      // Send join announcement directly to this peer
      conn.send({
        type: 'join',
        packetId: this.nextPacketId(),
        peerId: this.localPeerId,
        name: this.localPlayerName
      });

      // If host, send room info with all existing peers
      if (this.isHost) {
        const playerList = Array.from(this.remotePlayers.values()).map((p) => ({
          peerId: p.peerId,
          name: p.name
        }));
        playerList.push({ peerId: this.localPeerId, name: this.localPlayerName });

        conn.send({
          type: 'room_info',
          packetId: this.nextPacketId(),
          hostPeerId: this.localPeerId,
          players: playerList
        });
      }

      this.notify();
    });

    conn.on('data', (data) => {
      this.handleIncomingPacket(data, 'webrtc', conn.peer);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
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
    });
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

    // Host relay: If host receives packet from a client, broadcast to all other clients!
    if (this.isHost && source === 'webrtc' && senderPeerId) {
      this.connections.forEach((conn, peer) => {
        if (peer !== senderPeerId && conn.open) {
          try {
            conn.send(packet);
          } catch {}
        }
      });
    }

    switch (packet.type) {
      case 'join': {
        const existing = this.remotePlayers.get(packet.peerId);
        if (!existing) {
          this.addSystemMessage(`${packet.name} вошел в комнату.`);
        }
        // If host, connect back or acknowledge
        if (this.isHost && !this.connections.has(packet.peerId)) {
          this.connectToPeer(packet.peerId);
        }
        this.notify();
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

        p.lastUpdated = Date.now();
        this.remotePlayers.set(p.peerId, p);
        break;
      }

      case 'chat': {
        const msg = packet.message;
        if (!msg) return;

        this.chatMessages.push(msg);
        if (this.chatMessages.length > 100) {
          this.chatMessages.shift();
        }

        // Set speech bubble above remote player (or their car)
        this.speechBubbles.set(msg.senderPeerId, {
          text: msg.text,
          expiresAt: Date.now() + 5000,
          isVehicle: false
        });

        sound.playAlert(); // Subtle friendly notification sound
        this.notify();
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

  /**
   * Sends a chat message to everyone in the room.
   */
  public sendChatMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const message: ChatMessage = {
      id: `${this.localPeerId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      senderPeerId: this.localPeerId,
      senderName: this.localPlayerName,
      text: trimmed,
      timestamp: Date.now()
    };

    this.chatMessages.push(message);
    if (this.chatMessages.length > 100) {
      this.chatMessages.shift();
    }

    // Set local player's speech bubble
    this.speechBubbles.set('local', {
      text: trimmed,
      expiresAt: Date.now() + 5000
    });
    this.speechBubbles.set(this.localPeerId, {
      text: trimmed,
      expiresAt: Date.now() + 5000
    });

    this.broadcastPacket({
      type: 'chat',
      packetId: this.nextPacketId(),
      message
    });

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
    this.status = 'disconnected';
    this.roomCode = '';
    this.isHost = false;
    this.errorMessage = null;
    this.notify();
  }

  /**
   * Synchronizes the local player's state (and their vehicle + trailer if driving)
   * to all other players in the room.
   */
  public broadcastLocalState(player: Player, world: GameWorld) {
    if (this.status !== 'connected') return;

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
