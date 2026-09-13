# Copilot Instructions for South East Texas BBQ Website

## Project goals

- Build a static GitHub Pages website using HTML, CSS, and JavaScript only.
- Keep the site mobile-first and easy to use on phones.
- Maintain a single source of truth for menu and pricing data.
- Avoid unnecessary dependencies and frameworks.
- Do not embed Jotform or any paid service.
- Keep pricing and product data separate from UI logic.

## Important rules

- Do not duplicate pricing across HTML or JavaScript files.
- Do not hardcode menu items separately in multiple places.
- Use relative paths so the site works under a GitHub Pages project URL.
- Keep business data in `data/*.json`.
- Keep presentation in `css/*.css`.
- Keep behavior in `js/*.js`.
- No API keys, passwords, or secret tokens in the repo.
- Maintain accessibility and mobile usability.
- Favor maintainability over clever code.

## Data architecture

- `data/menu.json` should define menu structure, items, descriptions, and category organization.
- `data/prices.json` should define prices, adjustments, and delivery fees.
- Menu rendering and order calculations should use the same source data.
- Add new products by editing the JSON, not JavaScript logic.

## Styling

- Use a Texas BBQ / Southern BBQ visual approach.
- Keep typography readable and strong.
- Use a consistent color palette and clean spacing.
- Avoid unnecessary animations and heavy visual effects.

## Order builder

- Support fixed price items, weight adjustments, and delivery fee.
- Do not create item-specific branching logic for individual products.
- Use generic data-driven price calculations.
- Keep submission logic separate from order-building logic.

## GitHub Pages

- Use relative asset paths.
- Do not assume the site is hosted at `/`.
- Keep everything static.

## When editing

- Prefer simple, readable code.
- Document non-obvious logic.
- Do not replace working code unless necessary.
- Test after major feature work.
