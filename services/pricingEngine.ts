import {
  DealConfiguration,
  PricingResult,
  CalculationOutput,
  DealType,
  ChannelType,
  PricingMethod,
  ProductYearlyData,
} from "../types.js";
import {
  WHT_FACTOR,
  EXCHANGE_RATE_SAR,
  STANDARD_FLOOR_RAW,
  COMBO_FLOOR_LXD_RAW,
  AVAILABLE_PRODUCTS,
  UTD_VARIANTS,
  LXD_VARIANTS,
  LXD_ADDONS,
  UTD_SM_BUCKETS,
} from "../constants.js";

// Dynamic Net Factor Calculation based on Year index and Deal Type
const getNetFactor = (
  dealType: DealType,
  channel: ChannelType,
  yearIndex: number,
): number => {
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
      return 0.9; // -10% for all years
    } else {
      // New Logo
      if (yearIndex === 0) return 0.85; // Y1: -15%
      return 0.9; // Y2+: -10%
    }
  }

  return 1.0;
};

const convertToSAR = (usdAmount: number): number => {
  const rawSar = usdAmount * EXCHANGE_RATE_SAR;
  return Math.ceil(rawSar / 10) * 10; // Rounding to nearest 10 SAR for cleaner numbers
};

export const calculatePricing = (
  config: DealConfiguration,
): CalculationOutput => {
  const configFallback = config || {} as DealConfiguration;
  const dealType = configFallback.dealType || DealType.NEW_LOGO;
  const channel = configFallback.channel || ChannelType.DIRECT;
  const selectedProducts = configFallback.selectedProducts || [];
  const productInputs = configFallback.productInputs || {};
  const years = configFallback.years || 1;
  const method = configFallback.method || PricingMethod.MYFPI;
  const productMethods = configFallback.productMethods || {};
  const rates = configFallback.rates || [];
  const productRates = configFallback.productRates || {};
  const renewalUpliftRates = configFallback.renewalUpliftRates || {};
  const applyWHT = configFallback.applyWHT || false;
  const flatPricing = configFallback.flatPricing || false;
  const rounding = configFallback.rounding || "none";

  // Define Floors based on WHT setting
  const activeStandardFloor = applyWHT
    ? STANDARD_FLOOR_RAW / WHT_FACTOR
    : STANDARD_FLOOR_RAW;
  const activeComboFloor = applyWHT
    ? COMBO_FLOOR_LXD_RAW / WHT_FACTOR
    : COMBO_FLOOR_LXD_RAW;

  const yearlyResults: PricingResult[] = [];
  const productNotes: string[] = [];

  // --- Step 1: Calculate Year 1 Items (Base Calculation) ---

  const year1ProductNets: Record<string, number> = {};

  let totalRenewalBaseForACV = 0;

  selectedProducts.forEach((prodId) => {
    const inputs = productInputs[prodId] || {
      count: 0,
      variant: "",
      baseDiscount: 0,
      expiringAmount: 0,
    };
    const definition = AVAILABLE_PRODUCTS.find((p) => p.id === prodId);

    // NEW LOGO / STANDARD CALCULATION
    let listRate = 0;
    if (prodId === "utd") {
      if (inputs.variant === "SM") {
        const c = inputs.count;
        if (c > 499) {
          listRate = 0;
          productNotes.push("UTD SM: Count > 499 not applicable");
        } else {
          const bucket = UTD_SM_BUCKETS.find((b) => c >= b.min && c <= b.max);
          listRate = bucket ? bucket.price : 0;
          if (c > 0 && !bucket) productNotes.push("UTD SM: Count out of range");
        }
      } else {
        listRate = UTD_VARIANTS[inputs.variant] || 0;
      }
      
      // EAI Activation: +3% on list price for New Business / base list conversions
      const eaiActive = inputs.eaiActivation ?? true;
      if (eaiActive) {
        listRate = listRate * 1.03;
      }
    } else if (prodId === "lxd") {
      listRate = LXD_VARIANTS[inputs.variant] || 0;
    } else {
      listRate = definition?.defaultBasePrice || 0;
    }

    const count = inputs.count;
    let baseGross = 0;

    if (prodId === "lxd" && inputs.variant === "Hospital Pharmacy Model") {
      const extraUsers = Math.max(0, count - 6);
      baseGross = 6500 + extraUsers * 1000;
    } else {
      baseGross =
        definition?.hasVariants || prodId === "utd" || prodId === "lxd"
          ? count * listRate
          : definition?.defaultBasePrice || 0;
    }

    const effectiveDiscount = parseFloat(inputs.baseDiscount as any) || 0;
    let baseNet = baseGross * (1 - effectiveDiscount / 100);

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
      const standardBase = expiring * (1 + upliftVal / 100);

      if (prodId === "utd") {
        // UTD Logic
        let pathBasedPrice = 0;
        let finalTarget = target;

        const effectiveStats =
          inputs.changeInStats && inputs.count > 0
            ? inputs.count
            : inputs.existingCount || 1;
        const expiringRate =
          inputs.existingCount && inputs.existingCount > 0
            ? expiring / inputs.existingCount
            : expiring;

        const calculatePriceForTarget = (currentTarget: string) => {
          const isStatsIncrease =
            inputs.changeInStats && inputs.count > (inputs.existingCount || 0);

          if (existing === currentTarget) {
            if (isStatsIncrease) {
              // Renewing the same variant and changing only the statistics
              const existingCount = inputs.existingCount || 1;
              const additionalStats = inputs.count - existingCount;

              const upliftedBaseRate = expiringRate * (1 + upliftVal / 100);
              const baseNet = existingCount * upliftedBaseRate;
              const upsellValue = additionalStats * upliftedBaseRate;

              return baseNet + upsellValue;
            } else {
              // Same Variant (or stats decreased)
              return effectiveStats * expiringRate * (1 + upliftVal / 100);
            }
          } else {
            if (isStatsIncrease) {
              // If stats changed and are higher, AND VARIANT CHANGED, use the list price
              const gross = listRate * inputs.count;
              const net =
                gross *
                (1 - (parseFloat(inputs.baseDiscount as any) || 0) / 100);
              return applyWHT ? net / WHT_FACTOR : net;
            } else {
              // Variant Upgrade (or stats decreased)
              if (existing === "ANYWHERE" && currentTarget === "UTDADV") {
                return (
                  effectiveStats * expiringRate * (1 + upliftVal / 100 + 0.08)
                );
              } else if (existing === "ANYWHERE" && currentTarget === "UTDEE") {
                return effectiveStats * expiringRate * 1.11;
              } else if (existing === "UTDADV" && currentTarget === "UTDEE") {
                return effectiveStats * expiringRate * 1.11;
              } else if (
                (existing === "ANYWHERE" || existing === "UTDADV") &&
                currentTarget === "UTDEE-EAI"
              ) {
                return effectiveStats * expiringRate * 1.14;
              } else if (
                existing === "UTDEE" &&
                currentTarget === "UTDEE-EAI"
              ) {
                return effectiveStats * expiringRate * 1.11;
              } else {
                return effectiveStats * expiringRate * (1 + upliftVal / 100);
              }
            }
          }
        };

        pathBasedPrice = calculatePriceForTarget(target);

        // Check EE Eligibility
        let isEligibleForEE = false;
        if (existing === "UTDEE" || existing === "UTDEE-EAI") {
          isEligibleForEE = true;
        } else if (pathBasedPrice > 30000) {
          isEligibleForEE = true;
        }

        if (
          (target === "UTDEE" || target === "UTDEE-EAI") &&
          !isEligibleForEE
        ) {
          productNotes.push(
            `UTD: Ineligible for EE (Renewal < $30k). Reverting to ${existing}.`,
          );
          finalTarget = existing;
          pathBasedPrice = calculatePriceForTarget(finalTarget);
        } else if (
          finalTarget !== "UTDEE" &&
          finalTarget !== "UTDEE-EAI" &&
          isEligibleForEE
        ) {
          productNotes.push(
            `UTD: Renewal > $30k. Recommend upgrading to UTD EE.`,
          );
        }

        const isStatsIncrease =
          inputs.changeInStats && inputs.count > (inputs.existingCount || 0);

        if (isStatsIncrease && existing === finalTarget) {
          productNotes.push(
            `UTD: Stats Increased (Same Variant) - Additional stats at FPI-adjusted expiring rate`,
          );
        } else if (isStatsIncrease && existing !== finalTarget) {
          productNotes.push(
            `UTD: Stats Increased & Variant Upgrade - Using list price ($${pathBasedPrice.toFixed(0)})`,
          );
        } else if (existing !== finalTarget) {
          if (existing === "ANYWHERE" && finalTarget === "UTDADV") {
            productNotes.push(`UTD: Upsell Anywhere -> Adv (+8% applied)`);
          } else if (finalTarget === "UTDEE") {
            productNotes.push(
              `UTD: Upsell to EE (${upliftVal < 8 ? "Exception: " : ""}11% uplift recommendation applies)`,
            );
          } else if (finalTarget === "UTDEE-EAI") {
            productNotes.push(
              `UTD: Upsell to EE-EAI (${upliftVal < 8 ? "Exception: " : ""}${existing === "UTDEE" ? "11%" : "14%"} uplift recommendation applies)`,
            );
          }
        }

        actualY1Price = pathBasedPrice;

        // 3. Define Renewal Base
        const isHigherValueOverride =
          inputs.changeInStats && inputs.count > (inputs.existingCount || 0);

        if (
          existing === finalTarget &&
          !isHigherValueOverride &&
          !inputs.changeInStats
        ) {
          renewalBase = actualY1Price; // Absorb entire price as base (Upsell = 0)
        } else {
          // Variant Changed OR Stats Change triggered higher price
          renewalBase = standardBase;
        }
      } else if (prodId === "lxd") {
        // LXD Upsell Logic - REVISED based on Scenarios

        // 1. Calculate Expiring Rate
        let expiringRate = 0;
        if (inputs.existingCount && inputs.existingCount > 0) {
          expiringRate = expiring / inputs.existingCount;
        }

        // 2. Determine Add-on Rate based on Variant Change
        let addOnRate = 0;
        const isSeats = existing.includes("Seats");

        if (isSeats) {
          // Seat Based Logic (Percentage)
          const baseSeatPrice = 300;
          const existingHasFlink = existing.includes("FLINK");
          const existingHasIPE = existing.includes("IPE");
          const targetHasFlink = target.includes("FLINK");
          const targetHasIPE = target.includes("IPE");

          if (!existingHasFlink && targetHasFlink) {
            addOnRate += baseSeatPrice * 0.1; // +30
            productNotes.push(`LXD: Upsell +Formulink (Seats)`);
          }
          if (!existingHasIPE && targetHasIPE) {
            addOnRate += baseSeatPrice * 0.2; // +60
            productNotes.push(`LXD: Upsell +IPE (Seats)`);
          }
        } else {
          // Bed Based Logic (Fixed Dollar Amounts)
          const existingHasFlink = existing.includes("FLINK");
          const existingHasIPE = existing.includes("IPE");
          const targetHasFlink = target.includes("FLINK");
          const targetHasIPE = target.includes("IPE");

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
        const renewalAmount = expiring * (1 + upliftVal / 100);
        const existingCount = inputs.existingCount || 0;
        let upsellOnExisting = existingCount * addOnRate;
        if (applyWHT) upsellOnExisting = upsellOnExisting / WHT_FACTOR;

        const newSitesCount = Math.max(0, inputs.count - existingCount);
        let newSitesCost = 0;
        if (newSitesCount > 0) {
          const newSiteRate = expiringRate * (1 + upliftVal / 100) + addOnRate;
          newSitesCost = newSitesCount * newSiteRate;
          if (applyWHT) newSitesCost = newSitesCost / WHT_FACTOR;
          productNotes.push(
            `LXD: New Sites (${newSitesCount}) @ ${newSiteRate.toFixed(2)} (FPI Applied)`,
          );
        }

        actualY1Price = renewalAmount + upsellOnExisting + newSitesCost;
        renewalBase = renewalAmount;

        if (upsellOnExisting > 0) {
          productNotes.push(
            `LXD: Upsell on Existing ($${upsellOnExisting.toFixed(0)})`,
          );
        }
      }

      finalYear1Net = actualY1Price;
      totalRenewalBaseForACV += renewalBase;
    }

    year1ProductNets[prodId] = finalYear1Net;
  });

  // --- Step 2: Apply Floor Logic to Year 1 Nets ---
  const hasUTD = selectedProducts.includes("utd");
  const hasLXD = selectedProducts.includes("lxd");
  let floorTriggered = false;

  const getLXDAddonNet = (inputs: any, count: number, applyWHT: boolean) => {
    const variant = inputs.variant || "";
    let addOnRate = 0;
    const isSeats = variant.includes("Seats");

    if (isSeats) {
      const baseSeatPrice = 300;
      if (variant.includes("FLINK") && variant.includes("IPE"))
        addOnRate = baseSeatPrice * 0.3;
      else if (variant.includes("FLINK")) addOnRate = baseSeatPrice * 0.1;
      else if (variant.includes("IPE")) addOnRate = baseSeatPrice * 0.2;
    } else {
      const hasFlink = variant.includes("FLINK");
      const hasIPE = variant.includes("IPE");
      if (hasFlink && hasIPE) addOnRate = LXD_ADDONS.FLINK_IPE;
      else if (hasFlink) addOnRate = LXD_ADDONS.FLINK;
      else if (hasIPE) addOnRate = LXD_ADDONS.IPE;
    }

    let addonGross = addOnRate * count;
    let addonNet =
      addonGross * (1 - (parseFloat(inputs.baseDiscount as any) || 0) / 100);
    if (applyWHT) addonNet = addonNet / WHT_FACTOR;
    return addonNet;
  };

  if (hasUTD && hasLXD) {
    const lxdInputs = productInputs["lxd"] || { variant: "", count: 0 };
    const lxdCurrentNet = year1ProductNets["lxd"];
    const lxdAddonNet = getLXDAddonNet(lxdInputs, lxdInputs.count, applyWHT);
    const lxdBaseNet = lxdCurrentNet - lxdAddonNet;

    let currentLxdFloor = activeComboFloor;
    if (lxdInputs.variant === "Hospital Pharmacy Model") {
      const extraUsers = Math.max(0, lxdInputs.count - 6);
      let hpFloor = 6500 + extraUsers * 1000;
      if (applyWHT) hpFloor = hpFloor / WHT_FACTOR;
      currentLxdFloor = hpFloor;
    }

    if (lxdBaseNet < currentLxdFloor) {
      year1ProductNets["lxd"] = currentLxdFloor + lxdAddonNet;
      productNotes.push(
        `LXD adjusted to Floor (Base: ${currentLxdFloor.toFixed(0)} + Addons)`,
      );
      floorTriggered = true;
    }

    const utdInputs = productInputs["utd"] || { variant: "", count: 0 };
    let utdFloor = activeStandardFloor;
    if (utdInputs.variant === "UTDADV") utdFloor = utdFloor * 1.08;
    if (year1ProductNets["utd"] < utdFloor) {
      year1ProductNets["utd"] = utdFloor;
      productNotes.push(
        `UTD adjusted to Floor (${utdInputs.variant === "UTDADV" ? "Standard + 8%" : "Standard"})`,
      );
      floorTriggered = true;
    }
  } else if (hasUTD) {
    const utdInputs = productInputs["utd"] || { variant: "", count: 0 };
    let utdFloor = activeStandardFloor;
    if (utdInputs.variant === "UTDADV") utdFloor = utdFloor * 1.08;
    if (year1ProductNets["utd"] < utdFloor) {
      year1ProductNets["utd"] = utdFloor;
      productNotes.push(
        `UTD adjusted to Minimum Floor (${utdInputs.variant === "UTDADV" ? "Standard + 8%" : "Standard"})`,
      );
      floorTriggered = true;
    }
  } else if (hasLXD) {
    const lxdInputs = productInputs["lxd"] || { variant: "", count: 0 };
    const lxdCurrentNet = year1ProductNets["lxd"];
    const lxdAddonNet = getLXDAddonNet(lxdInputs, lxdInputs.count, applyWHT);
    const lxdBaseNet = lxdCurrentNet - lxdAddonNet;
    let currentLxdFloor = activeStandardFloor;
    if (lxdInputs.variant === "Hospital Pharmacy Model") {
      const extraUsers = Math.max(0, lxdInputs.count - 6);
      let hpFloor = 6500 + extraUsers * 1000;
      if (applyWHT) hpFloor = hpFloor / WHT_FACTOR;
      currentLxdFloor = hpFloor;
    }
    if (lxdBaseNet < currentLxdFloor) {
      year1ProductNets["lxd"] = currentLxdFloor + lxdAddonNet;
      productNotes.push(
        `LXD adjusted to Minimum Floor (Base: ${currentLxdFloor.toFixed(0)} + Addons)`,
      );
      floorTriggered = true;
    }
  }

  // --- Step 3: Multi-Year Projection (Per Product) ---
  const productSchedules: Record<string, number[]> = {};
  const safeYears = Math.max(0, Math.floor(Number(years) || 0));

  selectedProducts.forEach((prodId) => {
    const y1Value = year1ProductNets[prodId];
    const schedule = new Array(safeYears).fill(0);
    const specificRates = productRates[prodId] || rates;
    let specificMethod = productMethods?.[prodId] || method;

    if (specificMethod === PricingMethod.MYPP && y1Value < 10000) {
      specificMethod = PricingMethod.MYFPI;
      productNotes.push(
        `${prodId.toUpperCase()} MYPP requires $10,000 minimum Y1 value. Reverted to MYFPI.`,
      );
    }

    if (specificMethod === PricingMethod.MYPP && dealType === DealType.RENEWAL) {
      const expiring = productInputs[prodId]?.expiringAmount || 0;
      let tempY1 = y1Value;
      for (let i = years - 2; i >= 0; i--) {
        const discountRate = specificRates[i + 1] || 0;
        tempY1 = tempY1 / (1 + discountRate / 100);
      }
      if (tempY1 <= expiring) {
        specificMethod = PricingMethod.MYFPI;
        productNotes.push(
          `${prodId.toUpperCase()} MYPP Year 1 renewal ($${tempY1.toFixed(0)}) cannot be less than or equal to expiring ($${expiring.toFixed(0)}). Reverted to MYFPI.`,
        );
      }
    }

    if (specificMethod === PricingMethod.MYFPI) {
      schedule[0] = y1Value;
      for (let i = 1; i < years; i++) {
        const rate = specificRates[i] || 0;
        schedule[i] = schedule[i - 1] * (1 + rate / 100);
      }
    } else {
      schedule[years - 1] = y1Value;
      for (let i = years - 2; i >= 0; i--) {
        const discountRate = specificRates[i + 1] || 0;
        schedule[i] = schedule[i + 1] / (1 + discountRate / 100);
      }
    }
    productSchedules[prodId] = schedule;
  });

  if (flatPricing && years > 1) {
    selectedProducts.forEach((prodId) => {
      const schedule = productSchedules[prodId];
      const totalPeriodCost = schedule.reduce((acc, val) => acc + val, 0);
      const averageAnnual = safeYears > 0 ? totalPeriodCost / safeYears : 0;
      productSchedules[prodId] = new Array(safeYears).fill(averageAnnual);
    });
  }

  if (rounding) {
    selectedProducts.forEach((prodId) => {
      const schedule = productSchedules[prodId];
      for (let i = 0; i < years; i++) {
        const val = schedule[i];
        if (channel === ChannelType.DIRECT) {
          schedule[i] = Math.ceil(val / 100) * 100;
        } else {
          const rawSAR = val * EXCHANGE_RATE_SAR;
          const roundedSAR = Math.ceil(rawSAR / 1000) * 1000;
          schedule[i] = roundedSAR / EXCHANGE_RATE_SAR;
        }
      }
      productSchedules[prodId] = schedule;
    });
  }

  // --- Step 4: Aggregate and Format ---
  let totalTCV = 0,
    totalGrossUSD = 0,
    totalGrossSAR = 0,
    totalVatSAR = 0,
    totalGrandTotalSAR = 0,
    totalNetUSD = 0,
    totalNetSAR = 0;
  const productNetTotals: Record<string, number> = {};
  selectedProducts.forEach((p) => (productNetTotals[p] = 0));

  for (let i = 0; i < years; i++) {
    const breakdown: ProductYearlyData[] = [];
    let yearSum = 0;
    const netFactor = getNetFactor(dealType, channel, i);

    selectedProducts.forEach((prodId) => {
      const val = productSchedules[prodId][i];
      yearSum += val;
      const netVal = val * netFactor;
      breakdown.push({
        id: prodId,
        gross: val,
        grossSAR: convertToSAR(val),
        net: netVal,
      });
      productNetTotals[prodId] += netVal;
    });

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
      currencyToDisplay: channel === ChannelType.DIRECT ? "USD" : "SAR",
    });

    totalTCV += yearSum;
    totalGrossUSD += yearSum;
    totalGrossSAR += yearGrossSAR;
    totalVatSAR += yearVatSAR;
    totalGrandTotalSAR += yearGrandTotalSAR;
    totalNetUSD += recognizedUSD;
    totalNetSAR += recognizedSAR;
  }

  const acvUSD = totalTCV / years;
  const netACV = totalNetUSD / years;
  let upsellACV = 0;
  if (dealType === DealType.RENEWAL)
    upsellACV = Math.max(0, acvUSD - totalRenewalBaseForACV);

  const results: CalculationOutput = {
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
    netRenewalBaseACV:
      totalRenewalBaseForACV * getNetFactor(dealType, channel, 0),
    upsellACV,
    netUpsellACV: upsellACV * getNetFactor(dealType, channel, 0),
    currencyToDisplay: channel === ChannelType.DIRECT ? "USD" : "SAR",
  };

  // Extension Quote Logic
  if (dealType === DealType.EXTENSION) {
    const tcv =
      config.expiringTerm === "multi"
        ? config.expiringTCV || 0
        : config.currentSpend || 0;
    const monthlyCost = (config.currentSpend || 0) / 12;
    let netFactor = 1.0;
    if (channel === ChannelType.FULFILMENT) netFactor = 0.95;
    if (channel === ChannelType.PARTNER_SOURCED) netFactor = 0.9;

    if (config.extensionOption === "A") {
      const customerExtension = tcv * ((config.extensionPercentage || 0) / 100);
      const monthsAvailable =
        monthlyCost > 0 ? customerExtension / monthlyCost : 0;
      let integerMonths = Math.floor(monthsAvailable);
      let nMonthsCost = integerMonths * monthlyCost;
      let fpiPercentage =
        config.extensionFPI ??
        (nMonthsCost > 0 ? (customerExtension / nMonthsCost - 1) * 100 : 0);
      let endUserPrice = config.useFullExtension
        ? customerExtension
        : nMonthsCost * (1 + fpiPercentage / 100);

      results.extensionResults = {
        type: "A",
        variant: config.extensionVariant,
        customerTCV: tcv,
        extensionPercentage: config.extensionPercentage,
        customerExtension,
        currentSpend: config.currentSpend,
        monthlyCost,
        monthsAvailable,
        integerMonths,
        nMonthsCost,
        fpiPercentage,
        endUserPrice,
        commission: endUserPrice * (1 - netFactor),
        netPrice: endUserPrice * netFactor,
        useFullExtension: config.useFullExtension,
      };
      if (config.useFullExtension) {
        const expiringDays = config.expiringTerm === "multi" ? 1095 : 365;
        const dailyCost = tcv / expiringDays;
        const exactDays = dailyCost > 0 ? customerExtension / dailyCost : 0;
        results.extensionResults.days = Math.floor(exactDays);
        results.extensionResults.extraDays = results.extensionResults.days % 30;
      } else {
        results.extensionResults.percentageLess =
          tcv > 0 ? ((integerMonths * monthlyCost) / tcv) * 100 : 0;
        results.extensionResults.percentageMore =
          tcv > 0 ? (((integerMonths + 1) * monthlyCost) / tcv) * 100 : 0;
      }
    } else {
      const maxSARExVAT = 100000 / 1.15;
      const fpiPercentage = config.extensionFPI ?? 0;
      const effectiveSpend = (config.currentSpend || 0) * (1 + (fpiPercentage / 100));
      const monthlyCost = effectiveSpend / 12;
      const monthlyCostSAR = monthlyCost * EXCHANGE_RATE_SAR;
      const monthsAvailable = monthlyCostSAR > 0 ? (maxSARExVAT / monthlyCostSAR) : 0;
      const monthsCovered = Math.floor(monthsAvailable);
      const endUserPrice = monthsCovered * monthlyCost;
      results.extensionResults = {
        type: "B",
        variant: config.extensionVariant,
        currentSpend: config.currentSpend,
        fpiPercentage,
        effectiveSpend,
        monthlyCost,
        monthlyCostSAR,
        monthsAvailable,
        monthsCovered,
        maxSARExVAT,
        endUserPrice,
        commission: endUserPrice * (1 - netFactor),
        netPrice: endUserPrice * netFactor,
      };
    }
  }

  // Mid-Cycle Add-on Logic
  if (dealType === DealType.MID_CYCLE) {
    let durationMonths = 0;
    if (config.midCycleExpiryDate && config.midCycleStartDate) {
      const expDate = new Date(config.midCycleExpiryDate);
      const startDate = new Date(config.midCycleStartDate);
      const diffTime = expDate.getTime() - startDate.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);
      durationMonths = diffDays > 0 ? Math.ceil(diffDays / (365.25 / 12)) : 0;
    }

    let netFactor = 1.0;
    if (channel === ChannelType.FULFILMENT) netFactor = 0.95;
    if (channel === ChannelType.PARTNER_SOURCED) netFactor = 0.9;
    
    let annualRate = 0;
    if (config.midCycleProduct === "UTD_ADV") {
      const spend = Number(config.midCycleExistingSpend) || 0;
      annualRate = spend * 0.08;
    } else if (config.midCycleProduct === "LXD_FLINK") {
      const beds = Number(config.midCycleBedCount) || 0;
      annualRate = beds * 12;
    } else if (config.midCycleProduct === "LXD_IPE") {
      const beds = Number(config.midCycleBedCount) || 0;
      annualRate = beds * 16;
      if (config.midCycleDlm) annualRate += 15000;
    } else if (config.midCycleProduct === "LXD_FLINK_IPE") {
      const beds = Number(config.midCycleBedCount) || 0;
      annualRate = beds * 28;
      if (config.midCycleDlm) annualRate += 15000;
    }

    let totalGross = 0;
    
    if (config.midCycleWHT) {
      annualRate = annualRate / WHT_FACTOR;
    }

    totalGross = (annualRate / 12) * Math.max(0, durationMonths);

    if (config.rounding) {
        if (channel === ChannelType.DIRECT) {
            totalGross = Math.ceil(totalGross / 100) * 100;
        } else {
            const rawSAR = totalGross * EXCHANGE_RATE_SAR;
            const roundedSAR = Math.ceil(rawSAR / 1000) * 1000;
            totalGross = roundedSAR / EXCHANGE_RATE_SAR;
        }
    }

    results.midCycleResults = {
      product: config.midCycleProduct,
      dlmSelected: config.midCycleDlm,
      durationMonths,
      annualRate,
      endUserGrossUSD: totalGross,
      netPriceUSD: totalGross * netFactor,
      commissionUSD: totalGross * (1 - netFactor),
      grossSAR: totalGross * EXCHANGE_RATE_SAR,
      vatSAR: totalGross * EXCHANGE_RATE_SAR * 0.15,
      grandTotalSAR: totalGross * EXCHANGE_RATE_SAR * 1.15,
      netPriceSAR: totalGross * netFactor * EXCHANGE_RATE_SAR,
      commissionSAR: totalGross * (1 - netFactor) * EXCHANGE_RATE_SAR,
      whtApplied: config.midCycleWHT
    };
  }

  return results;
};
