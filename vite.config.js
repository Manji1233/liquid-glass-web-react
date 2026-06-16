import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Uploadable-Liquid-Glass-Web-React/',
  server: {
    port: 3000,
    open: true
  }
})
