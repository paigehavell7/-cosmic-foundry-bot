import { initDB } from "./db.js";

// Cooldown time between claims (in milliseconds)
const COOLDOWN_TIME = 5 * 60 * 1000; // 5 minutes

// Handle player mining / reward claim
export async function handleClaim(chatId, username) {
  const db = await initDB();

  // Fetch or create user
  let user = await db.get("SELECT * FROM users WHERE chat_id = ?", chatId);
  const now = Date.now();

  if (!user) {
    await db.run("INSERT INTO users (chat_id, username, points, last_claim) VALUES (?, ?, ?, ?)", [
      chatId,
      username,
      0,
      now,
    ]);
    user = await db.get("SELECT * FROM users WHERE chat_id = ?", chatId);
  }

  // Check cooldown
  const lastClaim = user.last_claim ? parseInt(user.last_claim) : 0;
  if (now - lastClaim < COOLDOWN_TIME) {
    const waitTime = Math.ceil((COOLDOWN_TIME - (now - lastClaim)) / 1000);
    return `⏳ Please wait ${waitTime} seconds before mining again.`;
  }

  // Add points and update last claim
  const reward = Math.floor(Math.random() * 20) + 10;
  const newPoints = user.points + reward;
  await db.run("UPDATE users SET points = ?, last_claim = ? WHERE chat_id = ?", [
    newPoints,
    now,
    chatId,
  ]);

  return `💎 You mined ${reward} cosmic shards! Total: ${newPoints} ⭐️`;
}

// Get leaderboard
export async function getLeaderboard() {
  const db = await initDB();
  const leaders = await db.all("SELECT username, points FROM users ORDER BY points DESC LIMIT 10");
  if (leaders.length === 0) return "No players yet!";
  return leaders.map((u, i) => `${i + 1}. ${u.username} — ${u.points}⭐️`).join("\n");
    }
