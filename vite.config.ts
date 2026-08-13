import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    port: 3000,
  },
  preview: {
    // Browser validation maps the exact Hosted hostname to the local build so
    // Hosted-only consent behavior can be exercised without a deployment.
    allowedHosts: ['review.rodrigomaia.me'],
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [viteReact(), tailwindcss()],
})
