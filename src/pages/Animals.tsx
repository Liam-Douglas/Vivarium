import { useState, useMemo } from 'react'
import { differenceInDays } from 'date-fns'
import { useAnimals } from '@/hooks/useAnimals'
import { useFeedingLogs } from '@/hooks/useFeedingLogs'
import { useAuth } from '@/context/AuthContext'
import { AnimalCard } from '@/components/animals/AnimalCard'
import { AnimalForm } from '@/components/animals/AnimalForm'
import { FeedingLogForm } from '@/components/feeding/FeedingLogForm'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Header } from '@/components/layout/Header'
import { EmptyState } from '@/components/ui/EmptyState'
import { AnimalCardSkeleton } from '@/components/ui/LoadingSkeleton'
import { UpgradeModal } from '@/components/upgrade/UpgradeModal'
import type { Animal } from '@/hooks/useAnimals'

type SortKey = 'name-asc' | 'name-desc' | 'overdue-first' | 'recently-fed'

const CATEGORIES: { label: string; icon: string; pattern: RegExp }[] = [
  { label: 'Snakes',          icon: '🐍', pattern: /python|boa|corn\s*snake|king\s*snake|milk\s*snake|rat\s*snake|hognose|blood\s*python|vine\s*snake|sand\s*boa|garter|bull\s*snake|pine\s*snake|viper|mamba|cobra|anaconda|ribbon\s*snake|\bsnake\b/ },
  { label: 'Lizards',         icon: '🦎', pattern: /gecko|bearded\s*dragon|monitor|agama|iguana|chameleon|skink|blue.tongue|anole|uromastyx|tegu|crested|frilled|savannah|ackie|fat.tail|basilisk|\blizard\b/ },
  { label: 'Turtles',         icon: '🐢', pattern: /turtle|tortoise|terrapin/ },
  { label: 'Frogs',           icon: '🐸', pattern: /frog|pacman|dart\s*frog|horned\s*frog|dumpy|whites\s*tree|bullfrog|tree\s*frog/ },
  { label: 'Amphibians',      icon: '🌿', pattern: /salamander|axolotl|newt|\btoad\b|caecilian/ },
  { label: 'Crocodilians',    icon: '🐊', pattern: /crocodile|alligator|caiman|gharial/ },
  { label: 'Invertebrates',   icon: '🕷️', pattern: /tarantula|scorpion|millipede|stick\s*insect|mantis|hermit\s*crab|\bspider\b/ },
  { label: 'Mammals',         icon: '🐀', pattern: /\brat\b|\bmouse\b|\bmice\b|rabbit|degu|chinchilla|hedgehog|ferret|sugar\s*glider/ },
]

function categorize(species: string): string {
  const s = species.toLowerCase()
  return CATEGORIES.find((c) => c.pattern.test(s))?.label ?? 'Other'
}

function feedingUrgency(animal: Animal): number {
  if (!animal.last_fed_at || !animal.feeding_frequency_days) return 3
  const days = differenceInDays(new Date(), new Date(animal.last_fed_at))
  const freq = animal.feeding_frequency_days
  if (days > freq) return 0
  if (days >= freq - 1) return 1
  return 2
}

