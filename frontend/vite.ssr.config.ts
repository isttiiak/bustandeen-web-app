// Separate, minimal Vite config for compiling frontend/src/seo/entry-server.tsx
// to a Node-runnable module (scripts/prerender.mjs imports the output).
// Deliberately does NOT reuse vite.config.ts's plugin list — VitePWA's
// injectManifest step only makes sense for the client bundle, and this
// build has no reason to touch it.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    ssr: 'src/seo/entry-server.tsx',
    outDir: 'dist-ssr',
    emptyOutDir: true,
    rollupOptions: {
      output: { format: 'es', entryFileNames: 'entry-server.js' },
    },
  },
});
