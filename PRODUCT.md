# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

An installable PWA (`display: standalone`, portrait), used mostly from the iPhone home screen and occasionally from a desktop browser. Mobile web, not a native app: no native wrapper.

## Users

Australian reptile keepers, mostly hobbyists with some small breeders, keeping roughly 5 to 50 animals. They log from their phone, standing at the enclosures, often in the evening with the room lights low and sometimes one-handed while holding tongs or a feeder tub. A collection is usually shared within a household (a partner, a family member), so two people log against the same animals and need to see what the other did.

The jobs, in order of frequency:

1. See who is due or overdue to eat, and log the feeding (single or batch).
2. Log weights and sheds, and glance at the trend.
3. Look an animal up: its history, photo, morph, enclosure, health notes.
4. Occasionally: manage feeder stock, expenses, reminders, breeding/incubation, import an existing spreadsheet, manage the household.

## Product Purpose

One trustworthy record of a reptile collection, shared across a household in real time, that is quicker to update from a phone than a spreadsheet or memory. Success is a keeper who logs a feeding in a few seconds, never misses an overdue animal, and trusts that what the app says about their collection is true.

## Positioning

Built around the keeper's actual rhythm (feeding windows judged against each animal's own schedule, sheds, weights) rather than generic pet records, and shared within a household with an owner-approval join flow.

## Operating Context

- Daily: open the app at the enclosures, check what is due, log feedings, sometimes a weight or shed.
- Weekly-ish: review the dashboard's "worth a look" items, restock feeders, add expenses.
- Once: import an existing collection from CSV/XLSX through the 4-step import wizard (Upload, Map, Preview, Import).
- Household: an owner creates the household; members join with an invite code and wait for owner approval.

## Capabilities and Constraints

- Animals, feedings (with prey and feeder-stock deduction), weights, sheds, health events, medication, acquisition, breeding, incubation, exit records, photos (private bucket, signed URLs), enclosures, reminders/care tasks, feeder inventory, expenses, stats.
- Free tier: 5 animals per household. Pro is announced as "coming soon"; there is no payment flow.
- Currency is AUD; dates accept ISO, DD/MM/YYYY and MM/DD/YYYY on import.
- Stack: Vite + React 19 + TypeScript, Tailwind v4, React Router 7, Recharts, Supabase (Postgres, Auth with PKCE, Realtime, Storage), vite-plugin-pwa, deployed on Vercel.
- Out of scope for design work: business logic, Supabase queries, auth flows, RLS, data model, migrations, the owner-approval flow and the free-tier limit's behaviour.
- Security: never the `service_role` key client-side, never hardcoded secrets, `.env.local` stays gitignored, tokens should not be stored in `localStorage`.

## Brand Commitments

- Name: Vivarium.
- Voice: calm, trustworthy and a little warm. Plain, factual sentences. Not playful, not gamey (the streak badge was deliberately cut from cards).
- Identity: dark, leaf/olive palette and the existing icon set stay unless the user approves a change.
- Copy that states facts is not changed without the user's say-so.

## Evidence on Hand

- `README.md` feature list; `docs/plan/` decision records; `docs/design/markups/` earlier before/after boards.
- Render harness with fixture data (`npm run render`, `scripts/render/`), which can draw any screen without credentials.
- No testimonials, user counts or press exist. Do not invent them.

## Product Principles

1. **True before pretty.** A screen that is calm but wrong is worse than one that is plain and right; loading, failed and empty are three different states and are always shown as such.
2. **Seconds at the enclosure.** The common logging paths must be reachable and finishable one-handed on a phone without scrolling.
3. **Urgency is earned.** Amber and red mean an animal needs something; colour is not decoration.
4. **Shared, not social.** Household activity is visible because it prevents double feeding, not to create engagement.
5. **Quiet by default.** Restraint in motion, colour and copy; the collection is the content.

## Accessibility & Inclusion

- Pinch-zoom stays enabled (WCAG 1.4.4); form controls are 16px on small screens so iOS does not zoom on focus.
- Used in low light: dark-only theme is intentional, and text contrast must hold at WCAG AA against the dark surfaces.
- Dialogs trap focus, close on Escape and restore focus; validation errors are announced.
