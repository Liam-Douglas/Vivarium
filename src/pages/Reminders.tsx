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

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-xs font-semibold tracking-wider mb-1" style={{ color: '#9f9684' }}>{title.toUpperCase()}</h2>
      {subtitle && <p className="text-xs mb-2.5" style={{ color: '#9f9684' }}>{subtitle}</p>}
      <div className={subtitle ? '' : 'mt-2.5'}>{children}</div>
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
    <div
      className="rounded-xl p-3.5 flex items-center gap-3"
      style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${meta.color}` }}
    >
      <div className="flex-1 min-w-0">
        <Link to={`/animals/${animal.id}`} className="text-sm font-medium" style={{ color: '#f0ece0' }}>
          {animal.name}
        </Link>
        <p className="text-xs mt-0.5" style={{ color: meta.color }}>{describeNextFeeding(animal)}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          type="number"
          min={1}
          value={value}
          disabled={saving}
          aria-label={`Feeding frequency in days for ${animal.name}`}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          className="w-16 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:border-[#8fbe5a]"
          style={{ backgroundColor: '#1a1a18', border: '1px solid rgba(255,255,255,0.1)', color: '#f0ece0' }}
        />
        <span className="text-xs" style={{ color: '#9f9684' }}>days</span>
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
    <div className="flex-1 px-4 py-6 pb-24 md:pb-8 max-w-3xl mx-auto w-full">
      <Header
        title="Reminders"
        action={<Button size="sm" onClick={() => { setEditingTask(null); setFormOpen(true) }}>Add reminder</Button>}
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
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#8fbe5a', borderTopColor: 'transparent' }} />
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon="🧽"
            title="No care reminders yet"
            description="Add one for cage cleaning, weigh-ins, water changes — anything on a repeat."
            action={<Button onClick={() => { setEditingTask(null); setFormOpen(true) }}>Add the first one</Button>}
          />
        ) : (
          <>
            {tasksState === 'stale' && (
              <LoadError inline subject="reminders" message={tasksError} onRetry={refreshTasks} />
            )}
            <div className="flex flex-col gap-2">
              {sortedTasks.map((task) => {
                const status = getCareStatus(task)
                const meta = CARE_STATUS_META[status]
                const busy = busyTaskId === task.id
                return (
                  <div
                    key={task.id}
                    className="rounded-xl p-3.5 flex items-center gap-3"
                    style={{
                      backgroundColor: '#242420',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderLeft: `3px solid ${meta.color}`,
                      opacity: task.is_active ? 1 : 0.55,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => { setEditingTask(task); setFormOpen(true) }}
                      className="flex-1 min-w-0 text-left"
                      aria-label={`Edit reminder: ${task.name}`}
                    >
                      <p className="text-sm font-medium truncate" style={{ color: '#f0ece0' }}>{task.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#a8a090' }}>
                        {targetLabel(task)} · every {task.frequency_days} day{task.frequency_days === 1 ? '' : 's'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: meta.color }}>{describeNextCare(task)}</p>
                    </button>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {/* A paused task is one the keeper asked not to be
                          reminded about; offering a bright action on a dimmed
                          row asks them to act on it anyway. */}
                      {task.is_active && (
                        <Button size="sm" onClick={() => handleMarkDone(task)} loading={busy} disabled={busy}>
                          Done
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleTogglePaused(task)}
                        className="text-xs underline"
                        style={{ color: '#9f9684' }}
                      >
                        {task.is_active ? 'Pause' : 'Resume'}
                      </button>
                    </div>
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
          <p className="text-sm" style={{ color: '#9f9684' }}>No animals yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
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
          <div className="flex flex-col gap-2">
            {activeMedSchedules.map((schedule) => (
              <Link
                key={schedule.id}
                to={`/animals/${schedule.animal_id}`}
                className="rounded-xl p-3.5 flex items-center gap-3"
                style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#f0ece0' }}>{schedule.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#a8a090' }}>
                    {animalName.get(schedule.animal_id) ?? 'Unknown animal'}
                    {schedule.frequency_days ? ` · every ${schedule.frequency_days} day${schedule.frequency_days === 1 ? '' : 's'}` : ''}
                  </p>
                </div>
                <span className="text-xs shrink-0" style={{ color: '#9f9684' }}>View →</span>
              </Link>
            ))}
          </div>
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
              className="text-sm py-2 rounded-xl transition-colors hover:bg-white/5"
              style={{ color: '#c45a5a' }}
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
