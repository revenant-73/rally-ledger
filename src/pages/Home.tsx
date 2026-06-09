import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, History, Users, Settings } from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-lg mx-auto space-y-8">
      <header className="py-8">
        <h1 className="text-4xl font-bold tracking-tight text-brand-teal">Rally Ledger</h1>
        <p className="text-brand-text-secondary mt-2 italic">Notice. Adapt. Commit.</p>
      </header>

      <div className="grid gap-4">
        <button 
          onClick={() => navigate('/match/new')}
          className="bg-brand-teal hover:bg-brand-teal/90 text-brand-bg font-bold py-6 px-4 rounded-xl flex items-center justify-center gap-3 text-xl transition-all active:scale-[0.98]"
        >
          <Plus size={28} />
          Start New Match
        </button>

        <button 
          onClick={() => navigate('/match/live')}
          className="bg-brand-gray/10 hover:bg-brand-gray/20 border border-brand-teal/30 text-brand-teal font-bold py-6 px-4 rounded-xl flex items-center justify-center gap-3 text-xl transition-all active:scale-[0.98]"
        >
          <Play size={28} />
          Resume Live Match
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-4">
        <button 
          onClick={() => navigate('/history')}
          className="flex flex-col items-center gap-2 p-4 bg-brand-gray/5 rounded-xl text-brand-text-secondary hover:text-brand-text"
        >
          <History size={24} />
          <span className="text-sm">History</span>
        </button>
        <button 
          onClick={() => navigate('/roster')}
          className="flex flex-col items-center gap-2 p-4 bg-brand-gray/5 rounded-xl text-brand-text-secondary hover:text-brand-text"
        >
          <Users size={24} />
          <span className="text-sm">Roster</span>
        </button>
        <button 
          onClick={() => navigate('/settings')}
          className="flex flex-col items-center gap-2 p-4 bg-brand-gray/5 rounded-xl text-brand-text-secondary hover:text-brand-text"
        >
          <Settings size={24} />
          <span className="text-sm">Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Home;
