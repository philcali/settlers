/**
 * HUD scene — renders the heads-up display overlay.
 *
 * Shows:
 * - Resource counts (wood, stone, grain, ore, livestock)
 * - Current turn phase
 * - Player scores
 * - Setup phase prompts
 * - Game message banners
 */

import Phaser from 'phaser';
import { getEngine } from '../engine/GameEngine';
import {
  RESOURCE_ICONS,
  PHASE_LABELS,
  SETUP_LABELS,
  HUD as HUD_CONST,
} from '../config';
import { GameState, ResourceType } from '../types/game';

interface ResourceBar {
  container: Phaser.GameObjects.Container;
  icons: Phaser.GameObjects.Text[];
  labels: Phaser.GameObjects.Text[];
}

interface ScoreBar {
  container: Phaser.GameObjects.Container;
  humanLabel: Phaser.GameObjects.Text;
  humanScore: Phaser.GameObjects.Text;
  aiLabel: Phaser.GameObjects.Text;
  aiScore: Phaser.GameObjects.Text;
}

export default class HUD extends Phaser.Scene {
  private engine = getEngine();
  private unsubscribe: (() => void) | null = null;

  private resourceBar: ResourceBar | null = null;
  private phaseText: Phaser.GameObjects.Text | null = null;
  private turnText: Phaser.GameObjects.Text | null = null;
  private scoreBar: ScoreBar | null = null;
  private messageBanner: Phaser.GameObjects.Text | null = null;
  private setupPrompt: Phaser.GameObjects.Text | null = null;
  private lastMessage: string | null = null;

  constructor() {
    super({ key: 'HUD' });
  }

  create(): void {
    this.lastMessage = null;
    this.createResourceBar();
    this.createPhaseBar();
    this.createTurnBar();
    this.createScoreBar();
    this.createMessageBanner();
    this.createSetupPrompt();

    this.unsubscribe = this.engine.subscribe(this.onStateChange.bind(this));
    this.onStateChange(this.engine.state);
  }

