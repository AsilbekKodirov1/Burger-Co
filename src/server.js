require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const bot = require('./bot/bot');
const apiRoutes = require('./api/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files for local development
app.use(express.static(path.join(__dirname, '../public')));

// Telegram Webhook endpoint (for Vercel serverless)
app.post('/api/webhook', async (req, res) => {
  try {
    if (bot.bot) {
      await bot.bot.handleUpdate(req.body, res);
    } else {
      res.sendStatus(200);
    }
  } catch (err) {
    console.error('Webhook xatosi:', err);
    res.sendStatus(200);
  }
});

// API Routes (mounted on both /api and / to handle all rewrite variants)
app.use('/api', apiRoutes);
app.use(apiRoutes);

// Fallback for local development
if (!process.env.VERCEL) {
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

// Default credentials fallback (in case Vercel Environment Variables are not set)
const BOT_TOKEN = process.env.BOT_TOKEN || '9160668986:AAGxRh4wRNxsBleieoqCXW1JctqgioX5KQw';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '5793896253';
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://burger-co-pi.vercel.app';

// Auto-initialize
try {
  db.init(process.env.DATABASE_URL);
  bot.init(BOT_TOKEN, ADMIN_CHAT_ID, WEBAPP_URL);
} catch (e) {
  console.warn('Init warning:', e.message);
}

// Standalone local development listener
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🌐 [Web Server] http://localhost:${PORT} manzilida ishlamoqda`);
    console.log(`📱 [Telegram Mini App] Telegramda WebApp orqali buyurtmalar qabul qilishga tayyor!`);
  });
}

module.exports = app;
