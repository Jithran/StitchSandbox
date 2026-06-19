# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/Jithran/StitchSandbox/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Jithran/StitchSandbox/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Jithran/StitchSandbox/releases/tag/v0.1.0
