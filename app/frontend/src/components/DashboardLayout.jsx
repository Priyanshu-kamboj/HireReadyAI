import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Brain, FileText, Target, MessageSquare, LogOut, Sparkles, CreditCard } from 'lucide-react';

export const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#100720]">
      {/* Sidebar */}
      <aside className="w-64 fixed h-screen border-r border-white/10 bg-[#0D0515] z-30 hidden md:block">
        <div className="p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#9E47FF]" />
            <h1 className="text-2xl font-bold text-white">HireReady AI</h1>
          </div>
        </div>
        <nav className="px-3 space-y-1">
          <button
            onClick={() => navigate('/dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              isActive('/dashboard')
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Brain className="w-5 h-5" />
            Dashboard
          </button>
          <button
            onClick={() => navigate('/analyze')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              isActive('/analyze')
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <FileText className="w-5 h-5" />
            Analyze Resume
          </button>
          <button
            onClick={() => navigate('/jd-match')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              isActive('/jd-match')
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Target className="w-5 h-5" />
            Job Matching
          </button>
          <button
            onClick={() => navigate('/interview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              isActive('/interview')
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            Interview Prep
          </button>
          <button
            onClick={() => navigate('/pricing')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              isActive('/pricing')
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            Buy Credits
          </button>
        </nav>
        <div className="absolute bottom-6 left-3 right-3">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full flex items-center gap-2 justify-start text-gray-400 hover:text-white hover:bg-white/5"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
          {user && (
            <div className="mt-4 p-3 bg-white/5 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Credits Available</p>
              <p className="text-lg font-bold text-white">{user.credits || 0}</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main content area with left margin for sidebar */}
      <div className="md:ml-64">
        {children}
      </div>
    </div>
  );
};
