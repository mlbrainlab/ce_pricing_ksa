
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
  LXD_ADDONS
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
      listRate = UTD_VARIANTS[inputs.variant] || 0;
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
         // LXD Upsell Logic (Add-ons)
         
         if (existing === target) {
             actualY1Price = standardBase;
             renewalBase = actualY1Price; // No Upsell
         } else {
             // Variant Change
             let addOnPricePerBed = 0;
             const isBase = existing.includes('BASE PKG');
             const isFlink = existing.includes('FLINK') && !existing.includes('IPE');
             const targetFlink = target.includes('FLINK') && !target.includes('IPE');
             const targetFlinkIPE = target.includes('FLINK') && target.includes('IPE');

             if (isBase && targetFlink) {
                addOnPricePerBed = LXD_ADDONS.FLINK; // +$12
                productNotes.push(`LXD: Upsell Base -> Formulink (+$12/bed)`);
             } else if (isBase && targetFlinkIPE) {
                addOnPricePerBed = LXD_ADDONS.FLINK_IPE; // +$28
                productNotes.push(`LXD: Upsell Base -> Flink+IPE (+$28/bed)`);
             } else if (isFlink && targetFlinkIPE) {
                addOnPricePerBed = LXD_ADDONS.IPE; // +$16
                productNotes.push(`LXD: Upsell Flink -> Flink+IPE (+$16/bed)`);
             }
             
             let addOnTotal = 0;
             if (addOnPricePerBed > 0) {
                addOnTotal = count * addOnPricePerBed;
                if (applyWHT) addOnTotal = addOnTotal / WHT_FACTOR;
             }
             
             actualY1Price = standardBase + addOnTotal;
             renewalBase = standardBase;
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
  
  if (hasUTD && hasLD) {
    if (year1ProductNets['ld'] < activeComboFloor) {
      year1ProductNets['ld'] = activeComboFloor;
      productNotes.push(`LD adjusted to Combo Floor`);
      floorTriggered = true;
    }
  } else if (hasUTD) {
    if (year1ProductNets['utd'] < activeStandardFloor) {
      year1ProductNets['utd'] = activeStandardFloor;
      productNotes.push(`UTD adjusted to Minimum Floor`);
      floorTriggered = true;
    }
  } else if (hasLD) {
    if (year1ProductNets['ld'] < activeStandardFloor) {
      year1ProductNets['ld'] = activeStandardFloor;
      productNotes.push(`LD adjusted to Minimum Floor`);
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