export function Animals() {
  const { data: animals, loading, error, refresh } = useAnimals()
  const { data: allLogs } = useFeedingLogs()
  const { canAddAnimal } = useAuth()

  const [addOpen, setAddOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [quickFeedId, setQuickFeedId] = useState<string | null>(null)
  const [quickFeedOpen, setQuickFeedOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('name-asc')

  const streakByAnimal = useMemo(() => {
    const map = new Map<string, number>()
    const byAnimal = new Map<string, typeof allLogs>()
    allLogs.forEach((log) => {
      const list = byAnimal.get(log.animal_id) ?? []
      list.push(log)
      byAnimal.set(log.animal_id, list)
    })
    byAnimal.forEach((logs, animalId) => {
      const sorted = [...logs].sort((a, b) => new Date(b.fed_at).getTime() - new Date(a.fed_at).getTime())
      let streak = 0
      for (const log of sorted) {
        if (log.refused) break
        streak++
      }
      map.set(animalId, streak)
    })
    return map
  }, [allLogs])

  // Categories that actually appear in this collection
  const presentCategories = useMemo(() => {
    const seen = new Set(animals.map((a) => categorize(a.species)))
    return CATEGORIES.filter((c) => seen.has(c.label)).concat(
      seen.has('Other') ? [{ label: 'Other', icon: '❓', pattern: /(?!)/ }] : []
    )
  }, [animals])

  const displayed = useMemo(() => {
    let list = animals.filter((a) => {
      const matchesSearch = !search ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.species.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = !categoryFilter || categorize(a.species) === categoryFilter
      return matchesSearch && matchesCategory
    })

    list = [...list].sort((a, b) => {
      if (sort === 'name-asc') return a.name.localeCompare(b.name)
      if (sort === 'name-desc') return b.name.localeCompare(a.name)
      if (sort === 'overdue-first') return feedingUrgency(a) - feedingUrgency(b)
      if (sort === 'recently-fed') {
        const ta = a.last_fed_at ? new Date(a.last_fed_at).getTime() : 0
        const tb = b.last_fed_at ? new Date(b.last_fed_at).getTime() : 0
        return tb - ta
      }
      return 0
    })

    return list
  }, [animals, search, categoryFilter, sort])

  const urgentAnimals = animals.filter(a => {
    if (!a.last_fed_at || !a.feeding_frequency_days) return false
    const days = differenceInDays(new Date(), new Date(a.last_fed_at))
    return days >= a.feeding_frequency_days - 1  // amber or red
  }).sort((a, b) => {
    // overdue first
    const daysA = differenceInDays(new Date(), new Date(a.last_fed_at!))
    const daysB = differenceInDays(new Date(), new Date(b.last_fed_at!))
    return daysB - daysA
  })

  function handleAddClick() {
    if (!canAddAnimal(animals.length)) setUpgradeOpen(true)
    else setAddOpen(true)
  }

  const hasActiveFilter = search || categoryFilter

  return (
    <div className="flex-1 px-4 py-6 pb-24 md:pb-8 max-w-5xl mx-auto w-full">
      <Header
        title="Animals"
        subtitle={animals.length > 0 ? `${animals.length} in your collection` : undefined}
        action={
          <Button size="sm" onClick={handleAddClick}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add animal
          </Button>
        }
      />

      {urgentAnimals.length > 0 && (
        <div className="mb-4">
          <div
            className="flex gap-2 overflow-x-auto pb-0.5"
            style={{ scrollbarWidth: 'none' }}
          >
            {urgentAnimals.map((a) => {
              const days = differenceInDays(new Date(), new Date(a.last_fed_at!))
              const isOverdue = days >= a.feeding_frequency_days!
              return (
                <div
                  key={a.id}
                  className="shrink-0 flex flex-col gap-1 rounded-xl px-3 py-2"
                  style={{
                    width: 140,
                    backgroundColor: isOverdue ? 'rgba(196,90,90,0.08)' : 'rgba(212,146,74,0.08)',
                    border: `1px solid ${isOverdue ? 'rgba(196,90,90,0.2)' : 'rgba(212,146,74,0.2)'}`,
                  }}
                >
                  <span className="text-xs font-medium truncate" style={{ color: '#f0ece0' }}>{a.name}</span>
                  <span className="text-xs" style={{ color: isOverdue ? '#c45a5a' : '#d4924a' }}>
                    {isOverdue ? 'Overdue' : 'Due today'}
                  </span>
                  <button
                    onClick={() => { setQuickFeedId(a.id); setQuickFeedOpen(true) }}
                    className="rounded-full px-2 py-0.5 text-xs font-medium mt-0.5 self-start"
                    style={{ backgroundColor: 'rgba(143,190,90,0.15)', color: '#8fbe5a', border: '1px solid rgba(143,190,90,0.25)' }}
                  >
                    Feed
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {animals.length > 0 && (
        <div className="flex flex-col gap-3 mb-4">
          {/* Search + sort row */}
          <div className="flex gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search animals…"
              className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.08)', color: '#f0ece0' }}
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.08)', color: '#a8a090' }}
            >
              <option value="name-asc">Name A → Z</option>
              <option value="name-desc">Name Z → A</option>
              <option value="overdue-first">Overdue first</option>
              <option value="recently-fed">Recently fed</option>
            </select>
          </div>

          {/* Category chips */}
          {presentCategories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
              <Chip label="All" icon="🐾" active={categoryFilter === null} onClick={() => setCategoryFilter(null)} />
              {presentCategories.map((c) => (
                <Chip key={c.label} label={c.label} icon={c.icon} active={categoryFilter === c.label} onClick={() => setCategoryFilter(categoryFilter === c.label ? null : c.label)} />
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(196,90,90,0.1)', color: '#c45a5a' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <AnimalCardSkeleton key={i} />)}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          icon="🦎"
          title={hasActiveFilter ? 'No animals match' : 'No animals yet'}
          description={hasActiveFilter ? 'Try adjusting your search or filter' : 'Add your first animal to get started'}
          action={!hasActiveFilter ? <Button onClick={handleAddClick}>Add your first animal</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {displayed.map((animal) => (
            <AnimalCard key={animal.id} animal={animal} streak={streakByAnimal.get(animal.id) ?? 0} />
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add animal">
        <AnimalForm onSuccess={() => { setAddOpen(false); refresh() }} onCancel={() => setAddOpen(false)} />
      </Modal>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />

      <Modal open={quickFeedOpen} onClose={() => setQuickFeedOpen(false)} title="Log feeding">
        <FeedingLogForm
          preselectedAnimalId={quickFeedId ?? undefined}
          onSuccess={() => { setQuickFeedOpen(false); refresh() }}
          onCancel={() => setQuickFeedOpen(false)}
        />
      </Modal>
    </div>
  )
}

function Chip({ label, icon, active, onClick }: { label: string; icon: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0"
      style={{
        backgroundColor: active ? 'rgba(143,190,90,0.15)' : '#242420',
        color: active ? '#8fbe5a' : '#a8a090',
        border: `1px solid ${active ? 'rgba(143,190,90,0.3)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      <span>{icon}</span>
      {label}
    </button>
  )
}
