const bot = require('../src/bot/bot');
const db = require('../src/db');

// Fallback credentials
const BOT_TOKEN = process.env.BOT_TOKEN || '9160668986:AAGxRh4wRNxsBleieoqCXW1JctqgioX5KQw';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '5793896253';
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://burger-co-pi.vercel.app';

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).send('Burger & Co. Webhook is active! 🚀');
  }

  if (req.method === 'POST') {
    try {
      if (!bot.isInitialized) {
        db.init(process.env.DATABASE_URL);
        bot.init(BOT_TOKEN, ADMIN_CHAT_ID, WEBAPP_URL);
      }

      if (bot.bot) {
        await bot.bot.handleUpdate(req.body);
        if (!res.headersSent) {
          res.status(200).send('OK');
        }
      } else {
        res.status(200).send('OK');
      }
    } catch (err) {
      console.error('Webhook execution error:', err);
      if (!res.headersSent) {
        res.status(200).send('OK');
      }
    }
  } else {
    res.status(405).send('Method Not Allowed');
  }
};

