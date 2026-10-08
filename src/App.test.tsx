import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { prepareOfflineWorkspace } from './matchbook/offlineWorkspace';
import { createFreshPrototypeDocument, getTeamPrototypeStorageKey } from './matchbook/prototypeCloudState';

const authState = vi.hoisted(() => ({ authenticated: true, access: 'authorized' as 'authorized' | 'backgroundRefetch' | 'backgroundError' | 'pendingCached' | 'unauthorized' | 'error', logout: vi.fn() }));

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
    data: ['authorized', 'backgroundRefetch', 'backgroundError', 'pendingCached'].includes(authState.access) ? { isAdmin: false, manageableTeamIds: ['team-1'], teams: [], assignments: [] } : undefined,
    isLoading: false,
    isFetching: authState.access === 'pendingCached' || authState.access === 'backgroundRefetch',
    isFetchedAfterMount: authState.access !== 'pendingCached',
    dataUpdatedAt: authState.access === 'authorized' ? 20 : 10,
    isError: authState.access === 'unauthorized' || authState.access === 'error' || authState.access === 'backgroundError',
    error: authState.access === 'unauthorized' ? new Error('Not authorized for this program') : ['error', 'backgroundError'].includes(authState.access) ? new Error('Network error') : null,
    refetch: vi.fn(),
  }),
}));

vi.mock('./pages/CourtsideMatchbook', () => ({
  default: ({ cloudVerified = true }: { cloudVerified?: boolean }) => <div>Production Courtside Matchbook{!cloudVerified ? <span>Local scoring only</span> : null}</div>,
}));

describe('production routing', () => {
  beforeEach(() => {
    localStorage.clear();
    authState.authenticated = true;
    authState.access = 'authorized';
    authState.logout.mockClear();
    window.history.pushState({}, '', '/');
  });
  afterEach(() => vi.restoreAllMocks());
  const prepareDevice = (userId = 'coach-1') => {
    prepareOfflineWorkspace(userId, [{ id: 'team-1', name: 'Varsity', season: '2026', level: 'Varsity', createdAt: '', updatedAt: '' }]);
    localStorage.setItem(getTeamPrototypeStorageKey('team-1'), JSON.stringify(createFreshPrototypeDocument()));
  };

  it('cold opens a prepared offline workspace and keeps it mounted until fresh reconnect verification', async () => {
    prepareDevice();
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    authState.access = 'error';
    const view = render(<App />);
    expect(await screen.findByText('Local scoring only')).toBeInTheDocument();
    online.mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
    authState.access = 'pendingCached';
    view.rerender(<App />);
    expect(screen.getByText('Local scoring only')).toBeInTheDocument();
    authState.access = 'authorized';
    view.rerender(<App />);
    expect(screen.getByText('Production Courtside Matchbook')).toBeInTheDocument();
    expect(screen.queryByText('Local scoring only')).not.toBeInTheDocument();
  });

  it('allows prepared local scoring during a server outage with Wi-Fi still connected', async () => {
    prepareDevice(); authState.access = 'error';
    render(<App />);
    expect(await screen.findByText('Local scoring only')).toBeInTheDocument();
  });

  it('does not open another account’s prepared workspace', async () => {
    prepareDevice('other-account'); authState.access = 'error';
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Could not verify access' })).toBeInTheDocument();
  });

  it('honors a fresh access denial even when prepared data exists offline', async () => {
    prepareDevice(); authState.access = 'unauthorized';
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Access Required' })).toBeInTheDocument();
    expect(localStorage.getItem(getTeamPrototypeStorageKey('team-1'))).not.toBeNull();
  });

  it('keeps the legacy workflow behind online authorization', async () => {
    prepareDevice(); authState.access = 'error';
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    window.history.pushState({}, '', '/app');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Could not verify access' })).toBeInTheDocument();
    expect(screen.queryByText('Local scoring only')).not.toBeInTheDocument();
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

  it('keeps an already verified scorer mounted on network failure but honors an explicit denial', async () => {
    const view = render(<App />);
    expect(await screen.findByText('Production Courtside Matchbook')).toBeInTheDocument();
    authState.access = 'backgroundError';
    view.rerender(<App />);
    expect(screen.getByText('Production Courtside Matchbook')).toBeInTheDocument();
    authState.access = 'unauthorized';
    view.rerender(<App />);
    expect(await screen.findByRole('heading', { name: 'Access Required' })).toBeInTheDocument();
    expect(screen.queryByText('Production Courtside Matchbook')).not.toBeInTheDocument();
  });
});