  shutdown(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  // --- Resource bar ---

  private createResourceBar(): void {
    const container = this.add.container(0, HUD_CONST.resourceBarY);

    const resources: ResourceType[] = ['wood', 'stone', 'grain', 'ore', 'livestock'];
    const icons: Phaser.GameObjects.Text[] = [];
    const labels: Phaser.GameObjects.Text[] = [];

    for (let i = 0; i < resources.length; i++) {
      const x = i * HUD_CONST.resourceItemWidth + 60;
      const itemContainer = this.add.container(x, 0);

      // Background
      const bg = this.add.graphics();
      const bw = HUD_CONST.resourceItemWidth - 20;
      const bh = HUD_CONST.resourceItemHeight;
      bg.fillStyle(0x000000, 0.5);
      bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
      itemContainer.add(bg);

      // Icon
      const icon = this.add.text(-30, 0, RESOURCE_ICONS[resources[i]] || '?', {
        fontSize: '20px',
      });
      icon.setOrigin(0.5);
      itemContainer.add(icon);
      icons.push(icon);

      // Count label
      const label = this.add.text(10, 0, '0', {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
      });
      label.setOrigin(0, 0.5);
      itemContainer.add(label);
      labels.push(label);

      container.add(itemContainer);
    }

    this.resourceBar = { container, icons, labels };
  }

  // --- Phase bar ---

  private createPhaseBar(): void {
    const bg = this.add.rectangle(0, HUD_CONST.phaseBarY + 16, 300, 32, 0x000000, 0.4);
    bg.setOrigin(0, 0);
    this.phaseText = this.add.text(10, HUD_CONST.phaseBarY, '', {
      fontSize: '20px',
      fontFamily: 'sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.phaseText.setOrigin(0, 0);
  }

  // --- Turn bar ---

  private createTurnBar(): void {
    this.turnText = this.add.text(0, HUD_CONST.scoreBarY + 36, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
    });
    this.turnText.setOrigin(0, 0);
  }

  // --- Score bar ---

  private createScoreBar(): void {
    const container = this.add.container(0, HUD_CONST.scoreBarY);

    const humanLabel = this.add.text(0, 0, 'You:', {
      fontSize: '16px',
      fontFamily: 'sans-serif',
      color: '#4488ff',
      fontStyle: 'bold',
    });
    humanLabel.setOrigin(0, 0);
    container.add(humanLabel);

    const humanScore = this.add.text(40, 0, '0', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    humanScore.setOrigin(0, 0);
    container.add(humanScore);

    const aiLabel = this.add.text(100, 0, 'AI:', {
      fontSize: '16px',
      fontFamily: 'sans-serif',
      color: '#ff4444',
      fontStyle: 'bold',
    });
    aiLabel.setOrigin(0, 0);
    container.add(aiLabel);

    const aiScore = this.add.text(135, 0, '0', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    aiScore.setOrigin(0, 0);
    container.add(aiScore);

    this.scoreBar = { container, humanLabel, humanScore, aiLabel, aiScore };
  }

  // --- Message banner ---

  private createMessageBanner(): void {
    this.messageBanner = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 60,
      '',
      {
        fontSize: '28px',
        fontFamily: 'sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      },
    );
    this.messageBanner.setOrigin(0.5);
    this.messageBanner.setAlpha(0);
  }

  // --- Setup prompt ---

  private createSetupPrompt(): void {
    this.setupPrompt = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 120,
      '',
      {
        fontSize: '24px',
        fontFamily: 'sans-serif',
        color: '#ffdd44',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      },
    );
    this.setupPrompt.setOrigin(0.5);
    this.setupPrompt.setAlpha(0);
  }

  // --- State change handler ---

  private onStateChange(state: GameState): void {
    this.updateResources(state);
    this.updatePhase(state);
    this.updateTurn(state);
    this.updateScores(state);
    this.updateMessage(state);
    this.updateSetupPrompt(state);
  }

  private updateResources(state: GameState): void {
    if (!this.resourceBar) return;

    const humanResources = state.players.human.resources;

    for (let i = 0; i < 5; i++) {
      const resource = ['wood', 'stone', 'grain', 'ore', 'livestock'][i] as ResourceType;
      const count = humanResources[resource] || 0;
      this.resourceBar.labels[i].setText(String(count));
    }
  }

  private updatePhase(state: GameState): void {
    if (!this.phaseText) return;

    let text: string;

    if (state.phase === 'setup') {
      text = 'Initial Placement';
    } else if (state.phase === 'ended') {
      text = 'Game Over';
    } else {
      const phaseLabel = PHASE_LABELS[state.turnPhase] || '';
      const playerLabel = state.currentPlayer === 'human' ? 'Your' : "AI's";
      text = `${playerLabel} turn — ${phaseLabel}`;
    }

    this.phaseText.setText(text);
  }

  private updateTurn(state: GameState): void {
    if (!this.turnText) return;

    if (state.phase === 'playing') {
      this.turnText.setText(`Turn ${state.turnCount + 1}`);
    } else {
      this.turnText.setText('');
    }
  }

  private updateScores(state: GameState): void {
    if (!this.scoreBar) return;

    const humanScore = this.countVictoryPoints('human', state.board);
    const aiScore = this.countVictoryPoints('ai', state.board);

    this.scoreBar.humanScore.setText(String(humanScore));
    this.scoreBar.aiScore.setText(String(aiScore));
  }

  private countVictoryPoints(player: 'human' | 'ai', board: GameState['board']): number {
    let points = 0;
    for (const tile of board) {
      if (tile.building?.owner === player) {
        const pointsMap: Record<string, number> = { farm: 0, manor: 1, castle: 2 };
        points += pointsMap[tile.building.type] || 0;
      }
    }
    return points;
  }

  private updateMessage(state: GameState): void {
    if (!this.messageBanner) return;

    const message = state.message;

    // Skip if nothing changed — an in-flight fade tween still runs.
    if (message === this.lastMessage) {
      return;
    }
    this.lastMessage = message;

    this.tweens.killTweensOf(this.messageBanner);

    if (message) {
      this.messageBanner.setText(message);
      this.messageBanner.setAlpha(1);

      // Fade out after a short hold
      this.tweens.add({
        targets: this.messageBanner,
        alpha: 0,
        duration: 1500,
        delay: 2000,
        ease: 'Linear',
      });
    } else {
      this.messageBanner.setAlpha(0);
    }
  }

  private updateSetupPrompt(state: GameState): void {
    if (!this.setupPrompt) return;

    if (state.phase === 'setup') {
      const round = state.setupRound;
      if (round >= 0 && round < 4) {
        const label = SETUP_LABELS[round] || '';
        this.setupPrompt.setText(label);
        this.setupPrompt.setAlpha(1);
      } else {
        this.setupPrompt.setAlpha(0);
      }
    } else {
      this.setupPrompt.setAlpha(0);
    }
  }
}
