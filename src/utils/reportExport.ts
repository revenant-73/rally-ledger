import type { Match, Player, RallyEvent, Team } from '../types';
import type { ReportStats, SeasonReportStats } from './reportStats';

const csvEscape = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export const toCsv = (headers: string[], rows: unknown[][]) => {
  return [
    headers.map(csvEscape).join(','),
    ...rows.map(row => row.map(csvEscape).join(',')),
  ].join('\r\n');
};

export const downloadTextFile = (filename: string, contents: string, type = 'text/plain;charset=utf-8') => {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const fileSafe = (value: string) => {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'report';
};

const formatReportDate = (date: string) => {
  const [year, month, day] = date.split('T')[0]?.split('-').map(Number) ?? [];
  const parsed = year && month && day ? new Date(year, month - 1, day) : new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString();
};

const average = (values: number[]) => {
  const populated = values.filter(value => Number.isFinite(value));
  if (populated.length === 0) return 0;
  return Number((populated.reduce((total, value) => total + value, 0) / populated.length).toFixed(2));
};

const parseEarnedGifted = (value: string) => {
  const match = value.match(/\+?(-?\d+)\/-?(-?\d+)/);
  return {
    earned: match ? Number(match[1]) : 0,
    gifted: match ? Number(match[2]) : 0,
  };
};

export const buildMatchTextSummary = (match: Match, stats: ReportStats) => {
  const result = match.result ? ` (${match.result})` : '';
  const lines = [
    `Rally Ledger Match Report: vs ${match.opponentName}${result}`,
    `Date: ${formatReportDate(match.matchDate)}`,
    `Location: ${match.location || 'Not listed'}`,
    `Match type: ${match.matchType}`,
    '',
    'Score By Set',
    ...(stats.setReports.length > 0
      ? stats.setReports.map(set => `Set ${set.setNumber}: ${set.score}${set.result ? ` ${set.result}` : ''}`)
      : ['No sets recorded.']),
    '',
    'Coach Takeaway',
    `Top source: ${stats.biggestWeapon}`,
    `Top leak: ${stats.biggestLeak}`,
    `Practice focus: ${stats.focus}`,
    '',
    'Earned / Gifted',
    `Us: +${stats.ourEarned} earned / -${stats.ourGifted} gifted`,
    `Opponent: +${stats.opponentEarned} earned / -${stats.opponentGifted} gifted`,
    '',
    'Serve',
    `Attempts: ${stats.serve.attempts}`,
    `Aces: ${stats.serve.aces}`,
    `Errors: ${stats.serve.errors}`,
    `Serve in: ${stats.serve.servePct}%`,
    `KO: ${stats.serve.koPct}%`,
    '',
    'Receive',
    `Attempts: ${stats.receive.attempts}`,
    `3-pass: ${stats.receive.inSystem}`,
    `2-pass: ${stats.receive.outOfSystem}`,
    `Overpass: ${stats.receive.overpass}`,
    `Errors/Aces allowed: ${stats.receive.errors}`,
    `Pass score: ${stats.receive.score}`,
    '',
    'Attack',
    `Kills: ${stats.attack.kills}`,
    `Attack errors: ${stats.attack.errors}`,
    `Kill/error net: ${stats.attack.net >= 0 ? '+' : ''}${stats.attack.net}`,
    `Kill rate: ${stats.attack.killPct}%`,
    '',
    'Top Servers',
    ...(stats.playerServing.slice(0, 5).map(player => `#${player.jersey} ${player.name}: ${player.koPct}% KO, ${player.servePct}% in (${player.attempts} attempts)`) || []),
    '',
    'Top Passers',
    ...(stats.playerReceiving.slice(0, 5).map(player => `#${player.jersey} ${player.name}: ${player.score} pass score (${player.attempts} attempts)`) || []),
    '',
    'Top Killers',
    ...(stats.playerAttacking.length > 0
      ? stats.playerAttacking.slice(0, 5).map(player => `#${player.jersey} ${player.name}: ${player.kills} kills, ${player.errors} errors (${player.net >= 0 ? '+' : ''}${player.net})`)
      : ['No kills or attack errors tracked.']),
  ];

  return lines.join('\n');
};

export const buildMatchCsvFiles = (
  match: Match,
  stats: ReportStats,
  rallies: RallyEvent[],
  players: Player[]
) => {
  const playerMap = new Map(players.map(player => [player.id, player]));
  const playerLabel = (playerId?: string) => {
    if (!playerId) return '';
    const player = playerMap.get(playerId);
    return player ? `#${player.jerseyNumber} ${player.firstName} ${player.lastName}` : playerId;
  };

  return [
    {
      filename: `${fileSafe(match.opponentName)}-match-summary.csv`,
      contents: toCsv(
        ['Metric', 'Value'],
        [
          ['Opponent', match.opponentName],
          ['Date', match.matchDate],
          ['Location', match.location],
          ['Result', match.result || ''],
          ['Rallies tracked', stats.ralliesTracked],
          ['Our earned', stats.ourEarned],
          ['Our gifted', stats.ourGifted],
          ['Opponent earned', stats.opponentEarned],
          ['Opponent gifted', stats.opponentGifted],
          ['Biggest weapon', stats.biggestWeapon],
          ['Biggest leak', stats.biggestLeak],
          ['Serve attempts', stats.serve.attempts],
          ['Serve in %', stats.serve.servePct],
          ['Serve KO %', stats.serve.koPct],
          ['Pass score', stats.receive.score],
          ['Kills', stats.attack.kills],
          ['Attack errors', stats.attack.errors],
          ['Kill/error net', stats.attack.net],
          ['Kill %', stats.attack.killPct],
          ['Practice focus', stats.focus],
        ]
      ),
    },
    {
      filename: `${fileSafe(match.opponentName)}-serving.csv`,
      contents: toCsv(
        ['Jersey', 'Player', 'Attempts', 'Aces', 'Errors', 'In System', 'Out Of System', 'KO', 'Serve %', 'KO %'],
        stats.playerServing.map(player => [
          player.jersey,
          player.name,
          player.attempts,
          player.aces,
          player.errors,
          player.inSystem,
          player.outOfSystem,
          player.ko,
          player.servePct,
          player.koPct,
        ])
      ),
    },
    {
      filename: `${fileSafe(match.opponentName)}-receiving.csv`,
      contents: toCsv(
        ['Jersey', 'Player', 'Attempts', '3 Pass', '2 Pass', 'Overpass', 'Errors', 'Pass Score'],
        stats.playerReceiving.map(player => [
          player.jersey,
          player.name,
          player.attempts,
          player.inSystem,
          player.outOfSystem,
          player.overpass,
          player.errors,
          player.score,
        ])
      ),
    },
    {
      filename: `${fileSafe(match.opponentName)}-kill-report.csv`,
      contents: toCsv(
        ['Jersey', 'Player', 'Kills', 'Attack Errors', 'Attempts', 'Net', 'Kill %', 'Error %'],
        stats.playerAttacking.map(player => [
          player.jersey,
          player.name,
          player.kills,
          player.errors,
          player.attempts,
          player.net,
          player.killPct,
          player.errorPct,
        ])
      ),
    },
    {
      filename: `${fileSafe(match.opponentName)}-sets.csv`,
      contents: toCsv(
        ['Set', 'Score', 'Result', 'Our Earned', 'Our Gifted', 'Serve %', 'Serve KO %', 'Pass Score'],
        stats.setReports.map(set => [
          set.setNumber,
          set.score,
          set.result || '',
          set.ourEarned,
          set.ourGifted,
          set.servePct,
          set.serveKoPct,
          set.passScore,
        ])
      ),
    },
    {
      filename: `${fileSafe(match.opponentName)}-rally-log.csv`,
      contents: toCsv(
        ['Rally', 'Set ID', 'Before', 'After', 'Winner', 'Serving Team', 'Server', 'Outcome', 'Classification', 'Player', 'Serve Result', 'Receiver', 'Receive Result', 'Notes'],
        rallies.map(rally => [
          rally.rallyNumber,
          rally.setId,
          `${rally.scoreBeforeUs}-${rally.scoreBeforeOpponent}`,
          `${rally.scoreAfterUs}-${rally.scoreAfterOpponent}`,
          rally.pointWinner,
          rally.servingTeam,
          playerLabel(rally.serverPlayerId),
          rally.outcomeType,
          rally.classification,
          playerLabel(rally.playerId),
          rally.serveResult || '',
          playerLabel(rally.receivePlayerId),
          rally.receiveResult || '',
          rally.notes || '',
        ])
      ),
    },
  ];
};

export const buildSeasonTextSummary = (team: Team, stats: SeasonReportStats) => {
  const lines = [
    `Rally Ledger Season Report: ${team.name} (${team.season})`,
    '',
    'Season Snapshot',
    `Matches: ${stats.matchesPlayed}`,
    `Record: ${stats.wins}-${stats.losses}`,
    `Sets: ${stats.setsWon}-${stats.setsLost}`,
    `Rallies tracked: ${stats.ralliesTracked}`,
    `Earned/gifted balance: +${stats.ourEarned} / -${stats.ourGifted}`,
    '',
    'Team Skill Trends',
    `Serve in: ${stats.serve.servePct}%`,
    `Serve KO: ${stats.serve.koPct}%`,
    `Serve attempts: ${stats.serve.attempts}`,
    `Serve errors: ${stats.serve.errors}`,
    `Pass score: ${stats.receive.score}`,
    `Receive attempts: ${stats.receive.attempts}`,
    `Kills: ${stats.attack.kills}`,
    `Attack errors: ${stats.attack.errors}`,
    `Kill/error net: ${stats.attack.net >= 0 ? '+' : ''}${stats.attack.net}`,
    `Top weapon: ${stats.biggestWeapon}`,
    `Top leak: ${stats.biggestLeak}`,
    `Practice focus: ${stats.focus}`,
    '',
    'Top Servers',
    ...(stats.playerServing.length > 0
      ? stats.playerServing.slice(0, 8).map(player => `#${player.jersey} ${player.name}: ${player.koPct}% KO, ${player.servePct}% in (${player.attempts} attempts)`)
      : ['No serving attempts tracked.']),
    '',
    'Top Passers',
    ...(stats.playerReceiving.length > 0
      ? stats.playerReceiving.slice(0, 8).map(player => `#${player.jersey} ${player.name}: ${player.score} pass score (${player.attempts} attempts)`)
      : ['No receiving attempts tracked.']),
    '',
    'Top Killers',
    ...(stats.playerAttacking.length > 0
      ? stats.playerAttacking.slice(0, 8).map(player => `#${player.jersey} ${player.name}: ${player.kills} kills, ${player.errors} errors (${player.net >= 0 ? '+' : ''}${player.net})`)
      : ['No kills or attack errors tracked.']),
    '',
    'Match Trends',
    ...(stats.matchRows.length > 0
      ? stats.matchRows.map(row => `${formatReportDate(row.matchDate)} vs ${row.opponentName}: ${row.result || 'Open'}, ${row.earnedGifted}, ${row.servePct}% serve, ${row.serveKoPct}% KO, ${row.passScore.toFixed(2)} pass, ${row.kills} kills/${row.attackErrors} errors`)
      : ['No matches recorded.']),
  ];

  return lines.join('\n');
};

export const buildSeasonCsvFiles = (team: Team, stats: SeasonReportStats) => {
  const baseName = `${fileSafe(team.name)}-${fileSafe(team.season)}-season`;
  const playerServing = new Map(stats.playerServing.map(player => [player.playerId, player]));
  const playerReceiving = new Map(stats.playerReceiving.map(player => [player.playerId, player]));
  const playerAttacking = new Map(stats.playerAttacking.map(player => [player.playerId, player]));
  const playerIds = Array.from(new Set([...playerServing.keys(), ...playerReceiving.keys(), ...playerAttacking.keys()]));
  const opponentRows = Array.from(
    stats.matchRows.reduce((opponents, row) => {
      const current = opponents.get(row.opponentName) ?? {
        opponentName: row.opponentName,
        matches: 0,
        wins: 0,
        losses: 0,
        rallies: 0,
        earned: 0,
        gifted: 0,
        servePcts: [] as number[],
        serveKoPcts: [] as number[],
        passScores: [] as number[],
      };
      const earnedGifted = parseEarnedGifted(row.earnedGifted);
      current.matches += 1;
      current.wins += row.result === 'Win' ? 1 : 0;
      current.losses += row.result === 'Loss' ? 1 : 0;
      current.rallies += row.ralliesTracked;
      current.earned += earnedGifted.earned;
      current.gifted += earnedGifted.gifted;
      current.servePcts.push(row.servePct);
      current.serveKoPcts.push(row.serveKoPct);
      current.passScores.push(row.passScore);
      opponents.set(row.opponentName, current);
      return opponents;
    }, new Map<string, {
      opponentName: string;
      matches: number;
      wins: number;
      losses: number;
      rallies: number;
      earned: number;
      gifted: number;
      servePcts: number[];
      serveKoPcts: number[];
      passScores: number[];
    }>())
      .values()
  ).sort((a, b) => b.matches - a.matches || a.opponentName.localeCompare(b.opponentName));

  const practiceRows = [
    {
      priority: stats.ourGifted > stats.ourEarned ? 'High' : 'Medium',
      area: 'Earned/Gifted',
      evidence: `Earned ${stats.ourEarned}, gifted ${stats.ourGifted}`,
      recommendation: stats.ourGifted > stats.ourEarned
        ? `Reduce ${stats.biggestLeak.toLowerCase()} before adding more risk.`
        : `Keep using ${stats.biggestWeapon.toLowerCase()} as the primary scoring pressure.`,
    },
    {
      priority: stats.serve.servePct < 85 || stats.serve.errors >= Math.max(3, stats.serve.aces) ? 'High' : 'Medium',
      area: 'Serve',
      evidence: `${stats.serve.servePct}% in, ${stats.serve.koPct}% KO, ${stats.serve.errors} errors`,
      recommendation: stats.serve.servePct < 85
        ? 'Build serve consistency first, then layer in zones and pressure.'
        : 'Maintain serve-in rate while targeting more out-of-system first contacts.',
    },
    {
      priority: stats.receive.attempts > 0 && stats.receive.score < 2 ? 'High' : 'Medium',
      area: 'Serve Receive',
      evidence: `${stats.receive.score.toFixed(2)} pass score on ${stats.receive.attempts} attempts`,
      recommendation: stats.receive.attempts === 0
        ? 'No receive data tracked yet; capture pass quality in upcoming matches.'
        : stats.receive.score < 2
          ? 'Prioritize first-contact reps and out-of-system transition work.'
          : 'Use serve receive as a strength while sharpening high-pressure rotations.',
    },
    {
      priority: 'Medium',
      area: 'Player Development',
      evidence: `${stats.playerServing.length} servers, ${stats.playerReceiving.length} passers, and ${stats.playerAttacking.length} attackers tracked`,
      recommendation: 'Use player totals to assign focused serve, receive, and attacking reps by role.',
    },
  ];

  return [
    {
      filename: `${baseName}-summary.csv`,
      contents: toCsv(
        ['Metric', 'Value'],
        [
          ['Team', team.name],
          ['Season', team.season],
          ['Matches', stats.matchesPlayed],
          ['Wins', stats.wins],
          ['Losses', stats.losses],
          ['Sets won', stats.setsWon],
          ['Sets lost', stats.setsLost],
          ['Rallies tracked', stats.ralliesTracked],
          ['Our earned', stats.ourEarned],
          ['Our gifted', stats.ourGifted],
          ['Opponent earned', stats.opponentEarned],
          ['Opponent gifted', stats.opponentGifted],
          ['Biggest weapon', stats.biggestWeapon],
          ['Biggest leak', stats.biggestLeak],
          ['Serve attempts', stats.serve.attempts],
          ['Serve aces', stats.serve.aces],
          ['Serve errors', stats.serve.errors],
          ['Serve in %', stats.serve.servePct],
          ['Serve KO %', stats.serve.koPct],
          ['Receive attempts', stats.receive.attempts],
          ['Pass score', stats.receive.score],
          ['Kills', stats.attack.kills],
          ['Attack errors', stats.attack.errors],
          ['Kill/error net', stats.attack.net],
          ['Kill %', stats.attack.killPct],
          ['Practice focus', stats.focus],
        ]
      ),
    },
    {
      filename: `${baseName}-match-trends.csv`,
      contents: toCsv(
        ['Date', 'Opponent', 'Result', 'Rallies', 'Earned/Gifted', 'Serve %', 'Serve KO %', 'Pass Score', 'Kills', 'Attack Errors', 'Attack Net'],
        stats.matchRows.map(row => [
          formatReportDate(row.matchDate),
          row.opponentName,
          row.result || '',
          row.ralliesTracked,
          row.earnedGifted,
          row.servePct,
          row.serveKoPct,
          row.passScore,
          row.kills,
          row.attackErrors,
          row.attackNet,
        ])
      ),
    },
    {
      filename: `${baseName}-player-totals.csv`,
      contents: toCsv(
        [
          'Jersey',
          'Player',
          'Serve Attempts',
          'Aces',
          'Serve Errors',
          'Serve OOS',
          'Serve KO',
          'Serve %',
          'KO %',
          'Receive Attempts',
          '3 Pass',
          '2 Pass',
          'Overpass',
          'Receive Errors',
          'Pass Score',
          'Kills',
          'Attack Errors',
          'Kill/Error Net',
          'Kill %',
          'Error %',
        ],
        playerIds.map(playerId => {
          const serving = playerServing.get(playerId);
          const receiving = playerReceiving.get(playerId);
          const attacking = playerAttacking.get(playerId);
          return [
            serving?.jersey ?? receiving?.jersey ?? attacking?.jersey ?? '',
            serving?.name ?? receiving?.name ?? attacking?.name ?? '',
            serving?.attempts ?? 0,
            serving?.aces ?? 0,
            serving?.errors ?? 0,
            serving?.outOfSystem ?? 0,
            serving?.ko ?? 0,
            serving?.servePct ?? 0,
            serving?.koPct ?? 0,
            receiving?.attempts ?? 0,
            receiving?.inSystem ?? 0,
            receiving?.outOfSystem ?? 0,
            receiving?.overpass ?? 0,
            receiving?.errors ?? 0,
            receiving?.score ?? 0,
            attacking?.kills ?? 0,
            attacking?.errors ?? 0,
            attacking?.net ?? 0,
            attacking?.killPct ?? 0,
            attacking?.errorPct ?? 0,
          ];
        })
      ),
    },
    {
      filename: `${baseName}-serving.csv`,
      contents: toCsv(
        ['Jersey', 'Player', 'Attempts', 'Aces', 'Errors', 'In System', 'Out Of System', 'KO', 'Serve %', 'KO %'],
        stats.playerServing.map(player => [
          player.jersey,
          player.name,
          player.attempts,
          player.aces,
          player.errors,
          player.inSystem,
          player.outOfSystem,
          player.ko,
          player.servePct,
          player.koPct,
        ])
      ),
    },
    {
      filename: `${baseName}-receiving.csv`,
      contents: toCsv(
        ['Jersey', 'Player', 'Attempts', '3 Pass', '2 Pass', 'Overpass', 'Errors', 'Pass Score'],
        stats.playerReceiving.map(player => [
          player.jersey,
          player.name,
          player.attempts,
          player.inSystem,
          player.outOfSystem,
          player.overpass,
          player.errors,
          player.score,
        ])
      ),
    },
    {
      filename: `${baseName}-kill-report.csv`,
      contents: toCsv(
        ['Jersey', 'Player', 'Kills', 'Attack Errors', 'Attempts', 'Net', 'Kill %', 'Error %'],
        stats.playerAttacking.map(player => [
          player.jersey,
          player.name,
          player.kills,
          player.errors,
          player.attempts,
          player.net,
          player.killPct,
          player.errorPct,
        ])
      ),
    },
    {
      filename: `${baseName}-opponent-breakdown.csv`,
      contents: toCsv(
        ['Opponent', 'Matches', 'Wins', 'Losses', 'Rallies', 'Earned', 'Gifted', 'Avg Serve %', 'Avg KO %', 'Avg Pass Score'],
        opponentRows.map(row => [
          row.opponentName,
          row.matches,
          row.wins,
          row.losses,
          row.rallies,
          row.earned,
          row.gifted,
          average(row.servePcts),
          average(row.serveKoPcts),
          average(row.passScores),
        ])
      ),
    },
    {
      filename: `${baseName}-practice-plan.csv`,
      contents: toCsv(
        ['Priority', 'Area', 'Evidence', 'Recommendation'],
        practiceRows.map(row => [
          row.priority,
          row.area,
          row.evidence,
          row.recommendation,
        ])
      ),
    },
  ];
};
