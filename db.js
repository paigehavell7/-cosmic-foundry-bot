// db.js
import sqlite3 from "sqlite3";
import { open } from "sqlite";

// Open database connection
export async function initDB() {
  const db = await open({
    filename: "./cosmic_foundry.db",
    driver: sqlite3.Database,
  });

  // Create tables if not exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id INTEGER PRIMARY KEY,
      username TEXT,
      points INTEGER DEFAULT 0,
      planet TEXT DEFAULT 'Unknown'
    );

    CREATE TABLE IF NOT EXISTS battles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER,
      result TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("✅ Database initialized");
  return db;
}

// Get or create user
export async function getUser(ctx) {
  const telegram_id = ctx.from.id;
  const username = ctx.from.username || ctx.from.first_name || "Unknown";
  const db = await initDB();

  let user = await db.get("SELECT * FROM users WHERE telegram_id = ?", telegram_id);
  if (!user) {
    await db.run("INSERT INTO users (telegram_id, username) VALUES (?, ?)", telegram_id, username);
    user = { telegram_id, username, points: 0, planet: "Unknown" };
  }

  return user;
}

// Add or subtract points
export async function dbAddPoints(telegram_id, amount) {
  const db = await initDB();
  await db.run("UPDATE users SET points = points + ? WHERE telegram_id = ?", amount, telegram_id);
}

// Set player's current planet
export async function dbSetPlanet(telegram_id, planetName) {
  const db = await initDB();
  await db.run("UPDATE users SET planet = ? WHERE telegram_id = ?", planetName, telegram_id);
}

// Record a battle result
export async function dbRecordBattle(telegram_id, result) {
  const db = await initDB();
  await db.run("INSERT INTO battles (telegram_id, result) VALUES (?, ?)", telegram_id, result);
}

// Get top 10 leaderboard
export async function getLeaderboard() {
  const db = await initDB();
  const leaders = await db.all("SELECT username, points, planet FROM users ORDER BY points DESC LIMIT 10");
  return leaders;
}
