import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAnimals, type Animal } from '@/hooks/useAnimals'
import { useCareTasks, type CareTask } from '@/hooks/useCareTasks'
import { useEnclosures } from '@/hooks/useEnclosures'
import { useMedicationSchedules } from '@/hooks/useMedicationSchedules'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { useToast } from '@/components/ui/Toast'
import {
  markCareTaskDone, deleteCareTask, updateCareTask, updateAnimal,
} from '@/lib/queries'
import {
  getCareStatus, describeNextCare, CARE_STATUS_META, CARE_URGENCY,
} from '@/lib/careStatus'
import { describeNextFeeding, getFeedingStatus, FEEDING_STATUS_META, FEEDING_URGENCY } from '@/lib/feedingStatus'
import { loadState } from '@/lib/loadState'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadError } from '@/components/ui/LoadError'
import { CareTaskForm } from '@/components/reminders/CareTaskForm'
import { ListSection, ListRow } from '@/components/ui/List'
import { Icon, IconTile } from '@/components/ui/icons'

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-[20px] leading-[25px] font-bold text-label px-1">{title}</h2>
      {subtitle && <p className="text-[15px] text-label-2 px-1 mt-0.5">{subtitle}</p>}
      <div className="mt-2.5">{children}</div>
    </section>
  )
}

/**
 * One animal's feeding cadence, editable in place.
 *
 * Changing this today means opening the animal, opening its edit form, changing
 * a number and saving — per animal. The cadence a keeper most often adjusts in
 * bulk was the one buried deepest.
 */
