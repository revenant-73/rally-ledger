import React from 'react';

interface SetSummary {
  id: string;
  setNumber: number;
  score: string;
  ourEarned: number;
  ourGifted: number;
  serveKO: number;
}

interface SetSummariesProps {
  setSummaries: SetSummary[];
  matchTotals: {
    earned: number;
    gifted: number;
    servePct: number;
  };
  activeSetId: string;
}

const SetSummaries: React.FC<SetSummariesProps> = ({
  setSummaries,
  matchTotals,
  activeSetId,
}) => {
  return (
    <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl overflow-hidden">
      <div className="p-6 bg-brand-teal/5 border-b border-brand-gray/10">
        <h3 className="text-sm font-bold text-brand-teal uppercase tracking-widest">Match History</h3>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <p className="text-xl font-black">{matchTotals.earned}</p>
            <p className="text-[8px] font-bold text-brand-text-secondary uppercase">Tot Earned</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black">{matchTotals.gifted}</p>
            <p className="text-[8px] font-bold text-brand-text-secondary uppercase">Tot Gifted</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-brand-teal">{matchTotals.servePct}%</p>
            <p className="text-[8px] font-bold text-brand-text-secondary uppercase">Serve In</p>
          </div>
        </div>
      </div>
      <div className="p-2">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[8px] font-black text-brand-text-secondary uppercase border-b border-brand-gray/10">
              <th className="p-3">Set</th>
              <th className="p-3">Score</th>
              <th className="p-3">E/G</th>
              <th className="p-3">Srv KO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-gray/5">
            {setSummaries.map((set, i) => (
              <tr key={set.id} className={`text-xs ${set.id === activeSetId ? 'bg-brand-teal/5 font-bold' : ''}`}>
                <td className="p-3 font-black text-brand-text-secondary">#{i + 1}</td>
                <td className="p-3 font-bold">{set.score}</td>
                <td className="p-3">
                  <span className="text-brand-green">+{set.ourEarned}</span>
                  <span className="mx-1 text-brand-text-secondary">/</span>
                  <span className="text-brand-amber">-{set.ourGifted}</span>
                </td>
                <td className="p-3">{set.serveKO}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SetSummaries;
