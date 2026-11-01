/**
 * BURGER & CO. — Telegram Mini Web App
 * Client Application Logic
 */

// Initialize Telegram WebApp SDK if running inside Telegram
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  // Optional: Set header color to match our palette
  if (tg.setHeaderColor) tg.setHeaderColor('#18191b');
  if (tg.setBackgroundColor) tg.setBackgroundColor('#18191b');
}

// Haptic feedback helper
function triggerHaptic(type = 'light') {
  if (!tg?.HapticFeedback) return;
  try {
    if (type === 'light') tg.HapticFeedback.impactOccurred('light');
    if (type === 'medium') tg.HapticFeedback.impactOccurred('medium');
    if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
    if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
  } catch (e) {
    // Ignore unsupported
  }
}

// Global State
let allProducts = [];
let currentCategory = 'all';
let cart = {}; // { [productId]: { product, quantity } }

// Format currency
function formatSum(amount) {
  return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm";
}

// DOM Elements
const productGrid = document.getElementById('productGrid');
const categoryNav = document.getElementById('categoryNav');
const floatingCartBar = document.getElementById('floatingCartBar');
const cartCountBadge = document.getElementById('cartCountBadge');
const cartBarTotal = document.getElementById('cartBarTotal');
const openCheckoutBtn = document.getElementById('openCheckoutBtn');

// Modal Elements
const checkoutModal = document.getElementById('checkoutModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const closeModalBtn = document.getElementById('closeModalBtn');
const orderForm = document.getElementById('orderForm');
const orderItemsList = document.getElementById('orderItemsList');
const summaryItemsCount = document.getElementById('summaryItemsCount');
const summaryTotalSum = document.getElementById('summaryTotalSum');
const submitBtnSum = document.getElementById('submitBtnSum');
const submitOrderBtn = document.getElementById('submitOrderBtn');

// Success Elements
const successModal = document.getElementById('successModal');
const successOrderNumber = document.getElementById('successOrderNumber');
const successDoneBtn = document.getElementById('successDoneBtn');

// Geolocation button
const btnGeolocate = document.getElementById('btnGeolocate');
const customerAddressInput = document.getElementById('customerAddress');

// 1. Pre-fill user data from Telegram WebApp
function prefillUserData() {
  if (!tg?.initDataUnsafe?.user) return;
  const user = tg.initDataUnsafe.user;
  const nameInput = document.getElementById('customerName');
  if (nameInput && !nameInput.value) {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    nameInput.value = fullName;
  }
}

// 2. Fetch products from API
async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    const result = await response.json();
    if (result.ok && result.data) {
      allProducts = result.data;
      renderProducts();
    } else {
      productGrid.innerHTML = '<div class="loading-state"><p>Menyu yuklanmadi. Qayta urinib ko\'ring.</p></div>';
    }
  } catch (err) {
    console.error('Error loading products:', err);
    productGrid.innerHTML = '<div class="loading-state"><p>Internetga ulanishda xatolik.</p></div>';
  }
}

