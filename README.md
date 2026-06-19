# StitchSandbox

A browser-based cross-stitch pattern designer. Draw on a grid with DMC floss
colors and full, half, quarter, three-quarter and backstitches, then export a
print-ready chart as a PDF that imports into [Pattern Keeper](https://patternkeeper.app/).

Everything runs locally in the browser — patterns autosave to local storage and
can be exported/imported as JSON. No account or server required.

## Features

### Designing
- **Fabric & grid setup** — pick the grid size in stitches *and/or* the physical
  size in cm/inch; the two stay in sync through the fabric count.
- **DMC palette** — full DMC floss library (454 colors), searchable by number or
  name, with a working palette per pattern.
- **Stitch types** — full, half (`/` and `\`), quarter, three-quarter, and
  backstitch on a half-cell sub-grid (corner-to-corner and edge-midpoints).
- **Eraser**, **zoom & pan**, and an optional **realistic stitch** render mode.
- **Undo / redo** with a snapshot history.

### Editing
- **Rectangular selection** with copy, paste, delete, **mirror** (horizontal /
  vertical) and **rotate** (90° left / right). Stitch geometry transforms
  correctly (a half stitch flips its diagonal, partial stitches remap corners).
- **Move the whole design** within the canvas.
- **Resize the canvas** with a 9-point anchor (choose where the existing design
  stays).
- **Crop to the design** with a configurable border margin.

### Export
- **PDF chart** in two styles: black-and-white symbols (the print standard) or
  color blocks with symbols.
- **Pattern Keeper compatible** — the PDF is fully vector with an embedded symbol
  font and a parseable floss key (`Floss Used for Full Stitches` / `Back
  Stitches`, with DMC numbers and stitch counts), so it auto-imports.
- Tiled onto consistent A4 pages with row/column numbers, bold grid lines every
  10, center arrows, a legend page, and backstitch drawn on the chart itself.
- Live in-app preview before download.

### Saving
- Automatic local autosave.
- JSON export / import of the full pattern document.

## Tech stack

- **React + Vite + TypeScript** for the UI shell.
- A framework-agnostic **HTML5 Canvas** drawing engine (`src/engine`).
- **jsPDF** for vector PDF generation.

The editor engine (document model, viewport, history, rendering, interaction) is
deliberately decoupled from React; React only provides the surrounding UI.

## Getting started

```bash
make install   # npm install
make dev        # vite dev server on http://localhost:5173
```

Without `make`:

```bash
npm install
npm run dev
```

Production build and preview:

```bash
make build      # type-check + build to dist/
make preview    # serve the build on http://localhost:4173
```

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `F` | Fit pattern to screen |
| `Ctrl/⌘ + Z` | Undo |
| `Ctrl/⌘ + Y` / `Ctrl + Shift + Z` | Redo |
| `Ctrl/⌘ + C` / `V` | Copy / paste selection |
| `Delete` / `Backspace` | Delete selection |
| `Esc` | Clear selection |
| Hold `Space` or `Ctrl/⌘` + drag | Pan without switching tools |
| Middle-mouse drag | Pan |
| Scroll | Zoom |

## Project structure

```
src/
  model/     document model, history, storage, selection/canvas transforms
  engine/    viewport, renderer, stitch geometry, EditorEngine (interaction)
  editor/    React canvas component + editor hook
  ui/        toolbar, palette, dialogs
  export/    symbols, chart preview renderer, vector PDF, embedded font
  data/      DMC color dataset + lookup
```

## Roadmap

- Accounts & server-side storage of designs.
- Text input: convert fonts to stitches.
- Optional dedicated cross-stitch symbol font.

## Credits

- DMC color data seeded from [`seanockert/rgb-to-dmc`](https://github.com/seanockert/rgb-to-dmc)
  (hex values are recomputed from the RGB channels).
- Embedded chart font: a subset of **Liberation Sans** (SIL Open Font License 1.1).
