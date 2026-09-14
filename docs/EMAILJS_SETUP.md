# EmailJS setup for the static order form

The order page is being rebuilt to stay fully static on GitHub Pages. The browser now generates the invoice PDF and EmailJS sends the business and customer emails. GitHub Pages itself remains the static host.

## 1. Create the EmailJS service

Create an EmailJS account and connect the email service you want SET BBQ to use for outgoing mail.

Record:

- Public Key
- Service ID

## 2. Create the business email template

Recommended settings:

**Template ID:** `set_bbq_business_order`

**To Email:** `{{business_email}}`

**Reply-To:** `{{reply_to}}`

**Subject:** `[{{order_number}}] New Catering Request — {{customer_name}}`

**Content:**

```text
{{{invoice_html}}}
```

The triple braces are intentional because `invoice_html` is already escaped and assembled by the website as trusted email HTML.

### Add the invoice PDF attachment

In the template Attachments tab, add a **Variable Attachment**:

- Filename: `{{order_number}}.pdf`
- Content type: `application/pdf`
- Parameter name: `invoice_attachment`

## 3. Create the customer email template

Recommended settings:

**Template ID:** `set_bbq_customer_order`

**To Email:** `{{customer_email}}`

**Reply-To:** the SET BBQ business email

**Subject:** `Your SET BBQ Catering Request — {{order_number}}`

**Content:**

```text
{{{invoice_html}}}
```

Add the same PDF variable attachment:

- Filename: `{{order_number}}.pdf`
- Content type: `application/pdf`
- Parameter name: `invoice_attachment`

## 4. Put the EmailJS IDs in the site

Edit `js/emailjs-config.js` and replace the `YOUR_*` placeholders with the EmailJS values.

The business address is currently set to:

`northquarterscook@yahoo.com`

## 5. Test both messages

A successful order should produce all three results:

1. A formatted business email.
2. A formatted customer confirmation email.
3. A downloaded PDF named like `SET-260914-084812-7F.pdf`.

The same order object drives both email and PDF so the totals and item lines stay synchronized.
