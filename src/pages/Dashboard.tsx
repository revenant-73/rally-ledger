import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useMatch } from '../hooks/useMatch';
import { useDashboardMetrics } from '../hooks/dashboard/useDashboardMetrics';

// Components
import CommitmentCard from '../components/dashboard/CommitmentCard';
import MatchFlow from '../components/dashboard/MatchFlow';
import ForecastCard from '../components/dashboard/ForecastCard';
import EarnedGiftedComparison from '../components/dashboard/EarnedGiftedComparison';
import ServeReceivePerformance from '../components/dashboard/ServeReceivePerformance';
import PlayerLeaderboard from '../components/dashboard/PlayerLeaderboard';
import SkillDetailCard from '../components/dashboard/SkillDetailCard';
import SetSummaries from '../components/dashboard/SetSummaries';
import ForecastModal from '../components/dashboard/ForecastModal';
import AdvancedWeatherStats from '../components/dashboard/AdvancedWeatherStats';
import RotationEfficiency from '../components/dashboard/RotationEfficiency';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { activeMatch, activeSet, rallies, players } = useMatch();
  const [showForecastModal, setShowForecastModal] = useState(false);
  
  const metrics = useDashboardMetrics(rallies, players, activeSet);

  if (!activeMatch || !activeSet || !metrics) return null;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text p-4 md:p-8 max-w-5xl mx-auto pb-24">
      <header className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/match/live')} className="p-2 hover:bg-brand-gray/10 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-black uppercase tracking-tighter italic">Match Weather</h1>
          <p className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-widest">{activeMatch.opponentName} @ Set {activeSet.setNumber}</p>
        </div>
        <div className="w-10" />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Momentum & Forecast */}
        <div className="lg:col-span-4 space-y-6">
          <ForecastCard 
            label={metrics.forecast.label}
            icon={metrics.forecast.icon}
            color={metrics.forecast.color}
            interpretation={metrics.forecast.interpretation}
            onInfoClick={() => setShowForecastModal(true)}
          />
          <CommitmentCard suggestion={metrics.suggestion} />
          <AdvancedWeatherStats rallies={rallies} />
        </div>

        {/* Middle Column - Match Flow & Execution */}
        <div className="lg:col-span-5 space-y-6">
          <MatchFlow 
            ourScore={activeSet.ourScore}
            opponentScore={activeSet.opponentScore}
            setNumber={activeSet.setNumber}
            winProb={metrics.winProb}
            flow={metrics.flow}
          />
          <EarnedGiftedComparison 
            ourEarned={metrics.ourEarned}
            ourGifted={metrics.ourGifted}
            oppEarned={metrics.oppEarned}
            oppGifted={metrics.oppGifted}
          />
          <RotationEfficiency rallies={rallies} />
        </div>

        {/* Right Column - Player Stats */}
        <div className="lg:col-span-3 space-y-6">
          <PlayerLeaderboard 
            topEarners={metrics.topEarners}
            topGifters={metrics.topGifters}
          />
          <ServeReceivePerformance 
            serveStats={metrics.serveStats}
            receiveStats={metrics.receiveStats}
            serveMetrics={metrics.serveMetrics}
          />
        </div>

        {/* Full Width Bottom */}
        <div className="lg:col-span-12 space-y-6">
          <SkillDetailCard 
            servingByPlayer={metrics.servingByPlayer}
            passingByPlayer={metrics.passingByPlayer}
          />
          <SetSummaries 
            setSummaries={metrics.setSummaries}
            matchTotals={metrics.matchTotals}
            activeSetId={activeSet.id}
          />
        </div>
      </div>

      <ForecastModal 
        isOpen={showForecastModal}
        onClose={() => setShowForecastModal(false)}
        forecast={metrics.forecast}
      />
    </div>
  );
};

export default Dashboard;
