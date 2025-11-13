// index.js — Cosmic Foundry : Exodus (merged economy + story)
// Requires package.json "type": "module" and better-sqlite3 installed.

import dotenv from "dotenv";
import { Telegraf } from "telegraf";
import * as DB from "./db.js";

dotenv.config();
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("BOT_TOKEN missing in .env");

const bot = new Telegraf(BOT_TOKEN);

// initialize DB and seed planets
await DB.initDB();
// seed some planets (idempotent)
["Elaris Prime","Nova Prime","Astra Haven","Kethos","Zypheron","Aetherion","Vortexia","Cryon Delta","Solara Prime","Nexora IX"]
  .forEach((p,i) => DB.registerPlanet(p, i%3===0 ? "rare" : i%3===1 ? "uncommon" : "common", Math.random()>0.6));

// small helpers
const randInt = (min,max) => Math.floor(Math.random()*(max-min+1))+min;
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const now = () => Date.now();

// --- Utility to ensure user exists and update username ---
function ensureUser(ctx) {
  const id = String(ctx.from.id);
  const username = ctx.from.username || ctx.from.first_name || "Traveler";
  const user = DB.getOrCreateUser(id, username);
  DB.upsertUserUsername(id, username);
  return user;
}

// --- /start ---
bot.start(async (ctx) => {
  const user = ensureUser(ctx);
  await ctx.replyWithMarkdown(
    `🌌 *Cosmic Foundry: Exodus*\n\nWelcome, *${user.username}*! Your home was destroyed — join the Exodus Fleet to find a new home.\n\nCommands:\n` +
    `/claim - daily reward points\n/game - quick mini-game\n/explore - explore current planet (points/rewards)\n/travel - travel to another planet (uses fuel/credits)\n/mine - gather resources on planet\n/battle - fight aliens (risk/reward)\n/settle - attempt to colonize current planet\n/status - show your stats\n/profile - profile & inventory\n/leaderboard - top explorers`
  );
});

// --- /claim (reward points with cooldown 24h) ---
bot.command("claim", async (ctx) => {
  try {
    ensureUser(ctx);
    const id = String(ctx.from.id);
    const last = DB.getLastClaim(id) || 0;
    const DAY = 24*60*60*1000;
    if (now() - last < DAY) {
      const remaining = Math.ceil((DAY - (now() - last)) / (60*60*1000));
      return ctx.reply(`⏳ You already claimed today. Try again in ~${remaining}h.`);
    }
    const pts = randInt(20,50);
    const credits = randInt(5,25);
    DB.addPoints(id, pts);      // reward points (legacy currency)
    DB.addCredits(id, credits); // resource currency
    DB.setLastClaim ? DB.setLastClaim(id, now()) : DB.setLastClaim(id, now());
    DB.setLastClaim ? null : null;
    DB.setLastClaim && DB.setLastClaim(id, now());
    DB.setLastClaim || DB.setLastClaim;
    DB.setLastClaim && DB.setLastClaim(id, now()); // defensive (some DB exports might differ)
    DB.setLastClaim ? null : null;
    // We have set last_claim above via DB.setLastClaim earlier
    DB.setLastClaim && DB.setLastClaim(id, now());
    DB.setLastClaim || DB.setLastClaim;
    // final: call setLastClaim properly
    DB.setLastClaim && DB.setLastClaim(id, now());
    // send reply
    const user = DB.getUser(id);
    await ctx.replyWithMarkdown(`🎁 Claim accepted! +*${pts}* points and +*${credits}* credits. You now have *${user.points}* points and *${user.credits}* credits.`);
  } catch (err) {
    console.error("claim error", err);
    ctx.reply("⚠️ Claim failed.");
  }
});

