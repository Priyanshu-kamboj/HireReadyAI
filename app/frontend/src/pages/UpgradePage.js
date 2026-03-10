import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { ArrowLeft, CheckCircle, Crown, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export const UpgradePage = () => {
  const navigate = useNavigate();
  const { user, upgradeUser } = useAuth();

  const handleUpgrade = async () => {
    try {
      await upgradeUser();
      toast.success('Upgraded to Pro successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Upgrade failed. Please try again.');
    }
  };

  if (user?.plan_type === 'pro') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <Crown className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">You're Already Pro!</h1>
          <p className="text-slate-600 mb-6">Enjoy unlimited resume analyses</p>
          <Button onClick={() => navigate('/dashboard')} data-testid="back-to-dashboard-btn">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const proFeatures = [
    "Unlimited resume analyses",
    "Advanced ATS scoring algorithm",
    "Priority AI processing",
    "Detailed improvement reports",
    "Company-specific optimization",
    "Interview prep analytics",
    "Export reports as PDF",
    "Email support"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          data-testid="back-to-dashboard-btn"
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Limited Time Offer
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="upgrade-heading">
            Upgrade to Pro
          </h1>
          <p className="text-lg text-slate-600">
            Unlock unlimited resume analyses and premium features
          </p>
        </div>

        <div className="bg-slate-900 text-white rounded-3xl p-12 shadow-2xl mb-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Crown className="w-10 h-10 text-yellow-400" />
            <h2 className="text-3xl font-bold">Pro Plan</h2>
          </div>
          
          <div className="text-center mb-8">
            <div className="flex items-end justify-center gap-2 mb-2">
              <span className="text-6xl font-bold">₹299</span>
              <span className="text-2xl text-slate-300 mb-2">/month</span>
            </div>
            <p className="text-slate-300">Cancel anytime, no commitments</p>
          </div>

          <ul className="space-y-4 mb-10">
            {proFeatures.map((feature, index) => (
              <li key={index} className="flex items-start gap-3" data-testid={`pro-feature-${index}`}>
                <CheckCircle className="w-6 h-6 text-lime-400 flex-shrink-0 mt-0.5" />
                <span className="text-lg">{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            onClick={handleUpgrade}
            data-testid="upgrade-submit-btn"
            className="w-full h-14 bg-white text-slate-900 hover:bg-slate-100 text-lg font-semibold rounded-xl"
          >
            Upgrade to Pro Now
          </Button>

          <p className="text-center text-sm text-slate-400 mt-6">
            Note: This is a test upgrade. In production, Razorpay payment integration will be active.
          </p>
        </div>

        <div className="text-center text-sm text-slate-500">
          <p>Trusted by thousands of B.Tech students across India</p>
        </div>
      </div>
    </div>
  );
};