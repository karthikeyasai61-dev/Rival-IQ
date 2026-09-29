const sharp = require('sharp');
const path = require('path');

async function makeTransparent(inputBuffer, threshold = 25) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = Math.max(r, g, b);

      out[idx] = r;
      out[idx + 1] = g;
      out[idx + 2] = b;

      if (brightness < 12) {
        out[idx + 3] = 0; // Pure transparent
      } else if (brightness < threshold) {
        // Smooth anti-aliased edge
        out[idx + 3] = Math.round(((brightness - 12) / (threshold - 12)) * 255);
      } else {
        out[idx + 3] = 255;
      }
    }
  }

  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function main() {
  const inputPath = path.resolve('public/rivaliq-logo.png');

  // Trim black background
  const trimmed = await sharp(inputPath)
    .trim()
    .toBuffer({ resolveWithObject: true });

  console.log('Trimmed size:', trimmed.info.width, 'x', trimmed.info.height);

  // Full logo transparent
  const fullTransparent = await makeTransparent(trimmed.data);
  await sharp(fullTransparent).png().toFile(path.resolve('public/rivaliq-full.png'));
  console.log('Saved public/rivaliq-full.png (transparent)');

  // Extract mark
  const raw = await sharp(trimmed.data)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = raw.info.width;
  const h = raw.info.height;
  const ch = raw.info.channels;

  let markEnd = 157;
  for (let x = Math.floor(w * 0.15); x < Math.floor(w * 0.4); x++) {
    let colSum = 0;
    for (let y = 0; y < h; y++) {
      const idx = (y * w + x) * ch;
      colSum += raw.data[idx] + raw.data[idx + 1] + raw.data[idx + 2];
    }
    if (colSum === 0) {
      markEnd = x;
      break;
    }
  }

  const markCrop = await sharp(trimmed.data)
    .extract({ left: 0, top: 0, width: markEnd, height: h })
    .trim()
    .toBuffer({ resolveWithObject: true });

  const markTransparent = await makeTransparent(markCrop.data);
  await sharp(markTransparent).png().toFile(path.resolve('public/rivaliq-mark.png'));
  console.log('Saved public/rivaliq-mark.png (transparent)');

  // Also save a 32x32 and 64x64 favicon
  await sharp(markTransparent)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.resolve('public/favicon.png'));

  // Copy to public/rivaliq-logo.png as the main full logo
  await sharp(fullTransparent).png().toFile(path.resolve('public/rivaliq-logo.png'));
  console.log('Updated public/rivaliq-logo.png with transparent version');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
