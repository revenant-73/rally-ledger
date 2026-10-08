import { ApiError, apiPost } from '../utils/api';
import { acknowledgeLocalMatchbook, writeLocalMatchbook } from './localMatchbook';
import type { PrototypeCloudDocument } from './prototypeCloudState';

export type MatchbookSyncStatus = 'saving' | 'saved' | 'offline' | 'local' | 'error' | 'conflict' | 'auth';
export const SYNC_RETRY_MS = 10_000;
export const SYNC_TIMEOUT_MS = 12_000;

// Local storage is the durable outbox. New queued snapshots are coalesced, while
// an unacknowledged request is retained for safe replay across app restarts.
export class MatchbookSync {
  private pending: PrototypeCloudDocument | null = null;
  private unacknowledged: PrototypeCloudDocument | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private request: AbortController | null = null;
  private stopped = false;
  private blocked = false;
  private cloudEnabled: boolean;
  private baseUpdatedAt: string | null;
  private readonly teamId: string;
  private readonly userId: string;
  private readonly onStatus: (status: MatchbookSyncStatus) => void;
  private readonly onLocalSave: (saved: boolean, at: string) => void;

  constructor(teamId: string, userId: string, baseUpdatedAt: string | null,
    onStatus: (status: MatchbookSyncStatus) => void, onLocalSave: (saved: boolean, at: string) => void,
    recoveryAttempt?: PrototypeCloudDocument, cloudEnabled = true) {
    this.teamId = teamId;
    this.userId = userId;
    this.baseUpdatedAt = baseUpdatedAt;
    this.onStatus = onStatus;
    this.onLocalSave = onLocalSave;
    this.unacknowledged = recoveryAttempt ?? null;
    this.cloudEnabled = cloudEnabled;
  }

  setCloudEnabled(allowed: boolean) {
    if (this.cloudEnabled === allowed) return;
    this.cloudEnabled = allowed;
    if (!allowed) {
      clearTimeout(this.timer);
      this.request?.abort();
      if (!this.blocked) this.onStatus('local');
    } else this.retry();
  }

  save(document: PrototypeCloudDocument) {
    this.pending = document;
    this.onLocalSave(writeLocalMatchbook(this.teamId, document,
      { pending: true, baseUpdatedAt: this.baseUpdatedAt, attempt: this.unacknowledged ?? undefined }), document.updatedAt);
    if (this.blocked) return;
    if (!this.cloudEnabled) { this.onStatus('local'); return; }
    this.onStatus(navigator.onLine ? 'saving' : 'offline');
    this.schedule(700);
  }

  retry = () => {
    if (this.stopped || this.blocked) return;
    if (!this.cloudEnabled) { this.onStatus('local'); return; }
    if (!this.pending) {
      this.onStatus(navigator.onLine ? 'saved' : 'offline');
      return;
    }
    clearTimeout(this.timer);
    void this.flush();
  };

  offline = () => {
    if (!this.stopped && !this.blocked) this.onStatus(this.cloudEnabled ? 'offline' : 'local');
  };

  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    this.request?.abort();
  }

  private schedule(delay: number) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), delay);
  }

  private async flush() {
    if (this.stopped || this.blocked || !this.cloudEnabled || this.request || !this.pending) return;
    if (!navigator.onLine) {
      this.onStatus('offline');
      this.schedule(SYNC_RETRY_MS);
      return;
    }
    // A timed-out response may already have committed. Retry that exact snapshot
    // before sending newer entries, even after a restart, to establish its base.
    const document = this.unacknowledged ?? this.pending;
    this.unacknowledged = document;
    this.onLocalSave(writeLocalMatchbook(this.teamId, this.pending,
      { pending: true, baseUpdatedAt: this.baseUpdatedAt, attempt: document }), this.pending.updatedAt);
    const controller = new AbortController();
    this.request = controller;
    const timeout = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
    let retryDelay = SYNC_RETRY_MS;
    this.onStatus('saving');
    try {
      const response = await apiPost<{ saved: boolean }>('/.netlify/functions/teams', {
        action: 'save-matchbook', userId: this.userId, teamId: this.teamId,
        document, expectedUpdatedAt: this.baseUpdatedAt,
      }, controller.signal);
      if (response?.saved !== true) throw new Error('Cloud save was not acknowledged');
      if (this.stopped) return;
      this.baseUpdatedAt = document.updatedAt;
      this.unacknowledged = null;
      retryDelay = 700;
      acknowledgeLocalMatchbook(this.teamId, document);
      if (this.pending.updatedAt === document.updatedAt) {
        this.pending = null;
        this.onStatus(!this.cloudEnabled ? 'local' : navigator.onLine ? 'saved' : 'offline');
      } else {
        // Advance the base of any newer snapshot recorded while this save ran.
        this.onLocalSave(writeLocalMatchbook(this.teamId, this.pending,
          { pending: true, baseUpdatedAt: this.baseUpdatedAt }), this.pending.updatedAt);
      }
    } catch (error) {
      if (this.stopped) return;
      if (!this.cloudEnabled) { this.onStatus('local'); return; }
      const status = error instanceof ApiError ? error.status : 0;
      this.blocked = status === 409 || status === 401 || status === 403;
      this.onStatus(status === 409 ? 'conflict' : status === 401 || status === 403 ? 'auth' : navigator.onLine ? 'error' : 'offline');
    } finally {
      clearTimeout(timeout);
      this.request = null;
      if (!this.stopped && !this.blocked && this.cloudEnabled && this.pending) this.schedule(retryDelay);
    }
  }
}
