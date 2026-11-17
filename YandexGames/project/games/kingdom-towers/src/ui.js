// Мультяшный интерфейс: деревянные панели, пергамент, «сочные» кнопки
import { hex, C } from './data.js';
import { INK, css, light, dark, rr, canvas, circ, line } from './art.js';
import { audio } from './audio.js';

export const FONT = '"Rubik", "Arial Black", Arial, sans-serif';
export const TFONT = '"Ruslan Display", "Rubik", serif';

export function uiScale(scene) {
  const { width, height } = scene.scale;
  return Math.max(0.5, Math.min(2.6, Math.min(width, height) / 720));
}

export function txt(scene, x, y, str, size, color = 0xffffff, o = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: o.title ? TFONT : FONT,
    fontStyle: o.title ? 'normal' : '800',
    fontSize: Math.round(size) + 'px',
    color: hex(color),
    align: o.align || 'center',
    wordWrap: o.wrap ? { width: o.wrap, useAdvancedWrap: true } : undefined,
    lineSpacing: o.lineSpacing || 0,
  });
  t.setOrigin(o.ox ?? 0.5, o.oy ?? 0.5);
  if (o.stroke !== false) {
    t.setStroke(hex(o.strokeColor ?? C.ink), Math.max(2, Math.round(size * (o.strokeK ?? 0.18))));
    t.setShadow(0, Math.max(1, Math.round(size * 0.07)), 'rgba(0,0,0,0.35)', 0, true, false);
  }
  t.setPadding(4, 4, 4, 4);
  return t;
}

const BTN = {
  green: 0x5cc451,
  red: 0xe5483f,
  blue: 0x4aa3ff,
  gold: 0xffc93c,
  grey: 0x9a948c,
  purple: 0x9b5de5,
  orange: 0xf28c28,
  dark: 0x5a4a3a,
};

