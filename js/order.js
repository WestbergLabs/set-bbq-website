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

function getMenuItemById(id) {
  for (const category of orderState.menu.categories) {
    const found = category.items.find((item) => item.id === id);
    if (found) return found;
  }
  return null;
}

function makeQuantityInput(itemId, optionKey = '') {
  const key = optionKey ? `${itemId}--${optionKey}` : itemId;
  return `<input class="item-quantity" type="number" min="0" step="1" value="" inputmode="numeric" aria-label="Quantity" data-quantity-key="${key}" data-item-id="${itemId}" data-option-key="${optionKey}" />`;
}

function renderCategorySelection(category, container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'item-selector';

  const list = category.items.map((item) => {
    const itemPrice = getPriceByKey(item.priceKey);
    const pricingOptions = item.pricing?.options ?? [];
    const orderOptions = item.orderOptions ?? [];
    const hasOptions = pricingOptions.length > 0 || orderOptions.length > 0;

    if (hasOptions) {
      const optionRows = (pricingOptions.length ? pricingOptions : orderOptions.map((label) => ({ label, adjustment: 0 })))
        .map((option) => {
          const price = itemPrice + (option.adjustment ?? 0);
          return `<div class="order-option-row" data-option-row="${item.id}" hidden>
            <span><strong>${option.label}</strong></span>
            <div class="option-actions"><span class="option-price">${formatCurrency(price)}</span><label class="quantity-control">Qty ${makeQuantityInput(item.id, option.label)}</label></div>
          </div>`;
        }).join('');

      return `<div class="order-item" data-order-item="${item.id}" data-has-options="true">
        <div class="order-item-header">
          <div>
            <div class="order-item-name">${item.name}</div>
            <div class="order-item-meta">${item.description} · ${item.unit}</div>
          </div>
          <div class="item-actions"><span class="order-item-price">Starting at ${formatCurrency(itemPrice)}</span><label class="quantity-control">Qty ${makeQuantityInput(item.id)}</label></div>
        </div>
        <div class="order-options" data-options-container="${item.id}" hidden>${optionRows}</div>
        <div class="option-validation" data-option-validation="${item.id}" aria-live="polite"></div>
      </div>`;
    }

    return `<div class="order-item" data-order-item="${item.id}">
      <div class="order-item-header">
        <div>
          <div class="order-item-name">${item.name}</div>
          <div class="order-item-meta">${item.description} · ${item.unit}</div>
        </div>
        <div class="item-actions"><div class="order-item-price">${formatCurrency(itemPrice)}</div><label class="quantity-control">Qty ${makeQuantityInput(item.id)}</label></div>
      </div>
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

function getOptionDefinitions(item) {
  if (item.pricing?.options?.length) return item.pricing.options;
  return (item.orderOptions ?? []).map((label) => ({ label, adjustment: 0 }));
}

function getOptionQuantity(itemId, optionLabel) {
  return orderState.selected.get(`${itemId}--${optionLabel}`)?.quantity ?? 0;
}

function getMainQuantity(itemId) {
  return orderState.selected.get(itemId)?.quantity ?? 0;
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

  updateOptionVisibility(itemId);
  updateSummary();
}

function updateOptionVisibility(itemId) {
  const item = getMenuItemById(itemId);
  const mainQuantity = getMainQuantity(itemId);
  const container = document.querySelector(`[data-options-container="${itemId}"]`);
  const validation = document.querySelector(`[data-option-validation="${itemId}"]`);

  if (!container || !validation) return;

  const showOptions = mainQuantity > 0;
  container.hidden = !showOptions;
  container.querySelectorAll('[data-option-row]').forEach((row) => {
    row.hidden = !showOptions;
  });

  if (!showOptions) {
    validation.textContent = '';
    container.querySelectorAll('.item-quantity').forEach((input) => {
      input.value = '';
      orderState.selected.delete(input.dataset.quantityKey);
    });
    return;
  }

  const optionTotal = getOptionDefinitions(item).reduce(
    (sum, option) => sum + getOptionQuantity(itemId, option.label),
    0
  );

  if (optionTotal === mainQuantity) {
    validation.textContent = '✓ Options match quantity';
    validation.className = 'option-validation valid';
  } else {
    const difference = mainQuantity - optionTotal;
    validation.textContent = difference > 0
      ? `Choose ${difference} more`
      : `Reduce options by ${Math.abs(difference)}`;
    validation.className = 'option-validation invalid';
  }
}

function bindSelectionEvents() {
  document.querySelectorAll('[data-quantity-key]').forEach((input) => {
    input.addEventListener('input', (event) => {
      event.target.value = event.target.value.replace(/[^0-9]/g, '');
      const quantity = Math.max(0, Number.parseInt(event.target.value || '0', 10));
      updateRecord(event.target.dataset.itemId, event.target.dataset.optionKey, quantity);
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

function hasValidOptions() {
  for (const category of orderState.menu.categories) {
    for (const item of category.items) {
      const definitions = getOptionDefinitions(item);
      if (!definitions.length) continue;
      const mainQuantity = getMainQuantity(item.id);
      if (mainQuantity <= 0) continue;
      const optionTotal = definitions.reduce(
        (sum, option) => sum + getOptionQuantity(item.id, option.label),
        0
      );
      if (optionTotal !== mainQuantity) return false;
    }
  }
  return true;
}

function updateSummary() {
  const summaryList = document.querySelector('[data-summary-list]');
  const totalOutput = document.querySelector('[data-order-total]');
  const deliveryOutput = document.querySelector('[data-delivery-total]');
  if (!summaryList || !totalOutput || !deliveryOutput) return;

  let subtotal = 0;
  const rows = [];

  orderState.selected.forEach((record) => {
    if (!record.option && getOptionDefinitions(record.item).length) return;

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
    } else {
      element.setCustomValidity('');
    }
  });

  const email = document.getElementById('email');
  const confirmEmail = document.getElementById('confirmEmail');
  if (email && confirmEmail) {
    confirmEmail.setCustomValidity(email.value.trim() !== confirmEmail.value.trim() ? 'Emails must match' : '');
    if (confirmEmail.validationMessage) valid = false;
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
    eventDate.setCustomValidity(selectedDate < today ? 'Event date cannot be in the past' : '');
    if (eventDate.validationMessage) valid = false;
  }

  const message = document.querySelector('[data-order-message]');
  if (orderState.selected.size === 0) {
    valid = false;
    if (message) message.textContent = 'Please enter a quantity for at least one menu item.';
  } else if (!hasValidOptions()) {
    valid = false;
    if (message) message.textContent = 'Please make sure each item with options has option quantities matching its total quantity.';
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
          .filter((entry) => entry.option || !getOptionDefinitions(entry.item).length)
          .map((entry) => `${entry.item.name}${entry.option ? ` (${entry.option})` : ''} × ${entry.quantity}`)
          .join(', ');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', initializeOrderPage);
