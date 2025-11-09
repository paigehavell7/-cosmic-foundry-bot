require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const db = require('../lib/db');
const { redeemVoucher } = require('../lib/voucher');

const app = express();
app.use(bodyParser.json());

app.post('/api/redeem', async (req, res) => {
  try {
    const { code, telegram_id } = req.body;
    if (!code || !telegram_id) return res.status(400).json({ error: 'code and telegram_id required' });
    const user = await db.getUserByTelegram(telegram_id);
    if (!user) return res.status(404).json({ error: 'user not found' });
    const v = await redeemVoucher(code.toUpperCase(), user.id);
    res.json({ ok: true, voucher: v });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Claim server listening on', port));
