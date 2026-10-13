import React, { useState, useEffect, useRef } from 'react';
import { formatGameDate, formatGameTime } from '../calendarSystem';

export interface SaveSlot {
  id: string;
  name: string;
  date: string;
  playerX: number;
  playerY: number;
  playerAngle?: number;
  isInVehicle: boolean;
  currentVehicleId: string | null;
  timeHour: number;
  weather: string;
  streetName: string;
  calendar?: any;
  season?: string;
  gpsDestination?: any;
  needs?: any;
  inventory?: any;
}

export interface SpawnLocation {
  id: string;
  name: string;
  nameRu: string;
  x: number;
  y: number;
  description: string;
  icon: React.ReactNode;
}

interface MainMenuProps {
  onResume: () => void;
  onNewGame?: (saveName: string) => void;
}

const DEFAULT_SPAWNS: SpawnLocation[] = [
  { id: 'central_park', name: 'Central Park Promenade', nameRu: 'Городской Сквер', x: 4400, y: 2800, description: 'Парковый фонтан, аллеи и кольцевые проезды.', icon: null },
  { id: 'downtown_plaza', name: 'Downtown Commercial Plaza', nameRu: 'Площадь Администрации', x: 4350, y: 2000, description: 'Центр города, парковка и широкий проспект.', icon: null },
  { id: 'residential_courtyard', name: 'Residential Courtyard', nameRu: 'Жилой Двор', x: 2750, y: 2750, description: 'Панельные пятиэтажки и гаражи.', icon: null },
  { id: 'industrial_district', name: 'Freight Logistics Yard', nameRu: 'Промзона', x: 6530, y: 1030, description: 'Ангары, склады и бетонные плиты.', icon: null }
];

const LOADING_TIPS = [
  'Совет: следите за уровнем моторного масла и температурой охлаждающей жидкости.',
  'Совет: стояночный ручной тормоз (Пробел) помогает при резких поворотах и парковке.',
  'Совет: заправляйте автомобиль подходящей маркой топлива на АЗС (АИ-92, АИ-95, ДТ).'
];

// Menu state - adapted from menu.html
var selectedMapIdx = 0;
var selectedSaveIdx = 0;
var selectedSrvIdx = 0;
var serverFilter = 'all';
var vsync = 1;
var refl = 1;
var blur = 0;

// Navigation state from menu.html
var POS = { main: 0, 'new': 1, saves: 2, servers: 3, account: 4, settings: 5, notif: 1, create: 4 };
var cur = 'main', busy = false;

// Screens references
var screens: any = {};

function goReact(t: string, back: boolean = false) {
  if (busy || t === cur) return;
  busy = true;
  
  // Hide current screen, show next
  Object.values(screens).forEach((scr: any) => {
    if (scr) scr.classList.add('out');
  });
  
  // Update transform
  var gm = document.querySelector('.gm');
  if (gm) {
    gm.className = 'gm p' + POS[t];
    
    // Wipe transition
    var wipe = document.querySelector('.wipe');
    if (wipe) {
      wipe.classList.remove('on'); void wipe.offsetWidth; wipe.classList.add('on');
    }
  }
  
  setTimeout(() => {
    Object.values(screens).forEach((scr: any) => {
      if (scr) scr.classList.remove('on', 'out');
    });
    
    // Show new screen
    if (screens[t]) {
      screens[t].classList.add('on');
    }
    
    cur = t;
    busy = false;
  }, 270);
}

