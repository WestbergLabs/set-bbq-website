const state = {
  menu: null,
  prices: null
};

const $ = (id) => document.getElementById(id);

function money(value) {
  return Number(value || 0).toFixed(2);
}

function setStatus(message, isError = false) {
  const el = $('status');
  el.textContent = message;
  el.classList.toggle('error', isError);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'new-item';
}

function makeUniqueId(name) {
  const base = slugify(name);
  const used = new Set(
    state.menu.categories.flatMap((category) => category.items.map((item) => item.id))
  );

  if (!used.has(base)) return base;

  let number = 2;
  while (used.has(base + '-' + number)) number += 1;
  return base + '-' + number;
}

function getPrice(item) {
  if (!state.prices.items[item.priceKey]) {
    state.prices.items[item.priceKey] = { basePrice: 0 };
  }
  return state.prices.items[item.priceKey];
}

function optionData(item) {
  const menuOptions = item.pricing?.options || [];
  const priceOptions = getPrice(item).adjustments || [];

  if (menuOptions.length) {
    return menuOptions.map((option) => {
      const priceOption = priceOptions.find((candidate) => candidate.label === option.label);
      return {
        label: option.label,
        adjustment: option.adjustment ?? priceOption?.value ?? 0
      };
    });
  }

  const labels = item.orderOptions || priceOptions.map((option) => option.label);
  return labels.map((label) => {
    const priceOption = priceOptions.find((option) => option.label === label);
    return {
      label,
      adjustment: priceOption?.value ?? 0
    };
  });
}

function parseOptions(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [labelPart, adjustmentPart = '0'] = line.split('|');
      const label = labelPart.trim();
      const adjustment = Number(adjustmentPart.trim() || 0);
      return {
        label,
        adjustment: Number.isFinite(adjustment) ? adjustment : 0
      };
    })
    .filter((option) => option.label);
}

function optionsText(item) {
  return optionData(item)
    .map((option) => option.label + ' | ' + money(option.adjustment))
    .join('\n');
}

