import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { Loader2Icon } from 'lucide-react';

const SignIn = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  // If user is already logged in, redirect to home
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isSignUp) {
        // Sign Up Flow
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          // Sync with our database
          await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: data.user.id,
              email: data.user.email,
              name: fullName || data.user.email?.split('@')[0] || 'User',
            }),
          });

          setSuccessMsg('Registration successful! Please check your email for a confirmation link.');
        }
      } else {
        // Sign In Flow
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          // Sync with our database on sign in as well to ensure they exist
          await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: data.user.id,
              email: data.user.email,
              name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
            }),
          });

          navigate('/');
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black/60 px-4 font-poppins relative">
      {/* Background Gradient */}
      <img src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/refs/heads/main/assets/hero/bg-gradient-2.png" className="absolute inset-0 -z-10 size-full object-cover opacity-80" alt="" />
      
      <div className="bg-white/5 border border-slate-800 backdrop-blur-xl w-full max-w-md p-8 rounded-2xl shadow-2xl transition-all duration-300 focus-within:border-indigo-500/50">
        <h2 className="text-3xl font-bold text-center text-white mb-2">
          {isSignUp ? 'Create an Account' : 'Welcome Back'}
        </h2>
        <p className="text-gray-400 text-center text-sm mb-8">
          {isSignUp ? 'Start building websites with AI instantly' : 'Sign in to access your projects'}
        </p>

        {errorMsg && (
          <div className="mb-4 p-3.5 bg-red-950/60 border border-red-500/50 rounded-lg text-red-200 text-xs leading-relaxed">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 bg-green-950/60 border border-green-500/50 rounded-lg text-green-200 text-xs leading-relaxed">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-white/5 border border-slate-700/60 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-slate-700/60 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-slate-700/60 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:opacity-95 text-white py-2.5 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 text-sm mt-6 cursor-pointer"
          >
            {loading ? (
              <>
                Processing <Loader2Icon className="animate-spin size-4 text-white" />
              </>
            ) : (
              isSignUp ? 'Sign Up' : 'Sign In'
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-400">
          {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="text-indigo-400 font-semibold hover:underline bg-transparent border-none outline-none cursor-pointer"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
