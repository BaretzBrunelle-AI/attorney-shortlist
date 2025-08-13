import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// vite.config.ts/js
export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    proxy: {
      "/admin": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      "/dashboard": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      "/healthz": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: { outDir: "dist", sourcemap: false },
});