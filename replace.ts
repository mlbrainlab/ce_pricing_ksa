import * as fs from 'fs';

const files = ['App.tsx', 'components/ExportSection.tsx', 'services/pricingEngine.ts', 'constants.ts'];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace specific variable names
  content = content.replace(/ldRateVal/g, 'lxdRateVal');
  content = content.replace(/setLdRateVal/g, 'setLxdRateVal');
  content = content.replace(/effLd/g, 'effLxd');
  content = content.replace(/ldRates/g, 'lxdRates');
  content = content.replace(/currentLdUplift/g, 'currentLxdUplift');
  content = content.replace(/renewalUpliftLD/g, 'renewalUpliftLXD');
  content = content.replace(/hasLD/g, 'hasLXD');
  content = content.replace(/isLDComboVariant/g, 'isLXDComboVariant');
  content = content.replace(/shouldDisableLDDiscount/g, 'shouldDisableLXDDiscount');
  content = content.replace(/LD_VARIANTS/g, 'LXD_VARIANTS');
  
  // Replace exact word matches
  content = content.replace(/\bld\b/g, 'lxd');
  content = content.replace(/\bLD\b/g, 'LXD');
  
  fs.writeFileSync(file, content);
});
console.log("Replacement complete.");
