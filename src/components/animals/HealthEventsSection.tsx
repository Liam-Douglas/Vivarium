import { format } from 'date-fns'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { totalCostCents, costByType } from '@/lib/healthStats'
import { EmptyState } from '@/components/ui/EmptyState'
import { RecordActions } from '@/components/ui/RecordActions'
import type { HealthEvent } from '@/hooks/useHealthEvents'

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
        icon="🏥"
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
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs" style={{ color: '#9f9684' }}>Total events</p>
          <p className="text-base font-semibold mt-0.5" style={{ color: '#f0ece0' }}>{events.length}</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs" style={{ color: '#9f9684' }}>Total cost</p>
          <p className="text-base font-semibold mt-0.5" style={{ color: total > 0 ? '#d4924a' : '#f0ece0' }}>
            {total > 0 ? `$${(total / 100).toFixed(2)}` : '—'}
          </p>
        </div>
      </div>

      {byType.length > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-medium mb-3" style={{ color: '#a8a090' }}>COST BY TYPE (AUD)</p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={byType} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="type" tick={{ fontSize: 10, fill: '#a8a090' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip
                contentStyle={{ backgroundColor: '#2e2e2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f0ece0' }}
                labelStyle={{ color: '#a8a090', fontSize: 12 }}
                formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Cost']}
              />
              <Bar dataKey="cost" fill="#d4924a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {events.map((event) => (
          <div key={event.id} className="rounded-xl p-3" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: '#f0ece0' }}>{event.title}</p>
                <p className="text-xs mt-0.5 capitalize" style={{ color: '#a8a090' }}>{event.event_type.replace(/_/g, ' ')}</p>
                {event.notes && <p className="text-xs mt-1 truncate" style={{ color: '#9f9684' }}>{event.notes}</p>}
              </div>
              <div className="text-right shrink-0 mr-1">
                <p className="text-xs" style={{ color: '#9f9684' }}>{format(new Date(event.event_date), 'MMM d, yyyy')}</p>
                {event.cost_cents != null && (
                  <p className="text-xs mt-0.5" style={{ color: '#d4924a' }}>${(event.cost_cents / 100).toFixed(2)}</p>
                )}
              </div>
              <RecordActions onEdit={() => onEdit(event)} onDelete={() => onDelete(event)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
