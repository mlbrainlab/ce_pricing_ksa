import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             {/* Logo Placeholder */}
             <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold">
               CE
             </div>
             <h1 className="text-xl font-semibold tracking-tight text-gray-900">
               Pricing KSA <span className="text-gray-400 font-normal">v6.0</span>
             </h1>
          </div>
          <div className="text-sm text-gray-500">
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