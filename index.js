// index.js
// Cosmic Foundry – Phase 1 core bot

require("dotenv").config();
const { Telegraf } = require("telegraf");
const {
  initDB,
  getOrCreateUser,
  addXP,
  addCredits,
  claimDaily,
  getUserById,
} = require("./db");

// --- Basic safety checks ---
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is missing from environment variables");
  process.exit(1);
}

// --- Init DB & Bot ---
initDB();
const bot = new Telegraf(BOT_TOKEN);

// --- Helper: format profile text ---
function formatProfile(user) {
  return (
    `🧑‍🚀 *Traveler Profile*\n` +
    `\n` +
    `🪪 ID: \`${user.telegram_id}\`\n` +
    `👤 Name: ${user.username || "Traveler"}\n` +
    `⭐ Level: *${user.level}*\n` +
    `📈 XP: *${user.xp}*\n` +
    `💳 Credits: *${user.credits}*\n`
  );
}

// --- /start ---
bot.start((ctx) => {
  try {
    const tgUser = ctx.from;
    const user = getOrCreateUser(tgUser.id, tgUser.username);

    const startCredits = process.env.REWARD_POINTS_START || 100;
    const dailyReward = process.env.REWARD_POINTS_DAILY || 10;

    let text =
      "🌌 *Welcome to Cosmic Foundry: Exodus* 🌌\n\n" +
      "Your home planet has fallen. You and your crew now travel across dangerous alien worlds, searching for a new home and fighting terrifying creatures.\n\n" +
      `✨ You begin your journey with *${startCredits}* credits.\n` +
      `💫 You can claim *${dailyReward}* daily credits with /daily.\n\n` +
      "Use these commands to begin:\n" +
      "• /profile – view your stats\n" +
      "• /daily – claim your daily reward\n" +
      "• /explore – quick adventure for XP & credits\n" +
      "• /fight – simple battle vs a random creature\n" +
      "• /help – show all commands\n\n" +
      "Your journey starts now, Traveler. ✨";

    ctx.replyWithMarkdown(text);
  } catch (err) {
    console.error("Error in /start:", err);
    ctx.reply("Something went wrong starting your journey. Try again in a moment.");
  }
});

// --- /help ---
bot.command("help", (ctx) => {
  const text =
    "🛠 *Commands*\n\n" +
    "/start – begin your journey or reset intro\n" +
    "/profile – view your traveler stats\n" +
    "/daily – claim your daily credits\n" +
    "/explore – go on a quick adventure\n" +
    "/fight – battle a random enemy\n";

  ctx.replyWithMarkdown(text);
});

// --- /profile ---
bot.command("profile", (ctx) => {
  try {
    const tgUser = ctx.from;
    const user = getOrCreateUser(tgUser.id, tgUser.username);
    const text = formatProfile(user);
    ctx.replyWithMarkdown(text);
  } catch (err) {
    console.error("Error in /profile:", err);
    ctx.reply("I couldn't load your profile. Please try again.");
  }
});

// --- /daily ---
bot.command("daily", (ctx) => {
  try {
    const tgUser = ctx.from;
    const user = getOrCreateUser(tgUser.id, tgUser.username);

    const result = claimDaily(user.id);

    if (result.ok) {
      const updated = getUserById(user.id);
      ctx.replyWithMarkdown(
        `🎁 You claimed your daily reward of *${result.reward}* credits!\n\n` +
          `You now have *${updated.credits}* credits.`
      );
    } else {
      ctx.reply(
        `⏳ You've already claimed your daily reward.\nCome back in about ${result.remainingHours} hour(s).`
      );
    }
  } catch (err) {
    console.error("Error in /daily:", err);
    ctx.reply("Something went wrong with your daily reward. Try again later.");
  }
});

// --- /explore ---
bot.command("explore", (ctx) => {
  try {
    const tgUser = ctx.from;
    const user = getOrCreateUser(tgUser.id, tgUser.username);

    // Simple random outcome
    const outcomes = [
      {
        text: "You explore a shattered canyon on Pyroskarn and salvage broken tech.",
        xp: 15,
        credits: 10,
      },
      {
        text: "You discover a hidden ice cave on Cryomire glowing with crystal shards.",
        xp: 20,
        credits: 8,
      },
      {
        text: "You drift through Aethervale and brush against a dream storm.",
        xp: 25,
        credits: 5,
      },
      {
        text: "You scout a corrupted ridge on the Void Nexus, barely escaping a lurking horror.",
        xp: 30,
        credits: 12,
