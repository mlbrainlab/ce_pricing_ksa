const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const anchor = `{isCountDisabled && " (Ignored)"}`;
const replacement = `{isCountDisabled && " (Ignored)"}
                                      <span className="text-red-500 ml-1">*</span>`;

if (code.includes(anchor)) {
    fs.writeFileSync('App.tsx', code.replace(anchor, replacement));
    console.log("Patched count label successfully.");
} else {
    console.log("Could not find anchor.");
}
