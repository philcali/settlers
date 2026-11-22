import type { BuildingType, GameState, Resource } from '../types';
import { BUILDING_COSTS, BUILDING_POINTS, RESOURCE_ART } from '../types';
import { buildTargets, PRODUCTION } from '../rules';

const BUILD_INFO: Record<BuildingType, { hint: string }> = {
  farm: { hint: 'new settlement' },
  manor: { hint: 'upgrade one of your farms' },
  castle: { hint: 'upgrade one of your manors' },
};

const ORDER: BuildingType[] = ['farm', 'manor', 'castle'];

interface BuildBarProps {
  state: GameState;
  mode: BuildingType | null;
  onMode: (mode: BuildingType | null) => void;
}

/**
 * Build/upgrade controls shown while the game is in play.
 * Selecting a building highlights the legal tiles on the board; tapping one commits the action.
 * Buttons are disabled unless it's your turn and at least one legal target exists (which also
 * implies you can afford the cost, since buildTargets checks canAfford).
 */
export function BuildBar({ state, mode, onMode }: BuildBarProps) {
  const myTurn = state.phase === 'playing' && state.currentPlayer === 'human';
  return (
    <div className="buildbar">
      {ORDER.map((b) => {
        const targets = buildTargets(state, 'human', b);
        const enabled = myTurn && targets.length > 0;
        const active = mode === b;
        return (
          <button
            key={b}
            type="button"
            className={`buildbar__btn${active ? ' buildbar__btn--active' : ''}`}
            disabled={!enabled}
            title={enabled ? `${BUILD_INFO[b].hint} — tap a glowing tile` : 'no legal targets right now'}
            onClick={() => onMode(active ? null : b)}
          >
            <span className="buildbar__name">
              {b.charAt(0).toUpperCase() + b.slice(1)}
              <span className="buildbar__prod">×{PRODUCTION[b]}</span>
              {b !== 'farm' && <span className="buildbar__vp">+{BUILDING_POINTS[b]}★</span>}
            </span>
            <span className="buildbar__cost">
              {(Object.entries(BUILDING_COSTS[b]) as [Resource, number][]).map(([r, n]) => (
                <span key={r} className="buildbar__res" title={r}>
                  <img src={RESOURCE_ART[r]} alt={r} />
                  {n}
                </span>
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
