import { defineConfig } from 'vite'

// Phaser doesn't need React plugin — plain TS entry point
export default defineConfig({
  // No plugins needed — Phaser handles everything
  server: {
    // Bind all interfaces so the dev server is reachable on the LAN
    host: true,
    port: 5199,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
  },
})
