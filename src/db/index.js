const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Default initial products catalog
const INITIAL_PRODUCTS = [
  {
    id: 1,
    category: 'burgers',
    name: 'Double Smash Classic',
    description: "2x 80g qarsildoq qovurilgan mol go'shti, erigan cheddor, marinadlangan bodring, smash sous, mayin brioche.",
    price: 52000,
    weight_or_size: '280g',
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    id: 2,
    category: 'burgers',
    name: 'Truffle & Mushroom',
    description: "Mol go'shti, qovurilgan shampinyon, erigan shveysar pishlog'i, trufel sousi, karamellangan piyoz.",
    price: 58000,
    weight_or_size: '300g',
    image_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    id: 3,
    category: 'burgers',
    name: 'Spicy Jalapeno Smash',
    description: "2x mol go'shti, marinadlangan achchiq xalapeno, cheddor, chipotle sousi, krispi piyoz.",
    price: 55000,
    weight_or_size: '290g',
    image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    id: 4,
    category: 'burgers',
    name: 'Bacon Cheese Deluxe',
    description: "Dudlangan bekon bo'laklari, ikki hissa cheddor, mol go'shti, qizil piyoz va uy uslubidagi BBQ.",
    price: 56000,
    weight_or_size: '310g',
    image_url: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    id: 5,
    category: 'burgers',
    name: 'Single Smash Burger',
    description: "1x 90g mol go'shti, cheddor pishlog'i, marinadlangan bodring, klassik xantal va smash sous.",
    price: 39000,
    weight_or_size: '200g',
    image_url: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    id: 6,
    category: 'sides',
    name: 'Kartoshka Fri Klassik',
    description: "Dengiz tuzi bilan xushbo'ylangan oltin rangli qarsildoq fri.",
    price: 18000,
    weight_or_size: '150g',
    image_url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    id: 7,
    category: 'sides',
    name: 'Loaded Cheddar Fries',
    description: "Issiq eritilgan cheddor sousi va maydalangan xalapeno bilan qoplangan kartoshka fri.",
    price: 28000,
    weight_or_size: '220g',
    image_url: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    id: 8,
    category: 'sides',
    name: 'Krispi Tovuq Strips (4 dona)',
    description: "Mayin tovuq filesi maxsus krispi qarsildoq xamirda.",
    price: 26000,
    weight_or_size: '180g',
    image_url: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    id: 9,
    category: 'drinks',
    name: 'Coca-Cola Classic',
    description: 'Muzdek tetiklantiruvchi original gazli ichimlik.',
    price: 12000,
    weight_or_size: '0.5L',
    image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    id: 10,
    category: 'drinks',
    name: 'Coca-Cola Zero',
    description: 'Shakarsiz original klassik Coca-Cola taʼmi.',
    price: 12000,
    weight_or_size: '0.5L',
    image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    id: 11,
    category: 'drinks',
    name: 'Muzli Uy Limonadi',
    description: 'Yangi siqilgan limon sharbati, yangi yalpiz va tabiiy sirop.',
    price: 18000,
    weight_or_size: '0.4L',
    image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    id: 12,
    category: 'sauces',
    name: 'Maxsus Smash Sous',
    description: "Karamellangan piyoz va marinadlar asosidagi mualliflik sousi.",
    price: 5000,
    weight_or_size: '40g',
    image_url: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    id: 13,
    category: 'sauces',
    name: 'Truffle Mayo',
    description: 'Haqiqiy oq trufel moyi bilan boyitilgan mayin sous.',
    price: 7000,
    weight_or_size: '40g',
    image_url: 'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=600&q=80',
    is_available: true
  }
];

class DatabaseService {
  constructor() {
    this.isPostgresConnected = false;
    this.pool = null;
    this.memoryOrders = [];
    this.memoryUsers = [];
    this.memoryProducts = [...INITIAL_PRODUCTS];
    this.fallbackFile = path.join(os.tmpdir(), 'burger_orders.json');
    this.ensureFallbackStorage();
  }

  ensureFallbackStorage() {
    try {
      if (!fs.existsSync(this.fallbackFile)) {
        fs.writeFileSync(this.fallbackFile, JSON.stringify({ orders: [], users: [], products: INITIAL_PRODUCTS }, null, 2));
      } else {
        const content = JSON.parse(fs.readFileSync(this.fallbackFile, 'utf8'));
        if (content.orders) this.memoryOrders = content.orders;
        if (content.users) this.memoryUsers = content.users;
      }
    } catch (e) {
      // Memory fallback is active
    }
  }

