// Relays a catering order alert to the owner's phone via Telegram. Purely additive to EmailJS.
// Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
const ORIGINS = ['https://setxbbqcatering.com', 'https://www.setxbbqcatering.com', 'https://westberglabs.github.io'];
const LIMITS = { name: 80, phone: 30, email: 120, eventName: 100, eventDate: 40, guests: 6, notes: 300, orderNumber: 40 };

const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    };
    const reply = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return reply({ ok: false, error: 'method' }, 405);
    if (!ORIGINS.includes(origin)) return reply({ ok: false, error: 'origin' }, 403);

    let b;
    try { b = await req.json(); } catch { return reply({ ok: false, error: 'json' }, 400); }
    if (b.website) return reply({ ok: true }); // honeypot: pretend success

    const d = Object.fromEntries(Object.entries(LIMITS).map(([k, n]) => [k, clip(b[k], n)]));
    if (!d.name || !(d.phone || d.email)) return reply({ ok: false, error: 'missing name or contact' }, 400);

    // ponytail: no rate limit beyond origin+honeypot; add Turnstile or a KV counter if abused
    const text = [
      `Order ${d.orderNumber}`,
      `${d.name} - ${[d.phone, d.email].filter(Boolean).join(' / ')}`,
      `${d.eventName} on ${d.eventDate}, ${d.guests} guests`,
      d.notes && `Notes: ${d.notes}`,
    ].filter(Boolean).join('\n');

    // Telegram bot -> chat/group. Retry in case of a 429 or a network blip.
    let err = 'telegram unreachable';
    for (let i = 0; i < 4; i++) {
      if (i) await new Promise((r) => setTimeout(r, 1500 * i));
      try {
        const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: `New SET BBQ order
${text}` }),
        });
        if (r.ok) return reply({ ok: true });
        err = 'telegram ' + r.status;
      } catch { /* retry */ }
    }
    return reply({ ok: false, error: err }, 502);
  },
};
