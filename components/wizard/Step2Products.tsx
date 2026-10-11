// @ts-nocheck
import React from 'react';
import { usePricing } from '../../context/PricingContext';
import { FormattedNumberInput } from '../FormattedNumberInput';
import { CustomSelect } from '../CustomSelect';
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

export const Step2Products = () => {
  const {
    metadata,
    dealType,
    institutionType,
    includeHospital,
    selectedProductIds,
    productInputs,
    isExtensionQuote,
    isMidCycleQuote,
    utdEeWarning,
    toggleProduct,
    handleInputChange,
    handleInputBlur,
    getAllowedTargetVariants
  } = usePricing();
  const { currentStep, setCurrentStep } = usePricing();



  if (isExtensionQuote || isMidCycleQuote) return null;

  return (
    <div className="w-full max-w-full h-full flex flex-col">
                          {/* Section 2: Products & Inputs */}
                    <div className="h-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] border border-white/40 dark:border-gray-700/50 transition-all">
                      <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-4">
                        2. Product Mix
                      </h2>
                      <div className="space-y-4">
                        {!metadata ? (
                          <div className="flex flex-col items-center justify-center p-8 space-y-3">
                            <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                            <p className="text-xs text-gray-500 font-medium italic">
                              Loading product data...
                            </p>
                          </div>
                        ) : (
                          (metadata.availableProducts || []).map((product) => {
                            const isSelected = selectedProductIds.includes(
                              product.id,
                            );
                            const input = productInputs[product.id] || {
                              count: 0,
                              variant: "",
                              baseDiscount: 0,
                            };
      
                            // Logic for disabling LXD variants if UTD is ANYWHERE or UTDADV
                            const isUTDSelected = selectedProductIds.includes("utd");
                            const currentUTDVariant = productInputs["utd"]?.variant;
                            const isRestrictedUTD =
                              isUTDSelected &&
                              (currentUTDVariant === "ANYWHERE" ||
                                currentUTDVariant === "UTDADV");
      
                            // Logic for disabling Base Discount on LXD if UTD EE + LXD EE-Combo is selected
                            const isUTDEE =
                              isUTDSelected &&
                              (currentUTDVariant === "UTDEE" ||
                                currentUTDVariant === "UTDEE (265)");
                            const isLXDComboVariant =
                              product.id === "lxd" &&
                              input.variant.includes("EE-Combo");
                            const shouldDisableLXDDiscount =
                              isUTDEE && isLXDComboVariant;
      
                            // Rename discount label if split rates (Combo) are active for LXD
                            const discountLabel =
                              product.id === "lxd" && isUTDSelected
                                ? "Combo Discount %"
                                : "Base Discount %";
      
                            // RENEWAL SPECIFIC LOGIC
                            const isRenewal = dealType === DealType.RENEWAL;
                            const dphValue = input.dph || 0;
                            const usageValue =
                              dphValue > 0 && input.expiringAmount
                                ? input.expiringAmount / dphValue
                                : 0;
      
                            // --- Upsell Logic Checks ---
                            const existingVariant =
                              input.existingVariant || input.variant;
                            const targetVariant = input.variant;
      
                            // UTD Stats Change Check (Enable for any UTD renewal)
                            const showStatsCheckbox =
                              isRenewal && product.id === "utd";
      
                            // LXD Addon Check
                            const isLXDAddonUpgrade =
                              isRenewal &&
                              product.id === "lxd" &&
                              existingVariant !== targetVariant;
      
                            // Logic to Enable Count Input
                            // Default: Disabled (0) for Renewal
                            let isCountDisabled = isRenewal;
                            if (isRenewal) {
                              if (showStatsCheckbox && input.changeInStats) {
                                isCountDisabled = false;
                              }
                              if (isLXDAddonUpgrade) {
                                isCountDisabled = false;
                              }
                              // Enable count input for LXD renewal to allow stats change
                              if (product.id === "lxd") {
                                isCountDisabled = false;
                              }
                            }
      
                            // Variants Filtering
                            let allowedTargetVariants = institutionType === InstitutionType.ACADEMIC
                              ? (product.id === "utd" ? ["ANYWHERE", "UTDADV", "UTDEE"] : ["BASE PKG", "BASE PKG+FLINK", "BASE PKG+FLINK+IPE", "EE-Combo", "EE-Combo+FLINK", "EE-Combo+FLINK+IPE"])
                              : isRenewal
                              ? getAllowedTargetVariants(product.id, existingVariant)
                              : product.id === "utd"
                                ? Object.keys(metadata?.utdVariants || {}).filter(v => v !== "UTDEE (265)")
                                : Object.keys(metadata?.lxdVariants || {});
      
                            if (isRenewal && product.id === "utd" && existingVariant !== "UTDEE" && (Number(input.expiringAmount) || 0) < 15000) {
                              allowedTargetVariants = allowedTargetVariants.filter(v => v !== "UTDEE");
                            }
      
                            const isUTDSM =
                              product.id === "utd" && input.variant === "SM";
                            const isLXDSeats =
                              product.id === "lxd" &&
                              (input.variant.includes("Seats") ||
                                input.variant === "Hospital Pharmacy Model");
      
                            return (
                              <div
                                key={product.id}
                                className={`border rounded-2xl transition-colors ${isSelected ? (product.id === "utd" ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30" : "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30") : "border-gray-200 dark:border-gray-700"}`}
                              >
                                {/* Header Row */}
                                <div className="flex items-center p-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleProduct(product.id)}
                                    className={`h-4 w-4 border-gray-300 rounded bg-white dark:bg-gray-700 dark:border-gray-500 ${product.id === "utd" ? "text-green-600 focus:ring-green-500" : "text-blue-600 focus:ring-blue-500"}`}
                                  />
                                  <span
                                    className={`ml-3 text-sm font-medium ${isSelected ? (product.id === "utd" ? "text-green-900 dark:text-green-200" : "text-blue-900 dark:text-blue-200") : "text-gray-500 dark:text-gray-400"}`}
                                  >
                                    {product.name}
                                  </span>
                                  {product.id === "utd" && utdEeWarning && (
                                    <span className="ml-auto text-xs font-bold text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded-xl">
                                      {utdEeWarning}
                                    </span>
                                  )}
                                </div>
      
                                {/* Expanded Input Row */}
                                {isSelected && (
                                  <div
                                    className={`px-3 pb-3 pt-0 border-t mt-1 grid grid-cols-1 gap-3 ${product.id === "utd" ? "border-green-100 dark:border-green-800" : "border-blue-100 dark:border-blue-800"}`}
                                  >
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                      
                                      {/* Renewal: Expiring Amount (Primary) */}
                                      {isRenewal && (
                                        <div className="col-span-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-xl">
                                          <label className="block text-xs text-orange-700 dark:text-orange-400 font-semibold mb-1">
                                            Expiring Amount (USD)
                                          </label>
                                          <FormattedNumberInput
                                            value={input.expiringAmount || 0}
                                            onChange={(val) =>
                                              handleInputChange(
                                                product.id,
                                                "expiringAmount",
                                                val,
                                              )
                                            }
                                            className="block w-full text-xs border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-orange-500 focus:border-orange-500 border p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums"
                                          />
                                          {/* Restored DPH Fields for UTD */}
                                          {product.id === "utd" && (
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                              <div>
                                                <label className="block text-[10px] text-gray-500 dark:text-gray-400 uppercase">
                                                  DPH
                                                </label>
                                                <FormattedNumberInput
                                                  value={input.dph || 0}
                                                  onChange={(val) =>
                                                    handleInputChange(
                                                      product.id,
                                                      "dph",
                                                      val,
                                                    )
                                                  }
                                                  placeholder="0.00"
                                                  className="block w-full text-xs border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-blue-500 border p-1 bg-white dark:bg-gray-700"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[10px] text-gray-500 dark:text-gray-400 uppercase">
                                                  Usage (Auto)
                                                </label>
                                                <div className="text-xs p-1 bg-gray-100 dark:bg-gray-600 rounded-xl border border-gray-200 dark:border-gray-500 font-sans tabular-nums">
                                                  {Math.round(
                                                    usageValue,
                                                  ).toLocaleString()}
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
      
                                      {/* Renewal: Existing Variant Selection */}
                                      {isRenewal && product.hasVariants && (
                                        <div className="col-span-2 grid grid-cols-2 gap-2">
                                          <div>
                                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                              Existing Variant
                                            </label>
                                            <CustomSelect
  value={input.existingVariant || input.variant}
  onChange={(val) => handleInputChange(product.id, "existingVariant", val)}
  options={
    product.id === "utd"
      ? Object.keys(metadata?.utdVariants || {})
          .filter(v => {
            if (v === "UTDEE (265)") return false;
            if (institutionType === InstitutionType.ACADEMIC && !["ANYWHERE", "UTDADV", "UTDEE"].includes(v)) return false;
            return true;
          })
          .map(v => ({ value: v, label: v }))
      : product.id === "lxd"
      ? Object.keys(metadata?.lxdVariants || {})
          .filter(v => {
            if (v.includes("EE-Combo") && institutionType !== InstitutionType.ACADEMIC) return false;
            return true;
          })
          .map(v => ({ value: v, label: v }))
      : []
  }
/>
                                          </div>
                                          {(institutionType === InstitutionType.PROVIDER || includeHospital) && (
                                            <div>
                                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                Existing Stats
                                              </label>
                                              <FormattedNumberInput
                                                value={input.existingCount || 0}
                                                onChange={(val) =>
                                                  handleInputChange(
                                                    product.id,
                                                    "existingCount",
                                                    val,
                                                  )
                                                }
                                                className="block w-full text-xs border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-gray-500 border p-1 bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white"
                                              />
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      
                                      {isRenewal && institutionType === InstitutionType.ACADEMIC && product.id === 'utd' && (
                                        <div className="col-span-2 grid grid-cols-2 gap-3 mb-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                                          <div className="col-span-2 text-[10px] uppercase font-bold text-gray-500">Existing Academic Stats</div>
                                          <div>
                                            <label className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1">Existing Faculty</label>
                                            <FormattedNumberInput value={input.existingFacultyCount || 0} onChange={(val) => handleInputChange(product.id, 'existingFacultyCount', val)} className="w-full text-xs border-gray-300 dark:border-gray-600 rounded-xl p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums" />
                                          </div>
                                          <div>
                                            <label className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1">Existing Residents</label>
                                            <FormattedNumberInput value={input.existingResidentsCount || 0} onChange={(val) => handleInputChange(product.id, 'existingResidentsCount', val)} className="w-full text-xs border-gray-300 dark:border-gray-600 rounded-xl p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums" />
                                          </div>
                                          <div>
                                            <label className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1">Existing Med Students</label>
                                            <FormattedNumberInput value={input.existingMedStudentsCount || 0} onChange={(val) => handleInputChange(product.id, 'existingMedStudentsCount', val)} className="w-full text-xs border-gray-300 dark:border-gray-600 rounded-xl p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums" />
                                          </div>
                                          <div>
                                            <label className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1">Existing Pharma Students</label>
                                            <FormattedNumberInput value={input.existingPharmaStudentsCount || 0} onChange={(val) => handleInputChange(product.id, 'existingPharmaStudentsCount', val)} className="w-full text-xs border-gray-300 dark:border-gray-600 rounded-xl p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums" />
                                          </div>
                                        </div>
                                      )}
                                      
                                      {isRenewal && institutionType === InstitutionType.ACADEMIC && product.id === 'lxd' && (
                                        <div className="col-span-2 grid grid-cols-1 gap-2 mb-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                                          <div className="text-[10px] uppercase font-bold text-gray-500">Existing Academic Stats</div>
                                          <div>
                                            <label className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1">Existing Healthcare Students</label>
                                            <FormattedNumberInput value={input.existingTotalStudentsCount || 0} onChange={(val) => handleInputChange(product.id, 'existingTotalStudentsCount', val)} className="w-full text-xs border-gray-300 dark:border-gray-600 rounded-xl p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums" />
                                          </div>
                                        </div>
                                      )}
      
                                      {/* Target Variant Selector */}
                                      {product.hasVariants && (institutionType === InstitutionType.PROVIDER || includeHospital || product.id === 'utd') ? (
                                        <div className="col-span-2">
                                          <label className="block text-xs text-blue-700 dark:text-blue-300 mb-1">
                                            {isRenewal
                                              ? "Target Upgrade Variant"
                                              : "Variant"}
                                          </label>
                                          <CustomSelect
  disabled={isRenewal && allowedTargetVariants.length <= 1}
  value={input.variant}
  onChange={(val) => handleInputChange(product.id, "variant", val)}
  options={(allowedTargetVariants as string[]).map(v => {
    let price = 0;
    if (product.id === "utd") {
      price = metadata?.utdVariants?.[v] || 0;
    } else if (product.id === "lxd") {
      price = metadata?.lxdVariants?.[v] || 0;
    }
    return {
      value: v,
      label: `${v} (${price.toLocaleString()} SAR)`
    };
  })}
/>
                                        </div>
                                      ) : (
                                        <div className="col-span-2 text-xs text-gray-400 italic mt-1">
                                          Standard pricing applied
                                        </div>
                                      )}
      
                                      {/* UTD EE Upgrade Checkbox */}
                                      {showStatsCheckbox && (
                                        <div className="col-span-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 p-2 rounded-xl flex items-center">
                                          <input
                                            type="checkbox"
                                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded-xl"
                                            checked={input.changeInStats || false}
                                            onChange={(e) =>
                                              handleInputChange(
                                                product.id,
                                                "changeInStats",
                                                e.target.checked,
                                              )
                                            }
                                          />
                                          <span className="ml-2 text-xs text-purple-700 dark:text-purple-300 font-medium">
                                            Switching or changing stats?
                                          </span>
                                        </div>
                                      )}
      
                                      {/* Moved Academic Inputs */}
                                      {institutionType === InstitutionType.ACADEMIC && product.id === 'utd' && (!isRenewal || input.changeInStats) && (
                                        <div className="col-span-2 grid grid-cols-2 gap-3 mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                                          <div>
                                            <label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Faculty (M.D. / D.O.) <span className="text-red-500">*</span></label>
                                            <FormattedNumberInput value={input.facultyCount || 0} onChange={(val) => handleInputChange(product.id, 'facultyCount', val)} className="w-full text-xs border-gray-300 dark:border-gray-600 rounded-xl p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums" />
                                          </div>
                                          <div>
                                            <label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Residents</label>
                                            <FormattedNumberInput value={input.residentsCount || 0} onChange={(val) => handleInputChange(product.id, 'residentsCount', val)} className="w-full text-xs border-gray-300 dark:border-gray-600 rounded-xl p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums" />
                                          </div>
                                          <div>
                                            <label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Med Students <span className="text-red-500">*</span></label>
                                            <FormattedNumberInput value={input.medStudentsCount || 0} onChange={(val) => handleInputChange(product.id, 'medStudentsCount', val)} className="w-full text-xs border-gray-300 dark:border-gray-600 rounded-xl p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums" />
                                          </div>
                                          <div>
                                            <label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Pharma/Nursing Students</label>
                                            <FormattedNumberInput value={input.pharmaStudentsCount || 0} onChange={(val) => handleInputChange(product.id, 'pharmaStudentsCount', val)} className="w-full text-xs border-gray-300 dark:border-gray-600 rounded-xl p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums" />
                                          </div>
                                          { ((Number(input.facultyCount)||0) + (Number(input.residentsCount)||0) >= 50 || (Number(input.medStudentsCount)||0) + (Number(input.pharmaStudentsCount)||0) >= 1) && (
                                            <div className="col-span-2 mt-2 pt-2 border-t border-blue-200 dark:border-blue-700 w-1/2">
                                              <label className="block text-[10px] text-pink-600 dark:text-pink-400 font-bold mb-1">Educational Discount % (Max 20%)</label>
                                              <div className="mt-1 flex items-center border border-pink-300 dark:border-pink-600 rounded-2xl overflow-hidden bg-white dark:bg-gray-700 h-8">
                                                <button
                                                  type="button"
                                                  onClick={() => { let cur = Number(input.educationalDiscount) || 0; handleInputChange(product.id, 'educationalDiscount', Math.max(0, cur - 1)); }}
                                                  className="w-8 h-full flex-shrink-0 flex items-center justify-center text-pink-500 hover:text-pink-700 hover:bg-pink-50 dark:hover:bg-gray-600 focus:outline-none"
                                                >
                                                  -
                                                </button>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  max="20"
                                                  value={input.educationalDiscount === 0 ? 0 : input.educationalDiscount || ''}
                                                  onChange={(e) => { let v = parseInt(e.target.value); if(v>20)v=20; if(v<0)v=0; handleInputChange(product.id, 'educationalDiscount', isNaN(v)?'':v); }}
                                                  className="w-full h-full text-center text-xs p-0 bg-transparent text-gray-900 dark:text-white outline-none font-sans tabular-nums ph-no-capture"
                                                  style={{ appearance: "textfield", MozAppearance: "textfield" }}
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => { let cur = Number(input.educationalDiscount) || 0; handleInputChange(product.id, 'educationalDiscount', Math.min(20, cur + 1)); }}
                                                  className="w-8 h-full flex-shrink-0 flex items-center justify-center text-pink-500 hover:text-pink-700 hover:bg-pink-50 dark:hover:bg-gray-600 focus:outline-none"
                                                >
                                                  +
                                                </button>
                                              </div>
                                            </div>
                                          )}
      
                                        </div>
                                      )}
      
                                      {institutionType === InstitutionType.ACADEMIC && product.id === 'lxd' && (!isRenewal || input.changeInStats) && (
                                        <div className="col-span-2 grid grid-cols-1 gap-2 mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                                          <div>
                                            <label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Total Healthcare Students <span className="text-red-500">*</span></label>
                                            <FormattedNumberInput value={input.totalStudentsCount || 0} onChange={(val) => handleInputChange(product.id, 'totalStudentsCount', val)} className="w-full text-xs border-gray-300 dark:border-gray-600 rounded-xl p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums" />
                                          </div>
                                          <div className="flex flex-col space-y-1 mt-1">
                                            <label className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                                              <input type="checkbox" checked={input.lxdAcademicBase ?? true} onChange={(e) => handleInputChange(product.id, 'lxdAcademicBase', e.target.checked)} className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-xl" /> LXD Base Package ($7)
                                            </label>
                                            <label className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                                              <input type="checkbox" checked={input.lxdAcademicSelect ?? true} onChange={(e) => handleInputChange(product.id, 'lxdAcademicSelect', e.target.checked)} className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-xl" /> Lexi-SELECT (Mobile App) ($3)
                                            </label>
                                            <label className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                                              <input type="checkbox" checked={input.lxdAcademicMartindale ?? false} onChange={(e) => handleInputChange(product.id, 'lxdAcademicMartindale', e.target.checked)} className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-xl" /> Martindale ($1)
                                            </label>
                                          </div>
                                        </div>
                                      )}
      
                                      {/* Count Input (HC/BC) */}
                                      {product.countLabel && (institutionType === InstitutionType.PROVIDER || includeHospital) && (
                                        <div>
                                          <label
                                            className={`block text-xs mb-1 ${isCountDisabled ? "text-gray-400" : "text-blue-700 dark:text-blue-300"}`}
                                          >
                                            {/* Rename label if stats change */}
                                            {isUTDSM || isLXDSeats
                                              ? "Seats"
                                              : showStatsCheckbox &&
                                                  input.changeInStats
                                                ? "New Stats"
                                                : product.countLabel}
                                            {isCountDisabled && " (Ignored)"}
                                            <span className="text-red-500 ml-1">*</span>
                                          </label>
                                          <FormattedNumberInput
                                            value={input.count}
                                            onChange={(val) =>
                                              handleInputChange(
                                                product.id,
                                                "count",
                                                val,
                                              )
                                            }
                                            onBlur={() =>
                                              handleInputBlur(product.id, "count")
                                            }
                                            disabled={isCountDisabled}
                                            className={`block w-full text-xs border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums ${isCountDisabled ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800" : ""}`}
                                          />
                                        </div>
                                      )}
      
                                      {/* Discount Input */}
                                      {(institutionType === InstitutionType.PROVIDER || includeHospital) && (
                                      <div
                                        className={
                                          product.countLabel ? "" : "col-span-2"
                                        }
                                      >
                                        <label className="block text-xs text-blue-700 dark:text-blue-300 mb-1">
                                          {discountLabel}
                                        </label>
                                        <div
                                          className={`flex items-center border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm overflow-hidden bg-white dark:bg-gray-700 h-7 ${shouldDisableLXDDiscount ? "opacity-50 cursor-not-allowed" : ""}`}
                                        >
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (!shouldDisableLXDDiscount)
                                                handleInputChange(
                                                  product.id,
                                                  "baseDiscount",
                                                  Math.max(
                                                    0,
                                                    (parseFloat(
                                                      input.baseDiscount as any,
                                                    ) || 0) - 1,
                                                  ),
                                                );
                                            }}
                                            className="w-7 h-full flex-shrink-0 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none"
                                            disabled={shouldDisableLXDDiscount}
                                          >
                                            -
                                          </button>
                                          <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            disabled={shouldDisableLXDDiscount}
                                            className="w-full h-full text-center text-xs p-0 bg-transparent text-gray-900 dark:text-white outline-none font-sans tabular-nums ph-no-capture"
                                            value={input.baseDiscount}
                                            onChange={(e) =>
                                              handleInputChange(
                                                product.id,
                                                "baseDiscount",
                                                e.target.value,
                                              )
                                            }
                                            style={{
                                              appearance: "textfield",
                                              MozAppearance: "textfield",
                                            }}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (!shouldDisableLXDDiscount)
                                                handleInputChange(
                                                  product.id,
                                                  "baseDiscount",
                                                  Math.min(
                                                    100,
                                                    (parseFloat(
                                                      input.baseDiscount as any,
                                                    ) || 0) + 1,
                                                  ),
                                                );
                                            }}
                                            className="w-7 h-full flex-shrink-0 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none"
                                            disabled={shouldDisableLXDDiscount}
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>
                                      )}
      
                                      {/* EAI Activation Checkbox */}
                                      {product.id === "utd" && (dealType === DealType.NEW_LOGO || dealType === DealType.RENEWAL) && (
                                        <div className="col-span-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-2 rounded-xl flex items-center mt-1">
                                          <input
                                            type="checkbox"
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-xl"
                                            checked={input.eaiActivation ?? true}
                                            onChange={(e) =>
                                              handleInputChange(
                                                product.id,
                                                "eaiActivation",
                                                e.target.checked,
                                              )
                                            }
                                          />
                                          <span className="ml-2 text-xs text-indigo-700 dark:text-indigo-300 font-medium tracking-tight">
                                            EAI Activation (+3%)
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

      </div>
  );
};
