import React, { useState, useEffect } from 'react';
import { supabase } from './auth';
import { WK_LOGO_BASE64 } from '../wkLogo';
import { APP_VERSION } from '../constants';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        onLogin();
      }
    };
    checkSession();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      let savedTheme = localStorage.getItem('theme');
      if (!savedTheme) {
        localStorage.setItem('theme', 'system');
        savedTheme = 'system';
      }
      const systemPrefersDark = mediaQuery.matches;
      const shouldUseDark = savedTheme === 'dark' || (savedTheme === 'system' && systemPrefersDark);
      
      if (shouldUseDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    mediaQuery.addEventListener('change', applyTheme);
    applyTheme();
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [onLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    
    try {
      if (isSignUp) {
        if (!firstName.trim() || !lastName.trim()) {
          setError('Please enter your first and last name.');
          setIsLoading(false);
          return;
        }
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
            }
          }
        });
        if (signUpError) throw signUpError;
        setMessage('Check your email for the confirmation link!');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        onLogin();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-teal-50 dark:from-indigo-950 dark:via-purple-900/50 dark:to-teal-950">
      
      {/* Animated Liquid Blobs Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[45vw] h-[45vw] rounded-full bg-purple-300/30 dark:bg-purple-700/20 mix-blend-multiply dark:mix-blend-screen filter blur-[90px] opacity-75 animate-blob"></div>
        <div className="absolute top-[20%] -right-[10%] w-[45vw] h-[45vw] rounded-full bg-teal-300/30 dark:bg-teal-700/20 mix-blend-multiply dark:mix-blend-screen filter blur-[90px] opacity-75 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-indigo-300/30 dark:bg-indigo-700/20 mix-blend-multiply dark:mix-blend-screen filter blur-[90px] opacity-75 animate-blob animation-delay-4000"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Liquid-Glass Brand Badge with WK Logo */}
        <div className="flex justify-center">
          <div className="group relative flex items-center justify-center p-[2px] rounded-3xl bg-gradient-to-b from-white/80 via-white/25 to-cyan-300/30 dark:from-white/40 dark:via-white/10 dark:to-cyan-400/20 shadow-[0_8px_32px_rgba(37,99,235,0.25),0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(37,99,235,0.4)] transition-all duration-300 hover:scale-[1.03] select-none">
            <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 dark:from-blue-500 dark:via-indigo-600 dark:to-cyan-400 p-3 shadow-[inset_0_2px_3px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.25)] flex items-center justify-center">
              {/* Convex Lens Glare */}
              <div className="absolute inset-x-0 top-0 h-[48%] bg-gradient-to-b from-white/60 via-white/20 to-transparent rounded-t-[22px] pointer-events-none" />
              {/* Caustic Glows */}
              <div className="absolute -top-1 -left-1 w-6 h-6 bg-white/40 rounded-full blur-[3px] pointer-events-none" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-cyan-300/40 rounded-full blur-[4px] pointer-events-none" />
              {/* Shimmer Light Streak */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 pointer-events-none" />
              <img src={WK_LOGO_BASE64} alt="WK Logo" className="relative z-10 h-11 w-auto object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
            </div>
          </div>
        </div>

        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white drop-shadow-sm">
          {isSignUp ? 'Create an account' : 'Sign in to access'}
        </h2>
        <div className="mt-2 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-white/60 dark:border-gray-700/60 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] text-blue-800 dark:text-blue-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            v{APP_VERSION}
          </span>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Liquid Glass Card Container */}
        <div className="relative overflow-hidden bg-white/65 dark:bg-gray-900/65 backdrop-blur-2xl backdrop-saturate-[200%] py-10 px-6 sm:px-12 rounded-[2.25rem] border border-white/70 dark:border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.08),0_4px_12px_rgba(37,99,235,0.06),inset_0_2px_3px_rgba(255,255,255,0.85)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.45),inset_0_1px_2px_rgba(255,255,255,0.15)] transition-all duration-300">
          {/* Subtle Top Specular Curved Highlight across Card */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/40 via-white/10 to-transparent dark:from-white/10 dark:via-transparent rounded-t-[2.25rem] pointer-events-none" />

          <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
            {isSignUp && (
              <div className="flex gap-4">
                <div className="flex-1">
                  <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-2 block w-full px-4 py-3 border border-white/80 dark:border-gray-700/60 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500/60 sm:text-sm bg-white/60 dark:bg-gray-800/60 text-gray-900 dark:text-white backdrop-blur-xl transition-all duration-200"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-2 block w-full px-4 py-3 border border-white/80 dark:border-gray-700/60 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500/60 sm:text-sm bg-white/60 dark:bg-gray-800/60 text-gray-900 dark:text-white backdrop-blur-xl transition-all duration-200"
                  />
                </div>
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 block w-full px-4 py-3 border border-white/80 dark:border-gray-700/60 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500/60 sm:text-sm bg-white/60 dark:bg-gray-800/60 text-gray-900 dark:text-white backdrop-blur-xl transition-all duration-200 ph-no-capture"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 block w-full px-4 py-3 border border-white/80 dark:border-gray-700/60 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500/60 sm:text-sm bg-white/60 dark:bg-gray-800/60 text-gray-900 dark:text-white backdrop-blur-xl transition-all duration-200 ph-no-capture"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-700 dark:text-red-300 text-sm font-medium bg-red-500/10 dark:bg-red-900/30 p-3.5 rounded-xl border border-red-500/30 backdrop-blur-md transition-colors shadow-sm">
                {error}
              </div>
            )}
            
            {message && (
              <div className="text-emerald-700 dark:text-emerald-300 text-sm font-medium bg-emerald-500/10 dark:bg-emerald-900/30 p-3.5 rounded-xl border border-emerald-500/30 backdrop-blur-md transition-colors shadow-sm">
                {message}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative overflow-hidden w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-500 shadow-[0_6px_20px_rgba(37,99,235,0.4),inset_0_1.5px_1.5px_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_26px_rgba(37,99,235,0.55),inset_0_1.5px_1.5px_rgba(255,255,255,0.7)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 disabled:opacity-50 transition-all duration-300 active:scale-[0.98] cursor-pointer"
              >
                {/* Button Convex Glass Glare */}
                <div className="absolute inset-x-0 top-0 h-[48%] bg-gradient-to-b from-white/35 via-white/10 to-transparent pointer-events-none" />
                {/* Button Light Shimmer */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12 pointer-events-none" />
                <span className="relative z-10">
                  {isLoading ? (isSignUp ? 'Signing up...' : 'Signing in...') : (isSignUp ? 'Sign up' : 'Sign in')}
                </span>
              </button>
            </div>
          </form>

          <div className="mt-6 text-center relative z-10">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 px-3 py-1.5 rounded-xl hover:bg-blue-50/50 dark:hover:bg-blue-900/30 transition-all focus:outline-none"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
