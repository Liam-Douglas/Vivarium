# Vivarium design scan

Stage 1 of the design pass. Scanned on 15 October 2026 against `main` @ `109e577`, on the `design-pass` branch. Read-only: no source files changed. This file, `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json` and the evidence images in `docs/design/scan/` are the only new files.

## Status (updated 15 October 2026, end of Stage 3)

Stage 2 ran batches 1 to 5 as planned. After batch 5 the direction changed at your request: the dark leaf/olive "field journal" was replaced by **iOS native, played straight** (light and dark from the phone, system green tint, SF Pro, grouped lists, Things 3 as the bar). That redesign rebuilt every screen, so several findings below were fixed by being replaced rather than patched. DESIGN.md now documents the new system; this report is kept as the record of the scan.

Statuses: **Fixed**, **Fixed by the redesign** (the element no longer exists in that form), **Partly**, **Open**, **Superseded** (no longer applies).

| ID | P | Status | Where it stands |
|---|---|---|---|
| A1 | P0 | Fixed | Batch 1 (`min-w-0` on search); re-checked at 320px after the redesign, no sideways scroll on any screen. |
| U1 | P0 | Fixed | Batch 1/5: no email collected; "Pro is on the way, we'll announce it here in the app". |
| G1 | P1 | Fixed | Batch 1: FAB, toasts, sheets and page padding clear the home indicator; device check still advised. |
| G2 | P1 | Fixed by the redesign | Tab bar uses iOS secondary label (4.7:1 light) and tint for the selected tab. |
| G3 | P1 | Fixed by the redesign | Red is Apple's increased-contrast red in light (#D70015) and system red in dark (#FF453A), both AA as text. |
| G4 | P1 | Fixed | 44px targets on touch; record actions, month arrows, member actions, capsules and text buttons carry a 44px hit area. |
| G5 | P1 | Fixed | Batch 2 phone baseline; press feedback everywhere. |
| G6 | P2 | Fixed | Every colour is a semantic token with light and dark values; the design detector finds no literal colours outside the documented set. |
| G7 | P1 | Fixed | Batch 1 favicon, apple-touch and maskable icons. |
| G8 | P1 | Fixed | Batch 4 sheets, kept and restyled as iOS 17 sheets in the redesign. |
| G9 | P2 | Fixed by the redesign | Apple's text styles (17/15/13 and titles), 11px floor, tabular figures; no uppercase label system. |
| G10 | P2 | Fixed | theme-color per appearance, dvh, overscroll, `interactive-widget`. |
| G11 | P2 | Fixed | Focus rings on keyboard focus only, in the tint. |
| G12 | P2 | Partly | Segmented controls and profile sections use `aria-pressed` and every icon button has a name. Proper `role="tab"` semantics were not added: they need tab panels and arrow-key handling, and the render tests address these as buttons. |
| G13 | P2 | Fixed | Batch 3: day-first dates everywhere. |
| G14 | P2 | Fixed by the redesign | One outline glyph set (`ui/icons.tsx`); no emoji used as UI anywhere. |
| G15 | P2 | Open | Still one bundle; route-level code splitting not done. |
| G16 | P2 | Superseded | No web fonts load now; the system font is used. |
| G17 | P2 | Fixed | Batch 1. |
| G18 | P2 | Fixed | The error screen says "An unexpected error occurred." and tucks the raw message under Details. |
| D1 | P1 | Fixed | Batch 3, kept in the redesigned Feed now rows. |
| D2 | P1 | Fixed | Batch 3 first run, restyled in the redesign. |
| D3 | P2 | Fixed | Glyph buttons with names, staggered motion, named FAB. |
| D4 | P2 | Fixed by the redesign | Desktop rows show the full last meal and enclosure; care, stock and activity sit in the right column. |
| A2 | P2 | Fixed by the redesign | One search row with sort/view bar buttons and one capsule row; about two rows of animals in the first screen. |
| A3 | P2 | Fixed | Initial on a fill placeholder; status shown once. |
| A4 | P2 | Fixed | Card chosen in batch 5, restyled as an album tile in the redesign. |
| A5 | P2 | Fixed | Batch 3. |
| A6 | P2 | Fixed | "For sale", "Quarantine". |
| PR1 | P1 | Fixed | Batch 3 money formatting, "Net" signed and not red. |
| PR2 | P2 | Partly | Weights format as grams up to 10 kg and kilograms beyond on every screen built from records. Today's Recent activity line is composed in `lib/queries.ts`, left untouched under the no-query-changes rule. |
| PR3 | P2 | Fixed by the redesign | No-photo hero shows the initial; long names wrap at the large-title size. |
| PR4 | P2 | Fixed by the redesign | Section capsules run to the screen edge so the cut-off capsule shows the row scrolls, with a sliding selection; semantics as G12. |
| PR5 | P2 | Fixed by the redesign | One section-header style (grouped list headers). |
| PR6 | P2 | Fixed | No chart draw animation; the target weight field sits on its own row. |
| L1 | P1 | Fixed | Sheets (G8). |
| L2 | P2 | Partly | `inputMode` on every number field; `enterKeyHint` not added. |
| L3 | P2 | Fixed | Check-off then fold (batch 4; Things-style in the redesign). |
| H1 | P1 | Fixed | 44px member actions as plain tint and red text buttons that wrap under long names. |
| H2 | P2 | Fixed | Roles read "Owner" / "Member". |
| H3 | P2 | Fixed | Glyphs in tinted circles; dvh. |
| S1 | P2 | Fixed | The segment inside Settings is now "General"; sections are grouped lists with footers. |
| I1 | P2 | Fixed | "Step n of 4 · Name" over a four-segment bar. |
| I2 | P2 | Partly | Step 2 (mapping) is now rendered and checked; steps 3 and 4 still only by code. |
| U2 | P1 | Fixed | Batch 1. |
| AU1 | P2 | Fixed | Password placeholder removed. |
| AU2 | P2 | Fixed | Terms and Privacy links are in the tint. |
| AU3 | P2 | Fixed | One BrandMark in the icon's serif. |
| X1 | P2 | Fixed | No coloured edge stripes; dots and status text. |
| X2 | P2 | Fixed | Tabular system figures; category bars in the tint alone. |
| X3 | P2 | Fixed | Bar buttons sit above the large title on phones. |
| M1 to M5 | P2 | Fixed | Batch 4, then the redesign's motion (see DESIGN.md, Components). Stage 3 review also moved the push slide onto the compositor, added popover entrances from the trigger and held the Reminders tick. |
| O1 to O4 | | Fixed | Sheets, press feedback, row check-off and fold, FAB stagger. |

