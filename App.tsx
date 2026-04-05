import React, { useState, useEffect, useMemo } from 'react';
import posthog from 'posthog-js';
import Login from './components/Login';
import { Layout } from './components/Layout';
import { ExportSection } from './components/ExportSection';
import { calculatePricing } from './services/pricingEngine';
import { FormattedNumberInput } from './components/FormattedNumberInput';
import { 
  DealType, 
  ChannelType, 
  PricingMethod, 
  ProductInput, 
  DealConfiguration 
} from './types';
import { AVAILABLE_PRODUCTS, UTD_VARIANTS, LXD_VARIANTS, EXCHANGE_RATE_SAR } from './constants';

const formatCurrency = (amount: number, currency: 'USD' | 'SAR') => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }
  return `SAR ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)}`;
};

// Initialize PostHog outside the component so it runs immediately
if (typeof window !== 'undefined' && !(window as any).__POSTHOG_INITIALIZED__) {
  posthog.init('phc_CxbCQgNgpx8NLdaWIQcW92rCssMtanf6RZXGTeab0iC', {
    api_host: window.location.origin + '/p', // Use absolute URL for the proxy endpoint
    ui_host: 'https://eu.posthog.com', // Keep the UI host pointing to PostHog
    autocapture: false, // Disabled to prevent client rate limiting from rapid UI interactions
    capture_pageview: true, // Enable automatic pageview capture
    capture_pageleave: true // Track when users leave
  });
  (window as any).__POSTHOG_INITIALIZED__ = true;
}

