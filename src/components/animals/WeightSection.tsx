import { useState } from 'react'
import { format } from 'date-fns'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine,
} from 'recharts'
import { growthSummary, weightSeries } from '@/lib/weightStats'
import { readPositiveNumber, writeJson, remove as removeStored } from '@/lib/localStore'
import { EmptyState } from '@/components/ui/EmptyState'
import { RecordActions } from '@/components/ui/RecordActions'
import type { WeightLog } from '@/hooks/useWeightLogs'

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
        icon="⚖️"
        title="No weights logged"
        description="Tap 'Log weight' to start tracking growth."
      />
    )
  }

  const series = weightSeries(logs).map((point) => ({
    date: format(point.at, 'MMM d'),
    weight: point.weight,
  }))
  const summary = growthSummary(logs)

  return (
    <div className="flex flex-col gap-4">
      {series.length > 1 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-medium mb-3" style={{ color: '#a8a090' }}>GROWTH CHART</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8fbe5a" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8fbe5a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9f9684' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#2e2e2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f0ece0' }}
                labelStyle={{ color: '#a8a090', fontSize: 12 }}
                formatter={(v) => [`${v}g`, 'Weight']}
              />
              <Area type="monotone" dataKey="weight" stroke="#8fbe5a" strokeWidth={2} fill="url(#weightGrad)" dot={false} />
              {target && (
                <ReferenceLine y={target} stroke="#d4924a" strokeDasharray="4 3" label={{ value: `Target ${target}g`, position: 'insideTopRight', fontSize: 10, fill: '#d4924a' }} />
              )}
            </AreaChart>
          </ResponsiveContainer>

          <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              type="number" min={1} value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder={target ? `Target: ${target}g` : 'Set target weight (g)'}
              className="flex-1 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
              style={{ backgroundColor: '#1a1a18', border: '1px solid rgba(255,255,255,0.08)', color: '#f0ece0' }}
            />
            <button onClick={saveTarget} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: 'rgba(212,146,74,0.15)', color: '#d4924a', border: '1px solid rgba(212,146,74,0.2)' }}>Set</button>
            {target && (
              <button
                onClick={() => { removeStored(targetWeightKey(animalId)); setTarget(null) }}
                className="px-3 py-1.5 rounded-lg text-xs" style={{ color: '#9f9684' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Across the whole history, not the charted window — the chart and
              these figures would otherwise be two claims under one heading. */}
          {summary && (
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-center">
                <p className="text-xs" style={{ color: '#9f9684' }}>Start</p>
                <p className="text-sm font-semibold" style={{ color: '#f0ece0' }}>{summary.start}g</p>
              </div>
              <div className="text-center">
                <p className="text-xs" style={{ color: '#9f9684' }}>Total gain</p>
                <p className="text-sm font-semibold" style={{ color: summary.gain >= 0 ? '#8fbe5a' : '#c45a5a' }}>
                  {summary.gain >= 0 ? '+' : ''}{summary.gain}g
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs" style={{ color: '#9f9684' }}>Latest</p>
                <p className="text-sm font-semibold" style={{ color: '#f0ece0' }}>{summary.latest}g</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {logs.map((log) => (
          <div key={log.id} className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: '#f0ece0' }}>{log.weight_grams}g</p>
              {log.notes && <p className="text-xs" style={{ color: '#9f9684' }}>{log.notes}</p>}
            </div>
            <p className="text-xs shrink-0 mr-1" style={{ color: '#9f9684' }}>
              {format(new Date(log.logged_at), 'MMM d, yyyy')}
            </p>
            <RecordActions onEdit={() => onEdit(log)} onDelete={() => onDelete(log)} />
          </div>
        ))}
      </div>
    </div>
  )
}
