// --- Core enums ---

export type ProvinceType = 'forest' | 'quarry' | 'farmland' | 'mine' | 'pasture' | 'desert';
export type ResourceType = 'wood' | 'stone' | 'grain' | 'ore' | 'livestock';
export type CardType = 'resource' | 'title' | 'event';
export type BuildingType = 'farm' | 'manor' | 'castle';
export type GamePhase = 'setup' | 'playing' | 'ended';
export type TurnPhase = 'draw' | 'play' | 'build' | 'roll';
export type PlayerId = 'human' | 'ai';

// --- Hex grid ---

export type HexCoord = { q: number; r: number };

export function coordKey(c: HexCoord): string {
  return `${c.q},${c.r}`;
}

export function keyToCoord(key: string): HexCoord {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

export type HexTile = {
  coord: HexCoord;
  province: ProvinceType;
  numberToken: number | null;
  hasBandit: boolean;
  building: { type: BuildingType; owner: PlayerId } | null;
};

// --- Players ---

export type PlayerState = {
  id: PlayerId;
  name: string;
  resources: Record<ResourceType, number>;
  hand: Card[];
  buildings: Map<string, BuildingType>;
  victoryPoints: number;
};

// --- Cards ---

export type Card = {
  id: string;
  type: CardType;
  subtype: string;
};

export type Deck = {
  cards: Card[];
  discardPile: Card[];
};

// --- Game state ---

export type DiceState = {
  value: number | null;
  isRolled: boolean;
  isAnimating: boolean;
  individualDice: [number, number];
};

export type GameState = {
  phase: GamePhase;
  turnPhase: TurnPhase;
  currentPlayer: PlayerId;
  players: Record<PlayerId, PlayerState>;
  board: HexTile[];
  dice: DiceState;
  banditPosition: HexCoord | null;
  deck: Deck;
  turnCount: number;
  winner: PlayerId | null;
  log: LogEntry[];
  message: string | null;
};

export type LogEntry = {
  turn: number;
  player: PlayerId;
  action: string;
};

// --- AI ---

export type AIEvaluation = {
  action: AIAction;
  score: number;
};

export type AIAction =
  | { type: 'play-card'; cardId: string }
  | { type: 'build'; tileKey: string; building: BuildingType }
  | { type: 'upgrade'; tileKey: string; to: BuildingType }
  | { type: 'trade'; offer: Partial<Record<ResourceType, number>>; request: Partial<Record<ResourceType, number>> }
  | { type: 'pass' }
  | { type: 'move-bandit'; target: HexCoord }
  | { type: 'draw-cards'; count: number }
  | { type: 'gain-resources'; resource: ResourceType; count: number }
  | { type: 'reveal-hand'; target: PlayerId };

// --- Building costs ---

export const BUILDING_COSTS: Record<BuildingType, Partial<Record<ResourceType, number>>> = {
  farm: { wood: 2, grain: 1 },
  manor: { stone: 3, ore: 2, grain: 2 },
  castle: { stone: 4, ore: 4, livestock: 3, grain: 3 },
};

export const BUILDING_POINTS: Record<BuildingType, number> = {
  farm: 0,
  manor: 1,
  castle: 2,
};

// --- Province art paths ---

export const PROVINCE_ASSETS: Record<ProvinceType, string> = {
  forest: '/assets/tiles/forest.png',
  quarry: '/assets/tiles/quarry.png',
  farmland: '/assets/tiles/farmland.png',
  mine: '/assets/tiles/mine.png',
  pasture: '/assets/tiles/pasture.png',
  desert: '/assets/tiles/desert.png',
};

// --- Card deck composition ---

export type CardSpec = {
  type: CardType;
  subtype: string;
  count: number;
};

export const CARD_DECK_SPECS: CardSpec[] = [
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

// --- Game action types (reducer) ---

export type GameAction =
  | { type: 'SET_PHASE'; phase: GamePhase }
  | { type: 'SET_TURN_PHASE'; phase: TurnPhase }
  | { type: 'SET_MESSAGE'; message: string | null }
  | { type: 'SET_BOARD'; board: HexTile[] }
  | { type: 'ADVANCE_TURN' }
  | { type: 'PLACE_CASTLE'; player: PlayerId; tileKey: string }
  | { type: 'INITIAL_PLACEMENT_DONE' }
  | { type: 'DRAW_CARDS'; player: PlayerId; count: number }
  | { type: 'PLAY_CARD'; player: PlayerId; cardId: string }
  | { type: 'DISCARD_CARDS'; player: PlayerId; count: number }
  | { type: 'ADD_RESOURCES'; player: PlayerId; resources: Partial<Record<ResourceType, number>> }
  | { type: 'REMOVE_RESOURCES'; player: PlayerId; resources: Partial<Record<ResourceType, number>> }
  | { type: 'BUILD'; player: PlayerId; tileKey: string; building: BuildingType }
  | { type: 'UPGRADE'; player: PlayerId; tileKey: string; to: BuildingType }
  | { type: 'ROLL_DICE' }
  | { type: 'SET_DICE_VALUE'; value: number; individualDice: [number, number] }
  | { type: 'COLLECT_RESOURCES'; player: PlayerId }
  | { type: 'MOVE_BANDIT'; player: PlayerId; target: HexCoord }
  | { type: 'EXECUTE_TRADE'; from: PlayerId; to: PlayerId; offer: Partial<Record<ResourceType, number>>; request: Partial<Record<ResourceType, number>> }
  | { type: 'AI_ACT'; action: AIAction }
  | { type: 'RESET_GAME' };
