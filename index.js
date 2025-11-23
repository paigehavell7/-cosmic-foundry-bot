// index.js
// Cosmic Foundry – Exodus core bot

import dotenv from "dotenv";
import { Telegraf } from "telegraf";
import {
  initDB,
  getOrCreateUser,
  addXP,
  addCredits,
  claimDaily,
  getUserById,
} from "./db.js";

dotenv.config();

// --- Basic safety checks ---
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is missing from environment variables");
  process.exit(1);
}

// --- Init DB & Bot ---
const bot = new Telegraf(BOT_TOKEN);

// --- Helper: format profile text ---
function formatProfile(user) {
  const level = user.level ?? 1;
  const xp = user.xp ?? 0;
  const credits = user.credits ?? 0;
  const planet = user.planet || "Aetherion";

  return (
    "🧑‍🚀 *Traveler Profile*\n\n" +
    `🪪 ID: \`${user.telegram_id}\`\n` +
    `📛 Name: *${user.username || "Unknown"}*\n` +
    `⭐ Level: *${level}*\n` +
    `📊 XP: *${xp}*\n` +
    `💳 Credits: *${credits}*\n` +
    `🪐 Current Planet: *${planet}*`
  );
}

// --- Helper: random int ---
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ==============================
//  CREATURES & BOSSES
// ==============================

// Normal creatures (per planet)
const creatures = [
  // generic
  {
    name: "Prism Stalker",
    minXP: 5,
    maxXP: 15,
    minCredits: 3,
    maxCredits: 8,
  },

  // by planet
  {
    name: "Shardcrawler",
    planet: "Aetherion",
    minXP: 10,
    maxXP: 18,
    minCredits: 5,
    maxCredits: 10,
  },
  {
    name: "Frostshade Beast",
    planet: "Cryolune",
    minXP: 12,
    maxXP: 20,
    minCredits: 7,
    maxCredits: 12,
  },
  {
    name: "Umbral Warg",
    planet: "Umbrava",
    minXP: 14,
    maxXP: 22,
    minCredits: 9,
    maxCredits: 14,
  },
  {
    name: "Rustfiend Ghoul",
    planet: "Ruinfall",
    minXP: 15,
    maxXP: 25,
    minCredits: 10,
    maxCredits: 15,
  },
];

// Mini-bosses (rare)
const minibosses = [
  {
    name: "Crystal Howler",
    planet: "Aetherion",
    ability: "Shard Burst",
    xp: 35,
    credits: 20,
  },
  {
    name: "Frost Revenant",
    planet: "Cryolune",
    ability: "Freezing Gaze",
    xp: 40,
    credits: 25,
  },
  {
    name: "Umbra Reaper",
    planet: "Umbrava",
    ability: "Shadow Slice",
    xp: 45,
    credits: 30,
  },
  {
    name: "Iron Rot Ogre",
    planet: "Ruinfall",
    ability: "Corrosion Smash",
    xp: 50,
    credits: 35,
  },
];

// Planet bosses
const planetBosses = [
  {
    name: "Aetherion Wyrm",
    planet: "Aetherion",
    ability: "Prismatic Breath",
    xp: 120,
    credits: 80,
  },
  {
    name: "Cryolord Titan",
    planet: "Cryolune",
    ability: "Absolute Zero",
    xp: 130,
    credits: 90,
  },
  {
    name: "Umbral Devourer",
    planet: "Umbrava",
    ability: "Soul Rend",
    xp: 150,
    credits: 100,
  },
  {
    name: "Ruinfall Colossus",
    planet: "Ruinfall",
    ability: "Decay Pulse",
    xp: 160,
    credits: 120,
  },
];

// Ultra-rare world boss
const worldBoss = {
  name: "Astral Leviathan",
  ability: "Cosmic Rupture",
  xp: 300,
  credits: 250,
};

// ==============================
//  COMMANDS
// ==============================

