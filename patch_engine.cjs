const fs = require('fs');
let code = fs.readFileSync('services/pricingEngine.ts', 'utf8');

const anchor = `const academicClinicianBase = (faculty + residents) * UTD_ACADEMIC_FACULTY_PRICE;`;
const replacement = `const academicClinicianBase = (faculty + residents) * (inputs.variant === "UTDEE" ? 210 : (inputs.variant === "UTDEE (265)" ? 265 : UTD_ACADEMIC_FACULTY_PRICE));`;

if (code.includes(anchor)) {
    fs.writeFileSync('services/pricingEngine.ts', code.replace(anchor, replacement));
    console.log("Patched pricingEngine successfully.");
} else {
    console.log("Could not find anchor.");
}
