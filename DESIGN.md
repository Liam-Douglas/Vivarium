---
name: Vivarium
description: A household's reptile collection, kept the way Apple would have built the app.
colors:
  grouped-background: "#F2F2F7"
  grouped-background-dark: "#000000"
  cell: "#FFFFFF"
  cell-dark: "#1C1C1E"
  elevated: "#FFFFFF"
  elevated-dark: "#2C2C2E"
  fill: "rgba(118, 118, 128, 0.12)"
  fill-dark: "rgba(118, 118, 128, 0.24)"
  fill-pressed: "rgba(118, 118, 128, 0.2)"
  fill-pressed-dark: "rgba(118, 118, 128, 0.36)"
  label: "#000000"
  label-dark: "#FFFFFF"
  secondary-label: "#6C6C70"
  secondary-label-dark: "#98989F"
  tertiary-label: "#8E8E93"
  tertiary-label-dark: "#6E6E73"
  separator: "rgba(60, 60, 67, 0.29)"
  separator-dark: "rgba(84, 84, 88, 0.65)"
  keeper-green: "#1E7A35"
  keeper-green-dark: "#30D158"
  on-green: "#FFFFFF"
  on-green-dark: "#000000"
  overdue-red: "#D70015"
  overdue-red-dark: "#FF453A"
  due-orange: "#C93400"
  due-orange-dark: "#FF9F0A"
  weight-blue: "#0040DD"
  weight-blue-dark: "#409CFF"
  breeding-purple: "#8944AB"
  breeding-purple-dark: "#BF5AF2"
  segment: "#FFFFFF"
  segment-dark: "#636366"
  bar-material: "rgba(249, 249, 249, 0.8)"
  bar-material-dark: "rgba(22, 22, 23, 0.8)"
  scrim: "rgba(0, 0, 0, 0.4)"
  scrim-dark: "rgba(0, 0, 0, 0.6)"
typography:
  large-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: "41px"
  title-1:
    fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "34px"
  title-2:
    fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: "28px"
  title-3:
    fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: "25px"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: "22px"
  subhead:
    fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "20px"
  footnote:
    fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  caption-1:
    fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
  caption-2:
    fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "13px"
  tab-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: "12px"
  placeholder-initial:
    fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "48px"
    fontWeight: 600
  hero-initial:
    fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "96px"
    fontWeight: 600
  brand-mark:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontWeight: 700
rounded:
  tile: "7px"
  field-small: "8px"
  segment: "9px"
  field: "10px"
  card: "12px"
  app-icon: "15px"
  sheet: "16px"
  capsule: "9999px"
spacing:
  hairline: "0.5px"
  row-inset: "16px"
  row-height: "44px"
  section-gap: "24px"
  page-gutter: "16px"
  page-gutter-wide: "32px"
components:
  button-primary:
    backgroundColor: "{colors.keeper-green}"
    textColor: "{colors.on-green}"
    rounded: "{rounded.card}"
    height: "44px"
    padding: "0 16px"
  button-secondary:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.label}"
    rounded: "{rounded.card}"
    height: "44px"
  button-destructive:
    backgroundColor: "{colors.overdue-red}"
    textColor: "{colors.on-green}"
    rounded: "{rounded.card}"
  row-action-capsule:
    backgroundColor: "color-mix(in srgb, #1E7A35 14%, transparent)"
    textColor: "{colors.keeper-green}"
    rounded: "{rounded.capsule}"
    height: "30px"
    padding: "0 16px"
  bar-button-add:
    backgroundColor: "{colors.keeper-green}"
    textColor: "{colors.on-green}"
    rounded: "{rounded.capsule}"
    size: "36px"
  list-section:
    backgroundColor: "{colors.cell}"
    rounded: "{rounded.card}"
  list-row:
    textColor: "{colors.label}"
    typography: "{typography.body}"
    padding: "10px 16px"
    height: "44px"
  text-field:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.label}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    height: "44px"
  segmented-control:
    backgroundColor: "{colors.fill}"
    rounded: "{rounded.segment}"
    height: "32px"
  segmented-control-selected:
    backgroundColor: "{colors.segment}"
    textColor: "{colors.label}"
    rounded: "{rounded.tile}"
  filter-capsule:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.label}"
    rounded: "{rounded.capsule}"
    height: "32px"
  filter-capsule-selected:
    backgroundColor: "{colors.keeper-green}"
    textColor: "{colors.on-green}"
  summary-tile:
    backgroundColor: "{colors.cell}"
    rounded: "{rounded.card}"
    padding: "12px 14px"
  icon-tile:
    textColor: "#FFFFFF"
    rounded: "{rounded.tile}"
    size: "30px"
  tab-bar:
    backgroundColor: "{colors.bar-material}"
    height: "49px"
  sheet:
    backgroundColor: "{colors.cell}"
    rounded: "{rounded.sheet}"
