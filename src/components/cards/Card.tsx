import { Card as CardType } from '../../types/game';

interface Props {
  card: CardType;
  onClick?: () => void;
  disabled?: boolean;
}

/**
 * Card renders an individual card with:
 * - Card type badge (resource/title/event)
 * - Subtype label
 * - Hover/active states for clickable cards
 */
export default function Card({ card, onClick, disabled }: Props) {
  const typeColors: Record<string, string> = {
    resource: '#2d5a27',
    title: '#d4a543',
    event: '#8b2020',
  };

  const typeLabels: Record<string, string> = {
    resource: 'Resource',
    title: 'Title',
    event: 'Event',
  };

  const subtypeLabels: Record<string, string> = {
    wood: 'Wood',
    stone: 'Stone',
    grain: 'Grain',
    ore: 'Ore',
    livestock: 'Livestock',
    'royal-decree': 'Royal Decree',
    plague: 'Plague',
    crusade: 'Crusade',
    'spy-network': 'Spy Network',
    'mercenary-company': 'Mercenary Co.',
    'harvest-festival': 'Harvest Festival',
    famine: 'Famine',
    'relic-hunt': 'Relic Hunt',
  };

  const borderColor = typeColors[card.type] || '#888';

  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        ...styles.card,
        borderColor,
        opacity: disabled ? 0.5 : 1,
        cursor: onClick ? 'pointer' : 'default',
        transform: onClick ? 'translateY(0)' : 'translateY(0)',
      }}
      onMouseEnter={e => {
        if (disabled) return;
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-8px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      }}
    >
      <div style={styles.typeBadge}>
        <span style={{ ...styles.badgeDot, backgroundColor: borderColor }} />
        <span style={styles.badgeText}>{typeLabels[card.type]}</span>
      </div>
      <div style={styles.subtype}>
        {subtypeLabels[card.subtype] || card.subtype}
      </div>
      <div style={styles.cardBody}>
        {/* Placeholder for card art — user will replace with generated art */}
        <div style={{ ...styles.artPlaceholder, backgroundColor: borderColor + '33' }}>
          <span style={{ fontSize: '24px' }}>{getCardIcon(card)}</span>
        </div>
      </div>
    </div>
  );
}

function getCardIcon(card: { type: string; subtype: string }): string {
  const icons: Record<string, string> = {
    wood: '🌲',
    stone: '⬡',
    grain: '🌾',
    ore: '⚒',
    livestock: '🐄',
    'royal-decree': '👑',
    plague: '☠',
    crusade: '⚔',
    'spy-network': '🕵',
    'mercenary-company': '🐴',
    'harvest-festival': '🎉',
    famine: '🏜',
    'relic-hunt': '💎',
  };
  return icons[card.subtype] || '🃏';
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    width: '100px',
    minWidth: '100px',
    borderRadius: '8px',
    border: '2px solid #888',
    background: '#1a1a2e',
    padding: '8px',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  typeBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '4px',
  },
  badgeDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  badgeText: {
    fontSize: '10px',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  subtype: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#e8d5b5',
    marginBottom: '6px',
  },
  cardBody: {
    display: 'flex',
    justifyContent: 'center',
  },
  artPlaceholder: {
    width: '70px',
    height: '70px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
