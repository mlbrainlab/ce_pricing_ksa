const fs = require('fs');
let code = fs.readFileSync('components/ExportSection.tsx', 'utf8');

const anchor = `                    {config.selectedProducts.map(pid => {
                      const expectedCount = config.productInputs[pid]?.count || 0;
                      const enteredCount = siteBreakdown.reduce((sum, site) => sum + (site.counts[pid] || 0), 0);`;

const replacement = `                    {config.selectedProducts.map(pid => {
                      let expectedCount = config.productInputs[pid]?.count || 0;
                      if (config.institutionType === "Academic Institutions") {
                          if (pid === 'utd') {
                              expectedCount += (config.productInputs[pid]?.facultyCount || 0) + (config.productInputs[pid]?.medStudentsCount || 0) + (config.productInputs[pid]?.pharmaStudentsCount || 0) + (config.productInputs[pid]?.residentsCount || 0);
                          } else if (pid === 'lxd') {
                              expectedCount += (config.productInputs[pid]?.totalStudentsCount || 0);
                          }
                      }
                      const enteredCount = siteBreakdown.reduce((sum, site) => sum + (site.counts[pid] || 0), 0);`;

if (code.includes(anchor)) {
    fs.writeFileSync('components/ExportSection.tsx', code.replace(anchor, replacement));
    console.log("Patched expectedCount successfully.");
} else {
    console.log("Could not find anchor.");
}
