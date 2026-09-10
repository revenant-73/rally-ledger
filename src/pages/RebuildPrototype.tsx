import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMatch } from '../hooks/useMatch';
import { useAuth } from '../hooks/useAuth';
import { useAccess } from '../hooks/queries/useAccess';
import type { Team } from '../types';
import {
  type BreakdownItem,
  buildRally,
  deriveSetState,
  eventLabels,
  eventNeedsPlayer,
  getWinnerForEvent,
  summarizeSeasonReport,
  summarizeSet,
  TEAM_ATTRIBUTION_ID,
  type ErrorSubtype,
  type LineupSlots,
  type PendingRallyInput,
  type PrototypeMatchFormat,
  type PrototypeMatchInput,
  type PrototypeMatchResult,
  type PrototypeMatchReport,
  type PrototypeSeasonReport,
  type PrototypeSetInput,
  type PrototypePlayer,
  type RallyRecord,
  type RallyMode,
  type Rotation,
  type SetSetup,
  type TeamSide,
  type TerminalEvent,
} from '../prototype/matchbookModel';
import {
  getMatchFormatSettings,
  getSetTarget,
  isMatchCompleteAfterSet,
  MATCH_FORMAT_OPTIONS,
  type MatchFormatSettings,
} from '../utils/matchFormat';
import {
  createFreshPrototypeDocument,
  createNeutralSetup,
  getTeamPrototypeStorageKey,
  isCompleteLineup,
  LEGACY_PROTOTYPE_STORAGE_KEY,
  PROTOTYPE_METADATA_KEY,
  sanitizePrototypeDocument,
  upsertArchivedMatch,
  upsertSavedLineup,
  type CourtSide,
  type PrototypeCloudDocument,
  type PrototypeMatchLifecycle,
  type PrototypeSyncStatus,
  type SavedPrototypeLineup,
} from '../prototype/prototypeCloudState';

const rotations = [1, 2, 3, 4, 5, 6] as const;

const centuryEvents: TerminalEvent[] = ['century_ace', 'century_kill', 'century_block', 'opponent_error'];
const opponentEvents: TerminalEvent[] = [
  'opponent_kill',
  'opponent_block',
  'receive_error',
  'serve_error',
  'attack_error',
  'ball_control_error',
  'violation',
];

const inputClass =
  'h-12 w-full min-w-0 rounded border border-white/15 bg-white px-3 text-base font-bold text-slate-950 outline-none focus:border-teal-300';

const actionClass =
  'min-h-14 rounded border border-white/15 px-3 py-2 text-left text-lg font-black uppercase tracking-normal shadow-sm transition active:scale-[0.98] disabled:opacity-50';

interface PendingSelection {
  event: TerminalEvent;
  mode: 'player' | 'error';
  editingId?: string;
}

interface LineupSelection {
  rotation: Rotation;
  context: 'setup' | 'live';
}

interface SetCompletionReview {
  setNumber: number;
  centuryScore: number;
  opponentScore: number;
  targetScore: number;
  winner?: TeamSide;
  matchComplete: boolean;
  reason: 'automatic' | 'manual';
}

interface EligibleLineupUser {
  id: string;
  email: string;
  name?: string | null;
}

const getCourtPositions = (courtSide: CourtSide): Rotation[] =>
  courtSide === 'left' ? [5, 4, 6, 3, 1, 2] : [2, 1, 3, 6, 4, 5];

const getLineupRotationForCourtPosition = (currentRotation: Rotation, courtPosition: Rotation): Rotation =>
  (((currentRotation + courtPosition - 2) % rotations.length) + 1) as Rotation;

const getDefaultLineup = (players: PrototypePlayer[]): LineupSlots =>
  rotations.reduce<LineupSlots>((lineup, rotation, index) => {
    const player = players.filter((item) => item.active)[index];
    if (player) {
      lineup[rotation] = player.id;
    }
    return lineup;
  }, {});

const getRotationServers = (lineup: LineupSlots): Partial<Record<Rotation, string>> =>
  rotations.reduce<Partial<Record<Rotation, string>>>((servers, rotation) => {
    const playerId = lineup[rotation];
    if (playerId) {
      servers[rotation] = playerId;
    }
    return servers;
  }, {});

const setLineupSlot = (lineup: LineupSlots, rotation: Rotation, playerId: string): LineupSlots => {
  const nextLineup = { ...lineup };
  const previousPlayerId = nextLineup[rotation];
  const existingRotation = rotations.find((item) => nextLineup[item] === playerId);

  nextLineup[rotation] = playerId;
  if (existingRotation && existingRotation !== rotation) {
    if (previousPlayerId) {
      nextLineup[existingRotation] = previousPlayerId;
    } else {
      delete nextLineup[existingRotation];
    }
  }

  return nextLineup;
};

const getPlayerLabel = (players: PrototypePlayer[], playerId?: string) => {
  if (!playerId) {
    return 'Unassigned';
  }
  const player = players.find((item) => item.id === playerId);
  return player ? `#${player.number} ${getShortPlayerName(player)}` : 'Unknown player';
};

const getShortPlayerName = (player: PrototypePlayer) => {
  const [firstName, lastName = ''] = player.name.trim().split(/\s+/);
  const lastInitial = lastName ? ` ${lastName.charAt(0)}.` : '';
  return `${firstName}${lastInitial}`;
};

const getRallyDescription = (rally: RallyRecord, players: PrototypePlayer[]) => {
  if (rally.event === 'score_adjustment') {
    const centuryAdjustment = rally.scoreAdjustment?.century ?? 0;
    const opponentAdjustment = rally.scoreAdjustment?.opponent ?? 0;
    const side = centuryAdjustment !== 0 ? 'Century' : 'Opponent';
    const value = centuryAdjustment !== 0 ? centuryAdjustment : opponentAdjustment;
    return `${side} score ${value > 0 ? '+' : ''}${value}`;
  }

  const playerId = rally.creditedPlayerId ?? rally.chargedPlayerId;
  const playerText = rally.teamAttribution ? 'TEAM / UNCLEAR' : getPlayerLabel(players, playerId);
  const extra = rally.errorSubtype ? ` - ${rally.errorSubtype}` : playerId || rally.teamAttribution ? ` - ${playerText}` : '';
  return `${rally.winner === 'century' ? 'Century' : 'Opponent'} ${eventLabels[rally.event]}${extra}`;
};

const getTopPlayers = (
  summary: ReturnType<typeof summarizeSet>,
  players: PrototypePlayer[],
  key: 'earnedPoints' | 'giftsConceded',
) =>
  summary.players
    .filter((item) => item[key] > 0)
    .sort((a, b) => b[key] - a[key] || getPlayerLabel(players, a.playerId).localeCompare(getPlayerLabel(players, b.playerId)))
    .slice(0, 2);

const makeInput = (event: TerminalEvent, playerId?: string, errorSubtype?: ErrorSubtype): PendingRallyInput => {
  const attribution = eventNeedsPlayer(event);
  const teamAttribution = playerId === TEAM_ATTRIBUTION_ID;
  return {
    winner: getWinnerForEvent(event),
    event,
    errorSubtype,
    creditedPlayerId: attribution === 'credited' && !teamAttribution ? playerId : undefined,
    chargedPlayerId: attribution === 'charged' && !teamAttribution ? playerId : undefined,
    teamAttribution: teamAttribution || undefined,
  };
};

const getPrototypeMatchSettings = (setup: SetSetup): MatchFormatSettings =>
  getMatchFormatSettings({
    metadata: {
      matchFormat: setup.matchFormat,
      standardSetTarget: setup.standardSetTarget,
      decidingSetTarget: setup.decidingSetTarget,
    },
  });

type CompletedSetResult = Exclude<PrototypeMatchResult, 'Open'>;

const getCompletedSetResult = (set: PrototypeSetInput): CompletedSetResult => {
  const state = deriveSetState(set.setup, set.rallies);
  if (state.centuryScore === state.opponentScore) {
    return 'Draw';
  }
  return state.centuryScore > state.opponentScore ? 'Win' : 'Loss';
};

const getSetWinner = (centuryScore: number, opponentScore: number, targetScore: number): TeamSide | undefined => {
  const scoreReached = Math.max(centuryScore, opponentScore) >= targetScore;
  const twoPointLead = Math.abs(centuryScore - opponentScore) >= 2;
  if (!scoreReached || !twoPointLead) {
    return undefined;
  }
  return centuryScore > opponentScore ? 'century' : 'opponent';
};

const getReviewWinner = (centuryScore: number, opponentScore: number, targetScore: number): TeamSide | undefined =>
  getSetWinner(centuryScore, opponentScore, targetScore) ??
  (centuryScore === opponentScore ? undefined : centuryScore > opponentScore ? 'century' : 'opponent');

const getFinalMatchResult = (results: CompletedSetResult[]): CompletedSetResult => {
  const wins = results.filter((result) => result === 'Win').length;
  const losses = results.filter((result) => result === 'Loss').length;
  if (wins === losses) return 'Draw';
  return wins > losses ? 'Win' : 'Loss';
};

const getMatchResultFromSets = (settings: MatchFormatSettings, results: CompletedSetResult[]): PrototypeMatchResult => {
  if (!isMatchCompleteAfterSet(settings, results)) {
    return 'Open';
  }
  return getFinalMatchResult(results);
};

const upsertCompletedSet = (sets: PrototypeSetInput[], nextSet: PrototypeSetInput) => {
  const existingIndex = sets.findIndex((set) => set.setNumber === nextSet.setNumber);
  if (existingIndex === -1) return [...sets, nextSet];
  return sets.map((set, index) => index === existingIndex ? nextSet : set);
};

