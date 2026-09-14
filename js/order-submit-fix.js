// Compatibility fix for the static EmailJS order flow.
// The submit button lives in the summary panel and is associated with the form
// via the HTML `form` attribute, so the original submit routine's form-level
// button lookup must resolve the visible button too.
(function () {
  const originalSubmitOrder = window.submitOrder;
  if (typeof originalSubmitOrder !== 'function') return;

  window.submitOrder = function (...args) {
    const form = document.getElementById('order-form');
    const visibleButton = document.querySelector('button[type="submit"][form="order-form"]');

    if (!form || !visibleButton) return originalSubmitOrder.apply(this, args);

    const originalQuerySelector = form.querySelector;
    const originalAnchorClick = HTMLAnchorElement.prototype.click;

    form.querySelector = function (selector) {
      if (selector === 'button[type="submit"]') return visibleButton;
      return originalQuerySelector.call(this, selector);
    };

    // PDF downloads are intentionally manual. Suppress the old automatic
    // download click while keeping the generated invoice available on screen.
    HTMLAnchorElement.prototype.click = function () {
      if (this.download && String(this.href || '').startsWith('blob:')) return;
      return originalAnchorClick.call(this);
    };

    const restore = () => {
      form.querySelector = originalQuerySelector;
      HTMLAnchorElement.prototype.click = originalAnchorClick;
    };

    try {
      const result = originalSubmitOrder.apply(this, args);
      if (result && typeof result.finally === 'function') {
        return result.finally(restore);
      }
      restore();
      return result;
    } catch (error) {
      restore();
      throw error;
    }
  };

  // Make EmailJS failures visible instead of falling back to a generic message.
  if (window.emailjs && typeof window.emailjs.send === 'function') {
    const originalSend = window.emailjs.send.bind(window.emailjs);
    window.emailjs.send = async function (serviceId, templateId, params) {
      try {
        return await originalSend(serviceId, templateId, params);
      } catch (error) {
        const stage = templateId === window.SET_EMAIL_CONFIG?.customerTemplateId
          ? 'Customer email'
          : 'Business email';
        const detail = error?.text || error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
        throw new Error(`${stage} failed: ${detail}`);
      }
    };
  }

  // Correct the legacy success sentence once the thank-you markup is inserted.
  const fixSuccessText = () => {
    const intro = document.querySelector('.masthead .page-intro');
    if (!intro) return;
    if (intro.textContent.includes('has been downloaded')) {
      intro.innerHTML = intro.innerHTML.replace(
        'has been downloaded and confirmation emails have been sent.',
        'is ready below. A copy of your order has also been emailed to you.'
      );
    }
  };

  const observer = new MutationObserver(fixSuccessText);
  observer.observe(document.body, { childList: true, subtree: true });
  fixSuccessText();
}());
