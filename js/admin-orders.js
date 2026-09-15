(() => {
  const auth = window.SET_ADMIN_AUTH;
  const api = window.SET_ADMIN_AUTH_API;
  if (!auth || !api) return;

  const body = document.getElementById('orders-body');
  const count = document.getElementById('order-count');
  const search = document.getElementById('order-search');
  const message = document.getElementById('orders-message');
  const modal = document.getElementById('order-modal');
  const detail = document.getElementById('order-detail-content');
  const modalTitle = document.getElementById('order-modal-title');
  let orders = [];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const money = value => Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const dateTime = value => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const dateOnly = value => value ? new Date(value).toLocaleDateString([], { dateStyle: 'medium' }) : '—';

  function visibleOrders() {
    const q = search.value.trim().toLowerCase();
    return orders.filter(o => {
      const haystack = [o.order_number, o.contact_name, o.email, o.phone, o.event_name, o.venue_address].join(' ').toLowerCase();
      return !q || haystack.includes(q);
    });
  }

  function render() {
    const rows = visibleOrders();
    count.textContent = rows.length === orders.length ? `${orders.length} order${orders.length === 1 ? '' : 's'}` : `${rows.length} of ${orders.length} orders`;
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="6" class="orders-empty">No orders match your search.</td></tr>';
      return;
    }
    body.innerHTML = rows.map(o => `
      <tr class="order-row" data-order-id="${esc(o.id)}" tabindex="0">
        <td><strong>${esc(o.order_number)}</strong><small>${esc(dateTime(o.created_at))}</small></td>
        <td><strong>${esc(o.contact_name)}</strong><small>${esc(o.email)}</small></td>
        <td>${esc(o.event_name || '—')}</td>
        <td>${esc(dateOnly(o.event_date))}</td>
        <td>${esc(o.guest_count || '—')}</td>
        <td><strong>${money(o.total)}</strong></td>
      </tr>`).join('');
  }

  function showOrder(o) {
    modalTitle.textContent = o.order_number || 'Order Details';
    const items = o.order_items || [];
    const itemRows = items.length ? items.map(i => `
      <tr>
        <td><strong>${esc(i.item_name)}</strong>${i.option ? `<small>${esc(i.option)}</small>` : ''}</td>
        <td>${esc(i.category || '—')}</td>
        <td>${esc(i.quantity)}</td>
        <td>${esc(i.unit || '—')}</td>
        <td>${money(i.unit_price)}</td>
        <td><strong>${money(i.line_total)}</strong></td>
      </tr>`).join('') : '<tr><td colspan="6">No line items found.</td></tr>';

    detail.innerHTML = `
      <div class="order-detail-grid">
        <div><span class="detail-label">Customer</span><strong>${esc(o.contact_name)}</strong></div>
        <div><span class="detail-label">Email</span><a href="mailto:${esc(o.email)}">${esc(o.email)}</a></div>
        <div><span class="detail-label">Phone</span><span>${esc(o.phone || '—')}</span></div>
        <div><span class="detail-label">Event</span><span>${esc(o.event_name || '—')}</span></div>
        <div><span class="detail-label">Guests</span><span>${esc(o.guest_count || '—')}</span></div>
        <div><span class="detail-label">Event date</span><span>${esc(dateTime(o.event_date))}</span></div>
        <div><span class="detail-label">Order received</span><span>${esc(dateTime(o.created_at))}</span></div>
        <div class="detail-wide"><span class="detail-label">Venue / Address</span><span>${esc(o.venue_address || '—')}</span></div>
        <div class="detail-wide"><span class="detail-label">Delivery</span><span>${o.delivery_required ? `Required — ${money(o.delivery_fee)}` : 'Pickup / no delivery'}</span></div>
      </div>
      <h3 class="order-detail-heading">Order Items</h3>
      <div class="order-items-wrap">
        <table class="order-items-table">
          <thead><tr><th>Item</th><th>Category</th><th>Qty</th><th>Unit</th><th>Price</th><th>Total</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>
      <div class="order-totals">
        <div><span>Meats</span><span>${money(o.subtotal_meats)}</span></div>
        <div><span>Sides</span><span>${money(o.subtotal_sides)}</span></div>
        <div><span>Desserts</span><span>${money(o.subtotal_desserts)}</span></div>
        <div><span>Delivery</span><span>${money(o.delivery_fee)}</span></div>
        <div class="order-grand-total"><strong>Total</strong><strong>${money(o.total)}</strong></div>
      </div>
      ${o.special_requests ? `<div class="order-note"><span class="detail-label">Special Requests</span><p>${esc(o.special_requests)}</p></div>` : ''}
      ${o.admin_notes ? `<div class="order-note"><span class="detail-label">Admin Notes</span><p>${esc(o.admin_notes)}</p></div>` : ''}
    `;
    modal.hidden = false;
    document.body.classList.add('modal-open');
  }

  async function loadOrders() {
    message.textContent = 'Loading…';
    body.innerHTML = '<tr><td colspan="6" class="orders-empty">Loading orders…</td></tr>';
    try {
      const user = await api.checkSession();
      if (!user) { window.location.href = 'admin.html'; return; }
      const { data, error } = await auth
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      orders = data || [];
      render();
      message.textContent = '';
    } catch (error) {
      body.innerHTML = '<tr><td colspan="6" class="orders-empty">Unable to load orders.</td></tr>';
      message.textContent = error?.message || 'Unable to load orders.';
      message.className = 'admin-message error';
    }
  }

  body.addEventListener('click', e => {
    const row = e.target.closest('.order-row');
    if (row) showOrder(orders.find(o => o.id === row.dataset.orderId));
  });
  body.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.order-row')) {
      e.preventDefault();
      showOrder(orders.find(o => o.id === e.target.closest('.order-row').dataset.orderId));
    }
  });
  search.addEventListener('input', render);
  document.getElementById('refresh-orders').addEventListener('click', loadOrders);
  document.getElementById('close-order-modal').addEventListener('click', () => { modal.hidden = true; document.body.classList.remove('modal-open'); });
  modal.addEventListener('click', e => { if (e.target === modal) { modal.hidden = true; document.body.classList.remove('modal-open'); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) { modal.hidden = true; document.body.classList.remove('modal-open'); } });
  document.getElementById('admin-logout').addEventListener('click', async () => { await api.signOut(); window.location.href = 'admin.html'; });
  loadOrders();
})();