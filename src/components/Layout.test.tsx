import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { APP_UPDATE_READY_EVENT, type UpdateServiceWorker } from '../appUpdateEvents';
import { useMatch } from '../hooks/useMatch';
import Layout from './Layout';

vi.mock('../hooks/useMatch', () => ({
  useMatch: vi.fn(),
}));

const renderLayout = (queryClient = new QueryClient()) => {
  vi.mocked(useMatch).mockReturnValue({
    isSyncing: false,
  } as ReturnType<typeof useMatch>);

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div>Home page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const setNavigatorOnline = (value: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
};

describe('Layout sync status', () => {
  it('shows offline status when the browser reports no network', () => {
    setNavigatorOnline(false);

    renderLayout();

    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('shows queued writes when paused mutations are present', () => {
    setNavigatorOnline(true);
    const queryClient = new QueryClient();
    queryClient.getMutationCache().build(queryClient, {
      mutationKey: ['addRally'],
      mutationFn: vi.fn(),
    }, {
      status: 'pending',
      isPaused: true,
      context: undefined,
      data: undefined,
      error: null,
      failureCount: 0,
      failureReason: null,
      variables: {},
      submittedAt: Date.now(),
    });

    renderLayout(queryClient);

    expect(screen.getByText('1 queued')).toBeInTheDocument();
  });

  it('shows an update-ready action without forcing an automatic reload', async () => {
    setNavigatorOnline(true);
    const user = userEvent.setup();
    const updateServiceWorker = vi.fn() as UpdateServiceWorker;

    renderLayout();

    act(() => {
      window.dispatchEvent(new CustomEvent(APP_UPDATE_READY_EVENT, {
        detail: { updateServiceWorker },
      }));
    });

    await user.click(await screen.findByRole('button', { name: /Update Ready/i }));

    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });
});
