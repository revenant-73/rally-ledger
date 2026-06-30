import React from 'react';
import { Info } from 'lucide-react';

interface ForecastCardProps {
  label: string;
  icon: React.ElementType;
  color: string;
  interpretation: string;
  onInfoClick: () => void;
}

const ForecastCard: React.FC<ForecastCardProps> = ({
  label,
  icon: Icon,
  color,
  interpretation,
  onInfoClick,
}) => {
  return (
    <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6 relative overflow-hidden group">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest">Live Forecast</h3>
          <p className="text-[10px] text-brand-text-secondary font-bold uppercase mt-1">Current Momentum</p>
        </div>
        <button onClick={onInfoClick} className="text-brand-text-secondary opacity-50 hover:opacity-100 transition-opacity">
          <Info size={20} />
        </button>
      </div>

      <div className="flex items-center gap-6">
        <div className={`p-5 rounded-3xl bg-brand-bg border border-brand-gray/10 shadow-sm ${color}`}>
          <Icon size={48} />
        </div>
        <div>
          <span className={`text-4xl font-black uppercase tracking-tight ${color}`}>{label}</span>
          <p className="text-sm font-medium text-brand-text-secondary mt-1 leading-tight">
            {interpretation.split(':')[0]}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForecastCard;
