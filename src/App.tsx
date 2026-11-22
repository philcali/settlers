import { useEffect, useReducer, useState } from 'react';
import { createGame, reduce } from './game';
import { aiDecide } from './ai';
import { buildTargets, robberTargets } from './rules';
import type { BuildingType } from './types';
import { coordKey } from './types';
import { BuildBar } from './components/BuildBar';
import { Hand } from './components/Hand';
import { HexBoard } from './components/HexBoard';
import { HUD } from './components/HUD';
import { VictoryOverlay } from './components/VictoryOverlay';

const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

export default function App() {
  const [state, dispatch] = useReducer(reduce, null, () => createGame(randomSeed()));
  const [rolling, setRolling] = useState(false);
  const [flash, setFlash] = useState<string[]>([]);
  const [buildMode, setBuildMode] = useState<BuildingType | null>(null);

  // Drop build mode when the turn passes or the game restarts
  useEffect(() => {
    setBuildMode(null);
  }, [state.currentPlayer, state.phase]);

  // AI setup: place its farms after a short beat
  useEffect(() => {
    if (state.phase !== 'setup' || state.currentPlayer !== 'ai') return;
    const timer = setTimeout(() => {
      const empties = state.board.filter((t) => !t.building && t.province !== 'desert');
      const tile = empties[Math.floor(Math.random() * empties.length)];
      if (tile) dispatch({ type: 'PLACE_BUILDING', player: 'ai', tileKey: coordKey(tile.coord) });
    }, 900);
    return () => clearTimeout(timer);
  }, [state]);

  // AI turn: one visible, paced action at a time (build/upgrade → card → roll → advance)
  useEffect(() => {
    if (state.phase !== 'playing' || state.currentPlayer !== 'ai') return;
    const decision = aiDecide(state);
    if (!decision) return;
    const delay =
      decision.type === 'ADVANCE_TURN' ? 1600 : decision.type === 'ROLL_DICE' ? 1300 : 1100;
    const timer = setTimeout(() => {
      switch (decision.type) {
        case 'ADVANCE_TURN':
          dispatch({ type: 'ADVANCE_TURN', seed: randomSeed() });
          break;
        case 'PLAY_CARD':
          dispatch({ type: 'PLAY_CARD', player: 'ai', cardId: decision.cardId, seed: randomSeed() });
          break;
        case 'MOVE_BANDIT':
          dispatch({ type: 'MOVE_BANDIT', player: 'ai', tileKey: decision.tileKey });
          break;
        case 'ROLL_DICE': {
          const a = 1 + Math.floor(Math.random() * 6);
          const b = 1 + Math.floor(Math.random() * 6);
          dispatch({ type: 'ROLL_DICE', value: a + b, individual: [a, b], seed: randomSeed() });
          break;
        }
        default:
          dispatch(decision); // BUILD / UPGRADE
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [state]);

  // Briefly glow the tiles that produced on the latest roll
  useEffect(() => {
    if (state.dice.individual === null) {
      setFlash([]);
      return;
    }
    const value = state.dice.value!;
    if (value === 7) {
      setFlash([]);
      return;
    }
    setFlash(
      state.board
        .filter((t) => t.numberToken === value && t.building && !t.hasBandit)
        .map((t) => coordKey(t.coord)),
    );
    const timer = setTimeout(() => setFlash([]), 2000);
    return () => clearTimeout(timer);
  }, [state.dice.individual, state.board]);

  const handleRoll = () => {
    if (state.phase !== 'playing' || state.currentPlayer !== 'human' || state.dice.individual !== null || rolling)
      return;
    const a = 1 + Math.floor(Math.random() * 6);
    const b = 1 + Math.floor(Math.random() * 6);
    setRolling(true);
    window.setTimeout(() => {
      dispatch({ type: 'ROLL_DICE', value: a + b, individual: [a, b], seed: randomSeed() });
      setRolling(false);
    }, 800);
  };

  const handlePlayCard = (cardId: string) => {
    if (state.phase !== 'playing' || state.currentPlayer !== 'human') return;
    dispatch({ type: 'PLAY_CARD', player: 'human', cardId, seed: randomSeed() });
  };

  const handleTileClick = (key: string) => {
    if (state.phase === 'setup' && state.currentPlayer === 'human') {
      dispatch({ type: 'PLACE_BUILDING', player: 'human', tileKey: key });
      return;
    }
    if (state.phase === 'playing' && state.robberPending === 'human') {
      dispatch({ type: 'MOVE_BANDIT', player: 'human', tileKey: key });
      setBuildMode(null);
      return;
    }
    if (buildMode && state.phase === 'playing' && state.currentPlayer === 'human') {
      if (buildMode === 'farm') dispatch({ type: 'BUILD', player: 'human', tileKey: key, building: 'farm' });
      else dispatch({ type: 'UPGRADE', player: 'human', tileKey: key, to: buildMode });
      setBuildMode(null);
    }
  };

  const handleBuildMode = (mode: BuildingType | null) => {
    setBuildMode(mode);
    dispatch({
      type: 'SET_MESSAGE',
      message: mode
        ? `${mode === 'farm' ? 'Build' : 'Upgrade'} mode — tap a glowing tile to place your ${mode}.`
        : 'Build mode cancelled.',
    });
  };

  const robberActive = state.phase === 'playing' && state.robberPending === 'human';
  const targets = robberActive
    ? robberTargets(state, 'human')
    : buildMode && state.phase === 'playing' && state.currentPlayer === 'human'
      ? buildTargets(state, 'human', buildMode)
      : [];

  return (
    <div className="app">
      <HUD
        state={state}
        rolling={rolling}
        onNewGame={() => dispatch({ type: 'NEW_GAME', seed: randomSeed() })}
        onRoll={handleRoll}
        onEndTurn={() => dispatch({ type: 'ADVANCE_TURN', seed: randomSeed() })}
      />
      <main className="app__board">
        <HexBoard
          tiles={state.board}
          selectable={state.phase === 'setup' && state.currentPlayer === 'human'}
          highlight={flash}
          targets={targets}
          onTileClick={handleTileClick}
        />
      </main>
      {state.phase === 'playing' && <BuildBar state={state} mode={buildMode} onMode={handleBuildMode} />}
      <Hand state={state} onPlayCard={handlePlayCard} />
      <VictoryOverlay state={state} onPlayAgain={() => dispatch({ type: 'NEW_GAME', seed: randomSeed() })} />
    </div>
  );
}
