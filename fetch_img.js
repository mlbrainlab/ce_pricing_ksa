import fs from 'fs';

async function run() {
  const res = await fetch("https://play-lh.googleusercontent.com/3tmATlk-zPu7kvUMraaUUcL1QGUNCD_un6tom2g08zMF0Q2asURNgDI0Kju7V9ZijY-UmwBXEsmf5Qyt4E9xi4Q=w240-h480");
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  fs.writeFileSync('eaiLogo.ts', `export const EAI_LOGO_BASE64 = 'data:image/png;base64,${base64}';`);
}
run();
