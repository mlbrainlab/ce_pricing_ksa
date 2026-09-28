const fs = require('fs');

const NEW_VERSION = '6.9.2';
const FILES = {
  packageJson: 'package.json',
  constants: 'constants.ts',
  indexHtml: 'index.html',
  metadata: 'metadata.json',
  manifest: 'public/manifest.json'
};

// 1. package.json
let pkg = JSON.parse(fs.readFileSync(FILES.packageJson));
pkg.version = NEW_VERSION;
fs.writeFileSync(FILES.packageJson, JSON.stringify(pkg, null, 2));

// 2. index.html
let html = fs.readFileSync(FILES.indexHtml, 'utf8');
html = html.replace(/<title>CE Pricing KSA v[\d\.]+<\/title>/, '<title>CE Pricing KSA v' + NEW_VERSION + '</title>');
fs.writeFileSync(FILES.indexHtml, html);

// 3. metadata.json
let meta = JSON.parse(fs.readFileSync(FILES.metadata));
meta.name = 'CE Pricing KSA v' + NEW_VERSION;
fs.writeFileSync(FILES.metadata, JSON.stringify(meta, null, 2));

// 4. public/manifest.json
let manifest = JSON.parse(fs.readFileSync(FILES.manifest));
manifest.name = 'CE Pricing Calculator v' + NEW_VERSION;
manifest.short_name = 'CE Pricing v' + NEW_VERSION;
fs.writeFileSync(FILES.manifest, JSON.stringify(manifest, null, 2));

// 5. constants.ts
let consts = fs.readFileSync(FILES.constants, 'utf8');
consts = consts.replace(/export const APP_VERSION = "[\d\.]+";/, 'export const APP_VERSION = "' + NEW_VERSION + '";');

const changelogEntry = '  {\n    version: "' + NEW_VERSION + '",\n    date: "' + new Date().toISOString().split('T')[0] + '",\n    changes: [\n      "Feature: Added \'Round up value\' checkbox support to Option C for indirect channels (Fulfillment / Partner Sourced).",\n      "Fix: Extension Dates now accurately compute partial months (e.g. 0.5 months = 15 days) instead of truncating to integers.",\n    ],\n  },';

consts = consts.replace(/export const CHANGELOG: ChangelogEntry\[\] = \[/, 'export const CHANGELOG: ChangelogEntry[] = [\n' + changelogEntry);

fs.writeFileSync(FILES.constants, consts);
