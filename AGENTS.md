# Custom Agent Instructions

- **Version Bumping**: Whenever requested to bump the version of the application, ensure that you update the version number across the following files:
  - `package.json`
  - `constants.ts` (along with updating the CHANGELOG)
  - `index.html` (in the `<title>`)
  - `metadata.json` (in the `"name"` property)
  - `public/manifest.json` (in the `"name"` property)
