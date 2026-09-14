// Bridge the existing order UI state/functions to the static EmailJS submission layer.
window.orderState = orderState;
window.buildOrderItems = buildOrderItems;
window.calculateSubtotals = calculateSubtotals;

// Capture the submit event before the legacy Supabase handler can run.
// email-order.js replaces window.submitOrder with the EmailJS implementation
// after this file loads, so the handler resolves it at submit time.
const orderForm = document.getElementById('order-form');
if (orderForm) {
  orderForm.addEventListener('submit', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (typeof window.submitOrder === 'function') window.submitOrder();
  }, true);
}
