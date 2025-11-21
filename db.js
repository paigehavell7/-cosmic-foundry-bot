// db.js – Cosmic Foundry database layer (ESM + better-sqlite3)

import Database from "better-sqlite3";

// One shared DB connection
const db = new Database("./cosmic_foundry.db");

// --- Initialize the database ---
export async function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id TEXT PRIMARY KEY,
      username    TEXT,
      xp          INTEGER DEFAULT 0,
      credits     INTEGER DEFAULT 0,
      level       INTEGER DEFAULT 1,
      last_daily  INTEGER DEFAULT 0
    );
  `);
}

// --- Helpers ---

function rowToUser(row) {
  if (!row) return null;
  return {
    telegram_id: row.telegram_id,
    username: row.username,
    xp: row.xp,
    credits: row.credits,
    level: row.level,
    last_daily: row.last_daily,
  };
}

// Get or create a user based on ctx.from
export async function getOrCreateUser(tgUser) {
  const telegram_id = String(tgUser.id);
  const username = tgUser.username || "Traveler";

  const getStmt = db.prepare(
    "SELECT telegram_id, username, xp, credits, level, last_daily FROM users WHERE telegram_id = ?"
  );
  let row = getStmt.get(telegram_id);

  if (!row) {
    const insertStmt = db.prepare(
      "INSERT INTO users (telegram_id, username) VALUES (?, ?)"
    );
    insertStmt.run(telegram_id, username);
    row = getStmt.get(telegram_id);
  }

  return rowToUser(row);
}

// Get user by Telegram ID (string)
export async function getUserById(telegram_id) {
  const getStmt = db.prepare(
    "SELECT telegram_id, username, xp, credits, level, last_daily FROM users WHERE telegram_id = ?"
  );
  const row = getStmt.get(String(telegram_id));
  return rowToUser(row);
}

// --- XP & Credits ---

export async function addXP(telegram_id, amount) {
  const stmt = db.prepare(
    "UPDATE users SET xp = xp + ?, level = CASE WHEN xp + ? >= 100 THEN level + 1 ELSE level END WHERE telegram_id = ?"
  );
  stmt.run(amount, amount, String(telegram_id));
}

export async function addCredits(telegram_id, amount) {
  const stmt = db.prepare(
    "UPDATE users SET credits = credits + ? WHERE telegram_id = ?"
  );
  stmt.run(amount, String(telegram_id));
}

// --- Daily reward ---

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function claimDaily(telegram_id) {
  const id = String(telegram_id);

  const getStmt = db.prepare(
    "SELECT telegram_id, username, xp, credits, level, last_daily FROM users WHERE telegram_id = ?"
  );
  let row = getStmt.get(id);

  if (!row) {
    // ensure user exists
    const insertStmt = db.prepare(
      "INSERT INTO users (telegram_id, username) VALUES (?, ?)"
    );
    insertStmt.run(id, "Traveler");
    row = getStmt.get(id);
  }

  const now = Date.now();
  const last = row.last_daily || 0;
  const diff = now - last;

  if (diff < ONE_DAY_MS) {
    const remainingMs = ONE_DAY_MS - diff;
    const hours = Math.floor(remainingMs / (60 * 60 * 1000));
    const minutes = Math.floor(
      (remainingMs % (60 * 60 * 1000)) / (60 * 1000)
    );

    return {
      ok: false,
      message: `⏳ You've already claimed your daily reward. Try again in ${hours}h ${minutes}m.`,
    };
  }

  // You can tweak these values any time
  const xpReward = 30;
  const creditsReward = 15;

  const updateStmt = db.prepare(
    "UPDATE users SET xp = xp + ?, credits = credits + ?, last_daily = ? WHERE telegram_id = ?"
  );
  updateStmt.run(xpReward, creditsReward, now, id);

  return {
    ok: true,
    xp: xpReward,
    credits: creditsReward,
    message: `🎁 Daily reward claimed! +${xpReward} XP, +${creditsReward} credits.`,
  };
}
