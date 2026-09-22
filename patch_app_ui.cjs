const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// 1. Remove old inline Educational Discount block
const oldDiscountRegex = /\{\s*\(\(Number\(input\.facultyCount\)\|\|0\)\s*\+\s*\(Number\(input\.residentsCount\)\|\|0\)\s*>=\s*50\s*&&\s*\(Number\(input\.medStudentsCount\)\|\|0\)\s*\+\s*\(Number\(input\.pharmaStudentsCount\)\|\|0\)\s*>=\s*1\)\s*&&\s*\([\s\S]*?\}\)/g;
code = code.replace(oldDiscountRegex, '');

// 2. Add Educational Discount to Global layout
const durationMethodCode = `<div className="flex space-x-4">
                    <div className="w-1/3">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                        Duration
                      </label>`;

const durationMethodReplacement = `<div className="flex space-x-4">
                    <div className={institutionType === InstitutionType.ACADEMIC ? "w-1/4" : "w-1/3"}>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                        Duration
                      </label>`;
code = code.replace(durationMethodCode, durationMethodReplacement);

const methodBlockCode = `                    <div className="w-2/3">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                        Method
                      </label>`;

const methodBlockReplacement = `                    {institutionType === InstitutionType.ACADEMIC && (
                      <div className="w-1/4">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                          Edu Discount %
                        </label>
                        <div className="mt-1 flex items-center border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden bg-white dark:bg-gray-700 h-9">
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={productInputs['utd']?.educationalDiscount ?? ''}
                            onChange={(e) => {
                              let v = parseInt(e.target.value);
                              if(v > 20) v = 20;
                              if(v < 0) v = 0;
                              handleInputChange('utd', 'educationalDiscount', isNaN(v) ? '' : v);
                            }}
                            className="w-full h-full text-center text-sm p-0 bg-transparent text-gray-900 dark:text-white outline-none font-sans tabular-nums ph-no-capture"
                            style={{
                              appearance: "textfield",
                              MozAppearance: "textfield",
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className={institutionType === InstitutionType.ACADEMIC ? "w-1/2" : "w-2/3"}>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                        Method
                      </label>`;
code = code.replace(methodBlockCode, methodBlockReplacement);

// 3. Make UTD variant selector always visible
code = code.replace(
  '{product.hasVariants && (institutionType === InstitutionType.PROVIDER || includeHospital) ? (',
  '{product.hasVariants && (institutionType === InstitutionType.PROVIDER || includeHospital || product.id === "utd") ? ('
);

// 4. Auto-set educational discount inside handleInputChange
const handleInputChangeStart = `  const handleInputChange = (
    id: string,
    field: keyof ProductInput,
    value: string | number | boolean,
  ) => {`;
  
const handleInputChangeReplacement = `  const handleInputChange = (
    id: string,
    field: keyof ProductInput,
    value: string | number | boolean,
  ) => {
    // Auto-set educational discount to 20 if faculty >= 50
    if (id === "utd" && field === "facultyCount") {
      const numVal = Number(value) || 0;
      if (numVal >= 50) {
        setProductInputs(prev => ({
          ...prev,
          utd: {
            ...prev.utd,
            educationalDiscount: 20
          }
        }));
      }
    }
`;
code = code.replace(handleInputChangeStart, handleInputChangeReplacement);

fs.writeFileSync('App.tsx', code);
