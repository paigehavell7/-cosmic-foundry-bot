import sqlite3 from "sqlite3";
import { open } from "sqlite";

// Initialize database connection
export async function initDB() {
  const db = await open({
    filename: "./database.sqlite",
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT UNIQUE,
      username TEXT,
      points INTEGER DEFAULT 0,
      last_claim TEXT
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      points INTEGER DEFAULT 0,
      claimed_by TEXT
    );
  `);

  return db;
}
