import { HexTile as HexTileType } from '../../types/game';
import { PROVINCE_ASSETS } from '../../types/game';

interface Props {
  tile: HexTileType;
  isHovered?: boolean;
}

/**
 * HexTile renders a single province tile with:
 * 1. Province art (CSS background image)
 * 2. Number token overlay (code-rendered circle seal)
 * 3. Building marker (SVG overlay)
 * 4. Bandit marker
 */
export default function HexTile({ tile, isHovered }: Props) {
  const province = tile.province;
  const artUrl = PROVINCE_ASSETS[province];

  // Hex clip path for the tile shape
  const hexClipPath = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

  return (
    <div style={styles.container}>
      {/* Province art background */}
      <div
        style={{
          ...styles.hexShape,
          clipPath: hexClipPath,
          WebkitClipPath: hexClipPath,
          filter: isHovered ? 'brightness(1.15)' : undefined,
        }}
      >
        {artUrl ? (
          <img
            src={artUrl}
            alt={province}
            style={styles.provinceImage}
            onError={(e) => {
              // Fallback: hide image, show colored div
              const img = e.target as HTMLImageElement;
              img.style.display = 'none';
              const sibling = img.nextElementSibling as HTMLElement | null;
              if (sibling) sibling.style.display = 'flex';
            }}
          />
        ) : null}
        {/* Fallback color */}
        <div style={{ ...styles.fallbackColor, backgroundColor: getProvinceColor(province), display: 'none' }}>
          {province}
        </div>
      </div>

      {/* Number token overlay */}
      {tile.numberToken !== null && (
        <div style={styles.numberToken}>
          <div style={styles.numberSeal}>
            <span style={styles.numberText}>{tile.numberToken}</span>
          </div>
        </div>
      )}

      {/* Building marker */}
      {tile.building && (
        <div style={styles.buildingMarker}>
          {getBuildingSVG(tile.building.type, tile.building.owner)}
        </div>
      )}

      {/* Bandit marker */}
      {tile.hasBandit && (
        <div style={styles.banditMarker}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#333" stroke="#666" strokeWidth="1" />
            <text x="12" y="16" textAnchor="middle" fill="#fff" fontSize="12">!</text>
          </svg>
        </div>
      )}
    </div>
  );
}

function getProvinceColor(province: string): string {
  const colors: Record<string, string> = {
    forest: '#2d5a27',
    quarry: '#6b6b6b',
    farmland: '#c4a835',
    mine: '#3a3a3a',
    pasture: '#7cb342',
    desert: '#d4a543',
  };
  return colors[province] || '#888';
}

function getBuildingSVG(type: string, owner: string): React.ReactNode {
  const color = owner === 'human' ? '#4a90d9' : '#d94a4a';
  const label = type === 'farm' ? 'F' : type === 'manor' ? 'M' : 'C';

  return (
    <svg width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14" fill={color} fillOpacity="0.8" stroke="#fff" strokeWidth="1.5" />
      <text x="16" y="21" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">
        {label}
      </text>
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '96px',
    height: '96px',
  },
  hexShape: {
    width: '96px',
    height: '96px',
    overflow: 'hidden',
    transition: 'filter 0.15s ease',
  },
  provinceImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  fallbackColor: {
    width: '100%',
    height: '100%',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '12px',
  },
  numberToken: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 2,
  },
  numberSeal: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, #f5e6c8 0%, #d4a543 100%)',
    border: '2px solid #8b6914',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  numberText: {
    fontWeight: 'bold',
    fontSize: '16px',
    color: '#3a2a0a',
  },
  buildingMarker: {
    position: 'absolute',
    bottom: '2px',
    right: '2px',
    zIndex: 3,
  },
  banditMarker: {
    position: 'absolute',
    top: '2px',
    left: '2px',
    zIndex: 3,
  },
};
