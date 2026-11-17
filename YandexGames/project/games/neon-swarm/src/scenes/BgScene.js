// Фон: звёзды + неоновая сетка с параллаксом
const Phaser = window.Phaser;

export class BgScene extends Phaser.Scene {
  constructor() {
    super('Bg');
  }

  create() {
    const { width: W, height: H } = this.scale;
    this.stars = this.add.tileSprite(0, 0, W, H, 'stars').setOrigin(0);
    this.grid = this.add.tileSprite(0, 0, W, H, 'grid').setOrigin(0);
    this.drift = 0;
    this.scale.on('resize', (gs) => {
      this.stars.setSize(gs.width, gs.height);
      this.grid.setSize(gs.width, gs.height);
    });
  }

  update(time, delta) {
    const view = this.registry.get('view');
    let x, y, z;
    const inGame = view && (this.scene.isActive('Game') || this.scene.isPaused('Game'));
    // цвета арены в бою, фиолетовая сетка в меню
    const ar = inGame ? this.registry.get('arenaDef') : null;
    const gc = ar ? ar.grid : 0x7846ff;
    if (gc !== this.gc) {
      this.gc = gc;
      this.grid.setTint(gc);
      this.stars.setTint(ar ? ar.stars : 0xa0a0ff);
      this.cameras.main.setBackgroundColor(ar ? ar.bg : 0x07031a);
    }
    if (inGame) {
      z = this.registry.get('zoom') || 1;
      x = view.x;
      y = view.y;
    } else {
      this.drift += delta * 0.025;
      z = Math.max(0.6, Math.min(2.2, Math.sqrt(this.scale.width * this.scale.height) / 830));
      x = this.drift;
      y = this.drift * 0.55;
    }
    this.grid.setTileScale(z, z);
    this.grid.setTilePosition(x, y);
    this.stars.setTilePosition(x * 0.25 * z, y * 0.25 * z);
  }
}
