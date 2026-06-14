import { useEffect, useCallback } from 'react';
import { useGame } from './state/game-context';
import { useTurnController } from './hooks/useTurnController';
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
  const controller = useTurnController();

  // Initialize board on mount
  useEffect(() => {
    if (state.board.length === 0) {
      initBoard();
    }
  }, [state.board.length]);

  // Auto-draw at the start of each human turn
  useEffect(() => {
    if (controller.turnPhase === 'draw' && controller.isHumanTurn) {
      controller.drawCards();
    }
  }, [controller.turnPhase, controller.isHumanTurn]);

  // Auto-advance from 'play' to 'build' when human has no cards left
  useEffect(() => {
    if (
      controller.turnPhase === 'play' &&
      controller.isHumanTurn &&
      state.players.human.hand.length === 0
    ) {
      dispatch({ type: 'SET_TURN_PHASE', phase: 'build' });
    }
  }, [controller.turnPhase, controller.isHumanTurn, state.players.human.hand.length, dispatch]);

  // Advance turn when human reaches the 'roll' phase (end of their turn)
  useEffect(() => {
    if (controller.turnPhase === 'roll' && controller.isHumanTurn) {
      controller.advanceTurn();
    }
  }, [controller.turnPhase, controller.isHumanTurn]);

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
    dispatch({ type: 'SET_DECK', deck });
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
