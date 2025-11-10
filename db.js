// db.js
const sqlite3 = require("sqlite3").verbose();

function initDB() {
  const db = new sqlite3.Database("./database.db");

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT UNIQUE,
        points INTEGER DEFAULT 100,
        last_claim TEXT
      )
    `);
  });

  console.log("✅ Database initialized");
  db.close();
}

module.exports = { initDB };
