// User-authorized mechanical alpha extraction for three NEW Phase-151 drafts only.
// Run inside the existing frontend container; source PNGs remain untouched.
const { createRequire } = require('node:module');
const requireFrontend = createRequire('/app/package.json');
const sharp = requireFrontend('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const inputDir = process.argv[2] || '/tmp/team4s-151-artwork-inputs';
const outputDir = process.argv[3] || '/tmp/team4s-151-artwork-alpha';
const drafts = [
  ['entry', 'role_entry_karaoke_fx.png', '6620ab15513556831d13417fc65ccbfe89ab4a1eaedd0205708bbc7f7c5f454f'],
  ['motif', 'role-karaoke_fx-motif.png', '75cc64ba6595b1d7d34230e32028b09bfad3b0f4c0209e969c9af0454fb57712'],
  ['bronze', 'rank-frame-karaoke_fx-bronze.png', 'c36c2756ad2db0d80995e026330762a8fc0de38a6ef08e3620bf2f4de623d45a'],
];
(async () => {
  if (!path.resolve(outputDir).startsWith('/tmp/team4s-151-')) throw new Error('Output must remain in the phase scratch directory.');
  await fs.mkdir(outputDir, { recursive: true });
  const report = [];
  for (const [kind, filename, sourceHash] of drafts) {
    const source = await fs.readFile(path.join(inputDir, kind + '.png'));
    if (createHash('sha256').update(source).digest('hex') !== sourceHash) throw new Error('Unapproved input: ' + kind);
    const { data, info } = await sharp(source).raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h, channels } = info;
    if (w !== 1254 || h !== 1254 || channels !== 3) throw new Error('Unexpected draft dimensions/channels');
    const count = w * h;
    const mask = new Uint8Array(count);
    const queue = new Int32Array(count);
    let head = 0, tail = 0;
    const isBackground = (pixel) => {
      const offset = pixel * 3;
      const r = data[offset], g = data[offset + 1], b = data[offset + 2];
      return Math.min(r, g, b) >= 205 && Math.max(r, g, b) - Math.min(r, g, b) <= 18;
    };
    const enqueue = (pixel) => {
      if (!mask[pixel] && isBackground(pixel)) { mask[pixel] = 1; queue[tail++] = pixel; }
    };
    for (let x = 0; x < w; x++) { enqueue(x); enqueue((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { enqueue(y * w); enqueue(y * w + w - 1); }
    // Three enclosed gaps between hair strands are background, not highlights.
    if (kind === 'motif') for (const [x, y] of [[975, 185], [995, 185], [1020, 200]]) enqueue(y * w + x);
    if (kind === 'bronze') enqueue(Math.floor(h / 2) * w + Math.floor(w / 2));
    while (head < tail) {
      const pixel = queue[head++], x = pixel % w, y = Math.floor(pixel / w);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h) enqueue(pixel + dy * w + dx);
      }
    }
    const rgba = Buffer.alloc(count * 4);
    for (let pixel = 0; pixel < count; pixel++) {
      // Keep all original RGB samples. Only connected exterior/center alpha changes.
      rgba[pixel * 4] = data[pixel * 3];
      rgba[pixel * 4 + 1] = data[pixel * 3 + 1];
      rgba[pixel * 4 + 2] = data[pixel * 3 + 2];
      const x = pixel % w, y = Math.floor(pixel / w);
      const edge = !mask[pixel] && ((x > 0 && mask[pixel - 1]) || (x < w - 1 && mask[pixel + 1]) || (y > 0 && mask[pixel - w]) || (y < h - 1 && mask[pixel + w]));
      // A one-source-pixel alpha edge suppresses the old white/checker matte fringe.
      rgba[pixel * 4 + 3] = mask[pixel] ? 0 : edge ? 96 : 255;
    }
    const output = path.join(outputDir, filename);
    await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png().toFile(output);
    const outputBytes = await fs.readFile(output);
    report.push({ kind, filename, sourceHash, outputHash: createHash('sha256').update(outputBytes).digest('hex'), width: w, height: h, removedBackgroundPixels: tail, changedRgbSamples: 0, output });
  }
  await fs.writeFile(path.join(outputDir, 'alpha-extraction.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
