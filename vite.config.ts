import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    preact(),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: false,
    }),
  ],
})
