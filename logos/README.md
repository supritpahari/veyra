# Veyra Health — Logo Package

Selected concept: **01 Vertex** (wired into the app). Concepts 02 and 03 are kept as alternates.

## Palette

| Token        | Hex       | Use                              |
| ------------ | --------- | -------------------------------- |
| Navy (ink)   | `#102A43` | Tiles, wordmark, mono marks      |
| Tile gradient| `#17395C → #0A2039` | Navy tile depth (45°) |
| Slate        | `#F8FAFC` | V-stroke on tile, wordmark on dark |
| Teal (dark)  | `#2BB3A6` | Accent node on navy tiles        |
| Teal (light) | `#0E7490` | Accents on light backgrounds     |

## Which file, when

| Use                          | File                                            |
| ---------------------------- | ----------------------------------------------- |
| Browser tab / square tile    | `concept-1-vertex/veyra-logo-c1-icon.svg`       |
| Site header, docs, email sig | `veyra-logo-c1-horizontal.svg`                  |
| Dark hero / footer band      | `veyra-logo-c1-horizontal-ondark.svg`           |
| Social profile / app icon    | `veyra-logo-c1-vertical.svg` or `icon`          |
| Print, merch, stamps         | `veyra-logo-c1-icon-mono-{navy,white}.svg`      |
| Typographic-only contexts    | `veyra-logo-c1-wordmark.svg`                    |

## Rules

- Clear space around the mark = height of the tile's inner V pattern (≈ 9/48 of the tile).
- Minimum size: 16px digital (favicon-safe), 12mm print. Below 24px, prefer the icon over text lockups.
- Never stretch, rotate, recolor outside the palette, or add shadows/effects.
- Geometry files (icons/monos) are font-free; text lockups use IBM Plex Sans/Mono — outline text before sending to print/vendor if Plex isn't embedded.

## Preview

Open `logos/preview.html` in any browser to see all three concepts, all lockups, light/dark, and 48/26/16px stress tests side by side.

## Exporting PNG

```bash
google-chrome --headless --screenshot=v.png --window-size=64,64 file:///path/to/veyra-logo-c1-icon.svg
# or, if available: inkscape veyra-logo-c1-icon.svg -w 1024 -o veyra-icon-1024.png
```
