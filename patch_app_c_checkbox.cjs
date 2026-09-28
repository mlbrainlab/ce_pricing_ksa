const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const targetStr = `                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Extension Duration (Months)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={optionCMonths}
                        onChange={(e) => setOptionCMonths(parseFloat(e.target.value) || 0)}
                        className="block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g. 5.5"
                      />
                    </div>
                  </div>
                )}`;

const newStr = `                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Extension Duration (Months)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={optionCMonths}
                        onChange={(e) => setOptionCMonths(parseFloat(e.target.value) || 0)}
                        className="block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g. 5.5"
                      />
                    </div>
                    <div className={\`flex items-center pt-2 border-t border-gray-100 dark:border-gray-700 \${!isIndirect ? 'opacity-50 cursor-not-allowed' : ''}\`}>
                      <input
                        id="round-up-option-c-checkbox"
                        type="checkbox"
                        disabled={!isIndirect}
                        checked={isIndirect ? roundUpOptionB : false}
                        onChange={(e) => setRoundUpOptionB(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white dark:bg-gray-700 dark:border-gray-600 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <label
                        htmlFor="round-up-option-c-checkbox"
                        className={\`ml-2 text-xs font-semibold select-none \${!isIndirect ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300 cursor-pointer'}\`}
                      >
                        Round up value {!isIndirect && "(Disabled for Direct)"}
                      </label>
                    </div>
                  </div>
                )}`;

code = code.replace(targetStr, newStr);
fs.writeFileSync('App.tsx', code);
