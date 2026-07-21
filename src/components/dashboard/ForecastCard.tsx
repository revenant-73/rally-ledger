import React from 'react';
import { Info } from 'lucide-react';
import { motion } from 'framer-motion';

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
      {/* Animated background pulse based on "weather" */}
      <motion.div 
        className={`absolute inset-0 opacity-10 ${color.replace('text-', 'bg-')}`}
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.05, 0.15, 0.05]
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity,
          ease: "easeInOut" 
        }}
      />

      <div className="flex justify-between items-start mb-6 relative z-10">
        <div>
          <h3 className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest">Live Forecast</h3>
          <p className="text-[10px] text-brand-text-secondary font-bold uppercase mt-1">Current Momentum</p>
        </div>
        <button onClick={onInfoClick} className="text-brand-text-secondary opacity-50 hover:opacity-100 transition-opacity">
          <Info size={20} />
        </button>
      </div>

      <div className="flex items-center gap-6 relative z-10">
        <motion.div 
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          className={`p-5 rounded-3xl bg-brand-bg border border-brand-gray/10 shadow-sm ${color}`}
        >
          <Icon size={48} />
        </motion.div>
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
