import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

import { commonSimpleRuleValidationPlugin } from './build/rules/common-simple-rule-validation-plugin';
import { PWA_OPTIONS } from './pwa.config.ts';

export default defineConfig({
  plugins: [commonSimpleRuleValidationPlugin(), react(), VitePWA(PWA_OPTIONS)],
});
