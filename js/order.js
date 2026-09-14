const orderState = {
  menu: null,
  prices: null,
  selected: new Map(),
  optionSelections: new Map(),
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
  return formatCurrency(getPriceByKey(item.priceKey) + adjustment);
}

function renderCategorySelection(category, container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'item-selector';

  const list = category.items.map((item) => {
    const itemPrice = getPriceByKey(item.priceKey);
    const options = getOptionDefinitions(item);

    if (options.length) {
      const optionRows = options.map((option) => `
        <label class="option-choice-row" data-option-row="${item.id}">
          <input type="checkbox" class="option-checkbox" data-option-item="${item.id}" data-option-key="${option.label}" />
          <span class="option-choice-label">${option.label}</span>
          <span class="option-price">${optionPriceText(item, option)}</span>
        </label>`).join('');

      const splitRows = options.map((option) => `
        <div class="option-split-row" data-split-row="${item.id}--${option.label}" hidden>
          <span>${option.label}</span>
          <label class="quantity-control">Qty ${makeQuantityInput(item.id, option.label)}</label>
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
          <div class="option-prompt">Choose one or more:</div>
          <div class="option-choice-list">${optionRows}</div>
          <div class="option-split-list" data-split-list="${item.id}" hidden>${splitRows}</div>
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
    // Each checked option represents at least one unit. Never allow
    // more checked options than the customer's requested quantity.
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
  }

  orderState.optionSelections.set(itemId, selections);
  updateOptionVisibility(itemId);
  updateSummary();
}

function updateMainQuantity(itemId, quantity) {
  const item = getMenuItemById(itemId);
  if (quantity > 0) {
    orderState.selected.set(itemId, { item, quantity });

    // If quantity is reduced, automatically remove excess option choices.
    const selections = new Set(getSelectedOptions(itemId));
    if (itemId !== 'wings' && selections.size > quantity) {
      const keep = Array.from(selections).slice(0, quantity);
      const keepSet = new Set(keep);
      Array.from(selections).slice(quantity).forEach((label) => {
        orderState.optionSplits.delete(`${itemId}--${label}`);
      });
      orderState.optionSelections.set(itemId, keepSet);
    }
  } else {
    orderState.selected.delete(itemId);
    orderState.optionSelections.delete(itemId);
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
    container.querySelectorAll('.option-checkbox').forEach((input) => { input.checked = false; });
    container.querySelectorAll('.item-quantity').forEach((input) => { input.value = ''; });
    return;
  }

  const selections = getSelectedOptions(itemId);
  const splitMode = selections.size > 1 && mainQuantity > 1;
  splitList.hidden = !splitMode;

  // A single selected option applies to the entire item quantity.
  splitList.querySelectorAll('[data-split-row]').forEach((row) => {
    const label = row.dataset.splitRow.split('--').slice(1).join('--');
    row.hidden = !splitMode || !selections.has(label);
    if (!splitMode) {
      const input = row.querySelector('.item-quantity');
      if (input) input.value = '';
      orderState.optionSplits.delete(`${itemId}--${label}`);
    }
  });

  if (selections.size === 0) {
    validation.textContent = 'Select an option.';
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

    const selections = Array.from(getSelectedOptions(record.item.id));
    if (selections.length === 1) {
      const option = options.find((entry) => entry.label === selections[0]);
      const lineTotal = (getPriceByKey(record.item.priceKey) + (option?.adjustment ?? 0)) * record.quantity;
      subtotal += lineTotal;
      rows.push(`<li><span>${record.item.name} — ${selections[0]} × ${record.quantity}</span><strong>${formatCurrency(lineTotal)}</strong></li>`);
    } else if (selections.length > 1 && record.quantity === 1 && record.item.id === 'wings') {
      // A single wing order can be mixed without asking the customer to split quantities.
      const lineTotal = getPriceByKey(record.item.priceKey) * record.quantity;
      subtotal += lineTotal;
      rows.push(`<li><span>${record.item.name} — Mixed (${selections.join(' + ')}) × 1</span><strong>${formatCurrency(lineTotal)}</strong></li>`);
    } else if (selections.length > 1) {
      selections.forEach((label) => {
        const option = options.find((entry) => entry.label === label);
        const quantity = orderState.optionSplits.get(`${record.item.id}--${label}`) ?? 0;
        if (!quantity) return;
        const lineTotal = (getPriceByKey(record.item.priceKey) + (option?.adjustment ?? 0)) * quantity;
        subtotal += lineTotal;
        rows.push(`<li><span>${record.item.name} — ${label} × ${quantity}</span><strong>${formatCurrency(lineTotal)}</strong></li>`);
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
    } else element.setCustomValidity('');
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
  } else if (message) message.textContent = '';

  return valid;
}


const SUPABASE_URL = 'https://klgshthkszosfgxhjctv.supabase.co';
const SUBMIT_ORDER_URL = `${SUPABASE_URL}/functions/v1/submit-order`;

function buildOrderItems() {
  const items = [];
  orderState.selected.forEach((record) => {
    const options = getOptionDefinitions(record.item);
    const selections = Array.from(getSelectedOptions(record.item.id));
    if (!options.length || selections.length === 0) {
      const unitPrice = getPriceByKey(record.item.priceKey);
      items.push({menu_item_id:record.item.id,item_name:record.item.name,category:record.item.category,quantity:record.quantity,unit:record.item.unit,unit_price:unitPrice,line_total:unitPrice*record.quantity,option:null});
      return;
    }
    if (selections.length === 1) {
      const option = options.find((entry) => entry.label === selections[0]);
      const unitPrice = getPriceByKey(record.item.priceKey) + (option?.adjustment ?? 0);
      items.push({menu_item_id:record.item.id,item_name:record.item.name,category:record.item.category,quantity:record.quantity,unit:record.item.unit,unit_price:unitPrice,line_total:unitPrice*record.quantity,option:selections[0]});
      return;
    }
    if (record.item.id === 'wings' && record.quantity === 1) {
      const unitPrice = getPriceByKey(record.item.priceKey);
      items.push({menu_item_id:record.item.id,item_name:record.item.name,category:record.item.category,quantity:1,unit:record.item.unit,unit_price:unitPrice,line_total:unitPrice,option:`Mixed: ${selections.join(' + ')}`});
      return;
    }
    selections.forEach((label) => {
      const option = options.find((entry) => entry.label === label);
      const quantity = orderState.optionSplits.get(`${record.item.id}--${label}`) ?? 0;
      if (!quantity) return;
      const unitPrice = getPriceByKey(record.item.priceKey) + (option?.adjustment ?? 0);
      items.push({menu_item_id:record.item.id,item_name:record.item.name,category:record.item.category,quantity,unit:record.item.unit,unit_price:unitPrice,line_total:unitPrice*quantity,option:label});
    });
  });
  return items;
}

function calculateSubtotals(items) {
  return items.reduce((t,item) => {
    if (item.category === 'meats') t.meats += item.line_total;
    else if (item.category === 'sides') t.sides += item.line_total;
    else if (item.category === 'desserts') t.desserts += item.line_total;
    return t;
  },{meats:0,sides:0,desserts:0});
}

async function submitOrder() {
  const items = buildOrderItems();
  const totals = calculateSubtotals(items);
  const form = document.getElementById('order-form');
  const button = form.querySelector('button[type="submit"]');
  const payload = {
    eventName:document.getElementById('eventName').value.trim(),
    guestCount:Number(document.getElementById('guestCount').value),
    eventDate:document.getElementById('eventDate').value,
    eventTime:document.getElementById('eventTime').value,
    eventAddress:document.getElementById('eventAddress').value.trim(),
    contactName:document.getElementById('contactName').value.trim(),
    phone:document.getElementById('phone').value.trim(),
    email:document.getElementById('email').value.trim(),
    deliveryRequired:orderState.deliverySelected,
    deliveryFee:orderState.deliverySelected ? orderState.prices.deliveryFee : 0,
    specialRequests:document.getElementById('specialRequests').value.trim(),
    items,
    subtotalMeats:totals.meats,
    subtotalSides:totals.sides,
    subtotalDesserts:totals.desserts,
    total:totals.meats+totals.sides+totals.desserts+(orderState.deliverySelected ? orderState.prices.deliveryFee : 0)
  };
  button.disabled=true;
  button.textContent='Submitting...';
  try {
    const response=await fetch(SUBMIT_ORDER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!response.ok){
      const error=await response.json().catch(()=>({}));
      throw new Error(error.error || 'We could not submit your order. Please try again.');
    }
    const pdfBlob=await response.blob();
    showThankYouPage(pdfBlob);
  } catch(error) {
    const message=document.querySelector('[data-order-message]');
    if(message) message.textContent=error.message || 'We could not submit your order. Please try again.';
    button.disabled=false;
    button.textContent='Place Order';
  }
}

function showThankYouPage(pdfBlob) {
  const pdfUrl=URL.createObjectURL(pdfBlob);
  const link=document.createElement('a');
  link.href=pdfUrl;
  link.download='north-quarters-invoice.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();

  document.querySelector('main').innerHTML=`
    <section class="masthead">
      <div class="container">
        <div class="eyebrow">Order Received</div>
        <h1>Thank you for your order!</h1>
        <p class="page-intro">Your invoice has been downloaded automatically. A copy is also shown below for your records.</p>
        <p class="page-intro"><strong>Need to make a change?</strong> Please call or email <a href="mailto:northquarterscook@yahoo.com">northquarterscook@yahoo.com</a>.</p>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="card">
          <div class="section-head"><div class="kicker">Invoice</div><h2>Your Invoice</h2></div>
          <div style="height:75vh;min-height:600px"><iframe src="${pdfUrl}" title="Your catering invoice" style="width:100%;height:100%;border:1px solid #ddd;border-radius:4px"></iframe></div>
          <p style="margin-top:1rem"><a href="${pdfUrl}" download="north-quarters-invoice.pdf">Download Invoice Again</a></p>
        </div>
      </div>
    </section>`;
  window.scrollTo({top:0,behavior:'smooth'});
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
      if (validateOrderForm()) submitOrder();
    });
  }
}

document.addEventListener('DOMContentLoaded', initializeOrderPage);
