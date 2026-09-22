const fs = require('fs');
let code = fs.readFileSync('components/ExportSection.tsx', 'utf8');

const anchor = `            config.selectedProducts.forEach(pid => {
                const p = AVAILABLE_PRODUCTS.find(x => x.id === pid); const inp = config.productInputs[pid];
                if(p && inp) {
                    let productName = p.name;
                    if (pid === 'utd') productName = 'UpToDate'; if (pid === 'lxd') productName = 'Lexidrug';
                    let countLabelText = p.countLabel;
                    if (p.countLabel === 'HC') countLabelText = 'clinicians'; if (p.countLabel === 'BC') countLabelText = 'active beds';
                    if (pid === 'lxd' && inp.variant && (inp.variant.includes('Seats') || inp.variant === 'Hospital Pharmacy Model')) countLabelText = 'seats';
                    const statsToPrint = inp.count > 0 ? inp.count : (inp.existingCount || 0);
                    if (statsToPrint > 0) statsParts.push(\`\${statsToPrint.toLocaleString('en-US')} \${countLabelText} for \${productName}\`);
                }
            });`;

const replacement = `            config.selectedProducts.forEach(pid => {
                const p = AVAILABLE_PRODUCTS.find(x => x.id === pid); const inp = config.productInputs[pid];
                if(p && inp) {
                    let productName = p.name;
                    if (pid === 'utd') productName = 'UpToDate'; if (pid === 'lxd') productName = 'Lexidrug';
                    
                    if (config.institutionType === "Academic Institutions") {
                        if (pid === 'utd') {
                            if (inp.facultyCount) statsParts.push(\`\${Number(inp.facultyCount).toLocaleString('en-US')} faculty members for \${productName}\`);
                            if (inp.medStudentsCount) statsParts.push(\`\${Number(inp.medStudentsCount).toLocaleString('en-US')} medical students for \${productName}\`);
                            if (inp.residentsCount) statsParts.push(\`\${Number(inp.residentsCount).toLocaleString('en-US')} residents for \${productName}\`);
                            if (inp.pharmaStudentsCount) statsParts.push(\`\${Number(inp.pharmaStudentsCount).toLocaleString('en-US')} pharma/nursing students for \${productName}\`);
                            if (config.includeHospital && inp.count) statsParts.push(\`\${Number(inp.count).toLocaleString('en-US')} hospital clinicians for \${productName}\`);
                        } else if (pid === 'lxd') {
                            if (inp.totalStudentsCount) statsParts.push(\`\${Number(inp.totalStudentsCount).toLocaleString('en-US')} total students for \${productName}\`);
                            if (config.includeHospital && inp.count) statsParts.push(\`\${Number(inp.count).toLocaleString('en-US')} hospital active beds for \${productName}\`);
                        }
                    } else {
                        let countLabelText = p.countLabel;
                        if (p.countLabel === 'HC') countLabelText = 'clinicians'; if (p.countLabel === 'BC') countLabelText = 'active beds';
                        if (pid === 'lxd' && inp.variant && (inp.variant.includes('Seats') || inp.variant === 'Hospital Pharmacy Model')) countLabelText = 'seats';
                        const statsToPrint = inp.count > 0 ? inp.count : (inp.existingCount || 0);
                        if (statsToPrint > 0) statsParts.push(\`\${statsToPrint.toLocaleString('en-US')} \${countLabelText} for \${productName}\`);
                    }
                }
            });`;

if (code.includes(anchor)) {
    fs.writeFileSync('components/ExportSection.tsx', code.replace(anchor, replacement));
    console.log("Patched successfully.");
} else {
    console.log("Could not find anchor.");
}
