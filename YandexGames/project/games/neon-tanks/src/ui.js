// Простые неоновые UI-компоненты
import { hex } from './data.js';
import { audio } from './audio.js';

export const FONT = '"Russo One", "Arial Black", Arial, sans-serif';

export function uiScale(scene) {
  const { width, height } = scene.scale;
  return Math.max(0.55, Math.min(2.6, Math.min(width, height) / 720));
}

export function txt(scene, x, y, str, size, color = 0xffffff, opts = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: Math.round(size) + 'px',
    color: hex(color),
    align: opts.align || 'center',
    wordWrap: opts.wrap ? { width: opts.wrap, useAdvancedWrap: true } : undefined,
    lineSpacing: opts.lineSpacing || 0,
  });
  t.setOrigin(opts.ox ?? 0.5, opts.oy ?? 0.5);
  if (opts.glow !== false) {
    const blur = Math.round(size * 0.35);
    t.setShadow(0, 0, hex(opts.glowColor ?? color), blur, false, true);
    t.setPadding(blur + 2, blur + 2, blur + 2, blur + 2);
  }
  if (opts.stroke) t.setStroke(hex(opts.stroke), opts.strokeW || 3);
  return t;
}

export function panelGfx(scene, x, y, w, h, color, opts = {}) {
  const g = scene.add.graphics();
  g.setPosition(x, y);
  drawPanel(g, w, h, color, opts);
  return g;
}

export function drawPanel(g, w, h, color, opts = {}) {
  const r = opts.radius ?? Math.min(18, h / 4);
  const lw = opts.lineWidth ?? 3;
  g.clear();
  g.fillStyle(opts.fill ?? 0x0b0626, opts.fillAlpha ?? 0.9);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  if (opts.tint !== false) {
    g.fillStyle(color, opts.tintAlpha ?? 0.1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  }
  // мягкое свечение рамки
  g.lineStyle(lw * 3, color, 0.12);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  g.lineStyle(lw, color, opts.strokeAlpha ?? 1);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
}

/**
 * Кнопка. opts: x,y,w,h,label,color,size,icon,onClick,depth,disabled,sub
 */
export function button(scene, o) {
  const color = o.color ?? 0x31f6ff;
  const c = scene.add.container(o.x, o.y);
  const g = scene.add.graphics();
  c.add(g);
  const size = o.size ?? o.h * 0.38;
  let label = null;
  let icon = null;
  const iconSize = o.iconSize ?? o.h * 0.62;
  if (o.icon) {
    icon = scene.add.image(0, 0, 'ic_' + o.icon).setDisplaySize(iconSize, iconSize);
    c.add(icon);
  }
  if (o.label !== undefined && o.label !== null) {
    label = txt(scene, 0, o.sub ? -o.h * 0.13 : 0, o.label, size, 0xffffff, { glowColor: color });
    c.add(label);
    if (icon) {
      // иконка слева от текста
      const total = iconSize * 0.9 + label.width;
      icon.x = -total / 2 + iconSize * 0.4;
      label.x = icon.x + iconSize * 0.5 + label.width / 2;
    }
  }
  let sub = null;
  if (o.sub) {
    sub = txt(scene, 0, o.h * 0.22, o.sub, size * 0.62, 0xc9c3ff, { glow: false });
    c.add(sub);
  }
  const btn = {
    c,
    g,
    label,
    sub,
    icon,
    enabled: !o.disabled,
    draw() {
      drawPanel(g, o.w, o.h, btn.enabled ? color : 0x555577, {
        radius: o.radius ?? o.h * 0.3,
        tintAlpha: o.fillStrong ? 0.35 : 0.14,
        lineWidth: Math.max(2, Math.min(6, o.h * 0.045)),
      });
      c.setAlpha(btn.enabled ? 1 : 0.55);
    },
    setEnabled(v) {
      btn.enabled = v;
      btn.draw();
    },
    setLabel(s) {
      if (label) label.setText(s);
    },
    destroy() {
      zone.destroy();
      c.destroy();
    },
  };
  btn.draw();
  const zone = scene.add.zone(o.x, o.y, o.w, o.h).setInteractive({ useHandCursor: true });
  btn.zone = zone;
  if (o.depth !== undefined) {
    c.setDepth(o.depth);
    zone.setDepth(o.depth + 1);
  }
  let pressed = false;
  zone.on('pointerdown', (p, lx, ly, ev) => {
    if (ev) ev.stopPropagation();
    audio.unlock();
    if (!btn.enabled) return;
    pressed = true;
    c.setScale(0.94);
  });
  zone.on('pointerout', () => {
    pressed = false;
    c.setScale(1);
  });
  zone.on('pointerover', () => {
    if (btn.enabled) c.setScale(1.04);
  });
  zone.on('pointerup', (p, lx, ly, ev) => {
    if (ev) ev.stopPropagation();
    c.setScale(1);
    if (pressed && btn.enabled) {
      pressed = false;
      audio.play('click');
      o.onClick && o.onClick();
    }
  });
  return btn;
}

export function fmtTime(sec) {
  sec = Math.floor(sec);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ':' + String(s).padStart(2, '0');
}

// Контейнер для набора UI-объектов, который удобно уничтожать целиком
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
