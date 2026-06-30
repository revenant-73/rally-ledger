import React from 'react';
import { Wind, Zap, ShieldCheck } from 'lucide-react';
import { calculateAdvancedStats } from '../../utils/stats';
import type { RallyEvent } from '../../types';

interface AdvancedWeatherStatsProps {
  rallies: RallyEvent[];
}

const AdvancedWeatherStats: React.FC<AdvancedWeatherStatsProps> = ({ rallies }) => {
  const stats = calculateAdvancedStats(rallies);

  const items = [
    {
      label: 'SO%',
      fullLabel: 'Side-Out Percentage',
      value: `${stats.sideOutPercentage.toFixed(0)}%`,
      description: 'Efficiency when receiving',
      icon: <ShieldCheck className="text-brand-teal" size={20} />,
      color: 'bg-brand-teal/10 border-brand-teal/20',
      textColor: 'text-brand-teal'
    },
    {
      label: 'PS%',
      fullLabel: 'Point Scoring Percentage',
      value: `${stats.pointScoringPercentage.toFixed(0)}%`,
      description: 'Efficiency when serving',
      icon: <Zap className="text-brand-amber" size={20} />,
      color: 'bg-brand-amber/10 border-brand-amber/20',
      textColor: 'text-brand-amber'
    },
    {
      label: 'FBSO%',
      fullLabel: 'First Ball Side-Out',
      value: `${stats.firstBallSideOutPercentage.toFixed(0)}%`,
      description: 'Kill on first receive',
      icon: <Wind className="text-brand-green" size={20} />,
      color: 'bg-brand-green/10 border-brand-green/20',
      textColor: 'text-brand-green'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {items.map((item) => (
        <div key={item.label} className={`${item.color} border rounded-3xl p-5 flex flex-col`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {item.icon}
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{item.label}</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-black ${item.textColor}`}>{item.value}</span>
          </div>
          <p className="text-[10px] font-bold text-brand-text-secondary uppercase mt-1">{item.description}</p>
        </div>
      ))}
    </div>
  );
};

export default AdvancedWeatherStats;
