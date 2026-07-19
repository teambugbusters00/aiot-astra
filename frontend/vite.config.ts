import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Expanded to an object to prevent the 96-second NVIDIA response from hanging up
      '/ai': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        timeout: 180000,       // 3 minutes (180,000 ms)
        proxyTimeout: 180000,  // 3 minutes
      },
      '/auth':       'http://127.0.0.1:4000',
      '/simulation': 'http://127.0.0.1:4000',
      '/mqtt':       'http://127.0.0.1:4000',
      '/deploy':     'http://127.0.0.1:4000',
      '/projects':   'http://127.0.0.1:4000',
      '/serial':     'http://127.0.0.1:4000',
      '/health':     'http://127.0.0.1:4000',
      '/socket.io':  { target: 'http://127.0.0.1:4000', ws: true },
    },
  },
  build: { outDir: '../backend/public', emptyOutDir: true },
});