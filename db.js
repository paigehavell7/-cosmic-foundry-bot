// db.js – Cosmic Foundry database (ESM + better-sqlite3)

import Database from "better-sqlite3";

let db;

// --- Init DB -------------------------------------------------

export function initDB() {
  if (db) return db;

  db = new Database("./database.sqlite");

  // Main users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id TEXT PRIMARY KEY,
      username    TEXT,
      credits     INTEGER DEFAULT 0,
      xp          INTEGER DEFAULT 0,
      level       INTEGER DEFAULT 1,
      last_daily  INTEGER DEFAULT 0,
      planet      TEXT    DEFAULT 'aetherion'
    );
  `);

  // For existing DBs: try to add planet column, ignore if it already exists
  try {
    db.exec(`ALTER TABLE users ADD COLUMN planet TEXT DEFAULT 'aetherion';`);
  } catch (err) {
    if (!String(err.message).includes("duplicate column name")) {
      throw err;
    }
  }

  return db;
}

// --- Helpers -------------------------------------------------

function computeLevelFromXP(xp) {
  // Simple curve: every 100 XP = +1 level
  return 1 + Math.floor(xp / 100);
}

// --- User operations -----------------------------------------

export async function getOrCreateUser(tgUser) {
  const db = initDB();
  const telegramId = String(tgUser.id);
  const username =
    tgUser.username ||
    [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") ||
    "Traveler";

  let user = db
    .prepare("SELECT * FROM users WHERE telegram_id = ?")
    .get(telegramId);

  if (!user) {
    db.prepare(
      `
      INSERT INTO users (telegram_id, username, credits, xp, level, last_daily, planet)
      VALUES (?, ?, 100, 0, 1, 0, 'aetherion')
    `
    ).run(telegramId, username);

    user = db
      .prepare("SELECT * FROM users WHERE telegram_id = ?")
      .get(telegramId);
  }

  return user;
}

export async function getUserById(telegramId) {
  const db = initDB();
  return db
    .prepare("SELECT * FROM users WHERE telegram_id = ?")
    .get(String(telegramId));
}

export async function addXP(telegramId, amount) {
  const db = initDB();
  const id = String(telegramId);

  const row = db
    .prepare("SELECT xp FROM users WHERE telegram_id = ?")
    .get(id);
  const oldXP = row ? row.xp || 0 : 0;
  const newXP = oldXP + amount;
  const newLevel = computeLevelFromXP(newXP);

  db.prepare("UPDATE users SET xp = ?, level = ? WHERE telegram_id = ?").run(
    newXP,
    newLevel,
    id
  );
}

export async function addCredits(telegramId, amount) {
  const db = initDB();
  const id = String(telegramId);

  db.prepare(
    "UPDATE users SET credits = credits + ? WHERE telegram_id = ?"
  ).run(amount, id);
}

export async function claimDaily(telegramId) {
  const db = initDB();
  const id = String(telegramId);
  const now = Date.now();

  const user = db
    .prepare("SELECT last_daily FROM users WHERE telegram_id = ?")
    .get(id);

  const last = user?.last_daily || 0;
  const ONE_DAY = 24 * 60 * 60 * 1000;

  if (now - last < ONE_DAY) {
    // Already claimed
    return { ok: false, remainingMs: ONE_DAY - (now - last) };
  }

  const reward = 10;

  db.prepare(
    "UPDATE users SET credits = credits + ?, last_daily = ? WHERE telegram_id = ?"
  ).run(reward, now, id);

  return { ok: true, reward };
}

export async function setPlanet(telegramId, planetKey) {
  const db = initDB();
  const id = String(telegramId);

  db.prepare("UPDATE users SET planet = ? WHERE telegram_id = ?").run(
    planetKey,
    id
  );
}
