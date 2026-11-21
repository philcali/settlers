/**
 * HexBoard scene — renders the hex grid and handles tile interaction.
 *
 * Manages:
 * - Hex tile rendering (flat-top, 19-tile flower pattern)
 * - Camera panning and zooming
 * - Tile selection/hover highlighting
 * - Building markers on tiles
 * - Bandit token
 * - Number tokens on tiles
 */

import Phaser from 'phaser';
import { getEngine, GameEngine } from '../engine/GameEngine';
import {
  BOARD_CENTER_X,
  BOARD_CENTER_Y,
  PROVINCE_COLORS,
  PROVINCE_BORDERS,
  BUILDING_COLORS,
  BUILDING_BORDERS,
  NUMBER_TOKEN_COLORS,
  TILE_HIGHLIGHT_COLOR,
  TILE_HIGHLIGHT_ALPHA,
  TILE_HOVER_COLOR,
  TILE_HOVER_ALPHA,
  CAMERA,
  TILE_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CARD,
  HUD,
} from '../config';
import { HexCoord, coordKey, HexTile, BuildingType } from '../types/game';
import { getNeighbors, isValidTile, getAllTiles, hexToScreen } from '../game/board';

// --- Tile data interface ---

interface TileDisplay {
  key: string;
  coord: HexCoord;
  // World position (board-center based) — used for placement + hit-testing
  x: number;
  y: number;
  // Base province hexagon (drawn at local 0,0 on a graphic positioned at x,y)
  graphic: Phaser.GameObjects.Graphics;
  // Building marker overlay (same position as base)
  buildingGraphic: Phaser.GameObjects.Graphics;
  // Number token circle (same position as base)
  numberGraphic: Phaser.GameObjects.Graphics;
  // Number token text
  numberText: Phaser.GameObjects.Text | null;
  // Hover / selection / valid-tile overlay (drawn on top of the base hex)
  highlight: Phaser.GameObjects.Graphics;
}

export default class HexBoard extends Phaser.Scene {
  private tiles: Map<string, TileDisplay> = new Map();
  private selectedTile: string | null = null;
  private hoveredTile: string | null = null;
  private engine: GameEngine = getEngine();
  private unsubscribe: (() => void) | null = null;

  // Single shared bandit token (moved to its tile on state change)
  private banditSprite: Phaser.GameObjects.Sprite | null = null;

  // Movement (screen px) before a press becomes a drag. Kept generous so a
  // jittery touch-tap still registers as a tap rather than nudging the board.
  private readonly DRAG_THRESHOLD = 20;
  // Input state
  private pointerDown = false;
  private dragStart: { x: number; y: number } | null = null;
  // World point under the finger at the start of the drag (kept fixed so the
  // camera can be re-anchored to it each frame — gives true 1:1 follow)
  private grabWorld: { x: number; y: number } | null = null;
  private isDragging = false;

  constructor() {
    super({ key: 'HexBoard' });
  }

  create(): void {
    const camera = this.cameras.main;

    // Allow a little panning slack but keep the board from flying off-screen.
    camera.setBounds(-200, -200, CANVAS_WIDTH + 400, CANVAS_HEIGHT + 400);
    camera.setRoundPixels(true);

    // Fit the whole board into the band between the HUD (top) and the card hand
    // (bottom) so every tile is visible and clickable — nothing hidden behind UI.
    const boardHalfH = 248; // radius-2 flower half-height (HEX_SIZE 64 in board.ts)
    const availTop = HUD.scoreBarY + HUD.scoreBarHeight + 8;
    const availBottom = CARD.handY - 4;
    const fitZoom = Phaser.Math.Clamp(
      (availBottom - availTop) / (boardHalfH * 2),
      CAMERA.minZoom,
      CAMERA.maxZoom,
    );
    camera.setZoom(fitZoom);
    // Anchor the board's top edge to availTop (this centres it in the band)
    const boardTopWorld = BOARD_CENTER_Y - boardHalfH;
    camera.setScroll(0, boardTopWorld - availTop / fitZoom);

    // Create tile graphics
    this.createTiles();

    // Shared bandit token (positioned by redrawBandit)
    this.banditSprite = this.add.sprite(0, 0, 'bandit');
    this.banditSprite.setDisplaySize(30, 30);
    this.banditSprite.setOrigin(0.5);
    this.banditSprite.setDepth(8);
    this.banditSprite.setVisible(false);

    // Subscribe to state changes
    this.unsubscribe = this.engine.subscribe(this.onStateChange.bind(this));

    // Input handlers
    this.setupInput();

    console.log('[HexBoard] Scene created');
  }

