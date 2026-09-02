# Design markups

Before/after markups for the three core screens, plus how the same components should
lay out on mobile versus the web. Two pages on one canvas.

**Page 1 — Cut & add (mobile).** What to cut from Dashboard, Animals and Animal profile
and what to add. Left column recreates the app as it is today (from `src/`); right
column is the proposal.

**Page 2 — Mobile vs web.** Today's dashboard at 1440px, then the proposed dashboard and
animal profile drawn at both widths side by side, a nav-and-actions parity board, a fold
diagram, and the responsive spec.

**Page 3 — When nothing is due.** The all-clear dashboard at both widths, and the
five-state ladder.

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
| `PhoneDashboard.dc.html` | Phone dashboard — proposed |
| `PhoneProfile.dc.html` | Phone animal profile — proposed |
| `PhoneNav.dc.html` | Phone nav & actions — parity |
| `RowFold.dc.html` | How a row folds |
| `Breakpoints.dc.html` | Responsive rules |
| `AllClearPhone.dc.html` | All clear — phone |
| `AllClearWeb.dc.html` | All clear — web |
| `DashboardStates.dc.html` | Dashboard states |
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

Both claims that carry the responsive argument are drawn rather than asserted.
**Parity**: the FAB's five actions become a split button with the same five in the same
order; the bottom nav goes to five tabs (Home / Animals / Feeding / Stats / More) with a
More sheet holding Expenses, feeder stock, import and household. The trigger changes at
the breakpoint, the capability never does. **The fold**: numbered field-by-field tracing
of the queue row (6 of 6 fields survive; only the species subtitle gives way) and the
feeding record (6 of 7; only free-text notes go behind the tap). The general rule —
compose fields into phrases, demote only the unbounded one, never make a phone row a
mystery you have to tap to resolve.

Note the phone profile's top stack *is* the desktop's 380px rail. Fix the stack once and
both widths improve, which is why the mobile profile needed no separate design.

**When nothing is due.** A queue-led dashboard is built from exceptions, so on a
well-run collection with 14-day cycles it would be near-blank most days. The layout does
not restructure between states: four slots stay put and only their heading and fill
change. The queue widens rather than empties — "Today" becomes "Coming up", the next
seven days, dated, with the action giving way to a date. The space that opens goes to
"Worth a look": husbandry that is always true but never urgent (unscheduled animals,
stale weights, predicted sheds, running quarantines), capped at four rows and yielding
entirely when there is a queue. Stock becomes a two-week projection rather than a
threshold.

**The false all-clear** — found here, now fixed in the app (`src/lib/feedingStatus.ts`).
`getStatusForAnimal` returned `'muted'` when an animal had no `last_fed_at` or no
`feeding_frequency_days`, and the overdue tally counted only `'red'`, so such an animal
was invisible to every queue permanently and a never-fed collection rendered "Overdue 0"
in green. `'muted'` now splits into `'no-schedule'` and `'never-fed'`, both counted apart
from `'on-schedule'`; the Overdue tile is green only when every animal is tracked, and a
dashboard notice names the ones that are not. The design consequence stands regardless:
unscheduled animals lead "Worth a look" rather than sitting at the bottom of it.

The parity break worth fixing first — the sidebar has six destinations and the bottom
nav has four, so **Feeding and Stats cannot be reached on a phone at all**, on a
mobile-first PWA. Separately, `FeederInventory.tsx` and `FeedingCalendar.tsx` are not
imported anywhere and their routes redirect elsewhere; they look like dead code.

## Rebuilding the canvas

The published page is seeded from these files by the `design` skill's helper; the
generated bundle is gitignored. Edit the `.dc.html` files or `canvas.json`, re-seed, then
republish to the same artifact URL.
