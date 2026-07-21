import React from 'react';
import { motion } from 'framer-motion';

interface EarnedGiftedComparisonProps {
  ourEarned: number;
  ourGifted: number;
  oppEarned: number;
  oppGifted: number;
}

const EarnedGiftedComparison: React.FC<EarnedGiftedComparisonProps> = ({
  ourEarned,
  ourGifted,
  oppEarned,
  oppGifted,
}) => {
  return (
    <div className="space-y-4">
      {/* Our Execution */}
      <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest">Our Execution</h3>
            <p className="text-[10px] text-brand-text-secondary font-bold uppercase mt-1">Earned vs Leaks</p>
          </div>
          <div className="text-right">
            <motion.span 
              key={ourEarned - ourGifted}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`text-xl font-black ${ourEarned >= ourGifted ? 'text-brand-green' : 'text-brand-amber'}`}
            >
              {ourEarned - ourGifted > 0 ? '+' : ''}{ourEarned - ourGifted}
            </motion.span>
          </div>
        </div>
        <div className="relative h-6 bg-brand-gray/10 rounded-full overflow-hidden flex">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(ourEarned / ((ourEarned + ourGifted) || 1)) * 100}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-brand-green flex items-center justify-end px-3" 
          >
            {ourEarned > 0 && <span className="text-[10px] font-black text-brand-bg whitespace-nowrap">+{ourEarned}</span>}
          </motion.div>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(ourGifted / ((ourEarned + ourGifted) || 1)) * 100}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-brand-amber flex items-center justify-start px-3" 
          >
            {ourGifted > 0 && <span className="text-[10px] font-black text-brand-bg whitespace-nowrap">-{ourGifted}</span>}
          </motion.div>
        </div>
      </div>

      {/* Their Execution */}
      <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest">Their Execution</h3>
            <p className="text-[10px] text-brand-text-secondary font-bold uppercase mt-1">Earned vs Given</p>
          </div>
          <div className="text-right">
            <motion.span 
              key={oppEarned - oppGifted}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`text-xl font-black ${oppEarned >= oppGifted ? 'text-brand-text' : 'text-brand-gray'}`}
            >
              {oppEarned - oppGifted > 0 ? '+' : ''}{oppEarned - oppGifted}
            </motion.span>
          </div>
        </div>
        <div className="relative h-6 bg-brand-gray/10 rounded-full overflow-hidden flex">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(oppEarned / ((oppEarned + oppGifted) || 1)) * 100}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-brand-text flex items-center justify-end px-3" 
          >
            {oppEarned > 0 && <span className="text-[10px] font-black text-brand-bg whitespace-nowrap">+{oppEarned}</span>}
          </motion.div>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(oppGifted / ((oppEarned + oppGifted) || 1)) * 100}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-brand-gray flex items-center justify-start px-3" 
          >
            {oppGifted > 0 && <span className="text-[10px] font-black text-brand-bg whitespace-nowrap">-{oppGifted}</span>}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default EarnedGiftedComparison;