const RebuildPrototype = () => {
  const { user, logout } = useAuth();
  const { data: access } = useAccess(user?.id);
  const { activeTeam, teams, teamsLoading, selectTeam, addTeam, updateTeam } = useMatch();
  const selectedTeam = teams.find((team) => team.id === activeTeam?.id) ?? teams[0] ?? null;
  const [initialPrototype] = useState<PrototypeCloudDocument>(() => createFreshPrototypeDocument());
  const [roster, setRoster] = useState<PrototypePlayer[]>(initialPrototype.roster);
  const [setup, setSetup] = useState(initialPrototype.setup);
  const [draftSetup, setDraftSetup] = useState(initialPrototype.draftSetup);
  const [currentLineup, setCurrentLineup] = useState<LineupSlots>(initialPrototype.currentLineup);
  const [courtSide, setCourtSide] = useState<CourtSide>(initialPrototype.courtSide);
  const [seasonMatches, setSeasonMatches] = useState<PrototypeMatchInput[]>(initialPrototype.seasonMatches);
  const [rallies, setRallies] = useState<RallyRecord[]>(initialPrototype.rallies);
  const [completedSets, setCompletedSets] = useState<PrototypeSetInput[]>(initialPrototype.completedSets);
  const [savedLineups, setSavedLineups] = useState<SavedPrototypeLineup[]>(initialPrototype.savedLineups);
  const [currentMatchId, setCurrentMatchId] = useState(initialPrototype.currentMatchId);
  const [currentMatchStartedAt, setCurrentMatchStartedAt] = useState(initialPrototype.currentMatchStartedAt);
  const [lifecycle, setLifecycle] = useState<PrototypeMatchLifecycle>(initialPrototype.lifecycle);
  const [appView, setAppView] = useState<'launcher' | 'setup' | 'scoring'>('launcher');
  const [hydratedTeamId, setHydratedTeamId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<PrototypeSyncStatus>('loading');
  const [teamName, setTeamName] = useState('');
  const [teamLevel, setTeamLevel] = useState('Varsity');
  const [teamSeason, setTeamSeason] = useState(() => String(new Date().getFullYear()));
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [teamCreateError, setTeamCreateError] = useState('');
  const [syncAttempt, setSyncAttempt] = useState(0);
  const [restorable, setRestorable] = useState<RallyRecord | null>(null);
  const [pending, setPending] = useState<PendingSelection | null>(null);
  const [feedback, setFeedback] = useState('Ready');
  const [locked, setLocked] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [lineupSelection, setLineupSelection] = useState<LineupSelection | null>(null);
  const [setCompletion, setSetCompletion] = useState<SetCompletionReview | null>(null);
  const [endMatchReviewOpen, setEndMatchReviewOpen] = useState(false);
  const selectedTeamId = selectedTeam?.id ?? null;
  const eligibleLineupUsers = useMemo(() => {
    if (!user) return [];
    const candidates: EligibleLineupUser[] = [{ id: user.id, email: user.email, name: user.name }];
    if (access?.isAdmin && selectedTeamId) {
      access.assignments.forEach((assignment) => {
        if (assignment.teamId === selectedTeamId) candidates.push({ id: assignment.userId, email: assignment.email, name: assignment.name });
      });
    }
    return [...new Map(candidates.map((candidate) => [candidate.id, candidate])).values()];
  }, [access, selectedTeamId, user]);
  const revisionRef = useRef(0);
  const latestRevisionRef = useRef(0);
  const writeChainRef = useRef(Promise.resolve());
  const selectedTeamRef = useRef<Team | null>(selectedTeam);
  const updateTeamRef = useRef(updateTeam);
  const finalizingMatchRef = useRef<string | null>(null);
  const savedSetKeysRef = useRef(new Set<string>());

  useEffect(() => {
    selectedTeamRef.current = selectedTeam;
    updateTeamRef.current = updateTeam;
  }, [selectedTeam, updateTeam]);

  useEffect(() => {
    if (!activeTeam && teams[0]) selectTeam(teams[0].id);
  }, [activeTeam, selectTeam, teams]);

  useEffect(() => {
    const team = selectedTeamRef.current;
    if (!team) {
      setHydratedTeamId(null);
      return;
    }

    setHydratedTeamId(null);
    setSyncStatus('loading');
    let source: unknown = team.metadata?.[PROTOTYPE_METADATA_KEY];
    let migratedLegacy = false;
    if (!source) {
      const localValue = localStorage.getItem(getTeamPrototypeStorageKey(team.id));
      const legacyValue = localStorage.getItem(LEGACY_PROTOTYPE_STORAGE_KEY);
      try {
        source = localValue ? JSON.parse(localValue) : legacyValue ? JSON.parse(legacyValue) : undefined;
        migratedLegacy = !localValue && Boolean(legacyValue);
      } catch {
        source = undefined;
      }
    }

    const document = sanitizePrototypeDocument(source);
    revisionRef.current = document.revision;
    latestRevisionRef.current = document.revision;
    setRoster(document.roster);
    setSetup(document.setup);
    setDraftSetup(document.draftSetup);
    setCurrentLineup(document.currentLineup);
    setCourtSide(document.courtSide);
    setSeasonMatches(document.seasonMatches);
    setRallies(document.rallies);
    setCompletedSets(document.completedSets);
    setSavedLineups(document.savedLineups);
    setCurrentMatchId(document.currentMatchId);
    setCurrentMatchStartedAt(document.currentMatchStartedAt);
    setLifecycle(document.lifecycle);
    setAppView('launcher');
    setSetupOpen(false);
    setEndMatchReviewOpen(false);
    setRestorable(null);
    finalizingMatchRef.current = document.lifecycle === 'complete' ? document.currentMatchId : null;
    savedSetKeysRef.current = new Set(document.completedSets.map((set) => `${document.currentMatchId}:${set.setNumber}`));
    setHydratedTeamId(team.id);
    setSyncStatus(navigator.onLine ? (source && !migratedLegacy ? 'saved' : 'saving') : 'offline');
    if (migratedLegacy) localStorage.removeItem(LEGACY_PROTOTYPE_STORAGE_KEY);
  }, [selectedTeamId]);

  useEffect(() => {
    if (!selectedTeamId || hydratedTeamId !== selectedTeamId) return;
    const revision = ++revisionRef.current;
    latestRevisionRef.current = revision;
    const payload: PrototypeCloudDocument = {
      version: 1,
      revision,
      updatedAt: new Date().toISOString(),
      currentMatchId,
      currentMatchStartedAt,
      lifecycle,
      setup,
      draftSetup,
      rallies,
      completedSets,
      roster,
      currentLineup,
      courtSide,
      seasonMatches,
      savedLineups,
    };
    localStorage.setItem(getTeamPrototypeStorageKey(selectedTeamId), JSON.stringify(payload));
    if (!navigator.onLine) {
      const offlineTimeout = window.setTimeout(() => setSyncStatus('offline'), 0);
      return () => window.clearTimeout(offlineTimeout);
    }
    const savingTimeout = window.setTimeout(() => setSyncStatus('saving'), 0);
    const timeout = window.setTimeout(() => {
      const teamId = selectedTeamId;
      writeChainRef.current = writeChainRef.current.catch(() => undefined).then(async () => {
        const latestTeam = selectedTeamRef.current?.id === teamId ? selectedTeamRef.current : null;
        await updateTeamRef.current(teamId, { metadata: { ...(latestTeam?.metadata ?? {}), [PROTOTYPE_METADATA_KEY]: payload } });
        if (hydratedTeamId === teamId && latestRevisionRef.current === revision) setSyncStatus('saved');
      }).catch(() => {
        if (hydratedTeamId === teamId && latestRevisionRef.current === revision) setSyncStatus(navigator.onLine ? 'error' : 'offline');
      });
    }, 700);
    return () => {
      window.clearTimeout(savingTimeout);
      window.clearTimeout(timeout);
    };
  }, [completedSets, courtSide, currentLineup, currentMatchId, currentMatchStartedAt, draftSetup, hydratedTeamId, lifecycle, rallies, roster, savedLineups, seasonMatches, selectedTeamId, setup, syncAttempt]);

  useEffect(() => {
    if (!locked) {
      return;
    }
    const timeout = window.setTimeout(() => setLocked(false), 260);
    return () => window.clearTimeout(timeout);
  }, [locked]);

  useEffect(() => {
    const handleOnline = () => setSyncAttempt((attempt) => attempt + 1);
    const handleOffline = () => setSyncStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const state = useMemo(() => deriveSetState(setup, rallies), [setup, rallies]);
  const matchSettings = useMemo(() => getPrototypeMatchSettings(setup), [setup]);
  const setTarget = getSetTarget(matchSettings, setup.setNumber);
  const completedSetResults = useMemo(
    () => completedSets.map(getCompletedSetResult),
    [completedSets],
  );
  const currentMatchResult = getMatchResultFromSets(matchSettings, completedSetResults);
  const activeRoster = useMemo(() => roster.filter((player) => player.active), [roster]);
  const summary = useMemo(() => summarizeSet(rallies, roster), [rallies, roster]);
  const currentMatch = useMemo<PrototypeMatchInput>(
    () => ({
      id: currentMatchId,
      opponent: setup.opponent,
      date: currentMatchStartedAt.slice(0, 10),
      result: currentMatchResult,
      sets:
        rallies.some((rally) => rally.active) || completedSets.length === 0
          ? [...completedSets, { id: `${currentMatchId}-set-${setup.setNumber}-current`, setNumber: setup.setNumber, setup, rallies }]
          : completedSets,
    }),
    [completedSets, currentMatchId, currentMatchResult, currentMatchStartedAt, rallies, setup],
  );
  const currentMatchHasData = completedSets.length > 0 || rallies.some((rally) => rally.active);
  const reportMatches = useMemo(
    () => seasonMatches.some((match) => match.id === currentMatch.id) || !currentMatchHasData ? seasonMatches : [...seasonMatches, currentMatch],
    [currentMatch, currentMatchHasData, seasonMatches],
  );
  const seasonReport = useMemo(() => summarizeSeasonReport(reportMatches, roster), [reportMatches, roster]);
  const aggregateSeasonReport = useMemo(() => summarizeSeasonReport(seasonMatches, roster), [roster, seasonMatches]);
  const currentMatchReport = useMemo(
    () => seasonReport.matchReports.find((match) => match.id === currentMatch.id) ?? summarizeSeasonReport([currentMatch], roster).matchReports[0],
    [currentMatch, roster, seasonReport.matchReports],
  );
  const currentServer = roster.find((player) => player.id === state.serverId);
  const displayedOpponent = draftSetup.opponent.trim() || setup.opponent.trim() || 'Opponent';
  const lastRally = [...rallies].reverse().find((rally) => rally.active);
  const activeEntries = rallies.filter((rally) => rally.active);
  const activeRallies = activeEntries.filter((rally) => rally.event !== 'score_adjustment');
  const recentRallies = [...activeEntries].reverse().slice(0, 3);

  const getCurrentSetSnapshot = (): PrototypeSetInput => ({
    id: `${currentMatchId}-set-${setup.setNumber}`,
    setNumber: setup.setNumber,
    setup,
    rallies,
  });

  const finalizeMatch = (finalSets: PrototypeSetInput[]) => {
    if (lifecycle === 'complete' || finalizingMatchRef.current === currentMatchId) return;
    if (finalSets.length === 0) {
      setEndMatchReviewOpen(false);
      setFeedback('Add match entries before ending the match');
      return;
    }

    finalizingMatchRef.current = currentMatchId;
    const finalResults = finalSets.map(getCompletedSetResult);
    const result = getFinalMatchResult(finalResults);
    const wins = finalResults.filter((item) => item === 'Win').length;
    const losses = finalResults.filter((item) => item === 'Loss').length;
    const finishedMatch: PrototypeMatchInput = {
      id: currentMatchId,
      opponent: setup.opponent.trim() || 'Opponent',
      date: currentMatchStartedAt.slice(0, 10),
      result,
      sets: finalSets,
    };

    setCompletedSets(finalSets);
    setSeasonMatches((matches) => upsertArchivedMatch(matches, finishedMatch));
    setRallies([]);
    setRestorable(null);
    setPending(null);
    setLocked(false);
    setSetupOpen(false);
    setSummaryOpen(false);
    setReportOpen(false);
    setMoreOpen(false);
    setCorrectionOpen(false);
    setLineupSelection(null);
    setSetCompletion(null);
    setEndMatchReviewOpen(false);
    setFeedback(`Match finalized: Century ${wins}-${losses} · ${result}`);
    setLifecycle('complete');
    setAppView('launcher');
  };

  const openEndMatchReview = () => {
    if (!currentMatchHasData || lifecycle === 'complete') {
      setFeedback('Add match entries before ending the match');
      return;
    }
    setMoreOpen(false);
    setSetupOpen(false);
    setEndMatchReviewOpen(true);
  };

  const confirmEndMatch = () => {
    const finalSets = activeEntries.length > 0
      ? upsertCompletedSet(completedSets, getCurrentSetSnapshot())
      : completedSets;
    finalizeMatch(finalSets);
  };

  const reviewSetCompletion = (nextState: ReturnType<typeof deriveSetState>, reason: SetCompletionReview['reason']) => {
    if (lifecycle !== 'live') return;
    const winner = getSetWinner(nextState.centuryScore, nextState.opponentScore, setTarget);
    if (!winner) {
      return;
    }

    const winningResult: 'Win' | 'Loss' = winner === 'century' ? 'Win' : 'Loss';
    const nextCompletedResults: CompletedSetResult[] = [...completedSetResults, winningResult];
    setSetCompletion({
      setNumber: setup.setNumber,
      centuryScore: nextState.centuryScore,
      opponentScore: nextState.opponentScore,
      targetScore: setTarget,
      winner,
      matchComplete: isMatchCompleteAfterSet(matchSettings, nextCompletedResults),
      reason,
    });
  };

  const recordRally = (input: PendingRallyInput) => {
    if (locked || lifecycle !== 'live') {
      return;
    }
    const rally = buildRally(setup, rallies, input);
    const nextRallies = [...rallies, rally];
    const nextState = deriveSetState(setup, nextRallies);

    setRallies((current) => [...current, rally]);
    setRestorable(null);
    setPending(null);
    setFeedback(getRallyDescription(rally, roster));
    setLocked(true);
    reviewSetCompletion(nextState, 'automatic');
  };

  const adjustScore = (team: TeamSide, delta: 1 | -1) => {
    if (lifecycle !== 'live' || locked || (team === 'century' ? state.centuryScore : state.opponentScore) + delta < 0) {
      return;
    }

    const input: PendingRallyInput = {
      winner: team,
      event: 'score_adjustment',
      scoreAdjustment: { [team]: delta },
    };
    const rally = buildRally(setup, rallies, input);
    const nextRallies = [...rallies, rally];
    const nextState = deriveSetState(setup, nextRallies);

    setRallies((current) => [...current, rally]);
    setRestorable(null);
    setPending(null);
    setFeedback(getRallyDescription(rally, roster));
    setLocked(true);
    reviewSetCompletion(nextState, 'automatic');
  };

  const updateLastRally = (input: PendingRallyInput, rallyId: string) => {
    if (lifecycle !== 'live') return;
    setRallies((current) =>
      current.map((rally) => (rally.id === rallyId ? { ...rally, ...input, createdAt: new Date().toISOString() } : rally)),
    );
    setPending(null);
    setCorrectionOpen(false);
    setFeedback('Last rally corrected');
  };

  const handleEvent = (event: TerminalEvent, editingId?: string) => {
    if (lifecycle !== 'live') return;
    if (event === 'opponent_error') {
      setPending({ event, mode: 'error', editingId });
      return;
    }

    const playerNeed = eventNeedsPlayer(event);
    if (playerNeed !== 'none') {
      setPending({ event, mode: 'player', editingId });
      return;
    }

    const input = makeInput(event);
    if (editingId) {
      updateLastRally(input, editingId);
    } else {
      recordRally(input);
    }
  };

  const handlePlayer = (playerId: string) => {
    if (!pending) {
      return;
    }
    const input = makeInput(pending.event, playerId);
    if (pending.editingId) {
      updateLastRally(input, pending.editingId);
    } else {
      recordRally(input);
    }
  };

  const handleErrorSubtype = (errorSubtype: ErrorSubtype) => {
    if (!pending) {
      return;
    }
    const input = makeInput(pending.event, undefined, errorSubtype);
    if (pending.editingId) {
      updateLastRally(input, pending.editingId);
    } else {
      recordRally(input);
    }
  };

  const undo = () => {
    if (lifecycle !== 'live') return;
    const last = [...rallies].reverse().find((rally) => rally.active);
    if (!last) {
      return;
    }
    setRallies((current) => current.map((rally) => (rally.id === last.id ? { ...rally, active: false } : rally)));
    setRestorable(last);
    setFeedback('Last rally undone');
  };

  const restore = () => {
    if (lifecycle !== 'live' || !restorable) {
      return;
    }
    setRallies((current) => current.map((rally) => (rally.id === restorable.id ? { ...rally, active: true } : rally)));
    setFeedback('Rally restored');
    setRestorable(null);
  };

  const startSet = () => {
    if (lifecycle !== 'setup') return;
    const lineup = draftSetup.lineup ?? getDefaultLineup(roster);
    const normalized = {
      ...draftSetup,
      opponent: draftSetup.opponent.trim() || 'Opponent',
      initialServerId: draftSetup.initialMode === 'serving' ? lineup[draftSetup.initialRotation] : undefined,
      lineup,
      rotationServers: getRotationServers(lineup),
    };
    setSetup(normalized);
    setCurrentLineup(normalized.lineup ?? {});
    setRallies([]);
    setRestorable(null);
    setSetCompletion(null);
    setSetupOpen(false);
    setLifecycle('live');
    setAppView('scoring');
    setFeedback(setup.setNumber === 1 && completedSets.length === 0 ? 'Match started' : `Set ${draftSetup.setNumber} started`);
  };

  const applySetupEdits = () => {
    if (lifecycle !== 'live') return;
    const lineup = draftSetup.lineup ?? currentLineup;
    const normalized = {
      ...draftSetup,
      opponent: draftSetup.opponent.trim() || 'Opponent',
      initialServerId: draftSetup.initialMode === 'serving' ? lineup[draftSetup.initialRotation] : undefined,
      lineup,
      rotationServers: getRotationServers(lineup),
    };
    setSetup(normalized);
    setCurrentLineup(lineup);
    setSetupOpen(false);
    setFeedback('Setup changes saved');
  };

  const endSet = () => {
    if (lifecycle !== 'live' || activeEntries.length === 0) {
      setSetupOpen(true);
      setFeedback('Add rallies before ending a set');
      return;
    }

    setSetCompletion({
      setNumber: setup.setNumber,
      centuryScore: state.centuryScore,
      opponentScore: state.opponentScore,
      targetScore: setTarget,
      winner: getReviewWinner(state.centuryScore, state.opponentScore, setTarget),
      matchComplete: false,
      reason: 'manual',
    });
  };

  const saveCompletedSet = () => {
    if (!setCompletion || lifecycle !== 'live') {
      return;
    }

    const setKey = `${currentMatchId}:${setup.setNumber}`;
    if (savedSetKeysRef.current.has(setKey)) return;
    savedSetKeysRef.current.add(setKey);

    const finishedSet = getCurrentSetSnapshot();
    const nextCompletedSets = upsertCompletedSet(completedSets, finishedSet);
    const nextCompletedResults = nextCompletedSets.map(getCompletedSetResult);
    const matchComplete = isMatchCompleteAfterSet(matchSettings, nextCompletedResults);
    const nextSetup = {
      ...setup,
      setNumber: setup.setNumber + 1,
      initialMode: state.mode,
      initialRotation: state.rotation,
      initialServerId: state.mode === 'serving' ? state.serverId : undefined,
    };

    if (matchComplete) {
      finalizeMatch(nextCompletedSets);
      return;
    }

    setCompletedSets(nextCompletedSets);
    setSetup(nextSetup);
    setDraftSetup(nextSetup);
    setRallies([]);
    setRestorable(null);
    setPending(null);
    setSetCompletion(null);
    setCorrectionOpen(false);
    setSummaryOpen(false);
    setMoreOpen(false);
    setFeedback(`Set ${setup.setNumber} saved`);
    setLifecycle('setup');
    setAppView('setup');
  };

  const updateDraftLineup = (rotation: Rotation, playerId: string) => {
    const lineup = setLineupSlot(draftSetup.lineup ?? getDefaultLineup(roster), rotation, playerId);
    setDraftSetup({
      ...draftSetup,
      lineup,
      initialServerId: draftSetup.initialMode === 'serving' ? lineup[draftSetup.initialRotation] : draftSetup.initialServerId,
      rotationServers: getRotationServers(lineup),
    });
    setLineupSelection(null);
  };

  const updateLiveLineup = (rotation: Rotation, playerId: string) => {
    const lineup = setLineupSlot(currentLineup, rotation, playerId);
    const nextSetup = {
      ...setup,
      lineup,
      rotationServers: getRotationServers(lineup),
      initialServerId: setup.initialRotation === rotation ? playerId : setup.initialServerId,
    };

    setCurrentLineup(lineup);
    setSetup(nextSetup);
    setDraftSetup(nextSetup);
    setLineupSelection(null);
    setFeedback(`R${rotation} changed to ${getPlayerLabel(roster, playerId)}`);
  };

  const clearMatchData = () => {
    const confirmed = window.confirm('Clear current match data from the shared team cloud? Saved finished-match reports, roster, and lineups will remain.');
    if (!confirmed) {
      return;
    }
    setRallies([]);
    setCompletedSets([]);
    setCurrentMatchId(`match-${crypto.randomUUID()}`);
    setCurrentMatchStartedAt(new Date().toISOString());
    setRestorable(null);
    setPending(null);
    setCorrectionOpen(false);
    setSummaryOpen(false);
    setFeedback('Match data cleared');
    setLifecycle('idle');
    setAppView('launcher');
  };

  const clearSharedRoster = () => {
    if (!window.confirm('Clear the shared team roster? This removes all players, the current lineup, and saved lineup templates for everyone with team access. Finished match reports remain.')) return;
    setRoster([]);
    setCurrentLineup({});
    setSavedLineups([]);
    setSetup((current) => ({ ...current, lineup: {}, initialServerId: undefined, rotationServers: {} }));
    setDraftSetup((current) => ({ ...current, lineup: {}, initialServerId: undefined, rotationServers: {} }));
    setFeedback('Shared roster and lineups cleared');
  };

  const deleteRosterData = () => {
    const confirmed = window.confirm('Delete this roster and all match data from the shared team cloud? This removes players, lineups, current rallies, and saved match reports for everyone with team access.');
    if (!confirmed) {
      return;
    }
    const emptySetup = {
      ...createNeutralSetup(),
      initialServerId: undefined,
      lineup: {},
      rotationServers: {},
    };
    setSetup(emptySetup);
    setDraftSetup(emptySetup);
    setRoster([]);
    setCurrentLineup({});
    setSeasonMatches([]);
    setSavedLineups([]);
    setRallies([]);
    setCompletedSets([]);
    setRestorable(null);
    setPending(null);
    setCorrectionOpen(false);
    setSummaryOpen(false);
    setReportOpen(false);
    setFeedback('Roster and match data deleted');
    setLifecycle('idle');
    setAppView('launcher');
  };

  const deleteMatchData = (matchId: string) => {
    const match = seasonReport.matchReports.find((item) => item.id === matchId);
    if (!match) {
      return;
    }
    const confirmed = window.confirm(`Delete shared cloud match data for Century vs ${match.opponent}? This removes that match from reports for everyone with team access.`);
    if (!confirmed) {
      return;
    }

    if (matchId === currentMatch.id) {
      setSeasonMatches((matches) => matches.filter((item) => item.id !== matchId));
      setCurrentMatchId(`match-${crypto.randomUUID()}`);
      setCurrentMatchStartedAt(new Date().toISOString());
      setRallies([]);
      setCompletedSets([]);
      setRestorable(null);
      setPending(null);
      setCorrectionOpen(false);
      setSummaryOpen(false);
      setFeedback('Current match data deleted');
      setLifecycle('idle');
      setAppView('launcher');
      return;
    }

    setSeasonMatches((matches) => matches.filter((item) => item.id !== matchId));
    setFeedback(`Deleted match vs ${match.opponent}`);
  };

  const startNewMatch = () => {
    const now = new Date();
    const nextSetup = {
      ...createNeutralSetup(),
      lineup: { ...currentLineup },
      rotationServers: getRotationServers(currentLineup),
      initialServerId: currentLineup[1],
    };
    setCurrentMatchId(`match-${crypto.randomUUID()}`);
    setCurrentMatchStartedAt(now.toISOString());
    setSetup(nextSetup);
    setDraftSetup(nextSetup);
    setRallies([]);
    setCompletedSets([]);
    setRestorable(null);
    setPending(null);
    setSetCompletion(null);
    setEndMatchReviewOpen(false);
    setMoreOpen(false);
    setSummaryOpen(false);
    setCorrectionOpen(false);
    setReportOpen(false);
    finalizingMatchRef.current = null;
    savedSetKeysRef.current = new Set();
    setLifecycle('setup');
    setAppView('setup');
    setFeedback('New match ready');
  };

  const replaceActiveMatch = () => {
    if (!window.confirm('Start a new match and replace the current unfinished match? Finished season reports will remain.')) return;
    startNewMatch();
  };

  const createFirstTeam = async () => {
    const name = teamName.trim();
    if (!name || creatingTeam) return;
    setCreatingTeam(true);
    setTeamCreateError('');
    const now = new Date().toISOString();
    try {
      await addTeam({
        id: crypto.randomUUID(),
        name,
        level: teamLevel.trim() || 'Varsity',
        season: teamSeason.trim() || String(new Date().getFullYear()),
        createdAt: now,
        updatedAt: now,
        metadata: { [PROTOTYPE_METADATA_KEY]: createFreshPrototypeDocument() },
      });
    } catch (error) {
      setTeamCreateError(error instanceof Error ? error.message : 'Could not create team');
    } finally {
      setCreatingTeam(false);
    }
  };

  const saveNamedLineup = (name: string, lineup: LineupSlots, linkedUserId: string) => {
    if (!user) return;
    const linkedUser = eligibleLineupUsers.find((candidate) => candidate.id === linkedUserId) ?? eligibleLineupUsers[0];
    setSavedLineups((items) => upsertSavedLineup(items, name, lineup, new Date(), {
      userId: user.id,
      email: user.email,
      linkedUserId: linkedUser?.id ?? user.id,
      linkedUserEmail: linkedUser?.email ?? user.email,
    }));
    setFeedback(`Lineup ${name.trim()} saved`);
  };

  const loadNamedLineup = (lineup: LineupSlots) => {
    const next = { ...lineup };
    setDraftSetup((draft) => ({
      ...draft,
      lineup: next,
      initialServerId: draft.initialMode === 'serving' ? next[draft.initialRotation] : undefined,
      rotationServers: getRotationServers(next),
    }));
  };

  if (teamsLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm font-black uppercase text-teal-200">Loading teams…</div>;
  }

  if (!selectedTeam) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
        <section className="w-full max-w-md rounded border border-white/15 bg-slate-900 p-5 shadow-xl">
          <p className="text-xs font-black uppercase tracking-wider text-teal-300">Century Matchbook</p>
          <h1 className="mt-2 text-3xl font-black">Create your first team</h1>
          <p className="mt-2 text-sm font-bold text-slate-300">This team owns its roster, lineups, live match, and season reports in the shared cloud.</p>
          <div className="mt-5 grid gap-3">
            <label className="grid min-w-0 gap-1">
              <span className="text-xs font-black uppercase text-slate-300">Team name</span>
              <input className={inputClass} value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="CHS Varsity" autoFocus />
            </label>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
              <label className="grid min-w-0 gap-1">
                <span className="text-xs font-black uppercase text-slate-300">Level</span>
                <input className={inputClass} value={teamLevel} onChange={(event) => setTeamLevel(event.target.value)} />
              </label>
              <label className="grid min-w-0 gap-1">
                <span className="text-xs font-black uppercase text-slate-300">Season</span>
                <input className={inputClass} value={teamSeason} onChange={(event) => setTeamSeason(event.target.value)} />
              </label>
            </div>
            <button type="button" onClick={createFirstTeam} disabled={!teamName.trim() || creatingTeam} className="min-h-14 rounded bg-teal-500 px-4 text-lg font-black text-slate-950 disabled:opacity-50">
              {creatingTeam ? 'Creating…' : 'Create Team'}
            </button>
            {teamCreateError ? <p className="text-sm font-black text-red-300" role="alert">{teamCreateError}</p> : null}
          </div>
        </section>
      </main>
    );
  }

  if (hydratedTeamId !== selectedTeam.id) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm font-black uppercase text-teal-200">Loading {selectedTeam.name}…</div>;
  }

  const syncLabel = syncStatus === 'error' ? 'Sync failed' : syncStatus.charAt(0).toUpperCase() + syncStatus.slice(1);
  const hasResumableMatch = lifecycle === 'setup' || lifecycle === 'live';

  if (appView === 'launcher') {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-4 text-white sm:px-6 sm:py-6">
        <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-3xl flex-col sm:min-h-[calc(100vh-3rem)]">
          <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-300">Century Matchbook</p>
              <p className="mt-1 truncate text-sm font-bold text-slate-300">{selectedTeam.name} · {selectedTeam.season}</p>
            </div>
            <div className="flex items-center gap-2">
              <span role="status" className={`text-xs font-black uppercase ${syncStatus === 'error' ? 'text-red-300' : 'text-slate-400'}`}>{syncLabel}</span>
              <button type="button" onClick={logout} className="min-h-11 rounded border border-white/15 px-3 text-xs font-black uppercase focus:outline-none focus:ring-2 focus:ring-teal-300">Sign Out</button>
            </div>
          </div>

          <section className="flex flex-1 flex-col justify-center py-10 sm:py-16">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-300">Match day</p>
            <h1 className="mt-2 max-w-xl text-4xl font-black leading-none sm:text-6xl">Ready for the next serve?</h1>
            <p className="mt-4 max-w-lg text-base font-bold text-slate-300">Resume exactly where the team left off, or set up a fresh match before scoring begins.</p>

            {hasResumableMatch ? (
              <div className="mt-8">
                <section className="overflow-hidden rounded border border-teal-300/50 bg-slate-900 shadow-[0_18px_70px_rgba(20,184,166,0.12)]">
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-200">{lifecycle === 'live' ? 'Live match' : 'Setup in progress'}</p>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 px-4 py-5 sm:px-6">
                    <div>
                      <p className="truncate text-sm font-black uppercase text-slate-400">{selectedTeam.name}</p>
                      <p className="mt-1 text-5xl font-black tabular-nums">{state.centuryScore}</p>
                    </div>
                    <div className="pb-2 text-center">
                      <p className="text-xs font-black uppercase text-slate-400">Set</p>
                      <p className="text-2xl font-black text-teal-200">{setup.setNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="truncate text-sm font-black uppercase text-slate-400">{displayedOpponent}</p>
                      <p className="mt-1 text-5xl font-black tabular-nums">{state.opponentScore}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setAppView(lifecycle === 'setup' ? 'setup' : 'scoring')} className="min-h-16 w-full bg-teal-500 px-5 text-left text-lg font-black uppercase text-slate-950 transition hover:bg-teal-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                    {lifecycle === 'setup' ? 'Continue Setup' : 'Resume Match'} <span aria-hidden="true" className="float-right">→</span>
                  </button>
                </section>
                <button type="button" onClick={replaceActiveMatch} className="mt-3 min-h-12 w-full rounded border border-white/20 bg-transparent px-4 text-sm font-black uppercase text-slate-200 transition hover:border-white/40 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-teal-300">
                  Start New Match
                </button>
              </div>
            ) : (
              <div className="mt-8">
                {lifecycle === 'complete' ? (
                  <div role="status" className="mb-3 border-l-4 border-teal-300 bg-teal-300/10 px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-200">Match finalized</p>
                    <p className="mt-1 text-sm font-bold text-slate-300">Saved to season history. The scorer is ready for a fresh match.</p>
                  </div>
                ) : null}
                <button type="button" onClick={startNewMatch} className="min-h-20 w-full rounded bg-teal-500 px-5 text-left text-xl font-black uppercase text-slate-950 shadow-[0_18px_70px_rgba(20,184,166,0.14)] transition hover:bg-teal-300 focus:outline-none focus:ring-2 focus:ring-white">
                  Start New Match <span aria-hidden="true" className="float-right">→</span>
                </button>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-bold text-slate-400">
              {teams.length > 1 ? (
                <label className="flex items-center gap-2">
                  <span>Team</span>
                  <select value={selectedTeam.id} onChange={(event) => selectTeam(event.target.value)} className="min-h-11 rounded border border-white/15 bg-slate-900 px-3 font-black text-white">
                    {teams.map((team) => <option key={team.id} value={team.id}>{team.name} · {team.season}</option>)}
                  </select>
                </label>
              ) : null}
              <button type="button" onClick={() => { setAppView('scoring'); setReportOpen(true); }} className="min-h-11 rounded border border-white/15 px-3 text-white">Season Reports</button>
              <span className="ml-auto truncate" title={user?.email}>{user?.name || user?.email}</span>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (appView === 'setup' && lifecycle === 'setup') {
    return (
      <main className="flex min-h-screen flex-col bg-slate-950 text-white">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-300">Century Matchbook</p>
            <p className="text-sm font-bold text-slate-300">{selectedTeam.name} · Set {draftSetup.setNumber}</p>
          </div>
          <button type="button" onClick={() => setAppView('launcher')} className="min-h-11 rounded border border-white/15 px-3 text-sm font-black focus:outline-none focus:ring-2 focus:ring-teal-300">Match Day</button>
        </div>
        <SetupSheet
          key={`${selectedTeam.id}-${draftSetup.setNumber}`}
          presentation="page"
          setup={draftSetup}
          matchSettings={getPrototypeMatchSettings(draftSetup)}
          stateMode={state.mode}
          currentRotation={state.rotation}
          roster={roster}
          activeRoster={activeRoster}
          courtSide={courtSide}
          teamName={selectedTeam.name}
          savedLineups={savedLineups}
          eligibleLineupUsers={eligibleLineupUsers}
          currentUserId={user?.id ?? ''}
          syncStatus={syncStatus}
          onChange={setDraftSetup}
          onOpponentChange={(opponent) => setDraftSetup((current) => ({ ...current, opponent }))}
          onRosterChange={setRoster}
          onClearRoster={clearSharedRoster}
          onCourtSideChange={setCourtSide}
          onPickLineupSlot={(rotation) => setLineupSelection({ rotation, context: 'setup' })}
          onLoadLineup={loadNamedLineup}
          onSaveLineup={saveNamedLineup}
          onClose={() => setAppView('launcher')}
          onStart={startSet}
          onEndSet={endSet}
          canEndSet={false}
          onEndMatch={openEndMatchReview}
          canEndMatch={completedSets.length > 0}
        />
        {lineupSelection ? (
          <LineupPickerSheet
            rotation={lineupSelection.rotation}
            context="setup"
            players={activeRoster}
            lineup={draftSetup.lineup ?? getDefaultLineup(roster)}
            onPlayer={(playerId) => updateDraftLineup(lineupSelection.rotation, playerId)}
            onCancel={() => setLineupSelection(null)}
          />
        ) : null}
        {endMatchReviewOpen ? (
          <EndMatchConfirmationSheet
            setup={setup}
            completedSets={completedSets}
            currentSet={undefined}
            onConfirm={confirmEndMatch}
            onCancel={() => setEndMatchReviewOpen(false)}
          />
        ) : null}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-3 py-3 sm:px-5">
        <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,16rem)]">
          <label className="min-w-0">
            <span className="sr-only">Selected team</span>
            <select
              aria-label="Selected team"
              value={selectedTeam.id}
              onChange={(event) => selectTeam(event.target.value)}
              className="min-h-11 w-full rounded border border-white/15 bg-slate-900 px-3 text-sm font-black text-white"
            >
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name} · {team.season}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-1">
            <span role="status" aria-live="polite" className={`rounded border px-2 py-2 text-xs font-black uppercase ${syncStatus === 'saved' ? 'border-teal-400/50 text-teal-200' : syncStatus === 'error' ? 'border-red-400/60 text-red-200' : 'border-amber-300/50 text-amber-200'}`}>
              {syncLabel}
            </span>
            {syncStatus === 'error' ? <button type="button" onClick={() => setSyncAttempt((attempt) => attempt + 1)} className="min-h-11 rounded bg-red-700 px-3 text-xs font-black uppercase text-white">Retry</button> : null}
          </div>
          <div className="col-span-2 flex min-w-0 items-center justify-between gap-2 border-t border-white/10 pt-2 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
            <span className="min-w-0 truncate text-xs font-bold text-slate-300" title={user?.email}>{user?.name || user?.email}</span>
            <button type="button" onClick={logout} className="min-h-11 shrink-0 rounded border border-white/15 bg-slate-900 px-3 text-xs font-black uppercase text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-300">
              Sign Out
            </button>
          </div>
        </div>
        <header className="grid gap-3 border-b border-white/15 pb-3">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <ScoreCard
              label={selectedTeam.name}
              score={state.centuryScore}
              tone="century"
              serving={state.mode === 'serving'}
              onIncrement={() => adjustScore('century', 1)}
              onDecrement={() => adjustScore('century', -1)}
            />
            <div className="text-center">
              <p className="text-xs font-black uppercase text-slate-300">Set {setup.setNumber}</p>
              <p className="mt-1 text-2xl font-black text-white">R{state.rotation}</p>
              {state.mode === 'serving' && currentServer ? <p className="mt-1 text-xs font-black text-teal-200">#{currentServer.number}</p> : null}
            </div>
            <ScoreCard
              label={displayedOpponent}
              score={state.opponentScore}
              tone="opponent"
              align="right"
              serving={state.mode === 'receiving'}
              onIncrement={() => adjustScore('opponent', 1)}
              onDecrement={() => adjustScore('opponent', -1)}
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => { setDraftSetup(setup); setSetupOpen(true); }}
              className="min-h-11 rounded border border-white/15 bg-white/10 px-2 text-left text-sm font-black"
            >
              Setup
            </button>
            <button
              type="button"
              onClick={undo}
              disabled={!lastRally}
              className="min-h-11 rounded bg-slate-200 px-2 text-sm font-black text-slate-950 disabled:opacity-50"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={() => setCorrectionOpen(true)}
              disabled={!lastRally}
              className="min-h-11 rounded border border-amber-300 bg-amber-300 px-2 text-sm font-black text-slate-950 disabled:opacity-50"
            >
              Correct
            </button>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-expanded={moreOpen}
              className="min-h-11 rounded border border-white/15 bg-white/10 px-2 text-sm font-black"
            >
              More
            </button>
          </div>
        </header>

        <section className="mt-3 flex min-h-0 flex-1 flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="grid min-h-0 content-start gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <EventPanel
                title="CENTURY POINT"
                tone="century"
                events={centuryEvents}
                onEvent={(event) => handleEvent(event)}
                disabled={locked}
              />
              <EventPanel
                title="OPPONENT POINT"
                tone="opponent"
                events={opponentEvents}
                onEvent={(event) => handleEvent(event)}
                disabled={locked}
              />
            </div>

            <div className="grid min-h-0 gap-3 md:grid-cols-2 lg:gap-2">
              <section className="rounded border border-white/15 bg-white/5 p-3 lg:p-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-black uppercase text-slate-300">Current Lineup</h2>
                    <p className="text-lg font-black">{state.mode === 'serving' ? getPlayerLabel(roster, state.serverId) : 'Century receiving'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setDraftSetup(setup); setSetupOpen(true); }}
                      className="min-h-11 rounded bg-white px-3 text-sm font-black text-slate-950"
                    >
                      Edit Lineup
                    </button>
                    <SideToggle courtSide={courtSide} onChange={setCourtSide} compact />
                  </div>
                </div>
                <CourtLineupGrid
                  courtSide={courtSide}
                  currentRotation={state.rotation}
                  lineup={currentLineup}
                  roster={roster}
                  onPick={(rotation) => setLineupSelection({ rotation, context: 'live' })}
                />
              </section>

              <section className="min-h-0 rounded border border-white/15 bg-white/5 p-3 lg:p-2">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black uppercase text-slate-300">Recent Entries</h2>
                    <p className="text-xs font-bold text-slate-500">Last {Math.min(activeEntries.length, 3)} of {activeEntries.length}</p>
                  </div>
                  {restorable ? (
                    <button type="button" onClick={restore} className="min-h-11 rounded bg-teal-300 px-3 py-2 text-sm font-black text-slate-950">
                      Restore
                    </button>
                  ) : null}
                </div>
                <div className="max-h-48 space-y-2 overflow-auto pr-1 lg:max-h-44">
                  {recentRallies.map((rally) => (
                    <div key={rally.id} className="rounded border border-white/10 bg-slate-900 px-3 py-2 lg:py-1.5">
                      <p className="text-sm font-black">{getRallyDescription(rally, roster)}</p>
                      <p className="text-xs font-bold text-slate-400">
                        {rally.event === 'score_adjustment' ? 'Score adjustment' : `Rally ${rally.sequence} - started ${rally.startMode}, R${rally.startRotation}`}
                      </p>
                    </div>
                  ))}
                  {activeEntries.length === 0 ? <p className="py-6 text-center text-sm font-bold text-slate-400">No entries yet.</p> : null}
                </div>
              </section>
            </div>
          </div>

          <aside className="grid content-start gap-3">
            <div className="rounded border border-white/15 bg-slate-900 p-3">
              <p className="text-xs font-black uppercase text-slate-400">Recorded</p>
              <p className="mt-1 text-lg font-black">{feedback}</p>
            </div>
          </aside>
        </section>
      </div>

      {summaryOpen ? <SummaryPanel summary={summary} players={roster} onClose={() => setSummaryOpen(false)} /> : null}

      {moreOpen ? (
        <MoreSheet
          ralliesTracked={activeRallies.length}
          entriesTracked={activeEntries.length}
          canEndSet={activeEntries.length > 0}
          canEndMatch={currentMatchHasData}
          onSummary={() => {
            setMoreOpen(false);
            setSummaryOpen(true);
          }}
          onReports={() => {
            setMoreOpen(false);
            setReportOpen(true);
          }}
          onEndSet={() => {
            setMoreOpen(false);
            endSet();
          }}
          onEndMatch={openEndMatchReview}
          onClose={() => setMoreOpen(false)}
        />
      ) : null}

      {reportOpen && currentMatchReport ? (
        <ReportSheet
          seasonReport={seasonReport}
          aggregateSeasonReport={aggregateSeasonReport}
          currentMatchReport={currentMatchReport}
          players={roster}
          onDeleteMatch={deleteMatchData}
          onClearMatchData={clearMatchData}
          onDeleteRosterData={deleteRosterData}
          onNewMatch={startNewMatch}
          matchComplete={lifecycle === 'complete'}
          onClose={() => {
            setReportOpen(false);
            if (lifecycle === 'complete' || lifecycle === 'idle') setAppView('launcher');
          }}
        />
      ) : null}

      {setupOpen && !lineupSelection ? (
        <SetupSheet
          key={selectedTeam.id}
          mode="edit"
          setup={draftSetup}
          matchSettings={getPrototypeMatchSettings(draftSetup)}
          stateMode={state.mode}
          currentRotation={state.rotation}
          roster={roster}
          activeRoster={activeRoster}
          courtSide={courtSide}
          teamName={selectedTeam.name}
          savedLineups={savedLineups}
          eligibleLineupUsers={eligibleLineupUsers}
          currentUserId={user?.id ?? ''}
          syncStatus={syncStatus}
          onChange={setDraftSetup}
          onOpponentChange={(opponent) => setDraftSetup((current) => ({ ...current, opponent }))}
          onRosterChange={setRoster}
          onClearRoster={clearSharedRoster}
          onCourtSideChange={setCourtSide}
          onPickLineupSlot={(rotation) => setLineupSelection({ rotation, context: 'setup' })}
          onLoadLineup={loadNamedLineup}
          onSaveLineup={saveNamedLineup}
          onClose={() => { setDraftSetup(setup); setSetupOpen(false); }}
          onStart={applySetupEdits}
          onEndSet={endSet}
          canEndSet={activeEntries.length > 0}
          onEndMatch={openEndMatchReview}
          canEndMatch={false}
        />
      ) : null}

      {setCompletion ? (
        <SetCompletionSheet
          review={setCompletion}
          setup={setup}
          settings={matchSettings}
          completedSetResults={completedSetResults}
          onSave={saveCompletedSet}
          onCancel={() => setSetCompletion(null)}
        />
      ) : null}

      {endMatchReviewOpen ? (
        <EndMatchConfirmationSheet
          setup={setup}
          completedSets={completedSets}
          currentSet={activeEntries.length > 0 ? getCurrentSetSnapshot() : undefined}
          onConfirm={confirmEndMatch}
          onCancel={() => setEndMatchReviewOpen(false)}
        />
      ) : null}

      {pending ? (
        <PickerSheet
          pending={pending}
          players={activeRoster}
          lineup={currentLineup}
          onPlayer={handlePlayer}
          onErrorSubtype={handleErrorSubtype}
          onCancel={() => setPending(null)}
        />
      ) : null}

      {correctionOpen && lastRally && !pending ? (
        <CorrectionSheet
          rally={lastRally}
          players={roster}
          onEvent={(event) => handleEvent(event, lastRally.id)}
          onClose={() => setCorrectionOpen(false)}
        />
      ) : null}

      {lineupSelection ? (
        <LineupPickerSheet
          rotation={lineupSelection.rotation}
          context={lineupSelection.context}
          players={activeRoster}
          lineup={lineupSelection.context === 'setup' ? draftSetup.lineup ?? getDefaultLineup(roster) : currentLineup}
          onPlayer={(playerId) => {
            if (lineupSelection.context === 'setup') {
              updateDraftLineup(lineupSelection.rotation, playerId);
            } else {
              updateLiveLineup(lineupSelection.rotation, playerId);
            }
          }}
          onCancel={() => setLineupSelection(null)}
        />
      ) : null}
    </main>
  );
};

