import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Plus, Play } from 'lucide-react';
import { useMatch } from '../hooks/useMatch';
import type { Match } from '../types';

const matchDate = (match: Match) =>
  new Date(match.matchDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { activeMatch, matches, resumeMatch } = useMatch();
  const activeMatches = [
    ...(activeMatch?.status === 'active' ? [activeMatch] : []),
    ...matches.filter(match => match.status === 'active' && match.id !== activeMatch?.id),
  ];

  const handleResumeMatch = (match: Match) => {
    resumeMatch(match);
    navigate('/app/match/live');
  };

  return (
    <div className="p-6 max-w-lg mx-auto space-y-8">
      <header className="py-8">
        <h1 className="text-4xl font-bold tracking-tight text-brand-teal">Century Matchbook</h1>
        <p className="text-brand-text-secondary mt-2 italic">Notice. Adapt. Commit.</p>
      </header>

      <div className="grid gap-4">
        <button 
          onClick={() => navigate('/app/match/new')}
          className="bg-brand-teal hover:bg-brand-teal/90 text-brand-bg font-bold py-6 px-4 rounded-xl flex items-center justify-center gap-3 text-xl transition-all active:scale-[0.98]"
        >
          <Plus size={28} />
          Start New Match
        </button>

        {activeMatches.length > 0 && (
          <section className="space-y-3" aria-label="Active matches">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest text-brand-text-secondary">Active Matches</h2>
              <button
                onClick={() => navigate('/app/history')}
                className="text-xs font-black uppercase tracking-wide text-brand-teal"
              >
                Manage
              </button>
            </div>
            {activeMatches.map(match => (
              <button
                key={match.id}
                onClick={() => handleResumeMatch(match)}
                className="w-full rounded-xl border border-brand-teal/30 bg-brand-gray/10 px-4 py-4 text-left text-brand-text transition-all hover:bg-brand-gray/20 active:scale-[0.98]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-brand-teal">Resume vs {match.opponentName}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-brand-text-secondary">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} className="opacity-50" />
                        {matchDate(match)}
                      </span>
                      {match.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin size={14} className="opacity-50" />
                          {match.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <Play size={24} className="shrink-0 text-brand-teal" />
                </div>
              </button>
            ))}
          </section>
        )}
      </div>
    </div>
  );
};

export default Home;
