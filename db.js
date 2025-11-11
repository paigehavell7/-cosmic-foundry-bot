// db.js — Cosmic Foundry Adventure Database
import sqlite3 from "sqlite3";
import { open } from "sqlite";

let db;

// --- Initialize the database ---
export async function initDB() {
  db = await open({
    filename: "./cosmic_foundry.db",
    driver: sqlite3.Database,
  });

  // Create tables if they don’t exist yet
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT UNIQUE,
      username TEXT,
      points INTEGER DEFAULT 0,
      planet TEXT DEFAULT 'None',
      battles INTEGER DEFAULT 0
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS battles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT,
      outcome TEXT,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("✅ Database initialized successfully.");
  return db;
}

// --- Retrieve or create a user ---
export async function getUser(ctx) {
  const telegram_id = ctx.from.id.toString();
  const username = ctx.from.username || "Traveler";

  let user = await db.get("SELECT * FROM users WHERE telegram_id = ?", [telegram_id]);
  if (!user) {
    await db.run("INSERT INTO users (telegram_id, username) VALUES (?, ?)", [telegram_id, username]);
    user = await db.get("SELECT * FROM users WHERE telegram_id = ?", [telegram_id]);
  }

  return user;
}

// --- Add or subtract points ---
export async function addPoints(telegram_id, amount) {
  await db.run("UPDATE users SET points = points + ? WHERE telegram_id = ?", [amount, telegram_id]);
}

// --- Set user’s planet ---
export async function setPlanet(telegram_id, planet) {
  await db.run("UPDATE users SET planet = ? WHERE telegram_id = ?", [planet, telegram_id]);
}

// --- Record battle results ---
export async function recordBattle(telegram_id, victory) {
  const outcome = victory ? "Victory" : "Defeat";
  await db.run("INSERT INTO battles (telegram_id, outcome) VALUES (?, ?)", [telegram_id, outcome]);
  await db.run("UPDATE users SET battles = battles + 1 WHERE telegram_id = ?", [telegram_id]);
}

export { db };
