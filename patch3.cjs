const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const tabToggleCode = `              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">`;

const toggleReplacement = `              </button>
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
fs.writeFileSync('App.tsx', code);