interface EventPanelProps {
  title: string;
  tone: 'century' | 'opponent';
  events: TerminalEvent[];
  disabled: boolean;
  onEvent: (event: TerminalEvent) => void;
}

interface ScoreCardProps {
  label: string;
  score: number;
  tone: 'century' | 'opponent';
  align?: 'left' | 'right';
  serving?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
}

const ScoreCard = ({ label, score, tone, align = 'left', serving = false, onIncrement, onDecrement }: ScoreCardProps) => (
  <div
    className={`grid grid-cols-[1fr_auto] items-center gap-2 rounded border-4 px-4 py-3 text-slate-950 ${
      serving ? 'border-amber-300 shadow-[0_0_0_2px_rgba(253,224,71,0.28)]' : 'border-transparent'
    } ${tone === 'century' ? 'bg-teal-400' : 'bg-white'}`}
  >
    <div className={align === 'right' ? 'text-right' : 'text-left'}>
      <p className="truncate text-xs font-black uppercase">{label}</p>
      <p className="text-5xl font-black leading-none sm:text-6xl">{score}</p>
    </div>
    <div className="grid gap-1">
      <button
        type="button"
        onClick={onIncrement}
        aria-label={`Add ${label} score`}
        className="h-11 w-11 rounded bg-slate-950 text-lg font-black leading-none text-white active:scale-95"
      >
        +
      </button>
      <button
        type="button"
        onClick={onDecrement}
        disabled={score === 0}
        aria-label={`Subtract ${label} score`}
        className="h-11 w-11 rounded bg-slate-950 text-lg font-black leading-none text-white active:scale-95 disabled:opacity-35"
      >
        -
      </button>
    </div>
  </div>
);

