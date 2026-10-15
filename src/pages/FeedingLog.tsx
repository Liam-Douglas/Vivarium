import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, subDays, startOfDay } from 'date-fns'
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
import { filterFeedings, preyTypesIn, type FeedingOutcome } from '@/lib/feedingFilters'
import { loadState } from '@/lib/loadState'
import { LoadError } from '@/components/ui/LoadError'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ListSection, ListRow } from '@/components/ui/List'
import { Icon } from '@/components/ui/icons'
import { Badge } from '@/components/ui/Badge'

/** Legend entries shown before collapsing the rest into a count. */
const LEGEND_LIMIT = 6

export function FeedingLog() {
  const { data: animals } = useAnimals()
  const { data: allLogs, loading, error, refresh } = useFeedingLogs()

  const { showToast } = useToast()

  const [tab, setTab] = useState<'log' | 'calendar'>('log')
  const [addOpen, setAddOpen] = useState(false)
  const [batchOpen, setBatchOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<FeedingLogRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<FeedingLogRow | null>(null)

  // Log tab state
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | undefined>(undefined)
  const [outcome, setOutcome] = useState<FeedingOutcome>('all')
  const [preyType, setPreyType] = useState('')
  const [periodDays, setPeriodDays] = useState(0) // 0 = all time
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Calendar tab state
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Filtered logs for Log tab
  const logs = useMemo(() => filterFeedings(allLogs, {
    animalId: selectedAnimalId,
    outcome,
    preyType: preyType || undefined,
    since: periodDays > 0 ? subDays(startOfDay(new Date()), periodDays - 1) : undefined,
  }), [allLogs, selectedAnimalId, outcome, preyType, periodDays])

  const preyOptions = useMemo(() => preyTypesIn(allLogs), [allLogs])
  // Outcome stays on the surface; the rest fold away. Tracked separately so a
  // filter narrowing the list from behind a closed panel can still be shown.
  const secondaryActive = Boolean(selectedAnimalId) || Boolean(preyType) || periodDays > 0
  const filtersActive = secondaryActive || outcome !== 'all'

  function clearFilters() {
    setSelectedAnimalId(undefined)
    setOutcome('all')
    setPreyType('')
    setPeriodDays(0)
  }

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

  const state = loadState({ loading, error, count: allLogs.length })

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

  const selectCls = 'w-full min-h-11 rounded-[10px] px-3.5 text-[17px] bg-fill border-0 outline-none focus-visible:ring-2 focus-visible:ring-tint disabled:opacity-40'

  return (
    <div className="flex-1 px-4 lg:px-8 pt-2 md:pt-6 pb-nav md:pb-8 max-w-3xl mx-auto w-full">
      <Header
        title="Feeding Log"
        action={tab === 'log' ? (
          <>
            {dueAnimals.length > 0 && (
              <button
                type="button"
                onClick={() => setBatchOpen(true)}
                className="tap-target h-9 px-3.5 rounded-full text-[15px] font-semibold text-tint active:opacity-60 whitespace-nowrap"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-tint) 14%, transparent)' }}
              >
                Feed {dueAnimals.length} due
              </button>
            )}
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              aria-label="Log feeding"
              className="tap-target inline-flex items-center justify-center gap-1.5 w-9 h-9 sm:w-auto sm:px-3.5 rounded-full bg-tint text-on-tint text-[15px] font-semibold active:opacity-70 transition-opacity"
            >
              <Icon name="plus" size={18} strokeWidth={2.4} />
              <span className="hidden sm:inline">Log feeding</span>
            </button>
          </>
        ) : null}
      />

      <SegmentedControl
        label="View"
        className="mb-4 sm:max-w-xs"
        value={tab}
        onChange={setTab}
        options={[{ value: 'log', label: 'Log' }, { value: 'calendar', label: 'Calendar' }]}
      />

      {/* ── LOG TAB ── */}
      {tab === 'log' && (
        <>
          {/* Filters */}
          {animals.length > 0 && (
            <div className="flex flex-col gap-2.5 mb-5">
              <div className="flex items-center gap-3">
                {/* Outcome — refusals are the reason to filter this list at all,
                    so they get a control you can hit rather than a menu item. */}
                <SegmentedControl
                  label="Outcome"
                  className="flex-1"
                  value={outcome}
                  onChange={setOutcome}
                  options={[{ value: 'all', label: 'All' }, { value: 'fed', label: 'Fed' }, { value: 'refused', label: 'Refused' }]}
                />
                <button
                  type="button"
                  onClick={() => setFiltersOpen((open) => !open)}
                  aria-expanded={filtersOpen}
                  className="tap-target shrink-0 inline-flex items-center gap-1.5 text-[17px] text-tint active:opacity-60"
                >
                  Filters
                  {/* A filter narrowing the list from behind a closed panel is
                      hidden state; the dot is what stops it being a trap. */}
                  {secondaryActive && <span className="w-2 h-2 rounded-full bg-tint" aria-label="(active)" />}
                </button>
              </div>

              {filtersOpen && (
                <>
                  <select
                    value={selectedAnimalId ?? ''}
                    onChange={(e) => setSelectedAnimalId(e.target.value || undefined)}
                    aria-label="Filter by animal"
                    className={`${selectCls} ${selectedAnimalId ? 'text-label' : 'text-label-2'}`}
                  >
                    <option value="">All animals</option>
                    {animals.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={periodDays}
                      onChange={(e) => setPeriodDays(Number(e.target.value))}
                      aria-label="Filter by period"
                      className={`${selectCls} ${periodDays ? 'text-label' : 'text-label-2'}`}
                    >
                      <option value={0}>All time</option>
                      <option value={30}>Last 30 days</option>
                      <option value={90}>Last 90 days</option>
                      <option value={365}>Last year</option>
                    </select>

                    <select
                      value={preyType}
                      onChange={(e) => setPreyType(e.target.value)}
                      aria-label="Filter by prey type"
                      disabled={preyOptions.length < 2}
                      className={`${selectCls} ${preyType ? 'text-label' : 'text-label-2'}`}
                    >
                      <option value="">All prey</option>
                      {preyOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </>
              )}

              {filtersActive && (
                <div className="flex items-center justify-between px-1">
                  <span className="text-[13px] text-label-2">
                    {logs.length} of {allLogs.length} feedings
                  </span>
                  <button type="button" onClick={clearFilters} className="tap-target text-[15px] text-tint active:opacity-60">
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          )}

          {state === 'stale' && (
            <LoadError inline subject="feedings" message={error} onRetry={refresh} />
          )}

          {state === 'loading' ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-tint)', borderTopColor: 'transparent' }} />
            </div>
          ) : state === 'error' ? (
            <LoadError subject="feedings" message={error} onRetry={refresh} />
          ) : logs.length === 0 ? (
            filtersActive ? (
              <EmptyState
                icon="search"
                title="No feedings match these filters"
                description="Try widening the period, or clear the filters to see everything."
                action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
              />
            ) : (
              <EmptyState
                icon="feed"
                title="No feedings logged yet"
                description="Tap to log one"
                action={<Button size="lg" onClick={() => setAddOpen(true)}>Log first feeding</Button>}
              />
            )
          ) : (
            <div className="flex flex-col gap-6">
              {logsByDate.map((group) => (
                <ListSection
                  key={group.key}
                  header={group.label}
                  action={group.relative ? <span className="text-[13px] text-label-2">{group.relative}</span> : undefined}
                >
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
                        className="list-row list-row-leading relative flex items-center gap-3 px-4 py-2.5 min-h-11 w-full text-left active:bg-fill hover:bg-fill/50 transition-colors"
                        style={{ '--sep-inset': '42px' } as React.CSSProperties}
                      >
                        {/* The animal's calendar colour, so the two tabs read as
                            the same data; red when the meal was refused. */}
                        <span
                          aria-hidden="true"
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: log.refused ? 'var(--color-red)' : animalColor(log.animal_id) }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[17px] text-label">{name ?? detail}</span>
                            {log.refused && <Badge status="red">Refused</Badge>}
                          </div>
                          {name && <p className="text-[15px] text-label-2">{detail}</p>}
                          {log.notes && <p className="text-[13px] text-label-2 truncate">{log.notes}</p>}
                        </div>
                        {hasTime && (
                          <span className="text-[15px] shrink-0 text-label-2 tabular-nums">{format(fedAt, 'h:mm a')}</span>
                        )}
                      </button>
                    )
                  })}
                </ListSection>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── CALENDAR TAB ── */}
      {tab === 'calendar' && (
        <>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[20px] font-bold text-label px-1">{format(monthStart, 'MMMM yyyy')}</span>
            <div className="flex items-center">
              <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" className="tap-target w-9 h-9 rounded-full flex items-center justify-center text-tint active:bg-fill">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button type="button" onClick={() => changeMonth(1)} aria-label="Next month" className="tap-target w-9 h-9 rounded-full flex items-center justify-center text-tint active:bg-fill">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          {/* Monthly summary */}
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            {[
              { label: 'Feedings', value: logsInMonth.filter((l) => !l.refused).length, color: 'var(--color-tint)' },
              { label: 'Refused', value: logsInMonth.filter((l) => l.refused).length, color: 'var(--color-red)' },
              { label: 'Active days', value: new Set(logsInMonth.filter((l) => !l.refused).map((l) => format(new Date(l.fed_at), 'yyyy-MM-dd'))).size, color: 'var(--color-label)' },
            ].map((t) => (
              <div key={t.label} className="rounded-xl bg-surface px-3 py-2.5">
                <p className="text-[13px] font-semibold text-label-2">{t.label}</p>
                <p className="text-[22px] leading-7 font-bold tabular-nums" style={{ color: t.color }}>{t.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-surface px-2 pt-2 pb-1 mb-3">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div key={d} className="text-center text-[13px] font-semibold py-1 text-label-3">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
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
                    aria-pressed={isSelected}
                    aria-label={format(day, 'd MMMM')}
                    className="flex flex-col items-center gap-1 pt-1 min-h-[52px] rounded-lg active:bg-fill"
                  >
                    {/* As in Calendar: today in the tint, the selected day in a
                        filled circle. */}
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[17px] tabular-nums transition-colors duration-150 ${
                        isSelected ? (isToday ? 'bg-tint text-on-tint font-semibold' : 'bg-label text-bg font-semibold') : isToday ? 'text-tint font-semibold' : 'text-label'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayLogs.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 justify-center px-0.5">
                        {dayLogs.slice(0, 6).map((log) => (
                          <div
                            key={log.id}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: log.refused ? 'var(--color-red)' : (animalColor(log.animal_id)) }}
                          />
                        ))}
                        {dayLogs.length > 6 && (
                          <span className="text-label-2" style={{ fontSize: 11, lineHeight: '6px' }}>+{dayLogs.length - 6}</span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-x-4 gap-y-1.5 mb-5 px-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-tint" />
              <span className="text-[13px] text-label-2">Fed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red" />
              <span className="text-[13px] text-label-2">Refused</span>
            </div>
            {animalsInMonth.slice(0, LEGEND_LIMIT).map((a) => (
              <div key={a.id} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: animalColor(a.id) }} />
                <span className="text-[13px] text-label-2">{a.name}</span>
              </div>
            ))}
            {animalsInMonth.length > LEGEND_LIMIT && (
              <span className="text-[13px] text-label-2">
                +{animalsInMonth.length - LEGEND_LIMIT} more
              </span>
            )}
          </div>

          {/* Selected day detail */}
          {selectedDay && (
            <ListSection header={format(selectedDay, 'EEEE d MMMM')} className="mb-4">
              {selectedDayLogs.length === 0 ? (
                <p className="px-4 py-3 text-[15px] text-label-2">No feedings on this day</p>
              ) : (
                selectedDayLogs.map((log) => {
                  const animal = animals.find((a) => a.id === log.animal_id)
                  return (
                    <ListRow
                      key={log.id}
                      separatorInset={42}
                      leading={<span className="block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: log.refused ? 'var(--color-red)' : (animalColor(log.animal_id)) }} />}
                      trailing={<span className="text-[15px] text-label-2 tabular-nums">{format(new Date(log.fed_at), 'h:mm a')}</span>}
                    >
                      <p className="text-[17px] text-label truncate">{animal?.name ?? 'Unknown'}</p>
                      <p className="text-[13px] text-label-2">
                        {log.refused ? 'Refused' : `${log.prey_type}${log.prey_size ? ` (${log.prey_size})` : ''} ×${log.quantity}`}
                      </p>
                    </ListRow>
                  )
                })
              )}
            </ListSection>
          )}

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
              className="min-h-11 rounded-[10px] text-[17px] text-red bg-fill active:bg-fill-2 transition-colors"
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
