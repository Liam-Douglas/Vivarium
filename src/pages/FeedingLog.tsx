import { useState } from 'react'
import { useFeedingLogs } from '@/hooks/useFeedingLogs'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FeedingLogForm } from '@/components/feeding/FeedingLogForm'
import { EmptyState } from '@/components/ui/EmptyState'
import { format } from 'date-fns'

export function FeedingLog() {
  const { data: logs, loading, refresh } = useFeedingLogs()
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="flex-1 px-4 py-6 pb-24 md:pb-8 max-w-3xl mx-auto w-full">
      <Header
        title="Feeding Log"
        action={<Button size="sm" onClick={() => setAddOpen(true)}>Log feeding</Button>}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#8fbe5a', borderTopColor: 'transparent' }} />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon="🍽️"
          title="No feedings logged yet"
          description="Tap to log one"
          action={<Button onClick={() => setAddOpen(true)}>Log first feeding</Button>}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map((log) => {
            const a = log.animals as { name: string } | null
            return (
              <div
                key={log.id}
                className="rounded-xl p-4 flex items-center gap-3"
                style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: log.refused ? '#c45a5a' : '#5a9e6a' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: '#f0ece0' }}>
                    {a?.name ?? 'Unknown'} — {log.refused ? 'Refused' : `${log.prey_type}${log.prey_size ? ` (${log.prey_size})` : ''} ×${log.quantity}`}
                  </p>
                  {log.notes && <p className="text-xs mt-0.5 truncate" style={{ color: '#6a6458' }}>{log.notes}</p>}
                </div>
                <p className="text-xs shrink-0" style={{ color: '#6a6458' }}>{format(new Date(log.fed_at), 'MMM d')}</p>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Log feeding">
        <FeedingLogForm
          onSuccess={() => { setAddOpen(false); refresh() }}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>
    </div>
  )
}
