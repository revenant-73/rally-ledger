import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Mail, LogIn, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setError('');
    setIsSubmitting(true);
    
    try {
      await login(email);
      navigate('/');
    } catch (err) {
      setError('Failed to login. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <header className="text-center">
          <h1 className="text-5xl font-black text-brand-teal mb-2 italic">Rally Ledger</h1>
          <p className="text-brand-text-secondary font-medium tracking-widest uppercase">Notice. Adapt. Commit.</p>
        </header>

        <form onSubmit={handleSubmit} className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-8 space-y-6 shadow-xl">
          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-black text-brand-text-secondary uppercase tracking-widest ml-1">
              Coach Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray/40" size={20} />
              <input
                id="email"
                type="email"
                placeholder="coach@team.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-brand-bg border border-brand-gray/10 rounded-2xl py-4 pl-12 pr-4 text-lg font-bold outline-none focus:border-brand-teal/50 transition-all"
              />
            </div>
          </div>

          {error && <p className="text-brand-red text-sm font-bold text-center">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-teal text-brand-bg font-black py-5 rounded-2xl text-xl shadow-2xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <LogIn size={24} />}
            CONTINUE
          </button>
        </form>

        <p className="text-center text-xs text-brand-text-secondary font-medium leading-relaxed max-w-[280px] mx-auto">
          Enter your email to access your rosters and match data. New accounts will be created automatically.
        </p>
      </div>
    </div>
  );
};

export default Login;
