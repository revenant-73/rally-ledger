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

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { activeMatch, activeSet, rallies, players } = useMatch();
  const [showForecastModal, setShowForecastModal] = useState(false);
  
  const metrics = useDashboardMetrics(rallies, players, activeSet);

  if (!activeMatch || !activeSet || !metrics) return null;

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
        <CommitmentCard suggestion={metrics.suggestion} />

        <MatchFlow 
          ourScore={activeSet.ourScore}
          opponentScore={activeSet.opponentScore}
          setNumber={activeSet.setNumber}
          winProb={metrics.winProb}
          flow={metrics.flow}
        />

        <ForecastCard 
          label={metrics.forecast.label}
          icon={metrics.forecast.icon}
          color={metrics.forecast.color}
          interpretation={metrics.forecast.interpretation}
          onInfoClick={() => setShowForecastModal(true)}
        />

        <EarnedGiftedComparison 
          ourEarned={metrics.ourEarned}
          ourGifted={metrics.ourGifted}
          oppEarned={metrics.oppEarned}
          oppGifted={metrics.oppGifted}
        />

        <ServeReceivePerformance 
          serveStats={metrics.serveStats}
          receiveStats={metrics.receiveStats}
          serveMetrics={metrics.serveMetrics}
        />

        <PlayerLeaderboard 
          topEarners={metrics.topEarners}
          topGifters={metrics.topGifters}
        />

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

      <ForecastModal 
        isOpen={showForecastModal}
        onClose={() => setShowForecastModal(false)}
        forecast={metrics.forecast}
      />
    </div>
  );
};

export default Dashboard;
