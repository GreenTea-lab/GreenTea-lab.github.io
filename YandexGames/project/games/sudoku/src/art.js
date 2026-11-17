// Generated artwork is packaged locally; no remote image service is used by the game.
export const ART = {
  night: 'art/interface-night.webp', dawn: 'art/interface-dawn.webp',
  spring: 'art/garden-spring.webp', summer: 'art/garden-summer.webp',
  autumn: 'art/garden-autumn.webp', winter: 'art/garden-winter.webp',
};

export class Backdrop {
  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'ambient-background';
    this.root.setAttribute('aria-hidden', 'true');
    document.getElementById('sky').after(this.root);
    this.layers = [0, 1].map(() => {
      const layer = document.createElement('div');
      layer.className = 'ambient-layer';
      this.root.append(layer);
      return layer;
    });
    this.active = 0; this.sequence = 0; this.token = 0;
    this.timer = setInterval(() => {
      if (this.mode !== 'living' || document.hidden || this.reduced) return;
      const scenes = [this.theme, 'spring', 'summer', 'autumn', 'winter'];
      this.swap(scenes[++this.sequence % scenes.length]);
    }, 45000);
  }
  configure(settings) {
    this.reduced = settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
    const theme = settings.theme === 'dawn' ? 'dawn' : 'night';
    const mode = settings.background || 'living';
    this.root.hidden = settings.theme === 'contrast' || mode === 'classic';
    document.documentElement.dataset.art = !this.root.hidden && this.loaded ? 'true' : 'false';
    this.root.dataset.theme = theme;
    if (this.theme !== theme || this.mode !== mode) {
      this.theme = theme; this.mode = mode; this.sequence = 0;
      this.swap(ART[mode] ? mode : theme);
    }
  }
  async swap(key) {
    const token = ++this.token;
    const img = new Image(); img.src = ART[key];
    try { await img.decode(); } catch { return; }
    if (token !== this.token) return;
    const next = 1 - this.active;
    if (!this.loaded || this.reduced) this.layers[next].style.transition = 'none';
    this.layers[next].style.backgroundImage = `url("${ART[key]}")`;
    this.layers[next].classList.add('visible');
    this.layers[this.active].classList.remove('visible');
    this.active = next;
    this.loaded = true;
    document.documentElement.dataset.art = this.root.hidden ? 'false' : 'true';
    requestAnimationFrame(() => requestAnimationFrame(() => { this.layers[next].style.transition = ''; }));
  }
}
