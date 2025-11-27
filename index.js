// index.js
// Cosmic Foundry – Crystal Fantasy Edition

import dotenv from "dotenv";
import { Telegraf, Markup } from "telegraf";
import {
  initDB,
  getOrCreateUser,
  addXP,
  addCredits,
  claimDaily,
  getUserById,
} from "./db.js";

dotenv.config();

// ============================
// Basic safety checks
// ============================
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is missing from environment variables.");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ============================
// Helper data & functions
// ============================

// Planets (flavor only – no DB changes needed)
const PLANETS = [
  {
    name: "Aetherion",
    emoji: "💠",
    danger: "★★★☆☆",
    theme: "crystal storms & light fractals",
  },
  {
    name: "Umbraxis",
    emoji: "🌑",
    danger: "★★★★☆",
    theme: "shadow seas & void beasts",
  },
  {
    name: "Cryolune",
    emoji: "❄️",
    danger: "★★☆☆☆",
    theme: "frozen ruins & aurora spirits",
  },
  {
    name: "Nebulon Veil",
    emoji: "🌌",
    danger: "★★★★★",
    theme: "living nebulae & star leviathans",
  },
];

const COMPANIONS = [
  "Lumi (chaotic glow-blob mage)",
  "Scrig (hyper gremlin engineer)",
  "Zeke (sarcastic combat drone)",
  "a mysterious crystal warden",
  "a rogue fairy from the last human-suitable world",
];

