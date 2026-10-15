import { format } from 'date-fns'
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
} from 'recharts'
import { CHART_TOOLTIP, CHART_TOOLTIP_LABEL } from '@/lib/chartStyle'
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
        icon="shed"
        title="No sheds logged"
        description="Tap 'Log shed' to record a shedding event."
      />
    )
  }

  const summary = summariseSheds(logs)
  const intervals = shedIntervals(logs)
  const chart = intervals.map((interval) => ({
    date: format(interval.at, 'd MMM yy'),
    days: interval.days,
    complete: interval.complete,
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total sheds', value: summary.total },
          { label: 'Complete', value: summary.complete, color: 'var(--color-tint)' },
          {
            label: 'Avg interval',
            value: summary.averageIntervalDays != null ? `${summary.averageIntervalDays}d` : '—',
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl px-3 py-2.5 bg-surface">
            <p className="text-[13px] font-semibold text-label-2">{stat.label}</p>
            <p className="text-[22px] leading-7 font-bold tabular-nums mt-0.5" style={{ color: stat.color ?? 'var(--color-label)' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {chart.length > 1 && (
        <div className="rounded-xl p-4 bg-surface">
          <p className="text-[13px] font-medium mb-1 text-label-2">SHED INTERVALS (days)</p>
          <p className="text-[13px] mb-3 text-label-2">
            Days between consecutive sheds — green = complete, amber = incomplete
          </p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={chart} barCategoryGap="25%">
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-label-2)' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={CHART_TOOLTIP}
                labelStyle={CHART_TOOLTIP_LABEL}
                formatter={(v) => [`${v} days`, 'Interval']}
              />
              <Bar isAnimationActive={false} dataKey="days" radius={[4, 4, 0, 0]}>
                {chart.map((entry, i) => (
                  <Cell key={i} fill={entry.complete ? 'var(--color-green)' : 'var(--color-orange)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="rounded-xl bg-surface overflow-hidden">
        {logs.map((log) => (
          <div key={log.id} className="list-row px-4 py-3 flex items-center gap-3">
            <Badge status={log.complete ? 'green' : 'amber'}>
              {log.complete ? 'Complete' : 'Incomplete'}
            </Badge>
            <div className="flex-1">
              {log.notes && <p className="text-[13px] font-semibold text-label-2">{log.notes}</p>}
            </div>
            <p className="text-[13px] shrink-0 mr-1 text-label-2">
              {format(new Date(log.shed_at), 'd MMM yyyy')}
            </p>
            <RecordActions what="shed" onEdit={() => onEdit(log)} onDelete={() => onDelete(log)} />
          </div>
        ))}
      </div>
    </div>
  )
}
