import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Vite config. The `@` alias keeps imports clean and enforces that
// pages import from logic/components — never reaching into providers directly.
export default defineConfig({
  plugins: [react()],
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
