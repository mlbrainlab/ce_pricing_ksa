const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(/new Date\(\)\.toISOString\(\)\.slice\(0, 7\)/g, 'new Date().toISOString().slice(0, 10)');

fs.writeFileSync('App.tsx', code);
