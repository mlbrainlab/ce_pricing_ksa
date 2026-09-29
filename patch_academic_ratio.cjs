const fs = require('fs');
let code = fs.readFileSync('services/pricingEngine.ts', 'utf8');

const anchor = `      if (config.institutionType === InstitutionType.ACADEMIC) {
          let upsellRatio = 0;
          if (inputs.changeInStats && oldAcademicGross > 0 && newAcademicGross > oldAcademicGross) {
              upsellRatio = (newAcademicGross - oldAcademicGross) / oldAcademicGross;
          }
          
          let academicPathPrice = 0;
          const isStatsIncrease = inputs.changeInStats && upsellRatio > 0;`;

const replacement = `      if (config.institutionType === InstitutionType.ACADEMIC) {
          let upsellRatio = 0;
          const triggeredChange = inputs.changeInStats || existing !== target;
          if (triggeredChange && oldAcademicGross > 0 && newAcademicGross > oldAcademicGross) {
              upsellRatio = (newAcademicGross - oldAcademicGross) / oldAcademicGross;
          }
          
          let academicPathPrice = 0;
          const isStatsIncrease = triggeredChange && upsellRatio > 0;`;

if (code.includes(anchor)) {
    fs.writeFileSync('services/pricingEngine.ts', code.replace(anchor, replacement));
    console.log("Patched upsellRatio successfully.");
} else {
    console.log("Could not find anchor.");
}
