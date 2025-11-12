// index.js
// Cosmic Foundry — Story + Gameplay Mix

import dotenv from "dotenv";
import { Telegraf } from "telegraf";
import {
  initDB,
  getUser as dbGetUser,
  addPoints as dbAddPoints,
  setPlanet as dbSetPlanet,
  recordBattle as dbRecordBattle,
} from "./db.js";

dotenv.config();

// Create the bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Initialize DB before anything else
await initDB();
console.log("✅ Database ready");

// ===== Utilities =====
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatNumber(n) {
  return `${n}`;
}

// Small story snippets to rotate through
const planetDescriptions = {
  "Elaris Prime":
    "Elaris Prime — an ocean world with glassy pillars and bioluminescent forests. Once friendly to visitors, rumours say a shadow moves under the waves.",
  "Nova Prime":
    "Nova Prime — a desert of rust-red dunes. The nights are cold and the ruins of ancient engines tell of a lost civilization.",
  "Astra Haven":
    "Astra Haven — a ringed gas giant colony. Floating markets trade star-maps and salvage. It's dangerous but rich in resources.",
  "Kethos":
    "Kethos — volcanic, smoke-choked, but filled with rare mineral veins. Not for the faint of heart.",
};

// ===== Helper wrappers over DB module functions =====
async function getUser(ctx) {
  // dbGetUser should return the full user row (with points, planet, battles...)
  return await dbGetUser(ctx);
}

// ===== Commands and gameplay =====

// /start — greet, create user if missing
bot.command("start", async (ctx) => {
  try {
    const user = await getUser(ctx);
    await ctx.replyWithMarkdown(
      `🌌 *Welcome to Cosmic Foundry*, ${user.username}!\n\n` +
        `Your ship survived the Collapse — your home world is gone. Now you travel from system to system searching for a new home.\n\n` +
        `✨ Commands:\n` +
        `- /explore — Explore current planet (story events & rewards)\n` +
        `- /travel — Travel to a different planet (costs fuel / points)\n` +
        `- /battle — Fight alien foes (risk & reward)\n` +
        `- /status — Show your stats and current planet\n` +
        `- /claim — Claim a small daily supply (cooldown not enforced here)\n`
    );
  } catch (err) {
    console.error("start error:", err);
    await ctx.reply("⚠️ Something went wrong starting your journey.");
  }
});

// /claim — simple daily-ish grant (for fun)
bot.command("claim", async (ctx) => {
  try {
    const user = await getUser(ctx);
    const reward = randomInt(5, 15);
    await dbAddPoints(user.telegram_id, reward);
    const updated = await dbGetLatest(user.telegram_id); // fallback if your db exports method: skip if not
    await ctx.reply(`🎁 You claimed ${reward} cosmic points! You now have ${user.points + reward} points.`);
  } catch (err) {
    console.error("claim error:", err);
    await ctx.reply("⚠️ Could not claim right now.");
  }
});

// If you don't have dbGetLatest, just reply with user.points+reward as above — lines above try to be helpful

// /status — show player stats
bot.command("status", async (ctx) => {
  try {
    const user = await getUser(ctx);
    await ctx.replyWithMarkdown(
      `📜 *Status Report*\n` +
        `👤 Username: ${user.username}\n` +
        `💰 Points: ${user.points}\n` +
        `🪐 Planet: ${user.planet}\n` +
        `⚔️ Battles won: ${user.battles}\n\n` +
        `_${planetDescriptions[user.planet] || "A lonely patch of space."}_`
    );
  } catch (err) {
    console.error("status error:", err);
    await ctx.reply("⚠️ Could not fetch status.");
  }
});

// /explore — story event on current planet with small rewards
bot.command("explore", async (ctx) => {
  try {
    const user = await getUser(ctx);
    const planet = user.planet || "Unknown";
    // choose a random event
    const roll = Math.random();
    if (roll < 0.25) {
      // find artifact
      const pts = randomInt(10, 30);
      await dbAddPoints(user.telegram_id, pts);
      await ctx.reply(
        `🔦 While exploring ${planet}, you discover an ancient artifact. You salvage it for *${pts}* cosmic points.`
      );
    } else if (roll < 0.6) {
      // encounter NPC / lore
      await ctx.reply(
        `🗣️ A wandering merchant shares a tale: "Long ago, a convoy left the Foundry with seeds for a new world..." You feel inspired. Keep exploring!`
      );
    } else {
      // small hazard
      const loss = randomInt(5, 12);
      await dbAddPoints(user.telegram_id, -loss);
      await ctx.reply(
        `⚠️ You triggered a hidden trap while exploring ${planet}. You lost *${loss}* points but learned a clue.`
      );
    }
  } catch (err) {
    console.error("explore error:", err);
    await ctx.reply("⚠️ There was a problem while exploring.");
  }
});

