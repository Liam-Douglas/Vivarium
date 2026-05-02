import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns'
import { useFeedingLogs } from '@/hooks/useFeedingLogs'
import { useAnimals } from '@/hooks/useAnimals'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FeedingLogForm } from '@/components/feeding/FeedingLogForm'
import { EmptyState } from '@/components/ui/EmptyState'

const ANIMAL_COLORS = [
  '#8fbe5a', '#d4924a', '#5a8ebe', '#c45a5a', '#a87ac4',
  '#5abeaa', '#be5a8f', '#8e8e5a', '#5a8e8e', '#be8f5a',
]

export function FeedingLog() {
  const { data: animals } = useAnimals()
  const { data: allLogs, loading, refresh } = useFeedingLogs()

  const [tab, setTab] = useState<'log' | 'calendar'>('log')
  const [addOpen, setAddOpen] = useState(false)

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

  // Calendar derived data
  const animalColorMap = useMemo(() => {
    const map = new Map<string, string>()
    animals.forEach((a, i) => map.set(a.id, ANIMAL_COLORS[i % ANIMAL_COLORS.length]))
    return map
  }, [animals])

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

  const selectedDayLogs = selectedDay
    ? (logsByDay.get(format(selectedDay, 'yyyy-MM-dd')) ?? [])
    : []

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
        action={tab === 'log' ? <Button size="sm" onClick={() => setAddOpen(true)}>Log feeding</Button> : null}
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
              color: tab === t ? '#8fbe5a' : '#6a6458',
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
                style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.08)', color: selectedAnimalId ? '#f0ece0' : '#6a6458' }}
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
            <div className="flex flex-col gap-2">
              {logs.map((log) => {
                const a = log.animals as { name: string } | null
                return (
                  <div
                    key={log.id}
                    className="rounded-xl p-4 flex items-center gap-3"
                    style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: log.refused ? '#c45a5a' : '#5a9e6a' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: '#f0ece0' }}>
                        {!selectedAnimalId && a?.name ? `${a.name} — ` : ''}
                        {log.refused ? 'Refused' : `${log.prey_type}${log.prey_size ? ` (${log.prey_size})` : ''} ×${log.quantity}`}
                      </p>
                      {log.notes && <p className="text-xs mt-0.5 truncate" style={{ color: '#6a6458' }}>{log.notes}</p>}
                    </div>
                    <p className="text-xs shrink-0" style={{ color: '#6a6458' }}>{format(new Date(log.fed_at), 'MMM d')}</p>
                  </div>
                )
              })}
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
              <div key={d} className="text-center text-xs py-1" style={{ color: '#6a6458' }}>{d}</div>
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
              const hasFed = dayLogs.some((l) => !l.refused)

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
                          style={{ backgroundColor: log.refused ? '#c45a5a' : (animalColorMap.get(log.animal_id) ?? '#8fbe5a') }}
                        />
                      ))}
                      {dayLogs.length > 6 && (
                        <span className="text-xs" style={{ color: '#6a6458', fontSize: 8 }}>+{dayLogs.length - 6}</span>
                      )}
                    </div>
                  )}
                  {dayLogs.length === 0 && hasFed && (
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#8fbe5a' }} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8fbe5a' }} />
              <span className="text-xs" style={{ color: '#6a6458' }}>Fed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#c45a5a' }} />
              <span className="text-xs" style={{ color: '#6a6458' }}>Refused</span>
            </div>
            {animals.slice(0, 5).map((a, i) => (
              <div key={a.id} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ANIMAL_COLORS[i % ANIMAL_COLORS.length] }} />
                <span className="text-xs" style={{ color: '#6a6458' }}>{a.name}</span>
              </div>
            ))}
          </div>

          {/* Selected day detail */}
          {selectedDay && (
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-sm font-medium mb-3" style={{ color: '#f0ece0' }}>{format(selectedDay, 'EEEE, MMMM d')}</p>
              {selectedDayLogs.length === 0 ? (
                <p className="text-sm" style={{ color: '#6a6458' }}>No feedings on this day</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {selectedDayLogs.map((log) => {
                    const animal = animals.find((a) => a.id === log.animal_id)
                    return (
                      <div key={log.id} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: log.refused ? '#c45a5a' : (animalColorMap.get(log.animal_id) ?? '#8fbe5a') }} />
                        <div className="flex-1">
                          <span className="text-sm font-medium" style={{ color: '#f0ece0' }}>{animal?.name ?? 'Unknown'}</span>
                          <span className="text-xs ml-2" style={{ color: '#6a6458' }}>
                            {log.refused ? 'Refused' : `${log.prey_type}${log.prey_size ? ` (${log.prey_size})` : ''} ×${log.quantity}`}
                          </span>
                        </div>
                        <span className="text-xs" style={{ color: '#6a6458' }}>{format(new Date(log.fed_at), 'h:mm a')}</span>
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
                <p className="text-xs" style={{ color: '#6a6458' }}>Feedings</p>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: '#c45a5a', fontFamily: 'Playfair Display, serif' }}>
                  {logsInMonth.filter((l) => l.refused).length}
                </p>
                <p className="text-xs" style={{ color: '#6a6458' }}>Refused</p>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: '#f0ece0', fontFamily: 'Playfair Display, serif' }}>
                  {new Set(logsInMonth.filter((l) => !l.refused).map((l) => format(new Date(l.fed_at), 'yyyy-MM-dd'))).size}
                </p>
                <p className="text-xs" style={{ color: '#6a6458' }}>Active days</p>
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
    </div>
  )
}
