import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import vehicleCss from './vehicleSelect.css?inline';
import { ShadowHost, attachStageFit } from './ShadowHost';
import { useTopmostEscape } from './gameUi';
import { VehiclePreviewCanvas } from './VehiclePreviewCanvas';
import { VEHICLE_CATALOG, type VehicleCatalogEntry, type VehicleCategory } from '../vehicleCatalog';
import { CAR_CONFIGS, getVehicleDriveType } from '../vehicleHelpers';
import { SPAWN_LOCATIONS } from '../spawnLocations';

export interface VehicleSelectResult {
  spawnId: string;
  saveName: string;
  vehicleType: string;
  vehicleColor: string;
}

interface VehicleSelectProps {
  defaultSpawnId?: string;
  onBack: () => void;
  onStart: (result: VehicleSelectResult) => void;
}

/* ------------------------------------------------------------------ */
/* real data helpers                                                   */
/* ------------------------------------------------------------------ */

const FILTERS: { id: 'all' | VehicleCategory; label: string }[] = [
  { id: 'all', label: 'Все авто' },
  { id: 'passenger', label: 'Легковые' },
  { id: 'sport', label: 'Спорт' },
  { id: 'suv', label: '4x4' },
  { id: 'commercial', label: 'Грузовые' },
  { id: 'special', label: 'Спецтехника' },
  { id: 'emergency', label: 'Службы' },
  { id: 'bus', label: 'Автобусы' }
];
const TR_LABEL = { AUTO: 'Автомат', MANUAL: 'Механика' } as const;
const TR_OPTIONS = ['Механика', 'Автомат'];
const DR_OPTIONS = ['FWD', 'RWD', 'AWD'];
const SPAWN_CAT: Record<string, string> = { city: 'Город', highway: 'Трасса', nature: 'Природа', mountain: 'Горы', industrial: 'Промзона' };

const transmissionOf = (c: VehicleCatalogEntry) => TR_LABEL[CAR_CONFIGS[c.type]?.transmission || 'AUTO'];
const driveOf = (c: VehicleCatalogEntry) => getVehicleDriveType(c.type);
const shortSpawn = (name: string) => name.split('(')[0].trim();
const colorCount = (c: VehicleCatalogEntry) => c.colors.length;

const chev = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a29e93" strokeWidth="2.6"><path d="M9 5l7 7-7 7" /></svg>
);

const Car: React.FC<{ c: VehicleCatalogEntry; color: string; roof?: string; w: number; h: number }> = ({ c, color, roof, w, h }) => (
  <VehiclePreviewCanvas carType={c.type} color={color} roofColor={roof || color} width={w} height={h} showPedestal={false} />
);

/* tree pieces live at module level so their DOM survives re-renders (keeps the expand animation) */
const TreeCtx = React.createContext<{ open: Record<string, boolean>; toggle: (id: string) => void }>({ open: {}, toggle: () => {} });

const Node: React.FC<{ id: string; n: string; v: string; children: React.ReactNode }> = ({ id, n, v, children }) => {
  const { open, toggle } = React.useContext(TreeCtx);
  return (
    <div className={'nd' + (open[id] ? ' on' : '')}>
      <button className="nh" aria-expanded={!!open[id]} onClick={() => toggle(id)}>{chev}<span className="cn">{n}</span><span className="v">{v}</span></button>
      <div className="nb"><div className="ni"><div className="nc">{children}</div></div></div>
    </div>
  );
};

const ReadSeg: React.FC<{ label: string; options: string[]; value: string }> = ({ label, options, value }) => (
  <div className="lf ro">
    <div className="lbl">{label}</div>
    <div className="seg">{options.map(o => <span key={o} className={o === value ? 'on' : 'dis'}>{o}</span>)}</div>
  </div>
);

const Fact: React.FC<{ l: string; v: string }> = ({ l, v }) => (<div className="lf tr"><span>{l}</span><b>{v}</b></div>);

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

