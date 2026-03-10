import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token, fetchUser } = useAuth();
  const [status, setStatus] = useState('checking');
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 5;

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      navigate('/dashboard');
      return;
    }
    checkPaymentStatus();
  }, [sessionId]);

  const checkPaymentStatus = async () => {
    if (!token || attempts >= maxAttempts) {
      setStatus('error');
      return;
    }

    try {
      const response = await axios.get(`${API}/payment/status/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data;
      setPaymentInfo(data);

      if (data.payment_status === 'paid') {
        setStatus('success');
        // Refresh user data
        await fetchUser();
      } else if (data.status === 'expired') {
        setStatus('expired');
      } else {
        // Continue polling
        setAttempts(prev => prev + 1);
        setTimeout(checkPaymentStatus, 2000);
      }
    } catch (error) {
      console.error('Error checking payment:', error);
      if (attempts < maxAttempts) {
        setAttempts(prev => prev + 1);
        setTimeout(checkPaymentStatus, 2000);
      } else {
        setStatus('error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#100720] flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-gradient-to-br from-[#1A0F2E] to-[#0D0515] rounded-2xl border border-white/10 p-8 shadow-2xl text-center">
          {status === 'checking' && (
            <>
              <Loader2 className="w-16 h-16 text-[#9E47FF] animate-spin mx-auto mb-6" data-testid="payment-loader" />
              <h2 className="text-2xl font-bold text-white mb-2">Processing Payment...</h2>
              <p className="text-gray-400">Please wait while we confirm your payment</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-[#00FF99] mx-auto mb-6" data-testid="payment-success-icon" />
              <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
              <p className="text-gray-400 mb-6">
                Your analysis credit has been added to your account
              </p>
              {paymentInfo && (
                <div className="bg-white/5 rounded-lg p-4 mb-6 text-left">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Package:</span>
                    <span className="text-white font-medium">{paymentInfo.package_id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Amount Paid:</span>
                    <span className="text-white font-medium">₹{paymentInfo.amount}</span>
                  </div>
                </div>
              )}
              <Button
                onClick={() => navigate('/analyze')}
                data-testid="go-to-analyze-btn"
                className="w-full bg-[#9E47FF] hover:bg-[#8B3FE6] text-white mb-3"
              >
                Start Analysis
              </Button>
              <Button
                onClick={() => navigate('/dashboard')}
                variant="outline"
                data-testid="back-to-dashboard-btn"
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                Go to Dashboard
              </Button>
            </>
          )}

          {status === 'expired' && (
            <>
              <XCircle className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-2">Session Expired</h2>
              <p className="text-gray-400 mb-6">
                Your payment session has expired. Please try again.
              </p>
              <Button
                onClick={() => navigate('/pricing')}
                data-testid="try-again-btn"
                className="w-full bg-[#9E47FF] hover:bg-[#8B3FE6] text-white"
              >
                Try Again
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-2">Payment Verification Failed</h2>
              <p className="text-gray-400 mb-6">
                We couldn't verify your payment. Please check your email for confirmation or contact support.
              </p>
              <Button
                onClick={() => navigate('/dashboard')}
                data-testid="back-to-dashboard-btn"
                className="w-full bg-[#9E47FF] hover:bg-[#8B3FE6] text-white"
              >
                Go to Dashboard
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};