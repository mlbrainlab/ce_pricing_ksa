const fs = require('fs');
let code = fs.readFileSync('components/ExportSection.tsx', 'utf8');

const oldLogic = `            if (extensionResults.useFullExtension) { end.setMonth(end.getMonth() + extensionResults.integerMonths); end.setDate(end.getDate() + extensionResults.extraDays - 1); } 
            else { end.setMonth(end.getMonth() + (extensionResults.type === 'A' ? extensionResults.integerMonths : extensionResults.monthsCovered)); end.setDate(end.getDate() - 1); }`;

const newLogic = `            if (extensionResults.useFullExtension) { 
                end.setMonth(end.getMonth() + extensionResults.integerMonths); 
                end.setDate(end.getDate() + extensionResults.extraDays - 1); 
            } else { 
                const m = extensionResults.type === 'A' ? extensionResults.integerMonths : extensionResults.monthsCovered;
                const intM = Math.floor(m);
                const frac = m - intM;
                end.setMonth(end.getMonth() + intM);
                if (frac > 0) end.setDate(end.getDate() + Math.round(frac * 30));
                end.setDate(end.getDate() - 1);
            }`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('components/ExportSection.tsx', code);
