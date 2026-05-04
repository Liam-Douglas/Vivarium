import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { parseISO, parse, isValid } from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { useToast } from '@/components/ui/Toast'
import { batchInsertAnimals, batchInsertFeedingLogs, batchInsertSheddingLogs, getAllAnimalsForMatching, reactivateAnimal, recalculateLastFedAt } from '@/lib/queries'
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

function parseDate(raw: unknown): string | null {
  if (!raw) return null
  if (raw instanceof Date) {
    const d = raw
    return isValid(d) ? d.toISOString() : null
  }
  if (typeof raw !== 'string') return null
  const formats = ['yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'd/M/yyyy', 'dd-MM-yyyy', 'MM-dd-yyyy']
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
  existing: { id: string; name: string; species: string; is_active: boolean }
}

export function Import({ embedded }: { embedded?: boolean }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { householdId } = useHousehold()
  const { showToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>(1)
  const [allAnimals, setAllAnimals] = useState<{ id: string; name: string; species: string; is_active: boolean }[]>([])
  const [fileName, setFileName] = useState('')
  const [sheets, setSheets] = useState<{ name: string; rows: ParsedRow[] }[]>([])
  const [importData, setImportData] = useState<ImportData>({ animals: [], feedingLogs: [], sheddingLogs: [] })
  // decisions keyed by lowercased import name; default is 'merge' when unset
  const [matchDecisions, setMatchDecisions] = useState<Record<string, 'merge' | 'new'>>({})
  // manual links for unmatched animals: key = lowercased import name, value = existing animal id or '' (import as new)
  const [manualLinks, setManualLinks] = useState<Record<string, string>>({})
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{
    animals: number
    feedings: number
    sheds: number
    shedsDetected: number
    feedingsDetected: number
    skippedFeedings: number
    skippedSheds: number
    duplicateFeedings: number
    duplicateSheds: number
    shedsInDbBefore: number
    shedsInDbAfter: number
    duplicateAnimalNames: string[]
    reactivated: number
  } | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [fixingDuplicates, setFixingDuplicates] = useState(false)

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

  function detectSheetType(rows: ParsedRow[]): 'animals' | 'feeding' | 'shedding' | null {
    if (rows.length === 0) return null
    const keys = Object.keys(rows[0]).map((k) => k.toLowerCase())
    if (keys.some((k) => k.includes('prey') || k === 'refused' || k === 'fed_at')) return 'feeding'
    if (keys.some((k) => k.includes('shed') || k === 'complete' || k === 'ecdysis')) return 'shedding'
    if (keys.some((k) => k === 'species' || k.includes('morph') || k === 'feeding frequency')) return 'animals'
    return null
  }

  function autoMap(parsedSheets: { name: string; rows: ParsedRow[] }[]) {
    if (!user || !householdId) return

    const animals: Record<string, unknown>[] = []
    const feedingLogs: Record<string, unknown>[] = []
    const sheddingLogs: Record<string, unknown>[] = []

    for (const sheet of parsedSheets) {
      const lc = sheet.name.toLowerCase()
      const sheetType = lc.includes('animal') ? 'animals'
        : lc.includes('feed') ? 'feeding'
        : lc.includes('shed') || lc.includes('moult') || lc.includes('ecdysis') ? 'shedding'
        : detectSheetType(sheet.rows)

      if (sheetType === 'animals') {
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
      } else if (sheetType === 'feeding') {
        sheet.rows.forEach((row) => {
          const animalName = row['Animal name *'] || row['Animal name'] || row['Animal'] || row['animal'] || row['Name'] || row['name']
          const dateRaw = (row['Date *'] || row['Date'] || row['Fed date'] || row['date'] || row['fed_at']) as unknown
          const preyType = row['Prey type *'] || row['Prey type'] || row['prey_type'] || row['Food'] || row['food'] || row['Prey']
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
      } else if (sheetType === 'shedding') {
        sheet.rows.forEach((row) => {
          const animalName = row['Animal name *'] || row['Animal name'] || row['Animal'] || row['animal'] || row['Name'] || row['name']
          const dateRaw = (row['Date *'] || row['Date'] || row['Shed date'] || row['Shed Date'] || row['date'] || row['shed_at']) as unknown
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

    let skippedFeedings = 0
    let skippedSheds = 0
    let duplicateFeedings = 0
    let duplicateAnimalNames: string[] = []
    let duplicateSheds = 0
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

      // Reactivate any merged animals that are currently inactive
      const inactiveMerged = matchCandidates.filter(
        (m) => getDecision(m.importName) === 'merge' && !m.existing.is_active
      )
      await Promise.all(inactiveMerged.map((m) => reactivateAnimal(m.existing.id)))

      const animalsToInsert = importData.animals.filter(
        (a) => !skipInsertNames.has((a.name as string).trim().toLowerCase())
      )

      if (animalsToInsert.length > 0) {
        animalsInserted = await batchInsertAnimals(animalsToInsert)
        setProgress(33)
      }

      // Fetch all animals from DB — only fill in gaps (newly inserted animals).
      // Never overwrite entries already set from matchCandidates/manualLinks, because
      // the DB may contain stale duplicate animals from previous failed imports, and
      // blindly overwriting would cause logs to be linked to the wrong animal ID.
      const { data: dbAnimals } = await supabase.from('animals').select('id, name').eq('household_id', householdId)
      const dbNameCounts: Record<string, number> = {}
      dbAnimals?.forEach((a) => {
        const key = a.name.trim().toLowerCase()
        dbNameCounts[key] = (dbNameCounts[key] ?? 0) + 1
        if (!animalMap.has(key)) animalMap.set(key, a.id)
      })
      duplicateAnimalNames = Object.entries(dbNameCounts)
        .filter(([, count]) => count > 1)
        .map(([name]) => name)

      // Fetch existing feeding and shedding keys to avoid duplicates
      const [existingFeedingsRes, existingShedsRes] = await Promise.all([
        supabase.from('feeding_logs').select('animal_id, fed_at, prey_type, refused').eq('household_id', householdId),
        supabase.from('shedding_logs').select('animal_id, shed_at').eq('household_id', householdId),
      ])
      const existingFeedingKeys = new Set(
        (existingFeedingsRes.data ?? []).map(
          (r) => `${r.animal_id}|${r.fed_at.slice(0, 10)}|${r.prey_type}|${r.refused}`
        )
      )
      const shedsInDbBefore = existingShedsRes.data?.length ?? 0
      const existingShedKeys = new Set(
        (existingShedsRes.data ?? []).map((r) => `${r.animal_id}|${r.shed_at.slice(0, 10)}`)
      )

      // Insert feedings (skip unknown animals and existing duplicates)
      const feedingsToInsert = importData.feedingLogs
        .map((log) => {
          const name = (log.animal_name as string).trim().toLowerCase()
          const animal_id = animalMap.get(name)
          if (!animal_id) { skippedFeedings++; return null }
          const { animal_name: _, ...rest } = log
          return { ...rest, animal_id }
        })
        .filter(Boolean)
        .filter((log) => {
          const r = log as Record<string, unknown>
          const key = `${r.animal_id}|${(r.fed_at as string).slice(0, 10)}|${r.prey_type}|${r.refused}`
          if (existingFeedingKeys.has(key)) { duplicateFeedings++; return false }
          return true
        }) as Record<string, unknown>[]

      if (feedingsToInsert.length > 0) {
        feedingsInserted = await batchInsertFeedingLogs(feedingsToInsert)
        setProgress(66)
      }

      // Insert sheds (skip unknown animals and existing duplicates)
      const shedsToInsert = importData.sheddingLogs
        .map((log) => {
          const name = (log.animal_name as string).trim().toLowerCase()
          const animal_id = animalMap.get(name)
          if (!animal_id) { skippedSheds++; return null }
          const { animal_name: _, ...rest } = log
          return { ...rest, animal_id }
        })
        .filter(Boolean)
        .filter((log) => {
          const r = log as Record<string, unknown>
          const key = `${r.animal_id}|${(r.shed_at as string).slice(0, 10)}`
          if (existingShedKeys.has(key)) { duplicateSheds++; return false }
          return true
        }) as Record<string, unknown>[]

      if (shedsToInsert.length > 0) {
        shedsInserted = await batchInsertSheddingLogs(shedsToInsert)
      }

      // Always recalculate last_fed_at — the DB trigger overwrites it on every
      // insert without checking if the new date is actually more recent.
      await recalculateLastFedAt(householdId)

      // Count sheds in DB after import to verify what's actually stored
      const { count: shedsAfterCount } = await supabase
        .from('shedding_logs')
        .select('*', { count: 'exact', head: true })
        .eq('household_id', householdId)
      const shedsInDbAfter = shedsAfterCount ?? 0

      setProgress(100)
      setResult({
        animals: animalsInserted,
        feedings: feedingsInserted,
        sheds: shedsInserted,
        shedsDetected: importData.sheddingLogs.length,
        feedingsDetected: importData.feedingLogs.length,
        skippedFeedings,
        skippedSheds,
        duplicateFeedings,
        duplicateSheds,
        shedsInDbBefore,
        shedsInDbAfter,
        duplicateAnimalNames,
        reactivated: inactiveMerged.length,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Import failed'
      setImportError(msg)
      setImporting(false)
    }
  }

  async function handleFixDuplicates() {
    if (!householdId || !result || result.duplicateAnimalNames.length === 0) return
    setFixingDuplicates(true)
    try {
      // Fetch all animals sorted by name then created_at so first = oldest = canonical
      const { data: allDbAnimals } = await supabase
        .from('animals')
        .select('id, name, created_at')
        .eq('household_id', householdId)
        .order('name')
        .order('created_at', { ascending: true })

      if (!allDbAnimals) return

      for (const lcName of result.duplicateAnimalNames) {
        const group = allDbAnimals.filter(
          (a) => a.name.trim().toLowerCase() === lcName.toLowerCase()
        )
        if (group.length < 2) continue

        const canonicalId = group[0].id
        const dupeIds = group.slice(1).map((a) => a.id)

        // Build set of dates already on the canonical animal
        const { data: canonicalSheds } = await supabase
          .from('shedding_logs').select('id, shed_at').eq('animal_id', canonicalId)
        const canonicalShedDates = new Set((canonicalSheds ?? []).map((s) => s.shed_at.slice(0, 10)))

        // For each duplicate animal, move unique sheds → canonical, delete true dupes
        for (const dupeId of dupeIds) {
          const { data: dupeSheds } = await supabase
            .from('shedding_logs').select('id, shed_at').eq('animal_id', dupeId)

          const toMove = (dupeSheds ?? []).filter((s) => !canonicalShedDates.has(s.shed_at.slice(0, 10)))
          const toDelete = (dupeSheds ?? []).filter((s) => canonicalShedDates.has(s.shed_at.slice(0, 10)))

          if (toMove.length > 0) {
            await supabase.from('shedding_logs')
              .update({ animal_id: canonicalId })
              .in('id', toMove.map((s) => s.id))
            toMove.forEach((s) => canonicalShedDates.add(s.shed_at.slice(0, 10)))
          }
          if (toDelete.length > 0) {
            await supabase.from('shedding_logs').delete().in('id', toDelete.map((s) => s.id))
          }
        }

        // Move feeding logs (keep all — slight dupes are better than data loss)
        await supabase.from('feeding_logs')
          .update({ animal_id: canonicalId })
          .in('animal_id', dupeIds)
          .eq('household_id', householdId)

        // Move weight / health logs
        await supabase.from('weight_logs')
          .update({ animal_id: canonicalId })
          .in('animal_id', dupeIds)
          .eq('household_id', householdId)

        await supabase.from('health_events')
          .update({ animal_id: canonicalId })
          .in('animal_id', dupeIds)
          .eq('household_id', householdId)

        // Delete the ghost animals (no cascade needed — logs already moved)
        await supabase.from('animals').delete().in('id', dupeIds).eq('household_id', householdId)
      }

      setResult((r) => r ? { ...r, duplicateAnimalNames: [] } : r)
      showToast('Duplicate animals merged. Your shed data is now visible.', 'success')
    } catch {
      showToast('Failed to fix duplicates — please try again', 'error')
    } finally {
      setFixingDuplicates(false)
    }
  }

  const inner = (
    <div>
      {!embedded && <Header title="Import Data" />}

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
                      {!m.existing.is_active && (
                        <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(212,146,74,0.15)', color: '#d4924a' }}>inactive — will reactivate</span>
                      )}
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
            <p className="text-xs" style={{ color: '#a8a090' }}>Feeding/shedding logs will be linked to animals by name (case-insensitive). Unmatched entries will be skipped. Records that already exist will be detected and skipped automatically.</p>
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
              <div className="text-4xl mb-4">{(result.skippedFeedings + result.skippedSheds) > 0 ? '⚠️' : '✅'}</div>
              <p className="text-lg font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>Import complete</p>
              <div className="rounded-xl p-4 mb-4 text-left" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm"><span style={{ color: '#a8a090' }}>Animals added</span><span style={{ color: '#f0ece0' }}>{result.animals}</span></div>
                  {result.reactivated > 0 && (
                    <div className="flex justify-between text-sm"><span style={{ color: '#8fbe5a' }}>Animals reactivated</span><span style={{ color: '#8fbe5a' }}>{result.reactivated}</span></div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#a8a090' }}>Feeding logs added</span>
                    <span style={{ color: '#f0ece0' }}>{result.feedings} / {result.feedingsDetected}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#a8a090' }}>Shed records added</span>
                    <span style={{ color: result.shedsDetected > 0 && result.sheds === 0 ? '#c45a5a' : '#f0ece0' }}>{result.sheds} / {result.shedsDetected}</span>
                  </div>
                  {(result.duplicateFeedings + result.duplicateSheds + result.skippedFeedings + result.skippedSheds) > 0 && (
                    <div className="pt-2 flex flex-col gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      {result.duplicateFeedings > 0 && (
                        <div className="flex justify-between text-sm">
                          <span style={{ color: '#d4924a' }}>Feeding duplicates skipped</span>
                          <span style={{ color: '#d4924a' }}>{result.duplicateFeedings}</span>
                        </div>
                      )}
                      {result.duplicateSheds > 0 && (
                        <div className="flex justify-between text-sm">
                          <span style={{ color: '#d4924a' }}>Shed duplicates skipped</span>
                          <span style={{ color: '#d4924a' }}>{result.duplicateSheds}</span>
                        </div>
                      )}
                      {result.skippedFeedings > 0 && (
                        <div className="flex justify-between text-sm">
                          <span style={{ color: '#c45a5a' }}>Feedings — no matching animal</span>
                          <span style={{ color: '#c45a5a' }}>{result.skippedFeedings}</span>
                        </div>
                      )}
                      {result.skippedSheds > 0 && (
                        <div className="flex justify-between text-sm">
                          <span style={{ color: '#c45a5a' }}>Sheds — no matching animal</span>
                          <span style={{ color: '#c45a5a' }}>{result.skippedSheds}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="pt-2 flex flex-col gap-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: '#6a6458' }}>Shed records in DB before import</span>
                      <span style={{ color: '#6a6458' }}>{result.shedsInDbBefore}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: '#6a6458' }}>Shed records in DB after import</span>
                      <span style={{ color: '#6a6458' }}>{result.shedsInDbAfter}</span>
                    </div>
                  </div>
                </div>
              </div>
              {result.shedsDetected > 0 && result.sheds === 0 && result.duplicateSheds === 0 && result.skippedSheds === 0 && (
                <p className="text-xs mb-4 px-2" style={{ color: '#c45a5a' }}>
                  Shed records were detected but none were imported. This usually means the date column couldn't be parsed. Make sure dates are formatted as YYYY-MM-DD in your file.
                </p>
              )}
              {result.skippedSheds > 0 && (
                <p className="text-xs mb-4 px-2" style={{ color: '#a8a090' }}>
                  {result.skippedSheds} shed record{result.skippedSheds !== 1 ? 's' : ''} couldn't be linked — the animal name in the shed sheet didn't match any animal in your collection. Go back and use manual linking.
                </p>
              )}
              {result.skippedFeedings > 0 && (
                <p className="text-xs mb-4 px-2" style={{ color: '#a8a090' }}>
                  {result.skippedFeedings} feeding record{result.skippedFeedings !== 1 ? 's' : ''} couldn't be linked — the animal name in the feeding sheet didn't match any animal in your collection.
                </p>
              )}
              {result.duplicateAnimalNames.length > 0 && (
                <div className="rounded-xl p-3 mb-4 text-left" style={{ backgroundColor: 'rgba(196,90,90,0.08)', border: '1px solid rgba(196,90,90,0.2)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: '#c45a5a' }}>Duplicate animals detected in your collection</p>
                  <p className="text-xs mb-2" style={{ color: '#a8a090' }}>
                    Previous imports created ghost copies of these animals and attached logs to the wrong records. Tap below to automatically merge them — logs will be consolidated onto the original animal and the ghosts deleted.
                  </p>
                  <p className="text-xs mb-3" style={{ color: '#c45a5a' }}>{result.duplicateAnimalNames.join(', ')}</p>
                  <Button
                    size="sm"
                    loading={fixingDuplicates}
                    onClick={handleFixDuplicates}
                    style={{ backgroundColor: '#c45a5a', color: '#fff', border: 'none' }}
                  >
                    Fix duplicate animals
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                {(result.skippedFeedings + result.skippedSheds) > 0 && <Button variant="secondary" fullWidth onClick={() => { setStep(2); setResult(null) }}>Go back</Button>}
                <Button fullWidth onClick={() => navigate('/animals')}>View your animals</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  if (embedded) return inner
  return (
    <div className="flex-1 px-4 py-6 pb-24 md:pb-8 max-w-2xl mx-auto w-full">
      {inner}
    </div>
  )
}
