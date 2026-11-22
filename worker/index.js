// Relays a catering order alert to the owner's phone via ntfy. Purely additive to EmailJS.
// Secret: NTFY_TOPIC
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

    // ntfy: the topic name acts as the password, so keep NTFY_TOPIC long and random.
    try {
      const r = await fetch(`https://ntfy.sh/${encodeURIComponent(env.NTFY_TOPIC)}`, {
        method: 'POST',
        headers: { Title: 'New SET BBQ order', Priority: 'high', Tags: 'meat_on_bone' },
        body: text,
      });
      return r.ok ? reply({ ok: true }) : reply({ ok: false, error: 'ntfy ' + r.status }, 502);
    } catch {
      return reply({ ok: false, error: 'ntfy unreachable' }, 502);
    }
  },
};
