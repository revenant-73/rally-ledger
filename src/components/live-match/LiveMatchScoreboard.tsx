import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveMatchScoreboardProps {
  ourScore: number;
  opponentScore: number;
  ourName: string;
  opponentName: string;
  onManualScoreChange: (team: 'Us' | 'Opponent', delta: number) => void;
  servingTeam: 'Us' | 'Opponent';
  onToggleServingTeam: () => void;
}

const LiveMatchScoreboard: React.FC<LiveMatchScoreboardProps> = ({
  ourScore,
  opponentScore,
  ourName,
  opponentName,
  onManualScoreChange,
  servingTeam,
  onToggleServingTeam,
}) => {
  return (
    <div className="px-4 py-2 space-y-2">
      <div className="grid grid-cols-2 gap-3">
        {/* Us Score */}
        <div className="flex flex-col gap-1.5">
          <div className="bg-brand-gray/5 rounded-2xl flex flex-col items-center justify-center border border-brand-teal/20 h-24 relative overflow-hidden">
            <span className="text-[10px] text-brand-text-secondary font-black uppercase tracking-widest relative z-10">Us</span>
            <AnimatePresence mode="popLayout">
              <motion.span 
                key={ourScore}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="text-5xl font-black text-brand-teal leading-none relative z-10"
              >
                {ourScore}
              </motion.span>
            </AnimatePresence>
            {servingTeam === 'Us' && (
              <motion.div 
                layoutId="serving-indicator-bg"
                className="absolute inset-0 bg-brand-teal/5 animate-pulse"
              />
            )}
          </div>
          <div className="flex gap-1.5">
            <button 
              onClick={() => onManualScoreChange('Us', -1)}
              className="flex-1 bg-brand-gray/5 h-10 rounded-xl flex items-center justify-center text-brand-text-secondary active:bg-brand-red/20 active:text-brand-red transition-all border border-brand-gray/10"
            >
              <Minus size={18} />
            </button>
            <button 
              onClick={() => onManualScoreChange('Us', 1)}
              className="flex-1 bg-brand-gray/5 h-10 rounded-xl flex items-center justify-center text-brand-text-secondary active:bg-brand-teal/20 active:text-brand-teal transition-all border border-brand-gray/10"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Them Score */}
        <div className="flex flex-col gap-1.5">
          <div className="bg-brand-gray/5 rounded-2xl flex flex-col items-center justify-center border border-brand-red/20 h-24 relative overflow-hidden">
            <span className="text-[10px] text-brand-text-secondary font-black uppercase tracking-widest relative z-10">Them</span>
            <AnimatePresence mode="popLayout">
              <motion.span 
                key={opponentScore}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="text-5xl font-black text-brand-red leading-none relative z-10"
              >
                {opponentScore}
              </motion.span>
            </AnimatePresence>
            {servingTeam === 'Opponent' && (
              <motion.div 
                layoutId="serving-indicator-bg"
                className="absolute inset-0 bg-brand-red/5 animate-pulse"
              />
            )}
          </div>
          <div className="flex gap-1.5">
            <button 
              onClick={() => onManualScoreChange('Opponent', -1)}
              className="flex-1 bg-brand-gray/5 h-10 rounded-xl flex items-center justify-center text-brand-text-secondary active:bg-brand-red/20 active:text-brand-red transition-all border border-brand-gray/10"
            >
              <Minus size={18} />
            </button>
            <button 
              onClick={() => onManualScoreChange('Opponent', 1)}
              className="flex-1 bg-brand-gray/5 h-10 rounded-xl flex items-center justify-center text-brand-text-secondary active:bg-brand-teal/20 active:text-brand-teal transition-all border border-brand-gray/10"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Server Status */}
      <div className="flex gap-2">
        <button 
          onClick={onToggleServingTeam}
          className={`flex-1 border rounded-2xl p-4 flex flex-col items-center justify-center active:scale-[0.98] transition-all relative overflow-hidden ${
            servingTeam === 'Us' ? 'bg-brand-teal/10 border-brand-teal/30 text-brand-teal' : 'bg-brand-red/10 border-brand-red/30 text-brand-red'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`w-1.5 h-1.5 rounded-full ${servingTeam === 'Us' ? 'bg-brand-teal' : 'bg-brand-red'}`}
            />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Serving Now</span>
          </div>
          <span className="text-xl font-black uppercase tracking-tight leading-none italic">
            {servingTeam === 'Us' ? ourName : opponentName}
          </span>
        </button>
      </div>
    </div>
  );
};

export default LiveMatchScoreboard;
