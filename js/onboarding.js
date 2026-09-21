/* ==========================================================================
   AURISER — onboarding.js
   Quiet first-run welcome. One screen, no chat bot, no long script.
   ========================================================================== */

function obSeenBefore() {
  try {
    return localStorage.getItem("auriser_onboarded") === "1";
  } catch (e) {
    return false;
  }
}
function obMarkSeen() {
  try {
    localStorage.setItem("auriser_onboarded", "1");
  } catch (e) {
    /* ignore */
  }
}

function runOnboarding(force) {
  const overlay = document.getElementById("onboard");
  if (!overlay) return;

  const log = document.getElementById("obLog");
  const cta = document.getElementById("obCta");
  const enterBtn = document.getElementById("obEnter");
  const skipBtn = document.getElementById("obSkip");

  if (obSeenBefore() && !force) {
    overlay.setAttribute("hidden", "");
    return;
  }

  overlay.removeAttribute("hidden");
  overlay.classList.remove("leaving");

  // Clean static welcome — not a typing chatbot
  if (log) {
    log.innerHTML = `
      <div class="ob-welcome">
        <p class="ob-kicker">Auriser</p>
        <h2 class="ob-title">A small catalogue of software worth keeping.</h2>
        <p class="ob-body">Hand-reviewed listings. Publish your own. Download from the publisher’s link — no noise, no clutter.</p>
      </div>`;
  }
  if (cta) cta.classList.add("show");
  if (enterBtn) enterBtn.textContent = "Enter the store";
  if (skipBtn) skipBtn.textContent = "Skip";

  function finish() {
    obMarkSeen();
    overlay.classList.add("leaving");
    setTimeout(() => {
      overlay.setAttribute("hidden", "");
      if (typeof window.AURISER_REPLAY_RIBBON === "function") {
        window.AURISER_REPLAY_RIBBON();
      }
    }, 500);
  }

  if (enterBtn) enterBtn.onclick = finish;
  if (skipBtn) skipBtn.onclick = finish;

  // Esc closes
  function onKey(e) {
    if (e.key === "Escape" || e.key === "Enter") {
      finish();
      window.removeEventListener("keydown", onKey);
    }
  }
  window.addEventListener("keydown", onKey);
}

document.addEventListener("DOMContentLoaded", () => {
  runOnboarding(false);
  const replay = document.getElementById("replayTour");
  if (replay) {
    replay.addEventListener("click", () => runOnboarding(true));
  }
});
