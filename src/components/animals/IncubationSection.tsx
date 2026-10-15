import { format } from 'date-fns'
import {
  incubationState, daysIncubating, incubationDuration, daysUntilHatch, hatchRate,
} from '@/lib/incubationStatus'
import type { IncubationState } from '@/lib/incubationStatus'
import { Badge } from '@/components/ui/Badge'
import { RecordActions } from '@/components/ui/RecordActions'
import type { Incubation } from '@/hooks/useIncubations'

interface IncubationSectionProps {
  incubations: Incubation[]
  onAdd: () => void
  onEdit: (row: Incubation) => void
  onDelete: (row: Incubation) => void
}

const STATE_BADGE: Record<IncubationState, { status: 'green' | 'amber' | 'red' | 'blue'; label: string }> = {
  incubating: { status: 'blue', label: 'Incubating' },
  due: { status: 'amber', label: 'Due soon' },
  overdue: { status: 'red', label: 'Overdue' },
  hatched: { status: 'green', label: 'Hatched' },
}

/**
 * A clutch in the incubator, and the ones that have come out of it.
 *
 * The table has existed since before this project's migration history and no
 * screen has ever read it — `incubations` turned up in the negative RLS test as
 * a relation nothing in `src/` touches, and was deliberately kept rather than
 * dropped because it is a designed extension of breeding records with columns
 * nothing else has.
 *
 * Every derived number here comes from lib/incubationStatus rather than being
 * computed inline, because that is where this project's defects have come from:
 * not the arithmetic, but a second copy of it drifting from the first.
 */
export function IncubationSection({ incubations, onAdd, onEdit, onDelete }: IncubationSectionProps) {
  const now = new Date()

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[20px] leading-[25px] font-bold text-label">Incubation</h2>
        <button type="button" onClick={onAdd} className="tap-target text-[17px] text-tint active:opacity-60">Add</button>
      </div>

      {incubations.length === 0 ? (
        <p className="text-[15px] py-1 text-label-2">No incubations yet.</p>
      ) : (
        <div className="rounded-xl bg-surface overflow-hidden">
          {incubations.map((row) => {
            const state = incubationState(row, now)
            const badge = STATE_BADGE[state]
            const elapsed = daysIncubating(row, now)
            const duration = incubationDuration(row)
            const until = daysUntilHatch(row, now)
            const rate = hatchRate(row)

            return (
              <div key={row.id} className="list-row px-4 py-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge status={badge.status}>{badge.label}</Badge>
                      {row.clutch_size != null && (
                        <span className="text-[13px] font-semibold text-label-2">{row.clutch_size} eggs</span>
                      )}
                      {row.eggs_fertile != null && (
                        <span className="text-[13px] text-tint">{row.eggs_fertile} fertile</span>
                      )}
                      {row.hatchlings != null && (
                        <span className="text-[13px] text-tint">{row.hatchlings} hatched</span>
                      )}
                    </div>

                    <p className="text-[13px] mt-1.5 text-label-2">
                      {/* Day N while it runs, total once it is over: the same
                          column reads as progress or as a result, never both. */}
                      {duration != null
                        ? `${duration} days in the incubator`
                        : elapsed != null ? `Day ${elapsed}` : 'Start date unreadable'}
                      {until != null && (
                        until < 0
                          ? ` · ${Math.abs(until)} ${Math.abs(until) === 1 ? 'day' : 'days'} past the expected date`
                          : until === 0 ? ' · expected today' : ` · ${until} ${until === 1 ? 'day' : 'days'} to go`
                      )}
                    </p>

                    {rate && (
                      <p className="text-[13px] mt-1 text-tint">
                        {Math.round(rate.rate * 100)}% hatch rate
                        <span style={{ color: 'var(--color-label-2)' }}>
                          {rate.basis === 'fertile' ? ' of fertile eggs' : ' of the clutch'}
                        </span>
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 mt-1">
                      {row.temperature_c != null && (
                        <span className="text-[13px] font-semibold text-label-2">{row.temperature_c}°C</span>
                      )}
                      {row.humidity_percent != null && (
                        <span className="text-[13px] font-semibold text-label-2">{row.humidity_percent}% RH</span>
                      )}
                      {row.incubation_medium && (
                        <span className="text-[13px] font-semibold text-label-2">{row.incubation_medium}</span>
                      )}
                    </div>

                    {/* Shown, never interpreted: the column is free text and
                        nothing constrains it, so lib/incubationStatus derives
                        the state from the dates and leaves this to the keeper
                        who wrote it. */}
                    {row.outcome && (
                      <p className="text-[13px] mt-1 text-label-2">{row.outcome}</p>
                    )}
                    {row.notes && (
                      <p className="text-[13px] mt-1 truncate text-label-2">{row.notes}</p>
                    )}
                  </div>

                  <div className="text-right shrink-0 mr-1">
                    <p className="text-[13px] font-semibold text-label-2">
                      {format(new Date(row.start_date), 'd MMM yyyy')}
                    </p>
                    {row.actual_hatch_date && (
                      <p className="text-[13px] mt-0.5 text-tint">
                        {format(new Date(row.actual_hatch_date), 'd MMM')}
                      </p>
                    )}
                  </div>

                  <RecordActions what="clutch" onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
