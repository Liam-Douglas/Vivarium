import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { IconTile } from '@/components/ui/icons'

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
      className="rounded-2xl p-5 sm:p-6 max-w-xl bg-surface"
    >
      <IconTile name="animal" color="var(--color-tint)" size={44} />
      <h2 id="first-run-title" className="text-[22px] leading-7 font-bold mt-4 text-label">
        Start your collection
      </h2>
      <p className="text-[17px] mt-1.5 leading-snug text-label-2">
        Add your animals and Vivarium keeps track of who is due to eat, when they last shed, and how their weight is going.
      </p>
      <div className="flex flex-col gap-1 mt-5">
        <Button size="lg" fullWidth onClick={onAddAnimal}>Add your first animal</Button>
        <Link
          to="/import"
          className="w-full inline-flex items-center justify-center min-h-11 text-[17px] text-tint active:opacity-60"
        >
          Import a spreadsheet
        </Link>
      </div>
      <p className="text-[13px] mt-3 leading-relaxed text-label-2">
        Everyone you invite to your household sees the same records. Your invite code is in{' '}
        <Link to="/settings" className="text-tint">Settings</Link>.
      </p>
    </section>
  )
}