function render() {
  const editor = $('editor');
  editor.innerHTML = '';

  state.menu.categories.forEach((category, categoryIndex) => {
    const section = document.createElement('section');
    section.className = 'menu-section';
    section.dataset.category = categoryIndex;

    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `
      <div class="category-fields">
        <label>
          <input class="category-name" data-category-field="name" aria-label="Category name">
        </label>
        <label>
          <textarea class="category-description" rows="1" data-category-field="description" aria-label="Category description"></textarea>
        </label>
      </div>
      <button class="add-item" type="button">+ Add Item</button>
    `;

    header.querySelector('[data-category-field="name"]').value = category.name || '';
    header.querySelector('[data-category-field="description"]').value = category.description || '';

    const scroll = document.createElement('div');
    scroll.className = 'table-scroll';

    const table = document.createElement('table');
    table.className = 'menu-table';
    table.innerHTML = `
      <colgroup>
        <col class="order-col">
        <col class="item-col">
        <col class="unit-col">
        <col class="price-col">
        <col class="options-col">
        <col class="description-col">
        <col class="id-col">
        <col class="actions-col">
      </colgroup>
      <thead>
        <tr>
          <th>#</th>
          <th>Item</th>
          <th>Unit / Size</th>
          <th>Price</th>
          <th>Options</th>
          <th>Description</th>
          <th>ID</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    category.items.forEach((item, itemIndex) => {
      const price = getPrice(item);
      const row = document.createElement('tr');
      row.dataset.category = categoryIndex;
      row.dataset.item = itemIndex;

      row.innerHTML = `
        <td class="order-cell">
          <span class="order-number">${itemIndex + 1}</span>
          <div class="move-controls">
            <button class="move-button move-up" type="button" title="Move item up" aria-label="Move item up">↑</button>
            <button class="move-button move-down" type="button" title="Move item down" aria-label="Move item down">↓</button>
          </div>
        </td>
        <td>
          <input class="cell-input" data-field="name" aria-label="Item name">
        </td>
        <td>
          <input class="cell-input" data-field="unit" aria-label="Unit or size">
        </td>
        <td>
          <input class="cell-input price-input" data-field="price" type="number" min="0" step="0.01" inputmode="decimal" aria-label="Base price">
        </td>
        <td>
          <div class="options-hint">Label | adjustment</div>
          <textarea class="cell-textarea options-input" data-field="options" aria-label="Customer options"></textarea>
        </td>
        <td>
          <textarea class="cell-textarea" data-field="description" aria-label="Item description"></textarea>
        </td>
        <td>
          <span class="id-pill"></span>
        </td>
        <td>
          <button class="delete-button" type="button">Delete</button>
        </td>
      `;

      row.querySelector('[data-field="name"]').value = item.name || '';
      row.querySelector('[data-field="unit"]').value = item.unit || '';
      row.querySelector('[data-field="price"]').value = price.basePrice ?? 0;
      row.querySelector('[data-field="options"]').value = optionsText(item);
      row.querySelector('[data-field="description"]').value = item.description || '';
      row.querySelector('.id-pill').textContent = item.id;

      row.querySelector('.move-up').disabled = itemIndex === 0;
      row.querySelector('.move-down').disabled = itemIndex === category.items.length - 1;

      tbody.appendChild(row);
    });

    scroll.appendChild(table);
    section.appendChild(header);
    section.appendChild(scroll);
    editor.appendChild(section);
  });

  editor.querySelectorAll('input, textarea').forEach((input) => {
    input.addEventListener('input', markDirty);
  });

  editor.querySelectorAll('.add-item').forEach((button) => {
    button.addEventListener('click', () => addItem(Number(button.closest('.menu-section').dataset.category)));
  });

  editor.querySelectorAll('.delete-button').forEach((button) => {
    button.addEventListener('click', () => deleteItem(button.closest('tr')));
  });

  editor.querySelectorAll('.move-up').forEach((button) => {
    button.addEventListener('click', () => moveItem(button.closest('tr'), -1));
  });

  editor.querySelectorAll('.move-down').forEach((button) => {
    button.addEventListener('click', () => moveItem(button.closest('tr'), 1));
  });
}

function markDirty() {
  setStatus('Unsaved changes — download the JSON file(s) when you are finished.');
}

function syncState() {
  state.prices.deliveryFee = Number($('deliveryFee').value || 0);

  document.querySelectorAll('.menu-section').forEach((section) => {
    const categoryIndex = Number(section.dataset.category);
    const category = state.menu.categories[categoryIndex];

    category.name = section.querySelector('[data-category-field="name"]').value.trim();
    category.description = section.querySelector('[data-category-field="description"]').value.trim();

    section.querySelectorAll('tbody tr').forEach((row) => {
      const itemIndex = Number(row.dataset.item);
      const item = category.items[itemIndex];
      const price = getPrice(item);

      item.name = row.querySelector('[data-field="name"]').value.trim();
      item.unit = row.querySelector('[data-field="unit"]').value.trim();
      item.description = row.querySelector('[data-field="description"]').value.trim();
      price.basePrice = Number(row.querySelector('[data-field="price"]').value || 0);

      const options = parseOptions(row.querySelector('[data-field="options"]').value);

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
    });
  });
}

function addItem(categoryIndex) {
  syncState();

  const category = state.menu.categories[categoryIndex];
  const id = makeUniqueId('New Item');
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
  markDirty();

  const section = document.querySelector(`.menu-section[data-category="${categoryIndex}"]`);
  section?.lastElementChild?.querySelector('tbody tr:last-child')?.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });

  section?.querySelector('[data-field="name"]')?.focus();
}

function deleteItem(row) {
  syncState();

  const categoryIndex = Number(row.dataset.category);
  const itemIndex = Number(row.dataset.item);
  const category = state.menu.categories[categoryIndex];
  const item = category.items[itemIndex];

  if (!item) return;

  const confirmed = window.confirm(`Delete "${item.name || item.id}" from the menu?`);
  if (!confirmed) return;

  category.items.splice(itemIndex, 1);
  delete state.prices.items[item.priceKey];
  render();
  markDirty();
}

function moveItem(row, direction) {
  syncState();

  const categoryIndex = Number(row.dataset.category);
  const itemIndex = Number(row.dataset.item);
  const items = state.menu.categories[categoryIndex].items;
  const newIndex = itemIndex + direction;

  if (newIndex < 0 || newIndex >= items.length) return;

  [items[itemIndex], items[newIndex]] = [items[newIndex], items[itemIndex]];
  render();
  markDirty();

  document.querySelector(`.menu-section[data-category="${categoryIndex}"] tbody tr:nth-child(${newIndex + 1}) input`)?.focus();
}

function download(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

$('downloadMenu').addEventListener('click', () => {
  syncState();
  download('menu.json', state.menu);
  setStatus('Downloaded menu.json. Replace data/menu.json with it, then test.');
});

$('downloadPrices').addEventListener('click', () => {
  syncState();
  download('prices.json', state.prices);
  setStatus('Downloaded prices.json. Replace data/prices.json with it, then test.');
});

$('deliveryFee').addEventListener('input', markDirty);

async function loadData() {
  try {
    const [menuResponse, pricesResponse] = await Promise.all([
      fetch('../data/menu.json'),
      fetch('../data/prices.json')
    ]);

    if (!menuResponse.ok || !pricesResponse.ok) {
      throw new Error('Could not load menu data.');
    }

    state.menu = await menuResponse.json();
    state.prices = await pricesResponse.json();

    $('deliveryFee').value = state.prices.deliveryFee ?? 0;
    render();
    setStatus('Loaded current menu and pricing.');
  } catch (error) {
    setStatus('Unable to load the menu files. Open this page through the website, not as a local file.', true);
  }
}

loadData();
