# Project Guidance for AI Coding Agents

## 🎒 Hand vs Inventory Item Usage
When adding or modifying usable items in this codebase, you **must** implement their activation logic in both files/functions:
1. **From Inventory:** `useItemOnPlayer(player, itemIndex, world, ...)` in `src/items.ts`
2. **From Hands (Equipped):** `useHandItemOnPlayer(player, hand, world, ...)` in `src/items.ts` (triggered by pressing the **E** key while holding the item in the active hand)

> ⚠️ **CRITICAL:** If you only implement item usage in `useItemOnPlayer` and forget `useHandItemOnPlayer`, using the item from the player's hand (with **E**) will fallback to default consumption logic, which treats the item like generic food or drink, causing the item to disappear ("be eaten") without triggering its actual functional effect!

---

## ⏳ Sandbag and Empty Sack Mechanics
- **Sandbag (`sandbag`)**:
  - Drops 1 kg of silica sand when activated.
  - Generates sand mounds (`stain` with `type: 'sand'`) on the ground.
  - Instantly extinguishes nearby fire stains and vehicle engine/fuel fires.
  - Absorbs/dries out flammable or wet oil, fuel, and coolant spills on the ground in a ~75px radius.
  - Consuming a sandbag replaces it in the inventory/hand with an **Empty Sack** (`sack_empty`).
- **Empty Sack (`sack_empty`)**:
  - Standard non-usable storage/fabric item (`usable: false`). Light and durable burlap canvas.

---

## 🚫 No Emoji Policy
- **DO NOT USE EMOJIS IN UI OR CODE.** Use Lucide React icons or clean vector graphics/canvas drawings instead of emojis.
- In user interface components, buttons, tabs, overlays, and map markers, strictly use Lucide React icons (`lucide-react`) or clean canvas shapes. Never use raw emoji characters.

---

## 🗺️ Игровой Мир и Карта (Strict Map First Policy)
- **ВСЕ СТАТИЧЕСКИЕ ОБЪЕКТЫ ДОЛЖНЫ НАХОДИТЬСЯ В `public/map.json`**:
  - Все здания, строения, комплекс АЗС (магазины, кассы, навесы), газовые колонки (`gasPumps`), отбойники и барьеры (`guardrails`), заспавненная техника и прицепы (`vehicles`), знаки, пропсы, адреса и лежащие предметы (`groundItems`) **ОБЯЗАТЕЛЬНО** должны быть занесены непосредственно в структуру файла `/public/map.json`.
- **🚫 СТРОЖАЙШИЙ ЗАПРЕТ НА ПРОЦЕДУРНЫЕ РАНТАЙМ-СКРИПТЫ ДЛЯ СТАТИКИ**:
  - **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО** генерировать или добавлять статические объекты мира, инфраструктуру, здания, пропсы, отбойники или прицепы через «бездушные» костыльные рантайм-скрипты или функции-заглушки в коде (такие как `ensureWorld...`, `patch_...`, динамические спавнеры при каждой загрузке карты и т.п.).
  - Любые новые статические объекты, локации, здания, декорации или элементы инфраструктуры **ОБЯЗАНЫ** добавляться прямо в `/public/map.json`.

---

## 📄 Редактор Карт (Portable Single HTML Rule)
- **`public/editor.html` ДОЛЖЕН ОСТАВАТЬСЯ 100% АВТОНОМНЫМ ОДНИМ HTML-ФАЙЛОМ**:
  - **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО** выносить JS, CSS или логику редактора в отдельные внешней файлы (например `railwayScheduleStudio.js` и т.п.).
  - Весь HTML, CSS, встроенные SVG/иконки и JavaScript-код редактора карт, студии расписаний ЖД и инструментов картографии должны находиться **строго внутри одного файла `public/editor.html`**. Это обеспечивает 100% портативность редактора карт.

---

## Правила создания и переработки UI (Strict Main Menu UI Standard)
Все новые и перерабатываемые игровые меню, экраны и полноэкранные модальные окна **ОБЯЗАНЫ** соблюдать следующие правила:

