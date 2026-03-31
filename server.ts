import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const distDir = join(import.meta.dirname, 'dist')
const clientDir = join(distDir, 'client')

// Preload static assets into memory
const staticAssets = new Map<string, { data: Buffer; type: string }>()

const mimeTypes: Record<string, string> = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
}

async function loadAssets(dir: string, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    const urlPath = prefix + '/' + entry.name
    if (entry.isDirectory()) {
      await loadAssets(fullPath, urlPath)
    } else {
      const data = Buffer.from(await Bun.file(fullPath).arrayBuffer())
      const ext = entry.name.substring(entry.name.lastIndexOf('.'))
      staticAssets.set(urlPath, { data, type: mimeTypes[ext] ?? 'application/octet-stream' })
    }
  }
}

await loadAssets(clientDir)

// Import the SSR handler
const { default: app } = await import('./dist/server/server.js')

const port = Number(process.env.PORT) || 3000

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url)

    // Serve static assets from memory
    const asset = staticAssets.get(url.pathname)
    if (asset) {
      return new Response(asset.data, {
        headers: {
          'content-type': asset.type,
          'cache-control': url.pathname.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
        },
      })
    }

    // SSR handler for everything else
    return app.fetch(req)
  },
})

console.log(`Listening on http://localhost:${port}`)
