---
version: 1
slug: "src-pages-dashboard-tsx"
primary_target: "src/pages/Dashboard.tsx"
related_targets: ["src/pages/Animals.tsx","src/pages/AnimalDetail.tsx","src/components/ui/Modal.tsx"]
---

# Surface brief: Vivarium app (core screens)

Scope: the app shell and core screens (Today, Animals, Animal profile, logging sheets); the remaining screens follow in a second pass. Mode: Operate. Audience and job: PRODUCT.md. Constraints: business logic, queries, auth and household flows untouched.

## Direction contract

THESIS: Vivarium is an iOS app that happens to be delivered as a PWA. It refuses the "nature app" costume (leaf greens, serif headings, earthy dark) and every invented visual world; convention, executed at Things 3 craft, is the commitment.

OWN-WORLD: Apple's system palette in light and dark (grouped background, white or #1C1C1E cells, system green tint, system red and orange for status, increased-contrast variants where text needs them); SF Pro via the system stack; large titles; grouped inset lists; translucent tab bar; standard sheets; SF-style outline/filled icons.

STORY: open the app, see Today, tap Feed, log it in a sheet, watch the row check off and leave; everything else is one tap into a familiar list or detail.

FIRST VIEWPORT: large title "Today" with the date; smart-list tiles (Overdue, Due soon, Not tracked) in a two-column grid; a grouped "Feed now" list of rows (photo, name, lateness, Feed button); translucent tab bar at the bottom.

FORM: canon (the category standard played straight), chosen by the user over two rolled hands; benchmark Things 3. seed: none (unavailable)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
