import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    // the API runs on its own port in development
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: false } },
  },
});
