/* ==========================================================================
   AURISER — store-data.js
   Static catalogue used to render the Discover grid, Library and search.
   Replace APPS with a Supabase fetch() once your table is live —
   the shape each card needs is documented above the array.
   ========================================================================== */

/**
 * Each app record:
 * {
 *   id: string            unique slug
 *   name: string
 *   tagline: string       one line, shown on the card
 *   description: string   longer copy, shown in the detail panel
 *   category: string      must match one entry in CATEGORIES
 *   rating: number         0–5, one decimal
 *   reviews: number        raw count, formatted on render
 *   size: string           e.g. "48 MB"
 *   version: string
 *   updated: string        e.g. "3 days ago"
 *   hue: number             0–360, seeds the icon gradient + accents
 *   editorial: boolean      true = eligible for the "Editor's Picks" rail
 *   trending: boolean       true = eligible for the "Trending Now" rail
 * }
 */

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "mlabs", label: "MLabs" },
  { id: "productivity", label: "Productivity" },
  { id: "creative", label: "Creative Tools" },
  { id: "utilities", label: "Utilities" },
  { id: "dev", label: "Developer" },
  { id: "media", label: "Media" },
  { id: "games", label: "Games" },
];

const APPS = [
  {
    id: "penroute",
    name: "Penroute",
    tagline: "Vector sketching that keeps pace with your hand",
    description:
      "Penroute is a pressure-aware vector sketchbook built for tablets and styluses. Layers, boolean paths and a live gradient mesh editor sit behind three keystrokes, so nothing gets between you and the line you're drawing.",
    category: "creative",
    rating: 4.8,
    reviews: 12480,
    size: "134 MB",
    version: "3.2.0",
    updated: "2 days ago",
    hue: 38,
    editorial: true,
    trending: true,
  },
  {
    id: "ledgerly",
    name: "Ledgerly",
    tagline: "Freelance invoicing that reconciles itself",
    description:
      "Ledgerly watches your connected accounts and matches incoming payments to open invoices automatically. Built for solo studios who bill by the project, not the hour.",
    category: "productivity",
    rating: 4.6,
    reviews: 8021,
    size: "62 MB",
    version: "1.9.4",
    updated: "1 week ago",
    hue: 190,
    editorial: false,
    trending: true,
  },
  {
    id: "nightframe",
    name: "Nightframe",
    tagline: "A distraction-free window manager for deep work",
    description:
      "Nightframe dims everything but your active window on a schedule you set, and remembers the exact layout you left each project in. No accounts, no sync, no telemetry.",
    category: "utilities",
    rating: 4.9,
    reviews: 21033,
    size: "18 MB",
    version: "4.0.1",
    updated: "5 hours ago",
    hue: 265,
    editorial: true,
    trending: false,
  },
  {
    id: "hexforge",
    name: "Hexforge",
    tagline: "A build pipeline dashboard your team will open",
    description:
      "Hexforge turns CI logs into a readable timeline instead of a wall of text. Failures are grouped by root cause, and you can re-run a single flaky step without re-triggering the whole pipeline.",
    category: "dev",
    rating: 4.7,
    reviews: 5390,
    size: "91 MB",
    version: "2.4.0",
    updated: "3 days ago",
    hue: 152,
    editorial: false,
    trending: true,
  },
  {
    id: "cadence",
    name: "Cadence",
    tagline: "A metronome that learns your practice habits",
    description:
      "Cadence tracks tempo drift across your practice sessions and suggests the next tempo step automatically, so your warmups actually build toward something.",
    category: "media",
    rating: 4.5,
    reviews: 3012,
    size: "24 MB",
    version: "1.3.2",
    updated: "2 weeks ago",
    hue: 12,
    editorial: false,
    trending: false,
  },
  {
    id: "quarrytype",
    name: "Quarrytype",
    tagline: "A type foundry's specimen tool, for your own fonts",
    description:
      "Drop in any OTF or TTF and Quarrytype generates a full specimen sheet — waterfall, pairings, OpenType feature preview — in the same layout foundries use to sell type.",
    category: "creative",
    rating: 4.9,
    reviews: 6754,
    size: "45 MB",
    version: "2.0.0",
    updated: "6 days ago",
    hue: 45,
    editorial: true,
    trending: false,
  },
  {
    id: "driftcast",
    name: "Driftcast",
    tagline: "Local network file drops, without an account",
    description:
      "Driftcast finds other Driftcast users on the same network and lets you drag files straight across, encrypted, with no server in the middle and nothing kept afterward.",
    category: "utilities",
    rating: 4.4,
    reviews: 9871,
    size: "12 MB",
    version: "3.1.1",
    updated: "4 days ago",
    hue: 205,
    editorial: false,
    trending: true,
  },
  {
    id: "backlot",
    name: "Backlot",
    tagline: "Shot lists and continuity notes for small crews",
    description:
      "Backlot replaces the continuity binder with a shared board your crew can annotate from set. Photos, notes and shot status stay attached to the scene, not scattered across group chats.",
    category: "media",
    rating: 4.6,
    reviews: 2210,
    size: "77 MB",
    version: "1.6.0",
    updated: "1 month ago",
    hue: 320,
    editorial: false,
    trending: false,
  },
  {
    id: "solarbound",
    name: "Solarbound",
    tagline: "A slow, orbital puzzle game about gravity",
    description:
      "Solarbound gives you a handful of bodies and a fixed amount of mass to place. Nudge orbits until every planet finds a stable path — there's no timer, and no wrong way to sit with a level.",
    category: "games",
    rating: 4.8,
    reviews: 15602,
    size: "310 MB",
    version: "1.2.0",
    updated: "3 weeks ago",
    hue: 285,
    editorial: true,
    trending: true,
  },
  {
    id: "fieldnote",
    name: "Fieldnote",
    tagline: "Voice notes that transcribe themselves offline",
    description:
      "Fieldnote transcribes on-device, so a two-hour interview never leaves your machine. Speaker changes are marked automatically and every paragraph links back to its timestamp.",
    category: "productivity",
    rating: 4.7,
    reviews: 7345,
    size: "210 MB",
    version: "2.2.3",
    updated: "yesterday",
    hue: 168,
    editorial: false,
    trending: false,
  },
  {
    id: "graphite",
    name: "Graphite",
    tagline: "Dependency graphs for codebases you didn't write",
    description:
      "Point Graphite at a repo and it maps module relationships in seconds, highlighting circular dependencies and dead code paths before you write a single line.",
    category: "dev",
    rating: 4.5,
    reviews: 4109,
    size: "58 MB",
    version: "1.8.0",
    updated: "2 days ago",
    hue: 95,
    editorial: false,
    trending: false,
  },
  {
    id: "moltenray",
    name: "Moltenray",
    tagline: "A real-time render preview for hobby renders",
    description:
      "Moltenray path-traces a low-res preview of your scene as you tune lighting, so you see roughly where the render is headed before committing a full pass overnight.",
    category: "creative",
    rating: 4.9,
    reviews: 18220,
    size: "420 MB",
    version: "5.0.2",
    updated: "12 hours ago",
    hue: 28,
    editorial: true,
    trending: true,
  },
];

