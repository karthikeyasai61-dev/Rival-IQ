const fs = require('fs');
const path = require('path');

const fullB64 = fs.readFileSync('public/rivaliq-full.png').toString('base64');
const markB64 = fs.readFileSync('public/rivaliq-mark.png').toString('base64');

fs.mkdirSync('src/lib/brand', { recursive: true });

const content = [
  '// ============================================================',
  '// RivalIQ Brand Assets Data (Base64 for high-res PDF embedding)',
  '// ============================================================',
  '',
  `export const RIVALIQ_LOGO_BASE64 = 'data:image/png;base64,${fullB64}';`,
  `export const RIVALIQ_MARK_BASE64 = 'data:image/png;base64,${markB64}';`,
  '',
].join('\n');

fs.writeFileSync('src/lib/brand/logoData.ts', content, 'utf8');
console.log('Successfully generated src/lib/brand/logoData.ts');
