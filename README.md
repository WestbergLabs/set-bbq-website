# South East Texas BBQ & Catering

A mobile-first catering website for South East Texas BBQ & Catering, designed to run on GitHub Pages.

## Project Status

The project currently includes:

- Public marketing pages
- Menu and centralized pricing data
- Catering order form
- Dynamic quantity and menu-option handling
- Supabase-backed order storage
- Protected admin Orders portal
- Supabase Authentication for admin sign-in
- Row Level Security (RLS) protecting order data
- Admin-only order access
- Search and status filtering in the admin portal
- Order detail modal with customer/event information, items, totals, and special requests
- Admin logout

The public website remains static and is hosted through GitHub Pages. Supabase provides the database and authentication services.

---

## Site Structure

Important public pages:

- `index.html` — Home
- `menu.html` — Menu
- `catering.html` — Catering information
- `order.html` — Catering order form
- `contact.html` — Contact
- `orders.html` — Protected admin Orders portal

The Admin link is intentionally small and located in the public-site footer. The Orders page handles authentication before displaying order data.

---

## Frontend Architecture

The site uses plain HTML, CSS, and JavaScript.

### Data files

- `data/menu.json` — Menu structure, descriptions, units, and option definitions
- `data/prices.json` — Centralized menu pricing and delivery fee

### JavaScript

- `js/app.js` — Shared site behavior
- `js/order.js` — Catering order form, quantities, options, validation, and totals

### Styling

- `css/style.css` — Shared site styling
- Page-specific admin styling is currently contained in `orders.html`

---

## Catering Order Form

The order form is designed to keep quantity selection simple.

### Quantities

Quantity fields are free-entry numeric fields. They are blank until the customer enters a quantity.

### Options

Options do not appear until an item has a quantity greater than zero.

For items where multiple option selections are allowed:

- The number of checked options is limited by the main quantity.
- When multiple units require different options, the customer can split the quantity between the selected options.
- Split quantities must add up to the main quantity.
- Reducing the main quantity automatically removes excess option selections/quantities.

### Wings exception

Wings are handled differently:

- A quantity of 1 can be mixed between available spice options.
- Customers are not required to enter separate quantities for a single mixed order.
- When ordering multiple wings quantities, option quantities can be split as needed.

This behavior should be preserved unless the ordering workflow is intentionally redesigned.

---

## Supabase Database

Supabase is the backend for catering orders.

The current database contains two primary public tables:

### `orders`

Stores the overall catering order, including customer/event information, pricing totals, status, and related order information.

### `order_items`

Stores line-item snapshots for each catering order, including the item name, quantity, option information, unit price, and line total.

**Important:** `order_items` does not currently use a `created_at` column. Do not add queries that sort or filter this table using `created_at` unless that column is intentionally added to the schema.

---

## Order Status

Orders use status values such as:

- `new`
- `contacted`
- `confirmed`
- `completed`
- `cancelled`

Imported historical orders have been marked `completed` when their event date was already in the past.

New orders should start as `new` and can later be updated through the admin workflow.

---

## Admin Portal

The admin portal is intentionally small for now.

### Current admin functionality

- Sign in
- View orders
- Search orders
- Filter by status
- Select an order to view details
- View customer/event information
- View order items and pricing
- View special requests
- Log out

There is **no dashboard, customer management, calendar, menu management, or settings area yet**. Those should only be added when they are actually needed.

### Multiple administrators

Admin authorization is role-based rather than tied to a specific user ID.

An administrator must:

1. Have a Supabase Auth account.
2. Have the `admin` role assigned in Supabase `app_metadata`.
3. Sign in through the Admin/Orders page.

The admin role should be assigned through a trusted administrative/server-side process or the Supabase dashboard. It should **not** be set by client-side JavaScript.

Adding another administrator should not require changing the website code or RLS policy.

---

## Database Security

Row Level Security (RLS) is enabled on the order tables.

The intended access model is:

- Public/anonymous users — no access to orders
- Authenticated non-admin users — no access to orders
- Authenticated users with the `admin` role — read access to orders and order items

The admin check is performed through a database-side `is_admin()` function and RLS policies.

### RLS for future tables

Supabase also provides an optional database trigger that automatically enables RLS on newly created tables in the `public` schema.

If this project adds additional public tables, enabling that automatic RLS protection is recommended. **Remember that enabling RLS does not create access policies**; each new table still needs appropriate policies.

---

## Public Repository Security

This repository is public.

**Never commit:**

- Passwords
- Supabase service-role keys
- Private API keys
- Customer personal information
- Administrator email addresses
- Administrator user IDs
- Authentication tokens
- Other private credentials or secrets

The browser may use a Supabase publishable/anonymous key as intended by Supabase. That key is **not a secret**; database security must come from Authentication, permissions, and RLS.

Never replace RLS with a client-side check such as a hardcoded email address or user ID.

---

## GitHub Pages

The public website is compatible with GitHub Pages.

The site uses relative paths so it can be deployed as a static website.

Supabase is the external service used for authentication and order data; GitHub Pages does not host the database.

---

## Local Development

A simple static server can be used for local testing:

```bash
python -m http.server 8000
```

Then open:

```
http://localhost:8000
```

Some browser functionality may require serving the site over HTTP rather than opening HTML files directly.

---

## Maintenance Rules

### Changing menu/pricing

Use:

- `data/menu.json`
- `data/prices.json`

Keep pricing centralized rather than hardcoding prices throughout the JavaScript.

### Changing order behavior

Order quantity/option logic is primarily in:

- `js/order.js`

Test the following whenever order logic changes:

- Quantity of 1
- Quantity greater than 1
- Items with no options
- Items with options
- Multiple option selections
- Wings mixed-spice behavior
- Option quantities matching the main quantity
- Price calculations
- Delivery fee
- Form validation

### Changing the database

Database/schema changes should be treated as important project changes.

Before changing the schema:

1. Check the existing tables and columns.
2. Check existing RLS policies.
3. Check related frontend queries.
4. Make the smallest necessary change.
5. Test the admin Orders page.
6. Document important schema/security changes here.

Avoid making frontend assumptions about database columns that do not exist.

---

## Current Database/Admin Milestone

The current milestone establishes the foundation for order management:

**Public order form → Supabase orders/order_items → authenticated admin → RLS-protected Orders portal**

The next logical work should build on this foundation rather than adding unrelated admin features.

---

## Notes

- No Jotform is embedded.
- The public website remains static.
- Supabase is required for the order database and admin authentication.
- RLS is a required part of the security model.
- The admin portal currently focuses only on Orders.
