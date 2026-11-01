const { Telegraf, Markup } = require('telegraf');

class BotService {
  constructor() {
    this.bot = null;
    this.adminChatId = null;
    this.webAppUrl = null;
    this.isInitialized = false;
  }

  init(token, adminChatId, webAppUrl) {
    if (!token) {
      console.warn('⚠️ [Telegram Bot] BOT_TOKEN berilmagan!');
      return;
    }

    this.adminChatId = adminChatId;
    this.webAppUrl = webAppUrl || 'http://localhost:3000';
    this.bot = new Telegraf(token);

    this.registerHandlers();
    this.isInitialized = true;

    // Only launch long polling if NOT running on Vercel Serverless
    if (!process.env.VERCEL) {
      this.bot.launch()
        .then(() => {
          console.log('🤖 [Telegram Bot] @BurgerCoBot muvaffaqiyatli ishga tushdi (Long Polling)!');
        })
        .catch(err => {
          console.error('❌ [Telegram Bot] Ishga tushirishda xatolik:', err.message);
        });

      process.once('SIGINT', () => this.bot?.stop('SIGINT'));
      process.once('SIGTERM', () => this.bot?.stop('SIGTERM'));
    } else {
      console.log('⚡ [Telegram Bot] Vercel Serverless rejimida ishlamoqda.');
    }
  }

  registerHandlers() {
    // Start command
    this.bot.command('start', async (ctx) => {
      const firstName = ctx.from?.first_name || 'Hurmatli mehmon';
      
      const welcomeText = 
`Salom, ${firstName}! 🍔

<b>Burger & Co.</b> ga xush kelibsiz!
Bizda faqat yangi mayin mol go'shti, eritilgan cheddor va mualliflik brioche bulochkalaridan tayyorlangan haqiqiy smash burgerlar.

Quyidagi tugmani bosib, menyuni oching va istagan taomingizga qulay buyurtma bering:`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.webApp('🍔 Menyuni ochish va Buyurtma berish', this.webAppUrl)],
        [Markup.button.url('📍 Biz haqimizda & Manzil', 'https://t.me/burgercobot')]
      ]);

