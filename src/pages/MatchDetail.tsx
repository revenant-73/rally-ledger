import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Zap, AlertTriangle, Calendar, MapPin, Trophy } from 'lucide-react';
import { db } from '../db/client';
import { matches as matchesTable, sets as setsTable, rallyEvents as rallyEventsTable, players as playersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { Match, Set, RallyEvent, Player } from '../types';

const MatchDetail: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  
  const [match, setMatch] = useState<Match | null>(null);
  const [sets, setSets] = useState<Set[]>([]);
  const [rallies, setRallies] = useState<RallyEvent[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!matchId) return;
      
      try {
        const matchData = await db.select().from(matchesTable).where(eq(matchesTable.id, matchId)).limit(1);
        if (matchData.length === 0) {
          setLoading(false);
          return;
        }
        
        const currentMatch = matchData[0] as Match;
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
  }, [matchId]);

  const metrics = useMemo(() => {
    if (rallies.length === 0) return null;

    const ourEarned = rallies.filter(r => r.pointWinner === 'Us' && r.classification === 'Earned').length;
    const ourGifted = rallies.filter(r => r.pointWinner === 'Opponent' && r.classification === 'Gifted').length;
    const oppEarned = rallies.filter(r => r.pointWinner === 'Opponent' && r.classification === 'Earned').length;
    const oppGifted = rallies.filter(r => r.pointWinner === 'Us' && r.classification === 'Gifted').length;

    // Find biggest leak
    const giftedByUs = rallies.filter(r => r.pointWinner === 'Opponent' && r.classification === 'Gifted');
    const leakCounts: Record<string, number> = {};
    giftedByUs.forEach(r => {
      leakCounts[r.outcomeType] = (leakCounts[r.outcomeType] || 0) + 1;
    });
    const biggestLeak = Object.entries(leakCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    // Find biggest weapon
    const earnedByUs = rallies.filter(r => r.pointWinner === 'Us' && r.classification === 'Earned');
    const weaponCounts: Record<string, number> = {};
    earnedByUs.forEach(r => {
      weaponCounts[r.outcomeType] = (weaponCounts[r.outcomeType] || 0) + 1;
    });
    const biggestWeapon = Object.entries(weaponCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    // Player Leaders
    const playerEarned: Record<string, number> = {};
    const playerGifted: Record<string, number> = {};

    rallies.forEach(r => {
      if (r.playerId) {
        if (r.pointWinner === 'Us' && r.classification === 'Earned') {
          playerEarned[r.playerId] = (playerEarned[r.playerId] || 0) + 1;
        } else if (r.pointWinner === 'Opponent' && r.classification === 'Gifted') {
          playerGifted[r.playerId] = (playerGifted[r.playerId] || 0) + 1;
        }
      }
    });

    const topEarner = Object.entries(playerEarned).sort((a, b) => b[1] - a[1])[0];
    const topGifter = Object.entries(playerGifted).sort((a, b) => b[1] - a[1])[0];

    const earnerPlayer = topEarner ? players.find(p => p.id === topEarner[0]) : null;
    const gifterPlayer = topGifter ? players.find(p => p.id === topGifter[0]) : null;

    return {
      ourEarned,
      ourGifted,
      oppEarned,
      oppGifted,
      biggestLeak,
      biggestWeapon,
      earner: earnerPlayer ? { name: earnerPlayer.lastName, count: topEarner[1], jersey: earnerPlayer.jerseyNumber } : null,
      gifter: gifterPlayer ? { name: gifterPlayer.lastName, count: topGifter[1], jersey: gifterPlayer.jerseyNumber } : null
    };
  }, [rallies, players]);

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
            {/* Earned vs Gifted Balance */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6 flex flex-col items-center">
                <span className="text-xs font-bold text-brand-text-secondary uppercase mb-2">Our Balance</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-brand-green">+{metrics.ourEarned}</span>
                  <span className="text-brand-text-secondary">/</span>
                  <span className="text-3xl font-black text-brand-amber">-{metrics.ourGifted}</span>
                </div>
                <p className="text-[10px] mt-2 text-brand-text-secondary uppercase">Earned / Gifted</p>
              </div>
              <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6 flex flex-col items-center">
                <span className="text-xs font-bold text-brand-text-secondary uppercase mb-2">Their Balance</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-brand-text">+{metrics.oppEarned}</span>
                  <span className="text-brand-text-secondary">/</span>
                  <span className="text-3xl font-black text-brand-gray">-{metrics.oppGifted}</span>
                </div>
                <p className="text-[10px] mt-2 text-brand-text-secondary uppercase">Earned / Gifted</p>
              </div>
            </div>

            {/* Leak vs Weapon */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-brand-red/5 border border-brand-red/20 rounded-3xl p-6">
                <div className="flex items-center gap-2 text-brand-red mb-3">
                  <AlertTriangle size={16} />
                  <span className="text-[10px] font-bold uppercase">Biggest Leak</span>
                </div>
                <p className="text-lg font-bold leading-tight">{metrics.biggestLeak}</p>
              </div>
              <div className="bg-brand-green/5 border border-brand-green/20 rounded-3xl p-6">
                <div className="flex items-center gap-2 text-brand-green mb-3">
                  <Zap size={16} />
                  <span className="text-[10px] font-bold uppercase">Biggest Weapon</span>
                </div>
                <p className="text-lg font-bold leading-tight">{metrics.biggestWeapon}</p>
              </div>
            </div>

            {/* Player Leaders */}
            {(metrics.earner || metrics.gifter) && (
              <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
                <h3 className="text-sm font-bold text-brand-text-secondary uppercase mb-4">Match Leaders</h3>
                <div className="space-y-4">
                  {metrics.earner && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-green/10 rounded-full flex items-center justify-center text-brand-green font-black text-xs">
                          {metrics.earner.jersey}
                        </div>
                        <span className="font-bold">{metrics.earner.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-brand-green">
                        <span className="text-sm font-black">{metrics.earner.count}</span>
                        <span className="text-[10px] font-bold uppercase">Earned</span>
                      </div>
                    </div>
                  )}
                  {metrics.gifter && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-red/10 rounded-full flex items-center justify-center text-brand-red font-black text-xs">
                          {metrics.gifter.jersey}
                        </div>
                        <span className="font-bold">{metrics.gifter.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-brand-red">
                        <span className="text-sm font-black">{metrics.gifter.count}</span>
                        <span className="text-[10px] font-bold uppercase">Gifted</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        
        {match.notes && (
          <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-brand-text-secondary uppercase mb-2 tracking-widest">Match Notes</h3>
            <p className="text-sm text-brand-text leading-relaxed whitespace-pre-wrap">{match.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchDetail;