  async init(connectionString) {
    if (!connectionString || (process.env.VERCEL && connectionString.includes('localhost'))) {
      console.warn('💡 [Database] DATABASE_URL kiritilmagan yoki localhost. Xavfsiz xotira (memory/tmp) rejimi faol.');
      return;
    }

    try {
      this.pool = new Pool({
        connectionString,
        ssl: connectionString.includes('sslmode=require') || connectionString.includes('neon.tech') || connectionString.includes('supabase')
          ? { rejectUnauthorized: false }
          : false,
        connectionTimeoutMillis: 3500
      });

      const client = await this.pool.connect();
      this.isPostgresConnected = true;
      console.log('✅ [PostgreSQL] Bazaga muvaffaqiyatli ulandi!');

      // Run schema migrations if file exists
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schemaSql);
      }

      // Seed products if table empty
      const prodRes = await client.query('SELECT COUNT(*) FROM products');
      if (parseInt(prodRes.rows[0].count, 10) === 0) {
        for (const item of INITIAL_PRODUCTS) {
          await client.query(
            `INSERT INTO products (category, name, description, price, image_url, weight_or_size, is_available)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [item.category, item.name, item.description, item.price, item.image_url, item.weight_or_size, item.is_available]
          );
        }
      }

      client.release();
    } catch (err) {
      this.isPostgresConnected = false;
      console.warn('⚠️ [PostgreSQL] Ulanishda ogohlantirish (' + err.message + '). Xotira rejimi ishlamoqda.');
    }
  }

  // --- USER METHODS ---
  async getUserByPhone(phone) {
    if (!phone) return null;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) return null;
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query(
          "SELECT * FROM users WHERE REPLACE(REPLACE(phone_number, '+', ''), ' ', '') LIKE $1 LIMIT 1",
          ['%' + cleanPhone.slice(-9)]
        );
        return res.rows[0] || null;
      } catch (err) {
        console.error('PostgreSQL getUserByPhone:', err.message);
      }
    }
    return this.memoryUsers.find(u => {
      const uClean = (u.phone_number || '').replace(/[^0-9]/g, '');
      return uClean && cleanPhone && uClean.slice(-9) === cleanPhone.slice(-9);
    }) || null;
  }

  async getUser(telegramId) {
    const tid = Number(telegramId);
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM users WHERE telegram_id = $1', [tid]);
        return res.rows[0] || null;
      } catch (err) {
        console.error('PostgreSQL getUser:', err.message);
      }
    }
    return this.memoryUsers.find(u => Number(u.telegram_id) === tid) || null;
  }

  async upsertUser(userData) {
    const tid = Number(userData.telegram_id);
    const existing = await this.getUser(tid);

    if (this.isPostgresConnected && this.pool) {
      try {
        if (existing) {
          const res = await this.pool.query(
            `UPDATE users 
             SET first_name = COALESCE($2, first_name),
                 username = COALESCE($3, username),
                 phone_number = COALESCE($4, phone_number),
                 language = COALESCE($5, language),
                 state = COALESCE($6, state)
             WHERE telegram_id = $1
             RETURNING *;`,
            [tid, userData.first_name, userData.username, userData.phone_number, userData.language, userData.state]
          );
          return res.rows[0];
        } else {
          const res = await this.pool.query(
            `INSERT INTO users (telegram_id, first_name, username, phone_number, language, state)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *;`,
            [tid, userData.first_name || '', userData.username || '', userData.phone_number || '', userData.language || 'uz', userData.state || 'ask_lang']
          );
          return res.rows[0];
        }
      } catch (err) {
        console.error('PostgreSQL upsertUser:', err.message);
      }
    }

    // Memory fallback
    if (existing) {
      Object.assign(existing, userData);
      return existing;
    } else {
      const newUser = {
        id: this.memoryUsers.length + 1,
        telegram_id: tid,
        first_name: userData.first_name || '',
        username: userData.username || '',
        phone_number: userData.phone_number || '',
        language: userData.language || 'uz',
        state: userData.state || 'ask_lang',
        created_at: new Date().toISOString()
      };
      this.memoryUsers.push(newUser);
      try {
        fs.writeFileSync(this.fallbackFile, JSON.stringify({ orders: this.memoryOrders, users: this.memoryUsers, products: this.memoryProducts }, null, 2));
      } catch (e) {}
      return newUser;
    }
  }

  async updateUserLanguage(telegramId, lang) {
    return this.upsertUser({ telegram_id: telegramId, language: lang, state: 'ask_phone' });
  }

  async updateUserPhone(telegramId, phone) {
    return this.upsertUser({ telegram_id: telegramId, phone_number: phone, state: 'ready' });
  }

  async getUserOrders(telegramId) {
    const tid = Number(telegramId);
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM orders WHERE telegram_user_id = $1 ORDER BY created_at DESC LIMIT 15', [tid]);
        return res.rows;
      } catch (err) {
        console.error('PostgreSQL getUserOrders:', err.message);
      }
    }
    return this.memoryOrders.filter(o => Number(o.telegram_user_id) === tid).reverse().slice(0, 15);
  }

  async getOrdersByPhone(phone) {
    if (!phone) return [];
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) return [];
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query(
          "SELECT * FROM orders WHERE REPLACE(REPLACE(customer_phone, '+', ''), ' ', '') LIKE $1 ORDER BY created_at DESC LIMIT 15",
          ['%' + cleanPhone.slice(-9)]
        );
        return res.rows;
      } catch (err) {
        console.error('PostgreSQL getOrdersByPhone:', err.message);
      }
    }
    return this.memoryOrders.filter(o => {
      const oClean = (o.customer_phone || '').replace(/[^0-9]/g, '');
      return oClean && cleanPhone && oClean.slice(-9) === cleanPhone.slice(-9);
    }).reverse().slice(0, 15);
  }

  // --- PRODUCT METHODS ---
  async getProducts() {
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM products WHERE is_available = true ORDER BY id ASC');
        return res.rows;
      } catch (err) {
        console.error('PostgreSQL getProducts:', err.message);
      }
    }
    return this.memoryProducts;
  }

  // --- ORDER METHODS ---
  async createOrder(orderData) {
    const orderNumber = 'BG-' + Math.floor(100000 + Math.random() * 900000);
    const createdAt = new Date().toISOString();

    const orderRecord = {
      id: this.memoryOrders.length + 1,
      order_number: orderNumber,
      customer_name: orderData.customer_name || 'Mijoz',
      customer_phone: orderData.customer_phone || '',
      customer_address: orderData.customer_address || '',
      telegram_user_id: orderData.telegram_user_id ? Number(orderData.telegram_user_id) : null,
      telegram_username: orderData.telegram_username || null,
      items: orderData.items || [],
      total_amount: orderData.total_amount || 0,
      payment_method: orderData.payment_method || 'cash',
      payment_status: 'kutilmoqda',
      order_status: 'yangi',
      notes: orderData.notes || '',
      created_at: createdAt
    };

    if (this.isPostgresConnected && this.pool) {
      try {
        const query = `
          INSERT INTO orders (
            order_number, customer_name, customer_phone, customer_address,
            telegram_user_id, telegram_username, items, total_amount,
            payment_method, payment_status, order_status, notes, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *;
        `;
        const values = [
          orderRecord.order_number,
          orderRecord.customer_name,
          orderRecord.customer_phone,
          orderRecord.customer_address,
          orderRecord.telegram_user_id,
          orderRecord.telegram_username,
          JSON.stringify(orderRecord.items),
          orderRecord.total_amount,
          orderRecord.payment_method,
          orderRecord.payment_status,
          orderRecord.order_status,
          orderRecord.notes,
          orderRecord.created_at
        ];

        const res = await this.pool.query(query, values);
        return res.rows[0];
      } catch (err) {
        console.error('PostgreSQL createOrder:', err.message);
      }
    }

    // Save to memory & tmp file
    this.memoryOrders.push(orderRecord);
    try {
      fs.writeFileSync(this.fallbackFile, JSON.stringify({ orders: this.memoryOrders, users: this.memoryUsers, products: this.memoryProducts }, null, 2));
    } catch (e) {}

    return orderRecord;
  }

  async getOrder(orderNumber) {
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM orders WHERE order_number = $1', [orderNumber]);
        return res.rows[0] || null;
      } catch (err) {
        console.error('PostgreSQL getOrder:', err.message);
      }
    }
    return this.memoryOrders.find(o => o.order_number === orderNumber) || null;
  }

  async updateOrderStatus(orderNumber, status) {
    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query('UPDATE orders SET order_status = $1 WHERE order_number = $2', [status, orderNumber]);
        return true;
      } catch (err) {
        console.error('PostgreSQL updateOrderStatus:', err.message);
      }
    }
    const order = this.memoryOrders.find(o => o.order_number === orderNumber);
    if (order) {
      order.order_status = status;
      try {
        fs.writeFileSync(this.fallbackFile, JSON.stringify({ orders: this.memoryOrders, users: this.memoryUsers, products: this.memoryProducts }, null, 2));
      } catch (e) {}
      return true;
    }
    return false;
  }
}

module.exports = new DatabaseService();
