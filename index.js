// Cosmic Foundry Bot – Adventure Edition
// A Telegram RPG where players explore galaxies, fight aliens, and find a new home planet.

import dotenv from "dotenv";
import { Telegraf } from "telegraf";
import { initDB, getUser, addPoints, setPlanet, recordBattle } from "./db.js";

dotenv.config();

// --- Initialize Bot ---
const bot = new Telegraf(process.env.BOT_TOKEN);

// --- Initialize Database ---
await initDB();


// --- Core Game Commands ---

// 🌍 /start — Welcome message
bot.start(async (ctx) => {
  const username = ctx.from.username || "Traveler";
  await ctx.reply(`🚀 Welcome, ${username}!  
Your home planet was destroyed. You must explore the galaxy to find a new home and survive alien encounters!

Use:
/explore – travel to a new planet  
/claim – earn cosmic points  
/status – check your stats  
/battle – fight alien invaders`);
});


// 🪐 /explore — Travel to a new planet
bot.command("explore", async (ctx) => {
  const planets = ["Nova Prime", "Eclipsera", "Zypheron", "Krynn", "Velara", "Aetherion"];
  const newPlanet = planets[Math.floor(Math.random() * planets.length)];
  const user = await getUser(ctx);
  await setPlanet(user.telegram_id, newPlanet);

  await ctx.reply(`🪐 You’ve arrived on planet *${newPlanet}*!  
Scanning atmosphere... breathable ✅  
Resources detected 💎  
Stay alert for alien lifeforms 👽`);
});


// 💰 /claim — Earn points for progress
bot.command("claim", async (ctx) => {
  const user = await getUser(ctx);
  const reward = Math.floor(Math.random() * 50) + 10;
  await addPoints(user.telegram_id, reward);

  await ctx.reply(`✨ You earned ${reward} cosmic points for your discoveries!  
Keep exploring to find rare artifacts.`);
});


// ⚔️ /battle — Fight aliens
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
    await ctx.reply(`⚔️ Victory! You defeated the alien attackers and gained ${reward} points!`);
  }
});


// 📊 /status — Show user stats
bot.command("status", async (ctx) => {
  const user = await getUser(ctx);
  await ctx.reply(`📜 *Status Report*  
👤 Username: ${user.username}  
🪙 Points: ${user.points}  
🌍 Planet: ${user.planet}  
⚔️ Battles: ${user.battles}`, { parse_mode: "Markdown" });
});


// --- Launch the Bot ---
bot.launch();
console.log("🚀 Cosmic Foundry Bot is online and exploring the stars...");
