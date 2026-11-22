# Settlers of the Realm 🏰

A two-player hex board game in the spirit of Catan. Place your farms, roll
the dice, play cards, and outbuild your opponent — first to **10 victory
points** takes the realm. The AI opponent builds, blocks your best tiles
with the bandit, and plays cards with intent.

Play it: **https://philcali.github.io/settlers/** (or run locally — see below)

## Features

- 19-tile hex board with number tokens, provinces, and the desert
- Build chain: **farm → manor → castle** (×1 / ×2 / ×3 production on matching rolls)
- 92-card deck — resource gains, crusades, plagues, spy networks,
  mercenary companies (and the bandit they move), harvests, famines, relic hunts
- Roll a **7**: steal one of the opponent's resources, then *you* place the
  bandit on one of their tiles (Catan-style)
- AI opponent: token-aware building/upgrading, targeted robber, card play
- Victory overlay + play-again
- Installable **PWA** with offline support (add to home screen on your phone)
- 70 tests, strict TypeScript, deterministic seeded reducer (no state libs)

## Local development

```sh
npm install
npm run dev        # http://localhost:5199/settlers/ (also on LAN)
npm test           # vitest
npm run typecheck  # tsc --noEmit
npm run build      # production bundle in dist/
npm run preview    # serve the production build
```

## Architecture

- **`src/rules.ts`** — pure game rules (board math, production, robber, VP). No React.
- **`src/game.ts`** — the reducer: every action is pure; randomness is
  injected via a `seed` field and `mulberry32`, so games are reproducible
  and testable.
- **`src/ai.ts`** — decision function over state (returns the next action).
- **`src/cards.ts`** — card effects, also pure.
- **`src/components/`** — thin React views (HexBoard, HUD, Hand, BuildBar, Dice, VictoryOverlay).
- **`src/styles.css`** — hand-rolled CSS, responsive down to phone widths.

## Deployment

GitHub Pages (sub-path aware): `base: '/settlers/'` in `vite.config.ts` must
match the repo name, and all public assets are referenced through
`import.meta.env.BASE_URL`. The Actions workflow (`.github/workflows/deploy.yml`)
builds and deploys `dist/` on every push to `main`. Repo Pages source must be
set to **GitHub Actions**.
