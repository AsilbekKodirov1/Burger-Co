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

// Serve static frontend files for the Mini App
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

// API Routes
app.use('/api', apiRoutes);

// Fallback to index.html for SPA/Mini App
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Auto-initialize for Vercel Serverless
db.init(process.env.DATABASE_URL);
bot.init(
  process.env.BOT_TOKEN,
  process.env.ADMIN_CHAT_ID,
  process.env.WEBAPP_URL
);

// If running standalone (local development)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🌐 [Web Server] http://localhost:${PORT} manzilida ishlamoqda`);
    console.log(`📱 [Telegram Mini App] Telegramda WebApp orqali buyurtmalar qabul qilishga tayyor!`);
  });
}

module.exports = app;
