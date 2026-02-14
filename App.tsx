import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { ExportSection } from './components/ExportSection';
import { calculatePricing } from './services/pricingEngine';
import { 
  DealType, 
  ChannelType, 
  PricingMethod, 
  ProductInput, 
  DealConfiguration 
} from './types';
import { AVAILABLE_PRODUCTS, UTD_VARIANTS, LD_VARIANTS } from './constants';

const formatCurrency = (amount: number, currency: 'USD' | 'SAR') => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }
  return `SAR ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)}`;
};

const App: React.FC = () => {
  // Deal State
  const [dealType, setDealType] = useState<DealType>(DealType.NEW_LOGO);
  const [channel, setChannel] = useState<ChannelType>(ChannelType.DIRECT);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(['utd']);
  const [years, setYears] = useState<number>(3);
  const [method, setMethod] = useState<PricingMethod>(PricingMethod.MYFPI);
  const [applyWHT, setApplyWHT] = useState<boolean>(true); // Default true for KSA
  
  // Combo Discount State
  const [applyComboDiscount, setApplyComboDiscount] = useState<boolean>(false);
  const [comboDiscountValue, setComboDiscountValue] = useState<number>(0);

  // Single Rate Values (Applied to Y2+)
  const [globalRateVal, setGlobalRateVal] = useState<number>(5);
  const [utdRateVal, setUtdRateVal] = useState<number>(8); // Default 8%
  const [ldRateVal, setLdRateVal] = useState<number>(5);

  // Product Inputs State
  const [productInputs, setProductInputs] = useState<Record<string, ProductInput>>({
    'utd': { count: 100, variant: 'ANYWHERE', baseDiscount: 0, expiringAmount: 0 },
    'ld': { count: 50, variant: 'BASE PKG', baseDiscount: 0, expiringAmount: 0 },
  });

  // Check if we need split rates (if both UTD and LD are selected)
  const showSplitRates = selectedProductIds.includes('utd') && selectedProductIds.includes('ld');
  const isIndirect = channel !== ChannelType.DIRECT;

  // Helper to generate rate array [0, val, val...]
  const generateRateArray = (val: number, count: number) => {
    const arr = new Array(count).fill(val);
    if (arr.length > 0) arr[0] = 0; // Year 1 is always base
    return arr;
  };

  // Derived Config
  const config: DealConfiguration = useMemo(() => {
    // Generate arrays based on single input values
    const rates = generateRateArray(globalRateVal, years);
    const utdRates = generateRateArray(utdRateVal, years);
    const ldRates = generateRateArray(ldRateVal, years);

    const productRates: Record<string, number[]> = {};
    if (showSplitRates) {
      productRates['utd'] = utdRates;
      productRates['ld'] = ldRates;
    } else {
      if (selectedProductIds.includes('utd')) productRates['utd'] = rates;
      if (selectedProductIds.includes('ld')) productRates['ld'] = rates;
    }

    return {
      dealType,
      channel,
      selectedProducts: selectedProductIds,
      productInputs,
      years,
      method,
      rates, 
      productRates,
      applyWHT,
      applyComboDiscount: showSplitRates ? applyComboDiscount : false,
      comboDiscountValue: showSplitRates ? comboDiscountValue : 0,
    };
  }, [dealType, channel, selectedProductIds, productInputs, years, method, globalRateVal, utdRateVal, ldRateVal, showSplitRates, applyWHT, applyComboDiscount, comboDiscountValue]);

  // Results
  const results = useMemo(() => calculatePricing(config), [config]);

  // Calculate Monthly Costs for Architect Notes
  const monthlyCosts = useMemo(() => {
    const analysisParts: string[] = [];
    const isIndirect = config.channel !== ChannelType.DIRECT;
    const displayCurrency = isIndirect ? 'SAR' : 'USD';
    const getValue = (valUSD: number, valSAR: number) => isIndirect ? valSAR : valUSD;

    if (config.selectedProducts.includes('utd')) {
        const count = config.productInputs['utd'].count || 1; 
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

    if (config.selectedProducts.includes('ld')) {
        const count = config.productInputs['ld'].count || 1;
        const totalGrossUSD = results.yearlyResults.reduce((sum, r) => {
            const bd = r.breakdown.find(x => x.id === 'ld');
            return sum + (bd ? bd.gross : 0);
        }, 0);
        const totalGrossSAR = results.yearlyResults.reduce((sum, r) => {
            const bd = r.breakdown.find(x => x.id === 'ld');
            return sum + (bd ? bd.grossSAR : 0);
        }, 0);

        const acv = getValue(totalGrossUSD, totalGrossSAR) / config.years;
        const monthlyPerUnit = acv / count / 12;
        analysisParts.push(`LD: ${displayCurrency} ${monthlyPerUnit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /mo/bed`);
    }
    return analysisParts;
  }, [config, results]);


  // Handlers
  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleInputChange = (id: string, field: keyof ProductInput, value: string | number) => {
    setProductInputs(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  // Input Field Helper
  const renderSingleRateInput = (
    label: string, 
    value: number, 
    onChange: (val: number) => void,
    colorClass: string = "border-gray-300"
  ) => (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-500 mb-2">{label}</label>
      <div className="flex items-center">
        <input
          type="number"
          step="1" 
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
          className={`w-24 text-sm rounded p-2 text-left bg-white text-gray-900 border ${colorClass} focus:ring-2 focus:ring-blue-500 font-mono`}
        />
        <span className="ml-2 text-xs text-gray-400">
           % applied to Years 2-{years}
        </span>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: Configuration */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Section 1: Deal Basics */}
          <div className="bg-white shadow rounded-lg p-5 border border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">1. Deal Context</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500">Type</label>
                <select 
                  className="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white text-gray-900"
                  value={dealType}
                  onChange={(e) => setDealType(e.target.value as DealType)}
                >
                  <option value={DealType.NEW_LOGO}>New Logo</option>
                  <option value={DealType.RENEWAL}>Renewal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Channel</label>
                <select 
                  className="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white text-gray-900"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as ChannelType)}
                >
                  <option value={ChannelType.DIRECT}>Direct (USD)</option>
                  <option value={ChannelType.FULFILMENT}>Fulfilment (SAR)</option>
                  <option value={ChannelType.PARTNER_SOURCED}>Partner Sourced (SAR)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Products & Inputs */}
          <div className="bg-white shadow rounded-lg p-5 border border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">2. Product Mix</h2>
            <div className="space-y-4">
              {AVAILABLE_PRODUCTS.map(product => {
                const isSelected = selectedProductIds.includes(product.id);
                const input = productInputs[product.id] || { count: 0, variant: '', baseDiscount: 0 };
                
                // Hint Logic: If UTD is selected & variant is UTDEE, and current product is LD and variant IS NOT EE-Combo
                const showComboHint = 
                  product.id === 'ld' && 
                  isSelected &&
                  selectedProductIds.includes('utd') && 
                  productInputs['utd']?.variant === 'UTDEE' && 
                  input.variant !== 'EE-Combo';

                return (
                  <div key={product.id} className={`border rounded-md transition-colors ${isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                    {/* Header Row */}
                    <div className="flex items-center p-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleProduct(product.id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className={`ml-3 text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-500'}`}>
                        {product.name}
                      </span>
                    </div>
                    
                    {/* Expanded Input Row */}
                    {isSelected && (
                      <div className="px-3 pb-3 pt-0 border-t border-blue-100 mt-1 grid grid-cols-1 gap-3">
                        <div className="grid grid-cols-2 gap-3 mt-2">
                           
                           {/* Renewal: Expiring Amount */}
                           {dealType === DealType.RENEWAL && (
                             <div className="col-span-2">
                               <label className="block text-xs text-orange-700 font-semibold mb-1">Expiring Amount (USD)</label>
                               <input
                                 type="number"
                                 min="0"
                                 className="block w-full text-xs border-gray-300 rounded shadow-sm focus:ring-orange-500 focus:border-orange-500 border p-1 bg-white text-gray-900 font-mono"
                                 value={input.expiringAmount || 0}
                                 onChange={(e) => handleInputChange(product.id, 'expiringAmount', parseFloat(e.target.value) || 0)}
                               />
                             </div>
                           )}

                           {/* Variant Selector */}
                           {product.hasVariants ? (
                             <div className="col-span-2">
                               <label className="block text-xs text-blue-700 mb-1">Variant</label>
                               <select
                                 className="block w-full text-xs border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-1 bg-white text-gray-900"
                                 value={input.variant}
                                 onChange={(e) => handleInputChange(product.id, 'variant', e.target.value)}
                               >
                                 {product.id === 'utd' && Object.keys(UTD_VARIANTS).map(v => (
                                   <option key={v} value={v}>{v} (${UTD_VARIANTS[v]})</option>
                                 ))}
                                 {product.id === 'ld' && Object.keys(LD_VARIANTS).map(v => (
                                   <option key={v} value={v}>{v} (${LD_VARIANTS[v]})</option>
                                 ))}
                               </select>
                             </div>
                           ) : (
                             <div className="col-span-2 text-xs text-gray-400 italic mt-1">Standard pricing applied</div>
                           )}
                           
                           {/* Combo Hint */}
                           {showComboHint && (
                             <div className="col-span-2 text-[10px] text-blue-600 bg-blue-100 p-1.5 rounded border border-blue-200">
                               <strong>Tip:</strong> UTD-EE is selected. "EE-Combo" variant is available for LD.
                             </div>
                           )}

                           {/* Count Input (HC/BC) */}
                           {product.countLabel && (
                             <div>
                               <label className="block text-xs text-blue-700 mb-1">{product.countLabel}</label>
                               <input
                                 type="number"
                                 min="0"
                                 className="block w-full text-xs border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-1 bg-white text-gray-900 bg-gray-50 font-mono"
                                 value={input.count}
                                 onChange={(e) => handleInputChange(product.id, 'count', parseInt(e.target.value) || 0)}
                               />
                             </div>
                           )}

                           {/* Discount Input */}
                           <div className={product.countLabel ? '' : 'col-span-2'}>
                             <label className="block text-xs text-blue-700 mb-1">Base Discount %</label>
                             <input
                               type="number"
                               min="0"
                               max="100"
                               disabled={showSplitRates && applyComboDiscount && product.id === 'ld'}
                               className={`block w-full text-xs border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-1 bg-white text-gray-900 bg-gray-50 font-mono ${showSplitRates && applyComboDiscount && product.id === 'ld' ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          <div className="bg-white shadow rounded-lg p-5 border border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">3. Structure</h2>
            <div className="space-y-4">
               {/* WHT Checkbox */}
               <div className="flex items-center">
                  <input 
                    id="wht-checkbox"
                    type="checkbox" 
                    checked={applyWHT} 
                    onChange={(e) => setApplyWHT(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="wht-checkbox" className="ml-2 text-sm font-medium text-gray-700">
                    Apply WHT (Gross Up)
                  </label>
               </div>

               {/* Combo Discount Checkbox (Conditional) */}
               {showSplitRates && (
                  <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded border border-blue-100">
                     <input 
                       id="combo-discount-checkbox"
                       type="checkbox"
                       checked={applyComboDiscount}
                       onChange={(e) => setApplyComboDiscount(e.target.checked)}
                       className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                     />
                     <div className="flex-1 flex items-center justify-between">
                       <label htmlFor="combo-discount-checkbox" className="text-sm font-medium text-blue-900">
                         Apply Combo Discount
                       </label>
                       {applyComboDiscount && (
                         <div className="flex items-center">
                           <input 
                             type="number"
                             min="0"
                             max="100"
                             value={comboDiscountValue}
                             onChange={(e) => setComboDiscountValue(parseInt(e.target.value) || 0)}
                             className="w-16 text-xs border border-blue-300 rounded p-1 text-center"
                           />
                           <span className="ml-1 text-xs text-blue-700">%</span>
                         </div>
                       )}
                     </div>
                  </div>
               )}

               <div className="flex space-x-4">
                 <div className="w-1/3">
                    <label className="block text-xs font-medium text-gray-500">Duration</label>
                    <input 
                      type="number" min="1" max="7" 
                      value={years} 
                      onChange={(e) => setYears(parseInt(e.target.value))}
                      className="mt-1 block w-full text-sm border border-gray-300 rounded-md p-2 bg-white text-gray-900 font-mono"
                    />
                 </div>
                 <div className="w-2/3">
                    <label className="block text-xs font-medium text-gray-500">Method</label>
                    <div className="flex items-center space-x-3 mt-2">
                       <label className="inline-flex items-center">
                         <input type="radio" className="form-radio h-4 w-4 text-blue-600" 
                           checked={method === PricingMethod.MYFPI}
                           onChange={() => setMethod(PricingMethod.MYFPI)}
                         />
                         <span className="ml-2 text-xs text-gray-700">MYFPI</span>
                       </label>
                       <label className="inline-flex items-center">
                         <input type="radio" className="form-radio h-4 w-4 text-blue-600"
                           checked={method === PricingMethod.MYPP}
                           onChange={() => setMethod(PricingMethod.MYPP)}
                         />
                         <span className="ml-2 text-xs text-gray-700">MYPP</span>
                       </label>
                    </div>
                 </div>
               </div>

               {/* Single Rate Input Logic */}
               <div>
                  <div className="mb-2 text-xs font-medium text-gray-500">
                    {method === PricingMethod.MYFPI ? 'Annual FPI %' : 'Annual Reverse Discount %'}
                  </div>
                  
                  {showSplitRates ? (
                    <>
                      {renderSingleRateInput("UTD Rate", utdRateVal, setUtdRateVal, "border-blue-200")}
                      {renderSingleRateInput("LD Rate", ldRateVal, setLdRateVal, "border-green-200")}
                    </>
                  ) : (
                    renderSingleRateInput("Rate", globalRateVal, setGlobalRateVal)
                  )}
               </div>
            </div>
          </div>

        </div>

        {/* Right Column: Output */}
        <div className="xl:col-span-2 space-y-6">
          
          <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
             <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">Commercial Schedule</h3>
                <div className="text-xs font-mono text-gray-500">
                   1 USD = {3.76} SAR
                </div>
             </div>
             
             <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                     <tr>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Year</th>
                        
                        {/* Dynamic Product Columns - Gross */}
                        {selectedProductIds.map(pid => {
                           const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
                           return (
                             <th key={pid} className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase whitespace-nowrap">
                               {p?.shortName || p?.name} (USD)
                             </th>
                           );
                        })}

                        {/* Always show USD Total */}
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-800 uppercase bg-gray-200 whitespace-nowrap">
                           Total (USD)
                        </th>

                        {/* Conditionally show SAR Total */}
                        {isIndirect && (
                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-800 uppercase bg-yellow-100 whitespace-nowrap">
                             Total (SAR)
                          </th>
                        )}

                        {/* New VAT and Grand Total Columns for Indirect */}
                        {isIndirect && (
                          <>
                             <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase bg-yellow-50 whitespace-nowrap">
                               VAT (15%)
                             </th>
                             <th className="px-4 py-3 text-center text-xs font-bold text-gray-900 uppercase bg-yellow-200">
                               Grand Total<br/>(SAR)
                             </th>
                          </>
                        )}

                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Recognized<br/>Total (USD)</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                     {results.yearlyResults.map((r, i) => (
                        <tr key={r.year} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                           <td className="px-4 py-4 text-center text-sm font-medium text-gray-900 whitespace-nowrap">Year {r.year}</td>
                           
                           {/* Product Columns Data Gross */}
                           {selectedProductIds.map(pid => {
                             const pData = r.breakdown.find(d => d.id === pid);
                             return (
                               <td key={pid} className="px-4 py-4 text-center text-sm text-gray-600 font-mono whitespace-nowrap">
                                 {pData ? formatCurrency(pData.gross, 'USD') : '-'}
                               </td>
                             );
                           })}

                           {/* Total USD */}
                           <td className="px-4 py-4 text-center text-sm font-bold text-blue-700 font-mono bg-blue-50 whitespace-nowrap">
                              {formatCurrency(r.grossUSD, 'USD')}
                           </td>

                           {/* Total SAR (if Indirect) */}
                           {isIndirect && (
                             <td className="px-4 py-4 text-center text-sm font-bold text-gray-800 font-mono bg-yellow-50 whitespace-nowrap">
                                {formatCurrency(r.grossSAR, 'SAR')}
                             </td>
                           )}

                           {/* VAT and Grand Total */}
                           {isIndirect && (
                             <>
                               <td className="px-4 py-4 text-center text-sm text-gray-600 font-mono bg-yellow-50/50 whitespace-nowrap">
                                  {formatCurrency(r.vatSAR, 'SAR')}
                               </td>
                               <td className="px-4 py-4 text-center text-sm font-bold text-gray-900 font-mono bg-yellow-100 whitespace-nowrap">
                                  {formatCurrency(r.grandTotalSAR, 'SAR')}
                               </td>
                             </>
                           )}

                           <td className="px-4 py-4 text-center text-sm text-gray-600 font-mono whitespace-nowrap">
                              {formatCurrency(r.netUSD, 'USD')}
                           </td>
                        </tr>
                     ))}
                     <tr className="bg-gray-800 text-white">
                        <td className="px-4 py-4 text-center text-sm font-bold whitespace-nowrap">Total</td>
                        
                        {/* Empty cells for breakdown columns */}
                        {selectedProductIds.map(pid => (
                          <td key={pid}></td>
                        ))}

                        {/* Total USD */}
                        <td className="px-4 py-4 text-center text-sm font-bold font-mono whitespace-nowrap">
                           {formatCurrency(results.totalGrossUSD, 'USD')}
                        </td>

                         {/* Total SAR */}
                        {isIndirect && (
                           <td className="px-4 py-4 text-center text-sm font-bold font-mono text-yellow-300 whitespace-nowrap">
                              {formatCurrency(results.totalGrossSAR, 'SAR')}
                           </td>
                        )}

                        {/* VAT and Grand Total */}
                        {isIndirect && (
                           <>
                              <td className="px-4 py-4 text-center text-sm font-mono text-gray-300 whitespace-nowrap">
                                 {formatCurrency(results.totalVatSAR, 'SAR')}
                              </td>
                              <td className="px-4 py-4 text-center text-sm font-bold font-mono text-yellow-300 whitespace-nowrap">
                                 {formatCurrency(results.totalGrandTotalSAR, 'SAR')}
                              </td>
                           </>
                        )}

                        <td className="px-4 py-4 text-center text-sm font-bold font-mono text-gray-300 whitespace-nowrap">
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
               <div className="bg-white p-4 shadow rounded-lg border-l-4 border-blue-500">
                  <div className="text-xs text-gray-500 uppercase font-sans">Customer TCV</div>
                  <div className="text-lg font-bold text-gray-900 font-sans">{formatCurrency(results.totalGrossUSD, 'USD')}</div>
               </div>
               <div className="bg-white p-4 shadow rounded-lg border-l-4 border-indigo-500">
                  <div className="text-xs text-gray-500 uppercase font-sans">Customer ACV</div>
                  <div className="text-lg font-bold text-gray-900 font-sans">{formatCurrency(results.acvUSD, 'USD')}</div>
               </div>
               
               {/* Net Metrics (Only for Indirect Channels) */}
               {isIndirect && (
                 <>
                   <div className="bg-gray-100 p-4 shadow rounded-lg border-l-4 border-gray-500">
                      <div className="text-xs text-gray-500 uppercase font-sans">Net TCV</div>
                      <div className="text-lg font-bold text-gray-700 font-sans">{formatCurrency(results.totalNetUSD, 'USD')}</div>
                   </div>
                   <div className="bg-gray-100 p-4 shadow rounded-lg border-l-4 border-gray-500">
                      <div className="text-xs text-gray-500 uppercase font-sans">Net ACV</div>
                      <div className="text-lg font-bold text-gray-700 font-sans">{formatCurrency(results.netACV, 'USD')}</div>
                   </div>
                 </>
               )}

               {dealType === DealType.RENEWAL && (
                 <>
                   <div className="bg-white p-4 shadow rounded-lg border-l-4 border-green-500">
                      <div className="text-xs text-gray-500 uppercase font-sans">Renewal ACV (Base)</div>
                      <div className="text-lg font-bold text-gray-900 font-sans">{formatCurrency(results.renewalBaseACV, 'USD')}</div>
                   </div>
                   <div className="bg-white p-4 shadow rounded-lg border-l-4 border-orange-500">
                      <div className="text-xs text-gray-500 uppercase font-sans">Upsell ACV</div>
                      <div className="text-lg font-bold text-gray-900 font-sans">{formatCurrency(results.upsellACV, 'USD')}</div>
                   </div>
                 </>
               )}
            </div>

            {/* NEW: Net Revenue Breakdown Section with ACV and TCV */}
            {isIndirect && selectedProductIds.length > 0 && (
              <div className="bg-white p-4 shadow rounded-lg border border-gray-200 mb-4">
                <h4 className="text-sm font-bold text-gray-800 mb-3 font-sans">Net Revenue Breakdown</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {selectedProductIds.map(pid => {
                     const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
                     const tcv = results.productNetTotals[pid] || 0;
                     const acv = tcv / config.years;
                     return (
                       <div key={pid} className="border border-gray-100 rounded p-3 bg-gray-50">
                          <div className="text-xs font-bold text-gray-700 font-sans mb-2">{p?.shortName}</div>
                          <div className="flex justify-between items-center mb-1">
                             <span className="text-[10px] text-gray-500 uppercase">Net TCV</span>
                             <span className="text-xs font-mono font-medium text-gray-900">{formatCurrency(tcv, 'USD')}</span>
                          </div>
                          <div className="flex justify-between items-center">
                             <span className="text-[10px] text-gray-500 uppercase">Net ACV</span>
                             <span className="text-xs font-mono font-medium text-gray-900">{formatCurrency(acv, 'USD')}</span>
                          </div>
                       </div>
                     );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
             <h4 className="text-sm font-bold text-yellow-800">Architect Notes</h4>
             <ul className="mt-2 text-xs text-yellow-700 list-disc list-inside space-y-1">
                <li><strong>Base Calculation:</strong> UTD (HC × Rate) / LD (BC × Rate).</li>
                <li><strong>WHT Adjustment:</strong> {applyWHT ? "Prices grossed up (divided by 0.95)." : "No WHT gross up applied."}</li>
                <li><strong>Floor Rules:</strong> Single Deal Min $6,842. Combo Deal LD Min $4,210. (Adjusted dynamically for WHT).</li>
                <li><strong>Recognized Revenue:</strong> Applied {dealType} {channel} factor. 
                   {channel !== ChannelType.DIRECT && dealType === DealType.NEW_LOGO && " (Y1 vs Y2+ margins applied)."}
                </li>
                {dealType === DealType.RENEWAL && (
                  <li><strong>Renewal Split:</strong> Renewal Base calculated as sum of [Product Expiring × (1 + Product Y1 Rate)]. Upsell is the remainder of ACV.</li>
                )}
                {results.yearlyResults[0].floorAdjusted && (
                  <li><strong>Auto-Adjustment:</strong> Pricing was automatically raised to meet the minimum floor requirements.</li>
                )}
                {applyComboDiscount && (
                   <li><strong>Combo Discount:</strong> LD base discount overridden to {comboDiscountValue}% due to combo selection.</li>
                )}
                {/* Monthly Cost Analysis */}
                {monthlyCosts.length > 0 && (
                   <li className="font-semibold italic pt-1 text-yellow-900">
                     Unit Economics: {monthlyCosts.join(', ')}.
                   </li>
                )}
             </ul>
          </div>

          <ExportSection data={results} config={config} />
        </div>
      </div>
    </Layout>
  );
};

export default App;