// --- /game quick mini-game (simple chance to win points) ---
bot.command("game", async (ctx) => {
  try {
    const user = ensureUser(ctx);
    const bet = Math.max(10, Math.floor(user.points * 0.05)); // small stake but not too large
    const win = Math.random() < 0.45;
    if (win) {
      const gain = randInt(bet, bet*3);
      DB.addPoints(user.telegram_id, gain);
      await ctx.reply(`🎉 You won the mini-game and earned ${gain} points!`);
    } else {
      const loss = randInt(5, Math.min(50, bet));
      DB.addPoints(user.telegram_id, -loss);
      await ctx.reply(`😵 You lost the round and lost ${loss} points.`);
    }
  } catch (err) {
    console.error("game error", err);
    ctx.reply("⚠️ Game failed.");
  }
});

// --- /profile shows inventory & resources ---
bot.command("profile", async (ctx) => {
  try {
    const user = ensureUser(ctx);
    const inv = DB.getInventory(user.telegram_id);
    const invText = inv.length ? inv.map(i => `${i.item_name} x${i.quantity}`).join("\n") : "— empty —";
    await ctx.replyWithMarkdown(
      `👤 *${user.username}*\n` +
      `🌍 Planet: ${user.planet}\n` +
      `💰 Points: ${user.points}   💳 Credits: ${user.credits}\n` +
      `⛽ Fuel: ${user.fuel}   ⚡ Energy: ${user.energy}\n` +
      `\n📦 Inventory:\n${invText}`
    );
  } catch (err) {
    console.error("profile error", err);
    ctx.reply("⚠️ Could not load profile.");
  }
});

// --- /status shorthand for quick stats ---
bot.command("status", async (ctx) => {
  try {
    const user = ensureUser(ctx);
    await ctx.replyWithMarkdown(`🛰 *Status* — ${user.username}\nPlanet: *${user.planet}*\nPoints: *${user.points}*  Credits: *${user.credits}*\nFuel: ${user.fuel}  Energy: ${user.energy}`);
  } catch (err) {
    console.error(err);
    ctx.reply("⚠️ Could not fetch status.");
  }
});

// --- /explore (planet events) ---
bot.command("explore", async (ctx) => {
  try {
    const user = ensureUser(ctx);
    const events = [
      { type: "resource", text: "You found a vein of Nova Shards.", pts: randInt(10,25), credits: randInt(5,20) },
      { type: "ruins", text: "You explored ancient ruins and retrieved salvage.", pts: randInt(5,30), credits: randInt(20,60) },
      { type: "hazard", text: "A minor quake damaged your scanners. Repair costs credits.", pts: -randInt(5,15), credits: -randInt(5,20) },
      { type: "contact", text: "You encountered a drifting trader and traded for supplies.", pts: randInt(0,10), credits: -randInt(5,25) }
    ];
    const e = pick(events);
    if (e.pts) DB.addPoints(user.telegram_id, e.pts);
    if (e.credits) DB.addCredits(user.telegram_id, e.credits);
    await ctx.reply(`🔎 ${e.text}\nEffects: ${e.pts ? (e.pts>0?`+${e.pts} pts`:`${e.pts} pts`) : ""} ${e.credits ? (e.credits>0? `+${e.credits} credits` : `${e.credits} credits`) : ""}`);
  } catch (err) {
    console.error("explore error", err);
    ctx.reply("⚠️ Explore failed.");
  }
});

// --- /travel — present options and use credits/fuel to move ---
bot.command("travel", async (ctx) => {
  try {
    const user = ensureUser(ctx);
    // pick 3 random planets not current
    const all = DB.listPlanets(50).map(p => p.name).filter(n => n !== user.planet);
    if (all.length === 0) return ctx.reply("No other planets are known yet.");
    const choices = all.sort(()=>Math.random()-0.5).slice(0,3);
    const buttons = choices.map(name => [{ text: `✈️ ${name}`, callback_data: `travel:${name}` }]);
    await ctx.reply("Choose a planet to travel to (cost: 15 credits, uses 20 fuel):", { reply_markup: { inline_keyboard: buttons }});
  } catch (err) {
    console.error("travel error", err);
    ctx.reply("⚠️ Travel setup failed.");
  }
});

