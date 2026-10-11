// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { usePricing } from '../../context/PricingContext';
import { FormattedNumberInput } from '../FormattedNumberInput';
import { UpliftFpiInput } from '../UpliftFpiInput';

export const Step1Extension = () => {
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const {
    metadata,
    extensionOption,
    setExtensionOption,
    expiringTerm,
    setExpiringTerm,
    expiringTCV,
    setExpiringTCV,
    currentSpend,
    setCurrentSpend,
    extensionPercentage,
    setExtensionPercentage,
    extensionFPI,
    setExtensionFPI,
    extensionVariant,
    setExtensionVariant,
    useFullExtension,
    setUseFullExtension,
    roundUpOptionB,
    setRoundUpOptionB,
    optionBMonths,
    setOptionBMonths,
    optionCValue,
    setOptionCValue,
    optionCMonths,
    setOptionCMonths,
    isExtensionQuote,
    isIndirect,
    extensionResults,
    defaultOptionBFPI,
    extensionRequiresFinanceApproval
  } = usePricing();

  if (!isExtensionQuote) return null;

  return (
    <div className="w-full max-w-full h-full flex flex-col">
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] border border-white/40 dark:border-gray-700/50 transition-all h-full">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-4">
          Extension Configuration
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-500 mb-3 tracking-wide dark:text-gray-400">
              Option
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { value: "A", label: "Option A", desc: "% of TCV", icon: "📊" },
                { value: "B", label: "Option B", desc: "Specific Months under 100k SAR", icon: "🗓️" },
                { value: "C", label: "Option C", desc: "Custom Scope / Target Value", icon: "🎯" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setExtensionOption(opt.value)}
                  className={`flex items-center p-4 border rounded-2xl transition-all duration-200 ${
                    extensionOption === opt.value
                      ? "border-blue-500 bg-blue-50/80 dark:bg-blue-900/30 text-blue-800 dark:text-blue-100 shadow-md ring-1 ring-blue-500 scale-[1.02]"
                      : "border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:scale-[1.01]"
                  }`}
                >
                  <span className="text-2xl mr-4">{opt.icon}</span>
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-sm">{opt.label}</span>
                    <span className={`text-xs mt-0.5 ${extensionOption === opt.value ? 'text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>{opt.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-500 mb-3 tracking-wide dark:text-gray-400">
              Variant
            </label>
            <div className="relative" ref={dropdownRef}>
              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-4 py-3.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-[1.5rem] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] flex justify-between items-center cursor-pointer transition-all hover:bg-white/60 dark:hover:bg-gray-700/60"
              >
                <span className={!extensionVariant ? 'text-gray-500' : 'text-gray-900 dark:text-white font-medium'}>
                  {extensionVariant || 'Select Variant'}
                </span>
                <svg className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
              <div 
                className={`absolute z-50 w-full mt-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl border border-white/60 dark:border-gray-700/60 rounded-[1.5rem] shadow-[0_8px_32px_rgba(31,38,135,0.15)] overflow-hidden transition-all duration-300 origin-top ${isDropdownOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'}`}
              >
                <div className="max-h-60 overflow-y-auto py-2">
                  {[
                    ...Object.keys(metadata?.utdVariants || {}),
                    ...Object.keys(metadata?.lxdVariants || {})
                  ].map((v) => (
                    <div
                      key={v}
                      onClick={() => {
                        setExtensionVariant(v);
                        setIsDropdownOpen(false);
                      }}
                      className={`px-4 py-3 cursor-pointer transition-colors ${extensionVariant === v ? 'bg-blue-50/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/60'}`}
                    >
                      {v}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-500 mb-3 tracking-wide dark:text-gray-400">
              Expiring Term
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "multi", label: "Multi-Year", icon: "📚" },
                { value: "single", label: "Single Year", icon: "📘" },
              ].map((term) => (
                <button
                  key={term.value}
                  type="button"
                  onClick={() => setExpiringTerm(term.value)}
                  className={`flex items-center justify-center p-3 border rounded-2xl transition-all duration-200 ${
                    expiringTerm === term.value
                      ? "border-blue-500 bg-blue-50/80 dark:bg-blue-900/30 text-blue-800 dark:text-blue-100 shadow-md ring-1 ring-blue-500 scale-[1.02]"
                      : "border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:scale-[1.01]"
                  }`}
                >
                  <span className="mr-2">{term.icon}</span>
                  <span className="font-semibold text-sm">{term.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {expiringTerm === "multi" && (
            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1 tracking-wide dark:text-gray-400">
                Expiring TCV (USD)
              </label>
              <FormattedNumberInput
                value={expiringTCV}
                onChange={setExpiringTCV}
                className="mt-1 block w-full text-base border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 border p-3.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md text-gray-900 dark:text-white transition-all duration-300"
              />
            </div>
          )}

          <div className={expiringTerm !== "multi" ? "md:col-span-2" : ""}>
            <label className="block text-sm font-semibold text-gray-500 mb-1 tracking-wide dark:text-gray-400">
              Current Spend / Year (USD)
            </label>
            <FormattedNumberInput
              value={currentSpend}
              onChange={setCurrentSpend}
              className="mt-1 block w-full text-base border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 border p-3.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md text-gray-900 dark:text-white transition-all duration-300"
            />
          </div>
        </div>

          {extensionOption === "A" && (
            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1 tracking-wide dark:text-gray-400">
                Extension % of TCV
              </label>
              <FormattedNumberInput
                value={extensionPercentage}
                onChange={setExtensionPercentage}
                className="mt-1 block w-full text-base border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 border p-3.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md text-gray-900 dark:text-white transition-all duration-300"
              />
            </div>
          )}

          {extensionOption === "B" && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1 tracking-wide dark:text-gray-400">
                  Expected FPI %
                </label>
                <UpliftFpiInput
                  value={extensionFPI !== null ? extensionFPI : defaultOptionBFPI}
                  onChange={setExtensionFPI}
                  className="mt-1 block w-full text-base border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 border p-3.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md text-gray-900 dark:text-white transition-all duration-300"
                />
              </div>

              <div className="bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Target Months (under 100K SAR)
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded overflow-hidden h-8 bg-white dark:bg-gray-700">
                      <button
                        type="button"
                        onClick={() => {
                          const current = optionBMonths !== null ? optionBMonths : (extensionResults?.monthsCovered || 1);
                          setOptionBMonths(Math.max(1, current - 1));
                        }}
                        className="w-9 h-full flex-shrink-0 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 font-bold text-lg cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={optionBMonths !== null ? optionBMonths : (extensionResults?.monthsCovered || '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setOptionBMonths(null);
                          } else {
                            const parsed = parseInt(val, 10);
                            if (!isNaN(parsed) && parsed >= 1) {
                              setOptionBMonths(parsed);
                            }
                          }
                        }}
                        placeholder={String(extensionResults?.monthsCovered || 'Auto')}
                        className="w-full h-full text-center text-sm p-0 bg-transparent text-gray-900 dark:text-white outline-none font-sans tabular-nums ph-no-capture"
                        style={{ appearance: "textfield", MozAppearance: "textfield" }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const current = optionBMonths !== null ? optionBMonths : (extensionResults?.monthsCovered || 1);
                          setOptionBMonths(current + 1);
                        }}
                        className="w-9 h-full flex-shrink-0 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 font-bold text-lg cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOptionBMonths(null)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-800 font-medium select-none"
                    >
                      Auto
                    </button>
                  </div>
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                  Max threshold: {extensionResults?.monthsAvailable ? extensionResults.monthsAvailable.toFixed(2) : 'N/A'} months
                  {optionBMonths !== null && optionBMonths > (extensionResults?.monthsAvailable || 0) && (
                    <span className="text-red-500 font-bold ml-1">(&gt; 100K SAR threshold)</span>
                  )}
                </div>
              </div>

              <div className={`flex items-center pt-2 border-t border-gray-100 dark:border-gray-700 ${!isIndirect ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  id="round-up-option-b-checkbox"
                  type="checkbox"
                  disabled={!isIndirect}
                  checked={isIndirect ? roundUpOptionB : false}
                  onChange={(e) => setRoundUpOptionB(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white dark:bg-gray-700 dark:border-gray-600 cursor-pointer disabled:cursor-not-allowed"
                />
                <label
                  htmlFor="round-up-option-b-checkbox"
                  className={`ml-2 text-xs font-semibold select-none ${!isIndirect ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300 cursor-pointer'}`}
                >
                  Round up value (Option B) {!isIndirect && "(Disabled for Direct)"}
                </label>
              </div>
            </div>
          )}

          {extensionOption === "C" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1 tracking-wide dark:text-gray-400">
                  Target Extension Total Value (USD)
                </label>
                <FormattedNumberInput
                  value={optionCValue}
                  onChange={setOptionCValue}
                  className="mt-1 block w-full text-base border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 border p-3.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md text-gray-900 dark:text-white transition-all duration-300"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1 tracking-wide dark:text-gray-400">
                  Extension Duration (Months)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={optionCMonths}
                  onChange={(e) => setOptionCMonths(parseFloat(e.target.value) || 0)}
                  className="mt-1 block w-full text-base border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 border p-3.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md text-gray-900 dark:text-white transition-all duration-300"
                  placeholder="e.g. 5.5"
                />
              </div>
            </div>
          )}

          {extensionOption === "A" && (
            <div className="flex items-center mt-2">
              <input
                id="use-full-extension-checkbox"
                type="checkbox"
                checked={useFullExtension}
                onChange={(e) => setUseFullExtension(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white dark:bg-gray-700 dark:border-gray-600"
              />
              <label
                htmlFor="use-full-extension-checkbox"
                className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Use full extension
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
