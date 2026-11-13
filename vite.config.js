import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    // The account already has a separate Pages project at /assets/.
    assetsDir: 'blog-assets',
    rolldownOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        article: resolve(import.meta.dirname, 'xsleaks-part1.html'),
        csptEnglish: resolve(import.meta.dirname, 'cspt-to-ato.html'),
        csptArabic: resolve(import.meta.dirname, 'cspt-to-ato-ar.html'),
        notFound: resolve(import.meta.dirname, '404.html'),
      },
    },
  },
});
