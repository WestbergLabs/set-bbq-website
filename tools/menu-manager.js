const state = { menu: null, prices: null };

const $ = (id) => document.getElementById(id);

function money(value) {
  return Number(value || 0).toFixed(2);
}

function setStatus(message, isError = false) {
  const el = $('status');
  el.textContent = message;
  el.style.color = isError ? '#a40000' : '#333';
}

async function loadData() {
  try {
    const [menuResponse, pricesResponse] = await Promise.all([
      fetch('../data/menu.json'),
      fetch('../data/prices.json')
    ]);
    if (!menuResponse.ok || !pricesResponse.ok) throw new Error('Could not load menu data.');
    state.menu = await menuResponse.json();
    state.prices = await pricesResponse.json();
    $('deliveryFee').value = state.prices.deliveryFee ?? 0;
    render();
    setStatus('Loaded current menu and pricing.');
  } catch (error) {
    setStatus('Unable to load the menu files. Open this page through the website, not as a local file.', true);
  }
}

function getPrice(item) {
  return state.prices.items[item.priceKey] || { basePrice: 0 };
}

function optionData(item) {
  const menuOptions = item.pricing?.options || [];
  const priceOptions = getPrice(item).adjustments || [];
  const labels = menuOptions.length
    ? menuOptions.map((o) => o.label)
    : item.orderOptions || priceOptions.map((o) => o.label);
  return labels.map((label) => {
    const menuOption = menuOptions.find((o) => o.label === label);
    const priceOption = priceOptions.find((o) => o.label === label);
    return {
      label,
      adjustment: menuOption?.adjustment ?? priceOption?.value ?? 0
    };
  });
}

function render() {
  const editor = $('editor');
  editor.innerHTML = '';

  state.menu.categories.forEach((category, categoryIndex) => {
    const section = document.createElement('section');
    section.className = 'category';
    section.innerHTML = '<div class="category-header"><h2></h2><p></p></div>';
    section.querySelector('h2').textContent = category.name;
    section.querySelector('p').textContent = category.description || '';

    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    const table = document.createElement('table');
    table.innerHTML = `
      <thead><tr>
        <th>Item</th><th>Description</th><th>Unit / Size</th><th>Base Price</th><th>Customer Options / Adjustments</th>
      </tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    category.items.forEach((item, itemIndex) => {
      const price = getPrice(item);
      const tr = document.createElement('tr');
      tr.dataset.category = categoryIndex;
      tr.dataset.item = itemIndex;
      const options = optionData(item);

      tr.innerHTML = `
        <td class="name"><input data-field="name"></td>
        <td class="description"><textarea data-field="description"></textarea></td>
        <td class="unit"><input data-field="unit"></td>
        <td class="price"><input data-field="price" type="number" min="0" step="0.01"></td>
        <td class="options">
          <div class="option-label">Label — adjustment</div>
          <div class="option-list"></div>
        </td>`;

      tr.querySelector('[data-field="name"]').value = item.name;
      tr.querySelector('[data-field="description"]').value = item.description || '';
      tr.querySelector('[data-field="unit"]').value = item.unit || '';
      tr.querySelector('[data-field="price"]').value = price.basePrice ?? 0;

      const optionList = tr.querySelector('.option-list');
      options.forEach((option, optionIndex) => {
        const row = document.createElement('div');
        row.className = 'option-row';
        row.innerHTML = `
          <input class="option-label-input" placeholder="Option" aria-label="Option label">
          <input class="option-adjustment" type="number" step="0.01" aria-label="Option price adjustment">
        `;
        row.querySelector('.option-label-input').value = option.label;
        row.querySelector('.option-adjustment').value = option.adjustment;
        row.dataset.optionIndex = optionIndex;
        optionList.appendChild(row);
      });

      tbody.appendChild(tr);
    });

    wrap.appendChild(table);
    section.appendChild(wrap);
    editor.appendChild(section);
  });

  editor.querySelectorAll('input, textarea').forEach((input) => {
    input.addEventListener('input', markDirty);
  });
}

function markDirty() {
  setStatus('Unsaved edits — download the changed JSON file(s) when finished.');
}

function syncState() {
  state.prices.deliveryFee = Number($('deliveryFee').value || 0);

  document.querySelectorAll('tbody tr').forEach((row) => {
    const category = state.menu.categories[Number(row.dataset.category)];
    const item = category.items[Number(row.dataset.item)];
    const price = getPrice(item);

    item.name = row.querySelector('[data-field="name"]').value.trim();
    item.description = row.querySelector('[data-field="description"]').value.trim();
    item.unit = row.querySelector('[data-field="unit"]').value.trim();
    price.basePrice = Number(row.querySelector('[data-field="price"]').value || 0);

    const optionRows = [...row.querySelectorAll('.option-row')];
    const options = optionRows.map((optionRow) => ({
      label: optionRow.querySelector('.option-label-input').value.trim(),
      adjustment: Number(optionRow.querySelector('.option-adjustment').value || 0)
    })).filter((option) => option.label);

    if (options.length) {
      item.orderOptions = options.map((o) => o.label);
      item.pricing = {
        type: 'adjustment',
        options: options.map((o) => ({ label: o.label, adjustment: o.adjustment }))
      };
      price.adjustments = options.map((o) => ({ label: o.label, value: o.adjustment }));
    } else {
      delete item.orderOptions;
      delete item.pricing;
      delete price.adjustments;
    }
  });
}

function download(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
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

loadData();
