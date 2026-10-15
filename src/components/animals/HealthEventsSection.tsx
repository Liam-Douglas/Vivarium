import { format } from 'date-fns'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { totalCostCents, costByType } from '@/lib/healthStats'
import { EmptyState } from '@/components/ui/EmptyState'
import { RecordActions } from '@/components/ui/RecordActions'
import type { HealthEvent } from '@/hooks/useHealthEvents'
import { formatAUD } from '@/lib/format'

interface HealthEventsSectionProps {
  events: HealthEvent[]
  onEdit: (event: HealthEvent) => void
  onDelete: (event: HealthEvent) => void
}

/**
 * An animal's health record: the totals, the cost breakdown and the list.
 *
 * Medication schedules stay on the page: they are the one part of this tab
 * that is a schedule rather than a history, and the page owns the modals that
 * edit them.
 */
export function HealthEventsSection({ events, onEdit, onDelete }: HealthEventsSectionProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon="heart"
        title="No health events"
        description="Tap 'Add event' to log an observation or vet visit."
      />
    )
  }

  const total = totalCostCents(events)
  const byType = costByType(events)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl px-3 py-2.5 bg-surface">
          <p className="text-xs" style={{ color: 'var(--color-label-2)' }}>Total events</p>
          <p className="text-base font-semibold mt-0.5" style={{ color: 'var(--color-label)' }}>{events.length}</p>
        </div>
        <div className="rounded-xl px-3 py-2.5 bg-surface">
          <p className="text-xs" style={{ color: 'var(--color-label-2)' }}>Total cost</p>
          <p className="text-base font-semibold mt-0.5" style={{ color: total > 0 ? 'var(--color-orange)' : 'var(--color-label)' }}>
            {total > 0 ? `${formatAUD(total)}` : '—'}
          </p>
        </div>
      </div>

      {byType.length > 0 && (
        <div className="rounded-xl p-4 bg-surface">
          <p className="text-[13px] font-semibold text-label-2 mb-3">COST BY TYPE (AUD)</p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={byType} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="type" tick={{ fontSize: 10, fill: 'var(--color-label-2)' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-surface-2)', border: 'none', borderRadius: 10, color: 'var(--color-label)', boxShadow: '0 8px 24px rgba(0,0,0,0.16)' }}
                labelStyle={{ color: 'var(--color-label-2)', fontSize: 12 }}
                formatter={(v) => [formatAUD(Math.round(Number(v) * 100)), 'Cost']}
              />
              <Bar isAnimationActive={false} dataKey="cost" fill="var(--color-orange)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="rounded-xl bg-surface overflow-hidden">
        {events.map((event) => (
          <div key={event.id} className="list-row px-4 py-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-label)' }}>{event.title}</p>
                <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--color-label-2)' }}>{event.event_type.replace(/_/g, ' ')}</p>
                {event.notes && <p className="text-xs mt-1 truncate" style={{ color: 'var(--color-label-2)' }}>{event.notes}</p>}
              </div>
              <div className="text-right shrink-0 mr-1">
                <p className="text-xs" style={{ color: 'var(--color-label-2)' }}>{format(new Date(event.event_date), 'd MMM yyyy')}</p>
                {event.cost_cents != null && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-orange)' }}>{formatAUD(event.cost_cents)}</p>
                )}
              </div>
              <RecordActions what="health event" onEdit={() => onEdit(event)} onDelete={() => onDelete(event)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
