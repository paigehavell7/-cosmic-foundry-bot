const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'data', 'database.sqlite');
const fs = require('fs');
const mkdirp = (p)=>fs.mkdirSync(p, { recursive: true });
let db;
module.exports = {
  init: () => {
    mkdirp(path.join(__dirname, '..', 'data'));
    return new Promise((resolve, reject)=>{
      db = new sqlite3.Database(dbPath, (err)=>{
        if (err) return reject(err);
        db.run(`CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          telegram_id TEXT UNIQUE,
          crystals INTEGER DEFAULT 0,
          last_daily INTEGER DEFAULT 0
        )`, (err)=>{
          if (err) return reject(err);
          resolve();
        });
      });
    });
  },
  ensureUser: (telegramId) => {
    return new Promise((resolve, reject)=>{
      db.run(`INSERT OR IGNORE INTO users (telegram_id, crystals) VALUES (?, ?)`, [telegramId, 0], function(err){
        if (err) return reject(err);
        resolve();
      });
    });
  },
  getUser: (telegramId) => {
    return new Promise((resolve, reject)=>{
      db.get(`SELECT * FROM users WHERE telegram_id = ?`, [telegramId], (err,row)=>{
        if (err) return reject(err);
        if (!row) return resolve({telegram_id: telegramId, crystals: 0});
        resolve(row);
      });
    });
  },
  addCrystals: (telegramId, amount) => {
    return new Promise((resolve, reject)=>{
      db.run(`UPDATE users SET crystals = crystals + ? WHERE telegram_id = ?`, [amount, telegramId], function(err){
        if (err) return reject(err);
        resolve();
      });
    });
  },
  claimDaily: async (telegramId, amount) => {
    const now = Math.floor(Date.now()/1000);
    const day = 24*60*60;
    const user = await module.exports.getUser(telegramId);
    if (!user || (now - (user.last_daily || 0)) < day) {
      return {claimed:false};
    }
    return new Promise((resolve, reject)=>{
      db.run(`UPDATE users SET crystals = crystals + ?, last_daily = ? WHERE telegram_id = ?`, [amount, now, telegramId], function(err){
        if (err) return reject(err);
        resolve({claimed:true});
      });
    });
  }
};
