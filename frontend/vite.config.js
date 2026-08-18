import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8096,
    // The app always calls /api/* on its own origin. In production Vercel routes
    // that to the serverless proxy; in development this forwards it to the
    // standalone proxy so no environment-specific base URL is needed anywhere.
    proxy: {
      '/api': {
        target: process.env.PROXY_TARGET || 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
