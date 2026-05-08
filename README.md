# Happy Bird TON

Happy Bird TON is a Telegram Mini App MVP built with React, Vite, and TonConnect. It ships with:

- a flappy-style Happy Bird canvas game
- Telegram WebApp detection and UI setup
- TON wallet connect via TonConnect
- testnet-oriented UX so you can separate development from mainnet

## Stack

- React 19
- TypeScript
- Vite
- `@tonconnect/ui-react`

## Local development

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run dev
```

3. Open the local URL shown by Vite.

The game runs in a browser preview, but Telegram-specific behavior like `WebApp.ready()` only activates inside Telegram.

## Environment

Copy `.env.example` into `.env` and fill in your public app URL when you deploy.

```bash
cp .env.example .env
```

Variables:

- `VITE_APP_URL`: your public HTTPS app URL
- `VITE_TELEGRAM_BOT_URL`: optional Mini App bot URL like `https://t.me/your_bot/your_app`

## TON testnet setup

1. Deploy the app to a public HTTPS domain.
2. Update `public/tonconnect-manifest.json` so `url`, `iconUrl`, `termsOfUseUrl`, and `privacyPolicyUrl` point to that public domain.
3. Open the deployed Mini App and connect a TON testnet wallet.
4. If your wallet is on mainnet, the UI will warn that the network is wrong.

Recommended testnet wallets:

- Tonkeeper with testnet enabled
- MyTonWallet testnet build

## Telegram launch setup

1. Create a bot with BotFather.
2. Set a Menu Button or Mini App URL that points to your deployed HTTPS frontend.
3. Open the bot in Telegram and launch the Mini App.

If you want cleaner wallet return behavior inside Telegram, set `VITE_TELEGRAM_BOT_URL` before building.

## Build

```bash
npm run build
```

## Next steps

- persist scores on a backend or TON smart contract
- add reward claims on testnet
- add player inventory, NFT skins, or token-gated levels
