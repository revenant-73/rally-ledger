import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Player, RallyEvent } from '../../types';
import RecentRalliesStrip from './RecentRalliesStrip';

const players: Player[] = [
  {
    id: 'p1',
    teamId: 't1',
    firstName: 'Avery',
    lastName: 'Nguyen',
    jerseyNumber: '07',
    position: 'OH',
    active: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'p2',
    teamId: 't1',
    firstName: 'Mia',
    lastName: 'Stone',
    jerseyNumber: '12',
    position: 'L',
    active: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
];

const rally = (overrides: Partial<RallyEvent>): RallyEvent => ({
  id: `r-${overrides.rallyNumber ?? 1}`,
  matchId: 'm1',
  setId: 's1',
  rallyNumber: overrides.rallyNumber ?? 1,
  scoreBeforeUs: 0,
  scoreBeforeOpponent: 0,
  scoreAfterUs: 1,
  scoreAfterOpponent: 0,
  pointWinner: 'Us',
  servingTeam: 'Us',
  outcomeType: 'Ace',
  classification: 'Earned',
  createdAt: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

describe('RecentRalliesStrip', () => {
  it('shows the latest current-set rally as the undo target', () => {
    render(
      <RecentRalliesStrip
        activeSetId="s1"
        players={players}
        rallies={[
          rally({ rallyNumber: 1, playerId: 'p1', scoreAfterUs: 1, metadata: { rotation: 1 } }),
          rally({ rallyNumber: 2, setId: 's2', playerId: 'p1', scoreAfterUs: 2 }),
          rally({
            rallyNumber: 3,
            playerId: 'p1',
            outcomeType: 'Kill',
            scoreBeforeUs: 1,
            scoreAfterUs: 2,
            metadata: { rotation: 2 },
          }),
        ]}
      />
    );

    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText('#3')).toBeInTheDocument();
    expect(within(cards[0]).getByText('Undo target')).toBeInTheDocument();
    expect(within(cards[0]).getByText('Kill - #07 Avery')).toBeInTheDocument();
    expect(within(cards[0]).getByText(/Rot 2/)).toBeInTheDocument();
  });

  it('shows inferred receiver attribution for opponent ace receive errors', () => {
    render(
      <RecentRalliesStrip
        activeSetId="s1"
        players={players}
        rallies={[
          rally({
            rallyNumber: 1,
            servingTeam: 'Opponent',
            pointWinner: 'Opponent',
            outcomeType: 'Ace',
            classification: 'Earned',
            playerId: 'p2',
            scoreAfterUs: 0,
            scoreAfterOpponent: 1,
          }),
        ]}
      />
    );

    expect(screen.getByText('Ace - #12 Mia')).toBeInTheDocument();
    expect(screen.getByText('Receive Error')).toBeInTheDocument();
  });
});
