const { Telegraf } = require("telegraf");
const dotenv = require("dotenv");
const { initDB } = require("./db.js");
const { handleClaim } = require("./claim.js");
const { handleGame } = require("./game.js");
const { handleVoucher } = require("./voucher.js");

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Initialize database
initDB();

// Start command
bot.start((ctx) => {
  ctx.reply(
    `🌌 Welcome to Cosmic Foundry, ${ctx.from.first_name}!\n\n` +
    `You can earn rewards and play mini-games right here.\n\n` +
    `Commands:\n` +
    `/claim - Claim your daily reward\n` +
    `/game - Play the cosmic game\n` +
    `/voucher - Redeem a voucher code`
  );
});

// Command handlers
bot.command("claim", handleClaim);
bot.command("game", handleGame);
bot.command("voucher", handleVoucher);

// Error handling
bot.catch((err, ctx) => {
  console.error(`Bot error for ${ctx.updateType}`, err);
});

// Launch bot
bot.launch();
console.log("🚀 Cosmic Foundry Bot is now running...");

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
