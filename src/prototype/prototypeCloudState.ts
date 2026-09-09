import type {
  LineupSlots,
  PrototypeMatchInput,
  PrototypePlayer,
  PrototypeSetInput,
  RallyRecord,
  Rotation,
  SetSetup,
} from './matchbookModel';

export const PROTOTYPE_METADATA_KEY = 'matchbookPrototypeV1';
export const LEGACY_PROTOTYPE_STORAGE_KEY = 'century-matchbook-rebuild-prototype';
export const PROTOTYPE_DOCUMENT_VERSION = 1;

export type PrototypeSyncStatus = 'loading' | 'saving' | 'saved' | 'offline' | 'error';
export type CourtSide = 'left' | 'right';

export interface SavedPrototypeLineup {
  id: string;
  name: string;
  slots: LineupSlots;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string;
  createdByEmail?: string;
  linkedUserId?: string;
  linkedUserEmail?: string;
}

export interface PrototypeLineupAttribution {
  userId: string;
  email: string;
  linkedUserId?: string;
  linkedUserEmail?: string;
}

export interface PrototypeCloudDocument {
  version: 1;
  revision: number;
  updatedAt: string;
  currentMatchId: string;
  currentMatchStartedAt: string;
  setup: SetSetup;
  draftSetup: SetSetup;
  rallies: RallyRecord[];
  completedSets: PrototypeSetInput[];
  roster: PrototypePlayer[];
  currentLineup: LineupSlots;
  courtSide: CourtSide;
  seasonMatches: PrototypeMatchInput[];
  savedLineups: SavedPrototypeLineup[];
}

const rotations: Rotation[] = [1, 2, 3, 4, 5, 6];
const demoMatchIds = new Set(['prior-liberty', 'prior-central']);
const demoPlayers = new Map([
  ['p1', 'Avery Nguyen'], ['p2', 'Blake Carter'], ['p3', 'Casey Lopez'], ['p4', 'Drew Martin'],
  ['p5', 'Emerson Hall'], ['p6', 'Finley Reed'], ['p7', 'Gray Wilson'], ['p8', 'Harper Kim'],
  ['p9', 'Jordan Price'], ['p10', 'Kai Brooks'], ['p11', 'Logan Rivera'], ['p12', 'Morgan Lee'],
  ['p13', 'Parker Stone'], ['p14', 'Quinn Torres'],
]);

