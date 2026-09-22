const fs = require('fs');
let code = fs.readFileSync('services/pricingEngine.ts', 'utf8');

// 1. Update convertToSAR definition to take config.rounding
code = code.replace(
  'const convertToSAR = (usdAmount: number): number => {',
  'const convertToSAR = (usdAmount: number, applyRounding: boolean): number => {'
);
code = code.replace(
  '  return Math.ceil(rawSar / 10) * 10; // Rounding to nearest 10 SAR for cleaner numbers',
  '  return applyRounding ? Math.ceil(rawSar / 100) * 100 : rawSar;'
);

// 2. Update usages of convertToSAR
code = code.replace(
  'grossSAR: convertToSAR(val),',
  'grossSAR: convertToSAR(val, config.rounding || false),'
);
code = code.replace(
  'const yearGrossSAR = convertToSAR(yearSum);',
  'const yearGrossSAR = convertToSAR(yearSum, config.rounding || false);'
);

// 3. Remove the entire `if (rounding)` block from lines 683-698
const roundingBlockRegex = /if\s*\(\s*rounding\s*\)\s*\{\s*selectedProducts\.forEach\(\(prodId\)\s*=>\s*\{\s*const\s*schedule\s*=\s*productSchedules\[prodId\];\s*for\s*\(let\s*i\s*=\s*0;\s*i\s*<\s*globalRows;\s*i\+\+\)\s*\{\s*const\s*val\s*=\s*schedule\[i\];\s*if\s*\(val\s*===\s*0\)\s*continue;\s*if\s*\(channel\s*===\s*ChannelType\.DIRECT\)\s*\{\s*schedule\[i\]\s*=\s*Math\.ceil\(val\s*\/\s*100\)\s*\*\s*100;\s*\}\s*else\s*\{\s*const\s*rawSAR\s*=\s*val\s*\*\s*EXCHANGE_RATE_SAR;\s*const\s*roundedSAR\s*=\s*Math\.ceil\(rawSAR\s*\/\s*100\)\s*\*\s*100;\s*schedule\[i\]\s*=\s*roundedSAR\s*\/\s*EXCHANGE_RATE_SAR;\s*\}\s*\}\s*\}\);\s*\}/g;
code = code.replace(roundingBlockRegex, '');

// 4. Update Mid-Cycle Rounding
const midCycleRoundingBlock = `    if (config.rounding) {
        if (channel === ChannelType.DIRECT) {
            totalGross = Math.ceil(totalGross / 100) * 100;
        } else {
            const rawSAR = totalGross * EXCHANGE_RATE_SAR;
            const roundedSAR = Math.ceil(rawSAR / 1000) * 1000;
            totalGross = roundedSAR / EXCHANGE_RATE_SAR;
        }
    }`;
code = code.replace(midCycleRoundingBlock, '');

const midCycleResultsBlock = `    results.midCycleResults = {
      product: config.midCycleProduct,
      dlmSelected: config.midCycleDlm,
      durationMonths,
      annualRate,
      endUserGrossUSD: totalGross,
      netPriceUSD: totalGross * netFactor,
      commissionUSD: totalGross * (1 - netFactor),
      grossSAR: totalGross * EXCHANGE_RATE_SAR,
      vatSAR: totalGross * EXCHANGE_RATE_SAR * 0.15,
      grandTotalSAR: totalGross * EXCHANGE_RATE_SAR * 1.15,
      netPriceSAR: totalGross * netFactor * EXCHANGE_RATE_SAR,
      commissionSAR: totalGross * (1 - netFactor) * EXCHANGE_RATE_SAR,
      whtApplied: config.midCycleWHT
    };`;

const replacementMidCycleResultsBlock = `    const midCycleGrossSAR = convertToSAR(totalGross, config.rounding || false);
    results.midCycleResults = {
      product: config.midCycleProduct,
      dlmSelected: config.midCycleDlm,
      durationMonths,
      annualRate,
      endUserGrossUSD: totalGross,
      netPriceUSD: totalGross * netFactor,
      commissionUSD: totalGross * (1 - netFactor),
      grossSAR: midCycleGrossSAR,
      vatSAR: midCycleGrossSAR * 0.15,
      grandTotalSAR: midCycleGrossSAR * 1.15,
      netPriceSAR: totalGross * netFactor * EXCHANGE_RATE_SAR,
      commissionSAR: totalGross * (1 - netFactor) * EXCHANGE_RATE_SAR,
      whtApplied: config.midCycleWHT
    };`;
code = code.replace(midCycleResultsBlock, replacementMidCycleResultsBlock);

fs.writeFileSync('services/pricingEngine.ts', code);
