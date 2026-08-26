import type { Match, Player, RallyEvent, Set as MatchSet } from '../types';
import { getReceiveResult, getServeResult } from './rallyResults';

export interface PlayerServeReport {
  playerId: string;
  name: string;
  jersey: string;
  attempts: number;
  aces: number;
  errors: number;
  inSystem: number;
  outOfSystem: number;
  ko: number;
  servePct: number;
  koPct: number;
}

export interface PlayerReceiveReport {
  playerId: string;
  name: string;
  jersey: string;
  attempts: number;
  errors: number;
  overpass: number;
  inSystem: number;
  outOfSystem: number;
  score: number;
}

export interface PlayerAttackReport {
  playerId: string;
  name: string;
  jersey: string;
  kills: number;
  errors: number;
  attempts: number;
  net: number;
  killPct: number;
  errorPct: number;
}

export interface PlayerPointReport {
  playerId: string;
  name: string;
  jersey: string;
  earned: number;
  gifted: number;
  net: number;
  total: number;
}

export interface SetReport {
  setId: string;
  setNumber: number;
  score: string;
  result?: 'Win' | 'Loss';
  ourEarned: number;
  ourGifted: number;
  opponentEarned: number;
  opponentGifted: number;
  servePct: number;
  serveKoPct: number;
  passScore: number;
}

export interface ReportStats {
  ralliesTracked: number;
  ourEarned: number;
  ourGifted: number;
  opponentEarned: number;
  opponentGifted: number;
  biggestWeapon: string;
  biggestLeak: string;
  serve: {
    attempts: number;
    aces: number;
    errors: number;
    inSystem: number;
    outOfSystem: number;
    servePct: number;
    koPct: number;
  };
  receive: {
    attempts: number;
    errors: number;
    overpass: number;
    inSystem: number;
    outOfSystem: number;
    score: number;
  };
  attack: {
    attempts: number;
    kills: number;
    errors: number;
    net: number;
    killPct: number;
    errorPct: number;
  };
  playerServing: PlayerServeReport[];
  playerReceiving: PlayerReceiveReport[];
  playerAttacking: PlayerAttackReport[];
  playerPoints: PlayerPointReport[];
  setReports: SetReport[];
  focus: string;
}

export interface SeasonReportStats extends ReportStats {
  matchesPlayed: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  matchRows: Array<{
    matchId: string;
    opponentName: string;
    matchDate: string;
    result?: 'Win' | 'Loss';
    ralliesTracked: number;
    earnedGifted: string;
    servePct: number;
    serveKoPct: number;
    passScore: number;
    kills: number;
    attackErrors: number;
    attackNet: number;
  }>;
}

const pct = (part: number, total: number) => total > 0 ? Math.round((part / total) * 100) : 0;

const passScore = (stats: { errors: number; overpass: number; outOfSystem: number; inSystem: number; attempts: number }) => {
  if (stats.attempts === 0) return 0;
  return Number(((stats.inSystem * 3 + stats.outOfSystem * 2 + stats.overpass) / stats.attempts).toFixed(2));
};

const playerName = (player: Player) => `${player.firstName} ${player.lastName}`.trim();

const countOutcomes = (rallies: RallyEvent[]) => {
  return rallies.reduce<Record<string, number>>((counts, rally) => {
    counts[rally.outcomeType] = (counts[rally.outcomeType] || 0) + 1;
    return counts;
  }, {});
};

const topOutcome = (rallies: RallyEvent[]) => {
  return Object.entries(countOutcomes(rallies)).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
};

const attributedPlayerId = (rally: RallyEvent) => {
  if (rally.playerId) return rally.playerId;

  const serveResult = getServeResult(rally);
  if (
    rally.servingTeam === 'Us' &&
    (serveResult === 'Ace' || serveResult === 'Error' || rally.outcomeType === 'Ace' || rally.outcomeType === 'Serve Error')
  ) {
    return rally.serverPlayerId;
  }

  const receiveResult = getReceiveResult(rally);
  if (rally.servingTeam === 'Opponent' && receiveResult === 'Error') {
    return rally.receivePlayerId;
  }

  return undefined;
};

