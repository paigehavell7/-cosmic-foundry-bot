// index.js – Cosmic Foundry: Exodus core bot (ESM)

import dotenv from "dotenv";
import { Telegraf, Markup } from "telegraf";
import {
  initDB,
  getOrCreateUser,
  addXP,
  addCredits,
  claimDaily,
  getUserById,
  setPlanet,
} from "./db.js";

dotenv.config();

// --- Safety check for BOT_TOKEN ------------------------------

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is missing from environment variables.");
  process.exit(1);
}

// --- Planet & creature config --------------------------------

const PLANETS = {
  aetherion: {
    name: "Aetherion",
    emoji: "💎",
    difficulty: 1,
    description: "Crystal nebula fields and gentle alien life.",
    creatures: [
      { name: "Prism Stalker", emoji: "💠" },
      { name: "Shard Titan", emoji: "🪨" },
      { name: "Crystal Wraith", emoji: "👻" },
      { name: "Glimmerfang", emoji: "✨" },
    ],
    exploreEvents: [
      {
        text: "You glide through glowing crystal arches and absorb ambient starlight.",
        xp: 15,
        credits: 10,
      },
      {
        text: "You discover a singing geode that hums with alien energy.",
        xp: 20,
        credits: 8,
      },
      {
        text: "A shard storm passes by, but you navigate it like a pro pilot.",
        xp: 25,
        credits: 5,
      },
    ],
    fight: {
      winChance: 0.8,
      xpMin: 10,
      xpMax: 20,
      creditsMin: 8,
      creditsMax: 18,
    },
  },

  pyraxis: {
    name: "Pyraxis",
    emoji: "🌋",
    difficulty: 2,
    description: "Lava oceans, ash skies, and molten nightmares.",
    creatures: [
      { name: "Inferno Dragonling", emoji: "🐲" },
      { name: "Magma Serpent", emoji: "🔥" },
      { name: "Ember Titan", emoji: "🧱" },
      { name: "Hellhound Brute", emoji: "🐺" },
    ],
    exploreEvents: [
      {
        text: "You skim over rivers of lava, mapping safe landing paths.",
        xp: 25,
        credits: 15,
      },
      {
        text: "You salvage heat-resistant alloys from a crashed shuttle.",
        xp: 30,
        credits: 20,
      },
      {
        text: "Ash storms batter your hull, but your piloting earns respect.",
        xp: 35,
        credits: 10,
      },
    ],
    fight: {
      winChance: 0.7,
      xpMin: 18,
      xpMax: 30,
      creditsMin: 15,
      creditsMax: 30,
    },
  },

  umbrava: {
    name: "Umbrava",
    emoji: "🌑",
    difficulty: 3,
    description: "Endless night, shadow fog, and whispering horrors.",
    creatures: [
      { name: "Voidfeeder", emoji: "🕳️" },
      { name: "Nightmare Lurker", emoji: "👁️" },
      { name: "Shadowborn Reaper", emoji: "⚔️" },
      { name: "Umbra Wolf", emoji: "🐺" },
    ],
    exploreEvents: [
      {
        text: "You trace strange runes that glimmer faintly in the dark mist.",
        xp: 30,
        credits: 15,
      },
      {
        text: "A chorus of unseen voices guides you around a deadly chasm.",
        xp: 35,
        credits: 18,
      },
      {
        text: "Your sensors briefly glimpse an ancient structure… then it vanishes.",
        xp: 40,
        credits: 20,
      },
    ],
    fight: {
      winChance: 0.65,
      xpMin: 25,
      xpMax: 40,
      creditsMin: 20,
      creditsMax: 35,
    },
  },

  cryolune: {
    name: "Cryolune",
    emoji: "❄️",
    difficulty: 3,
    description: "Frozen wastes, ice caverns, and crystalline predators.",
    creatures: [
      { name: "Frost Stalker", emoji: "🐾" },
      { name: "Ice Revenant", emoji: "🧊" },
      { name: "Blizzard Wyrm", emoji: "🐉" },
      { name: "Cryo Beast", emoji: "🦴" },
    ],
    exploreEvents: [
      {
        text: "You chart a path through glittering ice spires under a pale moon.",
        xp: 28,
        credits: 14,
      },
      {
        text: "You rescue a frozen probe and download valuable scan data.",
        xp: 32,
        credits: 22,
      },
    ],
    fight: {
      winChance: 0.62,
      xpMin: 24,
      xpMax: 38,
      creditsMin: 20,
      creditsMax: 36,
    },
  },

  nebulon: {
    name: "Nebulon Veil",
    emoji: "☁️",
    difficulty: 4,
    description: "Storm-torn gas colossi and lightning-born spirits.",
    creatures: [
      { name: "Plasma Specter", emoji: "⚡" },
      { name: "Nebula Phantom", emoji: "👻" },
      { name: "Storm Angel", emoji: "🪽" },
      { name: "Thunder Leviathan", emoji: "🐋" },
    ],
    exploreEvents: [
      {
        text: "You surf ion winds, charging your ship with raw lightning.",
        xp: 40,
        credits: 25,
      },
      {
        text: "You triangulate a storm’s eye and harvest rare energy crystals.",
        xp: 45,
        credits: 30,
      },
    ],
    fight: {
      winChance: 0.55,
      xpMin: 35,
      xpMax: 55,
      creditsMin: 30,
      creditsMax: 55,
    },
  },

  ruinfal: {
    name: "Ruinfall",
    emoji: "💀",
    difficulty: 5,
    description: "Broken worlds haunted by undead cosmic titans.",
    creatures: [
      { name: "Cosmic Ghoul", emoji: "🧟‍♂️" },
      { name: "Bone Titan", emoji: "🦴" },
      { name: "Void Reanimator", emoji: "🧪" },
      { name: "Astral Revenant", emoji: "🌌" },
    ],
    exploreEvents: [
      {
        text: "You traverse shattered space stations crawling with eerie silence.",
        xp: 50,
        credits: 40,
      },
      {
        text: "You recover an ancient relic that hums with forbidden power.",
        xp: 60,
        credits: 50,
      },
    ],
    fight: {
      winChance: 0.48,
      xpMin: 45,
      xpMax: 70,
      creditsMin: 40,
      creditsMax: 80,
    },
  },
};

