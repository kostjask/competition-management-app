const fs = require('node:fs');
const path = require('node:path');
fs.writeFileSync(path.join(__dirname, 'dist/site.css'), ['tokens.css', 'base.css', 'site.css'].map(name => fs.readFileSync(path.join(__dirname, 'src', name), 'utf8')).join('\n'));
