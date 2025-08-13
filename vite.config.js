import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    proxy: {
      // Local dev only — forwarded to your backend on 5000
      "/admin": "http://localhost:5000",
      "/dashboard": "http://localhost:5000",
      "/healthz": "http://localhost:5000",
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
})