const fs = require('fs');
let code = fs.readFileSync('services/pricingEngine.ts', 'utf8');

code = code.replace(
  'const vPrice = UTD_VARIANTS[inputs.variant] || 0;',
  'const vPrice = inputs.variant === "UTDADV" ? UTD_VARIANTS["ANYWHERE"] : (UTD_VARIANTS[inputs.variant] || 0);'
);

code = code.replace(
  'const lxdBase = inputs.lxdAcademicBase ? LXD_ACADEMIC_BASE : 0;',
  'const lxdBase = (inputs.lxdAcademicBase ?? true) ? LXD_ACADEMIC_BASE : 0;'
);

fs.writeFileSync('services/pricingEngine.ts', code);
