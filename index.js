// Cosmic Foundry Bot – Intergalactic Adventure Edition
import dotenv from "dotenv";
import { Telegraf } from "telegraf";
import {
  initDB,
  getUser,
  dbAddPoints,
  dbSetPlanet,
  dbRecordBattle,
  getLeaderboard,
  dbUpgradeShip,
} from "./db.js";

dotenv.config();

// Initialize bot and DB
const bot = new Telegraf(process.env.BOT_TOKEN);
await initDB();

// --- Helper Functions ---
function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Start Command ---
bot.start(async (ctx) => {
  const user = await getUser(ctx);
  await ctx.reply(
    `🪐 Welcome, *${user.username}*!\n\nYour homeworld was destroyed in the *Solar Collapse*. You now drift through the galaxy aboard your ship, the *Starforged*.\n\nYour mission: explore planets, collect resources, and survive.\n\nCommands:\n/explore – Discover new worlds\n/battle – Engage alien threats\n/mine – Harvest resources\n/shop – Purchase upgrades\n/upgrade – Improve your ship\n/leaderboard – Top explorers\n/profile – Check your stats`,
    { parse_mode: "Markdown" }
  );
});

// --- Explore Command ---
bot.command("explore", async (ctx) => {
  const user = await getUser(ctx);
  const planets = [
    "Eclipsera",
    "Nethara",
    "Dravon-9",
    "Solara Prime",
    "Vortexia",
    "Crython",
    "Talorr IV",
    "Ashen Verge",
    "Reddust Colony",
  ];
  const newPlanet = randomFrom(planets);
  const discoveries = [
    "ancient ruins glowing with plasma veins",
    "a field of living crystals",
    "a derelict alien vessel half-buried in sand",
    "a volcano emitting quantum gas",
    "a temple guarded by robotic sentinels",
    "a shimmering oasis beneath twin suns",
  ];
  const discovery = randomFrom(discoveries);

  await dbSetPlanet(user.telegram_id, newPlanet);
  await dbAddPoints(user.telegram_id, 15);

  await ctx.reply(
    `🌍 You’ve landed on *${newPlanet}*.\nYou discover ${discovery} and gain **+15 points!**\n\nYour adventure continues...`,
    { parse_mode: "Markdown" }
  );
});

// --- Battle Command ---
bot.command("battle", async (ctx) => {
  const user = await getUser(ctx);
  const enemies = [
    "Xelorian Warlord",
    "Nebula Serpent",
    "Void Pirate",
    "Drone Swarm",
    "Titan-class Sentinel",
  ];
  const enemy = randomFrom(enemies);
  const outcome = Math.random() > 0.5 ? "win" : "lose";
  const dmg = Math.floor(Math.random() * 30) + 10;

  if (outcome === "win") {
    await dbAddPoints(user.telegram_id, dmg);
    await dbRecordBattle(user.telegram_id, "win");
    await ctx.reply(
      `⚔️ You faced a *${enemy}* and emerged victorious!\nYou earned **+${dmg} points** and salvaged alien tech.`
    );
  } else {
    await dbAddPoints(user.telegram_id, -10);
    await dbRecordBattle(user.telegram_id, "lose");
    await ctx.reply(
      `💥 You fought a *${enemy}* but were defeated.\nYour ship sustained damage and you lost **10 points**.`
    );
  }
});

// --- Mining Command ---
bot.command("mine", async (ctx) => {
  const minerals = ["Aetherite", "Nova Shards", "Cryo Dust", "Luminite"];
  const found = randomFrom(minerals);
  const reward = Math.floor(Math.random() * 20) + 5;

  const user = await getUser(ctx);
  await dbAddPoints(user.telegram_id, reward);

  await ctx.reply(
    `⛏ You mined on ${user.planet || "an uncharted rock"} and discovered *${found}*! You gained **+${reward} points**.`,
    { parse_mode: "Markdown" }
  );
});

