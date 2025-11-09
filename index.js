const TelegramBot = require('node-telegram-bot-api');
const db = require('./lib/db');
const game = require('./lib/game');

// Use BOT_TOKEN or TELEGRAM_TOKEN from environment variables
const token = process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN;

if (!token) {
  console.error('❌ No TELEGRAM_TOKEN or BOT_TOKEN found in environment variables.');
  process.exit(1);
}

// Create the bot instance
const bot = new TelegramBot(token, { polling: true });

(async () => {
  try {
    await db.init();
    console.log('✅ Database ready.');

    // Start command
    bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id.toString();
      await db.ensureUser(chatId);
      bot.sendMessage(chatId, '🌌 Welcome to Cosmic Foundry! Start mining with /mine or check your /balance.');
    });

    // Balance command
    bot.onText(/\/balance/, async (msg) => {
      const chatId = msg.chat.id.toString();
      const user = await db.getUser(chatId);
      bot.sendMessage(chatId, `💰 You have ${user.crystals || 0} crystals.`);
    });

    // Mine command
    bot.onText(/\/mine/, async (msg) => {
      const chatId = msg.chat.id.toString();
      const amount = game.mine();
      await db.addCrystals(chatId, amount);
      bot.sendMessage(chatId, `⛏️ You mined ${amount} crystals!`);
    });

    // Daily reward command
    bot.onText(/\/daily/, async (msg) => {
      const chatId = msg.chat.id.toString();
      const points = parseInt(process.env.REWARD_POINTS || 10);
      const result = await db.claimDaily(chatId, points);

      if (result.claimed) {
        bot.sendMessage(chatId, `🎁 You received ${points} daily crystals!`);
      } else {
        bot.sendMessage(chatId, `⏳ You already claimed your daily reward. Come back tomorrow!`);
      }
    });

    console.log('🤖 Bot started successfully.');
  } catch (err) {
    console.error('Error starting bot:', err);
    process.exit(1);
  }
})();

// Start the bot
bot.launch();
