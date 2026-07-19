import { defineConfig, type Plugin } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pdfjsDistRoot = path.dirname(require.resolve('pdfjs-dist/package.json'))

// Répertoires de pdfjs-dist requis à l'exécution par le worker PDF
// (décodage JBIG2/JPX en wasm, cartes CJK, polices standard, profils ICC).
const PDFJS_ASSET_DIRS = ['wasm', 'cmaps', 'standard_fonts', 'iccs']

const PDFJS_MIME: Record<string, string> = {
  '.wasm': 'application/wasm',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.bcmap': 'application/octet-stream',
  '.pfb': 'application/octet-stream',
  '.ttf': 'font/ttf',
  '.icc': 'application/vnd.iccprofile',
}

/**
 * Sert /pdfjs-assets/* depuis node_modules/pdfjs-dist en dev,
 * et copie ces répertoires dans dist/ au build. Évite toute dépendance
 * à un CDN externe pour le rendu PDF.
 */
function pdfjsAssets(): Plugin {
  return {
    name: 'mibeko:pdfjs-assets',
    configureServer(server) {
      server.middlewares.use('/pdfjs-assets', (req, res, next) => {
        const rel = decodeURIComponent((req.url || '').split('?')[0].replace(/^\//, ''))
        const file = path.resolve(pdfjsDistRoot, rel)
        const topDir = rel.split('/')[0]
        if (
          !PDFJS_ASSET_DIRS.includes(topDir) ||
          !file.startsWith(pdfjsDistRoot + path.sep) ||
          !fs.existsSync(file) ||
          !fs.statSync(file).isFile()
        ) {
          return next()
        }
        res.setHeader('Content-Type', PDFJS_MIME[path.extname(file)] ?? 'application/octet-stream')
        fs.createReadStream(file).pipe(res)
      })
    },
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist/pdfjs-assets')
      for (const dir of PDFJS_ASSET_DIRS) {
        const src = path.join(pdfjsDistRoot, dir)
        if (fs.existsSync(src)) {
          fs.cpSync(src, path.join(outDir, dir), { recursive: true })
        }
      }
    },
  }
}

/**
 * Injecte le script Umami (analytics respectueux, auto-hébergé) dans index.html
 * UNIQUEMENT si les deux variables sont définies au build. Défaut : rien.
 * L'origine du script doit aussi être autorisée par la CSP nginx
 * (docker/nginx/default.conf).
 */
function umamiAnalytics(): Plugin {
  return {
    name: 'mibeko:umami-analytics',
    transformIndexHtml(html) {
      const url = process.env.VITE_UMAMI_URL
      const websiteId = process.env.VITE_UMAMI_WEBSITE_ID
      if (!url || !websiteId) return html
      return {
        html,
        tags: [
          {
            tag: 'script',
            injectTo: 'head',
            attrs: {
              defer: true,
              src: `${url.replace(/\/$/, '')}/script.js`,
              'data-website-id': websiteId,
            },
          },
        ],
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
    pdfjsAssets(),
    umamiAnalytics()
  ],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-pdf') || id.includes('pdfjs-dist')) return 'pdf';
          if (id.includes('react-router')) return 'router';
          if (id.includes('@tanstack')) return 'tanstack';
          if (id.includes('lucide-react')) return 'icons';
          return 'vendor';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react': path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
    },
  },
  server: {
    proxy: {
      // Backend Laravel (API principale : documents, curation, auth, export)
      '/api/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // Backend Python FastAPI (ingestion, extraction, upload PDF, SSE)
      '/py': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/py/, ''),
      },
    }
  }
})
