const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  'ProductDefinition,',
  'ProductDefinition, InstitutionType,'
);

code = code.replace(
  'const [channel, setChannel] = useState<ChannelType>(ChannelType.DIRECT);',
  'const [channel, setChannel] = useState<ChannelType>(ChannelType.DIRECT);\n  const [institutionType, setInstitutionType] = useState<InstitutionType>(InstitutionType.PROVIDER);\n  const [includeHospital, setIncludeHospital] = useState<boolean>(false);'
);

code = code.replace(
  'setChannel(ChannelType.DIRECT);',
  'setChannel(ChannelType.DIRECT);\n    setInstitutionType(InstitutionType.PROVIDER);\n    setIncludeHospital(false);'
);

code = code.replace(
  'if (loadedConfig.channel !== undefined) setChannel(loadedConfig.channel);',
  'if (loadedConfig.channel !== undefined) setChannel(loadedConfig.channel);\n    if (loadedConfig.institutionType !== undefined) setInstitutionType(loadedConfig.institutionType);\n    if (loadedConfig.includeHospital !== undefined) setIncludeHospital(loadedConfig.includeHospital);'
);

code = code.replace(
  'dealType,\n      channel,',
  'dealType,\n      channel,\n      institutionType,\n      includeHospital,'
);

code = code.replace(
  'dealType,\n    channel,\n    selectedProductIds,',
  'dealType,\n    channel,\n    institutionType,\n    includeHospital,\n    selectedProductIds,'
);

const tabToggleCode = `              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">`;

const toggleReplacement = `              </div>
            </div>

            {/* Institution Type Toggle */}
            <div className="flex justify-center mb-6">
              <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg flex inline-flex shadow-inner">
                <button
                  type="button"
                  onClick={() => setInstitutionType(InstitutionType.PROVIDER)}
                  className={\`px-4 py-2 text-sm font-medium rounded-md transition-colors \${
                    institutionType === InstitutionType.PROVIDER
                      ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }\`}
                >
                  🏥 Providers-Payers
                </button>
                <button
                  type="button"
                  onClick={() => setInstitutionType(InstitutionType.ACADEMIC)}
                  className={\`px-4 py-2 text-sm font-medium rounded-md transition-colors \${
                    institutionType === InstitutionType.ACADEMIC
                      ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }\`}
                >
                  🎓 Academic Institutions
                  <span className="block text-[10px] font-normal opacity-70 leading-none mt-0.5">(including affiliated hospitals)</span>
                </button>
              </div>
            </div>

            {institutionType === InstitutionType.ACADEMIC && (
              <div className="flex justify-center mb-4">
                <label className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={includeHospital}
                    onChange={(e) => setIncludeHospital(e.target.checked)}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Include Affiliated Hospital
                  </span>
                </label>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">`;

code = code.replace(tabToggleCode, toggleReplacement);

