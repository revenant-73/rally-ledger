import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthProvider } from './AuthContext';

describe('AuthProvider startup recovery', () => {
  beforeEach(() => {
    localStorage.clear();
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
