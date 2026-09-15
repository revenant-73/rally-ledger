import type { Match, Player, RallyEvent, Set as MatchSet, Team } from '../types';
import { downloadTextFile, fileSafe } from './reportExport';

const RECOVERY_EXPORT_VERSION = 1;

export interface MatchRecoveryPayload {
  exportVersion: number;
  exportedAt: string;
  reason: 'match-completed-offline-or-pending-sync';
  app: 'Rally Ledger';
  instructions: string;
  match: Match;
  team: Team | null;
  players: Player[];
  sets: MatchSet[];
  rallies: RallyEvent[];
}

export const buildMatchRecoveryPayload = ({
  match,
  team,
  players,
  sets,
  rallies,
}: {
  match: Match;
  team: Team | null;
  players: Player[];
  sets: MatchSet[];
  rallies: RallyEvent[];
}): MatchRecoveryPayload => ({
  exportVersion: RECOVERY_EXPORT_VERSION,
  exportedAt: new Date().toISOString(),
  reason: 'match-completed-offline-or-pending-sync',
  app: 'Rally Ledger',
  instructions:
    'This is a Rally Ledger recovery export. Keep it until the completed match appears in Reports after reconnecting. If it does not appear, email this file to the app administrator so the match, sets, rallies, team, and roster can be restored.',
  match,
  team,
  players,
  sets,
  rallies,
});

export const buildMatchRecoveryFilename = (match: Pick<Match, 'opponentName' | 'matchDate'>) => {
  const date = match.matchDate.split('T')[0] || new Date().toISOString().split('T')[0];
  return `rally-ledger-recovery-${date}-vs-${fileSafe(match.opponentName)}.json`;
};

export const serializeMatchRecoveryPayload = (payload: MatchRecoveryPayload) =>
  JSON.stringify(payload, null, 2);

export const downloadMatchRecoveryFile = (payload: MatchRecoveryPayload) => {
  downloadTextFile(
    buildMatchRecoveryFilename(payload.match),
    serializeMatchRecoveryPayload(payload),
    'application/json;charset=utf-8',
  );
};

export const openRecoveryEmailDraft = (payload: MatchRecoveryPayload) => {
  const subject = `Rally Ledger recovery file - ${payload.match.opponentName}`;
  const body = [
    'Rally Ledger could not confirm this completed match was fully synced when it was finished.',
    '',
    `Match: ${payload.team?.name ?? 'Team'} vs ${payload.match.opponentName}`,
    `Date: ${payload.match.matchDate}`,
    `Match ID: ${payload.match.id}`,
    '',
    'Please attach the downloaded recovery JSON file before sending.',
  ].join('\n');

  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};
