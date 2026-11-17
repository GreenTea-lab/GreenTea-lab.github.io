(() => {
  // src/core.js
  var suit = (c) => c >> 4;
  var rank = (c) => c & 15;
  var card = (s, r) => s * 16 + r;
  function rng(seed) {
    let s = seed * 2654435761 >>> 0 || 1;
    return () => (s = s * 1664525 + 1013904223 >>> 0) / 4294967296;
  }

  // src/cards.js
  var FONT = 'Nunito, "Arial Rounded MT Bold", Arial, sans-serif';
  var P2 = Math.PI * 2;
  var COLORS2 = ["#d22f3a", "#d22f3a", "#1f2433", "#1f2433"];
  var COLORS4 = ["#d22f3a", "#1d6fd0", "#22883a", "#1f2433"];
  var LABEL = {
    ru: { 11: "\u0412", 12: "\u0414", 13: "\u041A", 14: "\u0422" },
    en: { 11: "J", 12: "Q", 13: "K", 14: "A" }
  };
  var rankLabel = (r, lang) => r <= 10 ? String(r) : LABEL[lang === "ru" ? "ru" : "en"][r];
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function suitPath(ctx, s, cx, cy, size) {
    const k = size / 2;
    ctx.beginPath();
    if (s === 0) {
      ctx.moveTo(cx, cy + k * 0.92);
      ctx.bezierCurveTo(cx - k * 0.35, cy + k * 0.55, cx - k * 1.05, cy + k * 0.15, cx - k * 0.98, cy - k * 0.38);
      ctx.bezierCurveTo(cx - k * 0.9, cy - k * 1.02, cx - k * 0.12, cy - k * 1, cx, cy - k * 0.48);
      ctx.bezierCurveTo(cx + k * 0.12, cy - k * 1, cx + k * 0.9, cy - k * 1.02, cx + k * 0.98, cy - k * 0.38);
      ctx.bezierCurveTo(cx + k * 1.05, cy + k * 0.15, cx + k * 0.35, cy + k * 0.55, cx, cy + k * 0.92);
    } else if (s === 1) {
      ctx.moveTo(cx, cy - k);
      ctx.quadraticCurveTo(cx + k * 0.38, cy - k * 0.35, cx + k * 0.8, cy);
      ctx.quadraticCurveTo(cx + k * 0.38, cy + k * 0.35, cx, cy + k);
      ctx.quadraticCurveTo(cx - k * 0.38, cy + k * 0.35, cx - k * 0.8, cy);
      ctx.quadraticCurveTo(cx - k * 0.38, cy - k * 0.35, cx, cy - k);
    } else if (s === 2) {
      const r = k * 0.42;
      ctx.arc(cx, cy - k * 0.47, r, 0, P2);
      ctx.moveTo(cx - k * 0.47 + r, cy + k * 0.1);
      ctx.arc(cx - k * 0.47, cy + k * 0.1, r, 0, P2);
      ctx.moveTo(cx + k * 0.47 + r, cy + k * 0.1);
      ctx.arc(cx + k * 0.47, cy + k * 0.1, r, 0, P2);
      ctx.moveTo(cx + k * 0.12, cy - k * 0.1);
      ctx.quadraticCurveTo(cx + k * 0.12, cy + k * 0.68, cx + k * 0.4, cy + k * 0.96);
      ctx.lineTo(cx - k * 0.4, cy + k * 0.96);
      ctx.quadraticCurveTo(cx - k * 0.12, cy + k * 0.68, cx - k * 0.12, cy - k * 0.1);
    } else {
      ctx.moveTo(cx, cy - k);
      ctx.bezierCurveTo(cx + k * 0.25, cy - k * 0.6, cx + k * 1.05, cy - k * 0.2, cx + k * 0.95, cy + k * 0.3);
      ctx.bezierCurveTo(cx + k * 0.85, cy + k * 0.78, cx + k * 0.3, cy + k * 0.72, cx + k * 0.1, cy + k * 0.38);
      ctx.quadraticCurveTo(cx + k * 0.12, cy + k * 0.75, cx + k * 0.4, cy + k * 0.96);
      ctx.lineTo(cx - k * 0.4, cy + k * 0.96);
      ctx.quadraticCurveTo(cx - k * 0.12, cy + k * 0.75, cx - k * 0.1, cy + k * 0.38);
      ctx.bezierCurveTo(cx - k * 0.3, cy + k * 0.72, cx - k * 0.85, cy + k * 0.78, cx - k * 0.95, cy + k * 0.3);
      ctx.bezierCurveTo(cx - k * 1.05, cy - k * 0.2, cx - k * 0.25, cy - k * 0.6, cx, cy - k);
    }
    ctx.closePath();
  }
  var PIPS = {
    2: [[0.5, 0], [0.5, 1]],
    3: [[0.5, 0], [0.5, 0.5], [0.5, 1]],
    4: [[0, 0], [1, 0], [0, 1], [1, 1]],
    5: [[0, 0], [1, 0], [0.5, 0.5], [0, 1], [1, 1]],
    6: [[0, 0], [1, 0], [0, 0.5], [1, 0.5], [0, 1], [1, 1]],
    7: [[0, 0], [1, 0], [0.5, 0.25], [0, 0.5], [1, 0.5], [0, 1], [1, 1]],
    8: [[0, 0], [1, 0], [0.5, 0.25], [0, 0.5], [1, 0.5], [0.5, 0.75], [0, 1], [1, 1]],
    9: [[0, 0], [1, 0], [0, 1 / 3], [1, 1 / 3], [0.5, 0.5], [0, 2 / 3], [1, 2 / 3], [0, 1], [1, 1]],
    10: [[0, 0], [1, 0], [0.5, 1 / 6], [0, 1 / 3], [1, 1 / 3], [0, 2 / 3], [1, 2 / 3], [0.5, 5 / 6], [0, 1], [1, 1]]
  };
  var BACKS = {
    classic: { price: 0 },
    blue: { price: 600 },
    gzhel: { price: 1200 },
    khokhloma: { price: 2e3 },
    birch: { price: 3e3 },
    stars: { price: 4500 }
  };
  var BACK_ORDER = Object.keys(BACKS);
  var CLOTHS = {
    felt: { price: 0 },
    check: { price: 800 },
    lemon: { price: 1500 },
    lace: { price: 2500 },
    walnut: { price: 3500 },
    velvet: { price: 5e3 }
  };
  var CLOTH_ORDER = Object.keys(CLOTHS);
  function petal(ctx, x, y, len, wid, ang) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(wid, -len * 0.5, 0, -len);
    ctx.quadraticCurveTo(-wid, -len * 0.5, 0, 0);
    ctx.restore();
  }
  function drawBack(ctx, style, w, h) {
    const r = w * 0.09;
    ctx.save();
    rr(ctx, 0, 0, w, h, r);
    ctx.clip();
    const m = w * 0.075;
    const iw = w - m * 2, ih = h - m * 2;
    if (style === "classic" || style === "blue") {
      const c1 = style === "classic" ? "#b8323a" : "#2f5fa8", c2 = style === "classic" ? "#8e1f28" : "#1f3f7a", c3 = style === "classic" ? "#e9a24a" : "#a9c8f0";
      ctx.fillStyle = "#fbf6ea";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = c1;
      rr(ctx, m, m, iw, ih, r * 0.6);
      ctx.fill();
      ctx.save();
      rr(ctx, m, m, iw, ih, r * 0.6);
      ctx.clip();
      ctx.strokeStyle = c2;
      ctx.lineWidth = w * 0.025;
      const s = w * 0.14;
      for (let x = -h; x < w + h; x += s) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + h, h);
        ctx.moveTo(x, h);
        ctx.lineTo(x + h, 0);
        ctx.stroke();
      }
      ctx.fillStyle = c3;
      for (let y = 0; y < h + s; y += s / 2) for (let x = 0; x < w + s; x += s) {
        const ox = Math.round(y / (s / 2)) % 2 * (s / 2);
        ctx.beginPath();
        ctx.arc(x + ox, y, w * 0.018, 0, P2);
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = "#fbf6ea";
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, w * 0.24, w * 0.3, 0, 0, P2);
      ctx.fill();
      ctx.strokeStyle = c2;
      ctx.lineWidth = w * 0.03;
      ctx.stroke();
      ctx.fillStyle = c1;
      for (let k = 0; k < 4; k++) {
        suitPath(ctx, k, w / 2 + Math.cos(k * P2 / 4 - Math.PI / 4) * w * 0.1, h / 2 + Math.sin(k * P2 / 4 - Math.PI / 4) * w * 0.12, w * 0.13);
        ctx.fill();
      }
    } else if (style === "gzhel") {
      ctx.fillStyle = "#f7f9ff";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#1d4fa8";
      ctx.lineWidth = w * 0.03;
      rr(ctx, m, m, iw, ih, r * 0.6);
      ctx.stroke();
      ctx.lineWidth = w * 0.012;
      rr(ctx, m * 1.7, m * 1.7, w - m * 3.4, h - m * 3.4, r * 0.4);
      ctx.stroke();
      const flower = (cx, cy, R, n) => {
        for (let k = 0; k < n; k++) {
          const a = k / n * P2;
          petal(ctx, cx, cy, R, R * 0.55, a);
          const gr = ctx.createLinearGradient(cx, cy, cx + Math.sin(a) * R, cy - Math.cos(a) * R);
          gr.addColorStop(0, "#0f3a8a");
          gr.addColorStop(1, "#6f9be0");
          ctx.fillStyle = gr;
          ctx.fill();
        }
        ctx.fillStyle = "#0f3a8a";
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.22, 0, P2);
        ctx.fill();
      };
      ctx.strokeStyle = "#2a5cb8";
      ctx.lineWidth = w * 0.018;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.5);
      ctx.quadraticCurveTo(w * 0.2, h * 0.38, w * 0.3, h * 0.2);
      ctx.moveTo(w * 0.5, h * 0.5);
      ctx.quadraticCurveTo(w * 0.8, h * 0.62, w * 0.7, h * 0.8);
      ctx.stroke();
      for (const [x, y, a] of [[0.27, 0.36, -0.6], [0.73, 0.64, 2.5], [0.38, 0.72, 2], [0.62, 0.28, -1]]) {
        petal(ctx, w * x, h * y, w * 0.14, w * 0.06, a);
        ctx.fillStyle = "#3c6fc8";
        ctx.fill();
      }
      flower(w / 2, h / 2, w * 0.2, 7);
      flower(w * 0.3, h * 0.2, w * 0.08, 5);
      flower(w * 0.7, h * 0.8, w * 0.08, 5);
    } else if (style === "khokhloma") {
      ctx.fillStyle = "#1b1410";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#e8b13a";
      ctx.lineWidth = w * 0.03;
      rr(ctx, m, m, iw, ih, r * 0.6);
      ctx.stroke();
      ctx.strokeStyle = "#e8b13a";
      ctx.lineWidth = w * 0.022;
      ctx.beginPath();
      ctx.moveTo(w * 0.2, h * 0.9);
      ctx.bezierCurveTo(w * 0.9, h * 0.7, w * 0.1, h * 0.35, w * 0.75, h * 0.12);
      ctx.stroke();
      const leaves = [[0.32, 0.8, -0.8], [0.62, 0.68, 1.6], [0.42, 0.52, -1.4], [0.55, 0.36, 1.2], [0.4, 0.24, -1], [0.66, 0.18, 1]];
      for (const [x, y, a] of leaves) {
        petal(ctx, w * x, h * y, w * 0.18, w * 0.08, a);
        ctx.fillStyle = "#e8b13a";
        ctx.fill();
      }
      for (const [x, y] of [[0.5, 0.5], [0.56, 0.55], [0.47, 0.57], [0.3, 0.33], [0.36, 0.3], [0.7, 0.42], [0.66, 0.85], [0.6, 0.88]]) {
        ctx.fillStyle = "#d22a1e";
        ctx.beginPath();
        ctx.arc(w * x, h * y, w * 0.045, 0, P2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,220,180,.7)";
        ctx.beginPath();
        ctx.arc(w * x - w * 0.012, h * y - w * 0.014, w * 0.012, 0, P2);
        ctx.fill();
      }
    } else if (style === "birch") {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#6aa84f");
      g.addColorStop(1, "#3f7a34");
      ctx.fillStyle = "#fbf6ea";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = g;
      rr(ctx, m, m, iw, ih, r * 0.6);
      ctx.fill();
      const R = rng(11);
      for (const x of [0.28, 0.5, 0.72]) {
        ctx.fillStyle = "#f4f1e8";
        ctx.fillRect(w * x - w * 0.045, m, w * 0.09, ih);
        ctx.fillStyle = "#2a2a2a";
        for (let y = m + 4; y < h - m; y += w * 0.12) {
          ctx.fillRect(w * x - w * 0.045 + R() * w * 0.04, y + R() * w * 0.06, w * (0.02 + R() * 0.04), w * 0.012);
        }
      }
      for (let k = 0; k < 18; k++) {
        petal(ctx, w * (0.15 + R() * 0.7), h * (0.1 + R() * 0.8), w * 0.08, w * 0.04, R() * P2);
        ctx.fillStyle = R() < 0.5 ? "#a6d86e" : "#f2c84a";
        ctx.fill();
      }
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#1d2a5c");
      g.addColorStop(1, "#0f1636");
      ctx.fillStyle = "#fbf6ea";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = g;
      rr(ctx, m, m, iw, ih, r * 0.6);
      ctx.fill();
      const R = rng(5);
      const star = (x, y, s) => {
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = k / 10 * P2 - Math.PI / 2;
          const rad = k % 2 ? s * 0.42 : s;
          ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
        }
        ctx.closePath();
        ctx.fill();
      };
      ctx.fillStyle = "#ffd35a";
      for (let k = 0; k < 16; k++) star(m + R() * iw, m + R() * ih, w * (0.025 + R() * 0.04));
      ctx.fillStyle = "#ffe9a8";
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, w * 0.17, 0, P2);
      ctx.fill();
      ctx.fillStyle = "#16204a";
      ctx.beginPath();
      ctx.arc(w * 0.57, h * 0.47, w * 0.15, 0, P2);
      ctx.fill();
    }
    ctx.restore();
    ctx.lineWidth = Math.max(1, w * 0.016);
    ctx.strokeStyle = "rgba(40,30,20,.35)";
    rr(ctx, 0.5, 0.5, w - 1, h - 1, r);
    ctx.stroke();
  }
  function court(ctx, r, s, x, y, w, h, col) {
    const cx = x + w / 2;
    const robe = ["#d9434c", "#e0703a", "#3f8a52", "#3d4f8a"][s];
    const robe2 = ["#9e2731", "#a8481c", "#25603a", "#25305e"][s];
    const hair = r === 13 ? "#8a8f9a" : r === 12 ? "#c48a3a" : "#6a3d1c";
    const bg = ctx.createLinearGradient(0, y, 0, y + h);
    bg.addColorStop(0, s < 2 ? "#fde9e2" : "#e8edf8");
    bg.addColorStop(1, s < 2 ? "#f8d6cc" : "#d6def0");
    ctx.fillStyle = bg;
    rr(ctx, x, y, w, h, w * 0.08);
    ctx.fill();
    ctx.save();
    rr(ctx, x, y, w, h, w * 0.08);
    ctx.clip();
    const u = w / 10;
    const hy = y + h * 0.44;
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.moveTo(cx - u * 4.6, y + h);
    ctx.quadraticCurveTo(cx - u * 4.4, hy + u * 2.4, cx - u * 1.6, hy + u * 2.1);
    ctx.lineTo(cx + u * 1.6, hy + u * 2.1);
    ctx.quadraticCurveTo(cx + u * 4.4, hy + u * 2.4, cx + u * 4.6, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f5c03c";
    ctx.beginPath();
    ctx.moveTo(cx - u * 1.9, hy + u * 2.05);
    ctx.lineTo(cx, hy + u * 3.6);
    ctx.lineTo(cx + u * 1.9, hy + u * 2.05);
    ctx.lineTo(cx + u * 1.2, hy + u * 1.8);
    ctx.lineTo(cx, hy + u * 2.7);
    ctx.lineTo(cx - u * 1.2, hy + u * 1.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = robe2;
    for (const dx of [-3, -1.8, 1.8, 3]) {
      ctx.beginPath();
      ctx.arc(cx + dx * u, hy + u * 3.8 + Math.abs(dx) * u * 0.15, u * 0.32, 0, P2);
      ctx.fill();
    }
    ctx.fillStyle = col;
    suitPath(ctx, s, cx, hy + u * 4.6, u * 1.4);
    ctx.fill();
    ctx.fillStyle = "#f2c7a5";
    ctx.fillRect(cx - u * 0.6, hy + u * 1.1, u * 1.2, u * 1.2);
    ctx.fillStyle = hair;
    if (r === 12) {
      ctx.beginPath();
      ctx.ellipse(cx, hy + u * 0.6, u * 2.1, u * 2.3, 0, 0, P2);
      ctx.fill();
    }
    ctx.fillStyle = "#f6d2b3";
    ctx.beginPath();
    ctx.ellipse(cx, hy, u * 1.55, u * 1.75, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(cx, hy - u * 1, u * 1.6, u * 0.85, 0, Math.PI, P2);
    ctx.fill();
    if (r === 13) {
      ctx.beginPath();
      ctx.moveTo(cx - u * 1.45, hy + u * 0.2);
      ctx.quadraticCurveTo(cx - u * 1.3, hy + u * 2.4, cx, hy + u * 2.5);
      ctx.quadraticCurveTo(cx + u * 1.3, hy + u * 2.4, cx + u * 1.45, hy + u * 0.2);
      ctx.quadraticCurveTo(cx, hy + u * 1.2, cx - u * 1.45, hy + u * 0.2);
      ctx.fill();
      ctx.fillStyle = "#f6d2b3";
      ctx.beginPath();
      ctx.ellipse(cx, hy + u * 0.95, u * 0.45, u * 0.2, 0, 0, P2);
      ctx.fill();
    }
    ctx.fillStyle = "#3a2516";
    for (const dx of [-0.55, 0.55]) {
      ctx.beginPath();
      ctx.ellipse(cx + dx * u, hy - u * 0.05, u * 0.17, u * 0.22, 0, 0, P2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(232,110,110,.45)";
    for (const dx of [-0.95, 0.95]) {
      ctx.beginPath();
      ctx.arc(cx + dx * u, hy + u * 0.45, u * 0.3, 0, P2);
      ctx.fill();
    }
    if (r !== 13) {
      ctx.strokeStyle = "#a0503a";
      ctx.lineWidth = u * 0.16;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(cx, hy + u * 0.45, u * 0.38, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }
    ctx.lineJoin = "round";
    ctx.lineWidth = u * 0.2;
    if (r === 13) {
      ctx.fillStyle = "#f5c03c";
      ctx.strokeStyle = "#b07a12";
      const cy = hy - u * 1.75;
      ctx.beginPath();
      ctx.moveTo(cx - u * 1.6, cy + u * 0.6);
      ctx.lineTo(cx - u * 1.85, cy - u * 1);
      ctx.lineTo(cx - u * 0.85, cy - u * 0.1);
      ctx.lineTo(cx, cy - u * 1.3);
      ctx.lineTo(cx + u * 0.85, cy - u * 0.1);
      ctx.lineTo(cx + u * 1.85, cy - u * 1);
      ctx.lineTo(cx + u * 1.6, cy + u * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = robe;
      ctx.beginPath();
      ctx.arc(cx, cy + u * 0.1, u * 0.3, 0, P2);
      ctx.fill();
    } else if (r === 12) {
      ctx.fillStyle = "#f5c03c";
      ctx.strokeStyle = "#b07a12";
      const cy = hy - u * 1.55;
      ctx.beginPath();
      ctx.moveTo(cx - u * 1.5, cy + u * 0.5);
      ctx.quadraticCurveTo(cx - u * 1.1, cy - u * 0.5, cx, cy - u * 0.9);
      ctx.quadraticCurveTo(cx + u * 1.1, cy - u * 0.5, cx + u * 1.5, cy + u * 0.5);
      ctx.quadraticCurveTo(cx, cy + u * 0.1, cx - u * 1.5, cy + u * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = robe;
      ctx.beginPath();
      ctx.ellipse(cx, cy - u * 0.25, u * 0.25, u * 0.33, 0, 0, P2);
      ctx.fill();
    } else {
      ctx.fillStyle = robe;
      ctx.strokeStyle = robe2;
      ctx.beginPath();
      ctx.ellipse(cx - u * 0.1, hy - u * 1.45, u * 2, u * 0.85, -0.12, Math.PI * 0.92, Math.PI * 2.08);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f5c03c";
      rr(ctx, cx - u * 1.75, hy - u * 1.6, u * 3.5, u * 0.45, u * 0.2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#c8c8c8";
      ctx.beginPath();
      ctx.moveTo(cx + u * 0.9, hy - u * 1.7);
      ctx.quadraticCurveTo(cx + u * 2.9, hy - u * 2.6, cx + u * 2.6, hy - u * 3.6);
      ctx.quadraticCurveTo(cx + u * 1.5, hy - u * 2.8, cx + u * 0.9, hy - u * 1.7);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = w * 0.025;
    rr(ctx, x, y, w, h, w * 0.08);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  function drawFace(ctx, c, w, h, { four = false, lang = "ru" } = {}) {
    const s = suit(c), r = rank(c);
    const col = (four ? COLORS4 : COLORS2)[s];
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#fffefa");
    g.addColorStop(1, "#f6efdf");
    ctx.fillStyle = g;
    rr(ctx, 0.5, 0.5, w - 1, h - 1, w * 0.09);
    ctx.fill();
    ctx.lineWidth = Math.max(1, w * 0.016);
    ctx.strokeStyle = "rgba(60,45,30,.35)";
    ctx.stroke();
    const label = rankLabel(r, lang);
    ctx.fillStyle = col;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const ix = w * 0.165;
    ctx.font = `900 ${w * (label.length > 1 ? 0.26 : 0.3)}px ${FONT}`;
    if (label.length > 1) {
      ctx.save();
      ctx.translate(ix + w * 5e-3, w * 0.3);
      ctx.scale(0.86, 1);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    } else ctx.fillText(label, ix, w * 0.3);
    suitPath(ctx, s, ix, w * 0.44, w * 0.2);
    ctx.fill();
    ctx.save();
    ctx.translate(w, h);
    ctx.rotate(Math.PI);
    ctx.font = `900 ${w * 0.2}px ${FONT}`;
    ctx.fillText(label, w * 0.13, w * 0.22);
    suitPath(ctx, s, w * 0.13, w * 0.33, w * 0.14);
    ctx.fill();
    ctx.restore();
    const x0 = w * 0.33, x1 = w * 0.67, y0 = h * 0.17, y1 = h * 0.83;
    if (r >= 11 && r <= 13) {
      court(ctx, r, s, w * 0.29, h * 0.07, w * 0.64, h * 0.76, col);
    } else if (r === 14) {
      ctx.fillStyle = "#f5c03c";
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(w * 0.56, h * 0.5, w * 0.31, 0, P2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#d9a12a";
      ctx.lineWidth = w * 0.015;
      ctx.beginPath();
      ctx.arc(w * 0.56, h * 0.5, w * 0.31, 0, P2);
      ctx.stroke();
      ctx.fillStyle = col;
      suitPath(ctx, s, w * 0.56, h * 0.5, w * 0.44);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.35)";
      suitPath(ctx, s, w * 0.53, h * 0.47, w * 0.16);
      ctx.fill();
    } else {
      const pts = PIPS[r] || [];
      const ps = w * (r >= 9 ? 0.17 : 0.2);
      const px0 = w * 0.38, px1 = w * 0.76;
      for (const [fx, fy] of pts) {
        const x = px0 + (px1 - px0) * fx, y = y0 + (y1 - y0) * fy;
        ctx.save();
        ctx.translate(x, y);
        if (fy > 0.5) ctx.rotate(Math.PI);
        ctx.fillStyle = col;
        suitPath(ctx, s, 0, 0, ps);
        ctx.fill();
        ctx.restore();
      }
    }
    void x0, x1;
  }

  // src/avatars.js
  var P22 = Math.PI * 2;
  var KINDS = ["cat", "bear", "fox", "rabbit", "hedgehog", "owl", "raccoon", "dog", "sheep"];
  var BG = { cat: "#f6d9a8", bear: "#cfe3c4", fox: "#d4e4f4", rabbit: "#f4d4dc", hedgehog: "#e8e0c8", owl: "#d8d0ec", raccoon: "#cfe8e4", dog: "#f2e2c0", sheep: "#d0e4f0" };
  function circ(g, x, y, r, fill) {
    g.beginPath();
    g.arc(x, y, r, 0, P22);
    g.fillStyle = fill;
    g.fill();
  }
  function ell(g, x, y, rx, ry, rot, fill) {
    g.beginPath();
    g.ellipse(x, y, rx, ry, rot, 0, P22);
    g.fillStyle = fill;
    g.fill();
  }
  function eyes(g, u, dy = 0, sp = 0.36, big = 1) {
    for (const s of [-1, 1]) {
      ell(g, s * sp * u, dy * u, 0.085 * u * big, 0.11 * u * big, 0, "#2a1a10");
      circ(g, s * sp * u + 0.03 * u * big, (dy - 0.04) * u, 0.03 * u * big, "#ffffff");
    }
  }
  function cheeks(g, u, dy = 0.22, sp = 0.5) {
    for (const s of [-1, 1]) ell(g, s * sp * u, dy * u, 0.12 * u, 0.08 * u, 0, "rgba(240,110,120,.45)");
  }
  function smile(g, u, dy = 0.25, w = 0.12, col = "#5a2a1a") {
    g.strokeStyle = col;
    g.lineWidth = 0.045 * u;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(-w * u, dy * u);
    g.quadraticCurveTo(-w * 0.5 * u, (dy + 0.08) * u, 0, dy * u);
    g.quadraticCurveTo(w * 0.5 * u, (dy + 0.08) * u, w * u, dy * u);
    g.stroke();
  }
  var FACE = {
    cat(g, u) {
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(s * 0.62 * u, -0.25 * u);
        g.lineTo(s * 0.6 * u, -0.95 * u);
        g.lineTo(s * 0.15 * u, -0.58 * u);
        g.closePath();
        g.fillStyle = "#e8963a";
        g.fill();
        g.beginPath();
        g.moveTo(s * 0.52 * u, -0.38 * u);
        g.lineTo(s * 0.54 * u, -0.78 * u);
        g.lineTo(s * 0.28 * u, -0.56 * u);
        g.closePath();
        g.fillStyle = "#f7c4b8";
        g.fill();
      }
      ell(g, 0, 0, 0.72 * u, 0.62 * u, 0, "#f0a24a");
      g.fillStyle = "#c9752a";
      for (const x of [-0.18, 0, 0.18]) ell(g, x * u, -0.5 * u, 0.05 * u, 0.13 * u, 0, "#c9752a");
      ell(g, 0, 0.22 * u, 0.36 * u, 0.24 * u, 0, "#fff4e6");
      eyes(g, u, -0.05);
      ell(g, 0, 0.12 * u, 0.07 * u, 0.05 * u, 0, "#e8707a");
      smile(g, u, 0.2, 0.1);
      g.strokeStyle = "rgba(80,50,30,.6)";
      g.lineWidth = 0.025 * u;
      for (const s of [-1, 1]) for (const k of [-0.05, 0.06]) {
        g.beginPath();
        g.moveTo(s * 0.3 * u, (0.15 + k) * u);
        g.lineTo(s * 0.72 * u, (0.1 + k * 2) * u);
        g.stroke();
      }
      cheeks(g, u, 0.15, 0.48);
    },
    bear(g, u) {
      for (const s of [-1, 1]) {
        circ(g, s * 0.55 * u, -0.55 * u, 0.25 * u, "#8a5a34");
        circ(g, s * 0.55 * u, -0.55 * u, 0.13 * u, "#c99a72");
      }
      ell(g, 0, 0.02 * u, 0.72 * u, 0.66 * u, 0, "#9a6a40");
      ell(g, 0, 0.25 * u, 0.32 * u, 0.24 * u, 0, "#e2c09a");
      ell(g, 0, 0.14 * u, 0.11 * u, 0.08 * u, 0, "#3a2414");
      eyes(g, u, -0.08, 0.32);
      smile(g, u, 0.28, 0.08);
      cheeks(g, u, 0.18, 0.5);
    },
    fox(g, u) {
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(s * 0.65 * u, -0.2 * u);
        g.lineTo(s * 0.7 * u, -1 * u);
        g.lineTo(s * 0.12 * u, -0.55 * u);
        g.closePath();
        g.fillStyle = "#e0682a";
        g.fill();
        g.beginPath();
        g.moveTo(s * 0.58 * u, -0.35 * u);
        g.lineTo(s * 0.62 * u, -0.82 * u);
        g.lineTo(s * 0.3 * u, -0.55 * u);
        g.closePath();
        g.fillStyle = "#3a2418";
        g.fill();
      }
      g.beginPath();
      g.moveTo(-0.76 * u, -0.1 * u);
      g.quadraticCurveTo(-0.7 * u, -0.66 * u, 0, -0.62 * u);
      g.quadraticCurveTo(0.7 * u, -0.66 * u, 0.76 * u, -0.1 * u);
      g.quadraticCurveTo(0.6 * u, 0.5 * u, 0, 0.62 * u);
      g.quadraticCurveTo(-0.6 * u, 0.5 * u, -0.76 * u, -0.1 * u);
      g.fillStyle = "#ef7a34";
      g.fill();
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(s * 0.74 * u, 0);
        g.quadraticCurveTo(s * 0.3 * u, 0, 0, 0.62 * u);
        g.quadraticCurveTo(s * 0.5 * u, 0.45 * u, s * 0.74 * u, 0);
        g.fillStyle = "#fff6ea";
        g.fill();
      }
      ell(g, 0, 0.42 * u, 0.09 * u, 0.065 * u, 0, "#2a1a10");
      eyes(g, u, -0.12, 0.3);
      cheeks(g, u, 0.12, 0.45);
    },
    rabbit(g, u) {
      for (const s of [-1, 1]) {
        ell(g, s * 0.28 * u, -0.95 * u, 0.17 * u, 0.48 * u, s * 0.12, "#ece6e2");
        ell(g, s * 0.28 * u, -0.92 * u, 0.08 * u, 0.36 * u, s * 0.12, "#f4b8c4");
      }
      ell(g, 0, 0.02 * u, 0.68 * u, 0.62 * u, 0, "#f4f0ec");
      eyes(g, u, -0.05, 0.32);
      ell(g, 0, 0.15 * u, 0.07 * u, 0.05 * u, 0, "#e8707a");
      g.strokeStyle = "#8a6a5a";
      g.lineWidth = 0.035 * u;
      g.beginPath();
      g.moveTo(0, 0.19 * u);
      g.lineTo(0, 0.27 * u);
      g.stroke();
      smile(g, u, 0.27, 0.09, "#8a6a5a");
      g.fillStyle = "#fff";
      g.fillRect(-0.05 * u, 0.29 * u, 0.1 * u, 0.1 * u);
      cheeks(g, u, 0.18, 0.46);
    },
    hedgehog(g, u) {
      g.fillStyle = "#6a4a30";
      for (let k = 0; k < 18; k++) {
        const a = Math.PI * 0.95 + k / 17 * Math.PI * 1.1;
        g.beginPath();
        g.moveTo(Math.cos(a - 0.12) * 0.62 * u, Math.sin(a - 0.12) * 0.62 * u);
        g.lineTo(Math.cos(a) * 0.98 * u, Math.sin(a) * 0.95 * u);
        g.lineTo(Math.cos(a + 0.12) * 0.62 * u, Math.sin(a + 0.12) * 0.62 * u);
        g.fill();
      }
      ell(g, 0, -0.15 * u, 0.75 * u, 0.55 * u, 0, "#7a5638");
      ell(g, 0, 0.12 * u, 0.58 * u, 0.5 * u, 0, "#f0d6b4");
      ell(g, 0, 0.3 * u, 0.1 * u, 0.075 * u, 0, "#2a1a10");
      eyes(g, u, 0.02, 0.26, 0.9);
      smile(g, u, 0.42, 0.07);
      cheeks(g, u, 0.25, 0.4);
    },
    owl(g, u) {
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(s * 0.5 * u, -0.4 * u);
        g.lineTo(s * 0.62 * u, -0.85 * u);
        g.lineTo(s * 0.2 * u, -0.55 * u);
        g.closePath();
        g.fillStyle = "#7a6a9a";
        g.fill();
      }
      ell(g, 0, 0.02 * u, 0.72 * u, 0.68 * u, 0, "#8a7ab0");
      ell(g, 0, 0.35 * u, 0.42 * u, 0.32 * u, 0, "#d8cce8");
      for (const s of [-1, 1]) {
        circ(g, s * 0.3 * u, -0.08 * u, 0.25 * u, "#fbf6ea");
        circ(g, s * 0.3 * u, -0.08 * u, 0.13 * u, "#2a1a10");
        circ(g, s * 0.3 * u + 0.05 * u, -0.13 * u, 0.045 * u, "#fff");
      }
      g.beginPath();
      g.moveTo(-0.08 * u, 0.12 * u);
      g.lineTo(0.08 * u, 0.12 * u);
      g.lineTo(0, 0.26 * u);
      g.closePath();
      g.fillStyle = "#f2a83a";
      g.fill();
      cheeks(g, u, 0.2, 0.52);
    },
    raccoon(g, u) {
      for (const s of [-1, 1]) {
        circ(g, s * 0.55 * u, -0.55 * u, 0.22 * u, "#7a7a82");
        circ(g, s * 0.55 * u, -0.55 * u, 0.11 * u, "#3a3a40");
      }
      ell(g, 0, 0.02 * u, 0.74 * u, 0.62 * u, 0, "#9a9aa4");
      ell(g, 0, -0.38 * u, 0.3 * u, 0.2 * u, 0, "#eeeef2");
      g.beginPath();
      g.ellipse(-0.33 * u, -0.05 * u, 0.3 * u, 0.18 * u, 0.25, 0, P22);
      g.ellipse(0.33 * u, -0.05 * u, 0.3 * u, 0.18 * u, -0.25, 0, P22);
      g.fillStyle = "#3a3a44";
      g.fill();
      ell(g, 0, 0.25 * u, 0.3 * u, 0.22 * u, 0, "#f2f2f4");
      ell(g, 0, 0.14 * u, 0.09 * u, 0.065 * u, 0, "#1a1a20");
      for (const s of [-1, 1]) {
        circ(g, s * 0.33 * u, -0.05 * u, 0.09 * u, "#ffffff");
        circ(g, s * 0.33 * u, -0.05 * u, 0.06 * u, "#1a1a20");
      }
      smile(g, u, 0.27, 0.08, "#3a3a44");
      cheeks(g, u, 0.2, 0.5);
    },
    dog(g, u) {
      for (const s of [-1, 1]) ell(g, s * 0.66 * u, -0.05 * u, 0.2 * u, 0.42 * u, s * -0.25, "#a8743e");
      ell(g, 0, 0, 0.62 * u, 0.62 * u, 0, "#e2b878");
      ell(g, 0.28 * u, -0.22 * u, 0.22 * u, 0.2 * u, 0, "#fbf2e2");
      ell(g, 0, 0.24 * u, 0.3 * u, 0.22 * u, 0, "#fbf2e2");
      ell(g, 0, 0.12 * u, 0.12 * u, 0.085 * u, 0, "#2a1a10");
      eyes(g, u, -0.12, 0.28);
      g.beginPath();
      g.ellipse(0, 0.38 * u, 0.08 * u, 0.1 * u, 0, 0, Math.PI);
      g.fillStyle = "#e8707a";
      g.fill();
      smile(g, u, 0.3, 0.12);
      cheeks(g, u, 0.15, 0.46);
    },
    sheep(g, u) {
      for (let k = 0; k < 12; k++) {
        const a = k / 12 * P22;
        circ(g, Math.cos(a) * 0.62 * u, Math.sin(a) * 0.58 * u - 0.05 * u, 0.24 * u, "#fbf8f2");
      }
      for (const s of [-1, 1]) ell(g, s * 0.62 * u, 0.05 * u, 0.2 * u, 0.1 * u, s * 0.4, "#5a4a40");
      ell(g, 0, 0.1 * u, 0.48 * u, 0.5 * u, 0, "#6a5a50");
      for (let k = 0; k < 5; k++) circ(g, (k - 2) * 0.16 * u, -0.38 * u, 0.15 * u, "#fbf8f2");
      for (const s of [-1, 1]) {
        circ(g, s * 0.2 * u, 0, 0.1 * u, "#fff");
        circ(g, s * 0.2 * u, 0.01 * u, 0.06 * u, "#1a1a20");
      }
      ell(g, 0, 0.3 * u, 0.06 * u, 0.04 * u, 0, "#2a1a10");
      smile(g, u, 0.38, 0.07, "#2a1a10");
      cheeks(g, u, 0.22, 0.32);
    }
  };
  var ACC = {
    cat: "bow",
    bear: "cap",
    fox: "scarf",
    rabbit: "glasses",
    hedgehog: "beret",
    owl: "glasses",
    raccoon: "cap2",
    dog: "bandana",
    sheep: "hat"
  };
  function accessory(g, a, u, kind) {
    if (a === "bow") {
      const y = 0.62 * u;
      g.fillStyle = "#d23a4a";
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(-0.3 * u, y - 0.15 * u);
      g.lineTo(-0.3 * u, y + 0.15 * u);
      g.closePath();
      g.moveTo(0, y);
      g.lineTo(0.3 * u, y - 0.15 * u);
      g.lineTo(0.3 * u, y + 0.15 * u);
      g.closePath();
      g.fill();
      circ(g, 0, y, 0.07 * u, "#a82a3a");
    } else if (a === "cap") {
      g.fillStyle = "#4a5a6a";
      g.beginPath();
      g.ellipse(0, -0.55 * u, 0.62 * u, 0.32 * u, 0, Math.PI, P22);
      g.fill();
      ell(g, 0.22 * u, -0.52 * u, 0.5 * u, 0.1 * u, 0.05, "#3a4a5a");
      circ(g, 0, -0.85 * u, 0.06 * u, "#3a4a5a");
    } else if (a === "cap2") {
      g.fillStyle = "#3a8a5a";
      g.beginPath();
      g.ellipse(0, -0.5 * u, 0.6 * u, 0.4 * u, 0, Math.PI, P22);
      g.fill();
      ell(g, -0.25 * u, -0.48 * u, 0.45 * u, 0.09 * u, -0.1, "#2a6a44");
    } else if (a === "scarf") {
      g.fillStyle = "#3f72c8";
      g.beginPath();
      g.ellipse(0, 0.66 * u, 0.6 * u, 0.16 * u, 0, 0, P22);
      g.fill();
      g.fillRect(0.2 * u, 0.66 * u, 0.18 * u, 0.4 * u);
      g.fillStyle = "#f2f2f2";
      for (const x of [-0.35, -0.05, 0.25]) g.fillRect(x * u, 0.58 * u, 0.08 * u, 0.16 * u);
    } else if (a === "glasses") {
      g.strokeStyle = "#3a2a20";
      g.lineWidth = 0.05 * u;
      const y = kind === "owl" ? -0.08 : -0.05, sp = kind === "owl" ? 0.3 : 0.32;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.arc(s * sp * u, y * u, (kind === "owl" ? 0.28 : 0.17) * u, 0, P22);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(-0.12 * u, y * u);
      g.lineTo(0.12 * u, y * u);
      g.stroke();
    } else if (a === "beret") {
      ell(g, -0.1 * u, -0.6 * u, 0.55 * u, 0.22 * u, -0.15, "#c23a3a");
      circ(g, -0.1 * u, -0.8 * u, 0.06 * u, "#9a2a2a");
    } else if (a === "bandana") {
      g.fillStyle = "#d23a3a";
      g.beginPath();
      g.moveTo(-0.5 * u, 0.48 * u);
      g.lineTo(0.5 * u, 0.48 * u);
      g.lineTo(0, 0.82 * u);
      g.closePath();
      g.fill();
      g.fillStyle = "#fff";
      for (const [x, y] of [[-0.25, 0.55], [0.2, 0.56], [0, 0.68]]) circ(g, x * u, y * u, 0.04 * u, "#fff");
    } else if (a === "hat") {
      g.fillStyle = "#e8b13a";
      g.beginPath();
      g.ellipse(0, -0.6 * u, 0.5 * u, 0.35 * u, 0, Math.PI, P22);
      g.fill();
      g.fillStyle = "#c4122a";
      g.fillRect(-0.5 * u, -0.66 * u, u, 0.12 * u);
      circ(g, 0, -0.98 * u, 0.12 * u, "#f6f2ea");
    }
  }
  function jesterCap(g, u) {
    for (const [s, c] of [[-1, "#d23a4a"], [1, "#3f72c8"]]) {
      g.beginPath();
      g.moveTo(0, -0.55 * u);
      g.quadraticCurveTo(s * 0.4 * u, -1.25 * u, s * 0.95 * u, -1 * u);
      g.quadraticCurveTo(s * 0.55 * u, -0.85 * u, s * 0.62 * u, -0.45 * u);
      g.closePath();
      g.fillStyle = c;
      g.fill();
      circ(g, s * 0.95 * u, -1 * u, 0.1 * u, "#f5c03c");
    }
    g.beginPath();
    g.moveTo(0, -0.55 * u);
    g.lineTo(-0.25 * u, -1.2 * u);
    g.lineTo(0.25 * u, -1.2 * u);
    g.closePath();
    g.fillStyle = "#3a9a4a";
    g.fill();
    circ(g, 0, -1.22 * u, 0.1 * u, "#f5c03c");
    ell(g, 0, -0.5 * u, 0.66 * u, 0.12 * u, 0, "#f5c03c");
  }
  function drawAvatar(g, kind, x, y, R, opts = {}) {
    g.save();
    g.translate(x, y);
    g.beginPath();
    g.arc(0, 0, R, 0, P22);
    g.fillStyle = BG[kind] || "#eee";
    g.fill();
    g.save();
    g.beginPath();
    g.arc(0, 0, R * 0.96, 0, P22);
    g.clip();
    const u = R * 0.78;
    g.translate(0, R * 0.12);
    FACE[kind](g, u);
    accessory(g, ACC[kind], u, kind);
    g.restore();
    if (opts.dim) {
      g.beginPath();
      g.arc(0, 0, R, 0, P22);
      g.fillStyle = "rgba(40,30,20,.35)";
      g.fill();
    }
    g.lineWidth = R * 0.1;
    g.strokeStyle = opts.ring || "#fff6e3";
    g.beginPath();
    g.arc(0, 0, R, 0, P22);
    g.stroke();
    if (opts.cap) {
      g.translate(0, -R * 0.35);
      jesterCap(g, R * 0.75);
    }
    g.restore();
  }

  // src/scene.js
  var P23 = Math.PI * 2;
  function canvas(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }
  var hex = (h) => {
    const n = parseInt(h.slice(1), 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  };
  var mix = (a, b, t) => {
    const A = hex(a), B = hex(b);
    return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
  };
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function grain(ctx, x, y, w, h, { seed = 1, color = "#000", alpha = 0.12, dir = "h", density = 1, knots = true, scale = 1 } = {}) {
    const R = rng(seed);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const L = dir === "h" ? w : h;
    const T = dir === "h" ? h : w;
    const lines = Math.max(4, Math.round(T / (3.2 * scale) * density));
    const kx = [];
    if (knots && L > 120 * scale) {
      const nk = R() < 0.6 ? 1 : 0;
      for (let i = 0; i < nk; i++) kx.push([R() * L, R() * T, (6 + R() * 10) * scale]);
    }
    const ph1 = R() * 10, ph2 = R() * 10, f1 = (4e-3 + R() * 6e-3) / scale, f2 = (0.013 + R() * 0.01) / scale;
    for (let i = 0; i < lines; i++) {
      const base = (i + R() * 0.8) * (T / lines);
      const amp = (1.5 + R() * 3) * scale;
      ctx.beginPath();
      for (let s = 0; s <= L; s += 6 * scale) {
        let off = Math.sin(s * f1 + ph1 + i * 0.15) * amp * 1.6 + Math.sin(s * f2 + ph2 + i * 0.4) * amp * 0.5;
        for (const [kxp, kyp, kr] of kx) {
          const dx = s - kxp, dy = base - kyp;
          const d2 = dx * dx + dy * dy;
          const infl = Math.exp(-d2 / (kr * kr * 9)) * kr * 2.2;
          off += dy >= 0 ? infl : -infl;
        }
        const px = dir === "h" ? x + s : x + base + off;
        const py = dir === "h" ? y + base + off : y + s;
        s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha * (0.35 + R() * 0.9);
      ctx.lineWidth = (0.6 + R() * 1.4) * scale;
      ctx.stroke();
    }
    for (const [kxp, kyp, kr] of kx) {
      const cx = dir === "h" ? x + kxp : x + kyp;
      const cy = dir === "h" ? y + kyp : y + kxp;
      ctx.globalAlpha = alpha * 1.6;
      for (let r = kr; r > 1; r -= 2.2 * scale) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, dir === "h" ? r * 1.7 : r * 0.7, dir === "h" ? r * 0.7 : r * 1.7, 0, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1 * scale;
        ctx.stroke();
      }
      ctx.globalAlpha = alpha * 2.2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, dir === "h" ? kr * 0.5 : kr * 0.25, dir === "h" ? kr * 0.25 : kr * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();
  }
  function shadow(g, x, y, rx, ry, a = 0.32) {
    const gr = g.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    gr.addColorStop(0, `rgba(30,12,2,${a})`);
    gr.addColorStop(0.7, `rgba(30,12,2,${a * 0.5})`);
    gr.addColorStop(1, "rgba(30,12,2,0)");
    g.save();
    g.translate(x, y);
    g.scale(1, ry / rx);
    g.translate(-x, -y);
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, rx, 0, P23);
    g.fill();
    g.restore();
  }
  function doily(g, r) {
    g.save();
    g.fillStyle = "rgba(255,250,240,.92)";
    g.beginPath();
    for (let k = 0; k <= 48; k++) {
      const a = k / 48 * P23;
      const rr2 = r * (0.94 + 0.06 * Math.cos(a * 16));
      k ? g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2) : g.moveTo(rr2, 0);
    }
    g.fill();
    g.globalCompositeOperation = "destination-out";
    for (let ring = 0; ring < 3; ring++) {
      const rr2 = r * (0.55 + ring * 0.14);
      const n = 14 + ring * 6;
      for (let k = 0; k < n; k++) {
        const a = k / n * P23 + ring * 0.2;
        g.beginPath();
        g.arc(Math.cos(a) * rr2, Math.sin(a) * rr2, r * (0.035 + ring * 6e-3), 0, P23);
        g.fill();
      }
    }
    g.restore();
  }
  var DRAW = {
    cup(g, r) {
      shadow(g, r * 0.08, r * 0.12, r * 1.05, r * 1.05);
      doily(g, r * 1.02);
      g.beginPath();
      g.arc(0, 0, r * 0.78, 0, P23);
      g.fillStyle = "#fbf7f0";
      g.fill();
      g.strokeStyle = "#3f72b8";
      g.lineWidth = r * 0.05;
      g.stroke();
      g.beginPath();
      g.arc(0, 0, r * 0.7, 0, P23);
      g.strokeStyle = "rgba(63,114,184,.45)";
      g.lineWidth = r * 0.02;
      g.stroke();
      g.beginPath();
      g.ellipse(r * 0.58, r * 0.05, r * 0.16, r * 0.1, 0, 0, P23);
      g.strokeStyle = "#f4efe6";
      g.lineWidth = r * 0.08;
      g.stroke();
      shadow(g, r * 0.05, r * 0.07, r * 0.55, r * 0.55, 0.25);
      g.beginPath();
      g.arc(0, 0, r * 0.5, 0, P23);
      g.fillStyle = "#ffffff";
      g.fill();
      g.strokeStyle = "#d9cfc0";
      g.lineWidth = r * 0.02;
      g.stroke();
      g.fillStyle = "#e0574c";
      for (let k = 0; k < 12; k++) {
        const a = k / 12 * P23;
        g.beginPath();
        g.arc(Math.cos(a) * r * 0.455, Math.sin(a) * r * 0.455, r * 0.025, 0, P23);
        g.fill();
      }
      const tea = g.createRadialGradient(-r * 0.1, -r * 0.1, 0, 0, 0, r * 0.42);
      tea.addColorStop(0, "#c9762a");
      tea.addColorStop(1, "#7a3a12");
      g.beginPath();
      g.arc(0, 0, r * 0.41, 0, P23);
      g.fillStyle = tea;
      g.fill();
      g.save();
      g.translate(r * 0.1, r * 0.08);
      g.beginPath();
      g.arc(0, 0, r * 0.16, 0, P23);
      g.fillStyle = "#f6e27a";
      g.fill();
      g.strokeStyle = "#e8c23a";
      g.lineWidth = r * 0.03;
      g.stroke();
      g.strokeStyle = "rgba(255,255,255,.7)";
      g.lineWidth = r * 0.015;
      for (let k = 0; k < 8; k++) {
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(Math.cos(k / 8 * P23) * r * 0.13, Math.sin(k / 8 * P23) * r * 0.13);
        g.stroke();
      }
      g.restore();
      g.beginPath();
      g.ellipse(-r * 0.2, -r * 0.18, r * 0.1, r * 0.04, -0.7, 0, P23);
      g.fillStyle = "rgba(255,255,255,.35)";
      g.fill();
      g.save();
      g.rotate(0.6);
      g.fillStyle = "#c9ced6";
      roundRect(g, r * 0.62, -r * 0.035, r * 0.42, r * 0.07, r * 0.03);
      g.fill();
      g.beginPath();
      g.ellipse(r * 0.6, 0, r * 0.1, r * 0.07, 0, 0, P23);
      g.fill();
      g.restore();
    },
    glasses(g, r) {
      g.rotate(-0.35);
      shadow(g, r * 0.06, r * 0.1, r * 1, r * 0.55, 0.22);
      const lens = (x) => {
        g.beginPath();
        g.ellipse(x, 0, r * 0.4, r * 0.34, 0, 0, P23);
        g.fillStyle = "rgba(210,235,255,.28)";
        g.fill();
        g.strokeStyle = "#a8792e";
        g.lineWidth = r * 0.06;
        g.stroke();
        g.beginPath();
        g.ellipse(x - r * 0.12, -r * 0.1, r * 0.14, r * 0.06, -0.5, 0, P23);
        g.fillStyle = "rgba(255,255,255,.55)";
        g.fill();
      };
      lens(-r * 0.47);
      lens(r * 0.47);
      g.beginPath();
      g.moveTo(-r * 0.08, -r * 0.05);
      g.quadraticCurveTo(0, -r * 0.16, r * 0.08, -r * 0.05);
      g.strokeStyle = "#a8792e";
      g.lineWidth = r * 0.05;
      g.stroke();
      g.beginPath();
      g.moveTo(-r * 0.85, -r * 0.1);
      g.lineTo(-r * 0.2, -r * 0.42);
      g.moveTo(r * 0.85, -r * 0.1);
      g.lineTo(r * 0.2, -r * 0.42);
      g.lineWidth = r * 0.045;
      g.stroke();
    },
    book(g, r) {
      g.rotate(0.12);
      const w = r * 1, h = r * 0.68;
      shadow(g, r * 0.08, r * 0.12, r * 1.1, r * 0.8, 0.3);
      g.fillStyle = "#7a2e2a";
      roundRect(g, -w - r * 0.05, -h - r * 0.04, w * 2 + r * 0.1, h * 2 + r * 0.1, r * 0.06);
      g.fill();
      const page = (sx) => {
        g.beginPath();
        g.moveTo(0, -h + r * 0.03);
        g.quadraticCurveTo(sx * w * 0.5, -h - r * 0.04, sx * w * 0.98, -h + r * 0.02);
        g.lineTo(sx * w * 0.98, h - r * 0.02);
        g.quadraticCurveTo(sx * w * 0.5, h - r * 0.08, 0, h - r * 0.02);
        g.closePath();
        const gr = g.createLinearGradient(0, 0, sx * w, 0);
        gr.addColorStop(0, "#d9ccb0");
        gr.addColorStop(0.15, "#f7f0df");
        gr.addColorStop(1, "#fbf6ea");
        g.fillStyle = gr;
        g.fill();
        g.strokeStyle = "rgba(90,60,30,.25)";
        g.lineWidth = r * 0.012;
        for (let k = 0; k < 11; k++) {
          const y = -h + r * 0.22 + k * h * 0.165;
          const len = k === 10 ? 0.45 : 0.78 - k * 7 % 4 * 0.04;
          g.beginPath();
          g.moveTo(sx * w * 0.14, y);
          g.lineTo(sx * w * (0.14 + len * 0.76), y);
          g.lineWidth = r * 0.035;
          g.strokeStyle = "rgba(70,50,30,.22)";
          g.stroke();
        }
      };
      page(-1);
      page(1);
      g.fillStyle = "#c9a23a";
      g.beginPath();
      g.moveTo(-r * 0.04, -h);
      g.lineTo(r * 0.06, -h);
      g.lineTo(r * 0.06, h + r * 0.35);
      g.lineTo(r * 0.01, h + r * 0.28);
      g.lineTo(-r * 0.04, h + r * 0.35);
      g.closePath();
      g.fill();
    },
    yarn(g, r) {
      shadow(g, r * 0.08, r * 0.1, r * 0.8, r * 0.8);
      const R = rng(4);
      g.beginPath();
      g.arc(0, 0, r * 0.62, 0, P23);
      const gr = g.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * 0.62);
      gr.addColorStop(0, "#f4a9b8");
      gr.addColorStop(1, "#c95f78");
      g.fillStyle = gr;
      g.fill();
      g.save();
      g.clip();
      g.strokeStyle = "rgba(120,30,50,.35)";
      g.lineWidth = r * 0.03;
      for (let k = 0; k < 18; k++) {
        g.beginPath();
        const a = R() * P23;
        g.ellipse(0, 0, r * (0.3 + R() * 0.5), r * (0.1 + R() * 0.25), a, 0, P23);
        g.stroke();
      }
      g.restore();
      g.beginPath();
      g.moveTo(r * 0.5, r * 0.35);
      g.bezierCurveTo(r * 1, r * 0.9, r * 0.3, r * 1.1, r * 0.9, r * 1.35);
      g.strokeStyle = "#d97a8f";
      g.lineWidth = r * 0.04;
      g.stroke();
      g.strokeStyle = "#c0c6cf";
      g.lineWidth = r * 0.06;
      g.beginPath();
      g.moveTo(-r * 0.9, r * 0.9);
      g.lineTo(r * 0.7, -r * 0.95);
      g.moveTo(-r * 0.8, -r * 0.6);
      g.lineTo(r * 0.95, r * 0.5);
      g.stroke();
      g.fillStyle = "#5a7fc0";
      [[-0.9, 0.9], [-0.8, -0.6]].forEach(([x, y]) => {
        g.beginPath();
        g.arc(x * r, y * r, r * 0.08, 0, P23);
        g.fill();
      });
    },
    plate(g, r, season) {
      shadow(g, r * 0.08, r * 0.1, r * 0.95, r * 0.95);
      g.beginPath();
      g.arc(0, 0, r * 0.85, 0, P23);
      g.fillStyle = "#fbf8f2";
      g.fill();
      g.strokeStyle = "#3f72b8";
      g.lineWidth = r * 0.03;
      g.stroke();
      g.beginPath();
      g.arc(0, 0, r * 0.62, 0, P23);
      g.strokeStyle = "rgba(200,190,175,.6)";
      g.lineWidth = r * 0.02;
      g.stroke();
      for (let k = 0; k < 16; k++) {
        const a = k / 16 * P23;
        g.beginPath();
        g.ellipse(Math.cos(a) * r * 0.74, Math.sin(a) * r * 0.74, r * 0.05, r * 0.025, a, 0, P23);
        g.fillStyle = "#3f72b8";
        g.fill();
      }
      const R = rng(11);
      const spots = [[-0.25, -0.15], [0.22, -0.2], [0, 0.25], [-0.05, -0.05]];
      spots.slice(0, 3).forEach(([x, y], i) => {
        g.save();
        g.translate(x * r, y * r);
        g.rotate(R() * P23);
        if (season === "winter") {
          g.beginPath();
          for (let k = 0; k < 10; k++) {
            const a = k / 10 * P23, rr2 = (k % 2 ? 0.13 : 0.27) * r;
            k ? g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2) : g.moveTo(rr2, 0);
          }
          g.closePath();
          g.fillStyle = "#b5743a";
          g.fill();
          g.strokeStyle = "#fff";
          g.lineWidth = r * 0.02;
          g.stroke();
        } else {
          g.beginPath();
          g.arc(0, 0, r * 0.25, 0, P23);
          g.fillStyle = "#d9a35a";
          g.fill();
          g.strokeStyle = "#b8803a";
          g.lineWidth = r * 0.02;
          g.stroke();
          g.fillStyle = "#5a3216";
          for (let k = 0; k < 5; k++) {
            g.beginPath();
            g.arc((R() - 0.5) * r * 0.3, (R() - 0.5) * r * 0.3, r * 0.035, 0, P23);
            g.fill();
          }
        }
        g.restore();
      });
    },
    candle(g, r) {
      shadow(g, r * 0.06, r * 0.08, r * 0.95, r * 0.95, 0.25);
      g.beginPath();
      g.arc(0, 0, r * 0.8, 0, P23);
      const br = g.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r * 0.8);
      br.addColorStop(0, "#f1d37a");
      br.addColorStop(1, "#a8792e");
      g.fillStyle = br;
      g.fill();
      g.beginPath();
      g.arc(0, 0, r * 0.42, 0, P23);
      g.fillStyle = "#f8efd8";
      g.fill();
      g.strokeStyle = "#e6d6b2";
      g.lineWidth = r * 0.04;
      g.stroke();
      g.beginPath();
      g.ellipse(r * 0.85, 0, r * 0.2, r * 0.13, 0, 0, P23);
      g.strokeStyle = "#b8893a";
      g.lineWidth = r * 0.07;
      g.stroke();
    },
    flowers(g, r, season) {
      shadow(g, r * 0.08, r * 0.1, r * 1, r * 1, 0.25);
      const R = rng(21);
      const leaves = season === "winter" ? "#2f6a3a" : "#4f8f3a";
      for (let k = 0; k < 9; k++) {
        const a = R() * P23, d = r * (0.35 + R() * 0.5);
        g.save();
        g.rotate(a);
        g.beginPath();
        g.ellipse(d * 0.6, 0, r * 0.38, r * 0.11, 0, 0, P23);
        g.fillStyle = mix(leaves, "#1d3a18", R() * 0.4);
        g.fill();
        g.restore();
      }
      const pal = { autumn: ["#f0a030", "#c95a2a", "#8b5bb0", "#f2c94c"], winter: ["#c4122a", "#c4122a", "#f2f2f2", "#d9a019"], spring: ["#ec6f9a", "#f7d24a", "#ffffff", "#b38fe0"], summer: ["#ffffff", "#4f8fd6", "#ffffff", "#f2c94c"] }[season] || ["#ec6f9a", "#ffffff"];
      const pos = [[0, 0], [0.42, -0.2], [-0.4, -0.25], [0.15, 0.45], [-0.3, 0.38], [0.5, 0.3], [-0.1, -0.5]];
      pos.forEach(([x, y], i) => {
        const c = pal[i % pal.length];
        const pr = r * (0.2 + R() * 0.07);
        g.save();
        g.translate(x * r, y * r);
        if (season === "winter") {
          if (i % 3 === 2) {
            g.beginPath();
            g.ellipse(0, 0, pr * 0.9, pr * 0.55, R() * 3, 0, P23);
            g.fillStyle = "#7a4a22";
            g.fill();
          } else for (let b = 0; b < 4; b++) {
            g.beginPath();
            g.arc((R() - 0.5) * pr, (R() - 0.5) * pr, pr * 0.32, 0, P23);
            g.fillStyle = c;
            g.fill();
          }
        } else {
          for (let p = 0; p < 8; p++) {
            g.rotate(P23 / 8);
            g.beginPath();
            g.ellipse(pr * 0.6, 0, pr * 0.55, pr * 0.28, 0, 0, P23);
            g.fillStyle = c;
            g.fill();
            g.strokeStyle = "rgba(0,0,0,.12)";
            g.lineWidth = 1;
            g.stroke();
          }
          g.beginPath();
          g.arc(0, 0, pr * 0.32, 0, P23);
          g.fillStyle = c === "#f7d24a" || c === "#f2c94c" ? "#8a4a1a" : "#f2b81a";
          g.fill();
        }
        g.restore();
      });
    },
    watch(g, r) {
      shadow(g, r * 0.06, r * 0.08, r * 0.8, r * 0.8, 0.28);
      g.strokeStyle = "#c9a23a";
      g.lineWidth = r * 0.05;
      for (let k = 0; k < 9; k++) {
        g.beginPath();
        g.ellipse(r * 0.1 + k * r * 0.11, -r * 0.75 - Math.sin(k * 0.5) * r * 0.25, r * 0.06, r * 0.035, 0.4, 0, P23);
        g.stroke();
      }
      g.beginPath();
      g.arc(0, 0, r * 0.68, 0, P23);
      const gr = g.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * 0.68);
      gr.addColorStop(0, "#f6dc86");
      gr.addColorStop(1, "#a8792e");
      g.fillStyle = gr;
      g.fill();
      g.beginPath();
      g.arc(0, -r * 0.72, r * 0.1, 0, P23);
      g.fill();
      g.beginPath();
      g.arc(0, 0, r * 0.56, 0, P23);
      g.fillStyle = "#fffaf0";
      g.fill();
      g.fillStyle = "#3a2a1a";
      for (let k = 0; k < 12; k++) {
        const a = k / 12 * P23;
        g.beginPath();
        g.arc(Math.cos(a) * r * 0.46, Math.sin(a) * r * 0.46, r * (k % 3 ? 0.02 : 0.04), 0, P23);
        g.fill();
      }
    },
    cat(g, r) {
      shadow(g, r * 0.08, r * 0.12, r * 1, r * 0.85, 0.3);
      const fur = "#e8954a", dark = "#b8652a", light = "#fbe3c4";
      g.beginPath();
      g.arc(0, r * 0.05, r * 0.78, 0.2, 2.6);
      g.strokeStyle = fur;
      g.lineWidth = r * 0.22;
      g.stroke();
      g.beginPath();
      g.arc(Math.cos(2.6) * r * 0.78, r * 0.05 + Math.sin(2.6) * r * 0.78, r * 0.11, 0, P23);
      g.fillStyle = light;
      g.fill();
      g.beginPath();
      g.ellipse(0, 0, r * 0.75, r * 0.62, 0, 0, P23);
      const gr = g.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * 0.75);
      gr.addColorStop(0, "#f3ad66");
      gr.addColorStop(1, fur);
      g.fillStyle = gr;
      g.fill();
      g.strokeStyle = dark;
      g.lineWidth = r * 0.07;
      g.lineCap = "round";
      for (let k = 0; k < 5; k++) {
        const a = -0.6 + k * 0.32;
        g.beginPath();
        g.arc(r * 0.05, r * 0.05, r * (0.45 + k % 2 * 0.08), a - 0.18, a + 0.18);
        g.stroke();
      }
      const hx = -r * 0.35, hy = -r * 0.12;
      g.fillStyle = fur;
      [[-1, -0.95], [1, -0.55]].forEach(([s, a]) => {
        g.save();
        g.translate(hx, hy);
        g.rotate(a);
        g.beginPath();
        g.moveTo(-r * 0.12, -r * 0.24);
        g.lineTo(0, -r * 0.45);
        g.lineTo(r * 0.12, -r * 0.24);
        g.closePath();
        g.fill();
        g.fillStyle = "#f2b8a0";
        g.beginPath();
        g.moveTo(-r * 0.06, -r * 0.27);
        g.lineTo(0, -r * 0.38);
        g.lineTo(r * 0.06, -r * 0.27);
        g.closePath();
        g.fill();
        g.fillStyle = fur;
        g.restore();
      });
      g.beginPath();
      g.ellipse(hx, hy, r * 0.32, r * 0.28, -0.6, 0, P23);
      g.fillStyle = "#f0a55c";
      g.fill();
      g.beginPath();
      g.ellipse(hx + r * 0.06, hy + r * 0.1, r * 0.15, r * 0.1, -0.6, 0, P23);
      g.fillStyle = light;
      g.fill();
      g.strokeStyle = "#5a2e14";
      g.lineWidth = r * 0.035;
      [[-0.12, -0.04], [0.06, -0.15]].forEach(([dx, dy]) => {
        g.beginPath();
        g.arc(hx + dx * r, hy + dy * r, r * 0.06, 0.2, Math.PI - 0.2);
        g.stroke();
      });
      g.beginPath();
      g.arc(hx + r * 0.02, hy + r * 0.04, r * 0.025, 0, P23);
      g.fillStyle = "#d0706a";
      g.fill();
      g.fillStyle = light;
      [[-0.05, 0.42], [0.12, 0.45]].forEach(([x, y]) => {
        g.beginPath();
        g.ellipse(x * r, y * r, r * 0.1, r * 0.07, 0, 0, P23);
        g.fill();
      });
    },
    jam(g, r) {
      shadow(g, r * 0.06, r * 0.08, r * 0.85, r * 0.85, 0.28);
      g.save();
      g.beginPath();
      for (let k = 0; k <= 24; k++) {
        const a = k / 24 * P23;
        const rr2 = r * (0.82 + k % 2 * 0.06);
        k ? g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2) : g.moveTo(rr2, 0);
      }
      g.closePath();
      g.fillStyle = "#fff";
      g.fill();
      g.clip();
      g.fillStyle = "rgba(214,58,48,.55)";
      for (let k = -6; k <= 6; k++) {
        g.fillRect(k * r * 0.16 - r * 0.04, -r, r * 0.08, r * 2);
        g.fillRect(-r, k * r * 0.16 - r * 0.04, r * 2, r * 0.08);
      }
      g.restore();
      g.beginPath();
      g.arc(0, 0, r * 0.55, 0, P23);
      g.strokeStyle = "#c9a23a";
      g.lineWidth = r * 0.08;
      g.stroke();
      g.beginPath();
      g.ellipse(r * 0.45, -r * 0.4, r * 0.18, r * 0.08, -0.8, 0, P23);
      g.ellipse(r * 0.6, -r * 0.25, r * 0.18, r * 0.08, 0.6, 0, P23);
      g.fillStyle = "#c9a23a";
      g.fill();
    },
    teapot(g, r) {
      shadow(g, r * 0.08, r * 0.1, r * 1, r * 0.95, 0.3);
      g.fillStyle = "#f6f2ea";
      g.beginPath();
      g.moveTo(r * 0.5, -r * 0.12);
      g.lineTo(r * 1.05, -r * 0.3);
      g.lineTo(r * 1.1, -r * 0.16);
      g.lineTo(r * 0.55, r * 0.15);
      g.closePath();
      g.fill();
      g.strokeStyle = "#3f72b8";
      g.lineWidth = r * 0.03;
      g.stroke();
      g.beginPath();
      g.ellipse(-r * 0.78, 0, r * 0.22, r * 0.3, 0, 0, P23);
      g.strokeStyle = "#f6f2ea";
      g.lineWidth = r * 0.1;
      g.stroke();
      g.beginPath();
      g.arc(0, 0, r * 0.68, 0, P23);
      const gr = g.createRadialGradient(-r * 0.25, -r * 0.25, 0, 0, 0, r * 0.68);
      gr.addColorStop(0, "#ffffff");
      gr.addColorStop(1, "#e2dcd0");
      g.fillStyle = gr;
      g.fill();
      g.fillStyle = "#2f5fae";
      for (let k = 0; k < 6; k++) {
        g.save();
        g.rotate(k / 6 * P23);
        g.beginPath();
        g.ellipse(r * 0.47, 0, r * 0.1, r * 0.05, 0, 0, P23);
        g.fill();
        g.restore();
      }
      g.beginPath();
      g.arc(0, 0, r * 0.3, 0, P23);
      g.fillStyle = "#f6f2ea";
      g.fill();
      g.strokeStyle = "#2f5fae";
      g.lineWidth = r * 0.04;
      g.stroke();
      g.beginPath();
      g.arc(0, 0, r * 0.1, 0, P23);
      g.fillStyle = "#2f5fae";
      g.fill();
    }
  };
  Object.assign(DRAW, {
    // миска вишни
    cherries(g, r) {
      shadow(g, r * 0.08, r * 0.1, r * 0.95, r * 0.95, 0.3);
      g.beginPath();
      g.arc(0, 0, r * 0.82, 0, P23);
      const bw = g.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r * 0.82);
      bw.addColorStop(0, "#ffffff");
      bw.addColorStop(1, "#dcd6ca");
      g.fillStyle = bw;
      g.fill();
      g.strokeStyle = "#c2462e";
      g.lineWidth = r * 0.05;
      g.beginPath();
      g.arc(0, 0, r * 0.74, 0, P23);
      g.stroke();
      const R = rng(31);
      const pts = [];
      for (let k = 0; k < 16; k++) {
        const a = R() * P23, d = Math.sqrt(R()) * r * 0.5;
        pts.push([Math.cos(a) * d, Math.sin(a) * d]);
      }
      pts.sort((a, b) => a[1] - b[1]);
      for (const [x, y] of pts) {
        g.beginPath();
        g.arc(x, y, r * 0.15, 0, P23);
        const cg = g.createRadialGradient(x - r * 0.05, y - r * 0.05, 0, x, y, r * 0.15);
        cg.addColorStop(0, "#e2364a");
        cg.addColorStop(1, "#7a0f1e");
        g.fillStyle = cg;
        g.fill();
        g.fillStyle = "rgba(255,255,255,.55)";
        g.beginPath();
        g.arc(x - r * 0.05, y - r * 0.05, r * 0.035, 0, P23);
        g.fill();
      }
      g.strokeStyle = "#4f7a2a";
      g.lineWidth = r * 0.03;
      g.lineCap = "round";
      for (const [x, y] of pts.slice(-5)) {
        g.beginPath();
        g.moveTo(x, y - r * 0.08);
        g.quadraticCurveTo(x + r * 0.1, y - r * 0.3, x + r * 0.22, y - r * 0.32);
        g.stroke();
      }
      for (const [x, y] of [[r * 0.95, r * 0.55], [r * 1.12, r * 0.42]]) {
        shadow(g, x + 2, y + 3, r * 0.17, r * 0.17, 0.3);
        g.beginPath();
        g.arc(x, y, r * 0.14, 0, P23);
        g.fillStyle = "#b81d30";
        g.fill();
      }
    },
    // яблоки
    apples(g, r) {
      const R = rng(41);
      [[-0.38, -0.15, "#d84a2a"], [0.35, -0.25, "#9cc33a"], [0, 0.35, "#e8b02a"]].forEach(([x, y, c]) => {
        g.save();
        g.translate(x * r, y * r);
        shadow(g, 4, 6, r * 0.45, r * 0.45, 0.3);
        g.beginPath();
        g.arc(0, 0, r * 0.4, 0, P23);
        const ag = g.createRadialGradient(-r * 0.12, -r * 0.12, 0, 0, 0, r * 0.4);
        ag.addColorStop(0, mix(c, "#ffffff", 0.35));
        ag.addColorStop(1, mix(c, "#3a1a08", 0.25));
        g.fillStyle = ag;
        g.fill();
        g.fillStyle = "rgba(255,255,255,.35)";
        g.beginPath();
        g.ellipse(-r * 0.15, -r * 0.15, r * 0.1, r * 0.06, -0.7, 0, P23);
        g.fill();
        g.strokeStyle = "#5a3a1a";
        g.lineWidth = r * 0.04;
        g.beginPath();
        g.moveTo(0, -r * 0.02);
        g.lineTo(r * 0.06, -r * 0.14);
        g.stroke();
        g.beginPath();
        g.ellipse(r * 0.16, -r * 0.16, r * 0.12, r * 0.05, -0.5 + R(), 0, P23);
        g.fillStyle = "#4f8f3a";
        g.fill();
        g.restore();
      });
    },
    // блокнот со счётом партий
    notepad(g, r) {
      g.rotate(0.12);
      const w = r * 0.72, h = r * 0.95;
      shadow(g, r * 0.08, r * 0.1, r * 0.95, r * 1.05, 0.26);
      g.fillStyle = "#fbf7ea";
      g.fillRect(-w, -h, w * 2, h * 2);
      g.strokeStyle = "rgba(80,120,190,.35)";
      g.lineWidth = Math.max(1, r * 0.012);
      for (let y = -h + r * 0.3; y < h; y += r * 0.17) {
        g.beginPath();
        g.moveTo(-w, y);
        g.lineTo(w, y);
        g.stroke();
      }
      g.strokeStyle = "rgba(210,70,70,.5)";
      g.beginPath();
      g.moveTo(-w + r * 0.25, -h);
      g.lineTo(-w + r * 0.25, h);
      g.stroke();
      g.fillStyle = "#7a7f8a";
      for (let x = -w + r * 0.12; x < w; x += r * 0.16) {
        g.beginPath();
        g.arc(x, -h, r * 0.04, 0, P23);
        g.fill();
      }
      g.strokeStyle = "#2a3a6a";
      g.lineWidth = r * 0.03;
      g.lineCap = "round";
      const R = rng(9);
      for (let row = 0; row < 3; row++) {
        const y = -h + r * 0.3 + (row + 1) * r * 0.34;
        const n = [4, 2, 3][row];
        for (let k = 0; k < n; k++) {
          const x = -w + r * 0.45 + k * r * 0.13;
          g.beginPath();
          g.moveTo(x + (R() - 0.5) * 2, y - r * 0.12);
          g.lineTo(x + (R() - 0.5) * 2, y + r * 0.02);
          g.stroke();
        }
      }
      g.save();
      g.translate(r * 0.25, h * 0.7);
      g.rotate(-0.5);
      g.fillStyle = "#3a8a4a";
      g.fillRect(-r * 0.7, -r * 0.06, r * 1.2, r * 0.12);
      g.fillStyle = "#e8b48a";
      g.beginPath();
      g.moveTo(r * 0.5, -r * 0.06);
      g.lineTo(r * 0.72, 0);
      g.lineTo(r * 0.5, r * 0.06);
      g.fill();
      g.restore();
    },
    // сушки на тарелочке
    sushki(g, r) {
      shadow(g, r * 0.08, r * 0.1, r * 0.95, r * 0.95, 0.3);
      g.beginPath();
      g.arc(0, 0, r * 0.86, 0, P23);
      g.fillStyle = "#f9f4ea";
      g.fill();
      g.strokeStyle = "#c9a23a";
      g.lineWidth = r * 0.04;
      g.stroke();
      const R = rng(17);
      [[-0.28, -0.22], [0.27, -0.18], [0.02, 0.28], [-0.32, 0.25], [0.35, 0.28]].forEach(([x, y]) => {
        g.save();
        g.translate(x * r, y * r);
        g.beginPath();
        g.arc(0, 0, r * 0.26, 0, P23);
        g.arc(0, 0, r * 0.1, 0, P23, true);
        const sg = g.createRadialGradient(-r * 0.06, -r * 0.06, r * 0.05, 0, 0, r * 0.26);
        sg.addColorStop(0, "#f2c27a");
        sg.addColorStop(1, "#b8742e");
        g.fillStyle = sg;
        g.fill("evenodd");
        g.fillStyle = "#5a3216";
        for (let k = 0; k < 6; k++) {
          const a = R() * P23;
          g.beginPath();
          g.arc(Math.cos(a) * r * 0.18, Math.sin(a) * r * 0.18, r * 0.02, 0, P23);
          g.fill();
        }
        g.restore();
      });
    }
  });
  function floor(g, W, H) {
    g.fillStyle = "#2c3a33";
    g.fillRect(0, 0, W, H);
    const bw = Math.max(46, Math.min(90, Math.min(W, H) / 7));
    const R = rng(3);
    for (let x = -R() * bw, col = 0; x < W; x += bw, col++) {
      let y = -R() * 400;
      while (y < H) {
        const len = 500 + R() * 600;
        const paint = mix("#7fae9c", R() < 0.5 ? "#5f8f80" : "#9cc4b2", R() * 0.5);
        g.fillStyle = paint;
        roundRect(g, x + 1.5, y + 1.5, bw - 3, len - 3, 3);
        g.fill();
        for (let k = 0; k < 5; k++) {
          const px = x + 4 + R() * (bw - 10), py = y + R() * len;
          g.fillStyle = "rgba(160,110,60,.55)";
          g.beginPath();
          g.ellipse(px, py, 2 + R() * bw * 0.12, 4 + R() * 26, 0, 0, P23);
          g.fill();
        }
        grain(g, x + 1.5, y + 1.5, bw - 3, len - 3, { seed: col * 17 + Math.round(y), color: "#20322a", alpha: 0.18, dir: "v", density: 0.5, scale: 1.2 });
        g.fillStyle = "rgba(30,40,35,.6)";
        for (const ny of [y + 12, y + len - 14]) {
          g.beginPath();
          g.arc(x + bw * 0.3, ny, 2.2, 0, P23);
          g.arc(x + bw * 0.7, ny, 2.2, 0, P23);
          g.fill();
        }
        y += len;
      }
    }
  }
  function tableTop(g, x, y, w, h, dark) {
    const tone = dark ? "#6a3a1c" : "#a8693a";
    g.save();
    roundRect(g, x, y, w, h, 24);
    g.clip();
    const ph = 90;
    const R = rng(13);
    for (let yy = y, row = 0; yy < y + h; yy += ph, row++) {
      const c = mix(tone, R() < 0.5 ? "#5a2f12" : "#c48a50", R() * 0.3);
      const gr = g.createLinearGradient(0, yy, 0, yy + ph);
      gr.addColorStop(0, mix(c, "#ffffff", 0.08));
      gr.addColorStop(1, mix(c, "#2a1406", 0.15));
      g.fillStyle = gr;
      g.fillRect(x, yy, w, ph - 2);
      grain(g, x, yy, w, ph - 2, { seed: row * 7 + 3, color: "#3c1e0a", alpha: 0.2, dir: "h", density: 0.7, scale: 1.4 });
      g.fillStyle = "rgba(30,12,2,.35)";
      g.fillRect(x, yy + ph - 2, w, 2);
    }
    g.restore();
  }
  function cloth(g, id, x, y, w, h) {
    const R = rng(77);
    g.save();
    roundRect(g, x, y, w, h, 18);
    g.clip();
    if (id === "felt") {
      const gr = g.createRadialGradient(x + w / 2, y + h * 0.45, 0, x + w / 2, y + h / 2, Math.hypot(w, h) * 0.6);
      gr.addColorStop(0, "#3f8f5a");
      gr.addColorStop(1, "#22603a");
      g.fillStyle = gr;
      g.fillRect(x, y, w, h);
      for (let k = 0; k < w * h / 60; k++) {
        g.fillStyle = R() < 0.5 ? "rgba(255,255,255,.035)" : "rgba(0,0,0,.05)";
        g.fillRect(x + R() * w, y + R() * h, 1.5, 1.5);
      }
      g.strokeStyle = "rgba(240,210,120,.55)";
      g.lineWidth = 3;
      roundRect(g, x + 22, y + 22, w - 44, h - 44, 14);
      g.stroke();
      g.lineWidth = 1.2;
      roundRect(g, x + 30, y + 30, w - 60, h - 60, 10);
      g.stroke();
    } else if (id === "check") {
      g.fillStyle = "#fbf6ee";
      g.fillRect(x, y, w, h);
      const s = 44;
      g.fillStyle = "rgba(200,40,46,.42)";
      for (let xx = x; xx < x + w; xx += s * 2) g.fillRect(xx, y, s, h);
      for (let yy = y; yy < y + h; yy += s * 2) g.fillRect(x, yy, w, s);
      g.fillStyle = "rgba(255,255,255,.12)";
      for (let k = 0; k < w * h / 900; k++) g.fillRect(x + R() * w, y + R() * h, 2, 1);
    } else if (id === "lemon") {
      g.fillStyle = "#cfe6f2";
      g.fillRect(x, y, w, h);
      const s = 120;
      for (let yy = y - s, row = 0; yy < y + h + s; yy += s * 0.75, row++) {
        for (let xx = x - s + row % 2 * s * 0.5; xx < x + w + s; xx += s) {
          g.save();
          g.translate(xx, yy);
          g.rotate(-0.5 + R() * 0.3);
          g.beginPath();
          g.ellipse(0, 0, 22, 15, 0, 0, P23);
          g.fillStyle = "#f6d84a";
          g.fill();
          g.beginPath();
          g.ellipse(-22, 0, 4, 3, 0, 0, P23);
          g.ellipse(22, 0, 4, 3, 0, 0, P23);
          g.fill();
          g.beginPath();
          g.ellipse(4, -16, 12, 5, -0.4, 0, P23);
          g.fillStyle = "#5a9a3a";
          g.fill();
          g.restore();
          g.fillStyle = "rgba(255,255,255,.85)";
          const fx = xx + s * 0.5, fy = yy + s * 0.32;
          for (let k = 0; k < 5; k++) {
            g.beginPath();
            g.arc(fx + Math.cos(k / 5 * P23) * 6, fy + Math.sin(k / 5 * P23) * 6, 4.5, 0, P23);
            g.fill();
          }
          g.fillStyle = "#f2b13a";
          g.beginPath();
          g.arc(fx, fy, 3, 0, P23);
          g.fill();
        }
      }
      g.fillStyle = "rgba(255,255,255,.08)";
      g.fillRect(x, y, w, h * 0.4);
    } else if (id === "lace") {
      g.fillStyle = "#f3ead6";
      g.fillRect(x, y, w, h);
      for (let k = 0; k < w * h / 400; k++) {
        g.fillStyle = "rgba(150,120,80,.06)";
        g.fillRect(x + R() * w, y + R() * h, 3, 1);
      }
      g.strokeStyle = "rgba(255,255,255,.95)";
      g.fillStyle = "rgba(255,255,255,.9)";
      const band = 46;
      for (const [ax, ay, bx, by] of [[x, y, x + w, y], [x, y + h, x + w, y + h], [x, y, x, y + h], [x + w, y, x + w, y + h]]) {
        const L = Math.hypot(bx - ax, by - ay), n = Math.floor(L / 34);
        for (let k = 0; k <= n; k++) {
          const px = ax + (bx - ax) * k / n, py = ay + (by - ay) * k / n;
          g.beginPath();
          g.arc(px, py, band * 0.55, 0, P23);
          g.fill();
        }
      }
      g.globalCompositeOperation = "destination-out";
      for (const [ax, ay, bx, by] of [[x, y, x + w, y], [x, y + h, x + w, y + h], [x, y, x, y + h], [x + w, y, x + w, y + h]]) {
        const L = Math.hypot(bx - ax, by - ay), n = Math.floor(L / 34);
        for (let k = 0; k <= n; k++) {
          const px = ax + (bx - ax) * k / n, py = ay + (by - ay) * k / n;
          g.beginPath();
          g.arc(px, py, 7, 0, P23);
          g.fill();
          for (let q = 0; q < 6; q++) {
            g.beginPath();
            g.arc(px + Math.cos(q / 6 * P23) * 16, py + Math.sin(q / 6 * P23) * 16, 3, 0, P23);
            g.fill();
          }
        }
      }
      g.globalCompositeOperation = "source-over";
      g.save();
      g.translate(x + w / 2, y + h * 0.45);
      doily(g, Math.min(w, h) * 0.22);
      g.restore();
    } else if (id === "walnut") {
      tableTop(g, x, y, w, h, true);
      g.fillStyle = "rgba(255,220,170,.06)";
      g.fillRect(x, y, w, h * 0.5);
    } else {
      const gr = g.createRadialGradient(x + w / 2, y + h * 0.45, 0, x + w / 2, y + h / 2, Math.hypot(w, h) * 0.6);
      gr.addColorStop(0, "#9a2a3a");
      gr.addColorStop(1, "#5a1220");
      g.fillStyle = gr;
      g.fillRect(x, y, w, h);
      for (let k = 0; k < w * h / 60; k++) {
        g.fillStyle = R() < 0.5 ? "rgba(255,200,200,.03)" : "rgba(0,0,0,.06)";
        g.fillRect(x + R() * w, y + R() * h, 1.5, 1.5);
      }
      g.strokeStyle = "rgba(232,177,58,.8)";
      g.lineWidth = 3;
      roundRect(g, x + 20, y + 20, w - 40, h - 40, 14);
      g.stroke();
      g.fillStyle = "rgba(232,177,58,.8)";
      for (const [cx, cy] of [[x + 20, y + 20], [x + w - 20, y + 20], [x + 20, y + h - 20], [x + w - 20, y + h - 20]]) {
        for (let k = 0; k < 4; k++) {
          g.beginPath();
          g.ellipse(cx + Math.cos(k / 4 * P23) * 10, cy + Math.sin(k / 4 * P23) * 10, 8, 4, k / 4 * P23, 0, P23);
          g.fill();
        }
      }
    }
    g.restore();
    if (id !== "walnut") {
      g.strokeStyle = "rgba(0,0,0,.22)";
      g.lineWidth = 2;
      roundRect(g, x, y, w, h, 18);
      g.stroke();
    }
  }
  var DECOR_ORDER = ["cup", "cherries", "sushki", "notepad", "jam", "teapot", "apples", "flowers", "glasses", "cat"];
  var DECOR_R = { cup: 1, cherries: 1, sushki: 0.95, notepad: 1.05, jam: 0.75, teapot: 1.05, apples: 0.95, flowers: 1, glasses: 0.85, cat: 1.35 };
  function buildScene(W, H, dpr, clothId, L) {
    const c = canvas(W * dpr, H * dpr);
    const g = c.getContext("2d");
    g.scale(dpr, dpr);
    floor(g, W, H);
    const land = W > H * 1.1;
    const tx = land ? Math.max(18, W * 0.035) : -30, ty = -40;
    const tw = W - tx * 2, th = H + 80;
    g.fillStyle = "rgba(0,0,0,.35)";
    roundRect(g, tx + 6, ty + 10, tw, th, 26);
    g.fill();
    tableTop(g, tx, ty, tw, th, false);
    const m = land ? Math.min(W, H) * 0.045 : Math.min(W, H) * 0.035;
    const cx = tx + m, cy = ty + m + 40, cw = tw - m * 2, ch = th - m * 2 - 80;
    g.fillStyle = "rgba(0,0,0,.25)";
    roundRect(g, cx + 3, cy + 5, cw, ch, 18);
    g.fill();
    cloth(g, clothId, cx, cy, cw, ch);
    const unit = Math.max(40, Math.min(100, Math.min(W, H) * 0.085));
    const avoid = L.avoid || [];
    const placed = [];
    const anims = [];
    const R = rng(5);
    const pad = unit * 0.1;
    const blocked = (x, y, r) => {
      for (const a of avoid) {
        const nx = Math.max(a.x - pad, Math.min(x, a.x + a.w + pad));
        const ny = Math.max(a.y - pad, Math.min(y, a.y + a.h + pad));
        if (Math.hypot(nx - x, ny - y) < r) return true;
      }
      for (const p of placed) if (Math.hypot(p.x - x, p.y - y) < (p.r + r) * 0.95) return true;
      return false;
    };
    for (const id of DECOR_ORDER) {
      for (const k of [1, 0.85, 0.7]) {
        const r = unit * DECOR_R[id] * k;
        let best = null, bv = -1e9;
        const step = Math.max(12, r * 0.3);
        for (let y = r * 0.2; y < H - r * 0.2; y += step) for (let x = r * 0.2; x < W - r * 0.2; x += step) {
          if (blocked(x, y, r * 1.02)) continue;
          let v = R() * unit * 0.3;
          let dmin = 1e9;
          for (const p of placed) dmin = Math.min(dmin, Math.hypot(p.x - x, p.y - y) - p.r);
          v += Math.min(dmin, unit * 3);
          v -= Math.max(0, r * 0.75 - Math.min(x, W - x, y, H - y)) * 3;
          if (v > bv) bv = v, best = [x, y];
        }
        if (best) {
          placed.push({ id, x: best[0], y: best[1], r });
          break;
        }
      }
    }
    for (const p of placed) {
      g.save();
      g.translate(p.x, p.y);
      g.rotate((R() - 0.5) * 0.5);
      DRAW[p.id](g, p.r * 0.95, "summer");
      g.restore();
      if (p.id === "cup") anims.push({ t: "steam", x: p.x, y: p.y, r: p.r });
    }
    const lx = W * 0.5, ly = H * 0.35;
    const lg = g.createRadialGradient(lx, ly, 0, lx, ly, Math.max(W, H) * 0.8);
    lg.addColorStop(0, "rgba(255,224,160,.16)");
    lg.addColorStop(1, "rgba(255,200,130,0)");
    g.fillStyle = lg;
    g.fillRect(0, 0, W, H);
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.hypot(W, H) * 0.62);
    vg.addColorStop(0, "rgba(20,10,2,0)");
    vg.addColorStop(1, "rgba(20,10,2,.42)");
    g.fillStyle = vg;
    g.fillRect(0, 0, W, H);
    return { canvas: c, anims, placed };
  }

  // test/proto/entry.js
  window.go = async (which) => {
    await document.fonts.ready;
    const c = document.getElementById("c");
    const g = c.getContext("2d");
    if (which === "cards") {
      c.width = 1400;
      c.height = 900;
      g.fillStyle = "#2f7a4a";
      g.fillRect(0, 0, 1400, 900);
      const w = 110, h = Math.round(w * 1.42);
      const list = [card(0, 6), card(1, 7), card(2, 8), card(3, 9), card(0, 10), card(1, 11), card(2, 12), card(3, 13), card(0, 14), card(3, 14), card(1, 13), card(0, 12)];
      list.forEach((id, i) => {
        g.save();
        g.translate(20 + i % 6 * 125, 20 + Math.floor(i / 6) * 175);
        drawFace(g, id, w, h, { lang: i < 6 ? "ru" : "en", four: i > 8 });
        g.restore();
      });
      BACK_ORDER.forEach((b, i) => {
        g.save();
        g.translate(20 + i * 125, 380);
        drawBack(g, b, w, h);
        g.restore();
      });
      KINDS.forEach((k, i) => drawAvatar(g, k, 70 + i * 140, 680, 55, { cap: i === 8 }));
      for (let i = 0; i < 8; i++) {
        g.save();
        g.translate(800 + i * 40, 30);
        drawFace(g, card(i % 4, 6 + i), 80, 114, { lang: "ru" });
        g.restore();
      }
    } else {
      const [W, H] = which === "scene" ? [1280, 720] : [390, 844];
      c.width = W;
      c.height = H;
      const s = buildScene(W, H, 1, window.cloth || "felt", { avoid: [{ x: W * 0.15, y: H * 0.05, w: W * 0.7, h: H * 0.9 }] });
      g.drawImage(s.canvas, 0, 0);
    }
  };
})();