Still open, for a later pass: **G15** code splitting; **G12** full tab semantics; **L2** `enterKeyHint`; **PR2** the activity line's weight text (needs a change in `lib/queries.ts`); and, out of scope as flagged, supabase-js keeping the session in `localStorage`.

## Summary

Vivarium is better than most apps at this stage where it counts: it is honest about loading, failure and emptiness, its copy is calm and specific, the dark warm palette suits keepers checking animals at night, and the Today queue on the dashboard is a genuinely good phone screen. The weaknesses are in the layer underneath. The palette exists as CSS variables but nothing uses them (about 1,300 hard-coded hex values across 818 inline styles), so colour, contrast and spacing have drifted screen by screen. On a real iPhone it still reads as a website: no tap-highlight reset, no press feedback, modals that pop in with no motion, a FAB and dialogs that ignore the home-indicator area, and a home-screen icon and favicon that were never finished. One screen is actually broken on a phone (the Animals list is wider than the screen), and one dialog says something untrue (the Pro waitlist does not save the email it promises to use).

**Scores** (Nielsen heuristics for the core app, and the impeccable technical audit):

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Loading, failed and empty are distinct everywhere; logging a feeding gives no visual bridge as the row leaves the queue |
| 2 | Match with the real world | 3 | Keeper language throughout; dates mix "27 Sep" and "Sep 27" for Australian users |
| 3 | User control and freedom | 3 | Escape, scrim, confirm dialogs and undo toasts; sheets cannot be swiped away |
| 4 | Consistency and standards | 2 | Emoji vs SVG icons, two date orders, serif numerals on Stats, two "Add" buttons on empty Animals, "Settings" tab inside Settings |
| 5 | Error prevention | 3 | Zod limits on every field, confirm on delete; household "Remove" is a 24px target next to "Make owner" |
| 6 | Recognition over recall | 3 | Last meal shown on each row and prefilled into the form |
| 7 | Flexibility and efficiency | 3 | Batch feed, select mode, grid/list density |
| 8 | Aesthetic and minimalist design | 2 | Animals spends half the first screen on controls; emoji decoration competes with status colour |
| 9 | Error recovery | 3 | `LoadError` is excellent; `ErrorBoundary` shows a raw exception message |
| 10 | Help and documentation | 3 | Import template, "not tracked" explanations; first run has no guidance |
| | **Total** | **28/40** | Solid, with clear consistency debt |

| # | Audit dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 2 | Overdue red fails AA as text (3.7:1 on cards); inactive nav 2.1:1; 28px icon buttons without labels; tabs without tab semantics. Dialog focus handling and field labelling are genuinely good |
| 2 | Performance | 2 | One 1.7 MB JS bundle for every route (spreadsheet, chart and QR libraries load for sign-in); every chart replays a 1.5 s draw; Google Fonts not cached for offline use |
| 3 | Theming | 1 | Tokens defined in `index.css` and used zero times |
| 4 | Responsive | 2 | Animals overflows at 390px and 320px; safe-area gaps at the bottom; everything else holds down to 320px |
| 5 | Implementation integrity | 2 | `animate-in` classes reference a plugin that is not installed; Vite template leftovers (favicon, `App.css`, assets) |
| | **Total** | **9/20** | |

## Top 5

1. **P0: Animals is wider than an iPhone.** With any animals in the collection the page is 477px wide on a 390px screen. The sort menu and grid/list toggle sit off-screen, the page pans sideways, and dialogs opened from it (including the upgrade modal) render half off the left edge. One missing `min-w-0`. (A1)
2. **P0: The upgrade modal promises an email it never stores.** "You're on the list! We'll email you@… when Pro launches" runs on local state only; nothing is saved. It also lists "Export your data" as a Pro feature, but export is free in Settings today. Needs your decision on copy. (U1)
3. **P1: Status colour fails contrast where it matters most.** Overdue red text is 3.7:1 on cards and 3.2:1 in dialogs; inactive bottom-nav labels are 2.1:1. In a dim reptile room these are the words a keeper most needs to read. (G2, G3)
4. **P1: The phone layer is unfinished.** No tap-highlight reset, no `touch-action`, no press feedback, controls selectable on long-press, the FAB (80px up) sits inside the 91px bottom bar on notched iPhones, dialog buttons land in the home-indicator zone, and modals/sheets appear with no motion because the classes they use do nothing. (G1, G5, G8)
5. **P1: First run is a dead end, and long names hide urgency.** A new keeper's dashboard says "Nothing due today" and "No activity yet" with no way forward; and on the Today queue a long name truncates the "386 days overdue" text off the row. (D1, D2)

