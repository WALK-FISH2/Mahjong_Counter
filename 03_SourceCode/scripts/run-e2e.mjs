import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { preview } from 'vite';

const HOST = '127.0.0.1';
const PORT = 4173;

const previewServer = await preview({
  preview: {
    host: HOST,
    port: PORT,
    strictPort: true,
  },
});

try {
  const playwrightCliPath = fileURLToPath(import.meta.resolve('@playwright/test/cli'));
  const testProcess = spawn(
    process.execPath,
    [playwrightCliPath, 'test', ...process.argv.slice(2)],
    {
      env: process.env,
      stdio: 'inherit',
    },
  );

  const exitCode = await new Promise((resolve, reject) => {
    testProcess.once('error', reject);
    testProcess.once('exit', (code) => resolve(code ?? 1));
  });

  process.exitCode = exitCode;
} finally {
  await previewServer.close();
}
