const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  '<label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Residents <span className="text-red-500">*</span></label>',
  '<label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Residents</label>'
);

code = code.replace(
  '<label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Pharma/Nursing Students <span className="text-red-500">*</span></label>',
  '<label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Pharma/Nursing Students</label>'
);

fs.writeFileSync('App.tsx', code);
console.log("Patched App.tsx successfully.");
