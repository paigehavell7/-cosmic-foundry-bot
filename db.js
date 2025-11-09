require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await fn(client);
    await client.query('COMMIT');
    return r;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function getUserByTelegram(telegram_id) {
  const r = await query('SELECT * FROM users WHERE telegram_id=$1', [telegram_id]);
  return r.rows[0];
}
async function getUserById(id) {
  const r = await query('SELECT * FROM users WHERE id=$1', [id]);
  return r.rows[0];
}
async function createUser({ telegram_id, username }) {
  const r = await query('INSERT INTO users(telegram_id, username) VALUES($1,$2) ON CONFLICT (telegram_id) DO UPDATE SET username = EXCLUDED.username RETURNING *', [telegram_id, username]);
  return r.rows[0];
}
async function creditUser(userId, amount) {
  const r = await query('UPDATE users SET credits = credits + $1 WHERE id=$2 RETURNING *', [amount, userId]);
  return r.rows[0];
}

module.exports = {
  query, withTransaction, getUserByTelegram, getUserById, createUser, creditUser
};
