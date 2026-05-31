/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_URL?: string
  readonly VITE_TELEGRAM_BOT_URL?: string
  readonly VITE_TREASURY_ADDRESS?: string
  readonly VITE_BIRD_REWARD_CONTRACT?: string
  readonly VITE_GAME_PIPE_GAP?: string
  readonly VITE_GAME_PIPE_SPEED?: string
  readonly VITE_GAME_FLAP_FORCE?: string
  readonly VITE_GAME_GRAVITY?: string
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