function FeedingCadenceRow({ animal, onSaved }: { animal: Animal; onSaved: () => void }) {
  const { showToast } = useToast()
  const [value, setValue] = useState(String(animal.feeding_frequency_days ?? ''))
  const [saving, setSaving] = useState(false)

  const status = getFeedingStatus(animal)
  const meta = FEEDING_STATUS_META[status]

  async function commit() {
    const current = animal.feeding_frequency_days ?? null
    const next = value.trim() === '' ? null : Number(value)
    if (next === current) return
    if (next !== null && (!Number.isInteger(next) || next < 1)) {
      showToast('Feeding frequency must be a whole number of days, at least 1', 'error')
      setValue(String(current ?? ''))
      return
    }
    setSaving(true)
    try {
      await updateAnimal(animal.id, { feeding_frequency_days: next })
      showToast(`${animal.name} — every ${next ?? '—'} days`, 'success')
      onSaved()
    } catch (e) {
      showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to save', 'error')
      setValue(String(current ?? ''))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="list-row list-row-leading flex items-center gap-3 px-4 py-2 min-h-11" style={{ '--sep-inset': '42px' } as React.CSSProperties}>
      <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
      <div className="flex-1 min-w-0">
        <Link to={`/animals/${animal.id}`} className="text-[17px] text-label block truncate">
          {animal.name}
        </Link>
        <p className="text-[13px]" style={{ color: meta.color }}>{describeNextFeeding(animal)}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={value}
          disabled={saving}
          aria-label={`Feeding frequency in days for ${animal.name}`}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          className="w-16 h-9 rounded-[8px] px-2.5 text-[17px] text-right tabular-nums bg-fill text-label border-0 outline-none focus-visible:ring-2 focus-visible:ring-tint disabled:opacity-50"
        />
        <span className="text-[15px] text-label-2">days</span>
      </div>
    </div>
  )
}

export function Reminders() {
  const { user } = useAuth()
  const { householdId } = useHousehold()
  const { showToast } = useToast()
  const { data: animals, loading: animalsLoading, error: animalsError, refresh: refreshAnimals } = useAnimals()
  const { data: tasks, loading: tasksLoading, error: tasksError, refresh: refreshTasks } = useCareTasks()
  const { data: enclosures } = useEnclosures()
  const { data: medSchedules } = useMedicationSchedules()

  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<CareTask | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<CareTask | null>(null)
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null)
  // A task just checked off keeps its tick for a moment after the save, so the
  // check-off is seen even when the network answers at once.
  const [justDoneId, setJustDoneId] = useState<string | null>(null)

  const animalName = useMemo(() => new Map(animals.map((a) => [a.id, a.name])), [animals])
  const enclosureName = useMemo(() => new Map(enclosures.map((e) => [e.id, e.name])), [enclosures])

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => {
      const byUrgency = CARE_URGENCY[getCareStatus(a)] - CARE_URGENCY[getCareStatus(b)]
      return byUrgency !== 0 ? byUrgency : a.name.localeCompare(b.name)
    }),
    [tasks]
  )

  const sortedAnimals = useMemo(
    () => [...animals].sort((a, b) => {
      const byUrgency = FEEDING_URGENCY[getFeedingStatus(a)] - FEEDING_URGENCY[getFeedingStatus(b)]
      return byUrgency !== 0 ? byUrgency : a.name.localeCompare(b.name)
    }),
    [animals]
  )

  const activeMedSchedules = useMemo(
    () => medSchedules.filter((s) => s.is_active),
    [medSchedules]
  )

  const tasksState = loadState({ loading: tasksLoading, error: tasksError, count: tasks.length })
  const animalsState = loadState({ loading: animalsLoading, error: animalsError, count: animals.length })

  function targetLabel(task: CareTask): string {
    if (task.animal_id) return animalName.get(task.animal_id) ?? 'Unknown animal'
    if (task.enclosure_id) return enclosureName.get(task.enclosure_id) ?? 'Unknown enclosure'
    return 'Whole collection'
  }

  async function handleMarkDone(task: CareTask) {
    if (!user || !householdId || busyTaskId) return
    setBusyTaskId(task.id)
    try {
      await markCareTaskDone({ household_id: householdId, task_id: task.id, user_id: user.id })
      setJustDoneId(task.id)
      window.setTimeout(() => setJustDoneId((id) => (id === task.id ? null : id)), 800)
      showToast(`${task.name} — done`, 'success')
      refreshTasks()
    } catch (e) {
      showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to save', 'error')
    } finally {
      setBusyTaskId(null)
    }
  }

  async function handleTogglePaused(task: CareTask) {
    if (busyTaskId) return
    setBusyTaskId(task.id)
    try {
      await updateCareTask(task.id, { is_active: !task.is_active })
      refreshTasks()
    } catch (e) {
      showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to save', 'error')
    } finally {
      setBusyTaskId(null)
    }
  }

  async function handleDelete(task: CareTask) {
    setConfirmDelete(null)
    try {
      await deleteCareTask(task.id)
      setEditingTask(null)
      refreshTasks()
      showToast('Reminder deleted', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to delete', 'error')
    }
  }

  return (
    <div className="flex-1 px-4 lg:px-8 pt-2 md:pt-6 pb-nav md:pb-8 max-w-3xl mx-auto w-full">
      <Header
        title="Reminders"
        action={
          <button
            type="button"
            onClick={() => { setEditingTask(null); setFormOpen(true) }}
            aria-label="Add reminder"
            className="tap-target inline-flex items-center justify-center gap-1.5 w-9 h-9 sm:w-auto sm:px-3.5 rounded-full bg-tint text-on-tint text-[15px] font-semibold active:opacity-70 transition-opacity"
          >
            <Icon name="plus" size={18} strokeWidth={2.4} />
            <span className="hidden sm:inline">Add reminder</span>
          </button>
        }
      />

      {/* ── Care tasks ── */}
      <Section
        title="Care"
        subtitle="Cleaning, weighing and anything else you repeat on a schedule."
      >
        {tasksState === 'error' ? (
          <LoadError subject="your reminders" message={tasksError} onRetry={refreshTasks} />
        ) : tasksState === 'loading' ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-tint)', borderTopColor: 'transparent' }} />
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon="bell"
            title="No care reminders yet"
            description="Add one for cage cleaning, weigh-ins, water changes — anything on a repeat."
            action={<Button size="lg" onClick={() => { setEditingTask(null); setFormOpen(true) }}>Add the first one</Button>}
          />
        ) : (
          <>
            {tasksState === 'stale' && (
              <LoadError inline subject="reminders" message={tasksError} onRetry={refreshTasks} />
            )}
            <div className="rounded-xl bg-surface overflow-hidden">
              {sortedTasks.map((task) => {
                const status = getCareStatus(task)
                const meta = CARE_STATUS_META[status]
                const busy = busyTaskId === task.id
                return (
                  <div
                    key={task.id}
                    className="list-row list-row-leading flex items-center gap-3 px-4 py-2.5 min-h-11"
                    style={{ '--sep-inset': '56px' } as React.CSSProperties}
                  >
                    {/* The Things check: a ring in the task's status colour that
                        marks it done. A paused task is one the keeper asked not
                        to be reminded about, so it offers no check at all. */}
                    {task.is_active ? (
                      <button
                        type="button"
                        onClick={() => handleMarkDone(task)}
                        disabled={busy}
                        aria-label={`Done: ${task.name}`}
                        className="tap-target relative w-[26px] h-[26px] rounded-full shrink-0 flex items-center justify-center transition-transform duration-150 ease-out active:scale-90 motion-reduce:active:scale-100"
                        style={{ border: `2px solid ${meta.color}` }}
                      >
                        {(busy || justDoneId === task.id) && (
                          <span className="check-pop absolute inset-[-2px] rounded-full bg-tint text-on-tint flex items-center justify-center">
                            <Icon name="check" size={15} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    ) : (
                      <span aria-hidden="true" className="w-[26px] h-[26px] rounded-full shrink-0 border-2 border-dashed border-label-3" />
                    )}

                    <button
                      type="button"
                      onClick={() => { setEditingTask(task); setFormOpen(true) }}
                      className={`flex-1 min-w-0 text-left ${task.is_active ? '' : 'opacity-55'}`}
                      aria-label={`Edit reminder: ${task.name}`}
                    >
                      <p className="text-[17px] text-label truncate">{task.name}</p>
                      <p className="text-[13px] text-label-2">
                        {targetLabel(task)} · every {task.frequency_days} day{task.frequency_days === 1 ? '' : 's'}
                      </p>
                      <p className="text-[13px]" style={{ color: meta.color }}>{describeNextCare(task)}</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePaused(task)}
                      className="tap-target shrink-0 text-[15px] text-tint active:opacity-60"
                    >
                      {task.is_active ? 'Pause' : 'Resume'}
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Section>

      {/* ── Feeding cadences ── */}
      <Section
        title="Feeding"
        subtitle="How often each animal is fed. Changing a number here is the same setting as on the animal's own page."
      >
        {animalsState === 'error' ? (
          <LoadError subject="your animals" message={animalsError} onRetry={refreshAnimals} />
        ) : animals.length === 0 ? (
          <p className="text-[15px] text-label-2 px-1">No animals yet.</p>
        ) : (
          <div className="rounded-xl bg-surface overflow-hidden">
            {sortedAnimals.map((animal) => (
              <FeedingCadenceRow key={animal.id} animal={animal} onSaved={refreshAnimals} />
            ))}
          </div>
        )}
      </Section>

      {/* ── Medication ── */}
      {activeMedSchedules.length > 0 && (
        <Section
          title="Medication"
          subtitle="Courses run from the animal's Health tab, where a start, an end and a dose position can be set properly."
        >
          <ListSection>
            {activeMedSchedules.map((schedule) => (
              <ListRow key={schedule.id} to={`/animals/${schedule.animal_id}`} leading={<IconTile name="pill" color="var(--color-purple)" />}>
                <p className="text-[17px] text-label truncate">{schedule.name}</p>
                <p className="text-[13px] text-label-2">
                  {animalName.get(schedule.animal_id) ?? 'Unknown animal'}
                  {schedule.frequency_days ? ` · every ${schedule.frequency_days} day${schedule.frequency_days === 1 ? '' : 's'}` : ''}
                </p>
              </ListRow>
            ))}
          </ListSection>
        </Section>
      )}

      <Modal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingTask(null) }}
        title={editingTask ? 'Edit reminder' : 'Add reminder'}
      >
        <div className="flex flex-col gap-4">
          <CareTaskForm
            task={editingTask}
            animals={animals}
            enclosures={enclosures}
            onSaved={() => { setFormOpen(false); setEditingTask(null); refreshTasks() }}
            onCancel={() => { setFormOpen(false); setEditingTask(null) }}
          />
          {editingTask && (
            <button
              type="button"
              onClick={() => setConfirmDelete(editingTask)}
              className="min-h-11 rounded-[10px] text-[17px] text-red bg-fill active:bg-fill-2 transition-colors"
            >
              Delete this reminder
            </button>
          )}
        </div>
      </Modal>

      {confirmDelete && (
        <ConfirmDialog
          open
          title="Delete reminder"
          message={`"${confirmDelete.name}" and its history will be permanently deleted.`}
          onConfirm={() => handleDelete(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
