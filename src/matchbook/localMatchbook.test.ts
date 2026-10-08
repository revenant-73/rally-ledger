import { beforeEach, describe, expect, it, vi } from 'vitest';
import { acknowledgeLocalMatchbook, loadLocalMatchbook, writeLocalMatchbook } from './localMatchbook';
import { createFreshPrototypeDocument, getTeamPrototypeStorageKey } from './prototypeCloudState';

describe('durable matchbook recovery', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
  const snapshot = (date: string) => createFreshPrototypeDocument(new Date(date));
  it('restores pending local sets rather than an older or competing cloud copy', () => {
    const cloud = snapshot('2026-10-08T12:00:00Z');
    const local = snapshot('2026-10-08T12:01:00Z');
    local.completedSets = [{ id: 'set-1', setNumber: 1, setup: local.setup, rallies: [] },
      { id: 'set-2', setNumber: 2, setup: { ...local.setup, setNumber: 2 }, rallies: [] }];
    writeLocalMatchbook('team', local, { pending: true, baseUpdatedAt: cloud.updatedAt });
    expect(loadLocalMatchbook('team', cloud).document.completedSets).toHaveLength(2);
    expect(loadLocalMatchbook('team', snapshot('2026-10-08T12:02:00Z')).document.completedSets).toHaveLength(2);
    expect(loadLocalMatchbook('team', cloud).baseUpdatedAt).toBe(cloud.updatedAt);
  });
  it('rescues newer snapshots from the previous release and accepts newer cloud data after acknowledgment', () => {
    const older = snapshot('2026-10-08T12:00:00Z');
    const newer = snapshot('2026-10-08T12:01:00Z');
    localStorage.setItem(getTeamPrototypeStorageKey('team'), JSON.stringify(newer));
    expect(loadLocalMatchbook('team', older).document.currentMatchId).toBe(newer.currentMatchId);
    writeLocalMatchbook('team', older, { pending: false, baseUpdatedAt: older.updatedAt });
    expect(loadLocalMatchbook('team', newer).document.currentMatchId).toBe(newer.currentMatchId);
  });
  it('does not overwrite a newer local snapshot when an old cloud response arrives', () => {
    const old = snapshot('2026-10-08T12:00:00Z');
    const next = snapshot('2026-10-08T12:01:00Z');
    writeLocalMatchbook('team', next, { pending: true, baseUpdatedAt: null });
    acknowledgeLocalMatchbook('team', old);
    expect(loadLocalMatchbook('team', old).document.currentMatchId).toBe(next.currentMatchId);
  });
  it('reports blocked or full storage without throwing away in-memory scoring', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    expect(writeLocalMatchbook('team', snapshot('2026-10-08T12:00:00Z'), { pending: true, baseUpdatedAt: null })).toBe(false);
  });
});