// Текстура панели нужного размера (кэшируется)
export function panelTex(scene, style, w, h, radius) {
  w = Math.max(8, Math.round(w));
  h = Math.max(8, Math.round(h));
  const r = Math.round(radius ?? Math.min(h * 0.3, 28));
  const key = `pn_${style}_${w}_${h}_${r}`;
  if (scene.textures.exists(key)) return key;
  const [cv, ctx] = canvas(w, h);
  const lw = Math.max(3, Math.min(6, h * 0.06));
  if (style === 'wood' || style === 'woodDark') {
    const base = style === 'wood' ? 0x9c6234 : 0x6e4426;
    rr(ctx, lw / 2, lw / 2, w - lw, h - lw, r);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, css(light(base, 0.12)));
    g.addColorStop(1, css(dark(base, 0.12)));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = css(dark(base, 0.25));
    ctx.lineWidth = 2;
    const step = Math.max(26, Math.min(48, h / 5));
    for (let y = step; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
    // внутренняя золотая рамка
    rr(ctx, lw * 2.2, lw * 2.2, w - lw * 4.4, h - lw * 4.4, Math.max(4, r - lw * 1.5));
    ctx.lineWidth = Math.max(2, lw * 0.6);
    ctx.strokeStyle = css(0xd9a441, 0.9);
    ctx.stroke();
    rr(ctx, lw / 2, lw / 2, w - lw, h - lw, r);
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.stroke();
    // гвозди
    const n = lw * 1.1;
    [[lw * 3.2, lw * 3.2], [w - lw * 3.2, lw * 3.2], [lw * 3.2, h - lw * 3.2], [w - lw * 3.2, h - lw * 3.2]].forEach(([x, y]) => {
      if (w < 90 || h < 90) return;
      circ(ctx, x, y, n);
      ctx.fillStyle = css(0xffd76a);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
    });
  } else if (style === 'parch') {
    rr(ctx, lw / 2, lw / 2, w - lw, h - lw, r);
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    g.addColorStop(0, css(0xfff3d6));
    g.addColorStop(1, css(0xf0d7a6));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.stroke();
    rr(ctx, lw * 2, lw * 2, w - lw * 4, h - lw * 4, Math.max(4, r - lw));
    ctx.lineWidth = 2;
    ctx.strokeStyle = css(0xc9a06a);
    ctx.stroke();
  } else if (style === 'shade') {
    rr(ctx, 0, 0, w, h, r);
    ctx.fillStyle = 'rgba(30,18,8,0.55)';
    ctx.fill();
  } else {
    // кнопка
    const base = BTN[style] ?? BTN.green;
    const lip = Math.max(3, h * 0.09);
    rr(ctx, lw / 2, lw / 2, w - lw, h - lw, r);
    ctx.fillStyle = css(dark(base, 0.35));
    ctx.fill();
    rr(ctx, lw / 2, lw / 2, w - lw, h - lw - lip, r);
    const g = ctx.createLinearGradient(0, 0, 0, h - lip);
    g.addColorStop(0, css(light(base, 0.25)));
    g.addColorStop(1, css(base));
    ctx.fillStyle = g;
    ctx.fill();
    // блик
    rr(ctx, lw * 1.8, lw * 1.5, w - lw * 3.6, (h - lip) * 0.32, Math.max(3, r * 0.7));
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.fill();
    rr(ctx, lw / 2, lw / 2, w - lw, h - lw, r);
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  scene.textures.addCanvas(key, cv);
  return key;
}

export function panel(scene, x, y, w, h, style = 'wood', radius) {
  return scene.add.image(x, y, panelTex(scene, style, w, h, radius));
}

/**
 * Кнопка: x,y,w,h,label,style,size,icon,iconSize,onClick,depth,disabled,sub
 */
export function button(scene, o) {
  const c = scene.add.container(o.x, o.y);
  const style = o.style || 'green';
  const img = scene.add.image(0, 0, panelTex(scene, style, o.w, o.h, o.radius));
  c.add(img);
  const lift = -Math.max(2, o.h * 0.045);
  let icon = null;
  let label = null;
  let sub = null;
  const iconSize = o.iconSize ?? o.h * 0.6;
  if (o.icon) {
    icon = scene.add.image(0, lift, o.icon.startsWith('tw_') || o.icon.startsWith('en_') ? o.icon : 'ic_' + o.icon);
    const k = iconSize / Math.max(icon.width, icon.height);
    icon.setScale(k);
    c.add(icon);
  }
  if (o.label !== undefined && o.label !== null && o.label !== '') {
    const size = o.size ?? o.h * 0.36;
    label = txt(scene, 0, lift + (o.sub ? -o.h * 0.12 : 0), o.label, size, o.color ?? 0xffffff);
    c.add(label);
    if (icon) {
      const gap = iconSize * 0.15;
      const total = iconSize + gap + label.width - 8;
      icon.x = -total / 2 + iconSize / 2;
      label.x = icon.x + iconSize / 2 + gap + (label.width - 8) / 2;
    }
    if (o.sub) {
      sub = txt(scene, 0, lift + o.h * 0.2, o.sub, size * 0.6, 0xfff3d6, { strokeK: 0.22 });
      c.add(sub);
    }
  }
  const btn = {
    c,
    img,
    icon,
    label,
    sub,
    enabled: !o.disabled,
    setEnabled(v) {
      btn.enabled = v;
      c.setAlpha(v ? 1 : 0.55);
    },
    setStyle(s) {
      img.setTexture(panelTex(scene, s, o.w, o.h, o.radius));
    },
    destroy() {
      zone.destroy();
      c.destroy();
    },
    setVisible(v) {
      c.setVisible(v);
      zone.setVisible(v);
      if (v) zone.setInteractive();
      else zone.disableInteractive();
    },
  };
  btn.setEnabled(btn.enabled);
  const zone = scene.add.zone(o.x, o.y, o.w, o.h).setInteractive({ useHandCursor: true });
  btn.zone = zone;
  if (o.depth !== undefined) {
    c.setDepth(o.depth);
    zone.setDepth(o.depth + 1);
  }
  let pressed = false;
  zone.on('pointerdown', (p, lx, ly, ev) => {
    ev && ev.stopPropagation();
    audio.unlock();
    if (!btn.enabled && !o.allowDisabledClick) return;
    pressed = true;
    c.setScale(0.93);
  });
  zone.on('pointerout', () => {
    pressed = false;
    c.setScale(1);
  });
  zone.on('pointerup', (p, lx, ly, ev) => {
    ev && ev.stopPropagation();
    c.setScale(1);
    if (pressed) {
      pressed = false;
      if (btn.enabled) audio.play('click');
      o.onClick && o.onClick(btn);
    }
  });
  return btn;
}

export class Layer {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
  }
  add(o) {
    this.items.push(o);
    return o;
  }
  clear() {
    this.items.forEach((o) => o && o.destroy && o.destroy());
    this.items = [];
  }
}

// Иконка + число (золото, жизни и т.п.)
export function counter(scene, layer, x, y, icon, value, size, color = 0xffffff, o = {}) {
  const ic = layer.add(scene.add.image(x, y, 'ic_' + icon));
  ic.setScale((size * 1.35) / 96);
  const t = layer.add(txt(scene, x + size * 0.85, y, String(value), size, color, { ox: 0 }));
  if (o.depth !== undefined) {
    ic.setDepth(o.depth);
    t.setDepth(o.depth);
  }
  return { ic, t };
}
