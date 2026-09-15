(() => {
  const SITE_VERSION = 'v0.1.45';

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-site-version]').forEach((el) => {
      el.textContent = SITE_VERSION;
    });
  });
})();