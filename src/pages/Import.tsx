import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { parseISO, parse, isValid } from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { useToast } from '@/components/ui/Toast'
import { batchInsertAnimals, batchInsertFeedingLogs, batchInsertSheddingLogs } from '@/lib/queries'
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

export function Import() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { householdId } = useHousehold()
  const { showToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>(1)
  const [fileName, setFileName] = useState('')
  const [sheets, setSheets] = useState<{ name: string; rows: ParsedRow[] }[]>([])
  const [importData, setImportData] = useState<ImportData>({ animals: [], feedingLogs: [], sheddingLogs: [] })
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ animals: number; feedings: number; sheds: number; skipped: number } | null>(null)
  const [importing, setImporting] = useState(false)

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
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const parsed = wb.SheetNames.map((name) => {
        const ws = wb.Sheets[name]
        const rows = XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: '' })
        return { name, rows }
      })
      setSheets(parsed)
      autoMap(parsed)
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
            sex: row['Sex'] || row['sex'] || null,
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
            refused: (row['Refused'] || '').toLowerCase() === 'true' || (row['Refused'] || '').toLowerCase() === 'yes',
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
            complete: !((row['Complete'] || '').toLowerCase() === 'false' || (row['Complete'] || '').toLowerCase() === 'no'),
            notes: row['Notes'] || row['notes'] || null,
          })
        })
      }
    }

    setImportData({ animals, feedingLogs, sheddingLogs })
  }

  async function handleImport() {
    if (!householdId || !user) return
    setImporting(true)
    setStep(4)
    setProgress(0)

    let skipped = 0
    let animalsInserted = 0
    let feedingsInserted = 0
    let shedsInserted = 0

    try {
      // Insert animals
      if (importData.animals.length > 0) {
        animalsInserted = await batchInsertAnimals(importData.animals)
        setProgress(33)
      }

      // Fetch inserted animals to resolve names → IDs
      const { data: dbAnimals } = await supabase.from('animals').select('id, name').eq('household_id', householdId)
      const animalMap = new Map<string, string>()
      dbAnimals?.forEach((a) => animalMap.set(a.name.toLowerCase(), a.id))

      // Insert feedings
      const feedingsToInsert = importData.feedingLogs
        .map((log) => {
          const name = (log.animal_name as string).toLowerCase()
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
          const name = (log.animal_name as string).toLowerCase()
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
      showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Import failed', 'error')
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
            className="rounded-2xl p-8 text-center cursor-pointer mb-4"
            style={{ border: '2px dashed rgba(255,255,255,0.1)', backgroundColor: '#242420' }}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files[0]
              if (file) handleFile(file)
            }}
          >
            <div className="text-4xl mb-3">📁</div>
            <p className="text-sm font-medium mb-1" style={{ color: '#f0ece0' }}>Drop your file here</p>
            <p className="text-xs" style={{ color: '#6a6458' }}>Supports .csv and .xlsx</p>
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
          <p className="text-sm mb-4" style={{ color: '#a8a090' }}>
            File: <strong style={{ color: '#f0ece0' }}>{fileName}</strong> — {sheets.length} sheet{sheets.length !== 1 ? 's' : ''} detected
          </p>
          <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-sm font-medium mb-2" style={{ color: '#f0ece0' }}>Ready to import:</p>
            <div className="flex flex-col gap-1">
              <p className="text-sm" style={{ color: '#a8a090' }}>• {importData.animals.length} animals</p>
              <p className="text-sm" style={{ color: '#a8a090' }}>• {importData.feedingLogs.length} feeding logs</p>
              <p className="text-sm" style={{ color: '#a8a090' }}>• {importData.sheddingLogs.length} shedding records</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)}>Continue to preview</Button>
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
          {!result ? (
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
              <div className="text-4xl mb-4">✅</div>
              <p className="text-lg font-semibold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>Import complete</p>
              <p className="text-sm mb-6" style={{ color: '#a8a090' }}>
                Imported {result.animals} animals, {result.feedings} feeding logs, {result.sheds} shed records.
                {result.skipped > 0 ? ` ${result.skipped} rows skipped.` : ''}
              </p>
              <Button onClick={() => navigate('/animals')}>View your animals</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
