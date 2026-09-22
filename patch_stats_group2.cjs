const fs = require('fs');
let code = fs.readFileSync('components/ExportSection.tsx', 'utf8');

const anchor = `                    if (metrics.length > 0) {
                        if (metrics.length === 1) {
                            statsParts.push(\`\${metrics[0]} for \${productName}\`);
                        } else if (metrics.length === 2) {
                            statsParts.push(\`\${metrics[0]} and \${metrics[1]} for \${productName}\`);
                        } else {
                            const last = metrics.pop();
                            statsParts.push(\`\${metrics.join(', ')}, and \${last} for \${productName}\`);
                        }
                    }`;

const replacement = `                    if (metrics.length > 0) {
                        if (metrics.length === 1) {
                            statsParts.push(\`\${metrics[0]} for \${productName}\`);
                        } else if (metrics.length === 2) {
                            statsParts.push(\`\${metrics[0]} and \${metrics[1]} for \${productName}\`);
                        } else {
                            statsParts.push(\`\${metrics.join(', ')} for \${productName}\`);
                        }
                    }`;

if (code.includes(anchor)) {
    fs.writeFileSync('components/ExportSection.tsx', code.replace(anchor, replacement));
    console.log("Patched successfully.");
} else {
    console.log("Could not find anchor.");
}
