import { useState } from 'react';
import type { BuildingType, GameState, PlayerState, Resource } from '../types';
import { BUILDING_COSTS, RESOURCE_ART, VICTORY_POINTS } from '../types';
import { PRODUCTION, victoryPoints } from '../rules';
import { Dice } from './Dice';

const RESOURCES: Resource[] = ['wood', 'grain', 'stone', 'ore', 'livestock'];

function PlayerPanel({ state, player }: { state: GameState; player: PlayerState }) {
  const active = state.currentPlayer === player.id && state.phase !== 'ended';
  const vp = victoryPoints(state.board, player.id);
  return (
    <div className={`hud__player hud__player--${player.id}${active ? ' hud__player--active' : ''}`}>
      <div className="hud__name">{player.name}</div>
      <div className="hud__resources">
        {RESOURCES.map((r) => (
          <span key={r} className="hud__res" title={r}>
            <img src={RESOURCE_ART[r]} alt={r} />
            <b>{player.resources[r]}</b>
          </span>
        ))}
      </div>
      <div className="hud__stats">
        <span className="hud__stat" title="cards in hand">
          <img src="/assets/cards/back.png" alt="hand" />
          <b>{player.hand.length}</b>
        </span>
        <span className="hud__stat hud__vp" title="victory points (need 10)">
          ★<b>{vp}</b>
        </span>
      </div>
    </div>
  );
}

interface HUDProps {
  state: GameState;
  rolling: boolean;
  onNewGame: () => void;
  onRoll: () => void;
  onEndTurn: () => void;
}

export function HUD({ state, rolling, onNewGame, onRoll, onEndTurn }: HUDProps) {
  const phaseLabel =
    state.phase === 'setup'
      ? 'Setup'
      : state.phase === 'ended'
        ? state.winner === 'human'
          ? 'You win!'
          : 'AI wins'
        : state.turnPhase;
  const inPlay = state.phase === 'playing';
  const myTurn = inPlay && state.currentPlayer === 'human';
  const canRoll = myTurn && state.dice.individual === null && !rolling;
  const canEnd = myTurn && state.dice.individual !== null && state.robberPending === null;
  return (
    <header className="hud">
      <PlayerPanel state={state} player={state.players.human} />
      <div className="hud__center">
        <h1 className="hud__title">Settlers of the Realm</h1>
        <div className="hud__turn">
          Turn {state.turnCount} · {phaseLabel}
        </div>
        <div className="hud__message">{state.message}</div>
        {inPlay && (
          <div className="hud__actions">
            <Dice faces={state.dice.individual} rolling={rolling} />
            <button type="button" className="hud__btn hud__btn--roll" disabled={!canRoll} onClick={onRoll}>
              {rolling ? 'Rolling…' : 'Roll'}
            </button>
            <button type="button" className="hud__btn" disabled={!canEnd} onClick={onEndTurn}>
              End turn
            </button>
          </div>
        )}
        <HUDMenu state={state} onNewGame={onNewGame} />
      </div>
      <PlayerPanel state={state} player={state.players.ai} />
    </header>
  );
}

const costText = (b: BuildingType) =>
  (Object.entries(BUILDING_COSTS[b]) as [Resource, number][])
    .map(([r, n]) => `${n} ${r}`)
    .join(' + ');

function HUDMenu({ state, onNewGame }: { state: GameState; onNewGame: () => void }) {
  const [open, setOpen] = useState(false);
  const [howto, setHowto] = useState(false);
  const [log, setLog] = useState(false);
  const recent = [...state.log].slice(-8).reverse();

  return (
    <div className="hud__menu">
      <button
        type="button"
        className={`hud__menu__btn${open ? ' hud__menu__btn--open' : ''}`}
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ☰
      </button>
      {open && (
        <div className="hud__menu__panel" role="menu">
          <button type="button" className="hud__menu__item" role="menuitem" onClick={onNewGame}>
            New game
          </button>
          <button
            type="button"
            className={`hud__menu__item${howto ? ' hud__menu__item--open' : ''}`}
            role="menuitem"
            onClick={() => setHowto((h) => !h)}
          >
            How to play {howto ? '▴' : '▾'}
          </button>
          {howto && (
            <div className="hud__menu__help">
              <p>
                Each turn: roll the dice, then play cards and build. Tiles matching your roll pay their
                owner — farm ×{PRODUCTION.farm}, manor ×{PRODUCTION.manor}, castle ×{PRODUCTION.castle}.
              </p>
              <p>
                Roll 7: you steal 1 of their resources, then move the bandit onto one of the opponent&apos;s
                tiles — it blocks that tile until it moves again.
              </p>
              <p>
                Buildings must touch your existing ones. Farm: {costText('farm')}. Manor (+1★):{' '}
                {costText('manor')}. Castle (+2★): {costText('castle')}.
              </p>
              <p>
                First to {VICTORY_POINTS}★ (manor +1, castle +2) wins the realm.
              </p>
            </div>
          )}
          <button
            type="button"
            className={`hud__menu__item${log ? ' hud__menu__item--open' : ''}`}
            role="menuitem"
            onClick={() => setLog((l) => !l)}
          >
            Game log {log ? '▴' : '▾'}
          </button>
          {log && (
            <div className="hud__menu__help">
              {recent.length === 0 ? (
                <p className="hud__menu__muted">Nothing yet.</p>
              ) : (
                recent.map((e, i) => (
                  <p key={i} className="hud__menu__logline">
                    <b>T{e.turn}</b> {e.player === 'human' ? 'You' : e.player === 'ai' ? 'AI' : '·'} {e.action}
                  </p>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
