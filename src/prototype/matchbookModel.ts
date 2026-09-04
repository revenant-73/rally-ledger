export type TeamSide = 'century' | 'opponent';
export type RallyMode = 'serving' | 'receiving';
export type Rotation = 1 | 2 | 3 | 4 | 5 | 6;
export type ErrorSubtype = 'Serve' | 'Attack' | 'Other';
export type LineupSlots = Partial<Record<Rotation, string>>;

export interface PrototypePlayer {
  id: string;
  number: string;
  name: string;
  active: boolean;
}

export interface SetSetup {
  opponent: string;
  setNumber: number;
  initialMode: RallyMode;
  initialRotation: Rotation;
  initialServerId?: string;
  lineup?: LineupSlots;
  rotationServers?: Partial<Record<Rotation, string>>;
}

export type TerminalEvent =
  | 'century_ace'
  | 'century_kill'
  | 'century_block'
  | 'opponent_error'
  | 'opponent_kill'
  | 'opponent_block'
  | 'receive_error'
  | 'serve_error'
  | 'attack_error'
  | 'ball_control_error'
  | 'violation';

export interface RallyRecord {
  id: string;
  sequence: number;
  createdAt: string;
  startMode: RallyMode;
  startRotation: Rotation;
  serverId?: string;
  winner: TeamSide;
  event: TerminalEvent;
  errorSubtype?: ErrorSubtype;
  creditedPlayerId?: string;
  chargedPlayerId?: string;
  teamAttribution?: boolean;
  active: boolean;
}

export interface DerivedSetState {
  centuryScore: number;
  opponentScore: number;
  mode: RallyMode;
  rotation: Rotation;
  serverId?: string;
}

export interface PendingRallyInput {
  winner: TeamSide;
  event: TerminalEvent;
  errorSubtype?: ErrorSubtype;
  creditedPlayerId?: string;
  chargedPlayerId?: string;
  teamAttribution?: boolean;
}

export interface TeamSummary {
  earnedPoints: number;
  giftsReceived: number;
  opponentEarnedPoints: number;
  giftsConceded: number;
  earnedByType: BreakdownItem[];
  giftsReceivedByType: BreakdownItem[];
  giftsConcededByType: BreakdownItem[];
  breakpoint: Ratio;
  sideout: Ratio;
  serveIn: Ratio;
  ace: Ratio;
}

export interface Ratio {
  made: number;
  attempts: number;
  label: string;
}

export interface RotationSummary {
  rotation: Rotation;
  rallies: number;
  won: number;
  lost: number;
  earnedPoints: number;
  giftsReceived: number;
  giftsConceded: number;
  breakpoint: Ratio;
  sideout: Ratio;
}

export interface PlayerSummary {
  playerId: string;
  earnedPoints: number;
  giftsConceded: number;
  balance: number;
  earnedByType: BreakdownItem[];
  giftsConcededByType: BreakdownItem[];
  serveAttempts: number;
  servesIn: number;
  serveIn: Ratio;
  aces: number;
  ace: Ratio;
  breakpoint: Ratio;
}

export interface SetSummary {
  team: TeamSummary;
  rotations: RotationSummary[];
  players: PlayerSummary[];
}

export interface BreakdownItem {
  key: string;
  label: string;
  total: number;
}

export interface PrototypeSetInput {
  id: string;
  setNumber: number;
  setup: SetSetup;
  rallies: RallyRecord[];
}

export interface PrototypeMatchInput {
  id: string;
  opponent: string;
  date: string;
  result?: 'Win' | 'Loss' | 'Open';
  sets: PrototypeSetInput[];
}

export interface PrototypeSetReport {
  id: string;
  setNumber: number;
  centuryScore: number;
  opponentScore: number;
  ralliesTracked: number;
  summary: SetSummary;
}

export interface PrototypeMatchReport {
  id: string;
  opponent: string;
  date: string;
  result: 'Win' | 'Loss' | 'Open';
  centurySetsWon: number;
  opponentSetsWon: number;
  ralliesTracked: number;
  summary: SetSummary;
  setReports: PrototypeSetReport[];
}

