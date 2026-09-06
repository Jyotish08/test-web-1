import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true
  },
  preview: {
    allowedHosts: ['test-web-1-epio.onrender.com']
  },
  build: {
    target: 'esnext'
  }
});
