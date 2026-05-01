import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns'
import { useAnimals } from '@/hooks/useAnimals'
import { useFeedingLogs } from '@/hooks/useFeedingLogs'
import { Header } from '@/components/layout/Header'

const ANIMAL_COLORS = [
  '#8fbe5a', '#d4924a', '#5a8ebe', '#c45a5a', '#a87ac4',
  '#5abeaa', '#be5a8f', '#8e8e5a', '#5a8e8e', '#be8f5a',
]

export function FeedingCalendar() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const { data: animals } = useAnimals()
  const { data: logs } = useFeedingLogs()

  const animalColorMap = useMemo(() => {
    const map = new Map<string, string>()
    animals.forEach((a, i) => map.set(a.id, ANIMAL_COLORS[i % ANIMAL_COLORS.length]))
    return map
  }, [animals])

  const monthStart = startOfMonth(new Date(year, month))
  const monthEnd = endOfMonth(monthStart)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const logsInMonth = useMemo(
    () => logs.filter((l) => {
      const d = new Date(l.fed_at)
      return d.getFullYear() === year && d.getMonth() === month
    }),
    [logs, year, month]
  )

  const logsByDay = useMemo(() => {
    const map = new Map<string, typeof logs>()
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

  const startPad = getDay(monthStart)

  return (
    <div className="flex-1 px-4 py-6 pb-24 md:pb-8 max-w-3xl mx-auto w-full">
      <Header title="Feeding Calendar" />

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
        {/* Padding cells */}
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
              {/* Dots for fed / refused */}
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
              {/* Compact indicator for cells without dots */}
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
        <div className="rounded-xl p-4" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
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
      <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
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
    </div>
  )
}
