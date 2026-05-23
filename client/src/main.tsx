import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import './index.css'
import App from './App.tsx'

const manifestUrl = new URL('/tonconnect-manifest.json', window.location.origin).toString()
const twaReturnUrl = import.meta.env.VITE_TELEGRAM_BOT_URL
const actionsConfiguration = (() => {
  if (!twaReturnUrl) {
    return undefined
  }

  try {
    return {
      twaReturnUrl: new URL(twaReturnUrl).toString() as `${string}://${string}`,
    }
  } catch {
    return undefined
  }
})()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TonConnectUIProvider
      manifestUrl={manifestUrl}
      actionsConfiguration={actionsConfiguration}
      analytics={{ mode: 'off' }}
    >
      <App />
    </TonConnectUIProvider>
  </StrictMode>,
)
