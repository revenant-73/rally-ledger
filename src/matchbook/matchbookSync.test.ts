import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiPost } from '../utils/api';
import { MatchbookSync, SYNC_RETRY_MS, SYNC_TIMEOUT_MS } from './matchbookSync';
import { createFreshPrototypeDocument, getTeamPrototypeStorageKey } from './prototypeCloudState';
import { loadLocalMatchbook } from './localMatchbook';

vi.mock('../utils/api', async (original) => ({ ...await original<typeof import('../utils/api')>(), apiPost: vi.fn() }));

describe('matchbook cloud outbox', () => {
  let sync: MatchbookSync;
  const status = vi.fn();
  const saved = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers(); localStorage.clear(); vi.clearAllMocks();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    sync = new MatchbookSync('team', 'coach', null, status, saved);
  });
  afterEach(() => { sync.stop(); vi.useRealTimers(); vi.restoreAllMocks(); });

  it('keeps a reopened offline workspace local until access is freshly verified, even while online', async () => {
    sync.setCloudEnabled(false);
    const first = createFreshPrototypeDocument();
    const latest = { ...first, revision: 2, updatedAt: '2026-10-09T12:01:00.000Z' };
    sync.save(first); sync.save(latest); sync.retry();
    await vi.advanceTimersByTimeAsync(SYNC_RETRY_MS * 3);
    expect(apiPost).not.toHaveBeenCalled();
    expect(status).toHaveBeenLastCalledWith('local');
    expect(JSON.parse(localStorage.getItem(getTeamPrototypeStorageKey('team'))!).revision).toBe(2);
    vi.mocked(apiPost).mockResolvedValue({ saved: true });
    sync.setCloudEnabled(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(apiPost).toHaveBeenCalledOnce();
    expect(apiPost).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ document: latest }), expect.any(AbortSignal));
    expect(status).toHaveBeenLastCalledWith('saved');
  });

  it('retains an interrupted upload for exact replay after revalidation', async () => {
    vi.mocked(apiPost).mockImplementationOnce((_path, _body, signal) => new Promise((_resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new DOMException('Interrupted', 'AbortError')));
    })).mockResolvedValue({ saved: true });
    const first = createFreshPrototypeDocument();
    sync.save(first); await vi.advanceTimersByTimeAsync(700);
    sync.setCloudEnabled(false);
    await vi.advanceTimersByTimeAsync(SYNC_RETRY_MS * 2);
    expect(apiPost).toHaveBeenCalledOnce();
    expect(status).toHaveBeenLastCalledWith('local');
    sync.setCloudEnabled(true); await vi.advanceTimersByTimeAsync(0);
    expect(apiPost).toHaveBeenCalledTimes(2);
    expect(status).toHaveBeenLastCalledWith('saved');
  });

  it('saves offline scoring immediately and uploads the newest complete snapshot after reconnection', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const first = createFreshPrototypeDocument(new Date('2026-10-08T12:00:00Z'));
    const latest = { ...first, revision: 2, updatedAt: '2026-10-08T12:01:00.000Z', lifecycle: 'complete' as const };
    sync.save(first); sync.save(latest);
    expect(JSON.parse(localStorage.getItem(getTeamPrototypeStorageKey('team'))!).lifecycle).toBe('complete');
    expect(status).toHaveBeenLastCalledWith('offline');
    await vi.advanceTimersByTimeAsync(700);
    expect(apiPost).not.toHaveBeenCalled();
    vi.mocked(apiPost).mockResolvedValue({ saved: true });
    online.mockReturnValue(true); sync.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(apiPost).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ document: latest }), expect.any(AbortSignal));
    expect(status).toHaveBeenLastCalledWith('saved');
    expect(JSON.parse(localStorage.getItem(getTeamPrototypeStorageKey('team'))!).localSync.pending).toBe(false);
  });

  it('retries failures even when the browser still says online', async () => {
    vi.mocked(apiPost).mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce({ saved: true });
    sync.save(createFreshPrototypeDocument());
    await vi.advanceTimersByTimeAsync(700);
    expect(status).toHaveBeenLastCalledWith('error');
    await vi.advanceTimersByTimeAsync(SYNC_RETRY_MS);
    expect(apiPost).toHaveBeenCalledTimes(2);
    expect(status).toHaveBeenLastCalledWith('saved');
  });

  it('times out a hung request and retains its snapshot for retry', async () => {
    vi.mocked(apiPost).mockImplementation((_path, _body, signal) => new Promise((_resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')));
    }));
    sync.save(createFreshPrototypeDocument());
    await vi.advanceTimersByTimeAsync(700 + SYNC_TIMEOUT_MS);
    expect(status).toHaveBeenLastCalledWith('error');
    expect(JSON.parse(localStorage.getItem(getTeamPrototypeStorageKey('team'))!).localSync.pending).toBe(true);
  });

  it('does not claim a cloud save without an explicit acknowledgment', async () => {
    vi.mocked(apiPost).mockResolvedValue(null);
    sync.save(createFreshPrototypeDocument());
    await vi.advanceTimersByTimeAsync(700);
    expect(status).toHaveBeenLastCalledWith('error');
    expect(JSON.parse(localStorage.getItem(getTeamPrototypeStorageKey('team'))!).localSync.pending).toBe(true);
  });

  it('serializes newer rallies behind an in-flight save and advances their cloud base', async () => {
    let finish!: (value: unknown) => void;
    vi.mocked(apiPost).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue({ saved: true });
    const first = createFreshPrototypeDocument(new Date('2026-10-08T12:00:00Z'));
    const latest = { ...first, revision: 2, updatedAt: '2026-10-08T12:01:00.000Z' };
    sync.save(first); await vi.advanceTimersByTimeAsync(700);
    sync.save(latest); await vi.advanceTimersByTimeAsync(700);
    expect(apiPost).toHaveBeenCalledTimes(1);
    finish({ saved: true }); await vi.advanceTimersByTimeAsync(700);
    expect(apiPost).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ document: latest, expectedUpdatedAt: first.updatedAt }), expect.any(AbortSignal));
    expect(status).toHaveBeenLastCalledWith('saved');
  });

  it('recovers a lost response across restart before uploading newer entries', async () => {
    vi.mocked(apiPost).mockRejectedValueOnce(new TypeError('Response lost')).mockResolvedValue({ saved: true });
    const first = createFreshPrototypeDocument(new Date('2026-10-08T12:00:00Z'));
    const latest = { ...first, revision: 2, updatedAt: '2026-10-08T12:01:00.000Z' };
    sync.save(first); await vi.advanceTimersByTimeAsync(700);
    sync.save(latest); sync.stop();
    const recovered = loadLocalMatchbook('team', first);
    expect(recovered.recoveryAttempt).toEqual(first);
    sync = new MatchbookSync('team', 'coach', recovered.baseUpdatedAt, status, saved, recovered.recoveryAttempt);
    sync.save(recovered.document);
    await vi.advanceTimersByTimeAsync(700);
    expect(apiPost).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ document: first, expectedUpdatedAt: null }), expect.any(AbortSignal));
    await vi.advanceTimersByTimeAsync(700);
    expect(apiPost).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ document: recovered.document, expectedUpdatedAt: first.updatedAt }), expect.any(AbortSignal));
    expect(status).toHaveBeenLastCalledWith('saved');
  });

  it.each([409, 401, 403])('keeps the local copy and pauses unsafe uploads on HTTP %s', async code => {
    vi.mocked(apiPost).mockRejectedValue(new ApiError('Blocked', code));
    sync.save(createFreshPrototypeDocument());
    await vi.advanceTimersByTimeAsync(700 + SYNC_RETRY_MS * 2);
    sync.retry();
    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(status).toHaveBeenLastCalledWith(code === 409 ? 'conflict' : 'auth');
    expect(JSON.parse(localStorage.getItem(getTeamPrototypeStorageKey('team'))!).localSync.pending).toBe(true);
  });
});
