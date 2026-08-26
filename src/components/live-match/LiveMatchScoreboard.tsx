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
  const scoreCardClass = "relative flex min-h-16 items-center justify-between overflow-hidden rounded-xl border bg-[#0f1117] px-3 py-2 shadow-inner";
  const scoreButtonClass = "flex h-7 w-9 items-center justify-center rounded-lg border border-brand-gray/30 bg-brand-bg text-brand-text active:scale-95 active:border-brand-teal active:text-brand-teal transition-all";

  return (
    <div className="px-3 py-1.5 space-y-1.5">
      <div className="grid grid-cols-2 gap-2">
        {/* Us Score */}
        <div className={`${scoreCardClass} border-brand-teal/50`}>
          <div className="relative z-10 min-w-0">
            <span className="block text-[9px] text-brand-text font-black uppercase tracking-widest">Us</span>
            <AnimatePresence mode="popLayout">
              <motion.span 
                key={ourScore}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="block text-4xl font-black text-brand-teal leading-none"
              >
                {ourScore}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="relative z-10 flex flex-col gap-1">
            <button
              onClick={() => onManualScoreChange('Us', -1)}
              aria-label="Decrease our score"
              className={scoreButtonClass}
            >
              <Minus size={15} />
            </button>
            <button
              onClick={() => onManualScoreChange('Us', 1)}
              aria-label="Increase our score"
              className={scoreButtonClass}
            >
              <Plus size={15} />
            </button>
          </div>
          {servingTeam === 'Us' && (
            <motion.div
              layoutId="serving-indicator-bg"
              className="absolute inset-0 bg-brand-teal/10"
            />
          )}
        </div>

        {/* Them Score */}
        <div className={`${scoreCardClass} border-brand-red/50`}>
          <div className="relative z-10 min-w-0">
            <span className="block text-[9px] text-brand-text font-black uppercase tracking-widest">Them</span>
            <AnimatePresence mode="popLayout">
              <motion.span 
                key={opponentScore}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="block text-4xl font-black text-brand-red leading-none"
              >
                {opponentScore}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="relative z-10 flex flex-col gap-1">
            <button
              onClick={() => onManualScoreChange('Opponent', -1)}
              aria-label="Decrease their score"
              className={scoreButtonClass}
            >
              <Minus size={15} />
            </button>
            <button
              onClick={() => onManualScoreChange('Opponent', 1)}
              aria-label="Increase their score"
              className={scoreButtonClass}
            >
              <Plus size={15} />
            </button>
          </div>
          {servingTeam === 'Opponent' && (
            <motion.div
              layoutId="serving-indicator-bg"
              className="absolute inset-0 bg-brand-red/10"
            />
          )}
        </div>
      </div>

      {/* Server Status */}
      <div className="flex gap-2">
        <button 
          onClick={onToggleServingTeam}
          className={`flex-1 border rounded-xl px-3 py-2 flex items-center justify-center gap-3 active:scale-[0.98] transition-all relative overflow-hidden ${
            servingTeam === 'Us' ? 'bg-brand-teal/15 border-brand-teal/60 text-brand-teal' : 'bg-brand-red/15 border-brand-red/60 text-brand-red'
          }`}
        >
          <div className="flex items-center gap-2">
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`h-2 w-2 rounded-full ${servingTeam === 'Us' ? 'bg-brand-teal' : 'bg-brand-red'}`}
            />
            <span className="text-[9px] font-black uppercase tracking-widest text-brand-text">Serving</span>
          </div>
          <span className="min-w-0 truncate text-sm font-black uppercase tracking-tight leading-none">
            {servingTeam === 'Us' ? ourName : opponentName}
          </span>
        </button>
      </div>
    </div>
  );
};

export default LiveMatchScoreboard;