// --- Shop Command ---
bot.command("shop", async (ctx) => {
  const shopItems = [
    { name: "Shield Mk I", cost: 60 },
    { name: "Hyperfuel Injector", cost: 80 },
    { name: "Salvager Arm", cost: 40 },
    { name: "Warp Drive Core", cost: 120 },
    { name: "Quantum Scanner", cost: 150 },
  ];

  const list = shopItems
    .map((item, i) => `${i + 1}. ${item.name} – ${item.cost} pts`)
    .join("\n");

  await ctx.reply(`🛒 *Cosmic Foundry Market:*\n${list}\n\nUse /buy <item number> to purchase.`, {
    parse_mode: "Markdown",
  });
});

// --- Buy Command ---
bot.command("buy", async (ctx) => {
  try {
    const parts = ctx.message.text.split(" ");
    const idx = parseInt(parts[1]);
    if (isNaN(idx)) return ctx.reply("⚠️ Usage: /buy <item number>");

    const items = [
      { name: "Shield Mk I", cost: 60 },
      { name: "Hyperfuel Injector", cost: 80 },
      { name: "Salvager Arm", cost: 40 },
      { name: "Warp Drive Core", cost: 120 },
      { name: "Quantum Scanner", cost: 150 },
    ];

    const item = items[idx - 1];
    if (!item) return ctx.reply("❌ That item doesn’t exist.");

    const user = await getUser(ctx);
    if (user.points < item.cost) return ctx.reply("🚫 Not enough points!");

    await dbAddPoints(user.telegram_id, -item.cost);
    await ctx.reply(`🧰 You’ve purchased *${item.name}*!`, { parse_mode: "Markdown" });
  } catch (err) {
    console.error(err);
    await ctx.reply("⚠️ Purchase failed.");
  }
});

// --- Upgrade Command ---
bot.command("upgrade", async (ctx) => {
  const upgrades = [
    { name: "Hull Reinforcement", cost: 100, bonus: 25 },
    { name: "Energy Core Boost", cost: 200, bonus: 50 },
    { name: "AI Combat Suite", cost: 300, bonus: 75 },
  ];

  const user = await getUser(ctx);
  const list = upgrades
    .map((u, i) => `${i + 1}. ${u.name} – ${u.cost} pts (+${u.bonus} strength)`)
    .join("\n");

  await ctx.reply(
    `🔧 *Ship Upgrades Available:*\n${list}\n\nUse /upgradebuy <number> to install an upgrade.`,
    { parse_mode: "Markdown" }
  );
});

bot.command("upgradebuy", async (ctx) => {
  try {
    const num = parseInt(ctx.message.text.split(" ")[1]);
    if (isNaN(num)) return ctx.reply("⚠️ Usage: /upgradebuy <number>");

    const upgrades = [
      { name: "Hull Reinforcement", cost: 100, bonus: 25 },
      { name: "Energy Core Boost", cost: 200, bonus: 50 },
      { name: "AI Combat Suite", cost: 300, bonus: 75 },
    ];
    const upgrade = upgrades[num - 1];
    if (!upgrade) return ctx.reply("❌ Invalid upgrade ID.");

    const user = await getUser(ctx);
    if (user.points < upgrade.cost) return ctx.reply("🚫 Not enough points!");

    await dbAddPoints(user.telegram_id, -upgrade.cost);
    await dbUpgradeShip(user.telegram_id, upgrade.name);
    await ctx.reply(`🚀 Installed *${upgrade.name}*! Your ship grows stronger.`);
  } catch (err) {
    console.error("upgrade error:", err);
    await ctx.reply("⚙️ Upgrade failed.");
  }
});

// --- Profile Command ---
bot.command("profile", async (ctx) => {
  const user = await getUser(ctx);
  const text = `👤 *${user.username}*\nPlanet: ${user.planet || "Unknown"}\nPoints: ${user.points}\nShip: ${
    user.ship || "Starforged"
  }`;
  await ctx.reply(text, { parse_mode: "Markdown" });
});

