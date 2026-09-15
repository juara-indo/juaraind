import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Output berupa SATU file HTML mandiri (JS+CSS inline) —
// memudahkan deploy ke GitHub Pages di subpath repo apa pun tanpa konfigurasi base.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
})
