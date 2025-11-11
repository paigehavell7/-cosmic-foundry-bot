// Cosmic Foundry Bot – Adventure Edition

import dotenv from "dotenv";
import { Telegraf } from "telegraf";
import { initDB, getUser, addPoints, setPlanet, recordBattle } from "./db.js";

dotenv.config();

// --- Initialize the bot ---
const bot = new Telegraf(process.env.BOT_TOKEN);

// --- Initialize the database ---
await initDB();

// --- /start command ---
bot.start(async (ctx) => {
  const user = await getUser(ctx);
  await ctx.reply(
    `🌌 Welcome, *${user.username}*!  
Your home world has been destroyed...  
You must travel across the stars to find a new home! 🌠  
Use /explore to begin your journey or /battle to fight alien raiders.`,
    { parse_mode: "Markdown" }
  );
});

// --- /explore command ---
bot.command("explore", async (ctx) => {
  const user = await getUser(ctx);
  const planets = [
    "Zephyra Prime",
    "Nexora IX",
    "Eldara",
    "Vortanis",
    "Auralis",
    "Cryon Delta",
  ];
  const discovered = planets[Math.floor(Math.random() * planets.length)];

  const reward = Math.floor(Math.random() * 50) + 20;
  await addPoints(user.telegram_id, reward);
  await setPlanet(user.telegram_id, discovered);

  await ctx.reply(
    `🪐 You discovered *${discovered}*!  
✨ You earned ${reward} Cosmic Points for exploring!`,
    { parse_mode: "Markdown" }
  );
});

// --- /battle command ---
bot.command("battle", async (ctx) => {
  const user = await getUser(ctx);
  const outcome = Math.random();

  if (outcome < 0.5) {
    const damage = Math.floor(Math.random() * 30) + 10;
    await addPoints(user.telegram_id, -damage);
    await recordBattle(user.telegram_id, false);
    await ctx.reply(`💥 You were ambushed by alien raiders and lost ${damage} points!`);
  } else {
    const reward = Math.floor(Math.random() * 60) + 20;
    await addPoints(user.telegram_id, reward);
    await recordBattle(user.telegram_id, true);
    await ctx.reply(`⚔️ Victory! You defeated the alien swarm and earned ${reward} points!`);
  }
});

// --- /status command ---
bot.command("status", async (ctx) => {
  const user = await getUser(ctx);
  await ctx.reply(
    `📜 *Status Report*  
👤 Username: ${user.username}  
💰 Points: ${user.points}  
🪐 Planet: ${user.planet}  
⚔️ Battles: ${user.battles}`,
    { parse_mode: "Markdown" }
  );
});

// --- /help command ---
bot.command("help", async (ctx) => {
  await ctx.reply(
    `🧭 *Cosmic Foundry Commands*  
/start – Begin your journey  
/explore – Discover new planets  
/battle – Fight alien raiders  
/status – Check your progress  
/help – Show this list`,
    { parse_mode: "Markdown" }
  );
});

// --- Launch the Bot ---
bot.launch();
console.log("🚀 Cosmic Foundry Bot is online and exploring the galaxy!");
