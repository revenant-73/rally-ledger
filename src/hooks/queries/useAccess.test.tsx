import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useAccess } from './useAccess';
import { apiPost } from '../../utils/api';

vi.mock('../../utils/api', () => ({ apiPost: vi.fn() }));
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); onlineManager.setOnline(true); });

it('verifies access on reconnect even if the query online manager missed the cold offline transition', async () => {
  const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  onlineManager.setOnline(true);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => useAccess('coach'), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(apiPost).not.toHaveBeenCalled();
  vi.mocked(apiPost).mockResolvedValue({ isAdmin: false, manageableTeamIds: ['team'], teams: [], assignments: [] });
  online.mockReturnValue(true);
  act(() => window.dispatchEvent(new Event('online')));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(apiPost).toHaveBeenCalledOnce();
  client.clear();
});
