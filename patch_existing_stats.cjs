const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const anchor = `                                    <div>
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
                                        className="block w-full text-xs border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-gray-500 border p-1 bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white"
                                      />
                                    </div>
                                  </div>
                                )}`;

const replacement = `                                    {(institutionType === InstitutionType.PROVIDER || includeHospital) && (
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
                                          className="block w-full text-xs border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-gray-500 border p-1 bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white"
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {isRenewal && institutionType === InstitutionType.ACADEMIC && product.id === 'utd' && (
                                  <div className="col-span-2 grid grid-cols-2 gap-3 mb-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700">
                                    <div className="col-span-2 text-[10px] uppercase font-bold text-gray-500">Existing Academic Stats</div>
                                    <div>
                                      <label className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1">Existing Faculty</label>
                                      <FormattedNumberInput value={input.existingFacultyCount || 0} onChange={(val) => handleInputChange(product.id, 'existingFacultyCount', val)} className="w-full text-xs border-gray-300 dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums" />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1">Existing Residents</label>
                                      <FormattedNumberInput value={input.existingResidentsCount || 0} onChange={(val) => handleInputChange(product.id, 'existingResidentsCount', val)} className="w-full text-xs border-gray-300 dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums" />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1">Existing Med Students</label>
                                      <FormattedNumberInput value={input.existingMedStudentsCount || 0} onChange={(val) => handleInputChange(product.id, 'existingMedStudentsCount', val)} className="w-full text-xs border-gray-300 dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums" />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1">Existing Pharma Students</label>
                                      <FormattedNumberInput value={input.existingPharmaStudentsCount || 0} onChange={(val) => handleInputChange(product.id, 'existingPharmaStudentsCount', val)} className="w-full text-xs border-gray-300 dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums" />
                                    </div>
                                  </div>
                                )}
                                
                                {isRenewal && institutionType === InstitutionType.ACADEMIC && product.id === 'lxd' && (
                                  <div className="col-span-2 grid grid-cols-1 gap-2 mb-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700">
                                    <div className="text-[10px] uppercase font-bold text-gray-500">Existing Academic Stats</div>
                                    <div>
                                      <label className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1">Existing Healthcare Students</label>
                                      <FormattedNumberInput value={input.existingTotalStudentsCount || 0} onChange={(val) => handleInputChange(product.id, 'existingTotalStudentsCount', val)} className="w-full text-xs border-gray-300 dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans tabular-nums" />
                                    </div>
                                  </div>
                                )}`;

if (code.includes(anchor)) {
    fs.writeFileSync('App.tsx', code.replace(anchor, replacement));
    console.log("Patched App.tsx existing stats successfully.");
} else {
    console.log("Could not find anchor.");
}
