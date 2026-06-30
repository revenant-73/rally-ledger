import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Zap, Calendar, MapPin, Trophy } from 'lucide-react';
import { db } from '../db/client';
import { matches as matchesTable, sets as setsTable, rallyEvents as rallyEventsTable, players as playersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { Match, Set, RallyEvent, Player } from '../types';
import { useMatch } from '../hooks/useMatch';
import { useMatchDetailMetrics } from '../hooks/useMatchDetailMetrics';

const MatchDetail: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { teams, isSyncing } = useMatch();
  
  const [match, setMatch] = useState<Match | null>(null);
  const [sets, setSets] = useState<Set[]>([]);
  const [rallies, setRallies] = useState<RallyEvent[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const metrics = useMatchDetailMetrics(rallies, players);

  useEffect(() => {
    const fetchData = async () => {
      if (!matchId) return;
      if (teams.length === 0 && !isSyncing) {
        setLoading(false);
        return;
      }
      if (teams.length === 0) return;
      
      try {
        const matchData = await db.select().from(matchesTable).where(eq(matchesTable.id, matchId)).limit(1);
        if (matchData.length === 0) {
          setLoading(false);
          return;
        }
        
        const currentMatch = matchData[0] as Match;
        
        if (!teams.some(t => t.id === currentMatch.teamId)) {
          setLoading(false);
          return;
        }
        
        setMatch(currentMatch);
        
        const [setsData, ralliesData, playersData] = await Promise.all([
          db.select().from(setsTable).where(eq(setsTable.matchId, matchId)),
          db.select().from(rallyEventsTable).where(eq(rallyEventsTable.matchId, matchId)),
          db.select().from(playersTable).where(eq(playersTable.teamId, currentMatch.teamId))
        ]);
        
        setSets(setsData as Set[]);
        setRallies(ralliesData as RallyEvent[]);
        setPlayers(playersData as Player[]);
      } catch (error) {
        console.error('Failed to fetch match details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [matchId, teams, isSyncing]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-teal"></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-brand-bg text-brand-text p-6 flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold mb-4">Match not found</h2>
        <button onClick={() => navigate('/history')} className="text-brand-teal font-bold">Back to History</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text p-6 max-w-lg mx-auto pb-24">
      <header className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/history')} className="text-brand-text-secondary hover:text-brand-text">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <span className="text-[10px] font-black text-brand-teal uppercase tracking-widest">{match.matchType}</span>
          <h1 className="text-2xl font-bold">vs {match.opponentName}</h1>
        </div>
        <div className="w-6" />
      </header>

      <div className="space-y-6">
        {/* Post-Match Summary / Key Insights */}
        {metrics && (
          <div className="bg-brand-teal/5 border-2 border-brand-teal/20 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-black text-brand-teal uppercase mb-4 tracking-widest">Post-Match Report</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-brand-bg p-4 rounded-2xl border border-brand-gray/10">
                <p className="text-[10px] font-bold text-brand-text-secondary uppercase mb-1">Top Source</p>
                <p className="text-lg font-black text-brand-teal uppercase">{metrics.biggestWeapon}</p>
              </div>
              <div className="bg-brand-bg p-4 rounded-2xl border border-brand-gray/10">
                <p className="text-[10px] font-bold text-brand-text-secondary uppercase mb-1">Top Leak</p>
                <p className="text-lg font-black text-brand-red uppercase">{metrics.biggestLeak}</p>
              </div>
            </div>
            
            <div className="bg-brand-bg p-4 rounded-2xl border border-brand-gray/10">
              <p className="text-[10px] font-bold text-brand-teal uppercase mb-2 tracking-widest">Suggested Practice Focus</p>
              <p className="text-sm font-bold text-brand-text leading-tight">
                {metrics.ourGifted > metrics.ourEarned 
                  ? "Execution Leak: Focus on reducing unforced errors and making the opponent earn their points. High priority on skill consistency."
                  : metrics.biggestLeak === 'Serve Error' 
                  ? "Serving Consistency: High error rate on serve. Practice serving under pressure with specific targets."
                  : metrics.biggestLeak === 'Attack Error'
                  ? "Smart Attacking: Too many attack errors. Focus on identifying when to swing for a kill vs. when to keep the ball in play."
                  : "Maintain Pressure: Keep refining your top scoring sources while tightening up individual consistency."}
              </p>
            </div>
          </div>
        )}

        {/* Match Info Card */}
        <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-teal/10 rounded-2xl flex items-center justify-center text-brand-teal">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-brand-text-secondary uppercase">Date</p>
                <p className="font-bold text-sm">{new Date(match.matchDate).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-teal/10 rounded-2xl flex items-center justify-center text-brand-teal">
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-brand-text-secondary uppercase">Location</p>
                <p className="font-bold text-sm truncate">{match.location}</p>
              </div>
            </div>
          </div>
          
          {match.result && (
            <div className={`mt-6 p-4 rounded-2xl flex items-center justify-between ${
              match.result === 'Win' ? 'bg-brand-teal/10 border border-brand-teal/20' : 'bg-brand-red/10 border border-brand-red/20'
            }`}>
              <div className="flex items-center gap-3">
                <Trophy size={20} className={match.result === 'Win' ? 'text-brand-teal' : 'text-brand-red'} />
                <span className="font-black uppercase tracking-wider">Match Result</span>
              </div>
              <span className={`text-xl font-black ${match.result === 'Win' ? 'text-brand-teal' : 'text-brand-red'}`}>
                {match.result}
              </span>
            </div>
          )}
        </div>

        {/* Sets Summary */}
        <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
          <h3 className="text-sm font-bold text-brand-text-secondary uppercase mb-4 tracking-widest">Sets Breakdown</h3>
          <div className="space-y-3">
            {sets.length === 0 ? (
              <p className="text-sm text-brand-text-secondary italic text-center py-4">No sets recorded for this match.</p>
            ) : sets.sort((a, b) => a.setNumber - b.setNumber).map((set) => (
              <div key={set.id} className="flex items-center justify-between p-3 bg-brand-bg rounded-xl border border-brand-gray/10">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-brand-gray/10 rounded-lg flex items-center justify-center text-[10px] font-black">
                    {set.setNumber}
                  </span>
                  <span className={`text-sm font-bold ${set.finalResult === 'Win' ? 'text-brand-teal' : 'text-brand-red'}`}>
                    {set.finalResult || 'In Progress'}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-black">
                  <span className={set.ourScore > set.opponentScore ? 'text-brand-teal' : 'text-brand-text'}>{set.ourScore}</span>
                  <span className="text-brand-text-secondary">-</span>
                  <span className={set.opponentScore > set.ourScore ? 'text-brand-red' : 'text-brand-text'}>{set.opponentScore}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {metrics && (
          <>
            {/* Execution vs Point Leaks Balance */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6 flex flex-col items-center">
                <span className="text-xs font-bold text-brand-text-secondary uppercase mb-2">Our Balance</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-brand-green">+{metrics.ourEarned}</span>
                  <span className="text-brand-text-secondary">/</span>
                  <span className="text-3xl font-black text-brand-red">-{metrics.ourGifted}</span>
                </div>
                <p className="text-[10px] mt-2 text-brand-text-secondary uppercase">Execution / Leaks</p>
              </div>
              <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6 flex flex-col items-center">
                <span className="text-xs font-bold text-brand-text-secondary uppercase mb-2">Their Balance</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-brand-text">+{metrics.oppEarned}</span>
                  <span className="text-brand-text-secondary">/</span>
                  <span className="text-3xl font-black text-brand-gray">-{metrics.oppGifted}</span>
                </div>
                <p className="text-[10px] mt-2 text-brand-text-secondary uppercase">Execution / Leaks</p>
              </div>
            </div>

            {/* Serve & Receive Performance */}
            <div className="space-y-4">
              <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
                <h3 className="text-sm font-bold text-brand-text-secondary uppercase mb-4 tracking-widest flex items-center gap-2">
                  <Zap size={16} className="text-brand-teal" />
                  Serve Performance
                </h3>
                <div className="grid grid-cols-4 gap-2 mb-6">
                  <div className="text-center">
                    <p className="text-xl font-black text-brand-green">{metrics.serveStats.aces}</p>
                    <p className="text-[8px] font-bold text-brand-text-secondary uppercase">ACE</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-brand-red">{metrics.serveStats.errors}</p>
                    <p className="text-[8px] font-bold text-brand-text-secondary uppercase">ERR</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-brand-teal">{metrics.serveStats.inSystem}</p>
                    <p className="text-[8px] font-bold text-brand-text-secondary uppercase">InSys</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-brand-amber">{metrics.serveStats.outOfSystem}</p>
                    <p className="text-[8px] font-bold text-brand-text-secondary uppercase">KO</p>
                  </div>
                </div>
                
                {Object.keys(metrics.playerServeStats).length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-brand-gray/10">
                    <p className="text-[10px] font-black text-brand-text-secondary uppercase mb-2">Top Servers (Efficiency)</p>
                    {Object.entries(metrics.playerServeStats)
                      .sort((a, b) => (b[1].aces + b[1].outOfSystem) - (a[1].aces + a[1].outOfSystem))
                      .slice(0, 3)
                      .map(([pid, stats]) => {
                        const p = players.find(player => player.id === pid);
                        return p ? (
                          <div key={pid} className="flex justify-between items-center text-xs">
                            <span className="font-bold">#{p.jerseyNumber} {p.lastName}</span>
                            <div className="flex gap-4">
                              <span className="text-brand-teal font-black">KO {Math.round(((stats.aces + stats.outOfSystem) / stats.total) * 100)}%</span>
                              <span className="text-brand-text-secondary">In {Math.round(((stats.total - stats.errors) / stats.total) * 100)}%</span>
                            </div>
                          </div>
                        ) : null;
                      })}
                  </div>
                )}
              </div>

              <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
                <h3 className="text-sm font-bold text-brand-text-secondary uppercase mb-4 tracking-widest flex items-center gap-2">
                  <Zap size={16} className="text-brand-teal" />
                  Receive Performance
                </h3>
                <div className="grid grid-cols-4 gap-2 mb-6">
                  <div className="text-center">
                    <p className="text-xl font-black text-brand-green">{metrics.receiveStats.inSystem}</p>
                    <p className="text-[8px] font-bold text-brand-text-secondary uppercase">3s</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-brand-teal">{metrics.receiveStats.outOfSystem}</p>
                    <p className="text-[8px] font-bold text-brand-text-secondary uppercase">2s</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-brand-amber">{metrics.receiveStats.overpass}</p>
                    <p className="text-[8px] font-bold text-brand-text-secondary uppercase">1s</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-brand-red">{metrics.receiveStats.errors}</p>
                    <p className="text-[8px] font-bold text-brand-red uppercase">0s</p>
                  </div>
                </div>

                {Object.keys(metrics.playerReceiveStats).length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-brand-gray/10">
                    <p className="text-[10px] font-black text-brand-text-secondary uppercase mb-2">Top Passers (Score)</p>
                    {Object.entries(metrics.playerReceiveStats)
                      .map(([pid, stats]) => ({
                        pid,
                        score: Number(((stats.inSystem * 3 + stats.outOfSystem * 2 + stats.overpass * 1) / stats.total).toFixed(2))
                      }))
                      .sort((a, b) => b.score - a.score)
                      .slice(0, 3)
                      .map(({ pid, score }) => {
                        const p = players.find(player => player.id === pid);
                        return p ? (
                          <div key={pid} className="flex justify-between items-center text-xs">
                            <span className="font-bold">#{p.jerseyNumber} {p.lastName}</span>
                            <span className={`font-black ${score >= 2.2 ? 'text-brand-green' : score >= 1.8 ? 'text-brand-teal' : 'text-brand-amber'}`}>
                              {score} Avg
                            </span>
                          </div>
                        ) : null;
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Key Leaders */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
                <h3 className="text-[10px] font-black text-brand-green uppercase tracking-widest mb-4">Top Earner</h3>
                {metrics.earner ? (
                  <div className="text-center">
                    <p className="text-3xl font-black text-brand-green">{metrics.earner.count}</p>
                    <p className="text-sm font-bold mt-1">#{metrics.earner.jersey} {metrics.earner.name}</p>
                  </div>
                ) : (
                  <p className="text-xs text-brand-text-secondary italic text-center">No data</p>
                )}
              </div>
              <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
                <h3 className="text-[10px] font-black text-brand-red uppercase tracking-widest mb-4">Top Gifter</h3>
                {metrics.gifter ? (
                  <div className="text-center">
                    <p className="text-3xl font-black text-brand-red">{metrics.gifter.count}</p>
                    <p className="text-sm font-bold mt-1">#{metrics.gifter.jersey} {metrics.gifter.name}</p>
                  </div>
                ) : (
                  <p className="text-xs text-brand-text-secondary italic text-center">No data</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MatchDetail;
