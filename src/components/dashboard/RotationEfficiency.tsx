import React from 'react';
import { motion } from 'framer-motion';
import { calculateRotationBreakdown } from '../../utils/stats';
import type { RallyEvent } from '../../types';

interface RotationEfficiencyProps {
  rallies: RallyEvent[];
}

const RotationEfficiency: React.FC<RotationEfficiencyProps> = ({ rallies }) => {
  const breakdown = calculateRotationBreakdown(rallies);

  return (
    <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6 mb-6">
      <h3 className="text-sm font-black text-brand-teal uppercase tracking-widest mb-6">Rotation Efficiency</h3>
      
      <div className="space-y-6">
        {breakdown.map((rot) => (
          <div key={rot.rotation} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-tight">Rotation {rot.rotation}</span>
              <div className="flex gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-lg font-black text-brand-teal">{rot.sideOutPercentage.toFixed(0)}%</span>
                  <span className="text-[8px] font-bold text-brand-text-secondary uppercase">SO%</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-lg font-black text-brand-amber">{rot.pointScoringPercentage.toFixed(0)}%</span>
                  <span className="text-[8px] font-bold text-brand-text-secondary uppercase">PS%</span>
                </div>
              </div>
            </div>
            
            <div className="h-3 bg-brand-gray/10 rounded-full overflow-hidden flex gap-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${rot.sideOutPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-brand-teal rounded-l-full" 
              />
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${rot.pointScoringPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                className="h-full bg-brand-amber rounded-r-full" 
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-brand-gray/10 flex justify-between items-center text-[10px] font-bold text-brand-text-secondary uppercase italic">
        <span>* SO% = Efficiency on Receive</span>
        <span>* PS% = Efficiency on Serve</span>
      </div>
    </div>
  );
};

export default RotationEfficiency;
