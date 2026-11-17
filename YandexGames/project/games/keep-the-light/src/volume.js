// Громкость музыки и звуков: перенос старых настроек вкл/выкл и окно с ползунками (DOM)
import { audio } from './audio.js';

export function initVolume(st) {
  if (typeof st.musicVol !== 'number') st.musicVol = st.music === false ? 0 : 0.7;
  if (typeof st.sfxVol !== 'number') st.sfxVol = st.sfx === false ? 0 : 0.9;
  st.music = st.musicVol > 0;
  st.sfx = st.sfxVol > 0;
  audio.musicVol = st.musicVol;
  audio.sfxVol = st.sfxVol;
  audio.musicOn = st.music;
  audio.sfxOn = st.sfx;
}

export function setVol(st, key, v) {
  v = Math.max(0, Math.min(1, v));
  if (key === 'music') {
    st.musicVol = v;
    st.music = v > 0;
    audio.setMusicVol(v);
  } else {
    st.sfxVol = v;
    st.sfx = v > 0;
    audio.setSfxVol(v);
  }
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// HTML двух ползунков (для игр с DOM-интерфейсом)
export function slidersHTML(st, labels, icons = {}) {
  const row = (k, label, v) =>
    `<label class="vol-row"><span class="vol-ic">${icons[k] || ''}</span><span class="vol-l">${esc(label)}</span><input class="vol-in" type="range" min="0" max="100" step="5" value="${Math.round(v * 100)}" data-k="${k}"><b class="vol-v">${Math.round(v * 100)}%</b></label>`;
  return `<div class="vol-box">${row('music', labels.music, st.musicVol)}${row('sfx', labels.sound, st.sfxVol)}</div>`;
}

// навесить обработчики на ползунки внутри root; save — сохранить настройки
export function bindSliders(root, st, save) {
  root.querySelectorAll('.vol-in').forEach((inp) => {
    const out = inp.parentElement.querySelector('.vol-v');
    const upd = () => {
      setVol(st, inp.dataset.k, inp.value / 100);
      out.textContent = inp.value + '%';
      inp.style.setProperty('--p', inp.value + '%');
    };
    inp.style.setProperty('--p', inp.value + '%');
    inp.addEventListener('pointerdown', (e) => e.stopPropagation());
    inp.addEventListener('input', upd);
    inp.addEventListener('change', () => {
      upd();
      if (inp.dataset.k === 'sfx') audio.play('click');
      save && save();
    });
  });
}

// CSS ползунков; T — цвета темы
export function volumeCss(T) {
  return `
.vol-box{display:flex;flex-direction:column;gap:14px;align-self:stretch;min-width:min(320px,80vw)}
.vol-row{display:flex;align-items:center;gap:10px;font-size:17px}
.vol-ic{width:28px;height:28px;flex:none;display:flex;align-items:center;justify-content:center;color:${T.accent}}
.vol-ic svg,.vol-ic img{width:28px;height:28px}
.vol-l{min-width:72px}
.vol-v{min-width:48px;text-align:right;font-size:15px;color:${T.muted}}
.vol-in{-webkit-appearance:none;appearance:none;flex:1;height:30px;background:transparent;touch-action:none;margin:0;--p:50%}
.vol-in::-webkit-slider-runnable-track{height:10px;border-radius:6px;background:linear-gradient(90deg,${T.accent} var(--p),${T.track} var(--p))}
.vol-in::-moz-range-track{height:10px;border-radius:6px;background:${T.track}}
.vol-in::-moz-range-progress{height:10px;border-radius:6px;background:${T.accent}}
.vol-in::-webkit-slider-thumb{-webkit-appearance:none;width:26px;height:26px;margin-top:-8px;border-radius:50%;background:${T.thumb};border:3px solid ${T.accent};box-shadow:0 2px 6px rgba(0,0,0,.35)}
.vol-in::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:${T.thumb};border:3px solid ${T.accent}}`;
}

// отдельное окно громкости (для игр на Phaser)
export function openVolume({ st, save, title, labels, theme, icons, onClose }) {
  closeVolume();
  let css = document.getElementById('vol-css');
  if (!css) {
    css = document.createElement('style');
    css.id = 'vol-css';
    document.head.appendChild(css);
  }
  css.textContent =
    volumeCss(theme) +
    `
#vol-panel{position:fixed;inset:0;z-index:61;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);font-family:${theme.font};color:${theme.ink};-webkit-user-select:none;user-select:none}
#vol-panel .vp{background:${theme.panel};border:3px solid ${theme.border};border-radius:18px;padding:16px 18px 20px;box-shadow:0 10px 40px rgba(0,0,0,.5);display:flex;flex-direction:column;gap:16px;width:min(440px,92vw)}
#vol-panel .vh{display:flex;align-items:center;justify-content:space-between;font-size:22px}
#vol-panel .vx{width:40px;height:40px;border-radius:50%;border:2px solid ${theme.border};background:transparent;color:${theme.ink};font-size:20px;cursor:pointer}`;
  const root = document.createElement('div');
  root.id = 'vol-panel';
  root.innerHTML = `<div class="vp"><div class="vh"><b>${esc(title)}</b><button class="vx" aria-label="close">✕</button></div>${slidersHTML(st, labels, icons)}</div>`;
  const close = () => {
    closeVolume();
    save && save();
    onClose && onClose();
  };
  root.querySelector('.vx').onclick = close;
  root.addEventListener('click', (e) => e.target === root && close());
  root.addEventListener('pointerdown', (e) => e.stopPropagation());
  document.body.appendChild(root);
  bindSliders(root, st, save);
}

export function closeVolume() {
  const e = document.getElementById('vol-panel');
  if (e) e.remove();
}
