import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMatch } from '../hooks/useMatch';
import type { Match } from '../types';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { MATCH_FORMAT_OPTIONS, getDefaultMatchFormatForType, type MatchFormat } from '../utils/matchFormat';

const NewMatch: React.FC = () => {
  const navigate = useNavigate();
  const { startMatch, teams, selectTeam, activeTeam, canManageTeam } = useMatch();
  const manageableTeams = teams.filter(team => canManageTeam(team.id));
  
  const [formData, setFormData] = useState({
    teamId: activeTeam && canManageTeam(activeTeam.id) ? activeTeam.id : '',
    opponentName: '',
    location: '',
    matchType: 'Tournament',
    level: activeTeam?.level || 'High School',
    matchFormat: 'best-of-3' as MatchFormat,
    standardSetTarget: 25,
    decidingSetTarget: 15,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newMatch: Match = {
      id: uuidv4(),
      teamId: formData.teamId,
      opponentName: formData.opponentName,
      matchDate: new Date().toISOString(),
      location: formData.location,
      matchType: formData.matchType,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        matchFormat: formData.matchFormat,
        standardSetTarget: formData.standardSetTarget,
        decidingSetTarget: formData.decidingSetTarget,
      },
    };

    try {
      if (formData.teamId) {
        selectTeam(formData.teamId);
      }

      await startMatch(newMatch);
      navigate('/match/live');
    } catch (error) {
      console.error('Failed to create match:', error);
      toast.error('Could not create match. Please try again.');
    }
  };

  const handleTeamChange = (teamId: string) => {
    const selectedTeam = manageableTeams.find(t => t.id === teamId);
    setFormData({ 
      ...formData, 
      teamId,
      level: selectedTeam?.level || formData.level
    });
  };

  const handleMatchTypeChange = (matchType: string) => {
    setFormData({
      ...formData,
      matchType,
      matchFormat: getDefaultMatchFormatForType(matchType),
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-brand-bg text-brand-text p-6 max-w-lg mx-auto"
    >
      <header className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/')} className="text-brand-text-secondary hover:text-brand-text">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black uppercase italic tracking-tighter">New Match</h1>
        <div className="w-6" /> {/* Spacer */}
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <label className="text-[10px] font-black uppercase text-brand-text-secondary tracking-widest px-1">Our Roster</label>
          <select
            required
            value={formData.teamId}
            onChange={(e) => handleTeamChange(e.target.value)}
            className="w-full bg-brand-gray/10 border border-brand-gray/20 rounded-xl p-4 focus:outline-none focus:border-brand-teal transition-colors"
          >
            <option value="">Select a saved roster...</option>
            {manageableTeams.map(team => (
              <option key={team.id} value={team.id} className="bg-brand-bg">
                {team.name}
              </option>
            ))}
          </select>
          {teams.length === 0 && (
            <p className="text-xs text-brand-teal mt-1 cursor-pointer font-bold" onClick={() => navigate('/roster')}>
              + Create your first roster
            </p>
          )}
          {teams.length > 0 && manageableTeams.length === 0 && (
            <p className="text-xs text-brand-text-secondary mt-1">
              You can view rosters, but you do not have match entry access for any roster yet.
            </p>
          )}
        </motion.div>

        {/* Quick Select Rosters */}
        {manageableTeams.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
          >
            {manageableTeams.slice(0, 3).map(team => (
              <button
                key={team.id}
                type="button"
                onClick={() => handleTeamChange(team.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full border text-xs font-bold transition-all ${
                  formData.teamId === team.id 
                  ? 'bg-brand-teal border-brand-teal text-brand-bg shadow-md scale-105' 
                  : 'bg-brand-gray/5 border-brand-gray/20 text-brand-text-secondary hover:border-brand-teal/50'
                }`}
              >
                {team.name}
              </button>
            ))}
          </motion.div>
        )}

        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <label className="text-[10px] font-black uppercase text-brand-text-secondary tracking-widest px-1">Opponent</label>
          <input
            required
            type="text"
            value={formData.opponentName}
            onChange={(e) => setFormData({ ...formData, opponentName: e.target.value })}
            className="w-full bg-brand-gray/10 border border-brand-gray/20 rounded-xl p-4 focus:outline-none focus:border-brand-teal transition-colors font-bold"
            placeholder="Enter opponent name"
          />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <label className="text-[10px] font-black uppercase text-brand-text-secondary tracking-widest px-1">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full bg-brand-gray/10 border border-brand-gray/20 rounded-xl p-4 focus:outline-none focus:border-brand-teal transition-colors font-bold"
            placeholder="Gym name or city"
          />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 gap-4"
        >
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-brand-text-secondary tracking-widest px-1">Level</label>
            <select
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              className="w-full bg-brand-bg border border-brand-gray/20 rounded-xl p-4 focus:outline-none focus:border-brand-teal transition-colors font-bold"
            >
              <option value="High School" className="bg-brand-bg">High School</option>
              <option value="Club" className="bg-brand-bg">Club</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-brand-text-secondary tracking-widest px-1">Match Type</label>
            <select
              value={formData.matchType}
              onChange={(e) => handleMatchTypeChange(e.target.value)}
              className="w-full bg-brand-bg border border-brand-gray/20 rounded-xl p-4 focus:outline-none focus:border-brand-teal transition-colors font-bold"
            >
              <option value="Tournament" className="bg-brand-bg">Tournament</option>
              <option value="League" className="bg-brand-bg">League</option>
              <option value="Scrimmage" className="bg-brand-bg">Scrimmage</option>
            </select>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <div>
            <label className="text-[10px] font-black uppercase text-brand-text-secondary tracking-widest px-1">Match Format</label>
            <select
              value={formData.matchFormat}
              onChange={(e) => setFormData({ ...formData, matchFormat: e.target.value as MatchFormat })}
              className="mt-2 w-full bg-brand-bg border border-brand-gray/20 rounded-xl p-4 focus:outline-none focus:border-brand-teal transition-colors font-bold"
            >
              {MATCH_FORMAT_OPTIONS.map(option => (
                <option key={option.value} value={option.value} className="bg-brand-bg">
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 px-1 text-xs font-bold text-brand-text-secondary">
              {MATCH_FORMAT_OPTIONS.find(option => option.value === formData.matchFormat)?.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-brand-text-secondary tracking-widest px-1">Set Target</label>
              <select
                value={formData.standardSetTarget}
                onChange={(e) => setFormData({ ...formData, standardSetTarget: Number(e.target.value) })}
                className="w-full bg-brand-bg border border-brand-gray/20 rounded-xl p-4 focus:outline-none focus:border-brand-teal transition-colors font-bold"
              >
                {[25, 21, 15].map(target => (
                  <option key={target} value={target} className="bg-brand-bg">{target}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-brand-text-secondary tracking-widest px-1">Final Set</label>
              <select
                value={formData.decidingSetTarget}
                onChange={(e) => setFormData({ ...formData, decidingSetTarget: Number(e.target.value) })}
                className="w-full bg-brand-bg border border-brand-gray/20 rounded-xl p-4 focus:outline-none focus:border-brand-teal transition-colors font-bold"
              >
                {[15, 11, 25].map(target => (
                  <option key={target} value={target} className="bg-brand-bg">{target}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="w-full bg-brand-teal hover:bg-brand-teal/90 text-brand-bg font-black py-5 rounded-xl flex items-center justify-center gap-2 text-lg transition-all mt-8 uppercase tracking-widest"
          disabled={manageableTeams.length === 0}
        >
          <Save size={24} />
          Create Match
        </motion.button>
      </form>
    </motion.div>
  );
};

export default NewMatch;
