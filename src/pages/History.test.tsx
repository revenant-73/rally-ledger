import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Match } from '../types';
import History from './History';
import { useMatch } from '../hooks/useMatch';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../hooks/useMatch', () => ({
  useMatch: vi.fn(),
}));

const match = (overrides: Partial<Match>): Match => ({
  id: 'm1',
  teamId: 't1',
  opponentName: 'Liberty',
  matchDate: '2026-08-29T00:00:00.000Z',
  location: 'Home',
  matchType: 'Tournament',
  status: 'active',
  createdAt: '2026-08-29T00:00:00.000Z',
  updatedAt: '2026-08-29T00:00:00.000Z',
  ...overrides,
});

describe('History', () => {
  beforeEach(() => {
    navigate.mockClear();
    vi.restoreAllMocks();
  });

  it('routes active matches through live resume and completed matches through reports', async () => {
    const user = userEvent.setup();
    const resumeMatch = vi.fn();
    const activeMatch = match({ id: 'm-active', opponentName: 'Central' });
    const completedMatch = match({
      id: 'm-completed',
      opponentName: 'Liberty',
      status: 'completed',
      result: 'Win',
    });
    vi.mocked(useMatch).mockReturnValue({
      matches: [activeMatch, completedMatch],
      isSyncing: false,
      canManageTeam: () => false,
      deleteMatch: vi.fn(),
      resumeMatch,
    } as unknown as ReturnType<typeof useMatch>);

    render(<History />);

    await user.click(screen.getByRole('heading', { name: /vs Central/i }));
    expect(resumeMatch).toHaveBeenCalledWith(activeMatch);
    expect(navigate).toHaveBeenCalledWith('/app/match/live');

    await user.click(screen.getByRole('heading', { name: /vs Liberty/i }));
    expect(navigate).toHaveBeenCalledWith('/app/match/history/m-completed');
  });

  it('separates active matches and uses abandon language for active cleanup', async () => {
    const user = userEvent.setup();
    const deleteMatch = vi.fn();
    const activeMatch = match({ id: 'm-active', opponentName: 'Practice' });
    const completedMatch = match({
      id: 'm-completed',
      opponentName: 'Liberty',
      status: 'completed',
      result: 'Win',
    });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(useMatch).mockReturnValue({
      matches: [completedMatch, activeMatch],
      isSyncing: false,
      canManageTeam: () => true,
      deleteMatch,
      resumeMatch: vi.fn(),
    } as unknown as ReturnType<typeof useMatch>);

    render(<History />);

    expect(screen.getByRole('region', { name: 'Active matches' })).toHaveTextContent('vs Practice');
    expect(screen.getByRole('region', { name: 'Completed matches' })).toHaveTextContent('vs Liberty');

    await user.click(screen.getByRole('button', { name: /Abandon active match vs Practice/i }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Abandon active match vs Practice?'));
    expect(deleteMatch).toHaveBeenCalledWith('m-active');

    await user.click(screen.getByRole('button', { name: /Delete completed match vs Liberty/i }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Delete completed match vs Liberty?'));
    expect(deleteMatch).toHaveBeenCalledWith('m-completed');
  });
});