### 1. Единый стиль Главного Меню (`ShadowHost` + `attachStageFit`)
- **Только архитектура Главного Меню**: использовать `ShadowHost` (`src/components/ShadowHost.tsx`) + `attachStageFit` с визуальным языком главного меню и меню паузы (палитра обсидиан/уголь + янтарный акцент `#c9922b` / `#e0ab45`, шрифты `Barlow` / `Barlow Condensed`, `font-variant-numeric: tabular-nums` для всех чисел, весов, цен и объёмов).
- **Не использовать `ModalShell`** (`src/components/ModalShell.tsx`) для новых или переписываемых экранов — он не даёт сценического масштабирования на горизонтальных телефонах и приводит к обрезанию интерфейса.
- **Эталонные реализации**: `SelfInspectionModal.tsx` (`selfInspection.css`), `RealEstateAgencyModal.tsx` (`realEstate.css`), `InventoryModal.tsx` (`inventoryModal.css`).

### 2. Всё помещается в экран без обрезаний и наложений (Desktop + Landscape Phone)
- Интерфейс обязан полностью помещаться в видимую область **и на десктопе (`1440×900`), и на горизонтальных телефонах (`[data-mob]`, логическая высота `560px`, включая реальные экраны ~`850×330` CSS px под адресной строкой браузера и узкие ~`667×375`)**.
- Ни один блок, карточка, кнопка или текст не должны выходить за границы экрана, обрезаться или накрывать соседние элементы.
- Заголовки групп, вкладки и статусные чипы не должны ломаться переносом на лишние строки: задавать `white-space: nowrap`, `min-width: 0` на flex/grid-родителях и `overflow: hidden; text-overflow: ellipsis` для длинных подписей.
- Избегать «многоэтажных» баннеров, фильтров и шапок — собирать управление, фильтры и статистику в компактные однострочные полосы, оставляя максимум высоты рабочему контенту.

### 3. Скролл разрешён ТОЛЬКО для списков и сеток
- **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО** вешать общий скролл на всё модальное окно, корневую сцену (`.gm`) или статические панели/формы/верстаки.
- Вертикальный скролл (`overflow-y: auto` на контейнере с `min-height: 0`) допустим **исключительно** внутри явных списков и сеток переменной длины (список слотов инвентаря, каталог недвижимости/предметов, список одежды, длинный список характеристик).

### 4. Технические требования `ShadowHost` и `menuCompact.css`
- **Порядок каскада CSS**: `ShadowHost` вставляет `menuCompact.css` **ПОСЛЕ** локального CSS модалки. В `.gm[data-mob]` уже заданы `.top { left: 28px; right: 28px; top: 12px; height: 46px }` (нижний край `58px`), `.hint { left: 28px; right: 28px; bottom: 8px }`, `.chip { height: 44px }`, `.btn { height: 50px }`, `.btn-sm { height: 42px }`.
  - В `.gm[data-mob]` выравнивать контент по `left: 28px; right: 28px` и начинать блоки ниже `top: 62px`, чтобы не было наезда на `.top`.
  - Если в компактном режиме нужны более компактные кнопки, перебивать `menuCompact.css` более высокой специфичностью (например `.gm[data-mob] .btn.btn-sm`).
- **DOM-запросы внутри Shadow DOM**: `document.querySelectorAll` и `document.elementFromPoint` не видят элементы внутри ShadowRoot — использовать `gmRef.current.querySelectorAll(...)` и `(gmRef.current.getRootNode() as ShadowRoot).elementFromPoint(x, y)`.
- **Плавающие `position: fixed` элементы** (например превью при drag-and-drop) рендерить **снаружи** `.gm` (соседним элементом внутри `#w`), иначе `transform: scale(...)` на `.gm` собьёт экранные координаты `clientX/clientY`.
- **Изоляция клавиатуры и `Escape`**: поля ввода (`<input>`, `<textarea>`) должны вызывать `e.stopPropagation(); e.nativeEvent.stopPropagation()` в `onKeyDown` (кроме `Escape`), чтобы набор текста не триггерил игровые клавиши на `window`; закрытие по `Escape` подключать через `useTopmostEscape`.
- **Чистота подачи**: строго без эмодзи (только `lucide-react` и чистый SVG/Canvas) и без восклицательных знаков в интерфейсных текстах.

---

## Installed Project Skills (`/skills/*`)
В проект установлены следующие скиллы (продублированы в `/skills/`, `/.claude/skills/` и `/.agents/skills/`). **Агент ОБЯЗАН прочитать соответствующий `SKILL.md` через `view_file` перед выполнением профильной задачи:**

- **`/skills/unslop/SKILL.md`** (плюс справочники в `/skills/unslop/references/`):
  - **Когда читать:** При любом запросе на редизайн, полировку, чистку интерфейса («unslop», улучшение UI/UX, модальных окон, меню, HUD) или перед созданием новых экранов.
