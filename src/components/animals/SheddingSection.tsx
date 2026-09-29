import { format } from 'date-fns'
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
} from 'recharts'
import { shedIntervals, summariseSheds } from '@/lib/shedStatus'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { RecordActions } from '@/components/ui/RecordActions'
import type { SheddingLog } from '@/hooks/useSheddingLogs'

interface SheddingSectionProps {
  logs: SheddingLog[]
  onEdit: (log: SheddingLog) => void
  onDelete: (log: SheddingLog) => void
}

/**
 * An animal's shedding history: the summary figures, the interval chart and
 * the list.
 *
 * The arithmetic moved to lib/shedStatus, which already owned the prediction
 * drawn on the overview card. It had to: this page computed its own intervals
 * and its own average, by rules that did not match the ones behind that
 * prediction, so the chart could show a gap the prediction had discarded as
 * missing records. One module now answers both.
 */
export function SheddingSection({ logs, onEdit, onDelete }: SheddingSectionProps) {
  if (logs.length === 0) {
    return (
      <EmptyState
        icon="🐍"
        title="No sheds logged"
        description="Tap 'Log shed' to record a shedding event."
      />
    )
  }

  const summary = summariseSheds(logs)
  const intervals = shedIntervals(logs)
  const chart = intervals.map((interval) => ({
    date: format(interval.at, 'MMM d yy'),
    days: interval.days,
    complete: interval.complete,
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total sheds', value: summary.total },
          { label: 'Complete', value: summary.complete, color: '#8fbe5a' },
          {
            label: 'Avg interval',
            value: summary.averageIntervalDays != null ? `${summary.averageIntervalDays}d` : '—',
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs" style={{ color: '#9f9684' }}>{stat.label}</p>
            <p className="text-base font-semibold mt-0.5" style={{ color: stat.color ?? '#f0ece0' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {chart.length > 1 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#a8a090' }}>SHED INTERVALS (days)</p>
          <p className="text-xs mb-3" style={{ color: '#9f9684' }}>
            Days between consecutive sheds — green = complete, amber = incomplete
          </p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={chart} barCategoryGap="25%">
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9f9684' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ backgroundColor: '#2e2e2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f0ece0' }}
                labelStyle={{ color: '#a8a090', fontSize: 12 }}
                formatter={(v) => [`${v} days`, 'Interval']}
              />
              <Bar dataKey="days" radius={[4, 4, 0, 0]}>
                {chart.map((entry, i) => (
                  <Cell key={i} fill={entry.complete ? '#5a9e6a' : '#d4924a'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {logs.map((log) => (
          <div key={log.id} className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Badge status={log.complete ? 'green' : 'amber'}>
              {log.complete ? 'Complete' : 'Incomplete'}
            </Badge>
            <div className="flex-1">
              {log.notes && <p className="text-xs" style={{ color: '#9f9684' }}>{log.notes}</p>}
            </div>
            <p className="text-xs shrink-0 mr-1" style={{ color: '#9f9684' }}>
              {format(new Date(log.shed_at), 'MMM d, yyyy')}
            </p>
            <RecordActions onEdit={() => onEdit(log)} onDelete={() => onDelete(log)} />
          </div>
        ))}
      </div>
    </div>
  )
}
