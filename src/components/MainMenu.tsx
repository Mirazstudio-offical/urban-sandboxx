import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import menuCss from './mainMenu.css?inline';
import compactCss from './menuCompact.css?inline';
import { stageMetrics, applyCompactState } from './ShadowHost';
import { SPAWN_LOCATIONS } from '../spawnLocations';
import { performanceConfig, savePerformanceConfig, DEFAULT_CONFIG, detectGraphicsPreset, PerformanceConfig, GraphicsPresetId } from '../performanceConfig';
import { GFX_GROUPS, GFX_PRESET_OPTIONS, GfxItem, applyGfxPatch, applyGfxPreset } from '../graphicsSettings';
import { sound } from '../audio';
import { onlineManager } from '../onlineSystem';
import { openHostSession } from '../hostSession';
import {
  subscribeToP2PServers,
  subscribeToHostedServers,
  deleteHostedServerBackup,
  subscribeToFriends,
  subscribeToIncomingRequests,
  subscribeToOutgoingRequests,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  fetchUserProfile,
  updateUserProfile,
  loginWithGoogle,
  logoutUser,
  type P2PServerRoom,
  type HostedServerBackup,
  type FriendshipData,
  type FriendRequestData,
  type UserProfileData,
  type User as FirebaseUser
} from '../firebase';
import { WeatherType } from '../types';
import { VehicleSelect, type PowertrainSelection } from './VehicleSelect';
import {
  KEYBIND_GROUPS,
  KEYBIND_DEFINITIONS,
  DEFAULT_KEYBINDS,
  useKeybinds,
  setKeybind,
  resetKeybind,
  resetAllKeybinds,
  formatKeyCode,
  isAnyKeybindCustomized,
  type KeybindAction
} from '../keybinds';

export interface SaveSlotData {
  id: string;
  name: string;
  date: string;
  playerX: number;
  playerY: number;
  playerAngle?: number;
  isInVehicle: boolean;
  currentVehicleId?: string | null;
  timeHour?: number;
  weather?: string;
  streetName?: string;
  cash?: number;
  vehicles?: any[];
  season?: string;
  mode?: 'career' | 'freeroam';
  vehicleType?: string;
  vehicleName?: string;
  worldId?: string;
  origin?: 'singleplayer' | 'server';
  serverRoomCode?: string;
  serverName?: string;
  isAutosave?: boolean;
  mapId?: string;
  modIds?: string[];
}

export interface MainMenuProps {
  /** Screen the menu opens on (defaults to the start screen). */
  initialScreen?: 'main' | 'servers';
  onResume: () => void;
  saves: SaveSlotData[];
  onLoadSave: (saveId: string) => void;
  onDeleteSave: (saveId: string) => void;
  onNewGame: (options: {
    spawnId: string;
    saveName: string;
    timeHour: number;
    weather: WeatherType;
    mode: 'career' | 'freeroam';
    vehicleType?: string;
    vehicleColor?: string;
    powertrain?: PowertrainSelection;
  }) => void;
  onJoinServer?: (options: {
    roomCode: string;
    nickname: string;
    serverName?: string;
    gameMode?: string;
  }) => Promise<void> | void;
  onCreateServer?: (options: {
    access: 'all' | 'code';
    roomCode: string;
    serverName: string;
    nickname: string;
    gameMode: string;
    maxPlayers: number;
    trafficEnabled: boolean;
    vehicleCount: number;
    pedestrianCount: number;
    passwordRequired: boolean;
    savePlayerData: boolean;
    antiCheat: 'none' | 'moderate' | 'strict';
  }) => Promise<void> | void;
  onStartSavedServer?: (backup: HostedServerBackup) => Promise<void> | void;
  currentSettings: {
    fpsLimit: number;
    autoSaveInterval: number;
    timeAutoCycle: boolean;
    mouseSensitivity: number;
    shiftMode?: 'auto' | 'manual';
    showSoftbodyMesh?: boolean;
    smokeDensity?: number;
  };
  onUpdateSettings: (newSettings: any) => void;
  currentUser?: FirebaseUser | null;
}

type ScreenType = 'main' | 'new' | 'freeroam_map' | 'freeroam_car' | 'saves' | 'servers' | 'account' | 'settings' | 'create';

// Parallax position of the scene behind each screen (see .p0 .. .p5 in the CSS)
const POS: Record<ScreenType, number> = { main: 0, new: 1, freeroam_map: 1, freeroam_car: 1, saves: 2, servers: 3, account: 4, settings: 5, create: 4 };

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const THUMBS = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'];
const thumbAt = (i: number) => THUMBS[((i % 8) + 8) % 8];
const CATEGORY_THUMB: Record<string, string> = { city: 'm4', highway: 'm2', nature: 'm3', mountain: 'm5', industrial: 'm7' };
const MODE_THUMB: Record<string, string> = { free_roam: 'm5', drift: 'm7', street_race: 'm4', delivery: 'm6' };
const MODE_NAME: Record<string, string> = {
  free_roam: 'Свободная езда',
  drift: 'Дрифт',
  street_race: 'Стрит-рейсинг',
  delivery: 'Грузоперевозки'
};
const modeName = (m: string) => MODE_NAME[m] || m;
const fillClass = (cur: number, max: number) => {
  const r = cur / Math.max(1, max);
  return r < 0.6 ? 'pg' : r < 0.9 ? 'py' : 'pr';
};
const fmtHour = (h: number) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
};

/* ------------------------------------------------------------------ */
/* small presentational pieces                                         */
/* ------------------------------------------------------------------ */

const Ic: React.FC<{ s?: number; c?: string; w?: number; fill?: string; children: React.ReactNode }> = ({
  s = 24,
  c = '#c9922b',
  w = 2,
  fill = 'none',
  children
}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={c} strokeWidth={w}>
    {children}
  </svg>
);

const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M4 2l10 6-10 6z" fill="#1a1409" />
  </svg>
);

const SearchIcon = () => (
  <Ic s={18} c="#a29e93">
    <circle cx="11" cy="11" r="7" />
    <path d="M16 16l5 5" />
  </Ic>
);

const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a29e93" strokeWidth="2.4">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const Toggle: React.FC<{ on: boolean; onChange: () => void; label: string }> = ({ on, onChange, label }) => (
  <button className={'tg' + (on ? ' on' : '')} role="switch" aria-checked={on} aria-label={label} onClick={onChange} />
);

const Seg: React.FC<{ options: { v: any; label: string }[]; value: any; onChange: (v: any) => void }> = ({ options, value, onChange }) => (
  <div className="seg">
    {options.map(o => (
      <span key={String(o.v)} role="button" tabIndex={0} className={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(o.v); } }}>
        {o.label}
      </span>
    ))}
  </div>
);

/** Draggable slider track styled exactly like the .sld-t in the reference markup. */
const Track: React.FC<{ value: number; min: number; max: number; step: number; onChange: (v: number) => void; label: string }> = ({
  value, min, max, step, onChange, label
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const clamp = (v: number) => Math.min(max, Math.max(min, +(Math.round(v / step) * step).toFixed(4)));
  const apply = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const v = clamp(min + t * (max - min));
    if (v !== value) onChange(v);
  };
  return (
    <div
      ref={ref}
      className="sld-t"
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = true; apply(e.clientX); }}
      onPointerMove={e => { if (drag.current) apply(e.clientX); }}
      onPointerUp={() => { drag.current = false; }}
      onPointerCancel={() => { drag.current = false; }}
      onKeyDown={e => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); onChange(clamp(value - step)); }
        else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); onChange(clamp(value + step)); }
      }}
    >
      <div className="sld-f" style={{ width: pct + '%' }} />
      <div className="sld-k" style={{ left: pct + '%' }} />
    </div>
  );
};

const Slider: React.FC<{ value: number; min: number; max: number; step: number; onChange: (v: number) => void; display: string; label: string }> = ({
  display, ...rest
}) => (
  <div className="sld">
    <Track {...rest} />
    <span className="sld-v">{display}</span>
  </div>
);

/** Renders the menu inside a shadow root so its stylesheet can never clash with the game's own CSS. */
const ShadowHost: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    setRoot(el.shadowRoot || el.attachShadow({ mode: 'open' }));
  }, []);
  return (
    <div
      ref={hostRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        boxSizing: 'border-box',
        background: '#0d0e10',
        overflow: 'hidden',
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        padding: 'env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)'
      }}
    >
      {root && createPortal(<><style>{menuCss}</style><style>{compactCss}</style>{children}</>, root)}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* main component                                                      */
/* ------------------------------------------------------------------ */

