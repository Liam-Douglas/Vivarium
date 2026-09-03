import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAnimals } from '@/hooks/useAnimals'
import { getFeedingStatus, describeNextFeeding, FEEDING_STATUS_META, FEEDING_URGENCY } from '@/lib/feedingStatus'
import { useEnclosures } from '@/hooks/useEnclosures'
import type { Enclosure } from '@/hooks/useEnclosures'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { AnimalCard } from '@/components/animals/AnimalCard'
import { AnimalForm } from '@/components/animals/AnimalForm'
import { BatchFeedForm } from '@/components/feeding/BatchFeedForm'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Header } from '@/components/layout/Header'
import { EmptyState } from '@/components/ui/EmptyState'
import { AnimalCardSkeleton } from '@/components/ui/LoadingSkeleton'
import { UpgradeModal } from '@/components/upgrade/UpgradeModal'
import { useToast } from '@/components/ui/Toast'
import { createEnclosure, updateEnclosure, deleteEnclosure } from '@/lib/queries'
import type { Animal } from '@/hooks/useAnimals'

type SortKey = 'name-asc' | 'name-desc' | 'overdue-first' | 'recently-fed'
type PageTab = 'animals' | 'enclosures'
type StatusFilter = 'overdue' | 'due-soon' | 'quarantine' | null
type Density = 'grid' | 'list'

const DENSITY_KEY = 'vivarium-animals-density'

function inQuarantine(animal: Animal): boolean {
  return Boolean(animal.quarantine_started_at) && !animal.quarantine_ended_at
}

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
  return FEEDING_URGENCY[getFeedingStatus(animal)]
}

function getAnimalFeedingColor(animal: Animal): string {
  return FEEDING_STATUS_META[getFeedingStatus(animal)].color
}

