const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Default initial products catalog
const INITIAL_PRODUCTS = [
  {
    category: 'burgers',
    name: 'Double Smash Classic',
    description: "2x 80g qarsildoq qovurilgan mol go'shti, erigan cheddor, marinadlangan bodring, smash sous, mayin brioche.",
    price: 52000,
    weight_or_size: '280g',
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    category: 'burgers',
    name: 'Truffle & Mushroom',
    description: "Mol go'shti, qovurilgan shampinyon, erigan shveysar pishlog'i, trufel sousi, karamellangan piyoz.",
    price: 58000,
    weight_or_size: '300g',
    image_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    category: 'burgers',
    name: 'Spicy Jalapeno Smash',
    description: "2x mol go'shti, marinadlangan achchiq xalapeno, cheddor, chipotle sousi, krispi piyoz.",
    price: 55000,
    weight_or_size: '290g',
    image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    category: 'burgers',
    name: 'Bacon Cheese Deluxe',
    description: "Dudlangan bekon bo'laklari, ikki hissa cheddor, mol go'shti, qizil piyoz va uy uslubidagi BBQ.",
    price: 56000,
    weight_or_size: '310g',
    image_url: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    category: 'burgers',
    name: 'Single Smash Burger',
    description: "1x 90g mol go'shti, cheddor pishlog'i, marinadlangan bodring, klassik xantal va smash sous.",
    price: 39000,
    weight_or_size: '200g',
    image_url: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    category: 'sides',
    name: 'Kartoshka Fri Klassik',
    description: "Dengiz tuzi bilan xushbo'ylangan oltin rangli qarsildoq fri.",
    price: 18000,
    weight_or_size: '150g',
    image_url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    category: 'sides',
    name: 'Loaded Cheddar Fries',
    description: "Issiq eritilgan cheddor sousi va maydalangan xalapeno bilan qoplangan kartoshka fri.",
    price: 28000,
    weight_or_size: '220g',
    image_url: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    category: 'sides',
    name: 'Krispi Tovuq Strips (4 dona)',
    description: "Mayin tovuq filesi maxsus krispi qarsildoq xamirda.",
    price: 26000,
    weight_or_size: '180g',
    image_url: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    category: 'drinks',
    name: 'Coca-Cola Classic',
    description: 'Muzdek tetiklantiruvchi original gazli ichimlik.',
    price: 12000,
    weight_or_size: '0.5L',
    image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    category: 'drinks',
    name: 'Coca-Cola Zero',
    description: 'Shakarsiz original klassik Coca-Cola taʼmi.',
    price: 12000,
    weight_or_size: '0.5L',
    image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    category: 'drinks',
    name: 'Muzli Uy Limonadi',
    description: 'Yangi siqilgan limon sharbati, yangi yalpiz va tabiiy sirop.',
    price: 18000,
    weight_or_size: '0.4L',
    image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
    category: 'sauces',
    name: 'Maxsus Smash Sous',
    description: "Karamellangan piyoz va marinadlar asosidagi mualliflik sousi.",
    price: 5000,
    weight_or_size: '40g',
    image_url: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&w=600&q=80',
    is_available: true
  },
  {
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
    this.fallbackFile = path.join(__dirname, '../../data/orders_fallback.json');
    this.ensureFallbackStorage();
  }

  ensureFallbackStorage() {
    const dir = path.dirname(this.fallbackFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.fallbackFile)) {
      fs.writeFileSync(this.fallbackFile, JSON.stringify({ orders: [], products: INITIAL_PRODUCTS }, null, 2));
    }
  }

  async init(connectionString) {
    if (!connectionString) {
      console.warn('⚠️ [Database] DATABASE_URL ko\'rsatilmagan. Zaxira lokal xotiradan foydalanilmoqda.');
      return;
    }

    try {
      this.pool = new Pool({
        connectionString,
        connectionTimeoutMillis: 3500
      });

      // Test connection
      const client = await this.pool.connect();
      this.isPostgresConnected = true;
      console.log('✅ [PostgreSQL] Ma\'lumotlar bazasiga muvaffaqiyatli ulandi!');

      // Run schema migrations
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schemaSql);
        console.log('✅ [PostgreSQL] Jadvallar va indekslar tekshirildi/yaratildi.');
      }

      // Check if products exist, otherwise seed
      const prodRes = await client.query('SELECT COUNT(*) FROM products');
      if (parseInt(prodRes.rows[0].count, 10) === 0) {
        console.log('🌱 [PostgreSQL] Boshlang\'ich menyu mahsulotlari yuklanmoqda...');
        for (const item of INITIAL_PRODUCTS) {
          await client.query(
            `INSERT INTO products (category, name, description, price, image_url, weight_or_size, is_available)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [item.category, item.name, item.description, item.price, item.image_url, item.weight_or_size, item.is_available]
          );
        }
        console.log('✅ [PostgreSQL] Mahsulotlar muvaffaqiyatli saqlandi.');
      }

      client.release();
    } catch (err) {
      this.isPostgresConnected = false;
      console.warn('⚠️ [PostgreSQL] Ulanish amalga oshmadi (' + err.message + ').');
      console.warn('💡 [Fallback] Tizim xavfsiz lokal JSON rejimida ishlamoqda. Buyurtmalar yo\'qolmaydi!');
    }
  }

  async getProducts() {
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM products WHERE is_available = true ORDER BY id ASC');
        return res.rows;
      } catch (err) {
        console.error('PostgreSQL getProducts xatosi:', err.message);
      }
    }
    // Fallback
    try {
      const data = JSON.parse(fs.readFileSync(this.fallbackFile, 'utf8'));
      return data.products || INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  }

  async createOrder(orderData) {
    const orderNumber = 'BG-' + Math.floor(100000 + Math.random() * 900000);
    const createdAt = new Date().toISOString();

    const orderRecord = {
      order_number: orderNumber,
      customer_name: orderData.customer_name || 'Mijoz',
      customer_phone: orderData.customer_phone || '',
      customer_address: orderData.customer_address || '',
      telegram_user_id: orderData.telegram_user_id || null,
      telegram_username: orderData.telegram_username || null,
      items: orderData.items || [],
      total_amount: orderData.total_amount || 0,
      payment_method: orderData.payment_method || 'cash',
      payment_status: orderData.payment_method === 'cash' ? 'kutilmoqda' : 'kutilmoqda',
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
        console.error('PostgreSQL createOrder xatosi:', err.message);
      }
    }

    // Fallback save to JSON
    try {
      const data = JSON.parse(fs.readFileSync(this.fallbackFile, 'utf8'));
      orderRecord.id = (data.orders.length || 0) + 1;
      data.orders.push(orderRecord);
      fs.writeFileSync(this.fallbackFile, JSON.stringify(data, null, 2));
      return orderRecord;
    } catch (err) {
      console.error('Fallback save xatosi:', err.message);
      return orderRecord;
    }
  }

  async getOrder(orderNumber) {
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM orders WHERE order_number = $1', [orderNumber]);
        return res.rows[0] || null;
      } catch (err) {
        console.error('PostgreSQL getOrder xatosi:', err.message);
      }
    }
    try {
      const data = JSON.parse(fs.readFileSync(this.fallbackFile, 'utf8'));
      return data.orders.find(o => o.order_number === orderNumber) || null;
    } catch {
      return null;
    }
  }

  async updateOrderStatus(orderNumber, status) {
    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query('UPDATE orders SET order_status = $1 WHERE order_number = $2', [status, orderNumber]);
        return true;
      } catch (err) {
        console.error('PostgreSQL updateOrderStatus xatosi:', err.message);
      }
    }
    try {
      const data = JSON.parse(fs.readFileSync(this.fallbackFile, 'utf8'));
      const order = data.orders.find(o => o.order_number === orderNumber);
      if (order) {
        order.order_status = status;
        fs.writeFileSync(this.fallbackFile, JSON.stringify(data, null, 2));
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }
}

module.exports = new DatabaseService();

