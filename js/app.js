/* ==========================================================================
   AURISER — app.js
   Shell behaviour: view routing, catalogue rendering, search/filter,
   the detail slide-over, simulated installs, theme toggle, ambient field.
   ========================================================================== */

(function () {
  const { CATEGORIES, APPS: SEED_APPS, buildIconSVG } = window.AURISER_DATA;
  // Live catalogue — starts empty when cloud backend is on
  let APPS = [];
  const FB = window.AURISER_FB;
  const USE_FIREBASE = !!(
    window.AURISER_FIREBASE &&
    window.AURISER_FIREBASE.enabled &&
    FB &&
    FB.ready() &&
    FB.init()
  );
  // Prefer Firebase; keep name USE_SUPABASE aliases as USE_CLOUD for minimal churn
  const USE_CLOUD = USE_FIREBASE;
  const USE_SUPABASE = USE_CLOUD; // legacy flag name used below

  if (!USE_CLOUD) {
    APPS = SEED_APPS.slice();
  }

  const installed = new Set(); // session-only library
  let activeCategory = "all";
  let searchTerm = "";
  let editingAppId = null;
  let pendingRemoveId = null;

  function loadOwnedApps() {
    if (USE_CLOUD) return;
  }
  function saveOwnedApps() {
    if (USE_CLOUD) return;
  }

  /* ---------------------------------------------------------------------
     Auth — Supabase only when enabled
     --------------------------------------------------------------------- */
  const AUTH_KEY = "auriser_session";
  const USERS_KEY = "auriser_users";
  let _sessionCache = null; // in-memory only when using Supabase

  function loadUsers() {
    if (USE_SUPABASE) return {};
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }
  function saveUsers(users) {
    if (USE_SUPABASE) return;
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch (e) {
      /* ignore */
    }
  }
  function getSession() {
    if (USE_SUPABASE) return _sessionCache;
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
    } catch (e) {
      return null;
    }
  }
  function setSession(user) {
    if (USE_SUPABASE) {
      _sessionCache = user || null;
      return;
    }
    try {
      if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      else localStorage.removeItem(AUTH_KEY);
    } catch (e) {
      /* ignore */
    }
  }
  function currentUser() {
    return getSession();
  }
  function isOwner(app) {
    const u = currentUser();
    if (!u || !app) return false;
    if (app._ownerId && u.id && app._ownerId === u.id) return true;
    if (app._ownerEmail && app._ownerEmail === u.email) return true;
    return false;
  }

  /* Developer mode — unlock via drag-drop of terminal.termx on corner ring */
  const DEV_KEY = "m1i2c3h4a5e6l7";
  const DEV_PASSKEY = "2008";
  const DEV_KEY_STORAGE = "auriser_dev_mode";
  const COMPANY_STORAGE = "auriser_company_apps";
  let devMode = false;
  let companyAppIds = new Set();
  try {
    devMode = localStorage.getItem(DEV_KEY_STORAGE) === "1";
  } catch (e) {
    /* ignore */
  }
  try {
    const raw = localStorage.getItem(COMPANY_STORAGE);
    if (raw) companyAppIds = new Set(JSON.parse(raw));
  } catch (e) {
    /* ignore */
  }

  function saveCompanyApps() {
    try {
      localStorage.setItem(COMPANY_STORAGE, JSON.stringify([...companyAppIds]));
    } catch (e) {
      /* ignore */
    }
  }

  function markCompanyApp(id) {
    if (!id) return;
    companyAppIds.add(String(id));
    saveCompanyApps();
  }

  function isCompanyApp(app) {
    if (!app) return false;
    if (companyAppIds.has(String(app.id))) return true;
    if (app._company) return true;
    const pub = String(app._publisher || app.publisher || "").toLowerCase();
    if (pub.includes("mlabs") || pub.includes("michael uchechukwu") || pub.includes("michael · mlabs")) {
      return true;
    }
    return false;
  }

  function companyMatchesQuery(app, t) {
    if (!t) return true;
    const blob = [
      app.name,
      app.tagline,
      app.description,
      app.category,
      app._publisher,
      app.publisher
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return blob.includes(t);
  }

  function sortCompanyFirst(list) {
    return [...list].sort((a, b) => {
      const ca = isCompanyApp(a) ? 0 : 1;
      const cb = isCompanyApp(b) ? 0 : 1;
      return ca - cb;
    });
  }

  function canManage(app) {
    return isOwner(app) || devMode;
  }

  function setDevMode(on) {
    devMode = !!on;
    try {
      if (devMode) localStorage.setItem(DEV_KEY_STORAGE, "1");
      else localStorage.removeItem(DEV_KEY_STORAGE);
    } catch (e) {
      /* ignore */
    }
    updateDevUI();
    renderAll();
  }

  function updateDevUI() {
    const ring = document.getElementById("cornerRing");
    const banner = document.getElementById("devBanner");
    const panel = document.getElementById("devChipPanel");
    const toggle = document.getElementById("devChipToggle");
    if (ring) {
      ring.classList.toggle("dev-active", devMode);
      ring.title = devMode ? "Developer mode active" : "Auriser";
    }
    if (banner) {
      banner.classList.toggle("show", devMode);
      if (!devMode) {
        banner.hidden = true;
        if (panel) panel.hidden = true;
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      } else {
        banner.hidden = false;
      }
    }
  }

  function enterDevMode() {
    setDevMode(true);
    toast("Welcome back, Michael");
  }

  function leaveDevMode() {
    setDevMode(false);
    toast("Developer mode off");
  }

  function tryActivateDevKey(text) {
    const key = String(text || "").trim();
    if (key === DEV_KEY) {
      enterDevMode();
      return true;
    }
    toast("Invalid key file");
    return false;
  }

  function updateProfileChip() {
    const u = currentUser();
    const nameEl = document.getElementById("profileName");
    const chip = document.getElementById("profileChip");
    const dot = document.getElementById("profileDot");
    if (!nameEl) return;
    if (chip) {
      const old = chip.querySelector("img.profile-avatar");
      if (old) old.remove();
    }
    if (u) {
      nameEl.textContent = u.name || (u.email || "").split("@")[0];
      if (chip && u.photoURL) {
        const img = document.createElement("img");
        img.className = "profile-avatar";
        img.src = u.photoURL;
        img.alt = "";
        img.referrerPolicy = "no-referrer";
        chip.insertBefore(img, nameEl);
        if (dot) dot.style.display = "none";
      } else if (dot) {
        dot.style.display = "";
      }
    } else {
      nameEl.textContent = "Sign in";
      if (dot) dot.style.display = "";
    }
  }

  function openAuthModal() {
    const u = currentUser();
    const signedOut = document.getElementById("authSignedOut");
    const signedIn = document.getElementById("authSignedIn");
    if (u) {
      signedOut.style.display = "none";
      signedIn.style.display = "block";
      document.getElementById("authTitle").textContent = "Your account";
      document.getElementById("authSubtitle").textContent = USE_CLOUD
        ? "Signed in via Firebase. Your publishes go to the cloud catalogue."
        : "Local session only.";
      document.getElementById("authAccName").textContent = u.name;
      document.getElementById("authAccEmail").textContent = u.email;
      document.getElementById("authAccProvider").textContent =
        u.provider === "google" ? "Signed in with Google" : "Email & password";
      const avatarEl = document.getElementById("authAvatar");
      if (avatarEl) {
        if (u.photoURL) {
          avatarEl.innerHTML = `<img src="${u.photoURL}" alt="" referrerpolicy="no-referrer" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
        } else {
          avatarEl.textContent = (u.name || u.email || "?").charAt(0).toUpperCase();
        }
      }
    } else {
      signedOut.style.display = "block";
      signedIn.style.display = "none";
      document.getElementById("authTitle").textContent = "Sign in to Auriser";
      document.getElementById("authSubtitle").textContent = USE_CLOUD
        ? "Email + password or Google — both save to Firebase."
        : "Offline mode — accounts stay on this device only.";
    }
    const gBtn = document.getElementById("authGoogle");
    if (gBtn) {
      gBtn.textContent = "Continue with Google";
    }
    document.getElementById("authScrim").classList.add("open");
    document.getElementById("authModal").classList.add("open");
  }

  function closeAuthModal() {
    document.getElementById("authScrim").classList.remove("open");
    document.getElementById("authModal").classList.remove("open");
  }

  /** Pull the real Firebase user into our cache */
  async function ensureCloudSession() {
    if (!USE_CLOUD) return currentUser();
    try {
      const u = FB.getUser();
      if (u) {
        const isGoogle = (u.providerData || []).some((p) => p.providerId === "google.com");
        setSession({
          email: u.email,
          name: u.displayName || (u.email || "").split("@")[0],
          provider: isGoogle ? "google" : "email",
          id: u.uid,
          photoURL: u.photoURL || null
        });
        updateProfileChip();
        return currentUser();
      }
    } catch (e) {
      console.warn("ensureCloudSession", e);
    }
    setSession(null);
    updateProfileChip();
    return null;
  }

  async function requireAuth(thenFn) {
    const u = USE_CLOUD ? await ensureCloudSession() : currentUser();
    if (u) {
      thenFn();
      return;
    }
    openAuthModal();
    toast("Sign in to continue");
  }

  async function signInEmail() {
    const email = document.getElementById("authEmail").value.trim().toLowerCase();
    const pass = document.getElementById("authPass").value;
    const emailField = document.getElementById("field-auth-email");
    const passField = document.getElementById("field-auth-pass");
    emailField.classList.remove("invalid");
    passField.classList.remove("invalid");
    let ok = true;
    if (!email || !email.includes("@")) {
      emailField.classList.add("invalid");
      ok = false;
    }
    if (!pass) {
      passField.classList.add("invalid");
      ok = false;
    }
    if (!ok) return;

    if (USE_CLOUD) {
      try {
        const user = await FB.signIn(email, pass);
        if (!user) throw new Error("Sign-in failed");
        const name = user.displayName || email.split("@")[0];
        setSession({ email: user.email, name, provider: "email", id: user.uid });
        updateProfileChip();
        closeAuthModal();
        await refreshCatalogueFromCloud();
        renderAll();
        if (typeof setCloudStatus === "function") {
          setCloudStatus("Live · Firebase · " + APPS.length, "live");
        }
        toast("Signed in as " + name);
      } catch (err) {
        passField.classList.add("invalid");
        passField.querySelector(".error").textContent = err.message || "Wrong email or password.";
        toast("Sign-in failed");
      }
      return;
    }

    // Offline fallback
    const users = loadUsers();
    const rec = users[email];
    if (!rec || rec.password !== pass) {
      passField.classList.add("invalid");
      passField.querySelector(".error").textContent = "Wrong email or password.";
      toast("Sign-in failed");
      return;
    }
    setSession({ email, name: rec.name, provider: "email" });
    updateProfileChip();
    closeAuthModal();
    renderAll();
    toast("Signed in as " + rec.name);
  }

  async function signUp() {
    const name = document.getElementById("suName").value.trim();
    const email = document.getElementById("suEmail").value.trim().toLowerCase();
    const pass = document.getElementById("suPass").value;
    const pass2 = document.getElementById("suPass2").value;
    const fName = document.getElementById("field-su-name");
    const fEmail = document.getElementById("field-su-email");
    const fPass = document.getElementById("field-su-pass");
    const fPass2 = document.getElementById("field-su-pass2");
    [fName, fEmail, fPass, fPass2].forEach((f) => f.classList.remove("invalid"));
    let ok = true;
    if (!name) {
      fName.classList.add("invalid");
      ok = false;
    }
    if (!email || !email.includes("@")) {
      fEmail.classList.add("invalid");
      ok = false;
    }
    if (!pass || pass.length < 6) {
      fPass.classList.add("invalid");
      ok = false;
    }
    if (pass !== pass2) {
      fPass2.classList.add("invalid");
      ok = false;
    }
    if (!ok) return;

    if (USE_CLOUD) {
      try {
        const user = await FB.signUp(email, pass, name);
        setSession({
          email: user.email || email,
          name: user.displayName || name,
          provider: "email",
          id: user.uid
        });
        updateProfileChip();
        closeAuthModal();
        await refreshCatalogueFromCloud();
        renderAll();
        if (typeof setCloudStatus === "function") {
          setCloudStatus("Live · Firebase · " + APPS.length, "live");
        }
        toast("Confirmation email sent to " + (user.email || email) + " — check your inbox");
      } catch (err) {
        fEmail.classList.add("invalid");
        fEmail.querySelector(".error").textContent = err.message || "Could not create account.";
        toast("Sign-up failed");
      }
      return;
    }

    // Offline fallback
    const users = loadUsers();
    if (users[email]) {
      fEmail.classList.add("invalid");
      fEmail.querySelector(".error").textContent = "Account already exists — sign in instead.";
      return;
    }
    users[email] = { name, password: pass, provider: "email" };
    saveUsers(users);
    setSession({ email, name, provider: "email" });
    updateProfileChip();
    closeAuthModal();
    renderAll();
    toast("Account created — welcome, " + name);
  }

  async function signInGoogle() {
    if (!USE_CLOUD) {
      toast("Google sign-in needs Firebase");
      return;
    }
    try {
      toast("Opening Google…");
      const user = await FB.signInGoogle();
      // null = redirect flow started (page will reload)
      if (!user) {
        toast("Redirecting to Google…");
        return;
      }
      setSession({
        email: user.email,
        name: user.displayName || (user.email || "").split("@")[0],
        provider: "google",
        id: user.uid,
        photoURL: user.photoURL || null
      });
      updateProfileChip();
      closeAuthModal();
      await refreshCatalogueFromCloud();
      renderAll();
      if (typeof setCloudStatus === "function") {
        setCloudStatus("Live · Firebase · " + APPS.length, "live");
      }
      toast("Signed in with Google · " + (user.displayName || user.email));
    } catch (err) {
      console.warn(err);
      let msg = err.message || "Google sign-in failed";
      if (err.code === "auth/unauthorized-domain") {
        msg = "Add this domain in Firebase → Authentication → Settings → Authorized domains";
      } else if (err.code === "auth/popup-closed-by-user") {
        msg = "Google window closed — try again (allow popups for this site)";
      } else if (location.protocol === "file:") {
        msg = "Don't open index.html as a file. Run \"npx serve\" and use the http://localhost address (or just use the live Vercel site)";
      }
      toast(msg);
    }
  }

  async function signOut() {
    if (USE_CLOUD) {
      try { await FB.signOut(); } catch (e) { /* ignore */ }
    }
    setSession(null);
    updateProfileChip();
    closeAuthModal();
    renderAll();
    toast("Signed out");
  }

  /** Load apps from Firebase — replaces local catalogue completely */
  async function refreshCatalogueFromCloud() {
    if (!USE_CLOUD) return true;
    const remote = await FB.fetchApps();
    APPS.length = 0;
    remote.forEach((r) => APPS.push(r));
    console.log("Catalogue loaded from Firebase:", APPS.length, "apps");
    return true;
  }

  /* ---------------------------------------------------------------------
     View routing
     --------------------------------------------------------------------- */
  let lastView = "discover";
  let currentAppId = null;

  function goto(viewId) {
    const active = document.querySelector(".view.active");
    if (active && active.id && active.id !== "view-app") {
      lastView = active.id.replace(/^view-/, "");
    }
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    document.querySelectorAll(".rail-btn[data-view]").forEach((b) => b.classList.remove("active"));
    const view = document.getElementById("view-" + viewId);
    const btn = document.querySelector(`.rail-btn[data-view="${viewId}"]`);
    if (view) view.classList.add("active");
    if (btn) btn.classList.add("active");
    // App page has no rail button — leave none active
    document.querySelector(".main").scrollTo({ top: 0, behavior: "smooth" });
  }
  document.querySelectorAll(".rail-btn[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => goto(btn.dataset.view));
  });
  document.querySelectorAll("[data-goto]").forEach((el) => {
    el.addEventListener("click", () => goto(el.dataset.goto));
  });
  document.querySelectorAll("[data-goto-cat]").forEach((el) => {
    el.addEventListener("click", () => {
      activeCategory = el.dataset.gotoCat || "mlabs";
      searchTerm = "";
      const si = document.getElementById("searchInput");
      if (si) si.value = "";
      goto("categories");
      renderCategoryChips();
      renderCategoryGrid();
    });
  });

  /* ---------------------------------------------------------------------
     Card + rail rendering
     --------------------------------------------------------------------- */
  function starRow(rating) {
    return `<span class="rating"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.1 6.6 7.2.9-5.3 5 1.4 7.2L12 18l-6.4 3.7 1.4-7.2-5.3-5 7.2-.9z"/></svg>${rating.toFixed(1)}</span>`;
  }

  function cardHTML(app, forceCompany) {
    const isInstalled = installed.has(app.id);
    const managed = canManage(app);
    const company = forceCompany || isCompanyApp(app);
    let btnLabel = "Install";
    let btnClass = "card-install";
    let btnAttr = `data-install="${app.id}"`;
    if (managed) {
      btnLabel = "Update";
      btnClass = "card-install is-owner";
      btnAttr = `data-update="${app.id}"`;
    } else if (isInstalled) {
      btnLabel = "Installed";
      btnClass = "card-install installed";
      btnAttr = `data-install="${app.id}"`;
    }
    const companyBadge = company
      ? `<span class="company-badge">MLabs</span>`
      : "";
    return `
      <article class="app-card ${company ? "company-card" : ""}" data-id="${app.id}">
        ${buildIconSVG(app)}
        <h3>${app.name}</h3>
        <p class="tagline">${app.tagline}</p>
        <div class="card-meta">
          ${starRow(app.rating)}
          ${companyBadge}
          <button class="${btnClass}" ${btnAttr}>
            ${btnLabel}
          </button>
        </div>
      </article>`;
  }

  function featureCardHTML(app) {
    return `
      <article class="feature-card" data-id="${app.id}">
        <div class="fc-bg" style="background:
          radial-gradient(120% 140% at 20% 0%, hsla(${app.hue} 70% 45% / 0.55), transparent 60%),
          linear-gradient(160deg, hsl(${app.hue} 30% 14%), #0a0908 75%);"></div>
        <div class="fc-scrim"></div>
        <div class="fc-body">
          <p class="fc-tag">Editor's pick · ${CATEGORIES.find((c) => c.id === app.category).label}</p>
          <h3>${app.name}</h3>
          <p>${app.tagline}</p>
        </div>
      </article>`;
  }

  function renderDiscover() {
    const company = APPS.filter((a) => isCompanyApp(a));
    const companySection = document.getElementById("companySection");
    const companyRail = document.getElementById("companyRail");
    if (companySection && companyRail) {
      if (company.length) {
        companySection.style.display = "";
        companyRail.innerHTML = company.map((a) => cardHTML(a, true)).join("");
      } else {
        companySection.style.display = "none";
        companyRail.innerHTML = "";
      }
    }

    const editorial = APPS.filter((a) => a.editorial);
    const trending = APPS.filter((a) => a.trending);
    const recent = [...APPS].slice(0, 8);

    const ed = document.getElementById("editorialRail");
    const tr = document.getElementById("trendingRail");
    const re = document.getElementById("recentGrid");
    if (ed) ed.innerHTML = editorial.map(featureCardHTML).join("");
    if (tr) tr.innerHTML = trending.map(cardHTML).join("");
    if (re) re.innerHTML = recent.map(cardHTML).join("");
  }

  function renderCategoryChips() {
    const row = document.getElementById("categoryChips");
    row.innerHTML = CATEGORIES.map(
      (c) => `<button class="chip ${c.id === activeCategory ? "active" : ""}" data-cat="${c.id}">${c.label}</button>`
    ).join("");
    row.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        activeCategory = chip.dataset.cat;
        renderCategoryChips();
        renderCategoryGrid();
      });
    });
  }

  function renderCategoryGrid() {
    const grid = document.getElementById("categoryGrid");
    const empty = document.getElementById("categoryEmpty");
    let list = APPS;
    if (activeCategory === "mlabs") {
      // Dedicated MLabs shelf — studio apps only
      list = list.filter((a) => isCompanyApp(a) || a.category === "mlabs");
    } else if (activeCategory !== "all") {
      list = list.filter((a) => a.category === activeCategory);
    }
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter((a) => companyMatchesQuery(a, t));
      list = sortCompanyFirst(list);
    } else if (activeCategory !== "mlabs") {
      list = sortCompanyFirst(list);
    }
    if (grid) grid.innerHTML = list.map((a) => cardHTML(a, isCompanyApp(a))).join("");
    if (empty) empty.style.display = list.length ? "none" : "block";
  }

  function uploadCardHTML(app) {
    return `
      <article class="app-card upload-card" data-id="${app.id}">
        ${buildIconSVG(app)}
        <h3>${app.name}</h3>
        <p class="tagline">${app.tagline}</p>
        <div class="card-meta">
          <span class="upload-badge">Your listing · v${app.version}</span>
        </div>
        <div class="upload-actions">
          <button type="button" class="btn btn-primary btn-sm" data-edit-upload="${app.id}">Edit listing</button>
          <button type="button" class="btn btn-ghost btn-sm" data-open-upload="${app.id}">View page</button>
          <button type="button" class="btn btn-danger btn-sm" data-remove-upload="${app.id}">Remove</button>
        </div>
      </article>`;
  }

  function renderLibrary() {
    const grid = document.getElementById("libraryGrid");
    const empty = document.getElementById("libraryEmpty");
    const installedList = APPS.filter((a) => installed.has(a.id));
    if (grid) grid.innerHTML = installedList.map(cardHTML).join("");
    if (empty) empty.style.display = installedList.length ? "none" : "block";
    const instCount = document.getElementById("installedCount");
    if (instCount) instCount.textContent = installedList.length ? String(installedList.length) : "";

    const u = currentUser();
    const uploadsGrid = document.getElementById("uploadsGrid");
    const uploadsEmpty = document.getElementById("uploadsEmpty");
    const uploadsCount = document.getElementById("uploadsCount");
    const uploadsEmptyMsg = document.getElementById("uploadsEmptyMsg");
    const uploadsHint = document.getElementById("uploadsHint");

    let uploads = [];
    if (devMode) {
      uploads = APPS.filter((a) => a._ownerEmail || a._submitted);
    } else if (u) {
      uploads = APPS.filter((a) => a._ownerEmail && a._ownerEmail === u.email);
    }

    if (uploadsGrid) uploadsGrid.innerHTML = uploads.map(uploadCardHTML).join("");
    if (uploadsEmpty) uploadsEmpty.style.display = uploads.length ? "none" : "block";
    if (uploadsCount) uploadsCount.textContent = uploads.length ? String(uploads.length) : "";
    if (uploadsEmptyMsg) {
      uploadsEmptyMsg.textContent = u
        ? "No uploads yet. Use Submit app — your listings appear here so you can edit them."
        : "Sign in to see and edit apps you’ve uploaded.";
    }
    if (uploadsHint) {
      uploadsHint.style.display = u || devMode ? "" : "none";
    }
  }

  /* ---------------------------------------------------------------------
     Settings view
     --------------------------------------------------------------------- */
  function renderSettings() {
    const signedOut = document.getElementById("settingsAccountSignedOut");
    const signedIn = document.getElementById("settingsAccountSignedIn");
    if (!signedOut || !signedIn) return; // view not in DOM yet on first paint

    const u = currentUser();
    if (u) {
      signedOut.style.display = "none";
      signedIn.style.display = "block";
      document.getElementById("settingsName").textContent = u.name || (u.email || "").split("@")[0];
      document.getElementById("settingsEmail").textContent = u.email || "";
      document.getElementById("settingsProvider").textContent =
        u.provider === "google" ? "Signed in with Google" : "Email & password";
      const av = document.getElementById("settingsAvatar");
      if (av) {
        if (u.photoURL) {
          av.innerHTML = `<img src="${u.photoURL}" alt="" referrerpolicy="no-referrer" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
        } else {
          av.textContent = (u.name || u.email || "?").charAt(0).toUpperCase();
        }
      }
    } else {
      signedOut.style.display = "block";
      signedIn.style.display = "none";
    }

    const devPanel = document.getElementById("settingsDevPanel");
    if (devPanel) devPanel.style.display = devMode ? "block" : "none";

    const backendEl = document.getElementById("settingsBackend");
    if (backendEl) backendEl.textContent = USE_CLOUD ? "Live · Firebase" : "Offline (local only)";
    const countEl = document.getElementById("settingsAppCount");
    if (countEl) countEl.textContent = String(APPS.length);
    const instEl = document.getElementById("settingsInstalledCount");
    if (instEl) instEl.textContent = String(installed.size);
    const userStatus = document.getElementById("settingsUserStatus");
    if (userStatus) {
      userStatus.textContent = u ? (u.name || u.email || "Signed in") : "Guest";
    }
  }

  function renderAll() {
    renderDiscover();
    renderCategoryGrid();
    renderLibrary();
    renderSettings();
  }

  /* ---------------------------------------------------------------------
     Full app product page (like other stores)
     --------------------------------------------------------------------- */
  async function openDetail(app) {
    currentAppId = app.id;
    const page = document.getElementById("appPage");
    if (!page) return;

    // Load live reviews before rendering the product page
    if (USE_CLOUD) {
      try {
        await loadReviewsForApp(app.id);
      } catch (e) {
        console.warn("reviews load", e);
      }
    }

    const isInstalled = installed.has(app.id);
    const managed = canManage(app);
    const owned = isOwner(app);
    const catLabel = (CATEGORIES.find((c) => c.id === app.category) || {}).label || app.category;
    const hue = app.hue != null ? app.hue : 42;

    const downloadUrl = getAppDownloadUrl(app);
    const downloadBtn = downloadUrl
      ? `<button type="button" class="btn btn-ghost" id="detailDownload" data-url="${escapeHtml(downloadUrl)}">Download</button>`
      : `<button type="button" class="btn btn-ghost" id="detailDownload" disabled title="No download link on this listing">Download</button>`;

    let actionsHtml;
    if (managed) {
      const note =
        devMode && !owned
          ? "Developer mode · edit, remove, or open the download link"
          : "You published this · Edit, Remove, and Download stay available to you";
      actionsHtml = `
        <div class="ap-actions">
          <button class="btn btn-primary btn-lg" id="detailUpdate">Edit listing</button>
          ${downloadBtn}
          <button class="btn btn-ghost" id="detailRemove">Remove</button>
        </div>
        <p class="ap-note">${note}</p>
      `;
    } else {
      actionsHtml = `
        <div class="ap-actions">
          <button class="btn btn-primary btn-lg" id="detailInstall">${isInstalled ? "Open" : "Install"}</button>
          ${downloadBtn}
          <div class="install-progress" id="detailProgress"><i></i></div>
        </div>
        ${
          app._submitted
            ? `<p class="ap-note muted">Community listing · offline demo</p>`
            : ""
        }
      `;
    }

    page.innerHTML = `
      <button type="button" class="ap-back" id="detailClose">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 18l-6-6 6-6"/></svg>
        Back
      </button>

      <div class="ap-hero" style="--ap-hue:${hue}">
        <div class="ap-hero-glow"></div>
        <div class="ap-hero-inner">
          <div class="ap-icon">${buildIconSVG(app)}</div>
          <div class="ap-hero-text">
            <p class="ap-eyebrow">${catLabel}</p>
            <h1>${escapeHtml(app.name)}</h1>
            <p class="ap-publisher">${publisherLine(app)}</p>
            <p class="ap-tagline">${escapeHtml(app.tagline || "")}</p>
            <p class="ap-meta">v${escapeHtml(app.version)} · ${escapeHtml(app.size)} · Updated ${escapeHtml(app.updated)}</p>
            ${actionsHtml}
          </div>
        </div>
      </div>

      <div class="ap-stats">
        <div class="ap-stat"><b>${app.rating.toFixed(1)}</b><span>Rating</span></div>
        <div class="ap-stat"><b>${app.reviews.toLocaleString()}</b><span>Reviews</span></div>
        <div class="ap-stat"><b>${escapeHtml(app.size)}</b><span>Size</span></div>
        <div class="ap-stat"><b>v${escapeHtml(app.version)}</b><span>Version</span></div>
      </div>

      <div class="ap-section">
        <h2>Preview</h2>
        <p class="ap-preview-hint">Tap a screenshot to enlarge</p>
        <div class="ap-screens">${renderScreens(app)}</div>
      </div>

      <div class="ap-section">
        <h2>About this app</h2>
        <p class="ap-desc">${app.description.replace(/\n/g, "<br>")}</p>
      </div>

      <div class="ap-section ap-info-grid">
        <div>
          <h3>Publisher</h3>
          <p>${publisherPlain(app)}</p>
        </div>
        <div>
          <h3>Category</h3>
          <p>${catLabel}</p>
        </div>
        <div>
          <h3>Last updated</h3>
          <p>${escapeHtml(app.updated)}</p>
        </div>
        <div>
          <h3>Version</h3>
          <p>${escapeHtml(app.version)}</p>
        </div>
      </div>

      ${ratingsSectionHTML(app)}
    `;

    goto("app");

    document.getElementById("detailClose").addEventListener("click", closeDetail);
    const installBtn = document.getElementById("detailInstall");
    if (installBtn) installBtn.addEventListener("click", () => handleInstall(app.id, true));
    const updateBtn = document.getElementById("detailUpdate");
    if (updateBtn) updateBtn.addEventListener("click", () => openUpdate(app.id));
    const removeBtn = document.getElementById("detailRemove");
    if (removeBtn) removeBtn.addEventListener("click", () => openRemoveConfirm(app.id));
    const downloadBtnEl = document.getElementById("detailDownload");
    if (downloadBtnEl) {
      downloadBtnEl.addEventListener("click", () => {
        const url = downloadBtnEl.dataset.url || getAppDownloadUrl(app);
        openDownloadLink(url);
      });
    }

    page.querySelectorAll(".ap-screens img.screen-ph.real").forEach((img) => {
      img.style.cursor = "zoom-in";
      img.addEventListener("click", () => openShotLightbox(img.src));
    });
    bindRatingsUI(app);
  }

  // In-memory cache of cloud reviews (keyed by app id)
  const reviewsCache = {};

  function socialFromReviews(list, myUid) {
    const stars = [];
    const comments = [];
    let up = 0;
    let down = 0;
    let myVote = 0;
    let myStars = 0;
    (list || []).forEach((r) => {
      const kind = r.kind || (r.vote ? "vote" : r.body || r.emoji ? "comment" : "star");
      if (kind === "star" && r.stars > 0) {
        stars.push(r.stars);
        if (myUid && r.userId === myUid) myStars = r.stars;
      }
      if (kind === "vote") {
        if (r.vote === 1) {
          up++;
          if (myUid && r.userId === myUid) myVote = 1;
        }
        if (r.vote === -1) {
          down++;
          if (myUid && r.userId === myUid) myVote = -1;
        }
      }
      if (kind === "comment" && (r.body || r.emoji)) {
        comments.push({
          stars: r.stars || 0,
          emoji: r.emoji || "",
          text: r.body || "",
          when: r.when || "",
          userName: r.userName || ""
        });
      }
    });
    return { stars, comments, up, down, myVote, myStars };
  }

  function getAppSocial(appId) {
    const u = currentUser();
    const list = reviewsCache[appId] || [];
    return socialFromReviews(list, u && u.id);
  }

  async function loadReviewsForApp(appId) {
    if (!USE_CLOUD) {
      reviewsCache[appId] = reviewsCache[appId] || [];
      return reviewsCache[appId];
    }
    try {
      const list = await FB.fetchReviews(appId);
      reviewsCache[appId] = list;
      return list;
    } catch (e) {
      console.warn(e);
      reviewsCache[appId] = reviewsCache[appId] || [];
      return reviewsCache[appId];
    }
  }

  function avgStars(social, fallback) {
    if (social.stars && social.stars.length) {
      return social.stars.reduce((a, b) => a + b, 0) / social.stars.length;
    }
    return fallback || 0;
  }

  function ratingsSectionHTML(app) {
    const social = getAppSocial(app.id);
    const avg = avgStars(social, app.rating);
    const count = social.stars.length || app.reviews || 0;
    const comments = social.comments
      .slice()
      .reverse()
      .slice(0, 20)
      .map(
        (c) => `
      <div class="rv-comment">
        <div class="rv-comment-head">
          <span class="rv-stars-inline">${"★".repeat(c.stars || 0)}${"☆".repeat(5 - (c.stars || 0))}</span>
          <span class="rv-emoji">${c.emoji || ""}</span>
          <span class="rv-when">${escapeHtml(c.userName ? c.userName + " · " : "")}${escapeHtml(c.when || "")}</span>
        </div>
        <p>${escapeHtml(c.text || "")}</p>
      </div>`
      )
      .join("");
    return `
      <div class="ap-section rv-section">
        <h2>Ratings &amp; feedback</h2>
        <p class="ap-preview-hint">${USE_CLOUD ? "Saved online to Firebase — visible to everyone." : "Offline — stays on this device only."}</p>
        <div class="rv-summary">
          <div class="rv-avg"><b id="rvAvg">${avg.toFixed(1)}</b><span id="rvCount">${count} ratings</span></div>
          <div class="rv-stars" id="rvStarPick" data-app="${app.id}">
            ${[1, 2, 3, 4, 5]
              .map(
                (n) =>
                  `<button type="button" class="rv-star ${social.myStars >= n ? "on" : ""}" data-star="${n}" aria-label="${n} stars">★</button>`
              )
              .join("")}
          </div>
        </div>
        <div class="rv-votes">
          <button type="button" class="rv-thumb ${social.myVote === 1 ? "on" : ""}" id="rvUp">👍 <span id="rvUpN">${social.up || 0}</span></button>
          <button type="button" class="rv-thumb ${social.myVote === -1 ? "on" : ""}" id="rvDown">👎 <span id="rvDownN">${social.down || 0}</span></button>
        </div>
        <div class="rv-compose">
          <div class="rv-emoji-row" id="rvEmojiRow">
            ${["🔥", "💯", "✨", "😍", "🚀", "🐛", "💡", "👏"]
              .map((e) => `<button type="button" class="rv-emoji-btn" data-emoji="${e}">${e}</button>`)
              .join("")}
          </div>
          <textarea id="rvComment" rows="3" maxlength="400" placeholder="Write a free comment (optional)…"></textarea>
          <button type="button" class="btn btn-primary btn-sm" id="rvSubmit">Post feedback</button>
        </div>
        <div class="rv-list" id="rvList">${comments || `<p class="rv-empty">No comments yet — be the first.</p>`}</div>
      </div>`;
  }

  function bindRatingsUI(app) {
    let pickedStars = getAppSocial(app.id).myStars || 0;
    let pickedEmoji = "";

    async function requireUser() {
      const u = USE_CLOUD ? await ensureCloudSession() : currentUser();
      if (!u) {
        toast("Sign in to rate or comment");
        openAuthModal();
        return null;
      }
      return u;
    }

    async function refreshReviewsUI() {
      await loadReviewsForApp(app.id);
      openDetail(app);
    }

    const starBox = document.getElementById("rvStarPick");
    if (starBox) {
      starBox.querySelectorAll(".rv-star").forEach((btn) => {
        btn.addEventListener("click", async () => {
          pickedStars = Number(btn.dataset.star);
          starBox.querySelectorAll(".rv-star").forEach((b) => {
            b.classList.toggle("on", Number(b.dataset.star) <= pickedStars);
          });
          if (!USE_CLOUD) {
            toast(`Rated ${pickedStars}★ (offline)`);
            return;
          }
          const u = await requireUser();
          if (!u) return;
          try {
            await FB.setStars(app.id, pickedStars);
            toast(`Rated ${pickedStars}★`);
            await refreshReviewsUI();
          } catch (err) {
            toast(err.message || "Could not save rating");
          }
        });
      });
    }

    document.querySelectorAll(".rv-emoji-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".rv-emoji-btn").forEach((b) => b.classList.remove("on"));
        btn.classList.add("on");
        pickedEmoji = btn.dataset.emoji;
      });
    });

    const up = document.getElementById("rvUp");
    const down = document.getElementById("rvDown");
    async function vote(dir) {
      if (!USE_CLOUD) {
        toast("Votes need Firebase");
        return;
      }
      const u = await requireUser();
      if (!u) return;
      try {
        const next = await FB.setVote(app.id, dir);
        if (next === 1) toast("👍");
        else if (next === -1) toast("👎");
        else toast("Vote removed");
        await refreshReviewsUI();
      } catch (err) {
        toast(err.message || "Could not save vote");
      }
    }
    if (up) up.addEventListener("click", () => vote(1));
    if (down) down.addEventListener("click", () => vote(-1));

    const submit = document.getElementById("rvSubmit");
    if (submit) {
      submit.addEventListener("click", async () => {
        const text = (document.getElementById("rvComment")?.value || "").trim();
        if (!pickedStars && !text && !pickedEmoji) {
          toast("Pick stars, an emoji, or write a comment");
          return;
        }
        if (!USE_CLOUD) {
          toast("Feedback needs Firebase");
          return;
        }
        const u = await requireUser();
        if (!u) return;
        try {
          if (pickedStars) await FB.setStars(app.id, pickedStars);
          await FB.addReview(app.id, {
            stars: pickedStars || 0,
            emoji: pickedEmoji || "",
            body: text || ""
          });
          toast("Feedback posted online");
          await refreshReviewsUI();
        } catch (err) {
          toast(err.message || "Could not post feedback");
        }
      });
    }
  }


  function getAppDownloadUrl(app) {
    if (!app) return "";
    if (app._downloadUrl && /^https?:\/\//i.test(app._downloadUrl)) return app._downloadUrl.trim();
    const m = (app.description || "").match(/Download:\s*(\S+)/i);
    if (m && /^https?:\/\//i.test(m[1])) return m[1].trim();
    return "";
  }

  function openDownloadLink(url) {
    if (!url || !/^https?:\/\//i.test(url)) {
      toast("No valid download link on this listing");
      return;
    }
    try {
      window.open(url, "_blank", "noopener,noreferrer");
      toast("Opening download link…");
    } catch (e) {
      // fallback
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    }
  }

  function publisherPlain(app) {
    if (app._publisher) return escapeHtml(app._publisher);
    if (app._ownerEmail) {
      const u = currentUser();
      if (u && u.email === app._ownerEmail) {
        return escapeHtml((u.studio ? u.name + " · " + u.studio : u.name) || u.email);
      }
      return escapeHtml(app._ownerEmail.split("@")[0]);
    }
    return "Auriser Editorial";
  }

  function publisherLine(app) {
    return "by " + publisherPlain(app);
  }

  function screenshotSVG(app, i) {
    const h = app.hue + i * 14;
    return `<svg class="screen-ph" viewBox="0 0 150 260" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="scr-${app.id}-${i}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsl(${h} 45% 20%)"/><stop offset="100%" stop-color="hsl(${h + 20} 40% 10%)"/>
      </linearGradient></defs>
      <rect width="150" height="260" fill="url(#scr-${app.id}-${i})"/>
      <rect x="14" y="${28 + i * 30}" width="90" height="8" rx="4" fill="rgba(244,239,226,0.25)"/>
      <rect x="14" y="${46 + i * 30}" width="122" height="8" rx="4" fill="rgba(244,239,226,0.14)"/>
      <rect x="14" y="150" width="122" height="70" rx="8" fill="rgba(212,175,55,0.18)"/>
    </svg>`;
  }

  function renderScreens(app) {
    const shots = Array.isArray(app._screenshots) ? app._screenshots.filter(Boolean) : [];
    if (shots.length) {
      return shots
        .map(
          (src, i) =>
            `<img class="screen-ph real" src="${src}" alt="${escapeHtml(app.name)} screenshot ${i + 1}" data-lightbox="1" />`
        )
        .join("");
    }
    return [0, 1, 2].map((i) => screenshotSVG(app, i)).join("");
  }

  function openShotLightbox(src) {
    const box = document.getElementById("shotLightbox");
    const img = document.getElementById("shotLightboxImg");
    if (!box || !img) return;
    img.src = src;
    box.hidden = false;
    box.classList.add("open");
  }
  function closeShotLightbox() {
    const box = document.getElementById("shotLightbox");
    if (!box) return;
    box.classList.remove("open");
    box.hidden = true;
  }

  function closeDetail() {
    currentAppId = null;
    goto(lastView || "discover");
  }

  /* ---------------------------------------------------------------------
     Install simulation
     --------------------------------------------------------------------- */
  function handleInstall(id, fromDetail) {
    if (installed.has(id)) {
      if (fromDetail) toast("Already installed — this would open the app.");
      return;
    }
    const app = APPS.find((a) => a.id === id);
    toast(`Installing ${app.name}…`);

    if (fromDetail) {
      const progress = document.getElementById("detailProgress");
      if (progress) {
        const bar = progress.querySelector("i");
        progress.classList.add("show");
        requestAnimationFrame(() => {
          if (bar) bar.style.width = "100%";
        });
      }
      setTimeout(() => finishInstall(id), 1500);
    } else {
      setTimeout(() => finishInstall(id), 900);
    }
  }

  function finishInstall(id) {
    installed.add(id);
    const app = APPS.find((a) => a.id === id);
    // Apps installed while in developer mode become company apps
    if (devMode) {
      markCompanyApp(id);
      toast(`${app ? app.name : "App"} installed · marked as company app`);
    } else {
      toast(`${app ? app.name : "App"} installed`);
    }
    renderAll();
    if (currentAppId === id && app) openDetail(app);
  }

  document.addEventListener("click", (e) => {
    const editUpload = e.target.closest("[data-edit-upload]");
    if (editUpload) {
      e.stopPropagation();
      openUpdate(editUpload.dataset.editUpload);
      return;
    }
    const openUpload = e.target.closest("[data-open-upload]");
    if (openUpload) {
      e.stopPropagation();
      const app = APPS.find((a) => a.id === openUpload.dataset.openUpload);
      if (app) openDetail(app);
      return;
    }
    const removeUpload = e.target.closest("[data-remove-upload]");
    if (removeUpload) {
      e.stopPropagation();
      openRemoveConfirm(removeUpload.dataset.removeUpload);
      return;
    }
    const updateBtn = e.target.closest("[data-update]");
    if (updateBtn) {
      e.stopPropagation();
      openUpdate(updateBtn.dataset.update);
      return;
    }
    const installBtn = e.target.closest("[data-install]");
    if (installBtn) {
      e.stopPropagation();
      handleInstall(installBtn.dataset.install, false);
      return;
    }
    const card = e.target.closest(".app-card, .feature-card");
    if (card) {
      const app = APPS.find((a) => a.id === card.dataset.id);
      if (app) openDetail(app);
    }
  });

  /* ---------------------------------------------------------------------
     Search
     --------------------------------------------------------------------- */
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", () => {
    searchTerm = searchInput.value.trim();
    if (searchTerm) goto("categories");
    renderCategoryGrid();
  });

  /* ---------------------------------------------------------------------
     Toasts
     --------------------------------------------------------------------- */
  // Combined clipboard buffer so multiple toasts become one paste

  function toast(msg) {
    const stack = document.getElementById("toastStack");
    if (!stack) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    el.title = "Click to copy";
    el.addEventListener("click", () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(String(msg));
          el.classList.add("copied");
          const prev = el.textContent;
          el.textContent = "Copied";
          setTimeout(() => {
            el.textContent = prev;
            el.classList.remove("copied");
          }, 900);
        }
      } catch (e) {}
    });
    stack.appendChild(el);

    setTimeout(() => {
      el.style.transition = "opacity .35s ease, transform .35s ease";
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
      setTimeout(() => el.remove(), 360);
    }, 4500);
  }

  /* ---------------------------------------------------------------------
     Theme toggle
     --------------------------------------------------------------------- */
  const themeBtn = document.getElementById("themeToggle");
  function currentTheme() {
    try {
      return localStorage.getItem("auriser_theme");
    } catch (e) {
      return null;
    }
  }
  function applyTheme(t) {
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
  }
  applyTheme(currentTheme());
  function toggleTheme() {
    const isLight =
      document.documentElement.getAttribute("data-theme") === "light" ||
      (!document.documentElement.getAttribute("data-theme") &&
        window.matchMedia("(prefers-color-scheme: light)").matches);
    const next = isLight ? "dark" : "light";
    applyTheme(next);
    try {
      localStorage.setItem("auriser_theme", next);
    } catch (e) {
      /* ignore */
    }
  }
  themeBtn.addEventListener("click", toggleTheme);

  // Settings view — reuses the same functions the rest of the app already has
  document.getElementById("settingsSignIn").addEventListener("click", openAuthModal);
  document.getElementById("settingsSignOut").addEventListener("click", signOut);
  document.getElementById("settingsThemeToggle").addEventListener("click", toggleTheme);
  document.getElementById("settingsReplayTour").addEventListener("click", () => {
    if (typeof runOnboarding === "function") runOnboarding(true);
  });
  document.getElementById("settingsLeaveDev").addEventListener("click", leaveDevMode);

  // Store options (Settings)
  const sortSel = document.getElementById("settingsDefaultSort");
  if (sortSel) {
    sortSel.value = localStorage.getItem("auriser_default_sort") || "trending";
    sortSel.addEventListener("change", () => {
      localStorage.setItem("auriser_default_sort", sortSel.value);
      toast("Default sort: " + sortSel.options[sortSel.selectedIndex].text);
      try { renderDiscover(); } catch (e) {}
    });
  }
  const compactToggle = document.getElementById("settingsCompactCards");
  if (compactToggle) {
    compactToggle.checked = localStorage.getItem("auriser_compact_cards") === "1";
    document.body.classList.toggle("compact-cards", compactToggle.checked);
    compactToggle.addEventListener("change", () => {
      localStorage.setItem("auriser_compact_cards", compactToggle.checked ? "1" : "0");
      document.body.classList.toggle("compact-cards", compactToggle.checked);
      toast(compactToggle.checked ? "Compact cards on" : "Compact cards off");
    });
  }
  const editorialToggle = document.getElementById("settingsEditorialFirst");
  if (editorialToggle) {
    const v = localStorage.getItem("auriser_editorial_first");
    editorialToggle.checked = v === null ? true : v === "1";
    editorialToggle.addEventListener("change", () => {
      localStorage.setItem("auriser_editorial_first", editorialToggle.checked ? "1" : "0");
      toast(editorialToggle.checked ? "Editorial picks first" : "Editorial picks mixed");
      try { renderDiscover(); } catch (e) {}
    });
  }
  const motionToggle = document.getElementById("settingsReduceMotion");
  if (motionToggle) {
    motionToggle.checked = localStorage.getItem("auriser_reduce_motion") === "1";
    document.documentElement.classList.toggle("force-reduce-motion", motionToggle.checked);
    motionToggle.addEventListener("change", () => {
      localStorage.setItem("auriser_reduce_motion", motionToggle.checked ? "1" : "0");
      document.documentElement.classList.toggle("force-reduce-motion", motionToggle.checked);
      toast(motionToggle.checked ? "Motion reduced" : "Motion restored");
    });
  }
  const openLinkHelpBtn = document.getElementById("settingsOpenLinkHelp");
  if (openLinkHelpBtn) {
    openLinkHelpBtn.addEventListener("click", () => {
      if (typeof openLinkHelp === "function") openLinkHelp();
      else {
        document.getElementById("linkHelpScrim")?.classList.add("open");
        document.getElementById("linkHelpModal")?.classList.add("open");
      }
    });
  }

  document.getElementById("settingsClearLibrary").addEventListener("click", () => {
    if (installed.size === 0) {
      toast("Nothing installed on this device yet");
      return;
    }
    installed.clear();
    renderAll();
    toast("Cleared installed apps from this device");
  });
  const notifyToggle = document.getElementById("settingsNotifyUpdates");
  if (notifyToggle) {
    try {
      notifyToggle.checked = localStorage.getItem("auriser_notify_updates") === "1";
    } catch (e) {
      /* ignore */
    }
    notifyToggle.addEventListener("change", () => {
      try {
        localStorage.setItem("auriser_notify_updates", notifyToggle.checked ? "1" : "0");
      } catch (e) {
        /* ignore */
      }
      toast(notifyToggle.checked ? "You'll see a reminder here on updates" : "Update reminders off");
    });
  }

  /* ---------------------------------------------------------------------
     Ambient drifting field (the one signature bit of non-triggered motion)
     --------------------------------------------------------------------- */
  function startField() {
    const canvas = document.getElementById("fieldCanvas");
    const ctx = canvas.getContext("2d");
    let w, h, dots;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    function seedDots() {
      dots = Array.from({ length: 46 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 1.4,
        vx: (Math.random() - 0.5) * 0.06,
        vy: (Math.random() - 0.5) * 0.06,
        a: 0.15 + Math.random() * 0.35,
      }));
    }
    resize();
    seedDots();
    window.addEventListener("resize", () => {
      resize();
    });

    if (reduce) {
      ctx.clearRect(0, 0, w, h);
      dots.forEach((d) => {
        ctx.beginPath();
        ctx.fillStyle = `rgba(212,175,55,${d.a})`;
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      });
      return;
    }

    function tick() {
      ctx.clearRect(0, 0, w, h);
      dots.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0) d.x = w;
        if (d.x > w) d.x = 0;
        if (d.y < 0) d.y = h;
        if (d.y > h) d.y = 0;
        ctx.beginPath();
        ctx.fillStyle = `rgba(212,175,55,${d.a})`;
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(tick);
    }
    tick();
  }

  /* ---------------------------------------------------------------------
     Publish / Submit app modal — full offline simulation
     --------------------------------------------------------------------- */
  const publishScrim = document.getElementById("publishScrim");
  const publishModal = document.getElementById("publishModal");
  let pmStep = 0;
  let pmIconDataUrl = null;
  let pmScreenshots = [null, null, null]; // up to 3 data URLs
  let pmShotTarget = 0;

  function renderShotSlots() {
    document.querySelectorAll(".pm-shot-slot").forEach((slot) => {
      const i = parseInt(slot.dataset.slot, 10);
      const img = slot.querySelector("img");
      const src = pmScreenshots[i];
      if (src) {
        slot.classList.remove("empty");
        img.src = src;
      } else {
        slot.classList.add("empty");
        img.removeAttribute("src");
      }
    });
  }

  function openPublish() {
    requireAuth(() => {
      editingAppId = null;
      pmStep = 0;
      pmIconDataUrl = null;
      pmScreenshots = [null, null, null];
      resetPublishForm();
      document.getElementById("pmTitle").textContent = "Submit your app";
      document.querySelector("#publishModal .pm-head p").textContent =
        "Your listing is saved to Firebase and tagged to your account. You can edit or remove it anytime from Library → Your uploads.";
      showPmStep(0);
      document.getElementById("pmSuccess").classList.remove("show");
      document.getElementById("pmActions").style.display = "flex";
      ["pmForm0", "pmForm1", "pmForm2"].forEach((id) => {
        document.getElementById(id).style.display = "";
      });
      const u = currentUser();
      if (u) document.getElementById("pmDev").value = u.name;
      publishScrim.classList.add("open");
      publishModal.classList.add("open");
    });
  }

  function openUpdate(appId) {
    const app = APPS.find((a) => a.id === appId);
    if (!app || !canManage(app)) {
      toast("You can only update apps you published");
      return;
    }
    // Owner updates still prefer auth; dev mode can edit without signing in
    const start = () => {
      editingAppId = appId;
      pmStep = 0;
      closeDetail();
      resetPublishForm();

      document.getElementById("pmName").value = app.name;
      document.getElementById("pmTagline").value = app.tagline || "";
      const descOnly = (app.description || "").split("\n\nDownload:")[0].trim();
      document.getElementById("pmDesc").value = descOnly;
      document.getElementById("pmVersion").value = app.version || "1.0.0";
      document.getElementById("pmGenre").value = app.category || "";
      document.getElementById("pmSize").value = app.size || "";
      document.getElementById("pmHue").value = String(app.hue != null ? app.hue : 42);
      const linkMatch = (app.description || "").match(/Download:\s*(\S+)/);
      document.getElementById("pmLink").value = linkMatch ? linkMatch[1] : "";
      document.getElementById("pmDev").value =
        (currentUser() &&
          (currentUser().studio
            ? currentUser().name + " · " + currentUser().studio
            : currentUser().name)) ||
        (devMode ? "Michael Uchechukwu · MLabs" : "MLabs");
      document.getElementById("pmNotes").value = "";
      if (app._iconDataUrl) {
        pmIconDataUrl = app._iconDataUrl;
        document.getElementById("pmIconImg").src = pmIconDataUrl;
        document.getElementById("pmIconDrop").classList.add("has-file");
      }
      const existingShots = Array.isArray(app._screenshots) ? app._screenshots.filter(Boolean) : [];
      pmScreenshots = [null, null, null];
      existingShots.slice(0, 3).forEach((src, i) => {
        pmScreenshots[i] = src;
      });
      renderShotSlots();

      document.getElementById("pmTitle").textContent = "Update listing";
      document.querySelector("#publishModal .pm-head p").textContent =
        "Change version, description, icon, screenshots, download link, or any other field. Changes save to Firebase.";
      showPmStep(0);
      document.getElementById("pmSuccess").classList.remove("show");
      document.getElementById("pmActions").style.display = "flex";
      ["pmForm0", "pmForm1", "pmForm2"].forEach((id) => {
        document.getElementById(id).style.display = "";
      });
      document.getElementById("pmNext").textContent = "Continue";
      publishScrim.classList.add("open");
      publishModal.classList.add("open");
    };
    if (devMode) start();
    else requireAuth(start);
  }

  function closePublish() {
    publishScrim.classList.remove("open");
    publishModal.classList.remove("open");
    editingAppId = null;
  }

  function resetPublishForm() {
    document.getElementById("pmName").value = "";
    document.getElementById("pmTagline").value = "";
    document.getElementById("pmDesc").value = "";
    document.getElementById("pmVersion").value = "1.0.0";
    document.getElementById("pmGenre").value = "";
    document.getElementById("pmSize").value = "";
    document.getElementById("pmHue").value = "42";
    document.getElementById("pmLink").value = "";
    const u0 = currentUser();
    document.getElementById("pmDev").value =
      (u0 && (u0.studio ? u0.name + " · " + u0.studio : u0.name)) || "Michael Uchechukwu · MLabs";
    document.getElementById("pmNotes").value = "";
    document.getElementById("pmIconFile").value = "";
    document.getElementById("pmIconDrop").classList.remove("has-file");
    pmScreenshots = [null, null, null];
    renderShotSlots();
    const shotFile = document.getElementById("pmShotFile");
    if (shotFile) shotFile.value = "";
    document.querySelectorAll(".pm-field").forEach((f) => f.classList.remove("invalid"));
    updatePmPreview();
  }

  function showPmStep(n) {
    pmStep = n;
    document.querySelectorAll(".pm-form").forEach((f) => f.classList.remove("active"));
    const form = document.getElementById("pmForm" + n);
    if (form) form.classList.add("active");

    document.querySelectorAll(".pm-step").forEach((s, i) => {
      s.classList.remove("active", "done");
      if (i < n) s.classList.add("done");
      if (i === n) s.classList.add("active");
    });

    document.getElementById("pmBack").style.display = n > 0 ? "" : "none";
    document.getElementById("pmNext").textContent =
      n === 2 ? (editingAppId ? "Save update" : "Submit to catalogue") : "Continue";
    if (n === 2) updatePmPreview();
  }

  function validatePmStep(n) {
    let ok = true;
    function req(fieldId, inputId, test) {
      const field = document.getElementById(fieldId);
      const val = document.getElementById(inputId).value.trim();
      const pass = test ? test(val) : !!val;
      field.classList.toggle("invalid", !pass);
      if (!pass) ok = false;
    }
    if (n === 0) {
      req("field-name", "pmName");
      req("field-tagline", "pmTagline");
      req("field-desc", "pmDesc", (v) => v.length >= 12);
      req("field-version", "pmVersion");
      req("field-genre", "pmGenre");
    } else if (n === 1) {
      req("field-size", "pmSize");
      req("field-link", "pmLink", (v) => {
        if (!v) return false;
        try {
          new URL(v);
          return true;
        } catch (e) {
          return false;
        }
      });
    }
    return ok;
  }

  function updatePmPreview() {
    const name = document.getElementById("pmName").value.trim() || "—";
    const tag = document.getElementById("pmTagline").value.trim() || "—";
    const cat = document.getElementById("pmGenre").value;
    const catLabel = cat
      ? (CATEGORIES.find((c) => c.id === cat) || {}).label || cat
      : "—";
    const ver = document.getElementById("pmVersion").value.trim() || "—";
    const size = document.getElementById("pmSize").value.trim() || "—";
    const link = document.getElementById("pmLink").value.trim() || "—";
    const dev = document.getElementById("pmDev").value.trim() || "—";
    document.getElementById("pmPreviewBox").innerHTML = `
      <strong style="color:var(--ink);font-size:14px;">${escapeHtml(name)}</strong><br/>
      <span style="color:var(--ink-faint);">${escapeHtml(tag)}</span><br/><br/>
      <span>${escapeHtml(catLabel)} · v${escapeHtml(ver)} · ${escapeHtml(size)}</span><br/>
      <span style="font-size:12px;">by ${escapeHtml(dev)}</span><br/>
      <span style="font-size:11.5px;word-break:break-all;opacity:0.75;">${escapeHtml(link)}</span>
    `;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function slugify(str) {
    return (
      str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 32) || "app"
    );
  }

  async function submitApp() {
    if (!validatePmStep(0) || !validatePmStep(1)) {
      if (!validatePmStep(0)) showPmStep(0);
      else showPmStep(1);
      return;
    }

    // Re-sync with Supabase so we don't trust a stale local cache
    const u = USE_SUPABASE ? await ensureCloudSession() : currentUser();
    // New publishes need sign-in; developer mode may update any app without a session
    if (!u && !(devMode && editingAppId)) {
      toast("Sign in required — use Email + password (not Google demo)");
      openAuthModal();
      return;
    }

    const name = document.getElementById("pmName").value.trim();
    const tagline = document.getElementById("pmTagline").value.trim();
    const description = document.getElementById("pmDesc").value.trim();
    const version = document.getElementById("pmVersion").value.trim();
    const category = document.getElementById("pmGenre").value;
    const size = document.getElementById("pmSize").value.trim();
    const hue = Math.max(0, Math.min(360, parseInt(document.getElementById("pmHue").value, 10) || 42));
    const link = document.getElementById("pmLink").value.trim();
    const notes = document.getElementById("pmNotes").value.trim();
    const fullDesc =
      description + (notes ? "\n\n" + notes : "") + (link ? "\n\nDownload: " + link : "");
    const publisher =
      document.getElementById("pmDev").value.trim() ||
      (u && u.studio ? u.name + " · " + u.studio : (u && u.name) || "MLabs");

    const payload = {
      name,
      tagline,
      description: fullDesc,
      version,
      category,
      size,
      hue,
      downloadUrl: link,
      icon: pmIconDataUrl || null,
      screenshots: pmScreenshots.filter(Boolean),
      publisher,
      _publisher: publisher,
      _downloadUrl: link
    };

    if (editingAppId) {
      const app = APPS.find((a) => a.id === editingAppId);
      if (!app || !canManage(app)) {
        toast("Update failed — not your app");
        return;
      }
      if (!devMode && !currentUser()) {
        toast("Sign in required");
        return;
      }

      if (USE_CLOUD && !devMode) {
        try {
          const updated = await FB.updateApp(editingAppId, payload);
          Object.assign(app, updated);
          if (pmIconDataUrl) app._iconDataUrl = pmIconDataUrl;
          app._screenshots = pmScreenshots.filter(Boolean);
          app._downloadUrl = link;
          app._publisher = publisher;
        } catch (err) {
          toast(err.message || "Update failed");
          return;
        }
      } else {
        app.name = name;
        app.tagline = tagline;
        app.description = fullDesc;
        app.version = version;
        app.category = category;
        app.size = size;
        app.hue = hue;
        app.updated = "Just now";
        if (pmIconDataUrl) app._iconDataUrl = pmIconDataUrl;
        app._screenshots = pmScreenshots.filter(Boolean);
        app._downloadUrl = link;
        app._publisher = publisher;
        saveOwnedApps();
      }

      renderAll();
      ["pmForm0", "pmForm1", "pmForm2"].forEach((id) => {
        document.getElementById(id).style.display = "none";
      });
      document.getElementById("pmActions").style.display = "none";
      document.getElementById("pmSuccessMsg").textContent =
        `"${name}" was updated. You still see Update; other accounts would see Install.`;
      document.getElementById("pmSuccess").classList.add("show");
      toast(`${name} updated`);
      editingAppId = null;
      return;
    }

    // New publish
    if (USE_CLOUD) {
      try {
        payload.screenshots = pmScreenshots.filter(Boolean);
        const created = await FB.publishApp(payload);
        created._submitted = true;
        created._ownerEmail = u.email;
        created._iconDataUrl = pmIconDataUrl;
        created._screenshots = pmScreenshots.filter(Boolean);
        created.trending = true;
        if (devMode) {
          created._company = true;
          markCompanyApp(created.id);
        }
        APPS.unshift(created);
      } catch (err) {
        toast(err.message || "Publish failed — are you signed in?");
        return;
      }
    } else {
      let id = slugify(name);
      if (APPS.some((a) => a.id === id)) id = id + "-" + Date.now().toString(36).slice(-4);

      const newApp = {
        id,
        name,
        tagline,
        description: fullDesc,
        category,
        rating: 0,
        reviews: 0,
        size,
        version,
        updated: "Just now",
        hue,
        editorial: false,
        trending: true,
        _submitted: true,
        _ownerEmail: u.email,
        _publisher: publisher,
        _iconDataUrl: pmIconDataUrl,
        _screenshots: pmScreenshots.filter(Boolean),
        _downloadUrl: link
      };
      if (devMode) {
        newApp._company = true;
        markCompanyApp(newApp.id);
      }
      APPS.unshift(newApp);
      saveOwnedApps();
    }

    renderAll();
    ["pmForm0", "pmForm1", "pmForm2"].forEach((id) => {
      document.getElementById(id).style.display = "none";
    });
    document.getElementById("pmActions").style.display = "none";
    document.getElementById("pmSuccessMsg").textContent =
      `"${name}" is in the catalogue under your account. You see Update; sign out to see Install like other users.`;
    document.getElementById("pmSuccess").classList.add("show");
    toast(`${name} submitted to the catalogue`);
    if (USE_CLOUD) setCloudStatus("Live · Firebase · " + APPS.length, "live");
  }

  /* Remove app with password / passkey confirmation */
  function openRemoveConfirm(appId) {
    const app = APPS.find((a) => a.id === appId);
    if (!app || !canManage(app)) {
      toast("Only the publisher can remove this app");
      return;
    }
    pendingRemoveId = appId;
    document.getElementById("removePass").value = "";
    document.getElementById("field-remove-pass").classList.remove("invalid");
    const u = currentUser();
    const isGoogle = u && u.provider === "google";

    if (devMode) {
      document.getElementById("removeSubtitle").textContent =
        `Developer mode: remove “${app.name}”. Enter the 4-digit passkey to confirm.`;
      document.querySelector("#field-remove-pass label").textContent = "4-digit passkey";
      document.getElementById("removePass").placeholder = "••••";
      document.getElementById("removePass").type = "password";
      document.getElementById("removePass").maxLength = 8;
    } else if (isGoogle) {
      document.getElementById("removeSubtitle").textContent =
        `Remove “${app.name}” from the catalogue. Type CONFIRM or your Google email to authorize.`;
      document.querySelector("#field-remove-pass label").textContent = "Type CONFIRM or your email";
      document.getElementById("removePass").placeholder = "CONFIRM";
      document.getElementById("removePass").removeAttribute("maxLength");
    } else {
      document.getElementById("removeSubtitle").textContent =
        `Remove “${app.name}” from the catalogue on this device. Confirm with your account password.`;
      document.querySelector("#field-remove-pass label").textContent = "Account password";
      document.getElementById("removePass").placeholder = "Enter your password";
      document.getElementById("removePass").removeAttribute("maxLength");
    }
    document.getElementById("removeScrim").classList.add("open");
    document.getElementById("removeModal").classList.add("open");
  }

  function closeRemoveModal() {
    document.getElementById("removeScrim").classList.remove("open");
    document.getElementById("removeModal").classList.remove("open");
    pendingRemoveId = null;
  }

  function confirmRemove() {
    if (!pendingRemoveId) return;
    const pass = document.getElementById("removePass").value;
    const field = document.getElementById("field-remove-pass");
    field.classList.remove("invalid");

    if (devMode) {
      if (String(pass).trim() !== DEV_PASSKEY) {
        field.classList.add("invalid");
        field.querySelector(".error").textContent = "Incorrect passkey.";
        return;
      }
    } else {
      const u = currentUser();
      if (!u) {
        toast("Sign in required");
        return;
      }
      if (u.provider === "google") {
        if (pass.toLowerCase() !== "confirm" && pass.toLowerCase() !== u.email) {
          field.classList.add("invalid");
          field.querySelector(".error").textContent =
            "Google account: type CONFIRM or your email to remove.";
          return;
        }
      } else {
        const users = loadUsers();
        const rec = users[u.email];
        if (!rec || rec.password !== pass) {
          field.classList.add("invalid");
          field.querySelector(".error").textContent = "Incorrect password.";
          return;
        }
      }
    }

    const idx = APPS.findIndex((a) => a.id === pendingRemoveId);
    if (idx >= 0) {
      const name = APPS[idx].name;
      APPS.splice(idx, 1);
      installed.delete(pendingRemoveId);
      saveOwnedApps();
      toast(`“${name}” removed from the store`);
      closeRemoveModal();
      closeDetail();
      renderAll();
    } else {
      closeRemoveModal();
    }
  }

  document.getElementById("openPublish").addEventListener("click", openPublish);
  const heroSubmit = document.getElementById("heroSubmit");
  if (heroSubmit) heroSubmit.addEventListener("click", openPublish);

  window.__AURISER_OPEN_DETAIL__ = openDetail;
  window.__AURISER_OPEN_PUBLISH_WITH_ICON__ = function (dataUrl) {
    openPublish();
    setTimeout(() => {
      if (!dataUrl) return;
      pmIconDataUrl = dataUrl;
      const img = document.getElementById("pmIconImg");
      const drop = document.getElementById("pmIconDrop");
      if (img) img.src = dataUrl;
      if (drop) drop.classList.add("has-file");
      showPmStep(2);
      toast("Icon attached — finish the listing and submit");
    }, 250);
  };

  document.getElementById("publishClose").addEventListener("click", closePublish);
  document.getElementById("pmCancel").addEventListener("click", closePublish);
  document.getElementById("pmDone").addEventListener("click", closePublish);
  publishScrim.addEventListener("click", closePublish);

  document.getElementById("pmNext").addEventListener("click", () => {
    if (pmStep < 2) {
      if (!validatePmStep(pmStep)) return;
      showPmStep(pmStep + 1);
    } else {
      submitApp();
    }
  });
  document.getElementById("pmBack").addEventListener("click", () => {
    if (pmStep > 0) showPmStep(pmStep - 1);
  });

  // Developer mode — drop terminal.termx on corner ring
  const cornerRing = document.getElementById("cornerRing");
  if (cornerRing) {
    ["dragenter", "dragover"].forEach((ev) => {
      cornerRing.addEventListener(ev, (e) => {
        e.preventDefault();
        e.stopPropagation();
        cornerRing.classList.add("drag-over");
      });
    });
    cornerRing.addEventListener("dragleave", () => cornerRing.classList.remove("drag-over"));
    cornerRing.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      cornerRing.classList.remove("drag-over");
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) {
        toast("That file isn't recognised");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => tryActivateDevKey(reader.result);
      reader.readAsText(file);
    });
    // Also allow click + file pick as fallback
    cornerRing.addEventListener("click", () => {
      if (devMode) {
        toast("Developer mode is on — use Leave developer mode to exit");
        return;
      }
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".termx,text/plain";
      input.onchange = () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => tryActivateDevKey(reader.result);
        reader.readAsText(file);
      };
      input.click();
    });
  }
  const leaveDevBtn = document.getElementById("leaveDevMode");
  if (leaveDevBtn) leaveDevBtn.addEventListener("click", leaveDevMode);

  const devChipToggle = document.getElementById("devChipToggle");
  if (devChipToggle) {
    devChipToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const panel = document.getElementById("devChipPanel");
      if (!panel) return;
      const open = panel.hidden;
      panel.hidden = !open;
      devChipToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  // Click outside closes the chip panel
  document.addEventListener("click", (e) => {
    const banner = document.getElementById("devBanner");
    const panel = document.getElementById("devChipPanel");
    if (!banner || !panel || panel.hidden) return;
    if (!banner.contains(e.target)) {
      panel.hidden = true;
      const t = document.getElementById("devChipToggle");
      if (t) t.setAttribute("aria-expanded", "false");
    }
  });

  // Screenshot lightbox
  const shotLbClose = document.getElementById("shotLightboxClose");
  const shotLb = document.getElementById("shotLightbox");
  if (shotLbClose) shotLbClose.addEventListener("click", closeShotLightbox);
  if (shotLb) {
    shotLb.addEventListener("click", (e) => {
      if (e.target === shotLb) closeShotLightbox();
    });
  }

  // Password visibility toggles
  document.querySelectorAll(".pass-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.pass;
      const input = document.getElementById(id);
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.classList.toggle("is-visible", show);
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      btn.title = show ? "Hide password" : "Show password";
    });
  });

  // Auth UI
  document.getElementById("profileChip").addEventListener("click", openAuthModal);
  document.getElementById("authClose").addEventListener("click", closeAuthModal);
  document.getElementById("authScrim").addEventListener("click", closeAuthModal);
  document.getElementById("authGoogle").addEventListener("click", signInGoogle);
  document.getElementById("authSignInBtn").addEventListener("click", signInEmail);
  document.getElementById("authSignUpBtn").addEventListener("click", signUp);
  document.getElementById("authSignOutBtn").addEventListener("click", signOut);
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".auth-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const mode = tab.dataset.authTab;
      document.getElementById("authSignInPane").style.display = mode === "signin" ? "" : "none";
      document.getElementById("authSignUpPane").style.display = mode === "signup" ? "" : "none";
    });
  });

  // Remove confirm
  document.getElementById("removeClose").addEventListener("click", closeRemoveModal);
  document.getElementById("removeCancel").addEventListener("click", closeRemoveModal);
  document.getElementById("removeScrim").addEventListener("click", closeRemoveModal);
  document.getElementById("removeConfirm").addEventListener("click", confirmRemove);

  // "I don't have a download link" tutorial — stacks above the publish modal,
  // Back just closes it so whatever the person already typed is untouched.
  function openLinkHelp() {
    document.getElementById("linkHelpScrim").classList.add("open");
    document.getElementById("linkHelpModal").classList.add("open");
  }
  function closeLinkHelp() {
    document.getElementById("linkHelpScrim").classList.remove("open");
    document.getElementById("linkHelpModal").classList.remove("open");
  }
  document.getElementById("noLinkHelp").addEventListener("click", openLinkHelp);
  document.getElementById("linkHelpClose").addEventListener("click", closeLinkHelp);
  document.getElementById("linkHelpScrim").addEventListener("click", closeLinkHelp);
  document.getElementById("linkHelpBack").addEventListener("click", closeLinkHelp);

  // Live preview updates
  ["pmName", "pmTagline", "pmVersion", "pmGenre", "pmSize", "pmLink", "pmDev"].forEach((id) => {
    document.getElementById(id).addEventListener("input", updatePmPreview);
  });

  // Icon drop
  const iconDrop = document.getElementById("pmIconDrop");
  const iconFile = document.getElementById("pmIconFile");
  iconFile.addEventListener("change", () => {
    const file = iconFile.files && iconFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      pmIconDataUrl = reader.result;
      document.getElementById("pmIconImg").src = pmIconDataUrl;
      iconDrop.classList.add("has-file");
    };
    reader.readAsDataURL(file);
  });
  iconDrop.addEventListener("dragover", (e) => {
    e.preventDefault();
    iconDrop.classList.add("dragover");
  });
  iconDrop.addEventListener("dragleave", () => iconDrop.classList.remove("dragover"));
  iconDrop.addEventListener("drop", (e) => {
    e.preventDefault();
    iconDrop.classList.remove("dragover");
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        pmIconDataUrl = reader.result;
        document.getElementById("pmIconImg").src = pmIconDataUrl;
        iconDrop.classList.add("has-file");
      };
      reader.readAsDataURL(file);
    }
  });

  // Screenshot slots (max 3)
  const shotFileInput = document.getElementById("pmShotFile");
  function assignShot(slotIndex, dataUrl) {
    if (slotIndex < 0 || slotIndex > 2) return;
    pmScreenshots[slotIndex] = dataUrl;
    renderShotSlots();
  }
  function clearShot(slotIndex) {
    pmScreenshots[slotIndex] = null;
    renderShotSlots();
  }
  document.querySelectorAll(".pm-shot-slot").forEach((slot) => {
    slot.addEventListener("click", (e) => {
      if (e.target.closest(".pm-shot-remove")) return;
      pmShotTarget = parseInt(slot.dataset.slot, 10);
      if (shotFileInput) shotFileInput.click();
    });
    const removeBtn = slot.querySelector(".pm-shot-remove");
    if (removeBtn) {
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        clearShot(parseInt(slot.dataset.slot, 10));
      });
    }
  });
  if (shotFileInput) {
    shotFileInput.addEventListener("change", () => {
      const file = shotFileInput.files && shotFileInput.files[0];
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        assignShot(pmShotTarget, reader.result);
        shotFileInput.value = "";
      };
      reader.readAsDataURL(file);
    });
  }
  renderShotSlots();

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const lb = document.getElementById("shotLightbox");
      if (lb && !lb.hidden) closeShotLightbox();
      else if (document.getElementById("removeModal").classList.contains("open")) closeRemoveModal();
      else if (document.getElementById("authModal").classList.contains("open")) closeAuthModal();
      else if (publishModal.classList.contains("open")) closePublish();
    }
  });

  /* ---------------------------------------------------------------------
     Init
     --------------------------------------------------------------------- */
  if (USE_CLOUD) {
    try {
      localStorage.removeItem("auriser_owned_apps");
      localStorage.removeItem("auriser_session");
      localStorage.removeItem("auriser_users");
      localStorage.removeItem("auriser_ratings_v1");
    } catch (e) { /* ignore */ }
  }

  loadOwnedApps();
  updateProfileChip();
  updateDevUI();
  renderCategoryChips();
  renderAll();
  startField();

  function setCloudStatus(text, kind) {
    const el = document.getElementById("cloudStatus");
    if (!el) return;
    el.textContent = text;
    el.className = "cloud-status" + (kind ? " " + kind : "");
  }

  if (USE_CLOUD) {
    setCloudStatus("Connecting…", "");
    (async function bootCloud() {
      toast("Connecting to Firebase…");
      try {
        // Finish Google redirect sign-in if we just came back from Google
        try {
          const redirected = await FB.completeGoogleRedirect();
          if (redirected) {
            const isGoogle = (redirected.providerData || []).some((p) => p.providerId === "google.com");
            setSession({
              email: redirected.email,
              name: redirected.displayName || (redirected.email || "").split("@")[0],
              provider: isGoogle ? "google" : "email",
              id: redirected.uid,
              photoURL: redirected.photoURL || null
            });
            updateProfileChip();
            toast("Signed in with Google · " + (redirected.displayName || redirected.email));
          }
        } catch (re) {
          toast(re.message || "Google redirect failed");
        }

        // Wait briefly for auth restore from IndexedDB
        await new Promise((resolve) => {
          let done = false;
          const unsub = FB.onAuth((user) => {
            if (done) return;
            done = true;
            if (typeof unsub === "function") unsub();
            if (user) {
              const isGoogle = (user.providerData || []).some((p) => p.providerId === "google.com");
              setSession({
                email: user.email,
                name: user.displayName || (user.email || "").split("@")[0],
                provider: isGoogle ? "google" : "email",
                id: user.uid,
                photoURL: user.photoURL || null
              });
              updateProfileChip();
            }
            resolve();
          });
          setTimeout(() => {
            if (!done) {
              done = true;
              resolve();
            }
          }, 2000);
        });
        await refreshCatalogueFromCloud();
        renderAll();
        setCloudStatus("Live · Firebase · " + APPS.length, "live");
        toast("Firebase connected · " + APPS.length + " apps in catalogue");
        console.log("Auriser · Firebase connected");
      } catch (err) {
        console.warn("Firebase boot failed", err);
        setCloudStatus("Firebase error", "err");
        toast("Firebase failed — " + (err.message || "check console"));
      }
    })();
  } else {
    setCloudStatus("Offline", "off");
    toast("Offline mode");
  }
})();
