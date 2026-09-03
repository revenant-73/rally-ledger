import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Calendar, MapPin, Trophy, Trash2 } from 'lucide-react';
import { useMatch } from '../hooks/useMatch';
import type { Match } from '../types';
import toast from 'react-hot-toast';

const History: React.FC = () => {
  const navigate = useNavigate();
  const { matches, isSyncing, canManageTeam, deleteMatch, resumeMatch } = useMatch();
  const activeMatches = matches.filter(match => match.status === 'active');
  const completedMatches = matches.filter(match => match.status !== 'active');

  const openMatch = (match: Match) => {
    if (match.status === 'active') {
      resumeMatch(match);
      navigate('/app/match/live');
      return;
    }
    navigate(`/app/match/history/${match.id}`);
  };

  const handleDeleteMatch = async (match: Match) => {
    const action = match.status === 'active' ? 'Abandon active match' : 'Delete completed match';
    const confirmed = window.confirm(`${action} vs ${match.opponentName}? This will permanently delete its sets, rallies, and stats from reports.`);
    if (!confirmed) return;

    try {
      await deleteMatch(match.id);
      toast.success(match.status === 'active' ? 'Active match abandoned' : 'Match deleted');
    } catch (error) {
      console.error('Failed to delete match:', error);
      toast.error('Unable to delete match');
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto pb-24">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/app')} className="text-brand-text-secondary hover:text-brand-text">
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
            onClick={() => navigate('/app/match/new')}
            className="mt-4 text-brand-teal font-bold text-sm"
          >
            Start your first match
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {activeMatches.length > 0 && (
            <section className="space-y-4" aria-label="Active matches">
              <h2 className="text-xs font-black uppercase tracking-widest text-brand-teal">Active Matches</h2>
              {activeMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  canDelete={canManageTeam(match.teamId)}
                  onOpen={openMatch}
                  onDelete={handleDeleteMatch}
                />
              ))}
            </section>
          )}

          {completedMatches.length > 0 && (
            <section className="space-y-4" aria-label="Completed matches">
              <h2 className="text-xs font-black uppercase tracking-widest text-brand-text-secondary">Completed Matches</h2>
              {completedMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  canDelete={canManageTeam(match.teamId)}
                  onOpen={openMatch}
                  onDelete={handleDeleteMatch}
                />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
};

interface MatchCardProps {
  match: Match;
  canDelete: boolean;
  onOpen: (match: Match) => void;
  onDelete: (match: Match) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, canDelete, onOpen, onDelete }) => (
  <div
    className={`w-full rounded-2xl border p-5 transition-all hover:border-brand-teal/30 ${
      match.status === 'active' ? 'border-brand-teal/30 bg-brand-teal/5' : 'border-brand-gray/10 bg-brand-gray/5'
    }`}
  >
    <div className="mb-3 flex items-start justify-between gap-3">
      <button
        onClick={() => onOpen(match)}
        className="min-w-0 flex-1 text-left group"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
            match.status === 'active' ? 'bg-brand-teal/20 text-brand-teal' : 'bg-brand-gray/20 text-brand-text-secondary'
          }`}>
            {match.status}
          </span>
          <span className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-widest">{match.matchType}</span>
        </div>
        <h3 className="text-xl font-bold">vs {match.opponentName}</h3>
      </button>
      <div className="flex items-center gap-2">
        {canDelete && (
          <button
            onClick={() => onDelete(match)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-brand-text-secondary transition-colors hover:bg-brand-red/10 hover:text-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/40"
            aria-label={`${match.status === 'active' ? 'Abandon active match' : 'Delete completed match'} vs ${match.opponentName}`}
          >
            <Trash2 size={17} />
          </button>
        )}
        <ChevronRight size={20} className="text-brand-gray/30" />
      </div>
    </div>

    <button
      onClick={() => onOpen(match)}
      className="block w-full text-left"
    >
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-brand-text-secondary font-medium">
        <div className="flex items-center gap-1.5">
          <Calendar size={14} className="opacity-50" />
          {new Date(match.matchDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        {match.location && (
          <div className="flex items-center gap-1.5">
            <MapPin size={14} className="opacity-50" />
            {match.location}
          </div>
        )}
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
      {match.status === 'active' && (
        <div className="mt-4 flex items-center gap-2">
          <span className="font-black text-sm uppercase text-brand-teal">Resume scoring</span>
          <div className="h-1 w-1 rounded-full bg-brand-gray/20" />
          <span className="text-xs text-brand-text-secondary">Match still active</span>
        </div>
      )}
    </button>
  </div>
);

export default History;
