const orderState = {
  menu: null,
  prices: null,
  selected: new Map(),
  deliverySelected: false
};

const formatCurrency = (value) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
}).format(value);

function getPriceByKey(key) {
  return orderState.prices.items[key]?.basePrice ?? 0;
}

function getAdjustmentByKey(key, label) {
  const priceDef = orderState.prices.items[key];
  if (!priceDef || !priceDef.adjustments) return 0;
  const match = priceDef.adjustments.find((item) => item.label === label);
  return match ? match.value : 0;
}

function getMenuItemById(id) {
  for (const category of orderState.menu.categories) {
    const found = category.items.find((item) => item.id === id);
    if (found) return found;
  }
  return null;
}

function renderCategorySelection(category, container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'item-selector';

  const list = category.items.map((item) => {
    const itemPrice = getPriceByKey(item.priceKey);
    const baseLabel = item.pricing && item.pricing.options ? `${formatCurrency(itemPrice)} base` : formatCurrency(itemPrice);

    const optionMarkup = item.pricing && item.pricing.options
      ? item.pricing.options.map((option) => `
        <option value="${option.label}">${option.label} (+${formatCurrency(option.adjustment)})</option>
      `).join('')
      : '';

    return `
      <div class="checkbox-row">
        <label>
          <input type="checkbox" data-item-id="${item.id}" data-category="${category.id}" />
          ${item.name}
        </label>
        <strong>${baseLabel}</strong>
      </div>
      ${optionMarkup ? `
        <div class="hidden" data-adjustment-wrapper="${item.id}">
          <label for="${item.id}-adjustment">Choose option</label>
          <select data-item-adjustment="${item.id}">
            ${optionMarkup}
          </select>
        </div>
      ` : ''}
    `;
  }).join('');

  wrapper.innerHTML = `
    <h3>${category.name}</h3>
    ${list}
  `;
  container.appendChild(wrapper);
}

function renderOrderOptions() {
  const container = document.querySelector('[data-order-categories]');
  if (!container || !orderState.menu) return;

  container.innerHTML = '';
  orderState.menu.categories.forEach((category) => {
    renderCategorySelection(category, container);
  });

  bindSelectionEvents();
}

function bindSelectionEvents() {
  document.querySelectorAll('[data-item-id]').forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      const itemId = event.target.dataset.itemId;
      const wrapper = document.querySelector(`[data-adjustment-wrapper="${itemId}"]`);
      if (wrapper) {
        wrapper.classList.toggle('hidden', !event.target.checked);
      }

      if (event.target.checked) {
        const item = getMenuItemById(itemId);
        const adjustment = document.querySelector(`[data-item-adjustment="${itemId}"]`);
        const selectedAdjustment = adjustment ? adjustment.value : null;
        orderState.selected.set(itemId, {
          item,
          adjustment: selectedAdjustment,
          quantity: 1
        });
      } else {
        orderState.selected.delete(itemId);
      }

      updateSummary();
    });
  });

  document.querySelectorAll('[data-item-adjustment]').forEach((select) => {
    select.addEventListener('change', (event) => {
      const itemId = event.target.dataset.itemAdjustment;
      const current = orderState.selected.get(itemId);
      if (current) {
        current.adjustment = event.target.value;
        updateSummary();
      }
    });
  });

  document.querySelector('[data-delivery-toggle]').addEventListener('change', (event) => {
    orderState.deliverySelected = event.target.checked;
    updateSummary();
  });
}

function calculateItemTotal(itemId, selectedAdjustment) {
  const item = getMenuItemById(itemId);
  const basePrice = getPriceByKey(item.priceKey);
  const adjustmentValue = selectedAdjustment ? getAdjustmentByKey(item.priceKey, selectedAdjustment) : 0;
  return basePrice + adjustmentValue;
}

function updateSummary() {
  const summaryList = document.querySelector('[data-summary-list]');
  const totalOutput = document.querySelector('[data-order-total]');
  const deliveryOutput = document.querySelector('[data-delivery-total]');

  if (!summaryList || !totalOutput || !deliveryOutput) return;

  let subtotal = 0;
  const rows = [];

  orderState.selected.forEach((record, itemId) => {
    const item = record.item;
    const itemTotal = calculateItemTotal(itemId, record.adjustment);
    subtotal += itemTotal;
    rows.push(`
      <li>
        <span>${item.name}${record.adjustment ? ` (${record.adjustment})` : ''}</span>
        <strong>${formatCurrency(itemTotal)}</strong>
      </li>
    `);
  });

  const deliveryFee = orderState.deliverySelected ? orderState.prices.deliveryFee : 0;
  const grandTotal = subtotal + deliveryFee;

  summaryList.innerHTML = rows.length ? rows.join('') : '<li><span>No items selected yet.</span></li>';
  deliveryOutput.textContent = formatCurrency(deliveryFee);
  totalOutput.textContent = formatCurrency(grandTotal);
}

function validateOrderForm() {
  const requiredFields = [
    'eventName',
    'guestCount',
    'eventDate',
    'contactName',
    'email',
    'confirmEmail',
    'phone',
    'eventAddress',
    'venueAddress'
  ];

  let valid = true;

  requiredFields.forEach((fieldName) => {
    const element = document.getElementById(fieldName);
    if (!element || !element.value.trim()) {
      valid = false;
      if (element) element.setCustomValidity('Required');
    }
  });

  const email = document.getElementById('email');
  const confirmEmail = document.getElementById('confirmEmail');
  if (email && confirmEmail && email.value.trim() !== confirmEmail.value.trim()) {
    valid = false;
    confirmEmail.setCustomValidity('Emails must match');
  }

  const guestCount = Number(document.getElementById('guestCount')?.value || 0);
  if (guestCount <= 0 || Number.isNaN(guestCount)) {
    valid = false;
    const input = document.getElementById('guestCount');
    if (input) input.setCustomValidity('Guest count must be greater than zero');
  }

  const eventDate = document.getElementById('eventDate');
  if (eventDate && eventDate.value) {
    const selectedDate = new Date(eventDate.value + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      valid = false;
      eventDate.setCustomValidity('Event date cannot be in the past');
    }
  }

  if (orderState.selected.size === 0) {
    valid = false;
    document.querySelector('[data-order-message]').textContent = 'Please select at least one menu item.';
  } else {
    document.querySelector('[data-order-message]').textContent = '';
  }

  return valid;
}

async function initializeOrderPage() {
  const [menuResponse, pricesResponse] = await Promise.all([
    fetch('data/menu.json'),
    fetch('data/prices.json')
  ]);

  orderState.menu = await menuResponse.json();
  orderState.prices = await pricesResponse.json();

  renderOrderOptions();
  updateSummary();

  const form = document.getElementById('order-form');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (validateOrderForm()) {
        document.querySelector('[data-order-confirmation]').classList.remove('hidden');
        const summary = document.querySelector('[data-order-summary-text]');
        const selected = Array.from(orderState.selected.values()).map((entry) => `${entry.item.name}${entry.adjustment ? ` (${entry.adjustment})` : ''}`);
        summary.textContent = selected.join(', ') || 'No items selected';
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', initializeOrderPage);
