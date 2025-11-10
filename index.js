// Load required packages
const { Telegraf } = require("telegraf");
const dotenv = require("dotenv");
const { initDB, openDB } = require("./db.js");

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
});// Start command
// --- Command Handlers ---
async function handleClaim(ctx) {
  try {
    const db = openDB();
    const userId = ctx.from.id;
    const username = ctx.from.username || "Player";
    const today = new Date().toISOString().split("T")[0];

    // Check if user already claimed today
    db.get("SELECT last_claim FROM users WHERE telegram_id = ?", [userId], (err, row) => {
      if (row && row.last_claim === today) {
        ctx.reply("🌞 You already claimed your daily reward today! Come back tomorrow.");
        db.close();
        return;
      }

      const rewardPoints = 10;

      // Insert or update user data
      db.run(
        `
        INSERT INTO users (telegram_id, username, points, last_claim)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(telegram_id) DO UPDATE SET
          points = points + ?,
          last_claim = ?
        `,
        [userId, username, rewardPoints, today, rewardPoints, today],
        (err) => {
          if (err) {
            console.error(err);
            ctx.reply("⚠️ Error saving your reward.");
          } else {
            db.get(
              "SELECT points FROM users WHERE telegram_id = ?",
              [userId],
              (err, user) => {
                if (user) {
                  ctx.reply(`🎁 You claimed ${rewardPoints} points! You now have ${user.points} total points.`);
                }
              }
            );
          }
          db.close();
        }
      );
    });
  } catch (error) {
    console.error("Error in handleClaim:", error);
    ctx.reply("⚠️ There was an error claiming your reward. Please try again later.");
  }
}

function handleGame(ctx) {
  ctx.reply("Launching the Cosmic Foundry game... 🚀");
}

function handleVoucher(ctx) {
  ctx.reply("Here is your voucher code: CF-2025-REWARD 🎁");
}

// Now these functions exist when called below 👇
bot.command("claim", handleClaim);
bot.command("game", handleGame);
bot.command("voucher", handleVoucher);


// Launch the bot
bot.launch();

// Graceful shutdown (important for Railway)
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
