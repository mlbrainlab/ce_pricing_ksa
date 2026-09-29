const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const oldUTD = `{institutionType === InstitutionType.ACADEMIC && product.id === 'utd' && (`;
const newUTD = `{institutionType === InstitutionType.ACADEMIC && product.id === 'utd' && (!isRenewal || input.changeInStats) && (`;
code = code.replace(oldUTD, newUTD);

const oldLXD = `{institutionType === InstitutionType.ACADEMIC && product.id === 'lxd' && (`;
const newLXD = `{institutionType === InstitutionType.ACADEMIC && product.id === 'lxd' && (!isRenewal || input.changeInStats) && (`;
code = code.replace(oldLXD, newLXD);

fs.writeFileSync('App.tsx', code);
console.log("Patched App.tsx new inputs successfully.");
