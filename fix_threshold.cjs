const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');
code = code.replace(
  '{ ((Number(input.facultyCount)||0) + (Number(input.medStudentsCount)||0) >= 1) && (',
  '{ ((Number(input.facultyCount)||0) + (Number(input.residentsCount)||0) >= 50 && (Number(input.medStudentsCount)||0) + (Number(input.pharmaStudentsCount)||0) >= 1) && ('
);
fs.writeFileSync('App.tsx', code);
