import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const sourceImg = path.join(root, 'public', 'logottt.png');

if (!fs.existsSync(sourceImg)) {
  console.error(`Source image not found: ${sourceImg}`);
  process.exit(1);
}

console.log('Generating icons from:', sourceImg);

// Helper to create an ICO buffer containing multiple PNG images
function createIco(pngBuffers) {
  // pngBuffers: array of { width, height, buffer }
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = count * dirEntrySize;
  let offset = headerSize + dirSize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(count, 4); // Number of images

  const entries = [];
  const imageBuffers = [];

  for (const item of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // Image data size
    entry.writeUInt32LE(offset, 12); // Offset

    entries.push(entry);
    imageBuffers.push(item.buffer);
    offset += item.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...imageBuffers]);
}

// Helper to create ICNS buffer
function createIcns(icnsItems) {
  // icnsItems: array of { type: string, buffer: Buffer }
  // Types: icp4 (16), icp5 (32), icp6 (64), ic07 (128), ic08 (256), ic09 (512), ic10 (1024)
  const chunks = [];
  let totalDataLength = 0;

  for (const item of icnsItems) {
    const chunkHeader = Buffer.alloc(8);
    chunkHeader.write(item.type, 0, 4, 'ascii');
    chunkHeader.writeUInt32BE(item.buffer.length + 8, 4);
    chunks.push(chunkHeader);
    chunks.push(item.buffer);
    totalDataLength += item.buffer.length + 8;
  }

  const fileHeader = Buffer.alloc(8);
  fileHeader.write('icns', 0, 4, 'ascii');
  fileHeader.writeUInt32BE(totalDataLength + 8, 4);

  return Buffer.concat([fileHeader, ...chunks]);
}

async function run() {
  const meta = await sharp(sourceImg).metadata();
  console.log(`Original dimensions: ${meta.width}x${meta.height}`);

  // Base sharp instance with transparent background padding to square if needed
  const maxDim = Math.max(meta.width, meta.height);
  const squareBase = sharp(sourceImg)
    .resize(maxDim, maxDim, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    });

  const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
  const pngMap = {};

  for (const s of sizes) {
    pngMap[s] = await squareBase
      .clone()
      .resize(s, s)
      .png({ compressionLevel: 9 })
      .toBuffer();
    console.log(`Rendered ${s}x${s} PNG (${pngMap[s].length} bytes)`);
  }

  // 1. Write standard sizes in build/icons
  const buildIconsDir = path.join(root, 'build', 'icons');
  fs.mkdirSync(buildIconsDir, { recursive: true });

  for (const s of sizes) {
    const outPath = path.join(buildIconsDir, `${s}x${s}.png`);
    fs.writeFileSync(outPath, pngMap[s]);
  }
  console.log('✅ Generated build/icons/*.png sizes');

  // 2. Generate ICO files with [16, 24, 32, 48, 64, 128, 256]
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const icoList = icoSizes.map((s) => ({
    width: s,
    height: s,
    buffer: pngMap[s]
  }));
  const icoBuffer = createIco(icoList);

  const icoPaths = [
    path.join(buildIconsDir, 'icon.ico'),
    path.join(root, 'build', 'icon.ico'),
    path.join(root, 'public', 'icon.ico'),
    path.join(root, 'src', 'app', 'favicon.ico')
  ];

  for (const p of icoPaths) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, icoBuffer);
    console.log(`✅ Wrote ICO: ${path.relative(root, p)} (${icoBuffer.length} bytes)`);
  }

  // 3. Generate ICNS files
  const icnsItems = [
    { type: 'icp4', buffer: pngMap[16] },
    { type: 'icp5', buffer: pngMap[32] },
    { type: 'icp6', buffer: pngMap[64] },
    { type: 'ic07', buffer: pngMap[128] },
    { type: 'ic08', buffer: pngMap[256] },
    { type: 'ic09', buffer: pngMap[512] },
    { type: 'ic10', buffer: pngMap[1024] }
  ];
  const icnsBuffer = createIcns(icnsItems);

  const icnsPaths = [
    path.join(buildIconsDir, 'icon.icns'),
    path.join(root, 'build', 'icon.icns')
  ];

  for (const p of icnsPaths) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, icnsBuffer);
    console.log(`✅ Wrote ICNS: ${path.relative(root, p)} (${icnsBuffer.length} bytes)`);
  }

  // 4. Update public logo & icons
  const highResLogo = await sharp(sourceImg).png().toBuffer();
  fs.writeFileSync(path.join(root, 'public', 'logo.png'), highResLogo);
  fs.writeFileSync(path.join(root, 'public', 'icon.png'), pngMap[256]);
  console.log('✅ Updated public/logo.png and public/icon.png');

  // 5. Update splash logo
  const splashDir = path.join(root, 'splash');
  if (fs.existsSync(splashDir)) {
    fs.writeFileSync(path.join(splashDir, 'logo.png'), highResLogo);
    console.log('✅ Updated splash/logo.png');
  }

  // 6. Update build/icon.png
  fs.writeFileSync(path.join(root, 'build', 'icon.png'), pngMap[256]);
  console.log('✅ Updated build/icon.png');

  // 7. Update src/app/icon.png
  const appIconPath = path.join(root, 'src', 'app', 'icon.png');
  fs.writeFileSync(appIconPath, pngMap[256]);
  console.log('✅ Updated src/app/icon.png');

  console.log('\n🎉 All icons and logos successfully updated across the entire project!');
}

run().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
