import { useState, useEffect, useMemo } from "react";
import posthog from "posthog-js";
import { useAutoState, restoreAutoState } from "../hooks/useAutoState";
import { supabase, logout } from "../components/auth";
import {
  DealType,
  ChannelType,
  PricingMethod,
  ProductInput,
  DealConfiguration,
  ProductDefinition, 
  InstitutionType,
} from "../types";

export function usePricingLogic() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [isQuotesModalOpen, setIsQuotesModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [customerName, setCustomerName] = useAutoState<string>("customerName", "");
    const [metadata, setMetadata] = useState<{
    availableProducts: ProductDefinition[];
    utdVariants: Record<string, number>;
    lxdVariants: Record<string, number>;
    exchangeRateSAR: number;
    whtFactor: number;
  } | null>(null);

  const sarRate = metadata?.exchangeRateSAR || 3.75;

  useEffect(() => {
    // Check if user is already authenticated via Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        setUserProfile(session.user.user_metadata);
        
        // Check if admin
        supabase.from('admins').select('user_id').eq('user_id', session.user.id).limit(1).then(({ data }) => {
          if (data && data.length > 0) setIsAdmin(true);
        });

        if (session.user.user_metadata) {
          const { first_name, last_name, quote_email, phone } = session.user.user_metadata;
          const fullName = [first_name, last_name].filter(Boolean).join(' ');
          if (fullName) localStorage.setItem('wk_rep_name', fullName);
          if (quote_email) localStorage.setItem('wk_rep_email', quote_email);
          if (phone) localStorage.setItem('wk_rep_phone', phone);
        }
      }
      setIsAuthChecked(true);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        setUserProfile(session.user.user_metadata);
        const { first_name, last_name, quote_email, phone } = session.user.user_metadata || {};
        const fullName = [first_name, last_name].filter(Boolean).join(' ');
        if (fullName) localStorage.setItem('wk_rep_name', fullName);
        if (quote_email) localStorage.setItem('wk_rep_email', quote_email);
        if (phone) localStorage.setItem('wk_rep_phone', phone);
      } else {
        setUserProfile(null);
      }
    });

    // We don't cleanup the subscription in this simple effect to keep it alive

    // Fetch metadata immediately on mount (not sensitive)
    fetch("/api/metadata")
      .then((m) => m.json())
      .then(setMetadata)
      .catch((err) => console.error("Metadata fetch failed:", err));
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    posthog.capture("user_logged_in");
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error(e);
    } finally {
      setIsAuthenticated(false);
      try {
        posthog.reset();
      } catch (e) {}
    }
  };

  // Idle timeout logic (10 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(
        () => {
          handleLogout();
        },
        10 * 60 * 1000,
      ); // 10 minutes
    };

    // Initialize timer
    resetTimer();

    // Event listeners for user activity
    const events = [
      "mousemove",
      "keydown",
      "mousedown",
      "touchstart",
      "scroll",
    ];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [isAuthenticated]);

  // Deal State
  const [dealType, setDealType] = useAutoState<DealType | null>('dealType', null);

  const handleDealTypeChange = (newType: DealType) => {
    setDealType(newType);
    if (newType === DealType.RENEWAL) {
      setProductInputs((prev) => {
        const next = { ...prev };
        if (next["utd"] && next["utd"].variant === "UTDEE" && next["utd"].existingVariant !== "UTDEE") {
          const exp = Number(next["utd"].expiringAmount) || 0;
          if (exp < 15000) {
            setNotification("UTD-EE is only available for expiring value ≥ $15,000.");
            setTimeout(() => setNotification(null), 3000);
            next["utd"] = { ...next["utd"], variant: next["utd"].existingVariant || "ANYWHERE" };
          }
        }
        return next;
      });
    }
  };

  const [channel, setChannel] = useAutoState<ChannelType | null>('channel', null);
  const [institutionType, setInstitutionType] = useAutoState<InstitutionType>('institutionType', InstitutionType.PROVIDER);

  // Auto-fill customer name for Academic Institutions
  useEffect(() => {
    if (institutionType === InstitutionType.ACADEMIC && !customerName.trim()) {
      setCustomerName("___ University");
    }
  }, [institutionType]);
  const [includeHospital, setIncludeHospital] = useAutoState<boolean>('includeHospital', false);
  
  // Mid-Cycle State Variables
  const [midCycleExpiryDate, setMidCycleExpiryDate] = useAutoState<string>('midCycleExpiryDate', "");
  const [midCycleStartDate, setMidCycleStartDate] = useAutoState<string>('midCycleStartDate', "");
  const [midCycleProduct, setMidCycleProduct] = useAutoState<string>('midCycleProduct', "UTD_ADV"); 
  const [midCycleExistingSpend, setMidCycleExistingSpend] = useAutoState<number | "">('midCycleExistingSpend', "");
  const [midCycleBedCount, setMidCycleBedCount] = useAutoState<number | "">('midCycleBedCount', "");
  const [midCycleWHT, setMidCycleWHT] = useAutoState<boolean>('midCycleWHT', false);
  const [midCycleDlm, setMidCycleDlm] = useAutoState<boolean>('midCycleDlm', false);

  const [selectedProductIds, setSelectedProductIds] = useAutoState<string[]>('selectedProductIds', []);
  const [years, setYears] = useAutoState<number>('years', 3);
  const [isPartialYear, setIsPartialYear] = useAutoState<boolean>('isPartialYear', false);
  const [partialMonths, setPartialMonths] = useState<Record<string, number>>({});
  const [method, setMethod] = useAutoState<PricingMethod>('method', PricingMethod.MYFPI);
  const [productMethods, setProductMethods] = useState<
    Record<string, PricingMethod>
  >({ utd: PricingMethod.MYFPI, lxd: PricingMethod.MYFPI });
  const [applyWHT, setApplyWHT] = useAutoState<boolean>('applyWHT', true); // Default true for KSA
  const [flatPricing, setFlatPricing] = useAutoState<boolean>('flatPricing', false);
  const [rounding, setRounding] = useAutoState<boolean>('rounding', false); // New Rounding Option
  const [notification, setNotification] = useState<string | null>(null); // Notification State
  const [resetKey, setResetKey] = useState<number>(0); // Key to reset child components
  const [isArchitectNotesOpen, setIsArchitectNotesOpen] =
    useState<boolean>(false); // Accordion state

  // Extension Quote State
  const isExtensionQuote = dealType === DealType.EXTENSION;
  const isMidCycleQuote = dealType === DealType.MID_CYCLE;
  const [extensionOption, setExtensionOption] = useAutoState<"A" | "B" | "C">('extensionOption', "A");
  const [expiringTerm, setExpiringTerm] = useAutoState<"multi" | "single">('expiringTerm', "multi");
  const [expiringTCV, setExpiringTCV] = useAutoState<number>('expiringTCV', 0);
  const [currentSpend, setCurrentSpend] = useAutoState<number>('currentSpend', 0);
  const [extensionPercentage, setExtensionPercentage] = useAutoState<number>('extensionPercentage', 10);
  const [extensionFPI, setExtensionFPI] = useAutoState<number | null>('extensionFPI', null);
  const [extensionVariant, setExtensionVariant] = useAutoState<string>('extensionVariant', "ANYWHERE");
  const [useFullExtension, setUseFullExtension] = useAutoState<boolean>('useFullExtension', false);
  const [roundUpOptionB, setRoundUpOptionB] = useAutoState<boolean>('roundUpOptionB', false);
  const [optionBMonths, setOptionBMonths] = useAutoState<number | null>('optionBMonths', null);
  const [optionCValue, setOptionCValue] = useAutoState<number>('optionCValue', 0);
  const [optionCMonths, setOptionCMonths] = useAutoState<number>('optionCMonths', 6);

  // Start Date State
  const [useStartDate, setUseStartDate] = useAutoState<boolean>('useStartDate', false);
  const [startMonthYear, setStartMonthYear] = useAutoState<string>("startMonthYear", new Date().toISOString().slice(0, 10));

  // Structure Rates (Multi-Year logic: FPI or Reverse Discount)
  const [applyAnnualRate, setApplyAnnualRate] = useAutoState<boolean>('applyAnnualRate', true); // Toggle for Renewal MYFPI
  const [globalRateVal, setGlobalRateVal] = useAutoState<number>('globalRateVal', 5);
  const [utdRateVal, setUtdRateVal] = useAutoState<number>('utdRateVal', 8); // Default 8%
  const [lxdRateVal, setLxdRateVal] = useAutoState<number>('lxdRateVal', 5);

  // Renewal Uplift Rates (Specific to Renewal Base Calculation)
  const [renewalUpliftGlobal, setRenewalUpliftGlobal] = useAutoState<number>('renewalUpliftGlobal', 5);
  const [renewalUpliftUTD, setRenewalUpliftUTD] = useAutoState<number>('renewalUpliftUTD', 8);
  const [renewalUpliftLXD, setRenewalUpliftLXD] = useAutoState<number>('renewalUpliftLXD', 5);

  // Product Inputs State
  const [productInputs, setProductInputs] = useState<
    Record<string, ProductInput>
  >({
    utd: {
      count: 100,
      existingCount: 100,
      variant: "ANYWHERE",
      existingVariant: "ANYWHERE",
      baseDiscount: 0,
      expiringAmount: 0,
      dph: 0,
      forceHeadcountOverride: false,
      changeInStats: false,
    },
    lxd: {
      count: 50,
      existingCount: 50,
      variant: "BASE PKG",
      existingVariant: "BASE PKG",
      baseDiscount: 0,
      expiringAmount: 0,
      dph: 0,
      forceHeadcountOverride: false,
      changeInStats: false,
    },
  });

  const resetForm = () => {
    setDealType(null);
    setChannel(null);
    setInstitutionType(InstitutionType.PROVIDER);
    setIncludeHospital(false);
    setSelectedProductIds([]);
    setYears(3);
    setMethod(PricingMethod.MYFPI);
    setProductMethods({ utd: PricingMethod.MYFPI, lxd: PricingMethod.MYFPI });
    setApplyWHT(true);
    setFlatPricing(false);
    setRounding(false);

    setExtensionOption("A");
    setExpiringTerm("multi");
    setExpiringTCV(0);
    setCurrentSpend(0);
    setExtensionPercentage(10);
    setExtensionFPI(null);
    setExtensionVariant("ANYWHERE");
    setUseFullExtension(false);
    setRoundUpOptionB(false);
    setOptionBMonths(null);
    setResetKey((prev) => prev + 1);

    setStartMonthYear(new Date().toISOString().slice(0, 10));
    setApplyAnnualRate(false);
    setGlobalRateVal(5);
    setUtdRateVal(8);
    setLxdRateVal(5);
    setRenewalUpliftGlobal(5);
    setRenewalUpliftUTD(8);
    setRenewalUpliftLXD(5);

    setProductInputs({
      utd: {
        count: 100,
        existingCount: 100,
        variant: "ANYWHERE",
        existingVariant: "ANYWHERE",
        baseDiscount: 0,
        expiringAmount: 0,
        dph: 0,
        forceHeadcountOverride: false,
        changeInStats: false,
      },
      lxd: {
        count: 50,
        existingCount: 50,
        variant: "BASE PKG",
        existingVariant: "BASE PKG",
        baseDiscount: 0,
        expiringAmount: 0,
        dph: 0,
        forceHeadcountOverride: false,
        changeInStats: false,
      },
    });

    setResults(null);
  };

  const maxPartialMonths = selectedProductIds.length > 0 
    ? Math.max(...selectedProductIds.map(id => partialMonths[id] || 0)) 
    : 0;
  const canYearsBeZero = isPartialYear && maxPartialMonths >= 6;
  const minYears = canYearsBeZero ? 0 : 1;
  const uiGlobalSafeYears = Math.max(1, Math.ceil((years * 12 + (isPartialYear && dealType === DealType.NEW_LOGO ? maxPartialMonths : 0)) / 12));

  useEffect(() => {
    if (years < minYears) {
      setYears(minYears);
    }
  }, [years, minYears]);

  // Check if we need split rates (if both UTD and LXD are selected)
  const showSplitRates =
    selectedProductIds.includes("utd") && selectedProductIds.includes("lxd");
  const isIndirect = Boolean(channel && channel !== ChannelType.DIRECT);

  // EFFECT: Auto-Uncheck WHT when Renewal is selected, force FULFILMENT for Extension
  useEffect(() => {
    if (dealType === DealType.RENEWAL) {
      setApplyWHT(false);
      // Sync UTD EAI Activation to 11% baseline for renewals
      if (selectedProductIds.includes("utd")) {
        const utdInput = productInputs["utd"];
        if (utdInput && (utdInput.eaiActivation === true || utdInput.eaiActivation === undefined)) {
          setRenewalUpliftUTD(11);
        }
      }
    } else {
      setApplyWHT(true);
      // If going from Renewal back to New Logo, no UI rate to change, but if needed we could reset
    }

    if (dealType === DealType.EXTENSION) {
      setChannel(ChannelType.FULFILMENT);
    }
  }, [dealType]);

  useEffect(() => {
    if (dealType === DealType.MID_CYCLE && midCycleStartDate) {
      setUseStartDate(true);
      setStartMonthYear(midCycleStartDate);
    }
  }, [dealType, midCycleStartDate]);

  // EFFECT: Auto-enable rounding when Fulfillment or Partner Sourced, disable when Direct
  useEffect(() => {
    if (channel === ChannelType.DIRECT) {
      setRounding(false);
      setRoundUpOptionB(false);
    } else if (
      channel === ChannelType.FULFILMENT ||
      channel === ChannelType.PARTNER_SOURCED
    ) {
      setRounding(true);
    }
  }, [channel]);

  // EFFECT: Set Default Rates when selection changes
  useEffect(() => {
    // Only apply defaults if one product is selected to avoid overwriting user preference aggressively
    if (selectedProductIds.length === 1) {
      if (selectedProductIds.includes("utd")) {
        // Structure Rates
        setGlobalRateVal(8);
        setUtdRateVal(8);
        // Uplift Rates
        setRenewalUpliftGlobal(8);
        const utdInput = productInputs["utd"];
        if (dealType === DealType.RENEWAL && utdInput && (utdInput.eaiActivation === true || utdInput.eaiActivation === undefined)) {
          setRenewalUpliftUTD(11);
        } else {
          setRenewalUpliftUTD(8);
        }
      } else if (selectedProductIds.includes("lxd")) {
        // Structure Rates
        setGlobalRateVal(5);
        setLxdRateVal(5);
        // Uplift Rates
        setRenewalUpliftGlobal(5);
        setRenewalUpliftLXD(5);
      }
    }
  }, [selectedProductIds]);

  const handleMethodChange = (newMethod: PricingMethod) => {
    setMethod(newMethod);
    setProductMethods({ utd: newMethod, lxd: newMethod });
    if (newMethod === PricingMethod.MYPP) {
      setGlobalRateVal(8);
      setUtdRateVal(8);
      setLxdRateVal(8);
    } else if (newMethod === PricingMethod.MYFPI) {
      setUtdRateVal(8);
      setLxdRateVal(5);
      if (selectedProductIds.includes("utd")) {
        setGlobalRateVal(8);
      } else if (selectedProductIds.includes("lxd")) {
        setGlobalRateVal(5);
      }
    }
  };

  const handleProductMethodChange = (
    productId: string,
    newMethod: PricingMethod,
  ) => {
    setProductMethods((prev) => ({ ...prev, [productId]: newMethod }));
    if (newMethod === PricingMethod.MYPP) {
      if (productId === "utd") setUtdRateVal(8);
      if (productId === "lxd") setLxdRateVal(8);
    } else if (newMethod === PricingMethod.MYFPI) {
      if (productId === "utd") setUtdRateVal(8);
      if (productId === "lxd") setLxdRateVal(5);
    }
  };

  // Helper to generate rate array [val, val, val...]
  const generateRateArray = (val: number, count: number) => {
    const safeCount = Math.max(0, Math.floor(Number(count) || 0));
    return new Array(safeCount).fill(val);
  };

  // Derived Config

  const loadConfig = (loadedConfig: any) => {
    // Automatically restore all registered state
    restoreAutoState(loadedConfig);
    if (loadedConfig.uiState) {
      restoreAutoState(loadedConfig.uiState);
    }
    // Specific edge cases that aren't auto-state
    if (loadedConfig.selectedProducts !== undefined) setSelectedProductIds(loadedConfig.selectedProducts);
    
    // Reset key to force child components to update
    setResetKey(prev => prev + 1);
    setCurrentStep(3);
  };
  const config: DealConfiguration = useMemo(() => {
    // Determine effective structure rates based on toggle
    // For MYFPI in Renewal, we check applyAnnualRate. For MYPP, we always apply the rate.
    const getEffRate = (prodId: string, val: number) => {
      const prodMethod = showSplitRates ? productMethods[prodId] : method;
      if (prodMethod === PricingMethod.MYPP) return val;
      if (dealType === DealType.RENEWAL && !applyAnnualRate) return 0;
      return val;
    };

    const effGlobal = getEffRate("global", globalRateVal); // 'global' is just a fallback, we'll use the method
    const effUtd = getEffRate("utd", utdRateVal);
    const effLxd = getEffRate("lxd", lxdRateVal);

    const maxPMonths = selectedProductIds.length > 0 
      ? Math.max(...selectedProductIds.map(id => partialMonths[id] || 0)) 
      : 0;
    const maxTotalMonths = years * 12 + (isPartialYear && dealType === DealType.NEW_LOGO ? maxPMonths : 0);
    const globalSafeYears = Math.max(1, Math.ceil(maxTotalMonths / 12));

    // Generate arrays based on effective single input values (Structure Rates)
    const rates = generateRateArray(effGlobal, globalSafeYears);
    const utdRates = generateRateArray(effUtd, globalSafeYears);
    const lxdRates = generateRateArray(effLxd, globalSafeYears);

    const productRates: Record<string, number[]> = {};
    if (showSplitRates) {
      productRates["utd"] = utdRates;
      productRates["lxd"] = lxdRates;
    } else {
      if (selectedProductIds.includes("utd")) productRates["utd"] = rates;
      if (selectedProductIds.includes("lxd")) productRates["lxd"] = rates;
    }

    // Renewal Uplifts
    // Allow independent Uplift Rate (Y1) vs Annual Rate (Y2+) for MYFPI
    const currentGlobalUplift = renewalUpliftGlobal;
    const currentUtdUplift = renewalUpliftUTD;
    const currentLxdUplift = renewalUpliftLXD;

    const renewalUpliftRates: Record<string, number> = {};
    if (showSplitRates) {
      renewalUpliftRates["utd"] = currentUtdUplift;
      renewalUpliftRates["lxd"] = currentLxdUplift;
    } else {
      if (selectedProductIds.includes("utd"))
        renewalUpliftRates["utd"] = currentGlobalUplift;
      if (selectedProductIds.includes("lxd"))
        renewalUpliftRates["lxd"] = currentGlobalUplift;
    }

    return {

      dealType,
      channel,
      institutionType,
      includeHospital,
      selectedProducts: selectedProductIds,
      productInputs,
      years,
      isPartialYear,
      partialMonths,
      method,
      productMethods,
      rates,
      productRates,
      renewalUpliftRates,
      applyWHT,
      flatPricing,
      rounding,
      useStartDate,
      startMonthYear,
      extensionOption,
      expiringTerm,
      expiringTCV,
      currentSpend,
      extensionPercentage,
      extensionFPI,
      extensionVariant,
      useFullExtension,
      roundUpOptionB,
      optionBMonths,
      optionCValue,
      optionCMonths,
      midCycleExpiryDate,
      midCycleStartDate,
      midCycleWHT,
      midCycleProduct,
      midCycleExistingSpend,
      midCycleBedCount,
      midCycleDlm,
    };
  }, [
    dealType,
    channel,
    institutionType,
    includeHospital,
    selectedProductIds,
    productInputs,
    years,
    isPartialYear,
    partialMonths,
    method,
    productMethods,
    globalRateVal,
    utdRateVal,
    lxdRateVal,
    renewalUpliftGlobal,
    renewalUpliftUTD,
    renewalUpliftLXD,
    showSplitRates,
    applyWHT,
    flatPricing,
    rounding,
    applyAnnualRate,
    useStartDate,
    startMonthYear,
    extensionOption,
    expiringTerm,
    expiringTCV,
    currentSpend,
    extensionPercentage,
    extensionFPI,
    extensionVariant,
    useFullExtension,
    roundUpOptionB,
    optionBMonths,
    optionCValue,
    optionCMonths,
    midCycleExpiryDate,
    midCycleStartDate,
    midCycleWHT,
    midCycleProduct,
    midCycleExistingSpend,
    midCycleBedCount,
    midCycleDlm,
  ]);

  // Results
  const [results, setResults] = useState<any>(null);

  // Step progression booleans
  const isDealContextComplete = Boolean(dealType && channel);
  const isProductMixActive = isDealContextComplete;
  const isStructureActive = Boolean(isDealContextComplete && selectedProductIds.length > 0);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (!dealType || !channel) {
      setResults(null);
      return;
    }

    if (!isExtensionQuote && !isMidCycleQuote && selectedProductIds.length === 0) {
      setResults(null);
      return;
    }

    const fetchPricing = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/calculate", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`
          },
          body: JSON.stringify(config),
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        } else if (res.status === 401) {
          handleLogout();
        } else {
          console.error("Calculation failed with status:", res.status);
        }
      } catch (error) {
        console.error("Calculation failed:", error);
      }
    };

    const timeoutId = setTimeout(fetchPricing, 300);
    return () => clearTimeout(timeoutId);
  }, [config, isAuthenticated, dealType, channel, isExtensionQuote, isMidCycleQuote, selectedProductIds.length]);

  // Extension Quote Logic
  const extensionResults = results?.extensionResults;

  const isCommercialScheduleActive = isExtensionQuote
    ? Boolean(isDealContextComplete && extensionResults)
    : isMidCycleQuote
    ? Boolean(isDealContextComplete && results)
    : Boolean(isDealContextComplete && selectedProductIds.length > 0 && results);

  const isUtdExtensionVariant = useMemo(() => {
    if (!extensionVariant) return true;
    const v = extensionVariant.toUpperCase();
    return ['ANYWHERE', 'UTDADV', 'UTDEE', 'UTDEE-EAI', 'SM'].includes(v) || v.startsWith('UTD');
  }, [extensionVariant]);

  const defaultOptionBFPI = isUtdExtensionVariant ? 8.0 : 5.0;

  const currentFpiVal = useMemo(() => {
    if (extensionOption === "A") {
      return extensionFPI !== null
        ? extensionFPI
        : extensionResults?.fpiPercentage ?? 0;
    } else if (extensionOption === "B") {
      return extensionFPI !== null ? extensionFPI : defaultOptionBFPI;
    } else {
      return 5; // Option C doesn't use FPI, default to 5 so no finance warning
    }
  }, [extensionOption, extensionFPI, extensionResults, defaultOptionBFPI]);

  const extensionRequiresFinanceApproval = useMemo(() => {
    if (!isExtensionQuote) return false;
    if (extensionOption === "C") return false; // Option C doesn't use FPI
    return currentFpiVal < 5;
  }, [isExtensionQuote, currentFpiVal, extensionOption]);

  // Validation Logic for UTDEE
  const utdEeWarning = useMemo(() => {
    if (dealType === DealType.NEW_LOGO && selectedProductIds.includes("utd")) {
      const inputs = productInputs["utd"];
      if (inputs.variant?.includes("UTDEE")) {
        // Check Year 1 Gross USD for UTD
        // We can find it in yearlyResults[0].breakdown
        const utdY1 = results?.yearlyResults?.[0]?.breakdown.find(
          (p: any) => p.id === "utd",
        );
        if (utdY1 && utdY1.gross < 30000) {
          return "Year 1 ACV should ≥ $30K to qualify for EE";
        }
      }
    }
    return null;
  }, [results, selectedProductIds, productInputs, dealType]);

  // Calculate Monthly Costs for Architect Notes
  const monthlyCosts = useMemo(() => {
    const analysisParts: string[] = [];
    const isIndirect = config.channel !== ChannelType.DIRECT;
    const displayCurrency = isIndirect ? "SAR" : "USD";
    const getValue = (valUSD: number, valSAR: number) =>
      isIndirect ? valSAR : valUSD;

    if (config.selectedProducts.includes("utd")) {
      const count = config.productInputs["utd"].count || 1;
      if (config.productInputs["utd"].count > 0) {
        const totalGrossUSD =
          results?.yearlyResults?.reduce((sum: number, r: any) => {
            const bd = r.breakdown.find((x: any) => x.id === "utd");
            return sum + (bd ? bd.gross : 0);
          }, 0) || 0;
        const totalGrossSAR =
          results?.yearlyResults?.reduce((sum: number, r: any) => {
            const bd = r.breakdown.find((x: any) => x.id === "utd");
            return sum + (bd ? bd.grossSAR : 0);
          }, 0) || 0;

        const acv = getValue(totalGrossUSD, totalGrossSAR) / config.years;
        const monthlyPerUnit = acv / count / 12;
        analysisParts.push(
          `UTD: ${displayCurrency} ${monthlyPerUnit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /mo/physician`,
        );
      }
    }

    if (config.selectedProducts.includes("lxd")) {
      const count = config.productInputs["lxd"].count || 1;
      if (config.productInputs["lxd"].count > 0) {
        const totalGrossUSD =
          results?.yearlyResults?.reduce((sum: number, r: any) => {
            const bd = r.breakdown.find((x: any) => x.id === "lxd");
            return sum + (bd ? bd.gross : 0);
          }, 0) || 0;
        const totalGrossSAR =
          results?.yearlyResults?.reduce((sum: number, r: any) => {
            const bd = r.breakdown.find((x: any) => x.id === "lxd");
            return sum + (bd ? bd.grossSAR : 0);
          }, 0) || 0;

        const acv = getValue(totalGrossUSD, totalGrossSAR) / config.years;
        const monthlyPerUnit = acv / count / 12;
        analysisParts.push(
          `LXD: ${displayCurrency} ${monthlyPerUnit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /mo/bed`,
        );
      }
    }
    return analysisParts;
  }, [config, results]);

  const renewalNotes = useMemo(() => {
    if (config.dealType !== DealType.RENEWAL || !results) return [];

    const notes: string[] = [];
    const totalExpiringUSD = Object.values(config.productInputs).reduce(
      (sum, p) => sum + (p.expiringAmount || 0),
      0,
    );

    if (totalExpiringUSD > 0) {
      const customerACV = results.acvUSD;
      const pct1 = ((customerACV - totalExpiringUSD) / totalExpiringUSD) * 100;
      const pct1Text =
        pct1 > 0
          ? `${pct1.toFixed(1)}% more`
          : `${Math.abs(pct1).toFixed(1)}% less`;
      notes.push(
        `This renewal proposal is ${pct1Text} compared to current spend.`,
      );

      const y1GrossUSD = results.yearlyResults[0]?.grossUSD || 0;
      const pct2 = ((y1GrossUSD - totalExpiringUSD) / totalExpiringUSD) * 100;
      const pct2Text =
        pct2 >= 0
          ? `increase is ${pct2.toFixed(1)}%`
          : `decrease is ${Math.abs(pct2).toFixed(1)}%`;
      notes.push(`The first-year ${pct2Text} compared to current spend.`);
    }

    return notes;
  }, [config, results]);

  // Handlers
  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleInputChange = (
    id: string,
    field: keyof ProductInput,
    value: string | number | boolean,
  ) => {
    // EAI Activation Renewal Uplift sync
    // Auto-adjust UTD uplift field when variant or existingVariant changes in RENEWAL
    if (id === "utd" && dealType === DealType.RENEWAL && (field === "variant" || field === "existingVariant")) {
      const currentUtd = productInputs["utd"] || ({} as any);
      let ext = field === "existingVariant" ? (value as string) : (currentUtd.existingVariant || "");
      let tgt = field === "variant" ? (value as string) : (currentUtd.variant || "");

      if (field === "existingVariant") {
        if (typeof value === "string" && value.includes("UTDEE")) {
          tgt = value as string;
          setUtdRateVal(8);
        }
      }

      let newUplift = 8;
      if (ext !== "UTDEE" && tgt === "UTDEE") {
        newUplift = 11;
      } else if (ext === "UTDEE" && tgt === "UTDEE") {
        newUplift = 8;
      } else if (ext === "ANYWHERE" && tgt === "UTDADV") {
        newUplift = 8;
      }
      
      setRenewalUpliftUTD(newUplift);
      if (!showSplitRates) {
        setRenewalUpliftGlobal(newUplift);
      }
    }

    setProductInputs((prev) => {
      const prevInput = prev[id];
      const newState = {
        ...prev,
        [id]: {
          ...prevInput,
          [field]: value,
        },
      };

      // Auto-set educational discount to 20 if faculty >= 50
      if (id === "utd" && field === "facultyCount") {
        const numVal = Number(value) || 0;
        if (numVal >= 50) {
          newState["utd"].educationalDiscount = 20;
        }
      }

      // Removed 90 HC minimum for UTDEE, restriction is now based on $30k deal size

      // UTD SM Variant Check
      if (id === "utd" && field === "variant" && value === "SM") {
        if (newState["utd"].count > 499) {
          setNotification("UTD SM is not applicable for > 499 seats.");
          setTimeout(() => setNotification(null), 3000);
        }
      }

      // Auto-check/uncheck Apply WHT if stats change is toggled
      if (field === "changeInStats") {
        setApplyWHT(value === true);
      }

      // Reset logic when Existing Variant changes
      if (dealType === DealType.RENEWAL && field === "existingVariant") {
        if (typeof value === "string" && value.includes("UTDEE")) {
          newState[id].variant = value as string;
        } else {
          newState[id].variant = value as string;
        }

        // Also reset upgrade checkboxes
        newState[id].changeInStats = false;
        newState[id].forceHeadcountOverride = false;
      }

      // Rule: UTD-EE is only available for expiring value >= 15000 in Renewals
      if (id === "utd" && dealType === DealType.RENEWAL) {
        if (field === "expiringAmount" || field === "variant" || field === "existingVariant") {
           const expAmount = field === "expiringAmount" ? Number(value) : Number(newState.utd.expiringAmount || 0);
           const tgtVar = field === "variant" ? value : newState.utd.variant;
           const extVar = field === "existingVariant" ? value : newState.utd.existingVariant;
           
           if (tgtVar === "UTDEE" && extVar !== "UTDEE" && expAmount < 15000) {
              setNotification("UTD-EE is only available for expiring value ≥ $15,000");
              setTimeout(() => setNotification(null), 3000);
              // auto-revert to existing variant
              newState.utd.variant = extVar as string;
           }
        }
      }

      return newState;
    });
  };

  const handleInputBlur = (id: string, field: keyof ProductInput) => {
    setProductInputs((prev) => {
      const prevInput = prev[id];
      const newState = {
        ...prev,
        [id]: { ...prevInput },
      };

      if (id === "utd" && field === "count") {
        const currentCount = prevInput.count;
        // Removed 90 HC minimum for UTDEE fallback
        if (prevInput.variant === "SM" && currentCount > 499) {
          newState["utd"].variant = "UTDADV"; // Fallback to ADV
          setNotification(
            "Variant switched to UTD Advanced (UTD SM is not applicable for > 499 seats)",
          );
          setTimeout(() => setNotification(null), 3000);
        }
      }
      return newState;
    });
  };

  // Helper to determine allowed Target Variants based on Existing
  const getAllowedTargetVariants = (
    productId: string,
    existingVariant: string,
  ) => {
    if (productId === "utd") {
      if (existingVariant === "UTDEE") return ["UTDEE"];

      // Anywhere -> Anywhere, Adv, EE
      if (existingVariant === "ANYWHERE")
        return ["ANYWHERE", "UTDADV", "UTDEE"];
      // Adv -> Adv, EE
      if (existingVariant === "UTDADV") return ["UTDADV", "UTDEE"];
    }
    if (productId === "lxd") {
      if (existingVariant === "BASE PKG")
        return ["BASE PKG", "BASE PKG+FLINK", "BASE PKG+FLINK+IPE"];
      if (existingVariant === "BASE PKG+FLINK")
        return ["BASE PKG+FLINK", "BASE PKG+FLINK+IPE"];
      if (existingVariant === "BASE PKG+FLINK+IPE")
        return ["BASE PKG+FLINK+IPE"];

      if (existingVariant === "EE-Combo")
        return ["EE-Combo", "EE-Combo+FLINK", "EE-Combo+FLINK+IPE"];
      if (existingVariant === "EE-Combo+FLINK")
        return ["EE-Combo+FLINK", "EE-Combo+FLINK+IPE"];
      if (existingVariant === "EE-Combo+FLINK+IPE")
        return ["EE-Combo+FLINK+IPE"];

      if (existingVariant === "Seats")
        return ["Seats", "Seats+FLINK", "Seats+IPE", "Seats+FLINK+IPE"];
      if (existingVariant === "Seats+FLINK")
        return ["Seats+FLINK", "Seats+FLINK+IPE"];
      if (existingVariant === "Seats+IPE")
        return ["Seats+IPE", "Seats+FLINK+IPE"];
      if (existingVariant === "Seats+FLINK+IPE") return ["Seats+FLINK+IPE"];

      if (existingVariant === "Hospital Pharmacy Model")
        return ["Hospital Pharmacy Model"];

      return Object.keys(metadata?.lxdVariants || {}); // Fallback
    }
    return [existingVariant]; // Default
  };

  // Input Field Helper
  const renderRateInput = (
    label: string,
    value: number,
    onChange: (val: number) => void,
    suffixText: string = "Annual increase %",
    colorClass: string = "border-gray-300",
  ) => (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        {label}
      </label>
      <div className="flex items-center">
        <div
          className={`flex items-center border ${colorClass} dark:border-gray-600 rounded-2xl overflow-hidden bg-white dark:bg-gray-700 w-36 h-9`}
        >
          <button
            type="button"
            onClick={() => onChange(parseFloat(Math.max(0, value - 1).toFixed(1)))}
            className="w-9 h-full flex-shrink-0 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none"
          >
            -
          </button>
          <input
            type="number"
            step="0.1"
            value={value}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                onChange(0);
              } else {
                const parsed = parseFloat(val);
                if (!isNaN(parsed)) {
                  onChange(parsed);
                }
              }
            }}
            className="w-full h-full text-center text-sm p-0 bg-transparent text-gray-900 dark:text-white outline-none font-sans tabular-nums ph-no-capture"
            style={{ appearance: "textfield", MozAppearance: "textfield" }}
          />
          <button
            type="button"
            onClick={() => onChange(parseFloat((value + 1).toFixed(1)))}
            className="w-9 h-full flex-shrink-0 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none"
          >
            +
          </button>
        </div>
        <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
          {suffixText}
        </span>
      </div>
    </div>
  );

  // Label Logic for Annual Rate
  const getAnnualRateLabel = () => {
    if (showSplitRates && productMethods.utd !== productMethods.lxd)
      return "Annual Rates %";
    if (method === PricingMethod.MYPP) return "MYPP reverse discount %";
    if (dealType === DealType.RENEWAL) return "Annual Increase % (Year 2+)";
    return "Annual Increase %";
  };

  // Determine if rate inputs should be shown
  const isUtdRateVisible =
    dealType !== DealType.RENEWAL ||
    (showSplitRates
      ? productMethods.utd === PricingMethod.MYPP
      : method === PricingMethod.MYPP) ||
    applyAnnualRate;
  const isLxdRateVisible =
    dealType !== DealType.RENEWAL ||
    (showSplitRates
      ? productMethods.lxd === PricingMethod.MYPP
      : method === PricingMethod.MYPP) ||
    applyAnnualRate;
  const shouldShowAnnualRateInputs = isUtdRateVisible || isLxdRateVisible;


  return {

    isAuthenticated,
    setIsAuthenticated,
    isAuthChecked,
    setIsAuthChecked,
    userProfile,
    setUserProfile,
    isProfileModalOpen,
    setIsProfileModalOpen,
    isQuotesModalOpen,
    setIsQuotesModalOpen,
    isAdminModalOpen,
    setIsAdminModalOpen,
    isAdmin,
    setIsAdmin,
    customerName,
    setCustomerName,
    metadata,
    setMetadata,
    dealType,
    setDealType,
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
    selectedProductIds,
    setSelectedProductIds,
    years,
    setYears,
    isPartialYear,
    setIsPartialYear,
    partialMonths,
    setPartialMonths,
    method,
    setMethod,
    productMethods,
    setProductMethods,
    applyWHT,
    setApplyWHT,
    flatPricing,
    setFlatPricing,
    rounding,
    setRounding,
    notification,
    setNotification,
    currentStep,
    setCurrentStep,
    resetKey,
    setResetKey,
    isArchitectNotesOpen,
    setIsArchitectNotesOpen,
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
    useStartDate,
    setUseStartDate,
    startMonthYear,
    setStartMonthYear,
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
    setProductInputs,
    results,
    setResults,
    sarRate,
    handleLogin,
    handleLogout,
    handleDealTypeChange,
    isExtensionQuote,
    isMidCycleQuote,
    resetForm,
    maxPartialMonths,
    canYearsBeZero,
    minYears,
    uiGlobalSafeYears,
    showSplitRates,
    isIndirect,
    isDealContextComplete,
    isProductMixActive,
    isStructureActive,
    isCommercialScheduleActive,
    handleMethodChange,
    handleProductMethodChange,
    generateRateArray,
    loadConfig,
    config,
    extensionResults,
    isUtdExtensionVariant,
    defaultOptionBFPI,
    currentFpiVal,
    extensionRequiresFinanceApproval,
    utdEeWarning,
    monthlyCosts,
    renewalNotes,
    toggleProduct,
    handleInputChange,
    handleInputBlur,
    getAllowedTargetVariants,
    renderRateInput,
    getAnnualRateLabel,
    isUtdRateVisible,
    isLxdRateVisible,
    shouldShowAnnualRateInputs
  };
}
