import React, { useState, useEffect } from 'react';
import { APP_VERSION, CHANGELOG } from '../constants';

export const Layout: React.FC<{ children: React.ReactNode; onLogout?: () => void; userName?: string; onProfileClick?: () => void; onMyQuotesClick?: () => void; isAdmin?: boolean;    onAdminClick?: () => void; }> = ({ children, onLogout, userName, onProfileClick, onMyQuotesClick, isAdmin,
  
  
  onAdminClick }) => {
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-teal-50 dark:from-indigo-950 dark:via-purple-900/50 dark:to-teal-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200 bg-fixed relative">
      {/* Liquid Blobs Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
        <div className="absolute -top-[10%] -left-[10%] w-[40vw] h-[40vw] rounded-full bg-purple-300/30 dark:bg-purple-700/20 mix-blend-multiply dark:mix-blend-screen filter blur-[80px] opacity-70 animate-blob"></div>
        <div className="absolute top-[20%] -right-[10%] w-[45vw] h-[45vw] rounded-full bg-teal-300/30 dark:bg-teal-700/20 mix-blend-multiply dark:mix-blend-screen filter blur-[80px] opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-indigo-300/30 dark:bg-indigo-700/20 mix-blend-multiply dark:mix-blend-screen filter blur-[80px] opacity-70 animate-blob animation-delay-4000"></div>
      </div>
      
      <header className="bg-white/30 dark:bg-gray-900/40 backdrop-blur-lg border-b border-white/20 dark:border-gray-700/50 sticky top-0 z-50 transition-colors duration-200 shadow-sm">
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
             {/* Liquid-Glass CE Brand Mark */}
             <div
               className="group relative flex items-center justify-center p-[1.5px] rounded-2xl bg-gradient-to-b from-white/80 via-white/25 to-cyan-300/30 dark:from-white/40 dark:via-white/10 dark:to-cyan-400/20 shadow-[0_4px_16px_rgba(37,99,235,0.35),0_2px_4px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_22px_rgba(37,99,235,0.5),0_2px_8px_rgba(0,0,0,0.12)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-default select-none flex-shrink-0"
               title="Clinical Effectiveness"
             >
               <div className="relative w-9 h-9 rounded-[14px] bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 dark:from-blue-500 dark:via-indigo-600 dark:to-cyan-400 flex items-center justify-center overflow-hidden shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.7),inset_0_-2px_3px_rgba(0,0,0,0.25)]">
                 {/* Specular Curved Convex Lens Glare */}
                 <div className="absolute inset-x-0 top-0 h-[48%] bg-gradient-to-b from-white/60 via-white/20 to-transparent rounded-t-[14px] pointer-events-none" />

                 {/* Liquid Caustic Glows */}
                 <div className="absolute -top-1 -left-1 w-4 h-4 bg-white/40 rounded-full blur-[2px] pointer-events-none" />
                 <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-cyan-300/50 dark:bg-cyan-400/30 rounded-full blur-[3px] pointer-events-none" />

                 {/* Fluid Refractive Edge Rim */}
                 <div className="absolute inset-0 rounded-[14px] border border-white/40 dark:border-white/20 pointer-events-none" />

                 {/* Interactive Dynamic Shimmer */}
                 <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/35 to-transparent -skew-x-12 pointer-events-none" />

                 {/* "CE" Lettermark */}
                 <span className="relative z-10 text-[13px] font-black tracking-wider text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.8)] select-none">
                   CE
                 </span>
               </div>
             </div>
             <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
               Pricing KSA <span className="text-gray-400 font-normal">v{APP_VERSION}</span>
             </h1>
          </div>
          
          


          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {isAdmin && onAdminClick && (
                <button
                  onClick={onAdminClick}
                  className="p-2 flex items-center gap-1 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/40 focus:outline-none transition-colors"
                  title="Admin Dashboard"
                >
                  🛡️ <span className="hidden sm:inline text-sm font-medium">Admin</span>
                </button>
              )}
              {onMyQuotesClick && (
                <button
                  onClick={onMyQuotesClick}
                  className="p-2 flex items-center gap-1 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none transition-colors"
                  title="My Saved Quotes & Drafts"
                >
                  📂 <span className="hidden sm:inline text-sm font-medium">Quotes</span>
                </button>
              )}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-2 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  aria-label="Lock Session (Return to Login)"
                  title="Lock Session / Return to Login"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </button>
              )}
              <button
                onClick={openReleaseModal}
                className="p-2 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                aria-label="View Release Notes"
                title="View Release Notes"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </button>
              <button
                onClick={cycleTheme}
                className="p-2 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
              {onProfileClick && (
                <button
                  onClick={onProfileClick}
                  className="p-2 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center justify-center cursor-pointer"
                  aria-label="User Profile"
                  title={userName ? `User Profile (${userName})` : "User Profile"}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow flex flex-col relative w-full">
        {children}
      </main>

      <footer className="bg-white/30 dark:bg-gray-900/40 backdrop-blur-lg border-t border-white/20 dark:border-gray-700/50 mt-auto transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            &copy; Wolters Kluwer Arabia Regional Headquarters Limited.
          </p>
        </div>
      </footer>

      {/* Release Notes Modal */}
      {showReleaseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] max-w-2xl w-full p-8 border border-white/50 dark:border-gray-700/50 max-h-[90vh] flex flex-col transition-all duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-gray-200/50 dark:border-gray-700/50 pb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">What's New</h3>
              <button onClick={() => setShowReleaseModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 pr-2">
              {CHANGELOG.map((release, index) => (
                <div key={release.version} className={`mb-6 ${index !== CHANGELOG.length - 1 ? 'border-b border-gray-100/50 dark:border-gray-700/50 pb-6' : ''}`}>
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
            <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-700/50 flex justify-end">
              <button 
                onClick={() => setShowReleaseModal(false)}
                className="px-6 py-2.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-xl text-sm font-bold shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] transition-all"
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