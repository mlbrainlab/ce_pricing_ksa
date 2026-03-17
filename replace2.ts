import * as fs from 'fs';

const files = ['services/pricingEngine.ts'];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace specific variable names
  content = content.replace(/ldInputs/g, 'lxdInputs');
  content = content.replace(/ldCurrentNet/g, 'lxdCurrentNet');
  content = content.replace(/currentLdFloor/g, 'currentLxdFloor');
  content = content.replace(/ldAddonNet/g, 'lxdAddonNet');
  content = content.replace(/ldBaseNet/g, 'lxdBaseNet');
  
  fs.writeFileSync(file, content);
});
console.log("Replacement complete.");
