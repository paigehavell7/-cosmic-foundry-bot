// db.js – Cosmic Foundry core database + logic (ESM, better-sqlite3)

import Database from "better-sqlite3";

let db;

/**
 * Initialize the SQLite database and tables.
 */
export function initDB() {
  if (db) return db;

  db = new Database("./cosmic_foundry.db");
  db.pragma("journal_mode = WAL");

  // Main player table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id   TEXT PRIMARY KEY,
      username      TEXT,
      credits       INTEGER DEFAULT 0,
      xp            INTEGER DEFAULT 0,
      level         INTEGER DEFAULT 1,
      current_planet TEXT DEFAULT 'Aether Prime',
      battles_won   INTEGER DEFAULT 0,
      battles_lost  INTEGER DEFAULT 0,
      last_daily    INTEGER DEFAULT 0
    )
  `).run();

  // Later you can add inventory, companions, etc.
  return db;
}

function getDb() {
  if (!db) {
    initDB();
  }
  return db;
}

/**
 * Create a user if they don't exist, then return them.
 */
export function getOrCreateUser(telegramId, username = "Traveler") {
  const db = getDb();

  let user = db
    .prepare("SELECT * FROM users WHERE telegram_id = ?")
    .get(telegramId);

  if (!user) {
    db.prepare(
      `
      INSERT INTO users (telegram_id, username, credits, xp, level)
      VALUES (?, ?, 100, 0, 1)
    `
    ).run(telegramId, username);

    user = db
      .prepare("SELECT * FROM users WHERE telegram_id = ?")
      .get(telegramId);
  }

  return user;
}

/**
 * Get user by telegram id (no auto-create).
 */
export function getUserById(telegramId) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM users WHERE telegram_id = ?")
    .get(telegramId);
}

/**
 * Add XP and automatically handle level-ups.
 */
export function addXP(telegramId, amount) {
  const db = getDb();
  const user = getUserById(telegramId);
  if (!user) return null;

  const newXP = user.xp + amount;

  // Simple level formula: every 100xp = +1 level
  const oldLevel = user.level;
  const newLevel = Math.floor(newXP / 100) + 1;

  db.prepare("UPDATE users SET xp = ?, level = ? WHERE telegram_id = ?").run(
    newXP,
    newLevel,
    telegramId
  );

  return {
    ...user,
    xp: newXP,
    level: newLevel,
    leveledUp: newLevel > oldLevel,
  };
}

/**
 * Add or subtract credits.
 */
export function addCredits(telegramId, amount) {
  const db = getDb();
  const user = getUserById(telegramId);
  if (!user) return null;

  const newCredits = Math.max(0, user.credits + amount);

  db.prepare("UPDATE users SET credits = ? WHERE telegram_id = ?").run(
    newCredits,
    telegramId
  );

  return { ...user, credits: newCredits };
}

/**
 * Change the player's current planet.
 */
export function setPlanet(telegramId, planetName) {
  const db = getDb();
  db.prepare("UPDATE users SET current_planet = ? WHERE telegram_id = ?").run(
    planetName,
    telegramId
  );
}

/**
 * Claim daily reward.
 * Returns: { claimed: boolean, amount: number, nextAt: number }
 */
export function claimDaily(telegramId) {
  const db = getDb();
  const user = getUserById(telegramId);
  if (!user) return { claimed: false, amount: 0, nextAt: 0 };

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  if (user.last_daily && now - user.last_daily < DAY_MS) {
    // Not ready yet
    const nextAt = user.last_daily + DAY_MS;
    return { claimed: false, amount: 0, nextAt };
  }

  const reward = 10; // daily credits
  const newCredits = user.credits + reward;

  db.prepare(
    "UPDATE users SET credits = ?, last_daily = ? WHERE telegram_id = ?"
  ).run(newCredits, now, telegramId);

  return { claimed: true, amount: reward, nextAt: now + DAY_MS };
}

/**
 * Record the result of a battle.
 * outcome: "win" | "loss"
 */
export function recordBattle(telegramId, outcome) {
  const db = getDb();
  const user = getUserById(telegramId);
  if (!user) return null;

  let wins = user.battles_won;
  let losses = user.battles_lost;

  if (outcome === "win") wins += 1;
  if (outcome === "loss") losses += 1;

  db.prepare(
    "UPDATE users SET battles_won = ?, battles_lost = ? WHERE telegram_id = ?"
  ).run(wins, losses, telegramId);

  return { ...user, battles_won: wins, battles_lost: losses };
}
