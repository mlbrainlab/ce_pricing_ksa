import { useEffect, useState } from 'react';
import { WK_LOGO_BASE64 } from '../wkLogo';
import { loginWithGoogle } from '../firebaseClient';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Keep theme synced with system preference on the login screen
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
  }, []);

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    
    try {
      await loginWithGoogle();
      onLogin();
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img src={WK_LOGO_BASE64} alt="WK Logo" className="h-12 w-auto object-contain bg-blue-600 p-2 rounded" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Sign in to access
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Sign in with your Google Account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200 dark:border-gray-700 transition-colors flex flex-col items-center">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign in with Google'}
          </button>
          
          {error && (
            <div className="mt-4 w-full text-red-600 dark:text-red-400 text-sm font-medium bg-red-50 dark:bg-red-900/30 p-3 rounded-md border border-red-200 dark:border-red-800 transition-colors">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
