/* ==========================================================================
   AURISER — Ribbon formation animation
   Line sweeps in from the left, curves, coils into the gold ribbon A.
   Lightweight strip physics + wind, then settles to the final mark.
   ========================================================================== */
(function () {
  const REDUCED =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** Catmull-Rom / cubic path samples for the ribbon centerline (viewBox 0–1000) */
  // Path designed to match the approved Ribbon A silhouette:
  // enter from left → small lower loop → rise → apex → right leg → settle
  const PATH = [
    // off-stage — sweep in from the left
    [-220, 560],
    [-120, 540],
    [-20, 520],
    [60, 500],
    [120, 490],
    // coil: lower-left ribbon loop (the open counter)
    [160, 520],
    [175, 580],
    [150, 640],
    [95, 665],
    [50, 640],
    [40, 590],
    [70, 545],
    [120, 520],
    [175, 500],
    // rising stroke — ribbon climbs and leans into the A spine
    [230, 455],
    [290, 390],
    [350, 310],
    [410, 230],
    [470, 160],
    // apex curve
    [520, 115],
    [575, 105],
    [630, 130],
    // long right leg — thick ribbon falling with a slight outward bow
    [680, 190],
    [720, 270],
    [750, 360],
    [765, 450],
    [760, 540],
    [740, 620],
    [705, 690],
    [660, 745],
    // finishing tuck under the foot
    [610, 780],
    [560, 795],
    [520, 785],
  ];

  function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return [
      0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
      0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
    ];
  }

  function samplePath(points, segmentsPerSpan) {
    const out = [];
    const n = points.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[Math.min(n - 1, i + 1)];
      const p3 = points[Math.min(n - 1, i + 2)];
      for (let s = 0; s < segmentsPerSpan; s++) {
        const t = s / segmentsPerSpan;
        out.push(catmullRom(p0, p1, p2, p3, t));
      }
    }
    out.push(points[n - 1].slice());
    return out;
  }

  function dist(a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    return Math.hypot(dx, dy);
  }

  function buildArcLength(samples) {
    const len = [0];
    let total = 0;
    for (let i = 1; i < samples.length; i++) {
      total += dist(samples[i - 1], samples[i]);
      len.push(total);
    }
    return { len, total };
  }

  function pointAtLength(samples, arc, target) {
    if (target <= 0) return { x: samples[0][0], y: samples[0][1], tx: 1, ty: 0 };
    if (target >= arc.total) {
      const a = samples[samples.length - 2];
      const b = samples[samples.length - 1];
      const d = dist(a, b) || 1;
      return { x: b[0], y: b[1], tx: (b[0] - a[0]) / d, ty: (b[1] - a[1]) / d };
    }
    let i = 1;
    while (i < arc.len.length && arc.len[i] < target) i++;
    const l0 = arc.len[i - 1];
    const l1 = arc.len[i];
    const t = (target - l0) / (l1 - l0 || 1);
    const a = samples[i - 1];
    const b = samples[i];
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    const d = dist(a, b) || 1;
    return { x, y, tx: (b[0] - a[0]) / d, ty: (b[1] - a[1]) / d };
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function smoothstep(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function runRibbonAnimation(root) {
    if (!root) return;
    const canvas = root.querySelector("#ribbonCanvas");
    const finalImg = root.querySelector("#heroMarkImg");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = root.getBoundingClientRect();
      const w = Math.max(280, Math.floor(rect.width));
      const h = Math.max(280, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    }

    let { w, h } = resize();

    if (REDUCED || document.documentElement.classList.contains("force-reduce-motion")) {
      canvas.style.opacity = "0";
      if (finalImg) {
        finalImg.style.opacity = "1";
        finalImg.classList.add("ribbon-settled");
      }
      return;
    }

    if (finalImg) {
      finalImg.style.opacity = "0";
      finalImg.classList.remove("ribbon-settled");
    }

    const samples = samplePath(PATH, 24);
    const arc = buildArcLength(samples);

    // Animation timeline (ms)
    const T_DRAW = 3200; // sweep + coil
    const T_SETTLE = 900; // wind dies, thickness stabilizes
    const T_CROSS = 700; // crossfade to final PNG
    const T_TOTAL = T_DRAW + T_SETTLE + T_CROSS;

    const start = performance.now();
    let raf = 0;

    function widthProfile(u) {
      // Ribbon width along the path (view units → will scale)
      // Tapered ends, fuller mid — like a physical ribbon band
      const base = 28;
      const mid = 38;
      const head = smoothstep(0, 0.08, u);
      const tail = 1 - smoothstep(0.92, 1, u);
      const belly = 0.75 + 0.25 * Math.sin(Math.PI * u);
      return base * head * tail * belly + (mid - base) * belly * head * tail;
    }

    function windOffset(u, time, intensity) {
      // Layered noise-like wind: stronger early, calms as it settles
      const t = time * 0.001;
      const w1 = Math.sin(u * 10.5 + t * 2.1) * 14;
      const w2 = Math.sin(u * 23.0 - t * 3.4) * 6;
      const w3 = Math.cos(u * 5.2 + t * 1.3) * 8;
      return (w1 + w2 + w3) * intensity;
    }

    function drawRibbon(progress, time) {
      ctx.clearRect(0, 0, w, h);

      // Map path coords (design 1000x900-ish) into canvas with padding
      const pad = 40;
      const scale = Math.min((w - pad * 2) / 900, (h - pad * 2) / 900);
      const ox = w / 2 - 420 * scale;
      const oy = h / 2 - 420 * scale;

      const drawU = easeOutCubic(Math.min(1, progress));
      const drawnLen = arc.total * drawU;
      if (drawnLen < 2) return;

      // Settle factor: wind intensity fades after draw
      const settleT = Math.max(0, (progress * T_TOTAL - T_DRAW) / T_SETTLE);
      const windAmp = 1 - easeInOutCubic(Math.min(1, Math.max(0, settleT)));

      // Build left/right edge polylines along drawn portion
      const step = 6; // path units
      const left = [];
      const right = [];
      const centers = [];

      for (let s = 0; s <= drawnLen; s += step) {
        const u = s / arc.total;
        const p = pointAtLength(samples, arc, s);
        const nx = -p.ty;
        const ny = p.tx;
        const wind = windOffset(u, time, windAmp);
        // wind mostly perpendicular with a little longitudinal flutter
        const wx = nx * wind + p.tx * wind * 0.15;
        const wy = ny * wind + p.ty * wind * 0.15;
        const half = widthProfile(u) * 0.5;
        // slight twist: width breathes with wind
        const breathe = 1 + windAmp * 0.06 * Math.sin(u * 18 + time * 0.004);
        const hw = half * breathe;

        const cx = p.x + wx;
        const cy = p.y + wy;
        centers.push([cx, cy]);
        left.push([cx + nx * hw, cy + ny * hw]);
        right.push([cx - nx * hw, cy - ny * hw]);
      }

      if (left.length < 2) return;

      function toScreen(pt) {
        return [ox + pt[0] * scale, oy + pt[1] * scale];
      }

      // Shadow pass
      ctx.save();
      ctx.beginPath();
      let sp = toScreen(left[0]);
      ctx.moveTo(sp[0], sp[1] + 6 * scale);
      for (let i = 1; i < left.length; i++) {
        sp = toScreen(left[i]);
        ctx.lineTo(sp[0], sp[1] + 6 * scale);
      }
      for (let i = right.length - 1; i >= 0; i--) {
        sp = toScreen(right[i]);
        ctx.lineTo(sp[0], sp[1] + 6 * scale);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.filter = "blur(" + 8 * scale + "px)";
      ctx.fill();
      ctx.filter = "none";
      ctx.restore();

      // Main ribbon body with gradient mesh approximation: segments colored by angle
      ctx.beginPath();
      sp = toScreen(left[0]);
      ctx.moveTo(sp[0], sp[1]);
      for (let i = 1; i < left.length; i++) {
        sp = toScreen(left[i]);
        ctx.lineTo(sp[0], sp[1]);
      }
      for (let i = right.length - 1; i >= 0; i--) {
        sp = toScreen(right[i]);
        ctx.lineTo(sp[0], sp[1]);
      }
      ctx.closePath();

      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#f7e6b8");
      g.addColorStop(0.3, "#e8c85c");
      g.addColorStop(0.55, "#d4af37");
      g.addColorStop(0.8, "#a67c1a");
      g.addColorStop(1, "#6b4f10");
      ctx.fillStyle = g;
      ctx.fill();

      // Edge highlight (top-left light)
      ctx.beginPath();
      for (let i = 0; i < left.length; i++) {
        const p = toScreen(left[i]);
        if (i === 0) ctx.moveTo(p[0], p[1]);
        else ctx.lineTo(p[0], p[1]);
      }
      ctx.strokeStyle = "rgba(255, 246, 214, 0.55)";
      ctx.lineWidth = Math.max(1.2, 2.2 * scale);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();

      // Inner crease / overlap darkening along center
      ctx.beginPath();
      for (let i = 0; i < centers.length; i++) {
        const p = toScreen(centers[i]);
        if (i === 0) ctx.moveTo(p[0], p[1]);
        else ctx.lineTo(p[0], p[1]);
      }
      ctx.strokeStyle = "rgba(90, 60, 10, 0.22)";
      ctx.lineWidth = Math.max(1, 3 * scale);
      ctx.stroke();

      // Specular glints traveling along the ribbon while drawing
      const glintU = (progress * 1.4) % 1;
      for (let k = 0; k < 3; k++) {
        const gu = (glintU + k * 0.22) % 1;
        if (gu > drawU) continue;
        const gp = pointAtLength(samples, arc, arc.total * gu);
        const sx = ox + gp.x * scale;
        const sy = oy + gp.y * scale;
        const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 18 * scale);
        rg.addColorStop(0, "rgba(255,250,230,0.55)");
        rg.addColorStop(0.4, "rgba(232,200,90,0.15)");
        rg.addColorStop(1, "rgba(212,175,55,0)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(sx, sy, 18 * scale, 0, Math.PI * 2);
        ctx.fill();
      }

      // Leading tip (head of the sweeping line)
      if (drawU < 0.98) {
        const tip = pointAtLength(samples, arc, drawnLen);
        const tx = ox + tip.x * scale;
        const ty = oy + tip.y * scale;
        const tipG = ctx.createRadialGradient(tx, ty, 0, tx, ty, 14 * scale);
        tipG.addColorStop(0, "rgba(255, 244, 200, 0.9)");
        tipG.addColorStop(0.35, "rgba(212, 175, 55, 0.45)");
        tipG.addColorStop(1, "rgba(212, 175, 55, 0)");
        ctx.fillStyle = tipG;
        ctx.beginPath();
        ctx.arc(tx, ty, 14 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function frame(now) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / T_TOTAL);

      drawRibbon(Math.min(1, elapsed / (T_DRAW + T_SETTLE * 0.5)), now);

      // Crossfade to final image
      if (elapsed > T_DRAW + T_SETTLE) {
        const c = (elapsed - T_DRAW - T_SETTLE) / T_CROSS;
        const a = easeInOutCubic(Math.min(1, c));
        canvas.style.opacity = String(1 - a);
        if (finalImg) {
          finalImg.style.opacity = String(a);
          if (a > 0.95) finalImg.classList.add("ribbon-settled");
        }
      }

      if (progress < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        canvas.style.opacity = "0";
        if (finalImg) {
          finalImg.style.opacity = "1";
          finalImg.classList.add("ribbon-settled");
        }
      }
    }

    canvas.style.opacity = "1";
    raf = requestAnimationFrame(frame);

    window.addEventListener(
      "resize",
      () => {
        ({ w, h } = resize());
      },
      { passive: true }
    );

    return function cancel() {
      cancelAnimationFrame(raf);
    };
  }

  function boot() {
    const root = document.querySelector(".hero-mark");
    if (!root) return;
    const onboard = document.getElementById("onboard");
    // If welcome overlay is up, wait for AURISER_REPLAY_RIBBON from onboarding finish
    if (onboard && !onboard.hasAttribute("hidden")) {
      return;
    }
    runRibbonAnimation(root);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // Replay when welcome tour finishes (hero becomes visible)
  window.AURISER_REPLAY_RIBBON = function () {
    const root = document.querySelector(".hero-mark");
    if (!root) return;
    const canvas = root.querySelector("#ribbonCanvas");
    const img = root.querySelector("#heroMarkImg");
    if (canvas) canvas.style.opacity = "1";
    if (img) {
      img.style.opacity = "0";
      img.classList.remove("ribbon-settled");
    }
    runRibbonAnimation(root);
  };
})();
