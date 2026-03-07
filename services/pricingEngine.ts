
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
  COMBO_FLOOR_LD_RAW, 
  AVAILABLE_PRODUCTS,
  UTD_VARIANTS,
  LD_VARIANTS,
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
  const { dealType, channel, selectedProducts, productInputs, years, method, rates, productRates, renewalUpliftRates, applyWHT, flatPricing, rounding } = config;
  
  // Define Floors based on WHT setting
  const activeStandardFloor = applyWHT ? (STANDARD_FLOOR_RAW / WHT_FACTOR) : STANDARD_FLOOR_RAW;
  const activeComboFloor = applyWHT ? (COMBO_FLOOR_LD_RAW / WHT_FACTOR) : COMBO_FLOOR_LD_RAW;

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
    } else if (prodId === 'ld') {
      listRate = LD_VARIANTS[inputs.variant] || 0;
    } else {
      listRate = definition?.defaultBasePrice || 0;
    }
    
    const count = inputs.count; 
    const baseGross = (definition?.hasVariants || prodId === 'utd' || prodId === 'ld') 
      ? (count * listRate) 
      : (definition?.defaultBasePrice || 0);

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
         
         // 1. Determine Path-Based Renewal Price (Baseline before Stats check)
         if (existing === target) {
            // Same Variant
            if (existing === 'UTDEE') {
                // Fixed 8% as per rules for UTDEE Renewal (usually upliftVal covers this if set to 8)
                pathBasedPrice = expiring * 1.08;
            } else {
                pathBasedPrice = standardBase;
            }
         } else {
            // Variant Upgrade
            if (existing === 'ANYWHERE' && target === 'UTDADV') {
                // "add the annual rate + 8%"
                const uplift = (upliftVal + 8) / 100;
                pathBasedPrice = expiring * (1 + uplift);
                productNotes.push(`UTD: Upsell Anywhere -> Adv (Uplift + 8% applied)`);

            } else if (existing === 'ANYWHERE' && target === 'UTDEE') {
                // "change the annual rate to 11%"
                pathBasedPrice = expiring * 1.11;
                productNotes.push(`UTD: Upsell Anywhere -> EE (11% applied)`);

            } else if (existing === 'UTDADV' && target === 'UTDEE') {
                // "add the annual rate of 8% only"
                pathBasedPrice = expiring * 1.08;
                productNotes.push(`UTD: Upsell Adv -> EE (8% applied)`);
            } else {
                // Fallback for undefined paths
                pathBasedPrice = standardBase;
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
         // Rule: If new headcount results in higher value (baseNet used), Renewal Base is Standard Base.
         // If variants differ, Renewal Base is Standard Base.
         // If variants match and NO override, Renewal Base absorbs calculation.
         
         const isHigherValueOverride = inputs.changeInStats && baseNet > pathBasedPrice;

         if (existing === target && !isHigherValueOverride) {
             renewalBase = actualY1Price; // Absorb entire price as base (Upsell = 0)
         } else {
             // Variant Changed OR Stats Change triggered higher price
             renewalBase = standardBase;
         }

      } else if (prodId === 'ld') {
         // LXD Upsell Logic
         
         // 1. Calculate Derived Rate from Expiring Amount and Existing Stats
         let derivedExpiringRate = 0;
         if (inputs.existingCount && inputs.existingCount > 0) {
             derivedExpiringRate = expiring / inputs.existingCount;
         }

         // 2. Calculate Base Price for New Stats
         // The Base Price is always the Derived Rate * New Stats * (1 + Uplift)
         // This represents the cost of the "Existing Variant" at the "New Stats" level
         const newStats = inputs.count > 0 ? inputs.count : (inputs.existingCount || 0);
         let basePriceAtNewStats = 0;
         
         if (derivedExpiringRate > 0) {
             basePriceAtNewStats = derivedExpiringRate * newStats * (1 + (upliftVal / 100));
         } else {
             basePriceAtNewStats = standardBase; // Fallback
         }

         // 3. Calculate Add-on Costs (Upsell)
         let addOnPricePerUnit = 0;
         const isSeats = existing.includes('Seats');
         
         if (isSeats) {
             // Seat Based Logic
             const baseSeatPrice = 300; // Standard List Price for Seats Base
             // Logic: FLINK is 10%, IPE is 20%
             
             // Check what was added
             const existingHasFlink = existing.includes('FLINK');
             const existingHasIPE = existing.includes('IPE');
             const targetHasFlink = target.includes('FLINK');
             const targetHasIPE = target.includes('IPE');

             // Calculate incremental cost
             if (!existingHasFlink && targetHasFlink) {
                 addOnPricePerUnit += (baseSeatPrice * 0.10); // +30
                 productNotes.push(`LXD: Upsell +Formulink (Seats)`);
             }
             if (!existingHasIPE && targetHasIPE) {
                 addOnPricePerUnit += (baseSeatPrice * 0.20); // +60
                 productNotes.push(`LXD: Upsell +IPE (Seats)`);
             }
         } else {
             // Bed Based Logic
             const existingHasFlink = existing.includes('FLINK');
             const existingHasIPE = existing.includes('IPE');
             const targetHasFlink = target.includes('FLINK');
             const targetHasIPE = target.includes('IPE');

             if (!existingHasFlink && targetHasFlink) {
                 addOnPricePerUnit += LXD_ADDONS.FLINK; // +12
                 productNotes.push(`LXD: Upsell +Formulink (Beds)`);
             }
             // Note: IPE implies Flink usually, but strictly per requirements:
             // If moving from Base -> Flink+IPE, we add both (12+16=28)
             // If moving from Flink -> Flink+IPE, we add IPE (16)
             
             if (!existingHasIPE && targetHasIPE) {
                 addOnPricePerUnit += LXD_ADDONS.IPE; // +16
                 productNotes.push(`LXD: Upsell +IPE (Beds)`);
             }
         }

         let addOnTotal = 0;
         if (addOnPricePerUnit > 0) {
            addOnTotal = newStats * addOnPricePerUnit;
            if (applyWHT) addOnTotal = addOnTotal / WHT_FACTOR;
         }

         // 4. Final Price & Renewal Base
         actualY1Price = basePriceAtNewStats + addOnTotal;
         
         // Renewal Base is the price of the OLD variant at the OLD stats (Standard Base)
         // BUT if stats changed, the "Base" portion of the new price (basePriceAtNewStats) is higher than Standard Base.
         // The difference (basePriceAtNewStats - StandardBase) is due to Stats Increase.
         // The difference (addOnTotal) is due to Variant Upgrade.
         
         // Requirement: "The addition of FLINK and/or IPE is the upsell value."
         // Implication: Stats increase is ALSO upsell? Usually yes.
         // Renewal Base = Standard Base (Expiring * Uplift).
         // Everything else is Upsell.
         
         renewalBase = standardBase;
         
         if (newStats > (inputs.existingCount || 0)) {
             productNotes.push(`LXD: Stats Increase (${inputs.existingCount} -> ${newStats})`);
         }
      }

      finalYear1Net = actualY1Price;
      totalRenewalBaseForACV += renewalBase;
    }

    year1ProductNets[prodId] = finalYear1Net;
  });

  // --- Step 2: Apply Floor Logic to Year 1 Nets ---
  
  const hasUTD = selectedProducts.includes('utd');
  const hasLD = selectedProducts.includes('ld');

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
          // Note: LD_VARIANTS keys: "BASE PKG", "BASE PKG+FLINK", "BASE PKG+FLINK+IPE", "EE-Combo..."
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

  if (hasUTD && hasLD) {
    // Combo Logic for LD
    // LD Floor is COMBO_FLOOR_LD_RAW (adjusted for WHT)
    // Logic: Floor applies to Base. Add-ons are on top.
    
    const ldInputs = productInputs['ld'];
    const ldCurrentNet = year1ProductNets['ld'];
    const ldAddonNet = getLXDAddonNet(ldInputs, ldInputs.count, applyWHT);
    const ldBaseNet = ldCurrentNet - ldAddonNet;

    if (ldBaseNet < activeComboFloor) {
      year1ProductNets['ld'] = activeComboFloor + ldAddonNet;
      productNotes.push(`LD adjusted to Combo Floor (Base: ${activeComboFloor.toFixed(0)} + Addons)`);
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
  } else if (hasLD) {
    // Single LD
    const ldInputs = productInputs['ld'];
    const ldCurrentNet = year1ProductNets['ld'];
    const ldAddonNet = getLXDAddonNet(ldInputs, ldInputs.count, applyWHT);
    const ldBaseNet = ldCurrentNet - ldAddonNet;

    if (ldBaseNet < activeStandardFloor) {
      year1ProductNets['ld'] = activeStandardFloor + ldAddonNet;
      productNotes.push(`LD adjusted to Minimum Floor (Base: ${activeStandardFloor.toFixed(0)} + Addons)`);
      floorTriggered = true;
    }
  }

  // --- Step 3: Multi-Year Projection (Per Product) ---
  
  const productSchedules: Record<string, number[]> = {};

  selectedProducts.forEach(prodId => {
    const y1Value = year1ProductNets[prodId];
    const schedule = new Array(years).fill(0);
    
    const specificRates = productRates[prodId] || rates;

    if (method === PricingMethod.MYFPI) {
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
      const averageAnnual = totalPeriodCost / years;
      // Overwrite schedule with flat values
      productSchedules[prodId] = new Array(years).fill(averageAnnual);
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