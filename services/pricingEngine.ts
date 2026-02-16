
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
  LD_VARIANTS
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
  const { dealType, channel, selectedProducts, productInputs, years, method, rates, productRates, applyWHT, flatPricing } = config;
  
  // Define Floors based on WHT setting
  const activeStandardFloor = applyWHT ? (STANDARD_FLOOR_RAW / WHT_FACTOR) : STANDARD_FLOOR_RAW;
  const activeComboFloor = applyWHT ? (COMBO_FLOOR_LD_RAW / WHT_FACTOR) : COMBO_FLOOR_LD_RAW;

  const yearlyResults: PricingResult[] = [];
  const productNotes: string[] = [];
  
  // --- Step 1: Calculate Year 1 Items (Base Calculation) ---
  
  const year1ProductNets: Record<string, number> = {};
  
  let totalRenewalBaseForACV = 0; // Sum of Expiring * (1+SpecificRate)
  
  selectedProducts.forEach(prodId => {
    const inputs = productInputs[prodId] || { count: 0, variant: '', baseDiscount: 0, expiringAmount: 0 };
    const definition = AVAILABLE_PRODUCTS.find(p => p.id === prodId);
    
    // 1. Calculate "New Config" Price
    let listRate = 0;
    if (prodId === 'utd') {
      listRate = UTD_VARIANTS[inputs.variant] || 0;
    } else if (prodId === 'ld') {
      listRate = LD_VARIANTS[inputs.variant] || 0;
    } else {
      listRate = definition?.defaultBasePrice || 0;
    }
    
    const count = (prodId === 'utd' || prodId === 'ld') ? inputs.count : 1; 
    const baseGross = (definition?.hasVariants || prodId === 'utd' || prodId === 'ld') 
      ? (inputs.count * listRate) 
      : (definition?.defaultBasePrice || 0);

    // Determine effective discount
    // If it's a combo scenario, the user now enters the combo discount directly into baseDiscount field in UI
    const effectiveDiscount = inputs.baseDiscount;

    let baseNet = baseGross * (1 - (effectiveDiscount / 100));

    // Apply WHT Gross Up if enabled
    if (applyWHT) {
      baseNet = baseNet / WHT_FACTOR;
    }

    // 2. Renewal Logic Check
    let finalYear1Net = baseNet;

    if (dealType === DealType.RENEWAL) {
      const expiring = inputs.expiringAmount || 0;
      
      // Determine applicable rate for this product for Year 1 (Index 0)
      const specificRates = productRates[prodId] || rates;
      const y1FPI = specificRates[0] || 0;
      
      const renewalBase = expiring * (1 + (y1FPI / 100));
      totalRenewalBaseForACV += renewalBase;

      finalYear1Net = baseNet; 
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
    upsellACV = Math.max(0, acvUSD - totalRenewalBaseForACV);
  }

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
    upsellACV,
    currencyToDisplay: channel === ChannelType.DIRECT ? 'USD' : 'SAR',
  };
};
