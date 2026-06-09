import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, History, Settings } from 'lucide-react';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: <Home size={24} />, label: 'Home', path: '/' },
    { icon: <Users size={24} />, label: 'Roster', path: '/roster' },
    { icon: <History size={24} />, label: 'History', path: '/history' },
    { icon: <Settings size={24} />, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg text-brand-text">
      <main className="flex-1 pb-20 overflow-auto">
        <Outlet />
      </main>
      
      <nav className="fixed bottom-0 left-0 right-0 bg-brand-bg border-t border-brand-gray/20 px-6 py-3">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 transition-colors ${
                location.pathname === item.path ? 'text-brand-teal' : 'text-brand-text-secondary'
              }`}
            >
              {item.icon}
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
