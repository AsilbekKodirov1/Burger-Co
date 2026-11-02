const { Telegraf, Markup } = require('telegraf');
const db = require('../db');

// Multi-language text dictionaries
const TEXTS = {
  uz: {
    choose_lang: "Assalomu alaykum! 🍔 <b>Burger & Co.</b> ga xush kelibsiz!\nIltimos, muloqot tilini tanlang:",
    lang_set: "🇺🇿 O'zbek tili tanlandi.",
    ask_phone: "Buyurtmalaringizni qabul qilish va siz bilan bog'lanishimiz uchun telefon raqamingizni yuboring:",
    btn_send_phone: "📱 Telefon raqamni yuborish",
    phone_saved: "Rahmat! Telefon raqamingiz muvaffaqiyatli saqlandi. ✅",
    main_welcome: "<b>Burger & Co.</b> ga xush kelibsiz! 🍔\nBizda faqat yangi mayin mol go'shti va eritilgan cheddordan tayyorlangan smash burgerlar.\n\nQuyidagi tugma orqali menyuni oching va buyurtma bering:",
    btn_menu: "🍔 Menyu va Buyurtma berish",
    btn_history: "📜 Buyurtmalarim tarixi",
    btn_settings: "⚙️ Tilni o'zgartirish",
    no_orders: "Sizda hali buyurtmalar mavjud emas. Quyidagi tugma orqali birinchi buyurtmangizni bering! 👇",
    order_history_title: "📜 <b>Sizning oxirgi buyurtmalaringiz:</b>\n\n",
    status_new: "🟡 Qabul qilinishi kutilmoqda",
    status_accepted: "👨‍🍳 Qabul qilindi (Tayyorlanmoqda)",
    status_delivering: "🛵 Kuryerda (Yo'lda)",
    status_delivered: "🏁 Yetkazib berildi",
    status_cancelled: "❌ Bekor qilindi",
    // Customer status notifications
    notify_accepted: "👨‍🍳 Sizning <b>#{orderNumber}</b> raqamli buyurtmangiz <b>QABUL QILINDI</b> va hozir oshxonada tayyorlanmoqda!",
    notify_delivering: "🛵 Sizning <b>#{orderNumber}</b> raqamli buyurtmangiz <b>KURYERGA BERILDI</b> va yo'lda yetkazilmoqda!",
    notify_delivered: "🏁 Sizning <b>#{orderNumber}</b> raqamli buyurtmangiz <b>YETKAZIB BERILDI</b>. Yoqimli ishtaha! 🎉",
    notify_cancelled: "❌ Sizning <b>#{orderNumber}</b> raqamli buyurtmangiz <b>BEKOR QILINDI</b>."
  },
  ru: {
    choose_lang: "Здравствуйте! 🍔 Добро пожаловать в <b>Burger & Co.</b>!\nПожалуйста, выберите язык:",
    lang_set: "🇷🇺 Выбран русский язык.",
    ask_phone: "Для оформления заказов и связи отправьте ваш номер телефона:",
    btn_send_phone: "📱 Отправить номер телефона",
    phone_saved: "Спасибо! Ваш номер телефона успешно сохранен. ✅",
    main_welcome: "Добро пожаловать в <b>Burger & Co.</b>! 🍔\nУ нас только настоящие сочные смэш-бургеры из свежей говядины с тающим чеддером.\n\nНажмите кнопку ниже, чтобы открыть меню и сделать заказ:",
    btn_menu: "🍔 Меню и Заказ",
    btn_history: "📜 История заказов",
    btn_settings: "⚙️ Сменить язык",
    no_orders: "У вас пока нет заказов. Нажмите кнопку ниже, чтобы сделать свой первый заказ! 👇",
    order_history_title: "📜 <b>Ваши последние заказы:</b>\n\n",
    status_new: "🟡 Ожидает подтверждения",
    status_accepted: "👨‍🍳 Принят (Готовится)",
    status_delivering: "🛵 У курьера (В пути)",
    status_delivered: "🏁 Доставлен",
    status_cancelled: "❌ Отменен",
    // Customer status notifications
    notify_accepted: "👨‍🍳 Ваш заказ <b>#{orderNumber}</b> принят и готовится на кухне!",
    notify_delivering: "🛵 Ваш заказ <b>#{orderNumber}</b> передан курьеру и уже в пути!",
    notify_delivered: "🎉 Ваш заказ <b>#{orderNumber}</b> успешно доставлен. Приятного аппетита!",
    notify_cancelled: "⚠️ Ваш заказ <b>#{orderNumber}</b> был отменен."
  },
  en: {
    choose_lang: "Welcome! 🍔 Welcome to <b>Burger & Co.</b>!\nPlease select your preferred language:",
    lang_set: "🇬🇧 English selected.",
    ask_phone: "To process your orders and reach you, please share your phone number:",
    btn_send_phone: "📱 Share phone number",
    phone_saved: "Thank you! Your phone number has been saved. ✅",
    main_welcome: "Welcome to <b>Burger & Co.</b>! 🍔\nWe serve authentic craft smash burgers made from fresh beef and melted cheddar.\n\nTap the button below to view the menu and place your order:",
    btn_menu: "🍔 Menu & Order",
    btn_history: "📜 Order History",
    btn_settings: "⚙️ Change Language",
    no_orders: "You have no orders yet. Tap below to place your first order! 👇",
    order_history_title: "📜 <b>Your recent orders:</b>\n\n",
    status_new: "🟡 Waiting for confirmation",
    status_accepted: "👨‍🍳 Accepted (Preparing)",
    status_delivering: "🛵 On the way (Courier)",
    status_delivered: "🏁 Delivered",
    status_cancelled: "❌ Cancelled",
    // Customer status notifications
    notify_accepted: "👨‍🍳 Your order <b>#{orderNumber}</b> has been accepted and is being prepared!",
    notify_delivering: "🛵 Your order <b>#{orderNumber}</b> is on the way with our courier!",
    notify_delivered: "🎉 Your order <b>#{orderNumber}</b> has been delivered. Enjoy!",
    notify_cancelled: "⚠️ Your order <b>#{orderNumber}</b> was cancelled."
  }
};

