import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, AlertTriangle, CloudRain, Sun } from 'lucide-react';
import { useMatch } from '../hooks/useMatch';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { activeMatch, activeSet, rallies, players } = useMatch();

  const metrics = useMemo(() => {
    const ourEarned = rallies.filter(r => r.pointWinner === 'Us' && r.classification === 'Earned').length;
    const ourGifted = rallies.filter(r => r.pointWinner === 'Opponent' && r.classification === 'Gifted').length;
    const oppEarned = rallies.filter(r => r.pointWinner === 'Opponent' && r.classification === 'Earned').length;
    const oppGifted = rallies.filter(r => r.pointWinner === 'Us' && r.classification === 'Gifted').length;

    const last5 = rallies.slice(-5).map(r => ({
      winner: r.pointWinner,
      classification: r.classification
    }));

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

    // Momentum (Cumulative point diff)
    const momentum: number[] = [];
    rallies.reduce((acc, r) => {
      const newAcc = acc + (r.pointWinner === 'Us' ? 1 : -1);
      momentum.push(newAcc);
      return newAcc;
    }, 0);

    // Suggested action
    let suggestion = 'Keep pressure on the next point.';
    if (rallies.slice(-6).filter(r => r.pointWinner === 'Opponent' && r.classification === 'Gifted').length >= 3) {
      suggestion = 'Gift Storm: Make them play the next three balls.';
    } else if (rallies.slice(-10).filter(r => r.outcomeType === 'Serve Error').length >= 2) {
      suggestion = 'Serve Leak: Keep pressure, but serve in.';
    }

    return {
      ourEarned,
      ourGifted,
      oppEarned,
      oppGifted,
      last5,
      momentum,
      biggestLeak,
      biggestWeapon,
      suggestion,
      earner: earnerPlayer ? { name: earnerPlayer.lastName, count: topEarner[1], jersey: earnerPlayer.jerseyNumber } : null,
      gifter: gifterPlayer ? { name: gifterPlayer.lastName, count: topGifter[1], jersey: gifterPlayer.jerseyNumber } : null
    };
  }, [rallies, players]);

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
          <h3 className="text-sm font-bold text-brand-text-secondary uppercase mb-4 text-center tracking-widest">Match Momentum</h3>
          <div className="h-24 flex items-end gap-1">
            {metrics.momentum.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-brand-text-secondary italic">No data yet</div>
            ) : metrics.momentum.map((diff, i) => {
              const height = Math.min(Math.abs(diff) * 10, 100);
              const isPositive = diff >= 0;
              return (
                <div key={i} className="flex-1 flex flex-col justify-center h-full relative group">
                  <div 
                    className={`w-full rounded-full transition-all duration-500 ${isPositive ? 'bg-brand-teal' : 'bg-brand-red opacity-60'}`}
                    style={{ 
                      height: `${height}%`,
                      transform: `translateY(${isPositive ? '-50%' : '50%'})`
                    }}
                  />
                  <div className="absolute top-1/2 left-0 right-0 border-t border-brand-gray/20" />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-bold text-brand-text-secondary uppercase">
            <span>Start</span>
            <span>Current: {metrics.momentum[metrics.momentum.length - 1] > 0 ? '+' : ''}{metrics.momentum[metrics.momentum.length - 1] || 0}</span>
          </div>
        </div>

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

        {/* Recent Trend */}
        <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
          <h3 className="text-sm font-bold text-brand-text-secondary uppercase mb-4">Recent Trend (Last 5)</h3>
          <div className="flex justify-between gap-2">
            {[...Array(5)].map((_, i) => {
              const rally = metrics.last5[i];
              if (!rally) return <div key={i} className="flex-1 aspect-square bg-brand-gray/10 rounded-lg"></div>;
              
              const isUs = rally.winner === 'Us';
              const isEarned = rally.classification === 'Earned';
              const isGifted = rally.classification === 'Gifted';

              return (
                <div 
                  key={i} 
                  className={`flex-1 aspect-square rounded-lg flex items-center justify-center ${
                    isUs ? 'bg-brand-teal' : 'bg-brand-red'
                  }`}
                >
                  {isEarned && <Sun size={16} className="text-brand-bg" />}
                  {isGifted && <CloudRain size={16} className="text-brand-bg" />}
                </div>
              );
            })}
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
            <h3 className="text-sm font-bold text-brand-text-secondary uppercase mb-4">Player Leaders</h3>
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
      </div>
    </div>
  );
};

export default Dashboard;
