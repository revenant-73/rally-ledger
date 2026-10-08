import type { Team } from '../types';
import { getTeamPrototypeStorageKey } from './prototypeCloudState';

export const offlineWorkspaceKey = (userId: string) => `century-matchbook-offline-workspace:${userId}`;

// This is a directory of already downloaded device data, not a server-access
// credential. Never restore admin rights or send cloud requests based on it.
export const prepareOfflineWorkspace = (userId: string, teams: Team[]) => {
  try {
    localStorage.setItem(offlineWorkspaceKey(userId), JSON.stringify({
      version: 1, userId, preparedAt: new Date().toISOString(),
      teams: teams.map(({ id, name, level, season, createdAt, updatedAt }) =>
        ({ id, name, level, season, createdAt, updatedAt })),
    }));
    return true;
  } catch { return false; }
};

export const forgetOfflineWorkspace = (userId: string) => {
  try { localStorage.removeItem(offlineWorkspaceKey(userId)); } catch { /* Match snapshots remain intact. */ }
};

export const readOfflineTeams = (userId: string): Team[] => {
  try {
    const workspace = JSON.parse(localStorage.getItem(offlineWorkspaceKey(userId)) ?? 'null');
    if (workspace?.version !== 1 || workspace.userId !== userId || !Array.isArray(workspace.teams)) return [];
    return workspace.teams.filter((team: Team) => {
      if (!team || typeof team.id !== 'string' || typeof team.name !== 'string' || typeof team.season !== 'string') return false;
      try {
        const snapshot = JSON.parse(localStorage.getItem(getTeamPrototypeStorageKey(team.id)) ?? 'null');
        return snapshot?.version === 1 && Array.isArray(snapshot.rallies) && Array.isArray(snapshot.roster);
      } catch { return false; }
    });
  } catch { return []; }
};
