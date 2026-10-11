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
import { FileText, Download, Table, FileSpreadsheet, Calculator, ArrowRight, Save, Lock } from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import { ExportSection } from '../ExportSection';

export const Step4Output = () => {
  const {
    customerName,
    setCustomerName,
    metadata,
    dealType,
    channel,
    selectedProductIds,
    isDealContextComplete,
    years,
    applyWHT,
    resetKey,
    isArchitectNotesOpen,
    setIsArchitectNotesOpen,
    setExtensionPercentage,
    useFullExtension,
    roundUpOptionB,
    optionBMonths,
    useStartDate,
    setUseStartDate,
    startMonthYear,
    setStartMonthYear,
    results,
    sarRate,
    isExtensionQuote,
    isMidCycleQuote,
    isIndirect,
    config,
    extensionResults,
    utdEeWarning,
    monthlyCosts,
    renewalNotes
  } = usePricing();



  return (
    <div className="w-full max-w-full py-8">
                    <div className="xl:col-span-2 space-y-6 xl:sticky xl:top-24 h-fit">
                {isExtensionQuote && !isDealContextComplete && (
                  <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-12 flex flex-col items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100/80 dark:bg-gray-800/80 flex items-center justify-center mb-3 text-gray-400">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-gray-700 dark:text-gray-200 mb-1">
                      Extension Results
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                      Complete Deal Context to activate and calculate extension results.
                    </p>
                  </div>
                )}

                {isExtensionQuote && isDealContextComplete && !extensionResults && (
                  <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-12 flex flex-col items-center justify-center border border-white/50 dark:border-gray-700/50">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Calculating extension...
                    </p>
                  </div>
                )}
      
                {isExtensionQuote && extensionResults && (
                  <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] overflow-hidden border border-white/50 dark:border-gray-700/50 transition-colors">
                    <div className="px-6 py-5 border-b border-white/40 dark:border-gray-700/50 bg-white/30 dark:bg-gray-800/30 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                        Extension Quote Results
                      </h3>
                      <div className="text-xs font-sans tabular-nums text-gray-500 dark:text-gray-400">
                        1 USD = {sarRate} SAR
                      </div>
                    </div>
      
                    <div className="p-6 space-y-6">
                      {extensionResults.type === "A" && (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl border border-gray-100 dark:border-gray-600">
                              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">
                                Extension Value
                              </div>
                              <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">
                                {formatCurrency(
                                  extensionResults.customerExtension,
                                  "USD",
                                )}
                              </div>
                            </div>
                            {extensionResults.useFullExtension ? (
                              <>
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 col-span-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="text-xs text-blue-600 dark:text-blue-400 uppercase font-sans">
                                      Extension Duration
                                    </div>
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => {
                                          const targetMonths = Math.max(
                                            1,
                                            extensionResults.integerMonths -
                                              (extensionResults.extraDays === 0
                                                ? 1
                                                : 0),
                                          );
                                          const newPercentage =
                                            extensionResults.customerTCV > 0
                                              ? ((targetMonths *
                                                  extensionResults.monthlyCost) /
                                                  extensionResults.customerTCV) *
                                                100
                                              : 0;
                                          setExtensionPercentage(newPercentage);
                                        }}
                                        className="p-1 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 rounded text-blue-700 dark:text-blue-200 transition-colors"
                                        title="Previous Month"
                                      >
                                        <svg
                                          className="w-4 h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M15 19l-7-7 7-7"
                                          ></path>
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => {
                                          const targetMonths =
                                            extensionResults.integerMonths + 1;
                                          const newPercentage =
                                            extensionResults.customerTCV > 0
                                              ? ((targetMonths *
                                                  extensionResults.monthlyCost) /
                                                  extensionResults.customerTCV) *
                                                100
                                              : 0;
                                          setExtensionPercentage(newPercentage);
                                        }}
                                        className="p-1 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 rounded text-blue-700 dark:text-blue-200 transition-colors"
                                        title="Next Month"
                                      >
                                        <svg
                                          className="w-4 h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M9 5l7 7-7 7"
                                          ></path>
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                  <div className="text-xl font-bold text-blue-700 dark:text-blue-300 font-sans">
                                    {extensionResults.days} days - equivalent to{" "}
                                    {extensionResults.integerMonths} months and{" "}
                                    {extensionResults.extraDays} days
                                  </div>
                                  <div className="text-sm text-blue-600 dark:text-blue-400 mt-2 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span>
                                        {extensionResults.integerMonths} months ={" "}
                                        {extensionResults.percentageLess?.toFixed(2)}%
                                        of TCV
                                      </span>
                                      <button
                                        onClick={() =>
                                          setExtensionPercentage(
                                            extensionResults.percentageLess || 0,
                                          )
                                        }
                                        className="text-xs bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-200 px-2 py-1 rounded transition-colors"
                                      >
                                        Use{" "}
                                        {extensionResults.percentageLess?.toFixed(2)}%
                                      </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span>
                                        {extensionResults.integerMonths + 1} months ={" "}
                                        {extensionResults.percentageMore?.toFixed(2)}%
                                        of TCV
                                      </span>
                                      <button
                                        onClick={() =>
                                          setExtensionPercentage(
                                            extensionResults.percentageMore || 0,
                                          )
                                        }
                                        className="text-xs bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-200 px-2 py-1 rounded transition-colors"
                                      >
                                        Use{" "}
                                        {extensionResults.percentageMore?.toFixed(2)}%
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl border border-gray-100 dark:border-gray-600">
                                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">
                                    Available Months
                                  </div>
                                  <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">
                                    {extensionResults.monthsAvailable.toFixed(2)}
                                  </div>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                                  <div className="text-xs text-blue-600 dark:text-blue-400 uppercase font-sans">
                                    Extension Months
                                  </div>
                                  <div className="text-xl font-bold text-blue-700 dark:text-blue-300 font-sans">
                                    {extensionResults.integerMonths}
                                  </div>
                                </div>
                                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl border border-purple-100 dark:border-purple-800">
                                  <div className="text-xs text-purple-600 dark:text-purple-400 uppercase font-sans">
                                    FPI %
                                  </div>
                                  <div className="text-xl font-bold text-purple-700 dark:text-purple-300 font-sans">
                                    {extensionResults.fpiPercentage?.toFixed(2) ||
                                      "0.00"}
                                    %
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
      
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3 font-sans">
                              Pricing Breakdown
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-5 shadow-xl shadow-blue-900/5 rounded-[2rem] border border-white/20 dark:border-gray-700/50 border-l-4 border-blue-500 dark:border-blue-400">
                                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">
                                  End-User Price
                                </div>
                                <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">
                                  {formatCurrency(
                                    extensionResults.endUserPrice,
                                    "USD",
                                  )}
                                </div>
                                {isIndirect && (
                                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    <div>
                                      SAR:{" "}
                                      {formatCurrency(
                                        extensionResults.endUserPrice * sarRate,
                                        "SAR",
                                      )}
                                    </div>
                                    <div>
                                      VAT (15%):{" "}
                                      {formatCurrency(
                                        extensionResults.endUserPrice *
                                          sarRate *
                                          0.15,
                                        "SAR",
                                      )}
                                    </div>
                                    <div className="font-bold text-gray-700 dark:text-gray-300">
                                      Total:{" "}
                                      {formatCurrency(
                                        extensionResults.endUserPrice *
                                          sarRate *
                                          1.15,
                                        "SAR",
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-5 shadow-xl shadow-blue-900/5 rounded-[2rem] border border-white/20 dark:border-gray-700/50 border-l-4 border-orange-500 dark:border-orange-400">
                                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">
                                  Reseller Fees
                                </div>
                                <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">
                                  {formatCurrency(extensionResults.commission, "USD")}
                                </div>
                                {isIndirect && (
                                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    <div>
                                      SAR:{" "}
                                      {formatCurrency(
                                        extensionResults.commission * sarRate,
                                        "SAR",
                                      )}
                                    </div>
                                    <div>
                                      VAT (15%):{" "}
                                      {formatCurrency(
                                        extensionResults.commission * sarRate * 0.15,
                                        "SAR",
                                      )}
                                    </div>
                                    <div className="font-bold text-gray-700 dark:text-gray-300">
                                      Total:{" "}
                                      {formatCurrency(
                                        extensionResults.commission * sarRate * 1.15,
                                        "SAR",
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="bg-gray-100 dark:bg-gray-700 p-4 shadow rounded-2xl border-l-4 border-gray-500 dark:border-gray-400">
                                <div className="text-xs text-gray-500 dark:text-gray-300 uppercase font-sans">
                                  Net Price
                                </div>
                                <div className="text-lg font-bold text-gray-700 dark:text-gray-100 font-sans">
                                  {formatCurrency(extensionResults.netPrice, "USD")}
                                </div>
                                {isIndirect && (
                                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    <div>
                                      SAR:{" "}
                                      {formatCurrency(
                                        extensionResults.netPrice * sarRate,
                                        "SAR",
                                      )}
                                    </div>
                                    <div>
                                      VAT (15%):{" "}
                                      {formatCurrency(
                                        extensionResults.netPrice * sarRate * 0.15,
                                        "SAR",
                                      )}
                                    </div>
                                    <div className="font-bold text-gray-700 dark:text-gray-300">
                                      Total:{" "}
                                      {formatCurrency(
                                        extensionResults.netPrice * sarRate * 1.15,
                                        "SAR",
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      {extensionResults.type === "C" && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl border border-gray-100 dark:border-gray-600 animate-fade-in">
                              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">
                                Target Value (USD)
                              </div>
                              <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">
                                {formatCurrency(
                                  extensionResults.targetValue,
                                  "USD",
                                )}
                              </div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 animate-fade-in">
                              <div className="text-xs text-blue-600 dark:text-blue-400 uppercase font-sans">
                                Extension Duration
                              </div>
                              <div className="text-xl font-bold text-blue-700 dark:text-blue-300 font-sans">
                                {extensionResults.monthsCovered} months
                              </div>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl border border-green-100 dark:border-green-800 animate-fade-in">
                              <div className="text-xs text-green-600 dark:text-green-400 uppercase font-sans">
                                Monthly Cost (USD)
                              </div>
                              <div className="text-xl font-bold text-green-700 dark:text-green-300 font-sans">
                                {formatCurrency(extensionResults.monthlyCost, "USD")}
                              </div>
                            </div>
                          </div>
      
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                            <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3 font-sans">
                              Pricing Breakdown (for {extensionResults.monthsCovered}{" "}
                              months)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-5 shadow-xl shadow-blue-900/5 rounded-[2rem] border border-white/20 dark:border-gray-700/50 border-l-4 border-blue-500 dark:border-blue-400">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">
                                    End-User Price
                                  </div>
                                  {extensionResults.roundUpOptionB && (
                                    <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded font-semibold">
                                      Rounded Up (Nearest 1,000)
                                    </span>
                                  )}
                                </div>
                                <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">
                                  {formatCurrency(
                                    extensionResults.endUserPrice,
                                    "USD",
                                  )}
                                </div>
                                {isIndirect && (
                                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    <div>
                                      SAR:{" "}
                                      {formatCurrency(
                                        extensionResults.roundUpOptionB
                                          ? Math.ceil((extensionResults.endUserPrice * sarRate) / 1000) * 1000
                                          : extensionResults.endUserPrice * sarRate,
                                        "SAR",
                                      )}
                                    </div>
                                    <div>
                                      VAT (15%):{" "}
                                      {formatCurrency(
                                        (extensionResults.roundUpOptionB
                                          ? Math.ceil((extensionResults.endUserPrice * sarRate) / 1000) * 1000
                                          : extensionResults.endUserPrice * sarRate) * 0.15,
                                        "SAR",
                                      )}
                                    </div>
                                    <div className="font-bold text-gray-700 dark:text-gray-300">
                                      Total:{" "}
                                      {formatCurrency(
                                        (extensionResults.roundUpOptionB
                                          ? Math.ceil((extensionResults.endUserPrice * sarRate) / 1000) * 1000
                                          : extensionResults.endUserPrice * sarRate) * 1.15,
                                        "SAR",
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-5 shadow-xl shadow-blue-900/5 rounded-[2rem] border border-white/20 dark:border-gray-700/50 border-l-4 border-orange-500 dark:border-orange-400">
                                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">
                                  Reseller Fees
                                </div>
                                <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">
                                  {formatCurrency(extensionResults.commission, "USD")}
                                </div>
                                {isIndirect && (
                                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    <div>
                                      SAR:{" "}
                                      {formatCurrency(
                                        extensionResults.commission * sarRate,
                                        "SAR",
                                      )}
                                    </div>
                                    <div>
                                      VAT (15%):{" "}
                                      {formatCurrency(
                                        extensionResults.commission * sarRate * 0.15,
                                        "SAR",
                                      )}
                                    </div>
                                    <div className="font-bold text-gray-700 dark:text-gray-300">
                                      Total:{" "}
                                      {formatCurrency(
                                        extensionResults.commission * sarRate * 1.15,
                                        "SAR",
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="bg-gray-100 dark:bg-gray-700 p-4 shadow rounded-2xl border-l-4 border-gray-500 dark:border-gray-400">
                                <div className="text-xs text-gray-500 dark:text-gray-300 uppercase font-sans">
                                  Net Price
                                </div>
                                <div className="text-lg font-bold text-gray-700 dark:text-gray-100 font-sans">
                                  {formatCurrency(extensionResults.netPrice, "USD")}
                                </div>
                                {isIndirect && (
                                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    <div>
                                      SAR:{" "}
                                      {formatCurrency(
                                        extensionResults.netPrice * sarRate,
                                        "SAR",
                                      )}
                                    </div>
                                    <div>
                                      VAT (15%):{" "}
                                      {formatCurrency(
                                        extensionResults.netPrice * sarRate * 0.15,
                                        "SAR",
                                      )}
                                    </div>
                                    <div className="font-bold text-gray-700 dark:text-gray-300">
                                      Total:{" "}
                                      {formatCurrency(
                                        extensionResults.netPrice * sarRate * 1.15,
                                        "SAR",
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
      
                      {extensionResults.type === "B" && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl border border-gray-100 dark:border-gray-600 animate-fade-in">
                              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">
                                Monthly Cost (SAR)
                              </div>
                              <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">
                                {formatCurrency(
                                  extensionResults.monthlyCostSAR,
                                  "SAR",
                                )}
                              </div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 animate-fade-in">
                              <div className="text-xs text-blue-600 dark:text-blue-400 uppercase font-sans flex items-center justify-between">
                                <span>Extension Duration</span>
                                {optionBMonths !== null && (
                                  <span className="text-[10px] bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100 px-1.5 py-0.5 rounded font-bold">
                                    Custom
                                  </span>
                                )}
                              </div>
                              <div className="text-xl font-bold text-blue-700 dark:text-blue-300 font-sans">
                                {extensionResults.monthsCovered} months
                              </div>
                              <div className="text-[10px] text-blue-500/80 mt-1 dark:text-blue-400/80 font-mono">
                                Exact max threshold: {extensionResults.monthsAvailable?.toFixed(2)} months
                              </div>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl border border-purple-100 dark:border-purple-800 animate-fade-in">
                              <div className="text-xs text-purple-600 dark:text-purple-400 uppercase font-sans">
                                FPI % Applied
                              </div>
                              <div className="text-xl font-bold text-purple-700 dark:text-purple-300 font-sans">
                                {(extensionResults.fpiPercentage || 0).toFixed(2)}%
                              </div>
                            </div>
                          </div>
      
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3 font-sans">
                              Pricing Breakdown (for {extensionResults.monthsCovered}{" "}
                              months)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-5 shadow-xl shadow-blue-900/5 rounded-[2rem] border border-white/20 dark:border-gray-700/50 border-l-4 border-blue-500 dark:border-blue-400">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">
                                    End-User Price
                                  </div>
                                  {extensionResults.roundUpOptionB && (
                                    <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded font-semibold">
                                      Rounded Up (Nearest 1,000)
                                    </span>
                                  )}
                                </div>
                                <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">
                                  {formatCurrency(
                                    extensionResults.endUserPrice,
                                    "USD",
                                  )}
                                </div>
                                {isIndirect && (
                                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    <div>
                                      SAR:{" "}
                                      {formatCurrency(
                                        extensionResults.roundUpOptionB
                                          ? Math.ceil((extensionResults.endUserPrice * sarRate) / 1000) * 1000
                                          : extensionResults.endUserPrice * sarRate,
                                        "SAR",
                                      )}
                                    </div>
                                    <div>
                                      VAT (15%):{" "}
                                      {formatCurrency(
                                        (extensionResults.roundUpOptionB
                                          ? Math.ceil((extensionResults.endUserPrice * sarRate) / 1000) * 1000
                                          : extensionResults.endUserPrice * sarRate) * 0.15,
                                        "SAR",
                                      )}
                                    </div>
                                    <div className="font-bold text-gray-700 dark:text-gray-300">
                                      Total:{" "}
                                      {formatCurrency(
                                        (extensionResults.roundUpOptionB
                                          ? Math.ceil((extensionResults.endUserPrice * sarRate) / 1000) * 1000
                                          : extensionResults.endUserPrice * sarRate) * 1.15,
                                        "SAR",
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-5 shadow-xl shadow-blue-900/5 rounded-[2rem] border border-white/20 dark:border-gray-700/50 border-l-4 border-orange-500 dark:border-orange-400">
                                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">
                                  Reseller Fees
                                </div>
                                <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">
                                  {formatCurrency(extensionResults.commission, "USD")}
                                </div>
                                {isIndirect && (
                                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    <div>
                                      SAR:{" "}
                                      {formatCurrency(
                                        extensionResults.commission * sarRate,
                                        "SAR",
                                      )}
                                    </div>
                                    <div>
                                      VAT (15%):{" "}
                                      {formatCurrency(
                                        extensionResults.commission * sarRate * 0.15,
                                        "SAR",
                                      )}
                                    </div>
                                    <div className="font-bold text-gray-700 dark:text-gray-300">
                                      Total:{" "}
                                      {formatCurrency(
                                        extensionResults.commission * sarRate * 1.15,
                                        "SAR",
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="bg-gray-100 dark:bg-gray-700 p-4 shadow rounded-2xl border-l-4 border-gray-500 dark:border-gray-400">
                                <div className="text-xs text-gray-500 dark:text-gray-300 uppercase font-sans">
                                  Net Price
                                </div>
                                <div className="text-lg font-bold text-gray-700 dark:text-gray-100 font-sans">
                                  {formatCurrency(extensionResults.netPrice, "USD")}
                                </div>
                                {isIndirect && (
                                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    <div>
                                      SAR:{" "}
                                      {formatCurrency(
                                        extensionResults.netPrice * sarRate,
                                        "SAR",
                                      )}
                                    </div>
                                    <div>
                                      VAT (15%):{" "}
                                      {formatCurrency(
                                        extensionResults.netPrice * sarRate * 0.15,
                                        "SAR",
                                      )}
                                    </div>
                                    <div className="font-bold text-gray-700 dark:text-gray-300">
                                      Total:{" "}
                                      {formatCurrency(
                                        extensionResults.netPrice * sarRate * 1.15,
                                        "SAR",
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
      
                {isMidCycleQuote && !results?.midCycleResults && (
                  <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-12 flex flex-col items-center justify-center border border-white/50 dark:border-gray-700/50">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Calculating mid-cycle add-on...
                    </p>
                  </div>
                )}
      
                {isMidCycleQuote && results?.midCycleResults && (
                  <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] overflow-hidden border border-white/50 dark:border-gray-700/50 transition-colors">
                    <div className="px-6 py-5 border-b border-white/40 dark:border-gray-700/50 bg-white/30 dark:bg-gray-800/30 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                        Mid-Cycle Add-on Results
                      </h3>
                      <div className="text-xs font-sans tabular-nums text-gray-500 dark:text-gray-400">
                        1 USD = {sarRate} SAR
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                          <div className="text-xs text-blue-600 dark:text-blue-400 uppercase font-sans">
                            Months Covered
                          </div>
                          <div className="text-xl font-bold text-blue-700 dark:text-blue-300 font-sans">
                            {Math.round(results.midCycleResults.durationMonths)}
                          </div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl border border-green-100 dark:border-green-800">
                          <div className="text-xs text-green-600 dark:text-green-400 uppercase font-sans">
                            Calculated Annual Rate
                          </div>
                          <div className="text-xl font-bold text-green-700 dark:text-green-300 font-sans">
                            {formatCurrency(results.midCycleResults.annualRate, "USD")}
                          </div>
                        </div>
                      </div>
      
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3 font-sans">
                          Pricing Breakdown
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-5 shadow-xl shadow-blue-900/5 rounded-[2rem] border border-white/20 dark:border-gray-700/50 border-l-4 border-blue-500 dark:border-blue-400">
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">
                              End-User Price
                            </div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">
                              {isIndirect 
                                ? formatCurrency(results.midCycleResults.grossSAR, "SAR")
                                : formatCurrency(results.midCycleResults.endUserGrossUSD, "USD")}
                            </div>
                            {isIndirect && (
                              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                <div>
                                  VAT (15%): {formatCurrency(results.midCycleResults.vatSAR, "SAR")}
                                </div>
                                <div className="font-bold text-gray-700 dark:text-gray-300">
                                  Total: {formatCurrency(results.midCycleResults.grandTotalSAR, "SAR")}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-5 shadow-xl shadow-blue-900/5 rounded-[2rem] border border-white/20 dark:border-gray-700/50 border-l-4 border-orange-500 dark:border-orange-400">
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">
                              Reseller Fees
                            </div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">
                              {formatCurrency(results.midCycleResults.commissionUSD, "USD")}
                            </div>
                            {isIndirect && (
                              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                <div>
                                  SAR: {formatCurrency(results.midCycleResults.commissionSAR, "SAR")}
                                </div>
                                <div>
                                  VAT (15%): {formatCurrency(results.midCycleResults.commissionSAR * 0.15, "SAR")}
                                </div>
                                <div className="font-bold text-gray-700 dark:text-gray-300">
                                  Total: {formatCurrency(results.midCycleResults.commissionSAR * 1.15, "SAR")}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="bg-gray-100 dark:bg-gray-700 p-4 shadow rounded-2xl border-l-4 border-gray-500 dark:border-gray-400">
                            <div className="text-xs text-gray-500 dark:text-gray-300 uppercase font-sans">
                              Net Price
                            </div>
                            <div className="text-lg font-bold text-gray-700 dark:text-gray-100 font-sans">
                              {formatCurrency(results.midCycleResults.netPriceUSD, "USD")}
                            </div>
                            {isIndirect && (
                              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                <div>
                                  SAR: {formatCurrency(results.midCycleResults.netPriceSAR, "SAR")}
                                </div>
                                <div>
                                  VAT (15%): {formatCurrency(results.midCycleResults.netPriceSAR * 0.15, "SAR")}
                                </div>
                                <div className="font-bold text-gray-700 dark:text-gray-300">
                                  Total: {formatCurrency(results.midCycleResults.netPriceSAR * 1.15, "SAR")}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
      
                {!isExtensionQuote && !isMidCycleQuote && (!isDealContextComplete || selectedProductIds.length === 0) && (
                  <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-12 flex flex-col items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100/80 dark:bg-gray-800/80 flex items-center justify-center mb-3 text-gray-400">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-gray-700 dark:text-gray-200 mb-1">
                      Commercial Schedule
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                      Complete Deal Context and select at least one product in the Product Mix to activate and generate the commercial schedule.
                    </p>
                  </div>
                )}

                {!isExtensionQuote && !isMidCycleQuote && isDealContextComplete && selectedProductIds.length > 0 && !results && (
                  <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-12 flex flex-col items-center justify-center border border-white/50 dark:border-gray-700/50">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Calculating pricing...
                    </p>
                  </div>
                )}
      
                {!isExtensionQuote && !isMidCycleQuote && results && (
                  <>
                    <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] overflow-hidden border border-white/50 dark:border-gray-700/50 transition-colors">
                      <div className="px-6 py-5 border-b border-white/40 dark:border-gray-700/50 bg-white/30 dark:bg-gray-800/30 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                          Commercial Schedule
                        </h3>
                        {isIndirect && (
                          <div className="text-xs font-sans tabular-nums text-gray-500 dark:text-gray-400">
                            1 USD = {metadata?.exchangeRateSAR || "..."} SAR
                          </div>
                        )}
                      </div>
      
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200/50 dark:divide-gray-700/50">
                          <thead className="bg-white/50 dark:bg-gray-800/50">
                            <tr>
                              <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase whitespace-nowrap">
                                Term
                              </th>
      
                              {/* Dynamic Product Columns - Gross USD */}
                              {selectedProductIds.map((pid) => {
                                const p = (metadata?.availableProducts || []).find(
                                  (x: any) => x.id === pid,
                                );
                                const colorClass =
                                  pid === "utd"
                                    ? "text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-900/20"
                                    : "text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20";
                                return (
                                  <th
                                    key={pid}
                                    className={`px-4 py-3 text-center text-xs font-bold uppercase whitespace-nowrap ${colorClass}`}
                                  >
                                    {p?.shortName || p?.name} (USD)
                                  </th>
                                );
                              })}
      
                              {/* Always show USD Total */}
                              <th className="px-4 py-3 text-center text-xs font-bold text-orange-800 dark:text-orange-200 uppercase bg-orange-100 dark:bg-orange-900/40 whitespace-nowrap">
                                Total (USD)
                              </th>
      
                              {/* Dynamic Product Columns - Gross SAR (Indirect only) */}
                              {isIndirect &&
                                selectedProductIds.map((pid) => {
                                  const p = (metadata?.availableProducts || []).find(
                                    (x) => x.id === pid,
                                  );
                                  const colorClass =
                                    pid === "utd"
                                      ? "text-green-600 dark:text-green-300 bg-green-50/50 dark:bg-green-900/10"
                                      : "text-blue-600 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-900/10";
                                  return (
                                    <th
                                      key={`${pid}-sar`}
                                      className={`px-4 py-3 text-center text-xs font-bold uppercase whitespace-nowrap ${colorClass}`}
                                    >
                                      {p?.shortName || p?.name} (SAR)
                                    </th>
                                  );
                                })}
      
                              {/* Conditionally show SAR Total */}
                              {isIndirect && (
                                <th className="px-4 py-3 text-center text-xs font-bold text-orange-800 dark:text-orange-200 uppercase bg-orange-100 dark:bg-orange-900/40 whitespace-nowrap">
                                  Total (SAR)
                                </th>
                              )}
      
                              {/* New VAT and Grand Total Columns for Indirect */}
                              {isIndirect && (
                                <>
                                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase bg-yellow-50 dark:bg-yellow-900/20 whitespace-nowrap">
                                    VAT (15%)
                                  </th>
                                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-900 dark:text-gray-100 uppercase bg-yellow-200 dark:bg-yellow-900/60">
                                    Grand Total
                                    <br />
                                    (SAR)
                                  </th>
                                </>
                              )}
      
                              <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase whitespace-nowrap">
                                Recognized
                                <br />
                                Total (USD)
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50 bg-transparent">
                            {results?.yearlyResults?.map((r: any, i: number) => (
                              <tr
                                key={r.year}
                                className={
                                  i % 2 === 0
                                    ? "bg-white dark:bg-gray-800"
                                    : "bg-gray-50 dark:bg-gray-700/50"
                                }
                              >
                                <td className="px-4 py-4 text-center text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                  Term {i + 1} ({r.termMonths} months)
                                </td>
      
                                {/* Product Columns Data Gross USD */}
                                {selectedProductIds.map((pid) => {
                                  const pData = r.breakdown.find(
                                    (d: any) => d.id === pid,
                                  );
                                  const colorClass =
                                    pid === "utd"
                                      ? "text-green-700 dark:text-green-300 bg-green-50/30 dark:bg-green-900/10"
                                      : "text-blue-700 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-900/10";
                                  return (
                                    <td
                                      key={pid}
                                      className={`px-4 py-4 text-center text-sm font-sans tabular-nums whitespace-nowrap ${colorClass}`}
                                    >
                                      {pData
                                        ? formatCurrency(pData.gross, "USD")
                                        : "-"}
                                    </td>
                                  );
                                })}
      
                                {/* Total USD */}
                                <td className="px-4 py-4 text-center text-sm font-bold text-orange-700 dark:text-orange-300 font-sans tabular-nums bg-orange-50 dark:bg-orange-900/20 whitespace-nowrap">
                                  {formatCurrency(r.grossUSD, "USD")}
                                </td>
      
                                {/* Product Columns Data Gross SAR (Indirect only) */}
                                {isIndirect &&
                                  selectedProductIds.map((pid) => {
                                    const pData = r.breakdown.find(
                                      (d: any) => d.id === pid,
                                    );
                                    const colorClass =
                                      pid === "utd"
                                        ? "text-green-700 dark:text-green-300 bg-green-50/20 dark:bg-green-900/5"
                                        : "text-blue-700 dark:text-blue-300 bg-blue-50/20 dark:bg-blue-900/5";
                                    return (
                                      <td
                                        key={`${pid}-sar`}
                                        className={`px-4 py-4 text-center text-sm font-sans tabular-nums whitespace-nowrap ${colorClass}`}
                                      >
                                        {pData
                                          ? formatCurrency(pData.grossSAR, "SAR")
                                          : "-"}
                                      </td>
                                    );
                                  })}
      
                                {/* Total SAR (if Indirect) */}
                                {isIndirect && (
                                  <td className="px-4 py-4 text-center text-sm font-bold text-orange-800 dark:text-orange-200 font-sans tabular-nums bg-orange-50 dark:bg-orange-900/20 whitespace-nowrap">
                                    {formatCurrency(r.grossSAR, "SAR")}
                                  </td>
                                )}
      
                                {/* VAT and Grand Total */}
                                {isIndirect && (
                                  <>
                                    <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-gray-400 font-sans tabular-nums bg-yellow-50/50 dark:bg-yellow-900/10 whitespace-nowrap">
                                      {formatCurrency(r.vatSAR, "SAR")}
                                    </td>
                                    <td className="px-4 py-4 text-center text-sm font-bold text-gray-900 dark:text-gray-100 font-sans tabular-nums bg-yellow-100 dark:bg-yellow-900/40 whitespace-nowrap">
                                      {formatCurrency(r.grandTotalSAR, "SAR")}
                                    </td>
                                  </>
                                )}
      
                                <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-gray-400 font-sans tabular-nums whitespace-nowrap">
                                  {formatCurrency(r.netUSD, "USD")}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-gray-800 dark:bg-gray-900 text-white">
                              <td className="px-4 py-4 text-center text-sm font-bold whitespace-nowrap">
                                Total
                              </td>
      
                              {/* Empty cells for breakdown columns USD */}
                              {selectedProductIds.map((pid) => (
                                <td key={pid}></td>
                              ))}
      
                              {/* Total USD */}
                              <td className="px-4 py-4 text-center text-sm font-bold font-sans tabular-nums whitespace-nowrap">
                                {formatCurrency(results?.totalGrossUSD || 0, "USD")}
                              </td>
      
                              {/* Empty cells for breakdown columns SAR */}
                              {isIndirect &&
                                selectedProductIds.map((pid) => (
                                  <td key={`${pid}-sar`}></td>
                                ))}
      
                              {/* Total SAR */}
                              {isIndirect && (
                                <td className="px-4 py-4 text-center text-sm font-bold font-sans tabular-nums text-orange-300 whitespace-nowrap">
                                  {formatCurrency(results?.totalGrossSAR || 0, "SAR")}
                                </td>
                              )}
      
                              {/* VAT and Grand Total */}
                              {isIndirect && (
                                <>
                                  <td className="px-4 py-4 text-center text-sm font-sans tabular-nums text-gray-300 whitespace-nowrap">
                                    {formatCurrency(results?.totalVatSAR || 0, "SAR")}
                                  </td>
                                  <td className="px-4 py-4 text-center text-sm font-bold font-sans tabular-nums text-yellow-300 whitespace-nowrap">
                                    {formatCurrency(
                                      results?.totalGrandTotalSAR || 0,
                                      "SAR",
                                    )}
                                  </td>
                                </>
                              )}
      
                              <td className="px-4 py-4 text-center text-sm font-bold font-sans tabular-nums text-gray-300 whitespace-nowrap">
                                {formatCurrency(results?.totalNetUSD || 0, "USD")}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
      
                    {/* Summary Metrics (ACV & Splits) */}
                    <div className="font-sans">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-5 shadow-xl shadow-blue-900/5 rounded-[2rem] border border-white/20 dark:border-gray-700/50 border-l-4 border-blue-500 dark:border-blue-400 transition-colors">
                          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">
                            Customer TCV
                          </div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">
                            {formatCurrency(results?.totalGrossUSD || 0, "USD")}
                          </div>
                        </div>
                        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-5 shadow-xl shadow-blue-900/5 rounded-[2rem] border border-white/20 dark:border-gray-700/50 border-l-4 border-indigo-500 dark:border-indigo-400 transition-colors">
                          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">
                            Customer ACV
                          </div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">
                            {formatCurrency(results?.acvUSD || 0, "USD")}
                          </div>
                        </div>
      
                        {/* Net Metrics (Only for Indirect Channels) */}
                        {isIndirect && (
                          <>
                            <div className="bg-gray-100 dark:bg-gray-700 p-4 shadow rounded-2xl border-l-4 border-gray-500 dark:border-gray-400 transition-colors">
                              <div className="text-xs text-gray-500 dark:text-gray-300 uppercase font-sans">
                                Net TCV
                              </div>
                              <div className="text-lg font-bold text-gray-700 dark:text-gray-100 font-sans">
                                {formatCurrency(results?.totalNetUSD || 0, "USD")}
                              </div>
                            </div>
                            <div className="bg-gray-100 dark:bg-gray-700 p-4 shadow rounded-2xl border-l-4 border-gray-500 dark:border-gray-400 transition-colors">
                              <div className="text-xs text-gray-500 dark:text-gray-300 uppercase font-sans">
                                Net ACV
                              </div>
                              <div className="text-lg font-bold text-gray-700 dark:text-gray-100 font-sans">
                                {formatCurrency(results?.netACV || 0, "USD")}
                              </div>
                            </div>
                          </>
                        )}
      
                        {dealType === DealType.RENEWAL && (
                          <>
                            {/* Renewal Base ACV (Gross) */}
                            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-5 shadow-xl shadow-blue-900/5 rounded-[2rem] border border-white/20 dark:border-gray-700/50 border-l-4 border-green-500 dark:border-green-400 transition-colors">
                              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">
                                Renewal Base ACV
                              </div>
                              <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">
                                {formatCurrency(results?.renewalBaseACV || 0, "USD")}
                              </div>
                            </div>
      
                            {/* Net Renewal Base ACV (New for Indirect) */}
                            {isIndirect && (
                              <div className="bg-gray-100 dark:bg-gray-700 p-4 shadow rounded-2xl border-l-4 border-green-500 dark:border-green-400 transition-colors">
                                <div className="text-xs text-gray-500 dark:text-gray-300 uppercase font-sans">
                                  Net Renewal Base
                                </div>
                                <div className="text-lg font-bold text-gray-700 dark:text-gray-100 font-sans">
                                  {formatCurrency(
                                    results?.netRenewalBaseACV || 0,
                                    "USD",
                                  )}
                                </div>
                              </div>
                            )}
      
                            {/* Upsell ACV (Gross) */}
                            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-5 shadow-xl shadow-blue-900/5 rounded-[2rem] border border-white/20 dark:border-gray-700/50 border-l-4 border-orange-500 dark:border-orange-400 transition-colors">
                              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">
                                Upsell ACV
                              </div>
                              <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">
                                {formatCurrency(results?.upsellACV || 0, "USD")}
                              </div>
                            </div>
      
                            {/* Net Upsell ACV (New for Indirect) */}
                            {isIndirect && (
                              <div className="bg-gray-100 dark:bg-gray-700 p-4 shadow rounded-2xl border-l-4 border-orange-500 dark:border-orange-400 transition-colors">
                                <div className="text-xs text-gray-500 dark:text-gray-300 uppercase font-sans">
                                  Net Upsell
                                </div>
                                <div className="text-lg font-bold text-gray-700 dark:text-gray-100 font-sans">
                                  {formatCurrency(results?.netUpsellACV || 0, "USD")}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
      
                      {/* NEW: Net Revenue Breakdown Section with ACV and TCV */}
                      {isIndirect && selectedProductIds.length > 0 && (
                        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-5 shadow-xl shadow-blue-900/5 rounded-[2rem] border border-white/20 dark:border-gray-700/50 border border-gray-200 dark:border-gray-700 mb-4 transition-colors">
                          <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3 font-sans">
                            Net Revenue Breakdown
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {selectedProductIds.map((pid) => {
                              const p = (metadata?.availableProducts || []).find(
                                (x: any) => x.id === pid,
                              );
                              const tcv = results?.productNetTotals?.[pid] || 0;
                              const acv = tcv / config.years;
                              return (
                                <div
                                  key={pid}
                                  className="border border-gray-100 dark:border-gray-700 rounded p-3 bg-gray-50 dark:bg-gray-700"
                                >
                                  <div className="text-xs font-bold text-gray-700 dark:text-gray-200 font-sans mb-2">
                                    {p?.shortName}
                                  </div>
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">
                                      Net TCV
                                    </span>
                                    <span className="text-xs font-sans tabular-nums font-medium text-gray-900 dark:text-white">
                                      {formatCurrency(tcv, "USD")}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">
                                      Net ACV
                                    </span>
                                    <span className="text-xs font-sans tabular-nums font-medium text-gray-900 dark:text-white">
                                      {formatCurrency(acv, "USD")}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
      
                <ExportSection
                  key={resetKey}
                  data={results}
                  config={config}
                  useStartDate={useStartDate}
                  setUseStartDate={setUseStartDate}
                  startMonthYear={startMonthYear}
                  setStartMonthYear={setStartMonthYear}
                  customerName={customerName}
                  setCustomerName={setCustomerName}
                  isExtensionQuote={isExtensionQuote}
                  extensionResults={extensionResults}
                  isMidCycleQuote={isMidCycleQuote}
                  renewalNotes={renewalNotes}
                  exportDisabledMessage={utdEeWarning}
                />
      
                {!isExtensionQuote && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-2xl transition-colors">
                    <button
                      onClick={() => setIsArchitectNotesOpen(!isArchitectNotesOpen)}
                      className="w-full flex justify-between items-center p-4 focus:outline-none"
                    >
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-200">
                          Architect Notes
                        </h4>
                      </div>
                      <svg
                        className={`w-5 h-5 text-yellow-700 dark:text-yellow-300 transform transition-transform duration-200 ${isArchitectNotesOpen ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        ></path>
                      </svg>
                    </button>
      
                    {isArchitectNotesOpen && (
                      <div className="px-4 pb-4 border-t border-yellow-200 dark:border-yellow-700/50 mt-2 pt-2">
                        <ul className="text-xs text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-1">
                          <li>
                            <strong>Base Calculation:</strong> UTD (HC × Rate) / LXD
                            (BC × Rate).
                          </li>
                          <li>
                            <strong>WHT Adjustment:</strong>{" "}
                            {applyWHT
                              ? "Prices grossed up (divided by 0.95)."
                              : "No WHT gross up applied."}
                          </li>
                          <li>
                            <strong>Floor Rules:</strong> Single Deal Min $6,842.
                            Combo Deal LXD Min $4,210. (Adjusted dynamically for WHT).
                          </li>
                          <li>
                            <strong>Recognized Revenue:</strong> Applied {dealType}{" "}
                            {channel} factor.
                            {channel !== ChannelType.DIRECT &&
                              dealType === DealType.NEW_LOGO &&
                              " (Y1 vs Y2+ margins applied)."}
                          </li>
                          {dealType === DealType.RENEWAL && (
                            <li>
                              <strong>Renewal Split:</strong> Renewal Base calculated
                              as sum of [Product Expiring × (1 + Product Uplift
                              Rate)]. Upsell is the remainder of ACV.
                            </li>
                          )}
                          {results?.yearlyResults?.[0]?.floorAdjusted && (
                            <li>
                              <strong>Auto-Adjustment:</strong> Pricing was
                              automatically raised to meet the minimum floor
                              requirements.
                            </li>
                          )}
                          {/* Monthly Cost Analysis */}
                          {monthlyCosts.length > 0 && (
                            <li className="font-semibold italic pt-1 text-yellow-900 dark:text-yellow-100">
                              Unit Economics: {monthlyCosts.join(", ")}.
                            </li>
                          )}
                          {renewalNotes.length > 0 && (
                            <>
                              {renewalNotes.map((note, idx) => (
                                <li
                                  key={`ren-note-${idx}`}
                                  className="font-semibold pt-1 text-yellow-900 dark:text-yellow-100"
                                >
                                  {note}
                                </li>
                              ))}
                            </>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
    </div>
  );
};