export const VehicleSelect: React.FC<VehicleSelectProps> = ({ defaultSpawnId, onBack, onStart }) => {
  const [filt, setFilt] = useState<'all' | VehicleCategory>('all');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'cars' | 'cfgs'>('cars');
  const [ci, setCi] = useState(0);        // index in VEHICLE_CATALOG
  const [color, setColor] = useState(0);  // index in the vehicle's colours
  const [spawn, setSpawn] = useState(() => {
    if (defaultSpawnId) {
      const idx = SPAWN_LOCATIONS.findIndex(s => s.id === defaultSpawnId);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });
  const [open, setOpen] = useState<Record<string, boolean>>({ look: true, paint: true });
  const [animate, setAnimate] = useState(true);
  const gmRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => attachStageFit(() => wrapRef.current, () => gmRef.current), []);
  useEffect(() => { const t = window.setTimeout(() => setAnimate(false), 900); return () => window.clearTimeout(t); }, []);

  const vis = useMemo(() => {
    const q = query.trim().toLowerCase();
    return VEHICLE_CATALOG
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => (filt === 'all' || c.category === filt)
        && (!q || c.nameRu.toLowerCase().includes(q) || c.brand.toLowerCase().includes(q) || c.classType.toLowerCase().includes(q)));
  }, [filt, query]);

  // keep the selection inside the filtered list (like the mock-up does)
  useEffect(() => {
    if (view === 'cars' && vis.length > 0 && !vis.some(v => v.i === ci)) { setCi(vis[0].i); setColor(0); }
  }, [vis, view, ci]);

  const car = VEHICLE_CATALOG[ci];
  const colors = car.colors;
  const col = colors[Math.min(color, colors.length - 1)];
  const colHex = col.hex;
  const colRoof = col.roofHex || col.hex;
  const loc = SPAWN_LOCATIONS[spawn] || SPAWN_LOCATIONS[0];
  const trans = transmissionOf(car);
  const drive = driveOf(car);

  const setCar = (i: number) => { setCi(i); setColor(0); };
  const drill = (i: number) => { setCar(i); setAnimate(true); setView('cfgs'); };
  const back = () => {
    if (view === 'cfgs') { setAnimate(true); setView('cars'); }
    else onBack();
  };
  const reset = () => { setColor(0); };
  const pick = () => onStart({ spawnId: loc.id, saveName: 'Freeroam: ' + car.nameRu, vehicleType: car.type, vehicleColor: colHex });

  useTopmostEscape(back);

  // scroll the selected card into view while moving with the arrows
  useEffect(() => {
    if (view !== 'cars') return;
    const el = gmRef.current?.querySelector<HTMLElement>('[data-car="' + ci + '"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [ci, view]);

  /* ---------- keyboard ---------- */
  const latest = useRef({ view, vis, ci, color, colors, drill, pick });
  latest.current = { view, vis, ci, color, colors, drill, pick };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const L = latest.current;
      const gm = gmRef.current;
      const rn = gm?.getRootNode() as ShadowRoot | undefined;
      const active = rn?.activeElement as HTMLElement | null | undefined;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.getAttribute('role') === 'slider')) return;
      const step = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 } as Record<string, number>)[e.key];
      if (step) {
        e.preventDefault();
        if (L.view === 'cars') {
          const p = L.vis.findIndex(v => v.i === L.ci) + step;
          if (p >= 0 && p < L.vis.length) { setCi(L.vis[p].i); setColor(0); }
        } else {
          const q = L.color + (Math.abs(step) === 4 ? step / 4 : step);
          if (q >= 0 && q < L.colors.length) setColor(q);
        }
      } else if (e.key === 'Enter' && !(active && active.closest('button'))) {
        if (L.view === 'cars') { if (L.vis.some(v => v.i === L.ci)) L.drill(L.ci); } else L.pick();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ---------- tree ---------- */
  const toggle = (id: string) => setOpen(o => ({ ...o, [id]: !o[id] }));

  const rz = animate ? ' rise' : '';

  return (
    <ShadowHost css={vehicleCss} zIndex={52}>
      <TreeCtx.Provider value={{ open, toggle }}>
      <div id="w" ref={wrapRef}>
        <div className="gm" id="gm" ref={gmRef}>
          <div className="a" style={{ inset: 0, background: 'linear-gradient(180deg,#17140f,#2b2218 58%,#120f0b)' }} />
          <div className="a" style={{ inset: 0, background: 'radial-gradient(900px 520px at 70% 82%,rgba(201,146,43,.34),transparent 62%)' }} />
          <svg className="a" style={{ left: 0, top: 0 }} width="1440" height="900" viewBox="0 0 1440 900" preserveAspectRatio="none"><path d="M0 700 220 590 420 680 640 570 860 690 1060 610 1260 700 1440 630V900H0Z" fill="#1a140e" opacity=".9" /><path d="M0 800 300 750 620 800 980 760 1440 810V900H0Z" fill="#0f0c09" /></svg>
          <div className="a" style={{ inset: 0, background: 'rgba(9,9,10,.5)' }} />
          <div className="a" style={{ left: 0, right: 0, top: 0, height: 140, background: 'linear-gradient(180deg,rgba(0,0,0,.5),transparent)' }} />

          <div className="top">
            <div className="row2" style={{ alignItems: 'center', gap: 16 }}>
              <button className="chip back" onClick={back} aria-label="Назад"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e9e6df" strokeWidth="2"><path d="M15 5l-7 7 7 7" /></svg></button>
              <span className="cn ttl">Выбор автомобиля</span>
            </div>
            {view === 'cars' && (
              <div className="chip" style={{ width: 240 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a29e93" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M16 16l5 5" /></svg>
                <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.stopPropagation()} placeholder="Поиск авто..." aria-label="Поиск авто" />
              </div>
            )}
            <div className="row2" style={{ alignItems: 'center', gap: 22 }}>
              <div className="mut" style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <b style={{ color: view === 'cars' ? '#e0ab45' : '#a29e93' }}>1</b> Автомобиль <span style={{ width: 28, height: 1, background: 'rgba(255,255,255,.25)' }} /> <b style={{ color: view === 'cfgs' ? '#e0ab45' : '#a29e93' }}>2</b> Комплектация
              </div>
              <div className="chip"><span className="cth g0" style={{ width: 28, height: 28, borderRadius: 7 }} /><span className="nm" style={{ fontWeight: 500, maxWidth: 210 }}>{shortSpawn(loc.nameRu)}</span></div>
            </div>
          </div>

          <div className="a" style={{ left: 64, top: 112, width: 880 }}>
            <div id="lh" style={{ display: 'flex', alignItems: 'center', gap: 10, height: 34, marginBottom: 20 }}>
              {view === 'cars' ? (
                <>
                  {FILTERS.map(f => (
                    <button key={f.id} className={'pill' + (f.id === filt ? ' pill-on' : '')} onClick={() => setFilt(f.id)}>{f.label}</button>
                  ))}
                </>
              ) : (
                <>
                  <button className="pill" onClick={back}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ marginRight: 6 }}><path d="M15 5l-7 7 7 7" /></svg>Автомобили</button>
                  <span className="cn" style={{ fontSize: 22, fontWeight: 700, marginLeft: 6 }}>{car.nameRu}</span>
                  <span className="mut">выберите комплектацию</span>
                </>
              )}
            </div>
            <div id="grid" className="scroll" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gridAutoRows: 262, gap: 20, alignContent: 'start' }}>
              {view === 'cars' ? (
                vis.length === 0 ? (
                  <div className="mut" style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center' }}>Ничего не найдено</div>
                ) : vis.map(({ c, i }, n) => (
                  <button key={c.type} className={'card' + rz + (i === ci ? ' card-on' : '')} data-car={i} onClick={() => drill(i)} style={{ animationDelay: Math.min(n, 12) * 40 + 'ms' }} title={c.nameRu}>
                    <div className={'cth g' + (i % 8)} style={{ height: 170 }}><div style={{ width: '84%', display: 'flex', justifyContent: 'center' }}><Car c={c} color={c.colors[0].hex} roof={c.colors[0].roofHex} w={170} h={150} /></div></div>
                    <div style={{ padding: '12px 14px' }}>
                      <div className="cn nm2" style={{ fontSize: 18, fontWeight: 700 }}>{c.nameRu}</div>
                      <div className="mut nm" style={{ fontSize: 13, marginTop: 4 }}>{colorCount(c)} компл. · {c.classType}</div>
                    </div>
                  </button>
                ))
              ) : colors.map((cl, i) => (
                <button key={cl.hex + i} className={'card' + rz + (i === color ? ' card-on' : '')} data-cfg={i} onClick={() => setColor(i)} style={{ animationDelay: Math.min(i, 12) * 40 + 'ms' }} title={cl.name}>
                  <div className={'cth g' + (ci % 8)} style={{ height: 170 }}><div style={{ width: '84%', display: 'flex', justifyContent: 'center' }}><Car c={car} color={cl.hex} roof={cl.roofHex} w={170} h={150} /></div></div>
                  <div style={{ padding: '12px 14px' }}>
                    <div className="cn nm2" style={{ fontSize: 18, fontWeight: 700 }}>{cl.name}</div>
                    <div className="mut nm" style={{ fontSize: 13, marginTop: 4 }}>{car.powerHp} л.с. · {trans} · {drive}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <aside className="panel a" style={{ left: 976, top: 112, width: 400, height: 730, padding: 14, display: 'flex', flexDirection: 'column' }}>
            <div className={'cth g' + (ci % 8)} id="pvbox" style={{ height: 150, borderRadius: 9, flex: 'none' }}>
              <div id="pv" style={{ width: '84%', display: 'flex', justifyContent: 'center' }}><Car c={car} color={colHex} roof={colRoof} w={340} h={200} /></div>
            </div>
            <div style={{ padding: '14px 10px 0' }}>
              <div className="cn mut" style={{ fontSize: 12 }}>Выбранный автомобиль</div>
              <div className="cn" id="cName" style={{ fontSize: 28, fontWeight: 700, marginTop: 2, lineHeight: 1.1 }}>{car.nameRu}</div>
              <div className="mut" id="cSub" style={{ fontSize: 13, marginTop: 4 }}>{col.name} · {car.powerHp} л.с. · {trans} · {drive}</div>
            </div>
            <div className="tree" id="tree">
              <Node id="cfg" n="Комплектация" v={col.name}>
                <div className="lf" id="cfgOpts">
                  {colors.map((cl, i) => (
                    <button key={cl.hex + i} className={'opt' + (i === color ? ' on' : '')} onClick={() => setColor(i)}>
                      <span style={{ fontWeight: 600 }}>{cl.name}</span><span className="sdot" style={{ background: cl.hex }} />
                    </button>
                  ))}
                </div>
              </Node>
              <Node id="pt" n="Силовая часть" v={car.powerHp + ' л.с.'}>
                <div className="lf ro"><div className="lbl">Мощность</div><div className="seg"><span className="on">{car.powerHp} л.с.</span></div></div>
                <ReadSeg label="Трансмиссия" options={TR_OPTIONS} value={trans} />
                <ReadSeg label="Привод" options={DR_OPTIONS} value={drive} />
              </Node>
              <Node id="look" n="Внешний вид" v={col.name}>
                <Node id="paint" n="Окраска" v={col.name}>
                  <div className="lf">
                    <div className="lbl">Цвет</div>
                    <div className="sw">
                      {colors.map((cl, i) => (
                        <button key={cl.hex + i} className={i === color ? 'on' : ''} onClick={() => setColor(i)} title={cl.name} aria-label={cl.name} style={{ background: cl.hex }} />
                      ))}
                    </div>
                  </div>
                </Node>
              </Node>
              <Node id="spec" n="Характеристики" v={car.topSpeedKmh + ' км/ч'}>
                <div className="spec">{car.descriptionRu}</div>
                <Fact l="Макс. скорость" v={car.topSpeedKmh + ' км/ч'} />
                <Fact l="Масса" v={car.weightKg + ' кг'} />
                <Fact l="Двигатель" v={car.engineSpec || '—'} />
                <Fact l="Топливо" v={car.fuelTypeLabel} />
              </Node>
              <Node id="spawn" n="Точка старта" v={shortSpawn(loc.nameRu)}>
                <div className="lf">
                  {SPAWN_LOCATIONS.map((s, i) => (
                    <button key={s.id} className={'opt' + (i === spawn ? ' on' : '')} onClick={() => setSpawn(i)}>
                      <span style={{ fontWeight: 600, textAlign: 'left' }}>{shortSpawn(s.nameRu)}</span>
                      <span className="mut" style={{ fontSize: 13, marginLeft: 10, flex: 'none' }}>{SPAWN_CAT[s.category || ''] || ''}</span>
                    </button>
                  ))}
                </div>
              </Node>
            </div>
            <div className="row2" style={{ marginTop: 14, gap: 10 }}>
              <button className="btn btn-s" onClick={reset}>Сбросить</button>
              <button className="btn btn-p" onClick={pick} style={{ flex: 1 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1409" strokeWidth="3"><path d="M5 12l5 5 9-10" /></svg>Выбрать
              </button>
            </div>
          </aside>

          <div className="hint">
            <div style={{ display: 'flex', alignItems: 'center' }}><span className="key">←↑↓→</span>Навигация<span className="key">Enter</span>Выбрать<span className="key">Esc</span>Назад</div>
            <div>Старт: {shortSpawn(loc.nameRu)}</div>
          </div>
        </div>
      </div>
      </TreeCtx.Provider>
      <div id="rot"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#e0ab45" strokeWidth="1.6"><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" /></svg><span>Поверните устройство горизонтально</span></div>
    </ShadowHost>
  );
};