// /start – intro story
bot.start(async (ctx) => {
  try {
    await getOrCreateUser(ctx.from);

    const text = `
🛰 *Welcome to Cosmic Foundry: Exodus* 🌌

Your home planet has fallen. You and your crew now travel across dangerous alien worlds, searching for a new home and fighting terrifying creatures.

✨ You begin your journey with *100 credits*.
💰 You can claim *10 daily credits* with /daily.

Use these commands to begin:
• /profile – view your stats
• /daily – claim your daily reward
• /explore – quick adventure for XP & credits
• /fight – battle vs creatures & bosses
• /help – show all commands

Your journey starts now, Traveler. ✨
  `;

    await ctx.reply(text, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("Error in /start:", err);
    ctx.reply("⚠️ Something went wrong starting your journey.");
  }
});

// /help – show commands
bot.command("help", (ctx) => {
  const text = `
🛰 *Cosmic Foundry Commands*

/start – story intro & basic info
/profile – view your stats
/daily – claim your daily credits
/explore – fast XP & credits
/fight – battle creatures & bosses
/help – show this help
  `;
  ctx.reply(text, { parse_mode: "Markdown" });
});

// /profile – show stats
bot.command("profile", async (ctx) => {
  try {
    const id = String(ctx.from.id);
    let user = await getUserById(id);
    if (!user) {
      user = await getOrCreateUser(ctx.from);
    }
    await ctx.reply(formatProfile(user), { parse_mode: "Markdown" });
  } catch (err) {
    console.error("Error in /profile:", err);
    ctx.reply("⚠️ Couldn't load your profile.");
  }
});

// /daily – daily credits (DB handles cooldown)
bot.command("daily", async (ctx) => {
  try {
    const id = String(ctx.from.id);
    const result = await claimDaily(id);

    if (!result || result.ok === false) {
      const hours = result?.hoursLeft ?? 0;
      ctx.reply(`⏳ You've already claimed your daily credits.\nCome back in ~${hours.toFixed(1)} hours.`);
      return;
    }

    ctx.reply(
      `🎁 You claimed *${result.credits}* daily credits!\n💳 New balance: *${result.totalCredits}*`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("Error in /daily:", err);
    ctx.reply("⚠️ Something went wrong with your daily claim.");
  }
});

// /explore – simple adventure with flavor outcomes
bot.command("explore", async (ctx) => {
  try {
    const tgUser = ctx.from;
    const user = await getOrCreateUser(tgUser);
    const planet = user.planet || "Aetherion";

    const outcomes = [
      {
        text: `You explore a shattered crystal canyon on ${planet}. Shard-light dances around your ship.`,
        xp: 15,
        credits: 10,
      },
      {
        text: `You discover a hidden ice cavern on ${planet} filled with ancient alien tech.`,
        xp: 20,
        credits: 8,
      },
      {
        text: `You drift through Aether storms above ${planet}, mapping safe routes for future travelers.`,
        xp: 25,
        credits: 5,
      },
      {
        text: `You scout a corrupted ridge on ${planet}, tagging dangerous zones for the Exodus fleet.`,
        xp: 30,
        credits: 12,
      },
    ];

    const outcome = outcomes[rand(0, outcomes.length - 1)];
    const id = String(tgUser.id);

    await addXP(id, outcome.xp);
    await addCredits(id, outcome.credits);

    const replyText = `
🛰 *Exploring* 🪐 *${planet}*

${outcome.text}

✨ XP +${outcome.xp}
💳 Credits +${outcome.credits}
    `;
    ctx.reply(replyText, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("Error in /explore:", err);
    ctx.reply("⚠️ Something went wrong while exploring.");
  }
});

// /fight – upgraded RPG battle system
bot.command("fight", async (ctx) => {
  try {
    const tgUser = ctx.from;
    const id = String(tgUser.id);
    const user = await getOrCreateUser(tgUser);
    const planet = user.planet || "Aetherion";

    // Roll encounter type
    const roll = Math.random();
    let encounterType = "creature";
    let encounter;

    if (roll < 0.01) {
      // 1% chance – World Boss
      encounterType = "worldBoss";
      encounter = worldBoss;
    } else if (roll < 0.15) {
      // 14% Planet Boss (0.01 - 0.15)
      encounterType = "planetBoss";
      encounter = planetBosses.find((b) => b.planet === planet) || planetBosses[0];
    } else if (roll < 0.40) {
      // 25% Mini-Boss (0.15 - 0.40)
      encounterType = "miniboss";
      encounter = minibosses.find((m) => m.planet === planet) || minibosses[0];
    } else {
      // 60% regular creature
      const pool = creatures.filter((c) => !c.planet || c.planet === planet);
      encounterType = "creature";
      encounter = pool[rand(0, pool.length - 1)];
    }

    let xp = 0;
    let credits = 0;
    let title = "";
    let abilityText = "";
    let flavor = "";

    if (encounterType === "creature") {
      xp = rand(encounter.minXP, encounter.maxXP);
      credits = rand(encounter.minCredits, encounter.maxCredits);
      title = `🐾 Battle: *${encounter.name}*`;
      flavor = `You clash with a roaming *${encounter.name}* on *${planet}* and emerge victorious.`;
    } else if (encounterType === "miniboss") {
      xp = encounter.xp;
      credits = encounter.credits;
      title = `⚠️ Mini-Boss Fight: *${encounter.name}*`;
      abilityText = `🌀 Special Ability: *${encounter.ability}*`;
      flavor = `The air crackles as *${encounter.name}* appears on *${planet}*. After a brutal fight, you bring it down.`;
    } else if (encounterType === "planetBoss") {
      xp = encounter.xp;
      credits = encounter.credits;
      title = `👹 Planet Boss: *${encounter.name}*`;
      abilityText = `🔥 Ultimate Ability: *${encounter.ability}*`;
      flavor = `The fate of *${planet}* hangs in the balance as you face *${encounter.name}*. Against all odds, you win.`;
    } else if (encounterType === "worldBoss") {
      xp = encounter.xp;
      credits = encounter.credits;
      title = `🌌 WORLD BOSS ENCOUNTER!!! *${encounter.name}*`;
      abilityText = `💥 Cataclysmic Ability: *${encounter.ability}*`;
      flavor =
        "Across the stars, alarms blare: the *Astral Leviathan* breaches reality itself. Your victory becomes legend among the Exodus fleet.";
    }

    await addXP(id, xp);
    await addCredits(id, credits);

    const replyText = `
${title}

${flavor}
${abilityText ? "\n" + abilityText + "\n" : ""}✨ XP Earned: *${xp}*
💳 Credits Earned: *${credits}*
🪐 Planet: *${planet}*
    `;

    ctx.reply(replyText, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("Error in /fight:", err);
    ctx.reply("⚠️ Something went wrong in battle.");
  }
});

// ==============================
//  STARTUP
// ==============================

(async () => {
  try {
    await initDB();
    await bot.launch();
    console.log("🚀 Cosmic Foundry bot is online.");

    // graceful shutdown
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
  } catch (err) {
    console.error("Failed to start bot:", err);
    process.exit(1);
  }
})();
