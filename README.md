# Client database widget

A React/TypeScript client grid for CRM team.

## Local preview

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173/?demo=1 for fictional demo records.

## Features

- National and regional client views.
- Search across client columns; project-style field/operator/value filters with All/Any matching, draft Apply/Clear actions, and editable/removable condition chips.
- Sorting, priority/state grouping, collapsible groups, field visibility, and resizable columns. Row-number columns and explanatory interface text are omitted.
- 100-row display pages after fetching all authorized report pages. Filters apply to the complete fetched dataset, not just the current display page.
- Client details, inline text editing with double-click or F2, create-client form, and confirmed single-client deletion.
- Explicit save status, retained form input on errors, loading/empty/error states, and keyboard-accessible controls.


## Build and package

```sh
npm test
npm run build
npm run pack
```