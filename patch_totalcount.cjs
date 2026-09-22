const fs = require('fs');
let code = fs.readFileSync('components/ExportSection.tsx', 'utf8');

const anchor1 = `                    if (!showSitesOnly) {
                        const totalCount = config.productInputs[pid]?.count || 1; 
                        let prodM = config.years * 12;`;
const replacement1 = `                    if (!showSitesOnly) {
                        let totalCount = config.productInputs[pid]?.count || 0;
                        if (config.institutionType === "Academic Institutions") {
                            if (pid === 'utd') {
                                totalCount += (config.productInputs[pid]?.facultyCount || 0) + (config.productInputs[pid]?.medStudentsCount || 0) + (config.productInputs[pid]?.pharmaStudentsCount || 0) + (config.productInputs[pid]?.residentsCount || 0);
                            } else if (pid === 'lxd') {
                                totalCount += (config.productInputs[pid]?.totalStudentsCount || 0);
                            }
                        }
                        if (totalCount === 0) totalCount = 1;
                        let prodM = config.years * 12;`;

const anchor2 = `                  if (!showSitesOnly) {
                      const totalCount = config.productInputs[pid]?.count || 1; 
                      let prodM = config.years * 12;`;
const replacement2 = `                  if (!showSitesOnly) {
                      let totalCount = config.productInputs[pid]?.count || 0;
                        if (config.institutionType === "Academic Institutions") {
                            if (pid === 'utd') {
                                totalCount += (config.productInputs[pid]?.facultyCount || 0) + (config.productInputs[pid]?.medStudentsCount || 0) + (config.productInputs[pid]?.pharmaStudentsCount || 0) + (config.productInputs[pid]?.residentsCount || 0);
                            } else if (pid === 'lxd') {
                                totalCount += (config.productInputs[pid]?.totalStudentsCount || 0);
                            }
                        }
                        if (totalCount === 0) totalCount = 1;
                      let prodM = config.years * 12;`;

if (code.includes(anchor1)) {
    code = code.replace(anchor1, replacement1);
    code = code.replace(anchor2, replacement2);
    fs.writeFileSync('components/ExportSection.tsx', code);
    console.log("Patched successfully.");
} else {
    console.log("Could not find anchor.");
}
