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
    'Top Servers',
    ...(stats.playerServing.slice(0, 5).map(player => `#${player.jersey} ${player.name}: ${player.koPct}% KO, ${player.servePct}% in (${player.attempts} attempts)`) || []),
    '',
    'Top Passers',
    ...(stats.playerReceiving.slice(0, 5).map(player => `#${player.jersey} ${player.name}: ${player.score} pass score (${player.attempts} attempts)`) || []),
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
          ['Practice focus', stats.focus],
        ]
      ),
    },
    {
      filename: `${fileSafe(match.opponentName)}-serving.csv`,
      contents: toCsv(
        ['Jersey', 'Player', 'Attempts', 'Aces', 'Errors', 'In System', 'Out Of System', 'Serve %', 'KO %'],
        stats.playerServing.map(player => [
          player.jersey,
          player.name,
          player.attempts,
          player.aces,
          player.errors,
          player.inSystem,
          player.outOfSystem,
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
    'Match Trends',
    ...(stats.matchRows.length > 0
      ? stats.matchRows.map(row => `${formatReportDate(row.matchDate)} vs ${row.opponentName}: ${row.result || 'Open'}, ${row.earnedGifted}, ${row.servePct}% serve, ${row.serveKoPct}% KO, ${row.passScore.toFixed(2)} pass`)
      : ['No matches recorded.']),
  ];

  return lines.join('\n');
};

export const buildSeasonCsvFiles = (team: Team, stats: SeasonReportStats) => {
  const baseName = `${fileSafe(team.name)}-${fileSafe(team.season)}-season`;

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
          ['Practice focus', stats.focus],
        ]
      ),
    },
    {
      filename: `${baseName}-match-trends.csv`,
      contents: toCsv(
        ['Date', 'Opponent', 'Result', 'Rallies', 'Earned/Gifted', 'Serve %', 'Serve KO %', 'Pass Score'],
        stats.matchRows.map(row => [
          formatReportDate(row.matchDate),
          row.opponentName,
          row.result || '',
          row.ralliesTracked,
          row.earnedGifted,
          row.servePct,
          row.serveKoPct,
          row.passScore,
        ])
      ),
    },
    {
      filename: `${baseName}-serving.csv`,
      contents: toCsv(
        ['Jersey', 'Player', 'Attempts', 'Aces', 'Errors', 'In System', 'Out Of System', 'Serve %', 'KO %'],
        stats.playerServing.map(player => [
          player.jersey,
          player.name,
          player.attempts,
          player.aces,
          player.errors,
          player.inSystem,
          player.outOfSystem,
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
  ];
};
