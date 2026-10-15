import { useState } from 'react'
import { format } from 'date-fns'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine,
} from 'recharts'
import { CHART_TOOLTIP, CHART_TOOLTIP_LABEL } from '@/lib/chartStyle'
import { growthSummary, weightSeries } from '@/lib/weightStats'
import { readPositiveNumber, writeJson, remove as removeStored } from '@/lib/localStore'
import { EmptyState } from '@/components/ui/EmptyState'
import { RecordActions } from '@/components/ui/RecordActions'
import type { WeightLog } from '@/hooks/useWeightLogs'
import { formatWeight } from '@/lib/format'

/** Per-animal, per-browser: a goal the keeper sets, not a field on the record. */
const targetWeightKey = (animalId: string) => `vivarium-target-weight-${animalId}`

interface WeightSectionProps {
  animalId: string
  logs: WeightLog[]
  onEdit: (log: WeightLog) => void
  onDelete: (log: WeightLog) => void
}

/**
 * An animal's weight history: the growth chart, the target line, the figures
 * underneath and the list of weigh-ins.
 *
 * Lifted out of AnimalDetail, which held twelve domains in one file. The
 * arithmetic lives in lib/weightStats and is tested there; what is here is the
 * drawing of it, plus the target weight, which is local to this section and to
 * this browser and has no business in the page's state.
 */
export function WeightSection({ animalId, logs, onEdit, onDelete }: WeightSectionProps) {
  const [targetInput, setTargetInput] = useState('')
  const [target, setTarget] = useState<number | null>(
    () => readPositiveNumber(targetWeightKey(animalId))
  )

  function saveTarget() {
    const value = Number(targetInput)
    if (!Number.isFinite(value) || value <= 0) return
    writeJson(targetWeightKey(animalId), value)
    setTarget(value)
    setTargetInput('')
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        icon="weight"
        title="No weights logged"
        description="Tap 'Log weight' to start tracking growth."
      />
    )
  }

  const series = weightSeries(logs).map((point) => ({
    date: format(point.at, 'd MMM'),
    weight: point.weight,
  }))
  const summary = growthSummary(logs)

  return (
    <div className="flex flex-col gap-4">
      {series.length > 1 && (
        <div className="rounded-xl p-4 bg-surface">
          <p className="text-[13px] font-semibold text-label-2 mb-3">GROWTH CHART</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-tint)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--color-tint)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-label-2)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={CHART_TOOLTIP}
                labelStyle={CHART_TOOLTIP_LABEL}
                formatter={(v) => [formatWeight(Number(v)), 'Weight']}
              />
              <Area isAnimationActive={false} type="monotone" dataKey="weight" stroke="var(--color-tint)" strokeWidth={2} fill="url(#weightGrad)" dot={false} />
              {target && (
                <ReferenceLine y={target} stroke="var(--color-orange)" strokeDasharray="4 3" label={{ value: `Target ${formatWeight(target)}`, position: 'insideTopRight', fontSize: 11, fill: 'var(--color-orange)' }} />
              )}
            </AreaChart>
          </ResponsiveContainer>

          <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--color-separator)' }}>
            <input
              type="number" inputMode="decimal" min={1} value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder={target ? `Target: ${target}g` : 'Set target weight (g)'}
              className="flex-1 min-w-0 h-9 rounded-[10px] px-3 text-[17px] bg-fill text-label placeholder:text-label-2 outline-none focus-visible:ring-2 focus-visible:ring-tint"
            />
            <button onClick={saveTarget} className="tap-target px-2 text-[17px] text-tint active:opacity-60">Set</button>
            {target && (
              <button
                onClick={() => { removeStored(targetWeightKey(animalId)); setTarget(null) }}
                className="tap-target px-2 text-[17px] text-label-2 active:opacity-60"
              >
                Clear
              </button>
            )}
          </div>

          {/* Across the whole history, not the charted window — the chart and
              these figures would otherwise be two claims under one heading. */}
          {summary && (
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--color-separator)' }}>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-label-2">Start</p>
                <p className="text-[15px] font-semibold text-label">{formatWeight(summary.start)}</p>
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-label-2">Total gain</p>
                <p className="text-[15px] font-semibold" style={{ color: summary.gain >= 0 ? 'var(--color-tint)' : 'var(--color-red)' }}>
                  {formatWeight(summary.gain, { signed: true })}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-label-2">Latest</p>
                <p className="text-[15px] font-semibold text-label">{formatWeight(summary.latest)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl bg-surface overflow-hidden">
        {logs.map((log) => (
          <div key={log.id} className="list-row px-4 py-3 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[15px] font-semibold text-label">{formatWeight(log.weight_grams)}</p>
              {log.notes && <p className="text-[13px] font-semibold text-label-2">{log.notes}</p>}
            </div>
            <p className="text-[13px] shrink-0 mr-1 text-label-2">
              {format(new Date(log.logged_at), 'd MMM yyyy')}
            </p>
            <RecordActions what="weight" onEdit={() => onEdit(log)} onDelete={() => onDelete(log)} />
          </div>
        ))}
      </div>
    </div>
  )
}