// 3. Render Product Cards
function renderProducts() {
  const filtered = currentCategory === 'all'
    ? allProducts
    : allProducts.filter(p => p.category === currentCategory);

  if (filtered.length === 0) {
    productGrid.innerHTML = '<div class="loading-state"><p>Ushbu bo\'limda mahsulotlar mavjud emas.</p></div>';
    return;
  }

  productGrid.innerHTML = filtered.map(prod => {
    const inCart = cart[prod.id];
    const qty = inCart ? inCart.quantity : 0;

    return `
      <div class="product-card" data-id="${prod.id}">
        <div class="product-img-wrap">
          <img src="${prod.image_url}" alt="${prod.name}" class="product-img" loading="lazy">
        </div>
        <div class="product-details">
          <div>
            <div class="product-title-row">
              <h3 class="product-name">${prod.name}</h3>
              ${prod.weight_or_size ? `<span class="product-size">${prod.weight_or_size}</span>` : ''}
            </div>
            <p class="product-desc">${prod.description || ''}</p>
          </div>
          <div class="product-action-row">
            <span class="product-price">${formatSum(prod.price)}</span>
            <div class="action-controls" data-id="${prod.id}">
              ${qty > 0 ? renderStepper(prod.id, qty) : `<button class="btn-add-item" onclick="addToCart(${prod.id})">+ Qo'shish</button>`}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderStepper(id, qty) {
  return `
    <div class="stepper">
      <button class="stepper-btn" onclick="updateQuantity(${id}, -1)">−</button>
      <span class="stepper-value">${qty}</span>
      <button class="stepper-btn" onclick="updateQuantity(${id}, 1)">+</button>
    </div>
  `;
}

// 4. Cart Logic
window.addToCart = function(productId) {
  triggerHaptic('light');
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  if (!cart[productId]) {
    cart[productId] = { product, quantity: 1 };
  } else {
    cart[productId].quantity += 1;
  }

  updateCartState();
  updateProductCardAction(productId);
};

window.updateQuantity = function(productId, delta) {
  triggerHaptic('light');
  if (!cart[productId]) return;

  cart[productId].quantity += delta;
  if (cart[productId].quantity <= 0) {
    delete cart[productId];
  }

  updateCartState();
  updateProductCardAction(productId);
};

function updateProductCardAction(productId) {
  const controls = document.querySelector(`.action-controls[data-id="${productId}"]`);
  if (!controls) return;

  const item = cart[productId];
  if (item && item.quantity > 0) {
    controls.innerHTML = renderStepper(productId, item.quantity);
  } else {
    controls.innerHTML = `<button class="btn-add-item" onclick="addToCart(${productId})">+ Qo'shish</button>`;
  }
}

function updateCartState() {
  const items = Object.values(cart);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalSum = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  if (totalCount > 0) {
    floatingCartBar.classList.remove('hidden');
    cartCountBadge.textContent = totalCount;
    cartBarTotal.textContent = formatSum(totalSum);
  } else {
    floatingCartBar.classList.add('hidden');
    closeCheckoutModal();
  }
}

// 5. Category Navigation
categoryNav.addEventListener('click', (e) => {
  const btn = e.target.closest('.cat-pill');
  if (!btn) return;
  triggerHaptic('light');

  categoryNav.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  currentCategory = btn.dataset.category;
  renderProducts();
});

// 6. Checkout Drawer Modal
function openCheckoutModal() {
  triggerHaptic('medium');
  const items = Object.values(cart);
  if (items.length === 0) return;

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalSum = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  summaryItemsCount.textContent = `${totalCount} dona`;
  summaryTotalSum.textContent = formatSum(totalSum);
  submitBtnSum.textContent = formatSum(totalSum);

  // Render receipt items
  orderItemsList.innerHTML = items.map(item => `
    <div class="summary-item-row">
      <span class="summary-item-name">
        ${item.product.name}
        <span class="summary-item-count">× ${item.quantity}</span>
      </span>
      <span class="summary-item-price">${formatSum(item.product.price * item.quantity)}</span>
    </div>
  `).join('');

  checkoutModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCheckoutModal() {
  checkoutModal.classList.remove('active');
  document.body.style.overflow = '';
}

openCheckoutBtn.addEventListener('click', openCheckoutModal);
modalBackdrop.addEventListener('click', closeCheckoutModal);
closeModalBtn.addEventListener('click', closeCheckoutModal);

// Payment Selector Styling
document.querySelectorAll('.payment-option').forEach(option => {
  option.addEventListener('click', () => {
    triggerHaptic('light');
    document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');
  });
});

// Geolocation helper
btnGeolocate.addEventListener('click', () => {
  triggerHaptic('light');
  if (!navigator.geolocation) {
    alert('Geolokatsiya brauzeringizda qo\'llab-quvvatlanmaydi.');
    return;
  }

  btnGeolocate.textContent = 'Aniqlanmoqda...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const coordsText = `Koordinatalar: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      customerAddressInput.value = customerAddressInput.value
        ? `${customerAddressInput.value} (${coordsText})`
        : coordsText;
      btnGeolocate.textContent = 'Joylashuv olindi';
      triggerHaptic('success');
    },
    (err) => {
      btnGeolocate.textContent = 'Joylashuvimni olish';
      alert('Joylashuvni aniqlab bo\'lmadi. Iltimos manzilni qo\'lda kiriting.');
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
});

// 7. Form Submission & Create Order
orderForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  triggerHaptic('medium');

  const items = Object.values(cart).map(i => ({
    id: i.product.id,
    name: i.product.name,
    price: i.product.price,
    quantity: i.quantity
  }));

  if (items.length === 0) {
    alert('Savatchada mahsulot yo\'q!');
    return;
  }

  const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cash';

  const payload = {
    customer_name: document.getElementById('customerName').value.trim(),
    customer_phone: document.getElementById('customerPhone').value.trim(),
    customer_address: document.getElementById('customerAddress').value.trim(),
    payment_method: selectedPayment,
    notes: document.getElementById('orderNotes').value.trim(),
    items: items,
    telegram_user_id: tg?.initDataUnsafe?.user?.id || null,
    telegram_username: tg?.initDataUnsafe?.user?.username || null
  };

  // Disable button while processing
  submitOrderBtn.disabled = true;
  document.getElementById('submitBtnText').textContent = 'QABUL QILINMOQDA...';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (result.ok && result.data) {
      triggerHaptic('success');
      
      // Close checkout drawer
      closeCheckoutModal();

      // Show Success Modal
      successOrderNumber.textContent = `#${result.data.order_number}`;
      successModal.classList.remove('hidden');

      // Clear cart
      cart = {};
      updateCartState();
      renderProducts();
    } else {
      triggerHaptic('error');
      alert(result.error || 'Buyurtma berishda xatolik yuz berdi');
    }
  } catch (err) {
    triggerHaptic('error');
    console.error('Submit error:', err);
    alert('Tarmoq xatosi. Iltimos qayta urinib ko\'ring.');
  } finally {
    submitOrderBtn.disabled = false;
    document.getElementById('submitBtnText').textContent = 'BUYURTMANI TASDIQLASH';
  }
});

// Success Done Button
successDoneBtn.addEventListener('click', () => {
  triggerHaptic('light');
  successModal.classList.add('hidden');
  if (tg?.close) {
    // Optionally close webapp or keep in menu
  }
});

// Bootstrapping
document.addEventListener('DOMContentLoaded', () => {
  prefillUserData();
  loadProducts();
});

