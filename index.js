const TelegramBot = require('node-telegram-bot-api');
const db = require('../lib/db');
const game = require('../lib/game');
const token = process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN;
if (!token) {
  console.error('No TELEGRAM_TOKEN or BOT_TOKEN found in environment. Exiting.');
  process.exit(1);
}
const bot = new TelegramBot(token, { polling: true });
(async ()=> {
  await db.init();
  console.log('Database ready.');
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id.toString();
    await db.ensureUser(chatId);
    bot.sendMessage(chatId, 'Welcome to Cosmic Foundry. Use /mine to mine crystals, /balance to check balance, /daily to claim daily reward.');
  });
  bot.onText(/\/balance/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const u = await db.getUser(chatId);
    bot.sendMessage(chatId, `You have ${u.crystals} Crystal(s).`);
  });
  bot.onText(/\/mine/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const amount = game.mine();
    await db.addCrystals(chatId, amount);
    bot.sendMessage(chatId, `You mined ${amount} Crystal(s).`);
  });
  bot.onText(/\/daily/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const points = parseInt(process.env.REWARD_POINTS_DAILY || '10', 10);
    const res = await db.claimDaily(chatId, points);
    if (res.claimed) {
      bot.sendMessage(chatId, `You received ${points} Crystal(s) as daily reward.`);
    } else {
      bot.sendMessage(chatId, `You already claimed your daily reward. Try again later.`);
    }
  });
  console.log('Bot started.');
})().catch(err=>{
  console.error(err);
  process.exit(1);
});
