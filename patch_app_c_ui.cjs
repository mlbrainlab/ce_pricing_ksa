const fs = require('fs');

let code = fs.readFileSync('App.tsx', 'utf8');

const optionCBlock = `                {extensionOption === "C" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Target Extension Total Value (USD)
                      </label>
                      <FormattedNumberInput
                        value={optionCValue}
                        onChange={setOptionCValue}
                        className="block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Enter target USD value"
                      />
                    </div>
                    <div>
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

code = code.replace(`                  </div>
                )}

              </div>
            </div>`, `                  </div>
                )}
${optionCBlock}
              </div>
            </div>`);

fs.writeFileSync('App.tsx', code);
