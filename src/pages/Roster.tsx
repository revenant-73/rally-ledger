import React, { useState } from 'react';
import { Plus, Trash2, UserPlus, X } from 'lucide-react';
import { useMatch } from '../context/MatchContext';
import type { Player, PlayerPosition } from '../types';
import { v4 as uuidv4 } from 'uuid';

const Roster: React.FC = () => {
  const { players, addPlayer, removePlayer } = useMatch();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlayer, setNewPlayer] = useState({
    firstName: '',
    lastName: '',
    jerseyNumber: '',
    position: 'OH' as PlayerPosition
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const player: Player = {
      id: uuidv4(),
      teamId: 'team-1',
      firstName: newPlayer.firstName,
      lastName: newPlayer.lastName,
      jerseyNumber: newPlayer.jerseyNumber,
      position: newPlayer.position,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addPlayer(player);
    setNewPlayer({ firstName: '', lastName: '', jerseyNumber: '', position: 'OH' });
    setShowAddForm(false);
  };

  const positions: PlayerPosition[] = ['OH', 'OPP', 'MB', 'S', 'L', 'DS', 'Other'];

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Roster</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-brand-teal text-brand-bg p-2 rounded-full hover:bg-brand-teal/90 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      {showAddForm && (
        <div className="mb-8 bg-brand-gray/5 border border-brand-gray/20 rounded-2xl p-6 relative">
          <button 
            onClick={() => setShowAddForm(false)}
            className="absolute top-4 right-4 text-brand-text-secondary hover:text-brand-text"
          >
            <X size={20} />
          </button>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <UserPlus size={20} className="text-brand-teal" />
            Add Player
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-text-secondary uppercase">First Name</label>
                <input
                  required
                  type="text"
                  value={newPlayer.firstName}
                  onChange={(e) => setNewPlayer({ ...newPlayer, firstName: e.target.value })}
                  className="w-full bg-brand-bg border border-brand-gray/20 rounded-xl p-3 focus:outline-none focus:border-brand-teal"
                  placeholder="e.g. Jane"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-text-secondary uppercase">Last Name</label>
                <input
                  required
                  type="text"
                  value={newPlayer.lastName}
                  onChange={(e) => setNewPlayer({ ...newPlayer, lastName: e.target.value })}
                  className="w-full bg-brand-bg border border-brand-gray/20 rounded-xl p-3 focus:outline-none focus:border-brand-teal"
                  placeholder="e.g. Doe"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-text-secondary uppercase">Jersey #</label>
                <input
                  required
                  type="text"
                  value={newPlayer.jerseyNumber}
                  onChange={(e) => setNewPlayer({ ...newPlayer, jerseyNumber: e.target.value })}
                  className="w-full bg-brand-bg border border-brand-gray/20 rounded-xl p-3 focus:outline-none focus:border-brand-teal"
                  placeholder="e.g. 12"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-text-secondary uppercase">Position</label>
                <select
                  value={newPlayer.position}
                  onChange={(e) => setNewPlayer({ ...newPlayer, position: e.target.value as PlayerPosition })}
                  className="w-full bg-brand-bg border border-brand-gray/20 rounded-xl p-3 focus:outline-none focus:border-brand-teal"
                >
                  {positions.map(pos => (
                    <option key={pos} value={pos} className="bg-brand-bg">{pos}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-brand-teal text-brand-bg font-bold py-4 rounded-xl mt-2 active:scale-[0.98] transition-all"
            >
              Add to Roster
            </button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {players.length === 0 ? (
          <div className="text-center py-12 bg-brand-gray/5 rounded-3xl border border-dashed border-brand-gray/20">
            <p className="text-brand-text-secondary">No players in roster yet.</p>
            <button 
              onClick={() => setShowAddForm(true)}
              className="text-brand-teal font-bold mt-2"
            >
              Add your first player
            </button>
          </div>
        ) : (
          players.sort((a, b) => Number(a.jerseyNumber) - Number(b.jerseyNumber)).map((player) => (
            <div 
              key={player.id}
              className="flex items-center justify-between bg-brand-gray/5 border border-brand-gray/10 p-4 rounded-2xl hover:border-brand-teal/30 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-teal/10 rounded-full flex items-center justify-center text-brand-teal font-black text-lg">
                  {player.jerseyNumber}
                </div>
                <div>
                  <p className="font-bold text-lg">{player.firstName} {player.lastName}</p>
                  <p className="text-xs font-bold text-brand-text-secondary uppercase">{player.position}</p>
                </div>
              </div>
              <button
                onClick={() => removePlayer(player.id)}
                className="text-brand-gray hover:text-brand-red p-2 transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Roster;
