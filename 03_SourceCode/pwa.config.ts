import type { VitePWAOptions } from 'vite-plugin-pwa';

export const PWA_OPTIONS = {
  injectRegister: 'auto',
  registerType: 'prompt',
  manifest: false,
  strategies: 'injectManifest',
  srcDir: 'src/pwa',
  filename: 'sw.ts',
  injectManifest: {
    globPatterns: [],
  },
} satisfies Partial<VitePWAOptions>;