interface MoreSheetProps {
  ralliesTracked: number;
  entriesTracked: number;
  canEndSet: boolean;
  canEndMatch: boolean;
  onSummary: () => void;
  onReports: () => void;
  onEndSet: () => void;
  onEndMatch: () => void;
  onClose: () => void;
}

const dialogControls = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const DialogBackdrop = ({ children, onClose, labelledBy, className }: { children: ReactNode; onClose: () => void; labelledBy: string; className: string }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusTimer = window.setTimeout(() => {
      (dialog?.querySelector<HTMLElement>(dialogControls) ?? dialog)?.focus();
    }, 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const controls = [...dialog.querySelectorAll<HTMLElement>(dialogControls)];
      if (controls.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, []);

  return <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1} className={className}>{children}</div>;
};

const MoreSheet = ({ ralliesTracked, entriesTracked, canEndSet, canEndMatch, onSummary, onReports, onEndSet, onEndMatch, onClose }: MoreSheetProps) => (
  <DialogBackdrop onClose={onClose} labelledBy="more-sheet-title" className="fixed inset-0 z-30 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center">
    <section className="w-full rounded bg-slate-100 p-3 text-slate-950 shadow-xl sm:max-w-md sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 id="more-sheet-title" className="text-xl font-black">Review</h2>
          <p className="text-xs font-bold text-slate-600">
            {ralliesTracked} rallies · {entriesTracked} entries
          </p>
        </div>
        <button type="button" onClick={onClose} className="min-h-12 rounded bg-slate-950 px-4 font-black text-white">
          Back
        </button>
      </div>
      <div className="grid gap-2">
        <button type="button" onClick={onSummary} className="min-h-12 rounded bg-white px-3 text-left font-black">
          Summary
          <span className="block text-xs font-bold text-slate-500">Live set read</span>
        </button>
        <button type="button" onClick={onReports} className="min-h-12 rounded bg-white px-3 text-left font-black">
          Reports
          <span className="block text-xs font-bold text-slate-500">Match + season</span>
        </button>
        <button
          type="button"
          onClick={onEndSet}
          disabled={!canEndSet}
          className="min-h-12 rounded border border-amber-300 bg-amber-100 px-3 text-left font-black text-amber-950 disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500"
        >
          End Set Early
          <span className="block text-xs font-bold">Review score first</span>
        </button>
        <button
          type="button"
          onClick={onEndMatch}
          disabled={!canEndMatch}
          className="min-h-14 rounded border-2 border-amber-500 bg-amber-300 px-3 text-left font-black text-slate-950 shadow-sm transition hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-700 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
        >
          End Match
          <span className="block text-xs font-bold">Finalize entries and return to Match Day</span>
        </button>
      </div>
    </section>
  </DialogBackdrop>
);

