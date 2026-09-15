const state = {
  menu: null,
  prices: null,
  dirty: false,
  saving: false
};

const $ = (id) => document.getElementById(id);

function money(value) {
  return Number(value || 0).toFixed(2);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'new-item';
}

function uniqueId(base, category) {
  const used = new Set(category.items.map((item) => item.id).filter(Boolean));
  let id = slugify(base);
  let n = 2;
  while (used.has(id)) id = slugify(base) + '-' + n++;
  return id;
}

function getPrice(item) {
  if (!state.prices.items[item.priceKey]) {
    state.prices.items[item.priceKey] = { basePrice: 0 };
  }
  return state.prices.items[item.priceKey];
}

function getOptionGroups(item) { return item.pricing?.groups?.length ? item.pricing.groups : (getOptions(item).length ? [{ label: 'Options', options: getOptions(item) }] : []); }

function getOptions(item) {
  const menuOptions = item.pricing?.options || [];
  const priceOptions = getPrice(item).adjustments || [];
  const labels = menuOptions.length
    ? menuOptions
    : (item.orderOptions || []).map((label) => ({ label }));

  if (!labels.length && priceOptions.length) {
    return priceOptions.map((option) => ({
      label: option.label,
      adjustment: Number(option.value || 0)
    }));
  }

  return labels.map((option) => {
    const priceOption = priceOptions.find((p) => p.label === option.label);
    return {
      label: option.label,
      adjustment: Number(option.adjustment ?? priceOption?.value ?? 0)
    };
  });
}

function setStatus(message, dirty = false, error = false) {
  const el = $('status');
  el.textContent = message;
  el.classList.toggle('dirty', dirty);
  el.classList.toggle('error', error);
}

function markDirty(message = 'Unsaved changes — click Save Changes when you are finished.') {
  state.dirty = true;
  setStatus(message, true);
}

async function loadData() {
  try {
    if (!window.SET_ADMIN_AUTH_API) {
      throw new Error('Admin authentication is not available.');
    }

    const user = await window.SET_ADMIN_AUTH_API.checkSession();
    if (!user) {
      window.location.replace('../admin.html');
      return;
    }

    const result = await window.SET_MENU_API.load();
    state.menu = result.menu;
    state.prices = result.prices;
    $('deliveryFee').value = money(state.prices.deliveryFee ?? 0);
    render();
    setStatus('Loaded from the menu database.');
  } catch (error) {
    setStatus(error?.message || 'Unable to load the menu database.', false, true);
  }
}