const App: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated for the current month
    const currentMonth = new Date().toISOString().slice(0, 7);
    const authMonth = localStorage.getItem('wk_auth_month');
    const authName = localStorage.getItem('wk_auth_name');

    if (authMonth === currentMonth && authName) {
      setIsAuthenticated(true);
      posthog.identify(authName);
    }
  }, []);

  const handleLogin = (name: string) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    localStorage.setItem('wk_auth_month', currentMonth);
    localStorage.setItem('wk_auth_name', name);
    setIsAuthenticated(true);
    posthog.identify(name);
    posthog.capture('user_logged_in', { name });
  };

  const handleLogout = () => {
    localStorage.removeItem('wk_auth_month');
    localStorage.removeItem('wk_auth_name');
    setIsAuthenticated(false);
    posthog.reset();
  };

  // Idle timeout logic (10 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
      }, 10 * 60 * 1000); // 10 minutes
    };

    // Initialize timer
    resetTimer();

    // Event listeners for user activity
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [isAuthenticated]);

  // Deal State
  const [dealType, setDealType] = useState<DealType>(DealType.NEW_LOGO);
  const [channel, setChannel] = useState<ChannelType>(ChannelType.DIRECT);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [years, setYears] = useState<number>(3);
  const [method, setMethod] = useState<PricingMethod>(PricingMethod.MYFPI);
  const [productMethods, setProductMethods] = useState<Record<string, PricingMethod>>({ utd: PricingMethod.MYFPI, lxd: PricingMethod.MYFPI });
  const [applyWHT, setApplyWHT] = useState<boolean>(true); // Default true for KSA
  const [flatPricing, setFlatPricing] = useState<boolean>(false); 
  const [rounding, setRounding] = useState<boolean>(false); // New Rounding Option
  const [notification, setNotification] = useState<string | null>(null); // Notification State
  const [resetKey, setResetKey] = useState<number>(0); // Key to reset child components
  const [isArchitectNotesOpen, setIsArchitectNotesOpen] = useState<boolean>(false); // Accordion state
  
  // Extension Quote State
  const isExtensionQuote = dealType === DealType.EXTENSION;
  const [extensionOption, setExtensionOption] = useState<'A' | 'B'>('A');
  const [expiringTerm, setExpiringTerm] = useState<'multi' | 'single'>('multi');
  const [expiringTCV, setExpiringTCV] = useState<number>(0);
  const [currentSpend, setCurrentSpend] = useState<number>(0);
  const [extensionPercentage, setExtensionPercentage] = useState<number>(10);
  const [extensionFPI, setExtensionFPI] = useState<number | null>(null);
  const [extensionVariant, setExtensionVariant] = useState<string>('ANYWHERE');
  const [useFullExtension, setUseFullExtension] = useState<boolean>(false);

  // Start Date State
  const [useStartDate, setUseStartDate] = useState<boolean>(false);
  const [startMonthYear, setStartMonthYear] = useState<string>(new Date().toISOString().slice(0, 7));

  // Update useStartDate based on dealType
  useEffect(() => {
    if (dealType === DealType.RENEWAL || dealType === DealType.EXTENSION) {
      setUseStartDate(true);
    } else {
      setUseStartDate(false);
    }
  }, [dealType]);
  
  // Structure Rates (Multi-Year logic: FPI or Reverse Discount)
  const [applyAnnualRate, setApplyAnnualRate] = useState<boolean>(false); // Toggle for Renewal MYFPI
  const [globalRateVal, setGlobalRateVal] = useState<number>(5);
  const [utdRateVal, setUtdRateVal] = useState<number>(8); // Default 8%
  const [lxdRateVal, setLxdRateVal] = useState<number>(5);

  // Renewal Uplift Rates (Specific to Renewal Base Calculation)
  const [renewalUpliftGlobal, setRenewalUpliftGlobal] = useState<number>(5);
  const [renewalUpliftUTD, setRenewalUpliftUTD] = useState<number>(8);
  const [renewalUpliftLXD, setRenewalUpliftLXD] = useState<number>(5);

  // Product Inputs State
  const [productInputs, setProductInputs] = useState<Record<string, ProductInput>>({
    'utd': { count: 100, existingCount: 100, variant: 'ANYWHERE', existingVariant: 'ANYWHERE', baseDiscount: 0, expiringAmount: 0, dph: 0, forceHeadcountOverride: false, changeInStats: false },
    'lxd': { count: 50, existingCount: 50, variant: 'BASE PKG', existingVariant: 'BASE PKG', baseDiscount: 0, expiringAmount: 0, dph: 0, forceHeadcountOverride: false, changeInStats: false },
  });

  const resetForm = () => {
    setDealType(DealType.NEW_LOGO);
    setChannel(ChannelType.DIRECT);
    setSelectedProductIds([]);
    setYears(3);
    setMethod(PricingMethod.MYFPI);
    setProductMethods({ utd: PricingMethod.MYFPI, lxd: PricingMethod.MYFPI });
    setApplyWHT(true);
    setFlatPricing(false);
    setRounding(false);
    
    setExtensionOption('A');
    setExpiringTerm('multi');
    setExpiringTCV(0);
    setCurrentSpend(0);
    setExtensionPercentage(10);
    setExtensionFPI(null);
    setExtensionVariant('ANYWHERE');
    setUseFullExtension(false);
    setResetKey(prev => prev + 1);
    
    setStartMonthYear(new Date().toISOString().slice(0, 7));
    setApplyAnnualRate(false);
    setGlobalRateVal(5);
    setUtdRateVal(8);
    setLxdRateVal(5);
    setRenewalUpliftGlobal(5);
    setRenewalUpliftUTD(8);
    setRenewalUpliftLXD(5);
    
    setProductInputs({
      'utd': { count: 100, existingCount: 100, variant: 'ANYWHERE', existingVariant: 'ANYWHERE', baseDiscount: 0, expiringAmount: 0, dph: 0, forceHeadcountOverride: false, changeInStats: false },
      'lxd': { count: 50, existingCount: 50, variant: 'BASE PKG', existingVariant: 'BASE PKG', baseDiscount: 0, expiringAmount: 0, dph: 0, forceHeadcountOverride: false, changeInStats: false },
    });
  };

  // Check if we need split rates (if both UTD and LXD are selected)
  const showSplitRates = selectedProductIds.includes('utd') && selectedProductIds.includes('lxd');
  const isIndirect = channel !== ChannelType.DIRECT;

  // EFFECT: Auto-Uncheck WHT when Renewal is selected, force FULFILMENT for Extension
  useEffect(() => {
    if (dealType === DealType.RENEWAL) {
      setApplyWHT(false);
    } else {
      setApplyWHT(true);
    }

    if (dealType === DealType.EXTENSION) {
      setChannel(ChannelType.FULFILMENT);
    }
  }, [dealType]);

  // EFFECT: Set Default Rates when selection changes
  useEffect(() => {
    // Only apply defaults if one product is selected to avoid overwriting user preference aggressively
    if (selectedProductIds.length === 1) {
      if (selectedProductIds.includes('utd')) {
        // Structure Rates
        setGlobalRateVal(8);
        setUtdRateVal(8);
        // Uplift Rates
        setRenewalUpliftGlobal(8);
        setRenewalUpliftUTD(8);
      } else if (selectedProductIds.includes('lxd')) {
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
      if (selectedProductIds.includes('utd')) {
        setGlobalRateVal(8);
      } else if (selectedProductIds.includes('lxd')) {
        setGlobalRateVal(5);
      }
    }
  };

  const handleProductMethodChange = (productId: string, newMethod: PricingMethod) => {
    setProductMethods(prev => ({ ...prev, [productId]: newMethod }));
    if (newMethod === PricingMethod.MYPP) {
      if (productId === 'utd') setUtdRateVal(8);
      if (productId === 'lxd') setLxdRateVal(8);
    } else if (newMethod === PricingMethod.MYFPI) {
      if (productId === 'utd') setUtdRateVal(8);
      if (productId === 'lxd') setLxdRateVal(5);
    }
  };

  // Helper to generate rate array [val, val, val...]
  const generateRateArray = (val: number, count: number) => {
    const safeCount = Math.max(0, Math.floor(Number(count) || 0));
    return new Array(safeCount).fill(val);
  };

  // Derived Config
  const config: DealConfiguration = useMemo(() => {
    // Determine effective structure rates based on toggle
    // For MYFPI in Renewal, we check applyAnnualRate. For MYPP, we always apply the rate.
    const getEffRate = (prodId: string, val: number) => {
      const prodMethod = showSplitRates ? productMethods[prodId] : method;
      if (prodMethod === PricingMethod.MYPP) return val;
      if (dealType === DealType.RENEWAL && !applyAnnualRate) return 0;
      return val;
    };

    const effGlobal = getEffRate('global', globalRateVal); // 'global' is just a fallback, we'll use the method
    const effUtd = getEffRate('utd', utdRateVal);
    const effLxd = getEffRate('lxd', lxdRateVal);

    // Generate arrays based on effective single input values (Structure Rates)
    const rates = generateRateArray(effGlobal, years);
    const utdRates = generateRateArray(effUtd, years);
    const lxdRates = generateRateArray(effLxd, years);

    const productRates: Record<string, number[]> = {};
    if (showSplitRates) {
      productRates['utd'] = utdRates;
      productRates['lxd'] = lxdRates;
    } else {
      if (selectedProductIds.includes('utd')) productRates['utd'] = rates;
      if (selectedProductIds.includes('lxd')) productRates['lxd'] = rates;
    }

    // Renewal Uplifts
    // Allow independent Uplift Rate (Y1) vs Annual Rate (Y2+) for MYFPI
    const currentGlobalUplift = renewalUpliftGlobal;
    const currentUtdUplift = renewalUpliftUTD;
    const currentLxdUplift = renewalUpliftLXD;

    const renewalUpliftRates: Record<string, number> = {};
    if (showSplitRates) {
        renewalUpliftRates['utd'] = currentUtdUplift;
        renewalUpliftRates['lxd'] = currentLxdUplift;
    } else {
        if (selectedProductIds.includes('utd')) renewalUpliftRates['utd'] = currentGlobalUplift;
        if (selectedProductIds.includes('lxd')) renewalUpliftRates['lxd'] = currentGlobalUplift;
    }

    return {
      dealType,
      channel,
      selectedProducts: selectedProductIds,
      productInputs,
      years,
      method,
      productMethods,
      rates, 
      productRates,
      renewalUpliftRates,
      applyWHT,
      flatPricing,
      rounding,
      useStartDate,
      startMonthYear
    };
  }, [dealType, channel, selectedProductIds, productInputs, years, method, productMethods, globalRateVal, utdRateVal, lxdRateVal, renewalUpliftGlobal, renewalUpliftUTD, renewalUpliftLXD, showSplitRates, applyWHT, flatPricing, rounding, applyAnnualRate, useStartDate, startMonthYear]);

  // Results
  const results = useMemo(() => calculatePricing(config), [config]);

  // Extension Quote Logic
  const extensionResults = useMemo(() => {
    if (!isExtensionQuote) return null;

    const tcv = expiringTerm === 'multi' ? expiringTCV : currentSpend;
    const monthlyCost = currentSpend / 12;
    
    // Net Factor for Extension Quotes (Renewal + Indirect)
    let netFactor = 1.0;
    if (channel === ChannelType.FULFILMENT) netFactor = 0.95;
    if (channel === ChannelType.PARTNER_SOURCED) netFactor = 0.90;

    if (extensionOption === 'A') {
      const customerExtension = tcv * (extensionPercentage / 100);
      const monthsAvailable = monthlyCost > 0 ? customerExtension / monthlyCost : 0;
      let integerMonths = Math.floor(monthsAvailable);
      let nMonthsCost = integerMonths * monthlyCost;
      
      let fpiPercentage = 0;
      let endUserPrice = 0;
      let days = 0;
      let extraDays = 0;
      let percentageLess = 0;
      let percentageMore = 0;

      if (useFullExtension) {
        const expiringDays = expiringTerm === 'multi' ? 1095 : 365;
        const dailyCost = tcv / expiringDays;
        const exactDays = dailyCost > 0 ? customerExtension / dailyCost : 0;
        days = Math.floor(exactDays);
        integerMonths = Math.floor(days / 30);
        extraDays = days % 30;
        endUserPrice = customerExtension;
        
        percentageLess = tcv > 0 ? (integerMonths * monthlyCost) / tcv * 100 : 0;
        percentageMore = tcv > 0 ? ((integerMonths + 1) * monthlyCost) / tcv * 100 : 0;
      } else {
        if (extensionFPI !== null) {
          fpiPercentage = extensionFPI;
        } else {
          fpiPercentage = nMonthsCost > 0 ? ((customerExtension / nMonthsCost) - 1) * 100 : 0;
        }
        endUserPrice = nMonthsCost * (1 + (fpiPercentage / 100));
      }

      const netPrice = endUserPrice * netFactor;
      const commission = endUserPrice - netPrice;

      return {
        type: 'A' as const,
        variant: extensionVariant,
        customerTCV: tcv,
        extensionPercentage,
        customerExtension,
        currentSpend,
        monthlyCost,
        monthsAvailable,
        integerMonths,
        nMonthsCost,
        fpiPercentage,
        endUserPrice,
        commission,
        netPrice,
        useFullExtension,
        days,
        extraDays,
        percentageLess,
        percentageMore
      };
    } else {
      // Option B
      const maxSAR = 100000;
      const maxSARExVAT = maxSAR / 1.15; // 86956.52
      const monthlyCostSAR = monthlyCost * EXCHANGE_RATE_SAR;
      const monthsCovered = monthlyCostSAR > 0 ? Math.floor(maxSARExVAT / monthlyCostSAR) : 0;
      const endUserPrice = monthsCovered * monthlyCost;
      const netPrice = endUserPrice * netFactor;
      const commission = endUserPrice - netPrice;

      return {
        type: 'B' as const,
        variant: extensionVariant,
        currentSpend,
        monthlyCost,
        monthlyCostSAR,
        monthsCovered,
        maxSARExVAT,
        endUserPrice,
        commission,
        netPrice
      };
    }
  }, [isExtensionQuote, extensionOption, expiringTerm, expiringTCV, currentSpend, extensionPercentage, extensionFPI, channel, extensionVariant, useFullExtension]);

  // Validation Logic for UTDEE
  const utdEeWarning = useMemo(() => {
    if (selectedProductIds.includes('utd')) {
       const inputs = productInputs['utd'];
       if (inputs.variant === 'UTDEE') {
         // Check Year 1 Gross USD for UTD
         // We can find it in yearlyResults[0].breakdown
         const utdY1 = results.yearlyResults[0]?.breakdown.find(p => p.id === 'utd');
         if (utdY1 && utdY1.gross < 30000) {
           return "Warning: UTDEE deals under $30k/year require additional approval.";
         }
       }
    }
    return null;
  }, [results, selectedProductIds, productInputs]);


  // Calculate Monthly Costs for Architect Notes
  const monthlyCosts = useMemo(() => {
    const analysisParts: string[] = [];
    const isIndirect = config.channel !== ChannelType.DIRECT;
    const displayCurrency = isIndirect ? 'SAR' : 'USD';
    const getValue = (valUSD: number, valSAR: number) => isIndirect ? valSAR : valUSD;

    if (config.selectedProducts.includes('utd')) {
        const count = config.productInputs['utd'].count || 1; 
        if (config.productInputs['utd'].count > 0) {
            const totalGrossUSD = results.yearlyResults.reduce((sum, r) => {
                const bd = r.breakdown.find(x => x.id === 'utd');
                return sum + (bd ? bd.gross : 0);
            }, 0);
            const totalGrossSAR = results.yearlyResults.reduce((sum, r) => {
                const bd = r.breakdown.find(x => x.id === 'utd');
                return sum + (bd ? bd.grossSAR : 0);
            }, 0);

            const acv = getValue(totalGrossUSD, totalGrossSAR) / config.years;
            const monthlyPerUnit = acv / count / 12;
            analysisParts.push(`UTD: ${displayCurrency} ${monthlyPerUnit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /mo/physician`);
        }
    }

    if (config.selectedProducts.includes('lxd')) {
        const count = config.productInputs['lxd'].count || 1;
        if (config.productInputs['lxd'].count > 0) {
            const totalGrossUSD = results.yearlyResults.reduce((sum, r) => {
                const bd = r.breakdown.find(x => x.id === 'lxd');
                return sum + (bd ? bd.gross : 0);
            }, 0);
            const totalGrossSAR = results.yearlyResults.reduce((sum, r) => {
                const bd = r.breakdown.find(x => x.id === 'lxd');
                return sum + (bd ? bd.grossSAR : 0);
            }, 0);

            const acv = getValue(totalGrossUSD, totalGrossSAR) / config.years;
            const monthlyPerUnit = acv / count / 12;
            analysisParts.push(`LXD: ${displayCurrency} ${monthlyPerUnit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /mo/bed`);
        }
    }
    return analysisParts;
  }, [config, results]);


  // Handlers
  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleInputChange = (id: string, field: keyof ProductInput, value: string | number | boolean) => {
    setProductInputs(prev => {
      const prevInput = prev[id];
      const newState = {
        ...prev,
        [id]: {
          ...prevInput,
          [field]: value
        }
      };

      // Specific Logic: If UTD Variant becomes UTDEE, enforce min count 90
      if (id === 'utd' && field === 'variant' && value === 'UTDEE') {
         if (newState['utd'].count < 90) {
            newState['utd'].count = 90;
            setNotification("Headcount adjusted to 90 (Minimum for UTD EE)");
            setTimeout(() => setNotification(null), 3000);
         }
      }

      // UTD SM Variant Check
      if (id === 'utd' && field === 'variant' && value === 'SM') {
          if (newState['utd'].count > 499) {
             setNotification("UTD SM is not applicable for > 499 seats.");
             setTimeout(() => setNotification(null), 3000);
          }
      }
      
      // Auto-check/uncheck Apply WHT if stats change is toggled
      if (field === 'changeInStats') {
         setApplyWHT(value === true);
      }
      
      // Reset logic when Existing Variant changes
      if (dealType === DealType.RENEWAL && field === 'existingVariant') {
         // If existing changes, reset target variant to match existing initially
         // to avoid invalid combinations.
         // EXCEPTION: If Existing is UTDEE, Target must be UTDEE
         if (value === 'UTDEE') {
            newState[id].variant = 'UTDEE';
            if (id === 'utd') {
                setUtdRateVal(8); 
                setRenewalUpliftUTD(8);
            }
         } else {
            newState[id].variant = value as string;
         }

         // Also reset upgrade checkboxes
         newState[id].changeInStats = false;
         newState[id].forceHeadcountOverride = false;
      }

      return newState;
    });
  };

  const handleInputBlur = (id: string, field: keyof ProductInput) => {
    setProductInputs(prev => {
      const prevInput = prev[id];
      const newState = { 
        ...prev,
        [id]: { ...prevInput }
      };

      if (id === 'utd' && field === 'count') {
         const currentCount = prevInput.count;
         if (prevInput.variant === 'UTDEE' && currentCount < 90) {
            newState['utd'].variant = 'UTDADV';
            setNotification("Variant switched to UTD Advanced (UTD EE requires 90+ HC)");
            setTimeout(() => setNotification(null), 3000);
         }
         if (prevInput.variant === 'SM' && currentCount > 499) {
             newState['utd'].variant = 'UTDADV'; // Fallback to ADV
             setNotification("Variant switched to UTD Advanced (UTD SM is not applicable for > 499 seats)");
             setTimeout(() => setNotification(null), 3000);
         }
      }
      return newState;
    });
  };

  // Helper to determine allowed Target Variants based on Existing
  const getAllowedTargetVariants = (productId: string, existingVariant: string) => {
      if (productId === 'utd') {
          if (existingVariant === 'UTDEE') return ['UTDEE']; // Locked

          // Anywhere -> Anywhere, Adv, EE
          if (existingVariant === 'ANYWHERE') return ['ANYWHERE', 'UTDADV', 'UTDEE'];
          // Adv -> Adv, EE
          if (existingVariant === 'UTDADV') return ['UTDADV', 'UTDEE'];
      }
      if (productId === 'lxd') {
          if (existingVariant === 'BASE PKG') return ['BASE PKG', 'BASE PKG+FLINK', 'BASE PKG+FLINK+IPE'];
          if (existingVariant === 'BASE PKG+FLINK') return ['BASE PKG+FLINK', 'BASE PKG+FLINK+IPE'];
          if (existingVariant === 'BASE PKG+FLINK+IPE') return ['BASE PKG+FLINK+IPE'];
          
          if (existingVariant === 'EE-Combo') return ['EE-Combo', 'EE-Combo+FLINK', 'EE-Combo+FLINK+IPE'];
          if (existingVariant === 'EE-Combo+FLINK') return ['EE-Combo+FLINK', 'EE-Combo+FLINK+IPE'];
          if (existingVariant === 'EE-Combo+FLINK+IPE') return ['EE-Combo+FLINK+IPE'];

          // if (existingVariant === 'Seats') return ['Seats', 'Seats+FLINK', 'Seats+IPE', 'Seats+FLINK+IPE'];
          // if (existingVariant === 'Seats+FLINK') return ['Seats+FLINK', 'Seats+FLINK+IPE'];
          // if (existingVariant === 'Seats+IPE') return ['Seats+IPE', 'Seats+FLINK+IPE'];
          // if (existingVariant === 'Seats+FLINK+IPE') return ['Seats+FLINK+IPE'];

          if (existingVariant === 'Hospital Pharmacy Model') return ['Hospital Pharmacy Model'];
          
          return Object.keys(LXD_VARIANTS); // Fallback
      }
      return [existingVariant]; // Default
  };

  // Input Field Helper
  const renderRateInput = (
    label: string, 
    value: number, 
    onChange: (val: number) => void,
    suffixText: string = "Annual increase %",
    colorClass: string = "border-gray-300"
  ) => (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{label}</label>
      <div className="flex items-center">
        <FormattedNumberInput
          value={value}
          onChange={onChange}
          className={`w-24 text-sm rounded p-2 text-left bg-white dark:bg-gray-700 text-gray-900 dark:text-white border ${colorClass} dark:border-gray-600 focus:ring-2 focus:ring-blue-500 font-sans tabular-nums`}
        />
        <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
           {suffixText}
        </span>
      </div>
    </div>
  );

  // Label Logic for Annual Rate
  const getAnnualRateLabel = () => {
     if (showSplitRates && productMethods.utd !== productMethods.lxd) return "Annual Rates %";
     if (method === PricingMethod.MYPP) return "Annual Reverse Discount %";
     if (dealType === DealType.RENEWAL) return "Annual Increase % (Year 2+)";
     return "Annual Increase %";
  };

  // Determine if rate inputs should be shown
  const isUtdRateVisible = dealType !== DealType.RENEWAL || (showSplitRates ? productMethods.utd === PricingMethod.MYPP : method === PricingMethod.MYPP) || applyAnnualRate;
  const isLxdRateVisible = dealType !== DealType.RENEWAL || (showSplitRates ? productMethods.lxd === PricingMethod.MYPP : method === PricingMethod.MYPP) || applyAnnualRate;
  const shouldShowAnnualRateInputs = isUtdRateVisible || isLxdRateVisible;

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout>
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-lg animate-fade-in-down">
          <p className="font-bold">Notice</p>
          <p>{notification}</p>
        </div>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Configuration */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Section 1: Deal Basics */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-5 border border-gray-100 dark:border-gray-700 transition-colors">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">1. Deal Context</h2>
              <button
                onClick={resetForm}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium px-2 py-1 border border-red-200 dark:border-red-800 rounded bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              >
                Reset Form
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Type</label>
                <select 
                  className="mt-1 block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={dealType}
                  onChange={(e) => setDealType(e.target.value as DealType)}
                >
                  <option value={DealType.NEW_LOGO}>New Logo</option>
                  <option value={DealType.RENEWAL}>Renewal</option>
                  <option value={DealType.EXTENSION}>Extension</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Channel</label>
                <select 
                  className="mt-1 block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as ChannelType)}
                >
                  <option value={ChannelType.DIRECT} disabled={isExtensionQuote}>Direct (USD)</option>
                  <option value={ChannelType.FULFILMENT}>Fulfilment (SAR)</option>
                  <option value={ChannelType.PARTNER_SOURCED}>Partner Sourced (SAR)</option>
                </select>
              </div>
            </div>
            {isExtensionQuote && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded text-xs text-yellow-800 dark:text-yellow-200">
                  <strong>Note:</strong> RL and Finance approvals are required for Extension Quotes.
                </div>
              </div>
            )}
          </div>

          {/* Extension Quote Configuration */}
          {isExtensionQuote && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-5 border border-gray-100 dark:border-gray-700 transition-colors">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Extension Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Option</label>
                  <select
                    className="block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={extensionOption}
                    onChange={(e) => setExtensionOption(e.target.value as 'A' | 'B')}
                  >
                    <option value="A">Option A (% of TCV)</option>
                    <option value="B">Option B (Specific Months under 100k SAR)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Variant</label>
                  <select
                    className="block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={extensionVariant}
                    onChange={(e) => setExtensionVariant(e.target.value)}
                  >
                    {Object.keys(UTD_VARIANTS).map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                    {Object.keys(LXD_VARIANTS).map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                {extensionOption === 'A' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Expiring Term</label>
                    <select
                      className="block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      value={expiringTerm}
                      onChange={(e) => setExpiringTerm(e.target.value as 'multi' | 'single')}
                    >
                      <option value="multi">Multi-Year</option>
                      <option value="single">Single Year</option>
                    </select>
                  </div>
                )}

                {extensionOption === 'A' && expiringTerm === 'multi' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Customer TCV (USD)</label>
                    <FormattedNumberInput
                      value={expiringTCV}
                      onChange={setExpiringTCV}
                      className="block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Current Spend (Exit Year) (USD)</label>
                  <FormattedNumberInput
                    value={currentSpend}
                    onChange={setCurrentSpend}
                    className="block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums"
                  />
                </div>

                {extensionOption === 'A' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Extension Percentage (%)</label>
                    <FormattedNumberInput
                      value={extensionPercentage}
                      onChange={setExtensionPercentage}
                      className="block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums"
                    />
                  </div>
                )}
                
                {extensionOption === 'A' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Difference to Extension (FPI %)</label>
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <FormattedNumberInput
                          value={extensionFPI !== null ? extensionFPI : (extensionResults?.type === 'A' ? Number(extensionResults.fpiPercentage.toFixed(2)) : 0)}
                          onChange={setExtensionFPI}
                          className="block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 pr-6 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums"
                          disabled={useFullExtension}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">%</span>
                      </div>
                      <button
                        onClick={() => setExtensionFPI(null)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        disabled={useFullExtension}
                      >
                        Auto
                      </button>
                    </div>
                  </div>
                )}

                {extensionOption === 'A' && (
                  <div className="flex items-center mt-2">
                    <input
                      id="use-full-extension-checkbox"
                      type="checkbox"
                      checked={useFullExtension}
                      onChange={(e) => setUseFullExtension(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="use-full-extension-checkbox" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Use full extension
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {!isExtensionQuote && (
            <>
              {/* Section 2: Products & Inputs */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-5 border border-gray-100 dark:border-gray-700 transition-colors">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-4">2. Product Mix</h2>
            <div className="space-y-4">
              {AVAILABLE_PRODUCTS.map(product => {
                const isSelected = selectedProductIds.includes(product.id);
                const input = productInputs[product.id] || { count: 0, variant: '', baseDiscount: 0 };
                
                // Logic for disabling LXD variants if UTD is ANYWHERE or UTDADV
                const isUTDSelected = selectedProductIds.includes('utd');
                const currentUTDVariant = productInputs['utd']?.variant;
                const isRestrictedUTD = isUTDSelected && (currentUTDVariant === 'ANYWHERE' || currentUTDVariant === 'UTDADV');
                
                // Logic for disabling Base Discount on LXD if UTD EE + LXD EE-Combo is selected
                const isUTDEE = isUTDSelected && currentUTDVariant === 'UTDEE';
                const isLXDComboVariant = product.id === 'lxd' && input.variant.includes('EE-Combo');
                const shouldDisableLXDDiscount = isUTDEE && isLXDComboVariant;

                // Rename discount label if split rates (Combo) are active for LXD
                const discountLabel = (product.id === 'lxd' && isUTDSelected) ? 'Combo Discount %' : 'Base Discount %';

                // RENEWAL SPECIFIC LOGIC
                const isRenewal = dealType === DealType.RENEWAL;
                const dphValue = input.dph || 0;
                const usageValue = dphValue > 0 && input.expiringAmount ? (input.expiringAmount / dphValue) : 0;
                
                // --- Upsell Logic Checks ---
                const existingVariant = input.existingVariant || input.variant;
                const targetVariant = input.variant;

                // UTD Stats Change Check (Enable for any UTD renewal)
                const showStatsCheckbox = isRenewal && product.id === 'utd';

                // LXD Addon Check
                const isLXDAddonUpgrade = isRenewal && product.id === 'lxd' && existingVariant !== targetVariant;
                
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
                    if (product.id === 'lxd') {
                        isCountDisabled = false;
                    }
                }

                // Variants Filtering
                const allowedTargetVariants = isRenewal 
                   ? getAllowedTargetVariants(product.id, existingVariant) 
                   : (product.id === 'utd' ? Object.keys(UTD_VARIANTS) : Object.keys(LXD_VARIANTS));

                const isUTDSM = product.id === 'utd' && input.variant === 'SM';
                const isLXDSeats = product.id === 'lxd' && (input.variant.includes('Seats') || input.variant === 'Hospital Pharmacy Model');

                return (
                  <div key={product.id} className={`border rounded-md transition-colors ${isSelected ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700'}`}>
                    {/* Header Row */}
                    <div className="flex items-center p-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleProduct(product.id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-500"
                      />
                      <span className={`ml-3 text-sm font-medium ${isSelected ? 'text-blue-900 dark:text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                        {product.name}
                      </span>
                    </div>
                    
                    {/* Expanded Input Row */}
                    {isSelected && (
                      <div className="px-3 pb-3 pt-0 border-t border-blue-100 dark:border-blue-800 mt-1 grid grid-cols-1 gap-3">
                        <div className="grid grid-cols-2 gap-3 mt-2">
                           
                           {/* Renewal: Expiring Amount (Primary) */}
                           {isRenewal && (
                             <div className="col-span-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded">
                               <label className="block text-xs text-orange-700 dark:text-orange-400 font-semibold mb-1">Expiring Amount (USD)</label>
                               <FormattedNumberInput
                                 value={input.expiringAmount || 0}
                                 onChange={(val) => handleInputChange(product.id, 'expiringAmount', val)}
                                 className="block w-full text-xs border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-orange-500 focus:border-orange-500 border p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums"
                               />
                               {/* Restored DPH Fields for UTD */}
                               {product.id === 'utd' && (
                                 <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div>
                                        <label className="block text-[10px] text-gray-500 dark:text-gray-400 uppercase">DPH</label>
                                        <FormattedNumberInput
                                          value={input.dph || 0}
                                          onChange={(val) => handleInputChange(product.id, 'dph', val)}
                                          placeholder="0.00"
                                          className="block w-full text-xs border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-blue-500 border p-1 bg-white dark:bg-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 dark:text-gray-400 uppercase">Usage (Auto)</label>
                                        <div className="text-xs p-1 bg-gray-100 dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-500 font-sans tabular-nums">
                                          {Math.round(usageValue).toLocaleString()}
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
                                   <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Existing Variant</label>
                                   <select
                                     className="block w-full text-xs border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-gray-500 border p-1 bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white"
                                     value={input.existingVariant || input.variant}
                                     onChange={(e) => handleInputChange(product.id, 'existingVariant', e.target.value)}
                                   >
                                      {product.id === 'utd' && Object.keys(UTD_VARIANTS).map(v => (
                                         <option key={v} value={v}>{v}</option>
                                      ))}
                                      {product.id === 'lxd' && Object.keys(LXD_VARIANTS).map(v => {
                                         if(v.includes('EE-Combo')) return null; 
                                         return <option key={v} value={v}>{v}</option>;
                                      })}
                                   </select>
                               </div>
                               <div>
                                   <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Existing Stats</label>
                                   <FormattedNumberInput
                                     value={input.existingCount || 0}
                                     onChange={(val) => handleInputChange(product.id, 'existingCount', val)}
                                     className="block w-full text-xs border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-gray-500 border p-1 bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white"
                                   />
                               </div>
                             </div>
                           )}

                           {/* Target Variant Selector */}
                           {product.hasVariants ? (
                             <div className="col-span-2">
                               <label className="block text-xs text-blue-700 dark:text-blue-300 mb-1">
                                  {isRenewal ? "Target Upgrade Variant" : "Variant"}
                               </label>
                               <select
                                 className="block w-full text-xs border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                 value={input.variant}
                                 disabled={isRenewal && existingVariant === 'UTDEE' && product.id === 'utd'}
                                 onChange={(e) => handleInputChange(product.id, 'variant', e.target.value)}
                               >
                                 {allowedTargetVariants.map(v => {
                                   let price = 0;
                                   if (product.id === 'utd') price = UTD_VARIANTS[v];
                                   if (product.id === 'lxd') price = LXD_VARIANTS[v];
                                   
                                   // Specific filtering for Combo logic in New Logo context (unchanged)
                                   if (!isRenewal && product.id === 'lxd' && v.includes('EE-Combo') && isRestrictedUTD) {
                                      return <option key={v} value={v} disabled>{v} (Requires UTD EE)</option>;
                                   }

                                   return <option key={v} value={v}>{v}{price > 0 ? ` ($${price})` : ''}</option>;
                                 })}
                               </select>
                             </div>
                           ) : (
                             <div className="col-span-2 text-xs text-gray-400 italic mt-1">Standard pricing applied</div>
                           )}
                           
                           {/* UTD EE Upgrade Checkbox */}
                           {showStatsCheckbox && (
                             <div className="col-span-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 p-2 rounded flex items-center">
                                <input 
                                  type="checkbox"
                                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                  checked={input.changeInStats || false}
                                  onChange={(e) => handleInputChange(product.id, 'changeInStats', e.target.checked)}
                                />
                                <span className="ml-2 text-xs text-purple-700 dark:text-purple-300 font-medium">
                                   Switching or changing stats?
                                </span>
                             </div>
                           )}

                           {/* Count Input (HC/BC) */}
                           {product.countLabel && (
                             <div>
                               <label className={`block text-xs mb-1 ${isCountDisabled ? 'text-gray-400' : 'text-blue-700 dark:text-blue-300'}`}>
                                 {/* Rename label if stats change */}
                                 {(isUTDSM || isLXDSeats) ? "Seats" : ((showStatsCheckbox && input.changeInStats) ? "New Stats" : product.countLabel)} 
                                 {isCountDisabled && ' (Ignored)'}
                               </label>
                               <FormattedNumberInput
                                 value={input.count}
                                 onChange={(val) => handleInputChange(product.id, 'count', val)}
                                 onBlur={() => handleInputBlur(product.id, 'count')}
                                 disabled={isCountDisabled}
                                 className={`block w-full text-xs border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums ${isCountDisabled ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}`}
                               />
                             </div>
                           )}

                           {/* Discount Input */}
                           <div className={product.countLabel ? '' : 'col-span-2'}>
                             <label className="block text-xs text-blue-700 dark:text-blue-300 mb-1">{discountLabel}</label>
                             <input
                               type="number"
                               min="0"
                               max="100"
                               disabled={shouldDisableLXDDiscount}
                               className={`block w-full text-xs border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums ph-no-capture ${shouldDisableLXDDiscount ? 'opacity-50 cursor-not-allowed' : ''}`}
                               value={input.baseDiscount}
                               onChange={(e) => handleInputChange(product.id, 'baseDiscount', parseFloat(e.target.value) || 0)}
                             />
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Multi-Year */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-5 border border-gray-100 dark:border-gray-700 transition-colors">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-4">3. Structure</h2>
            <div className="space-y-4">
               {/* WHT Checkbox */}
               <div className="flex items-center justify-between">
                 <div className="flex items-center">
                    <input 
                      id="wht-checkbox"
                      type="checkbox" 
                      checked={applyWHT} 
                      onChange={(e) => setApplyWHT(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="wht-checkbox" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Apply WHT (Gross Up)
                    </label>
                 </div>
               </div>

               <div className="flex space-x-4">
                 <div className="w-1/3">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Duration</label>
                    <input 
                      type="number" min="1" max="7" 
                      value={years} 
                      onChange={(e) => setYears(parseInt(e.target.value))}
                      className="mt-1 block w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums ph-no-capture"
                    />
                 </div>
                 <div className="w-2/3">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Method</label>
                    {showSplitRates ? (
                      <div className="flex flex-col space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-700 dark:text-gray-300 w-12">UTD:</span>
                          <div className="flex items-center space-x-3">
                             <label className="inline-flex items-center">
                               <input type="radio" className="form-radio h-4 w-4 text-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600" 
                                 checked={productMethods.utd === PricingMethod.MYFPI}
                                 onChange={() => handleProductMethodChange('utd', PricingMethod.MYFPI)}
                               />
                               <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">MYFPI</span>
                             </label>
                             <label className="inline-flex items-center">
                               <input type="radio" className="form-radio h-4 w-4 text-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600"
                                 checked={productMethods.utd === PricingMethod.MYPP}
                                 onChange={() => handleProductMethodChange('utd', PricingMethod.MYPP)}
                               />
                               <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">MYPP</span>
                             </label>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-700 dark:text-gray-300 w-12">LXD:</span>
                          <div className="flex items-center space-x-3">
                             <label className="inline-flex items-center">
                               <input type="radio" className="form-radio h-4 w-4 text-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600" 
                                 checked={productMethods.lxd === PricingMethod.MYFPI}
                                 onChange={() => handleProductMethodChange('lxd', PricingMethod.MYFPI)}
                               />
                               <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">MYFPI</span>
                             </label>
                             <label className="inline-flex items-center">
                               <input type="radio" className="form-radio h-4 w-4 text-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600"
                                 checked={productMethods.lxd === PricingMethod.MYPP}
                                 onChange={() => handleProductMethodChange('lxd', PricingMethod.MYPP)}
                               />
                               <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">MYPP</span>
                             </label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3 mt-2">
                         <label className="inline-flex items-center">
                           <input type="radio" className="form-radio h-4 w-4 text-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600" 
                             checked={method === PricingMethod.MYFPI}
                             onChange={() => handleMethodChange(PricingMethod.MYFPI)}
                           />
                           <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">MYFPI</span>
                         </label>
                         <label className="inline-flex items-center">
                           <input type="radio" className="form-radio h-4 w-4 text-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600"
                             checked={method === PricingMethod.MYPP}
                             onChange={() => handleMethodChange(PricingMethod.MYPP)}
                           />
                           <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">MYPP</span>
                         </label>
                      </div>
                    )}
                 </div>
               </div>
               
               {/* Renewal Uplift Rate (Specific for Renewal Base) - Show for ALL Renewals */}
               {dealType === DealType.RENEWAL && (
                 <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                      Renewal Uplift % (Year 1)
                    </div>
                    {showSplitRates ? (
                      <>
                        {renderRateInput("UTD Uplift", renewalUpliftUTD, setRenewalUpliftUTD, "Uplift %", "border-blue-200 dark:border-blue-800")}
                        {renderRateInput("LXD Uplift", renewalUpliftLXD, setRenewalUpliftLXD, "Uplift %", "border-green-200 dark:border-green-800")}
                      </>
                    ) : (
                      renderRateInput("Uplift", renewalUpliftGlobal, setRenewalUpliftGlobal, "Uplift %")
                    )}
                 </div>
               )}

               {/* Annual Rate Logic */}
               <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                  {/* Conditional Checkbox for Renewal MYFPI */}
                  {dealType === DealType.RENEWAL && (method === PricingMethod.MYFPI || (showSplitRates && (productMethods.utd === PricingMethod.MYFPI || productMethods.lxd === PricingMethod.MYFPI))) && (
                     <div className="flex items-center mb-4">
                        <input
                           id="apply-annual-rate"
                           type="checkbox"
                           checked={applyAnnualRate}
                           onChange={(e) => setApplyAnnualRate(e.target.checked)}
                           className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white dark:bg-gray-700 dark:border-gray-600"
                        />
                        <label htmlFor="apply-annual-rate" className="ml-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                           Apply Annual Increase for Year 2+?
                        </label>
                     </div>
                  )}

                  {/* Render Inputs if condition met */}
                  {shouldShowAnnualRateInputs && (
                      <>
                        <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                            {getAnnualRateLabel()}
                        </div>
                        {showSplitRates ? (
                            <>
                              {isUtdRateVisible && renderRateInput("UTD Rate", utdRateVal, setUtdRateVal, productMethods.utd === PricingMethod.MYPP ? "Reverse %" : "Annual %", "border-blue-200 dark:border-blue-800")}
                              {isLxdRateVisible && renderRateInput("LXD Rate", lxdRateVal, setLxdRateVal, productMethods.lxd === PricingMethod.MYPP ? "Reverse %" : "Annual %", "border-green-200 dark:border-green-800")}
                            </>
                          ) : (
                            isUtdRateVisible && renderRateInput("Rate", globalRateVal, setGlobalRateVal, method === PricingMethod.MYPP ? "Reverse %" : "Annual %")
                        )}
                        
                        {/* Exception Form Alert */}
                        {(() => {
                            let showExceptionAlert = false;
                            if (showSplitRates) {
                                if (productMethods.utd === PricingMethod.MYPP) {
                                    if (utdRateVal < 8 || utdRateVal > 25) showExceptionAlert = true;
                                } else if (productMethods.utd === PricingMethod.MYFPI) {
                                    if (utdRateVal < 8) showExceptionAlert = true;
                                }
                                
                                if (productMethods.lxd === PricingMethod.MYPP) {
                                    if (lxdRateVal < 8 || lxdRateVal > 25) showExceptionAlert = true;
                                } else if (productMethods.lxd === PricingMethod.MYFPI) {
                                    if (lxdRateVal < 5) showExceptionAlert = true;
                                }
                            } else {
                                if (method === PricingMethod.MYPP) {
                                    if (globalRateVal < 8 || globalRateVal > 25) showExceptionAlert = true;
                                } else if (method === PricingMethod.MYFPI) {
                                    if (selectedProductIds.includes('utd') && globalRateVal < 8) showExceptionAlert = true;
                                    if (selectedProductIds.includes('lxd') && !selectedProductIds.includes('utd') && globalRateVal < 5) showExceptionAlert = true;
                                }
                            }
                            
                            if (showExceptionAlert) {
                                return (
                                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700 font-medium">
                                        Exception Form is required for this discount
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* MYPP Threshold Alert */}
                        {(() => {
                            const y1Breakdown = results.yearlyResults[0]?.breakdown || [];
                            const alerts = [];
                            
                            if (showSplitRates) {
                                if (productMethods.utd === PricingMethod.MYPP) {
                                    const utdY1 = y1Breakdown.find(p => p.id === 'utd')?.net || 0;
                                    if (utdY1 < 10000) alerts.push("UTD MYPP requires $10,000 minimum Y1 value. Reverted to MYFPI.");
                                }
                                if (productMethods.lxd === PricingMethod.MYPP) {
                                    const lxdY1 = y1Breakdown.find(p => p.id === 'lxd')?.net || 0;
                                    if (lxdY1 < 10000) alerts.push("LXD MYPP requires $10,000 minimum Y1 value. Reverted to MYFPI.");
                                }
                            } else {
                                if (method === PricingMethod.MYPP) {
                                    selectedProductIds.forEach(pid => {
                                        const y1 = y1Breakdown.find(p => p.id === pid)?.net || 0;
                                        if (y1 < 10000) {
                                            const name = AVAILABLE_PRODUCTS.find(p => p.id === pid)?.shortName || pid.toUpperCase();
                                            alerts.push(`${name} MYPP requires $10,000 minimum Y1 value. Reverted to MYFPI.`);
                                        }
                                    });
                                }
                            }
                            
                            if (alerts.length > 0) {
                                return (
                                    <div className="mt-2 space-y-1">
                                        {alerts.map((alert, idx) => (
                                            <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-medium">
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
               {years > 1 && (
                 <div className="mt-4">
                    <div className="flex items-center">
                        <input 
                          id="flat-pricing-checkbox"
                          type="checkbox" 
                          checked={flatPricing} 
                          onChange={(e) => setFlatPricing(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white dark:bg-gray-700 dark:border-gray-600"
                        />
                        <label htmlFor="flat-pricing-checkbox" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Flat Pricing
                        </label>
                    </div>
                    {flatPricing && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 font-medium">
                            This option requires RL and Finance approvals
                        </div>
                    )}
                 </div>
               )}

               {/* Rounding Checkbox */}
               <div className="flex items-center mt-2">
                  <input 
                    id="rounding-checkbox"
                    type="checkbox" 
                    checked={rounding} 
                    onChange={(e) => setRounding(e.target.checked)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded bg-white dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="rounding-checkbox" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Round up prices?
                  </label>
               </div>
            </div>
            </div>
            </>
          )}
        </div>

        {/* Right Column: Output */}
        <div className="xl:col-span-2 space-y-6 xl:sticky xl:top-24 h-fit">
          
          {isExtensionQuote && extensionResults && (
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Extension Quote Results</h3>
                <div className="text-xs font-sans tabular-nums text-gray-500 dark:text-gray-400">
                  1 USD = {EXCHANGE_RATE_SAR} SAR
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {extensionResults.type === 'A' && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">Extension Value</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">{formatCurrency(extensionResults.customerExtension, 'USD')}</div>
                      </div>
                      {extensionResults.useFullExtension ? (
                        <>
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 col-span-3">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs text-blue-600 dark:text-blue-400 uppercase font-sans">Extension Duration</div>
                              <div className="flex space-x-2">
                                <button 
                                  onClick={() => {
                                    const targetMonths = Math.max(1, extensionResults.integerMonths - (extensionResults.extraDays === 0 ? 1 : 0));
                                    const newPercentage = extensionResults.customerTCV > 0 ? (targetMonths * extensionResults.monthlyCost) / extensionResults.customerTCV * 100 : 0;
                                    setExtensionPercentage(newPercentage);
                                  }}
                                  className="p-1 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 rounded text-blue-700 dark:text-blue-200 transition-colors"
                                  title="Previous Month"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                                </button>
                                <button 
                                  onClick={() => {
                                    const targetMonths = extensionResults.integerMonths + 1;
                                    const newPercentage = extensionResults.customerTCV > 0 ? (targetMonths * extensionResults.monthlyCost) / extensionResults.customerTCV * 100 : 0;
                                    setExtensionPercentage(newPercentage);
                                  }}
                                  className="p-1 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 rounded text-blue-700 dark:text-blue-200 transition-colors"
                                  title="Next Month"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                </button>
                              </div>
                            </div>
                            <div className="text-xl font-bold text-blue-700 dark:text-blue-300 font-sans">
                              {extensionResults.days} days - equivalent to {extensionResults.integerMonths} months and {extensionResults.extraDays} days
                            </div>
                            <div className="text-sm text-blue-600 dark:text-blue-400 mt-2 space-y-2">
                              <div className="flex items-center justify-between">
                                <span>{extensionResults.integerMonths} months = {extensionResults.percentageLess?.toFixed(2)}% of TCV</span>
                                <button 
                                  onClick={() => setExtensionPercentage(extensionResults.percentageLess || 0)}
                                  className="text-xs bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-200 px-2 py-1 rounded transition-colors"
                                >
                                  Use {extensionResults.percentageLess?.toFixed(2)}%
                                </button>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>{extensionResults.integerMonths + 1} months = {extensionResults.percentageMore?.toFixed(2)}% of TCV</span>
                                <button 
                                  onClick={() => setExtensionPercentage(extensionResults.percentageMore || 0)}
                                  className="text-xs bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-200 px-2 py-1 rounded transition-colors"
                                >
                                  Use {extensionResults.percentageMore?.toFixed(2)}%
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">Available Months</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">{extensionResults.monthsAvailable.toFixed(2)}</div>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                            <div className="text-xs text-blue-600 dark:text-blue-400 uppercase font-sans">Extension Months</div>
                            <div className="text-xl font-bold text-blue-700 dark:text-blue-300 font-sans">{extensionResults.integerMonths}</div>
                          </div>
                          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800">
                            <div className="text-xs text-purple-600 dark:text-purple-400 uppercase font-sans">FPI %</div>
                            <div className="text-xl font-bold text-purple-700 dark:text-purple-300 font-sans">{extensionResults.fpiPercentage?.toFixed(2) || '0.00'}%</div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3 font-sans">Pricing Breakdown</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-gray-800 p-4 shadow rounded-lg border-l-4 border-blue-500 dark:border-blue-400">
                          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">End-User Price</div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">{formatCurrency(extensionResults.endUserPrice, 'USD')}</div>
                          {isIndirect && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <div>SAR: {formatCurrency(extensionResults.endUserPrice * EXCHANGE_RATE_SAR, 'SAR')}</div>
                              <div>VAT (15%): {formatCurrency(extensionResults.endUserPrice * EXCHANGE_RATE_SAR * 0.15, 'SAR')}</div>
                              <div className="font-bold text-gray-700 dark:text-gray-300">Total: {formatCurrency(extensionResults.endUserPrice * EXCHANGE_RATE_SAR * 1.15, 'SAR')}</div>
                            </div>
                          )}
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 shadow rounded-lg border-l-4 border-orange-500 dark:border-orange-400">
                          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">Reseller Fees</div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">{formatCurrency(extensionResults.commission, 'USD')}</div>
                          {isIndirect && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <div>SAR: {formatCurrency(extensionResults.commission * EXCHANGE_RATE_SAR, 'SAR')}</div>
                              <div>VAT (15%): {formatCurrency(extensionResults.commission * EXCHANGE_RATE_SAR * 0.15, 'SAR')}</div>
                              <div className="font-bold text-gray-700 dark:text-gray-300">Total: {formatCurrency(extensionResults.commission * EXCHANGE_RATE_SAR * 1.15, 'SAR')}</div>
                            </div>
                          )}
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-700 p-4 shadow rounded-lg border-l-4 border-gray-500 dark:border-gray-400">
                          <div className="text-xs text-gray-500 dark:text-gray-300 uppercase font-sans">Net Price</div>
                          <div className="text-lg font-bold text-gray-700 dark:text-gray-100 font-sans">{formatCurrency(extensionResults.netPrice, 'USD')}</div>
                          {isIndirect && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <div>SAR: {formatCurrency(extensionResults.netPrice * EXCHANGE_RATE_SAR, 'SAR')}</div>
                              <div>VAT (15%): {formatCurrency(extensionResults.netPrice * EXCHANGE_RATE_SAR * 0.15, 'SAR')}</div>
                              <div className="font-bold text-gray-700 dark:text-gray-300">Total: {formatCurrency(extensionResults.netPrice * EXCHANGE_RATE_SAR * 1.15, 'SAR')}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {extensionResults.type === 'B' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">Monthly Cost (SAR)</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">{formatCurrency(extensionResults.monthlyCostSAR, 'SAR')}</div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="text-xs text-blue-600 dark:text-blue-400 uppercase font-sans">Eligible Months (&lt;100k SAR)</div>
                        <div className="text-xl font-bold text-blue-700 dark:text-blue-300 font-sans">{extensionResults.monthsCovered}</div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3 font-sans">Pricing Breakdown (for {extensionResults.monthsCovered} months)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-gray-800 p-4 shadow rounded-lg border-l-4 border-blue-500 dark:border-blue-400">
                          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">End-User Price</div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">{formatCurrency(extensionResults.endUserPrice, 'USD')}</div>
                          {isIndirect && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <div>SAR: {formatCurrency(extensionResults.endUserPrice * EXCHANGE_RATE_SAR, 'SAR')}</div>
                              <div>VAT (15%): {formatCurrency(extensionResults.endUserPrice * EXCHANGE_RATE_SAR * 0.15, 'SAR')}</div>
                              <div className="font-bold text-gray-700 dark:text-gray-300">Total: {formatCurrency(extensionResults.endUserPrice * EXCHANGE_RATE_SAR * 1.15, 'SAR')}</div>
                            </div>
                          )}
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 shadow rounded-lg border-l-4 border-orange-500 dark:border-orange-400">
                          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">Reseller Fees</div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">{formatCurrency(extensionResults.commission, 'USD')}</div>
                          {isIndirect && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <div>SAR: {formatCurrency(extensionResults.commission * EXCHANGE_RATE_SAR, 'SAR')}</div>
                              <div>VAT (15%): {formatCurrency(extensionResults.commission * EXCHANGE_RATE_SAR * 0.15, 'SAR')}</div>
                              <div className="font-bold text-gray-700 dark:text-gray-300">Total: {formatCurrency(extensionResults.commission * EXCHANGE_RATE_SAR * 1.15, 'SAR')}</div>
                            </div>
                          )}
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-700 p-4 shadow rounded-lg border-l-4 border-gray-500 dark:border-gray-400">
                          <div className="text-xs text-gray-500 dark:text-gray-300 uppercase font-sans">Net Price</div>
                          <div className="text-lg font-bold text-gray-700 dark:text-gray-100 font-sans">{formatCurrency(extensionResults.netPrice, 'USD')}</div>
                          {isIndirect && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <div>SAR: {formatCurrency(extensionResults.netPrice * EXCHANGE_RATE_SAR, 'SAR')}</div>
                              <div>VAT (15%): {formatCurrency(extensionResults.netPrice * EXCHANGE_RATE_SAR * 0.15, 'SAR')}</div>
                              <div className="font-bold text-gray-700 dark:text-gray-300">Total: {formatCurrency(extensionResults.netPrice * EXCHANGE_RATE_SAR * 1.15, 'SAR')}</div>
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

          {!isExtensionQuote && (
            <>
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors">
             <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Commercial Schedule</h3>
                {isIndirect && (
                  <div className="text-xs font-sans tabular-nums text-gray-500 dark:text-gray-400">
                     1 USD = {EXCHANGE_RATE_SAR} SAR
                  </div>
                )}
             </div>
             
             <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                     <tr>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase whitespace-nowrap">Year</th>
                        
                        {/* Dynamic Product Columns - Gross USD */}
                        {selectedProductIds.map(pid => {
                           const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
                           return (
                             <th key={pid} className="px-4 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase whitespace-nowrap">
                               {p?.shortName || p?.name} (USD)
                             </th>
                           );
                        })}

                        {/* Always show USD Total */}
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-800 dark:text-gray-200 uppercase bg-gray-200 dark:bg-gray-600 whitespace-nowrap">
                           Total (USD)
                        </th>

                        {/* Dynamic Product Columns - Gross SAR (Indirect only) */}
                        {isIndirect && selectedProductIds.map(pid => {
                            const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
                            return (
                              <th key={`${pid}-sar`} className="px-4 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase whitespace-nowrap">
                                {p?.shortName || p?.name} (SAR)
                              </th>
                            );
                        })}

                        {/* Conditionally show SAR Total */}
                        {isIndirect && (
                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-800 dark:text-gray-200 uppercase bg-yellow-100 dark:bg-yellow-900/40 whitespace-nowrap">
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
                               Grand Total<br/>(SAR)
                             </th>
                          </>
                        )}

                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase whitespace-nowrap">Recognized<br/>Total (USD)</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                     {results.yearlyResults.map((r, i) => (
                        <tr key={r.year} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}>
                           <td className="px-4 py-4 text-center text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">Year {r.year}</td>
                           
                           {/* Product Columns Data Gross USD */}
                           {selectedProductIds.map(pid => {
                             const pData = r.breakdown.find(d => d.id === pid);
                             return (
                               <td key={pid} className="px-4 py-4 text-center text-sm text-gray-600 dark:text-gray-300 font-sans tabular-nums whitespace-nowrap">
                                 {pData ? formatCurrency(pData.gross, 'USD') : '-'}
                               </td>
                             );
                           })}

                           {/* Total USD */}
                           <td className="px-4 py-4 text-center text-sm font-bold text-blue-700 dark:text-blue-300 font-sans tabular-nums bg-blue-50 dark:bg-blue-900/20 whitespace-nowrap">
                              {formatCurrency(r.grossUSD, 'USD')}
                           </td>

                           {/* Product Columns Data Gross SAR (Indirect only) */}
                           {isIndirect && selectedProductIds.map(pid => {
                             const pData = r.breakdown.find(d => d.id === pid);
                             return (
                               <td key={`${pid}-sar`} className="px-4 py-4 text-center text-sm text-gray-600 dark:text-gray-300 font-sans tabular-nums whitespace-nowrap">
                                 {pData ? formatCurrency(pData.grossSAR, 'SAR') : '-'}
                               </td>
                             );
                           })}

                           {/* Total SAR (if Indirect) */}
                           {isIndirect && (
                             <td className="px-4 py-4 text-center text-sm font-bold text-gray-800 dark:text-gray-200 font-sans tabular-nums bg-yellow-50 dark:bg-yellow-900/20 whitespace-nowrap">
                                {formatCurrency(r.grossSAR, 'SAR')}
                             </td>
                           )}

                           {/* VAT and Grand Total */}
                           {isIndirect && (
                             <>
                               <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-gray-400 font-sans tabular-nums bg-yellow-50/50 dark:bg-yellow-900/10 whitespace-nowrap">
                                  {formatCurrency(r.vatSAR, 'SAR')}
                               </td>
                               <td className="px-4 py-4 text-center text-sm font-bold text-gray-900 dark:text-gray-100 font-sans tabular-nums bg-yellow-100 dark:bg-yellow-900/40 whitespace-nowrap">
                                  {formatCurrency(r.grandTotalSAR, 'SAR')}
                               </td>
                             </>
                           )}

                           <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-gray-400 font-sans tabular-nums whitespace-nowrap">
                              {formatCurrency(r.netUSD, 'USD')}
                           </td>
                        </tr>
                     ))}
                     <tr className="bg-gray-800 dark:bg-gray-900 text-white">
                        <td className="px-4 py-4 text-center text-sm font-bold whitespace-nowrap">Total</td>
                        
                        {/* Empty cells for breakdown columns USD */}
                        {selectedProductIds.map(pid => (
                          <td key={pid}></td>
                        ))}

                        {/* Total USD */}
                        <td className="px-4 py-4 text-center text-sm font-bold font-sans tabular-nums whitespace-nowrap">
                           {formatCurrency(results.totalGrossUSD, 'USD')}
                        </td>

                        {/* Empty cells for breakdown columns SAR */}
                        {isIndirect && selectedProductIds.map(pid => (
                          <td key={`${pid}-sar`}></td>
                        ))}

                         {/* Total SAR */}
                        {isIndirect && (
                           <td className="px-4 py-4 text-center text-sm font-bold font-sans tabular-nums text-yellow-300 whitespace-nowrap">
                              {formatCurrency(results.totalGrossSAR, 'SAR')}
                           </td>
                        )}

                        {/* VAT and Grand Total */}
                        {isIndirect && (
                           <>
                              <td className="px-4 py-4 text-center text-sm font-sans tabular-nums text-gray-300 whitespace-nowrap">
                                 {formatCurrency(results.totalVatSAR, 'SAR')}
                              </td>
                              <td className="px-4 py-4 text-center text-sm font-bold font-sans tabular-nums text-yellow-300 whitespace-nowrap">
                                 {formatCurrency(results.totalGrandTotalSAR, 'SAR')}
                              </td>
                           </>
                        )}

                        <td className="px-4 py-4 text-center text-sm font-bold font-sans tabular-nums text-gray-300 whitespace-nowrap">
                           {formatCurrency(results.totalNetUSD, 'USD')}
                        </td>
                     </tr>
                  </tbody>
               </table>
             </div>
          </div>
          
          {/* Summary Metrics (ACV & Splits) */}
          <div className="font-sans"> 
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
               <div className="bg-white dark:bg-gray-800 p-4 shadow rounded-lg border-l-4 border-blue-500 dark:border-blue-400 transition-colors">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">Customer TCV</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">{formatCurrency(results.totalGrossUSD, 'USD')}</div>
               </div>
               <div className="bg-white dark:bg-gray-800 p-4 shadow rounded-lg border-l-4 border-indigo-500 dark:border-indigo-400 transition-colors">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">Customer ACV</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">{formatCurrency(results.acvUSD, 'USD')}</div>
               </div>
               
               {/* Net Metrics (Only for Indirect Channels) */}
               {isIndirect && (
                 <>
                   <div className="bg-gray-100 dark:bg-gray-700 p-4 shadow rounded-lg border-l-4 border-gray-500 dark:border-gray-400 transition-colors">
                      <div className="text-xs text-gray-500 dark:text-gray-300 uppercase font-sans">Net TCV</div>
                      <div className="text-lg font-bold text-gray-700 dark:text-gray-100 font-sans">{formatCurrency(results.totalNetUSD, 'USD')}</div>
                   </div>
                   <div className="bg-gray-100 dark:bg-gray-700 p-4 shadow rounded-lg border-l-4 border-gray-500 dark:border-gray-400 transition-colors">
                      <div className="text-xs text-gray-500 dark:text-gray-300 uppercase font-sans">Net ACV</div>
                      <div className="text-lg font-bold text-gray-700 dark:text-gray-100 font-sans">{formatCurrency(results.netACV, 'USD')}</div>
                   </div>
                 </>
               )}

               {dealType === DealType.RENEWAL && (
                 <>
                   {/* Renewal Base ACV (Gross) */}
                   <div className="bg-white dark:bg-gray-800 p-4 shadow rounded-lg border-l-4 border-green-500 dark:border-green-400 transition-colors">
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">Renewal Base ACV</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">{formatCurrency(results.renewalBaseACV, 'USD')}</div>
                   </div>

                   {/* Net Renewal Base ACV (New for Indirect) */}
                   {isIndirect && (
                      <div className="bg-gray-100 dark:bg-gray-700 p-4 shadow rounded-lg border-l-4 border-green-500 dark:border-green-400 transition-colors">
                          <div className="text-xs text-gray-500 dark:text-gray-300 uppercase font-sans">Net Renewal Base</div>
                          <div className="text-lg font-bold text-gray-700 dark:text-gray-100 font-sans">{formatCurrency(results.netRenewalBaseACV, 'USD')}</div>
                      </div>
                   )}

                   {/* Upsell ACV (Gross) */}
                   <div className="bg-white dark:bg-gray-800 p-4 shadow rounded-lg border-l-4 border-orange-500 dark:border-orange-400 transition-colors">
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">Upsell ACV</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">{formatCurrency(results.upsellACV, 'USD')}</div>
                   </div>

                   {/* Net Upsell ACV (New for Indirect) */}
                   {isIndirect && (
                      <div className="bg-gray-100 dark:bg-gray-700 p-4 shadow rounded-lg border-l-4 border-orange-500 dark:border-orange-400 transition-colors">
                          <div className="text-xs text-gray-500 dark:text-gray-300 uppercase font-sans">Net Upsell</div>
                          <div className="text-lg font-bold text-gray-700 dark:text-gray-100 font-sans">{formatCurrency(results.netUpsellACV, 'USD')}</div>
                      </div>
                   )}
                 </>
               )}
            </div>

            {/* NEW: Net Revenue Breakdown Section with ACV and TCV */}
            {isIndirect && selectedProductIds.length > 0 && (
              <div className="bg-white dark:bg-gray-800 p-4 shadow rounded-lg border border-gray-200 dark:border-gray-700 mb-4 transition-colors">
                <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3 font-sans">Net Revenue Breakdown</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {selectedProductIds.map(pid => {
                     const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
                     const tcv = results.productNetTotals[pid] || 0;
                     const acv = tcv / config.years;
                     return (
                       <div key={pid} className="border border-gray-100 dark:border-gray-700 rounded p-3 bg-gray-50 dark:bg-gray-700">
                          <div className="text-xs font-bold text-gray-700 dark:text-gray-200 font-sans mb-2">{p?.shortName}</div>
                          <div className="flex justify-between items-center mb-1">
                             <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Net TCV</span>
                             <span className="text-xs font-sans tabular-nums font-medium text-gray-900 dark:text-white">{formatCurrency(tcv, 'USD')}</span>
                          </div>
                          <div className="flex justify-between items-center">
                             <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Net ACV</span>
                             <span className="text-xs font-sans tabular-nums font-medium text-gray-900 dark:text-white">{formatCurrency(acv, 'USD')}</span>
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
            isExtensionQuote={isExtensionQuote}
            extensionResults={extensionResults}
          />

          {!isExtensionQuote && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-md transition-colors">
               <button 
                 onClick={() => setIsArchitectNotesOpen(!isArchitectNotesOpen)}
                 className="w-full flex justify-between items-center p-4 focus:outline-none"
               >
                 <div className="flex items-center space-x-2">
                   <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-200">Architect Notes</h4>
                   {utdEeWarning && (
                     <span className="text-xs font-bold text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded">
                       {utdEeWarning}
                     </span>
                   )}
                 </div>
                 <svg 
                   className={`w-5 h-5 text-yellow-700 dark:text-yellow-300 transform transition-transform duration-200 ${isArchitectNotesOpen ? 'rotate-180' : ''}`} 
                   fill="none" 
                   stroke="currentColor" 
                   viewBox="0 0 24 24"
                 >
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                 </svg>
               </button>
               
               {isArchitectNotesOpen && (
                 <div className="px-4 pb-4 border-t border-yellow-200 dark:border-yellow-700/50 mt-2 pt-2">
                   <ul className="text-xs text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-1">
                      <li><strong>Base Calculation:</strong> UTD (HC × Rate) / LXD (BC × Rate).</li>
                      <li><strong>WHT Adjustment:</strong> {applyWHT ? "Prices grossed up (divided by 0.95)." : "No WHT gross up applied."}</li>
                      <li><strong>Floor Rules:</strong> Single Deal Min $6,842. Combo Deal LXD Min $4,210. (Adjusted dynamically for WHT).</li>
                      <li><strong>Recognized Revenue:</strong> Applied {dealType} {channel} factor. 
                         {channel !== ChannelType.DIRECT && dealType === DealType.NEW_LOGO && " (Y1 vs Y2+ margins applied)."}
                      </li>
                      {dealType === DealType.RENEWAL && (
                        <li><strong>Renewal Split:</strong> Renewal Base calculated as sum of [Product Expiring × (1 + Product Uplift Rate)]. Upsell is the remainder of ACV.</li>
                      )}
                      {results.yearlyResults[0].floorAdjusted && (
                        <li><strong>Auto-Adjustment:</strong> Pricing was automatically raised to meet the minimum floor requirements.</li>
                      )}
                      {/* Monthly Cost Analysis */}
                      {monthlyCosts.length > 0 && (
                         <li className="font-semibold italic pt-1 text-yellow-900 dark:text-yellow-100">
                           Unit Economics: {monthlyCosts.join(', ')}.
                         </li>
                      )}
                   </ul>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default App;