  shutdown(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  // --- Tile creation ---

  private createTiles(): void {
    const allTiles = getAllTiles();
    const boardCenter = { x: BOARD_CENTER_X, y: BOARD_CENTER_Y };

    for (const coord of allTiles) {
      const key = coordKey(coord);
      const tile = this.engine.board.find((t) => coordKey(t.coord) === key);
      if (!tile) continue;

      const pos = hexToScreen(coord, boardCenter);
      const x = pos.x;
      const y = pos.y;

      // Base province hexagon (graphic positioned at the tile's world position)
      const graphic = this.add.graphics();
      graphic.setPosition(x, y);
      graphic.setDepth(1);
      this.applyProvinceStyle(graphic, tile.province);

      // Building marker overlay
      const buildingGraphic = this.add.graphics();
      buildingGraphic.setPosition(x, y);
      buildingGraphic.setDepth(3);

      // Number token circle
      const numberGraphic = this.add.graphics();
      numberGraphic.setPosition(x, y);
      numberGraphic.setDepth(4);
      if (tile.numberToken !== null) {
        const rawColor = NUMBER_TOKEN_COLORS[tile.numberToken] || '#cccccc';
        const color = this.hexToNumber(rawColor);
        numberGraphic.fillStyle(color, 0.9);
        numberGraphic.fillCircle(0, -14, 13);
        numberGraphic.lineStyle(1, 0x000000, 0.6);
        numberGraphic.strokeCircle(0, -14, 13);
      }

      // Number token text (world coordinates)
      let numberText: Phaser.GameObjects.Text | null = null;
      if (tile.numberToken !== null) {
        numberText = this.add.text(x, y - 14, String(tile.numberToken), {
          fontSize: '15px',
          fontFamily: 'monospace',
          color: '#000000',
          fontStyle: 'bold',
        });
        numberText.setOrigin(0.5);
        numberText.setDepth(5);
      }

      // Highlight overlay (hover / selection / valid-tile)
      const highlight = this.add.graphics();
      highlight.setPosition(x, y);
      highlight.setDepth(2);

      this.tiles.set(key, {
        key,
        coord,
        x,
        y,
        graphic,
        buildingGraphic,
        numberGraphic,
        numberText,
        highlight,
      });
    }

    // Draw initial building markers + bandit
    this.redrawBuildings();
    this.redrawBandit();
  }

  // --- State change handler ---

  private onStateChange(): void {
    // Redraw buildings when board changes
    this.redrawBuildings();

    // Move shared bandit token
    this.redrawBandit();

    // Update selection / hover highlight
    this.updateHighlight();
  }

  // --- Drawing ---

  // Draw a pointy-top hexagon centered at the graphic's local (0,0)
  private drawHex(
    graphic: Phaser.GameObjects.Graphics,
    fill: number,
    border: number,
    borderWidth: number,
    alpha = 1,
  ): void {
    const pts = this.hexPoints(TILE_SIZE);
    graphic.fillStyle(fill, alpha);
    graphic.fillPoints(pts, true);
    graphic.lineStyle(borderWidth, border, alpha);
    graphic.strokePoints(pts, true);
  }

  // Flat array of [x, y] vertex pairs for a pointy-top hexagon of circumradius `size`
  private hexPoints(size: number): number[] {
    const pts: number[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      pts.push(size * Math.cos(angle), size * Math.sin(angle));
    }
    return pts;
  }

  private applyProvinceStyle(graphic: Phaser.GameObjects.Graphics, province: string): void {
    graphic.clear();
    const color = this.hexToNumber(PROVINCE_COLORS[province]) || 0x888888;
    const border = this.hexToNumber(PROVINCE_BORDERS[province]) || 0x444444;
    this.drawHex(graphic, color, border, 2);
  }

  private hexToNumber(hex: string | number): number {
    if (typeof hex === 'number') return hex;
    if (hex.startsWith('#')) {
      return parseInt(hex.slice(1), 16);
    }
    return parseInt(hex, 16);
  }

  private redrawBuildings(): void {
    for (const tile of this.engine.board) {
      const key = coordKey(tile.coord);
      const display = this.tiles.get(key);
      if (!display) continue;

      display.buildingGraphic.clear();

      if (tile.building) {
        const rawColor = BUILDING_COLORS[tile.building.type] || '#ffffff';
        const color = this.hexToNumber(rawColor);
        const rawBorder = BUILDING_BORDERS[tile.building.type] || '#000000';
        const border = this.hexToNumber(rawBorder);

        // Smaller inner hexagon as the building marker
        const bpts = this.hexPoints(TILE_SIZE * 0.42);
        display.buildingGraphic.fillStyle(color, 0.85);
        display.buildingGraphic.fillPoints(bpts, true);
        display.buildingGraphic.lineStyle(2, border, 0.8);
        display.buildingGraphic.strokePoints(bpts, true);

        // Owner indicator (colored ring)
        const ownerColor = tile.building.owner === 'human' ? 0x4488ff : 0xff4444;
        display.buildingGraphic.lineStyle(3, ownerColor, 1);
        display.buildingGraphic.strokePoints(this.hexPoints(TILE_SIZE * 0.5), true);
      }
    }
  }

  private redrawBandit(): void {
    if (!this.banditSprite) return;

    const banditPos = this.engine.banditPosition;
    if (banditPos) {
      const key = coordKey(banditPos);
      const display = this.tiles.get(key);
      if (display) {
        this.banditSprite.setPosition(display.x, display.y);
        this.banditSprite.setVisible(true);
        return;
      }
    }
    this.banditSprite.setVisible(false);
  }

  // --- Highlighting ---

  private updateHighlight(): void {
    // Clear all highlight overlays (base province hexes stay untouched)
    for (const display of this.tiles.values()) {
      display.highlight.clear();
    }

    // Hover highlight (subtle fill)
    if (this.hoveredTile && this.hoveredTile !== this.selectedTile) {
      const display = this.tiles.get(this.hoveredTile);
      if (display) {
        this.drawHex(display.highlight, TILE_HOVER_COLOR, TILE_HOVER_COLOR, 1, TILE_HOVER_ALPHA);
      }
    }

    // Selection highlight (fill + bright border)
    if (this.selectedTile) {
      const display = this.tiles.get(this.selectedTile);
      if (display) {
        this.drawHex(display.highlight, TILE_HIGHLIGHT_COLOR, TILE_HIGHLIGHT_COLOR, 3, TILE_HIGHLIGHT_ALPHA);
      }
    }
  }

  // --- Input handling ---

  private setupInput(): void {
    const camera = this.cameras.main;

    // Pointer down — arm panning; remember the world point under the finger and
    // the screen position the press started at.
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.pointerDown = true;
      this.isDragging = false;
      this.dragStart = { x: ptr.x, y: ptr.y };
      this.grabWorld = camera.getWorldPoint(ptr.x, ptr.y);
    });

