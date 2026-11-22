import { HEX_SIZE, hexToPixel } from '../board';
import type { Tile } from '../types';
import { coordKey } from '../types';

const TILE_ART: Record<string, string> = {
  forest: `${import.meta.env.BASE_URL}assets/tiles/forest.png`,
  quarry: `${import.meta.env.BASE_URL}assets/tiles/quarry.png`,
  farmland: `${import.meta.env.BASE_URL}assets/tiles/farmland.png`,
  mine: `${import.meta.env.BASE_URL}assets/tiles/mine.png`,
  pasture: `${import.meta.env.BASE_URL}assets/tiles/pasture.png`,
  desert: `${import.meta.env.BASE_URL}assets/tiles/desert.png`,
};

const BUILDING_SPRITE: Record<string, Record<string, string>> = {
  farm: { human: `${import.meta.env.BASE_URL}assets/buildings/farm-human.png`, ai: `${import.meta.env.BASE_URL}assets/buildings/farm-ai.png` },
  manor: { human: `${import.meta.env.BASE_URL}assets/buildings/manor-human.png`, ai: `${import.meta.env.BASE_URL}assets/buildings/manor-ai.png` },
  castle: { human: `${import.meta.env.BASE_URL}assets/buildings/castle-human.png`, ai: `${import.meta.env.BASE_URL}assets/buildings/castle-ai.png` },
};

interface HexBoardProps {
  tiles: Tile[];
  selectable?: boolean;
  /** Tile keys to glow (e.g. the tiles that produced on the last roll). */
  highlight?: string[];
  /** Tile keys where the current build/upgrade action would be legal. */
  targets?: string[];
  onTileClick?: (key: string) => void;
}

// Board extent: farthest tile center (2s√3 horizontally, 3s vertically)
// plus half a hex (√3/2·s wide, s tall), plus padding for the highlight glow.
const PAD = 8;
const W = 2 * (2.5 * Math.sqrt(3) * HEX_SIZE + PAD);
const H = 2 * (4 * HEX_SIZE + PAD);

export function HexBoard({ tiles, selectable = false, highlight, targets, onTileClick }: HexBoardProps) {
  return (
    <svg className="hexboard" viewBox={`${-W / 2} ${-H / 2} ${W} ${H}`} role="img" aria-label="Game board">
      {tiles.map((tile) => {
        const key = coordKey(tile.coord);
        const { x, y } = hexToPixel(tile.coord);
        const classes = ['hex'];
        if (selectable) classes.push('hex--selectable');
        if (highlight?.includes(key)) classes.push('hex--highlight');
        if (targets?.includes(key)) classes.push('hex--target');
        return (
          <g
            key={key}
            className={classes.join(' ')}
            transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}
            onClick={() => onTileClick?.(key)}
          >
            <image
              href={TILE_ART[tile.province]}
              x={(-Math.sqrt(3) / 2) * HEX_SIZE}
              y={-HEX_SIZE}
              width={Math.sqrt(3) * HEX_SIZE}
              height={2 * HEX_SIZE}
              preserveAspectRatio="none"
            />
            {tile.numberToken !== null && (
              <g className="token">
                <circle cy={-HEX_SIZE + 22} r={14} />
                <text y={-HEX_SIZE + 22} dominantBaseline="central" textAnchor="middle">
                  {tile.numberToken}
                </text>
              </g>
            )}
            {tile.hasBandit && (
              <g className="bandit" transform={`translate(0 ${-HEX_SIZE * 0.25})`}>
                <circle r={10} />
                <text dominantBaseline="central" textAnchor="middle">✕</text>
              </g>
            )}
            {tile.building && (
              <g className={`building building--${tile.building.owner}`} transform="translate(0 16)">
                <image
                  href={BUILDING_SPRITE[tile.building.type][tile.building.owner]}
                  x={-24}
                  y={-24}
                  width={48}
                  height={48}
                  preserveAspectRatio="xMidYMid meet"
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
