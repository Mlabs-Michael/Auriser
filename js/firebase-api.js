/* ==========================================================================
   AURISER — Firebase API bridge (Auth + Firestore)
   ========================================================================== */
(function () {
  const cfg = window.AURISER_FIREBASE || { enabled: false };
  let app = null;
  let auth = null;
  let db = null;

  function ready() {
    return !!(
      cfg.enabled &&
      cfg.config &&
      window.firebase &&
      window.firebase.initializeApp
    );
  }

  function init() {
    if (!ready()) return false;
    if (app) return true;
    try {
      app = window.firebase.initializeApp(cfg.config);
      auth = window.firebase.auth();
      db = window.firebase.firestore();
      return true;
    } catch (e) {
      console.error("Firebase init failed", e);
      return false;
    }
  }

  function mapDoc(doc) {
    const d = doc.data() || {};
    const iconData = d.iconUrl || null;
    const shots = Array.isArray(d.screenshots) ? d.screenshots.filter(Boolean) : [];
    return {
      id: doc.id,
      name: d.name || "",
      tagline: d.tagline || "",
      description: d.description || "",
      version: d.version || "1.0.0",
      category: d.category || "Tools",
      size: d.size || "",
      hue: d.hue != null ? d.hue : 42,
      rating: d.rating != null ? d.rating : 4.5,
      reviews: d.reviews != null ? d.reviews : 0,
      icon: iconData,
      _iconDataUrl: iconData,
      _screenshots: shots,
      _downloadUrl: d.downloadUrl || "",
      _publisher: d.publisher || "",
      _ownerId: d.ownerId || null,
      _ownerEmail: d.ownerEmail || null,
      screenshots: shots,
      editorial: !!d.editorial,
      trending: !!d.trending,
      updated: d.updatedAt
        ? new Date(d.updatedAt.toDate ? d.updatedAt.toDate() : d.updatedAt).toLocaleDateString()
        : ""
    };
  }

  /* ---------- Auth ---------- */
  async function signUp(email, password, name) {
    if (!init()) throw new Error("Firebase not ready");
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    if (name) {
      await cred.user.updateProfile({ displayName: name });
    }
    // Send a confirmation email (Firebase-native verification link) to the
    // address the user signed up with. Non-fatal if it fails.
    try {
      await cred.user.sendEmailVerification({
        url: location.origin,
        handleCodeInApp: false
      });
    } catch (e) {
      console.warn("sendEmailVerification failed", e);
    }
    return cred.user;
  }

  /** Re-send the confirmation email to the currently signed-in user. */
  async function resendVerification() {
    if (!init()) throw new Error("Firebase not ready");
    const user = auth.currentUser;
    if (!user) throw new Error("Sign in required");
    await user.sendEmailVerification({ url: location.origin, handleCodeInApp: false });
    return true;
  }

  async function signIn(email, password) {
    if (!init()) throw new Error("Firebase not ready");
    const cred = await auth.signInWithEmailAndPassword(email, password);
    return cred.user;
  }

  async function signOut() {
    if (!init()) return;
    await auth.signOut();
  }

  function getUser() {
    if (!init()) return null;
    return auth.currentUser;
  }

  function onAuth(cb) {
    if (!init()) return function () {};
    return auth.onAuthStateChanged(cb);
  }

  /* ---------- Apps ---------- */
  async function fetchApps() {
    if (!init()) return [];
    try {
      const snap = await db.collection("apps").orderBy("updatedAt", "desc").get();
      return snap.docs.map(mapDoc);
    } catch (e) {
      // Fallback if index missing or collection empty edge cases
      const snap = await db.collection("apps").get();
      return snap.docs.map(mapDoc);
    }
  }

  async function publishApp(payload) {
    if (!init()) throw new Error("Firebase not ready");
    const user = auth.currentUser;
    if (!user) throw new Error("Sign in required");

    const row = {
      name: payload.name,
      tagline: payload.tagline || "",
      description: payload.description || "",
      version: payload.version || "1.0.0",
      category: payload.category || "Tools",
      size: payload.size || "",
      hue: payload.hue != null ? payload.hue : 42,
      downloadUrl: payload.downloadUrl || payload._downloadUrl || "",
      iconUrl: payload.icon || null,
      publisher:
        payload.publisher ||
        payload._publisher ||
        user.displayName ||
        user.email,
      ownerId: user.uid,
      ownerEmail: user.email,
      rating: 0,
      reviews: 0,
      trending: true,
      editorial: false,
      screenshots: payload.screenshots || [],
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
    };

    const ref = await db.collection("apps").add(row);
    const doc = await ref.get();
    return mapDoc(doc);
  }

  async function updateApp(id, payload) {
    if (!init()) throw new Error("Firebase not ready");
    const user = auth.currentUser;
    if (!user) throw new Error("Sign in required");

    const ref = db.collection("apps").doc(id);
    const existing = await ref.get();
    if (!existing.exists) throw new Error("App not found");
    if (existing.data().ownerId !== user.uid) throw new Error("Not your app");

    await ref.update({
      name: payload.name,
      tagline: payload.tagline || "",
      description: payload.description || "",
      version: payload.version || "1.0.0",
      category: payload.category || "Tools",
      size: payload.size || "",
      hue: payload.hue != null ? payload.hue : 42,
      downloadUrl: payload.downloadUrl || payload._downloadUrl || "",
      iconUrl: payload.icon || null,
      screenshots: payload.screenshots || [],
      publisher: payload.publisher || payload._publisher || "",
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });

    const doc = await ref.get();
    return mapDoc(doc);
  }

  async function deleteApp(id) {
    if (!init()) throw new Error("Firebase not ready");
    const user = auth.currentUser;
    if (!user) throw new Error("Sign in required");

    const ref = db.collection("apps").doc(id);
    const existing = await ref.get();
    if (!existing.exists) throw new Error("App not found");
    if (existing.data().ownerId !== user.uid) throw new Error("Not your app");

    await ref.delete();
  }

  /* ---------- Reviews / ratings / votes ---------- */
  function mapReviewDoc(doc) {
    const d = doc.data() || {};
    const created = d.createdAt
      ? d.createdAt.toDate
        ? d.createdAt.toDate()
        : new Date(d.createdAt)
      : null;
    return {
      id: doc.id,
      appId: d.appId,
      userId: d.userId || null,
      userName: d.userName || "",
      stars: d.stars || 0,
      emoji: d.emoji || "",
      body: d.body || "",
      vote: d.vote || 0,
      kind: d.kind || "comment",
      when: created ? created.toLocaleString() : "Just now"
    };
  }

  async function fetchReviews(appId) {
    if (!init()) return [];
    try {
      const snap = await db
        .collection("reviews")
        .where("appId", "==", String(appId))
        .get();
      return snap.docs.map(mapReviewDoc);
    } catch (e) {
      console.warn("fetchReviews", e);
      return [];
    }
  }

  /** One star rating per user per app (Play Store style). */
  async function setStars(appId, stars) {
    if (!init()) throw new Error("Firebase not ready");
    const user = auth.currentUser;
    if (!user) throw new Error("Sign in required");
    const id = "star_" + String(appId) + "_" + user.uid;
    await db.collection("reviews").doc(id).set(
      {
        appId: String(appId),
        userId: user.uid,
        userName: user.displayName || (user.email || "").split("@")[0],
        stars: stars,
        emoji: "",
        body: "",
        vote: 0,
        kind: "star",
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  }

  /**
   * One thumb vote per user per app.
   * vote = 1 (up), -1 (down). Clicking the same again clears (0).
   * Switching up→down or down→up replaces the previous vote.
   */
  async function setVote(appId, vote) {
    if (!init()) throw new Error("Firebase not ready");
    const user = auth.currentUser;
    if (!user) throw new Error("Sign in required");
    const id = "vote_" + String(appId) + "_" + user.uid;
    const ref = db.collection("reviews").doc(id);
    const existing = await ref.get();
    const prev = existing.exists ? existing.data().vote || 0 : 0;
    const next = prev === vote ? 0 : vote; // toggle off if same
    if (next === 0) {
      await ref.delete();
    } else {
      await ref.set({
        appId: String(appId),
        userId: user.uid,
        userName: user.displayName || (user.email || "").split("@")[0],
        stars: 0,
        emoji: "",
        body: "",
        vote: next,
        kind: "vote",
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    return next;
  }

  /** Comment / emoji feedback (can post multiple). */
  async function addReview(appId, { stars, emoji, body }) {
    if (!init()) throw new Error("Firebase not ready");
    const user = auth.currentUser;
    if (!user) throw new Error("Sign in required");
    const row = {
      appId: String(appId),
      userId: user.uid,
      userName: user.displayName || (user.email || "").split("@")[0],
      stars: stars || 0,
      emoji: emoji || "",
      body: body || "",
      vote: 0,
      kind: "comment",
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
    };
    const ref = await db.collection("reviews").add(row);
    return { id: ref.id, ...row, when: "Just now" };
  }

  async function signInGoogle() {
    if (!init()) throw new Error("Firebase not ready");
    // Google OAuth does not work on file:// — must use http://localhost or https
    if (location.protocol === "file:") {
      throw new Error(
        "Google sign-in needs a local server (not file://). Open via Live Server or http://127.0.0.1:3000"
      );
    }
    const provider = new window.firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    // On phones/tablets popups are routinely blocked and break the OAuth
    // flow, so go straight to a full-page redirect there.
    const isTouch =
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      (window.matchMedia && window.matchMedia("(max-width: 860px)").matches);
    if (isTouch) {
      await auth.signInWithRedirect(provider);
      return null; // page will navigate away
    }

    try {
      const result = await auth.signInWithPopup(provider);
      return result.user;
    } catch (err) {
      // Popup blocked / closed / COOP issues → fall back to full-page redirect
      const code = err && err.code;
      if (
        code === "auth/popup-blocked" ||
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        await auth.signInWithRedirect(provider);
        return null; // page will navigate away
      }
      throw err;
    }
  }

  /** Call once on boot to finish Google redirect sign-in */
  async function completeGoogleRedirect() {
    if (!init()) return null;
    try {
      const result = await auth.getRedirectResult();
      return result && result.user ? result.user : null;
    } catch (e) {
      console.warn("getRedirectResult", e);
      throw e;
    }
  }

  window.AURISER_FB = {
    ready,
    init,
    signUp,
    signIn,
    signInGoogle,
    completeGoogleRedirect,
    signOut,
    getUser,
    onAuth,
    fetchApps,
    publishApp,
    updateApp,
    deleteApp,
    fetchReviews,
    addReview,
    setStars,
    setVote
  };
})();


