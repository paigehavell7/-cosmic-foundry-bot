// db.js — Unified DB for Cosmic Foundry + Exodus (better-sqlite3)
import Database from "better-sqlite3";

const db = new Database("./cosmic_foundry.db");

// Initialize tables (idempotent)
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id TEXT PRIMARY KEY,
      username TEXT,
      points INTEGER DEFAULT 100,
      credits INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      energy INTEGER DEFAULT 100,
      fuel INTEGER DEFAULT 100,
      planet TEXT DEFAULT 'Elaris Prime',
      battles INTEGER DEFAULT 0,
      last_claim INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT,
      item_name TEXT,
      quantity INTEGER DEFAULT 1,
      FOREIGN KEY (telegram_id) REFERENCES users (telegram_id)
    );

    CREATE TABLE IF NOT EXISTS planets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      rarity TEXT,
      habitable INTEGER DEFAULT 0,
      owner_telegram_id TEXT
    );

    CREATE TABLE IF NOT EXISTS battles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT,
      outcome TEXT,
      points_change INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("✅ DB initialized");
}

// --- User helpers ---
export function getOrCreateUserByCtx(ctx) {
  const telegramId = String(ctx.from.id);
  return getOrCreateUser(telegramId, ctx.from.username || ctx.from.first_name || "Traveler");
}

export function getOrCreateUser(telegramId, username = "Traveler") {
  let user = db.prepare("SELECT * FROM users WHERE telegram_id = ?").get(telegramId);
  if (!user) {
    db.prepare(
      `INSERT INTO users (telegram_id, username, points, credits, level, energy, fuel, planet, battles, last_claim)
       VALUES (?, ?, 100, 0, 1, 100, 100, 'Elaris Prime', 0, 0)`
    ).run(telegramId, username);
    user = db.prepare("SELECT * FROM users WHERE telegram_id = ?").get(telegramId);
  }
  return user;
}

export function getUser(telegramId) {
  return db.prepare("SELECT * FROM users WHERE telegram_id = ?").get(String(telegramId));
}

// --- Economy & resources ---
export function addPoints(telegramId, amount) {
  db.prepare("UPDATE users SET points = points + ? WHERE telegram_id = ?").run(amount, String(telegramId));
}

export function addCredits(telegramId, amount) {
  db.prepare("UPDATE users SET credits = credits + ? WHERE telegram_id = ?").run(amount, String(telegramId));
}

export function changeFuel(telegramId, amount) {
  db.prepare("UPDATE users SET fuel = fuel + ? WHERE telegram_id = ?").run(amount, String(telegramId));
}

export function changeEnergy(telegramId, amount) {
  db.prepare("UPDATE users SET energy = energy + ? WHERE telegram_id = ?").run(amount, String(telegramId));
}

export function addBattleRecord(telegramId, outcome, ptsChange = 0) {
  db.prepare("INSERT INTO battles (telegram_id, outcome, points_change) VALUES (?, ?, ?)").run(String(telegramId), outcome, ptsChange);
  // update summary counters
  if (outcome === "victory") {
    db.prepare("UPDATE users SET battles = battles + 1 WHERE telegram_id = ?").run(String(telegramId));
  }
}

// --- Inventory ---
export function addItem(telegramId, itemName, qty = 1) {
  const existing = db.prepare("SELECT * FROM inventory WHERE telegram_id = ? AND item_name = ?").get(String(telegramId), itemName);
  if (existing) {
    db.prepare("UPDATE inventory SET quantity = quantity + ? WHERE id = ?").run(qty, existing.id);
  } else {
    db.prepare("INSERT INTO inventory (telegram_id, item_name, quantity) VALUES (?, ?, ?)").run(String(telegramId), itemName, qty);
  }
}

export function getInventory(telegramId) {
  return db.prepare("SELECT item_name, quantity FROM inventory WHERE telegram_id = ?").all(String(telegramId));
}

// --- Planets ---
export function registerPlanet(name, rarity = "common", habitable = 0) {
  try {
    db.prepare("INSERT INTO planets (name, rarity, habitable) VALUES (?, ?, ?)").run(name, rarity, habitable ? 1 : 0);
  } catch (e) {
    // ignore duplicate
  }
}

export function claimPlanet(name, telegramId) {
  db.prepare("UPDATE planets SET owner_telegram_id = ? WHERE name = ?").run(String(telegramId), name);
  db.prepare("UPDATE users SET planet = ? WHERE telegram_id = ?").run(name, String(telegramId));
}

export function getPlanet(name) {
  return db.prepare("SELECT * FROM planets WHERE name = ?").get(name);
}

export function listPlanets(limit = 50) {
  return db.prepare("SELECT * FROM planets LIMIT ?").all(limit);
}

// --- Leaderboard ---
export function getLeaderboard(limit = 10) {
  return db.prepare("SELECT username, points, credits, planet FROM users ORDER BY points DESC LIMIT ?").all(limit);
}

// --- Utility ---
export function setLastClaim(telegramId, timestamp) {
  db.prepare("UPDATE users SET last_claim = ? WHERE telegram_id = ?").run(timestamp, String(telegramId));
}

export function getLastClaim(telegramId) {
  const row = db.prepare("SELECT last_claim FROM users WHERE telegram_id = ?").get(String(telegramId));
  return row ? row.last_claim : 0;
}

export function upsertUserUsername(telegramId, username) {
  db.prepare("UPDATE users SET username = ? WHERE telegram_id = ?").run(username, String(telegramId));
}

export { db }; // export raw db if needed
