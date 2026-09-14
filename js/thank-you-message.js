// Add a clear confirmation that the customer copy was emailed.
(function () {
  const updateMessage = () => {
    const intro = document.querySelector('.masthead .page-intro');
    if (!intro || !intro.textContent.includes('invoice')) return false;

    const email = document.getElementById('email')?.value?.trim();
    const emailText = email ? ` A copy of your order has also been emailed to ${email}.` : ' A copy of your order has also been emailed to you.';

    if (!intro.textContent.includes('emailed to')) {
      intro.append(document.createTextNode(emailText));
    }
    return true;
  };

  if (updateMessage()) return;

  const observer = new MutationObserver(() => {
    if (updateMessage()) observer.disconnect();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}());
