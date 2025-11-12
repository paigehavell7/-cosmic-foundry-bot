import sqlite3 from "sqlite3";
import { open } from "sqlite";

// Open a connection to the local SQLite database
export const dbPromise = open({
  filename: "./database.sqlite",
  driver: sqlite3.Database,
});

// Create tables if they don't exist
export async function initDB() {
  const db = await dbPromise;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id TEXT PRIMARY KEY,
      username TEXT,
      points INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      energy INTEGER DEFAULT 100,
      last_active INTEGER DEFAULT 0
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT,
      item_name TEXT,
      quantity INTEGER DEFAULT 1,
      FOREIGN KEY (telegram_id) REFERENCES users (telegram_id)
    );
  `);
}

// Add a new user or get existing one
export async function getOrCreateUser(ctx) {
  const db = await dbPromise;
  const telegramId = String(ctx.from.id);
  const username = ctx.from.username || "Unknown";

  const user = await db.get("SELECT * FROM users WHERE telegram_id = ?", [telegramId]);

  if (!user) {
    await db.run(
      "INSERT INTO users (telegram_id, username, points, level, energy, last_active) VALUES (?, ?, 0, 1, 100, ?)",
      [telegramId, username, Date.now()]
    );
    return {
      telegram_id: telegramId,
      username,
      points: 0,
      level: 1,
      energy: 100,
    };
  }
  return user;
}

// Get user by Telegram ID
export async function getUser(ctx) {
  const db = await dbPromise;
  const telegramId = String(ctx.from.id);
  return db.get("SELECT * FROM users WHERE telegram_id = ?", [telegramId]);
}

// Add or remove points
export async function dbAddPoints(telegramId, amount) {
  const db = await dbPromise;
  await db.run(
    "UPDATE users SET points = points + ? WHERE telegram_id = ?",
    [amount, telegramId]
  );
}

// Update energy or other user stats
export async function updateUserStat(telegramId, field, amount) {
  const db = await dbPromise;
  await db.run(
    `UPDATE users SET ${field} = ${field} + ? WHERE telegram_id = ?`,
    [amount, telegramId]
  );
}

// Add an item to user inventory
export async function addInventoryItem(telegramId, itemName) {
  const db = await dbPromise;

  const existing = await db.get(
    "SELECT * FROM inventory WHERE telegram_id = ? AND item_name = ?",
    [telegramId, itemName]
  );

  if (existing) {
    await db.run(
      "UPDATE inventory SET quantity = quantity + 1 WHERE id = ?",
      [existing.id]
    );
  } else {
    await db.run(
      "INSERT INTO inventory (telegram_id, item_name, quantity) VALUES (?, ?, 1)",
      [telegramId, itemName]
    );
  }
}

// Get user's inventory
export async function getInventory(telegramId) {
  const db = await dbPromise;
  return db.all(
    "SELECT item_name, quantity FROM inventory WHERE telegram_id = ?",
    [telegramId]
  );
}

// Reset database (use with caution)
export async function resetDatabase() {
  const db = await dbPromise;
  await db.exec("DELETE FROM users;");
  await db.exec("DELETE FROM inventory;");
  console.log("🧹 Database reset complete!");
}

// Initialize DB at startup
initDB().then(() => {
  console.log("🪐 Database initialized successfully.");
}).catch((err) => {
  console.error("❌ Database initialization failed:", err);
});
