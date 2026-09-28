const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(`  const [optionBMonths, setOptionBMonths] = useState<number | null>(null);`, `  const [optionBMonths, setOptionBMonths] = useState<number | null>(null);
  const [optionCValue, setOptionCValue] = useState<number>(0);
  const [optionCMonths, setOptionCMonths] = useState<number>(6);`);

code = code.replace(`      roundUpOptionB,
      optionBMonths,`, `      roundUpOptionB,
      optionBMonths,
      optionCValue,
      optionCMonths,`);

code = code.replace(`    roundUpOptionB,
    optionBMonths,`, `    roundUpOptionB,
    optionBMonths,
    optionCValue,
    optionCMonths,`);

code = code.replace(`const [extensionOption, setExtensionOption] = useState<"A" | "B">("A");`, `const [extensionOption, setExtensionOption] = useState<"A" | "B" | "C">("A");`);

code = code.replace(`                    value={extensionOption}
                    onChange={(e) =>
                      setExtensionOption(e.target.value as "A" | "B")
                    }`, `                    value={extensionOption}
                    onChange={(e) =>
                      setExtensionOption(e.target.value as "A" | "B" | "C")
                    }`);

code = code.replace(`                    <option value="B">
                      Option B (Specific Months under 100k SAR)
                    </option>`, `                    <option value="B">
                      Option B (Specific Months under 100k SAR)
                    </option>
                    <option value="C">Option C (Custom Scope / Target Value)</option>`);

fs.writeFileSync('App.tsx', code);
