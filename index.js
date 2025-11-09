require('dotenv').config();
const { Bot } = require('grammy');
const db = require('../lib/db');
const { issueVoucher, redeemVoucher } = require('../lib/voucher');

const bot = new Bot(process.env.TELEGRAM_TOKEN);

bot.command('start', async ctx => {
  const t = ctx.from;
  let user = await db.getUserByTelegram(t.id);
  if (!user) {
    user = await db.createUser({ telegram_id: t.id, username: t.username || t.first_name || '' });
  }
  await ctx.reply(`Welcome ${t.first_name || 'Player'}! Use /mine to mine crystals, /balance to see your credits, and /redeem to claim codes.`);
});

bot.command('mine', async ctx => {
  try {
    const t = ctx.from;
    const user = await db.getUserByTelegram(t.id);
    if (!user) return ctx.reply('User not found. Send /start first.');
    const reward = Math.floor(Math.random() * 10) + 1; // 1-10 credits
    await db.creditUser(user.id, reward);
    const updated = await db.getUserById(user.id);
    await ctx.reply(`You mined ${reward} crystals! Your balance: ${updated.credits} credits.`);
  } catch (e) {
    console.error(e);
    ctx.reply('Error mining. Try again later.');
  }
});

bot.command('balance', async ctx => {
  const user = await db.getUserByTelegram(ctx.from.id);
  if (!user) return ctx.reply('User not found. Send /start first.');
  await ctx.reply(`Balance: ${user.credits} credits.`);
});

bot.command('redeem', async ctx => {
  await ctx.reply('To redeem a voucher code, use: /code <CODE>');
});

bot.command('code', async ctx => {
  const parts = ctx.message.text.trim().split(/\s+/);
  if (parts.length < 2) return ctx.reply('Usage: /code <CODE>');
  const code = parts[1].trim().toUpperCase();
  try {
    const user = await db.getUserByTelegram(ctx.from.id);
    if (!user) return ctx.reply('User not found. Send /start first.');
    const v = await redeemVoucher(code, user.id);
    await ctx.reply(`Voucher redeemed! You received ${v.value} credits. New balance: ${(await db.getUserById(user.id)).credits}`);
  } catch (e) {
    await ctx.reply('Redeem error: ' + e.message);
  }
});

// admin: issue voucher to user by /issue <telegram_id> <value>
bot.command('issue', async ctx => {
  const sender = ctx.from.id;
  if (process.env.ADMIN_ID && String(sender) !== String(process.env.ADMIN_ID)) {
    return ctx.reply('Unauthorized.');
  }
  const parts = ctx.message.text.trim().split(/\s+/);
  if (parts.length < 3) return ctx.reply('Usage: /issue <telegram_id> <value>');
  const tg = parts[1];
  const val = parseInt(parts[2], 10);
  const user = await db.getUserByTelegram(tg);
  if (!user) return ctx.reply('Target user not found.');
  const voucher = await issueVoucher(user.id, val, 30);
  await ctx.reply(`Issued voucher code ${voucher.code} for ${val} credits to @${user.username || user.telegram_id}`);
});

bot.start();
console.log('Bot started');
