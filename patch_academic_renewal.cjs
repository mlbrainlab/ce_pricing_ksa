const fs = require('fs');
let code = fs.readFileSync('services/pricingEngine.ts', 'utf8');

const anchor = `      const standardBase = expiring * (1 + upliftVal / 100);

      if (prodId === "utd") {
        // UTD Logic
        let pathBasedPrice = 0;
        let finalTarget = target;`;

const replacement = `      const standardBase = expiring * (1 + upliftVal / 100);

      if (config.institutionType === InstitutionType.ACADEMIC) {
          let upsellRatio = 0;
          if (inputs.changeInStats && oldAcademicGross > 0 && newAcademicGross > oldAcademicGross) {
              upsellRatio = (newAcademicGross - oldAcademicGross) / oldAcademicGross;
          }
          
          let academicPathPrice = 0;
          const isStatsIncrease = inputs.changeInStats && upsellRatio > 0;
          
          if (existing === target) {
             if (isStatsIncrease) {
                 academicPathPrice = standardBase + (standardBase * upsellRatio);
                 productNotes.push(\`\${prodId.toUpperCase()}: Volume Expansion (\${(upsellRatio*100).toFixed(1)}%)\`);
             } else {
                 academicPathPrice = standardBase;
             }
          } else {
             if (isStatsIncrease) {
                 const net = baseGross * (1 - (parseFloat(inputs.baseDiscount as any) || 0) / 100);
                 academicPathPrice = applyWHT ? net / WHT_FACTOR : net;
                 productNotes.push(\`\${prodId.toUpperCase()}: Variant Upgrade + Volume Expansion (List Rate Applied)\`);
             } else {
                 if (existing === "ANYWHERE" && target === "UTDADV") {
                     academicPathPrice = standardBase * 1.08;
                     productNotes.push(\`\${prodId.toUpperCase()}: Upgrade to UTDADV (+8%)\`);
                 } else {
                     academicPathPrice = standardBase;
                 }
             }
          }
          
          actualY1Price = academicPathPrice;
          renewalBase = standardBase;
      } else if (prodId === "utd") {
        // UTD Logic
        let pathBasedPrice = 0;
        let finalTarget = target;`;

if (code.includes(anchor)) {
    fs.writeFileSync('services/pricingEngine.ts', code.replace(anchor, replacement));
    console.log("Patched pricing engine academic renewal successfully.");
} else {
    console.log("Could not find anchor.");
}
