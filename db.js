// db.js
// Cosmic Foundry – RPG database helpers (ESM)

// We use sqlite3 + sqlite wrapper
import sqlite3 from "sqlite3";
import { open } from "sqlite";

sqlite3.verbose();

// Re-use one shared connection
const dbPromise = open({
  filename: "./database.sqlite",
  driver: sqlite3.Database,
});

// ---------- INIT ----------

export async function initDB() {
  const db = await dbPromise;

  // Main player table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id    TEXT PRIMARY KEY,
      username       TEXT,
      level          INTEGER DEFAULT 1,
      xp             INTEGER DEFAULT 0,
      credits        INTEGER DEFAULT 100,
      energy         INTEGER DEFAULT 100,
      current_planet TEXT    DEFAULT 'Aetherion',
      wins           INTEGER DEFAULT 0,
      losses         INTEGER DEFAULT 0,
      last_daily     INTEGER DEFAULT 0
    );
  `);

  // (Optional) inventory table – ready for future shop/loot
  await db.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id  TEXT,
      item_name    TEXT,
      quantity     INTEGER DEFAULT 1,
      FOREIGN KEY (telegram_id) REFERENCES users (telegram_id)
    );
  `);
}

// ---------- CORE HELPERS ----------

// Get existing user or create a new one with defaults
// index.js usually calls: getOrCreateUser(ctx.from)
export async function getOrCreateUser(tgUser) {
  const db = await dbPromise;
  const telegramId = String(tgUser.id);
  const username = tgUser.username || "Unknown";

  let user = await db.get(
    "SELECT * FROM users WHERE telegram_id = ?",
    telegramId
  );

  if (!user) {
    await db.run(
      `
      INSERT INTO users
        (telegram_id, username, level, xp, credits, energy, current_planet, wins, losses, last_daily)
      VALUES
        (?, ?, 1, 0, 100, 100, 'Aetherion', 0, 0, 0)
      `,
      telegramId,
      username
    );

    user = await db.get(
      "SELECT * FROM users WHERE telegram_id = ?",
      telegramId
    );
  }

  return user;
}

// Get user strictly by telegram_id (used by /profile, etc.)
export async function getUserById(telegramId) {
  const db = await dbPromise;
  return db.get("SELECT * FROM users WHERE telegram_id = ?", String(telegramId));
}

// ---------- XP / LEVEL / CREDITS / ENERGY ----------

// Add XP and handle level-ups.
// Returns the updated user plus info about level ups.
export async function addXP(telegramId, amount) {
  const db = await dbPromise;
  const id = String(telegramId);

  let user = await db.get(
    "SELECT level, xp FROM users WHERE telegram_id = ?",
    id
  );
  if (!user) return null;

  let { level, xp } = user;
  xp += amount;

  // Simple level curve: each level needs level * 100 XP
  let leveledUp = false;
  let levelsGained = 0;

  while (xp >= level * 100) {
    xp -= level * 100;
    level += 1;
    leveledUp = true;
    levelsGained += 1;
  }

  await db.run(
    "UPDATE users SET xp = ?, level = ? WHERE telegram_id = ?",
    xp,
    level,
    id
  );

  const updated = await getUserById(id);
  return { user: updated, leveledUp, levelsGained };
}

// Change credits (can be positive or negative)
// Returns updated user
export async function addCredits(telegramId, delta) {
  const db = await dbPromise;
  const id = String(telegramId);

  await db.run(
    "UPDATE users SET credits = credits + ? WHERE telegram_id = ?",
    delta,
    id
  );

  return getUserById(id);
}

// Change energy (clamped 0–100)
export async function changeEnergy(telegramId, delta) {
  const db = await dbPromise;
  const id = String(telegramId);

  const user = await db.get(
    "SELECT energy FROM users WHERE telegram_id = ?",
    id
  );
  if (!user) return null;

  let energy = user.energy + delta;
  if (energy > 100) energy = 100;
  if (energy < 0) energy = 0;

  await db.run(
    "UPDATE users SET energy = ? WHERE telegram_id = ?",
    energy,
    id
  );

  return getUserById(id);
}

// Record battle result (for future leaderboards)
export async function recordBattleResult(telegramId, didWin) {
  const db = await dbPromise;
  const id = String(telegramId);

  if (didWin) {
    await db.run(
      "UPDATE users SET wins = wins + 1 WHERE telegram_id = ?",
      id
    );
  } else {
    await db.run(
      "UPDATE users SET losses = losses + 1 WHERE telegram_id = ?",
      id
    );
  }

  return getUserById(id);
}

// Change current planet (used when we add /travel)
export async function setCurrentPlanet(telegramId, planetKey) {
  const db = await dbPromise;
  const id = String(telegramId);

  await db.run(
    "UPDATE users SET current_planet = ? WHERE telegram_id = ?",
    planetKey,
    id
  );

  return getUserById(id);
}

// ---------- DAILY REWARD ----------

// Handles daily reward cooldown.
// Returns: { success, reward, remainingMs, user }
export async function claimDaily(telegramId, reward = 10, cooldownMs = 24 * 60 * 60 * 1000) {
  const db = await dbPromise;
  const id = String(telegramId);

  let user = await db.get(
    "SELECT * FROM users WHERE telegram_id = ?",
    id
  );
  if (!user) {
    return { success: false, reason: "USER_NOT_FOUND" };
  }

  const now = Date.now();
  const last = user.last_daily || 0;

  if (now - last < cooldownMs) {
    const remainingMs = cooldownMs - (now - last);
    return {
      success: false,
      reason: "COOLDOWN",
      remainingMs,
      user,
    };
  }

  await db.run(
    "UPDATE users SET credits = credits + ?, last_daily = ? WHERE telegram_id = ?",
    reward,
    now,
    id
  );

  user = await getUserById(id);
  return {
    success: true,
    reward,
    remainingMs: 0,
    user,
  };
}
