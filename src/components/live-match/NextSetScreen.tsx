import React, { useState } from 'react';
import { Trophy, ArrowLeft } from 'lucide-react';
import type { RallyEvent, Player, Lineup } from '../../types';
import LineupSelection from './lineup/LineupSelection';

interface NextSetScreenProps {
  rallies: RallyEvent[];
  players: Player[];
  onStartSet: (setNumber: number, lineup?: Lineup) => Promise<void>;
  onBackToHome: () => void;
}

const NextSetScreen: React.FC<NextSetScreenProps> = ({
  rallies,
  players,
  onStartSet,
  onBackToHome,
}) => {
  const [pendingSetNumber, setPendingSetNumber] = useState(1);
  const [showLineupSelection, setShowLineupSelection] = useState(false);

  const lastSetRallies = rallies.length > 0 ? (() => {
    const maxRally = rallies.reduce((prev, current) => 
      (prev.rallyNumber > current.rallyNumber) ? prev : current
    );
    return rallies.filter(r => r.setId === maxRally.setId);
  })() : [];

  const lastSetMetrics = lastSetRallies.length > 0 ? {
    ourScore: lastSetRallies[lastSetRallies.length - 1].scoreAfterUs,
    oppScore: lastSetRallies[lastSetRallies.length - 1].scoreAfterOpponent,
    ourEarned: lastSetRallies.filter(r => r.pointWinner === 'Us' && r.classification === 'Earned').length,
    ourGifted: lastSetRallies.filter(r => r.pointWinner === 'Opponent' && r.classification === 'Gifted').length,
  } : null;

  if (showLineupSelection) {
    return (
      <LineupSelection 
        players={players}
        onCancel={() => setShowLineupSelection(false)}
        onComplete={(lineup) => onStartSet(pendingSetNumber, lineup)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text p-6 flex flex-col items-center justify-center text-center">
      {lastSetMetrics ? (
        <div className="mb-12 w-full max-w-sm">
          <h3 className="text-sm font-black text-brand-teal uppercase tracking-widest mb-4">Last Set Summary</h3>
          <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="flex flex-col">
                <span className="text-4xl font-black text-brand-teal">{lastSetMetrics.ourScore}</span>
                <span className="text-[10px] font-bold text-brand-text-secondary uppercase">Us</span>
              </div>
              <div className="h-8 w-px bg-brand-gray/20" />
              <div className="flex flex-col">
                <span className="text-4xl font-black text-brand-red">{lastSetMetrics.oppScore}</span>
                <span className="text-[10px] font-bold text-brand-text-secondary uppercase">Them</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-xl font-black text-brand-green">+{lastSetMetrics.ourEarned}</p>
                <p className="text-[10px] font-bold text-brand-text-secondary uppercase">Earned</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-black text-brand-amber">-{lastSetMetrics.ourGifted}</p>
                <p className="text-[10px] font-bold text-brand-text-secondary uppercase">Gifted</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-12">
          <Trophy size={64} className="mx-auto text-brand-teal/20 mb-4" />
        </div>
      )}

      <h2 className="text-3xl font-bold mb-2">Ready for Next Set?</h2>
      <p className="text-brand-text-secondary mb-8 text-lg">Select set number to begin</p>
      
      <div className="grid grid-cols-5 gap-3 mb-8 w-full max-w-xs">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => setPendingSetNumber(n)}
            className={`aspect-square rounded-xl font-black text-xl flex items-center justify-center transition-all ${
              pendingSetNumber === n ? 'bg-brand-teal text-brand-bg scale-110 shadow-lg' : 'bg-brand-gray/10 text-brand-text-secondary'
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <button
        onClick={() => setShowLineupSelection(true)}
        className="bg-brand-teal text-brand-bg font-bold py-5 px-12 rounded-2xl text-xl shadow-xl active:scale-[0.98] transition-all"
      >
        Set Lineup & Start
      </button>
      
      <button 
        onClick={onBackToHome}
        className="mt-8 text-brand-text-secondary font-bold flex items-center gap-2"
      >
        <ArrowLeft size={18} />
        Back to Home
      </button>
    </div>
  );
};

export default NextSetScreen;
