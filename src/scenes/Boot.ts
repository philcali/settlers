/**
 * Boot scene — loads assets and initializes the game board.
 *
 * This is the first scene to run. After setup completes,
 * it transitions to the HexBoard scene.
 */

import Phaser from 'phaser';
import { getEngine } from '../engine/GameEngine';

export default class Boot extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload(): void {
    // --- Tile art (loaded from /assets/tiles/ if present) ---
    const tileTypes = ['forest', 'quarry', 'farmland', 'mine', 'pasture', 'desert'];
    for (const type of tileTypes) {
      this.load.image(`tile-${type}`, `/assets/tiles/${type}.png`);
    }

    // --- Card art (texture key `card-<subtype>` -> real file with type prefix) ---
    const cardFiles: Array<[string, string]> = [
      ['card-wood', '/assets/cards/resource-wood.png'],
      ['card-stone', '/assets/cards/resource-stone.png'],
      ['card-grain', '/assets/cards/resource-grain.png'],
      ['card-ore', '/assets/cards/resource-ore.png'],
      ['card-livestock', '/assets/cards/resource-livestock.png'],
      ['card-royal-decree', '/assets/cards/title-royal-decree.png'],
      ['card-plague', '/assets/cards/title-plague.png'],
      ['card-crusade', '/assets/cards/title-crusade.png'],
      ['card-spy-network', '/assets/cards/title-spy-network.png'],
      ['card-mercenary-company', '/assets/cards/title-mercenary-company.png'],
      ['card-harvest-festival', '/assets/cards/event-harvest-festival.png'],
      ['card-famine', '/assets/cards/event-famine.png'],
      ['card-relic-hunt', '/assets/cards/event-relic-hunt.png'],
    ];
    for (const [key, url] of cardFiles) {
      this.load.image(key, url);
    }
    this.load.image('card-back', '/assets/cards/back.png');

    // --- Dice (real art at /assets/dice/) ---
    for (let i = 1; i <= 6; i++) {
      this.load.image(`dice-${i}`, `/assets/dice/d${i}.png`);
    }

    // --- Fallback: generate textures for anything not on disk ---
    this.generateFallbackTextures();
  }

  create(): void {
    const engine = getEngine();
    engine.initBoard();
    console.log('[Boot] Board initialized, starting scenes');
    // Render order (bottom to top): HexBoard < HUD < Game
    this.scene.start('HexBoard');
    this.scene.launch('HUD');
    this.scene.launch('Game');
  }

  // --- Generate procedural textures for tiles without art ---

  private generateFallbackTextures(): void {
    // Tile textures
    const tileColors: Record<string, number> = {
      forest: 0x2d6a2e,
      quarry: 0x7a7a7a,
      farmland: 0xc4a83e,
      mine: 0x5c3d2e,
      pasture: 0x6db86d,
      desert: 0xd4b96a,
    };

    for (const [type, color] of Object.entries(tileColors)) {
      const key = `tile-${type}`;
      if (!this.textures.exists(key)) {
        const graphics = this.make.graphics({ x: 0, y: 0 });
        this.addHexPolygon(graphics, 64, color, 0x1a1a1a, 2);
        graphics.generateTexture(key, 128, 128);
        graphics.destroy();
      }
    }

    // Building textures
    const buildingColors: Record<string, number> = {
      farm: 0xe8dcc8,
      manor: 0xc8b898,
      castle: 0xa08868,
    };

    for (const [type, color] of Object.entries(buildingColors)) {
      const key = `building-${type}`;
      if (!this.textures.exists(key)) {
        const graphics = this.make.graphics({ x: 0, y: 0 });
        graphics.fillStyle(color, 1);
        graphics.fillRect(0, 0, 48, 48);
        graphics.lineStyle(2, 0x000000, 0.5);
        graphics.strokeRect(0, 0, 48, 48);
        graphics.generateTexture(key, 48, 48);
        graphics.destroy();
      }
    }

    // Dice faces
    for (let i = 1; i <= 6; i++) {
      const key = `dice-${i}`;
      if (!this.textures.exists(key)) {
        const graphics = this.make.graphics({ x: 0, y: 0 });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRoundedRect(0, 0, 40, 40, 8);
        graphics.lineStyle(2, 0x000000, 0.3);
        graphics.strokeRoundedRect(0, 0, 40, 40, 8);
        graphics.generateTexture(key, 40, 40);
        graphics.destroy();
      }
    }

    // Bandit
    if (!this.textures.exists('bandit')) {
      const graphics = this.make.graphics({ x: 0, y: 0 });
      graphics.fillStyle(0x333333, 1);
      graphics.fillCircle(16, 16, 16);
      graphics.generateTexture('bandit', 32, 32);
      graphics.destroy();
    }
  }

  private addHexPolygon(
    graphics: Phaser.GameObjects.Graphics,
    size: number,
    fillStyle: number,
    lineStyle: number,
    lineWidth: number,
  ): void {
    const points = this.hexPoints(size);
    graphics.fillStyle(fillStyle, 1);
    graphics.fillPoints(points);
    graphics.lineStyle(lineWidth, lineStyle, 1);
    graphics.strokePoints(points);
  }

  private hexPoints(size: number): Phaser.Math.Vector2[] {
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      points.push(
        new Phaser.Math.Vector2(size * Math.cos(angle), size * Math.sin(angle)),
      );
    }
    return points;
  }
}
