/* ==========================================================================
   AURISER — design-studio.js  (Create tab)
   Procedural icon batches, custom canvas designer, export / use-for-app,
   and MLabs toolkit app listing. Fully offline.
   ========================================================================== */

(function () {
  const { mulberry32, APPS, buildIconSVG } = window.AURISER_DATA || {};
  if (!mulberry32) return;

  const genGrid = document.getElementById("genGrid");
  const genMoreBtn = document.getElementById("genMore");
  const genClearBtn = document.getElementById("genClear");
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const iconCanvas = document.getElementById("iconCanvas");
  const iconStageEmpty = document.getElementById("iconStageEmpty");
  const exportIconBtn = document.getElementById("exportIcon");
  const useIconBtn = document.getElementById("useIconForApp");

  const customCanvas = document.getElementById("customCanvas");
  let genSeedBase = Date.now() % 100000;
  let activeIconDataUrl = null;

  /* ---------- Create tabs ---------- */
  document.querySelectorAll(".create-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".create-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".create-pane").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      const pane = document.getElementById("create-" + tab.dataset.create);
      if (pane) pane.classList.add("active");
      if (tab.dataset.create === "company") renderCompanyApps();
      if (tab.dataset.create === "custom") paintCustom();
    });
  });

  /* ---------- Procedural icon styles ---------- */
  function drawGenerative(canvas, seed) {
    const ctx = canvas.getContext("2d");
    const W = (canvas.width = 160);
    const H = (canvas.height = 160);
    const rand = mulberry32(seed);
    const style = Math.floor(rand() * 8);
    const hue = 28 + rand() * 28;
    const bg = `hsl(${hue * 0.1 + 20} 8% ${6 + rand() * 6}%)`;
    const gold = `hsl(${38 + rand() * 18} ${55 + rand() * 30}% ${45 + rand() * 25}%)`;
    const gold2 = `hsl(${30 + rand() * 20} 70% ${60 + rand() * 15}%)`;

    ctx.fillStyle = bg;
    const rad = 28 + rand() * 20;
    roundRect(ctx, 0, 0, W, H, rad);
    ctx.fill();

    // subtle grain
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = `rgba(212,175,55,${0.02 + rand() * 0.06})`;
      ctx.fillRect(rand() * W, rand() * H, 1.2, 1.2);
    }

    ctx.save();
    ctx.translate(W / 2, H / 2);

    if (style === 0) {
      // Auriser-like A mark
      ctx.beginPath();
      ctx.moveTo(0, -48);
      ctx.lineTo(36, 40);
      ctx.lineTo(18, 40);
      ctx.lineTo(0, -8);
      ctx.lineTo(-18, 40);
      ctx.lineTo(-36, 40);
      ctx.closePath();
      const g = ctx.createLinearGradient(-40, -50, 40, 50);
      g.addColorStop(0, gold2);
      g.addColorStop(1, gold);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.fillStyle = "rgba(10,9,8,0.55)";
      ctx.fillRect(-22, 8, 44, 8);
    } else if (style === 1) {
      // concentric rings
      for (let i = 5; i >= 1; i--) {
        ctx.beginPath();
        ctx.arc(0, 0, i * 10, 0, Math.PI * 2);
        ctx.strokeStyle = gold;
        ctx.globalAlpha = 0.25 + i * 0.1;
        ctx.lineWidth = 2 + rand() * 2;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = gold2;
      ctx.fill();
    } else if (style === 2) {
      // lattice
      ctx.strokeStyle = gold;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.7;
      for (let i = -4; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 12, -50);
        ctx.lineTo(i * 12, 50);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-50, i * 12);
        ctx.lineTo(50, i * 12);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = gold2;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 3) {
      // monogram letter
      const letters = "AMXLKRPCSTVN";
      const ch = letters[Math.floor(rand() * letters.length)];
      ctx.fillStyle = gold2;
      ctx.font = "700 72px Space Grotesk, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ch, 0, 4);
      ctx.strokeStyle = gold;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 2;
      ctx.strokeRect(-40, -40, 80, 80);
      ctx.globalAlpha = 1;
    } else if (style === 4) {
      // shards
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + rand();
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(12, -48);
        ctx.lineTo(-8, -36);
        ctx.closePath();
        ctx.fillStyle = i % 2 ? gold : gold2;
        ctx.globalAlpha = 0.55 + rand() * 0.4;
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    } else if (style === 5) {
      // soft orb + bar
      const rg = ctx.createRadialGradient(-10, -10, 4, 0, 0, 50);
      rg.addColorStop(0, gold2);
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(0, 0, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = gold;
      ctx.fillRect(-28, -6, 56, 12);
    } else if (style === 6) {
      // hex stack
      for (let i = 0; i < 3; i++) {
        hexPath(ctx, 0, i * 4 - 8, 28 - i * 6);
        ctx.strokeStyle = gold;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5 + i * 0.2;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = gold2;
      hexPath(ctx, 0, 0, 10);
      ctx.fill();
    } else {
      // noise field + diagonal
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = gold;
        ctx.globalAlpha = 0.08 + rand() * 0.2;
        ctx.beginPath();
        ctx.arc((rand() - 0.5) * 100, (rand() - 0.5) * 100, 1 + rand() * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = gold2;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-40, 30);
      ctx.lineTo(40, -30);
      ctx.stroke();
    }

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function hexPath(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function fillGenBatch(count) {
    if (!genGrid) return;
    for (let i = 0; i < count; i++) {
      const seed = genSeedBase + i * 9973 + Math.floor(Math.random() * 999);
      const c = document.createElement("canvas");
      c.width = 160;
      c.height = 160;
      c.className = "gen-tile";
      drawGenerative(c, seed);
      c.title = "Click to load on stage";
      c.addEventListener("click", () => {
        const url = c.toDataURL("image/png");
        setStageFromDataUrl(url);
      });
      genGrid.appendChild(c);
    }
    genSeedBase += count * 17;
  }

  if (genMoreBtn) genMoreBtn.addEventListener("click", () => fillGenBatch(24));
  if (genClearBtn)
    genClearBtn.addEventListener("click", () => {
      if (genGrid) genGrid.innerHTML = "";
      fillGenBatch(24);
    });

  /* ---------- Stage + export ---------- */
  function setStageFromDataUrl(url) {
    activeIconDataUrl = url;
    if (iconStageEmpty) iconStageEmpty.style.display = "none";
    if (iconCanvas) {
      const ctx = iconCanvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, 512, 512);
        ctx.drawImage(img, 0, 0, 512, 512);
        syncPreviewMirrors("iconCanvas");
      };
      img.src = url;
    }
    if (exportIconBtn) exportIconBtn.disabled = false;
    if (useIconBtn) useIconBtn.disabled = false;
  }

  function syncPreviewMirrors(sourceId) {
    const src = document.getElementById(sourceId);
    if (!src) return;
    document.querySelectorAll('.preview-mirror[data-mirror="' + sourceId + '"]').forEach((c) => {
      const ctx = c.getContext("2d");
      ctx.clearRect(0, 0, c.width, c.height);
      try { ctx.drawImage(src, 0, 0, c.width, c.height); } catch (e) {}
    });
  }

  document.querySelectorAll(".preview-mode-bar").forEach((bar) => {
    bar.querySelectorAll(".preview-mode").forEach((btn) => {
      btn.addEventListener("click", () => {
        bar.querySelectorAll(".preview-mode").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const target = bar.dataset.target;
        const host = document.getElementById(target === "custom" ? "customDevice" : "genDevice");
        if (!host) return;
        host.dataset.mode = btn.dataset.mode;
        host.querySelectorAll(".device-frame").forEach((f) => {
          const isMatch =
            (btn.dataset.mode === "normal" && f.classList.contains("device-normal")) ||
            (btn.dataset.mode === "phone" && f.classList.contains("device-phone")) ||
            (btn.dataset.mode === "laptop" && f.classList.contains("device-laptop"));
          f.setAttribute("aria-hidden", isMatch ? "false" : "true");
          f.style.display = isMatch ? "" : "none";
        });
        if (target === "custom") {
          paintCustom();
          syncPreviewMirrors("customCanvas");
        } else {
          syncPreviewMirrors("iconCanvas");
        }
      });
    });
  });


  /* 3D hover tilt on device previews */
  function bindPreviewTilt(host) {
    if (!host) return;
    host.addEventListener("mousemove", (e) => {
      const frames = Array.from(host.querySelectorAll(".device-frame"));
      const frame = frames.find((f) => f.style.display !== "none") || frames[0];
      if (!frame) return;
      const rect = host.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const max = 14;
      frame.style.transform = "rotateY(" + (x * max) + "deg) rotateX(" + (-y * max) + "deg) translateZ(12px)";
      host.classList.add("tilting");
    });
    host.addEventListener("mouseleave", () => {
      host.classList.remove("tilting");
      host.querySelectorAll(".device-frame").forEach((f) => {
        f.style.transform = "";
      });
    });
  }
  bindPreviewTilt(document.getElementById("genDevice"));
  bindPreviewTilt(document.getElementById("customDevice"));

  function downloadDataUrl(url, name) {
    const a = document.createElement("a");
    a.href = url;
    a.download = name || "auriser-icon.png";
    a.click();
  }

  if (exportIconBtn) {
    exportIconBtn.addEventListener("click", () => {
      if (!activeIconDataUrl) return;
      downloadDataUrl(activeIconDataUrl, "auriser-icon.png");
    });
  }
  if (useIconBtn) {
    useIconBtn.addEventListener("click", () => {
      if (!activeIconDataUrl) return;
      window.__AURISER_PENDING_ICON__ = activeIconDataUrl;
      if (typeof window.__AURISER_OPEN_PUBLISH_WITH_ICON__ === "function") {
        window.__AURISER_OPEN_PUBLISH_WITH_ICON__(activeIconDataUrl);
      } else {
        alert("Open Submit app — icon will be attached if the publish form is available.");
      }
    });
  }

  /* ---------- Import ---------- */
  if (dropzone && fileInput) {
    dropzone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (file) readFile(file);
    });
    ["dragenter", "dragover"].forEach((evt) =>
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.add("drag");
      })
    );
    ["dragleave", "drop"].forEach((evt) =>
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.remove("drag");
      })
    );
    dropzone.addEventListener("drop", (e) => {
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) readFile(file);
    });
  }
  function readFile(file) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => setStageFromDataUrl(ev.target.result);
    reader.readAsDataURL(file);
  }

  /* ---------- Custom designer (advanced) ---------- */
  function val(id, fallback) {
    const el = document.getElementById(id);
    return el ? el.value : fallback;
  }
  function num(id, fallback) {
    return Number(val(id, fallback));
  }

  function makeGrad(ctx, W, H, c1, c2, dir) {
    let g;
    if (dir === "vert") g = ctx.createLinearGradient(0, 0, 0, H);
    else if (dir === "horiz") g = ctx.createLinearGradient(0, 0, W, 0);
    else if (dir === "rad") g = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.6);
    else g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    return g;
  }

  function paintCustom() {
    if (!customCanvas) return;
    const ctx = customCanvas.getContext("2d");
    const W = customCanvas.width;
    const H = customCanvas.height;
    const bg = val("icBg", "#121110");
    const accent = val("icAccent", "#d4af37");
    const accent2 = val("icAccent2", "#f7e6b8");
    const shape = val("icShape", "rounded");
    const letter = String(val("icLetter", "A")).slice(0, 4);
    const noise = num("icNoise", 30);
    const glow = num("icGlow", 40);
    const rad = num("icRad", 22);
    const scalePct = num("icScale", 100) / 100;
    const rot = (num("icRot", 0) * Math.PI) / 180;
    const strokeW = num("icStroke", 5);
    const fillOp = num("icFillOp", 20) / 100;
    const letterSize = num("icLetterSize", 22) / 100;
    const letterY = num("icLetterY", 0);
    const letterWeight = val("icLetterWeight", "700");
    const vig = num("icVig", 25);
    const shadow = num("icShadow", 20);
    const pattern = val("icPattern", "none");
    const gradDir = val("icGradDir", "diag");

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = bg;
    roundRect(ctx, 0, 0, W, H, rad * (W / 100));
    ctx.fill();

    if (glow > 0) {
      const g = ctx.createRadialGradient(W * 0.35, H * 0.3, 10, W / 2, H / 2, W * 0.55);
      g.addColorStop(0, hexAlpha(accent, glow / 120));
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // overlay pattern
    if (pattern !== "none") {
      ctx.save();
      ctx.strokeStyle = hexAlpha(accent, 0.12);
      ctx.fillStyle = hexAlpha(accent, 0.1);
      ctx.lineWidth = 1;
      if (pattern === "grid") {
        for (let i = 0; i < W; i += 24) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, H);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(W, i);
          ctx.stroke();
        }
      } else if (pattern === "dots") {
        for (let y = 12; y < H; y += 18) {
          for (let x = 12; x < W; x += 18) {
            ctx.beginPath();
            ctx.arc(x, y, 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (pattern === "diag") {
        for (let i = -H; i < W + H; i += 18) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i + H, H);
          ctx.stroke();
        }
      } else if (pattern === "rings") {
        ctx.translate(W / 2, H / 2);
        for (let r = 30; r < W * 0.6; r += 22) {
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(rot);
    const s = W * 0.28 * scalePct;
    const strokeCol = makeGrad(ctx, s * 2, s * 2, accent, accent2, gradDir);
    ctx.fillStyle = accent;
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = Math.max(0.5, strokeW * (W / 512) * 2.2);
    const fo = fillOp;

    function fillStrokePath() {
      if (fo > 0) {
        ctx.globalAlpha = fo;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (strokeW > 0) ctx.stroke();
    }

    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      fillStrokePath();
    } else if (shape === "hex") {
      hexPath(ctx, 0, 0, s);
      fillStrokePath();
    } else if (shape === "diamond") {
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s, 0);
      ctx.closePath();
      fillStrokePath();
    } else if (shape === "shield") {
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(s, -s * 0.6, s * 0.85, 0);
      ctx.quadraticCurveTo(s * 0.5, s, 0, s * 1.1);
      ctx.quadraticCurveTo(-s * 0.5, s, -s * 0.85, 0);
      ctx.quadraticCurveTo(-s, -s * 0.6, 0, -s);
      ctx.closePath();
      fillStrokePath();
    } else if (shape === "ring") {
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      if (strokeW > 0) ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
      ctx.globalAlpha = Math.max(0.4, fo);
      ctx.fillStyle = accent2;
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (shape === "triangle") {
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.95, s * 0.75);
      ctx.lineTo(-s * 0.95, s * 0.75);
      ctx.closePath();
      fillStrokePath();
    } else if (shape === "octagon") {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 4) * i - Math.PI / 8;
        const x = Math.cos(a) * s;
        const y = Math.sin(a) * s;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      fillStrokePath();
    } else if (shape === "blob") {
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * 1.1, -s * 0.4, s * 0.9, s * 0.6, 0, s);
      ctx.bezierCurveTo(-s * 0.9, s * 0.6, -s * 1.1, -s * 0.4, 0, -s);
      ctx.closePath();
      fillStrokePath();
    } else {
      const rr = s * 0.35;
      roundRect(ctx, -s, -s, s * 2, s * 2, rr);
      fillStrokePath();
    }

    ctx.fillStyle = makeGrad(ctx, s, s, accent2, accent, gradDir);
    ctx.font = `${letterWeight} ${Math.floor(W * letterSize)}px Space Grotesk, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.95;
    ctx.fillText(letter.toUpperCase(), 0, letterY * (W / 100));
    ctx.restore();

    if (shadow > 0) {
      const sg = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.55);
      sg.addColorStop(0, "transparent");
      sg.addColorStop(1, `rgba(0,0,0,${shadow / 100})`);
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, W, H);
    }

    if (vig > 0) {
      const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.72);
      vg.addColorStop(0, "transparent");
      vg.addColorStop(1, `rgba(0,0,0,${vig / 100})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }

    if (noise > 0) {
      const n = Math.floor((noise / 80) * 900);
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.05})`;
        ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5);
      }
    }
    syncPreviewMirrors("customCanvas");
  }

  function hexAlpha(hex, a) {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  const IC_BIND = [
    "icBg", "icAccent", "icAccent2", "icShape", "icLetter", "icNoise", "icGlow", "icRad",
    "icScale", "icRot", "icStroke", "icFillOp", "icLetterSize", "icLetterY", "icLetterWeight",
    "icVig", "icShadow", "icPattern", "icGradDir",
  ];
  const IC_LABELS = {
    icNoise: "icNoiseVal", icGlow: "icGlowVal", icRad: "icRadVal", icScale: "icScaleVal",
    icRot: "icRotVal", icStroke: "icStrokeVal", icFillOp: "icFillOpVal",
    icLetterSize: "icLetterSizeVal", icLetterY: "icLetterYVal", icVig: "icVigVal", icShadow: "icShadowVal",
  };
  IC_BIND.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      const lab = IC_LABELS[id];
      if (lab) {
        const v = document.getElementById(lab);
        if (v) v.textContent = el.value;
      }
      paintCustom();
    });
  });

  const icAdvToggle = document.getElementById("icAdvToggle");
  const icAdvanced = document.getElementById("icAdvanced");
  if (icAdvToggle && icAdvanced) {
    icAdvToggle.addEventListener("click", () => {
      const open = icAdvanced.hidden;
      icAdvanced.hidden = !open;
      icAdvToggle.textContent = open ? "Advanced settings ▴" : "Advanced settings ▾";
    });
  }

  const icRandom = document.getElementById("icRandom");
  if (icRandom) {
    icRandom.addEventListener("click", () => {
      const shapes = ["rounded", "circle", "hex", "diamond", "shield", "ring", "triangle", "octagon", "blob"];
      document.getElementById("icShape").value = shapes[Math.floor(Math.random() * shapes.length)];
      document.getElementById("icLetter").value = "AMXLKRPCST"[Math.floor(Math.random() * 10)];
      document.getElementById("icNoise").value = String(10 + Math.floor(Math.random() * 50));
      document.getElementById("icGlow").value = String(20 + Math.floor(Math.random() * 60));
      document.getElementById("icRad").value = String(8 + Math.floor(Math.random() * 36));
      if (document.getElementById("icScale")) document.getElementById("icScale").value = String(70 + Math.floor(Math.random() * 50));
      if (document.getElementById("icRot")) document.getElementById("icRot").value = String(Math.floor(Math.random() * 40) - 20);
      const golds = ["#d4af37", "#eccb74", "#f7e6b8", "#b8860b", "#c9a227"];
      document.getElementById("icAccent").value = golds[Math.floor(Math.random() * golds.length)];
      if (document.getElementById("icAccent2")) document.getElementById("icAccent2").value = golds[Math.floor(Math.random() * golds.length)];
      paintCustom();
    });
  }
  const icReset = document.getElementById("icReset");
  if (icReset) {
    icReset.addEventListener("click", () => {
      const defaults = {
        icBg: "#121110", icAccent: "#d4af37", icAccent2: "#f7e6b8", icShape: "rounded", icLetter: "A",
        icNoise: "30", icGlow: "40", icRad: "22", icScale: "100", icRot: "0", icStroke: "5",
        icFillOp: "20", icLetterSize: "22", icLetterY: "0", icLetterWeight: "700", icVig: "25",
        icShadow: "20", icPattern: "none", icGradDir: "diag",
      };
      Object.keys(defaults).forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = defaults[id];
      });
      Object.keys(IC_LABELS).forEach((id) => {
        const el = document.getElementById(id);
        const lab = document.getElementById(IC_LABELS[id]);
        if (el && lab) lab.textContent = el.value;
      });
      paintCustom();
    });
  }

  function customDataUrl() {
    paintCustom();
    return customCanvas.toDataURL("image/png");
  }

  const exportCustom = document.getElementById("exportCustom");
  const useCustom = document.getElementById("useCustomForApp");
  if (exportCustom) {
    exportCustom.addEventListener("click", () => downloadDataUrl(customDataUrl(), "auriser-custom-icon.png"));
  }
  if (useCustom) {
    useCustom.addEventListener("click", () => {
      const url = customDataUrl();
      window.__AURISER_PENDING_ICON__ = url;
      if (typeof window.__AURISER_OPEN_PUBLISH_WITH_ICON__ === "function") {
        window.__AURISER_OPEN_PUBLISH_WITH_ICON__(url);
      }
    });
  }

  /* ---------- MLabs / toolkit apps ---------- */
  const TOOLKIT_RE =
    /\b(code|coding|program|programming|software|developer|dev|sdk|api|build|builder|ide|editor|compile|script|terminal|debug|framework|engine|tool|studio|create|creator|design|app\s*build)\b/i;

  function scoreToolkit(app) {
    const blob = [app.name, app.tagline, app.description, app.category].join(" ").toLowerCase();
    let score = 0;
    const words = blob.match(/[a-z0-9]+/g) || [];
    words.forEach((w) => {
      if (TOOLKIT_RE.test(w)) score += 2;
    });
    if (TOOLKIT_RE.test(blob)) score += 3;
    if (app.category === "dev" || app.category === "creative") score += 4;
    if (app._submitted || app._ownerEmail) score += 5;
    return score;
  }

  function renderCompanyApps() {
    const grid = document.getElementById("companyGrid");
    const empty = document.getElementById("companyEmpty");
    const count = document.getElementById("companyCount");
    if (!grid || !APPS) return;

    const ranked = APPS.map((a) => ({ app: a, s: scoreToolkit(a) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.app);

    grid.innerHTML = ranked
      .map(
        (app) => `
      <article class="app-card" data-id="${app.id}">
        ${buildIconSVG ? buildIconSVG(app) : ""}
        <h3>${app.name}</h3>
        <p class="tagline">${app.tagline || ""}</p>
        <div class="card-meta"><span class="upload-badge">Toolkit match</span></div>
      </article>`
      )
      .join("");

    if (empty) empty.style.display = ranked.length ? "none" : "block";
    if (count) count.textContent = ranked.length ? String(ranked.length) : "";

    grid.querySelectorAll(".app-card").forEach((card) => {
      card.addEventListener("click", () => {
        const app = APPS.find((a) => a.id === card.dataset.id);
        if (app && typeof window.__AURISER_OPEN_DETAIL__ === "function") {
          window.__AURISER_OPEN_DETAIL__(app);
        }
      });
    });
  }

  /* ---------- Init ---------- */
  fillGenBatch(36);
  paintCustom();
})();
