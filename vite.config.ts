import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const readBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

const localNetlifyFunctions = (env: Record<string, string>): Plugin => ({
  name: 'local-netlify-functions',
  configureServer(server) {
    const runFunction = async (
      req: IncomingMessage,
      res: ServerResponse,
      functionName: 'access' | 'auth' | 'teams' | 'players' | 'matches' | 'sets' | 'rallies' | 'reset',
    ) => {
      try {
        process.env.TURSO_DATABASE_URL ||= env.TURSO_DATABASE_URL || env.VITE_TURSO_DATABASE_URL
        process.env.TURSO_AUTH_TOKEN ||= env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN
        process.env.SESSION_SECRET ||= env.SESSION_SECRET
        process.env.AUTH_ALLOW_SIGNUP ||= env.AUTH_ALLOW_SIGNUP
        process.env.AUTH_ALLOWED_EMAILS ||= env.AUTH_ALLOWED_EMAILS
        process.env.AUTH_ADMIN_EMAILS ||= env.AUTH_ADMIN_EMAILS
        const { handler } = await server.ssrLoadModule(`/netlify/functions/${functionName}.ts`)
        const result = await handler({
          httpMethod: req.method || 'GET',
          headers: req.headers,
          body: await readBody(req),
        } as never, {} as never, undefined as never)

        if (!result) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Function did not return a response' }))
          return
        }

        res.statusCode = result.statusCode || 200
        Object.entries(result.headers || {}).forEach(([key, value]) => {
          if (typeof value === 'string') {
            res.setHeader(key, value)
          }
        })
        res.end(result.body)
      } catch (error) {
        server.config.logger.error(error instanceof Error ? error.stack || error.message : String(error))
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Local function failed' }))
      }
    }

    server.middlewares.use('/.netlify/functions/access', async (req, res) => {
      await runFunction(req, res, 'access')
    })

    server.middlewares.use('/.netlify/functions/auth', async (req, res) => {
      await runFunction(req, res, 'auth')
    })

    server.middlewares.use('/.netlify/functions/rallies', async (req, res) => {
      await runFunction(req, res, 'rallies')
    })

    server.middlewares.use('/.netlify/functions/teams', async (req, res) => {
      await runFunction(req, res, 'teams')
    })

    server.middlewares.use('/.netlify/functions/players', async (req, res) => {
      await runFunction(req, res, 'players')
    })

    server.middlewares.use('/.netlify/functions/matches', async (req, res) => {
      await runFunction(req, res, 'matches')
    })

    server.middlewares.use('/.netlify/functions/sets', async (req, res) => {
      await runFunction(req, res, 'sets')
    })

    server.middlewares.use('/.netlify/functions/reset', async (req, res) => {
      await runFunction(req, res, 'reset')
    })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      localNetlifyFunctions(env),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
          cleanupOutdatedCaches: true,
        },
        manifest: {
          name: 'Century Matchbook',
          short_name: 'Matchbook',
          description: 'Live match tracking and decision support for Century Volleyball',
          theme_color: '#16171d',
          icons: [
            {
              src: 'app_icon.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'app_icon.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'app_icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
  }
})
