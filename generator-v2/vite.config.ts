import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      // Route /api/* to api-server.js so the OAuth cookie + save endpoints
      // appear same-origin to the browser. Lets HttpOnly cookies just work.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
      },
    },
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
});
