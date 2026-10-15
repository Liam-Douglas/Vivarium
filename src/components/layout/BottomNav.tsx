import { useEffect, useRef, useState } from 'react'
import { useDragToDismiss } from '@/hooks/useDragToDismiss'
import { NavLink, useNavigate } from 'react-router-dom'

/**
 * Five destinations plus a More sheet.
 *
 * The sidebar reaches six destinations; this bar reached four, so Feeding and
 * Stats could not be opened on a phone at all — on a mobile-first PWA. Five is
 * the comfortable maximum at 390px (78px per target, well clear of the 44px
 * floor), so the two screens opened least often move into the sheet.
 */
const tabs = [
  { to: '/', label: 'Today', icon: HomeIcon, exact: true },
  { to: '/animals', label: 'Animals', icon: AnimalsIcon },
  { to: '/feeding', label: 'Feeding', icon: FeedingIcon },
  { to: '/stats', label: 'Stats', icon: StatsIcon },
]

const moreLinks = [
  { to: '/reminders', label: 'Reminders', detail: 'Feeding, cleaning and weighing schedules' },
  { to: '/expenses', label: 'Expenses', detail: 'Monthly spend by category' },
  { to: '/feeders', label: 'Feeder stock', detail: 'Inventory and shopping list' },
  { to: '/import', label: 'Import collection', detail: 'CSV or spreadsheet' },
  { to: '/settings', label: 'Settings', detail: 'Household, account, notifications' },
]

function HomeIcon({ active }: { active: boolean }) {
  return active ? (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor"><path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" /><path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198c.03-.028.061-.056.091-.086L12 5.43z" /></svg>
  ) : (
    <svg width="25" height="25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.5 1.5 0 012.092 0L22.25 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
  )
}

function AnimalsIcon({ active }: { active: boolean }) {
  return active ? (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M3 6a3 3 0 013-3h2.25a3 3 0 013 3v2.25a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm9.75 0a3 3 0 013-3H18a3 3 0 013 3v2.25a3 3 0 01-3 3h-2.25a3 3 0 01-3-3V6zM3 15.75a3 3 0 013-3h2.25a3 3 0 013 3V18a3 3 0 01-3 3H6a3 3 0 01-3-3v-2.25zm9.75 0a3 3 0 013-3H18a3 3 0 013 3V18a3 3 0 01-3 3h-2.25a3 3 0 01-3-3v-2.25z" clipRule="evenodd" /></svg>
  ) : (
    <svg width="25" height="25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
  )
}

function FeedingIcon({ active }: { active: boolean }) {
  return active ? (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" /></svg>
  ) : (
    <svg width="25" height="25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
  )
}

function StatsIcon({ active }: { active: boolean }) {
  return active ? (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
  ) : (
    <svg width="25" height="25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
  )
}

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const navigate = useNavigate()
  const sheetRef = useRef<HTMLDivElement>(null)
  const drag = useDragToDismiss(sheetRef, () => setMoreOpen(false))

  useEffect(() => {
    if (!moreOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoreOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moreOpen])

  return (
    <>
      {/* Mounted all the time and faded, so the sheet can leave the way it
          came instead of vanishing. */}
      <button
        aria-label="Close menu"
        tabIndex={moreOpen ? 0 : -1}
        onClick={() => setMoreOpen(false)}
        data-open={moreOpen || undefined}
        className={`fade-away md:hidden fixed inset-0 z-30 w-full transition-opacity ease-drawer ${moreOpen ? 'opacity-100 duration-300' : 'opacity-0 duration-200'}`}
        style={{ backgroundColor: 'var(--color-scrim)' }}
      />

      {/* Sheet and bar share one bottom-anchored stack, so the sheet sits on
          the bar's real height rather than a guessed offset. */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 pointer-events-none">
          {/* Rises from behind the bar and drops back behind it; the grabber
              drags it down. Inert while closed, so it is out of the tab order
              and hidden from screen readers. */}
          <div
            ref={sheetRef}
            inert={!moreOpen}
            data-open={moreOpen || undefined}
            className={`fade-away pointer-events-auto rounded-t-2xl overflow-hidden transition-[transform,opacity] ease-drawer ${moreOpen ? 'translate-y-0 duration-300' : 'translate-y-full duration-200 motion-reduce:translate-y-0 motion-reduce:opacity-0'}`}
            style={{ backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-separator)' }}
          >
            <div className="flex justify-center pt-2.5 pb-3 touch-none" aria-hidden="true" {...drag}>
              <span className="w-9 h-1 rounded-full" style={{ backgroundColor: 'var(--color-fill-2)' }} />
            </div>
            {moreLinks.map((link, i) => (
              <button
                key={link.to}
                onClick={() => { setMoreOpen(false); navigate(link.to) }}
                className="w-full flex items-center gap-3 px-5 text-left active:bg-fill transition-colors"
                style={{
                  height: 60,
                  borderBottom: i < moreLinks.length - 1 ? '1px solid var(--color-separator)' : 'none',
                }}
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] text-label">{link.label}</span>
                  <span className="block text-[13px] mt-0.5 text-label-2">{link.detail}</span>
                </span>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--color-label-2)" strokeWidth={2} className="shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>

      <nav
        // The iOS tab bar: translucent material over the content, a hairline
        // top edge, 49pt tall plus the home-indicator inset.
        className="bar-material relative z-10 flex items-stretch pointer-events-auto border-t-[0.5px] border-separator"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.exact}
            onClick={() => setMoreOpen(false)}
            className="flex-1 flex flex-col items-center justify-start pt-1.5 pb-1 gap-0.5 min-h-[49px]"
          >
            {({ isActive }) => (
              <>
                <span style={{ color: isActive && !moreOpen ? 'var(--color-tint)' : 'var(--color-label-2)' }}>
                  <tab.icon active={isActive && !moreOpen} />
                </span>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isActive && !moreOpen ? 'var(--color-tint)' : 'var(--color-label-2)' }}
                >
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          className="flex-1 flex flex-col items-center justify-start pt-1.5 pb-1 gap-0.5 min-h-[49px]"
          style={{ color: moreOpen ? 'var(--color-tint)' : 'var(--color-label-2)' }}
        >
          <svg width="25" height="25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>
      </div>
    </>
  )
}
