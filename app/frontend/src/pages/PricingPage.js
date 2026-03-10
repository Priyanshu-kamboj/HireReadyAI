import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { ArrowLeft, Check, Crown, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
// We will load Razorpay checkout script directly to avoid import/runtime issues

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const PricingPage = () => {
  const navigate = useNavigate();
  const { user, token, fetchUser } = useAuth();
  // Helper to ensure Razorpay SDK is available
  const ensureRazorpayLoaded = async () => {
    if (typeof window !== 'undefined' && window.Razorpay) return;
    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existing) {
        existing.addEventListener('load', resolve);
        existing.addEventListener('error', reject);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
      document.body.appendChild(script);
    });
  };
  const [packages, setPackages] = useState([]);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingPackage, setProcessingPackage] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchPackages();
  }, [user]);

  const fetchPackages = async () => {
    try {
      const response = await axios.get(`${API}/payment/packages`);
      const packagesData = response.data.packages || [];
      
      // Validate that packages are properly formatted
      const validPackages = packagesData.filter(pkg => 
        pkg && typeof pkg === 'object' && pkg.id && pkg.name && Array.isArray(pkg.features)
      );
      
      setPackages(validPackages);
      setRazorpayKeyId(response.data.razorpay_key_id || '');
    } catch (error) {
      console.error('Failed to fetch packages:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to load pricing packages';
      toast.error(typeof errorMessage === 'string' ? errorMessage : 'Failed to load pricing packages');
      setPackages([]); // Ensure packages is always an array
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageId) => {
    if (!user) {
      toast.error('Please login to purchase');
      navigate('/login');
      return;
    }

    setProcessingPackage(packageId);

    try {
      // Create Razorpay order
      const orderResponse = await axios.post(
        `${API}/payment/create-order`,
        { 
          package_id: packageId,
          origin_url: window.location.origin 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { order_id, amount, currency, key_id } = orderResponse.data;

      // Razorpay checkout options
      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: 'HireReady AI',
        description: `Purchase ${packageId} analysis package`,
        order_id: order_id,
        handler: async (response) => {
          try {
            // Verify payment on backend
            await axios.post(
              `${API}/payment/verify`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success('Payment successful! Credit added to your account.');
            await fetchUser();
            navigate('/dashboard');
          } catch (error) {
            console.error('Payment verification failed:', error);
            toast.error('Payment verification failed');
          } finally {
            setProcessingPackage(null);
          }
        },
        prefill: {
          name: user.name,
          email: user.email
        },
        theme: {
          color: '#9E47FF'
        },
        modal: {
          ondismiss: () => {
            setProcessingPackage(null);
            toast.info('Payment cancelled');
          }
        }
      };

      // Ensure SDK is loaded and open Razorpay checkout
      await ensureRazorpayLoaded();
      const Rzp = typeof window !== 'undefined' ? window.Razorpay : null;
      if (!Rzp) {
        toast.error('Razorpay SDK not available. Please refresh or try again.');
        setProcessingPackage(null);
        return;
      }
      const rzp = new Rzp(options);
      rzp.open();
    } catch (error) {
      console.error('Payment initiation failed:', error);
      toast.error(error.response?.data?.detail || 'Failed to initiate payment');
      setProcessingPackage(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#100720] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-[#9E47FF] animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading pricing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#100720]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          data-testid="back-to-dashboard-btn"
          className="mb-6 text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300 mb-6">
            <Sparkles className="w-4 h-4 text-[#9E47FF]" />
            Welcome to HireReady AI
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white" data-testid="pricing-heading">
            Transform Your Resume with AI
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            Get instant ATS scoring, job description matching, and AI-powered interview prep. 
            Choose a package below to unlock professional resume analysis.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#00FF99]" />
              <span>Instant AI Analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#00FF99]" />
              <span>OpenAI GPT-4o Powered</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#00FF99]" />
              <span>Secure Razorpay Payment</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {packages.map((pkg, index) => (
            <div
              key={pkg.id}
              data-testid={`package-${pkg.id}`}
              className={`rounded-2xl p-8 border ${
                index === 1
                  ? 'bg-gradient-to-br from-[#9E47FF]/20 to-[#6B21FF]/20 border-[#9E47FF] ring-4 ring-[#9E47FF]/20 transform scale-105'
                  : 'bg-gradient-to-br from-[#1A0F2E] to-[#0D0515] border-white/10'
              }`}
            >
              {index === 1 && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#9E47FF] rounded-full text-xs font-semibold text-white mb-4">
                  <Crown className="w-3 h-3" />
                  MOST POPULAR
                </div>
              )}
              <h3 className="text-2xl font-semibold mb-2 text-white">{pkg.name}</h3>
              <div className="mb-6">
                <span className="text-5xl font-bold text-white">₹{pkg.price}</span>
                <span className="text-gray-400"> one-time</span>
              </div>
              <ul className="space-y-3 mb-8">
                {pkg.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check
                      className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        index === 1 ? 'text-[#00FF99]' : 'text-gray-500'
                      }`}
                    />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handlePurchase(pkg.id)}
                data-testid={`purchase-btn-${pkg.id}`}
                disabled={processingPackage === pkg.id}
                className={`w-full rounded-lg py-6 font-medium ${
                  index === 1
                    ? 'bg-[#9E47FF] hover:bg-[#8B3FE6] text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }`}
              >
                {processingPackage === pkg.id ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Purchase ${pkg.name}`
                )}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-400 text-sm">
            Secure payment powered by Razorpay • All prices in Indian Rupees (INR)
          </p>
        </div>
      </div>
    </div>
  );
};