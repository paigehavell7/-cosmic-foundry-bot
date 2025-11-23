import sqlite3 from "sqlite3";
import { open } from "sqlite";

export const db = await open({
  filename: "./database.sqlite",
  driver: sqlite3.Database,
});

// --- CREATE TABLES ---
export async function initDB() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id TEXT PRIMARY KEY,
      username TEXT,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      credits INTEGER DEFAULT 100,
      planet TEXT DEFAULT 'Aetherion',
      last_daily INTEGER DEFAULT 0
    );
  `);
}

// --- HELPERS ---

export async function getUserById(id) {
  return await db.get("SELECT * FROM users WHERE telegram_id = ?", [id]);
}

export async function getOrCreateUser(telegramUser) {
  const id = String(telegramUser.id);
  const name = telegramUser.username || "Traveler";

  let user = await getUserById(id);

  if (!user) {
    await db.run(
      `INSERT INTO users (telegram_id, username) VALUES (?, ?)`,
      [id, name]
    );
    user = await getUserById(id);
  }

  return user;
}

export async function addXP(id, amount) {
  await db.run(
    `UPDATE users SET xp = xp + ? WHERE telegram_id = ?`,
    [amount, id]
  );

  // Auto-leveling
  await db.run(
    `UPDATE users SET level = level + 1, xp = 0 WHERE telegram_id = ? AND xp >= 100`,
    [id]
  );

  return await getUserById(id);
}

export async function addCredits(id, amount) {
  await db.run(
    `UPDATE users SET credits = credits + ? WHERE telegram_id = ?`,
    [amount, id]
  );
  return await getUserById(id);
}

export async function claimDaily(id) {
  const DAILY_AMOUNT = 10;
  const now = Date.now();

  const user = await getUserById(id);

  // 24 hours = 86400000 ms
  if (now - user.last_daily < 86400000) {
    return { success: false, next: 86400000 - (now - user.last_daily) };
  }

  await db.run(
    `UPDATE users SET credits = credits + ?, last_daily = ? WHERE telegram_id = ?`,
    [DAILY_AMOUNT, now, id]
  );

  return { success: true, amount: DAILY_AMOUNT };
}
