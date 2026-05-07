import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { differenceInDays } from 'date-fns'
import { useAnimals } from '@/hooks/useAnimals'
import { useEnclosures } from '@/hooks/useEnclosures'
import type { Enclosure } from '@/hooks/useEnclosures'
import { useFeedingLogs } from '@/hooks/useFeedingLogs'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { AnimalCard } from '@/components/animals/AnimalCard'
import { AnimalForm } from '@/components/animals/AnimalForm'
import { FeedingLogForm } from '@/components/feeding/FeedingLogForm'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Header } from '@/components/layout/Header'
import { EmptyState } from '@/components/ui/EmptyState'
import { AnimalCardSkeleton } from '@/components/ui/LoadingSkeleton'
import { UpgradeModal } from '@/components/upgrade/UpgradeModal'
import { useToast } from '@/components/ui/Toast'
import { createFeedingLog, createEnclosure, updateEnclosure, deleteEnclosure, updateAnimal } from '@/lib/queries'
import type { Animal } from '@/hooks/useAnimals'

type SortKey = 'name-asc' | 'name-desc' | 'overdue-first' | 'recently-fed'
type PageTab = 'animals' | 'enclosures'

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

function getAnimalFeedingColor(animal: Animal): string {
  if (!animal.last_fed_at || !animal.feeding_frequency_days) return '#6a6458'
  const daysSince = differenceInDays(new Date(), new Date(animal.last_fed_at))
  const freq = animal.feeding_frequency_days
  if (daysSince > freq) return '#c45a5a'
  if (daysSince >= freq - 1) return '#d4924a'
  return '#5a9e6a'
}

const ENCLOSURE_TYPES = ['Vivarium', 'Terrarium', 'Tank', 'Rack', 'Tub', 'Cage', 'Other']

