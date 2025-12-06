// Simple script to generate PWA icons
// This creates simple colored square icons as placeholders
// You can replace these with proper icons later

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

// Simple SVG template for icons
function createIconSVG(size, color = '#0f172a') {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${color}" rx="${size * 0.1}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.25}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">LT</text>
</svg>`;
}

async function generateIcons() {
  console.log('Creating PWA icons...');

  // Create 192x192 PNG icon
  const svg192 = createIconSVG(192);
  await sharp(Buffer.from(svg192))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('✓ Created pwa-192x192.png');

  // Create 512x512 PNG icon
  const svg512 = createIconSVG(512);
  await sharp(Buffer.from(svg512))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('✓ Created pwa-512x512.png');

  console.log('\n✅ PWA icons created successfully!');
  console.log('   You can replace these with custom icons later.');
}

generateIcons().catch(console.error);
