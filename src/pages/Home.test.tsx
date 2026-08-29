import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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
    expect(navigate).toHaveBeenCalledWith('/match/live');
  });
});