const utdAcademicInputs = `
                                {institutionType === InstitutionType.ACADEMIC && product.id === 'utd' && (
                                  <div className="col-span-2 grid grid-cols-2 gap-3 mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-800">
                                    <div>
                                      <label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Faculty (M.D. / D.O.)</label>
                                      <FormattedNumberInput value={input.facultyCount || 0} onChange={(val) => handleInputChange(product.id, 'facultyCount', val)} className="w-full text-xs border-gray-300 dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums" />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Residents</label>
                                      <FormattedNumberInput value={input.residentsCount || 0} onChange={(val) => handleInputChange(product.id, 'residentsCount', val)} className="w-full text-xs border-gray-300 dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums" />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Med Students</label>
                                      <FormattedNumberInput value={input.medStudentsCount || 0} onChange={(val) => handleInputChange(product.id, 'medStudentsCount', val)} className="w-full text-xs border-gray-300 dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums" />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Pharma/Nursing Students</label>
                                      <FormattedNumberInput value={input.pharmaStudentsCount || 0} onChange={(val) => handleInputChange(product.id, 'pharmaStudentsCount', val)} className="w-full text-xs border-gray-300 dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums" />
                                    </div>
                                    { ((Number(input.facultyCount)||0) + (Number(input.medStudentsCount)||0) >= 1) && (
                                      <div className="col-span-2 mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                                        <label className="block text-[10px] text-pink-600 dark:text-pink-400 font-bold mb-1">Educational Discount % (Max 20%)</label>
                                        <input type="number" min="0" max="20" value={input.educationalDiscount || ''} onChange={(e) => { let v = parseInt(e.target.value); if(v>20)v=20; if(v<0)v=0; handleInputChange(product.id, 'educationalDiscount', isNaN(v)?'':v); }} className="w-full text-xs border-pink-300 dark:border-pink-600 rounded p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums" />
                                      </div>
                                    )}
                                  </div>
                                )}

                                {institutionType === InstitutionType.ACADEMIC && product.id === 'lxd' && (
                                  <div className="col-span-2 grid grid-cols-1 gap-2 mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-800">
                                    <div>
                                      <label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Total Healthcare Students</label>
                                      <FormattedNumberInput value={input.totalStudentsCount || 0} onChange={(val) => handleInputChange(product.id, 'totalStudentsCount', val)} className="w-full text-xs border-gray-300 dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums" />
                                    </div>
                                    <div className="flex flex-col space-y-1 mt-1">
                                      <label className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                                        <input type="checkbox" checked={input.lxdAcademicBase ?? true} onChange={(e) => handleInputChange(product.id, 'lxdAcademicBase', e.target.checked)} className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" /> LXD Base Package ($7)
                                      </label>
                                      <label className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                                        <input type="checkbox" checked={input.lxdAcademicSelect || false} onChange={(e) => handleInputChange(product.id, 'lxdAcademicSelect', e.target.checked)} className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" /> Lexi-SELECT (Mobile App) ($3)
                                      </label>
                                      <label className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                                        <input type="checkbox" checked={input.lxdAcademicMartindale || false} onChange={(e) => handleInputChange(product.id, 'lxdAcademicMartindale', e.target.checked)} className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" /> Martindale ($1)
                                      </label>
                                    </div>
                                  </div>
                                )}`;

code = code.replace('{/* Expanded Input Row */}\n                          {isSelected && (\n                            <div\n                              className={`px-3 pb-3 pt-0 border-t mt-1 grid grid-cols-1 gap-3 ${product.id === "utd" ? "border-green-100 dark:border-green-800" : "border-blue-100 dark:border-blue-800"}`}\n                            >\n                              <div className="grid grid-cols-2 gap-3 mt-2">', 
                    '{/* Expanded Input Row */}\n                          {isSelected && (\n                            <div\n                              className={`px-3 pb-3 pt-0 border-t mt-1 grid grid-cols-1 gap-3 ${product.id === "utd" ? "border-green-100 dark:border-green-800" : "border-blue-100 dark:border-blue-800"}`}\n                            >\n                              <div className="grid grid-cols-2 gap-3 mt-2">' + utdAcademicInputs);

code = code.replace(`{/* Count Input (HC/BC) */}
                                {product.countLabel && (`, `{/* Count Input (HC/BC) */}
                                {product.countLabel && (institutionType === InstitutionType.PROVIDER || includeHospital) && (`);

code = code.replace(`{/* Target Variant Selector */}
                                {product.hasVariants ? (`, `{/* Target Variant Selector */}
                                {product.hasVariants && (institutionType === InstitutionType.PROVIDER || includeHospital) ? (`);

code = code.replace(`{/* Discount Input */}
                                <div
                                  className={
                                    product.countLabel ? "" : "col-span-2"
                                  }
                                >`, `{/* Discount Input */}
                                {(institutionType === InstitutionType.PROVIDER || includeHospital) && (<div
                                  className={
                                    product.countLabel ? "" : "col-span-2"
                                  }
                                >`);

code = code.replace(`{/* EAI Activation Checkbox */}`, `</div>)}{/* EAI Activation Checkbox */}`);

fs.writeFileSync('App.tsx', code);