    // Pointer move — pan 1:1 with the finger once past the threshold; else hover
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (this.pointerDown) {
        // Arm the drag only after real movement (a tap never pans)
        if (!this.isDragging && this.dragStart) {
          const dx = ptr.x - this.dragStart.x;
          const dy = ptr.y - this.dragStart.y;
          if (Math.sqrt(dx * dx + dy * dy) > this.DRAG_THRESHOLD) {
            this.isDragging = true;
          }
        }
        if (this.isDragging && this.grabWorld) {
          // Re-anchor the camera so the grabbed world point stays under the
          // finger. Direct scroll write = immediate, no animation, error-free.
          camera.scrollX = this.grabWorld.x - ptr.x / camera.zoom;
          camera.scrollY = this.grabWorld.y - ptr.y / camera.zoom;
        }
        return;
      }

      // Hover detection (no button/finger pressed)
      const wp = camera.getWorldPoint(ptr.x, ptr.y);
      const tile = this.getTileAtPointer(wp.x, wp.y);
      const newHovered = tile ? coordKey(tile.coord) : null;
      if (newHovered !== this.hoveredTile) {
        this.hoveredTile = newHovered;
        this.updateHighlight();
      }
    });

    // Pointer up — a tap selects a tile; a drag is ignored
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      const wasDragging = this.isDragging;
      this.resetPointerState();

      if (wasDragging) return;

      const wp = camera.getWorldPoint(ptr.x, ptr.y);
      const tile = this.getTileAtPointer(wp.x, wp.y);
      if (tile) {
        const key = coordKey(tile.coord);
        this.selectedTile = key;
        this.updateHighlight();
        this.events.emit('tile-click', key, tile);
      } else {
        this.selectedTile = null;
        this.updateHighlight();
      }
    });

    // Reset if the gesture is cancelled so we never get stuck "pressed"
    this.input.on('pointercancel', () => this.resetPointerState());

    // Zoom
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gamePoint: Phaser.Math.Vector2, _deltaX: number, deltaY: number, _deltaZ: number) => {
      const camera = this.cameras.main;
      const zoomRate = 0.1;
      const zoom = Phaser.Math.Clamp(camera.zoom + (deltaY < 0 ? zoomRate : -zoomRate), CAMERA.minZoom, CAMERA.maxZoom);
      camera.zoom = zoom;
    });
  }

  private resetPointerState(): void {
    this.pointerDown = false;
    this.isDragging = false;
    this.dragStart = null;
    this.grabWorld = null;
  }

  private getTileAtPointer(x: number, y: number): HexTile | null {
    // `x`/`y` are already in camera (world) space. Pick the nearest tile within
    // the hex radius.
    let best: TileDisplay | null = null;
    let bestDist = Infinity;
    const hitRadius = TILE_SIZE * 0.85;

    for (const display of this.tiles.values()) {
      const dx = x - display.x;
      const dy = y - display.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < hitRadius && dist < bestDist) {
        bestDist = dist;
        best = display;
      }
    }

    if (!best) return null;
    return this.engine.board.find((t) => coordKey(t.coord) === best!.key) || null;
  }

  // --- Public API for other scenes ---

  getSelectedTile(): HexTile | null {
    if (!this.selectedTile) return null;
    return this.engine.board.find(
      (t) => coordKey(t.coord) === this.selectedTile,
    ) || null;
  }

  getValidBuildTiles(_buildingType: BuildingType): string[] {
    const tiles: string[] = [];
    const phase = this.engine.phase;

    // During setup, all tiles are valid
    if (phase === 'setup') return Array.from(this.tiles.keys());

    // During playing, only tiles adjacent to existing buildings
    if (phase !== 'playing') return tiles;

    const player = this.engine.currentPlayer;

    // Find all tiles with player's buildings
    const playerTiles = this.engine.board.filter(
      (t) => t.building?.owner === player,
    );

    if (playerTiles.length === 0) return tiles;

    // Get all neighbors of player's buildings
    const neighborSet = new Set<string>();
    for (const tile of playerTiles) {
      const neighbors = getNeighbors(tile.coord);
      for (const n of neighbors) {
        const nKey = coordKey(n);
        if (isValidTile(n) && !this.engine.board.find(
          (t) => coordKey(t.coord) === nKey,
        )?.building) {
          neighborSet.add(nKey);
        }
      }
    }

    return Array.from(neighborSet);
  }

  highlightValidTiles(tileKeys: string[], color: number = 0x44ff44): void {
    for (const key of tileKeys) {
      const display = this.tiles.get(key);
      if (display) {
        this.drawHex(display.highlight, color, color, 3, 0.3);
      }
    }
  }

  clearHighlights(): void {
    this.updateHighlight();
  }
}
