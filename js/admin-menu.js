(() => {
  const state = { menu: null, prices: null };

  const $ = (selector) => document.querySelector(selector);
  const money = (value) => Number(value || 0).toFixed(2);
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[char]));

  function setMessage(text, type = '') {
    const el = $('#menu-editor-message');
    if (!el) return;
    el.textContent = text;
    el.className = `admin-message ${type}`.trim();
  }

  function slugify(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function uniqueId(base) {
    let id = base || 'menu-item';
    let n = 2;
    const ids = new Set(state.menu.categories.flatMap((category) => category.items.map((item) => item.id)));
    while (ids.has(id)) id = `${base}-${n++}`;
    return id;
  }

  function getOptionGroups(item) {
    if (item.pricing?.groups?.length) return item.pricing.groups;
    if (item.pricing?.options?.length) return [{ label: 'Options', options: item.pricing.options }];
    if (item.orderOptions?.length) {
      return [{ label: 'Options', options: item.orderOptions.map((label) => ({ label, adjustment: 0 })) }];
    }
    return [];
  }

  function groupLabelText(group) {
    const scope = group.appliesTo?.length ? ` [${group.appliesTo.join(', ')}]` : '';
    return `${group.label || 'Options'}${scope}`;
  }

  // "Cookies [Regular Banana Pudding]" limits a group to the primary options it names.
  function parseGroupLabel(text) {
    const match = text.match(/^(.*?)\s*\[(.*)\]$/);
    if (!match) return { label: text.trim() || 'Options', appliesTo: [] };
    return {
      label: match[1].trim() || 'Options',
      appliesTo: match[2].split(',').map((entry) => entry.trim()).filter(Boolean)
    };
  }

  function optionText(item) {
    return getOptionGroups(item).map((group) => {
      const lines = [];
      if (group.label && group.label !== 'Options') lines.push(`Group: ${groupLabelText(group)}`);
      (group.options || []).forEach((option) => {
        lines.push(`${option.label} | ${Number(option.adjustment || 0)}`);
      });
      return lines.join('\n');
    }).join('\n');
  }

  function parseOptions(text) {
    const groups = [];
    let current = { label: 'Options', appliesTo: [], options: [] };

    text.split('\n').map((line) => line.trim()).filter(Boolean).forEach((line) => {
      const groupMatch = line.match(/^group\s*:\s*(.+)$/i);
      if (groupMatch) {
        if (current.options.length) groups.push(current);
        current = { ...parseGroupLabel(groupMatch[1]), options: [] };
        return;
      }

      const [labelPart, adjustmentPart = '0'] = line.split('|');
      const label = labelPart.trim();
      if (!label) return;

      current.options.push({
        label,
        adjustment: Number(adjustmentPart.trim().replace(/[^0-9.-]/g, '')) || 0
      });
    });

    if (current.options.length) groups.push(current);
    groups.forEach((group) => { if (!group.appliesTo?.length) delete group.appliesTo; });
    return groups;
  }

  function applyOptions(item, price, groups) {
    if (!groups.length) {
      delete item.pricing;
      delete item.orderOptions;
      delete price.adjustments;
      return;
    }

    if (groups.length === 1 && groups[0].label === 'Options') {
      item.pricing = { type: 'adjustment', options: groups[0].options };
    } else {
      item.pricing = { type: 'groups', groups };
    }

    delete item.orderOptions;
    price.adjustments = groups.flatMap((group) =>
      group.options.map((option) => ({
        label: option.label,
        value: option.adjustment
      }))
    );
  }

  function render() {
    const container = $('#menu-editor');
    if (!container || !state.menu || !state.prices) return;

    const rows = [];
    state.menu.categories.forEach((category, categoryIndex) => {
      rows.push(`
        <tr class="menu-category-row">
          <th colspan="8">
            <div class="category-row-head">
              <div>
                <div class="category-title">${escapeHTML(category.name)}</div>
                <input class="menu-category-description" data-category-index="${categoryIndex}"
                  value="${escapeHTML(category.description || '')}" aria-label="Category description">
              </div>
              <button type="button" class="add-item-button" data-add-category="${categoryIndex}">+ Add Item</button>
            </div>
          </th>
        </tr>`);

      category.items.forEach((item, itemIndex) => {
        const price = state.prices.items[item.priceKey]?.basePrice ?? 0;
        rows.push(`
          <tr data-category-index="${categoryIndex}" data-item-index="${itemIndex}">
            <td class="menu-order"><span>${itemIndex + 1}</span><div class="order-controls">
              <button type="button" class="move-item" data-direction="up" aria-label="Move ${escapeHTML(item.name)} up" ${itemIndex === 0 ? "disabled" : ""}>↑</button>
              <button type="button" class="move-item" data-direction="down" aria-label="Move ${escapeHTML(item.name)} down" ${itemIndex === category.items.length - 1 ? "disabled" : ""}>↓</button>
            </div></td>
            <td><input class="menu-name" value="${escapeHTML(item.name)}" aria-label="Item name"></td>
            <td><input class="menu-unit" value="${escapeHTML(item.unit || '')}" aria-label="Unit"></td>
            <td><input class="menu-price" type="number" min="0" step="0.01" value="${money(price)}" aria-label="Price"></td>
            <td><textarea class="menu-options" rows="1" placeholder="Group: Flavor&#10;Option | adjustment&#10;Group: Cookies&#10;Option | adjustment">${escapeHTML(optionText(item))}</textarea></td>
            <td><textarea class="menu-description" rows="1" aria-label="Description">${escapeHTML(item.description || '')}</textarea></td>
            <td class="menu-id">${escapeHTML(item.id)}</td>
            <td class="menu-delete-cell"><button type="button" class="delete-item" aria-label="Delete ${escapeHTML(item.name)}">Delete</button></td>
          </tr>`);
      });
    });

    container.innerHTML = `
      <div class="editor-toolbar">
        <div>
          <strong>Menu & Prices</strong>
          <span class="editor-help">Edit the fields below, then save all changes.</span>
        </div>
        <div class="toolbar-actions">
          <label class="delivery-price">Delivery fee $<input id="delivery-fee" type="number" min="0" step="0.01" value="${money(state.prices.deliveryFee)}"></label>
          <button id="add-item-top" type="button" class="add-item-button">+ Add Item</button>
        </div>
      </div>
      <div class="menu-table-wrap">
        <table class="menu-editor-table">
          <colgroup>
            <col class="col-order">
            <col class="col-item">
            <col class="col-unit">
            <col class="col-price">
            <col class="col-options">
            <col class="col-description">
            <col class="col-id">
            <col class="col-actions">
          </colgroup>
          <thead><tr><th>#</th><th>Item</th><th>Unit</th><th>Price</th><th>Options</th><th>Description</th><th>ID</th><th></th></tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>
      <div class="editor-actions">
        <button id="save-menu" type="button">Save Changes</button>
        <button id="reload-menu" class="secondary" type="button">Discard Changes</button>
      </div>
      <div id="menu-editor-message" class="admin-message" aria-live="polite"></div>
      <p class="editor-help">Options use <code>Option name | price adjustment</code>. To create separate option groups, add <code>Group: Group Name</code> on its own line. Write <code>Group: Cookies [Flavor A, Flavor B]</code> to offer that group only for those options. The adjustment is added to the base price.</p>
      <div id="add-item-modal" class="admin-modal" hidden>
        <div class="admin-modal-card" role="dialog" aria-modal="true" aria-labelledby="add-item-title">
          <div class="admin-modal-head">
            <div>
              <div class="brand">Menu</div>
              <h2 id="add-item-title">Add Menu Item</h2>
            </div>
            <button type="button" class="modal-close" id="close-add-item" aria-label="Close">×</button>
          </div>
          <form id="add-item-form" class="add-item-form">
            <label>Category
              <select id="new-item-category">${state.menu.categories.map((category, index) => `<option value="${index}">${escapeHTML(category.name)}</option>`).join('')}</select>
            </label>
            <label>Item name<input id="new-item-name" required placeholder="Example: Smoked Ham"></label>
            <div class="form-grid">
              <label>Unit<input id="new-item-unit" placeholder="Example: 10 lbs"></label>
              <label>Base price<input id="new-item-price" type="number" min="0" step="0.01" value="0" required></label>
            </div>
            <label>Description<textarea id="new-item-description" rows="3" placeholder="Short customer-facing description"></textarea></label>
            <label>Options <span class="field-note">optional</span><textarea id="new-item-options" rows="4" placeholder="Group: Flavor&#10;Blueberry Lemon Drop | 0&#10;Strawberry | 0&#10;Group: Cookies&#10;No Cookies | 0&#10;Half Cookies | 0&#10;Regular Cookies | 0"></textarea></label>
            <div class="modal-actions">
              <button type="button" class="secondary" id="cancel-add-item">Cancel</button>
              <button type="submit">Add Item</button>
            </div>
          </form>
        </div>
      </div>`;

    $('#save-menu').addEventListener('click', save);
    $('#reload-menu').addEventListener('click', load);
    $('#add-item-top').addEventListener('click', () => openAddItem());
    document.querySelectorAll('[data-add-category]').forEach((button) => {
      button.addEventListener('click', () => openAddItem(Number(button.dataset.addCategory)));
    });
    $('#close-add-item').addEventListener('click', closeAddItem);
    $('#cancel-add-item').addEventListener('click', closeAddItem);
    $('#add-item-form').addEventListener('submit', addItem);
    document.querySelectorAll('.move-item').forEach((button) => {
      button.addEventListener('click', () => moveItem(
        Number(button.closest('tr').dataset.categoryIndex),
        Number(button.closest('tr').dataset.itemIndex),
        button.dataset.direction
      ));
    });
    document.querySelectorAll('.delete-item').forEach((button) => {
      button.addEventListener('click', () => deleteItem(
        Number(button.closest('tr').dataset.categoryIndex),
        Number(button.closest('tr').dataset.itemIndex)
      ));
    });
  }

  function moveItem(categoryIndex, itemIndex, direction) {
    const category = state.menu.categories[categoryIndex];
    if (!category) return;
    const newIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    if (newIndex < 0 || newIndex >= category.items.length) return;
    [category.items[itemIndex], category.items[newIndex]] =
      [category.items[newIndex], category.items[itemIndex]];
    render();
    setMessage('Order changed. Save Changes to make it live.');
  }

  function deleteItem(categoryIndex, itemIndex) {
    const category = state.menu.categories[categoryIndex];
    const item = category?.items[itemIndex];
    if (!item) return;
    const confirmed = window.confirm(
      `Delete "${item.name}" from the menu? This cannot be undone after you save the changes.`
    );
    if (!confirmed) return;
    category.items.splice(itemIndex, 1);
    delete state.prices.items[item.priceKey];
    render();
    setMessage(`${item.name} removed. Save Changes to make it live.`);
  }

  function openAddItem(categoryIndex = 0) {
    const modal = $('#add-item-modal');
    if (!modal) return;
    $('#new-item-category').value = String(categoryIndex);
    $('#add-item-form')?.reset();
    $('#new-item-category').value = String(categoryIndex);
    $('#new-item-price').value = '0';
    modal.hidden = false;
    $('#new-item-name').focus();
  }

  function closeAddItem() {
    const modal = $('#add-item-modal');
    if (modal) modal.hidden = true;
  }

  function addItem(event) {
    event.preventDefault();
    const categoryIndex = Number($('#new-item-category').value);
    const category = state.menu.categories[categoryIndex];
    const name = $('#new-item-name').value.trim();
    if (!category || !name) return;

    const id = uniqueId(slugify(name));
    const price = Number($('#new-item-price').value);
    if (!Number.isFinite(price) || price < 0) {
      setMessage('Enter a valid base price.', 'error');
      return;
    }

    const options = parseOptions($('#new-item-options').value);
    const item = {
      id,
      name,
      description: $('#new-item-description').value.trim(),
      unit: $('#new-item-unit').value.trim(),
      priceKey: id,
      category: category.id
    };

    if (options.length) {
      applyOptions(item, state.prices.items[id], options);
    }

    category.items.push(item);
    state.prices.items[id] = { basePrice: price };
    if (options.length) {
      state.prices.items[id].adjustments = options.map((option) => ({
        label: option.label,
        value: option.adjustment
      }));
    }

    closeAddItem();
    render();
    setMessage(`${name} added. Save Changes to make it live.`);
  }

  function readForm() {
    document.querySelectorAll('.menu-category-description').forEach((input) => {
      state.menu.categories[Number(input.dataset.categoryIndex)].description = input.value.trim();
    });

    document.querySelectorAll('.menu-editor-table tbody tr[data-item-index]').forEach((row) => {
      const category = state.menu.categories[Number(row.dataset.categoryIndex)];
      const item = category.items[Number(row.dataset.itemIndex)];
      item.name = row.querySelector('.menu-name').value.trim();
      item.unit = row.querySelector('.menu-unit').value.trim();
      item.description = row.querySelector('.menu-description').value.trim();

      const price = Number(row.querySelector('.menu-price').value);
      if (!Number.isFinite(price) || price < 0) {
        throw new Error(`Invalid price for ${item.name || item.id}.`);
      }

      state.prices.items[item.priceKey] ||= {};
      state.prices.items[item.priceKey].basePrice = price;

      const optionGroups = parseOptions(row.querySelector('.menu-options').value);
      applyOptions(item, state.prices.items[item.priceKey], optionGroups);
    });

    const deliveryFee = Number($('#delivery-fee').value);
    if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
      throw new Error('Invalid delivery fee.');
    }
    state.prices.deliveryFee = deliveryFee;
  }

  async function save() {
    const button = $('#save-menu');
    try {
      readForm();
      button.disabled = true;
      setMessage('Saving menu…');
      await window.SET_MENU_API.save(state.menu, state.prices);
      setMessage('Menu saved successfully.', 'success');
    } catch (error) {
      console.error('SET BBQ menu save error:', error);
      setMessage(error?.message || 'Unable to save menu.', 'error');
    } finally {
      button.disabled = false;
    }
  }

  async function load() {
    setMessage('Loading menu…');
    try {
      const result = await window.SET_MENU_API.load();
      state.menu = structuredClone(result.menu);
      state.prices = structuredClone(result.prices);
      render();
      setMessage(result.source === 'database'
        ? 'Loaded from the menu database.'
        : 'Database unavailable — loaded local files. Saving requires the database.');
    } catch (error) {
      setMessage(error?.message || 'Unable to load menu.', 'error');
    }
  }

  async function init() {
    await load();
  }

  window.SET_ADMIN_MENU_API = { init };
})();