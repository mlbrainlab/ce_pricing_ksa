const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  '<label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Faculty (M.D. / D.O.)</label>',
  '<label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Faculty (M.D. / D.O.) <span className="text-red-500">*</span></label>'
);

code = code.replace(
  '<label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Residents</label>',
  '<label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Residents <span className="text-red-500">*</span></label>'
);

code = code.replace(
  '<label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Med Students</label>',
  '<label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Med Students <span className="text-red-500">*</span></label>'
);

code = code.replace(
  '<label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Pharma/Nursing Students</label>',
  '<label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Pharma/Nursing Students <span className="text-red-500">*</span></label>'
);

code = code.replace(
  '<label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Total Healthcare Students</label>',
  '<label className="block text-[10px] text-gray-600 dark:text-gray-400 font-bold mb-1">Total Healthcare Students <span className="text-red-500">*</span></label>'
);

// Lexi-SELECT default to true
code = code.replace(
  '<input type="checkbox" checked={input.lxdAcademicSelect ?? false}',
  '<input type="checkbox" checked={input.lxdAcademicSelect ?? true}'
);

fs.writeFileSync('App.tsx', code);
console.log("Patched App.tsx successfully.");
