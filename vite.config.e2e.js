import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1421,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@tauri-apps/api/core': path.resolve(import.meta.dirname, './src/mocks/tauri-api-core.js'),
      '@tauri-apps/api/event': path.resolve(import.meta.dirname, './src/mocks/tauri-api-event.js'),
      '@tauri-apps/api/path': path.resolve(import.meta.dirname, './src/mocks/tauri-api-path.js'),
      '@tauri-apps/plugin-sql': path.resolve(import.meta.dirname, './src/mocks/tauri-plugin-sql.js'),
      '@tauri-apps/plugin-fs': path.resolve(import.meta.dirname, './src/mocks/tauri-plugin-fs.js'),
    }
  },
})
