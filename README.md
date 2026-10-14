# Metropolis 2D: Open World City Simulator

**Демо (GitHub Pages):** [https://mirazstudio-offical.github.io/urban-sandboxx/](https://mirazstudio-offical.github.io/urban-sandboxx/)

---

## 🔐 Разрешённые домены Firebase Authentication (Authorized Domains)

Для работы авторизации через Google (`signInWithPopup`) на GitHub Pages, локальном сервере и в среде AI Studio в Firebase Console проекта **`gen-lang-client-0888101069`** должны быть добавлены разрешённые домены.

### Ссылка для настройки:
👉 **[Firebase Console -> Authentication -> Settings -> Authorized domains](https://console.firebase.google.com/project/gen-lang-client-0888101069/authentication/settings)**

### Список доменов для добавления:
1. **GitHub Pages:**
   - `mirazstudio-offical.github.io`
   - `github.io`
2. **Локальная разработка (Localhost / IP):**
   - `localhost`
   - `127.0.0.1`
3. **AI Studio Dev / Preview:**
   - `ais-dev-vwqxtqgsaxa6776tcpyetc-554247906082.asia-southeast1.run.app`
   - `ais-pre-vwqxtqgsaxa6776tcpyetc-554247906082.asia-southeast1.run.app`

### Пошаговая инструкция:
1. Откройте [настройки Authentication в Firebase Console](https://console.firebase.google.com/project/gen-lang-client-0888101069/authentication/settings).
2. Перейдите на вкладку **«Настройки» (Settings)** -> раздел **«Авторизованные домены» (Authorized domains)**.
3. Нажмите кнопку **«Добавить домен» (Add domain)**.
4. Введите каждый из указанных выше доменов и нажмите **«Сохранить» (Save)**.
5. После сохранения вход через Google будет мгновенно работать на GitHub Pages и на локальных хостах без ошибки `auth/unauthorized-domain`.
