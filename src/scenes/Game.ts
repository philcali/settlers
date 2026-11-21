/**
 * Game scene — orchestrates turn flow, dice rolling, card hand, and build panel.
 *
 * This is the main gameplay scene. It:
 * - Manages the turn phase cycle (draw → play → build → roll → advance)
 * - Handles dice rolling with animation
 * - Displays the player's card hand (click a card in the play phase to play it)
 * - Shows the build panel when in the build phase
 * - Coordinates with HexBoard for tile interactions (build / upgrade / setup placement)
 * - Runs AI turns with delays
 * - Detects the winner and offers a restart
 */

import Phaser from 'phaser';
import { getEngine } from '../engine/GameEngine';
import { CARD, BUILD_PANEL, DICE, CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import {
  coordKey,
  BuildingType,
  ResourceType,
  GameState,
  PlayerId,
  TurnPhase,
  BUILDING_COSTS,
} from '../types/game';
import { collectResources } from '../game/dice';
import { canBuild, canUpgrade, checkWinner } from '../game/rules';
import HexBoard from './HexBoard';

// --- Card hand ---

interface CardDisplay {
  sprite: Phaser.GameObjects.Sprite;
  cardId: string;
}

// --- Build panel option ---

interface BuildOption {
  building: BuildingType;
  bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  cost: Phaser.GameObjects.Text;
}

function costText(building: BuildingType): string {
  const costs = BUILDING_COSTS[building];
  if (!costs) return '';
  return Object.entries(costs)
    .map(([res, n]) => `${n || 0} ${res}`)
    .join('  ');
}

export default class GameScene extends Phaser.Scene {
  private engine = getEngine();
  private unsubscribe: (() => void) | null = null;

  // Card hand
  private cardDisplays: CardDisplay[] = [];
  private cardBg: Phaser.GameObjects.Graphics | null = null;

  // Build panel
  private buildOptions: BuildOption[] = [];
  private buildPanelBg: Phaser.GameObjects.Graphics | null = null;
  private buildPanelTitle: Phaser.GameObjects.Text | null = null;
  private buildPanelVisible = false;

  // Dice
  private diceSprites: Phaser.GameObjects.Sprite[] = [];
  private diceValueText: Phaser.GameObjects.Text | null = null;

  // Buttons
  private passBtn: Phaser.GameObjects.Container | null = null;
  private rollBtn: Phaser.GameObjects.Container | null = null;

  // Turn / AI state
  private aiProcessing = false;
  private aiPlacementScheduled = -1;
  private autoDrawTriggered = false;
  private rolling = false;
  private victoryShown = false;

  constructor() {
    super({ key: 'Game' });
  }

  create(): void {
    // Reset per-scene flags
    this.aiProcessing = false;
    this.aiPlacementScheduled = -1;
    this.autoDrawTriggered = false;
    this.rolling = false;
    this.victoryShown = false;
    this.cardDisplays = [];
    this.buildOptions = [];
    this.buildPanelVisible = false;

    // Subscribe to state changes
    this.unsubscribe = this.engine.subscribe(this.onStateChange.bind(this));

    // Listen for tile clicks from HexBoard
    const hexBoard = this.scene.get('HexBoard') as HexBoard;
    hexBoard.events.on('tile-click', this.onTileClick.bind(this));

    // UI
    this.createDiceDisplay();
    this.createCardHand();
    this.createBuildPanel();
    this.createButtons();

    // Initial render
    this.onStateChange(this.engine.state);
  }

  shutdown(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  // --- State change handler ---

  private onStateChange(state: GameState): void {
    // Game over
    if (state.phase === 'ended') {
      if (!this.victoryShown) {
        this.victoryShown = true;
        this.showVictoryScreen(state.winner || 'human');
      }
      return;
    }

    // Keep the displays in sync
    this.updateCardHand(state);
    this.updateDiceDisplay(state);
    this.updateButtons(state);
    this.updateBuildPanelVisibility(state);

    // Setup phase: handle placements
    if (state.phase === 'setup') {
      this.handleSetup(state);
      return;
    }

    // Reset the auto-draw guard whenever we're not in the draw phase
    if (state.turnPhase !== 'draw') {
      this.autoDrawTriggered = false;
    }

    // A player hit 10 VP → end the game
    const winner = checkWinner(state);
    if (winner) {
      this.engine.dispatch({ type: 'SET_PHASE', phase: 'ended', winner });
      return;
    }

    // Human turn: auto-draw at the start of the draw phase (guarded to avoid recursion)
    if (
      state.phase === 'playing' &&
      state.currentPlayer === 'human' &&
      state.turnPhase === 'draw' &&
      !this.autoDrawTriggered
    ) {
      this.autoDrawTriggered = true;
      this.engine.dispatch({ type: 'DRAW_CARDS', player: 'human', count: 3 });
      this.engine.dispatch({ type: 'SET_TURN_PHASE', phase: 'play' });
      return;
    }

    // AI turn
    if (state.phase === 'playing' && state.currentPlayer === 'ai') {
      this.processAITurn();
    }
  }

  // --- Setup ---

  private handleSetup(state: GameState): void {
    // All four placements done → start playing
    if (state.setupRound >= 4) {
      this.engine.dispatch({ type: 'INITIAL_PLACEMENT_DONE' });
      return;
    }

    // AI placement (alternates with the human)
    if (state.currentPlayer === 'ai' && this.aiPlacementScheduled !== state.setupRound) {
      this.aiPlacementScheduled = state.setupRound;
      this.time.delayedCall(700, () => this.scheduleAIPlacement());
    }
  }

  private scheduleAIPlacement(): void {
    const s = this.engine.state;
    if (s.phase !== 'setup' || s.currentPlayer !== 'ai') return;
    const emptyTiles = s.board.filter((t) => t.building === null);
    if (emptyTiles.length === 0) return;
    const tile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
    this.engine.dispatch({ type: 'PLACE_CASTLE', player: 'ai', tileKey: coordKey(tile.coord) });
  }

  // --- Card hand ---

  private createCardHand(): void {
    const w = 520;
    const h = CARD.height + 12;
    this.cardBg = this.add.graphics();
    this.cardBg.setPosition(CANVAS_WIDTH / 2, CARD.handY);
    this.cardBg.setDepth(50);
    this.cardBg.fillStyle(0x000000, 0.35);
    this.cardBg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
  }

  private updateCardHand(state: GameState): void {
    const humanHand = state.players.human.hand;

    // Grow (attach handlers once)
    while (this.cardDisplays.length < humanHand.length) {
      const sprite = this.add.sprite(0, 0, 'card-wood');
      sprite.setDisplaySize(CARD.width, CARD.height);
      sprite.setOrigin(0.5);
      sprite.setDepth(51);
      sprite.setInteractive({ useHandCursor: true });
      const display: CardDisplay = { sprite, cardId: '' };
      sprite.on('pointerdown', () => this.onCardClick(display.cardId));
      sprite.on('pointerover', () => this.tweens.add({ targets: sprite, scaleX: 1.06, scaleY: 1.06, duration: 100 }));
      sprite.on('pointerout', () => this.tweens.add({ targets: sprite, scaleX: 1, scaleY: 1, duration: 100 }));
      this.cardDisplays.push(display);
    }

    // Shrink
    while (this.cardDisplays.length > humanHand.length) {
      const display = this.cardDisplays.pop();
      if (display) display.sprite.destroy();
    }

    // Layout
    const totalWidth = humanHand.length * (CARD.width - CARD.overlap) + CARD.overlap;
    const startX = CANVAS_WIDTH / 2 - totalWidth / 2;
    for (let i = 0; i < this.cardDisplays.length; i++) {
      const display = this.cardDisplays[i];
      const card = humanHand[i];
      if (!card) continue;

      display.sprite.x = startX + i * (CARD.width - CARD.overlap) + CARD.width / 2;
      display.sprite.y = CARD.handY;
      display.cardId = card.id;

      const textureKey = `card-${card.subtype}`;
      if (this.textures.exists(textureKey)) {
        display.sprite.setTexture(textureKey);
      }
    }
  }

  private onCardClick(cardId: string): void {
    const s = this.engine.state;
    if (s.phase !== 'playing' || s.currentPlayer !== 'human' || s.turnPhase !== 'play') return;
    const card = s.players.human.hand.find((c) => c.id === cardId);
    if (!card) return;

    const display = this.cardDisplays.find((d) => d.cardId === cardId);
    if (display) {
      this.tweens.add({ targets: display.sprite, y: CARD.handY - 60, alpha: 0, duration: 250 });
    }

    this.engine.dispatch({ type: 'PLAY_CARD', player: 'human', cardId });

    if (card.type === 'resource') {
      this.showMessage(`Played ${card.subtype} — +1 ${card.subtype}`);
    }
  }

  // --- Build panel ---

  private createBuildPanel(): void {
    const x = BUILD_PANEL.x;
    const y = BUILD_PANEL.y;
    const w = BUILD_PANEL.width;
    const h = BUILD_PANEL.height;

    this.buildPanelBg = this.add.graphics();
    this.buildPanelBg.setPosition(x + w / 2, y + h / 2);
    this.buildPanelBg.setDepth(60);
    this.buildPanelBg.fillStyle(0x000000, 0.6);
    this.buildPanelBg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);

    this.buildPanelTitle = this.add.text(x + 14, y + 12, 'Build / Upgrade', {
      fontSize: '16px',
      fontFamily: 'sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.buildPanelTitle.setOrigin(0, 0.5);
    this.buildPanelTitle.setDepth(61);

    const buildings: BuildingType[] = ['farm', 'manor', 'castle'];
    const rowH = 38;
    const startY = y + 38;

    for (let i = 0; i < buildings.length; i++) {
      const building = buildings[i];
      const ry = startY + i * (rowH + 4);
      const bx = x + 8;
      const bw = w - 16;

      const paint = (color: number, border: number) => {
        bg.clear();
        bg.fillStyle(color, 0.92);
        bg.fillRoundedRect(0, 0, bw, rowH, 6);
        bg.lineStyle(1, border, 0.85);
        bg.strokeRoundedRect(0, 0, bw, rowH, 6);
      };

      const bg = this.add.graphics();
      bg.setPosition(bx, ry);
      bg.setDepth(62);
      paint(0x2b3a5a, 0x4a5a8a);
      bg.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(0, 0, bw, rowH),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });
      bg.on('pointerdown', () => this.onBuildOptionClick(building));
      bg.on('pointerover', () => paint(0x3a4a7a, 0x6a7ab0));
      bg.on('pointerout', () => paint(0x2b3a5a, 0x4a5a8a));

      const label = this.add.text(bx + 8, ry + rowH / 2, building.charAt(0).toUpperCase() + building.slice(1), {
        fontSize: '15px',
        fontFamily: 'sans-serif',
        color: '#ffffff',
      });
      label.setOrigin(0, 0.5);
      label.setDepth(63);

      const cost = this.add.text(bx + bw - 8, ry + rowH / 2, costText(building), {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#c9d4f0',
      });
      cost.setOrigin(1, 0.5);
      cost.setDepth(63);

      this.buildOptions.push({ building, bg, label, cost });
    }

    this.setBuildPanelVisible(false);
  }

  private setBuildPanelVisible(visible: boolean): void {
    const objs: Array<Phaser.GameObjects.Graphics | Phaser.GameObjects.Text> = [];
    if (this.buildPanelBg) objs.push(this.buildPanelBg);
    if (this.buildPanelTitle) objs.push(this.buildPanelTitle);
    for (const o of this.buildOptions) {
      objs.push(o.bg, o.label, o.cost);
    }
    for (const obj of objs) obj.setVisible(visible);
  }

  private updateBuildPanelVisibility(state: GameState): void {
    const shouldShow =
      state.phase === 'playing' && state.turnPhase === 'build' && state.currentPlayer === 'human';
    if (shouldShow !== this.buildPanelVisible) {
      this.buildPanelVisible = shouldShow;
      this.setBuildPanelVisible(shouldShow);
    }
    this.updateBuildPanelEnabled(state);
  }

  private updateBuildPanelEnabled(state: GameState): void {
    const res = state.players.human.resources;
    for (const option of this.buildOptions) {
      const costs = BUILDING_COSTS[option.building];
      if (!costs) continue;
      const canAfford = Object.entries(costs).every(
        ([r, n]) => (res[r as ResourceType] || 0) >= (n || 0),
      );
      option.label.setColor(canAfford ? '#ffffff' : '#667088');
      option.cost.setColor(canAfford ? '#c9d4f0' : '#555f77');
    }
  }

  private onBuildOptionClick(building: BuildingType): void {
    const s = this.engine.state;
    if (s.phase !== 'playing' || s.turnPhase !== 'build' || s.currentPlayer !== 'human') return;

    const hexBoard = this.scene.get('HexBoard') as HexBoard;
    const selected = hexBoard.getSelectedTile();
    if (!selected) {
      this.showMessage('Select a tile on the board first');
      return;
    }
    const tileKey = coordKey(selected.coord);

    if (building === 'farm') {
      if (selected.building) {
        this.showMessage('Farms go on an empty tile');
        return;
      }
      if (canBuild(s, 'human', 'farm')) {
        this.engine.dispatch({ type: 'BUILD', player: 'human', tileKey, building: 'farm' });
      } else {
        this.showMessage(`Can't afford a farm (${costText('farm')})`);
      }
      return;
    }

    // manor / castle = upgrade an owned lower building
    const chain: Record<string, BuildingType> = { manor: 'farm', castle: 'manor' };
    if (!selected.building || selected.building.owner !== 'human') {
      this.showMessage('Select your own building to upgrade');
      return;
    }
    if (chain[building] === selected.building.type && canUpgrade(s, 'human', tileKey, building)) {
      this.engine.dispatch({ type: 'UPGRADE', player: 'human', tileKey, to: building });
    } else {
      this.showMessage(`Can't place a ${building} there`);
    }
  }

  // --- Dice ---

  private createDiceDisplay(): void {
    const cx = CANVAS_WIDTH / 2;
    const cy = DICE.y;

    this.diceSprites = [0, 1].map((i) => {
      const sprite = this.add.sprite(cx + (i === 0 ? -DICE.spacing / 2 : DICE.spacing / 2), cy, 'dice-1');
      sprite.setDisplaySize(DICE.size, DICE.size);
      sprite.setOrigin(0.5);
      sprite.setDepth(40);
      sprite.setAlpha(0);
      return sprite;
    });

    this.diceValueText = this.add.text(cx, cy + 52, '', {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.diceValueText.setOrigin(0.5);
    this.diceValueText.setDepth(41);
    this.diceValueText.setAlpha(0);
  }

  private updateDiceDisplay(state: GameState): void {
    const { value, individualDice } = state.dice;
    if (value !== null && individualDice) {
      for (let i = 0; i < 2; i++) {
        const sprite = this.diceSprites[i];
        if (!sprite) continue;
        sprite.setAlpha(1);
        const face = individualDice[i];
        if (this.textures.exists(`dice-${face}`)) sprite.setTexture(`dice-${face}`);
      }
      if (this.diceValueText) {
        this.diceValueText.setText(`Total: ${value}`);
        this.diceValueText.setAlpha(1);
      }
    } else {
      for (const sprite of this.diceSprites) sprite?.setAlpha(0);
      this.diceValueText?.setAlpha(0);
    }
  }

  // --- Buttons ---

  private makeButton(
    label: string,
    x: number,
    y: number,
    w: number,
    h: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const bg = this.add.graphics();
    const paint = (color: number) => {
      bg.clear();
      bg.fillStyle(color, 0.92);
      bg.fillRoundedRect(0, 0, w, h, 8);
      bg.lineStyle(1, 0xffffff, 0.35);
      bg.strokeRoundedRect(0, 0, w, h, 8);
    };
    paint(0x354a7a);

    const text = this.add.text(w / 2, h / 2, label, {
      fontSize: `${Math.round(h * 0.44)}px`,
      fontFamily: 'sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);

    const container = this.add.container(x, y, [bg, text]);
    container.setDepth(70);
    container.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, w, h),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    container.on('pointerover', () => paint(0x4a63a0));
    container.on('pointerout', () => paint(0x354a7a));
    container.on('pointerdown', () => {
      if (container.visible) onClick();
    });
    return container;
  }

  private createButtons(): void {
    this.passBtn = this.makeButton('Pass', CANVAS_WIDTH - 140, 96, 120, 52, () => this.onPass());
    this.rollBtn = this.makeButton('Roll Dice', CANVAS_WIDTH / 2 - 75, DICE.y + 98, 150, 52, () => this.onRoll());
    this.passBtn.setVisible(false);
    this.rollBtn.setVisible(false);
  }

  private updateButtons(state: GameState): void {
    const isHuman = state.phase === 'playing' && state.currentPlayer === 'human';
    const inTurn =
      state.turnPhase === 'play' || state.turnPhase === 'build' || state.turnPhase === 'roll';
    if (this.passBtn) {
      // "Pass" is only meaningful in the play phase (it advances you to building).
      // In the build phase "Roll Dice" already ends the turn, so a second button
      // doing the same thing would just be confusing.
      this.passBtn.setVisible(isHuman && state.turnPhase === 'play');
    }
    if (this.rollBtn) {
      // "Roll Dice" is the way to END your turn from any action phase. Showing it
      // in the play and build phases means the human can skip building entirely
      // instead of having to click "Pass" twice to reach the roll phase.
      this.rollBtn.setVisible(isHuman && inTurn && !this.rolling);
    }
  }

  private onPass(): void {
    const s = this.engine.state;
    if (s.phase !== 'playing' || s.currentPlayer !== 'human') return;
    if (s.turnPhase === 'play') {
      this.engine.dispatch({ type: 'SET_TURN_PHASE', phase: 'build' });
    } else if (s.turnPhase === 'build') {
      this.engine.dispatch({ type: 'SET_TURN_PHASE', phase: 'roll' });
    }
  }

  private onRoll(): void {
    const s = this.engine.state;
    if (s.phase !== 'playing' || s.currentPlayer !== 'human') return;
    if (this.rolling) return;
    // The human may end their turn from the play or build phase (skipping
    // building). Advance to the roll phase first so the turn machine is in the
    // right state before we roll.
    if (s.turnPhase !== 'roll') {
      this.engine.dispatch({ type: 'SET_TURN_PHASE', phase: 'roll' });
    }
    this.rolling = true;

    this.engine.dispatch({ type: 'ROLL_DICE' });

    // little bounce
    for (const sprite of this.diceSprites) {
      if (sprite) this.tweens.add({ targets: sprite, y: sprite.y - 18, duration: 250, yoyo: true, repeat: 1 });
    }

    this.time.delayedCall(900, () => {
      const fresh = this.engine.state;
      if (fresh.phase !== 'playing' || fresh.currentPlayer !== 'human') {
        this.rolling = false;
        return;
      }
      const value = fresh.dice.value ?? 7;
      this.engine.dispatch({
        type: 'SET_DICE_VALUE',
        value,
        individualDice: fresh.dice.individualDice ?? [1, 1],
      });
      this.collectFor('human', value, this.engine.state);
      this.rolling = false;
      this.time.delayedCall(800, () => this.engine.dispatch({ type: 'ADVANCE_TURN' }));
    });
  }

  // --- Tile click ---

  private onTileClick(tileKey: string): void {
    const state = this.engine.state;

    // Setup placement
    if (state.phase === 'setup' && state.currentPlayer === 'human') {
      const tile = state.board.find((t) => coordKey(t.coord) === tileKey);
      if (!tile) return;
      if (tile.building) {
        this.showMessage('That tile is already occupied');
        return;
      }
      this.engine.dispatch({ type: 'PLACE_CASTLE', player: 'human', tileKey });
      return;
    }

    // Build phase
    if (state.phase === 'playing' && state.turnPhase === 'build' && state.currentPlayer === 'human') {
      const tile = state.board.find((t) => coordKey(t.coord) === tileKey);
      if (!tile) return;

      if (tile.building) {
        if (tile.building.owner === 'human') {
          const nextMap: Partial<Record<BuildingType, BuildingType>> = { farm: 'manor', manor: 'castle' };
          const next = nextMap[tile.building.type];
          if (next) {
            if (canUpgrade(state, 'human', tileKey, next)) {
              this.engine.dispatch({ type: 'UPGRADE', player: 'human', tileKey, to: next });
            } else {
              this.showMessage(`Not enough resources to upgrade (${costText(next)})`);
            }
          }
        } else {
          this.showMessage('That building belongs to the AI');
        }
      } else {
        if (canBuild(state, 'human', 'farm')) {
          this.engine.dispatch({ type: 'BUILD', player: 'human', tileKey, building: 'farm' });
        } else {
          this.showMessage(`Can't afford a farm (${costText('farm')})`);
        }
      }
    }
  }

  // --- Collection / messages ---

  private collectFor(player: PlayerId, value: number, state: GameState): void {
    const collected = collectResources(state.board, player, value);
    const entries = Object.entries(collected) as [ResourceType, number][];
    if (entries.length > 0) {
      this.engine.dispatch({ type: 'ADD_RESOURCES', player, resources: collected });
      if (player === 'human') {
        const desc = entries.map(([r, n]) => `${n} ${r}`).join(', ');
        this.showMessage(`Rolled ${value} — collected ${desc}`);
      }
    } else if (player === 'human') {
      this.showMessage(`Rolled ${value} — nothing collected (you need a building on a ${value} tile)`);
    }
  }

  private showMessage(text: string): void {
    // Clear then set so the HUD re-triggers its fade animation for repeated text
    this.engine.dispatch({ type: 'SET_MESSAGE', message: null });
    this.engine.dispatch({ type: 'SET_MESSAGE', message: text });
  }

  private ensurePhase(phase: TurnPhase): void {
    if (this.engine.state.turnPhase !== phase) {
      this.engine.dispatch({ type: 'SET_TURN_PHASE', phase });
    }
  }

  // --- AI turn ---

  private processAITurn(): void {
    if (this.aiProcessing) return;
    const s0 = this.engine.state;
    if (s0.phase !== 'playing' || s0.currentPlayer !== 'ai') return;
    this.aiProcessing = true;

    // The AI must walk the phase machine exactly like a human:
    //   draw → play → build → roll → (advance to the next player)
    // Each step ends by moving to the NEXT phase, so the final ADVANCE_TURN
    // lands on a fresh 'draw' with the human to play. Forgetting the
    // build→roll hop is what previously made the AI loop forever and froze the
    // game.
    const actions: Array<() => void> = [
      () => {
        this.engine.dispatch({ type: 'DRAW_CARDS', player: 'ai', count: 3 });
        this.engine.dispatch({ type: 'SET_TURN_PHASE', phase: 'play' });
      },
      () => {
        this.aiPlayCards(); // ends in the 'build' phase
      },
      () => {
        this.ensurePhase('build');
        this.aiTryBuild();
        this.ensurePhase('roll'); // hand the turn to the roll phase
      },
      () => {
        this.engine.dispatch({ type: 'ROLL_DICE' });
      },
      () => {
        const s = this.engine.state;
        const value = s.dice.value ?? 7;
        this.engine.dispatch({
          type: 'SET_DICE_VALUE',
          value,
          individualDice: s.dice.individualDice ?? [1, 1],
        });
        this.collectFor('ai', value, this.engine.state);
      },
      () => {
        this.engine.dispatch({ type: 'ADVANCE_TURN' });
      },
    ];

    let i = 0;
    const next = () => {
      const s = this.engine.state;
      // Safety: if we're no longer in the AI's turn (game ended, or the turn
      // somehow advanced), stop cleanly rather than loop forever.
      if (s.phase !== 'playing' || s.currentPlayer !== 'ai') {
        this.aiProcessing = false;
        return;
      }
      // Guard: if we're still on 'draw' when the sequence should be winding
      // down, don't re-run it — bail out and let the next state change drive it.
      if (i >= actions.length) {
        this.aiProcessing = false;
        return;
      }
      try {
        actions[i]();
      } catch (err) {
        // A throw must never wedge the turn loop — release the flag so the game
        // can recover on the next state change instead of freezing.
        console.error('[Game] AI action failed:', err);
        this.aiProcessing = false;
        return;
      }
      i += 1;
      this.time.delayedCall(850, next);
    };

    this.time.delayedCall(600, next);
  }

  private aiPlayCards(): void {
    const s = this.engine.state;
    if (s.currentPlayer !== 'ai' || s.turnPhase !== 'play') return;
    const resourceCards = s.players.ai.hand.filter((c) => c.type === 'resource');
    for (const card of resourceCards.slice(0, 2)) {
      if (!this.engine.state.players.ai.hand.find((c) => c.id === card.id)) continue;
      this.engine.dispatch({ type: 'PLAY_CARD', player: 'ai', cardId: card.id });
    }
    this.ensurePhase('build');
  }

  private aiTryBuild(): void {
    const s = this.engine.state;
    if (s.currentPlayer !== 'ai') return;

    const emptyTiles = s.board.filter((t) => t.building === null);
    if (emptyTiles.length > 0 && canBuild(s, 'ai', 'farm')) {
      const tile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
      this.engine.dispatch({ type: 'BUILD', player: 'ai', tileKey: coordKey(tile.coord), building: 'farm' });
      return;
    }

    if (Math.random() < 0.3) {
      const aiFarms = s.board.filter((t) => t.building?.owner === 'ai' && t.building.type === 'farm');
      for (const farm of aiFarms) {
        if (canUpgrade(s, 'ai', coordKey(farm.coord), 'manor')) {
          this.engine.dispatch({ type: 'UPGRADE', player: 'ai', tileKey: coordKey(farm.coord), to: 'manor' });
          break;
        }
      }
    }
  }

  // --- Victory ---

  private showVictoryScreen(winner: PlayerId): void {
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;

    const overlay = this.add.rectangle(cx, cy, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000, 0.78);
    overlay.setOrigin(0.5);
    overlay.setDepth(100);

    const humanWon = winner === 'human';
    const title = this.add.text(cx, cy - 50, humanWon ? 'You Win!' : 'AI Wins!', {
      fontSize: '52px',
      fontFamily: 'sans-serif',
      color: humanWon ? '#44ff44' : '#ff4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    });
    title.setOrigin(0.5);
    title.setDepth(101);

    const subtext = this.add.text(cx, cy + 30, 'Click to restart', {
      fontSize: '24px',
      fontFamily: 'sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    });
    subtext.setOrigin(0.5);
    subtext.setDepth(101);
    subtext.setInteractive({ useHandCursor: true });
    subtext.on('pointerdown', () => this.restartGame());
  }

  private restartGame(): void {
    this.victoryShown = false;
    this.rolling = false;
    this.aiProcessing = false;
    this.aiPlacementScheduled = -1;
    this.autoDrawTriggered = false;

    this.engine.reset();
    this.engine.initBoard();

    // Restart the scene stack fresh (same order as Boot)
    this.scene.start('HexBoard');
    this.scene.launch('HUD');
    this.scene.launch('Game');
  }
}
