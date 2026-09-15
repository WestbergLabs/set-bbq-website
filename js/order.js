const orderState = {
  menu: null,
  prices: null,
  selected: new Map(),
  optionSelections: new Map(),
  optionSplits: new Map(),
  deliverySelected: false,
  submitting: false
};

const formatCurrency = (value) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
}).format(value);

function getPriceByKey(key) {
  return orderState.prices?.items?.[key]?.basePrice ?? 0;
}

function getMenuItemById(id) {
  for (const category of orderState.menu?.categories || []) {
    const found = category.items.find((item) => item.id === id);
    if (found) return found;
  }
  return null;
}

function getOptionGroups(item) {
  if (item.pricing?.groups?.length) return item.pricing.groups;
  const options = item.pricing?.options?.length
    ? item.pricing.options
    : (item.orderOptions ?? []).map((label) => ({ label, adjustment: 0 }));
  return options.length ? [{ label: 'Options', options }] : [];
}

function getOptionDefinitions(item) {
  return getOptionGroups(item).flatMap((group) => group.options || []);
}

function makeQuantityInput(itemId, optionKey = '') {
  const key = optionKey ? `${itemId}--${optionKey}` : itemId;
  return `<input class="item-quantity" type="number" min="0" step="1" value="" inputmode="numeric" aria-label="Quantity" data-quantity-key="${key}" data-item-id="${itemId}" data-option-key="${optionKey}" />`;
}

function optionPriceText(item, option) {
  const adjustment = option.adjustment ?? 0;
  return formatCurrency(getPriceByKey(item.priceKey) + adjustment);
}

