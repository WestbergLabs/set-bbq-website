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

function makeQuantityInput(itemId, optionKey = '') {
  const key = optionKey ? `${itemId}--${optionKey}` : itemId;
  return `<input class="item-quantity" type="number" min="0" step="1" value="0" inputmode="numeric" aria-label="Quantity" data-quantity-key="${key}" data-item-id="${itemId}" data-option-key="${optionKey}" />`;
}

function renderCategorySelection(category, container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'item-selector';

  const list = category.items.map((item) => {
    const itemPrice = getPriceByKey(item.priceKey);
    const hasPricingOptions = item.pricing?.options?.length;
    const hasOrderOptions = item.orderOptions?.length;
    const priceText = hasPricingOptions ? `Starting at ${formatCurrency(itemPrice)}` : formatCurrency(itemPrice);

    if (hasPricingOptions || hasOrderOptions) {
      const options = hasPricingOptions
        ? item.pricing.options.map((option) => {
            const price = itemPrice + option.adjustment;
            return `<div class="order-option-row">
              <span><strong>${option.label}</strong> <span class="option-price">${formatCurrency(price)}</span></span>
              <label class="quantity-control">Qty ${makeQuantityInput(item.id, option.label)}</label>
            </div>`;
          }).join('')
        : item.orderOptions.map((option) => `<div class="order-option-row">
            <span><strong>${option}</strong></span>
            <label class="quantity-control">Qty ${makeQuantityInput(item.id, option)}</label>
          </div>`).join('');

      return `<div class="order-item">
        <div class="order-item-header">
          <div>
            <div class="order-item-name">${item.name}</div>
            <div class="order-item-meta">${item.description} · ${item.unit} · ${priceText}</div>
          </div>
        </div>
        <div class="order-options">${options}</div>
      </div>`;
    }

    return `<div class="order-item">
      <div class="order-item-header">
        <div>
          <div class="order-item-name">${item.name}</div>
          <div class="order-item-meta">${item.description} · ${item.unit}</div>
        </div>
        <div class="order-item-price">${formatCurrency(itemPrice)}</div>
      </div>
      <label class="quantity-control">Qty ${makeQuantityInput(item.id)}</label>
    </div>`;
  }).join('');

  wrapper.innerHTML = `<h3>${category.name}</h3>${list}`;
  container.appendChild(wrapper);
}

function renderOrderOptions() {
  const container = document.querySelector('[data-order-categories]');
  if (!container || !orderState.menu) return;
  container.innerHTML = '';
  orderState.menu.categories.forEach((category) => renderCategorySelection(category, container));
  bindSelectionEvents();
}

function updateRecord(itemId, optionKey, quantity) {
  const item = getMenuItemById(itemId);
  const key = optionKey ? `${itemId}--${optionKey}` : itemId;
  if (quantity > 0) {
    const adjustment = item.pricing?.options?.find((o) => o.label === optionKey)?.adjustment ?? 0;
    orderState.selected.set(key, { item, option: optionKey || null, quantity, adjustment });
  } else {
    orderState.selected.delete(key);
  }
  updateSummary();
}

function bindSelectionEvents() {
  document.querySelectorAll('[data-quantity-key]').forEach((input) => {
    input.addEventListener('input', (event) => {
      event.target.value = event.target.value.replace(/[^0-9]/g, '');
      const quantity = Math.max(0, Number.parseInt(event.target.value || '0', 10));
      updateRecord(event.target.dataset.itemId, event.target.dataset.optionKey, quantity);
    });
    input.addEventListener('blur', (event) => {
      if (event.target.value === '') event.target.value = '0';
    });
  });

  const deliveryToggle = document.querySelector('[data-delivery-toggle]');
  if (deliveryToggle) {
    deliveryToggle.addEventListener('change', (event) => {
      orderState.deliverySelected = event.target.checked;
      updateSummary();
    });
  }
}

function updateSummary() {
  const summaryList = document.querySelector('[data-summary-list]');
  const totalOutput = document.querySelector('[data-order-total]');
  const deliveryOutput = document.querySelector('[data-delivery-total]');
  if (!summaryList || !totalOutput || !deliveryOutput) return;

  let subtotal = 0;
  const rows = [];

  orderState.selected.forEach((record) => {
    const unitPrice = getPriceByKey(record.item.priceKey) + record.adjustment;
    const lineTotal = unitPrice * record.quantity;
    subtotal += lineTotal;
    const optionText = record.option ? ` — ${record.option}` : '';
    rows.push(`<li><span>${record.item.name}${optionText} × ${record.quantity}</span><strong>${formatCurrency(lineTotal)}</strong></li>`);
  });

  const deliveryFee = orderState.deliverySelected ? orderState.prices.deliveryFee : 0;
  summaryList.innerHTML = rows.length ? rows.join('') : '<li><span>No items selected yet.</span></li>';
  deliveryOutput.textContent = formatCurrency(deliveryFee);
  totalOutput.textContent = formatCurrency(subtotal + deliveryFee);
}

function validateOrderForm() {
  const requiredFields = ['eventName', 'guestCount', 'eventDate', 'contactName', 'email', 'confirmEmail', 'phone', 'eventAddress'];
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
  if (eventDate?.value) {
    const selectedDate = new Date(eventDate.value + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      valid = false;
      eventDate.setCustomValidity('Event date cannot be in the past');
    }
  }

  const message = document.querySelector('[data-order-message]');
  if (orderState.selected.size === 0) {
    valid = false;
    if (message) message.textContent = 'Please enter a quantity for at least one menu item.';
  } else if (message) {
    message.textContent = '';
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
        summary.textContent = Array.from(orderState.selected.values())
          .map((entry) => `${entry.item.name}${entry.option ? ` (${entry.option})` : ''} × ${entry.quantity}`)
          .join(', ');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', initializeOrderPage);
