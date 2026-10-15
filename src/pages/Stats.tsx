import { useState, useEffect, useMemo, useCallback } from 'react'
import { format, startOfYear } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAnimals } from '@/hooks/useAnimals'
import { summariseFeeding } from '@/lib/feedingStatus'
import { useFeedingLogs } from '@/hooks/useFeedingLogs'
import { useHousehold } from '@/context/HouseholdContext'
import { getAllExpensesComplete } from '@/lib/queries'
import { Header } from '@/components/layout/Header'
import type { Expense } from '@/hooks/useExpenses'
import { EXPENSE_CATEGORY_LABELS } from '@/hooks/useExpenses'
import { loadState } from '@/lib/loadState'
import { LoadError } from '@/components/ui/LoadError'
import { formatAUD } from '@/lib/format'

export function Stats() {
  const { data: animals, loading: animalsLoading, error: animalsError, refresh: refreshAnimals } = useAnimals()
  const { data: logs, error: logsError, refresh: refreshLogs } = useFeedingLogs()
  const { householdId } = useHousehold()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expensesError, setExpensesError] = useState<string | null>(null)

  const loadExpenses = useCallback(() => {
    if (!householdId) return
    // Previously a floating promise with no catch: a failed load left expenses
    // at [] and the page reported a year's spend as nothing, while the
    // rejection went unhandled. The error clears on success rather than before
    // the request, so nothing sets state synchronously inside the effect.
    getAllExpensesComplete(householdId)
      .then((data) => { setExpenses(data as Expense[]); setExpensesError(null) })
      .catch((e: unknown) => setExpensesError(
        e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to load expenses'
      ))
  }, [householdId])

  useEffect(() => { loadExpenses() }, [loadExpenses])

  const animalsState = loadState({ loading: animalsLoading, error: animalsError, count: animals.length })
  const anyError = animalsError ?? logsError ?? expensesError
  function retryAll() {
    refreshAnimals()
    refreshLogs()
    loadExpenses()
  }

  const now = new Date()
  const yearStart = startOfYear(now)

  const ytdExpenses = useMemo(
    () => expenses.filter((e) => new Date(e.expense_date) >= yearStart),
    [expenses, yearStart]
  )

  const ytdTotalCents = ytdExpenses.reduce((s, e) => s + e.amount_cents, 0)

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>()
    ytdExpenses.forEach((e) => {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount_cents)
    })
    return Array.from(map.entries())
      .map(([cat, cents]) => ({ cat, label: EXPENSE_CATEGORY_LABELS[cat] ?? cat, amount: cents / 100 }))
      .sort((a, b) => b.amount - a.amount)
  }, [ytdExpenses])

  const animalsByCategory = useMemo(() => {
    const map = new Map<string, number>()
    animals.forEach((a) => {
      const cat = categorize(a.species)
      map.set(cat, (map.get(cat) ?? 0) + 1)
    })
    return Array.from(map.entries())
      .map(([cat, count]) => ({ cat, count }))
      .sort((a, b) => b.count - a.count)
  }, [animals])

  const feedingStats = useMemo(() => {
    const ytdLogs = logs.filter((l) => new Date(l.fed_at) >= yearStart)
    const total = ytdLogs.length
    const refused = ytdLogs.filter((l) => l.refused).length
    const fed = total - refused
    const rate = total > 0 ? Math.round((fed / total) * 100) : 0
    return { total, refused, fed, rate }
  }, [logs, yearStart])

  const monthlyFeedingData = useMemo(() => {
    const map = new Map<string, { month: string; fed: number; refused: number }>()
    ;[...logs].reverse().forEach((log) => {
      const key = format(new Date(log.fed_at), 'MMM yy')
      const entry = map.get(key) ?? { month: key, fed: 0, refused: 0 }
      if (log.refused) entry.refused++
      else entry.fed++
      map.set(key, entry)
    })
    return Array.from(map.values()).slice(-12)
  }, [logs])

  const topStreaks = useMemo(() => {
    const byAnimal = new Map<string, typeof logs>()
    logs.forEach((log) => {
      const list = byAnimal.get(log.animal_id) ?? []
      list.push(log)
      byAnimal.set(log.animal_id, list)
    })
    const streaks: { name: string; streak: number }[] = []
    byAnimal.forEach((animalLogs, animalId) => {
      const sorted = [...animalLogs].sort((a, b) => new Date(b.fed_at).getTime() - new Date(a.fed_at).getTime())
      let streak = 0
      for (const log of sorted) {
        if (log.refused) break
        streak++
      }
      const animal = animals.find((a) => a.id === animalId)
      if (animal && streak > 0) streaks.push({ name: animal.name, streak })
    })
    return streaks.sort((a, b) => b.streak - a.streak).slice(0, 5)
  }, [logs, animals])

  const feedingSummary = useMemo(() => summariseFeeding(animals), [animals])
  const overdueCount = feedingSummary.overdue

  return (
    <div className="flex-1 px-4 lg:px-8 pt-2 md:pt-6 pb-nav md:pb-8 max-w-3xl mx-auto w-full">
      <Header title="Collection Stats" />

      {/* Every figure here is derived from animals, feedings and expenses. A
          statistic computed over a set that failed to load is not a small
          error, it is a confident wrong number. */}
      {animalsState === 'error' ? (
        <LoadError subject="your collection" message={animalsError} onRetry={retryAll} />
      ) : (
      <>
      {anyError && (
        <LoadError inline subject="these figures" message={anyError} onRetry={retryAll} />
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2.5 mb-8">
        <StatCard label="Animals" value={animals.length} color="var(--color-tint)" />
        <StatCard
          label="Overdue"
          value={overdueCount}
          // Zero overdue only earns green when every animal is actually tracked.
          color={overdueCount > 0 ? 'var(--color-red)' : feedingSummary.untracked > 0 ? 'var(--color-orange)' : 'var(--color-green)'}
          note={feedingSummary.untracked > 0 ? `${feedingSummary.untracked} not tracked` : undefined}
        />
        <StatCard label="YTD feedings" value={feedingStats.fed} color="var(--color-tint)" />
        <StatCard label="Compliance" value={`${feedingStats.rate}%`} color={feedingStats.rate >= 80 ? 'var(--color-tint)' : feedingStats.rate >= 60 ? 'var(--color-orange)' : 'var(--color-red)'} />
      </div>

      {/* YTD spend */}
      {ytdTotalCents > 0 && (
        <Section title={`YTD spend — ${formatAUD(ytdTotalCents)} AUD`}>
          <div className="flex flex-col gap-3.5">
            {expenseByCategory.map(({ cat, label, amount }) => (
              <div key={cat}>
                <div className="flex justify-between text-[15px] mb-1.5">
                  <span className="text-label">{label}</span>
                  <span className="text-label-2 tabular-nums">{formatAUD(Math.round(amount * 100))}</span>
                </div>
                {/* One colour: the label already says which category, and red
                    and amber are kept for things that need doing. */}
                <div className="h-2 rounded-full overflow-hidden bg-fill">
                  <div className="h-full rounded-full bg-tint" style={{ width: `${(amount / (ytdTotalCents / 100)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Monthly feeding chart */}
      {monthlyFeedingData.length > 1 && (
        <Section title="Monthly feedings">
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={monthlyFeedingData} barCategoryGap="30%">
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-label-2)' }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-surface-2)', border: 'none', borderRadius: 10, color: 'var(--color-label)', boxShadow: '0 8px 24px rgba(0,0,0,0.16)' }}
                labelStyle={{ color: 'var(--color-label-2)', fontSize: 12 }}
              />
              <Bar isAnimationActive={false} dataKey="fed" name="Fed" stackId="a" fill="var(--color-green)" radius={[0, 0, 0, 0]} />
              <Bar isAnimationActive={false} dataKey="refused" name="Refused" stackId="a" fill="var(--color-red)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* Animals by category */}
      {animalsByCategory.length > 0 && (
        <Section title="Collection by type">
          <ResponsiveContainer width="100%" height={Math.max(80, animalsByCategory.length * 36)}>
            <BarChart data={animalsByCategory} layout="vertical" margin={{ left: 0, right: 24 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="cat" tick={{ fontSize: 13, fill: 'var(--color-label)' }} axisLine={false} tickLine={false} width={90} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-surface-2)', border: 'none', borderRadius: 10, color: 'var(--color-label)', boxShadow: '0 8px 24px rgba(0,0,0,0.16)' }}
                labelStyle={{ color: 'var(--color-label-2)', fontSize: 12 }}
                formatter={(v) => [v, 'Animals']}
              />
              <Bar isAnimationActive={false} dataKey="count" radius={[0, 6, 6, 0]} fill="var(--color-tint)" barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* Top feeding streaks */}
      {topStreaks.length > 0 && (
        <Section title="Top feeding streaks">
          <div className="flex flex-col gap-3.5">
            {topStreaks.map(({ name, streak }, i) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-[15px] font-semibold w-4 text-right text-label-3 tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-3 text-[15px] mb-1.5">
                    <span className="text-label truncate">{name}</span>
                    <span className="text-tint font-semibold tabular-nums">{streak}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-fill">
                    <div
                      className="h-full rounded-full bg-tint"
                      style={{ width: `${Math.min(100, (streak / (topStreaks[0]?.streak || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
      </>
      )}
    </div>
  )
}

/** A summary tile in the manner of Health: the label in grey, the figure large. */
function StatCard({ label, value, color, note }: { label: string; value: number | string; color?: string; note?: string }) {
  return (
    <div className="rounded-xl bg-surface px-3.5 py-3">
      <p className="text-[13px] font-semibold text-label-2">{label}</p>
      <p className="text-[28px] leading-[34px] font-bold tabular-nums mt-0.5" style={{ color: color ?? 'var(--color-label)' }}>{value}</p>
      {note && <p className="text-[13px] text-label-2">{note}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-[20px] leading-[25px] font-bold text-label px-1 mb-2.5">{title}</h2>
      <div className="rounded-xl bg-surface p-4">{children}</div>
    </section>
  )
}

function categorize(species: string): string {
  const s = species.toLowerCase()
  if (/python|boa|corn\s*snake|king\s*snake|milk\s*snake|rat\s*snake|hognose|blood\s*python|vine\s*snake|sand\s*boa|garter|bull\s*snake|pine\s*snake|viper|mamba|cobra|anaconda|ribbon\s*snake|\bsnake\b/.test(s)) return 'Snakes'
  if (/gecko|bearded\s*dragon|monitor|agama|iguana|chameleon|skink|blue.tongue|anole|uromastyx|tegu|crested|frilled|savannah|ackie|fat.tail|basilisk|\blizard\b/.test(s)) return 'Lizards'
  if (/turtle|tortoise|terrapin/.test(s)) return 'Turtles'
  if (/frog|pacman|dart\s*frog|horned\s*frog|dumpy|whites\s*tree|bullfrog|tree\s*frog/.test(s)) return 'Frogs'
  if (/salamander|axolotl|newt|\btoad\b|caecilian/.test(s)) return 'Amphibians'
  if (/crocodile|alligator|caiman|gharial/.test(s)) return 'Crocodilians'
  if (/tarantula|scorpion|millipede|stick\s*insect|mantis|hermit\s*crab|\bspider\b/.test(s)) return 'Invertebrates'
  if (/\brat\b|\bmouse\b|\bmice\b|rabbit|degu|chinchilla|hedgehog|ferret|sugar\s*glider/.test(s)) return 'Mammals'
  return 'Other'
}
