import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Load the (large, single-file) entry stylesheet WITHOUT blocking first paint.
// The HTML paints immediately (the inline splash covers the brief gap) and the
// CSS is applied as soon as it finishes downloading — instead of the browser
// stalling the whole render on a 280 KB stylesheet in <head>.
function asyncEntryCss() {
  return {
    name: 'async-entry-css',
    transformIndexHtml(html) {
      return html.replace(
        /<link rel="stylesheet"[^>]*href="(\/assets\/index-[^"]+\.css)"[^>]*>/g,
        (_m, href) =>
          `<link rel="preload" as="style" crossorigin href="${href}" onload="this.onload=null;this.rel='stylesheet'">\n  <noscript><link rel="stylesheet" crossorigin href="${href}"></noscript>`
      );
    },
  };
}

// Vite config. The `@` alias keeps imports clean and enforces that
// pages import from logic/components — never reaching into providers directly.
export default defineConfig({
  plugins: [react(), asyncEntryCss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    // Modern browsers only -> smaller, faster-parsing output.
    target: 'es2020',
    cssCodeSplit: true,
    // Skip gzip-size reporting during build (host does brotli at the edge).
    reportCompressedSize: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Content-hashed filenames = safe to cache immutably (see public/_headers).
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
