import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { del, get, set } from 'idb-keyval';
import { indexedDbPersister, RESTORE_TIMEOUT_MS } from './queryPersister';

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

describe('indexedDbPersister', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(get).mockReset();
    vi.mocked(set).mockReset();
    vi.mocked(del).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stops waiting when an iOS IndexedDB restore never settles', async () => {
    vi.mocked(get).mockReturnValue(new Promise(() => undefined));

    const restoration = indexedDbPersister.restoreClient();
    await vi.advanceTimersByTimeAsync(RESTORE_TIMEOUT_MS);

    await expect(restoration).resolves.toBeUndefined();
  });

  it('treats an IndexedDB restore failure as an empty cache', async () => {
    vi.mocked(get).mockRejectedValue(new Error('IndexedDB unavailable'));

    await expect(indexedDbPersister.restoreClient()).resolves.toBeUndefined();
  });
});