class BotService {
  constructor() {
    this.bot = null;
    this.token = null;
    this.adminChatId = null;
    this.webAppUrl = null;
    this.isInitialized = false;
  }

  init(token, adminChatId, webAppUrl) {
    if (!token) {
      console.warn('⚠️ [Telegram Bot] BOT_TOKEN berilmagan!');
      return;
    }

    this.token = token;
    this.adminChatId = adminChatId;
    this.webAppUrl = webAppUrl || 'https://burger-co-pi.vercel.app';

    try {
      this.bot = new Telegraf(token);
      this.registerHandlers();
      this.isInitialized = true;
    } catch (err) {
      console.warn('Telegram bot init error:', err.message);
    }

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

  t(lang, key) {
    const l = TEXTS[lang] ? lang : 'uz';
    return TEXTS[l][key] || TEXTS['uz'][key] || key;
  }

  getMainKeyboard(lang) {
    const t = (k) => this.t(lang, k);
    return Markup.keyboard([
      [Markup.button.webApp(t('btn_menu'), this.webAppUrl)],
      [t('btn_history'), t('btn_settings')]
    ]).resize();
  }

  getLangKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback("🇺🇿 O'zbekcha", 'set_lang:uz'),
        Markup.button.callback('🇷🇺 Русский', 'set_lang:ru'),
        Markup.button.callback('🇬🇧 English', 'set_lang:en')
      ]
    ]);
  }

  registerHandlers() {
    // /start command
    this.bot.command('start', async (ctx) => {
      const telegramId = ctx.from.id;
      let user = await db.getUser(telegramId);

      if (!user) {
        user = await db.upsertUser({
          telegram_id: telegramId,
          first_name: ctx.from.first_name,
          username: ctx.from.username,
          language: 'uz',
          state: 'ask_lang'
        });
      }

      // If user doesn't have phone number yet, ask language and phone
      if (!user.phone_number) {
        await ctx.replyWithHTML(this.t('uz', 'choose_lang'), this.getLangKeyboard());
      } else {
        // User already registered
        const lang = user.language || 'uz';
        await ctx.replyWithHTML(this.t(lang, 'main_welcome'), this.getMainKeyboard(lang));
      }
    });

    // Language selection callback
    this.bot.action(/^set_lang:(uz|ru|en)$/, async (ctx) => {
      const lang = ctx.match[1];
      const telegramId = ctx.from.id;

      await db.updateUserLanguage(telegramId, lang);
      await ctx.answerCbQuery(this.t(lang, 'lang_set'));

      const user = await db.getUser(telegramId);

      // If phone is missing, ask for contact
      if (!user.phone_number) {
        const phoneKeyboard = Markup.keyboard([
          [Markup.button.contactRequest(this.t(lang, 'btn_send_phone'))]
        ]).resize().oneTime();

        await ctx.replyWithHTML(this.t(lang, 'ask_phone'), phoneKeyboard);
      } else {
        await ctx.replyWithHTML(this.t(lang, 'main_welcome'), this.getMainKeyboard(lang));
      }
    });

    // Contact received
    this.bot.on('contact', async (ctx) => {
      const telegramId = ctx.from.id;
      let phone = ctx.message.contact.phone_number;
      if (!phone.startsWith('+')) phone = '+' + phone;

      await db.updateUserPhone(telegramId, phone);
      const user = await db.getUser(telegramId);
      const lang = user?.language || 'uz';

      await ctx.replyWithHTML(this.t(lang, 'phone_saved'));
      await ctx.replyWithHTML(this.t(lang, 'main_welcome'), this.getMainKeyboard(lang));
    });

    // Text input handler (e.g. phone typed as text, menu buttons)
    this.bot.on('text', async (ctx) => {
      const text = ctx.message.text.trim();
      const telegramId = ctx.from.id;
      const user = await db.getUser(telegramId);
      const lang = user?.language || 'uz';

      // 1. Check if user clicked "Mening buyurtmalarim"
      if (text === this.t('uz', 'btn_history') || text === this.t('ru', 'btn_history') || text === this.t('en', 'btn_history') || text === '/orders') {
        const orders = await db.getUserOrders(telegramId);

        if (!orders || orders.length === 0) {
          const webAppBtn = Markup.inlineKeyboard([
            [Markup.button.webApp(this.t(lang, 'btn_menu'), this.webAppUrl)]
          ]);
          return ctx.replyWithHTML(this.t(lang, 'no_orders'), webAppBtn);
        }

        let msg = this.t(lang, 'order_history_title');
        orders.forEach(o => {
          let statusText = this.t(lang, 'status_new');
          if (o.order_status === 'accepted') statusText = this.t(lang, 'status_accepted');
          if (o.order_status === 'delivering') statusText = this.t(lang, 'status_delivering');
          if (o.order_status === 'delivered') statusText = this.t(lang, 'status_delivered');
          if (o.order_status === 'cancelled') statusText = this.t(lang, 'status_cancelled');

          const itemsSummary = (o.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ');
          const dateStr = new Date(o.created_at).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

          msg += `📦 <b>Buyurtma #${o.order_number}</b> (${dateStr})\n`;
          msg += `🍔 <i>${itemsSummary}</i>\n`;
          msg += `💰 Summa: <b>${this.formatPrice(o.total_amount)}</b>\n`;
          msg += `Holati: <b>${statusText}</b>\n\n`;
        });

        return ctx.replyWithHTML(msg);
      }

      // 2. Check if user clicked "Tilni o'zgartirish"
      if (text === this.t('uz', 'btn_settings') || text === this.t('ru', 'btn_settings') || text === this.t('en', 'btn_settings') || text === '/lang') {
        return ctx.replyWithHTML(this.t(lang, 'choose_lang'), this.getLangKeyboard());
      }

      // 3. If user is in 'ask_phone' state and typed their phone number manually
      if (user && !user.phone_number && /^(\+?[0-9\s-]{9,15})$/.test(text)) {
        await db.updateUserPhone(telegramId, text);
        await ctx.replyWithHTML(this.t(lang, 'phone_saved'));
        return ctx.replyWithHTML(this.t(lang, 'main_welcome'), this.getMainKeyboard(lang));
      }
    });

    // Admin action buttons (qabul qilish, yetkazilmoqda, yetkazildi, bekor qilish)
    this.bot.action(/^status:(.+)$/, async (ctx) => {
      const parts = ctx.match[1].split(':');
      let orderNumber, customerId, newStatus;

      if (parts.length >= 3) {
        orderNumber = parts[0];
        customerId = parts[1];
        newStatus = parts[2];
      } else {
        orderNumber = parts[0];
        customerId = null;
        newStatus = parts[1];
      }

      await db.updateOrderStatus(orderNumber, newStatus);

      let statusLabel = '';
      let notifyKey = '';
      let nextButtons = [];

      switch (newStatus) {
        case 'accepted':
          statusLabel = '👨‍🍳 QABUL QILINDI (Tayyorlanmoqda)';
          notifyKey = 'notify_accepted';
          nextButtons = [
            [
              Markup.button.callback('🛵 Kuryerda', `status:${orderNumber}:${customerId || '0'}:delivering`),
              Markup.button.callback('🏁 Yetkazildi', `status:${orderNumber}:${customerId || '0'}:delivered`)
            ],
            [
              Markup.button.callback('❌ Bekor qilish', `status:${orderNumber}:${customerId || '0'}:cancelled`)
            ]
          ];
          break;
        case 'delivering':
          statusLabel = '🛵 KURYERDA (Yetkazilmoqda)';
          notifyKey = 'notify_delivering';
          nextButtons = [
            [
              Markup.button.callback('🏁 Yetkazildi', `status:${orderNumber}:${customerId || '0'}:delivered`),
              Markup.button.callback('❌ Bekor qilish', `status:${orderNumber}:${customerId || '0'}:cancelled`)
            ]
          ];
          break;
        case 'delivered':
          statusLabel = '🏁 YETKAZIB BERILDI';
          notifyKey = 'notify_delivered';
          nextButtons = [];
          break;
        case 'cancelled':
          statusLabel = '❌ BEKOR QILINDI';
          notifyKey = 'notify_cancelled';
          nextButtons = [];
          break;
      }

      try {
        await ctx.answerCbQuery(`Holat: ${statusLabel}`);
      } catch (e) {}

      // Update admin message text
      try {
        const currentText = ctx.callbackQuery.message.text || '';
        const updatedText = currentText.replace(/Holati: .*/g, `Holati: <b>${statusLabel}</b>`);

        await ctx.editMessageText(updatedText, {
          parse_mode: 'HTML',
          ...(nextButtons.length > 0 ? Markup.inlineKeyboard(nextButtons) : {})
        });
      } catch (e) {}

      // Send status notification to customer!
      let targetUserId = (customerId && customerId !== '0') ? Number(customerId) : null;
      if (!targetUserId) {
        const order = await db.getOrder(orderNumber);
        if (order && order.telegram_user_id) {
          targetUserId = Number(order.telegram_user_id);
        } else {
          // Fallback to admin so user testing still receives the notification
          targetUserId = Number(this.adminChatId);
        }
      }

      if (targetUserId) {
        const customer = await db.getUser(targetUserId);
        const lang = customer?.language || 'uz';
        const customerMsg = this.t(lang, notifyKey).replace('{orderNumber}', orderNumber);

        try {
          if (this.bot && this.bot.telegram) {
            await this.bot.telegram.sendMessage(targetUserId, customerMsg, { parse_mode: 'HTML' });
          } else {
            throw new Error('Telegraf instance not ready');
          }
        } catch (sendErr) {
          // Direct fetch fallback to customer
          try {
            await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: targetUserId,
                text: customerMsg,
                parse_mode: 'HTML'
              })
            });
            console.log(`✅ [Telegram Bot] Status xabari (${targetUserId}) ga yetkazildi!`);
          } catch (fetchErr) {
            console.warn('Mijozga xabar yetib bormadi:', fetchErr.message);
          }
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
    if (!this.adminChatId) return;

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

    const customerId = order.telegram_user_id || '0';
    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Qabul qilish', `status:${order.order_number}:${customerId}:accepted`),
        Markup.button.callback('🛵 Kuryerda', `status:${order.order_number}:${customerId}:delivering`),
      ],
      [
        Markup.button.callback('❌ Bekor qilish', `status:${order.order_number}:${customerId}:cancelled`)
      ]
    ]);

    try {
      if (this.bot && this.bot.telegram) {
        await this.bot.telegram.sendMessage(this.adminChatId, msg, {
          parse_mode: 'HTML',
          ...keyboard
        });
      } else {
        throw new Error('Telegraf instance mavjud emas');
      }
      console.log(`✅ [Telegram Bot] Admin (${this.adminChatId}) ga yangi buyurtma yuborildi!`);
    } catch (err) {
      // Direct HTTP fetch fallback to admin
      try {
        await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.adminChatId,
            text: msg,
            parse_mode: 'HTML',
            reply_markup: keyboard.reply_markup
          })
        });
        console.log(`✅ [Telegram Bot] HTTP fetch orqali admin (${this.adminChatId}) ga yuborildi!`);
      } catch (fetchErr) {
        console.error('❌ [Telegram Bot] Adminga xabar yuborishda xatolik:', fetchErr.message);
      }
    }

    // Also send instant confirmation to customer in their language
    const customerTargetId = order.telegram_user_id ? Number(order.telegram_user_id) : Number(this.adminChatId);
    if (customerTargetId) {
      try {
        const customer = await db.getUser(customerTargetId);
        const lang = customer?.language || 'uz';

        const customerNotice =
`Rahmat, ${order.customer_name}! 🎉

Sizning <b>#${order.order_number}</b> raqamli buyurtmangiz qabul qilindi.
Holati: <b>🟡 Kutilmoqda (Oshxona tasdig'i kutilmoqda)</b>

Tez orada oshxona buyurtmangizni tasdiqlaydi!

💰 Jami: <b>${this.formatPrice(order.total_amount)}</b>
💳 To'lov: <b>${this.formatPaymentName(order.payment_method)}</b>`;

        await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: customerTargetId,
            text: customerNotice,
            parse_mode: 'HTML'
          })
        });
      } catch (e) {}
    }
            chat_id: order.telegram_user_id,
            text: customerNotice,
            parse_mode: 'HTML'
          })
        });
      } catch (e) {}
    }
  }
}

module.exports = new BotService();
