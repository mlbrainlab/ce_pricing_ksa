const fs = require('fs');
let code = fs.readFileSync('components/ExportSection.tsx', 'utf8');

const regex = /const end = new Date\(start\);\s+end\.setMonth\(end\.getMonth\(\) \+ \(r\.termMonths \|\| 12\)\);\s+end\.setDate\(end\.getDate\(\) \- 1\);/g;

const newTarget = `const end = new Date(start);
                  const m = (r.termMonths || 12);
                  const intM = Math.floor(m);
                  const frac = m - intM;
                  end.setMonth(end.getMonth() + intM);
                  if (frac === 0.5) {
                      if (start.getDate() === 16) end.setMonth(end.getMonth() + 1, 1);
                      else if (start.getDate() === 1) end.setDate(16);
                      else end.setDate(end.getDate() + 15);
                  } else if (frac > 0) {
                      end.setDate(end.getDate() + Math.round(frac * 30));
                  }
                  end.setDate(end.getDate() - 1);`;

code = code.replace(regex, newTarget);
fs.writeFileSync('components/ExportSection.tsx', code);
