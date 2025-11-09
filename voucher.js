const crypto = require('crypto');
const db = require('./db');

function generateCode() {
  return crypto.randomBytes(12).toString('base64url').slice(0,16).toUpperCase();
}

async function issueVoucher(userId, value, expiresDays = 30) {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + expiresDays * 24 * 3600 * 1000);
  const r = await db.query(
    `INSERT INTO vouchers(code, value, issued_to_user_id, issued_by, expires_at) VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [code, value, userId, 'system', expiresAt]
  );
  return r.rows[0];
}

async function redeemVoucher(code, redeemerUserId) {
  return await db.withTransaction(async client => {
    const r = await client.query('SELECT * FROM vouchers WHERE code=$1 FOR UPDATE', [code]);
    const v = r.rows[0];
    if (!v) throw new Error('Invalid voucher code');
    if (v.redeemed_at) throw new Error('Voucher already redeemed');
    if (v.expires_at && new Date(v.expires_at) < new Date()) throw new Error('Voucher expired');
    await client.query('UPDATE vouchers SET redeemed_by_user_id=$1, redeemed_at=now() WHERE id=$2', [redeemerUserId, v.id]);
    await client.query('UPDATE users SET credits = credits + $1 WHERE id=$2', [v.value, redeemerUserId]);
    await client.query('INSERT INTO voucher_audit(voucher_id, action, actor, note) VALUES($1,$2,$3,$4)', [v.id, 'redeemed', String(redeemerUserId), 'redeemed via bot/claim']);
    return v;
  });
}

module.exports = { issueVoucher, redeemVoucher };
