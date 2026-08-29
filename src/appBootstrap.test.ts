import { describe, expect, it, vi } from 'vitest';
import { registerSW } from './pwaRegistration';
import { createAppQueryClient, ONE_DAY, registerAppServiceWorker } from './appBootstrap';

vi.mock('./pwaRegistration', () => ({
  registerSW: vi.fn(),
}));

describe('app bootstrap', () => {
  it('registers the PWA service worker for immediate updates', () => {
    registerAppServiceWorker();

    expect(registerSW).toHaveBeenCalledWith(expect.objectContaining({
      immediate: true,
      onNeedRefresh: expect.any(Function),
    }));
  });

  it('keeps persisted query cache and mutation retry defaults aligned', () => {
    const queryClient = createAppQueryClient();

    expect(queryClient.getDefaultOptions().queries?.gcTime).toBe(ONE_DAY);
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(3);
    expect(queryClient.getMutationDefaults(['addRally'])?.mutationFn).toBeTypeOf('function');
    expect(queryClient.getMutationDefaults(['undoLastRally'])?.mutationFn).toBeTypeOf('function');
    expect(queryClient.getMutationDefaults(['updateSet'])?.mutationFn).toBeTypeOf('function');
  });
});
