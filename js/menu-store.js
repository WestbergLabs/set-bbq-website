(() => {
  const config = window.SET_SUPABASE_CONFIG;
  let client = window.SET_ADMIN_AUTH || null;

  function getClient() {
    if (client) return client;
    if (!config || !window.supabase) throw new Error('Menu database is not available.');
    client = window.supabase.createClient(config.url, config.publishableKey);
    return client;
  }

  async function load() {
    try {
      const { data, error } = await getClient()
        .from('site_menu')
        .select('menu, prices')
        .eq('id', 1)
        .single();

      if (error) throw error;
      if (!data?.menu || !data?.prices) throw new Error('Menu database record is incomplete.');
      return { menu: data.menu, prices: data.prices, source: 'database' };
    } catch (databaseError) {
      console.warn('SET BBQ menu database unavailable; using local menu files.', databaseError);
      const [menuResponse, priceResponse] = await Promise.all([
        fetch('data/menu.json'),
        fetch('data/prices.json')
      ]);
      if (!menuResponse.ok || !priceResponse.ok) throw databaseError;
      return {
        menu: await menuResponse.json(),
        prices: await priceResponse.json(),
        source: 'files'
      };
    }
  }

  async function save(menu, prices) {
    const supabase = getClient();
    const { data: { user } = {}, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('You must be signed in as an admin.');

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