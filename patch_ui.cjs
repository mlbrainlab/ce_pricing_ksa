const fs = require('fs');
let code = fs.readFileSync('components/ExportSection.tsx', 'utf8');

const anchor = `                    {siteBreakdown.map(site => (
                      <div key={site.id} className="flex flex-row items-center gap-3 p-2 border rounded border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                        <input
                          type="text"
                          className="flex-1 min-w-[150px] px-3 py-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="Hospital name"
                          value={site.name}
                          onChange={e => setSiteBreakdown(prev => prev.map(s => s.id === site.id ? { ...s, name: e.target.value } : s))}
                        />
                        <div className="flex flex-wrap gap-4 items-center">
                          {config.selectedProducts.map(pid => {
                            const unit = AVAILABLE_PRODUCTS.find(x => x.id === pid)?.countLabel || 'Count';
                            const label = AVAILABLE_PRODUCTS.find(x => x.id === pid)?.shortName || pid;
                            return (
                              <div key={pid} className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{label} {unit}:</span>
                                <input
                                  type="number"
                                  min="0"
                                  className="w-16 px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                  value={site.counts[pid] !== undefined ? site.counts[pid] : ''}
                                  onChange={e => {
                                    const val = e.target.value === '' ? '' : (parseInt(e.target.value) || 0);
                                    setSiteBreakdown(prev => prev.map(s => s.id === site.id ? { ...s, counts: { ...s.counts, [pid]: val === '' ? 0 : val } } : s));
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => setSiteBreakdown(prev => prev.filter(s => s.id !== site.id))}
                          className="text-red-500 hover:text-red-700 font-bold px-2 text-lg shrink-0"
                        >
                          ×
                        </button>
                      </div>
                    ))}`;

const replacement = `                    {siteBreakdown.map(site => (
                      <div key={site.id} className="flex flex-col gap-3 p-3 border rounded border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                        <div className="flex flex-row items-center justify-between gap-3">
                            <input
                              type="text"
                              className="flex-1 w-full px-3 py-1.5 border rounded text-sm font-medium dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder="Site name"
                              value={site.name}
                              onChange={e => setSiteBreakdown(prev => prev.map(s => s.id === site.id ? { ...s, name: e.target.value } : s))}
                            />
                            <button
                              onClick={() => setSiteBreakdown(prev => prev.filter(s => s.id !== site.id))}
                              className="text-red-500 hover:text-red-700 font-bold px-2 text-lg shrink-0"
                            >
                              ×
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-4 items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                          {config.selectedProducts.map(pid => {
                            const unit = AVAILABLE_PRODUCTS.find(x => x.id === pid)?.countLabel || 'Count';
                            const label = AVAILABLE_PRODUCTS.find(x => x.id === pid)?.shortName || pid;
                            return (
                              <div key={pid} className="flex items-center gap-2">
                                <span className="text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{label} {unit}:</span>
                                <input
                                  type="number"
                                  min="0"
                                  className="w-20 px-2 py-1 border rounded text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                  value={site.counts[pid] !== undefined ? site.counts[pid] : ''}
                                  onChange={e => {
                                    const val = e.target.value === '' ? '' : (parseInt(e.target.value) || 0);
                                    setSiteBreakdown(prev => prev.map(s => s.id === site.id ? { ...s, counts: { ...s.counts, [pid]: val === '' ? 0 : val } } : s));
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}`;

if (code.includes(anchor)) {
    fs.writeFileSync('components/ExportSection.tsx', code.replace(anchor, replacement));
    console.log("Patched UI successfully.");
} else {
    console.log("Could not find anchor.");
}
