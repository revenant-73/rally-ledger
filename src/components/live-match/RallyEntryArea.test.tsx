import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Lineup, Player } from '../../types';
import RallyEntryArea from './RallyEntryArea';

const players: Player[] = Array.from({ length: 13 }, (_, index) => ({
  id: `p${index + 1}`,
  teamId: 't1',
  firstName: `Player${index + 1}`,
  lastName: 'Test',
  jerseyNumber: String(index + 1),
  position: 'OH',
  active: true,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
}));

const lineup: Lineup = {
  position1: 'p1',
  position2: 'p2',
  position3: 'p3',
  position4: 'p4',
  position5: 'p5',
  position6: 'p6',
};

const noop = vi.fn();

const renderEntryArea = () =>
  render(
    <RallyEntryArea
      servingTeam="Us"
      serverPlayerId={null}
      serveResult={null}
      receiveResult={null}
      showReceivePlayerSelection={false}
      pointWinner={null}
      showPlayerSelection={false}
      showClassification={false}
      players={players}
      positiveOutcomes={['Kill']}
      errorOutcomes={['Attack Error']}
      onServerClick={noop}
      onServeQualityClick={noop}
      onReceiveQualityClick={noop}
      onReceivePlayerClick={noop}
      onPointClick={noop}
      onPlayerClick={noop}
      onClassificationClick={noop}
      onOutcomeClick={noop}
      onResetEntry={noop}
      onCompleteRally={vi.fn().mockResolvedValue(undefined)}
      onSetServeResult={noop}
      onSetShowReceivePlayerSelection={noop}
      onSetReceiveResult={noop}
      onSetPointWinner={noop}
      onSetShowPlayerSelection={noop}
      onSetOutcome={noop}
      onSetServerPlayerId={noop}
      currentLineup={lineup}
      currentRotation={1}
    />
  );

describe('RallyEntryArea', () => {
  it('marks player selection controls for short landscape density rules', () => {
    const { container } = renderEntryArea();

    expect(screen.getByRole('heading', { name: /confirm server/i })).toBeInTheDocument();
    expect(container.querySelector('.live-predicted-server')).toBeInTheDocument();
    expect(container.querySelector('.live-player-grid')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /#13/i })).toBeInTheDocument();
  });
});
