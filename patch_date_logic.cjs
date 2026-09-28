const fs = require('fs');
let code = fs.readFileSync('components/ExportSection.tsx', 'utf8');

const oldLogic = `                const m = extensionResults.type === 'A' ? extensionResults.integerMonths : extensionResults.monthsCovered;
                const intM = Math.floor(m);
                const frac = m - intM;
                end.setMonth(end.getMonth() + intM);
                if (frac > 0) end.setDate(end.getDate() + Math.round(frac * 30));
                end.setDate(end.getDate() - 1);`;

const newLogic = `                const m = extensionResults.type === 'A' ? extensionResults.integerMonths : extensionResults.monthsCovered;
                const intM = Math.floor(m);
                const frac = m - intM;
                end.setMonth(end.getMonth() + intM);
                if (frac === 0.5) {
                    if (start.getDate() === 16) {
                        end.setMonth(end.getMonth() + 1, 1);
                    } else if (start.getDate() === 1) {
                        end.setDate(16);
                    } else {
                        end.setDate(end.getDate() + 15);
                    }
                } else if (frac > 0) {
                    end.setDate(end.getDate() + Math.round(frac * 30));
                }
                end.setDate(end.getDate() - 1);`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('components/ExportSection.tsx', code);
