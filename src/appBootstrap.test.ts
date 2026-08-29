import { describe, expect, it, vi } from 'vitest';
import { registerSW } from './pwaRegistration';
import { createAppQueryClient, ONE_DAY, registerAppServiceWorker } from './appBootstrap';
import { APP_UPDATE_READY_EVENT } from './appUpdateEvents';

vi.mock('./pwaRegistration', () => ({
  registerSW: vi.fn(),
}));

describe('app bootstrap', () => {
  it('registers the PWA service worker for immediate updates', () => {
    const dispatchEvent = vi.spyOn(window, 'dispatchEvent');
    const updateServiceWorker = vi.fn().mockResolvedValue(undefined);
    vi.mocked(registerSW).mockReturnValue(updateServiceWorker);

    registerAppServiceWorker();
    const options = vi.mocked(registerSW).mock.calls[0][0];

    expect(registerSW).toHaveBeenCalledWith(expect.objectContaining({
      immediate: true,
      onNeedRefresh: expect.any(Function),
    }));
    expect(options).toBeDefined();
    options?.onNeedRefresh?.();
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: APP_UPDATE_READY_EVENT,
      detail: { updateServiceWorker },
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
