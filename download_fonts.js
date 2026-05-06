import fs from 'fs';
import https from 'https';
import path from 'path';

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
         return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode >= 400) {
         return reject(new Error(`Failed with status: ${response.statusCode} for ${url}`));
      }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });
}

async function run() {
   fs.mkdirSync('./public/fonts', {recursive: true});
   try {
     console.log('Downloading Inter Regular...');
     await download('https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/Inter-Regular.ttf', './public/fonts/Inter-Regular.ttf');
     console.log('Downloading Inter Bold...');
     await download('https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/Inter-Bold.ttf', './public/fonts/Inter-Bold.ttf');
     
     console.log('Downloading Fira Sans Regular...');
     await download('https://raw.githubusercontent.com/bBoxType/FiraSans/master/Fira_Sans_4_3/Fonts/Fira_Sans_TTF_4301/Normal/Roman/FiraSans-Regular.ttf', './public/fonts/FiraSans-Regular.ttf');
     console.log('Downloading Fira Sans Bold...');
     await download('https://raw.githubusercontent.com/bBoxType/FiraSans/master/Fira_Sans_4_3/Fonts/Fira_Sans_TTF_4301/Normal/Roman/FiraSans-Bold.ttf', './public/fonts/FiraSans-Bold.ttf');

     console.log('Downloading Noto Sans Arabic Regular...');
     await download('https://raw.githubusercontent.com/googlefonts/noto-fonts/main/unhinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf', './public/fonts/NotoSansArabic-Regular.ttf');
     console.log('Downloading Noto Sans Arabic Bold...');
     await download('https://raw.githubusercontent.com/googlefonts/noto-fonts/main/unhinted/ttf/NotoSansArabic/NotoSansArabic-Bold.ttf', './public/fonts/NotoSansArabic-Bold.ttf');
     
     console.log('Done!');
   } catch (e) {
     console.error('Error downloading fonts:', e);
   }
}
run();
