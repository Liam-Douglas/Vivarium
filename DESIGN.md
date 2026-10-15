---
name: Vivarium
description: A calm, dark field journal for a household's reptile collection.
colors:
  night-soil: "#1a1a18"
  bark: "#242420"
  moss-stone: "#2e2e2a"
  leaf: "#8fbe5a"
  lamp-amber: "#d4924a"
  clay-red: "#c45a5a"
  fern-green: "#5a9e6a"
  pond-blue: "#5a8fbe"
  parchment: "#f0ece0"
  dry-grass: "#a8a090"
  sand: "#9f9684"
  ink-shadow: "#505048"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0.05em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.leaf}"
    textColor: "{colors.night-soil}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.parchment}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.dry-grass}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-danger:
    backgroundColor: "{colors.clay-red}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.bark}"
    rounded: "{rounded.lg}"
    padding: "16px"
  card-elevated:
    backgroundColor: "{colors.moss-stone}"
    rounded: "{rounded.xl}"
    padding: "24px"
  input:
    backgroundColor: "{colors.night-soil}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.dry-grass}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  nav-tab-active:
    textColor: "{colors.leaf}"
  nav-tab-inactive:
    textColor: "{colors.ink-shadow}"
---

# Design System: Vivarium

<!-- Documented from the code as it stood on 15 October 2026 (main @ 109e577), before the design pass. Values describe what ships, including the parts DESIGN_SCAN_REPORT.md proposes to change. -->

## Overview

**Creative North Star: "The Keeper's Field Journal"**

Vivarium looks like a well-kept notebook used in the evening beside the enclosures: warm near-black paper, serif headings set like journal entries, and a single leaf-green ink reserved for what the keeper can act on. It is dark-only on purpose. Keepers check their animals with the room lights low, and a bright screen in a dim reptile room is the wrong object.

Density is moderate and list-led. Screens are built from stacked rounded surfaces on the page ground, each carrying one job: today's feeding queue, a care task, a stock warning, a history. Status colour (green, amber, red) is the loudest thing on most screens and is meant to be; everything else is warm grey on warm black.

The voice is calm and factual. Copy explains what the app knows and why ("X has no feeding schedule, so it will never appear as due"), and the visual system follows: no gradients, no glows, no decorative motion.

**Key Characteristics:**
- Dark-only, warm-tinted neutrals (never pure black or blue-grey).
- Playfair Display for headings and names; DM Sans for everything a keeper reads quickly.
- One accent (leaf green) for actions and "on schedule"; amber and red only for urgency.
- Flat tonal layering: surfaces step up in lightness instead of casting shadows.
- Rounded, soft-cornered containers (12px) and pill chips.

## Colors

A warm, low-light palette: brown-black grounds, parchment text, and three status hues borrowed from the vivarium itself (leaf, heat lamp, clay).

### Primary
- **Leaf** (`leaf`): the only action colour. Primary buttons (with Night Soil text), active nav, links, the "Feed" buttons' text, focus borders on inputs, and positive deltas. Also the "info" toast dot.

### Secondary
- **Lamp Amber** (`lamp-amber`): "due soon" and warnings: due-today rows, low feeder stock, quarantine badge, the "showing what loaded earlier" banner.
- **Clay Red** (`clay-red`): overdue, refused, errors, destructive buttons and delete icons.

### Tertiary
- **Fern Green** (`fern-green`): the "fed / on schedule" status dot and success toasts. Distinct from Leaf, which means "you can tap this".
- **Pond Blue** (`pond-blue`): weight events and a few chart series. Used sparingly; a near-duplicate `#5a8ebe` also appears in the code.

### Neutral
- **Night Soil** (`night-soil`): the page ground, input wells, bottom nav and sidebar. Also the PWA manifest theme and background colour.
- **Bark** (`bark`): default card surface.
- **Moss Stone** (`moss-stone`): elevated surfaces: modals, toasts, selected segments.
- **Parchment** (`parchment`): primary text and headings.
- **Dry Grass** (`dry-grass`): secondary text, labels, descriptions.
- **Sand** (`sand`): tertiary metadata (timestamps, enclosure names, hints).
- **Ink Shadow** (`ink-shadow`): inactive bottom-nav icons and labels.
- Hairlines are white at 4 to 10% opacity (`rgba(255,255,255,0.06)` is the default card border).

### Named Rules
**The Earned Colour Rule.** Amber and red appear only when an animal or task needs something. They are never decorative, never category colours, and never used for a chart series that is not about urgency.

**The One Ink Rule.** Leaf green marks what can be tapped or what is going well. If an element is neither, it is grey.

## Typography

**Display Font:** Playfair Display (with Georgia, serif)
**Body Font:** DM Sans (with system-ui, sans-serif)

**Character:** A high-contrast transitional serif for names and headings gives each animal and screen the weight of a journal entry; a soft geometric sans carries the fast-scanned data underneath. Both load from Google Fonts.

### Hierarchy
- **Display** (700, 30 to 36px, 1.2): an animal's name on its profile, over the photo.
- **Headline** (700, 24px, 1.25): page titles ("Animals", "Feeding Log", the dashboard greeting).
- **Title** (600, 16 to 18px, 1.4): section headings ("Today", "Recent activity"), card names, modal titles.
- **Body** (400 to 500, 14px, 1.45): row text, form fields (16px on screens 640px and narrower so iOS does not zoom on focus).
- **Label** (500, 12px, 0.05em, uppercase): section labels inside cards ("RECENT FEEDINGS", "PROFILE", "INVITE CODE"). 12px is also the most used size in the app for metadata.

