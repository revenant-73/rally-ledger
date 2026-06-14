import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Calendar, MapPin, Trophy } from 'lucide-react';
import { useMatch } from '../hooks/useMatch';

const History: React.FC = () => {
  const navigate = useNavigate();
  const { matches, isSyncing } = useMatch();

  return (
    <div className="p-6 max-w-lg mx-auto pb-24">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/')} className="text-brand-text-secondary hover:text-brand-text">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold">History</h1>
      </header>

      {isSyncing && matches.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal"></div>
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-12 bg-brand-gray/5 rounded-3xl border border-dashed border-brand-gray/20">
          <Trophy size={48} className="mx-auto text-brand-gray/20 mb-4" />
          <p className="text-brand-text-secondary font-medium">No matches recorded yet.</p>
          <button 
            onClick={() => navigate('/match/new')}
            className="mt-4 text-brand-teal font-bold text-sm"
          >
            Start your first match
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <button
              key={match.id}
              onClick={() => navigate(`/match/history/${match.id}`)}
              className="w-full text-left bg-brand-gray/5 border border-brand-gray/10 rounded-2xl p-5 hover:border-brand-teal/30 transition-all active:scale-[0.98] group"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      match.status === 'active' ? 'bg-brand-teal/20 text-brand-teal' : 'bg-brand-gray/20 text-brand-text-secondary'
                    }`}>
                      {match.status}
                    </span>
                    <span className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-widest">{match.matchType}</span>
                  </div>
                  <h3 className="text-xl font-bold">vs {match.opponentName}</h3>
                </div>
                <ChevronRight size={20} className="text-brand-gray/30 group-hover:text-brand-teal transition-colors" />
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-brand-text-secondary font-medium">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="opacity-50" />
                  {new Date(match.matchDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} className="opacity-50" />
                  {match.location}
                </div>
              </div>

              {match.result && (
                <div className="mt-4 flex items-center gap-2">
                  <span className={`font-black text-sm uppercase ${match.result === 'Win' ? 'text-brand-teal' : 'text-brand-red'}`}>
                    {match.result}
                  </span>
                  <div className="h-1 w-1 rounded-full bg-brand-gray/20" />
                  <span className="text-xs text-brand-text-secondary">Match completed</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
