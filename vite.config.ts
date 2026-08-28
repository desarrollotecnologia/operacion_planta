import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // host: true expone el servidor en la red interna, no solo en localhost.
  server: { host: true, port: 5174 },
  preview: { host: true, port: 5174 },
})
