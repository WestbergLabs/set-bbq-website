(function () {
  const config = window.SET_EMAIL_CONFIG || {};

  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const money = (value) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD'
  }).format(Number(value || 0));

  function orderNumber() {
    const now = new Date();
    const p = (v) => String(v).padStart(2, '0');
    const stamp = `${String(now.getFullYear()).slice(-2)}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
    const suffix = Math.random().toString(36).slice(2, 4).toUpperCase();
    return `SET-${stamp}-${suffix}`;
  }

  function dateTime(dateValue, timeValue) {
    if (!dateValue) return '—';
    const d = new Date(`${dateValue}T${timeValue || '00:00'}:00`);
    return Number.isNaN(d.getTime()) ? dateValue : d.toLocaleString('en-US', {
      dateStyle: 'medium', ...(timeValue ? { timeStyle: 'short' } : {})
    });
  }

  function getOrder() {
    const items = window.buildOrderItems();
    const totals = window.calculateSubtotals(items);
    const deliveryFee = window.orderState.deliverySelected ? window.orderState.prices.deliveryFee : 0;
    return {
      orderNumber: orderNumber(),
      eventName: document.getElementById('eventName').value.trim(),
      guestCount: Number(document.getElementById('guestCount').value),
      eventDate: document.getElementById('eventDate').value,
      eventTime: document.getElementById('eventTime').value,
      eventAddress: document.getElementById('eventAddress').value.trim(),
      contactName: document.getElementById('contactName').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      email: document.getElementById('email').value.trim(),
      deliveryRequired: window.orderState.deliverySelected,
      deliveryFee,
      specialRequests: document.getElementById('specialRequests').value.trim(),
      items,
      subtotalMeats: totals.meats,
      subtotalSides: totals.sides,
      subtotalDesserts: totals.desserts,
      total: totals.meats + totals.sides + totals.desserts + deliveryFee
    };
  }

  function invoiceHtml(order) {
    const rows = order.items.map((item) => `
      <tr>
        <td style="padding:9px 8px;border-bottom:1px solid #ddd">${esc(item.item_name)}${item.option ? `<div style="font-size:12px;color:#666;margin-top:3px">${esc(item.option)}</div>` : ''}</td>
        <td align="center" style="padding:9px 8px;border-bottom:1px solid #ddd">${esc(item.quantity)}</td>
        <td style="padding:9px 8px;border-bottom:1px solid #ddd">${esc(item.unit || '—')}</td>
        <td align="right" style="padding:9px 8px;border-bottom:1px solid #ddd">${money(item.unit_price)}</td>
        <td align="right" style="padding:9px 8px;border-bottom:1px solid #ddd">${money(item.line_total)}</td>
      </tr>`).join('');

    return `<div style="font-family:Arial,Helvetica,sans-serif;background:#f5f2ee;padding:24px;color:#202020">
      <div style="max-width:760px;margin:0 auto;background:#fff;border:1px solid #d8d8d8">
        <div style="padding:24px 28px 18px;border-bottom:2px solid #7a1f1f">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td><div style="font-size:20px;font-weight:800;color:#7a1f1f;letter-spacing:.02em">SOUTH EAST TEXAS BBQ &amp; CATERING</div></td>
            <td align="right"><div style="font-size:15px;font-weight:800">CATERING ORDER</div><div style="font-size:12px;color:#666;margin-top:4px">#${esc(order.orderNumber)}</div></td>
          </tr></table>
        </div>
        <div style="padding:18px 28px">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td width="33%" valign="top"><div style="font-size:10px;font-weight:800;color:#777;letter-spacing:.08em">CUSTOMER</div><div style="margin-top:7px;font-weight:700">${esc(order.contactName)}</div><div style="margin-top:4px">${esc(order.phone)}</div><div style="margin-top:4px">${esc(order.email)}</div></td>
            <td width="33%" valign="top"><div style="font-size:10px;font-weight:800;color:#777;letter-spacing:.08em">EVENT</div><div style="margin-top:7px;font-weight:700">${esc(order.eventName)}</div><div style="margin-top:4px">${esc(dateTime(order.eventDate, order.eventTime))}</div><div style="margin-top:4px">${esc(order.guestCount)} guests</div></td>
            <td width="34%" valign="top"><div style="font-size:10px;font-weight:800;color:#777;letter-spacing:.08em">VENUE / DELIVERY</div><div style="margin-top:7px">${esc(order.eventAddress)}</div><div style="margin-top:4px">${order.deliveryRequired ? 'Delivery required' : 'Pickup / no delivery'}</div></td>
          </tr></table>
        </div>
        <div style="padding:0 28px 24px">
          <div style="font-size:11px;font-weight:800;letter-spacing:.08em;color:#777;margin-bottom:8px">ORDER ITEMS</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px">
            <thead><tr style="background:#7a1f1f;color:#fff"><th align="left" style="padding:9px 8px">ITEM</th><th align="center" style="padding:9px 8px">QTY</th><th align="left" style="padding:9px 8px">SIZE / UNIT</th><th align="right" style="padding:9px 8px">UNIT</th><th align="right" style="padding:9px 8px">TOTAL</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          ${order.specialRequests ? `<div style="margin-top:18px;padding-top:13px;border-top:1px solid #ddd"><div style="font-size:10px;font-weight:800;color:#777;letter-spacing:.08em">SPECIAL REQUESTS</div><div style="margin-top:7px;white-space:pre-wrap">${esc(order.specialRequests)}</div></div>` : ''}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;font-size:13px">
            <tr><td align="right">BBQ Catering Subtotal</td><td align="right" width="120">${money(order.subtotalMeats + order.subtotalSides)}</td></tr>
            <tr><td align="right" style="padding-top:5px">Desserts Subtotal</td><td align="right" style="padding-top:5px">${money(order.subtotalDesserts)}</td></tr>
            <tr><td align="right" style="padding-top:5px">Delivery</td><td align="right" style="padding-top:5px">${money(order.deliveryFee)}</td></tr>
            <tr><td colspan="2"><div style="border-top:2px solid #7a1f1f;margin-top:8px"></div></td></tr>
            <tr><td align="right" style="padding-top:8px;font-size:16px;font-weight:800">ORDER TOTAL</td><td align="right" style="padding-top:8px;font-size:16px;font-weight:800">${money(order.total)}</td></tr>
          </table>
        </div>
        <div style="padding:13px 28px;background:#f7f7f7;border-top:1px solid #ddd;font-size:11px;color:#666">This is a catering request. The order is not confirmed until SET BBQ &amp; Catering has reviewed the request and contacted the customer.</div>
      </div>
    </div>`;
  }

  async function logoBytes() {
    const response = await fetch('images/logo/SET_Logo.png');
    if (!response.ok) return null;
    return new Uint8Array(await response.arrayBuffer());
  }

  async function makePdf(order) {
    if (!window.PDFLib) throw new Error('The invoice PDF library did not load. Please refresh and try again.');
    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const red = rgb(.48, .12, .12);
    const black = rgb(0, 0, 0);
    const gray = rgb(.35, .35, .35);
    const light = rgb(.95, .95, .95);
    const white = rgb(1, 1, 1);
    const line = rgb(.84, .84, .84);
    const text = (v, x, y, size = 9, font = regular, color = black) => page.drawText(String(v ?? ''), { x, y, size, font, color });
    const moneyPdf = (v) => `$${Number(v || 0).toFixed(2)}`;

    try {
      const bytes = await logoBytes();
      if (bytes) {
        const logo = await pdf.embedPng(bytes);
        const scaled = logo.scale(.16);
        page.drawImage(logo, { x: 34, y: 706, width: Math.min(175, scaled.width), height: Math.min(52, scaled.height) });
      } else {
        text('SOUTH EAST TEXAS BBQ & CATERING', 34, 748, 16, bold, red);
      }
    } catch {
      text('SOUTH EAST TEXAS BBQ & CATERING', 34, 748, 16, bold, red);
    }

    text('CATERING ORDER', 433, 750, 12, bold);
    text(`#${order.orderNumber}`, 433, 734, 9, regular, gray);
    text('Request', 433, 720, 8, regular, gray);
    page.drawLine({ start: { x: 34, y: 694 }, end: { x: 578, y: 694 }, color: red, width: 1.5 });

    page.drawRectangle({ x: 34, y: 626, width: 544, height: 54, color: light, borderColor: line, borderWidth: .5 });
    text('CUSTOMER', 41, 667, 7, bold, gray); text(order.contactName, 41, 651, 8); text(order.phone, 41, 639, 8); text(order.email, 41, 627, 8);
    text('EVENT', 226, 667, 7, bold, gray); text(order.eventName, 226, 651, 8); text(dateTime(order.eventDate, order.eventTime), 226, 639, 8); text(`${order.guestCount} guests`, 226, 627, 8);
    text('VENUE / DELIVERY', 411, 667, 7, bold, gray); text(order.eventAddress.slice(0, 42), 411, 651, 8); text(order.deliveryRequired ? 'Delivery required' : 'Pickup / no delivery', 411, 639, 8);

    text('ORDER ITEMS', 34, 604, 10, bold);
    page.drawRectangle({ x: 34, y: 564, width: 544, height: 20, color: red });
    const xs = [34, 205, 240, 320, 425, 478];
    ['ITEM', 'QTY', 'SIZE / UNIT', 'OPTIONS', 'UNIT', 'TOTAL'].forEach((v, i) => text(v, xs[i] + 4, 571, 7, bold, white));

    let y = 549;
    for (const item of order.items) {
      if (y < 160) break;
      text(item.item_name, 38, y, 7.5);
      text(String(item.quantity).replace(/\.00$/, ''), 244, y, 7.5);
      text((item.unit || '').slice(0, 15), 324, y, 7.5);
      text((item.option || '').slice(0, 21), 429, y, 7.5);
      text(moneyPdf(item.unit_price), 482, y, 7.5);
      text(moneyPdf(item.line_total), 528, y, 7.5);
      page.drawLine({ start: { x: 34, y: y - 4 }, end: { x: 578, y: y - 4 }, color: line, width: .3 });
      y -= 19;
    }

    y -= 8;
    if (order.specialRequests) {
      text('SPECIAL REQUESTS', 34, y, 9, bold, gray);
      y -= 14;
      text(order.specialRequests.slice(0, 180), 34, y, 8);
      y -= 22;
    }

    const totals = [
      ['BBQ Catering Subtotal', Number(order.subtotalMeats || 0) + Number(order.subtotalSides || 0)],
      ['Desserts Subtotal', Number(order.subtotalDesserts || 0)],
      ['Delivery', Number(order.deliveryFee || 0)],
      ['ORDER TOTAL', Number(order.total || 0)]
    ];
    let ty = Math.max(y, 125);
    totals.forEach((row, index) => {
      if (index === 3) page.drawLine({ start: { x: 368, y: ty + 7 }, end: { x: 578, y: ty + 7 }, color: red, width: 1.2 });
      text(row[0], 368, ty, index === 3 ? 10 : 8.5, index === 3 ? bold : regular);
      text(moneyPdf(row[1]), 520, ty, index === 3 ? 10 : 8.5, index === 3 ? bold : regular);
      ty -= 17;
    });

    return pdf.save();
  }

  async function submitOrder() {
    const message = document.querySelector('[data-order-message]');
    const form = document.getElementById('order-form');
    const button = form?.querySelector('button[type="submit"]');
    if (!form || !button || window.orderState.submitting) return;
    window.orderState.submitting = true;

    try {
      const order = getOrder();
      if (message) message.textContent = 'Preparing your invoice…';
      button.disabled = true;
      button.textContent = 'Preparing...';

      const pdfBytes = await makePdf(order);
      const configured = config.publicKey && config.serviceId && config.businessTemplateId && config.customerTemplateId && !String(config.publicKey).startsWith('YOUR_');
      if (!configured || !window.emailjs) {
        throw new Error('EmailJS is not configured yet. Create the EmailJS service/templates, then add their IDs to js/emailjs-config.js.');
      }

      if (message) message.textContent = 'Sending your order…';
      button.textContent = 'Sending...';
      window.emailjs.init({ publicKey: config.publicKey });

      const params = {
        order_number: order.orderNumber,
        business_email: config.businessEmail,
        customer_email: order.email,
        customer_name: order.contactName,
        reply_to: order.email,
        invoice_html: invoiceHtml(order),
        event_name: order.eventName,
        event_date: dateTime(order.eventDate, order.eventTime),
        total: money(order.total)
      };

      await window.emailjs.send(config.serviceId, config.businessTemplateId, params);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await window.emailjs.send(config.serviceId, config.customerTemplateId, params);

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${order.orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      document.querySelector('main').innerHTML = `<section class="masthead"><div class="container"><div class="eyebrow">Order Received</div><h1>Thank you for your order!</h1><p class="page-intro">Your invoice <strong>${esc(order.orderNumber)}.pdf</strong> has been downloaded and confirmation emails have been sent.</p><p class="page-intro"><strong>Need to make a change?</strong> Please call or email <a href="mailto:${esc(config.businessEmail)}">${esc(config.businessEmail)}</a>.</p></div></section><section class="section"><div class="container"><div class="card"><div class="section-head"><div class="kicker">Invoice</div><h2>Your Invoice</h2></div><div style="height:75vh;min-height:600px"><iframe src="${url}" title="Your catering invoice" style="width:100%;height:100%;border:1px solid #ddd;border-radius:4px"></iframe></div><p style="margin-top:1rem"><a href="${url}" download="${esc(order.orderNumber)}.pdf">Download Invoice Again</a></p></div></div></section>`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if (message) {
        message.textContent = error?.message || 'We could not submit your order. Please try again.';
        message.classList.add('form-error');
        message.scrollIntoView({ block: 'center' });
      }
      button.disabled = false;
      button.textContent = 'Place Order';
      window.orderState.submitting = false;
    }
  }

  window.submitOrder = submitOrder;
}());