### Named Rules
**The Serif-For-Names Rule.** Playfair is for names and headings only: an animal, a page, a section. Data, counts, buttons and labels are DM Sans.

## Layout

Mobile-first, single column with a 16px side gutter (`px-4`) and 24px top padding. Pages cap at 1024px (`max-w-5xl`) and centre on wide screens.

- **Phone (below 768px):** a fixed bottom tab bar (Home, Animals, Feeding, Stats, More) padded by the bottom safe-area inset, with a "More" sheet for Reminders, Expenses, Feeder stock, Import and Settings. Pages reserve 96px at the bottom for it. The dashboard adds a floating action button (56px) for quick logging.
- **Desktop (768px and up):** a 224px left sidebar with the full navigation, household name and signed-in user. The dashboard's Today queue becomes a table at 1024px and above, with a right-hand column for care tasks, stock and activity.
- **Top inset:** `main` pads by `env(safe-area-inset-top)` because the viewport uses `viewport-fit=cover` and the installed PWA draws under the status bar.
- **Rhythm:** 8px and 12px gaps inside components, 16px between cards in a group, 24px between page sections.

## Elevation & Depth

Flat, tonal layering. Depth comes from lightness steps (Night Soil, then Bark, then Moss Stone) plus a 1px white hairline at 6 to 8% opacity. Shadows are rare and reserved for things that float over content.

### Shadow Vocabulary
- **Float** (`box-shadow` from Tailwind `shadow-lg`): the FAB, its speed-dial items and toasts.
- **Dialog** (Tailwind `shadow-2xl`): modals, over a 70% black scrim.

### Named Rules
**The Lamp-Off Rule.** Surfaces are flat at rest. Nothing glows. If something needs to stand out, it gets a lighter surface or a status colour, not a shadow.

## Shapes

Soft and consistent: 12px corners (`rounded-xl`) on cards, buttons and inputs; 16px (`rounded-2xl`) on modals, sheets and large choice cards; full pills for chips, badges, status dots and the FAB; 8px on small icon buttons. Photos fill their card's top edge and inherit its corners. No sharp corners anywhere.

## Components

### Buttons
Quiet and solid. Shape: 12px corners.
- **Primary:** Leaf fill, Night Soil text, 8px by 16px (sm 6px by 12px, lg 12px by 24px), 500 weight.
- **Secondary:** transparent with a 10% white border and Parchment text; 5% white fill on hover.
- **Ghost:** no border, Dry Grass text, brightens on hover.
- **Danger:** Clay Red fill, Parchment text.
- **Row action ("Feed"):** a tinted Leaf surface (Leaf at about 12% with a Leaf hairline) and Leaf text: the signature in-list action.
- **Focus:** a 2px Leaf ring with a Night Soil offset (applied on any focus, not only keyboard focus).
- **Loading:** an inline spinner before the label; disabled at 50% opacity.

### Chips
- **Style:** pill, 1px border tinted with the chip's tone, tone-coloured text, transparent fill.
- **Selected:** the tone at low opacity as fill. Status chips (Overdue, Due soon, Quarantine) use the status colours; category chips (Snakes, Lizards) carry an emoji.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Bark; Moss Stone when elevated.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1px white at 6%.
- **Internal Padding:** 12px (animal cards), 16px (most cards), 24px (modals and auth cards).
- **Alert cards** (care task due, low stock, untracked animals, pending join request) tint their background and border with the status colour at 8 to 30%.

### Inputs / Fields
- **Style:** Night Soil well, 1px white border at 10%, 12px corners, 10px by 16px padding, 14px text (16px on small screens).
- **Focus:** border turns Leaf; no ring.
- **Error:** Clay Red border and a Clay Red 12px message announced with `role="alert"`; hints in Dry Grass, wired with `aria-describedby`.

### Navigation
- **Bottom bar (phone):** five equal tabs, 22px icons over 10px labels. Active is Leaf with a filled icon and 600 weight; inactive is Ink Shadow with an outline icon. Night Soil background with a hairline top border.
- **More sheet:** slides up from the bar (no motion today) with a grabber, 60px rows of label plus one-line description and a chevron, over a blurred 72% scrim.
- **Sidebar (desktop):** 20px outline icons with labels; active row gets a Leaf tint at 12% and Leaf text.

### Animal Card (signature component)
A photo-first tile in a two-column grid on phones: a 160px photo (or a dimmed emoji placeholder), a status dot in the corner, optional "Q" quarantine and "For Sale" badges, then the name in Playfair, species and morph, the next-feeding line in its status colour, and the enclosure. A compact list density is also available.

### Today Queue Row (signature component)
Status dot, name and lateness ("4 days overdue") on one line, the last meal and enclosure underneath, and a Feed button on the right that opens the feeding form prefilled with the last meal. Batch selection via "Select".

## Do's and Don'ts

### Do:
- **Do** keep every surface warm: Night Soil, Bark and Moss Stone, never `#000` or a blue-grey.
- **Do** use status colour only for status, and pair it with words ("4 days overdue"), never colour alone.
- **Do** set animal names and headings in Playfair Display and everything else in DM Sans.
- **Do** keep form controls at 16px on phones; pinch-zoom stays enabled.
- **Do** show loading, failed and empty as three different states (`LoadError`, `EmptyState`, skeletons).

### Don't:
- **Don't** add a light theme or bright surfaces; the dark ground is a product decision.
- **Don't** use gradients, glows or decorative shadows on cards.
- **Don't** introduce a second accent hue for actions; Leaf is the only one.
- **Don't** gamify (streaks, badges, celebratory motion); the streak badge was deliberately removed from cards.
