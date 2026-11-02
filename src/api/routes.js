const express = require('express');
const router = express.Router();
const db = require('../db');
const bot = require('../bot/bot');

// Get all products
router.get('/products', async (req, res) => {
  try {
    const products = await db.getProducts();
    res.json({ ok: true, data: products });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ ok: false, error: 'Mahsulotlarni yuklashda xatolik' });
  }
});

// Create new order
router.post('/orders', async (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_address,
      items,
      payment_method,
      notes,
      telegram_user_id,
      telegram_username
    } = req.body;

    // Validate inputs
    if (!customer_name || !customer_phone || !customer_address) {
      return res.status(400).json({
        ok: false,
        error: 'Ism, telefon raqam va manzil kiritilishi shart!'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'Savatchada kamida bitta mahsulot bo\'lishi kerak!'
      });
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);

    let resolvedUserId = telegram_user_id || null;
    let resolvedUsername = telegram_username || null;

    if (!resolvedUserId && customer_phone) {
      const matchedUser = await db.getUserByPhone(customer_phone);
      if (matchedUser) {
        resolvedUserId = matchedUser.telegram_id;
        resolvedUsername = resolvedUsername || matchedUser.username;
      }
    }

    const orderData = {
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.trim(),
      customer_address: customer_address.trim(),
      items,
      total_amount: totalAmount,
      payment_method: payment_method || 'cash',
      notes: notes ? notes.trim() : '',
      telegram_user_id: resolvedUserId,
      telegram_username: resolvedUsername
    };

    // Save to PostgreSQL (with fallback)
    const savedOrder = await db.createOrder(orderData);

    // Notify Telegram Admin immediately
    await bot.notifyAdminNewOrder(savedOrder);

    res.status(201).json({
      ok: true,
      data: savedOrder,
      message: 'Buyurtma muvaffaqiyatli qabul qilindi!'
    });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ ok: false, error: 'Buyurtmani saqlashda xatolik yuz berdi' });
  }
});

// Get order by order number
router.get('/orders/:orderNumber', async (req, res) => {
  try {
    const order = await db.getOrder(req.params.orderNumber);
    if (!order) {
      return res.status(404).json({ ok: false, error: 'Buyurtma topilmadi' });
    }
    res.json({ ok: true, data: order });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get user profile by telegram ID
router.get('/user/:telegramId', async (req, res) => {
  try {
    const user = await db.getUser(req.params.telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Foydalanuvchi topilmadi' });
    }
    res.json({ ok: true, data: user });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get user order history
router.get('/user/:telegramId/orders', async (req, res) => {
  try {
    const orders = await db.getUserOrders(req.params.telegramId);
    res.json({ ok: true, data: orders });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    postgres: db.isPostgresConnected,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

