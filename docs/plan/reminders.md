# Reminders plan

A page for seeing and changing every recurring care cadence in one place —
feeding, cleaning, weighing and anything else a keeper repeats on a schedule.

Today the app has three kinds of recurrence and no page that shows them together:

| | Where it lives | Editable from |
|---|---|---|
| Feeding | `animals.feeding_frequency_days` | the animal's edit form, one animal at a time |
| Medication | `medication_schedules` | that animal's Health tab |
| Cleaning, weighing, anything else | nowhere | — |

So the cadence a keeper most wants to adjust in bulk is buried one animal deep,
and two of the three things they asked for cannot be recorded at all. Enclosures
carry only a name and notes; weight logs exist with no notion of how often a
weighing is due.

| | Phase | Size | Needs Liam |
|---|---|---|---|
| ✓ | 1 — Schema and policies | S | **awaiting Liam — `0004` applied by hand** |
| ✓ | 2 — Due logic and data access | M | shipped |
| ✓ | 3 — The Reminders page | M | shipped |
| ✓ | 4 — Into the queue and the nav | S | shipped, with a change |

## Phase 1 — Schema and policies

Two tables, in `supabase/migrations/0004_care_tasks.sql`.

**`care_tasks`** — one row per recurring job. `animal_id` and `enclosure_id` are
both nullable and independent, so a task can target an animal ("weigh Suki"), an
enclosure ("clean the rack"), or the household ("order frozen rats"). Supporting
all three costs two nullable columns and avoids a second hand-applied migration
when the first guess turns out too narrow.

`last_done_at` mirrors `animals.last_fed_at`: denormalised so a due date is one
read, not an aggregate.

**`care_task_logs`** — one row per completion. The denormalised column is why
`recalculateLastFedAt` had to exist: a column that drifts with nothing to rebuild
it from is a bug waiting to be found. Marking a task done writes both, and the
log is what makes an accidental tap undoable.

Both tables get the standard four policies through the same `DO` block shape as
`0001`, scoped by `app_is_household_member(household_id)` — the helper that
checks `status = 'active'`. Not the `*_household_access` shape found on the live
database, which treats having a membership row as being a member and handed
pending requests full access to seven tables.

This phase is the only one that needs Liam: the SQL is applied by hand in the
Supabase editor, and until it is, phases 3 and 4 have nothing to read.

## Phase 2 — Due logic and data access

`lib/careStatus.ts`, modelled on `lib/feedingStatus.ts` and tested the same way.
A task is `overdue`, `due-soon`, `on-schedule` or `never-done`, from
`last_done_at` and `frequency_days` in calendar days — the same rule
`lib/dates.ts` documents, so "cleaned yesterday" counts as one day whatever the
clock says.

`never-done` stays distinct from `on-schedule` for the reason `feedingStatus`
keeps `never-fed` separate: collapsing them is what let a collection with no data
report "0 overdue" in green.

Queries and a `useCareTasks` hook follow the existing shapes, paginated with an
`id` tiebreaker like everything else after the resilience work.

## Phase 3 — The Reminders page

One page at `/reminders`, three sections:

**Feeding.** Every animal with its cadence, editable inline. This is the reason
the page exists: changing feeding frequency today means opening an animal, opening
its edit form, changing a number, saving, and repeating. The row shows
`describeNextFeeding` so the effect of a change is visible where the change is made.

**Care tasks.** The new table: add, edit, delete, and mark done. Grouped by
urgency, with the animal or enclosure it belongs to named on the row.

**Medication.** Read-only, linking to the animal. Dose schedules have a start, an
end and a course position that a flat list would misrepresent; AnimalDetail already
edits them properly. Listing them here without the ability to edit is deliberate —
the page's job is to show every cadence, and a cadence the keeper forgot about is
exactly what a reminders page is for.

## Phase 4 — Into the queue and the nav

The Dashboard already runs a combined queue of feedings and medication doses sorted
by due date, and the plan said care tasks would join it on the same terms.

Reading that queue changed the answer. Its rows are animal-shaped — a name column,
an enclosure column, a Feed or Log button — and every branch destructures
`item.animal`. A task on the whole collection has no animal to put there, so joining
the queue would mean either a hole in each row or a fourth set of conditionals
through a dense block that cannot be exercised here. Care tasks get their own compact
card instead, in the same column as the low-stock card, listing what is due and
linking to this page to act on it.

Navigation: the More sheet on mobile (`BottomNav`) and the Sidebar on desktop. The
four bottom tabs stay as they are; a fifth would crowd them for a page visited
weekly rather than daily.

## Decisions taken

- **Two tables, not one.** History is what makes "mark done" undoable and
  `last_done_at` rebuildable. The feeding side of the app already learned this.
- **A task targets an animal, an enclosure, or nothing.** Both foreign keys
  nullable rather than a single polymorphic column, so the database can enforce
  each one.
- **Medication is read-only here.** Course schedules have semantics a flat
  cadence list would flatten away.
- **No notification changes.** `useOverdueNotification` covers feeding; extending
  it to care tasks is worth doing but it is a separate change with its own
  permission and timing questions.

## Out of scope

- Per-task notification settings, quiet hours, or reminder times of day.
- Recurrence beyond "every N days" — no weekdays, no "first of the month".
  Every existing cadence in the app is an interval, and matching that is enough
  to be useful.
- Assigning a task to a specific household member.
