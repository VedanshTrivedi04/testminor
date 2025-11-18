import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Add this allowedHosts array
    allowedHosts: [
      '89c78b2a78aa.ngrok-free.app',
    ],
    host: true,
  },
})