function renderCategorySelection(category, container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'item-selector';

  const list = category.items.map((item) => {
    const itemPrice = getPriceByKey(item.priceKey);
    const groups = getOptionGroups(item);

    if (groups.length) {
      const groupHtml = groups.map((group, groupIndex) => {
        const options = group.options || [];
        const optionRows = options.map((option) => `
          <label class="option-choice-row" data-option-row="${item.id}">
            <input type="radio" class="option-radio" name="option-${item.id}-${groupIndex}" data-option-item="${item.id}" data-option-group="${groupIndex}" data-option-key="${option.label}" />
            <span class="option-choice-label">${option.label}</span>
            <span class="option-price">${Number(option.adjustment || 0) ? '+' + formatCurrency(option.adjustment) : ''}</span>
          </label>`).join('');

        return `
          <div class="option-group" data-option-group-container="${item.id}--${groupIndex}">
            <div class="option-group-label">${group.label || 'Options'}</div>
            <div class="option-choice-list">${optionRows}</div>
          </div>`;
      }).join('');

      return `<div class="order-item" data-order-item="${item.id}" data-has-options="true">
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
        <div class="order-options" data-options-container="${item.id}" hidden>
          <div class="option-prompt">Choose your selections:</div>
          ${groupHtml}
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
}function setOptionSelection(itemId, groupIndex, optionLabel) {
  const key = `${itemId}--${groupIndex}`;
  const selections = new Map(orderState.optionSelections.get(itemId) || []);
  selections.set(groupIndex, optionLabel);
  orderState.optionSelections.set(itemId, selections);
  updateOptionVisibility(itemId);
  updateSummary();
}function updateMainQuantity(itemId, quantity) {
  const item = getMenuItemById(itemId);
  if (!item) return;

  if (quantity > 0) {
    orderState.selected.set(itemId, { item, quantity });
  } else {
    orderState.selected.delete(itemId);
    orderState.optionSelections.delete(itemId);
  }

  updateOptionVisibility(itemId);
  updateSummary();
}function updateOptionVisibility(itemId) {
  const mainQuantity = getMainQuantity(itemId);
  const container = document.querySelector(`[data-options-container="${itemId}"]`);
  const validation = document.querySelector(`[data-option-validation="${itemId}"]`);
  if (!container || !validation) return;

  container.hidden = mainQuantity <= 0;
  if (mainQuantity <= 0) {
    validation.textContent = '';
    container.querySelectorAll('.option-radio').forEach((input) => { input.checked = false; });
    return;
  }

  const groups = getOptionGroups(getMenuItemById(itemId));
  const selections = getSelectedOptions(itemId);
  const complete = groups.every((_, index) => selections.has(index));

  validation.textContent = complete ? '' : 'Please select an option from each group.';
  validation.className = complete ? 'option-validation' : 'option-validation invalid';
}function hasValidOptions() {
  for (const category of orderState.menu.categories) {
    for (const item of category.items) {
      const groups = getOptionGroups(item);
      if (!groups.length) continue;
      const mainQuantity = getMainQuantity(item.id);
      if (mainQuantity <= 0) continue;

      const selections = getSelectedOptions(item.id);
      if (!groups.every((_, index) => selections.has(index))) return false;
    }
  }
  return true;
}function updateSummary() {
  const summaryList = document.querySelector('[data-summary-list]');
  const totalOutput = document.querySelector('[data-order-total]');
  const deliveryOutput = document.querySelector('[data-delivery-total]');
  if (!summaryList || !totalOutput || !deliveryOutput || !orderState.prices) return;

  let subtotal = 0;
  const rows = [];

  orderState.selected.forEach((record) => {
    const groups = getOptionGroups(record.item);
    const basePrice = getPriceByKey(record.item.priceKey);

    if (!groups.length) {
      const lineTotal = basePrice * record.quantity;
      subtotal += lineTotal;
      rows.push(`<li><span>${record.item.name} × ${record.quantity}</span><strong>${formatCurrency(lineTotal)}</strong></li>`);
      return;
    }

    const selections = getSelectedOptions(record.item.id);
    if (groups.every((_, index) => selections.has(index))) {
      let unitPrice = basePrice;
      const labels = [];
      groups.forEach((group, index) => {
        const label = selections.get(index);
        const option = group.options.find((entry) => entry.label === label);
        unitPrice += Number(option?.adjustment || 0);
        labels.push(`${group.label}: ${label}`);
      });
      const lineTotal = unitPrice * record.quantity;
      subtotal += lineTotal;
      rows.push(`<li><span>${record.item.name} — ${labels.join(' · ')} × ${record.quantity}</span><strong>${formatCurrency(lineTotal)}</strong></li>`);
    }
  });

  const deliveryFee = orderState.deliverySelected ? orderState.prices.deliveryFee : 0;
  summaryList.innerHTML = rows.length ? rows.join('') : '<li><span>No items selected yet.</span></li>';
  deliveryOutput.textContent = formatCurrency(deliveryFee);
  totalOutput.textContent = formatCurrency(subtotal + deliveryFee);
}function buildOrderItems() {
  const items = [];
  orderState.selected.forEach((record) => {
    const groups = getOptionGroups(record.item);
    const selections = getSelectedOptions(record.item.id);
    const basePrice = getPriceByKey(record.item.priceKey);

    if (!groups.length) {
      items.push({
        menu_item_id: record.item.id, item_name: record.item.name, category: record.item.category,
        quantity: record.quantity, unit: record.item.unit, unit_price: basePrice,
        line_total: basePrice * record.quantity, option: null
      });
      return;
    }

    let unitPrice = basePrice;
    const labels = [];
    groups.forEach((group, index) => {
      const label = selections.get(index);
      if (!label) return;
      const option = group.options.find((entry) => entry.label === label);
      unitPrice += Number(option?.adjustment || 0);
      labels.push(`${group.label}: ${label}`);
    });

    items.push({
      menu_item_id: record.item.id, item_name: record.item.name, category: record.item.category,
      quantity: record.quantity, unit: record.item.unit, unit_price: unitPrice,
      line_total: unitPrice * record.quantity, option: labels.join(' · ')
    });
  });
  return items;
}