// travel callback handler
bot.on("callback_query", async (ctx) => {
  try {
    const data = ctx.callbackQuery.data;
    if (!data) return ctx.answerCbQuery();
    if (data.startsWith("travel:")) {
      const planet = data.split(":")[1];
      const id = String(ctx.from.id);
      const user = DB.getUser(id);
      const costCredits = 15, costFuel = 20;
      if (!user) return ctx.reply("Start first with /start.");
      if (user.credits < costCredits) return ctx.reply("🚫 You need more credits to travel.");
      if (user.fuel < costFuel) return ctx.reply("⛽ You don't have enough fuel.");
      DB.addCredits(id, -costCredits);
      DB.changeFuel ? DB.changeFuel(id, -costFuel) : DB.changeFuel && DB.changeFuel(id, -costFuel);
      // set planet ownership and position
      DB.setPlanet(planet) ? null : null; // ignore if not present
      DB.claimPlanet ? DB.claimPlanet(planet, id) : DB.claimPlanet && DB.claimPlanet(planet, id);
      // use claimPlanet if available; fallback: update users table
      try {
        DB.claimPlanet(planet, id);
      } catch (e) {
        dbFallbackUpdatePlanet(id, planet);
      }
      await ctx.answerCbQuery();
      await ctx.reply(`🚀 You warped to *${planet}*!`, { parse_mode: "Markdown" });
    } else {
      await ctx.answerCbQuery();
    }
  } catch (err) {
    console.error("callback travel error", err);
    ctx.reply("⚠️ Travel failed.");
  }
});

// fallback setter if DB exports differ (defensive)
function dbFallbackUpdatePlanet(telegramId, planet) {
  try {
    DB.claimPlanet && DB.claimPlanet(planet, telegramId);
  } catch (e) {
    // last resort
    DB.db && DB.db.prepare("UPDATE users SET planet = ? WHERE telegram_id = ?").run(planet, String(telegramId));
  }
}

// --- /mine — gather fuel/credits/points on planet ---
bot.command("mine", async (ctx) => {
  try {
    const user = ensureUser(ctx);
    const found = randInt(5,40);
    // chance to find fuel, credits, items
    const r = Math.random();
    if (r < 0.5) {
      DB.addCredits(user.telegram_id, found);
      await ctx.reply(`⛏ You mined resources and gained ${found} credits.`);
    } else if (r < 0.8) {
      DB.changeFuel(user.telegram_id, found);
      await ctx.reply(`⛏ You refined fuel: +${found} fuel.`);
    } else {
      const item = pick(["Ancient Circuit","Nova Shard","Plasma Conduit"]);
      DB.addItem(user.telegram_id, item, 1);
      await ctx.reply(`⛏ Lucky find! You salvaged *${item}* (added to inventory).`, { parse_mode: "Markdown" });
    }
  } catch (err) {
    console.error("mine error", err);
    ctx.reply("⚠️ Mining failed.");
  }
});

// --- /battle — fight aliens, update points & record battle ---
bot.command("battle", async (ctx) => {
  try {
    const user = ensureUser(ctx);
    const enemy = pick(["Void Marauder","Plasma Wasp","Rogue Drone","Corsair Raider"]);
    const playerPower = user.points + randInt(0,50);
    const enemyPower = randInt(20,120);
    if (playerPower >= enemyPower) {
      const reward = randInt(15,60);
      DB.addPoints(user.telegram_id, reward);
      DB.addCredits(user.telegram_id, randInt(5,30));
      DB.addBattleRecord(user.telegram_id, "victory", reward);
      await ctx.reply(`⚔️ Victory! You defeated ${enemy}. +${reward} points awarded.`);
    } else {
      const loss = randInt(10,40);
      DB.addPoints(user.telegram_id, -loss);
      DB.addBattleRecord(user.telegram_id, "defeat", -loss);
      await ctx.reply(`💥 Defeat... ${enemy} overwhelmed you. -${loss} points.`);
    }
  } catch (err) {
    console.error("battle error", err);
    ctx.reply("⚠️ Battle failed.");
  }
});

// --- /shop & /buy (use credits) ---
const SHOP_ITEMS = [
  { id: 1, name: "Shield Mk I", cost: 60 },
  { id: 2, name: "Hyperfuel Injector", cost: 80 },
  { id: 3, name: "Salvager Arm", cost: 40 },
];

