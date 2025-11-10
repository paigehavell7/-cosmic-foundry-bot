// db.js
const sqlite3 = require("sqlite3").verbose();

function initDB() {
  const db = new sqlite3.Database("./database.db");

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT UNIQUE,
        username TEXT,
        points INTEGER DEFAULT 100,
        health INTEGER DEFAULT 100,
        fuel INTEGER DEFAULT 100,
        planet TEXT DEFAULT 'Elaris Prime',
        last_claim TEXT
      )
    `);
      )
    `);
  });

  console.log("✅ Database initialized");
  db.close();
}

function openDB() {
  return new sqlite3.Database("./database.db");
}

module.exports = { initDB, openDB };