const MUSIC_VIBES = [
  "🎧 Lo-fi starfield beats",
  "🎸 Neon synth-rock riffs",
  "🎻 Cosmic fantasy orchestra",
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatProfile(user) {
  // user shape expected: id, username, xp, credits, level
  const name = user.username || "Traveler";
  const level = user.level ?? 1;
  const xp = user.xp ?? 0;
  const credits = user.credits ?? 0;

  return (
    "🧭 *Traveler Profile*\n" +
    `🆔 ID: \`${user.id}\`\n` +
    `👤 Name: *${name}*\n` +
    `⭐ Level: *${level}*\n` +
    `📈 XP: *${xp}*\n` +
    `💳 Credits: *${credits}*\n`
  );
}

// Quick XP → level flavor (no DB change – just visual)
function getLevelTitle(level) {
  if (level >= 25) return "Mythic Riftwalker";
  if (level >= 18) return "Crystal Paragon";
  if (level >= 12) return "Starlight Vanguard";
  if (level >= 7) return "Aether Explorer";
  if (level >= 3) return "Rookie Drifter";
  return "Lost Wanderer";
}

// ============================
// /start & /help
// ============================

bot.start(async (ctx) => {
  const tgUser = ctx.from;
  await getOrCreateUser(tgUser);

  const planet = pickRandom(PLANETS);
  const companion = pickRandom(COMPANIONS);
  const vibe = pickRandom(MUSIC_VIBES);

  const text = `
🌌 *Welcome to Cosmic Foundry: Exodus – Crystal Fantasy Edition* 🌌

Your home world is gone.  
You and your crew drift through deep space, chasing rumors of a *new human-suitable world* guarded by ancient magic and vicious alien beasts.

You wake up on *${planet.emoji} ${planet.name}* – a world of ${planet.theme}.  
At your side: *${companion}*.

🎵 Background vibe: _${vibe}_

Use these commands to begin:
• /profile – view your stats
• /daily – claim your daily crystal stipend
• /explore – risky adventures for XP & credits
• /fight – battles vs creatures & mini-bosses
• /help – show all commands again
`;

  await ctx.reply(text, { parse_mode: "Markdown" });
});

// Short help
bot.command("help", async (ctx) => {
  const text = `
🛰 *Command Deck*

• /profile – your level, XP, credits
• /daily – free daily reward (once per day)
• /explore – story-style adventure with rewards
• /fight – combat encounter vs creatures or bosses
• /lore – random bit of Exodus story
• /scan – quick flavor ping about a random planet
`;
  await ctx.reply(text, { parse_mode: "Markdown" });
});

// ============================
// /profile
// ============================

bot.command("profile", async (ctx) => {
  try {
    const id = String(ctx.from.id);
    let user = await getUserById(id);
    if (!user) {
      user = await getOrCreateUser(ctx.from);
    }

    const levelTitle = getLevelTitle(user.level ?? 1);
    const baseProfile = formatProfile(user);

    const extra = `🏷 Title: *${levelTitle}*\n🎭 Companion: *${pickRandom(
      COMPANIONS
    )}*\n`;

    await ctx.reply(baseProfile + "\n" + extra, {
      parse_mode: "Markdown",
    });
  } catch (err) {
    console.error("Error in /profile:", err);
    await ctx.reply("⚠️ Couldn't load your profile. Try again in a moment.");
  }
});

// ============================
// /daily – crystal stipend
// ============================

bot.command("daily", async (ctx) => {
  try {
    const id = String(ctx.from.id);
    const result = await claimDaily(id);

    if (!result || result.ok === false) {
      const hours =
        (result && result.hoursLeft != null)
          ? result.hoursLeft
          : "a few";
      await ctx.reply(
        `⏳ You've already claimed your daily crystals.\nCome back in ~${hours} hour(s).`
      );
      return;
    }

    const credits = result.credits ?? 0;

    const text = `
🎁 *Daily Crystal Stipend*

You meditate at the Celestial Foundry and receive *${credits}* credits in shimmering shards.

✨ New balance will show in /profile.
`;
    await ctx.reply(text, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("Error in /daily:", err);
    await ctx.reply(
      "⚠️ Something went wrong while claiming your daily reward."
    );
  }
});

// ============================
// /explore – story adventure
// ============================

bot.command("explore", async (ctx) => {
  try {
    const tgUser = ctx.from;
    const user = await getOrCreateUser(tgUser);
    const planet = pickRandom(PLANETS);

    const events = [
      {
        text: `You follow a trail of *singing crystals* across ${planet.emoji} *${planet.name}*. One cracks open, revealing a map fragment.`,
        xp: 30,
        credits: 15,
      },
      {
        text: `A storm of glittering shards slams into your hull. You barely stabilize the ship and salvage the storm’s residue.`,
        xp: 40,
        credits: 10,
      },
      {
        text: `You discover ruins where *fairies and elves* once bargained with alien warlords. A hidden chamber still hums with power.`,
        xp: 50,
        credits: 25,
      },
      {
        text: `An eerie choir echoes from a floating forest. Lumi steals a glowing fruit. Scrig swears it’s alive. You run.`,
        xp: 35,
        credits: 18,
      },
      {
        text: `You help a stranded caravan of crystal nomads. They pay you in mystic shards and a blessing for future battles.`,
        xp: 45,
        credits: 22,
      },
    ];

    const outcome = pickRandom(events);
    const id = String(user.id);

    await addXP(id, outcome.xp);
    await addCredits(id, outcome.credits);

    const replyText = `
🧭 *Exploring ${planet.emoji} ${planet.name}*
${outcome.text}

✨ XP +${outcome.xp}
💳 Credits +${outcome.credits}
Danger level: *${planet.danger}*
`;

    await ctx.reply(replyText, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("Error in /explore:", err);
    await ctx.reply("⚠️ Something went wrong while exploring.");
  }
});

// ============================
// /fight – RPG combat
// ============================

bot.command("fight", async (ctx) => {
  try {
    const tgUser = ctx.from;
    const user = await getOrCreateUser(tgUser);
    const id = String(user.id);

    const planet = pickRandom(PLANETS);

    // Encounter roll
    const roll = Math.random();
    let encounterType = "creature";
    if (roll < 0.05) {
      encounterType = "world_boss";
    } else if (roll < 0.25) {
      encounterType = "elite";
    }

    let enemy;
    let xp;
    let credits;
    let abilityText;

    if (encounterType === "world_boss") {
      enemy = "🌋 Rift-Titan of " + planet.name;
      xp = 120;
      credits = 80;
      abilityText =
        "It warps reality with every step, but your crew pulls off an impossible win.";
    } else if (encounterType === "elite") {
      enemy = "💀 Crystal Warlord";
      xp = 70;
      credits = 40;
      abilityText =
        "Its blade hums with stolen memories, but Zeke lands a perfect shot.";
    } else {
      const creatures = [
        "Shardcrawler",
        "Void Howler",
        "Nebula Serpent",
        "Aether Ghoul",
        "Runefang Beast",
      ];
      enemy = pickRandom(creatures);
      xp = 30 + Math.floor(Math.random() * 15);
      credits = 15 + Math.floor(Math.random() * 10);
      abilityText = "You coordinate with your companions and strike at its weak spots.";
    }

    await addXP(id, xp);
    await addCredits(id, credits);

    const replyText = `
⚔️ *Battle Report*

You engage *${enemy}* on ${planet.emoji} *${planet.name}*.
${abilityText}

✨ XP Earned: *${xp}*
💳 Credits Earned: *${credits}*
`;

    await ctx.reply(replyText, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("Error in /fight:", err);
    await ctx.reply("⚠️ Something went wrong in battle.");
  }
});

// ============================
// /lore – random story bit
// ============================

bot.command("lore", async (ctx) => {
  const bits = [
    "Legends say the final human-suitable world hides behind a curtain of living aurora.",
    "Some say Lumi was once a star fragment that refused to stop dreaming.",
    "Old captains whisper that Zeke was built from scavenged war-tech and a cursed fairy core.",
    "The Foundry isn’t just a place – it’s a memory of every world that ever died.",
    "On some planets, the monsters are kinder than the survivors who fled there.",
  ];

  const text = `📜 *Exodus Lore*\n\n_${pickRandom(bits)}_`;
  await ctx.reply(text, { parse_mode: "Markdown" });
});

// ============================
// /scan – quick planet ping
// ============================

bot.command("scan", async (ctx) => {
  const planet = pickRandom(PLANETS);
  const text = `
🔎 *Long-range Scan*

Target: ${planet.emoji} *${planet.name}*
Danger: ${planet.danger}
Notes: ${planet.theme}
`;
  await ctx.reply(text, { parse_mode: "Markdown" });
});

// ============================
// Startup & graceful shutdown
// ============================

(async () => {
  try {
    await initDB();
    await bot.launch();
    console.log(
      "🚀 Cosmic Foundry bot is online (Crystal Fantasy edition)"
    );

    // Graceful stop for Railway
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
  } catch (err) {
    console.error("Failed to start bot:", err);
    process.exit(1);
  }
})();
