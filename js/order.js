const orderState = {
  menu: null,
  prices: null,
  selected: new Map(),
  optionSelections: new Map(),
  optionSplits: new Map(),
  optionModifiers: new Map(),
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
  if (item.pricing?.options?.length) return [{ label: 'Options', options: item.pricing.options }];
  if (item.orderOptions?.length) {
    return [{ label: 'Options', options: item.orderOptions.map((label) => ({ label, adjustment: 0 })) }];
  }
  return [];
}

// The first group is the primary choice: it drives the checkboxes and the quantity split.
function getOptionDefinitions(item) {
  return getOptionGroups(item)[0]?.options ?? [];
}

// Every later group is a modifier on the primary choice, e.g. Cookies for each pudding flavor.
// A group with appliesTo only offers its choices to the primary options it names.
function getModifierGroups(item, optionLabel) {
  return getOptionGroups(item).slice(1).filter((group) =>
    !group.appliesTo?.length || group.appliesTo.includes(optionLabel)
  );
}

function hasModifierGroups(item) {
  return getOptionGroups(item).length > 1;
}

function modifierKey(itemId, optionLabel, groupLabel) {
  return `${itemId}--${optionLabel}--${groupLabel}`;
}

function getModifierChoice(itemId, optionLabel, group) {
  const chosen = orderState.optionModifiers.get(modifierKey(itemId, optionLabel, group.label));
  return (group.options ?? []).find((choice) => choice.label === chosen) ?? null;
}

function optionAdjustment(item, optionLabel) {
  const primary = getOptionDefinitions(item).find((entry) => entry.label === optionLabel);
  return getModifierGroups(item, optionLabel).reduce(
    (sum, group) => sum + (getModifierChoice(item.id, optionLabel, group)?.adjustment ?? 0),
    primary?.adjustment ?? 0
  );
}

function optionFullLabel(item, optionLabel) {
  const modifiers = getModifierGroups(item, optionLabel)
    .map((group) => getModifierChoice(item.id, optionLabel, group)?.label)
    .filter(Boolean);
  return [optionLabel, ...modifiers].join(' \u00b7 ');
}

function modifiersComplete(item, optionLabel) {
  return getModifierGroups(item, optionLabel).every((group) => getModifierChoice(item.id, optionLabel, group));
}