## How this was scanned

- **Rendered, not guessed.** The repo's own render harness (`scripts/render/`) drives the real build against fixture data. I added a throwaway capture script (in the session scratchpad, not committed) that shot 34 scenes at iPhone 14 size (390×844, 2x, touch), at 320×640, and at 1440×900, including worst-case fixtures: a 52-character name with a 65-character morph, emoji names and morphs, a one-letter animal with no species or schedule, an unbreakable 40-character name, 0 animals, 56 animals, a 0.4g pygmy chameleon and a 98.5kg retic, a long household name with emoji, and long member names. A selection is in `docs/design/scan/`.
- **Harness artefacts, not app bugs:** the stub does not resolve embedded joins or filter by animal, so screenshots show "Unknown" as the animal and keeper in activity and feeding rows, and the profile weight delta compares against another animal's log (`+1548`, `−98499.6`). These are ignored below.
- **Code review** of tokens, contrast (computed), tap targets, ARIA, motion, iOS meta and CSS, plus the impeccable detector (1 hit).
- **Skills applied:** impeccable init, document, critique, audit; break-ui; mobile-native; apple-design; improve-animations; find-animation-opportunities.
- **Not verifiable here:** anything that needs a physical iPhone (real safe-area insets, tap delay, keyboard behaviour, standalone status bar, home-screen icon mask). Those findings are inferred from code and marked "device check" in the batch plan.
- **Not exercised:** the import wizard past step 1 (it needs real files). Its error states are scheduled as a harden task rather than reported as findings I have not seen.

---

## Findings

Priority: **P0** broken or unusable, **P1** clearly hurts the experience, **P2** polish. Effort: **S** under an hour, **M** a few hours, **L** a day or more.

### Global: shell, tokens and phone layer

