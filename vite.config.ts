import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appUrl = env.VITE_APP_URL?.replace(/\/$/, '') || 'http://localhost:5173'

  return {
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
      },
    ],
  }
})
