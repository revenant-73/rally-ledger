import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Match, Player, RallyEvent, Set, Team } from '../types';
import Reports from './Reports';
import { useAuth } from '../hooks/useAuth';
import { useMatch } from '../hooks/useMatch';
import { apiPost } from '../utils/api';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../hooks/useMatch', () => ({
  useMatch: vi.fn(),
}));

vi.mock('../utils/api', () => ({
  apiPost: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const team: Team = {
  id: 'team-1',
  ownerId: 'user-1',
  name: 'Century Varsity',
  level: 'Varsity',
  season: '2026',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const players: Player[] = [
  {
    id: 'player-1',
    teamId: team.id,
    firstName: 'Isa',
    lastName: 'Rivera',
    jerseyNumber: '6',
    position: 'OH',
    active: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'player-2',
    teamId: team.id,
    firstName: 'Luna',
    lastName: 'Kim',
    jerseyNumber: '2',
    position: 'DS',
    active: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'player-3',
    teamId: team.id,
    firstName: 'Cassey',
    lastName: 'Moore',
    jerseyNumber: '3',
    position: 'S',
    active: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
];

const match = (overrides: Partial<Match>): Match => ({
  id: 'match-1',
  teamId: team.id,
  opponentName: 'Central',
  matchDate: '2026-08-20T00:00:00.000Z',
  location: 'Home',
  matchType: 'League',
  status: 'completed',
  result: 'Win',
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
  ...overrides,
});

const set = (overrides: Partial<Set>): Set => ({
  id: 'set-1',
  matchId: 'match-1',
  setNumber: 1,
  ourScore: 2,
  opponentScore: 1,
  status: 'completed',
  startingServerTeam: 'Us',
  finalResult: 'Win',
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
  ...overrides,
});

const rally = (overrides: Partial<RallyEvent>): RallyEvent => ({
  id: 'rally-1',
  matchId: 'match-1',
  setId: 'set-1',
  rallyNumber: 1,
  scoreBeforeUs: 0,
  scoreBeforeOpponent: 0,
  scoreAfterUs: 1,
  scoreAfterOpponent: 0,
  pointWinner: 'Us',
  servingTeam: 'Us',
  serverPlayerId: 'player-1',
  outcomeType: 'Ace',
  classification: 'Earned',
  playerId: 'player-1',
  serveResult: 'Ace',
  createdAt: '2026-08-20T00:00:00.000Z',
  metadata: { rotation: 1 },
  ...overrides,
});

const seasonReport = {
  matches: [
    match({ id: 'match-1', opponentName: 'Central', result: 'Win', matchDate: '2026-08-20T00:00:00.000Z' }),
    match({ id: 'match-2', opponentName: 'Liberty', result: 'Loss', matchDate: '2026-08-21T00:00:00.000Z' }),
  ],
  sets: [
    set({ id: 'set-1', matchId: 'match-1', ourScore: 2, opponentScore: 1, finalResult: 'Win' }),
    set({ id: 'set-2', matchId: 'match-2', ourScore: 0, opponentScore: 1, finalResult: 'Loss' }),
  ],
  rallies: [
    rally({ id: 'rally-1', matchId: 'match-1', setId: 'set-1', rallyNumber: 1 }),
    rally({
      id: 'rally-2',
      matchId: 'match-1',
      setId: 'set-1',
      rallyNumber: 2,
      scoreBeforeUs: 1,
      scoreAfterUs: 1,
      scoreAfterOpponent: 1,
      pointWinner: 'Opponent',
      outcomeType: 'Serve Error',
      classification: 'Gifted',
      serveResult: 'Error',
    }),
    rally({
      id: 'rally-3',
      matchId: 'match-1',
      setId: 'set-1',
      rallyNumber: 3,
      scoreBeforeUs: 1,
      scoreBeforeOpponent: 1,
      scoreAfterUs: 2,
      scoreAfterOpponent: 1,
      servingTeam: 'Opponent',
      serverPlayerId: undefined,
      playerId: 'player-3',
      receivePlayerId: 'player-2',
      receiveResult: 'In-System',
      outcomeType: 'Kill',
    }),
    rally({
      id: 'rally-4',
      matchId: 'match-2',
      setId: 'set-2',
      rallyNumber: 1,
      scoreAfterUs: 0,
      scoreAfterOpponent: 1,
      pointWinner: 'Opponent',
      outcomeType: 'Attack Error',
      classification: 'Gifted',
      playerId: 'player-3',
    }),
  ],
  players,
};

describe('Reports', () => {
  beforeEach(() => {
    navigate.mockClear();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'coach@example.com', createdAt: '', updatedAt: '' },
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useMatch).mockReturnValue({
      activeTeam: team,
      isSyncing: false,
      selectTeam: vi.fn(),
      teams: [team],
    } as unknown as ReturnType<typeof useMatch>);
    vi.mocked(apiPost).mockResolvedValue(seasonReport);
  });

  it('keeps season filters collapsed until the scorer opens them', async () => {
    const user = userEvent.setup();
    render(<Reports />);

    await screen.findByRole('heading', { name: 'Reports' });
    await screen.findByText(/Showing\s*2\s*of\s*2\s*matches/);

    expect(screen.getByRole('button', { name: /Filters off/i })).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('season-report-filters')).toHaveClass('hidden');

    await user.click(screen.getByRole('button', { name: /Filters off/i }));

    expect(screen.getByRole('button', { name: /Filters off/i })).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('season-report-filters')).not.toHaveClass('hidden');
  });

  it('shows the practice plan view from the report dropdown', async () => {
    const user = userEvent.setup();
    render(<Reports />);

    await screen.findByRole('heading', { name: 'Reports' });

    const reportViewSelect = screen.getAllByRole('combobox').at(-1);
    expect(reportViewSelect).toBeDefined();

    await user.selectOptions(reportViewSelect!, 'plan');

    expect(screen.getByRole('heading', { name: 'Next Training Block' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Player Watch List' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Recent Match Check' })).toBeVisible();
  });

  it('reopens filters automatically when filters remove every match', async () => {
    const user = userEvent.setup();
    render(<Reports />);

    await screen.findByRole('heading', { name: 'Reports' });
    await user.click(screen.getByRole('button', { name: /Filters off/i }));
    await user.type(screen.getByLabelText('From'), '2026-09-01');
    await user.click(screen.getByRole('button', { name: /1 active/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'No matches match these filters' })).toBeVisible();
    });
    expect(screen.getByLabelText('From')).toBeVisible();
    expect(screen.getByText('Filtered view · 0 of 2 matches')).toBeVisible();
  });
});