| ID | P | What's wrong | Why it matters | Proposed fix | Skill | Effort |
|---|---|---|---|---|---|---|
| G1 | P1 | The FAB (`Dashboard.tsx:851`, `bottom-20` = 80px) and toasts (`Toast.tsx:34`, `bottom-20`) are offset for a 56px bar, but the bar is about 91px tall on notched iPhones once `env(safe-area-inset-bottom)` is added. Modals anchor to the bottom with 16px padding (`Modal.tsx:472`), so their Save/Cancel row sits in the home-indicator zone. Page padding `pb-24` leaves the last rows under the FAB. | The FAB overlaps the top of the More/Stats tabs and toasts sit on the bar in the installed app; the primary dialog actions sit where the home-swipe gesture lives. | Offset FAB and toasts by `calc(<bar height> + env(safe-area-inset-bottom))`; give the modal panel `padding-bottom: env(safe-area-inset-bottom)` on phones; make page bottom padding include the inset and the FAB on the dashboard. | mobile-native | S |
| G2 | P1 | Inactive bottom-nav icons and labels are `#505048` on `#1a1a18`: 2.1:1. Labels are 10px. | The four tabs you are not on are barely legible, especially in low light. | Raise to `#8a8476` (4.7:1) and the label to 11px. Active stays Leaf with the filled icon, so the active state stays obvious. | impeccable audit / quieter | S |
| G3 | P1 | Clay Red `#c45a5a` is used as text for "overdue", "refused" and errors: 4.1:1 on the page, 3.7:1 on cards, 3.2:1 in dialogs (AA needs 4.5:1). White text on the red danger button is 3.6:1. | Overdue is the single most important word in the app. | Split the token: keep `#c45a5a` for dots, borders and tints; add a text red `#dc7a7a` (5.9 / 5.3 / 4.6:1). Darken the danger button fill so its label passes. Small hue shift inside the existing palette; listed under decisions. | impeccable colorize | S |
| G4 | P1 | Touch targets under 44px: record edit/delete (`RecordActions.tsx`, 28px) on every weight, shed, health and acquisition row; expense edit/delete (28px) and month arrows (32px) in Expenses and Feeding; vet contact edit/delete (28px); household "Make owner"/"Remove" (about 24px tall, side by side). | Mis-taps on delete next to edit, and on "Remove" next to "Make owner". | 44px hit areas (visual size can stay smaller via padding or a pseudo-element hit box), 8px between adjacent destructive and non-destructive actions. | impeccable layout / harden | S |
| G5 | P1 | None of the phone baseline: no `-webkit-tap-highlight-color`, no `touch-action: manipulation`, no `user-select: none` / `-webkit-touch-callout: none` on controls, almost no `:active` press states (4 in the app). | Grey flash on every tap, possible tap delay, long-press selects button and tab labels, and buttons respond on release rather than press. These are the "it's a website" tells. | Global baseline in `index.css` (tap highlight, `touch-action` and `user-select` on `button, a, [role=button]`), plus a shared press state (`scale(0.97)`, 120ms ease-out) on Button, Feed, chips, cards and nav. | mobile-native | S |
| G6 | P2 (enabler) | Tokens in `index.css` are never referenced (`var(--…)` appears 0 times). Colours are repeated as literals: `#9f9684` 190 times, `#f0ece0` 152, `#a8a090` 141, `#8fbe5a` 140. Two near-duplicate blues (`#5a8fbe`, `#5a8ebe`). | Every contrast or colour fix has to be made hundreds of times, and screens drift. Not user-visible on its own, but it makes every other fix riskier. | Move the palette into Tailwind v4 `@theme` tokens (so `text-leaf`, `bg-bark` exist), migrate the shared `ui/` and `layout/` components first, then pages as each batch touches them. No visual change in the migration itself. | impeccable extract / colorize | M (shared) to L (all pages) |
| G7 | P1 | `public/favicon.svg` is the default purple Vite logo. The home-screen icons have transparent rounded corners (corner pixel alpha 0), and the same file is declared `maskable`. The in-app mark is a sans "V" while the icon is a serif "V". | The browser tab shows another product's logo. iOS fills transparent icon pixels with black, so the installed icon gets dark corners inside the iOS mask; Android crops the maskable version. | Re-export the existing V icon full-bleed (square, no transparency) at 180, 192 and 512, a separate maskable with safe padding, and an SVG favicon of the same mark. Use the serif V in the app's logo tile too. Same artwork, no identity change. | mobile-native | S |
| G8 | P1 | `Modal` uses `animate-in slide-in-from-bottom-4`, which come from `tw-animate-css`; it is not installed, so every dialog appears and disappears instantly. On phones the modal is a floating card 16px from the edges, not a sheet. The More sheet has a grabber that cannot be dragged. | Every logging action happens in a modal, so this is the most-felt seam in the app. A grabber that does nothing is a broken promise. | Phone: edge-to-edge bottom sheet with top corners only, safe-area padding, slide up 280ms on `cubic-bezier(0.32, 0.72, 0, 1)`, exit 200ms down the same path, scrim fade; optional drag-to-dismiss on the grabber. Desktop: centred dialog, scale 0.97 to 1 plus fade, 200ms. Same treatment for the More sheet. No new dependency needed. | animate, apple-design | M |
| G9 | P2 | Typography: 12px is the most used size (250 uses), much of it Sand `#9f9684` metadata; Playfair headings have no negative tracking at 30 to 36px; uppercase labels are used in some cards and Playfair titles in others for the same role. | Small grey text is the first thing to go in low light; inconsistent section labels make screens feel assembled rather than designed. | Raise row metadata to 13px, pick one section-label style, tighten display tracking to -0.01em to -0.02em, use DM Sans with tabular figures for all numbers. | impeccable typeset | M |
| G10 | P2 | No `theme-color` meta (Safari's tab bar does not match), `min-h-screen` (100vh) on the shell and auth screens, no `overscroll-behavior`, no `interactive-widget=resizes-content`. | Small mismatches at the edges of the screen; 100vh pushes bottom content under Safari's toolbar on the auth screens. | Add `theme-color #1a1a18`, switch shells to `min-h-dvh`, `overscroll-behavior: none` on the root and `contain` inside sheets. | mobile-native | S |
| G11 | P2 | Focus rings use `focus:` not `focus-visible:`, so a ring appears whenever focus is set programmatically, e.g. on the dialog close button every time a dialog opens on a phone (see `docs/design/scan/feeding-modal.jpg`). | A green ring around × on every dialog looks like a selected state. | `focus-visible:` everywhere. | impeccable polish | S |
| G12 | P2 | Segmented controls and profile tabs are plain buttons with no `role="tab"` / `aria-selected` (2 `aria-pressed` in the whole app). Icon-only buttons (record actions, month arrows, FAB and its speed-dial items) have no accessible name; the FAB has no `aria-expanded`. | Screen-reader users hear "button" with no idea what it does or which tab is active. | Tab semantics on segmented controls and tabs; `aria-label` on every icon-only button; `aria-expanded` on the FAB and More. | impeccable audit / harden | S |
| G13 | P2 | Dates mix orders: "27 Sep" on the dashboard, "Sep 27" and "Sep 13, 2026" on the profile and lists, "Jul 7" on charts. | Australian keepers read day-month; mixed orders slow scanning and invite misreads. | One date helper, day-month ("27 Sep", "13 Sep 2026"), used everywhere. Display only. Listed under decisions because it changes visible text. | impeccable clarify | S |
| G14 | P2 | Emoji used as UI icons: quick actions (🍖 ⚖️ 🐍), activity rows, chips (🐾 🐍 🦎 ❓), segmented controls (🐾 🏠), empty states (🦎 📋 📁 ⏳ 🚀), FAB items. Nav, header and record actions use outline SVGs. | Two icon languages; emoji render differently per OS, are colourful where the palette is quiet, and compete with status colour. | Replace UI-chrome emoji with the existing outline icon style (same stroke as the nav), keep emoji only where the keeper typed them. Needs your decision. | impeccable quieter | M |
| G15 | P2 | One 1.7 MB JavaScript bundle; no route-level code splitting, so SheetJS, Recharts and the QR library download and parse before sign-in. | Slower cold start on older iPhones and on mobile data. | `React.lazy` for Import, Stats, Expenses and the profile's chart tabs. No new dependency. | impeccable optimize | M |
| G16 | P2 | Fonts load from Google Fonts at runtime and are not in the service worker cache; DM Sans 300 is loaded but never used. | Opened offline or on a weak connection, the installed app falls back to Georgia/system and reflows when fonts arrive. | Self-host the two families as woff2 in the precache, drop weight 300. Listed under decisions (either a small `@fontsource` dependency or committed font files). | impeccable optimize | S |
| G17 | P2 | Leftovers from the Vite template: `src/App.css` (unused), `src/assets/hero.png`, `react.svg`, `vite.svg`. | Noise; the favicon is the visible symptom. | Delete. | impeccable polish | S |
| G18 | P2 | `ErrorBoundary` shows the raw exception message to the keeper. | "Cannot read properties of undefined" is not calm or useful. | Plain sentence plus "Reload", with the technical detail behind a disclosure. | impeccable harden / clarify | S |

### Dashboard (core)

| ID | P | What's wrong | Why it matters | Proposed fix | Skill | Effort |
|---|---|---|---|---|---|---|
| D1 | P1 | On phones the Today row puts name and lateness on one truncated line (`Dashboard.tsx:673`). A long name pushes "386 days overdue" off the row entirely; only the red dot remains (`docs/design/scan/dashboard-worst-case.jpg`). | The lateness is the reason the row exists. | Status on its own line or name truncates before the status (status `shrink-0`, name `min-w-0 truncate`). | impeccable layout | S |
| D2 | P1 | First run: a new keeper with no animals sees "Nothing due today", an empty "Recent activity" with a clipboard emoji, and a FAB (`docs/design/scan/dashboard-first-run.jpg`). Nothing says "add your first animal" or "import your spreadsheet". | The highest-stakes screen for activation says nothing useful; "Nothing due today" with no animals is technically true but reads as an all-clear. | A first-run state: one line on what Vivarium does, "Add your first animal" and "Import from a spreadsheet", and a note that household members can join. Prototype 2 versions. | impeccable onboard, prototype | M |
| D3 | P2 | FAB speed-dial items are emoji buttons whose labels are separate spans; items appear with no motion; the main FAB has no accessible name. | Covered by G1, G12, M4. | See those. | | |
| D4 | P2 | Desktop: the Today table truncates "Last: Rat, Mediu…" while the row has spare width; the right column's activity list runs past the fold with no cap. | Wasted space on the one layout with room to spare. | Let the detail column flex, cap activity to 8 with "See all". | impeccable layout | S |

What held up: the greeting line ("2 overdue · 3 due soon") is an excellent summary; the queue at 320px; the pending-join card with a long, emoji-laden name; the "2 animals not tracked" explanation.

### Animals: collection list and animal card (core)

| ID | P | What's wrong | Why it matters | Proposed fix | Skill | Effort |
|---|---|---|---|---|---|---|
| A1 | **P0** | The search input is `flex-1` without `min-w-0` (`Animals.tsx:253`), so its intrinsic width pushes the sort `<select>` and the grid/list toggle out of the 390px viewport. The page becomes 477px wide at both 390 and 320 whenever animals exist; the browser pans sideways and fixed overlays render offset (`docs/design/scan/animals-overflow.jpg`, `upgrade-modal-shifted.jpg`). | The main collection screen is broken on every iPhone. | `min-w-0` on the input; on phones put sort and density on their own compact row or behind a single "Sort" control. Re-verify at 320, 390 and 430. | impeccable layout / adapt | S |
| A2 | P2 | Five layers of chrome before the first animal: header with button, Animals/Enclosures segment, search row, status chips, category chips. Only about 1.3 cards are visible on the first screen. | The collection is the content; at 6 animals the filters cost more than they save. | Merge status and category chips into one scrollable row, and hide category chips when there is one category. | impeccable layout / distill | S |
| A3 | P2 | The missing-photo placeholder is a 🦎 at 30% opacity for every species (snakes too), 160px tall; the status dot repeats what the coloured "due" line already says. | Generic and slightly wrong for most of the collection. | A quiet placeholder (initial in Playfair on a tinted surface, or an outline icon), shorter when there is no photo in list density. Prototype with A4. | prototype | S |
| A4 | P2 | Card variants worth comparing: photo-first tile (today), compact row, and a hybrid with a smaller photo and the due line given more weight. | The card is the most-seen component after the Today row. | Prototype 2 to 3 versions behind a toggle for you to pick. | prototype | M |
| A5 | P2 | Empty state shows two "Add" buttons (header and body) and no import route. | Two identical CTAs; keepers with an existing spreadsheet do not learn import exists. | Body: "Add your first animal" plus "Import a spreadsheet"; hide the header button when empty. | impeccable onboard | S |
| A6 | P2 | "For Sale" uses title case and "🔬 Q" is an unexplained abbreviation. | Inconsistent and cryptic. | "For sale" and "Quarantine" (or an icon with an accessible label). Changes visible text, so listed under decisions. | impeccable clarify | S |

What held up: 120-character limits in the schema; long, emoji and unbreakable names all truncate cleanly on cards; 56 animals render and lazy-load photos; species and morph truncate with the name still readable.

### Animal profile (core)

| ID | P | What's wrong | Why it matters | Proposed fix | Skill | Effort |
|---|---|---|---|---|---|---|
| PR1 | P1 | Money formatting: "Net cost" shows `$-95.00` while the lines above show `−$95.00` (`AnimalDetail.tsx:999`); a negative net cost is shown red and positive green, which reads backwards for a cost. Currency is formatted by hand with `toFixed(2)` in many places. | Money shown wrong erodes trust in every other number. | One `formatAUD` helper (`Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' })`); fix the sign; decide the label ("Net cost" vs "Net"). Label change is under decisions. | impeccable harden / clarify | S |
| PR2 | P2 | Weights render as raw grams: `98500g`, `85000g`, no thousands separators. | A retic at "98500g" is hard to read; 98.5 kg is how a keeper thinks. | Display helper: grams below 1,000 (with one decimal under 10g), kilograms with one decimal above; stored values unchanged. | impeccable harden | S |
| PR3 | P2 | No photo: a 170px hero holding a lizard emoji; a missing species leaves a bare name with nothing under it. A long name wraps to 3 lines of 36px. | A lot of screen for no information. | Collapse the hero when there is no photo (name, meta and an "Add photo" affordance); clamp the display size for long names. | impeccable layout | S |
| PR4 | P2 | Six tabs scroll horizontally with "Heal…" cut at the edge and no fade or scroll cue; tabs lack tab semantics (G12). | The cut-off tab reads as a rendering bug. | Edge fade mask, scroll the active tab into view, `role="tablist"`. Tab count stays at six (decided in `docs/plan/README.md`). | impeccable layout | S |
| PR5 | P2 | Section labels inside cards are uppercase 12px ("RECENT FEEDINGS", "WEIGHT TREND", "FINANCIALS") while the dashboard uses Playfair titles. Quick actions use emoji (G14). | Inconsistent hierarchy. | Covered by G9 and G14. | | |
| PR6 | P2 | The growth chart draws over 1.5s every time the Vitals tab opens (Recharts default), and the target-weight input sits inside the chart card. | Functional data should not perform; see M1. | See M1. | | |

What held up: the overview cards (last fed, next feeding, weight, shed, "Takes food 4 of last 5") are excellent; long morph text wraps fully. ~~The back, QR and edit buttons are 44px.~~ **Correction (15 October 2026):** this was wrong. They were 36px (`w-9 h-9`). They became 44px on touch screens in batch 2 and remain 44px in the redesigned glass buttons over the photo.

### Logging a feeding, weight or shed (core)

| ID | P | What's wrong | Why it matters | Proposed fix | Skill | Effort |
|---|---|---|---|---|---|---|
| L1 | P1 | Logging happens in the floating modal described in G8 (no motion, not a sheet, actions near the home indicator, focus ring on ×). | The most frequent task in the app. | G8 + G1 + G11. | animate, mobile-native | (in G8) |
| L2 | P2 | 35 `type="number"` inputs with no `inputMode`; weight takes decimals but gets the default keypad; no `enterKeyHint`. | Wrong keyboard for the job, one-handed. | `inputMode="decimal"` for weights and money, `"numeric"` for counts, `enterKeyHint="done"` on the last field. | mobile-native | S |
| L3 | P2 | After a successful Feed from the Today queue, the row vanishes instantly when the list refreshes. | A teleport at the exact moment the keeper is watching. | See O3. | animate | S |

What held up: the form prefills the last meal; labels, hints and errors are properly wired; inputs are 16px on phones, so iOS does not zoom.

### Household (core)

| ID | P | What's wrong | Why it matters | Proposed fix | Skill | Effort |
|---|---|---|---|---|---|---|
| H1 | P1 | Member rows: "Make owner" and "Remove" are about 24px tall and adjacent (`Settings.tsx:503-515`); the pending-request name has no `min-w-0`, so a long name squeezes the Approve/Deny buttons. | Mis-tapping "Remove" on a household member is the most damaging mis-tap in the app. | 44px targets; move member management behind a per-member row action or sheet; `min-w-0` on names and `shrink-0` on actions. | impeccable layout / harden | S |
| H2 | P2 | Role shows as lowercase "owner" in the member badge and "Owner" in "Your role: Owner". | Small inconsistency on a trust-sensitive screen. | One casing ("Owner"). | impeccable clarify | S |
| H3 | P2 | Waiting-for-approval and onboarding screens use emoji (⏳ 🌿 🤝 🚫) as their only visual and `min-h-screen`. | Covered by G14 and G10. | | | |

What held up: long and emoji household names wrap cleanly at 320px; the waiting screen's copy is clear and reassuring; approve/deny appears both on the dashboard and in Settings. The approval flow itself is unchanged by anything in this report.

### Settings

| ID | P | What's wrong | Why it matters | Proposed fix | Skill | Effort |
|---|---|---|---|---|---|---|
| S1 | P2 | The page is titled "Settings" with a "Settings" tab inside it; sections run Profile, Collection, Data, Notifications, Legal, Vet contacts, then "Sign out" as plain text. | Vet contacts are keeper data, not app settings, and sit below Legal. | Tabs "General" / "Import & export"; order Profile, Household, Vet contacts, Notifications, Data, Legal; sign out as a proper secondary button. | impeccable layout / clarify | S |

### Import wizard

| ID | P | What's wrong | Why it matters | Proposed fix | Skill | Effort |
|---|---|---|---|---|---|---|
| I1 | P2 | The step indicator shows 1–2–3–4 with only the current step's name, placed after step 4 ("…4 Upload"). | Reads as if "Upload" were step 5. | Name under each step, or "Step 1 of 4 · Upload" above the dots. | impeccable layout | S |
| I2 | P2 | Steps 2 to 4 (mapping, preview, errors) were not exercised in this scan. | Import is where real-world data is messiest. | In the harden batch, run the template plus a deliberately bad CSV (unknown species, mixed date formats, duplicate names, empty rows, 500 rows) at 390px and fix what breaks. | impeccable harden | M |

### Upgrade modal

| ID | P | What's wrong | Why it matters | Proposed fix | Skill | Effort |
|---|---|---|---|---|---|---|
| U1 | **P0** | `UpgradeModal.tsx` collects an email and shows "You're on the list! We'll email … when Pro launches", but `handleSubmit` only sets local state; nothing is stored or sent. | A false promise at the moment a keeper hits the free limit. Violates "true before pretty". | Your call (see decisions): recommended, drop the email field and say Pro is coming and will be announced in the app. Storing emails needs a table and a migration, which this pass must not add. | impeccable clarify | S |
| U2 | P1 | It lists "Export your data" as a Pro feature, but "Export collection" is free in Settings today. 🚀 emoji and "Upgrade to Pro" title over a feature that does not exist yet. | Another untrue claim, and the rocket is off-tone (gamey). | Remove or reword the export line (decision); calm visual; title like "You've reached the free limit". Prototype 2 to 3 versions. | impeccable clarify, prototype | M |

The 5-animal limit and its behaviour stay as they are; only presentation and copy change.

### Sign in and sign up

| ID | P | What's wrong | Why it matters | Proposed fix | Skill | Effort |
|---|---|---|---|---|---|---|
| AU1 | P2 | The sign-in password placeholder is `••••••••`, which looks like a remembered password. | Keepers may think they are already filled in. | No placeholder (label is enough). | impeccable clarify | S |
| AU2 | P2 | "Terms" and "Privacy Policy" links on sign-up are the same colour as the sentence, not underlined. | Links that cannot be seen. | Underline. | impeccable polish | S |
| AU3 | P2 | The logo tile is a sans "V" on green; the app icon is a serif "V". | Two marks. | Covered by G7. | | |

What held up: the screens are calm, centred and fit on one iPhone screen; Google sign-in is clearly secondary.

### Secondary screens (Feeding log, Stats, Reminders, Expenses)

| ID | P | What's wrong | Why it matters | Proposed fix | Skill | Effort |
|---|---|---|---|---|---|---|
| X1 | P2 | Feeding log cards and Reminders rows use a 3px coloured left border (`Reminders.tsx:76`, feeding log by prey type). Flagged by the detector. | The colour encodes prey type on one screen and status on another; reads as decoration. | Remove the stripe; carry status in the existing dot or text. | impeccable quieter | S |
| X2 | P2 | Stats: big numbers in Playfair with old-style figures (digits sit at different heights, so "80%" reads unevenly); category bars reuse status colours (Lizards amber, Veterinary red). | Breaks the Earned Colour rule: amber and red read as warnings. | DM Sans tabular figures; a neutral or Leaf-tint ramp for categories. | impeccable colorize / typeset | S |
| X3 | P2 | "Feeding Log" header crams two buttons beside the title on phones. | Crowded on 320px. | Primary action only in the header, "Feed 5 due" as a banner or chip below. | impeccable layout | S |

---

## Motion

Inventory: Button, AnimalCard and a few segments use `transition-all`; Toast fades and slides in over 300ms with no exit; the FAB icon rotates 45° over 200ms; skeletons pulse; spinners spin; all Recharts charts use the default 1.5s draw; Expenses bars animate `width` over 500ms; Modal's entrance classes do nothing (G8). There is no `prefers-reduced-motion` handling and no shared easing or duration tokens. The motion that exists is mostly well judged in spirit; the gaps are where motion is missing on the things that move most.

### Fixes to existing motion (improve-animations)

| ID | P | Location | Finding | Fix |
|---|---|---|---|---|
| M1 | P2 | `WeightSection.tsx:81`, `SheddingSection.tsx:79`, `HealthEventsSection.tsx:62`, `Stats.tsx:199-218`, `AnimalDetail.tsx:967, 1312` | Every chart replays a 1.5s draw on each tab switch. Functional data the keeper is reading. | `isAnimationActive={false}` (or 300ms ease-out on first mount only). |
| M2 | P2 | `Toast.tsx:60` | `transition-all duration-300` with the default curve; toasts vanish with no exit; no safe-area offset (G1). | Transition `transform, opacity` only, 200ms `cubic-bezier(0.23, 1, 0.32, 1)`, exit down the same edge before unmount. |
| M3 | P2 | `Button.tsx:21`, `AnimalCard.tsx:27`, segmented controls | `transition-all` animates every property; the card scales on hover (fine on desktop, Tailwind v4 already gates `hover:`). | Name the properties (`background-color, color, transform`); press state per G5. |
| M4 | P2 | `Expenses.tsx:580, 667` | Bars animate `width` (layout) over 500ms. | `transform: scaleX()` from the left, 300ms ease-out, or no animation. |
| M5 | P2 | global | No `prefers-reduced-motion`. | One block in `index.css`: drop translate/scale, keep opacity fades, stop the skeleton pulse. |

### Where motion would genuinely help (find-animation-opportunities)

| # | Location | Today | Purpose | Frequency | Suggested motion |
|---|---|---|---|---|---|
| O1 | `Modal.tsx`, `BottomNav.tsx` More sheet | Appear and vanish instantly | Spatial consistency | Several times a day | Phone sheet: `translateY(100%)` to 0, 280ms `cubic-bezier(0.32, 0.72, 0, 1)`; exit 200ms the same path; scrim opacity 0 to 1 over 200ms. Desktop dialog: `scale(0.97)` + opacity, 200ms `cubic-bezier(0.23, 1, 0.32, 1)`. Reduced motion: opacity only. |
| O2 | Feed buttons, primary buttons, chips, nav tabs | No press feedback | Feedback | Tens a day | `:active { transform: scale(0.97) }`, `transition: transform 120ms cubic-bezier(0.23, 1, 0.32, 1)`. |
| O3 | Today queue row after a feeding is logged | Row disappears on refresh | Preventing a jarring change | A few to 20 a day | Row fades to 0 and collapses its height over 200ms ease-out after the success toast; the rest of the list closes the gap. Needs a feel check: if it delays a second Feed tap, cut it. |
| O4 | Dashboard FAB speed dial | Items pop in | Spatial consistency | Occasional | Items fade + `translateY(8px)` to 0, 150ms ease-out, 30ms stagger bottom-up; reverse on close. |

Rejected on purpose: bottom-nav tab transitions (core navigation, hundreds of times a week); profile tab content transitions (tens a day, the keeper is reading); chart draw animations (functional data, M1 removes them); staggered entrance on the Animals grid (seen constantly); skeleton-to-content crossfades (add delay to every load); any celebratory motion on logging (the product is deliberately not gamey).

Verdict: Vivarium needs very little motion. The one change that matters is O1 with G8: dialogs and sheets that arrive from the bottom and leave the same way. Everything else is small.

---

## Proposed Stage 2 batches

Each batch: read `craft-floor.md`, make the changes, check at 390×844 and desktop (dark only), run `npm test`, `npm run build` and `npm run render`, commit, summarise. Items marked **(device)** also need a check on your iPhone.

| Batch | Priority | Contents | Skills | Size |
|---|---|---|---|---|
| 1. Fix what is broken | P0 + quick P1 | A1 Animals overflow; U1 + U2 upgrade modal copy (after your decision); G1 safe-area offsets for FAB, toasts, modals **(device)**; G7 favicon and home-screen icons **(device)**; G17 template leftovers | impeccable layout, clarify; mobile-native | S–M |
| 2. Phone baseline and accessibility | P1 | G5 tap highlight, touch-action, user-select, press states **(device)**; G10 theme-color, dvh, overscroll; G2 nav contrast; G3 text red; G4 + H1 44px targets; G11 focus-visible; G12 tab semantics and labels; L2 input modes **(device)**; G6 tokens for the shared `ui/` and `layout/` components (no visual change) | mobile-native; impeccable audit, colorize, layout | M |
| 3. Core screens | P1 | D1 Today row status; D2 first-run dashboard (prototype 2); A5 empty Animals; PR1 money formatting; PR2 weight formatting; G13 dates (if approved) | impeccable onboard, harden, clarify, layout; prototype | M |
| 4. Sheets and motion | P1 + P2 | G8 + O1 modal-as-sheet and More sheet with motion, optional drag to dismiss **(device)**; O2 press feedback; O3 row exit; O4 FAB; M1–M5; toasts per your Sonner decision | animate, animation-performance, apple-design, ask-sonner | M |
| 5. Prototypes to choose from | P2 | Upgrade modal (2–3 versions); animal card A3 + A4 (2–3 versions); you pick, then I build the winner | prototype | M |
| 6. Polish | P2 | G9 typography; G14 icons (if approved); A2 chip rows; A6; PR3 hero; PR4 tab fade; H2; S1; I1; I2 import harden; X1–X3; AU1–AU2; G18; D4 | impeccable typeset, quieter, layout, clarify, harden | M–L |
| 7. Performance | P2 | G15 route code splitting; G16 self-hosted fonts (if approved) | impeccable optimize | M |

Stage 3 (polish, review-animations, DESIGN.md and this report updated) follows as you described.

## Decisions I need from you

1. **Upgrade modal (U1, U2).** The waitlist email is never saved. Recommended: remove the email field and say "Pro is on the way. We'll announce it here in the app." Alternatives: keep the field and actually store emails (needs a table and migration, outside this pass's rules), or link to an email address you own. Also: remove "Export your data" from the Pro list (export is free today), or confirm export is moving to Pro.
2. **Text red (G3).** Add a lighter red `#dc7a7a` for overdue/refused/error text, keeping `#c45a5a` for dots, borders and fills, and darken the danger button fill. Small shift inside the existing palette. OK?
3. **Emoji as UI icons (G14).** Replace emoji in chips, quick actions, empty states, activity rows and the FAB with outline icons in the nav's style? Recommended yes; the leaf/olive palette and the existing SVG icons stay.
4. **Date format (G13).** Switch every displayed date to day-month ("27 Sep", "13 Sep 2026")? Visible text changes, values do not.
5. **Copy changes:** "For Sale" to "For sale", "🔬 Q" to "Quarantine" (A6); "Net cost" label and its colours (PR1); "Settings" tab to "General" (S1); role casing "Owner" (H2); sign-in password placeholder removed (AU1). Approve as a group or pick.
6. **Toasts.** Keep the custom 87-line toast and fix its exit, curve and safe-area (recommended, no dependency), or adopt Sonner (about 10 KB, adds swipe-to-dismiss and stacking)?
7. **Fonts (G16).** Self-host Playfair Display and DM Sans for offline use: add `@fontsource` packages (2 small dependencies) or commit the woff2 files directly (no dependency). Recommended: commit the files.
8. **Out of scope, flagged only:** supabase-js keeps the session (access and refresh tokens) in `localStorage` by default, which conflicts with your "never store tokens in localStorage" guardrail. Changing it touches the auth flow, so this pass will not. Worth a separate, careful task.
