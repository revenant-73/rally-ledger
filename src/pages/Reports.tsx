import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Calendar,
  ChevronDown,
  Copy,
  Download,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useMatch } from '../hooks/useMatch';
import type { Match, Player, RallyEvent, Set, Team } from '../types';
import { apiPost } from '../utils/api';
import { normalizeRallies } from '../utils/rallies';
import { calculateSeasonReportStats, type SeasonReportStats } from '../utils/reportStats';
import { buildSeasonCsvFiles, buildSeasonTextSummary, downloadTextFile, fileSafe } from '../utils/reportExport';

type SeasonReportResponse = {
  matches: Match[];
  sets: Set[];
  rallies: RallyEvent[];
  players: Player[];
};

const formatDate = (date: string) => {
  const [year, month, day] = date.split('T')[0]?.split('-').map(Number) ?? [];
  const parsed = year && month && day ? new Date(year, month - 1, day) : new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'No date';
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const pct = (value: number) => `${value}%`;

const scoreTone = (value: number, strong: number, caution: number) => {
  if (value >= strong) return 'text-brand-green';
  if (value >= caution) return 'text-brand-teal';
  return 'text-brand-amber';
};

const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}> = ({ icon, title, message, action }) => (
  <div className="rounded-3xl border border-dashed border-brand-gray/25 bg-brand-gray/5 px-5 py-10 text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gray/10 text-brand-text-secondary">
      {icon}
    </div>
    <h2 className="text-xl font-black">{title}</h2>
    <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-brand-text-secondary">{message}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

const SnapshotCard: React.FC<{
  label: string;
  value: string;
  detail: string;
  tone?: string;
}> = ({ label, value, detail, tone = 'text-brand-text' }) => (
  <div className="rounded-2xl border border-brand-gray/10 bg-brand-gray/5 p-4">
    <p className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">{label}</p>
    <p className={`mt-2 text-2xl font-black tracking-tight ${tone}`}>{value}</p>
    <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-brand-text-secondary">{detail}</p>
  </div>
);

const SkillCard: React.FC<{
  label: string;
  value: string;
  detail: string;
  tone: string;
}> = ({ label, value, detail, tone }) => (
  <div className="rounded-2xl border border-brand-gray/10 bg-brand-bg p-4">
    <p className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">{label}</p>
    <p className={`mt-2 text-2xl font-black ${tone}`}>{value}</p>
    <p className="mt-1 text-xs font-semibold leading-5 text-brand-text-secondary">{detail}</p>
  </div>
);

const Leaderboard: React.FC<{
  title: string;
  icon: React.ReactNode;
  emptyText: string;
  children: React.ReactNode;
}> = ({ title, icon, emptyText, children }) => {
  const hasRows = React.Children.count(children) > 0;

  return (
    <section className="rounded-3xl border border-brand-gray/10 bg-brand-gray/5 p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-teal/10 text-brand-teal">
          {icon}
        </div>
        <h2 className="text-sm font-black uppercase tracking-widest text-brand-text-secondary">{title}</h2>
      </div>
      {hasRows ? (
        <div className="space-y-2">{children}</div>
      ) : (
        <p className="rounded-2xl border border-dashed border-brand-gray/20 bg-brand-bg px-4 py-6 text-center text-sm font-semibold text-brand-text-secondary">
          {emptyText}
        </p>
      )}
    </section>
  );
};

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeTeam, isSyncing, selectTeam, teams } = useMatch();

  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [reportData, setReportData] = useState<SeasonReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveTeamId = useMemo(() => {
    if (teams.length === 0) return '';
    if (teams.some(team => team.id === selectedTeamId)) return selectedTeamId;
    if (activeTeam && teams.some(team => team.id === activeTeam.id)) return activeTeam.id;
    return teams[0].id;
  }, [activeTeam, selectedTeamId, teams]);

  useEffect(() => {
    let cancelled = false;

    const fetchReport = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      if (teams.length === 0) {
        setReportData(null);
        setLoading(false);
        return;
      }

      if (!effectiveTeamId) {
        setLoading(true);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await apiPost<SeasonReportResponse>('/.netlify/functions/matches', {
          action: 'seasonReport',
          userId: user.id,
          teamIds: [effectiveTeamId],
        });

        if (cancelled) return;

        setReportData({
          ...data,
          rallies: normalizeRallies(data.rallies),
        });
      } catch (fetchError) {
        if (cancelled) return;
        console.error('Failed to fetch season report:', fetchError);
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load reports.');
        setReportData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchReport();

    return () => {
      cancelled = true;
    };
  }, [effectiveTeamId, teams.length, user]);

  const selectedTeam = useMemo<Team | undefined>(
    () => teams.find(team => team.id === effectiveTeamId),
    [effectiveTeamId, teams]
  );

  const stats = useMemo<SeasonReportStats | null>(() => {
    if (!reportData) return null;
    return calculateSeasonReportStats(
      reportData.matches,
      reportData.sets,
      reportData.rallies,
      reportData.players
    );
  }, [reportData]);

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    selectTeam(teamId);
  };

  const handleCopySummary = async () => {
    if (!selectedTeam || !stats) return;
    try {
      await navigator.clipboard.writeText(buildSeasonTextSummary(selectedTeam, stats));
      toast.success('Season summary copied');
    } catch {
      toast.error('Unable to copy season report');
    }
  };

  const handleDownloadText = () => {
    if (!selectedTeam || !stats) return;
    downloadTextFile(
      `${fileSafe(selectedTeam.name)}-${fileSafe(selectedTeam.season)}-season-report.txt`,
      buildSeasonTextSummary(selectedTeam, stats)
    );
  };

  const handleDownloadCsv = () => {
    if (!selectedTeam || !stats) return;
    buildSeasonCsvFiles(selectedTeam, stats).forEach(file => {
      downloadTextFile(file.filename, file.contents, 'text/csv;charset=utf-8');
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const hasTeams = teams.length > 0;
  const hasMatches = Boolean(reportData && reportData.matches.length > 0);
  const hasRallies = Boolean(reportData && reportData.rallies.length > 0);
  const earnedGiftedBalance = stats ? stats.ourEarned - stats.ourGifted : 0;

  return (
    <div className="print-report min-h-screen bg-brand-bg px-4 py-6 text-brand-text md:px-8">
      <div className="mx-auto max-w-6xl pb-24">
        <header className="mb-6 flex items-start justify-between gap-3">
          <button
            onClick={() => navigate('/')}
            className="print-hide mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-gray/5 text-brand-text-secondary transition-colors hover:bg-brand-gray/10 hover:text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-teal/60"
            aria-label="Back to home"
          >
            <ArrowLeft size={22} />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-teal">Season Reporting</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Reports</h1>
            <p className="mt-1 truncate text-xs font-bold uppercase tracking-widest text-brand-text-secondary">
              {selectedTeam ? `${selectedTeam.name} · ${selectedTeam.season}` : 'No roster selected'}
            </p>
          </div>

          <div className="print-hide mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-teal/10 text-brand-teal">
            <BarChart3 size={21} />
          </div>
        </header>

        {teams.length > 1 && (
          <label className="print-hide mb-5 block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">Roster</span>
            <div className="relative">
              <select
                value={effectiveTeamId}
                onChange={(event) => handleTeamChange(event.target.value)}
                className="w-full appearance-none rounded-2xl border border-brand-gray/20 bg-brand-gray/5 px-4 py-3 pr-10 text-sm font-black text-brand-text outline-none transition-colors focus:border-brand-teal/60 focus:ring-2 focus:ring-brand-teal/20"
              >
                {teams.map(team => (
                  <option key={team.id} value={team.id} className="bg-brand-bg text-brand-text">
                    {team.name} · {team.season}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-secondary"
              />
            </div>
          </label>
        )}

        {loading || (isSyncing && !reportData) ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-brand-teal" />
          </div>
        ) : error ? (
          <EmptyState
            icon={<AlertTriangle size={30} />}
            title="Report unavailable"
            message={error}
          />
        ) : !hasTeams ? (
          <EmptyState
            icon={<Users size={30} />}
            title="No rosters yet"
            message="Create a roster before season reports can show team and player trends."
            action={
              <button
                onClick={() => navigate('/roster')}
                className="rounded-2xl bg-brand-teal px-5 py-3 text-sm font-black text-brand-bg transition-transform active:scale-95"
              >
                Add roster
              </button>
            }
          />
        ) : !hasMatches ? (
          <EmptyState
            icon={<Trophy size={30} />}
            title="No matches recorded"
            message="Season reports will populate after this roster has at least one match."
            action={
              <button
                onClick={() => navigate('/match/new')}
                className="rounded-2xl bg-brand-teal px-5 py-3 text-sm font-black text-brand-bg transition-transform active:scale-95"
              >
                Start match
              </button>
            }
          />
        ) : !hasRallies || !stats ? (
          <EmptyState
            icon={<Target size={30} />}
            title="No rallies tracked"
            message="Matches exist for this roster, but cumulative skill cards and leaderboards need rally-level data."
          />
        ) : (
          <div className="space-y-6">
            <section className="print-hide grid grid-cols-4 gap-2">
              <button
                onClick={handleCopySummary}
                className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-brand-gray/10 bg-brand-gray/5 px-3 py-4 text-xs font-black uppercase tracking-tight text-brand-text-secondary transition-colors hover:border-brand-teal/40 hover:text-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
              >
                <Copy size={18} />
                Copy
              </button>
              <button
                onClick={handleDownloadText}
                className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-brand-gray/10 bg-brand-gray/5 px-3 py-4 text-xs font-black uppercase tracking-tight text-brand-text-secondary transition-colors hover:border-brand-teal/40 hover:text-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
              >
                <Download size={18} />
                Text
              </button>
              <button
                onClick={handleDownloadCsv}
                className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-brand-gray/10 bg-brand-gray/5 px-3 py-4 text-xs font-black uppercase tracking-tight text-brand-text-secondary transition-colors hover:border-brand-teal/40 hover:text-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
              >
                <FileSpreadsheet size={18} />
                CSVs
              </button>
              <button
                onClick={handlePrint}
                className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-brand-gray/10 bg-brand-gray/5 px-3 py-4 text-xs font-black uppercase tracking-tight text-brand-text-secondary transition-colors hover:border-brand-teal/40 hover:text-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
              >
                <Printer size={18} />
                Print
              </button>
            </section>

            <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <SnapshotCard label="Matches" value={String(stats.matchesPlayed)} detail={`${stats.wins}-${stats.losses} record`} />
              <SnapshotCard label="Sets" value={`${stats.setsWon}-${stats.setsLost}`} detail="won-lost" />
              <SnapshotCard label="Rallies" value={String(stats.ralliesTracked)} detail="tracked points" />
              <SnapshotCard
                label="Earned"
                value={`+${stats.ourEarned}`}
                detail="our pressure"
                tone="text-brand-green"
              />
              <SnapshotCard
                label="Balance"
                value={`${earnedGiftedBalance >= 0 ? '+' : ''}${earnedGiftedBalance}`}
                detail={`+${stats.ourEarned} / -${stats.ourGifted}`}
                tone={earnedGiftedBalance >= 0 ? 'text-brand-teal' : 'text-brand-red'}
              />
            </section>

            <section className="rounded-3xl border border-brand-teal/15 bg-brand-teal/5 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-teal">Team Trend</p>
                  <h2 className="mt-1 text-xl font-black">Skill Snapshot</h2>
                </div>
                <ShieldCheck size={24} className="text-brand-teal" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <SkillCard
                  label="Serve In"
                  value={pct(stats.serve.servePct)}
                  detail={`${stats.serve.attempts - stats.serve.errors}/${stats.serve.attempts} in play`}
                  tone={scoreTone(stats.serve.servePct, 90, 82)}
                />
                <SkillCard
                  label="Serve KO"
                  value={pct(stats.serve.koPct)}
                  detail={`${stats.serve.aces + stats.serve.outOfSystem} pressure serves`}
                  tone={scoreTone(stats.serve.koPct, 35, 22)}
                />
                <SkillCard
                  label="Pass Score"
                  value={stats.receive.score.toFixed(2)}
                  detail={`${stats.receive.attempts} receive attempts`}
                  tone={scoreTone(stats.receive.score, 2.3, 1.9)}
                />
                <SkillCard
                  label="Weapon"
                  value={stats.biggestWeapon}
                  detail="top earned source"
                  tone="text-brand-green"
                />
                <SkillCard
                  label="Leak"
                  value={stats.biggestLeak}
                  detail="top gifted source"
                  tone="text-brand-red"
                />
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <Leaderboard title="Serving Leaders" icon={<Zap size={18} />} emptyText="No serving attempts tracked.">
                {stats.playerServing.slice(0, 6).map(player => (
                  <div
                    key={player.playerId}
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-2xl border border-brand-gray/10 bg-brand-bg px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">#{player.jersey} {player.name}</p>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-brand-text-secondary">
                        {player.aces} aces · {player.errors} errors
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-brand-teal">{pct(player.koPct)}</p>
                      <p className="text-[10px] font-bold uppercase text-brand-text-secondary">KO</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-brand-green">{pct(player.servePct)}</p>
                      <p className="text-[10px] font-bold uppercase text-brand-text-secondary">In</p>
                    </div>
                  </div>
                ))}
              </Leaderboard>

              <Leaderboard title="Receiving Leaders" icon={<Target size={18} />} emptyText="No receiving attempts tracked.">
                {stats.playerReceiving.slice(0, 6).map(player => (
                  <div
                    key={player.playerId}
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-2xl border border-brand-gray/10 bg-brand-bg px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">#{player.jersey} {player.name}</p>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-brand-text-secondary">
                        {player.inSystem} 3s · {player.errors} errors
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${scoreTone(player.score, 2.3, 1.9)}`}>{player.score.toFixed(2)}</p>
                      <p className="text-[10px] font-bold uppercase text-brand-text-secondary">Avg</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-brand-text">{player.attempts}</p>
                      <p className="text-[10px] font-bold uppercase text-brand-text-secondary">Att</p>
                    </div>
                  </div>
                ))}
              </Leaderboard>
            </div>

            <section className="rounded-3xl border border-brand-gray/10 bg-brand-gray/5 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-amber/10 text-brand-amber">
                  <Calendar size={18} />
                </div>
                <h2 className="text-sm font-black uppercase tracking-widest text-brand-text-secondary">Match Trends</h2>
              </div>

              <div className="space-y-3 md:hidden">
                {stats.matchRows.map(row => (
                  <div key={row.matchId} className="rounded-2xl border border-brand-gray/10 bg-brand-bg p-4">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">vs {row.opponentName}</p>
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-brand-text-secondary">{formatDate(row.matchDate)}</p>
                      </div>
                      <span className={`text-sm font-black ${row.result === 'Win' ? 'text-brand-green' : row.result === 'Loss' ? 'text-brand-red' : 'text-brand-text-secondary'}`}>
                        {row.result ?? 'Open'}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-[9px] font-black uppercase text-brand-text-secondary">E/G</p>
                        <p className="mt-1 text-sm font-black text-brand-teal">{row.earnedGifted}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase text-brand-text-secondary">Serve</p>
                        <p className={`mt-1 text-sm font-black ${scoreTone(row.servePct, 90, 82)}`}>{pct(row.servePct)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase text-brand-text-secondary">KO</p>
                        <p className={`mt-1 text-sm font-black ${scoreTone(row.serveKoPct, 35, 22)}`}>{pct(row.serveKoPct)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase text-brand-text-secondary">Pass</p>
                        <p className={`mt-1 text-sm font-black ${scoreTone(row.passScore, 2.3, 1.9)}`}>{row.passScore.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-separate border-spacing-y-2 text-left">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">
                      <th className="px-3 py-2">Opponent</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Result</th>
                      <th className="px-3 py-2">Earn/Gift</th>
                      <th className="px-3 py-2">Serve</th>
                      <th className="px-3 py-2">KO</th>
                      <th className="px-3 py-2">Pass</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.matchRows.map(row => (
                      <tr key={row.matchId} className="bg-brand-bg text-sm font-bold">
                        <td className="rounded-l-2xl px-3 py-3">vs {row.opponentName}</td>
                        <td className="px-3 py-3 text-brand-text-secondary">{formatDate(row.matchDate)}</td>
                        <td className={`px-3 py-3 font-black ${row.result === 'Win' ? 'text-brand-green' : row.result === 'Loss' ? 'text-brand-red' : 'text-brand-text-secondary'}`}>
                          {row.result ?? 'Open'}
                        </td>
                        <td className="px-3 py-3 text-brand-teal">{row.earnedGifted}</td>
                        <td className={`px-3 py-3 ${scoreTone(row.servePct, 90, 82)}`}>{pct(row.servePct)}</td>
                        <td className={`px-3 py-3 ${scoreTone(row.serveKoPct, 35, 22)}`}>{pct(row.serveKoPct)}</td>
                        <td className={`rounded-r-2xl px-3 py-3 ${scoreTone(row.passScore, 2.3, 1.9)}`}>{row.passScore.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
