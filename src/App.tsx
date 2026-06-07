import { useEffect, useCallback } from 'react';
import { useGame } from './state/game-context';
import { createDeck } from './game/deck';
import { getAllTiles, assignProvinces, assignNumberTokens } from './game/board';
import HexGrid from './components/board/HexGrid';
import CardHand from './components/cards/CardHand';
import DiceRoller from './components/controls/DiceRoller';
import BuildPanel from './components/controls/BuildPanel';
import StatusBar from './components/status/StatusBar';
import Scoreboard from './components/status/Scoreboard';
import VictoryOverlay from './components/status/VictoryOverlay';
import { useInitialPlacement } from './hooks/useInitialPlacement';
import './App.css';

function App() {
  const { state, dispatch } = useGame();

  // Initialize board on mount
  useEffect(() => {
    if (state.board.length === 0) {
      initBoard();
    }
  }, [state.board.length]);

  // Handle human castle placement during setup
  const onTileClick = useCallback((tileKey: string) => {
    if (state.phase !== 'setup' || state.currentPlayer !== 'human') return;
    dispatch({ type: 'PLACE_CASTLE', player: 'human', tileKey });
  }, [state.phase, state.currentPlayer, dispatch]);

  // Transition to playing after human places 2nd castle
  useInitialPlacement(() => {
    dispatch({ type: 'INITIAL_PLACEMENT_DONE' });
  });

  function initBoard() {
    const tiles = getAllTiles();
    const withProvinces = assignProvinces(tiles);
    const withNumbers = assignNumberTokens(withProvinces);
    const deck = createDeck();

    dispatch({ type: 'SET_BOARD', board: withNumbers });
    dispatch({ type: 'SET_PHASE', phase: 'setup' });
    dispatch({ type: 'SET_TURN_PHASE', phase: 'draw' });
    dispatch({ type: 'DRAW_CARDS', player: 'human', count: 3 });
    dispatch({ type: 'DRAW_CARDS', player: 'ai', count: 3 });
  }

  return (
    <div className="app">
      <VictoryOverlay />
      <StatusBar />

      <div className="main">
        <HexGrid onTileClick={onTileClick} />
      </div>

      <div className="bottom-panel">
        <div className="left-panel">
          <Scoreboard />
        </div>
        <div className="center-panel">
          <BuildPanel />
          <DiceRoller />
        </div>
        <div className="right-panel">
          <CardHand />
        </div>
      </div>
    </div>
  );
}

export default App;