export interface PrototypeSeasonReport {
  matchesPlayed: number;
  wins: number;
  losses: number;
  openMatches: number;
  ralliesTracked: number;
  summary: SetSummary;
  matchReports: PrototypeMatchReport[];
}

export const TEAM_ATTRIBUTION_ID = 'team';

const rotations: Rotation[] = [1, 2, 3, 4, 5, 6];

export const nextRotation = (rotation: Rotation): Rotation => {
  if (rotation === 6) {
    return 1;
  }
  return (rotation + 1) as Rotation;
};

export const formatRatio = (made: number, attempts: number): Ratio => ({
  made,
  attempts,
  label: attempts === 0 ? '--' : `${Math.round((made / attempts) * 100)}%`,
});

export const getWinnerForEvent = (event: TerminalEvent): TeamSide => {
  if (
    event === 'century_ace' ||
    event === 'century_kill' ||
    event === 'century_block' ||
    event === 'opponent_error'
  ) {
    return 'century';
  }
  return 'opponent';
};

export const eventNeedsPlayer = (event: TerminalEvent): 'credited' | 'charged' | 'none' => {
  if (event === 'century_kill' || event === 'century_block') {
    return 'credited';
  }

  if (
    event === 'receive_error' ||
    event === 'attack_error' ||
    event === 'ball_control_error' ||
    event === 'violation'
  ) {
    return 'charged';
  }

  return 'none';
};

export const deriveSetState = (setup: SetSetup, rallies: RallyRecord[]): DerivedSetState => {
  let state: DerivedSetState = {
    centuryScore: 0,
    opponentScore: 0,
    mode: setup.initialMode,
    rotation: setup.initialRotation,
    serverId:
      setup.initialMode === 'serving'
        ? setup.initialServerId ?? setup.rotationServers?.[setup.initialRotation] ?? setup.lineup?.[setup.initialRotation]
        : undefined,
  };

  for (const rally of rallies.filter((item) => item.active).sort((a, b) => a.sequence - b.sequence)) {
    const startedServing = rally.startMode === 'serving';
    const centuryWon = rally.winner === 'century';
    const score = {
      centuryScore: state.centuryScore + (centuryWon ? 1 : 0),
      opponentScore: state.opponentScore + (centuryWon ? 0 : 1),
    };

    if (startedServing && centuryWon) {
      state = { ...state, ...score, mode: 'serving', rotation: rally.startRotation, serverId: rally.serverId };
      continue;
    }

    if (startedServing && !centuryWon) {
      state = { ...state, ...score, mode: 'receiving', rotation: rally.startRotation, serverId: undefined };
      continue;
    }

    if (!startedServing && !centuryWon) {
      state = { ...state, ...score, mode: 'receiving', rotation: rally.startRotation, serverId: undefined };
      continue;
    }

    const rotation = nextRotation(rally.startRotation);
    state = {
      ...state,
      ...score,
      mode: 'serving',
      rotation,
      serverId: setup.rotationServers?.[rotation] ?? setup.lineup?.[rotation] ?? setup.initialServerId,
    };
  }

  return state;
};

export const buildRally = (
  setup: SetSetup,
  rallies: RallyRecord[],
  input: PendingRallyInput,
  idFactory: () => string = () => crypto.randomUUID(),
  nowFactory = () => new Date().toISOString(),
): RallyRecord => {
  const state = deriveSetState(setup, rallies);
  return {
    id: idFactory(),
    sequence: rallies.length + 1,
    createdAt: nowFactory(),
    startMode: state.mode,
    startRotation: state.rotation,
    serverId: state.mode === 'serving' ? state.serverId : undefined,
    winner: input.winner,
    event: input.event,
    errorSubtype: input.errorSubtype,
    creditedPlayerId: input.creditedPlayerId,
    chargedPlayerId: input.chargedPlayerId,
    teamAttribution: input.teamAttribution,
    active: true,
  };
};

const isCenturyEarned = (rally: RallyRecord) =>
  rally.event === 'century_ace' || rally.event === 'century_kill' || rally.event === 'century_block';

const isGiftReceived = (rally: RallyRecord) => rally.event === 'opponent_error';

const isOpponentEarned = (rally: RallyRecord) => rally.event === 'opponent_kill' || rally.event === 'opponent_block';

