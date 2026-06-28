# TODO — Courts management fixes & enhancements

## Completed
- [x] Update courts schema to include `short_code` — already existed
- [x] `short_code` auto-fill from `name` when missing in create/update (courtsLogic.js)
- [x] `parent_name` → resolve `parent_id` (courtsLogic.js)
- [x] Replace inline edit row controls with modal-based edit (Courts.jsx)
- [x] Add bulk add/delete/import: text/CSV/JSON + file upload
- [x] Drag/drop reordering for display_order
- [x] Auto-fill short_code preview when court name changes in edit modal

## Remaining
- [ ] Quick manual test:
  - [ ] Edit parent dropdown opens reliably in modal
  - [ ] No extra dropdown after saving/cancelling
  - [ ] Bulk add works with text/CSV/JSON
  - [ ] Short codes persist and auto-generate
  - [ ] Drag/drop still works after modal refactor
