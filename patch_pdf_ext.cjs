const fs = require('fs');

let code = fs.readFileSync('services/pdfGenerator.ts', 'utf8');

const targetStr = `    } else {
      const availTextB = \`\${availMonthsVal?.toFixed(2)} months\`;
      let durationText = \`\${extResults.monthsCovered} months\`;
      if (options.showAvailableMonths) {
        durationText += \` (Exact Available: \${availTextB})\`;
      }
      extRows.push(['Extension Duration', durationText]);
      if (options.showAvailableMonths) {
        extRows.push(['Available Duration', availTextB]);
      }
    }`;

const newStr = `    } else if (extResults.type === 'B') {
      const availTextB = \`\${availMonthsVal?.toFixed(2)} months\`;
      let durationText = \`\${extResults.monthsCovered} months\`;
      if (options.showAvailableMonths) {
        durationText += \` (Exact Available: \${availTextB})\`;
      }
      extRows.push(['Extension Duration', durationText]);
      if (options.showAvailableMonths) {
        extRows.push(['Available Duration', availTextB]);
      }
    } else if (extResults.type === 'C') {
      extRows.push(['Extension Duration', \`\${extResults.monthsCovered} months\`]);
    }`;

code = code.replace(targetStr, newStr);

fs.writeFileSync('services/pdfGenerator.ts', code);