// Initialize menu from menu.html template
document.addEventListener('DOMContentLoaded', function() {
  var host = document.getElementById('gm');
  var r = host; // No attachShadow - just use regular DOM
  
  // Cache screen references
  screens = {
    main: $('#s-main'),
    saves: $('#s-saves'),
    new: $('#s-new'),
    servers: $('#s-servers'),
    account: $('#s-account'),
    settings: $('#s-settings'),
    notif: $('#s-notif'),
    create: $('#s-create')
  };
  
  // Lists from menu.html
  
  // MAPS
  $('#maps').innerHTML = [
    ['Каньон', 'Серпантины, 94 км дорог', 'm1'], ['Побережье', 'Скоростные трассы', 'm2'],
    ['Северный лес', 'Грунтовки и лесовозы', 'm3'], ['Город', 'Плотный трафик', 'm4'],
    ['Перевал', 'Горы, снег, туман', 'm5'], ['Солончак', 'Открытое пространство', 'm6'],
    ['Полигон', 'Тесты и трюки', 'm7'], ['Остров', 'Побережье и бездорожье', 'm8']
  ].map(function (m, i) {
    return '<button class="card st d' + Math.min(i + 2, 9) + (i ? '' : ' card-on') + '" data-i="' + i + '"><div class="th ' + m[2] + '" style="height:170px"></div><div style="padding:12px 14px"><div class="cn" style="font-size:20px;font-weight:700">' + m[0] + '</div><div class="mut" style="font-size:13px;margin-top:4px">' + m[1] + '</div></button>';
  }).join('');
  
  // SAVES
  $('#saves').innerHTML = [
    ['Серпантин · утро', 'Каньон', '14 ч 20 мин', '2 ч назад', 'm1'], ['Дорога вдоль берега', 'Побережье', '31 ч 05 мин', 'Вчера', 'm2'],
    ['Лесовоз · испытания', 'Северный лес', '8 ч 40 мин', '3 дня назад', 'm3'], ['Ночной город', 'Город', '19 ч 15 мин', '5 дней назад', 'm4'],
    ['Зимний перевал', 'Перевал', '6 ч 10 мин', '12 окт', 'm5'], ['Рекорд скорости', 'Солончак', '3 ч 55 мин', '2 окт', 'm6'],
    ['Остров · отпуск', 'Остров', '11 ч 30 мин', '28 сен', 'm8']
  ].map(function (v, i) {
    return '<button class="card st d' + (i + 1) + (i ? '' : ' card-on') + '" data-i="' + i + '"><div class="th ' + v[4] + '" style="height:178px"></div><div style="padding:14px 16px"><div class="cn" style="font-size:22px;font-weight:700">' + v[0] + '</div><div class="meta"><span>' + v[1] + '</span><span>' + v[2] + '</span></div><div class="meta"><span>' + v[3] + '</span><span class="mk" style="color:#e0ab45">' + (i ? '' : 'Выбрано') + '</span></div></button>';
  }).join('') + '<div class="st d8" style="height:100%"><button class="card-new" data-go="new"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#e0ab45" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg><span class="cn" style="font-size:20px;font-weight:600">Новая сессия</span></button></div>';
  
  var FR_NAMES = ['Alex_Dune', 'MariaK', 'tormoz_pro'];
  var FILTERS: any = {
    all: function () { return true; },
    fav: function (v: any) { return !!v[7]; },
    recent: function (v: any, i: number) { return i < 4; },
    friends: function (v: any) { return FR_NAMES.indexOf(v[1]) > -1; }
  };
  
  function renderSrv(f: string) {
    var pred = FILTERS[f || 'all'];
    $('#srvlist').innerHTML = [
      ['Перевал · свободная езда', 'Alex_Dune', 'Перевал', 14, 24, 32, 0, 1, 'm5', 'Спокойная езда по серпантину без ограничений. Столкновения включены, без ночного режима.'],
      ['Дрифт-площадка №2', 'driftclub', 'Полигон', 22, 32, 41, 0, 0, 'm7', 'Открытая площадка для дрифта. Новичкам рады, правила в чате.'],
      ['Каньон: ралли-вечер', 'MariaK', 'Каньон', 8, 16, 55, 1, 0, 'm1', 'Закрытая гонка по каньону на закате. Вход по паролю от хоста.'],
      ['Город · неспешная езда', 'night_cruise', 'Город', 31, 32, 78, 0, 0, 'm4', 'Ночные покатушки по городу. Сервер почти полон.'],
      ['Грузовики и бездорожье', 'heavy_duty', 'Солончак', 5, 20, 92, 0, 0, 'm6', 'Тяжелая техника, груз и свободные просторы.'],
      ['Тест подвески (моды)', 'lab_rat', 'Полигон', 3, 8, 104, 1, 0, 'm7', 'Лаборатория для тестов. Требуются установленные моды.'],
      ['Горный серпантин', 'pass_hunter', 'Перевал', 11, 16, 148, 0, 0, 'm5', 'Горные дороги, снег и туман. Высокий пинг для вашего региона.'],
      ['Остров · фотосессия', 'lenscape', 'Остров', 2, 12, 163, 0, 0, 'm8', 'Тихий сервер для съёмки и скриншотов.']
    ].map(function (v: any, i: number) {
      if (!pred(v, i)) return '';
      return '<button class="row rw" data-i="' + i + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="' + (v[7] ? '#e0ab45' : 'none') + '" stroke="' + (v[7] ? '#e0ab45' : '#6f6c65') + '" stroke-width="2"><path d="M12 3l2.5 6 6 .5-4.6 4 1.5 6.2L12 16.5 6.6 19.7l1.5-6.2-4.6-4 6-.5z"/></svg><div><div style="font-weight:600">' + v[0] + '</div><div class="mut" style="font-size:12px">Хост: ' + v[1] + '</div></div><span>' + v[2] + '</span><span>' + v[3] + ' / ' + v[4] + '</span><span class="' + (v[5] < 60 ? 'pg' : v[5] < 120 ? 'py' : 'pr') + '">' + v[5] + '</span><span>' + (v[6] ? '🔒' : '') + '</span></button>';
    }).join('');
  }
  renderSrv('all');
  
  // BADGES
  $('#badges').innerHTML = [
    'M12 6v6l3 2M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18',
    'M3 18l6-10 4 6 3-4 5 8z',
    'M4 16h16M6 16l1-5h10l1 5M8 19h.01M16 19h.01',
    'M12 3l2.5 6 6 .5-4.6 4 1.5 6.2L12 16.5 6.6 19.7l1.5-6.2-4.6-4 6-.5z',
    'M7 11h10v9H7zM9 11V8a3 3 0 0 1 6 0v3',
    'M7 11h10v9H7zM9 11V8a3 3 0 0 1 6 0v3',
    'M7 11h10v9H7zM9 11V8a3 3 0 0 1 6 0v3',
    'M7 11h10v9H7zM9 11V8a3 3 0 0 1 6 0v3'
  ].map(function (d: string, i: number) {
    var on = i < 4;
    return '<div class="badge' + (on ? '' : ' badge-off') + '"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="' + (on ? '#e0ab45' : '#6f6c65') + '" stroke-width="1.8"><path d="' + d + '"/></svg></div>';
  }).join('');
  
  // FRIENDS
  $('#friends').innerHTML = [
    ['А', '#e0ab45', 'Alex_Dune', 'На сервере «Перевал»', '#7fbf6a'],
    ['М', '#c9b98f', 'MariaK', 'Свободная езда', '#7fbf6a'],
    ['Т', '#b98a4a', 'tormoz_pro', 'В главном меню', '#7fbf6a'],
    ['Д', '#4a4741', 'Dimitri', 'Был в сети вчера', '#5c5a54']
  ].map(function (f: any) {
    return '<div class="fr"><span class="av" style="background:' + f[1] + '">' + f[0] + '</span><div style="flex:1"><div style="font-weight:600">' + f[2] + '</div><div class="mut" style="font-size:13px">' + f[3] + '</div></div><span class="dot" style="background:' + f[4] + '"></span></div>';
  }).join('');
  
  // SELECTION HANDLERS
  
  function setMap(i: number) {
    var m = [
      ['Каньон', 'Серпантины, 94 км дорог', 'm1'], ['Побережье', 'Скоростные трассы', 'm2'],
      ['Северный лес', 'Грунтовки и лесовозы', 'm3'], ['Город', 'Плотный трафик', 'm4'],
      ['Перевал', 'Горы, снег, туман', 'm5'], ['Солончак', 'Открытое пространство', 'm6'],
      ['Полигон', 'Тесты и трюки', 'm7'], ['Остров', 'Побережье и бездорожье', 'm8']
    ][i];
    [].forEach.call($('#maps').children, function (c: any, j: number) { c.classList.toggle('card-on', j === i); });
    $('#mThumb').className = 'th ' + m[2];
    $('#mName').textContent = m[0];
    $('#nName').textContent = m[0] + ' · первая поездка';
  }
  
  function setSave(i: number) {
    [].forEach.call($('#saves').querySelectorAll('.card'), function (c: any, j: number) {
      c.classList.toggle('card-on', j === i);
      c.querySelector('.mk').textContent = j === i ? 'Выбрано' : '';
    });
    $('#saveSel').textContent = [
      ['Серпантин · утро', 'Каньон', '14 ч 20 мин', '2 ч назад', 'm1'], ['Дорога вдоль берега', 'Побережье', '31 ч 05 мин', 'Вчера', 'm2'],
      ['Лесовоз · испытания', 'Северный лес', '8 ч 40 мин', '3 дня назад', 'm3'], ['Ночной город', 'Город', '19 ч 15 мин', '5 дней назад', 'm4'],
      ['Зимний перевал', 'Перевал', '6 ч 10 мин', '12 окт', 'm5'], ['Рекорд скорости', 'Солончак', '3 ч 55 мин', '2 окт', 'm6'],
      ['Остров · отпуск', 'Остров', '11 ч 30 мин', '28 сен', 'm8']
    ][i][0];
  }
  
  function setSrv(i: number) {
    var SRV: any = [
      ['Перевал · свободная езда', 'Alex_Dune', 'Перевал', 14, 24, 32, 0, 1, 'm5', 'Спокойная езда по серпантину без ограничений. Столкновения включены, без ночного режима.'],
      ['Дрифт-площадка №2', 'driftclub', 'Полигон', 22, 32, 41, 0, 0, 'm7', 'Открытая площадка для дрифта. Новичкам рады, правила в чате.'],
      ['Каньон: ралли-вечер', 'MariaK', 'Каньон', 8, 16, 55, 1, 0, 'm1', 'Закрытая гонка по каньону на закате. Вход по паролю от хоста.'],
      ['Город · неспешная езда', 'night_cruise', 'Город', 31, 32, 78, 0, 0, 'm4', 'Ночные покатушки по городу. Сервер почти полон.'],
      ['Грузовики и бездорожье', 'heavy_duty', 'Солончак', 5, 20, 92, 0, 0, 'm6', 'Тяжелая техника, груз и свободные просторы.'],
      ['Тест подвески (моды)', 'lab_rat', 'Полигон', 3, 8, 104, 1, 0, 'm7', 'Лаборатория для тестов. Требуются установленные моды.'],
      ['Горный серпантин', 'pass_hunter', 'Перевал', 11, 16, 148, 0, 0, 'm5', 'Горные дороги, снег и туман. Высокий пинг для вашего региона.'],
      ['Остров · фотосессия', 'lenscape', 'Остров', 2, 12, 163, 0, 0, 'm8', 'Тихий сервер для съёмки и скриншотов.']
    ][i];
    [].forEach.call($('#srvlist').children, function (c: any) { c.classList.toggle('row-on', +c.dataset.i === i); });
    $('#sThumb').className = 'th ' + SRV[8];
    $('#sName').textContent = SRV[0];
    $('#sDesc').textContent = SRV[9];
    $('#sPing').className = pc(SRV[5]);
    $('#sPing').textContent = SRV[5] + ' мс';
    $('#sMap').textContent = SRV[2];
    $('#sHost').textContent = SRV[1];
    $('#sCur').textContent = SRV[3] + ' / ' + SRV[4];
    $('#sBar').style.width = Math.round(SRV[3] / SRV[4] * 100) + '%';
  }
  
  function pc(p: number) {
    return p < 60 ? 'pg' : p < 120 ? 'py' : 'pr';
  }
  
  setMap(0); setSave(0); setSrv(0);
  
  // TRANSITION FUNCTION
  function go(t: string, back: boolean = false) {
    if (busy || t === cur) return;
    busy = true;
    
    var a = screens[cur], b = screens[t];
    if (a) a.classList.toggle('b', back);
    if (a) a.classList.add('out');
    var gm = document.querySelector('.gm');
    if (gm) gm.className = 'gm p' + POS[t];
    var wipe = document.querySelector('.wipe');
    if (wipe) {
      wipe.classList.remove('on'); void wipe.offsetWidth; wipe.classList.add('on');
    }
    
    setTimeout(() => {
      Object.values(screens).forEach((scr: any) => {
        if (scr) scr.classList.remove('on', 'out');
      });
      if (b) b.classList.add('on');
      cur = t;
      busy = false;
    }, 270);
  }
  
  // CLICK HANDLER (adapted from menu.html)
  r.addEventListener('click', function (e: any) {
    var el = e.target.closest('[data-go]');
    if (el) return go(el.dataset.go, el.dataset.dir === 'b');
    
    el = e.target.closest('[data-t]');
    if (el) { 
      var k = el.dataset.t; 
      // Toggle settings
      if (k === 'vsync') T[vsync] = T[vsync] ? 0 : 1;
      if (k === 'refl') T[refl] = T[refl] ? 0 : 1; 
      if (k === 'blur') T[blur] = T[blur] ? 0 : 1;
      el.classList.toggle('on', !!T[k]);
      fps();
      return;
    }
    
    el = e.target.closest('[data-sec]');
    if (el) {
      wipe.classList.remove('on'); void wipe.offsetWidth; wipe.classList.add('on');
      [].forEach.call(el.parentNode.children, function (c: any) { c.classList.toggle('nav-on', c === el); });
      [].forEach.call(el.closest('.scr').querySelectorAll('.sec[data-grp="' + el.dataset.grp + '"]'), function (s: any) {
        s.hidden = !(s.id === el.dataset.sec || s.dataset.owner === el.dataset.sec);
      });
      return;
    }
    
    el = e.target.closest('[data-f]');
    if (el) {
      [].forEach.call(el.parentNode.children, function (c: any) { c.classList.toggle('tab-on', c === el); });
      renderSrv(el.dataset.f);
      var first = $('#srvlist').querySelector('.row'); if (first) setSrv(+first.dataset.i);
      return;
    }
    
    el = e.target.closest('.tg'); if (el) return el.classList.toggle('on');
    el = e.target.closest('.seg>span');
    if (el) { [].forEach.call(el.parentNode.children, function (c: any) { c.classList.toggle('on', c === el); }); return; }
    el = e.target.closest('#maps .card'); if (el) return setMap(+el.dataset.i);
    el = e.target.closest('#saves .card'); if (el) return setSave(+el.dataset.i);
    el = e.target.closest('#srvlist .row'); if (el) return setSrv(+el.dataset.i);
  });
  
  // SCALE
  var w = $('.gmw');
  function fit() { document.querySelector('.gm')?.style.transform = 'scale(' + w.clientWidth / 1440 + ')'; }
  fit();
  if (window.ResizeObserver) new ResizeObserver(fit).observe(w); else addEventListener('resize', fit);
  
  // EXPORT go function
  window.go = goReact;
});

// Helper $
function $(s: string) { 
  var r = document.getElementById('gm'); 
  return r ? r.querySelector(s) : document.querySelector(s); 
}

// Settings state
var T: any = { vsync: 1, refl: 1, blur: 0 };
function fps() {
  var f = 128 - (T.vsync ? 8 : 0) - (T.refl ? 22 : 0) - (T.blur ? 14 : 0);
  $('#fps').textContent = f;
  $('#fpsBar').style.width = Math.round(f / 128 * 100) + '%';
}