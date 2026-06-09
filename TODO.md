# Settlers of the Realm — TODO

## Art Files Needed

### Tile Images (`public/assets/tiles/`)
| File | Province |
|---|---|
| `forest.png` | Forest |
| `quarry.png` | Quarry |
| `farmland.png` | Farmland |
| `mine.png` | Mine |
| `pasture.png` | Pasture |
| `desert.png` | Desert |

### Card Images (`public/assets/cards/`)
| File | Purpose |
|---|---|
| `back.png` | Card back (heraldic shield pattern, tileable) |
| `resource-wood.png` | Wood resource card |
| `resource-stone.png` | Stone resource card |
| `resource-grain.png` | Grain resource card |
| `resource-ore.png` | Ore resource card |
| `resource-livestock.png` | Livestock resource card |
| `title-royal-decree.png` | Royal Decree title card |
| `title-plague.png` | Plague title card |
| `title-crusade.png` | Crusade title card |
| `title-spy-network.png` | Spy Network title card |
| `title-mercenary-company.png` | Mercenary Company title card |
| `event-harvest-festival.png` | Harvest Festival event card |
| `event-famine.png` | Famine event card |
| `event-relic-hunt.png` | Relic Hunt event card |

## Game Logic
- [x] Implement event card effects (Royal Decree, Plague, Crusade, etc.)
- [ ] Implement one-way trading (AI offers trades, no negotiation back-and-forth)
- [ ] Tune AI scoring weights for different strategy preferences
- [x] Add bandit mechanics (move bandit, steal cards)
- [ ] Add "longest trade route" tracking (optional)

## UI Polish
- [x] Add alternating castle placement animation (setup phase)
- [x] Add victory overlay with celebration
- [ ] Add hover states on hex tiles
- [ ] Add card play animation
- [ ] Add dice roll animation
- [ ] Add game log / action history

## Future
- [ ] More AI opponents (3-4 player games)
- [ ] Save/load game state
- [ ] Multiple board layouts
- [ ] Sound effects