// --- Leaderboard Command ---
bot.command("leaderboard", async (ctx) => {
  try {
    const leaders = await getLeaderboard();
    if (leaders.length === 0) return ctx.reply("🌌 No explorers yet!");

    const text = leaders
      .map(
        (u, i) =>
          `${i + 1}. 🧑‍🚀 *${u.username}* — ${u.points} pts (${u.planet || "Unknown Planet"})`
      )
      .join("\n");

    await ctx.reply(`🏆 *Top Cosmic Explorers:*\n\n${text}`, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("leaderboard error:", err);
    await ctx.reply("⚠️ Leaderboard unavailable.");
  }
});

// --- Catch-all ---
bot.on("message", async (ctx) => {
  await ctx.reply("🤖 Command not recognized. Try /explore, /mine, or /battle.");
});

// --- Start Bot ---
await bot.launch();
console.log("🚀 Cosmic Foundry Bot is online!");

// --- Shutdown ---
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
// --- Alien Combat System ---
async function battleAliens(ctx, alienType) {
  const user = await getUser(ctx);
  const strength = Math.floor(Math.random() * 20) + user.points;
  const alienStrength = Math.floor(Math.random() * 30) + 10;

  let outcome;
  if (strength > alienStrength) {
    const reward = Math.floor(Math.random() * 50) + 20;
    await addPoints(user.telegram_id, reward);
    outcome = `🛸 You defeated the ${alienType}! You gained ${reward} points.`;
    await recordBattle(user.telegram_id, "victory");
  } else {
    outcome = `💀 The ${alienType} was too strong. You lost this battle.`;
    await recordBattle(user.telegram_id, "defeat");
  }

  await ctx.reply(outcome);
  await showStatus(ctx);
}

// --- Explore Feature ---
bot.command("explore", async (ctx) => {
  const locations = [
    "a glowing crystal cavern",
    "an abandoned alien outpost",
    "a field of bioluminescent plants",
    "a crashed spaceship",
    "an asteroid mining colony"
  ];
  const find = locations[Math.floor(Math.random() * locations.length)];
  const points = Math.floor(Math.random() * 30) + 5;

  const user = await getUser(ctx);
  await addPoints(user.telegram_id, points);

  await ctx.reply(`🚀 You explored ${find} and found ${points} points worth of resources!`);
  await showStatus(ctx);
});

// --- Travel Between Planets ---
bot.command("travel", async (ctx) => {
  const planets = [
    "Aetherion",
    "Zorath Prime",
    "Nexus-9",
    "Cryova",
    "Eclipsera"
  ];
  const newPlanet = planets[Math.floor(Math.random() * planets.length)];

  const user = await getUser(ctx);
  await setPlanet(user.telegram_id, newPlanet);

  await ctx.reply(`🪐 You have traveled to ${newPlanet}! Strange new adventures await you...`);
  await showStatus(ctx);
});

// --- View Stats ---
bot.command("status", async (ctx) => {
  await showStatus(ctx);
});

// --- Helper Display Function ---
async function showStatus(ctx) {
  const user = await getUser(ctx);
  await ctx.reply(
    `👤 *Traveler:* ${user.username}\n` +
    `✨ *Points:* ${user.points}\n` +
    `🌍 *Current Planet:* ${user.planet || "Unknown"}\n` +
    `⚔️ *Battles:* ${user.battles || 0}`,
    { parse_mode: "Markdown" }
  );
}

// --- Start Adventure ---
bot.start(async (ctx) => {
  const user = await getUser(ctx);
  await ctx.reply(
    `🌌 Welcome, ${user.username}! Your home planet was destroyed. You must journey across the stars in search of a new home.\n\n` +
    `🪐 Type /travel to visit a new planet.\n` +
    `⚔️ Type /battle to fight alien creatures.\n` +
    `🔭 Type /explore to search for resources.\n` +
    `📊 Type /status to see your progress.`
  );
});

// --- Random Alien Battles ---
bot.command("battle", async (ctx) => {
  const alienTypes = [
    "Zorgon Raider",
    "Nebula Beast",
    "Cyber Wraith",
    "Crimson Drone",
    "Void Serpent"
  ];
  const alien = alienTypes[Math.floor(Math.random() * alienTypes.length)];
  await ctx.reply(`👾 An alien appears: ${alien}!`);
  await battleAliens(ctx, alien);
});

// --- Fallback Message ---
bot.on("text", async (ctx) => {
  await ctx.reply("🛰️ Unknown command. Try /travel, /explore, /battle, or /status.");
});

// --- Launch Bot
