// Bridge the existing order UI state/functions to the static EmailJS submission layer.
window.orderState = orderState;
window.buildOrderItems = buildOrderItems;
window.calculateSubtotals = calculateSubtotals;

// The invoice PDF is available on the thank-you page, but it should not
// download automatically. Suppress only the programmatic PDF download used
// by the legacy submission function, then restore normal link behavior.
const emailJsSubmitOrder = window.submitOrder;
if (typeof emailJsSubmitOrder === 'function') {
  window.submitOrder = async function (...args) {
    const nativeAnchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      const isInvoiceDownload = this.download?.endsWith('.pdf') && this.href?.startsWith('blob:');
      if (isInvoiceDownload) return;
      return nativeAnchorClick.call(this);
    };

    try {
      await emailJsSubmitOrder(...args);
    } finally {
      HTMLAnchorElement.prototype.click = nativeAnchorClick;

      const intro = document.querySelector('.page-intro');
      if (intro?.textContent.includes('has been downloaded')) {
        intro.innerHTML = `Your invoice <strong>${intro.textContent.match(/SET-[A-Z0-9-]+\.pdf/)?.[0] || 'PDF'}</strong> is ready below. You can view it here or download a copy for your records. Confirmation emails have also been sent.`;
      }
    }
  };
}
