import sharp from 'sharp';
import fs from 'fs';

async function run() {
  const file = fs.readFileSync('base64.txt', 'utf8');
  const base64Str = file.replace('data:image/png;base64,', '');
  const buffer = Buffer.from(base64Str, 'base64');
  const md = await sharp(buffer).metadata();
  console.log('width:', md.width, 'height:', md.height);
}
run();
