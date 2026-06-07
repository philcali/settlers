import { useGame } from '../../state/game-context';
import { hexToScreen, getAllTiles } from '../../game/board';
import HexTile from './HexTile';

interface Props {
  onTileClick?: (tileKey: string) => void;
}

/**
 * HexGrid renders the full board of 19 hex tiles.
 * Uses absolute positioning with center alignment.
 */
export default function HexGrid({ onTileClick }: Props) {
  const { state } = useGame();
  const tiles = getAllTiles();

  // Calculate board center from CSS (we use a 1000x800 viewBox)
  const boardCenter = { x: 500, y: 400 };

  // Sort tiles by row for consistent rendering order
  const sortedTiles = [...tiles].sort((a, b) => a.r - b.r || a.q - b.q);

  return (
    <div style={styles.container}>
      {sortedTiles.map(tile => {
        const screenPos = hexToScreen(tile, boardCenter);
        const boardTile = state.board.find(
          t => t.coord.q === tile.q && t.coord.r === tile.r
        );
        const hexTile = boardTile || {
          coord: tile,
          province: 'desert',
          numberToken: null,
          hasBandit: false,
          building: null,
        };

        const tileKey = `${tile.q},${tile.r}`;
        const isOccupied = boardTile?.building !== null;
        const isClickable = onTileClick && !isOccupied && state.phase === 'setup';

        return (
          <div
            key={tileKey}
            onClick={isClickable ? () => onTileClick(tileKey) : undefined}
            style={{
              ...styles.tileWrapper,
              left: screenPos.x - 48,
              top: screenPos.y - 48,
              ...(isClickable ? styles.tileClickable : {}),
            }}
          >
            <HexTile tile={hexTile} />
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '1000px',
    height: '800px',
    margin: '0 auto',
  },
  tileWrapper: {
    position: 'absolute',
    width: '96px',
    height: '96px',
  },
  tileClickable: {
    cursor: 'pointer',
  },
};
