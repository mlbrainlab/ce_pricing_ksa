const fs = require('fs');
let code = fs.readFileSync('components/ExportSection.tsx', 'utf8');

// Replace input type="month"
code = code.replace(/type="month"/g, 'type="date"');

// Replace Date parsing logic:
code = code.replace(/const \[yearStr, monthStr\] = startMonthYear.split\('-'\);\s*const start = new Date\(parseInt\(yearStr\), parseInt\(monthStr\) - 1, 1\);/g, 
  `const [yearStr, monthStr, dayStr] = startMonthYear.split('-');
            const start = new Date(parseInt(yearStr), parseInt(monthStr) - 1, dayStr ? parseInt(dayStr) : 1);`);

fs.writeFileSync('components/ExportSection.tsx', code);
