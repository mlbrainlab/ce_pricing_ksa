const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const targetStr = `                        <div className="bg-white dark:bg-gray-800 p-4 shadow rounded-lg border-l-4 border-blue-500 dark:border-blue-400">
                          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">
                            End-User Price
                          </div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">
                            {formatCurrency(
                              extensionResults.endUserPrice,
                              "USD",
                            )}
                          </div>
                          {isIndirect && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <div>
                                SAR:{" "}
                                {formatCurrency(
                                  extensionResults.endUserPrice * sarRate,
                                  "SAR",
                                )}
                              </div>
                              <div>
                                VAT (15%):{" "}
                                {formatCurrency(
                                  extensionResults.endUserPrice * sarRate * 0.15,
                                  "SAR",
                                )}
                              </div>
                              <div className="font-bold text-gray-700 dark:text-gray-300">
                                Total:{" "}
                                {formatCurrency(
                                  extensionResults.endUserPrice * sarRate * 1.15,
                                  "SAR",
                                )}
                              </div>
                            </div>
                          )}`;

const newStr = `                        <div className="bg-white dark:bg-gray-800 p-4 shadow rounded-lg border-l-4 border-blue-500 dark:border-blue-400">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">
                              End-User Price
                            </div>
                            {extensionResults.roundUpOptionB && (
                              <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded font-semibold">
                                Rounded Up (Nearest 1,000)
                              </span>
                            )}
                          </div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">
                            {formatCurrency(
                              extensionResults.endUserPrice,
                              "USD",
                            )}
                          </div>
                          {isIndirect && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <div>
                                SAR:{" "}
                                {formatCurrency(
                                  extensionResults.roundUpOptionB
                                    ? Math.ceil((extensionResults.endUserPrice * sarRate) / 1000) * 1000
                                    : extensionResults.endUserPrice * sarRate,
                                  "SAR",
                                )}
                              </div>
                              <div>
                                VAT (15%):{" "}
                                {formatCurrency(
                                  (extensionResults.roundUpOptionB
                                    ? Math.ceil((extensionResults.endUserPrice * sarRate) / 1000) * 1000
                                    : extensionResults.endUserPrice * sarRate) * 0.15,
                                  "SAR",
                                )}
                              </div>
                              <div className="font-bold text-gray-700 dark:text-gray-300">
                                Total:{" "}
                                {formatCurrency(
                                  (extensionResults.roundUpOptionB
                                    ? Math.ceil((extensionResults.endUserPrice * sarRate) / 1000) * 1000
                                    : extensionResults.endUserPrice * sarRate) * 1.15,
                                  "SAR",
                                )}
                              </div>
                            </div>
                          )}`;

code = code.replace(targetStr, newStr);
fs.writeFileSync('App.tsx', code);
