import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { parseISO, parse, isValid } from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { useToast } from '@/components/ui/Toast'
import { batchInsertAnimals, batchInsertFeedingLogs, batchInsertSheddingLogs, getAllAnimalsForMatching } from '@/lib/queries'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'

type Step = 1 | 2 | 3 | 4

interface ParsedRow {
  [key: string]: string
}

interface ImportData {
  animals: Record<string, unknown>[]
  feedingLogs: Record<string, unknown>[]
  sheddingLogs: Record<string, unknown>[]
}

function parseDate(raw: string): string | null {
  if (!raw) return null
  const formats = ['yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'd/M/yyyy']
  const trimmed = raw.trim()
  try {
    const iso = parseISO(trimmed)
    if (isValid(iso)) return iso.toISOString()
  } catch {}
  for (const fmt of formats) {
    try {
      const d = parse(trimmed, fmt, new Date())
      if (isValid(d)) return d.toISOString()
    } catch {}
  }
  return null
}

interface MatchCandidate {
  importName: string
  existing: { id: string; name: string; species: string }
}

export function Import() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { householdId } = useHousehold()
  const { showToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>(1)
  const [allAnimals, setAllAnimals] = useState<{ id: string; name: string; species: string }[]>([])
  const [fileName, setFileName] = useState('')
  const [sheets, setSheets] = useState<{ name: string; rows: ParsedRow[] }[]>([])
  const [importData, setImportData] = useState<ImportData>({ animals: [], feedingLogs: [], sheddingLogs: [] })
  // decisions keyed by lowercased import name; default is 'merge' when unset
  const [matchDecisions, setMatchDecisions] = useState<Record<string, 'merge' | 'new'>>({})
  // manual links for unmatched animals: key = lowercased import name, value = existing animal id or '' (import as new)
  const [manualLinks, setManualLinks] = useState<Record<string, string>>({})
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ animals: number; feedings: number; sheds: number; skipped: number } | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // Load all animals (active + inactive) once for matching
  useEffect(() => {
    if (!householdId) return
    getAllAnimalsForMatching(householdId).then(setAllAnimals).catch(() => {})
  }, [householdId])

  // Computed reactively so it updates once allAnimals loads
  const matchCandidates: MatchCandidate[] = importData.animals
    .map((a) => {
      const importName = (a.name as string).trim()
      const existing = allAnimals.find(
        (e) => e.name.trim().toLowerCase() === importName.toLowerCase()
      )
      return existing ? { importName, existing } : null
    })
    .filter(Boolean) as MatchCandidate[]

  function getDecision(importName: string): 'merge' | 'new' {
    return matchDecisions[importName.toLowerCase()] ?? 'merge'
  }

  // Import animals that didn't auto-match any existing animal
  const unmatchedAnimals = importData.animals.filter(
    (a) => !matchCandidates.some(
      (m) => m.importName.toLowerCase() === (a.name as string).toLowerCase()
    )
  )

  function downloadTemplate() {
    const wb = XLSX.utils.book_new()

    const animals = XLSX.utils.aoa_to_sheet([
      ['Name *', 'Species *', 'Morph', 'Sex', 'Date of birth', 'Feeding frequency', 'Notes'],
      ['Monty', 'Ball Python', 'Pastel', 'Male', '2022-01-15', '7', 'Example row — delete before importing'],
    ])
    XLSX.utils.book_append_sheet(wb, animals, 'Animals')

    const feeding = XLSX.utils.aoa_to_sheet([
      ['Animal name *', 'Date *', 'Prey type *', 'Prey size', 'Quantity', 'Refused', 'Notes'],
      ['Monty', '2024-03-01', 'Mouse', 'Small', '1', 'false', ''],
    ])
    XLSX.utils.book_append_sheet(wb, feeding, 'Feeding logs')

    const shedding = XLSX.utils.aoa_to_sheet([
      ['Animal name *', 'Date *', 'Complete', 'Notes'],
      ['Monty', '2024-02-15', 'true', ''],
    ])
    XLSX.utils.book_append_sheet(wb, shedding, 'Shedding logs')

    const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'vivarium_import_template.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFile(file: File) {
    setFileName(file.name)
    setProcessing(true)
    setDragOver(false)
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array', cellDates: true })
      const parsed = wb.SheetNames.map((name) => {
        const ws = wb.Sheets[name]
        const rows = XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: '', raw: false })
        return { name, rows }
      })
      setSheets(parsed)
      autoMap(parsed)
      setProcessing(false)
      setStep(2)
    }
    reader.readAsArrayBuffer(file)
  }

  function autoMap(parsedSheets: { name: string; rows: ParsedRow[] }[]) {
    if (!user || !householdId) return

    const animals: Record<string, unknown>[] = []
    const feedingLogs: Record<string, unknown>[] = []
    const sheddingLogs: Record<string, unknown>[] = []

    for (const sheet of parsedSheets) {
      const lc = sheet.name.toLowerCase()
      if (lc.includes('animal')) {
        sheet.rows.forEach((row) => {
          const name = row['Name *'] || row['Name'] || row['name']
          const species = row['Species *'] || row['Species'] || row['species']
          if (!name || !species) return
          animals.push({
            household_id: householdId,
            user_id: user.id,
            name: name.trim(),
            species: species.trim(),
            morph: row['Morph'] || row['morph'] || null,
            sex: (row['Sex'] || row['sex'] || '').toLowerCase() || null,
            date_of_birth: row['Date of birth'] ? parseDate(row['Date of birth']) : null,
            feeding_frequency_days: row['Feeding frequency'] ? Number(row['Feeding frequency']) || null : null,
            notes: row['Notes'] || row['notes'] || null,
            is_active: true,
          })
        })
      } else if (lc.includes('feed')) {
        sheet.rows.forEach((row) => {
          const animalName = row['Animal name *'] || row['Animal'] || row['animal']
          const dateRaw = row['Date *'] || row['Date'] || row['date']
          const preyType = row['Prey type *'] || row['Prey type'] || row['prey_type']
          if (!animalName || !dateRaw || !preyType) return
          const fed_at = parseDate(dateRaw)
          if (!fed_at) return
          feedingLogs.push({
            household_id: householdId,
            user_id: user.id,
            animal_name: animalName.trim(),
            fed_at,
            prey_type: preyType.trim(),
            prey_size: row['Prey size'] || row['prey_size'] || null,
            quantity: Number(row['Quantity'] || row['quantity'] || '1') || 1,
            refused: ['true', 'yes', '1'].includes((row['Refused'] || '').toLowerCase()),
            notes: row['Notes'] || row['notes'] || null,
          })
        })
      } else if (lc.includes('shed')) {
        sheet.rows.forEach((row) => {
          const animalName = row['Animal name *'] || row['Animal'] || row['animal']
          const dateRaw = row['Date *'] || row['Date'] || row['date']
          if (!animalName || !dateRaw) return
          const shed_at = parseDate(dateRaw)
          if (!shed_at) return
          sheddingLogs.push({
            household_id: householdId,
            user_id: user.id,
            animal_name: animalName.trim(),
            shed_at,
            complete: !['false', 'no', '0'].includes((row['Complete'] || '').toLowerCase()),
            notes: row['Notes'] || row['notes'] || null,
          })
        })
      }
    }

    setImportData({ animals, feedingLogs, sheddingLogs })
    setMatchDecisions({})
  }

  async function handleImport() {
    if (!householdId || !user) {
      showToast('Not connected to a collection', 'error')
      return
    }
    setImporting(true)
    setImportError(null)
    setStep(4)
    setProgress(0)

    let skipped = 0
    let animalsInserted = 0
    let feedingsInserted = 0
    let shedsInserted = 0

    try {
      // Pre-populate map: auto-merged + manually linked animals
      const animalMap = new Map<string, string>()

      // Auto-matched merges
      matchCandidates
        .filter((m) => getDecision(m.importName) === 'merge')
        .forEach((m) => {
          animalMap.set(m.importName.trim().toLowerCase(), m.existing.id)
          animalMap.set(m.existing.name.trim().toLowerCase(), m.existing.id)
        })

      // Manual links
      for (const [key, existingId] of Object.entries(manualLinks)) {
        if (existingId) animalMap.set(key, existingId)
      }

      // Names to skip inserting (merged or manually linked to existing)
      const skipInsertNames = new Set([
        ...matchCandidates.filter((m) => getDecision(m.importName) === 'merge').map((m) => m.importName.trim().toLowerCase()),
        ...Object.entries(manualLinks).filter(([, v]) => v).map(([k]) => k),
      ])

      const animalsToInsert = importData.animals.filter(
        (a) => !skipInsertNames.has((a.name as string).trim().toLowerCase())
      )

      if (animalsToInsert.length > 0) {
        animalsInserted = await batchInsertAnimals(animalsToInsert)
        setProgress(33)
      }

      // Fetch all animals from DB and add to map (catches newly inserted + any name variants)
      const { data: dbAnimals } = await supabase.from('animals').select('id, name').eq('household_id', householdId)
      dbAnimals?.forEach((a) => animalMap.set(a.name.trim().toLowerCase(), a.id))

      // Insert feedings
      const feedingsToInsert = importData.feedingLogs
        .map((log) => {
          const name = (log.animal_name as string).trim().toLowerCase()
          const animal_id = animalMap.get(name)
          if (!animal_id) { skipped++; return null }
          const { animal_name: _, ...rest } = log
          return { ...rest, animal_id }
        })
        .filter(Boolean) as Record<string, unknown>[]

      if (feedingsToInsert.length > 0) {
        feedingsInserted = await batchInsertFeedingLogs(feedingsToInsert)
        setProgress(66)
      }

      // Insert sheds
      const shedsToInsert = importData.sheddingLogs
        .map((log) => {
          const name = (log.animal_name as string).trim().toLowerCase()
          const animal_id = animalMap.get(name)
          if (!animal_id) { skipped++; return null }
          const { animal_name: _, ...rest } = log
          return { ...rest, animal_id }
        })
        .filter(Boolean) as Record<string, unknown>[]

      if (shedsToInsert.length > 0) {
        shedsInserted = await batchInsertSheddingLogs(shedsToInsert)
      }

      setProgress(100)
      setResult({ animals: animalsInserted, feedings: feedingsInserted, sheds: shedsInserted, skipped })
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Import failed'
      setImportError(msg)
      setImporting(false)
    }
  }

  return (
    <div className="flex-1 px-4 py-6 pb-24 md:pb-8 max-w-2xl mx-auto w-full">
      <Header title="Import Data" />

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{
                backgroundColor: step >= s ? '#8fbe5a' : 'rgba(255,255,255,0.06)',
                color: step >= s ? '#1a1a18' : '#6a6458',
              }}
            >
              {s}
            </div>
            {s < 4 && <div className="flex-1 h-px w-8" style={{ backgroundColor: step > s ? '#8fbe5a' : 'rgba(255,255,255,0.06)' }} />}
          </div>
        ))}
        <div className="ml-2 text-xs" style={{ color: '#6a6458' }}>
          {['Upload', 'Map', 'Preview', 'Result'][step - 1]}
        </div>
      </div>

      {step === 1 && (
        <div>
          <div
            className="rounded-2xl p-10 text-center cursor-pointer mb-4 transition-all duration-150"
            style={{
              border: `2px dashed ${dragOver ? '#8fbe5a' : 'rgba(255,255,255,0.1)'}`,
              backgroundColor: dragOver ? 'rgba(143,190,90,0.06)' : '#242420',
            }}
            onClick={() => !processing && fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files[0]
              if (file) handleFile(file)
            }}
          >
            {processing ? (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#8fbe5a', borderTopColor: 'transparent' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: '#f0ece0' }}>Reading {fileName}…</p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-3">{dragOver ? '📂' : '📁'}</div>
                <p className="text-sm font-medium mb-1" style={{ color: '#f0ece0' }}>
                  {dragOver ? 'Drop to upload' : 'Drop your file here or tap to browse'}
                </p>
                <p className="text-xs" style={{ color: '#6a6458' }}>Supports .csv and .xlsx</p>
              </>
            )}
            <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>
          <div className="text-center">
            <button onClick={downloadTemplate} className="text-sm" style={{ color: '#8fbe5a', background: 'none', border: 'none', cursor: 'pointer' }}>
              Download import template
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          {/* File badge */}
          <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(143,190,90,0.08)', border: '1px solid rgba(143,190,90,0.2)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(143,190,90,0.15)' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#8fbe5a" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#f0ece0' }}>{fileName}</p>
              <p className="text-xs" style={{ color: '#8fbe5a' }}>{sheets.length} sheet{sheets.length !== 1 ? 's' : ''} detected</p>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: '🦎', label: 'Animals', count: importData.animals.length },
              { icon: '🍖', label: 'Feedings', count: importData.feedingLogs.length },
              { icon: '🐍', label: 'Sheds', count: importData.sheddingLogs.length },
            ].map(({ icon, label, count }) => (
              <div key={label} className="rounded-xl p-4 text-center" style={{ backgroundColor: '#242420', border: `1px solid ${count > 0 ? 'rgba(143,190,90,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                <div className="text-2xl mb-1">{icon}</div>
                <p className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: count > 0 ? '#8fbe5a' : '#6a6458' }}>{count}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6a6458' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Match candidates */}
          {matchCandidates.length > 0 && (
            <div className="rounded-xl overflow-hidden mb-6" style={{ backgroundColor: '#242420', border: '1px solid rgba(212,146,74,0.3)' }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(212,146,74,0.08)' }}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#d4924a" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                <p className="text-xs font-medium" style={{ color: '#d4924a' }}>
                  {matchCandidates.length} animal{matchCandidates.length !== 1 ? 's' : ''} already exist in your collection
                </p>
              </div>
              {matchCandidates.map((m) => {
                const decision = getDecision(m.importName)
                return (
                  <div key={m.importName} className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-sm font-medium" style={{ color: '#f0ece0' }}>{m.importName}</span>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#6a6458" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                      <span className="text-sm" style={{ color: '#a8a090' }}>{m.existing.name} <span style={{ color: '#6a6458' }}>({m.existing.species})</span></span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setMatchDecisions((prev) => ({ ...prev, [m.importName.toLowerCase()]: 'merge' }))}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          backgroundColor: decision === 'merge' ? 'rgba(143,190,90,0.15)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${decision === 'merge' ? 'rgba(143,190,90,0.4)' : 'rgba(255,255,255,0.08)'}`,
                          color: decision === 'merge' ? '#8fbe5a' : '#6a6458',
                        }}
                      >
                        ✓ Same animal — merge logs
                      </button>
                      <button
                        onClick={() => setMatchDecisions((prev) => ({ ...prev, [m.importName.toLowerCase()]: 'new' }))}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          backgroundColor: decision === 'new' ? 'rgba(196,90,90,0.12)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${decision === 'new' ? 'rgba(196,90,90,0.3)' : 'rgba(255,255,255,0.08)'}`,
                          color: decision === 'new' ? '#c45a5a' : '#6a6458',
                        }}
                      >
                        + Import as new animal
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Unmatched animals — manual link */}
          {unmatchedAnimals.length > 0 && allAnimals.length > 0 && (
            <div className="rounded-xl overflow-hidden mb-6" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="px-4 py-2.5 text-xs font-medium" style={{ color: '#6a6458', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                No match found — link manually or import as new
              </p>
              {unmatchedAnimals.map((a, i) => {
                const key = (a.name as string).trim().toLowerCase()
                const linkedId = manualLinks[key] ?? ''
                return (
                  <div key={i} className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: i < unmatchedAnimals.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <span className="text-sm shrink-0" style={{ color: '#f0ece0' }}>{String(a.name)}</span>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#6a6458" strokeWidth={2} className="shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    <select
                      value={linkedId}
                      onChange={(e) => setManualLinks((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="flex-1 text-sm rounded-lg px-3 py-1.5 focus:outline-none"
                      style={{ backgroundColor: '#1a1a18', border: '1px solid rgba(255,255,255,0.1)', color: linkedId ? '#8fbe5a' : '#a8a090' }}
                    >
                      <option value="">Import as new animal</option>
                      {allAnimals.map((e) => (
                        <option key={e.id} value={e.id}>{e.name} ({e.species})</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          )}

          {/* Animal name preview */}
          {importData.animals.length > 0 && (
            <div className="rounded-xl overflow-hidden mb-6" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="px-4 py-2.5 text-xs font-medium" style={{ color: '#6a6458', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                Animals detected
              </p>
              {importData.animals.slice(0, 5).map((a, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center gap-3" style={{ borderBottom: i < Math.min(importData.animals.length, 5) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#8fbe5a' }} />
                  <span className="text-sm" style={{ color: '#f0ece0' }}>{String(a.name)}</span>
                  <span className="text-xs ml-auto" style={{ color: '#6a6458' }}>{String(a.species)}</span>
                </div>
              ))}
              {importData.animals.length > 5 && (
                <p className="px-4 py-2.5 text-xs" style={{ color: '#6a6458' }}>+{importData.animals.length - 5} more animals…</p>
              )}
            </div>
          )}

          {importData.animals.length === 0 && importData.feedingLogs.length === 0 && importData.sheddingLogs.length === 0 && (
            <div className="rounded-xl p-4 mb-6 text-center" style={{ backgroundColor: 'rgba(196,90,90,0.08)', border: '1px solid rgba(196,90,90,0.2)' }}>
              <p className="text-sm" style={{ color: '#c45a5a' }}>No data detected. Make sure your file matches the template format.</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)} disabled={importData.animals.length === 0 && importData.feedingLogs.length === 0 && importData.sheddingLogs.length === 0}>
              Continue to preview
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: '#f0ece0' }}>
              {importData.animals.length} animals, {importData.feedingLogs.length} feeding logs, {importData.sheddingLogs.length} shed records ready to import
            </p>
            <p className="text-xs" style={{ color: '#a8a090' }}>Feeding/shedding logs will be linked to animals by name (case-insensitive). Unmatched entries will be skipped.</p>
          </div>
          {importData.animals.length > 0 && (
            <div className="mb-4 overflow-x-auto rounded-xl" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Name', 'Species', 'Morph', 'Sex'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-medium" style={{ color: '#6a6458' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importData.animals.slice(0, 5).map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-3 py-2" style={{ color: '#f0ece0' }}>{String(row.name)}</td>
                      <td className="px-3 py-2" style={{ color: '#a8a090' }}>{String(row.species)}</td>
                      <td className="px-3 py-2" style={{ color: '#a8a090' }}>{String(row.morph ?? '')}</td>
                      <td className="px-3 py-2" style={{ color: '#a8a090' }}>{String(row.sex ?? '')}</td>
                    </tr>
                  ))}
                  {importData.animals.length > 5 && (
                    <tr><td colSpan={4} className="px-3 py-2 text-center" style={{ color: '#6a6458' }}>+{importData.animals.length - 5} more…</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={handleImport} loading={importing}>Import now</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          {importError ? (
            <div className="text-center">
              <div className="text-4xl mb-4">❌</div>
              <p className="text-lg font-semibold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>Import failed</p>
              <p className="text-sm mb-6 px-4" style={{ color: '#c45a5a' }}>{importError}</p>
              <Button variant="secondary" onClick={() => { setStep(3); setImportError(null) }}>Go back and try again</Button>
            </div>
          ) : !result ? (
            <div>
              <div className="flex justify-center mb-6">
                <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: '#8fbe5a', borderTopColor: 'transparent' }} />
              </div>
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="h-2 rounded-full" style={{ width: `${progress}%`, backgroundColor: '#8fbe5a', transition: 'width 0.5s' }} />
              </div>
              <p className="text-center text-sm mt-3" style={{ color: '#a8a090' }}>Importing… {progress}%</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-4xl mb-4">{result.skipped > 0 ? '⚠️' : '✅'}</div>
              <p className="text-lg font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>Import complete</p>
              <div className="rounded-xl p-4 mb-4 text-left" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm"><span style={{ color: '#a8a090' }}>Animals added</span><span style={{ color: '#f0ece0' }}>{result.animals}</span></div>
                  <div className="flex justify-between text-sm"><span style={{ color: '#a8a090' }}>Feeding logs</span><span style={{ color: '#f0ece0' }}>{result.feedings}</span></div>
                  <div className="flex justify-between text-sm"><span style={{ color: '#a8a090' }}>Shed records</span><span style={{ color: '#f0ece0' }}>{result.sheds}</span></div>
                  {result.skipped > 0 && (
                    <div className="flex justify-between text-sm pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: '#c45a5a' }}>Skipped (no matching animal)</span>
                      <span style={{ color: '#c45a5a' }}>{result.skipped}</span>
                    </div>
                  )}
                </div>
              </div>
              {result.skipped > 0 && (
                <p className="text-xs mb-4 px-2" style={{ color: '#a8a090' }}>
                  Some logs couldn't be linked because the animal name in the file didn't match any animal in your collection. Go back and use manual linking to fix this.
                </p>
              )}
              <div className="flex gap-2">
                {result.skipped > 0 && <Button variant="secondary" fullWidth onClick={() => { setStep(2); setResult(null) }}>Go back</Button>}
                <Button fullWidth onClick={() => navigate('/animals')}>View your animals</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
