import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Target, Loader2, TrendingDown, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const JDMatchPage = () => {
  const navigate = useNavigate();
  const { token, fetchUser } = useAuth();
  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const response = await axios.get(`${API}/resume/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResumes(response.data.resumes || []);
    } catch (error) {
      console.error('Failed to fetch resumes:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedResume) {
      toast.error('Please select a resume');
      return;
    }
    
    if (!jobDescription.trim()) {
      toast.error('Please enter a job description');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/resume/jd-match`,
        {
          resume_id: selectedResume,
          job_description: jobDescription
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setResult(response.data);
      toast.success(`Job matched! ${response.data.remaining_credits} credits remaining`);
      await fetchUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Matching failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white" data-testid="jd-match-heading">
            Job Description Matching
          </h1>
          <p className="text-gray-400">
            Compare your resume with a job description to identify skill gaps
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-[#1A0F2E] rounded-2xl border border-white/10 p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="resume-select" className="text-white">Select Resume</Label>
                {resumes.length === 0 ? (
                  <div className="p-4 bg-[#2A1B47] border border-[#9E47FF]/20 rounded-lg">
                    <p className="text-sm text-yellow-300">
                      No resumes found. Please analyze a resume first.
                    </p>
                    <Button
                      onClick={() => navigate('/analyze')}
                      data-testid="analyze-first-btn"
                      size="sm"
                      className="mt-3"
                    >
                      Analyze Resume
                    </Button>
                  </div>
                ) : (
                  <Select value={selectedResume} onValueChange={setSelectedResume}>
                    <SelectTrigger data-testid="resume-select">
                      <SelectValue placeholder="Choose a resume" />
                    </SelectTrigger>
                    <SelectContent>
                      {resumes.map((resume) => (
                        <SelectItem key={resume.id} value={resume.id} data-testid={`resume-option-${resume.id}`}>
                          Score: {resume.score} - {new Date(resume.created_at).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="job-description" className="text-white">Job Description</Label>
                <Textarea
                  id="job-description"
                  data-testid="job-description-input"
                  placeholder="Paste the complete job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={12}
                  className="resize-none bg-[#0D0515] border-white/10 text-white placeholder-gray-500"
                />
              </div>

              <Button
                type="submit"
                data-testid="match-submit-btn"
                className="w-full h-12 bg-[#9E47FF] hover:bg-[#8B3AE6] font-medium text-white"
                disabled={loading || resumes.length === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing Match...
                  </>
                ) : (
                  'Analyze Match'
                )}
              </Button>
            </form>
          </div>

          {/* Results */}
          <div>
            {result ? (
              <div className="space-y-6">
                {/* Match Score */}
                <div className="bg-[#1A0F2E] rounded-2xl border border-white/10 p-8 shadow-sm" data-testid="match-score-card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-semibold text-white">Match Score</h2>
                    <Target className="w-8 h-8 text-[#9E47FF]" />
                  </div>
                  <div className="flex items-end gap-2 mb-4">
                    <span className="text-6xl font-bold text-[#9E47FF]" data-testid="match-score-value">
                      {result.jd_match_score}
                    </span>
                    <span className="text-2xl text-gray-400 mb-2">%</span>
                  </div>
                  <div className="bg-[#0D0515] rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-[#9E47FF] h-full transition-all"
                      style={{ width: `${result.jd_match_score}%` }}
                    />
                  </div>
                </div>

                {/* Skill Gaps */}
                {result.skill_gaps && result.skill_gaps.length > 0 && (
                  <div className="bg-[#1A0F2E] rounded-2xl border border-white/10 p-8 shadow-sm" data-testid="skill-gaps-section">
                    <div className="flex items-center gap-3 mb-4">
                      <TrendingDown className="w-6 h-6 text-red-400" />
                      <h2 className="text-xl font-semibold text-white">Skill Gaps</h2>
                    </div>
                    <ul className="space-y-2">
                      {result.skill_gaps.map((skill, index) => (
                        <li key={index} className="flex items-start gap-2" data-testid={`skill-gap-${index}`}>
                          <span className="text-red-400 mt-1">•</span>
                          <span className="text-gray-300">{skill}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing Keywords */}
                {result.missing_keywords && result.missing_keywords.length > 0 && (
                  <div className="bg-[#1A0F2E] rounded-2xl border border-white/10 p-8 shadow-sm" data-testid="missing-keywords-section">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle className="w-6 h-6 text-yellow-400" />
                      <h2 className="text-xl font-semibold text-white">Missing Keywords</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.missing_keywords.map((keyword, index) => (
                        <span
                          key={index}
                          data-testid={`missing-keyword-${index}`}
                          className="px-3 py-2 bg-[#2A1B47] text-yellow-300 rounded-lg text-sm font-medium border border-[#9E47FF]/20"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#1A0F2E] rounded-2xl border border-white/10 p-12 shadow-sm text-center">
                <Target className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">
                  Select a resume and paste a job description to see the match analysis
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};