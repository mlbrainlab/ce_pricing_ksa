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
import { FileText, Download, Table, FileSpreadsheet, Calculator, ArrowRight, Save } from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import { ExportSection } from '../ExportSection';

export const Step3Structure = () => {
  const {
    metadata,
    dealType,
    selectedProductIds,
    years,
    setYears,
    isPartialYear,
    setIsPartialYear,
    partialMonths,
    setPartialMonths,
    method,
    productMethods,
    applyWHT,
    setApplyWHT,
    flatPricing,
    setFlatPricing,
    rounding,
    setRounding,
    applyAnnualRate,
    setApplyAnnualRate,
    globalRateVal,
    setGlobalRateVal,
    utdRateVal,
    setUtdRateVal,
    lxdRateVal,
    setLxdRateVal,
    renewalUpliftGlobal,
    setRenewalUpliftGlobal,
    renewalUpliftUTD,
    setRenewalUpliftUTD,
    renewalUpliftLXD,
    setRenewalUpliftLXD,
    productInputs,
    results,
    isExtensionQuote,
    isMidCycleQuote,
    maxPartialMonths,
    minYears,
    uiGlobalSafeYears,
    showSplitRates,
    isIndirect,
    handleMethodChange,
    handleProductMethodChange,
    renderRateInput,
    getAnnualRateLabel,
    isUtdRateVisible,
    isLxdRateVisible,
    shouldShowAnnualRateInputs
  } = usePricing();
  const { currentStep, setCurrentStep } = usePricing();



  if (isExtensionQuote || isMidCycleQuote) return null;

  return (
    <div className="w-full max-w-full h-full flex flex-col">
                          {/* Section 3: Multi-Year */}
                    <div className="h-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] border border-white/40 dark:border-gray-700/50 transition-all">
                      <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-4">
                        3. Structure
                      </h2>
                      <div className="space-y-4">
                        {/* WHT Checkbox */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <input
                              id="wht-checkbox"
                              type="checkbox"
                              checked={applyWHT}
                              onChange={(e) => setApplyWHT(e.target.checked)}
                              className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
                            />
                            <label
                              htmlFor="wht-checkbox"
                              className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                              Apply WHT (Gross Up)
                            </label>
                          </div>
                        </div>
      
                        <div className="flex space-x-4">
                          <div className="w-1/3">
                            <label className="block text-sm font-semibold text-gray-500 mb-1 tracking-wide dark:text-gray-400">
                              Duration
                            </label>
                            <div className="mt-1 flex items-center border border-gray-300 dark:border-gray-600 rounded-2xl overflow-hidden bg-white dark:bg-gray-700 h-9">
                              <button
                                type="button"
                                onClick={() => setYears(Math.max(minYears, years - 1))}
                                className="w-9 h-full flex-shrink-0 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={minYears}
                                max="7"
                                value={years}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  setYears(isNaN(val) ? minYears : Math.max(minYears, val));
                                }}
                                className="w-full h-full text-center text-sm p-0 bg-transparent text-gray-900 dark:text-white outline-none font-sans tabular-nums ph-no-capture"
                                style={{
                                  appearance: "textfield",
                                  MozAppearance: "textfield",
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setYears(Math.min(7, years + 1))}
                                className="w-9 h-full flex-shrink-0 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div className="w-2/3">
                            <label className="block text-sm font-semibold text-gray-500 mb-1 tracking-wide dark:text-gray-400">
                              Method
                            </label>
                            {showSplitRates ? (
                              <div className="flex flex-col space-y-2 mt-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8">
                                    UTD:
                                  </span>
                                  <div className="flex-1 flex bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-1 h-8 ml-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleProductMethodChange(
                                          "utd",
                                          PricingMethod.MYFPI,
                                        )
                                      }
                                      className={`flex-1 rounded-xl text-[11px] font-semibold tracking-wide transition-all duration-200 ${productMethods.utd === PricingMethod.MYFPI ? "bg-white dark:bg-gray-600 text-green-600 dark:text-green-300 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
                                    >
                                      MYFPI
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleProductMethodChange(
                                          "utd",
                                          PricingMethod.MYPP,
                                        )
                                      }
                                      disabled={
                                        dealType === DealType.RENEWAL &&
                                        !(
                                          productInputs.utd?.changeInStats &&
                                          (productInputs.utd?.count || 0) >
                                            (productInputs.utd?.existingCount || 0)
                                        )
                                      }
                                      className={`flex-1 rounded-xl text-[11px] font-semibold tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${productMethods.utd === PricingMethod.MYPP ? "bg-white dark:bg-gray-600 text-green-600 dark:text-green-300 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
                                    >
                                      MYPP
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8">
                                    LXD:
                                  </span>
                                  <div className="flex-1 flex bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-1 h-8 ml-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleProductMethodChange(
                                          "lxd",
                                          PricingMethod.MYFPI,
                                        )
                                      }
                                      className={`flex-1 rounded-xl text-[11px] font-semibold tracking-wide transition-all duration-200 ${productMethods.lxd === PricingMethod.MYFPI ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
                                    >
                                      MYFPI
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleProductMethodChange(
                                          "lxd",
                                          PricingMethod.MYPP,
                                        )
                                      }
                                      className={`flex-1 rounded-xl text-[11px] font-semibold tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${productMethods.lxd === PricingMethod.MYPP ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
                                    >
                                      MYPP
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-1 flex bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl p-1 h-9">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleMethodChange(PricingMethod.MYFPI)
                                  }
                                  className={`flex-1 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${method === PricingMethod.MYFPI ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
                                >
                                  MYFPI
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleMethodChange(PricingMethod.MYPP)
                                  }
                                  disabled={
                                    dealType === DealType.RENEWAL &&
                                    selectedProductIds.includes("utd") &&
                                    !(
                                      productInputs.utd?.changeInStats &&
                                      (productInputs.utd?.count || 0) >
                                        (productInputs.utd?.existingCount || 0)
                                    )
                                  }
                                  className={`flex-1 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${method === PricingMethod.MYPP ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
                                >
                                  MYPP
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {dealType === DealType.NEW_LOGO && selectedProductIds.length > 0 && (
                          <div className="mt-4 p-4 border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 rounded-2xl">
                            <div className="flex items-center mb-3">
                              <input
                                id="partial-year-checkbox"
                                type="checkbox"
                                checked={isPartialYear}
                                onChange={(e) => setIsPartialYear(e.target.checked)}
                                className="w-5 h-5 text-amber-600 focus:ring-amber-500 border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
                              />
                              <label
                                htmlFor="partial-year-checkbox"
                                className="ml-2 text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center"
                              >
                                Partial-year deal <span className="ml-2 text-xs font-normal opacity-80">(Requires exception form)</span>
                              </label>
                            </div>
                            
                            {isPartialYear && (
                              <div className="flex space-x-4">
                                {selectedProductIds.map(prodId => (
                                  <div key={prodId} className="flex-1">
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase mb-1">
                                      {prodId} Extra Months
                                    </label>
                                    <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-2xl overflow-hidden bg-white dark:bg-gray-700 h-9">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const current = partialMonths[prodId] || 0;
                                          setPartialMonths({ ...partialMonths, [prodId]: Math.max(0, current - 1) });
                                        }}
                                        className="w-9 h-full flex-shrink-0 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min="0"
                                        max="11"
                                        value={partialMonths[prodId] || 0}
                                        onChange={(e) => {
                                          const v = parseInt(e.target.value) || 0;
                                          setPartialMonths({ ...partialMonths, [prodId]: Math.min(11, Math.max(0, v)) });
                                        }}
                                        className="w-full h-full text-center text-sm p-0 bg-transparent text-gray-900 dark:text-white outline-none tabular-nums"
                                        style={{ appearance: "textfield", MozAppearance: "textfield" }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const current = partialMonths[prodId] || 0;
                                          setPartialMonths({ ...partialMonths, [prodId]: Math.min(11, current + 1) });
                                        }}
                                        className="w-9 h-full flex-shrink-0 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {years === 0 && (
                              <div className="mt-3 p-3 text-xs text-amber-700 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-200 rounded-xl flex items-center">
                                <span className="mr-2">⚠️</span>
                                This quote is {maxPartialMonths} months only.
                              </div>
                            )}
                          </div>
                        )}
      
                        {/* Renewal Uplift Rate (Specific for Renewal Base) - Show for ALL Renewals */}
                        {dealType === DealType.RENEWAL && (
                          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                            <div className="mb-2 text-sm font-semibold text-gray-500 mb-1 tracking-wide dark:text-gray-400">
                              Renewal Uplift % (Year 1)
                            </div>
                            {showSplitRates ? (
                              <>
                                {productMethods.utd !== PricingMethod.MYPP &&
                                  renderRateInput(
                                    "UTD Uplift",
                                    renewalUpliftUTD,
                                    setRenewalUpliftUTD,
                                    "Uplift %",
                                    "border-blue-200 dark:border-blue-800",
                                  )}
                                {productMethods.lxd !== PricingMethod.MYPP &&
                                  renderRateInput(
                                    "LXD Uplift",
                                    renewalUpliftLXD,
                                    setRenewalUpliftLXD,
                                    "Uplift %",
                                    "border-green-200 dark:border-green-800",
                                  )}
                                {((selectedProductIds.includes("utd") &&
                                  productMethods.utd !== PricingMethod.MYPP &&
                                  renewalUpliftUTD < 8) ||
                                  (selectedProductIds.includes("lxd") &&
                                    productMethods.lxd !== PricingMethod.MYPP &&
                                    renewalUpliftLXD < 5)) && (
                                  <div className="mt-1 text-[10px] font-bold text-red-600 dark:text-red-400 animate-pulse">
                                    Requires Finance approval
                                  </div>
                                )}
                              </>
                            ) : (
                              method !== PricingMethod.MYPP && (
                                <>
                                  {renderRateInput(
                                    "Uplift",
                                    renewalUpliftGlobal,
                                    setRenewalUpliftGlobal,
                                    "Uplift %",
                                  )}
                                  {renewalUpliftGlobal <
                                    (selectedProductIds.includes("utd") ? 8 : 5) && (
                                    <div className="mt-1 text-[10px] font-bold text-red-600 dark:text-red-400 animate-pulse">
                                      Requires Finance approval
                                    </div>
                                  )}
                                </>
                              )
                            )}
                          </div>
                        )}
      
                        {/* Annual Rate Logic */}
                        <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                          {/* Conditional Checkbox for Renewal MYFPI */}
                          {dealType === DealType.RENEWAL &&
                            (method === PricingMethod.MYFPI ||
                              (showSplitRates &&
                                (productMethods.utd === PricingMethod.MYFPI ||
                                  productMethods.lxd === PricingMethod.MYFPI))) && (
                              <div className="flex items-center mb-4">
                                <input
                                  id="apply-annual-rate"
                                  type="checkbox"
                                  checked={applyAnnualRate}
                                  onChange={(e) =>
                                    setApplyAnnualRate(e.target.checked)
                                  }
                                  className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
                                />
                                <label
                                  htmlFor="apply-annual-rate"
                                  className="ml-2 text-xs font-medium text-gray-700 dark:text-gray-300"
                                >
                                  Apply Annual Increase for Year 2+?
                                </label>
                              </div>
                            )}
      
                          {/* Render Inputs if condition met */}
                          {shouldShowAnnualRateInputs && (
                            <>
                              <div className="mb-2 text-sm font-semibold text-gray-500 mb-1 tracking-wide dark:text-gray-400">
                                {getAnnualRateLabel()}
                              </div>
                              {showSplitRates ? (
                                <>
                                  {isUtdRateVisible &&
                                    renderRateInput(
                                      "UTD Rate",
                                      utdRateVal,
                                      setUtdRateVal,
                                      productMethods.utd === PricingMethod.MYPP
                                        ? "Reverse %"
                                        : "Annual %",
                                      "border-blue-200 dark:border-blue-800",
                                    )}
                                  {isLxdRateVisible &&
                                    renderRateInput(
                                      "LXD Rate",
                                      lxdRateVal,
                                      setLxdRateVal,
                                      productMethods.lxd === PricingMethod.MYPP
                                        ? "Reverse %"
                                        : "Annual %",
                                      "border-green-200 dark:border-green-800",
                                    )}
                                </>
                              ) : (
                                isUtdRateVisible &&
                                renderRateInput(
                                  "Rate",
                                  globalRateVal,
                                  setGlobalRateVal,
                                  method === PricingMethod.MYPP
                                    ? "Reverse %"
                                    : "Annual %",
                                )
                              )}
      
                              {/* Exception Form Alert */}
                              {(() => {
                                let showExceptionAlert = false;
                                if (showSplitRates) {
                                  if (productMethods.utd === PricingMethod.MYPP) {
                                    if (utdRateVal < 8 || utdRateVal > 25)
                                      showExceptionAlert = true;
                                  } else if (
                                    productMethods.utd === PricingMethod.MYFPI
                                  ) {
                                    if (utdRateVal < 8) showExceptionAlert = true;
                                  }
      
                                  if (productMethods.lxd === PricingMethod.MYPP) {
                                    if (lxdRateVal < 5 || lxdRateVal > 25)
                                      showExceptionAlert = true;
                                  } else if (
                                    productMethods.lxd === PricingMethod.MYFPI
                                  ) {
                                    if (lxdRateVal < 5) showExceptionAlert = true;
                                  }
                                } else {
                                  if (method === PricingMethod.MYPP) {
                                    if (
                                      globalRateVal <
                                        (selectedProductIds.includes("utd")
                                          ? 8
                                          : 5) ||
                                      globalRateVal > 25
                                    )
                                      showExceptionAlert = true;
                                  } else if (method === PricingMethod.MYFPI) {
                                    if (
                                      selectedProductIds.includes("utd") &&
                                      globalRateVal < 8
                                    )
                                      showExceptionAlert = true;
                                    if (
                                      selectedProductIds.includes("lxd") &&
                                      !selectedProductIds.includes("utd") &&
                                      globalRateVal < 5
                                    )
                                      showExceptionAlert = true;
                                  }
                                }
      
                                if (showExceptionAlert) {
                                  return (
                                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-700 font-medium">
                                      Exception Form is required for this discount
                                    </div>
                                  );
                                }
                                return null;
                              })()}
      
                              {/* MYPP Threshold Alert */}
                              {(() => {
                                const y1Breakdown =
                                  results?.yearlyResults?.[0]?.breakdown || [];
                                const alerts: string[] = [];
      
                                if (showSplitRates) {
                                  if (productMethods.utd === PricingMethod.MYPP) {
                                    const utdY1 =
                                      y1Breakdown.find((p: any) => p.id === "utd")
                                        ?.gross || 0;
                                    if (utdY1 < 10000)
                                      alerts.push(
                                        "UTD MYPP requires $10,000 minimum Y1 value. Reverted to MYFPI.",
                                      );
                                  }
                                  if (productMethods.lxd === PricingMethod.MYPP) {
                                    const lxdY1 =
                                      y1Breakdown.find((p: any) => p.id === "lxd")
                                        ?.gross || 0;
                                    if (lxdY1 < 10000)
                                      alerts.push(
                                        "LXD MYPP requires $10,000 minimum Y1 value. Reverted to MYFPI.",
                                      );
                                  }
                                } else {
                                  if (method === PricingMethod.MYPP) {
                                    selectedProductIds.forEach((pid) => {
                                      const y1 =
                                        y1Breakdown.find((p: any) => p.id === pid)
                                          ?.gross || 0;
                                      if (y1 < 10000) {
                                        const name =
                                          (metadata?.availableProducts || []).find(
                                            (p) => p.id === pid,
                                          )?.shortName || pid.toUpperCase();
                                        alerts.push(
                                          `${name} MYPP requires $10,000 minimum Y1 value. Reverted to MYFPI.`,
                                        );
                                      }
                                    });
                                  }
                                }
      
                                // Dynamically pull any MYPP reversion notes from backend
                                const backendNotes = results?.yearlyResults?.[0]?.notes || [];
                                backendNotes.forEach((note: string) => {
                                  if (note.includes("Reverted to MYFPI") && !alerts.includes(note)) {
                                    alerts.push(note);
                                  }
                                });
      
                                if (alerts.length > 0) {
                                  return (
                                    <div className="mt-2 space-y-1">
                                      {alerts.map((alert, idx) => (
                                        <div
                                          key={idx}
                                          className="p-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium"
                                        >
                                          {alert}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </>
                          )}
                        </div>
      
                        {/* Flat Pricing Checkbox (Moved Here) */}
                        {uiGlobalSafeYears > 1 && (
                          <div className="mt-4">
                            <div className="flex items-center">
                              <input
                                id="flat-pricing-checkbox"
                                type="checkbox"
                                checked={flatPricing}
                                onChange={(e) => setFlatPricing(e.target.checked)}
                                className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
                              />
                              <label
                                htmlFor="flat-pricing-checkbox"
                                className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                              >
                                Flat Pricing
                              </label>
                            </div>
                            {flatPricing && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                                This option requires RL and Finance approvals
                              </div>
                            )}
                          </div>
                        )}
      
                        {/* Rounding Checkbox */}
                        <div className={`flex items-center mt-2 ${!isIndirect ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <input
                            id="rounding-checkbox"
                            type="checkbox"
                            disabled={!isIndirect}
                            checked={isIndirect ? rounding : false}
                            onChange={(e) => setRounding(e.target.checked)}
                            className="w-5 h-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 disabled:cursor-not-allowed"
                          />
                          <label
                            htmlFor="rounding-checkbox"
                            className={`ml-2 text-sm font-medium ${!isIndirect ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300 cursor-pointer'}`}
                          >
                            Round up prices? {!isIndirect && "(Disabled for Direct)"}
                          </label>
                        </div>
                      </div>
                    </div>

      </div>
  );
};
