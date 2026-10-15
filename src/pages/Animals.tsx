import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAnimals } from '@/hooks/useAnimals'
import { getFeedingStatus, describeNextFeeding, FEEDING_STATUS_META, FEEDING_URGENCY } from '@/lib/feedingStatus'
import { inQuarantine } from '@/lib/animalState'
import { useEnclosures } from '@/hooks/useEnclosures'
import type { Enclosure } from '@/hooks/useEnclosures'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { AnimalCard } from '@/components/animals/AnimalCard'
import { useSignedPhotoUrls } from '@/hooks/useSignedPhotoUrls'
import { AnimalForm } from '@/components/animals/AnimalForm'
import { BatchFeedForm } from '@/components/feeding/BatchFeedForm'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { LargeTitle } from '@/components/ui/LargeTitle'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ListSection, ListRow } from '@/components/ui/List'
import { Icon } from '@/components/ui/icons'
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

const CATEGORIES: { label: string; pattern: RegExp }[] = [
  { label: 'Snakes',          pattern: /python|boa|corn\s*snake|king\s*snake|milk\s*snake|rat\s*snake|hognose|blood\s*python|vine\s*snake|sand\s*boa|garter|bull\s*snake|pine\s*snake|viper|mamba|cobra|anaconda|ribbon\s*snake|\bsnake\b/ },
  { label: 'Lizards',         pattern: /gecko|bearded\s*dragon|monitor|agama|iguana|chameleon|skink|blue.tongue|anole|uromastyx|tegu|crested|frilled|savannah|ackie|fat.tail|basilisk|\blizard\b/ },
  { label: 'Turtles',         pattern: /turtle|tortoise|terrapin/ },
  { label: 'Frogs',           pattern: /frog|pacman|dart\s*frog|horned\s*frog|dumpy|whites\s*tree|bullfrog|tree\s*frog/ },
  { label: 'Amphibians',      pattern: /salamander|axolotl|newt|\btoad\b|caecilian/ },
  { label: 'Crocodilians',    pattern: /crocodile|alligator|caiman|gharial/ },
  { label: 'Invertebrates',   pattern: /tarantula|scorpion|millipede|stick\s*insect|mantis|hermit\s*crab|\bspider\b/ },
  { label: 'Mammals',         pattern: /\brat\b|\bmouse\b|\bmice\b|rabbit|degu|chinchilla|hedgehog|ferret|sugar\s*glider/ },
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
  // Signed in one call for the whole grid rather than one per card.
  const photoUrls = useSignedPhotoUrls(animals.map((a) => a.photo_url))
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
      seen.has('Other') ? [{ label: 'Other', pattern: /(?!)/ }] : []
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

  // A bar button, as in Contacts: the plus alone on a phone, labelled where
  // there is room.
  const addLabel = pageTab === 'animals' ? 'Add animal' : 'Add enclosure'
  const headerAction = (
    <button
      type="button"
      onClick={pageTab === 'animals' ? handleAddClick : openAddEnclosure}
      aria-label={addLabel}
      className="tap-target inline-flex items-center justify-center gap-1.5 w-9 h-9 sm:w-auto sm:px-3.5 rounded-full bg-tint text-on-tint text-[15px] font-semibold active:opacity-70 transition-opacity"
    >
      <Icon name="plus" size={18} strokeWidth={2.4} />
      <span className="hidden sm:inline">{addLabel}</span>
    </button>
  )

  const headerSubtitle = pageTab === 'animals'
    ? (animals.length > 0 ? `${animals.length} in your collection` : undefined)
    : (enclosures.length > 0 ? `${enclosures.length} enclosure${enclosures.length !== 1 ? 's' : ''}` : undefined)

  return (
    <div className="flex-1 px-4 lg:px-8 pt-2 md:pt-6 pb-nav md:pb-8 max-w-5xl mx-auto w-full">
      {/* With no animals the empty state below carries the add button, and a
          second identical one in the header only competed with it. */}
      <LargeTitle
        title="Animals"
        subtitle={headerSubtitle}
        trailing={pageTab === 'animals' && !loading && !error && animals.length === 0 ? undefined : headerAction}
      />

      <SegmentedControl
        label="Show"
        className="mb-4 sm:max-w-xs"
        value={pageTab}
        onChange={setPageTab}
        options={[{ value: 'animals', label: 'Animals' }, { value: 'enclosures', label: 'Enclosures' }]}
      />

      {/* ── ANIMALS TAB ── */}
      {pageTab === 'animals' && (
        <>
          {animals.length > 0 && (
            <div className="flex flex-col gap-3 mb-5">
              <div className="flex items-center gap-2">
                {/* min-w-0: an input's intrinsic width is about twenty
                    characters, and without this it refused to shrink, pushing
                    the sort and density controls off a phone screen and making
                    the whole page scroll sideways. */}
                <label className="relative flex-1 min-w-0">
                  <Icon name="search" size={17} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-label-2 pointer-events-none" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search"
                    aria-label="Search animals"
                    className="w-full min-w-0 h-9 rounded-[10px] pl-8 pr-3 text-[17px] bg-fill text-label placeholder:text-label-2 outline-none focus-visible:ring-2 focus-visible:ring-tint"
                  />
                </label>
                {/* The sort is a bar button over the native picker, so iOS
                    shows its own wheel or menu. */}
                <label
                  className="tap-target relative shrink-0 flex items-center justify-center w-9 h-9 rounded-full text-tint active:opacity-60 has-[select:focus-visible]:ring-2 has-[select:focus-visible]:ring-tint"
                  title="Sort"
                >
                  <Icon name="sort" size={20} strokeWidth={2} />
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    aria-label="Sort animals"
                    className="absolute inset-0 w-full h-full opacity-0"
                  >
                    <option value="name-asc">Name A → Z</option>
                    <option value="name-desc">Name Z → A</option>
                    <option value="overdue-first">Overdue first</option>
                    <option value="recently-fed">Recently fed</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => chooseDensity(density === 'grid' ? 'list' : 'grid')}
                  aria-label={density === 'grid' ? 'Show as list' : 'Show as photo grid'}
                  className="tap-target shrink-0 flex items-center justify-center w-9 h-9 rounded-full text-tint active:opacity-60"
                >
                  <Icon name={density === 'grid' ? 'list' : 'animal'} size={20} strokeWidth={2} />
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto -mx-4 px-4 py-0.5" style={{ scrollbarWidth: 'none' }}>
                <Chip label={`All ${animals.length}`} active={statusFilter === null} onClick={() => setStatusFilter(null)} />
                {statusCounts.overdue > 0 && (
                  <Chip label={`Overdue ${statusCounts.overdue}`} tone="var(--color-red)" active={statusFilter === 'overdue'} onClick={() => setStatusFilter(statusFilter === 'overdue' ? null : 'overdue')} />
                )}
                {statusCounts['due-soon'] > 0 && (
                  <Chip label={`Due soon ${statusCounts['due-soon']}`} tone="var(--color-orange)" active={statusFilter === 'due-soon'} onClick={() => setStatusFilter(statusFilter === 'due-soon' ? null : 'due-soon')} />
                )}
                {statusCounts.quarantine > 0 && (
                  <Chip label={`Quarantine ${statusCounts.quarantine}`} tone="var(--color-orange)" active={statusFilter === 'quarantine'} onClick={() => setStatusFilter(statusFilter === 'quarantine' ? null : 'quarantine')} />
                )}
                {presentCategories.length > 1 && (
                  <>
                    <span aria-hidden="true" className="w-px shrink-0 my-1.5 bg-separator" />
                    {presentCategories.map((c) => (
                      <Chip key={c.label} label={c.label} active={categoryFilter === c.label} onClick={() => setCategoryFilter(categoryFilter === c.label ? null : c.label)} />
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-[15px] text-red" style={{ backgroundColor: 'color-mix(in srgb, var(--color-red) 10%, transparent)' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-5">
              {Array.from({ length: 4 }).map((_, i) => <AnimalCardSkeleton key={i} />)}
            </div>
          ) : displayed.length === 0 ? (
            <EmptyState
              icon={hasActiveFilter ? 'search' : 'animal'}
              title={hasActiveFilter ? 'No animals match' : 'No animals yet'}
              description={hasActiveFilter ? 'Try adjusting your search or filter' : 'Add them one at a time, or bring an existing collection across from a spreadsheet.'}
              action={!hasActiveFilter ? (
                <div className="flex flex-col gap-1 w-full max-w-xs">
                  <Button size="lg" fullWidth onClick={handleAddClick}>Add your first animal</Button>
                  <Link to="/import" className="inline-flex items-center justify-center min-h-11 text-[17px] text-tint active:opacity-60">
                    Import a spreadsheet
                  </Link>
                </div>
              ) : undefined}
            />
          ) : density === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-5">
              {displayed.map((animal) => (
                <AnimalCard
                  key={animal.id}
                  animal={animal}
                  enclosureName={enclosures.find((e) => e.id === animal.enclosure_id)?.name}
                  photoUrl={animal.photo_url ? photoUrls.get(animal.photo_url) : null}
                />
              ))}
            </div>
          ) : (
            /* Twelve animals per screen instead of four; the whole rack legible
               at once. Same fields as the card, with the photo as a thumbnail. */
            <ListSection>
              {displayed.map((animal) => {
                const status = getFeedingStatus(animal)
                const where = enclosures.find((e) => e.id === animal.enclosure_id)?.name
                return (
                  <ListRow
                    key={animal.id}
                    to={`/animals/${animal.id}`}
                    separatorInset={68}
                    leading={<Thumb animal={animal} photoUrl={animal.photo_url ? photoUrls.get(animal.photo_url) : null} />}
                    trailing={
                      <span className="text-[15px] text-right" style={{ color: FEEDING_STATUS_META[status].color }}>
                        {describeNextFeeding(animal)}
                      </span>
                    }
                  >
                    <p className="text-[17px] text-label truncate">
                      {animal.name}
                      {inQuarantine(animal) && <span className="ml-1.5 text-[13px] text-orange">· Q</span>}
                    </p>
                    <p className="text-[13px] text-label-2 truncate">
                      {animal.species}{where ? ` · ${where}` : ''}
                    </p>
                  </ListRow>
                )
              })}
            </ListSection>
          )}
        </>
      )}

      {/* ── ENCLOSURES TAB ── */}
      {pageTab === 'enclosures' && (
        <div className="flex flex-col gap-6">
          {enclosuresLoading ? (
            <div className="flex flex-col gap-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="rounded-xl h-32 animate-pulse bg-surface" />
              ))}
            </div>
          ) : enclosures.length === 0 ? (
            <EmptyState
              icon="home"
              title="No enclosures yet"
              description="Create enclosures to group animals and batch feed them together"
              action={<Button size="lg" onClick={openAddEnclosure}>Add your first enclosure</Button>}
            />
          ) : (
            enclosures.map((enc) => {
              const encAnimals = animals.filter(a => a.enclosure_id === enc.id)
              return (
                <ListSection
                  key={enc.id}
                  prominent
                  header={enc.name}
                  action={
                    <div className="flex gap-4 shrink-0">
                      <button onClick={() => openEditEnclosure(enc)} className="tap-target text-[15px] text-tint active:opacity-60">Edit</button>
                      <button onClick={() => handleDeleteEnclosure(enc)} className="tap-target text-[15px] text-red active:opacity-60">Delete</button>
                    </div>
                  }
                  footer={enc.notes || undefined}
                >
                  {encAnimals.length > 0 ? (
                    <>
                      {encAnimals.map(a => (
                        <ListRow
                          key={a.id}
                          to={`/animals/${a.id}`}
                          trailing={<span className="text-[15px]" style={{ color: getAnimalFeedingColor(a) }}>{describeNextFeeding(a)}</span>}
                        >
                          <span className="text-[17px] text-label truncate block">{a.name}</span>
                        </ListRow>
                      ))}
                      <ListRow onClick={() => openBatchFeed(enc)}>
                        <span className="text-[17px] text-tint">Feed all {encAnimals.length} animal{encAnimals.length !== 1 ? 's' : ''}</span>
                      </ListRow>
                    </>
                  ) : (
                    <ListRow>
                      <span className="text-[15px] text-label-2">No animals assigned. Edit an animal to assign it to this enclosure.</span>
                    </ListRow>
                  )}
                </ListSection>
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

/** A filter capsule: gray when off, filled with its colour when on. */
function Chip({ label, active, onClick, tone }: { label: string; active: boolean; onClick: () => void; tone?: string }) {
  const accent = tone ?? 'var(--color-tint)'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="tap-target shrink-0 h-8 px-3.5 rounded-full text-[15px] font-medium whitespace-nowrap transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.96] motion-reduce:active:scale-100"
      style={{
        backgroundColor: active ? accent : 'var(--color-fill)',
        color: active ? 'var(--color-on-tint)' : (tone ?? 'var(--color-label)'),
      }}
    >
      {label}
    </button>
  )
}

/** A 40pt rounded photo, or the initial on gray, for the list rows. */
function Thumb({ animal, photoUrl }: { animal: Animal; photoUrl?: string | null }) {
  if (photoUrl) return <img src={photoUrl} alt="" loading="lazy" decoding="async" className="w-10 h-10 rounded-lg object-cover block" />
  const initial = Array.from(animal.name.trim())[0]?.toUpperCase() ?? '?'
  return (
    <span aria-hidden="true" className="w-10 h-10 rounded-lg bg-fill text-label-2 text-[17px] font-semibold flex items-center justify-center">
      {initial}
    </span>
  )
}
