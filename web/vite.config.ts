import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Dev-only: relax CSP so libs that use Function/eval in dev can run locally
  server: {
    headers: {
      // Note: This header is for localhost development only
      // Remove or tighten for production hosting
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https:; style-src 'self' 'unsafe-inline'; connect-src *; img-src 'self' data: blob:;"
    }
  }
})
