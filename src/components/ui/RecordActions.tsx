/**
 * Edit and delete, as a pair, on a record row.
 *
 * Shared by every list on the animal detail screen — weights, sheds, health
 * events, acquisitions — which is why it left AnimalDetail when those sections
 * were extracted into their own files.
 */
export function RecordActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-1 shrink-0">
      <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ backgroundColor: 'rgba(143,190,90,0.1)', color: '#8fbe5a' }}>
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
      </button>
      <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ backgroundColor: 'rgba(196,90,90,0.1)', color: '#c45a5a' }}>
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  )
}
