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
if (!pdf.includes('const formatStartDate =')) {
  pdf = pdf.replace('export async function generateQuotePDF', formatFnStr + '\nexport async function generateQuotePDF');
  fs.writeFileSync('services/pdfGenerator.ts', pdf);
}

let excel = fs.readFileSync('services/excelGenerator.ts', 'utf8');
if (!excel.includes('const formatStartDate =')) {
  excel = excel.replace('export async function generateQuoteExcel', formatFnStr + '\nexport async function generateQuoteExcel');
  fs.writeFileSync('services/excelGenerator.ts', excel);
}
