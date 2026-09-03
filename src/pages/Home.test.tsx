import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Match } from '../types';
import Home from './Home';
import { useMatch } from '../hooks/useMatch';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

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

describe('Home', () => {
  beforeEach(() => {
    navigate.mockClear();
  });

  it('resumes a database-backed active match when local active match state is empty', async () => {
    const user = userEvent.setup();
    const resumeMatch = vi.fn();
    const activeMatch = match({ id: 'm-active', opponentName: 'Central' });
    vi.mocked(useMatch).mockReturnValue({
      activeMatch: null,
      matches: [match({ id: 'm-completed', opponentName: 'Done', status: 'completed' }), activeMatch],
      resumeMatch,
    } as unknown as ReturnType<typeof useMatch>);

    render(<Home />);

    await user.click(screen.getByRole('button', { name: /Resume vs Central/i }));

    expect(resumeMatch).toHaveBeenCalledWith(activeMatch);
    expect(navigate).toHaveBeenCalledWith('/app/match/live');
  });

  it('shows every active match and routes Manage to History', async () => {
    const user = userEvent.setup();
    const resumeMatch = vi.fn();
    vi.mocked(useMatch).mockReturnValue({
      activeMatch: match({ id: 'm-current', opponentName: 'Current', location: 'Court 1' }),
      matches: [
        match({ id: 'm-current', opponentName: 'Current', location: 'Court 1' }),
        match({ id: 'm-db', opponentName: 'Database', location: 'Court 2' }),
        match({ id: 'm-done', opponentName: 'Done', status: 'completed' }),
      ],
      resumeMatch,
    } as unknown as ReturnType<typeof useMatch>);

    render(<Home />);

    expect(screen.getByRole('region', { name: 'Active matches' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resume vs Current/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resume vs Database/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Resume vs Done/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Manage' }));
    expect(navigate).toHaveBeenCalledWith('/app/history');
  });
});