const isGiftConceded = (rally: RallyRecord) =>
  rally.event === 'receive_error' ||
  rally.event === 'serve_error' ||
  rally.event === 'attack_error' ||
  rally.event === 'ball_control_error' ||
  rally.event === 'violation';

const pointSourceLabels: Record<TerminalEvent, string> = {
  century_ace: 'Aces',
  century_kill: 'Kills',
  century_block: 'Blocks',
  opponent_error: 'Their Errors',
  opponent_kill: 'Opponent Kills',
  opponent_block: 'Opponent Blocks',
  receive_error: 'Serve Receive',
  serve_error: 'Serving',
  attack_error: 'Attacking',
  ball_control_error: 'Ball Control',
  violation: 'Violations',
};

const countBreakdown = (
  rallies: RallyRecord[],
  events: TerminalEvent[],
  getLabel: (event: TerminalEvent) => string = (event) => pointSourceLabels[event],
): BreakdownItem[] =>
  events
    .map((event) => ({
      key: event,
      label: getLabel(event),
      total: rallies.filter((rally) => rally.event === event).length,
    }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));

export const summarizeSet = (rallies: RallyRecord[], players: PrototypePlayer[]): SetSummary => {
  const activeRallies = rallies.filter((rally) => rally.active).sort((a, b) => a.sequence - b.sequence);
  const serviceRallies = activeRallies.filter((rally) => rally.startMode === 'serving');
  const receiveRallies = activeRallies.filter((rally) => rally.startMode === 'receiving');
  const centuryServiceWins = serviceRallies.filter((rally) => rally.winner === 'century').length;
  const centuryReceiveWins = receiveRallies.filter((rally) => rally.winner === 'century').length;
  const serveErrors = serviceRallies.filter((rally) => rally.event === 'serve_error').length;
  const aces = serviceRallies.filter((rally) => rally.event === 'century_ace').length;

  const team: TeamSummary = {
    earnedPoints: activeRallies.filter(isCenturyEarned).length,
    giftsReceived: activeRallies.filter(isGiftReceived).length,
    opponentEarnedPoints: activeRallies.filter(isOpponentEarned).length,
    giftsConceded: activeRallies.filter(isGiftConceded).length,
    earnedByType: countBreakdown(activeRallies, ['century_ace', 'century_kill', 'century_block']),
    giftsReceivedByType: countBreakdown(activeRallies, ['opponent_error'], (event) => {
      if (event !== 'opponent_error') {
        return pointSourceLabels[event];
      }
      return 'Their Errors';
    }),
    giftsConcededByType: countBreakdown(activeRallies, [
      'receive_error',
      'serve_error',
      'attack_error',
      'ball_control_error',
      'violation',
    ]),
    breakpoint: formatRatio(centuryServiceWins, serviceRallies.length),
    sideout: formatRatio(centuryReceiveWins, receiveRallies.length),
    serveIn: formatRatio(serviceRallies.length - serveErrors, serviceRallies.length),
    ace: formatRatio(aces, serviceRallies.length),
  };

  const rotationSummaries = rotations.map((rotation) => {
    const rotationRallies = activeRallies.filter((rally) => rally.startRotation === rotation);
    const rotationService = rotationRallies.filter((rally) => rally.startMode === 'serving');
    const rotationReceive = rotationRallies.filter((rally) => rally.startMode === 'receiving');

    return {
      rotation,
      rallies: rotationRallies.length,
      won: rotationRallies.filter((rally) => rally.winner === 'century').length,
      lost: rotationRallies.filter((rally) => rally.winner === 'opponent').length,
      earnedPoints: rotationRallies.filter(isCenturyEarned).length,
      giftsReceived: rotationRallies.filter(isGiftReceived).length,
      giftsConceded: rotationRallies.filter(isGiftConceded).length,
      breakpoint: formatRatio(
        rotationService.filter((rally) => rally.winner === 'century').length,
        rotationService.length,
      ),
      sideout: formatRatio(
        rotationReceive.filter((rally) => rally.winner === 'century').length,
        rotationReceive.length,
      ),
    };
  });

  const playerSummaries = players.map((player) => {
    const credited = activeRallies.filter((rally) => rally.creditedPlayerId === player.id);
    const charged = activeRallies.filter((rally) => rally.chargedPlayerId === player.id);
    const playerServes = serviceRallies.filter((rally) => rally.serverId === player.id);
    const playerServeErrors = playerServes.filter((rally) => rally.event === 'serve_error').length;
    const playerAces = playerServes.filter((rally) => rally.event === 'century_ace').length;
    const earnedPoints = credited.filter((rally) => rally.event !== 'century_ace').length + playerAces;
    const giftsConceded = charged.length + playerServeErrors;
    const earnedRallies = [
      ...credited.filter((rally) => rally.event === 'century_kill' || rally.event === 'century_block'),
      ...playerServes.filter((rally) => rally.event === 'century_ace'),
    ];
    const giftRallies = [...charged, ...playerServes.filter((rally) => rally.event === 'serve_error')];

    return {
      playerId: player.id,
      earnedPoints,
      giftsConceded,
      balance: earnedPoints - giftsConceded,
      earnedByType: countBreakdown(earnedRallies, ['century_ace', 'century_kill', 'century_block']),
      giftsConcededByType: countBreakdown(giftRallies, [
        'receive_error',
        'serve_error',
        'attack_error',
        'ball_control_error',
        'violation',
      ]),
      serveAttempts: playerServes.length,
      servesIn: playerServes.length - playerServeErrors,
      serveIn: formatRatio(playerServes.length - playerServeErrors, playerServes.length),
      aces: playerAces,
      ace: formatRatio(playerAces, playerServes.length),
      breakpoint: formatRatio(
        playerServes.filter((rally) => rally.winner === 'century').length,
        playerServes.length,
      ),
    };
  });

  return { team, rotations: rotationSummaries, players: playerSummaries };
};

