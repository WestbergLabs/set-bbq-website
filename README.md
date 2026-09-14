# South East Texas BBQ & Catering

Mobile-first catering website for **South East Texas BBQ & Catering**.

The site is a static HTML/CSS/JavaScript project hosted with GitHub Pages. Customer catering requests are sent through EmailJS, while Supabase provides the order database and protected admin access.

---

## Current status

The production site currently supports:

- Home, Menu, Catering, and Contact pages
- Mobile-first catering order form
- Centralized menu and pricing data
- Item quantities and menu-specific options
- Brisket, pork belly, wings, baked-beans, and dessert option handling
- Custom Dessert requests starting at $40
- Browser-generated PDF invoices
- Customer confirmation email
- Business order email
- Customer-controlled Reply-To for business email replies
- Supabase order storage
- Supabase Auth for the protected Orders page
- Role-based admin authorization
- Row Level Security (RLS)
- Order search and status filtering
- Order detail view and logout
- Site version information

The public site is static. There is no server running on GitHub Pages.

---

## Repository

Repository: `WestbergLabs/set-bbq-website`

### Branches

- **`main`** — production branch / GitHub Pages source
- **`emailjs-rebuild`** — retained test/development branch for safely testing future changes before production

Recommended workflow:

1. Start future changes on `emailjs-rebuild`.
2. Test the complete site there.
3. When everything is approved, fast-forward `main` to the tested commit.
4. Leave `emailjs-rebuild` in place as the development branch.

Do not delete the test branch. It is intentionally kept as a safe place to work.

---

## File structure

```text
/
├── index.html                 # Home
├── menu.html                  # Public menu
├── catering.html              # Catering information
├── order.html                 # Customer order form
├── contact.html               # Contact information
├── orders.html                # Protected admin Orders page
│
├── css/
│   └── style.css              # Shared site styling
│
├── data/
│   ├── menu.json              # Menu names, descriptions, units, options
│   └── prices.json            # Prices and delivery fee
│
├── js/
│   ├── app.js                 # Shared site behavior
│   ├── order.js               # Order form, quantities, options, totals
│   ├── custom-dessert.js      # Custom Dessert UI and request handling
│   ├── emailjs-config.js      # EmailJS public configuration and routing
│   ├── email-order-v2.js      # Email creation, PDF generation, submission
│   ├── pdf-layout-fix.js      # PDF layout adjustments
│   ├── order-submit-fix.js    # Order submission/validation fixes
│   ├── order-bridge.js        # Order-form integration helper
│   ├── thank-you-message.js   # Post-submit confirmation UI
│   ├── site-version.js         # Visible site/build version
│   └── test-form-fill.js      # Local/test form helper
│
├── images/
│   ├── logo/
│   └── hero/
│
└── docs/
    └── EMAILJS_SETUP.md       # EmailJS setup/reference
```

There are currently several small order-related JavaScript files because the order system was rebuilt incrementally. **Do not combine or rename them casually.** Update script references in `order.html` if files are renamed or moved.

---

# Menu and pricing

Menu content is intentionally separated from the application code.

### `data/menu.json`

Controls customer-facing menu information such as:

- Item name
- Description
- Unit/size wording
- Category
- Available options
- Price key

### `data/prices.json`

Controls:

- Base item prices
- Option price adjustments
- Delivery fee

## Quick price change

For a normal item:

1. Open `data/prices.json`.
2. Find the item's price key.
3. Change `basePrice`.
4. Save and test the order form.

Example:

```json
"brisket": { "basePrice": 155 }
```

Change only the number:

```json
"brisket": { "basePrice": 165 }
```

## Quick menu-item change

Open `data/menu.json` and edit the item's:

- `name`
- `description`
- `unit`
- `orderOptions`
- `pricing`

Keep the item's `priceKey` matched to `data/prices.json`.

**Important:** If an item is removed or renamed, check every reference to its ID/price key in JavaScript before deleting it.

### Current dessert terminology

Customer-facing dessert wording intentionally avoids unexplained "pan" terminology.

Current dessert choices include:

- Rum Bread Pudding — Full Size
- Banana Pudding — Full Size
- Banana Pudding options: All Biscotti / Half & Half
- Pudding — Small Mason Jar
- Custom Dessert — Starting at $40

