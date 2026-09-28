const fs = require('fs');

const OLD_VERSION = '6.8.1';
const NEW_VERSIONS = ['6.9.0', '6.9.1', '6.9.2'];
const FILES = {
  packageJson: 'package.json',
  constants: 'constants.ts',
  indexHtml: 'index.html',
  metadata: 'metadata.json',
  manifest: 'public/manifest.json'
};

// 1. package.json
let pkg = JSON.parse(fs.readFileSync(FILES.packageJson));
pkg.version = OLD_VERSION;
fs.writeFileSync(FILES.packageJson, JSON.stringify(pkg, null, 2));

// 2. index.html
let html = fs.readFileSync(FILES.indexHtml, 'utf8');
html = html.replace(/<title>CE Pricing KSA v[\d\.]+<\/title>/, '<title>CE Pricing KSA v' + OLD_VERSION + '</title>');
fs.writeFileSync(FILES.indexHtml, html);

// 3. metadata.json
let meta = JSON.parse(fs.readFileSync(FILES.metadata));
meta.name = 'CE Pricing KSA v' + OLD_VERSION;
fs.writeFileSync(FILES.metadata, JSON.stringify(meta, null, 2));

// 4. public/manifest.json
let manifest = JSON.parse(fs.readFileSync(FILES.manifest));
manifest.name = 'CE Pricing Calculator v' + OLD_VERSION;
manifest.short_name = 'CE Pricing v' + OLD_VERSION;
fs.writeFileSync(FILES.manifest, JSON.stringify(manifest, null, 2));

