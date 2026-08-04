import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'

/** https://vite.dev/config/ */
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'development' ? [mkcert()] : [])],
  server: {
    https: {},
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/storage': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
}))
