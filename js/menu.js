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
      const optionGroups = item.pricing?.groups?.length
        ? item.pricing.groups
        : (item.pricing?.options?.length ? [{ label: 'Options', options: item.pricing.options }] : []);

      if (optionGroups.length) {
        // Groups after the first are modifiers. A modifier group with appliesTo is shown
        // under each option it names, so a flavor lists only its own cookie choices.
        const modifierGroups = optionGroups.slice(1);
        const scopedGroups = modifierGroups.filter((group) => group.appliesTo?.length);
        const sharedGroups = modifierGroups.filter((group) => !group.appliesTo?.length);

        const modifierHtml = (group) => {
          const options = (group.options || []).map((option) => {
            const adjustment = Number(option.adjustment || 0);
            const priceText = adjustment ? '+' + formatCurrency(adjustment) : '';
            return '<div class="menu-item-option-sub"><span>' + option.label + '</span><strong>' + priceText + '</strong></div>';
          }).join('');
          return '<div class="menu-item-option-sub-group"><div class="menu-item-option-sub-title">' +
            (group.label || 'Options') + '</div>' + options + '</div>';
        };

        const groupHtml = (group, isPrimary) => {
          const options = (group.options || []).map((option) => {
            const adjustment = Number(option.adjustment || 0);
            const priceText = formatCurrency(itemPrice + adjustment);
            const nested = isPrimary
              ? scopedGroups.filter((entry) => entry.appliesTo.includes(option.label)).map(modifierHtml).join('')
              : '';
            return '<div class="menu-item-option"><span>' + option.label + '</span><strong>' + priceText + '</strong></div>' + nested;
          }).join('');
          return '<div class="menu-item-option-group"><div class="menu-item-option-group-title">' +
            (group.label || 'Options') + '</div>' + options + '</div>';
        };

        const groupsHtml = groupHtml(optionGroups[0], true) + sharedGroups.map((group) => groupHtml(group, false)).join('');
        pricingHtml = '<div class="menu-item-options">' + groupsHtml + '</div>';
      } else if (item.unit) {
        pricingHtml = '<div class="menu-item-meta">' + item.unit + '</div>';
      }

      itemRow.innerHTML = `
        <div class="menu-item-header">
          <span class="menu-item-name">${item.name}</span>
          ${optionGroups.length ? '' : `<span class="menu-item-price">${formatCurrency(itemPrice)}</span>`}
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
