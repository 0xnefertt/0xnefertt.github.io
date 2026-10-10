import fs from "node:fs/promises";
import { createRequire } from "node:module";

// Rasterize the code-defined SVG using Astro's existing image dependency.
const require = createRequire(new URL("../astro/package.json", import.meta.url));
const sharp = require("sharp");
const publicDir = new URL("../astro/public/", import.meta.url);
const source = await fs.readFile(new URL("favicon.svg", publicDir));

await sharp(source).resize(32, 32).png().toFile(new URL("favicon-32x32.png", publicDir).pathname);
await sharp(source).resize(180, 180).png().toFile(new URL("apple-touch-icon.png", publicDir).pathname);

const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((size) => sharp(source).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (let index = 0; index < sizes.length; index += 1) {
  const entry = 6 + index * 16;
  header[entry] = sizes[index];
  header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(images[index].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += images[index].length;
}
await fs.writeFile(new URL("favicon.ico", publicDir), Buffer.concat([header, ...images]));
console.log("Generated PNG, Apple touch icon, and ICO sizes 16, 32, 48 from favicon.svg.");
