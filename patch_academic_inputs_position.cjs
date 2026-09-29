const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const anchor1 = `{institutionType === InstitutionType.ACADEMIC && product.id === 'utd' && (!isRenewal || input.changeInStats) && (`;
const idx1 = code.indexOf(anchor1);

// Find the end of the LXD block. It ends with:
const anchor2 = `                                    </div>
                                  </div>
                                )}`;
const idx2 = code.indexOf(anchor2, code.indexOf("lxdAcademicMartindale", idx1)) + anchor2.length;

const blockToMove = code.substring(idx1, idx2);

// Remove the block from its current location
code = code.substring(0, idx1) + code.substring(idx2);

// Find where to insert it: After the "Switching or changing stats?" checkbox block.
const insertAnchor = `                                    <span className="ml-2 text-xs text-purple-700 dark:text-purple-300 font-medium">
                                      Switching or changing stats?
                                    </span>
                                  </div>
                                )}`;
                                
const insertIdx = code.indexOf(insertAnchor) + insertAnchor.length;

// Insert the block
code = code.substring(0, insertIdx) + '\n\n                                {/* Moved Academic Inputs */}\n                                ' + blockToMove + code.substring(insertIdx);

fs.writeFileSync('App.tsx', code);
console.log("Moved academic inputs successfully.");
