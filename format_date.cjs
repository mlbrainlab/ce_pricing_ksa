const fs = require('fs');

const formatFnStr = `const formatStartDate = (val: string) => {
  if (!val) return val;
  const parts = val.split('-');
  const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (parts.length === 3) {
    return \`\${parseInt(parts[2])} \${mo[parseInt(parts[1]) - 1]} \${parts[0]}\`;
  } else if (parts.length === 2) {
    return \`\${mo[parseInt(parts[1]) - 1]} \${parts[0]}\`;
  }
  return val;
};
`;

let pdf = fs.readFileSync('services/pdfGenerator.ts', 'utf8');
if (!pdf.includes('formatStartDate')) {
  pdf = pdf.replace('export const generatePDF =', formatFnStr + '\nexport const generatePDF =');
  pdf = pdf.replace(/config\.startMonthYear/g, 'formatStartDate(config.startMonthYear || "")');
  fs.writeFileSync('services/pdfGenerator.ts', pdf);
}

let excel = fs.readFileSync('services/excelGenerator.ts', 'utf8');
if (!excel.includes('formatStartDate')) {
  excel = excel.replace('export const generateExcel =', formatFnStr + '\nexport const generateExcel =');
  excel = excel.replace(/config\.startMonthYear/g, 'formatStartDate(config.startMonthYear || "")');
  fs.writeFileSync('services/excelGenerator.ts', excel);
}
