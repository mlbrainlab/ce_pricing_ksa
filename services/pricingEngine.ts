
import { 
  DealConfiguration, 
  PricingResult, 
  CalculationOutput, 
  DealType, 
  ChannelType, 
  PricingMethod,
  ProductYearlyData
} from '../types';
import { 
  WHT_FACTOR, 
  EXCHANGE_RATE_SAR, 
  STANDARD_FLOOR_RAW, 
  COMBO_FLOOR_LXD_RAW, 
  AVAILABLE_PRODUCTS,
  UTD_VARIANTS,
  LXD_VARIANTS,
  LXD_ADDONS,
  UTD_SM_BUCKETS
} from '../constants';

// Dynamic Net Factor Calculation based on Year index and Deal Type
const getNetFactor = (dealType: DealType, channel: ChannelType, yearIndex: number): number => {
  if (channel === ChannelType.DIRECT) {
    return 1.0;
  }

  // Fulfilment Logic
  if (channel === ChannelType.FULFILMENT) {
    if (dealType === DealType.RENEWAL) {
      return 0.95; // -5% for all years
    } else {
      // New Logo
      if (yearIndex === 0) return 0.925; // Y1: -7.5%
      return 0.95; // Y2+: -5%
    }
  }

  // Partner Sourced Logic
  if (channel === ChannelType.PARTNER_SOURCED) {
    if (dealType === DealType.RENEWAL) {
      return 0.90; // -10% for all years
    } else {
      // New Logo
      if (yearIndex === 0) return 0.85; // Y1: -15%
      return 0.90; // Y2+: -10%
    }
  }

  return 1.0;
};

const convertToSAR = (usdAmount: number): number => {
  const rawSar = usdAmount * EXCHANGE_RATE_SAR;
  return Math.ceil(rawSar / 10) * 10; // Rounding to nearest 10 SAR for cleaner numbers
};

