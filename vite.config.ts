import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves the site under /<repo>/ — keep dev + build in sync with that.
  base: '/settlers/',
  plugins: [react()],
  server: { port: 5199, strictPort: true, host: true },
  preview: { port: 5199, strictPort: true, host: true },
});