Do not reintroduce "pan" into customer-facing dessert names unless the business decides to define that term for customers.

---

# Custom Dessert

Custom Dessert is a special order item rather than a fixed-price product.

Current behavior:

- Starting price: **$40**
- Customer can enter a detailed request.
- The order clearly identifies it as a custom dessert.
- The request appears in the business email.
- The request appears in the customer confirmation.
- The request appears in the PDF invoice.
- Final pricing is to be confirmed after SET BBQ & Catering contacts the customer.

Do not treat the $40 starting price as a guaranteed final price.

---

# EmailJS

EmailJS handles both outgoing order emails directly from the browser.

The order submission sends:

1. **Business order email**
2. **Customer confirmation email**

The website also generates the PDF invoice in the browser and attaches it to the emails.

## Current routing

The site intentionally uses two EmailJS services:

- Customer confirmations use the configured Yahoo service.
- Business orders are routed through the Gmail-connected service.

The business email uses the customer's email as **Reply-To**, so replying to a new order should send the reply to the customer rather than back to the sending Gmail account.

EmailJS configuration lives in:

`js/emailjs-config.js`

Do not move EmailJS IDs into HTML or duplicate them throughout the project.

## Email templates

Current template IDs:

- Business order: `set_bbq_business_order`
- Customer confirmation: `set_bbq_customer_confirm`

The business template should use:

- To: `{{business_email}}`
- Reply-To: `{{reply_to}}`
- Subject containing the order number/customer name
- Invoice HTML: `{{{invoice_html}}}`
- Variable PDF attachment: `{{invoice_attachment}}`

The customer template should use:

- To: `{{customer_email}}`
- Reply-To: the SET BBQ business address
- Invoice HTML: `{{{invoice_html}}}`
- Variable PDF attachment: `{{invoice_attachment}}`

See `docs/EMAILJS_SETUP.md` for the EmailJS setup reference.

### Important EmailJS rule

If email behavior needs to change, check **both**:

- `js/emailjs-config.js`
- `js/email-order-v2.js`

Also check the EmailJS dashboard templates before changing working website code.

### Spam/deliverability

Yahoo may classify legitimate business-order messages as Spam. That is a mailbox/deliverability issue, not an order-form routing failure.

The current website has been tested successfully for:

```text
Customer order
    ↓
Business Yahoo mailbox
    ↓
Business replies to customer
    ↓
Customer receives reply
```

Do not redesign the EmailJS routing solely because Yahoo occasionally puts a legitimate message in Spam.

---

# Order form architecture

The order form is rendered dynamically from `data/menu.json`.

Main responsibilities:

### `js/order.js`

Handles:

- Loading menu/pricing data
- Rendering categories/items
- Quantities
- Options
- Option splits
- Wings special handling
- Validation
- Summary
- Totals

### `js/custom-dessert.js`

Handles the custom dessert request UI and makes sure the customer's custom description is included with the order.

### `js/email-order-v2.js`

Handles:

- Building the submitted order object
- Order number generation
- Email HTML
- PDF generation
- EmailJS submission
- Customer confirmation screen

### PDF

The PDF is generated in the browser with PDF-Lib.

The invoice and email are intentionally based on the same order data so item names, quantities, options, and totals stay synchronized.

---

# Supabase

Supabase provides the backend for order storage and admin authentication.

Primary order tables:

### `orders`

Stores the overall catering order, customer/event information, totals, status, and related information.

### `order_items`

Stores the individual order-item snapshot, including:

- Item name
- Quantity
- Option
- Unit price
- Line total
- Category

**Important:** `order_items` does not currently use a `created_at` column. Do not add queries that sort/filter this table by `created_at` unless that column is intentionally added.

## Order status

Common statuses:

- `new`
- `contacted`
- `confirmed`
- `completed`
- `cancelled`

New orders should start as `new`.

Historical orders whose event date has passed may be marked `completed`.

---

# Admin access

The Orders page is protected by Supabase Auth and database RLS.

An administrator needs:

1. A Supabase Auth account.
2. The `admin` role in Supabase `app_metadata`.
3. Access through the Orders page.

Admin authorization is role-based and should **not** be hardcoded to a particular email address or user ID.

Adding another administrator should not require changing the website code or RLS policy.

Current admin features:

