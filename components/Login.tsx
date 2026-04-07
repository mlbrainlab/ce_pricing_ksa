import React, { useState } from 'react';
import { verifyPasscode } from './auth';
import { WK_LOGO_BASE64 } from '../wkLogo';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!passcode.trim()) {
      setError('Please enter the monthly passcode.');
      return;
    }

    setIsLoading(true);
    
    try {
      const isValid = await verifyPasscode(passcode);
      if (isValid) {
        onLogin();
      } else {
        setError('Invalid passcode for the current month.');
      }
    } catch (err) {
      setError('An error occurred while verifying the passcode.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img src={WK_LOGO_BASE64} alt="WK Logo" className="h-12 w-auto object-contain bg-blue-600 p-2 rounded" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to access
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Please enter the monthly shared passcode.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="passcode" className="block text-sm font-medium text-gray-700">
                Monthly Passcode
              </label>
              <div className="mt-1">
                <input
                  id="passcode"
                  name="passcode"
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ph-no-capture"
                  placeholder="City1City2"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-md border border-red-200">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
