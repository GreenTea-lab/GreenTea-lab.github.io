// Фон: звёзды + неоновая сетка, движутся вместе с камерой арены
const Phaser = window.Phaser;

export class BgScene extends Phaser.Scene {
  constructor() {
    super('Bg');
  }

  create() {
    const { width: W, height: H } = this.scale;
    this.cameras.main.setBackgroundColor('#07031a');
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
    let x = 0, y = 0, z = 1;
    if (view) {
      z = view.z;
      x = view.x;
      y = view.y;
    } else {
      this.drift += delta * 0.02;
      x = this.drift;
      y = this.drift * 0.5;
    }
    this.grid.setTileScale(z, z);
    this.grid.setTilePosition(x, y);
    this.stars.setTilePosition(x * 0.2 * z, y * 0.2 * z);
  }
}
