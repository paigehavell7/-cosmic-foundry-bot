# Cosmic Foundry — Bot (Option B)

This repository is an MVP skeleton for Cosmic Foundry — a Telegram bot that awards in-game credits and issues secure vouchers (Option B). Start here to validate gameplay & economy before migrating to on-chain tokens.

## Quick start

1. Copy `.env.example` to `.env` and fill in:
   - TELEGRAM_TOKEN
   - DATABASE_URL
   - ADMIN_ID

2. Install:
```bash
npm install
```

3. Run database migrations:
```bash
psql $DATABASE_URL -f migrations/001_create_tables.sql
```

4. Start the bot:
```bash
npm run start
```

5. Start claim server (optional):
```bash
npm run claim
```

## Files
- `bot/index.js` — Telegram bot (grammy) with `/start`, `/mine`, `/balance`, `/code`, `/issue`.
- `lib/db.js` — Postgres helpers.
- `lib/voucher.js` — Voucher generation and redemption logic.
- `web/claim.js` — Express endpoint for redeeming voucher codes.
- `migrations/001_create_tables.sql` — Database schema.
- `scripts/payout-sample.js` — Placeholder for future payout scripts.

