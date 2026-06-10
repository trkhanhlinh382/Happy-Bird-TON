import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appUrl = env.VITE_APP_URL?.replace(/\/$/, '') || 'http://localhost:5173'

  return {
    server: {
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
    plugins: [
      react(),
      {
        name: 'generate-tonconnect-manifest',
        buildStart() {
          writeFileSync(
            resolve(process.cwd(), 'public/tonconnect-manifest.json'),
            JSON.stringify(
              {
                url: appUrl,
                name: 'Happy Bird TON',
                iconUrl: `${appUrl}/favicon.svg`,
                termsOfUseUrl: appUrl,
                privacyPolicyUrl: appUrl,
              },
              null,
              2,
            ),
          )
        },
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/tonconnect-manifest.json') {
              const protocol = req.headers['x-forwarded-proto'] || 'http'
              const host = req.headers.host || 'localhost:5173'
              const dynamicUrl = `${protocol}://${host}`
              
              res.setHeader('Content-Type', 'application/json')
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.end(
                JSON.stringify(
                  {
                    url: dynamicUrl,
                    name: 'Happy Bird TON',
                    iconUrl: `${dynamicUrl}/favicon.svg`,
                    termsOfUseUrl: dynamicUrl,
                    privacyPolicyUrl: dynamicUrl,
                  },
                  null,
                  2,
                ),
              )
              return
            }
            next()
          })
        },
      },
    ],
  }
})