export const calculatePricing = (config: DealConfiguration): CalculationOutput => {
  const { dealType, channel, selectedProducts, productInputs, years, method, productMethods, rates, productRates, renewalUpliftRates, applyWHT, flatPricing, rounding } = config;
  
  // Define Floors based on WHT setting
  const activeStandardFloor = applyWHT ? (STANDARD_FLOOR_RAW / WHT_FACTOR) : STANDARD_FLOOR_RAW;
  const activeComboFloor = applyWHT ? (COMBO_FLOOR_LXD_RAW / WHT_FACTOR) : COMBO_FLOOR_LXD_RAW;

  const yearlyResults: PricingResult[] = [];
  const productNotes: string[] = [];
  
  // --- Step 1: Calculate Year 1 Items (Base Calculation) ---
  
  const year1ProductNets: Record<string, number> = {};
  
  let totalRenewalBaseForACV = 0; 
  
  selectedProducts.forEach(prodId => {
    const inputs = productInputs[prodId] || { count: 0, variant: '', baseDiscount: 0, expiringAmount: 0 };
    const definition = AVAILABLE_PRODUCTS.find(p => p.id === prodId);
    
    // NEW LOGO / STANDARD CALCULATION
    let listRate = 0;
    if (prodId === 'utd') {
      if (inputs.variant === 'SM') {
          const c = inputs.count;
          if (c > 499) {
              listRate = 0;
              productNotes.push("UTD SM: Count > 499 not applicable");
          } else {
              const bucket = UTD_SM_BUCKETS.find(b => c >= b.min && c <= b.max);
              listRate = bucket ? bucket.price : 0;
              if (c > 0 && !bucket) productNotes.push("UTD SM: Count out of range");
          }
      } else {
          listRate = UTD_VARIANTS[inputs.variant] || 0;
      }
    } else if (prodId === 'lxd') {
      listRate = LXD_VARIANTS[inputs.variant] || 0;
    } else {
      listRate = definition?.defaultBasePrice || 0;
    }
    
    const count = inputs.count; 
    let baseGross = 0;
    
    if (prodId === 'lxd' && inputs.variant === 'Hospital Pharmacy Model') {
      const extraUsers = Math.max(0, count - 6);
      baseGross = 6500 + (extraUsers * 1000);
    } else {
      baseGross = (definition?.hasVariants || prodId === 'utd' || prodId === 'lxd') 
        ? (count * listRate) 
        : (definition?.defaultBasePrice || 0);
    }

    const effectiveDiscount = inputs.baseDiscount;
    let baseNet = baseGross * (1 - (effectiveDiscount / 100));

    // Apply WHT Gross Up if enabled
    if (applyWHT) {
      baseNet = baseNet / WHT_FACTOR;
    }

    // RENEWAL & UPSELL LOGIC
    let finalYear1Net = baseNet;

    if (dealType === DealType.RENEWAL) {
      const expiring = inputs.expiringAmount || 0;
      
      // Use specific Renewal Uplift Rate for the base calculation
      const upliftVal = renewalUpliftRates[prodId] || 0;
      
      let actualY1Price = expiring;
      let renewalBase = 0;

      const existing = inputs.existingVariant || inputs.variant; 
      const target = inputs.variant;

      // Calculate Standard Base (Expiring * (1 + Uplift Rate))
      const standardBase = expiring * (1 + (upliftVal / 100));

      if (prodId === 'utd') {
         // UTD Logic
         let pathBasedPrice = 0;
         let finalTarget = target;
         
         const effectiveStats = (inputs.changeInStats && inputs.count > 0) ? inputs.count : (inputs.existingCount || 1);
         const expiringRate = inputs.existingCount && inputs.existingCount > 0 ? (expiring / inputs.existingCount) : expiring;
         
         // Calculate the value for their current variant
         const calcCurrent = effectiveStats * expiringRate * (1 + (upliftVal / 100));
         
         // Calculate the value if they upgraded to Advanced (only applicable if currently Anywhere)
         const calcAdvanced = existing === 'ANYWHERE' 
            ? effectiveStats * expiringRate * (1 + (upliftVal / 100) + 0.08)
            : calcCurrent;
            
         // Check EE Eligibility
         let isEligibleForEE = false;
         if (existing === 'UTDEE') {
             isEligibleForEE = true;
         } else if (existing === 'ANYWHERE') {
             if (calcCurrent > 30000 || calcAdvanced > 30000) isEligibleForEE = true;
         } else if (existing === 'UTDADV') {
             if (calcCurrent > 30000) isEligibleForEE = true;
         }
         
         if (target === 'UTDEE' && !isEligibleForEE) {
             productNotes.push(`UTD: Ineligible for EE (Renewal < $30k). Reverting to ${existing}.`);
             finalTarget = existing;
         } else if (finalTarget !== 'UTDEE' && isEligibleForEE) {
             productNotes.push(`UTD: Renewal > $30k. Recommend upgrading to UTD EE.`);
         }
         
         // 1. Determine Path-Based Renewal Price
         if (existing === finalTarget) {
            // Same Variant
            if (existing === 'UTDEE') {
                pathBasedPrice = effectiveStats * expiringRate * 1.08;
            } else {
                pathBasedPrice = effectiveStats * expiringRate * (1 + (upliftVal / 100));
            }
         } else {
            // Variant Upgrade
            if (existing === 'ANYWHERE' && finalTarget === 'UTDADV') {
                pathBasedPrice = effectiveStats * expiringRate * (1 + (upliftVal / 100) + 0.08);
                productNotes.push(`UTD: Upsell Anywhere -> Adv (+8% applied)`);
            } else if (existing === 'ANYWHERE' && finalTarget === 'UTDEE') {
                pathBasedPrice = effectiveStats * expiringRate * 1.11;
                productNotes.push(`UTD: Upsell Anywhere -> EE (11% applied)`);
            } else if (existing === 'UTDADV' && finalTarget === 'UTDEE') {
                pathBasedPrice = effectiveStats * expiringRate * 1.11;
                productNotes.push(`UTD: Upsell Adv -> EE (11% applied)`);
            } else {
                // Fallback
                pathBasedPrice = effectiveStats * expiringRate * (1 + (upliftVal / 100));
            }
         }

         // 2. Universal "Stats Change" Check
         // "at any time... prioritize the new stats... if it's only higher"
         if (inputs.changeInStats && baseNet > pathBasedPrice) {
            actualY1Price = baseNet;
            productNotes.push(`UTD: Stats Change Override ($${baseNet.toFixed(0)})`);
         } else {
            actualY1Price = pathBasedPrice;
         }

         // 3. Define Renewal Base
         const isHigherValueOverride = inputs.changeInStats && baseNet > pathBasedPrice;

         if (existing === finalTarget && !isHigherValueOverride && !inputs.changeInStats) {
             renewalBase = actualY1Price; // Absorb entire price as base (Upsell = 0)
         } else {
             // Variant Changed OR Stats Change triggered higher price
             renewalBase = standardBase;
         }

      } else if (prodId === 'lxd') {
         // LXD Upsell Logic - REVISED based on Scenarios
         
         // 1. Calculate Expiring Rate
         let expiringRate = 0;
         if (inputs.existingCount && inputs.existingCount > 0) {
             expiringRate = expiring / inputs.existingCount;
         }

         // 2. Determine Add-on Rate based on Variant Change
         let addOnRate = 0;
         const isSeats = existing.includes('Seats');
         
         if (isSeats) {
             // Seat Based Logic (Percentage)
             const baseSeatPrice = 300; 
             const existingHasFlink = existing.includes('FLINK');
             const existingHasIPE = existing.includes('IPE');
             const targetHasFlink = target.includes('FLINK');
             const targetHasIPE = target.includes('IPE');

             if (!existingHasFlink && targetHasFlink) {
                 addOnRate += (baseSeatPrice * 0.10); // +30
                 productNotes.push(`LXD: Upsell +Formulink (Seats)`);
             }
             if (!existingHasIPE && targetHasIPE) {
                 addOnRate += (baseSeatPrice * 0.20); // +60
                 productNotes.push(`LXD: Upsell +IPE (Seats)`);
             }
         } else {
             // Bed Based Logic (Fixed Dollar Amounts)
             // Check for specific transitions or just presence
             // Scenarios imply additive logic:
             // Base -> Flink: +12
             // Base -> Flink+IPE: +28
             // Flink -> Flink+IPE: +16
             
             const existingHasFlink = existing.includes('FLINK');
             const existingHasIPE = existing.includes('IPE');
             const targetHasFlink = target.includes('FLINK');
             const targetHasIPE = target.includes('IPE');

             if (!existingHasFlink && targetHasFlink) {
                 addOnRate += LXD_ADDONS.FLINK; // +12
                 productNotes.push(`LXD: Upsell +Formulink (Beds)`);
             }
             
             if (!existingHasIPE && targetHasIPE) {
                 addOnRate += LXD_ADDONS.IPE; // +16
                 productNotes.push(`LXD: Upsell +IPE (Beds)`);
             }
         }

         // 3. Calculate Components
         // A. Renewal Base (Existing Sites * Expiring Rate * Uplift)
         // Note: The scenarios show Renewal Amount = Expiring Amount * 1.05
         const renewalAmount = expiring * (1 + (upliftVal / 100));
         
         // B. Upsell on Existing (Existing Sites * Add-on Rate)
         const existingCount = inputs.existingCount || 0;
         let upsellOnExisting = existingCount * addOnRate;
         if (applyWHT) upsellOnExisting = upsellOnExisting / WHT_FACTOR;

         // C. New Sites Cost (New Sites * (Expiring Rate + Add-on Rate))
         // Note: New Sites do NOT pay Uplift in Year 1
         const newSitesCount = Math.max(0, inputs.count - existingCount);
         let newSitesCost = 0;
         
         if (newSitesCount > 0) {
             // Rate for New Sites = Expiring Rate + Add-on Rate
             // (No Uplift applied to Expiring Rate portion)
             const newSiteRate = expiringRate + addOnRate;
             newSitesCost = newSitesCount * newSiteRate;
             if (applyWHT) newSitesCost = newSitesCost / WHT_FACTOR;
             
             productNotes.push(`LXD: New Sites (${newSitesCount}) @ ${newSiteRate.toFixed(2)} (No Uplift)`);
         }

         // 4. Total Year 1
         actualY1Price = renewalAmount + upsellOnExisting + newSitesCost;
         
         // Renewal Base for ACV Calculation
         // Strictly the "Renewal Amount" part (Expiring * Uplift)
         renewalBase = renewalAmount;

         if (upsellOnExisting > 0) {
             productNotes.push(`LXD: Upsell on Existing ($${upsellOnExisting.toFixed(0)})`);
         }
      }

      finalYear1Net = actualY1Price;
      totalRenewalBaseForACV += renewalBase;
    }

    year1ProductNets[prodId] = finalYear1Net;
  });

  // --- Step 2: Apply Floor Logic to Year 1 Nets ---
  
  const hasUTD = selectedProducts.includes('utd');
  const hasLXD = selectedProducts.includes('lxd');

  let floorTriggered = false;
  
  // Helper to calculate Add-on Net Value for LXD
  const getLXDAddonNet = (inputs: any, count: number, applyWHT: boolean) => {
      const variant = inputs.variant || '';
      let addOnRate = 0;
      
      const isSeats = variant.includes('Seats');

      if (isSeats) {
          // Percentage based add-ons on $300 base
          const baseSeatPrice = 300;
          if (variant.includes('FLINK') && variant.includes('IPE')) {
              addOnRate = baseSeatPrice * 0.30; // 90
          } else if (variant.includes('FLINK')) {
              addOnRate = baseSeatPrice * 0.10; // 30
          } else if (variant.includes('IPE')) {
              addOnRate = baseSeatPrice * 0.20; // 60
          }
      } else {
          // Standard Bed-based add-ons
          // Note: LXD_VARIANTS keys: "BASE PKG", "BASE PKG+FLINK", "BASE PKG+FLINK+IPE", "EE-Combo..."
          // We need to detect if FLINK or IPE is present.
          const hasFlink = variant.includes('FLINK');
          const hasIPE = variant.includes('IPE');

          if (hasFlink && hasIPE) {
              addOnRate = LXD_ADDONS.FLINK_IPE;
          } else if (hasFlink) {
              addOnRate = LXD_ADDONS.FLINK;
          } else if (hasIPE) {
              addOnRate = LXD_ADDONS.IPE;
          }
      }

      let addonGross = addOnRate * count;
      let addonNet = addonGross * (1 - (inputs.baseDiscount / 100));
      
      if (applyWHT) {
          addonNet = addonNet / WHT_FACTOR;
      }
      return addonNet;
  };

  if (hasUTD && hasLXD) {
    // Combo Logic for LXD
    // LXD Floor is COMBO_FLOOR_LXD_RAW (adjusted for WHT)
    // Logic: Floor applies to Base. Add-ons are on top.
    
    const lxdInputs = productInputs['lxd'];
    const lxdCurrentNet = year1ProductNets['lxd'];
    const lxdAddonNet = getLXDAddonNet(lxdInputs, lxdInputs.count, applyWHT);
    const lxdBaseNet = lxdCurrentNet - lxdAddonNet;

    let currentLxdFloor = activeComboFloor;
    if (lxdInputs.variant === 'Hospital Pharmacy Model') {
        const extraUsers = Math.max(0, lxdInputs.count - 6);
        let hpFloor = 6500 + (extraUsers * 1000);
        if (applyWHT) hpFloor = hpFloor / WHT_FACTOR;
        currentLxdFloor = hpFloor; // Always use calculated floor for Hospital Pharmacy Model
    }

    if (lxdBaseNet < currentLxdFloor) {
      year1ProductNets['lxd'] = currentLxdFloor + lxdAddonNet;
      productNotes.push(`LXD adjusted to Floor (Base: ${currentLxdFloor.toFixed(0)} + Addons)`);
      floorTriggered = true;
    }

    // UTD Floor Logic (Standard Floor)
    // Logic: If UTDADV, Floor = StandardFloor * 1.08
    const utdInputs = productInputs['utd'];
    let utdFloor = activeStandardFloor;
    if (utdInputs.variant === 'UTDADV') {
        utdFloor = utdFloor * 1.08;
    }

    if (year1ProductNets['utd'] < utdFloor) {
        year1ProductNets['utd'] = utdFloor;
        productNotes.push(`UTD adjusted to Floor (${utdInputs.variant === 'UTDADV' ? 'Standard + 8%' : 'Standard'})`);
        floorTriggered = true;
    }

  } else if (hasUTD) {
    // Single UTD
    const utdInputs = productInputs['utd'];
    let utdFloor = activeStandardFloor;
    if (utdInputs.variant === 'UTDADV') {
        utdFloor = utdFloor * 1.08;
    }

    if (year1ProductNets['utd'] < utdFloor) {
      year1ProductNets['utd'] = utdFloor;
      productNotes.push(`UTD adjusted to Minimum Floor (${utdInputs.variant === 'UTDADV' ? 'Standard + 8%' : 'Standard'})`);
      floorTriggered = true;
    }
  } else if (hasLXD) {
    // Single LXD
    const lxdInputs = productInputs['lxd'];
    const lxdCurrentNet = year1ProductNets['lxd'];
    const lxdAddonNet = getLXDAddonNet(lxdInputs, lxdInputs.count, applyWHT);
    const lxdBaseNet = lxdCurrentNet - lxdAddonNet;

    let currentLxdFloor = activeStandardFloor;
    if (lxdInputs.variant === 'Hospital Pharmacy Model') {
        const extraUsers = Math.max(0, lxdInputs.count - 6);
        let hpFloor = 6500 + (extraUsers * 1000);
        if (applyWHT) hpFloor = hpFloor / WHT_FACTOR;
        currentLxdFloor = hpFloor;
    }

    if (lxdBaseNet < currentLxdFloor) {
      year1ProductNets['lxd'] = currentLxdFloor + lxdAddonNet;
      productNotes.push(`LXD adjusted to Minimum Floor (Base: ${currentLxdFloor.toFixed(0)} + Addons)`);
      floorTriggered = true;
    }
  }

  // --- Step 3: Multi-Year Projection (Per Product) ---
  
  const productSchedules: Record<string, number[]> = {};

  const safeYears = Math.max(0, Math.floor(Number(years) || 0));

  selectedProducts.forEach(prodId => {
    const y1Value = year1ProductNets[prodId];
    const schedule = new Array(safeYears).fill(0);
    
    const specificRates = productRates[prodId] || rates;
    let specificMethod = productMethods?.[prodId] || method;

    if (specificMethod === PricingMethod.MYPP && y1Value < 10000) {
      specificMethod = PricingMethod.MYFPI;
      productNotes.push(`${prodId.toUpperCase()} MYPP requires $10,000 minimum Y1 value. Reverted to MYFPI.`);
    }

    if (specificMethod === PricingMethod.MYFPI) {
      // Forward
      schedule[0] = y1Value;
      for (let i = 1; i < years; i++) {
        const rate = specificRates[i] || 0; 
        schedule[i] = schedule[i - 1] * (1 + (rate / 100));
      }
    } else {
      // MYPP Reverse
      schedule[years - 1] = y1Value;
      for (let i = years - 2; i >= 0; i--) {
        const discountRate = specificRates[i + 1] || 0; // Discount to reverse
        schedule[i] = schedule[i + 1] / (1 + (discountRate / 100));
      }
    }
    
    productSchedules[prodId] = schedule;
  });

  // --- Step 3.5: Apply Flat Pricing (Flatten the curve) ---
  if (flatPricing && years > 1) {
    selectedProducts.forEach(prodId => {
      const schedule = productSchedules[prodId];
      // Calculate sum of projected years
      const totalPeriodCost = schedule.reduce((acc, val) => acc + val, 0);
      // Average it
      const averageAnnual = safeYears > 0 ? totalPeriodCost / safeYears : 0;
      // Overwrite schedule with flat values
      productSchedules[prodId] = new Array(safeYears).fill(averageAnnual);
    });
  }

  // --- Step 3.6: Apply Rounding ---
  if (rounding) {
    selectedProducts.forEach(prodId => {
      const schedule = productSchedules[prodId];
      for (let i = 0; i < years; i++) {
        const val = schedule[i];
        if (channel === ChannelType.DIRECT) {
          // Direct: Round up to nearest 100 USD
          schedule[i] = Math.ceil(val / 100) * 100;
        } else {
          // Indirect: Round up to nearest 1000 SAR
          const rawSAR = val * EXCHANGE_RATE_SAR;
          const roundedSAR = Math.ceil(rawSAR / 1000) * 1000;
          schedule[i] = roundedSAR / EXCHANGE_RATE_SAR;
        }
      }
      productSchedules[prodId] = schedule;
    });
  }

  // --- Step 4: Aggregate and Format ---
  
  let totalTCV = 0;

  let totalGrossUSD = 0;
  let totalGrossSAR = 0;
  let totalVatSAR = 0;
  let totalGrandTotalSAR = 0;

  let totalNetUSD = 0;
  let totalNetSAR = 0;

  const productNetTotals: Record<string, number> = {};
  selectedProducts.forEach(p => productNetTotals[p] = 0);

  for (let i = 0; i < years; i++) {
    const breakdown: ProductYearlyData[] = [];
    let yearSum = 0;
    
    const netFactor = getNetFactor(dealType, channel, i);

    selectedProducts.forEach(prodId => {
      const val = productSchedules[prodId][i];
      yearSum += val;
      
      const netVal = val * netFactor;
      breakdown.push({
        id: prodId,
        gross: val,
        grossSAR: convertToSAR(val),
        net: netVal
      });

      productNetTotals[prodId] += netVal;
    });

    // Totals for this year
    const yearGrossSAR = convertToSAR(yearSum);
    const yearVatSAR = yearGrossSAR * 0.15;
    const yearGrandTotalSAR = yearGrossSAR + yearVatSAR;

    const recognizedUSD = yearSum * netFactor;
    const recognizedSAR = recognizedUSD * EXCHANGE_RATE_SAR;

    yearlyResults.push({
      year: i + 1,
      breakdown,
      grossUSD: yearSum,
      grossSAR: yearGrossSAR,
      vatSAR: yearVatSAR,
      grandTotalSAR: yearGrandTotalSAR,
      netUSD: recognizedUSD,
      netSAR: recognizedSAR,
      floorAdjusted: i === 0 && floorTriggered,
      notes: i === 0 ? productNotes : [],
    });

    totalTCV += yearSum;
    totalGrossUSD += yearSum;
    totalGrossSAR += yearGrossSAR;
    totalVatSAR += yearVatSAR;
    totalGrandTotalSAR += yearGrandTotalSAR;
    totalNetUSD += recognizedUSD;
    totalNetSAR += recognizedSAR;
  }

  // --- Step 5: Splits (ACV) ---
  const acvUSD = totalTCV / years;
  const netACV = totalNetUSD / years;
  
  let upsellACV = 0;
  
  if (dealType === DealType.RENEWAL) {
    // Upsell = Total ACV - Renewal Base ACV
    // Note: If no variant change, totalRenewalBaseForACV = totalGrossUSD, so upsell = 0.
    upsellACV = Math.max(0, acvUSD - totalRenewalBaseForACV);
  }

  // Calculate Net Splits
  // For Renewal deals, net factor is constant across years for indirect channels
  const renewalNetFactor = getNetFactor(dealType, channel, 0);
  const netRenewalBaseACV = totalRenewalBaseForACV * renewalNetFactor;
  const netUpsellACV = upsellACV * renewalNetFactor;

  return {
    yearlyResults,
    totalGrossUSD,
    totalGrossSAR,
    totalVatSAR,
    totalGrandTotalSAR,
    totalNetUSD,
    totalNetSAR,
    productNetTotals,
    acvUSD,
    netACV,
    renewalBaseACV: totalRenewalBaseForACV,
    netRenewalBaseACV,
    upsellACV,
    netUpsellACV,
    currencyToDisplay: channel === ChannelType.DIRECT ? 'USD' : 'SAR',
  };
};