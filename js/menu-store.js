(() => {
  const config = window.SET_SUPABASE_CONFIG;
  let client = window.SET_ADMIN_AUTH || null;

  function getClient() {
    if (client) return client;
    if (!config || !window.supabase) throw new Error('Menu database is not available.');
    client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    return client;
  }

  async function load() {
    const { data, error } = await getClient()
      .from('site_menu')
      .select('menu, prices')
      .eq('id', 1)
      .single();

    if (error) throw error;
    if (!data?.menu || !data?.prices) {
      throw new Error('Menu database record is incomplete.');
    }

    return { menu: data.menu, prices: data.prices, source: 'database' };
  }

  async function save(menu, prices) {
    const supabase = getClient();
    const { data: { user } = {}, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('You must be signed in as an admin.');

    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
    if (adminError) throw adminError;
    if (!isAdmin) throw new Error('This account is not authorized to edit the menu.');

    const { error } = await supabase
      .from('site_menu')
      .update({
        menu,
        prices,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', 1);

    if (error) throw error;
  }

  window.SET_MENU_API = { load, save };
})();