# Scam Hunter Website v3

This folder contains a polished SvelteKit marketing site for Scam Hunter, including Discord OAuth login support and a calm product-style UI.

## Requirements

- Node.js 20+
- A Discord application configured for OAuth2

## Environment variables

Create a `.env` file in this folder based on `.env.example`.

```env
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=http://localhost:5173/auth/discord/callback
DISCORD_SESSION_SECRET=replace_with_long_random_secret
```

Notes:
- `DISCORD_REDIRECT_URI` must match the callback URL configured in your Discord developer application.
- `DISCORD_SESSION_SECRET` should be a long random value used to sign login cookies.

## Develop

```sh
npm install
npm run dev
```

The homepage is designed as a purple-forward hacker-themed landing page with Discord auth-aware UI state.

## Build

```sh
npm run build
npm run preview
```

