/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_URL?: string
  readonly VITE_TELEGRAM_BOT_URL?: string
  readonly VITE_TREASURY_ADDRESS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface TelegramWebAppUser {
  first_name?: string
  username?: string
}

interface TelegramWebApp {
  platform?: string
  initDataUnsafe?: {
    user?: TelegramWebAppUser
  }
  ready(): void
  expand(): void
  setHeaderColor?(color: string): void
  setBackgroundColor?(color: string): void
  enableClosingConfirmation?(): void
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp
  }
}