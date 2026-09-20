# Feeding Log plan

Work arising from the September 2026 look at the Feeding Log page. The page is a
ledger: it answers "what did I feed?" accurately and answers nothing else. Ordered
so the defects land before the features built on top of them. Each phase is its own
pull request and stands alone.

| | Phase | Size | Needs Liam |
|---|---|---|---|
| | 1 — Three defects | S | no |
| | 2 — The list reads like a log | M | no |
| | 3 — Record from here | M | no |
| | 4 — Finding things | S | no |

## Phase 1 — Three defects

Correctness first, because phases 2 and 4 both build on the same query and the same
colour map.

**The Log tab truncates at 1000 rows.** `getFeedingLogs` (`lib/queries.ts:130`) does
not paginate. PostgREST caps a response at `db.max_rows` — 1000 on hosted Supabase —
and returns the truncated set with no error, the same trap Phase 1 of the hardening
plan fixed for export. `getAllFeedingLogs` (`lib/queries.ts:593`) already pages
correctly via `fetchAllRows`; the page query simply never got the same treatment. At
466 logs today this is latent, not live, but it fails silently when it arrives and
the calendar's month summary would under-count with it.

Fix: page the query the same way. The Log tab wants every row because the animal
filter and (in Phase 4) the date filters run client-side over the full set.

Paging surfaced a second problem the plan had not anticipated: `fed_at` alone is not
a stable sort. A batch feed writes one `fed_at` across several animals, so ties are
the normal case here, and offset paging over a sort with ties can repeat a row on one
page and drop it from the next. The paged query orders by `id` as a tiebreaker.

**A calendar branch that cannot run.** `pages/FeedingLog.tsx:230` reads
`dayLogs.length === 0 && hasFed`, but `hasFed` is `dayLogs.some((l) => !l.refused)` —
an empty array makes it false, so the condition is never true. Dead code; delete it.

**Animal colours shift between sessions.** `ANIMAL_COLORS[i % ANIMAL_COLORS.length]`
(`pages/FeedingLog.tsx:39`) keys off the animal's index in the `animals` array, so
adding, archiving or reordering an animal repaints the whole calendar and every dot
changes meaning. Two consequences:

- The legend lists `animals.slice(0, 5)` while the grid draws from all ten colours,
  so a dot can appear with nothing in the legend explaining it.
- A colour learned this week means a different animal next week.

Fix: derive the colour from a hash of the animal's id so it is stable for the life of
the row, and cap the legend honestly — show the animals actually present in the
displayed month, with an overflow count rather than a silent cut at five.

Tests: the colour hash is pure, so it gets unit tests in `lib/animalColors.test.ts`
pinning what actually matters — the same id always yields the same colour, the result
is order-independent, and a collection spreads across the palette rather than
clustering. Not "no collisions": ten colours over a larger collection collide by
construction, and a test asserting otherwise would be asserting a falsehood.

## Phase 2 — The list reads like a log

No new data, no new queries — this is the page's typography and grouping.

**Group by day, with a header per day.** The current list repeats the date on every
row: the screenshot shows `Sep 14` twice and `Sep 5` three times, right-aligned in
muted text on otherwise identical cards. A day header removes the repetition and
gives the list a rhythm that maps to how feeding actually happens — in sessions, not
in individual events.

**Lead with elapsed time.** "6 days ago" is the unit that matters when you are
deciding whether an animal is due; the calendar date is secondary. Day headers carry
both: `Today`, `Yesterday`, then `Sunday 14 September` with a relative suffix.

**Make refusals loud.** A refused feeding is currently a 2px red dot on a card
identical to every other. It is the one event on this page worth noticing without
reading — a tinted background and a left border carry it at a glance. This also makes
the green dot on fed rows redundant, which removes a mark that currently carries no
information in a list where nearly everything is a successful feed.

**Give the row a hierarchy.** Animal name, prey, quantity and date currently sit at
near-equal weight so nothing anchors the scan. Animal name primary, prey and quantity
secondary, time tertiary.

The grouping is a pure transform over the log array, so it lands in
`lib/groupByDay.ts` with tests covering the boundaries that actually bite: local
midnight, a day with only refusals, and an empty set.

## Phase 3 — Record from here

The page is named Feeding Log and you cannot log or correct a feeding on it beyond
the one Add button.

**Edit and delete in place.** `updateFeedingLog` and `deleteFeedingLog`
(`lib/queries.ts:158,163`) already exist and are wired into `AnimalDetail.tsx` only.
Correcting a typo today means navigating Animals → the animal → scrolling to its
feeding history. Same handlers, same recalculation of `last_fed_at` on delete — this
is wiring, not new behaviour.

**Batch feed from here.** `BatchFeedForm` is reachable from Dashboard
(`Dashboard.tsx:812`) and Animals (`Animals.tsx:523`) but not from the feeding page.
Feeding a rack in one sitting is the bulk workflow and it is missing from the screen
built for feeding.

**Surface who is due at the point of logging, not as a list.** The Dashboard already
owns "what needs doing": a combined queue of feedings and medication doses sorted by
due date (`Dashboard.tsx:183-210`), and Animals has status filters over the same
data. A third copy of that list here would be duplication. What is missing is the
*action*: the log form opens with a bare animal dropdown that gives no hint which
animals are due, so you pick from memory. Sort the dropdown by feeding urgency
(`FEEDING_URGENCY` already exists) and annotate each option with
`describeNextFeeding`, so the information arrives where the decision is made rather
than as another panel to scroll past.

## Phase 4 — Finding things

**Filters that match how you would search.** Today there is one animal dropdown.
Refusals are the clinically interesting events and there is no way to see only those;
prey type and date range are the other two axes worth having. All three run
client-side over the set Phase 1 makes complete.

**Move the month summary above the calendar grid.** It is the most informative
element on the tab and it currently sits below the fold, under the legend and the
selected-day detail.

## Decisions taken

- **The due-queue stays on the Dashboard.** Proposed initially as a strip on this
  page, dropped once the Dashboard's existing queue was read. Phase 3 takes the
  useful half — urgency ordering inside the log form — without the duplication.
- **Client-side filtering, not server-side.** The household's entire feeding history
  is a few hundred rows and Phase 1 makes the fetch complete. Server-side filtering
  would mean a round trip per filter change for no benefit at this size.
- **Pure logic in `lib/`, tested.** Grouping, colour hashing and filtering are all
  transforms over arrays; they go in their own modules so they can be tested without
  the Supabase client, following the pattern `lib/pagination.ts` established.

## Out of scope

- Charts or trend analysis on this page — Stats owns that.
- Changing the feeding schedule model, `last_fed_at` recalculation, or anything in
  `lib/feedingStatus.ts`. Phases here consume that logic; none of them alter it.
- The Calendar tab's interaction model. Phase 1 fixes its two defects and Phase 4
  moves one panel; redesigning it is separate work.
