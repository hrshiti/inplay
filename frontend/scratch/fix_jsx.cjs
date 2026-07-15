const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');
c = c.replace(/<\/h2>\s*<\/div>\s*<\/div>\s*<div className="horizontal-list hide-scrollbar" style=\{\{ gap: '18px', padding: '0 20px 20px' \}\}>/g, `</h2>\n              </div>\n            <div className="horizontal-list hide-scrollbar" style={{ gap: '18px', padding: '0 20px 20px' }}>`);
fs.writeFileSync('src/App.jsx', c);
