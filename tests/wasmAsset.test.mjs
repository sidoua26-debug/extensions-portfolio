import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WASM_GZ_PATH = path.join(ROOT, 'assets/wasm/pandoc.wasm.gz');
const LICENSE_PATH = path.join(ROOT, 'assets/wasm/LICENSE.txt');
const EXPECTED_UNCOMPRESSED_SHA256 = 'b47c9de52b5b45f103c2dac6fea52591aeafe3dd6cafed13331b67575233a2ff';
const EXPECTED_UNCOMPRESSED_SIZE = 58580800;
const CLOUDFLARE_LIMIT_BYTES = 25 * 1024 * 1024; // 25 MiB

describe('Step 1: WASM Asset Verification', () => {
  it('1. pandoc.wasm.gz exists and is within hosting and platform limits', () => {
    assert.ok(fs.existsSync(WASM_GZ_PATH), 'assets/wasm/pandoc.wasm.gz must exist');
    const stat = fs.statSync(WASM_GZ_PATH);
    assert.ok(
      stat.size < CLOUDFLARE_LIMIT_BYTES,
      `WASM gzip (${stat.size} bytes) must be strictly less than Cloudflare Pages 25 MiB limit (${CLOUDFLARE_LIMIT_BYTES} bytes)`
    );
    assert.ok(
      stat.size < 50 * 1024 * 1024,
      'WASM gzip must be strictly less than GitHub 50 MB warning threshold'
    );
  });

  it('2. pandoc.wasm.gz decompresses byte-for-byte to the exact verified Pandoc binary via DecompressionStream', async () => {
    const gzBuf = fs.readFileSync(WASM_GZ_PATH);
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(gzBuf);
    writer.close();

    const reader = ds.readable.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const decompressed = Buffer.concat(chunks);

    assert.equal(
      decompressed.length,
      EXPECTED_UNCOMPRESSED_SIZE,
      `Decompressed size must exactly match ${EXPECTED_UNCOMPRESSED_SIZE} bytes`
    );

    const hash = crypto.createHash('sha256').update(decompressed).digest('hex');
    assert.equal(
      hash,
      EXPECTED_UNCOMPRESSED_SHA256,
      'Decompressed SHA-256 must match the verified upstream pandoc.wasm hash'
    );
  });

  it('3. Repository does NOT contain uncompressed raw WASM files', () => {
    function findWasmFiles(dir) {
      let results = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results = results.concat(findWasmFiles(fullPath));
        } else if (entry.name.endsWith('.wasm')) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const rawWasmFiles = findWasmFiles(ROOT);
    assert.deepEqual(
      rawWasmFiles,
      [],
      `Found raw uncompressed WASM files in repo: ${rawWasmFiles.join(', ')}`
    );
  });

  it('4. Licensing notice is present with GPL-2.0+ and MIT attribution', () => {
    assert.ok(fs.existsSync(LICENSE_PATH), 'assets/wasm/LICENSE.txt must exist');
    const content = fs.readFileSync(LICENSE_PATH, 'utf-8');
    assert.ok(content.includes('GNU General Public License'), 'Must mention GPL');
    assert.ok(content.includes('John MacFarlane'), 'Must credit John MacFarlane');
    assert.ok(content.includes('MIT License'), 'Must credit pandoc-wasm MIT wrapper');
    assert.ok(content.includes('Johannes Wilm'), 'Must credit Johannes Wilm');
  });
});