const makeId = (prefix: string) =>
  `${prefix}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

export const createNeutralSetup = (): SetSetup => ({
  opponent: '',
  setNumber: 1,
  matchFormat: 'best-of-3',
  standardSetTarget: 25,
  decidingSetTarget: 15,
  initialMode: 'serving',
  initialRotation: 1,
  lineup: {},
  rotationServers: {},
});

export const createFreshPrototypeDocument = (now = new Date()): PrototypeCloudDocument => ({
  version: PROTOTYPE_DOCUMENT_VERSION,
  revision: 0,
  updatedAt: now.toISOString(),
  currentMatchId: makeId('match'),
  currentMatchStartedAt: now.toISOString(),
  setup: createNeutralSetup(),
  draftSetup: createNeutralSetup(),
  rallies: [],
  completedSets: [],
  roster: [],
  currentLineup: {},
  courtSide: 'left',
  seasonMatches: [],
  savedLineups: [],
});

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const sanitizeLineup = (value: unknown, allowedPlayerIds: Set<string>): LineupSlots => {
  if (!isRecord(value)) return {};
  return rotations.reduce<LineupSlots>((lineup, rotation) => {
    const playerId = value[String(rotation)];
    if (typeof playerId === 'string' && allowedPlayerIds.has(playerId)) lineup[rotation] = playerId;
    return lineup;
  }, {});
};

const isDemoPlayer = (player: PrototypePlayer) => demoPlayers.get(player.id) === player.name;

export const isCompleteLineup = (lineup: LineupSlots) => {
  const ids = rotations.map((rotation) => lineup[rotation]);
  return ids.every((id): id is string => Boolean(id)) && new Set(ids).size === rotations.length;
};

export const sanitizePrototypeDocument = (value: unknown, now = new Date()): PrototypeCloudDocument => {
  const fresh = createFreshPrototypeDocument(now);
  if (!isRecord(value)) return fresh;

  const rawRoster = Array.isArray(value.roster) ? value.roster : [];
  const roster = rawRoster.filter((player): player is PrototypePlayer => {
    if (!isRecord(player)) return false;
    const candidate = player as unknown as PrototypePlayer;
    return typeof candidate.id === 'string' && typeof candidate.number === 'string' && typeof candidate.name === 'string' && !isDemoPlayer(candidate);
  }).map((player) => ({ ...player, active: player.active !== false }));
  const playerIds = new Set(roster.map((player) => player.id));
  const rawSetup = isRecord(value.setup) ? value.setup as unknown as SetSetup : fresh.setup;
  const lineup = sanitizeLineup(rawSetup.lineup ?? value.currentLineup, playerIds);
  const setup: SetSetup = {
    ...fresh.setup,
    ...rawSetup,
    opponent: typeof rawSetup.opponent === 'string' ? rawSetup.opponent : '',
    setNumber: typeof rawSetup.setNumber === 'number' && rawSetup.setNumber > 0 ? rawSetup.setNumber : 1,
    lineup,
    initialServerId: rawSetup.initialMode === 'serving' ? lineup[rawSetup.initialRotation] : undefined,
    rotationServers: { ...lineup },
  };
  const rawDraftSetup = isRecord(value.draftSetup) ? value.draftSetup as unknown as SetSetup : setup;
  const draftLineup = sanitizeLineup(rawDraftSetup.lineup ?? lineup, playerIds);
  const draftSetup: SetSetup = {
    ...setup,
    ...rawDraftSetup,
    lineup: draftLineup,
    initialServerId: rawDraftSetup.initialMode === 'serving' ? draftLineup[rawDraftSetup.initialRotation] : undefined,
    rotationServers: { ...draftLineup },
  };
  const seasonMatches = (Array.isArray(value.seasonMatches) ? value.seasonMatches : [])
    .filter((match): match is PrototypeMatchInput => isRecord(match) && typeof match.id === 'string' && !demoMatchIds.has(match.id));
  const savedLineups = (Array.isArray(value.savedLineups) ? value.savedLineups : [])
    .filter((item): item is SavedPrototypeLineup => isRecord(item) && typeof item.id === 'string' && typeof item.name === 'string')
    .map((item) => ({
      ...item,
      slots: sanitizeLineup(item.slots, playerIds),
      createdByUserId: typeof item.createdByUserId === 'string' ? item.createdByUserId : undefined,
      createdByEmail: typeof item.createdByEmail === 'string' ? item.createdByEmail : undefined,
      linkedUserId: typeof item.linkedUserId === 'string' ? item.linkedUserId : undefined,
      linkedUserEmail: typeof item.linkedUserEmail === 'string' ? item.linkedUserEmail : undefined,
    }))
    .filter((item) => isCompleteLineup(item.slots));

  return {
    version: PROTOTYPE_DOCUMENT_VERSION,
    revision: typeof value.revision === 'number' ? Math.max(0, value.revision) : 0,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : now.toISOString(),
    currentMatchId: typeof value.currentMatchId === 'string' && value.currentMatchId ? value.currentMatchId : fresh.currentMatchId,
    currentMatchStartedAt: typeof value.currentMatchStartedAt === 'string' ? value.currentMatchStartedAt : now.toISOString(),
    setup,
    draftSetup,
    rallies: (Array.isArray(value.rallies) ? value.rallies : []) as RallyRecord[],
    completedSets: (Array.isArray(value.completedSets) ? value.completedSets : []) as PrototypeSetInput[],
    roster,
    currentLineup: sanitizeLineup(value.currentLineup ?? lineup, playerIds),
    courtSide: value.courtSide === 'right' ? 'right' : 'left',
    seasonMatches,
    savedLineups,
  };
};

export const upsertSavedLineup = (
  savedLineups: SavedPrototypeLineup[],
  name: string,
  slots: LineupSlots,
  now = new Date(),
  attribution?: PrototypeLineupAttribution,
): SavedPrototypeLineup[] => {
  const normalizedName = name.trim();
  if (!normalizedName || !isCompleteLineup(slots)) return savedLineups;
  const existing = savedLineups.find((item) => item.name.localeCompare(normalizedName, undefined, { sensitivity: 'accent' }) === 0);
  const timestamp = now.toISOString();
  const next: SavedPrototypeLineup = {
    id: existing?.id ?? makeId('lineup'),
    name: normalizedName,
    slots: { ...slots },
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    createdByUserId: existing?.createdByUserId ?? attribution?.userId,
    createdByEmail: existing?.createdByEmail ?? attribution?.email,
    linkedUserId: attribution?.linkedUserId ?? attribution?.userId ?? existing?.linkedUserId,
    linkedUserEmail: attribution?.linkedUserEmail ?? attribution?.email ?? existing?.linkedUserEmail,
  };
  return existing ? savedLineups.map((item) => item.id === existing.id ? next : item) : [...savedLineups, next];
};

export const archiveMatchOnce = (matches: PrototypeMatchInput[], match: PrototypeMatchInput) =>
  matches.some((item) => item.id === match.id) ? matches : [...matches, match];

export const getTeamPrototypeStorageKey = (teamId: string) => `${LEGACY_PROTOTYPE_STORAGE_KEY}:team:${teamId}`;
