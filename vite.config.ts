import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { port: 5173, host: '0.0.0.0' },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 5000,
    assetsInlineLimit: 0,
  },
  define: {
    'process.env.API_KEY': JSON.stringify(''),
    'process.env.GEMINI_API_KEY': JSON.stringify(''),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
