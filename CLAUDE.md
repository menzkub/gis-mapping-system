# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running Locally

No build step. Serve the repo root as a static HTTP server:

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

Or any static server (Nginx, VS Code Live Server, etc.). Opening `index.html` as a `file://` URL will fail because Babel Standalone uses `fetch` to load `.jsx` files.

## Validating JSX Syntax

Babel Standalone compiles all `.jsx` files **at runtime in the browser**. A syntax error silently prevents `window.X = X` from running, causing a `"Can't find variable: X"` crash at startup.

Test any changed file before pushing:

```bash
node -e "
const fs=require('fs'),b=require('@babel/core');
b.transformSync(fs.readFileSync('SearchView.jsx','utf8'),{presets:['@babel/preset-react','@babel/preset-env'],filename:'SearchView.jsx'});
console.log('OK');
"
```

Requires local `@babel/core @babel/preset-react @babel/preset-env` (dev-only, not used at runtime):

```bash
npm install -D @babel/core @babel/preset-react @babel/preset-env
```

## Deploying

Push to `main` on GitHub. GitHub Actions auto-deploys to GitHub Pages at `/gis-mapping-system/`.

After any file change, **bump the service worker cache version** in `service-worker.js`:
```js
const CACHE = "gis-meter-vXX"; // increment XX
```
Otherwise users get stale cached files.

## Architecture

### No Build Pipeline

This is a **zero-bundler** app. `index.html` loads:
1. CDN scripts (React 18 UMD, Babel Standalone, Leaflet, Supabase JS v2, XLSX, html2pdf, html2canvas, qrcode-generator)
2. `config.js` as a plain `<script>` — sets up `_supabase`, row mappers, `loadAll()`, and exports everything onto `window`
3. All `.jsx` files as `<script type="text/babel">` — Babel Standalone fetches and compiles them on page load

**Script load order is fixed** in `index.html` and must not be changed:
```
config.js → lang.jsx → components.jsx → MapView.jsx → AuthScreen.jsx
         → SearchView.jsx → AdminPanel.jsx → PaymentView.jsx → app.jsx
```

### Cross-File Globals

Since there is no module system, every file communicates through `window`. Each file ends with an export pattern:

```js
// components.jsx
Object.assign(window, { Icon, StatCard, Modal, useToast, useConfirm, downloadCSV, downloadXLSX, downloadPDF, formatThaiDate });

// SearchView.jsx
window.SearchView = SearchView;
```

All JSX files declare their dependencies in a `/* global ... */` comment at the top.

### React Hook Aliasing

To avoid variable shadowing across files that share a global `React`, each file aliases hooks with a unique suffix:

| File | Alias pattern |
|---|---|
| `app.jsx` | `useStateApp`, `useEffectApp`, `useCallbackApp` |
| `AdminPanel.jsx` | `useStateAd`, `useEffectAd` |
| `SearchView.jsx` | `useStateS`, `useEffectS`, `useCallbackS`, `useRefS` |
| `lang.jsx` | `useStateLang`, `useEffectLang`, `useContextLang`, `createContextLang` |
| `components.jsx` | direct `React.useState` etc. |

**Never use `useState` bare in JSX files** — use the file's alias.

### i18n

All UI strings live in `lang.jsx` → `TRANSLATIONS.th` and `TRANSLATIONS.en`.

Access via the `useLang()` hook which returns `{ lang, setLang, t }`. The `t(key)` function falls back to `th` if the key is missing in `en`.

To add a new string, add it in **both** `th:` and `en:` objects in `TRANSLATIONS`.

### Routing / Views

`app.jsx` holds a single `view` state (`"auth" | "search" | "map" | "admin"`) and renders the corresponding top-level component. There is no router library.

Admin sub-tabs are a second `adminTab` state in `app.jsx`, passed as `tab` prop to `AdminPanel`. To add an admin tab:
1. Add `{ id, icon, label }` to `MOB_MORE_SETTINGS` (or `MOB_MORE_MAIN`) in `AdminPanel.jsx`
2. Add `{tab === "id" && <MyComponent />}` in the `adm-body` div (~line 207)
3. Implement `MyComponent` anywhere in `AdminPanel.jsx`

### Data Flow

```
Supabase DB
  → config.js  toMeter() / toTransformer()   (snake_case → UPPERCASE app objects)
  → app.jsx    loadAppData()                  (fills data.meters / data.trs / data.users / data.dashStats)
  → props      data passed down to SearchView, AdminPanel, MapView
  → write ops  components call _supabase directly; use fromMeter() / fromTransformer() to convert back
```

`loadAll(table)` in `config.js` paginates past Supabase's 1000-row limit.

### Supabase Schema Key Points

- **`profiles`** — app-level user metadata; linked 1:1 to `auth.users`. RLS restricts: users see only own row, admins see all.
- **`meters` / `transformers`** — GIS data. Only `active` users can SELECT; only admins can INSERT/UPDATE/DELETE.
- **`coordinate_corrections`** — pending coordinate fix requests from users; admin approves/rejects.
- **`audit_log`** — append-only activity log written by the app (not DB triggers).
- All RLS policies are in `supabase/schema.sql`; fixes in `supabase/fix_rls.sql` and `fix_rls_v2.sql`.

### PWA / Service Worker

`service-worker.js` uses **cache-first** for app files (the STATIC list) and **network-only** for Supabase, CDN, and googleapis URLs. Push notifications are handled via the `push` event listener.

### JSX Fragment Rule

Any ternary branch that returns two sibling elements **must** wrap them in `<>...</>`:
```jsx
// ✅ correct
condition ? <><A /><B /></> : <C />

// ❌ causes Babel parse error → "Can't find variable: ComponentName"
condition ? <A /><B /> : <C />
```
