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
    const date = `${String(now.getFullYear()).slice(-2)}${p(now.getMonth() + 1)}${p(now.getDate())}`;
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `${date}-${suffix}`;
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

  function customDessertDetails(order) {
    return order.items
      .filter((item) => item.menu_item_id === 'custom-dessert')
      .map((item) => String(item.option || '').replace(/^CUSTOM REQUEST:\s*/i, '').trim())
      .filter(Boolean);
  }

  function invoiceHtml(order) {
    const renderSection = (title, items, accent = '#7a1f1f') => {
      if (!items.length) return '';
      const rows = items.map((item) => {
        const isCustom = item.menu_item_id === 'custom-dessert';
        const itemName = isCustom ? 'CUSTOM DESSERT — STARTING AT $40' : item.item_name;
        const optionText = isCustom ? 'Final pricing to be confirmed after discussion' : item.option;
        const unitText = isCustom ? 'Starting at $40' : (item.unit || '—');
        const unitPrice = isCustom ? 40 : item.unit_price;
        return `
          <tr>
            <td style="padding:9px 8px;border-bottom:1px solid #ddd;vertical-align:top;\${isCustom ? 'font-weight:700' : ''}">${esc(itemName)}${optionText ? `<div style="font-size:12px;color:#666;margin-top:3px;font-weight:400">${esc(optionText)}</div>` : ''}</td>
            <td align="center" style="padding:9px 8px;border-bottom:1px solid #ddd;vertical-align:top">${esc(item.quantity)}</td>
            <td style="padding:9px 8px;border-bottom:1px solid #ddd;vertical-align:top">${esc(unitText)}</td>
            <td align="right" style="padding:9px 8px;border-bottom:1px solid #ddd;vertical-align:top;white-space:nowrap">${money(unitPrice)}</td>
            <td align="right" style="padding:9px 8px;border-bottom:1px solid #ddd;vertical-align:top;white-space:nowrap">${money(item.line_total)}</td>
          </tr>`;
      }).join('');

      return `
        <div style="font-size:11px;font-weight:800;letter-spacing:.08em;color:#555;margin:18px 0 8px">${esc(title)}</div>
        <table class="order-items-table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;table-layout:fixed;font-size:13px;border:1px solid #ddd">
          <colgroup>
            <col width="40%">
            <col width="9%">
            <col width="21%">
            <col width="15%">
            <col width="15%">
          </colgroup>
          <thead>
            <tr style="background:${accent};color:#fff">
              <th align="left" style="padding:9px 5px;white-space:nowrap">ITEM</th>
              <th align="center" style="padding:9px 3px;white-space:nowrap">QTY</th>
              <th align="left" style="padding:9px 4px;white-space:nowrap">SIZE / UNIT</th>
              <th align="right" style="padding:9px 4px;white-space:nowrap">UNIT</th>
              <th align="right" style="padding:9px 4px;white-space:nowrap">TOTAL</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
    };

    const bbqItems = order.items.filter((item) => item.category !== 'desserts');
    const dessertItems = order.items.filter((item) => item.category === 'desserts');
    const bbqSubtotal = Number(order.subtotalMeats || 0) + Number(order.subtotalSides || 0);
    const dessertSubtotal = Number(order.subtotalDesserts || 0);

    const customDetails = customDessertDetails(order);
    const customBlock = customDetails.length ? `
      <div style="margin-top:16px;padding:13px 14px;border:1px solid #c98b36;border-radius:6px;background:#fff8eb">
        <div style="font-size:11px;font-weight:800;letter-spacing:.08em;color:#8a621f">CUSTOM DESSERT REQUEST</div>
        <div style="margin-top:7px;font-weight:700">Final pricing will be confirmed after SET BBQ &amp; Catering discusses the request with the customer.</div>
        <div style="margin-top:8px;white-space:pre-wrap">${esc(customDetails.join('\\n\\n'))}</div>
      </div>` : '';

    const subtotalRows = [
      bbqSubtotal > 0 ? `<tr><td align="right">BBQ Catering Subtotal</td><td align="right" width="120">${money(bbqSubtotal)}</td></tr>` : '',
      dessertSubtotal > 0 ? `<tr><td align="right" style="padding-top:5px">Desserts Subtotal</td><td align="right" style="padding-top:5px">${money(dessertSubtotal)}</td></tr>` : '',
      order.deliveryFee > 0 ? `<tr><td align="right" style="padding-top:5px">Delivery</td><td align="right" style="padding-top:5px">${money(order.deliveryFee)}</td></tr>` : ''
    ].filter(Boolean).join('');

    return `<style>
@media only screen and (max-width:600px) {
  .order-meta td { display:block !important; width:100% !important; padding-right:0 !important; padding-bottom:12px !important; }
  .order-items-table { table-layout:fixed !important; }
  .order-items-table th { font-size:11px !important; }
  .order-items-table td { padding-left:4px !important; padding-right:4px !important; }
  .order-items-table col:nth-child(1) { width:37% !important; }
  .order-items-table col:nth-child(2) { width:10% !important; }
  .order-items-table col:nth-child(3) { width:18% !important; }
  .order-items-table col:nth-child(4) { width:17.5% !important; }
  .order-items-table col:nth-child(5) { width:17.5% !important; }
  .order-items-table th:nth-child(4),
  .order-items-table th:nth-child(5),
  .order-items-table td:nth-child(4),
  .order-items-table td:nth-child(5) { padding-left:6px !important; padding-right:6px !important; }
}
</style><div style="font-family:Arial,Helvetica,sans-serif;background:#f5f2ee;padding:24px;color:#202020">
      <div style="max-width:760px;margin:0 auto;background:#fff;border:1px solid #d8d8d8">
        <div style="padding:24px 28px 18px;border-bottom:2px solid #7a1f1f">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td><div style="font-size:20px;font-weight:800;color:#7a1f1f;letter-spacing:.02em">SOUTH EAST TEXAS BBQ &amp; CATERING</div></td>
            <td align="right"><div style="font-size:15px;font-weight:800">CATERING ORDER</div><div style="font-size:12px;color:#666;margin-top:4px">#${esc(order.orderNumber)}</div></td>
          </tr></table>
        </div>
        <div style="padding:18px 28px">
          <table class="order-meta" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td width="33%" valign="top" style="padding-right:14px"><div style="font-size:10px;font-weight:800;color:#777;letter-spacing:.08em">CUSTOMER</div><div style="margin-top:7px;font-weight:700">${esc(order.contactName)}</div><div style="margin-top:4px">${esc(order.phone)}</div><div style="margin-top:4px">${esc(order.email)}</div></td>
            <td width="33%" valign="top" style="padding-right:14px"><div style="font-size:10px;font-weight:800;color:#777;letter-spacing:.08em">EVENT</div><div style="margin-top:7px;font-weight:700">${esc(order.eventName)}</div><div style="margin-top:4px">${esc(dateTime(order.eventDate, order.eventTime))}</div><div style="margin-top:4px">${esc(order.guestCount)} guests</div></td>
            <td width="34%" valign="top"><div style="font-size:10px;font-weight:800;color:#777;letter-spacing:.08em">VENUE / DELIVERY</div><div style="margin-top:7px">${esc(order.eventAddress)}</div><div style="margin-top:4px">${order.deliveryRequired ? 'Delivery required' : 'Pickup / no delivery'}</div></td>
          </tr></table>
        </div>
        <div style="padding:0 28px 24px">
          ${renderSection('ORDER ITEMS — BBQ CATERING', bbqItems)}
          ${renderSection('DESSERTS BY IRENE', dessertItems)}
          ${customBlock}
          ${order.specialRequests ? `<div style="margin-top:18px;padding-top:13px;border-top:1px solid #ddd"><div style="font-size:10px;font-weight:800;color:#777;letter-spacing:.08em">SPECIAL REQUESTS</div><div style="margin-top:7px;white-space:pre-wrap">${esc(order.specialRequests)}</div></div>` : ''}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;font-size:13px">
            ${subtotalRows}
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
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const W = 612;
    const H = 792;
    const margin = 34;
    const right = W - margin;
    const contentW = W - (margin * 2);
    const red = rgb(.48, .12, .12);
    const black = rgb(0, 0, 0);
    const gray = rgb(.35, .35, .35);
    const light = rgb(.95, .95, .95);
    const white = rgb(1, 1, 1);
    const line = rgb(.84, .84, .84);
    const accent = rgb(.79, .55, .21);
    const paleAccent = rgb(1, .97, .92);
    const text = (page, value, x, y, size = 9, font = regular, color = black) => page.drawText(String(value ?? ''), { x, y, size, font, color });
    const moneyPdf = (value) => `$${Number(value || 0).toFixed(2)}`;
    const fitText = (value, font, size, maxWidth) => {
      let output = String(value ?? '');
      if (font.widthOfTextAtSize(output, size) <= maxWidth) return output;
      while (output.length > 3 && font.widthOfTextAtSize(`${output.slice(0, -3)}...`, size) > maxWidth) output = output.slice(0, -1);
      return `${output.slice(0, -3)}...`;
    };
    const wrapText = (value, font, size, maxWidth) => {
      const words = String(value ?? '').split(/\s+/).filter(Boolean);
      const lines = [];
      let lineValue = '';
      words.forEach((word) => {
        const next = lineValue ? `${lineValue} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= maxWidth) {
          lineValue = next;
          return;
        }
        if (lineValue) lines.push(lineValue);
        lineValue = word;
      });
      if (lineValue) lines.push(lineValue);
      return lines;
    };

    const bbqItems = order.items.filter((item) => item.category !== 'desserts');
    const dessertItems = order.items.filter((item) => item.category === 'desserts');
    const customItems = order.items.filter((item) => item.menu_item_id === 'custom-dessert');
    let page;
    let y;

    const addPage = (continuation = false) => {
      page = pdf.addPage([W, H]);
      y = H - margin;
      if (continuation) {
        text(page, 'SOUTH EAST TEXAS BBQ & CATERING', margin, y, 10, bold, red);
        text(page, 'CATERING ORDER — CONTINUED', right, y, 9, bold, gray);
        y -= 22;
        page.drawLine({ start: { x: margin, y }, end: { x: right, y }, color: line, width: .8 });
        y -= 18;
      }
    };

    addPage();

    const logoBox = { x: margin, y: y - 52, w: 58, h: 58 };
    page.drawRectangle({ x: logoBox.x, y: logoBox.y, width: logoBox.w, height: logoBox.h, borderColor: red, borderWidth: .8 });
    try {
      const bytes = await logoBytes();
      if (bytes) {
        const logo = await pdf.embedPng(bytes);
        const scale = Math.min((logoBox.w - 8) / logo.width, (logoBox.h - 8) / logo.height);
        const logoW = logo.width * scale;
        const logoH = logo.height * scale;
        page.drawImage(logo, {
          x: logoBox.x + (logoBox.w - logoW) / 2,
          y: logoBox.y + (logoBox.h - logoH) / 2,
          width: logoW,
          height: logoH
        });
      } else {
        text(page, 'SET', logoBox.x + 20, logoBox.y + 31, 11, bold, red);
        text(page, 'LOGO', logoBox.x + 13, logoBox.y + 17, 8, bold, gray);
      }
    } catch {
      text(page, 'SET', logoBox.x + 20, logoBox.y + 31, 11, bold, red);
      text(page, 'LOGO', logoBox.x + 13, logoBox.y + 17, 8, bold, gray);
    }

    text(page, 'SOUTH EAST TEXAS', 109, y + 1, 18, bold, black);
    text(page, 'BBQ & CATERING', 136, y - 18, 18, bold, black);
    text(page, 'CATERING ORDER', 460, y + 2, 10, bold, black);
    text(page, `Order #${order.orderNumber}`, 466, y - 13, 8.5, regular, gray);
    text(page, 'New Order', 489, y - 27, 8, regular, gray);
    y -= 73;
    page.drawLine({ start: { x: margin, y }, end: { x: right, y }, color: red, width: 1.5 });
    y -= 12;

    const infoY = y - 55;
    page.drawRectangle({ x: margin, y: infoY, width: contentW, height: 55, color: light, borderColor: line, borderWidth: .5 });
    page.drawLine({ start: { x: 217, y: infoY }, end: { x: 217, y: infoY + 55 }, color: line, width: .5 });
    page.drawLine({ start: { x: 399, y: infoY }, end: { x: 399, y: infoY + 55 }, color: line, width: .5 });

    text(page, 'CUSTOMER', margin + 7, infoY + 42, 7, bold, gray);
    text(page, order.contactName, margin + 7, infoY + 27, 8, regular);
    text(page, order.phone, margin + 7, infoY + 15, 8, regular);
    text(page, fitText(order.email, regular, 7.5, 165), margin + 7, infoY + 4, 7.5, regular);

    text(page, 'EVENT', 224, infoY + 42, 7, bold, gray);
    text(page, fitText(order.eventName, regular, 8, 165), 224, infoY + 27, 8, regular);
    text(page, fitText(dateTime(order.eventDate, order.eventTime), regular, 7.5, 165), 224, infoY + 15, 7.5, regular);
    text(page, `${order.guestCount} guests`, 224, infoY + 4, 8, regular);

    text(page, 'VENUE / DELIVERY', 406, infoY + 42, 7, bold, gray);
    text(page, fitText(order.eventAddress, regular, 7.5, 165), 406, infoY + 27, 7.5, regular);
    text(page, order.deliveryRequired ? 'Delivery required' : 'Pickup / no delivery', 406, infoY + 10, 8, regular);
    y = infoY - 17;

    const drawSectionTable = (items, title) => {
      const rowH = 19;
      const headerH = 21;
      if (y < 180) addPage(true);
      text(page, title, margin, y, 10, bold, black);
      y -= 8;
      page.drawRectangle({ x: margin, y: y - headerH, width: contentW, height: headerH, color: red });
      const cols = [
        { x: margin + 4, label: 'ITEM' },
        { x: margin + 173, label: 'QTY' },
        { x: margin + 212, label: 'SIZE / UNIT' },
        { x: margin + 299, label: 'OPTIONS' },
        { x: margin + 422, label: 'UNIT' },
        { x: margin + 483, label: 'TOTAL' }
      ];
      cols.forEach((col) => text(page, col.label, col.x, y - 14, 6.7, bold, white));
      y -= headerH;

      items.forEach((item) => {
        if (y < 85) {
          addPage(true);
          text(page, title, margin, y, 10, bold, black);
          y -= 8;
          page.drawRectangle({ x: margin, y: y - headerH, width: contentW, height: headerH, color: red });
          cols.forEach((col) => text(page, col.label, col.x, y - 14, 6.7, bold, white));
          y -= headerH;
        }
        const isCustom = item.menu_item_id === 'custom-dessert';
        const itemName = isCustom ? 'CUSTOM DESSERT — STARTING AT $40' : item.item_name;
        const option = isCustom ? 'See custom request below' : (item.option || '');
        const unit = isCustom ? 'Starting at $40' : (item.unit || '');
        const unitPrice = isCustom ? 40 : item.unit_price;
        page.drawRectangle({ x: margin, y: y - rowH + 2, width: contentW, height: rowH, borderColor: line, borderWidth: .35, color: isCustom ? paleAccent : undefined });
        text(page, fitText(itemName, regular, 7.4, 160), cols[0].x, y - 12, 7.4, isCustom ? bold : regular, isCustom ? red : black);
        text(page, String(item.quantity).replace(/\.00$/, ''), cols[1].x + 10, y - 12, 7.4, regular);
        text(page, fitText(unit, regular, 7.2, 78), cols[2].x, y - 12, 7.2, regular);
        text(page, fitText(option, regular, 7.2, 112), cols[3].x, y - 12, 7.2, regular);
        text(page, moneyPdf(unitPrice), cols[4].x, y - 12, 7.1, regular);
        text(page, moneyPdf(item.line_total), cols[5].x, y - 12, 7.1, regular);
        y -= rowH;
      });
      y -= 13;
    };

    if (bbqItems.length) drawSectionTable(bbqItems, 'ORDER ITEMS — BBQ CATERING');
    if (dessertItems.length) drawSectionTable(dessertItems, 'DESSERTS BY IRENE');

    if (customItems.length) {
      if (y < 160) addPage(true);
      const details = customItems.map((item) => String(item.option || '').replace(/^CUSTOM REQUEST:\s*/i, '').trim()).filter(Boolean).join('\n\n');
      const lines = wrapText(details, regular, 7.8, contentW - 20);
      const lineH = 11;
      const boxH = Math.max(66, 50 + (lines.length * lineH));
      page.drawRectangle({ x: margin, y: y - boxH, width: contentW, height: boxH, color: paleAccent, borderColor: accent, borderWidth: .8 });
      text(page, 'CUSTOM DESSERT REQUEST', margin + 10, y - 16, 8.5, bold, accent);
      text(page, 'Starting at $40 • Final pricing will be confirmed after SET BBQ & Catering contacts the customer.', margin + 10, y - 31, 7.4, bold, red);
      let textY = y - 47;
      lines.forEach((lineValue) => {
        text(page, lineValue, margin + 10, textY, 7.8, regular, black);
        textY -= lineH;
      });
      y -= boxH + 14;
    }

    if (order.specialRequests) {
      if (y < 118) addPage(true);
      page.drawRectangle({ x: margin, y: y - 49, width: contentW, height: 49, color: light, borderColor: line, borderWidth: .5 });
      text(page, 'SPECIAL REQUESTS', margin + 8, y - 14, 7.5, bold, gray);
      const special = fitText(order.specialRequests.replace(/\s+/g, ' '), regular, 7.8, contentW - 18);
      text(page, special, margin + 8, y - 33, 7.8, regular);
      y -= 61;
    }

    if (y < 155) addPage(true);
    const boxY = y - 52;
    const half = (contentW - 6) / 2;
    page.drawRectangle({ x: margin, y: boxY, width: half, height: 52, color: light, borderColor: line, borderWidth: .5 });
    page.drawRectangle({ x: margin + half + 6, y: boxY, width: half, height: 52, color: light, borderColor: line, borderWidth: .5 });
    text(page, 'SOUTH EAST TEXAS BBQ & CATERING', margin + 8, boxY + 37, 7.1, bold, gray);
    text(page, 'BBQ Meats & Sides', margin + 8, boxY + 22, 8, regular);
    text(page, moneyPdf(Number(order.subtotalMeats || 0) + Number(order.subtotalSides || 0)), margin + half - 65, boxY + 8, 10, bold, black);
    text(page, 'DESSERTS BY IRENE', margin + half + 14, boxY + 37, 7.1, bold, gray);
    text(page, 'Desserts', margin + half + 14, boxY + 22, 8, regular);
    text(page, moneyPdf(order.subtotalDesserts), right - 65, boxY + 8, 10, bold, black);
    y = boxY - 16;

    const totalRows = [
      ['BBQ Catering Subtotal', Number(order.subtotalMeats || 0) + Number(order.subtotalSides || 0)],
      ['Desserts Subtotal', Number(order.subtotalDesserts || 0)],
      ['Delivery', Number(order.deliveryFee || 0)]
    ];
    totalRows.forEach(([label, value]) => {
      text(page, label, margin, y, 8.5, regular, black);
      text(page, moneyPdf(value), 520, y, 8.5, regular, black);
      y -= 17;
    });
    page.drawLine({ start: { x: margin, y: y + 8 }, end: { x: right, y: y + 8 }, color: red, width: 1.2 });
    text(page, 'ORDER TOTAL', margin, y - 7, 10.5, bold, black);
    text(page, moneyPdf(order.total), 510, y - 7, 10.5, bold, black);
    text(page, 'This is a catering request. The order is not confirmed until SET BBQ & Catering has reviewed the request and contacted the customer.', margin, 28, 6.8, regular, gray);
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

      document.querySelector('main').innerHTML = `<section class="masthead"><div class="container"><div class="eyebrow">Order Received</div><h1>Thank you for your order!</h1><p class="page-intro">Your invoice <strong>${esc(order.orderNumber)}</strong> is ready below. A copy of your order has also been emailed to you.</p><div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1.25rem"><a href="${url}" download="${esc(order.orderNumber)}.pdf" style="display:inline-block;padding:.75rem 1.15rem;background:#7a1f1f;color:#fff;text-decoration:none;border-radius:4px;font-weight:700">Download Invoice</a><a href="${url}" target="_blank" rel="noopener" style="display:inline-block;padding:.75rem 1.15rem;border:1px solid #7a1f1f;color:#7a1f1f;text-decoration:none;border-radius:4px;font-weight:700">Open Invoice in New Tab</a></div><p class="page-intro" style="margin-top:1rem"><strong>Need to make a change?</strong> Please call or email <a href="mailto:${esc(config.businessEmail)}">${esc(config.businessEmail)}</a>.</p></div></section><section class="section"><div class="container"><div class="card"><div class="section-head"><div class="kicker">Invoice</div><h2>Your Invoice</h2></div><div style="height:88vh;min-height:720px;max-height:1100px"><iframe src="${url}" title="Your catering invoice" style="width:100%;height:100%;border:1px solid #ddd;border-radius:4px"></iframe></div><p style="margin-top:1rem"><a href="${url}" download="${esc(order.orderNumber)}.pdf">Download Invoice</a></p></div></div></section>`;
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
