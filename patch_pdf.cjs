const fs = require('fs');
let code = fs.readFileSync('services/pdfGenerator.ts', 'utf8');

code = code.replace(
  'DealConfiguration, CalculationOutput, ChannelType, DealType',
  'DealConfiguration, CalculationOutput, ChannelType, DealType, InstitutionType'
);

code = code.replace(
  'doc.text(customerName || "Valued Customer", 14, currentY);',
  `doc.text(customerName || "Valued Customer", 14, currentY);
  
  if (config.institutionType === InstitutionType.ACADEMIC && config.includeHospital && customerName) {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(\`Designated Sites: \${customerName}, \${customerName} Hospital\`, 14, currentY + 5);
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
  }`
);

const statsListCode = `      const statsList = config.selectedProducts.map(id => {
          const inp = config.productInputs[id];
          if (!inp || !inp.count) return null;
          return \`\${AVAILABLE_PRODUCTS.find(p => p.id === id)?.shortName}: \${inp.count} \${AVAILABLE_PRODUCTS.find(p => p.id === id)?.countLabel}\`;
      }).filter(Boolean).join(' | ');`;

const statsListReplacement = `      const statsList = config.selectedProducts.map(id => {
          const inp = config.productInputs[id];
          if (!inp) return null;
          if (config.institutionType === InstitutionType.ACADEMIC) {
              if (id === 'utd') {
                  const parts = [];
                  if (inp.facultyCount) parts.push(\`Faculty: \${inp.facultyCount}\`);
                  if (inp.medStudentsCount) parts.push(\`Med Students: \${inp.medStudentsCount}\`);
                  if (inp.residentsCount) parts.push(\`Residents: \${inp.residentsCount}\`);
                  if (inp.pharmaStudentsCount) parts.push(\`Pharma/Nursing: \${inp.pharmaStudentsCount}\`);
                  if (config.includeHospital && inp.count) parts.push(\`Hospital HC: \${inp.count}\`);
                  return parts.length > 0 ? \`UpToDate: \${parts.join(', ')}\` : null;
              } else if (id === 'lxd') {
                  const parts = [];
                  if (inp.totalStudentsCount) parts.push(\`Total Students: \${inp.totalStudentsCount}\`);
                  if (inp.lxdAcademicSelect) parts.push(\`Lexi-SELECT (Mobile App)\`);
                  if (inp.lxdAcademicMartindale) parts.push(\`Martindale\`);
                  if (config.includeHospital && inp.count) parts.push(\`Hospital Beds: \${inp.count}\`);
                  return parts.length > 0 ? \`Lexicomp: \${parts.join(', ')}\` : null;
              }
          }
          if (!inp.count) return null;
          return \`\${AVAILABLE_PRODUCTS.find(p => p.id === id)?.shortName}: \${inp.count} \${AVAILABLE_PRODUCTS.find(p => p.id === id)?.countLabel}\`;
      }).filter(Boolean).join(' | ');`;

code = code.replace(statsListCode, statsListReplacement);

// We need to fix one more thing. The Deal Summary table might overlap if Designated Sites adds an extra line in the introduction. 
// But currentY is fixed: currentY += 15 before Deal Context Summary. So it just draws inside the whitespace. 5 is safe.

fs.writeFileSync('services/pdfGenerator.ts', code);