export function Animals() {
  const { data: animals, loading, error, refresh } = useAnimals()
  const { data: enclosures, loading: enclosuresLoading, refresh: refreshEnclosures } = useEnclosures()
  const { canAddAnimal, user } = useAuth()
  const { householdId } = useHousehold()
  const { showToast } = useToast()

  // Page tab
  const [pageTab, setPageTab] = useState<PageTab>('animals')

  // Animals tab state
  const [addOpen, setAddOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('name-asc')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null)
  // The photo grid is the nicer way to enjoy a collection; the list is the way
  // to work one. Remembered per device.
  const [density, setDensity] = useState<Density>(() => {
    try { return localStorage.getItem(DENSITY_KEY) === 'list' ? 'list' : 'grid' } catch { return 'grid' }
  })

  function chooseDensity(next: Density) {
    setDensity(next)
    try { localStorage.setItem(DENSITY_KEY, next) } catch { /* private mode */ }
  }

  // Enclosure form state
  const [enclosureFormOpen, setEnclosureFormOpen] = useState(false)
  const [editingEnclosure, setEditingEnclosure] = useState<Enclosure | null>(null)
  const [enclosureName, setEnclosureName] = useState('')
  const [enclosureNotes, setEnclosureNotes] = useState('')
  const [enclosureSaving, setEnclosureSaving] = useState(false)

  // Batch feed state
  const [batchFeedEnclosure, setBatchFeedEnclosure] = useState<Enclosure | null>(null)
  const [batchFeedOpen, setBatchFeedOpen] = useState(false)

  // You can sort by overdue today but not filter to it, and quarantine is
  // invisible unless you happen to spot a badge.
  const statusCounts = useMemo(() => ({
    overdue: animals.filter((a) => getFeedingStatus(a) === 'overdue').length,
    'due-soon': animals.filter((a) => getFeedingStatus(a) === 'due-soon').length,
    quarantine: animals.filter(inQuarantine).length,
  }), [animals])

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
      const matchesStatus =
        !statusFilter ||
        (statusFilter === 'quarantine' ? inQuarantine(a) : getFeedingStatus(a) === statusFilter)
      return matchesSearch && matchesCategory && matchesStatus
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
  }, [animals, search, categoryFilter, statusFilter, sort])

  function handleAddClick() {
    if (!canAddAnimal(animals.length)) setUpgradeOpen(true)
    else setAddOpen(true)
  }

  function openAddEnclosure() {
    setEditingEnclosure(null)
    setEnclosureName('')
    setEnclosureNotes('')
    setEnclosureFormOpen(true)
  }

  function openEditEnclosure(enc: Enclosure) {
    setEditingEnclosure(enc)
    setEnclosureName(enc.name)
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
          notes: enclosureNotes || null,
        })
        showToast('Enclosure updated', 'success')
      } else {
        await createEnclosure({
          household_id: householdId,
          user_id: user.id,
          name: enclosureName.trim(),
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
    // BatchFeedForm holds its own field state and the modal unmounts it on
    // close, so each open starts clean without resetting anything here.
    setBatchFeedEnclosure(enc)
    setBatchFeedOpen(true)
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
                <div className="flex gap-0.5 p-0.5 rounded-xl shrink-0" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {(['grid', 'list'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => chooseDensity(mode)}
                      aria-label={mode === 'grid' ? 'Photo grid' : 'Compact list'}
                      aria-pressed={density === mode}
                      className="flex items-center justify-center w-9 rounded-[10px] transition-colors"
                      style={{ backgroundColor: density === mode ? '#2e2e2a' : 'transparent', color: density === mode ? '#8fbe5a' : '#6a6458' }}
                    >
                      {mode === 'grid' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" /></svg>
                      ) : (
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
                <Chip label={`All ${animals.length}`} active={statusFilter === null} onClick={() => setStatusFilter(null)} />
                {statusCounts.overdue > 0 && (
                  <Chip label={`Overdue ${statusCounts.overdue}`} tone="#c45a5a" active={statusFilter === 'overdue'} onClick={() => setStatusFilter(statusFilter === 'overdue' ? null : 'overdue')} />
                )}
                {statusCounts['due-soon'] > 0 && (
                  <Chip label={`Due soon ${statusCounts['due-soon']}`} tone="#d4924a" active={statusFilter === 'due-soon'} onClick={() => setStatusFilter(statusFilter === 'due-soon' ? null : 'due-soon')} />
                )}
                {statusCounts.quarantine > 0 && (
                  <Chip label={`Quarantine ${statusCounts.quarantine}`} tone="#d4924a" active={statusFilter === 'quarantine'} onClick={() => setStatusFilter(statusFilter === 'quarantine' ? null : 'quarantine')} />
                )}
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
          ) : density === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {displayed.map((animal) => (
                <AnimalCard
                  key={animal.id}
                  animal={animal}
                  enclosureName={enclosures.find((e) => e.id === animal.enclosure_id)?.name}
                />
              ))}
            </div>
          ) : (
            /* Twelve animals per screen instead of four; the whole rack legible
               at once. Same fields as the card, minus the photo. */
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
              {displayed.map((animal, i) => {
                const status = getFeedingStatus(animal)
                const where = enclosures.find((e) => e.id === animal.enclosure_id)?.name
                return (
                  <Link
                    key={animal.id}
                    to={`/animals/${animal.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: i < displayed.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: FEEDING_STATUS_META[status].color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#f0ece0' }}>
                        {animal.name}
                        {inQuarantine(animal) && (
                          <span className="ml-1.5 text-xs" style={{ color: '#d4924a' }}>· Q</span>
                        )}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: '#6a6458' }}>
                        {animal.species}{where ? ` · ${where}` : ''}
                      </p>
                    </div>
                    <span className="text-xs shrink-0 text-right" style={{ color: FEEDING_STATUS_META[status].color }}>
                      {describeNextFeeding(animal)}
                    </span>
                  </Link>
                )
              })}
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
        <BatchFeedForm
          animals={animals.filter((a) => a.enclosure_id === batchFeedEnclosure?.id)}
          onSuccess={() => { setBatchFeedOpen(false); refresh() }}
          onCancel={() => setBatchFeedOpen(false)}
        />
      </Modal>
    </div>
  )
}

function Chip({ label, icon, active, onClick, tone }: { label: string; icon?: string; active: boolean; onClick: () => void; tone?: string }) {
  const accent = tone ?? '#8fbe5a'
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0"
      style={{
        backgroundColor: active ? `${accent}26` : '#242420',
        color: active ? accent : tone ?? '#a8a090',
        border: `1px solid ${active ? `${accent}59` : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  )
}
