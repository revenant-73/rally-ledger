import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const authState = vi.hoisted(() => ({ authenticated: true, access: 'authorized' as 'authorized' | 'backgroundRefetch' | 'pendingCached' | 'unauthorized' | 'error', logout: vi.fn() }));

vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    user: authState.authenticated ? { id: 'coach-1', email: 'coach@example.com' } : null,
    loading: false,
    login: vi.fn(),
    logout: authState.logout,
  }),
}));

vi.mock('./hooks/queries/useAccess', () => ({
  useAccess: () => ({
    data: ['authorized', 'backgroundRefetch', 'pendingCached'].includes(authState.access) ? { isAdmin: false, manageableTeamIds: ['team-1'], teams: [], assignments: [] } : undefined,
    isLoading: false,
    isFetching: authState.access === 'pendingCached' || authState.access === 'backgroundRefetch',
    isFetchedAfterMount: authState.access !== 'pendingCached',
    isError: authState.access === 'unauthorized' || authState.access === 'error',
    error: authState.access === 'unauthorized' ? new Error('Not authorized for this program') : authState.access === 'error' ? new Error('Network error') : null,
    refetch: vi.fn(),
  }),
}));

vi.mock('./pages/RebuildPrototype', () => ({
  default: () => <div>Production Courtside Matchbook</div>,
}));

describe('production routing', () => {
  beforeEach(() => {
    authState.authenticated = true;
    authState.access = 'authorized';
    authState.logout.mockClear();
    window.history.pushState({}, '', '/');
  });

  it('mounts the proven courtside app at the authenticated root route', async () => {
    render(<App />);
    expect(await screen.findByText('Production Courtside Matchbook')).toBeInTheDocument();
  });

  it('redirects unauthenticated root visitors to login', async () => {
    authState.authenticated = false;
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
  });

  it('gates an authenticated account without program access and offers sign out', async () => {
    authState.access = 'unauthorized';
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Access Required' })).toBeInTheDocument();
    expect(screen.getByText('coach@example.com')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Sign Out' }).click();
    expect(authState.logout).toHaveBeenCalledOnce();
    expect(screen.queryByText('Production Courtside Matchbook')).not.toBeInTheDocument();
  }, 15000);

  it('does not show protected data when access verification fails', async () => {
    authState.access = 'error';
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Could not verify access' })).toBeInTheDocument();
    expect(screen.queryByText('Production Courtside Matchbook')).not.toBeInTheDocument();
  }, 15000);

  it('never trusts cached authorization while fresh verification is pending or denied', async () => {
    authState.access = 'pendingCached';
    const view = render(<App />);
    expect(screen.queryByText('Production Courtside Matchbook')).not.toBeInTheDocument();

    authState.access = 'unauthorized';
    view.rerender(<App />);
    expect(await screen.findByRole('heading', { name: 'Access Required' })).toBeInTheDocument();
    expect(screen.queryByText('Production Courtside Matchbook')).not.toBeInTheDocument();
  });

  it('renders cached-team UI only after current-session access verification succeeds', async () => {
    authState.access = 'pendingCached';
    const view = render(<App />);
    expect(screen.queryByText('Production Courtside Matchbook')).not.toBeInTheDocument();

    authState.access = 'authorized';
    view.rerender(<App />);
    expect(await screen.findByText('Production Courtside Matchbook')).toBeInTheDocument();
  });

  it('keeps live entry mounted during later background access refetches', async () => {
    const view = render(<App />);
    expect(await screen.findByText('Production Courtside Matchbook')).toBeInTheDocument();

    authState.access = 'backgroundRefetch';
    view.rerender(<App />);
    expect(screen.getByText('Production Courtside Matchbook')).toBeInTheDocument();
  });
});
