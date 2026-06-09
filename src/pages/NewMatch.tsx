import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useMatch } from '../context/MatchContext';
import type { Match } from '../types';
import { v4 as uuidv4 } from 'uuid';

const NewMatch: React.FC = () => {
  const navigate = useNavigate();
  const { startMatch, teams, selectTeam, activeTeam } = useMatch();
  
  const [formData, setFormData] = useState({
    teamId: activeTeam?.id || '',
    opponentName: '',
    location: '',
    matchType: 'Tournament',
    level: activeTeam?.level || 'Varsity'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedTeam = teams.find(t => t.id === formData.teamId);
    
    const newMatch: Match = {
      id: uuidv4(),
      teamId: formData.teamId,
      opponentName: formData.opponentName,
      matchDate: new Date().toISOString(),
      location: formData.location,
      matchType: formData.matchType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (formData.teamId) {
      selectTeam(formData.teamId);
    }
    
    startMatch(newMatch);
    navigate('/match/live');
  };

  const handleTeamChange = (teamId: string) => {
    const selectedTeam = teams.find(t => t.id === teamId);
    setFormData({ 
      ...formData, 
      teamId,
      level: selectedTeam?.level || formData.level
    });
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text p-6 max-w-lg mx-auto">
      <header className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/')} className="text-brand-text-secondary hover:text-brand-text">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">New Match</h1>
        <div className="w-6" /> {/* Spacer */}
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-brand-text-secondary">Our Roster</label>
          <select
            required
            value={formData.teamId}
            onChange={(e) => handleTeamChange(e.target.value)}
            className="w-full bg-brand-gray/10 border border-brand-gray/20 rounded-xl p-4 focus:outline-none focus:border-brand-teal transition-colors"
          >
            <option value="">Select a saved roster...</option>
            {teams.map(team => (
              <option key={team.id} value={team.id} className="bg-brand-bg">
                {team.name} ({team.level})
              </option>
            ))}
          </select>
          {teams.length === 0 && (
            <p className="text-xs text-brand-teal mt-1 cursor-pointer" onClick={() => navigate('/roster')}>
              + Create your first roster
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-brand-text-secondary">Opponent</label>
          <input
            required
            type="text"
            value={formData.opponentName}
            onChange={(e) => setFormData({ ...formData, opponentName: e.target.value })}
            className="w-full bg-brand-gray/10 border border-brand-gray/20 rounded-xl p-4 focus:outline-none focus:border-brand-teal transition-colors"
            placeholder="Enter opponent name"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-brand-text-secondary">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full bg-brand-gray/10 border border-brand-gray/20 rounded-xl p-4 focus:outline-none focus:border-brand-teal transition-colors"
            placeholder="Gym name or city"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-text-secondary">Level</label>
            <select
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              className="w-full bg-brand-bg border border-brand-gray/20 rounded-xl p-4 focus:outline-none focus:border-brand-teal transition-colors"
            >
              <option value="Varsity" className="bg-brand-bg">Varsity</option>
              <option value="JV" className="bg-brand-bg">JV</option>
              <option value="Freshman" className="bg-brand-bg">Freshman</option>
              <option value="Club" className="bg-brand-bg">Club</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-text-secondary">Match Type</label>
            <select
              value={formData.matchType}
              onChange={(e) => setFormData({ ...formData, matchType: e.target.value })}
              className="w-full bg-brand-bg border border-brand-gray/20 rounded-xl p-4 focus:outline-none focus:border-brand-teal transition-colors"
            >
              <option value="Tournament" className="bg-brand-bg">Tournament</option>
              <option value="League" className="bg-brand-bg">League</option>
              <option value="Scrimmage" className="bg-brand-bg">Scrimmage</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-brand-teal hover:bg-brand-teal/90 text-brand-bg font-bold py-5 rounded-xl flex items-center justify-center gap-2 text-lg transition-all active:scale-[0.98] mt-8"
        >
          <Save size={24} />
          Create Match
        </button>
      </form>
    </div>
  );
};

export default NewMatch;