const EventPanel = ({ title, tone, events, disabled, onEvent }: EventPanelProps) => (
  <section className={`rounded border p-3 ${tone === 'century' ? 'border-teal-300 bg-teal-950/60' : 'border-slate-300 bg-slate-800'}`}>
    <h2 className="mb-3 text-base font-black uppercase">{title}</h2>
    <div className="grid grid-cols-2 gap-2">
      {events.map((event) => (
        <button
          key={event}
          type="button"
          disabled={disabled}
          onClick={() => onEvent(event)}
          className={`${actionClass} ${
            tone === 'century' ? 'bg-teal-300 text-slate-950 hover:bg-teal-200' : 'bg-white text-slate-950 hover:bg-slate-100'
          } ${event === 'ball_control_error' || event === 'violation' ? 'text-base' : ''}`}
        >
          {eventLabels[event]}
          {eventNeedsPlayer(event) !== 'none' ? <span className="block text-xs font-bold opacity-75">Pick player next</span> : null}
          {event === 'opponent_error' ? <span className="block text-xs font-bold opacity-75">Pick type next</span> : null}
        </button>
      ))}
    </div>
  </section>
);

interface SideToggleProps {
  courtSide: CourtSide;
  compact?: boolean;
  onChange: (courtSide: CourtSide) => void;
}

const SideToggle = ({ courtSide, compact = false, onChange }: SideToggleProps) => (
  <div className={`grid shrink-0 grid-cols-2 rounded bg-slate-800 p-1 ${compact ? 'min-w-28 w-28' : 'min-w-36 w-36'}`}>
    {(['left', 'right'] satisfies CourtSide[]).map((side) => (
      <button
        key={side}
        type="button"
        aria-pressed={courtSide === side}
        onClick={() => onChange(side)}
        className={`min-h-11 min-w-11 rounded px-2 text-xs font-black uppercase ${
          courtSide === side ? 'bg-teal-300 text-slate-950' : 'text-slate-200'
        }`}
      >
        {side}
      </button>
    ))}
  </div>
);

interface CourtLineupGridProps {
  courtSide: CourtSide;
  currentRotation: Rotation;
  lineup: LineupSlots;
  roster: PrototypePlayer[];
  variant?: 'dark' | 'light';
  actionLabel?: 'Set' | 'Substitute';
  onPick: (rotation: Rotation) => void;
}

