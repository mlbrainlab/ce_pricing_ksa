// @ts-nocheck
import React from 'react';
import { usePricing } from '../../context/PricingContext';

export const Step1MidCycle = () => {
  const {
    isMidCycleQuote,
    midCycleExpiryDate,
    setMidCycleExpiryDate,
    midCycleStartDate,
    setMidCycleStartDate,
    midCycleProduct,
    setMidCycleProduct,
    midCycleExistingSpend,
    setMidCycleExistingSpend,
    midCycleBedCount,
    setMidCycleBedCount,
    midCycleWHT,
    setMidCycleWHT,
    midCycleDlm,
    setMidCycleDlm
  } = usePricing();

  if (!isMidCycleQuote) return null;

  return (
    <div className="w-full max-w-full h-full flex flex-col">
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] border border-white/40 dark:border-gray-700/50 transition-all h-full">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-4">
          Mid-Cycle Configuration
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1 tracking-wide dark:text-gray-400">
                Expiry Date
              </label>
              <input
                type="date"
                value={midCycleExpiryDate}
                onChange={(e) => setMidCycleExpiryDate(e.target.value)}
                className="mt-1 block w-full text-base border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 border p-3.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md text-gray-900 dark:text-white transition-all duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1 tracking-wide dark:text-gray-400">
                Start Date
              </label>
              <input
                type="date"
                value={midCycleStartDate}
                onChange={(e) => setMidCycleStartDate(e.target.value)}
                className="mt-1 block w-full text-base border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 border p-3.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md text-gray-900 dark:text-white transition-all duration-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-500 mb-3 tracking-wide dark:text-gray-400">
              Add-on Product
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { value: "UTD_ADV", label: "UTD: ADV over UTDANYWHERE", desc: "8% of expiry", icon: "🚀" },
                { value: "LXD_FLINK", label: "LXD: FLINK", desc: "$12/bed", icon: "🔗" },
                { value: "LXD_IPE", label: "LXD: IPE", desc: "$16/bed", icon: "💊" },
                { value: "LXD_FLINK_IPE", label: "LXD: FLINK+IPE", desc: "$28/bed", icon: "✨" },
              ].map((prod) => (
                <button
                  key={prod.value}
                  type="button"
                  onClick={() => setMidCycleProduct(prod.value)}
                  className={`flex items-center p-4 border rounded-2xl transition-all duration-200 ${
                    midCycleProduct === prod.value
                      ? "border-blue-500 bg-blue-50/80 dark:bg-blue-900/30 text-blue-800 dark:text-blue-100 shadow-md ring-1 ring-blue-500 scale-[1.02]"
                      : "border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:scale-[1.01]"
                  }`}
                >
                  <span className="text-2xl mr-4">{prod.icon}</span>
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-sm">{prod.label}</span>
                    <span className={`text-xs mt-0.5 ${midCycleProduct === prod.value ? 'text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>{prod.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {midCycleProduct === "UTD_ADV" && (
            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1 tracking-wide dark:text-gray-400">
                Existing Expiring Spend (USD)
              </label>
              <input
                type="number"
                value={midCycleExistingSpend}
                onChange={(e) => setMidCycleExistingSpend(e.target.value === "" ? "" : Number(e.target.value))}
                className="mt-1 block w-full text-base border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 border p-3.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md text-gray-900 dark:text-white transition-all duration-300"
              />
            </div>
          )}

          {midCycleProduct.startsWith("LXD_") && (
            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1 tracking-wide dark:text-gray-400">
                Existing Bed Count
              </label>
              <input
                type="number"
                value={midCycleBedCount}
                onChange={(e) => setMidCycleBedCount(e.target.value === "" ? "" : Number(e.target.value))}
                className="mt-1 block w-full text-base border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 border p-3.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md text-gray-900 dark:text-white transition-all duration-300"
              />
            </div>
          )}

          {(midCycleProduct === "LXD_IPE" || midCycleProduct === "LXD_FLINK_IPE") && (
            <div>
              <label className={`flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 w-full p-2 rounded border shadow-sm transition ${!midCycleBedCount ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'cursor-pointer bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'}`}>
                <input
                  type="checkbox"
                  checked={midCycleDlm}
                  onChange={(e) => setMidCycleDlm(e.target.checked)}
                  disabled={!midCycleBedCount}
                  className="rounded-md text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 w-5 h-5 disabled:cursor-not-allowed cursor-pointer"
                />
                <span className="font-medium">Include DLM Service (+$15,000 WHT-applicable)</span>
              </label>
            </div>
          )}

          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              id="mid-cycle-wht-checkbox"
              checked={midCycleWHT}
              onChange={(e) => setMidCycleWHT(e.target.checked)}
              className="w-5 h-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
            />
            <label
              htmlFor="mid-cycle-wht-checkbox"
              className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Apply WHT
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
