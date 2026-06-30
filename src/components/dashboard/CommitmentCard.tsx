import React from 'react';
import { Zap } from 'lucide-react';

interface CommitmentCardProps {
  suggestion: string;
}

const CommitmentCard: React.FC<CommitmentCardProps> = ({ suggestion }) => {
  return (
    <div className="bg-brand-teal/10 border border-brand-teal/30 rounded-3xl p-6">
      <div className="flex items-center gap-3 mb-2 text-brand-teal">
        <Zap size={20} />
        <span className="text-sm font-bold uppercase tracking-wider">Commitment</span>
      </div>
      <p className="text-xl font-bold leading-tight">{suggestion}</p>
    </div>
  );
};

export default CommitmentCard;
