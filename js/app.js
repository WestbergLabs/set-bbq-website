document.addEventListener('DOMContentLoaded', () => {
  const currentUrl = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.main-nav a[data-page]');

  navLinks.forEach((link) => {
    const page = link.dataset.page;
    if (currentUrl === page || (currentUrl === '' && page === 'index.html')) {
      link.setAttribute('aria-current', 'page');
    }
  });
});
