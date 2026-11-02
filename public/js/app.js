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

// 1. Pre-fill user data from Telegram WebApp, localStorage & database
async function prefillUserData() {
  const nameInput = document.getElementById('customerName');
  const phoneInput = document.getElementById('customerPhone');

  const localName = localStorage.getItem('burger_user_name');
  const localPhone = localStorage.getItem('burger_user_phone');

  if (localName && nameInput && !nameInput.value) nameInput.value = localName;
  if (localPhone && phoneInput && !phoneInput.value) phoneInput.value = localPhone;

  if (!tg?.initDataUnsafe?.user) return;
  const user = tg.initDataUnsafe.user;
  if (user?.id) {
    localStorage.setItem('burger_user_tid', user.id);
  }

  if (nameInput && !nameInput.value) {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    nameInput.value = fullName;
    localStorage.setItem('burger_user_name', fullName);
  }

  // Fetch saved user data from server if exists
  try {
    const res = await fetch(`/api/user/${user.id}`);
    const data = await res.json();
    if (data.ok && data.data) {
      if (data.data.phone_number && phoneInput) {
        phoneInput.value = data.data.phone_number;
        localStorage.setItem('burger_user_phone', data.data.phone_number);
      }
      if (data.data.first_name && nameInput) {
        nameInput.value = data.data.first_name;
        localStorage.setItem('burger_user_name', data.data.first_name);
      }
    }
  } catch (e) {
    // Ignore fetch error
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
    telegram_user_id: tg?.initDataUnsafe?.user?.id || localStorage.getItem('burger_user_tid') || null,
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

      localStorage.setItem('burger_user_phone', payload.customer_phone);
      localStorage.setItem('burger_user_name', payload.customer_name);

      // Save order to user's local order history
      try {
        const myOrders = JSON.parse(localStorage.getItem('burger_my_orders') || '[]');
        myOrders.unshift(result.data);
        localStorage.setItem('burger_my_orders', JSON.stringify(myOrders.slice(0, 30)));
      } catch (e) {}
      
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
});

// ==========================================================================
// Account & Order History Drawer
// ==========================================================================
const accountModal = document.getElementById('accountModal');
const accountBackdrop = document.getElementById('accountBackdrop');
const openAccountBtn = document.getElementById('openAccountBtn');
const closeAccountBtn = document.getElementById('closeAccountBtn');

const profileAvatar = document.getElementById('profileAvatar');
const profileName = document.getElementById('profileName');
const profileUsername = document.getElementById('profileUsername');
const profilePhone = document.getElementById('profilePhone');
const btnEditProfile = document.getElementById('btnEditProfile');
const accountPhoneForm = document.getElementById('accountPhoneForm');
const accInputName = document.getElementById('accInputName');
const accInputPhone = document.getElementById('accInputPhone');
const btnCancelEdit = document.getElementById('btnCancelEdit');
const accountOrdersList = document.getElementById('accountOrdersList');

let orderPollInterval = null;

function openAccountModal() {
  triggerHaptic('medium');
  loadAccountDetails();
  accountModal.classList.add('active');
  document.body.style.overflow = 'hidden';

  if (!orderPollInterval) {
    orderPollInterval = setInterval(() => {
      const localPhone = localStorage.getItem('burger_user_phone');
      const user = tg?.initDataUnsafe?.user;
      const tid = user?.id || localStorage.getItem('burger_user_tid');
      loadUserOrders(localPhone, tid);
    }, 4000);
  }
}

function closeAccountModal() {
  accountModal.classList.remove('active');
  document.body.style.overflow = '';
  if (orderPollInterval) {
    clearInterval(orderPollInterval);
    orderPollInterval = null;
  }
}

if (openAccountBtn) openAccountBtn.addEventListener('click', openAccountModal);
if (closeAccountBtn) closeAccountBtn.addEventListener('click', closeAccountModal);
if (accountBackdrop) accountBackdrop.addEventListener('click', closeAccountModal);

if (btnEditProfile) {
  btnEditProfile.addEventListener('click', () => {
    triggerHaptic('light');
    accountPhoneForm.classList.remove('hidden');
    btnCancelEdit.classList.remove('hidden');
    accInputPhone.focus();
  });
}

if (btnCancelEdit) {
  btnCancelEdit.addEventListener('click', () => {
    triggerHaptic('light');
    accountPhoneForm.classList.add('hidden');
  });
}

// In-app Phone Account Form Submit
if (accountPhoneForm) {
  accountPhoneForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    triggerHaptic('medium');

    const phone = accInputPhone.value.trim();
    const name = accInputName.value.trim() || 'Mijoz';
    const user = tg?.initDataUnsafe?.user;

    try {
      const res = await fetch('/api/user/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: user?.id || localStorage.getItem('burger_user_tid') || null,
          phone_number: phone,
          first_name: name,
          username: user?.username || null
        })
      });

      const result = await res.json();
      if (result.ok && result.data) {
        triggerHaptic('success');
        localStorage.setItem('burger_user_phone', phone);
        localStorage.setItem('burger_user_name', name);
        if (result.data.telegram_id) {
          localStorage.setItem('burger_user_tid', result.data.telegram_id);
        }

        // Pre-fill checkout fields
        const nameInput = document.getElementById('customerName');
        const phoneInput = document.getElementById('customerPhone');
        if (nameInput) nameInput.value = name;
        if (phoneInput) phoneInput.value = phone;

        // Hide form and update card
        accountPhoneForm.classList.add('hidden');
        profileName.textContent = name;
        profilePhone.textContent = `📞 ${phone}`;

        // Load orders immediately
        loadUserOrders(phone, user?.id);
      } else {
        alert(result.error || 'Saqlashda xatolik yuz berdi');
      }
    } catch (err) {
      console.error('Account save error:', err);
      alert('Tarmoq xatosi.');
    }
  });
}

