import sharp from 'sharp';
import fs from 'fs';

async function createFavicons() {
  const transparentFile = 'public/uploads/qata-quran-logo-transparent.png';
  
  // Crop the emblem
  const emblemSharp = sharp(transparentFile).extract({
    left: 265,
    top: 105,
    width: 524,
    height: 546
  });

  // Fit into square with transparent padding
  const squareEmblem = await sharp({
    create: {
      width: 580,
      height: 580,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([{
    input: await emblemSharp.resize(540, 540, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer(),
    gravity: 'center'
  }])
  .png()
  .toBuffer();

  // Generate various sizes
  await sharp(squareEmblem).resize(512, 512).png().toFile('public/favicon-512x512.png');
  await sharp(squareEmblem).resize(192, 192).png().toFile('public/favicon-192x192.png');
  await sharp(squareEmblem).resize(180, 180).png().toFile('public/apple-touch-icon.png');
  await sharp(squareEmblem).resize(48, 48).png().toFile('public/favicon-48x48.png');
  await sharp(squareEmblem).resize(32, 32).png().toFile('public/favicon-32x32.png');
  await sharp(squareEmblem).resize(16, 16).png().toFile('public/favicon-16x16.png');
  await sharp(squareEmblem).resize(32, 32).png().toFile('public/favicon.png');

  // Also make favicon.ico from 32x32
  await sharp(squareEmblem).resize(32, 32).toFormat('png').toFile('public/favicon.ico');

  // Generate SVG favicon with embedded high-res PNG base64
  const b64 = squareEmblem.toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 580" width="100%" height="100%">
  <image href="data:image/png;base64,${b64}" x="0" y="0" width="580" height="580" />
</svg>`;
  fs.writeFileSync('public/favicon.svg', svg);

  // Also prepare full logo transparent (cropped tightly to content)
  await sharp(transparentFile).extract({
    left: 220,
    top: 105,
    width: 600,
    height: 820
  }).png().toFile('public/uploads/qata-quran-logo.png');

  // Also square icon for the footer brand badge (similar to equran squircle app icon)
  // Let's create a rounded squircle app icon like equran.id has in the footer!
  // In equran.id, it is a rounded container with dark green or emerald gradient/border,
  // or clean light background containing the emblem!
  await sharp(squareEmblem).resize(128, 128).png().toFile('public/uploads/qata-quran-icon.png');

  console.log('Favicon and logo files generated successfully!');
}

createFavicons().catch(console.error);
