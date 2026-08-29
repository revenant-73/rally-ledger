import type { Match } from '../types';

export type MatchFormat = 'best-of-3' | 'best-of-5' | 'fixed-2' | 'single-set';

export interface MatchFormatSettings {
  format: MatchFormat;
  maxSets: number;
  setsToWin: number | null;
  standardSetTarget: number;
  decidingSetTarget: number;
}

const DEFAULT_SETTINGS: MatchFormatSettings = {
  format: 'best-of-3',
  maxSets: 3,
  setsToWin: 2,
  standardSetTarget: 25,
  decidingSetTarget: 15,
};

export const MATCH_FORMAT_OPTIONS: Array<{
  value: MatchFormat;
  label: string;
  description: string;
}> = [
  {
    value: 'best-of-3',
    label: 'Best of 3',
    description: 'First to 2 sets.',
  },
  {
    value: 'best-of-5',
    label: 'Best of 5',
    description: 'First to 3 sets.',
  },
  {
    value: 'fixed-2',
    label: '2 Set Scrimmage',
    description: 'Play exactly 2 sets.',
  },
  {
    value: 'single-set',
    label: 'Single Set',
    description: 'One set only.',
  },
];

const FORMAT_LIMITS: Record<MatchFormat, Pick<MatchFormatSettings, 'maxSets' | 'setsToWin'>> = {
  'best-of-3': { maxSets: 3, setsToWin: 2 },
  'best-of-5': { maxSets: 5, setsToWin: 3 },
  'fixed-2': { maxSets: 2, setsToWin: null },
  'single-set': { maxSets: 1, setsToWin: null },
};

const isMatchFormat = (value: unknown): value is MatchFormat =>
  typeof value === 'string' && value in FORMAT_LIMITS;

const asPositiveNumber = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;

export const getDefaultMatchFormatForType = (matchType?: string): MatchFormat => {
  if (matchType === 'League') return 'best-of-5';
  if (matchType === 'Scrimmage') return 'fixed-2';
  return DEFAULT_SETTINGS.format;
};

export const getMatchFormatSettings = (match?: Partial<Pick<Match, 'metadata' | 'matchType'>> | null): MatchFormatSettings => {
  const metadata = match?.metadata ?? {};
  const inferredFormat = getDefaultMatchFormatForType(match?.matchType);
  const metadataFormat = isMatchFormat(metadata.matchFormat) ? metadata.matchFormat : undefined;
  const format = match?.matchType === 'League' && metadataFormat === 'best-of-3'
    ? 'best-of-5'
    : metadataFormat ?? inferredFormat;
  const limits = FORMAT_LIMITS[format];

  return {
    format,
    maxSets: limits.maxSets,
    setsToWin: limits.setsToWin,
    standardSetTarget: asPositiveNumber(metadata.standardSetTarget, DEFAULT_SETTINGS.standardSetTarget),
    decidingSetTarget: asPositiveNumber(metadata.decidingSetTarget, DEFAULT_SETTINGS.decidingSetTarget),
  };
};

export const getSetTarget = (settings: MatchFormatSettings, setNumber: number) =>
  settings.setsToWin && setNumber === settings.maxSets
    ? settings.decidingSetTarget
    : settings.standardSetTarget;

export const getAvailableNextSetNumbers = (
  settings: MatchFormatSettings,
  playedSetNumbers: number[],
) => {
  const played = new Set(playedSetNumbers);

  return Array.from({ length: settings.maxSets }, (_, index) => index + 1)
    .filter(setNumber => !played.has(setNumber));
};

export const isMatchCompleteAfterSet = (
  settings: MatchFormatSettings,
  completedSetResults: Array<'Win' | 'Loss'>,
) => {
  if (completedSetResults.length >= settings.maxSets) return true;
  if (!settings.setsToWin) return false;

  const wins = completedSetResults.filter(result => result === 'Win').length;
  const losses = completedSetResults.filter(result => result === 'Loss').length;

  return wins >= settings.setsToWin || losses >= settings.setsToWin;
};
