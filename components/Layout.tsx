import React, { useState, useEffect } from 'react';
import { APP_VERSION, CHANGELOG } from '../constants';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themePref, setThemePref] = useState<'light' | 'dark' | 'system'>('system');
  const [mounted, setMounted] = useState(false);
  const [showReleaseAlert, setShowReleaseAlert] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setThemePref(savedTheme);
    }

    // Check for version update
    const lastSeenVersion = localStorage.getItem('lastSeenVersion');
    if (lastSeenVersion !== APP_VERSION) {
      setShowReleaseAlert(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = () => {
      const systemPrefersDark = mediaQuery.matches;
      const shouldUseDark = themePref === 'dark' || (themePref === 'system' && systemPrefersDark);
      
      if (shouldUseDark) {
        document.documentElement.classList.add('dark');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#1f2937');
      } else {
        document.documentElement.classList.remove('dark');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff');
      }
    };

    applyTheme();

    const handleChange = () => {
      if (themePref === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themePref, mounted]);

  const cycleTheme = () => {
    const nextTheme = themePref === 'system' ? 'light' : themePref === 'light' ? 'dark' : 'system';
    setThemePref(nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  const dismissAlert = () => {
    setShowReleaseAlert(false);
    localStorage.setItem('lastSeenVersion', APP_VERSION);
  };

  const openReleaseModal = () => {
    setShowReleaseAlert(false);
    setShowReleaseModal(true);
    localStorage.setItem('lastSeenVersion', APP_VERSION);
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch if using SSR, though this is CRA-like
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-200">
        {showReleaseAlert && (
          <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>CE Pricing KSA has been updated to v{APP_VERSION}!</span>
              <button onClick={openReleaseModal} className="underline font-medium hover:text-blue-100 ml-2">View Changes</button>
            </div>
            <button onClick={dismissAlert} className="text-white hover:text-blue-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        )}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             {/* Logo Placeholder */}
             <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold">
               CE
             </div>
             <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
               Pricing KSA <span className="text-gray-400 font-normal">v{APP_VERSION}</span>
             </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={openReleaseModal}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                aria-label="View Release Notes"
                title="View Release Notes"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </button>
              <button
                onClick={cycleTheme}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                aria-label="Toggle Theme"
                title={`Current Theme: ${themePref.charAt(0).toUpperCase() + themePref.slice(1)}`}
              >
                {themePref === 'light' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                  </svg>
                )}
                {themePref === 'dark' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                  </svg>
                )}
                {themePref === 'system' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                )}
              </button>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium hidden sm:block">
              CE Pricing Architect
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        {children}
      </main>

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            &copy; Wolters Kluwer Arabia Regional Headquarters Limited.
          </p>
        </div>
      </footer>

      {/* Release Notes Modal */}
      {showReleaseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">What's New</h3>
              <button onClick={() => setShowReleaseModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 pr-2">
              {CHANGELOG.map((release, index) => (
                <div key={release.version} className={`mb-6 ${index !== CHANGELOG.length - 1 ? 'border-b border-gray-100 dark:border-gray-700 pb-6' : ''}`}>
                  <div className="flex items-baseline space-x-2 mb-2">
                    <h4 className="text-lg font-bold text-blue-600 dark:text-blue-400">v{release.version}</h4>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{release.date}</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    {release.changes.map((change, i) => (
                      <li key={i}>{change}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button 
                onClick={() => setShowReleaseModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};