/** Deterministic small PRNG so a given hue always draws the same icon. */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds a small inline SVG "icon" for an app card — an angular monogram
 * in the app's hue, echoing the Auriser mark instead of a stock glyph.
 */
function buildIconSVG(app) {
  if (app._iconDataUrl) {
    return `<img class="app-icon-svg" src="${app._iconDataUrl}" alt="${app.name} icon" style="width:100%;height:100%;object-fit:cover;border-radius:16px;" />`;
  }
  const rand = mulberry32(app.hue * 977 + app.name.length);
  const h = app.hue;
  const initial = app.name.charAt(0).toUpperCase();
  const rot = Math.floor(rand() * 8) - 4;
  const id = `ic-${app.id}`;
  return `
    <svg viewBox="0 0 64 64" class="app-icon-svg" role="img" aria-label="${app.name} icon">
      <defs>
        <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="hsl(${h} 70% 62%)" />
          <stop offset="55%" stop-color="hsl(${h + 18} 65% 46%)" />
          <stop offset="100%" stop-color="hsl(${h - 10} 55% 22%)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#${id})" />
      <rect x="2" y="2" width="60" height="60" rx="16" fill="black" opacity="0.06" transform="rotate(${rot} 32 32)" />
      <text x="32" y="42" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="28" font-weight="600" fill="rgba(11,10,8,0.88)">${initial}</text>
    </svg>`;
}

window.AURISER_DATA = { CATEGORIES, APPS, buildIconSVG, mulberry32 };
