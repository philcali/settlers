# Settlers of the Realm — Phaser 3 Migration

## End State

Flat codebase, no deep nesting:

```
settlers/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── TASKS.md
├── src/
│   ├── main.ts                 # Phaser app entry
│   ├── config.ts               # Phaser config constants
│   ├── scenes/
│   │   ├── Boot.ts             # Asset loading, initial setup
│   │   ├── HexBoard.ts         # Hex grid rendering, camera, tile interaction
│   │   ├── HUD.ts              # Resource counts, phase, scores overlay
│   │   └── Game.ts             # Turn flow, dice, card hand, build panel
│   ├── engine/
│   │   └── GameEngine.ts       # Wraps game-reducer: read state + dispatch
│   ├── game/
│   │   ├── board.ts            # Hex math, province/number assignment (kept)
│   │   ├── rules.ts            # canBuild, canUpgrade, checkWinner (kept)
│   │   ├── deck.ts             # Card deck management (kept)
│   │   ├── dice.ts             # Dice rolling, resource mapping (kept)
│   │   └── card-effects.ts     # Card effect resolution (kept)
│   ├── types/
│   │   └── game.ts             # All type enums, GameState, actions (kept)
│   └── assets/                 # Tile art, card art, sprites, fonts
├── tests/
│   ├── board.test.ts
│   ├── rules.test.ts
│   ├── deck.test.ts
│   ├── dice.test.ts
│   └── card-effects.test.ts
└── vitest.config.ts
```

**Removed:**
- `src/App.tsx`, `src/main.tsx` (React entry)
- `src/App.css`, `src/index.css`
- `src/components/` — all React components
- `src/hooks/` — all React hooks (useTurnController, useInitialPlacement, useAI, useGameState)
- `src/state/` — game-context.tsx, game-reducer.ts (replaced by engine/GameEngine.ts)
- `src/__tests__/fixtures.ts`
- `src/assets/react.svg`
- `react`, `react-dom` from dependencies
- `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `eslint-plugin-react-*` from devDeps

**Kept (unchanged):**
- `src/game/` — pure, testable, framework-agnostic game logic
- `src/types/game.ts` — all type definitions
- All existing game tests

---

## Migration Tasks

### Phase 1 — Foundation

| # | Task | Description |
|---|------|-------------|
| 1 | Project scaffolding | Add `phaser@3`, create `src/` flat layout, Vite config for canvas entry, TypeScript setup |
| 2 | Game engine bridge | `GameEngine` class wrapping existing `game-reducer.ts` — read-only state + dispatch. Single source of truth for Phaser scenes |

### Phase 2 — Core rendering

| # | Task | Description |
|---|------|-------------|
| 3 | Hex board rendering | `HexBoard` scene: panable camera, 19-tile hex grid, province colors, building markers (farm/manor/castle) |
| 4 | Camera and input | Drag/WASD panning, scroll zoom, tile selection highlighting, focus on player's buildings |

### Phase 3 — Game flow

| # | Task | Description |
|---|------|-------------|
| 5 | HUD overlay | Resource counts, phase indicator, turn count, scores — reactive to GameEngine state changes |
| 6 | Turn flow and dice | Phase cycle (draw→play→build→roll), dice roll animation (Phaser tweens), AI auto-advance, resource collection |
| 7 | Initial placement | Setup phase: alternating castle placement, valid tile highlighting, transition to playing |

### Phase 4 — Gameplay

| # | Task | Description |
|---|------|-------------|
| 8 | Building and upgrading | Build panel UI, resource validation, farm→manor→castle upgrade path |
| 9 | Card hand and play | Fanned card hand, click-to-select/play, card effects, discard pile |
| 10 | AI opponent | Ported AI logic, turn queue with delays, visual action feedback |

### Phase 5 — Polish

| # | Task | Description |
|---|------|-------------|
| 11 | Animations and polish | Dice tweens, hover/press feedback, building placement, floating resource numbers, victory screen, bandit movement |

### Phase 6 — Cleanup

| # | Task | Description |
|---|------|-------------|
| 12 | Deprecate React components | Mark old hooks/reducers as deprecated, keep functional for verification, update docs |
| 13 | Remove React dependency | Strip React/react-dom, remove `src/components/`, `src/hooks/`, `src/state/`, final build pass |

---

## Session Plan

Each phase is independently verifiable. Run both apps in parallel during Phases 1–5 to verify parity.

Phase 6 is the final switch — one clean removal.
