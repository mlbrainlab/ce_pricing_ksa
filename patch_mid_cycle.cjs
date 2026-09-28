const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(/const \[year, month\] = midCycleStartDate\.split\("-"\);\s*if \(year && month\) {\s*setStartMonthYear\(`\$\{year\}-\$\{month\}`\);\s*}/g, 
  `setStartMonthYear(midCycleStartDate);`);

fs.writeFileSync('App.tsx', code);
