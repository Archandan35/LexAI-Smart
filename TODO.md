## Courts page fixes & enhancements — TODO

- [ ] 1) Fix parent dropdown click/rendering bug on `/court-management/courts`
  - [ ] Add event propagation guards in `src/app/pages/Courts.jsx` for inputs/selects inside edit mode (avoid row drag/drop interfering).
  - [ ] Adjust CSS stacking/overflow for `.courts__parent-select` and the courts card/table to prevent clipping.

- [ ] 2) Persist `shortcode` for Courts
  - [ ] Add `shortcode` field to `src/data-provider/schema/courts.schema.js`
  - [ ] Update `src/logic/courtsLogic.js` (create/update) to accept `shortcode`
  - [ ] (If needed) ensure backend repository/service passes the field through unchanged.

- [ ] 3) Upgrade Courts management UI to support:
  - [ ] Bulk Add (bulk add via CSV/JSON/normal text paste + “Name:CODE per line” style)
  - [ ] Bulk Delete
  - [ ] Import from CSV/JSON/plain text
  - [ ] Auto-fill `shortcode` from court name (deterministic rule, and also allow user-provided shortcode)
  - [ ] Auto-resolve `parent_id` using provided parent name (and/or shortcode when available)

- [ ] 4) Wire hierarchy-aware import for courts on `/court-management/courts`
  - [ ] Ensure the parent reference resolution happens client-side before calling bulk create/update

- [ ] 5) Test
  - [ ] Verify dropdown opens correctly and does not spawn extra dropdown after edits
  - [ ] Verify single add/edit/save works with shortcode + parent selection
  - [ ] Verify bulk add/import/delete works end-to-end
