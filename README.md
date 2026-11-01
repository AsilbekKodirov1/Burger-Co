# 🍔 Burger & Co. — Telegram Mini Web App

Haqiqiy craft smash burgerlar maskani uchun ishlab chiqilgan zamonaviy, minimalistik **Telegram Mini Web App** va buyurtmalar boshqaruv tizimi.

Ushbu loyiha **`taste-skill`** v2 anti-slop qoidalariga (Grafite & Safety Orange palitrasi, General Sans tipografiyasi, yassi va taktil yuzalar, keraksiz neon va qoliplarsiz toza dizayn) to'liq mos holda yaratilgan.

---

## ⚡ Asosiy imkoniyatlar

1. **Klient uchun Telegram Mini App:**
   - Tezkor, qulay va toza mobil interfeys (Telegram WebApp SDK bilan integratsiyalangan).
   - Kategoriyalar bo'yicha saralash (*Burgers, Garnirlar, Ichimliklar, Souslar*).
   - Mahsulotlarni savatchaga qo'shish, miqdorini o'zgartirish va haptik tebranish (Haptic feedback).
   - Pastki suzuvchi savatcha paneli (*Floating Cart Bar*).
   - Buyurtmani rasmiylashtirish darchasi:
     - Ism (Telegram profildan avtomatik to'ldiriladi)
     - Telefon raqami
     - Yetkazib berish manzili + **"📍 Joylashuvimni olish"** (GPS geolokatsiya)
     - To'lov usullari: **Naqd pul**, **Click**, **Payme**
     - Kuryer uchun qo'shimcha izoh

2. **Ma'lumotlar bazasi (PostgreSQL):**
   - Barcha buyurtmalar va mahsulotlar PostgreSQL'da saqlanadi (`src/db/schema.sql`).
   - `orders` jadvali: buyurtma raqami, mijoz ismi, telefoni, manzili, to'lov turi, buyurtma tarkibi (JSONB), jami summa va holati.
   - Avtomatik zaxira tizimi: PostgreSQL vaqtincha mavjud bo'lmaganda ham buyurtmalar yo'qolmasligi uchun lokal xavfsiz JSON rejimiga o'tadi.

3. **Telegram Bot & Admin paneli:**
   - Klient buyurtma berishi bilan zudlik bilan Adminga (`5793896253`) barcha tafsilotlar bilan xabar boradi.
   - Admin uchun interaktiv boshqaruv tugmalari:
     - `✅ Qabul qilish (Oshxonada)`
     - `🛵 Kuryerda (Yo'lda)`
     - `🏁 Yetkazildi`
     - `❌ Bekor qilish`
   - Admin tugmani bosganda, mijozning Telegramiga ham avtomatik bildirishnoma boradi.

---

## 📁 Loyiha tuzilishi

```
mini/
├── .env                  # Bot token, Admin ID, DB URL va port sozlamalari
├── package.json          # Node.js paketlari va buyruqlari
├── src/
│   ├── server.js         # Asosiy Express serveri
│   ├── config.js         # Konfiguratsiya
│   ├── db/
│   │   ├── index.js      # PostgreSQL ulanishi, migratsiya va zaxira xotira
│   │   └── schema.sql    # PostgreSQL jadvallar strukturasi
│   ├── bot/
│   │   └── bot.js        # Telegraf boti (buyurtmalarni adminga yuborish va /start)
│   └── api/
│       └── routes.js     # /api/products va /api/orders marshrutlari
└── public/
    ├── index.html        # Telegram Mini Web App sahifasi
    ├── css/
    │   └── style.css     # Taste-skill asosidagi minimalistik dizayn
    └── js/
        └── app.js        # Telegram WebApp integratsiyasi, savatcha va checkout
```

---

## 🚀 O'rnatish va Ishga tushirish

### 1. Bog'liqliklarni o'rnatish
```bash
npm install
```

### 2. `.env` faylini sozlash
Loyihadagi `.env` faylini oching va ma'lumotlarni tekshiring:
```env
PORT=3000
BOT_TOKEN=9208130021:AAHCIPZN0X-trQoDMVcE3h5oL-YBBzma2SA
ADMIN_CHAT_ID=5793896253
DATABASE_URL=postgresql://postgres:parol@localhost:5432/burger_db
WEBAPP_URL=http://localhost:3000
```
*(Eslatma: Agar PostgreSQL serveringiz bo'lmasa, dastur avtomatik ravishda lokal rejimda ishlayveradi va buyurtmalarni saqlaydi).*

### 3. PostgreSQL bazasini yaratish
PostgreSQL terminalida (`psql`) yangi baza yarating:
```sql
CREATE DATABASE burger_db;
```
Dastur ishga tushganda `orders` va `products` jadvallarini avtomatik yaratadi va boshlang'ich menyuni yuklaydi.

### 4. Dasturni ishga tushirish
```bash
npm start
```
Yoki o'zgarishlarni kuzatib boruvchi rejimda:
```bash
npm run dev
```

---

## 🌐 Telegram Botga Web Appni ulash

Mini App Telegram ichida to'g'ridan-to'g'ri ochilishi uchun:

1. Agar lokal kompyuteringizda ishlayotgan bo'lsangiz, `ngrok` yoki `localtunnel` orqali HTTPS havola oling:
   ```bash
   npx ngrok http 3000
   ```
2. Olingan `https://...ngrok-free.app` havolasini `.env` dagi `WEBAPP_URL` ga yozing.
3. Telegramda [@BotFather](https://t.me/BotFather) ga kiring:
   - `/mybots` -> Botingizni tanlang (`@burgercobot`)
   - `Bot Settings` -> `Menu Button` -> `Configure menu button`
   - Web App URL manzilini yuboring (masalan: `https://...ngrok-free.app`)
   - Tugma nomini kiriting: `🍔 Menyu`

Endi istalgan foydalanuvchi botga kirganda pastda va `/start` xabarida Mini App ochiladi!

