// Load required packages
const { Telegraf } = require("telegraf");
const dotenv = require("dotenv");
const { initDB } = require("./db.js");

// Load environment variables
dotenv.config();

// Create a new Telegram bot instance
const bot = new Telegraf(process.env.BOT_TOKEN);

// Initialize the database
initDB();

// Start command
bot.start((ctx) => {
  ctx.reply(`🌌 Welcome to Cosmic Foundry, ${ctx.from.first_name}!
You can earn rewards and play mini-games right here.

✨ Commands:
- /claim — Claim your daily reward
- /game — Play the cosmic game
- /voucher — Redeem a voucher`);
});

// Command handlers
bot.command("claim", handleClaim);
bot.command("game", handleGame);
bot.command("voucher", handleVoucher);

// Launch the bot
bot.launch();

// Graceful shutdown (important for Railway)
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
