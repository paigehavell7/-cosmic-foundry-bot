// db.js — Cosmic Foundry Bot Database (better-sqlite3 version)

import Database from "better-sqlite3";

// Open a connection to the local SQLite database
const db = new Database("./database.sqlite");

// Initialize database tables
export async function initDB() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id TEXT PRIMARY KEY,
      username TEXT,
      points INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      energy INTEGER DEFAULT 100,
      last_active INTEGER DEFAULT 0
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT,
      item_name TEXT,
      quantity INTEGER DEFAULT 1,
      FOREIGN KEY (telegram_id) REFERENCES users (telegram_id)
    )
  `).run();
}

// Add a new user or get existing one
export function getOrCreateUser(ctx) {
  const telegramId = String(ctx.from.id);
  const username = ctx.from.username || "Unknown";

  let user = db.prepare("SELECT * FROM users WHERE telegram_id = ?").get(telegramId);

  if (!user) {
    db.prepare(
      "INSERT INTO users (telegram_id, username, points, level, energy, last_active) VALUES (?, ?, 0, 1, 100, ?)"
    ).run(telegramId, username, Date.now());

    user = db.prepare("SELECT * FROM users WHERE telegram_id = ?").get(telegramId);
  }

  return user;
}

// Update player stats
export function updateUserStats(telegramId, changes) {
  const { points = 0, energy = 0, level = 0 } = changes;

  db.prepare(`
    UPDATE users
    SET points = points + ?,
        energy = energy + ?,
        level = level + ?
    WHERE telegram_id = ?
  `).run(points, energy, level, telegramId);
}

// Manage inventory
export function addItem(telegramId, itemName, quantity = 1) {
  const existing = db
    .prepare("SELECT * FROM inventory WHERE telegram_id = ? AND item_name = ?")
    .get(telegramId, itemName);

  if (existing) {
    db.prepare(
      "UPDATE inventory SET quantity = quantity + ? WHERE telegram_id = ? AND item_name = ?"
    ).run(quantity, telegramId, itemName);
  } else {
    db.prepare(
      "INSERT INTO inventory (telegram_id, item_name, quantity) VALUES (?, ?, ?)"
    ).run(telegramId, itemName, quantity);
  }
}

export function getInventory(telegramId) {
  return db.prepare("SELECT * FROM inventory WHERE telegram_id = ?").all(telegramId);
}
