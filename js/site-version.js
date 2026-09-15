(() => {
  const SITE_VERSION = 'v0.1.24';

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-site-version]').forEach((el) => {
      el.textContent = SITE_VERSION;
    });
  });
})();