function clearModifiers(item, optionLabel) {
  getModifierGroups(item, optionLabel).forEach((group) => {
    orderState.optionModifiers.delete(modifierKey(item.id, optionLabel, group.label));
  });
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
    const options = getOptionDefinitions(item);
    const firstGroupLabel = getOptionGroups(item)[0]?.label;
    const primaryGroupLabel = !firstGroupLabel || firstGroupLabel === 'Options' ? 'Choose one or more' : firstGroupLabel;

    if (options.length) {
      const modifierFields = (option) => getModifierGroups(item, option.label).map((group) => `
            <label class="option-modifier">${group.label}
              <select class="option-modifier-select" data-modifier-item="${item.id}" data-modifier-option="${option.label}" data-modifier-group="${group.label}">
                <option value="">Choose...</option>
                ${(group.options ?? []).map((choice) => `<option value="${choice.label}">${choice.label}${choice.adjustment ? ` (+${formatCurrency(choice.adjustment)})` : ''}</option>`).join('')}
              </select>
            </label>`).join('');

      const optionRows = options.map((option) => `
        <div class="option-choice-row">
          <label class="option-choice-main">
            <input type="checkbox" class="option-checkbox" data-option-item="${item.id}" data-option-key="${option.label}" />
            <span class="option-choice-label">${option.label}</span>
          </label>
          <div class="option-choice-controls" data-option-controls="${item.id}--${option.label}" hidden>
            ${modifierFields(option)}
            <label class="quantity-control" data-split-quantity="true" hidden>Qty ${makeQuantityInput(item.id, option.label)}</label>
          </div>
          <span class="option-price">${optionPriceText(item, option)}</span>
        </div>`).join('');

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
          <div class="option-prompt">${primaryGroupLabel}:</div>
          <div class="option-choice-list">${optionRows}</div>
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

function getSelectedOptions(itemId) {
  return orderState.optionSelections.get(itemId) ?? new Set();
}

function setOptionSelection(itemId, optionLabel, checked) {
  const selections = new Set(getSelectedOptions(itemId));
  const maxSelections = itemId === 'wings' ? 2 : getMainQuantity(itemId);

  if (checked) {
    if (selections.size >= maxSelections) {
      const checkbox = Array.from(document.querySelectorAll('.option-checkbox')).find((input) =>
        input.dataset.optionItem === itemId && input.dataset.optionKey === optionLabel
      );
      if (checkbox) checkbox.checked = false;
      return;
    }
    selections.add(optionLabel);
  } else {
    selections.delete(optionLabel);
    orderState.optionSplits.delete(`${itemId}--${optionLabel}`);
    const item = getMenuItemById(itemId);
    if (item) clearModifiers(item, optionLabel);
  }

  orderState.optionSelections.set(itemId, selections);
  updateOptionVisibility(itemId);
  updateSummary();
}

function updateMainQuantity(itemId, quantity) {
  const item = getMenuItemById(itemId);
  if (!item) return;

  if (quantity > 0) {
    orderState.selected.set(itemId, { item, quantity });
    const selections = new Set(getSelectedOptions(itemId));
    if (itemId !== 'wings' && selections.size > quantity) {
      const keep = Array.from(selections).slice(0, quantity);
      const keepSet = new Set(keep);
      Array.from(selections).slice(quantity).forEach((label) => {
        orderState.optionSplits.delete(`${itemId}--${label}`);
        clearModifiers(item, label);
      });
      orderState.optionSelections.set(itemId, keepSet);
    }
  } else {
    orderState.selected.delete(itemId);
    orderState.optionSelections.delete(itemId);
    getOptionDefinitions(item).forEach((option) => {
      orderState.optionSplits.delete(`${itemId}--${option.label}`);
      clearModifiers(item, option.label);
    });
  }

  updateOptionVisibility(itemId);
  updateSummary();
}

function updateOptionVisibility(itemId) {
  const mainQuantity = getMainQuantity(itemId);
  const container = document.querySelector(`[data-options-container="${itemId}"]`);
  const validation = document.querySelector(`[data-option-validation="${itemId}"]`);
  if (!container || !validation) return;

  container.hidden = mainQuantity <= 0;

  if (mainQuantity <= 0) {
    validation.textContent = '';
    container.querySelectorAll('.option-checkbox').forEach((input) => { input.checked = false; });
    container.querySelectorAll('.item-quantity').forEach((input) => { input.value = ''; });
    container.querySelectorAll('.option-modifier-select').forEach((select) => { select.value = ''; });
    container.querySelectorAll('[data-option-controls]').forEach((controls) => { controls.hidden = true; });
    return;
  }

  const item = getMenuItemById(itemId);
  const selections = getSelectedOptions(itemId);
  const splitMode = selections.size > 1 && mainQuantity > 1;

  container.querySelectorAll('[data-option-controls]').forEach((controls) => {
    const label = controls.dataset.optionControls.split('--').slice(1).join('--');
    const active = selections.has(label);
    const hasModifiers = item ? getModifierGroups(item, label).length > 0 : false;
    // Controls only earn their space once the option is checked and has something to ask.
    controls.hidden = !active || (!splitMode && !hasModifiers);

    const quantityControl = controls.querySelector('[data-split-quantity]');
    if (quantityControl) quantityControl.hidden = !splitMode;

    if (!splitMode) {
      const input = controls.querySelector('.item-quantity');
      if (input) input.value = '';
      orderState.optionSplits.delete(`${itemId}--${label}`);
    }

    if (!active) {
      controls.querySelectorAll('.option-modifier-select').forEach((select) => { select.value = ''; });
    }
  });

  if (selections.size === 0) {
    validation.textContent = 'Select an option.';
    validation.className = 'option-validation invalid';
    return;
  }

  const incomplete = item && Array.from(selections).find((label) => !modifiersComplete(item, label));
  if (incomplete) {
    const group = getModifierGroups(item, incomplete).find((entry) => !getModifierChoice(itemId, incomplete, entry));
    validation.textContent = `Choose ${group.label} for ${incomplete}`;
    validation.className = 'option-validation invalid';
    return;
  }

  if (!splitMode) {
    validation.textContent = '';
    validation.className = 'option-validation';
    return;
  }

  const splitTotal = Array.from(selections).reduce(
    (sum, label) => sum + (orderState.optionSplits.get(`${itemId}--${label}`) ?? 0),
    0
  );

  if (splitTotal === mainQuantity) {
    validation.textContent = '';
    validation.className = 'option-validation';
  } else {
    const difference = mainQuantity - splitTotal;
    validation.textContent = difference > 0 ? `Choose ${difference} more` : `Reduce by ${Math.abs(difference)}`;
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

  document.querySelectorAll('.option-checkbox').forEach((input) => {
    input.addEventListener('change', (event) => {
      setOptionSelection(
        event.target.dataset.optionItem,
        event.target.dataset.optionKey,
        event.target.checked
      );
    });
  });

  document.querySelectorAll('.option-modifier-select').forEach((select) => {
    select.addEventListener('change', (event) => {
      const { modifierItem, modifierOption, modifierGroup } = event.target.dataset;
      const key = modifierKey(modifierItem, modifierOption, modifierGroup);
      if (event.target.value) orderState.optionModifiers.set(key, event.target.value);
      else orderState.optionModifiers.delete(key);
      updateOptionVisibility(modifierItem);
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

      const selections = getSelectedOptions(item.id);
      if (selections.size === 0) return false;
      for (const label of selections) {
        if (!modifiersComplete(item, label)) return false;
      }

      if (selections.size > 1 && mainQuantity > 1) {
        const splitTotal = Array.from(selections).reduce(
          (sum, label) => sum + (orderState.optionSplits.get(`${item.id}--${label}`) ?? 0),
          0
        );
        if (splitTotal !== mainQuantity) return false;
      }
    }
  }
  return true;
}

function updateSummary() {
  const summaryList = document.querySelector('[data-summary-list]');
  const totalOutput = document.querySelector('[data-order-total]');
  const deliveryOutput = document.querySelector('[data-delivery-total]');
  if (!summaryList || !totalOutput || !deliveryOutput || !orderState.prices) return;

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

    const selections = Array.from(getSelectedOptions(record.item.id));
    if (selections.length === 1) {
      const lineTotal = (getPriceByKey(record.item.priceKey) + optionAdjustment(record.item, selections[0])) * record.quantity;
      subtotal += lineTotal;
      rows.push(`<li><span>${record.item.name} — ${optionFullLabel(record.item, selections[0])} × ${record.quantity}</span><strong>${formatCurrency(lineTotal)}</strong></li>`);
    } else if (selections.length > 1 && record.quantity === 1 && record.item.id === 'wings') {
      const lineTotal = getPriceByKey(record.item.priceKey) * record.quantity;
      subtotal += lineTotal;
      rows.push(`<li><span>${record.item.name} — Mixed (${selections.join(' + ')}) × 1</span><strong>${formatCurrency(lineTotal)}</strong></li>`);
    } else if (selections.length > 1) {
      selections.forEach((label) => {
        const quantity = orderState.optionSplits.get(`${record.item.id}--${label}`) ?? 0;
        if (!quantity) return;
        const lineTotal = (getPriceByKey(record.item.priceKey) + optionAdjustment(record.item, label)) * quantity;
        subtotal += lineTotal;
        rows.push(`<li><span>${record.item.name} — ${optionFullLabel(record.item, label)} × ${quantity}</span><strong>${formatCurrency(lineTotal)}</strong></li>`);
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

function buildOrderItems() {
  const items = [];
  orderState.selected.forEach((record) => {
    const options = getOptionDefinitions(record.item);
    const selections = Array.from(getSelectedOptions(record.item.id));

    if (!options.length || selections.length === 0) {
      const unitPrice = getPriceByKey(record.item.priceKey);
      items.push({
        menu_item_id: record.item.id,
        item_name: record.item.name,
        category: record.item.category,
        quantity: record.quantity,
        unit: record.item.unit,
        unit_price: unitPrice,
        line_total: unitPrice * record.quantity,
        option: null
      });
      return;
    }

    if (selections.length === 1) {
      const unitPrice = getPriceByKey(record.item.priceKey) + optionAdjustment(record.item, selections[0]);
      items.push({
        menu_item_id: record.item.id,
        item_name: record.item.name,
        category: record.item.category,
        quantity: record.quantity,
        unit: record.item.unit,
        unit_price: unitPrice,
        line_total: unitPrice * record.quantity,
        option: optionFullLabel(record.item, selections[0])
      });
      return;
    }

    if (record.item.id === 'wings' && record.quantity === 1) {
      const unitPrice = getPriceByKey(record.item.priceKey);
      items.push({
        menu_item_id: record.item.id,
        item_name: record.item.name,
        category: record.item.category,
        quantity: 1,
        unit: record.item.unit,
        unit_price: unitPrice,
        line_total: unitPrice,
        option: `Mixed: ${selections.join(' + ')}`
      });
      return;
    }

    selections.forEach((label) => {
      const quantity = orderState.optionSplits.get(`${record.item.id}--${label}`) ?? 0;
      if (!quantity) return;
      const unitPrice = getPriceByKey(record.item.priceKey) + optionAdjustment(record.item, label);
      items.push({
        menu_item_id: record.item.id,
        item_name: record.item.name,
        category: record.item.category,
        quantity,
        unit: record.item.unit,
        unit_price: unitPrice,
        line_total: unitPrice * quantity,
        option: optionFullLabel(record.item, label)
      });
    });
  });
  return items;
}

function calculateSubtotals(items) {
  return items.reduce((totals, item) => {
    if (item.category === 'meats') totals.meats += item.line_total;
    else if (item.category === 'sides') totals.sides += item.line_total;
    else if (item.category === 'desserts') totals.desserts += item.line_total;
    return totals;
  }, { meats: 0, sides: 0, desserts: 0 });
}

function attachOrderHandler() {
  const form = document.getElementById('order-form');
  if (!form || form.dataset.handlerAttached) return;
  form.dataset.handlerAttached = 'true';

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    event.stopPropagation();
    form.classList.add('validated');

    if (!validateOrderForm()) {
      document.querySelector('[data-order-message]')?.scrollIntoView({ block: 'center' });
      form.reportValidity();
      return;
    }

    if (typeof window.submitOrder === 'function') {
      window.submitOrder();
    } else {
      const message = document.querySelector('[data-order-message]');
      if (message) message.textContent = 'The order submission system is still loading. Please refresh and try again.';
    }
  });
}

async function initializeOrderPage() {
  attachOrderHandler();

  try {
    const result = await window.SET_MENU_API.load();
    orderState.menu = result.menu;
    orderState.prices = result.prices;
    renderOrderOptions();
    updateSummary();
  } catch (error) {
    const message = document.querySelector('[data-order-message]');
    if (message) {
      message.textContent = error.message || 'Unable to load the order form.';
      message.classList.add('form-error');
    }
  }
}

window.orderState = orderState;
window.buildOrderItems = buildOrderItems;
window.calculateSubtotals = calculateSubtotals;
window.validateOrderForm = validateOrderForm;

document.addEventListener('DOMContentLoaded', initializeOrderPage);
