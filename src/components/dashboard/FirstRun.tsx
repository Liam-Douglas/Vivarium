import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

/**
 * The dashboard before there is a collection.
 *
 * It used to say "Nothing due today" over an empty activity list: true, and
 * no help at all to someone who has just signed up. This says what the app
 * will do and offers the two ways in, adding an animal or importing a
 * spreadsheet.
 */
export function FirstRun({ onAddAnimal }: { onAddAnimal: () => void }) {
  return (
    <section
      aria-labelledby="first-run-title"
      className="rounded-2xl p-5 sm:p-6 max-w-xl"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-separator)' }}
    >
      <LeafIcon />
      <h2 id="first-run-title" className="text-xl font-semibold mt-4" style={{ color: 'var(--color-label)' }}>
        Start your collection
      </h2>
      <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-label-2)' }}>
        Add your animals and Vivarium keeps track of who is due to eat, when they last shed, and how their weight is going.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 mt-5">
        <Button fullWidth onClick={onAddAnimal}>Add your first animal</Button>
        <Link
          to="/import"
          className="w-full inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium border border-separator text-label hover:bg-fill active:bg-fill active:scale-[0.97] motion-reduce:active:scale-100 transition-[transform,background-color] duration-150 ease-out pointer-coarse:min-h-11"
        >
          Import a spreadsheet
        </Link>
      </div>
      <p className="text-xs mt-4 leading-relaxed" style={{ color: 'var(--color-label-2)' }}>
        Everyone you invite to your household sees the same records. Your invite code is in{' '}
        <Link to="/settings" className="underline underline-offset-2" style={{ color: 'var(--color-tint)' }}>Settings</Link>.
      </p>
    </section>
  )
}

function LeafIcon() {
  return (
    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--color-tint) 12%, transparent)' }}>
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="var(--color-tint)" strokeWidth={1.75} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 19c0-8 5-14 14-14 0 9-6 14-14 14zm0 0l7-7" />
      </svg>
    </div>
  )
}