export const MainMenu: React.FC<MainMenuProps> = ({
  initialScreen = 'main',
  onResume,
  saves = [],
  onLoadSave,
  onDeleteSave,
  onNewGame,
  onJoinServer,
  onCreateServer,
  onStartSavedServer,
  currentSettings,
  onUpdateSettings,
  currentUser
}) => {
  /* ---------- navigation ---------- */
  const [cur, setCur] = useState<ScreenType>(initialScreen);
  const [pos, setPos] = useState(POS[initialScreen]);
  const [out, setOut] = useState(false);
  const [back, setBack] = useState(false);
  const busy = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const gmRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const wipeRef = useRef<HTMLDivElement>(null);

  const wipe = () => {
    const w = wipeRef.current;
    if (!w) return;
    w.classList.remove('on');
    void w.offsetWidth;
    w.classList.add('on');
  };

  const go = (target: ScreenType, isBack = false) => {
    if (busy.current || target === cur) return;
    busy.current = true;
    setBack(isBack);
    setOut(true);
    setPos(POS[target]);
    wipe();
    timer.current = window.setTimeout(() => {
      setCur(target);
      setOut(false);
      busy.current = false;
    }, 270);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const keybinds = useKeybinds();
  const [listeningAction, setListeningAction] = useState<KeybindAction | null>(null);
  const [keybindNotice, setKeybindNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!listeningAction) return;
    const onCapture = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setListeningAction(null);
        return;
      }
      const res = setKeybind(listeningAction, e.code);
      setListeningAction(null);
      if (res.warning) {
        setKeybindNotice(res.warning);
      } else if (res.swappedWith) {
        setKeybindNotice(`Клавиша поменяна местами с «${res.swappedWith.label}».`);
      } else {
        setKeybindNotice(null);
      }
    };
    window.addEventListener('keydown', onCapture, true);
    return () => window.removeEventListener('keydown', onCapture, true);
  }, [listeningAction]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (listeningAction) return;
      if (cur === 'main') return;
      if (cur === 'create') go('servers', true);
      else go('main', true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Fit the fixed 1440x900 stage into the window (no page scroll on any screen size)
  useLayoutEffect(() => {
    let ro: ResizeObserver | null = null;
    let raf = 0;
    const attach = () => {
      const w = wrapRef.current;
      const gm = gmRef.current;
      if (!w || !gm) { raf = requestAnimationFrame(attach); return; }
      const fit = () => {
        const W = w.clientWidth, H = w.clientHeight;
        if (!W || !H) return;
        const m = stageMetrics(W, H);
        applyCompactState(gm, m);
        if (m.compact) {
          gm.style.top = '0px';
          gm.style.transform = 'scale(' + m.k + ')';
          return;
        }
        const k = m.k;
        const sw = Math.max(1440, W / k);
        gm.style.width = sw + 'px';
        gm.style.setProperty('--sw', sw + 'px');
        gm.style.setProperty('--ox', (sw - 1440) / 2 + 'px');
        gm.style.top = Math.max(0, (H - 900 * k) / 2) + 'px';
        gm.style.transform = 'scale(' + k + ')';
      };
      fit();
      if (window.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(w); }
      else window.addEventListener('resize', fit);
    };
    attach();
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); };
  }, []);

  const scrCls = 'scr on' + (back ? ' b' : '') + (out ? ' out' : '');

  /* ---------- saves (strictly singleplayer worlds; server profiles are never loadable offline) ---------- */
  const singleplayerSaves = saves.filter(s => s.origin !== 'server');
  const [saveModeFilter, setSaveModeFilter] = useState<'all' | 'career' | 'freeroam'>('all');
  const [selectedSaveId, setSelectedSaveId] = useState<string>(singleplayerSaves[0]?.id || '');
  useEffect(() => {
    if (singleplayerSaves.length > 0 && (!selectedSaveId || !singleplayerSaves.some(s => s.id === selectedSaveId))) {
      setSelectedSaveId(singleplayerSaves[0].id);
    }
  }, [saves, selectedSaveId]);

  const filteredSaves = singleplayerSaves.filter(s => {
    if (saveModeFilter === 'all') return true;
    const m = s.mode || 'career';
    return m === saveModeFilter;
  });
  const careerSavesCount = singleplayerSaves.filter(s => (s.mode || 'career') === 'career').length;
  const freeroamSavesCount = singleplayerSaves.filter(s => s.mode === 'freeroam').length;

  const selectedSave = filteredSaves.find(s => s.id === selectedSaveId) || filteredSaves[0] || singleplayerSaves.find(s => s.id === selectedSaveId) || singleplayerSaves[0] || null;
  const lastSave = singleplayerSaves[0] || null;

  /* ---------- new session (career) ---------- */
  const [spawnCategory, setSpawnCategory] = useState<string>('all');
  const [spawnIndex, setSpawnIndex] = useState<number>(0);
  const [newName, setNewName] = useState<string>('Карьера: ' + SPAWN_LOCATIONS[0].nameRu.split('(')[0].trim());
  const [newTime, setNewTime] = useState<number>(12);
  const [newWeather, setNewWeather] = useState<WeatherType>('clear');
  const spawn = SPAWN_LOCATIONS[spawnIndex] || SPAWN_LOCATIONS[0];
  const visibleSpawns = SPAWN_LOCATIONS.map((loc, i) => ({ loc, i })).filter(({ loc }) => spawnCategory === 'all' || loc.category === spawnCategory);
  const pickSpawn = (i: number) => {
    setSpawnIndex(i);
    setNewName('Карьера: ' + SPAWN_LOCATIONS[i].nameRu.split('(')[0].trim());
  };

  /* ---------- online servers ---------- */
  const [serversTab, setServersTab] = useState<'all' | 'mine'>('all');
  const [servers, setServers] = useState<P2PServerRoom[]>([]);
  const [myServers, setMyServers] = useState<HostedServerBackup[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [selectedMyServerCode, setSelectedMyServerCode] = useState<string>('');
  const [confirmDeleteServerCode, setConfirmDeleteServerCode] = useState<string | null>(null);
  const [launchingSaved, setLaunchingSaved] = useState<boolean>(false);
  const [serverQuery, setServerQuery] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [onlyFree, setOnlyFree] = useState(false);
  useEffect(() => subscribeToP2PServers(setServers), []);
  useEffect(() => subscribeToHostedServers(currentUser?.uid || null, setMyServers), [currentUser?.uid]);
  const filteredServers = servers.filter(s => {
    const q = serverQuery.trim().toLowerCase();
    if (q && !(s.name.toLowerCase().includes(q) || s.hostName.toLowerCase().includes(q) || (s.peerId || '').toLowerCase().includes(q))) return false;
    if (modeFilter !== 'all' && s.gameMode !== modeFilter) return false;
    if (onlyFree && (s.currentPlayers || 1) >= (s.maxPlayers || 8)) return false;
    return true;
  });
  const filteredMyServers = myServers.filter(s => {
    const q = serverQuery.trim().toLowerCase();
    if (q && !(s.serverName.toLowerCase().includes(q) || s.roomCode.toLowerCase().includes(q))) return false;
    if (modeFilter !== 'all' && s.gameMode !== modeFilter) return false;
    return true;
  });
  const selectedServer = filteredServers.find(s => s.id === selectedServerId) || filteredServers[0] || null;
  const selectedMyServer = filteredMyServers.find(s => s.roomCode === selectedMyServerCode) || filteredMyServers[0] || null;

  const formatSavedDate = (ts?: number) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '—';
    }
  };

  const launchSavedServer = async (backup: HostedServerBackup) => {
    if (launchingSaved) return;
    setLaunchingSaved(true);
    try {
      if (onStartSavedServer) {
        await onStartSavedServer(backup);
        return;
      }
      await openHostSession({
        access: backup.access,
        roomCode: backup.roomCode,
        serverName: backup.serverName,
        mapName: backup.mapName || 'flatbody',
        gameMode: backup.gameMode,
        maxPlayers: backup.maxPlayers,
        nickname,
        trafficEnabled: backup.trafficEnabled,
        vehicleCount: backup.vehicleCount,
        pedestrianCount: backup.pedestrianCount,
        passwordRequired: backup.passwordRequired,
        savePlayerData: backup.savePlayerData,
        antiCheat: backup.antiCheat
      });
      onResume();
    } finally {
      setLaunchingSaved(false);
    }
  };

  const connectTo = (code: string, meta?: { serverName?: string; gameMode?: string }) => {
    const clean = onlineManager.sanitizeRoomCode(code);
    if (!clean) return;
    if (onJoinServer) {
      void onJoinServer({
        roomCode: clean,
        nickname,
        serverName: meta?.serverName,
        gameMode: meta?.gameMode
      });
      return;
    }
    onlineManager.joinOrCreateRoom(clean, nickname, false, meta?.serverName);
    onResume();
  };

  /* ---------- create server ---------- */
  const [hostAccess, setHostAccess] = useState<'all' | 'code'>('all');
  const [hostName, setHostName] = useState<string>('Сервер ' + onlineManager.localPlayerName);
  const [hostCode, setHostCode] = useState<string>('room-' + Math.floor(1000 + Math.random() * 9000));
  const [hostMax, setHostMax] = useState<number>(8);
  const [hostMode, setHostMode] = useState<string>('free_roam');
  const [trafficEnabled, setTrafficEnabled] = useState<boolean>(true);
  const [vehicleCount, setVehicleCount] = useState<number>(15);
  const [pedestrianCount, setPedestrianCount] = useState<number>(10);
  const [passwordRequired, setPasswordRequired] = useState<boolean>(false);
  const [savePlayerData, setSavePlayerData] = useState<boolean>(true);
  const [antiCheat, setAntiCheat] = useState<'none' | 'moderate' | 'strict'>('moderate');
  const [creating, setCreating] = useState(false);

  const regenerateHostCode = () => {
    setHostCode('room-' + Math.floor(1000 + Math.random() * 9000));
  };

  const createServer = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const clean = onlineManager.sanitizeRoomCode(hostCode);
      const serverPayload = {
        access: hostAccess,
        roomCode: clean,
        serverName: hostName.trim() || 'Сервер ' + nickname,
        nickname,
        gameMode: hostMode,
        maxPlayers: hostMax,
        trafficEnabled,
        vehicleCount,
        pedestrianCount,
        passwordRequired,
        savePlayerData,
        antiCheat
      };
      if (onCreateServer) {
        await onCreateServer(serverPayload);
        return;
      }
      await openHostSession({
        mapName: 'flatbody',
        ...serverPayload
      });
      onResume();
    } catch (err) {
      console.error('Failed to create server', err);
      const settings = {
        trafficEnabled,
        vehicleCount,
        pedestrianCount,
        passwordRequired,
        savePlayerData,
        antiCheat
      };
      onlineManager.joinOrCreateRoom(hostCode, nickname, true, hostName.trim() || 'Сервер ' + nickname, settings);
      onResume();
    } finally {
      setCreating(false);
    }
  };

  /* ---------- settings ---------- */
  type SetTab = 'gfx' | 'sound' | 'ctrl' | 'game';
  const [setTab, setSetTab] = useState<SetTab>('gfx');
  const [perf, setPerf] = useState(() => ({ ...performanceConfig }));
  const [muted, setMuted] = useState<boolean>(() => sound.getMuted());
  const [masterVol, setMasterVol] = useState<number>(() => Math.round(sound.getMasterVolume() * 100));
  const [engineVol, setEngineVol] = useState<number>(() => Math.round(sound.getEngineVolume() * 100));
  const [local, setLocal] = useState(() => ({ ...currentSettings }));
  useEffect(() => {
    setLocal({ ...currentSettings });
  }, [currentSettings]);

  const patchPerf = (patch: Partial<PerformanceConfig>) => {
    applyGfxPatch(patch);
    setPerf({ ...performanceConfig });
  };
  const resetPerf = () => {
    applyGfxPatch({ ...DEFAULT_CONFIG });
    setPerf({ ...performanceConfig });
  };
  const applyPreset = (id: GraphicsPresetId) => {
    applyGfxPreset(id);
    setPerf({ ...performanceConfig });
  };
  // Renders one entry of the shared graphics spec (see src/graphicsSettings.ts)
  const renderGfxItem = (it: GfxItem) => {
    if (it.kind === 'tg') {
      return (
        <div className="set" key={it.key}>
          <span>{it.label}</span>
          <Toggle on={!!perf[it.key]} onChange={() => patchPerf({ [it.key]: !perf[it.key] } as Partial<PerformanceConfig>)} label={it.label} />
        </div>
      );
    }
    if (it.kind === 'sld') {
      return (
        <div className="set" key={it.key}>
          <span>{it.label}</span>
          <Slider label={it.label} value={perf[it.key]} min={it.min} max={it.max} step={it.step}
            onChange={v => patchPerf({ [it.key]: v } as Partial<PerformanceConfig>)} display={it.fmt(perf[it.key])} />
        </div>
      );
    }
    return (
      <div className="set" key={it.key} style={{ height: 70 }}>
        <span>{it.label}</span>
        <Seg value={perf[it.key]} onChange={v => patchPerf({ [it.key]: v } as Partial<PerformanceConfig>)} options={it.options} />
      </div>
    );
  };
  const patchGame = (patch: Partial<typeof local>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onUpdateSettings(next);
  };

  /* ---------- account & friends ---------- */
  type AccTab = 'profile' | 'friends';
  type FriendsSubTab = 'list' | 'search' | 'requests';
  const [accTab, setAccTab] = useState<AccTab>('profile');
  const [friendsSubTab, setFriendsSubTab] = useState<FriendsSubTab>('list');
  const [nickname, setNickname] = useState<string>(onlineManager.localPlayerName);
  const [nickSaved, setNickSaved] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [friends, setFriends] = useState<FriendshipData[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<Record<string, UserProfileData>>({});
  const [incomingReqs, setIncomingReqs] = useState<FriendRequestData[]>([]);
  const [outgoingReqs, setOutgoingReqs] = useState<FriendRequestData[]>([]);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friendSearchResults, setFriendSearchResults] = useState<UserProfileData[]>([]);
  const [friendSearching, setFriendSearching] = useState(false);
  const [friendSearchSubmitted, setFriendSearchSubmitted] = useState(false);
  const [friendNotice, setFriendNotice] = useState<string | null>(null);
  const [confirmRemoveFriendId, setConfirmRemoveFriendId] = useState<string | null>(null);

  const showFriendNotice = (msg: string) => {
    setFriendNotice(msg);
    window.setTimeout(() => setFriendNotice(prev => (prev === msg ? null : prev)), 3200);
  };

  useEffect(() => {
    if (!currentUser) {
      setProfile(null);
      setFriends([]);
      setFriendProfiles({});
      setIncomingReqs([]);
      setOutgoingReqs([]);
      return;
    }
    let alive = true;
    fetchUserProfile(currentUser.uid).then(p => {
      if (!alive || !p) return;
      setProfile(p);
    }).catch(() => {});
    const unsubFriends = subscribeToFriends(currentUser.uid, list => {
      if (alive) setFriends(list);
    });
    const unsubIn = subscribeToIncomingRequests(currentUser.uid, reqs => {
      if (alive) setIncomingReqs(reqs);
    });
    const unsubOut = subscribeToOutgoingRequests(currentUser.uid, reqs => {
      if (alive) setOutgoingReqs(reqs);
    });
    return () => {
      alive = false;
      unsubFriends && unsubFriends();
      unsubIn && unsubIn();
      unsubOut && unsubOut();
    };
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser || friends.length === 0) {
      setFriendProfiles({});
      return;
    }
    let alive = true;
    const loadFriendProfiles = async () => {
      const map: Record<string, UserProfileData> = {};
      await Promise.all(
        friends.map(async f => {
          const otherUid = f.users?.find(u => u !== currentUser.uid) || (f.user1.uid === currentUser.uid ? f.user2.uid : f.user1.uid);
          if (!otherUid) return;
          const prof = await fetchUserProfile(otherUid).catch(() => null);
          if (prof) map[otherUid] = prof;
        })
      );
      if (alive) setFriendProfiles(map);
    };
    void loadFriendProfiles();
    const iv = window.setInterval(loadFriendProfiles, 20000);
    return () => {
      alive = false;
      window.clearInterval(iv);
    };
  }, [currentUser?.uid, friends]);

  const handleFriendSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = friendSearchQuery.trim();
    if (!q) return;
    setFriendSearching(true);
    setFriendSearchSubmitted(true);
    try {
      const results = await searchUsers(q);
      setFriendSearchResults(results.filter(u => u.uid !== currentUser?.uid));
    } finally {
      setFriendSearching(false);
    }
  };

  const handleSendFriendReq = async (target: UserProfileData) => {
    if (!currentUser) return;
    try {
      const senderName = nickname.trim() || currentUser.displayName || 'Пилот';
      const receiverName = target.nickname || target.displayName || 'Пилот';
      await sendFriendRequest(currentUser.uid, senderName, target.uid, receiverName);
      showFriendNotice(`Заявка в друзья отправлена игроку ${receiverName}`);
    } catch (err: any) {
      showFriendNotice(`Не удалось отправить заявку: ${err?.message || 'ошибка сети'}`);
    }
  };

  const handleAcceptFriendReq = async (req: FriendRequestData) => {
    if (!currentUser) return;
    try {
      const currentProf = profile || await fetchUserProfile(currentUser.uid);
      await acceptFriendRequest(req, currentProf);
      showFriendNotice(`${req.senderName} добавлен в ваш список друзей`);
    } catch (err: any) {
      showFriendNotice(`Ошибка принятия заявки: ${err?.message || 'ошибка сети'}`);
    }
  };

  const handleRejectFriendReq = async (reqId?: string) => {
    if (!reqId) return;
    try {
      await rejectFriendRequest(reqId);
      showFriendNotice('Заявка удалена');
    } catch (err: any) {
      showFriendNotice(`Ошибка: ${err?.message || 'ошибка сети'}`);
    }
  };

  const handleRemoveFriendItem = async (friendshipId?: string, friendName?: string) => {
    if (!friendshipId) return;
    try {
      await removeFriend(friendshipId);
      setConfirmRemoveFriendId(null);
      showFriendNotice(`${friendName || 'Игрок'} удалён из друзей`);
    } catch (err: any) {
      showFriendNotice(`Ошибка удаления: ${err?.message || 'ошибка сети'}`);
    }
  };

  const isAlreadyFriend = (uid: string) =>
    friends.some(f => (f.users && f.users.includes(uid)) || f.user1.uid === uid || f.user2.uid === uid);
  const getIncomingReqFrom = (uid: string) =>
    incomingReqs.find(r => r.senderUid === uid);
  const isOutgoingPendingTo = (uid: string) =>
    outgoingReqs.some(r => r.receiverUid === uid);

  const saveNickname = () => {
    const clean = nickname.trim();
    if (!clean) return;
    onlineManager.setPlayerName(clean);
    if (currentUser) {
      void updateUserProfile(currentUser.uid, { nickname: clean, displayName: clean });
    }
    setNickSaved(true);
    window.setTimeout(() => setNickSaved(false), 2000);
  };
  const signIn = async () => {
    if (authBusy) return;
    setAuthBusy(true); setAuthError('');
    try { await loginWithGoogle(); } catch (e: any) { setAuthError(e?.message || 'Не удалось войти'); }
    finally { setAuthBusy(false); }
  };
  const signOut = async () => {
    if (authBusy) return;
    setAuthBusy(true); setAuthError('');
    try { await logoutUser(); } catch (e: any) { setAuthError(e?.message || 'Не удалось выйти'); }
    finally { setAuthBusy(false); }
  };

  const initial = (nickname || '?').charAt(0).toUpperCase();

  /* ---------- shared chunks ---------- */
  const AccountChip = (
    <button className="chip" onClick={() => go('account')}>
      <span className="ava">{initial}</span>
      <span style={{ fontWeight: 500 }}>{nickname}</span>
    </button>
  );
  const Top = (title: string, onBack: () => void, right?: React.ReactNode) => (
    <div className="top st d0">
      <div className="row2" style={{ alignItems: 'center', gap: 16 }}>
        <button className="chip back" onClick={onBack} aria-label="Назад">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e9e6df" strokeWidth="2"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <span className="cn ttl">{title}</span>
      </div>
      {right ?? <div />}
    </div>
  );
  const Hint = (keys: [string, string][], right?: React.ReactNode, bottom?: number) => (
    <div className="hint st d8" style={bottom !== undefined ? { bottom } : undefined}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {keys.map(([k, t]) => (<React.Fragment key={k}><span className="key">{k}</span>{t}</React.Fragment>))}
      </div>
      <div>{right}</div>
    </div>
  );
  const Gear = () => (
    <Ic><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></Ic>
  );
  const switchSection = (apply: () => void) => { wipe(); apply(); };

  /* ================================================================== */
  /* render                                                              */
  /* ================================================================== */
  return (
    <>
    <ShadowHost>
      <div className="gmw" ref={wrapRef}>
        <div className={'gm p' + pos} ref={gmRef}>
          {/* scene */}
          <div className="a" style={{ inset: 0, background: 'linear-gradient(180deg,#17140f,#2b2218 58%,#120f0b)' }} />
          <div className="glow a" style={{ left: -200, top: 0, width: 'calc(var(--sw,1440px) + 400px)', height: 900, background: 'radial-gradient(900px 520px at 70% 82%,rgba(201,146,43,.42),transparent 62%)' }} />
          <svg className="lay l1" viewBox="0 0 1760 900" preserveAspectRatio="none"><path d="M0 640 180 520 330 600 520 430 700 580 880 470 1080 600 1260 500 1440 590 1600 520 1760 600V900H0Z" fill="#2a1f14" opacity=".75" /></svg>
          <svg className="lay l2" viewBox="0 0 1760 900" preserveAspectRatio="none"><path d="M0 720 220 610 420 700 640 590 860 710 1060 630 1260 720 1440 650 1600 700 1760 640V900H0Z" fill="#1a140e" /></svg>
          <svg className="lay l3" viewBox="0 0 1760 900" preserveAspectRatio="none"><path d="M0 800 300 740 620 800 980 750 1440 810 1760 770V900H0Z" fill="#0f0c09" /></svg>
          <div className="a" style={{ inset: 0, background: 'rgba(9,9,10,.5)' }} />
          <div className="a" style={{ left: 0, right: 0, top: 0, height: 140, background: 'linear-gradient(180deg,rgba(0,0,0,.5),transparent)' }} />
          <div className="wipe" ref={wipeRef} />

          <div className="col">
            {/* ============================ MAIN ============================ */}
            {cur === 'main' && (
              <section className={scrCls}>
                <div className="a" style={{ left: 'calc(var(--ox,0px)*-1)', top: 0, bottom: 0, width: 'var(--ox,0px)', background: 'rgba(9,9,10,.9)' }} />
                <div className="a" style={{ inset: 0, background: 'linear-gradient(90deg,rgba(9,9,10,.9),rgba(9,9,10,.6) 36%,transparent 70%)' }} />
                <div className="top st d0">
                  <div className="row2" style={{ alignItems: 'center', gap: 14 }}>
                    <svg width="36" height="36" viewBox="0 0 36 36"><path d="M18 2 32 10v16L18 34 4 26V10z" fill="none" stroke="#c9922b" strokeWidth="2.5" /><path d="M11 22 18 11l7 11z" fill="#c9922b" /></svg>
                    <span className="cn" style={{ fontSize: 15, fontWeight: 600 }}>Главное меню</span>
                  </div>
                  <div className="row2">{AccountChip}</div>
                </div>

                <div className="a mc-mlist" style={{ left: 64, top: 152, width: 440, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {lastSave && (
                    <button className="menu-i cn sl d1" onClick={() => onLoadSave(lastSave.id)}
                      style={{ background: 'rgba(201,146,43,.16)', borderLeftColor: '#c9922b', color: '#fff', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 2, height: 70 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span>Продолжить</span>
                        <span className={'mode-badge ' + (lastSave.mode === 'freeroam' ? 'mode-freeroam' : 'mode-career')}>
                          {lastSave.mode === 'freeroam' ? 'Freeroam' : 'Карьера'}
                        </span>
                      </div>
                      <span className="mut" style={{ font: "400 13px 'Barlow',sans-serif", textTransform: 'none', letterSpacing: 0 }}>«{lastSave.name}» — {lastSave.date}</span>
                    </button>
                  )}
                  <button className="menu-i cn sl d2" onClick={() => go('new')}
                    style={!lastSave
                      ? { background: 'rgba(201,146,43,.16)', borderLeftColor: '#c9922b', color: '#fff', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 2, height: 68 }
                      : { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 2, height: 62 }
                    }>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Ic><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></Ic>
                      <span>Карьера (Career)</span>
                    </div>
                    <span className="mut" style={{ font: "400 12px 'Barlow',sans-serif", textTransform: 'none', letterSpacing: 0, paddingLeft: 36 }}>Трафик, пешеходы, погода, экономика</span>
                  </button>
                  <button className="menu-i cn sl d3" onClick={() => go('freeroam_map')} style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 2, height: 62 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Ic><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" /></Ic>
                      <span>Свободная езда (Freeroam)</span>
                    </div>
                    <span className="mut" style={{ font: "400 12px 'Barlow',sans-serif", textTransform: 'none', letterSpacing: 0, paddingLeft: 36 }}>Выбор машины, без трафика и пешеходов</span>
                  </button>
                  <button className="menu-i cn sl d4" onClick={() => go('saves')}><Ic><path d="M4 7h16M4 12h16M4 17h10" /></Ic>Загрузить сессию</button>
                  <button className="menu-i cn sl d5" onClick={() => go('servers')}><Ic><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16" /></Ic>Онлайн</button>
                  <button className="menu-i cn sl d6" onClick={() => go('account')}><Ic><circle cx="12" cy="9" r="4" /><path d="M4 20c1-4 4-6 8-6s7 2 8 6" /></Ic>Аккаунт</button>
                  <button className="menu-i cn sl d7" onClick={() => go('settings')}><Gear />Настройки</button>
                </div>

                <div className="panel a st d3 mc-mpanel" style={{ left: 880, top: 156, width: 496, padding: 14 }}>
                  <div className={'th ' + thumbAt(lastSave?.mode === 'freeroam' ? 5 : 0)} style={{ height: 230, borderRadius: 10 }} />
                  <div style={{ padding: '16px 8px 6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div className="cn mut" style={{ fontSize: 13 }}>{lastSave ? 'Последняя сессия' : 'Режимы симулятора'}</div>
                      {lastSave && (
                        <span className={'mode-badge ' + (lastSave.mode === 'freeroam' ? 'mode-freeroam' : 'mode-career')}>
                          {lastSave.mode === 'freeroam' ? 'Freeroam' : 'Карьера'}
                        </span>
                      )}
                    </div>
                    <div className="cn" style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{lastSave ? lastSave.name : 'flatbody'}</div>
                    <div className="mut" style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: 13 }}>
                      {lastSave ? (
                        <>
                          <span>Локация: {lastSave.streetName || 'flatbody'}</span>
                          <span>{lastSave.isInVehicle ? 'В автомобиле' : 'Пешком'}</span>
                          {lastSave.cash !== undefined && <span>{lastSave.cash.toLocaleString('ru-RU')} ₽</span>}
                        </>
                      ) : (
                        <span>Выберите режим игры или загрузите сохранение</span>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
                      <button className="btn btn-p" onClick={() => (lastSave ? onLoadSave(lastSave.id) : go('freeroam_map'))}>
                        <PlayIcon />{lastSave ? 'Продолжить' : 'Freeroam'}
                      </button>
                      <button className="btn btn-s" onClick={() => go(lastSave ? 'freeroam_map' : 'new')}>
                        {lastSave ? 'Свободная езда' : 'Карьера'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* =========================== ACCOUNT =========================== */}
            {cur === 'account' && (
              <section className={scrCls}>
                {Top('Аккаунт', () => go('main', true), <div className="chip"><span className="ava">{initial}</span><span style={{ fontWeight: 500 }}>{nickname}</span></div>)}
                <div className="a mc-nav" style={{ left: 64, top: 140, width: 290, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button className={'nav-i cn sl d1' + (accTab === 'profile' ? ' nav-on' : '')} onClick={() => switchSection(() => setAccTab('profile'))}>Профиль</button>
                  <button className={'nav-i cn sl d2' + (accTab === 'friends' ? ' nav-on' : '')} onClick={() => switchSection(() => setAccTab('friends'))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Друзья</span>
                    {incomingReqs.length > 0 && (
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#e0ab45', color: '#1a1409' }}>
                        +{incomingReqs.length}
                      </span>
                    )}
                  </button>
                </div>

                {accTab === 'profile' && (
                  <div className="a sec mc-content" key="acc-profile" style={{ left: 394, top: 140, width: 982, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="panel st d1" style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '26px 30px' }}>
                      <div style={{ width: 104, height: 104, borderRadius: '50%', background: 'linear-gradient(135deg,#e0ab45,#a8741c)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: "700 52px 'Barlow Condensed',sans-serif", color: '#1a1409' }}>{initial}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="cn" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.05, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nickname}</div>
                        <div className="mut" style={{ marginTop: 6 }}>{currentUser ? 'Связано: ' + (currentUser.email || currentUser.displayName || 'аккаунт Google') : 'Гостевой профиль (P2P)'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 14 }}><span className="dot" style={{ background: '#7fbf6a' }} />В главном меню</div>
                      </div>
                      {currentUser
                        ? <button className="btn btn-s" onClick={signOut} disabled={authBusy}>Выйти из аккаунта</button>
                        : <button className="btn btn-p" onClick={signIn} disabled={authBusy}>{authBusy ? 'Вход...' : 'Войти через Google'}</button>}
                    </div>
                    {authError && (
                      <div className="panel st" style={{ padding: '16px 20px', borderColor: 'rgba(224,171,69,.4)', background: 'rgba(224,171,69,.06)', marginTop: -6 }}>
                        <div style={{ color: '#e0ab45', fontWeight: 600, fontSize: 14 }}>{authError}</div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 20 }}>
                      <div className="panel st d3" style={{ flex: 1.15, padding: '22px 24px' }}>
                        <div className="cn" style={{ fontSize: 20, fontWeight: 700 }}>Позывной</div>
                        <div className="lbl" style={{ marginTop: 16 }}>Имя, под которым вас видят в онлайне и по которому вас находят друзья</div>
                        <input className="inp" value={nickname} maxLength={20} onChange={e => setNickname(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveNickname(); e.stopPropagation(); }} />
                        <button className="btn btn-p" style={{ marginTop: 16 }} onClick={saveNickname} disabled={!nickname.trim()}>Сохранить</button>
                        {nickSaved && <div className="ok">Позывной сохранён</div>}
                      </div>
                      <div className="panel st d4" style={{ flex: 1, padding: '22px 24px' }}>
                        <div className="cn" style={{ fontSize: 20, fontWeight: 700 }}>Статистика</div>
                        {currentUser ? (
                          <div style={{ marginTop: 12 }}>
                            <div className="stat-row"><span className="mut">Сессий сыграно</span><span className="stat-n" style={{ fontSize: 30 }}>{profile?.stats?.gamesPlayed ?? 0}</span></div>
                            <div className="stat-row"><span className="mut">Пройдено, км</span><span className="stat-n" style={{ fontSize: 30 }}>{Math.round(profile?.stats?.distanceDriven ?? 0)}</span></div>
                            <div className="stat-row"><span className="mut">Заработано, ₽</span><span className="stat-n" style={{ fontSize: 30 }}>{Math.round(profile?.stats?.moneyEarned ?? 0).toLocaleString('ru-RU')}</span></div>
                          </div>
                        ) : (
                          <div className="mut" style={{ marginTop: 16, fontSize: 14, lineHeight: 1.5 }}>Войдите через Google, чтобы видеть статистику и список друзей.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {accTab === 'friends' && (
                  <div className="a sec mc-content" key="acc-friends" style={{ left: 394, top: 140, width: 982, maxHeight: 688 }}>
                    <div className="panel st d1" style={{ padding: '20px 24px', maxHeight: 688, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, flex: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                          <span className="cn" style={{ fontSize: 22, fontWeight: 700 }}>Друзья</span>
                          {currentUser && <span className="mut" style={{ fontSize: 13 }}>{friends.length} в списке</span>}
                        </div>
                        {currentUser && (
                          <div className="row2" style={{ gap: 8 }}>
                            <button
                              type="button"
                              className={'pill' + (friendsSubTab === 'list' ? ' pill-on' : '')}
                              onClick={() => { setFriendsSubTab('list'); setConfirmRemoveFriendId(null); }}
                            >
                              Мои друзья ({friends.length})
                            </button>
                            <button
                              type="button"
                              className={'pill' + (friendsSubTab === 'search' ? ' pill-on' : '')}
                              onClick={() => setFriendsSubTab('search')}
                            >
                              Поиск игроков
                            </button>
                            <button
                              type="button"
                              className={'pill' + (friendsSubTab === 'requests' ? ' pill-on' : '')}
                              onClick={() => setFriendsSubTab('requests')}
                            >
                              Заявки{incomingReqs.length > 0 ? ` (+${incomingReqs.length})` : outgoingReqs.length > 0 ? ` (${outgoingReqs.length})` : ''}
                            </button>
                          </div>
                        )}
                      </div>

                      {friendNotice && (
                        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(224,171,69,.12)', border: '1px solid rgba(224,171,69,.32)', color: '#e6c278', fontSize: 13, fontWeight: 500, flex: 'none' }}>
                          {friendNotice}
                        </div>
                      )}

                      {!currentUser ? (
                        <div className="empty">
                          <div className="mut">Войдите через Google, чтобы искать игроков, отправлять заявки и видеть друзей в сети.</div>
                          <button className="btn btn-p" onClick={signIn} disabled={authBusy}>Войти через Google</button>
                        </div>
                      ) : friendsSubTab === 'list' ? (
                        friends.length === 0 ? (
                          <div className="empty">
                            <div className="cn" style={{ fontSize: 22, fontWeight: 700 }}>Список друзей пуст</div>
                            <div className="mut" style={{ maxWidth: 420 }}>Найдите игроков по позывному, имени или UID во вкладке «Поиск игроков» и отправьте заявку в друзья.</div>
                            <div className="row2" style={{ gap: 10 }}>
                              <button className="btn btn-p" onClick={() => setFriendsSubTab('search')}>Найти игроков</button>
                              {incomingReqs.length > 0 && (
                                <button className="btn btn-s" onClick={() => setFriendsSubTab('requests')}>Входящие заявки ({incomingReqs.length})</button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="scroll" style={{ flex: 1, minHeight: 0 }}>
                            {friends.map((f, i) => {
                              const other = f.user1.uid === currentUser.uid ? f.user2 : f.user1;
                              const otherUid = f.users?.find(u => u !== currentUser.uid) || other.uid;
                              const fProf = friendProfiles[otherUid];
                              const name = fProf?.nickname || fProf?.displayName || other.nickname || other.name || 'Игрок';
                              const status = fProf?.status || 'offline';
                              const isOnline = status === 'online' || status === 'in_game';
                              const isInGame = status === 'in_game' && !!fProf?.currentRoomCode;
                              return (
                                <div className="fr" key={f.id || i} style={i === friends.length - 1 ? { borderBottom: 0 } : undefined}>
                                  <span className="av" style={{ background: isInGame ? '#e0ab45' : isOnline ? '#7fbf6a' : '#575248', color: '#1a1409' }}>
                                    {name.charAt(0).toUpperCase()}
                                  </span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                                    <div className="mut" style={{ fontSize: 12.5, color: isInGame ? '#e0ab45' : isOnline ? '#9ac985' : undefined }}>
                                      {isInGame ? `В игре · комната ${fProf.currentRoomCode}` : isOnline ? 'В сети' : 'Не в сети'}
                                    </div>
                                  </div>
                                  <div className="row2" style={{ gap: 8 }}>
                                    {isInGame && fProf?.currentRoomCode && (
                                      <button
                                        type="button"
                                        className="btn btn-p btn-sm"
                                        onClick={() => connectTo(fProf.currentRoomCode!)}
                                      >
                                        Присоединиться
                                      </button>
                                    )}
                                    {confirmRemoveFriendId === f.id ? (
                                      <button
                                        type="button"
                                        className="btn btn-s btn-sm"
                                        style={{ color: '#e08a70', borderColor: 'rgba(217,116,90,.4)' }}
                                        onClick={() => void handleRemoveFriendItem(f.id, name)}
                                      >
                                        Точно удалить?
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="btn btn-s btn-sm"
                                        onClick={() => setConfirmRemoveFriendId(f.id || null)}
                                      >
                                        Удалить
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )
                      ) : friendsSubTab === 'search' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minHeight: 0 }}>
                          <form onSubmit={handleFriendSearch} className="row2" style={{ gap: 10, flex: 'none' }}>
                            <div className="chip" style={{ flex: 1, height: 46, borderRadius: 9 }}>
                              <SearchIcon />
                              <input
                                value={friendSearchQuery}
                                onChange={e => setFriendSearchQuery(e.target.value)}
                                onKeyDown={e => e.stopPropagation()}
                                placeholder="Введите позывной, имя или UID игрока..."
                                style={{ width: '100%', fontSize: 15 }}
                              />
                            </div>
                            <button type="submit" className="btn btn-p" disabled={friendSearching || !friendSearchQuery.trim()}>
                              {friendSearching ? 'Поиск...' : 'Найти'}
                            </button>
                          </form>

                          {friendSearchResults.length > 0 ? (
                            <div className="scroll" style={{ flex: 1, minHeight: 0 }}>
                              {friendSearchResults.map((user, idx) => {
                                const name = user.nickname || user.displayName || 'Игрок';
                                const already = isAlreadyFriend(user.uid);
                                const incReq = getIncomingReqFrom(user.uid);
                                const pendingOut = isOutgoingPendingTo(user.uid);
                                return (
                                  <div className="fr" key={user.uid} style={idx === friendSearchResults.length - 1 ? { borderBottom: 0 } : undefined}>
                                    <span className="av" style={{ background: '#e0ab45', color: '#1a1409' }}>{name.charAt(0).toUpperCase()}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                                      <div className="mut" style={{ fontSize: 12.5 }}>
                                        Позывной: {user.nickname || user.displayName || '—'}
                                        {user.status === 'in_game' && user.currentRoomCode ? ` · В игре (${user.currentRoomCode})` : user.status === 'online' ? ' · В сети' : ''}
                                      </div>
                                    </div>
                                    <div className="row2" style={{ gap: 8 }}>
                                      {already ? (
                                        <span className="pill pill-on" style={{ height: 34, fontSize: 13 }}>В друзьях</span>
                                      ) : incReq ? (
                                        <button type="button" className="btn btn-p btn-sm" onClick={() => void handleAcceptFriendReq(incReq)}>
                                          Принять заявку
                                        </button>
                                      ) : pendingOut ? (
                                        <span className="pill" style={{ height: 34, fontSize: 13 }}>Заявка отправлена</span>
                                      ) : (
                                        <button type="button" className="btn btn-p btn-sm" onClick={() => void handleSendFriendReq(user)}>
                                          Добавить в друзья
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="empty" style={{ flex: 1 }}>
                              <div className="mut">
                                {friendSearching
                                  ? 'Поиск игроков в базе данных...'
                                  : friendSearchSubmitted && friendSearchQuery.trim()
                                    ? `Игроков по запросу «${friendSearchQuery.trim()}» не найдено.`
                                    : 'Введите позывной или имя игрока сверху и нажмите «Найти».'}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="scroll" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                              <span className="cn" style={{ fontSize: 15, fontWeight: 700, color: '#e0ab45', textTransform: 'uppercase' }}>Входящие заявки</span>
                              <span className="mut" style={{ fontSize: 12.5 }}>{incomingReqs.length}</span>
                            </div>
                            {incomingReqs.length === 0 ? (
                              <div className="mut" style={{ fontSize: 13.5, padding: '10px 0' }}>Новых входящих заявок нет.</div>
                            ) : (
                              incomingReqs.map((req, idx) => (
                                <div className="fr" key={req.id || idx}>
                                  <span className="av" style={{ background: '#e0ab45', color: '#1a1409' }}>{(req.senderName || '?').charAt(0).toUpperCase()}</span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600 }}>{req.senderName}</div>
                                    <div className="mut" style={{ fontSize: 12.5 }}>Хочет добавить вас в друзья</div>
                                  </div>
                                  <div className="row2" style={{ gap: 8 }}>
                                    <button type="button" className="btn btn-p btn-sm" onClick={() => void handleAcceptFriendReq(req)}>Принять</button>
                                    <button type="button" className="btn btn-s btn-sm" onClick={() => void handleRejectFriendReq(req.id)}>Отклонить</button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                              <span className="cn" style={{ fontSize: 15, fontWeight: 700, color: '#a29e93', textTransform: 'uppercase' }}>Исходящие заявки</span>
                              <span className="mut" style={{ fontSize: 12.5 }}>{outgoingReqs.length}</span>
                            </div>
                            {outgoingReqs.length === 0 ? (
                              <div className="mut" style={{ fontSize: 13.5, padding: '10px 0' }}>Нет отправленных заявок, ожидающих ответа.</div>
                            ) : (
                              outgoingReqs.map((req, idx) => (
                                <div className="fr" key={req.id || idx} style={idx === outgoingReqs.length - 1 ? { borderBottom: 0 } : undefined}>
                                  <span className="av" style={{ background: '#575248', color: '#e9e6df' }}>{(req.receiverName || '?').charAt(0).toUpperCase()}</span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600 }}>{req.receiverName}</div>
                                    <div className="mut" style={{ fontSize: 12.5 }}>Ожидает подтверждения</div>
                                  </div>
                                  <button type="button" className="btn btn-s btn-sm" onClick={() => void handleRejectFriendReq(req.id)}>Отменить</button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {Hint([['Esc', 'Назад']])}
              </section>
            )}

            {/* =========================== SERVERS =========================== */}
            {cur === 'servers' && (
              <section className={scrCls}>
                {Top('Онлайн', () => go('main', true), (
                  <div className="row2">
                    <button className="chip" onClick={() => go('create')}><Ic s={18} c="#e0ab45"><path d="M12 5v14M5 12h14" /></Ic>Создать сервер</button>
                    {AccountChip}
                  </div>
                ))}
                <div className="tabs st d1">
                  <div className="row2" style={{ gap: 18 }}>
                    <button
                      type="button"
                      className={'tab cn' + (serversTab === 'all' ? ' tab-on' : '')}
                      onClick={() => setServersTab('all')}
                    >
                      Все серверы
                    </button>
                    <button
                      type="button"
                      className={'tab cn' + (serversTab === 'mine' ? ' tab-on' : '')}
                      onClick={() => { setServersTab('mine'); setConfirmDeleteServerCode(null); }}
                    >
                      Мои серверы{myServers.length > 0 ? ` (${myServers.length})` : ''}
                    </button>
                  </div>
                  <div className="row2" style={{ paddingBottom: 8 }}>
                    <div className="chip" style={{ width: 300, height: 40 }}>
                      <SearchIcon />
                      <input value={serverQuery} onChange={e => setServerQuery(e.target.value)} onKeyDown={e => e.stopPropagation()} placeholder={serversTab === 'mine' ? 'Поиск среди моих серверов' : 'Поиск по названию или хосту'} />
                    </div>
                    <div className="chip" style={{ width: 250, height: 40 }}>
                      <input value={roomCode} onChange={e => setRoomCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') connectTo(roomCode); e.stopPropagation(); }} placeholder="Код комнаты" style={{ fontFamily: 'ui-monospace,monospace' }} />
                      <button onClick={() => connectTo(roomCode)} disabled={!roomCode.trim()} className="cn" style={{ color: '#e0ab45', fontWeight: 600, fontSize: 14 }}>Войти</button>
                    </div>
                  </div>
                </div>
                <div className="a st d2 mc-pills" style={{ left: 64, top: 180, display: 'flex', gap: 10 }}>
                  <button className={'pill' + (modeFilter === 'all' ? ' pill-on' : '')} onClick={() => setModeFilter('all')}>Все режимы</button>
                  {Object.keys(MODE_NAME).map(m => (
                    <button key={m} className={'pill' + (modeFilter === m ? ' pill-on' : '')} onClick={() => setModeFilter(m)}>{MODE_NAME[m]}</button>
                  ))}
                  {serversTab === 'all' && (
                    <button className={'pill' + (onlyFree ? ' pill-on' : '')} onClick={() => setOnlyFree(v => !v)}>Есть места</button>
                  )}
                </div>

                {serversTab === 'all' ? (
                  <>
                    <div className="panel a st d2 mc-list" style={{ left: 64, top: 226, width: 850, height: 602, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <div className="row hd cn" style={{ borderBottom: '1px solid rgba(255,255,255,.08)', flex: 'none' }}><span /><span>Название</span><span>Режим</span><span>Игроки</span></div>
                      <div className="scroll" style={{ flex: 1 }}>
                        {filteredServers.length === 0 ? (
                          <div className="empty" style={{ height: '100%' }}>
                            <div className="cn" style={{ fontSize: 22, fontWeight: 700 }}>Нет открытых серверов</div>
                            <div className="mut" style={{ fontSize: 14, maxWidth: 380 }}>Создайте свой сервер, запустите сохранённый во вкладке «Мои серверы» или подключитесь по коду комнаты.</div>
                            <div className="row2" style={{ gap: 10 }}>
                              <button className="btn btn-p" onClick={() => go('create')}>Создать сервер</button>
                              {myServers.length > 0 && (
                                <button className="btn btn-s" onClick={() => setServersTab('mine')}>Мои серверы ({myServers.length})</button>
                              )}
                            </div>
                          </div>
                        ) : filteredServers.map(s => {
                          const cp = s.currentPlayers || 1, mp = s.maxPlayers || 8;
                          return (
                            <button key={s.id} className={'row rw' + (selectedServer?.id === s.id ? ' row-on' : '')} onClick={() => setSelectedServerId(s.id || '')} onDoubleClick={() => connectTo(s.peerId, { serverName: s.name, gameMode: s.gameMode })}>
                              <span className="rowdot"><span className="dot" style={{ background: s.status === 'active' ? '#7fbf6a' : '#e0ab45' }} /></span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                                  {s.hasPassword && (
                                    <span style={{ fontSize: 11, fontWeight: 600, color: '#e0ab45', background: 'rgba(224,171,69,.14)', border: '1px solid rgba(224,171,69,.28)', borderRadius: 6, padding: '1px 6px', flex: 'none' }}>
                                      Защита ников
                                    </span>
                                  )}
                                </div>
                                <div className="mut" style={{ fontSize: 12 }}>Хост: {s.hostName}</div>
                              </div>
                              <span>{modeName(s.gameMode)}</span>
                              <span className={fillClass(cp, mp)}>{cp} / {mp}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="panel a st d4 mc-side2" style={{ left: 938, top: 226, width: 438, height: 602, padding: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      {selectedServer ? (
                        <>
                          <div className={'th ' + (MODE_THUMB[selectedServer.gameMode] || 'm5')} style={{ height: 124, borderRadius: 10, flex: 'none' }} />
                          <div style={{ padding: '12px 8px 0', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                            <div className="cn mut" style={{ fontSize: 12 }}>Выбранный сервер</div>
                            <div className="cn mc-name" style={{ fontSize: 24, fontWeight: 700, marginTop: 2, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedServer.name}</div>
                            <div className="mut mc-desc" style={{ marginTop: 6, fontSize: 13, lineHeight: 1.38 }}>
                              {selectedServer.hasPassword
                                ? 'Включена защита ников: при первом входе нужно придумать личный пароль.'
                                : 'Отдельный мир сервера: прогресс изолирован от одиночных сохранений и синхронизируется с хостом.'}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: 12, fontSize: 13 }}>
                              <div><div className="mut" style={{ fontSize: 11 }}>Хост</div>{selectedServer.hostName}</div>
                              <div><div className="mut" style={{ fontSize: 11 }}>Код комнаты</div>{selectedServer.peerId}</div>
                              <div><div className="mut" style={{ fontSize: 11 }}>Карта</div>{selectedServer.mapName || 'flatbody'}</div>
                              <div><div className="mut" style={{ fontSize: 11 }}>Режим</div>{modeName(selectedServer.gameMode)}</div>
                              <div><div className="mut" style={{ fontSize: 11 }}>Аккаунты</div>{selectedServer.hasPassword ? 'Пароль на ник' : 'Свободный вход'}</div>
                              <div><div className="mut" style={{ fontSize: 11 }}>Сохранения</div>{selectedServer.savePlayerData === false ? 'Отключены' : 'Включены'}</div>
                            </div>
                            <div style={{ marginTop: 12 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}><span className="mut">Игроки</span><span>{selectedServer.currentPlayers || 1} / {selectedServer.maxPlayers || 8}</span></div>
                              <div className="bar"><i style={{ width: Math.round(((selectedServer.currentPlayers || 1) / (selectedServer.maxPlayers || 8)) * 100) + '%' }} /></div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 12, padding: '8px 8px 2px', flex: 'none' }}>
                            <button className="btn btn-p" style={{ flex: 1 }} onClick={() => connectTo(selectedServer.peerId, { serverName: selectedServer.name, gameMode: selectedServer.gameMode })}>Подключиться</button>
                          </div>
                        </>
                      ) : (
                        <div className="empty" style={{ flex: 1 }}><div className="cn" style={{ fontSize: 22, fontWeight: 700 }}>Выберите сервер</div><div className="mut" style={{ fontSize: 14 }}>Подробности появятся здесь.</div></div>
                      )}
                    </div>
                    {Hint([['Esc', 'Назад']], 'Найдено серверов: ' + filteredServers.length)}
                  </>
                ) : (
                  <>
                    <div className="panel a st d2 mc-list" style={{ left: 64, top: 226, width: 850, height: 602, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      {!currentUser && (
                        <div style={{ padding: '10px 18px', background: 'rgba(224,171,69,.1)', borderBottom: '1px solid rgba(224,171,69,.22)', color: '#e6c278', fontSize: 13 }}>
                          Войдите в Google-аккаунт, чтобы серверы, пароли и баны синхронизировались с облачной базой данных (сейчас используется локальное хранилище).
                        </div>
                      )}
                      <div className="row hd cn" style={{ borderBottom: '1px solid rgba(255,255,255,.08)', flex: 'none' }}><span /><span>Сохранённый сервер</span><span>Режим</span><span>Данные</span></div>
                      <div className="scroll" style={{ flex: 1 }}>
                        {filteredMyServers.length === 0 ? (
                          <div className="empty" style={{ height: '100%' }}>
                            <div className="cn" style={{ fontSize: 22, fontWeight: 700 }}>Нет сохранённых серверов</div>
                            <div className="mut" style={{ fontSize: 14, maxWidth: 420 }}>Создайте сервер — при остановке он автоматически сохранится в БД вместе с миром, аккаунтами, паролями, банами и сохранениями игроков.</div>
                            <button className="btn btn-p" onClick={() => go('create')}>Создать сервер</button>
                          </div>
                        ) : filteredMyServers.map(s => {
                          const accCount = s.accountsCount ?? Object.keys(s.accounts || {}).length;
                          const banCount = s.bansCount ?? Object.keys(s.bans || {}).length;
                          return (
                            <button
                              key={s.id || s.roomCode}
                              className={'row rw' + (selectedMyServer?.roomCode === s.roomCode ? ' row-on' : '')}
                              onClick={() => { setSelectedMyServerCode(s.roomCode); setConfirmDeleteServerCode(null); }}
                              onDoubleClick={() => void launchSavedServer(s)}
                            >
                              <span className="rowdot"><span className="dot" style={{ background: s.storageSource === 'cloud' ? '#7fbf6a' : '#e0ab45' }} /></span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.serverName}</span>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: s.access === 'code' ? '#b8b4aa' : '#9ac985', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 6, padding: '1px 6px', flex: 'none' }}>
                                    {s.access === 'code' ? 'По коду' : 'Публичный'}
                                  </span>
                                  {s.passwordRequired && (
                                    <span style={{ fontSize: 11, fontWeight: 600, color: '#e0ab45', background: 'rgba(224,171,69,.14)', border: '1px solid rgba(224,171,69,.28)', borderRadius: 6, padding: '1px 6px', flex: 'none' }}>
                                      Пароли
                                    </span>
                                  )}
                                </div>
                                <div className="mut" style={{ fontSize: 12 }}>
                                  Код: {s.roomCode} · {s.storageSource === 'cloud' ? 'Облачная БД' : 'Локально'} · {formatSavedDate(s.lastSavedAt)}
                                </div>
                              </div>
                              <span>{modeName(s.gameMode)}</span>
                              <span className="mut" style={{ fontSize: 12 }}>{accCount} акк · {banCount} бан</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="panel a st d4 mc-side2" style={{ left: 938, top: 226, width: 438, height: 602, padding: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      {selectedMyServer ? (
                        <>
                          <div className={'th ' + (MODE_THUMB[selectedMyServer.gameMode] || 'm5')} style={{ height: 114, borderRadius: 10, flex: 'none' }} />
                          <div style={{ padding: '12px 8px 0', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                            <div className="cn mut" style={{ fontSize: 12 }}>
                              Ваш сервер · {selectedMyServer.storageSource === 'cloud' ? 'Сохранён в БД' : 'Локальная копия'}
                            </div>
                            <div className="cn mc-name" style={{ fontSize: 23, fontWeight: 700, marginTop: 2, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedMyServer.serverName}</div>
                            <div className="mut mc-desc" style={{ marginTop: 6, fontSize: 12.5, lineHeight: 1.35 }}>
                              При запуске восстановятся мир хоста, зарегистрированные аккаунты, список банов и профили игроков.
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px', marginTop: 12, fontSize: 12.5 }}>
                              <div><div className="mut" style={{ fontSize: 11 }}>Код комнаты</div><span style={{ fontFamily: 'ui-monospace,monospace' }}>{selectedMyServer.roomCode}</span></div>
                              <div><div className="mut" style={{ fontSize: 11 }}>Доступ</div>{selectedMyServer.access === 'code' ? 'Только по коду' : 'Публичный'}</div>
                              <div><div className="mut" style={{ fontSize: 11 }}>Режим</div>{modeName(selectedMyServer.gameMode)}</div>
                              <div><div className="mut" style={{ fontSize: 11 }}>Защита ников</div>{selectedMyServer.passwordRequired ? 'Включена' : 'Отключена'}</div>
                              <div><div className="mut" style={{ fontSize: 11 }}>Аккаунтов / Профилей</div>{selectedMyServer.accountsCount ?? Object.keys(selectedMyServer.accounts || {}).length} / {selectedMyServer.savedPlayersCount ?? Object.keys(selectedMyServer.playerSaves || {}).length}</div>
                              <div><div className="mut" style={{ fontSize: 11 }}>Банов</div>{selectedMyServer.bansCount ?? Object.keys(selectedMyServer.bans || {}).length}</div>
                            </div>
                            <div className="mut" style={{ fontSize: 11.5, marginTop: 10 }}>
                              Сохранено: {formatSavedDate(selectedMyServer.lastSavedAt)}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 10, padding: '8px 8px 2px', flex: 'none' }}>
                            <button
                              className="btn btn-p"
                              style={{ flex: 1 }}
                              disabled={launchingSaved}
                              onClick={() => void launchSavedServer(selectedMyServer)}
                            >
                              {launchingSaved ? 'Запуск...' : 'Включить сервер'}
                            </button>
                            {confirmDeleteServerCode === selectedMyServer.roomCode ? (
                              <button
                                className="btn btn-s"
                                style={{ color: '#e08a70', borderColor: 'rgba(217,116,90,.4)' }}
                                onClick={async () => {
                                  await deleteHostedServerBackup(selectedMyServer.id, selectedMyServer.roomCode);
                                  setConfirmDeleteServerCode(null);
                                }}
                              >
                                Точно удалить?
                              </button>
                            ) : (
                              <button
                                className="btn btn-s"
                                onClick={() => setConfirmDeleteServerCode(selectedMyServer.roomCode)}
                              >
                                Удалить
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="empty" style={{ flex: 1 }}>
                          <div className="cn" style={{ fontSize: 22, fontWeight: 700 }}>Мои серверы</div>
                          <div className="mut" style={{ fontSize: 14 }}>Выберите сохранённый сервер слева, чтобы включить его снова.</div>
                        </div>
                      )}
                    </div>
                    {Hint([['Esc', 'Назад']], 'Сохранённых серверов: ' + filteredMyServers.length)}
                  </>
                )}
              </section>
            )}

            {/* =========================== SETTINGS =========================== */}
            {cur === 'settings' && (
              <section className={scrCls}>
                {Top('Настройки', () => go('main', true))}
                <div className="a mc-nav" style={{ left: 64, top: 128, width: 260, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {([['gfx', 'Графика'], ['sound', 'Звук'], ['ctrl', 'Управление'], ['game', 'Геймплей']] as [SetTab, string][]).map(([id, label], i) => (
                    <button key={id} className={'nav-i cn sl d' + (i + 1) + (setTab === id ? ' nav-on' : '')} onClick={() => switchSection(() => setSetTab(id))}>{label}</button>
                  ))}
                </div>

                <div className={'panel a sec st d2 mc-content mc-has-aside' + (setTab === 'gfx' || setTab === 'ctrl' ? ' scroll' : '')} key={'panel-' + setTab} style={{ left: 350, top: 128, width: 700, maxHeight: 700 }}>
                  {setTab === 'gfx' && (
                    <>
                      <div className="grp cn" style={{ paddingTop: 18 }}>Пресет</div>
                      <div className="set" style={{ height: 70 }}>
                        <span>Быстрая настройка</span>
                        <Seg value={detectGraphicsPreset(perf)} onChange={v => applyPreset(v as GraphicsPresetId)} options={GFX_PRESET_OPTIONS} />
                      </div>
                      <div className="set" style={{ height: 70 }}>
                        <span>Лимит кадров</span>
                        <Seg value={local.fpsLimit} onChange={v => patchGame({ fpsLimit: v })} options={[{ v: 30, label: '30' }, { v: 60, label: '60' }, { v: 120, label: '120' }, { v: 0, label: 'Max' }]} />
                      </div>
                      {GFX_GROUPS.map(g => (
                        <React.Fragment key={g.title}>
                          <div className="grp cn">{g.title}</div>
                          {g.items.map(renderGfxItem)}
                        </React.Fragment>
                      ))}
                    </>
                  )}
                  {setTab === 'sound' && (
                    <>
                      <div className="grp cn" style={{ paddingTop: 18 }}>Громкость</div>
                      <div className="set"><span>Звук включён</span><Toggle on={!muted} onChange={() => setMuted(sound.toggleMute())} label="Звук" /></div>
                      <div className="set"><span>Общая громкость</span><Slider label="Общая громкость" value={masterVol} min={0} max={100} step={1} onChange={v => { setMasterVol(v); sound.setMasterVolume(v / 100); }} display={masterVol + '%'} /></div>
                      <div className="set"><span>Двигатель</span><Slider label="Громкость двигателя" value={engineVol} min={0} max={100} step={1} onChange={v => { setEngineVol(v); sound.setEngineVolume(v / 100); }} display={engineVol + '%'} /></div>
                    </>
                  )}
                  {setTab === 'ctrl' && (
                    <>
                      <div className="grp cn" style={{ paddingTop: 18 }}>Мышь</div>
                      <div className="set"><span>Чувствительность мыши</span><Slider label="Чувствительность мыши" value={local.mouseSensitivity} min={0.5} max={2.5} step={0.1} onChange={v => patchGame({ mouseSensitivity: v })} display={local.mouseSensitivity.toFixed(1) + '×'} /></div>
                      {keybindNotice && <div className="kb-note">{keybindNotice}</div>}
                      {KEYBIND_GROUPS.map(g => {
                        const items = KEYBIND_DEFINITIONS.filter(d => d.group === g.id);
                        return (
                          <React.Fragment key={g.id}>
                            <div className="grp cn">{g.title}</div>
                            {items.map(def => {
                              const code = keybinds[def.id];
                              const isListening = listeningAction === def.id;
                              const isCustom = code !== DEFAULT_KEYBINDS[def.id];
                              return (
                                <div className={'set' + (isListening ? ' set-on' : '')} key={def.id} title={def.hint || undefined}>
                                  <span>{def.label}</span>
                                  <span className="kv" style={{ alignItems: 'center' }}>
                                    {isCustom && !isListening && (
                                      <button
                                        type="button"
                                        className="key-reset"
                                        title={`Сбросить на ${formatKeyCode(DEFAULT_KEYBINDS[def.id])}`}
                                        onClick={() => { resetKeybind(def.id); setKeybindNotice(null); }}
                                      >
                                        Сброс
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className={'key key-bind' + (isListening ? ' key-listening' : '')}
                                      onClick={() => {
                                        setKeybindNotice(null);
                                        setListeningAction(prev => (prev === def.id ? null : def.id));
                                      }}
                                    >
                                      {isListening ? 'Нажмите клавишу…' : formatKeyCode(code)}
                                    </button>
                                  </span>
                                </div>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                      <div className="set">
                        <span>Меню паузы / Закрыть окно</span>
                        <span className="kv"><span className="key">Esc</span></span>
                      </div>
                    </>
                  )}
                  {setTab === 'game' && (
                    <>
                      <div className="grp cn" style={{ paddingTop: 18 }}>Геймплей</div>
                      <div className="set" style={{ height: 70 }}>
                        <span>КПП (переключения)</span>
                        <Seg value={local.shiftMode ?? 'auto'} onChange={v => patchGame({ shiftMode: v })} options={[{ v: 'manual', label: 'Ручная' }, { v: 'auto', label: 'Авто (сама)' }]} />
                      </div>
                      <div className="set" style={{ height: 70 }}>
                        <span>Автосохранение</span>
                        <Seg value={local.autoSaveInterval} onChange={v => patchGame({ autoSaveInterval: v })} options={[{ v: 0, label: 'Выкл' }, { v: 15, label: '15 с' }, { v: 25, label: '25 с' }, { v: 60, label: '1 мин' }, { v: 120, label: '2 мин' }]} />
                      </div>
                      <div className="set"><span>Смена дня и ночи</span><Toggle on={local.timeAutoCycle} onChange={() => patchGame({ timeAutoCycle: !local.timeAutoCycle })} label="Смена дня и ночи" /></div>
                      <div className="set" style={{ height: 70 }}>
                        <span>Плотность дыма</span>
                        <Seg value={local.smokeDensity ?? 100} onChange={v => patchGame({ smokeDensity: v })} options={[{ v: 0, label: 'Выкл' }, { v: 35, label: 'Низкая' }, { v: 70, label: 'Средняя' }, { v: 100, label: 'Полная' }]} />
                      </div>
                      <div className="set"><span>Показывать сетку кузова</span><Toggle on={!!local.showSoftbodyMesh} onChange={() => patchGame({ showSoftbodyMesh: !local.showSoftbodyMesh })} label="Показывать сетку кузова" /></div>
                    </>
                  )}
                </div>

                <div className="a sec mc-aside" style={{ left: 1074, top: 128, width: 302, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="panel st d3" style={{ padding: 12 }}>
                    <div className={'th ' + thumbAt(['gfx', 'sound', 'ctrl', 'game'].indexOf(setTab))} style={{ height: 176, borderRadius: 9 }} />
                    <div style={{ padding: '14px 6px 6px' }}>
                      <div className="cn mut" style={{ fontSize: 12 }}>{({ gfx: 'Графика', sound: 'Звук', ctrl: 'Управление', game: 'Геймплей' })[setTab]}</div>
                      <div className="mut" style={{ fontSize: 13, lineHeight: 1.45, marginTop: 6 }}>
                        {({
                          gfx: 'Изменения сохраняются сразу. Пресет меняет сразу несколько параметров. На слабых устройствах выберите «Низкие» или уменьшите масштаб рендера и дальность прорисовки.',
                          sound: 'Громкость меняется сразу. Звук двигателя синтезируется в реальном времени.',
                          ctrl: 'Нажмите на любую клавишу, чтобы переназначить её. Esc отменяет выбор. Конфликтующие клавиши в одном контексте автоматически меняются местами.',
                          game: 'Режим коробки передач, автосохранение, смена дня и ночи, плотность дыма и отображение сетки деформации кузова.'
                        })[setTab]}
                      </div>
                    </div>
                  </div>
                  {setTab === 'gfx' && (
                    <div className="st d5"><button className="btn btn-s" style={{ width: '100%' }} onClick={resetPerf}>Сбросить графику</button></div>
                  )}
                  {setTab === 'ctrl' && (
                    <div className="st d5">
                      <button
                        className="btn btn-s"
                        style={{ width: '100%' }}
                        disabled={!isAnyKeybindCustomized()}
                        onClick={() => { setListeningAction(null); resetAllKeybinds(); setKeybindNotice('Управление сброшено к значениям по умолчанию.'); }}
                      >
                        Сбросить управление
                      </button>
                    </div>
                  )}
                </div>
                {Hint([['Esc', 'Назад']])}
              </section>
            )}

            {/* ============================= SAVES ============================= */}
            {cur === 'saves' && (
              <section className={scrCls}>
                {Top('Загрузить сессию', () => go('main', true))}
                <div className="tabs st d1">
                  <div className="row2" style={{ gap: 6 }}>
                    <button className={'tab cn' + (saveModeFilter === 'all' ? ' tab-on' : '')} onClick={() => setSaveModeFilter('all')}>
                      Все миры ({singleplayerSaves.length})
                    </button>
                    <button className={'tab cn' + (saveModeFilter === 'career' ? ' tab-on' : '')} onClick={() => setSaveModeFilter('career')}>
                      Карьера ({careerSavesCount})
                    </button>
                    <button className={'tab cn' + (saveModeFilter === 'freeroam' ? ' tab-on' : '')} onClick={() => setSaveModeFilter('freeroam')}>
                      Freeroam ({freeroamSavesCount})
                    </button>
                  </div>
                  <div className="mut" style={{ paddingBottom: 12, fontSize: 13 }}>Показано: {filteredSaves.length}</div>
                </div>
                <div className="a scroll mc-saves" style={{ left: 64, top: 182, width: 1312, height: 584, display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gridAutoRows: 280, gap: 20, alignContent: 'start' }}>
                  {filteredSaves.map((v, i) => (
                    <button key={v.id} className={'card st d' + Math.min(i + 1, 9) + (v.id === selectedSave?.id ? ' card-on' : '')} onClick={() => setSelectedSaveId(v.id)} onDoubleClick={() => onLoadSave(v.id)}>
                      <div className={'th ' + thumbAt(v.mode === 'freeroam' ? 5 : i)} style={{ height: 166, position: 'relative' }}>
                        <span className={'mode-badge ' + (v.mode === 'freeroam' ? 'mode-freeroam' : 'mode-career')} style={{ position: 'absolute', top: 10, right: 10 }}>
                          {v.mode === 'freeroam' ? 'Freeroam' : 'Карьера'}
                        </span>
                        {v.isAutosave && (
                          <span className="mode-badge" style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(15,23,42,0.78)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.14)' }}>
                            Авто
                          </span>
                        )}
                      </div>
                      <div style={{ padding: '14px 16px' }}>
                        <div className="cn" style={{ fontSize: 20, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</div>
                        <div className="meta">
                          <span>{v.streetName || 'flatbody'}</span>
                          <span>{v.isInVehicle ? 'В авто' : 'Пешком'}</span>
                        </div>
                        <div className="meta">
                          <span>{v.date}</span>
                          <span style={{ color: '#e0ab45' }}>{v.id === selectedSave?.id ? 'Выбрано' : v.cash !== undefined ? v.cash.toLocaleString('ru-RU') + ' ₽' : ''}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                  <div className="st d8" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button className="card-new" style={{ flex: 1 }} onClick={() => go('freeroam_map')}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e0ab45" strokeWidth="1.6"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" /></svg>
                      <span className="cn" style={{ fontSize: 16, fontWeight: 600 }}>Новый Freeroam</span>
                    </button>
                    <button className="card-new" style={{ flex: 1, borderColor: 'rgba(52,211,153,0.45)', color: '#34d399', background: 'rgba(16,185,129,0.06)' }} onClick={() => go('new')}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.6"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                      <span className="cn" style={{ fontSize: 16, fontWeight: 600 }}>Новая Карьера</span>
                    </button>
                  </div>
                </div>
                <div className="a st d8 mc-savebar" style={{ left: 64, right: 64, bottom: 76, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="mut" style={{ fontSize: 14 }}>
                    Выбрано: <span style={{ color: '#e9e6df', fontWeight: 600 }}>{selectedSave ? selectedSave.name : '—'}</span>
                    {selectedSave && (
                      <span className={'mode-badge ' + (selectedSave.mode === 'freeroam' ? 'mode-freeroam' : 'mode-career')} style={{ marginLeft: 12 }}>
                        {selectedSave.mode === 'freeroam' ? 'Freeroam' : 'Карьера'}
                      </span>
                    )}
                  </div>
                  <div className="row2">
                    <button className="btn btn-s" style={{ color: '#e08a70' }} disabled={!selectedSave}
                      onClick={() => { if (selectedSave && window.confirm(`Удалить сохранение «${selectedSave.name}»?`)) onDeleteSave(selectedSave.id); }}>Удалить</button>
                    <button className="btn btn-p" disabled={!selectedSave} onClick={() => selectedSave && onLoadSave(selectedSave.id)}><PlayIcon />Загрузить</button>
                  </div>
                </div>
                {Hint([['Esc', 'Назад']], undefined, 30)}
              </section>
            )}

            {/* ========================== NEW CAREER SESSION ========================== */}
            {cur === 'new' && (
              <section className={scrCls}>
                {Top('Карьера: Новая сессия', () => go('main', true), (
                  <div className="row2" style={{ alignItems: 'center', gap: 10 }}>
                    <span className="mode-badge mode-career" style={{ fontSize: 13, padding: '4px 10px' }}>
                      РЕЖИМ КАРЬЕРЫ
                    </span>
                    {AccountChip}
                  </div>
                ))}
                <div className="a mc-main" style={{ left: 64, top: 112, width: 880 }}>
                  <div className="st d1 mc-filters" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                    {[['all', 'Все локации'], ['city', 'Город'], ['highway', 'Трасса'], ['nature', 'Природа'], ['mountain', 'Горы'], ['industrial', 'Промзона']].map(([id, label]) => (
                      <button key={id} className={'pill' + (spawnCategory === id ? ' pill-on' : '')} onClick={() => setSpawnCategory(id)}>{label}</button>
                    ))}
                  </div>
                  <div className="scroll mc-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gridAutoRows: 262, gap: 20, alignContent: 'start', height: 650 }}>
                    {visibleSpawns.map(({ loc, i }, n) => (
                      <button key={loc.id} className={'card st d' + Math.min(n + 2, 9) + (i === spawnIndex ? ' card-on' : '')} onClick={() => pickSpawn(i)}>
                        <div className={'th mc-th ' + (CATEGORY_THUMB[loc.category || ''] || thumbAt(i))} style={{ height: 150 }} />
                        <div style={{ padding: '12px 14px' }}>
                          <div className="cn" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{loc.nameRu}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="panel a st d3 mc-side" style={{ left: 976, top: 112, width: 400, height: 716, padding: 14, display: 'flex', flexDirection: 'column' }}>
                  <div className={'th mc-sth ' + (CATEGORY_THUMB[spawn.category || ''] || thumbAt(spawnIndex))} style={{ height: 118, borderRadius: 9, flex: 'none' }} />
                  <div className="mc-sbody" style={{ padding: '12px 10px 0', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div className="cn mut" style={{ fontSize: 12 }}>Точка старта</div>
                    <div className="cn mc-name" style={{ fontSize: 24, fontWeight: 700, marginTop: 2, lineHeight: 1.1 }}>{spawn.nameRu}</div>
                    <div className="mut mc-desc" style={{ fontSize: 13, lineHeight: 1.4, marginTop: 6 }}>{spawn.description}</div>
                    <div style={{ marginTop: 12 }}><div className="lbl">Название сохранения</div><input className="inp" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.stopPropagation()} /></div>
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="lbl">Время суток</span><span style={{ fontSize: 13, fontWeight: 600 }}>{fmtHour(newTime)}</span></div>
                      <div style={{ marginRight: 9 }}><Track label="Время суток" value={newTime} min={0} max={23.5} step={0.5} onChange={setNewTime} /></div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <div className="lbl">Погода</div>
                      <Seg value={newWeather} onChange={setNewWeather} options={[{ v: 'clear', label: 'Ясно' }, { v: 'overcast', label: 'Пасмурно' }, { v: 'rain', label: 'Дождь' }, { v: 'fog', label: 'Туман' }]} />
                    </div>
                    <div className="mc-note" style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(16,185,129,0.08)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.25)', fontSize: 12, color: '#34d399', lineHeight: 1.4 }}>
                      Живой мир: активный трафик, пешеходы, смена дня/ночи и погоды, заработок и выживание.
                    </div>
                    <div style={{ flex: 1 }} />
                    <button className="btn btn-p" style={{ width: '100%', height: 50, fontSize: 17, marginBottom: 4 }}
                      onClick={() => onNewGame({ spawnId: spawn.id, saveName: newName.trim() || 'Карьера: ' + spawn.nameRu, timeHour: newTime, weather: newWeather, mode: 'career' })}>
                      <PlayIcon />Начать карьеру
                    </button>
                  </div>
                </div>
                {Hint([['Esc', 'Назад']])}
              </section>
            )}

            {/* ========================== FREEROAM MAP SELECTION ========================== */}
            {cur === 'freeroam_map' && (
              <section className={scrCls}>
                {Top('Freeroam: Выбор карты', () => go('main', true), (
                  <div className="row2" style={{ alignItems: 'center', gap: 10 }}>
                    <span className="mode-badge mode-freeroam" style={{ fontSize: 13, padding: '4px 10px' }}>
                      FREEROAM
                    </span>
                    {AccountChip}
                  </div>
                ))}
                <div className="a mc-main" style={{ left: 64, top: 112, width: 880 }}>
                  <div className="st d1 mc-filters" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                    {[['all', 'Все локации'], ['city', 'Город'], ['highway', 'Трасса'], ['nature', 'Природа'], ['mountain', 'Горы'], ['industrial', 'Промзона']].map(([id, label]) => (
                      <button key={id} className={'pill' + (spawnCategory === id ? ' pill-on' : '')} onClick={() => setSpawnCategory(id)}>{label}</button>
                    ))}
                  </div>
                  <div className="scroll mc-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gridAutoRows: 262, gap: 20, alignContent: 'start', height: 650 }}>
                    {visibleSpawns.map(({ loc, i }, n) => (
                      <button key={loc.id} className={'card st d' + Math.min(n + 2, 9) + (i === spawnIndex ? ' card-on' : '')} onClick={() => pickSpawn(i)}>
                        <div className={'th mc-th ' + (CATEGORY_THUMB[loc.category || ''] || thumbAt(i))} style={{ height: 150 }} />
                        <div style={{ padding: '12px 14px' }}>
                          <div className="cn" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{loc.nameRu}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="panel a st d3 mc-side" style={{ left: 976, top: 112, width: 400, height: 716, padding: 14, display: 'flex', flexDirection: 'column' }}>
                  <div className={'th mc-sth ' + (CATEGORY_THUMB[spawn.category || ''] || thumbAt(spawnIndex))} style={{ height: 118, borderRadius: 9, flex: 'none' }} />
                  <div className="mc-sbody" style={{ padding: '12px 10px 0', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div className="cn mut" style={{ fontSize: 12 }}>Точка старта</div>
                    <div className="cn mc-name" style={{ fontSize: 24, fontWeight: 700, marginTop: 2, lineHeight: 1.1 }}>{spawn.nameRu}</div>
                    <div className="mut mc-desc" style={{ fontSize: 13, lineHeight: 1.4, marginTop: 6 }}>{spawn.description}</div>
                    <div style={{ marginTop: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="lbl">Время суток</span><span style={{ fontSize: 13, fontWeight: 600 }}>{fmtHour(newTime)}</span></div>
                      <div style={{ marginRight: 9 }}><Track label="Время суток" value={newTime} min={0} max={23.5} step={0.5} onChange={setNewTime} /></div>
                    </div>
                    <div style={{ marginTop: 14 }}>
                      <div className="lbl">Погода</div>
                      <Seg value={newWeather} onChange={setNewWeather} options={[{ v: 'clear', label: 'Ясно' }, { v: 'overcast', label: 'Пасмурно' }, { v: 'rain', label: 'Дождь' }, { v: 'fog', label: 'Туман' }]} />
                    </div>
                    <div className="mc-note" style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(201,146,43,0.08)', borderRadius: 8, border: '1px solid rgba(201,146,43,0.25)', fontSize: 12, color: '#e0ab45', lineHeight: 1.4 }}>
                      Свободная езда: без трафика и пешеходов. Выберите карту, затем настройте автомобиль.
                    </div>
                    <div style={{ flex: 1 }} />
                    <button className="btn btn-p" style={{ width: '100%', height: 50, fontSize: 17, marginBottom: 4 }}
                      onClick={() => go('freeroam_car')}>
                      <PlayIcon />Далее: Выбор автомобиля
                    </button>
                  </div>
                </div>
                {Hint([['Esc', 'Назад']])}
              </section>
            )}

            {/* ========================= CREATE SERVER ========================= */}
            {cur === 'create' && (
              <section className={scrCls}>
                {Top('Создать сервер', () => go('servers', true))}
                <div className="panel a stg st d2 mc-form" style={{ left: 64, top: 112, width: 880, height: 716, padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 13 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16 }}>
                    <div>
                      <div className="lbl">Название сервера</div>
                      <input className="inp" value={hostName} onChange={e => setHostName(e.target.value)} onKeyDown={e => e.stopPropagation()} />
                    </div>
                    <div>
                      <div className="lbl">{hostAccess === 'code' ? 'Код комнаты (для входа)' : 'Код комнаты (прямой вход)'}</div>
                      <div className="row2" style={{ gap: 8 }}>
                        <input className="inp" value={hostCode} onChange={e => setHostCode(e.target.value)} onKeyDown={e => e.stopPropagation()} style={{ flex: 1, fontFamily: 'ui-monospace,monospace', borderColor: 'rgba(255,255,255,.14)' }} />
                        <button type="button" className="btn btn-s" style={{ flex: 'none', padding: '0 14px', height: 46 }} onClick={regenerateHostCode}>Обновить</button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16 }}>
                    <div>
                      <div className="lbl">Доступ к серверу</div>
                      <Seg
                        value={hostAccess}
                        onChange={v => setHostAccess(v as 'all' | 'code')}
                        options={[
                          { v: 'all', label: 'Публичный' },
                          { v: 'code', label: 'Приватный (по коду)' }
                        ]}
                      />
                    </div>
                    <div>
                      <div className="lbl">Режим</div>
                      <Seg value={hostMode} onChange={setHostMode} options={Object.keys(MODE_NAME).map(k => ({ v: k, label: MODE_NAME[k] }))} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16, alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="lbl">Максимум игроков</span><span style={{ fontSize: 13, fontWeight: 600 }}>{hostMax}</span></div>
                      <div style={{ marginRight: 9 }}><Track label="Максимум игроков" value={hostMax} min={2} max={16} step={1} onChange={setHostMax} /></div>
                    </div>
                    <div>
                      <div className="lbl">Уровень античита</div>
                      <Seg value={antiCheat} onChange={setAntiCheat} options={[{ v: 'none', label: 'Нет' }, { v: 'moderate', label: 'Умеренный' }, { v: 'strict', label: 'Строгий' }]} />
                    </div>
                  </div>

                  <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 34 }}>
                      <span style={{ fontWeight: 500 }}>Трафик (автомобили ИИ и пешеходы)</span>
                      <Toggle on={trafficEnabled} onChange={() => setTrafficEnabled(!trafficEnabled)} label="Трафик" />
                    </div>
                    {trafficEnabled && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 8 }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="lbl">Количество машин</span><span style={{ fontSize: 12.5, fontWeight: 600 }}>{vehicleCount}</span></div>
                          <div style={{ marginRight: 9 }}><Track label="Машины" value={vehicleCount} min={2} max={35} step={1} onChange={setVehicleCount} /></div>
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="lbl">Количество пешеходов</span><span style={{ fontSize: 12.5, fontWeight: 600 }}>{pedestrianCount}</span></div>
                          <div style={{ marginRight: 9 }}><Track label="Пешеходы" value={pedestrianCount} min={0} max={25} step={1} onChange={setPedestrianCount} /></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16 }}>
                    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 500 }}>Защита ников паролем</span>
                        <Toggle on={passwordRequired} onChange={() => setPasswordRequired(!passwordRequired)} label="Защита ников паролем" />
                      </div>
                      <div className="mut" style={{ fontSize: 11.5, lineHeight: 1.3 }}>
                        {passwordRequired ? 'Личный пароль при первом входе защищает ник и профиль.' : 'Вход на сервер без регистрации и пароля.'}
                      </div>
                    </div>

                    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 500 }}>Сохранять данные игроков</span>
                        <Toggle on={savePlayerData} onChange={() => setSavePlayerData(!savePlayerData)} label="Сохранять данные" />
                      </div>
                      <div className="mut" style={{ fontSize: 11.5, lineHeight: 1.3 }}>
                        {savePlayerData ? 'Прогресс, деньги и авто игроков сохраняются у хоста.' : 'Сессионный режим без записи прогресса.'}
                      </div>
                    </div>
                  </div>

                  {hostAccess === 'all' && !currentUser && (
                    <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(224,171,69,.1)', border: '1px solid rgba(224,171,69,.28)', color: '#e6c278', fontSize: 12, lineHeight: 1.35 }}>
                      Без входа в Google-аккаунт сервер не отображается в публичном списке — подключение доступно по коду комнаты.
                    </div>
                  )}

                  <div className="row2" style={{ gap: 12, marginTop: 'auto', paddingTop: 4 }}>
                    <button className="btn btn-s" style={{ flex: 1 }} onClick={() => go('servers', true)}>Отмена</button>
                    <button className="btn btn-p" style={{ flex: 1 }} onClick={createServer} disabled={creating}>{creating ? 'Запуск...' : 'Создать сервер'}</button>
                  </div>
                </div>
                <div className="panel a st d4 mc-side mc-auto" style={{ left: 976, top: 112, width: 400, padding: '24px 26px' }}>
                  <div className="cn" style={{ fontSize: 20, fontWeight: 700 }}>Как это работает</div>
                  <div className="mut" style={{ fontSize: 14, lineHeight: 1.55, marginTop: 12 }}>
                    Сервер работает напрямую между игроками (P2P). Вы становитесь хостом и входите в игру сразу после создания.
                  </div>
                  <div className="mut" style={{ fontSize: 14, lineHeight: 1.55, marginTop: 12 }}>
                    <strong style={{ color: '#e6e2d8' }}>Доступ:</strong> публичный сервер виден в общем списке, приватный скрыт и открывается только по коду комнаты.
                  </div>
                  <div className="mut" style={{ fontSize: 14, lineHeight: 1.55, marginTop: 12 }}>
                    <strong style={{ color: '#e6e2d8' }}>Защита ников:</strong> если включена, каждый игрок задаёт личный пароль для своего ника — это защищает аккаунт и серверное сохранение от подмены.
                  </div>
                </div>
                {Hint([['Esc', 'Назад']])}
              </section>
            )}
          </div>
        </div>
      </div>
    </ShadowHost>
    {cur === 'freeroam_car' && (
      <VehicleSelect
        defaultSpawnId={spawn.id}
        onBack={() => go('freeroam_map', true)}
        onStart={({ spawnId, saveName, vehicleType, vehicleColor, powertrain }) => {
          onNewGame({ spawnId, saveName, timeHour: newTime, weather: newWeather, mode: 'freeroam', vehicleType, vehicleColor, powertrain });
        }}
      />
    )}
    </>
  );
};
