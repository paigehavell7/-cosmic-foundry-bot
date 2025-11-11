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
