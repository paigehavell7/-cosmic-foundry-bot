// db.js
// Simple SQLite database using better-sqlite3 for Cosmic Foundry bot

const Database = require("better-sqlite3");

let db;

/**
 * Initialize the database and tables
 */
function initDB() {
  if (!db) {
    db = new Database("cosmic_foundry.sqlite");
  }

  // Users table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT UNIQUE,
      username TEXT,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      credits INTEGER DEFAULT 0,
      last_daily_claim INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
  `).run();

  console.log("✅ Database initialized");
}

/**
 * Get existing user or create a new one
 */
function getOrCreateUser(telegramId, username) {
  const getStmt = db.prepare("SELECT * FROM users WHERE telegram_id = ?");
  let user = getStmt.get(String(telegramId));

  if (!user) {
    const startCredits = Number(process.env.REWARD_POINTS_START || 100);

    const insertStmt = db.prepare(`
      INSERT INTO users (telegram_id, username, credits)
      VALUES (?, ?, ?)
    `);
    insertStmt.run(String(telegramId), username || "Traveler", startCredits);

    user = getStmt.get(String(telegramId));
  }

  return user;
}

/**
 * Add XP and auto-level if needed
 */
function addXP(userId, amount) {
  const user = db
    .prepare("SELECT level, xp FROM users WHERE id = ?")
    .get(userId);

  if (!user) return;

  let newXP = user.xp + amount;
  let newLevel = user.level;

  // simple XP curve: level * 100
  let xpNeeded = newLevel * 100;

  while (newXP >= xpNeeded) {
    newXP -= xpNeeded;
    newLevel += 1;
    xpNeeded = newLevel * 100;
  }

  db.prepare(
    "UPDATE users SET xp = ?, level = ? WHERE id = ?"
  ).run(newXP, newLevel, userId);

  return { newXP, newLevel };
}

/**
 * Add credits (points/currency)
 */
function addCredits(userId, amount) {
  db.prepare(
    "UPDATE users SET credits = credits + ? WHERE id = ?"
  ).run(amount, userId);
}

/**
 * Try to claim daily reward.
 * Returns:
 *  { ok: true, reward }  if claimed
 *  { ok: false, remainingHours } if already claimed today
 */
function claimDaily(userId) {
  const row = db
    .prepare("SELECT last_daily_claim FROM users WHERE id = ?")
    .get(userId);

  const now = Math.floor(Date.now() / 1000); // seconds
  const ONE_DAY = 24 * 60 * 60;

  const dailyReward = Number(process.env.REWARD_POINTS_DAILY || 10);

  if (!row || !row.last_daily_claim) {
    // never claimed
    db.prepare(`
      UPDATE users
      SET last_daily_claim = ?
      WHERE id = ?
    `).run(now, userId);

    addCredits(userId, dailyReward);
    return { ok: true, reward: dailyReward };
  }

  const diff = now - row.last_daily_claim;

  if (diff >= ONE_DAY) {
    // can claim again
    db.prepare(`
      UPDATE users
      SET last_daily_claim = ?
      WHERE id = ?
    `).run(now, userId);

    addCredits(userId, dailyReward);
    return { ok: true, reward: dailyReward };
  } else {
    const remainingSeconds = ONE_DAY - diff;
    const remainingHours = Math.ceil(remainingSeconds / 3600);
    return { ok: false, remainingHours };
  }
}

/**
 * Get fresh user from DB
 */
function getUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

module.exports = {
  initDB,
  getOrCreateUser,
  addXP,
  addCredits,
  claimDaily,
  getUserById,
};
