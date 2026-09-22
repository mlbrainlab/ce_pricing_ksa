const fs = require('fs');
let code = fs.readFileSync('components/ExportSection.tsx', 'utf8');

const anchor = `  const handleBulkPaste = () => {
    const lines = bulkPasteText.split('\\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return;

    const newSites: SiteBreakdownItem[] = lines.map((line, index) => ({
      id: Date.now().toString() + index, name: line.trim(), counts: {}
    }));`;

const replacement = `  const handleBulkPaste = () => {
    const lines = bulkPasteText.split('\\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return;

    const newSites: SiteBreakdownItem[] = lines.map((line, index) => {
      let initialCounts: Record<string, number> = {};
      if (config.institutionType === "Academic Institutions") {
          const isHospital = line.trim().toLowerCase().includes('hospital');
          if (isHospital) {
              if (config.selectedProducts.includes('utd')) initialCounts['utd'] = config.productInputs['utd']?.count || 0;
              if (config.selectedProducts.includes('lxd')) initialCounts['lxd'] = config.productInputs['lxd']?.count || 0;
          } else {
              if (config.selectedProducts.includes('utd')) {
                  initialCounts['utd'] = (config.productInputs['utd']?.facultyCount || 0) + (config.productInputs['utd']?.medStudentsCount || 0) + (config.productInputs['utd']?.pharmaStudentsCount || 0) + (config.productInputs['utd']?.residentsCount || 0);
              }
              if (config.selectedProducts.includes('lxd')) {
                  initialCounts['lxd'] = config.productInputs['lxd']?.totalStudentsCount || 0;
              }
          }
      }
      return { id: Date.now().toString() + index, name: line.trim(), counts: initialCounts };
    });`;

if (code.includes(anchor)) {
    fs.writeFileSync('components/ExportSection.tsx', code.replace(anchor, replacement));
    console.log("Patched successfully.");
} else {
    console.log("Could not find anchor.");
}
