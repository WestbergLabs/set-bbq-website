(() => {
  const config = window.SET_SUPABASE_CONFIG;
  let client = null;

  const HOME_FIELDS = [
    'hero_eyebrow','hero_heading','hero_lead','hero_menu_button','hero_order_button','eyebrow','heading','intro','delivery_text','serve_eyebrow','serve_heading',
    'serve_categories','serve_description','serve_link_text','cta_eyebrow',
    'cta_heading','cta_text','cta_button_text'
  ];
  const CONTACT_FIELDS = [
    'page_eyebrow','page_heading','page_intro','intro_eyebrow','intro_heading',
    'intro_text','business_name','contact_person','phone','email','address_line1',
    'address_line2','cta_eyebrow','cta_heading','cta_text_1','cta_text_2','cta_button_text'
  ];

  function getClient() {
    if (client) return client;
    if (!config || !window.supabase) throw new Error('Content database is not available.');
    client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
    });
    return client;
  }

  async function load(table, fields) {
    const { data, error } = await getClient().from(table).select(fields.join(',')).eq('id', 1).single();
    if (error) throw error;
    return data;
  }

  async function save(table, values, fields) {
    const supabase = getClient();
    const { data: { user } = {}, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('You must be signed in as an admin.');

    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
    if (adminError) throw adminError;
    if (!isAdmin) throw new Error('This account is not authorized to edit site content.');

    const payload = {};
    fields.forEach((field) => { payload[field] = values[field] ?? ''; });
    payload.updated_at = new Date().toISOString();
    payload.updated_by = user.id;

    const { error } = await supabase.from(table).update(payload).eq('id', 1);
    if (error) throw error;
  }

  function apply(prefix, data) {
    document.querySelectorAll('[data-' + prefix + ']').forEach((el) => {
      const field = el.getAttribute('data-' + prefix);
      if (data[field] === undefined) return;
      el.textContent = data[field];
      if (el.tagName === 'A' && el.hasAttribute('data-' + prefix + '-phone')) {
        el.href = 'tel:' + data[field].replace(/[^+\d]/g, '');
      }
      if (el.tagName === 'A' && el.hasAttribute('data-' + prefix + '-email')) {
        el.href = 'mailto:' + data[field];
      }
    });
  }

  async function initPublic() {
    try {
      if (document.querySelector('[data-home]')) {
        apply('home', await load('site_home_content', HOME_FIELDS));
      }
      if (document.querySelector('[data-contact]')) {
        apply('contact', await load('site_contact_content', CONTACT_FIELDS));
      }
    } catch (error) {
      // Static page copy remains as a safe fallback if the database is unavailable.
      console.warn('Site content database unavailable; using page defaults.', error);
    }
  }

  window.SET_SITE_CONTENT_API = {
    loadHome: () => load('site_home_content', HOME_FIELDS),
    loadContact: () => load('site_contact_content', CONTACT_FIELDS),
    saveHome: (values) => save('site_home_content', values, HOME_FIELDS),
    saveContact: (values) => save('site_contact_content', values, CONTACT_FIELDS)
  };

  document.addEventListener('DOMContentLoaded', initPublic);
})();