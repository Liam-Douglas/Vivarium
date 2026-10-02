import { format } from 'date-fns'
import {
  incubationState, daysIncubating, incubationDuration, daysUntilHatch, hatchRate,
} from '@/lib/incubationStatus'
import type { IncubationState } from '@/lib/incubationStatus'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
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
        <p className="text-sm font-semibold" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>
          🌡️ Incubation
        </p>
        <Button size="sm" onClick={onAdd}>Add</Button>
      </div>

      {incubations.length === 0 ? (
        <p className="text-sm py-1" style={{ color: '#9f9684' }}>No incubations yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {incubations.map((row) => {
            const state = incubationState(row, now)
            const badge = STATE_BADGE[state]
            const elapsed = daysIncubating(row, now)
            const duration = incubationDuration(row)
            const until = daysUntilHatch(row, now)
            const rate = hatchRate(row)

            return (
              <div key={row.id} className="rounded-xl p-3" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge status={badge.status}>{badge.label}</Badge>
                      {row.clutch_size != null && (
                        <span className="text-xs" style={{ color: '#a8a090' }}>{row.clutch_size} eggs</span>
                      )}
                      {row.eggs_fertile != null && (
                        <span className="text-xs" style={{ color: '#8fbe5a' }}>{row.eggs_fertile} fertile</span>
                      )}
                      {row.hatchlings != null && (
                        <span className="text-xs" style={{ color: '#8fbe5a' }}>{row.hatchlings} hatched</span>
                      )}
                    </div>

                    <p className="text-xs mt-1.5" style={{ color: '#a8a090' }}>
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
                      <p className="text-xs mt-1" style={{ color: '#8fbe5a' }}>
                        {Math.round(rate.rate * 100)}% hatch rate
                        <span style={{ color: '#9f9684' }}>
                          {rate.basis === 'fertile' ? ' of fertile eggs' : ' of the clutch'}
                        </span>
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 mt-1">
                      {row.temperature_c != null && (
                        <span className="text-xs" style={{ color: '#9f9684' }}>{row.temperature_c}°C</span>
                      )}
                      {row.humidity_percent != null && (
                        <span className="text-xs" style={{ color: '#9f9684' }}>{row.humidity_percent}% RH</span>
                      )}
                      {row.incubation_medium && (
                        <span className="text-xs" style={{ color: '#9f9684' }}>{row.incubation_medium}</span>
                      )}
                    </div>

                    {/* Shown, never interpreted: the column is free text and
                        nothing constrains it, so lib/incubationStatus derives
                        the state from the dates and leaves this to the keeper
                        who wrote it. */}
                    {row.outcome && (
                      <p className="text-xs mt-1" style={{ color: '#9f9684' }}>{row.outcome}</p>
                    )}
                    {row.notes && (
                      <p className="text-xs mt-1 truncate" style={{ color: '#9f9684' }}>{row.notes}</p>
                    )}
                  </div>

                  <div className="text-right shrink-0 mr-1">
                    <p className="text-xs" style={{ color: '#9f9684' }}>
                      {format(new Date(row.start_date), 'MMM d, yyyy')}
                    </p>
                    {row.actual_hatch_date && (
                      <p className="text-xs mt-0.5" style={{ color: '#8fbe5a' }}>
                        {format(new Date(row.actual_hatch_date), 'MMM d')}
                      </p>
                    )}
                  </div>

                  <RecordActions onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
