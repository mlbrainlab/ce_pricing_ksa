const fs = require('fs');
let code = fs.readFileSync('components/ExportSection.tsx', 'utf8');

const anchor = `const [bulkPasteText, setBulkPasteText] = useState('');`;
const replacement = `${anchor}

  const [autoSitesSyncedName, setAutoSitesSyncedName] = useState("");

  React.useEffect(() => {
    if (config.institutionType === "Academic Institutions" && config.includeHospital && customerName) {
      if (!hasDesignatedSites && designatedSites === '') {
        setHasDesignatedSites(true);
        setDesignatedSites(\`\${customerName}\\n\${customerName} Hospital\`);
        setAutoSitesSyncedName(customerName);
      } else if (hasDesignatedSites && designatedSites === \`\${autoSitesSyncedName}\\n\${autoSitesSyncedName} Hospital\`) {
        setDesignatedSites(\`\${customerName}\\n\${customerName} Hospital\`);
        setAutoSitesSyncedName(customerName);
      }
    } else if (config.institutionType === "Academic Institutions" && !config.includeHospital) {
      if (hasDesignatedSites && designatedSites === \`\${autoSitesSyncedName}\\n\${autoSitesSyncedName} Hospital\`) {
        setHasDesignatedSites(false);
        setDesignatedSites('');
        setAutoSitesSyncedName('');
      }
    }
  }, [config.institutionType, config.includeHospital, customerName, hasDesignatedSites, designatedSites, autoSitesSyncedName]);`;

if (code.includes(anchor)) {
    fs.writeFileSync('components/ExportSection.tsx', code.replace(anchor, replacement));
    console.log("Patched successfully.");
} else {
    console.log("Could not find anchor.");
}
