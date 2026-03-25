import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // Use relative base path to ensure it works on GitHub Pages (e.g., username.github.io/icg/)
  base: './',
  server: {
    port: 3000,
    open: true
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        portal: resolve(__dirname, 'portal_example.html'),
      }
    }
  }
})
