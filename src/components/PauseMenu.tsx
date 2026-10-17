import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import pauseCss from './pauseMenu.css?inline';
import { ShadowHost, attachStageFit } from './ShadowHost';
import { useTopmostEscape } from './gameUi';
import { VehiclePreviewCanvas } from './VehiclePreviewCanvas';
import { onlineManager } from '../onlineSystem';
import { sound } from '../audio';
import { performanceConfig, DEFAULT_CONFIG, detectGraphicsPreset, PerformanceConfig, GraphicsPresetId } from '../performanceConfig';
import { GFX_GROUPS, GFX_PRESET_OPTIONS, GfxItem, applyGfxPatch, applyGfxPreset } from '../graphicsSettings';
import {
  subscribeToFriends,
  fetchUserProfile,
  sendWorldInvite,
  type FriendshipData,
  type UserProfileData,
  type User as FirebaseUser
} from '../firebase';
import {
  openHostSession,
  closeHostSession,
  setHostAccess,
  getHostSession,
  isHostSessionBusy,
  subscribeHostSession,
  MAP_NAME,
  DEFAULT_MAX_PLAYERS,
  type HostAccess
} from '../hostSession';

/* ------------------------------------------------------------------ */
/* public API                                                          */
/* ------------------------------------------------------------------ */

export interface PauseSessionInfo {
  /** Street / area the player is currently on. */
  locationName: string;
  /** In-game clock, 0..24. */
  timeHour: number;
  /** Vehicle the player is driving (null on foot). */
  vehicleType: string | null;
  vehicleName: string | null;
  vehicleColor?: string;
  vehicleRoofColor?: string;
  /** Session statistics, tracked by the game while it is running. */
  distanceKm: number;
  maxKmh: number;
  minutes: number;
  /** Epoch ms of the last save (manual or automatic); null when nothing was saved yet. */
  lastSaveAt: number | null;
}

export interface PauseSettings {
  fpsLimit: number;
  autoSaveInterval: number;
  timeAutoCycle: boolean;
  mouseSensitivity: number;
}

interface PauseMenuProps {
  onResume: () => void;
  onSave: () => void;
  onExitToMainMenu: () => void;
  /** Opens the server catalogue (main menu, "Онлайн" screen). */
  onOpenServers?: () => void;
  settings: PauseSettings;
  onUpdateSettings: (next: PauseSettings) => void;
  session: PauseSessionInfo;
  currentUser?: FirebaseUser | null;
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const dayPhase = (h: number) => (h >= 5 && h < 11 ? 'утро' : h >= 11 && h < 17 ? 'день' : h >= 17 && h < 22 ? 'вечер' : 'ночь');
const plural = (n: number, f: [string, string, string]) => {
  const a = Math.abs(n) % 100, b = a % 10;
  return a > 10 && a < 20 ? f[2] : b > 1 && b < 5 ? f[1] : b === 1 ? f[0] : f[2];
};
const fmtKm = (v: number) => v.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const AVATAR_COLORS = ['#e0ab45', '#c9b98f', '#b98a4a'];
const avatarColor = (s: string) => AVATAR_COLORS[Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

const Ic: React.FC<{ c?: string; children: React.ReactNode }> = ({ c = '#c9922b', children }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">{children}</svg>
);

/** Draggable slider track: markup and classes from the mock-up (.sld-t). */
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

const Seg: React.FC<{ options: { v: any; label: string }[]; value: any; onChange: (v: any) => void }> = ({ options, value, onChange }) => (
  <div className="seg">
    {options.map(o => (
      <span key={String(o.v)} role="button" tabIndex={0} className={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onChange(o.v); } }}>
        {o.label}
      </span>
    ))}
  </div>
);

/** Registers an Esc handler only while it is mounted (used for the exit confirmation). */
const EscWhileMounted: React.FC<{ onEscape: () => void }> = ({ onEscape }) => { useTopmostEscape(onEscape); return null; };

type Row =
  | { t: 'tg'; l: string; v: boolean; set: (v: boolean) => void }
  | { t: 'seg'; l: string; v: any; o: { v: any; label: string }[]; set: (v: any) => void }
  | { t: 'sld'; l: string; v: number; min: number; max: number; step: number; fmt: (v: number) => string; set: (v: number) => void }
  | { t: 'keys'; l: string; k: string[] }
  | { t: 'btn'; l: string; label: string; act: () => void };

