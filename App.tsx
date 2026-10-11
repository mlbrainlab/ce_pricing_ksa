// @ts-nocheck
import React, { useState } from "react";
import { Layout } from "./components/Layout";
import { QuotesManager } from "./components/QuotesManager";
import { AdminPanel } from "./components/AdminPanel";
import { ProfileModal } from "./components/ProfileModal";
import Login from "./components/Login";

import { PricingProvider, usePricing } from "./context/PricingContext";
import { Step1Institution } from "./components/wizard/Step1Institution";
import { Step2Products } from "./components/wizard/Step2Products";
import { Step3Structure } from "./components/wizard/Step3Structure";
import { Step1Extension } from "./components/wizard/Step1Extension";
import { Step1MidCycle } from "./components/wizard/Step1MidCycle";
import { Step4Output } from "./components/wizard/Step4Output";
import { Lock } from "lucide-react";
import { APP_VERSION } from "./constants";
import { InstitutionType } from "./types";

const MainApp = () => {
  const {
    institutionType,
    setInstitutionType,
    includeHospital,
    setIncludeHospital,
    isAuthChecked,
    dealType,
    channel,
    selectedProductIds,
    isDealContextComplete,
    isProductMixActive,
    isStructureActive,
    isCommercialScheduleActive,
    isExtensionQuote,
    isMidCycleQuote,
    isAuthenticated,
    handleLogin,
    handleLogout,
    userProfile,
    setUserProfile,
    isProfileModalOpen,
    setIsProfileModalOpen,
    isQuotesModalOpen,
    setIsQuotesModalOpen,
    isAdmin,
    isAdminModalOpen,
    setIsAdminModalOpen,
    notification,
    config,
    results,
    loadConfig,
    customerName,
    resetKey
  } = usePricing();

  // isExtensionQuote and isMidCycleQuote are imported from usePricing
  
  
  

  if (!isAuthChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout 
      onLogout={handleLogout} 
      userName={userProfile ? (userProfile.full_name || userProfile.name || `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim()) : ""} 
      onProfileClick={() => setIsProfileModalOpen(true)}
      isAdmin={isAdmin}
      onAdminClick={() => setIsAdminModalOpen(true)}
      onMyQuotesClick={() => setIsQuotesModalOpen(true)}
      
    >
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        userProfile={userProfile} 
        onSave={(newProfile) => {
          setUserProfile(newProfile);
          const fullName = [newProfile.first_name, newProfile.last_name].filter(Boolean).join(' ');
          if (fullName) localStorage.setItem('wk_rep_name', fullName);
          if (newProfile.quote_email) localStorage.setItem('wk_rep_email', newProfile.quote_email);
          if (newProfile.phone) localStorage.setItem('wk_rep_phone', newProfile.phone);
        }} 
      />

      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-lg animate-fade-in-down">
          <p className="font-bold">Notice</p>
          <p>{notification}</p>
        </div>
      )}

            {/* Institution Type Toggle - Floating Bar */}
      <div className="w-full flex flex-col items-center justify-center mb-6 mt-4 sticky top-[72px] z-40 space-y-4">
        <div className="flex flex-col items-center gap-2 bg-gradient-to-br from-white/40 to-white/10 dark:from-gray-800/40 dark:to-gray-900/10 backdrop-blur-lg backdrop-saturate-[200%] shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(255,255,255,0.6)] rounded-[2rem] border border-white/50 dark:border-gray-600/50 p-2">
          <div className="bg-black/5 dark:bg-black/20 border border-black/5 dark:border-white/5 p-1.5 rounded-[1.75rem] shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)] flex inline-flex relative overflow-hidden">
            <button
              type="button"
              onClick={() => setInstitutionType(InstitutionType.PROVIDER)}
              className={`px-6 py-2.5 text-sm font-bold rounded-3xl transition-all ${
                institutionType === InstitutionType.PROVIDER
                  ? "bg-gradient-to-b from-white/90 to-white/40 dark:from-gray-700/80 dark:to-gray-800/40 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,1)] border border-white/70 dark:border-gray-500/50 text-blue-800 dark:text-blue-100 scale-[1.02]"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-white/30 dark:hover:bg-white/10 border border-transparent hover:border-white/40 dark:hover:border-white/10"
              }`}
            >
              🏥 Providers-Payers
            </button>
            <button
              type="button"
              onClick={() => setInstitutionType(InstitutionType.ACADEMIC)}
              className={`px-6 py-2.5 text-sm font-bold rounded-3xl transition-all flex flex-col items-center justify-center leading-tight ${
                institutionType === InstitutionType.ACADEMIC
                  ? "bg-gradient-to-b from-white/90 to-white/40 dark:from-gray-700/80 dark:to-gray-800/40 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,1)] border border-white/70 dark:border-gray-500/50 text-blue-800 dark:text-blue-100 scale-[1.02]"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-white/30 dark:hover:bg-white/10 border border-transparent hover:border-white/40 dark:hover:border-white/10"
              }`}
            >
              <span>🎓 Academic Institutions</span>
              <span className="text-[10px] font-normal opacity-70">(including affiliated hospitals)</span>
            </button>
          </div>
          {institutionType === InstitutionType.ACADEMIC && (
            <label className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-1.5 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={includeHospital}
                onChange={(e) => setIncludeHospital(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-blue-300 rounded-md focus:ring-blue-500"
              />
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Include Affiliated Hospital</span>
            </label>
          )}
        </div>

        
      </div>

      <div className="w-full flex flex-col space-y-12 pb-32">
          <div className="w-full max-w-[100rem] mx-auto space-y-8 flex flex-col items-center px-4">
            <div className="w-full grid grid-cols-1 xl:grid-cols-3 gap-5 items-stretch">
              <div className="w-full xl:col-span-1">
                <Step1Institution />
              </div>

              {(!isExtensionQuote && !isMidCycleQuote) && (
                <>
                  <div className="w-full xl:col-span-1">
                    <div className={`h-full relative transition-all duration-700 ease-out ${
                      !isProductMixActive
                        ? "opacity-35 pointer-events-none select-none grayscale-[35%] scale-[0.99] filter blur-[0.2px]"
                        : "opacity-100 pointer-events-auto filter-none scale-100 animate-in fade-in zoom-in-[0.99] duration-500"
                    }`}>
                      {!isProductMixActive && (
                        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[2rem] bg-gray-900/5 dark:bg-black/10 backdrop-blur-[1px]">
                          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-lg border border-white/60 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200">
                            <Lock className="w-3.5 h-3.5 text-blue-500" />
                            <span>
                              {!dealType ? "Select Deal Type & Sales Channel to unlock" : "Select Sales Channel to unlock"}
                            </span>
                          </div>
                        </div>
                      )}
                      <Step2Products />
                    </div>
                  </div>

                  <div className="w-full xl:col-span-1">
                    <div className={`h-full relative transition-all duration-700 ease-out ${
                      !isStructureActive
                        ? "opacity-35 pointer-events-none select-none grayscale-[35%] scale-[0.99] filter blur-[0.2px]"
                        : "opacity-100 pointer-events-auto filter-none scale-100 animate-in fade-in zoom-in-[0.99] duration-500"
                    }`}>
                      {!isStructureActive && (
                        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[2rem] bg-gray-900/5 dark:bg-black/10 backdrop-blur-[1px]">
                          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-lg border border-white/60 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200">
                            <Lock className="w-3.5 h-3.5 text-blue-500" />
                            <span>
                              {!isProductMixActive ? "Complete preceding steps to unlock" : "Check a product in Product Mix to unlock"}
                            </span>
                          </div>
                        </div>
                      )}
                      <Step3Structure />
                    </div>
                  </div>
                </>
              )}

              {isExtensionQuote && (
                <div className="w-full xl:col-span-2">
                  <div className={`h-full relative transition-all duration-700 ease-out ${
                    !isDealContextComplete
                      ? "opacity-35 pointer-events-none select-none grayscale-[35%] scale-[0.99] filter blur-[0.2px]"
                      : "opacity-100 pointer-events-auto filter-none scale-100 animate-in fade-in zoom-in-[0.99] duration-500"
                  }`}>
                    {!isDealContextComplete && (
                      <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[2rem] bg-gray-900/5 dark:bg-black/10 backdrop-blur-[1px]">
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-lg border border-white/60 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200">
                          <Lock className="w-3.5 h-3.5 text-blue-500" />
                          <span>Select a Sales Channel in Deal Context to unlock</span>
                        </div>
                      </div>
                    )}
                    <Step1Extension />
                  </div>
                </div>
              )}

              {isMidCycleQuote && (
                <div className="w-full xl:col-span-2">
                  <div className={`h-full relative transition-all duration-700 ease-out ${
                    !isDealContextComplete
                      ? "opacity-35 pointer-events-none select-none grayscale-[35%] scale-[0.99] filter blur-[0.2px]"
                      : "opacity-100 pointer-events-auto filter-none scale-100 animate-in fade-in zoom-in-[0.99] duration-500"
                  }`}>
                    {!isDealContextComplete && (
                      <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[2rem] bg-gray-900/5 dark:bg-black/10 backdrop-blur-[1px]">
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-lg border border-white/60 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200">
                          <Lock className="w-3.5 h-3.5 text-blue-500" />
                          <span>Select a Sales Channel in Deal Context to unlock</span>
                        </div>
                      </div>
                    )}
                    <Step1MidCycle />
                  </div>
                </div>
              )}
            </div>
            
          </div>
          <div className="w-full max-w-[100rem] mx-auto px-4">
            <div className={`transition-all duration-700 ease-out ${
              !isCommercialScheduleActive
                ? "opacity-40 pointer-events-none select-none grayscale-[30%] scale-[0.995]"
                : "opacity-100 pointer-events-auto filter-none scale-100 animate-in fade-in zoom-in-[0.995] duration-500"
            }`}>
              <Step4Output />
            </div>
          </div>
        </div>

      {isQuotesModalOpen && (
        <QuotesManager
          currentConfig={config}
          currentResults={results}
          onLoadQuote={loadConfig}
          customerName={customerName}
          onClose={() => setIsQuotesModalOpen(false)}
        />
      )}

      {isAdminModalOpen && (
        <AdminPanel onClose={() => setIsAdminModalOpen(false)} onLoadQuote={loadConfig} />
      )}
    </Layout>
  );
};

export const App = () => (
  <PricingProvider>
    <MainApp />
  </PricingProvider>
);

export default App;
