const fs = require('fs');
let code = fs.readFileSync('types.ts', 'utf8');

const anchor = `  // Academic specific fields
  facultyCount?: number | "";
  residentsCount?: number | "";
  medStudentsCount?: number | "";
  pharmaStudentsCount?: number | "";
  totalStudentsCount?: number | "";`;

const replacement = `  // Academic specific fields
  facultyCount?: number | "";
  residentsCount?: number | "";
  medStudentsCount?: number | "";
  pharmaStudentsCount?: number | "";
  totalStudentsCount?: number | "";
  existingFacultyCount?: number | "";
  existingResidentsCount?: number | "";
  existingMedStudentsCount?: number | "";
  existingPharmaStudentsCount?: number | "";
  existingTotalStudentsCount?: number | "";`;

if (code.includes(anchor)) {
    fs.writeFileSync('types.ts', code.replace(anchor, replacement));
    console.log("Patched types.ts successfully.");
} else {
    console.log("Could not find anchor.");
}
