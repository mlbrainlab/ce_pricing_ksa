const fs = require('fs');

let code = fs.readFileSync('services/pricingEngine.ts', 'utf8');

const oldCode = `    if (config.extensionOption === "A") {`;
const newCode = `    if (config.extensionOption === "A") {`;

code = code.replace(`    } else {
      const maxSARExVAT = 100000 / 1.15;`, `    } else if (config.extensionOption === "B") {
      const maxSARExVAT = 100000 / 1.15;`);

const optionCCode = `    } else if (config.extensionOption === "C") {
      const targetValue = config.optionCValue || 0;
      const monthsCovered = config.optionCMonths || 0;
      const monthlyCost = targetValue / 12;
      const endUserPrice = monthsCovered * monthlyCost;
      results.extensionResults = {
        type: "C",
        variant: config.extensionVariant,
        targetValue,
        monthlyCost,
        monthsCovered,
        endUserPrice,
        commission: endUserPrice * (1 - netFactor),
        netPrice: endUserPrice * netFactor,
      };
    }
`;

code = code.replace(`        roundUpOptionB: config.roundUpOptionB,
      };
    }
  }

  // Mid-Cycle Add-on Logic`, `        roundUpOptionB: config.roundUpOptionB,
      };
${optionCCode}  }

  // Mid-Cycle Add-on Logic`);

fs.writeFileSync('services/pricingEngine.ts', code);
console.log('patched engine');
