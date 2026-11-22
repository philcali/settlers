// --- Core types ---

export type Province = 'forest' | 'quarry' | 'farmland' | 'mine' | 'pasture' | 'desert';
export type Resource = 'wood' | 'stone' | 'grain' | 'ore' | 'livestock';
export type BuildingType = 'farm' | 'manor' | 'castle';
export type CardType = 'resource' | 'title' | 'event';
export type PlayerId = 'human' | 'ai';
export type GamePhase = 'setup' | 'playing' | 'ended';
export type TurnPhase = 'draw' | 'play' | 'build' | 'roll';

export interface Coord {
  q: number;
  r: number;
}

export const coordKey = (c: Coord): string => `${c.q},${c.r}`;

export const keyToCoord = (key: string): Coord => {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
};

// --- Board ---

export interface Building {
  type: BuildingType;
  owner: PlayerId;
}

export interface Tile {
  coord: Coord;
  province: Province;
  numberToken: number | null;
  building: Building | null;
  hasBandit: boolean;
}

// --- Cards & deck ---

export interface Card {
  id: string;
  type: CardType;
  subtype: string;
}

export interface Deck {
  cards: Card[];
  discard: Card[];
}

// --- Players ---

export interface PlayerState {
  id: PlayerId;
  name: string;
  resources: Record<Resource, number>;
  hand: Card[];
}

// --- Game state ---

export interface DiceState {
  value: number | null;
  individual: [number, number] | null;
}

export interface LogEntry {
  turn: number;
  player: PlayerId | null;
  action: string;
}

export interface RevealState {
  by: PlayerId;
  cards: Card[];
  nonce: number;
}

export interface GameState {
  phase: GamePhase;
  turnPhase: TurnPhase;
  currentPlayer: PlayerId;
  placementsLeft: Record<PlayerId, number>;
  players: Record<PlayerId, PlayerState>;
  board: Tile[];
  dice: DiceState;
  deck: Deck;
  turnCount: number;
  winner: PlayerId | null;
  message: string | null;
  log: LogEntry[];
  /** Seed the game was created with (kept for deterministic derivations). */
  seed: number;
  /** Latest Spy Network reveal (null if none yet). */
  reveal: RevealState | null;
  /** Set when the AI has already played a card this turn (AI plays at most one). */
  aiPlayedCard: boolean;
  /** Who still has to place the bandit after rolling a 7 (null when nobody does). */
  robberPending: PlayerId | null;
}

// --- Actions ---

export type GameAction =
  | { type: 'NEW_GAME'; seed: number }
  | { type: 'PLACE_BUILDING'; player: PlayerId; tileKey: string }
  | { type: 'ADD_RESOURCES'; player: PlayerId; resources: Partial<Record<Resource, number>> }
  | { type: 'REMOVE_RESOURCES'; player: PlayerId; resources: Partial<Record<Resource, number>> }
  | { type: 'DRAW_CARDS'; player: PlayerId; count: number; seed: number }
  | { type: 'BUILD'; player: PlayerId; tileKey: string; building: BuildingType }
  | { type: 'UPGRADE'; player: PlayerId; tileKey: string; to: BuildingType }
  | { type: 'SET_TURN_PHASE'; phase: TurnPhase }
  /** Swaps players, resets the dice, and the new player draws one card. */
  | { type: 'ADVANCE_TURN'; seed: number }
  | { type: 'PLAY_CARD'; player: PlayerId; cardId: string; seed: number }
  | { type: 'ROLL_DICE'; value: number; individual: [number, number]; seed: number }
  /** Places the bandit (after a 7) onto one of the roller's legal tiles. */
  | { type: 'MOVE_BANDIT'; player: PlayerId; tileKey: string }
  | { type: 'SET_MESSAGE'; message: string | null };

// --- Static game data ---

export const RESOURCES: Resource[] = ['wood', 'stone', 'grain', 'ore', 'livestock'];

export const PROVINCE_RESOURCE: Record<Exclude<Province, 'desert'>, Resource> = {
  forest: 'wood',
  quarry: 'stone',
  farmland: 'grain',
  mine: 'ore',
  pasture: 'livestock',
};

export const BUILDING_COSTS: Record<BuildingType, Partial<Record<Resource, number>>> = {
  farm: { wood: 2, grain: 1 },
  manor: { stone: 3, ore: 2, grain: 2 },
  castle: { stone: 4, ore: 4, livestock: 3, grain: 3 },
};

export const BUILDING_POINTS: Record<BuildingType, number> = {
  farm: 0,
  manor: 1,
  castle: 2,
};

export const VICTORY_POINTS = 10;

export interface CardSpec {
  type: CardType;
  subtype: string;
  count: number;
}

export const CARD_SPECS: CardSpec[] = [
  { type: 'resource', subtype: 'wood', count: 12 },
  { type: 'resource', subtype: 'stone', count: 12 },
  { type: 'resource', subtype: 'grain', count: 12 },
  { type: 'resource', subtype: 'ore', count: 12 },
  { type: 'resource', subtype: 'livestock', count: 12 },
  { type: 'title', subtype: 'royal-decree', count: 4 },
  { type: 'title', subtype: 'plague', count: 4 },
  { type: 'title', subtype: 'crusade', count: 4 },
  { type: 'title', subtype: 'spy-network', count: 4 },
  { type: 'title', subtype: 'mercenary-company', count: 4 },
  { type: 'event', subtype: 'harvest-festival', count: 4 },
  { type: 'event', subtype: 'famine', count: 4 },
  { type: 'event', subtype: 'relic-hunt', count: 4 },
];

export const RESOURCE_ART: Record<Resource, string> = {
  wood: `${import.meta.env.BASE_URL}assets/cards/resource-wood.png`,
  stone: `${import.meta.env.BASE_URL}assets/cards/resource-stone.png`,
  grain: `${import.meta.env.BASE_URL}assets/cards/resource-grain.png`,
  ore: `${import.meta.env.BASE_URL}assets/cards/resource-ore.png`,
  livestock: `${import.meta.env.BASE_URL}assets/cards/resource-livestock.png`,
};

export const CARD_ART: Record<string, string> = {
  ...RESOURCE_ART,
  'royal-decree': `${import.meta.env.BASE_URL}assets/cards/title-royal-decree.png`,
  plague: `${import.meta.env.BASE_URL}assets/cards/title-plague.png`,
  crusade: `${import.meta.env.BASE_URL}assets/cards/title-crusade.png`,
  'spy-network': `${import.meta.env.BASE_URL}assets/cards/title-spy-network.png`,
  'mercenary-company': `${import.meta.env.BASE_URL}assets/cards/title-mercenary-company.png`,
  'harvest-festival': `${import.meta.env.BASE_URL}assets/cards/event-harvest-festival.png`,
  famine: `${import.meta.env.BASE_URL}assets/cards/event-famine.png`,
  'relic-hunt': `${import.meta.env.BASE_URL}assets/cards/event-relic-hunt.png`,
};
