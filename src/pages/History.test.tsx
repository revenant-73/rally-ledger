import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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
    expect(navigate).toHaveBeenCalledWith('/match/live');

    await user.click(screen.getByRole('heading', { name: /vs Liberty/i }));
    expect(navigate).toHaveBeenCalledWith('/match/history/m-completed');
  });
});