async function loadAccountDetails() {
  const user = tg?.initDataUnsafe?.user;
  const localName = localStorage.getItem('burger_user_name');
  const localPhone = localStorage.getItem('burger_user_phone');

  const userName = user 
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') 
    : (localName || 'Hurmatli mijoz');
  const userHandle = user?.username ? `@${user.username}` : '';
  const initial = (userName || 'M')[0].toUpperCase();

  profileAvatar.textContent = initial;
  profileName.textContent = userName;
  profileUsername.textContent = userHandle || 'Aktiv mijoz';

  if (accInputName) accInputName.value = userName;

  let currentPhone = localPhone || '';
  const telegramId = user?.id || localStorage.getItem('burger_user_tid');

  if (telegramId) {
    try {
      const userRes = await fetch(`/api/user/${telegramId}`);
      const userData = await userRes.json();
      if (userData.ok && userData.data?.phone_number) {
        currentPhone = userData.data.phone_number;
        localStorage.setItem('burger_user_phone', currentPhone);
      }
    } catch (e) {}
  }

  if (currentPhone) {
    profilePhone.textContent = `📞 ${currentPhone}`;
    if (accInputPhone) accInputPhone.value = currentPhone;
    accountPhoneForm.classList.add('hidden');
  } else {
    profilePhone.textContent = 'Telefon kiritilmagan';
    // If phone is missing, open input form immediately
    accountPhoneForm.classList.remove('hidden');
    btnCancelEdit.classList.add('hidden');
  }

  loadUserOrders(currentPhone, telegramId);
}

async function loadUserOrders(phone, telegramId) {
  let localOrders = [];
  try {
    localOrders = JSON.parse(localStorage.getItem('burger_my_orders') || '[]');
  } catch (e) {}

  // If local orders exist, show them instantly!
  if (localOrders.length > 0) {
    renderAccountOrders(localOrders);
  } else {
    accountOrdersList.innerHTML = '<div class="loading-state"><p>Buyurtmalar yuklanmoqda...</p></div>';
  }

  let serverOrders = [];

  // 1. Try by phone
  if (phone) {
    try {
      const clean = phone.replace(/[^0-9]/g, '');
      const res = await fetch(`/api/orders/by-phone/${clean}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.data) && data.data.length > 0) {
        serverOrders = data.data;
      }
    } catch (e) {}
  }

  // 2. Try by telegram ID
  if (serverOrders.length === 0 && telegramId) {
    try {
      const res = await fetch(`/api/user/${telegramId}/orders`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.data) && data.data.length > 0) {
        serverOrders = data.data;
      }
    } catch (e) {}
  }

  // Combine and deduplicate orders by order_number
  const orderMap = new Map();
  serverOrders.forEach(o => orderMap.set(o.order_number, o));
  localOrders.forEach(o => {
    if (!orderMap.has(o.order_number)) {
      orderMap.set(o.order_number, o);
    }
  });

  const allCombinedOrders = Array.from(orderMap.values());

  if (allCombinedOrders.length > 0) {
    localStorage.setItem('burger_my_orders', JSON.stringify(allCombinedOrders.slice(0, 30)));
    renderAccountOrders(allCombinedOrders);

    // Refresh live status from server for active orders
    const activeOrders = allCombinedOrders.filter(o => o.order_status !== 'delivered' && o.order_status !== 'cancelled');
    if (activeOrders.length > 0) {
      Promise.allSettled(
        activeOrders.map(ao => fetch(`/api/orders/${ao.order_number}`).then(r => r.json()))
      ).then(results => {
        let changed = false;
        results.forEach((res, idx) => {
          if (res.status === 'fulfilled' && res.value?.ok) {
            const fresh = res.value.data || (res.value.status ? { order_number: activeOrders[idx].order_number, order_status: res.value.status } : null);
            if (fresh) {
              const target = allCombinedOrders.find(o => o.order_number === fresh.order_number);
              if (target && fresh.order_status && target.order_status !== fresh.order_status) {
                target.order_status = fresh.order_status;
                changed = true;
              }
            }
          }
        });
        if (changed) {
          localStorage.setItem('burger_my_orders', JSON.stringify(allCombinedOrders.slice(0, 30)));
          renderAccountOrders(allCombinedOrders);
        }
      });
    }
  } else {
    accountOrdersList.innerHTML = '<div class="loading-state"><p>Sizda hali buyurtmalar mavjud emas.</p></div>';
  }
}

function renderAccountOrders(orders) {
  accountOrdersList.innerHTML = orders.map(o => {
    let statusClass = o.order_status || 'new';
    let statusText = '🟡 Kutilmoqda';
    if (statusClass === 'accepted') statusText = '👨‍🍳 Tayyorlanmoqda';
    if (statusClass === 'delivering') statusText = '🛵 Yetkazilmoqda';
    if (statusClass === 'delivered') statusText = '🏁 Yetkazildi';
    if (statusClass === 'cancelled') statusText = '❌ Bekor qilindi';

    const itemsSummary = (o.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ');
    const dateStr = new Date(o.created_at).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    return `
      <div class="history-card">
        <div class="history-card-header">
          <span class="history-order-num">#${o.order_number}</span>
          <span class="history-status-badge ${statusClass}">${statusText}</span>
        </div>
        <p class="history-items">${itemsSummary}</p>
        <div class="history-total-row">
          <span style="font-size: 11px; color: var(--muted);">${dateStr}</span>
          <span class="history-total-price">${formatSum(o.total_amount)}</span>
        </div>
      </div>
    `;
  }).join('');
}

// Bootstrapping
document.addEventListener('DOMContentLoaded', () => {
  prefillUserData();
  loadProducts();
});

