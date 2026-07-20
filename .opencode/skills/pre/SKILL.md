---
name: pre
description: Use when the user asks to build or modify frontend pages, components, or styling. Enforces provider-independence, shared component reuse, centralized CSS in index.css, and centralized icons in icon.jsx.
---

# Pre

Constraints to apply before building or modifying any frontend code.

DO NOT redesign architecture.
DO NOT create new abstraction layers.
DO NOT create new frameworks.

Use existing CSS rules from index.css. If a rule is not available, create it — do not keep CSS rules inside any pages. Every CSS rule is kept inside index.css.

All icons should be kept in icon.jsx only. No inline SVGs, no duplicate icons.

The platform must be designed so that:
- No frontend page directly depends on any database provider.
- No frontend page directly depends on any AI provider.
- No frontend page directly depends on any storage provider.
- No frontend page directly depends on any search provider.

Reusable Components — reuse the existing:
- Modal
- Badge
- Buttons
- Cards
- Tables
- Filters
- Search
- Pagination
- Color Swatches
- Dropdowns
- Form Controls

Do not create duplicate components.

CSS — use only:
- Existing index.css

If additional styles are required:
- Add them to index.css.
- Do not place CSS inside components or pages.

Icons — all new icons must be added only to:
- icon.jsx

No inline SVGs. No duplicate icons.
