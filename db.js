// db.js
// Database layer for Cosmic Foundry: Exodus (Crystal Fantasy edition)

import sqlite3 from "sqlite3";
import { open } from "sqlite";

sqlite3.verbose();

let dbPromise;

/**
 * Initialize DB and tables
 */
export async function initDB() {
  if (!dbPromise) {
    dbPromise = open({
      filename: "./database.sqlite",
      driver: sqlite3.Database,
    });
  }

  const db = await dbPromise;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id TEXT PRIMARY KEY,
      username    TEXT,
      level       INTEGER DEFAULT 1,
      xp          INTEGER DEFAULT 0,
      credits     INTEGER DEFAULT 100,
      last_daily  INTEGER DEFAULT 0
    );
  `);
}

/**
 * Fetch user, create if missing
 */
export async function getOrCreateUser(tgUser) {
  const db = await dbPromise;
  const id = String(tgUser.id);
  const username =
    tgUser.username || tgUser.first_name || tgUser.last_name || "Traveler";

  let user = await db.get(
    "SELECT * FROM users WHERE telegram_id = ?",
    id
  );

  if (!user) {
    await db.run(
      "INSERT INTO users (telegram_id, username, level, xp, credits, last_daily) VALUES (?, ?, 1, 0, 100, 0)",
      id,
      username
    );
    user = await db.get(
      "SELECT * FROM users WHERE telegram_id = ?",
      id
    );
  }

  return user;
}

/**
 * Get user by Telegram ID (string)
 */
export async function getUserById(telegramId) {
  const db = await dbPromise;
  return db.get(
    "SELECT * FROM users WHERE telegram_id = ?",
    String(telegramId)
  );
}

/**
 * Add XP and auto-level up
 */
export async function addXP(telegramId, amount) {
  const db = await dbPromise;
  const id = String(telegramId);

  const user = await db.get(
    "SELECT * FROM users WHERE telegram_id = ?",
    id
  );
  if (!user) return null;

  const newXP = user.xp + amount;
  let newLevel = user.level;

  // Simple level curve: every 100 XP = 1 level
  while (newXP >= newLevel * 100) {
    newLevel += 1;
  }

  await db.run(
    "UPDATE users SET xp = ?, level = ? WHERE telegram_id = ?",
    newXP,
    newLevel,
    id
  );

  return getUserById(id);
}

/**
 * Add (or subtract) credits
 */
export async function addCredits(telegramId, amount) {
  const db = await dbPromise;
  const id = String(telegramId);

  await db.run(
    "UPDATE users SET credits = credits + ? WHERE telegram_id = ?",
    amount,
    id
  );

  return getUserById(id);
}

/**
 * Handle daily claim. Returns:
 *  { ok: true, amount, newBalance, user }
 * or
 *  { ok: false, msLeft, nextAt, user }
 */
export async function claimDaily(telegramId, baseAmount = 10) {
  const db = await dbPromise;
  const id = String(telegramId);

  let user = await db.get(
    "SELECT * FROM users WHERE telegram_id = ?",
    id
  );
  if (!user) {
    // If somehow user doesn't exist, create them
    user = await getOrCreateUser({ id });
  }

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  if (user.last_daily && now - user.last_daily < DAY) {
    const msLeft = DAY - (now - user.last_daily);
    return {
      ok: false,
      msLeft,
      nextAt: user.last_daily + DAY,
      user,
    };
  }

  const amount = baseAmount;

  await db.run(
    "UPDATE users SET credits = credits + ?, last_daily = ? WHERE telegram_id = ?",
    amount,
    now,
    id
  );

  const updated = await db.get(
    "SELECT * FROM users WHERE telegram_id = ?",
    id
  );

  return {
    ok: true,
    amount,
    newBalance: updated.credits,
    user: updated,
  };
}
