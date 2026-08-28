import { useMemo } from 'react';
import type { RallyEvent, Player } from '../types';
import { getReceiveResult, getServeResult } from '../utils/rallyResults';

interface PlayerServeStat {
  aces: number;
  errors: number;
  inSystem: number;
  outOfSystem: number;
  total: number;
}

interface PlayerReceiveStat {
  errors: number;
  overpass: number;
  inSystem: number;
  outOfSystem: number;
  total: number;
}

export const useMatchDetailMetrics = (
  rallies: RallyEvent[],
  players: Player[]
) => {
  return useMemo(() => {
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
    const biggestLeak = Object.entries(leakCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    // Find biggest weapon
    const earnedByUs = rallies.filter(r => r.pointWinner === 'Us' && r.classification === 'Earned');
    const weaponCounts: Record<string, number> = {};
    earnedByUs.forEach(r => {
      weaponCounts[r.outcomeType] = (weaponCounts[r.outcomeType] || 0) + 1;
    });
    const biggestWeapon = Object.entries(weaponCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

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

    // Individual stats
    const playerServeStats: Record<string, PlayerServeStat> = {};
    const playerReceiveStats: Record<string, PlayerReceiveStat> = {};

    rallies.forEach(r => {
      const serveResult = getServeResult(r);
      const receiveResult = getReceiveResult(r);

      if (serveResult && r.serverPlayerId) {
        if (!playerServeStats[r.serverPlayerId]) {
          playerServeStats[r.serverPlayerId] = { aces: 0, errors: 0, inSystem: 0, outOfSystem: 0, total: 0 };
        }
        playerServeStats[r.serverPlayerId].total++;
        if (serveResult === 'Ace') playerServeStats[r.serverPlayerId].aces++;
        if (serveResult === 'Error') playerServeStats[r.serverPlayerId].errors++;
        if (serveResult === 'In-System') playerServeStats[r.serverPlayerId].inSystem++;
        if (serveResult === 'Out-of-System') playerServeStats[r.serverPlayerId].outOfSystem++;
      }
      if (receiveResult && r.receivePlayerId) {
        if (!playerReceiveStats[r.receivePlayerId]) {
          playerReceiveStats[r.receivePlayerId] = { errors: 0, overpass: 0, inSystem: 0, outOfSystem: 0, total: 0 };
        }
        playerReceiveStats[r.receivePlayerId].total++;
        if (receiveResult === 'Error') playerReceiveStats[r.receivePlayerId].errors++;
        if (receiveResult === 'Overpass') playerReceiveStats[r.receivePlayerId].overpass++;
        if (receiveResult === 'In-System') playerReceiveStats[r.receivePlayerId].inSystem++;
        if (receiveResult === 'Out-of-System') playerReceiveStats[r.receivePlayerId].outOfSystem++;
      }
    });

    // Serve & Receive Stats
    const serveResults = rallies.map(getServeResult).filter(Boolean);
    const receiveResults = rallies.map(getReceiveResult).filter(Boolean);
    const serveStats = {
      aces: serveResults.filter(result => result === 'Ace').length,
      errors: serveResults.filter(result => result === 'Error').length,
      inSystem: serveResults.filter(result => result === 'In-System').length,
      outOfSystem: serveResults.filter(result => result === 'Out-of-System').length,
      total: serveResults.length
    };

    const receiveStats = {
      errors: receiveResults.filter(result => result === 'Error').length,
      overpass: receiveResults.filter(result => result === 'Overpass').length,
      inSystem: receiveResults.filter(result => result === 'In-System').length,
      outOfSystem: receiveResults.filter(result => result === 'Out-of-System').length,
      total: receiveResults.length
    };

    return {
      ourEarned,
      ourGifted,
      oppEarned,
      oppGifted,
      biggestLeak,
      biggestWeapon,
      earner: earnerPlayer ? { name: earnerPlayer.firstName, count: topEarner[1], jersey: earnerPlayer.jerseyNumber } : null,
      gifter: gifterPlayer ? { name: gifterPlayer.firstName, count: topGifter[1], jersey: gifterPlayer.jerseyNumber } : null,
      serveStats,
      receiveStats,
      playerServeStats,
      playerReceiveStats
    };
  }, [rallies, players]);
};