// /travel — pick a target planet and move there (costs points)
bot.command("travel", async (ctx) => {
  try {
    const user = await getUser(ctx);
    // present 3 random target planets (excluding current)
    const allPlanets = Object.keys(planetDescriptions);
    const choices = allPlanets.filter((p) => p !== user.planet);
    // shuffle and pick up to 3
    const shuffled = choices.sort(() => Math.random() - 0.5).slice(0, 3);

    // build a small keyboard
    const buttons = shuffled.map((p) => [{ text: `✈️ Travel to ${p}`, callback_data: `travel:${p}` }]);
    await ctx.reply("Where would you like to travel? (Each trip costs 10 points)", {
      reply_markup: {
        inline_keyboard: buttons,
      },
    });
  } catch (err) {
    console.error("travel error:", err);
    await ctx.reply("⚠️ Could not start travel.");
  }
});

// handle travel button press
bot.on("callback_query", async (ctx) => {
  try {
    const data = ctx.callbackQuery.data;
    if (data && data.startsWith("travel:")) {
      const planet = data.split(":")[1];
      const user = await getUser(ctx);
      const cost = 10;
      if (user.points < cost) {
        await ctx.answerCbQuery();
        return ctx.reply("🚫 You don't have enough points to travel. Try /explore or /claim.");
      }
      await dbAddPoints(user.telegram_id, -cost);
      await dbSetPlanet(user.telegram_id, planet);
      await ctx.answerCbQuery();
      await ctx.reply(`🚀 You traveled to *${planet}*!\n\n${planetDescriptions[planet]}`, {
        parse_mode: "Markdown",
      });
    } else {
      // ignore other callback types
      await ctx.answerCbQuery();
    }
  } catch (err) {
    console.error("callback_query error:", err);
    await ctx.reply("⚠️ Travel failed.");
  }
});

// /battle — fight aliens (risk/reward)
bot.command("battle", async (ctx) => {
  try {
    const user = await getUser(ctx);
    const roll = Math.random();
    // chance to win influenced by user points (small factor)
    const winChance = 0.45 + Math.min(user.points / 500, 0.3); // between 0.45 and 0.75-ish
    if (roll < winChance) {
      const reward = randomInt(15, 45);
      await dbAddPoints(user.telegram_id, reward);
      await dbRecordBattle(user.telegram_id, true);
      await ctx.reply(`⚔️ *Victory!* You defeated the alien raiders and gained *${reward}* points.`, {
        parse_mode: "Markdown",
      });
    } else {
      const loss = randomInt(8, 28);
      await dbAddPoints(user.telegram_id, -loss);
      await dbRecordBattle(user.telegram_id, false);
      await ctx.reply(`💥 You were ambushed and lost *${loss}* points. Live to fight another day.`, {
        parse_mode: "Markdown",
      });
    }
  } catch (err) {
    console.error("battle error:", err);
    await ctx.reply("⚠️ Battle system error.");
  }
});

// /shop — simple shop for ship upgrades (non-persistent example)
bot.command("shop", async (ctx) => {
  try {
    const user = await getUser(ctx);
    const upgrades = [
      { name: "Shield Mk I", cost: 60, desc: "Better resistance in battle." },
      { name: "Hyperfuel Injector", cost: 80, desc: "Travel farther, faster." },
      { name: "Salvager Arm", cost: 40, desc: "Better salvage when exploring." },
    ];

    const lines = upgrades.map((u, i) => `${i + 1}. ${u.name} — ${u.cost} pts\n   _${u.desc}_`).join("\n\n");
    await ctx.replyWithMarkdown(`🛒 *Shipwright's Shop*\n\n${lines}\n\nTo buy: /buy <number>`);
  } catch (err) {
    console.error("shop error:", err);
    await ctx.reply("⚠️ Shop unavailable.");
  }
});

// /buy <n> — simple purchase action (no persistent inventory implemented)
bot.command("buy", async (ctx) => {
  try {
    const text = ctx.message.text || "";
    const parts = text.split(" ").filter(Boolean);
    const idx = parseInt(parts[1], 10);
    if (!idx || idx < 1 || idx > 3) {
      return ctx.reply("Usage: /buy <1-3>");
    }

    const items = [
      { name: "Shield Mk I", cost: 60 },
      { name: "Hyperfuel Injector", cost: 80 },
      { name: "Salvager Arm", cost: 40 },
    ];
    const item = items[idx - 1];
    const user = await getUser(ctx);

    if (user.points < item.cost) {
      return ctx.reply("🚫 You don't have enough points for that upgrade.");
    }
    await dbAddPoints(user.telegram_id, -item.cost);
    // (Optional) persist inventory in DB — not implemented here.
    await ctx.reply(`🔧 You purchased *${item.name}* for ${item.cost} points. Use it well!`, {
      parse_mode: "Markdown",
    });
  } catch (err) {
    console.error("buy error:", err);
    await ctx.reply("⚠️ Purchase failed.");
  }
});

// catch-all for unknown commands
bot.on("message", async (ctx) => {
  try {
    // skip if it's a command (handled above)
    if (ctx.message.text && ctx.message.text.startsWith("/")) return;
    await ctx.reply("🤖 I didn't quite understand. Try /start to see available commands.");
  } catch (err) {
    console.error("message handler error:", err);
  }
});

// ===== Start the bot =====
await bot.launch();
console.log("🚀 Cosmic Foundry Bot is online");

// graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