function render() {
  const editor = $('editor');
  editor.innerHTML = '';

  let totalItems = 0;
  state.menu.categories.forEach((category) => {
    totalItems += category.items.length;
  });

  $('itemCount').textContent =
    totalItems + (totalItems === 1 ? ' item' : ' items') +
    ' · ' + state.menu.categories.length + ' categories';

  const table = document.createElement('table');
  table.className = 'menu-table';
  table.innerHTML = `
    <colgroup>
      <col class="order">
      <col class="item">
      <col class="unit">
      <col class="price">
      <col class="options">
      <col class="description">
      <col class="id">
    </colgroup>
    <thead>
      <tr>
        <th>#</th>
        <th>Item</th>
        <th>Unit / Size</th>
        <th>Base Price</th>
        <th>Options / Adjustments</th>
        <th>Description</th>
        <th>ID</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');

  state.menu.categories.forEach((category, categoryIndex) => {
    const categoryRow = document.createElement('tr');
    categoryRow.className = 'category-row';
    categoryRow.innerHTML = `
      <td colspan="3"><span class="category-name"></span><span class="category-description"></span></td>
      <td colspan="4" class="category-actions"><button class="add-category-item" type="button">+ Add Item</button></td>
    `;

    categoryRow.querySelector('.category-name').textContent = category.name;
    categoryRow.querySelector('.category-description').textContent =
      category.description ? '— ' + category.description : '';

    categoryRow.querySelector('.add-category-item')
      .addEventListener('click', () => addItem(categoryIndex));

    tbody.appendChild(categoryRow);

    category.items.forEach((item, itemIndex) => {
      tbody.appendChild(createItemRow(category, categoryIndex, item, itemIndex));
    });
  });

  if (!state.menu.categories.length) {
    const row = document.createElement('tr');
    row.className = 'empty-row';
    row.innerHTML = '<td colspan="7">No menu categories found.</td>';
    tbody.appendChild(row);
  }

  editor.appendChild(table);
}

function createItemRow(category, categoryIndex, item, itemIndex) {
  const price = getPrice(item);
  const row = document.createElement('tr');
  row.className = 'item-row';
  row.dataset.itemId = item.id || '';

  row.innerHTML = `
    <td class="order-cell">
      <span class="row-number"></span>
      <div class="move-buttons">
        <button class="move-button move-up" type="button" title="Move up" aria-label="Move up">↑</button>
        <button class="move-button move-down" type="button" title="Move down" aria-label="Move down">↓</button>
      </div>
    </td>
    <td><input class="cell-input item-name" data-field="name" aria-label="Item name"></td>
    <td><input class="cell-input" data-field="unit" aria-label="Unit or size"></td>
    <td><input class="cell-input price-input" data-field="price" type="number" min="0" step="0.01" inputmode="decimal" aria-label="Base price"></td>
    <td class="options-cell">
      <div class="option-list"></div>
      <button class="add-option" type="button">+ option</button>
    </td>
    <td><textarea class="cell-textarea" data-field="description" rows="2" aria-label="Description"></textarea></td>
    <td class="id-cell">
      <div class="id-value"></div>
      <button class="delete-button" type="button">Delete</button>
    </td>
  `;

  row.querySelector('[data-field="name"]').value = item.name || '';
  row.querySelector('[data-field="unit"]').value = item.unit || '';
  row.querySelector('[data-field="price"]').value = price.basePrice ?? 0;
  row.querySelector('[data-field="description"]').value = item.description || '';
  row.querySelector('.id-value').textContent = item.id || '(new item)';

  row.querySelectorAll('input:not(.option-label-input):not(.option-adjustment), textarea')
    .forEach((input) => {
      input.addEventListener('input', () => {
        syncRow(item, row);
        markDirty();
      });
    });

  renderOptions(row, item);

  row.querySelector('.add-option').addEventListener('click', () => {
    addOptionRow(row, item);
    markDirty('Unsaved changes — finish the option, then save.');
  });

  row.querySelector('.delete-button')
    .addEventListener('click', () => deleteItem(categoryIndex, itemIndex));

  row.querySelector('.move-up')
    .addEventListener('click', () => moveItem(categoryIndex, itemIndex, -1));

  row.querySelector('.move-down')
    .addEventListener('click', () => moveItem(categoryIndex, itemIndex, 1));

  row.querySelector('.row-number').textContent = itemIndex + 1;
  row.querySelector('.move-up').disabled = itemIndex === 0;
  row.querySelector('.move-down').disabled = itemIndex === category.items.length - 1;

  return row;
}

function addOptionRow(row, item) {
  const list = row.querySelector('.option-list');
  const optionRow = document.createElement('div');
  optionRow.className = 'option-line';
  optionRow.innerHTML = `
    <input class="cell-input option-label-input" placeholder="Label" aria-label="Option label">
    <input class="cell-input option-adjustment price-input" type="number" step="0.01" inputmode="decimal" placeholder="0.00" value="0" aria-label="Option adjustment">
    <button class="option-remove" type="button" title="Remove option" aria-label="Remove option">×</button>
  `;

  list.appendChild(optionRow);
  bindOptionRow(optionRow, row, item);
  optionRow.querySelector('.option-label-input').focus();
}

function bindOptionRow(optionRow, row, item) {
  optionRow.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      syncRow(item, row);
      markDirty();
    });
  });

  optionRow.querySelector('.option-remove').addEventListener('click', () => {
    optionRow.remove();
    syncRow(item, row);
    markDirty('Option removed. Save Changes to keep the change.');
  });
}

function renderOptions(row, item) {
  const list = row.querySelector('.option-list');
  list.innerHTML = '';

  getOptions(item).forEach((option) => {
    const optionRow = document.createElement('div');
    optionRow.className = 'option-line';
    optionRow.innerHTML = `
      <input class="cell-input option-label-input" placeholder="Label" aria-label="Option label">
      <input class="cell-input option-adjustment price-input" type="number" step="0.01" inputmode="decimal" placeholder="0.00" aria-label="Option adjustment">
      <button class="option-remove" type="button" title="Remove option" aria-label="Remove option">×</button>
    `;

    optionRow.querySelector('.option-label-input').value = option.label || '';
    optionRow.querySelector('.option-adjustment').value = option.adjustment ?? 0;
    list.appendChild(optionRow);
    bindOptionRow(optionRow, row, item);
  });
}

function syncRow(item, row) {
  item.name = row.querySelector('[data-field="name"]').value.trim();
  item.unit = row.querySelector('[data-field="unit"]').value.trim();
  item.description = row.querySelector('[data-field="description"]').value.trim();

  const price = getPrice(item);
  price.basePrice = Number(row.querySelector('[data-field="price"]').value || 0);

  const options = [...row.querySelectorAll('.option-line')]
    .map((optionRow) => ({
      label: optionRow.querySelector('.option-label-input').value.trim(),
      adjustment: Number(optionRow.querySelector('.option-adjustment').value || 0)
    }))
    .filter((option) => option.label);

  if (options.length) {
    item.orderOptions = options.map((option) => option.label);
    item.pricing = {
      type: 'adjustment',
      options: options.map((option) => ({
        label: option.label,
        adjustment: option.adjustment
      }))
    };
    price.adjustments = options.map((option) => ({
      label: option.label,
      value: option.adjustment
    }));
  } else {
    delete item.orderOptions;
    delete item.pricing;
    delete price.adjustments;
  }
}

function addItem(categoryIndex = 0) {
  if (!state.menu.categories.length) return;

  const category = state.menu.categories[categoryIndex];
  const id = uniqueId('new-item', category);
  const item = {
    id,
    name: 'New Item',
    description: '',
    unit: 'Each',
    priceKey: id,
    category: category.id
  };

  category.items.push(item);
  state.prices.items[id] = { basePrice: 0 };
  render();
  markDirty('New item added. Edit it, then click Save Changes.');
  focusNewItem(id);
}

function focusNewItem(id) {
  const target = [...document.querySelectorAll('.item-row')]
    .find((row) => row.querySelector('.id-value')?.textContent === id);
  target?.querySelector('[data-field="name"]')?.focus();
}

function deleteItem(categoryIndex, itemIndex) {
  const category = state.menu.categories[categoryIndex];
  const item = category.items[itemIndex];
  if (!item) return;

  const confirmed = window.confirm(
    'Delete "' + (item.name || 'this item') + '" from the menu? This will also remove its price entry.'
  );
  if (!confirmed) return;

  category.items.splice(itemIndex, 1);
  if (item.priceKey) delete state.prices.items[item.priceKey];

  render();
  markDirty('Item deleted. Click Save Changes to keep the change.');
}

function moveItem(categoryIndex, itemIndex, direction) {
  const category = state.menu.categories[categoryIndex];
  const newIndex = itemIndex + direction;
  if (!category?.items[newIndex]) return;

  const [item] = category.items.splice(itemIndex, 1);
  category.items.splice(newIndex, 0, item);

  render();
  markDirty('Item order changed. Click Save Changes to keep the new order.');
}

function syncAllRows() {
  document.querySelectorAll('.item-row').forEach((row) => {
    const id = row.dataset.itemId;
    const found = state.menu.categories
      .flatMap((category) => category.items)
      .find((item) => item.id === id);

    if (found) syncRow(found, row);
  });

  state.prices.deliveryFee = Number($('deliveryFee').value || 0);
}

async function saveChanges() {
  if (state.saving) return;

  try {
    syncAllRows();
    state.saving = true;
    $('saveMenu').disabled = true;
    setStatus('Saving changes to the menu database…');

    await window.SET_MENU_API.save(state.menu, state.prices);

    state.dirty = false;
    setStatus('Saved successfully to the menu database.');
  } catch (error) {
    setStatus(error?.message || 'Unable to save the menu database.', false, true);
  } finally {
    state.saving = false;
    $('saveMenu').disabled = false;
  }
}

$('deliveryFee').addEventListener('input', () => markDirty());

$('addItem').addEventListener('click', () => addItem(0));

$('saveMenu').addEventListener('click', saveChanges);

loadData();
