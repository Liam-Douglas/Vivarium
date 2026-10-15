import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

/**
 * The dashboard before there is a collection.
 *
 * It used to say "Nothing due today" over an empty activity list: true, and
 * no help at all to someone who has just signed up. This says what the app
 * will do and offers the two ways in, adding an animal or importing a
 * spreadsheet.
 *
 * Two versions while one is chosen (?firstrun=b shows the second). The
 * unchosen one is deleted once a decision is made.
 */
export function FirstRun({ onAddAnimal, variant = 'a' }: { onAddAnimal: () => void; variant?: 'a' | 'b' }) {
  return variant === 'b' ? <QuietQueue onAddAnimal={onAddAnimal} /> : <WelcomeCard onAddAnimal={onAddAnimal} />
}

/** A: one card that explains and offers both routes. */
function WelcomeCard({ onAddAnimal }: { onAddAnimal: () => void }) {
  return (
    <section
      aria-labelledby="first-run-title"
      className="rounded-2xl p-5 sm:p-6 max-w-xl"
      style={{ backgroundColor: 'var(--color-bark)', border: '1px solid var(--color-hairline)' }}
    >
      <LeafIcon />
      <h2 id="first-run-title" className="text-xl font-semibold mt-4" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-parchment)' }}>
        Start your collection
      </h2>
      <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-dry-grass)' }}>
        Add your animals and Vivarium keeps track of who is due to eat, when they last shed, and how their weight is going.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 mt-5">
        <Button fullWidth onClick={onAddAnimal}>Add your first animal</Button>
        <Link
          to="/import"
          className="w-full inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium border border-white/10 text-parchment hover:bg-white/5 active:bg-white/5 active:scale-[0.97] motion-reduce:active:scale-100 transition-[transform,background-color] duration-150 ease-out pointer-coarse:min-h-11"
        >
          Import a spreadsheet
        </Link>
      </div>
      <p className="text-xs mt-4 leading-relaxed" style={{ color: 'var(--color-sand)' }}>
        Everyone you invite to your household sees the same records. Your invite code is in{' '}
        <Link to="/settings" className="underline underline-offset-2" style={{ color: 'var(--color-leaf)' }}>Settings</Link>.
      </p>
    </section>
  )
}

/** B: the Today section, empty, with the routes in as quiet rows beneath. */
function QuietQueue({ onAddAnimal }: { onAddAnimal: () => void }) {
  return (
    <section aria-labelledby="first-run-title" className="max-w-xl">
      <h2 id="first-run-title" className="text-base font-semibold mb-3" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-parchment)' }}>
        Today
      </h2>
      <div
        className="rounded-xl px-5 py-8 text-center flex flex-col items-center"
        style={{ border: '1px dashed var(--color-hairline-strong)' }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--color-parchment)' }}>Your feeding queue will appear here</p>
        <p className="text-sm mt-1.5 max-w-xs leading-relaxed" style={{ color: 'var(--color-dry-grass)' }}>
          Each animal shows up when it is due, judged against its own feeding schedule.
        </p>
        <Button className="mt-5" onClick={onAddAnimal}>Add your first animal</Button>
      </div>
      <div className="mt-4 rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-bark)', border: '1px solid var(--color-hairline)' }}>
        <QuietRow to="/import" label="Import a spreadsheet" detail="CSV or Excel, using the template" />
        <div style={{ borderTop: '1px solid var(--color-hairline)' }} />
        <QuietRow to="/settings" label="Invite your household" detail="Your invite code is in Settings" />
      </div>
    </section>
  )
}

function QuietRow({ to, label, detail }: { to: string; label: string; detail: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 min-h-[60px] active:bg-white/5 transition-colors">
      <span className="flex-1 min-w-0 py-2.5">
        <span className="block text-sm" style={{ color: 'var(--color-parchment)' }}>{label}</span>
        <span className="block text-xs mt-0.5" style={{ color: 'var(--color-sand)' }}>{detail}</span>
      </span>
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--color-sand)" strokeWidth={2} className="shrink-0" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

function LeafIcon() {
  return (
    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(143,190,90,0.12)' }}>
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="var(--color-leaf)" strokeWidth={1.75} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 19c0-8 5-14 14-14 0 9-6 14-14 14zm0 0l7-7" />
      </svg>
    </div>
  )
}
