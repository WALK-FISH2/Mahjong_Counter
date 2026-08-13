import type { EngineWorkerPortFactory } from '../../application/engine-worker/engine-worker-client';

export const createBrowserEngineWorkerPort: EngineWorkerPortFactory = () => {
  const worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
  return worker;
};
