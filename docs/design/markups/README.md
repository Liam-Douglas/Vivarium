# Design markups — Dashboard, Animals, Animal profile

Before/after markups covering what to cut from these three screens and what to add.
Left column recreates the app as it is today (from `src/`); right column is the proposal.

Published canvas: https://claude.ai/code/artifact/793ff7b3-0abb-4ce7-a58f-0f274a8bb5b4

## Files

| File | Artboard |
|---|---|
| `DashboardCurrent.dc.html` | Dashboard — today |
| `Main.dc.html` | Dashboard — proposed |
| `AnimalsCurrent.dc.html` | Animals — today |
| `AnimalsProposed.dc.html` | Animals — proposed |
| `ProfileCurrent.dc.html` | Animal profile — today |
| `ProfileProposed.dc.html` | Animal profile — proposed |
| `canvas.json` | Frame positions, sizes and the margin notes |

Each artboard is a standalone HTML file at 390px, using the app's own tokens from
`src/index.css` — Playfair Display / DM Sans, `#1a1a18` / `#242420` surfaces, and the
`#8fbe5a` / `#d4924a` / `#c45a5a` status colours.

Markup key: **Cut** — delete it, the information is duplicated or does not change what
you do next. **Merge / Trim / Swap** — keep the information, spend less screen on it.
**New** — add it; in each case the data is already modelled and never reaches a screen.

## Summary of the proposal

**Dashboard.** Cut the "Fed this week" tile (it punishes long feeding cycles), the
whole-collection photo grid (it renders *every* animal and duplicates the Animals tab)
and the three mini stats (all on Stats already). Merge "Needs feeding" and "Due soon"
into one queue ordered by lateness. Add a workload line under the greeting, the last
meal on each row so Feed can prefill, medication doses in the queue, batch logging, and
a low feeder-stock strip.

**Animals.** Cut the urgent carousel — the third rendering of the overdue list, sitting
on top of the search box — plus the streak badge and tag chips. Change "Fed 18 days ago"
to "4 days overdue". Add status filter chips, a grid/list density toggle, and the
enclosure on the card.

**Animal profile.** Cut the header chip row and the overdue banner (the screen states
"this animal is late" three times in its first 400px), and two tabs — Feeding and Vitals
are Timeline with a filter chip pre-selected. Add one feeding bar carrying status, last
meal and the only Feed button; the enclosure under the name; a "Takes food" tile; and a
weight sparkline.

## Rebuilding the canvas

The published page is seeded from these files by the `design` skill's helper; the
generated bundle is gitignored. Edit the `.dc.html` files or `canvas.json`, re-seed, then
republish to the same artifact URL.
