import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Brain, Target, TrendingUp, Sparkles, CheckCircle, ArrowRight } from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Brain className="w-8 h-8 text-[#9E47FF]" />,
      title: "AI-Powered ATS Scoring",
      description: "Get instant resume scores (0-100) with detailed feedback on improvements"
    },
    {
      icon: <Target className="w-8 h-8 text-[#9E47FF]" />,
      title: "Job Description Matching",
      description: "Identify skill gaps and missing keywords for any job posting"
    },
    {
      icon: <Sparkles className="w-8 h-8 text-[#9E47FF]" />,
      title: "Smart Resume Improvements",
      description: "Company-specific suggestions to optimize your resume for each application"
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-[#9E47FF]" />,
      title: "Interview Question Generator",
      description: "Practice with AI-generated technical, HR, and project-based questions"
    }
  ];

  const plans = [
    {
      name: "Basic Analysis",
      price: "₹20",
      period: "/analysis",
      features: [
        "ATS Score (0-100)",
        "Section-wise feedback",
        "Keyword suggestions",
        "Formatting recommendations"
      ],
      cta: "Get Started",
      highlighted: false
    },
    {
      name: "Detailed AI + JD Matching",
      price: "₹49",
      period: "/analysis",
      features: [
        "Everything in Basic",
        "Job Description Matching",
        "Skill gap analysis",
        "Missing keywords identification",
        "Priority AI processing"
      ],
      cta: "Most Popular",
      highlighted: true
    },
    {
      name: "Full Pro Analysis",
      price: "₹79",
      period: "/analysis",
      features: [
        "Everything in Detailed",
        "Interview question generation",
        "Technical questions",
        "HR & behavioral questions",
        "Project-based questions"
      ],
      cta: "Best Value",
      highlighted: false
    }
  ];

  return (
    <div className="min-h-screen bg-[#100720]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#100720] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#9E47FF]" />
            <h1 className="text-2xl font-bold text-white" data-testid="logo-text">HireReady AI</h1>
          </div>
          <div className="hidden md:flex gap-8 items-center">
            <button
              onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
              className="text-gray-300 hover:text-white transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}
              className="text-gray-300 hover:text-white transition-colors"
            >
              Pricing
            </button>
          </div>
          <div className="flex gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/login')}
              data-testid="header-login-btn"
              className="text-white hover:bg-white/10"
            >
              Log in
            </Button>
            <Button
              onClick={() => navigate('/register')}
              data-testid="header-register-btn"
              className="rounded-lg px-6 bg-[#9E47FF] hover:bg-[#8B3FE6] text-white"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center space-y-8 max-w-5xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300">
              <Sparkles className="w-4 h-4 text-[#9E47FF]" />
              AI-Powered Placement Readiness for B.Tech Students
            </div>

            {/* Headline */}
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
              <span className="text-white">Land Your Dream Job </span>
              <span className="text-[#9E47FF]">with AI</span>
            </h2>

            {/* Sub-headline */}
            <p className="text-lg md:text-xl leading-relaxed text-gray-400 max-w-3xl mx-auto">
              Analyze your resume, match it to job descriptions, generate interview questions, and track your placement readiness — all powered by AI.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                onClick={() => navigate('/register')}
                data-testid="hero-cta-btn"
                className="rounded-lg px-8 py-6 text-lg font-medium bg-[#9E47FF] hover:bg-[#8B3FE6] text-white"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                data-testid="hero-learn-more-btn"
                className="rounded-lg px-8 py-6 text-lg font-medium border-white/20 hover:bg-white/5 text-white"
              >
                See Features
              </Button>
            </div>

            {/* Trust Signal */}
            <p className="text-sm text-gray-500">
              Pay per analysis • No subscriptions • Instant results
            </p>
          </div>
        </div>
      </section>

      {/* Stats Preview */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="bg-gradient-to-br from-[#1A0F2E] to-[#0D0515] rounded-2xl border border-white/10 p-8 md:p-12">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <p className="text-gray-400 text-sm mb-2">ATS Score</p>
                <p className="text-5xl font-bold text-[#9E47FF]">87</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">JD Match</p>
                <p className="text-5xl font-bold text-[#00D9FF]">72%</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">Readiness</p>
                <p className="text-5xl font-bold text-[#00FF99]">High</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-[#0D0515]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4 text-white" data-testid="features-heading">
              Everything You Need to Get Hired
            </h3>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Comprehensive AI-powered tools to transform your placement journey
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                data-testid={`feature-card-${index}`}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A0F2E]/50 to-[#100720]/50 p-8 hover:border-[#9E47FF]/50 transition-all duration-300"
              >
                <div className="mb-4">{feature.icon}</div>
                <h4 className="text-2xl font-semibold mb-3 text-white">{feature.title}</h4>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-[#100720]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4 text-white" data-testid="pricing-heading">
              Pay Only for What You Need
            </h3>
            <p className="text-lg text-gray-400">
              One-time payment, instant analysis. No subscriptions, no commitments.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={index}
                data-testid={`pricing-plan-${index}`}
                className={`rounded-2xl p-8 border ${
                  plan.highlighted
                    ? 'bg-gradient-to-br from-[#9E47FF]/20 to-[#6B21FF]/20 border-[#9E47FF] ring-4 ring-[#9E47FF]/20 transform scale-105'
                    : 'bg-gradient-to-br from-[#1A0F2E] to-[#0D0515] border-white/10'
                }`}
              >
                <h4 className="text-2xl font-semibold mb-2 text-white">
                  {plan.name}
                </h4>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        plan.highlighted ? 'text-[#00FF99]' : 'text-gray-500'
                      }`} />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => navigate('/pricing')}
                  data-testid={`pricing-cta-${index}`}
                  className={`w-full rounded-lg py-6 font-medium ${
                    plan.highlighted
                      ? 'bg-[#9E47FF] hover:bg-[#8B3FE6] text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <p className="text-gray-400">
              Secure payment powered by Razorpay • Instant credit delivery
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0D0515] text-white py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <p className="text-gray-400">
            © 2025 HireReady AI. Built for Indian B.Tech students with ❤️
          </p>
        </div>
      </footer>
    </div>
  );
};