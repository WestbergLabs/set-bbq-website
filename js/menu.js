const menuState = {
  menu: null,
  prices: null
};

async function loadMenuData() {
  const result = await window.SET_MENU_API.load();
  menuState.menu = result.menu;
  menuState.prices = result.prices;
  return result;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
}

function getItemPrice(itemId) {
  const itemPrice = menuState.prices.items[itemId];
  return itemPrice ? itemPrice.basePrice : 0;
}

function renderMenuPage() {
  const menuContainer = document.querySelector('[data-menu-container]');
  if (!menuContainer || !menuState.menu) return;

  menuContainer.innerHTML = '';

  menuState.menu.categories.forEach((category) => {
    const section = document.createElement('section');
    section.className = 'menu-section';

    const heading = document.createElement('div');
    heading.className = 'section-head';
    heading.innerHTML = `<h2>${category.name}</h2><p>${category.description}</p>`;

    const itemList = document.createElement('div');
    itemList.className = 'menu-list';

    category.items.forEach((item) => {
      const itemPrice = getItemPrice(item.priceKey);
      const itemRow = document.createElement('div');
      itemRow.className = 'menu-item';

      let pricingHtml = '';
      if (item.pricing && item.pricing.options) {
        const options = item.pricing.options.map((option) => {
          const optionPrice = itemPrice + Number(option.adjustment || 0);
          return `<div class="menu-item-option"><span>${option.label}</span><strong>${formatCurrency(optionPrice)}</strong></div>`;
        }).join('');
        pricingHtml = `<div class="menu-item-options">${options}</div>`;
      } else if (item.unit) {
        pricingHtml = `<div class="menu-item-meta">${item.unit}</div>`;
      }

      itemRow.innerHTML = `
        <div class="menu-item-header">
          <span class="menu-item-name">${item.name}</span>
          ${item.pricing && item.pricing.options ? '' : `<span class="menu-item-price">${formatCurrency(itemPrice)}</span>`}
        </div>
        ${pricingHtml}
      `;

      itemList.appendChild(itemRow);
    });

    section.appendChild(heading);
    section.appendChild(itemList);
    menuContainer.appendChild(section);
  });
}

function initMenuPage() {
  loadMenuData().then(() => renderMenuPage());
}

document.addEventListener('DOMContentLoaded', initMenuPage);