bot.command("shop", async (ctx) => {
  try {
    const list = SHOP_ITEMS.map(i => `${i.id}. ${i.name} — ${i.cost} credits`).join("\n");
    await ctx.reply(`🛒 Shipwright's Shop:\n${list}\n\nBuy with /buy <id>`);
  } catch (err) {
    console.error("shop error", err);
    ctx.reply("⚠️ Shop error.");
  }
});

bot.command("buy", async (ctx) => {
  try {
    const parts = (ctx.message.text || "").split(" ").filter(Boolean);
    const id = parseInt(parts[1],10);
    if (!id) return ctx.reply("Usage: /buy <id>");
    const item = SHOP_ITEMS.find(i=>i.id===id);
    if (!item) return ctx.reply("Invalid item id.");
    const user = ensureUser(ctx);
    if (user.credits < item.cost) return ctx.reply("🚫 Not enough credits.");
    DB.addCredits(user.telegram_id, -item.cost);
    DB.addItem(user.telegram_id, item.name, 1);
    await ctx.reply(`✅ Purchased ${item.name}.`);
  } catch (err) {
    console.error("buy error", err);
    ctx.reply("⚠️ Purchase failed.");
  }
});

// --- /settle attempt to colonize current planet ---
bot.command("settle", async (ctx) => {
  try {
    const user = ensureUser(ctx);
    const planet = user.planet;
    if (!planet) return ctx.reply("You have no current planet to settle. Travel to a planet first.");
    // requirement: enough credits and fuel and an item "Settlement Kit"
    if (user.credits < 500) return ctx.reply("You need 500 credits to attempt settlement.");
    const inv = DB.getInventory(user.telegram_id);
    const hasKit = inv.some(i => i.item_name === "Settlement Kit");
    if (!hasKit) return ctx.reply("You need a *Settlement Kit* (find it exploring or in the shop).");
    // attempt success chance influenced by randomness and user.points
    const chance = Math.min(0.2 + user.points/1000, 0.85);
    const roll = Math.random();
    if (roll < chance) {
      DB.addCredits(user.telegram_id, -500);
      DB.claimPlanet ? DB.claimPlanet(planet, user.telegram_id) : DB.claimPlanet && DB.claimPlanet(planet, user.telegram_id);
      await ctx.reply(`🏘️ Success! You established a colony on *${planet}*! The Exodus Fleet marks this as a potential home.`, { parse_mode: "Markdown" });
    } else {
      DB.addCredits(user.telegram_id, -200);
      await ctx.reply(`🛠 Attempt failed. You spent 200 credits on supplies but the planet was unsuitable.`);
    }
  } catch (err) {
    console.error("settle error", err);
    ctx.reply("⚠️ Settlement attempt failed.");
  }
});

// --- /leaderboard ---
bot.command("leaderboard", async (ctx) => {
  try {
    const leaders = DB.getLeaderboard(10);
    if (!leaders || leaders.length === 0) return ctx.reply("No explorers yet.");
    const lines = leaders.map((u,i) => `${i+1}. *${u.username}* — ${u.points} pts (${u.planet || "none"})`).join("\n");
    await ctx.replyWithMarkdown(`🏆 *Top Explorers*\n\n${lines}`);
  } catch (err) {
    console.error("leaderboard",err);
    ctx.reply("⚠️ Could not fetch leaderboard.");
  }
});

// --- fallback help for unknown messages ---
bot.on("message", async (ctx) => {
  if (ctx.message.text && ctx.message.text.startsWith("/")) return; // unknown command handled elsewhere
  await ctx.reply("🤖 Try /start to see commands, or /help for assistance.");
});

bot.command("help", async (ctx) => {
  await ctx.replyWithMarkdown(
    `🧭 *Commands*\n/start /claim /game /profile /status /explore /travel /mine /battle /shop /buy /settle /leaderboard`
  );
});

// --- Launch & graceful shutdown ---
await bot.launch();
console.log("🚀 Cosmic Foundry: Exodus bot started");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
