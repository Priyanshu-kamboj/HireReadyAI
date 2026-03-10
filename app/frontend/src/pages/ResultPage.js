import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { TrendingUp, Award, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const ResultPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResult();
  }, [id]);

  const fetchResult = async () => {
    try {
      const response = await axios.get(`${API}/resume/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resume = response.data.resumes.find(r => r.id === id);
      if (resume) {
        setResult(resume);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Failed to fetch result:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#9E47FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading results...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!result) return null;

  const { score, feedback } = result;
  const scoreColor = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400';
  const scoreBgColor = score >= 80 ? 'bg-green-500/20' : score >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20';

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Score Card */}
        <div className="bg-gradient-to-br from-[#1A0F2E] to-[#0D0515] rounded-2xl border border-white/10 p-8 shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-3xl font-bold mb-4 text-white" data-testid="result-heading">Your ATS Score</h1>
              <p className="text-gray-400 mb-6">
                Analyzed on {new Date(result.created_at).toLocaleDateString()}
              </p>
              <div className="flex gap-4">
                <Button
                  onClick={() => navigate('/jd-match')}
                  data-testid="match-jd-btn"
                  className="bg-[#9E47FF] hover:bg-[#8B3FE6] text-white"
                >
                  Match with Job Description
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/interview')}
                  data-testid="generate-questions-btn"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Generate Interview Questions
                </Button>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative">
                <div className={`w-48 h-48 rounded-full ${scoreBgColor} flex items-center justify-center border border-white/20`}>
                  <div className="text-center">
                    <div className={`text-6xl font-bold ${scoreColor}`} data-testid="score-value">
                      {score}
                    </div>
                    <div className="text-sm font-medium text-gray-400">out of 100</div>
                  </div>
                </div>
                <Award className={`absolute -top-2 -right-2 w-12 h-12 ${scoreColor}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Strengths */}
        {feedback?.strengths && feedback.strengths.length > 0 && (
          <div className="bg-gradient-to-br from-[#1A0F2E] to-[#0D0515] rounded-2xl border border-white/10 p-8 shadow-sm mb-6" data-testid="strengths-section">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <h2 className="text-2xl font-semibold text-white">Strengths</h2>
            </div>
            <ul className="space-y-3">
              {feedback.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-3" data-testid={`strength-${index}`}>
                  <span className="text-green-400 mt-1">✓</span>
                  <span className="text-gray-300">{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {feedback?.weaknesses && feedback.weaknesses.length > 0 && (
          <div className="bg-gradient-to-br from-[#1A0F2E] to-[#0D0515] rounded-2xl border border-white/10 p-8 shadow-sm mb-6" data-testid="weaknesses-section">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <h2 className="text-2xl font-semibold text-white">Areas to Improve</h2>
            </div>
            <ul className="space-y-3">
              {feedback.weaknesses.map((weakness, index) => (
                <li key={index} className="flex items-start gap-3" data-testid={`weakness-${index}`}>
                  <span className="text-red-400 mt-1">•</span>
                  <span className="text-gray-300">{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Keyword Suggestions */}
        {feedback?.keyword_suggestions && feedback.keyword_suggestions.length > 0 && (
          <div className="bg-gradient-to-br from-[#1A0F2E] to-[#0D0515] rounded-2xl border border-white/10 p-8 shadow-sm mb-6" data-testid="keywords-section">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="w-6 h-6 text-yellow-400" />
              <h2 className="text-2xl font-semibold text-white">Keyword Suggestions</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {feedback.keyword_suggestions.map((keyword, index) => (
                <span
                  key={index}
                  data-testid={`keyword-${index}`}
                  className="px-4 py-2 bg-[#9E47FF]/20 border border-[#9E47FF]/30 text-[#9E47FF] rounded-lg text-sm font-medium"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Section Feedback */}
        {feedback?.section_feedback && (
          <div className="bg-gradient-to-br from-[#1A0F2E] to-[#0D0515] rounded-2xl border border-white/10 p-8 shadow-sm" data-testid="section-feedback">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-[#9E47FF]" />
              <h2 className="text-2xl font-semibold text-white">Section-wise Feedback</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(feedback.section_feedback).map(([section, sectionFeedback], index) => (
                <div key={section} className="p-6 bg-white/5 border border-white/10 rounded-xl" data-testid={`section-${index}`}>
                  <h3 className="font-semibold text-lg mb-2 capitalize text-white">{section}</h3>
                  <p className="text-gray-400 text-sm">{sectionFeedback}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};