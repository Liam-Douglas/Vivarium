import { useState } from 'react'
import { useAnimals } from '@/hooks/useAnimals'
import { useAuth } from '@/context/AuthContext'
import { AnimalCard } from '@/components/animals/AnimalCard'
import { AnimalForm } from '@/components/animals/AnimalForm'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Header } from '@/components/layout/Header'
import { EmptyState } from '@/components/ui/EmptyState'
import { AnimalCardSkeleton } from '@/components/ui/LoadingSkeleton'
import { UpgradeModal } from '@/components/upgrade/UpgradeModal'

export function Animals() {
  const { data: animals, loading, error, refresh } = useAnimals()
  const { canAddAnimal } = useAuth()
  const [addOpen, setAddOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [filter, setFilter] = useState('')

  function handleAddClick() {
    if (!canAddAnimal(animals.length)) {
      setUpgradeOpen(true)
    } else {
      setAddOpen(true)
    }
  }

  const filtered = animals.filter(
    (a) =>
      !filter ||
      a.name.toLowerCase().includes(filter.toLowerCase()) ||
      a.species.toLowerCase().includes(filter.toLowerCase())
  )

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

      {animals.length > 0 && (
        <div className="mb-4">
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search animals…"
            className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#8fbe5a]"
            style={{
              backgroundColor: '#242420',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#f0ece0',
            }}
          />
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
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🦎"
          title={filter ? 'No animals match your search' : 'No animals yet'}
          description={filter ? 'Try a different search term' : 'Add your first animal to get started'}
          action={!filter ? <Button onClick={handleAddClick}>Add your first animal</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((animal) => (
            <AnimalCard key={animal.id} animal={animal} />
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add animal">
        <AnimalForm onSuccess={() => { setAddOpen(false); refresh() }} onCancel={() => setAddOpen(false)} />
      </Modal>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  )
}
