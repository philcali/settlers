// --- Phaser game configuration constants ---

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

// Hex grid sizing
// NOTE: board.ts `hexToScreen` uses HEX_SIZE=64 as the pointy-top circumradius for
// center-to-center spacing (horizontal neighbor distance = sqrt(3)*64 ≈ 110.85).
// We render hexagons with a slightly smaller circumradius (TILE_SIZE) so there is a
// visible gap between tiles: sqrt(3)*56 ≈ 97 width vs 110.85 spacing.
export const HEX_SIZE = 48;
export const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
export const HEX_HEIGHT = 2 * HEX_SIZE;

// Render circumradius (pointy-top) for each hexagon — must be < 64 (board spacing)
export const TILE_SIZE = 56;

// Board center offset (tiles rendered around this point)
export const BOARD_CENTER_X = CANVAS_WIDTH / 2;
export const BOARD_CENTER_Y = CANVAS_HEIGHT / 2 + 40;

// Camera bounds (larger than canvas for panning)
export const CAMERA_BOUNDS = {
  width: CANVAS_WIDTH * 3,
  height: CANVAS_HEIGHT * 3,
};

// Province colors (flat-top hex palette)
export const PROVINCE_COLORS: Record<string, string> = {
  forest: '#2d6a2e',
  quarry: '#7a7a7a',
  farmland: '#c4a83e',
  mine: '#5c3d2e',
  pasture: '#6db86d',
  desert: '#d4b96a',
};

// Province border colors
export const PROVINCE_BORDERS: Record<string, string> = {
  forest: '#1e4f1f',
  quarry: '#5a5a5a',
  farmland: '#a08a30',
  mine: '#3d271c',
  pasture: '#4a8a4a',
  desert: '#b89e50',
};

// Building colors
export const BUILDING_COLORS: Record<string, string> = {
  farm: '#e8dcc8',
  manor: '#c8b898',
  castle: '#a08868',
};

// Building border colors
export const BUILDING_BORDERS: Record<string, string> = {
  farm: '#b8a888',
  manor: '#988868',
  castle: '#705838',
};

// Number token colors
export const NUMBER_TOKEN_COLORS: Record<number, string> = {
  2: '#e74c3c',
  3: '#e67e22',
  4: '#f1c40f',
  5: '#2ecc71',
  6: '#3498db',
  8: '#9b59b6',
  9: '#e74c3c',
  10: '#e67e22',
  11: '#f1c40f',
  12: '#2ecc71',
};

// Resource colors for HUD
export const RESOURCE_COLORS: Record<string, string> = {
  wood: '#2d6a2e',
  stone: '#7a7a7a',
  grain: '#c4a83e',
  ore: '#5c3d2e',
  livestock: '#6db86d',
};

// Resource icons (emoji fallback)
export const RESOURCE_ICONS: Record<string, string> = {
  wood: '🪵',
  stone: '🪨',
  grain: '🌾',
  ore: '⛏️',
  livestock: '🐄',
};

// HUD positioning
export const HUD = {
  resourceBarY: 10,
  resourceBarHeight: 48,
  phaseBarY: 64,
  phaseBarHeight: 32,
  scoreBarY: 100,
  scoreBarHeight: 32,
  resourceItemWidth: 120,
  resourceItemHeight: 36,
};

// Phase display text
export const PHASE_LABELS: Record<string, string> = {
  draw: 'Draw Phase',
  play: 'Play Phase',
  build: 'Build Phase',
  roll: 'Roll Dice',
};

// Setup phase labels
export const SETUP_LABELS: Record<number, string> = {
  0: 'Place your farm',
  1: 'AI placing...',
  2: 'Place your farm',
  3: 'AI placing...',
};

// Camera defaults
export const CAMERA = {
  defaultZoom: 1,
  minZoom: 0.5,
  maxZoom: 2,
  panSpeed: 8,
  zoomDuration: 300,
};

// Tile selection highlight
export const TILE_HIGHLIGHT_COLOR = 0xffffff;
export const TILE_HIGHLIGHT_ALPHA = 0.3;
export const TILE_HOVER_COLOR = 0xffffff;
export const TILE_HOVER_ALPHA = 0.15;

// Dice positions (relative to board center)
export const DICE = {
  y: CANVAS_HEIGHT / 2 - 80,
  spacing: 78,
  size: 52,
};

// Card hand positioning
export const CARD = {
  handY: CANVAS_HEIGHT - 158,
  width: 96,
  height: 126,
  overlap: 16,
  selectedOffset: -30,
};

// Build panel positioning
export const BUILD_PANEL = {
  x: 20,
  y: CANVAS_HEIGHT - 212,
  width: 226,
  height: 184,
};
