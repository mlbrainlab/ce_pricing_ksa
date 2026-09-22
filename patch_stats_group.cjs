const fs = require('fs');
let code = fs.readFileSync('components/ExportSection.tsx', 'utf8');

const anchor = `            config.selectedProducts.forEach(pid => {
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

const replacement = `            config.selectedProducts.forEach(pid => {
                const p = AVAILABLE_PRODUCTS.find(x => x.id === pid); const inp = config.productInputs[pid];
                if(p && inp) {
                    let productName = p.name;
                    if (pid === 'utd') productName = 'UpToDate'; if (pid === 'lxd') productName = 'Lexidrug';
                    
                    const metrics: string[] = [];
                    if (config.institutionType === "Academic Institutions") {
                        if (pid === 'utd') {
                            if (inp.facultyCount) metrics.push(\`\${Number(inp.facultyCount).toLocaleString('en-US')} faculty members\`);
                            if (inp.medStudentsCount) metrics.push(\`\${Number(inp.medStudentsCount).toLocaleString('en-US')} medical students\`);
                            if (inp.residentsCount) metrics.push(\`\${Number(inp.residentsCount).toLocaleString('en-US')} residents\`);
                            if (inp.pharmaStudentsCount) metrics.push(\`\${Number(inp.pharmaStudentsCount).toLocaleString('en-US')} pharma/nursing students\`);
                            if (config.includeHospital && inp.count) metrics.push(\`\${Number(inp.count).toLocaleString('en-US')} hospital clinicians\`);
                        } else if (pid === 'lxd') {
                            if (inp.totalStudentsCount) metrics.push(\`\${Number(inp.totalStudentsCount).toLocaleString('en-US')} total students\`);
                            if (config.includeHospital && inp.count) metrics.push(\`\${Number(inp.count).toLocaleString('en-US')} hospital active beds\`);
                        }
                    } else {
                        let countLabelText = p.countLabel;
                        if (p.countLabel === 'HC') countLabelText = 'clinicians'; if (p.countLabel === 'BC') countLabelText = 'active beds';
                        if (pid === 'lxd' && inp.variant && (inp.variant.includes('Seats') || inp.variant === 'Hospital Pharmacy Model')) countLabelText = 'seats';
                        const statsToPrint = inp.count > 0 ? inp.count : (inp.existingCount || 0);
                        if (statsToPrint > 0) metrics.push(\`\${statsToPrint.toLocaleString('en-US')} \${countLabelText}\`);
                    }
                    
                    if (metrics.length > 0) {
                        if (metrics.length === 1) {
                            statsParts.push(\`\${metrics[0]} for \${productName}\`);
                        } else if (metrics.length === 2) {
                            statsParts.push(\`\${metrics[0]} and \${metrics[1]} for \${productName}\`);
                        } else {
                            const last = metrics.pop();
                            statsParts.push(\`\${metrics.join(', ')}, and \${last} for \${productName}\`);
                        }
                    }
                }
            });`;

if (code.includes(anchor)) {
    fs.writeFileSync('components/ExportSection.tsx', code.replace(anchor, replacement));
    console.log("Patched successfully.");
} else {
    console.log("Could not find anchor.");
}
