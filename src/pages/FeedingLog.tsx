import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns'
import { useFeedingLogs } from '@/hooks/useFeedingLogs'
import { useAnimals } from '@/hooks/useAnimals'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FeedingLogForm } from '@/components/feeding/FeedingLogForm'
import { FeedingEditForm } from '@/components/feeding/FeedingEditForm'
import { BatchFeedForm } from '@/components/feeding/BatchFeedForm'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { deleteFeedingLog, recalculateAnimalLastFedAt } from '@/lib/queries'
import type { FeedingLog as FeedingLogRow } from '@/hooks/useFeedingLogs'
import { EmptyState } from '@/components/ui/EmptyState'
import { animalColor } from '@/lib/animalColors'
import { groupByDay } from '@/lib/groupByDay'
import { getFeedingStatus } from '@/lib/feedingStatus'

/** Legend entries shown before collapsing the rest into a count. */
const LEGEND_LIMIT = 6

export function FeedingLog() {
  const { data: animals } = useAnimals()
  const { data: allLogs, loading, refresh } = useFeedingLogs()

  const { showToast } = useToast()

  const [tab, setTab] = useState<'log' | 'calendar'>('log')
  const [addOpen, setAddOpen] = useState(false)
  const [batchOpen, setBatchOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<FeedingLogRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<FeedingLogRow | null>(null)

  // Log tab state
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | undefined>(undefined)

  // Calendar tab state
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Filtered logs for Log tab
  const logs = useMemo(
    () => selectedAnimalId ? allLogs.filter((l) => l.animal_id === selectedAnimalId) : allLogs,
    [allLogs, selectedAnimalId]
  )

  const monthStart = startOfMonth(new Date(year, month))
  const monthEnd = endOfMonth(monthStart)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = getDay(monthStart)

  const logsInMonth = useMemo(
    () => allLogs.filter((l) => {
      const d = new Date(l.fed_at)
      return d.getFullYear() === year && d.getMonth() === month
    }),
    [allLogs, year, month]
  )

  const logsByDay = useMemo(() => {
    const map = new Map<string, typeof allLogs>()
    logsInMonth.forEach((log) => {
      const key = format(new Date(log.fed_at), 'yyyy-MM-dd')
      const list = map.get(key) ?? []
      list.push(log)
      map.set(key, list)
    })
    return map
  }, [logsInMonth])

  const logsByDate = useMemo(() => groupByDay(logs), [logs])

  // Batch feeding from here means "the ones that need it". The other two entry
  // points take a curated set — a selection on Animals, an enclosure on the
  // Dashboard — and on a page about feeding, due and overdue is that set.
  const dueAnimals = useMemo(
    () => animals.filter((a) => {
      const status = getFeedingStatus(a)
      return status === 'overdue' || status === 'due-soon'
    }),
    [animals]
  )

  // The legend names the animals actually on the grid this month, not the first
  // five of the collection: a coloured dot with no legend entry explains nothing.
  // Refused feedings draw red rather than the animal's colour, so they are not
  // what puts an animal in the legend.
  const animalsInMonth = useMemo(() => {
    const ids = new Set(logsInMonth.filter((l) => !l.refused).map((l) => l.animal_id))
    return animals.filter((a) => ids.has(a.id))
  }, [logsInMonth, animals])

  const selectedDayLogs = selectedDay
    ? (logsByDay.get(format(selectedDay, 'yyyy-MM-dd')) ?? [])
    : []

  async function handleDelete(log: FeedingLogRow) {
    setConfirmDelete(null)
    try {
      await deleteFeedingLog(log.id)
      // Deleting the most recent feeding moves last_fed_at, and every feeding
      // status in the app derives from it.
      await recalculateAnimalLastFedAt(log.animal_id)
      setEditingLog(null)
      refresh()
      showToast('Feeding deleted', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to delete', 'error')
    }
  }

  function changeMonth(delta: number) {
    let m = month + delta
    let y = year
    if (m > 11) { m = 0; y++ }
    if (m < 0) { m = 11; y-- }
    setMonth(m)
    setYear(y)
    setSelectedDay(null)
  }

  return (
    <div className="flex-1 px-4 py-6 pb-24 md:pb-8 max-w-3xl mx-auto w-full">
      <Header
        title="Feeding Log"
        action={tab === 'log' ? (
          <div className="flex gap-2">
            {dueAnimals.length > 0 && (
              <Button size="sm" variant="secondary" onClick={() => setBatchOpen(true)}>
                Feed {dueAnimals.length} due
              </Button>
            )}
            <Button size="sm" onClick={() => setAddOpen(true)}>Log feeding</Button>
          </div>
        ) : null}
      />

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
        {(['log', 'calendar'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: tab === t ? 'rgba(143,190,90,0.15)' : 'transparent',
              color: tab === t ? '#8fbe5a' : '#9f9684',
              border: tab === t ? '1px solid rgba(143,190,90,0.25)' : '1px solid transparent',
            }}
          >
            {t === 'log' ? 'Log' : 'Calendar'}
          </button>
        ))}
      </div>

      {/* ── LOG TAB ── */}
      {tab === 'log' && (
        <>
          {/* Animal filter */}
          {animals.length > 0 && (
            <div className="mb-4">
              <select
                value={selectedAnimalId ?? ''}
                onChange={(e) => setSelectedAnimalId(e.target.value || undefined)}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.08)', color: selectedAnimalId ? '#f0ece0' : '#9f9684' }}
              >
                <option value="">All animals</option>
                {animals.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#8fbe5a', borderTopColor: 'transparent' }} />
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon="🍽️"
              title={selectedAnimalId ? 'No feedings logged for this animal' : 'No feedings logged yet'}
              description="Tap to log one"
              action={<Button onClick={() => setAddOpen(true)}>Log first feeding</Button>}
            />
          ) : (
            <div className="flex flex-col gap-5">
              {logsByDate.map((group) => (
                <section key={group.key}>
                  <div className="flex items-baseline justify-between mb-2 px-1">
                    <h2 className="text-sm font-medium" style={{ color: '#f0ece0' }}>{group.label}</h2>
                    {group.relative && (
                      <span className="text-xs" style={{ color: '#9f9684' }}>{group.relative}</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {group.entries.map((log) => {
                      const a = log.animals as { name: string } | null
                      const name = selectedAnimalId ? null : (a?.name ?? 'Unknown')
                      const prey = `${log.prey_type}${log.prey_size ? ` (${log.prey_size})` : ''}`
                      // What was offered still matters on a refusal, so the prey
                      // stays on the row rather than being replaced by "Refused".
                      const detail = log.refused ? prey : `${prey} ×${log.quantity}`
                      const fedAt = new Date(log.fed_at)
                      // Imported rows often carry a date with no time; "12:00 AM"
                      // on every one of them reads as a bug rather than a fact.
                      const hasTime = fedAt.getHours() !== 0 || fedAt.getMinutes() !== 0

                      return (
                        <button
                          key={log.id}
                          type="button"
                          onClick={() => setEditingLog(log)}
                          aria-label={`Edit feeding: ${name ?? detail}`}
                          className="rounded-xl p-3.5 flex items-center gap-3 w-full text-left transition-colors hover:brightness-110"
                          style={{
                            backgroundColor: log.refused ? 'rgba(196,90,90,0.08)' : '#242420',
                            border: log.refused
                              ? '1px solid rgba(196,90,90,0.3)'
                              : '1px solid rgba(255,255,255,0.06)',
                            // The left edge carries the animal's calendar colour,
                            // so the two tabs read as the same data.
                            borderLeft: `3px solid ${log.refused ? '#c45a5a' : animalColor(log.animal_id)}`,
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-sm font-medium" style={{ color: '#f0ece0' }}>
                                {name ?? detail}
                              </span>
                              {log.refused && (
                                <span
                                  className="text-xs font-medium px-1.5 py-0.5 rounded"
                                  style={{ color: '#e08a8a', backgroundColor: 'rgba(196,90,90,0.16)' }}
                                >
                                  Refused
                                </span>
                              )}
                            </div>
                            {name && (
                              <p className="text-xs mt-0.5" style={{ color: '#a8a090' }}>{detail}</p>
                            )}
                            {log.notes && (
                              <p className="text-xs mt-0.5 truncate" style={{ color: '#9f9684' }}>{log.notes}</p>
                            )}
                          </div>
                          {hasTime && (
                            <p className="text-xs shrink-0" style={{ color: '#9f9684' }}>
                              {format(fedAt, 'h:mm a')}
                            </p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── CALENDAR TAB ── */}
      {tab === 'calendar' && (
        <>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => changeMonth(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5" style={{ color: '#a8a090' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-medium" style={{ color: '#f0ece0' }}>{format(monthStart, 'MMMM yyyy')}</span>
            <button onClick={() => changeMonth(1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5" style={{ color: '#a8a090' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="text-center text-xs py-1" style={{ color: '#9f9684' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}

            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const dayLogs = logsByDay.get(key) ?? []
              const isToday = isSameDay(day, now)
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className="rounded-lg p-1 flex flex-col items-center gap-0.5 min-h-[52px] transition-colors"
                  style={{
                    backgroundColor: isSelected ? 'rgba(143,190,90,0.15)' : isToday ? 'rgba(255,255,255,0.04)' : 'transparent',
                    border: isSelected ? '1px solid rgba(143,190,90,0.3)' : isToday ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                  }}
                >
                  <span className="text-xs" style={{ color: isSelected ? '#8fbe5a' : isToday ? '#f0ece0' : '#a8a090' }}>
                    {format(day, 'd')}
                  </span>
                  {dayLogs.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 justify-center px-0.5">
                      {dayLogs.slice(0, 6).map((log) => (
                        <div
                          key={log.id}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: log.refused ? '#c45a5a' : (animalColor(log.animal_id)) }}
                        />
                      ))}
                      {dayLogs.length > 6 && (
                        <span className="text-xs" style={{ color: '#9f9684', fontSize: 8 }}>+{dayLogs.length - 6}</span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8fbe5a' }} />
              <span className="text-xs" style={{ color: '#9f9684' }}>Fed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#c45a5a' }} />
              <span className="text-xs" style={{ color: '#9f9684' }}>Refused</span>
            </div>
            {animalsInMonth.slice(0, LEGEND_LIMIT).map((a) => (
              <div key={a.id} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: animalColor(a.id) }} />
                <span className="text-xs" style={{ color: '#9f9684' }}>{a.name}</span>
              </div>
            ))}
            {animalsInMonth.length > LEGEND_LIMIT && (
              <span className="text-xs" style={{ color: '#9f9684' }}>
                +{animalsInMonth.length - LEGEND_LIMIT} more
              </span>
            )}
          </div>

          {/* Selected day detail */}
          {selectedDay && (
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-sm font-medium mb-3" style={{ color: '#f0ece0' }}>{format(selectedDay, 'EEEE, MMMM d')}</p>
              {selectedDayLogs.length === 0 ? (
                <p className="text-sm" style={{ color: '#9f9684' }}>No feedings on this day</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {selectedDayLogs.map((log) => {
                    const animal = animals.find((a) => a.id === log.animal_id)
                    return (
                      <div key={log.id} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: log.refused ? '#c45a5a' : (animalColor(log.animal_id)) }} />
                        <div className="flex-1">
                          <span className="text-sm font-medium" style={{ color: '#f0ece0' }}>{animal?.name ?? 'Unknown'}</span>
                          <span className="text-xs ml-2" style={{ color: '#9f9684' }}>
                            {log.refused ? 'Refused' : `${log.prey_type}${log.prey_size ? ` (${log.prey_size})` : ''} ×${log.quantity}`}
                          </span>
                        </div>
                        <span className="text-xs" style={{ color: '#9f9684' }}>{format(new Date(log.fed_at), 'h:mm a')}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Monthly summary */}
          <div className="rounded-xl p-4" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#a8a090' }}>MONTH SUMMARY</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold" style={{ color: '#8fbe5a', fontFamily: 'Playfair Display, serif' }}>
                  {logsInMonth.filter((l) => !l.refused).length}
                </p>
                <p className="text-xs" style={{ color: '#9f9684' }}>Feedings</p>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: '#c45a5a', fontFamily: 'Playfair Display, serif' }}>
                  {logsInMonth.filter((l) => l.refused).length}
                </p>
                <p className="text-xs" style={{ color: '#9f9684' }}>Refused</p>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: '#f0ece0', fontFamily: 'Playfair Display, serif' }}>
                  {new Set(logsInMonth.filter((l) => !l.refused).map((l) => format(new Date(l.fed_at), 'yyyy-MM-dd'))).size}
                </p>
                <p className="text-xs" style={{ color: '#9f9684' }}>Active days</p>
              </div>
            </div>
          </div>
        </>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Log feeding">
        <FeedingLogForm
          onSuccess={() => { setAddOpen(false); refresh() }}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      <Modal
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        title={`Feed ${dueAnimals.length} due animal${dueAnimals.length !== 1 ? 's' : ''}`}
      >
        <BatchFeedForm
          animals={dueAnimals}
          onSuccess={() => { setBatchOpen(false); refresh() }}
          onCancel={() => setBatchOpen(false)}
        />
      </Modal>

      <Modal open={!!editingLog} onClose={() => setEditingLog(null)} title="Edit feeding">
        {editingLog && (
          <div className="flex flex-col gap-4">
            <FeedingEditForm
              log={editingLog}
              onSaved={() => { setEditingLog(null); refresh() }}
              onCancel={() => setEditingLog(null)}
            />
            <button
              type="button"
              onClick={() => setConfirmDelete(editingLog)}
              className="text-sm py-2 rounded-xl transition-colors hover:bg-white/5"
              style={{ color: '#c45a5a' }}
            >
              Delete this feeding
            </button>
          </div>
        )}
      </Modal>

      {confirmDelete && (
        <ConfirmDialog
          open
          title="Delete feeding record"
          message="This feeding record will be permanently deleted."
          onConfirm={() => handleDelete(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