- Sign in
- Search
- Status filtering
- Order details
- Customer/event information
- Item and pricing details
- Special requests
- Logout

There is intentionally no full dashboard, customer-management system, calendar, or menu-management interface yet.

---

# Security

This repository is public.

**Never commit:**

- Supabase service-role keys
- Passwords
- Authentication tokens
- Private API keys
- Customer personal information
- Admin credentials
- Other private secrets

The Supabase browser/publishable key may be visible in a static frontend as intended by Supabase. It is **not** a replacement for RLS.

Security must come from:

- Supabase Auth
- Database permissions
- RLS
- Database-side authorization checks

Never replace RLS with a client-side check such as a hardcoded administrator email.

---

# GitHub Pages

The production site is designed for GitHub Pages.

Use relative paths for local assets and pages.

The public site does not require a server-side runtime.

External services currently used by the site include:

- EmailJS — outgoing customer/business email
- Supabase — order storage and admin authentication
- jsDelivr — browser libraries loaded by the order page
- PDF-Lib — browser PDF generation

If the GitHub Pages source branch changes, verify that it is still pointing at **`main`** for production.

---

# Local testing

From the repository root:

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

Testing through a local HTTP server is preferable to opening HTML files directly.

---

# Production test checklist

Before pushing a significant order-form change to `main`, test:

### Website

- Home page
- Menu page
- Catering page
- Contact page
- Order page on desktop
- Order page on mobile

### Order form

- Empty order validation
- Quantity of 1
- Multiple quantities
- Items without options
- Items with options
- Brisket size options
- Pork belly weight options
- Wings mixed options
- Baked Beans options
- Banana Pudding All Biscotti
- Banana Pudding Half & Half
- Small Mason Jar
- Custom Dessert
- Custom Dessert description
- Delivery fee
- Special requests
- Correct total

### Submission

Confirm all three:

1. Business email arrives.
2. Customer confirmation arrives.
3. PDF invoice is generated correctly.

For the business email, also test:

**Reply → customer's email**

### Custom dessert

Confirm that the PDF, business email, and customer email all clearly identify:

**CUSTOM DESSERT — STARTING AT $40**

and include the customer's request.

---

# Version information

The site intentionally displays version information because it has been useful during testing and troubleshooting.

Version-related code is in:

`js/site-version.js`

When making a meaningful production change, update the version there and keep the cache-busting query strings in `order.html` consistent with the changed scripts.

Do not remove version information from production pages.

---

# Making future changes

For a normal website change:

1. Switch to `emailjs-rebuild`.
2. Make the smallest necessary change.
3. Test locally.
4. Test the GitHub Pages test branch if needed.
5. Check desktop and mobile.
6. For order changes, run a complete order submission.
7. Verify email and PDF output.
8. Update the site version.
9. When approved, move the tested commit to `main`.

Avoid large unrelated rewrites while fixing a single issue.

---

# Troubleshooting quick reference

### Prices are wrong

Check:

```text
data/prices.json
```

### Item name/description/options are wrong

Check:

```text
data/menu.json
```

### Order totals/options behave incorrectly

Check:

```text
js/order.js
```

### Custom Dessert behaves incorrectly

Check:

```text
js/custom-dessert.js
js/email-order-v2.js
```

### Email is not sent

Check:

```text
js/emailjs-config.js
js/email-order-v2.js
EmailJS dashboard templates/services
```

### PDF layout is wrong

Check:

```text
js/email-order-v2.js
js/pdf-layout-fix.js
```

### Version does not change

Check:

```text
js/site-version.js
order.html
```

### Admin Orders page does not work

Check:

- Supabase Auth
- Admin `app_metadata` role
- RLS policies
- Existing table/column names
- Browser console errors

---

# Current architecture at a glance

```text
GitHub Pages
    │
    ├── Static HTML/CSS/JS
    │
    ├── data/menu.json
    ├── data/prices.json
    │
    ├── Customer Order Form
    │       │
    │       ├── Browser PDF
    │       └── EmailJS
    │              ├── Business Order Email
    │              └── Customer Confirmation
    │
    └── Supabase
            ├── Orders
            ├── Order Items
            ├── Authentication
            └── RLS-protected Admin Access
```

The project should remain **simple, static, and maintainable**. Add infrastructure or features only when the business actually needs them.
