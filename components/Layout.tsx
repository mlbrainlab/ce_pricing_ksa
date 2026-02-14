import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             {/* Logo Placeholder */}
             <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold">
               CE
             </div>
             <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
               Pricing KSA <span className="text-gray-400 font-normal">v6.1</span>
             </h1>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            CE Pricing Architect
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};