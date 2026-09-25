const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// 1. allowedTargetVariants
code = code.replace(
  'const allowedTargetVariants = institutionType === InstitutionType.ACADEMIC\n                        ? (product.id === "utd" ? ["ANYWHERE", "UTDADV"] : ["BASE PKG", "BASE PKG+FLINK", "BASE PKG+FLINK+IPE"])',
  'const allowedTargetVariants = institutionType === InstitutionType.ACADEMIC\n                        ? (product.id === "utd" ? ["ANYWHERE", "UTDADV", "UTDEE"] : ["BASE PKG", "BASE PKG+FLINK", "BASE PKG+FLINK+IPE", "EE-Combo", "EE-Combo+FLINK", "EE-Combo+FLINK+IPE"])'
);

// 2. existing UTD variants
code = code.replace(
  'if (institutionType === InstitutionType.ACADEMIC && !["ANYWHERE", "UTDADV"].includes(v))',
  'if (institutionType === InstitutionType.ACADEMIC && !["ANYWHERE", "UTDADV", "UTDEE"].includes(v))'
);

// 3. existing LXD variants
// Let's replace the whole block for LXD variants to not unconditionally exclude EE-Combo for Academic
const oldLxdBlock = `                                        {product.id === "lxd" &&
                                          Object.keys(
                                            metadata?.lxdVariants || {},
                                          ).map((v) => {
                                            if (v.includes("EE-Combo"))
                                              return null;
                                            if (institutionType === InstitutionType.ACADEMIC && !["BASE PKG", "BASE PKG+FLINK", "BASE PKG+FLINK+IPE"].includes(v))
                                              return null;`;

const newLxdBlock = `                                        {product.id === "lxd" &&
                                          Object.keys(
                                            metadata?.lxdVariants || {},
                                          ).map((v) => {
                                            if (v.includes("EE-Combo") && institutionType !== InstitutionType.ACADEMIC)
                                              return null;
                                            if (institutionType === InstitutionType.ACADEMIC && !["BASE PKG", "BASE PKG+FLINK", "BASE PKG+FLINK+IPE", "EE-Combo", "EE-Combo+FLINK", "EE-Combo+FLINK+IPE"].includes(v))
                                              return null;`;

code = code.replace(oldLxdBlock, newLxdBlock);

fs.writeFileSync('App.tsx', code);
console.log("Patched variants successfully.");
