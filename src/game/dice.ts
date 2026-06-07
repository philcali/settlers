import { GameState, PlayerId, ResourceType } from '../types/game';

// --- Dice rolling ---

export function rollDice(): [number, number] {
  return [Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)];
}

export function getDiceTotal(dice: [number, number]): number {
  return dice[0] + dice[1];
}

// --- Resource collection ---

export interface ResourceCollection {
  player: PlayerId;
  resources: Partial<Record<ResourceType, number>>;
}

export function collectResources(
  board: GameState['board'],
  player: PlayerId,
  diceTotal: number,
): Partial<Record<ResourceType, number>> {
  const resources: Partial<Record<ResourceType, number>> = {};

  for (const tile of board) {
    if (tile.numberToken !== null && tile.numberToken === diceTotal && tile.province !== 'desert') {
      const provinceToResource: Record<string, ResourceType> = {
        forest: 'wood',
        quarry: 'stone',
        farmland: 'grain',
        mine: 'ore',
        pasture: 'livestock',
      };

      const resource = provinceToResource[tile.province];
      if (!resource) continue;

      if (!tile.building) {
        // No building = no production
        continue;
      }

      if (tile.building.owner !== player) continue;

      let amount = 1;
      if (tile.building.type === 'manor') amount = 2;
      if (tile.building.type === 'castle') amount = 3;

      // Farm bonus: +1 of the matching province type
      const farmBonus = countBuildingsOfType(player, 'farm', board) > 0 ? 1 : 0;

      resources[resource] = (resources[resource] || 0) + amount + farmBonus;
    }
  }

  return resources;
}

function countBuildingsOfType(player: PlayerId, type: 'farm', board: GameState['board']): number {
  let count = 0;
  for (const tile of board) {
    if (tile.building?.owner === player && tile.building.type === type) {
      count++;
    }
  }
  return count;
}

// --- Bandit rules ---

export function getBanditResources(
  board: GameState['board'],
  banditPos: GameState['banditPosition'],
  player: PlayerId,
): number {
  if (!banditPos) return 0;
  const tile = board.find(t => t.coord.q === banditPos.q && t.coord.r === banditPos.r);
  if (!tile || !tile.building || tile.building.owner !== player) return 0;
  return 1; // Steal 1 random card from each player with a building on the bandit's tile
}
