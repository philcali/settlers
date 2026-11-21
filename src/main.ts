/**
 * Phaser app entry point.
 *
 * Renders the Settlers of the Realm game on a canvas element.
 * The canvas is created in index.html via a <div id="phaser-container">.
 */

import { Game } from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config';
import Boot from './scenes/Boot';
import HexBoard from './scenes/HexBoard';
import HUD from './scenes/HUD';
import GameScene from './scenes/Game';

// Create Phaser game instance
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  parent: 'phaser-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [Boot, HexBoard, HUD, GameScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
};

const phaserGame = new Game(config);
console.log('[Settlers] Phaser game initialized');

export { phaserGame };
