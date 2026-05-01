import { useState, useEffect, useMemo } from 'react'
import { format, differenceInDays, startOfYear } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useAnimals } from '@/hooks/useAnimals'
import { useFeedingLogs } from '@/hooks/useFeedingLogs'
import { useHousehold } from '@/context/HouseholdContext'
import { getAllExpenses } from '@/lib/queries'
import { Header } from '@/components/layout/Header'
import type { Expense } from '@/hooks/useExpenses'
import { EXPENSE_CATEGORY_LABELS } from '@/hooks/useExpenses'

const CATEGORY_COLORS: Record<string, string> = {
  feeder_stock: '#8fbe5a',
  veterinary: '#c45a5a',
  enclosure: '#5a8ebe',
  acquisition: '#d4924a',
  supplies: '#a87ac4',
  misc: '#6a6458',
}

const ANIMAL_CATEGORY_COLORS = [
  '#8fbe5a', '#d4924a', '#5a8ebe', '#c45a5a', '#a87ac4', '#5abeaa', '#be5a8f', '#6a8e5a',
]

export function Stats() {
  const { data: animals } = useAnimals()
  const { data: logs } = useFeedingLogs()
  const { householdId } = useHousehold()
  const [expenses, setExpenses] = useState<Expense[]>([])

  useEffect(() => {
    if (!householdId) return
    getAllExpenses(householdId).then((data) => setExpenses(data as Expense[]))
  }, [householdId])

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

  const overdueCount = animals.filter((a) => {
    if (!a.last_fed_at || !a.feeding_frequency_days) return false
    return differenceInDays(now, new Date(a.last_fed_at)) > a.feeding_frequency_days
  }).length

  return (
    <div className="flex-1 px-4 py-6 pb-24 md:pb-8 max-w-3xl mx-auto w-full">
      <Header title="Collection Stats" />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Animals" value={animals.length} color="#8fbe5a" />
        <StatCard label="Overdue" value={overdueCount} color={overdueCount > 0 ? '#c45a5a' : '#5a9e6a'} />
        <StatCard label="YTD feedings" value={feedingStats.fed} color="#8fbe5a" />
        <StatCard label="Compliance" value={`${feedingStats.rate}%`} color={feedingStats.rate >= 80 ? '#8fbe5a' : feedingStats.rate >= 60 ? '#d4924a' : '#c45a5a'} />
      </div>

      {/* YTD spend */}
      {ytdTotalCents > 0 && (
        <Section title={`YTD spend — $${(ytdTotalCents / 100).toFixed(2)} AUD`}>
          <div className="flex flex-col gap-2">
            {expenseByCategory.map(({ cat, label, amount }, i) => (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: '#a8a090' }}>{label}</span>
                  <span style={{ color: '#f0ece0' }}>${amount.toFixed(2)}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(amount / (ytdTotalCents / 100)) * 100}%`,
                      backgroundColor: CATEGORY_COLORS[cat] ?? ANIMAL_CATEGORY_COLORS[i % ANIMAL_CATEGORY_COLORS.length],
                    }}
                  />
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
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6a6458' }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#2e2e2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f0ece0' }}
                labelStyle={{ color: '#a8a090', fontSize: 12 }}
              />
              <Bar dataKey="fed" name="Fed" stackId="a" fill="#5a9e6a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="refused" name="Refused" stackId="a" fill="#c45a5a" radius={[4, 4, 0, 0]} />
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
              <YAxis type="category" dataKey="cat" tick={{ fontSize: 12, fill: '#a8a090' }} axisLine={false} tickLine={false} width={90} />
              <Tooltip
                contentStyle={{ backgroundColor: '#2e2e2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f0ece0' }}
                labelStyle={{ color: '#a8a090', fontSize: 12 }}
                formatter={(v) => [v, 'Animals']}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {animalsByCategory.map((entry, i) => (
                  <Cell key={entry.cat} fill={ANIMAL_CATEGORY_COLORS[i % ANIMAL_CATEGORY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* Top feeding streaks */}
      {topStreaks.length > 0 && (
        <Section title="Top feeding streaks">
          <div className="flex flex-col gap-2">
            {topStreaks.map(({ name, streak }, i) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-xs font-semibold w-4 text-right" style={{ color: '#6a6458' }}>{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: '#f0ece0' }}>{name}</span>
                    <span style={{ color: '#8fbe5a' }}>🔥 {streak}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, (streak / (topStreaks[0]?.streak || 1)) * 100)}%`, backgroundColor: '#8fbe5a' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-xs mb-1" style={{ color: '#6a6458' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: color ?? '#f0ece0' }}>{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold tracking-wider mb-2" style={{ color: '#6a6458' }}>{title.toUpperCase()}</p>
      <div className="rounded-xl p-4" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
        {children}
      </div>
    </div>
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
