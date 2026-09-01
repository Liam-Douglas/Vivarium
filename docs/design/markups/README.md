# Design markups

Before/after markups for the three core screens, plus how the same components should
lay out on mobile versus the web. Two pages on one canvas.

**Page 1 — Cut & add (mobile).** What to cut from Dashboard, Animals and Animal profile
and what to add. Left column recreates the app as it is today (from `src/`); right
column is the proposal.

**Page 2 — Mobile vs web.** Today's dashboard at 1440px, the proposed web dashboard and
animal profile, and the responsive spec.

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
| `WebDashboardToday.dc.html` | Web dashboard — today, 1440px |
| `WebDashboardProposed.dc.html` | Web dashboard — proposed |
| `WebProfileProposed.dc.html` | Web animal profile — proposed |
| `Breakpoints.dc.html` | Responsive rules |
| `canvas.json` | Pages, frame positions, sizes and the margin notes |

Each artboard is a standalone HTML file — 390px for the mobile boards, 1440px for the
web ones — using the app's own tokens from
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

**Mobile vs web.** The app's entire responsive treatment today is four things: card
grids go 2 → 3 → 4 columns, `md:pb-8` drops the bottom padding, the FAB hides, and the
sidebar appears. There is no desktop layout — there is a phone layout centred in a
`max-w-5xl` column with 96px of dead gutter each side, so queue rows stretch to 1024px
with a 10px dot at one end and a button at the other, and the `grid-cols-2` stat cards
become two 506px tiles holding one digit each. The FAB is `md:hidden` and its desktop
replacement is a single "Log feeding" button, so four of its five actions are
unreachable above 768px.

The proposal is one component set that knows what to do with width, not a second design:
width buys columns, not whitespace. Queue rows unfold their status, last meal and
location into columns above 1024px and fold them back below; the dashboard puts stock
and activity in a 380px rail; the profile's whole mobile stack becomes a sticky rail
beside the tab content; record lists become tables with a column per stored field.
Invariants at every width: every action and every destination reachable on both, 44px
targets, one token set.

The parity break worth fixing first — the sidebar has six destinations and the bottom
nav has four, so **Feeding and Stats cannot be reached on a phone at all**, on a
mobile-first PWA. Separately, `FeederInventory.tsx` and `FeedingCalendar.tsx` are not
imported anywhere and their routes redirect elsewhere; they look like dead code.

## Rebuilding the canvas

The published page is seeded from these files by the `design` skill's helper; the
generated bundle is gitignored. Edit the `.dc.html` files or `canvas.json`, re-seed, then
republish to the same artifact URL.
