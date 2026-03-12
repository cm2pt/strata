#!/usr/bin/env node

/**
 * Strata — Favicon PNG Generator
 *
 * Converts the SVG favicon to PNG at required sizes.
 * Run once: node scripts/generate-favicons.mjs
 *
 * Requires: npm install -D sharp
 */

import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRAND_DIR = resolve(__dirname, "../apps/web/public/brand");
const svgBuffer = readFileSync(resolve(BRAND_DIR, "favicon.svg"));

const targets = [
  { name: "favicon-16.png", size: 16 },
  { name: "favicon-32.png", size: 32 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of targets) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(resolve(BRAND_DIR, name));
  console.log(`  Created ${name} (${size}x${size})`);
}

console.log("Done.");
