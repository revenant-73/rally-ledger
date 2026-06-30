import { useMemo } from 'react';
import { Sun, Cloud, CloudLightning, CloudRain, Zap } from 'lucide-react';
import type { RallyEvent, Player, Set as MatchSet } from '../../types';

export const useDashboardMetrics = (
  rallies: RallyEvent[],
  players: Player[],
  activeSet: MatchSet | null
) => {
  return useMemo(() => {
    if (!activeSet) return null;

    // Separate rallies by set context
    const setRallies = rallies.filter(r => r.setId === activeSet.id);
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
    const biggestLeak = Object.entries(leakCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    // Find biggest weapon (Match level)
    const earnedByUs = matchRallies.filter(r => r.pointWinner === 'Us' && r.classification === 'Earned');
    const weaponCounts: Record<string, number> = {};
    earnedByUs.forEach(r => {
      weaponCounts[r.outcomeType] = (weaponCounts[r.outcomeType] || 0) + 1;
    });
    const biggestWeapon = Object.entries(weaponCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

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

    const topEarners = Object.entries(playerEarned)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pid, count]) => {
        const p = players.find(player => player.id === pid);
        return p ? { name: p.lastName, count, jersey: p.jerseyNumber } : null;
      })
      .filter(Boolean);

    const topGifters = Object.entries(playerGifted)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pid, count]) => {
        const p = players.find(player => player.id === pid);
        return p ? { name: p.lastName, count, jersey: p.jerseyNumber } : null;
      })
      .filter(Boolean);

    // Player Serving Stats (Match level)
    const playerServes: Record<string, { total: number, errors: number, kos: number }> = {};
    matchRallies.forEach(r => {
      if (r.servingTeam === 'Us' && r.serverPlayerId && r.serveResult) {
        if (!playerServes[r.serverPlayerId]) {
          playerServes[r.serverPlayerId] = { total: 0, errors: 0, kos: 0 };
        }
        playerServes[r.serverPlayerId].total++;
        if (r.serveResult === 'Error') playerServes[r.serverPlayerId].errors++;
        if (r.serveResult === 'Ace' || r.serveResult === 'Out-of-System') playerServes[r.serverPlayerId].kos++;
      }
    });

    const servingByPlayer = Object.entries(playerServes)
      .map(([pid, stats]) => {
        const p = players.find(player => player.id === pid);
        return p ? {
          name: p.lastName,
          jersey: p.jerseyNumber,
          koPct: Math.round((stats.kos / stats.total) * 100),
          servePct: Math.round(((stats.total - stats.errors) / stats.total) * 100)
        } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (b?.koPct || 0) - (a?.koPct || 0));

    // Player Passing Stats (Match level)
    const playerPassing: Record<string, { ace: number, overpass: number, oos: number, is: number, total: number }> = {};
    matchRallies.forEach(r => {
      if (r.servingTeam === 'Opponent' && r.receivePlayerId && r.receiveResult) {
        if (!playerPassing[r.receivePlayerId]) {
          playerPassing[r.receivePlayerId] = { ace: 0, overpass: 0, oos: 0, is: 0, total: 0 };
        }
        playerPassing[r.receivePlayerId].total++;
        if (r.receiveResult === 'Error') playerPassing[r.receivePlayerId].ace++;
        if (r.receiveResult === 'Overpass') playerPassing[r.receivePlayerId].overpass++;
        if (r.receiveResult === 'Out-of-System') playerPassing[r.receivePlayerId].oos++;
        if (r.receiveResult === 'In-System') playerPassing[r.receivePlayerId].is++;
      }
    });

    const passingByPlayer = Object.entries(playerPassing)
      .map(([pid, stats]) => {
        const p = players.find(player => player.id === pid);
        const score = stats.total > 0 
          ? Number(((stats.ace * 0 + stats.overpass * 1 + stats.oos * 2 + stats.is * 3) / stats.total).toFixed(2))
          : 0;
        return p ? {
          name: p.lastName,
          jersey: p.jerseyNumber,
          ace: stats.ace,
          overpass: stats.overpass,
          oos: stats.oos,
          is: stats.is,
          score
        } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (b?.score || 0) - (a?.score || 0));

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
    const targetScore = activeSet.setNumber === 5 ? 15 : 25;
    const diff = (activeSet.ourScore || 0) - (activeSet.opponentScore || 0);
    const total = (activeSet.ourScore || 0) + (activeSet.opponentScore || 0);
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
      return a.id === activeSet.id ? 1 : b.id === activeSet.id ? -1 : 0; 
    });

    const ourServesMatch = matchRallies.filter(r => r.servingTeam === 'Us' && r.serveResult);
    const ourServesMatchTotal = ourServesMatch.length;
    const ourServesMatchErrors = ourServesMatch.filter(r => r.serveResult === 'Error').length;

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
        servePct: Math.round(((ourServesMatchTotal - ourServesMatchErrors) / (ourServesMatchTotal || 1)) * 100)
      },
      topEarners: topEarners as { name: string, count: number, jersey: string }[],
      topGifters: topGifters as { name: string, count: number, jersey: string }[],
      servingByPlayer: servingByPlayer as { name: string, jersey: string, koPct: number, servePct: number }[],
      passingByPlayer: passingByPlayer as { name: string, jersey: string, ace: number, overpass: number, oos: number, is: number, score: number }[],
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
};
