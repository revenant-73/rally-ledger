import {
  getTeamPrototypeStorageKey, LEGACY_PROTOTYPE_STORAGE_KEY, sanitizePrototypeDocument,
  type PrototypeCloudDocument,
} from './prototypeCloudState';

type LocalSync = { pending: boolean; baseUpdatedAt: string | null; attempt?: PrototypeCloudDocument };
type LocalDocument = PrototypeCloudDocument & { localSync?: LocalSync };

export const loadLocalMatchbook = (teamId: string, cloud: unknown) => {
  const cloudDocument = cloud ? sanitizePrototypeDocument(cloud) : null;
  let local: LocalDocument | null = null;
  let legacy = false;
  try {
    const stored = localStorage.getItem(getTeamPrototypeStorageKey(teamId));
    const old = !cloud && !stored ? localStorage.getItem(LEGACY_PROTOTYPE_STORAGE_KEY) : null;
    const parsed = JSON.parse(stored ?? old ?? 'null') as LocalDocument | null;
    if (parsed && typeof parsed === 'object' && (parsed.version === 1 || old) && Array.isArray(parsed.rallies)) {
      local = { ...sanitizePrototypeDocument(parsed), localSync: parsed.localSync };
    }
    legacy = Boolean(old && local);
  } catch { /* Cloud recovery remains available if browser storage is unavailable. */ }

  // Older releases did not persist a pending flag. Rescue newer local snapshots too.
  const useLocal = local && (!cloudDocument || local.localSync?.pending ||
    Date.parse(local.updatedAt) > Date.parse(cloudDocument.updatedAt));
  return {
    document: sanitizePrototypeDocument(useLocal ? local : cloudDocument),
    baseUpdatedAt: useLocal && local?.localSync
      ? local.localSync.baseUpdatedAt : cloudDocument?.updatedAt ?? null,
    recoveryAttempt: useLocal ? local?.localSync?.attempt : undefined,
    legacy,
  };
};

export const writeLocalMatchbook = (teamId: string, document: PrototypeCloudDocument, sync: LocalSync) => {
  try {
    localStorage.setItem(getTeamPrototypeStorageKey(teamId), JSON.stringify({ ...document, localSync: sync }));
    return true;
  } catch {
    return false;
  }
};

export const acknowledgeLocalMatchbook = (teamId: string, document: PrototypeCloudDocument) => {
  try {
    const stored = JSON.parse(localStorage.getItem(getTeamPrototypeStorageKey(teamId)) ?? 'null') as LocalDocument | null;
    // A late response must never replace a newer rally or another tab's snapshot.
    if (stored?.updatedAt !== document.updatedAt) return;
    writeLocalMatchbook(teamId, document, { pending: false, baseUpdatedAt: document.updatedAt });
  } catch { /* The scorer separately reports local write failures. */ }
};