const buildFocus = (stats: Pick<ReportStats, 'ourEarned' | 'ourGifted' | 'biggestLeak' | 'biggestWeapon' | 'serve' | 'receive'>) => {
  if (stats.ourGifted > stats.ourEarned) {
    return `Execution leak: gifted points outpaced earned points. Start with ${stats.biggestLeak.toLowerCase()} cleanup.`;
  }
  if (stats.serve.errors >= Math.max(3, stats.serve.aces)) {
    return 'Serving consistency: reduce missed serves before adding more risk.';
  }
  if (stats.receive.attempts > 0 && stats.receive.score < 2) {
    return 'First contact: prioritize serve receive reps and out-of-system transition work.';
  }
  return `Maintain pressure: ${stats.biggestWeapon.toLowerCase()} was the top scoring source while tightening ${stats.biggestLeak.toLowerCase()}.`;
};

export const calculateReportStats = (
  rallies: RallyEvent[],
  players: Player[],
  sets: MatchSet[] = []
): ReportStats => {
  const playerMap = new Map(players.map(player => [player.id, player]));
  const ourServeRallies = rallies.filter(rally => rally.servingTeam === 'Us' && getServeResult(rally));
  const ourReceiveRallies = rallies.filter(rally => rally.servingTeam === 'Opponent' && getReceiveResult(rally));
  const ourKillRallies = rallies.filter(rally => rally.outcomeType === 'Kill' && rally.pointWinner === 'Us' && rally.classification === 'Earned');
  const ourAttackErrorRallies = rallies.filter(rally => rally.outcomeType === 'Attack Error' && rally.pointWinner === 'Opponent' && rally.classification === 'Gifted');

  const serve = {
    attempts: ourServeRallies.length,
    aces: ourServeRallies.filter(rally => getServeResult(rally) === 'Ace').length,
    errors: ourServeRallies.filter(rally => getServeResult(rally) === 'Error').length,
    inSystem: ourServeRallies.filter(rally => getServeResult(rally) === 'In-System').length,
    outOfSystem: ourServeRallies.filter(rally => getServeResult(rally) === 'Out-of-System').length,
    servePct: 0,
    koPct: 0,
  };
  serve.servePct = pct(serve.attempts - serve.errors, serve.attempts);
  serve.koPct = pct(serve.aces + serve.outOfSystem, serve.attempts);

  const receive = {
    attempts: ourReceiveRallies.length,
    errors: ourReceiveRallies.filter(rally => getReceiveResult(rally) === 'Error').length,
    overpass: ourReceiveRallies.filter(rally => getReceiveResult(rally) === 'Overpass').length,
    inSystem: ourReceiveRallies.filter(rally => getReceiveResult(rally) === 'In-System').length,
    outOfSystem: ourReceiveRallies.filter(rally => getReceiveResult(rally) === 'Out-of-System').length,
    score: 0,
  };
  receive.score = passScore(receive);

  const attack = {
    attempts: ourKillRallies.length + ourAttackErrorRallies.length,
    kills: ourKillRallies.length,
    errors: ourAttackErrorRallies.length,
    net: ourKillRallies.length - ourAttackErrorRallies.length,
    killPct: 0,
    errorPct: 0,
  };
  attack.killPct = pct(attack.kills, attack.attempts);
  attack.errorPct = pct(attack.errors, attack.attempts);

  const playerServing = new Map<string, Omit<PlayerServeReport, 'ko' | 'servePct' | 'koPct'>>();
  const playerReceiving = new Map<string, Omit<PlayerReceiveReport, 'score'>>();
  const playerAttacking = new Map<string, Omit<PlayerAttackReport, 'attempts' | 'net' | 'killPct' | 'errorPct'>>();
  const playerPoints = new Map<string, Omit<PlayerPointReport, 'net' | 'total'>>();

  ourServeRallies.forEach((rally) => {
    if (!rally.serverPlayerId) return;
    const player = playerMap.get(rally.serverPlayerId);
    if (!player) return;
    const result = getServeResult(rally);
    const current = playerServing.get(player.id) ?? {
      playerId: player.id,
      name: playerName(player),
      jersey: player.jerseyNumber,
      attempts: 0,
      aces: 0,
      errors: 0,
      inSystem: 0,
      outOfSystem: 0,
    };
    current.attempts += 1;
    if (result === 'Ace') current.aces += 1;
    if (result === 'Error') current.errors += 1;
    if (result === 'In-System') current.inSystem += 1;
    if (result === 'Out-of-System') current.outOfSystem += 1;
    playerServing.set(player.id, current);
  });

  ourReceiveRallies.forEach((rally) => {
    if (!rally.receivePlayerId) return;
    const player = playerMap.get(rally.receivePlayerId);
    if (!player) return;
    const result = getReceiveResult(rally);
    const current = playerReceiving.get(player.id) ?? {
      playerId: player.id,
      name: playerName(player),
      jersey: player.jerseyNumber,
      attempts: 0,
      errors: 0,
      overpass: 0,
      inSystem: 0,
      outOfSystem: 0,
    };
    current.attempts += 1;
    if (result === 'Error') current.errors += 1;
    if (result === 'Overpass') current.overpass += 1;
    if (result === 'In-System') current.inSystem += 1;
    if (result === 'Out-of-System') current.outOfSystem += 1;
    playerReceiving.set(player.id, current);
  });

  ourKillRallies.forEach((rally) => {
    if (!rally.playerId) return;
    const player = playerMap.get(rally.playerId);
    if (!player) return;
    const current = playerAttacking.get(player.id) ?? {
      playerId: player.id,
      name: playerName(player),
      jersey: player.jerseyNumber,
      kills: 0,
      errors: 0,
    };
    current.kills += 1;
    playerAttacking.set(player.id, current);
  });

  ourAttackErrorRallies.forEach((rally) => {
    if (!rally.playerId) return;
    const player = playerMap.get(rally.playerId);
    if (!player) return;
    const current = playerAttacking.get(player.id) ?? {
      playerId: player.id,
      name: playerName(player),
      jersey: player.jerseyNumber,
      kills: 0,
      errors: 0,
    };
    current.errors += 1;
    playerAttacking.set(player.id, current);
  });

  rallies.forEach((rally) => {
    if (rally.classification !== 'Earned' && rally.classification !== 'Gifted') return;
    const playerId = attributedPlayerId(rally);
    if (!playerId) return;
    const player = playerMap.get(playerId);
    if (!player) return;
    const current = playerPoints.get(player.id) ?? {
      playerId: player.id,
      name: playerName(player),
      jersey: player.jerseyNumber,
      earned: 0,
      gifted: 0,
    };

    if (rally.pointWinner === 'Us' && rally.classification === 'Earned') {
      current.earned += 1;
    }
    if (rally.pointWinner === 'Opponent' && rally.classification === 'Gifted') {
      current.gifted += 1;
    }

    if (current.earned > 0 || current.gifted > 0) {
      playerPoints.set(player.id, current);
    }
  });

  const ourEarned = rallies.filter(rally => rally.pointWinner === 'Us' && rally.classification === 'Earned').length;
  const ourGifted = rallies.filter(rally => rally.pointWinner === 'Opponent' && rally.classification === 'Gifted').length;
  const opponentEarned = rallies.filter(rally => rally.pointWinner === 'Opponent' && rally.classification === 'Earned').length;
  const opponentGifted = rallies.filter(rally => rally.pointWinner === 'Us' && rally.classification === 'Gifted').length;
  const biggestWeapon = topOutcome(rallies.filter(rally => rally.pointWinner === 'Us' && rally.classification === 'Earned'));
  const biggestLeak = topOutcome(rallies.filter(rally => rally.pointWinner === 'Opponent' && rally.classification === 'Gifted'));

  const setReports = sets.map((set) => {
    const setRallies = rallies.filter(rally => rally.setId === set.id);
    const setServes = setRallies.filter(rally => rally.servingTeam === 'Us' && getServeResult(rally));
    const setServeErrors = setServes.filter(rally => getServeResult(rally) === 'Error').length;
    const setServeKos = setServes.filter(rally => getServeResult(rally) === 'Ace' || getServeResult(rally) === 'Out-of-System').length;
    const setReceive = setRallies.filter(rally => rally.servingTeam === 'Opponent' && getReceiveResult(rally));
    const setReceiveStats = {
      attempts: setReceive.length,
      errors: setReceive.filter(rally => getReceiveResult(rally) === 'Error').length,
      overpass: setReceive.filter(rally => getReceiveResult(rally) === 'Overpass').length,
      inSystem: setReceive.filter(rally => getReceiveResult(rally) === 'In-System').length,
      outOfSystem: setReceive.filter(rally => getReceiveResult(rally) === 'Out-of-System').length,
    };

    return {
      setId: set.id,
      setNumber: set.setNumber,
      score: `${set.ourScore}-${set.opponentScore}`,
      result: set.finalResult,
      ourEarned: setRallies.filter(rally => rally.pointWinner === 'Us' && rally.classification === 'Earned').length,
      ourGifted: setRallies.filter(rally => rally.pointWinner === 'Opponent' && rally.classification === 'Gifted').length,
      opponentEarned: setRallies.filter(rally => rally.pointWinner === 'Opponent' && rally.classification === 'Earned').length,
      opponentGifted: setRallies.filter(rally => rally.pointWinner === 'Us' && rally.classification === 'Gifted').length,
      servePct: pct(setServes.length - setServeErrors, setServes.length),
      serveKoPct: pct(setServeKos, setServes.length),
      passScore: passScore(setReceiveStats),
    };
  });

  const baseStats = {
    ralliesTracked: rallies.length,
    ourEarned,
    ourGifted,
    opponentEarned,
    opponentGifted,
    biggestWeapon,
    biggestLeak,
    serve,
    receive,
    attack,
    playerServing: Array.from(playerServing.values())
      .map(stats => ({
        ...stats,
        ko: stats.aces + stats.outOfSystem,
        servePct: pct(stats.attempts - stats.errors, stats.attempts),
        koPct: pct(stats.aces + stats.outOfSystem, stats.attempts),
      }))
      .sort((a, b) => b.koPct - a.koPct || b.servePct - a.servePct || b.attempts - a.attempts),
    playerReceiving: Array.from(playerReceiving.values())
      .map(stats => ({ ...stats, score: passScore(stats) }))
      .sort((a, b) => b.score - a.score || b.attempts - a.attempts),
    playerAttacking: Array.from(playerAttacking.values())
      .map(stats => {
        const attempts = stats.kills + stats.errors;
        return {
          ...stats,
          attempts,
          net: stats.kills - stats.errors,
          killPct: pct(stats.kills, attempts),
          errorPct: pct(stats.errors, attempts),
        };
      })
      .sort((a, b) => b.net - a.net || b.kills - a.kills || a.errors - b.errors || b.attempts - a.attempts),
    playerPoints: Array.from(playerPoints.values())
      .map(stats => ({
        ...stats,
        net: stats.earned - stats.gifted,
        total: stats.earned + stats.gifted,
      }))
      .sort((a, b) => b.net - a.net || b.earned - a.earned || a.gifted - b.gifted || b.total - a.total),
    setReports,
  };

  return {
    ...baseStats,
    focus: buildFocus(baseStats),
  };
};

