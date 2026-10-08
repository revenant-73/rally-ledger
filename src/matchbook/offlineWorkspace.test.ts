import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetOfflineWorkspace, offlineWorkspaceKey, prepareOfflineWorkspace, readOfflineTeams } from './offlineWorkspace';
import { createFreshPrototypeDocument, getTeamPrototypeStorageKey } from './prototypeCloudState';
const team = { id: 'team', name: 'Varsity', season: '2026', level: 'Varsity', createdAt: '', updatedAt: '', metadata: { secret: 'not a permission cache' } };

describe('offline team directory', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
  it('only opens downloaded teams belonging to the prepared account', () => {
    prepareOfflineWorkspace('coach', [team]);
    expect(readOfflineTeams('coach')).toEqual([]);
    localStorage.setItem(getTeamPrototypeStorageKey(team.id), JSON.stringify(createFreshPrototypeDocument()));
    expect(readOfflineTeams('coach')).toEqual([expect.objectContaining({ id: team.id })]);
    expect(readOfflineTeams('other-coach')).toEqual([]);
    expect(readOfflineTeams('coach')[0].metadata).toBeUndefined();
  });
  it('ignores malformed directories and snapshots', () => {
    localStorage.setItem(offlineWorkspaceKey('coach'), '{broken');
    expect(readOfflineTeams('coach')).toEqual([]);
    prepareOfflineWorkspace('coach', [team]);
    localStorage.setItem(getTeamPrototypeStorageKey(team.id), '{broken');
    expect(readOfflineTeams('coach')).toEqual([]);
  });
  it('revokes offline reopening while retaining recoverable match data', () => {
    prepareOfflineWorkspace('coach', [team]);
    const raw = JSON.stringify(createFreshPrototypeDocument());
    localStorage.setItem(getTeamPrototypeStorageKey(team.id), raw);
    forgetOfflineWorkspace('coach');
    expect(readOfflineTeams('coach')).toEqual([]);
    expect(localStorage.getItem(getTeamPrototypeStorageKey(team.id))).toBe(raw);
  });
  it('reports a failed preparation instead of claiming the team is ready', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota exceeded'); });
    expect(prepareOfflineWorkspace('coach', [team])).toBe(false);
  });
});
