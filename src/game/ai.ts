import { GameState, PlayerId, AIAction, AIEvaluation, BuildingType, BUILDING_COSTS, coordKey, ResourceType } from '../types/game';
import { canBuild, canUpgrade, checkWinner } from './rules';

/**
 * Evaluate all possible AI actions and return scored results.
 * The AI picks the action with the highest score.
 */
export function evaluateAIActions(state: GameState, player: PlayerId): AIEvaluation[] {
  const evaluations: AIEvaluation[] = [];
  const aiPlayer = state.players[player];

  // --- Evaluate card plays ---
  for (const card of aiPlayer.hand) {
    const score = evaluateCardPlay(state, player, card);
    if (score > -Infinity) {
      evaluations.push({
        action: { type: 'play-card', cardId: card.id },
        score,
      });
    }
  }

  // --- Evaluate builds ---
  for (const tile of state.board) {
    if (!tile.building || tile.building.owner !== player) continue;

    // Can build a new farm on adjacent empty tile
    for (const neighbor of getNeighbors(tile.coord)) {
      const neighborTile = state.board.find(t => t.coord.q === neighbor.q && t.coord.r === neighbor.r);
      if (neighborTile && !neighborTile.building && canBuild(state, player, 'farm')) {
        const score = evaluateBuild(state, player, coordKey(neighbor), 'farm');
        evaluations.push({
          action: { type: 'build', tileKey: coordKey(neighbor), building: 'farm' },
          score,
        });
      }
    }

    // Can upgrade existing building
    const currentBuilding = tile.building.type;
    const upgrades: Record<BuildingType, BuildingType> = {
      farm: 'manor',
      manor: 'castle',
      castle: 'castle', // no further upgrades
    };
    const upgradeTo = upgrades[currentBuilding];
    if (upgradeTo !== currentBuilding && canUpgrade(state, player, coordKey(tile), upgradeTo)) {
      const score = evaluateBuild(state, player, coordKey(tile), upgradeTo);
      evaluations.push({
        action: { type: 'upgrade', tileKey: coordKey(tile), to: upgradeTo },
        score,
      });
    }
  }

  // --- Evaluate pass (always an option) ---
  const passScore = evaluatePass(state, player);
  evaluations.push({ action: { type: 'pass' }, score: passScore });

  return evaluations;
}

function evaluateCardPlay(state: GameState, player: PlayerId, card: { type: string; subtype: string }): number {
  let score = 0;
  const aiPlayer = state.players[player];

  // Resource cards are only useful if they help build something
  if (card.type === 'resource') {
    // Check if this resource is needed for any affordable build
    for (const [building, cost] of Object.entries(BUILDING_COSTS)) {
      if (cost[card.subtype as keyof typeof cost]) {
        score += 2; // Each needed resource is worth +2
      }
    }
    // If the AI already has plenty of this resource, it's less valuable
    if (aiPlayer.resources[card.subtype as ResourceType] >= 4) {
      score -= 3;
    }
  }

  // Title cards
  switch (card.subtype) {
    case 'royal-decree':
      score += 5; // Drawing cards is always good
      break;
    case 'plague':
      // Good if opponent has lots of resources
      const opponentId = player === 'human' ? 'ai' : 'human';
      const opponent = state.players[opponentId];
      const opponentResources = Object.values(opponent.resources).reduce((a, b) => a + b, 0);
      score += opponentResources > 5 ? 8 : 2;
      break;
    case 'crusade':
      score += 6; // Free resources are valuable
      break;
    case 'spy-network':
      score += 3; // Information is useful
      break;
    case 'mercenary-company':
      score += state.banditPosition ? 7 : 2; // Very valuable if bandit is active
      break;
  }

  // Event cards
  switch (card.subtype) {
    case 'harvest-festival':
      score += 4; // Everyone draws a card
      break;
    case 'famine':
      score -= 2; // Hurts everyone, including AI
      break;
    case 'relic-hunt':
      score += 5; // Free resource
      break;
  }

  // Penalize playing cards when hand is already full
  if (aiPlayer.hand.length >= 7) {
    score -= 4;
  }

  return score;
}

