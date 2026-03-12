import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { MessageSquare, Loader2, Code, Users, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const InterviewPage = () => {
  const navigate = useNavigate();
  const { token, fetchUser } = useAuth();
  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState('');
  const [targetCompaniesInput, setTargetCompaniesInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState(null);

  const buildMockInterviewResponse = (targetCompanies = []) => {
    const getCompanyMockQuestions = (company) => {
      const normalized = company.trim().toLowerCase();

      if (normalized.includes('google')) {
        return [
          'How would you design a globally scalable URL shortener service?',
          'How do you optimize p95 latency for a high-traffic backend endpoint?',
          'Describe an algorithmic trade-off you made in production and why.',
          'How did you use data to validate one important engineering decision?'
        ];
      }

      if (normalized.includes('microsoft')) {
        return [
          'How would you design a reliable collaboration feature for large enterprise usage?',
          'Describe a cross-team project where you had to align multiple stakeholders.',
          'How would you improve monitoring and observability for a cloud service?',
          'Share an example where backward compatibility changed your implementation.'
        ];
      }

      if (normalized.includes('amazon')) {
        return [
          'Tell me about a time you showed ownership during a production incident.',
          'How would you design an idempotent order-processing API?',
          'How do you balance fast shipping versus long-term maintainability?',
          'Which operational metrics would you track from day one and why?'
        ];
      }

      if (normalized.includes('meta') || normalized.includes('facebook')) {
        return [
          'How would you design and evaluate a feed ranking experiment?',
          'Describe a backend optimization that improved real user experience.',
          'How do you handle data freshness versus consistency trade-offs?',
          'Tell me about a technical disagreement and how you resolved it.'
        ];
      }

      return [
        `Why do you want to join ${company} for this role?`,
        `How does your resume experience align with the work culture at ${company}?`,
        `Describe one project from your resume that would be most relevant to ${company}.`,
        `Which engineering metrics would you improve first if you joined ${company}?`
      ];
    };

    const companySpecific = targetCompanies.reduce((acc, company) => {
      acc[company] = getCompanyMockQuestions(company);
      return acc;
    }, {});

    return {
      technical: [
        'Explain one backend architecture decision you made and why it was effective.',
        'How do you optimize API latency and database performance in production?',
        'How do you design authentication and authorization for a SaaS application?',
        'How do you test critical flows before release?',
        'Describe a scaling challenge you solved and what changed after the fix.'
      ],
      hr: [
        'Tell me about a time you handled conflicting deadlines.',
        'Describe a mistake you made and what you learned from it.',
        'How do you handle feedback during code reviews?',
        'How do you prioritize quality versus speed under pressure?'
      ],
      project_based: [
        'Walk through the architecture of your strongest project.',
        'What trade-offs did you make and why?',
        'How did you measure project success?',
        'If you rebuilt it today, what would you change first?'
      ],
      company_specific: companySpecific,
      target_companies: targetCompanies,
      remaining_credits: 0,
      meta: {
        source: 'frontend-mock',
        reason: 'Interview API unavailable'
      }
    };
  };

  const parseCompanies = (rawValue) => {
    const splitCompanies = rawValue
      .split(/[\n,]/)
      .map((company) => company.trim())
      .filter(Boolean);

    const uniqueCompanies = [];
    const seen = new Set();

    splitCompanies.forEach((company) => {
      const normalized = company.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        uniqueCompanies.push(company);
      }
    });

    return uniqueCompanies.slice(0, 5);
  };

  const fetchResumes = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/resume/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResumes(response.data.resumes || []);
    } catch (error) {
      console.error('Failed to fetch resumes:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleGenerate = async () => {
    if (!selectedResume) {
      toast.error('Please select a resume');
      return;
    }

    const targetCompanies = parseCompanies(targetCompaniesInput);

    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/resume/interview-questions`,
        {
          resume_id: selectedResume,
          target_companies: targetCompanies
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setQuestions(response.data);
      const withCompanySuffix = targetCompanies.length > 0 ? ` for ${targetCompanies.length} company target(s)` : '';
      toast.success(`Interview questions generated${withCompanySuffix}! ${response.data.remaining_credits} credits remaining`);
      await fetchUser();
    } catch (error) {
      const message = error.response?.data?.detail || 'Generation failed';
      const statusCode = error.response?.status;
      const isApiUnavailable = !error.response || [500, 502, 503, 504].includes(statusCode);

      if (isApiUnavailable) {
        const fallback = buildMockInterviewResponse(targetCompanies);
        setQuestions(fallback);
        toast.warning('Interview API is currently unavailable. Showing mock questions temporarily.');
        return;
      }

      toast.error(message);
      if (message.toLowerCase().includes('full plan')) {
        setTimeout(() => navigate('/pricing'), 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white" data-testid="interview-heading">
            Interview Preparation
          </h1>
          <p className="text-gray-400">
            Generate personalized interview questions based on your resume
          </p>
        </div>

        <div className="mb-6 p-4 bg-[#9E47FF]/10 border border-[#9E47FF]/30 rounded-lg">
          <p className="text-sm text-gray-200">
            Interview question generation is available on the Full plan. If generation fails with a plan message,
            upgrade from Pricing and try again.
          </p>
        </div>

        {/* Resume Selection */}
        <div className="bg-[#1A0F2E] rounded-2xl border border-white/10 p-8 shadow-sm mb-8">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold mb-4 text-white">Select Resume</h2>
            {resumes.length === 0 ? (
              <div className="p-4 bg-[#2A1B47] border border-[#9E47FF]/20 rounded-lg">
                <p className="text-sm text-yellow-300 mb-3">
                  No resumes found. Please analyze a resume first.
                </p>
                <Button
                  onClick={() => navigate('/analyze')}
                  data-testid="analyze-first-btn"
                  size="sm"
                  className="bg-[#9E47FF] hover:bg-[#8B3AE6] text-white"
                >
                  Analyze Resume
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Select value={selectedResume} onValueChange={setSelectedResume}>
                  <SelectTrigger data-testid="resume-select" className="bg-[#0F0618] border-white/10 text-white">
                    <SelectValue placeholder="Choose a resume" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A0F2E] border-white/10">
                    {resumes.map((resume) => (
                      <SelectItem key={resume.id} value={resume.id} data-testid={`resume-option-${resume.id}`} className="text-gray-300 focus:bg-[#9E47FF] focus:text-white">
                        Score: {resume.score} - {new Date(resume.created_at).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300 block" htmlFor="target-companies-input">
                    Target Companies (optional)
                  </label>
                  <textarea
                    id="target-companies-input"
                    data-testid="target-companies-input"
                    className="w-full min-h-[92px] rounded-md border border-white/10 bg-[#0F0618] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E47FF]"
                    placeholder="Example: Google, Microsoft, Amazon\nUse commas or new lines. Maximum 5 companies."
                    value={targetCompaniesInput}
                    onChange={(e) => setTargetCompaniesInput(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    We will tailor additional company-focused interview questions based on your selected resume.
                  </p>
                </div>

                <Button
                  onClick={handleGenerate}
                  data-testid="generate-questions-btn"
                  className="w-full h-12 bg-[#9E47FF] hover:bg-[#8B3AE6] text-white font-medium disabled:bg-gray-600 disabled:opacity-50"
                  disabled={loading || !selectedResume}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating Questions...
                    </>
                  ) : (
                    'Generate Interview Questions'
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Questions Display */}
        {questions ? (
          <div className="space-y-6">
            {/* Technical Questions */}
            {questions.technical && questions.technical.length > 0 && (
              <div className="bg-[#1A0F2E] rounded-2xl border border-white/10 p-8 shadow-sm" data-testid="technical-questions-section">
                <div className="flex items-center gap-3 mb-6">
                  <Code className="w-6 h-6 text-[#9E47FF]" />
                  <h2 className="text-2xl font-semibold text-white">Technical Questions</h2>
                </div>
                <ol className="space-y-4">
                  {questions.technical.map((question, index) => (
                    <li key={index} className="flex gap-4" data-testid={`technical-q-${index}`}>
                      <span className="flex-shrink-0 w-8 h-8 bg-[#9E47FF]/20 text-[#9E47FF] rounded-full flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </span>
                      <p className="text-gray-300 pt-1">{question}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* HR Questions */}
            {questions.hr && questions.hr.length > 0 && (
              <div className="bg-[#1A0F2E] rounded-2xl border border-white/10 p-8 shadow-sm" data-testid="hr-questions-section">
                <div className="flex items-center gap-3 mb-6">
                  <Users className="w-6 h-6 text-[#9E47FF]" />
                  <h2 className="text-2xl font-semibold text-white">HR & Behavioral Questions</h2>
                </div>
                <ol className="space-y-4">
                  {questions.hr.map((question, index) => (
                    <li key={index} className="flex gap-4" data-testid={`hr-q-${index}`}>
                      <span className="flex-shrink-0 w-8 h-8 bg-[#9E47FF]/20 text-[#9E47FF] rounded-full flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </span>
                      <p className="text-gray-300 pt-1">{question}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Project Questions */}
            {questions.project_based && questions.project_based.length > 0 && (
              <div className="bg-[#1A0F2E] rounded-2xl border border-white/10 p-8 shadow-sm" data-testid="project-questions-section">
                <div className="flex items-center gap-3 mb-6">
                  <Briefcase className="w-6 h-6 text-[#9E47FF]" />
                  <h2 className="text-2xl font-semibold text-white">Project-Based Questions</h2>
                </div>
                <ol className="space-y-4">
                  {questions.project_based.map((question, index) => (
                    <li key={index} className="flex gap-4" data-testid={`project-q-${index}`}>
                      <span className="flex-shrink-0 w-8 h-8 bg-[#9E47FF]/20 text-[#9E47FF] rounded-full flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </span>
                      <p className="text-gray-300 pt-1">{question}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Company-specific Questions */}
            {questions.company_specific && Object.keys(questions.company_specific).length > 0 && (
              <div className="bg-[#1A0F2E] rounded-2xl border border-white/10 p-8 shadow-sm" data-testid="company-questions-section">
                <div className="flex items-center gap-3 mb-6">
                  <Briefcase className="w-6 h-6 text-[#9E47FF]" />
                  <h2 className="text-2xl font-semibold text-white">Company-Specific Questions</h2>
                </div>
                <div className="space-y-6">
                  {Object.entries(questions.company_specific).map(([company, companyQuestions]) => (
                    <div key={company} className="rounded-xl border border-white/10 p-5 bg-[#0F0618]">
                      <h3 className="text-lg font-semibold text-white mb-4">{company}</h3>
                      <ol className="space-y-3">
                        {companyQuestions.map((question, index) => (
                          <li key={`${company}-${index}`} className="flex gap-4" data-testid={`company-${company}-q-${index}`}>
                            <span className="flex-shrink-0 w-8 h-8 bg-[#9E47FF]/20 text-[#9E47FF] rounded-full flex items-center justify-center font-semibold text-sm">
                              {index + 1}
                            </span>
                            <p className="text-gray-300 pt-1">{question}</p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#1A0F2E] rounded-2xl border border-white/10 p-12 shadow-sm text-center">
            <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              Select a resume and click generate to see personalized interview questions
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};