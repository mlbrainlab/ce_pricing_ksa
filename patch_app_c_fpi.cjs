const fs = require('fs');

let code = fs.readFileSync('App.tsx', 'utf8');

const oldFpi = `  const currentFpiVal = useMemo(() => {
    if (extensionOption === "A") {
      return extensionFPI !== null
        ? extensionFPI
        : extensionResults?.fpiPercentage ?? 0;
    } else {
      return extensionFPI !== null ? extensionFPI : defaultOptionBFPI;
    }
  }, [extensionOption, extensionFPI, extensionResults, defaultOptionBFPI]);

  const extensionRequiresFinanceApproval = useMemo(() => {
    if (!isExtensionQuote) return false;
    return currentFpiVal < 5;
  }, [isExtensionQuote, currentFpiVal]);`;

const newFpi = `  const currentFpiVal = useMemo(() => {
    if (extensionOption === "A") {
      return extensionFPI !== null
        ? extensionFPI
        : extensionResults?.fpiPercentage ?? 0;
    } else if (extensionOption === "B") {
      return extensionFPI !== null ? extensionFPI : defaultOptionBFPI;
    } else {
      return 5; // Option C doesn't use FPI, default to 5 so no finance warning
    }
  }, [extensionOption, extensionFPI, extensionResults, defaultOptionBFPI]);

  const extensionRequiresFinanceApproval = useMemo(() => {
    if (!isExtensionQuote) return false;
    if (extensionOption === "C") return false; // Option C doesn't use FPI
    return currentFpiVal < 5;
  }, [isExtensionQuote, currentFpiVal, extensionOption]);`;

code = code.replace(oldFpi, newFpi);

fs.writeFileSync('App.tsx', code);