---

# Design System: Vivarium

## Overview

**Creative North Star: "The Native Keeper"**

Vivarium is the reptile-keeping app Apple could have shipped. It plays iOS straight: SF Pro, large titles that collapse into a translucent bar, inset grouped lists, system colours, the standard tab bar, sheets that rise from the bottom edge and can be dragged away. Nothing is invented on top. The craft bar is Things 3: everything Apple's own apps do, done with the same care, and a check-off that feels good.

The content is the keeper's evening round: who is due to eat, logged in seconds at the enclosure, often one-handed and in low light. So the screens are calm and grey by default, colour is spent only on what needs doing, and the appearance follows the phone. Dark mode is not a theme; it is half of the people using it at 9pm.

Motion is expressive in Apple's idiom: deeper screens push in from the right and pop back, sheets spring up on the iOS drawer curve, selections slide, and a fed animal's row ticks and folds away. Every movement has a fade-only fallback under Reduce Motion.

**Key Characteristics:**
- iOS system conventions at full fidelity; no custom chrome.
- Light and dark from the phone's setting; Apple's increased-contrast colour variants wherever the standard ones miss WCAG AA as text.
- One tint, system green, for what can be tapped and what is going well.
- Red and orange only for an animal or task that needs something.
- Inset grouped lists as the default container; summary tiles for figures.
- SF Pro (the system stack) on Apple's text styles, nothing smaller than 11pt outside the tab bar.

## Colors

Apple's semantic system colours as CSS tokens (`src/index.css`), each with a light and a dark value chosen by `prefers-color-scheme`. Components use the semantic names (`bg-surface`, `text-label-2`, `bg-tint`), never raw values.

