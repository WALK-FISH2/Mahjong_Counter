import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

import { PWA_OPTIONS } from './pwa.config.ts';

export default defineConfig({
  plugins: [react(), VitePWA(PWA_OPTIONS)],
});
