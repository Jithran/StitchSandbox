# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Installable as a Progressive Web App: a web app manifest and a service worker
  (offline-capable, "Add to home screen" / "Install app"), with a first-time
  in-app install banner — including an iOS Safari hint (Share → Add to Home
  Screen) since iOS has no install event.
- A new app icon and logo — a cross-stitch motif shown in the browser tab, on the
  install icon, and in the app header (which now carries the StitchSandbox brand).
- DMC's newer colors 01–35 (the tin / driftwood / lavender / fuchsia range), plus
  868 and Blanc, are now in the DMC library (491 colors).
- Remove a color from the palette by hovering its swatch and clicking ✕. Stitches
  that already use it keep their color (non-destructive).

### Changed
- Starting a new pattern now warns you first when the current canvas has unsaved
  work (autosave only keeps the most recent pattern), with a one-click "Save a
  copy" before discarding.
- The pattern name in the header is now editable — click it to rename the pattern
  at any time (it flows through to autosave and chart/file names).
- An empty palette now shows a clear "Add colors" call-to-action that opens the
  color library, so first-time users know where to start.

### Fixed
- The selection overlay no longer lingers while drawing — switching away from the
  Select tool clears the selection and its dimming.

## [0.3.1] - 2026-06-20

### Added
- Column and row rulers along the top and left of the editor canvas, with
  zoom-adaptive numbering, so you can read positions while drawing.
- Right-click context menu on a selection: copy, duplicate, cut & move, mirror,
  rotate, fill with the active color, and delete.
- Many more fonts for text to stitches (Arial, Helvetica, Verdana, Tahoma,
  Trebuchet, Georgia, Times, Garamond, Courier, Impact, Comic Sans, Brush
  Script, …).

### Changed
- Much better half-stitch rasterization for text: half stitches now only land on
  genuinely diagonal edges, with the correct orientation and filled corner.
  Straight (vertical/horizontal) edges stay clean full stitches instead of being
  littered with wrong-way half stitches.
- A selection now dims the rest of the canvas so it stands out.
- Refreshed, darker UI theme.
- Dialogs now open with the first field focused and its value selected, close on
  `Escape`, and carry proper dialog semantics (`role="dialog"`, `aria-modal`).

### Fixed
- The palette no longer shows a stray double scrollbar when you hover a color
  swatch.
- Dialogs no longer close when you drag out of them (e.g. selecting text in a
  field and releasing the mouse outside the box) — they only close on a genuine
  backdrop click.
- Number fields (resize, crop, new pattern, text) can be cleared and typed
  freely; focusing selects the value, and it only snaps to a valid number when
  you leave the field instead of fighting you on every keystroke.
- Pressing `Enter` in a dialog field now applies it (Create / Apply / Crop /
  Place / add custom color).

## [0.3.0] - 2026-06-19

### Added
- Color brands in a tabbed color library: **DMC**, **Anchor** and **Cosmo**
  (numbers with colors approximated from their DMC equivalents) and **Custom**
  (pick any hex with a color picker and give it a number/label). Existing DMC
  patterns keep working.
- Help and About dialogs (top-right of the header). About credits Jithran Sikken
  and shows the version.
- Keyboard shortcuts for tools: `1` full, `2` half, `3` quarter, `4` backstitch,
  `E` eraser, `S` select, `H` pan (shown in the button tooltips). New eraser
  icon, distinct from delete.
- Text to stitches (experimental): type text, pick a font, height, bold and
  optional half-stitch edge smoothing, preview it live, then place it as a
  floating fragment to position and confirm. Glyphs are rasterized to full
  stitches with half stitches on the diagonal edges.
- Mobile / touch support: two-finger pinch-to-zoom and pan, and a responsive
  layout (compact toolbar with larger touch targets, the palette as a
  horizontal strip). Single-finger draws; a second finger cancels an in-progress
  stroke so pinching never leaves a stray stitch.

### Removed
- The three-quarter stitch tool is no longer in the toolbar (existing patterns
  that use it still render and export).

## [0.2.0] - 2026-06-19

### Added
- Floating paste: pasted (or cut) content shows as a positionable preview with a
  confirm badge. Nudge it with the arrow keys or drag it with the mouse, then
  commit with `Enter` or the green checkmark, or cancel with `Esc`.
- Cut (`Ctrl/⌘ + X`) to move a selection — the source is removed only once the
  move is confirmed.

### Changed
- Paste no longer drops content at the top-left immediately; it starts the
  floating preview so you choose where it lands.

## [0.1.0] - 2026-06-19

Initial release: a working cross-stitch editor with Pattern Keeper-compatible
PDF export.

### Added

#### Editor
- Pattern document model (cells with stitch parts, a separate backstitch layer,
  working palette, fabric/grid metadata) with JSON serialization.
- New-pattern dialog with two-way grid-size / physical-size conversion driven by
  the fabric count.
- DMC floss library (454 colors) with search and a per-pattern palette.
- Stitch tools: full, half (`/` and `\`), quarter, three-quarter, backstitch
  (snapped to a half-cell sub-grid), and eraser.
- Custom canvas rendering engine with zoom, pan, a grid (bold every 10), center
  markers, and a realistic stitch render mode.
- Snapshot-based undo / redo.
- Move the whole design within the canvas.
- Automatic local-storage autosave plus JSON export / import.

#### Selection & canvas operations
- Rectangular selection tool with copy, paste, delete, mirror (H/V) and rotate
  (CW/CCW); stitch geometry is transformed correctly.
- Canvas resize with a 9-point anchor.
- Crop to the design with a configurable border.

#### Chart export
- Vector PDF export (black-and-white symbols or color blocks) with an embedded
  symbol font, so files stay small and render everywhere.
- Pattern Keeper-compatible floss key (full-stitch and back-stitch sections with
  DMC numbers and counts) and pattern dimensions.
- Consistent A4 tiling, row/column numbers, bold 10-grid, center arrows, a
  legend page, and backstitch drawn on the chart.
- In-app chart preview before download.

[Unreleased]: https://github.com/Jithran/StitchSandbox/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/Jithran/StitchSandbox/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/Jithran/StitchSandbox/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Jithran/StitchSandbox/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Jithran/StitchSandbox/releases/tag/v0.1.0