const PLANET_KEYS = Object.keys(PLANETS);

// --- Utility helpers -----------------------------------------

function getPlanetForUser(user) {
  const key = user.planet && PLANETS[user.planet] ? user.planet : "aetherion";
  return { key, planet: PLANETS[key] };
}

function difficultyStars(diff) {
  const max = 5;
  return "★".repeat(diff) + "☆".repeat(max - diff);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- Init DB & bot -------------------------------------------

initDB();

const bot = new Telegraf(BOT_TOKEN);

// --- /start --------------------------------------------------

bot.start(async (ctx) => {
  const user = await getOrCreateUser(ctx.from);
  const { planet } = getPlanetForUser(user);

  await ctx.reply(
    `🛰 *Welcome to Cosmic Foundry: Exodus*\n\n` +
      `Your home planet has fallen. You and your crew now travel across dangerous alien worlds, ` +
      `searching for a new home and fighting terrifying creatures.\n\n` +
      `✨ You begin your journey with *${user.credits} credits*.\n` +
      `💫 Your current route is set toward ${planet.emoji} *${planet.name}*.\n\n` +
      `Use these commands to begin:\n` +
      `• /profile – view your stats\n` +
      `• /daily – claim your daily reward\n` +
      `• /planet – choose which world to explore\n` +
      `• /explore – quick adventure for XP & credits\n` +
      `• /fight – simple battle vs a random creature\n` +
      `• /help – show all commands`,
    { parse_mode: "Markdown" }
  );
});

// --- /help ---------------------------------------------------

bot.command("help", async (ctx) => {
  await ctx.reply(
    `🛰 *Cosmic Foundry Commands*\n\n` +
      `• /profile – view your stats\n` +
      `• /daily – claim your daily reward\n` +
      `• /planet – choose which planet to travel to\n` +
      `• /explore – story events & small rewards\n` +
      `• /fight – battle creatures for bigger rewards`,
    { parse_mode: "Markdown" }
  );
});

// --- /profile ------------------------------------------------

bot.command("profile", async (ctx) => {
  const user = await getOrCreateUser(ctx.from);
  const { planet } = getPlanetForUser(user);

  await ctx.reply(
    `🧑‍🚀 *Traveler Profile*\n` +
      `🪪 ID: ${user.telegram_id}\n` +
      `👤 Name: ${user.username}\n` +
      `⭐ Level: ${user.level}\n` +
      `📊 XP: ${user.xp}\n` +
      `💳 Credits: ${user.credits}\n` +
      `🌍 Current Planet: ${planet.emoji} ${planet.name} (${difficultyStars(
        planet.difficulty
      )})`,
    { parse_mode: "Markdown" }
  );
});

// --- /daily --------------------------------------------------

bot.command("daily", async (ctx) => {
  const user = await getOrCreateUser(ctx.from);
  const result = await claimDaily(user.telegram_id);

  if (!result.ok) {
    await ctx.reply("⏳ You've already claimed your daily credits. Come back later.");
    return;
  }

  await ctx.reply(
    `🎁 You claimed *${result.reward}* daily credits!`,
    { parse_mode: "Markdown" }
  );
});

// --- /planet – choose destination ----------------------------

bot.command("planet", async (ctx) => {
  const user = await getOrCreateUser(ctx.from);
  const { key: currentKey } = getPlanetForUser(user);

  const rows = PLANET_KEYS.map((planetKey) => {
    const p = PLANETS[planetKey];
    const label =
      `${p.emoji} ${p.name} ` +
      `(${difficultyStars(p.difficulty)})` +
      (planetKey === currentKey ? " ✅" : "");
    return [Markup.button.callback(label, `setplanet:${planetKey}`)];
  });

  await ctx.reply(
    "🌍 Choose your destination:",
    Markup.inlineKeyboard(rows)
  );
});

// Handle planet selection
bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery.data || "";

  if (data.startsWith("setplanet:")) {
    const planetKey = data.split(":")[1];

    const config = PLANETS[planetKey];
    if (!config) {
      await ctx.answerCbQuery("Unknown planet.", { show_alert: true });
      return;
    }

    await setPlanet(ctx.from.id, planetKey);

    await ctx.answerCbQuery(`Course set for ${config.name}!`);
    await ctx.editMessageText(
      `🛰 Course locked: ${config.emoji} *${config.name}*\n\n` +
        `${config.description}`,
      { parse_mode: "Markdown" }
    );
  }
});

