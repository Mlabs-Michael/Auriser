# Auriser

An app store built by **MLabs — Michael Uchechukwu**. Static frontend (HTML/CSS/JS)
on Vercel, with Firebase Auth + Firestore for accounts, listings, ratings and comments.

---

## Folder structure

```
auriser/
├── index.html              the site entry point — must stay at the root
├── vercel.json             static hosting config (headers, clean URLs, fallback)
├── .vercelignore           files that must never reach the live site
├── .gitignore              files that must never reach GitHub
├── css/
│   └── style.css
├── img/
│   ├── auriser-ribbon.svg        vector tile — favicon + welcome screen
│   ├── auriser-ribbon-mark.svg   vector mark — hero + side rail
│   └── auriser-touch-icon.png    180px iOS home-screen icon (PNG required)
├── js/
│   ├── firebase-config.js   project keys
│   ├── firebase-api.js      auth, listings, ratings, comments
│   ├── store-data.js        catalogue helpers + icon generator
│   ├── onboarding.js        first-run welcome screen
│   ├── design-studio.js     upload / procedural generator / AR stage
│   ├── ribbon-anim.js       hero ribbon formation animation
│   └── app.js               routing, rendering, search, install, settings
├── local-only/
│   ├── terminal.termx            developer-mode key — stays on your machine only
│   └── original-png/             the original ribbon PNGs, kept as a backup
└── README.md
```

**The root of this folder is the site.** There is no `public/` wrapper and no
Root Directory to configure in Vercel — point it here and it just works.

### What was removed

| Removed | Why |
| --- | --- |
| `server/main.cpp`, `server/auriser-server.dev` | The Windows C++ preview server. Vercel is the host now; for local preview use `npx serve` (below). |
| `js/supabase-api.js`, `js/supabase-config.js` | Left over from before the Firebase migration. Nothing loaded them. |
| `public/terminal.termx` | Was sitting inside the deployed folder, so anyone could have fetched it from the live URL. Moved to `local-only/`. |
| `img/auriser-ribbon.png`, `img/auriser-ribbon-mark.png` | Replaced by SVG versions drawn in code. 226 KB → 8.6 KB, and sharp at any size. Originals kept in `local-only/original-png/`. |

---

## Deploying to Vercel

### Option A — GitHub (recommended)

1. Create a **public or private** repo on GitHub, e.g. `auriser`.
2. From this folder:
   ```bash
   git init
   git add .
   git commit -m "Auriser v1"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/auriser.git
   git push -u origin main
   ```
3. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
4. Leave every setting at its default:
   - Framework Preset: **Other**
   - Root Directory: **`./`**
   - Build Command: *(empty)*
   - Output Directory: *(empty)*
5. **Deploy.**

After this, every `git push` to `main` redeploys the site automatically.

### Option B — Vercel CLI (no GitHub)

```bash
npm i -g vercel
cd auriser
vercel          # preview deploy
vercel --prod   # live deploy
```

---

## One required step after your first deploy

Google sign-in will fail until you whitelist the new domain:

**Firebase Console → Authentication → Settings → Authorized domains → Add domain**

Paste the bare hostname with no `https://` and no trailing slash:

```
auriser-xxxx.vercel.app
```

Add each new domain you use, including any custom domain later. Symptom if you
skip it: the toast reads *"Add this domain in Firebase → Authentication →
Settings → Authorized domains"*.

---

## Local preview

`file://` breaks Google sign-in and some fetches, so don't double-click
`index.html`. Use any static server:

```bash
npx serve          # then open the printed http://localhost:3000
```

or the **Live Server** extension in VS Code. Add `http://localhost:3000` to the
same Firebase Authorized domains list so sign-in works locally too.

---

## Developer mode

Drag `local-only/terminal.termx` onto the small ring in the corner. The file is
excluded from both Git and Vercel, so it never ships with the site.

Be aware this is a convenience, not a security boundary — the key is readable
in `js/app.js` by anyone who opens DevTools. The thing that actually protects
your data is your **Firestore security rules**, so make sure those only let a
signed-in user write their own listings. Dev mode should only control what the
UI shows, never what the database allows.

---

## Making changes after launch

Vercel is continuous hosting, not a one-way publish:

1. Edit files locally.
2. `git add . && git commit -m "..." && git push` (or `vercel --prod`).
3. Site updates in a minute or two.

Firebase data — users, listings, reviews — is independent of the deploy, so
redeploying the UI never wipes the catalogue. Old deploys stay in the Vercel
dashboard if you ever need to roll back.
