const fs = require('fs');

let code = fs.readFileSync('App.tsx', 'utf8');

const optionCResults = `                {extensionResults.type === "C" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-100 dark:border-gray-600 animate-fade-in">
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">
                          Target Value (USD)
                        </div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">
                          {formatCurrency(
                            extensionResults.targetValue,
                            "USD",
                          )}
                        </div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 animate-fade-in">
                        <div className="text-xs text-blue-600 dark:text-blue-400 uppercase font-sans">
                          Extension Duration
                        </div>
                        <div className="text-xl font-bold text-blue-700 dark:text-blue-300 font-sans">
                          {extensionResults.monthsCovered} months
                        </div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800 animate-fade-in">
                        <div className="text-xs text-green-600 dark:text-green-400 uppercase font-sans">
                          Monthly Cost (USD)
                        </div>
                        <div className="text-xl font-bold text-green-700 dark:text-green-300 font-sans">
                          {formatCurrency(extensionResults.monthlyCost, "USD")}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3 font-sans">
                        Pricing Breakdown (for {extensionResults.monthsCovered}{" "}
                        months)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-gray-800 p-4 shadow rounded-lg border-l-4 border-blue-500 dark:border-blue-400">
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
                          )}
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 shadow rounded-lg border-l-4 border-orange-500 dark:border-orange-400">
                          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-sans">
                            Reseller Fees
                          </div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white font-sans">
                            {formatCurrency(extensionResults.commission, "USD")}
                          </div>
                          {isIndirect && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <div>
                                SAR:{" "}
                                {formatCurrency(
                                  extensionResults.commission * sarRate,
                                  "SAR",
                                )}
                              </div>
                              <div>
                                VAT (15%):{" "}
                                {formatCurrency(
                                  extensionResults.commission * sarRate * 0.15,
                                  "SAR",
                                )}
                              </div>
                              <div className="font-bold text-gray-700 dark:text-gray-300">
                                Total:{" "}
                                {formatCurrency(
                                  extensionResults.commission * sarRate * 1.15,
                                  "SAR",
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-700 p-4 shadow rounded-lg border-l-4 border-gray-500 dark:border-gray-400">
                          <div className="text-xs text-gray-500 dark:text-gray-300 uppercase font-sans">
                            Net Price
                          </div>
                          <div className="text-lg font-bold text-gray-700 dark:text-gray-100 font-sans">
                            {formatCurrency(extensionResults.netPrice, "USD")}
                          </div>
                          {isIndirect && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <div>
                                SAR:{" "}
                                {formatCurrency(
                                  extensionResults.netPrice * sarRate,
                                  "SAR",
                                )}
                              </div>
                              <div>
                                VAT (15%):{" "}
                                {formatCurrency(
                                  extensionResults.netPrice * sarRate * 0.15,
                                  "SAR",
                                )}
                              </div>
                              <div className="font-bold text-gray-700 dark:text-gray-300">
                                Total:{" "}
                                {formatCurrency(
                                  extensionResults.netPrice * sarRate * 1.15,
                                  "SAR",
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}`;

const targetText = `                      </div>
                    </div>
                  </>
                )}`;

code = code.replace(targetText, targetText + '\n' + optionCResults);
fs.writeFileSync('App.tsx', code);
