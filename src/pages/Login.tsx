import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col items-center justify-center p-6 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] aspect-square bg-brand-teal/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] aspect-square bg-brand-amber/5 rounded-full blur-3xl" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8 relative z-10"
      >
        <header className="text-center space-y-2">
          <motion.h1 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-6xl font-black text-brand-teal italic tracking-tighter"
          >
            Rally Ledger
          </motion.h1>
          <p className="text-brand-text-secondary font-black tracking-[0.2em] uppercase text-xs">Notice. Adapt. Commit.</p>
        </header>

        <motion.form 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit} 
          className="bg-brand-gray/5 border border-brand-gray/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl backdrop-blur-sm"
        >
          <div className="space-y-2">
            <label htmlFor="email" className="text-[10px] font-black text-brand-text-secondary uppercase tracking-[0.15em] ml-1">
              Coach Email
            </label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-gray/40" size={20} />
              <input
                id="email"
                type="email"
                placeholder="coach@team.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-brand-bg border border-brand-gray/10 rounded-2xl py-5 pl-14 pr-5 text-lg font-bold outline-none focus:border-brand-teal transition-all shadow-inner placeholder:text-brand-gray/30"
              />
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-brand-red text-xs font-black text-center uppercase tracking-wider"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-teal text-brand-bg font-black py-5 rounded-2xl text-xl shadow-xl shadow-brand-teal/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <LogIn size={24} />}
            Continue
          </motion.button>
        </motion.form>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-[10px] text-brand-text-secondary font-bold leading-relaxed max-w-[280px] mx-auto uppercase tracking-widest"
        >
          Access your rosters and match history. <br/>New accounts are created automatically.
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Login;
