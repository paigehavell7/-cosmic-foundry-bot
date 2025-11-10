// Cosmic Foundry Bot — Adventure Edition

import dotenv from "dotenv";
import { Telegraf } from "telegraf";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

dotenv.config();

// Initialize the bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// --- Database Setup ---
let db;
(async () => {
  db = await open({
    filename: "./cosmic_foundry.db",
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id TEXT PRIMARY KEY,
      username TEXT,
      points INTEGER DEFAULT 0,
      planet TEXT DEFAULT 'Nova Prime',
      battles INTEGER DEFAULT 0
    )
  `);
})();

// --- Helper Functions ---
async function getUser(ctx) {
  const id = ctx.from.id.toString();
  const username = ctx.from.username || "Traveler";

  let user = await db.get("SELECT * FROM users WHERE telegram_id = ?", [id]);
  if (!user) {
    await db.run(
      "INSERT INTO users (telegram_id, username) VALUES (?, ?)",
      [id, username]
    );
    user = await db.get("SELECT * FROM users WHERE telegram_id = ?", [id]);
  }
  return user;
}

// --- Core Game Commands ---
async function handleClaim(ctx) {
  try {
    const user = await getUser(ctx);
    const rewardPoints = Math.floor(Math.random() * 20) + 5;

    await db.run(
      "UPDATE users SET points = points + ? WHERE telegram_id = ?",
      [rewardPoints, user.telegram_id]
    );

    ctx.reply(`🎁 You’ve claimed ${rewardPoints} credits, ${user.username}!`);
  } catch (error) {
    console.error("Error in /claim:", error);
    ctx.reply("⚠️ There was an error claiming your reward.");
  }
}

function handleGame(ctx) {
  ctx.reply(
    "🚀 Welcome to *Cosmic Foundry: Exodus Beyond*! Your home world was destroyed. Travel through the stars, gather resources, and find a new home planet. Type /travel to begin your journey!",
    { parse_mode: "Markdown" }
  );
}

function handleVoucher(ctx) {
  ctx.reply("🎫 Here is your voucher code: CF-2025-REWARD");
}

// --- New Adventure Commands ---
bot.command("status", async (ctx) => {
  const user = await getUser(ctx);
  ctx.reply(
    `🛰 *Status Report for ${user.username}:*\n\n🌍 Planet: ${user.planet}\n💰 Points: ${user.points}\n⚔️ Battles Won: ${user.battles}`,
    { parse_mode: "Markdown" }
  );
});

bot.command("travel", async (ctx) => {
  const user = await getUser(ctx);
  const planets = [
    "Zypheron IV",
    "Eclipsera",
    "Orion’s Gate",
    "Tavros-9",
    "Aetheria Prime",
  ];
  const newPlanet = planets[Math.floor(Math.random() * planets.length)];

  await db.run("UPDATE users SET planet = ? WHERE telegram_id = ?", [
    newPlanet,
    user.telegram_id,
  ]);

  ctx.reply(`🌌 You travel through hyperspace and arrive at *${newPlanet}*!`, {
    parse_mode: "Markdown",
  });
});

bot.command("fight", async (ctx) => {
  const user = await getUser(ctx);
  const won = Math.random() > 0.5;

  if (won) {
    await db.run(
      "UPDATE users SET battles = battles + 1, points = points + 10 WHERE telegram_id = ?",
      [user.telegram_id]
    );
    ctx.reply("⚔️ You fought bravely and defeated the alien attackers! +10 credits!");
  } else {
    ctx.reply("💀 The aliens were too strong this time. You retreat to safety.");
  }
});

// --- Core Commands ---
bot.command("claim", handleClaim);
bot.command("game", handleGame);
bot.command("voucher", handleVoucher);

// --- Launch & Shutdown ---
bot.launch();
console.log("🪐 Cosmic Foundry Bot is live!");

// Graceful shutdown (important for Railway)
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
