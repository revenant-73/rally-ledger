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
  ListFilter,
  Printer,
  RotateCcw,
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
import GiftContextCard from '../components/reports/GiftContextCard';
import { ReportViewNav, ReportViewSection, type ReportViewOption } from '../components/reports/ReportViewNav';

type SeasonReportResponse = {
  matches: Match[];
  sets: Set[];
  rallies: RallyEvent[];
  players: Player[];
};

type PointEarnerSort = 'earned' | 'net';
type SeasonReportView = 'overview' | 'skills' | 'players' | 'trends' | 'gifts' | 'plan';
type MatchTrendRow = SeasonReportStats['matchRows'][number];
type TrendSeries = {
  label: string;
  color: string;
  values: number[];
  format: (value: number) => string;
};
type PracticePriority = {
  label: string;
  title: string;
  detail: string;
  metric: string;
  tone: string;
};

const formatDate = (date: string) => {
  const [year, month, day] = date.split('T')[0]?.split('-').map(Number) ?? [];
  const parsed = year && month && day ? new Date(year, month - 1, day) : new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'No date';
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const pct = (value: number) => `${value}%`;

const dateKey = (date: string) => date.split('T')[0] ?? date;

const parseEarnedGifted = (value: string) => {
  const match = value.match(/\+?(-?\d+)\/-?(\d+)/);
  return {
    earned: match ? Number(match[1]) : 0,
    gifted: match ? Number(match[2]) : 0,
  };
};

const chartWidth = (matchCount: number) => matchCount <= 4 ? '100%' : `${matchCount * 76}px`;

const linePoints = (values: number[], min: number, max: number, width: number, height: number, padding = 18) => {
  const range = Math.max(max - min, 1);
  return values
    .map((value, index) => {
      const x = values.length === 1
        ? width / 2
        : padding + (index / (values.length - 1)) * (width - padding * 2);
      const y = padding + ((max - value) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');
};

const playerName = (player: Player) => `${player.firstName} ${player.lastName}`.trim();

const jerseySort = (a: { jersey: string }, b: { jersey: string }) => {
  const aNumber = Number(a.jersey);
  const bNumber = Number(b.jersey);
  if (Number.isFinite(aNumber) && Number.isFinite(bNumber) && aNumber !== bNumber) {
    return aNumber - bNumber;
  }
  return a.jersey.localeCompare(b.jersey);
};

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

const TrendLegend: React.FC<{ label: string; colorClass: string }> = ({ label, colorClass }) => (
  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-brand-text-secondary">
    <span className={`h-2 w-2 rounded-full ${colorClass}`} />
    {label}
  </span>
);

const TrendLineChart: React.FC<{
  rows: MatchTrendRow[];
  series: TrendSeries[];
  min?: number;
  max?: number;
}> = ({ rows, series, min, max }) => {
  const width = 640;
  const height = 172;
  const allValues = series.flatMap(item => item.values);
  const chartMin = min ?? Math.min(0, ...allValues);
  const chartMax = max ?? Math.max(1, ...allValues);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full" style={{ width: chartWidth(rows.length) }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-44 w-full"
          role="img"
          aria-label={`${series.map(item => item.label).join(' and ')} by match`}
          preserveAspectRatio="none"
        >
          {[0, 1, 2, 3].map(line => {
            const y = 18 + line * ((height - 36) / 3);
            return <line key={line} x1="18" x2={width - 18} y1={y} y2={y} stroke="currentColor" className="text-brand-gray/10" />;
          })}
          {series.map(item => (
            <g key={item.label}>
              <polyline
                points={linePoints(item.values, chartMin, chartMax, width, height)}
                fill="none"
                stroke={item.color}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {item.values.map((value, index) => {
                const point = linePoints([value], chartMin, chartMax, width, height).split(',').map(Number);
                const x = rows.length === 1 ? width / 2 : 18 + (index / (rows.length - 1)) * (width - 36);
                const y = point[1];
                return (
                  <g key={`${item.label}-${rows[index]?.matchId}`}>
                    <circle cx={x} cy={y} r="5" fill={item.color} />
                    {rows.length <= 5 && (
                      <text x={x} y={Math.max(12, y - 9)} textAnchor="middle" className="fill-brand-text text-[11px] font-black">
                        {item.format(value)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(64px, 1fr))` }}>
          {rows.map(row => (
            <div key={row.matchId} className="min-w-0 border-t border-brand-gray/10 pt-2">
              <p className="truncate text-[10px] font-black uppercase tracking-wide text-brand-text">vs {row.opponentName}</p>
              <p className="text-[10px] font-bold uppercase text-brand-text-secondary">{formatDate(row.matchDate)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const EarnedGiftedBars: React.FC<{ rows: MatchTrendRow[] }> = ({ rows }) => {
  const values = rows.map(row => parseEarnedGifted(row.earnedGifted));
  const maxValue = Math.max(1, ...values.flatMap(row => [row.earned, row.gifted]));

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(64px, 1fr))` }}>
      {rows.map((row, index) => {
        const value = values[index];
        const earnedHeight = Math.max(8, (value.earned / maxValue) * 112);
        const giftedHeight = Math.max(8, (value.gifted / maxValue) * 112);
        return (
          <div key={row.matchId} className="min-w-0">
            <div className="flex h-32 items-end justify-center gap-1.5 rounded-2xl border border-brand-gray/10 bg-brand-bg/60 px-2 py-3">
              <div className="w-5 rounded-t-lg bg-brand-green/90" style={{ height: `${earnedHeight}px` }} title={`Earned ${value.earned}`} />
              <div className="w-5 rounded-t-lg bg-brand-red/90" style={{ height: `${giftedHeight}px` }} title={`Gifted ${value.gifted}`} />
            </div>
            <p className="mt-2 truncate text-[10px] font-black uppercase tracking-wide text-brand-text">vs {row.opponentName}</p>
            <p className="text-[10px] font-bold uppercase text-brand-text-secondary">{value.earned}/{value.gifted}</p>
          </div>
        );
      })}
    </div>
  );
};

const AttackNetBars: React.FC<{ rows: MatchTrendRow[] }> = ({ rows }) => {
  const maxAbs = Math.max(1, ...rows.map(row => Math.abs(row.attackNet)));

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(64px, 1fr))` }}>
      {rows.map(row => {
        const isPositive = row.attackNet > 0;
        const isNegative = row.attackNet < 0;
        const height = Math.max(row.attackNet === 0 ? 4 : 8, (Math.abs(row.attackNet) / maxAbs) * 54);
        const barTone = isPositive ? 'bg-brand-green/90' : isNegative ? 'bg-brand-red/90' : 'bg-brand-gray/70';
        const textTone = isPositive ? 'text-brand-green' : isNegative ? 'text-brand-red' : 'text-brand-text-secondary';
        return (
          <div key={row.matchId} className="min-w-0">
            <div className="relative h-32 rounded-2xl border border-brand-gray/10 bg-brand-bg/60 px-2 py-3">
              <div className="absolute left-2 right-2 top-1/2 h-px bg-brand-gray/20" />
              <div className="absolute left-1/2 top-1/2 flex w-9 -translate-x-1/2 flex-col items-center">
                {isPositive ? (
                  <div className={`w-8 -translate-y-full rounded-t-lg ${barTone}`} style={{ height: `${height}px` }} />
                ) : (
                  <div className={`w-8 rounded-b-lg ${barTone}`} style={{ height: `${height}px` }} />
                )}
              </div>
            </div>
            <p className="mt-2 truncate text-[10px] font-black uppercase tracking-wide text-brand-text">vs {row.opponentName}</p>
            <p className={`text-[10px] font-bold uppercase ${textTone}`}>
              {isPositive ? '+' : ''}{row.attackNet} net
            </p>
          </div>
        );
      })}
    </div>
  );
};

const SeasonTrendCharts: React.FC<{ rows: MatchTrendRow[] }> = ({ rows }) => (
  <section className="rounded-3xl border border-brand-gray/10 bg-brand-gray/5 p-4 sm:p-5">
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-teal/10 text-brand-teal">
          <BarChart3 size={18} />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-brand-text-secondary">Season Trend Charts</h2>
          <p className="mt-1 text-xs font-bold text-brand-text-secondary">
            {rows.length === 1 ? 'Single-match baseline for the current filters.' : `${rows.length} matches from the current filters.`}
          </p>
        </div>
      </div>
    </div>

    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <div className="rounded-2xl border border-brand-gray/10 bg-brand-bg p-3 sm:p-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">Point Swing</p>
            <h3 className="mt-1 text-lg font-black">Earned vs Gifted</h3>
          </div>
          <div className="flex gap-3">
            <TrendLegend label="Earned" colorClass="bg-brand-green" />
            <TrendLegend label="Gifted" colorClass="bg-brand-red" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-full" style={{ width: chartWidth(rows.length) }}>
            <EarnedGiftedBars rows={rows} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-gray/10 bg-brand-bg p-3 sm:p-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">Serve Pressure</p>
            <h3 className="mt-1 text-lg font-black">In Play and KO</h3>
          </div>
          <div className="flex gap-3">
            <TrendLegend label="In%" colorClass="bg-brand-green" />
            <TrendLegend label="KO%" colorClass="bg-brand-teal" />
          </div>
        </div>
        <TrendLineChart
          rows={rows}
          min={0}
          max={100}
          series={[
            { label: 'Serve in percentage', color: '#22c55e', values: rows.map(row => row.servePct), format: pct },
            { label: 'Serve KO percentage', color: '#14b8a6', values: rows.map(row => row.serveKoPct), format: pct },
          ]}
        />
      </div>

      <div className="rounded-2xl border border-brand-gray/10 bg-brand-bg p-3 sm:p-4 lg:col-span-2 xl:col-span-1">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">First Ball and Finish</p>
            <h3 className="mt-1 text-lg font-black">Pass Score / Kill Net</h3>
          </div>
          <TrendLegend label="Pass" colorClass="bg-brand-amber" />
        </div>
        <TrendLineChart
          rows={rows}
          min={0}
          max={3}
          series={[
            { label: 'Pass score', color: '#f59e0b', values: rows.map(row => row.passScore), format: value => value.toFixed(2) },
          ]}
        />
        <div className="mt-4 border-t border-brand-gray/10 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">Kill/Error Net</p>
            <div className="flex gap-3">
              <TrendLegend label="Positive" colorClass="bg-brand-green" />
              <TrendLegend label="Negative" colorClass="bg-brand-red" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-full" style={{ width: chartWidth(rows.length) }}>
              <AttackNetBars rows={rows} />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const PrintReportHeader: React.FC<{
  title: string;
  subtitle: string;
  details: string[];
}> = ({ title, subtitle, details }) => (
  <div className="print-only print-report-header hidden">
    <div>
      <p className="print-report-kicker">{subtitle}</p>
      <h1 className="print-report-title">{title}</h1>
    </div>
    <div className="print-report-meta">
      {details.map(detail => (
        <p key={detail}>{detail}</p>
      ))}
    </div>
  </div>
);

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeTeam, isSyncing, selectTeam, teams } = useMatch();

  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [reportData, setReportData] = useState<SeasonReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [matchTypeFilter, setMatchTypeFilter] = useState('all');
  const [opponentFilter, setOpponentFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showAllServing, setShowAllServing] = useState(false);
  const [showAllReceiving, setShowAllReceiving] = useState(false);
  const [showAllAttacking, setShowAllAttacking] = useState(false);
  const [pointEarnerSort, setPointEarnerSort] = useState<PointEarnerSort>('earned');
  const [activeReportView, setActiveReportView] = useState<SeasonReportView>('overview');

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

  const matchTypeOptions = useMemo(() => {
    if (!reportData) return [];
    return Array.from(new Set(reportData.matches.map(match => match.matchType).filter(Boolean))).sort();
  }, [reportData]);

  const opponentOptions = useMemo(() => {
    if (!reportData) return [];
    return Array.from(new Set(reportData.matches.map(match => match.opponentName).filter(Boolean))).sort();
  }, [reportData]);

  const filteredReportData = useMemo<SeasonReportResponse | null>(() => {
    if (!reportData) return null;

    const filteredMatches = reportData.matches.filter((match) => {
      const matchDate = dateKey(match.matchDate);
      if (startDate && matchDate < startDate) return false;
      if (endDate && matchDate > endDate) return false;
      if (matchTypeFilter !== 'all' && match.matchType !== matchTypeFilter) return false;
      if (opponentFilter !== 'all' && match.opponentName !== opponentFilter) return false;
      if (resultFilter === 'Open' && match.result) return false;
      if (resultFilter !== 'all' && resultFilter !== 'Open' && match.result !== resultFilter) return false;
      return true;
    });

    const matchIds = new Set(filteredMatches.map(match => match.id));

    return {
      matches: filteredMatches,
      sets: reportData.sets.filter(set => matchIds.has(set.matchId)),
      rallies: reportData.rallies.filter(rally => matchIds.has(rally.matchId)),
      players: reportData.players,
    };
  }, [endDate, matchTypeFilter, opponentFilter, reportData, resultFilter, startDate]);

  const stats = useMemo<SeasonReportStats | null>(() => {
    if (!filteredReportData) return null;
    return calculateSeasonReportStats(
      filteredReportData.matches,
      filteredReportData.sets,
      filteredReportData.rallies,
      filteredReportData.players
    );
  }, [filteredReportData]);

  const allServingRows = useMemo(() => {
    if (!stats || !filteredReportData) return [];
    const servingByPlayer = new Map(stats.playerServing.map(player => [player.playerId, player]));

    return filteredReportData.players
      .map((player) => {
        const serving = servingByPlayer.get(player.id);
        return {
          playerId: player.id,
          jersey: player.jerseyNumber,
          name: playerName(player),
          attempts: serving?.attempts ?? 0,
          aces: serving?.aces ?? 0,
          errors: serving?.errors ?? 0,
          inSystem: serving?.inSystem ?? 0,
          outOfSystem: serving?.outOfSystem ?? 0,
          ko: serving?.ko ?? 0,
          servePct: serving?.servePct ?? 0,
          koPct: serving?.koPct ?? 0,
        };
      })
      .sort(jerseySort);
  }, [filteredReportData, stats]);

  const allReceivingRows = useMemo(() => {
    if (!stats || !filteredReportData) return [];
    const receivingByPlayer = new Map(stats.playerReceiving.map(player => [player.playerId, player]));

    return filteredReportData.players
      .map((player) => {
        const receiving = receivingByPlayer.get(player.id);
        return {
          playerId: player.id,
          jersey: player.jerseyNumber,
          name: playerName(player),
          attempts: receiving?.attempts ?? 0,
          errors: receiving?.errors ?? 0,
          overpass: receiving?.overpass ?? 0,
          inSystem: receiving?.inSystem ?? 0,
          outOfSystem: receiving?.outOfSystem ?? 0,
          score: receiving?.score ?? 0,
        };
      })
      .sort(jerseySort);
  }, [filteredReportData, stats]);

  const allAttackingRows = useMemo(() => {
    if (!stats || !filteredReportData) return [];
    const attackingByPlayer = new Map(stats.playerAttacking.map(player => [player.playerId, player]));

    return filteredReportData.players
      .map((player) => {
        const attacking = attackingByPlayer.get(player.id);
        return {
          playerId: player.id,
          jersey: player.jerseyNumber,
          name: playerName(player),
          kills: attacking?.kills ?? 0,
          errors: attacking?.errors ?? 0,
          attempts: attacking?.attempts ?? 0,
          net: attacking?.net ?? 0,
          killPct: attacking?.killPct ?? 0,
          errorPct: attacking?.errorPct ?? 0,
        };
      })
      .sort(jerseySort);
  }, [filteredReportData, stats]);

  const topPointEarners = useMemo(() => {
    if (!stats) return [];
    return [...stats.playerPoints]
      .filter(player => player.earned > 0)
      .sort((a, b) => {
        if (pointEarnerSort === 'net') {
          return b.net - a.net || b.earned - a.earned || a.gifted - b.gifted || a.jersey.localeCompare(b.jersey);
        }
        return b.earned - a.earned || b.net - a.net || a.gifted - b.gifted || a.jersey.localeCompare(b.jersey);
      })
      .slice(0, 6);
  }, [pointEarnerSort, stats]);

  const topPointGifters = useMemo(() => {
    if (!stats) return [];
    return [...stats.playerPoints]
      .filter(player => player.gifted > 0)
      .sort((a, b) => b.gifted - a.gifted || a.net - b.net || b.earned - a.earned || a.jersey.localeCompare(b.jersey))
      .slice(0, 6);
  }, [stats]);

  const practicePriorities = useMemo<PracticePriority[]>(() => {
    if (!stats) return [];

    const priorities: PracticePriority[] = [];
    const serveErrors = stats.serve.errors;
    const receiveErrors = stats.receive.errors;
    const attackErrors = stats.attack.errors;

    if (stats.ourGifted > stats.ourEarned) {
      priorities.push({
        label: 'Priority 1',
        title: 'Clean up free points',
        detail: `Gifted points are outpacing earned points. Start with ${stats.biggestLeak.toLowerCase()} reps before adding more risk.`,
        metric: `${stats.ourEarned}-${stats.ourGifted}`,
        tone: 'text-brand-red',
      });
    } else {
      priorities.push({
        label: 'Priority 1',
        title: 'Protect the edge',
        detail: `Keep using ${stats.biggestWeapon.toLowerCase()} as the main pressure source while tightening ${stats.biggestLeak.toLowerCase()}.`,
        metric: `+${stats.ourEarned}/-${stats.ourGifted}`,
        tone: 'text-brand-teal',
      });
    }

    if (stats.serve.servePct < 82 || serveErrors >= Math.max(3, stats.serve.attempts * 0.18)) {
      priorities.push({
        label: 'Serve Block',
        title: 'Serve under pressure',
        detail: 'Run target serving with score pressure and immediate miss consequences.',
        metric: `${pct(stats.serve.servePct)} in`,
        tone: scoreTone(stats.serve.servePct, 90, 82),
      });
    } else if (stats.receive.score < 1.9 || receiveErrors > 0) {
      priorities.push({
        label: 'First Contact',
        title: 'Stabilize receive',
        detail: 'Build receive lanes, call seams early, and finish with first-ball side-out swings.',
        metric: stats.receive.score.toFixed(2),
        tone: scoreTone(stats.receive.score, 2.3, 1.9),
      });
    } else {
      priorities.push({
        label: 'Pressure Block',
        title: 'Convert playable balls',
        detail: 'Train transition from controlled first contact into aggressive first-swing choices.',
        metric: pct(stats.serve.koPct),
        tone: scoreTone(stats.serve.koPct, 35, 22),
      });
    }

    if (stats.attack.net < 0 || attackErrors > Math.max(2, stats.attack.kills)) {
      priorities.push({
        label: 'Attack Block',
        title: 'Smarter swings',
        detail: 'Separate kill-ball swings from reset swings and score points for playable misses.',
        metric: `${stats.attack.kills}/${stats.attack.errors}`,
        tone: stats.attack.net >= 0 ? 'text-brand-green' : 'text-brand-red',
      });
    } else {
      priorities.push({
        label: 'Context',
        title: 'Recreate the leak',
        detail: stats.giftContext.practiceCue,
        metric: `${stats.giftContext.total} gifts`,
        tone: stats.giftContext.total > 0 ? 'text-brand-amber' : 'text-brand-green',
      });
    }

    return priorities;
  }, [stats]);

  const playerWatchRows = useMemo(() => {
    if (!stats) return [];
    return [...stats.playerPoints]
      .filter(player => player.total > 0)
      .sort((a, b) => a.net - b.net || b.gifted - a.gifted || b.total - a.total || a.jersey.localeCompare(b.jersey))
      .slice(0, 4);
  }, [stats]);

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
    toast.success('Season CSV package downloaded');
  };

  const handlePrint = () => {
    window.print();
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setMatchTypeFilter('all');
    setOpponentFilter('all');
    setResultFilter('all');
    setFiltersOpen(false);
  };

  const hasTeams = teams.length > 0;
  const hasMatches = Boolean(reportData && reportData.matches.length > 0);
  const hasFilteredMatches = Boolean(filteredReportData && filteredReportData.matches.length > 0);
  const hasRallies = Boolean(filteredReportData && filteredReportData.rallies.length > 0);
  const earnedGiftedBalance = stats ? stats.ourEarned - stats.ourGifted : 0;
  const activeFilterCount = [startDate, endDate, matchTypeFilter !== 'all', opponentFilter !== 'all', resultFilter !== 'all']
    .filter(Boolean)
    .length;
  const filtersActive = activeFilterCount > 0;
  const totalMatches = reportData?.matches.length ?? 0;
  const visibleMatches = filteredReportData?.matches.length ?? 0;
  const showFilterControls = filtersOpen || (hasMatches && !hasFilteredMatches);
  const latestMatchRow = stats?.matchRows[stats.matchRows.length - 1];
  const printScope = filtersActive
    ? `Filtered: ${visibleMatches} of ${totalMatches} matches`
    : `${visibleMatches} matches`;
  const printFilterDetails = [
    startDate ? `From ${startDate}` : '',
    endDate ? `To ${endDate}` : '',
    matchTypeFilter !== 'all' ? `Type: ${matchTypeFilter}` : '',
    opponentFilter !== 'all' ? `Opponent: ${opponentFilter}` : '',
    resultFilter !== 'all' ? `Result: ${resultFilter}` : '',
  ].filter(Boolean);
  const printDetails = [
    selectedTeam ? `${selectedTeam.name} - ${selectedTeam.season}` : 'No roster selected',
    printScope,
    ...printFilterDetails,
    `Printed ${new Date().toLocaleDateString()}`,
  ];
  const reportViews: ReportViewOption<SeasonReportView>[] = [
    { id: 'overview', label: 'Overview', detail: 'summary', icon: <ShieldCheck size={18} /> },
    { id: 'skills', label: 'Skills', detail: 'team rates', icon: <Zap size={18} /> },
    { id: 'players', label: 'Players', detail: 'leaders', icon: <Users size={18} /> },
    { id: 'trends', label: 'Trends', detail: 'by match', icon: <BarChart3 size={18} /> },
    { id: 'gifts', label: 'Gifts', detail: 'leaks', icon: <AlertTriangle size={18} /> },
    { id: 'plan', label: 'Plan', detail: 'practice', icon: <Target size={18} /> },
  ];

  return (
    <div className="print-report min-h-screen bg-brand-bg px-4 py-6 text-brand-text md:px-8">
      <div className="mx-auto max-w-6xl pb-24">
        <PrintReportHeader
          title="Season Report"
          subtitle="Rally Ledger"
          details={printDetails}
        />

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
            {filtersActive && (
              <p className="mt-2 text-[11px] font-black uppercase tracking-widest text-brand-teal">
                Filtered view · {visibleMatches} of {totalMatches} matches
              </p>
            )}
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

        {hasMatches && (
          <section className="print-hide mb-5 rounded-3xl border border-brand-gray/10 bg-brand-gray/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setFiltersOpen(isOpen => !isOpen)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-left focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
                aria-expanded={showFilterControls}
                aria-controls="season-report-filters"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-teal/10 text-brand-teal">
                  <ListFilter size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-black uppercase tracking-widest text-brand-text-secondary">Report Filters</h2>
                  <p className="mt-1 truncate text-xs font-bold text-brand-text-secondary">
                    {filtersActive ? `${activeFilterCount} active · ` : 'Filters off · '}
                    Showing {visibleMatches} of {totalMatches} matches
                  </p>
                </div>
              </button>

              <div className="flex shrink-0 items-center gap-2">
                {filtersActive && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex items-center gap-2 rounded-2xl border border-brand-gray/10 bg-brand-bg px-3 py-2 text-xs font-black uppercase tracking-tight text-brand-text-secondary transition-colors hover:border-brand-teal/40 hover:text-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
                  >
                    <RotateCcw size={15} />
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFiltersOpen(isOpen => !isOpen)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-gray/10 bg-brand-bg text-brand-text-secondary transition-colors hover:border-brand-teal/40 hover:text-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
                  aria-label={showFilterControls ? 'Hide report filters' : 'Show report filters'}
                  aria-expanded={showFilterControls}
                  aria-controls="season-report-filters"
                >
                  <ChevronDown size={18} className={`transition-transform ${showFilterControls ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            <div id="season-report-filters" className={`${showFilterControls ? 'mt-4 grid' : 'hidden'} gap-3 md:grid-cols-5`}>
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">From</span>
                <input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full rounded-2xl border border-brand-gray/20 bg-brand-bg px-3 py-3 text-sm font-bold text-brand-text outline-none transition-colors focus:border-brand-teal/60 focus:ring-2 focus:ring-brand-teal/20"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">To</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full rounded-2xl border border-brand-gray/20 bg-brand-bg px-3 py-3 text-sm font-bold text-brand-text outline-none transition-colors focus:border-brand-teal/60 focus:ring-2 focus:ring-brand-teal/20"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">Type</span>
                <select
                  value={matchTypeFilter}
                  onChange={(event) => setMatchTypeFilter(event.target.value)}
                  className="w-full rounded-2xl border border-brand-gray/20 bg-brand-bg px-3 py-3 text-sm font-bold text-brand-text outline-none transition-colors focus:border-brand-teal/60 focus:ring-2 focus:ring-brand-teal/20"
                >
                  <option value="all">All types</option>
                  {matchTypeOptions.map(matchType => (
                    <option key={matchType} value={matchType}>{matchType}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">Opponent</span>
                <select
                  value={opponentFilter}
                  onChange={(event) => setOpponentFilter(event.target.value)}
                  className="w-full rounded-2xl border border-brand-gray/20 bg-brand-bg px-3 py-3 text-sm font-bold text-brand-text outline-none transition-colors focus:border-brand-teal/60 focus:ring-2 focus:ring-brand-teal/20"
                >
                  <option value="all">All opponents</option>
                  {opponentOptions.map(opponent => (
                    <option key={opponent} value={opponent}>{opponent}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">Result</span>
                <select
                  value={resultFilter}
                  onChange={(event) => setResultFilter(event.target.value)}
                  className="w-full rounded-2xl border border-brand-gray/20 bg-brand-bg px-3 py-3 text-sm font-bold text-brand-text outline-none transition-colors focus:border-brand-teal/60 focus:ring-2 focus:ring-brand-teal/20"
                >
                  <option value="all">All results</option>
                  <option value="Win">Wins</option>
                  <option value="Loss">Losses</option>
                  <option value="Open">Open</option>
                </select>
              </label>
            </div>
          </section>
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
        ) : !hasFilteredMatches ? (
          <EmptyState
            icon={<ListFilter size={30} />}
            title="No matches match these filters"
            message="Clear or widen the report filters to bring season matches back into the cumulative report."
            action={
              <button
                onClick={clearFilters}
                className="rounded-2xl bg-brand-teal px-5 py-3 text-sm font-black text-brand-bg transition-transform active:scale-95"
              >
                Clear filters
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
                CSV Pack
              </button>
              <button
                onClick={handlePrint}
                className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-brand-gray/10 bg-brand-gray/5 px-3 py-4 text-xs font-black uppercase tracking-tight text-brand-text-secondary transition-colors hover:border-brand-teal/40 hover:text-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
              >
                <Printer size={18} />
                Print
              </button>
            </section>

            <ReportViewNav
              activeView={activeReportView}
              options={reportViews}
              onChange={setActiveReportView}
            />

            <ReportViewSection active={activeReportView === 'overview'} className="space-y-6">
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
            </ReportViewSection>

            <ReportViewSection active={activeReportView === 'overview' || activeReportView === 'skills'} className="space-y-6">
              <section className="rounded-3xl border border-brand-teal/15 bg-brand-teal/5 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-teal">Team Trend</p>
                    <h2 className="mt-1 text-xl font-black">Skill Snapshot</h2>
                  </div>
                  <ShieldCheck size={24} className="text-brand-teal" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
                    label="Kill Net"
                    value={`${stats.attack.net >= 0 ? '+' : ''}${stats.attack.net}`}
                    detail={`${stats.attack.kills} kills / ${stats.attack.errors} errors`}
                    tone={stats.attack.net >= 0 ? 'text-brand-green' : 'text-brand-red'}
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
            </ReportViewSection>

            <ReportViewSection active={activeReportView === 'gifts'}>
              <GiftContextCard giftContext={stats.giftContext} />
            </ReportViewSection>

            <ReportViewSection active={activeReportView === 'plan'} className="space-y-6">
              <section className="rounded-3xl border border-brand-teal/15 bg-brand-teal/5 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-teal">Practice Plan</p>
                    <h2 className="mt-1 text-xl font-black">Next Training Block</h2>
                  </div>
                  <Target size={24} className="text-brand-teal" />
                </div>

                <p className="text-sm font-semibold leading-6 text-brand-text-secondary">
                  {stats.focus}
                </p>
              </section>

              <section className="grid gap-3 md:grid-cols-3">
                {practicePriorities.map(priority => (
                  <div key={`${priority.label}-${priority.title}`} className="rounded-2xl border border-brand-gray/10 bg-brand-gray/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">{priority.label}</p>
                      <p className={`text-lg font-black ${priority.tone}`}>{priority.metric}</p>
                    </div>
                    <h3 className="mt-3 text-base font-black">{priority.title}</h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-brand-text-secondary">{priority.detail}</p>
                  </div>
                ))}
              </section>

              <div className="grid gap-6 lg:grid-cols-2">
                <Leaderboard title="Player Watch List" icon={<Users size={18} />} emptyText="No player-specific point data yet.">
                  {playerWatchRows.map(player => (
                    <div
                      key={player.playerId}
                      className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 rounded-2xl border border-brand-gray/10 bg-brand-bg px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">#{player.jersey} {player.name}</p>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-brand-text-secondary">
                          {player.total} attributed points
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-brand-red">{player.gifted}</p>
                        <p className="text-[10px] font-bold uppercase text-brand-text-secondary">Gift</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-brand-green">{player.earned}</p>
                        <p className="text-[10px] font-bold uppercase text-brand-text-secondary">Earn</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${player.net >= 0 ? 'text-brand-teal' : 'text-brand-red'}`}>
                          {player.net >= 0 ? '+' : ''}{player.net}
                        </p>
                        <p className="text-[10px] font-bold uppercase text-brand-text-secondary">Net</p>
                      </div>
                    </div>
                  ))}
                </Leaderboard>

                <section className="rounded-3xl border border-brand-gray/10 bg-brand-gray/5 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-amber/10 text-brand-amber">
                      <Calendar size={18} />
                    </div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-brand-text-secondary">Recent Match Check</h2>
                  </div>

                  {latestMatchRow ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-brand-gray/10 bg-brand-bg p-4">
                        <p className="truncate text-sm font-black">vs {latestMatchRow.opponentName}</p>
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-brand-text-secondary">
                          {formatDate(latestMatchRow.matchDate)} · {latestMatchRow.result ?? 'Open'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <SnapshotCard label="Earn/Gift" value={latestMatchRow.earnedGifted} detail="latest match" tone="text-brand-teal" />
                        <SnapshotCard label="Serve" value={pct(latestMatchRow.servePct)} detail={`${pct(latestMatchRow.serveKoPct)} KO`} tone={scoreTone(latestMatchRow.servePct, 90, 82)} />
                        <SnapshotCard label="Pass" value={latestMatchRow.passScore.toFixed(2)} detail="receive score" tone={scoreTone(latestMatchRow.passScore, 2.3, 1.9)} />
                        <SnapshotCard
                          label="Kill Net"
                          value={`${latestMatchRow.attackNet >= 0 ? '+' : ''}${latestMatchRow.attackNet}`}
                          detail={`${latestMatchRow.kills}/${latestMatchRow.attackErrors} K/Err`}
                          tone={latestMatchRow.attackNet >= 0 ? 'text-brand-green' : 'text-brand-red'}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-brand-gray/20 bg-brand-bg px-4 py-6 text-center text-sm font-semibold text-brand-text-secondary">
                      No match trend data yet.
                    </p>
                  )}
                </section>
              </div>
            </ReportViewSection>

            <ReportViewSection active={activeReportView === 'players'} className="space-y-6">
              <section className="space-y-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-teal/10 text-brand-teal">
                    <Trophy size={18} />
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-brand-text-secondary">Point Leaders</h2>
                </div>
                <div className="print-hide inline-grid grid-cols-2 rounded-2xl border border-brand-gray/10 bg-brand-bg p-1 text-[10px] font-black uppercase tracking-wide">
                  <button
                    type="button"
                    onClick={() => setPointEarnerSort('earned')}
                    className={`rounded-xl px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-teal/50 ${
                      pointEarnerSort === 'earned' ? 'bg-brand-teal text-brand-bg' : 'text-brand-text-secondary hover:text-brand-text'
                    }`}
                  >
                    Earned
                  </button>
                  <button
                    type="button"
                    onClick={() => setPointEarnerSort('net')}
                    className={`rounded-xl px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-teal/50 ${
                      pointEarnerSort === 'net' ? 'bg-brand-teal text-brand-bg' : 'text-brand-text-secondary hover:text-brand-text'
                    }`}
                  >
                    Net
                  </button>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Leaderboard title="Point Earners" icon={<Trophy size={18} />} emptyText="No earned points attributed yet.">
                  {topPointEarners.map(player => (
                    <div
                      key={player.playerId}
                      className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 rounded-2xl border border-brand-gray/10 bg-brand-bg px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">#{player.jersey} {player.name}</p>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-brand-text-secondary">
                          {player.total} earned/gifted rallies
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-brand-green">{player.earned}</p>
                        <p className="text-[10px] font-bold uppercase text-brand-text-secondary">Earn</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-brand-red">{player.gifted}</p>
                        <p className="text-[10px] font-bold uppercase text-brand-text-secondary">Gift</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${player.net >= 0 ? 'text-brand-teal' : 'text-brand-red'}`}>
                          {player.net >= 0 ? '+' : ''}{player.net}
                        </p>
                        <p className="text-[10px] font-bold uppercase text-brand-text-secondary">Net</p>
                      </div>
                    </div>
                  ))}
                </Leaderboard>

                <Leaderboard title="Point Gifters" icon={<AlertTriangle size={18} />} emptyText="No gifted points attributed yet.">
                  {topPointGifters.map(player => (
                    <div
                      key={player.playerId}
                      className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 rounded-2xl border border-brand-gray/10 bg-brand-bg px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">#{player.jersey} {player.name}</p>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-brand-text-secondary">
                          {player.total} earned/gifted rallies
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-brand-red">{player.gifted}</p>
                        <p className="text-[10px] font-bold uppercase text-brand-text-secondary">Gift</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-brand-green">{player.earned}</p>
                        <p className="text-[10px] font-bold uppercase text-brand-text-secondary">Earn</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${player.net >= 0 ? 'text-brand-teal' : 'text-brand-red'}`}>
                          {player.net >= 0 ? '+' : ''}{player.net}
                        </p>
                        <p className="text-[10px] font-bold uppercase text-brand-text-secondary">Net</p>
                      </div>
                    </div>
                  ))}
                </Leaderboard>
              </div>
              </section>
            </ReportViewSection>

            <ReportViewSection active={activeReportView === 'players' || activeReportView === 'skills'} className="grid gap-6 lg:grid-cols-2">
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
                {allServingRows.length > stats.playerServing.slice(0, 6).length && (
                  <button
                    type="button"
                    onClick={() => setShowAllServing(current => !current)}
                    className="print-hide mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-teal/20 bg-brand-teal/5 px-4 py-3 text-xs font-black uppercase tracking-wide text-brand-teal transition-colors hover:bg-brand-teal/10 focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
                  >
                    {showAllServing ? 'Hide All Serving' : `Show All Serving (${allServingRows.length})`}
                    <ChevronDown size={16} className={`transition-transform ${showAllServing ? 'rotate-180' : ''}`} />
                  </button>
                )}
                {showAllServing && (
                  <div className="mt-3 overflow-x-auto rounded-2xl border border-brand-gray/10 bg-brand-bg">
                    <table className="w-full min-w-[520px] text-left text-xs">
                      <thead className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">
                        <tr>
                          <th className="px-3 py-3">Player</th>
                          <th className="px-3 py-3 text-right">Att</th>
                          <th className="px-3 py-3 text-right">Ace</th>
                          <th className="px-3 py-3 text-right">Err</th>
                          <th className="px-3 py-3 text-right">InSys</th>
                          <th className="px-3 py-3 text-right">OOS</th>
                          <th className="px-3 py-3 text-right">KO</th>
                          <th className="px-3 py-3 text-right">In%</th>
                          <th className="px-3 py-3 text-right">KO%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allServingRows.map(player => (
                          <tr key={player.playerId} className="border-t border-brand-gray/10 font-bold">
                            <td className="px-3 py-3">#{player.jersey} {player.name}</td>
                            <td className="px-3 py-3 text-right">{player.attempts}</td>
                            <td className="px-3 py-3 text-right text-brand-green">{player.aces}</td>
                            <td className="px-3 py-3 text-right text-brand-red">{player.errors}</td>
                            <td className="px-3 py-3 text-right">{player.inSystem}</td>
                            <td className="px-3 py-3 text-right">{player.outOfSystem}</td>
                            <td className="px-3 py-3 text-right text-brand-teal">{player.ko}</td>
                            <td className="px-3 py-3 text-right text-brand-green">{pct(player.servePct)}</td>
                            <td className="px-3 py-3 text-right text-brand-teal">{pct(player.koPct)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="print-only print-player-table hidden">
                  <table className="w-full min-w-[520px] text-left text-xs">
                    <thead className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">
                      <tr>
                        <th className="px-3 py-3">Player</th>
                        <th className="px-3 py-3 text-right">Att</th>
                        <th className="px-3 py-3 text-right">Ace</th>
                        <th className="px-3 py-3 text-right">Err</th>
                        <th className="px-3 py-3 text-right">InSys</th>
                        <th className="px-3 py-3 text-right">OOS</th>
                        <th className="px-3 py-3 text-right">KO</th>
                        <th className="px-3 py-3 text-right">In%</th>
                        <th className="px-3 py-3 text-right">KO%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allServingRows.map(player => (
                        <tr key={player.playerId} className="border-t border-brand-gray/10 font-bold">
                          <td className="px-3 py-3">#{player.jersey} {player.name}</td>
                          <td className="px-3 py-3 text-right">{player.attempts}</td>
                          <td className="px-3 py-3 text-right text-brand-green">{player.aces}</td>
                          <td className="px-3 py-3 text-right text-brand-red">{player.errors}</td>
                          <td className="px-3 py-3 text-right">{player.inSystem}</td>
                          <td className="px-3 py-3 text-right">{player.outOfSystem}</td>
                          <td className="px-3 py-3 text-right text-brand-teal">{player.ko}</td>
                          <td className="px-3 py-3 text-right text-brand-green">{pct(player.servePct)}</td>
                          <td className="px-3 py-3 text-right text-brand-teal">{pct(player.koPct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                {allReceivingRows.length > stats.playerReceiving.slice(0, 6).length && (
                  <button
                    type="button"
                    onClick={() => setShowAllReceiving(current => !current)}
                    className="print-hide mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-teal/20 bg-brand-teal/5 px-4 py-3 text-xs font-black uppercase tracking-wide text-brand-teal transition-colors hover:bg-brand-teal/10 focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
                  >
                    {showAllReceiving ? 'Hide All Receiving' : `Show All Receiving (${allReceivingRows.length})`}
                    <ChevronDown size={16} className={`transition-transform ${showAllReceiving ? 'rotate-180' : ''}`} />
                  </button>
                )}
                {showAllReceiving && (
                  <div className="mt-3 overflow-x-auto rounded-2xl border border-brand-gray/10 bg-brand-bg">
                    <table className="w-full min-w-[500px] text-left text-xs">
                      <thead className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">
                        <tr>
                          <th className="px-3 py-3">Player</th>
                          <th className="px-3 py-3 text-right">Att</th>
                          <th className="px-3 py-3 text-right">3s</th>
                          <th className="px-3 py-3 text-right">2s</th>
                          <th className="px-3 py-3 text-right">Over</th>
                          <th className="px-3 py-3 text-right">Err</th>
                          <th className="px-3 py-3 text-right">Avg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allReceivingRows.map(player => (
                          <tr key={player.playerId} className="border-t border-brand-gray/10 font-bold">
                            <td className="px-3 py-3">#{player.jersey} {player.name}</td>
                            <td className="px-3 py-3 text-right">{player.attempts}</td>
                            <td className="px-3 py-3 text-right text-brand-green">{player.inSystem}</td>
                            <td className="px-3 py-3 text-right text-brand-teal">{player.outOfSystem}</td>
                            <td className="px-3 py-3 text-right text-brand-amber">{player.overpass}</td>
                            <td className="px-3 py-3 text-right text-brand-red">{player.errors}</td>
                            <td className={`px-3 py-3 text-right ${scoreTone(player.score, 2.3, 1.9)}`}>{player.score.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="print-only print-player-table hidden">
                  <table className="w-full min-w-[500px] text-left text-xs">
                    <thead className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">
                      <tr>
                        <th className="px-3 py-3">Player</th>
                        <th className="px-3 py-3 text-right">Att</th>
                        <th className="px-3 py-3 text-right">3s</th>
                        <th className="px-3 py-3 text-right">2s</th>
                        <th className="px-3 py-3 text-right">Over</th>
                        <th className="px-3 py-3 text-right">Err</th>
                        <th className="px-3 py-3 text-right">Avg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allReceivingRows.map(player => (
                        <tr key={player.playerId} className="border-t border-brand-gray/10 font-bold">
                          <td className="px-3 py-3">#{player.jersey} {player.name}</td>
                          <td className="px-3 py-3 text-right">{player.attempts}</td>
                          <td className="px-3 py-3 text-right text-brand-green">{player.inSystem}</td>
                          <td className="px-3 py-3 text-right text-brand-teal">{player.outOfSystem}</td>
                          <td className="px-3 py-3 text-right text-brand-amber">{player.overpass}</td>
                          <td className="px-3 py-3 text-right text-brand-red">{player.errors}</td>
                          <td className={`px-3 py-3 text-right ${scoreTone(player.score, 2.3, 1.9)}`}>{player.score.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Leaderboard>
            </ReportViewSection>

            <ReportViewSection active={activeReportView === 'players' || activeReportView === 'skills'}>
              <Leaderboard title="Kill Report" icon={<Trophy size={18} />} emptyText="No kills or attack errors tracked.">
              {stats.playerAttacking.slice(0, 6).map(player => (
                <div
                  key={player.playerId}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 rounded-2xl border border-brand-gray/10 bg-brand-bg px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">#{player.jersey} {player.name}</p>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-brand-text-secondary">
                      {player.attempts} kill/error attempts
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-brand-green">{player.kills}</p>
                    <p className="text-[10px] font-bold uppercase text-brand-text-secondary">Kills</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-brand-red">{player.errors}</p>
                    <p className="text-[10px] font-bold uppercase text-brand-text-secondary">Err</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${player.net >= 0 ? 'text-brand-teal' : 'text-brand-red'}`}>
                      {player.net >= 0 ? '+' : ''}{player.net}
                    </p>
                    <p className="text-[10px] font-bold uppercase text-brand-text-secondary">Net</p>
                  </div>
                </div>
              ))}
              {allAttackingRows.length > stats.playerAttacking.slice(0, 6).length && (
                <button
                  type="button"
                  onClick={() => setShowAllAttacking(current => !current)}
                  className="print-hide mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-teal/20 bg-brand-teal/5 px-4 py-3 text-xs font-black uppercase tracking-wide text-brand-teal transition-colors hover:bg-brand-teal/10 focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
                >
                  {showAllAttacking ? 'Hide All Kill Report' : `Show All Kill Report (${allAttackingRows.length})`}
                  <ChevronDown size={16} className={`transition-transform ${showAllAttacking ? 'rotate-180' : ''}`} />
                </button>
              )}
              {showAllAttacking && (
                <div className="mt-3 overflow-x-auto rounded-2xl border border-brand-gray/10 bg-brand-bg">
                  <table className="w-full min-w-[560px] text-left text-xs">
                    <thead className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">
                      <tr>
                        <th className="px-3 py-3">Player</th>
                        <th className="px-3 py-3 text-right">Kills</th>
                        <th className="px-3 py-3 text-right">Err</th>
                        <th className="px-3 py-3 text-right">Att</th>
                        <th className="px-3 py-3 text-right">Net</th>
                        <th className="px-3 py-3 text-right">K%</th>
                        <th className="px-3 py-3 text-right">Err%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allAttackingRows.map(player => (
                        <tr key={player.playerId} className="border-t border-brand-gray/10 font-bold">
                          <td className="px-3 py-3">#{player.jersey} {player.name}</td>
                          <td className="px-3 py-3 text-right text-brand-green">{player.kills}</td>
                          <td className="px-3 py-3 text-right text-brand-red">{player.errors}</td>
                          <td className="px-3 py-3 text-right">{player.attempts}</td>
                          <td className={`px-3 py-3 text-right ${player.net >= 0 ? 'text-brand-teal' : 'text-brand-red'}`}>
                            {player.net >= 0 ? '+' : ''}{player.net}
                          </td>
                          <td className="px-3 py-3 text-right text-brand-green">{pct(player.killPct)}</td>
                          <td className="px-3 py-3 text-right text-brand-red">{pct(player.errorPct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="print-only print-player-table hidden">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">
                    <tr>
                      <th className="px-3 py-3">Player</th>
                      <th className="px-3 py-3 text-right">Kills</th>
                      <th className="px-3 py-3 text-right">Err</th>
                      <th className="px-3 py-3 text-right">Att</th>
                      <th className="px-3 py-3 text-right">Net</th>
                      <th className="px-3 py-3 text-right">K%</th>
                      <th className="px-3 py-3 text-right">Err%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allAttackingRows.map(player => (
                      <tr key={player.playerId} className="border-t border-brand-gray/10 font-bold">
                        <td className="px-3 py-3">#{player.jersey} {player.name}</td>
                        <td className="px-3 py-3 text-right text-brand-green">{player.kills}</td>
                        <td className="px-3 py-3 text-right text-brand-red">{player.errors}</td>
                        <td className="px-3 py-3 text-right">{player.attempts}</td>
                        <td className={`px-3 py-3 text-right ${player.net >= 0 ? 'text-brand-teal' : 'text-brand-red'}`}>
                          {player.net >= 0 ? '+' : ''}{player.net}
                        </td>
                        <td className="px-3 py-3 text-right text-brand-green">{pct(player.killPct)}</td>
                        <td className="px-3 py-3 text-right text-brand-red">{pct(player.errorPct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </Leaderboard>
            </ReportViewSection>

            <ReportViewSection active={activeReportView === 'trends'} className="space-y-6">
              <SeasonTrendCharts rows={stats.matchRows} />

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

                    <div className="grid grid-cols-5 gap-2 text-center">
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
                      <div>
                        <p className="text-[9px] font-black uppercase text-brand-text-secondary">K/Err</p>
                        <p className={`mt-1 text-sm font-black ${row.attackNet >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                          {row.kills}/{row.attackErrors}
                        </p>
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
                      <th className="px-3 py-2">K/Err</th>
                      <th className="px-3 py-2">K Net</th>
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
                        <td className={`px-3 py-3 ${scoreTone(row.passScore, 2.3, 1.9)}`}>{row.passScore.toFixed(2)}</td>
                        <td className="px-3 py-3">
                          <span className="text-brand-green">{row.kills}</span>
                          <span className="mx-1 text-brand-text-secondary">/</span>
                          <span className="text-brand-red">{row.attackErrors}</span>
                        </td>
                        <td className={`rounded-r-2xl px-3 py-3 ${row.attackNet >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                          {row.attackNet >= 0 ? '+' : ''}{row.attackNet}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </section>
            </ReportViewSection>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
