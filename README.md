# South East Texas BBQ & Catering

A mobile-first static website for South East Texas BBQ & Catering, designed for GitHub Pages.

## Overview

This project is a plain HTML, CSS, and JavaScript website built for a small BBQ and catering business. The site includes:

- Home
- Menu
- Request Catering
- Contact
- Shared header/footer and responsive layout
- Centralized pricing data in JSON files
- Dynamic menu rendering and order calculations
- Client-side form validation
- No backend required for v1

## Architecture

The project uses a static site structure so it can be hosted with GitHub Pages without a server or database.

- `data/menu.json` stores menu structure and description data
- `data/prices.json` stores price definitions and delivery fee
- `js/*.js` handles rendering and order logic
- `css/style.css` contains all site styling

## Pricing rules

The menu and ordering system use a shared pricing model. Changing a price in the JSON files updates the website values automatically after deployment.

### Generic pricing model

- Fixed-price item
- Item with base price and size/weight adjustments
- Item with optional add-ons or quantity pricing
- Delivery fee handled centrally

The system is designed so a future business owner can update menu data without editing JavaScript logic.

## GitHub Pages

This project is compatible with GitHub Pages because it is entirely static and uses relative paths.

## Quick start

Open the project in a browser or serve locally with a static server:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## Maintenance

To change a menu price, visit the JSON files under `data/`.

To add a dessert or menu item, add it in `data/menu.json` and define pricing in `data/prices.json`.

## Notes

- No Jotform is embedded.
- No secrets are stored in the frontend.
- The order form prepares a customer order summary without requiring a paid backend.
