// The admin panel's own page (admin.html → src/admin-entry.tsx, v5.163.0),
// built in its own pass after the app (see the `build` script). Kept out of
// vite.config.ts on purpose: as a second HTML entry there it re-split the
// app's chunks (the static pages lazily import the app's main.tsx), and the
// app's PWA plugin would add its manifest to this page. Here it shares nothing
// with the app's build: own chunks under assets/admin/, no service worker, no
// manifest, and dist/.vite/manifest.json (read by scripts/prerender.mjs) is
// left alone.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fontsourceUnicodeRanges, rootPkg } from './vite.config.js';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(rootPkg.version),
  },
  plugins: [react(), fontsourceUnicodeRanges()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    manifest: false,
    rollupOptions: {
      input: { admin: 'admin.html' },
      output: {
        entryFileNames: 'assets/admin/[name]-[hash].js',
        chunkFileNames: 'assets/admin/[name]-[hash].js',
        assetFileNames: 'assets/admin/[name]-[hash][extname]',
        // Libraries change less often than the panel: their own cached files.
        manualChunks(id) {
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor';
          if (/\/node_modules\/(firebase|@firebase|idb)\//.test(id)) return 'firebase';
          if (id.includes('/node_modules/')) return 'vendor';
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
