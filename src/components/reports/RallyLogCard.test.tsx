import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Player, RallyEvent, Set as MatchSet } from '../../types';
import RallyLogCard from './RallyLogCard';

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

const sets: MatchSet[] = [
  {
    id: 's1',
    matchId: 'm1',
    setNumber: 1,
    ourScore: 25,
    opponentScore: 20,
    status: 'completed',
    startingServerTeam: 'Us',
    finalResult: 'Win',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 's2',
    matchId: 'm1',
    setNumber: 2,
    ourScore: 22,
    opponentScore: 25,
    status: 'completed',
    startingServerTeam: 'Opponent',
    finalResult: 'Loss',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
];

const rally = (overrides: Partial<RallyEvent>): RallyEvent => ({
  id: `r${overrides.rallyNumber}`,
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

const rows = () => screen.getAllByRole('row').slice(1);

describe('RallyLogCard', () => {
  const rallies = [
    rally({
      rallyNumber: 1,
      serverPlayerId: 'p1',
      serveResult: 'Ace',
      metadata: { rotation: 1 },
    }),
    rally({
      rallyNumber: 2,
      setId: 's1',
      serverPlayerId: 'p1',
      serveResult: 'Error',
      pointWinner: 'Opponent',
      outcomeType: 'Serve Error',
      classification: 'Gifted',
      metadata: { rotation: 1 },
    }),
    rally({
      rallyNumber: 3,
      setId: 's2',
      servingTeam: 'Opponent',
      receivePlayerId: 'p2',
      receiveResult: 'In-System',
      playerId: 'p1',
      outcomeType: 'Kill',
      classification: 'Earned',
      metadata: { rotation: 4 },
    }),
    rally({
      rallyNumber: 4,
      setId: 's2',
      servingTeam: 'Opponent',
      playerId: 'p2',
      pointWinner: 'Opponent',
      outcomeType: 'Ace',
      classification: 'Earned',
      scoreAfterUs: 0,
      scoreAfterOpponent: 1,
      metadata: { rotation: 4 },
    }),
  ];

  it('filters match rallies by player involvement, class, serving side, and clears filters', async () => {
    const user = userEvent.setup();
    render(<RallyLogCard rallies={rallies} players={players} sets={sets} />);

    expect(screen.getByText('Showing 4 of 4 rallies.')).toBeInTheDocument();
    expect(rows()).toHaveLength(4);

    await user.selectOptions(screen.getByLabelText(/Player/i), 'p2');
    expect(screen.getByText('Showing 2 of 4 rallies.')).toBeInTheDocument();
    expect(within(rows()[0]).getByText('#4')).toBeInTheDocument();
    expect(within(rows()[1]).getByText('#3')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/Class/i), 'Gifted');
    expect(screen.getByText('Showing 0 of 4 rallies.')).toBeInTheDocument();
    expect(screen.getByText('No rallies match these filters.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Clear/i }));
    expect(screen.getByText('Showing 4 of 4 rallies.')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/Serve/i), 'Opponent');
    await user.selectOptions(screen.getByLabelText(/Rotation/i), '4');
    expect(screen.getByText('Showing 2 of 4 rallies.')).toBeInTheDocument();
    expect(within(rows()[0]).getByText('Ace')).toBeInTheDocument();
    expect(within(rows()[1]).getByText('Kill')).toBeInTheDocument();
  });
});
