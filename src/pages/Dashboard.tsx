import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, AlertTriangle, CloudRain, Sun, Cloud, CloudLightning, X, Info } from 'lucide-react';
import { useMatch } from '../hooks/useMatch';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { activeMatch, activeSet, rallies, players } = useMatch();
  const [showForecastModal, setShowForecastModal] = useState(false);

  const metrics = useMemo(() => {
    // Separate rallies by set context
    const setRallies = rallies.filter(r => r.setId === activeSet?.id);
    const matchRallies = rallies; // All rallies in current activeMatch

    const ourEarned = setRallies.filter(r => r.pointWinner === 'Us' && r.classification === 'Earned').length;
    const ourGifted = setRallies.filter(r => r.pointWinner === 'Opponent' && r.classification === 'Gifted').length;
    const oppEarned = setRallies.filter(r => r.pointWinner === 'Opponent' && r.classification === 'Earned').length;
    const oppGifted = setRallies.filter(r => r.pointWinner === 'Us' && r.classification === 'Gifted').length;

    const recent10 = setRallies.slice(-10).map(r => ({
      winner: r.pointWinner,
      classification: r.classification
    }));

    // Find biggest leak (Match level)
    const giftedByUs = matchRallies.filter(r => r.pointWinner === 'Opponent' && r.classification === 'Gifted');
    const leakCounts: Record<string, number> = {};
    giftedByUs.forEach(r => {
      leakCounts[r.outcomeType] = (leakCounts[r.outcomeType] || 0) + 1;
    });
    const biggestLeak = Object.entries(leakCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    // Find biggest weapon (Match level)
    const earnedByUs = matchRallies.filter(r => r.pointWinner === 'Us' && r.classification === 'Earned');
    const weaponCounts: Record<string, number> = {};
    earnedByUs.forEach(r => {
      weaponCounts[r.outcomeType] = (weaponCounts[r.outcomeType] || 0) + 1;
    });
    const biggestWeapon = Object.entries(weaponCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    // Player Leaders (Match level)
    const playerEarned: Record<string, number> = {};
    const playerGifted: Record<string, number> = {};

    matchRallies.forEach(r => {
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

    // Serve & Receive Stats (Set level for team performance)
    const serveStats = {
      aces: setRallies.filter(r => r.serveResult === 'Ace').length,
      errors: setRallies.filter(r => r.serveResult === 'Error').length,
      inSystem: setRallies.filter(r => r.serveResult === 'In-System').length,
      outOfSystem: setRallies.filter(r => r.serveResult === 'Out-of-System').length,
      total: setRallies.filter(r => r.serveResult).length
    };

    const receiveStats = {
      errors: setRallies.filter(r => r.receiveResult === 'Error').length,
      overpass: setRallies.filter(r => r.receiveResult === 'Overpass').length,
      inSystem: setRallies.filter(r => r.receiveResult === 'In-System').length,
      outOfSystem: setRallies.filter(r => r.receiveResult === 'Out-of-System').length,
      total: setRallies.filter(r => r.receiveResult).length
    };

    // Match Flow (Cumulative point diff for current set)
    const flow: number[] = [];
    setRallies.reduce((acc, r) => {
      const newAcc = acc + (r.pointWinner === 'Us' ? 1 : -1);
      flow.push(newAcc);
      return newAcc;
    }, 0);

    // Suggested action (Set level focus)
    let suggestion = 'Keep pressure on the next point.';
    if (setRallies.slice(-6).filter(r => r.pointWinner === 'Opponent' && r.classification === 'Gifted').length >= 3) {
      suggestion = 'Gift Storm: Make them play the next three balls.';
    } else if (setRallies.slice(-10).filter(r => r.outcomeType === 'Serve Error').length >= 2) {
      suggestion = 'Serve Leak: Keep pressure, but serve in.';
    }

    // Win Probability Heuristic (Current Set)
    const targetScore = activeSet?.setNumber === 5 ? 15 : 25;
    const diff = (activeSet?.ourScore || 0) - (activeSet?.opponentScore || 0);
    const total = (activeSet?.ourScore || 0) + (activeSet?.opponentScore || 0);
    const progress = total / (targetScore * 1.5); 
    const winProb = Math.max(1, Math.min(99, Math.round(50 + (diff * 5 * (1 + progress)))));

    // Forecast Logic (Current Set trend)
    const forecastRallies = setRallies.slice(-5);
    const last3 = forecastRallies.slice(-3);
    const ourWins = forecastRallies.filter(r => r.pointWinner === 'Us').length;
    const ourGifts = forecastRallies.filter(r => r.pointWinner === 'Opponent' && r.classification === 'Gifted').length;
    const ourEarns = forecastRallies.filter(r => r.pointWinner === 'Us' && r.classification === 'Earned').length;
    const oppWinsLast3 = last3.filter(r => r.pointWinner === 'Opponent').length;
    
    let forecast = { 
      label: 'Clear Skies', 
      icon: Sun, 
      color: 'text-brand-text-secondary',
      interpretation: 'The set has just begun. Waiting for the first points to establish match flow.' 
    };

    // Only calculate forecast if points have been played in this set
    if (setRallies.length > 0) {
      forecast = { 
        label: 'Partly Cloudy', 
        icon: Cloud, 
        color: 'text-brand-text-secondary',
        interpretation: 'The match is in a neutral state. Neither team has established a dominant scoring pattern in the last 5 points.' 
      };

      // Prioritize recent slump
      if (oppWinsLast3 === 3) {
        forecast = { 
          label: 'Thunderstorm', 
          icon: CloudLightning, 
          color: 'text-brand-red',
          interpretation: 'Critical warning: The opponent has won the last 3 points. You need to break this run immediately.'
        };
      } else if (ourWins >= 4) {
        forecast = { 
          label: 'Sunny', 
          icon: Sun, 
          color: 'text-brand-green',
          interpretation: 'You are dominating the recent flow. You have won the vast majority of recent points, likely due to high execution and pressure.'
        };
      } else if (ourWins <= 1) {
        forecast = { 
          label: 'Thunderstorm', 
          icon: CloudLightning, 
          color: 'text-brand-red',
          interpretation: 'Critical warning: The opponent is on a major run. You need a timeout or a significant change in strategy to break their flow.'
        };
      } else if (ourGifts >= 2) {
        forecast = { 
          label: 'Stormy', 
          icon: CloudRain, 
          color: 'text-brand-amber',
          interpretation: 'You are gifting too many points. Focus on reducing unforced errors and making the opponent earn their points.'
        };
      } else if (ourEarns >= 3) {
        forecast = { 
          label: 'High Pressure', 
          icon: Zap, 
          color: 'text-brand-teal',
          interpretation: 'Your offense is clicking. You are actively earning points through kills, blocks, or aces. Keep attacking!'
        };
      }
    }

    // Match-wide Set Summaries
    const setIds = Array.from(new Set(matchRallies.map(r => r.setId)));
    const setSummaries = setIds.map(sid => {
      const setR = matchRallies.filter(r => r.setId === sid);
      const lastRally = setR[setR.length - 1];
      return {
        id: sid,
        setNumber: matchRallies.find(r => r.setId === sid)?.rallyNumber || 0, // Placeholder for sorting
        score: lastRally ? `${lastRally.scoreAfterUs}-${lastRally.scoreAfterOpponent}` : '0-0',
        ourEarned: setR.filter(r => r.pointWinner === 'Us' && r.classification === 'Earned').length,
        ourGifted: setR.filter(r => r.pointWinner === 'Opponent' && r.classification === 'Gifted').length,
        serveKO: Math.round((setR.filter(r => r.servingTeam === 'Us' && (r.serveResult === 'Ace' || r.serveResult === 'Out-of-System')).length / (setR.filter(r => r.servingTeam === 'Us' && r.serveResult).length || 1)) * 100),
      };
    }).sort((a, b) => {
      // Find the actual set number from the set object if possible
      return a.id === activeSet?.id ? 1 : -1; 
    });

    return {
      ourEarned,
      ourGifted,
      oppEarned,
      oppGifted,
      recent10,
      flow,
      biggestLeak,
      biggestWeapon,
      suggestion,
      winProb,
      forecast,
      serveStats,
      receiveStats,
      setSummaries,
      matchTotals: {
        earned: matchRallies.filter(r => r.pointWinner === 'Us' && r.classification === 'Earned').length,
        gifted: matchRallies.filter(r => r.pointWinner === 'Opponent' && r.classification === 'Gifted').length,
        servePct: Math.round(((matchRallies.filter(r => r.servingTeam === 'Us' && r.serveResult && r.serveResult !== 'Error').length) / (matchRallies.filter(r => r.servingTeam === 'Us' && r.serveResult).length || 1)) * 100)
      },
      earner: earnerPlayer ? { name: earnerPlayer.lastName, count: topEarner[1], jersey: earnerPlayer.jerseyNumber } : null,
      gifter: gifterPlayer ? { name: gifterPlayer.lastName, count: topGifter[1], jersey: gifterPlayer.jerseyNumber } : null,
      serveMetrics: {
        our: (() => {
          const ourServes = setRallies.filter(r => r.servingTeam === 'Us' && r.serveResult);
          const total = ourServes.length;
          const errors = ourServes.filter(r => r.serveResult === 'Error').length;
          const kos = ourServes.filter(r => r.serveResult === 'Ace' || r.serveResult === 'Out-of-System').length;
          
          // Players with most misses (Match Level)
          const matchMissesByPlayer: Record<string, number> = {};
          matchRallies.filter(r => r.servingTeam === 'Us' && r.serveResult === 'Error' && r.serverPlayerId).forEach(r => {
            if (r.serverPlayerId) {
              matchMissesByPlayer[r.serverPlayerId] = (matchMissesByPlayer[r.serverPlayerId] || 0) + 1;
            }
          });
          
          const topMissers = Object.entries(matchMissesByPlayer)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([pid, count]) => ({
              name: players.find(p => p.id === pid)?.lastName || 'Unknown',
              count
            }));

          return {
            koPct: total > 0 ? Math.round((kos / total) * 100) : 0,
            servePct: total > 0 ? Math.round(((total - errors) / total) * 100) : 0,
            errors,
            topMissers
          };
        })(),
        opp: (() => {
          const oppServes = setRallies.filter(r => r.servingTeam === 'Opponent' && (r.receiveResult || r.outcomeType === 'Ace' || r.outcomeType === 'Serve Error'));
          const total = oppServes.length;
          const errors = setRallies.filter(r => r.servingTeam === 'Opponent' && r.outcomeType === 'Serve Error').length;
          const aces = setRallies.filter(r => r.servingTeam === 'Opponent' && r.outcomeType === 'Ace').length;
          const oos = setRallies.filter(r => r.servingTeam === 'Opponent' && r.receiveResult === 'Out-of-System').length;
          
          return {
            koPct: total > 0 ? Math.round(((aces + oos) / total) * 100) : 0,
            servePct: total > 0 ? Math.round(((total - errors) / total) * 100) : 0,
            errors
          };
        })()
      }
    };
  }, [rallies, players, activeSet]);

  if (!activeMatch || !activeSet) return null;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text p-6 max-w-lg mx-auto pb-24">
      <header className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/match/live')} className="text-brand-text-secondary hover:text-brand-text">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Match Weather</h1>
        <div className="w-6" />
      </header>

      <div className="space-y-6">
        {/* Suggestion Card */}
        <div className="bg-brand-teal/10 border border-brand-teal/30 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-2 text-brand-teal">
            <Zap size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">Commitment</span>
          </div>
          <p className="text-xl font-bold leading-tight">{metrics.suggestion}</p>
        </div>

        {/* Momentum Sparkline */}
        <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6 pb-6 border-b border-brand-gray/10">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-brand-teal uppercase tracking-widest mb-1">Us</span>
              <span className="text-4xl font-black text-brand-teal">{activeSet.ourScore}</span>
            </div>
            <div className="flex flex-col items-center opacity-20">
              <span className="text-lg font-black text-brand-text-secondary uppercase">SET {activeSet.setNumber}</span>
              <div className="h-0.5 w-12 bg-brand-text-secondary mt-1 rounded-full" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-brand-red uppercase tracking-widest mb-1">Them</span>
              <span className="text-4xl font-black text-brand-red">{activeSet.opponentScore}</span>
            </div>
          </div>

          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest">Match Flow</h3>
              <p className="text-[8px] text-brand-text-secondary font-bold uppercase mt-1">Live Trend</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-brand-teal">{metrics.winProb}%</span>
              <p className="text-[8px] font-bold text-brand-text-secondary uppercase">Win Prob</p>
            </div>
          </div>
          <div className="h-24 flex items-end gap-1 relative">
            {/* Visual background grid */}
            <div className="absolute inset-0 flex justify-between pointer-events-none opacity-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-full w-px bg-brand-text" />
              ))}
            </div>
            
            {metrics.flow.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-brand-text-secondary italic">No data yet</div>
            ) : metrics.flow.map((diff, i) => {
              const height = Math.min(Math.abs(diff) * 10, 100);
              const isPositive = diff >= 0;
              return (
                <div key={i} className="flex-1 flex flex-col justify-center h-full relative group">
                  <div 
                    className={`w-full rounded-full transition-all duration-500 shadow-sm ${
                      isPositive ? 'bg-brand-teal shadow-brand-teal/20' : 'bg-brand-red opacity-60 shadow-brand-red/20'
                    }`}
                    style={{ 
                      height: `${height}%`,
                      transform: `translateY(${isPositive ? '-50%' : '50%'})`
                    }}
                  />
                  {/* Vertical separator every 5 points for glancability */}
                  {(i + 1) % 5 === 0 && (
                    <div className="absolute inset-y-0 -right-0.5 w-px bg-brand-gray/10" />
                  )}
                </div>
              );
            })}
            <div className="absolute top-1/2 left-0 right-0 border-t border-brand-gray/20 pointer-events-none" />
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-bold text-brand-text-secondary uppercase">
            <span>Start</span>
            <span>Current: {metrics.flow[metrics.flow.length - 1] > 0 ? '+' : ''}{metrics.flow[metrics.flow.length - 1] || 0}</span>
          </div>
        </div>

        {/* Earned vs Gifted Balance - Tug of War Visualization */}
        <div className="space-y-4">
          <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest">Our Execution</h3>
                <p className="text-[10px] text-brand-text-secondary font-bold uppercase mt-1">Earned vs Gifted</p>
              </div>
              <div className="text-right">
                <span className={`text-xl font-black ${metrics.ourEarned >= metrics.ourGifted ? 'text-brand-green' : 'text-brand-amber'}`}>
                  {metrics.ourEarned - metrics.ourGifted > 0 ? '+' : ''}{metrics.ourEarned - metrics.ourGifted}
                </span>
              </div>
            </div>
            <div className="relative h-6 bg-brand-gray/10 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-brand-green transition-all duration-700 ease-out flex items-center justify-end px-3" 
                style={{ width: `${(metrics.ourEarned / ((metrics.ourEarned + metrics.ourGifted) || 1)) * 100}%` }}
              >
                {metrics.ourEarned > 0 && <span className="text-[10px] font-black text-brand-bg">+{metrics.ourEarned}</span>}
              </div>
              <div 
                className="h-full bg-brand-amber transition-all duration-700 ease-out flex items-center justify-start px-3" 
                style={{ width: `${(metrics.ourGifted / ((metrics.ourEarned + metrics.ourGifted) || 1)) * 100}%` }}
              >
                {metrics.ourGifted > 0 && <span className="text-[10px] font-black text-brand-bg">-{metrics.ourGifted}</span>}
              </div>
            </div>
          </div>

          <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest">Their Execution</h3>
                <p className="text-[10px] text-brand-text-secondary font-bold uppercase mt-1">Earned vs Gifted</p>
              </div>
              <div className="text-right">
                <span className={`text-xl font-black ${metrics.oppEarned >= metrics.oppGifted ? 'text-brand-text' : 'text-brand-gray'}`}>
                  {metrics.oppEarned - metrics.oppGifted > 0 ? '+' : ''}{metrics.oppEarned - metrics.oppGifted}
                </span>
              </div>
            </div>
            <div className="relative h-6 bg-brand-gray/10 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-brand-text transition-all duration-700 ease-out flex items-center justify-end px-3" 
                style={{ width: `${(metrics.oppEarned / ((metrics.oppEarned + metrics.oppGifted) || 1)) * 100}%` }}
              >
                {metrics.oppEarned > 0 && <span className="text-[10px] font-black text-brand-bg">+{metrics.oppEarned}</span>}
              </div>
              <div 
                className="h-full bg-brand-gray transition-all duration-700 ease-out flex items-center justify-start px-3" 
                style={{ width: `${(metrics.oppGifted / ((metrics.oppEarned + metrics.oppGifted) || 1)) * 100}%` }}
              >
                {metrics.oppGifted > 0 && <span className="text-[10px] font-black text-brand-bg">-{metrics.oppGifted}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Live Serve Percentages */}
        <div className="grid grid-cols-2 gap-4 -mt-2">
          <div className="px-4 py-3 bg-brand-teal/5 border border-brand-teal/10 rounded-2xl">
            <div className="flex justify-between items-end mb-1">
              <span className="text-[10px] font-black text-brand-teal uppercase">KO%</span>
              <span className="text-xl font-black text-brand-teal">{metrics.serveMetrics.our.koPct}%</span>
            </div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-black text-brand-text-secondary uppercase">Serve%</span>
              <span className="text-sm font-bold">{metrics.serveMetrics.our.servePct}%</span>
            </div>
            <div className="pt-2 border-t border-brand-teal/10">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-bold text-brand-red uppercase">Misses</span>
                <span className="text-xs font-black text-brand-red">{metrics.serveMetrics.our.errors}</span>
              </div>
              {metrics.serveMetrics.our.topMissers.map((m, i) => (
                <div key={i} className="flex justify-between text-[10px] opacity-70">
                  <span>{m.name}</span>
                  <span className="font-bold">{m.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 py-3 bg-brand-red/5 border border-brand-red/10 rounded-2xl">
            <div className="flex justify-between items-end mb-1">
              <span className="text-[10px] font-black text-brand-red uppercase">KO%</span>
              <span className="text-xl font-black text-brand-red">{metrics.serveMetrics.opp.koPct}%</span>
            </div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-black text-brand-text-secondary uppercase">Serve%</span>
              <span className="text-sm font-bold">{metrics.serveMetrics.opp.servePct}%</span>
            </div>
            <div className="pt-2 border-t border-brand-red/10">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold text-brand-red uppercase">Misses</span>
                <span className="text-xs font-black text-brand-red">{metrics.serveMetrics.opp.errors}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Serve & Receive Performance */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-5">
            <h3 className="text-[10px] font-bold text-brand-text-secondary uppercase mb-4 tracking-widest text-center">Serve</h3>
            
            <div className="h-2 w-full bg-brand-gray/10 rounded-full overflow-hidden mb-4 flex">
              <div className="h-full bg-brand-green" style={{ width: `${(metrics.serveStats.aces / (metrics.serveStats.total || 1)) * 100}%` }} />
              <div className="h-full bg-brand-teal" style={{ width: `${(metrics.serveStats.inSystem / (metrics.serveStats.total || 1)) * 100}%` }} />
              <div className="h-full bg-brand-amber" style={{ width: `${(metrics.serveStats.outOfSystem / (metrics.serveStats.total || 1)) * 100}%` }} />
              <div className="h-full bg-brand-red" style={{ width: `${(metrics.serveStats.errors / (metrics.serveStats.total || 1)) * 100}%` }} />
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-2">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 mb-0.5">
                  <Zap size={10} className="text-brand-green" />
                  <p className="text-lg font-black text-brand-green">{metrics.serveStats.aces}</p>
                </div>
                <p className="text-[8px] font-bold text-brand-text-secondary uppercase">Ace</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 mb-0.5">
                  <Cloud size={10} className="text-brand-teal" />
                  <p className="text-lg font-black text-brand-teal">{metrics.serveStats.inSystem}</p>
                </div>
                <p className="text-[8px] font-bold text-brand-text-secondary uppercase">InSys</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 mb-0.5">
                  <Sun size={10} className="text-brand-amber" />
                  <p className="text-lg font-black text-brand-amber">{metrics.serveStats.outOfSystem}</p>
                </div>
                <p className="text-[8px] font-bold text-brand-text-secondary uppercase">KO</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 mb-0.5">
                  <CloudRain size={10} className="text-brand-red" />
                  <p className="text-lg font-black text-brand-red">{metrics.serveStats.errors}</p>
                </div>
                <p className="text-[8px] font-bold text-brand-text-secondary uppercase">Err</p>
              </div>
            </div>
          </div>

          <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-5">
            <h3 className="text-[10px] font-bold text-brand-text-secondary uppercase mb-4 tracking-widest text-center">Receive</h3>
            
            <div className="h-2 w-full bg-brand-gray/10 rounded-full overflow-hidden mb-4 flex">
              <div className="h-full bg-brand-teal" style={{ width: `${(metrics.receiveStats.inSystem / (metrics.receiveStats.total || 1)) * 100}%` }} />
              <div className="h-full bg-brand-amber" style={{ width: `${(metrics.receiveStats.outOfSystem / (metrics.receiveStats.total || 1)) * 100}%` }} />
              <div className="h-full bg-brand-orange" style={{ width: `${(metrics.receiveStats.overpass / (metrics.receiveStats.total || 1)) * 100}%` }} />
              <div className="h-full bg-brand-red" style={{ width: `${(metrics.receiveStats.errors / (metrics.receiveStats.total || 1)) * 100}%` }} />
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-2">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 mb-0.5">
                  <Sun size={10} className="text-brand-teal" />
                  <p className="text-lg font-black text-brand-teal">{metrics.receiveStats.inSystem}</p>
                </div>
                <p className="text-[8px] font-bold text-brand-text-secondary uppercase">InSys</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 mb-0.5">
                  <Cloud size={10} className="text-brand-amber" />
                  <p className="text-lg font-black text-brand-amber">{metrics.receiveStats.outOfSystem}</p>
                </div>
                <p className="text-[8px] font-bold text-brand-text-secondary uppercase">KO</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 mb-0.5">
                  <AlertTriangle size={10} className="text-brand-orange" />
                  <p className="text-lg font-black text-brand-orange">{metrics.receiveStats.overpass}</p>
                </div>
                <p className="text-[8px] font-bold text-brand-text-secondary uppercase">Over</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 mb-0.5">
                  <CloudLightning size={10} className="text-brand-red" />
                  <p className="text-lg font-black text-brand-red">{metrics.receiveStats.errors}</p>
                </div>
                <p className="text-[8px] font-bold text-brand-text-secondary uppercase">Err</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Trend */}
        <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-brand-text-secondary uppercase">Recent Trend</h3>
            <button 
              onClick={() => setShowForecastModal(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-gray/5 border border-brand-gray/10 active:scale-95 transition-all ${metrics.forecast.color}`}
            >
              {React.createElement(metrics.forecast.icon, { size: 18 })}
              <span className="font-black uppercase text-xs tracking-tighter">{metrics.forecast.label}</span>
              <Info size={12} className="opacity-50" />
            </button>
          </div>
          <div className="flex justify-between gap-1">
            {[...Array(10)].map((_, i) => {
              const rally = metrics.recent10[i];
              if (!rally) return <div key={i} className="flex-1 aspect-square bg-brand-gray/10 rounded-md"></div>;
              
              const isUs = rally.winner === 'Us';
              const isEarned = rally.classification === 'Earned';
              const isGifted = rally.classification === 'Gifted';

              return (
                <div 
                  key={i} 
                  className={`flex-1 aspect-square rounded-md flex items-center justify-center ${
                    isUs ? 'bg-brand-teal' : 'bg-brand-red'
                  }`}
                >
                  {isEarned && <Sun size={12} className="text-brand-bg" />}
                  {isGifted && <CloudRain size={12} className="text-brand-bg" />}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[8px] font-bold text-brand-text-secondary uppercase tracking-widest">
            <span>Older</span>
            <span>Recent &rarr;</span>
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
            <h3 className="text-sm font-bold text-brand-text-secondary uppercase mb-4">Player Leaders (Match)</h3>
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

        {/* Match History & Cumulative */}
        <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl overflow-hidden">
          <div className="p-6 bg-brand-teal/5 border-b border-brand-gray/10">
            <h3 className="text-sm font-bold text-brand-teal uppercase tracking-widest">Match History</h3>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <p className="text-xl font-black">{metrics.matchTotals.earned}</p>
                <p className="text-[8px] font-bold text-brand-text-secondary uppercase">Tot Earned</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-black">{metrics.matchTotals.gifted}</p>
                <p className="text-[8px] font-bold text-brand-text-secondary uppercase">Tot Gifted</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-black text-brand-teal">{metrics.matchTotals.servePct}%</p>
                <p className="text-[8px] font-bold text-brand-text-secondary uppercase">Serve In</p>
              </div>
            </div>
          </div>
          <div className="p-2">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[8px] font-black text-brand-text-secondary uppercase border-b border-brand-gray/10">
                  <th className="p-3">Set</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">E/G</th>
                  <th className="p-3">Srv KO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-gray/5">
                {metrics.setSummaries.map((set, i) => (
                  <tr key={set.id} className={`text-xs ${set.id === activeSet.id ? 'bg-brand-teal/5 font-bold' : ''}`}>
                    <td className="p-3 font-black text-brand-text-secondary">#{i + 1}</td>
                    <td className="p-3 font-bold">{set.score}</td>
                    <td className="p-3">
                      <span className="text-brand-green">+{set.ourEarned}</span>
                      <span className="mx-1 text-brand-text-secondary">/</span>
                      <span className="text-brand-amber">-{set.ourGifted}</span>
                    </td>
                    <td className="p-3">{set.serveKO}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Forecast Modal */}
      {showForecastModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm" onClick={() => setShowForecastModal(false)} />
          <div className="relative bg-brand-bg border border-brand-gray/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowForecastModal(false)}
              className="absolute top-6 right-6 text-brand-text-secondary hover:text-brand-text"
            >
              <X size={24} />
            </button>
            
            <div className={`flex items-center gap-3 mb-6 ${metrics.forecast.color}`}>
              {React.createElement(metrics.forecast.icon, { size: 32 })}
              <h2 className="text-2xl font-black uppercase tracking-tighter">{metrics.forecast.label}</h2>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-brand-text-secondary uppercase tracking-widest">Interpretation</h3>
              <p className="text-lg font-medium leading-relaxed">
                {metrics.forecast.interpretation}
              </p>
            </div>
            
            <button 
              onClick={() => setShowForecastModal(false)}
              className="mt-8 w-full py-4 bg-brand-gray/5 border border-brand-gray/10 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-brand-gray/10 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
