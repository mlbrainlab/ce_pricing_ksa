// @ts-nocheck
import React from 'react';
import { usePricing } from '../../context/PricingContext';
import { FormattedNumberInput } from '../FormattedNumberInput';
import { UpliftFpiInput } from '../UpliftFpiInput';
import {
  DealType,
  ChannelType,
  PricingMethod,
  InstitutionType,
} from '../../types';
import { FileText, Download, Table, FileSpreadsheet, Calculator, ArrowRight, Save, RotateCcw } from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import { ExportSection } from '../ExportSection';

export const Step1Institution = () => {
  const {
    metadata,
    dealType,
    channel,
    setChannel,
    institutionType,
    setInstitutionType,
    includeHospital,
    setIncludeHospital,
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
    setMidCycleDlm,
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
    handleDealTypeChange,
    isExtensionQuote,
    isMidCycleQuote,
    resetForm,
    isIndirect,
    extensionResults,
    defaultOptionBFPI,
    extensionRequiresFinanceApproval
  } = usePricing();
  const { currentStep, setCurrentStep } = usePricing();



  return (
    <div className="w-full max-w-full h-full flex flex-col">
                      {/* Section 1: Deal Basics */}
                <div className="h-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] border border-white/40 dark:border-gray-700/50 transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                      1. Deal Context
                    </h2>
                    <button
                      onClick={resetForm}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 hover:shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer select-none"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Form</span>
                    </button>
                  </div>
      
                  
      
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-500 mb-3 tracking-wide dark:text-gray-400">
                        Deal Type
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { value: DealType.NEW_LOGO, label: "New Logo", icon: "🌱" },
                          { value: DealType.RENEWAL, label: "Renewal", icon: "🔄" },
                          { value: DealType.EXTENSION, label: "Extension", icon: "📈" },
                          { value: DealType.MID_CYCLE, label: "Mid-Cycle Add-on", icon: "➕" },
                        ].map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => handleDealTypeChange(type.value as DealType)}
                            className={`flex items-center p-4 border rounded-2xl transition-all duration-200 ${
                              dealType === type.value
                                ? "border-blue-500 bg-blue-50/80 dark:bg-blue-900/30 text-blue-800 dark:text-blue-100 shadow-md ring-1 ring-blue-500 scale-[1.02]"
                                : "border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:scale-[1.01]"
                            }`}
                          >
                            <span className="text-xl mr-3">{type.icon}</span>
                            <span className="font-semibold text-sm">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-semibold text-gray-500 tracking-wide dark:text-gray-400">
                          Sales Channel
                        </label>
                        {!dealType && (
                          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                            Select deal type first
                          </span>
                        )}
                      </div>
                      <div className={`grid grid-cols-1 gap-3 transition-all duration-500 ${!dealType ? "opacity-40 pointer-events-none select-none" : "opacity-100"}`}>
                        {[
                          { value: ChannelType.DIRECT, label: "Direct (USD)", icon: "💵", desc: "Billed directly to the customer" },
                          { value: ChannelType.FULFILMENT, label: "Fulfilment (SAR)", icon: "📦", desc: "Fulfilled via local distributor" },
                          { value: ChannelType.PARTNER_SOURCED, label: "Partner Sourced (SAR)", icon: "🤝", desc: "Sourced and managed by partner" },
                        ].map((ch) => (
                          <button
                            key={ch.value}
                            type="button"
                            disabled={!dealType || (isExtensionQuote && ch.value === ChannelType.DIRECT)}
                            onClick={() => setChannel(ch.value as ChannelType)}
                            className={`flex items-center p-4 border rounded-2xl transition-all duration-200 ${
                              isExtensionQuote && ch.value === ChannelType.DIRECT
                                ? "opacity-40 cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-900"
                                : channel === ch.value
                                  ? "border-green-500 bg-green-50/80 dark:bg-green-900/30 text-green-800 dark:text-green-100 shadow-md ring-1 ring-green-500 scale-[1.02]"
                                  : "border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:scale-[1.01]"
                            }`}
                          >
                            <span className="text-2xl mr-4">{ch.icon}</span>
                            <div className="flex flex-col items-start">
                              <span className="font-bold text-sm">{ch.label}</span>
                              <span className={`text-xs mt-0.5 ${channel === ch.value ? 'text-green-600 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>{ch.desc}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {isExtensionQuote && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-xl text-xs text-yellow-800 dark:text-yellow-200">
                        <strong>Note:</strong> RL and Finance approvals are required
                        for Extension Quotes.
                      </div>
                    </div>
                  )}
                </div>
      
                </div>
  );
};
