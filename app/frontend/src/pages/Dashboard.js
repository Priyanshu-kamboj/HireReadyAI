import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Brain, FileText, Target, MessageSquare, LogOut, Sparkles, TrendingUp, Award, CreditCard } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API}/resume/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(response.data.resumes || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const userCredits = user?.credits || 0;
  const totalAnalysesAvailable = userCredits;

  return (
    <div className="min-h-screen bg-[#100720]">
      {/* Sidebar */}
      <aside className="w-64 fixed h-screen border-r border-white/10 bg-[#0D0515] z-30 hidden md:block">
        <div className="p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#9E47FF]" />
            <h1 className="text-2xl font-bold text-white" data-testid="sidebar-logo">HireReady AI</h1>
          </div>
        </div>
        <nav className="px-3 space-y-1">
          <button
            onClick={() => navigate('/dashboard')}
            data-testid="nav-dashboard-btn"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/10 text-white font-medium"
          >
            <Brain className="w-5 h-5" />
            Dashboard
          </button>
          <button
            onClick={() => navigate('/analyze')}
            data-testid="nav-analyze-btn"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <FileText className="w-5 h-5" />
            Analyze Resume
          </button>
          <button
            onClick={() => navigate('/jd-match')}
            data-testid="nav-jd-match-btn"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Target className="w-5 h-5" />
            Job Matching
          </button>
          <button
            onClick={() => navigate('/interview')}
            data-testid="nav-interview-btn"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
            Interview Prep
          </button>
          <button
            onClick={() => navigate('/pricing')}
            data-testid="nav-pricing-btn"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <CreditCard className="w-5 h-5" />
            Buy Credits
          </button>
        </nav>
        <div className="absolute bottom-6 left-3 right-3">
          <Button
            onClick={handleLogout}
            data-testid="logout-btn"
            variant="ghost"
            className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:pl-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-2 text-white" data-testid="dashboard-welcome">
              Welcome back, {user?.name}!
            </h2>
            <p className="text-gray-400">Track your placement readiness and improve your profile</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-[#1A0F2E] to-[#0D0515] border border-white/10 rounded-xl p-6" data-testid="stat-card-credits">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-400">Available Credits</span>
                <CreditCard className="w-5 h-5 text-[#9E47FF]" />
              </div>
              <p className="text-2xl font-bold text-white">{userCredits}</p>
              <Button
                onClick={() => navigate('/pricing')}
                data-testid="buy-credits-btn"
                size="sm"
                className="mt-3 w-full bg-[#9E47FF] hover:bg-[#8B3FE6] text-white"
              >
                Buy Credits
              </Button>
            </div>

            <div className="bg-gradient-to-br from-[#1A0F2E] to-[#0D0515] border border-white/10 rounded-xl p-6" data-testid="stat-card-analyses">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-400">Total Analyses</span>
                <FileText className="w-5 h-5 text-[#00D9FF]" />
              </div>
              <p className="text-2xl font-bold text-white">{history.length}</p>
            </div>

            <div className="bg-gradient-to-br from-[#1A0F2E] to-[#0D0515] border border-white/10 rounded-xl p-6" data-testid="stat-card-avg-score">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-400">Avg ATS Score</span>
                <Award className="w-5 h-5 text-[#9E47FF]" />
              </div>
              <p className="text-2xl font-bold text-white">
                {history.length > 0
                  ? Math.round(history.reduce((sum, r) => sum + r.score, 0) / history.length)
                  : 0}
              </p>
            </div>
          </div>

          {/* Available Analyses Info */}
          {totalAnalysesAvailable === 0 && (
            <div className="mb-8 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-500">No credits available</p>
                  <p className="text-sm text-yellow-200/80 mt-1">
                    Purchase credits to start analyzing your resume and unlock AI-powered insights.
                  </p>
                  <Button
                    onClick={() => navigate('/pricing')}
                    size="sm"
                    className="mt-3 bg-[#9E47FF] hover:bg-[#8B3FE6] text-white"
                  >
                    View Pricing
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <button
              onClick={() => navigate('/analyze')}
              data-testid="quick-action-analyze"
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A0F2E]/50 to-[#100720]/50 p-8 hover:border-[#9E47FF]/50 transition-all duration-300 text-left"
            >
              <FileText className="w-10 h-10 text-[#9E47FF] mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-white">Analyze Resume</h3>
              <p className="text-gray-400">Upload your resume for instant ATS scoring</p>
              {totalAnalysesAvailable > 0 && (
                <p className="text-sm text-[#00FF99] mt-2">{totalAnalysesAvailable} analyses available</p>
              )}
            </button>

            <button
              onClick={() => navigate('/jd-match')}
              data-testid="quick-action-jd-match"
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A0F2E]/50 to-[#100720]/50 p-8 hover:border-[#00D9FF]/50 transition-all duration-300 text-left"
            >
              <Target className="w-10 h-10 text-[#00D9FF] mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-white">Match Job Description</h3>
              <p className="text-gray-400">Find skill gaps for specific job postings</p>
            </button>

            <button
              onClick={() => navigate('/interview')}
              data-testid="quick-action-interview"
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A0F2E]/50 to-[#100720]/50 p-8 hover:border-[#00FF99]/50 transition-all duration-300 text-left"
            >
              <MessageSquare className="w-10 h-10 text-[#00FF99] mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-white">Interview Prep</h3>
              <p className="text-gray-400">Generate personalized interview questions</p>
            </button>
          </div>

          {/* Recent Analyses */}
          <div className="bg-gradient-to-br from-[#1A0F2E] to-[#0D0515] border border-white/10 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4 text-white" data-testid="recent-analyses-heading">Recent Analyses</h3>
            {loading ? (
              <p className="text-gray-400">Loading...</p>
            ) : history.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No analyses yet</p>
                <Button onClick={() => navigate('/analyze')} data-testid="get-started-analyze-btn" className="bg-[#9E47FF] hover:bg-[#8B3FE6] text-white">
                  Analyze Your First Resume
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 5).map((resume, index) => (
                  <div
                    key={resume.id}
                    data-testid={`history-item-${index}`}
                    className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#9E47FF]/20 flex items-center justify-center border border-[#9E47FF]/50">
                        <span className="text-lg font-bold text-[#9E47FF]">{resume.score}</span>
                      </div>
                      <div>
                        <p className="font-medium text-white">Resume Analysis</p>
                        <p className="text-sm text-gray-400">
                          {new Date(resume.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => navigate(`/result/${resume.id}`)}
                      data-testid={`view-result-btn-${index}`}
                      variant="outline"
                      size="sm"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};