// --- /explore – planet-based events --------------------------

bot.command("explore", async (ctx) => {
  const user = await getOrCreateUser(ctx.from);
  const { planet } = getPlanetForUser(user);

  const events = planet.exploreEvents;
  const event = events[Math.floor(Math.random() * events.length)];

  await addXP(user.telegram_id, event.xp);
  await addCredits(user.telegram_id, event.credits);

  await ctx.reply(
    `🛰 Exploring ${planet.emoji} *${planet.name}*\n\n` +
      `${event.text}\n\n` +
      `✨ XP +${event.xp}\n` +
      `💳 Credits +${event.credits}`,
    { parse_mode: "Markdown" }
  );
});

// --- /fight – planet-based creatures & difficulty ------------

bot.command("fight", async (ctx) => {
  const user = await getOrCreateUser(ctx.from);
  const { planet } = getPlanetForUser(user);

  const creature =
    planet.creatures[Math.floor(Math.random() * planet.creatures.length)];

  const cfg = planet.fight;
  const roll = Math.random();
  const win = roll < cfg.winChance;

  if (win) {
    const xpGain = randomInt(cfg.xpMin, cfg.xpMax);
    const creditsGain = randomInt(cfg.creditsMin, cfg.creditsMax);

    await addXP(user.telegram_id, xpGain);
    await addCredits(user.telegram_id, creditsGain);

    await ctx.reply(
      `${creature.emoji} *Battle Victory!*\n\n` +
        `You defeat a ${creature.name} on ${planet.emoji} *${planet.name}*.\n\n` +
        `✨ XP +${xpGain}\n` +
        `💳 Credits +${creditsGain}`,
      { parse_mode: "Markdown" }
    );
  } else {
    const chipXP = Math.floor((cfg.xpMin || 10) / 3);

    if (chipXP > 0) {
      await addXP(user.telegram_id, chipXP);
    }

    await ctx.reply(
      `${creature.emoji} *Battle Lost...*\n\n` +
        `The ${creature.name} overwhelms you on ${planet.emoji} *${planet.name}*.\n` +
        (chipXP > 0
          ? `You barely escape but learn from the encounter.\n✨ XP +${chipXP}`
          : `You retreat to fight another day.`),
      { parse_mode: "Markdown" }
    );
  }
});

// --- Launch bot ----------------------------------------------

bot.launch();
console.log("🚀 Cosmic Foundry bot is online and exploring the galaxy…");

// Graceful shutdown (Railway / Node)
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
