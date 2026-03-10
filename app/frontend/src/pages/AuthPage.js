import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';

export const AuthPage = ({ mode = 'login' }) => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const isLogin = mode === 'login';

    const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('Login successful!');
        navigate('/pricing');
      } else {
        await register(formData.name, formData.email, formData.password);
        toast.success('Account created successfully! Please login.');
        navigate('/login');
      }
    } catch (error) {
      const msg = error.response?.data?.detail;
      const status = error.response?.status;
      if (isLogin && status === 404) {
        toast.error('No account found for this email. Please register first.');
        navigate('/register');
      } else {
        toast.error(msg || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#100720] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-[#9E47FF]" />
            <h1 className="text-3xl font-bold text-white">HireReady AI</h1>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2" data-testid="auth-title">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-400">
            {isLogin ? 'Login to access your dashboard' : 'Start your placement journey today'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-[#1A0F2E] to-[#0D0515] rounded-2xl border border-white/10 p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="auth-form">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  data-testid="name-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#9E47FF]"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                data-testid="email-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#9E47FF]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                data-testid="password-input"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#9E47FF]"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-[#9E47FF] hover:bg-[#8B3FE6] text-white font-medium"
              data-testid="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                isLogin ? 'Login' : 'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              {' '}
              <button
                onClick={() => navigate(isLogin ? '/register' : '/login')}
                data-testid="auth-toggle-btn"
                className="text-[#9E47FF] font-medium hover:underline"
              >
                {isLogin ? 'Sign up' : 'Login'}
              </button>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            data-testid="back-to-home-btn"
            className="text-sm text-gray-400 hover:text-white"
          >
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  );
};