export const calculateSeasonReportStats = (
  matches: Match[],
  sets: MatchSet[],
  rallies: RallyEvent[],
  players: Player[]
): SeasonReportStats => {
  const base = calculateReportStats(rallies, players, sets);
  const setsWon = sets.filter(set => set.finalResult === 'Win').length;
  const setsLost = sets.filter(set => set.finalResult === 'Loss').length;

  return {
    ...base,
    matchesPlayed: matches.length,
    wins: matches.filter(match => match.result === 'Win').length,
    losses: matches.filter(match => match.result === 'Loss').length,
    setsWon,
    setsLost,
    matchRows: matches.map((match) => {
      const matchSets = sets.filter(set => set.matchId === match.id);
      const matchRallies = rallies.filter(rally => rally.matchId === match.id);
      const matchStats = calculateReportStats(matchRallies, players, matchSets);
      return {
        matchId: match.id,
        opponentName: match.opponentName,
        matchDate: match.matchDate,
        result: match.result,
        ralliesTracked: matchRallies.length,
        earnedGifted: `+${matchStats.ourEarned}/-${matchStats.ourGifted}`,
        servePct: matchStats.serve.servePct,
        serveKoPct: matchStats.serve.koPct,
        passScore: matchStats.receive.score,
        kills: matchStats.attack.kills,
        attackErrors: matchStats.attack.errors,
        attackNet: matchStats.attack.net,
      };
    }),
  };
};
