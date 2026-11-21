/**
 * GameEngine — wraps the existing game-reducer.ts state machine.
 *
 * Exposes a read-only GameState snapshot + dispatch method.
 * This is the single source of truth for all Phaser scenes.
 *
 * The existing pure game logic (board.ts, rules.ts, deck.ts, dice.ts,
 * card-effects.ts) is untouched — they're imported and used internally.
 */

import { GameState, PlayerId, GameAction } from '../types/game';
import { createInitialState, gameReducer } from '../state/game-reducer';
import { createDeck } from '../game/deck';
import { getAllTiles, assignProvinces, assignNumberTokens } from '../game/board';

// --- Callback type for state change notifications ---

export type StateChangeListener = (state: GameState) => void;

// --- Engine class ---

export class GameEngine {
  private gameState: GameState;
  private listeners: Set<StateChangeListener> = new Set();

  constructor() {
    this.gameState = createInitialState();
  }

  // --- Accessors ---

  get state(): GameState {
    return this.gameState;
  }

  get phase(): GameState['phase'] {
    return this.gameState.phase;
  }

  get turnPhase(): string {
    return this.gameState.turnPhase;
  }

  get currentPlayer(): PlayerId {
    return this.gameState.currentPlayer;
  }

  get board() {
    return this.gameState.board;
  }

  get players() {
    return this.gameState.players;
  }

  get dice() {
    return this.gameState.dice;
  }

  get deck() {
    return this.gameState.deck;
  }

  get setupRound(): number {
    return this.gameState.setupRound;
  }

  get turnCount(): number {
    return this.gameState.turnCount;
  }

  get winner(): PlayerId | null {
    return this.gameState.winner;
  }

  get message(): string | null {
    return this.gameState.message;
  }

  get banditPosition() {
    return this.gameState.banditPosition;
  }

  // --- Subscription ---

  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Dispatch ---

  dispatch(action: GameAction): GameState {
    const prevState = { ...this.gameState };
    this.gameState = gameReducer(this.gameState, action);

    // Notify listeners only if state actually changed
    if (prevState !== this.gameState) {
      this.notifyListeners();
    }

    return this.gameState;
  }

  // --- Board initialization ---

  initBoard(): void {
    const tiles = getAllTiles();
    const withProvinces = assignProvinces(tiles);
    const withNumbers = assignNumberTokens(withProvinces);
    const deck = createDeck();

    this.gameState = {
      ...this.gameState,
      board: withNumbers,
      deck,
      phase: 'setup',
      turnPhase: 'draw',
      currentPlayer: 'human',
      setupRound: 0,
    };

    // Draw initial cards
    this.dispatch({ type: 'DRAW_CARDS', player: 'human', count: 3 });
    this.dispatch({ type: 'DRAW_CARDS', player: 'ai', count: 3 });

    this.notifyListeners();
  }

  // --- Lifecycle ---

  reset(): void {
    this.gameState = createInitialState();
    this.notifyListeners();
  }

  // --- Internal ---

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.gameState);
    }
  }
}

// --- Singleton instance (used by Phaser scenes) ---

let engine: GameEngine | null = null;

export function getEngine(): GameEngine {
  if (!engine) {
    engine = new GameEngine();
  }
  return engine;
}

export function resetEngine(): void {
  engine = null;
}
