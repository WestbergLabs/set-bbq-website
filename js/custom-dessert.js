(() => {
  const CUSTOM_ID = 'custom-dessert';
  const DETAILS_ID = 'customDessertDetails';

  const escAttr = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  function getCustomItem() {
    return document.querySelector(`[data-order-item="${CUSTOM_ID}"]`);
  }

  function getQuantity() {
    const item = getCustomItem();
    const input = item?.querySelector('[data-quantity-key]');
    return Math.max(0, Number.parseInt(input?.value || '0', 10) || 0);
  }

  function getDetails() {
    return document.getElementById(DETAILS_ID)?.value.trim() || '';
  }

  function refreshWarning() {
    const item = getCustomItem();
    if (!item) return;
    const detailsBox = item.querySelector('[data-custom-dessert-box]');
    if (!detailsBox) return;
    detailsBox.hidden = getQuantity() <= 0;
  }

  function injectCustomFields() {
    const item = getCustomItem();
    if (!item || item.querySelector('[data-custom-dessert-box]')) return;

    const header = item.querySelector('.order-item-header');
    if (!header) return;

    const box = document.createElement('div');
    box.dataset.customDessertBox = 'true';
    box.style.cssText = 'margin-top:12px;padding:12px 14px;border:1px solid #c98b36;border-radius:8px;background:#fff8eb;';
    box.hidden = true;
    box.innerHTML = `
      <div style="font-weight:800;margin-bottom:6px;">Custom Dessert Details</div>
      <div style="font-size:.92rem;line-height:1.45;margin-bottom:10px;">Please describe the dessert, flavors, decorations, serving style, or other details you'd like. A SET BBQ team member will reach out to discuss the available options and final pricing.</div>
      <textarea id="${DETAILS_ID}" rows="5" placeholder="Tell us as much as you can about what you have in mind..." aria-label="Custom dessert details" style="width:100%;box-sizing:border-box;resize:vertical;padding:10px;border:1px solid #cfcfcf;border-radius:6px;font:inherit;"></textarea>
      <div style="margin-top:8px;font-size:.82rem;font-weight:700;">Starting price: $40 · Final pricing will be confirmed after we discuss your custom dessert.</div>
    `;

    header.insertAdjacentElement('afterend', box);

    box.querySelector('textarea')?.addEventListener('input', () => {
      refreshWarning();
    });

    const quantityInput = item.querySelector('[data-quantity-key]');
    quantityInput?.addEventListener('input', refreshWarning);
    quantityInput?.addEventListener('change', refreshWarning);
    refreshWarning();
  }

  function enhanceSummary() {
    const item = getCustomItem();
    const summary = document.querySelector('[data-summary-list]');
    if (!item || !summary) return;

    const customRow = Array.from(summary.querySelectorAll('li')).find((row) => row.textContent.includes('Custom Dessert'));
    if (!customRow) return;

    const quantity = getQuantity();
    if (quantity <= 0) return;

    customRow.innerHTML = `<span><strong>CUSTOM DESSERT</strong> × ${quantity}<small style="display:block;margin-top:3px;color:#7a5b20;">Starting at $40 · SET BBQ will contact you</small></span><strong>$${(40 * quantity).toFixed(2)}</strong>`;
  }

  function enhance() {
    injectCustomFields();
    enhanceSummary();
  }

  function wrapBuildOrderItems() {
    if (typeof window.buildOrderItems !== 'function' || window.buildOrderItems.__customDessertWrapped) return;

    const originalBuildOrderItems = window.buildOrderItems;
    const wrapped = function (...args) {
      const items = originalBuildOrderItems.apply(this, args);
      const custom = items.find((item) => item.menu_item_id === CUSTOM_ID);
      if (custom) {
        const details = getDetails();
        custom.item_name = 'CUSTOM DESSERT — STARTING AT $40';
        custom.option = details
          ? `CUSTOM REQUEST: ${details}`
          : 'CUSTOM REQUEST — Customer will discuss details with SET BBQ';
      }
      return items;
    };
    wrapped.__customDessertWrapped = true;
    window.buildOrderItems = wrapped;
  }

  document.addEventListener('DOMContentLoaded', () => {
    wrapBuildOrderItems();
    enhance();

    const observer = new MutationObserver(() => {
      wrapBuildOrderItems();
      enhance();
    });

    const container = document.querySelector('[data-order-categories]');
    if (container) observer.observe(container, { childList: true, subtree: true });
  });
})();
