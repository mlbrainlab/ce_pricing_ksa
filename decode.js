const fs = require('fs');
let str = fs.readFileSync('base64.txt', 'utf8');
str = str.replace('data:image/png;base64,', '');
fs.writeFileSync('decoded.png', Buffer.from(str, 'base64'));