### Primary
- **Keeper Green** (#1E7A35 light / #30D158 dark): the tint. Buttons, links, bar buttons, the selected filter capsule, the check-off, "on schedule". The light value is system green darkened to 5.4:1 as text; the dark value is system green as Apple ships it. Text on it is white in light and black in dark (`on-tint`).

### Secondary
- **Overdue Red** (#D70015 / #FF453A): overdue feedings, refused meals, destructive actions, over-budget.
- **Due Orange** (#C93400 / #FF9F0A): due today or tomorrow, low stock, quarantine. Light is the increased-contrast variant.

### Tertiary
- **Weight Blue** (#0040DD / #409CFF): weight records and their tiles; also doses on Today.
- **Breeding Purple** (#8944AB / #BF5AF2): breeding and incubation on the timeline; medication tiles.

### Neutral
- **Grouped Background** (#F2F2F7 / #000000): the page behind every grouped list.
- **Cell** (#FFFFFF / #1C1C1E): list sections, summary tiles, cards, sheets.
- **Elevated** (#FFFFFF / #2C2C2E): menus, popovers, toasts.
- **Fill** (rgba(118,118,128,.12) / .24): text fields, segmented tracks, unselected capsules, secondary buttons. **Pressed fill** (.2 / .36) for active rows.
- **Label** (#000 / #FFF), **Secondary Label** (#6C6C70 / #98989F, 4.7:1), **Tertiary Label** (#8E8E93 / #6E6E73, icons and placeholders only).
- **Separator** (rgba(60,60,67,.29) / rgba(84,84,88,.65)): hairlines between rows, inset to where the text starts.
- **Bar Material** (rgba(249,249,249,.8) / rgba(22,22,23,.8)) with `saturate(180%) blur(20px)`: tab bar and collapsed navigation bar; solid cell colour where blur is unavailable or Reduce Transparency is on.
- **Scrim** (rgba(0,0,0,.4) / .6): behind sheets.

### Named Rules
**The Earned Colour Rule.** Red and orange mean an animal or a task needs something. A cost, a category, a chart series or a decoration is never red or orange; category bars are the tint alone.

**The One Tint Rule.** Green marks what can be tapped and what is going well. If an element is neither, it is a label grey.

## Typography

**Font:** the system stack, `-apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', Roboto, sans-serif`, which is SF Pro on every iPhone. No web fonts load. The only other face is Georgia, for the V in the app mark, so the mark matches the home-screen icon.

**Character:** Apple's text styles, unadorned. Weight and size carry hierarchy; there is no decorative face and no uppercase-tracked label system.

### Hierarchy
- **Large Title** (700, 34/41): one per screen, at the top; collapses to a 17pt semibold title in the bar on scroll.
- **Title 1** (700, 28/34): big figures in summary tiles, the app name on sign-in.
- **Title 2** (700, 22/28): figures in compact tiles, card and sheet titles, the animal's figures on its profile.
- **Title 3** (700, 20/25): section headings ("Feed now", "Medications"), sheet headers.
- **Body** (400, 17/22): every list row, field and primary text. Buttons are body semibold.
- **Subhead** (400, 15/20): secondary row text, section explanations, small buttons and links.
- **Footnote** (400, 13/18): row subtitles, list section headers (semibold), footers.
- **Caption 1 / 2** (12, 11): badges, chart axes, the heatmap. 11 is the floor.
- **Tab label** (500, 10): the tab bar only, as on iOS.

### Named Rules
**The Eleven Point Floor.** Nothing outside the tab bar is set below 11px, including chart ticks and heatmap labels.

**The Figures Rule.** Counts, weights, money and days use `tabular-nums` so columns of figures line up.

## Layout

Phone first at 390pt, holding at 320pt with no sideways scroll. Pages are a single column with a 16px gutter (32px from 1024px). Each screen starts with its large title; on a phone the screen's bar buttons sit in their own row above it, as in a navigation bar, and share the line from 768px.

Content is grouped into sections 24px apart; within a section, rows are 44px minimum with 16px insets. From 768px the tab bar becomes an iPadOS-style sidebar (240px). Today and the animal profile use a second column from 1024px: Today puts care, stock and activity beside the queue; the profile pins the photo, actions and vitals on the left while the history scrolls on the right.

Touch targets are 44px. Controls drawn smaller (capsules, text buttons) carry an invisible 44px hit area. Form controls are 16px or larger on phones so iOS never zooms on focus; pinch-zoom stays enabled.

## Elevation & Depth

Depth comes from layering, not shadow: grey page, white (or #1C1C1E) cells on it, elevated surfaces above. Cells and tiles have no shadow and no outline. Translucent material is used only where iOS uses it, for bars that content scrolls under.

### Shadow Vocabulary
- **Popover** (`--shadow-popover`: `0 8px 24px rgba(0,0,0,.16)`, `.5` in dark): menus, the prey list, toasts, chart tooltips.
- **Segment** (`0 3px 8px rgba(0,0,0,.12), 0 3px 1px rgba(0,0,0,.04)`): the raised segment of a segmented control.
- **App icon** (`0 4px 12px rgba(0,0,0,.12)`): the brand mark at sign-in size.

### Named Rules
**The Flat Cell Rule.** A list section or tile never casts a shadow or carries a border. If it needs separating, it sits on the grouped background.

## Shapes

Continuous-looking rounded rectangles at Apple's radii: 12px for cells, sections, tiles and buttons; 10px for text fields; 9px/7px for the segmented track and segment; 7px for icon tiles; 16px for the top of sheets; full capsules for row actions, filter capsules, tab-section capsules, switches and avatars. Separators are hairlines, inset from the left to where the row's text begins (16px, or past a leading icon tile). Photos are clipped to the same 12px.

## Components

### Buttons
- **Shape:** 12px radius; 44px tall on touch (40 with a mouse), 50px for the large size.
- **Primary:** filled tint, on-tint semibold text. One per view.
- **Secondary:** fill grey, label text.
- **Plain:** tint text only, the iOS bar-button and in-list style ("Add", "Select", "See all", "Pause").
- **Destructive:** filled red with white text in confirmations; red text for destructive rows ("Sign out", "Remove").
- **Press:** opacity to 70% and scale to 0.98 in 150ms on the strong ease-out; no scale under Reduce Motion. Focus is a 2px tint ring.
- **Bar add button:** a 36px tint circle with a plus; it gains its label ("Add animal") from 640px.

### Row action capsule
A 30px capsule at 14% tint with tint semibold text ("Feed", "Log", "+ Stock"), used inside list rows. When a feeding is logged from Today it becomes a filled tint check that pops in, then the row folds away.

### Chips / filter capsules
32px capsules on fill grey; selected is filled with its colour (tint, or the status colour for Overdue and Due soon) with on-tint text.

### Cards / Containers
- **List section:** cell background, 12px radius, no border, rows separated by inset hairlines. Header above it in 13pt semibold secondary label, or a 20pt bold title for a screen's own sections (Things-style); footer below in 13pt secondary label.
- **Summary tile:** cell background, 12px radius, 13pt semibold grey label over a 22–28pt bold figure, coloured only when the figure is a status.
- **Icon tile:** a 30px rounded square in a system colour with a white outline glyph, as in Settings.

### Inputs / Fields
- **Text field:** fill grey, no border, 10px radius, 44px, 17pt; a 2px tint ring on focus, red ring on error, with the message announced.
- **Search field:** 36px, fill grey, magnifier glyph inside.
- **Switch:** the iOS switch, 51×31, drawn on a real checkbox: fill-pressed track, white thumb sliding 300ms on the drawer curve; the track fills with tint (red for "refused" and "archive", orange for quarantine).
- **Segmented control:** fill track, 32px; the white (dark: #636366) segment slides between options on the selection spring.

### Navigation
- **Tab bar:** five items (Today, Animals, Feeding, Stats, More) on bar material with a hairline; 25px glyphs, 10pt labels, tint when selected. More opens a bottom sheet.
- **Large title:** 34pt bold; once scrolled past, a 17pt semibold title fades in on a bar-material strip under the status bar.
- **Sidebar (768px+):** cell background, hairline right edge; the selected row is filled tint.
- **Push and pop:** a deeper screen slides in from 64px right on a critically damped spring (0.42s) with a 220ms fade; going back comes in from 40px left. Tab switches do not move.

### Sheets
Every logging action opens a bottom sheet: cell background, 16px top radius, a grabber, a 20pt bold title and a round grey close button. It rises in 300ms on the drawer curve (`cubic-bezier(0.32, 0.72, 0, 1)`), leaves in 220ms, and drags down to dismiss past 120px or on a flick faster than 0.11px/ms. From 640px it is a centred dialog that settles in from 96% scale.

### Today queue row (signature component)
An initial avatar ringed in the row's status colour, the name in body, then the lateness in its status colour ahead of the last meal and enclosure in footnote. The trailing Feed capsule becomes the check-off.

### Animal tile (signature component)
A 4:3 photo clipped to 12px, as an album in Music, with the name and species below on the page rather than on a card. When the animal is next due sits over a scrim at the foot of the photo, with a status dot.

## Do's and Don'ts

### Do:
- **Do** use the semantic tokens (`bg-surface`, `text-label-2`, `bg-tint`, `border-separator`) so both appearances follow.
- **Do** build screens from large title, inset grouped list sections and summary tiles, in that order of preference.
- **Do** keep figures in `tabular-nums` and on the type ramp above; 11pt is the floor.
- **Do** give every motion a fade-only path under Reduce Motion, and animate `transform` and `opacity` only.
- **Do** use the named springs in `src/lib/motion.ts` (`SPRING_SELECTION`, `SPRING_PUSH`) and the CSS curves `--ease-out` and `--ease-drawer` rather than new ones.
- **Do** show loading, failed and empty as three different states.

### Don't:
- **Don't** put a border or a shadow on a list section, tile or card.
- **Don't** use a coloured stripe down the edge of a row or card to carry status; use a dot, a tile or coloured text.
- **Don't** use emoji as icons; glyphs come from `src/components/ui/icons.tsx`.
- **Don't** use red or orange for anything that does not need doing.
- **Don't** load a web font or introduce a second accent hue.
- **Don't** gamify: no streak flames, badges or celebration beyond the check-off.
