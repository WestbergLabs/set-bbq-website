(function () {
  const STORAGE_KEY = 'set-bbq-test-form-v1';

  const defaultData = {
    eventName: 'Test BBQ Event',
    guestCount: '25',
    eventDate: '2026-10-31',
    eventTime: '17:00',
    eventAddress: '123 Test Street, Merrill, WI 54452',
    contactName: 'Test Customer',
    phone: '(715) 555-0100',
    email: '4thehalibit@gmail.com',
    confirmEmail: '4thehalibit@gmail.com',
    specialRequests: 'TEST ORDER - Please disregard.',
    delivery: false,
    quantities: {
      brisket: 1,
      wings: 1,
      'baked-beans': 1
    },
    options: {
      'brisket::10–14 lbs': true,
      'wings::Mild': true,
      'baked-beans::Bacon': true
    }
  };

  const load = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || defaultData;
    } catch {
      return defaultData;
    }
  };

  const save = (data) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  };

  const readForm = () => {
    const data = load();
    ['eventName','guestCount','eventDate','eventTime','eventAddress','contactName','phone','email','confirmEmail','specialRequests']
      .forEach((id) => {
        const el = document.getElementById(id);
        if (el) data[id] = el.value;
      });

    const delivery = document.querySelector('[data-delivery-toggle]');
    if (delivery) data.delivery = delivery.checked;

    data.quantities = {};
    document.querySelectorAll('[data-quantity-key]').forEach((input) => {
      if (!input.dataset.optionKey && input.value) data.quantities[input.dataset.itemId] = input.value;
    });

    data.options = {};
    document.querySelectorAll('.option-checkbox').forEach((input) => {
      const key = `${input.dataset.optionItem}::${input.dataset.optionKey}`;
      data.options[key] = input.checked;
    });

    save(data);
  };

  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value ?? '';
  };

  const restore = () => {
    const data = load();
    setValue('eventName', data.eventName);
    setValue('guestCount', data.guestCount);
    setValue('eventDate', data.eventDate);
    setValue('eventTime', data.eventTime);
    setValue('eventAddress', data.eventAddress);
    setValue('contactName', data.contactName);
    setValue('phone', data.phone);
    setValue('email', data.email);
    setValue('confirmEmail', data.confirmEmail);
    setValue('specialRequests', data.specialRequests);

    const delivery = document.querySelector('[data-delivery-toggle]');
    if (delivery) {
      delivery.checked = !!data.delivery;
      delivery.dispatchEvent(new Event('change', { bubbles: true }));
    }

    Object.entries(data.quantities || {}).forEach(([itemId, quantity]) => {
      const input = document.querySelector(`[data-quantity-key="${CSS.escape(itemId)}"]`);
      if (!input) return;
      input.value = quantity;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    Object.entries(data.options || {}).forEach(([key, checked]) => {
      const [itemId, optionKey] = key.split('::');
      const input = Array.from(document.querySelectorAll('.option-checkbox')).find((el) =>
        el.dataset.optionItem === itemId && el.dataset.optionKey === optionKey
      );
      if (!input) return;
      input.checked = !!checked;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    window.setTimeout(readForm, 0);
  };

  const addClearButton = () => {
    const actions = document.querySelector('.summary-actions');
    if (!actions || actions.querySelector('[data-clear-test-data]')) return;
    const link = document.createElement('button');
    link.type = 'button';
    link.textContent = 'Clear saved test data';
    link.dataset.clearTestData = 'true';
    link.style.cssText = 'margin-top:.65rem;background:none;border:0;padding:0;font-size:.78rem;color:#777;text-decoration:underline;cursor:pointer;';
    link.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    });
    actions.appendChild(link);
  };

  document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver(() => {
      if (document.querySelector('[data-order-categories] .item-quantity')) {
        restore();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    addClearButton();

    document.querySelectorAll('#order-form input, #order-form textarea').forEach((el) => {
      el.addEventListener('input', readForm);
      el.addEventListener('change', readForm);
    });
  });
}());
