const orderState = {
  menu: null,
  prices: null,
  selected: new Map(),
  optionModes: new Map(),
  optionSplits: new Map(),
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

function getOptionDefinitions(item) {
  if (item.pricing?.options?.length) return item.pricing.options;
  return (item.orderOptions ?? []).map((label) => ({ label, adjustment: 0 }));
}

function makeQuantityInput(itemId, optionKey = '') {
  const key = optionKey ? `${itemId}--${optionKey}` : itemId;
  return `<input class="item-quantity" type="number" min="0" step="1" value="" inputmode="numeric" aria-label="Quantity" data-quantity-key="${key}" data-item-id="${itemId}" data-option-key="${optionKey}" />`;
}

function optionPriceText(item, option) {
  const adjustment = option.adjustment ?? 0;
  const price = getPriceByKey(item.priceKey) + adjustment;
  return adjustment ? `+${formatCurrency(adjustment)}` : formatCurrency(price);
}

function renderCategorySelection(category, container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'item-selector';

  const list = category.items.map((item) => {
    const itemPrice = getPriceByKey(item.priceKey);
    const options = getOptionDefinitions(item);

    if (options.length) {
      const radioName = `option-${item.id}`;
      const optionRows = options.map((option, index) => `
        <label class="option-choice-row" data-option-row="${item.id}">
          <input type="radio" name="${radioName}" value="${option.label}" data-option-mode="single" data-option-item="${item.id}" data-option-key="${option.label}" />
          <span class="option-choice-label">${option.label}</span>
          <span class="option-price">${optionPriceText(item, option)}</span>
        </label>`).join('');

      return `<div class="order-item" data-order-item="${item.id}" data-has-options="true">
        <div class="order-item-header">
          <div>
            <div class="order-item-name">${item.name}</div>
            <div class="order-item-meta">${item.description} · ${item.unit}</div>
          </div>
          <div class="item-actions">
            <label class="quantity-control">Qty ${makeQuantityInput(item.id)}</label>
          </div>
        </div>
        <div class="order-options" data-options-container="${item.id}" hidden>
          <div class="option-prompt">How would you like them?</div>
          <div class="option-choice-list">
            ${optionRows}
            <label class="option-choice-row mix-choice">
              <input type="radio" name="${radioName}" value="__mix__" data-option-mode="mix" data-option-item="${item.id}" />
              <span class="option-choice-label">Mix options</span>
              <span class="option-price"></span>
            </label>
          </div>
          <div class="option-split-list" data-split-list="${item.id}" hidden>
            ${options.map((option) => `
              <div class="option-split-row">
                <span>${option.label}</span>
                <label class="quantity-control">Qty ${makeQuantityInput(item.id, option.label)}</label>
              </div>`).join('')}
          </div>
          <div class="option-validation" data-option-validation="${item.id}" aria-live="polite"></div>
        </div>
      </div>`;
    }

    return `<div class="order-item" data-order-item="${item.id}">
      <div class="order-item-header">
        <div>
          <div class="order-item-name">${item.name}</div>
          <div class="order-item-meta">${item.description} · ${item.unit}</div>
        </div>
        <div class="item-actions">
          <div class="order-item-price">${formatCurrency(itemPrice)}</div>
          <label class="quantity-control">Qty ${makeQuantityInput(item.id)}</label>
        </div>
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

function getMainQuantity(itemId) {
  return orderState.selected.get(itemId)?.quantity ?? 0;
}

function getOptionMode(itemId) {
  return orderState.optionModes.get(itemId) ?? null;
}

function setOptionMode(itemId, mode) {
  orderState.optionModes.set(itemId, mode);
  if (mode?.type !== 'mix') {
    const item = getMenuItemById(itemId);
    getOptionDefinitions(item).forEach((option) => {
      orderState.optionSplits.delete(`${itemId}--${option.label}`);
    });
    const splitList = document.querySelector(`[data-split-list="${itemId}"]`);
    if (splitList) {
      splitList.querySelectorAll('.item-quantity').forEach((input) => { input.value = ''; });
    }
  }
}

function updateMainQuantity(itemId, quantity) {
  const item = getMenuItemById(itemId);
  if (quantity > 0) {
    orderState.selected.set(itemId, { item, quantity });
  } else {
    orderState.selected.delete(itemId);
    orderState.optionModes.delete(itemId);
    getOptionDefinitions(item).forEach((option) => {
      orderState.optionSplits.delete(`${itemId}--${option.label}`);
    });
  }
  updateOptionVisibility(itemId);
  updateSummary();
}

function updateOptionVisibility(itemId) {
  const item = getMenuItemById(itemId);
  const mainQuantity = getMainQuantity(itemId);
  const container = document.querySelector(`[data-options-container="${itemId}"]`);
  const splitList = document.querySelector(`[data-split-list="${itemId}"]`);
  const validation = document.querySelector(`[data-option-validation="${itemId}"]`);
  if (!container || !splitList || !validation) return;

  container.hidden = mainQuantity <= 0;
  if (mainQuantity <= 0) {
    validation.textContent = '';
    splitList.hidden = true;
    container.querySelectorAll('input[type="radio"]').forEach((input) => { input.checked = false; });
    container.querySelectorAll('.item-quantity').forEach((input) => { input.value = ''; });
    return;
  }

  const mode = getOptionMode(itemId);
  const isMix = mode?.type === 'mix';
  splitList.hidden = !isMix;

  if (!mode) {
    validation.textContent = 'Choose one option or select Mix options.';
    validation.className = 'option-validation invalid';
    return;
  }

  if (!isMix) {
    validation.textContent = '';
    validation.className = 'option-validation';
    return;
  }

  const splitTotal = getOptionDefinitions(item).reduce(
    (sum, option) => sum + (orderState.optionSplits.get(`${itemId}--${option.label}`) ?? 0),
    0
  );

  if (splitTotal === mainQuantity) {
    validation.textContent = '';
    validation.className = 'option-validation';
  } else {
    const difference = mainQuantity - splitTotal;
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
      const itemId = event.target.dataset.itemId;
      const optionKey = event.target.dataset.optionKey;

      if (optionKey) {
        const key = `${itemId}--${optionKey}`;
        if (quantity > 0) orderState.optionSplits.set(key, quantity);
        else orderState.optionSplits.delete(key);
        updateOptionVisibility(itemId);
        updateSummary();
      } else {
        updateMainQuantity(itemId, quantity);
      }
    });
  });

  document.querySelectorAll('[data-option-mode]').forEach((input) => {
    input.addEventListener('change', (event) => {
      const itemId = event.target.dataset.optionItem;
      if (event.target.dataset.optionMode === 'mix') {
        setOptionMode(itemId, { type: 'mix' });
      } else {
        setOptionMode(itemId, { type: 'single', label: event.target.dataset.optionKey });
      }
      updateOptionVisibility(itemId);
      updateSummary();
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
      const options = getOptionDefinitions(item);
      if (!options.length) continue;
      const mainQuantity = getMainQuantity(item.id);
      if (mainQuantity <= 0) continue;

      const mode = getOptionMode(item.id);
      if (!mode) return false;

      if (mode.type === 'mix') {
        const splitTotal = options.reduce(
          (sum, option) => sum + (orderState.optionSplits.get(`${item.id}--${option.label}`) ?? 0),
          0
        );
        if (splitTotal !== mainQuantity) return false;
      }
    }
  }
  return true;
}

function getOptionRecord(item, optionLabel) {
  const option = getOptionDefinitions(item).find((entry) => entry.label === optionLabel);
  const adjustment = option?.adjustment ?? 0;
  const quantity = getMainQuantity(item.id);
  return {
    label: optionLabel,
    quantity,
    unitPrice: getPriceByKey(item.priceKey) + adjustment
  };
}

function updateSummary() {
  const summaryList = document.querySelector('[data-summary-list]');
  const totalOutput = document.querySelector('[data-order-total]');
  const deliveryOutput = document.querySelector('[data-delivery-total]');
  if (!summaryList || !totalOutput || !deliveryOutput) return;

  let subtotal = 0;
  const rows = [];

  orderState.selected.forEach((record) => {
    const options = getOptionDefinitions(record.item);

    if (!options.length) {
      const lineTotal = getPriceByKey(record.item.priceKey) * record.quantity;
      subtotal += lineTotal;
      rows.push(`<li><span>${record.item.name} × ${record.quantity}</span><strong>${formatCurrency(lineTotal)}</strong></li>`);
      return;
    }

    const mode = getOptionMode(record.item.id);
    if (!mode) return;

    if (mode.type === 'single') {
      const line = getOptionRecord(record.item, mode.label);
      const lineTotal = line.unitPrice * record.quantity;
      subtotal += lineTotal;
      rows.push(`<li><span>${record.item.name} — ${line.label} × ${record.quantity}</span><strong>${formatCurrency(lineTotal)}</strong></li>`);
    } else {
      options.forEach((option) => {
        const quantity = orderState.optionSplits.get(`${record.item.id}--${option.label}`) ?? 0;
        if (!quantity) return;
        const unitPrice = getPriceByKey(record.item.priceKey) + (option.adjustment ?? 0);
        const lineTotal = unitPrice * quantity;
        subtotal += lineTotal;
        rows.push(`<li><span>${record.item.name} — ${option.label} × ${quantity}</span><strong>${formatCurrency(lineTotal)}</strong></li>`);
      });
    }
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
    if (message) message.textContent = 'Please finish selecting the options for your items.';
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
          .flatMap((entry) => {
            const options = getOptionDefinitions(entry.item);
            const mode = getOptionMode(entry.item.id);
            if (!options.length) return [`${entry.item.name} × ${entry.quantity}`];
            if (mode?.type === 'single') return [`${entry.item.name} (${mode.label}) × ${entry.quantity}`];
            return options
              .map((option) => {
                const quantity = orderState.optionSplits.get(`${entry.item.id}--${option.label}`) ?? 0;
                return quantity ? `${entry.item.name} (${option.label}) × ${quantity}` : null;
              })
              .filter(Boolean);
          })
          .join(', ');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', initializeOrderPage);
