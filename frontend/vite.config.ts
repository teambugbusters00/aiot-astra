import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/ai':         'http://localhost:4000',
      '/auth':       'http://localhost:4000',
      '/simulation': 'http://localhost:4000',
      '/mqtt':       'http://localhost:4000',
      '/deploy':     'http://localhost:4000',
      '/projects':   'http://localhost:4000',
      '/serial':     'http://localhost:4000',
      '/health':     'http://localhost:4000',
      '/socket.io':  { target: 'http://localhost:4000', ws: true },
    },
  },
  build: { outDir: '../backend/public', emptyOutDir: true },
});
