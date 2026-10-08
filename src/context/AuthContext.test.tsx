import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthContext';
import { useAuth } from '../hooks/useAuth';

describe('AuthProvider startup recovery', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  const Identity = () => {
    const { user, loading } = useAuth();
    return <div>{loading ? 'Checking session' : user?.email ?? 'Signed out'}</div>;
  };

  it('opens the saved identity immediately offline without sending session requests', async () => {
    localStorage.setItem('sessionToken', 'saved-token');
    localStorage.setItem('user', JSON.stringify({ id: 'coach', email: 'coach@example.com' }));
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    render(<AuthProvider><Identity /></AuthProvider>);
    expect(await screen.findByText('coach@example.com')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('preserves the stored session after a dropped request', async () => {
    localStorage.setItem('sessionToken', 'saved-token');
    localStorage.setItem('user', JSON.stringify({ id: 'coach', email: 'coach@example.com' }));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    render(<AuthProvider><Identity /></AuthProvider>);
    expect(await screen.findByText('coach@example.com')).toBeInTheDocument();
    expect(localStorage.getItem('sessionToken')).toBe('saved-token');
  });

  it('still clears an explicitly expired session', async () => {
    localStorage.setItem('sessionToken', 'expired-token');
    localStorage.setItem('user', JSON.stringify({ id: 'coach', email: 'coach@example.com' }));
    localStorage.setItem('century-matchbook-offline-workspace:coach', 'prepared-directory');
    localStorage.setItem('century-matchbook-rebuild-prototype:team:team', 'recoverable-match');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401, ok: false }));
    render(<AuthProvider><Identity /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('Signed out')).toBeInTheDocument());
    expect(localStorage.getItem('sessionToken')).toBeNull();
    expect(localStorage.getItem('century-matchbook-offline-workspace:coach')).toBeNull();
    expect(localStorage.getItem('century-matchbook-rebuild-prototype:team:team')).toBe('recoverable-match');
  });

  it('clears a malformed saved session instead of crashing the app', () => {
    localStorage.setItem('sessionToken', 'stale-token');
    localStorage.setItem('user', 'undefined');

    render(
      <AuthProvider>
        <div>App shell</div>
      </AuthProvider>,
    );

    expect(screen.getByText('App shell')).toBeInTheDocument();
    expect(localStorage.getItem('sessionToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('clears a saved session whose user shape is obsolete', () => {
    localStorage.setItem('sessionToken', 'stale-token');
    localStorage.setItem('user', JSON.stringify({ name: 'Legacy Coach' }));

    render(
      <AuthProvider>
        <div>App shell</div>
      </AuthProvider>,
    );

    expect(screen.getByText('App shell')).toBeInTheDocument();
    expect(localStorage.getItem('sessionToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