export function Animals() {
  const { data: animals, loading, error, refresh } = useAnimals()
  const { data: enclosures, loading: enclosuresLoading, refresh: refreshEnclosures } = useEnclosures()
  const { data: allLogs } = useFeedingLogs()
  const { canAddAnimal, user } = useAuth()
  const { householdId } = useHousehold()
  const { showToast } = useToast()

  // Page tab
  const [pageTab, setPageTab] = useState<PageTab>('animals')

  // Animals tab state
  const [addOpen, setAddOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [quickFeedId, setQuickFeedId] = useState<string | null>(null)
  const [quickFeedOpen, setQuickFeedOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('name-asc')

  // Enclosure form state
  const [enclosureFormOpen, setEnclosureFormOpen] = useState(false)
  const [editingEnclosure, setEditingEnclosure] = useState<Enclosure | null>(null)
  const [enclosureName, setEnclosureName] = useState('')
  const [enclosureType, setEnclosureType] = useState('')
  const [enclosureNotes, setEnclosureNotes] = useState('')
  const [enclosureSaving, setEnclosureSaving] = useState(false)

  // Batch feed state
  const [batchFeedEnclosure, setBatchFeedEnclosure] = useState<Enclosure | null>(null)
  const [batchFeedOpen, setBatchFeedOpen] = useState(false)
  const [batchFeedDate, setBatchFeedDate] = useState(new Date().toISOString().split('T')[0])
  const [batchFeedPreyType, setBatchFeedPreyType] = useState('')
  const [batchFeedPreySize, setBatchFeedPreySize] = useState('')
  const [batchFeedQuantity, setBatchFeedQuantity] = useState('1')
  const [batchFeedNotes, setBatchFeedNotes] = useState('')
  const [batchFeedLoading, setBatchFeedLoading] = useState(false)

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
    return days >= a.feeding_frequency_days - 1
  }).sort((a, b) => {
    const daysA = differenceInDays(new Date(), new Date(a.last_fed_at!))
    const daysB = differenceInDays(new Date(), new Date(b.last_fed_at!))
    return daysB - daysA
  })

  function handleAddClick() {
    if (!canAddAnimal(animals.length)) setUpgradeOpen(true)
    else setAddOpen(true)
  }

  function openAddEnclosure() {
    setEditingEnclosure(null)
    setEnclosureName('')
    setEnclosureType('')
    setEnclosureNotes('')
    setEnclosureFormOpen(true)
  }

  function openEditEnclosure(enc: Enclosure) {
    setEditingEnclosure(enc)
    setEnclosureName(enc.name)
    setEnclosureType(enc.enclosure_type ?? '')
    setEnclosureNotes(enc.notes ?? '')
    setEnclosureFormOpen(true)
  }

  async function handleSaveEnclosure() {
    if (!user || !householdId || !enclosureName.trim()) return
    setEnclosureSaving(true)
    try {
      if (editingEnclosure) {
        await updateEnclosure(editingEnclosure.id, {
          name: enclosureName.trim(),
          enclosure_type: enclosureType || null,
          notes: enclosureNotes || null,
        })
        showToast('Enclosure updated', 'success')
      } else {
        await createEnclosure({
          household_id: householdId,
          user_id: user.id,
          name: enclosureName.trim(),
          enclosure_type: enclosureType || null,
          notes: enclosureNotes || null,
        })
        showToast('Enclosure added', 'success')
      }
      setEnclosureFormOpen(false)
      refreshEnclosures()
    } catch (e) {
      showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Something went wrong', 'error')
    } finally {
      setEnclosureSaving(false)
    }
  }

  async function handleDeleteEnclosure(enc: Enclosure) {
    try {
      await deleteEnclosure(enc.id)
      showToast('Enclosure deleted', 'success')
      refreshEnclosures()
      refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to delete', 'error')
    }
  }

  function openBatchFeed(enc: Enclosure) {
    setBatchFeedEnclosure(enc)
    setBatchFeedDate(new Date().toISOString().split('T')[0])
    setBatchFeedPreyType('')
    setBatchFeedPreySize('')
    setBatchFeedQuantity('1')
    setBatchFeedNotes('')
    setBatchFeedOpen(true)
  }

  async function handleBatchFeed() {
    if (!user || !householdId || !batchFeedEnclosure) return
    const enclosureAnimals = animals.filter(a => a.enclosure_id === batchFeedEnclosure.id)
    if (enclosureAnimals.length === 0) return
    setBatchFeedLoading(true)
    try {
      const fedAt = new Date(batchFeedDate + 'T12:00:00').toISOString()
      await Promise.all(enclosureAnimals.map(a =>
        createFeedingLog({
          household_id: householdId,
          animal_id: a.id,
          user_id: user.id,
          fed_at: fedAt,
          prey_type: batchFeedPreyType.trim() || 'Unknown',
          prey_size: batchFeedPreySize.trim() || undefined,
          quantity: Math.max(1, parseInt(batchFeedQuantity) || 1),
          refused: false,
          notes: batchFeedNotes.trim() || undefined,
        })
      ))
      await Promise.all(enclosureAnimals.map(a =>
        updateAnimal(a.id, { last_fed_at: fedAt })
      ))
      showToast(`Fed ${enclosureAnimals.length} animal${enclosureAnimals.length !== 1 ? 's' : ''}`, 'success')
      setBatchFeedOpen(false)
      refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Batch feed failed', 'error')
    } finally {
      setBatchFeedLoading(false)
    }
  }

  const hasActiveFilter = search || categoryFilter

  const headerAction = pageTab === 'animals' ? (
    <Button size="sm" onClick={handleAddClick}>
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      Add animal
    </Button>
  ) : (
    <Button size="sm" onClick={openAddEnclosure}>
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      Add enclosure
    </Button>
  )

  const headerSubtitle = pageTab === 'animals'
    ? (animals.length > 0 ? `${animals.length} in your collection` : undefined)
    : (enclosures.length > 0 ? `${enclosures.length} enclosure${enclosures.length !== 1 ? 's' : ''}` : undefined)

  return (
    <div className="flex-1 px-4 py-6 pb-24 md:pb-8 max-w-5xl mx-auto w-full">
      <Header title="Animals" subtitle={headerSubtitle} action={headerAction} />

      {/* Tab toggle */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ backgroundColor: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)' }}>
        {(['animals', 'enclosures'] as PageTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setPageTab(tab)}
            className="flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors"
            style={{
              backgroundColor: pageTab === tab ? '#242420' : 'transparent',
              color: pageTab === tab ? '#f0ece0' : '#6a6458',
            }}
          >
            {tab === 'animals' ? `🐾 Animals` : `🏠 Enclosures`}
          </button>
        ))}
      </div>

      {/* ── ANIMALS TAB ── */}
      {pageTab === 'animals' && (
        <>
          {urgentAnimals.length > 0 && (
            <div className="mb-4">
              <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
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
        </>
      )}

      {/* ── ENCLOSURES TAB ── */}
      {pageTab === 'enclosures' && (
        <div className="flex flex-col gap-3">
          {enclosuresLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="rounded-xl h-32 animate-pulse" style={{ backgroundColor: '#242420' }} />
              ))}
            </div>
          ) : enclosures.length === 0 ? (
            <EmptyState
              icon="🏠"
              title="No enclosures yet"
              description="Create enclosures to group animals and batch feed them together"
              action={<Button onClick={openAddEnclosure}>Add your first enclosure</Button>}
            />
          ) : (
            enclosures.map((enc) => {
              const encAnimals = animals.filter(a => a.enclosure_id === enc.id)
              return (
                <div
                  key={enc.id}
                  className="rounded-xl p-4"
                  style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>
                        {enc.name}
                      </h3>
                      {enc.enclosure_type && (
                        <p className="text-xs mt-0.5" style={{ color: '#6a6458' }}>{enc.enclosure_type}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0 ml-3">
                      <button
                        onClick={() => openEditEnclosure(enc)}
                        className="text-xs px-2.5 py-1 rounded-lg"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#a8a090' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEnclosure(enc)}
                        className="text-xs px-2.5 py-1 rounded-lg"
                        style={{ backgroundColor: 'rgba(196,90,90,0.1)', color: '#c45a5a' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {encAnimals.length > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {encAnimals.map(a => (
                          <Link
                            key={a.id}
                            to={`/animals/${a.id}`}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-opacity hover:opacity-80"
                            style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#f0ece0' }}
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: getAnimalFeedingColor(a) }}
                            />
                            {a.name}
                          </Link>
                        ))}
                      </div>
                      <button
                        onClick={() => openBatchFeed(enc)}
                        className="w-full rounded-xl py-2 text-sm font-medium transition-opacity hover:opacity-80"
                        style={{ backgroundColor: 'rgba(143,190,90,0.1)', color: '#8fbe5a', border: '1px solid rgba(143,190,90,0.2)' }}
                      >
                        Feed all {encAnimals.length} animal{encAnimals.length !== 1 ? 's' : ''}
                      </button>
                    </>
                  ) : (
                    <p className="text-xs mt-1" style={{ color: '#6a6458' }}>
                      No animals assigned. Edit an animal to assign it to this enclosure.
                    </p>
                  )}

                  {enc.notes && (
                    <p className="text-xs mt-3 pt-3" style={{ color: '#6a6458', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      {enc.notes}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── MODALS ── */}
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

      {/* Enclosure form modal */}
      <Modal
        open={enclosureFormOpen}
        onClose={() => setEnclosureFormOpen(false)}
        title={editingEnclosure ? 'Edit enclosure' : 'Add enclosure'}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Name *"
            value={enclosureName}
            onChange={(e) => setEnclosureName(e.target.value)}
            placeholder="e.g. Python Tank 1"
          />
          <Select
            label="Type"
            value={enclosureType}
            onChange={(e) => setEnclosureType((e.target as HTMLSelectElement).value)}
          >
            <option value="">Select type…</option>
            {ENCLOSURE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
          <Textarea
            label="Notes"
            value={enclosureNotes}
            onChange={(e) => setEnclosureNotes(e.target.value)}
            placeholder="Temperature, humidity, substrate…"
            rows={3}
          />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setEnclosureFormOpen(false)} fullWidth>
              Cancel
            </Button>
            <Button
              type="button"
              loading={enclosureSaving}
              onClick={handleSaveEnclosure}
              fullWidth
              disabled={!enclosureName.trim()}
            >
              {editingEnclosure ? 'Save changes' : 'Add enclosure'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Batch feed modal */}
      <Modal
        open={batchFeedOpen}
        onClose={() => setBatchFeedOpen(false)}
        title={`Feed all — ${batchFeedEnclosure?.name ?? ''}`}
      >
        <div className="flex flex-col gap-4">
          {batchFeedEnclosure && (
            <p className="text-sm" style={{ color: '#a8a090' }}>
              Creates a feeding log for each animal in this enclosure (
              {animals.filter(a => a.enclosure_id === batchFeedEnclosure.id).length} animals).
            </p>
          )}
          <Input
            label="Date"
            type="date"
            value={batchFeedDate}
            onChange={(e) => setBatchFeedDate(e.target.value)}
          />
          <Input
            label="Prey type"
            value={batchFeedPreyType}
            onChange={(e) => setBatchFeedPreyType(e.target.value)}
            placeholder="e.g. Frozen rat"
          />
          <div className="flex gap-3">
            <Input
              label="Prey size"
              value={batchFeedPreySize}
              onChange={(e) => setBatchFeedPreySize(e.target.value)}
              placeholder="e.g. Medium"
            />
            <Input
              label="Qty per animal"
              type="number"
              min={1}
              value={batchFeedQuantity}
              onChange={(e) => setBatchFeedQuantity(e.target.value)}
              placeholder="1"
            />
          </div>
          <Textarea
            label="Notes"
            value={batchFeedNotes}
            onChange={(e) => setBatchFeedNotes(e.target.value)}
            placeholder="Optional notes…"
            rows={2}
          />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setBatchFeedOpen(false)} fullWidth>
              Cancel
            </Button>
            <Button type="button" loading={batchFeedLoading} onClick={handleBatchFeed} fullWidth>
              Log feeding
            </Button>
          </div>
        </div>
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
