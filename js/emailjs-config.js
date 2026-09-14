// EmailJS configuration for the static GitHub Pages order form.
// Yahoo remains the default service for customer confirmation emails.
// Business orders are routed through Gmail so the Reply-To can use the customer's address.
window.SET_EMAIL_CONFIG = {
  publicKey: 'CpbCBxjBvlriVqVVD',
  serviceId: 'set_bbq_yahoo',
  businessServiceId: 'Northquarters',
  businessTemplateId: 'set_bbq_business_order',
  customerTemplateId: 'set_bbq_customer_confirm',
  businessEmail: 'northquarterscook@yahoo.com'
};

// Route only the business-order send through Gmail.
// The customer-confirmation send continues using the configured Yahoo service.
if (window.emailjs?.send) {
  const originalSend = window.emailjs.send.bind(window.emailjs);
  window.emailjs.send = (serviceId, templateId, params, options) => {
    const config = window.SET_EMAIL_CONFIG;
    const routedServiceId = templateId === config.businessTemplateId
      ? config.businessServiceId
      : serviceId;
    return originalSend(routedServiceId, templateId, params, options);
  };
}