      await ctx.replyWithHTML(welcomeText, keyboard);
    });

    // Callback queries for order status updates
    this.bot.action(/^status:(.+):(.+)$/, async (ctx) => {
      const orderNumber = ctx.match[1];
      const newStatus = ctx.match[2];

      const db = require('../db');
      await db.updateOrderStatus(orderNumber, newStatus);

      let statusLabel = '';
      let customerMsg = '';

      switch (newStatus) {
        case 'accepted':
          statusLabel = '✅ QABUL QILINDI (Tayyorlanmoqda)';
          customerMsg = `👨‍🍳 Sizning #${orderNumber} raqamli buyurtmangiz qabul qilindi va oshxonada tayyorlanmoqda!`;
          break;
        case 'delivering':
          statusLabel = '🛵 KURYERDA (Yetkazilmoqda)';
          customerMsg = `🛵 Sizning #${orderNumber} raqamli buyurtmangiz kuryer orqali yo'lga chiqdi!`;
          break;
        case 'delivered':
          statusLabel = '🏁 YETKAZIB BERILDI';
          customerMsg = `🎉 Sizning #${orderNumber} raqamli buyurtmangiz yetkazildi. Yoqimli ishtaha!`;
          break;
        case 'cancelled':
          statusLabel = '❌ BEKOR QILINDI';
          customerMsg = `⚠️ Sizning #${orderNumber} raqamli buyurtmangiz bekor qilindi.`;
          break;
      }

      try {
        await ctx.answerCbQuery(`Holat o'zgardi: ${statusLabel}`);
      } catch (e) {}

      // Update message text
      try {
        const currentText = ctx.callbackQuery.message.text || '';
        const updatedText = currentText.replace(/Holati: .*/g, `Holati: <b>${statusLabel}</b>`);
        
        await ctx.editMessageText(updatedText, {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback('🛵 Yo\'lda', `status:${orderNumber}:delivering`),
              Markup.button.callback('🏁 Yetkazildi', `status:${orderNumber}:delivered`),
              Markup.button.callback('❌ Bekor qilish', `status:${orderNumber}:cancelled`)
            ]
          ])
        });
      } catch (e) {}

      // Notify customer if user id exists
      const order = await db.getOrder(orderNumber);
      if (order && order.telegram_user_id) {
        try {
          await this.bot.telegram.sendMessage(order.telegram_user_id, customerMsg);
        } catch (err) {
          console.warn('Mijozga xabar yuborilmadi:', err.message);
        }
      }
    });
  }

  formatPaymentName(method) {
    switch (method) {
      case 'cash': return '💵 Naqd pul (Yetkazilganda)';
      case 'click': return '💳 Click';
      case 'payme': return '🟣 Payme';
      default: return method;
    }
  }

  formatPrice(num) {
    return new Intl.NumberFormat('uz-UZ').format(num) + " so'm";
  }

  async notifyAdminNewOrder(order) {
    if (!this.bot || !this.adminChatId) {
      console.warn('⚠️ [Telegram Bot] Admin bildirishnomasi yuborilmadi (adminChatId yoki bot topilmadi).');
      return;
    }

    const itemsText = (order.items || [])
      .map(item => `  • <b>${item.quantity}x</b> ${item.name} — ${this.formatPrice(item.price * item.quantity)}`)
      .join('\n');

    const customerLink = order.telegram_username 
      ? `@${order.telegram_username}` 
      : (order.customer_name || 'Noma\'lum');

    const msg = 
`🔔 <b>YANGI BUYURTMA #${order.order_number}</b>

👤 <b>Mijoz:</b> ${order.customer_name} (${customerLink})
📞 <b>Telefon:</b> <code>${order.customer_phone}</code>
📍 <b>Manzil:</b> ${order.customer_address}
${order.notes ? `📝 <b>Izoh:</b> <i>${order.notes}</i>\n` : ''}💳 <b>To'lov turi:</b> ${this.formatPaymentName(order.payment_method)}
Holati: <b>🟡 Yangi (Kutilmoqda)</b>

🛒 <b>Buyurtma tarkibi:</b>
${itemsText}

💰 <b>Jami summa:</b> <b>${this.formatPrice(order.total_amount)}</b>
⏰ <b>Vaqt:</b> ${new Date(order.created_at || Date.now()).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Qabul qilish', `status:${order.order_number}:accepted`),
        Markup.button.callback('🛵 Kuryerda', `status:${order.order_number}:delivering`),
      ],
      [
        Markup.button.callback('❌ Bekor qilish', `status:${order.order_number}:cancelled`)
      ]
    ]);

    try {
      await this.bot.telegram.sendMessage(this.adminChatId, msg, {
        parse_mode: 'HTML',
        ...keyboard
      });
      console.log(`✅ [Telegram Bot] Admin (${this.adminChatId}) ga yangi buyurtma yuborildi!`);
    } catch (err) {
      console.error('❌ [Telegram Bot] Adminga xabar yuborishda xatolik:', err.message);
    }

    // Also notify customer if telegram_user_id is available
    if (order.telegram_user_id) {
      try {
        const customerNotice = 
`Rahmat, ${order.customer_name}! 🎉

Sizning <b>#${order.order_number}</b> raqamli buyurtmangiz qabul qilindi.
Tez orada administratorimiz siz bilan bog'lanadi.

💰 Jami: <b>${this.formatPrice(order.total_amount)}</b>
💳 To'lov: <b>${this.formatPaymentName(order.payment_method)}</b>`;

        await this.bot.telegram.sendMessage(order.telegram_user_id, customerNotice, { parse_mode: 'HTML' });
      } catch (e) {}
    }
  }
}

module.exports = new BotService();
