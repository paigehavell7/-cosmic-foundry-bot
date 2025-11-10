const { readFileSync, writeFileSync, existsSync } = require("fs");

const DB_FILE = "./rewards.json";

if (!existsSync(DB_FILE)) writeFileSync(DB_FILE, JSON.stringify({}));

function handleClaim(ctx) {
  const userId = ctx.from.id;
  const rewards = JSON.parse(readFileSync(DB_FILE));

  const now = Date.now();
  const lastClaim = rewards[userId]?.lastClaim || 0;
  const diff = now - lastClaim;

  if (diff < 24 * 60 * 60 * 1000) {
    ctx.reply("⏳ You already claimed your daily reward. Come back later!");
    return;
  }

  const points = 10;
  rewards[userId] = { points: (rewards[userId]?.points || 0) + points, lastClaim: now };
  writeFileSync(DB_FILE, JSON.stringify(rewards));

  ctx.reply(`💎 You earned ${points} points! Keep playing daily to earn more!`);
}

module.exports = { handleClaim };