type TabId = 'gfx' | 'sound' | 'ctrl' | 'game';
const TABS: [TabId, string][] = [['gfx', 'Графика'], ['sound', 'Звук'], ['ctrl', 'Управление'], ['game', 'Игра']];

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume, onSave, onExitToMainMenu, onOpenServers, settings, onUpdateSettings, session, currentUser
}) => {
  const [cur, setCur] = useState<'online' | 'settings' | null>(null);
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [qsDone, setQsDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, setTick] = useState(0);
  const gmRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  /* масштаб фиксированной сцены 1440x900 под экран (как в макете) */
  useLayoutEffect(() => attachStageFit(() => wrapRef.current, () => gmRef.current), []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    const iv = window.setInterval(() => setTick(n => n + 1), 15000);
    return () => { cancelAnimationFrame(raf); window.clearInterval(iv); timers.current.forEach(window.clearTimeout); };
  }, []);

  const leave = () => {
    if (leaving) return;
    setLeaving(true);
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    later(onResume, reduce ? 0 : 380);
  };
  useTopmostEscape(() => { if (confirmExit) setConfirmExit(false); else leave(); });

  const show = (p: 'online' | 'settings') => setCur(c => (c === p ? null : p));

  /* ---------- навигация стрелками по левому меню ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirmExit || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      const gm = gmRef.current;
      if (!gm) return;
      const items = Array.from(gm.querySelectorAll<HTMLButtonElement>('nav button'));
      if (!items.length) return;
      const rn = gm.getRootNode() as ShadowRoot;
      const i = items.indexOf(rn.activeElement as HTMLButtonElement);
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmExit]);

  /* ---------- сохранение ---------- */
  const quickSave = () => {
    onSave();
    setQsDone(true);
    later(() => setQsDone(false), 1600);
  };
  const exitTo = (save: boolean) => {
    setConfirmExit(false);
    if (save) onSave();
    onExitToMainMenu();
  };
  const minsSinceSave = session.lastSaveAt == null ? null : Math.max(0, Math.floor((Date.now() - session.lastSaveAt) / 60000));

  /* ---------- настройки (те же источники, что в главном меню) ---------- */
  const [tab, setTab] = useState<TabId>('gfx');
  const [perf, setPerf] = useState(() => ({ ...performanceConfig }));
  const [muted, setMuted] = useState<boolean>(() => sound.getMuted());
  const [masterVol, setMasterVol] = useState<number>(() => Math.round(sound.getMasterVolume() * 100));
  const [engineVol, setEngineVol] = useState<number>(() => Math.round(sound.getEngineVolume() * 100));
  const [local, setLocal] = useState<PauseSettings>(() => ({ ...settings }));
  const patchPerf = (patch: Partial<PerformanceConfig>) => {
    applyGfxPatch(patch);
    setPerf({ ...performanceConfig });
  };
  const resetPerf = () => {
    applyGfxPatch({ ...DEFAULT_CONFIG });
    setPerf({ ...performanceConfig });
  };
  const gfxRow = (it: GfxItem): Row => {
    if (it.kind === 'tg') {
      return { t: 'tg', l: it.label, v: !!perf[it.key], set: v => patchPerf({ [it.key]: v } as Partial<PerformanceConfig>) };
    }
    if (it.kind === 'sld') {
      return { t: 'sld', l: it.label, v: perf[it.key], min: it.min, max: it.max, step: it.step, fmt: it.fmt,
        set: v => patchPerf({ [it.key]: v } as Partial<PerformanceConfig>) };
    }
    return { t: 'seg', l: it.label, v: perf[it.key], o: it.options, set: v => patchPerf({ [it.key]: v } as Partial<PerformanceConfig>) };
  };
  const patchGame = (patch: Partial<PauseSettings>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onUpdateSettings(next);
  };

  const rowsFor = (id: TabId): Row[] => {
    if (id === 'gfx') return [
      { t: 'seg', l: 'Быстрая настройка (пресет)', v: detectGraphicsPreset(perf), o: GFX_PRESET_OPTIONS,
        set: v => { applyGfxPreset(v as GraphicsPresetId); setPerf({ ...performanceConfig }); } },
      ...GFX_GROUPS.flatMap(g => g.items.map(gfxRow)),
      { t: 'btn', l: 'Параметры графики', label: 'Сбросить', act: resetPerf }
    ];
    if (id === 'sound') return [
      { t: 'tg', l: 'Звук включён', v: !muted, set: () => setMuted(sound.toggleMute()) },
      { t: 'sld', l: 'Общая громкость', v: masterVol, min: 0, max: 100, step: 1, fmt: v => v + '%', set: v => { setMasterVol(v); sound.setMasterVolume(v / 100); } },
      { t: 'sld', l: 'Двигатель', v: engineVol, min: 0, max: 100, step: 1, fmt: v => v + '%', set: v => { setEngineVol(v); sound.setEngineVolume(v / 100); } }
    ];
    if (id === 'ctrl') return [
      { t: 'sld', l: 'Чувствительность мыши', v: local.mouseSensitivity, min: 0.5, max: 2.5, step: 0.1, fmt: v => v.toFixed(1) + '×', set: v => patchGame({ mouseSensitivity: v }) },
      { t: 'keys', l: 'Газ / тормоз', k: ['W', 'S'] },
      { t: 'keys', l: 'Руль', k: ['A', 'D'] },
      { t: 'keys', l: 'Ручной тормоз', k: ['Пробел'] },
      { t: 'keys', l: 'Фары', k: ['L'] },
      { t: 'keys', l: 'Клаксон', k: ['H'] },
      { t: 'keys', l: 'Поворотники', k: ['Q', 'Z'] },
      { t: 'keys', l: 'Аварийка', k: ['X'] },
      { t: 'keys', l: 'Действие / сесть', k: ['E'] },
      { t: 'keys', l: 'Инвентарь', k: ['Tab'] },
      { t: 'keys', l: 'Осмотр тела', k: ['F'] },
      { t: 'keys', l: 'Карта (GPS)', k: ['M'] },
      { t: 'keys', l: 'Меню паузы', k: ['Esc'] }
    ];
    return [
      { t: 'seg', l: 'Автосохранение', v: local.autoSaveInterval, set: v => patchGame({ autoSaveInterval: v }),
        o: [{ v: 0, label: 'Выкл' }, { v: 15, label: '15 с' }, { v: 25, label: '25 с' }, { v: 60, label: '1 мин' }, { v: 120, label: '2 мин' }] },
      { t: 'tg', l: 'Смена дня и ночи', v: local.timeAutoCycle, set: v => patchGame({ timeAutoCycle: v }) },
      { t: 'seg', l: 'Лимит кадров', v: local.fpsLimit, set: v => patchGame({ fpsLimit: v }),
        o: [{ v: 30, label: '30' }, { v: 60, label: '60' }, { v: 120, label: '120' }, { v: 0, label: 'Max' }] }
    ];
  };

  /* ---------- онлайн ---------- */
  useEffect(() => {
    const bump = () => setTick(n => n + 1);
    const u1 = onlineManager.subscribe(bump);
    const u2 = subscribeHostSession(bump);
    return () => { u1(); u2(); };
  }, []);

  const [accessPref, setAccessPref] = useState<HostAccess>('all');
  const hs = getHostSession();
  const st = onlineManager.status;
  const connected = st === 'connected';
  const hostBusy = isHostSessionBusy();
  const isHost = connected && onlineManager.isHost;
  const sessionOn = connected || st === 'connecting' || hostBusy;
  const access: HostAccess = isHost ? (hs?.access ?? 'all') : accessPref;
  const maxPlayers = hs?.maxPlayers ?? DEFAULT_MAX_PLAYERS;
  const players = connected ? onlineManager.getRemotePlayersArray().length + 1 : 1;
  const onSub =
    st === 'connecting' ? 'Подключение к сети…'
      : st === 'error' ? (onlineManager.errorMessage || 'Не удалось открыть сессию.')
        : isHost ? 'Сессия открыта. Друзья могут войти по приглашению.'
          : connected ? 'Вы подключены к комнате ' + onlineManager.roomCode + '.'
            : 'Сессия закрыта. Вы играете один.';
  const toggleSession = () => {
    if (hostBusy) return;
    if (sessionOn) closeHostSession();
    else openHostSession({ access: accessPref });
  };
  const changeAccess = (v: HostAccess) => {
    setAccessPref(v);
    if (isHost) setHostAccess(v);
  };
  const copyCode = () => {
    if (!connected) return;
    try { navigator.clipboard.writeText(onlineManager.roomCode); } catch { /* ignore */ }
    setCopied(true);
    later(() => setCopied(false), 1600);
  };

  const uid = currentUser?.uid || '';
  const [friends, setFriends] = useState<FriendshipData[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfileData | null>>({});
  const [invited, setInvited] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!uid) { setFriends([]); return; }
    return subscribeToFriends(uid, setFriends);
  }, [uid]);
  useEffect(() => {
    if (!uid || friends.length === 0) { setProfiles({}); return; }
    let alive = true;
    const others = friends.map(f => (f.user1.uid === uid ? f.user2 : f.user1));
    const load = async () => {
      const entries = await Promise.all(others.map(async o => [o.uid, await fetchUserProfile(o.uid).catch(() => null)] as const));
      if (alive) setProfiles(Object.fromEntries(entries));
    };
    load();
    const iv = window.setInterval(load, 20000);
    return () => { alive = false; window.clearInterval(iv); };
  }, [uid, friends]);

  const onlineFriends = friends
    .map(f => {
      const other = f.user1.uid === uid ? f.user2 : f.user1;
      const prof = profiles[other.uid];
      const status = prof?.status || 'offline';
      return { uid: other.uid, name: prof?.nickname || other.nickname || other.name || 'Игрок', status, room: prof?.currentRoomCode || null };
    })
    .filter(f => f.status === 'online' || f.status === 'in_game');

  const invite = async (fUid: string) => {
    if (!uid || !connected || invited[fUid]) return;
    setInvited(m => ({ ...m, [fUid]: true }));
    try {
      await sendWorldInvite(uid, onlineManager.localPlayerName, fUid, onlineManager.roomCode, hs?.serverName || 'Сервер ' + onlineManager.localPlayerName);
    } catch {
      setInvited(m => ({ ...m, [fUid]: false }));
    }
  };

  /* ---------- производные подписи ---------- */
  const phase = dayPhase(session.timeHour);
  const vehicleLabel = session.vehicleName || 'Пешком';
  const where = session.locationName || MAP_NAME;
  const hintRight = minsSinceSave == null
    ? 'Сохранений в этой сессии ещё нет'
    : 'Последнее сохранение: ' + (minsSinceSave < 1 ? 'только что' : minsSinceSave + ' мин назад');

  const shown = cur ?? 'sum';
  const rows = rowsFor(tab);

  return (
    <ShadowHost css={pauseCss} zIndex={55} background="transparent">
      <div id="w" ref={wrapRef}>
        <div className={'gm' + (!entered || leaving ? ' gone' : '')} id="gm" ref={gmRef}>
          {/* фон поверх живой (замершей) игры — слои из макета */}
          <div className="a" style={{ inset: 0, background: 'radial-gradient(900px 520px at 70% 82%,rgba(201,146,43,.4),transparent 62%)' }} />
          <div className="a" style={{ inset: 0, background: 'rgba(9,9,10,.62)' }} />
          <div className="a" style={{ inset: 0, background: 'linear-gradient(90deg,rgba(9,9,10,.9),rgba(9,9,10,.45) 45%,transparent 80%)' }} />

          <div className="top">
            <div className="row2" style={{ alignItems: 'center', gap: 14 }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="#c9922b"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
              <span className="cn ttl">Пауза</span>
            </div>
            <div className="chip"><span className="dot" style={{ background: '#7fbf6a' }} /><span className="mut" style={{ fontSize: 14 }}>{where} · {phase} · {session.minutes} мин в игре</span></div>
          </div>

          <nav className="a" style={{ left: 64, top: 176, width: 420, display: 'flex', flexDirection: 'column', gap: 6 }} aria-label="Меню паузы">
            <button className="menu-i cn pri" onClick={leave}>
              <svg width="24" height="24" viewBox="0 0 16 16"><path d="M3 2l11 6-11 6z" fill="#c9922b" /></svg>В игру
            </button>
            <button className={'menu-i cn' + (cur === 'online' ? ' sel' : '')} onClick={() => show('online')}>
              <Ic><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16" /></Ic>Онлайн
            </button>
            <button className={'menu-i cn' + (cur === 'settings' ? ' sel' : '')} onClick={() => show('settings')}>
              <Ic><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></Ic>Настройки
            </button>
            <button className="menu-i cn" onClick={() => setConfirmExit(true)} style={{ marginTop: 14, color: '#a29e93' }}>
              <Ic c="#a29e93"><path d="M9 4H5v16h4M15 8l4 4-4 4M19 12H9" /></Ic>В меню
            </button>
          </nav>

          {/* сводка */}
          {shown === 'sum' && (
            <section className="pan panel fade" key="sum" style={{ padding: 14, left: 880, width: 496 }}>
              <div className="th" style={{ height: 230, borderRadius: 10 }}>
                {session.vehicleType && (
                  <div className="car">
                    <VehiclePreviewCanvas
                      carType={session.vehicleType}
                      color={session.vehicleColor || '#38bdf8'}
                      roofColor={session.vehicleRoofColor || session.vehicleColor || '#38bdf8'}
                      width={468}
                      height={230}
                      showPedestal={false}
                    />
                  </div>
                )}
              </div>
              <div style={{ padding: '16px 8px 6px' }}>
                <div className="cn mut" style={{ fontSize: 13 }}>Текущая сессия</div>
                <div className="cn" style={{ fontSize: 30, fontWeight: 700, marginTop: 4 }}>{where} · {phase}</div>
                <div className="mut" style={{ display: 'flex', gap: 22, marginTop: 10, fontSize: 14 }}><span>Карта: {MAP_NAME}</span><span>Авто: {vehicleLabel}</span></div>
                <div style={{ display: 'flex', gap: 34, marginTop: 20 }}>
                  <div><div className="stat-n">{fmtKm(session.distanceKm)}</div><div className="mut" style={{ fontSize: 12, marginTop: 4 }}>км пройдено</div></div>
                  <div><div className="stat-n">{Math.round(session.maxKmh)}</div><div className="mut" style={{ fontSize: 12, marginTop: 4 }}>макс. км/ч</div></div>
                  <div><div className="stat-n">{session.minutes}</div><div className="mut" style={{ fontSize: 12, marginTop: 4 }}>мин в игре</div></div>
                </div>
                <div className="row2" style={{ marginTop: 22 }}>
                  <button className="btn btn-p" onClick={leave}><svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 2l10 6-10 6z" fill="#1a1409" /></svg>Продолжить</button>
                  <button className="btn btn-s" onClick={quickSave}>{qsDone ? 'Сохранено' : 'Быстрое сохранение'}</button>
                </div>
              </div>
            </section>
          )}

          {/* онлайн */}
          {shown === 'online' && (
            <section className="pan fade" key="online" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="panel" style={{ padding: '8px 0' }}>
                <div className="set">
                  <div>
                    <div style={{ fontWeight: 600 }}>Открыть сессию для друзей</div>
                    <div className={st === 'error' ? 'err' : 'mut'} style={{ fontSize: 13 }}>{onSub}</div>
                  </div>
                  <button className={'tg' + (sessionOn ? ' on' : '')} role="switch" aria-checked={sessionOn} aria-label="Открыть сессию" onClick={toggleSession} disabled={hostBusy} />
                </div>
              </div>
              <div id="onBody" className={isHost ? '' : 'dim'} style={{ display: 'flex', gap: 20 }}>
                <div className="panel" style={{ flex: 1, padding: '8px 0' }}>
                  <div className="set"><span>Кто может войти</span><Seg value={access} onChange={changeAccess} options={[{ v: 'all', label: 'Все' }, { v: 'code', label: 'По коду' }]} /></div>
                  <div className="set">
                    <span>Код приглашения</span>
                    <div className="row2" style={{ alignItems: 'center', gap: 12 }}>
                      <span className="cn" style={{ fontSize: 22, fontWeight: 700, color: '#e0ab45' }}>{connected ? onlineManager.roomCode : '—'}</span>
                      <button className="btn btn-s btn-sm" onClick={copyCode} disabled={!connected}>{copied ? 'Скопировано' : 'Копировать'}</button>
                    </div>
                  </div>
                  <div className="set"><span>Игроков в сессии</span><b>{players} / {maxPlayers}</b></div>
                </div>
                <div className="panel" style={{ flex: 1, padding: '16px 22px 8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span className="cn" style={{ fontSize: 20, fontWeight: 700 }}>Друзья в сети</span>
                    <span className="mut" style={{ fontSize: 13 }}>{currentUser ? onlineFriends.length : ''}</span>
                  </div>
                  <div id="frl" className="scroll" style={{ marginTop: 6 }}>
                    {!currentUser ? (
                      <div className="empty"><div className="mut">Войдите через Google, чтобы видеть друзей.</div></div>
                    ) : onlineFriends.length === 0 ? (
                      <div className="empty"><div className="mut">Сейчас никого из друзей нет в сети.</div></div>
                    ) : onlineFriends.map(f => (
                      <div className="fr" key={f.uid}>
                        <span className="av" style={{ background: avatarColor(f.name) }}>{f.name.charAt(0).toUpperCase()}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                          <div className="mut" style={{ fontSize: 13 }}>{f.status === 'in_game' && f.room ? 'В игре: ' + f.room : 'В сети'}</div>
                        </div>
                        <button className="btn btn-s btn-sm" onClick={() => invite(f.uid)} disabled={!connected || !!invited[f.uid]}>{invited[f.uid] ? 'Отправлено' : 'Позвать'}</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {onOpenServers && (
                <div className="row2"><button className="btn btn-s" onClick={onOpenServers}>Найти сервер в каталоге</button></div>
              )}
            </section>
          )}

          {/* настройки */}
          {shown === 'settings' && (
            <section className="pan fade" key="settings">
              <div className="tb">
                {TABS.map(([id, label]) => (
                  <button key={id} className={'tab cn' + (id === tab ? ' tab-on' : '')} onClick={() => setTab(id)}>{label}</button>
                ))}
              </div>
              <div className="panel scroll" id="rows" style={{ padding: '8px 0' }}>
                {rows.map((r, i) => (
                  <div className="set" key={tab + i}>
                    <span>{r.l}</span>
                    {r.t === 'tg' && <button className={'tg' + (r.v ? ' on' : '')} role="switch" aria-checked={r.v} aria-label={r.l} onClick={() => r.set(!r.v)} />}
                    {r.t === 'seg' && <Seg value={r.v} onChange={r.set} options={r.o} />}
                    {r.t === 'sld' && (
                      <div className="sld">
                        <Track label={r.l} value={r.v} min={r.min} max={r.max} step={r.step} onChange={r.set} />
                        <span className="sld-v">{r.fmt(r.v)}</span>
                      </div>
                    )}
                    {r.t === 'keys' && <span className="kv">{r.k.map(k => <span className="key" key={k}>{k}</span>)}</span>}
                    {r.t === 'btn' && <button className="btn btn-s btn-sm" onClick={r.act}>{r.label}</button>}
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="hint">
            <div style={{ display: 'flex', alignItems: 'center' }}><span className="key">↑↓</span>Навигация<span className="key">Enter</span>Выбрать<span className="key">Esc</span>В игру</div>
            <div>{hintRight}</div>
          </div>

          {/* подтверждение выхода */}
          {confirmExit && (
            <div id="mod">
              <EscWhileMounted onEscape={() => setConfirmExit(false)} />
              <div className="panel fade" role="dialog" aria-modal="true" aria-labelledby="mt" style={{ width: 540, padding: '30px 32px' }}>
                <div className="cn" id="mt" style={{ fontSize: 30, fontWeight: 700 }}>Выйти в главное меню?</div>
                <div className="mut" style={{ marginTop: 10, lineHeight: 1.5 }}>
                  {minsSinceSave == null
                    ? 'В этой сессии ещё не было сохранений. Если выйти без сохранения, прогресс будет потерян.'
                    : minsSinceSave < 1
                      ? 'С последнего сохранения прошло меньше минуты. Если выйти без сохранения, прогресс за это время будет потерян.'
                      : 'С последнего сохранения прошло ' + minsSinceSave + ' ' + plural(minsSinceSave, ['минута', 'минуты', 'минут']) + '. Если выйти без сохранения, прогресс за это время будет потерян.'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 26 }}>
                  <button className="btn btn-p" onClick={() => exitTo(true)}>Сохранить и выйти</button>
                  <button className="btn btn-s" onClick={() => exitTo(false)} style={{ color: '#e08a70' }}>Выйти без сохранения</button>
                  <button className="btn btn-s" onClick={() => setConfirmExit(false)} autoFocus>Отмена</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div id="rot"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#e0ab45" strokeWidth="1.6"><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" /></svg><span>Поверните устройство горизонтально</span></div>
    </ShadowHost>
  );
};
