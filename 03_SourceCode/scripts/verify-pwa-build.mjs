import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const distDirectory = fileURLToPath(new URL('../dist/', import.meta.url));
const artifactPaths = [
  new URL('index.html', new URL('../dist/', import.meta.url)),
  new URL('manifest.webmanifest', new URL('../dist/', import.meta.url)),
  new URL('registerSW.js', new URL('../dist/', import.meta.url)),
  new URL('sw.js', new URL('../dist/', import.meta.url)),
];

await Promise.all(artifactPaths.map((artifactPath) => access(artifactPath)));

const manifestPath = new URL('manifest.webmanifest', new URL('../dist/', import.meta.url));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const serviceWorker = await readFile(
  new URL('sw.js', new URL('../dist/', import.meta.url)),
  'utf8',
);

assert.equal(manifest.name, 'M0 PWA 工程脚手架');
assert.equal(manifest.start_url, './');
assert.equal(manifest.display, 'browser');
assert.equal(manifest.icons, undefined);
assert.doesNotMatch(serviceWorker, /index\.html|assets\//);

console.log(`PWA build artifacts verified in ${distDirectory}.`);