export const summarizeMatchReport = (match: PrototypeMatchInput, players: PrototypePlayer[]): PrototypeMatchReport => {
  const setReports = match.sets.map((set) => {
    const finalState = deriveSetState(set.setup, set.rallies);
    const activeRallies = set.rallies.filter((rally) => rally.active);

    return {
      id: set.id,
      setNumber: set.setNumber,
      centuryScore: finalState.centuryScore,
      opponentScore: finalState.opponentScore,
      ralliesTracked: activeRallies.length,
      summary: summarizeSet(set.rallies, players),
    };
  });
  const activeRallies = match.sets.flatMap((set) => set.rallies.filter((rally) => rally.active));

  return {
    id: match.id,
    opponent: match.opponent,
    date: match.date,
    result: match.result ?? 'Open',
    centurySetsWon: setReports.filter((set) => set.centuryScore > set.opponentScore).length,
    opponentSetsWon: setReports.filter((set) => set.opponentScore > set.centuryScore).length,
    ralliesTracked: activeRallies.length,
    summary: summarizeSet(activeRallies, players),
    setReports,
  };
};

export const summarizeSeasonReport = (matches: PrototypeMatchInput[], players: PrototypePlayer[]): PrototypeSeasonReport => {
  const matchReports = matches.map((match) => summarizeMatchReport(match, players));
  const activeRallies = matches.flatMap((match) => match.sets.flatMap((set) => set.rallies.filter((rally) => rally.active)));

  return {
    matchesPlayed: matches.length,
    wins: matchReports.filter((match) => match.result === 'Win').length,
    losses: matchReports.filter((match) => match.result === 'Loss').length,
    openMatches: matchReports.filter((match) => match.result === 'Open').length,
    ralliesTracked: activeRallies.length,
    summary: summarizeSet(activeRallies, players),
    matchReports,
  };
};

export const eventLabels: Record<TerminalEvent, string> = {
  century_ace: 'ACE',
  century_kill: 'KILL',
  century_block: 'BLOCK',
  opponent_error: 'THEIR ERROR',
  opponent_kill: 'KILL',
  opponent_block: 'BLOCK',
  receive_error: 'ACE / RECEIVE ERROR',
  serve_error: 'SERVE ERROR',
  attack_error: 'ATTACK ERROR',
  ball_control_error: 'BALL-CONTROL ERROR',
  violation: 'VIOLATION',
};
