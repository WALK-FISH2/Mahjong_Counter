import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

import { commonSimpleRuleValidationPlugin } from './build/rules/common-simple-rule-validation-plugin';
import { coreEncyclopediaArtifactsPlugin } from './build/encyclopedia/core-encyclopedia-artifacts.ts';
import { PWA_OPTIONS } from './pwa.config.ts';

export default defineConfig({
  plugins: [
    commonSimpleRuleValidationPlugin(),
    coreEncyclopediaArtifactsPlugin(),
    react(),
    VitePWA(PWA_OPTIONS),
  ],
});
