// index.js
// Cosmic Foundry – Exodus core bot (Phase 1, upgraded commands)

import dotenv from "dotenv";
import { Telegraf } from "telegraf";
import {
  initDB,
  getOrCreateUser,
  getUserById,
  addXP,
  addCredits,
  claimDaily,
  setPlanet,
  recordBattle,
} from "./db.js";

dotenv.config();

// --- Basic safety checks ---
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is missing from environment variables.");
  process.exit(1);
}

// --- Init DB & Bot ---
initDB();
const bot = new Telegraf(BOT_TOKEN);

// --- Helper: format profile text ---
function formatProfile(user) {
  return (
    `👤 *Profile*\n` +
    `━━━━━━━━━━━━━\n` +
    `🆔 Username: *${user.username || "Traveler"}*\n` +
    `🌌 Planet: *${user.current_planet || "Unknown"}*\n` +
    `⭐ Level: *${user.level}*\n` +
    `✨ XP: *${user.xp}*\n` +
    `💳 Credits: *${user.credits}*\n` +
    `⚔️ Battles Won: *${user.battles_won}*\n` +
    `💀 Battles Lost: *${user.battles_lost}*`
  );
}

// --- Helper: main command list ---
function commandsText() {
  return (
    "Use these commands to begin:\n" +
    "• /profile – view your stats\n" +
    "• /daily – claim your daily reward\n" +
    "• /explore – quick adventure for XP & credits\n" +
    "• /fight – simple battle vs a random creature\n" +
    "• /help – show all commands"
  );
}

// ============= Commands ============= //

// /start – intro + auto-create user
bot.start((ctx) => {
  const tgUser = ctx.from;
  const user = getOrCreateUser(String(tgUser.id), tgUser.username);

  ctx.replyWithMarkdown(
    `🛰 *Welcome to Cosmic Foundry: Exodus*\n\n` +
      `Your home planet has fallen. You and your crew now travel across dangerous alien worlds, ` +
      `searching for a new home and fighting terrifying creatures.\n\n` +
      `✨ You begin your journey with *${user.credits} credits*.\n` +
      `💫 You can claim *10 daily credits* with /daily.\n\n` +
      commandsText()
  );
});

// /help – just commands
bot.command("help", (ctx) => {
  ctx.replyWithMarkdown(
    `📖 *Cosmic Foundry – Help*\n\n` + commandsText()
  );
});

// /profile – show stats
bot.command("profile", (ctx) => {
  const tgUser = ctx.from;
  const user = getOrCreateUser(String(tgUser.id), tgUser.username);

  ctx.replyWithMarkdown(formatProfile(user));
});

// /daily – daily reward logic using DB
bot.command("daily", (ctx) => {
  const tgUser = ctx.from;
  const user = getOrCreateUser(String(tgUser.id), tgUser.username);

  const result = claimDaily(user.telegram_id);

  if (!result.claimed) {
    const nextDate = new Date(result.nextAt);
    ctx.replyWithMarkdown(
      `⏳ You've already claimed your daily reward.\n` +
        `Come back after *${nextDate.toUTCString()}*.`
    );
    return;
  }

  // Add XP as a bonus for logging in
  const updatedXP = addXP(user.telegram_id, 5);

  ctx.replyWithMarkdown(
    `🎁 *Daily Reward Claimed!*\n\n` +
      `💳 Credits gained: *${result.amount}*\n` +
      `✨ XP gained: *5*\n` +
      `⭐ Level: *${updatedXP.level}* (XP: ${updatedXP.xp})`
  );
});

// /explore – quick adventure with random outcomes
bot.command("explore", (ctx) => {
  const tgUser = ctx.from;
  const user = getOrCreateUser(String(tgUser.id), tgUser.username);

  const outcomes = [
    {
      text: "You explore a shattered crystal canyon and salvage rare shards.",
      xp: 15,
      credits: 10,
    },
    {
      text: "You discover a hidden ice cave filled with ancient tech.",
      xp: 20,
      credits: 8,
    },
    {
      text: "You drift through Aether storms and map safe routes for the fleet.",
      xp: 25,
      credits: 5,
    },
    {
      text: "You scout a corrupted rift and mark dangerous zones on the star map.",
      xp: 30,
      credits: 12,
    },
  ];

  const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

  const updatedXP = addXP(user.telegram_id, outcome.xp);
  const updatedCredits = addCredits(user.telegram_id, outcome.credits);

  ctx.replyWithMarkdown(
    `🧭 *Exploration Report – ${user.current_planet}*\n\n` +
      `📜 ${outcome.text}\n\n` +
      `✨ XP gained: *${outcome.xp}*\n` +
      `💳 Credits gained: *${outcome.credits}*\n\n` +
      `⭐ Level: *${updatedXP.level}* (XP: ${updatedXP.xp})\n` +
      `💰 Total Credits: *${updatedCredits.credits}*`
  );
});

// /fight – simple battle vs random creature
bot.command("fight", (ctx) => {
  const tgUser = ctx.from;
  const user = getOrCreateUser(String(tgUser.id), tgUser.username);

  // Basic enemy pool – later we tie this to planets & our scary creature designs
  const enemies = [
    { name: "Void Howler", basePower: 40 },
    { name: "Aether Leech", basePower: 30 },
    { name: "Rift Stalker", basePower: 50 },
    { name: "Plasma Maw", basePower: 60 },
  ];

  const enemy = enemies[Math.floor(Math.random() * enemies.length)];

  // Player & enemy power calculations
  const playerPower =
    20 + user.level * 5 + Math.floor(user.xp / 25) + Math.floor(Math.random() * 20);
  const enemyPower = enemy.basePower + Math.floor(Math.random() * 25);

  let resultText;
  let xpChange = 0;
  let creditChange = 0;
  let outcome = "loss";

  if (playerPower >= enemyPower) {
    // Win
    xpChange = 25 + Math.floor(Math.random() * 15);
    creditChange = 15 + Math.floor(Math.random() * 10);
    outcome = "win";

    resultText =
      `⚔️ *Battle Result: Victory!*\n` +
      `You defeated the *${enemy.name}*.\n`;
  } else {
    // Loss
    xpChange = 5; // consolation XP
    creditChange = -10; // lose some credits

    resultText =
      `💀 *Battle Result: Defeat*\n` +
      `The *${enemy.name}* overwhelmed you this time.\n`;
  }

  const updatedXP = addXP(user.telegram_id, xpChange);
  const updatedCredits = addCredits(user.telegram_id, creditChange);
  const battleRecord = recordBattle(user.telegram_id, outcome);

  ctx.replyWithMarkdown(
    `${resultText}\n` +
      `✨ XP change: *+${xpChange}*\n` +
      `💳 Credits change: *${creditChange >= 0 ? "+" : ""}${creditChange}*\n\n` +
      `⭐ Level: *${updatedXP.level}* (XP: ${updatedXP.xp})\n` +
      `💰 Total Credits: *${updatedCredits.credits}*\n` +
      `⚔️ Battles Won: *${battleRecord.battles_won}* | 💀 Battles Lost: *${battleRecord.battles_lost}*`
  );
});

// Catch-all for random messages (optional)
bot.on("text", (ctx) => {
  const msg = ctx.message.text || "";
  if (msg.startsWith("/")) return; // ignore unknown commands silently

  ctx.reply(
    "🚀 Cosmic Foundry is command-based.\n" +
      "Try /start, /profile, /daily, /explore or /fight."
  );
});

// ===== Start the bot =====
bot.launch();
console.log("🚀 Cosmic Foundry bot is online");

// Graceful shutdown (Railway/Node best practice)
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
