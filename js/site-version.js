(() => {
  const SITE_VERSION = 'v0.1.7';

  document.addEventListener('DOMContentLoaded', () => {
    const footer = document.querySelector('.site-footer .container');
    if (!footer) return;

    const version = document.createElement('div');
    version.textContent = `Build ${SITE_VERSION}`;
    version.style.cssText = 'grid-column:1 / -1;margin-top:.75rem;font-size:.72rem;opacity:.55;text-align:right;';
    footer.appendChild(version);
  });
})();
