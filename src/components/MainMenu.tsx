import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import menuCss from './mainMenu.css?inline';
import { SPAWN_LOCATIONS } from '../spawnLocations';
import { performanceConfig, savePerformanceConfig, DEFAULT_CONFIG } from '../performanceConfig';
import { sound } from '../audio';
import { onlineManager } from '../onlineSystem';
import {
  subscribeToP2PServers,
  createP2PServerDoc,
  subscribeToFriends,
  fetchUserProfile,
  loginWithGoogle,
  logoutUser,
  type P2PServerRoom,
  type FriendshipData,
  type UserProfileData,
  type User as FirebaseUser
} from '../firebase';
import { WeatherType } from '../types';
import { VehicleSelect } from './VehicleSelect';

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
  }) => void;
  currentSettings: {
    fpsLimit: number;
    autoSaveInterval: number;
    timeAutoCycle: boolean;
    mouseSensitivity: number;
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
      {root && createPortal(<><style>{menuCss}</style>{children}</>, root)}
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (cur === 'main') onResume();
      else if (cur === 'create') go('servers', true);
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
        const k = Math.min(W / 1440, H / 900);
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

  /* ---------- saves ---------- */
  const [saveModeFilter, setSaveModeFilter] = useState<'all' | 'career' | 'freeroam'>('all');
  const [selectedSaveId, setSelectedSaveId] = useState<string>(saves[0]?.id || '');
  useEffect(() => {
    if (saves.length > 0 && (!selectedSaveId || !saves.some(s => s.id === selectedSaveId))) setSelectedSaveId(saves[0].id);
  }, [saves, selectedSaveId]);

  const filteredSaves = saves.filter(s => {
    if (saveModeFilter === 'all') return true;
    const m = s.mode || 'career';
    return m === saveModeFilter;
  });
  const careerSavesCount = saves.filter(s => (s.mode || 'career') === 'career').length;
  const freeroamSavesCount = saves.filter(s => s.mode === 'freeroam').length;

  const selectedSave = filteredSaves.find(s => s.id === selectedSaveId) || filteredSaves[0] || saves.find(s => s.id === selectedSaveId) || saves[0] || null;
  const lastSave = saves[0] || null;

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
  const [servers, setServers] = useState<P2PServerRoom[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [serverQuery, setServerQuery] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [onlyFree, setOnlyFree] = useState(false);
  useEffect(() => subscribeToP2PServers(setServers), []);
  const filteredServers = servers.filter(s => {
    const q = serverQuery.trim().toLowerCase();
    if (q && !(s.name.toLowerCase().includes(q) || s.hostName.toLowerCase().includes(q) || (s.peerId || '').toLowerCase().includes(q))) return false;
    if (modeFilter !== 'all' && s.gameMode !== modeFilter) return false;
    if (onlyFree && (s.currentPlayers || 1) >= (s.maxPlayers || 8)) return false;
    return true;
  });
  const selectedServer = filteredServers.find(s => s.id === selectedServerId) || filteredServers[0] || null;

  const connectTo = (code: string) => {
    const clean = onlineManager.sanitizeRoomCode(code);
    if (!clean) return;
    onlineManager.joinOrCreateRoom(clean, nickname, false);
    onResume();
  };

  /* ---------- create server ---------- */
  const [hostName, setHostName] = useState<string>('Сервер ' + onlineManager.localPlayerName);
  const [hostCode, setHostCode] = useState<string>('room-' + Math.floor(1000 + Math.random() * 9000));
  const [hostMax, setHostMax] = useState<number>(8);
  const [hostMode, setHostMode] = useState<string>('free_roam');
  const [creating, setCreating] = useState(false);

  const createServer = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const clean = onlineManager.sanitizeRoomCode(hostCode);
      await createP2PServerDoc({
        name: hostName.trim() || 'Сервер ' + nickname,
        peerId: clean,
        hostUid: currentUser?.uid || 'guest_' + Date.now(),
        hostName: nickname,
        mapName: 'Степной Тракт 2D',
        gameMode: hostMode,
        isPrivate: false,
        currentPlayers: 1,
        maxPlayers: hostMax,
        status: 'active'
      });
      onlineManager.joinOrCreateRoom(clean, nickname, true);
      onResume();
    } catch (err) {
      console.error('Failed to create server', err);
      onlineManager.joinOrCreateRoom(hostCode, nickname, true);
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

  const patchPerf = (patch: Partial<typeof perf>) => {
    const next = { ...perf, ...patch };
    setPerf(next);
    Object.assign(performanceConfig, next);
    savePerformanceConfig(performanceConfig);
  };
  const resetPerf = () => {
    Object.assign(performanceConfig, DEFAULT_CONFIG);
    savePerformanceConfig(performanceConfig);
    setPerf({ ...performanceConfig });
  };
  const patchGame = (patch: Partial<typeof local>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onUpdateSettings(next);
  };

  /* ---------- account ---------- */
  type AccTab = 'profile' | 'friends';
  const [accTab, setAccTab] = useState<AccTab>('profile');
  const [nickname, setNickname] = useState<string>(onlineManager.localPlayerName);
  const [nickSaved, setNickSaved] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [friends, setFriends] = useState<FriendshipData[]>([]);

  useEffect(() => {
    if (!currentUser) { setProfile(null); setFriends([]); return; }
    let alive = true;
    fetchUserProfile(currentUser.uid).then(p => { if (alive) setProfile(p); }).catch(() => {});
    const unsub = subscribeToFriends(currentUser.uid, list => { if (alive) setFriends(list); });
    return () => { alive = false; unsub && unsub(); };
  }, [currentUser?.uid]);

  const saveNickname = () => {
    onlineManager.setPlayerName(nickname);
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

                <div className="a" style={{ left: 64, top: 156, width: 440, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {lastSave ? (
                    <button className="menu-i cn sl d1" onClick={() => onLoadSave(lastSave.id)}
                      style={{ background: 'rgba(201,146,43,.16)', borderLeftColor: '#c9922b', color: '#fff', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 2, height: 78 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span>Продолжить</span>
                        <span className={'mode-badge ' + (lastSave.mode === 'freeroam' ? 'mode-freeroam' : 'mode-career')}>
                          {lastSave.mode === 'freeroam' ? 'Freeroam' : 'Карьера'}
                        </span>
                      </div>
                      <span className="mut" style={{ font: "400 13px 'Barlow',sans-serif", textTransform: 'none', letterSpacing: 0 }}>«{lastSave.name}» — {lastSave.date}</span>
                    </button>
                  ) : (
                    <button className="menu-i cn sl d1" onClick={onResume}
                      style={{ background: 'rgba(201,146,43,.16)', borderLeftColor: '#c9922b', color: '#fff', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 2, height: 78 }}>
                      <span>В игру</span>
                      <span className="mut" style={{ font: "400 14px 'Barlow',sans-serif", textTransform: 'none', letterSpacing: 0 }}>Свободная езда по открытому миру</span>
                    </button>
                  )}
                  <button className="menu-i cn sl d2" onClick={() => go('new')} style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 2, height: 68 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Ic><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></Ic>
                      <span>Карьера (Carrier)</span>
                    </div>
                    <span className="mut" style={{ font: "400 12px 'Barlow',sans-serif", textTransform: 'none', letterSpacing: 0, paddingLeft: 36 }}>Трафик, пешеходы, погода, экономика</span>
                  </button>
                  <button className="menu-i cn sl d3" onClick={() => go('freeroam_map')} style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 2, height: 68 }}>
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
                  {lastSave && (
                    <button className="menu-i cn sl d8" onClick={onResume} style={{ marginTop: 6, color: '#a29e93', height: 48 }}>
                      <Ic c="#a29e93"><path d="M9 4H5v16h4M15 8l4 4-4 4M19 12H9" /></Ic>Вернуться в игру
                    </button>
                  )}
                </div>

                <div className="panel a st d3" style={{ left: 880, top: 156, width: 496, padding: 14 }}>
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
                    <div className="cn" style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{lastSave ? lastSave.name : 'Степной Тракт'}</div>
                    <div className="mut" style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: 13 }}>
                      {lastSave ? (
                        <>
                          <span>Локация: {lastSave.streetName || 'Степной Тракт'}</span>
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
                {Hint([['Esc', 'В игру']])}
              </section>
            )}

            {/* =========================== ACCOUNT =========================== */}
            {cur === 'account' && (
              <section className={scrCls}>
                {Top('Аккаунт', () => go('main', true), <div className="chip"><span className="ava">{initial}</span><span style={{ fontWeight: 500 }}>{nickname}</span></div>)}
                <div className="a" style={{ left: 64, top: 140, width: 290, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button className={'nav-i cn sl d1' + (accTab === 'profile' ? ' nav-on' : '')} onClick={() => switchSection(() => setAccTab('profile'))}>Профиль</button>
                  <button className={'nav-i cn sl d2' + (accTab === 'friends' ? ' nav-on' : '')} onClick={() => switchSection(() => setAccTab('friends'))}>Друзья</button>
                </div>

                {accTab === 'profile' && (
                  <div className="a sec" key="acc-profile" style={{ left: 394, top: 140, width: 982, display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                        {(authError.includes('авторизованных доменов') || authError.includes('Authorized domains')) && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div className="mut" style={{ fontSize: 13 }}>
                              Добавьте домен ниже в консоли Firebase (Authentication → Settings → Authorized domains):
                            </div>
                            <div className="row2" style={{ alignItems: 'center', gap: 10 }}>
                              <span style={{ fontFamily: 'ui-monospace,monospace', background: 'rgba(0,0,0,.45)', padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,.12)', fontSize: 13, color: '#fff', userSelect: 'all' }}>
                                {typeof window !== 'undefined' ? window.location.hostname : ''}
                              </span>
                              <button
                                className="btn btn-s"
                                style={{ height: 34, fontSize: 13 }}
                                onClick={() => {
                                  if (typeof window !== 'undefined') {
                                    navigator.clipboard.writeText(window.location.hostname);
                                  }
                                }}
                              >
                                Копировать
                              </button>
                              <a
                                href="https://console.firebase.google.com/project/gen-lang-client-0888101069/authentication/settings"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-p"
                                style={{ height: 34, fontSize: 13, textDecoration: 'none' }}
                              >
                                Открыть Firebase Console
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 20 }}>
                      <div className="panel st d3" style={{ flex: 1.15, padding: '22px 24px' }}>
                        <div className="cn" style={{ fontSize: 20, fontWeight: 700 }}>Позывной</div>
                        <div className="lbl" style={{ marginTop: 16 }}>Имя, под которым вас видят в онлайне</div>
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
                  <div className="a sec" key="acc-friends" style={{ left: 394, top: 140, width: 982 }}>
                    <div className="panel st d1" style={{ padding: '22px 24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span className="cn" style={{ fontSize: 20, fontWeight: 700 }}>Друзья</span>
                        {currentUser && <span className="mut" style={{ fontSize: 13 }}>{friends.length}</span>}
                      </div>
                      {!currentUser ? (
                        <div className="empty"><div className="mut">Войдите через Google, чтобы видеть друзей.</div><button className="btn btn-p" onClick={signIn} disabled={authBusy}>Войти через Google</button></div>
                      ) : friends.length === 0 ? (
                        <div className="empty"><div className="mut">Список друзей пуст. Добавить друзей можно в игре: Esc → Онлайн → Друзья.</div></div>
                      ) : (
                        <div style={{ marginTop: 8 }}>
                          {friends.map((f, i) => {
                            const other = f.user1.uid === currentUser.uid ? f.user2 : f.user1;
                            const name = other.nickname || other.name || 'Игрок';
                            return (
                              <div className="fr" key={f.id || i} style={i === friends.length - 1 ? { borderBottom: 0 } : undefined}>
                                <span className="av" style={{ background: '#e0ab45' }}>{name.charAt(0).toUpperCase()}</span>
                                <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{name}</div></div>
                              </div>
                            );
                          })}
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
                  <div className="row2" style={{ gap: 6 }}><span className="tab tab-on cn">Все серверы</span></div>
                  <div className="row2" style={{ paddingBottom: 8 }}>
                    <div className="chip" style={{ width: 300, height: 40 }}>
                      <SearchIcon />
                      <input value={serverQuery} onChange={e => setServerQuery(e.target.value)} onKeyDown={e => e.stopPropagation()} placeholder="Поиск по названию или хосту" />
                    </div>
                    <div className="chip" style={{ width: 250, height: 40 }}>
                      <input value={roomCode} onChange={e => setRoomCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') connectTo(roomCode); e.stopPropagation(); }} placeholder="Код комнаты" style={{ fontFamily: 'ui-monospace,monospace' }} />
                      <button onClick={() => connectTo(roomCode)} disabled={!roomCode.trim()} className="cn" style={{ color: '#e0ab45', fontWeight: 600, fontSize: 14 }}>Войти</button>
                    </div>
                  </div>
                </div>
                <div className="a st d2" style={{ left: 64, top: 182, display: 'flex', gap: 10 }}>
                  <button className={'pill' + (modeFilter === 'all' ? ' pill-on' : '')} onClick={() => setModeFilter('all')}>Все режимы</button>
                  {Object.keys(MODE_NAME).map(m => (
                    <button key={m} className={'pill' + (modeFilter === m ? ' pill-on' : '')} onClick={() => setModeFilter(m)}>{MODE_NAME[m]}</button>
                  ))}
                  <button className={'pill' + (onlyFree ? ' pill-on' : '')} onClick={() => setOnlyFree(v => !v)}>Есть места</button>
                </div>
                <div className="panel a st d2" style={{ left: 64, top: 232, width: 850, height: 610, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div className="row hd cn" style={{ borderBottom: '1px solid rgba(255,255,255,.08)', flex: 'none' }}><span /><span>Название</span><span>Режим</span><span>Игроки</span></div>
                  <div className="scroll" style={{ flex: 1 }}>
                    {filteredServers.length === 0 ? (
                      <div className="empty" style={{ height: '100%' }}>
                        <div className="cn" style={{ fontSize: 22, fontWeight: 700 }}>Нет открытых серверов</div>
                        <div className="mut" style={{ fontSize: 14, maxWidth: 380 }}>Создайте свой сервер или подключитесь к другу по коду комнаты.</div>
                        <button className="btn btn-p" onClick={() => go('create')}>Создать сервер</button>
                      </div>
                    ) : filteredServers.map(s => {
                      const cp = s.currentPlayers || 1, mp = s.maxPlayers || 8;
                      return (
                        <button key={s.id} className={'row rw' + (selectedServer?.id === s.id ? ' row-on' : '')} onClick={() => setSelectedServerId(s.id || '')} onDoubleClick={() => connectTo(s.peerId)}>
                          <span className="rowdot"><span className="dot" style={{ background: s.status === 'active' ? '#7fbf6a' : '#e0ab45' }} /></span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                            <div className="mut" style={{ fontSize: 12 }}>Хост: {s.hostName}</div>
                          </div>
                          <span>{modeName(s.gameMode)}</span>
                          <span className={fillClass(cp, mp)}>{cp} / {mp}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="panel a st d4" style={{ left: 938, top: 232, width: 438, height: 610, padding: 14, display: 'flex', flexDirection: 'column' }}>
                  {selectedServer ? (
                    <>
                      <div className={'th ' + (MODE_THUMB[selectedServer.gameMode] || 'm5')} style={{ height: 200, borderRadius: 10, flex: 'none' }} />
                      <div style={{ padding: '18px 8px 0', flex: 1 }}>
                        <div className="cn mut" style={{ fontSize: 12 }}>Выбранный сервер</div>
                        <div className="cn" style={{ fontSize: 28, fontWeight: 700, marginTop: 4, lineHeight: 1.1 }}>{selectedServer.name}</div>
                        <div className="mut" style={{ marginTop: 8, fontSize: 14, lineHeight: 1.45 }}>Прямое P2P-подключение к хосту. Хост должен оставаться в игре, пока подключены игроки.</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', marginTop: 20, fontSize: 14 }}>
                          <div><div className="mut" style={{ fontSize: 12 }}>Хост</div>{selectedServer.hostName}</div>
                          <div><div className="mut" style={{ fontSize: 12 }}>Код комнаты</div>{selectedServer.peerId}</div>
                          <div><div className="mut" style={{ fontSize: 12 }}>Карта</div>{selectedServer.mapName || 'Степной Тракт'}</div>
                          <div><div className="mut" style={{ fontSize: 12 }}>Режим</div>{modeName(selectedServer.gameMode)}</div>
                        </div>
                        <div style={{ marginTop: 20 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}><span className="mut">Игроки</span><span>{selectedServer.currentPlayers || 1} / {selectedServer.maxPlayers || 8}</span></div>
                          <div className="bar"><i style={{ width: Math.round(((selectedServer.currentPlayers || 1) / (selectedServer.maxPlayers || 8)) * 100) + '%' }} /></div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, padding: '0 8px 8px' }}>
                        <button className="btn btn-p" style={{ flex: 1 }} onClick={() => connectTo(selectedServer.peerId)}>Подключиться</button>
                      </div>
                    </>
                  ) : (
                    <div className="empty" style={{ flex: 1 }}><div className="cn" style={{ fontSize: 22, fontWeight: 700 }}>Выберите сервер</div><div className="mut" style={{ fontSize: 14 }}>Подробности появятся здесь.</div></div>
                  )}
                </div>
                {Hint([['Esc', 'Назад']], 'Найдено серверов: ' + filteredServers.length)}
              </section>
            )}

            {/* =========================== SETTINGS =========================== */}
            {cur === 'settings' && (
              <section className={scrCls}>
                {Top('Настройки', () => go('main', true))}
                <div className="a" style={{ left: 64, top: 128, width: 260, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {([['gfx', 'Графика'], ['sound', 'Звук'], ['ctrl', 'Управление'], ['game', 'Геймплей']] as [SetTab, string][]).map(([id, label], i) => (
                    <button key={id} className={'nav-i cn sl d' + (i + 1) + (setTab === id ? ' nav-on' : '')} onClick={() => switchSection(() => setSetTab(id))}>{label}</button>
                  ))}
                </div>

                <div className="panel a sec st d2 scroll" key={'panel-' + setTab} style={{ left: 350, top: 128, width: 700, maxHeight: 714 }}>
                  {setTab === 'gfx' && (
                    <>
                      <div className="grp cn" style={{ paddingTop: 18 }}>Детализация</div>
                      <div className="set"><span>Упрощённая графика</span><Toggle on={perf.lowQualityRendering} onChange={() => patchPerf({ lowQualityRendering: !perf.lowQualityRendering })} label="Упрощённая графика" /></div>
                      <div className="set"><span>Динамические тени</span><Toggle on={perf.enableShadows} onChange={() => patchPerf({ enableShadows: !perf.enableShadows })} label="Тени" /></div>
                      <div className="set"><span>Детали балконов</span><Toggle on={perf.enableBalconyDetails} onChange={() => patchPerf({ enableBalconyDetails: !perf.enableBalconyDetails })} label="Балконы" /></div>
                      <div className="set"><span>Капли дождя на экране</span><Toggle on={perf.enableRainDroplets} onChange={() => patchPerf({ enableRainDroplets: !perf.enableRainDroplets })} label="Капли дождя" /></div>
                      <div className="set"><span>Мини-карта</span><Toggle on={perf.enableMinimap} onChange={() => patchPerf({ enableMinimap: !perf.enableMinimap })} label="Мини-карта" /></div>
                      <div className="grp cn">Нагрузка</div>
                      <div className="set"><span>Лимит частиц (дым, пар, огонь)</span><Slider label="Лимит частиц" value={perf.particleLimit} min={100} max={600} step={50} onChange={v => patchPerf({ particleLimit: v })} display={String(perf.particleLimit)} /></div>
                      <div className="set"><span>Машин в трафике</span><Slider label="Машин в трафике" value={perf.maxVehicles} min={5} max={45} step={1} onChange={v => patchPerf({ maxVehicles: v })} display={String(perf.maxVehicles)} /></div>
                    </>
                  )}
                  {setTab === 'sound' && (
                    <>
                      <div className="grp cn" style={{ paddingTop: 18 }}>Громкость</div>
                      <div className="set"><span>Звук включён</span><Toggle on={!muted} onChange={() => setMuted(sound.toggleMute())} label="Звук" /></div>
                      <div className="set"><span>Общая</span><Slider label="Общая громкость" value={masterVol} min={0} max={100} step={1} onChange={v => { setMasterVol(v); sound.setMasterVolume(v / 100); }} display={String(masterVol)} /></div>
                      <div className="set"><span>Двигатель</span><Slider label="Громкость двигателя" value={engineVol} min={0} max={100} step={1} onChange={v => { setEngineVol(v); sound.setEngineVolume(v / 100); }} display={String(engineVol)} /></div>
                    </>
                  )}
                  {setTab === 'ctrl' && (
                    <>
                      <div className="grp cn" style={{ paddingTop: 18 }}>Мышь</div>
                      <div className="set"><span>Чувствительность</span><Slider label="Чувствительность мыши" value={local.mouseSensitivity} min={0.5} max={2.5} step={0.1} onChange={v => patchGame({ mouseSensitivity: v })} display={local.mouseSensitivity.toFixed(1) + '×'} /></div>
                      <div className="grp cn">Автомобиль</div>
                      {([['Газ / тормоз', ['W', 'S']], ['Руль', ['A', 'D']], ['Ручной тормоз', ['Пробел']], ['Фары', ['L']], ['Клаксон', ['H']], ['Поворотники', ['Q', 'Z']], ['Аварийка', ['X']]] as [string, string[]][]).map(([t, ks]) => (
                        <div className="set" key={t}><span>{t}</span><span className="kv">{ks.map(k => <span className="key" key={k}>{k}</span>)}</span></div>
                      ))}
                      <div className="grp cn">Персонаж и мир</div>
                      {([['Действие / сесть', ['E']], ['Инвентарь', ['Tab']], ['Осмотр тела', ['F']], ['Карта (GPS)', ['M']], ['Меню паузы', ['Esc']]] as [string, string[]][]).map(([t, ks]) => (
                        <div className="set" key={t}><span>{t}</span><span className="kv">{ks.map(k => <span className="key" key={k}>{k}</span>)}</span></div>
                      ))}
                    </>
                  )}
                  {setTab === 'game' && (
                    <>
                      <div className="grp cn" style={{ paddingTop: 18 }}>Игра</div>
                      <div className="set" style={{ height: 70 }}>
                        <span>Автосохранение</span>
                        <Seg value={local.autoSaveInterval} onChange={v => patchGame({ autoSaveInterval: v })} options={[{ v: 0, label: 'Выкл' }, { v: 15, label: '15 с' }, { v: 25, label: '25 с' }, { v: 60, label: '1 мин' }, { v: 120, label: '2 мин' }]} />
                      </div>
                      <div className="set"><span>Смена дня и ночи</span><Toggle on={local.timeAutoCycle} onChange={() => patchGame({ timeAutoCycle: !local.timeAutoCycle })} label="Смена дня и ночи" /></div>
                      <div className="grp cn">Дисплей</div>
                      <div className="set" style={{ height: 70 }}>
                        <span>Лимит кадров</span>
                        <Seg value={local.fpsLimit} onChange={v => patchGame({ fpsLimit: v })} options={[{ v: 30, label: '30' }, { v: 60, label: '60' }, { v: 120, label: '120' }, { v: 0, label: 'Max' }]} />
                      </div>
                    </>
                  )}
                </div>

                <div className="a sec" style={{ left: 1074, top: 128, width: 302, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="panel st d3" style={{ padding: 12 }}>
                    <div className={'th ' + thumbAt(['gfx', 'sound', 'ctrl', 'game'].indexOf(setTab))} style={{ height: 176, borderRadius: 9 }} />
                    <div style={{ padding: '14px 6px 6px' }}>
                      <div className="cn mut" style={{ fontSize: 12 }}>{({ gfx: 'Графика', sound: 'Звук', ctrl: 'Управление', game: 'Геймплей' })[setTab]}</div>
                      <div className="mut" style={{ fontSize: 13, lineHeight: 1.45, marginTop: 6 }}>
                        {({
                          gfx: 'Параметры сохраняются сразу. На слабых устройствах отключите тени и уменьшите число частиц и машин в трафике.',
                          sound: 'Громкость меняется сразу. Звук двигателя синтезируется в реальном времени.',
                          ctrl: 'Чувствительность мыши применяется сразу. Список клавиш приведён для справки.',
                          game: 'Автосохранение, смена времени суток и ограничение частоты кадров.'
                        })[setTab]}
                      </div>
                    </div>
                  </div>
                  {setTab === 'gfx' && (
                    <div className="st d5"><button className="btn btn-s" style={{ width: '100%' }} onClick={resetPerf}>Сбросить графику</button></div>
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
                      Все сохранения ({saves.length})
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
                <div className="a scroll" style={{ left: 64, top: 182, width: 1312, height: 584, display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gridAutoRows: 280, gap: 20, alignContent: 'start' }}>
                  {filteredSaves.map((v, i) => (
                    <button key={v.id} className={'card st d' + Math.min(i + 1, 9) + (v.id === selectedSave?.id ? ' card-on' : '')} onClick={() => setSelectedSaveId(v.id)} onDoubleClick={() => onLoadSave(v.id)}>
                      <div className={'th ' + thumbAt(v.mode === 'freeroam' ? 5 : i)} style={{ height: 166, position: 'relative' }}>
                        <span className={'mode-badge ' + (v.mode === 'freeroam' ? 'mode-freeroam' : 'mode-career')} style={{ position: 'absolute', top: 10, right: 10 }}>
                          {v.mode === 'freeroam' ? 'Freeroam' : 'Карьера'}
                        </span>
                      </div>
                      <div style={{ padding: '14px 16px' }}>
                        <div className="cn" style={{ fontSize: 20, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</div>
                        <div className="meta">
                          <span>{v.streetName || 'Степной Тракт'}</span>
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
                <div className="a st d8" style={{ left: 64, right: 64, bottom: 76, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                <div className="a" style={{ left: 64, top: 112, width: 880 }}>
                  <div className="st d1" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                    {[['all', 'Все локации'], ['city', 'Город'], ['highway', 'Трасса'], ['nature', 'Природа'], ['mountain', 'Горы'], ['industrial', 'Промзона']].map(([id, label]) => (
                      <button key={id} className={'pill' + (spawnCategory === id ? ' pill-on' : '')} onClick={() => setSpawnCategory(id)}>{label}</button>
                    ))}
                  </div>
                  <div className="scroll" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gridAutoRows: 262, gap: 20, alignContent: 'start', height: 650 }}>
                    {visibleSpawns.map(({ loc, i }, n) => (
                      <button key={loc.id} className={'card st d' + Math.min(n + 2, 9) + (i === spawnIndex ? ' card-on' : '')} onClick={() => pickSpawn(i)}>
                        <div className={'th ' + (CATEGORY_THUMB[loc.category || ''] || thumbAt(i))} style={{ height: 150 }} />
                        <div style={{ padding: '12px 14px' }}>
                          <div className="cn" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{loc.nameRu}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="panel a st d3" style={{ left: 976, top: 112, width: 400, height: 730, padding: 14, display: 'flex', flexDirection: 'column' }}>
                  <div className={'th ' + (CATEGORY_THUMB[spawn.category || ''] || thumbAt(spawnIndex))} style={{ height: 150, borderRadius: 9, flex: 'none' }} />
                  <div style={{ padding: '16px 10px 0', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div className="cn mut" style={{ fontSize: 12 }}>Точка старта</div>
                    <div className="cn" style={{ fontSize: 26, fontWeight: 700, marginTop: 2, lineHeight: 1.1 }}>{spawn.nameRu}</div>
                    <div className="mut" style={{ fontSize: 13, lineHeight: 1.45, marginTop: 8 }}>{spawn.description}</div>
                    <div style={{ marginTop: 16 }}><div className="lbl">Название сохранения</div><input className="inp" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.stopPropagation()} /></div>
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="lbl">Время суток</span><span style={{ fontSize: 13, fontWeight: 600 }}>{fmtHour(newTime)}</span></div>
                      <div style={{ marginRight: 9 }}><Track label="Время суток" value={newTime} min={0} max={23.5} step={0.5} onChange={setNewTime} /></div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <div className="lbl">Погода</div>
                      <Seg value={newWeather} onChange={setNewWeather} options={[{ v: 'clear', label: 'Ясно' }, { v: 'overcast', label: 'Пасмурно' }, { v: 'rain', label: 'Дождь' }, { v: 'fog', label: 'Туман' }]} />
                    </div>
                    <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(16,185,129,0.08)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.25)', fontSize: 12, color: '#34d399', lineHeight: 1.45 }}>
                      Живой мир: активный трафик, пешеходы, смена дня/ночи и погоды, заработок и выживание.
                    </div>
                    <div style={{ flex: 1 }} />
                    <button className="btn btn-p" style={{ width: '100%', height: 50, fontSize: 17, marginBottom: 10 }}
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
                <div className="a" style={{ left: 64, top: 112, width: 880 }}>
                  <div className="st d1" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                    {[['all', 'Все локации'], ['city', 'Город'], ['highway', 'Трасса'], ['nature', 'Природа'], ['mountain', 'Горы'], ['industrial', 'Промзона']].map(([id, label]) => (
                      <button key={id} className={'pill' + (spawnCategory === id ? ' pill-on' : '')} onClick={() => setSpawnCategory(id)}>{label}</button>
                    ))}
                  </div>
                  <div className="scroll" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gridAutoRows: 262, gap: 20, alignContent: 'start', height: 650 }}>
                    {visibleSpawns.map(({ loc, i }, n) => (
                      <button key={loc.id} className={'card st d' + Math.min(n + 2, 9) + (i === spawnIndex ? ' card-on' : '')} onClick={() => pickSpawn(i)}>
                        <div className={'th ' + (CATEGORY_THUMB[loc.category || ''] || thumbAt(i))} style={{ height: 150 }} />
                        <div style={{ padding: '12px 14px' }}>
                          <div className="cn" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{loc.nameRu}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="panel a st d3" style={{ left: 976, top: 112, width: 400, height: 730, padding: 14, display: 'flex', flexDirection: 'column' }}>
                  <div className={'th ' + (CATEGORY_THUMB[spawn.category || ''] || thumbAt(spawnIndex))} style={{ height: 150, borderRadius: 9, flex: 'none' }} />
                  <div style={{ padding: '16px 10px 0', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div className="cn mut" style={{ fontSize: 12 }}>Точка старта</div>
                    <div className="cn" style={{ fontSize: 26, fontWeight: 700, marginTop: 2, lineHeight: 1.1 }}>{spawn.nameRu}</div>
                    <div className="mut" style={{ fontSize: 13, lineHeight: 1.45, marginTop: 8 }}>{spawn.description}</div>
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="lbl">Время суток</span><span style={{ fontSize: 13, fontWeight: 600 }}>{fmtHour(newTime)}</span></div>
                      <div style={{ marginRight: 9 }}><Track label="Время суток" value={newTime} min={0} max={23.5} step={0.5} onChange={setNewTime} /></div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <div className="lbl">Погода</div>
                      <Seg value={newWeather} onChange={setNewWeather} options={[{ v: 'clear', label: 'Ясно' }, { v: 'overcast', label: 'Пасмурно' }, { v: 'rain', label: 'Дождь' }, { v: 'fog', label: 'Туман' }]} />
                    </div>
                    <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(201,146,43,0.08)', borderRadius: 8, border: '1px solid rgba(201,146,43,0.25)', fontSize: 12, color: '#e0ab45', lineHeight: 1.45 }}>
                      Свободная езда: без трафика и пешеходов. Выберите карту, затем настройте автомобиль.
                    </div>
                    <div style={{ flex: 1 }} />
                    <button className="btn btn-p" style={{ width: '100%', height: 50, fontSize: 17, marginBottom: 10 }}
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
                <div className="panel a stg st d2" style={{ left: 64, top: 112, width: 880, padding: '28px 30px', display: 'flex', flexDirection: 'column', gap: 22 }}>
                  <div><div className="lbl">Название сервера</div><input className="inp" value={hostName} onChange={e => setHostName(e.target.value)} onKeyDown={e => e.stopPropagation()} /></div>
                  <div><div className="lbl">Код комнаты (его вводят друзья, чтобы подключиться)</div><input className="inp" value={hostCode} onChange={e => setHostCode(e.target.value)} onKeyDown={e => e.stopPropagation()} style={{ fontFamily: 'ui-monospace,monospace', borderColor: 'rgba(255,255,255,.14)' }} /></div>
                  <div>
                    <div className="lbl">Режим</div>
                    <Seg value={hostMode} onChange={setHostMode} options={Object.keys(MODE_NAME).map(k => ({ v: k, label: MODE_NAME[k] }))} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="lbl">Максимум игроков</span><span style={{ fontSize: 13, fontWeight: 600 }}>{hostMax}</span></div>
                    <div style={{ marginRight: 9 }}><Track label="Максимум игроков" value={hostMax} min={2} max={16} step={1} onChange={setHostMax} /></div>
                  </div>
                  <div className="row2" style={{ gap: 12, marginTop: 10 }}>
                    <button className="btn btn-s" style={{ flex: 1 }} onClick={() => go('servers', true)}>Отмена</button>
                    <button className="btn btn-p" style={{ flex: 1 }} onClick={createServer} disabled={creating}>{creating ? 'Регистрация...' : 'Создать сервер'}</button>
                  </div>
                </div>
                <div className="panel a st d4" style={{ left: 976, top: 112, width: 400, padding: '24px 26px' }}>
                  <div className="cn" style={{ fontSize: 20, fontWeight: 700 }}>Как это работает</div>
                  <div className="mut" style={{ fontSize: 14, lineHeight: 1.55, marginTop: 12 }}>
                    Сервер работает напрямую между игроками (P2P). Вы становитесь хостом и входите в игру сразу после создания.
                  </div>
                  <div className="mut" style={{ fontSize: 14, lineHeight: 1.55, marginTop: 12 }}>
                    Пока вы в игре, сервер виден в списке. Если выйти, комната закроется для остальных игроков.
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
        onStart={({ spawnId, saveName, vehicleType, vehicleColor }) => {
          onNewGame({ spawnId, saveName, timeHour: newTime, weather: newWeather, mode: 'freeroam', vehicleType, vehicleColor });
        }}
      />
    )}
    </>
  );
};