function evaluateBuild(
  state: GameState,
  player: PlayerId,
  tileKey: string,
  building: BuildingType,
): number {
  let score = 0;
  const aiPlayer = state.players[player];
  const costs = BUILDING_COSTS[building];

  // VP gained (biggest factor)
  const vpMap: Record<BuildingType, number> = { farm: 0, manor: 1, castle: 2 };
  score += vpMap[building] * 15;

  // Check if this completes victory condition
  const currentVP = aiPlayer.victoryPoints;
  if (currentVP + vpMap[building] >= 10) {
    score += 200; // Instant win — huge priority
  }

  // Resource efficiency: how close can the AI afford this?
  let canAfford = true;
  let resourceGap = 0;
  for (const [resource, cost] of Object.entries(costs)) {
    const have = aiPlayer.resources[resource as ResourceType] || 0;
    if (have < cost!) {
      canAfford = false;
      resourceGap += cost! - have;
    }
  }
  score += canAfford ? 10 : -resourceGap * 3;

  // Production value of the building
  const productionScore = getProductionScore(state, player, tileKey, building);
  score += productionScore * 2;

  // Blocking bonus: does this building block an opponent's expansion?
  const opponentId = player === 'human' ? 'ai' : 'human';
  const blockedTiles = state.board.filter(t => {
    if (t.building) return false;
    const neighbors = getNeighbors({ q: 0, r: 0 }); // placeholder
    const tile = state.board.find(b => coordKey(b.coord) === tileKey);
    if (!tile) return false;
    const n = getNeighbors(tile.coord);
    return n.some(neighbor => {
      const nb = state.board.find(b => b.coord.q === neighbor.q && b.coord.r === neighbor.r);
      return nb?.building?.owner === opponentId;
    });
  });
  score += blockedTiles.length * 2;

  // Penalize building when resources are very low
  const totalHave = Object.values(aiPlayer.resources).reduce((a, b) => a + b, 0);
  const totalNeeded = Object.values(costs).reduce((a, b) => a + (b || 0), 0);
  if (totalHave < totalNeeded) {
    score -= 3;
  }

  return score;
}

function getProductionScore(
  state: GameState,
  player: PlayerId,
  tileKey: string,
  building: BuildingType,
): number {
  const tile = state.board.find(t => coordKey(t.coord) === tileKey);
  if (!tile || !tile.numberToken) return 0;

  // Higher number = more likely to roll = more valuable
  const probability = getNumberProbability(tile.numberToken);
  let value = probability * 10;

  // Manor/castle multiplier
  if (building === 'manor') value *= 2;
  if (building === 'castle') value *= 3;

  return value;
}

function evaluatePass(state: GameState, player: PlayerId): number {
  let score = 0;
  const aiPlayer = state.players[player];

  // Passing is bad if the AI has nothing to build
  const canBuildSomething = state.board.some(tile => {
    if (tile.building?.owner !== player) return false;
    const neighbors = getNeighbors(tile.coord);
    return neighbors.some(n => {
      const nb = state.board.find(t => t.coord.q === n.q && t.coord.r === n.r);
      return nb && !nb.building;
    });
  });

  if (!canBuildSomething) score += 5;
  if (aiPlayer.hand.length >= 7) score += 3; // Avoid drawing over cap

  return score;
}

// --- Dice probability ---

function getNumberProbability(n: number): number {
  // Number of ways to roll each value with 2d6
  const ways: Record<number, number> = {
    2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6,
    8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
  };
  return (ways[n] || 0) / 36;
}

// --- Neighbor lookup ---

function getNeighbors(coord: { q: number; r: number }): { q: number; r: number }[] {
  const dirs = [
    { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
    { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 },
  ];
  return dirs.map(d => ({ q: coord.q + d.q, r: coord.r + d.r }));
}
