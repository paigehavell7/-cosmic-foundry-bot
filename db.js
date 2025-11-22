// db.js (ESM version)

// --- Simple JSON-based database storage ---
import fs from "fs";

const DB_FILE = "./database.json";

// --- Load or initialize DB ---
function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify({ users: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_FILE));
  } catch (err) {
    console.error("Error loading DB:", err);
    return { users: {} };
  }
}

// --- Save DB ---
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// --- Create or return existing user ---
export function getOrCreateUser(tgUser) {
  const db = loadDB();

  if (!db.users[tgUser.id]) {
    db.users[tgUser.id] = {
      id: tgUser.id,
      name: tgUser.username || tgUser.first_name || "Traveler",
      level: 1,
      xp: 0,
      credits: 100,
      lastDaily: null,

      // NEW INVENTORY FIELDS
      inventory: [],
      equipped: {
        weapon: null,
        armor: null,
      }
    };
    saveDB(db);
  }

  return db.users[tgUser.id];
}

// --- Add XP ---
export function addXP(userId, amount) {
  const db = loadDB();
  const user = db.users[userId];
  if (!user) return;

  user.xp += amount;

  // Simple level up system
  const nextLevelXP = user.level * 100;
  if (user.xp >= nextLevelXP) {
    user.level++;
    user.xp -= nextLevelXP;
  }

  saveDB(db);
}

// --- Add Credits ---
export function addCredits(userId, amount) {
  const db = loadDB();
  const user = db.users[userId];
  if (!user) return;

  user.credits += amount;
  saveDB(db);
}

// --- Daily Reward ---
export function claimDaily(userId) {
  const db = loadDB();
  const user = db.users[userId];
  if (!user) return false;

  const today = new Date().toDateString();

  if (user.lastDaily === today) {
    return false;
  }

  user.lastDaily = today;
  user.credits += 10;

  saveDB(db);
  return true;
}

// --- Get user by Telegram ID ---
export function getUserById(id) {
  const db = loadDB();
  return db.users[id] || null;
}

////////////////////////////////////////////////////////
//              NEW INVENTORY SYSTEM
////////////////////////////////////////////////////////

// --- Add item to inventory ---
export function addItem(userId, item) {
  const db = loadDB();
  const user = db.users[userId];
  if (!user) return;

  user.inventory.push(item);
  saveDB(db);
}

// --- Get a user's inventory ---
export function getInventory(userId) {
  const db = loadDB();
  const user = db.users[userId];
  return user ? user.inventory : [];
}

// --- Equip a weapon/armor ---
export function equipItem(userId, itemName) {
  const db = loadDB();
  const user = db.users[userId];
  if (!user) return { success: false, message: "User not found." };

  const item = user.inventory.find(i => i.name === itemName);
  if (!item) return { success: false, message: "Item not found in inventory." };

  if (item.type === "Weapon") {
    user.equipped.weapon = item;
  } else if (item.type === "Armor") {
    user.equipped.armor = item;
  } else {
    return { success: false, message: "Item cannot be equipped." };
  }

  saveDB(db);
  return { success: true, message: `${itemName} equipped.` };
}

// --- Unequip ---
export function unequip(userId, slot) {
  const db = loadDB();
  const user = db.users[userId];

  if (!user) return { success: false };

  if (slot === "weapon") user.equipped.weapon = null;
  if (slot === "armor") user.equipped.armor = null;

  saveDB(db);
  return { success: true };
}