const CourtLineupGrid = ({
  courtSide,
  currentRotation,
  lineup,
  roster,
  variant = 'dark',
  actionLabel = 'Substitute',
  onPick,
}: CourtLineupGridProps) => {
  const light = variant === 'light';
  const positions = getCourtPositions(courtSide);

  return (
    <div className={`mt-3 rounded border p-2 lg:mt-2 lg:p-1.5 ${light ? 'border-slate-300 bg-slate-100' : 'border-white/15 bg-slate-950'}`}>
      <div className={`mb-2 flex items-center lg:mb-1.5 ${courtSide === 'left' ? 'justify-end' : 'justify-start'}`}>
        <span className={`rounded px-2 py-1 text-[0.65rem] font-black uppercase ${light ? 'bg-slate-300 text-slate-900' : 'bg-white/10 text-slate-300'}`}>
          Net
        </span>
      </div>
      <div className={`grid grid-cols-2 gap-2 border-teal-300 lg:gap-1.5 ${courtSide === 'left' ? 'border-r-4 pr-2 lg:pr-1.5' : 'border-l-4 pl-2 lg:pl-1.5'}`}>
        {positions.map((courtPosition) => {
          const lineupRotation = getLineupRotationForCourtPosition(currentRotation, courtPosition);
          const active = courtPosition === 1;
          const playerId = lineup[lineupRotation];
          const player = roster.find((item) => item.id === playerId);

          return (
            <button
              key={courtPosition}
              type="button"
              aria-label={`${actionLabel} position ${courtPosition} ${getPlayerLabel(roster, playerId)}`}
              onClick={() => onPick(lineupRotation)}
              className={`relative min-h-12 rounded border px-2 py-1.5 text-left lg:min-h-11 lg:py-1 ${
                active
                  ? 'border-teal-600 bg-teal-300 text-slate-950'
                  : light
                    ? 'border-slate-300 bg-white text-slate-950'
                    : 'border-white/15 bg-slate-900 text-white'
              }`}
            >
              <span className="absolute right-1.5 top-1.5 rounded bg-black/10 px-1.5 py-0.5 text-[0.65rem] font-black">P{courtPosition}</span>
              <span className="block text-xl font-black leading-none">{player ? `#${player.number}` : 'Empty'}</span>
              <span className={`mt-0.5 block truncate text-xs font-black ${active || light ? 'text-slate-700' : 'text-slate-300'}`}>
                {player ? getShortPlayerName(player) : 'Tap to set'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface SetupSheetProps {
  presentation?: 'dialog' | 'page';
  mode?: 'start' | 'edit';
  setup: SetSetup;
  matchSettings: MatchFormatSettings;
  stateMode: RallyMode;
  currentRotation: Rotation;
  roster: PrototypePlayer[];
  activeRoster: PrototypePlayer[];
  courtSide: CourtSide;
  teamName: string;
  savedLineups: SavedPrototypeLineup[];
  eligibleLineupUsers: EligibleLineupUser[];
  currentUserId: string;
  syncStatus: PrototypeSyncStatus;
  onChange: (setup: SetSetup) => void;
  onOpponentChange: (opponent: string) => void;
  onRosterChange: (roster: PrototypePlayer[]) => void;
  onClearRoster: () => void;
  onCourtSideChange: (courtSide: CourtSide) => void;
  onPickLineupSlot: (rotation: Rotation) => void;
  onLoadLineup: (lineup: LineupSlots) => void;
  onSaveLineup: (name: string, lineup: LineupSlots, linkedUserId: string) => void;
  onClose: () => void;
  onStart: () => void;
  onEndSet: () => void;
  canEndSet: boolean;
  onEndMatch: () => void;
  canEndMatch: boolean;
}

const SetupSheet = ({
  presentation = 'dialog',
  mode = 'start',
  setup,
  matchSettings,
  stateMode,
  currentRotation,
  roster,
  activeRoster,
  courtSide,
  teamName,
  savedLineups,
  eligibleLineupUsers,
  currentUserId,
  syncStatus,
  onChange,
  onOpponentChange,
  onRosterChange,
  onClearRoster,
  onCourtSideChange,
  onPickLineupSlot,
  onLoadLineup,
  onSaveLineup,
  onClose,
  onStart,
  onEndSet,
  canEndSet,
  onEndMatch,
  canEndMatch,
}: SetupSheetProps) => {
  const [newNumber, setNewNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [editor, setEditor] = useState<'roster' | 'lineup' | null>(null);
  const [lineupName, setLineupName] = useState(teamName);
  const [linkedUserId, setLinkedUserId] = useState(currentUserId);
  const [selectedSavedLineupId, setSelectedSavedLineupId] = useState('');
  const [lineupFeedback, setLineupFeedback] = useState('');
  const lineup = setup.lineup ?? getDefaultLineup(roster);

  const addPlayer = () => {
    const number = newNumber.trim();
    const name = newName.trim();
    if (!number || !name) {
      return;
    }
    onRosterChange([...roster, { id: `p-${Date.now()}`, number, name, active: true }]);
    setNewNumber('');
    setNewName('');
  };

  const togglePlayer = (playerId: string) => {
    onRosterChange(roster.map((player) => (player.id === playerId ? { ...player, active: !player.active } : player)));
  };

  const content = (
      <section className={`${presentation === 'page' ? 'min-h-full' : 'max-h-[92vh]'} w-full overflow-auto rounded bg-slate-100 p-4 text-slate-950 shadow-xl sm:max-w-4xl`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-teal-700">{mode === 'edit' ? 'Live match' : 'Match setup'}</p>
            <h2 id="setup-sheet-title" className="text-2xl font-black">{mode === 'edit' ? `Edit Set ${setup.setNumber}` : `Set ${setup.setNumber} Setup`}</h2>
            <p className="text-sm font-bold text-slate-600">{activeRoster.length} active players. Lineup and roster sync to the shared team cloud.</p>
          </div>
          <button type="button" onClick={onClose} className="min-h-12 rounded bg-slate-950 px-4 font-black text-white">
            {mode === 'edit' ? 'Back to Scoring' : 'Back'}
          </button>
        </div>

        <section className="mt-4 rounded border border-slate-300 bg-white p-3">
          <div className="grid gap-3 sm:grid-cols-[1.4fr_0.6fr]">
            <label className="grid gap-1">
              <span className="text-xs font-black uppercase text-slate-600">Opponent</span>
              <input className={inputClass} value={setup.opponent} onChange={(event) => onOpponentChange(event.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-black uppercase text-slate-600">Set</span>
              <input
                className={inputClass}
                type="number"
                min={1}
                value={setup.setNumber}
                onChange={(event) => onChange({ ...setup, setNumber: Number(event.target.value) || 1 })}
              />
            </label>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <p className="mb-2 text-xs font-black uppercase text-slate-600">Match Format</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {MATCH_FORMAT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={matchSettings.format === option.value}
                    onClick={() => onChange({ ...setup, matchFormat: option.value as PrototypeMatchFormat })}
                    className={`min-h-14 rounded border px-2 text-left ${
                      matchSettings.format === option.value ? 'border-teal-700 bg-teal-500 text-slate-950' : 'border-slate-300 bg-white'
                    }`}
                  >
                    <span className="block text-sm font-black">{option.label}</span>
                    <span className="block text-[0.68rem] font-bold text-slate-600">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-black uppercase text-slate-600">Standard Target</span>
                <select
                  className={inputClass}
                  value={matchSettings.standardSetTarget}
                  onChange={(event) => onChange({ ...setup, standardSetTarget: Number(event.target.value) })}
                >
                  {[25, 21, 15].map((target) => (
                    <option key={target} value={target}>
                      {target}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-black uppercase text-slate-600">Deciding Target</span>
                <select
                  className={inputClass}
                  value={matchSettings.decidingSetTarget}
                  onChange={(event) => onChange({ ...setup, decidingSetTarget: Number(event.target.value) })}
                >
                  {[15, 25, 11].map((target) => (
                    <option key={target} value={target}>
                      {target}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-black uppercase text-slate-600">Set {setup.setNumber} target</p>
            <p className="text-sm font-bold text-slate-700">
              Playing {MATCH_FORMAT_OPTIONS.find((option) => option.value === matchSettings.format)?.label ?? 'Match'} · this set to{' '}
              {getSetTarget(matchSettings, setup.setNumber)}
            </p>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1.2fr_1fr]">
            <div>
              <p className="mb-2 text-xs font-black uppercase text-slate-600">Starts</p>
              <div className="grid grid-cols-2 rounded bg-slate-900 p-1">
                {(['serving', 'receiving'] satisfies RallyMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={setup.initialMode === mode}
                    onClick={() => onChange({ ...setup, initialMode: mode })}
                    className={`min-h-12 rounded text-sm font-black uppercase ${
                      setup.initialMode === mode ? 'bg-teal-500 text-slate-950' : 'text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-black uppercase text-slate-600">Starting Rotation</p>
              <div className="grid grid-cols-3 gap-2">
                {rotations.map((rotation) => (
                  <button
                    key={rotation}
                    type="button"
                    aria-label={`Starting rotation R${rotation}`}
                    aria-pressed={setup.initialRotation === rotation}
                    onClick={() => onChange({ ...setup, initialRotation: rotation, initialServerId: setup.lineup?.[rotation] ?? setup.initialServerId })}
                    className={`min-h-12 rounded border text-base font-black ${
                      setup.initialRotation === rotation ? 'border-teal-700 bg-teal-500 text-slate-950' : 'border-slate-300 bg-white'
                    }`}
                  >
                    R{rotation}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-black uppercase text-slate-600">Court Side</p>
              <SideToggle courtSide={courtSide} onChange={onCourtSideChange} />
            </div>
          </div>

          <div className="mt-3">
            <div className="rounded border border-slate-300 bg-slate-50 p-3">
              <p className="text-xs font-black uppercase text-slate-600">
                {stateMode === 'serving' ? `Server for current R${currentRotation}` : 'Starting server if Century serves'}
              </p>
              <p className="mt-1 text-xl font-black">{getPlayerLabel(roster, lineup[setup.initialRotation])}</p>
            </div>
          </div>
        </section>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            aria-pressed={editor === 'roster'}
            onClick={() => setEditor((value) => (value === 'roster' ? null : 'roster'))}
            className={`min-h-12 rounded px-3 font-black ${editor === 'roster' ? 'bg-teal-500 text-slate-950' : 'bg-white text-slate-950'}`}
          >
            Edit Roster
          </button>
          <button
            type="button"
            aria-pressed={editor === 'lineup'}
            onClick={() => setEditor((value) => (value === 'lineup' ? null : 'lineup'))}
            className={`min-h-12 rounded px-3 font-black ${editor === 'lineup' ? 'bg-teal-500 text-slate-950' : 'bg-white text-slate-950'}`}
          >
            Edit Lineup
          </button>
        </div>

        {mode === 'edit' ? <button
          type="button"
          onClick={onEndSet}
          disabled={!canEndSet}
          className="mt-3 min-h-12 w-full rounded border border-amber-300 bg-amber-100 px-3 font-black text-amber-950 disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500"
        >
          Review / End Current Set Early
        </button> : null}

        {editor === 'roster' ? (
          <section className="mt-3 rounded border border-slate-300 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-600">Roster</h3>
                <p className="text-xs font-bold text-slate-500">{activeRoster.length} active players</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClearRoster}
                  className="min-h-11 rounded bg-red-100 px-3 text-sm font-black text-red-900"
                >
                  Clear Shared Roster
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-[5rem_1fr_auto] gap-2">
              <input
                className={inputClass}
                placeholder="#"
                value={newNumber}
                onChange={(event) => setNewNumber(event.target.value)}
                aria-label="New player number"
              />
              <input
                className={inputClass}
                placeholder="Player name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                aria-label="New player name"
              />
              <button type="button" onClick={addPlayer} className="min-h-12 rounded bg-teal-500 px-4 font-black text-slate-950">
                Add
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {roster.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  aria-label={`Toggle active ${getPlayerLabel(roster, player.id)}`}
                  aria-pressed={player.active}
                  onClick={() => togglePlayer(player.id)}
                  className={`min-h-14 rounded border px-2 py-1 text-left ${
                    player.active ? 'border-slate-300 bg-slate-50' : 'border-slate-200 bg-slate-200 text-slate-500'
                  }`}
                >
                  <span className="block text-xl font-black leading-none">#{player.number}</span>
                  <span className="block truncate text-xs font-bold">{getShortPlayerName(player)}</span>
                  <span className="block text-[0.65rem] font-black uppercase">{player.active ? 'Active' : 'Inactive'}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {editor === 'lineup' ? (
          <section className="mt-3 rounded border border-slate-300 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-600">Starting Lineup</h3>
                <p className="text-xs font-bold text-slate-500">Court view follows Century's side of the net.</p>
              </div>
              <SideToggle courtSide={courtSide} onChange={onCourtSideChange} />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
              <label className="grid gap-1">
                <span className="text-xs font-black uppercase text-slate-600">Saved Lineup</span>
                <select
                  className={inputClass}
                  value={selectedSavedLineupId}
                  disabled={savedLineups.length === 0}
                  onChange={(event) => {
                    const saved = savedLineups.find((item) => item.id === event.target.value);
                    if (!saved) return;
                    setSelectedSavedLineupId(saved.id);
                    setLineupName(saved.name);
                    setLinkedUserId(saved.linkedUserId && eligibleLineupUsers.some((candidate) => candidate.id === saved.linkedUserId) ? saved.linkedUserId : currentUserId);
                    onLoadLineup({ ...saved.slots });
                    setLineupFeedback(`${saved.name} loaded`);
                  }}
                >
                  <option value="">{savedLineups.length ? 'Choose a lineup…' : 'No saved lineups'}</option>
                  {savedLineups.map((item) => <option key={item.id} value={item.id}>{item.name}{item.linkedUserEmail ? ` — ${item.linkedUserEmail}` : ''}</option>)}
                </select>
                {selectedSavedLineupId ? (() => {
                  const selected = savedLineups.find((item) => item.id === selectedSavedLineupId);
                  return selected ? <span className="text-[0.68rem] font-bold text-slate-500">Linked to {selected.linkedUserEmail ?? 'Team'}{selected.createdByEmail ? ` · created by ${selected.createdByEmail}` : ''}</span> : null;
                })() : null}
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-black uppercase text-slate-600">Lineup Name</span>
                <input className={inputClass} value={lineupName} onChange={(event) => setLineupName(event.target.value)} placeholder={teamName} />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-black uppercase text-slate-600">Linked User</span>
                {eligibleLineupUsers.length > 1 ? (
                  <select className={inputClass} value={linkedUserId} onChange={(event) => setLinkedUserId(event.target.value)}>
                    {eligibleLineupUsers.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name || candidate.email}</option>)}
                  </select>
                ) : (
                  <div className={`${inputClass} flex items-center truncate bg-slate-100 text-sm`} title={eligibleLineupUsers[0]?.email}>
                    {eligibleLineupUsers[0]?.name || eligibleLineupUsers[0]?.email || 'Signed-in user'}
                  </div>
                )}
              </label>
              <button
                type="button"
                disabled={!lineupName.trim() || !isCompleteLineup(lineup)}
                onClick={() => {
                  onSaveLineup(lineupName, lineup, linkedUserId || currentUserId);
                  setLineupFeedback('Lineup updated');
                }}
                className="min-h-12 rounded bg-teal-500 px-4 font-black text-slate-950 disabled:bg-slate-200 disabled:text-slate-500"
              >
                Save Lineup
              </button>
            </div>
            <p className={`mt-2 text-xs font-black ${syncStatus === 'error' ? 'text-red-700' : 'text-teal-800'}`} role="status">
              {lineupFeedback ? `${lineupFeedback} · ` : ''}{syncStatus === 'error' ? 'Cloud sync failed; recovery copy kept' : syncStatus === 'offline' ? 'Offline; recovery copy kept' : syncStatus === 'saved' ? 'Saved to cloud' : 'Cloud syncing'}
            </p>
            <CourtLineupGrid
              courtSide={courtSide}
              currentRotation={setup.initialRotation}
              lineup={lineup}
              roster={roster}
              variant="light"
              actionLabel="Set"
              onPick={onPickLineupSlot}
            />
            <button
              type="button"
              onClick={() => {
                const nextLineup = getDefaultLineup(roster);
                onChange({
                  ...setup,
                  lineup: nextLineup,
                  initialServerId: nextLineup[setup.initialRotation],
                  rotationServers: getRotationServers(nextLineup),
                });
              }}
              className="mt-2 min-h-12 w-full rounded bg-slate-200 px-3 font-black"
            >
              Fill First Six Active
            </button>
          </section>
        ) : null}

        {presentation === 'page' && canEndMatch ? (
          <section className="mt-4 border-l-4 border-amber-500 bg-amber-50 px-3 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-amber-900">Need to stop here?</p>
            <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-bold text-amber-950">Completed sets are already recorded. End the match without adding an empty set.</p>
              <button type="button" onClick={onEndMatch} className="min-h-12 shrink-0 rounded border-2 border-amber-600 bg-amber-300 px-4 font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-700">
                End Match
              </button>
            </div>
          </section>
        ) : null}

        <div className="sticky bottom-0 mt-4 border-t border-slate-300 bg-slate-100/95 pt-3 backdrop-blur-sm">
          <button type="button" onClick={onStart} className="min-h-16 w-full rounded bg-teal-500 px-5 text-lg font-black uppercase text-slate-950 shadow-lg transition hover:bg-teal-400 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2">
            {mode === 'edit' ? 'Save Changes' : setup.setNumber === 1 ? 'Start Match' : 'Start Set'}
          </button>
        </div>
      </section>
  );
  return presentation === 'page' ? (
    <div className="flex min-h-0 flex-1 justify-center px-3 pb-4 sm:px-5">{content}</div>
  ) : (
    <DialogBackdrop onClose={onClose} labelledBy="setup-sheet-title" className="fixed inset-0 z-20 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center">
      {content}
    </DialogBackdrop>
  );
};

interface PickerSheetProps {
  pending: PendingSelection;
  players: PrototypePlayer[];
  lineup: LineupSlots;
  onPlayer: (playerId: string) => void;
  onErrorSubtype: (subtype: ErrorSubtype) => void;
  onCancel: () => void;
}

const PickerSheet = ({ pending, players, lineup, onPlayer, onErrorSubtype, onCancel }: PickerSheetProps) => {
  const lineupPlayerIds = rotations.map((rotation) => lineup[rotation]).filter((playerId): playerId is string => Boolean(playerId));
  const lineupPlayers = lineupPlayerIds
    .map((playerId) => players.find((player) => player.id === playerId))
    .filter((player): player is PrototypePlayer => Boolean(player));
  const reservePlayers = players.filter((player) => !lineupPlayerIds.includes(player.id));
  const showTeamButton = eventNeedsPlayer(pending.event) === 'charged' || pending.event === 'century_block';

  return (
    <DialogBackdrop onClose={onCancel} labelledBy="picker-sheet-title" className="fixed inset-0 z-30 flex items-end bg-black/70 p-3">
      <section className="w-full rounded bg-slate-100 p-3 text-slate-950 shadow-xl sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="picker-sheet-title" className="text-lg font-black sm:text-xl">{pending.mode === 'player' ? `Player for ${eventLabels[pending.event]}` : 'Their Error Type'}</h2>
          <button type="button" onClick={onCancel} className="min-h-14 rounded bg-slate-950 px-4 font-black text-white">
            Back
          </button>
        </div>
        {pending.mode === 'error' ? (
          <div className="grid grid-cols-3 gap-2">
            {(['Serve', 'Attack', 'Other'] satisfies ErrorSubtype[]).map((subtype) => (
              <button key={subtype} type="button" onClick={() => onErrorSubtype(subtype)} className="min-h-20 rounded bg-teal-500 text-xl font-black">
                {subtype}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid gap-3">
            <section>
              <p className="mb-1.5 text-xs font-black uppercase text-slate-500">Current Lineup</p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 xl:grid-cols-7">
                {showTeamButton ? (
                  <button type="button" onClick={() => onPlayer(TEAM_ATTRIBUTION_ID)} className="min-h-14 rounded bg-slate-950 px-2 text-center text-white">
                    <span className="block text-sm font-black leading-tight">TEAM</span>
                    <span className="block text-[0.65rem] font-bold leading-tight text-slate-300">UNCLEAR</span>
                  </button>
                ) : null}
                {lineupPlayers.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    aria-label={`Choose lineup ${getPlayerLabel(players, player.id)}`}
                    onClick={() => onPlayer(player.id)}
                    className="min-h-14 rounded border border-teal-700 bg-teal-300 px-2 py-1 text-center text-slate-950 shadow-sm"
                  >
                    <span className="block text-2xl font-black leading-none sm:text-3xl">#{player.number}</span>
                    <span className="mt-1 block truncate text-[0.68rem] font-bold leading-tight sm:text-xs">{getShortPlayerName(player)}</span>
                  </button>
                ))}
              </div>
            </section>

            {reservePlayers.length > 0 ? (
              <section>
                <p className="mb-1.5 text-xs font-black uppercase text-slate-500">Reserves</p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 xl:grid-cols-8">
                  {reservePlayers.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      aria-label={`Choose reserve ${getPlayerLabel(players, player.id)}`}
                      onClick={() => onPlayer(player.id)}
                      className="min-h-14 rounded border border-slate-300 bg-white px-2 py-1 text-center shadow-sm"
                    >
                      <span className="block text-2xl font-black leading-none sm:text-3xl">#{player.number}</span>
                      <span className="mt-1 block truncate text-[0.68rem] font-bold leading-tight text-slate-600 sm:text-xs">{getShortPlayerName(player)}</span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </section>
    </DialogBackdrop>
  );
};

interface SetCompletionSheetProps {
  review: SetCompletionReview;
  setup: SetSetup;
  settings: MatchFormatSettings;
  completedSetResults: CompletedSetResult[];
  onSave: () => void;
  onCancel: () => void;
}

const SetCompletionSheet = ({ review, setup, settings, completedSetResults, onSave, onCancel }: SetCompletionSheetProps) => {
  const reviewedResult: CompletedSetResult = review.winner
    ? review.winner === 'century' ? 'Win' : 'Loss'
    : review.centuryScore === review.opponentScore ? 'Draw' : review.centuryScore > review.opponentScore ? 'Win' : 'Loss';
  const nextResults = [...completedSetResults, reviewedResult];
  const wins = nextResults.filter((result) => result === 'Win').length;
  const losses = nextResults.filter((result) => result === 'Loss').length;
  const formatLabel = MATCH_FORMAT_OPTIONS.find((option) => option.value === settings.format)?.label ?? 'Match';
  const matchComplete = isMatchCompleteAfterSet(settings, nextResults);

  return (
    <DialogBackdrop onClose={onCancel} labelledBy="set-completion-title" className="fixed inset-0 z-40 flex items-end bg-black/75 p-3 sm:items-center sm:justify-center">
      <section className="w-full rounded bg-slate-100 p-4 text-slate-950 shadow-xl sm:max-w-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-slate-500">{review.reason === 'automatic' ? 'Set Complete' : 'Review Set'}</p>
            <h2 id="set-completion-title" className="text-2xl font-black">Verify Set {review.setNumber}</h2>
          </div>
          <button type="button" onClick={onCancel} className="min-h-12 rounded bg-slate-200 px-4 font-black text-slate-950">
            Keep Scoring
          </button>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded border border-slate-300 bg-white p-3">
          <div>
            <p className="text-xs font-black uppercase text-slate-500">Century</p>
            <p className="text-5xl font-black leading-none">{review.centuryScore}</p>
          </div>
          <p className="text-xl font-black text-slate-400">-</p>
          <div className="text-right">
            <p className="text-xs font-black uppercase text-slate-500">{setup.opponent}</p>
            <p className="text-5xl font-black leading-none">{review.opponentScore}</p>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Metric label="Winner" value={review.winner ? (review.winner === 'century' ? 'Century' : setup.opponent) : 'Verify'} compact />
          <Metric label="Target" value={review.targetScore} compact />
          <Metric label="Match" value={`${wins}-${losses}`} compact />
        </div>

        <div className="mt-3 rounded border border-slate-300 bg-white p-3">
          <p className="text-sm font-black">{formatLabel}</p>
          <p className="text-xs font-bold text-slate-600">
            {matchComplete
              ? 'Saving this set finishes the match, finalizes every entry, and returns to Match Day.'
              : `Saving this set opens setup for set ${review.setNumber + 1}.`}
          </p>
        </div>

        <button type="button" onClick={onSave} className="mt-3 min-h-14 w-full rounded bg-teal-500 px-4 text-lg font-black text-slate-950">
          {matchComplete ? 'Finish Match' : 'Save Set'}
        </button>
      </section>
    </DialogBackdrop>
  );
};

interface EndMatchConfirmationSheetProps {
  setup: SetSetup;
  completedSets: PrototypeSetInput[];
  currentSet?: PrototypeSetInput;
  onConfirm: () => void;
  onCancel: () => void;
}

const EndMatchConfirmationSheet = ({ setup, completedSets, currentSet, onConfirm, onCancel }: EndMatchConfirmationSheetProps) => {
  const currentState = currentSet ? deriveSetState(currentSet.setup, currentSet.rallies) : undefined;
  const finalSets = currentSet ? upsertCompletedSet(completedSets, currentSet) : completedSets;
  const finalResults = finalSets.map(getCompletedSetResult);
  const wins = finalResults.filter((result) => result === 'Win').length;
  const losses = finalResults.filter((result) => result === 'Loss').length;
  const draws = finalResults.filter((result) => result === 'Draw').length;
  const result = getFinalMatchResult(finalResults);

  return (
    <DialogBackdrop onClose={onCancel} labelledBy="end-match-title" className="fixed inset-0 z-50 flex items-end bg-black/80 p-3 sm:items-center sm:justify-center">
      <section className="max-h-[90vh] w-full overflow-auto rounded border-t-4 border-amber-500 bg-slate-100 p-4 text-slate-950 shadow-2xl sm:max-w-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-800">Final review</p>
            <h2 id="end-match-title" className="mt-1 text-2xl font-black">End this match?</h2>
            <p className="mt-1 text-sm font-bold text-slate-600">Century vs {setup.opponent.trim() || 'Opponent'}</p>
          </div>
          <span className="rounded bg-slate-950 px-3 py-2 text-sm font-black text-white">{result}</span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Metric label="Century sets" value={wins} compact />
          <Metric label="Opponent sets" value={losses} compact />
          <Metric label="Tied sets" value={draws} compact />
        </div>

        <section className="mt-3 rounded border border-slate-300 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-black uppercase text-slate-600">Sets to finalize</h3>
            <span className="text-xs font-black text-slate-500">{finalSets.length} total</span>
          </div>
          <div className="mt-2 grid gap-2">
            {completedSets.map((set) => {
              const setState = deriveSetState(set.setup, set.rallies);
              return (
                <div key={set.id} className="flex items-center justify-between border-b border-slate-200 pb-2 text-sm font-bold last:border-0 last:pb-0">
                  <span>Set {set.setNumber} · saved</span>
                  <span className="font-black tabular-nums">{setState.centuryScore}-{setState.opponentScore}</span>
                </div>
              );
            })}
            {completedSets.length === 0 ? <p className="text-sm font-bold text-slate-500">No completed sets yet.</p> : null}
          </div>
        </section>

        <div className={`mt-3 border-l-4 px-3 py-3 ${currentSet ? 'border-amber-500 bg-amber-50' : 'border-slate-400 bg-slate-200'}`}>
          <p className="text-sm font-black">{currentSet ? 'Current set will be saved' : 'No active set to add'}</p>
          <p className="mt-1 text-xs font-bold text-slate-700">
            {currentState
              ? `Set ${currentSet?.setNumber} will be finalized at ${currentState.centuryScore}-${currentState.opponentScore}.`
              : 'Only the already-completed sets shown above will be finalized.'}
          </p>
        </div>

        <p className="mt-3 text-sm font-bold text-slate-700">All entries will be finalized once, and you’ll return to Match Day to start a new match.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className="min-h-14 rounded border border-slate-300 bg-white px-4 font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-600">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="min-h-14 rounded border-2 border-amber-700 bg-amber-400 px-4 text-lg font-black text-slate-950 transition hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-800">
            End Match
          </button>
        </div>
      </section>
    </DialogBackdrop>
  );
};

interface LineupPickerSheetProps {
  rotation: Rotation;
  context: 'setup' | 'live';
  players: PrototypePlayer[];
  lineup: LineupSlots;
  onPlayer: (playerId: string) => void;
  onCancel: () => void;
}

const LineupPickerSheet = ({ rotation, context, players, lineup, onPlayer, onCancel }: LineupPickerSheetProps) => (
  <DialogBackdrop onClose={onCancel} labelledBy="lineup-picker-title" className="fixed inset-0 z-30 flex items-end bg-black/70 p-3">
    <section className="w-full rounded bg-slate-100 p-3 text-slate-950 shadow-xl sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 id="lineup-picker-title" className="text-lg font-black sm:text-xl">{context === 'setup' ? `Set R${rotation}` : `Substitute R${rotation}`}</h2>
          <p className="text-xs font-bold text-slate-600">Choosing a player already in the lineup swaps the two spots.</p>
        </div>
        <button type="button" onClick={onCancel} className="min-h-14 rounded bg-slate-950 px-4 font-black text-white">
          Back
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 xl:grid-cols-8">
        {players.map((player) => {
          const playerRotation = rotations.find((item) => lineup[item] === player.id);
          const selected = lineup[rotation] === player.id;

          return (
            <button
              key={player.id}
              type="button"
              aria-label={`Choose lineup ${getPlayerLabel(players, player.id)}`}
              onClick={() => onPlayer(player.id)}
              className={`min-h-14 rounded border px-2 py-1 text-center shadow-sm ${
                selected
                  ? 'border-teal-700 bg-teal-500 text-slate-950'
                  : playerRotation
                    ? 'border-amber-400 bg-amber-100 text-slate-950'
                    : 'border-slate-300 bg-white'
              }`}
            >
              <span className="block text-2xl font-black leading-none sm:text-3xl">#{player.number}</span>
              <span className="mt-1 block truncate text-[0.68rem] font-bold leading-tight sm:text-xs">{getShortPlayerName(player)}</span>
              {playerRotation ? <span className="block text-[0.6rem] font-black uppercase leading-tight">R{playerRotation}</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  </DialogBackdrop>
);

interface CorrectionSheetProps {
  rally: RallyRecord;
  players: PrototypePlayer[];
  onEvent: (event: TerminalEvent) => void;
  onClose: () => void;
}

const CorrectionSheet = ({ rally, players, onEvent, onClose }: CorrectionSheetProps) => (
  <DialogBackdrop onClose={onClose} labelledBy="correction-sheet-title" className="fixed inset-0 z-20 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center">
    <section className="w-full rounded bg-slate-100 p-4 text-slate-950 shadow-xl sm:max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="correction-sheet-title" className="text-2xl font-black">Correct Last Rally</h2>
          <p className="text-sm font-bold text-slate-600">{getRallyDescription(rally, players)}</p>
        </div>
        <button type="button" onClick={onClose} className="min-h-14 rounded bg-slate-950 px-4 font-black text-white">
          Close
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <EventPanel title="CENTURY POINT" tone="century" events={centuryEvents} onEvent={onEvent} disabled={false} />
        <EventPanel title="OPPONENT POINT" tone="opponent" events={opponentEvents} onEvent={onEvent} disabled={false} />
      </div>
    </section>
  </DialogBackdrop>
);

interface SummaryPanelProps {
  summary: ReturnType<typeof summarizeSet>;
  players: PrototypePlayer[];
  onClose: () => void;
}

interface ReportSheetProps {
  seasonReport: PrototypeSeasonReport;
  aggregateSeasonReport: PrototypeSeasonReport;
  currentMatchReport: PrototypeMatchReport;
  players: PrototypePlayer[];
  onDeleteMatch: (matchId: string) => void;
  onClearMatchData: () => void;
  onDeleteRosterData: () => void;
  onNewMatch: () => void;
  matchComplete: boolean;
  onClose: () => void;
}

const formatReportDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const formatMatchScore = (match: PrototypeMatchReport) => `${match.centurySetsWon}-${match.opponentSetsWon}`;

const ReportSheet = ({
  seasonReport,
  aggregateSeasonReport,
  currentMatchReport,
  players,
  onDeleteMatch,
  onClearMatchData,
  onDeleteRosterData,
  onNewMatch,
  matchComplete,
  onClose,
}: ReportSheetProps) => {
  const [view, setView] = useState<'match' | 'season'>('match');
  const [selectedMatchId, setSelectedMatchId] = useState(currentMatchReport.id);
  const selectedMatchReport = seasonReport.matchReports.find((match) => match.id === selectedMatchId) ?? currentMatchReport;
  const activeReport = view === 'match' ? selectedMatchReport : undefined;
  const summary = activeReport?.summary ?? aggregateSeasonReport.summary;
  const showMatch = (matchId: string) => {
    setSelectedMatchId(matchId);
    setView('match');
  };

  return (
    <DialogBackdrop onClose={onClose} labelledBy="report-sheet-title" className="fixed inset-0 z-30 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center">
      <section className="max-h-[88vh] w-full overflow-auto rounded bg-slate-100 p-3 text-slate-950 shadow-xl sm:max-w-5xl sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="report-sheet-title" className="text-xl font-black">Reports</h2>
            <p className="text-sm font-bold text-slate-600">Match-by-match breakdown and combined season view.</p>
          </div>
          <button type="button" onClick={onClose} className="min-h-14 rounded bg-slate-950 px-4 font-black text-white">
            Back
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 rounded bg-slate-900 p-1">
          {(['match', 'season'] satisfies Array<typeof view>).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={view === item}
              onClick={() => setView(item)}
              className={`min-h-12 rounded text-sm font-black uppercase ${view === item ? 'bg-teal-400 text-slate-950' : 'text-white'}`}
            >
              {item === 'match' ? 'Match Detail' : 'Season'}
            </button>
          ))}
        </div>

        {view === 'match' ? (
          <div className="mt-3 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded border border-slate-300 bg-white p-3">
              <div className="mb-3 grid gap-2">
                <p className="text-xs font-black uppercase text-slate-500">Choose Match</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {seasonReport.matchReports.map((match) => (
                    <button
                      key={match.id}
                      type="button"
                      aria-pressed={selectedMatchReport.id === match.id}
                      onClick={() => showMatch(match.id)}
                      className={`min-h-12 rounded border px-2 text-left text-sm font-black ${
                        selectedMatchReport.id === match.id ? 'border-teal-700 bg-teal-300 text-slate-950' : 'border-slate-300 bg-slate-50'
                      }`}
                    >
                      <span className="block truncate">vs {match.opponent}</span>
                      <span className="block text-[0.68rem] font-bold text-slate-600">{formatReportDate(match.date)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-slate-500">
                    {selectedMatchReport.id === currentMatchReport.id ? 'Current Match' : 'Saved Match'}
                  </p>
                  <h3 className="text-2xl font-black">Century vs {selectedMatchReport.opponent}</h3>
                  <p className="text-sm font-bold text-slate-600">
                    {formatReportDate(selectedMatchReport.date)} · {selectedMatchReport.result} · Match {formatMatchScore(selectedMatchReport)}
                  </p>
                </div>
                <span className="rounded bg-slate-900 px-3 py-2 text-sm font-black text-white">{selectedMatchReport.ralliesTracked} rallies</span>
              </div>

              <div className="mt-3 grid gap-2">
                {selectedMatchReport.setReports.map((set) => (
                  <div key={set.id} className="rounded border border-slate-200 bg-slate-50 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-black">Set {set.setNumber}</p>
                      <p className="text-xl font-black">
                        {set.centuryScore}-{set.opponentScore}
                      </p>
                    </div>
                    <p className="text-xs font-bold text-slate-500">
                      Earned {set.summary.team.earnedPoints} · Gifts in {set.summary.team.giftsReceived} · Gifts out {set.summary.team.giftsConceded}
                    </p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onDeleteMatch(selectedMatchReport.id)}
                className="mt-3 min-h-12 w-full rounded bg-red-700 px-3 font-black text-white"
              >
                Delete This Match
              </button>
              {matchComplete && selectedMatchReport.id === currentMatchReport.id ? (
                <button type="button" onClick={onNewMatch} className="mt-2 min-h-14 w-full rounded bg-teal-500 px-3 text-lg font-black text-slate-950">
                  New Match
                </button>
              ) : null}
            </section>

            <ReportInsightGrid summary={summary} players={players} />
          </div>
        ) : (
          <div className="mt-3 grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded border border-slate-300 bg-white p-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <Metric label="Matches" value={aggregateSeasonReport.matchesPlayed} />
                <Metric label="W-L" value={`${aggregateSeasonReport.wins}-${aggregateSeasonReport.losses}`} />
                <Metric label="Draws" value={aggregateSeasonReport.draws} />
                <Metric label="Open" value={aggregateSeasonReport.openMatches} />
                <Metric label="Rallies" value={aggregateSeasonReport.ralliesTracked} />
              </div>

              <div className="mt-3 grid gap-2">
                {aggregateSeasonReport.matchReports.map((match) => (
                  <div key={match.id} className="rounded border border-slate-200 bg-slate-50 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-black">Century vs {match.opponent}</p>
                        <p className="text-xs font-bold text-slate-500">
                          {formatReportDate(match.date)} · {match.result} · Match {formatMatchScore(match)}
                        </p>
                      </div>
                      <p className="text-sm font-black text-slate-600">{match.ralliesTracked} rallies</p>
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      Earned {match.summary.team.earnedPoints} · Gifts in {match.summary.team.giftsReceived} · Gifts out {match.summary.team.giftsConceded}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => showMatch(match.id)} className="min-h-11 rounded bg-slate-900 px-3 text-sm font-black text-white">
                        View Match
                      </button>
                      <button type="button" onClick={() => onDeleteMatch(match.id)} className="min-h-11 rounded bg-red-700 px-3 text-sm font-black text-white">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <section className="mt-3 rounded border border-red-200 bg-red-50 p-3">
                <h3 className="text-sm font-black uppercase text-red-900">Data Cleanup</h3>
                <p className="text-xs font-bold text-red-800">Remove test runs from the report data when needed.</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={onClearMatchData} className="min-h-12 rounded bg-white px-3 font-black text-red-950">
                    Clear Current Match
                  </button>
                  <button type="button" onClick={onDeleteRosterData} className="min-h-12 rounded bg-red-700 px-3 font-black text-white">
                    Delete Roster + Matches
                  </button>
                </div>
              </section>
            </section>

            <ReportInsightGrid summary={summary} players={players} />
          </div>
        )}
      </section>
    </DialogBackdrop>
  );
};

const ReportInsightGrid = ({ summary, players }: { summary: ReturnType<typeof summarizeSet>; players: PrototypePlayer[] }) => (
  <section className="rounded border border-slate-300 bg-white p-3">
    <div className="grid grid-cols-3 gap-2">
      <Metric label="Earned" value={summary.team.earnedPoints} />
      <Metric label="Gifts In" value={summary.team.giftsReceived} />
      <Metric label="Gifts Out" value={summary.team.giftsConceded} />
    </div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <div className="grid content-start gap-3">
        <BreakdownBlock title="Where Earning" emptyText="No earned points yet" items={summary.team.earnedByType} tone="good" />
        <PlayerBlock title="Who Earning" emptyText="No player-earned points yet" players={players} summary={summary} mode="earnedPoints" />
      </div>
      <div className="grid content-start gap-3">
        <BreakdownBlock title="Where Gifting" emptyText="No Century gifts conceded" items={summary.team.giftsConcededByType} tone="warn" />
        <PlayerBlock title="Who Gifting" emptyText="No player gifts charged" players={players} summary={summary} mode="giftsConceded" />
      </div>
    </div>
  </section>
);

const SummaryPanel = ({ summary, players, onClose }: SummaryPanelProps) => (
  <DialogBackdrop onClose={onClose} labelledBy="summary-sheet-title" className="fixed inset-0 z-30 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center">
    <section className="max-h-[86vh] w-full overflow-auto rounded bg-slate-100 p-3 text-slate-950 shadow-xl sm:max-w-3xl sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="summary-sheet-title" className="text-xl font-black">Set / Match Live Read</h2>
          <p className="text-sm font-bold text-slate-600">Current scoring balance from the rally log.</p>
        </div>
        <button type="button" onClick={onClose} className="min-h-14 rounded bg-slate-950 px-4 font-black text-white">
          Back
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Metric label="Earned" value={summary.team.earnedPoints} />
        <Metric label="Gifts In" value={summary.team.giftsReceived} />
        <Metric label="Gifts Out" value={summary.team.giftsConceded} />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Metric label="BP" value={summary.team.breakpoint.label} compact />
        <Metric label="Sideout" value={summary.team.sideout.label} compact />
        <Metric label="Serve IN" value={summary.team.serveIn.label} compact />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="grid content-start gap-3">
          <BreakdownBlock title="Where Earning" emptyText="No earned points yet" items={summary.team.earnedByType} tone="good" />
          <PlayerBlock title="Who Earning" emptyText="No player-earned points yet" players={players} summary={summary} mode="earnedPoints" />
        </div>
        <div className="grid content-start gap-3">
          <BreakdownBlock title="Where Gifting" emptyText="No Century gifts conceded" items={summary.team.giftsConcededByType} tone="warn" />
          <PlayerBlock title="Who Gifting" emptyText="No player gifts charged" players={players} summary={summary} mode="giftsConceded" />
        </div>
      </div>
    </section>
  </DialogBackdrop>
);

const Metric = ({ label, value, compact = false }: { label: string; value: string | number; compact?: boolean }) => (
  <div className="rounded bg-slate-900 p-2 text-white">
    <p className="text-xs font-black uppercase text-slate-300">{label}</p>
    <p className={`${compact ? 'text-xl' : 'text-2xl'} font-black`}>{value}</p>
  </div>
);

const BreakdownBlock = ({
  title,
  emptyText,
  items,
  tone,
}: {
  title: string;
  emptyText: string;
  items: BreakdownItem[];
  tone: 'good' | 'warn' | 'neutral';
}) => (
  <div>
    <h3 className="text-xs font-black uppercase text-slate-600">{title}</h3>
    <div className="mt-1.5 space-y-1.5">
      {items.length > 0 ? (
        items.map((item) => <InsightRow key={item.key} label={item.label} value={item.total} tone={tone} />)
      ) : (
        <p className="rounded bg-white p-2 text-sm font-bold text-slate-500">{emptyText}</p>
      )}
    </div>
  </div>
);

const PlayerBlock = ({
  title,
  emptyText,
  players,
  summary,
  mode,
}: {
  title: string;
  emptyText: string;
  players: PrototypePlayer[];
  summary: ReturnType<typeof summarizeSet>;
  mode: 'earnedPoints' | 'giftsConceded';
}) => {
  const topPlayers = getTopPlayers(summary, players, mode);

  return (
    <div>
      <h3 className="text-xs font-black uppercase text-slate-600">{title}</h3>
      <div className="mt-1.5 space-y-1.5">
        {topPlayers.length > 0 ? (
          topPlayers.map((item) => {
            return (
              <InsightRow
                key={item.playerId}
                label={getPlayerLabel(players, item.playerId)}
                value={item[mode]}
                tone={mode === 'earnedPoints' ? 'good' : 'warn'}
              />
            );
          })
        ) : (
          <p className="rounded bg-white p-2 text-sm font-bold text-slate-500">{emptyText}</p>
        )}
      </div>
    </div>
  );
};

const InsightRow = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'good' | 'warn' | 'neutral';
}) => {
  const toneClass =
    tone === 'good'
      ? 'bg-teal-300 text-slate-950'
      : tone === 'warn'
        ? 'bg-amber-300 text-slate-950'
        : 'bg-slate-200 text-slate-950';

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 rounded bg-white px-2 py-1.5 text-sm">
      <div className="min-w-0">
        <p className="truncate font-black">{label}</p>
      </div>
      <span className={`flex h-7 min-w-7 items-center justify-center rounded px-2 text-sm font-black ${toneClass}`}>{value}</span>
    </div>
  );
};

export default RebuildPrototype;
