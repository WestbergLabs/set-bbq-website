(() => {
  const config = window.SET_SUPABASE_CONFIG;
  if (!config) return;

  const supabase = window.supabase.createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });

  window.SET_ADMIN_AUTH = supabase;

  async function checkSession() {
    const { data: { user } = {}, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) return null;

    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
    if (adminError) throw adminError;
    if (!isAdmin) {
      await supabase.auth.signOut();
      throw new Error('This account is not authorized for SET BBQ Admin.');
    }

    document.documentElement.classList.add('admin-authenticated');
    return user;
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    try {
      const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
      if (adminError) throw adminError;
      if (!isAdmin) throw new Error('This account is not authorized for SET BBQ Admin.');
      return data.user;
    } catch (error) {
      await supabase.auth.signOut();
      throw error;
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  window.SET_ADMIN_AUTH_API = { checkSession, signIn, signOut };
})();
