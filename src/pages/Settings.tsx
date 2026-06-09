import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Database, ShieldAlert, Info, LogOut, User as UserIcon } from 'lucide-react';
import { db } from '../db/client';
import { matches, sets, rallyEvents, players, teams } from '../db/schema';
import { useAuth } from '../hooks/useAuth';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleResetDatabase = async () => {
    if (window.confirm('CRITICAL: This will delete ALL matches, rosters, and stats. This cannot be undone. Are you absolutely sure?')) {
      try {
        // In LibSQL/SQLite, we can't easily drop everything without specialized commands, 
        // but we can delete from all tables.
        await Promise.all([
          db.delete(rallyEvents),
          db.delete(sets),
          db.delete(matches),
          db.delete(players),
          db.delete(teams),
        ]);
        
        localStorage.clear();
        alert('Database has been reset.');
        window.location.href = '/';
      } catch (error) {
        console.error('Failed to reset database:', error);
        alert('Failed to reset database. See console for details.');
      }
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto pb-24">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/')} className="text-brand-text-secondary hover:text-brand-text">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold">Settings</h1>
      </header>

      <div className="space-y-6">
        <section>
          <h3 className="text-[10px] font-black text-brand-text-secondary uppercase tracking-widest mb-4 ml-2">Account</h3>
          <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl overflow-hidden">
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-teal/10 rounded-2xl flex items-center justify-center text-brand-teal">
                  <UserIcon size={24} />
                </div>
                <div>
                  <p className="font-bold">{user?.email}</p>
                  <p className="text-xs text-brand-text-secondary">Logged in as Coach</p>
                </div>
              </div>
            </div>
            
            <div className="h-px bg-brand-gray/10 mx-6" />
            
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-6 hover:bg-brand-gray/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-gray/10 rounded-2xl flex items-center justify-center text-brand-text">
                  <LogOut size={24} />
                </div>
                <p className="font-bold">Log Out</p>
              </div>
            </button>
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-black text-brand-text-secondary uppercase tracking-widest mb-4 ml-2">Data Management</h3>
          <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl overflow-hidden">
            <button 
              onClick={handleResetDatabase}
              className="w-full flex items-center justify-between p-6 hover:bg-brand-red/5 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-red/10 rounded-2xl flex items-center justify-center text-brand-red">
                  <Trash2 size={24} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-brand-red">Reset Database</p>
                  <p className="text-xs text-brand-text-secondary">Delete all matches, teams, and players</p>
                </div>
              </div>
              <ShieldAlert size={20} className="text-brand-gray/20 group-hover:text-brand-red transition-colors" />
            </button>
            
            <div className="h-px bg-brand-gray/10 mx-6" />
            
            <div className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-teal/10 rounded-2xl flex items-center justify-center text-brand-teal">
                <Database size={24} />
              </div>
              <div>
                <p className="font-bold">Database Status</p>
                <p className="text-xs text-brand-text-secondary">Connected to Turso (SQLite/LibSQL)</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-black text-brand-text-secondary uppercase tracking-widest mb-4 ml-2">App Info</h3>
          <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-start gap-4">
              <Info size={20} className="text-brand-teal mt-0.5" />
              <div>
                <p className="text-sm font-bold">Rally Ledger v0.1.0</p>
                <p className="text-xs text-brand-text-secondary leading-relaxed mt-1">
                  Built for coaches who need to notice trends, adapt on the fly, and commit to useful next actions.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
